import { doc, getDoc } from "./firebase.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { mainApp, mainDb } from "./firebase.js";

const auth = getAuth(mainApp);
function waitForAuthUser() {
    return new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        }, error => {
            unsubscribe();
            reject(error);
        });
    });
}
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
    const authUser = await waitForAuthUser();
    const match = (authUser?.email || "").match(/^(\d{5})@auth\.25withcoding\.kr$/i);
    state.currentUserId = match?.[1] || "";
    if (!state.currentUserId) {
        localStorage.removeItem("userId");
        localStorage.removeItem("firebaseIdToken");
        setStatus("로그인이 필요합니다");
        updateProfile();
        location.href = "/signin?redirect=" + encodeURIComponent("/AI/");
        return false;
    }
    localStorage.setItem("userId", state.currentUserId);
    try {
        const snapshot = await getDoc(doc(mainDb, "users", state.currentUserId));
        if (!snapshot.exists()) {
            state.currentPerson = null;
            setStatus("회원 정보를 찾을 수 없습니다");
            updateProfile();
            alert("points2026 회원 문서(users/" + state.currentUserId + ")를 찾을 수 없습니다. 관리자에게 문의해주세요.");
            return false;
        }

        // 회원 개인정보의 단일 원본은 points2026의 users/{학번} 문서다.
        // COBY 전용 Firebase에는 이름·학번·역할 프로필을 복사하지 않는다.
        state.currentPerson = { schoolNumber: state.currentUserId, ...snapshot.data() };

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
