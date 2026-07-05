// ==========================================
// 2026festival/AIvsHUMAN_code/js/games/soccer.js
// ==========================================

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animationFrameId = null;

// 게임 규칙 및 상태 변수
let difficulty = "easy";
let gameOver = false;
let gameState = "PLAYING"; // PLAYING, GOAL, MISS
let shootPower = 0;
let isCharging = false;
const keys = {};

// 원근 투영법(Back-View) 설정 변수
const HORIZON = 150; 

// 객체 데이터 구조
let player = {};
let keeper = {};
let ball = {};
let goal = { x: 0, z: 450, width: 200, height: 90 };

// --- 픽셀 데이터 (1: 피부, 2: 레드 유니폼, 3: 블루 바지, 4: 머리, 5: 흰색) ---
const PLAYER_PIXELS = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [0,2,2,2,2,2,0],
    [2,2,5,2,5,2,2], [2,2,2,2,2,2,2], [0,3,3,0,3,3,0],
    [0,3,0,0,0,3,0], [1,1,0,0,0,1,1]
];

const KEEPER_PIXELS = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [5,2,2,2,2,2,5],
    [0,2,2,2,2,2,0], [0,2,2,2,2,2,0], [0,3,3,0,3,3,0], [0,3,0,0,0,3,0]
];

// 3D 투영 공식 (깊이 z값에 따라 크기 조절)
function project(x, y, z) {
    const scale = 300 / (300 + z); 
    const screenX = canvas.width / 2 + (x * scale);
    const screenY = HORIZON + ((canvas.height - HORIZON) - y) * scale;
    return { x: screenX, y: screenY, scale: scale };
}

// 픽셀 그래픽 그리기
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

// ---------------- ENTRY (메인 프레임워크 호출 규격) ----------------
export function openSoccer(gameArea) {
    gameAreaRef = gameArea;
    showDifficulty();
}

// ---------------- DIFFICULTY SELECT UI ----------------
function showDifficulty() {
    gameAreaRef.innerHTML = `
        <div style="text-align:center; padding-top: 40px;">
            <h2 style="margin-bottom: 24px;">⚽ 프리킥 피지컬 테스트</h2>
            <p style="color: #666; margin-bottom: 20px;">내 캐릭터의 등 뒤에서 골대를 바라보며 조종하는 백뷰 축구 게임</p>
            <div style="
                display:flex;
                flex-direction:column;
                gap:12px;
                max-width:300px;
                margin:0 auto;
            ">
                <button class="game-select-btn" onclick="window.__startSoccer('easy')">쉬움 (느린 키퍼)</button>
                <button class="game-select-btn" onclick="window.__startSoccer('normal')">보통 (일반 키퍼)</button>
                <button class="game-select-btn" onclick="window.__startSoccer('hard')">어려움 (신속한 키퍼)</button>
            </div>
        </div>
    `;
    window.__startSoccer = startGame;
}

