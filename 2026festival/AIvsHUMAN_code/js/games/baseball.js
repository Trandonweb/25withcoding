// baseball.js
// ⚾ AI vs HUMAN - Baseball (Com2uS / MLB Style Ultra-Realistic 3D-Perspective Canvas Edition)

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animation = null;
let swingKey = null;
let resizeHandler = null;

// 모바일 야구 게임 표준 세로 해상도 (480 x 800)
const GAME_WIDTH = 480;
const GAME_HEIGHT = 800;

// 게임 상태 관리 객체
let game = {
    difficulty: "",
    score: 0,
    inning: 1,
    outs: 0,
    balls: 0,
    strikes: 0,
    pitching: false,
    swing: false,
    pitch: null,
    gameOver: false,
    swingAnimProgress: 0,
    activeEffect: null,
    screenShakeTimer: 0,
    pitcherState: "idle", // idle, windup, release
    crowdCheerTimer: 0
};

// 플레이어 타이밍 성향 분석
let playerHistory = {
    swings: 0,
    earlyHits: 0,
    lateHits: 0
};

// 난이도 설정
const difficulties = {
    easy: { name: "쉬움", speed: 0.52, hitBonus: 1.6 },
    normal: { name: "보통", speed: 0.78, hitBonus: 1.25 },
    hard: { name: "어려움", speed: 1.05, hitBonus: 1.0 }
};

// 프로 구종 데이터 (구속 및 변화 궤적 특화)
const pitches = [
    { name: "포심 패스트볼", speed: 1.18, moveX: 0, moveY: 0, type: "fast" },
    { name: "슬라이더", speed: 0.96, moveX: 60, moveY: 12, type: "slider" },
    { name: "커브볼", speed: 0.74, moveX: -25, moveY: 70, type: "curve" },
    { name: "포크볼", speed: 0.86, moveX: 0, moveY: 85, type: "fork" }
];

// =======================
// 외부 실행 및 종료 관리
// =======================

export function openBaseball(gameArea) {
    gameAreaRef = gameArea;
    showDifficulty();
}

export function destroy() {
    if (animation) {
        cancelAnimationFrame(animation);
        animation = null;
    }
    if (swingKey) {
        window.removeEventListener("keydown", swingKey);
        swingKey = null;
    }
    if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
        resizeHandler = null;
    }
}

// =======================
// 난이도 선택 화면 (컴프야 로비풍 UI)
// =======================

function showDifficulty() {
    destroy();

    gameAreaRef.innerHTML = `
        <div style="
            width:100%;
            height:100%;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            gap:24px;
            background: linear-gradient(135deg, #050b08 0%, #0d2818 50%, #031008 100%);
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            box-sizing:border-box;
            box-shadow: inset 0 0 50px rgba(0,0,0,0.8);
        ">
            <div style="text-align:center;">
                <div style="font-size:12px; color:#4ade80; letter-spacing:3px; font-weight:800; margin-bottom:6px;">OFFICIAL LICENSEE</div>
                <h1 style="font-size:34px; font-weight:900; color:#ffffff; text-shadow: 0 4px 20px rgba(34,197,94,0.5); margin:0;">
                    ⚾ COMPBASEBALL 2026
                </h1>
                <p style="color:#94a3b8; font-size:14px; margin:8px 0 0 0; letter-spacing:1px;">
                    MOBILE 3D REALISTIC STADIUM
                </p>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:14px; width:250px; margin-top:10px;">
                <button class="bb-btn" data-level="easy" style="background:linear-gradient(90deg, #15803d, #22c55e);">쉬움 (ROOKIE)</button>
                <button class="bb-btn" data-level="normal" style="background:linear-gradient(90deg, #1d4ed8, #3b82f6);">보통 (STAR)</button>
                <button class="bb-btn" data-level="hard" style="background:linear-gradient(90deg, #b91c1c, #ef4444);">어려움 (LEGEND)</button>
            </div>
        </div>
    `;

    const buttons = gameAreaRef.querySelectorAll(".bb-btn");
    buttons.forEach(btn => {
        btn.style.padding = "16px 0";
        btn.style.borderRadius = "30px";
        btn.style.border = "none";
        btn.style.color = "#ffffff";
        btn.style.fontSize = "16px";
        btn.style.fontWeight = "900";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 8px 25px rgba(0,0,0,0.5)";
        btn.style.transition = "transform 0.15s, filter 0.15s";

        btn.onmouseover = () => {
            btn.style.filter = "brightness(1.15)";
            btn.style.transform = "scale(1.03)";
        };
        btn.onmouseout = () => {
            btn.style.filter = "brightness(1)";
            btn.style.transform = "scale(1)";
        };
        btn.onclick = () => {
            game.difficulty = btn.dataset.level;
            startGame();
        };
    });
}

