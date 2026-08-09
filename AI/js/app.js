import { doc, getDoc, setDoc, serverTimestamp } from "./firebase.js";
import { mainDb, db } from "./firebase.js";
import { state, $ } from "./state.js";
import { setStatus, updateProfile, openMenu, closeMenu } from "./ui.js";
import { loadChats, initializeConversation, newChat } from "./conversations.js";
import { loadProjects, openProjectModal, closeProjectModal, createProject, selectProject } from "./projects.js";
import { openTrash, closeTrash } from "./trash.js";
import { openAdminLogs, closeAdminLogs, loadAdminLogs } from "./admin-logs.js";
import { sendMessage } from "./ai.js";
import { bindCobyCopy } from "./coby-markup.js";
import { initCobyInput } from "./input.js";

async function loadUser() {
    state.currentUserId = localStorage.getItem("userId");

    if (!state.currentUserId) {
        setStatus("로그인이 필요합니다");
        updateProfile();
        return false;
    }

    try {
        const snapshot = await getDoc(doc(mainDb, "users", state.currentUserId));
        state.currentPerson = snapshot.exists()
            ? { schoolNumber: state.currentUserId, ...snapshot.data() }
            : { schoolNumber: state.currentUserId };

        await setDoc(doc(db, "people", state.currentUserId), {
            schoolNumber: state.currentUserId,
            name: state.currentPerson.name || "사용자",
            role: state.currentPerson.role || "student",
            updatedAt: serverTimestamp()
        }, { merge: true });

        updateProfile();
        setStatus(`${state.currentPerson.name || "사용자"}님`, true);
        await Promise.all([loadChats(), loadProjects()]);
        return true;
    } catch (error) {
        console.error(error);
        setStatus("Firebase 연결 실패");
        updateProfile();
        alert("Coby Firebase 연결에 실패했습니다.\n\nFirestore 보안 규칙도 확인해주세요.");
        return false;
    }
}

function goHome() {
    location.href = "/index.html";
}

function logout() {
    const redirect = encodeURIComponent("/index.html");
    location.href = `/signout/index.html?redirect=${redirect}`;
}

function bindGlobalEvents() {
    window.openMenu = openMenu;
    window.closeMenu = closeMenu;
    window.newChat = newChat;
    window.selectProject = selectProject;
    window.openProjectModal = openProjectModal;
    window.closeProjectModal = closeProjectModal;
    window.createProject = createProject;
    window.openTrash = openTrash;
    window.closeTrash = closeTrash;
    window.openAdminLogs = openAdminLogs;
    window.closeAdminLogs = closeAdminLogs;
    window.loadAdminLogs = loadAdminLogs;
    window.sendMessage = sendMessage;
    window.goHome = goHome;
    window.logout = logout;

    $("projectNameInput").addEventListener("keydown", event => {
        if (event.key === "Enter") createProject();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
            closeProjectModal();
            closeTrash();
            closeAdminLogs();
        }
    });

    $("projectModal").addEventListener("click", event => {
        if (event.target === $("projectModal")) closeProjectModal();
    });

    $("trashModal").addEventListener("click", event => {
        if (event.target === $("trashModal")) closeTrash();
    });

    $("adminLogsModal").addEventListener("click", event => {
        if (event.target === $("adminLogsModal")) closeAdminLogs();
    });
}

async function init() {
    bindCobyCopy(document);
    initCobyInput({ input: $("userInput"), send: sendMessage });
    bindGlobalEvents();

    const success = await loadUser();
    if (success) await initializeConversation();
}

init();
