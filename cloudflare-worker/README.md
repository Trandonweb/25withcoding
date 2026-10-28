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
- The existing sign-in, password-change, and sign-out pages have deliberately been kept on their current Firebase SDK flow for now. Calling this Worker from sign-in alone would return REST tokens without creating the Firebase SDK session required by the rest of the site, breaking protected pages. These pages must be migrated together with the downstream auth/session consumers.
- This endpoint does not replace Firestore. Student profiles, roles, points, attendance, settings, and admin features still need dedicated routes with server-side ID-token verification and authorization.
- A Firebase Web API key is a project identifier, not a service-account credential. Moving it server-side is useful for the requested migration but does not itself secure the database. Keep restrictive Firestore rules and API restrictions in place.
- Do not add a generic Firestore read/write proxy. Do not trust client-supplied role or student identifiers.
- Production rate limiting and abuse monitoring should be configured before public rollout.

## Deploy
From this directory run `npm install`, then `npx wrangler login` and `npx wrangler deploy` after reviewing the code. Do not switch production traffic until the frontend and all required points2026 routes have been migrated and tested.

## Migration status
The Worker has a health endpoint and a restricted Firebase Auth REST proxy that reads `FIREBASE_API_KEY` from the Cloudflare environment. The existing frontend has not yet been migrated, and Firestore-backed features are not yet moved.


## Repository-wide migration audit — 2026-10-28

Three independent GitHub code-search passes were performed for the points2026 project ID, Firebase API-key/config references, Firebase initialization, and Firestore SDK usage. The repository tree was also checked on both `main` and `security/cloudflare-worker-backend`.

**Result: migration is NOT complete. Do not merge or deploy this Worker as a full points2026 replacement.**

The following files still contain direct `points2026-f5e50` Firebase configuration or SDK usage in the current `main` branch and need a feature-by-feature migration:

- `AI/js/firebase.js`
- `AI/js/settings.js` (also contains a separate COBY AI Firebase config; do not alter that config)
- `admin/js/firebase.js`
- `admin/attendance.html`
- `admin/mirroring.html`
- `admin/mirroring/client.html`
- `admin/mirroring/outsider.html`
- `admin/users.html`
- `index.html`
- `index2.html`
- `settings/index.html`
- `상벌점/index.html`
- `상벌점/main.html`
- `상벌점/admin.html`
- `상벌점/committee.html`
- `memorial_hall/2026/index.html`
- `memorial_hall/2026/coins.html` (also contains a separate festival-likes Firebase config; do not alter that project)
- `memorial_hall/2026/mini_game_code/online-sync.js`
- `security-test/index.html`

The branch currently contains the Worker scaffold and regression tests. The existing sign-in, sign-out, and password-change pages were restored to their original Firebase SDK behavior to avoid introducing a partial, incompatible auth migration. The Worker has **no Firestore endpoints**, so moving the remaining pages requires dedicated endpoints with Firebase ID-token verification and server-side authorization. Do not solve this by adding a generic Firestore proxy or by simply deleting client config: either would leave the data features unsafe or broken.

The current audit covers the complete recursive text-file tree of the repository's current branches and GitHub code-search results; it does not claim that historical commits, external deployment artifacts, cached copies, or other repositories have been cleaned.


## Worker regression tests

Run `npm test` from this directory. The Node built-in test suite checks health-secret non-disclosure, origin rejection, fail-closed behavior when the secret is absent, JSON validation, operation allowlisting, fixed upstream routing, and unsupported-route handling. These are local regression tests only; they do not prove production deployment or real Firebase account compatibility.
