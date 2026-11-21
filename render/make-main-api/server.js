import express from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";

const app = express();
const PORT = Number(process.env.PORT || 10000);

const PROJECT_ID = "points2026-f5e50";
const ALLOWED_ORIGIN = "https://25withcoding.kr";
const REPOSITORY = "Trandonweb/25withcoding";
const GITHUB_API = "https://api.github.com";
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ALLOWED_FILE =
  /^(?:make_main\/page[1-9][0-9]*\.json|make_main\/assets\/[A-Za-z0-9._-]{1,120}|data\/main-page\.json)$/;
const ALLOWED_DIRECTORY = new Set(["make_main", "make_main/assets"]);
const ADMIN_ROLES = new Set(["admin", "president", "vice", "committee_chair"]);

const firebaseKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");

  const origin = req.get("Origin");
  if (origin) {
    if (origin !== ALLOWED_ORIGIN) {
      return res.status(403).json({ error: "허용되지 않은 출처입니다." });
    }
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  }

  if (req.method === "OPTIONS") return res.status(204).end();
  next();
});

app.use(express.json({ limit: "6mb", strict: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "25withcoding-make-main-api" });
});

async function verifyFirebaseToken(token) {
  const { payload } = await jwtVerify(token, firebaseKeys, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
    algorithms: ["RS256"],
    clockTolerance: 60
  });

  const now = Math.floor(Date.now() / 1000);
  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    typeof payload.exp !== "number" ||
    typeof payload.iat !== "number" ||
    typeof payload.auth_time !== "number" ||
    payload.exp <= now ||
    payload.iat > now + 60 ||
    payload.auth_time > now + 60 ||
    payload.email_verified !== true
  ) {
    throw new Error("Firebase 로그인 정보가 유효하지 않습니다.");
  }

  const emailMatch = String(payload.email || "").match(
    /^(\d{5})@auth\.25withcoding\.kr$/i
  );
  if (!emailMatch) {
    throw new Error("동아리 계정으로 로그인해 주세요.");
  }

  return { studentId: emailMatch[1] };
}

async function verifyAdmin(token, studentId) {
  const response = await fetch(
    `${FIRESTORE_API}/users/${encodeURIComponent(studentId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error("Firestore 사용자 권한을 확인할 수 없습니다. 로그인 상태와 Firestore 읽기 규칙을 확인해 주세요.");
  }
  if (response.status === 404) {
    throw new Error("사용자 계정 정보를 찾을 수 없습니다.");
  }
  if (!response.ok) {
    throw new Error("Firestore 관리자 권한 조회에 실패했습니다.");
  }

  const document = await response.json();
  const role = document.fields?.role?.stringValue;
  if (!ADMIN_ROLES.has(role)) {
    throw new Error("메인페이지 편집 권한이 없습니다.");
  }
}

function getRepositoryPath(req) {
  const prefix = "/github/contents/";
  const rawUrlPath = req.originalUrl.split("?")[0];
  if (!rawUrlPath.startsWith(prefix)) return null;

  const encodedPath = rawUrlPath.slice(prefix.length);
  if (!encodedPath || encodedPath.length > 720) return null;

  try {
    return encodedPath.split("/").map(segment => decodeURIComponent(segment)).join("/");
  } catch {
    return null;
  }
}

function isAllowedPath(path, method) {
  if (ALLOWED_DIRECTORY.has(path)) return method === "GET";
  return ALLOWED_FILE.test(path);
}

app.all("/github/contents/*", async (req, res) => {
  if (!["GET", "PUT", "DELETE"].includes(req.method)) {
    return res.status(405).json({ error: "허용되지 않은 요청 방식입니다." });
  }

  const path = getRepositoryPath(req);
  if (!path) {
    return res.status(400).json({ error: "파일 경로가 올바르지 않습니다." });
  }
  if (!isAllowedPath(path, req.method)) {
    return res.status(400).json({ error: "허용되지 않은 파일 경로입니다." });
  }

  const authorization = req.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json({ error: "Firebase 로그인이 필요합니다." });
  }

  const token = match[1];
  try {
    const identity = await verifyFirebaseToken(token);
    await verifyAdmin(token, identity.studentId);

    let body;
    if (req.method !== "GET") {
      body = req.body;
      if (!body || typeof body !== "object" || Array.isArray(body) ||
          typeof body.message !== "string") {
        return res.status(400).json({ error: "GitHub 저장 데이터가 올바르지 않습니다." });
      }
      if (req.method === "PUT" && (typeof body.content !== "string" || !body.content)) {
        return res.status(400).json({ error: "저장할 파일 내용이 없습니다." });
      }
      if (req.method === "DELETE" && (typeof body.sha !== "string" || !body.sha)) {
        return res.status(400).json({ error: "삭제할 파일의 SHA가 없습니다." });
      }
    }

    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return res.status(500).json({ error: "Render 환경변수 GITHUB_TOKEN이 설정되어 있지 않습니다." });
    }

    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const upstream = await fetch(
      `${GITHUB_API}/repos/${REPOSITORY}/contents/${encodedPath}`,
      {
        method: req.method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {})
        },
        ...(body ? { body: JSON.stringify(body) } : {})
      }
    );

    const responseText = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("Content-Type") || "application/json; charset=utf-8");
    return res.send(responseText);
  } catch (error) {
    const message = error?.message || "요청을 처리하지 못했습니다.";
    const status = /로그인|토큰|서명|인증/.test(message) ? 401 : 403;
    return res.status(status).json({ error: message });
  }
});

app.use((_req, res) => res.status(404).json({ error: "지원하지 않는 API 경로입니다." }));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`make-main API listening on port ${PORT}`);
});
