/**
 * 25WITHCODING Security Gateway v2
 *
 * Isolated middleware. Do NOT attach a production route until the rollout checklist
 * and the legacy /api/security/* route interaction have been verified.
 *
 * Required bindings:
 *   SECURITY_KV (existing namespace; all new keys use v2: prefixes except legacy IP blocks)
 * Required secret:
 *   DEVICE_SIGNING_SECRET (32+ random bytes, base64/hex text)
 *
 * This worker never changes Firebase Auth, Firestore rules, or users documents.
 */

const API = "/api/security/v2";
const DEVICE_COOKIE = "__Host-25wc_device";
const SESSION_COOKIE = "__Host-25wc_session";
const EVENT_TTL = 90 * 24 * 60 * 60;
const DEVICE_TTL = 180 * 24 * 60 * 60;
const SESSION_TTL = 60 * 60; // align gateway session lifetime with Firebase ID token lifetime
const FIREBASE_PROJECT_ID = "points2026-f5e50";
const AUTH_SUFFIX = "@auth.25withcoding.kr";
const ALLOWED_ADMIN_ROLES = ["admin", "president", "vice", "committee_chair"];

let certCache = null;
let certCacheUntil = 0;
let hmacKeyPromise;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

function b64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeB64url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function getHmacKey(env) {
  if (typeof env.DEVICE_SIGNING_SECRET !== "string" || env.DEVICE_SIGNING_SECRET.length < 32) return null;
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.DEVICE_SIGNING_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }
  return hmacKeyPromise;
}

async function signValue(value, env) {
  const key = await getHmacKey(env);
  if (!key) throw new Error("DEVICE_SIGNING_SECRET is not configured");
  const payload = b64url(new TextEncoder().encode(value));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return payload + "." + b64url(new Uint8Array(signature));
}

async function verifyValue(token, env) {
  try {
    const [payload, signature, extra] = String(token || "").split(".");
    if (!payload || !signature || extra) return null;
    const key = await getHmacKey(env);
    if (!key) return null;
    const valid = await crypto.subtle.verify(
      "HMAC", key, decodeB64url(signature), new TextEncoder().encode(payload)
    );
    if (!valid) return null;
    return new TextDecoder().decode(decodeB64url(payload));
  } catch {
    return null;
  }
}

function cookies(request) {
  const result = {};
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) result[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return result;
}

function cookieHeader(name, value, maxAge) {
  return name + "=" + value + "; Path=/; Max-Age=" + maxAge +
    "; Secure; HttpOnly; SameSite=Lax";
}

function getIP(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

function isValidIPv4(ip) {
  return /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip);
}

function isValidIP(ip) {
  if (typeof ip !== "string" || ip.length > 45) return false;
  if (isValidIPv4(ip)) return true;
  if (!ip.includes(":")) return false;
  try { return new URL("http://[" + ip + "]/").hostname.toLowerCase() === "[" + ip.toLowerCase() + "]"; }
  catch { return false; }
}

