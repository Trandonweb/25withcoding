# 25withcoding-security Worker

## Production status

- Production Worker: `25withcoding-security`
- Active production version: `13`
- Active version ID: `c75ec276-15e5-455b-bb6b-422154ad92a1`
- Deployment ID: `182c4e2f-e88d-48db-8411-5eca6065cf10`
- Route: `25withcoding.kr/api/security/*`
- Verified production binding: `SECURITY_KV` → existing namespace `81bf43ec03e94d9e88f6235a029cc15e`

## Authentication design

- The Worker validates Firebase ID tokens through Firebase Authentication.
- It reads `users/{studentId}` through the Firestore REST API using the same Firebase ID token.
- Firestore Security Rules remain in force for the read.
- The Worker checks the document's `role` against the allowed administrator roles.
- The student ID must contain exactly five digits.
- No service-account private key or service-account secrets are required by this implementation.
- The Firebase Web API key is a public client configuration value already used by the website; it is not a substitute for authentication or authorization.

## Recovery and deployment

- Version 13 was uploaded and deployed on 2026-11-03.
- Version 13 contains the recovered Worker handler plus the Firebase ID-token/Firestore Rules authorization change.
- The active deployment is configured with 100% traffic to version 13.
- The Cloudflare settings and active version metadata both confirm the `SECURITY_KV` binding.
- No Worker secrets are currently configured; this is expected for the current authentication design.
- The route remains connected to the correct Worker.
- A successful authenticated admin request still needs an end-to-end test with a signed-in administrator account.

## Safety

- Never commit ID tokens, private keys, or other secret values to this repository.
- Do not change the site's sign-in/sign-out pages or Firestore rules as part of this Worker recovery.
