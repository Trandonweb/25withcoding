// =====================================
// METALBUILD MAIN SYSTEM
// =====================================


// 게임 데이터

let gameData = {

    coin: 0,

    stage: 1,

    maxStage: 100

};





// =====================================
// 화면 가져오기
// =====================================


const startScreen = document.getElementById(
    "start-screen"
);


const homeScreen = document.getElementById(
    "home-screen"
);


const customScreen = document.getElementById(
    "custom-screen"
);


const battleScreen = document.getElementById(
    "battle-screen"
);




// =====================================
// 버튼
// =====================================


const startBtn =
document.getElementById(
    "start-btn"
);


const customBtn =
document.getElementById(
    "custom-btn"
);


const battleBtn =
document.getElementById(
    "battle-btn"
);


const backBtn =
document.getElementById(
    "back-btn"
);





// =====================================
// 시작 화면
// =====================================


startBtn.addEventListener(
"click",

()=>{


    startScreen.classList.add(
        "hidden"
    );


    homeScreen.classList.remove(
        "hidden"
    );


    updateUI();


}

);





// =====================================
// 커스터마이징 이동
// =====================================


customBtn.addEventListener(
"click",

()=>{


    homeScreen.classList.add(
        "hidden"
    );


    customScreen.classList.remove(
        "hidden"
    );


}

);





// =====================================
// 전투 이동
// =====================================


battleBtn.addEventListener(
"click",

()=>{


    homeScreen.classList.add(
        "hidden"
    );


    battleScreen.classList.remove(
        "hidden"
    );


}

);






// =====================================
// 뒤로가기
// =====================================


backBtn.addEventListener(
"click",

()=>{


    customScreen.classList.add(
        "hidden"
    );


    homeScreen.classList.remove(
        "hidden"
    );


}

);






// =====================================
// UI 업데이트
// =====================================


function updateUI(){


    document.getElementById(
        "coin"
    ).innerText =
    gameData.coin;



    document.getElementById(
        "stage"
    ).innerText =
    gameData.stage;



}







// =====================================
// 전투 결과 테스트용
// 추후 battle.js에서 연결
// =====================================


function winBattle(){


    gameData.stage++;


    gameData.coin += 100;


    if(gameData.stage >
    gameData.maxStage){


        gameData.stage =
        gameData.maxStage;


    }



    updateUI();


}






function loseBattle(){


    alert(
        "MISSION FAILED"
    );


}





// =====================================
// 게임 시작
// =====================================


updateUI();
