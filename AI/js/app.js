import { doc, getDoc, getAuth, mainApp, mainDb } from "./firebase.js";

// /signin과 동일한 points2026 기본 Firebase 앱의 Auth 세션을 그대로 사용한다.
// 여기서 setPersistence를 다시 호출하면 로그인 직후 페이지 이동 과정에서
// 기존 로그인 지속성 설정을 재설정할 수 있으므로 COBY에서는 변경하지 않는다.
const auth = getAuth(mainApp);

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
    // onAuthStateChanged의 첫 이벤트 대신 Firebase Auth 초기화 완료를 직접 기다린다.
    // 초기 저장소 복원이 끝난 뒤 currentUser를 읽어 로그인 상태를 판정한다.
    await auth.authStateReady();
    const authUser = auth.currentUser;
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
        const results = await Promise.allSettled([loadChats(), loadProjects()]);
        if (results[0].status === "rejected") {
            console.error("COBY 대화 데이터 접근 실패:", results[0].reason);
            $("chatList").innerHTML = '<div class="empty-chat">대화 기록에 연결할 수 없습니다. 데이터베이스 권한을 확인해주세요.</div>';
        }
        if (results[1].status === "rejected") {
            console.error("COBY 프로젝트 데이터 접근 실패:", results[1].reason);
            $("projectList").innerHTML = '<div class="empty-chat">프로젝트 데이터에 연결할 수 없습니다.</div>';
        }
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
    try {
        const success = await loadUser();
        if (success) await initializeConversation();
    } catch (error) {
        console.error("COBY 초기화 실패:", error);
        setStatus("로그인 확인 실패");
        alert("로그인 상태를 확인하지 못했습니다.\n\n" + (error?.message || "Firebase 설정을 확인해주세요."));
    }
}

init();
