import { state, $, isAdmin } from "./state.js";
import { db, getDocs, collection, query, orderBy } from "./firebase.js";
import { escapeHtml, formatDate, closeMenu } from "./ui.js";
import { conversationsRoot, deleteConversationFromDb, createConversation, loadChats } from "./conversations.js";
import { loadTrash } from "./trash.js";
import { plainCobyText } from "./coby-markup.js";

let adminUserGroups = [];

export async function loadAdminLogs() {
    if (!isAdmin()) {
        alert("관리자 권한이 필요합니다.");
        return;
    }

    const userList = $("adminUserList");
    const conversationList = $("adminConversationList");
    if (!userList || !conversationList) return;

    userList.innerHTML = '<div class="empty-chat">사용자 목록을 불러오는 중...</div>';
    conversationList.hidden = true;
    conversationList.innerHTML = "";

    try {
        const users = await getDocs(collection(db, "people"));
        adminUserGroups = [];

        for (const user of users.docs) {
            const uid = user.id;
            const userData = user.data();
            const conversations = await getDocs(query(conversationsRoot(uid), orderBy("updatedAt", "desc")));
            const rows = [];

            for (const conversation of conversations.docs) {
                const data = conversation.data();
                const messages = await getDocs(query(
                    collection(db, "people", uid, "conversations", conversation.id, "messages"),
                    orderBy("createdAt", "asc")
                ));
                rows.push({ uid, cid: conversation.id, data, messages: messages.docs.map(message => message.data()) });
            }

            adminUserGroups.push({
                uid,
                name: userData.name || userData.displayName || uid,
                role: userData.role || "student",
                rows
            });
        }

        adminUserGroups.sort((a, b) => {
            const aTime = a.rows[0]?.data.updatedAt?.toMillis?.() || 0;
            const bTime = b.rows[0]?.data.updatedAt?.toMillis?.() || 0;
            return bTime - aTime;
        });

        userList.innerHTML = "";
        if (!adminUserGroups.length) {
            userList.innerHTML = '<div class="empty-chat">사용자가 없습니다.</div>';
            return;
        }

        adminUserGroups.forEach((group, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "admin-user-select";
            button.innerHTML = `<span class="admin-user-select-main"><strong>${escapeHtml(group.name)}</strong><span>${escapeHtml(group.uid)}</span></span><span class="admin-user-select-meta">${escapeHtml(group.role)} · ${group.rows.length}개 대화</span>`;
            button.addEventListener("click", () => {
                document.querySelectorAll(".admin-user-select").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                renderUserConversations(group, conversationList);
            });
            userList.appendChild(button);
            if (index === 0) {
                button.classList.add("active");
                renderUserConversations(group, conversationList);
            }
        });
    } catch (error) {
        console.error("관리자 대화 로그 로드 실패:", error);
        userList.innerHTML = '<div class="empty-chat">대화 로그를 불러오지 못했습니다. Firestore 권한을 확인해주세요.</div>';
        conversationList.hidden = true;
    }
}

function renderUserConversations(group, conversationList) {
    conversationList.hidden = false;
    conversationList.innerHTML = `<div class="admin-selected-user"><div><strong>${escapeHtml(group.name)}</strong><span>${escapeHtml(group.uid)} · ${escapeHtml(group.role)}</span></div><span>${group.rows.length}개 대화</span></div>`;

    if (!group.rows.length) {
        conversationList.insertAdjacentHTML("beforeend", '<div class="empty-chat">이 사용자의 대화가 없습니다.</div>');
        return;
    }

    group.rows.forEach(row => {
        const element = document.createElement("article");
        element.className = "admin-log-item";
        const messagesHtml = row.messages.map(message => `<div class="admin-log-message"><b>${message.role === "user" ? "사용자" : "COBY"}</b><div>${escapeHtml(plainCobyText(message.content || ""))}</div></div>`).join("");
        const visibilityLabel = row.data.hiddenFromUser ? " · 사용자 화면에서 영구 삭제됨" : row.data.isDeleted ? " · 휴지통" : "";

        element.innerHTML = `<div class="admin-log-head"><div><strong>${escapeHtml(row.data.title || "새 대화")}</strong><div class="system-meta">${formatDate(row.data.updatedAt)}${visibilityLabel}</div></div><button class="danger-btn admin-db-delete" type="button">DB 영구 삭제</button></div><details class="admin-log-details"><summary>대화 내용 보기 (${row.messages.length}개)</summary><div class="admin-log-messages">${messagesHtml || '<div class="empty-chat">메시지가 없습니다.</div>'}</div></details>`;

        element.querySelector(".admin-db-delete").addEventListener("click", async () => {
            if (!confirm(`'${row.data.title || "새 대화"}'의 대화와 메시지를 Firebase에서 영구 삭제할까요?\n\n이 작업은 되돌릴 수 없습니다.`)) return;
            const button = element.querySelector(".admin-db-delete");
            button.disabled = true;
            button.textContent = "삭제 중...";
            const ok = await deleteConversationFromDb(row.uid, row.cid);
            if (!ok) {
                alert("DB 삭제에 실패했습니다.");
                button.disabled = false;
                button.textContent = "DB 영구 삭제";
                return;
            }
            element.remove();
            group.rows = group.rows.filter(item => item.cid !== row.cid);
            if (row.uid === state.currentUserId && row.cid === state.currentConversationId) {
                state.currentConversationId = null;
                await createConversation(state.currentProjectId);
            }
            await loadChats();
            await loadTrash();
        });
        conversationList.appendChild(element);
    });
}

export async function openAdminLogs() {
    if (!isAdmin()) {
        alert("관리자 권한이 필요합니다.");
        return;
    }
    closeMenu();
    const modal = $("adminLogsModal");
    if (!modal) {
        console.error("adminLogsModal 요소를 찾을 수 없습니다.");
        return;
    }
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    await loadAdminLogs();
}

export function closeAdminLogs() {
    const modal = $("adminLogsModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}
