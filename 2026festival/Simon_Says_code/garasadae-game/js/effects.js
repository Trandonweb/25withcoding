/* ==================================
   effects.js
   가라사대 집중력 게임 효과 관리
================================== */

class EffectManager {

    constructor() {

        this.body = document.body;
        this.commandBox = document.getElementById("commandBox");

    }

    /* ==========================
       화면 흔들기
    ========================== */

    shake(duration = 500) {

        this.body.classList.add("shake");

        setTimeout(() => {

            this.body.classList.remove("shake");

        }, duration);

    }

    /* ==========================
       명령창 성공 효과
    ========================== */

    success() {

        this.commandBox.classList.remove("wrongFlash");

        this.commandBox.classList.add("correctFlash");

        setTimeout(() => {

            this.commandBox.classList.remove("correctFlash");

        }, 500);

    }

    /* ==========================
       명령창 실패 효과
    ========================== */

    fail() {

        this.commandBox.classList.remove("correctFlash");

        this.commandBox.classList.add("wrongFlash");

        this.shake();

        setTimeout(() => {

            this.commandBox.classList.remove("wrongFlash");

        }, 500);

    }

    /* ==========================
       레벨업 효과
    ========================== */

    levelUp() {

        const div = document.createElement("div");

        div.className = "levelUpEffect";

        div.innerText = "LEVEL UP!";

        document.body.appendChild(div);

        setTimeout(() => {

            div.remove();

        }, 1500);

    }

    /* ==========================
       점수 팝업
    ========================== */

    scorePopup(score) {

        const popup = document.createElement("div");

        popup.className = "scorePopup";

        popup.innerText = "+" + score;

        document.body.appendChild(popup);

        setTimeout(() => {

            popup.remove();

        }, 1000);

    }

    /* ==========================
       업적 팝업
    ========================== */

    achievement(name) {

        const popup = document.createElement("div");

        popup.className = "achievementPopup";

        popup.innerHTML = "🏆 " + name;

        document.body.appendChild(popup);

        setTimeout(() => {

            popup.remove();

        }, 2500);

    }

    /* ==========================
       폭죽 파티클
    ========================== */

    confetti(count = 50) {

        for (let i = 0; i < count; i++) {

            const particle = document.createElement("div");

            particle.className = "particle";

            particle.style.left =
                Math.random() * window.innerWidth + "px";

            particle.style.top = "-20px";

            particle.style.animationDuration =
                (Math.random() * 2 + 2) + "s";

            particle.style.background =
                `hsl(${Math.random() * 360},100%,60%)`;

            document.body.appendChild(particle);

            setTimeout(() => {

                particle.remove();

            }, 4000);

        }

    }

    /* ==========================
       버튼 클릭 애니메이션
    ========================== */

    buttonClick(button) {

        button.classList.add("buttonPop");

        setTimeout(() => {

            button.classList.remove("buttonPop");

        }, 200);

    }

    /* ==========================
       게임 시작
    ========================== */

    gameStart() {

        this.confetti(30);

    }

    /* ==========================
       게임 종료
    ========================== */

    gameOver() {

        this.shake(800);

        this.confetti(80);

    }

}

const effects = new EffectManager();


/* ==========================
   버튼 효과 자동 적용
========================== */

document.querySelectorAll("button").forEach(button => {

    button.addEventListener("click", () => {

        effects.buttonClick(button);

    });

});
