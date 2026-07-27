const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bossHpEl = document.getElementById("boss-hp");
const playerHpEl = document.getElementById("player-hp");
const liveTimerEl = document.getElementById("live-timer");

// 화면 엘리먼트들
const startScreen = document.getElementById("start-screen");
const victoryScreen = document.getElementById("victory-screen");
const gameoverScreen = document.getElementById("gameover-screen");
const countdownOverlay = document.getElementById("countdown-overlay");
const countdownText = document.getElementById("countdown-text");
const clearTimeResult = document.getElementById("clear-time-result");

// 상태 제어 변수들
let gameActive = false;       
let battleStarted = false;    

// 타이머 변수
let startTime = 0;
let elapsedTime = 0;

// --- 게임 객체 설정 ---
const player = {
    x: 400,
    y: 500,
    radius: 12,
    speed: 5.5,
    hp: 3,
    invincible: false,
    invincibleTimer: 0,
    shootCooldown: 0,
    shootInterval: 7 
};

const boss = {
    x: 400,
    y: 150,
    targetX: 400,
    targetY: 150,
    radius: 45,
    hp: 30000,      
    maxHp: 30000,   
    patternTimer: 0,
    currentPattern: 0, 
    attackCooldown: 0,
    hitFeedbackTimer: 0
};

let enemyBullets = [];
let playerBullets = [];
let keys = {};
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;

// --- 이벤트 바인딩 ---
window.addEventListener("keydown", (e) => {
    if (gameActive && battleStarted) keys[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousedown", (e) => {
    if (e.button === 0) isMouseDown = true;
    updateMousePos(e);
});
window.addEventListener("mouseup", (e) => {
    if (e.button === 0) isMouseDown = false;
});
canvas.addEventListener("mousemove", (e) => {
    updateMousePos(e);
});

function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}

// --- 게임 흐름 제어 (카운트다운 포함) ---

function initiateGameFlow() {
    startScreen.style.display = "none";
    resetGameStats(); 

    gameActive = true;
    battleStarted = false;

    countdownOverlay.style.display = "flex";
    
    setCountdownEffect("Ready?", "#fbc531");
    
    setTimeout(() => {
        setCountdownEffect("GO!", "#4cd137");
        
        setTimeout(() => {
            countdownOverlay.style.display = "none";
            battleStarted = true;
            startTime = performance.now();
        }, 700);

    }, 1000);
}

function setCountdownEffect(text, color) {
    countdownText.innerText = text;
    countdownText.style.color = color;
    countdownText.style.opacity = "0";
    countdownText.style.transform = "scale(0.3)";
    
    setTimeout(() => {
        countdownText.style.opacity = "1";
        countdownText.style.transform = "scale(1)";
    }, 50);
}

function stopTimer() {
    if (battleStarted) {
        elapsedTime = (performance.now() - startTime) / 1000;
    }
}

// --- 플레이어 연속 사격 메커니즘 ---
function handlePlayerShooting() {
    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }

    if (isMouseDown && player.shootCooldown === 0) {
        const angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        const speed = 12;

        playerBullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: 8,
            color: "#00d2d3" 
        });

        player.shootCooldown = player.shootInterval;
    }
}

// --- 보스 패턴 및 위치 이동 ---
function updateBoss(timestamp) {
    if (boss.hp <= 0) {
        showVictoryScreen();
        return;
    }

    bossHpEl.innerText = Math.max(0, Math.floor(boss.hp)).toLocaleString();

    boss.x += (boss.targetX - boss.x) * 0.05;
    boss.y += (boss.targetY - boss.y) * 0.05;

    boss.patternTimer++;

    if (boss.patternTimer > 180) {
        boss.patternTimer = 0;
        boss.currentPattern = Math.floor(Math.random() * 3) + 1;

        boss.targetX = 120 + Math.random() * 560;
        boss.targetY = 100 + Math.random() * 160;
    }

    if (boss.hitFeedbackTimer > 0) boss.hitFeedbackTimer--;
    boss.attackCooldown--;

    if (boss.attackCooldown <= 0) {
        if (boss.currentPattern === 1) { 
            const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
            const speed = 6.5;
            enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: 8, color: "#ffa502" });
            boss.attackCooldown = 13; 
        } else if (boss.currentPattern === 2) {
            const count = 10; 
            const baseAngle = (timestamp / 200);
            for (let i = 0; i < count; i++) {
                const angle = baseAngle + (Math.PI * 2 / count) * i;
                enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, size: 6, color: "#2ed573" });
            }
            boss.attackCooldown = 18;
        } else if (boss.currentPattern === 3) {
            const randomX = Math.random() * canvas.width;
            enemyBullets.push({ x: randomX, y: 0, vx: 0, vy: 5, size: 18, color: "#ff4757" });
            boss.attackCooldown = 9;
        }
    }
}

