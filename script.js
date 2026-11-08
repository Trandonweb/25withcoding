// 25withcoding shared security telemetry.
// Records page visits and same-origin API request outcomes without collecting
// query strings, fragments, cookies, passwords, request bodies, or form contents.
(() => {
  "use strict";

  if (window.__25withcodingTelemetryInstalled) return;
  window.__25withcodingTelemetryInstalled = true;

  const nativeFetch = window.fetch.bind(window);
  const telemetryEndpoint = "/api/security/telemetry";
  const securityApiPrefix = "/api/security/";
  let auth = null;
  let authReady = Promise.resolve();

  function validPath(path) {
    return typeof path === "string" &&
      path.startsWith("/") &&
      !path.startsWith("//") &&
      path.length <= 200;
  }

  function safePath(value) {
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return "";
      return url.pathname;
    } catch {
      return "";
    }
  }

  authReady = (async () => {
    try {
      const [{ app }, firebaseAuth] = await Promise.all([
        import("/admin/js/firebase.js"),
        import("https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js")
      ]);
      auth = firebaseAuth.getAuth(app);
      await new Promise(resolve => {
        let unsubscribe = () => {};
        unsubscribe = firebaseAuth.onAuthStateChanged(auth, () => {
          unsubscribe();
          resolve();
        }, () => resolve());
      });
    } catch (error) {
      // Telemetry remains available as anonymous if Firebase is unavailable.
      console.warn("[SECURITY TELEMETRY] Firebase session unavailable", error);
    }
  })();

  async function sendTelemetry(payload) {
    try {
      await authReady;
      const headers = { "Content-Type": "application/json" };
      const user = auth?.currentUser || null;
      if (user) {
        try { headers.Authorization = "Bearer " + await user.getIdToken(); }
        catch {}
      }
      await nativeFetch(telemetryEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "same-origin",
        keepalive: true,
        cache: "no-store"
      });
    } catch {
      // Monitoring must never interrupt normal site functionality.
    }
  }

  // Initial document navigation.
  const navigation = performance.getEntriesByType("navigation")[0];
  const initialPath = location.pathname || "/";
  if (validPath(initialPath)) {
    sendTelemetry({
      kind: "page_visit",
      path: initialPath,
      method: "GET",
      statusCode: Number.isInteger(navigation?.responseStatus) &&
        navigation.responseStatus >= 100 && navigation.responseStatus <= 599
        ? navigation.responseStatus
        : null
    });
  }

  // Same-origin API requests made through fetch().
  window.fetch = async function(input, init) {
    const requestUrl = input instanceof Request ? input.url : String(input);
    const path = safePath(requestUrl);
    const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const response = await nativeFetch(input, init);

    if (
      path.startsWith("/api/") &&
      !path.startsWith(securityApiPrefix) &&
      path !== telemetryEndpoint
    ) {
      sendTelemetry({
        kind: "api_request",
        path,
        method,
        statusCode: response.status
      });
    }
    return response;
  };

  // Same-origin API requests made through XMLHttpRequest.
  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this.__25wcTelemetry = {
      method: String(method || "GET").toUpperCase(),
      path: safePath(url)
    };
    return xhrOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function(...args) {
    const meta = this.__25wcTelemetry;
    if (
      meta?.path?.startsWith("/api/") &&
      !meta.path.startsWith(securityApiPrefix) &&
      meta.path !== telemetryEndpoint
    ) {
      this.addEventListener("loadend", () => {
        sendTelemetry({
          kind: "api_request",
          path: meta.path,
          method: meta.method,
          statusCode: Number.isInteger(this.status) && this.status >= 100 ? this.status : null
        });
      }, { once: true });
    }
    return xhrSend.apply(this, args);
  };
})();
