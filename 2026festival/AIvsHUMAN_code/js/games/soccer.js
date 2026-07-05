console.log("⚽ FREEKICK SOCCER LOADED");

// =========================
// CANVAS SETUP
// =========================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 500;

// =========================
// PIXEL OBJECTS (직접 생성)
// =========================

// 골대 (픽셀)
const goal = {
    x: 780,
    y: 170,
    w: 20,
    h: 160
};

// 공 (pixel ball)
const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 6,
    moving: false
};

// 골키퍼 (AI)
const keeper = {
    x: 760,
    y: 250,
    w: 10,
    h: 60,
    targetY: 250
};

// =========================
// GAME STATE
// =========================
let round = 0;
let maxRound = 5;

let scoreHuman = 0;
let scoreAI = 0;

let mode = "HUMAN_ATTACK"; 
// HUMAN_ATTACK / HUMAN_DEFENSE

let dragging = false;
let start = null;
let end = null;

// 프리킥 위치 (박스 밖 랜덤)
function spawnBall() {
    ball.x = 100 + Math.random() * 250;
    ball.y = 150 + Math.random() * 200;
    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;

    start = null;
    end = null;
}

// =========================
// INPUT (DRAG SHOT)
// =========================
canvas.addEventListener("mousedown", (e) => {
    if (ball.moving) return;

    dragging = true;
    start = getPos(e);
});

canvas.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    end = getPos(e);
});

canvas.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;

    if (mode === "HUMAN_ATTACK") shootHuman();
});

// =========================
// MOUSE POS
// =========================
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

// =========================
// HUMAN SHOOT
// =========================
function shootHuman() {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const power = Math.min(18, Math.hypot(dx, dy) / 10);
    const angle = Math.atan2(dy, dx);

    // 커브 추가 (살짝)
    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;

    ball.moving = true;
}

// =========================
// AI SHOOT (수비 턴)
// =========================
function aiShoot() {
    const targetY = 150 + Math.random() * 200;

    const dx = goal.x - ball.x;
    const dy = targetY - ball.y;

    const power = 12 + Math.random() * 6;

    ball.vx = dx * 0.02 + (Math.random() - 0.5);
    ball.vy = dy * 0.02;

    ball.moving = true;
}

// =========================
// AI KEEPER
// =========================
function updateKeeper() {
    let reaction = 0.08;

    if (window.difficulty === "easy") reaction = 0.04;
    if (window.difficulty === "hard") reaction = 0.12;

    keeper.targetY = ball.y;

    keeper.y += (keeper.targetY - keeper.y) * reaction;
}

// =========================
// COLLISION
// =========================
function checkGoal() {

    // 골 판정
    if (
        ball.x > goal.x &&
        ball.y > goal.y &&
        ball.y < goal.y + goal.h
    ) {
        if (mode === "HUMAN_ATTACK") scoreHuman++;
        else scoreAI++;

        nextRound();
    }

    // 골키퍼 막기
    if (
        ball.x > keeper.x &&
        ball.y > keeper.y &&
        ball.y < keeper.y + keeper.h
    ) {
        nextRound();
    }

    // 아웃
    if (ball.x > canvas.width) {
        nextRound();
    }
}

// =========================
// NEXT ROUND
// =========================
function nextRound() {
    round++;

    if (round >= maxRound) {
        endGame();
        return;
    }

    // 공격/수비 전환
    mode = (mode === "HUMAN_ATTACK")
        ? "HUMAN_DEFENSE"
        : "HUMAN_ATTACK";

    spawnBall();

    if (mode === "HUMAN_DEFENSE") {
        setTimeout(aiShoot, 500);
    }
}

// =========================
// END GAME
// =========================
function endGame() {
    console.log("GAME END");
    console.log("HUMAN:", scoreHuman, "AI:", scoreAI);

    localStorage.setItem("soccer_result", JSON.stringify({
        human: scoreHuman,
        ai: scoreAI
    }));

    window.parent.postMessage({
        type: "SOCCER_END",
        human: scoreHuman,
        ai: scoreAI
    }, "*");
}

// =========================
// UPDATE
// =========================
function update() {

    if (ball.moving) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // 감속
        ball.vx *= 0.98;
        ball.vy *= 0.98;
    }

    updateKeeper();
    checkGoal();
}

// =========================
// DRAW (PIXEL STYLE)
// =========================
function drawPixel(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 필드
    drawPixel(0, 0, canvas.width, canvas.height, "#2ecc71");

    // 골대
    drawPixel(goal.x, goal.y, goal.w, goal.h, "#ffffff");

    // 골키퍼
    drawPixel(keeper.x, keeper.y, keeper.w, keeper.h, "#3498db");

    // 공
    drawPixel(ball.x, ball.y, ball.r, ball.r, "#f1c40f");

    // 드래그 라인
    if (dragging && start && end) {
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    // UI
    ctx.fillStyle = "black";
    ctx.fillText(`ROUND: ${round}/${maxRound}`, 20, 20);
    ctx.fillText(`HUMAN: ${scoreHuman}`, 20, 40);
    ctx.fillText(`AI: ${scoreAI}`, 20, 60);
    ctx.fillText(`MODE: ${mode}`, 20, 80);
}

// =========================
// LOOP
// =========================
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

// start
spawnBall();
loop();