// --- 플레이어 이동 제어 ---
function updatePlayer() {
    if (player.hp <= 0) {
        showGameOverScreen();
        return;
    }

    if (keys["w"] || keys["arrowup"]) player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"]) player.y += player.speed;
    if (keys["a"] || keys["arrowleft"]) player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;

    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));

    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }
}

// --- 투사체 이동 및 충돌 감지 ---
function updateBullets() {
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        let pBullet = playerBullets[i];
        pBullet.x += pBullet.vx;
        pBullet.y += pBullet.vy;

        if (pBullet.x < -20 || pBullet.x > canvas.width + 20 || pBullet.y < -20 || pBullet.y > canvas.height + 20) {
            playerBullets.splice(i, 1);
            continue;
        }

        const distToBoss = Math.hypot(boss.x - pBullet.x, boss.y - pBullet.y);
        if (distToBoss < boss.radius + pBullet.radius) {
            boss.hp -= 120; 
            boss.hitFeedbackTimer = 5;
            playerBullets.splice(i, 1);
            continue;
        }
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eBullet = enemyBullets[i];
        eBullet.x += eBullet.vx;
        eBullet.y += eBullet.vy;

        if (eBullet.x < -50 || eBullet.x > canvas.width + 50 || eBullet.y < -50 || eBullet.y > canvas.height + 50) {
            enemyBullets.splice(i, 1);
            continue;
        }

        if (!player.invincible) {
            const distToPlayer = Math.hypot(player.x - eBullet.x, player.y - eBullet.y);
            if (distToPlayer < player.radius + eBullet.size) {
                player.hp--;
                playerHpEl.innerText = player.hp;
                enemyBullets.splice(i, 1);

                if (player.hp > 0) {
                    player.invincible = true;
                    player.invincibleTimer = 60;
                }
            }
        }
    }
}

// --- 실시간 타이머 갱신 ---
function updateTimerText() {
    if (battleStarted) {
        const tempElapsed = (performance.now() - startTime) / 1000;
        liveTimerEl.innerText = `${tempElapsed.toFixed(2)}초`;
    } else {
        liveTimerEl.innerText = `0.00초`;
    }
}

// --- 게임 화면 전환 제어 ---

function showVictoryScreen() {
    stopTimer();
    gameActive = false;
    battleStarted = false;
    isMouseDown = false;
    
    clearTimeResult.innerText = `클리어 시간: ${elapsedTime.toFixed(2)}초`;
    victoryScreen.style.display = "flex";
}

function showGameOverScreen() {
    gameActive = false;
    battleStarted = false;
    isMouseDown = false;
    gameoverScreen.style.display = "flex";
}

function resetToTitle() {
    victoryScreen.style.display = "none";
    gameoverScreen.style.display = "none";
    startScreen.style.display = "flex";
    gameActive = false;
    battleStarted = false;
    liveTimerEl.innerText = `0.00초`;
    drawInitialScene();
}

function resetGameStats() {
    player.x = 400;
    player.y = 500;
    player.hp = 3;
    player.invincible = false;
    player.shootCooldown = 0;
    
    boss.x = 400;
    boss.y = 150;
    boss.targetX = 400;
    boss.targetY = 150;
    boss.hp = boss.maxHp; 
    boss.currentPattern = 0;
    boss.patternTimer = 0;

    playerBullets = [];
    enemyBullets = [];
    keys = {};
    isMouseDown = false;
    elapsedTime = 0;
    
    playerHpEl.innerText = player.hp;
    bossHpEl.innerText = boss.hp.toLocaleString();
    liveTimerEl.innerText = `0.00초`;
}

function drawInitialScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.arc(400, 500, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#1e90ff";
    ctx.fill();
    ctx.closePath();

    ctx.beginPath();
    ctx.arc(400, 150, boss.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ff4757";
    ctx.fill();
    ctx.closePath();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
    if (boss.hitFeedbackTimer > 0) {
        ctx.fillStyle = "#ffffff"; 
    } else {
        ctx.fillStyle = boss.currentPattern === 1 ? "#ffa502" : boss.currentPattern === 2 ? "#2ed573" : "#ff4757";
    }
    ctx.fill();
    ctx.closePath();

    if (!player.invincible || Math.floor(player.invincibleTimer / 5) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#1e90ff";
        ctx.fill();
        ctx.closePath();
    }

    playerBullets.forEach(pb => {
        ctx.beginPath();
        ctx.arc(pb.x, pb.y, pb.radius, 0, Math.PI * 2);
        ctx.fillStyle = pb.color;
        ctx.fill();
        ctx.closePath();
    });

    enemyBullets.forEach(eb => {
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.size, 0, Math.PI * 2);
        ctx.fillStyle = eb.color;
        ctx.fill();
        ctx.closePath();
    });
}

function gameLoop(timestamp) {
    if (gameActive) {
        if (battleStarted) {
            updatePlayer();
            handlePlayerShooting();
            updateBoss(timestamp);
            updateBullets();
            updateTimerText();
        }
        draw();
    }
    requestAnimationFrame(gameLoop);
}

drawInitialScene();
requestAnimationFrame(gameLoop);
