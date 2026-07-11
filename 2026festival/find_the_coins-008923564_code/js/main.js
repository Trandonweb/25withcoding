/**
 * main.js
 * 게임 루프 관리 및 전체 시스템 통합 실행
 */

/**
 * 게임 메인 루프: 매 프레임마다 호출됨
 */
function gameLoop() {
    if (gameStarted) {
        // 1. 플레이어 이동 및 상호작용 업데이트
        handlePlayerMovement();
        
        // 2. 화면 렌더링
        drawGame();
    }
    
    // 다음 프레임 요청
    requestAnimationFrame(gameLoop);
}

/**
 * 게임 초기화 함수
 */
function init() {
    console.log("Find The Coins 게임 엔진 시작...");
    
    // 윈도우 리사이즈 대응
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    // 캔버스 사이즈 초기화
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 게임 루프 시작
    gameLoop();
}

// 윈도우 로드 완료 시 게임 시작
window.onload = () => {
    init();
};

/**
 * 전역 유틸리티: 게임 시작 버튼 이벤트 연결
 * (index.html에서 호출 가능하도록 설정)
 */
document.getElementById('play-btn').addEventListener('click', () => {
    gameStarted = true;
    document.getElementById('start-screen').style.display = 'none';
    canvas.style.display = 'block';
    
    // UI 버튼들 활성화
    document.getElementById('col-btn').style.display = 'block';
    document.getElementById('spawn-btn').style.display = 'block';
    document.getElementById('chat-btn').style.display = 'block';
});
