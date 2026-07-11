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
let currentTurn = "HUMAN_ATTACK"; 
let humanScore = 0;
let aiScore = 0;
let turnResultText = ""; 
let turnResultTimer = 0;

// --- ✍️ 마우스 궤적 드로잉 및 카메라 변수 ---
let isDrawingPath = false;
let drawnMousePoints = []; 
let ballPath3D = [];       
let pathIndex = 0;         

let camY = 0; 
const HORIZON_DEFAULT = 210; // 🚀 스케일 근접화에 따른 수평선 배치 조정
let horizon = HORIZON_DEFAULT;

// --- 객체 구조 정의 (더 가까운 거리감으로 배치 재조정) ---
let kickerObj = {};
let keeperObj = {};
let ballObj = {};
const goalObj = { x: 0, z: 280, width: 260, height: 120 }; // 🚀 골대를 더 가깝고(Z:460->280) 크게 변경!

// --- 키퍼 다이빙 메커니즘 변수 (유저/AI 공용) ---
let isDiving = false;
let diveTargetX = 0;
let diveProgress = 0;

// --- 픽셀 데이터 매핑 ---
const PIXELS_STRIKER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [0,2,2,2,2,2,0],
    [2,2,5,2,5,2,2], [2,2,2,2,2,2,2], [0,6,6,0,6,6,0],
    [0,6,0,0,0,6,0], [1,1,0,0,0,1,1]
];
const PIXELS_KEEPER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [5,2,2,2,2,2,5],
    [0,2,2,2,2,2,0], [0,2,2,2,2,2,0], [0,6,6,0,6,6,0], [0,6,0,0,0,6,0]
];

// 3D 투영 매트릭스 함수 (근접 뷰 최적화)
function project(x, y, z) {
    const scale = 260 / (260 + z); // 스케일 상수 조정으로 근접감 극대화
    const screenX = canvas.width / 2 + (x * scale);
    const screenY = horizon + ((canvas.height - horizon) - y) * scale - camY * scale;
    return { x: screenX, y: screenY, scale: scale };
}