// =======================
// 게임 시작 및 화면 생성 (실제 중계 카메라 뷰 레이아웃)
// =======================

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
    game.crowdCheerTimer = 0;

    playerHistory = { swings: 0, earlyHits: 0, lateHits: 0 };

    renderGame();
    nextPitch();
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
            <!-- 프로 야구 중계 스타일 상단 스코어보드 (70px) -->
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

            <!-- 3D 캔버스 경기장 영역 -->
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

            <!-- 하단 조작 컨트롤 및 실시간 타이밍 게이지 영역 (80px) -->
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

    document.getElementById("swingButton").onclick = triggerSwing;

    if (swingKey) {
        window.removeEventListener("keydown", swingKey);
    }
    swingKey = (e) => {
        if (e.code === "Space") {
            e.preventDefault();
            triggerSwing();
        }
    };
    window.addEventListener("keydown", swingKey);
}

function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

// =======================
// 스마트 AI 구종 선택 시스템
// =======================

function selectSmartPitch() {
    if (playerHistory.swings > 3) {
        if (playerHistory.lateHits > playerHistory.earlyHits) {
            return pitches.find(p => p.type === "fast") || pitches[0];
        } else if (playerHistory.earlyHits > playerHistory.lateHits) {
            return pitches.find(p => p.type === "curve") || pitches[2];
        }
    }
    return pitches[Math.floor(Math.random() * pitches.length)];
}

function nextPitch() {
    if (game.outs >= 3) {
        endGame();
        return;
    }

    game.pitching = true;
    game.swing = false;
    game.swingAnimProgress = 0;
    game.pitcherState = "windup";

    const selected = selectSmartPitch();

    // 포수 뒤 중계 카메라 기준: 화면 상단 중앙(투수 마운드)에서 시작해 아래쪽(홈플레이트)으로 진입
    game.pitch = {
        type: selected,
        startX: GAME_WIDTH / 2,
        startY: 185,                     // 투수 손 릴리즈 시작 위치
        targetX: GAME_WIDTH / 2,
        targetY: 575,                    // 홈플레이트 타격 판정선
        x: GAME_WIDTH / 2,
        y: 185,
        progress: 0,
        speed: 0.0095 * difficulties[game.difficulty].speed
    };

    setTimeout(() => {
        game.pitcherState = "release";
    }, 320);

    showPitchInfo();
    startPitchAnimation();
}

function startPitchAnimation() {
    if (animation) cancelAnimationFrame(animation);

    function loop() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        // 화면 흔들림 효과 연출
        if (game.screenShakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * 12;
            const shakeY = (Math.random() - 0.5) * 12;
            ctx.translate(shakeX, shakeY);
            game.screenShakeTimer--;
        }

        draw3DStadium();
        drawPitcher();
        drawStrikeZoneAndPlate();

        const p = game.pitch;
        if (game.pitching && p) {
            p.progress += p.speed;

            let curX = p.startX + (p.targetX - p.startX) * p.progress;
            let curY = p.startY + (p.targetY - p.startY) * p.progress;

            // 구종별 변화구 궤적 연출
            curX += p.type.moveX * Math.sin(p.progress * Math.PI);
            curY += p.type.moveY * Math.pow(p.progress, 2);

            p.x = curX;
            p.y = curY;

            // 실시간 타이밍 게이지 업데이트
            const indicator = document.getElementById("timingIndicator");
            if (indicator) {
                indicator.style.width = `${p.progress * 100}%`;
            }

            // 원근감을 살린 구속별 공 크기 및 잔상 효과
            const currentRadius = 3.5 + (17.5 * Math.pow(p.progress, 1.4));
            drawBallWithTrail(p.x, p.y, currentRadius, p);

            if (p.progress >= 1.0) {
                game.pitching = false;
                if (!game.swing) {
                    judgePitch();
                }
                return;
            }
        } else if (game.swing && p) {
            const currentRadius = 3.5 + (17.5 * Math.pow(p.progress, 1.4));
            drawBallWithTrail(p.x, p.y, currentRadius, p);
        }

        drawBatterAndBat();

        if (game.activeEffect) {
            drawHitEffect();
        }

        ctx.restore();
        animation = requestAnimationFrame(loop);
    }

    loop();
}

