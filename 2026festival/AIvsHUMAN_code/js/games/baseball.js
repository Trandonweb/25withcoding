// baseball.js
// ⚾ AI 투수 챌린지 (Baseball) - ES Module (Upgrade Version)

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
    gameMode: 'DIFFICULTY', // 'DIFFICULTY', 'THINKING', 'READY', 'PITCHING', 'RESULT', 'GAMEOVER'
    playerHistory: {
        total: 0,
        hits: 0,
        pitchStats: {} // 구종별 성적 기록 (성공 횟수, 총 시도 횟수)
    },
    lastResultText: '',
    lastResultColor: '#ffffff'
};

// 난이도 설정
const baseballLevels = {
    easy: { name: '쉬움', speedMul: 0.75, aiAdapt: 0.1 },
    normal: { name: '보통', speedMul: 1.0, aiAdapt: 0.5 },
    hard: { name: '어려움', speedMul: 1.3, aiAdapt: 0.95 }
};

// 6개의 구종 정의 및 특성 설정
const allPitchTypes = [
    { id: 'four-seam', name: '포심 패스트볼', speed: 14, hBreak: 0, vBreak: 0, type: 'fast', desc: '직선으로 빠르게 날아오는 직구' },
    { id: 'two-seam', name: '투심 패스트볼', speed: 13, hBreak: 1.5, vBreak: 1.0, type: 'fast', desc: '타자 앞에서 살짝 싱크되는 공' },
    { id: 'cutter', name: '커터', speed: 13.5, hBreak: -2.5, vBreak: 0.5, type: 'fast', desc: '마지막에 미세하게 바깥쪽으로 꺾이는 공' },
    { id: 'curve', name: '커브', speed: 7.5, hBreak: 1.0, vBreak: 5.5, type: 'breaking', desc: '느리게 포물선을 그리며 크게 떨어지는 공' },
    { id: 'fork', name: '포크볼', speed: 9.5, hBreak: 0, vBreak: 6.5, type: 'breaking', desc: '직진하다가 홈판 직전에 급격히 낙하하는 공' },
    { id: 'slider', name: '슬라이더', speed: 10.5, hBreak: 4.5, vBreak: 2.0, type: 'breaking', desc: '옆으로 날카롭게 휘어져 나가는 공' }
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
        height: 100%;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        box-sizing: border-box;
    ">
        <div style="
            background: #1e1e1e;
            border: 2px solid #1ea857;
            border-radius: 16px;
            padding: 30px;
            width: 100%;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(30, 168, 87, 0.2);
        ">
            <h2 style="color: #1ea857; margin-bottom: 10px; font-size: 2rem;">⚾ AI 투수 챌린지</h2>
            <p style="color: #b0b0b0; margin-bottom: 25px; font-size: 0.95rem;">구종의 궤적을 간파하고 AI의 약점 분석을 돌파하라!</p>
            
            <h3 style="margin-bottom: 15px; font-size: 1.1rem;">난이도 선택</h3>
            
            <div style="display: flex; flex-direction: column; gap: 12px;">
                <button class="game-btn" data-level="easy" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 14px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                    transition: all 0.2s;
                ">쉬움 (Easy)</button>
                <button class="game-btn" data-level="normal" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 14px;
                    border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer;
                    transition: all 0.2s;
                ">보통 (Normal)</button>
                <button class="game-btn" data-level="hard" style="
                    background: #2d2d2d; color: #fff; border: 1px solid #444; padding: 14px;
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
    baseball.gameOver = false;
    baseball.playerHistory = {
        total: 0,
        hits: 0,
        pitchStats: {}
    };

    // 오늘 사용할 3가지 구종 랜덤 선택
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
        height: 100%;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        box-sizing: border-box;
        overflow: hidden;
    ">
        <!-- 상단 스코어바 -->
        <div style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1e1e1e;
            padding: 12px 20px;
            border-bottom: 2px solid #1ea857;
        ">
            <div>
                <span style="font-size: 0.85rem; color: #888;">난이도:</span> 
                <strong style="color: #1ea857;">${lv.name}</strong>
            </div>
            <div>
                <span style="font-size: 0.85rem; color: #888;">투구:</span> 
                <strong id="pitch-counter">${baseball.pitchCount}</strong> / ${baseball.maxPitches}
            </div>
            <div>
                <span style="font-size: 0.85rem; color: #888;">점수:</span> 
                <strong id="score-display" style="color: #1ea857; font-size: 1.2rem;">${baseball.score}</strong>점
            </div>
        </div>

        <!-- 오늘의 구종 안내 -->
        <div style="
            background: #181818;
            padding: 8px 15px;
            display: flex;
            justify-content: center;
            gap: 15px;
            font-size: 0.85rem;
            border-bottom: 1px solid #2a2a2a;
            flex-wrap: wrap;
        ">
            <span style="color: #888;">오늘의 구종:</span>
            ${baseball.selectedPitches.map(p => `<span style="color: #a0e8af;">✅ ${p.name}</span>`).join('')}
        </div>

        <!-- 야구장 Canvas 영역 -->
        <div style="
            flex: 1;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            background: radial-gradient(circle at center, #1a3c27 0%, #0d1a12 100%);
            overflow: hidden;
            cursor: pointer;
        " id="canvas-container">
            <canvas id="baseballCanvas" style="display: block; width: 100%; height: 100%;"></canvas>
            
            <!-- 상태 메시지/결과 오버레이 -->
            <div id="status-overlay" style="
                position: absolute;
                top: 15%;
                font-size: 1.8rem;
                font-weight: 900;
                text-align: center;
                text-shadow: 0 4px 12px rgba(0,0,0,0.8);
                pointer-events: none;
                transition: opacity 0.3s;
                opacity: 0;
            "></div>

            <!-- 하단 안내 및 스윙 버튼 -->
            <div style="
                position: absolute;
                bottom: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                pointer-events: none;
            ">
                <div style="font-size: 0.9rem; color: #bbb; background: rgba(0,0,0,0.6); padding: 4px 12px; border-radius: 20px;">
                    마우스 클릭 또는 [SPACE]로 스윙!
                </div>
                <button id="swing-btn" style="
                    background: #1ea857;
                    color: white;
                    border: none;
                    padding: 14px 40px;
                    border-radius: 30px;
                    font-size: 1.1rem;
                    font-weight: bold;
                    cursor: pointer;
                    box-shadow: 0 4px 15px rgba(30,168,87,0.4);
                    pointer-events: auto;
                    transition: transform 0.1s;
                ">🏏 스윙!</button>
            </div>
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
// AI 지능형 투구 분석 및 결정
// =====================
function selectNextPitch() {
    const lv = baseballLevels[baseball.difficulty];
    const pitches = baseball.selectedPitches;

    // AI의 정교한 데이터 분석 로직 (어려움 난이도는 약점 집중 공략)
    if (Math.random() < lv.aiAdapt && baseball.playerHistory.total > 2) {
        let targetPitch = pitches[0];
        let lowestSuccessRate = 1.1;

        pitches.forEach(p => {
            const stat = baseball.playerHistory.pitchStats[p.id];
            const rate = stat.total > 0 ? (stat.success / stat.total) : 0.5;
            if (rate < lowestSuccessRate) {
                lowestSuccessRate = rate;
                targetPitch = p;
            }
        });

        // 약점 구종 집중 던지기 확률
        const biasChance = baseball.difficulty === 'hard' ? 0.85 : 0.6;
        if (Math.random() < biasChance) {
            return targetPitch;
        }
    }

    // 기본 가중치 무작위 선택
    return pitches[Math.floor(Math.random() * pitches.length)];
}

// =====================
// 게임 흐름 제어 (생각 -> 카운트다운 -> 투구)
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

    showStatusOverlay("🤖 AI가 구종을 고민 중...", "#1ea857");

    // AI 생각 후 카운트다운 진행
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
        }, 600);
    }
}

