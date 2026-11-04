# 25WITHCODING Security Gateway v2

This is an isolated Cloudflare Worker implementation. It is deliberately **not attached to a production route** by this change.

## Safety boundaries

- Does not edit `/signin`, `/signout`, Firebase Auth initialization, COBY, existing `users` documents, or `firestore.rules`.
- Uses the existing `SECURITY_KV` namespace with a separate `v2:` key prefix. Existing IP blocks stored as `block:<ip>` are read and enforced by the gateway.
- Does not write to Firestore. This is intentional: the checked-in rules deny access to new collections, and production rules have not been independently confirmed. Do not weaken or replace those rules.
- Firebase ID tokens are verified for session registration. Raw ID tokens are never stored.
- Device IDs are random browser identifiers in signed HttpOnly cookies, not hardware IDs or fingerprints.
- No GPS, screen dimensions, hardware identifiers, or form contents are collected.
- Detailed request events expire after 90 days in KV. Device metadata expires after 180 days of inactivity (refreshed on initial registration only in this version).
- If KV or the signing secret is missing, ordinary requests fail open to the origin to avoid taking down the site. This means enforcement is unavailable until configuration is correct.

## Bindings and secrets

Bind the existing KV namespace as `SECURITY_KV` and set `DEVICE_SIGNING_SECRET` as a Worker secret. Use a unique random secret with at least 32 bytes of entropy. Never commit it to Git.

## API

All endpoints are under `/api/security/v2`.

- `POST /device`: issues/returns a signed browser device cookie.
- `POST /session`: accepts `Authorization: Bearer <Firebase ID token>`, verifies the Firebase token, and creates a 12-hour signed session cookie.
- `DELETE /session`: revokes the current gateway session.
- `GET /admin/events?limit=100`: admin-only event listing.
- `GET /admin/blocks`: admin-only block listing.
- `POST /admin/blocks`: admin-only block creation with JSON `{ "type": "ip|device|account|session", "target": "...", "reason": "..." }`.
- `DELETE /admin/blocks`: admin-only unblock with the same fields.

Admin verification follows the existing security Worker pattern: verify the Firebase token, read the caller's own `users/{studentId}` document using that token, and allow only the existing Worker role allow-list. Firestore Rules remain authoritative.

## Important integration limitation

A Worker route `25withcoding.kr/*` will inspect ordinary page requests, but Cloudflare chooses the most-specific matching route. The existing `25withcoding.kr/api/security/*` route is more specific and will continue to send those API requests directly to the legacy Worker. Consequently, the gateway cannot claim to enforce Device ID/account/session blocks on those legacy API requests until routing is deliberately integrated (for example, by moving the legacy API behind a service binding or merging the middleware into the legacy Worker). Do not remove or overwrite the legacy route blindly.

The Firebase login flow does not currently call `POST /session`. Account/session enforcement becomes effective only after a separately reviewed client integration calls this endpoint after Firebase authentication and calls `DELETE /session` at logout. This worker does not modify the existing login/logout pages.

## Local validation

Use Wrangler's local dev mode with a non-production KV namespace and a test-only signing secret. Validate:
1. Origin passthrough for HTML, JS, CSS, images, redirects, and POST requests.
2. First HTML navigation sets the device cookie; subsequent requests reuse it.
3. Tampered/expired cookies are ignored.
4. Each block type returns 403 only for the matching target.
5. Existing legacy IP keys `block:<ip>` are honored.
6. Missing binding/secret and KV read failures do not break ordinary site delivery.
7. Admin APIs reject missing/invalid tokens and non-admin roles.
8. Event records expire after 90 days.
9. Firebase token raw strings never appear in KV or logs.

## Production rollout is intentionally separate

Before attaching any route:
- Verify the production Worker route list and origin architecture.
- Resolve the overlapping `/api/security/*` route.
- Configure a dedicated signing secret and verify the KV binding.
- Add a transparent privacy notice for users explaining the 90-day detailed access log.
- Integrate Firebase session registration without changing the auth mechanism.
- Test with a staging hostname and inspect cache behavior, especially Set-Cookie on HTML.
- Only then consider adding the global route.
