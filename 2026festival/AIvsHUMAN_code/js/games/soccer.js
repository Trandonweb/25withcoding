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
let currentRound = 1; // 1~5 라운드
let currentTurn = "HUMAN_ATTACK"; // HUMAN_ATTACK -> AI_ATTACK -> 라운드 증가
let humanScore = 0;
let aiScore = 0;
let turnResultText = ""; // "GOAL!" 또는 "MISS"
let turnResultTimer = 0;

// --- ✍️ 마우스 궤적 드로잉 및 카메라 변수 ---
let isDrawingPath = false;
let drawnMousePoints = []; // 유저가 마우스로 그린 화면 픽셀 좌표 목록
let ballPath3D = [];       // 실질적으로 공이 순차 비행할 3D 물리 공간 좌표 배열
let pathIndex = 0;         // 현재 공이 가고 있는 궤적 위치 인덱스

let camY = 0; // 카메라 종축 트래킹 변수
const HORIZON_DEFAULT = 180;
let horizon = HORIZON_DEFAULT;

// --- 객체 구조 정의 ---
let kickerObj = {};
let keeperObj = {};
let ballObj = {};
const goalObj = { x: 0, z: 460, width: 220, height: 100 };

// --- 4개 팀 유니폼 픽셀 데이터 매핑 ---
const PIXELS_STRIKER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [0,2,2,2,2,2,0],
    [2,2,5,2,5,2,2], [2,2,2,2,2,2,2], [0,6,6,0,6,6,0],
    [0,6,0,0,0,6,0], [1,1,0,0,0,1,1]
];
const PIXELS_KEEPER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [5,2,2,2,2,2,5],
    [0,2,2,2,2,2,0], [0,2,2,2,2,2,0], [0,6,6,0,6,6,0], [0,6,0,0,0,6,0]
];

// 3D 투영 매트릭스 함수 (카메라 고정 및 부드러운 안착 반영)
function project(x, y, z) {
    const scale = 350 / (350 + z);
    const screenX = canvas.width / 2 + (x * scale);
    // camY 트래킹을 최소 보정하여 시야가 바닥으로 솟구치는 현상을 방지
    const screenY = horizon + ((canvas.height - horizon) - y) * scale - camY * scale;
    return { x: screenX, y: screenY, scale: scale };
}

