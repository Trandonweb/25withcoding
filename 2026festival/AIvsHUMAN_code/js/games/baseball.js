// baseball.js
// ⚾ AI vs HUMAN - Baseball (Festival Edition - Final Fixed Layout & Casual Balance)

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animation = null;
let swingKey = null;
let resizeHandler = null;

// 1. 해상도 변경 (480 x 720 기준 재설계)
const GAME_WIDTH = 480;
const GAME_HEIGHT = 720;

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
    swingAnimProgress: 0,
    activeEffect: null
};

// 플레이어 타이밍 성향 분석 (AI 투수 연출용)
let playerHistory = {
    swings: 0,
    earlyHits: 0,
    lateHits: 0
};

// 난이도 설정
const difficulties = {
    easy: { name: "쉬움", speed: 0.6, hitBonus: 1.4 },
    normal: { name: "보통", speed: 0.85, hitBonus: 1.1 },
    hard: { name: "어려움", speed: 1.15, hitBonus: 1.0 }
};

// 구종 데이터
const pitches = [
    { name: "포심 패스트볼", speed: 1.1, moveX: 0, moveY: 0, type: "fast" },
    { name: "슬라이더", speed: 0.95, moveX: 45, moveY: 10, type: "slider" },
    { name: "커브볼", speed: 0.75, moveX: -15, moveY: 55, type: "curve" },
    { name: "포크볼", speed: 0.85, moveX: 0, moveY: 65, type: "fork" }
];

// =======================
// 컬러 팔레트 시스템
// =======================
const pixelColors = {
    "A": "#0b131a", // 외곽선 / 그림자
    "B": "#1e3a8a", // 헬멧 섀도우
    "C": "#3b82f6", // 헬멧 하이라이트
    "D": "#7c2d12", // 피부 그림자
    "E": "#d97706", // 피부톤
    "F": "#fbbf24", // 피부 하이라이트
    "G": "#ffffff", // 유니폼 베이스
    "H": "#dc2626", // 포인트 레드
    "I": "#94a3b8", // 주름 그림자
    "P": "#334155", // 바지 컬러
    "J": "#0f172a", // 스파이크화
    "K": "#78350f", // 배트 섀도우
    "L": "#d97706", // 배트 미드톤
    "M": "#fde047", // 배트 하이라이트
    "N": "#1e293b", // 장갑
    "O": "#334155"
};

// =======================
// 고밀도 도트 스프라이트
// =======================
const batterPixel = [
    "................................AAAAA...................................",
    "............................AAAAABBBBAA.................................",
    "..........................AAABBBBBBBBBBBA...............................",
    "........................AABBBBBCCCCCCCCBBBA.............................",
    "......................AABBBCCCCCCCCCCCCBBBA.............................",
    "................     AABBBCCCCCCCCCCHHHBBBA.............................",
    ".....................AABBBCCCCCCCHHHHHHHHBBA............................",
    "................     AABBBCCCCCHHHHHHHHHHHBA............................",
    "......................AABBBFFEEEEEEEEEEDBA..............................",
    "................      AABBEFFFFFFFFFFEEDBA..............................",
    ".......................ABEFFEEFFFFFFEEEDBA..............................",
    ".......................ABEFEEAFFFFEEAEEDBA..............................",
    ".......................ABEEDAAFFFEEDAAEDBA..............................",
    "................        ABEDDAEFFFEEADEDBA..............................",
    "................         ABDDDAEEEEEADDBA...............................",
    "................          ADDDDDDDDDDBBA................................",
    "................           AAAAAABBAAA..................................",
    "................         AAGGGGGGGGGGGAA................................",
    "................       AAGGIGHHHHHHGIIGGAA..............................",
    "................      AAGGIGHHHHHHGIIGGGGA..............................",
    "................     AAGGIGHHHHHHGIIGGGGGA..............................",
    "................    AAGGIGHHHHHHGIIGGGGGGA..............................",
    "................   AAGGIGHHHHHHGIIGGGGGGGGA.............................",
    "................  AAGGIGHHHHHHGIIGGGGGGGGAA.............................",
    "................ AAGGIGHHHHHHGIIGGGGGGGGGAA.............................",
    "................AAGGIGHHHHHHGIIGGGGGGGGGAA..............................",
    "................AAGGIGHHHHHHGIIGGGGGGGGGAA..............................",
    "...............AAGGIGHHHHHHGIIGGGGGGGGGAA...............................",
    "...............AAGGIGHHHHHHGIIGGGGGGGGGAA...............................",
    "...............AAGGIGHHHHHHGIIGGGGGGGGGAA...............................",
    "...............AAGGIGHHHHHHGIIGGGGGGGGGAA...............................",
    "...............AAGGIGHHHHHHGIIGGGGGGGGGAA...............................",
    "................AAGGIGHHHHHHGIIGGGGGGGGA................................",
    ".................AAGGGGGGGGGGGGGGGGGGAA.................................",
    "..................AAGGIIIIIIIIGGGGGGAA..................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAPPPPPPPPPPPPPAA....................................",
    "................   AAJJJJJJJJJJJJAA.....................................",
    "................    AAJJJJJJJJJJAA......................................"
];

