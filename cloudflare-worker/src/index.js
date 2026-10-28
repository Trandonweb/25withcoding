const ALLOWED_ORIGINS = new Set([
  "https://25withcoding.kr",
  "https://www.25withcoding.kr",
]);

// Explicit allowlist: clients cannot choose an upstream URL or API path.
const AUTH_OPERATIONS = new Set([
  "signInWithPassword",
  "signUp",
  "sendOobCode",
  "resetPassword",
  "verifyPasswordResetCode",
  "confirmPasswordReset",
  "getAccountInfo",
]);

function corsHeaders(origin) {
  const headers = new Headers({
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  });

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function json(data, status, origin) {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "origin_not_allowed" }, 403, null);
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        service: "25withcoding-api",
        stage: "points2026-auth-proxy",
        firebaseApiKeyConfigured: Boolean(env.FIREBASE_API_KEY),
      }, 200, origin);
    }

    // Keep Firebase Auth's Web API key on the server side for this migration.
    // This is not a Firestore proxy and does not grant database access by itself.
    if (url.pathname === "/api/points2026/auth" && request.method === "POST") {
      if (!env.FIREBASE_API_KEY) {
        return json({ error: "server_auth_not_configured" }, 503, origin);
      }

      const contentType = request.headers.get("Content-Type") || "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "json_required" }, 415, origin);
      }

      const declaredLength = Number(request.headers.get("Content-Length") || "0");
      if (declaredLength > 16_384) {
        return json({ error: "payload_too_large" }, 413, origin);
      }

      let body;
      try {
        const raw = await request.text();
        if (raw.length > 16_384) return json({ error: "payload_too_large" }, 413, origin);
        body = JSON.parse(raw);
      } catch {
        return json({ error: "invalid_json" }, 400, origin);
      }

      const operation = body?.operation;
      if (typeof operation !== "string" || !AUTH_OPERATIONS.has(operation)) {
        return json({ error: "operation_not_allowed" }, 400, origin);
      }

      const payload = body?.payload;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json({ error: "invalid_payload" }, 400, origin);
      }

      // Never accept a client-provided project or upstream URL.
      const upstream = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:${operation}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const responseText = await upstream.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        return json({ error: "identity_provider_unavailable" }, 502, origin);
      }

      // Firebase Auth errors are returned as JSON; don't log or echo the API key.
      return json(responseData, upstream.status, origin);
    }

    // Fail closed: no generic Firestore access or unimplemented feature routes.
    return json({ error: "not_implemented" }, 404, origin);
  },
};
