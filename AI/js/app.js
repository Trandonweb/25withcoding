import { doc, getDoc, setDoc, serverTimestamp } from "./firebase.js";
import { mainDb, db } from "./firebase.js";
import { state, $ } from "./state.js";
import { setStatus, updateProfile, openMenu, closeMenu } from "./ui.js";
import { loadChats, initializeConversation, newChat } from "./conversations.js";
import { loadProjects, openProjectModal, closeProjectModal, createProject, selectProject } from "./projects.js";
import { openTrash, closeTrash } from "./trash.js";
import { openAdminLogs, closeAdminLogs, loadAdminLogs } from "./admin-logs.js";
import { openSettings, closeSettings } from "./settings.js";
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
        console.error("사용자 확인 실패:", error);
        setStatus("사용자 확인 실패");
        updateProfile();
        alert(`사용자 확인에 실패했습니다.\n\n${error?.message || "Firebase 연결 또는 권한을 확인해주세요."}`);
        return false;
    }
}

function goHome() { location.href = "/index.html"; }
function logout() {
    const redirect = encodeURIComponent("/index.html");
    location.href = `/signout/index.html?redirect=${redirect}`;
}

function toggleProfileMenu(event) {
    event?.stopPropagation();
    const menu = $("profileMenu");
    const profile = document.querySelector(".profile");
    if (!menu || !profile) return;
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    profile.setAttribute("aria-expanded", String(willOpen));
}

function closeProfileMenu() {
    const menu = $("profileMenu");
    const profile = document.querySelector(".profile");
    if (!menu) return;
    menu.hidden = true;
    profile?.setAttribute("aria-expanded", "false");
}

function bindIfExists(selector, eventName, handler) {
    const element = $(selector);
    if (element) element.addEventListener(eventName, handler);
}

function bindGlobalEvents() {
    Object.assign(window, {
        openMenu, closeMenu, newChat, selectProject, openProjectModal, closeProjectModal,
        createProject, openTrash, closeTrash, openAdminLogs, closeAdminLogs, loadAdminLogs,
        openSettings, closeSettings, sendMessage, goHome, logout, toggleProfileMenu, closeProfileMenu
    });

    bindIfExists("projectNameInput", "keydown", event => {
        if (event.key === "Enter") createProject();
    });

    document.addEventListener("click", event => {
        if (!event.target.closest(".profile-area")) closeProfileMenu();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
            closeProjectModal();
            closeTrash();
            closeAdminLogs();
            closeSettings();
            closeProfileMenu();
        }
    });

    bindIfExists("projectModal", "click", event => {
        if (event.target === $("projectModal")) closeProjectModal();
    });
    bindIfExists("trashModal", "click", event => {
        if (event.target === $("trashModal")) closeTrash();
    });
    bindIfExists("adminLogsModal", "click", event => {
        if (event.target === $("adminLogsModal")) closeAdminLogs();
    });
    bindIfExists("settingsModal", "click", event => {
        if (event.target === $("settingsModal")) closeSettings();
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