// =======================
// 실제 중계 시점 3D 경기장 렌더링
// =======================

function draw3DStadium() {
    // 1. 야간 경기 하늘 및 조명 그라데이션
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT * 0.38);
    skyGrad.addColorStop(0, "#020604");
    skyGrad.addColorStop(0.5, "#061a10");
    skyGrad.addColorStop(1, "#0d2b1c");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.38);

    // 2. 외야 관중석 및 대형 전광판 배경
    ctx.fillStyle = "#112218";
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT * 0.20);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT * 0.20);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT * 0.31);
    ctx.lineTo(0, GAME_HEIGHT * 0.31);
    ctx.closePath();
    ctx.fill();

    // 대형 전광판 디자인 (상단 중앙)
    ctx.fillStyle = "#050b08";
    ctx.fillRect(GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.21, 180, 50);
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.21, 180, 50);
    
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMPBASEBALL STADIUM", GAME_WIDTH / 2, GAME_HEIGHT * 0.245);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`SCORE ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.275);

    // 3. 외야 잔디 (사다리꼴 원근 투시)
    const outfieldGrad = ctx.createLinearGradient(0, GAME_HEIGHT * 0.31, 0, GAME_HEIGHT * 0.54);
    outfieldGrad.addColorStop(0, "#064e3b");
    outfieldGrad.addColorStop(1, "#047857");
    ctx.fillStyle = outfieldGrad;
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT * 0.31);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT * 0.31);
    ctx.lineTo(GAME_WIDTH + 120, GAME_HEIGHT * 0.54);
    ctx.lineTo(-120, GAME_HEIGHT * 0.54);
    ctx.closePath();
    ctx.fill();

    // 4. 내야 흙 영역 (다이아몬드 원근감)
    const infieldGrad = ctx.createLinearGradient(0, GAME_HEIGHT * 0.54, 0, GAME_HEIGHT);
    infieldGrad.addColorStop(0, "#78350f");
    infieldGrad.addColorStop(1, "#3b1402");
    ctx.fillStyle = infieldGrad;
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 130, GAME_HEIGHT * 0.54);
    ctx.lineTo(GAME_WIDTH / 2 + 130, GAME_HEIGHT * 0.54);
    ctx.lineTo(GAME_WIDTH + 140, GAME_HEIGHT);
    ctx.lineTo(-140, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 5. 내야 잔디 정교한 표현
    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.56);
    ctx.lineTo(GAME_WIDTH / 2 - 150, GAME_HEIGHT * 0.86);
    ctx.lineTo(GAME_WIDTH / 2 + 150, GAME_HEIGHT * 0.86);
    ctx.closePath();
    ctx.fill();

    // 6. 파울라인 (3루/1루 방향 대각선)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.55);
    ctx.lineTo(-50, GAME_HEIGHT);
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.55);
    ctx.lineTo(GAME_WIDTH + 50, GAME_HEIGHT);
    ctx.stroke();
}

// =======================
// 투수 캐릭터 및 마운드 연출
// =======================