function parseDevice(userAgent) {
  const ua = String(userAgent || "").slice(0, 512);
  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/CriOS|Chrome\//.test(ua)) browser = "Chrome";
  else if (/FxiOS|Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "Other";
  if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  const deviceType = /iPad|Tablet/.test(ua) ? "tablet" :
    /Mobile|iPhone|Android/.test(ua) ? "mobile" : "desktop";
  return { browser, os, deviceType };
}

async function getDevice(request, env) {
  const raw = cookies(request)[DEVICE_COOKIE];
  const decoded = await verifyValue(raw, env);
  if (!decoded) return null;
  const [id, issued] = decoded.split("|");
  if (!/^dev_[a-f0-9-]{36}$/i.test(id || "")) return null;
  const issuedAt = Number(issued);
  if (!Number.isFinite(issuedAt) || issuedAt > Date.now() + 300000 ||
      Date.now() - issuedAt > DEVICE_TTL * 1000) return null;
  return id;
}

async function ensureDevice(request, env) {
  const current = await getDevice(request, env);
  if (current) return { id: current, setCookie: null };
  const id = "dev_" + crypto.randomUUID();
  const token = await signValue(id + "|" + Date.now(), env);
  return { id, setCookie: cookieHeader(DEVICE_COOKIE, token, DEVICE_TTL) };
}

async function getSession(request, env) {
  const raw = cookies(request)[SESSION_COOKIE];
  const decoded = await verifyValue(raw, env);
  if (!decoded || !env.SECURITY_KV) return null;
  let data;
  try {
    data = JSON.parse(decoded);
  } catch {
    return null;
  }
  if (!data.sid || !data.uid || !data.exp || data.exp <= Date.now()) return null;
  const requestDevice = await getDevice(request, env);
  if (!requestDevice || requestDevice !== data.deviceId) return null;
  // Do not swallow KV errors here: callers must know when revocation state is unavailable.
  const record = await env.SECURITY_KV.get("v2:session:" + data.sid, "json");
  if (!record || record.status !== "active" || record.uid !== data.uid ||
      record.deviceId !== data.deviceId) return null;
  return data;
}

async function firebaseCerts() {
  if (certCache && Date.now() < certCacheUntil) return certCache;
  const response = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!response.ok) throw new Error("Firebase signing certificates unavailable");
  certCache = await response.json();
  const age = Number((response.headers.get("Cache-Control") || "").match(/max-age=(\d+)/i)?.[1] || 3600);
  certCacheUntil = Date.now() + Math.max(60, age) * 1000;
  return certCache;
}

async function verifyFirebaseToken(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const header = JSON.parse(new TextDecoder().decode(decodeB64url(parts[0])));
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    const cert = (await firebaseCerts())[header.kid];
    if (!cert) { certCache = null; certCacheUntil = 0; return null; }
    const pem = cert.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, "");
    const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
    // Extract SubjectPublicKeyInfo from X.509 TBSCertificate using a small DER reader.
    function node(bytes, offset) {
      const tag = bytes[offset++];
      let len = bytes[offset++];
      if (len & 128) {
        const count = len & 127;
        if (!count || count > 4) throw new Error("DER length");
        len = 0;
        for (let i = 0; i < count; i++) len = len * 256 + bytes[offset++];
      }
      return { tag, start: offset, end: offset + len, next: offset + len };
    }
    const certNode = node(der, 0);
    const tbs = node(der, certNode.start);
    let offset = tbs.start;
    let n = node(der, offset);
    if (n.tag === 160) offset = n.next;
    for (let i = 0; i < 6; i++) {
      n = node(der, offset);
      if (i === 5 && n.tag === 48) break;
      offset = n.next;
    }
    if (n.tag !== 48) return null;
    const spki = der.slice(offset, n.next);
    const key = await crypto.subtle.importKey("spki", spki,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key,
      decodeB64url(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(decodeB64url(parts[1])));
    const now = Math.floor(Date.now() / 1000);
    const email = String(claims.email || "").toLowerCase();
    if (
      claims.iss !== "https://securetoken.google.com/" + FIREBASE_PROJECT_ID ||
      claims.aud !== FIREBASE_PROJECT_ID ||
      typeof claims.sub !== "string" || !claims.sub ||
      !Number.isFinite(claims.exp) || claims.exp <= now ||
      !Number.isFinite(claims.iat) || claims.iat > now + 300 ||
      !email.endsWith(AUTH_SUFFIX) ||
      !/^\d{5}$/.test(email.slice(0, -AUTH_SUFFIX.length))
    ) return null;
    return { uid: claims.sub, studentId: email.slice(0, -AUTH_SUFFIX.length), email };
  } catch {
    return null;
  }
}

