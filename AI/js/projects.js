import { state, $ } from "./state.js";
import { db, doc, getDocs, addDoc, collection, query, orderBy, limit, serverTimestamp, updateDoc, deleteDoc } from "./firebase.js";
import { escapeHtml, formatDate, closeMenu } from "./ui.js";
import { createConversation, openConversation } from "./conversations.js";

const projects = () => collection(db, "people", state.currentUserId, "projects");
const conversations = () => collection(db, "people", state.currentUserId, "conversations");

async function getProjectConversations(projectId) {
    const snapshot = await getDocs(query(conversations(), orderBy("updatedAt", "desc"), limit(50)));
    return snapshot.docs.filter(item => {
        const data = item.data();
        return data.projectId === projectId && !data.isDeleted;
    });
}

export async function loadProjects() {
    if (!state.currentUserId) return;
    const snapshot = await getDocs(query(projects(), orderBy("updatedAt", "desc"), limit(50)));
    const list = $("projectList");
    list.innerHTML = "";

    if (!snapshot.docs.length) {
        list.innerHTML = '<div class="empty-chat">프로젝트가 없습니다.</div>';
        return;
    }

    for (const item of snapshot.docs) {
        const data = item.data();
        const details = document.createElement("details");
        details.className = "project-item" + (item.id === state.currentProjectId ? " active" : "");

        const summary = document.createElement("summary");
        summary.innerHTML = `<span class="project-summary-text"><span class="project-name">${escapeHtml(data.name || "이름 없는 프로젝트")}</span><span class="project-description">${escapeHtml(data.description || "")}</span></span><button type="button" class="project-delete" aria-label="프로젝트 삭제" title="프로젝트 삭제">🗑</button>`;

        const chatList = document.createElement("div");
        chatList.className = "project-chat-list";
        chatList.innerHTML = '<div class="empty-chat">대화를 불러오는 중...</div>';

        summary.addEventListener("click", event => {
            if (event.target.closest(".project-delete")) return;
            state.currentProjectId = item.id;
            state.currentProject = data;
        });

        summary.querySelector(".project-delete").addEventListener("click", async event => {
            event.preventDefault();
            event.stopPropagation();
            await deleteProject(item.id, data.name || "이 프로젝트");
        });

        details.addEventListener("toggle", async () => {
            if (!details.open) return;
            state.currentProjectId = item.id;
            state.currentProject = data;
            await loadProjectConversations(item.id, chatList);
        });

        details.append(summary, chatList);
        list.appendChild(details);
    }
}

async function loadProjectConversations(projectId, container) {
    try {
        const docs = await getProjectConversations(projectId);
        container.innerHTML = "";

        if (!docs.length) {
            container.innerHTML = '<div class="empty-chat project-empty">프로젝트 대화가 없습니다.</div>';
            return;
        }

        docs.forEach(item => {
            const data = item.data();
            const chat = document.createElement("button");
            chat.type = "button";
            chat.className = "project-chat" + (item.id === state.currentConversationId ? " active" : "");
            chat.innerHTML = `<span class="project-chat-title">${escapeHtml(data.title || "새 대화")}</span><span class="project-chat-date">${formatDate(data.updatedAt)}</span>`;
            chat.onclick = async () => {
                await openConversation(item.id);
                await loadProjects();
            };
            container.appendChild(chat);
        });
    } catch (error) {
        console.error("프로젝트 대화 로드 실패:", error);
        container.innerHTML = '<div class="empty-chat">대화를 불러오지 못했습니다.</div>';
    }
}

export async function selectProject(id, data) {
    state.currentProjectId = id;
    state.currentProject = data;
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

export async function deleteProject(projectId, projectName = "이 프로젝트") {
    if (!state.currentUserId || !projectId) return;

    const confirmed = confirm(`"${projectName}" 프로젝트를 삭제할까요?\n\n프로젝트에 속한 채팅은 삭제하지 않고 일반 대화로 보존합니다.`);
    if (!confirmed) return;

    try {
        const projectChats = await getProjectConversations(projectId);
        await Promise.all(projectChats.map(item =>
            updateDoc(doc(db, "people", state.currentUserId, "conversations", item.id), {
                projectId: null,
                updatedAt: serverTimestamp()
            })
        ));

        await deleteDoc(doc(db, "people", state.currentUserId, "projects", projectId));

        if (state.currentProjectId === projectId) {
            state.currentProjectId = null;
            state.currentProject = null;
        }

        await loadProjects();
    } catch (error) {
        console.error("프로젝트 삭제 실패:", error);
        alert("프로젝트를 삭제하지 못했습니다.");
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
                const messageData = message.data();
                context.push({ role: messageData.role, content: messageData.content });
            });
        }

        return context.slice(-30);
    } catch (error) {
        console.warn("프로젝트 컨텍스트 로드 실패", error);
        return [];
    }
}
