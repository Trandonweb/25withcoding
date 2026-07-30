// baseball.js
// ⚾ AI vs HUMAN - Baseball (True Pixel Art Edition - Complete Code)

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animation = null;
let swingKey = null;
let resizeHandler = null;

// 가상 게임 해상도 (세로형 600 x 1200)
const GAME_WIDTH = 600;
const GAME_HEIGHT = 1200;

// 게임 상태 객체
let game = {
    difficulty: "",
    score: 0,
    outs: 0,
    balls: 0,
    strikes: 0,
    pitching: false,
    swing: false,
    pitch: null,
    gameOver: false,
    swingAnimProgress: 0 // 0: 대기, 0~1: 스윙 및 복귀 진행도
};

// 난이도 설정
const difficulties = {
    easy: { name: "쉬움", speed: 0.7 },
    normal: { name: "보통", speed: 1.0 },
    hard: { name: "어려움", speed: 1.4 }
};

// 구종 데이터
const pitches = [
    { name: "포심 패스트볼", speed: 1.2, moveX: 0, moveY: 0, type: "fast" },
    { name: "슬라이더", speed: 1.0, moveX: 75, moveY: 15, type: "slider" },
    { name: "커브볼", speed: 0.75, moveX: -30, moveY: 100, type: "curve" },
    { name: "포크볼", speed: 0.85, moveX: 0, moveY: 110, type: "fork" }
];

// =======================
// 진정한 픽셀 아트 스프라이트 데이터 (도트 매트릭스 방식)
// . = 투명
// H = 헬멧 (파란색)
// @ = 피부 (살색)
// # = 유니폼 상의 (흰색/포인트 레드 줄무늬)
// P = 팬츠/다리 (회색/흰색)
// S = 신발/스파이크 (어두운 색)
// =======================

const batterPixel = [
    "................HHHHHH..............",
    "............HHHHHHHHHH............",
    "............HH@@HH@@HH............",
    "............HH@@@@@@HH............",
    "..............@@@@@@..............",
    "............##########............",
    "..........###..##..###..........",
    "........######..##..######........",
    "..........##########..............",
    "............PPPPPP................",
    "............PPPPPP................",
    "............PPPPPP................",
    "............P....P................",
    "............S....S................"
];

// 별도 배트 스프라이트 (목재 텍스처 도트)
const batPixel = [
    "....B",
    "....B",
    "...BB",
    "...BB",
    "..BBB",
    "..BBB",
    ".BBBB",
    ".BBBB",
    "BBBBB",
    "BBBBB"
];

// 진정한 픽셀 아트 렌더링 엔진 함수
function drawPixelArt(sprite, x, y, size) {
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            const pixel = sprite[row][col];
            if (pixel === ".") continue;

            if (pixel === "H") ctx.fillStyle = "#1e3a8a";     // 헬멧 (네이비)
            else if (pixel === "@") ctx.fillStyle = "#d97706"; // 피부
            else if (pixel === "#") ctx.fillStyle = "#ffffff"; // 유니폼
            else if (pixel === "P") ctx.fillStyle = "#f8fafc"; // 바지
            else if (pixel === "S") ctx.fillStyle = "#0f172a"; // 신발
            else if (pixel === "B") ctx.fillStyle = "#b45309"; // 나무 배트

            ctx.fillRect(
                x + col * size,
                y + row * size,
                size,
                size
            );
        }
    }
}

