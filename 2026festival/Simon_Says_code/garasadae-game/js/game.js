/* ==================================
   가라사대 집중력 게임
   game.js Part 1
================================== */


class GarasadaeGame {


    constructor(){


        this.score = 0;

        this.combo = 0;

        this.level = 1;


        this.correct = 0;

        this.wrong = 0;


        this.running = false;


        this.timeLimit = 5000;


        this.timer = null;


        this.currentCommand = null;



        this.commands = [

            {
                text:"가라사대 박수 치세요",
                answer:true
            },

            {
                text:"가라사대 오른손 드세요",
                answer:true
            },

            {
                text:"가라사대 웃으세요",
                answer:true
            },

            {
                text:"가라사대 점프하세요",
                answer:true
            },


            {
                text:"손 흔드세요",
                answer:false
            },


            {
                text:"박수 치세요",
                answer:false
            },


            {
                text:"일어나세요",
                answer:false
            }


        ];



        this.init();

    }



    init(){


        this.commandBox =
        document.querySelector("#commandBox");


        this.scoreText =
        document.querySelector("#score");


        this.comboText =
        document.querySelector("#combo");


        this.levelText =
        document.querySelector("#level");


        this.timerFill =
        document.querySelector("#timerFill");


        this.timeText =
        document.querySelector("#timeText");


        this.statusText =
        document.querySelector("#status");



        document
        .querySelector("#correctBtn")
        .onclick=()=>{

            this.check(true);

        };



        document
        .querySelector("#wrongBtn")
        .onclick=()=>{

            this.check(false);

        };



        document
        .querySelector("#startBtn")
        .onclick=()=>{

            this.start();

        };


    }



    start(){


        this.score=0;

        this.combo=0;

        this.level=1;


        this.correct=0;

        this.wrong=0;


        this.running=true;


        this.updateUI();


        this.nextRound();


    }




    nextRound(){


        if(!this.running)
        return;



        clearInterval(this.timer);



        let random = 
        Math.floor(
            Math.random()*this.commands.length
        );


        this.currentCommand =
        this.commands[random];



        this.commandBox.innerText =
        this.currentCommand.text;



        this.startTimer();


    }




    startTimer(){


        let remain =
        this.timeLimit -
        ((this.level-1)*300);



        if(remain<1500){

            remain=1500;

        }



        let current=remain;



        this.timer=setInterval(()=>{


            current-=100;


            let percent =
            (current/remain)*100;



            this.timerFill.style.width =
            percent+"%";



            this.timeText.innerText =
            (current/1000).toFixed(1)
            +"초";



            if(current<=0){


                clearInterval(this.timer);


                this.fail();


            }



        },100);


    }




    check(playerAnswer){


        if(!this.running)
        return;



        clearInterval(this.timer);



        if(
            playerAnswer ===
            this.currentCommand.answer
        ){


            this.success();


        }

        else{


            this.fail();


        }



    }




    success(){


        this.correct++;


        this.combo++;


        this.score +=
        10+(this.combo*2);



        if(this.combo%5===0){


            this.level++;


        }



        this.statusText.innerText=
        "정답! 🎉";



        this.updateUI();



        setTimeout(()=>{

            this.nextRound();

        },600);



    }




    fail(){


        this.wrong++;


        this.combo=0;



        this.statusText.innerText=
        "실패! 😢";



        this.updateUI();



        setTimeout(()=>{


            this.nextRound();


        },700);



    }




    updateUI(){


        this.scoreText.innerText=
        this.score;


        this.comboText.innerText=
        this.combo;


        this.levelText.innerText=
        this.level;


    }




    stop(){


        this.running=false;


        clearInterval(this.timer);


        this.statusText.innerText=
        "게임 종료";


    }


}



/* =========================
   게임 실행
========================= */


const game =
new GarasadaeGame();
/* ==================================
   game.js Part 2
   난이도 / 저장 / TTS / 업적
================================== */


/* =========================
   최고 점수 불러오기
========================= */

