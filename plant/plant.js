// ===== 기본 상태 =====
let totalClicks = 0;
let plantLevel = 1;

let user = {
  initial: "GUEST",
  clicks: 0,
  level: 1
};

// 식물 레벨 기준
const plantLevels = [
  0, 1000, 3000, 6000, 10000,
  20000, 40000, 80000, 160000,
  320000, 640000, 1280000,
  2560000, 5120000, 10240000
];

// 임시 랭킹
let ranking = [
  { initial: "JO Y.J.", clicks: 320, level: 3 },
  { initial: "LEE J.H.", clicks: 250, level: 3 },
  { initial: "SON S.H.", clicks: 180, level: 2 }
];

// DOM
const plantImg = document.getElementById("plantImg");
const plantLevelText = document.getElementById("plantLevel");
const plantProgress = document.getElementById("plantProgress");
const achievement = document.getElementById("achievement");
const rankList = document.getElementById("rankList");

// 클릭
document.getElementById("growBtn").onclick = () => {
  const add = Math.pow(2, user.level - 1);
  user.clicks += add;
  totalClicks += add;

  checkUserLevel();
  checkPlantLevel();
  updateUI();
  updateRank();
};

// 개인 레벨
function checkUserLevel() {
  const thresholds = [0,100,250,500,750];
  if (user.level < thresholds.length && user.clicks >= thresholds[user.level]) {
    user.level++;
  }
}

// 식물 레벨
function checkPlantLevel() {
  if (plantLevel < plantLevels.length &&
      totalClicks >= plantLevels[plantLevel]) {

    plantLevel++;
    plantImg.src = `../plant${Math.min(plantLevel,6)}.png`;
    plantImg.style.transform = "scale(1.1)";
    setTimeout(()=>plantImg.style.transform="scale(1)",300);

    achievement.innerHTML =
      `🌱 달성자<br>${user.initial}`;
  }
}

// UI 갱신
function updateUI() {
  plantLevelText.textContent = `Plant Lv.${plantLevel}`;

  const next = plantLevels[plantLevel] ?? plantLevels.at(-1);
  plantProgress.textContent = `(${totalClicks} / ${next})`;
}

// 랭킹
function updateRank() {
  const idx = ranking.findIndex(r=>r.initial===user.initial);
  if (idx === -1) ranking.push(user);
  else ranking[idx] = user;

  ranking.sort((a,b)=>b.clicks-a.clicks);

  rankList.innerHTML = "";
  ranking.slice(0,6).forEach(r=>{
    const li = document.createElement("li");
    li.textContent = `${r.initial} ${r.clicks} (${r.level})`;
    rankList.appendChild(li);
  });
}

updateUI();
updateRank();
