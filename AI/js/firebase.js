import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, startAfter, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const mainFirebaseConfig = {
    apiKey: "AIzaSyBgOAO72ArWb8dO7OSYsTVEQtRHT049U20",
    authDomain: "points2026-f5e50.firebaseapp.com",
    projectId: "points2026-f5e50",
    storageBucket: "points2026-f5e50.firebasestorage.app",
    messagingSenderId: "248724251417",
    appId: "1:248724251417:web:02d85cdc4addac98069b88"
};

const cobyFirebaseConfig = {
    apiKey: "AIzaSyAiO65zYyeRfuf6fCzosuW7OAVV47o47Js",
    authDomain: "coby-ai-328dd.firebaseapp.com",
    projectId: "coby-ai-328dd",
    storageBucket: "coby-ai-328dd.firebasestorage.app",
    messagingSenderId: "865530259286",
    appId: "1:248724251417:web:6feaa5781dc538700b18f7"
};

// points2026 is the single source of truth for users/{studentId} profile data.
export const mainApp = initializeApp(mainFirebaseConfig);
// 메인 홈페이지와 동일한 로그인 지속성 초기화 순서를 사용한다.
export const auth = getAuth(mainApp);
function getPreferredAuthPersistence() {
    try {
        const settings = JSON.parse(localStorage.getItem("coding_with_ramen_settings") || "{}");
        return settings.keepLogin === false ? browserSessionPersistence : browserLocalPersistence;
    } catch {
        return browserLocalPersistence;
    }
}
export const authPersistenceReady = setPersistence(auth, getPreferredAuthPersistence()).catch(async error => {
    console.error("[COBY AUTH] 기본 로그인 유지 설정 실패", error);
    try {
        if (getPreferredAuthPersistence() === browserLocalPersistence) {
            await setPersistence(auth, browserSessionPersistence);
            console.warn("[COBY AUTH] 브라우저 저장소 제한으로 현재 탭 로그인 유지 방식으로 전환했습니다.");
            return true;
        }
    } catch (fallbackError) {
        console.error("[COBY AUTH] 대체 로그인 유지 설정도 실패", fallbackError);
    }
    return false;
});
export const mainDb = getFirestore(mainApp);

// The COBY project remains only for chat history, conversations and projects.
// Student identity/profile fields must always be read from mainDb/users/{studentId}.
export const db = getFirestore(initializeApp(cobyFirebaseConfig, "cobyApp"));
export const API_URL = "https://two5withcoding.onrender.com/chat";

export { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, startAfter, serverTimestamp, updateDoc, deleteDoc };
