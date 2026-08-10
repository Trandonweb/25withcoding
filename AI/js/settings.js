import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { state, $ } from "./state.js";
import { openAdminLogs } from "./admin-logs.js";

const mainFirebaseConfig = {
    apiKey: "AIzaSyBgAf4JrArW8dO7OSYsTVEQtRHT049U20",
    authDomain: "points2026-f5e50.firebaseapp.com",
    projectId: "points2026-f5e50",
    storageBucket: "points2026-f5e50.firebasestorage.app",
    messagingSenderId: "248724251417",
    appId: "1:248724251417:web:02d85cdc4addac98069b88"
};

const mainDb = getFirestore(initializeApp(mainFirebaseConfig, "cobySettings"));
const TONE_KEY = "coby_settings";
const TONES = {
    friendly: "😊 친근하게",
    professional: "💼 전문적으로",
    easy: "📚 쉽게 설명",
    concise: "⚡ 간결하게",
    teacher: "🎓 선생님처럼",
    custom: "✏️ 직접 입력"
};

export function isAdminRole(role) {
    return role === "president" || role === "vice";
}

function getSavedSettings() {
    try {
        return JSON.parse(localStorage.getItem(TONE_KEY) || "{}") || {};
    } catch {
        return {};
    }
}

function saveTone(tone, customTone = "") {
    localStorage.setItem(TONE_KEY, JSON.stringify({ tone, customTone }));
    window.dispatchEvent(new CustomEvent("coby-tone-change"));
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>\'"]/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[char]));
}

function renderSettings(admin) {
    const list = $("settingsList");
    if (!list) return;

    const saved = getSavedSettings();
    const selected = saved.tone || "friendly";

    list.innerHTML = `
        <section class="settings-section">
            <div class="settings-section-title">💬 COBY 말투</div>
            <p class="settings-section-desc">COBY가 답변할 때 사용할 말투를 선택하세요.</p>
            <div class="tone-options">
                ${Object.entries(TONES).map(([value, label]) => `
                    <button type="button" class="tone-option ${selected === value ? "selected" : ""}" data-tone="${value}">
                        <span>${label}</span><span class="tone-check">✓</span>
                    </button>
                `).join("")}
            </div>
            <div class="custom-tone-wrap" id="customToneWrap" ${selected === "custom" ? "" : "hidden"}>
                <label for="customToneInput">원하는 말투를 직접 입력하세요</label>
                <textarea id="customToneInput" maxlength="300" placeholder="예: 중학생도 이해하기 쉽게, 너무 딱딱하지 않게 설명해줘.">${escapeHtml(saved.customTone || "")}</textarea>
                <button type="button" class="custom-tone-save" id="customToneSave">저장</button>
            </div>
        </section>

        ${admin ? `
            <button type="button" class="settings-admin-button" id="settingsAdminLogsButton">
                <span class="settings-admin-icon">👥</span>
                <span><strong>사용자별 대화 로그 보기</strong><small>관리자 전용 · 모든 사용자의 대화 기록</small></span>
                <b>›</b>
            </button>
        ` : ""}
    `;

    const wrap = $("customToneWrap");

    list.querySelectorAll(".tone-option").forEach(button => {
        button.addEventListener("click", () => {
            const tone = button.dataset.tone;
            const old = getSavedSettings();
            saveTone(tone, old.customTone || "");
            list.querySelectorAll(".tone-option").forEach(item => item.classList.toggle("selected", item === button));
            if (wrap) wrap.hidden = tone !== "custom";
        });
    });

    $("customToneSave")?.addEventListener("click", () => {
        const value = $("customToneInput")?.value.trim() || "";
        saveTone("custom", value);
        const button = $("customToneSave");
        if (button) {
            button.textContent = "저장됨 ✓";
            setTimeout(() => { if (button) button.textContent = "저장"; }, 1200);
        }
    });

    // 중요: 관리자 로그는 여기서 별도 구현하지 않는다.
    // admin-logs.js의 실제 관리자 로그 구현 하나만 사용한다.
    $("settingsAdminLogsButton")?.addEventListener("click", openAdminLogs);
}

async function loadSettingsAccess() {
    const userId = state.currentUserId || localStorage.getItem("userId");
    let admin = false;

    if (userId) {
        try {
            const snapshot = await getDoc(doc(mainDb, "users", userId));
            admin = snapshot.exists() && isAdminRole(snapshot.data().role);
        } catch (error) {
            console.warn("설정 권한 확인 실패", error);
        }
    }

    renderSettings(admin);
}

export function getCobyToneSettings() {
    const settings = getSavedSettings();
    const tone = settings.tone || "friendly";
    return {
        tone,
        toneLabel: TONES[tone] || TONES.friendly,
        customTone: settings.customTone || ""
    };
}

export function openSettings() {
    const modal = $("settingsModal");
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    loadSettingsAccess();
}

export function closeSettings() {
    const modal = $("settingsModal");
    if (!modal) return;

    if (modal.contains(document.activeElement)) document.activeElement.blur();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.openAdminLogs = openAdminLogs;

loadSettingsAccess();
