// ============================================
// status.js
// 학생 상태 관리
// ============================================

import {
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { db } from "../firebase.js";

let userId = null;

let heartbeatTimer = null;

// ------------------------------------
// 내부 업데이트
// ------------------------------------

async function update(data){

    if(!userId)return;


    const col =
        getCollectionName(userId);


    await updateDoc(
        doc(db,col,userId),
        data
    );

}

// ------------------------------------
// 상태 시작
// ------------------------------------

export async function startStatusWatcher(id){

    userId=id;

    await update({

        online:true,
        state:"live",
        updatedAt:serverTimestamp()

    });

    // 30초마다 살아있음 표시
    heartbeatTimer=setInterval(()=>{

        update({

            updatedAt:serverTimestamp()

        });

    },30000);

}

// ------------------------------------
// 종료
// ------------------------------------

export async function stopStatusWatcher(){

    clearInterval(heartbeatTimer);

    await update({

        online:false,
        state:"offline",
        updatedAt:serverTimestamp()

    });

}

// ------------------------------------
// 현재 업로드 번호
// ------------------------------------

export async function setCurrent(index){

    await update({

        current:index,
        updatedAt:serverTimestamp()

    });

}

// ------------------------------------
// 모드 변경
// ------------------------------------

export async function setMode(mode){

    await update({

        mode:mode,
        updatedAt:serverTimestamp()

    });

}

// ------------------------------------
// 상태 직접 변경
// ------------------------------------

export async function setState(state){

    await update({

        state:state,
        updatedAt:serverTimestamp()

    });

}

// ------------------------------------
// 탭 변경 감지
// ------------------------------------

document.addEventListener(
    "visibilitychange",
    ()=>{

        if(document.hidden){

            update({

                state:"away",
                updatedAt:serverTimestamp()

            });

        }else{

            update({

                state:"live",
                updatedAt:serverTimestamp()

            });

        }

    }
);

// ------------------------------------
// 포커스
// ------------------------------------

window.addEventListener("focus",()=>{

    update({

        state:"live",
        updatedAt:serverTimestamp()

    });

});

// ------------------------------------
// 블러
// ------------------------------------

window.addEventListener("blur",()=>{

    update({

        state:"away",
        updatedAt:serverTimestamp()

    });

});

// ------------------------------------
// 페이지 종료
// ------------------------------------

window.addEventListener("beforeunload",()=>{

    update({

        online:false,
        state:"offline",
        updatedAt:serverTimestamp()

    });

});

// ------------------------------------
// 개발자도구 감지
// ------------------------------------

let opened=false;

setInterval(()=>{

    const widthGap=window.outerWidth-window.innerWidth;

    const heightGap=window.outerHeight-window.innerHeight;

    const detect=(widthGap>170)||(heightGap>170);

    if(detect!=opened){

        opened=detect;

        update({

            devtools:opened,
            updatedAt:serverTimestamp()

        });

    }

},1000);

// ------------------------------------
// 새 필드 자동 생성
// ------------------------------------

export async function ensureStatusFields(){

    const defaults={

        online:false,
        state:"offline",
        mode:"firebase",
        current:0,
        devtools:false

    };

    await update(defaults);

}

//-------------------------------------
//몰라 수정하란다(나중에 내가 너보고 전체 코드를 달라고 하면 바꿔)
//-------------------------------------
function getCollectionName(id){

    return id.startsWith("guest-")
    ? "guests"
    : "users";

}
