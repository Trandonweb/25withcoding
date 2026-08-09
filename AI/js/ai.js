import { state, $ } from "./state.js";
import { db, API_URL, doc, getDoc, getDocs, addDoc, collection, query, orderBy, limit, serverTimestamp, updateDoc } from "./firebase.js";
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

/**
 * 기본 AI 컨텍스트는 가장 최근 40개만 가져온다.
 * Firestore는 최신순으로 가져온 뒤 다시 시간순으로 뒤집는다.
 */
export async function getConversationHistory() {
    if (!state.currentConversationId) return [];
    const snapshot = await getDocs(query(messagesRef(), orderBy("createdAt", "desc"), limit(40)));
    return snapshot.docs.reverse().map(extractMessage);
}

/**
 * 필요할 때만 더 오래된 메시지를 추가 조회한다.
 * beforeTimestamp는 현재 AI 컨텍스트에서 가장 오래된 메시지의 createdAt이다.
 */
export async function getOlderConversationHistory(beforeTimestamp, count = 40) {
    if (!state.currentConversationId || !beforeTimestamp) return [];
    const snapshot = await getDocs(query(
        messagesRef(),
        orderBy("createdAt", "desc"),
        limit(40 + count)
    ));

    const older = snapshot.docs
        .filter(item => {
            const createdAt = item.data().createdAt;
            return createdAt?.toMillis && createdAt.toMillis() < beforeTimestamp.toMillis();
        })
        .slice(0, count)
        .reverse()
        .map(extractMessage);

    return older;
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

    const history = await getConversationHistory();
    const projectContext = await getProjectContext();
    addMessage("user", text);
    input.value = "";
    input.style.height = "auto";

    try {
        await addDoc(messagesRef(), {
            role: "user",
            content: text,
            createdAt: serverTimestamp()
        });

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
        await addDoc(messagesRef(), {
            role: "assistant",
            content: answer,
            createdAt: serverTimestamp()
        });
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
