// ==========================================
// 2026festival/AIvsHUMAN_code/js/games/soccer.js
// ==========================================

// 게임 상태 및 전역 변수
let canvas, ctx;
let HORIZON = 150; 
let shootPower = 0;
let isCharging = false;
let gameState = "PLAYING"; 
const keys = {};

// 3D 투영 공식 (백뷰 시점 핵심)
function project(x, y, z) {
    const scale = 300 / (300 + z); 
    const screenX = canvas.width / 2 + (x * scale);
    const screenY = HORIZON + ((canvas.height - HORIZON) - y) * scale;
    return { x: screenX, y: screenY, scale: scale };
}

// 픽셀 데이터 (1: 피부, 2: 레드 유니폼, 3: 블루 바지, 4: 머리, 5: 흰색)
const PLAYER_PIXELS = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [0,2,2,2,2,2,0],
    [2,2,5,2,5,2,2], [2,2,2,2,2,2,2], [0,3,3,0,3,3,0],
    [0,3,0,0,0,3,0], [1,1,0,0,0,1,1]
];

const KEEPER_PIXELS = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [5,2,2,2,2,2,5],
    [0,2,2,2,2,2,0], [0,2,2,2,2,2,0], [0,3,3,0,3,3,0], [0,3,0,0,0,3,0]
];

const goal = { x: 0, z: 450, width: 200, height: 90 };
const player = { x: 0, y: 0, z: 50, speed: 4, width: 40, height: 60 };
const keeper = { x: 0, y: 0, z: 440, speed: 2, dir: 1, width: 45, height: 60 };
const ball = { x: 0, y: 0, z: 90, vx: 0, vy: 0, vz: 0, radius: 12, isShot: false, gravity: 0.3 };