function drawPitcher() {
    const px = GAME_WIDTH / 2;
    const py = 185;

    // 투수 마운드 흙 언덕
    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 38, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 3D 실루엣 투수 캐릭터 (유니폼 및 헬멧/모자)
    ctx.fillStyle = "#1e293b"; // 어웨이 네이비 모자/상체
    ctx.beginPath();
    ctx.arc(px, py - 18, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff"; // 유니폼 베이스
    ctx.fillRect(px - 15, py - 6, 30, 26);

    // 투구 모션 동작 팔
    ctx.strokeStyle = "#fbcfe8"; // 피부 톤
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (game.pitcherState === "windup") {
        ctx.moveTo(px - 15, py);
        ctx.lineTo(px - 26, py - 14);
    } else {
        ctx.moveTo(px + 15, py);
        ctx.lineTo(px + 24, py - 18);
    }
    ctx.stroke();
}

// =======================
// 스트라이크존 및 홈플레이트
// =======================

function drawStrikeZoneAndPlate() {
    // 입체감 있는 스트라이크존 투명 가이드 박스
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
    ctx.fillRect(GAME_WIDTH / 2 - 68, 470, 136, 145);
    ctx.strokeRect(GAME_WIDTH / 2 - 68, 470, 136, 145);

    // 홈플레이트 (오각형, 575 위치)
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 34, 568);
    ctx.lineTo(GAME_WIDTH / 2 + 34, 568);
    ctx.lineTo(GAME_WIDTH / 2 + 40, 582);
    ctx.lineTo(GAME_WIDTH / 2, 602);
    ctx.lineTo(GAME_WIDTH / 2 - 40, 582);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// =======================
// 공 및 잔상 이펙트 연출 (3D 효과)
// =======================

function drawBallWithTrail(x, y, radius, pitchInfo) {
    // 공이 날아오는 구종별 속도감 잔상 (Trail)
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = pitchInfo.type === "fast" ? "#38bdf8" : "#facc15";
    ctx.beginPath();
    ctx.arc(x, y - (pitchInfo.speed * 7), radius * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 입체 야구공 렌더링
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#dc2626";
    ctx.stroke();

    // 야구공 붉은색 실밥 무늬
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.76, 0.2, Math.PI - 0.2, false);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// =======================
// 타자 캐릭터 및 스윙 모션 (컴프야 백뷰 스타일)
// =======================

function drawBatterAndBat() {
    const bx = GAME_WIDTH / 2 + 78; // 타석 우측 위치
    const by = 645;

    // 타자 헬멧 (네이비 톤)
    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.arc(bx - 12, by - 56, 17, 0, Math.PI * 2);
    ctx.fill();

    // 유니폼 상의 (화이트/포인트 레드 스트라이프)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx - 30, by - 38, 34, 46);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(bx - 16, by - 38, 6, 46);

    // 하체 바지
    ctx.fillStyle = "#334155";
    ctx.fillRect(bx - 25, by + 8, 25, 44);

    // 배트 회전 및 스윙 모션 애니메이션
    ctx.save();
    let batAngle = -0.55; // 타격 준비 대기 자세
    let batOffsetX = -24;
    let batOffsetY = -30;

    if (game.swingAnimProgress > 0) {
        // 컴프야 스타일 강력한 타격 스윙 궤적 회전
        batAngle = -0.55 - (game.swingAnimProgress * 3.3);
        batOffsetX = -10 + (game.swingAnimProgress * 28);
        batOffsetY = -45 + (game.swingAnimProgress * 15);
    }

    ctx.translate(bx + batOffsetX, by + batOffsetY);
    ctx.rotate(batAngle);

    // 고급 우드 배트 렌더링
    const batGrad = ctx.createLinearGradient(0, 0, 0, -95);
    batGrad.addColorStop(0, "#451a03");
    batGrad.addColorStop(0.5, "#d97706");
    batGrad.addColorStop(1, "#fde047");
    ctx.fillStyle = batGrad;
    ctx.fillRect(-5, -95, 10, 95);
    ctx.strokeStyle = "#291302";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -95, 10, 95);

    ctx.restore();
}

// =======================
// 타격 및 스윙 타이밍 판정 시스템
// =======================

function triggerSwing() {
    if (!game.pitching || game.swing) return;

    game.swing = true;
    game.swingAnimProgress = 0.1;

    // 스윙 애니메이션 프레임 제어
    const swingStartTime = performance.now();
    function animateSwing(now) {
        const elapsed = (now - swingStartTime) / 75;
        game.swingAnimProgress = 0.1 + elapsed * 0.9;

        if (game.swingAnimProgress >= 1.0) {
            game.swingAnimProgress = 1.0;
            setTimeout(() => {
                game.swingAnimProgress = 0;
            }, 75);
            return;
        }
        requestAnimationFrame(animateSwing);
    }
    requestAnimationFrame(animateSwing);

    const p = game.pitch;
    const hitTargetY = 575; // 홈플레이트 타격 판정선 기준
    const timingDiff = p.y - hitTargetY;

    playerHistory.swings++;
    if (timingDiff < 0) {
        playerHistory.earlyHits++;
    } else {
        playerHistory.lateHits++;
    }

    const absTiming = Math.abs(timingDiff);
    const hitBonus = difficulties[game.difficulty].hitBonus;

    // 스트라이크존 영역 내인지 검증
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 72;
    const inZoneY = p.y >= 455 && p.y <= 625;
    const isInsideZone = inZoneX && inZoneY;

    let result = "miss";

    if (!isInsideZone) {
        result = "miss";
    } else {
        // 모바일 야구 게임 기준 정교한 타격 타이밍 판정
        if (absTiming <= 16 * hitBonus) {
            result = "home";
        } else if (absTiming <= 38 * hitBonus) {
            result = "double";
        } else if (absTiming <= 72 * hitBonus) {
            result = "hit";
        } else if (absTiming <= 105 * hitBonus) {
            result = "foul";
        } else {
            result = "miss";
        }
    }

    processResult(result);
}

function judgePitch() {
    const p = game.pitch;
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 72;
    const inZoneY = p.y >= 455 && p.y <= 625;

    if (inZoneX && inZoneY) {
        processResult("strike");
    } else {
        processResult("ball");
    }
}

// =======================
// 결과 처리 및 모바일 연출 (홈런/안타/이펙트)
// =======================

function processResult(result) {
    game.pitching = false;
    let text = "";

    switch (result) {
        case "home":
            game.score += 50;
            text = "🔥 HOME RUN!! (+50)";
            triggerEffect("#facc15", "home");
            game.screenShakeTimer = 25; // 강력한 화면 흔들림
            break;
        case "double":
            game.score += 25;
            text = "⚾ 2루타! (+25)";
            triggerEffect("#38bdf8", "double");
            game.screenShakeTimer = 12;
            break;
        case "hit":
            game.score += 10;
            text = "⚾ 안타! (+10)";
            triggerEffect("#4ade80", "hit");
            break;
        case "foul":
            if (game.strikes < 2) game.strikes++;
            text = "⚠️ 파울 (FOUL)";
            break;
        case "miss":
            game.strikes++;
            text = "❌ 헛스윙! (SWING & MISS)";
            break;
        case "strike":
            game.strikes++;
            text = "❌ 스트라이크! (STRIKE)";
            break;
        case "ball":
            game.balls++;
            text = "🟦 볼! (BALL)";
            break;
    }

    if (game.balls >= 4) {
        game.score += 15;
        text = "🎯 볼넷 진루! (+15)";
        game.balls = 0;
        game.strikes = 0;
    }

    if (game.strikes >= 3) {
        game.outs++;
        text = "❌ 삼진 아웃! (STRIKEOUT)";
        game.strikes = 0;
        game.balls = 0;
    }

    showBroadcastMessage(text);
    updateUI();

    setTimeout(() => {
        nextPitch();
    }, 1300);
}

function triggerEffect(color, type) {
    game.activeEffect = {
        color: color,
        type: type,
        radius: 15,
        maxRadius: type === "home" ? 150 : 85,
        alpha: 1.0
    };
}

function drawHitEffect() {
    const eff = game.activeEffect;
    if (!eff) return;

    ctx.save();
    ctx.strokeStyle = eff.color;
    ctx.lineWidth = eff.type === "home" ? 7 : 4;
    ctx.globalAlpha = eff.alpha;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, 575, eff.radius, 0, Math.PI * 2);
    ctx.stroke();

    // 홈런 시 불꽃 및 파티클 원근 확산 연출
    if (eff.type === "home") {
        ctx.fillStyle = "#facc15";
        for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 / 10) * i;
            const px = GAME_WIDTH / 2 + Math.cos(angle) * eff.radius;
            const py = 575 + Math.sin(angle) * eff.radius;
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    ctx.restore();

    eff.radius += 5.5;
    eff.alpha -= 0.035;

    if (eff.alpha <= 0) {
        game.activeEffect = null;
    }
}

