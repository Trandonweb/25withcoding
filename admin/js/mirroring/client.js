// ============================================
// client.js
// 학생측 메인 컨트롤러
// ============================================

import { authCheck } from "../auth.js";
import { db } from "../firebase.js";

import {
    initializeUserOrGuest,
    uploadFrame
} from "./upload.js";

import {
    setMode,
    setOnline,
    setOffline,
    heartbeat
} from "./status.js";

import {
    startCapture,
    captureFrame,
    stopCapture
} from "./capture.js";

import {
    startClientSignaling,
    stopClientSignaling
} from "./clientRTC.js";

import {
    doc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// ================================
// 기본 설정
// ================================

const CAPTURE_INTERVAL = 10000;

let userId = null;
let stream = null;

let uploadTimer = null;
let heartbeatTimer = null;

let unsubscribeMode = null;

let running = false;

// ================================
// 시작
// ================================

async function start(){

    if(running) return;

    running=true;


    // 1. 로그인 확인
    const loginUser = await authCheck();


    if(loginUser){
        userId = loginUser;
    }


    // 2. ID 확정
    userId = await initializeUserOrGuest(userId);



    // 3. 온라인 등록
    await setOnline(userId);



    // 4. 하트비트 시작
    heartbeatTimer=setInterval(()=>{

        heartbeat(userId);

    },30000);



    // 5. 화면 공유 권한 요청
    stream = await navigator.mediaDevices.getDisplayMedia({

        video:{
            frameRate:5
        },

        audio:false

    });



    // 6. 캡처 준비
    await startCapture(stream);



    // 7. 최초 상태
    await setMode(
        userId,
        "firebase"
    );



    // 8. Firebase 업로드 시작
    startUploadLoop();



    // 9. 관리자 명령 감시
    listenMode();

}

// ================================
// 업로드 루프
// ================================

function startUploadLoop(){

    if(uploadTimer){

        clearInterval(uploadTimer);

    }

    uploadTimer=setInterval(async()=>{

        try{

            const blob=await captureFrame();

            if(blob){

                await uploadFrame(userId,blob);

            }

        }catch(e){

            console.error(e);

        }

    },CAPTURE_INTERVAL);

}

// ================================
// 모드 감시
// ================================

function listenMode(){

    const ref=doc(
        db,
        userId.startsWith("guest-")
            ?"guests"
            :"users",
        userId
    );

    unsubscribeMode=onSnapshot(ref,async(snap)=>{

        if(!snap.exists()) return;

        const data=snap.data();

        if(!data.mode){

            return;

        }

        switch(data.mode){

            case "firebase":

                await switchFirebase();

                break;

            case "webrtc":

                await switchWebRTC();

                break;

        }

    });

}

// ================================
// Firebase 모드
// ================================

async function switchFirebase(){

    stopClientSignaling();

    if(!uploadTimer){

        startUploadLoop();

    }

}
// ================================
// WebRTC 모드
// ================================

async function switchWebRTC(){

    if(uploadTimer){

        clearInterval(uploadTimer);
        uploadTimer=null;

    }

    try{

        await startClientSignaling(
            userId,
            stream
        );

    }catch(e){

        console.error("WebRTC 시작 실패",e);

        await setMode(
            userId,
            "firebase"
        );

        startUploadLoop();

    }

}

// ================================
// 화면공유 종료 감지
// ================================

function bindTrackEvents(){

    if(!stream) return;

    const tracks=stream.getVideoTracks();

    if(tracks.length===0){

        endClient();

        return;

    }

    tracks[0].addEventListener("ended",()=>{

        endClient();

    });

}

// ================================
// 종료
// ================================

async function endClient(){

    running=false;

    try{

        if(uploadTimer){

            clearInterval(uploadTimer);
            uploadTimer=null;

        }

        if(heartbeatTimer){

            clearInterval(heartbeatTimer);
            heartbeatTimer=null;

        }

        if(unsubscribeMode){

            unsubscribeMode();
            unsubscribeMode=null;

        }

        stopClientSignaling();

        stopCapture();

        if(stream){

            stream
                .getTracks()
                .forEach(track=>{

                    track.stop();

                });

        }

        await setOffline(userId);

    }catch(e){

        console.error(e);

    }

}

// ================================
// visibility
// ================================

document.addEventListener(

    "visibilitychange",

    ()=>{

        if(document.hidden){

            heartbeat(userId);

        }

    }

);

// ================================
// before unload
// ================================

window.addEventListener(

    "beforeunload",

    ()=>{

        endClient();

    }

);

// ================================
// online/offline
// ================================

window.addEventListener(

    "offline",

    ()=>{

        console.warn("네트워크 끊김");

    }

);

window.addEventListener(

    "online",

    ()=>{

        console.log("네트워크 복구");

    }

);

// ================================
// 시작
// ================================

(async()=>{

    try{

        await start();

        bindTrackEvents();

    }catch(e){

        console.error(e);

        alert(
            "화면 공유를 시작할 수 없습니다."
        );

    }

})();
