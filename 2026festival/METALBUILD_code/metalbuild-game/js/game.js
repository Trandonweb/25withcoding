/*
=========================================================
 METALBUILD
 game.js
 게임 데이터 및 상태 관리
=========================================================
*/

"use strict";

// =====================================================
// 게임 데이터
// =====================================================

const Game = {

    version: "1.0.0",

    started: false,

    stage: 1,

    maxStage: 100,

    coins: 0,

    fps: 60,

    difficulty: 1,

    battle: false,

    inventory: [],

    unlockedParts: [],

    clearedStages: [],

    settings: {

        bgm: 100,

        sfx: 100,

        fullscreen: false

    }

};

// =====================================================
// 플레이어
// =====================================================

const Player = {

    name: "PLAYER",

    hp: 1000,

    maxHp: 1000,

    attack: 100,

    defense: 50,

    critical: 5,

    level: 1,

    exp: 0,

    coinsEarned: 0,

    robot: null

};

// =====================================================
// 적
// =====================================================

let Enemy = null;

// =====================================================
// 게임 시작
// =====================================================

function startGameData(){

    Game.started = true;

}

// =====================================================
// 업데이트
// =====================================================

function updateGame(){

    if(Game.battle){

        if(typeof updateBattle==="function"){

            updateBattle();

        }

    }

}

// =====================================================
// 렌더
// =====================================================

function renderGame(){

    if(typeof render==="function"){

        render();

    }

}

// =====================================================
// 스테이지
// =====================================================

function getCurrentStage(){

    return Game.stage;

}

function nextStage(){

    if(Game.stage>=Game.maxStage){

        return;

    }

    Game.stage++;

}

function clearCurrentStage(){

    if(!Game.clearedStages.includes(Game.stage)){

        Game.clearedStages.push(Game.stage);

    }

}

// =====================================================
// 코인
// =====================================================

function addCoins(amount){

    Game.coins += amount;

    updateCoinUI();

}

function spendCoins(amount){

    if(Game.coins<amount){

        return false;

    }

    Game.coins -= amount;

    updateCoinUI();

    return true;

}

// =====================================================
// 경험치
// =====================================================

function addExp(exp){

    Player.exp += exp;

    while(Player.exp>=requiredExp()){

        Player.exp-=requiredExp();

        levelUp();

    }

}

function requiredExp(){

    return Player.level*100;

}

function levelUp(){

    Player.level++;

    Player.maxHp+=120;

    Player.attack+=18;

    Player.defense+=10;

    Player.hp=Player.maxHp;

}

// =====================================================
// UI
// =====================================================

function updateCoinUI(){

    const coin=document.getElementById("coinText");

    const gacha=document.getElementById("gachaCoin");

    if(coin){

        coin.textContent=Game.coins;

    }

    if(gacha){

        gacha.textContent=Game.coins;

    }

}

function updateStageUI(){

    const list=document.getElementById("stageList");

    if(!list) return;

    list.innerHTML="";

    for(let i=1;i<=Game.maxStage;i++){

        const item=document.createElement("div");

        item.className="stageItem";

        if(i===Game.stage){

            item.classList.add("current");

        }

        if(Game.clearedStages.includes(i)){

            item.classList.add("clear");

        }

        item.textContent="Stage "+i;

        list.appendChild(item);

    }

}

// =====================================================
// 승리
// =====================================================

function victory(rewardCoin){

    Game.battle=false;

    clearCurrentStage();

    addCoins(rewardCoin);

    addExp(50);

    nextStage();

    updateStageUI();

    showScreen("victory");

}

// =====================================================
// 패배
// =====================================================

function defeat(){

    Game.battle=false;

    Player.hp=Player.maxHp;

    showScreen("defeat");

}

// =====================================================
// 저장용 데이터
// =====================================================

function exportSaveData(){

    return {

        version:Game.version,

        stage:Game.stage,

        coins:Game.coins,

        level:Player.level,

        exp:Player.exp,

        inventory:Game.inventory,

        unlockedParts:Game.unlockedParts,

        clearedStages:Game.clearedStages

    };

}

// =====================================================
// 저장 불러오기용
// =====================================================

function importSaveData(data){

    if(!data) return;

    Game.stage=data.stage??1;

    Game.coins=data.coins??0;

    Game.inventory=data.inventory??[];

    Game.unlockedParts=data.unlockedParts??[];

    Game.clearedStages=data.clearedStages??[];

    Player.level=data.level??1;

    Player.exp=data.exp??0;

    updateCoinUI();

    updateStageUI();

}

console.log("game.js loaded");
