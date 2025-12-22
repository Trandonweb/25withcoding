let totalClicks = 0;
let treeLevel = 1;
let user = null;

const treeThresholds = [
  500, 1000, 5000, 10000,
  20000, 40000, 80000, 160000,
  320000, 640000, 1280000,
  2560000, 5120000, 10240000, 20480000
];

const users = {};

const bgm = document.getElementById("bgm");
const soundBtn = document.getElementById("soundBtn");

soundBtn.onclick = () => {
  if (bgm.muted) {
    bgm.muted = false;
    soundBtn.src = "sound1.png";
  } else {
    bgm.muted = true;
    soundBtn.src = "sound2.png";
  }
};

/* 메뉴 */
menuBtn.onclick = () => {
  sidebar.classList.toggle("open");
};

/* 페이지 */
function showHome() {
  home.classList.add("active");
  game.classList.remove("active");
}

function showGame() {
  home.classList.remove("active");
  game.classList.add("active");
}

/* 로그인 */
function renderLogin() {
  const area = document.getElementById("loginArea");
  if (!user) {
    area.innerHTML = `
      <input id="init" placeholder="이니셜">
      <button onclick="login()">로그인</button>
    `;
  } else {
    area.innerHTML = `
      <p>👤 ${user}</p>
      <button onclick="logout()">로그아웃</button>
    `;
  }
}

function login() {
  const v = document.getElementById("init").value;
  if (!v) return;
  user = v.toUpperCase();
  if (!users[user]) users[user] = { clicks: 0, level: 1 };
  renderLogin();
}

function logout() {
  user = null;
  renderLogin();
}

/* 클릭 */
clickBtn.onclick = () => {
  if (!user) {
    alert("로그인 먼저!");
    return;
  }

  const u = users[user];
  const add = Math.pow(2, u.level - 1);

  totalClicks += add;
  u.clicks += add;

  if (u.clicks >= [100,250,500,750][u.level-1] || u.clicks >= Math.pow(2, u.level-1)*100) {
    u.level++;
  }

  updateTree();
  render();
};

/* 나무 */
function updateTree() {
  if (treeLevel < 15 && totalClicks >= treeThresholds[treeLevel - 1]) {
    treeLevel++;
    document.getElementById("treeImg").src = `plant${Math.min(6, treeLevel)}.png`;
    document.getElementById("treeInfo").innerText =
      `🌳 Tree Lv.${treeLevel} 달성 : ${user}`;
  }
}

/* 랭킹 */
function render() {
  totalClicksSpan.innerText = totalClicks;

  const rank = Object.entries(users)
    .sort((a,b)=>b[1].clicks-a[1].clicks)
    .slice(0,6);

  ranking.innerHTML = "<h3>순위</h3>";
  rank.forEach((r,i)=>{
    ranking.innerHTML += `
      (${i+1}) ${r[0]} [${r[1].clicks}] (Lv.${r[1].level})<br>
    `;
  });
}

renderLogin();
render();

