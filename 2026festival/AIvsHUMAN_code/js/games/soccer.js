// ==========================================
// 2026festival/AIvsHUMAN_code/js/games/soccer.js
// ==========================================

let gameAreaRef = null;
let animationFrameId = null;

// Three.js 관련 변수
let scene, camera, renderer;
let ball, goalkeeper, goal, stadium;
let ballTrajectoryLine;

// --- 게임 상태 관리 ---
let difficulty = "normal";
let gameOver = false;
let currentRound = 1; 
let currentTurn = "HUMAN_ATTACK"; // HUMAN_ATTACK -> AI_ATTACK
let humanScore = 0;
let aiScore = 0;
let turnResultText = ""; 
let turnResultTimer = 0;

// --- 피파 스타일 슈팅 스탯 ---
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragEnd = { x: 0, y: 0 };
let shootPower = 0;

// 물리 엔진용 변수
let ballPhysics = { x: 0, y: 1, z: 15, vx: 0, vy: 0, vz: 0, isShot: false };
const GRAVITY = 9.8;
const GOAL_Z = -18;

// ---------------- ENTRY POINT ----------------
export function openSoccer(gameArea) {
    gameAreaRef = gameArea;
    
    // Three.js CDN 로드 후 메뉴 표시
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
            <h1 style="font-size: 2.5rem; font-weight: 900; font-style: italic; margin-bottom: 25px; text-shadow: 2px 2px #000;">FC AI-CHALLENGE</h1>
            <p style="color: #a0aec0; margin-bottom: 35px; font-size: 1rem; line-height: 1.5;">
                화면을 시원하게 드래그하여 감아차기 궤적을 그리세요.<br>
                수비 턴에는 방향키(<span style="color:#00ffaa">← →</span>)로 골키퍼를 직접 컨트롤합니다.
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

    // 피파 모바일 인게임 테마 레이아웃 구조화
    gameAreaRef.innerHTML = `
        <div style="position:relative; width:100%; max-width:960px; margin:0 auto; font-family:'Pretendard',sans-serif; overflow:hidden; border-radius:12px; box-shadow:0 20px 50px rgba(0,0,0,0.6);">
            <!-- TOP HUD 스코어보드 (피파 모바일 스타일 방송 그래픽) -->
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

            <!-- 하단 슛 가이드 메세지 플레이트 -->
            <div id="actionGrip" style="position:absolute; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.6); color:#fff; padding:8px 24px; border-radius:30px; font-size:0.9rem; font-weight:600; pointer-events:none; z-index:10; letter-spacing:0.5px;">
                ${currentTurn === "HUMAN_ATTACK" ? "🎯 화면을 드래그하여 감아차기 슛!" : "🧤 방향키 [←, →] 로 유저 골키퍼 조종!"}
            </div>

            <!-- 인게임 슛 파워 미터 -->
            <div id="powerMeterContainer" style="position:absolute; bottom:60px; right:40px; width:35px; height:150px; background:rgba(255,255,255,0.2); border-radius:6px; overflow:hidden; display:none; border:2px solid rgba(255,255,255,0.4); z-index:10;">
                <div id="powerMeterFill" style="width:100%; height:0%; background:linear-gradient(to top, #22c55e, #eab308, #ef4444); position:absolute; bottom:0; transition: height 0.05s;"></div>
            </div>

            <!-- 시네마틱 이펙트 오버레이 -->
            <div id="fifaOverlay" style="position:absolute; top:0; left:0; width:100%; height:100%; display:none; justify-content:center; align-items:center; background:rgba(0,0,0,0.4); z-index:5; pointer-events:none;">
                <div id="fifaOverlayText" style="font-size:5rem; font-weight:900; font-style:italic; text-shadow:0 10px 20px rgba(0,0,0,0.8);"></div>
            </div>

            <!-- 3D Viewport 웹글 캔버스 -->
            <div id="canvas3dContainer" style="width:100%; height:550px; background:#1b4314;"></div>
        </div>
    `;

    initThree3D();
    initTurn();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    loop();
}

