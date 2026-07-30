// baseball.js
// ⚾ AI vs HUMAN - Baseball (Festival Edition - Ultimate Balance & Scale Optimized)

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animation = null;
let swingKey = null;
let resizeHandler = null;

// 가상 게임 해상도 유지 (600 x 900)
const GAME_WIDTH = 600;
const GAME_HEIGHT = 900;

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

// 난이도 설정 (이지 모드 판정 보정 배수 추가)
const difficulties = {
    easy: { name: "쉬움", speed: 0.65, hitBonus: 1.5 },
    normal: { name: "보통", speed: 0.95, hitBonus: 1.2 },
    hard: { name: "어려움", speed: 1.3, hitBonus: 1.0 }
};

// 구종 데이터 (축제용 적정 속도 및 궤적)
const pitches = [
    { name: "포심 패스트볼", speed: 1.1, moveX: 0, moveY: 0, type: "fast" },
    { name: "슬라이더", speed: 0.95, moveX: 55, moveY: 10, type: "slider" },
    { name: "커브볼", speed: 0.75, moveX: -20, moveY: 70, type: "curve" },
    { name: "포크볼", speed: 0.85, moveX: 0, moveY: 80, type: "fork" }
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
            <h1 style="font-size:32px; text-shadow: 0 4px 10px rgba(0,0,0,0.5); margin:0;">
                ⚾ AI 투수 챌린지 (Festival Edition)
            </h1>
            <p style="color:#8fbc8f; font-size:16px; margin:0 0 10px 0;">
                누구나 쉽게 즐기는 초간단 홈런더비!
            </p>
            <button class="bb-btn" data-level="easy">쉬움 (추천)</button>
            <button class="bb-btn" data-level="normal">보통</button>
            <button class="bb-btn" data-level="hard">어려움</button>
        </div>
    `;

    const buttons = gameAreaRef.querySelectorAll(".bb-btn");
    buttons.forEach(btn => {
        btn.style.padding = "14px 50px";
        btn.style.borderRadius = "25px";
        btn.style.border = "3px solid #1ea857";
        btn.style.background = "#14281d";
        btn.style.color = "#ffffff";
        btn.style.fontSize = "20px";
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
            <!-- 상단 정보 UI (60px 고정) -->
            <div style="
                height:60px;
                background:#14281d;
                display:flex;
                justify-content:space-around;
                align-items:center;
                font-size:15px;
                font-weight:bold;
                border-bottom: 2px solid #1ea857;
                flex-shrink:0;
            ">
                <div>⚾ ${difficulties[game.difficulty].name}</div>
                <div>점수 : <span id="score">0</span></div>
                <div>아웃 : <span id="outs">0</span> / 3</div>
                <div>카운트 : <span id="count">0B 0S</span></div>
            </div>

            <!-- 경기장 캔버스 영역 -->
            <div style="
                flex:1;
                width:100%;
                max-height: calc(100vh - 130px);
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
                    padding:12px 50px;
                    border:none;
                    border-radius:30px;
                    background:#1ea857;
                    color:white;
                    font-size:18px;
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

function resizeCanvas() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = GAME_WIDTH * dpr;
    canvas.height = GAME_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
}

// =======================
// 스마트 AI 투구 선택 로직
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

    game.pitch = {
        type: selected,
        startX: GAME_WIDTH / 2,
        startY: 140,
        targetX: GAME_WIDTH / 2,
        targetY: GAME_HEIGHT * 0.72,
        x: GAME_WIDTH / 2,
        y: 140,
        progress: 0,
        speed: 0.012 * difficulties[game.difficulty].speed
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

            const currentRadius = 6 + (12 * p.progress);
            drawBall(p.x, p.y, currentRadius);

            if (p.progress >= 1.0) {
                game.pitching = false;
                if (!game.swing) {
                    judgePitch();
                }
                return;
            }
        } else if (game.swing && p) {
            const currentRadius = 6 + (12 * p.progress);
            drawBall(p.x, p.y, currentRadius);
        }

        animation = requestAnimationFrame(loop);
    }

    loop();
}

// =======================
// 경기장 및 넓어진 스트라이크 존 렌더링
// =======================

function drawField() {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGrad.addColorStop(0, "#0f2e1a");
    bgGrad.addColorStop(0.4, "#176b3a");
    bgGrad.addColorStop(1, "#124e29");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "#1e7e43";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 150, GAME_HEIGHT * 0.40);
    ctx.lineTo(GAME_WIDTH / 2 + 150, GAME_HEIGHT * 0.40);
    ctx.lineTo(GAME_WIDTH + 100, GAME_HEIGHT);
    ctx.lineTo(-100, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    // 🌟 넉넉하게 확장된 스트라이크 존 (가시성 및 판정 일치)
    ctx.strokeStyle = "rgba(0, 255, 136, 0.8)";
    ctx.lineWidth = 3;
    ctx.fillStyle = "rgba(0, 255, 136, 0.12)";
    ctx.fillRect(GAME_WIDTH / 2 - 95, GAME_HEIGHT * 0.52, 190, 190);
    ctx.strokeRect(GAME_WIDTH / 2 - 95, GAME_HEIGHT * 0.52, 190, 190);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 40, GAME_HEIGHT * 0.72);
    ctx.lineTo(GAME_WIDTH / 2 + 40, GAME_HEIGHT * 0.72);
    ctx.lineTo(GAME_WIDTH / 2 + 48, GAME_HEIGHT * 0.77);
    ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.84);
    ctx.lineTo(GAME_WIDTH / 2 - 48, GAME_HEIGHT * 0.77);
    ctx.closePath();
    ctx.fill();
}

function drawBall(x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#dc2626";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0.2, Math.PI - 0.2, false);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

// =======================
// 축제 맞춤형 소형 고밀도 타자 및 배트 렌더링 (pixelSize = 2.2 축소)
// =======================

function drawPixelBatterAndBat() {
    const bx = GAME_WIDTH / 2 + 55;
    const by = GAME_HEIGHT * 0.59;
    const pixelSize = 2.2; // 🌟 화면의 15~20% 수준으로 정교하게 축소

    drawPixelArt(batterPixel, bx - 75, by - 55, pixelSize);

    ctx.save();
    
    let batAngle = -0.3;
    if (game.swingAnimProgress > 0) {
        batAngle = -0.3 - (game.swingAnimProgress * 2.6);
    }

    ctx.translate(bx - 12, by + 5);
    ctx.rotate(batAngle);

    drawPixelArt(batPixel, -20, -55, pixelSize);

    ctx.restore();
}

// =======================
// 타격 및 대폭 완화된 스윙 판정 시스템
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
    const hitTargetY = GAME_HEIGHT * 0.72;
    const timingDiff = p.y - hitTargetY;

    playerHistory.swings++;
    if (timingDiff < 0) {
        playerHistory.earlyHits++;
    } else {
        playerHistory.lateHits++;
    }

    const absTiming = Math.abs(timingDiff);
    const hitBonus = difficulties[game.difficulty].hitBonus;

    // 대폭 확장된 스트라이크존 영역 판단
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 95;
    const inZoneY = p.y >= GAME_HEIGHT * 0.52 && p.y <= GAME_HEIGHT * 0.72 + 40;
    const isInsideZone = inZoneX && inZoneY;

    let result = "miss";

    if (!isInsideZone) {
        result = "miss";
    } else {
        // 🌟 일반인이 쉽게 안타/홈런을 칠 수 있도록 대폭 완화된 판정 범위 적용
        if (absTiming <= 20 * hitBonus) {
            result = "home";
        } else if (absTiming <= 45 * hitBonus) {
            result = "double";
        } else if (absTiming <= 75 * hitBonus) {
            result = "hit";
        } else if (absTiming <= 100 * hitBonus) {
            result = "foul";
        } else {
            result = "miss";
        }
    }

    processResult(result);
}

function judgePitch() {
    const p = game.pitch;
    const inZoneX = Math.abs(p.x - GAME_WIDTH / 2) <= 95;
    const inZoneY = p.y >= GAME_HEIGHT * 0.52 && p.y <= GAME_HEIGHT * 0.72 + 40;

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
        maxRadius: 80,
        alpha: 1.0
    };
}

function drawHitEffect() {
    const eff = game.activeEffect;
    if (!eff) return;

    ctx.save();
    ctx.strokeStyle = eff.color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = eff.alpha;
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, eff.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    eff.radius += 4;
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
    div.style.top = "24%";
    div.style.left = "50%";
    div.style.transform = "translate(-50%, -50%)";
    div.style.fontSize = "32px";
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
    box.style.top = "65px";
    box.style.left = "50%";
    box.style.transform = "translateX(-50%)";
    box.style.padding = "6px 16px";
    box.style.background = "rgba(0, 0, 0, 0.75)";
    box.style.color = "#38bdf8";
    box.style.borderRadius = "20px";
    box.style.fontSize = "14px";
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
            <h1 style="font-size:32px; margin:0;">⚾ 경기 종료</h1>
            <div style="background:#14281d; padding:20px 40px; border-radius:15px; text-align:center; border: 2px solid #1ea857;">
                <p style="color:#aaa; font-size:16px; margin:0 0 8px 0;">최종 득점</p>
                <h2 style="color:#1ea857; font-size:42px; margin:0;">${game.score} 점</h2>
            </div>
            <p style="font-size:16px; color:#cbd5e1; margin:0;">기록된 총 아웃: ${game.outs}개</p>
            <button id="restartBaseball" style="
                padding:14px 45px;
                border-radius:25px;
                border:none;
                background:#1ea857;
                color:white;
                font-size:18px;
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
