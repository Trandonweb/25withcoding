// ============================================
// upload.js
// Firebase Storage 업로드 (회원/비회원 경로 분리 버전)
// ============================================

import {
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js";

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { storage, db } from "../firebase.js";

let currentIndex = -1;
const MAX_FRAMES = 5;

/**
 * ID 문자열을 분석하여 users 인지 guests 인지 컬렉션 이름을 반환하는 헬퍼 함수
 */
function getCollectionName(userId) {
    return userId.startsWith("guest-") ? "guests" : "users";
}

/**
 * 로그인하지 않은 사용자를 위한 게스트 ID 발급 및 초기화
 * 비회원은 guests 컬렉션에 따로 저장되며 번호는 댕겨지지 않고 누적됩니다.
 */
export async function initializeUserOrGuest(userId) {
    // 1. 로그인한 회원 ID(학번 등)가 있으면 그대로 사용
    if (userId) return userId;

    // 2. 비회원이면 접속순으로 guest-1, guest-2... 고유 식별자 발급
    try {
        const counterRef = doc(db, "system", "guestCounter");
        
        const guestId = await runTransaction(db, async (transaction) => {
            const counterSnap = await transaction.get(counterRef);
            let nextNumber = 1;

            if (counterSnap.exists()) {
                nextNumber = (counterSnap.data().count || 0) + 1;
            }

            transaction.set(counterRef, { count: nextNumber }, { merge: true });
            return `guest-${nextNumber}`;
        });

        // 3. updateDoc 실패 방지를 위해 guests 컬렉션에 문서 미리 생성
        await setDoc(doc(db, "guests", guestId), {
            current: 0,
            mode: "firebase",
            updatedAt: serverTimestamp()
        }, { merge: true });

        return guestId;

    } catch (error) {
        console.error("게스트 식별자 발급 실패:", error);
        return `guest-${Date.now()}`;
    }
}

/**
 * 현재 번호 반환
 */
export function getCurrentIndex() {
    return currentIndex < 0 ? 0 : currentIndex;
}

/**
 * 업로드 번호 초기화
 */
export function resetUploadIndex() {
    currentIndex = -1;
}

/**
 * Firestore(users 또는 guests)에서 현재 저장된 current 값을 가져와 인덱스 순서를 맞춤
 */
async function syncIndex(userId) {
    if (currentIndex !== -1) return;
    
    try {
        const colName = getCollectionName(userId);
        const snap = await getDoc(doc(db, colName, userId));
        if (snap.exists() && snap.data().current !== undefined) {
            currentIndex = (snap.data().current + 1) % MAX_FRAMES;
        } else {
            currentIndex = 0;
        }
    } catch (e) {
        currentIndex = 0;
    }
}

/**
 * Blob 업로드 (타겟 ID에 따라 users 또는 guests 컬렉션에 분기 저장)
 */
export async function uploadFrame(userId, blob) {
    if (!userId) throw new Error("userId(또는 guestId)가 없습니다.");

    await syncIndex(userId);

    const targetIndex = currentIndex;
    const path = `mirroring/${userId}/${targetIndex}.jpg`;
    const storageRef = ref(storage, path);

    // 1. Storage 업로드
    await uploadBytes(storageRef, blob, {
        contentType: "image/jpeg"
    });

    // 2. 해당 컬렉션(users 또는 guests) 분기 처리 후 업데이트
    const colName = getCollectionName(userId);
    await updateDoc(doc(db, colName, userId), {
        current: targetIndex,
        mode: "firebase",
        updatedAt: serverTimestamp()
    });

    // 3. 정합성 완료 시 인덱스 전환
    currentIndex = (targetIndex + 1) % MAX_FRAMES;
}

/**
 * URL 반환 (캐시 무효화 포함)
 */
export async function getFrameURL(userId, index) {
    try {
        const storageRef = ref(storage, `mirroring/${userId}/${index}.jpg`);
        const url = await getDownloadURL(storageRef);
        return `${url}?t=${Date.now()}`;
    } catch (error) {
        console.error("URL 조회 실패:", error);
        return null;
    }
}

/**
 * 현재 최신 이미지 URL 조회 (users/guests 컬렉션 자동 분기)
 */
export async function getLatestFrame(userId) {
    try {
        const colName = getCollectionName(userId);
        const snap = await getDoc(doc(db, colName, userId));
        if (!snap.exists()) return null;

        const data = snap.data();
        if (data.current === undefined) return null;

        return await getFrameURL(userId, data.current);
    } catch (error) {
        console.error("최신 프레임 조회 실패:", error);
        return null;
    }
}
