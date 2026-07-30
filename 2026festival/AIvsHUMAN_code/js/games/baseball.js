// baseball.js
// ⚾ AI 투수 챌린지 (Baseball) - High-Resolution Pixel/Dot Batter & Bat Enhanced Version

let gameAreaRef = null;
let canvasRef = null;
let ctxRef = null;
let animationFrameId = null;

let baseball = {
    difficulty: null,
    score: 0,
    pitchCount: 0,
    maxPitches: 10,
    gameOver: false,
    selectedPitches: [],
    currentPitch: null,
    gameMode: 'DIFFICULTY',
    consecutiveHits: 0,
    playerHistory: {
        total: 0,
        hits: 0,
        pitchStats: {}
    },
    swingAnim: 0
};

const baseballLevels = {
    easy: { name: '쉬움', speedMul: 0.5, aiAdapt: 0.2 },
    normal: { name: '보통', speedMul: 0.7, aiAdapt: 0.5 },
    hard: { name: '어려움', speedMul: 0.95, aiAdapt: 0.8 }
};

const allPitchTypes = [
    { id: 'four-seam', name: '포심 패스트볼', speed: 11.0, hBreak: 0, vBreak: 0, type: 'fast', desc: '직선으로 꽂히는 최고 구속의 직구' },
    { id: 'two-seam', name: '투심 패스트볼', speed: 10.0, hBreak: 1.2, vBreak: 1.5, type: 'fast', desc: '홈판 앞에서 살짝 가라앉는 공' },
    { id: 'cutter', name: '커터', speed: 10.5, hBreak: -3.5, vBreak: 0.8, type: 'fast', desc: '마지막 순간 날카롭게 바깥쪽으로 꺾이는 공' },
    { id: 'curve', name: '커브', speed: 5.0, hBreak: 1.5, vBreak: 8.5, type: 'breaking', desc: '느린 속도로 커다란 포물선을 그리며 떨어지는 공' },
    { id: 'fork', name: '포크볼', speed: 6.5, hBreak: 0, vBreak: 10.0, type: 'breaking', desc: '직선으로 오다가 홈판 직전에 뚝 떨어지는 공' },
    { id: 'slider', name: '슬라이더', speed: 7.5, hBreak: 6.5, type: 'breaking', desc: '옆으로 크게 꺾여 나가는 변화구' }
];

let handleKeyDownRef = null;

export function openBaseball(gameArea) {
    gameAreaRef = gameArea;
    showDifficultyScreen();
}

export function destroy() {
    stopAnimation();
    removeEventListeners();
}

function showDifficultyScreen() {
    baseball.gameMode = 'DIFFICULTY';
    stopAnimation();
    removeEventListeners();

    gameAreaRef.innerHTML = `
    <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        min-height: 500px;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
    ">
        <div style="
            background: #1e1e1e;
            border: 2px solid #1ea857;
            border-radius: 16px;
            padding: 30px;
            width: 100%;
            max-width: 440px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(30, 168, 87, 0.2);
        ">
            <h2 style="color: #1ea857; margin-bottom: 10px; font-size: 1.8rem;">⚾ AI 투수 챌린지</h2>
            <p style="color: #b0b0b0; margin-bottom: 20px; font-size: 0.95rem;">정교해진 타자와 함께 타이밍을 맞춰 타격하세요!</p>
            
            <h3 style="margin-bottom: 12px; font-size: 1.05rem;">난이도 선택</h3>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="game-btn" data-level="easy" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 12px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                ">쉬움 (Easy)</button>
                <button class="game-btn" data-level="normal" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 12px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                ">보통 (Normal)</button>
                <button class="game-btn" data-level="hard" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 12px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                ">어려움 (Hard)</button>
            </div>
        </div>
    </div>
    `;

    const buttons = gameAreaRef.querySelectorAll('.game-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseover', () => { btn.style.background = '#1ea857'; btn.style.borderColor = '#1ea857'; });
        btn.addEventListener('mouseout', () => { btn.style.background = '#2d2d2d'; btn.style.borderColor = '#444'; });
        btn.addEventListener('click', () => startGame(btn.getAttribute('data-level')));
    });
}

