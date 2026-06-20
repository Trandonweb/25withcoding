// Firebase App
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

// Firestore
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// =========================
// Firebase 설정
// =========================

const firebaseConfig = {
    apiKey: "AIzaSyDHI2KZxaPJiinhQQnvl7qOfBlsODrLzbY",
    authDomain: "aivshuman-f8971.firebaseapp.com",
    projectId: "aivshuman-f8971",
    storageBucket: "aivshuman-f8971.firebasestorage.app",
    messagingSenderId: "703742042109",
    appId: "1:703742042109:web:24785fb1b94a542f208394"
};

// =========================
// Firebase 초기화
// =========================

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// =========================
// UID 관리
// =========================

export function getUID() {

    let uid = localStorage.getItem("aivshuman_uid");

    if (!uid) {

        uid = crypto.randomUUID();

        localStorage.setItem(
            "aivshuman_uid",
            uid
        );
    }

    return uid;
}

// =========================
// 닉네임 관리
// =========================

export function getNickname() {

    return localStorage.getItem(
        "aivshuman_nickname"
    );
}

export function setNickname(nickname) {

    localStorage.setItem(
        "aivshuman_nickname",
        nickname
    );
}

// =========================
// 유저 생성
// =========================

export async function createUserIfNotExists() {

    const uid = getUID();

    const userRef = doc(
        db,
        "users",
        uid
    );

    const snapshot = await getDoc(
        userRef
    );

    if (snapshot.exists()) {

        return snapshot.data();
    }

    const nickname =
        getNickname() || "플레이어";

    const userData = {

        uid,

        nickname,

        createdAt: Date.now(),

        scores: {
            tictactoe: 0,
            maze: 0,
            number: 0,
            soccer: 0,
            baseball: 0
        },

        totalScore: 0
    };

    await setDoc(
        userRef,
        userData
    );

    return userData;
}

// =========================
// 유저 정보 가져오기
// =========================

export async function getUserData() {

    const uid = getUID();

    const userRef = doc(
        db,
        "users",
        uid
    );

    const snapshot =
        await getDoc(userRef);

    if (!snapshot.exists()) {

        return null;
    }

    return snapshot.data();
}

// =========================
// 점수 저장
// =========================

export async function updateGameScore(
    game,
    score
) {

    const uid = getUID();

    const userRef = doc(
        db,
        "users",
        uid
    );

    const snapshot =
        await getDoc(userRef);

    if (!snapshot.exists()) {

        return;
    }

    const data =
        snapshot.data();

    const currentScore =
        data.scores?.[game] || 0;

    if (score <= currentScore) {

        return;
    }

    data.scores[game] = score;

    data.totalScore =
        Object.values(
            data.scores
        ).reduce(
            (sum, value) =>
                sum + value,
            0
        );

    await updateDoc(
        userRef,
        {
            scores: data.scores,
            totalScore:
                data.totalScore
        }
    );
}

// =========================
// TOP 3 랭킹
// =========================

export async function getTopUsers() {

    const q = query(
        collection(db, "users"),
        orderBy("totalScore", "desc"),
        limit(3)
    );

    const snapshot =
        await getDocs(q);

    const result = [];

    snapshot.forEach(doc => {

        result.push(
            doc.data()
        );
    });

    return result;
}
