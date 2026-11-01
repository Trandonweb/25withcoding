import { doc, getDoc, auth, authPersistenceReady, mainDb, onAuthStateChanged } from "./firebase.js";

// 메인 페이지와 동일하게 로그인 지속성 설정이 끝난 뒤 인증 상태를 확인한다.

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
    // 메인 페이지와 같은 순서: 지속성 설정 완료 후 Firebase의 첫 인증 상태 이벤트를 기다린다.
    await authPersistenceReady;
    const authUser = await new Promise((resolve, reject) => {
        let unsubscribe = () => {};
        unsubscribe = onAuthStateChanged(auth, user => {
            unsubscribe();
            resolve(user);
        }, error => {
            unsubscribe();
            reject(error);
        });
    });
    const match = (authUser?.email || "").match(/^(\d{5})@auth\.25withcoding\.kr$/i);
    state.currentUserId = match?.[1] || "";
    if (!state.currentUserId) {
        localStorage.removeItem("userId");
        localStorage.removeItem("firebaseIdToken");
        localStorage.removeItem("firebaseRefreshToken");

        // 로그인 페이지와 COBY 사이의 인증 저장소 차이를 확인하기 위한 임시 진단.
        // 토큰이나 이메일은 화면에 노출하지 않는다.
        const authStorageKey = `firebase:authUser:${auth.app.options.apiKey}:${auth.app.name}`;
        const localAuthSaved = localStorage.getItem(authStorageKey) !== null;
        const sessionAuthSaved = sessionStorage.getItem(authStorageKey) !== null;
        let signinDebug = null;
        try {
            signinDebug = JSON.parse(sessionStorage.getItem("cobyAuthSigninDebug") || "null");
        } catch {}
        const diagnostic = [
            `COBY 프로젝트: ${auth.app.options.projectId || "확인 불가"}`,
            `COBY 앱 이름: ${auth.app.name}`,
            `COBY Auth 사용자: 없음`,
            `COBY 로컬 저장소: ${localAuthSaved ? "있음" : "없음"}`,
            `COBY 세션 저장소: ${sessionAuthSaved ? "있음" : "없음"}`,
            `로그인 직후 진단: ${signinDebug ? JSON.stringify(signinDebug) : "기록 없음"}`
        ].join(" / ");

        console.error("[COBY AUTH DIAGNOSTIC]", {
            projectId: auth.app.options.projectId,
            appName: auth.app.name,
            hasCurrentUser: false,
            localAuthSaved,
            sessionAuthSaved
        });
        setStatus("로그인 세션을 읽지 못했습니다");
        updateProfile();
        const status = $("statusText");
        if (status) {
            status.textContent = "인증 진단: " + diagnostic;
            status.title = diagnostic;
            status.style.whiteSpace = "normal";
            status.style.maxWidth = "min(92vw, 680px)";
            status.style.fontSize = "11px";
            status.style.lineHeight = "1.6";
        }
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