function startGame(level) {
    baseball.difficulty = level;
    baseball.score = 0;
    baseball.pitchCount = 0;
    baseball.consecutiveHits = 0;
    baseball.gameOver = false;
    baseball.playerHistory = { total: 0, hits: 0, pitchStats: {} };

    const shuffled = [...allPitchTypes].sort(() => 0.5 - Math.random());
    baseball.selectedPitches = shuffled.slice(0, 3);
    baseball.selectedPitches.forEach(p => {
        baseball.playerHistory.pitchStats[p.id] = { total: 0, success: 0 };
    });

    renderGameScreen();
    startAIPondering();
}

function renderGameScreen() {
    stopAnimation();
    removeEventListeners();

    const lv = baseballLevels[baseball.difficulty];

    gameAreaRef.innerHTML = `
    <div style="
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-sizing: border-box;
        overflow: hidden;
    ">
        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1e1e1e;
            padding: 10px 15px;
            border-bottom: 2px solid #1ea857;
            flex-shrink: 0;
        ">
            <div>
                <span style="font-size: 0.85rem; color: #888;">난이도:</span> 
                <strong style="color: #1ea857; font-size: 0.95rem;">${lv.name}</strong>
            </div>
            <div>
                <span style="font-size: 0.85rem; color: #888;">투구:</span> 
                <strong id="pitch-counter" style="font-size: 0.95rem;">${baseball.pitchCount}</strong><span style="font-size: 0.85rem; color: #888;">/${baseball.maxPitches}</span>
            </div>
            <div>
                <span style="font-size: 0.85rem; color: #888;">점수:</span> 
                <strong id="score-display" style="color: #1ea857; font-size: 1.1rem;">${baseball.score}</strong>점
                <span id="combo-display" style="font-size: 0.8rem; color: #ffeb3b; margin-left: 4px;"></span>
            </div>
        </div>

        <div style="
            background: #181818;
            padding: 8px 12px;
            display: flex;
            justify-content: center;
            gap: 12px;
            font-size: 0.85rem;
            border-bottom: 1px solid #2a2a2a;
            flex-shrink: 0;
            flex-wrap: wrap;
        ">
            <span style="color: #888;">오늘의 구종:</span>
            ${baseball.selectedPitches.map(p => `<span style="color: #a0e8af;">✅ ${p.name}</span>`).join('')}
        </div>

        <div style="
            flex: 1;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            background: radial-gradient(circle at center, #1a3c27 0%, #0d1a12 100%);
            overflow: hidden;
            cursor: pointer;
            min-height: 350px;
        " id="canvas-container">
            <canvas id="baseballCanvas" style="display: block; width: 100%; height: 100%;"></canvas>
            
            <div id="status-overlay" style="
                position: absolute;
                top: 10%;
                font-size: 1.5rem;
                font-weight: 900;
                text-align: center;
                text-shadow: 0 4px 12px rgba(0,0,0,0.8);
                pointer-events: none;
                transition: opacity 0.3s;
                opacity: 0;
                padding: 0 15px;
                box-sizing: border-box;
                width: 100%;
            "></div>
        </div>

        <div style="
            background: #181818;
            padding: 12px 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            border-top: 1px solid #2a2a2a;
            flex-shrink: 0;
        ">
            <div style="font-size: 0.85rem; color: #aaa;">
                마우스 클릭 또는 [SPACE]로 스윙!
            </div>
            <button id="swing-btn" style="
                background: #1ea857;
                color: white;
                border: none;
                padding: 10px 35px;
                border-radius: 25px;
                font-size: 1rem;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(30,168,87,0.4);
                width: 100%;
                max-width: 250px;
            ">🏏 스윙!</button>
        </div>
    </div>
    `;

    canvasRef = document.getElementById('baseballCanvas');
    ctxRef = canvasRef.getContext('2d');
    resizeCanvas();

    const swingBtn = document.getElementById('swing-btn');
    const canvasContainer = document.getElementById('canvas-container');

    const triggerSwingAction = (e) => { if (e) e.preventDefault(); executeSwing(); };

    swingBtn.addEventListener('click', triggerSwingAction);
    canvasContainer.addEventListener('click', triggerSwingAction);

    handleKeyDownRef = (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            executeSwing();
        }
    };
    window.addEventListener('keydown', handleKeyDownRef);
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvasRef) return;
    const parent = canvasRef.parentElement;
    canvasRef.width = parent.clientWidth;
    canvasRef.height = parent.clientHeight;
}

