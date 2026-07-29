/* ===================================
   가라사대 집중력 게임
   script.js
   Part 1
=================================== */

const commandBox = document.getElementById("commandBox");

const scoreText = document.getElementById("score");
const comboText = document.getElementById("combo");
const levelText = document.getElementById("level");
const bestScoreText = document.getElementById("bestScore");

const correctBtn = document.getElementById("correctBtn");
const wrongBtn = document.getElementById("wrongBtn");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const playAgain = document.getElementById("playAgain");

const timerFill = document.getElementById("timerFill");
const timeText = document.getElementById("timeText");

const statusText = document.getElementById("status");

const gameOver = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

const correctCountText=document.getElementById("correctCount");
const wrongCountText=document.getElementById("wrongCount");
const accuracyText=document.getElementById("accuracy");


let score=0;
let combo=0;
let level=1;

let bestScore=localStorage.getItem("bestScore") || 0;

bestScoreText.innerText=bestScore;

let correctCount=0;
let wrongCount=0;

let currentCommand=null;

let gameRunning=false;

let timer=null;
let timeLeft=5000;

const commands=[
"가라사대 오른손 드세요",
"가라사대 왼손 드세요",
"가라사대 박수 치세요",
"가라사대 웃으세요",
"가라사대 눈 감으세요",
"가라사대 점프하세요",
"가라사대 브이 하세요",
"가라사대 하트 만드세요",
"가라사대 숫자 7 외치세요",
"가라사대 고개 숙이세요",

"오른손 드세요",
"왼손 드세요",
"점프하세요",
"웃으세요",
"박수 치세요",
"브이 하세요",
"하트 만드세요",
"고개 숙이세요",
"숫자 3 외치세요",
"한 바퀴 도세요"
];


/* ==========================
   시작
========================== */

startBtn.onclick=()=>{

if(gameRunning)return;

gameRunning=true;

resetGame();

nextCommand();

};


/* ==========================
   다시하기
========================== */

restartBtn.onclick=()=>{

resetGame();

nextCommand();

};


/* ==========================
   게임 초기화
========================== */

function resetGame(){

score=0;
combo=0;
level=1;

correctCount=0;
wrongCount=0;

gameOver.classList.remove("show");

updateUI();

}


/* ==========================
   UI
========================== */

function updateUI(){

scoreText.innerText=score;

comboText.innerText=combo;

levelText.innerText=level;

correctCountText.innerText=correctCount;

wrongCountText.innerText=wrongCount;

const total=correctCount+wrongCount;

let acc=0;

if(total>0){

acc=Math.round(correctCount/total*100);

}

accuracyText.innerText=acc+"%";

}


/* ==========================
   다음 명령
========================== */

function nextCommand(){

clearInterval(timer);

currentCommand=commands[
Math.floor(Math.random()*commands.length)
];

commandBox.innerText=currentCommand;

commandBox.className="active fadeIn";

timeLeft=Math.max(
1500,
5000-(level-1)*300
);

timeText.innerText=(timeLeft/1000).toFixed(1)+"초";

startTimer();

speak(currentCommand);

}


/* ==========================
   타이머
========================== */

function startTimer(){

let remain=timeLeft;

timerFill.style.width="100%";

timer=setInterval(()=>{

remain-=100;

const percent=(remain/timeLeft)*100;

timerFill.style.width=percent+"%";

timeText.innerText=(remain/1000).toFixed(1)+"초";

if(remain<=0){

clearInterval(timer);

fail();

}

},100);

}


/* ==========================
   TTS
========================== */

function speak(text){

if(!window.speechSynthesis)return;

speechSynthesis.cancel();

const msg=new SpeechSynthesisUtterance(text);

msg.lang="ko-KR";

msg.rate=1.0;

speechSynthesis.speak(msg);

}
/* ===================================
   script.js
   Part 2
   판정 / 점수 / 레벨 / 게임오버
=================================== */


/* ==========================
   수행 버튼
========================== */

correctBtn.onclick = () => {

    if (!gameRunning) return;

    const answer = currentCommand.startsWith("가라사대");

    if (answer) {

        success();

    } else {

        fail();

    }

};


/* ==========================
   무시 버튼
========================== */

wrongBtn.onclick = () => {

    if (!gameRunning) return;

    const answer = !currentCommand.startsWith("가라사대");

    if (answer) {

        success();

    } else {

        fail();

    }

};


/* ==========================
   성공
========================== */

function success() {

    clearInterval(timer);

    correctCount++;

    combo++;

    score += 10 + combo;

    commandBox.classList.remove("wrongFlash");
    commandBox.classList.add("correctFlash");

    scoreText.classList.add("scoreFlash");
    comboText.classList.add("comboPop");

    if (combo % 5 === 0) {

        level++;

        levelText.classList.add("levelUp");

        statusText.innerText = "🎉 레벨 업!";

    } else {

        statusText.innerText = "정답!";

    }

    if (score > bestScore) {

        bestScore = score;

        localStorage.setItem("bestScore", bestScore);

        bestScoreText.innerText = bestScore;

        bestScoreText.classList.add("bestGlow");

    }

    updateUI();

    setTimeout(() => {

        commandBox.classList.remove("correctFlash");
        scoreText.classList.remove("scoreFlash");
        comboText.classList.remove("comboPop");
        levelText.classList.remove("levelUp");

        nextCommand();

    }, 700);

}


/* ==========================
   실패
========================== */

