# 25withcoding Cloudflare Worker API — points2026 only

This Worker is scoped to the `points2026-f5e50` project. It does not migrate the separate COBY AI, festival-likes, or festival-admin Firebase projects.

## Current endpoints
- `GET /health`: non-sensitive health check. Reports whether `FIREBASE_API_KEY` is configured, never its value.
- `POST /api/points2026/auth`: forwards a fixed allowlist of Firebase Authentication REST operations to Google Identity Toolkit. The browser sends `{ "operation": "...", "payload": { ... } }`; it cannot select an upstream URL or project.
- All other paths return `404 not_implemented`. No generic Firestore proxy exists.

Allowed auth operations: `signInWithPassword`, `signUp`, `sendOobCode`, `resetPassword`, `verifyPasswordResetCode`, `confirmPasswordReset`, `getAccountInfo`.

## Cloudflare secret
Set the Worker secret named `FIREBASE_API_KEY` in the Cloudflare dashboard (Workers & Pages → your Worker → Settings → Variables and Secrets) or with Wrangler:

```sh
npx wrangler secret put FIREBASE_API_KEY
```

Enter the existing `points2026-f5e50` Firebase Web API key in the secure prompt. Do not put the key in this repository or paste it into chat.

## Important limitations
- The auth endpoint is not yet connected to the existing sign-in page; the frontend must be changed to call it before the browser stops using its embedded Firebase config.
- This endpoint does not replace Firestore. Student profiles, roles, points, attendance, settings, and admin features still need dedicated routes with server-side ID-token verification and authorization.
- A Firebase Web API key is a project identifier, not a service-account credential. Moving it server-side is useful for the requested migration but does not itself secure the database. Keep restrictive Firestore rules and API restrictions in place.
- Do not add a generic Firestore read/write proxy. Do not trust client-supplied role or student identifiers.
- Production rate limiting and abuse monitoring should be configured before public rollout.

## Deploy
From this directory run `npm install`, then `npx wrangler login` and `npx wrangler deploy` after reviewing the code. Do not switch production traffic until the frontend and all required points2026 routes have been migrated and tested.

## Migration status
The Worker has a health endpoint and a restricted Firebase Auth REST proxy that reads `FIREBASE_API_KEY` from the Cloudflare environment. The existing frontend has not yet been migrated, and Firestore-backed features are not yet moved.