// ---------------- 3D GRAPHICS WORLD BUILDER (THREE.JS) ----------------
function initThree3D() {
    const container = document.getElementById("canvas3dContainer");
    
    // 1. Scene & Camera Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a1c08');
    scene.fog = new THREE.FogExp2('#0a1c08', 0.015);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / 550, 0.1, 100);

    // 2. Renderer Setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, 550);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 3. 조명 (피파 야간 경기장 서치라이트 구현)
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight.position.set(0, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 4. 스타디움 그라운드 잔디 (하이브리드 하이라이팅 라인)
    const floorGeo = new THREE.PlaneGeometry(60, 80);
    const floorMat = new THREE.MeshStandardMaterial({ color: '#163511', roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 축구장 잔디 줄무늬 패턴 생성용 가이드 가짜 그리드
    for(let i=0; i<10; i++) {
        let stripeGeo = new THREE.PlaneGeometry(60, 4);
        let stripeMat = new THREE.MeshBasicMaterial({ color: '#1a3d14', transparent:true, opacity:0.3 });
        let stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(0, 0.01, -40 + i*8);
        scene.add(stripe);
    }

    // 5. 3D 피파 스타일 골대 오브젝트 구현
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

    // 6. 3D 공 축구구체 패턴 매핑 대체 화이트구체
    const ballGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2, metalness: 0.1 });
    ball = new THREE.Mesh(ballGeo, ballMat);
    ball.castShadow = true;
    scene.add(ball);

    // 7. 3D 피파 캐릭터형 키퍼 모델 박스
    const kpGroup = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.6, 0.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: '#ffea00' }); // AI 키퍼 디폴트 색상
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

    // 드래그 트래킹 점선 궤적 초기화
    const trajMat = new THREE.LineBasicMaterial({ color: '#00ffaa', linewidth: 3 });
    const trajGeo = new THREE.BufferGeometry();
    ballTrajectoryLine = new THREE.Line(trajGeo, trajMat);
    scene.add(ballTrajectoryLine);

    setupFifaControls(container);
}

// ---------------- 공수 턴 전환 비주얼 매트릭스 ----------------
function initTurn() {
    turnResultText = "";
    turnResultTimer = 0;

    // 공 위치 리셋
    ballPhysics.x = 0;
    ballPhysics.y = 0.35;
    ballPhysics.z = 15;
    ballPhysics.vx = 0;
    ballPhysics.vy = 0;
    ballPhysics.vz = 0;
    ballPhysics.curve = 0;
    ballPhysics.isShot = false;

    ball.position.set(ballPhysics.x, ballPhysics.y, ballPhysics.z);
    ballTrajectoryLine.geometry.setFromPoints([]);

    // 키퍼 위치 리셋 및 스피드 난이도 바인딩
    goalkeeper.position.set(0, 0, GOAL_Z + 0.3);
    goalkeeper.children[0].material.color.set(currentTurn === "HUMAN_ATTACK" ? '#ffea00' : '#10b981'); // AI 노랑 vs 유저 초록

    const actionPlate = document.getElementById("actionGrip");
    if(actionPlate) {
        actionPlate.innerText = currentTurn === "HUMAN_ATTACK" ? "🎯 화면을 드래그하여 감아차기 슛!" : "🧤 방향키 [←, →] 로 유저 골키퍼 조종!";
    }

    // 카메라 각도 연출 (피파 특유의 방송용 다이내믹 앵글)
    if (currentTurn === "HUMAN_ATTACK") {
        camera.position.set(0, 2.5, 20);
        camera.lookAt(0, 1.5, GOAL_Z);
    } else {
        // 수비 시점: 골키퍼 등 뒤에서 공격수 날아오는 방향 주시
        camera.position.set(0, 3, GOAL_Z - 4);
        camera.lookAt(0, 1, 15);
        
        // AI 자동 슈팅 트리거 발동
        setTimeout(executeAIShot, 1600);
    }
}

