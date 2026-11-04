/**
 * Optional Firebase Auth bridge for Security Gateway v2.
 * Call installSecurityGatewayBridge(auth) after the existing Firebase app/Auth
 * instance has been initialized. This module does not initialize Firebase,
 * change persistence, or sign users in/out.
 */
import { onIdTokenChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const API = "/api/security/v2";

export function installSecurityGatewayBridge(auth) {
  if (!auth || typeof auth.currentUser === "undefined") {
    throw new TypeError("A configured Firebase Auth instance is required.");
  }

  let stopped = false;
  let inFlight = Promise.resolve();

  const unsubscribe = onIdTokenChanged(auth, user => {
    inFlight = inFlight.then(async () => {
      if (stopped) return;
      if (!user) {
        try {
          await fetch(API + "/session", {
            method: "DELETE",
            credentials: "same-origin",
            cache: "no-store"
          });
        } catch (error) {
          console.warn("[25wc-security] Session cleanup failed.", error);
        }
        return;
      }

      try {
        const deviceResponse = await fetch(API + "/device", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store"
        });
        if (!deviceResponse.ok) {
          console.warn("[25wc-security] Device registration unavailable:", deviceResponse.status);
          return;
        }

        const idToken = await user.getIdToken();
        const response = await fetch(API + "/session", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "Authorization": "Bearer " + idToken,
            "Content-Type": "application/json"
          },
          body: "{}"
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          console.warn("[25wc-security] Gateway session was not registered:", result.error || response.status);
          if (response.status === 403 && result.error === "ACCESS_BLOCKED") {
            // The gateway has set a signed session cookie so the next document request
            // can be rejected server-side; do not interfere with Firebase sign-in itself.
            location.replace("/");
          }
        }
      } catch (error) {
        // Security telemetry must never break the existing login experience.
        console.warn("[25wc-security] Session bridge unavailable.", error);
      }
    }).catch(error => console.warn("[25wc-security] Bridge task failed.", error));
  });

  return () => {
    stopped = true;
    unsubscribe();
  };
}
