// ==========================================
// 2026festival/AIvsHUMAN_code/js/games/soccer.js
// ==========================================

let gameAreaRef = null;
let canvas = null;
let ctx = null;
let animationFrameId = null;

// --- 게임 규칙 및 스코어 보드 ---
let difficulty = "easy";
let gameOver = false;
let currentRound = 1; 
let currentTurn = "HUMAN_ATTACK"; // HUMAN_ATTACK -> AI_ATTACK
let humanScore = 0;
let aiScore = 0;
let turnResultText = ""; 
let turnResultTimer = 0;

// --- 슈팅 및 카메라 변수 ---
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let camY = 0; 
const HORIZON_DEFAULT = 180;
let horizon = HORIZON_DEFAULT;

// --- 객체 구조 정의 ---
let keeperObj = {};
let ballObj = {};
const goalObj = { x: 0, z: 460, width: 220, height: 100 };

// --- 4개 팀 유니폼 픽셀 데이터 (1: 피부, 4: 머리, 6: 바지) ---
const PIXELS_STRIKER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [0,2,2,2,2,2,0],
    [2,2,5,2,5,2,2], [2,2,2,2,2,2,2], [0,6,6,0,6,6,0],
    [0,6,0,0,0,6,0], [1,1,0,0,0,1,1]
];
const PIXELS_KEEPER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [5,2,2,2,2,2,5],
    [0,2,2,2,2,2,0], [0,2,2,2,2,2,0], [0,6,6,0,6,6,0], [0,6,0,0,0,6,0]
];

// --- 3D 투영 공식 (공격/수비 시점에 따라 완벽 분리) ---
function project(x, y, z) {
    // z가 0일 때 내 앞, z가 460일 때 골대
    if (currentTurn === "HUMAN_ATTACK") {
        // 공격 시점: 아래(가까움) -> 위(골대 멀어짐)
        const scale = 350 / (350 + z);
        const screenX = canvas.width / 2 + (x * scale);
        const screenY = horizon + ((canvas.height - horizon) - y) * scale - camY * scale;
        return { x: screenX, y: screenY, scale: scale };
    } else {
        // 수비 시점: 골키퍼 뒤에서 공격수를 바라봄 (시점 반전)
        // z가 460일 때 내 골대(가까움) -> z가 0일 때 상대 공격수(멀어짐)
        const inverseZ = 460 - z;
        const scale = 350 / (350 + inverseZ);
        const screenX = canvas.width / 2 + (x * scale);
        // 수비할 땐 내 골대(inverseZ=0)가 화면 아래쪽에 크게 보이고, 공격수(inverseZ=460)가 화면 위쪽에 작게 보임
        const screenY = horizon + ((canvas.height - horizon) - y) * scale - camY * scale;
        return { x: screenX, y: screenY, scale: scale };
    }
}

// 픽셀 그래픽 그리기
function drawPixelArt(art, sx, sy, pixelSize, teamColor, gloveColor = '#ffffff') {
    for (let r = 0; r < art.length; r++) {
        for (let c = 0; c < art[r].length; c++) {
            let color = null;
            switch(art[r][c]) {
                case 1: color = '#ffdbac'; break;
                case 2: color = teamColor; break; 
                case 3: color = '#000000'; break;
                case 4: color = '#3a2718'; break; 
                case 5: color = gloveColor; break; 
                case 6: color = '#ffffff'; break; 
            }
            if (color) {
                ctx.fillStyle = color;
                ctx.fillRect(sx + c * pixelSize, sy + r * pixelSize, pixelSize, pixelSize);
            }
        }
    }
}

// ---------------- ENTRY POINT ----------------
export function openSoccer(gameArea) {
    gameAreaRef = gameArea;
    showDifficulty();
}

function showDifficulty() {
    gameAreaRef.innerHTML = `
        <div style="text-align:center; padding-top: 50px;">
            <h2 style="margin-bottom: 20px;">⚽ AI vs HUMAN : 프리킥 대항전</h2>
            <p style="color: #666; margin-bottom: 30px;">마우스 드래그 끝점으로 공이 날아갑니다. 공격과 수비 시점이 완벽하게 전환됩니다!</p>
            <div style="display:flex; flex-direction:column; gap:12px; max-width:320px; margin:0 auto;">
                <button class="game-select-btn" onclick="window.__startSoccer('easy')">쉬움</button>
                <button class="game-select-btn" onclick="window.__startSoccer('normal')">보통</button>
                <button class="game-select-btn" onclick="window.__startSoccer('hard')">어려움</button>
            </div>
        </div>
    `;
    window.__startSoccer = startGame;
}

