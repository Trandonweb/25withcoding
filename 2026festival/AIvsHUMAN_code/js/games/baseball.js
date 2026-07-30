// baseball.js
// ⚾ AI 투수 챌린지 v2
// Part 1 - 기본 구조 / 메뉴 / 캔버스

let gameAreaRef = null;

let canvas = null;
let ctx = null;

let animationId = null;

let keyHandler = null;
let resizeHandler = null;


const difficultyData = {
    easy:{
        name:"쉬움",
        speed:0.65,
        ai:0.2
    },

    normal:{
        name:"보통",
        speed:0.85,
        ai:0.5
    },

    hard:{
        name:"어려움",
        speed:1.05,
        ai:0.8
    }
};



let game = {

    difficulty:null,

    stance:"right",

    score:0,

    outs:0,

    balls:0,

    strikes:0,

    hits:0,


    mode:"menu",

    pitch:null,


    swing:false,

    swingTime:0,


    combo:0,


    history:{
        fast:0,
        breaking:0
    }

};



/* =========================
   외부 실행
========================= */


export function openBaseball(gameArea){

    gameAreaRef = gameArea;

    showDifficulty();

}



export function destroy(){

    stopAnimation();

    if(keyHandler){
        window.removeEventListener(
            "keydown",
            keyHandler
        );

        keyHandler=null;
    }


    if(resizeHandler){
        window.removeEventListener(
            "resize",
            resizeHandler
        );

        resizeHandler=null;
    }

}







/* =========================
   난이도 선택
========================= */


function showDifficulty(){

    game.mode="menu";


    gameAreaRef.innerHTML=`

<div class="baseball-page">

<div class="baseball-card">

<h1>
⚾ AI 투수 챌린지
</h1>


<p>
AI 투수와 1이닝 승부!
</p>



<button data-level="easy">
쉬움
</button>


<button data-level="normal">
보통
</button>


<button data-level="hard">
어려움
</button>


</div>

</div>


<style>

.baseball-page{

width:100%;
height:100%;

min-height:500px;

display:flex;

align-items:center;
justify-content:center;

background:#101010;

color:white;

font-family:Pretendard,sans-serif;

}


.baseball-card{

width:350px;

padding:30px;

background:#1e1e1e;

border-radius:20px;

border:2px solid #1ea857;

text-align:center;

}


.baseball-card h1{

color:#1ea857;

}


.baseball-card button{

width:100%;

padding:13px;

margin-top:10px;

border-radius:10px;

border:0;

background:#2b2b2b;

color:white;

font-size:18px;

cursor:pointer;

}


.baseball-card button:hover{

background:#1ea857;

}


</style>

`;



const buttons =
gameAreaRef.querySelectorAll("button");


buttons.forEach(btn=>{

btn.onclick=()=>{

game.difficulty =
btn.dataset.level;


showStance();

};


});


}









/* =========================
   타석 선택
========================= */


function showStance(){


gameAreaRef.innerHTML=`

<div class="baseball-page">

<div class="baseball-card">


<h1>
🏏 타자 선택
</h1>


<p>
타석 방향을 선택하세요
</p>



<button data-stance="left">
좌타자
</button>


<button data-stance="right">
우타자
</button>


</div>

</div>

`;



gameAreaRef
.querySelectorAll("button")
.forEach(btn=>{


btn.onclick=()=>{


game.stance =
btn.dataset.stance;


startGame();


};


});


}









/* =========================
   게임 시작
========================= */


function startGame(){


game.score=0;
game.outs=0;

game.balls=0;
game.strikes=0;

game.hits=0;

game.combo=0;

game.mode="play";


renderGame();


}




/* =========================
   게임 화면
========================= */


function renderGame(){


gameAreaRef.innerHTML=`


<div id="baseballRoot"
style="
width:100%;
height:100%;
background:#101010;
color:white;
display:flex;
flex-direction:column;
">


<div style="
padding:10px;
background:#1e1e1e;
display:flex;
justify-content:space-between;
">


<span>
⚾
${difficultyData[game.difficulty].name}
</span>


<span id="count">
B${game.balls}
S${game.strikes}
</span>


<span id="score">
${game.score}점
</span>


</div>



<div style="
flex:1;
position:relative;
background:#14532d;
">


<canvas id="baseballCanvas"
style="
width:100%;
height:100%;
">
</canvas>


<div id="result"
style="
position:absolute;
top:20px;
width:100%;
text-align:center;
font-size:28px;
font-weight:bold;
">
</div>


</div>



<button id="swingButton"

style="
margin:15px;
padding:15px;

border-radius:20px;

background:#1ea857;

color:white;

border:0;

font-size:20px;

">

🏏 스윙

</button>



</div>

`;



canvas =
document.getElementById(
"baseballCanvas"
);


ctx =
canvas.getContext("2d");



resizeCanvas();



resizeHandler =
resizeCanvas;


window.addEventListener(
"resize",
resizeHandler
);



document
.getElementById("swingButton")
.onclick=()=>{

swing();

};



keyHandler=(e)=>{


if(e.code==="Space"){

e.preventDefault();

swing();

}


};


window.addEventListener(
"keydown",
keyHandler
);



draw();


// 2부에서 여기 연결됨
startPitch();

}









