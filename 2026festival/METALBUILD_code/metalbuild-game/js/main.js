/*
=========================================================
 METALBUILD
 main.js
 게임 시작 및 전체 초기화
=========================================================
*/

"use strict";

// =====================================================
// 전역 객체
// =====================================================

const App = {
    initialized: false,
    currentScreen: "start"
};

// =====================================================
// DOM
// =====================================================

const UI = {

    screens: {
        start: document.getElementById("startScreen"),
        garage: document.getElementById("garageScreen"),
        customize: document.getElementById("customScreen"),
        gacha: document.getElementById("gachaScreen"),
        battle: document.getElementById("battleScreen"),
        victory: document.getElementById("victoryScreen"),
        defeat: document.getElementById("defeatScreen"),
        ending: document.getElementById("endingScreen")
    },

    startBtn: document.getElementById("startBtn"),
    howBtn: document.getElementById("howBtn"),
    settingBtn: document.getElementById("settingBtn"),

    battleBtn: document.getElementById("battleBtn"),
    customBtn: document.getElementById("customBtn"),
    gachaBtn: document.getElementById("gachaBtn"),

    closeCustomBtn: document.getElementById("closeCustomBtn"),
    closeGachaBtn: document.getElementById("closeGachaBtn")
};

// =====================================================
// 시작
// =====================================================

window.addEventListener("DOMContentLoaded", initializeGame);

// =====================================================
// 초기화
// =====================================================

function initializeGame() {

    if (App.initialized) return;

    App.initialized = true;

    console.log("METALBUILD Start");

    bindEvents();

    loadSaveData();

    initializeGameData();

    showScreen("start");

    startGameLoop();

}

// =====================================================
// 이벤트 연결
// =====================================================

function bindEvents() {

    UI.startBtn?.addEventListener("click", startGame);

    UI.howBtn?.addEventListener("click", showHowToPlay);

    UI.settingBtn?.addEventListener("click", showSettings);

    UI.battleBtn?.addEventListener("click", enterBattle);

    UI.customBtn?.addEventListener("click", () => {

        showScreen("customize");

    });

    UI.gachaBtn?.addEventListener("click", () => {

        showScreen("gacha");

    });

    UI.closeCustomBtn?.addEventListener("click", () => {

        showScreen("garage");

    });

    UI.closeGachaBtn?.addEventListener("click", () => {

        showScreen("garage");

    });

}

// =====================================================
// 화면 전환
// =====================================================

function showScreen(name) {

    Object.values(UI.screens).forEach(screen => {

        if (!screen) return;

        screen.classList.add("hidden");

    });

    const target = UI.screens[name];

    if (target) {

        target.classList.remove("hidden");

        App.currentScreen = name;

    }

}

// =====================================================
// 게임 시작
// =====================================================

function startGame() {

    showScreen("garage");

}

// =====================================================
// 게임 설명
// =====================================================

function showHowToPlay() {

    alert(
`METALBUILD

• 스테이지를 클리어하세요.
• 파츠를 획득하세요.
• 메카를 강화하세요.
• Stage 100의 보스를 쓰러뜨리세요.`
    );

}

// =====================================================
// 설정
// =====================================================

function showSettings() {

    alert("설정 화면은 추후 구현됩니다.");

}

// =====================================================
// 전투 진입
// =====================================================

function enterBattle() {

    showScreen("battle");

    if (typeof startBattle === "function") {

        startBattle();

    }

}

// =====================================================
// 게임 루프
// =====================================================

function startGameLoop() {

    function loop() {

        if (typeof updateGame === "function") {

            updateGame();

        }

        if (typeof renderGame === "function") {

            renderGame();

        }

        requestAnimationFrame(loop);

    }

    requestAnimationFrame(loop);

}

// =====================================================
// 저장 불러오기
// =====================================================

function loadSaveData() {

    if (typeof loadGame === "function") {

        loadGame();

    }

}

// =====================================================
// 게임 데이터 초기화
// =====================================================

function initializeGameData() {

    if (typeof createPlayer === "function") {

        createPlayer();

    }

    if (typeof initializeParts === "function") {

        initializeParts();

    }

    if (typeof initializeStages === "function") {

        initializeStages();

    }

}

console.log("main.js loaded");
