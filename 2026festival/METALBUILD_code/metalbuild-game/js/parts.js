// =====================================
// METALBUILD PART DATABASE
// =====================================



// =====================================
// 파츠 등급
// =====================================


const RARITY = {


    BASIC : {

        name : "Basic",

        color : "gray",

        rate : 60

    },


    COMMON : {

        name : "Common",

        color : "green",

        rate : 25

    },


    RARE : {

        name : "Rare",

        color : "blue",

        rate : 10

    },


    EPIC : {

        name : "Epic",

        color : "purple",

        rate : 4

    },


    LEGENDARY : {

        name : "Legendary",

        color : "gold",

        rate : 1

    }


};








// =====================================
// 모든 파츠 데이터
// =====================================


const PARTS = [



// =====================================
// 왼팔 / 오른팔 무기
// =====================================



{

    id:"basic_launcher",

    name:"기본 런처",

    slot:"rightArm",

    type:"weapon",

    rarity:"Basic",


    attack:50,

    range:200,


    description:

    "초보 메카용 기본 원거리 무기"

},



{

    id:"basic_shield",

    name:"기본 쉴드",

    slot:"leftArm",

    type:"shield",

    rarity:"Basic",


    defense:30,


    description:

    "기본 방어 장비"

},





{

    id:"machine_gun",

    name:"기관총 팔",

    slot:"rightArm",

    type:"weapon",

    rarity:"Common",


    attack:80,

    attackSpeed:2,


    description:

    "빠른 연사 공격을 하는 무기"

},





{

    id:"laser_arm",

    name:"레이저 캐논",

    slot:"rightArm",

    type:"weapon",

    rarity:"Rare",


    attack:150,

    range:500,


    description:

    "강력한 레이저 공격"

},





{

    id:"energy_shield",

    name:"에너지 쉴드",

    slot:"leftArm",

    type:"shield",

    rarity:"Rare",


    defense:120,


    description:

    "에너지로 만든 고급 방패"

},





// =====================================
// 등 파츠
// =====================================



{

    id:"missile_pack",

    name:"미사일 팩",

    slot:"back1",

    type:"weapon",

    rarity:"Epic",


    attack:200,


    description:

    "등에 장착하는 다연장 미사일"

},




{

    id:"jet_engine",

    name:"제트 부스터",

    slot:"back2",

    type:"engine",

    rarity:"Rare",


    speed:50,


    description:

    "빠른 이동이 가능한 부스터"

},





// =====================================
// 몸통
// =====================================



{

    id:"heavy_body",

    name:"중장갑 몸통",

    slot:"body",

    type:"armor",

    rarity:"Common",


    hp:700,

    defense:100,


    description:

    "방어력을 높인 튼튼한 몸체"

},





{

    id:"energy_core_body",

    name:"에너지 코어 바디",

    slot:"body",

    type:"core",

    rarity:"Legendary",


    hp:1500,

    attack:200,


    description:

    "전설급 에너지를 사용하는 몸체"

},






// =====================================
// 다리
// =====================================



{

    id:"speed_leg",

    name:"스피드 다리",

    slot:"leftLeg",

    type:"leg",

    rarity:"Rare",


    speed:40,


    description:

    "기동력을 증가시키는 다리"

},





{

    id:"tank_leg",

    name:"탱크 다리",

    slot:"rightLeg",

    type:"leg",

    rarity:"Epic",


    hp:500,

    defense:80,


    description:

    "무거운 장갑형 다리"

}




];







// =====================================
// 슬롯별 파츠 검색
// =====================================


function getPartsBySlot(slot){


    return PARTS.filter(

        part=>part.slot===slot

    );


}







// =====================================
// ID로 파츠 찾기
// =====================================


function getPart(id){


    return PARTS.find(

        part=>part.id===id

    );


}







// =====================================
// 랜덤 파츠 획득
// (전투 보상/뽑기 연결용)
// =====================================


function getRandomPart(){


    const random =

    Math.floor(

        Math.random()*PARTS.length

    );


    return PARTS[random];


}







console.log(
    "PART DATABASE READY"
);
