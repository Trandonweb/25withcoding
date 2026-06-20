let board = [];
let currentDifficulty = "";
let gameOver = false;
let gameAreaRef = null;

// ---------------------- ENTRY ----------------------

export function openTicTacToe(gameArea) {

    gameAreaRef = gameArea;
    resetGameState();

    gameArea.innerHTML = `
        <div class="ttt-container">
            <h2>틱택토</h2>

            <p>AI 난이도를 선택하세요</p>

            <div class="ttt-difficulty-list">
                <button class="ttt-difficulty-btn" data-difficulty="easy">쉬움</button>
                <button class="ttt-difficulty-btn" data-difficulty="normal">보통</button>
                <button class="ttt-difficulty-btn" data-difficulty="hard">어려움</button>
            </div>
        </div>
    `;

    gameArea.querySelectorAll(".ttt-difficulty-btn")
        .forEach(btn => {
            btn.onclick = () => {
                startGame(btn.dataset.difficulty);
            };
        });
}

// ---------------------- RESET ----------------------

function resetGameState() {
    board = Array(9).fill("");
    gameOver = false;
    currentDifficulty = "";
}

// ---------------------- START ----------------------

function startGame(difficulty) {

    resetGameState();
    currentDifficulty = difficulty;

    const text =
        difficulty === "easy" ? "쉬움"
        : difficulty === "normal" ? "보통"
        : "어려움";

    gameAreaRef.innerHTML = `
        <div class="ttt-container">

            <h2>틱택토</h2>

            <p style="text-align:center">
                난이도: <b>${text}</b>
            </p>

            <div id="board"
                style="
                    display:grid;
                    grid-template-columns:repeat(3,1fr);
                    gap:10px;
                    max-width:320px;
                    margin:auto;
                ">
            </div>

            <div id="result"></div>

        </div>
    `;

    renderBoard();
}

// ---------------------- BOARD ----------------------

function renderBoard() {

    const boardEl = document.getElementById("board");
    if (!boardEl) return;

    boardEl.innerHTML = "";

    board.forEach((cell, i) => {

        const btn = document.createElement("button");

        btn.textContent = cell;
        btn.style.height = "100px";
        btn.style.fontSize = "2rem";
        btn.style.border = "2px solid #1ea857";
        btn.style.borderRadius = "12px";
        btn.style.background = "#f0f0f0";
        btn.style.cursor = "pointer";

        btn.onclick = () => playerMove(i);

        boardEl.appendChild(btn);
    });
}

// ---------------------- PLAYER ----------------------

function playerMove(index) {

    if (gameOver) return;
    if (board[index] !== "") return;

    board[index] = "X";
    renderBoard(); // ⭐ 즉시 반영

    if (checkWinner("X")) return endGame("PLAYER WIN");
    if (isDraw()) return endGame("DRAW");

    setTimeout(aiMove, 150); // ⭐ 렌더 후 AI
}

// ---------------------- AI ----------------------

function aiMove() {

    if (gameOver) return;

    let move;

    if (currentDifficulty === "easy") {
        move = randomMove();
    }

    if (currentDifficulty === "normal") {
        move = smartMove();
    }

    if (currentDifficulty === "hard") {
        move = minimaxBestMove();
    }

    if (move === undefined) return;

    board[move] = "O";

    renderBoard(); // ⭐ AI 수 보이게 먼저 렌더

    if (checkWinner("O")) return endGame("AI WIN");
    if (isDraw()) return endGame("DRAW");
}

// ---------------------- EASY ----------------------

function randomMove() {
    const empty = board
        .map((v, i) => v === "" ? i : null)
        .filter(v => v !== null);

    return empty[Math.floor(Math.random() * empty.length)];
}

// ---------------------- NORMAL ----------------------

function smartMove() {

    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = "O";
            if (checkWinner("O")) {
                board[i] = "";
                return i;
            }
            board[i] = "";
        }
    }

    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {
            board[i] = "X";
            if (checkWinner("X")) {
                board[i] = "";
                return i;
            }
            board[i] = "";
        }
    }

    return randomMove();
}

// ---------------------- HARD ----------------------

function minimaxBestMove() {

    let bestScore = -Infinity;
    let move = -1;

    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {

            board[i] = "O";
            let score = minimax(false);
            board[i] = "";

            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }

    return move;
}

function minimax(isMax) {

    if (checkWinner("O")) return 1;
    if (checkWinner("X")) return -1;
    if (isDraw()) return 0;

    if (isMax) {

        let best = -Infinity;

        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = "O";
                best = Math.max(best, minimax(false));
                board[i] = "";
            }
        }

        return best;

    } else {

        let best = Infinity;

        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = "X";
                best = Math.min(best, minimax(true));
                board[i] = "";
            }
        }

        return best;
    }
}

// ---------------------- CHECK ----------------------

function checkWinner(p) {

    const w = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    return w.some(line =>
        line.every(i => board[i] === p)
    );
}

function isDraw() {
    return board.every(v => v !== "");
}

// ---------------------- END FIXED ----------------------

function endGame(result) {

    gameOver = true;

    const resultEl = document.getElementById("result");

    resultEl.innerHTML = `
        <div style="
            text-align:center;
            margin-top:20px;
            font-size:1.4rem;
            font-weight:bold;
        ">
            ${result}
        </div>

        <div style="text-align:center;margin-top:10px;">
            <button id="restartBtn"
                style="
                    padding:10px 20px;
                    border:none;
                    border-radius:10px;
                    background:#1ea857;
                    color:white;
                    cursor:pointer;
                ">
                다시하기
            </button>
        </div>
    `;

    document.getElementById("restartBtn").onclick = () => {
        startGame(currentDifficulty);
    };
}
