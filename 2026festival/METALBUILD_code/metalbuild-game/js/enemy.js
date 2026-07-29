// =====================================
// METALBUILD ENEMY SYSTEM
// =====================================



// =====================================
// 적 기본 데이터
// =====================================


const ENEMY_DATABASE = [



{
    id:"training_bot",

    name:"훈련용 로봇",

    rarity:"Basic",

    hp:500,

    attack:50,

    defense:20,

    speed:5,


    parts:[

        "basic_launcher"

    ]

},



{
    id:"battle_bot",

    name:"전투 로봇",

    rarity:"Common",

    hp:1000,

    attack:100,

    defense:50,

    speed:10,


    parts:[

        "machine_gun",

        "basic_shield"

    ]

},




{
    id:"assault_bot",

    name:"돌격 로봇",

    rarity:"Rare",

    hp:2000,

    attack:200,

    defense:100,

    speed:15,


    parts:[

        "laser_arm",

        "energy_shield"

    ]

},





{
    id:"heavy_guard",

    name:"중장갑 가디언",

    rarity:"Epic",

    hp:5000,

    attack:400,

    defense:300,

    speed:8,


    parts:[

        "missile_pack",

        "tank_leg",

        "heavy_body"

    ]

}



];








// =====================================
// 최종 보스
// =====================================


const FINAL_BOSS = {


    id:"omega_x",


    name:"OMEGA-X",


    rarity:"Legendary",



    hp:50000,


    attack:3000,


    defense:1500,


    speed:20,



    parts:[


        "energy_core_body",

        "missile_pack",

        "laser_arm",

        "tank_leg"


    ],



    skill:[


        "EMP",

        "미사일 폭격",

        "레이저 난사",

        "보호막"


    ]

};









// =====================================
// 현재 적
// =====================================


let currentEnemy = null;







// =====================================
// 스테이지별 적 생성
// =====================================


function createEnemy(stage){



    // 100 스테이지 보스


    if(stage >= 100){


        currentEnemy =

        JSON.parse(

            JSON.stringify(

                FINAL_BOSS

            )

        );



        return currentEnemy;


    }







    let enemy;



    // 진행도에 따른 적 선택


    if(stage < 20){


        enemy = ENEMY_DATABASE[0];


    }


    else if(stage < 50){


        enemy = ENEMY_DATABASE[1];


    }


    else if(stage < 80){


        enemy = ENEMY_DATABASE[2];


    }


    else{


        enemy = ENEMY_DATABASE[3];


    }






    // 복사


    currentEnemy = {


        ...enemy

    };





    // 스테이지 보정


    currentEnemy.hp += stage * 150;


    currentEnemy.attack += stage * 20;


    currentEnemy.defense += stage * 10;






    currentEnemy.stage = stage;





    return currentEnemy;



}








// =====================================
// 적 파츠 추가
// =====================================


function equipEnemyPart(enemy, partId){



    if(!enemy.parts){


        enemy.parts=[];


    }



    enemy.parts.push(partId);



}







// =====================================
// 적 강화
// =====================================


function upgradeEnemy(enemy, level){



    enemy.hp += level * 300;


    enemy.attack += level * 50;


    enemy.defense += level * 20;



}








// =====================================
// 랜덤 적 생성
// =====================================


function randomEnemy(){



    let random =


    Math.floor(

        Math.random()

        *

        ENEMY_DATABASE.length

    );



    return {


        ...ENEMY_DATABASE[random]


    };


}







console.log(
    "ENEMY SYSTEM READY"
);
