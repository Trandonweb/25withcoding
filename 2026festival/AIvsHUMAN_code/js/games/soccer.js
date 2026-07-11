// ==========================================
// 2026festival/AIvsHUMAN_code/js/games/soccer.js
// ==========================================

let gameAreaRef = null;
let animationFrameId = null;

// Three.js 관련 변수
let scene, camera, renderer;
let ball, goalkeeper, goal;

// --- 게임 상태 관리 ---
let difficulty = "normal";
let gameOver = false;
let currentRound = 1; 
let currentTurn = "HUMAN_ATTACK"; 
let humanScore = 0;
let aiScore = 0;
let turnResultText = ""; 
let turnResultTimer = 0;

// --- 마우스 궤적 드로잉 시스템 변수 ---
let isDrawing = false;
let drawnPoints = []; // [{x, y, time}] 마우스가 이동한 픽셀 경로 기록
let ballPath3D = [];  // 실질적으로 공이 날아갈 3D 좌표 배열
let pathIndex = 0;    // 현재 공이 가고 있는 궤적 인덱스

// 물리 및 타겟팅 상수
const GOAL_Z = -18;
const BALL_START_Z = 15;

// ---------------- ENTRY POINT ----------------
export function openSoccer(gameArea) {
    gameAreaRef = gameArea;
    
    if (!window.THREE) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = () => showFifaMenu();
        document.head.appendChild(script);
    } else {
        showFifaMenu();
    }
}