// =======================
// UI 업데이트 및 중계 메시지
// =======================

function updateUI() {
    const scoreEl = document.getElementById("score");
    const outsEl = document.getElementById("outs");
    const countEl = document.getElementById("count");

    if (scoreEl) scoreEl.innerText = game.score;
    if (outsEl) outsEl.innerText = game.outs;
    if (countEl) countEl.innerText = `${game.balls}B ${game.strikes}S`;
}

function showBroadcastMessage(text) {
    const banner = document.createElement("div");
    banner.innerText = text;
    banner.style.position = "absolute";
    banner.style.top = "30%";
    banner.style.left = "50%";
    banner.style.transform = "translate(-50%, -50%) scale(0.8)";
    banner.style.padding = "12px 28px";
    banner.style.background = "rgba(4, 10, 7, 0.92)";
    banner.style.border = "2px solid #22c55e";
    banner.style.borderRadius = "14px";
    banner.style.fontSize = "22px";
    banner.style.fontWeight = "900";
    banner.style.color = "#ffffff";
    banner.style.textShadow = "0 3px 12px rgba(0,0,0,0.9)";
    banner.style.zIndex = "30";
    banner.style.pointerEvents = "none";
    banner.style.transition = "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    banner.style.boxShadow = "0 10px 30px rgba(0,0,0,0.7)";

    gameAreaRef.appendChild(banner);

    setTimeout(() => {
        banner.style.transform = "translate(-50%, -50%) scale(1)";
    }, 20);

    setTimeout(() => {
        banner.remove();
    }, 1150);
}

