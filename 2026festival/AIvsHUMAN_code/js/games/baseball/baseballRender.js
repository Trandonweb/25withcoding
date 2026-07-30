// baseballRender.js
// AI vs HUMAN Baseball Canvas Renderer


const WIDTH = 480;
const HEIGHT = 800;


let context = null;



export function initRenderer(ctx){

    context = ctx;

}



export function resizeCanvas(canvas,ctx){

    const dpr =
        window.devicePixelRatio || 1;


    canvas.width =
        WIDTH * dpr;


    canvas.height =
        HEIGHT * dpr;


    canvas.style.width =
        "100%";


    canvas.style.height =
        "100%";


    ctx.setTransform(
        1,
        0,
        0,
        1,
        0,
        0
    );


    ctx.scale(
        dpr,
        dpr
    );

}





export function renderFrame(ctx,game){


    drawStadium(ctx);


    drawScoreEffect(ctx,game);



    if(game.pitch){

        drawBall(
            ctx,
            game.pitch
        );

    }



    drawStrikeZone(ctx);



    drawPitcher(
        ctx,
        game
    );



    drawBatter(
        ctx,
        game
    );



    if(game.result){

        drawResult(
            ctx,
            game.result
        );

    }

}





// =========================
// 경기장
// =========================


function drawStadium(ctx){



    // 하늘

    let sky =
    ctx.createLinearGradient(
        0,
        0,
        0,
        300
    );


    sky.addColorStop(
        0,
        "#020617"
    );


    sky.addColorStop(
        1,
        "#064e3b"
    );


    ctx.fillStyle=sky;


    ctx.fillRect(
        0,
        0,
        WIDTH,
        HEIGHT
    );




    // 관중석


    ctx.fillStyle="#111827";


    ctx.fillRect(
        0,
        170,
        WIDTH,
        120
    );



    // 조명


    ctx.fillStyle=
    "rgba(255,255,255,0.15)";


    for(let i=0;i<6;i++){


        ctx.beginPath();


        ctx.arc(
            50+i*80,
            180,
            30,
            0,
            Math.PI*2
        );


        ctx.fill();

    }




    // 외야 잔디


    let grass =
    ctx.createLinearGradient(
        0,
        300,
        0,
        500
    );


    grass.addColorStop(
        0,
        "#15803d"
    );


    grass.addColorStop(
        1,
        "#064e3b"
    );


    ctx.fillStyle=grass;


    ctx.beginPath();


    ctx.moveTo(
        0,
        300
    );


    ctx.lineTo(
        WIDTH,
        300
    );


    ctx.lineTo(
        WIDTH+100,
        550
    );


    ctx.lineTo(
        -100,
        550
    );


    ctx.closePath();


    ctx.fill();





    // 내야 흙


    ctx.fillStyle="#92400e";


    ctx.beginPath();


    ctx.moveTo(
        120,
        540
    );


    ctx.lineTo(
        360,
        540
    );


    ctx.lineTo(
        480,
        800
    );


    ctx.lineTo(
        0,
        800
    );


    ctx.closePath();


    ctx.fill();





    // 베이스 라인


    ctx.strokeStyle=
    "white";


    ctx.lineWidth=2;


    ctx.beginPath();


    ctx.moveTo(
        240,
        540
    );


    ctx.lineTo(
        0,
        800
    );


    ctx.moveTo(
        240,
        540
    );


    ctx.lineTo(
        480,
        800
    );


    ctx.stroke();



}







// =========================
// 투수
// =========================


function drawPitcher(ctx,game){


    const x=240;
    const y=190;



    // 마운드


    ctx.fillStyle="#a16207";


    ctx.beginPath();


    ctx.ellipse(
        x,
        y+20,
        45,
        15,
        0,
        0,
        Math.PI*2
    );


    ctx.fill();




    // 몸


    ctx.fillStyle="#ffffff";


    ctx.fillRect(
        x-15,
        y-10,
        30,
        50
    );



    // 머리


    ctx.fillStyle="#111827";


    ctx.beginPath();


    ctx.arc(
        x,
        y-30,
        12,
        0,
        Math.PI*2
    );


    ctx.fill();



    // 팔


    ctx.strokeStyle="#f5cfa0";


    ctx.lineWidth=5;


    ctx.beginPath();


    ctx.moveTo(
        x-10,
        y
    );


    ctx.lineTo(
        x+25,
        y-20
    );


    ctx.stroke();



}







// =========================
// 타자
// =========================


function drawBatter(ctx,game){


    const x=350;
    const y=650;



    // 머리


    ctx.fillStyle="#111827";


    ctx.beginPath();


    ctx.arc(
        x,
        y-70,
        18,
        0,
        Math.PI*2
    );


    ctx.fill();




    // 몸


    ctx.fillStyle="#f8fafc";


    ctx.fillRect(
        x-20,
        y-50,
        40,
        60
    );




    // 배트


    ctx.save();


    ctx.translate(
        x,
        y-40
    );


    let angle =
    game.swing
    ?
    -1.5
    :
    -0.6;


    ctx.rotate(angle);



    ctx.fillStyle="#d97706";


    ctx.fillRect(
        0,
        -90,
        10,
        100
    );


    ctx.restore();



}







// =========================
// 공
// =========================


function drawBall(ctx,pitch){



    const r =
    5 +
    pitch.progress*12;



    // 잔상


    ctx.globalAlpha=0.35;


    ctx.fillStyle="#38bdf8";


    ctx.beginPath();


    ctx.arc(
        pitch.x,
        pitch.y-20,
        r,
        0,
        Math.PI*2
    );


    ctx.fill();



    ctx.globalAlpha=1;



    // 공


    ctx.fillStyle="white";


    ctx.beginPath();


    ctx.arc(
        pitch.x,
        pitch.y,
        r,
        0,
        Math.PI*2
    );


    ctx.fill();



    ctx.strokeStyle="#dc2626";


    ctx.stroke();



}







// =========================
// 스트라이크존
// =========================


function drawStrikeZone(ctx){



    ctx.strokeStyle=
    "rgba(56,189,248,0.6)";


    ctx.strokeRect(
        170,
        470,
        140,
        120
    );



    ctx.fillStyle="white";


    ctx.beginPath();


    ctx.moveTo(
        200,
        600
    );


    ctx.lineTo(
        280,
        600
    );


    ctx.lineTo(
        300,
        630
    );


    ctx.lineTo(
        240,
        660
    );


    ctx.lineTo(
        180,
        630
    );


    ctx.closePath();


    ctx.fill();



}







// =========================
// 결과 표시
// =========================


function drawResult(ctx,text){


    ctx.fillStyle=
    "rgba(0,0,0,0.65)";


    ctx.fillRect(
        80,
        300,
        320,
        90
    );



    ctx.fillStyle="#facc15";


    ctx.font=
    "bold 32px sans-serif";


    ctx.textAlign="center";


    ctx.fillText(
        text,
        240,
        355
    );



}





function drawScoreEffect(ctx,game){

    // 추후 홈런 파티클 추가 예정

}
