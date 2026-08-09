import { state, $, isAdmin } from "./state.js";
import { db, doc, getDocs, collection, query, orderBy, updateDoc, serverTimestamp } from "./firebase.js";
import { escapeHtml, formatDate, closeMenu } from "./ui.js";
import { loadChats } from "./conversations.js";

const conversations = () => collection(db, "people", state.currentUserId, "conversations");

export async function loadTrash() {
    if (!state.currentUserId) return;
    const snapshot = await getDocs(query(conversations(), orderBy("updatedAt", "desc")));
    const docs = snapshot.docs.filter(item => {
        const data = item.data();
        return data.isDeleted && !data.hiddenFromUser;
    });
    $("trashList").innerHTML = "";

    if (!docs.length) {
        $("trashList").innerHTML = '<div class="empty-chat">휴지통이 비어 있습니다.</div>';
        return;
    }

    docs.forEach(item => {
        const data = item.data();
        const element = document.createElement("div");
        element.className = "system-item";
        element.innerHTML = `<div><strong>${escapeHtml(data.title || "새 대화")}</strong><div class="system-meta">삭제됨 ${formatDate(data.deletedAt || data.updatedAt)}</div></div><div class="trash-actions"><button class="restore-btn" type="button">복구</button><button class="permanent-delete-btn" type="button">영구 삭제</button></div>`;
        element.querySelector(".restore-btn").onclick = () => restoreConversation(item.id);
        element.querySelector(".permanent-delete-btn").onclick = () => hideFromUser(item.id, data.title || "이 대화");
        $("trashList").appendChild(element);
    });
}

export async function restoreConversation(id) {
    if (!state.currentUserId || !id) return;
    try {
        await updateDoc(doc(db, "people", state.currentUserId, "conversations", id), {
            isDeleted: false,
            hiddenFromUser: false,
            restoredAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        await loadTrash();
        await loadChats();
    } catch (error) {
        console.error(error);
        alert("대화 복구에 실패했습니다.");
    }
}

async function hideFromUser(id, title) {
    if (!state.currentUserId || !id) return;
    if (!confirm(`"${title}"을(를) 영구 삭제할까요?\n\n사용자 화면에서는 완전히 사라집니다.`)) return;

    try {
        // 사용자 화면에서는 영구 삭제처럼 숨기지만, 실제 데이터는 보존하여 관리자의 전체 대화 로그에는 남긴다.
        await updateDoc(doc(db, "people", state.currentUserId, "conversations", id), {
            hiddenFromUser: true,
            userPurgedAt: serverTimestamp(),
            userPurgedBy: state.currentUserId,
            updatedAt: serverTimestamp()
        });
        await loadTrash();
        await loadChats();
    } catch (error) {
        console.error(error);
        alert("영구 삭제 처리에 실패했습니다.");
    }
}

export async function openTrash() {
    closeMenu();
    $("trashModal").classList.add("show");
    $("trashModal").setAttribute("aria-hidden", "false");
    await loadTrash();
}

export function closeTrash() {
    $("trashModal").classList.remove("show");
    $("trashModal").setAttribute("aria-hidden", "true");
}