/* =========================
   Canvas
========================= */


function resizeCanvas(){


if(!canvas)
return;


canvas.width =
canvas.clientWidth;


canvas.height =
canvas.clientHeight;


}




function draw(){


if(!ctx)
return;


ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);



drawField();


animationId =
requestAnimationFrame(draw);


}






function drawField(){


let w=canvas.width;
let h=canvas.height;



// 배경

ctx.fillStyle="#14532d";

ctx.fillRect(
0,
0,
w,
h
);



// 마운드

ctx.fillStyle="#c2a878";

ctx.beginPath();

ctx.arc(
w/2,
h*0.25,
45,
0,
Math.PI*2
);

ctx.fill();



// 홈플레이트

ctx.fillStyle="white";


ctx.beginPath();

ctx.moveTo(
w/2-35,
h*0.8
);

ctx.lineTo(
w/2+35,
h*0.8
);

ctx.lineTo(
w/2,
h*0.9
);

ctx.closePath();

ctx.fill();



// 스트라이크존

ctx.strokeStyle=
"rgba(30,168,87,0.8)";

ctx.lineWidth=3;


ctx.strokeRect(

w/2-70,

h*0.45,

140,

170

);



// 타자

ctx.fillStyle="#111827";

let x =
game.stance==="left"
?w/2-130
:w/2+130;


ctx.beginPath();

ctx.arc(
x,
h*0.62,
25,
0,
Math.PI*2
);

ctx.fill();


ctx.fillStyle="#ddd";

ctx.fillRect(
x-20,
h*0.65,
40,
80
);



}




function swing(){

if(game.mode!=="play")
return;


// 2부에서 구현

}






function startPitch(){

// 2부에서 구현


}



function stopAnimation(){

if(animationId){

cancelAnimationFrame(
animationId
);

animationId=null;

}


}
/* =========================
   2부 - 투구 시스템
========================= */


const pitches = [

{
    name:"포심 패스트볼",
    type:"fast",
    speed:1.25,
    breakX:0,
    breakY:0
},


{
    name:"투심 패스트볼",
    type:"fast",
    speed:1.1,
    breakX:25,
    breakY:20
},


{
    name:"커브",
    type:"breaking",
    speed:0.65,
    breakX:-30,
    breakY:80
},


{
    name:"슬라이더",
    type:"breaking",
    speed:0.85,
    breakX:70,
    breakY:20
},


{
    name:"포크볼",
    type:"breaking",
    speed:0.7,
    breakX:0,
    breakY:100
}

];




/*
 AI 투수 시작
*/

function startPitch(){


game.mode="pitching";



let pitch =
choosePitch();



game.pitch={


data:pitch,


progress:0,


x:canvas.width/2,


y:canvas.height*0.25,


startX:canvas.width/2,


startY:canvas.height*0.25,


targetX:
canvas.width/2,


targetY:
canvas.height*0.8,



hit:false,


startTime:
performance.now()


};



showMessage(
"⚾ "+pitch.name
);



}




/*
 AI 구종 선택
*/


function choosePitch(){


let lv =
difficultyData[
game.difficulty
];



let r =
Math.random();



let index;



if(
game.history.fast >
game.history.breaking
&&
r < lv.ai
){

// 변화구 비율 증가

index =
2+
Math.floor(
Math.random()*3
);


}

else{


index =
Math.floor(
Math.random()*pitches.length
);


}



let p=pitches[index];


if(p.type==="fast")
game.history.fast++;

else
game.history.breaking++;


return p;


}







/*
 공 이동
*/


function updatePitch(){


let p=game.pitch;


if(!p)
return;



if(p.hit)
return;



p.progress +=
0.012 *
p.data.speed *
difficultyData[
game.difficulty
].speed;



let t=p.progress;



// 기본 직선

p.x =
p.startX+
(
p.targetX-p.startX
)
*t;



p.y =
p.startY+
(
p.targetY-p.startY
)
*t;



// 변화구

p.x +=
Math.sin(t*Math.PI)
*
p.data.breakX;



p.y +=
Math.pow(t,2)
*
p.data.breakY;





drawBall();



if(
p.progress>=1
){


judgePitch();


}


}




