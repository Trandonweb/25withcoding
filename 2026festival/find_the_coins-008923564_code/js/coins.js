// =====================================
// coins.js
// Find the Coins
// 코인 관련 기능
// =====================================

// 모든 코인 저장
let coins = [];

// 획득한 코인
let collectedCoins = new Set();

// 코인 생성
function createCoin(id, x, y, image) {
    coins.push({
        id,
        x,
        y,
        image,
        width: 48,
        height: 48,
        collected: false
    });
}

// 코인 그리기
function drawCoins(ctx) {
    for (const coin of coins) {
        if (coin.collected) continue;

        ctx.drawImage(
            coin.image,
            coin.x,
            coin.y,
            coin.width,
            coin.height
        );
    }
}

// 플레이어와 충돌 검사
function checkCoinCollision(player) {

    for (const coin of coins) {

        if (coin.collected) continue;

        if (
            player.x < coin.x + coin.width &&
            player.x + player.width > coin.x &&
            player.y < coin.y + coin.height &&
            player.y + player.height > coin.y
        ) {

            collectCoin(coin);

        }

    }

}

// 코인 획득
function collectCoin(coin) {

    coin.collected = true;

    collectedCoins.add(coin.id);

    // 효과음
    if (typeof coinSound !== "undefined") {
        coinSound.currentTime = 0;
        coinSound.play();
    }

    // UI 갱신
    if (typeof updateCollectionUI === "function") {
        updateCollectionUI();
    }

}

// 획득 여부
function hasCoin(id) {
    return collectedCoins.has(id);
}

// 초기화
function resetCoins() {

    collectedCoins.clear();

    for (const coin of coins) {
        coin.collected = false;
    }

}
