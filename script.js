/* 햄버거 메뉴 */
const menuBtn = document.getElementById("menuBtn");
const sideMenu = document.getElementById("sideMenu");

menuBtn.onclick = () => {
  sideMenu.classList.toggle("open");
};

/* 로그인 / 로그아웃 상태 */
const authLink = document.getElementById("authLink");

function updateAuth() {
  const user = sessionStorage.getItem("user");
  if (user) {
    authLink.textContent = "로그아웃";
    authLink.href = "/signout/";
  } else {
    authLink.textContent = "로그인";
    authLink.href = "/signin/";
  }
}

updateAuth();

/* 음악 */
function toggleMusic() {
  const music = document.getElementById("bgMusic");
  const btn = document.getElementById("musicBtn");
  music.muted = !music.muted;
  btn.style.backgroundImage = music.muted
    ? "url('sound2.png')"
    : "url('sound1.png')";
}

document.getElementById("musicBtn").onclick = toggleMusic;

/* 캐러셀 */
const thumbs = [
  {img:'Thumbnail1.png', title:'CODE : STORGE', author:'JO Y.J.', link:'#'},
  {img:'Thumbnail2.png', title:'HIGH SCORE', author:'LEE J.H.', link:'#'},
  {img:'Thumbnail3.png', title:'억까 게임', author:'SON S.H.', link:'#'},
  {img:'Thumbnail4.png', title:'SPEED GAME', author:'JANG H.J.', link:'#'},
  {img:'Thumbnail5.png', title:'몬스터 디펜스', author:'LEE S.Y.', link:'#'},
  {img:'Thumbnail6.png', title:'쓱삭김치가 되어보기', author:'LIM J.W.', link:'#'}
];

let i = 0;
const left = document.getElementById("left");
const center = document.getElementById("center");
const right = document.getElementById("right");

function update() {
  const len = thumbs.length;
  const l = thumbs[(i+2)%len];
  const c = thumbs[(i+1)%len];
  const r = thumbs[i%len];

  left.style.backgroundImage = `url(${l.img})`;
  center.style.backgroundImage = `url(${c.img})`;
  right.style.backgroundImage = `url(${r.img})`;

  left.querySelector(".thumb-info").textContent = `${l.title} - ${l.author}`;
  center.querySelector(".thumb-info").textContent = `${c.title} - ${c.author}`;
  right.querySelector(".thumb-info").textContent = `${r.title} - ${r.author}`;
}

update();
setInterval(() => { i++; update(); }, 2000);
