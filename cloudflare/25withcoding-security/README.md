# 25withcoding-security Worker

## Production status

- Production Worker: `25withcoding-security`
- Active production version: `24` (restored 2026-11-21)
- Active version ID: `22886c93-f51a-4741-a476-35c1d27fe6ac`
- Current deployment ID: `f7864051-cf8c-4db6-8992-cdfe2eac0003`
- Route: `25withcoding.kr/api/security/*`
- Verified production binding: `SECURITY_KV` → existing namespace `81bf43ec03e94d9e88f6235a029cc15e`
- Verified v24 handler: `fetch`
- Last known broken uploads: v34 and v35 (no fetch handler and no bindings); do not deploy these versions.

## Authentication design

- The Worker validates Firebase ID tokens through Firebase Authentication.
- It reads `users/{studentId}` through the Firestore REST API using the same Firebase ID token.
- Firestore Security Rules remain in force for the read.
- The Worker checks the document's `role` against the allowed administrator roles.
- The student ID must contain exactly five digits.
- No service-account private key or service-account secrets are required by this implementation.
- The Firebase Web API key is a public client configuration value already used by the website; it is not a substitute for authentication or authorization.

## Deployment guard

- The only approved Wrangler config is `cloudflare/25withcoding-security/wrangler.toml`.
- It explicitly pins the production Worker name, compatibility date, and existing `SECURITY_KV` namespace ID.
- From the repository root, use only:
  `npx wrangler deploy --config cloudflare/25withcoding-security/wrangler.toml`
- Never deploy this Worker using a generic/root Wrangler config, a different Worker name, or an ad-hoc dashboard/quick-editor upload.
- Before any production deployment, inspect the uploaded version metadata and confirm it has a `fetch` handler and `SECURITY_KV` binding. If either is missing, do not deploy it.
- After deployment, confirm the deployment routes 100% traffic to the intended version and verify the security API.
- Do not modify unrelated Workers, routes, Firebase projects, or Firestore rules during this Worker deployment.

## Recovery history

- Version 24 was confirmed to contain the `fetch` handler and the existing `SECURITY_KV` binding.
- On 2026-11-21, version 24 was redeployed to 100% traffic after versions 34 and 35 (both missing handler and bindings) replaced the working version.
- The current deployment uses the existing KV namespace; no KV data was recreated or reset.
- A successful authenticated admin request still needs an end-to-end test with a signed-in administrator account.

## Safety

- Never commit ID tokens, private keys, or other secret values to this repository.
- Do not change the site's sign-in/sign-out pages or Firestore rules as part of this Worker recovery.