async function verifyAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const identity = await verifyFirebaseToken(auth.slice(7).trim());
  if (!identity) return null;
  // Preserve the existing Worker policy: the role is read from the caller's own users document.
  // Firestore rules remain authoritative; this code does not write users documents.
  const url = "https://firestore.googleapis.com/v1/projects/" + FIREBASE_PROJECT_ID +
    "/databases/(default)/documents/users/" + identity.studentId;
  const response = await fetch(url, { headers: { Authorization: auth } });
  if (!response.ok) return null;
  const doc = await response.json();
  const role = doc.fields?.role?.stringValue || "";
  if (!ALLOWED_ADMIN_ROLES.includes(role)) return null;
  return { ...identity, role };
}

async function kvGet(env, key) {
  if (!env.SECURITY_KV) return null;
  return env.SECURITY_KV.get(key);
}

async function writeEvent(env, request, deviceId, session) {
  if (!env.SECURITY_KV) return;
  const cf = request.cf || {};
  const event = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ip: getIP(request),
    country: cf.country || null,
    region: cf.region || null,
    city: cf.city || null,
    asn: Number.isFinite(cf.asn) ? cf.asn : null,
    networkName: cf.asOrganization || null,
    method: request.method,
    path: new URL(request.url).pathname,
    userAgent: (request.headers.get("User-Agent") || "").slice(0, 512),
    ...parseDevice(request.headers.get("User-Agent")),
    deviceId: deviceId || null,
    uid: session?.uid || null,
    accountId: session?.studentId || null,
    sessionId: session?.sid || null,
    eventType: "request"
  };
  // Inverted, fixed-width timestamp keeps the newest events first in KV's lexicographic listing.
  const newestFirst = String(9999999999999 - Date.now()).padStart(13, "0");
  await env.SECURITY_KV.put("v2:event:" + newestFirst + ":" + event.id,
    JSON.stringify(event), { expirationTtl: EVENT_TTL });
}

async function blockedReason(env, request, deviceId, session) {
  const ip = getIP(request);
  // Legacy IP block keys are intentionally shared with the existing security Worker.
  if (ip !== "unknown" && await kvGet(env, "block:" + ip)) return "ip";
  if (deviceId && await kvGet(env, "v2:block:device:" + deviceId)) return "device";
  if (session?.uid && await kvGet(env, "v2:block:account:" + session.uid)) return "account";
  if (session?.sid && await kvGet(env, "v2:block:session:" + session.sid)) return "session";
  return null;
}

function isHtmlNavigation(request) {
  return request.method === "GET" &&
    (request.headers.get("Accept") || "").includes("text/html") &&
    !new URL(request.url).pathname.startsWith(API + "/");
}

