// baseball.js

let baseball = {
    scoreHuman: 0,
    scoreAI: 0,

    inning: 1,
    maxInning: 3,

    balls: 0,
    strikes: 0,

    mode: "HUMAN_ATTACK",

    pitch: null,
    swingTiming: 0,
    gameEnd: false
};


// 게임 시작
function startBaseball() {

    baseball.scoreHuman = 0;
    baseball.scoreAI = 0;

    baseball.inning = 1;

    baseball.balls = 0;
    baseball.strikes = 0;

    baseball.mode = "HUMAN_ATTACK";

    baseball.gameEnd = false;

    renderBaseball();

    console.log("Baseball Start");
}


// 투구
function pitchBall(type){

    if(baseball.mode !== "AI_ATTACK") return;

    baseball.pitch = type;

    let speed;

    if(type==="fast"){
        speed = 700;
    }
    else if(type==="curve"){
        speed = 1000;
    }
    else{
        speed = 850;
    }


    setTimeout(()=>{

        baseball.swingTiming = Date.now();

        console.log(
            "Pitch:",
            type
        );

    }, speed);

}



// 타격
function swing(){

    if(baseball.mode !== "AI_ATTACK")
        return;


    let result = Math.random();


    if(result < 0.15){

        hit("HOME RUN");

    }
    else if(result < 0.45){

        hit("HIT");

    }
    else{

        strike();

    }

}



// 안타 처리
function hit(type){

    console.log(type);


    if(type==="HOME RUN"){

        baseball.scoreHuman += 2;

    }
    else{

        baseball.scoreHuman += 1;

    }


    nextTurn();
}



// 스트라이크
function strike(){

    baseball.strikes++;


    if(baseball.strikes>=3){

        console.log("Strike Out");

        nextTurn();

    }

    renderBaseball();

}



// 다음 타석
function nextTurn(){

    baseball.strikes=0;
    baseball.balls=0;


    if(baseball.mode==="AI_ATTACK"){

        baseball.mode="HUMAN_ATTACK";

    }
    else{

        baseball.mode="AI_ATTACK";

        aiAttack();

    }


    renderBaseball();

}



// AI 공격
function aiAttack(){

    let result=Math.random();


    if(result<0.4){

        baseball.scoreAI++;

    }


    setTimeout(()=>{

        nextTurn();

    },1000);

}



// 결과 표시
function renderBaseball(){

    let screen=document.getElementById("game");


    if(!screen) return;


    screen.innerHTML=`

    <h2>⚾ Baseball</h2>

    <h3>
    HUMAN ${baseball.scoreHuman}
    :
    ${baseball.scoreAI} AI
    </h3>


    <p>
    ${baseball.inning}회
    </p>


    <p>
    ${baseball.mode==="AI_ATTACK"
    ?"AI 투구 중"
    :"타격 준비"}
    </p>


    <button onclick="swing()">
    🏏 Swing
    </button>

    <button onclick="pitchBall('fast')">
    🔥 직구
    </button>

    <button onclick="pitchBall('curve')">
    🌀 커브
    </button>

    <button onclick="pitchBall('slider')">
    ↔ 슬라이더
    </button>

    `;

}



// 외부 호출용
window.Baseball = {

    start:startBaseball,
    swing:swing,
    pitch:pitchBall

};
