import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://25withcoding.kr";

function request(path, { method = "GET", headers = {}, body } = {}) {
  return new Request("https://worker.test" + path, {
    method,
    headers: { Origin: origin, ...headers },
    body,
  });
}

test("health does not disclose secret value", async () => {
  const response = await worker.fetch(request("/health"), { FIREBASE_API_KEY: "dummy-secret" });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.equal(data.firebaseApiKeyConfigured, true);
  assert.equal(JSON.stringify(data).includes("dummy-secret"), false);
});

test("health works without secret and reports unconfigured", async () => {
  const response = await worker.fetch(request("/health"), {});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).firebaseApiKeyConfigured, false);
});

test("rejects unapproved browser origins", async () => {
  const response = await worker.fetch(new Request("https://worker.test/health", {
    headers: { Origin: "https://attacker.example" },
  }), {});
  assert.equal(response.status, 403);
});

test("rejects unsupported paths", async () => {
  const response = await worker.fetch(request("/api/points2026/firestore"), {});
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, "not_implemented");
});

test("auth route fails closed when no server key is configured", async () => {
  const response = await worker.fetch(request("/api/points2026/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operation: "signInWithPassword", payload: {} }),
  }), {});
  assert.equal(response.status, 503);
});

test("auth route requires JSON", async () => {
  const response = await worker.fetch(request("/api/points2026/auth", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not json",
  }), { FIREBASE_API_KEY: "dummy-secret" });
  assert.equal(response.status, 415);
});

test("auth route rejects unallowlisted operations before upstream fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => { called = true; throw new Error("unexpected upstream call"); };
  try {
    const response = await worker.fetch(request("/api/points2026/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "deleteAccount", payload: {} }),
    }), { FIREBASE_API_KEY: "dummy-secret" });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, "operation_not_allowed");
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("auth route rejects malformed JSON", async () => {
  const response = await worker.fetch(request("/api/points2026/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }), { FIREBASE_API_KEY: "dummy-secret" });
  assert.equal(response.status, 400);
});

test("auth route forwards only allowlisted operation to fixed Google endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url: String(url), options };
    return new Response(JSON.stringify({ localId: "test-user", idToken: "test-token" }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const response = await worker.fetch(request("/api/points2026/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "signInWithPassword",
        payload: { email: "12345@auth.25withcoding.kr", password: "not-a-real-password", returnSecureToken: true },
      }),
    }), { FIREBASE_API_KEY: "dummy-secret" });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).localId, "test-user");
    assert.match(captured.url, /^https:\/\/identitytoolkit\.googleapis\.com\/v1\/accounts:signInWithPassword\?key=/);
    assert.equal(captured.options.method, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("recovery routes fail closed until mail and KV are configured", async () => {
  const response = await worker.fetch(request("/api/points2026/recovery/request-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: "20623" }),
  }), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, "recovery_service_not_configured");
});

test("reset request does not reveal whether a recovery email exists", async () => {
  const store = {
    values: new Map(),
    async get(key) { return this.values.get(key) ?? null; },
    async put(key, value) { this.values.set(key, value); },
    async delete(key) { this.values.delete(key); },
  };
  const response = await worker.fetch(request("/api/points2026/recovery/request-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: "20623" }),
  }), {
    FIREBASE_API_KEY: "dummy-key",
    FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    RESEND_API_KEY: "dummy-mail-key",
    RESEND_FROM_EMAIL: "test@example.com",
    RECOVERY_STORE: store,
  });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.ok, true);
  assert.match(data.message, /등록된 복구 이메일/);
  assert.equal(store.values.get("reset-throttle:20623"), "1");
});
