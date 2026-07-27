// ===============================
// // coins.js
// Find the Coins
// ===============================

// 동전 종류
const CoinType = {
    NORMAL: "normal",
    RARE: "rare",
    RAINBOW: "rainbow",
    KING: "king",
    CURSED: "cursed"
};

// -------------------------------
// 동전 클래스
// -------------------------------

class Coin {

    constructor(x, y, type = CoinType.NORMAL) {

        this.x = x;
        this.y = y;

        this.radius = 14;

        this.type = type;

        this.collected = false;

        this.rotation = 0;

        switch (type) {

            case CoinType.NORMAL:
                this.value = 1;
                this.color = "#FFD700";
                break;

            case CoinType.RARE:
                this.value = 5;
                this.color = "#00BFFF";
                break;

            case CoinType.RAINBOW:
                this.value = 10;
                this.color = "#FF00FF";
                break;

            case CoinType.KING:
                this.value = 50;
                this.color = "#FF8C00";
                break;

            case CoinType.CURSED:
                this.value = -5;
                this.color = "#7A00CC";
                break;

        }

    }

    //--------------------------------

    update(deltaTime) {

        this.rotation += deltaTime * 4;

    }

    //--------------------------------

    draw(ctx) {

        if (this.collected) return;

        ctx.save();

        ctx.translate(this.x, this.y);

        ctx.scale(Math.cos(this.rotation), 1);

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);

        ctx.fillStyle = this.color;
        ctx.fill();

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#222";
        ctx.stroke();

        ctx.restore();

    }

    //--------------------------------

    collect(player) {

        if (this.collected) return;

        this.collected = true;

        switch (this.type) {

            case CoinType.NORMAL:
                player.coins += 1;
                break;

            case CoinType.RARE:
                player.coins += 5;
                break;

            case CoinType.RAINBOW:
                player.coins += 10;
                break;

            case CoinType.KING:
                player.coins += 50;
                player.kingCoins++;
                break;

            case CoinType.CURSED:

                player.coins = Math.max(0, player.coins - 5);

                if (player.health !== undefined) {

                    player.health = Math.max(
                        0,
                        player.health - 10
                    );

                }

                break;

        }

        if (window.soundManager) {

            soundManager.play("coin");

        }

    }

}

// ===================================
// 동전 관리자
// ===================================

class CoinManager {

    constructor() {

        this.coins = [];

    }

    //--------------------------------

    add(x, y, type = CoinType.NORMAL) {

        this.coins.push(
            new Coin(x, y, type)
        );

    }

    //--------------------------------

    generateRandom(width, height, amount) {

        const types = [

            CoinType.NORMAL,
            CoinType.NORMAL,
            CoinType.NORMAL,
            CoinType.NORMAL,
            CoinType.RARE,
            CoinType.RARE,
            CoinType.RAINBOW,
            CoinType.CURSED

        ];

        for (let i = 0; i < amount; i++) {

            const x = Math.random() * width;
            const y = Math.random() * height;

            const type =
                types[
                    Math.floor(
                        Math.random() * types.length
                    )
                ];

            this.add(x, y, type);

        }

        // 왕의 동전은 맵당 하나

        this.add(

            Math.random() * width,
            Math.random() * height,

            CoinType.KING

        );

    }

    //--------------------------------

    update(deltaTime, player) {

        for (const coin of this.coins) {

            if (coin.collected) continue;

            coin.update(deltaTime);

            const dx = player.x - coin.x;
            const dy = player.y - coin.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < player.collectRadius) {

                coin.collect(player);

            }

        }

    }

    //--------------------------------

    draw(ctx) {

        for (const coin of this.coins) {

            coin.draw(ctx);

        }

    }

    //--------------------------------

    reset() {

        this.coins = [];

    }

    //--------------------------------

    getRemainingCoins() {

        return this.coins.filter(
            coin => !coin.collected
        ).length;

    }

}

// ===================================
// 전역 객체
// ===================================

const coinManager = new CoinManager();
