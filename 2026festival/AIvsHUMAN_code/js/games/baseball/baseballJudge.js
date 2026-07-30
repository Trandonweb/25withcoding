// baseballJudge.js
// AI vs HUMAN Baseball Hit Judgment System


const WIDTH = 480;



// =========================
// 판정 설정
// =========================


const judgeSetting = {


    easy:{

        perfect:28,
        good:60,
        foul:100

    },


    normal:{

        perfect:20,
        good:45,
        foul:80

    },


    hard:{

        perfect:14,
        good:32,
        foul:60

    }


};







// =========================
// 스윙 판정
// =========================


export function judgeSwing(
    pitch,
    difficulty="normal"
){


    if(!pitch)
        return "MISS";



    const setting =
    judgeSetting[difficulty];



    // 스트라이크존 확인


    const inZone = checkZone(
        pitch
    );



    if(!inZone){

        return "MISS";

    }







    // 홈플레이트와 거리


    const timing =
    Math.abs(
        pitch.y - 580
    );







    // 완벽 타격


    if(
        timing <= setting.perfect
    ){


        return randomPowerHit();


    }






    // 좋은 타격


    if(
        timing <= setting.good
    ){


        return "HIT";


    }







    // 파울 가능 구간


    if(
        timing <= setting.foul
    ){


        return "FOUL";


    }






    return "MISS";


}









// =========================
// 스트라이크 판정
// =========================


export function judgePitch(
    pitch
){


    if(
        checkZone(pitch)
    ){

        return "STRIKE";

    }


    return "BALL";


}









// =========================
// 존 체크
// =========================


function checkZone(pitch){



    const x =
    Math.abs(
        pitch.x - WIDTH/2
    );



    const y =
    pitch.y;



    return (

        x <= 70 &&

        y >= 470 &&

        y <= 630

    );



}









// =========================
// 타구 결과
// =========================


function randomPowerHit(){



    const r =
    Math.random();



    if(r < 0.35){

        return "HOMERUN";

    }



    if(r < 0.65){

        return "DOUBLE";

    }



    return "HIT";



}









// =========================
// 결과 점수
// =========================


export function getReward(result){



    switch(result){



        case "HOMERUN":

            return 50;



        case "DOUBLE":

            return 25;



        case "HIT":

            return 10;



        case "FOUL":

            return 0;



        case "MISS":

            return 0;



        default:

            return 0;



    }


}
