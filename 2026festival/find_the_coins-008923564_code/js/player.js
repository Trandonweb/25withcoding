/**
 * player.js
 * 플레이어 캐릭터의 데이터와 드로잉 로직
 */

// 플레이어 초기 상태
let px = 1500; // MAP_W / 2
let py = 1500; // MAP_H / 2
const PLAYER_SIZE = 40;
const SPEED = 7;

/**
 * 플레이어를 캔버스에 그리는 함수
 * @param {CanvasRenderingContext2D} ctx - 캔버스 컨텍스트
 * @param {number} x - 플레이어 X 좌표
 * @param {number} y - 플레이어 Y 좌표
 */
function drawPlayer(ctx, x, y) {
    ctx.save();
    
    // 캐릭터 몸체 (노란색 코인 형태)
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#ffdc00";
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 눈 (간단한 표정)
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(x - 7, y - 5, 3, 0, Math.PI * 2); // 왼쪽 눈
    ctx.arc(x + 7, y - 5, 3, 0, Math.PI * 2); // 오른쪽 눈
    ctx.fill();

    // 입
    ctx.beginPath();
    ctx.arc(x, y + 5, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
}

/**
 * 플레이어 이동 업데이트 함수
 * (events.js의 handlePlayerMovement에서 좌표 값을 갱신하고
 *  main.js에서 이를 사용합니다)
 */
function updatePlayerPosition(dx, dy) {
    px += dx;
    py += dy;
    
    // 맵 밖으로 나가지 않도록 제한 (Main Map 기준)
    px = Math.max(PLAYER_SIZE, Math.min(MAP_W - PLAYER_SIZE, px));
    py = Math.max(PLAYER_SIZE, Math.min(MAP_H - PLAYER_SIZE, py));
}
