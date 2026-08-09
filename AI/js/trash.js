import { state, $ } from "./state.js";
import { db, doc, getDocs, collection, query, orderBy, updateDoc, serverTimestamp } from "./firebase.js";
import { escapeHtml, formatDate, closeMenu } from "./ui.js";
import { loadChats, createConversation } from "./conversations.js";

const conversations = () => collection(db, "people", state.currentUserId, "conversations");

export async function loadTrash() {
    if (!state.currentUserId) return;
    const snapshot = await getDocs(query(conversations(), orderBy("updatedAt", "desc")));
    const docs = snapshot.docs.filter(item => item.data().isDeleted);
    $("trashList").innerHTML = "";

    if (!docs.length) {
        $("trashList").innerHTML = '<div class="empty-chat">휴지통이 비어 있습니다.</div>';
        return;
    }

    docs.forEach(item => {
        const data = item.data();
        const element = document.createElement("div");
        element.className = "system-item";
        element.innerHTML = `<div><strong>${escapeHtml(data.title || "새 대화")}</strong><div class="system-meta">삭제됨 ${formatDate(data.deletedAt || data.updatedAt)}</div></div><button class="restore-btn" type="button">복구</button>`;
        element.querySelector(".restore-btn").onclick = () => restoreConversation(item.id);
        $("trashList").appendChild(element);
    });
}

export async function restoreConversation(id) {
    if (!state.currentUserId || !id) return;
    try {
        await updateDoc(doc(db, "people", state.currentUserId, "conversations", id), {
            isDeleted: false,
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
