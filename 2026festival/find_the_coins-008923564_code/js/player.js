/**
 * player.js
 * 플레이어 캐릭터 렌더링 및 상태 관리
 */

// 플레이어 캐릭터 그리기 함수
function drawPlayer(ctx, x, y) {
    ctx.save();
    
    // 캐릭터 외곽선 및 몸체 (노란색 코인 느낌)
    ctx.beginPath();
    ctx.arc(x, y, GAME_CONFIG.PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffdc00";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 4;
    ctx.stroke();

    // 눈 (캐릭터 표정)
    ctx.fillStyle = "#333";
    ctx.beginPath();
    // 왼쪽 눈
    ctx.arc(x - 7, y - 5, 4, 0, Math.PI * 2);
    // 오른쪽 눈
    ctx.arc(x + 7, y - 5, 4, 0, Math.PI * 2);
    ctx.fill();

    // 입
    ctx.beginPath();
    ctx.arc(x, y + 5, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
}

/**
 * 플레이어 위치 초기화 함수
 */
function resetPlayerPosition() {
    const spawn = getSpawnPoint(currentMap);
    px = spawn.x;
    py = spawn.y;
}
