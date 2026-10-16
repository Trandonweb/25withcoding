# AI Coding Instructions — 25withcoding

Before changing code, read this file and `.github/copilot-instructions.md` (if present). This is the main production website repository for https://25withcoding.kr/.

## Critical production-site protection

- **Never make the root homepage (`/`, `index.html`) display, redirect to, or be replaced by COBY/AI.** COBY is a separate feature linked from the homepage; it is not the homepage.
- Do not add redirects, meta refreshes, iframe replacements, or unconditional `location.replace()` / `location.href` rules that route `/` to `/AI/`, `/coby/`, `/COBY/`, or similar.
- Treat `index.html` as the canonical public homepage. Before changing it, inspect the full file and preserve its existing homepage UI and links.
- Do not cache HTML documents or navigation responses in a service worker. Navigation must go to the network; cached HTML can cause the root domain to show an obsolete page across devices.
- Before modifying `sw.js`, inspect all service-worker registration code and cache logic. Use a new cache version when changing asset caches; do not use a cache-first strategy for HTML/navigation.
- Do not introduce global scripts that replace the homepage with content from another route.
- Avoid broad cleanup that deletes user data, localStorage, sessionStorage, IndexedDB, Firebase documents, or authentication state. Cache cleanup may only target browser Cache Storage and service-worker registrations.
- Preserve the existing custom domain and GitHub Pages configuration. Do not change `CNAME`, DNS-related files, workflow deployment targets, or repository Pages settings unless the task explicitly requires it.

## Required checks before finishing a change

1. Search for root redirects, meta refreshes, `location.replace`, `window.location`, service-worker registration, `caches.open`, and navigation fetch handlers.
2. Confirm `index.html` remains the intended homepage and contains no unconditional redirect to COBY/AI.
3. Confirm `sw.js` does not serve cached HTML for navigation requests.
4. Check the changed HTML/JS for syntax errors and verify links/assets referenced by the change.
5. Review the diff and deployment workflow. Report what was actually tested; do not claim the live site is fixed solely because a commit or Pages build succeeded.
6. Keep all changes in this repository unless the user explicitly asks otherwise.

## Project conventions

- Make minimal, targeted changes; do not overwrite files with partial examples.
- Keep user-facing site text in Korean unless the feature requires another language.
- Never remove existing functionality without explaining why and obtaining approval when appropriate.
