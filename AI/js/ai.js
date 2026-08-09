import { state, $ } from "./state.js";
import { db, API_URL, doc, getDoc, getDocs, addDoc, query, orderBy, limit, startAfter, serverTimestamp, updateDoc } from "./firebase.js";
import { messagesRef, createConversation, loadChats } from "./conversations.js";
import { getProjectContext } from "./projects.js";
import { addMessage } from "./ui.js";

export const COBY_UI_INSTRUCTIONS = {
    name: "COBY markup",
    system: "COBY 답변은 전용 마크업을 사용할 수 있다. ***텍스트***는 굵게, <<<내용>>>은 복사 블록, [[[내용]]]은 경고, {{{내용}}}은 성공, (((내용)))은 팁, ---는 구분선이다. 마크업 기호 자체를 설명문으로 노출하지 않는다. 코드 복사에는 <<< >>>를 사용한다.",
    rules: ["***text*** = bold", "<<<content>>> = copy block", "[[[content]]] = warning", "{{{content}}} = success", "(((content))) = tip", "--- = divider", "Do not expose delimiters", "Use <<< >>> for copyable code"]
};

export const COBY_USAGE_KNOWLEDGE = {
    purpose: "COBY는 25withcoding.kr의 AI 서비스이며, 사용자가 사이트 기능 사용법을 물으면 실제 구현된 기능을 기준으로 안내한다.",
    rules: [
        "사용법 질문에는 실제 구현된 기능만 안내하고 없는 기능을 있다고 말하지 않는다.",
        "버튼이나 메뉴 위치를 물으면 클릭 순서를 단계별로 설명한다.",
        "관리자 기능은 president 또는 vice 권한에서만 이용할 수 있다고 안내한다."
    ],
    features: [
        { name: "새 대화", usage: "왼쪽 사이드바의 새 대화 버튼으로 새 채팅을 시작한다." },
        { name: "채팅 제목 수정", usage: "왼쪽 채팅 목록에서 제목 수정 버튼을 눌러 원하는 제목으로 변경한다." },
        { name: "채팅 삭제", usage: "왼쪽 채팅 목록의 휴지통 버튼으로 채팅을 휴지통으로 이동한다." },
        { name: "휴지통", usage: "사이드바의 휴지통에서 삭제된 채팅을 확인한다. 복구하거나 영구 삭제할 수 있다." },
        { name: "프로젝트", usage: "프로젝트 메뉴에서 프로젝트를 만들고 대화를 연결한다. 프로젝트를 펼치면 연결된 채팅을 확인하고 선택할 수 있으며 프로젝트 안의 채팅도 삭제할 수 있다." },
        { name: "프로필 메뉴", usage: "사이드바 맨 아래 프로필을 누르면 위쪽에 메뉴가 나타나며 홈으로 또는 로그아웃을 선택할 수 있다." },
        { name: "홈", usage: "프로필 메뉴에서 홈으로를 선택하면 25withcoding.kr의 홈으로 이동한다." },
        { name: "로그아웃", usage: "프로필 메뉴에서 로그아웃을 선택하면 로그아웃 처리 후 25withcoding.kr/index.html로 이동한다." },
        { name: "AI 과거 대화", usage: "현재 대화의 최근 메시지를 우선 사용하며, 이전 대화를 명확히 언급하면 필요한 경우 과거 대화를 추가 조회해 답변한다." },
        { name: "관리자 대화 로그", usage: "president 또는 vice 권한 사용자는 설정에서 대화 로그 보기를 사용할 수 있다. 관리자는 사용자별 대화 로그를 볼 수 있으며 일반 사용자에게 관리자 로그 기능을 노출하지 않는다." },
        { name: "코드 복사", usage: "COBY가 코드를 제공할 때 복사 가능한 코드 블록으로 표시할 수 있으며 코드 블록의 복사 기능으로 쉽게 복사할 수 있다." }
    ]
};

const extractMessage = item => {
    const data = item.data();
    return { role: data.role, content: data.content };
};