// ---------------- FIFA MOBILE DRAG & KICK MECHANICS ----------------
function setupFifaControls(container) {
    const pmContainer = document.getElementById("powerMeterContainer");
    const pmFill = document.getElementById("powerMeterFill");

    container.onmousedown = (e) => {
        if (currentTurn !== "HUMAN_ATTACK" || ballPhysics.isShot || gameOver || turnResultText) return;
        isDragging = true;
        dragStart = { x: e.offsetX, y: e.offsetY };
        if(pmContainer) pmContainer.style.display = "block";
    };

    container.onmousemove = (e) => {
        if (!isDragging) return;
        dragEnd = { x: e.offsetX, y: e.offsetY };

        // 드래그 거리 기반 피파 게이지 실시간 피드백
        let dx = dragEnd.x - dragStart.x;
        let dy = dragStart.y - dragEnd.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        shootPower = Math.min(100, (dist / 220) * 100);
        if(pmFill) pmFill.style.height = `${shootPower}%`;
    };

    container.onmouseup = (e) => {
        if (!isDragging) return;
        isDragging = false;
        if(pmContainer) pmContainer.style.display = "none";

        // 파워가 너무 약하면 슛 취소 보정
        if (shootPower < 10) return;

        // 드래그 방향 역산 -> 3D 목표 포지션 유추 알고리즘 적용
        let target3dX = ((dragEnd.x - container.clientWidth / 2) / (container.clientWidth / 2)) * 8;
        let target3dY = (1 - (dragEnd.y / 550)) * 6.5;

        if (target3dY < 0.5) target3dY = 1.5;

        // 피파 스타일 커브(휘어짐) 벡터 추출
        let curveFactor = (dragEnd.x - dragStart.x) * -0.015;

        // 공 물리 속도 변환 세팅 (도달 타임 계산)
        const duration = 0.85; // 초 단위 도달 속도 시간
        ballPhysics.isShot = true;
        ballPhysics.vz = (GOAL_Z - ballPhysics.z) / duration;
        ballPhysics.vx = (target3dX - ballPhysics.x) / duration;
        // 포물선 중력값 보정 계산
        ballPhysics.vy = (target3dY - ballPhysics.y) / duration + (0.5 * GRAVITY * duration);
        ballPhysics.curve = curveFactor;
    };
}

// ---------------- AI SHOT CORE ----------------
function executeAIShot() {
    if (currentTurn !== "AI_ATTACK" || gameOver) return;

    ballPhysics.isShot = true;
    const duration = 0.85;

    // 난이도 스탯 가중치별 구석 타게팅 정밀도 분기
    let rRangeX = difficulty === "easy" ? 3.5 : difficulty === "normal" ? 4.2 : 4.6;
    let rRangeY = difficulty === "easy" ? 2.5 : difficulty === "normal" ? 3.5 : 4.5;

    let target3dX = (Math.random() - 0.5) * rRangeX * 2;
    let target3dY = 0.8 + Math.random() * rRangeY;

    ballPhysics.vz = (GOAL_Z - ballPhysics.z) / duration;
    ballPhysics.vx = (target3dX - ballPhysics.x) / duration;
    ballPhysics.vy = (target3dY - ballPhysics.y) / duration + (0.5 * GRAVITY * duration);
    ballPhysics.curve = (Math.random() - 0.5) * 4; 
}

