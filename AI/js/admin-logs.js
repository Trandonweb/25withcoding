import {
    collection,
    getDocs,
    getDoc,
    doc,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

export function isCobyAdmin(role) {
    return role === "president" || role === "vice";
}

export async function loadAdminConversationLogs(db, currentUser) {
    if (!currentUser || !isCobyAdmin(currentUser.role)) {
        throw new Error("관리자 권한이 필요합니다.");
    }

    const usersSnap = await getDocs(collection(db, "users"));
    const result = [];

    for (const userDoc of usersSnap.docs) {
        const user = { id: userDoc.id, ...userDoc.data() };
        const conversationsSnap = await getDocs(
            collection(db, "users", user.id, "conversations")
        );

        for (const conversationDoc of conversationsSnap.docs) {
            const conversation = conversationDoc.data();
            const messagesSnap = await getDocs(
                query(
                    collection(db, "users", user.id, "conversations", conversationDoc.id, "messages"),
                    orderBy("createdAt", "asc")
                )
            );

            result.push({
                user,
                conversation: {
                    id: conversationDoc.id,
                    ...conversation
                },
                messages: messagesSnap.docs.map(messageDoc => ({
                    id: messageDoc.id,
                    ...messageDoc.data()
                }))
            });
        }
    }

    return result.sort((a, b) => {
        const aTime = a.conversation.updatedAt?.toMillis?.() || 0;
        const bTime = b.conversation.updatedAt?.toMillis?.() || 0;
        return bTime - aTime;
    });
}

export async function permanentlyDeleteConversation(db, currentUser, userId, conversationId) {
    if (!currentUser || !isCobyAdmin(currentUser.role)) {
        throw new Error("관리자 권한이 필요합니다.");
    }

    const messagesRef = collection(
        db,
        "users",
        userId,
        "conversations",
        conversationId,
        "messages"
    );

    const messagesSnap = await getDocs(messagesRef);
    for (const messageDoc of messagesSnap.docs) {
        await deleteDoc(messageDoc.ref);
    }

    await deleteDoc(
        doc(db, "users", userId, "conversations", conversationId)
    );
}

export function renderAdminLogCard(item, escapeHtml) {
    const deleted = item.conversation.isDeleted === true;
    const title = escapeHtml(item.conversation.title || "새 대화");
    const name = escapeHtml(item.user.name || item.user.id);

    return `
        <article class="coby-log-card" data-user-id="${escapeHtml(item.user.id)}" data-conversation-id="${escapeHtml(item.conversation.id)}">
            <div class="coby-log-head">
                <div>
                    <strong>${title}</strong>
                    <div class="coby-log-user">${name} (${escapeHtml(item.user.id)})</div>
                </div>
                ${deleted ? '<span class="coby-log-trash">휴지통</span>' : ''}
            </div>
            <div class="coby-log-messages">
                ${item.messages.map(message => `
                    <div class="coby-log-message ${message.role === "user" ? "user" : "assistant"}">
                        <b>${message.role === "user" ? "사용자" : "COBY"}</b>
                        <div>${escapeHtml(message.content || "")}</div>
                    </div>
                `).join("") || '<div class="coby-log-empty">메시지가 없습니다.</div>'}
            </div>
            <button class="danger coby-db-delete" data-user-id="${escapeHtml(item.user.id)}" data-conversation-id="${escapeHtml(item.conversation.id)}">
                DB에서 영구 삭제
            </button>
        </article>
    `;
}
