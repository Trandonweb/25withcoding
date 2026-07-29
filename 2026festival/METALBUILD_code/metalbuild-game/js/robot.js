// =====================================
// METALBUILD ROBOT SYSTEM
// =====================================



// =====================================
// 플레이어 메카 데이터
// =====================================


let playerRobot = {


    name : "METALBUILD-01",


    level : 1,


    hp : 1000,


    maxHp : 1000,


    attack : 100,


    defense : 50,


    speed : 10,


    energy : 100,



    // =================================
    // 장착 슬롯
    // =================================


    parts : {


        leftArm : null,


        rightArm : null,


        back1 : null,


        back2 : null,


        body : null,


        leftLeg : null,


        rightLeg : null


    }



};







// =====================================
// 기본 장비
// =====================================


const starterParts = {


    shield : {


        id : "basic_shield",


        name : "기본 쉴드",


        type : "leftArm",


        rarity : "Basic",


        defense : 30,


        description :

        "초보자를 위한 기본 방어 장비"

    },



    launcher : {


        id : "basic_launcher",


        name : "기본 런처",


        type : "rightArm",


        rarity : "Basic",


        attack : 50,


        range : 200,


        description :

        "기본 원거리 공격 무기"

    },



    body : {


        id : "basic_body",


        name : "기본 메카 몸통",


        type : "body",


        rarity : "Basic",


        hp : 500


    },


    leg : {


        id : "basic_leg",


        name : "기본 다리",


        type : "leg",


        rarity : "Basic",


        speed : 10


    }


};








// =====================================
// 게임 시작 장비 지급
// =====================================


function giveStarterEquipment(){



    playerRobot.parts.leftArm =

    starterParts.shield;



    playerRobot.parts.rightArm =

    starterParts.launcher;



    playerRobot.parts.body =

    starterParts.body;



    playerRobot.parts.leftLeg =

    starterParts.leg;



    playerRobot.parts.rightLeg =

    starterParts.leg;



    calculateRobotStats();



}








// =====================================
// 파츠 장착
// =====================================


function equipPart(part){



    if(!part.type){

        console.log(
            "장착할 수 없는 파츠"
        );

        return;

    }



    playerRobot.parts[part.type]
    =
    part;



    calculateRobotStats();



}








// =====================================
// 능력치 계산
// =====================================


function calculateRobotStats(){



    // 기본값


    playerRobot.hp = 1000;


    playerRobot.attack = 100;


    playerRobot.defense = 50;


    playerRobot.speed = 10;





    Object.values(
        playerRobot.parts

    )
    .forEach(
    part=>{


        if(part){



            if(part.hp)

                playerRobot.hp += part.hp;



            if(part.attack)

                playerRobot.attack += part.attack;



            if(part.defense)

                playerRobot.defense += part.defense;



            if(part.speed)

                playerRobot.speed += part.speed;



        }


    });



}







// =====================================
// 현재 장착 확인
// =====================================


function showRobotParts(){



    console.log(
        playerRobot.parts
    );


}







// =====================================
// 테스트용 초기 실행
// =====================================


giveStarterEquipment();



console.log(
    "PLAYER ROBOT READY"
);



console.log(
    playerRobot
);
