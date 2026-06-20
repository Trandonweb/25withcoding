// js/games/tictactoe.js

export function openTicTacToe(gameArea) {

    gameArea.innerHTML = `
        <div class="ttt-container">

            <h2 class="ttt-title">
                틱택토
            </h2>

            <p class="ttt-desc">
                AI 난이도를 선택하세요.
            </p>

            <div class="ttt-difficulty-list">

                <button
                    class="ttt-difficulty-btn"
                    data-difficulty="easy">
                    쉬움
                </button>

                <button
                    class="ttt-difficulty-btn"
                    data-difficulty="normal">
                    보통
                </button>

                <button
                    class="ttt-difficulty-btn"
                    data-difficulty="hard">
                    어려움
                </button>

            </div>

        </div>
    `;

    document
        .querySelectorAll(
            ".ttt-difficulty-btn"
        )
        .forEach(btn => {

            btn.addEventListener(
                "click",
                () => {

                    const difficulty =
                        btn.dataset.difficulty;

                    startGame(
                        gameArea,
                        difficulty
                    );

                }
            );

        });

}

function startGame(
    gameArea,
    difficulty
) {

    let difficultyText =
        "쉬움";

    if (
        difficulty ===
        "normal"
    ) {
        difficultyText =
            "보통";
    }

    if (
        difficulty ===
        "hard"
    ) {
        difficultyText =
            "어려움";
    }

    gameArea.innerHTML = `
        <div class="ttt-container">

            <h2 class="ttt-title">
                틱택토
            </h2>

            <p>
                선택한 난이도 :
                <b>${difficultyText}</b>
            </p>

            <br>

            <p>
                다음 단계 :
                게임판 생성
            </p>

        </div>
    `;

}
