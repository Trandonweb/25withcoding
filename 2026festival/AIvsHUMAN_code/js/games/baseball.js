// baseball.js

let baseball = {

    difficulty: null,

    scoreHuman: 0,
    scoreAI: 0,

    inning: 1,

    strikes: 0,

    mode: "HUMAN",

    gameOver: false

};



const baseballLevel = {

    easy:{
        hit:0.65,
        ai:0.25,
        name:"쉬움"
    },

    normal:{
        hit:0.45,
        ai:0.5,
        name:"보통"
    },

    hard:{
        hit:0.3,
        ai:0.75,
        name:"어려움"
    }

};



// =====================
// 시작 메뉴
// =====================

function openBaseball(){


    let game=document.getElementById("game");


    game.innerHTML=`

    <h1>⚾ Baseball</h1>

    <h2>난이도 선택</h2>


    <button onclick="selectBaseball('easy')">
    🟢 쉬움
    </button>


    <button onclick="selectBaseball('normal')">
    🟡 보통
    </button>


    <button onclick="selectBaseball('hard')">
    🔴 어려움
    </button>


    `;


}



// =====================
// 난이도 선택
// =====================

function selectBaseball(level){


    baseball.difficulty=level;


    baseball.scoreHuman=0;
    baseball.scoreAI=0;

    baseball.inning=1;
    baseball.strikes=0;

    baseball.mode="HUMAN";


    renderBaseball();


}



// =====================
// 화면
// =====================

function renderBaseball(){


    let game=document.getElementById("game");


    let lv=baseballLevel[baseball.difficulty];


    game.innerHTML=`

    <h1>⚾ Baseball</h1>


    <h2>
    HUMAN ${baseball.scoreHuman}
    :
    ${baseball.scoreAI}
    AI
    </h2>


    <p>
    난이도 : ${lv.name}
    </p>


    <p>
    ${baseball.mode==="HUMAN"
    ?"타격하세요!"
    :"AI 공격 중"}
    </p>


    <button onclick="swing()">
    🏏 타격
    </button>


    `;


}



// =====================
// 타격
// =====================

function swing(){


    if(baseball.mode!=="HUMAN")
        return;


    let lv=
    baseballLevel[baseball.difficulty];


    let result=Math.random();



    if(result < lv.hit){


        let hit=Math.random();


        if(hit<0.2){

            baseball.scoreHuman+=2;

            alert("🔥 홈런!");

        }
        else{

            baseball.scoreHuman++;

            alert("⚾ 안타!");

        }


    }
    else{


        baseball.strikes++;


        alert(
        "스트라이크 "
        +
        baseball.strikes
        );


        if(baseball.strikes>=3){

            baseball.strikes=0;

            aiTurn();

            return;

        }

    }


    renderBaseball();

}



// =====================
// AI 공격
// =====================

function aiTurn(){


    baseball.mode="AI";


    renderBaseball();



    setTimeout(()=>{


        let lv=
        baseballLevel[baseball.difficulty];


        if(Math.random()<lv.ai){


            baseball.scoreAI++;


            alert("AI 안타!");

        }
        else{

            alert("AI 아웃!");

        }



        baseball.mode="HUMAN";


        renderBaseball();



    },1000);



}



// 전역 연결

window.openBaseball=openBaseball;

window.selectBaseball=selectBaseball;

window.swing=swing;
