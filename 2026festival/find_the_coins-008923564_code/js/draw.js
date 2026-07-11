/**
 * draw.js
 * 게임의 모든 렌더링 로직을 담당합니다.
 */

function drawGame() {
    // 1. 화면 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 카메라 위치 보정 (플레이어가 화면 중앙에 오도록)
    const offsetX = canvas.width / 2 - px;
    const offsetY = canvas.height / 2 - py;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // 2. 맵 그리기 (현재 맵에 따라 분기)
    if (currentMap === "main") {
        drawMainMap();
        // 메인 맵의 코인 및 오브젝트 그리기
        drawHouse();
    } else if (currentMap === "house") {
        drawHouseMap();
    }

    // 3. 플레이어 그리기
    drawPlayer(ctx, px, py);

    ctx.restore();

    // 4. UI 및 대화 메시지 출력
    drawUI();

    requestAnimationFrame(drawGame);
}

function drawMainMap() {
    ctx.fillStyle = "#2d3436"; // 맵 배경색
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    
    // 격자선이나 장식 요소들
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 1;
    for (let i = 0; i <= MAP_W; i += 100) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, MAP_H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(MAP_W, i); ctx.stroke();
    }
}

function drawHouse() {
    // 집 오브젝트
    ctx.fillStyle = "#8b4513";
    ctx.fillRect(houseObj.x, houseObj.y, houseObj.w, houseObj.h);
    // 문
    ctx.fillStyle = "#5d2906";
    ctx.fillRect(houseObj.doorX, houseObj.doorY, 30, 50);
}

function drawUI() {
    // 플레이어 채팅 말풍선
    if (messageTimer > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.padding = 10;
        ctx.font = "16px Arial";
        ctx.fillText(playerMessage, canvas.width / 2 - 50, canvas.height / 2 - 60);
        messageTimer--;
    }
}

// 렌더링 시작
drawGame();
