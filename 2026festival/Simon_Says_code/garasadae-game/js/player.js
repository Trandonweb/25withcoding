// ==========================================
// player.js
// ==========================================

// 플레이어 객체
const player = {
    x: 1000,
    y: 1000,

    width: 40,
    height: 40,

    speed: 3,
    runSpeed: 6,

    hp: 100,
    maxHp: 100,

    mp: 100,
    maxMp: 100,

    angle: 0,

    moveX: 0,
    moveY: 0,

    moving: false,

    animation: 0
};

// ==========================================
// 플레이어 업데이트
// ==========================================
function updatePlayer() {

    const move = getMoveVector();

    player.moveX = move.x;
    player.moveY = move.y;

    player.moving = (move.x !== 0 || move.y !== 0);

    let speed = runKey()
        ? player.runSpeed
        : player.speed;

    player.x += move.x * speed;
    player.y += move.y * speed;

    // 맵 경계
    if (typeof mapWidth !== "undefined") {

        player.x = Math.max(
            player.width / 2,
            Math.min(player.x, mapWidth - player.width / 2)
        );

    }

    if (typeof mapHeight !== "undefined") {

        player.y = Math.max(
            player.height / 2,
            Math.min(player.y, mapHeight - player.height / 2)
        );

    }

    // 마우스를 바라보기
    player.angle = getMouseAngle(
        player.x - camera.x,
        player.y - camera.y
    );

    // 걷기 애니메이션
    if (player.moving) {

        player.animation += 0.25;

    } else {

        player.animation = 0;

    }

}

// ==========================================
// 플레이어 그리기
// ==========================================
function drawPlayer(ctx) {

    ctx.save();

    const drawX = player.x - camera.x;
    const drawY = player.y - camera.y;

    ctx.translate(drawX, drawY);

    ctx.rotate(player.angle);

    // 몸통
    ctx.fillStyle = "#2d8cff";

    ctx.fillRect(
        -player.width / 2,
        -player.height / 2,
        player.width,
        player.height
    );

    // 눈
    ctx.fillStyle = "white";

    ctx.beginPath();
    ctx.arc(10, -8, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(10, 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // 동공
    ctx.fillStyle = "black";

    ctx.beginPath();
    ctx.arc(10, -8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(10, 8, 2, 0, Math.PI * 2);
    ctx.fill();

    // 팔
    ctx.strokeStyle = "#1d6fd6";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(18, -18);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(18, 18);
    ctx.stroke();

    // 다리 애니메이션
    let leg = Math.sin(player.animation) * 8;

    ctx.beginPath();
    ctx.moveTo(-10, 18);
    ctx.lineTo(-10 + leg, 34);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(10, 18);
    ctx.lineTo(10 - leg, 34);
    ctx.stroke();

    ctx.restore();

}

// ==========================================
// 공격
// ==========================================
function attack() {

    console.log("공격!");

}

// ==========================================
// 피해
// ==========================================
function damage(value) {

    player.hp -= value;

    if (player.hp < 0)
        player.hp = 0;

}

// ==========================================
// 회복
// ==========================================
function heal(value) {

    player.hp += value;

    if (player.hp > player.maxHp)
        player.hp = player.maxHp;

}

// ==========================================
// MP 사용
// ==========================================
function useMP(value) {

    if (player.mp >= value) {

        player.mp -= value;

        return true;

    }

    return false;

}

// ==========================================
// 부활
// ==========================================
function respawn() {

    player.x = 1000;
    player.y = 1000;

    player.hp = player.maxHp;
    player.mp = player.maxMp;

}

// ==========================================
// 마우스 좌클릭 공격
// ==========================================
window.addEventListener("mousedown", function(e){

    if(e.button===0){

        attack();

    }

});

// ==========================================
// 디버그
// ==========================================
console.log("Player Loaded");