// =======================
// 외부 실행 및 종료
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
// 난이도 선택 화면
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
            gap:25px;
            background:#0b1d12;
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            box-sizing:border-box;
        ">
            <h1 style="font-size:38px; text-shadow: 0 4px 10px rgba(0,0,0,0.5); margin:0;">
                ⚾ AI 투수 챌린지
            </h1>
            <p style="color:#8fbc8f; font-size:18px; margin:0 0 15px 0;">
                진짜 도트 그래픽으로 즐기는 홈런더비!
            </p>
            <button class="bb-btn" data-level="easy">쉬움</button>
            <button class="bb-btn" data-level="normal">보통</button>
            <button class="bb-btn" data-level="hard">어려움</button>
        </div>
    `;

    const buttons = gameAreaRef.querySelectorAll(".bb-btn");
    buttons.forEach(btn => {
        btn.style.padding = "16px 60px";
        btn.style.borderRadius = "30px";
        btn.style.border = "3px solid #1ea857";
        btn.style.background = "#14281d";
        btn.style.color = "#ffffff";
        btn.style.fontSize = "22px";
        btn.style.fontWeight = "bold";
        btn.style.cursor = "pointer";
        btn.style.boxShadow = "0 6px 15px rgba(0,0,0,0.4)";
        btn.style.transition = "transform 0.1s, background 0.1s";

        btn.onmouseover = () => {
            btn.style.background = "#1ea857";
            btn.style.transform = "scale(1.05)";
        };
        btn.onmouseout = () => {
            btn.style.background = "#14281d";
            btn.style.transform = "scale(1)";
        };
        btn.onclick = () => {
            game.difficulty = btn.dataset.level;
            startGame();
        };
    });
}

// =======================
// 게임 시작 및 화면 생성
// =======================

function startGame() {
    game.score = 0;
    game.outs = 0;
    game.balls = 0;
    game.strikes = 0;
    game.pitching = false;
    game.swing = false;
    game.gameOver = false;
    game.swingAnimProgress = 0;

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
            background:#0b1d12;
            color:white;
            border-radius:20px;
            overflow:hidden;
            box-sizing:border-box;
        ">
            <!-- 상단 정보 -->
            <div style="
                height:60px;
                background:#14281d;
                display:flex;
                justify-content:space-around;
                align-items:center;
                font-size:16px;
                font-weight:bold;
                border-bottom: 2px solid #1ea857;
                flex-shrink:0;
            ">
                <div>⚾ ${difficulties[game.difficulty].name}</div>
                <div>점수 : <span id="score">0</span></div>
                <div>아웃 : <span id="outs">0</span> / 3</div>
                <div>카운트 : <span id="count">0B 0S</span></div>
            </div>

            <!-- 경기장 영역 (검은 여백 없는 완벽한 비율 유지 컨테이너) -->
            <div style="
                flex:1;
                width:100%;
                position:relative;
                display:flex;
                justify-content:center;
                align-items:center;
                background:#12351f;
                overflow:hidden;
            ">
                <canvas id="baseballCanvas" style="
                    width:100%;
                    height:100%;
                    object-fit:contain;
                    image-rendering:pixelated;
                    image-rendering:crisp-edges;
                    display:block;
                "></canvas>
            </div>

            <!-- 하단 스윙 컨트롤 버튼 -->
            <div style="
                height:90px;
                background:#14281d;
                display:flex;
                justify-content:center;
                align-items:center;
                border-top: 2px solid #1ea857;
                flex-shrink:0;
            ">
                <button id="swingButton" style="
                    padding:14px 60px;
                    border:none;
                    border-radius:35px;
                    background:#1ea857;
                    color:white;
                    font-size:22px;
                    font-weight:bold;
                    cursor:pointer;
                    box-shadow: 0 6px 20px rgba(30,168,87,0.4);
                ">🏏 스윙! (SPACE)</button>
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
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
}

// =======================
// 투구 시스템 및 물리 루프
// =======================

function nextPitch() {
    if (game.outs >= 3) {
        endGame();
        return;
    }

    game.pitching = true;
    game.swing = false;
    game.swingAnimProgress = 0;

    const selected = pitches[Math.floor(Math.random() * pitches.length)];

    game.pitch = {
        type: selected,
        startX: GAME_WIDTH / 2,
        startY: 180,
        targetX: GAME_WIDTH / 2,
        targetY: GAME_HEIGHT * 0.78,
        x: GAME_WIDTH / 2,
        y: 180,
        progress: 0,
        speed: 0.011 * difficulties[game.difficulty].speed
    };

    showPitchInfo();
    startPitchAnimation();
}

function startPitchAnimation() {
    if (animation) cancelAnimationFrame(animation);

    function loop() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        drawField();
        drawPixelBatterAndBat();

        const p = game.pitch;
        if (game.pitching && p) {
            p.progress += p.speed;

            let curX = p.startX + (p.targetX - p.startX) * p.progress;
            let curY = p.startY + (p.targetY - p.startY) * p.progress;

            // 구종별 물리 궤적 계산
            curX += p.type.moveX * Math.sin(p.progress * Math.PI);
            curY += p.type.moveY * Math.pow(p.progress, 2);

            p.x = curX;
            p.y = curY;

            // 원근감 공 크기 적용
            const currentRadius = 8 + (16 * p.progress);
            drawBall(p.x, p.y, currentRadius);

            // 홈플레이트 도달 시 자동 판정 (스윙하지 않은 경우)
            if (p.progress >= 1.0) {
                game.pitching = false;
                if (!game.swing) {
                    judgePitch();
                }
                return;
            }
        } else if (game.swing && p) {
            const currentRadius = 8 + (16 * p.progress);
            drawBall(p.x, p.y, currentRadius);
        }

        animation = requestAnimationFrame(loop);
    }

    loop();
}

// =======================
// 경기장 및 스트라이크 존 렌더링
// =======================

function drawField() {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, "#0f2e1a");
    bgGrad.addColorStop(0.4, "#176b3a");
    bgGrad.addColorStop(1, "#124e29");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 내야 잔디 마운드 영역
    ctx.fillStyle = "#1e7e43";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 180, GAME_HEIGHT * 0.45);
    ctx.lineTo(GAME_WIDTH / 2 + 180, GAME_HEIGHT * 0.45);
    ctx.lineTo(GAME_WIDTH + 100, GAME_HEIGHT);
    ctx.lineTo(-100, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 🌟 야구 스트라이크 존
    ctx.strokeStyle = "rgba(0, 255, 136, 0.8)";
    ctx.lineWidth = 4;
    ctx.fillStyle = "rgba(0, 255, 136, 0.12)";
    ctx.fillRect(GAME_WIDTH / 2 - 80, GAME_HEIGHT * 0.60, 160, 200);
    ctx.strokeRect(GAME_WIDTH / 2 - 80, GAME_HEIGHT * 0.60, 160, 200);

    // 홈플레이트
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 45, GAME_HEIGHT * 0.78);
    ctx.lineTo(GAME_WIDTH / 2 + 45, GAME_HEIGHT * 0.78);
    ctx.lineTo(GAME_WIDTH / 2 + 55, GAME_HEIGHT * 0.84);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.92);
    ctx.lineTo(GAME_WIDTH / 2 - 55, GAME_HEIGHT * 0.84);
    ctx.closePath();
    ctx.fill();
}

// =======================
// 공 그리기
// =======================

function drawBall(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#dc2626";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0.2, Math.PI - 0.2, false);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

// =======================
// 진정한 픽셀 아트 타자 & 배트 렌더링 (회전 적용)
// =======================

function drawPixelBatterAndBat() {
    const bx = GAME_WIDTH / 2 + 110;
    const by = GAME_HEIGHT * 0.68;
    const pixelSize = 5; // 32x64 느낌의 깔끔한 도트 크기

    // 타자 스프라이트 본체 렌더링
    drawPixelArt(batterPixel, bx - 40, by - 40, pixelSize);

    // 배트 렌더링 및 회전 애니메이션 적용
    ctx.save();
    
    // 타자 중심부 기준으로 변환 및 회전
    let batAngle = -0.4;
    if (game.swingAnimProgress > 0) {
        batAngle = -0.4 - (game.swingAnimProgress * 2.5);
    }

    ctx.translate(bx - 20, by + 15);
    ctx.rotate(batAngle);

    // 픽셀 배트 그리기
    drawPixelArt(batPixel, -10, -50, pixelSize);

    ctx.restore();
}

// =======================
// 타격 및 스윙 판정 시스템
// =======================

function triggerSwing() {
    if (!game.pitching || game.swing) return;

    game.swing = true;
    game.swingAnimProgress = 0.15;

    const swingStartTime = performance.now();
    function animateSwing(now) {
        const elapsed = (now - swingStartTime) / 100;
        game.swingAnimProgress = 0.15 + elapsed * 0.8;

        if (game.swingAnimProgress >= 1.0) {
            game.swingAnimProgress = 1.0;
            setTimeout(() => {
                game.swingAnimProgress = 0;
            }, 100);
            return;
        }
        requestAnimationFrame(animateSwing);
    }
    requestAnimationFrame(animateSwing);

    const p = game.pitch;
    const hitTargetY = GAME_HEIGHT * 0.78;
    const timingDiff = Math.abs(p.y - hitTargetY);

    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 80;
    const inZoneY = p.y >= GAME_HEIGHT * 0.60 && p.y <= GAME_HEIGHT * 0.78 + 30;
    const isInsideZone = inZoneX && inZoneY;

    let result = "miss";

    if (!isInsideZone) {
        result = "miss";
    } else {
        if (timingDiff < 10) {
            result = "home";
        } else if (timingDiff < 25) {
            result = "double";
        } else if (timingDiff < 45) {
            result = "hit";
        } else if (timingDiff < 75) {
            result = "foul";
        } else {
            result = "miss";
        }
    }

    processResult(result);
}

function judgePitch() {
    const p = game.pitch;
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 80;
    const inZoneY = p.y >= GAME_HEIGHT * 0.60 && p.y <= GAME_HEIGHT * 0.78 + 40;

    if (inZoneX && inZoneY) {
        processResult("strike");
    } else {
        processResult("ball");
    }
}

// =======================
// 결과 처리 및 스코어 관리
// =======================

function processResult(result) {
    game.pitching = false;
    let text = "";

    switch (result) {
        case "home":
            game.score += 50;
            text = "🔥 홈런!! +50점";
            hitEffect("#facc15");
            break;
        case "double":
            game.score += 25;
            text = "⚾ 2루타! +25점";
            hitEffect("#38bdf8");
            break;
        case "hit":
            game.score += 10;
            text = "⚾ 안타! +10점";
            hitEffect("#4ade80");
            break;
        case "foul":
            if (game.strikes < 2) game.strikes++;
            text = "⚠️ 파울!";
            break;
        case "miss":
            game.strikes++;
            text = "❌ 헛스윙!";
            break;
        case "strike":
            game.strikes++;
            text = "❌ 스트라이크!";
            break;
        case "ball":
            game.balls++;
            text = "🟦 볼!";
            break;
    }

    if (game.balls >= 4) {
        game.score += 15;
        text = "🎯 볼넷 진루! +15점";
        game.balls = 0;
        game.strikes = 0;
    }

    if (game.strikes >= 3) {
        game.outs++;
        text = "❌ 삼진 아웃!";
        game.strikes = 0;
        game.balls = 0;
    }

    showMessage(text);
    updateUI();

    setTimeout(() => {
        nextPitch();
    }, 1200);
}

// =======================
// UI 및 이펙트 업데이트
// =======================

function updateUI() {
    const scoreEl = document.getElementById("score");
    const outsEl = document.getElementById("outs");
    const countEl = document.getElementById("count");

    if (scoreEl) scoreEl.innerText = game.score;
    if (outsEl) outsEl.innerText = game.outs;
    if (countEl) countEl.innerText = `${game.balls}B ${game.strikes}S`;
}

function showMessage(text) {
    const div = document.createElement("div");
    div.innerText = text;
    div.style.position = "absolute";
    div.style.top = "26%";
    div.style.left = "50%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.fontSize = "40px";
    div.style.fontWeight = "900";
    div.style.color = "#ffffff";
    div.style.textShadow = "0 4px 12px rgba(0,0,0,0.8)";
    div.style.zIndex = "20";
    div.style.pointerEvents = "none";

    gameAreaRef.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 1000);
}

function showPitchInfo() {
    const box = document.createElement("div");
    box.innerHTML = `⚾ 구종: ${game.pitch.type.name}`;
    box.style.position = "absolute";
    box.style.top = "70px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "8px 20px";
    box.style.background = "rgba(0, 0, 0, 0.75)";
    box.style.color = "#38bdf8";
    box.style.borderRadius = "20px";
    box.style.fontSize = "16px";
    box.style.fontWeight = "bold";
    box.style.zIndex = "10";
    box.style.pointerEvents = "none";

    gameAreaRef.appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 900);
}

function hitEffect(color) {
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// =======================
// 경기 종료 화면
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
            gap:25px;
            background:#0b1d12;
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            box-sizing:border-box;
        ">
            <h1 style="font-size:38px; margin:0;">⚾ 경기 종료</h1>
            <div style="background:#14281d; padding:25px 50px; border-radius:15px; text-align:center; border: 2px solid #1ea857;">
                <p style="color:#aaa; font-size:18px; margin:0 0 10px 0;">최종 득점</p>
                <h2 style="color:#1ea857; font-size:48px; margin:0;">${game.score} 점</h2>
            </div>
            <p style="font-size:18px; color:#cbd5e1; margin:0;">기록된 총 아웃: ${game.outs}개</p>
            <button id="restartBaseball" style="
                padding:15px 50px;
                border-radius:30px;
                border:none;
                background:#1ea857;
                color:white;
                font-size:20px;
                font-weight:bold;
                cursor:pointer;
                box-shadow: 0 6px 15px rgba(0,0,0,0.4);
            ">다시 하기</button>
        </div>
    `;

    document.getElementById("restartBaseball").onclick = () => {
        showDifficulty();
    };
}
