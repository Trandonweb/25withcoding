// ==========================================
// camera.js
// ==========================================

// 카메라 객체
const camera = {

    x: 0,
    y: 0,

    targetX: 0,
    targetY: 0,

    smooth: 0.12,

    zoom: 1,
    minZoom: 0.7,
    maxZoom: 2.0

};


// ==========================================
// 카메라 업데이트
// ==========================================
function updateCamera() {

    if (typeof player === "undefined") return;

    // ------------------------
    // 화면 중앙 기준
    // ------------------------
    camera.targetX =
        player.x - canvas.width / 2 / camera.zoom;

    camera.targetY =
        player.y - canvas.height / 2 / camera.zoom;


    // ------------------------
    // 마우스 방향으로 약간 시야 이동
    // ------------------------
    const offsetX =
        (mouse.x - canvas.width / 2) * 0.15;

    const offsetY =
        (mouse.y - canvas.height / 2) * 0.15;

    camera.targetX += offsetX;
    camera.targetY += offsetY;


    // ------------------------
    // 부드러운 이동
    // ------------------------
    camera.x +=
        (camera.targetX - camera.x) * camera.smooth;

    camera.y +=
        (camera.targetY - camera.y) * camera.smooth;


    // ------------------------
    // 맵 경계
    // ------------------------
    camera.x = Math.max(
        0,
        Math.min(
            camera.x,
            mapWidth - canvas.width / camera.zoom
        )
    );

    camera.y = Math.max(
        0,
        Math.min(
            camera.y,
            mapHeight - canvas.height / camera.zoom
        )
    );

}


// ==========================================
// 줌 기능
// ==========================================
window.addEventListener("wheel", function(e){

    if(e.deltaY < 0){

        camera.zoom += 0.1;

    }else{

        camera.zoom -= 0.1;

    }

    camera.zoom = Math.max(
        camera.minZoom,
        Math.min(camera.zoom, camera.maxZoom)
    );

});


// ==========================================
// 카메라 적용
// ==========================================
function beginCamera(ctx){

    ctx.save();

    ctx.scale(
        camera.zoom,
        camera.zoom
    );

}

function endCamera(ctx){

    ctx.restore();

}


// ==========================================
// 월드 좌표 → 화면 좌표
// ==========================================
function worldToScreen(x, y){

    return {

        x:(x-camera.x)*camera.zoom,

        y:(y-camera.y)*camera.zoom

    };

}


// ==========================================
// 화면 좌표 → 월드 좌표
// ==========================================
function screenToWorld(x, y){

    return {

        x:x/camera.zoom+camera.x,

        y:y/camera.zoom+camera.y

    };

}


// ==========================================
// 카메라 흔들림
// ==========================================
let shakeTime = 0;
let shakePower = 0;

function shake(power,time){

    shakePower = power;

    shakeTime = time;

}

function updateCameraShake(){

    if(shakeTime<=0) return;

    shakeTime--;

    camera.x +=
        (Math.random()-0.5)*shakePower;

    camera.y +=
        (Math.random()-0.5)*shakePower;

}


// ==========================================
// 디버그
// ==========================================
console.log("Camera Loaded");


