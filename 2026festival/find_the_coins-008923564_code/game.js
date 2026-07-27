const startScreen = document.getElementById('start-screen');
const mainScreen = document.getElementById('main-screen');
const playBtn = document.getElementById('play-btn');

playBtn.addEventListener('click', () => {
    startScreen.classList.remove('active');
    mainScreen.classList.add('active');
});
