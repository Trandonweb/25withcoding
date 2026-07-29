// baseball.js


let gameAreaRef = null;


let baseball = {

    difficulty:null,

    scoreHuman:0,
    scoreAI:0,

    strikes:0,

    mode:"HUMAN",

    gameOver:false

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
// ENTRY
// =====================

export function openBaseball(gameArea){

    gameAreaRef = gameArea;

    showDifficulty();

}




// =====================
// DIFFICULTY
// =====================

function showDifficulty(){


    gameAreaRef.innerHTML=`

    <div style="text-align:center">

        <h2>⚾ 야구</h2>


        <h3 style="margin:20px 0;">
            난이도 선택
        </h3>


        <div style="
            display:flex;
            flex-direction:column;
            gap:10px;
            max-width:300px;
            margin:0 auto;
        ">


            <button class="game-select-btn" id="easy">
                쉬움
            </button>


            <button class="game-select-btn" id="normal">
                보통
            </button>


            <button class="game-select-btn" id="hard">
                어려움
            </button>


        </div>


    </div>

    `;


    document
    .getElementById("easy")
    .onclick=()=>startGame("easy");


    document
    .getElementById("normal")
    .onclick=()=>startGame("normal");


    document
    .getElementById("hard")
    .onclick=()=>startGame("hard");


}





// =====================
// START
// =====================

function startGame(level){


    baseball.difficulty = level;


    baseball.scoreHuman=0;
    baseball.scoreAI=0;

    baseball.strikes=0;

    baseball.mode="HUMAN";

    baseball.gameOver=false;


    renderUI();


}





// =====================
// UI
// =====================

function renderUI(){


    let lv =
    baseballLevel[baseball.difficulty];


    gameAreaRef.innerHTML=`

    <div style="
        display:flex;
        flex-direction:column;
        height:100%;
    ">


        <div style="
            text-align:center;
        ">


            <h2>
            ⚾ Baseball
            </h2>


            <h3 style="margin:15px 0;">

            HUMAN
            ${baseball.scoreHuman}

            :

            ${baseball.scoreAI}
            AI

            </h3>


            <p>
            난이도 : ${lv.name}
            </p>


        </div>



        <div style="
            flex:1;
            display:flex;
            flex-direction:column;
            justify-content:center;
            align-items:center;
            gap:20px;
        ">


            <div style="
                font-size:1.2rem;
                font-weight:bold;
            ">

            ${
                baseball.mode==="HUMAN"
                ?"타격하세요!"
                :"AI 공격 중..."
            }

            </div>



            <p>
            스트라이크 :
            ${baseball.strikes}
            </p>



            <button
            id="swingBtn"
            class="game-select-btn"
            style="
                width:220px;
                min-height:90px;
            ">

            🏏 타격

            </button>


        </div>


    </div>


    `;



    document
    .getElementById("swingBtn")
    .onclick=swing;


}





// =====================
// PLAYER
// =====================

function swing(){


    if(
        baseball.mode!=="HUMAN" ||
        baseball.gameOver
    )
        return;



    let lv =
    baseballLevel[baseball.difficulty];



    let result=Math.random();



    if(result < lv.hit){


        if(Math.random()<0.2){


            baseball.scoreHuman+=2;

            alert("🔥 홈런!");

        }
        else{


            baseball.scoreHuman++;

            alert("⚾ 안타!");

        }


        renderUI();

        return;

    }




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



    renderUI();


}





// =====================
// AI
// =====================

function aiTurn(){


    baseball.mode="AI";


    renderUI();



    setTimeout(()=>{


        let lv =
        baseballLevel[baseball.difficulty];



        if(Math.random()<lv.ai){


            baseball.scoreAI++;


            alert("🤖 AI 안타!");

        }
        else{


            alert("🤖 AI 아웃!");

        }



        baseball.mode="HUMAN";


        renderUI();



    },1000);


}
