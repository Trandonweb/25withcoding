import {
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { db } from "../firebase.js";


function getCollectionName(id){

    return id.startsWith("guest-")
    ? "guests"
    : "users";

}


async function update(id,data){

    if(!id) return;


    const col =
        getCollectionName(id);


    await updateDoc(
        doc(db,col,id),
        {
            ...data,
            updatedAt:serverTimestamp()
        }
    );

}


// 온라인

export async function setOnline(id){

    await update(id,{
        online:true,
        state:"live"
    });

}



// 오프라인

export async function setOffline(id){

    await update(id,{
        online:false,
        state:"offline"
    });

}



// 모드 변경

export async function setMode(id,mode){

    await update(id,{
        mode:mode
    });

}



// 하트비트

export async function heartbeat(id){

    await update(id,{
        online:true
    });

}
