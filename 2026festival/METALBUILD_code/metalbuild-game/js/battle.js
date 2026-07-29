// ======================================
// METALBUILD BATTLE SYSTEM
// Part 1
// ======================================

// 현재 전투 정보
let battleRunning = false;
let playerHP = 0;
let enemyHP = 0;
let battleTimer = null;

// HTML
const battleField = document.getElementById("battle-field");
const resultBtn = document.getElementById("result-btn");

// 전투 시작
function startBattle(){

    // 적 생성
    currentEnemy = createEnemy(gameData.stage);

    // 능력치 다시 계산
    calculateRobotStats();

    playerHP = playerRobot.hp;
    enemyHP = currentEnemy.hp;

    battleRunning = true;

    drawBattle();

    clearInterval(battleTimer);

    battleTimer = setInterval(updateBattle,500);

}

// 전투 화면 출력
function drawBattle(){

    battleField.innerHTML = `

    <div class="robot-box">

        <h2>PLAYER</h2>

        <h3>${playerRobot.name}</h3>

        <p>HP : ${playerHP}</p>

        <p>ATK : ${playerRobot.attack}</p>

        <p>DEF : ${playerRobot.defense}</p>

    </div>

    <div class="vs">

        VS

    </div>

    <div class="robot-box">

        <h2>ENEMY</h2>

        <h3>${currentEnemy.name}</h3>

        <p>HP : ${enemyHP}</p>

        <p>ATK : ${currentEnemy.attack}</p>

        <p>DEF : ${currentEnemy.defense}</p>

    </div>

    `;

}

// 전투 진행
function updateBattle(){

    if(!battleRunning){
        return;
    }

    playerAttack();

    if(enemyHP<=0){
        battleWin();
        return;
    }

    enemyAttack();

    if(playerHP<=0){
        battleLose();
        return;
    }

    drawBattle();

}

// 플레이어 공격
function playerAttack(){

    let damage =

        playerRobot.attack -

        currentEnemy.defense;

    if(damage<5){
        damage=5;
    }

    // 치명타
    if(Math.random()<0.10){

        damage*=2;

        console.log("Critical!");

    }

    enemyHP-=damage;

}

// 적 공격
function enemyAttack(){

    let damage =

        currentEnemy.attack -

        playerRobot.defense;

    if(damage<5){
        damage=5;
    }

    playerHP-=damage;

}

// 전투 종료
function stopBattle(){

    battleRunning=false;

    clearInterval(battleTimer);

}
// ======================================
// METALBUILD BATTLE SYSTEM
// Part 2
// ======================================


// 승리
function battleWin(){

    stopBattle();

    // 스테이지 클리어 보상
    let coinReward = 100 + (gameData.stage * 20);

    gameData.coin += coinReward;

    // 낮은 확률부터 점점 높아짐
    let dropChance = 0.35 + (gameData.stage * 0.003);

    if(dropChance > 0.95){
        dropChance = 0.95;
    }

    let rewardMessage =
        "MISSION COMPLETE!\n\n";

    rewardMessage +=
        "획득 코인 : " +
        coinReward +
        "\n";



    // 랜덤 파츠 획득
    if(Math.random() < dropChance){

        let rewardPart = getRandomPart();

        addPart(rewardPart);

        rewardMessage +=
            "\n획득 파츠\n" +
            rewardPart.name;

    }
    else{

        rewardMessage +=
            "\n파츠를 획득하지 못했습니다.";

    }



    alert(rewardMessage);



    // 마지막 보스인지 확인
    if(gameData.stage >= 100){

        showEnding();

        return;

    }



    gameData.stage++;

    updateUI();



    battleScreen.classList.add("hidden");

    homeScreen.classList.remove("hidden");

}





// 패배
function battleLose(){

    stopBattle();

    alert(
        "MISSION FAILED\n\n메카가 크게 파손되었습니다."
    );



    battleScreen.classList.add("hidden");

    homeScreen.classList.remove("hidden");

}





// 엔딩
function showEnding(){

    battleScreen.innerHTML = `

    <div
    style="
        width:100%;
        height:100%;
        display:flex;
        justify-content:center;
        align-items:center;
        flex-direction:column;
        text-align:center;
    ">

        <h1
        style="
        font-size:70px;
        color:gold;
        margin-bottom:30px;
        ">
        CONGRATULATIONS
        </h1>

        <h2
        style="
        margin-bottom:40px;
        ">
        OMEGA-X를 격파했습니다.
        </h2>

        <p
        style="
        font-size:24px;
        margin-bottom:50px;
        ">
        인류는 다시 평화를 되찾았습니다.
        </p>

        <button
        onclick="location.reload()">

        처음으로

        </button>

    </div>

    `;

}





// 전투 버튼 연결
battleBtn.addEventListener(

"click",

()=>{

    homeScreen.classList.add("hidden");

    battleScreen.classList.remove("hidden");

    startBattle();

}

);




// 결과 버튼(테스트용)
if(resultBtn){

    resultBtn.addEventListener(

    "click",

    ()=>{

        if(!battleRunning){

            startBattle();

        }

    });

}





console.log("BATTLE SYSTEM READY");