async function handleApi(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "https://25withcoding.kr",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin"
    }});
  }

  if (!env.SECURITY_KV || !env.DEVICE_SIGNING_SECRET) {
    return json({ error: "Gateway not configured" }, 503);
  }
  let currentDevice = null;
  let currentSession = null;
  let blockReason = null;
  try {
    currentDevice = await getDevice(request, env);
    currentSession = await getSession(request, env);
    const isSessionCleanup = path === API + "/session" && request.method === "DELETE";
    blockReason = isSessionCleanup ? null :
      await blockedReason(env, request, currentDevice, currentSession);
  } catch (error) {
    console.error("Gateway API security-state lookup failed", String(error?.message || error));
    return json({ error: "Security state unavailable" }, 503);
  }
  if (ctx?.waitUntil) ctx.waitUntil(writeEvent(env, request, currentDevice, currentSession).catch(() => {}));
  if (blockReason) {
    return json({ error: "ACCESS_BLOCKED", message: "This request is blocked by security policy." }, 403);
  }

  if (path === API + "/status" && request.method === "GET") {
    return json({ success: true, active: true, retentionDays: 90, deviceIdEnabled: true, accountSessionsEnabled: true });
  }

  if (path === API + "/device" && request.method === "POST") {
    if (!env.SECURITY_KV || !env.DEVICE_SIGNING_SECRET) return json({ error: "Gateway not configured" }, 503);
    const device = await ensureDevice(request, env);
    const ua = request.headers.get("User-Agent") || "";
    const profile = {
      deviceId: device.id,
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      ...parseDevice(ua)
    };
    const key = "v2:device:" + device.id;
    const old = await env.SECURITY_KV.get(key, "json");
    profile.firstSeenAt = old?.firstSeenAt || profile.firstSeenAt;
    await env.SECURITY_KV.put(key, JSON.stringify(profile), { expirationTtl: DEVICE_TTL });
    return json({ success: true, deviceId: device.id }, 200,
      device.setCookie ? { "Set-Cookie": device.setCookie } : {});
  }

  if (path === API + "/session" && request.method === "POST") {
    if (!env.SECURITY_KV || !env.DEVICE_SIGNING_SECRET) return json({ error: "Gateway not configured" }, 503);
    const origin = request.headers.get("Origin") || "";
    if (origin !== (env.ALLOWED_ORIGIN || "https://25withcoding.kr")) {
      return json({ error: "Forbidden origin" }, 403);
    }
    const auth = request.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) return json({ error: "Firebase token required" }, 401);
    const identity = await verifyFirebaseToken(auth.slice(7).trim());
    if (!identity) return json({ error: "Invalid Firebase session" }, 401);
    const device = await ensureDevice(request, env);
    const now = Date.now();
    const existingSession = currentSession?.uid === identity.uid &&
      currentSession.deviceId === device.id ? currentSession : null;
    if (currentSession && !existingSession) {
      await env.SECURITY_KV.delete("v2:session:" + currentSession.sid);
    }
    const sid = existingSession?.sid || ("ses_" + crypto.randomUUID());
    const session = {
      sid, uid: identity.uid, studentId: identity.studentId, deviceId: device.id,
      iat: existingSession?.iat || now, exp: now + SESSION_TTL * 1000
    };
    const cookie = await signValue(JSON.stringify(session), env);
    const previousRecord = existingSession
      ? await env.SECURITY_KV.get("v2:session:" + sid, "json")
      : null;
    await env.SECURITY_KV.put("v2:session:" + sid, JSON.stringify({
      sessionId: sid, uid: identity.uid, accountId: identity.studentId,
      deviceId: device.id, createdAt: previousRecord?.createdAt || new Date(now).toISOString(),
      lastSeenAt: new Date(now).toISOString(), status: "active"
    }), { expirationTtl: SESSION_TTL });
    const response = json({ success: true, sessionId: sid, expiresIn: SESSION_TTL });
    const headers = new Headers(response.headers);
    headers.append("Set-Cookie", cookieHeader(SESSION_COOKIE, cookie, SESSION_TTL));
    if (device.setCookie) headers.append("Set-Cookie", device.setCookie);
    const accountBlocked = await env.SECURITY_KV.get("v2:block:account:" + identity.uid);
    if (accountBlocked) {
      return new Response(JSON.stringify({
        error: "ACCESS_BLOCKED",
        message: "This account is blocked."
      }), { status: 403, headers });
    }
    return new Response(response.body, { status: response.status, headers });
  }

  if (path === API + "/session" && request.method === "DELETE") {
    const session = await getSession(request, env);
    if (session && env.SECURITY_KV) await env.SECURITY_KV.delete("v2:session:" + session.sid);
    return new Response(null, { status: 204, headers: {
      "Set-Cookie": SESSION_COOKIE + "=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax",
      "Cache-Control": "no-store"
    }});
  }

  if (path.startsWith(API + "/admin/")) {
    if (!env.SECURITY_KV) return json({ error: "Gateway not configured" }, 503);
    const admin = await verifyAdmin(request, env);
    if (!admin) return json({ error: "Unauthorized" }, 401);

    if (path === API + "/admin/devices" && request.method === "GET") {
      const listed = await env.SECURITY_KV.list({ prefix: "v2:device:", limit: 1000 });
      const devices = [];
      for (const item of listed.keys) {
        const value = await env.SECURITY_KV.get(item.name, "json");
        if (value) devices.push(value);
      }
      devices.sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
      return json({ success: true, devices });
    }

    if (path === API + "/admin/sessions" && request.method === "GET") {
      const listed = await env.SECURITY_KV.list({ prefix: "v2:session:", limit: 1000 });
      const sessions = [];
      for (const item of listed.keys) {
        const value = await env.SECURITY_KV.get(item.name, "json");
        if (value) sessions.push(value);
      }
      sessions.sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt));
      return json({ success: true, sessions });
    }

    if (path === API + "/admin/events" && request.method === "GET") {
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);
      const listed = await env.SECURITY_KV.list({ prefix: "v2:event:", limit: 1000 });
      const events = [];
      for (const item of listed.keys) {
        const value = await env.SECURITY_KV.get(item.name, "json");
        if (value) events.push(value);
      }
      events.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      return json({ success: true, events: events.slice(0, limit) });
    }

    if (path === API + "/admin/blocks" && request.method === "POST") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      const type = String(body.type || "");
      const target = String(body.target || "").trim();
      const reason = String(body.reason || "").trim().slice(0, 300);
      const allowed = ["ip", "device", "account", "session"];
      if (!allowed.includes(type) || !target || !reason) return json({ error: "Invalid block request" }, 400);
      if (type === "ip" && !isValidIP(target)) return json({ error: "Invalid IP" }, 400);
      if (type === "device" && !/^dev_[a-f0-9-]{36}$/i.test(target)) return json({ error: "Invalid device ID" }, 400);
      if (type === "account" && !/^[\w-]{10,128}$/.test(target)) return json({ error: "Invalid UID" }, 400);
      if (type === "session" && !/^ses_[a-f0-9-]{36}$/i.test(target)) return json({ error: "Invalid session ID" }, 400);
      const key = type === "ip" ? "block:" + target : "v2:block:" + type + ":" + target;
      if (await env.SECURITY_KV.get(key)) return json({ error: "Already blocked" }, 409);
      const now = new Date().toISOString();
      const record = {
        type, target, reason, blockedBy: admin.studentId,
        createdAt: now, active: true,
        ...(type === "ip" ? { ip: target, blockedAt: now, permanent: true } : {})
      };
      await env.SECURITY_KV.put(key, JSON.stringify(record));
      const audit = { id: crypto.randomUUID(), action: type + "_blocked", target,
        adminUid: admin.uid, adminStudentId: admin.studentId, reason,
        timestamp: new Date().toISOString() };
      await env.SECURITY_KV.put("v2:audit:" + audit.id, JSON.stringify(audit), { expirationTtl: EVENT_TTL });
      return json({ success: true, block: record }, 201);
    }

    if (path === API + "/admin/blocks" && request.method === "GET") {
      const blocks = [];
      const listed = await env.SECURITY_KV.list({ prefix: "v2:block:", limit: 1000 });
      for (const item of listed.keys) {
        const value = await env.SECURITY_KV.get(item.name, "json");
        if (value) blocks.push(value);
      }
      // Include existing legacy IP blocks without changing their storage format.
      const legacy = await env.SECURITY_KV.list({ prefix: "block:", limit: 1000 });
      for (const item of legacy.keys) {
        const value = await env.SECURITY_KV.get(item.name, "json");
        if (value) blocks.push({ type: "ip", target: value.ip || item.name.slice(6), ...value });
      }
      return json({ success: true, blocks });
    }

    if (path === API + "/admin/blocks" && request.method === "DELETE") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
      const type = String(body.type || "");
      const target = String(body.target || "").trim();
      const reason = String(body.reason || "").trim().slice(0, 300);
      if (!["ip", "device", "account", "session"].includes(type) || !target || !reason) {
        return json({ error: "Invalid unblock request" }, 400);
      }
      const key = type === "ip" ? "block:" + target : "v2:block:" + type + ":" + target;
      if (!await env.SECURITY_KV.get(key)) return json({ error: "Block not found" }, 404);
      await env.SECURITY_KV.delete(key);
      const audit = { id: crypto.randomUUID(), action: type + "_unblocked", target,
        adminUid: admin.uid, adminStudentId: admin.studentId, reason,
        timestamp: new Date().toISOString() };
      await env.SECURITY_KV.put("v2:audit:" + audit.id, JSON.stringify(audit), { expirationTtl: EVENT_TTL });
      return json({ success: true });
    }
    return json({ error: "Not found" }, 404);
  }

  return json({ error: "Not found" }, 404);
}

