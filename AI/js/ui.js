import { $, state } from "./state.js";
import { renderCobyMarkup, plainCobyText } from "./coby-markup.js";
import { addAnswerCopyButton } from "./chat-ui.js";

export const escapeHtml = text => String(text ?? "").replace(/[&<>\\"]/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\\": "\\\\",
    "\"": "&quot;"
}[ch]));

export function setStatus(text, connected = false) {
    $("statusText").textContent = text;
    $("statusDot").classList.toggle("connected", connected);
}

export function updateProfile() {
    const name = state.currentPerson?.name || state.currentUserId || "사용자";
    $("profileName").textContent = name;
    $("profileId").textContent = state.currentUserId ? `학번 ${state.currentUserId}` : "-";
    $("profileCircle").textContent = name.charAt(0);
}

export function formatDate(timestamp) {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function clearMessages() {
    $("messages").innerHTML = "";
}

export function showWelcome() {
    clearMessages();
    const e = document.createElement("div");
    e.className = "welcome";
    e.id = "welcome";
    e.innerHTML = '<h2>어서오세요!</h2><p>무한한 상상의 나래를 펼쳐요 🚀<br>Coby가 당신의 코딩 여정을 함께합니다.</p>';
    $("messages").appendChild(e);
}

export function addMessage(role, content) {
    const element = document.createElement("div");
    const isUser = role === "user";
    element.className = `message ${isUser ? "user" : "ai"}`;

    if (isUser) {
        element.innerHTML = `<div class="message-label">YOU</div><div class="message-content">${escapeHtml(content)}</div>`;
    } else {
        element.innerHTML = `<div class="message-label">COBY</div><div class="message-content">${renderCobyMarkup(content)}</div>`;
        addAnswerCopyButton(element, content, plainCobyText(content));
    }

    $("messages").appendChild(element);
    requestAnimationFrame(() => { $("messages").scrollTop = $("messages").scrollHeight; });
}

export function openMenu() {
    $("sidebar").classList.add("open");
    $("overlay").classList.add("show");
}

export function closeMenu() {
    $("sidebar").classList.remove("open");
    $("overlay").classList.remove("show");
}
