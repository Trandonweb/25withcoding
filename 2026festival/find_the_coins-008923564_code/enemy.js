// ===============================
// enemy.js
// Find the Coins
// ===============================

// 적 종류
const EnemyType = {
    PATROL: "patrol",
    CHASER: "chaser",
    SHOOTER: "shooter",
    BOSS: "boss"
};

// -------------------------------
// 적 클래스
// -------------------------------

class Enemy {

    constructor(x, y, type = EnemyType.PATROL) {

        this.x = x;
        this.y = y;

        this.spawnX = x;
        this.spawnY = y;

        this.type = type;

        this.radius = 20;

        this.speed = 80;

        this.health = 100;

        this.direction = 1;

        this.attackCooldown = 0;

        switch(type){

            case EnemyType.PATROL:
                this.color = "#ff5555";
                this.speed = 60;
                break;

            case EnemyType.CHASER:
                this.color = "#ff2222";
                this.speed = 120;
                break;

            case EnemyType.SHOOTER:
                this.color = "#8844ff";
                this.speed = 50;
                break;

            case EnemyType.BOSS:
                this.color = "#222222";
                this.speed = 70;
                this.health = 1000;
                this.radius = 40;
                break;

        }

    }

    //--------------------------------

    update(deltaTime, player){

        switch(this.type){

            case EnemyType.PATROL:
                this.patrol(deltaTime);
                break;

            case EnemyType.CHASER:
                this.chase(deltaTime, player);
                break;

            case EnemyType.SHOOTER:
                this.keepDistance(deltaTime, player);
                break;

            case EnemyType.BOSS:
                this.chase(deltaTime, player);
                break;

        }

        this.attackCooldown -= deltaTime;

        this.hitPlayer(player);

    }

    //--------------------------------

    patrol(deltaTime){

        this.x += this.direction * this.speed * deltaTime;

        if(this.x > this.spawnX + 120){

            this.direction = -1;

        }

        if(this.x < this.spawnX - 120){

            this.direction = 1;

        }

    }

    //--------------------------------

    chase(deltaTime, player){

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.hypot(dx, dy);

        if(distance > 0){

            this.x += dx / distance * this.speed * deltaTime;
            this.y += dy / distance * this.speed * deltaTime;

        }

    }

    //--------------------------------

    keepDistance(deltaTime, player){

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.hypot(dx, dy);

        if(distance < 180){

            this.x -= dx / distance * this.speed * deltaTime;
            this.y -= dy / distance * this.speed * deltaTime;

        }

        if(distance > 240){

            this.x += dx / distance * this.speed * deltaTime;
            this.y += dy / distance * this.speed * deltaTime;

        }

    }

    //--------------------------------

    hitPlayer(player){

        const dx = player.x - this.x;
        const dy = player.y - this.y;

        const distance = Math.hypot(dx, dy);

        if(distance < this.radius + player.radius){

            if(this.attackCooldown <= 0){

                player.health -= 10;

                if(player.health < 0){

                    player.health = 0;

                }

                this.attackCooldown = 1;

            }

        }

    }

    //--------------------------------

    draw(ctx){

        ctx.beginPath();

        ctx.arc(
            this.x,
            this.y,
            this.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = this.color;

        ctx.fill();

        // 체력바

        ctx.fillStyle = "red";

        ctx.fillRect(
            this.x - 25,
            this.y - this.radius - 18,
            50,
            6
        );

        ctx.fillStyle = "lime";

        const width = (this.health / 1000) * 50;

        ctx.fillRect(
            this.x - 25,
            this.y - this.radius - 18,
            Math.max(0, width),
            6
        );

    }

}

// =====================================
// 적 관리자
// =====================================

class EnemyManager{

    constructor(){

        this.enemies = [];

    }

    //--------------------------------

    add(x, y, type){

        this.enemies.push(
            new Enemy(x, y, type)
        );

    }

    //--------------------------------

    update(deltaTime, player){

        for(const enemy of this.enemies){

            enemy.update(deltaTime, player);

        }

    }

    //--------------------------------

    draw(ctx){

        for(const enemy of this.enemies){

            enemy.draw(ctx);

        }

    }

    //--------------------------------

    removeDead(){

        this.enemies = this.enemies.filter(
            enemy => enemy.health > 0
        );

    }

    //--------------------------------

    clear(){

        this.enemies = [];

    }

}

// =====================================
// 전역 객체
// =====================================

const enemyManager = new EnemyManager();

// =====================================
// 예시 적 생성
// =====================================

enemyManager.add(300, 300, EnemyType.PATROL);

enemyManager.add(700, 250, EnemyType.CHASER);

enemyManager.add(1000, 450, EnemyType.SHOOTER);

enemyManager.add(1600, 800, EnemyType.BOSS);
