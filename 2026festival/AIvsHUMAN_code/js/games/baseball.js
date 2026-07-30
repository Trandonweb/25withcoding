// baseball.js
// ⚾ AI vs HUMAN - Baseball


let gameAreaRef = null;

let canvas = null;
let ctx = null;

let animation = null;

let swingKey = null;



// 게임 데이터

let game = {

    difficulty: "",

    score: 0,

    outs: 0,

    balls: 0,

    strikes: 0,


    pitching:false,

    swing:false,


    pitch:null,


    gameOver:false

};




// 난이도

const difficulties = {


    easy:{
        name:"쉬움",
        speed:0.7
    },


    normal:{
        name:"보통",
        speed:1
    },


    hard:{
        name:"어려움",
        speed:1.3
    }


};




// 투구 종류

const pitches=[

    {
        name:"포심",
        speed:1,
        move:0
    },


    {
        name:"슬라이더",
        speed:0.9,
        move:40
    },


    {
        name:"커브",
        speed:0.7,
        move:-50
    },


    {
        name:"포크",
        speed:0.8,
        move:20
    }

];





// =======================
// 외부 실행
// =======================

export function openBaseball(gameArea){


    gameAreaRef = gameArea;


    showDifficulty();


}





// =======================
// 종료
// =======================

export function destroy(){


    if(animation){

        cancelAnimationFrame(animation);

    }


    if(swingKey){

        window.removeEventListener(
            "keydown",
            swingKey
        );

    }


}





// =======================
// 난이도 선택 화면
// =======================

function showDifficulty(){


gameAreaRef.innerHTML = `


<div style="

height:100%;

display:flex;

flex-direction:column;

justify-content:center;

align-items:center;

gap:20px;

">


<h1>
⚾ AI 투수 챌린지
</h1>



<button class="bb-btn" data-level="easy">

쉬움

</button>



<button class="bb-btn" data-level="normal">

보통

</button>



<button class="bb-btn" data-level="hard">

어려움

</button>



</div>


`;





const buttons =
gameAreaRef.querySelectorAll(".bb-btn");



buttons.forEach(btn=>{


    btn.style.padding="15px 50px";

    btn.style.borderRadius="20px";

    btn.style.border="2px solid #1ea857";

    btn.style.background="#fff";

    btn.style.fontSize="20px";


    btn.onclick=()=>{


        game.difficulty =
            btn.dataset.level;


        startGame();


    };


});



}





// =======================
// 게임 시작
// =======================

function startGame(){


    game.score=0;

    game.outs=0;

    game.balls=0;

    game.strikes=0;


    game.pitching=false;

    game.swing=false;

    game.gameOver=false;



    renderGame();



    nextPitch();


}
// =======================
// 게임 화면
// =======================

function renderGame(){


gameAreaRef.innerHTML = `


<div style="

width:100%;

height:100%;

min-height:500px;

display:flex;

flex-direction:column;

background:#111;

color:white;

border-radius:20px;

overflow:hidden;

">



<!-- 상단 정보 -->

<div style="

height:60px;

background:#222;

display:flex;

justify-content:space-around;

align-items:center;

font-size:18px;

">


<div>
⚾ ${difficulties[game.difficulty].name}
</div>


<div>
점수 :
<span id="score">
0
</span>
</div>


<div>
아웃 :
<span id="outs">
0
</span>
</div>


</div>





<!-- 경기장 -->

<div style="

flex:1;

position:relative;

">


<canvas id="baseballCanvas"

style="

width:100%;

height:100%;

background:#176b3a;

">

</canvas>


</div>






<!-- 버튼 -->

<div style="

height:90px;

background:#222;

display:flex;

justify-content:center;

align-items:center;

">


<button id="swingButton"

style="

padding:15px 60px;

border:none;

border-radius:30px;

background:#1ea857;

color:white;

font-size:22px;

font-weight:bold;

cursor:pointer;

">

🏏 스윙

</button>


</div>



</div>



`;





canvas =
document.getElementById(
    "baseballCanvas"
);


ctx =
canvas.getContext("2d");



resizeCanvas();



window.addEventListener(
"resize",
resizeCanvas
);





// 버튼

document
.getElementById("swingButton")
.onclick = swing;






// 스페이스 입력

swingKey = (e)=>{


    if(e.code==="Space"){

        e.preventDefault();

        swing();

    }


};



window.addEventListener(
"keydown",
swingKey
);



}





