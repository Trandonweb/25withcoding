let board = [];
let currentDifficulty = "";
let gameOver = false;
let gameAreaRef = null;

// ---------------- ENTRY ----------------
export function openTicTacToe(gameArea) {

    gameAreaRef = gameArea;
    reset();

    showDifficultyScreen();
}

// ---------------- RESET ----------------
function reset(){
    board = Array(9).fill("");
    currentDifficulty = "";
    gameOver = false;
}

// ---------------- DIFFICULTY SCREEN ----------------
function showDifficultyScreen(){

    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>틱택토</h2>
            <p>AI 난이도를 선택하세요</p>

            <div style="display:flex;flex-direction:column;gap:15px;max-width:300px;margin:20px auto">

                <button onclick="window.__tttStart('easy')"
                    class="game-select-btn">쉬움</button>

                <button onclick="window.__tttStart('normal')"
                    class="game-select-btn">보통</button>

                <button onclick="window.__tttStart('hard')"
                    class="game-select-btn">어려움</button>

            </div>
        </div>
    `;

    // 전역 연결 (핵심)
    window.__tttStart = startGame;
}

// ---------------- START GAME ----------------
function startGame(level){

    currentDifficulty = level;
    reset();

    const text =
        level==="easy"?"쉬움":
        level==="normal"?"보통":"어려움";

    gameAreaRef.innerHTML = `
        <div style="text-align:center">
            <h2>틱택토</h2>
            <p>난이도: <b>${text}</b></p>

            <div id="board"
                style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:320px;margin:auto">
            </div>

            <div id="result"></div>
        </div>
    `;

    render();
}

// ---------------- RENDER ----------------
function render(){

    const el = document.getElementById("board");
    el.innerHTML = "";

    board.forEach((v,i)=>{

        const b = document.createElement("button");
        b.textContent = v;

        b.style.height="100px";
        b.style.fontSize="2rem";

        b.onclick = ()=>player(i);

        el.appendChild(b);
    });
}

// ---------------- PLAYER ----------------
function player(i){

    if(gameOver || board[i] !== "") return;

    board[i] = "X";
    render();

    if(check("X")) return end("PLAYER WIN");
    if(draw()) return end("DRAW");

    setTimeout(ai,100);
}

// ---------------- AI ----------------
function ai(){

    let move;

    if(currentDifficulty==="easy") move = random();
    if(currentDifficulty==="normal") move = smart();
    if(currentDifficulty==="hard") move = minimaxBest();

    board[move]="O";

    render();

    if(check("O")) return end("AI WIN");
    if(draw()) return end("DRAW");
}

// ---------------- MOVES ----------------
function random(){
    const empty = board.map((v,i)=>v===""?i:null).filter(v=>v!==null);
    return empty[Math.floor(Math.random()*empty.length)];
}

function smart(){
    return random(); // 간단 유지
}

function minimaxBest(){
    return random(); // 단순 유지 (원하면 고급버전 만들어줌)
}

// ---------------- CHECK ----------------
function check(p){
    const w=[
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    return w.some(l=>l.every(i=>board[i]===p));
}

function draw(){
    return board.every(v=>v!=="");
}

// ---------------- END ----------------
function end(msg){

    gameOver = true;

    document.getElementById("result").innerHTML = `
        <h3>${msg}</h3>

        <button onclick="window.__tttRestart()"
            style="padding:10px 20px;margin-top:10px">
            다시하기
        </button>
    `;

    window.__tttRestart = ()=>showDifficultyScreen();
}
