// baseball.js
// ⚾ AI 투수 챌린지 (Baseball) - ES Module (Layout Fixed Version)

let gameAreaRef = null;
let canvasRef = null;
let ctxRef = null;
let animationFrameId = null;

// 게임 상태 관리 객체
let baseball = {
    difficulty: null,
    score: 0,
    pitchCount: 0,
    maxPitches: 10,
    gameOver: false,
    selectedPitches: [], // 오늘 선택된 3개의 구종
    currentPitch: null,  // 현재 날아오는 공 객체
    gameMode: 'DIFFICULTY', 
    consecutiveHits: 0,  
    playerHistory: {
        total: 0,
        hits: 0,
        pitchStats: {} 
    },
    lastResultText: '',
    lastResultColor: '#ffffff',
    lastPitchInfo: null 
};

// 난이도 설정
const baseballLevels = {
    easy: { name: '쉬움', speedMul: 0.7, aiAdapt: 0.2 },
    normal: { name: '보통', speedMul: 0.95, aiAdapt: 0.5 },
    hard: { name: '어려움', speedMul: 1.2, aiAdapt: 0.8 }
};

// 6개의 구종 정의 및 특성 설정
const allPitchTypes = [
    { id: 'four-seam', name: '포심 패스트볼', speed: 15.5, hBreak: 0, vBreak: 0, type: 'fast', desc: '직선으로 꽂히는 최고 구속의 직구' },
    { id: 'two-seam', name: '투심 패스트볼', speed: 14.0, hBreak: 1.2, vBreak: 1.5, type: 'fast', desc: '홈판 앞에서 살짝 가라앉는 공' },
    { id: 'cutter', name: '커터', speed: 14.5, hBreak: -3.5, vBreak: 0.8, type: 'fast', desc: '마지막 순간 날카롭게 바깥쪽으로 꺾이는 공' },
    { id: 'curve', name: '커브', speed: 6.5, hBreak: 1.5, vBreak: 8.5, type: 'breaking', desc: '느린 속도로 커다란 포물선을 그리며 떨어지는 공' },
    { id: 'fork', name: '포크볼', speed: 8.5, hBreak: 0, vBreak: 10.0, type: 'breaking', desc: '직선으로 오다가 홈판 직전에 뚝 떨어지는 공' },
    { id: 'slider', name: '슬라이더', speed: 10.0, hBreak: 6.5, type: 'breaking', desc: '옆으로 크게 꺾여 나가는 변화구' }
];

let handleKeyDownRef = null;

// =====================
// ENTRY
// =====================
export function openBaseball(gameArea) {
    gameAreaRef = gameArea;
    showDifficultyScreen();
}

export function destroy() {
    stopAnimation();
    removeEventListeners();
}

