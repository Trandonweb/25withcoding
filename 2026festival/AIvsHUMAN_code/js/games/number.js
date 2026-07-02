let gameAreaRef = null;

let target = 0;

let playerCount = 0;
let aiCount = 0;

let gameOver = false;

let difficulty = "easy";

let aiMin = 1;
let aiMax = 100;

let aiHistory = [];
let playerHistory = [];

let aiTimer = null;

// ---------------- ENTRY ----------------
export function openNumber(gameArea){

    gameAreaRef = gameArea;

    showDifficulty();
}

// ---------------- DIFFICULTY ----------------
function showDifficulty(){

    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>숫자 맞히기</h2>

            <button onclick="window.__numStart('easy')" class="game-select-btn">쉬움</button>
            <button onclick="window.__numStart('normal')" class="game-select-btn">보통</button>
            <button onclick="window.__numStart('hard')" class="game-select-btn">어려움</button>
        </div>
    `;

    window.__numStart = startGame;
}

// ---------------- START ----------------
function startGame(level){

    difficulty = level;

    target = Math.floor(Math.random()*100)+1;

    playerCount = 0;
    aiCount = 0;

    gameOver = false;

    aiMin = 1;
    aiMax = 100;

    aiHistory = [];
    playerHistory = [];

    render();

    startAI();
}

// ---------------- RENDER UI ----------------
function render(){

    let aiChat = aiHistory.map(v=>`<div class="bubble ai">??</div>`).join("");

    let playerChat = playerHistory.map(v=>`<div class="bubble me">${v}</div>`).join("");

    gameAreaRef.innerHTML = `
        <div style="height:100%;display:flex;flex-direction:column;">

            <div style="text-align:center;margin-bottom:10px;">
                <h3>숫자 맞히기</h3>
                <p>횟수로 경쟁</p>
            </div>

            <div style="
                display:flex;
                justify-content:space-between;
                height:300px;
                position:relative;
            ">

                <!-- AI -->
                <div style="width:45%;">
                    ${aiChat}
                </div>

                <!-- CENTER LINE -->
                <div style="
                    width:2px;
                    background:#ddd;
                    position:absolute;
                    left:50%;
                    top:0;
                    bottom:0;
                "></div>

                <!-- PLAYER -->
                <div style="width:45%;text-align:right;">
                    ${playerChat}
                </div>

            </div>

            <div style="text-align:center;margin-top:20px;">
                <button onclick="window.__guess(1)">1</button>
                <button onclick="window.__guess(50)">50</button>
                <button onclick="window.__guess(100)">100</button>
            </div>

            <div id="card" style="text-align:center;margin-top:20px;font-size:2rem;">
                🂠
            </div>

            <div id="status" style="text-align:center;margin-top:10px;"></div>

        </div>
    `;

    window.__guess = playerGuess;
}

// ---------------- PLAYER GUESS ----------------
function playerGuess(n){

    if(gameOver) return;

    playerCount++;

    playerHistory.push(n);

    if(n === target){
        revealCard();
        return finish("PLAYER WIN");
    }

    if(n < target){
        pushStatus("UP");
    }else{
        pushStatus("DOWN");
    }

    render();
}

// ---------------- AI ----------------
function startAI(){

    if(aiTimer) clearInterval(aiTimer);

    aiTimer = setInterval(()=>{

        if(gameOver){
            clearInterval(aiTimer);
            return;
        }

        aiGuess();

    }, 900);
}

function aiGuess(){

    let guess;

    if(difficulty === "easy"){

        guess = Math.floor(Math.random()*(aiMax-aiMin+1))+aiMin;
    }

    else if(difficulty === "normal"){

        let mid = Math.floor((aiMin+aiMax)/2);

        let spread = Math.floor((aiMax-aiMin)/4);

        let min = Math.max(aiMin, mid-spread);
        let max = Math.min(aiMax, mid+spread);

        guess = Math.floor(Math.random()*(max-min+1))+min;
    }

    else{

        guess = Math.floor((aiMin+aiMax)/2);
    }

    aiCount++;
    aiHistory.push(guess);

    if(guess === target){
        revealCard();
        return finish("AI WIN");
    }

    if(guess < target){
        aiMin = guess+1;
        pushStatusAI("UP");
    }else{
        aiMax = guess-1;
        pushStatusAI("DOWN");
    }

    render();
}

// ---------------- STATUS ----------------
function pushStatus(text){
    let el = document.getElementById("status");
    if(el) el.innerHTML = `<div>${text}</div>`;
}

function pushStatusAI(text){
    let el = document.getElementById("status");
    if(el) el.innerHTML = `<div>AI: ${text}</div>`;
}

// ---------------- CARD REVEAL ----------------
function revealCard(){

    let el = document.getElementById("card");

    if(el){
        el.innerHTML = `🃏<br><b>${target}</b>`;
    }
}

// ---------------- FINISH ----------------
function finish(msg){

    gameOver = true;

    if(aiTimer) clearInterval(aiTimer);

    gameAreaRef.innerHTML = `
        <div style="text-align:center">

            <h2>${msg}</h2>

            <p>정답: ${target}</p>

            <p>PLAYER: ${playerCount}회</p>
            <p>AI: ${aiCount}회</p>

            <button onclick="window.__numRestart()" class="game-select-btn">
                다시하기
            </button>

        </div>
    `;

    window.__numRestart = showDifficulty;
}

// ---------------- DESTROY ----------------
export function destroy(){

    gameOver = true;

    if(aiTimer){
        clearInterval(aiTimer);
        aiTimer = null;
    }
}
