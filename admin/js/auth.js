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
import {
    getAuth,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import { app, db } from "./firebase.js";

const auth = getAuth(app);

function getPreferredPersistence(keepLogin) {
    if (typeof keepLogin === "boolean") {
        return keepLogin ? browserLocalPersistence : browserSessionPersistence;
    }
    try {
        const saved = JSON.parse(localStorage.getItem("coding_with_ramen_settings") || "{}");
        return saved.keepLogin === false ? browserSessionPersistence : browserLocalPersistence;
    } catch {
        return browserLocalPersistence;
    }
}

async function applyAuthPersistence(keepLogin) {
    await setPersistence(auth, getPreferredPersistence(keepLogin));
}

function waitForAuthUser() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        }, error => {
            unsubscribe();
            reject(error);
        });
    });
}


// =====================================
// 컬렉션 결정
// =====================================

function getCollectionName(id){

    return id.startsWith("guest-")
        ? "guests"
        : "users";

}


// =====================================
// 현재 로그인 사용자
// =====================================

export async function getCurrentUser(){

    // 기기 설정을 우선 적용한 뒤 실제 Firebase Auth 세션을 확인한다.
    await applyAuthPersistence();

    const authUser = await waitForAuthUser();
    const email = authUser?.email || "";
    const match = email.match(/^(\d{5})@auth\.25withcoding\.kr$/i);
    const userId = match?.[1] || "";

    if (!authUser || !userId) {
        localStorage.removeItem("userId");
        localStorage.removeItem("firebaseIdToken");
        location.href = "/signin/?redirect=" + encodeURIComponent(location.pathname + location.search);
        throw new Error("Firebase Authentication 로그인 필요");
    }

    // localStorage is only a compatibility/display cache; identity comes from the verified SDK session.
    localStorage.setItem("userId", userId);

    const ref = doc(db,"users",userId);

    const snap = await getDoc(ref);

    if(!snap.exists()){

        localStorage.removeItem("userId");
        localStorage.removeItem("firebaseIdToken");
        await signOut(auth);

        location.href="/signin";

        throw new Error("계정 없음");

    }

    const userData = snap.data();

    // Firestore에 저장된 keepLogin 설정이 있으면 기기 캐시보다 우선한다.
    if (typeof userData.settings?.keepLogin === "boolean") {
        await applyAuthPersistence(userData.settings.keepLogin);
    }

    return {
        id: userId,
        ...userData
    };

}


// =====================================
// 관리자 권한
// =====================================

export async function requireAdmin(){

    const user = await getCurrentUser();

    if(

        user.role!=="president" &&

        user.role!=="vice"

    ){

        alert("관리자만 접근 가능합니다.");

        location.href="/";

        throw new Error("권한 없음");

    }

    return user;

}


// =====================================
// 페이지 인증
// =====================================

export async function checkAuth(){

    return await requireAdmin();

}


// =====================================
// 미러링 기본 필드 생성
// =====================================

export async function ensureMirrorFields(userId){

    const ref = doc(

        db,

        getCollectionName(userId),

        userId

    );

    const snap = await getDoc(ref);

    if(!snap.exists()) return;

    const data = snap.data();

    const update={};

    if(data.online===undefined)

        update.online=false;

    if(data.state===undefined)

        update.state="offline";

    if(data.mode===undefined)

        update.mode="firebase";

    if(data.current===undefined)

        update.current=0;

    if(data.updatedAt===undefined)

        update.updatedAt=serverTimestamp();

    if(Object.keys(update).length){

        await updateDoc(ref,update);

    }

}


// =====================================
// 학생 접속
// =====================================

export async function setOnline(userId){

    await updateDoc(

        doc(

            db,

            getCollectionName(userId),

            userId

        ),

        {

            online:true,

            state:"live",

            updatedAt:serverTimestamp()

        }

    );

}


// =====================================
// 학생 종료
// =====================================

export async function setOffline(userId){

    try{

        await updateDoc(

            doc(

                db,

                getCollectionName(userId),

                userId

            ),

            {

                online:false,

                state:"offline",

                updatedAt:serverTimestamp()

            }

        );

    }catch(e){

        console.warn(e);

    }

}


/** 현재 Firebase Auth 세션을 종료한다. */
export async function logoutCurrentUser() {
    await signOut(auth);
    localStorage.removeItem("userId");
    localStorage.removeItem("firebaseIdToken");
    localStorage.removeItem("firebaseRefreshToken");
    location.replace("/signin/");
}
