const ALLOWED_ORIGINS = new Set([
  "https://25withcoding.kr",
  "https://www.25withcoding.kr",
]);
// Keep the public proxy minimal until individual frontend flows are migrated and tested.
const AUTH_OPERATIONS = new Set(["signInWithPassword"]);
const MAX_BODY = 16_384;
const RESET_GENERIC_MESSAGE = "계정이 확인되면 등록된 복구 이메일로 안내를 보냅니다. 메일함과 스팸함을 확인해 주세요.";

function corsHeaders(origin) {
  const headers = new Headers({
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
function json(data, status, origin) {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return new Response(JSON.stringify(data), { status, headers });
}
async function readJson(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) return { error: "json_required", status: 415 };
  const declaredLength = Number(request.headers.get("Content-Length") || "0");
  if (declaredLength > MAX_BODY) return { error: "payload_too_large", status: 413 };
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return { error: "payload_too_large", status: 413 };
    return { body: JSON.parse(raw) };
  } catch {
    return { error: "invalid_json", status: 400 };
  }
}
async function firebaseRequest(env, operation, payload) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
  );
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("identity_provider_unavailable"); }
  return { response, data };
}
async function authenticatedStudent(request, env) {
  if (!env.FIREBASE_API_KEY) throw new Error("server_auth_not_configured");
  const authorization = request.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("authentication_required");
  const { response, data } = await firebaseRequest(env, "lookup", { idToken: match[1] });
  const user = data?.users?.[0];
  const emailMatch = (user?.email || "").match(/^(\d{5})@auth\.25withcoding\.kr$/i);
  if (!response.ok || !emailMatch) throw new Error("authentication_required");
  return { studentId: emailMatch[1], email: user.email };
}
function validEmail(value) {
  return typeof value === "string" && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
async function digest(value) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}
async function sendPlainTextEmail(env, to, subject, text) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) throw new Error("email_service_not_configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.RESEND_FROM_EMAIL, to: [to], subject, text }),
  });
  if (!response.ok) throw new Error("email_delivery_failed");
}
function configuredRecovery(env) {
  return Boolean(env.FIREBASE_API_KEY && env.FIREBASE_SERVICE_ACCOUNT_JSON && env.RESEND_API_KEY && env.RESEND_FROM_EMAIL && env.RECOVERY_STORE);
}
let cachedGoogleAccessToken = null;

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64UrlText(value) {
  return base64Url(new TextEncoder().encode(value));
}
async function getGoogleAccessToken(env) {
  if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedGoogleAccessToken.value;
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) throw new Error("firebase_admin_not_configured");
  let serviceAccount;
  try { serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON); }
  catch { throw new Error("firebase_admin_not_configured"); }
  if (!serviceAccount.client_email || !serviceAccount.private_key) throw new Error("firebase_admin_not_configured");

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlText(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64UrlText(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/identitytoolkit",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsigned = header + "." + claims;
  const pem = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const keyBytes = Uint8Array.from(atob(pem), character => character.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = unsigned + "." + base64Url(new Uint8Array(signature));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("google_oauth_unavailable");
  const data = await response.json();
  if (typeof data.access_token !== "string" || !Number.isFinite(data.expires_in)) {
    throw new Error("google_oauth_unavailable");
  }
  cachedGoogleAccessToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}
async function generatePasswordResetLink(env, email, userIp) {
  if (!userIp) throw new Error("caller_ip_unavailable");
  const accessToken = await getGoogleAccessToken(env);
  const response = await fetch(
    "https://identitytoolkit.googleapis.com/v1/projects/points2026-f5e50/accounts:sendOobCode",
    {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestType: "PASSWORD_RESET",
        email,
        userIp,
        returnOobLink: true,
        continueUrl: "https://25withcoding.kr/signin",
      }),
    },
  );
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok || typeof data.oobLink !== "string" || !/^https:\/\//i.test(data.oobLink)) {
    throw new Error("password_reset_link_unavailable");
  }
  return data.oobLink;
}

