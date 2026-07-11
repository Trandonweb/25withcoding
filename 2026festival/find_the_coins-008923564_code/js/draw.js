/**
 * draw.js
 * 게임의 모든 렌더링 루프 및 그리기 함수를 담당합니다.
 */

// 캔버스 컨텍스트 가져오기
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/**
 * 게임의 메인 렌더링 루프
 */
function drawGame() {
    // 1. 화면 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 카메라 위치 계산 (플레이어가 화면 중앙에 오도록)
    const offsetX = canvas.width / 2 - px;
    const offsetY = canvas.height / 2 - py;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // 2. 맵 그리기
    if (currentMap === "main") {
        drawMainMap();
    } else if (currentMap === "house") {
        drawHouseMap();
    }

    // 3. 플레이어 그리기
    drawPlayer(ctx, px, py);

    ctx.restore();

    // 4. UI 렌더링 (카메라 고정)
    drawUIOverlay();
}

/**
 * 맵 및 배경 그리기
 */
function drawMainMap() {
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, GAME_CONFIG.MAP_MAIN_SIZE, GAME_CONFIG.MAP_MAIN_SIZE);
    
    // 장식용 그리드
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    for (let i = 0; i <= GAME_CONFIG.MAP_MAIN_SIZE; i += 200) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GAME_CONFIG.MAP_MAIN_SIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(GAME_CONFIG.MAP_MAIN_SIZE, i); ctx.stroke();
    }
}

function drawHouseMap() {
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, GAME_CONFIG.MAP_HOUSE_SIZE, GAME_CONFIG.MAP_HOUSE_SIZE);
}

/**
 * UI 레이어 그리기
 */
function drawUIOverlay() {
    // 채팅 메시지 표시
    if (messageTimer > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "20px DM Sans";
        ctx.textAlign = "center";
        ctx.fillText(playerMessage, canvas.width / 2, canvas.height / 2 - 80);
        messageTimer--;
    }
}
