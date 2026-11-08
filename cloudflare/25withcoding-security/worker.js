// Recovery candidate based on Cloudflare Worker version b7005792-d6de-477d-9a97-c88694a69ad8 (version 8).
// Uses Firebase ID Token + Firestore Security Rules; no service-account private key is required.
// Do not deploy until SECURITY_KV binding and production authorization flow are verified.
// Cloudflare Worker: 25withcoding-security


const API_PREFIX = "/api/security";
const EVENT_TTL = 60 * 60 * 24 * 90;

let cachedAccessToken = null;
let cachedTokenExpiry = 0;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://25withcoding.kr",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

// ----------------------------------------
// 공통 응답
// ----------------------------------------

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

// ----------------------------------------
// Base64 URL 인코딩
// ----------------------------------------

function base64url(value) {
  const bytes = typeof value === "string"
    ? new TextEncoder().encode(value)
    : value;

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

// ----------------------------------------
// 접속 IP 확인
// ----------------------------------------

function getClientIP(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

// ----------------------------------------
// IP 주소 형식 확인
// ----------------------------------------

function validIP(ip) {
  if (typeof ip !== "string" || ip.length > 45) {
    return false;
  }

  // IPv4
  if (
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip)
  ) {
    return true;
  }

  // IPv6
  if (!ip.includes(":")) {
    return false;
  }

  try {
    const parsed = new URL(`http://[${ip}]/`);

    return parsed.hostname.toLowerCase() ===
      `[${ip.toLowerCase()}]`;
  } catch {
    return false;
  }
}

// ----------------------------------------
// 관리자 작업 감사 기록
// ----------------------------------------

async function audit(env, action, ip, details = {}) {
  const id = crypto.randomUUID();

  const record = {
    id,
    action,
    ip,
    details,
    timestamp: new Date().toISOString()
  };

  await env.SECURITY_KV.put(
    `audit:${id}`,
    JSON.stringify(record),
    { expirationTtl: EVENT_TTL }
  );
}

// ----------------------------------------
// 보안 이벤트 기록
// ----------------------------------------

async function recordEvent(env, request, action, details = {}) {
  const id = crypto.randomUUID();
  const requestUrl = new URL(request.url);
  const path = details.path || requestUrl.pathname;
  const event = {
    id,
    action,
    type: action,
    ip: getClientIP(request),
    url: path,
    path,
    method: details.method || request.method,
    statusCode: Number.isInteger(details.statusCode) ? details.statusCode : null,
    country: request.cf?.country || null,
    userAgent: request.headers.get("User-Agent") || "",
    studentId: details.studentId || null,
    loginStatus: details.loginStatus || (details.studentId ? "logged_in" : "logged_out"),
    loginAttempt: Boolean(details.loginAttempt),
    apiAttempt: typeof details.apiAttempt === "boolean" ? details.apiAttempt : path.startsWith("/api/"),
    details,
    reviewed: false,
    timestamp: new Date().toISOString()
  };

  await env.SECURITY_KV.put(
    `event:${id}`,
    JSON.stringify(event),
    { expirationTtl: EVENT_TTL }
  );

  return event;
}

// Backward-compatible page visit recorder.
async function recordPageVisit(env, request, pagePath, statusCode = null, studentId = null) {
  return recordEvent(env, request, "page_visit", {
    path: pagePath,
    method: "GET",
    statusCode,
    studentId,
    loginStatus: studentId ? "logged_in" : "logged_out",
    loginAttempt: false,
    apiAttempt: false
  });
}

// ----------------------------------------
// Firebase 설정
// Firebase Web API Key는 공개 클라이언트 설정값이며,
// Firestore 접근 권한은 ID Token과 Firestore Rules가 결정한다.
// ----------------------------------------
const FIREBASE_PROJECT_ID = "points2026-f5e50";

// ----------------------------------------
// 관리자 인증
// ----------------------------------------

// Firebase ID Token is verified locally with Google's Secure Token signing certificates.
// This avoids calling Identity Toolkit with a browser-restricted Firebase Web API key.
let cachedFirebaseCerts = null;
let cachedFirebaseCertsExpiry = 0;

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function readDerNode(bytes, offset) {
  if (offset + 2 > bytes.length) throw new Error("Invalid certificate encoding");
  const tag = bytes[offset++];
  let length = bytes[offset++];
  if (length & 0x80) {
    const count = length & 0x7f;
    if (!count || count > 4 || offset + count > bytes.length) throw new Error("Invalid certificate length");
    length = 0;
    for (let i = 0; i < count; i++) length = length * 256 + bytes[offset++];
  }
  const start = offset;
  const end = start + length;
  if (end > bytes.length) throw new Error("Truncated certificate");
  return { tag, start, end, next: end };
}

function certificateSpki(pem) {
  const base64 = pem.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, "");
  const binary = atob(base64);
  const der = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) der[i] = binary.charCodeAt(i);

  const certificate = readDerNode(der, 0);
  const tbs = readDerNode(der, certificate.start);
  let offset = tbs.start;
  let node = readDerNode(der, offset);
  if (node.tag === 0xa0) offset = node.next;

  // TBSCertificate fields: serial, signature, issuer, validity, subject, SubjectPublicKeyInfo.
  for (let i = 0; i < 6; i++) {
    node = readDerNode(der, offset);
    if (i === 5 && node.tag === 0x30) return der.slice(offset, node.next);
    offset = node.next;
  }
  throw new Error("Certificate public key not found");
}

