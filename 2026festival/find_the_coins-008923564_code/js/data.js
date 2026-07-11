// =====================================
// data.js
// Find the Coins
// 게임 데이터 및 설정
// =====================================

// Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 게임 설정
const GAME = {
    width: 1280,
    height: 720,
    fps: 60,
    version: "1.0.0"
};

// 플레이어
const PLAYER = {
    width: 48,
    height: 48,
    speed: 4,
    startX: 640,
    startY: 360
};

// 플레이어 상태
let player = {
    x: PLAYER.startX,
    y: PLAYER.startY,
    width: PLAYER.width,
    height: PLAYER.height,
    direction: "down",
    moving: false
};

// 키 입력
const keys = {};

// 게임 상태
let gameState = {
    paused: false,
    inventoryOpen: false,
    dialogOpen: false,
    currentMap: "main"
};

// 코인 데이터
let coins = [];

// 획득한 코인
let collectedCoins = [];

// 집 데이터
let houses = [];

// NPC
let npcs = [];

// 이미지
const images = {};

// 효과음
const sounds = {};

// 폰트
const fonts = {};

// 애니메이션
let animationFrameId = null;

// 디버그 모드
const DEBUG = false;
