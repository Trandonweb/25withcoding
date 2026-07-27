const playButton = document.getElementById("playButton");
const startScreen = document.getElementById("startScreen");
const gameScreen = document.getElementById("gameScreen");

playButton.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
});