// 픽셀 드로잉 코어
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
            <h2 style="margin-bottom: 20px;">⚽ AI vs HUMAN : 박진감 프리킥 대항전</h2>
            <p style="color: #666; margin-bottom: 15px;">골대 바로 앞 근접 시점! <span style="color:#1ea857; font-weight:bold;">AI 골키퍼도 슛을 보고 다이빙합니다!</span></p>
            <p style="color: #888; font-size: 14px; margin-bottom: 30px;">🛡️ <b>수비 가이드:</b> AI 공격 시, 골대 구석을 타이밍 맞춰 마우스로 클릭해 막아내세요!</p>
            <div style="display:flex; flex-direction:column; gap:12px; max-width:320px; margin:0 auto;">
                <button class="game-select-btn" onclick="window.__startSoccer('easy')">쉬움 (AI 반응 속도 느림)</button>
                <button class="game-select-btn" onclick="window.__startSoccer('normal')">보통 (긴장감 넘치는 선방)</button>
                <button class="game-select-btn" onclick="window.__startSoccer('hard')">어려움 (신들린 야신 AI)</button>
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
            <canvas id="soccerCanvas" width="900" height="550" style="background:#1e5e2f; border-radius:12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"></canvas>
        </div>
    `;

    canvas = document.getElementById("soccerCanvas");
    ctx = canvas.getContext("2d");

    setupMouseEvents();

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
}

function initTurn() {
    isDrawingPath = false;
    drawnMousePoints = [];
    ballPath3D = [];
    pathIndex = 0;
    
    isDiving = false;
    diveTargetX = 0;
    diveProgress = 0;

    camY = 0;
    horizon = HORIZON_DEFAULT;
    turnResultText = "";
    turnResultTimer = 0;

    // 공 위치를 대폭 앞으로 당김 (Z: 40 -> 60)
    ballObj = { x: 0, y: 0, z: 60, radius: 15, isShot: false };
    kickerObj = { x: -30, y: 0, z: 40 }; 

    if (currentTurn === "HUMAN_ATTACK") {
        // AI 골키퍼 초기화
        keeperObj = { x: 0, y: 0, z: goalObj.z - 5, speed: 2.5, dir: 1, width: 60, height: 75 };
    } else {
        // 유저 골키퍼 초기화
        keeperObj = { x: 0, y: 0, z: goalObj.z - 5, speed: 0, dir: 1, width: 60, height: 75 };
        setTimeout(executeAIShot, 1400); 
    }
}

// ---------------- ✍️ MOUSE SYSTEM ----------------
function setupMouseEvents() {
    canvas.onmousedown = (e) => {
        if (gameOver || turnResultText) return;

        if (currentTurn === "HUMAN_ATTACK" && !ballObj.isShot) {
            isDrawingPath = true;
            drawnMousePoints = [{ x: e.offsetX, y: e.offsetY }];
        }
        
        // 유저 수비 시 다이빙 클릭 메커니즘
        if (currentTurn === "AI_ATTACK" && !isDiving) {
            let mx = e.offsetX;
            let my = e.offsetY;

            const gBL = project(-goalObj.width/2, 0, goalObj.z);
            const gTR = project(goalObj.width/2, goalObj.height, goalObj.z);

            if (mx >= gBL.x - 50 && mx <= gTR.x + 50 && my >= gTR.y - 50 && my <= gBL.y + 30) {
                const scale = 260 / (260 + goalObj.z);
                let targetX3D = (mx - canvas.width / 2) / scale;
                
                diveTargetX = Math.max(-goalObj.width/2 - 15, Math.min(goalObj.width/2 + 15, targetX3D));
                isDiving = true;
                diveProgress = 0;
            }
        }
    };

    canvas.onmousemove = (e) => {
        if (!isDrawingPath) return;
        drawnMousePoints.push({ x: e.offsetX, y: e.offsetY });
    };

    canvas.onmouseup = (e) => {
        if (!isDrawingPath) return;
        isDrawingPath = false;

        if (drawnMousePoints.length < 5) return;
        let startPt = drawnMousePoints[0];
        let endPt = drawnMousePoints[drawnMousePoints.length - 1];
        let dragDistance = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
        if (dragDistance < 60) return; // 1cm 미세클릭 무시 안전장치

        ballObj.isShot = true;
        ballPath3D = [];
        pathIndex = 0;

        const scaleGoal = 260 / (260 + goalObj.z);
        let targetX = (endPt.x - canvas.width / 2) / scaleGoal;
        
        // 가까워졌으므로 상단 솟구침 억제 계수 재조정
        let rawTargetY = ((canvas.height - endPt.y) - (horizon * (1 - scaleGoal))) / scaleGoal;
        let targetY = Math.min(goalObj.height + 30, Math.max(5, rawTargetY * 0.4)); 

        let midPt = drawnMousePoints[Math.floor(drawnMousePoints.length / 2)];
        let midX = (midPt.x - canvas.width / 2) / scaleGoal;
        let curveX = (midX - targetX * 0.5) * 1.5;

        const totalFrames = 50; // 근접 슛이므로 프레임 단축하여 속도감 업!
        for (let i = 0; i <= totalFrames; i++) {
            let t = i / totalFrames;
            let posZ = ballObj.z + (goalObj.z - ballObj.z) * t;

            let posX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * curveX + t * t * targetX;
            let posY = Math.sin(t * Math.PI) * (targetY * 0.35) + (targetY * t);

            ballPath3D.push({ x: posX, y: posY, z: posZ });
        }

        // 🤖 [AI 골키퍼 다이빙 반응 발동!]
        // 유저가 슛을 쏜 직후 난이도별 타이밍 확률에 따라 최종 목적지 예측 다이빙 시작
        let aiDelay = difficulty === "easy" ? 300 : difficulty === "normal" ? 150 : 50; 
        let aiAccuracy = difficulty === "easy" ? 0.5 : difficulty === "normal" ? 0.8 : 0.98;

        setTimeout(() => {
            if (gameOver || !ballObj.isShot || currentTurn !== "HUMAN_ATTACK") return;
            
            // AI가 공의 최종 궤적 x좌표를 부분적으로 비틀어 도약 유도 (실수 유발 반영)
            let predictedX = targetX;
            if (Math.random() > aiAccuracy) {
                predictedX += (Math.random() - 0.5) * 100; // 쉬움/보통일 땐 역동작이나 미스 유도
            }

            diveTargetX = Math.max(-goalObj.width/2 - 10, Math.min(goalObj.width/2 + 10, predictedX));
            isDiving = true;
            diveProgress = 0;
        }, aiDelay);
    };
}

// ---------------- AI SHOT MACHINE ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballObj.isShot = true;
    ballPath3D = [];
    pathIndex = 0;

    let targetX = (Math.random() - 0.5) * (goalObj.width - 40);
    let targetY = 20 + Math.random() * (goalObj.height - 40);
    let curveX = (Math.random() - 0.5) * 110; 

    const totalFrames = 55; 
    for (let i = 0; i <= totalFrames; i++) {
        let t = i / totalFrames;
        let posZ = ballObj.z + (goalObj.z - ballObj.z) * t;
        let posX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * curveX + t * t * targetX;
        let posY = Math.sin(t * Math.PI) * (targetY * 0.4) + (targetY * t);

        ballPath3D.push({ x: posX, y: posY, z: posZ });
    }
}

// ---------------- GAME LOGIC MATRIX ----------------
function update() {
    if (gameOver) return;

    // 통합 다이빙 구동부 (유저 다이빙 클릭 & AI 예측 다이빙 공용 연산)
    if (isDiving) {
        if (diveProgress < 1) {
            let diveSpeed = difficulty === "hard" && currentTurn === "HUMAN_ATTACK" ? 0.12 : 0.09;
            diveProgress += diveSpeed;
            keeperObj.x = keeperObj.x * (1 - diveProgress) + diveTargetX * diveProgress;
            keeperObj.y = Math.sin(diveProgress * Math.PI) * 35; // 다이빙 시 공중 도약 고도 증가
        }
    } else {
        // 공이 날아가기 전까지만 기본 좌우 무빙 (공격 턴일 때만)
        if (currentTurn === "HUMAN_ATTACK" && !ballObj.isShot) {
            keeperObj.x += keeperObj.speed * keeperObj.dir;
            if (keeperObj.x > goalObj.width/3 || keeperObj.x < -goalObj.width/3) keeperObj.dir *= -1;
        }
    }

    // 공 비행 및 판정
    if (ballObj.isShot && ballPath3D.length > 0 && !turnResultText) {
        if (pathIndex < ballPath3D.length) {
            let nextPos = ballPath3D[pathIndex];
            ballObj.x = nextPos.x;
            ballObj.y = nextPos.y;
            ballObj.z = nextPos.z;

            if (currentTurn === "HUMAN_ATTACK") {
                if (ballObj.z > 100) {
                    camY = camY * 0.95 + Math.max(0, ballObj.y * 0.15) * 0.05; 
                }
            } else {
                camY = 0;
                horizon = HORIZON_DEFAULT;
            }
            pathIndex++;
        }

        if (ballObj.z >= goalObj.z || pathIndex >= ballPath3D.length) {
            // 근접 스케일에 따른 선방 판정 범위 최적화
            let defenseRange = isDiving ? 70 : 45; 
            if (Math.abs(ballObj.x - keeperObj.x) < defenseRange && ballObj.y < (keeperObj.height + 35)) {
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

    // 1. 관중석 및 경기장 배경 배경
    ctx.fillStyle = '#1a365d'; ctx.fillRect(0, 0, canvas.width, horizon - 40); 
    ctx.fillStyle = '#2d3748'; ctx.fillRect(0, horizon - 40, canvas.width, 40); 

    for (let y = horizon - 35; y < horizon - 5; y += 6) {
        for (let x = 10; x < canvas.width; x += 9) {
            ctx.fillStyle = (x + y) % 3 === 0 ? '#e53e3e' : (x + y) % 3 === 1 ? '#38a169' : '#3182ce';
            ctx.fillRect(x, y, 4, 4); 
        }
    }

    // 잔디 하프라인 및 그라데이션 패턴
    ctx.fillStyle = '#144320'; ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.fillStyle = '#1c5c2d';
    for (let i = 0; i < 8; i++) {
        let zStart = i * 45;
        let p1 = project(-500, 0, zStart);
        if (i % 2 === 0) {
            ctx.fillRect(0, p1.y, canvas.width, Math.max(20, 55 * p1.scale));
        }
    }

    // 사이드 가이드 라인 매핑
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath();
    let lineFar = project(-300, 0, goalObj.z), lineNear = project(-450, 0, 0);
    ctx.moveTo(lineNear.x, lineNear.y); ctx.lineTo(lineFar.x, lineFar.y);
    let lineFarR = project(300, 0, goalObj.z), lineNearR = project(450, 0, 0);
    ctx.moveTo(lineNearR.x, lineNearR.y); ctx.lineTo(lineFarR.x, lineFarR.y);
    ctx.stroke();

    // 2. 골대 렌더링 (더 크게 확대되어 나타남)
    const gBL = project(-goalObj.width/2, 0, goalObj.z);
    const gTL = project(-goalObj.width/2, goalObj.height, goalObj.z);
    const gTR = project(goalObj.width/2, goalObj.height, goalObj.z);
    const gBR = project(goalObj.width/2, 0, goalObj.z);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
    for (let i = 1; i < 12; i++) {
        let lx = -goalObj.width/2 + (goalObj.width / 12) * i;
        let pB = project(lx, 0, goalObj.z);
        let pT = project(lx, goalObj.height, goalObj.z);
        ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pT.x, pT.y); ctx.stroke();
    }

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 7 * gBL.scale;
    ctx.beginPath();
    ctx.moveTo(gBL.x, gBL.y); ctx.lineTo(gTL.x, gTL.y); ctx.lineTo(gTR.x, gTR.y); ctx.lineTo(gBR.x, gBR.y);
    ctx.stroke();

    // 3. 골키퍼 렌더링 (확대된 크기 비율 반영)
    const kp = project(keeperObj.x, keeperObj.y, keeperObj.z);
    const kpSize = 6.5 * kp.scale; // 키퍼 픽셀 크기 확대
    let kColor = currentTurn === "HUMAN_ATTACK" ? "#eccc68" : "#2ed573"; 
    
    // 다이빙 연산 진행중일 때 키퍼 바디 회전각 주는 특수 연산 추가
    ctx.save();
    ctx.translate(kp.x, kp.y - (7 * kpSize)/2);
    if (isDiving) {
        let angle = (diveTargetX > 0 ? 45 : -45) * (Math.PI / 180) * Math.min(1, diveProgress * 1.5);
        ctx.rotate(angle);
    }
    drawPixelArt(PIXELS_KEEPER, -(7 * kpSize)/2, -(7 * kpSize)/2, kpSize, kColor, '#ffffff');
    ctx.restore();

    // 4. 공격수 키커 드로잉
    if (!ballObj.isShot) {
        const pp = project(kickerObj.x, kickerObj.y, kickerObj.z);
        const ppSize = 10.0 * pp.scale;
        let pColor = currentTurn === "HUMAN_ATTACK" ? "#ff4757" : "#1e90ff"; 
        drawPixelArt(PIXELS_STRIKER, pp.x - (7 * ppSize)/2, pp.y - (8 * ppSize), ppSize, pColor, '#ffffff');
    }

    // 5. 공 렌더링 (가까운 거리 보정)
    const bp = project(ballObj.x, ballObj.y, ballObj.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ballObj.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2 * bp.scale; ctx.stroke();

    // ✍️ 실시간 유저 드로잉 라인 노출
    if (isDrawingPath && drawnMousePoints.length > 1) {
        ctx.strokeStyle = '#00ffaa'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(drawnMousePoints[0].x, drawnMousePoints[0].y);
        for(let p of drawnMousePoints) ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    // 6. 스코어보드 HUD 및 가이드 텍스트
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; ctx.fillRect(20, 20, 380, 80);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px Pretendard"; ctx.textAlign = "left";
    let guideStr = currentTurn === "HUMAN_ATTACK" ? "⚡ 근접 뷰! 공에서 골대로 곡선을 빠르게 그리세요!" : "🛡️ 키퍼 시점 고정! 골대 구석을 클릭해 다이빙 선방!";
    ctx.fillText(`ROUND: ${currentRound} / 5 | ${currentTurn === "HUMAN_ATTACK" ? "인간 공격 (AI 수비)" : "인간 수비 (AI 공격)"}`, 35, 42);
    ctx.fillText(guideStr, 35, 62);
    ctx.font = "bold 18px Pretendard"; ctx.fillStyle = "#ffcc00";
    ctx.fillText(`HUMAN  ${humanScore} : ${aiScore}  AI`, 35, 87);

    if (turnResultText) {
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = turnResultText === "GOAL" ? "#00ffcc" : "#ff4757";
        ctx.font = "bold 65px Pretendard"; ctx.textAlign = "center";
        ctx.fillText(turnResultText, canvas.width/2, canvas.height/2);
    }

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