const batPixel = [
    "........................KK",
    ".......................KKM",
    "......................KKMM",
    ".....................KKMM.",
    "....................KKMM..",
    "...................KKLL...",
    "..................KKLL....",
    ".................KKLL.....",
    "................KKLL......",
    "...............KKLL.......",
    "..............KKLL........",
    ".............KKLL.........",
    "............KKLL..........",
    "...........KKLL...........",
    "..........KKLL............",
    ".........KKLL.............",
    "........KKLL..............",
    ".......KKLL...............",
    "......KKLL................",
    ".....KKLL.................",
    "    KKLL..................",
    "   KKLL...................",
    "  KKLL....................",
    " KKLL.....................",
    "KKLL......................",
    "KLL.......................",
    "LL........................"
];

function drawPixelArt(sprite, x, y, size) {
    for (let row = 0; row < sprite.length; row++) {
        for (let col = 0; col < sprite[row].length; col++) {
            const pixel = sprite[row][col];
            if (pixel === ".") continue;

            ctx.fillStyle = pixelColors[pixel] || "#000000";
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
            gap:20px;
            background:#0b1d12;
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            box-sizing:border-box;
        ">
            <h1 style="font-size:28px; text-shadow: 0 4px 10px rgba(0,0,0,0.5); margin:0;">
                ⚾ AI 투수 챌린지 (Festival Edition)
            </h1>
            <p style="color:#8fbc8f; font-size:15px; margin:0 0 10px 0;">
                스페이스바로 시원하게 홈런을 날려보세요!
            </p>
            <button class="bb-btn" data-level="easy">쉬움 (추천)</button>
            <button class="bb-btn" data-level="normal">보통</button>
            <button class="bb-btn" data-level="hard">어려움</button>
        </div>
    `;

    const buttons = gameAreaRef.querySelectorAll(".bb-btn");
    buttons.forEach(btn => {
        btn.style.padding = "14px 45px";
        btn.style.borderRadius = "25px";
        btn.style.border = "3px solid #1ea857";
        btn.style.background = "#14281d";
        btn.style.color = "#ffffff";
        btn.style.fontSize = "18px";
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
    game.activeEffect = null;

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
            background:#0b1d12;
            color:white;
            border-radius:20px;
            overflow:hidden;
            box-sizing:border-box;
        ">
            <!-- 상단 정보 UI (55px 고정) -->
            <div style="
                height:55px;
                background:#14281d;
                display:flex;
                justify-content:space-around;
                align-items:center;
                font-size:14px;
                font-weight:bold;
                border-bottom: 2px solid #1ea857;
                flex-shrink:0;
            ">
                <div>⚾ ${difficulties[game.difficulty].name}</div>
                <div>점수 : <span id="score">0</span></div>
                <div>아웃 : <span id="outs">0</span> / 3</div>
                <div>카운트 : <span id="count">0B 0S</span></div>
            </div>

            <!-- 경기장 캔버스 영역 (480x720 최적화) -->
            <div style="
                flex:1;
                width:100%;
                max-height: calc(100vh - 125px);
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

            <!-- 하단 스윙 컨트롤 버튼 (70px 고정) -->
            <div style="
                height:70px;
                background:#14281d;
                display:flex;
                justify-content:center;
                align-items:center;
                border-top: 2px solid #1ea857;
                flex-shrink:0;
            ">
                <button id="swingButton" style="
                    padding:12px 45px;
                    border:none;
                    border-radius:30px;
                    background:#1ea857;
                    color:white;
                    font-size:17px;
                    font-weight:bold;
                    cursor:pointer;
                    box-shadow: 0 4px 15px rgba(30,168,87,0.4);
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

// 2. resizeCanvas() 누적 버그 해결 (setTransform 적용)
function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

// =======================
// AI 구종 선택 시스템
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

    const selected = selectSmartPitch();

    // 3. 투구 시작점 및 목표점 좌표 재배치 (투수 → 스트라이크존 → 타자/홈플레이트)
    game.pitch = {
        type: selected,
        startX: GAME_WIDTH / 2,
        startY: 80,                         // 상단 투수 위치
        targetX: GAME_WIDTH / 2,
        targetY: GAME_HEIGHT * 0.76,        // 타격 판정 지점 (타자 앞)
        x: GAME_WIDTH / 2,
        y: 80,
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

        if (game.activeEffect) {
            drawHitEffect();
        }

        const p = game.pitch;
        if (game.pitching && p) {
            p.progress += p.speed;

            let curX = p.startX + (p.targetX - p.startX) * p.progress;
            let curY = p.startY + (p.targetY - p.startY) * p.progress;

            curX += p.type.moveX * Math.sin(p.progress * Math.PI);
            curY += p.type.moveY * Math.pow(p.progress, 2);

            p.x = curX;
            p.y = curY;

            // 공 크기 원근감 (작게 시작해서 앞으로 올수록 커짐)
            const currentRadius = 4 + (10 * p.progress);
            drawBall(p.x, p.y, currentRadius);

            if (p.progress >= 1.0) {
                game.pitching = false;
                if (!game.swing) {
                    judgePitch();
                }
                return;
            }
        } else if (game.swing && p) {
            const currentRadius = 4 + (10 * p.progress);
            drawBall(p.x, p.y, currentRadius);
        }

        animation = requestAnimationFrame(loop);
    }

    loop();
}

// =======================
// 3. 경기장 및 스트라이크존/홈플레이트 재배치
// =======================

function drawField() {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, "#0f2e1a");
    bgGrad.addColorStop(0.4, "#176b3a");
    bgGrad.addColorStop(1, "#124e29");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 투수 마운드 (상단)
    ctx.fillStyle = "#a16207";
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, 85, 25, 0, Math.PI * 2);
    ctx.fill();

    // 내야 잔디 라인
    ctx.fillStyle = "#1e7e43";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 120, GAME_HEIGHT * 0.35);
    ctx.lineTo(GAME_WIDTH / 2 + 120, GAME_HEIGHT * 0.35);
    ctx.lineTo(GAME_WIDTH + 80, GAME_HEIGHT);
    ctx.lineTo(-80, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 스트라이크존 (중앙 배치)
    // x = GAME_WIDTH / 2 - 65, y = GAME_HEIGHT * 0.55, width = 130, height = 130 (좌우 20% 넓게 확장 반영)
    ctx.strokeStyle = "rgba(0, 255, 136, 0.8)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(0, 255, 136, 0.12)";
    ctx.fillRect(GAME_WIDTH / 2 - 78, GAME_HEIGHT * 0.52, 156, 140);
    ctx.strokeRect(GAME_WIDTH / 2 - 78, GAME_HEIGHT * 0.52, 156, 140);

    // 홈플레이트 (하단 0.83 근처 배치)
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 35, GAME_HEIGHT * 0.82);
    ctx.lineTo(GAME_WIDTH / 2 + 35, GAME_HEIGHT * 0.82);
    ctx.lineTo(GAME_WIDTH / 2 + 42, GAME_HEIGHT * 0.86);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.91);
    ctx.lineTo(GAME_WIDTH / 2 - 42, GAME_HEIGHT * 0.86);
    ctx.closePath();
    ctx.fill();
}

function drawBall(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#dc2626";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0.2, Math.PI - 0.2, false);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// =======================
// 4. 타자 수정 (pixelSize 1.5~1.8 축소 및 위치 재배치)
// =======================

function drawPixelBatterAndBat() {
    const bx = GAME_WIDTH / 2 + 45;
    const by = GAME_HEIGHT * 0.75; // 하단 타자 위치 (GAME_HEIGHT * 0.75 근처)
    const pixelSize = 1.65;         // 화면의 15~20% 비율에 맞게 축소

    drawPixelArt(batterPixel, bx - 60, by - 45, pixelSize);

    ctx.save();
    
    // 5. 배트가 공이 들어오는 방향(위쪽)을 향하도록 각도 및 회전 중심 수정
    let batAngle = -1.2;
    if (game.swingAnimProgress > 0) {
        batAngle = -1.2 - (game.swingAnimProgress * 2.4);
    }

    ctx.translate(bx - 10, by);
    ctx.rotate(batAngle);

    drawPixelArt(batPixel, -15, -45, pixelSize);

    ctx.restore();
}

// =======================
// 6. 판정 완화 및 스윙 시스템
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
    const hitTargetY = GAME_HEIGHT * 0.76;
    const timingDiff = p.y - hitTargetY;

    playerHistory.swings++;
    if (timingDiff < 0) {
        playerHistory.earlyHits++;
    } else {
        playerHistory.lateHits++;
    }

    const absTiming = Math.abs(timingDiff);
    const hitBonus = difficulties[game.difficulty].hitBonus;

    // 스트라이크존 좌우 20% 넓어진 영역 판단
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 78;
    const inZoneY = p.y >= GAME_HEIGHT * 0.52 && p.y <= GAME_HEIGHT * 0.76 + 30;
    const isInsideZone = inZoneX && inZoneY;

    let result = "miss";

    if (!isInsideZone) {
        result = "miss";
    } else {
        // 🌟 축제 참가자 기준 완화된 판정 범위 적용 (홈런: 35, 2루타: 70, 안타: 110)
        if (absTiming <= 35 * hitBonus) {
            result = "home";
        } else if (absTiming <= 70 * hitBonus) {
            result = "double";
        } else if (absTiming <= 110 * hitBonus) {
            result = "hit";
        } else if (absTiming <= 145 * hitBonus) {
            result = "foul";
        } else {
            result = "miss";
        }
    }

    processResult(result);
}

function judgePitch() {
    const p = game.pitch;
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 78;
    const inZoneY = p.y >= GAME_HEIGHT * 0.52 && p.y <= GAME_HEIGHT * 0.76 + 35;

    if (inZoneX && inZoneY) {
        processResult("strike");
    } else {
        processResult("ball");
    }
}

// =======================
// 결과 처리 및 이펙트 관리
// =======================

function processResult(result) {
    game.pitching = false;
    let text = "";

    switch (result) {
        case "home":
            game.score += 50;
            text = "🔥 홈런!! +50점";
            triggerEffect("#facc15");
            break;
        case "double":
            game.score += 25;
            text = "⚾ 2루타! +25점";
            triggerEffect("#38bdf8");
            break;
        case "hit":
            game.score += 10;
            text = "⚾ 안타! +10점";
            triggerEffect("#4ade80");
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

function triggerEffect(color) {
    game.activeEffect = {
        color: color,
        radius: 10,
        maxRadius: 70,
        alpha: 1.0
    };
}

function drawHitEffect() {
    const eff = game.activeEffect;
    if (!eff) return;

    ctx.save();
    ctx.strokeStyle = eff.color;
    ctx.lineWidth = 3.5;
    ctx.globalAlpha = eff.alpha;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT * 0.76, eff.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    eff.radius += 3.5;
    eff.alpha -= 0.05;

    if (eff.alpha <= 0) {
        game.activeEffect = null;
    }
}

// =======================
// UI 업데이트
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
    div.style.top = "22%";
    div.style.left = "50%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.fontSize = "28px";
    div.style.fontWeight = "900";
    div.style.color = "#ffffff";
    div.style.textShadow = "0 4px 10px rgba(0,0,0,0.8)";
    div.style.zIndex = "20";
    div.style.pointerEvents = "none";

    gameAreaRef.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 1000);
}

function showPitchInfo() {
    const box = document.createElement("div");
    box.innerHTML = `⚾ AI 구종: ${game.pitch.type.name}`;
    box.style.position = "absolute";
    box.style.top = "62px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "5px 14px";
    box.style.background = "rgba(0, 0, 0, 0.75)";
    box.style.color = "#38bdf8";
    box.style.borderRadius = "20px";
    box.style.fontSize = "13px";
    box.style.fontWeight = "bold";
    box.style.zIndex = "10";
    box.style.pointerEvents = "none";

    gameAreaRef.appendChild(box);

    setTimeout(() => {
        box.remove();
    }, 900);
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
            gap:20px;
            background:#0b1d12;
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            box-sizing:border-box;
        ">
            <h1 style="font-size:28px; margin:0;">⚾ 경기 종료</h1>
            <div style="background:#14281d; padding:20px 40px; border-radius:15px; text-align:center; border: 2px solid #1ea857;">
                <p style="color:#aaa; font-size:15px; margin:0 0 8px 0;">최종 득점</p>
                <h2 style="color:#1ea857; font-size:38px; margin:0;">${game.score} 점</h2>
            </div>
            <p style="font-size:15px; color:#cbd5e1; margin:0;">기록된 총 아웃: ${game.outs}개</p>
            <button id="restartBaseball" style="
                padding:12px 40px;
                border-radius:25px;
                border:none;
                background:#1ea857;
                color:white;
                font-size:17px;
                font-weight:bold;
                cursor:pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.4);
            ">다시 하기</button>
        </div>
    `;

    document.getElementById("restartBaseball").onclick = () => {
        showDifficulty();
    };
}
