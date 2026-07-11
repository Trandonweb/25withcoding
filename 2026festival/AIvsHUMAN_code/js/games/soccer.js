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
const HORIZON_DEFAULT = 180;
let horizon = HORIZON_DEFAULT;

// --- 객체 구조 정의 ---
let kickerObj = {};
let keeperObj = {};
let ballObj = {};
const goalObj = { x: 0, z: 460, width: 220, height: 100 };

// --- 키퍼 다이빙 메커니즘 변수 ---
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

// 3D 투영 매트릭스 함수
function project(x, y, z) {
    const scale = 350 / (350 + z);
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
            <h2 style="margin-bottom: 20px;">⚽ AI vs HUMAN : 프리킥 대항전</h2>
            <p style="color: #666; margin-bottom: 15px;">공에서 골대 안으로 원하는 <span style="color:#1ea857; font-weight:bold;">슈팅 곡선을 시원하게 그립시다!</span></p>
            <p style="color: #888; font-size: 14px; margin-bottom: 30px;">🛡️ <b>수비 턴 가이드:</b> AI 공격 시 화면 요동 없이 키퍼 정면 시점으로 철저히 고정됩니다.</p>
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

    // 수비 시점일 땐 고정 카메라, 공격 시점일 땐 유연한 추적 카메라용 초기화
    camY = 0;
    horizon = HORIZON_DEFAULT;
    turnResultText = "";
    turnResultTimer = 0;

    let keeperSpeed = difficulty === "easy" ? 2.0 : difficulty === "normal" ? 3.5 : 5.0;

    ballObj = { x: 0, y: 0, z: 40, radius: 13, isShot: false };
    kickerObj = { x: -25, y: 0, z: 20 }; 

    if (currentTurn === "HUMAN_ATTACK") {
        keeperObj = { x: 0, y: 0, z: 450, speed: keeperSpeed, dir: 1, width: 50, height: 65 };
    } else {
        keeperObj = { x: 0, y: 0, z: 450, speed: 0, dir: 1, width: 50, height: 65 };
        setTimeout(executeAIShot, 1500); 
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
        
        if (currentTurn === "AI_ATTACK" && !isDiving) {
            let mx = e.offsetX;
            let my = e.offsetY;

            const gBL = project(-goalObj.width/2, 0, goalObj.z);
            const gTR = project(goalObj.width/2, goalObj.height, goalObj.z);

            if (mx >= gBL.x - 40 && mx <= gTR.x + 40 && my >= gTR.y - 40 && my <= gBL.y + 30) {
                const scale = 350 / (350 + goalObj.z);
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

        // 🛑 [1cm 미세클릭 슛 차단 안전장치]
        if (drawnMousePoints.length < 5) return;
        let startPt = drawnMousePoints[0];
        let endPt = drawnMousePoints[drawnMousePoints.length - 1];
        let dragDistance = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
        if (dragDistance < 60) return; // 드래그 길이가 60픽셀 이하면 무시

        ballObj.isShot = true;
        ballPath3D = [];
        pathIndex = 0;

        // 드로잉 데이터로부터 슈팅 끝점 및 휘어짐(바나나킥) 특성 추출
        const scaleGoal = 350 / (350 + goalObj.z);
        let targetX = (endPt.x - canvas.width / 2) / scaleGoal;
        
        // 🚀 [하늘 솟구침 완벽 제어] 마우스 Y값 한계 비율 고정
        let rawTargetY = ((canvas.height - endPt.y) - (horizon * (1 - scaleGoal))) / scaleGoal;
        let targetY = Math.min(goalObj.height + 40, Math.max(5, rawTargetY * 0.45)); 

        // 중간 경로 최댓값을 기준으로 바나나킥 곡선용 측면 휨 계산
        let midPt = drawnMousePoints[Math.floor(drawnMousePoints.length / 2)];
        let midX = (midPt.x - canvas.width / 2) / scaleGoal;
        let curveX = (midX - targetX * 0.5) * 1.8;

        const totalFrames = 60; 
        for (let i = 0; i <= totalFrames; i++) {
            let t = i / totalFrames;
            let posZ = 40 + (goalObj.z - 40) * t;

            // 🎯 이상적인 역학 포물선 공식으로 재조합 적용
            let posX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * curveX + t * t * targetX;
            // 초기 도약 고도를 보정하여 공이 중간에 너무 높게 뜨지 않게 제어
            let posY = Math.sin(t * Math.PI) * (targetY * 0.4) + (targetY * t);

            ballPath3D.push({ x: posX, y: posY, z: posZ });
        }
    };
}

// ---------------- AI SHOT MACHINE ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballObj.isShot = true;
    ballPath3D = [];
    pathIndex = 0;

    let targetX = (Math.random() - 0.5) * (goalObj.width - 25);
    let targetY = 15 + Math.random() * (goalObj.height - 35);
    let curveX = (Math.random() - 0.5) * 130; 

    const totalFrames = 65; 
    for (let i = 0; i <= totalFrames; i++) {
        let t = i / totalFrames;
        let posZ = 40 + (goalObj.z - 40) * t;
        let posX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * curveX + t * t * targetX;
        let posY = Math.sin(t * Math.PI) * (targetY * 0.5) + (targetY * t);

        ballPath3D.push({ x: posX, y: posY, z: posZ });
    }
}

// ---------------- GAME LOGIC MATRIX ----------------
function update() {
    if (gameOver) return;

    if (currentTurn === "AI_ATTACK") {
        if (isDiving && diveProgress < 1) {
            diveProgress += 0.08; 
            keeperObj.x = keeperObj.x * (1 - diveProgress) + diveTargetX * diveProgress;
            keeperObj.y = Math.sin(diveProgress * Math.PI) * 25; 
        }
    } else {
        keeperObj.x += keeperObj.speed * keeperObj.dir;
        if (keeperObj.x > goalObj.width/2 - 15 || keeperObj.x < -goalObj.width/2 + 15) keeperObj.dir *= -1;
    }

    if (ballObj.isShot && ballPath3D.length > 0 && !turnResultText) {
        if (pathIndex < ballPath3D.length) {
            let nextPos = ballPath3D[pathIndex];
            ballObj.x = nextPos.x;
            ballObj.y = nextPos.y;
            ballObj.z = nextPos.z;

            // 🎥 [시점 전면 분리 개편]
            if (currentTurn === "HUMAN_ATTACK") {
                // 공격 시에는 부드러운 전진 추적
                if (ballObj.z > 80) {
                    camY = camY * 0.9 + Math.max(0, ballObj.y * 0.25) * 0.1; 
                    horizon = horizon * 0.95 + HORIZON_DEFAULT * 0.05;      
                }
            } else {
                // 🛡️ [수비 시점 완벽 고정] 시야가 한 치의 흔들림도 없이 정면 유지
                camY = 0;
                horizon = HORIZON_DEFAULT;
            }
            pathIndex++;
        }

        if (ballObj.z >= goalObj.z || pathIndex >= ballPath3D.length) {
            let defenseRange = isDiving ? 55 : 38; 
            if (Math.abs(ballObj.x - keeperObj.x) < defenseRange && ballObj.y < (keeperObj.height + 25)) {
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

    // 1. 관중석 및 배경
    ctx.fillStyle = '#1e3c72'; ctx.fillRect(0, 0, canvas.width, horizon - 40); 
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, horizon - 40, canvas.width, 40); 

    for (let y = horizon - 35; y < horizon - 5; y += 6) {
        for (let x = 10; x < canvas.width; x += 9) {
            ctx.fillStyle = (x + y) % 3 === 0 ? '#ff4757' : (x + y) % 3 === 1 ? '#2ed573' : '#1e90ff';
            ctx.fillRect(x, y, 4, 4); 
        }
    }

    // 경기장 잔디 그라데이션
    ctx.fillStyle = '#1b5228'; ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.fillStyle = '#226632';
    for (let i = 0; i < 10; i++) {
        let zStart = i * 50;
        let p1 = project(-500, 0, zStart);
        if (i % 2 === 0) {
            ctx.fillRect(0, p1.y, canvas.width, Math.max(15, 40 * p1.scale));
        }
    }

    // 라인 마킹
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2;
    ctx.beginPath();
    let lineFar = project(-250, 0, 460), lineNear = project(-400, 0, 0);
    ctx.moveTo(lineNear.x, lineNear.y); ctx.lineTo(lineFar.x, lineFar.y);
    let lineFarR = project(250, 0, 460), lineNearR = project(400, 0, 0);
    ctx.moveTo(lineNearR.x, lineNearR.y); ctx.lineTo(lineFarR.x, lineFarR.y);
    ctx.stroke();

    // 2. 골대 렌더링
    const gBL = project(-goalObj.width/2, 0, goalObj.z);
    const gTL = project(-goalObj.width/2, goalObj.height, goalObj.z);
    const gTR = project(goalObj.width/2, goalObj.height, goalObj.z);
    const gBR = project(goalObj.width/2, 0, goalObj.z);
    
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

    // 5. 공 렌더링
    const bp = project(ballObj.x, ballObj.y, ballObj.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ballObj.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();

    // ✍️ 실시간 유저 드로잉 라인 노출
    if (isDrawingPath && drawnMousePoints.length > 1) {
        ctx.strokeStyle = '#00ffaa'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(drawnMousePoints[0].x, drawnMousePoints[0].y);
        for(let p of drawnMousePoints) ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }

    // 6. 스코어보드 HUD 및 가이드 텍스트
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(20, 20, 360, 80);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 14px Pretendard"; ctx.textAlign = "left";
    let guideStr = currentTurn === "HUMAN_ATTACK" ? "공에서 골대 방향으로 슈팅 곡선을 길게 그리세요!" : "🛡️ 키퍼 시점 고정! 골대 빈 곳을 클릭해 다이빙!";
    ctx.fillText(`ROUND: ${currentRound} / 5 | ${currentTurn === "HUMAN_ATTACK" ? "인간 공격" : "인간 수비"}`, 35, 42);
    ctx.fillText(guideStr, 35, 62);
    ctx.font = "bold 18px Pretendard"; ctx.fillStyle = "#ffcc00";
    ctx.fillText(`HUMAN  ${humanScore} : ${aiScore}  AI`, 35, 87);

    if (turnResultText) {
        ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = turnResultText === "GOAL" ? "#00ffcc" : "#ff4757";
        ctx.font = "bold 60px Pretendard"; ctx.textAlign = "center";
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
