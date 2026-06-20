// js/games/tictactoe.js

let board = [];
let currentDifficulty = "";
let gameOver = false;

export function openTicTacToe(gameArea) {

    gameArea.innerHTML = `
        <div class="ttt-container">

            <h2 class="ttt-title">틱택토</h2>

            <p class="ttt-desc">
                AI 난이도를 선택하세요
            </p>

            <div class="ttt-difficulty-list">

                <button class="ttt-difficulty-btn" data-difficulty="easy">쉬움</button>
                <button class="ttt-difficulty-btn" data-difficulty="normal">보통</button>
                <button class="ttt-difficulty-btn" data-difficulty="hard">어려움</button>

            </div>

        </div>
    `;

    document.querySelectorAll(".ttt-difficulty-btn")
        .forEach(btn => {
            btn.onclick = () => {
                startGame(gameArea, btn.dataset.difficulty);
            };
        });
}


// ---------------------- GAME START ----------------------

function startGame(gameArea, difficulty) {

    currentDifficulty = difficulty;
    board = Array(9).fill("");
    gameOver = false;

    const text =
        difficulty === "easy" ? "쉬움"
        : difficulty === "normal" ? "보통"
        : "어려움";

    gameArea.innerHTML = `
        <div class="ttt-container">

            <h2 class="ttt-title">틱택토</h2>

            <p>난이도: <b>${text}</b></p>

            <br>

            <div id="board"
                style="
                    display:grid;
                    grid-template-columns:repeat(3,1fr);
                    gap:10px;
                    max-width:320px;
                    margin:auto;
                ">
            </div>

        </div>
    `;

    renderBoard();
}


// ---------------------- BOARD ----------------------

function renderBoard() {

    const boardEl = document.getElementById("board");
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

    if (checkWinner("X")) {
        endGame("PLAYER WIN");
        return;
    }

    if (isDraw()) {
        endGame("DRAW");
        return;
    }

    aiMove();
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

    board[move] = "O";

    if (checkWinner("O")) {
        endGame("AI WIN");
        return;
    }

    if (isDraw()) {
        endGame("DRAW");
        return;
    }

    renderBoard();
}


// 쉬움
function randomMove() {
    const empty = board
        .map((v, i) => v === "" ? i : null)
        .filter(v => v !== null);

    return empty[Math.floor(Math.random() * empty.length)];
}


// 보통 (막기 + 이기기)
function smartMove() {

    // 1. AI 이길 수 있으면 이김
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

    // 2. 플레이어 막기
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


// 어려움 (미니맥스)
function minimaxBestMove() {

    let bestScore = -Infinity;
    let move;

    for (let i = 0; i < 9; i++) {
        if (board[i] === "") {

            board[i] = "O";
            let score = minimax(board, false);
            board[i] = "";

            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }

    return move;
}


// minimax
function minimax(newBoard, isMax) {

    if (checkWinner("O")) return 1;
    if (checkWinner("X")) return -1;
    if (isDraw()) return 0;

    if (isMax) {

        let best = -Infinity;

        for (let i = 0; i < 9; i++) {
            if (newBoard[i] === "") {
                newBoard[i] = "O";
                best = Math.max(best, minimax(newBoard, false));
                newBoard[i] = "";
            }
        }

        return best;

    } else {

        let best = Infinity;

        for (let i = 0; i < 9; i++) {
            if (newBoard[i] === "") {
                newBoard[i] = "X";
                best = Math.min(best, minimax(newBoard, true));
                newBoard[i] = "";
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


// ---------------------- END ----------------------

function endGame(result) {

    gameOver = true;

    gameArea.innerHTML += `

        <div style="
            text-align:center;
            margin-top:20px;
            font-size:1.3rem;
            font-weight:bold;
        ">
            ${result}
        </div>

        <button
            onclick="location.reload()"
            style="
                margin-top:15px;
                padding:10px 20px;
                border:none;
                border-radius:10px;
                background:#1ea857;
                color:white;
                cursor:pointer;
            ">
            다시하기
        </button>

    `;
}
