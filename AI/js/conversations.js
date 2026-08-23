import { state, $, isAdmin } from "./state.js";
import { db, doc, getDoc, addDoc, getDocs, collection, query, orderBy, serverTimestamp, updateDoc, deleteDoc } from "./firebase.js";
import { escapeHtml, formatDate, clearMessages, showWelcome, addMessage, closeMenu } from "./ui.js";

const people = () => collection(db, "people", state.currentUserId, "conversations");
export const messagesRef = () => collection(db, "people", state.currentUserId, "conversations", state.currentConversationId, "messages");
export const conversationsRoot = uid => collection(db, "people", uid, "conversations");
const savedConversationKey = () => `coby_current_conversation_${state.currentUserId}`;
const rememberConversation = id => { if (state.currentUserId && id) localStorage.setItem(savedConversationKey(), id); };
const forgetConversation = id => { if (localStorage.getItem(savedConversationKey()) === id) localStorage.removeItem(savedConversationKey()); };

export async function loadChats() {
    if (!state.currentUserId) return;
    const snapshot = await getDocs(query(people(), orderBy("updatedAt", "desc")));
    $("chatList").innerHTML = "";
    const docs = snapshot.docs.filter(item => !item.data().isDeleted);
    if (!docs.length) { $("chatList").innerHTML = '<div class="empty-chat">아직 대화가 없습니다.</div>'; return; }
    docs.forEach(item => {
        const data = item.data();
        const element = document.createElement("div");
        element.className = "chat-item" + (item.id === state.currentConversationId ? " active" : "");
        element.onclick = () => openConversation(item.id);
        element.innerHTML = `<div class="chat-title">${escapeHtml(data.title || "새 대화")}</div><div class="chat-date">${formatDate(data.updatedAt)}</div><button type="button" class="chat-rename" aria-label="채팅 제목 변경">✎</button><button type="button" class="chat-delete" aria-label="휴지통으로 이동">🗑</button>`;
        element.querySelector(".chat-rename").onclick = async event => { event.preventDefault(); event.stopPropagation(); await renameConversation(item.id, data.title || "새 대화"); };
        element.querySelector(".chat-delete").onclick = async event => { event.preventDefault(); event.stopPropagation(); if (confirm("이 대화를 휴지통으로 이동할까요?")) await moveToTrash(item.id); };
        $("chatList").appendChild(element);
    });
}

export async function renameConversation(id, currentTitle = "새 대화") {
    if (!state.currentUserId || !id) return;
    const title = prompt("새 채팅 제목을 입력하세요.", currentTitle);
    if (title === null) return;
    const trimmed = title.trim();
    if (!trimmed) { alert("채팅 제목을 입력해주세요."); return; }
    if (trimmed.length > 50) { alert("채팅 제목은 50자 이내로 입력해주세요."); return; }
    try { await updateDoc(doc(db, "people", state.currentUserId, "conversations", id), { title: trimmed, updatedAt: serverTimestamp() }); await loadChats(); }
    catch (error) { console.error("채팅 제목 변경 실패:", error); alert("채팅 제목을 변경하지 못했습니다."); }
}

export async function createConversation(projectId = null) {
    const result = await addDoc(people(), { title: "새 대화", projectId: projectId || null, isDeleted: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    state.currentConversationId = result.id;
    state.currentProjectId = projectId || null;
    rememberConversation(result.id);
    await showWelcome();
    await loadChats();
    return result.id;
}

export async function newChat() {
    if (!state.currentUserId) { alert("먼저 로그인해주세요."); return; }
    await createConversation(state.currentProjectId);
    closeMenu();
    $("userInput").focus();
}

export async function openConversation(id) {
    if (!state.currentUserId) return;
    const conversation = await getDoc(doc(db, "people", state.currentUserId, "conversations", id));
    if (!conversation.exists() || conversation.data().isDeleted) return;
    state.currentConversationId = id;
    rememberConversation(id);
    const data = conversation.data();
    state.currentProjectId = data.projectId || null;
    state.currentProject = null;
    if (state.currentProjectId) {
        const project = await getDoc(doc(db, "people", state.currentUserId, "projects", state.currentProjectId));
        if (project.exists()) state.currentProject = project.data();
    }
    const messages = await getDocs(query(messagesRef(), orderBy("createdAt", "asc")));
    clearMessages();
    if (messages.empty) await showWelcome();
    else messages.forEach(item => { const message = item.data(); addMessage(message.role, message.content); });
    await loadChats();
    closeMenu();
}

export async function moveToTrash(id) {
    if (!state.currentUserId || !id) return;
    try {
        await updateDoc(doc(db, "people", state.currentUserId, "conversations", id), { isDeleted: true, deletedAt: serverTimestamp(), deletedBy: state.currentUserId, updatedAt: serverTimestamp() });
        if (state.currentConversationId === id) { forgetConversation(id); state.currentConversationId = null; await createConversation(state.currentProjectId); }
        else await loadChats();
    } catch (error) { console.error(error); alert("휴지통으로 이동하지 못했습니다."); }
}

export async function deleteConversationFromDb(uid, id) {
    if (!isAdmin() || !uid || !id) return false;
    try { const snapshot = await getDocs(collection(db, "people", uid, "conversations", id, "messages")); await Promise.all(snapshot.docs.map(message => deleteDoc(message.ref))); await deleteDoc(doc(db, "people", uid, "conversations", id)); return true; }
    catch (error) { console.error(error); return false; }
}

export async function initializeConversation() {
    if (!state.currentUserId) return;
    try {
        const snapshot = await getDocs(query(people(), orderBy("updatedAt", "desc")));
        const savedId = localStorage.getItem(savedConversationKey());
        const saved = savedId ? snapshot.docs.find(item => item.id === savedId && !item.data().isDeleted) : null;
        const latest = snapshot.docs.find(item => !item.data().isDeleted);
        if (saved) await openConversation(saved.id);
        else if (latest) await openConversation(latest.id);
        else await createConversation(null);
    } catch (error) { console.error("초기 대화 로드 실패:", error); await showWelcome(); }
}
