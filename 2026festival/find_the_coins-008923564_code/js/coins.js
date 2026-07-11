/**
 * coins.js
 * 코인 데이터 및 획득 상태 관리
 */

// 코인 데이터 배열 (나중에 data.js로 완전히 분리해도 좋습니다)
const coins = [
    {
        name: "Yellow Coin", 
        color: "#ffdc00", 
        x: 1500, y: 1350, 
        found: false, 
        difficulty: "Easy",
        description: "기본적인 노란색 코인. 반짝거리지는 않는다.",
        hint: "시작점에서 당신을 반기고 있어요."
    },
    {
        name: "Forgotin", 
        color: "#ff1a1a", 
        x: 0, y: 0, 
        found: false, 
        difficulty: "Hard",
        description: "새빨간 질문의 굴레 속에서 울적해진 미지의 존재입니다.",
        hint: "잊어버렸다고 진심으로 고백해보세요."
    },
    {
        name: "Wild Card Coin",
        color: "#multi",
        x: 0, y: 0,
        found: false,
        difficulty: "Hard",
        description: "와일드 카드, 신 중의 신과 같은 존재의 코인 버전입니다.",
        hint: "기도하는 마음을 적어주세요."
    },
    {
        name: "Wire Frame Coin",
        color: "#wire",
        x: 0, y: 0,
        found: false,
        difficulty: "Insane",
        description: "그는 코드 속에 숨어 있어요. 0과 1들을 좋아하죠.",
        hint: "게임에 참여하세요."
    }
];

/**
 * 특정 코인을 발견했을 때 처리하는 함수
 */
function collectCoin(coinName) {
    const coin = coins.find(c => c.name === coinName);
    if (coin && !coin.found) {
        coin.found = true;
        // UI 팝업 표시 (ui.js에 정의된 함수 호출)
        showCoinPopup(coin);
        console.log(`${coinName} 획득 완료!`);
        return true;
    }
    return false;
}

/**
 * 맵상의 모든 코인을 체크하는 함수 (플레이어 이동 시 호출 가능)
 */
function checkCoinProximity(playerX, playerY) {
    coins.forEach(coin => {
        // 이미 찾았거나 좌표가 없는 코인(이벤트성)은 제외
        if (coin.found || coin.x === 0) return;

        const dist = getDistance(playerX, playerY, coin.x, coin.y);
        if (dist < 50) {
            collectCoin(coin.name);
        }
    });
}