function removeEventListeners() {
    if (handleKeyDownRef) {
        window.removeEventListener('keydown', handleKeyDownRef);
        handleKeyDownRef = null;
    }
    window.removeEventListener('resize', resizeCanvas);
}

function selectNextPitch() {
    const lv = baseballLevels[baseball.difficulty];
    const pitches = baseball.selectedPitches;

    if (Math.random() < lv.aiAdapt && baseball.playerHistory.total > 2) {
        let weakestPitch = pitches[0];
        let lowestRate = 1.1;

        pitches.forEach(p => {
            const stat = baseball.playerHistory.pitchStats[p.id];
            const rate = stat.total > 0 ? (stat.success / stat.total) : 0.5;
            if (rate < lowestRate) {
                lowestRate = rate;
                weakestPitch = p;
            }
        });

        if (Math.random() < 0.3) {
            const otherPitches = pitches.filter(p => p.id !== weakestPitch.id);
            if (otherPitches.length > 0) return otherPitches[Math.floor(Math.random() * otherPitches.length)];
        }
        return weakestPitch;
    }
    return pitches[Math.floor(Math.random() * pitches.length)];
}

function startAIPondering() {
    if (baseball.pitchCount >= baseball.maxPitches) {
        endGame();
        return;
    }

    baseball.pitchCount++;
    updateUIStats();
    baseball.gameMode = 'THINKING';

    const chosenPitch = selectNextPitch();
    baseball.currentPitch = {
        pitchObj: chosenPitch,
        progress: 0,
        active: false,
        swingResulted: false,
        hitResult: null,
        hitProgress: 0
    };

    showStatusOverlay("🤖 AI 투수가 구종을 고민 중...", "#1ea857");

    setTimeout(() => { runCountdown(3); }, 1000);
}

function runCountdown(count) {
    if (count > 0) {
        showStatusOverlay(`투구 준비: ${count}`, "#ffeb3b");
        setTimeout(() => runCountdown(count - 1), 800);
    } else {
        showStatusOverlay("투구 시작! ⚾", "#ff5252");
        setTimeout(() => {
            hideStatusOverlay();
            startPitchAnimation();
        }, 500);
    }
}

