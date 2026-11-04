// 25withcoding shared page-visit tracker
// Sends only the current pathname. No query string, fragment, cookies,
// account identifiers, form data, or User-Agent are transmitted.
// Visitor IP is obtained server-side from Cloudflare's CF-Connecting-IP header.
// Retention is controlled by the Worker (currently 90 days).

(() => {
  "use strict";

  if (window.__25withcodingVisitTracked) return;
  window.__25withcodingVisitTracked = true;

  const pagePath = window.location.pathname || "/";

  // Do not track browser-local special schemes or malformed paths.
  if (
    !pagePath.startsWith("/") ||
    pagePath.startsWith("//") ||
    pagePath.length > 200
  ) {
    return;
  }

  const payload = JSON.stringify({ path: pagePath });

  fetch("/api/security/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "same-origin",
    keepalive: true,
    cache: "no-store"
  }).catch(() => {
    // Tracking must never interfere with the page itself.
  });

  // Optional account/device bridge. Auth entry/exit, password-change, and COBY
  // pages are intentionally excluded so their existing authentication logic stays untouched.
  const currentPath = window.location.pathname.toLowerCase();
  const excluded = [
    "/signin", "/signout", "/password_change", "/ai", "/coby"
  ].some(path => currentPath === path || currentPath.startsWith(path + "/"));
  if (!excluded && !window.__25withcodingSecurityBridgeRequested) {
    window.__25withcodingSecurityBridgeRequested = true;
    import("/cloudflare/25withcoding-security-gateway-v2/client-loader.js").catch(() => {
      // Gateway integration is optional until its route is enabled.
    });
  }
})();
