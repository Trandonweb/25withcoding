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

            <div style="
                display:flex;
                flex-direction:column;
                gap:10px;
                max-width:300px;
                margin:0 auto;
            ">

                <button class="game-select-btn"
                    onclick="window.__start('easy')">
                    쉬움
                </button>

                <button class="game-select-btn"
                    onclick="window.__start('normal')">
                    보통
                </button>

                <button class="game-select-btn"
                    onclick="window.__start('hard')">
                    어려움
                </button>

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
        <div style="display:flex;flex-direction:column;height:100%;">

            <!-- 채팅 -->
            <div style="display:flex;flex:1;gap:10px;margin-bottom:10px;overflow:hidden;">

                <div id="aiChat"
                    style="
                        flex:1;
                        display:flex;
                        flex-direction:column;
                        background:#f6f6f6;
                        border-radius:12px;
                        padding:10px;
                        overflow:auto;
                    ">
                    <b style="text-align:center;margin-bottom:8px;">AI</b>
                </div>

                <div style="width:2px;background:#ddd;"></div>

                <div id="playerChat"
                    style="
                        flex:1;
                        display:flex;
                        flex-direction:column;
                        background:#f9f9f9;
                        border-radius:12px;
                        padding:10px;
                        overflow:auto;
                    ">
                    <b style="text-align:center;margin-bottom:8px;">YOU</b>
                </div>

            </div>

            <!-- 입력 -->
            <div
                id="inputArea"
                style="
                    display:flex;
                    gap:8px;
                    align-items:center;
                ">

                <input
                    id="inputBox"
                    placeholder="1~100 숫자 입력"
                    style="
                        flex:1;
                        height:36px;
                        padding:0 10px;
                        border:1px solid #ccc;
                        border-radius:8px;
                        font-size:0.95rem;
                        outline:none;
                    ">

                <button
                    onclick="window.__send()"
                    style="
                        width:42px;
                        height:36px;
                        border:none;
                        border-radius:8px;
                        background:#1ea857;
                        color:white;
                        font-size:18px;
                        cursor:pointer;
                    ">
                    ➤
                </button>

            </div>

            <!-- 다음 -->
            <div
                id="nextBtnArea"
                style="
                    display:none;
                    text-align:right;
                    margin-top:8px;
                ">

                <button
                    id="nextBtn"
                    onclick="window.__finishGame()"
                    style="
                        height:34px;
                        padding:0 16px;
                        border:none;
                        border-radius:8px;
                        background:#1ea857;
                        color:white;
                        font-size:0.9rem;
                        cursor:pointer;
                    ">
                    다음
                </button>

            </div>

        </div>
    `;

    window.__send = playerSend;
    window.__finishGame = finish;

    document.getElementById("inputBox")
        .addEventListener("keydown", e=>{
            if(e.key === "Enter"){
                playerSend();
            }
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
        revealAILogRapidly();
        return;
    }

    if(value < target){
        playerDone ? null : addPlayerMessage("UP");
    } else {
        playerDone ? null : addPlayerMessage("DOWN");
    }

    // 플레이어가 틀렸다면 AI가 한 걸음 다가옵니다.
    setTimeout(aiTurn, 400);
}

// ---------------- AI TURN (STEP BY STEP) ----------------
function aiTurn(){
    if(gameOver || aiDone) return;

    if(aiCurrentIndex >= aiPrecomputedGuesses.length) return;

    let guess = aiPrecomputedGuesses[aiCurrentIndex];
    aiHistory.push(guess);
    aiCurrentIndex++;

    addAIMessage("??", `ai-guess-${aiCurrentIndex-1}`);

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
function revealAILogRapidly() {
    addSystem("🏁 플레이어 정답! AI의 남은 계산 로그를 출력합니다.");
    
    let interval = setInterval(() => {
        if(aiCurrentIndex >= aiPrecomputedGuesses.length) {
            clearInterval(interval);
            aiDone = true;
            showNextButton();
            return;
        }

        let guess = aiPrecomputedGuesses[aiCurrentIndex];
        aiHistory.push(guess);
        aiCurrentIndex++;

        addAIMessage("??", `ai-guess-${aiCurrentIndex-1}`);

        if(guess === target) {
            addAIMessage("정답!");
            clearInterval(interval);
            aiDone = true;
            showNextButton();
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

// 말풍선 내부 여백도 컴팩트하게 어울리도록 살짝 조정 가능합니다 (필요시 padding 수정)
function addAIMessage(text, id = ""){
    const el = document.getElementById("aiChat");
    pushMsg(el, text, false, id);
}

function addSystem(text){
    const el = document.getElementById("playerChat");
    pushMsg(el, text, true);
}

function pushMsg(container, text, sys=false, id=""){
    if(!container) return;
    const div = document.createElement("div");
    div.style.margin = "4px 0";

    if(sys){
        div.innerHTML = `<div style="text-align:center;color:#666;font-size:0.85em;">${text}</div>`;
    } else {
        const idAttr = id ? `id="${id}"` : "";
        div.innerHTML = `<div ${idAttr} style="padding:4px 8px;background:#ddd;border-radius:8px;display:inline-block;font-size:0.95em;">${text}</div>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ---------------- SHOW NEXT BUTTON & REVEAL AI GUESSES ----------------
function showNextButton(){
    aiHistory.forEach((actualGuess, index) => {
        const guessEl = document.getElementById(`ai-guess-${index}`);
        if(guessEl) {
            guessEl.textContent = actualGuess;
        }
    });

    revealCard();

    const inputArea = document.getElementById("inputArea");
    if(inputArea) inputArea.style.display = "none";

    const nextBtnArea = document.getElementById("nextBtnArea");
    if(nextBtnArea) nextBtnArea.style.display = "block";
}

// ---------------- CARD ----------------
function revealCard(){
    addSystem(`🃏 정답 공개: ${target}`);
}

// ---------------- FINISH CONTROL ----------------
function checkFinish(){
    if(playerDone && aiDone){
        showNextButton();
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

    // 결과 화면의 다시하기 버튼 세로 padding을 기존 4px에서 1/3 수준인 1.5px로 축소
    gameAreaRef.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; text-align:center;">
            <h2 style="margin-bottom: 10px;">${result}</h2>
            <p style="margin: 4px 0;">PLAYER: ${playerScore}회</p>
            <p style="margin: 4px 0; margin-bottom: 15px;">AI: ${aiScore}회</p>
            
            <button class="game-select-btn" style="padding:1.5px 12px; font-size:0.9em; height:22px; box-sizing:border-box;" onclick="location.reload()">
                다시하기
            </button>
        </div>
    `;
}