// ---------------- START GAME & INIT CANVAS ----------------
function startGame(level) {
    difficulty = level;
    gameOver = false;
    gameState = "PLAYING";
    shootPower = 0;
    isCharging = false;

    // 난이도별 키퍼 스피드 매핑
    let keeperSpeed = 2;
    if (difficulty === "normal") keeperSpeed = 3.5;
    if (difficulty === "hard") keeperSpeed = 5.5;

    // 객체 위치 초기화
    player = { x: 0, y: 0, z: 50, speed: 4, width: 40, height: 60 };
    keeper = { x: 0, y: 0, z: 440, speed: keeperSpeed, dir: 1, width: 45, height: 60 };
    ball = { x: 0, y: 0, z: 90, vx: 0, vy: 0, vz: 0, radius: 12, isShot: false, gravity: 0.3 };

    // 화면 영역을 캔버스 인터페이스로 전환
    gameAreaRef.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
            <div style="font-size:14px; color:#555; margin-bottom:8px;">
                이동: 방향키 (←, →, ↑, ↓) | 슛: 스페이스바 (길게 누르면 파워 상승)
            </div>
            <canvas id="soccerCanvas" width="750" height="450" style="background:#2e8b57; border-radius:16px; border:2px solid #1ea857;"></canvas>
        </div>
    `;

    canvas = document.getElementById("soccerCanvas");
    ctx = canvas.getContext("2d");

    setupEventListeners();
    
    // 루프가 중복 작동하지 않도록 기존 프레임 취소 후 재시작
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
}

// ---------------- KEY EVENTS ----------------
function setupEventListeners() {
    window.onkeydown = (e) => {
        keys[e.code] = true;
        if (e.code === 'Space' && !ball.isShot && gameState === "PLAYING") {
            isCharging = true;
        }
    };
    window.onkeyup = (e) => {
        keys[e.code] = false;
        if (e.code === 'Space' && isCharging) {
            isCharging = false;
            shoot();
        }
    };
}

function shoot() {
    ball.isShot = true;
    // 조종 중인 플레이어와 키퍼의 대각선 좌표 연산을 통해 목표 방향각 계산
    ball.vx = (keeper.x - player.x) * 0.04 + (Math.random() - 0.5) * 3;
    ball.vy = shootPower * 1.4; 
    ball.vz = shootPower * 1.9; 
}

// ---------------- GAME ENGINE LOOP ----------------
function update() {
    if (gameState !== "PLAYING") {
        if (keys['KeyR']) startGame(difficulty);
        return;
    }

    if (isCharging) {
        shootPower = Math.min(shootPower + 0.4, 12);
    }

    // 슛 이전 단계: 플레이어 자유 무빙 및 볼 드리블 매핑
    if (!ball.isShot) {
        if (keys['ArrowLeft']) player.x -= player.speed;
        if (keys['ArrowRight']) player.x += player.speed;
        if (keys['ArrowUp']) player.z += player.speed;
        if (keys['ArrowDown']) player.z -= player.speed;
        
        ball.x = player.x;
        ball.z = player.z + 30;
    }

    // 인공지능 골키퍼 좌우 스윕 무빙
    keeper.x += keeper.speed * keeper.dir;
    if (keeper.x > 90 || keeper.x < -90) keeper.dir *= -1;

    // 공 비행 역학
    if (ball.isShot) {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.z += ball.vz;
        ball.vy -= ball.gravity; // 포물선 중력 적용

        // 잔디 바닥 리바운드
        if (ball.y < 0) {
            ball.y = 0;
            ball.vy = -ball.vy * 0.4;
            ball.vx *= 0.8;
        }

        // 골라인 안착 판정 (Z축 도달)
        if (ball.z >= goal.z) {
            // 키퍼 세이브 범위 연산
            if (Math.abs(ball.x - keeper.x) < 38 && ball.y < keeper.height) {
                gameState = "MISS";
            } 
            // 골대 박스 수치 안착 연산
            else if (ball.x >= -goal.width/2 && ball.x <= goal.width/2 && ball.y <= goal.height) {
                gameState = "GOAL";
            } else {
                gameState = "MISS";
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 스카이 & 필드 분할 렌더링
    ctx.fillStyle = '#4a8505'; ctx.fillRect(0, HORIZON, canvas.width, canvas.height - HORIZON);
    ctx.fillStyle = '#87CEEB'; ctx.fillRect(0, 0, canvas.width, HORIZON);

    // 축구장 사이드라인 가이드
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 3;
    let pLeftFar = project(-220, 0, 450), pLeftNear = project(-320, 0, 0);
    let pRightFar = project(220, 0, 450), pRightNear = project(320, 0, 0);
    ctx.beginPath();
    ctx.moveTo(pLeftNear.x, pLeftNear.y); ctx.lineTo(pLeftFar.x, pLeftFar.y);
    ctx.moveTo(pRightNear.x, pRightNear.y); ctx.lineTo(pRightFar.x, pRightFar.y);
    ctx.stroke();

    // 1. 입체 골대 프레임 투영
    const gBottomLeft = project(-goal.width/2, 0, goal.z);
    const gTopLeft = project(-goal.width/2, goal.height, goal.z);
    const gTopRight = project(goal.width/2, goal.height, goal.z);
    const gBottomRight = project(goal.width/2, 0, goal.z);
    
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5 * gBottomLeft.scale;
    ctx.beginPath();
    ctx.moveTo(gBottomLeft.x, gBottomLeft.y); ctx.lineTo(gTopLeft.x, gTopLeft.y);
    ctx.lineTo(gTopRight.x, gTopRight.y); ctx.lineTo(gBottomRight.x, gBottomRight.y);
    ctx.stroke();

    // 2. AI 골키퍼 픽셀화 드로잉
    const kp = project(keeper.x, keeper.y, keeper.z);
    const kpSize = 4.5 * kp.scale;
    drawPixelArt(KEEPER_PIXELS, kp.x - (7 * kpSize)/2, kp.y - (8 * kpSize), kpSize);

    // 3. 인간 플레이어(나) 픽셀화 드로잉
    const pp = project(player.x, player.y, player.z);
    const ppSize = 7.5 * pp.scale;
    drawPixelArt(PLAYER_PIXELS, pp.x - (7 * ppSize)/2, pp.y - (8 * ppSize), ppSize);

    // 4. 공 오브젝트 렌더링
    const bp = project(ball.x, ball.y, ball.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ball.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();

    // 게이지 충전 바 UI
    if (isCharging) {
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(canvas.width/2 - 100, canvas.height - 35, shootPower * 16.6, 16);
        ctx.strokeStyle = '#fff'; ctx.strokeRect(canvas.width/2 - 100, canvas.height - 35, 200, 16);
    }

    // 게임 종료 모달 화면 덧씌우기
    if (gameState !== "PLAYING") {
        ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = gameState === "GOAL" ? "#00ffcc" : "#ff3333";
        ctx.font = "bold 38px Pretendard"; 
        ctx.textAlign = "center";
        ctx.fillText(gameState === "GOAL" ? "GOAL!!!" : "KEEPER SAVE / MISS", canvas.width/2, canvas.height/2 - 10);
        
        ctx.fillStyle = "#fff"; ctx.font = "18px sans-serif"; 
        ctx.fillText("다시 도전하려면 키보드 'R' 키를 누르세요", canvas.width/2, canvas.height/2 + 40);
    }
}

function loop() {
    update();
    draw();
    if (!gameOver) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

// ---------------- FRAMEWORK CLEANUP ----------------
export function destroy() {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.onkeydown = null;
    window.onkeyup = null;
    window.__startSoccer = null;
}
