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

// --- 드래그 슈팅 및 카메라 변수 ---
let isDragging = false;
let dragPoints = []; // 감아차기 판정용 궤적 배열
let camY = 0; // 카메라 종축 트래킹 변수
const HORIZON_DEFAULT = 180;
let horizon = HORIZON_DEFAULT;

// --- 객체 구조 정의 ---
let kickerObj = {};
let keeperObj = {};
let ballObj = {};
const goalObj = { x: 0, z: 460, width: 220, height: 100 };

// --- 4개 팀 유니폼 픽셀 데이터 매핑 (1: 피부, 4: 머리, 6: 바지) ---
// 2: 레드(인간 공격), 3: 블루(AI 공격), 7: 그린(인간 키퍼), 8: 옐로우(AI 키퍼)
const PIXELS_STRIKER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [0,2,2,2,2,2,0],
    [2,2,5,2,5,2,2], [2,2,2,2,2,2,2], [0,6,6,0,6,6,0],
    [0,6,0,0,0,6,0], [1,1,0,0,0,1,1]
];
const PIXELS_KEEPER = [
    [0,0,4,4,4,0,0], [0,0,4,1,4,0,0], [5,2,2,2,2,2,5],
    [0,2,2,2,2,2,0], [0,2,2,2,2,2,0], [0,6,6,0,6,6,0], [0,6,0,0,0,6,0]
];

// 3D 투영 매트릭스 함수 (카메라 세로 트래킹 camY 반영)
function project(x, y, z) {
    const scale = 350 / (350 + z);
    const screenX = canvas.width / 2 + (x * scale);
    const screenY = horizon + ((canvas.height - horizon) - y) * scale - camY * scale;
    return { x: screenX, y: screenY, scale: scale };
}

