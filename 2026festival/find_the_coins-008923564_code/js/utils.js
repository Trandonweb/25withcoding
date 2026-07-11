/**
 * utils.js
 * 게임 제작 시 공통적으로 사용되는 유틸리티 함수 모음
 */

/**
 * 두 점 사이의 거리를 계산 (충돌 감지나 상호작용 체크에 사용)
 */
function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 원형 오브젝트 간의 충돌 감지 (true/false 반환)
 */
function isColliding(obj1, obj2) {
    const distance = getDistance(obj1.x, obj1.y, obj2.x, obj2.y);
    return distance < (obj1.radius || 30) + (obj2.radius || 30);
}

/**
 * 지정된 범위 내의 랜덤 정수 생성
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 캔버스에 텍스트를 중앙 정렬하여 그리는 헬퍼 함수
 */
function drawCenteredText(ctx, text, x, y, font = "20px DM Sans", color = "#333") {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
}

/**
 * 시간 지연 함수 (비동기 처리 시 유용)
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 색상을 어둡게 만드는 함수 (UI 연출 시 활용)
 */
function darkenColor(hex, percent) {
    // 간단한 hex 계산 로직 추가 가능
    return hex; 
}
