/**
 * events.js
 * 키보드 입력, 플레이어 이동 및 게임 상호작용 이벤트 관리
 */

// 키보드 입력 상태 저장
const keys = {};

// 1. 키보드 이벤트 리스너
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // 도감 열기/닫기 (1번 키)
    if (e.key === '1') {
        if (!showCollection) openCollection();
        else document.getElementById('collection-modal').style.display = 'none';
        showCollection = !showCollection;
    }

    // 스폰 지점 이동 (2번 키)
    if (e.key === '2') {
        px = DATA.spawnPoints.main.x;
        py = DATA.spawnPoints.main.y;
        currentMap = "main";
    }

    // 채팅창 토글 (Tab 키)
    if (e.key === 'Tab') {
        e.preventDefault();
        toggleChat();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

/**
 * 플레이어 이동 및 상호작용 처리
 * (main.js의 gameLoop에서 매 프레임 호출)
 */
function handlePlayerMovement() {
    if (!gameStarted) return;

    let dx = 0;
    let dy = 0;

    // 방향키 및 WASD 이동 지원
    if (keys['ArrowUp'] || keys['w']) dy -= GAME_CONFIG.DEFAULT_SPEED;
    if (keys['ArrowDown'] || keys['s']) dy += GAME_CONFIG.DEFAULT_SPEED;
    if (keys['ArrowLeft'] || keys['a']) dx -= GAME_CONFIG.DEFAULT_SPEED;
    if (keys['ArrowRight'] || keys['d']) dx += GAME_CONFIG.DEFAULT_SPEED;

    // 이동 적용 및 맵 경계 제한
    const limit = currentMap === "main" ? GAME_CONFIG.MAP_MAIN_SIZE : GAME_CONFIG.MAP_HOUSE_SIZE;
    px = Math.max(0, Math.min(limit, px + dx));
    py = Math.max(0, Math.min(limit, py + dy));

    // 상호작용 감지
    checkInteractions();
}

/**
 * 맵 내의 모든 이벤트 감지 (코인 획득, 포털 등)
 */
function checkInteractions() {
    // 1. 코인 획득 체크 (coins.js 호출)
    checkCoinProximity(px, py);

    // 2. 집 입구 상호작용 (Main -> House)
    const distToHouse = getDistance(px, py, houseObj.doorX, houseObj.doorY);
    const interactPrompt = document.getElementById('interact-prompt');

    if (distToHouse < 100) {
        interactPrompt.style.display = 'block';
        document.getElementById('interact-text').innerText = "집 들어가기 (E 키)";
        
        if (keys['e']) {
            currentMap = "house";
            px = DATA.spawnPoints.house.x;
            py = DATA.spawnPoints.house.y;
            keys['e'] = false; // 연타 방지
        }
    } else {
        interactPrompt.style.display = 'none';
    }
}