async function getFirebaseSigningCerts() {
  if (cachedFirebaseCerts && Date.now() < cachedFirebaseCertsExpiry) return cachedFirebaseCerts;

  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) {
    console.warn("SECURITY_AUTH_DIAG: firebase_cert_fetch_failed", response.status);
    return null;
  }

  const certs = await response.json();
  const cacheControl = response.headers.get("Cache-Control") || "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] || 3600);
  cachedFirebaseCerts = certs;
  cachedFirebaseCertsExpiry = Date.now() + Math.max(60, maxAge) * 1000;
  return certs;
}

async function verifyFirebaseIdToken(idToken) {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

    const certs = await getFirebaseSigningCerts();
    const certificate = certs?.[header.kid];
    if (!certificate) {
      cachedFirebaseCerts = null;
      cachedFirebaseCertsExpiry = 0;
      console.warn("SECURITY_AUTH_DIAG: firebase_signing_key_missing");
      return null;
    }

    const publicKey = await crypto.subtle.importKey(
      "spki",
      certificateSpki(certificate),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const validSignature = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64Url(parts[2]),
      new TextEncoder().encode(parts[0] + "." + parts[1])
    );
    if (!validSignature) {
      console.warn("SECURITY_AUTH_DIAG: firebase_signature_invalid");
      return null;
    }

    const claims = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
    const now = Math.floor(Date.now() / 1000);
    if (
      claims.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID ||
      claims.aud !== FIREBASE_PROJECT_ID ||
      typeof claims.sub !== "string" ||
      !claims.sub ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      typeof claims.iat !== "number" ||
      claims.iat > now + 300
    ) {
      console.warn("SECURITY_AUTH_DIAG: firebase_claims_invalid");
      return null;
    }
    return claims;
  } catch (error) {
    console.warn("SECURITY_AUTH_DIAG: firebase_jwt_verification_error", String(error?.message || "unknown").slice(0, 120));
    return null;
  }
}

// ----------------------------------------
// 관리자 인증
// ----------------------------------------

