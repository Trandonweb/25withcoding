// ============================================================
// METAL BUILD
// main.js
// 게임 시작 / 화면 전환 / 홈 화면
// ============================================================


// ============================================================
// 화면 전환
// ============================================================

function switchScreen(screenId) {

    const screens = document.querySelectorAll('.screen');

    screens.forEach(screen => {
        screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(screenId);

    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}


// ============================================================
// 게임 시작
// ============================================================

function startGame() {

    // 기본 스테이지
    if (!player.stage) {
        player.stage = 1;
    }

    // 기본 코인
    if (typeof player.coins !== 'number') {
        player.coins = 100;
    }

    // 기본 소탕권
    if (typeof player.tickets !== 'number') {
        player.tickets = 0;
    }

    // 홈 화면으로 이동
    switchScreen('screen-home');

    // 홈 화면 정보 갱신
    updateHomeUI();

    // 메카 화면 갱신
    if (typeof updateMechVisual === 'function') {
        updateMechVisual();
    }

    // 스탯 갱신
    if (typeof updateTotalStats === 'function') {
        updateTotalStats();
    }

    console.log('METAL BUILD 게임 시작');
}


// ============================================================
// 홈 화면 UI 갱신
// ============================================================

function updateHomeUI() {

    // --------------------------------------------------------
    // 스테이지
    // --------------------------------------------------------

    const stageDisplay =
        document.getElementById('stage-display');

    if (stageDisplay) {

        const currentStage =
            Math.max(1, Math.min(player.stage || 1, 100));

        stageDisplay.textContent =
            `STAGE ${currentStage} / 100`;
    }


    // --------------------------------------------------------
    // 코인
    // --------------------------------------------------------

    const coinDisplay =
        document.getElementById('coin-display');

    if (coinDisplay) {

        coinDisplay.textContent =
            `코인: ${player.coins || 0}G`;
    }


    // --------------------------------------------------------
    // 소탕권
    // --------------------------------------------------------

    const ticketDisplay =
        document.getElementById('ticket-display');

    if (ticketDisplay) {

        ticketDisplay.textContent =
            `소탕권: ${player.tickets || 0}개`;
    }
}


// ============================================================
// 홈으로 돌아가기
// ============================================================

function returnToHome() {

    switchScreen('screen-home');

    updateHomeUI();

    if (typeof updateMechVisual === 'function') {
        updateMechVisual();
    }

    if (typeof updateTotalStats === 'function') {
        updateTotalStats();
    }
}


// ============================================================
// 전투 종료 후 홈으로 돌아가기
// ============================================================

function returnToHomeFromBattle() {

    const modal =
        document.getElementById('battle-result-modal');

    if (modal) {
        modal.style.display = 'none';
    }

    returnToHome();
}


// ============================================================
// 스테이지 설정
// ============================================================

function setStage(stage) {

    let newStage =
        parseInt(stage, 10);

    if (Number.isNaN(newStage)) {
        newStage = 1;
    }

    // 스테이지 범위 제한
    newStage =
        Math.max(1, Math.min(newStage, 100));

    player.stage = newStage;

    updateHomeUI();
}


// ============================================================
// 다음 스테이지
// ============================================================

function nextStage() {

    if (player.stage < 100) {

        player.stage++;

        updateHomeUI();

    } else {

        console.log('최종 스테이지에 도달했습니다.');
    }
}


// ============================================================
// 이전 스테이지
// ============================================================

function previousStage() {

    if (player.stage > 1) {

        player.stage--;

        updateHomeUI();
    }
}


// ============================================================
// 코인 추가
// ============================================================

function addCoins(amount) {

    amount = Number(amount) || 0;

    player.coins += amount;

    if (player.coins < 0) {
        player.coins = 0;
    }

    updateHomeUI();
}


// ============================================================
// 소탕권 추가
// ============================================================

function addTickets(amount) {

    amount = Number(amount) || 0;

    player.tickets += amount;

    if (player.tickets < 0) {
        player.tickets = 0;
    }

    updateHomeUI();
}


// ============================================================
// 게임 초기화
// ============================================================

function resetGameData() {

    player.stage = 1;

    player.coins = 100;

    player.tickets = 0;

    player.inventory = [
        'h_basic',
        't_basic',
        'al_shield',
        'ar_launcher',
        'b1_none',
        'b2_none',
        'll_basic',
        'lr_basic'
    ];

    player.equipped = {

        head: 'h_basic',

        torso: 't_basic',

        arm_l: 'al_shield',

        arm_r: 'ar_launcher',

        back1: 'b1_none',

        back2: 'b2_none',

        leg_l: 'll_basic',

        leg_r: 'lr_basic'
    };

    updateHomeUI();

    if (typeof updateMechVisual === 'function') {
        updateMechVisual();
    }

    if (typeof updateTotalStats === 'function') {
        updateTotalStats();
    }
}


// ============================================================
// 페이지가 로드되었을 때
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    console.log('METAL BUILD 로딩 완료');

    // 시작 화면으로 설정
    switchScreen('screen-title');

});
