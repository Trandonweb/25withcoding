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
    if (!userList || !conversationList) {
        console.error("관리자 로그 UI 요소가 없습니다.");
        return;
    }

    userList.innerHTML = '<div class="settings-empty">사용자 목록을 불러오는 중...</div>';
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
                rows.push({
                    uid,
                    cid: conversation.id,
                    data,
                    messages: messages.docs.map(message => ({ id: message.id, ...message.data() }))
                });
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
            userList.innerHTML = '<div class="settings-empty">사용자가 없습니다.</div>';
            return;
        }

        adminUserGroups.forEach((group, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "admin-user-card";
            const initial = escapeHtml((group.name || "?").charAt(0).toUpperCase());
            button.innerHTML = `<span class="admin-user-avatar">${initial}</span><span><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.uid)} · ${escapeHtml(group.role)} · ${group.rows.length}개 대화</small></span><b aria-hidden="true">›</b>`;
            button.addEventListener("click", () => {
                document.querySelectorAll(".admin-user-card").forEach(item => item.classList.remove("active"));
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
        userList.innerHTML = '<div class="settings-empty error">대화 로그를 불러오지 못했습니다. Firestore 권한을 확인해주세요.</div>';
        conversationList.hidden = true;
    }
}

function renderUserConversations(group, conversationList) {
    conversationList.hidden = false;
    conversationList.innerHTML = "";

    const back = document.createElement("div");
    back.className = "admin-log-back";
    back.innerHTML = `<button type="button" class="admin-log-back-button">‹ 사용자 목록</button><strong>${escapeHtml(group.name)}의 대화</strong>`;
    back.querySelector("button").addEventListener("click", () => {
        conversationList.hidden = true;
        $("adminUserList")?.scrollIntoView({ block: "nearest" });
    });
    conversationList.appendChild(back);

    if (!group.rows.length) {
        conversationList.insertAdjacentHTML("beforeend", '<div class="settings-empty">이 사용자의 대화가 없습니다.</div>');
        return;
    }

    group.rows.forEach(row => {
        const element = document.createElement("details");
        element.className = "admin-log-conversation";

        const visibilityLabel = row.data.hiddenFromUser ? "사용자 화면에서 삭제됨" : row.data.isDeleted ? "휴지통" : "일반";
        const messagesHtml = row.messages.map(message => {
            const role = message.role === "user" ? "사용자" : "COBY";
            const roleClass = message.role === "user" ? "user" : "coby";
            return `<div class="admin-message ${roleClass}"><span>${role}</span><p>${escapeHtml(plainCobyText(message.content || ""))}</p></div>`;
        }).join("");

        const summary = document.createElement("summary");
        summary.innerHTML = `<span>${escapeHtml(row.data.title || "새 대화")}</span><small>${formatDate(row.data.updatedAt)} · ${visibilityLabel} · ${row.messages.length}개 메시지</small>`;
        element.appendChild(summary);

        const body = document.createElement("div");
        body.className = "admin-log-messages";
        body.innerHTML = messagesHtml || '<div class="settings-empty">메시지가 없습니다.</div>';

        // 관리자 전용 DB 삭제 영역을 메시지 영역과 분리한다.
        // CSS가 누락되거나 다른 버전의 CSS가 캐시되어도 버튼이 반드시 보이도록 최소 스타일을 직접 지정한다.
        const deleteArea = document.createElement("div");
        deleteArea.className = "admin-db-delete-area";
        deleteArea.style.cssText = "display:flex;justify-content:flex-end;margin-top:12px;padding-top:10px;border-top:1px solid var(--border,#e4e4e4);";

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "admin-db-delete danger-btn";
        deleteButton.textContent = "DB 영구 삭제";
        deleteButton.setAttribute("aria-label", `${row.data.title || "새 대화"} DB 영구 삭제`);
        deleteButton.style.cssText = "display:inline-flex !important;align-items:center;justify-content:center;visibility:visible !important;opacity:1 !important;pointer-events:auto !important;min-height:38px;padding:9px 14px;border:1px solid #d9534f;border-radius:10px;background:#fff;color:#c62828;font-weight:800;font-size:12px;cursor:pointer;position:relative;z-index:2;";

        deleteButton.addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();

            const title = row.data.title || "새 대화";
            if (!confirm(`'${title}'의 대화와 메시지를 Firebase에서 영구 삭제할까요?\n\n이 작업은 되돌릴 수 없습니다.`)) return;

            deleteButton.disabled = true;
            deleteButton.textContent = "삭제 중...";
            deleteButton.style.opacity = "0.6";

            try {
                const ok = await deleteConversationFromDb(row.uid, row.cid);
                if (!ok) throw new Error("deleteConversationFromDb returned false");

                group.rows = group.rows.filter(item => item.cid !== row.cid);
                element.remove();

                if (!group.rows.length) {
                    conversationList.insertAdjacentHTML("beforeend", '<div class="settings-empty">이 사용자의 대화가 없습니다.</div>');
                }

                if (row.uid === state.currentUserId && row.cid === state.currentConversationId) {
                    state.currentConversationId = null;
                    await createConversation(state.currentProjectId);
                }

                await loadChats();
                await loadTrash();
            } catch (error) {
                console.error("관리자 DB 영구 삭제 실패:", error);
                alert("DB 삭제에 실패했습니다. 콘솔에서 오류를 확인해주세요.");
                deleteButton.disabled = false;
                deleteButton.textContent = "DB 영구 삭제";
                deleteButton.style.opacity = "1";
            }
        });

        deleteArea.appendChild(deleteButton);
        body.appendChild(deleteArea);
        element.appendChild(body);
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

    if (modal.contains(document.activeElement)) document.activeElement.blur();
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
}

window.openAdminLogs = openAdminLogs;
window.closeAdminLogs = closeAdminLogs;
