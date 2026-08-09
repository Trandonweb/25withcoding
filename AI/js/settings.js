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

export function isAdminRole(role) {
    return role === "president" || role === "vice";
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

    const adminButton = document.getElementById("settingsAdminLogsButton");
    if (adminButton) adminButton.hidden = !admin;
}

export function openSettings() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    loadSettingsAccess();
}

export function closeSettings() {
    const modal = document.getElementById("settingsModal");
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

window.openSettings = openSettings;
window.closeSettings = closeSettings;

loadSettingsAccess();
