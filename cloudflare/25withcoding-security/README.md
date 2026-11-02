# 25withcoding-security Worker

This directory contains a recovery candidate based on Cloudflare Worker version `b7005792-d6de-477d-9a97-c88694a69ad8` (version 8), recovered on 2026-11-02.

## Current recovery design

- `worker.js` validates the Firebase ID token through Firebase Authentication.
- It then reads only the signed-in student's `users/{studentId}` document through the Firestore REST API using that same Firebase ID token.
- Firestore Security Rules remain in force for this read. The current rules allow authenticated five-digit student accounts to read user documents.
- The Worker checks the document's `role` against the allowed administrator roles.
- A service-account private key is no longer required. Do not add service-account credentials to this repository.
- The Firebase Web API key is a public client configuration value already used by the website; it is not a substitute for authentication or authorization.
- The production Worker requires the `SECURITY_KV` KV binding, mapped to the existing namespace ID `81bf43ec03e94d9e88f6235a029cc15e`.

## Deployment safety

- Cloudflare production version 11 was observed with an empty bindings list and no listed Worker secrets.
- The production route remains `25withcoding.kr/api/security/*`.
- The recovered source is a candidate, not proof of the current production source. The active production code could not be retrieved through the connector.
- Do not deploy until the current production source has been reconciled, the `SECURITY_KV` binding is configured, and the authenticated read path has been tested.
- Never commit private keys, ID tokens, or other secret values to this repository.

## Recovery

The source backup was recovered from Cloudflare Worker version 8. Production was not changed as part of the source refactor.
