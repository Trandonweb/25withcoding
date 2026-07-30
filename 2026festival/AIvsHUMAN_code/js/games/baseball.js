// baseball.js (완전 통합본 - index.html 연동 및 완벽 구동 버전)

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animation = null;
let swingKey = null;
let resizeHandler = null;

const GAME_WIDTH = 480;
const GAME_HEIGHT = 800;

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
    pitcherState: "idle"
};

let playerHistory = {
    swings: 0,
    earlyHits: 0,
    lateHits: 0
};

const difficulties = {
    easy: { name: "쉬움", speed: 0.52, hitBonus: 1.6 },
    normal: { name: "보통", speed: 0.78, hitBonus: 1.25 },
    hard: { name: "어려움", speed: 1.05, hitBonus: 1.0 }
};

const pitches = [
    { name: "포심 패스트볼", speed: 1.18, moveX: 0, moveY: 0, type: "fast" },
    { name: "슬라이더", speed: 0.96, moveX: 60, moveY: 12, type: "slider" },
    { name: "커브볼", speed: 0.74, moveX: -25, moveY: 70, type: "curve" },
    { name: "포크볼", speed: 0.86, moveX: 0, moveY: 85, type: "fork" }
];

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
            border-radius:24px;
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
            initInput();
            nextPitch();
        };
    });
}

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
            <div style="
                height:60px;
                background: linear-gradient(180deg, rgba(8,20,14,0.95) 0%, rgba(4,10,7,0.95) 100%);
                display:flex;
                justify-content:space-between;
                align-items:center;
                padding: 0 16px;
                font-size:13px;
                font-weight:bold;
                border-bottom: 2px solid #16a34a;
                flex-shrink:0;
                z-index:10;
            ">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="background:#15803d; color:white; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:900;">${difficulties[game.difficulty].name}</span>
                    <span style="font-size:14px;">SCORE: <span id="score" style="color:#facc15; font-weight:900;">0</span></span>
                </div>
                <div style="display:flex; gap:10px; align-items:center;">
                    <span style="background:rgba(0,0,0,0.5); padding:3px 8px; border-radius:10px; border:1px solid rgba(255,255,255,0.1);">아웃 <span id="outs" style="color:#ef4444; font-weight:900;">0</span>/3</span>
                    <span style="background:rgba(22,163,74,0.2); padding:3px 10px; border-radius:10px; border:1px solid #16a34a; color:#4ade80; font-weight:900;" id="count">0B 0S</span>
                </div>
            </div>

            <div style="
                flex:1;
                width:100%;
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

            <div style="
                height:75px;
                background: linear-gradient(180deg, rgba(4,10,7,0.95) 0%, rgba(8,20,14,0.95) 100%);
                display:flex;
                flex-direction:column;
                justify-content:center;
                align-items:center;
                gap:4px;
                border-top: 2px solid #16a34a;
                flex-shrink:0;
                z-index:10;
                padding: 0 16px;
                box-sizing:border-box;
            ">
                <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:9px; color:#94a3b8; font-weight:900; letter-spacing:1px;">TIMING ZONE</span>
                    <div style="width:160px; height:5px; background:#030b08; border-radius:3px; overflow:hidden; border:1px solid rgba(255,255,255,0.2);">
                        <div id="timingIndicator" style="width:0%; height:100%; background:linear-gradient(90deg, #f59e0b, #ef4444);"></div>
                    </div>
                </div>
                <button id="swingButton" style="
                    width:100%;
                    padding:10px 0;
                    border:none;
                    border-radius:22px;
                    background: linear-gradient(90deg, #15803d, #22c55e);
                    color:white;
                    font-size:15px;
                    font-weight:900;
                    cursor:pointer;
                    box-shadow: 0 4px 15px rgba(34,197,94,0.4);
                    letter-spacing:1px;
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

    game.pitch = {
        type: selected,
        startX: GAME_WIDTH / 2,
        startY: 180,
        targetX: GAME_WIDTH / 2,
        targetY: 575,
        x: GAME_WIDTH / 2,
        y: 180,
        progress: 0,
        speed: 0.009 * difficulties[game.difficulty].speed
    };

    setTimeout(() => {
        game.pitcherState = "release";
    }, 300);

    showPitchInfo();
    startPitchAnimation();
}

