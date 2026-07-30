// baseball.js (Part 3: 스마트 AI 피칭 시스템, 3D 경기장 및 캐릭터 렌더링 루프)

function selectSmartPitch() {
    if (playerHistory.swings > 3) {
        if (playerHistory.lateHits > playerHistory.earlyHits) {
            return pitches.find(p => p.type === "fast") || pitches[0];
        } else if (playerHistory.earlyHits > playerHistory.lateHits) {
            return pitches.find(p => p.type === "curve") || pitches[2];
        }
    }
    return pitches[Math.floor(Math.random() * pitches.length)];
}

function nextPitch() {
    if (game.outs >= 3) {
        endGame();
        return;
    }

    game.pitching = true;
    game.swing = false;
    game.swingAnimProgress = 0;
    game.pitcherState = "windup";

    const selected = selectSmartPitch();

    game.pitch = {
        type: selected,
        startX: GAME_WIDTH / 2,
        startY: 185,
        targetX: GAME_WIDTH / 2,
        targetY: 575,
        x: GAME_WIDTH / 2,
        y: 185,
        progress: 0,
        speed: 0.0095 * difficulties[game.difficulty].speed
    };

    setTimeout(() => {
        game.pitcherState = "release";
    }, 320);

    showPitchInfo();
    startPitchAnimation();
}

function startPitchAnimation() {
    if (animation) cancelAnimationFrame(animation);

    function loop() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        ctx.save();
        if (game.screenShakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * 12;
            const shakeY = (Math.random() - 0.5) * 12;
            ctx.translate(shakeX, shakeY);
            game.screenShakeTimer--;
        }

        draw3DStadium();
        drawPitcher();
        drawStrikeZoneAndPlate();

        const p = game.pitch;
        if (game.pitching && p) {
            p.progress += p.speed;

            let curX = p.startX + (p.targetX - p.startX) * p.progress;
            let curY = p.startY + (p.targetY - p.startY) * p.progress;

            curX += p.type.moveX * Math.sin(p.progress * Math.PI);
            curY += p.type.moveY * Math.pow(p.progress, 2);

            p.x = curX;
            p.y = curY;

            const indicator = document.getElementById("timingIndicator");
            if (indicator) {
                indicator.style.width = `${p.progress * 100}%`;
            }

            const currentRadius = 3.5 + (17.5 * Math.pow(p.progress, 1.4));
            drawBallWithTrail(p.x, p.y, currentRadius, p);

            if (p.progress >= 1.0) {
                game.pitching = false;
                if (!game.swing) {
                    judgePitch();
                }
                return;
            }
        } else if (game.swing && p) {
            const currentRadius = 3.5 + (17.5 * Math.pow(p.progress, 1.4));
            drawBallWithTrail(p.x, p.y, currentRadius, p);
        }

        drawBatterAndBat();

        if (game.activeEffect) {
            drawHitEffect();
        }

        ctx.restore();
        animation = requestAnimationFrame(loop);
    }

    loop();
}

function draw3DStadium() {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT * 0.38);
    skyGrad.addColorStop(0, "#020604");
    skyGrad.addColorStop(0.5, "#061a10");
    skyGrad.addColorStop(1, "#0d2b1c");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.38);

    ctx.fillStyle = "#112218";
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT * 0.20);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT * 0.20);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT * 0.31);
    ctx.lineTo(0, GAME_HEIGHT * 0.31);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#050b08";
    ctx.fillRect(GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.21, 180, 50);
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(GAME_WIDTH / 2 - 90, GAME_HEIGHT * 0.21, 180, 50);
    
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMPBASEBALL STADIUM", GAME_WIDTH / 2, GAME_HEIGHT * 0.245);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`SCORE ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT * 0.275);

    const outfieldGrad = ctx.createLinearGradient(0, GAME_HEIGHT * 0.31, 0, GAME_HEIGHT * 0.54);
    outfieldGrad.addColorStop(0, "#064e3b");
    outfieldGrad.addColorStop(1, "#047857");
    ctx.fillStyle = outfieldGrad;
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT * 0.31);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT * 0.31);
    ctx.lineTo(GAME_WIDTH + 120, GAME_HEIGHT * 0.54);
    ctx.lineTo(-120, GAME_HEIGHT * 0.54);
    ctx.closePath();
    ctx.fill();

    const infieldGrad = ctx.createLinearGradient(0, GAME_HEIGHT * 0.54, 0, GAME_HEIGHT);
    infieldGrad.addColorStop(0, "#78350f");
    infieldGrad.addColorStop(1, "#3b1402");
    ctx.fillStyle = infieldGrad;
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 130, GAME_HEIGHT * 0.54);
    ctx.lineTo(GAME_WIDTH / 2 + 130, GAME_HEIGHT * 0.54);
    ctx.lineTo(GAME_WIDTH + 140, GAME_HEIGHT);
    ctx.lineTo(-140, GAME_HEIGHT);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#059669";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.56);
    ctx.lineTo(GAME_WIDTH / 2 - 150, GAME_HEIGHT * 0.86);
    ctx.lineTo(GAME_WIDTH / 2 + 150, GAME_HEIGHT * 0.86);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.55);
    ctx.lineTo(-50, GAME_HEIGHT);
    ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT * 0.55);
    ctx.lineTo(GAME_WIDTH + 50, GAME_HEIGHT);
    ctx.stroke();
}

