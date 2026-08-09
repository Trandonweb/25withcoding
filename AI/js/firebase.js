import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, startAfter, serverTimestamp, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

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

export const mainDb = getFirestore(initializeApp(mainFirebaseConfig, "mainApp"));
export const db = getFirestore(initializeApp(cobyFirebaseConfig, "cobyApp"));
export const API_URL = "https://two5withcoding.onrender.com/chat";

export { doc, getDoc, setDoc, collection, addDoc, getDocs, query, orderBy, limit, startAfter, serverTimestamp, updateDoc, deleteDoc };
