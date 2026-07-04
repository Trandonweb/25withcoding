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
        <div style="display:flex;flex-direction:column;height:100%;position:relative;">
            <div style="display:flex;flex:1;gap:10px;margin-bottom:10px;overflow:hidden;">
                <div style="flex:1;display:flex;flex-direction:column;background:#f6f6f6;border-radius:12px;padding:10px;overflow:auto" id="aiChat">
                    <b style="text-align:center">AI</b>
                </div>
                <div style="width:2px;background:#ddd"></div>
                <div style="flex:1;display:flex;flex-direction:column;background:#f9f9f9;border-radius:12px;padding:10px;overflow:auto" id="playerChat">
                    <b style="text-align:center">YOU</b>
                </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center" id="inputArea">
                <input id="inputBox"
                    style="flex:1;padding:3px 10px;border-radius:10px;border:1px solid #ccc"
                    placeholder="1~100 숫자 입력">
                <button class="game-select-btn" style="padding:3px 12px" onclick="window.__send()">➤</button>
            </div>
            <button id="nextBtn" class="game-select-btn" 
                style="display:none; position:absolute; bottom:0; right:0; padding:5px 15px; z-index:10;"
                onclick="window.__finishGame()">
                다음
            </button>
        </div>
    `;

    window.__send = playerSend;
    window.__finishGame = finish;

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

    // 진행 중에는 숫자를 '??'로 숨겨서 출력 (id 속성을 부여하여 나중에 변경할 수 있도록 함)
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

        // 진행 중에는 숫자를 '??'로 출력
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
    div.style.margin = "6px 0";

    if(sys){
        div.innerHTML = `<div style="text-align:center;color:#666;font-size:0.9em;">${text}</div>`;
    } else {
        // AI 메시지 구분을 위해 id 추가가 가능하도록 수정
        const idAttr = id ? `id="${id}"` : "";
        div.innerHTML = `<div ${idAttr} style="padding:6px 10px;background:#ddd;border-radius:10px;display:inline-block">${text}</div>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ---------------- SHOW NEXT BUTTON & REVEAL AI GUESSES ----------------
// 조건이 충족되면 AI 내역을 전부 공개하고 입력창을 숨긴 뒤 우측 하단에 '다음' 버튼을 띄웁니다.
function showNextButton(){
    // 1. AI가 냈던 실제 숫자들을 '??'에서 복원
    aiHistory.forEach((actualGuess, index) => {
        const guessEl = document.getElementById(`ai-guess-${index}`);
        if(guessEl) {
            guessEl.textContent = actualGuess;
        }
    });

    // 2. 정답 카드 공개
    revealCard();

    // 3. 하단 입력창을 숨기고 '다음' 버튼 활성화
    const inputArea = document.getElementById("inputArea");
    if(inputArea) inputArea.style.display = "none";

    const nextBtn = document.getElementById("nextBtn");
    if(nextBtn) nextBtn.style.display = "block";
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

    // 부모 컨테이너 내부 요소 전체 중앙 정렬 구성 및 AI 로그 세션 제거
    // 다시하기 버튼 높이 축소 (padding: 4px 16px 수준으로 조절)
    gameAreaRef.innerHTML = `
        <div style="display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; text-align:center;">
            <h2>${result}</h2>
            <p>PLAYER: ${playerScore}회</p>
            <p style="margin-bottom: 25px;">AI: ${aiScore}회</p>
            
            <button class="game-select-btn" style="padding:4px 16px;" onclick="location.reload()">
                다시하기
            </button>
        </div>
    `;
}