// ---------------- START GAME ----------------
function startGame(level) {
    difficulty = level;
    gameOver = false;
    currentRound = 1;
    humanScore = 0;
    aiScore = 0;
    currentTurn = "HUMAN_ATTACK";
    turnResultText = "";
    
    initTurn();

    gameAreaRef.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
            <canvas id="soccerCanvas" width="900" height="550" style="background:#1e5e2f; border-radius:12px; cursor:pointer;"></canvas>
        </div>
    `;

    canvas = document.getElementById("soccerCanvas");
    ctx = canvas.getContext("2d");

    setupMouseEvents();

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
}

function initTurn() {
    isDragging = false;
    camY = 0;
    horizon = HORIZON_DEFAULT;
    turnResultText = "";
    turnResultTimer = 0;

    let keeperSpeed = difficulty === "easy" ? 3 : difficulty === "normal" ? 5 : 7.5;

    // 공은 항상 z=40(공격수 발앞)에서 출발해 z=460(골대)으로 전진
    ballObj = { x: 0, y: 0, z: 40, vx: 0, vy: 0, vz: 0, curve: 0, radius: 13, isShot: false, gravity: 0.25 };

    if (currentTurn === "HUMAN_ATTACK") {
        // 인간 공격: AI 키퍼가 골대(z=450) 앞에 있음
        keeperObj = { x: 0, y: 0, z: 450, speed: keeperSpeed, dir: 1, width: 50, height: 65 };
    } else {
        // AI 공격: 유저 키퍼가 골대(z=450) 앞에 있음 (시점은 키퍼 등뒤 반전)
        keeperObj = { x: 0, y: 0, z: 450, speed: 6, dir: 0, width: 50, height: 65 };
        setTimeout(executeAIShot, 1500);
    }
}

// ---------------- MOUSE DRAG SYSTEM (정확한 목적지 타겟팅) ----------------
function setupMouseEvents() {
    canvas.onmousedown = (e) => {
        if (currentTurn !== "HUMAN_ATTACK" || ballObj.isShot || gameOver || turnResultText) return;
        isDragging = true;
        dragStart = { x: e.offsetX, y: e.offsetY };
        dragEnd = { x: e.offsetX, y: e.offsetY };
    };

    canvas.onmousemove = (e) => {
        if (!isDragging) return;
        dragEnd = { x: e.offsetX, y: e.offsetY };
    };

    canvas.onmouseup = (e) => {
        if (!isDragging) return;
        isDragging = false;

        // 드래그 끝점이 골대 부근 어디를 향했는지 계산 (목적지 예측 방식)
        // 화면상의 드래그 끝점 좌표를 역산하여 실제 3D 공간상의 목표 x, y 유추
        let targetX = (dragEnd.x - canvas.width / 2) * 1.5;
        let targetY = (canvas.height - dragEnd.y) * 0.8;

        if (targetY < 10) targetY = 30; // 최소 높이 보장

        // 총 도달 프레임 수 정의 (z=40에서 z=460까지 가는데 걸리는 시간)
        const totalFrames = 35; 

        ballObj.isShot = true;
        ballObj.vz = (460 - 40) / totalFrames;
        ballObj.vx = (targetX - ballObj.x) / totalFrames;
        // 중력 보정식 적용하여 y가 정확히 목적지에 떨어지게 세팅
        ballObj.vy = (targetY - ballObj.y) / totalFrames + (0.5 * ballObj.gravity * totalFrames);

        // 드래그의 휘어짐(가로 차이)이 있다면 감아차기 성분 살짝 추가
        ballObj.curve = (dragEnd.x - dragStart.x) * -0.05;
    };
}

// ---------------- AI SHOT MACHINE ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballObj.isShot = true;
    const totalFrames = 35;

    // 난이도별 AI 스탯 조절
    let targetX = (Math.random() - 0.5) * (goalObj.width - 30);
    let targetY = 20 + Math.random() * (goalObj.height - 30);

    ballObj.vz = (460 - 40) / totalFrames;
    ballObj.vx = (targetX - ballObj.x) / totalFrames;
    ballObj.vy = (targetY - ballObj.y) / totalFrames + (0.5 * ballObj.gravity * totalFrames);
    ballObj.curve = (Math.random() - 0.5) * 2; 
}

// ---------------- GAME LOGIC MATRIX ----------------
function update() {
    if (gameOver) return;

    // 수비 시점일 때 방향키(←, →)로 내 골키퍼 직접 조종 가능
    if (currentTurn === "AI_ATTACK") {
        if (window.keys && window.keys['ArrowLeft']) keeperObj.x -= 5;
        if (window.keys && window.keys['ArrowRight']) keeperObj.x += 5;
        // 키퍼가 골대 밖으로 못 나가게 제한
        keeperObj.x = Math.max(-goalObj.width/2, Math.min(goalObj.width/2, keeperObj.x));
    } else {
        // 공격 시점일 땐 AI 골키퍼가 자동 좌우 수비 무빙
        keeperObj.x += keeperObj.speed * keeperObj.dir;
        if (keeperObj.x > goalObj.width/2 - 20 || keeperObj.x < -goalObj.width/2 + 20) keeperObj.dir *= -1;
    }

    // 공 물리 연산
    if (ballObj.isShot && !turnResultText) {
        ballObj.vx += ballObj.curve * 0.02; 
        ballObj.x += ballObj.vx;
        ballObj.y += ballObj.vy;
        ballObj.z += ballObj.vz;
        ballObj.vy -= ballObj.gravity;

        // 공이 날아갈 때 카메라 짐벌 트래킹 (튀지 않게 안전장치 추가)
        if (ballObj.z > 60 && ballObj.y > 0) {
            camY = camY * 0.9 + ballObj.y * 0.5;
        }

        if (ballObj.y < 0) {
            ballObj.y = 0; ballObj.vy = -ballObj.vy * 0.2; ballObj.vx *= 0.8;
        }

        // 판정 판독 (Z축 최종 골라인 도달)
        if (ballObj.z >= goalObj.z) {
            // 골키퍼 수비 도트 충돌 판정
            if (Math.abs(ballObj.x - keeperObj.x) < 45 && ballObj.y < keeperObj.height) {
                turnResultText = "MISS";
            }
            // 골대 그물망 입사 판정
            else if (ballObj.x >= -goalObj.width/2 && ballObj.x <= goalObj.width/2 && ballObj.y <= goalObj.height) {
                turnResultText = "GOAL";
                if (currentTurn === "HUMAN_ATTACK") humanScore++;
                else aiScore++;
            } else {
                turnResultText = "MISS";
            }
        }
    }

    if (turnResultText) {
        turnResultTimer++;
        if (turnResultTimer > 90) { 
            nextTurnEvent();
        }
    }
}

function nextTurnEvent() {
    if (currentTurn === "HUMAN_ATTACK") {
        currentTurn = "AI_ATTACK";
        initTurn();
    } else {
        // 수학적 조기 종료(Early Exit) 조건 체크
        let remHumanAtt = 5 - currentRound; 
        let remAiAtt = 5 - currentRound;    

        if (humanScore + remHumanAtt < aiScore || aiScore + remAiAtt < humanScore) {
            gameOver = true;
        } else if (currentRound >= 5) {
            gameOver = true;
        } else {
            currentRound++;
            currentTurn = "HUMAN_ATTACK";
            initTurn();
        }
    }
}

// ---------------- GRAPHICS RENDERING LAYER ----------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 하늘 및 관중석 그리기
    ctx.fillStyle = '#1e3c72'; ctx.fillRect(0, 0, canvas.width, horizon - 40); 
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, horizon - 40, canvas.width, 40); 

    // 관중 묘사
    for (let y = horizon - 35; y < horizon - 5; y += 6) {
        for (let x = 10; x < canvas.width; x += 9) {
            ctx.fillStyle = (x + y) % 3 === 0 ? '#ff4757' : (x + y) % 3 === 1 ? '#2ed573' : '#1e90ff';
            ctx.fillRect(x, y - camY * 0.05, 4, 4);
        }
    }

    // 2. 잔디 필드 깔기
    ctx.fillStyle = '#1b5228'; ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.fillStyle = '#226632';
    for (let i = 0; i < 12; i++) {
        let zStart = i * 45;
        let p1 = project(-500, 0, zStart);
        if (i % 2 === 0) {
            ctx.fillRect(0, p1.y, canvas.width, Math.max(10, 35 * p1.scale));
        }
    }

    // 경기장 라인 드로잉
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
    ctx.beginPath();
    let lineFar = project(-250, 0, 460), lineNear = project(-400, 0, 0);
    ctx.moveTo(lineNear.x, lineNear.y); ctx.lineTo(lineFar.x, lineFar.y);
    let lineFarR = project(250, 0, 460), lineNearR = project(400, 0, 0);
    ctx.moveTo(lineNearR.x, lineNearR.y); ctx.lineTo(lineFarR.x, lineFarR.y);
    ctx.stroke();

    // 3. 골대 렌더링
    const gBL = project(-goalObj.width/2, 0, goalObj.z);
    const gTL = project(-goalObj.width/2, goalObj.height, goalObj.z);
    const gTR = project(goalObj.width/2, goalObj.height, goalObj.z);
    const gBR = project(goalObj.width/2, 0, goalObj.z);
    
    // 그물망 표현
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
        let lx = -goalObj.width/2 + (goalObj.width / 10) * i;
        let pB = project(lx, 0, goalObj.z); let pT = project(lx, goalObj.height, goalObj.z);
        ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pT.x, pT.y); ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * gBL.scale;
    ctx.beginPath();
    ctx.moveTo(gBL.x, gBL.y); ctx.lineTo(gTL.x, gTL.y); ctx.lineTo(gTR.x, gTR.y); ctx.lineTo(gBR.x, gBR.y);
    ctx.stroke();

    // 4. 골키퍼 렌더링 (공수 상황별 색상 치환)
    const kp = project(keeperObj.x, keeperObj.y, keeperObj.z);
    const kpSize = 5.2 * kp.scale;
    let kColor = currentTurn === "HUMAN_ATTACK" ? "#ffea00" : "#2ed573"; // AI 옐로우 vs 인간 그린
    drawPixelArt(PIXELS_KEEPER, kp.x - (7 * kpSize)/2, kp.y - (7 * kpSize), kpSize, kColor, '#ffffff');

    // 5. 공격수 렌더링 (공을 차기 전까지만 노출)
    if (!ballObj.isShot) {
        // 공격수는 언제나 공 근처 z=20 지점에 있음
        const pp = project(-25, 0, 20);
        const ppSize = 8.5 * pp.scale;
        let pColor = currentTurn === "HUMAN_ATTACK" ? "#ff4757" : "#1e90ff"; // 인간 레드 vs AI 블루
        drawPixelArt(PIXELS_STRIKER, pp.x - (7 * ppSize)/2, pp.y - (8 * ppSize), ppSize, pColor, '#ffffff');
    }

    // 6. 공 그리기
    const bp = project(ballObj.x, ballObj.y, ballObj.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ballObj.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();

    // 실시간 드래그 점선 가이드라인
    if (isDragging) {
        ctx.strokeStyle = 'rgba(255, 204, 0, 0.6)'; ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(dragStart.x, dragStart.y); ctx.lineTo(dragEnd.x, dragEnd.y); ctx.stroke();
        ctx.setLineDash([]); // 대시 초기화
    }

    // 7. 상단 HUD 점수표 대시보드
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)"; ctx.fillRect(20, 20, 340, 70);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px Pretendard"; ctx.textAlign = "left";
    ctx.fillText(`ROUND: ${currentRound} / 5 | ${currentTurn === "HUMAN_ATTACK" ? "공격 (마우스 드래그)" : "수비 (방향키 이동)"}`, 35, 45);
    ctx.font = "bold 18px Pretendard";
    ctx.fillText(`HUMAN  ${humanScore} : ${aiScore}  AI`, 35, 75);

    // 단일 슛 결과 가독 오버레이
    if (turnResultText) {
        ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = turnResultText === "GOAL" ? "#00ffcc" : "#ff4757";
        ctx.font = "bold 65px Pretendard"; ctx.textAlign = "center";
        ctx.fillText(turnResultText, canvas.width/2, canvas.height/2);
    }

    // 최종 결과 스코어 보드
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.9)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px Pretendard";
        
        let finalWinner = "무승부 (DRAW)";
        if (humanScore > aiScore) finalWinner = "👑 인간 승리! (HUMAN WIN)";
        if (humanScore < aiScore) finalWinner = "🤖 AI 승리! (AI WIN)";

        ctx.fillText("최종 결과 (MATCH RESULT)", canvas.width/2, canvas.height/2 - 60);
        ctx.font = "bold 32px Pretendard"; ctx.fillStyle = "#ffcc00";
        ctx.fillText(finalWinner, canvas.width/2, canvas.height/2 - 5);
        
        ctx.font = "20px Pretendard"; ctx.fillStyle = "#cccccc";
        ctx.fillText(`최종 스코어 - 인간: ${humanScore}점 | AI: ${aiScore}점`, canvas.width/2, canvas.height/2 + 45);

        ctx.fillStyle = "#1ea857"; ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 85, 160, 40);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px Pretendard";
        ctx.fillText("다시 하기", canvas.width/2, canvas.height/2 + 110);
        
        canvas.onclick = (e) => {
            let mx = e.offsetX; let my = e.offsetY;
            if (mx >= canvas.width/2 - 80 && mx <= canvas.width/2 + 80 && my >= canvas.height/2 + 85 && my <= canvas.height/2 + 125) {
                startGame(difficulty);
            }
        };
    }
}

function loop() {
    update();
    draw();
    if (!gameOver || turnResultText) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

// ---------------- FRAMEWORK CLEANUP ----------------
export function destroy() {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (canvas) {
        canvas.onmousedown = null;
        canvas.onmousemove = null;
        canvas.onmouseup = null;
        canvas.onclick = null;
    }
    window.__startSoccer = null;
}

if (!window.keys) {
    window.keys = {};
    window.addEventListener('keydown', e => window.keys[e.code] = true);
    window.addEventListener('keyup', e => window.keys[e.code] = false);
}