async function verifyAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const idToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!idToken) return null;

  const claims = await verifyFirebaseIdToken(idToken);
  if (!claims?.email) {
    console.warn("SECURITY_AUTH_DIAG: firebase_account_email_missing");
    return null;
  }

  const suffix = "@auth.25withcoding.kr";
  const email = String(claims.email).toLowerCase();
  if (!email.endsWith(suffix)) {
    console.warn("SECURITY_AUTH_DIAG: email_domain_mismatch");
    return null;
  }

  const studentId = email.slice(0, -suffix.length);
  if (!/^\d{5}$/.test(studentId)) {
    console.warn("SECURITY_AUTH_DIAG: student_id_format_mismatch");
    return null;
  }

  // Firebase ID Token reads only the caller's own user document; Firestore Rules remain authoritative.
  const documentURL =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/users/${studentId}`;
  const documentResponse = await fetch(documentURL, {
    headers: { Authorization: `Bearer ${idToken}` }
  });

  if (!documentResponse.ok) {
    console.warn("SECURITY_AUTH_DIAG: firestore_user_read_failed", documentResponse.status);
    return null;
  }

  const document = await documentResponse.json();
  const role = document.fields?.role?.stringValue;
  const allowedRoles = ["admin", "president", "vice", "committee_chair"];
  if (!allowedRoles.includes(role)) {
    console.warn("SECURITY_AUTH_DIAG: role_not_allowed", role || "missing");
    return null;
  }

  return { studentId, email, role };
}

// ----------------------------------------
// KV 목록 조회
// ----------------------------------------

async function listKV(env, prefix) {
  const results = [];
  let cursor;

  for (let page = 0; page < 5; page++) {
    const response = await env.SECURITY_KV.list({
      prefix,
      limit: 1000,
      cursor
    });

    results.push(...response.keys);

    if (response.list_complete) {
      break;
    }

    cursor = response.cursor;

    if (!cursor) {
      break;
    }
  }

  return results;
}

// ----------------------------------------
// 이벤트 조회
// ----------------------------------------

async function getEvents(env, limit) {
  const keys = await listKV(env, "event:");
  const events = [];

  for (const key of keys) {
    const value = await env.SECURITY_KV.get(key.name);

    if (!value) {
      continue;
    }

    try {
      events.push(JSON.parse(value));
    } catch {}
  }

  events.sort((a, b) =>
    new Date(b.timestamp) - new Date(a.timestamp)
  );

  const countsByIP = new Map();
  for (const event of events) {
    if (event.ip) countsByIP.set(event.ip, (countsByIP.get(event.ip) || 0) + 1);
  }
  for (const event of events) {
    event.ipRequestCount = event.ip ? (countsByIP.get(event.ip) || 0) : 0;
  }

  return events.slice(0, limit);
}

// ----------------------------------------
// 차단 목록 조회
// ----------------------------------------

async function getBlocks(env) {
  const keys = await listKV(env, "block:");
  const blocks = [];

  for (const key of keys) {
    const value = await env.SECURITY_KV.get(key.name);

    if (!value) {
      continue;
    }

    try {
      blocks.push(JSON.parse(value));
    } catch {}
  }

  return blocks;
}

// ----------------------------------------
// 메인 요청 처리
// ----------------------------------------

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (!path.startsWith(API_PREFIX)) {
    return json({ error: "Not found" }, 404);
  }

  // CORS 사전 요청
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (!env.SECURITY_KV) {
    return json({
      error: "SECURITY_KV binding missing"
    }, 500);
  }

  const ip = getClientIP(request);

  // --------------------------------------
  // IP 차단 여부 확인
  // --------------------------------------

  if (ip !== "unknown") {
    const blocked = await env.SECURITY_KV.get(`block:${ip}`);

    if (blocked) {
      return json({
        error: "IP_BLOCKED",
        message: "This IP is blocked."
      }, 403);
    }
  }

  // --------------------------------------
  // 공개 페이지 방문 기록 API
  // --------------------------------------

  if (
    path === `${API_PREFIX}/visit` &&
    request.method === "POST"
  ) {
    const origin = request.headers.get("Origin") || "";
    const contentType =
      request.headers.get("Content-Type") || "";

    if (origin !== "https://25withcoding.kr") {
      return json({
        error: "Forbidden origin"
      }, 403);
    }

    if (!contentType.toLowerCase().includes("application/json")) {
      return json({
        error: "JSON required"
      }, 415);
    }

    // 요청 본문 크기 제한
    const rawBody = await request.text();

    if (rawBody.length > 1024) {
      return json({
        error: "Request too large"
      }, 413);
    }

    let body;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({
        error: "Invalid JSON"
      }, 400);
    }

    const pagePath = body?.path;

    // 경로 검증
    if (
      typeof pagePath !== "string" ||
      pagePath.length < 1 ||
      pagePath.length > 200 ||
      !pagePath.startsWith("/") ||
      pagePath.startsWith("//") ||
      pagePath.includes("?") ||
      pagePath.includes("#") ||
      pagePath.includes("\\") ||
      /[\u0000-\u001F\u007F]/.test(pagePath)
    ) {
      return json({
        error: "Invalid page path"
      }, 400);
    }

    let visitStudentId = null;
    const visitAuthorization = request.headers.get("Authorization") || "";
    const visitToken = visitAuthorization.startsWith("Bearer ") ? visitAuthorization.slice(7).trim() : "";
    if (visitToken) {
      const claims = await verifyFirebaseIdToken(visitToken);
      const match = String(claims?.email || "").toLowerCase().match(/^(\d{5})@auth\.25withcoding\.kr$/);
      if (match) visitStudentId = match[1];
    }

    const visitStatus = Number.isInteger(body.statusCode) && body.statusCode >= 100 && body.statusCode <= 599
      ? body.statusCode
      : null;
    await recordPageVisit(env, request, pagePath, visitStatus, visitStudentId);

    return json({
      success: true,
      message: "Visit recorded"
    });
  }

  // --------------------------------------
  // Same-origin browser telemetry (page views, API attempts, login attempts)
  // --------------------------------------
  if (
    path === `${API_PREFIX}/telemetry` &&
    request.method === "POST"
  ) {
    const origin = request.headers.get("Origin") || "";
    if (origin !== "https://25withcoding.kr") {
      return json({ error: "Forbidden origin" }, 403);
    }
    if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) {
      return json({ error: "JSON required" }, 415);
    }

    const rawBody = await request.text();
    if (rawBody.length > 2048) return json({ error: "Request too large" }, 413);

    let body;
    try { body = JSON.parse(rawBody); }
    catch { return json({ error: "Invalid JSON" }, 400); }

    const pagePath = body?.path;
    const allowedKinds = ["page_visit", "api_request", "login_attempt", "login_success", "login_failure"];
    const kind = allowedKinds.includes(body?.kind) ? body.kind : "";
    const method = String(body?.method || "GET").toUpperCase();
    const statusCode = Number.isInteger(body?.statusCode) && body.statusCode >= 100 && body.statusCode <= 599
      ? body.statusCode
      : null;

    if (
      !kind ||
      typeof pagePath !== "string" ||
      pagePath.length < 1 ||
      pagePath.length > 200 ||
      !pagePath.startsWith("/") ||
      pagePath.startsWith("//") ||
      pagePath.includes("?") ||
      pagePath.includes("#") ||
      pagePath.includes("\\") ||
      /[\u0000-\u001F\u007F]/.test(pagePath) ||
      !["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].includes(method)
    ) {
      return json({ error: "Invalid telemetry payload" }, 400);
    }

    let studentId = null;
    const authorization = request.headers.get("Authorization") || "";
    const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
    if (idToken) {
      const claims = await verifyFirebaseIdToken(idToken);
      const email = String(claims?.email || "").toLowerCase();
      const match = email.match(/^(\d{5})@auth\.25withcoding\.kr$/);
      if (match) studentId = match[1];
    }

    if (kind === "login_success" && !studentId) {
      return json({ error: "Authenticated token required" }, 401);
    }

    await recordEvent(env, request, kind, {
      path: pagePath,
      method,
      statusCode,
      studentId,
      loginStatus: studentId ? "logged_in" : "logged_out",
      loginAttempt: kind.startsWith("login_"),
      apiAttempt: kind === "api_request" || pagePath.startsWith("/api/")
    });

    return json({ success: true });
  }

  // --------------------------------------
  // 관리자 인증
  // --------------------------------------

  const admin = await verifyAdmin(request, env);

  if (!admin) {
    return json({
      error: "Unauthorized"
    }, 401);
  }

  // --------------------------------------
  // 이벤트 조회
  // --------------------------------------

  if (
    path === `${API_PREFIX}/events` &&
    request.method === "GET"
  ) {
    const limit = Math.min(
      Math.max(
        Number(url.searchParams.get("limit")) || 200,
        1
      ),
      500
    );

    return json({
      success: true,
      events: await getEvents(env, limit)
    });
  }

  // --------------------------------------
  // 차단 목록 조회
  // --------------------------------------

  if (
    path === `${API_PREFIX}/blocks` &&
    request.method === "GET"
  ) {
    return json({
      success: true,
      blocks: await getBlocks(env)
    });
  }

  // --------------------------------------
  // IP 수동 차단
  // --------------------------------------

  if (
    path === `${API_PREFIX}/blocks` &&
    request.method === "POST"
  ) {
    let body;

    try {
      body = await request.json();
    } catch {
      return json({
        error: "Invalid JSON"
      }, 400);
    }

    const targetIP = String(body.ip || "").trim();
    const reason = String(body.reason || "")
      .trim()
      .slice(0, 500);

    if (!validIP(targetIP)) {
      return json({
        error: "Invalid IP address"
      }, 400);
    }

    if (!reason) {
      return json({
        error: "Reason is required"
      }, 400);
    }

    const existing = await env.SECURITY_KV.get(
      `block:${targetIP}`
    );

    if (existing) {
      return json({
        error: "Already blocked"
      }, 409);
    }

    const block = {
      ip: targetIP,
      reason,
      blockedBy: admin.studentId,
      blockedAt: new Date().toISOString(),
      permanent: true
    };

    await env.SECURITY_KV.put(
      `block:${targetIP}`,
      JSON.stringify(block)
    );

    await audit(env, "ip_blocked", targetIP, {
      reason,
      admin: admin.studentId
    });

    return json({
      success: true,
      message: "IP blocked",
      block
    });
  }

  // --------------------------------------
  // IP 차단 해제
  // --------------------------------------

  if (
    path.startsWith(`${API_PREFIX}/blocks/`) &&
    request.method === "DELETE"
  ) {
    let targetIP;

    try {
      targetIP = decodeURIComponent(
        path.slice(`${API_PREFIX}/blocks/`.length)
      );
    } catch {
      return json({
        error: "Invalid IP address"
      }, 400);
    }

    if (!validIP(targetIP)) {
      return json({
        error: "Invalid IP address"
      }, 400);
    }

    const existing = await env.SECURITY_KV.get(
      `block:${targetIP}`
    );

    if (!existing) {
      return json({
        error: "Block not found"
      }, 404);
    }

    await env.SECURITY_KV.delete(`block:${targetIP}`);

    await audit(env, "ip_unblocked", targetIP, {
      admin: admin.studentId
    });

    return json({
      success: true,
      message: "IP unblocked"
    });
  }

  // --------------------------------------
  // 이벤트 검토
  // --------------------------------------

  const reviewMatch = path.match(
    /^\/api\/security\/events\/([^/]+)\/review$/
  );

  if (
    reviewMatch &&
    request.method === "POST"
  ) {
    const eventId = decodeURIComponent(reviewMatch[1]);
    const key = `event:${eventId}`;

    const value = await env.SECURITY_KV.get(key);

    if (!value) {
      return json({
        error: "Event not found"
      }, 404);
    }

    const event = JSON.parse(value);

    event.reviewed = true;
    event.reviewedBy = admin.studentId;
    event.reviewedAt = new Date().toISOString();

    await env.SECURITY_KV.put(
      key,
      JSON.stringify(event),
      { expirationTtl: EVENT_TTL }
    );

    await audit(env, "event_reviewed", event.ip, {
      eventId,
      admin: admin.studentId
    });

    return json({
      success: true,
      event
    });
  }

  // --------------------------------------
  // 존재하지 않는 API
  // --------------------------------------

  return json({
    error: "Not found"
  }, 404);
}

// ----------------------------------------
// Worker 진입점
// ----------------------------------------

export default {
  async fetch(request, env) {
    try {
      const response = await handleRequest(request, env);
      const path = new URL(request.url).pathname;
      if (
        env.SECURITY_KV &&
        path.startsWith(API_PREFIX) &&
        path !== `${API_PREFIX}/visit` &&
        path !== `${API_PREFIX}/telemetry` &&
        request.method !== "OPTIONS"
      ) {
        let studentId = null;
        const authorization = request.headers.get("Authorization") || "";
        const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
        if (idToken) {
          const claims = await verifyFirebaseIdToken(idToken);
          const match = String(claims?.email || "").toLowerCase().match(/^(\d{5})@auth\.25withcoding\.kr$/);
          if (match) studentId = match[1];
        }
        await recordEvent(
          env,
          request,
          response.status === 401 ? "api_authentication_denied" : "api_request",
          {
            statusCode: response.status,
            studentId,
            loginStatus: studentId ? "logged_in" : "logged_out",
            loginAttempt: false,
            apiAttempt: true
          }
        );
      }
      return response;
    } catch (error) {
      // 상세 오류는 Worker 로그에만 기록
      console.error(
        "Security Worker error:",
        error.message
      );

      return json({
        error: "Internal server error"
      }, 500);
    }
  }
};