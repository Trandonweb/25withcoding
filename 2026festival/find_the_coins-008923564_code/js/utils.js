/**
 * utils.js
 * 게임 제작 시 공통으로 사용하는 유틸리티 함수 모음
 */

/**
 * 두 점 사이의 거리를 계산 (충돌 및 상호작용 체크용)
 * @param {number} x1, y1 - 첫 번째 좌표
 * @param {number} x2, y2 - 두 번째 좌표
 */
function getDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 랜덤 정수 생성 (범위 포함)
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 코인 도감 및 게임 내 코인을 렌더링하는 범용 함수
 * (이 함수는 ui.js 및 draw.js에서 공통으로 호출 가능)
 */
function drawCoin(ctx, x, y, coinName) {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    
    // 코인 이름에 따른 색상 구분
    if (coinName === "Yellow Coin") ctx.fillStyle = "#ffdc00";
    else if (coinName === "Forgotin") ctx.fillStyle = "#ff1a1a";
    else ctx.fillStyle = "#a0a0a0";
    
    ctx.fill();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
}

/**
 * 텍스트 중앙 정렬 렌더링
 */
function drawText(ctx, text, x, y, fontSize = "16px") {
    ctx.font = `${fontSize} DM Sans`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(text, x, y);
}

/**
 * 게임 데이터 저장 (로컬 스토리지 활용)
 */
function saveProgress() {
    const progress = coins.map(c => ({ name: c.name, found: c.found }));
    localStorage.setItem('find_the_coins_save', JSON.stringify(progress));
}

/**
 * 게임 데이터 불러오기
 */
function loadProgress() {
    const data = localStorage.getItem('find_the_coins_save');
    if (data) {
        const parsed = JSON.parse(data);
        parsed.forEach(p => {
            const coin = coins.find(c => c.name === p.name);
            if (coin) coin.found = p.found;
        });
    }
}