function drawPitcher() {
    const px = GAME_WIDTH / 2;
    const py = 185;

    ctx.fillStyle = "#9a3412";
    ctx.beginPath();
    ctx.ellipse(px, py + 12, 38, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#c2410c";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(px, py - 18, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px - 15, py - 6, 30, 26);

    ctx.strokeStyle = "#fbcfe8";
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (game.pitcherState === "windup") {
        ctx.moveTo(px - 15, py);
        ctx.lineTo(px - 26, py - 14);
    } else {
        ctx.moveTo(px + 15, py);
        ctx.lineTo(px + 24, py - 18);
    }
    ctx.stroke();
}

function drawStrikeZoneAndPlate() {
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
    ctx.fillRect(GAME_WIDTH / 2 - 68, 470, 136, 145);
    ctx.strokeRect(GAME_WIDTH / 2 - 68, 470, 136, 145);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.moveTo(GAME_WIDTH / 2 - 34, 568);
    ctx.lineTo(GAME_WIDTH / 2 + 34, 568);
    ctx.lineTo(GAME_WIDTH / 2 + 40, 582);
    ctx.lineTo(GAME_WIDTH / 2, 602);
    ctx.lineTo(GAME_WIDTH / 2 - 40, 582);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawBallWithTrail(x, y, radius, pitchInfo) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = pitchInfo.type === "fast" ? "#38bdf8" : "#facc15";
    ctx.beginPath();
    ctx.arc(x, y - (pitchInfo.speed * 7), radius * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#dc2626";
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius * 0.76, 0.2, Math.PI - 0.2, false);
    ctx.strokeStyle = "rgba(220, 38, 38, 0.65)";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawBatterAndBat() {
    const bx = GAME_WIDTH / 2 + 78;
    const by = 645;

    ctx.fillStyle = "#1e3a8a";
    ctx.beginPath();
    ctx.arc(bx - 12, by - 56, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(bx - 30, by - 38, 34, 46);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(bx - 16, by - 38, 6, 46);

    ctx.fillStyle = "#334155";
    ctx.fillRect(bx - 25, by + 8, 25, 44);

    ctx.save();
    let batAngle = -0.55;
    let batOffsetX = -24;
    let batOffsetY = -30;

    if (game.swingAnimProgress > 0) {
        batAngle = -0.55 - (game.swingAnimProgress * 3.3);
        batOffsetX = -10 + (game.swingAnimProgress * 28);
        batOffsetY = -45 + (game.swingAnimProgress * 15);
    }

    ctx.translate(bx + batOffsetX, by + batOffsetY);
    ctx.rotate(batAngle);

    const batGrad = ctx.createLinearGradient(0, 0, 0, -95);
    batGrad.addColorStop(0, "#451a03");
    batGrad.addColorStop(0.5, "#d97706");
    batGrad.addColorStop(1, "#fde047");
    ctx.fillStyle = batGrad;
    ctx.fillRect(-5, -95, 10, 95);
    ctx.strokeStyle = "#291302";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-5, -95, 10, 95);

    ctx.restore();
}
