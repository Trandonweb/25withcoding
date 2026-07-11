// ================================
// Firebase 초기화
// /js/firebase.js
// ================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBgOAO72ArbW8dO7OSYsTVEQtRHT049U20",
    authDomain: "points2026-f5e50.firebaseapp.com",
    projectId: "points2026-f5e50",
    storageBucket: "points2026-f5e50.firebasestorage.app",
    messagingSenderId: "248724251417",
    appId: "1:248724251417:web:02d85cdc4addac98069b88"
};

// Firebase 시작
const app = initializeApp(firebaseConfig);

// Firestore
const db = getFirestore(app);

// Storage
const storage = getStorage(app);

// 내보내기
export {
    app,
    db,
    storage
};