function startPitchAnimation() {
    if (animation) cancelAnimationFrame(animation);

    function loop() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        if (game.screenShakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * 10;
            const shakeY = (Math.random() - 0.5) * 10;
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

            curX += p.type.moveX * Math.sin(p.progress * Math.PI);
            curY += p.type.moveY * Math.pow(p.progress, 2);

            p.x = curX;
            p.y = curY;

            const indicator = document.getElementById("timingIndicator");
            if (indicator) {
                indicator.style.width = `${p.progress * 100}%`;
            }

            const currentRadius = 3.0 + (16.0 * Math.pow(p.progress, 1.4));
            drawBallWithTrail(p.x, p.y, currentRadius, p);

            if (p.progress >= 1.0) {
                game.pitching = false;
                if (!game.swing) {
                    judgePitch();
                }
                return;
            }
        } else if (game.swing && p) {
            const currentRadius = 3.0 + (16.0 * Math.pow(p.progress, 1.4));
            drawBallWithTrail(p.x, p.y, currentRadius, p);
        }

        drawBatterAndBat();
        drawHitEffect();

        ctx.restore();
        animation = requestAnimationFrame(loop);
    }

    loop();
}

function draw3DStadium() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT * 0.38);
    skyGrad.addColorStop(0, "#020604");
    skyGrad.addColorStop(1, "#0d2b1c");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.38);

    ctx.fillStyle = "#050b08";
    ctx.fillRect(GAME_WIDTH / 2 - 80, GAME_HEIGHT * 0.22, 160, 45);
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GAME_WIDTH / 2 - 80, GAME_HEIGHT * 0.22, 160, 45);
    
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMPBASEBALL STADIUM", GAME_WIDTH / 2, GAME_HEIGHT * 0.25);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`SCORE ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.28);

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

    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.55);
    ctx.lineTo(-50, GAME_HEIGHT);
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.55);
    ctx.lineTo(GAME_WIDTH + 50, GAME_HEIGHT);
    ctx.stroke();
}

function drawPitcher() {
    const px = GAME_WIDTH / 2;
    const py = 180;

    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.ellipse(px, py + 10, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(px, py - 16, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - 14, py - 6, 28, 24);
}

function drawStrikeZoneAndPlate() {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
    ctx.fillRect(GAME_WIDTH / 2 - 64, 470, 128, 135);
    ctx.strokeRect(GAME_WIDTH / 2 - 64, 470, 128, 135);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 30, 568);
    ctx.lineTo(GAME_WIDTH / 2 + 30, 568);
    ctx.lineTo(GAME_WIDTH / 2 + 36, 580);
    ctx.lineTo(GAME_WIDTH / 2, 598);
    ctx.lineTo(GAME_WIDTH / 2 - 36, 580);
    ctx.closePath();
    ctx.fill();
}

function drawBallWithTrail(x, y, radius, pitchInfo) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = pitchInfo.type === "fast" ? "#38bdf8" : "#facc15";
    ctx.beginPath();
    ctx.arc(x, y - (pitchInfo.speed * 6), radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#dc2626";
    ctx.stroke();
}

function drawBatterAndBat() {
    const bx = GAME_WIDTH / 2 + 75;
    const by = 640;

    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.arc(bx - 10, by - 52, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx - 26, by - 35, 30, 42);

    ctx.save();
    let batAngle = -0.5;
    let batOffsetX = -20;
    let batOffsetY = -25;

    if (game.swingAnimProgress > 0) {
        batAngle = -0.5 - (game.swingAnimProgress * 3.0);
        batOffsetX = -10 + (game.swingAnimProgress * 25);
        batOffsetY = -40 + (game.swingAnimProgress * 12);
    }

    ctx.translate(bx + batOffsetX, by + batOffsetY);
    ctx.rotate(batAngle);

    ctx.fillStyle = "#d97706";
    ctx.fillRect(-4, -85, 8, 85);
    ctx.restore();
}

function initInput() {
    const btn = document.getElementById("swingButton");
    if (btn) {
        btn.onclick = () => performSwing();
    }

    if (swingKey) {
        window.removeEventListener("keydown", swingKey);
    }
    swingKey = (e) => {
        if (e.code === "Space" && !game.swing && game.pitching) {
            e.preventDefault();
            performSwing();
        }
    };
    window.addEventListener("keydown", swingKey);
}

