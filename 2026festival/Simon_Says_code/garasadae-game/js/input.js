// ==========================================
// input.js
// 키보드 & 마우스 입력 관리
// ==========================================

// -----------------------------
// 키 입력 상태
// -----------------------------
const keys = {};

// -----------------------------
// 마우스 상태
// -----------------------------
const mouse = {
    x: 0,
    y: 0,

    left: false,
    right: false,

    wheel: 0
};

// -----------------------------
// 키 입력
// -----------------------------
window.addEventListener("keydown", (e) => {

    keys[e.key.toLowerCase()] = true;

});

window.addEventListener("keyup", (e) => {

    keys[e.key.toLowerCase()] = false;

});

// -----------------------------
// WASD
// -----------------------------
function upKey() {

    return keys["w"] || keys["arrowup"];

}

function downKey() {

    return keys["s"] || keys["arrowdown"];

}

function leftKey() {

    return keys["a"] || keys["arrowleft"];

}

function rightKey() {

    return keys["d"] || keys["arrowright"];

}

function runKey() {

    return keys["shift"];

}

// -----------------------------
// 마우스 위치
// -----------------------------
window.addEventListener("mousemove", (e) => {

    mouse.x = e.clientX;

    mouse.y = e.clientY;

});

// -----------------------------
// 마우스 클릭
// -----------------------------
window.addEventListener("mousedown", (e) => {

    if (e.button === 0)
        mouse.left = true;

    if (e.button === 2)
        mouse.right = true;

});

window.addEventListener("mouseup", (e) => {

    if (e.button === 0)
        mouse.left = false;

    if (e.button === 2)
        mouse.right = false;

});

// -----------------------------
// 우클릭 메뉴 방지
// -----------------------------
window.addEventListener("contextmenu", (e) => {

    e.preventDefault();

});

// -----------------------------
// 마우스 휠
// -----------------------------
window.addEventListener("wheel", (e) => {

    mouse.wheel = e.deltaY;

});

// -----------------------------
// 포커스 잃으면 입력 초기화
// -----------------------------
window.addEventListener("blur", () => {

    for (const key in keys)
        keys[key] = false;

    mouse.left = false;
    mouse.right = false;

});

// -----------------------------
// 방향 벡터
// -----------------------------
function getMoveVector() {

    let x = 0;
    let y = 0;

    if (leftKey()) x--;
    if (rightKey()) x++;

    if (upKey()) y--;
    if (downKey()) y++;

    if (x !== 0 && y !== 0) {

        const length = Math.sqrt(x * x + y * y);

        x /= length;
        y /= length;

    }

    return { x, y };

}

// -----------------------------
// 플레이어가 바라보는 각도
// -----------------------------
function getMouseAngle(playerX, playerY) {

    return Math.atan2(

        mouse.y - playerY,

        mouse.x - playerX

    );

}

// -----------------------------
// 마우스 거리
// -----------------------------
function mouseDistance(playerX, playerY) {

    return Math.hypot(

        mouse.x - playerX,

        mouse.y - playerY

    );

}

// -----------------------------
// 클릭 판정
// -----------------------------
function leftClick() {

    return mouse.left;

}

function rightClick() {

    return mouse.right;

}

// -----------------------------
// 디버그
// -----------------------------
console.log("Input System Loaded");
