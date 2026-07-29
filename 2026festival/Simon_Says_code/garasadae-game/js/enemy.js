// ==========================================
// enemy.js
// ==========================================

// ----------------------------
// 몬스터 목록
// ----------------------------
const enemies = [];

// ----------------------------
// 몬스터 생성
// ----------------------------
function addEnemy(x, y) {

    enemies.push({

        x: x,
        y: y,

        width: 36,
        height: 36,

        hp: 50,
        maxHp: 50,

        speed: 1.4,

        damage: 10,

        attackRange: 40,
        detectRange: 250,

        alive: true,

        respawnTime: 300,

        timer: 0

    });

}

// ----------------------------
// 여러 마리 생성
// ----------------------------
for(let i=0;i<20;i++){

    addEnemy(

        Math.random()*mapWidth,

        Math.random()*mapHeight

    );

}

// ----------------------------
// 업데이트
// ----------------------------
function updateEnemy(){

    for(const enemy of enemies){

        // 죽은 경우
        if(!enemy.alive){

            enemy.timer++;

            if(enemy.timer>=enemy.respawnTime){

                enemy.timer=0;

                enemy.alive=true;

                enemy.hp=enemy.maxHp;

                enemy.x=Math.random()*mapWidth;
                enemy.y=Math.random()*mapHeight;

            }

            continue;

        }

        const dx=player.x-enemy.x;
        const dy=player.y-enemy.y;

        const dist=Math.hypot(dx,dy);

        // 플레이어 추적
        if(dist<enemy.detectRange){

            enemy.x+=dx/dist*enemy.speed;
            enemy.y+=dy/dist*enemy.speed;

        }

        // 공격
        if(dist<enemy.attackRange){

            damage(enemy.damage*0.02);

        }

    }

}

// ----------------------------
// 그리기
// ----------------------------
function drawEnemy(ctx){

    for(const enemy of enemies){

        if(!enemy.alive) continue;

        const x=enemy.x-camera.x;
        const y=enemy.y-camera.y;

        // 몸
        ctx.beginPath();

        ctx.arc(
            x,
            y,
            18,
            0,
            Math.PI*2
        );

        ctx.fillStyle="#4caf50";

        ctx.fill();

        // 눈
        ctx.fillStyle="white";

        ctx.beginPath();
        ctx.arc(x-6,y-4,3,0,Math.PI*2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x+6,y-4,3,0,Math.PI*2);
        ctx.fill();

        // 입
        ctx.strokeStyle="black";
        ctx.lineWidth=2;

        ctx.beginPath();
        ctx.arc(
            x,
            y+4,
            6,
            0,
            Math.PI
        );

        ctx.stroke();

        // HP바
        ctx.fillStyle="red";

        ctx.fillRect(
            x-20,
            y-28,
            40,
            5
        );

        ctx.fillStyle="lime";

        ctx.fillRect(
            x-20,
            y-28,
            40*(enemy.hp/enemy.maxHp),
            5
        );

    }

}

// ----------------------------
// 공격 판정
// ----------------------------
function attackEnemy(){

    for(const enemy of enemies){

        if(!enemy.alive) continue;

        const dist=Math.hypot(

            player.x-enemy.x,

            player.y-enemy.y

        );

        if(dist<70){

            enemy.hp-=20;

            // 카메라 흔들림
            if(typeof shake==="function"){

                shake(6,10);

            }

            if(enemy.hp<=0){

                enemy.alive=false;

                enemy.timer=0;

            }

        }

    }

}

// ----------------------------
// 좌클릭 공격
// ----------------------------
window.addEventListener("mousedown",function(e){

    if(e.button===0){

        attackEnemy();

    }

});

// ----------------------------
// 디버그
// ----------------------------
console.log("Enemy Loaded");