async function handleRecovery(request, env, url, origin) {
  if (!configuredRecovery(env)) return json({ error: "recovery_service_not_configured" }, 503, origin);
  const parsed = await readJson(request);
  if (parsed.error) return json({ error: parsed.error }, parsed.status, origin);
  const body = parsed.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "invalid_payload" }, 400, origin);

  if (url.pathname === "/api/points2026/recovery/start-verification") {
    let identity;
    try { identity = await authenticatedStudent(request, env); }
    catch (error) {
      const status = error.message === "server_auth_not_configured" ? 503 : 401;
      return json({ error: error.message }, status, origin);
    }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!validEmail(email)) return json({ error: "invalid_email" }, 400, origin);
    const throttleKey = `verify-throttle:${identity.studentId}`;
    if (await env.RECOVERY_STORE.get(throttleKey)) return json({ error: "please_wait_before_retrying" }, 429, origin);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
    const pepper = env.RECOVERY_CODE_PEPPER || env.RESEND_API_KEY;
    const codeHash = await digest(`${pepper}:${identity.studentId}:${email}:${code}`);
    await env.RECOVERY_STORE.put(`verify:${identity.studentId}`, JSON.stringify({
      email, codeHash, attempts: 0,
    }), { expirationTtl: 600 });
    await env.RECOVERY_STORE.put(throttleKey, "1", { expirationTtl: 60 });
    try {
      await sendPlainTextEmail(env, email, "코딩과 함께라면 복구 이메일 인증", [
        "코딩과 함께라면 계정 복구 이메일 인증 코드입니다.",
        "",
        `인증 코드: ${code}`,
        "",
        "이 코드는 10분 동안 유효합니다. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.",
      ].join("\n"));
    } catch {
      await env.RECOVERY_STORE.delete(`verify:${identity.studentId}`);
      return json({ error: "email_delivery_failed" }, 502, origin);
    }
    return json({ ok: true, message: "인증 코드를 이메일로 보냈습니다. 10분 안에 입력해 주세요." }, 200, origin);
  }

  if (url.pathname === "/api/points2026/recovery/verify-email") {
    let identity;
    try { identity = await authenticatedStudent(request, env); }
    catch (error) {
      const status = error.message === "server_auth_not_configured" ? 503 : 401;
      return json({ error: error.message }, status, origin);
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const pendingKey = `verify:${identity.studentId}`;
    const raw = await env.RECOVERY_STORE.get(pendingKey);
    if (!raw) return json({ error: "verification_expired" }, 400, origin);
    let pending;
    try { pending = JSON.parse(raw); } catch { await env.RECOVERY_STORE.delete(pendingKey); return json({ error: "verification_expired" }, 400, origin); }
    if (!/^\d{6}$/.test(code)) return json({ error: "invalid_code" }, 400, origin);
    const pepper = env.RECOVERY_CODE_PEPPER || env.RESEND_API_KEY;
    const submittedHash = await digest(`${pepper}:${identity.studentId}:${pending.email}:${code}`);
    if (submittedHash !== pending.codeHash) {
      pending.attempts = (pending.attempts || 0) + 1;
      if (pending.attempts >= 5) await env.RECOVERY_STORE.delete(pendingKey);
      else await env.RECOVERY_STORE.put(pendingKey, JSON.stringify(pending), { expirationTtl: 600 });
      return json({ error: pending.attempts >= 5 ? "too_many_attempts" : "invalid_code" }, 400, origin);
    }
    await env.RECOVERY_STORE.put(`recovery-email:${identity.studentId}`, pending.email);
    await env.RECOVERY_STORE.delete(pendingKey);
    return json({ ok: true, message: "복구 이메일을 인증하고 등록했습니다." }, 200, origin);
  }

  if (url.pathname === "/api/points2026/recovery/request-reset") {
    const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    if (!/^\d{5}$/.test(studentId)) return json({ ok: true, message: RESET_GENERIC_MESSAGE }, 200, origin);
    const throttleKey = `reset-throttle:${studentId}`;
    if (await env.RECOVERY_STORE.get(throttleKey)) return json({ ok: true, message: RESET_GENERIC_MESSAGE }, 200, origin);
    await env.RECOVERY_STORE.put(throttleKey, "1", { expirationTtl: 60 });
    const recoveryEmail = await env.RECOVERY_STORE.get(`recovery-email:${studentId}`);
    if (!recoveryEmail) return json({ ok: true, message: RESET_GENERIC_MESSAGE }, 200, origin);
    try {
      const callerIp = request.headers.get("CF-Connecting-IP");
      const link = await generatePasswordResetLink(env, `${studentId}@auth.25withcoding.kr`, callerIp);
      await sendPlainTextEmail(env, recoveryEmail, "코딩과 함께라면 비밀번호 재설정", [
        "비밀번호 재설정 요청이 접수되었습니다.",
        "",
        "아래 링크를 열어 새 비밀번호를 설정하세요.",
        link,
        "",
        "본인이 요청하지 않았다면 이 메일을 무시해 주세요. 링크를 다른 사람과 공유하지 마세요.",
      ].join("\n"));
    } catch {
      // Keep the public response identical so the endpoint does not disclose whether an account exists.
    }
    return json({ ok: true, message: RESET_GENERIC_MESSAGE }, 200, origin);
  }

  return json({ error: "not_implemented" }, 404, origin);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "origin_not_allowed" }, 403, null);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "25withcoding-api",
        stage: "points2026-auth-proxy",
        firebaseApiKeyConfigured: Boolean(env.FIREBASE_API_KEY),
        recoveryConfigured: configuredRecovery(env),
      }, 200, origin);
    }
    if (url.pathname === "/api/points2026/auth" && request.method === "POST") {
      if (!env.FIREBASE_API_KEY) return json({ error: "server_auth_not_configured" }, 503, origin);
      const parsed = await readJson(request);
      if (parsed.error) return json({ error: parsed.error }, parsed.status, origin);
      const operation = parsed.body?.operation;
      if (typeof operation !== "string" || !AUTH_OPERATIONS.has(operation)) return json({ error: "operation_not_allowed" }, 400, origin);
      const payload = parsed.body?.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "invalid_payload" }, 400, origin);
      try {
        const { response, data } = await firebaseRequest(env, operation, payload);
        return json(data, response.status, origin);
      } catch {
        return json({ error: "identity_provider_unavailable" }, 502, origin);
      }
    }
    if (url.pathname.startsWith("/api/points2026/recovery/") && request.method === "POST") {
      return handleRecovery(request, env, url, origin);
    }
    return json({ error: "not_implemented" }, 404, origin);
  },
};
