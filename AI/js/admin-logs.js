import { state, $, isAdmin } from "./state.js";
import { db, doc, getDocs, collection, query, orderBy, updateDoc, serverTimestamp } from "./firebase.js";
import { escapeHtml, formatDate, closeMenu } from "./ui.js";
import { conversationsRoot, deleteConversationFromDb, loadChats } from "./conversations.js";
import { loadTrash } from "./trash.js";
import { plainCobyText } from "./coby-markup.js";

let adminUserGroups = [];

export async function loadAdminLogs() {
    if (!isAdmin()) return alert("관리자 권한이 필요합니다.");
    const userList = $("adminUserList"), conversationList = $("adminConversationList");
    if (!userList || !conversationList) return console.error("관리자 로그 UI 요소가 없습니다.");
    userList.innerHTML = '<div class="settings-empty">사용자 목록을 불러오는 중...</div>';
    conversationList.hidden = true;
    conversationList.innerHTML = "";

    try {
        const users = await getDocs(collection(db, "people"));
        adminUserGroups = [];

        for (const user of users.docs) {
            const uid = user.id;
            const data = user.data();
            const rows = [];
            const conversations = await getDocs(query(conversationsRoot(uid), orderBy("updatedAt", "desc")));

            for (const conversation of conversations.docs) {
                const cdata = conversation.data();
                const messages = await getDocs(
                    query(
                        collection(db, "people", uid, "conversations", conversation.id, "messages"),
                        orderBy("createdAt", "asc")
                    )
                );
                rows.push({
                    uid,
                    cid: conversation.id,
                    data: cdata,
                    messages: messages.docs.map(m => ({ id: m.id, ...m.data() }))
                });
            }

            adminUserGroups.push({
                uid,
                name: data.name || data.displayName || uid,
                role: data.role || "student",
                rows
            });
        }

        userList.innerHTML = "";
        if (!adminUserGroups.length) {
            userList.innerHTML = '<div class="settings-empty">사용자가 없습니다.</div>';
            return;
        }

        adminUserGroups.forEach((group, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "admin-user-card";
            button.innerHTML = `<span class="admin-user-avatar">${escapeHtml((group.name || "?").charAt(0).toUpperCase())}</span><span><strong>${escapeHtml(group.name)}</strong><small>${escapeHtml(group.uid)} · ${escapeHtml(group.role)} · ${group.rows.length}개 대화</small></span><b>›</b>`;
            button.onclick = () => {
                document.querySelectorAll(".admin-user-card").forEach(x => x.classList.remove("active"));
                button.classList.add("active");
                renderUserConversations(group, conversationList);
            };
            userList.appendChild(button);
            if (index === 0) {
                button.classList.add("active");
                renderUserConversations(group, conversationList);
            }
        });
    } catch (error) {
        console.error("관리자 대화 로그 로드 실패:", error);
        userList.innerHTML = '<div class="settings-empty error">대화 로그를 불러오지 못했습니다.</div>';
        conversationList.hidden = true;
    }
}

