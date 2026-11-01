import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
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
// 메인 사이트에서 생성한 기본 Firebase Auth 세션을 그대로 복원한다.
// COBY에서는 로그인 지속성을 다시 설정하거나 별도 인증 앱을 만들지 않는다.
export const auth = getAuth(mainApp);
export const authStateReady = auth.authStateReady();
export const mainDb = getFirestore(mainApp);

// The COBY project remains only for chat history, conversations and projects.
// Student identity/profile fields must always be read from mainDb/users/{studentId}.
export const db = getFirestore(initializeApp(cobyFirebaseConfig, "cobyApp"));
export const API_URL = "https://two5withcoding.onrender.com/chat";

export { getAuth, onAuthStateChanged, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, startAfter, serverTimestamp, updateDoc, deleteDoc };