// 픽셀 드로잉 코어 (유니폼 컬러 동적 치환 적용)
function drawPixelArt(art, sx, sy, pixelSize, teamColor, gloveColor = '#ffffff') {
    for (let r = 0; r < art.length; r++) {
        for (let c = 0; c < art[r].length; c++) {
            let color = null;
            switch(art[r][c]) {
                case 1: color = '#ffdbac'; break; // 피부
                case 2: color = teamColor; break; // 동적 치환 유니폼 상의
                case 3: color = '#000000'; break;
                case 4: color = '#3a2718'; break; // 머리카락
                case 5: color = gloveColor; break; // 번호 또는 등번호
                case 6: color = '#ffffff'; break; // 바지 기본 화이트
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
            <p style="color: #666; margin-bottom: 30px;">마우스/터치 드래그로 공을 차서 감아차기와 파워슛을 구현하세요. 공수가 교대됩니다!</p>
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
            <canvas id="soccerCanvas" width="900" height="550" style="background:#1e5e2f; border-radius:12px; cursor:crosshair;"></canvas>
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
    isDragging = false;
    dragPoints = [];
    camY = 0;
    horizon = HORIZON_DEFAULT;
    turnResultText = "";
    turnResultTimer = 0;

    let keeperSpeed = difficulty === "easy" ? 2.5 : difficulty === "normal" ? 4.5 : 6.5;

    ballObj = { x: 0, y: 0, z: 40, vx: 0, vy: 0, vz: 0, curve: 0, radius: 13, isShot: false, gravity: 0.28 };
    kickerObj = { x: -25, y: 0, z: 20 }; // 공 비껴 서 있는 배치

    if (currentTurn === "HUMAN_ATTACK") {
        // 인간 공격 상황 (키퍼는 저 멀리 AI)
        keeperObj = { x: 0, y: 0, z: 450, speed: keeperSpeed, dir: 1, width: 50, height: 65 };
    } else {
        // AI 공격 상황 (키퍼는 플레이어 자팀)
        keeperObj = { x: 0, y: 0, z: 450, speed: keeperSpeed * 0.7, dir: 1, width: 50, height: 65 };
        // AI는 1초 뒤 자동 슈팅 실행 시뮬레이션
        setTimeout(executeAIShot, 1200);
    }
}

// ---------------- DRAG SHOOT SYSTEM ----------------
function setupMouseEvents() {
    canvas.onmousedown = (e) => {
        if (currentTurn !== "HUMAN_ATTACK" || ballObj.isShot || gameOver || turnResultText) return;
        isDragging = true;
        dragPoints = [{ x: e.offsetX, y: e.offsetY }];
    };

    canvas.onmousemove = (e) => {
        if (!isDragging) return;
        dragPoints.push({ x: e.offsetX, y: e.offsetY });
        if (dragPoints.length > 25) dragPoints.shift(); // 최근 궤적만 유지
    };

    canvas.onmouseup = (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (dragPoints.length < 3) return;

        // 드래그 벡터 계산 (첫 점과 마지막 점 분석)
        const first = dragPoints[0];
        const last = dragPoints[dragPoints.length - 1];
        
        let dx = last.x - first.x;
        let dy = first.y - last.y; // 캔버스 y는 하향이므로 보정
        
        if (dy < 20) dy = 20; // 최소 추진력 한계선

        // 감아차기 곡선 강도 판정 (중간 점들이 직선에서 얼마나 벗어났는가 계산)
        let midIndex = Math.floor(dragPoints.length / 2);
        let midPoint = dragPoints[midIndex];
        let idealX = first.x + (last.x - first.x) * 0.5;
        let curveFactor = (midPoint.x - idealX) * -0.15; // 휘어짐의 방향과 강도

        ballObj.isShot = true;
        ballObj.vx = dx * 0.045;
        ballObj.vy = Math.min(dy * 0.05, 14);
        ballObj.vz = Math.min(dy * 0.065, 17);
        ballObj.curve = curveFactor; // 날아가면서 vx에 지속 영향 반영
    };
}

// ---------------- AI SHOT MACHINE ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballObj.isShot = true;
    // 난이도별 AI 조준 정밀도 제어
    let targetX = (Math.random() - 0.5) * (goalObj.width - 40);
    let targetY = Math.random() * (goalObj.height - 15);

    ballObj.vx = targetX * 0.025;
    ballObj.vy = Math.min(6 + targetY * 0.06, 12);
    ballObj.vz = 14; 
    ballObj.curve = (Math.random() - 0.5) * 1.5; // AI 전용 감아차기 부여
}

// ---------------- GAME LOGIC MATRIX ----------------
function update() {
    if (gameOver) return;

    // 조종 가이드: AI 턴일 때 유저가 방향키(←, →)로 골키퍼 수동 제어 개입 기능 부여!
    if (currentTurn === "AI_ATTACK") {
        if (window.keys && window.keys['ArrowLeft']) keeperObj.x -= 4.5;
        if (window.keys && window.keys['ArrowRight']) keeperObj.x += 4.5;
    } else {
        // 플레이어 공격시 AI 골키퍼가 자동 좌우 방어 무빙 수행
        keeperObj.x += keeperObj.speed * keeperObj.dir;
        if (keeperObj.x > goalObj.width/2 - 10 || keeperObj.x < -goalObj.width/2 + 10) keeperObj.dir *= -1;
    }

    // 공 비행 역학 엔진 및 카메라 트래킹
    if (ballObj.isShot && !turnResultText) {
        ballObj.vx += ballObj.curve * 0.04; // 감아차기 궤적 수치 누적 변경
        ballObj.x += ballObj.vx;
        ballObj.y += ballObj.vy;
        ballObj.z += ballObj.vz;
        ballObj.vy -= ballObj.gravity;

        // 원근식 카메라 제어: 공이 멀어지고 위로 뜰 때 화면 중심점을 끌어올림
        if (ballObj.z > 80) {
            camY = camY * 0.88 + ballObj.y * 0.6;
            horizon = horizon * 0.9 + (HORIZON_DEFAULT + ballObj.y * 0.2) * 0.1;
        }

        if (ballObj.y < 0) {
            ballObj.y = 0; ballObj.vy = -ballObj.vy * 0.35; ballObj.vx *= 0.85; ballObj.curve *= 0.5;
        }

        // 판정 포인트 (Z축 임계구역 진입)
        if (ballObj.z >= goalObj.z) {
            // 골키퍼 수비 히트 박스 판단
            if (Math.abs(ballObj.x - keeperObj.x) < 45 && ballObj.y < keeperObj.height) {
                turnResultText = "MISS";
            }
            // 골 프레임 내부 입사 판단
            else if (ballObj.x >= -goalObj.width/2 && ballObj.x <= goalObj.width/2 && ballObj.y <= goalObj.height) {
                turnResultText = "GOAL";
                if (currentTurn === "HUMAN_ATTACK") humanScore++;
                else aiScore++;
            } else {
                turnResultText = "MISS";
            }
        }
    }

    // 결과 표시 타이머 처리 후 턴 전환 혹은 조기종료 분기 연산
    if (turnResultText) {
        turnResultTimer++;
        if (turnResultTimer > 100) { // 약 1.6초간 메시지 유지
            nextTurnEvent();
        }
    }
}

function nextTurnEvent() {
    if (currentTurn === "HUMAN_ATTACK") {
        currentTurn = "AI_ATTACK";
        initTurn();
    } else {
        // 라운드 종료 연산 규칙
        if (currentRound >= 5) {
            gameOver = true;
        } else {
            // 수학적 조기 종료(Early Exit) 매트릭스 검사
            let remHumanAtt = 5 - currentRound; // 남은 인간의 공격 기회
            let remAiAtt = 5 - currentRound;    // 남은 AI의 공격 기회

            // 1. 남은 기회를 다 성공해도 이미 상대 스코어를 역전 불가능한 상황인지 판정
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

    // 1. 관중석(스탠드) 및 하늘 배경 입체 레이어 구조화
    ctx.fillStyle = '#1e3c72'; ctx.fillRect(0, 0, canvas.width, horizon - 40); // 먼 하늘
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, horizon - 40, canvas.width, 40); // 스탠드 베이스

    // 관중 도트 무더기 묘사 표현
    for (let y = horizon - 35; y < horizon - 5; y += 6) {
        for (let x = 10; x < canvas.width; x += 9) {
            ctx.fillStyle = (x + y) % 3 === 0 ? '#ff4757' : (x + y) % 3 === 1 ? '#2ed573' : '#1e90ff';
            ctx.fillRect(x, y - camY * 0.1, 4, 4);
        }
    }

    // 경기장 필드 잔디 잔디선 원근 그라데이션 기법
    ctx.fillStyle = '#1b5228'; ctx.fillRect(0, horizon, canvas.width, canvas.height - horizon);
    ctx.fillStyle = '#226632';
    for (let i = 0; i < 10; i++) {
        let zStart = i * 50;
        let p1 = project(-500, 0, zStart);
        let p2 = project(500, 0, zStart + 25);
        if (i % 2 === 0) {
            ctx.fillRect(0, p1.y, canvas.width, Math.max(15, 40 * p1.scale));
        }
    }

    // 경기장 하프/패널티 에어리어 마킹 라인 라우팅
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
    
    // 그물망 가상선 묘사
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

    // 3. 골키퍼 렌더링 (공수 상황에 알맞은 4색 유니폼 분배)
    const kp = project(keeperObj.x, keeperObj.y, keeperObj.z);
    const kpSize = 5.2 * kp.scale;
    let kColor = currentTurn === "HUMAN_ATTACK" ? "#eccc68" : "#2ed573"; // AI 옐로우 vs 인간 그린
    drawPixelArt(PIXELS_KEEPER, kp.x - (7 * kpSize)/2, kp.y - (7 * kpSize), kpSize, kColor, '#ffffff');

    // 4. 공격수 키커 키트 드로잉 (슛 대기 타임라인 상태에만 드로잉)
    if (!ballObj.isShot) {
        const pp = project(kickerObj.x, kickerObj.y, kickerObj.z);
        const ppSize = 8.5 * pp.scale;
        let pColor = currentTurn === "HUMAN_ATTACK" ? "#ff4757" : "#1e90ff"; // 인간 레드 vs AI 블루
        drawPixelArt(PIXELS_STRIKER, pp.x - (7 * ppSize)/2, pp.y - (8 * ppSize), ppSize, pColor, '#ffffff');
    }

    // 5. 공 매체 오브젝트화 투영
    const bp = project(ballObj.x, ballObj.y, ballObj.z);
    ctx.fillStyle = '#ffffff'; ctx.beginPath();
    ctx.arc(bp.x, bp.y, ballObj.radius * bp.scale, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5; ctx.stroke();

    // 실시간 드래그 인디케이터 라인 처리
    if (isDragging && dragPoints.length > 1) {
        ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 4; ctx.beginPath();
        ctx.moveTo(dragPoints[0].x, dragPoints[0].y);
        for(let p of dragPoints) ctx.lineTo(p.x, p.y);
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

    // 최종 최종전 승패 확정 모달 화면
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
        
        // 다시하기 버튼 마우스 바인딩 영역 지정용 임시 매핑
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

// 글로벌 키 캡처 바인딩 안전장치 (골키퍼 방향키 이동 감지용 전역 매핑)
if (!window.keys) {
    window.keys = {};
    window.addEventListener('keydown', e => window.keys[e.code] = true);
    window.addEventListener('keyup', e => window.keys[e.code] = false);
}
