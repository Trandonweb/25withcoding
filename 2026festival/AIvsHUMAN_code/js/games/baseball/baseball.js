// baseball.js
// AI vs HUMAN Baseball Controller

import {
    initRenderer,
    renderFrame,
    resizeCanvas
} from "./baseballRender.js";

import {
    createPitch
} from "./baseballAI.js";

import {
    judgeSwing
} from "./baseballJudge.js";


let gameAreaRef = null;
let canvas = null;
let ctx = null;

let animation = null;
let keyHandler = null;


const WIDTH = 480;
const HEIGHT = 800;


let game = {
    difficulty:"normal",

    score:0,

    inning:1,
    outs:0,

    balls:0,
    strikes:0,

    pitching:false,

    pitch:null,

    swing:false,

    result:"",

    gameOver:false
};



export function openBaseball(area){

    gameAreaRef = area;

    showLobby();

}



function showLobby(){

    gameAreaRef.innerHTML = `

    <div style="
    height:100%;
    background:#04120a;
    color:white;
    display:flex;
    flex-direction:column;
    justify-content:center;
    align-items:center;
    gap:25px;
    border-radius:20px;
    ">


    <h1>
    ⚾ AI BASEBALL
    </h1>


    <button id="easy">
    EASY
    </button>


    <button id="normal">
    NORMAL
    </button>


    <button id="hard">
    HARD
    </button>


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




function startGame(level){


    game={
        difficulty:level,

        score:0,

        inning:1,
        outs:0,

        balls:0,
        strikes:0,

        pitching:false,

        pitch:null,

        swing:false,

        result:"",

        gameOver:false
    };


    createGameUI();


    nextPitch();

}





function createGameUI(){


gameAreaRef.innerHTML=`

<div id="baseballRoot"
style="
width:100%;
height:100%;
background:#020806;
border-radius:20px;
overflow:hidden;
display:flex;
flex-direction:column;
">


<div id="scoreBoard"
style="
height:60px;
color:white;
display:flex;
justify-content:space-around;
align-items:center;
background:#06150c;
">

<span>
SCORE
<b id="score">0</b>
</span>


<span>
OUT
<b id="out">0</b>
/3
</span>


<span id="count">
0B 0S
</span>


</div>



<canvas id="baseballCanvas"
style="
flex:1;
width:100%;
">
</canvas>


<button id="swing"
style="
height:70px;
font-size:22px;
font-weight:bold;
background:#16a34a;
color:white;
border:none;
">
⚾ SWING
</button>



</div>

`;


canvas =
document.getElementById(
"baseballCanvas"
);


ctx=canvas.getContext("2d");


resizeCanvas(canvas,ctx);



initRenderer(ctx);



document
.getElementById("swing")
.onclick=swing;



keyHandler=e=>{

if(e.code==="Space")
swing();

};


window.addEventListener(
"keydown",
keyHandler
);



}




function nextPitch(){


if(game.outs>=3){

endGame();
return;

}


game.pitching=true;
game.swing=false;


game.pitch=createPitch(
game.difficulty
);


loop();


}





function loop(){


if(animation)
cancelAnimationFrame(animation);



function frame(){


ctx.clearRect(
0,
0,
WIDTH,
HEIGHT
);



renderFrame(
ctx,
game
);



if(game.pitching){

game.pitch.progress+=
game.pitch.speed;


game.pitch.x =
game.pitch.startX +
(
game.pitch.targetX -
game.pitch.startX
)
*
game.pitch.progress;


game.pitch.y =
game.pitch.startY +
(
game.pitch.targetY -
game.pitch.startY
)
*
game.pitch.progress;



if(game.pitch.progress>=1){

game.pitching=false;


if(!game.swing){

result(
"STRIKE"
);

}


}

}


animation=requestAnimationFrame(frame);


}


frame();


}





function swing(){


if(!game.pitching)
return;


if(game.swing)
return;


game.swing=true;


let r =
judgeSwing(
game.pitch
);


result(r);


}





function result(r){


game.pitching=false;


game.result=r;



switch(r){


case "HOMERUN":

game.score+=50;

break;


case "HIT":

game.score+=10;

break;


case "STRIKE":

game.strikes++;

break;


case "MISS":

game.strikes++;

break;


}



if(game.strikes>=3){

game.outs++;
game.strikes=0;

}



updateUI();



setTimeout(
nextPitch,
1200
);



}





function updateUI(){

document
.getElementById("score")
.innerText=
game.score;


document
.getElementById("out")
.innerText=
game.outs;


document
.getElementById("count")
.innerText=
`${game.balls}B ${game.strikes}S`;

}




function endGame(){


destroy();


gameAreaRef.innerHTML=`

<div style="
height:100%;
display:flex;
justify-content:center;
align-items:center;
flex-direction:column;
background:#04120a;
color:white;
">

<h1>
GAME OVER
</h1>

<h2>
${game.score} POINT
</h2>


<button id="again">
다시하기
</button>


</div>

`;


document
.getElementById("again")
.onclick=showLobby;


}





export function destroy(){


if(animation)
cancelAnimationFrame(animation);


if(keyHandler)
window.removeEventListener(
"keydown",
keyHandler
);


}