// =======================
// 캔버스 크기
// =======================

function resizeCanvas(){


if(!canvas)
return;



canvas.width =
canvas.clientWidth;


canvas.height =
canvas.clientHeight;



}






// =======================
// 다음 투구 준비
// =======================

function nextPitch(){



if(game.outs>=3){

    endGame();

    return;

}




game.pitching=true;

game.swing=false;




const selected =
pitches[
Math.floor(
Math.random()*pitches.length
)
];




game.pitch={


    type:selected,


    x:canvas.width/2,


    y:80,


    progress:0,


    speed:
    0.008 *
    difficulties[
        game.difficulty
    ].speed



};



startPitch();



}







// =======================
// 투구 애니메이션
// =======================

function startPitch(){



function loop(){



ctx.clearRect(
0,
0,
canvas.width,
canvas.height
);



drawField();



const p=game.pitch;



p.progress += p.speed;



p.y =
80 +
(canvas.height*0.7)
*
p.progress;



p.x =
canvas.width/2;



// 변화구

p.x +=
p.type.move *
Math.sin(
p.progress*Math.PI
);





drawBall(
p.x,
p.y
);




if(p.progress>=1){


    game.pitching=false;


    if(!game.swing){

        judgePitch();

    }


    return;


}





animation =
requestAnimationFrame(loop);



}



loop();



}





// =======================
// 경기장 그리기
// =======================

function drawField(){


const w=canvas.width;

const h=canvas.height;



// 스트라이크 존


ctx.strokeStyle="#00ff88";

ctx.lineWidth=3;


ctx.strokeRect(

w/2-70,

h*0.55,

140,

180

);





// 홈플레이트


ctx.fillStyle="white";


ctx.beginPath();


ctx.moveTo(
w/2-35,
h*0.82
);


ctx.lineTo(
w/2+35,
h*0.82
);


ctx.lineTo(
w/2,
h*0.9
);


ctx.closePath();


ctx.fill();





// 타자


ctx.fillStyle="#222";


ctx.beginPath();

ctx.arc(
w/2+120,
h*0.65,
25,
0,
Math.PI*2
);

ctx.fill();



ctx.fillRect(

w/2+100,

h*0.68,

40,

80

);



}





// =======================
// 공 그리기
// =======================

function drawBall(x,y){



ctx.beginPath();


ctx.arc(
x,
y,
12,
0,
Math.PI*2
);



ctx.fillStyle="white";

ctx.fill();



ctx.strokeStyle="#d33";

ctx.stroke();



}
// =======================
// 스윙
// =======================

function swing(){


    if(!game.pitching)
        return;


    if(game.swing)
        return;



    game.swing=true;



    const p=game.pitch;



    // 홈플레이트 기준 위치
    const hitPoint =
        canvas.height * 0.78;



    const timing =
        Math.abs(
            p.y-hitPoint
        );




    let result;



    // 타격 가능 범위

    if(timing < 35){


        // 완벽 타이밍

        if(timing < 10){

            result="home";

        }

        else if(timing < 20){

            result="double";

        }

        else{

            result="hit";

        }


    }

    else{


        result="miss";


    }





    processResult(result);



}








// =======================
// 공 지나감 판정
// =======================

function judgePitch(){



const p=game.pitch;



const zone =
Math.abs(
p.x-canvas.width/2
)
<
70;



if(zone){


    processResult("strike");


}

else{


    processResult("ball");


}



}








