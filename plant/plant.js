// ===== 기본 데이터 =====
let totalClicks = 0;
let plantLevel = 1;

let user = {
  initial: "GUEST",
  clicks: 0,
  level: 1
};

// 식물 레벨 기준 (15레벨까지)
const plantLevels = [
  0, 500, 1000, 5000, 10000,
  20000, 40000, 80000, 160000,
  320000, 640000, 1280000,
  2560000, 5120000, 10240000
];

// 임시 순위 데이터 (나중에 서버/로그인으로 교체)
let ranking = [
  { initial: "JO Y.J.", clicks: 320, level: 3 },
  { initial: "LEE J.H.", clicks: 250, level: 3 },
  { initial: "SON S.H.", clicks: 180, level: 2 }
];

const plantImg = document.getElementById("plantImg");
const plantInfo = document.getElementById("plantInfo");
const achievement = document.getElementById("achievement");
const rankList = document.getElementById("rankList");

// ===== 클릭 처리 =====
document.getElementById("growBtn").onclick = () => {
  const add = Math.pow(2, user.level - 1);
  user.clicks += add;
  totalClicks += add;

  checkUserLevel();
  checkPlantLevel();
  updateRank();
};

// ===== 개인 레벨 =====
function checkUserLevel() {
  const thresholds = [0,100,250,500,750];
  if (user.level < thresholds.length && user.clicks >= thresholds[user.level]) {
    user.level++;
  }
}

// ===== 식물 레벨 =====
function checkPlantLevel() {
  if (plantLevel < plantLevels.length &&
      totalClicks >= plantLevels[plantLevel]) {

    plantLevel++;
    plantImg.src = `../plant${Math.min(plantLevel,6)}.png`;
    plantImg.style.transform = "scale(1.1)";
    setTimeout(() => {
      plantImg.style.transform = "scale(1)";
    }, 300);

    plantInfo.textContent = `🌳 Plant Lv.${plantLevel}`;
    achievement.innerHTML = `🌳 Plant Lv.${plantLevel}<br>달성 : ${user.initial}`;
  }
}

// ===== 순위 =====
function updateRank() {
  const meIndex = ranking.findIndex(r => r.initial === user.initial);
  if (meIndex === -1) ranking.push(user);
  else ranking[meIndex] = user;

  ranking.sort((a,b)=>b.clicks-a.clicks);

  rankList.innerHTML = "";
  ranking.slice(0,6).forEach((r,i)=>{
    const li = document.createElement("li");
    li.textContent = `${r.initial} ${r.clicks} (${r.level})`;
    rankList.appendChild(li);
  });
}

updateRank();

