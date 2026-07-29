/* ==================================
   ui.js
   가라사대 집중력 게임 UI 관리
================================== */

const UI = {

    score: document.getElementById("score"),
    level: document.getElementById("level"),
    combo: document.getElementById("combo"),
    bestScore: document.getElementById("bestScore"),

    commandBox: document.getElementById("commandBox"),

    status: document.getElementById("status"),

    timerFill: document.getElementById("timerFill"),
    timeText: document.getElementById("timeText"),

    correctCount: document.getElementById("correctCount"),
    wrongCount: document.getElementById("wrongCount"),
    accuracy: document.getElementById("accuracy"),

    gameOver: document.getElementById("gameOver"),
    finalScore: document.getElementById("finalScore"),

    achievementList:
        document.getElementById("achievementList")

};


/* ==========================
   점수판
========================== */

function updateScoreUI(game){

    UI.score.textContent = game.score;
    UI.level.textContent = game.level;
    UI.combo.textContent = game.combo;
    UI.bestScore.textContent = game.bestScore;

}


/* ==========================
   명령 출력
========================== */

function showCommand(command){

    UI.commandBox.textContent = command.text;

}


/* ==========================
   상태 표시
========================== */

function setStatus(text){

    UI.status.textContent = text;

}


/* ==========================
   타이머
========================== */

function updateTimer(remain,max){

    const percent=(remain/max)*100;

    UI.timerFill.style.width=percent+"%";

    UI.timeText.textContent=
        (remain/1000).toFixed(1)+"초";

}


/* ==========================
   통계
========================== */

function updateStatistics(game){

    UI.correctCount.textContent=
        game.correct;

    UI.wrongCount.textContent=
        game.wrong;

    const total=
        game.correct+game.wrong;

    const accuracy=
        total===0
        ?100
        :Math.round(game.correct/total*100);

    UI.accuracy.textContent=
        accuracy+"%";

}


/* ==========================
   성공 효과
========================== */

function successEffect(){

    UI.commandBox.classList.remove("wrongFlash");

    UI.commandBox.classList.add("correctFlash");

    setTimeout(()=>{

        UI.commandBox.classList.remove("correctFlash");

    },500);

}


/* ==========================
   실패 효과
========================== */

function failEffect(){

    UI.commandBox.classList.remove("correctFlash");

    UI.commandBox.classList.add("wrongFlash");
    UI.commandBox.classList.add("shake");

    setTimeout(()=>{

        UI.commandBox.classList.remove("wrongFlash");
        UI.commandBox.classList.remove("shake");

    },500);

}


/* ==========================
   게임 종료
========================== */

function showGameOver(score){

    UI.finalScore.textContent=
        "최종 점수 : "+score;

    UI.gameOver.style.display="flex";

}


/* ==========================
   게임 시작
========================== */

function hideGameOver(){

    UI.gameOver.style.display="none";

}


/* ==========================
   업적
========================== */

function addAchievement(name){

    if(
        UI.achievementList.children.length===1 &&
        UI.achievementList.children[0].innerText==="아직 없습니다."
    ){

        UI.achievementList.innerHTML="";

    }

    const li=document.createElement("li");

    li.textContent=name;

    li.classList.add("unlock");

    UI.achievementList.appendChild(li);

}


/* ==========================
   레벨업 효과
========================== */

function levelUpEffect(){

    UI.level.classList.add("levelUp");

    setTimeout(()=>{

        UI.level.classList.remove("levelUp");

    },800);

}


/* ==========================
   화면 전체 갱신
========================== */

function refreshUI(game){

    updateScoreUI(game);

    updateStatistics(game);

}
