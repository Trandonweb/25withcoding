# 25withcoding-security Worker

This directory contains a source backup recovered from Cloudflare version `b7005792-d6de-477d-9a97-c88694a69ad8` (version 8) on 2026-11-02.

## Important

- `worker.js` is a recovered backup, not a deployment instruction.
- Do not deploy it until the required Worker bindings and secrets have been configured and verified.
- The recovered active version metadata showed only the `SECURITY_KV` binding.
- The source also expects `FIREBASE_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY`.
- Never commit service-account private keys or other secret values to this repository.

## Recovery

The source was recovered through the Cloudflare Worker Version API using the `include=modules` option. The original active production deployment was left unchanged during recovery.