// ---------------- 인게임 리얼타임 루프 및 연산 ----------------
function update() {
    if (gameOver) return;

    // 1. 골키퍼 무빙 매트릭스 컨트롤 키트
    let kSpeed = difficulty === "easy" ? 0.05 : difficulty === "normal" ? 0.09 : 0.14;
    
    if (currentTurn === "AI_ATTACK") {
        // 유저 키퍼 수비 턴: 키보드로 좌우 방어 무빙 조작
        if (window.keys && window.keys['ArrowLeft']) goalkeeper.position.x -= 0.12;
        if (window.keys && window.keys['ArrowRight']) goalkeeper.position.x += 0.12;
        goalkeeper.position.x = Math.max(-4.8, Math.min(4.8, goalkeeper.position.x));
    } else {
        // AI 키퍼 공격 턴: 공의 X좌표 변화를 트래킹하여 똑똑하게 다이빙 무빙 예측 추적
        if (ballPhysics.isShot) {
            let targetGKX = ballPhysics.x * 0.85;
            goalkeeper.position.x += (targetGKX - goalkeeper.position.x) * kSpeed;
        } else {
            // 대기 시간 춤 무빙 인터벌 효과
            goalkeeper.position.x = Math.sin(Date.now() * 0.003) * 1.5;
        }
    }

    // 2. 리얼 3D 공 피지컬 시뮬레이션
    if (ballPhysics.isShot && !turnResultText) {
        const dt = 1 / 60; // 프레임 델타 타임

        // 바나나킥 감아차기 스핀량 적용
        ballPhysics.vx += ballPhysics.curve * dt * 5;
        ballPhysics.x += ballPhysics.vx * dt;
        ballPhysics.y += ballPhysics.vy * dt;
        ballPhysics.z += ballPhysics.vz * dt;
        ballPhysics.vy -= GRAVITY * dt; // 중력 낙하

        // 공 자체의 고속 회전 비주얼라이징 연출
        ball.rotation.x += 0.2;
        ball.rotation.y += 0.1;

        ball.position.set(ballPhysics.x, ballPhysics.y, ballPhysics.z);

        // 잔디 바운드 처리
        if (ballPhysics.y < 0.35) {
            ballPhysics.y = 0.35;
            ballPhysics.vy = -ballPhysics.vy * 0.35; // 튕김 감쇠
        }

        // 3. 피파 스타일 다이내믹 팔로우 카메라 시네마틱 기법
        if (currentTurn === "HUMAN_ATTACK") {
            camera.position.x += (ballPhysics.x * 0.5 - camera.position.x) * 0.05;
            camera.position.y += ((ballPhysics.y + 2) - camera.position.y) * 0.05;
            camera.lookAt(ballPhysics.x, ballPhysics.y, ballPhysics.z);
        }

        // 4. 골라인 크로싱 충돌 및 세이빙 판정 영역 연산
        if (ballPhysics.z <= GOAL_Z) {
            // 골키퍼 다이빙 캐칭 영역 범위 서치 체크
            let distToKeeper = ballPhysics.position ? ball.position.distanceTo(goalkeeper.position) : Math.abs(ballPhysics.x - goalkeeper.position.x);
            
            if (Math.abs(ballPhysics.x - goalkeeper.position.x) < 1.6 && ballPhysics.y < 2.6) {
                triggerTurnResult("GOALKEEPER SAVE");
            } 
            // 백네트 스코어 인바운드 범위 체킹
            else if (ballPhysics.x >= -4.5 && ballPhysics.x <= 4.5 && ballPhysics.y <= 4.8 && ballPhysics.y > 0.35) {
                if (currentTurn === "HUMAN_ATTACK") humanScore++;
                else aiScore++;
                triggerTurnResult("GOAL");
            } else {
                triggerTurnResult("MISS");
            }
        }
    }

    // 결과 오버레이 틱 타이머 카운팅
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
        
        // 피파 스타일의 스크린 플래시 애니메이션 효과
        overlay.style.background = "rgba(0,0,0,0.6)";
    }
}

function nextTurnEvent() {
    const overlay = document.getElementById("fifaOverlay");
    if(overlay) overlay.style.display = "none";

    if (currentTurn === "HUMAN_ATTACK") {
        currentTurn = "AI_ATTACK";
        initTurn();
    } else {
        // 조기 매치 종료 수식 연산 분기문 검사
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

// ---------------- MATCH END SUMMARY DASHBOARD ----------------
function triggerMatchFinalResult() {
    let titleMsg = "MATCH DRAW";
    let scoreColor = "#ffffff";
    if (humanScore > aiScore) { titleMsg = "👑 MATCH WINNER"; scoreColor = "#00ffaa"; }
    if (humanScore < aiScore) { titleMsg = "🤖 AI WINNER"; scoreColor = "#ef4444"; }

    gameAreaRef.innerHTML = `
        <div style="text-align:center; padding: 50px 20px; background: #020611; color: #fff; font-family: 'Pretendard', sans-serif; border-radius: 12px; min-height:450px; display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size:1.2rem; color:#a0aec0; letter-spacing:4px; font-weight:800; margin-bottom:10px;">FINAL STANDINGS</div>
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

// ---------------- 메인 게임 루프 체이너 ----------------
function loop() {
    update();
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
    if (!gameOver || turnResultText) {
        animationFrameId = requestAnimationFrame(loop);
    }
}

// ---------------- CLEANUP ----------------
export function destroy() {
    gameOver = true;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    window.__startFifaSoccer = null;
    if (renderer) {
        renderer.dispose();
    }
}

// 인게임 전용 키 글로벌 바인딩 리스너
if (!window.keys) {
    window.keys = {};
    window.addEventListener('keydown', e => window.keys[e.code] = true);
    window.addEventListener('keyup', e => window.keys[e.code] = false);
}
