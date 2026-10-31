/**
 * Cloudflare Worker: make-main GitHub 저장 프록시
 * Required Worker secrets:
 *   make_main             GitHub fine-grained PAT (Contents: Read and write, repo 25withcoding only)
 *   MAKE_MAIN_ADMIN_IDS   Comma-separated 5-digit student IDs for president/vice accounts
 *
 * The Worker verifies Firebase ID-token signatures and checks the student-ID allowlist.
 * CORS is an additional browser boundary, not the authentication mechanism.
 */
const PROJECT_ID = "points2026-f5e50";
const ALLOWED_ORIGIN = "https://25withcoding.kr";
const REPO = "Trandonweb/25withcoding";
const GITHUB_API = "https://api.github.com";
const ALLOWED_PATH = /^(?:make_main\/page[1-9][0-9]*\.json|make_main\/assets\/[A-Za-z0-9._-]{1,120}|data\/main-page\.json)$/;
let jwksCache = null;
let jwksExpiry = 0;

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
function decodeB64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function decodeJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(decodeB64Url(value)));
}
async function getGoogleKeys() {
  if (jwksCache && Date.now() < jwksExpiry) return jwksCache;
  const response = await fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("Firebase 공개키를 확인하지 못했습니다.");
  const data = await response.json();
  jwksCache = data.keys || [];
  jwksExpiry = Date.now() + 50 * 60 * 1000;
  return jwksCache;
}
async function verifyFirebaseToken(token, env) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("인증 토큰 형식이 올바르지 않습니다.");
  const header = decodeJsonPart(parts[0]);
  const claims = decodeJsonPart(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new Error("지원하지 않는 인증 토큰입니다.");
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== `https://securetoken.google.com/${PROJECT_ID}` ||
      claims.aud !== PROJECT_ID || !claims.sub ||
      claims.exp <= now || claims.iat > now + 60 ||
      claims.auth_time > now + 60 ||
      claims.email_verified !== true) {
    throw new Error("Firebase 로그인 정보가 유효하지 않습니다.");
  }
  const emailMatch = String(claims.email || "").match(/^(\d{5})@auth\.25withcoding\.kr$/i);
  if (!emailMatch || claims.sub.length < 10) throw new Error("동아리 계정이 아닙니다.");
  const allowedIds = String(env.MAKE_MAIN_ADMIN_IDS || "").split(",").map(v => v.trim()).filter(Boolean);
  if (!allowedIds.includes(emailMatch[1])) throw new Error("메인페이지 편집 권한이 없는 계정입니다.");
  const jwk = (await getGoogleKeys()).find(key => key.kid === header.kid);
  if (!jwk) {
    jwksExpiry = 0;
    const refreshed = await getGoogleKeys();
    const freshKey = refreshed.find(key => key.kid === header.kid);
    if (!freshKey) throw new Error("인증 서명 키를 찾을 수 없습니다.");
    return verifySignature(parts, freshKey, claims);
  }
  await verifySignature(parts, jwk, claims);
  return claims;
}
async function verifySignature(parts, jwk, claims) {
  const key = await crypto.subtle.importKey("jwk", jwk, {
    name: "RSASSA-PKCS1-v1_5", hash: "SHA-256"
  }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    decodeB64Url(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!valid) throw new Error("Firebase 인증 서명이 올바르지 않습니다.");
  return claims;
}
export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== ALLOWED_ORIGIN) return json({ error: "허용되지 않은 출처입니다." }, 403);
    if (request.method === "OPTIONS") return json({ ok: true });
    if (!env.make_main) return json({ error: "GitHub Secret make_main이 연결되지 않았습니다." }, 500);
    if (!env.MAKE_MAIN_ADMIN_IDS) return json({ error: "MAKE_MAIN_ADMIN_IDS Secret 설정이 필요합니다." }, 500);

    const url = new URL(request.url);
    const prefix = "/github/contents/";
    if (!url.pathname.startsWith(prefix)) return json({ error: "지원하지 않는 경로입니다." }, 404);
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!ALLOWED_PATH.test(path)) return json({ error: "허용되지 않은 파일 경로입니다." }, 400);
    if (!["GET", "PUT", "DELETE"].includes(request.method)) return json({ error: "허용되지 않은 요청 방식입니다." }, 405);

    try {
      const authHeader = request.headers.get("Authorization") || "";
      const match = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!match) return json({ error: "Firebase 로그인이 필요합니다." }, 401);
      await verifyFirebaseToken(match[1], env);

      let body;
      if (request.method !== "GET") {
        const raw = await request.text();
        if (raw.length > 5_500_000) return json({ error: "요청 파일이 너무 큽니다." }, 413);
        body = raw;
      }
      const gh = await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
        method: request.method,
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${env.make_main}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body,
      });
      const resultText = await gh.text();
      return new Response(resultText, {
        status: gh.status,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Vary": "Origin",
          "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      });
    } catch (error) {
      return json({ error: error?.message || "저장 요청을 처리하지 못했습니다." }, 401);
    }
  },
};
