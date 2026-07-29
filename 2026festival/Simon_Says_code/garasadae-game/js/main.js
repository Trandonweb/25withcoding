// ===============================
// main.js
// ===============================

// Canvas
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// 화면 크기
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();


// ===============================
// 게임 상태
// ===============================

let gameRunning = false;


// ===============================
// HTML 요소
// ===============================

const startScreen = document.getElementById("startScreen");
const gameContainer = document.getElementById("gameContainer");

const hpUI = document.getElementById("hpUI");
const mpUI = document.getElementById("mpUI");

const miniMap = document.getElementById("miniMap");

const startButton = document.getElementById("startButton");


// ===============================
// 게임 시작
// ===============================

startButton.addEventListener("click", startGame);

function startGame() {

    startScreen.style.display = "none";

    gameContainer.style.display = "block";

    hpUI.style.display = "block";

    mpUI.style.display = "block";

    miniMap.style.display = "block";

    gameRunning = true;

    requestAnimationFrame(gameLoop);

}


// ===============================
// 게임 루프
// ===============================

function gameLoop() {

    if (!gameRunning) return;

    update();

    render();

    requestAnimationFrame(gameLoop);

}


// ===============================
// 업데이트
// ===============================

function update() {

    // 플레이어 이동
    if (typeof updatePlayer === "function")
        updatePlayer();

    // 카메라
    if (typeof updateCamera === "function")
        updateCamera();

    // NPC
    if (typeof updateNPC === "function")
        updateNPC();

    // 적
    if (typeof updateEnemy === "function")
        updateEnemy();

    // UI
    if (typeof updateUI === "function")
        updateUI();

}


// ===============================
// 렌더링
// ===============================

function render() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 맵
    if (typeof drawMap === "function")
        drawMap(ctx);

    // NPC
    if (typeof drawNPC === "function")
        drawNPC(ctx);

    // 적
    if (typeof drawEnemy === "function")
        drawEnemy(ctx);

    // 플레이어
    if (typeof drawPlayer === "function")
        drawPlayer(ctx);

}


// ===============================
// FPS 표시
// ===============================

let fps = 0;
let frameCount = 0;
let lastTime = performance.now();

setInterval(() => {

    fps = frameCount;

    frameCount = 0;

}, 1000);


// ===============================
// FPS 그리기
// ===============================

function drawFPS() {

    ctx.fillStyle = "white";

    ctx.font = "18px Arial";

    ctx.fillText("FPS : " + fps, 15, 30);

}


// ===============================
// 렌더 수정
// ===============================

const originalRender = render;

render = function () {

    originalRender();

    drawFPS();

    frameCount++;

};


// ===============================
// ESC 메뉴
// ===============================

window.addEventListener("keydown", function (e) {

    if (e.code === "Escape") {

        gameRunning = !gameRunning;

        if (gameRunning) {

            requestAnimationFrame(gameLoop);

        }

    }

});


// ===============================
// 디버그
// ===============================

console.log("Garasada Engine Loaded");
