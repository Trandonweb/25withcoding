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

// objects
const goal = {
    x: 780,
    y: 170,
    w: 20,
    h: 160
};

const ball = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
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
            <h2>⚽ 프리킥 축구</h2>

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
// UI (canvas container)
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
// SHOOT
// =========================
function shootHuman(){
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const power = Math.min(18, Math.hypot(dx, dy) / 10);
    const angle = Math.atan2(dy, dx);

    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;

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

    ball.moving = true;
}

// =========================
// KEEP
// =========================
function updateKeeper(){
    let speed = 0.08;

    if(difficulty === "easy") speed = 0.04;
    if(difficulty === "hard") speed = 0.12;

    keeper.y += (ball.y - keeper.y) * speed;
}

// =========================
// BALL SPAWN
// =========================
function spawnBall(){
    ball.x = 120 + Math.random() * 250;
    ball.y = 200 + Math.random() * 150;

    ball.vx = 0;
    ball.vy = 0;
    ball.moving = false;
}

// =========================
// GAME LOGIC
// =========================
function checkGoal(){

    if(
        ball.x > goal.x &&
        ball.y > goal.y &&
        ball.y < goal.y + goal.h
    ){
        if(mode === "HUMAN_ATTACK") scoreHuman++;
        else scoreAI++;

        nextRound();
    }

    if(
        ball.x > keeper.x &&
        ball.y > keeper.y &&
        ball.y < keeper.y + keeper.h
    ){
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
// UPDATE LOOP
// =========================
function update(){

    if(ball.moving){
        ball.x += ball.vx;
        ball.y += ball.vy;

        ball.vx *= 0.98;
        ball.vy *= 0.98;
    }

    updateKeeper();
    checkGoal();
}

// =========================
// DRAW
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

    // ball
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(ball.x,ball.y,ball.r,ball.r);

    // UI
    ctx.fillStyle = "#000";
    ctx.fillText(`ROUND ${round}/${maxRound}`, 20,20);
    ctx.fillText(`H:${scoreHuman} A:${scoreAI}`, 20,40);
    ctx.fillText(mode, 20,60);
}

// =========================
// LOOP
// =========================
function loop(){
    update();
    draw();
    requestAnimationFrame(loop);
}