/*
 공 그리기
*/


function drawBall(){


let p=game.pitch;


if(!p)
return;



ctx.beginPath();

ctx.arc(
p.x,
p.y,
10,
0,
Math.PI*2
);


ctx.fillStyle="white";

ctx.fill();



ctx.strokeStyle="#ef4444";

ctx.stroke();


}









/*
 투구 판정
*/


function judgePitch(){


if(
game.mode!=="pitching"
)
return;



let p=game.pitch;



game.mode="result";



let inZone =
checkStrikeZone(
p.x,
p.y
);



if(inZone){


strike();


showMessage(
"⚾ 스트라이크!"
);


}

else{


ball();


showMessage(
"🟦 볼!"
);


}



nextPitch();


}






/*
 스트라이크 존
*/


function checkStrikeZone(
x,
y
){


let left =
canvas.width/2-70;


let right =
canvas.width/2+70;


let top =
canvas.height*0.45;


let bottom =
top+170;



return (

x>left &&
x<right &&
y>top &&
y<bottom

);


}








/*
 스윙
*/


function swing(){



if(
game.mode!=="pitching"
||
!game.pitch
)
return;



let p=game.pitch;



let timing =
p.progress;



let diff =
Math.abs(
timing-0.86
);



game.pitch.hit=true;



game.mode="result";



if(
!checkStrikeZone(
p.x,
p.y
)
){


miss();



showMessage(
"❌ 유인구 헛스윙"
);


return;


}




if(diff<0.04){


homeRun();


}


else if(diff<0.1){


hit();


}


else{


foul();


}



}








/*
 다음 공
*/


function nextPitch(){


setTimeout(()=>{


if(game.outs>=3){

endGame();

return;

}



game.balls=0;
game.strikes=0;


game.mode="pitching";


startPitch();


},1200);



}







function showMessage(text){


let el=
document.getElementById(
"result"
);


if(el)
el.innerHTML=text;


}



/* =========================
   3부 - 결과 / 점수 / 종료
========================= */



function addScore(value){

    game.score += value;

    updateUI();

}



function updateUI(){

    const count =
    document.getElementById("count");

    const score =
    document.getElementById("score");


    if(count){

        count.innerText =
        `B${game.balls} S${game.strikes}`;

    }


    if(score){

        score.innerText =
        `${game.score}점`;

    }

}






/*
 안타 결과
*/


function hit(){


    game.hits++;

    game.combo++;


    let score = 10;


    if(game.combo>=3){

        score += game.combo*5;

    }


    addScore(score);



    showMessage(
        `⚾ 안타! +${score}점`
    );


    resetCount();

    nextPitch();

}






/*
 홈런
*/


function homeRun(){


    game.combo++;


    let score =
    50 + game.combo*10;



    addScore(score);



    showMessage(
        `🔥 홈런!! +${score}점`
    );



    resetCount();


    nextPitch();


}







/*
 파울
*/


function foul(){


    game.combo=0;



    if(game.strikes<2){

        game.strikes++;

    }



    showMessage(
        `⚠️ 파울 S${game.strikes}`
    );



    if(game.strikes>=3){

        out();

    }
    else{

        nextPitch();

    }


}








/*
 헛스윙
*/


function miss(){


    game.combo=0;


    game.strikes++;


    if(game.strikes>=3){

        out();

    }

    else{


        showMessage(
            `❌ 헛스윙 S${game.strikes}`
        );


        nextPitch();


    }


}








/*
 볼
*/


function ball(){


    game.combo=0;


    game.balls++;



    if(game.balls>=4){


        addScore(20);


        showMessage(
            "🎯 볼넷 출루 +20점"
        );


        resetCount();


    }



}








/*
 아웃
*/


function out(){


    game.outs++;


    game.combo=0;


    resetCount();



    showMessage(
        `❌ 삼진 아웃 (${game.outs}/3)`
    );



    updateUI();



    if(game.outs>=3){


        setTimeout(
            endGame,
            1200
        );


    }
    else{


        nextPitch();


    }



}








function resetCount(){

    game.balls=0;

    game.strikes=0;

    updateUI();

}








/*
 종료 화면
*/


function endGame(){


    stopAnimation();



    game.mode="end";



    gameAreaRef.innerHTML=`

<div class="baseball-page">


<div class="baseball-card">


<h1>
⚾ 경기 종료
</h1>



<h2 style="
color:#1ea857;
font-size:40px;
">

${game.score}점

</h2>



<p>

안타 ${game.hits}개<br>

최종 아웃 ${game.outs}개

</p>




<button id="restart">

다시 하기

</button>


</div>


</div>



`;



document
.getElementById("restart")
.onclick=()=>{


showDifficulty();


};


}



