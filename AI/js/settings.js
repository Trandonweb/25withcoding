import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const mainFirebaseConfig = {
    apiKey: "AIzaSyBgAf4JrArbW8dO7OSYsTVEQtRHT049U20",
    authDomain: "points2026-f5e50.firebaseapp.com",
    projectId: "points2026-f5e50",
    storageBucket: "points2026-f5e50.firebasestorage.app",
    messagingSenderId: "248724251417",
    appId: "1:248724251417:web:02d85cdc4addac98069b88"
};

const db = getFirestore(initializeApp(mainFirebaseConfig, "cobySettings"));
const SETTINGS_KEY = "coding_with_ramen_settings";
const DEFAULT_COLOR = "#27ae60";
const COLORS = ["#27ae60", "#3498db", "#9b59b6", "#e67e22", "#e74c3c", "#1abc9c"];

export function isAdminRole(role) {
    return role === "president" || role === "vice";
}

function readSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}"); }
    catch { return {}; }
}

function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new StorageEvent("storage", { key: SETTINGS_KEY, newValue: JSON.stringify(settings) }));
}

function renderSettings(isAdmin) {
    const list = document.getElementById("settingsList");
    if (!list) return;
    const settings = readSettings();
    const dark = settings.darkMode === true;
    const color = settings.primaryColor || DEFAULT_COLOR;

    list.innerHTML = `
        <div class="settings-item">
            <div><strong>🌙 다크모드</strong><p>어두운 화면 테마를 사용합니다.</p></div>
            <button type="button" class="settings-toggle ${dark ? "active" : ""}" id="cobyDarkToggle" aria-pressed="${dark}">${dark ? "ON" : "OFF"}</button>
        </div>
        <div class="settings-item settings-color-item">
            <div><strong>🎨 컬러포인트</strong><p>COBY의 주요 강조 색상을 선택합니다.</p></div>
            <div class="settings-colors" id="cobyColorChoices">
                ${COLORS.map(c => `<button type="button" class="color-choice ${c.toLowerCase() === color.toLowerCase() ? "selected" : ""}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join("")}
            </div>
        </div>
        ${isAdmin ? `<button type="button" class="settings-item settings-admin-button" id="settingsAdminLogsButton"><div><strong>💬 대화 로그 보기</strong><p>사용자별 COBY 대화 로그를 확인합니다.</p></div><span>›</span></button>` : ""}
    `;

    document.getElementById("cobyDarkToggle")?.addEventListener("click", () => {
        const current = readSettings();
        saveSettings({ ...current, darkMode: !current.darkMode, primaryColor: current.primaryColor || DEFAULT_COLOR });
        renderSettings(isAdmin);
    });

    document.querySelectorAll(".color-choice").forEach(button => {
        button.addEventListener("click", () => {
            const current = readSettings();
            saveSettings({ ...current, primaryColor: button.dataset.color || DEFAULT_COLOR });
            renderSettings(isAdmin);
        });
    });

    document.getElementById("settingsAdminLogsButton")?.addEventListener("click", () => {
        if (typeof window.openAdminLogs === "function") window.openAdminLogs();
        else alert("대화 로그 기능을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    });
}

async function loadSettingsAccess() {
    const userId = localStorage.getItem("userId");
    let admin = false;
    if (userId) {
        try {
            const snapshot = await getDoc(doc(db, "users", userId));
            admin = snapshot.exists() && isAdminRole(snapshot.data().role);
        } catch (error) {
            console.warn("설정 권한 확인 실패", error);
        }
    }
    renderSettings(admin);
}

export function openSettings() {
    const modal = document.getElementById("settingsModal");
    modal?.classList.add("show");
    modal?.setAttribute("aria-hidden", "false");
    loadSettingsAccess();
}

export function closeSettings() {
    const modal = document.getElementById("settingsModal");
    modal?.classList.remove("show");
    modal?.setAttribute("aria-hidden", "true");
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;
loadSettingsAccess();
