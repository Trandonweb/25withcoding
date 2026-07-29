/* ==========================================================
   main.js
   Part 1
   Three.js 초기화
========================================================== */

import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";

/* ===========================
   기본 변수
=========================== */

let scene;
let camera;
let renderer;
let clock;

/* 플레이어 */

export let player;

/* NPC */

export const npcs = [];

/* 코인 */

export const coins = [];

/* ===========================
   Scene 생성
=========================== */

scene = new THREE.Scene();

scene.background = new THREE.Color(0x87CEEB);

/* ===========================
   Camera 생성
=========================== */

camera = new THREE.PerspectiveCamera(

    75,

    window.innerWidth / window.innerHeight,

    0.1,

    1000

);

camera.position.set(

    0,

    2,

    5

);

/* ===========================
   Renderer 생성
=========================== */

renderer = new THREE.WebGLRenderer({

    canvas:document.getElementById("gameCanvas"),

    antialias:true

});

renderer.setSize(

    window.innerWidth,

    window.innerHeight

);

renderer.setPixelRatio(

    window.devicePixelRatio

);

renderer.shadowMap.enabled=true;

renderer.shadowMap.type=

THREE.PCFSoftShadowMap;

/* ===========================
   Clock
=========================== */

clock=new THREE.Clock();

/* ===========================
   안개
=========================== */

scene.fog=

new THREE.Fog(

0x87CEEB,

80,

250

);

/* ===========================
   Ambient Light
=========================== */

const ambient=

new THREE.AmbientLight(

0xffffff,

1.2

);

scene.add(

ambient

);

/* ===========================
   Directional Light
=========================== */

const sun=

new THREE.DirectionalLight(

0xffffff,

2

);

sun.position.set(

30,

60,

30

);

sun.castShadow=true;

sun.shadow.mapSize.width=4096;

sun.shadow.mapSize.height=4096;

scene.add(

sun

);

/* ===========================
   Resize
=========================== */

window.addEventListener(

"resize",

()=>{

camera.aspect=

window.innerWidth/

window.innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(

window.innerWidth,

window.innerHeight

);

}

);

/* ===========================
   게임 시작 버튼
=========================== */

const startButton=

document.getElementById(

"startBtn"

);

startButton.onclick=()=>{

document.getElementById(

"menu"

).style.display="none";

};

/* ===========================
   Export
=========================== */

export{

scene,

camera,

renderer,

clock

};
/* ==========================================================
   main.js
   Part 2
   맵 생성
========================================================== */

import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";

/* ===========================
   바닥
=========================== */

const groundGeometry = new THREE.PlaneGeometry(200,200);

const groundMaterial =
new THREE.MeshStandardMaterial({

    color:0x4CAF50

});

const ground =
new THREE.Mesh(

    groundGeometry,

    groundMaterial

);

ground.rotation.x =
-Math.PI/2;

ground.receiveShadow=true;

scene.add(ground);

/* ===========================
   Grid
=========================== */

const grid =
new THREE.GridHelper(

200,
200,
0xffffff,
0x999999

);

grid.position.y=0.01;

scene.add(grid);

/* ===========================
   하늘
=========================== */

const skyGeometry =
new THREE.SphereGeometry(

500,
32,
32

);

const skyMaterial =
new THREE.MeshBasicMaterial({

    color:0x87CEEB,

    side:THREE.BackSide

});

const sky =
new THREE.Mesh(

skyGeometry,

skyMaterial

);

scene.add(sky);

/* ===========================
   플레이어 시작 위치
=========================== */

const spawnPoint =
new THREE.Vector3(

0,
1,
0

);

/* ===========================
   NPC 위치
=========================== */

const npcSpawn =
new THREE.Vector3(

15,
1,
0

);

/* ===========================
   코인 위치
=========================== */

const coinSpawns=[

new THREE.Vector3(10,1,10),
new THREE.Vector3(-15,1,20),
new THREE.Vector3(35,1,-10),
new THREE.Vector3(-40,1,-20),
new THREE.Vector3(60,1,40),
new THREE.Vector3(-60,1,-35),
new THREE.Vector3(80,1,15),
new THREE.Vector3(-90,1,60)

];

