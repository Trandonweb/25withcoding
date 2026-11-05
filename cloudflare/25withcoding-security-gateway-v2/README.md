# 25WITHCODING Security Gateway v2

This is an isolated Cloudflare Worker implementation. The default Wrangler target is a staging Worker with a dedicated KV namespace containing only synthetic smoke-test records. It is not attached to any production route by this change.

## Safety boundaries

- Does not edit /signin, /signout, password_change, COBY pages, Firebase Auth initialization, existing users documents, or firestore.rules.
- Default staging deployment uses its own KV namespace. The explicit production environment uses the existing SECURITY_KV namespace and must be selected deliberately.
- New records use v2: prefixes. Existing IP blocks stored as block:<ip> are read and enforced by the gateway.
- Does not write to Firestore. The checked-in rules deny access to new collections, and production rules have not been independently confirmed. Do not weaken or replace those rules.
- Firebase ID tokens are verified for session registration. Raw ID tokens are never stored.
- Device IDs are random browser identifiers in signed HttpOnly cookies, not hardware IDs or fingerprints.
- No GPS, screen dimensions, hardware identifiers, form contents, passwords, or raw Firebase ID tokens are collected.
- Detailed request events expire after 90 days. Device metadata expires after 180 days of inactivity. Gateway sessions expire after one hour.
- If KV or the signing secret is missing, ordinary requests fail open to the origin to avoid taking down the school site. This means enforcement is unavailable until configuration is correct.

## Bindings and secrets

- Default staging KV namespace: 3d2a25573f2c462f8aca91c675d8c224.
- Production KV namespace: 81bf43ec03e94d9e88f6235a029cc15e (only under Wrangler env production).
- Both environments bind the existing Worker 25withcoding-security as LEGACY_SECURITY.
- Set DEVICE_SIGNING_SECRET separately as a Worker secret with at least 32 characters of random entropy. Never commit it to Git.
- Staging ALLOWED_ORIGIN is the workers.dev staging origin. STAGING_ORIGIN is set only for staging and rewrites read-only GET/HEAD requests to https://25withcoding.kr so HTML and static assets can be smoke-tested without a production route. Query strings are stripped in this staging-only path.
- The production Wrangler environment sets ALLOWED_ORIGIN to https://25withcoding.kr and does not define STAGING_ORIGIN.

## API

All endpoints are under /api/security/v2.

- GET /status: reports whether the gateway is active and the 90-day event retention period.
- POST /device: issues or returns a signed browser device cookie.
- POST /session: accepts Authorization: Bearer <Firebase ID token>, verifies the Firebase token, and creates or renews a one-hour signed session cookie.
- DELETE /session: revokes the current gateway session.
- GET /admin/events?limit=100: admin-only event listing.
- GET /admin/devices: admin-only device inventory.
- GET /admin/sessions: admin-only session inventory.
- GET /admin/blocks: admin-only block listing, including legacy IP blocks.
- POST /admin/blocks: admin-only block creation with JSON { type, target, reason }.
- DELETE /admin/blocks: admin-only unblock with JSON { type, target, reason }.

Admin verification follows the existing security Worker pattern: verify the Firebase token, read the caller's own users/{studentId} document using that token, and allow only the existing Worker role allow-list. Firestore Rules remain authoritative.

## Firebase client bridge

client-bridge.js is an opt-in adapter. client-loader.js connects it to the existing default Firebase app module. script.js loads this adapter only on regular pages and excludes /signin, /signout, /password_change, /AI, /COBY, and /memo so those existing auth flows, COBY, and the separate memo Firebase SDK are not changed.

The loader first checks /api/security/v2/status. Until the gateway route is active, it exits without changing page behavior. When active, it registers the browser device and listens for Firebase ID-token changes to establish the signed gateway session.

## Routing and legacy API preservation

Cloudflare selects the most-specific matching route. For full coverage, both 25withcoding.kr/* and 25withcoding.kr/api/security/* must point to this gateway, and the gateway must have the LEGACY_SECURITY service binding.

Requests under the old /api/security/* path (except /api/security/v2/*) are forwarded to the existing Worker through the service binding. This preserves the old API implementation while applying the new checks first. Do not delete the old Worker or its KV keys.

## Enforcement details

- IP blocks use the existing block:<ip> KV keys. The current production KV namespace was inspected without exposing the stored address: one legacy IP block exists, and its value is a JSON object containing ip, reason, blockedBy, blockedAt, and permanent. The v2 admin listing and enforcement path are compatible with this existing record shape.
- Device/account/session blocks use v2:block:<type>:<target> keys.
- Signed cookies are Secure, HttpOnly, SameSite=Lax and Path=/.
- Gateway sessions last one hour and are bound to the signed device cookie. The KV session record is checked on every request, so deleting it revokes the cookie after KV propagation.
- KV is eventually consistent. Do not promise instantaneous global revocation.
- The admin API rejects an IP-block request when the target matches the administrator's current request IP, reducing accidental self-lockout.
- On KV lookup failure, the gateway fails open to preserve availability. Monitoring is required because enforcement may be bypassed during an outage.
- IP geolocation and ASN/organization metadata are approximate and cannot identify a person.
- The event index stores the newest records first for the admin view. The dashboard currently displays up to 500 recent events.

## Production rollout is separate

Before attaching production routes:
1. Deploy and test the default staging Worker using its isolated KV namespace.
2. Confirm the LEGACY_SECURITY service binding and test the legacy /visit, /events, /blocks and review APIs.
3. Test origin passthrough for HTML, JS and image assets in staging (basic GET/HEAD path is covered); separately test CSS, redirects, uploads and POST requests before production.
4. Verify the Firebase bridge on ordinary pages only. Do not modify COBY, /signin, /signout, password_change, or memo.
5. Add and verify the visible privacy notice explaining the detailed 90-day access log. The prepared notice is at /privacy/security/.
6. Confirm that the published privacy notice accurately describes every active collection field, purpose, recipient, and retention period before enabling production collection.
7. Verify the exact production route list, including www if used, before changing any route.

Current status (2026-11-05): the staging Worker is deployed at https://25withcoding-security-gateway-v2-staging.trandonwebtoon.workers.dev with the dedicated staging KV namespace and a Cloudflare-managed DEVICE_SIGNING_SECRET. GitHub Actions run #54 passed on commit 6b33399dd903b9efc4061c17e56e4db18dc40277. It includes JavaScript/admin/TOML syntax checks, automated IP-block regression tests for page and API enforcement, exact-address matching and IPv6, plus live staging smoke tests for homepage HTML, shared JavaScript and PNG asset passthrough, persistent device-cookie reuse, 90-day status, unauthenticated session rejection, CORS preflight, 401 responses from all admin read endpoints, and a safe OPTIONS request forwarded through the legacy Worker service binding. A subsequent small change adds a guard against an administrator blocking the IP used by their own current request; that follow-up commit is awaiting its own CI confirmation. The Worker is not attached to any production route. No production route, DNS setting, existing Worker, or Firestore rule has been changed. Production deployment and end-to-end origin/service-binding regression tests remain pending.
