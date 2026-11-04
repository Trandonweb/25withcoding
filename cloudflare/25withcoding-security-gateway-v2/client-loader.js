import { app } from "/admin/js/firebase.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { installSecurityGatewayBridge } from "./client-bridge.js";

const API = "/api/security/v2";

async function start() {
  try {
    const response = await fetch(API + "/status", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store"
    });
    if (!response.ok) return;
    const status = await response.json();
    if (!status.active) return;

    if (!sessionStorage.getItem("25wc-security-notice-dismissed")) {
      const notice = document.createElement("aside");
      notice.setAttribute("role", "status");
      notice.style.cssText = "position:fixed;z-index:99999;left:12px;right:12px;bottom:12px;max-width:900px;margin:auto;padding:12px 14px;border:1px solid #b8d8c7;border-radius:12px;background:#f3fff8;color:#183b2a;box-shadow:0 8px 28px #0002;font:14px/1.45 system-ui;display:flex;gap:12px;align-items:center;justify-content:space-between";
      notice.innerHTML = '<span>사이트 보호를 위해 접속 IP·기기 환경 및 로그인 연결 정보가 수집되며, 상세 접속 기록은 90일간 보관됩니다. <a href="/privacy/security/" style="color:#087844;font-weight:700">수집 항목과 목적</a></span><button type="button" aria-label="안내 닫기" style="border:0;background:transparent;color:#183b2a;font-size:20px;cursor:pointer">×</button>';
      notice.querySelector("button").addEventListener("click", () => {
        sessionStorage.setItem("25wc-security-notice-dismissed", "1");
        notice.remove();
      });
      document.body.appendChild(notice);
    }

    installSecurityGatewayBridge(getAuth(app));
  } catch (error) {
    // Optional security integration must not interrupt the site.
    console.warn("[25wc-security] Optional gateway bridge unavailable.", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start, { once: true });
} else {
  start();
}