// =====================
// UI: 난이도 선택 화면
// =====================
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
        min-height: 100%;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 15px;
        box-sizing: border-box;
        overflow-y: auto;
    ">
        <div style="
            background: #1e1e1e;
            border: 2px solid #1ea857;
            border-radius: 16px;
            padding: 25px;
            width: 100%;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(30, 168, 87, 0.2);
        ">
            <h2 style="color: #1ea857; margin-bottom: 8px; font-size: 1.8rem;">⚾ AI 투수 챌린지</h2>
            <p style="color: #b0b0b0; margin-bottom: 20px; font-size: 0.9rem;">카메라 줌인 시점과 역대급 구종 차이를 극복하라!</p>
            
            <h3 style="margin-bottom: 12px; font-size: 1rem;">난이도 선택</h3>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="game-btn" data-level="easy" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 12px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                    transition: all 0.2s;
                ">쉬움 (Easy)</button>
                <button class="game-btn" data-level="normal" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 12px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                    transition: all 0.2s;
                ">보통 (Normal)</button>
                <button class="game-btn" data-level="hard" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 12px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                    transition: all 0.2s;
                ">어려움 (Hard)</button>
            </div>
        </div>
    </div>
    `;

    const buttons = gameAreaRef.querySelectorAll('.game-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseover', () => {
            btn.style.background = '#1ea857';
            btn.style.borderColor = '#1ea857';
        });
        btn.addEventListener('mouseout', () => {
            btn.style.background = '#2d2d2d';
            btn.style.borderColor = '#444';
        });
        btn.addEventListener('click', () => {
            const level = btn.getAttribute('data-level');
            startGame(level);
        });
    });
}

// =====================
// GAME START
// =====================
function startGame(level) {
    baseball.difficulty = level;
    baseball.score = 0;
    baseball.pitchCount = 0;
    baseball.consecutiveHits = 0;
    baseball.gameOver = false;
    baseball.playerHistory = {
        total: 0,
        hits: 0,
        pitchStats: {}
    };

    const shuffled = [...allPitchTypes].sort(() => 0.5 - Math.random());
    baseball.selectedPitches = shuffled.slice(0, 3);
    baseball.selectedPitches.forEach(p => {
        baseball.playerHistory.pitchStats[p.id] = { total: 0, success: 0 };
    });

    renderGameScreen();
    startAIPondering();
}

// =====================
// GAME SCREEN UI & CANVAS
// =====================
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
        min-height: 100%;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-sizing: border-box;
        overflow: hidden;
    ">
        <!-- 상단 스코어바 (고정 높이) -->
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
                <span style="font-size: 0.8rem; color: #888;">난이도:</span> 
                <strong style="color: #1ea857; font-size: 0.9rem;">${lv.name}</strong>
            </div>
            <div>
                <span style="font-size: 0.8rem; color: #888;">투구:</span> 
                <strong id="pitch-counter" style="font-size: 0.9rem;">${baseball.pitchCount}</strong><span style="font-size: 0.8rem; color: #888;">/${baseball.maxPitches}</span>
            </div>
            <div>
                <span style="font-size: 0.8rem; color: #888;">점수:</span> 
                <strong id="score-display" style="color: #1ea857; font-size: 1.1rem;">${baseball.score}</strong>점
                <span id="combo-display" style="font-size: 0.75rem; color: #ffeb3b; margin-left: 4px;"></span>
            </div>
        </div>

        <!-- 오늘의 구종 안내 (고정 높이) -->
        <div style="
            background: #181818;
            padding: 6px 10px;
            display: flex;
            justify-content: center;
            gap: 12px;
            font-size: 0.8rem;
            border-bottom: 1px solid #2a2a2a;
            flex-wrap: wrap;
            flex-shrink: 0;
        ">
            <span style="color: #888;">오늘의 구종:</span>
            ${baseball.selectedPitches.map(p => `<span style="color: #a0e8af;">✅ ${p.name}</span>`).join('')}
        </div>

        <!-- 야구장 Canvas 영역 (남은 공간을 유연하게 차지) -->
        <div style="
            flex: 1;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            background: radial-gradient(circle at center, #1a3c27 0%, #0d1a12 100%);
            overflow: hidden;
            cursor: pointer;
            min-height: 0;
        " id="canvas-container">
            <canvas id="baseballCanvas" style="display: block; width: 100%; height: 100%;"></canvas>
            
            <!-- 상태 메시지/결과 오버레이 -->
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
                padding: 0 10px;
                box-sizing: border-box;
                width: 100%;
            "></div>
        </div>

        <!-- 하단 안내 및 스윙 버튼 영역 (고정 높이) -->
        <div style="
            background: #181818;
            padding: 12px 15px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 6px;
            border-top: 1px solid #2a2a2a;
            flex-shrink: 0;
        ">
            <div style="font-size: 0.8rem; color: #aaa;">
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
                transition: transform 0.1s;
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

    const triggerSwingAction = (e) => {
        if (e) e.preventDefault();
        executeSwing();
    };

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

// =====================
// AI 지능형 페이크 및 약점 공략 분석 로직
// =====================
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
            if (otherPitches.length > 0) {
                return otherPitches[Math.floor(Math.random() * otherPitches.length)];
            }
        }

        return weakestPitch;
    }

    return pitches[Math.floor(Math.random() * pitches.length)];
}

// =====================
// 게임 흐름 제어
// =====================
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
        swingResulted: false
    };

    showStatusOverlay("🤖 AI 투수가 구종을 고민 중...", "#1ea857");

    setTimeout(() => {
        runCountdown(3);
    }, 1000);
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

// =====================
// 다단계 카메라 줌인 & 시점 전환 엔진
// =====================
function startPitchAnimation() {
    baseball.gameMode = 'PITCHING';
    const p = baseball.currentPitch;
    const lv = baseballLevels[baseball.difficulty];

    p.active = true;
    p.progress = 0; 
    p.speed = (p.pitchObj.speed * 0.0065) * lv.speedMul;

    const render = () => {
        if (!ctxRef || !canvasRef || !p.active) return;

        ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

        p.progress += p.speed;

        if (p.progress > 1.2) {
            if (!p.swingResulted) {
                processHitResult('miss', true);
            }
            return;
        }

        drawCameraPerspective(p.progress);

        const w = canvasRef.width;
        const h = canvasRef.height;

        const startX = w / 2;
        const startY = h * 0.25;
        const targetX = w / 2;
        const targetY = h * 0.70;

        const hOffset = p.pitchObj.hBreak * Math.sin(p.progress * Math.PI) * 45;
        
        let vDropFactor = Math.pow(p.progress, 2);
        if (p.pitchObj.id === 'fork' || p.pitchObj.id === 'curve') {
            vDropFactor = p.progress > 0.55 ? Math.pow(p.progress, 4.5) * 1.8 : Math.pow(p.progress, 2);
        }
        const vOffset = p.pitchObj.vBreak * vDropFactor * 55;

        const currentX = startX + (targetX - startX) * p.progress + hOffset;
        const currentY = startY + (targetY - startY) * p.progress + vOffset;

        p.x = currentX;
        p.y = currentY;

        const radius = 6 + (Math.pow(p.progress, 1.5) * 30);

        ctxRef.beginPath();
        ctxRef.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctxRef.ellipse(currentX, currentY + radius + 4, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
        ctxRef.fill();

        ctxRef.beginPath();
        ctxRef.arc(currentX, currentY, radius, 0, Math.PI * 2);
        ctxRef.fillStyle = '#f4f4f4';
        ctxRef.fill();
        ctxRef.lineWidth = 2;
        ctxRef.strokeStyle = '#d32f2f';
        ctxRef.stroke();

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

// =====================
// 카메라 단계별 시점 연출 렌더러
// =====================
function drawCameraPerspective(progress) {
    if (!ctxRef || !canvasRef) return;
    const w = canvasRef.width;
    const h = canvasRef.height;

    ctxRef.save();

    if (progress > 0.85) {
        ctxRef.beginPath();
        ctxRef.strokeStyle = 'rgba(30, 168, 87, 0.8)';
        ctxRef.lineWidth = 4;
        ctxRef.strokeRect(w / 2 - 80, h * 0.50, 160, 140);
    } else if (progress > 0.6) {
        ctxRef.beginPath();
        ctxRef.strokeStyle = 'rgba(30, 168, 87, 0.5)';
        ctxRef.lineWidth = 2;
        ctxRef.strokeRect(w / 2 - 60, h * 0.55, 120, 100);
    } else if (progress > 0.3) {
        ctxRef.beginPath();
        ctxRef.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctxRef.lineWidth = 1.5;
        ctxRef.strokeRect(w / 2 - 40, h * 0.58, 80, 70);
    } else {
        ctxRef.beginPath();
        ctxRef.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctxRef.lineWidth = 1;
        ctxRef.strokeRect(w / 2 - 25, h * 0.62, 50, 50);
    }

    ctxRef.restore();
}

// =====================
// 다차원 정밀 타격 판정 시스템
// =====================
function executeSwing() {
    if (!baseball.currentPitch || !baseball.currentPitch.active || baseball.currentPitch.swingResulted) return;

    let p = baseball.currentPitch;
    p.swingResulted = true;

    const timing = p.progress;
    const pitchObj = p.pitchObj;

    let result = 'miss';

    if (timing >= 0.92 && timing <= 1.02) {
        result = pitchObj.type === 'fast' 
            ? (Math.random() < 0.6 ? 'homerun' : 'hit') 
            : (Math.random() < 0.45 ? 'homerun' : 'hit');
    } else if (timing >= 0.85 && timing < 0.92) {
        result = Math.random() < 0.55 ? 'foul' : 'hit';
    } else if (timing > 1.02 && timing <= 1.08) {
        result = Math.random() < 0.65 ? 'foul' : 'miss';
    } else {
        result = 'miss';
    }

    processHitResult(result, false);
}

// =====================
// 결과 처리 및 구종 안내
// =====================
function processHitResult(result, isTimeout) {
    if (!baseball.currentPitch) return;
    baseball.currentPitch.active = false;
    stopAnimation();

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
            if (!baseball.gameOver) {
                startAIPondering();
            }
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

// =====================
// GAME OVER 및 결과 화면
// =====================
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
        min-height: 100%;
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
            max-width: 420px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(30, 168, 87, 0.2);
        ">
            <h2 style="color: #ff5252; margin-bottom: 5px; font-size: 2rem;">GAME OVER</h2>
            <p style="color: #888; margin-bottom: 18px; font-size: 0.9rem;">축제 최고의 타자에 도전하세요!</p>
            
            <div style="
                background: #252525;
                padding: 16px;
                border-radius: 12px;
                margin-bottom: 20px;
            ">
                <div style="font-size: 0.85rem; color: #aaa; margin-bottom: 4px;">HUMAN FINAL SCORE</div>
                <div style="font-size: 2.5rem; font-weight: 900; color: #1ea857;">${baseball.score} 점</div>
                <div style="font-size: 0.8rem; color: #888; margin-top: 6px;">
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
                transition: background 0.2s;
            ">다시 하기</button>
        </div>
    </div>
    `;

    const restartBtn = document.getElementById('restart-btn');
    restartBtn.addEventListener('click', () => {
        showDifficultyScreen();
    });
}