function showFifaMenu() {
    gameAreaRef.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; background: linear-gradient(135deg, #051429 0%, #020611 100%); color: #fff; font-family: 'Pretendard', sans-serif; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
            <div style="color: #00ffaa; font-weight: 800; letter-spacing: 2px; margin-bottom: 5px;">EA SPORTS STYLE</div>
            <h1 style="font-size: 2.5rem; font-weight: 900; font-style: italic; margin-bottom: 25px; text-shadow: 2px 2px #000;">FC TRAJECTORY CHALLENGE</h1>
            <p style="color: #a0aec0; margin-bottom: 35px; font-size: 1rem; line-height: 1.5;">
                마우스를 누른 채로 <span style="color:#00ffaa; font-weight:bold;">원하는 슈팅 궤적(곡선)을 직접 그리세요!</span><br>
                그린 모양 그대로 마구와 감아차기가 구현됩니다.
            </p>
            <div style="display:flex; flex-direction:column; gap:15px; max-width:340px; margin:0 auto;">
                <button class="fifa-btn" style="background: linear-gradient(90deg, #10b981, #059669);" onclick="window.__startFifaSoccer('easy')">AMATEUR (쉬움)</button>
                <button class="fifa-btn" style="background: linear-gradient(90deg, #3b82f6, #1d4ed8);" onclick="window.__startFifaSoccer('normal')">PROFESSIONAL (보통)</button>
                <button class="fifa-btn" style="background: linear-gradient(90deg, #ef4444, #b91c1c);" onclick="window.__startFifaSoccer('hard')">WORLD CLASS (어려움)</button>
            </div>
        </div>
        <style>
            .fifa-btn {
                padding: 16px; color: #fff; font-weight: bold; border: none; border-radius: 8px; cursor: pointer;
                font-size: 1.1rem; font-style: italic; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            .fifa-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.5); }
        </style>
    `;
    window.__startFifaSoccer = startFifaGame;
}

// ---------------- START GAME ----------------
function startFifaGame(level) {
    difficulty = level;
    gameOver = false;
    currentRound = 1;
    humanScore = 0;
    aiScore = 0;
    currentTurn = "HUMAN_ATTACK";
    turnResultText = "";

    gameAreaRef.innerHTML = `
        <div style="position:relative; width:100%; max-width:960px; margin:0 auto; font-family:'Pretendard',sans-serif; overflow:hidden; border-radius:12px; box-shadow:0 20px 50px rgba(0,0,0,0.6);">
            <!-- TOP HUD 스코어보드 -->
            <div style="position:absolute; top:20px; left:50%; transform:translateX(-50%); display:flex; align-items:center; background:rgba(2, 6, 17, 0.85); color:#fff; padding:6px 20px; border-radius:4px; border-left:4px solid #00ffaa; backdrop-filter:blur(10px); z-index:10; min-width:380px; justify-content:space-between;">
                <div style="font-weight:900; font-style:italic; font-size:1.1rem; letter-spacing:1px;">FC MOBILE</div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-weight:700; color:#cbd5e1;">HUMAN</span>
                    <span style="background:#fff; color:#000; padding:2px 10px; font-weight:900; font-size:1.2rem; border-radius:2px;">${humanScore}</span>
                    <span style="color:#00ffaa; font-weight:900;">VS</span>
                    <span style="background:#fff; color:#000; padding:2px 10px; font-weight:900; font-size:1.2rem; border-radius:2px;">${aiScore}</span>
                    <span style="font-weight:700; color:#cbd5e1;">AI</span>
                </div>
                <div style="font-size:0.9rem; background:#1e293b; padding:4px 8px; border-radius:3px; font-weight:600;">RND ${currentRound}/5</div>
            </div>

            <!-- 하단 안내 메세지 -->
            <div id="actionGrip" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.7); color:#fff; padding:10px 24px; border-radius:30px; font-size:0.9rem; font-weight:600; pointer-events:none; z-index:10; letter-spacing:0.5px;">
                ${currentTurn === "HUMAN_ATTACK" ? "✍️ 공에서부터 골대 안쪽으로 궤적을 부드럽게 그리세요!" : "🧤 방향키 [←, →] 로 골키퍼 수비!"}
            </div>

            <!-- 시네마틱 이펙트 오버레이 -->
            <div id="fifaOverlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.4); z-index:5; pointer-events:none;">
                <div id="fifaOverlayText" style="font-size:5rem; font-weight:900; font-style:italic; text-shadow:0 10px 20px rgba(0,0,0,0.8);"></div>
            </div>

            <!-- 화면에 직접 궤적을 그릴 투명 2D Canvas 레이어 -->
            <canvas id="drawingCanvas" style="position:absolute; top:0; left:0; width:100%; height:550px; z-index:4; cursor:crosshair;"></canvas>

            <!-- 3D Viewport 웹글 캔버스 -->
            <div id="canvas3dContainer" style="width:100%; height:550px; background:#1b4314;"></div>
        </div>
    `;

    initThree3D();
    initTurn();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
}

// ---------------- 3D GRAPHICS WORLD BUILDER ----------------
function initThree3D() {
    const container = document.getElementById("canvas3dContainer");
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1c08');
    scene.fog = new THREE.FogExp2('#0a1c08', 0.015);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / 550, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, 550);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight('#ffffff', 0.45);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 0.85);
    dirLight.position.set(0, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // 잔디 필드
    const floorGeo = new THREE.PlaneGeometry(60, 80);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#163511', roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 잔디 스트라이프 패턴
    for(let i=0; i<10; i++) {
        let stripeGeo = new THREE.PlaneGeometry(60, 4);
        let stripeMat = new THREE.MeshBasicMaterial({ color: '#1a3d14', transparent:true, opacity:0.35 });
        let stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.01, -40 + i*8);
        scene.add(stripe);
    }

    // 3D 골대
    goal = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
    const postGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 12);
    
    const leftPost = new THREE.Mesh(postGeo, postMat); leftPost.position.set(-4.5, 2.5, GOAL_Z); goal.add(leftPost);
    const rightPost = new THREE.Mesh(postGeo, postMat); rightPost.position.set(4.5, 2.5, GOAL_Z); goal.add(rightPost);
    
    const barGeo = new THREE.CylinderGeometry(0.1, 0.1, 9, 12);
    const crossBar = new THREE.Mesh(barGeo, postMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 5, GOAL_Z);
    goal.add(crossBar);
    scene.add(goal);

    // 3D 공
    const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    scene.add(ball);

    // 3D 키퍼
    const kpGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.6, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#ffea00' });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.8;
    body.castShadow = true;
    kpGroup.add(body);
    
    const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: '#ffdbac' });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.8;
    kpGroup.add(head);

    goalkeeper = kpGroup;
    scene.add(goalkeeper);

    setupDrawingEngine();
}

// ---------------- 공수 턴 초기화 및 카메라 포지셔닝 ----------------
function initTurn() {
    turnResultText = "";
    turnResultTimer = 0;

    // 공 초기 위치 고정
    ball.position.set(0, 0.35, BALL_START_Z);
    ballPath3D = [];
    pathIndex = 0;
    isDrawing = false;

    // 키퍼 초기화
    goalkeeper.position.set(0, 0, GOAL_Z + 0.3);
    goalkeeper.children[0].material.color.set(currentTurn === "HUMAN_ATTACK" ? '#ffea00' : '#10b981');

    // 2D 그리기 캔버스 클리어
    const dCanvas = document.getElementById("drawingCanvas");
    if (dCanvas) {
        const dCtx = dCanvas.getContext("2d");
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        
        // 수비 턴에는 드로잉 레이어가 클릭을 방해하지 못하도록 처리
        dCanvas.style.pointerEvents = currentTurn === "HUMAN_ATTACK" ? "auto" : "none";
    }

    const actionPlate = document.getElementById("actionGrip");
    if(actionPlate) {
        actionPlate.innerText = currentTurn === "HUMAN_ATTACK" ? "✍️ 공에서부터 골대 안쪽으로 궤적을 부드럽게 그리세요!" : "🧤 방향키 [←, →] 로 유저 골키퍼 조종!";
    }

    // 🎥 카메라 앵글 정상화 (사람이 아래로 처박히거나 솟구치지 않는 확실한 피파 프리킥 뷰 기본값)
    if (currentTurn === "HUMAN_ATTACK") {
        camera.position.set(0, 3.2, BALL_START_Z + 4.5); // 공 살짝 뒤 상단에 안정적으로 배치
        camera.lookAt(0, 1.8, GOAL_Z);
    } else {
        camera.position.set(0, 3.5, GOAL_Z - 4.5); // 골대 뒤 스탠드 뷰
        camera.lookAt(0, 1.2, BALL_START_Z);
        setTimeout(executeAIShot, 1600);
    }
}

// ---------------- ✍️ MOUSE PATH DRAWING ENGINE (궤적 그리기 시스템) ----------------
function setupDrawingEngine() {
    const dCanvas = document.getElementById("drawingCanvas");
    if (!dCanvas) return;

    // 컨테이너 크기 동적 할당
    dCanvas.width = dCanvas.clientWidth;
    dCanvas.height = 550;
    const dCtx = dCanvas.getContext("2d");

    dCanvas.onmousedown = (e) => {
        if (currentTurn !== "HUMAN_ATTACK" || ballPath3D.length > 0 || gameOver || turnResultText) return;
        isDrawing = true;
        drawnPoints = [{ x: e.offsetX, y: e.offsetY, time: Date.now() }];
        
        dCtx.clearRect(0, 0, dCanvas.width, dCanvas.height);
        dCtx.beginPath();
        dCtx.moveTo(e.offsetX, e.offsetY);
    };

    dCanvas.onmousemove = (e) => {
        if (!isDrawing) return;
        drawnPoints.push({ x: e.offsetX, y: e.offsetY, time: Date.now() });

        // 화면상에 유저가 그리는 선 실시간 렌더링 (형광 궤적)
        dCtx.strokeStyle = '#00ffaa';
        dCtx.lineWidth = 4;
        dCtx.lineCap = 'round';
        dCtx.lineJoin = 'round';
        dCtx.shadowBlur = 10;
        dCtx.shadowColor = '#00ffaa';
        dCtx.lineTo(e.offsetX, e.offsetY);
        dCtx.stroke();
    };

    dCanvas.onmouseup = () => {
        if (!isDrawing) return;
        isDrawing = false;
        dCtx.shadowBlur = 0; // 이펙트 해제

        if (drawnPoints.length < 5) return; // 너무 짧게 그리거나 클릭만 한 것은 무시

        // ⭐ 2D 마우스 포인터 픽셀 좌표들을 -> 3D 공간 상의 완벽한 축구공 비행 궤적으로 변환
        const totalSteps = 60; // 공이 날아갈 프레임 수
        ballPath3D = [];

        for (let i = 0; i <= totalSteps; i++) {
            let ratio = i / totalSteps;
            // 궤적 배열에서 비율에 맞는 샘플 포인트 추출
            let sampleIdx = Math.min(drawnPoints.length - 1, Math.floor(ratio * (drawnPoints.length - 1)));
            let pt = drawnPoints[sampleIdx];

            // Z축은 출발지(BALL_START_Z)에서 골대(GOAL_Z)까지 등속 직선 진행
            let 3dZ = BALL_START_Z + (GOAL_Z - BALL_START_Z) * ratio;

            // X축: 화면 중심 기준 마우스 좌표 비율 계산 (-4.5m ~ +4.5m 골대 폭에 매핑)
            let 3dX = ((pt.x - dCanvas.width / 2) / (dCanvas.width / 2)) * 7.5;

            // Y축: 화면 아래쪽이 0(바닥), 위쪽으로 갈수록 공이 뜸 (0m ~ 최고 5.5m 높이 제한)
            let 3dY = ((dCanvas.height - pt.y) / dCanvas.height) * 6.5;
            if (3dY < 0.35) 3dY = 0.35; // 땅 파고 들어가지 않게 보정

            ballPath3D.push(new THREE.Vector3(3dX, 3dY, 3dZ));
        }
        
        pathIndex = 0;
    };
}

// ---------------- AI SHOT PATH GENERATOR ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballPath3D = [];
    const totalSteps = 60;

    // 난이도별 AI 궤적 종착지 타겟 설정
    let rRangeX = difficulty === "easy" ? 3.0 : difficulty === "normal" ? 4.0 : 4.6;
    let rRangeY = difficulty === "easy" ? 2.0 : difficulty === "normal" ? 3.2 : 4.2;

    let finalX = (Math.random() - 0.5) * rRangeX * 2;
    let finalY = 0.8 + Math.random() * rRangeY;
    
    // AI의 스핀 감아차기 중간 굴곡점 설정
    let curveX = (Math.random() - 0.5) * 4;

    for (let i = 0; i <= totalSteps; i++) {
        let t = i / totalSteps;
        let 3dZ = BALL_START_Z + (GOAL_Z - BALL_START_Z) * t;
        
        // 2차 베지에 곡선 형태를 응용해 휘어지는 인공지능 슛 연산
        let 3dX = (1 - t) * (1 - t) * 0 + 2 * (1 - t) * t * curveX + t * t * finalX;
        // 위로 솟구쳤다 떨어지는 포물선 Y축 계산
        let 3dY = 0.35 + (finalY - 0.35) * t + Math.sin(t * Math.PI) * 2.5;

        ballPath3D.push(new THREE.Vector3(3dX, 3dY, 3dZ));
    }
    pathIndex = 0;
}

// ---------------- 리얼타임 비주얼 & 판정 루프 ----------------
function update() {
    if (gameOver) return;

    // 1. 골키퍼 방어 알고리즘
    let kSpeed = difficulty === "easy" ? 0.05 : difficulty === "normal" ? 0.09 : 0.14;
    
    if (currentTurn === "AI_ATTACK") {
        if (window.keys && window.keys['ArrowLeft']) goalkeeper.position.x -= 0.12;
        if (window.keys && window.keys['ArrowRight']) goalkeeper.position.x += 0.12;
        goalkeeper.position.x = Math.max(-4.8, Math.min(4.8, goalkeeper.position.x));
    } else {
        // AI 키퍼가 유저가 그린 공의 실시간 X위치를 완벽하게 추적
        if (ballPath3D.length > 0 && pathIndex < ballPath3D.length) {
            let currentBallPos = ballPath3D[pathIndex];
            let targetGKX = currentBallPos.x * 0.88;
            goalkeeper.position.x += (targetGKX - goalkeeper.position.x) * kSpeed;
        } else {
            goalkeeper.position.x = Math.sin(Date.now() * 0.003) * 1.5;
        }
    }

    // 2. 공 궤적 드라이빙 및 카메라 워킹
    if (ballPath3D.length > 0 && pathIndex < ballPath3D.length && !turnResultText) {
        let nextPos = ballPath3D[pathIndex];
        ball.position.copy(nextPos);
        
        ball.rotation.x += 0.25;
        ball.rotation.y += 0.15;

        // 🎥 [카메라 솟구침 해결 핵심] 
        // 카메라 고도(Y축)를 공을 따라 아래로 처박지 않고, 고정된 높이(3.2)를 부드럽게 유지하면서 공의 X축 진행만 자연스럽게 추적합니다.
        if (currentTurn === "HUMAN_ATTACK") {
            camera.position.x += (ball.position.x * 0.4 - camera.position.x) * 0.08;
            camera.position.z += ((ball.position.z + 5.0) - camera.position.z) * 0.05; // 안정적으로 뒤에서 전진 추적
            camera.lookAt(ball.position.x, 1.5, GOAL_Z); // 시선은 골대 중심의 일정한 높이를 안정적으로 지향
        }

        pathIndex++;

        // 3. 골라인 교차 골 판정 체킹
        if (pathIndex >= ballPath3D.length || ball.position.z <= GOAL_Z) {
            if (Math.abs(ball.position.x - goalkeeper.position.x) < 1.6 && ball.position.y < 2.8) {
                triggerTurnResult("GOALKEEPER SAVE");
            } 
            else if (ball.position.x >= -4.5 && ball.position.x <= 4.5 && ball.position.y <= 4.8 && ball.position.y > 0.35) {
                if (currentTurn === "HUMAN_ATTACK") humanScore++;
                else aiScore++;
                triggerTurnResult("GOAL");
            } else {
                triggerTurnResult("MISS");
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

function triggerTurnResult(result) {
    turnResultText = result;
    const overlay = document.getElementById("fifaOverlay");
    const overlayText = document.getElementById("fifaOverlayText");
    
    if(overlay && overlayText) {
        overlay.style.display = "flex";
        overlayText.innerText = result;
        overlayText.style.color = result === "GOAL" ? "#00ffaa" : "#ef4444";
    }
}

function nextTurnEvent() {
    const overlay = document.getElementById("fifaOverlay");
    if(overlay) overlay.style.display = "none";

    if (currentTurn === "HUMAN_ATTACK") {
        currentTurn = "AI_ATTACK";
        initTurn();
    } else {
        let remHuman = 5 - currentRound;
        let remAi = 5 - currentRound;

        if (humanScore + remHuman < aiScore || aiScore + remAi < humanScore || currentRound >= 5) {
            gameOver = true;
            triggerMatchFinalResult();
        } else {
            currentRound++;
            currentTurn = "HUMAN_ATTACK";
            initTurn();
        }
    }
}

function triggerMatchFinalResult() {
    let titleMsg = "MATCH DRAW";
    let scoreColor = "#ffffff";
    if (humanScore > aiScore) { titleMsg = "👑 MATCH WINNER"; scoreColor = "#00ffaa"; }
    if (humanScore < aiScore) { titleMsg = "🤖 AI WINNER"; scoreColor = "#ef4444"; }

    gameAreaRef.innerHTML = `
        <div style="text-align:center; padding: 50px 20px; background: #020611; color: #fff; font-family: 'Pretendard', sans-serif; border-radius: 12px; min-height:450px; display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size:0.9rem; color:#a0aec0; letter-spacing:4px; font-weight:800; margin-bottom:10px;">FINAL STANDINGS</div>
            <h1 style="font-size: 3.2rem; font-weight: 900; font-style:italic; margin: 0 0 30px 0; color:${scoreColor}; text-shadow:0 4px 20px rgba(0,0,0,0.5);">${titleMsg}</h1>
            
            <div style="display:inline-flex; align-items:center; justify-content:center; gap:30px; background:rgba(255,255,255,0.05); padding:20px 40px; border-radius:8px; margin:0 auto 40px auto; border:1px solid rgba(255,255,255,0.1);">
                <div style="text-align:center;"><div style="font-size:0.9rem; color:#cbd5e1; margin-bottom:5px;">HUMAN</div><div style="font-size:2.5rem; font-weight:900;">${humanScore}</div></div>
                <div style="font-size:2rem; font-weight:900; color:#475569;">:</div>
                <div style="text-align:center;"><div style="font-size:0.9rem; color:#cbd5e1; margin-bottom:5px;">AI</div><div style="font-size:2.5rem; font-weight:900;">${aiScore}</div></div>
            </div>

            <div>
                <button id="rematchBtn" style="background:linear-gradient(90deg, #00ffaa, #00b377); color:#000; padding:16px 40px; font-weight:900; font-size:1.2rem; border:none; border-radius:6px; cursor:pointer; font-style:italic; box-shadow:0 6px 20px rgba(0,255,170,0.3); transition:all 0.2s;">
                    REMATCH (다시 경기하기)
                </button>
            </div>
        </div>
    `;

    document.getElementById("rematchBtn").onclick = () => {
        showFifaMenu();
    };
}

function loop() {
    update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    if (!gameOver || turnResultText) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

export function destroy() {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.__startFifaSoccer = null;
    if (renderer) renderer.dispose();
}

if (!window.keys) {
    window.keys = {};
    window.addEventListener('keydown', e => window.keys[e.code] = true);
    window.addEventListener('keyup', e => window.keys[e.code] = false);
}
