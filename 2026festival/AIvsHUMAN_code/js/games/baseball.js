// baseball.js (Part 4: 스윙 이벤트 핸들러, 판정 로직 및 게임 종료/결과 처리)

function showPitchInfo() {
    const countEl = document.getElementById("count");
    if (countEl) {
        countEl.textContent = `${game.balls}B ${game.strikes}S`;
    }
}

function initInput() {
    const btn = document.getElementById("swingButton");
    if (btn) {
        btn.onclick = () => performSwing();
    }

    swingKey = (e) => {
        if (e.code === "Space" && !game.swing && game.pitching) {
            e.preventDefault();
            performSwing();
        }
    };
    window.addEventListener("keydown", swingKey);
}

function performSwing() {
    if (!game.pitching || game.swing) return;

    game.swing = true;
    playerHistory.swings++;

    const p = game.pitch;
    const progress = p.progress;

    if (progress < 0.72) {
        playerHistory.earlyHits++;
    } else if (progress > 0.93) {
        playerHistory.lateHits++;
    }

    let startTime = performance.now();
    const animDuration = 180;

    function animateSwing() {
        let elapsed = performance.now() - startTime;
        let progressVal = Math.min(elapsed / animDuration, 1);
        game.swingAnimProgress = progressVal;

        if (progressVal < 1) {
            requestAnimationFrame(animateSwing);
        } else {
            setTimeout(() => {
                game.swingAnimProgress = 0;
            }, 80);
        }
    }
    animateSwing();

    judgeHit(progress);
}

function judgeHit(progress) {
    game.pitching = false;

    if (progress >= 0.76 && progress <= 0.91) {
        const diff = Math.abs(progress - 0.835);
        let hitType = "SINGLE";
        let addScore = 100;

        if (diff < 0.02) {
            hitType = "HOME RUN!!";
            addScore = 500;
            game.screenShakeTimer = 18;
            game.activeEffect = { text: "HOME RUN!", color: "#facc15", scale: 2.2 };
        } else if (diff < 0.045) {
            hitType = "DOUBLE!";
            addScore = 250;
            game.screenShakeTimer = 8;
            game.activeEffect = { text: "DOUBLE!", color: "#38bdf8", scale: 1.6 };
        } else {
            game.activeEffect = { text: "HIT!", color: "#4ade80", scale: 1.2 };
        }

        game.score += addScore;
        updateScoreUI();
        triggerHitEffectCleanup();

    } else if (progress >= 0.68 && progress < 0.76) {
        game.strikes++;
        game.activeEffect = { text: "파울 (FOUL)", color: "#94a3b8", scale: 1.0 };
        if (game.strikes >= 2) game.strikes = 2;
        checkCountState();
        triggerHitEffectCleanup();
    } else {
        game.strikes++;
        game.activeEffect = { text: "헛스윙 (SWINGING MISS)", color: "#ef4444", scale: 1.2 };
        checkCountState();
        triggerHitEffectCleanup();
    }
}

function judgePitch() {
    game.balls++;
    game.activeeffect = { text: "볼 (BALL)", color: "#38bdf8", scale: 1.0 };
    checkCountState();
    triggerHitEffectCleanup();
}

function checkCountState() {
    showPitchInfo();
    if (game.balls >= 4) {
        game.balls = 0;
        game.strikes = 0;
        game.score += 50;
        updateScoreUI();
        showNotification("볼넷 출루! (+50점)");
    } else if (game.strikes >= 3) {
        game.strikes = 0;
        game.balls = 0;
        game.outs++;
        updateOutsUI();
        showNotification("삼진 아웃!");
    }

    setTimeout(() => {
        if (game.outs < 3) {
            nextPitch();
        } else {
            endGame();
        }
    }, 1100);
}

function updateScoreUI() {
    const el = document.getElementById("score");
    if (el) el.textContent = game.score;
}

function updateOutsUI() {
    const el = document.getElementById("outs");
    if (el) el.textContent = game.outs;
}

function showNotification(text) {
    game.activeEffect = { text: text, color: "#ffffff", scale: 1.4 };
}

function triggerHitEffectCleanup() {
    setTimeout(() => {
        game.activeEffect = null;
    }, 900);
}

function drawHitEffect() {
    if (!game.activeEffect) return;
    ctx.save();
    ctx.font = `900 ${Math.floor(26 * game.activeEffect.scale)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = game.activeEffect.color;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 12;
    ctx.fillText(game.activeEffect.text, GAME_WIDTH / 2, 340);
    ctx.restore();
}

function endGame() {
    destroy();
    game.gameOver = true;

    gameAreaRef.innerHTML = `
        <div style="
            width:100%;
            height:100%;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            background: linear-gradient(135deg, #050b08 0%, #0d2818 50%, #031008 100%);
            color:white;
            border-radius:20px;
            font-family:'Pretendard', sans-serif;
            text-align:center;
            padding: 0 24px;
            box-sizing:border-box;
        ">
            <h1 style="font-size:32px; font-weight:900; color:#ef4444; margin:0 0 10px 0;">GAME OVER</h1>
            <p style="color:#94a3b8; font-size:15px; margin:0 0 20px 0;">최종 스코어</p>
            <div style="font-size:48px; font-weight:900; color:#facc15; margin-bottom:30px;">${game.score} 점</div>
            <button id="restartBtn" style="
                width:220px;
                padding:15px 0;
                background:linear-gradient(90deg, #15803d, #22c55e);
                border:none;
                border-radius:30px;
                color:white;
                font-size:16px;
                font-weight:900;
                cursor:pointer;
                box-shadow:0 8px 25px rgba(0,0,0,0.5);
            ">다시 하기</button>
        </div>
    `;

    document.getElementById("restartBtn").onclick = () => {
        startGame();
        initInput();
        nextPitch();
    };
}
