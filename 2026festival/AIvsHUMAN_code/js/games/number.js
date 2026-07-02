let gameAreaRef = null;

let difficulty = "easy";

let target = 0;

let playerMin = 1;
let playerMax = 100;

let aiMin = 1;
let aiMax = 100;

let playerCount = 0;
let aiCount = 0;

let gameOver = false;

let aiTimer = null;

export function openNumber(gameArea){

    gameAreaRef = gameArea;

    showDifficulty();
}

function showDifficulty(){

    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>숫자 맞히기</h2>
            <p>AI 난이도를 선택하세요.</p>

            <div style="
                display:flex;
                flex-direction:column;
                gap:15px;
                max-width:300px;
                margin:auto;
            ">

                <button class="game-select-btn"
                    onclick="window.__numStart('easy')">
                    쉬움
                </button>

                <button class="game-select-btn"
                    onclick="window.__numStart('normal')">
                    보통
                </button>

                <button class="game-select-btn"
                    onclick="window.__numStart('hard')">
                    어려움
                </button>

            </div>
        </div>
    `;

    window.__numStart = startGame;
}

function startGame(level){

    difficulty = level;

    target = Math.floor(Math.random()*100)+1;

    playerMin = 1;
    playerMax = 100;

    aiMin = 1;
    aiMax = 100;

    playerCount = 0;
    aiCount = 0;

    gameOver = false;

    render();

    startAI();
}

function render(){

    gameAreaRef.innerHTML = `
        <div style="text-align:center">

            <h2>숫자 맞히기</h2>

            <p>
                범위 :
                <b>${playerMin}</b>
                ~
                <b>${playerMax}</b>
            </p>

            <input
                id="playerInput"
                type="number"
                min="${playerMin}"
                max="${playerMax}"
                style="
                    padding:10px;
                    font-size:18px;
                    width:120px;
                ">

            <br><br>

            <button
                class="game-select-btn"
                onclick="window.__playerGuess()">
                확인
            </button>

            <hr>

            <p>
                플레이어 :
                <span id="playerInfo">
                    ${playerCount}회
                </span>
            </p>

            <p>
                AI :
                <span id="aiInfo">
                    ${aiCount}회
                </span>
            </p>

            <p id="msg"></p>

        </div>
    `;

    window.__playerGuess = playerGuess;
}

function playerGuess(){

    if(gameOver) return;

    const input =
        document.getElementById("playerInput");

    const guess =
        Number(input.value);

    if(
        isNaN(guess) ||
        guess<playerMin ||
        guess>playerMax
    ){
        return;
    }

    playerCount++;

    if(guess===target){

        finish("PLAYER WIN");

        return;
    }

    if(guess<target){

        playerMin=guess+1;

        document.getElementById("msg").innerHTML=
            "UP";
    }
    else{

        playerMax=guess-1;

        document.getElementById("msg").innerHTML=
            "DOWN";
    }

    render();
}
function startAI(){

    if(aiTimer){
        clearInterval(aiTimer);
    }

    aiTimer = setInterval(()=>{

        if(gameOver){

            clearInterval(aiTimer);
            aiTimer = null;
            return;
        }

        aiTurn();

    },700);
}

function aiTurn(){

    let guess;

    if(difficulty==="easy"){

        guess =
            Math.floor(
                Math.random()*
                (aiMax-aiMin+1)
            ) + aiMin;
    }

    else if(difficulty==="normal"){

        const center =
            Math.floor(
                (aiMin+aiMax)/2
            );

        const range =
            Math.max(
                1,
                Math.floor(
                    (aiMax-aiMin)/4
                )
            );

        const min =
            Math.max(
                aiMin,
                center-range
            );

        const max =
            Math.min(
                aiMax,
                center+range
            );

        guess =
            Math.floor(
                Math.random()*
                (max-min+1)
            ) + min;
    }

    else{

        guess =
            Math.floor(
                (aiMin+aiMax)/2
            );
    }

    aiCount++;

    document.getElementById("aiInfo").innerHTML =
        aiCount+"회";

    if(guess===target){

        finish("AI WIN");

        return;
    }

    if(guess<target){

        aiMin = guess+1;
    }
    else{

        aiMax = guess-1;
    }
}
function finish(msg){

    gameOver = true;

    if(aiTimer){
        clearInterval(aiTimer);
        aiTimer = null;
    }

    gameAreaRef.innerHTML = `
        <div style="text-align:center">

            <h2>${msg}</h2>

            <p>
                정답 :
                <b>${target}</b>
            </p>

            <p>
                플레이어 :
                ${playerCount}회
            </p>

            <p>
                AI :
                ${aiCount}회
            </p>

            <br>

            <button
                class="game-select-btn"
                onclick="window.__numRestart()">
                다시하기
            </button>

        </div>
    `;

    window.__numRestart = showDifficulty;
}

export function destroy(){

    gameOver = true;

    if(aiTimer){
        clearInterval(aiTimer);
        aiTimer = null;
    }
}

window.__numStart = startGame;