/* ===========================
   나무 생성 함수
=========================== */

function createTree(x,z){

    const group =
    new THREE.Group();

    // 줄기

    const trunk =
    new THREE.Mesh(

        new THREE.CylinderGeometry(
        0.4,
        0.6,
        4,
        8),

        new THREE.MeshStandardMaterial({

            color:0x8D6E63

        })

    );

    trunk.position.y=2;

    trunk.castShadow=true;

    group.add(trunk);

    // 잎

    const leaf =
    new THREE.Mesh(

        new THREE.SphereGeometry(

            2.2,

            16,

            16

        ),

        new THREE.MeshStandardMaterial({

            color:0x2E7D32

        })

    );

    leaf.position.y=5;

    leaf.castShadow=true;

    group.add(leaf);

    group.position.set(

        x,
        0,
        z

    );

    scene.add(group);

}

/* ===========================
   숲 생성
=========================== */

for(let i=0;i<120;i++){

    const x=
    Math.random()*180-90;

    const z=
    Math.random()*180-90;

    if(Math.abs(x)<10 && Math.abs(z)<10){

        continue;

    }

    createTree(x,z);

}

/* ===========================
   스폰 표시
=========================== */

const spawnMarker =
new THREE.Mesh(

new THREE.CylinderGeometry(

2,
2,
0.2,
32

),

new THREE.MeshStandardMaterial({

color:0x2196F3

})

);

spawnMarker.position.copy(spawnPoint);

spawnMarker.position.y=0.1;

scene.add(spawnMarker);

/* ===========================
   NPC 표시
=========================== */

const npcMarker =
new THREE.Mesh(

new THREE.CylinderGeometry(

2,
2,
0.2,
32

),

new THREE.MeshStandardMaterial({

color:0xFFD700

})

);

npcMarker.position.copy(npcSpawn);

npcMarker.position.y=0.1;

scene.add(npcMarker);

/* ===========================
   맵 경계
=========================== */

const worldSize=100;
/* ==========================================================
   main.js
   Part 3
   Player Controller
========================================================== */

const keys = {};

let yaw = 0;
let pitch = 0;

let velocityY = 0;
let onGround = true;

const player = {

    position: new THREE.Vector3(
        spawnPoint.x,
        1.8,
        spawnPoint.z
    ),

    speed: 8,

    sprint: 15

};

/* ===========================
   키 입력
=========================== */

window.addEventListener("keydown",(e)=>{

    keys[e.code]=true;

});

window.addEventListener("keyup",(e)=>{

    keys[e.code]=false;

});

/* ===========================
   Pointer Lock
=========================== */

renderer.domElement.addEventListener("click",()=>{

    renderer.domElement.requestPointerLock();

});

document.addEventListener("mousemove",(e)=>{

    if(document.pointerLockElement!==renderer.domElement){

        return;

    }

    yaw-=e.movementX*0.002;

    pitch-=e.movementY*0.002;

    const limit=Math.PI/2-0.05;

    pitch=Math.max(-limit,Math.min(limit,pitch));

});

/* ===========================
   Player Update
=========================== */

function updatePlayer(delta){

    let moveX=0;
    let moveZ=0;

    if(keys["KeyW"]) moveZ-=1;
    if(keys["KeyS"]) moveZ+=1;
    if(keys["KeyA"]) moveX-=1;
    if(keys["KeyD"]) moveX+=1;

    const length=Math.hypot(moveX,moveZ);

    if(length>0){

        moveX/=length;
        moveZ/=length;

    }

    const speed=

    keys["ShiftLeft"]

    ?player.sprint

    :player.speed;

    const sin=Math.sin(yaw);
    const cos=Math.cos(yaw);

    player.position.x+=

    (moveX*cos-moveZ*sin)

    *speed*delta;

    player.position.z+=

    (moveX*sin+moveZ*cos)

    *speed*delta;

    /* 점프 */

    if(keys["Space"]&&onGround){

        velocityY=8;

        onGround=false;

    }

    velocityY-=20*delta;

    player.position.y+=velocityY*delta;

    if(player.position.y<1.8){

        player.position.y=1.8;

        velocityY=0;

        onGround=true;

    }

}