// =====================
// 투구 애니메이션 및 시점 전환 엔진 (2루심 -> 포수 시점)
// =====================
function startPitchAnimation() {
    baseball.gameMode = 'PITCHING';
    const p = baseball.currentPitch;
    const lv = baseballLevels[baseball.difficulty];

    p.active = true;
    p.progress = 0; // 0 (투수 마운드) -> 1 (홈플레이트 도달) -> 1.2 (포수 캐치)
    p.speed = (p.pitchObj.speed * 0.007) * lv.speedMul;

    const render = () => {
        if (!ctxRef || !canvasRef || !p.active) return;

        ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);

        p.progress += p.speed;

        if (p.progress > 1.2) {
            if (!p.swingResulted) {
                processHitResult('miss', true); // 스윙 안 하고 흘려보냄 (루킹 삼진/볼)
            }
            return;
        }

        // 시점 전환 구현: 
        // 전반부(progress 0 ~ 0.5): 2루심 시점 (멀리서 다가오는 모습)
        // 후반부(progress 0.5 ~ 1.0): 포수 1인칭 살짝 위 시점 (스트라이크존 확대 및 박진감)
        drawFieldPerspective(p.progress);

        // 공의 좌표 계산 (변화구 궤적 반영)
        const w = canvasRef.width;
        const h = canvasRef.height;

        // 시작점(투수 마운드)과 도착점(홈플레이트 스트라이크존)
        const startX = w / 2;
        const startY = h * 0.28;
        const targetX = w / 2;
        const targetY = h * 0.68;

        // 구종별 궤적 변화 계산
        const hOffset = p.pitchObj.hBreak * Math.sin(p.progress * Math.PI) * 35;
        // 포크/커브의 경우 후반부에 급격히 떨어지는 낙차 적용
        let vDropFactor = Math.pow(p.progress, 2);
        if (p.pitchObj.id === 'fork') {
            vDropFactor = p.progress > 0.6 ? Math.pow(p.progress, 4) * 1.5 : Math.pow(p.progress, 2);
        }
        const vOffset = p.pitchObj.vBreak * vDropFactor * 45;

        const currentX = startX + (targetX - startX) * p.progress + hOffset;
        const currentY = startY + (targetY - startY) * p.progress + vOffset;

        p.x = currentX;
        p.y = currentY;

        // 원근감에 따른 공 크기 변화
        const radius = 8 + (p.progress * 24);

        // 공 그림자
        ctxRef.beginPath();
        ctxRef.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctxRef.ellipse(currentX, currentY + radius + 4, radius * 0.7, radius * 0.25, 0, 0, Math.PI * 2);
        ctxRef.fill();

        // 야구공 본체
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
// 시점별 야구장 백그라운드 렌더링
// =====================
function drawFieldPerspective(progress) {
    if (!ctxRef || !canvasRef) return;
    const w = canvasRef.width;
    const h = canvasRef.height;

    ctxRef.save();

    // 포수 시점으로 전환되는 구간 (progress > 0.5)에서 시점 연출 가이드 라인 변경
    if (progress > 0.5) {
        // 포수 1인칭 살짝 위 시점: 스트라이크존 박스 강조
        ctxRef.beginPath();
        ctxRef.strokeStyle = 'rgba(30, 168, 87, 0.6)';
        ctxRef.lineWidth = 3;
        ctxRef.strokeRect(w / 2 - 70, h * 0.52, 140, 130);

        // 홈플레이트
        ctxRef.beginPath();
        ctxRef.moveTo(w / 2 - 30, h * 0.68);
        ctxRef.lineTo(w / 2 + 30, h * 0.68);
        ctxRef.lineTo(w / 2 + 18, h * 0.72);
        ctxRef.lineTo(w / 2, h * 0.75);
        ctxRef.lineTo(w / 2 - 18, h * 0.72);
        ctxRef.closePath();
        ctxRef.fillStyle = '#ffffff';
        ctxRef.fill();
    } else {
        // 2루심 시점: 멀리서 투수가 공을 던지는 구장 원경
        ctxRef.beginPath();
        ctxRef.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctxRef.lineWidth = 1;
        ctxRef.strokeRect(w / 2 - 40, h * 0.58, 80, 80);
    }

    ctxRef.restore();
}

// =====================
// 다차원 타격 판정 시스템 (타이밍 + 위치 + 구종 + 난이도)
// =====================
function executeSwing() {
    if (!baseball.currentPitch || !baseball.currentPitch.active || baseball.currentPitch.swingResulted) return;

    let p = baseball.currentPitch;
    p.swingResulted = true;

    const timing = p.progress; // 공이 날아온 진행도
    const pitchObj = p.pitchObj;

    let result = 'miss';

    // 1. 타이밍 기반 기본 판정 (적정 타격 구간: 0.90 ~ 1.05)
    if (timing >= 0.92 && timing <= 1.02) {
        // 완벽한 타이밍
        if (pitchObj.type === 'fast') {
            result = Math.random() < 0.65 ? 'homerun' : 'hit';
        } else {
            // 변화구는 타이밍을 맞추기 까다로우므로 안타/홈런 확률 세분화
            result = Math.random() < 0.45 ? 'homerun' : 'hit';
        }
    } else if (timing >= 0.84 && timing < 0.92) {
        // 약간 이른 스윙 (커터, 슬라이더 등은 파울이나 안타 유발)
        result = Math.random() < 0.5 ? 'foul' : 'hit';
    } else if (timing > 1.02 && timing <= 1.10) {
        // 약간 늦은 스윙 (포크볼, 커브에 속았을 때 발생)
        result = Math.random() < 0.6 ? 'foul' : 'miss';
    } else {
        // 타이밍 완전 실패 (헛스윙)
        result = 'miss';
    }

    processHitResult(result, false);
}

// =====================
// 결과 처리 및 점수 반영
// =====================
function processHitResult(result, isTimeout) {
    if (!baseball.currentPitch) return;
    baseball.currentPitch.active = false;
    stopAnimation();

    const pitchId = baseball.currentPitch.pitchObj.id;
    baseball.playerHistory.total++;
    baseball.playerHistory.pitchStats[pitchId].total++;

    let points = 0;
    let text = '';
    let color = '#fff';

    if (result === 'homerun') {
        points = 50;
        text = '🔥 HOME RUN!! (+50점)';
        color = '#ff5252';
        baseball.score += points;
        baseball.playerHistory.hits++;
        baseball.playerHistory.pitchStats[pitchId].success++;
    } else if (result === 'hit') {
        points = 20;
        text = '⚾ 안타! (+20점)';
        color = '#4caf50';
        baseball.score += points;
        baseball.playerHistory.hits++;
        baseball.playerHistory.pitchStats[pitchId].success++;
    } else if (result === 'foul') {
        points = 5;
        text = '⚠️ 파울 (+5점)';
        color = '#ffeb3b';
        baseball.score += points;
    } else {
        points = 0;
        text = isTimeout ? '❌ 루킹 스트라이크!' : '❌ 헛스윙 (SWING AND MISS)!';
        color = '#9e9e9e';
    }

    showStatusOverlay(text, color);
    updateUIStats();

    // 1.3초 후 다음 투구 진행
    setTimeout(() => {
        if (!baseball.gameOver) {
            startAIPondering();
        }
    }, 1300);
}

function showStatusOverlay(text, color) {
    const overlay = document.getElementById('status-overlay');
    if (!overlay) return;
    overlay.innerText = text;
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
    if (scoreEl) scoreEl.innerText = baseball.score;
    if (counterEl) counterEl.innerText = baseball.pitchCount;
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
        height: 100%;
        background-color: #121212;
        color: #ffffff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        padding: 20px;
        box-sizing: border-box;
    ">
        <div style="
            background: #1e1e1e;
            border: 2px solid #1ea857;
            border-radius: 16px;
            padding: 35px 30px;
            width: 100%;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 8px 24px rgba(30, 168, 87, 0.2);
        ">
            <h2 style="color: #ff5252; margin-bottom: 5px; font-size: 2.2rem;">GAME OVER</h2>
            <p style="color: #888; margin-bottom: 20px; font-size: 0.95rem;">AI 투수와의 10구 명승부가 종료되었습니다.</p>
            
            <div style="
                background: #252525;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 25px;
            ">
                <div style="font-size: 0.9rem; color: #aaa; margin-bottom: 5px;">HUMAN FINAL SCORE</div>
                <div style="font-size: 2.8rem; font-weight: 900; color: #1ea857;">${baseball.score} 점</div>
                <div style="font-size: 0.85rem; color: #888; margin-top: 8px;">
                    타격 성공률: ${successRate}% (${baseball.playerHistory.hits}/${baseball.maxPitches})
                </div>
            </div>

            <button id="restart-btn" style="
                background: #1ea857;
                color: white;
                border: none;
                padding: 14px;
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