GarasadaeGame.prototype.loadBestScore = function () {

    this.bestScore =
        Number(localStorage.getItem("bestScore")) || 0;

    const best = document.querySelector("#bestScore");

    if (best) {
        best.innerText = this.bestScore;
    }

};


/* =========================
   최고 점수 저장
========================= */

GarasadaeGame.prototype.saveBestScore = function () {

    if (this.score > this.bestScore) {

        this.bestScore = this.score;

        localStorage.setItem(
            "bestScore",
            this.bestScore
        );

        const best =
            document.querySelector("#bestScore");

        if (best) {
            best.innerText = this.bestScore;
        }

    }

};


/* =========================
   정확도 계산
========================= */

GarasadaeGame.prototype.updateAccuracy =
function () {

    const total =
        this.correct + this.wrong;

    const accuracy =
        total === 0
            ? 100
            : Math.round(
                (this.correct / total) * 100
            );

    const accuracyText =
        document.querySelector("#accuracy");

    if (accuracyText) {

        accuracyText.innerText =
            accuracy + "%";

    }

};


/* =========================
   난이도 조절
========================= */

GarasadaeGame.prototype.updateDifficulty =
function () {

    if (this.level < 3) {

        this.timeLimit = 5000;

    }

    else if (this.level < 6) {

        this.timeLimit = 4000;

    }

    else if (this.level < 10) {

        this.timeLimit = 3000;

    }

    else if (this.level < 15) {

        this.timeLimit = 2000;

    }

    else {

        this.timeLimit = 1000;

    }

};


/* =========================
   TTS
========================= */

GarasadaeGame.prototype.speak =
function (text) {

    if (!("speechSynthesis" in window))
        return;

    speechSynthesis.cancel();

    const msg =
        new SpeechSynthesisUtterance(text);

    msg.lang = "ko-KR";

    msg.rate = 1;

    msg.pitch = 1;

    speechSynthesis.speak(msg);

};


/* =========================
   nextRound 확장
========================= */

const oldNextRound =
GarasadaeGame.prototype.nextRound;

GarasadaeGame.prototype.nextRound =
function () {

    oldNextRound.call(this);

    this.speak(
        this.currentCommand.text
    );

};


/* =========================
   success 확장
========================= */

const oldSuccess =
GarasadaeGame.prototype.success;

GarasadaeGame.prototype.success =
function () {

    oldSuccess.call(this);

    this.saveBestScore();

    this.updateDifficulty();

    this.updateAccuracy();

    this.checkAchievements();

};


/* =========================
   fail 확장
========================= */

const oldFail =
GarasadaeGame.prototype.fail;

GarasadaeGame.prototype.fail =
function () {

    oldFail.call(this);

    this.updateAccuracy();

};


/* =========================
   업적
========================= */

GarasadaeGame.prototype.achievements = [

    {
        id: "first",
        title: "🎮 첫 성공",
        check(game) {
            return game.correct >= 1;
        }
    },

    {
        id: "combo10",
        title: "🔥 10콤보",
        check(game) {
            return game.combo >= 10;
        }
    },

    {
        id: "score500",
        title: "⭐ 500점",
        check(game) {
            return game.score >= 500;
        }
    },

    {
        id: "level10",
        title: "🚀 레벨10",
        check(game) {
            return game.level >= 10;
        }
    }

];

GarasadaeGame.prototype.unlocked = [];


/* =========================
   업적 확인
========================= */

GarasadaeGame.prototype.checkAchievements =
function () {

    this.achievements.forEach(a => {

        if (
            a.check(this) &&
            !this.unlocked.includes(a.id)
        ) {

            this.unlocked.push(a.id);

            console.log(
                "업적 달성:",
                a.title
            );

        }

    });

};


/* =========================
   게임 종료
========================= */

GarasadaeGame.prototype.stop =
function () {

    this.running = false;

    clearInterval(this.timer);

    speechSynthesis.cancel();

    this.saveBestScore();

    this.statusText.innerText =
        "게임 종료";

};


/* =========================
   생성자 마지막에 추가
========================= */

// init() 호출 후
// this.loadBestScore();
