/* 음악 */
const music = document.getElementById("bgMusic");
const musicBtn = document.getElementById("musicBtn");

musicBtn.onclick = () => {
music.muted = !music.muted;
musicBtn.style.backgroundImage =
music.muted ? "url('sound2.png')" : "url('sound1.png')";
};

/* 메뉴 */
const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");
const content = document.querySelector(".content");
const carousel = document.querySelector(".carousel-container");
const gameSection = document.getElementById("gameSection");

menuBtn.onclick = () => sideMenu.classList.toggle("open");

function showHome() {
content.style.display = "";
carousel.style.display = "";
gameSection.style.display = "none";
sideMenu.classList.remove("open");
}

function showGame() {
content.style.display = "none";
carousel.style.display = "none";
gameSection.style.display = "block";
sideMenu.classList.remove("open");
}

/* 캐러셀 */
const thumbs = [
{img:'Thumbnail1.png', title:'CODE : STORGE', author:'JO Y.J.', link:'https://naver.me/5M5Ke6YT'},
{img:'Thumbnail2.png', title:'HIGH SCORE', author:'LEE J.H.', link:'https://naver.me/FPU7WpYv'},
{img:'Thumbnail3.png', title:'억까 게임', author:'SON S.H.', link:'https://naver.me/GdlLfME3'},
{img:'Thumbnail4.png', title:'SPEED GAME', author:'JANG H.J.', link:'https://naver.me/x4Gpy1ly'},
{img:'Thumbnail5.png', title:'몬스터 디펜스', author:'LEE S.Y.', link:'https://naver.me/GT6ZUHNa'},
{img:'Thumbnail6.png', title:'쓱삭김치가 되어보기', author:'LIM J.W.', link:'https://naver.me/xhl9LE6l'}
];

let idx = Math.floor(Math.random() * thumbs.length);
const L = document.getElementById("left");
const C = document.getElementById("center");
const R = document.getElementById("right");

function updateCarousel() {
[L, C, R].forEach((el, i) => {
const t = thumbs[(idx + i + 1) % thumbs.length];
el.style.background = `url(${t.img}) center/cover`;
el.querySelector(".thumb-info").textContent = `${t.title} - ${t.author}`;
el.onclick = () => window.open(t.link);
});
}

updateCarousel();
setInterval(() => { idx++; updateCarousel(); }, 2000);