function startPitchAnimation() {
    baseball.gameMode = 'PITCHING';
    const p = baseball.currentPitch;
    const lv = baseballLevels[baseball.difficulty];

    p.active = true;
    p.progress = 0; 
    p.speed = (p.pitchObj.speed * 0.0035) * lv.speedMul;

    const render = () => {
        if (!ctxRef || !canvasRef || !p.active) return;

        ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

        const w = canvasRef.width;
        const h = canvasRef.height;

        // 1. 구장 배경 및 홈플레이트 / 스트라이크 존 렌더링
        drawFieldAndStrikeZone(w, h);

        // 2. 고해상도 점 단위 타자 및 다단계 회전 배트 렌더링
        drawHighResBatterAndBat(w, h);

        if (baseball.swingAnim > 0) {
            baseball.swingAnim -= 0.12;
            if (baseball.swingAnim < 0) baseball.swingAnim = 0;
        }

        // 3. 타구 처리 혹은 투구 진행 처리
        if (p.hitResult) {
            p.hitProgress += 0.04;
            drawBattedBall(w, h, p);
            if (p.hitProgress > 1.2) return;
            animationFrameId = requestAnimationFrame(render);
            return;
        }

        p.progress += p.speed;

        if (p.progress > 1.2) {
            if (!p.swingResulted) processHitResult('miss', true);
            return;
        }

        const startX = w / 2;
        const startY = h * 0.22;
        const targetX = w / 2;
        const targetY = h * 0.70;

        const hOffset = p.pitchObj.hBreak * Math.sin(p.progress * Math.PI) * 45;
        let vDropFactor = Math.pow(p.progress, 2);
        if (p.pitchObj.id === 'fork' || p.pitchObj.id === 'curve') {
            vDropFactor = p.progress > 0.55 ? Math.pow(p.progress, 4.5) * 1.5 : Math.pow(p.progress, 2);
        }
        const vOffset = p.pitchObj.vBreak * vDropFactor * 55;

        const currentX = startX + (targetX - startX) * p.progress + hOffset;
        const currentY = startY + (targetY - startY) * p.progress + vOffset;

        p.x = currentX;
        p.y = currentY;

        const radius = 6 + (Math.pow(p.progress, 1.5) * 26);

        // 공 그림자
        ctxRef.beginPath();
        ctxRef.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctxRef.ellipse(currentX, currentY + radius + 3, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
        ctxRef.fill();

        // 공 본체 (실밥 디테일 포함)
        ctxRef.beginPath();
        ctxRef.arc(currentX, currentY, radius, 0, Math.PI * 2);
        ctxRef.fillStyle = '#f8f9fa';
        ctxRef.fill();
        ctxRef.lineWidth = 2;
        ctxRef.strokeStyle = '#e63946';
        ctxRef.stroke();

        // 공 실밥 점(Dot) 표현
        if (radius > 10) {
            ctxRef.fillStyle = '#e63946';
            ctxRef.fillRect(currentX - radius * 0.4, currentY - 2, 2, 4);
            ctxRef.fillRect(currentX + radius * 0.4 - 2, currentY - 2, 2, 4);
        }

        animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
}

function stopAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

function drawFieldAndStrikeZone(w, h) {
    ctxRef.save();
    
    // 홈플레이트 시각화 (하단 오각형)
    ctxRef.beginPath();
    ctxRef.fillStyle = '#e5e5e5';
    ctxRef.moveTo(w / 2 - 25, h * 0.75);
    ctxRef.lineTo(w / 2 + 25, h * 0.75);
    ctxRef.lineTo(w / 2 + 35, h * 0.79);
    ctxRef.lineTo(w / 2, h * 0.83);
    ctxRef.lineTo(w / 2 - 35, h * 0.79);
    ctxRef.closePath();
    ctxRef.fill();
    ctxRef.strokeStyle = '#b0b0b0';
    ctxRef.lineWidth = 2;
    ctxRef.stroke();

    // 스트라이크 존 렉탱글
    ctxRef.fillStyle = 'rgba(30, 168, 87, 0.12)';
    ctxRef.fillRect(w / 2 - 75, h * 0.52, 150, 140);

    ctxRef.beginPath();
    ctxRef.strokeStyle = 'rgba(30, 168, 87, 0.85)';
    ctxRef.lineWidth = 3;
    ctxRef.setLineDash([8, 6]);
    ctxRef.strokeRect(w / 2 - 75, h * 0.52, 150, 140);
    ctxRef.setLineDash([]);
    
    ctxRef.restore();
}

// 🌟 고해상도 및 정교한 타자/배트 드로잉 (점 단위 구성)
function drawHighResBatterAndBat(w, h) {
    ctxRef.save();

    const bx = w / 2 + 85;
    const by = h * 0.50;

    // 1. 타자 헬멧 (곡선 및 광택 점 처리)
    ctxRef.fillStyle = '#1b263b';
    ctxRef.beginPath();
    ctxRef.arc(bx, by - 55, 24, Math.PI, Math.PI * 2);
    ctxRef.fill();
    ctxRef.fillRect(bx - 24, by - 55, 36, 12);
    // 헬멧 챙
    ctxRef.fillStyle = '#415a77';
    ctxRef.fillRect(bx - 10, by - 48, 28, 4);

    // 2. 타자 상체 (유니폼 및 보호대 세부 묘사)
    ctxRef.fillStyle = '#f8f9fa';
    ctxRef.beginPath();
    ctxRef.roundRect(bx - 22, by - 35, 48, 80, 8);
    ctx.fill();

    // 유니폼 팀 스트라이프 선 (Dot/Line 렌더링)
    ctxRef.strokeStyle = '#e63946';
    ctxRef.lineWidth = 3;
    ctxRef.beginPath();
    ctxRef.moveTo(bx - 5, by - 35); ctxRef.lineTo(bx - 5, by + 45);
    ctxRef.moveTo(bx + 15, by - 35); ctxRef.lineTo(bx + 15, by + 45);
    ctxRef.stroke();

    // 타자 팔 및 장갑 낀 손
    ctxRef.fillStyle = '#e0a96d';
    ctxRef.fillRect(bx - 32, by - 25, 14, 45); // 앞팔
    ctxRef.fillStyle = '#ffffff'; // 배팅 장갑
    ctxRef.fillRect(bx - 35, by + 10, 16, 16);

    // 3. 배트 회전 및 고해상도 입체 렌더링
    ctxRef.save();
    ctxRef.translate(bx - 25, by + 18);

    let swingAngle = -0.5; // 대기 상태 앵글
    if (baseball.swingAnim > 0) {
        // 스윙 시 휘두르는 궤적 계산 (-2.6 라디안까지 급격한 회전)
        swingAngle = -2.6 + (1 - baseball.swingAnim) * 3.0;
    }
    ctxRef.rotate(swingAngle);

    // 나무 배트 본체 그라데이션 및 디테일
    const batGrad = ctxRef.createLinearGradient(-6, -130, 6, 10);
    batGrad.addColorStop(0, '#d4a373');
    batGrad.addColorStop(0.5, '#bc6c25');
    batGrad.addColorStop(1, '#7f4f24');

    ctxRef.fillStyle = batGrad;
    ctxRef.beginPath();
    ctxRef.roundRect(-5, -130, 10, 140, 4);
    ctxRef.fill();

    // 배트 손잡이 힙 테이프 (그립 텍스처 점선 표현)
    ctxRef.fillStyle = '#ffffff';
    for (let i = 20; i < 50; i += 6) {
        ctxRef.fillRect(-5.5, i, 11, 2);
    }

    ctxRef.restore();
    ctxRef.restore();
}

function drawBattedBall(w, h, p) {
    const startX = w / 2;
    const startY = h * 0.70;
    const endX = w / 2 + (p.hitResult === 'homerun' ? 0 : (Math.random() - 0.5) * 320);
    const endY = h * 0.08;

    const curX = startX + (endX - startX) * p.hitProgress;
    const curY = startY + (endY - startY) * p.hitProgress;
    const radius = Math.max(3, 16 * (1 - p.hitProgress * 0.4));

    ctxRef.beginPath();
    ctxRef.arc(curX, curY, radius, 0, Math.PI * 2);
    ctxRef.fillStyle = '#ffffff';
    ctxRef.fill();
    ctxRef.lineWidth = 2;
    ctxRef.strokeStyle = '#e63946';
    ctxRef.stroke();
}

function executeSwing() {
    if (!baseball.currentPitch || !baseball.currentPitch.active || baseball.currentPitch.swingResulted) return;

    let p = baseball.currentPitch;
    p.swingResulted = true;
    baseball.swingAnim = 1.0;

    const timing = p.progress;
    const pitchObj = p.pitchObj;

    let result = 'miss';

    if (timing >= 0.88 && timing <= 1.05) {
        result = pitchObj.type === 'fast' 
            ? (Math.random() < 0.62 ? 'homerun' : 'hit') 
            : (Math.random() < 0.48 ? 'homerun' : 'hit');
    } else if (timing >= 0.80 && timing < 0.88) {
        result = Math.random() < 0.58 ? 'foul' : 'hit';
    } else if (timing > 1.05 && timing <= 1.12) {
        result = Math.random() < 0.65 ? 'foul' : 'miss';
    } else {
        result = 'miss';
    }

    if (result === 'hit' || result === 'homerun') {
        p.hitResult = result;
        p.hitProgress = 0;
    }

    processHitResult(result, false);
}

function processHitResult(result, isTimeout) {
    if (!baseball.currentPitch) return;
    
    if (!baseball.currentPitch.hitResult) {
        baseball.currentPitch.active = false;
        stopAnimation();
    }

    const pitchObj = baseball.currentPitch.pitchObj;
    const pitchId = pitchObj.id;
    baseball.playerHistory.total++;
    baseball.playerHistory.pitchStats[pitchId].total++;

    let points = 0;
    let text = '';
    let color = '#fff';

    if (result === 'homerun') {
        baseball.consecutiveHits++;
        let bonus = (baseball.consecutiveHits >= 2) ? (baseball.consecutiveHits - 1) * 20 : 0;
        points = 50 + bonus;
        text = `🔥 HOME RUN!! (+50${bonus > 0 ? ` +콤보${bonus}` : ''})`;
        color = '#ff5252';
        baseball.score += points;
        baseball.playerHistory.hits++;
        baseball.playerHistory.pitchStats[pitchId].success++;
    } else if (result === 'hit') {
        baseball.consecutiveHits++;
        let bonus = (baseball.consecutiveHits >= 2) ? (baseball.consecutiveHits - 1) * 10 : 0;
        points = 20 + bonus;
        text = `⚾ 안타! (+20${bonus > 0 ? ` +콤보${bonus}` : ''})`;
        color = '#4caf50';
        baseball.score += points;
        baseball.playerHistory.hits++;
        baseball.playerHistory.pitchStats[pitchId].success++;
    } else if (result === 'foul') {
        baseball.consecutiveHits = 0;
        points = 5;
        text = '⚠️ 파울 (+5점)';
        color = '#ffeb3b';
        baseball.score += points;
    } else {
        baseball.consecutiveHits = 0;
        points = 0;
        text = isTimeout ? '❌ 루킹 스트라이크!' : '❌ 헛스윙!';
        color = '#9e9e9e';
    }

    showStatusOverlay(text, color);
    updateUIStats();

    setTimeout(() => {
        if (baseball.gameOver) return;
        showStatusOverlay(`이번 구종: [${pitchObj.name}]\n${pitchObj.desc}`, "#00e5ff");
        
        setTimeout(() => {
            if (!baseball.gameOver) startAIPondering();
        }, 1800);
    }, 1000);
}

function showStatusOverlay(text, color) {
    const overlay = document.getElementById('status-overlay');
    if (!overlay) return;
    overlay.innerHTML = text.replace(/\n/g, '<br>');
    overlay.style.color = color;
    overlay.style.opacity = '1';
}

function hideStatusOverlay() {
    const overlay = document.getElementById('status-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
}

function updateUIStats() {
    const scoreEl = document.getElementById('score-display');
    const counterEl = document.getElementById('pitch-counter');
    const comboEl = document.getElementById('combo-display');

    if (scoreEl) scoreEl.innerText = baseball.score;
    if (counterEl) counterEl.innerText = baseball.pitchCount;
    if (comboEl) {
        comboEl.innerText = baseball.consecutiveHits >= 2 ? `🔥 ${baseball.consecutiveHits}콤보!` : '';
    }
}

function endGame() {
    baseball.gameOver = true;
    stopAnimation();
    removeEventListeners();

    const successRate = baseball.playerHistory.total > 0 
        ? Math.round((baseball.playerHistory.hits / baseball.maxPitches) * 100) 
        : 0;

    gameAreaRef.innerHTML = `
    <div style="
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        height: 100%;
        min-height: 500px;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
    ">
        <div style="
            background: #1e1e1e;
            border: 2px solid #1ea857;
            border-radius: 16px;
            padding: 30px 25px;
            width: 100%;
            max-width: 440px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(30, 168, 87, 0.2);
        ">
            <h2 style="color: #ff5252; margin-bottom: 6px; font-size: 1.8rem;">GAME OVER</h2>
            <p style="color: #888; margin-bottom: 18px; font-size: 0.95rem;">최고의 타격 실력을 증명했습니다!</p>
            
            <div style="
                background: #252525;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 20px;
            ">
                <div style="font-size: 0.85rem; color: #aaa; margin-bottom: 4px;">HUMAN FINAL SCORE</div>
                <div style="font-size: 2.5rem; font-weight: 900; color: #1ea857;">${baseball.score} 점</div>
                <div style="font-size: 0.85rem; color: #888; margin-top: 6px;">
                    타격 성공률: ${successRate}% (${baseball.playerHistory.hits}/${baseball.maxPitches})
                </div>
            </div>

            <button id="restart-btn" style="
                background: #1ea857;
                color: white;
                border: none;
                padding: 12px;
                width: 100%;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: bold;
                cursor: pointer;
            ">다시 하기</button>
        </div>
    </div>
    `;

    document.getElementById('restart-btn').addEventListener('click', () => {
        showDifficultyScreen();
    });
}
