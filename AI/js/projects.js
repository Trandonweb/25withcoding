import { state, $ } from "./state.js";
import { db, doc, getDoc, addDoc, getDocs, collection, query, orderBy, limit, serverTimestamp } from "./firebase.js";
import { escapeHtml, closeMenu } from "./ui.js";
import { createConversation } from "./conversations.js";

const projects = () => collection(db, "people", state.currentUserId, "projects");
const conversations = () => collection(db, "people", state.currentUserId, "conversations");

export async function loadProjects() {
    if (!state.currentUserId) return;
    const snapshot = await getDocs(query(projects(), orderBy("updatedAt", "desc"), limit(50)));
    const list = $("projectList");
    list.innerHTML = "";

    if (!snapshot.docs.length) {
        list.innerHTML = '<div class="empty-chat">프로젝트가 없습니다.</div>';
        return;
    }

    snapshot.docs.forEach(item => {
        const data = item.data();
        const element = document.createElement("div");
        element.className = "project-item" + (item.id === state.currentProjectId ? " active" : "");
        element.innerHTML = `<div>${escapeHtml(data.name || "이름 없는 프로젝트")}</div><div class="chat-date">${escapeHtml(data.description || "")}</div>`;
        element.onclick = () => selectProject(item.id, data);
        list.appendChild(element);
    });
}

export async function selectProject(id, data) {
    state.currentProjectId = id;
    state.currentProject = data;
    await createConversation(id);
    await loadProjects();
    closeMenu();
}

export function openProjectModal() {
    $("projectModal").classList.add("show");
    $("projectNameInput").focus();
}

export function closeProjectModal() {
    $("projectModal").classList.remove("show");
    $("projectNameInput").value = "";
    $("projectDescriptionInput").value = "";
}

export async function createProject() {
    if (!state.currentUserId) {
        alert("먼저 로그인해주세요.");
        return;
    }

    const name = $("projectNameInput").value.trim();
    const description = $("projectDescriptionInput").value.trim();
    if (!name) {
        alert("프로젝트 이름을 입력하세요.");
        return;
    }

    try {
        const result = await addDoc(projects(), {
            name,
            description,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        closeProjectModal();
        await loadProjects();
        await createConversation(result.id);
        closeMenu();
    } catch (error) {
        console.error(error);
        alert("프로젝트 생성에 실패했습니다.");
    }
}

export async function getProjectContext() {
    if (!state.currentProjectId || !state.currentUserId) return [];

    try {
        const snapshot = await getDocs(query(conversations(), orderBy("updatedAt", "desc"), limit(20)));
        const context = [];

        for (const conversation of snapshot.docs) {
            const data = conversation.data();
            if (data.projectId !== state.currentProjectId || conversation.id === state.currentConversationId || data.isDeleted) continue;

            const messages = await getDocs(query(
                collection(db, "people", state.currentUserId, "conversations", conversation.id, "messages"),
                orderBy("createdAt", "desc"),
                limit(6)
            ));

            [...messages.docs].reverse().forEach(message => {
                const data = message.data();
                context.push({ role: data.role, content: data.content });
            });
        }

        return context.slice(-30);
    } catch (error) {
        console.warn("프로젝트 컨텍스트 로드 실패", error);
        return [];
    }
}
