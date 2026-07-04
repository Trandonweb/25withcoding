let gameAreaRef = null;

let target = 0;

let gameOver = false;
let difficulty = "easy";

let playerHistory = [];
let aiHistory = [];

// AI가 한 번에 계산한 전체 추측 기록을 담을 배열과 현재 출력 인덱스
let aiPrecomputedGuesses = [];
let aiCurrentIndex = 0;

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
    aiPrecomputedGuesses = [];
    aiCurrentIndex = 0;

    playerDone = false;
    aiDone = false;

    // 게임 시작 시 AI의 플레이를 한 번에 시뮬레이션하여 저장
    precomputeAIGame();

    renderUI();
    addSystem("게임 시작!");
}

// ---------------- AI PRECOMPUTATION ----------------
// AI가 정답을 맞힐 때까지의 모든 과정을 한 번에 미리 계산합니다.
function precomputeAIGame() {
    let min = 1;
    let max = 100;
    let guess = 0;
    let loopCount = 0; // 무한 루프 방지 안전장치

    while (guess !== target && loopCount < 200) {
        loopCount++;
        if (difficulty === "easy") {
            guess = Math.floor(Math.random() * (max - min + 1)) + min;
        } else if (difficulty === "normal") {
            let mid = Math.floor((min + max) / 2);
            let spread = Math.floor((max - min) / 4);
            let rMin = Math.max(min, mid - spread);
            let rMax = Math.min(max, mid + spread);
            guess = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
        } else {
            guess = Math.floor((min + max) / 2);
        }

        aiPrecomputedGuesses.push(guess);

        if (guess === target) {
            break;
        } else if (guess < target) {
            min = guess + 1;
        } else {
            max = guess - 1;
        }
    }
}

// ---------------- UI ----------------
function renderUI(){
    gameAreaRef.innerHTML = `
        <div style="display:flex;flex-direction:column;height:100%">
            <div style="display:flex;flex:1;gap:10px;">
                <div style="flex:1;display:flex;flex-direction:column;background:#f6f6f6;border-radius:12px;padding:10px;overflow:auto" id="aiChat">
                    <b style="text-align:center">AI</b>
                </div>
                <div style="width:2px;background:#ddd"></div>
                <div style="flex:1;display:flex;flex-direction:column;background:#f9f9f9;border-radius:12px;padding:10px;overflow:auto" id="playerChat">
                    <b style="text-align:center">YOU</b>
                </div>
            </div>
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
        addPlayerMessage("정답!");
        
        // 플레이어가 먼저 맞췄으므로 AI의 남은 답변을 0.3초 간격으로 빠르게 모두 내보냅니다.
        revealAILogRapidly();
        return;
    }

    if(value < target){
        addPlayerMessage("UP");
    } else {
        addPlayerMessage("DOWN");
    }

    // 플레이어가 틀렸다면 AI가 한 걸음 다가옵니다.
    setTimeout(aiTurn, 400);
}

// ---------------- AI TURN (STEP BY STEP) ----------------
function aiTurn(){
    if(gameOver || aiDone) return;

    // AI가 이미 계산해둔 버퍼에서 순서대로 하나를 꺼내옵니다.
    if(aiCurrentIndex >= aiPrecomputedGuesses.length) return;

    let guess = aiPrecomputedGuesses[aiCurrentIndex];
    aiHistory.push(guess);
    aiCurrentIndex++;

    addAIMessage(guess);

    if(guess === target){
        aiDone = true;
        addAIMessage("정답!");
        addSystem("🚨 AI가 먼저 정답을 맞췄습니다! 플레이어는 계속 플레이할 수 있습니다.");
        checkFinish();
        return;
    }

    if(guess < target){
        addAIMessage("UP");
    } else {
        addAIMessage("DOWN");
    }

    checkFinish();
}

// ---------------- AI RAPID REVEAL ----------------
// 플레이어가 먼저 맞췄을 때 AI의 남은 답변을 쏟아내는 함수
function revealAILogRapidly() {
    addSystem("🏁 플레이어 정답! AI의 남은 계산 로그를 출력합니다.");
    
    let interval = setInterval(() => {
        if(aiCurrentIndex >= aiPrecomputedGuesses.length) {
            clearInterval(interval);
            aiDone = true;
            revealCard();
            finish();
            return;
        }

        let guess = aiPrecomputedGuesses[aiCurrentIndex];
        aiHistory.push(guess);
        aiCurrentIndex++;

        addAIMessage(guess);

        if(guess === target) {
            addAIMessage("정답!");
            clearInterval(interval);
            aiDone = true;
            revealCard();
            finish();
            return;
        }

        if(guess < target){
            addAIMessage("UP");
        } else {
            addAIMessage("DOWN");
        }
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
    if(!container) return;
    const div = document.createElement("div");
    div.style.margin = "6px 0";

    if(sys){
        div.innerHTML = `<div style="text-align:center;color:#666;font-size:0.9em;">${text}</div>`;
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
        revealCard();
        finish();
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
