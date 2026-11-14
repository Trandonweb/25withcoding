/**
 * 25withcoding.kr - make_main GitHub Contents API proxy
 *
 * Cloudflare Worker: make-main
 * Required secret binding:
 *   make_main = GitHub Fine-grained PAT
 *
 * The secret is preserved by updating script content only.
 * Admin authorization matches /admin/js/auth.js:
 *   admin, president, vice, committee_chair
 */

const PROJECT_ID = "points2026-f5e50";
const ALLOWED_ORIGIN = "https://25withcoding.kr";
const REPOSITORY = "Trandonweb/25withcoding";
const GITHUB_API = "https://api.github.com";
const FIRESTORE_API =
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const ALLOWED_FILE =
  /^(?:make_main\/page[1-9][0-9]*\.json|make_main\/assets\/[A-Za-z0-9._-]{1,120}|data\/main-page\.json)$/;
const ALLOWED_DIRECTORY = new Set(["make_main", "make_main/assets"]);
const ADMIN_ROLES = new Set(["admin", "president", "vice", "committee_chair"]);

let googleKeys = null;
let googleKeysExpiresAt = 0;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    })
  });
}

function corsHeaders(extra = {}) {
  return {
    ...extra,
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Vary": "Origin"
  };
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function decodeJsonPart(value) {
  return JSON.parse(
    new TextDecoder().decode(decodeBase64Url(value))
  );
}

async function getGooglePublicKeys(forceRefresh = false) {
  if (!forceRefresh && googleKeys && Date.now() < googleKeysExpiresAt) {
    return googleKeys;
  }

  const response = await fetch(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  );

  if (!response.ok) {
    throw new Error("Firebase 공개키를 확인하지 못했습니다.");
  }

  const data = await response.json();
  googleKeys = Array.isArray(data.keys) ? data.keys : [];
  googleKeysExpiresAt = Date.now() + 50 * 60 * 1000;
  return googleKeys;
}

async function verifyFirebaseToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Firebase 인증 토큰 형식이 올바르지 않습니다.");
  }

  const header = decodeJsonPart(parts[0]);
  const claims = decodeJsonPart(parts[1]);

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("지원하지 않는 Firebase 인증 토큰입니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    claims.iss !== `https://securetoken.google.com/${PROJECT_ID}` ||
    claims.aud !== PROJECT_ID ||
    typeof claims.sub !== "string" ||
    claims.sub.length < 1 ||
    !Number.isFinite(claims.exp) ||
    !Number.isFinite(claims.iat) ||
    !Number.isFinite(claims.auth_time) ||
    claims.exp <= now ||
    claims.iat > now + 60 ||
    claims.auth_time > now + 60 ||
    claims.email_verified !== true
  ) {
    throw new Error("Firebase 로그인 정보가 유효하지 않습니다.");
  }

  const emailMatch = String(claims.email || "").match(
    /^(\d{5})@auth\.25withcoding\.kr$/i
  );
  if (!emailMatch) {
    throw new Error("동아리 계정으로 로그인해 주세요.");
  }

  let keys = await getGooglePublicKeys();
  let jwk = keys.find(key => key.kid === header.kid);

  if (!jwk) {
    keys = await getGooglePublicKeys(true);
    jwk = keys.find(key => key.kid === header.kid);
  }

  if (!jwk) {
    throw new Error("Firebase 서명 키를 찾을 수 없습니다.");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256"
    },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );

  if (!valid) {
    throw new Error("Firebase 인증 서명이 올바르지 않습니다.");
  }

  return { claims, studentId: emailMatch[1] };
}

/**
 * Firebase ID 토큰으로 Firestore users/{studentId}를 읽는다.
 * 현재 firestore.rules는 로그인 구성원의 users 문서 읽기를 허용한다.
 */
