// baseball.js

let baseballDifficulty = null;


const baseballSettings = {

    easy:{
        hitRate:0.55,
        aiScoreRate:0.25,
        speed:1200
    },

    normal:{
        hitRate:0.40,
        aiScoreRate:0.45,
        speed:900
    },

    hard:{
        hitRate:0.25,
        aiScoreRate:0.70,
        speed:600
    }

};



// 난이도 선택
function selectBaseballDifficulty(level){

    baseballDifficulty = level;

    console.log(
        "Difficulty:",
        level
    );

    startBaseball();

}



// 시작 화면
function baseballMenu(){

    let game=document.getElementById("game");

    game.innerHTML=`

    <h2>⚾ Baseball</h2>

    <h3>난이도 선택</h3>


    <button onclick="selectBaseballDifficulty('easy')">
    🟢 쉬움
    </button>


    <button onclick="selectBaseballDifficulty('normal')">
    🟡 보통
    </button>


    <button onclick="selectBaseballDifficulty('hard')">
    🔴 어려움
    </button>

    `;

}




// 타격
function swing(){

    if(!baseballDifficulty)
        return;


    let setting =
    baseballSettings[baseballDifficulty];


    let result=Math.random();


    if(result < setting.hitRate){

        hit("HIT");

    }
    else{

        strike();

    }

}




// AI 공격
function aiAttack(){

    let setting =
    baseballSettings[baseballDifficulty];


    let result=Math.random();


    if(result < setting.aiScoreRate){

        baseball.scoreAI++;

    }


    setTimeout(()=>{

        nextTurn();

    },setting.speed);

}



// 외부 실행
window.Baseball={

    menu:baseballMenu,
    start:startBaseball,
    swing:swing

};
