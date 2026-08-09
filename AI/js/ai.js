import { state, $ } from "./state.js";
import { db, API_URL, doc, getDoc, getDocs, addDoc, query, orderBy, limit, startAfter, serverTimestamp, updateDoc } from "./firebase.js";
import { messagesRef, createConversation, loadChats } from "./conversations.js";
import { getProjectContext } from "./projects.js";
import { addMessage } from "./ui.js";

export const COBY_UI_INSTRUCTIONS = {
    name: "COBY markup",
    system: "COBY 답변은 아래 전용 마크업을 우선 사용한다. ***텍스트***는 굵게, <<<내용>>>은 사용자가 한 번에 복사할 내용이나 코드, [[[내용]]]은 주의/경고, {{{내용}}}은 성공/완료, (((내용)))은 팁, ---는 구분선이다. 마크업 기호 자체를 설명문으로 노출하지 않는다. 코드 복사에는 Markdown ``` 코드펜스를 사용하지 않고 <<< >>>를 사용한다. 일반적인 설명은 COBY의 본문형 답변으로 작성하고, 필요한 경우에만 마크업을 사용한다.",
    rules: [
        "***text*** = bold",
        "<<<content>>> = copy block",
        "[[[content]]] = warning",
        "{{{content}}} = success",
        "(((content))) = tip",
        "--- = divider",
        "Do not expose the markup delimiters as an explanation",
        "Use <<< >>> instead of Markdown triple-backtick code fences",
        "Keep normal explanations as readable COBY body text"
    ]
};

const extractMessage = item => {
    const data = item.data();
    return { role: data.role, content: data.content };
};

export async function getConversationHistory() {
    if (!state.currentConversationId) return [];
    const snapshot = await getDocs(query(messagesRef(), orderBy("createdAt", "desc"), limit(40)));
    return snapshot.docs.reverse().map(extractMessage);
}

export async function getOlderConversationHistory(beforeTimestamp, count = 40) {
    if (!state.currentConversationId || !beforeTimestamp) return [];

    const snapshot = await getDocs(query(
        messagesRef(),
        orderBy("createdAt", "desc"),
        startAfter(beforeTimestamp),
        limit(count)
    ));

    return snapshot.docs.reverse().map(extractMessage);
}

function needsOlderHistory(text) {
    return /(아까|이전|전에|방금 전|위에서|앞에서|처음에|지난|예전에|전에 말한|앞서|기억|전에 했던|이전 대화|이전 내용|저번|지난번)/i.test(text);
}

async function getHistoryForRequest(text) {
    if (!state.currentConversationId) return [];

    const recentSnapshot = await getDocs(query(
        messagesRef(),
        orderBy("createdAt", "desc"),
        limit(40)
    ));

    const recentDocs = recentSnapshot.docs;
    const oldestRecentDoc = recentDocs[recentDocs.length - 1] || null;
    let history = [...recentDocs].reverse().map(extractMessage);

    // 평소에는 최근 40개만 사용한다. 사용자가 이전 대화를 명시적으로
    // 참조할 때만 가장 오래된 최근 메시지보다 앞선 내용을 추가 조회한다.
    if (needsOlderHistory(text) && oldestRecentDoc) {
        const oldestTimestamp = oldestRecentDoc.data()?.createdAt;
        if (oldestTimestamp) {
            const older = await getOlderConversationHistory(oldestTimestamp, 40);
            history = [...older, ...history];
        }
    }

    return history;
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
                title: conversation.title && conversation.title !== "새 대화"
                    ? conversation.title
                    : (text.length > 35 ? text.slice(0, 35) + "…" : text),
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
                user: {
                    id: state.currentUserId,
                    name: state.currentPerson?.name || "사용자",
                    role: state.currentPerson?.role || "student"
                },
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
