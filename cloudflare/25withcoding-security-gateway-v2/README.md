# 25WITHCODING Security Gateway v2

This directory contains the source for the staged Cloudflare Worker gateway.

## Current status

- Staging Worker: `25withcoding-security-gateway-v2-staging`
- Staging KV: `25withcoding-security-gateway-v2-staging`
- Production legacy Worker: `25withcoding-security`
- Production KV: `25withcoding-security`
- Production legacy route remains `25withcoding.kr/api/security/*`
- No site-wide production route has been added by this change.

## IP blocking behavior

The gateway reads the existing production-compatible KV key format:

```text
block:<IP>
```

This keeps existing manually created IP blocks compatible. A matching IP is denied with HTTP 403 before the request is forwarded to the site origin. The same check runs for page requests and API requests that reach the gateway.

Blocking is manual only. There is no automatic IP blocking.

The gateway records request metadata in `v2:event:<key>` records with a 90-day TTL. Existing Cloudflare WAF and rate-limit rules are independent and must remain enabled.

## Staging bindings

The staging Worker currently uses:

- `SECURITY_KV`: staging KV namespace
- `DEVICE_SIGNING_SECRET`: staging-only secret
- `LEGACY_SECURITY`: service binding to `25withcoding-security`
- `STAGING_ORIGIN`: read-only origin mapping to `https://25withcoding.kr`
- `ALLOWED_ORIGIN`: staging workers.dev origin

Do not copy the staging secret or staging KV namespace into production.

## Production rollout requirements

Before attaching production routes, configure the production Worker with:

- `SECURITY_KV`: existing production namespace `25withcoding-security`
- `LEGACY_SECURITY`: service binding to `25withcoding-security`
- `ALLOWED_ORIGIN`: `https://25withcoding.kr`
- `DEVICE_SIGNING_SECRET`: a newly generated production-only secret (at least 32 characters)
- No `STAGING_ORIGIN` binding

After staging tests pass, route planning is:

1. `25withcoding.kr/*` → gateway (site-wide enforcement and pass-through)
2. `25withcoding.kr/api/security/v2/*` → gateway (v2 management API)
3. Keep `25withcoding.kr/api/security/*` → legacy Worker for existing endpoints; the more-specific v2 route must take precedence.

Do not change or remove existing WAF rulesets, managed rules, or sign-in rate limits as part of this rollout.

## Admin API

All admin endpoints require a Firebase ID token in the `Authorization: Bearer <token>` header and a Firestore user role of `admin`, `president`, `vice`, or `committee_chair`.

- `GET /api/security/v2/admin/blocks`
- `POST /api/security/v2/admin/blocks` with `{ "type": "ip", "target": "<IP>", "reason": "<reason>" }`
- `DELETE /api/security/v2/admin/blocks` with `{ "type": "ip", "target": "<IP>", "reason": "<reason>" }`
- `GET /api/security/v2/admin/events?limit=100`

The Worker prevents an administrator from blocking the IP address used by the current admin request. Unblock operations require a reason and are recorded in the audit log.

The admin dashboard UI is a separate integration task; this directory contains the gateway backend only.
