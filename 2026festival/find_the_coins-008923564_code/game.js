// game.js

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let lastTime = 0;
let gameRunning = false;

// player는 player.js에서 생성된다고 가정
// coinManager는 coins.js
// enemyManager는 enemy.js
// achievementManager는 achievements.js

function update(deltaTime) {

    player.update(deltaTime);

    coinManager.update(deltaTime, player);

    enemyManager.update(deltaTime, player);

    achievementManager.check(player);

}

function render() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    coinManager.draw(ctx);

    enemyManager.draw(ctx);

    player.draw(ctx);

}

function gameLoop(timestamp){

    if(!gameRunning) return;

    const deltaTime = (timestamp - lastTime) / 1000;

    lastTime = timestamp;

    update(deltaTime);

    render();

    requestAnimationFrame(gameLoop);

}

function startGame(){

    gameRunning = true;

    lastTime = performance.now();

    requestAnimationFrame(gameLoop);

}

document
.getElementById("startBtn")
.addEventListener("click", startGame);
