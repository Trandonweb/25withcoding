import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const mainFirebaseConfig = {
    apiKey: "AIzaSyBgOAO72ArbW8dO7OSYsTVEQtRHT049U20",
    authDomain: "points2026-f5e50.firebaseapp.com",
    projectId: "points2026-f5e50",
    storageBucket: "points2026-f5e50.firebasestorage.app",
    messagingSenderId: "248724251417",
    appId: "1:248724251417:web:02d85cdc4addac98069b88"
};

const db = getFirestore(initializeApp(mainFirebaseConfig, "cobySettings"));

export function isAdminRole(role) {
    return role === "president" || role === "vice";
}

async function loadSettingsAccess() {
    const button = document.getElementById("settingsAdminLogsButton");
    if (!button) return;

    const userId = localStorage.getItem("userId");
    if (!userId) return;

    try {
        const snapshot = await getDoc(doc(db, "users", userId));
        button.hidden = !snapshot.exists() || !isAdminRole(snapshot.data().role);
    } catch (error) {
        console.warn("설정 권한 확인 실패", error);
        button.hidden = true;
    }
}

function openSettings() {
    document.getElementById("settingsModal")?.classList.add("show");
    document.getElementById("settingsModal")?.setAttribute("aria-hidden", "false");
    loadSettingsAccess();
}

function closeSettings() {
    document.getElementById("settingsModal")?.classList.remove("show");
    document.getElementById("settingsModal")?.setAttribute("aria-hidden", "true");
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;

loadSettingsAccess();
