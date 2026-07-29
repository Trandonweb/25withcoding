/*
=========================================================
 METALBUILD
 parts.js
 파츠 데이터베이스
=========================================================
*/

"use strict";

// =====================================================
// 등급
// =====================================================

const PART_RARITY = {
    COMMON: "Common",
    RARE: "Rare",
    EPIC: "Epic",
    LEGENDARY: "Legendary",
    MYTHIC: "Mythic"
};

// =====================================================
// 파츠 DB
// =====================================================

const PARTS = {

    /* ==========================
       오른팔
    ========================== */

    basic_launcher:{

        id:"basic_launcher",

        name:"기본 런처",

        slot:"rightArm",

        rarity:PART_RARITY.COMMON,

        attack:20,

        defense:0,

        hp:0,

        description:"기본 미사일 런처"

    },

    machine_gun:{

        id:"machine_gun",

        name:"머신건",

        slot:"rightArm",

        rarity:PART_RARITY.RARE,

        attack:45,

        defense:0,

        hp:0,

        description:"빠른 연사"

    },

    laser_cannon:{

        id:"laser_cannon",

        name:"레이저 캐논",

        slot:"rightArm",

        rarity:PART_RARITY.EPIC,

        attack:90,

        defense:5,

        hp:0,

        description:"고출력 레이저"

    },



    /* ==========================
       왼팔
    ========================== */

    basic_shield:{

        id:"basic_shield",

        name:"기본 쉴드",

        slot:"leftArm",

        rarity:PART_RARITY.COMMON,

        attack:0,

        defense:20,

        hp:100,

        description:"기본 방패"

    },

    energy_shield:{

        id:"energy_shield",

        name:"에너지 쉴드",

        slot:"leftArm",

        rarity:PART_RARITY.EPIC,

        attack:0,

        defense:60,

        hp:300,

        description:"에너지 보호막"

    },



    /* ==========================
       몸통
    ========================== */

    heavy_body:{

        id:"heavy_body",

        name:"중장갑 몸통",

        slot:"body",

        rarity:PART_RARITY.RARE,

        attack:10,

        defense:60,

        hp:400,

        description:"무거운 장갑"

    },

    energy_core:{

        id:"energy_core",

        name:"에너지 코어",

        slot:"body",

        rarity:PART_RARITY.LEGENDARY,

        attack:80,

        defense:40,

        hp:500,

        description:"고출력 코어"

    },



    /* ==========================
       등
    ========================== */

    booster:{

        id:"booster",

        name:"부스터",

        slot:"back1",

        rarity:PART_RARITY.RARE,

        attack:20,

        defense:10,

        hp:100,

        description:"이동속도 증가"

    },

    missile_pack:{

        id:"missile_pack",

        name:"미사일 팩",

        slot:"back2",

        rarity:PART_RARITY.EPIC,

        attack:70,

        defense:0,

        hp:0,

        description:"미사일 추가 발사"

    },



    /* ==========================
       다리
    ========================== */

    tank_leg:{

        id:"tank_leg",

        name:"탱크 다리",

        slot:"leftLeg",

        rarity:PART_RARITY.RARE,

        attack:15,

        defense:70,

        hp:250,

        description:"무거운 다리"

    },

    speed_leg:{

        id:"speed_leg",

        name:"고속 다리",

        slot:"rightLeg",

        rarity:PART_RARITY.EPIC,

        attack:30,

        defense:15,

        hp:120,

        description:"빠른 이동"

    }

};

// =====================================================
// 기본 장비
// =====================================================

const DEFAULT_LOADOUT = {

    leftArm:"basic_shield",

    rightArm:"basic_launcher",

    body:null,

    back1:null,

    back2:null,

    leftLeg:null,

    rightLeg:null

};

// =====================================================
// 초기화
// =====================================================

function initializeParts(){

    Game.unlockedParts = [

        "basic_launcher",

        "basic_shield"

    ];

}

// =====================================================
// 파츠 조회
// =====================================================

function getPart(id){

    return PARTS[id] || null;

}

// =====================================================
// 슬롯별 파츠
// =====================================================

function getPartsBySlot(slot){

    return Object.values(PARTS).filter(part=>part.slot===slot);

}

// =====================================================
// 보유 여부
// =====================================================

function hasPart(id){

    return Game.unlockedParts.includes(id);

}

// =====================================================
// 획득
// =====================================================

function unlockPart(id){

    if(!PARTS[id]) return false;

    if(hasPart(id)) return false;

    Game.unlockedParts.push(id);

    return true;

}

// =====================================================
// 랜덤 드롭
// =====================================================

function getRandomPart(){

    const list = Object.values(PARTS);

    return list[
        Math.floor(Math.random()*list.length)
    ];

}

console.log("parts.js loaded");