export async function getConversationHistory() {
    if (!state.currentConversationId) return [];
    const snapshot = await getDocs(query(messagesRef(), orderBy("createdAt", "desc"), limit(40)));
    return [...snapshot.docs].reverse().map(extractMessage);
}

export async function getOlderConversationHistory(beforeTimestamp, count = 40) {
    if (!state.currentConversationId || !beforeTimestamp) return [];
    const snapshot = await getDocs(query(messagesRef(), orderBy("createdAt", "desc"), startAfter(beforeTimestamp), limit(count)));
    return [...snapshot.docs].reverse().map(extractMessage);
}

function needsOlderHistory(text) {
    return /(아까|이전|전에|방금 전|위에서|앞에서|처음에|지난|예전에|전에 말한|앞서|기억|전에 했던|이전 대화|이전 내용|저번|지난번)/i.test(text);
}

async function getHistoryForRequest(text) {
    if (!state.currentConversationId) return [];
    const recentSnapshot = await getDocs(query(messagesRef(), orderBy("createdAt", "desc"), limit(40)));
    const recentDocs = recentSnapshot.docs;
    const history = [...recentDocs].reverse().map(extractMessage);
    if (!needsOlderHistory(text) || recentDocs.length < 40) return history;
    const oldestRecentDoc = recentDocs[recentDocs.length - 1];
    const timestamp = oldestRecentDoc?.data()?.createdAt;
    if (!timestamp) return history;
    const older = await getOlderConversationHistory(timestamp, 40);
    return [...older, ...history];
}

function extractAssistantText(data) {
    return data?.reply ?? data?.response ?? data?.message ?? data?.content ?? data?.answer ?? "응답을 받지 못했습니다.";
}

export async function sendMessage() {
    if (state.isSending) return;
    const input = $("userInput");
    const text = input.value.trim();
    if (!text) return;
    if (!state.currentUserId) {
        alert("먼저 로그인해주세요.");
        return;
    }
    if (!state.currentConversationId) await createConversation(state.currentProjectId);

    state.isSending = true;
    $("sendButton").disabled = true;
    if ($("welcome")) $("welcome").remove();

    try {
        const history = await getHistoryForRequest(text);
        const projectContext = await getProjectContext();
        addMessage("user", text);
        input.value = "";
        input.style.height = "auto";
        await addDoc(messagesRef(), { role: "user", content: text, createdAt: serverTimestamp() });

        const conversationReference = doc(db, "people", state.currentUserId, "conversations", state.currentConversationId);
        const conversationSnapshot = await getDoc(conversationReference);
        if (conversationSnapshot.exists()) {
            const conversation = conversationSnapshot.data();
            await updateDoc(conversationReference, {
                title: conversation.title && conversation.title !== "새 대화" ? conversation.title : (text.length > 35 ? text.slice(0, 35) + "…" : text),
                updatedAt: serverTimestamp()
            });
        }

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: text,
                studentId: state.currentUserId,
                userId: state.currentUserId,
                conversationId: state.currentConversationId,
                projectId: state.currentProjectId,
                project: state.currentProject || null,
                context: projectContext,
                history,
                projectContext,
                user: { id: state.currentUserId, name: state.currentPerson?.name || "사용자", role: state.currentPerson?.role || "student" },
                uiInstructions: COBY_UI_INSTRUCTIONS,
                usageKnowledge: COBY_USAGE_KNOWLEDGE
            })
        });
        if (!response.ok) throw new Error(`API ${response.status}`);

        const result = await response.json();
        const answer = String(extractAssistantText(result));
        addMessage("assistant", answer);
        await addDoc(messagesRef(), { role: "assistant", content: answer, createdAt: serverTimestamp() });
        await updateDoc(conversationReference, { updatedAt: serverTimestamp() });
        await loadChats();
    } catch (error) {
        console.error("AI 요청 오류:", error);
        addMessage("assistant", `[[[COBY 응답을 가져오지 못했습니다.]]]\n\n${error.message || "잠시 후 다시 시도해주세요."}`);
    } finally {
        state.isSending = false;
        $("sendButton").disabled = false;
        input.focus();
    }
}
