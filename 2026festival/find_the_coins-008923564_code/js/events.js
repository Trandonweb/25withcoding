/**
 * events.js
 * 키보드 입력 및 게임 내 상호작용 이벤트 관리
 */

// 키 상태 저장 객체
const keys = {};

// 1. 키보드 이벤트 리스너
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // 도감 열기 (1번 키)
    if (e.key === '1') {
        if (!showCollection) openCollection();
        else document.getElementById('collection-modal').style.display = 'none';
        showCollection = !showCollection;
    }
    
    // 스폰 지점 이동 (2번 키)
    if (e.key === '2') {
        teleportToSpawn();
    }
    
    // 채팅창 토글 (Tab 키)
    if (e.key === 'Tab') {
        e.preventDefault(); // 기본 브라우저 동작 방지
        toggleChat();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 2. 플레이어 이동 로직 (매 프레임마다 호출됨)
function handlePlayerMovement() {
    if (!gameStarted) return;

    let dx = 0;
    let dy = 0;

    if (keys['ArrowUp'] || keys['w']) dy -= SPEED;
    if (keys['ArrowDown'] || keys['s']) dy += SPEED;
    if (keys['ArrowLeft'] || keys['a']) dx -= SPEED;
    if (keys['ArrowRight'] || keys['d']) dx += SPEED;

    // 대각선 이동 시 속도 보정 (선택 사항)
    if (dx !== 0 && dy !== 0) {
        dx *= 0.707;
        dy *= 0.707;
    }

    px += dx;
    py += dy;

    // 맵 경계 제한 (Main Map 기준)
    px = Math.max(0, Math.min(MAP_W, px));
    py = Math.max(0, Math.min(MAP_H, py));
    
    // 상호작용 감지 (예: 집 근처 등)
    checkInteractions();
}

// 3. 상호작용 체크 함수
function checkInteractions() {
    const interactPrompt = document.getElementById('interact-prompt');
    const distToHouse = Math.hypot(px - houseObj.doorX, py - houseObj.doorY);

    if (distToHouse < 100) {
        interactPrompt.style.display = 'block';
        document.getElementById('interact-text').innerText = "집 들어가기 (E 키)";
        
        // E 키 입력 시 맵 이동
        if (keys['e']) {
            currentMap = "house";
            px = HOUSE_MAP_W / 2;
            py = HOUSE_MAP_H / 2;
            keys['e'] = false; // 연타 방지
        }
    } else {
        interactPrompt.style.display = 'none';
    }
}
