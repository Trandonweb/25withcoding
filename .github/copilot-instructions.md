# 25withcoding — Copilot / AI coding instructions

These instructions apply to all files in this repository.

## Mandatory repository and branch rule

- **All ordinary code changes must be made directly in `Trandonweb/25withcoding` on the `main` branch.** Never edit in, switch to, create, or target `COBY Preview Artifact`, any COBY preview artifact/workspace, a preview repository, or another branch.
- Treat the latest file contents on `main` as the source of truth. Fetch before editing and commit the targeted change to `main`.
- If the tool opens a preview/artifact context by default, do not edit there; return to the canonical repository and `main`.

## Production homepage and COBY are separate

- **Never configure `.github/workflows/coby-preview.yml` to call `actions/deploy-pages` or upload `./AI` as the GitHub Pages deployment artifact.** That replaces the entire `25withcoding.kr` site with the COBY subdirectory. COBY preview must use `actions/upload-artifact` only.
- The production Pages deployment must publish the repository site root, not `./AI`.


- The production homepage is `index.html` at `https://25withcoding.kr/`.
- **Do not redirect the root homepage to `/AI/` or any COBY alias.** COBY/AI must remain a separate page that users open intentionally from a link.
- Do not add an unconditional meta refresh, redirect script, iframe takeover, or global navigation handler that makes the homepage render COBY.
- Before and after homepage changes, verify the root `index.html` is still the intended club homepage.

## Service worker and cache safety

- Never cache HTML documents or navigation responses in a service worker. In particular, do not return cached HTML for `request.mode === "navigate"`.
- Navigation requests must be fetched from the network; offline failure should show an explicit error rather than serving a potentially stale page from another route.
- Inspect `sw.js` and every service-worker registration before changing cache behavior. Version asset caches when needed.
- Do not clear or modify authentication state, localStorage, sessionStorage, IndexedDB, or Firebase data as a workaround for a display/cache bug. Only service-worker registrations and Cache Storage may be considered for legacy cache cleanup.

## Required validation

- Search the repository for `/AI/`, `location.replace`, `http-equiv="refresh"`, `serviceWorker.register`, `caches.open`, and navigation fetch handlers when diagnosing routing or stale-page problems.
- Check `index.html`, `sw.js`, `CNAME`, and `.github/workflows/` before changing deployment behavior.
- Preserve existing site features and custom-domain configuration. Do not change DNS, `CNAME`, or Pages workflow settings unless explicitly requested.
- Review the diff, validate syntax and links where feasible, and clearly distinguish code checks from a live-site test. A successful commit/build alone does not prove the custom domain serves the right page.
- Work in this repository; do not substitute a preview repository or the COBY project.
