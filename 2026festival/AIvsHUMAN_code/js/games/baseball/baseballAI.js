// baseballAI.js
// AI vs HUMAN Baseball Pitcher AI


const WIDTH = 480;
const HEIGHT = 800;



// =========================
// 구종 데이터
// =========================


const pitches = [

    {
        name:"포심 패스트볼",
        type:"fastball",

        speed:0.018,

        moveX:0,
        moveY:0
    },


    {
        name:"슬라이더",
        type:"slider",

        speed:0.015,

        moveX:55,
        moveY:20
    },


    {
        name:"커브",
        type:"curve",

        speed:0.011,

        moveX:-35,
        moveY:80
    },


    {
        name:"포크볼",
        type:"fork",

        speed:0.013,

        moveX:0,
        moveY:110
    }

];





// =========================
// 난이도
// =========================


const difficultyData={


    easy:{

        speed:0.75,

        changeRate:0.2

    },


    normal:{

        speed:1,

        changeRate:0.45

    },


    hard:{

        speed:1.35,

        changeRate:0.7

    }


};







// =========================
// 플레이어 분석 데이터
// =========================


let playerHistory={

    swings:0,

    early:0,

    late:0

};






// =========================
// 기록 업데이트
// =========================


export function updatePlayerHistory(type){


    playerHistory.swings++;


    if(type==="early")
        playerHistory.early++;


    if(type==="late")
        playerHistory.late++;


}






// =========================
// AI 투구 생성
// =========================


export function createPitch(difficulty="normal"){


    const setting =
    difficultyData[difficulty];



    let selected =
    choosePitch();



    return {


        name:selected.name,


        type:selected.type,



        startX:WIDTH/2,


        startY:180,



        targetX:
        WIDTH/2,



        targetY:
        580,



        x:
        WIDTH/2,


        y:
        180,



        progress:0,



        speed:
        selected.speed *
        setting.speed,


        moveX:
        selected.moveX,


        moveY:
        selected.moveY



    };



}









// =========================
// 구종 선택 AI
// =========================


function choosePitch(){



    let random =
    Math.random();



    // 플레이어가 늦게 침
    // 빠른 공 사용


    if(
        playerHistory.swings>4 &&
        playerHistory.late >
        playerHistory.early
    ){


        return pitches[0];


    }






    // 플레이어가 빠르게 침
    // 변화구 사용


    if(
        playerHistory.swings>4 &&
        playerHistory.early >
        playerHistory.late
    ){


        return pitches[2];


    }







    // 기본 랜덤


    if(random<0.45)
        return pitches[0];


    if(random<0.7)
        return pitches[1];


    if(random<0.85)
        return pitches[2];


    return pitches[3];



}









// =========================
// 공 위치 계산
// =========================


export function updatePitch(pitch){



    pitch.progress +=
    pitch.speed;



    let t =
    pitch.progress;



    pitch.x =
    pitch.startX +
    (
        pitch.targetX -
        pitch.startX
    )
    *
    t;



    pitch.y =
    pitch.startY +
    (
        pitch.targetY -
        pitch.startY
    )
    *
    t;






    // 변화구 궤적


    pitch.x +=
    pitch.moveX *
    Math.sin(
        Math.PI*t
    );



    pitch.y +=
    pitch.moveY *
    t*t;



    return pitch;



}








// =========================
// AI 초기화
// =========================


export function resetAI(){


    playerHistory={

        swings:0,

        early:0,

        late:0

    };


}