function renderUserConversations(group, list) {
    list.hidden = false;
    list.innerHTML = "";

    const back = document.createElement("div");
    back.className = "admin-log-back";
    back.innerHTML = `<button type="button" class="admin-log-back-button">‹ 사용자 목록</button><strong>${escapeHtml(group.name)}의 대화</strong>`;
    back.querySelector("button").onclick = () => { list.hidden = true; };
    list.appendChild(back);

    const tabs = document.createElement("div");
    tabs.className = "admin-log-tabs";
    tabs.innerHTML = '<button type="button" class="admin-log-tab active" data-tab="normal">대화</button><button type="button" class="admin-log-tab" data-tab="trash">휴지통</button>';
    list.appendChild(tabs);

    const content = document.createElement("div");
    content.className = "admin-log-tab-content";
    list.appendChild(content);

    const render = tab => {
        tabs.querySelectorAll(".admin-log-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));

        // 기존 데이터까지 놓치지 않도록 휴지통은 isDeleted 또는 hiddenFromUser 둘 중 하나라도 있으면 표시한다.
        const rows = tab === "trash"
            ? group.rows.filter(r => r.data.isDeleted === true || r.data.hiddenFromUser === true)
            : group.rows.filter(r => !r.data.isDeleted && !r.data.hiddenFromUser);

        content.innerHTML = "";
        if (!rows.length) {
            content.innerHTML = `<div class="settings-empty">${tab === "trash" ? "휴지통이 비어 있습니다." : "대화가 없습니다."}</div>`;
            return;
        }

        rows.forEach(row => renderConversation(row, group, content, tab, render));
    };

    tabs.querySelectorAll(".admin-log-tab").forEach(tab => {
        tab.addEventListener("click", () => render(tab.dataset.tab));
    });

    render("normal");
}

function renderConversation(row, group, content, tab, refresh) {
    const element = document.createElement("details");
    element.className = "admin-log-conversation";

    const isHiddenFromUser = row.data.hiddenFromUser === true;
    const isTrash = row.data.isDeleted === true;
    const status = isHiddenFromUser ? "사용자에게 영구 삭제됨" : isTrash ? "휴지통" : "일반";

    const summary = document.createElement("summary");
    summary.innerHTML = `<span>${escapeHtml(row.data.title || "새 대화")}</span><small>${formatDate(row.data.updatedAt)} · ${status} · ${row.messages.length}개 메시지</small>`;
    element.appendChild(summary);

    const body = document.createElement("div");
    body.className = "admin-log-messages";
    body.innerHTML = row.messages.map(m => `<div class="admin-message ${m.role === "user" ? "user" : "coby"}"><span>${m.role === "user" ? "사용자" : "COBY"}</span><p>${escapeHtml(plainCobyText(m.content || ""))}</p></div>`).join("") || '<div class="settings-empty">메시지가 없습니다.</div>';

    if (tab === "trash") {
        const actions = document.createElement("div");
        actions.className = "admin-trash-actions";

        const button = document.createElement("button");
        button.type = "button";
        button.className = isHiddenFromUser ? "admin-db-delete" : "admin-hide-delete";
        button.textContent = isHiddenFromUser ? "DB 삭제" : "영구 삭제";

        button.onclick = async event => {
            event.preventDefault();
            event.stopPropagation();

            if (isHiddenFromUser) {
                if (!confirm(`'${row.data.title || "새 대화"}'을 Firebase DB에서 실제로 삭제할까요?\n\n모든 메시지가 함께 삭제되며 되돌릴 수 없습니다.`)) return;
                button.disabled = true;
                button.textContent = "DB 삭제 중...";
                try {
                    await deleteConversationFromDb(row.uid, row.cid);
                    group.rows = group.rows.filter(x => x.cid !== row.cid);
                    element.remove();
                    await loadChats();
                    await loadTrash();
                    refresh("trash");
                } catch (error) {
                    console.error("관리자 DB 삭제 실패:", error);
                    alert("DB 삭제에 실패했습니다.");
                    button.disabled = false;
                    button.textContent = "DB 삭제";
                }
                return;
            }

            if (!confirm(`'${row.data.title || "새 대화"}'을 사용자 화면에서 영구 삭제할까요?\n\n관리자 로그에는 남습니다.`)) return;
            button.disabled = true;
            button.textContent = "처리 중...";
            try {
                await updateDoc(doc(db, "people", row.uid, "conversations", row.cid), {
                    hiddenFromUser: true,
                    userPurgedAt: serverTimestamp(),
                    userPurgedBy: state.currentUserId,
                    updatedAt: serverTimestamp()
                });
                row.data.hiddenFromUser = true;
                button.className = "admin-db-delete";
                button.textContent = "DB 삭제";
                button.disabled = false;
            } catch (error) {
                console.error("관리자 영구 삭제 처리 실패:", error);
                alert("영구 삭제 처리에 실패했습니다.");
                button.disabled = false;
                button.textContent = "영구 삭제";
            }
        };

        actions.appendChild(button);
        body.appendChild(actions);
    }

    element.appendChild(body);
    content.appendChild(element);
}

export async function openAdminLogs() {
    if (!isAdmin()) return alert("관리자 권한이 필요합니다.");
    closeMenu();
    const modal = $("adminLogsModal");
    if (!modal) return console.error("adminLogsModal 요소를 찾을 수 없습니다.");
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
