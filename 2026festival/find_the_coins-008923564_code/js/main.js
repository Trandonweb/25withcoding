/**
 * main.js
 * 게임 루프 관리 및 모듈 통합
 */

// 1. 게임 루프 설정
function gameLoop() {
    if (gameStarted) {
        // 입력 처리 (events.js의 함수 호출)
        handlePlayerMovement();
        
        // 렌더링 처리 (draw.js의 함수 호출)
        drawGame();
    }
    
    // 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 2. 초기화 함수
function init() {
    console.log("Find The Coins 게임을 시작합니다.");
    
    // 윈도우 리사이즈 대응
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // 게임 루프 시작
    gameLoop();
}

// 3. 페이지 로드 완료 시 초기화 실행
window.onload = () => {
    init();
};

/**
 * 전역 상태 관리
 * (다른 파일과 공유되는 데이터)
 */
const gameState = {
    isPaused: false,
    score: 0
};
