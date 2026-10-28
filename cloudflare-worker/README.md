# 25withcoding Cloudflare Worker API

This folder is a **secure starting point**, not a completed Firebase migration.

## Current behavior
- `GET /health`: non-sensitive health check.
- All other paths return `404 not_implemented` (fail closed).
- CORS allows only `https://25withcoding.kr` and `https://www.25withcoding.kr`.
- Responses are marked `Cache-Control: no-store`.
- No Firebase credentials or API keys are stored in source.

## Deploy
1. Install Node.js and Wrangler locally.
2. From this folder run `npm create cloudflare@latest` only if you need to initialize a local project; otherwise install Wrangler with `npm install --save-dev wrangler`.
3. Authenticate with `npx wrangler login`.
4. Run `npx wrangler deploy`.

## Security requirements before adding data routes
- Do not implement a generic Firestore read/write proxy.
- Every route must validate a Firebase ID token (or a replacement server-managed session).
- Authorize each action server-side; never trust a client-supplied role, student number, or admin flag.
- Validate request bodies and limit payload sizes/rates.
- Store service credentials only with Cloudflare Worker Secrets; never commit them.
- Use separate, narrowly scoped route handlers for each feature and each Firebase project.
- Keep existing frontend Firebase calls in place until their replacement route has been implemented and tested. Removing config strings before that would break existing features.
- A Firebase web API key is not a service-account secret; removing it alone does not secure Firestore. Security depends on authentication, authorization, API restrictions, and database rules.

## Migration status
Only the Worker scaffold and health endpoint exist. Login, student profiles, points, admin tools, COBY, and memorial/festival data routes have **not** been migrated. Do not switch production traffic to this Worker until each required route is implemented and tested.