function fail() {

    clearInterval(timer);

    wrongCount++;

    combo = 0;

    commandBox.classList.remove("correctFlash");
    commandBox.classList.add("wrongFlash");
    commandBox.classList.add("shake");

    statusText.innerText = "❌ 실패!";

    updateUI();

    if (wrongCount >= 5) {

        setTimeout(() => {

            endGame();

        }, 700);

        return;

    }

    setTimeout(() => {

        commandBox.classList.remove("wrongFlash");
        commandBox.classList.remove("shake");

        nextCommand();

    }, 700);

}


/* ==========================
   게임 종료
========================== */

function endGame() {

    gameRunning = false;

    clearInterval(timer);

    finalScore.innerText = "최종 점수 : " + score;

    gameOver.classList.add("show");

}


/* ==========================
   다시 플레이
========================== */

playAgain.onclick = () => {

    gameOver.classList.remove("show");

    resetGame();

    gameRunning = true;

    nextCommand();

};


/* ==========================
   키보드 지원
========================== */

document.addEventListener("keydown", (e) => {

    if (!gameRunning) return;

    if (e.code === "ArrowLeft") {

        correctBtn.click();

    }

    if (e.code === "ArrowRight") {

        wrongBtn.click();

    }

});


/* ==========================
   ESC 종료
========================== */

document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {

        clearInterval(timer);

        endGame();

    }

});


/* ==========================
   창 닫을 때 음성 정지
========================== */

window.onbeforeunload = () => {

    speechSynthesis.cancel();

};


/* ==========================
   첫 실행
========================== */

updateUI();
/* ===================================
   script.js
   Part 3
   명령어 확장 / 업적 / 이벤트
=================================== */


/* ==========================
   추가 명령어 데이터
========================== */

commands.push(

"가라사대 양손을 머리 위로 올리세요",
"가라사대 손뼉 세 번 치세요",
"가라사대 오른쪽을 바라보세요",
"가라사대 왼쪽을 바라보세요",
"가라사대 크게 웃으세요",
"가라사대 조용히 손 흔드세요",
"가라사대 엄지척 하세요",
"가라사대 손가락으로 별 만들기",
"가라사대 팔짱 끼세요",
"가라사대 기지개 켜세요",

"가라사대 한 발로 서세요",
"가라사대 두 손을 앞으로 뻗으세요",
"가라사대 어깨를 움직이세요",
"가라사대 머리를 좌우로 흔드세요",
"가라사대 박수 다섯 번",
"가라사대 숫자 10 외치기",
"가라사대 숫자 5 외치기",

"자리에서 일어나세요",
"손 흔들기",
"박수 치기",
"웃기",
"점프하기",
"뒤돌아보기",
"팔 올리기",

"가라사대 로봇처럼 움직이세요",
"가라사대 천천히 박수치세요",
"가라사대 빠르게 손 흔드세요",
"가라사대 친구에게 인사하세요",
"가라사대 하늘 보기",
"가라사대 바닥 보기"

);


/* ==========================
   업적 데이터
========================== */

const achievements = [

{
    id:"first",
    name:"🎮 첫 시작",
    condition:()=>score>=10
},

{
    id:"combo10",
    name:"🔥 콤보 마스터",
    condition:()=>combo>=10
},

{
    id:"score500",
    name:"⭐ 점수 수집가",
    condition:()=>score>=500
},

{
    id:"level5",
    name:"🚀 고수 등장",
    condition:()=>level>=5
},

{
    id:"perfect",
    name:"👑 완벽 플레이",
    condition:()=>wrongCount===0 && correctCount>=20
}

];


let unlocked=[];


/* ==========================
   업적 확인
========================== */

function checkAchievement(){

    achievements.forEach(item=>{

        if(
            item.condition() &&
            !unlocked.includes(item.id)
        ){

            unlocked.push(item.id);

            showAchievement(item.name);

        }

    });

}


/* ==========================
   업적 표시
========================== */

function showAchievement(name){

    const list=
    document.getElementById("achievementList");


    if(
        list.children.length===1 &&
        list.children[0].innerText==="아직 없습니다."
    ){

        list.innerHTML="";

    }


    const li=document.createElement("li");

    li.innerText=name;

    li.classList.add("unlock");


    list.appendChild(li);


}


/* ==========================
   성공 함수 확장
========================== */

const oldSuccess = success;

success=function(){

    oldSuccess();

    setTimeout(()=>{

        checkAchievement();

    },100);

};


/* ==========================
   랜덤 이벤트
========================== */

const events=[

{
    text:"⚡ 번개 라운드! 시간이 빨라집니다.",
    effect(){

        timeLeft-=1000;

    }
},

{
    text:"🌟 보너스 점수!",
    effect(){

        score+=50;

    }
},

{
    text:"🔥 콤보 유지!",
    effect(){

        combo+=3;

    }
},

{
    text:"😈 장난 명령 등장!",
    effect(){

        commandBox.style.color="#facc15";

    }
}

];


function randomEvent(){

    const chance=Math.random();


    if(chance<0.1){

        const event=
        events[
            Math.floor(Math.random()*events.length)
        ];


        statusText.innerText=
        event.text;


        event.effect();


        updateUI();

    }

}


/* ==========================
   다음 명령 확장
========================== */

const oldNextCommand = nextCommand;

nextCommand=function(){

    oldNextCommand();

    randomEvent();

};


/* ==========================
   숨겨진 명령
========================== */

commands.push(

"가라사대 비밀 모드 실행",

"가라사대 모두 박수",

"가라사대 최고라고 외치기",

"가라사대 게임왕 포즈"

);


/* ==========================
   명령 랜덤 섞기
========================== */

function shuffleCommands(){

    commands.sort(
        ()=>Math.random()-0.5
    );

}


shuffleCommands();