// 픽셀 드로잉 코어
function drawPixelArt(art, sx, sy, pixelSize, teamColor, gloveColor = '#ffffff') {
    for (let r = 0; r < art.length; r++) {
        for (let c = 0; c < art[r].length; c++) {
            let color = null;
            switch(art[r][c]) {
                case 1: color = '#ffdbac'; break; // 피부
                case 2: color = teamColor; break; // 동적 치환 유니폼 상의
                case 3: color = '#000000'; break;
                case 4: color = '#3a2718'; break; // 머리카락
                case 5: color = gloveColor; break; 
                case 6: color = '#ffffff'; break; // 바지
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
            <h2 style="margin-bottom: 20px;">⚽ AI vs HUMAN : 프리킥 대항전 (궤적 드로잉)</h2>
            <p style="color: #666; margin-bottom: 30px;">공에서부터 골대 안으로 원하는 <span style="color:#1ea857; font-weight:bold;">슈팅 곡선(마구)을 마우스로 직접 그리세요!</span></p>
            <div style="display:flex; flex-direction:column; gap:12px; max-width:320px; margin:0 auto;">
                <button class="game-select-btn" onclick="window.__startSoccer('easy')">쉬움 (AI의 방어율 저하)</button>
                <button class="game-select-btn" onclick="window.__startSoccer('normal')">보통 (치열한 공방전)</button>
                <button class="game-select-btn" onclick="window.__startSoccer('hard')">어려움 (월드클래스 AI)</button>
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
        <div style="display:flex; flex-direction:column; align-items:center; width:100%; position:relative;">
            <canvas id="soccerCanvas" width="900" height="550" style="background:#1e5e2f; border-radius:12px; cursor:crosshair; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"></canvas>
        </div>
    `;

    canvas = document.getElementById("soccerCanvas");
    ctx = canvas.getContext("2d");

    setupMouseEvents();

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
}

// --- 턴 교대 시 위치 및 물리 초기화 ---
function initTurn() {
    isDrawingPath = false;
    drawnMousePoints = [];
    ballPath3D = [];
    pathIndex = 0;
    
    camY = 0;
    horizon = HORIZON_DEFAULT;
    turnResultText = "";
    turnResultTimer = 0;

    let keeperSpeed = difficulty === "easy" ? 2.5 : difficulty === "normal" ? 4.5 : 6.5;

    ballObj = { x: 0, y: 0, z: 40, radius: 13, isShot: false };
    kickerObj = { x: -25, y: 0, z: 20 }; 

    if (currentTurn === "HUMAN_ATTACK") {
        keeperObj = { x: 0, y: 0, z: 450, speed: keeperSpeed, dir: 1, width: 50, height: 65 };
    } else {
        keeperObj = { x: 0, y: 0, z: 450, speed: keeperSpeed * 0.7, dir: 1, width: 50, height: 65 };
        setTimeout(executeAIShot, 1200);
    }
}

// ---------------- ✍️ MOUSE PATH DRAWING SYSTEM (마우스 선 그리기) ----------------
function setupMouseEvents() {
    canvas.onmousedown = (e) => {
        if (currentTurn !== "HUMAN_ATTACK" || ballObj.isShot || gameOver || turnResultText) return;
        isDrawingPath = true;
        drawnMousePoints = [{ x: e.offsetX, y: e.offsetY }];
    };

    canvas.onmousemove = (e) => {
        if (!isDrawingPath) return;
        drawnMousePoints.push({ x: e.offsetX, y: e.offsetY });
    };

    canvas.onmouseup = (e) => {
        if (!isDrawingPath) return;
        isDrawingPath = false;
        if (drawnMousePoints.length < 5) return; // 너무 짧은 입력 무시

        // 그린 마우스 선 데이터들을 원근법을 고려한 3D 비행 궤적으로 전면 수학 매핑
        ballObj.isShot = true;
        ballPath3D = [];
        pathIndex = 0;

        const totalFrames = 60; // 공이 날아가는 총 시간 프레임
        for (let i = 0; i <= totalFrames; i++) {
            let t = i / totalFrames;
            // 궤적 인덱스 샘플링 추출
            let sampleIdx = Math.min(drawnMousePoints.length - 1, Math.floor(t * (drawnMousePoints.length - 1)));
            let pt = drawnMousePoints[sampleIdx];

            // 1. Z축: 출발지(40)에서 골대 위치(460)까지 일정하게 나아감
            let 3dZ = 40 + (goalObj.z - 40) * t;

            // 2. X축: 캔버스 중심 대비 비율을 구하고, 멀어질수록 원근 스케일에 맞게 수평 계산
            let scale = 350 / (350 + 3dZ);
            let 3dX = (pt.x - canvas.width / 2) / scale;

            // 3. Y축: 화면 좌표계 아래(바닥)와 위(높이)를 변환하여 입체 고도 지정
            let 3dY = ((canvas.height - pt.y) - (horizon * (1 - scale))) / scale;
            if (3dY < 0) 3dY = 0; // 땅바닥 뚫지 않게 제어

            ballPath3D.push({ x: 3dX, y: 3dY, z: 3dZ });
        }
    };
}

// ---------------- AI SHOT MACHINE ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballObj.isShot = true;
    ballPath3D = [];
    pathIndex = 0;

    let targetX = (Math.random() - 0.5) * (goalObj.width - 40);
    let targetY = 20 + Math.random() * (goalObj.height - 35);
    let curveX = (Math.random() - 0.5) * 160; // AI 고유 휘어짐 축

    const totalFrames = 60;
    for (let i = 0; i <= totalFrames; i++) {
        let t = i / totalFrames;
        let 3dZ = 40 + (goalObj.z - 40) * t;
        // 베지에 곡선 응용으로 휘어지는 인공지능 마구 구현
        let 3dX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * curveX + t * t * targetX;
        // 포물선 상승 슛 구현
        let 3dY = Math.sin(t * Math.PI) * (targetY + 30) + (targetY * t);

        ballPath3D.push({ x: 3dX, y: 3dY, z: 3dZ });
    }
}

// ---------------- GAME LOGIC MATRIX ----------------
function update() {
    if (gameOver) return;

    // 골키퍼 제어 무빙 알고리즘
    if (currentTurn === "AI_ATTACK") {
        if (window.keys && window.keys['ArrowLeft']) keeperObj.x -= 4.5;
        if (window.keys && window.keys['ArrowRight']) keeperObj.x += 4.5;
    } else {
        keeperObj.x += keeperObj.speed * keeperObj.dir;
        if (keeperObj.x > goalObj.width/2 - 10 || keeperObj.x < -goalObj.width/2 + 10) keeperObj.dir *= -1;
    }

    // 궤적 역학 드라이빙 및 카메라 추적 연산
    if (ballObj.isShot && ballPath3D.length > 0 && !turnResultText) {
        if (pathIndex < ballPath3D.length) {
            let nextPos = ballPath3D[pathIndex];
            ballObj.x = nextPos.x;
            ballObj.y = nextPos.y;
            ballObj.z = nextPos.z;

            // 🎥 [시야 솟구침 완벽 해결]
            // 공의 y(고도)값에 무작정 끌려다니며 아래로 내려박지 않고, 안정적으로 수평선 중심을 고정 유지합니다.
            if (ballObj.z > 80) {
                camY = camY * 0.9 + Math.max(0, ballObj.y * 0.35) * 0.1; // 위쪽 슛 트래킹만 완만하게 반영
                horizon = horizon * 0.95 + HORIZON_DEFAULT * 0.05;      // 지평선 무너짐 완전 제어
            }

            pathIndex++;
        }

        // 판정 포인트 (Z축 골대 진입 판단)
        if (ballObj.z >= goalObj.z || pathIndex >= ballPath3D.length) {
            if (Math.abs(ballObj.x - keeperObj.x) < 45 && ballObj.y < keeperObj.height) {
                turnResultText = "MISS";
            } 
            else if (ballObj.x >= -goalObj.width/2 && ballObj.x <= goalObj.width/2 && ballObj.y <= goalObj.height && ballObj.y >= 0) {
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
        if (turnResultTimer > 100) { 
            nextTurnEvent();
        }
    }
}

function nextTurnEvent() {
    if (currentTurn === "HUMAN_ATTACK") {
        currentTurn = "AI_ATTACK";
        initTurn();
    } else {
        if (currentRound >= 5) {
            gameOver = true;
        } else {
            let remHumanAtt = 5 - currentRound;
            let remAiAtt = 5 - currentRound;

            if (humanScore + remHumanAtt < aiScore || aiScore + remAiAtt < humanScore) {
                gameOver = true;
            } else {
                currentRound++;
                currentTurn = "HUMAN_ATTACK";
                initTurn();
            }
        }
    }
}

// ---------------- GRAPHICS RENDERING LAYER ----------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. 관중석(스탠드) 및 하늘 배경 레이어
    ctx.fillStyle = '#1e3c72'; ctx.fillRect(0, 0, canvas.width, horizon - 40); 
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, horizon - 40, canvas.width, 40); 

    // 관중 도트 무더기 묘사
    for (let y = horizon - 35; y < horizon - 5; y += 6) {
        for (let x = 10; x < canvas.width; x += 9) {
            ctx.fillStyle = (x + y) % 3 === 0 ? '#ff4757' : (x + y) % 3 === 1 ? '#2ed573' : '#1e90ff';
            ctx.fillRect(x, y, 4, 4); // 관중 뷰 camY의 영향을 분리시켜 시야 보정
        }
    }

    // 경기장 필드 잔디 원근 그라데이션
    ctx.fillStyle = '#1b5228'; ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.fillStyle = '#226632';
    for (let i = 0; i < 10; i++) {
        let zStart = i * 50;
        let p1 = project(-500, 0, zStart);
        if (i % 2 === 0) {
            ctx.fillRect(0, p1.y, canvas.width, Math.max(15, 40 * p1.scale));
        }
    }

    // 경기장 라인 마킹
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
    ctx.beginPath();
    let lineFar = project(-250, 0, 460), lineNear = project(-400, 0, 0);
    ctx.moveTo(lineNear.x, lineNear.y); ctx.lineTo(lineFar.x, lineFar.y);
    let lineFarR = project(250, 0, 460), lineNearR = project(400, 0, 0);
    ctx.moveTo(lineNearR.x, lineNearR.y); ctx.lineTo(lineFarR.x, lineFarR.y);
    ctx.stroke();

    // 2. 골대 메쉬 프레임워크 렌더링
    const gBL = project(-goalObj.width/2, 0, goalObj.z);
    const gTL = project(-goalObj.width/2, goalObj.height, goalObj.z);
    const gTR = project(goalObj.width/2, goalObj.height, goalObj.z);
    const gBR = project(goalObj.width/2, 0, goalObj.z);
    
    // 그물망선 가상 묘사
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
        let lx = -goalObj.width/2 + (goalObj.width / 10) * i;
        let pB = project(lx, 0, goalObj.z);
        let pT = project(lx, goalObj.height, goalObj.z);
        ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pT.x, pT.y); ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 6 * gBL.scale;
    ctx.beginPath();
    ctx.moveTo(gBL.x, gBL.y); ctx.lineTo(gTL.x, gTL.y); ctx.lineTo(gTR.x, gTR.y); ctx.lineTo(gBR.x, gBR.y);
    ctx.stroke();

    // 3. 골키퍼 렌더링
    const kp = project(keeperObj.x, keeperObj.y, keeperObj.z);
    const kpSize = 5.2 * kp.scale;
    let kColor = currentTurn === "HUMAN_ATTACK" ? "#eccc68" : "#2ed573"; 
    drawPixelArt(PIXELS_KEEPER, kp.x - (7 * kpSize)/2, kp.y - (7 * kpSize), kpSize, kColor, '#ffffff');

    // 4. 공격수 키커 드로잉
    if (!ballObj.isShot) {
        const pp = project(kickerObj.x, kickerObj.y, kickerObj.z);
        const ppSize = 8.5 * pp.scale;
        let pColor = currentTurn === "HUMAN_ATTACK" ? "#ff4757" : "#1e90ff"; 
        drawPixelArt(PIXELS_STRIKER, pp.x - (7 * ppSize)/2, pp.y - (8 * ppSize), ppSize, pColor, '#ffffff');
    }

    // 5. 공 매체 렌더링
    const bp = project(ballObj.x, ballObj.y, ballObj.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ballObj.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();

    // ✍️ [실시간 유저 드로잉 라인 렌더링]
    if (isDrawingPath && drawnMousePoints.length > 1) {
        ctx.strokeStyle = '#00ffaa'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(drawnMousePoints[0].x, drawnMousePoints[0].y);
        for(let p of drawnMousePoints) ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    // 6. 상단 대시보드 HUD 스코어보드 렌더링
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)"; ctx.fillRect(20, 20, 320, 65);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 15px Pretendard"; ctx.textAlign = "left";
    ctx.fillText(`ROUND: ${currentRound} / 5 | ${currentTurn === "HUMAN_ATTACK" ? "인간 공격" : "수비 (방향키 제어)"}`, 35, 42);
    ctx.font = "bold 18px Pretendard";
    ctx.fillText(`HUMAN  ${humanScore} : ${aiScore}  AI`, 35, 72);

    // 단일 슈팅 즉각 결과 팝업 오버레이
    if (turnResultText) {
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = turnResultText === "GOAL" ? "#00ffcc" : "#ff4757";
        ctx.font = "bold 60px Pretendard"; ctx.textAlign = "center";
        ctx.fillText(turnResultText, canvas.width/2, canvas.height/2);
    }

    // 최종전 승패 확정 모달 화면
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.textAlign = "center"; ctx.fillStyle = "#ffffff";
        ctx.font = "bold 40px Pretendard";
        
        let finalWinner = "무승부 (DRAW)";
        if (humanScore > aiScore) finalWinner = "👑 인간의 최종 승리! (HUMAN WIN)";
        if (humanScore < aiScore) finalWinner = "🤖 AI의 최종 승리! (AI WIN)";

        ctx.fillText("경기 종료 (FINAL RESULT)", canvas.width/2, canvas.height/2 - 70);
        ctx.font = "bold 32px Pretendard"; ctx.fillStyle = "#ffcc00";
        ctx.fillText(finalWinner, canvas.width/2, canvas.height/2 - 10);
        
        ctx.font = "20px Pretendard"; ctx.fillStyle = "#cccccc";
        ctx.fillText(`최종 점수 - 인간: ${humanScore}점 | AI: ${aiScore}점`, canvas.width/2, canvas.height/2 + 40);

        ctx.fillStyle = "#1ea857"; ctx.fillRect(canvas.width/2 - 80, canvas.height/2 + 80, 160, 40);
        ctx.fillStyle = "#ffffff"; ctx.font = "bold 16px Pretendard";
        ctx.fillText("다시 하기", canvas.width/2, canvas.height/2 + 105);
        
        canvas.onclick = (e) => {
            let mx = e.offsetX; let my = e.offsetY;
            if (mx >= canvas.width/2 - 80 && mx <= canvas.width/2 + 80 && my >= canvas.height/2 + 80 && my <= canvas.height/2 + 120) {
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
