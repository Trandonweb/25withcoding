/**
 * data.js
 * 게임의 설정값, 상수, 글로벌 상태 관리
 */

// 1. 게임 환경 설정
const GAME_CONFIG = {
    FPS: 60,
    DEFAULT_SPEED: 7,
    PLAYER_SIZE: 40,
    MAP_MAIN_SIZE: 3000,
    MAP_HOUSE_SIZE: 600
};

// 2. 게임 상태 변수
let gameStarted = false;
let currentMap = "main"; // "main" 또는 "house"
let px = 1500; // 초기 플레이어 X
let py = 1500; // 초기 플레이어 Y

// 3. UI 및 기타 상태
let showCollection = false;
let playerMessage = "";
let messageTimer = 0;

// 4. 이벤트 및 키 상태 관리용
const keys = {};

/**
 * 전역 설정 및 데이터 초기화
 */
const DATA = {
    // 맵 이동 시 플레이어 위치 정보
    spawnPoints: {
        main: { x: 1500, y: 1500 },
        house: { x: 300, y: 300 }
    },
    
    // 게임 시스템 메시지 스타일 등
    uiSettings: {
        popupDuration: 2000,
        chatTimeout: 180
    }
};

console.log("Data initialized: System Ready.");
