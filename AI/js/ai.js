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
    let history = [...recentDocs].reverse().map(extractMessage);

    if (!needsOlderHistory(text) || recentDocs.length < 40) return history;

    // 과거 참조가 명확할 때만 한 페이지씩 추가한다.
    // 이전 페이지가 필요할 때마다 호출자가 다시 요청하도록 하여 무제한 조회를 피한다.
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
                uiInstructions: COBY_UI_INSTRUCTIONS
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
