import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workerSource = await readFile(
  new URL("../cloudflare/25withcoding-security-gateway-v2/worker.js", import.meta.url),
  "utf8"
);
const workerModuleUrl = "data:text/javascript;base64," + Buffer.from(workerSource).toString("base64");
const { default: gateway } = await import(workerModuleUrl);

function createEnv(blockedIps = []) {
  const blocked = new Set(blockedIps.map(ip => "block:" + ip));
  const records = new Map();
  return {
    env: {
      DEVICE_SIGNING_SECRET: "unit-test-secret-that-is-long-enough-32-bytes",
      SECURITY_KV: {
        async get(key) { return blocked.has(key) ? "blocked" : (records.get(key) ?? null); },
        async put(key, value) { records.set(key, value); },
        async delete(key) { records.delete(key); },
        async list() { return { keys: [] }; }
      }
    },
    records
  };
}

async function request(path, ip, env) {
  const pending = [];
  const response = await gateway.fetch(
    new Request("https://25withcoding.kr" + path, {
      method: "GET",
      headers: { "CF-Connecting-IP": ip, "Accept": "text/html,application/json" }
    }),
    env,
    { waitUntil(promise) { pending.push(promise); } }
  );
  await Promise.all(pending);
  return response;
}

test("blocks an IP on ordinary site pages", async () => {
  const { env } = createEnv(["203.0.113.10"]);
  const response = await request("/", "203.0.113.10", env);
  assert.equal(response.status, 403);
  assert.match(await response.text(), /접근이 제한되었습니다/);
});

test("blocks the same IP on the v2 security API", async () => {
  const { env } = createEnv(["203.0.113.10"]);
  const response = await request("/api/security/v2/status", "203.0.113.10", env);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, "ACCESS_BLOCKED");
});

test("does not block a different IP with a similar prefix", async () => {
  const { env } = createEnv(["203.0.113.10"]);
  const response = await request("/api/security/v2/status", "203.0.113.101", env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).active, true);
});

test("blocks an exact IPv6 address", async () => {
  const { env } = createEnv(["2001:db8::1234"]);
  const response = await request("/api/security/v2/status", "2001:db8::1234", env);
  assert.equal(response.status, 403);
});