async function verifyAdmin(token, studentId) {
  const response = await fetch(
    `${FIRESTORE_API}/users/${encodeURIComponent(studentId)}`,
    {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    }
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Firestore 사용자 권한을 확인할 수 없습니다. 로그인 상태와 Firestore 읽기 규칙을 확인해 주세요."
    );
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

  return role;
}

function validPath(path, method) {
  if (ALLOWED_DIRECTORY.has(path)) {
    return method === "GET";
  }
  return ALLOWED_FILE.test(path);
}

async function handleGitHub(path, method, body, env) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${GITHUB_API}/repos/${REPOSITORY}/contents/${encodedPath}`;

  const headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": `Bearer ${env.make_main}`,
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const upstream = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const result = await upstream.text();

  return new Response(result, {
    status: upstream.status,
    headers: corsHeaders({
      "Content-Type": upstream.headers.get("Content-Type") ||
        "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    })
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (origin !== ALLOWED_ORIGIN) {
      return json({ error: "허용되지 않은 출처입니다." }, 403);
    }

    if (request.method === "OPTIONS") {
      return json({ ok: true });
    }

    if (!env.make_main) {
      return json({
        error: "Cloudflare Worker Secret make_main이 설정되어 있지 않습니다."
      }, 500);
    }

    const url = new URL(request.url);
    const prefix = "/github/contents/";

    if (!url.pathname.startsWith(prefix)) {
      return json({ error: "지원하지 않는 API 경로입니다." }, 404);
    }

    let path;
    try {
      path = decodeURIComponent(url.pathname.slice(prefix.length));
    } catch {
      return json({ error: "파일 경로 인코딩이 올바르지 않습니다." }, 400);
    }

    if (!path || path.length > 240) {
      return json({ error: "파일 경로가 올바르지 않습니다." }, 400);
    }

    if (!["GET", "PUT", "DELETE"].includes(request.method)) {
      return json({ error: "허용되지 않은 요청 방식입니다." }, 405);
    }

    if (!validPath(path, request.method)) {
      return json({ error: "허용되지 않은 파일 경로입니다." }, 400);
    }

    try {
      const authorization = request.headers.get("Authorization") || "";
      const match = authorization.match(/^Bearer\s+(.+)$/i);

      if (!match) {
        return json({ error: "Firebase 로그인이 필요합니다." }, 401);
      }

      const token = match[1];
      const identity = await verifyFirebaseToken(token);
      const role = await verifyAdmin(token, identity.studentId);

      let body;
      if (request.method !== "GET") {
        const raw = await request.text();

        // 이미지 4MB 업로드의 base64 JSON 본문까지 허용
        if (raw.length > 6_000_000) {
          return json({ error: "요청 파일이 너무 큽니다." }, 413);
        }

        try {
          body = JSON.parse(raw);
        } catch {
          return json({ error: "요청 데이터가 올바른 JSON이 아닙니다." }, 400);
        }

        if (
          !body ||
          typeof body !== "object" ||
          Array.isArray(body) ||
          typeof body.message !== "string"
        ) {
          return json({ error: "GitHub 저장 데이터가 올바르지 않습니다." }, 400);
        }

        if (
          request.method === "PUT" &&
          (typeof body.content !== "string" || !body.content)
        ) {
          return json({ error: "저장할 파일 내용이 없습니다." }, 400);
        }

        if (
          request.method === "DELETE" &&
          (typeof body.sha !== "string" || !body.sha)
        ) {
          return json({ error: "삭제할 파일의 SHA가 없습니다." }, 400);
        }
      }

      const upstream = await handleGitHub(
        path,
        request.method,
        body,
        env
      );

      // GitHub 응답은 그대로 전달하되, 관리자 역할은 로그에 남기지 않는다.
      return upstream;
    } catch (error) {
      const message = error?.message || "요청을 처리하지 못했습니다.";
      const status = /로그인|토큰|서명|인증/.test(message) ? 401 : 403;
      return json({ error: message }, status);
    }
  }
};
