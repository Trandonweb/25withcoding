// ==========================================
// map.js
// ==========================================

// ----------------------------
// 맵 크기
// ----------------------------
const mapWidth = 4000;
const mapHeight = 4000;

const TILE_SIZE = 64;

// ----------------------------
// 스폰 위치
// ----------------------------
const spawnPoint = {
    x: mapWidth / 2,
    y: mapHeight / 2
};

// ----------------------------
// 충돌 오브젝트
// ----------------------------
const walls = [];

// ----------------------------
// 나무 생성
// ----------------------------
const trees = [];

function addTree(x, y) {

    trees.push({
        x,
        y,
        radius: 28
    });

    walls.push({
        x: x - 28,
        y: y - 28,
        width: 56,
        height: 56
    });

}

// ----------------------------
// 바위 생성
// ----------------------------
const rocks = [];

function addRock(x, y) {

    rocks.push({
        x,
        y,
        radius: 22
    });

    walls.push({
        x: x - 22,
        y: y - 22,
        width: 44,
        height: 44
    });

}

// ----------------------------
// 맵 생성
// ----------------------------
function createMap() {

    // 나무
    for (let i = 0; i < 180; i++) {

        addTree(

            Math.random() * mapWidth,

            Math.random() * mapHeight

        );

    }

    // 바위
    for (let i = 0; i < 100; i++) {

        addRock(

            Math.random() * mapWidth,

            Math.random() * mapHeight

        );

    }

}

// 한번만 생성
createMap();

// ----------------------------
// 충돌
// ----------------------------
function checkCollision(nextX, nextY, size) {

    for (const wall of walls) {

        if (

            nextX + size / 2 > wall.x &&
            nextX - size / 2 < wall.x + wall.width &&
            nextY + size / 2 > wall.y &&
            nextY - size / 2 < wall.y + wall.height

        ) {

            return true;

        }

    }

    return false;

}

// ----------------------------
// 맵 그리기
// ----------------------------
function drawMap(ctx) {

    // ===== 잔디 =====
    for (let x = 0; x < mapWidth; x += TILE_SIZE) {

        for (let y = 0; y < mapHeight; y += TILE_SIZE) {

            const sx = x - camera.x;
            const sy = y - camera.y;

            if (
                sx < -TILE_SIZE ||
                sy < -TILE_SIZE ||
                sx > canvas.width ||
                sy > canvas.height
            ) continue;

            ctx.fillStyle =
                ((x + y) / TILE_SIZE) % 2 === 0
                    ? "#61b15a"
                    : "#58a94d";

            ctx.fillRect(
                sx,
                sy,
                TILE_SIZE,
                TILE_SIZE
            );

        }

    }

    // ===== 길 =====
    ctx.fillStyle = "#a5825d";

    ctx.fillRect(
        spawnPoint.x - 300 - camera.x,
        spawnPoint.y - 40 - camera.y,
        600,
        80
    );

    ctx.fillRect(
        spawnPoint.x - 40 - camera.x,
        spawnPoint.y - 300 - camera.y,
        80,
        600
    );

    // ===== 나무 =====
    for (const tree of trees) {

        const x = tree.x - camera.x;
        const y = tree.y - camera.y;

        ctx.fillStyle = "#6b3d1d";

        ctx.fillRect(
            x - 6,
            y,
            12,
            30
        );

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            24,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#1f8b2d";

        ctx.fill();

    }

    // ===== 바위 =====
    for (const rock of rocks) {

        const x = rock.x - camera.x;
        const y = rock.y - camera.y;

        ctx.beginPath();

        ctx.arc(
            x,
            y,
            18,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#777";

        ctx.fill();

    }

    // ===== 스폰 위치 =====
    ctx.beginPath();

    ctx.arc(
        spawnPoint.x - camera.x,
        spawnPoint.y - camera.y,
        20,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#00aaff";

    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();

}

// ----------------------------
// 플레이어 스폰
// ----------------------------
if (typeof player !== "undefined") {

    player.x = spawnPoint.x;
    player.y = spawnPoint.y;

}

console.log("Map Loaded");
