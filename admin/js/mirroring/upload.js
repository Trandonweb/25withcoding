// ============================================
// upload.js
// Firebase Storage 업로드 (디버그 버전)
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

function getCollectionName(userId){
    return userId.startsWith("guest-")
        ? "guests"
        : "users";
}

export async function initializeUserOrGuest(userId){

    if(userId) return userId;

    try{

        const counterRef=doc(db,"system","guestCounter");

        const guestId=await runTransaction(db,async(transaction)=>{

            const snap=await transaction.get(counterRef);

            let next=1;

            if(snap.exists()){
                next=(snap.data().count||0)+1;
            }

            transaction.set(counterRef,{
                count:next
            },{merge:true});

            return `guest-${next}`;

        });

        await setDoc(
            doc(db,"guests",guestId),
            {
                current:0,
                mode:"firebase",
                updatedAt:serverTimestamp()
            },
            {merge:true}
        );

        return guestId;

    }catch(e){

        console.error("게스트 생성 실패",e);

        return `guest-${Date.now()}`;

    }

}

export function getCurrentIndex(){

    return currentIndex<0
        ?0
        :currentIndex;

}

export function resetUploadIndex(){

    currentIndex=-1;

}

async function syncIndex(userId){

    if(currentIndex!=-1) return;

    try{

        const col=getCollectionName(userId);

        const snap=await getDoc(
            doc(db,col,userId)
        );

        if(
            snap.exists() &&
            snap.data().current!=undefined
        ){

            currentIndex=
            (snap.data().current+1)%MAX_FRAMES;

        }else{

            currentIndex=0;

        }

    }catch(e){

        console.warn("syncIndex 실패",e);

        currentIndex=0;

    }

}

export async function uploadFrame(userId,blob){

    if(!userId){

        throw new Error("userId 없음");

    }

    console.log("========== uploadFrame ==========");
    console.log("user :",userId);
    console.log("blob :",blob);

    await syncIndex(userId);

    const targetIndex=currentIndex;

    const path=`mirroring/${userId}/${targetIndex}.jpg`;

    console.log("path :",path);

    const storageRef=ref(storage,path);

    try{

        console.log("Storage 업로드 시작");

        await uploadBytes(
            storageRef,
            blob,
            {
                contentType:"image/jpeg"
            }
        );

        console.log("Storage 업로드 성공");

    }catch(e){

        console.error("Storage 업로드 실패",e);

        throw e;

    }

    try{

        const col=getCollectionName(userId);

        await updateDoc(
            doc(db,col,userId),
            {
                current:targetIndex,
                mode:"firebase",
                updatedAt:serverTimestamp()
            }
        );

        console.log("Firestore current 갱신 성공");

    }catch(e){

        console.error("Firestore current 갱신 실패",e);

        throw e;

    }

    currentIndex=(targetIndex+1)%MAX_FRAMES;

    console.log("다음 index =",currentIndex);

}

export async function getFrameURL(userId,index){

    try{

        const storageRef=ref(
            storage,
            `mirroring/${userId}/${index}.jpg`
        );

        const url=await getDownloadURL(storageRef);

        return `${url}?t=${Date.now()}`;

    }catch(e){

        console.warn(
            `이미지 없음 : mirroring/${userId}/${index}.jpg`
        );

        return null;

    }

}

export async function getLatestFrame(userId){

    try{

        const col=getCollectionName(userId);

        const snap=await getDoc(
            doc(db,col,userId)
        );

        if(!snap.exists()){

            console.warn("사용자 문서 없음",userId);

            return null;

        }

        const data=snap.data();

        console.log("Firestore 데이터",data);

        if(data.current==undefined){

            console.warn("current 없음");

            return null;

        }

        return await getFrameURL(
            userId,
            data.current
        );

    }catch(e){

        console.error("최신 프레임 조회 실패",e);

        return null;

    }

}