function showPitchInfo() {
    const box = document.createElement("div");
    box.innerHTML = `⚾ AI 구종: ${game.pitch.type.name}`;
    box.style.position = "absolute";
    box.style.top = "78px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "4px 16px";
    box.style.background = "rgba(4, 10, 7, 0.85)";
    box.style.color = "#38bdf8";
    box.style.borderRadius = "20px";
    box.style.fontSize = "12px";
    box.style.fontWeight = "900";
    box.style.zIndex = "10";
    box.style.pointerEvents = "none";
    box.style.border = "1px solid rgba(56, 189, 248, 0.5)";

    gameAreaRef.appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 850);
}

// =======================
// 경기 종료 화면 (모바일 게임 결산창)
// =======================

function endGame() {
    game.gameOver = true;
    destroy();

    gameAreaRef.innerHTML = `
        <div style="
            width:100%;
            height:100%;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            gap:22px;
            background: linear-gradient(135deg, #050b08 0%, #0d2818 50%, #031008 100%);
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            box-sizing:border-box;
            box-shadow: inset 0 0 50px rgba(0,0,0,0.8);
        ">
            <h1 style="font-size:32px; font-weight:900; margin:0; color:#facc15; letter-spacing:1px;">🏆 GAME OVER</h1>
            <div style="background:rgba(0,0,0,0.6); padding:28px 55px; border-radius:20px; text-align:center; border: 2px solid #22c55e; box-shadow: 0 12px 30px rgba(0,0,0,0.6);">
                <p style="color:#94a3b8; font-size:13px; margin:0; font-weight:900; letter-spacing:2px;">FINAL SCORE</p>
                <h2 style="color:#22c55e; font-size:48px; margin:6px 0 0 0; font-weight:900;">${game.score}</h2>
            </div>
            <p style="font-size:15px; color:#cbd5e1; margin:0;">총 기록된 아웃: <span style="color:#ef4444; font-weight:900;">${game.outs}</span>개</p>
            <button id="restartBaseball" style="
                padding:15px 45px;
                border-radius:30px;
                border:none;
                background: linear-gradient(90deg, #15803d, #22c55e);
                color:white;
                font-size:17px;
                font-weight:900;
                cursor:pointer;
                box-shadow: 0 6px 20px rgba(34,197,94,0.4);
                letter-spacing:1px;
            ">다시 도전하기</button>
        </div>
    `;

    document.getElementById("restartBaseball").onclick = () => {
        showDifficulty();
    };
}
