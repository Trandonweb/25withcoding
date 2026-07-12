// =====================================
// /js/auth.js
// 로그인 및 권한 확인
// =====================================

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { db } from "./firebase.js";

/**
 * 현재 로그인한 사용자 반환
 */
export async function getCurrentUser() {

    const userId = localStorage.getItem("userId");

    if (!userId) {
        location.href="/signin/?redirect=/admin/mirroring.html" + encodeURIComponent(location.pathname);
        throw new Error("로그인 필요");
    }

    const ref = doc(db, "users", userId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        localStorage.removeItem("userId");
        location.href = "/login";
        throw new Error("계정 없음");
    }

    const data = snap.data();

    return {
        id: userId,
        ...data
    };

}

/**
 * 관리자 권한 확인
 */
export async function requireAdmin() {

    const user = await getCurrentUser();

    if (
        user.role !== "president" &&
        user.role !== "vice"
    ) {

        alert("관리자만 접근 가능합니다.");
        location.href = "/";
        throw new Error("권한 없음");

    }

    return user;
}


/**
 * 페이지 접근 권한 확인용
 * 관리자 페이지 공통 사용
 */
export async function checkAuth() {

    return await requireAdmin();

}

/**
 * 미러링용 필드 생성
 * (없을 때만 추가)
 */
export async function ensureMirrorFields(userId) {

    const ref = doc(db, "users", userId);

    const snap = await getDoc(ref);

    if (!snap.exists()) return;

    const data = snap.data();

    const update = {};

    if (data.online === undefined)
        update.online = false;

    if (data.state === undefined)
        update.state = "offline";

    if (data.mode === undefined)
        update.mode = "firebase";

    if (data.current === undefined)
        update.current = 0;

    if (data.updatedAt === undefined)
        update.updatedAt = serverTimestamp();

    if (Object.keys(update).length > 0) {

        await updateDoc(ref, update);

    }

}

/**
 * 학생 접속
 */
function getCollectionName(id){

    return id.startsWith("guest-")
    ?"guests"
    :"users";

}



export async function setOnline(id){

    await updateDoc(
        doc(
            db,
            getCollectionName(id),
            id
        ),
        {
            online:true,
            state:"live",
            updatedAt:serverTimestamp()
        }
    );

}



export async function setOffline(id){

    await updateDoc(
        doc(
            db,
            getCollectionName(id),
            id
        ),
        {
            online:false,
            state:"offline",
            updatedAt:serverTimestamp()
        }
    );

}

/**
 * 학생 종료
 */
export async function setOffline(userId) {

    try {

        await updateDoc(doc(db, "users", userId), {

            online: false,
            state: "offline",
            updatedAt: serverTimestamp()

        });

    } catch (e) {
        console.warn(e);
    }

}
