let gameAreaRef = null;

let difficulty = "easy";

let round = 0;
let maxRound = 5;

let scoreHuman = 0;
let scoreAI = 0;

let mode = "HUMAN_ATTACK";

let dragging = false;
let start = null;
let end = null;

// canvas
let canvas, ctx;

// =========================
// OBJECTS (3D 느낌 핵심)
// =========================

const goal = {
    x: 780,
    y: 170,
    w: 20,
    h: 160
};

const ball = {
    x: 120,
    y: 350,
    z: 0,       // 👈 깊이
    vx: 0,
    vy: 0,
    vz: 0,      // 👈 전진 힘
    r: 6,
    moving: false
};

const keeper = {
    x: 760,
    y: 250,
    w: 10,
    h: 60
};

// =========================
// ENTRY (number.js style)
// =========================
export function openSoccer(gameArea){
    gameAreaRef = gameArea;
    showDifficulty();
}

// =========================
// DIFFICULTY UI
// =========================
function showDifficulty(){
    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>⚽ 프리킥 축구 (3D MODE)</h2>

            <button onclick="window.__soccerStart('easy')">쉬움</button>
            <button onclick="window.__soccerStart('normal')">보통</button>
            <button onclick="window.__soccerStart('hard')">어려움</button>
        </div>
    `;

    window.__soccerStart = startGame;
}

// =========================
// START
// =========================
function startGame(level){
    difficulty = level;

    round = 0;
    scoreHuman = 0;
    scoreAI = 0;
    mode = "HUMAN_ATTACK";

    renderUI();
    initCanvas();
    spawnBall();

    loop();
}

// =========================
// UI
// =========================
function renderUI(){
    gameAreaRef.innerHTML = `
        <canvas id="gameCanvas"></canvas>
    `;
}

// =========================
// CANVAS INIT
// =========================
function initCanvas(){
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    canvas.width = 900;
    canvas.height = 500;

    canvas.addEventListener("mousedown", onDown);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseup", onUp);
}

// =========================
// INPUT
// =========================
function getPos(e){
    const r = canvas.getBoundingClientRect();
    return {
        x: e.clientX - r.left,
        y: e.clientY - r.top
    };
}

function onDown(e){
    if(ball.moving) return;
    dragging = true;
    start = getPos(e);
}

function onMove(e){
    if(!dragging) return;
    end = getPos(e);
}

function onUp(){
    if(!dragging) return;
    dragging = false;

    if(mode === "HUMAN_ATTACK"){
        shootHuman();
    }
}

// =========================
// SHOOT (3D 핵심)
// =========================
function shootHuman(){

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const power = Math.min(22, Math.hypot(dx, dy) / 8);
    const angle = Math.atan2(dy, dx);

    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;

    ball.vz = power * 1.4; // 👈 핵심 (거리감)

    ball.moving = true;
}

// =========================
// AI SHOOT
// =========================
function aiShoot(){
    const targetY = 150 + Math.random() * 200;

    const dx = goal.x - ball.x;
    const dy = targetY - ball.y;

    ball.vx = dx * 0.02;
    ball.vy = dy * 0.02;
    ball.vz = 18 + Math.random() * 5;

    ball.moving = true;
}

// =========================
// KEEP (AI GK)
// =========================
function updateKeeper(){

    let speed = 0.06;

    if(difficulty === "easy") speed = 0.04;
    if(difficulty === "hard") speed = 0.12;

    keeper.y += (ball.y - keeper.y) * speed;
}

// =========================
// SPAWN BALL
// =========================
function spawnBall(){
    ball.x = 120 + Math.random() * 250;
    ball.y = 300;
    ball.z = 0;

    ball.vx = 0;
    ball.vy = 0;
    ball.vz = 0;

    ball.moving = false;
}

// =========================
// BALL UPDATE (3D 물리)
// =========================
function updateBall(){

    if(!ball.moving) return;

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.z += ball.vz;

    ball.vy += 0.35; // 중력

    ball.vx *= 0.98;
    ball.vy *= 0.98;
    ball.vz *= 0.97;

    if(ball.y > 360){
        ball.y = 360;
        ball.vy *= -0.4;
    }
}

// =========================
// GOAL CHECK (3D 반영)
// =========================
function checkGoal(){

    if(
        ball.z > 240 &&
        ball.y > goal.y &&
        ball.y < goal.y + goal.h
    ){
        if(mode === "HUMAN_ATTACK") scoreHuman++;
        else scoreAI++;

        nextRound();
    }

    if(ball.x > canvas.width){
        nextRound();
    }
}

// =========================
// NEXT ROUND
// =========================
function nextRound(){
    round++;

    if(round >= maxRound){
        finish();
        return;
    }

    mode = (mode === "HUMAN_ATTACK")
        ? "HUMAN_DEFENSE"
        : "HUMAN_ATTACK";

    spawnBall();

    if(mode === "HUMAN_DEFENSE"){
        setTimeout(aiShoot, 500);
    }
}

// =========================
// FINISH (number.js style)
// =========================
function finish(){

    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>GAME END</h2>

            <p>HUMAN : ${scoreHuman}</p>
            <p>AI : ${scoreAI}</p>

            <button onclick="location.reload()">다시하기</button>
        </div>
    `;
}

// =========================
// DRAW (3D 느낌 핵심)
// =========================
function draw(){

    ctx.clearRect(0,0,canvas.width,canvas.height);

    // field
    ctx.fillStyle = "#2ecc71";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    // goal
    ctx.fillStyle = "#fff";
    ctx.fillRect(goal.x,goal.y,goal.w,goal.h);

    // keeper
    ctx.fillStyle = "#3498db";
    ctx.fillRect(keeper.x,keeper.y,keeper.w,keeper.h);

    // ball (3D scale)
    const scale = 1 / (1 + ball.z * 0.01);
    const size = ball.r * scale;

    ctx.fillStyle = "#f1c40f";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, size, 0, Math.PI * 2);
    ctx.fill();

    // drag line
    if(dragging && start && end){
        ctx.strokeStyle = "red";
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
    }

    // UI
    ctx.fillStyle = "#000";
    ctx.fillText(`ROUND ${round}/${maxRound}`, 20, 20);
    ctx.fillText(`H:${scoreHuman} A:${scoreAI}`, 20, 40);
    ctx.fillText(mode, 20, 60);
}

// =========================
// LOOP
// =========================
function loop(){
    updateBall();
    updateKeeper();
    checkGoal();
    draw();

    requestAnimationFrame(loop);
}
