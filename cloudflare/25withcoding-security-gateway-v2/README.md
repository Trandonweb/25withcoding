# 25WITHCODING Security Gateway v2

This is an isolated Cloudflare Worker implementation. It is not attached to a production route by this change.

## Safety boundaries

- Does not edit /signin, /signout, Firebase Auth initialization, COBY, existing users documents, or firestore.rules.
- Uses the existing SECURITY_KV namespace with separate v2: key prefixes. Existing IP blocks stored as block:<ip> are read and enforced by the gateway.
- Does not write to Firestore. The checked-in rules deny access to new collections, and production rules have not been independently confirmed. Do not weaken or replace those rules.
- Firebase ID tokens are verified for session registration. Raw ID tokens are never stored.
- Device IDs are random browser identifiers in signed HttpOnly cookies, not hardware IDs or fingerprints.
- No GPS, screen dimensions, hardware identifiers, or form contents are collected.
- Detailed request events expire after 90 days. Device metadata expires after 180 days of inactivity. Gateway sessions expire after one hour.
- If KV or the signing secret is missing, ordinary requests fail open to the origin to avoid taking down the school site. This means enforcement is unavailable until configuration is correct.

## Bindings and secrets

- Bind the existing KV namespace as SECURITY_KV.
- Bind the existing Worker 25withcoding-security as service LEGACY_SECURITY.
- Set DEVICE_SIGNING_SECRET as a Worker secret with at least 32 bytes of random entropy. Never commit it to Git.
- Optional staging override: set ALLOWED_ORIGIN to the staging origin. The default is https://25withcoding.kr.

## API

All endpoints are under /api/security/v2.

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

client-bridge.js is an opt-in adapter. It accepts the existing initialized Firebase Auth instance and listens for ID-token changes. It does not initialize Firebase or modify sign-in persistence.

After confirming the exact shared Firebase module used by normal site pages (excluding COBY), a page may import installSecurityGatewayBridge from this module and call installSecurityGatewayBridge(getAuth(app)).

Do not paste this into COBY or /signin without checking their Firebase app initialization and regression tests. The bridge must be integrated into ordinary pages to connect Firebase accounts to devices. Until then, IP and device checks can work, but account/session association is not active.

## Routing and legacy API preservation

Cloudflare selects the most-specific matching route. The existing 25withcoding.kr/api/security/* route is more specific than 25withcoding.kr/*. For full coverage, both routes must point to this gateway, and this gateway must have the LEGACY_SECURITY service binding.

Requests under the old /api/security/* path (except /api/security/v2/*) are forwarded to the existing Worker through the service binding. This preserves the old API implementation while applying the new checks first. Do not delete the old Worker or its KV keys.

## Enforcement details

- IP blocks use the existing block:<ip> KV keys.
- Device/account/session blocks use v2:block:<type>:<target> keys.
- Signed cookies are Secure, HttpOnly, SameSite=Lax and Path=/.
- Gateway sessions last one hour and are bound to the signed device cookie. The KV session record is checked on every request, so deleting it revokes the cookie after KV propagation.
- KV is eventually consistent. Do not promise instantaneous global revocation.
- On KV lookup failure, the gateway fails open to preserve availability. Monitoring is required because enforcement may be bypassed during an outage.
- IP geolocation and ASN/organization metadata are approximate and cannot identify a person.

## Production rollout is separate

Before attaching production routes:
1. Deploy the Worker to a staging hostname and confirm the LEGACY_SECURITY service binding.
2. Test origin passthrough for HTML, JS, CSS, images, redirects, uploads and POST requests.
3. Test the legacy /visit, /events, /blocks and review APIs end to end.
4. Integrate the Firebase bridge into normal pages only, after identifying their shared Firebase module. Do not modify COBY or /signin as part of that step.
5. Add a visible privacy notice explaining the detailed 90-day access log and its purpose.
6. Verify the exact production route list, including www if used, before changing any route.

Current status: this branch contains code and configuration only. It does not change the live Worker, Cloudflare routes, DNS, secrets, or Firestore rules.