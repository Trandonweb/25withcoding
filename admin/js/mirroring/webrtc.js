// ============================================
// webrtc.js (관리자/수신자 전용)
// 안정적인 시그널링 데이터 관리 및 Peer 연결 최적화
// ============================================

import {
    doc,
    onSnapshot,
    updateDoc,
    arrayUnion,
    deleteField
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { db } from "../firebase.js";

// 활성 연결 관리 맵 (key: targetId, value: { pc, unsubscribe, state, isClosing, remoteVideoElement })
const peerConnections = new Map();

// STUN 서버 설정
const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

/**
 * ID 스타일 분석 처리 헬퍼 함수
 */
function getCollectionName(id) {
    return id.startsWith("guest-") ? "guests" : "users";
}

/**
 * 특정 클라이언트(학생/게스트)의 WebRTC 시그널링 시작
 * @param {string} targetId - 학번 또는 게스트 ID
 * @param {HTMLVideoElement} remoteVideoElement - 출력을 담당할 비디오 엘리먼트
 * @param {Function} onStateChangeCallback - 상태 변화를 알릴 콜백 함수 (선택 사항)
 */
export async function startAdminSignaling(targetId, remoteVideoElement, onStateChangeCallback = null) {
    if (!targetId) return;

    const colName = getCollectionName(targetId);
    const userDocRef = doc(db, colName, targetId);

    // 1. 기존 연결이 남아있다면 비동기 정리가 끝날 때까지 대기(await) 후 진행
    await stopAdminSignaling(targetId);

    console.log(`[Admin WebRTC] ${targetId} 연결 프로세스 시작`);

    const pc = new RTCPeerConnection(rtcConfig);
    
    // 중복 추가 방지를 위한 고유값 식별용 세트
    const processedCandidates = new Set();

    // 초기 상태 객체 맵에 등록 (원격 비디오 엘리먼트 레퍼런스 함께 저장)
    peerConnections.set(targetId, {
        pc: pc,
        unsubscribe: null,
        state: "new",
        isClosing: false,
        remoteVideoElement: remoteVideoElement
    });

    // PeerConnection 상태 감지 바인딩
    pc.onconnectionstatechange = async () => {
        const currentData = peerConnections.get(targetId);
        if (currentData) {
            currentData.state = pc.connectionState;
            console.log(`[Admin WebRTC] ${targetId} 상태 변경: ${pc.connectionState}`);
            
            if (onStateChangeCallback) {
                onStateChangeCallback(targetId, pc.connectionState);
            }

            // 실패 및 종료 감시 시 비동기 종료 처리 실행
            if (pc.connectionState === "failed" || pc.connectionState === "closed") {
                await stopAdminSignaling(targetId);
            }
        }
    };

    // 원격 미디어 트랙 수신 처리
    pc.ontrack = (event) => {
        if (remoteVideoElement && event.streams[0]) {
            remoteVideoElement.srcObject = event.streams[0];
        }
    };

    // 관리자 측 ICE Candidate 발생 시 처리
    pc.onicecandidate = async (event) => {
        if (!event.candidate) return;

        try {
            await updateDoc(userDocRef, {
                adminCandidates: arrayUnion(event.candidate.toJSON())
            });
        } catch (error) {
            console.error(`[Admin WebRTC] ${targetId} ICE 발송 예외 발생:`, error);
        }
    };

    // Firestore 시그널링 실시간 감시 시작
    const unsubscribe = onSnapshot(userDocRef, async (snapshot) => {
        try {
            if (!snapshot.exists()) {
                console.warn(`[Admin WebRTC] ${targetId} 문서가 Firestore에 존재하지 않습니다.`);
                await stopAdminSignaling(targetId);
                return;
            }

            const data = snapshot.data();

            // mode가 "webrtc" 일 때만 동작하도록 제한
            if (data.mode !== "webrtc") return;

            // A. 클라이언트의 Offer 처리
            if (data.clientOffer && !pc.currentRemoteDescription) {
                const offerDesc = new RTCSessionDescription(JSON.parse(data.clientOffer));
                await pc.setRemoteDescription(offerDesc);

                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // 2. adminAnswer를 JSON 문자열이 아닌 객체(toJSON()) 형태로 저장하여 통일
                await updateDoc(userDocRef, {
                    adminAnswer: answer.toJSON()
                });
            }

            // B. 클라이언트의 복수 ICE Candidate 객체 배열 처리
            if (data.clientCandidates && Array.isArray(data.clientCandidates)) {
                for (const candidateObj of data.clientCandidates) {
                    if (!candidateObj) continue;
                    
                    const candidateKey = `${candidateObj.candidate}_${candidateObj.sdpMid}_${candidateObj.sdpMLineIndex}`;
                    
                    if (!processedCandidates.has(candidateKey)) {
                        processedCandidates.add(candidateKey);
                        await pc.addIceCandidate(new RTCIceCandidate(candidateObj));
                    }
                }
            }
        } catch (error) {
            console.error(`[Admin WebRTC] ${targetId} 데이터 파싱/설정 중 오류:`, error);
        }
    }, async (error) => {
        console.error(`[Admin WebRTC] ${targetId} 리스너 에러 발생:`, error);
        await stopAdminSignaling(targetId);
    });

    const currentData = peerConnections.get(targetId);
    if (currentData) {
        currentData.unsubscribe = unsubscribe;
    }
}

/**
 * 특정 클라이언트와의 연결 종료 및 Firestore 리소스 완전 클린업 (async 함수로 명확히 대기 가능)
 * @param {string} targetId 
 */
export async function stopAdminSignaling(targetId) {
    const connectionData = peerConnections.get(targetId);
    if (!connectionData) return;

    if (connectionData.isClosing) return;
    connectionData.isClosing = true;

    console.log(`[Admin WebRTC] ${targetId} 리소스 클린업 시작`);

    // 1. Firestore 실시간 리스너 즉시 해제
    if (connectionData.unsubscribe) {
        try {
            connectionData.unsubscribe();
        } catch (e) {
            console.error("Firestore 리스너 해제 에러:", e);
        }
    }

    // 2. WebRTC PeerConnection 완전 해제
    const pc = connectionData.pc;
    if (pc) {
        try {
            pc.close();
        } catch (e) {
            console.error("PeerConnection 해제 에러:", e);
        }
    }

    // 3. 연결 해제 시 viewer.js의 비디오 스트림 객체를 안전하게 비움
    if (connectionData.remoteVideoElement) {
        try {
            connectionData.remoteVideoElement.srcObject = null;
        } catch (e) {
            console.error("비디오 스트림 비우기 실패:", e);
        }
    }

    // 4. 내부 활성 맵 데이터 완전 삭제
    peerConnections.delete(targetId);

    // 5. Firestore 내 잔여 시그널링 데이터 필드 정리
    try {
        const colName = getCollectionName(targetId);
        const userDocRef = doc(db, colName, targetId);

        await updateDoc(userDocRef, {
            clientOffer: deleteField(),
            adminAnswer: deleteField(),
            clientCandidates: deleteField(),
            adminCandidates: deleteField()
        });
    } catch (error) {
        console.warn(`[Admin WebRTC] ${targetId} Firestore 필드 제거 스킵 또는 실패:`, error);
    }
}

/**
 * 현재 활성화된 모든 연결 자원을 일괄 종료 및 정리
 */
export async function clearAllConnections() {
    for (const targetId of peerConnections.keys()) {
        await stopAdminSignaling(targetId);
    }
}

/**
 * --------------------------------------------
 * viewer.js 등 외부 모듈용 인터페이스 유틸리티 함수
 * --------------------------------------------
 */

/**
 * 전체 객체 정보 묶음 반환 ({ pc, unsubscribe, state, isClosing, remoteVideoElement })
 */
export function getConnection(targetId) {
    return peerConnections.get(targetId) || null;
}

/**
 * 현재 연결된 텍스트 상태 문자열 반환 (예: 'connected', 'connecting', 'disconnected' 등)
 */
export function getConnectionState(targetId) {
    const connectionData = peerConnections.get(targetId);
    return connectionData ? connectionData.state : "none";
}

/**
 * 현재 세션이 완전 정상(connected) 상태인지 직관적으로 여부 확인
 */
export function isConnected(targetId) {
    const connectionData = peerConnections.get(targetId);
    return connectionData ? connectionData.state === "connected" : false;
}
