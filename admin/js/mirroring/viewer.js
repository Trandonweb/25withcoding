// ============================================
// viewer.js
// 관리자 화면 미러링 UI 관리
// ============================================

import {
    collection,
    onSnapshot,
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import {
    db
} from "../firebase.js";

import {
    getLatestFrame
} from "./upload.js";

import {
    startAdminSignaling,
    stopAdminSignaling
} from "./webrtc.js";


// ============================================
// 변수
// ============================================

const users = new Map();
const guests = new Map();


function updateOnlineCount(){


    let count=0;


    users.forEach(u=>{

        if(u.online===true){
            count++;
        }

    });


    guests.forEach(u=>{

        if(u.online===true){
            count++;
        }

    });


    const el=document.getElementById("online");


    if(el){

        el.innerText=
        `🟢 접속 ${count}명`;

    }

}

let selectedId = null;

let grid = null;

let viewer = null;
let viewerImage = null;
let viewerVideo = null;
let viewerTitle = null;


// ============================================
// 초기화
// ============================================

export function initViewer(){

    grid = document.getElementById("grid");

    viewer = document.getElementById("viewer");

    viewerImage = document.getElementById("bigImage");

    viewerVideo = document.getElementById("bigVideo");

    viewerTitle = document.getElementById("viewerTitle");


    loadUsers();


    const close =
        document.getElementById("closeViewer");


    if(close){

        close.onclick = () => {

            closeViewer();

        };

    }

}



// ============================================
// 사용자 감시
// ============================================

function loadUsers(){


    // 회원 감시
    onSnapshot(
        collection(db,"users"),
        snap=>{

            users.clear();


            snap.forEach(doc=>{

                users.set(
                    doc.id,
                    doc.data()
                );

            });


            render();
            updateOnlineCount();

        }
    );



    // 게스트 감시
    onSnapshot(
        collection(db,"guests"),
        snap=>{

            guests.clear();


            snap.forEach(doc=>{

                guests.set(
                    doc.id,
                    doc.data()
                );

            });


            render();
            updateOnlineCount();

        }
    );


}


// ============================================
// 카드 생성
// ============================================

function render(){

    if(!grid) return;


    grid.innerHTML="";


    users.forEach((data,id)=>{
    
        const card=createCard(id,data);
    
        grid.appendChild(card);
    
    });
    
    
    guests.forEach((data,id)=>{
    
        const card=createCard(id,data);
    
        grid.appendChild(card);
    
    });


    autoGrid();

}



// ============================================
// 카드
// ============================================

function createCard(id,data){


    const card =
        document.createElement("div");


    card.className="card";


    card.innerHTML=`

    <div class="cardHeader">

        <b>${id}</b>

        <span class="mode">
            ${data.mode || "FIREBASE"}
        </span>

    </div>


    <div class="preview">

        <div class="black">
            화면 준비중...
        </div>

    </div>

    `;



    updatePreview(
        card,
        id
    );


    card.onclick=()=>{

        openViewer(id);

    };


    return card;

}



// ============================================
// 미리보기 이미지 업데이트
// ============================================

async function updatePreview(card,id){


    const box =
        card.querySelector(".preview");


    const url =
        await getLatestFrame(id);



    if(url){


        box.innerHTML=`

        <img src="${url}">

        `;


    }else{


        box.innerHTML=`

        <div class="black">

            화면 준비중...

        </div>

        `;


    }


}



// ============================================
// 확대 보기
// ============================================

async function openViewer(id){


    selectedId=id;


    viewer.style.display="flex";


    viewerTitle.innerText=id;



    const snap =
        await getDoc(
            doc(db,"users",id)
        );


    if(!snap.exists())
        return;



    const data=snap.data();



    if(data.mode==="webrtc"){


        viewerImage.style.display="none";

        viewerVideo.style.display="block";


        startAdminSignaling(
            id,
            viewerVideo,
            updateRTCState
        );


    }else{


        viewerVideo.style.display="none";

        viewerImage.style.display="flex";


        const url =
            await getLatestFrame(id);



        if(url){

            viewerImage.src=url;

        }else{

            viewerImage.removeAttribute("src");

        }


    }


}



// ============================================
// WebRTC 상태 표시
// ============================================

function updateRTCState(id,state){


    console.log(
        id,
        state
    );


    if(state==="connected"){


        viewerTitle.innerText =
            `${id} - WEBRTC`;

    }


    if(
        state==="failed" ||
        state==="disconnected"
    ){


        fallbackFirebase();


    }


}



// ============================================
// Firebase 전환
// ============================================

async function fallbackFirebase(){


    if(!selectedId)
        return;



    stopAdminSignaling(
        selectedId
    );


    viewerVideo.style.display="none";

    viewerImage.style.display="flex";



    const url =
        await getLatestFrame(
            selectedId
        );


    if(url){

        viewerImage.src=url;

    }else{

        viewerImage.removeAttribute("src");

    }



    viewerTitle.innerText =
        `${selectedId} - FIREBASE`;

}



// ============================================
// 닫기
// ============================================

function closeViewer(){


    if(selectedId){


        stopAdminSignaling(
            selectedId
        );

    }



    selectedId=null;


    viewer.style.display="none";


    if(viewerVideo){

        viewerVideo.srcObject=null;

    }


    if(viewerImage){

        viewerImage.removeAttribute("src");

    }


}



// ============================================
// 자동 배치
// ============================================

function autoGrid(){


    const count =
        grid.children.length;


    let col=1;


    if(count>1)
        col=2;


    if(count>4)
        col=3;


    if(count>9)
        col=4;


    if(count>16)
        col=5;



    grid.style.gridTemplateColumns =
        `repeat(${col},1fr)`;

}