// 픽셀 그리기 함수
function drawPixelArt(art, sx, sy, pixelSize) {
    for (let r = 0; r < art.length; r++) {
        for (let c = 0; c < art[r].length; c++) {
            let color = null;
            switch(art[r][c]) {
                case 1: color = '#ffdbac'; break;
                case 2: color = '#e50000'; break;
                case 3: color = '#0000ed'; break;
                case 4: color = '#4a3728'; break;
                case 5: color = '#ffffff'; break;
            }
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(sx + c * pixelSize, sy + r * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

// 키 이벤트 바인딩
function setupEventListeners() {
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (e.code === 'Space' && !ball.isShot && gameState === "PLAYING") {
            isCharging = true;
        }
    });
    window.addEventListener('keyup', e => {
        keys[e.code] = false;
        if (e.code === 'Space' && isCharging) {
            isCharging = false;
            shoot();
        }
    });
}

function shoot() {
    ball.isShot = true;
    ball.vx = (keeper.x - player.x) * 0.05 + (Math.random() - 0.5) * 4;
    ball.vy = shootPower * 1.5;
    ball.vz = shootPower * 2.0;
}

function update() {
    if (gameState !== "PLAYING") {
        if (keys['KeyR']) resetGame();
        return;
    }
    if (isCharging) shootPower = Math.min(shootPower + 0.4, 12);

    if (!ball.isShot) {
        if (keys['ArrowLeft']) player.x -= player.speed;
        if (keys['ArrowRight']) player.x += player.speed;
        if (keys['ArrowUp']) player.z += player.speed;
        if (keys['ArrowDown']) player.z -= player.speed;
        ball.x = player.x;
        ball.z = player.z + 30;
    }

    keeper.x += keeper.speed * keeper.dir;
    if (keeper.x > 80 || keeper.x < -80) keeper.dir *= -1;

    if (ball.isShot) {
        ball.x += ball.vx; ball.y += ball.vy; ball.z += ball.vz;
        ball.vy -= ball.gravity;

        if (ball.y < 0) {
            ball.y = 0; ball.vy = -ball.vy * 0.5; ball.vx *= 0.8;
        }

        if (ball.z >= goal.z) {
            if (Math.abs(ball.x - keeper.x) < 35 && ball.y < keeper.height) {
                gameState = "MISS";
            } else if (ball.x >= -goal.width/2 && ball.x <= goal.width/2 && ball.y <= goal.height) {
                gameState = "GOAL";
            } else {
                gameState = "MISS";
            }
        }
    }
}

function draw() {
    // 배경 잔디 & 하늘
    ctx.fillStyle = '#4a8505'; ctx.fillRect(0, HORIZON, canvas.width, canvas.height - HORIZON);
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, HORIZON);

    // 골대 경기장 선
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3;
    let pLeftFar = project(-200, 0, 450), pLeftNear = project(-300, 0, 0);
    let pRightFar = project(200, 0, 450), pRightNear = project(300, 0, 0);
    ctx.beginPath();
    ctx.moveTo(pLeftNear.x, pLeftNear.y); ctx.lineTo(pLeftFar.x, pLeftFar.y);
    ctx.moveTo(pRightNear.x, pRightNear.y); ctx.lineTo(pRightFar.x, pRightFar.y);
    ctx.stroke();

    // 1. 골대 렌더링
    const gBottomLeft = project(-goal.width/2, 0, goal.z);
    const gTopLeft = project(-goal.width/2, goal.height, goal.z);
    const gTopRight = project(goal.width/2, goal.height, goal.z);
    const gBottomRight = project(goal.width/2, 0, goal.z);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * gBottomLeft.scale;
    ctx.beginPath();
    ctx.moveTo(gBottomLeft.x, gBottomLeft.y); ctx.lineTo(gTopLeft.x, gTopLeft.y);
    ctx.lineTo(gTopRight.x, gTopRight.y); ctx.lineTo(gBottomRight.x, gBottomRight.y);
    ctx.stroke();

    // 2. 골키퍼 렌더링
    const kp = project(keeper.x, keeper.y, keeper.z);
    const kpSize = 5 * kp.scale;
    drawPixelArt(KEEPER_PIXELS, kp.x - (7 * kpSize)/2, kp.y - (8 * kpSize), kpSize);

    // 3. 플레이어(나) 렌더링
    const pp = project(player.x, player.y, player.z);
    const ppSize = 8 * pp.scale;
    drawPixelArt(PLAYER_PIXELS, pp.x - (7 * ppSize)/2, pp.y - (8 * ppSize), ppSize);

    // 4. 공 렌더링
    const bp = project(ball.x, ball.y, ball.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ball.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

    // UI 게이지
    if (isCharging) {
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(canvas.width/2 - 100, canvas.height - 40, shootPower * 16.6, 20);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(canvas.width/2 - 100, canvas.height - 40, 200, 20);
    }

    if (gameState !== "PLAYING") {
        ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(0,0,canvas.width, canvas.height);
        ctx.fillStyle = gameState === "GOAL" ? "#00ffcc" : "#ff3333";
        ctx.font = "bold 40px sans-serif"; ctx.fillText(gameState === "GOAL" ? "GOAL!!!" : "KEEPER SAVE / MISS", canvas.width/2 - 150, canvas.height/2);
        ctx.fillStyle = "#fff"; ctx.font = "20px sans-serif"; ctx.fillText("재시작: 'R' 키 입력", canvas.width/2 - 80, canvas.height/2 + 50);
    }
}

function resetGame() {
    ball.isShot = false; ball.x = 0; ball.y = 0; ball.z = 90;
    player.x = 0; player.z = 50; shootPower = 0; gameState = "PLAYING";
}

function loop() {
    update(); draw(); requestAnimationFrame(loop);
}

// 메인 프레임워크나 외부 HTML에서 이 함수를 호출하여 게임을 시작하도록 설계
function initSoccerGame(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    setupEventListeners();
    loop();
}

// 만약 단독 실행형 캔버스를 찾을 경우 자동 시작 안전장치
window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('gameCanvas')) {
        initSoccerGame('gameCanvas');
    }
});