// =======================
// 결과 처리
// =======================

function processResult(result){



game.pitching=false;




let text="";





switch(result){



case "home":


game.score+=50;

text="🔥 홈런!! +50";

break;





case "double":


game.score+=20;

text="⚾ 2루타!! +20";

break;





case "hit":


game.score+=10;

text="⚾ 안타!! +10";

break;





case "miss":


game.strikes++;

text="❌ 헛스윙";

break;





case "strike":


game.strikes++;

text="❌ 스트라이크";

break;





case "ball":


game.balls++;

text="🟦 볼";

break;


}






// 볼넷

if(game.balls>=4){


game.score+=5;


text="🎯 볼넷 +5";


game.balls=0;

game.strikes=0;


}






// 삼진

if(game.strikes>=3){


game.outs++;


text="❌ 삼진 아웃";


game.strikes=0;

game.balls=0;


}






showMessage(text);


updateUI();





setTimeout(()=>{


    nextPitch();


},1200);




}








// =======================
// UI 업데이트
// =======================

function updateUI(){


const score =
document.getElementById(
"score"
);


const outs =
document.getElementById(
"outs"
);



if(score)
score.innerText=
game.score;



if(outs)
outs.innerText=
game.outs;



}








// =======================
// 결과 표시
// =======================

function showMessage(text){



const div =
document.createElement("div");



div.innerText=text;



div.style.position="absolute";

div.style.top="30%";

div.style.left="50%";

div.style.transform=
"translate(-50%,-50%)";



div.style.fontSize="40px";

div.style.fontWeight="900";

div.style.color="white";

div.style.zIndex="10";



gameAreaRef.appendChild(div);





setTimeout(()=>{


div.remove();


},1000);



}
// =======================
// 경기 종료
// =======================

function endGame(){


    game.gameOver=true;


    if(animation){

        cancelAnimationFrame(animation);

    }


    if(swingKey){

        window.removeEventListener(
            "keydown",
            swingKey
        );

    }



    gameAreaRef.innerHTML = `


<div style="

height:100%;

display:flex;

flex-direction:column;

justify-content:center;

align-items:center;

gap:20px;

background:#111;

color:white;

border-radius:20px;

">


<h1>
⚾ 경기 종료
</h1>



<h2 style="
color:#1ea857;
font-size:40px;
">

${game.score} 점

</h2>




<p>

삼진 :
${game.outs}개

</p>




<button id="restartBaseball"

style="

padding:15px 50px;

border-radius:25px;

border:none;

background:#1ea857;

color:white;

font-size:20px;

font-weight:bold;

cursor:pointer;

">

다시 하기

</button>



</div>


`;




document
.getElementById(
"restartBaseball"
)
.onclick=()=>{


    showDifficulty();


};



}








// =======================
// 투구 정보 표시
// =======================

function showPitchInfo(){



const box =
document.createElement("div");



box.innerHTML = `

⚾ ${game.pitch.type.name}

`;



box.style.position="absolute";

box.style.top="20px";

box.style.left="50%";

box.style.transform=
"translateX(-50%)";


box.style.padding="10px 20px";

box.style.background=
"rgba(0,0,0,0.5)";


box.style.borderRadius="20px";

box.style.fontSize="20px";



gameAreaRef.appendChild(box);




setTimeout(()=>{

box.remove();

},1000);



}








// =======================
// 타격 효과
// =======================

function hitEffect(){



if(!ctx)
return;



ctx.save();



ctx.fillStyle=
"rgba(255,255,0,0.7)";



ctx.beginPath();


ctx.arc(

canvas.width/2,

canvas.height*0.78,

40,

0,

Math.PI*2

);


ctx.fill();



ctx.restore();



}





// =======================
// 기존 함수 보강
// =======================


// 기존 processResult 마지막 부분에
// nextPitch 전에 추가하면 됨.
//
// hitEffect();
//
// showPitchInfo();
