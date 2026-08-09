import { collection, getDocs, doc, deleteDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function isCobyAdmin(role) {
    return role === "president" || role === "vice";
}

export async function loadAdminConversationLogs(db, currentUser) {
    if (!currentUser || !isCobyAdmin(currentUser.role)) throw new Error("관리자 권한이 필요합니다.");
    const usersSnap = await getDocs(collection(db, "people"));
    const result = [];
    for (const userDoc of usersSnap.docs) {
        const uid = userDoc.id;
        const conversationsSnap = await getDocs(query(collection(db, "people", uid, "conversations"), orderBy("updatedAt", "desc"), limit(100)));
        for (const conversationDoc of conversationsSnap.docs) {
            const messagesSnap = await getDocs(query(collection(db, "people", uid, "conversations", conversationDoc.id, "messages"), orderBy("createdAt", "asc"), limit(100)));
            result.push({
                user: { id: uid, ...userDoc.data() },
                conversation: { id: conversationDoc.id, ...conversationDoc.data() },
                messages: messagesSnap.docs.map(messageDoc => ({ id: messageDoc.id, ...messageDoc.data() }))
            });
        }
    }
    return result.sort((a,b)=>(b.conversation.updatedAt?.toMillis?.()||0)-(a.conversation.updatedAt?.toMillis?.()||0));
}

export async function permanentlyDeleteConversation(db, currentUser, userId, conversationId) {
    if (!currentUser || !isCobyAdmin(currentUser.role)) throw new Error("관리자 권한이 필요합니다.");
    const messagesSnap = await getDocs(collection(db, "people", userId, "conversations", conversationId, "messages"));
    await Promise.all(messagesSnap.docs.map(messageDoc => deleteDoc(messageDoc.ref)));
    await deleteDoc(doc(db, "people", userId, "conversations", conversationId));
}

export function renderAdminLogCard(item, escapeHtml) {
    const title = escapeHtml(item.conversation.title || "새 대화");
    const name = escapeHtml(item.user.name || item.user.id);
    return `<article class="coby-log-card"><div class="coby-log-head"><div><strong>${title}</strong><div class="coby-log-user">${name} (${escapeHtml(item.user.id)})</div></div>${item.conversation.isDeleted ? '<span class="coby-log-trash">휴지통</span>' : ''}</div><div class="coby-log-messages">${item.messages.map(message => `<div class="coby-log-message ${message.role === "user" ? "user" : "assistant"}"><b>${message.role === "user" ? "사용자" : "COBY"}</b><div>${escapeHtml(message.content || "")}</div></div>`).join("") || '<div class="coby-log-empty">메시지가 없습니다.</div>'}</div><button class="danger coby-db-delete" data-user-id="${escapeHtml(item.user.id)}" data-conversation-id="${escapeHtml(item.conversation.id)}">DB에서 영구 삭제</button></article>`;
}
