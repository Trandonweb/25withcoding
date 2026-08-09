import { state, $, isAdmin } from "./state.js";
import { db, doc, getDocs, collection, query, orderBy, deleteDoc } from "./firebase.js";
import { escapeHtml, formatDate, closeMenu } from "./ui.js";
import { conversationsRoot, deleteConversationFromDb, createConversation, loadChats } from "./conversations.js";
import { loadTrash } from "./trash.js";
import { plainCobyText } from "./coby-markup.js";

export async function loadAdminLogs() {
    if (!isAdmin()) {
        alert("관리자 권한이 필요합니다.");
        return;
    }

    const list = $("adminLogsList");
    list.innerHTML = '<div class="empty-chat">로그를 불러오는 중...</div>';

    try {
        const users = await getDocs(collection(db, "people"));
        const rows = [];

        for (const user of users.docs) {
            const uid = user.id;
            const conversations = await getDocs(query(conversationsRoot(uid), orderBy("updatedAt", "desc")));

            for (const conversation of conversations.docs) {
                const data = conversation.data();
                const messages = await getDocs(query(
                    collection(db, "people", uid, "conversations", conversation.id, "messages"),
                    orderBy("createdAt", "asc")
                ));
                rows.push({
                    uid,
                    cid: conversation.id,
                    data,
                    messages: messages.docs.map(message => message.data())
                });
            }
        }

        rows.sort((a, b) => (b.data.updatedAt?.toMillis?.() || 0) - (a.data.updatedAt?.toMillis?.() || 0));
        list.innerHTML = "";

        if (!rows.length) {
            list.innerHTML = '<div class="empty-chat">대화 로그가 없습니다.</div>';
            return;
        }

        rows.forEach(row => {
            const element = document.createElement("article");
            element.className = "admin-log-item";
            const messagesHtml = row.messages.map(message =>
                `<div class="admin-log-message"><b>${message.role === "user" ? "사용자" : "COBY"}</b><div>${escapeHtml(plainCobyText(message.content || ""))}</div></div>`
            ).join("");

            element.innerHTML = `<div class="admin-log-head"><div><strong>${escapeHtml(row.data.title || "새 대화")}</strong><div class="system-meta">사용자: ${escapeHtml(row.uid)} · ${formatDate(row.data.updatedAt)} ${row.data.isDeleted ? "· 휴지통" : ""}</div></div><button class="danger-btn" type="button">DB 삭제</button></div><details class="admin-log-details"><summary>대화 내용 보기 (${row.messages.length}개)</summary><div class="admin-log-messages">${messagesHtml || '<div class="empty-chat">메시지가 없습니다.</div>'}</div></details>`;

            element.querySelector(".danger-btn").onclick = async () => {
                if (!confirm(`'${row.data.title || "새 대화"}'의 대화와 메시지를 Firebase에서 영구 삭제할까요?`)) return;
                const button = element.querySelector(".danger-btn");
                button.disabled = true;
                const ok = await deleteConversationFromDb(row.uid, row.cid);
                if (!ok) {
                    alert("DB 삭제에 실패했습니다.");
                    button.disabled = false;
                    return;
                }

                element.remove();
                if (row.uid === state.currentUserId && row.cid === state.currentConversationId) {
                    state.currentConversationId = null;
                    await createConversation(state.currentProjectId);
                }
                await loadChats();
                await loadTrash();
            };

            list.appendChild(element);
        });
    } catch (error) {
        console.error(error);
        list.innerHTML = '<div class="empty-chat">로그를 불러오지 못했습니다. Firestore 권한을 확인해주세요.</div>';
    }
}

export async function openAdminLogs() {
    if (!isAdmin()) {
        alert("관리자 권한이 필요합니다.");
        return;
    }
    closeMenu();
    $("adminLogsModal").classList.add("show");
    $("adminLogsModal").setAttribute("aria-hidden", "false");
    await loadAdminLogs();
}

export function closeAdminLogs() {
    $("adminLogsModal").classList.remove("show");
    $("adminLogsModal").setAttribute("aria-hidden", "true");
}
