let gameAreaRef = null;

let target = 0;

let gameOver = false;

let difficulty = "easy";

let playerHistory = [];
let aiHistory = [];

let aiMin = 1;
let aiMax = 100;

let aiThinking = false;

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

    renderChatUI();
}

// ---------------- UI ----------------
function renderChatUI(){

    gameAreaRef.innerHTML = `
        <div style="height:100%;display:flex;flex-direction:column;">

            <!-- CHAT AREA -->
            <div id="chat"
                style="flex:1;overflow:auto;padding:10px;background:#f5f5f5;border-radius:12px">

            </div>

            <!-- INPUT -->
            <div style="display:flex;margin-top:10px;gap:10px">

                <input id="inputBox"
                    style="flex:1;padding:10px;border-radius:10px;border:1px solid #ccc"
                    placeholder="숫자 입력 (1~100)">

                <button onclick="window.__send()" class="game-select-btn">➤</button>

            </div>

        </div>
    `;

    window.__send = playerSend;

    document.getElementById("inputBox")
        .addEventListener("keydown", e=>{
            if(e.key==="Enter") playerSend();
        });

    addAIMessage("??");
}

// ---------------- PLAYER ----------------
function playerSend(){

    if(gameOver) return;

    const input = document.getElementById("inputBox");

    let value = Number(input.value);

    if(!value || value < 1 || value > 100) return;

    input.value = "";

    playerHistory.push(value);

    addPlayerMessage(value);

    if(value === target){
        revealCard();
        return finish("PLAYER WIN");
    }

    if(value < target){
        addSystem("UP");
    } else {
        addSystem("DOWN");
    }

    setTimeout(aiTurn, 500);
}

// ---------------- AI ----------------
function aiTurn(){

    if(gameOver || aiThinking) return;

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

    addAIMessage(guess);

    setTimeout(()=>{

        if(guess === target){
            revealCard();
            return finish("AI WIN");
        }

        if(guess < target){
            aiMin = guess+1;
            addSystem("AI UP");
        } else {
            aiMax = guess-1;
            addSystem("AI DOWN");
        }

        aiThinking = false;

    }, 400);
}

// ---------------- CHAT UI ----------------
function addPlayerMessage(text){
    addMessage("right", text, "you");
}

function addAIMessage(text){
    addMessage("left", text, "ai");
}

function addSystem(text){
    addMessage("center", text, "sys");
}

function addMessage(side, text, type){

    const chat = document.getElementById("chat");

    const div = document.createElement("div");

    div.style.margin = "6px 0";

    if(type === "sys"){
        div.style.textAlign = "center";
        div.innerHTML = `<span style="background:#ddd;padding:4px 10px;border-radius:8px">${text}</span>`;
    }

    else if(side === "right"){
        div.style.textAlign = "right";
        div.innerHTML = `<span style="background:#4cafef;color:white;padding:6px 10px;border-radius:12px">${text}</span>`;
    }

    else{
        div.style.textAlign = "left";
        div.innerHTML = `<span style="background:#eee;padding:6px 10px;border-radius:12px">${text}</span>`;
    }

    chat.appendChild(div);

    chat.scrollTop = chat.scrollHeight;
}

// ---------------- CARD ----------------
function revealCard(){

    addSystem(`🃏 정답: ${target}`);
}

// ---------------- FINISH ----------------
function finish(msg){

    gameOver = true;

    const playerScore = playerHistory.length;
    const aiScore = aiHistory.length;

    let result = "DRAW";

    if(playerScore < aiScore) result = "PLAYER WIN";
    if(playerScore > aiScore) result = "AI WIN";

    gameAreaRef.innerHTML = `
        <div style="text-align:center">

            <h2>${result}</h2>

            <p>PLAYER: ${playerScore}회</p>
            <p>AI: ${aiScore}회</p>

            <button class="game-select-btn" onclick="location.reload()">
                다시하기
            </button>

        </div>
    `;
}
