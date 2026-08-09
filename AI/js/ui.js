import { $, state } from "./state.js";
import { renderCobyMarkup, plainCobyText } from "./coby-markup.js";
import { addAnswerCopyButton } from "./chat-ui.js";
import { API_URL } from "./firebase.js";

export const escapeHtml = text => String(text ?? "").replace(/[&<>\"]/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
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

export function clearMessages() { $("messages").innerHTML = ""; }

function fallbackWelcome() {
    return "오늘도 Coby와 즐거운 코딩을 시작해봐요!";
}

export async function generateWelcomeMessage() {
    if (!state.currentUserId) return fallbackWelcome();
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "새 채팅의 첫 화면에 보여줄 환영 문구를 만들어줘. 15자 이상 30자 이하 또는 그 언저리의 자연스러운 한국어 한 문장으로만 답해줘. 코드, 마크업, 따옴표, 설명은 넣지 마.",
                studentId: state.currentUserId,
                userId: state.currentUserId,
                conversationId: state.currentConversationId || null,
                welcome: true
            })
        });
        if (!response.ok) throw new Error(`API ${response.status}`);
        const result = await response.json();
        const text = String(result?.reply ?? result?.response ?? result?.message ?? result?.content ?? result?.answer ?? "").trim();
        return text || fallbackWelcome();
    } catch (error) {
        console.warn("COBY 환영 문구 생성 실패:", error);
        return fallbackWelcome();
    }
}

export async function showWelcome() {
    clearMessages();
    const e = document.createElement("div");
    e.className = "welcome";
    e.id = "welcome";
    e.innerHTML = '<h2>어서오세요!</h2><p class="welcome-generated">COBY가 환영 문구를 만드는 중...</p>';
    $("messages").appendChild(e);

    const message = await generateWelcomeMessage();
    const target = e.querySelector(".welcome-generated");
    if (target && e.isConnected) target.textContent = message;
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