async function passThrough(request, env, ctx, deviceCookie = null) {
  let response;
  try {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/security/") && !path.startsWith(API + "/")) {
      // Preserve the legacy security API behind a Cloudflare service binding.
      if (!env.LEGACY_SECURITY) {
        return json({ error: "Legacy security service binding is not configured" }, 503);
      }
      response = await env.LEGACY_SECURITY.fetch(request);
    } else {
      response = await fetch(request);
    }
  } catch (error) {
    console.error("Gateway origin fetch failed", String(error?.message || error));
    return new Response("일시적으로 서비스를 이용할 수 없습니다.", {
      status: 502, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
    });
  }
  if (!deviceCookie) return response;
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", deviceCookie);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // The gateway's API is explicitly namespaced; unrelated paths remain origin pass-through.
    if (path.startsWith(API + "/")) return handleApi(request, env, ctx);

    // Fail open if configuration is incomplete: this worker must not take the school site offline.
    if (!env.SECURITY_KV || !env.DEVICE_SIGNING_SECRET) {
      return passThrough(request, env, ctx);
    }

    let deviceId = null;
    let session = null;
    let reason;
    try {
      deviceId = await getDevice(request, env);
      session = await getSession(request, env);
      reason = await blockedReason(env, request, deviceId, session);
    } catch (error) {
      console.error("Gateway block lookup failed", String(error?.message || error));
      // Availability-first fallback. Monitoring must alert because blocks may not be enforced.
      return passThrough(request, env, ctx);
    }

    if (reason) {
      if (ctx?.waitUntil) ctx.waitUntil(writeEvent(env, request, deviceId, session).catch(() => {}));
      return new Response(
        "<!doctype html><html lang=\"ko\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>접근 제한</title><main style=\"font-family:system-ui;max-width:560px;margin:15vh auto;padding:24px\"><h1>접근이 제한되었습니다</h1><p>이 요청은 보안 정책에 따라 처리되지 않았습니다. 관리자에게 문의해 주세요.</p></main></html>",
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
      );
    }

    if (ctx?.waitUntil) {
      ctx.waitUntil(writeEvent(env, request, deviceId, session).catch(() => {}));
      if (deviceId) {
        ctx.waitUntil((async () => {
          const key = "v2:device:" + deviceId;
          const profile = await env.SECURITY_KV.get(key, "json");
          if (profile) {
            profile.lastSeenAt = new Date().toISOString();
            await env.SECURITY_KV.put(key, JSON.stringify(profile), { expirationTtl: DEVICE_TTL });
          }
          if (session) {
            const sessionKey = "v2:session:" + session.sid;
            const record = await env.SECURITY_KV.get(sessionKey, "json");
            if (record && record.status === "active") {
              record.lastSeenAt = new Date().toISOString();
              await env.SECURITY_KV.put(sessionKey, JSON.stringify(record), { expirationTtl: SESSION_TTL });
            }
          }
        })().catch(() => {}));
      }
    }

    let newCookie = null;
    if (!deviceId && isHtmlNavigation(request)) {
      try {
        const device = await ensureDevice(request, env);
        newCookie = device.setCookie;
        if (newCookie && env.SECURITY_KV) {
          ctx?.waitUntil?.(env.SECURITY_KV.put("v2:device:" + device.id, JSON.stringify({
            deviceId: device.id, firstSeenAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(), ...parseDevice(request.headers.get("User-Agent"))
          }), { expirationTtl: DEVICE_TTL }).catch(() => {}));
        }
      } catch (error) {
        console.error("Device cookie issue", String(error?.message || error));
      }
    }
    return passThrough(request, env, ctx, newCookie);
  }
};