/* ===========================
   Camera
=========================== */

function updateCamera(){

    camera.position.copy(player.position);

    camera.rotation.order="YXZ";

    camera.rotation.y=yaw;

    camera.rotation.x=pitch;

}

/* ===========================
   Animation
=========================== */

function animate(){

    requestAnimationFrame(animate);

    const delta=clock.getDelta();

    updatePlayer(delta);

    updateCamera();

    renderer.render(scene,camera);

}

animate();
/* ==========================================================
   main.js
   Part 4
   NPC / Coin / World
========================================================== */

/* ===========================
   NPC 생성
=========================== */

const npc = new THREE.Mesh(

    new THREE.CapsuleGeometry(0.6,1.2,8,16),

    new THREE.MeshStandardMaterial({

        color:0xffaa00

    })

);

npc.castShadow=true;

npc.position.copy(npcSpawn);

scene.add(npc);


/* ===========================
   코인 생성
=========================== */

coinSpawns.forEach(pos=>{

    const coin=new THREE.Mesh(

        new THREE.CylinderGeometry(

            0.5,
            0.5,
            0.15,
            32

        ),

        new THREE.MeshStandardMaterial({

            color:0xffd700,
            metalness:1,
            roughness:.2

        })

    );

    coin.rotation.x=Math.PI/2;

    coin.position.copy(pos);

    scene.add(coin);

    coins.push(coin);

});


/* ===========================
   코인 회전
=========================== */

function updateCoins(delta){

    coins.forEach(c=>{

        c.rotation.z+=delta*2;

    });

}


/* ===========================
   코인 획득
=========================== */

function collectCoins(){

    for(let i=coins.length-1;i>=0;i--){

        const coin=coins[i];

        if(

            player.position.distanceTo(

                coin.position

            )<2

        ){

            scene.remove(coin);

            coins.splice(i,1);

            if(typeof sound!="undefined"){

                sound.playCorrect();

            }

            if(typeof effects!="undefined"){

                effects.scorePopup(50);

            }

            console.log("코인 획득!");

        }

    }

}


/* ===========================
   NPC 거리
=========================== */

function updateNPC(){

    const ui=

    document.getElementById(

        "interact"

    );

    const distance=

    player.position.distanceTo(

        npc.position

    );

    if(distance<4){

        ui.style.display="block";

    }

    else{

        ui.style.display="none";

    }

}


/* ===========================
   E키
=========================== */

window.addEventListener(

"keydown",

e=>{

if(e.code==="KeyE"){

const d=

player.position.distanceTo(

npc.position

);

if(d<4){

document.getElementById(

"npcDialog"

).style.display="block";

document.getElementById(

"dialogText"

).innerText=

"가라사대 게임을 시작합니다!";

if(typeof tts!="undefined"){

tts.speak(

"가라사대 게임을 시작합니다."

);

}

}

}

}

);


/* ===========================
   월드 경계
=========================== */

function worldLimit(){

player.position.x=

Math.max(

-worldSize,

Math.min(

worldSize,

player.position.x

)

);

player.position.z=

Math.max(

-worldSize,

Math.min(

worldSize,

player.position.z

)

);

}


/* ===========================
   로딩 제거
=========================== */

window.onload=()=>{

document.getElementById(

"loading"

).style.display="none";

};


/* ===========================
   시작 버튼
=========================== */

startButton.onclick=()=>{

document.getElementById(

"menu"

).style.display="none";

renderer.domElement.requestPointerLock();

};


/* ===========================
   Animation 수정
=========================== */

function animate(){

requestAnimationFrame(

animate

);

const delta=

clock.getDelta();

updatePlayer(delta);

updateCamera();

updateCoins(delta);

collectCoins();

updateNPC();

worldLimit();

renderer.render(

scene,

camera

);

}

animate();
