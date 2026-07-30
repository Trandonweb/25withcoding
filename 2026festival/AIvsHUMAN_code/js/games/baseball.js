// baseball.js (Part 2: 게임 플레이 화면 렌더링 및 메인 UI 레이아웃)

function startGame() {
    game.score = 0;
    game.inning = 1;
    game.outs = 0;
    game.balls = 0;
    game.strikes = 0;
    game.pitching = false;
    game.swing = false;
    game.gameOver = false;
    game.swingAnimProgress = 0;
    game.activeEffect = null;
    game.screenShakeTimer = 0;
    game.pitcherState = "idle";

    playerHistory = { swings: 0, earlyHits: 0, lateHits: 0 };

    renderGame();
    // 다음 피칭 루틴 호출은 Part 3에서 이어집니다.
}

function renderGame() {
    gameAreaRef.innerHTML = `
        <div style="
            width:100%;
            height:100%;
            display:flex;
            flex-direction:column;
            background:#030b08;
            color:white;
            border-radius:20px;
            overflow:hidden;
            box-sizing:border-box;
            position:relative;
        ">
            <!-- 스코어보드 (상단) -->
            <div style="
                height:70px;
                background: linear-gradient(180deg, rgba(8,20,14,0.95) 0%, rgba(4,10,7,0.95) 100%);
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding: 0 18px;
                font-size:13px;
                font-weight:bold;
                border-bottom: 2px solid #16a34a;
                flex-shrink:0;
                z-index:10;
                box-shadow: 0 4px 15px rgba(0,0,0,0.6);
            ">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="background:#15803d; color:white; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:900;">${difficulties[game.difficulty].name}</span>
                    <span style="color:#94a3b8;">${game.inning}회초</span>
                    <span style="font-size:15px; margin-left:4px;">SCORE: <span id="score" style="color:#facc15; font-size:18px; font-weight:900;">0</span></span>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <span style="background:rgba(0,0,0,0.5); padding:4px 10px; border-radius:12px; border:1px solid rgba(255,255,255,0.1);">아웃 <span id="outs" style="color:#ef4444; font-weight:900;">0</span>/3</span>
                    <span style="background:rgba(22,163,74,0.2); padding:4px 12px; border-radius:12px; border:1px solid #16a34a; color:#4ade80; font-weight:900;" id="count">0B 0S</span>
                </div>
            </div>

            <!-- 캔버스 영역 -->
            <div style="
                flex:1;
                width:100%;
                max-height: calc(100vh - 150px);
                position:relative;
                display:flex;
                justify-content:center;
                align-items:center;
                background:#0a1f14;
                overflow:hidden;
            ">
                <canvas id="baseballCanvas" style="
                    width:100%;
                    height:100%;
                    object-fit:cover;
                    display:block;
                "></canvas>
            </div>

            <!-- 컨트롤 영역 (하단) -->
            <div style="
                height:80px;
                background: linear-gradient(180deg, rgba(4,10,7,0.95) 0%, rgba(8,20,14,0.95) 100%);
                display:flex;
                flex-direction:column;
                justify-content:center;
                align-items:center;
                gap:6px;
                border-top: 2px solid #16a34a;
                flex-shrink:0;
                z-index:10;
                padding: 0 16px;
                box-sizing:border-box;
            ">
                <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:10px; color:#94a3b8; font-weight:900; letter-spacing:1px;">BATTING TIMING ZONE</span>
                    <div style="width:190px; height:6px; background:#030b08; border-radius:3px; overflow:hidden; border:1px solid rgba(255,255,255,0.2);">
                        <div id="timingIndicator" style="width:50%; height:100%; background:linear-gradient(90deg, #f59e0b, #ef4444); transition: width 0.04s;"></div>
                    </div>
                </div>
                <button id="swingButton" style="
                    width:100%;
                    padding:11px 0;
                    border:none;
                    border-radius:25px;
                    background: linear-gradient(90deg, #15803d, #22c55e);
                    color:white;
                    font-size:16px;
                    font-weight:900;
                    cursor:pointer;
                    box-shadow: 0 4px 15px rgba(34,197,94,0.4);
                    letter-spacing:1.5px;
                ">🏏 스윙! (SPACE BAR)</button>
            </div>
        </div>
    `;

    canvas = document.getElementById("baseballCanvas");
    ctx = canvas.getContext("2d");
    resizeCanvas();

    resizeHandler = resizeCanvas;
    window.addEventListener("resize", resizeHandler);
}

function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}
