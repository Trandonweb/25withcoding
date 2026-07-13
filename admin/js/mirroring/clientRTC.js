// ============================================
// clientRTC.js
// 학생측 WebRTC Signaling
// ============================================

import {
    doc,
    onSnapshot,
    updateDoc,
    arrayUnion,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { db } from "../firebase.js";

const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

let pc = null;
let unsubscribe = null;
let currentId = null;

const processedCandidates = new Set();

function getCollectionName(id){

    return id.startsWith("guest-")
        ? "guests"
        : "users";

}

// ============================================
// 시작
// ============================================

export async function startClientSignaling(
    userId,
    stream
){

    currentId=userId;

    await stopClientSignaling();

    const col=getCollectionName(userId);

    const ref=doc(
        db,
        col,
        userId
    );

    pc=new RTCPeerConnection(rtcConfig);

    processedCandidates.clear();

    stream
        .getTracks()
        .forEach(track=>{

            pc.addTrack(
                track,
                stream
            );

        });

    pc.onconnectionstatechange=()=>{

        console.log(
            "[CLIENT]",
            pc.connectionState
        );

    };

    pc.onicecandidate=async(event)=>{

        if(!event.candidate)
            return;

        try{

            await updateDoc(
                ref,
                {

                    clientCandidates:
                    arrayUnion(
                        event.candidate.toJSON()
                    )

                }
            );

        }catch(e){

            console.error(e);

        }

    };

    const offer=
        await pc.createOffer();

    await pc.setLocalDescription(
        offer
    );

    await updateDoc(
        ref,
        {

            clientOffer:
            JSON.stringify(
                offer
            )

        }
    );

    unsubscribe=
    onSnapshot(
        ref,
        async(snap)=>{

            if(!snap.exists())
                return;

            const data=
                snap.data();

            if(
                data.mode!=="webrtc"
            ){
                return;
            }

            try{

                // ↓↓↓ 여기부터 2부

                // 관리자 Answer 수신
                if(
                    data.adminAnswer &&
                    !pc.currentRemoteDescription
                ){

                    const answer=
                        new RTCSessionDescription(
                            data.adminAnswer
                        );

                    await pc.setRemoteDescription(
                        answer
                    );

                    console.log(
                        "[CLIENT] Answer 수신 완료"
                    );

                }
// ============================================
// 종료
// ============================================

export async function stopClientSignaling(){

    if(unsubscribe){

        unsubscribe();
        unsubscribe=null;

    }

    if(pc){

        try{

            pc.close();

        }catch(e){

            console.warn(e);

        }

        pc=null;

    }

    if(!currentId)
        return;

    try{

        const col=
            getCollectionName(
                currentId
            );

        const ref=
            doc(
                db,
                col,
                currentId
            );

        await updateDoc(
            ref,
            {

                clientOffer:
                    deleteField(),

                adminAnswer:
                    deleteField(),

                clientCandidates:
                    deleteField(),

                adminCandidates:
                    deleteField()

            }
        );

    }catch(e){

        console.warn(
            "signaling cleanup",
            e
        );

    }

}

// ============================================
// 연결 여부
// ============================================

export function isConnected(){

    if(!pc)
        return false;

    return pc.connectionState==="connected";

}

// ============================================
// Peer 반환
// ============================================

export function getPeerConnection(){

    return pc;

}
                // 관리자 ICE Candidate 수신
                if(
                    data.adminCandidates &&
                    Array.isArray(
                        data.adminCandidates
                    )
                ){

                    for(
                        const candidateObj
                        of data.adminCandidates
                    ){

                        if(!candidateObj)
                            continue;

                        const key=

                            candidateObj.candidate+
                            candidateObj.sdpMid+
                            candidateObj.sdpMLineIndex;

                        if(
                            processedCandidates.has(
                                key
                            )
                        ){
                            continue;
                        }

                        processedCandidates.add(
                            key
                        );

                        await pc.addIceCandidate(

                            new RTCIceCandidate(
                                candidateObj
                            )

                        );

                    }

                }

            }catch(e){

                console.error(
                    "[CLIENT]",
                    e
                );

            }

        }

    );

}
