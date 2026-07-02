let gameAreaRef = null;

let target = 0;

let gameOver = false;
let difficulty = "easy";

let playerHistory = [];
let aiHistory = [];

let aiMin = 1;
let aiMax = 100;

let aiThinking = false;

let playerDone = false;
let aiDone = false;

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

            <div style="display:flex;flex-direction:column;gap:10px;max-width:300px;margin:0 auto">

                <button class="game-select-btn" onclick="window.__start('easy')">쉬움</button>
                <button class="game-select-btn" onclick="window.__start('normal')">보통</button>
                <button class="game-select-btn" onclick="window.__start('hard')">어려움</button>

            </div>
        </div>
    `;

    window.__start = startGame;
}

// ---------------- START ----------------
function startGame(level){

    difficulty = level;

    target = Math.floor(Math.random()*100)+1;

    gameOver = false;

    playerHistory = [];
    aiHistory = [];

    aiMin = 1;
    aiMax = 100;

    playerDone = false;
    aiDone = false;

    renderUI();

    addSystem("게임 시작!");
    addAIMessage("??");
}

// ---------------- UI ----------------
function renderUI(){

    gameAreaRef.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%">

            <!-- CHAT WRAPPER -->
            <div style="display:flex;flex:1;gap:10px;">

                <!-- AI SIDE -->
                <div style="flex:1;display:flex;flex-direction:column;background:#f6f6f6;border-radius:12px;padding:10px;overflow:auto" id="aiChat">
                    <b style="text-align:center">AI</b>
                </div>

                <!-- CENTER LINE -->
                <div style="width:2px;background:#ddd"></div>

                <!-- PLAYER SIDE -->
                <div style="flex:1;display:flex;flex-direction:column;background:#f9f9f9;border-radius:12px;padding:10px;overflow:auto" id="playerChat">
                    <b style="text-align:center">YOU</b>
                </div>

            </div>

            <!-- INPUT -->
            <div style="display:flex;gap:10px;margin-top:10px">

                <input id="inputBox"
                    style="flex:1;padding:10px;border-radius:10px;border:1px solid #ccc"
                    placeholder="1~100 숫자 입력">

                <button class="game-select-btn" onclick="window.__send()">➤</button>

            </div>

        </div>
    `;

    window.__send = playerSend;

    document.getElementById("inputBox")
        .addEventListener("keydown", e=>{
            if(e.key==="Enter") playerSend();
        });
}

// ---------------- PLAYER ----------------
function playerSend(){

    if(gameOver || playerDone) return;

    const input = document.getElementById("inputBox");
    let value = Number(input.value);

    if(!value || value < 1 || value > 100) return;

    input.value = "";

    playerHistory.push(value);

    addPlayerMessage(value);

    if(value === target){
        playerDone = true;
        revealCard();
        checkFinish();
        return;
    }

    if(value < target){
        addPlayerMessage("UP");
    } else {
        addPlayerMessage("DOWN");
    }

    setTimeout(aiTurn, 400);
}

// ---------------- AI ----------------
function aiTurn(){

    if(gameOver || aiThinking || aiDone) return;

    aiThinking = true;

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

    aiHistory.push(guess);

    addAIMessage("??"); // 비밀 유지

    setTimeout(()=>{

        if(guess === target){
            aiDone = true;
            revealCard();
            checkFinish();
            return;
        }

        if(guess < target){
            aiMin = guess+1;
            addAIMessage("UP");
        } else {
            aiMax = guess-1;
            addAIMessage("DOWN");
        }

        aiThinking = false;

    }, 300);
}

// ---------------- UI MESSAGES ----------------
function addPlayerMessage(text){
    const el = document.getElementById("playerChat");
    pushMsg(el, text);
}

function addAIMessage(text){
    const el = document.getElementById("aiChat");
    pushMsg(el, text);
}

function addSystem(text){
    const el = document.getElementById("playerChat");
    pushMsg(el, text, true);
}

function pushMsg(container, text, sys=false){

    const div = document.createElement("div");
    div.style.margin = "6px 0";

    if(sys){
        div.innerHTML = `<div style="text-align:center;color:#666">${text}</div>`;
    } else {
        div.innerHTML = `<div style="padding:6px 10px;background:#ddd;border-radius:10px;display:inline-block">${text}</div>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ---------------- CARD ----------------
function revealCard(){
    addSystem(`🃏 정답 공개: ${target}`);
}

// ---------------- FINISH CONTROL ----------------
function checkFinish(){

    if(playerDone && aiDone){
        finish();
    }

    // 한쪽만 끝나도 기다림
    if(playerDone && !aiDone){
        addSystem("⏳ AI 계산 중...");
    }

    if(aiDone && !playerDone){
        addSystem("⏳ 플레이어 입력 대기...");
    }
}

// ---------------- END ----------------
function finish(){

    gameOver = true;

    const playerScore = playerHistory.length;
    const aiScore = aiHistory.length;

    let result = "DRAW";

    if(playerScore < aiScore) result = "PLAYER WIN";
    if(playerScore > aiScore) result = "AI WIN";

    // AI 로그 공개
    const aiLog = aiHistory.join(", ");

    gameAreaRef.innerHTML = `
        <div style="text-align:center">

            <h2>${result}</h2>

            <p>PLAYER: ${playerScore}회</p>
            <p>AI: ${aiScore}회</p>

            <details style="margin-top:15px">
                <summary>AI 기록 보기</summary>
                <p>${aiLog}</p>
            </details>

            <button class="game-select-btn" onclick="location.reload()">
                다시하기
            </button>

        </div>
    `;
}