function performSwing() {
    if (!game.pitching || game.swing) return;

    game.swing = true;
    playerHistory.swings++;

    const p = game.pitch;
    const progress = p.progress;

    if (progress < 0.72) {
        playerHistory.earlyHits++;
    } else if (progress > 0.92) {
        playerHistory.lateHits++;
    }

    let startTime = performance.now();
    const animDuration = 160;

    function animateSwing() {
        let elapsed = performance.now() - startTime;
        let progressVal = Math.min(elapsed / animDuration, 1);
        game.swingAnimProgress = progressVal;

        if (progressVal < 1) {
            requestAnimationFrame(animateSwing);
        } else {
            setTimeout(() => {
                game.swingAnimProgress = 0;
            }, 70);
        }
    }
    animateSwing();

    judgeHit(progress);
}

function judgeHit(progress) {
    game.pitching = false;

    if (progress >= 0.75 && progress <= 0.90) {
        const diff = Math.abs(progress - 0.825);
        let addScore = 100;

        if (diff < 0.02) {
            addScore = 500;
            game.screenShakeTimer = 15;
            game.activeEffect = { text: "HOME RUN!!", color: "#facc15", scale: 2.0 };
        } else if (diff < 0.04) {
            addScore = 250;
            game.screenShakeTimer = 8;
            game.activeEffect = { text: "DOUBLE!", color: "#38bdf8", scale: 1.5 };
        } else {
            game.activeEffect = { text: "HIT!", color: "#4ade80", scale: 1.2 };
        }

        game.score += addScore;
        updateScoreUI();
        triggerHitEffectCleanup();

    } else if (progress >= 0.65 && progress < 0.75) {
        game.strikes++;
        game.activeEffect = { text: "파울 (FOUL)", color: "#94a3b8", scale: 1.0 };
        if (game.strikes >= 2) game.strikes = 2;
        checkCountState();
        triggerHitEffectCleanup();
    } else {
        game.strikes++;
        game.activeEffect = { text: "헛스윙 (MISS)", color: "#ef4444", scale: 1.2 };
        checkCountState();
        triggerHitEffectCleanup();
    }
}

function judgePitch() {
    game.balls++;
    game.activeEffect = { text: "볼 (BALL)", color: "#38bdf8", scale: 1.0 };
    checkCountState();
    triggerHitEffectCleanup();
}

function checkCountState() {
    showPitchInfo();
    if (game.balls >= 4) {
        game.balls = 0;
        game.strikes = 0;
        game.score += 50;
        updateScoreUI();
    } else if (game.strikes >= 3) {
        game.strikes = 0;
        game.balls = 0;
        game.outs++;
        updateOutsUI();
    }

    setTimeout(() => {
        if (game.outs < 3) {
            nextPitch();
        } else {
            endGame();
        }
    }, 1000);
}

function updateScoreUI() {
    const el = document.getElementById("score");
    if (el) el.textContent = game.score;
}

function updateOutsUI() {
    const el = document.getElementById("outs");
    if (el) el.textContent = game.outs;
}

function showPitchInfo() {
    const countEl = document.getElementById("count");
    if (countEl) {
        countEl.textContent = `${game.balls}B ${game.strikes}S`;
    }
}

function triggerHitEffectCleanup() {
    setTimeout(() => {
        game.activeEffect = null;
    }, 850);
}

function drawHitEffect() {
    if (!game.activeEffect) return;
    ctx.save();
    ctx.font = `900 ${Math.floor(24 * game.activeEffect.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = game.activeEffect.color;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.fillText(game.activeEffect.text, GAME_WIDTH / 2, 320);
    ctx.restore();
}

function endGame() {
    destroy();
    game.gameOver = true;

    gameAreaRef.innerHTML = `
        <div style="
            width:100%;
            height:100%;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            background: linear-gradient(135deg, #050b08 0%, #0d2818 50%, #031008 100%);
            color:white;
            border-radius:24px;
            font-family:'Pretendard', sans-serif;
            text-align:center;
            padding: 0 24px;
            box-sizing:border-box;
        ">
            <h1 style="font-size:32px; font-weight:900; color:#ef4444; margin:0 0 10px 0;">GAME OVER</h1>
            <p style="color:#94a3b8; font-size:15px; margin:0 0 20px 0;">최종 스코어</p>
            <div style="font-size:48px; font-weight:900; color:#facc15; margin-bottom:30px;">${game.score} 점</div>
            <button id="restartBtn" style="
                width:220px;
                padding:15px 0;
                background:linear-gradient(90deg, #15803d, #22c55e);
                border:none;
                border-radius:30px;
                color:white;
                font-size:16px;
                font-weight:900;
                cursor:pointer;
                box-shadow:0 8px 25px rgba(0,0,0,0.5);
            ">다시 하기</button>
        </div>
    `;

    document.getElementById("restartBtn").onclick = () => {
        showDifficulty();
    };
}
