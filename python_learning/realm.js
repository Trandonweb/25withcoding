const $ = (id) => document.getElementById(id);
const canvas = $("realmCanvas");
const ctx = canvas.getContext("2d");
const studentLabel = $("studentLabel");
async function waitForStudent() {
  if (studentLabel && studentLabel.textContent !== "로그인 확인 중") return;
  await new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (studentLabel && studentLabel.textContent !== "로그인 확인 중") {
        observer.disconnect();
        resolve();
      }
    });
    if (studentLabel) observer.observe(studentLabel, { childList: true, characterData: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve(); }, 12000);
  });
}
await waitForStudent();
const studentId = (studentLabel?.textContent || "guest").replace(/\s학생$/, "");
const SAVE_KEY = "pythonRealmV2:" + studentId;
const defaults = {
  gold: 0, xp: 0, hp: 100, maxHp: 100, attack: 28, defense: 0, goldBonus: 0, xpBonus: 0,
  wins: 0, fails: 0, items: [], adaptive: { choice: 1, fix: 1, coding: 1 },
  stats: { quests: 0, grade1: 0, grade2: 0, grade3: 0, grade4: 0 }
};
const curriculum = [
  { id:"variables", label:"변수", sub:"값 저장", keys:["변수","대입"] },
  { id:"print", label:"print()", sub:"출력", keys:["출력","print","문장"] },
  { id:"input", label:"input()", sub:"입력", keys:["input","입력","f-string","이름표"] },
  { id:"types", label:"자료형", sub:"형 변환", keys:["자료형","정수","실수","int","float","type"] },
  { id:"operators", label:"연산자", sub:"계산", keys:["연산","사칙","나머지","합계"] },
  { id:"if", label:"if", sub:"조건문", keys:["조건","if","짝수","홀수","학점"] },
  { id:"while", label:"while", sub:"반복 ①", keys:["while","반복","break","카운트다운"] },
  { id:"random", label:"random", sub:"난수", keys:["random","랜덤","가위","숫자 맞히기"] },
  { id:"for", label:"for/range", sub:"반복 ②", keys:["for","range","중첩 반복"] },
  { id:"list", label:"리스트", sub:"목록", keys:["리스트","인덱스","list","배열"] },
  { id:"builtins", label:"내장 함수·모듈", sub:"len · split", keys:["함수","모듈","len","split","sum","max","min","datetime","math","time"] },
  { id:"custom", label:"사용자 함수", sub:"def · return", keys:["사용자","def","return","계산기"] }
];
let curriculumDone = [];
function curriculumIndex(challenge) {
  const source = [challenge.title, challenge.prompt, challenge.starter].join(" ").toLowerCase();
  for (let i = 0; i < curriculum.length; i++) {
    if (curriculum[i].keys.some((key) => source.includes(key.toLowerCase()))) return i;
  }
  return 0;
}
function renderCurriculum(activeIndex) {
  const root = $("rCurriculumTrack");
  if (!root) return;
  root.innerHTML = curriculum.map((topic, index) => {
    const done = curriculumDone.includes(topic.id);
    const active = index === activeIndex;
    return '<div class="r-curriculum-node ' + (done ? "done " : "") + (active ? "current" : "") + '"><b>' + escapeHTML(topic.label) + '</b><small>' + escapeHTML(topic.sub) + '</small></div>';
  }).join("");
  $("rCurriculumProgress").textContent = curriculumDone.length + " / " + curriculum.length + " 개념";
  const active = root.children[activeIndex];
  if (active) active.scrollIntoView({ block:"nearest", inline:"center", behavior:"smooth" });
}
let save = { ...defaults };
try {
  const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
  save = { ...defaults, ...raw, adaptive: { ...defaults.adaptive, ...(raw.adaptive || {}) }, stats: { ...defaults.stats, ...(raw.stats || {}) } };
  curriculumDone = Array.isArray(raw.curriculumDone) ? raw.curriculumDone : [];
} catch {}
const modes = [
  { id: "rift", name: "균열 토벌", icon: "⚔", desc: "균열에서 몰려오는 적을 정리한다.", goal: "적 4마리 격퇴", color: "#ff8c68" },
  { id: "explore", name: "유적 탐사", icon: "🧭", desc: "고대 유적에 흩어진 룬을 회수한다.", goal: "룬 4개 회수", color: "#65d8f2" },
  { id: "forge", name: "대장간 의뢰", icon: "⚒", desc: "광맥에서 재료를 모아 보급품을 확보한다.", goal: "광석 5개 채집", color: "#f2c36b" },
  { id: "boss", name: "균열 보스전", icon: "♜", desc: "강력한 수문장을 쓰러뜨리고 전리품을 노린다.", goal: "수문장 격파", color: "#c18bff" }
];
let selectedMode = "rift";
let gameState = "select";
let player = { x: 500, y: 370, hp: 100, attack: 28, defense: 0, face: 1, attackCd: 0, dashCd: 0, inv: 0, anim: 0 };
let enemies = [];
let pickups = [];
let particles = [];
let questProgress = 0;
let questTarget = 4;
let lastTime = 0;
let keys = {};
let attackPulse = 0;
let pyodidePromise = null;
let currentChallenge = null;
let candidates = [];
let selectedCandidate = null;
let attemptLeft = 3;
let hintsUsed = 0;
let hintLimit = 0;
let lootRound = 0;
let challengeBusy = false;
let challengeLocked = false;
let toastTimer = null;

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  renderHUD();
}
function renderHUD() {
  $("rGold").textContent = save.gold.toLocaleString() + " G";
  $("rXp").textContent = save.xp.toLocaleString() + " XP";
  $("rWins").textContent = save.stats.quests + "회";
  $("rRank").textContent = save.stats.grade1 + "회";
  $("rAtk").textContent = String(save.attack);
  $("rDef").textContent = String(save.defense);
  $("rGoldBonus").textContent = "+" + save.goldBonus + "%";
  $("rXpBonus").textContent = "+" + save.xpBonus + "%";
  $("rRecord").textContent = "성공 " + save.wins + " · 실패 " + save.fails;
  $("rBag").innerHTML = save.items.length ? save.items.slice(-5).reverse().map((it) =>
    '<div class="r-bag-item"><span class="r-item-icon">' + it.icon + '</span><span><b>' + escapeHTML(it.name) + '</b><small>' + escapeHTML(it.effect) + '</small></span></div>'
  ).join("") : '<div class="r-empty">아직 획득한 전리품이 없어.</div>';
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(message) {
  const el = $("rToast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function renderModes() {
  $("rModes").innerHTML = modes.map((m) =>
    '<button class="r-mode ' + (selectedMode === m.id ? "active" : "") + '" data-mode="' + m.id + '" style="--mode:' + m.color + '">' +
    '<span class="r-mode-icon">' + m.icon + '</span><span class="r-mode-copy"><b>' + m.name + '</b><small>' + m.desc + '</small></span><span class="r-mode-go">›</span></button>'
  ).join("");
  document.querySelectorAll(".r-mode").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMode = button.dataset.mode;
      renderModes();
      $("rQuestGoal").textContent = modes.find((m) => m.id === selectedMode).goal;
    });
  });
  $("rQuestGoal").textContent = modes.find((m) => m.id === selectedMode).goal;
}
function startQuest() {
  if (gameState === "battle") return;
  gameState = "battle";
  questProgress = 0;
  player = { x: 500, y: 380, hp: Math.min(save.maxHp, Math.max(65, save.hp)), maxHp: save.maxHp, attack: save.attack, defense: save.defense, face: 1, attackCd: 0, dashCd: 0, inv: 0, anim: 0 };
  enemies = [];
  pickups = [];
  particles = [];
  const count = selectedMode === "rift" ? 4 : selectedMode === "boss" ? 1 : 2;
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: 180 + i * (selectedMode === "boss" ? 0 : 205),
      y: 150 + (i % 2) * 70,
      hp: selectedMode === "boss" ? 440 : 65 + (i % 2) * 18,
      maxHp: selectedMode === "boss" ? 440 : 65 + (i % 2) * 18,
      boss: selectedMode === "boss", flash: 0,
      cd: 0.7 + i * 0.25,
      phase: Math.random() * 6.28,
      dead: false
    });
  }
  if (selectedMode === "explore" || selectedMode === "forge") {
    const total = selectedMode === "explore" ? 4 : 5;
    questTarget = total;
    for (let i = 0; i < total; i++) pickups.push({
      x: 130 + (i % 3) * 330 + Math.random() * 45,
      y: 130 + Math.floor(i / 3) * 220 + Math.random() * 30,
      kind: selectedMode === "explore" ? "rune" : "ore",
      taken: false,
      phase: Math.random() * 6
    });
    if (selectedMode === "explore") enemies = [];
  } else {
    questTarget = count;
  }
  $("rSelectPanel").classList.add("hidden");
  $("rStartScreen").classList.add("hidden");
  $("rArenaPanel").classList.remove("hidden");
  requestAnimationFrame(setCanvasSize);
  $("rArenaTitle").textContent = modes.find((m) => m.id === selectedMode).name;
  $("rArenaGoal").textContent = modes.find((m) => m.id === selectedMode).goal;
  $("rArenaHint").textContent = selectedMode === "explore" || selectedMode === "forge"
    ? "WASD / 방향키로 이동해 빛나는 목표물을 접촉해."
    : "WASD 이동 · J 공격 · K 대시. 적의 공격 범위에서 벗어나며 반격해.";
  $("rArenaResult").textContent = "의뢰 진행 중";
  toast("의뢰 시작! 목표를 달성해 전리품을 확보해.");
  renderHUD();
}
function endQuest() {
  if (gameState !== "battle") return;
  gameState = "loot";
  save.hp = Math.max(1, Math.min(save.maxHp, player.hp));
  save.stats.quests += 1;
  persist();
  $("rArenaResult").textContent = "의뢰 완료 · 전리품을 선택해.";
  openLoot();
}
function hitEnemy(enemy) {
  if (enemy.dead) return;
  enemy.hp -= player.attack;
  enemy.flash = 0.16;
  const dx = enemy.x - player.x;
  enemy.x += Math.sign(dx || 1) * 24;
  burst(enemy.x, enemy.y, enemy.boss ? "#d6a4ff" : "#ff9b7c", 12);
  if (enemy.hp <= 0) {
    enemy.dead = true;
    questProgress++;
    burst(enemy.x, enemy.y, enemy.boss ? "#d6a4ff" : "#ffd66b", 28);
    toast(enemy.boss ? "수문장을 격파했다!" : "적 격퇴! " + questProgress + " / " + questTarget);
    if (enemies.every((e) => e.dead)) endQuest();
  }
}
function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 35 + Math.random() * 180;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .35 + Math.random() * .55, max: .9, color, size: 2 + Math.random() * 4 });
  }
}
function attack() {
  if (gameState !== "battle" || player.attackCd > 0) return;
  player.attackCd = .34;
  attackPulse = .18;
  const reach = 105;
  enemies.forEach((enemy) => {
    if (enemy.dead) return;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    if (Math.hypot(dx, dy) < reach + (enemy.boss ? 28 : 0)) hitEnemy(enemy);
  });
  if (selectedMode === "forge") {
    pickups.forEach((p) => {
      if (!p.taken && p.kind === "ore" && Math.hypot(p.x - player.x, p.y - player.y) < 110) {
        p.taken = true;
        questProgress++;
        burst(p.x, p.y, "#f2c36b", 18);
        $("rArenaResult").textContent = "광석 " + questProgress + " / " + questTarget;
        if (questProgress >= questTarget) endQuest();
      }
    });
  }
}
function update(dt) {
  if (gameState !== "battle") return;
  player.anim += dt * 8;
  player.attackCd = Math.max(0, player.attackCd - dt);
  player.dashCd = Math.max(0, player.dashCd - dt);
  player.inv = Math.max(0, player.inv - dt);
  attackPulse = Math.max(0, attackPulse - dt);
  let mx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0);
  let my = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
  if (mx || my) {
    const len = Math.hypot(mx, my);
    mx /= len; my /= len;
    player.x += mx * 245 * dt;
    player.y += my * 190 * dt;
    if (mx) player.face = Math.sign(mx);
  }
  player.x = Math.max(58, Math.min(942, player.x));
  player.y = Math.max(95, Math.min(478, player.y));
  enemies.forEach((enemy) => {
    if (enemy.dead) return;
    enemy.phase += dt * 2;
    enemy.cd -= dt;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy);
    if (distance > (enemy.boss ? 112 : 74)) {
      enemy.x += dx / Math.max(1, distance) * (enemy.boss ? 55 : 78) * dt;
      enemy.y += dy / Math.max(1, distance) * (enemy.boss ? 43 : 62) * dt;
    } else if (enemy.cd <= 0 && player.inv <= 0) {
      enemy.cd = enemy.boss ? 1.15 : 1.45;
      player.hp = Math.max(0, player.hp - Math.max(4, 9 - player.defense));
      player.inv = .45;
      $("rArenaResult").textContent = "적의 공격을 받았어 · HP " + player.hp;
      burst(player.x, player.y, "#ff7288", 8);
      if (player.hp <= 0) {
        player.hp = 60;
        enemies.forEach((e) => { if (!e.dead) e.x += e.x < player.x ? -65 : 65; });
        toast("잠시 후 다시 일어났어. 위치를 바꿔 공략해!");
      }
    }
  });
  pickups.forEach((p) => {
    if (p.taken) return;
    p.phase += dt * 2.5;
    if (selectedMode !== "forge" && Math.hypot(p.x - player.x, p.y - player.y) < 34) {
      p.taken = true;
      questProgress++;
      burst(p.x, p.y, "#65d8f2", 18);
      $("rArenaResult").textContent = "회수 " + questProgress + " / " + questTarget;
      if (questProgress >= questTarget) endQuest();
    }
  });
  particles.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; p.life -= dt; });
  particles = particles.filter((p) => p.life > 0);
}
function drawArena() {
  const w = canvas.width, h = canvas.height;
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#172a35"); bg.addColorStop(.56, "#1a2730"); bg.addColorStop(1, "#111a20");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = .18;
  for (let i = 0; i < 14; i++) {
    const y = 60 + i * 34;
    ctx.strokeStyle = i % 2 ? "#8db4bd" : "#5e8491";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let i = -5; i < 18; i++) {
    ctx.beginPath(); ctx.moveTo(w / 2 + i * 72, 45); ctx.lineTo(w / 2 + i * 135, h); ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 24; i++) {
    const x = (i * 173 + 37) % w, y = (i * 97 + 25) % h;
    ctx.fillStyle = i % 3 ? "#8bd8df22" : "#f6d18c22";
    ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2); ctx.fill();
  }
  // distant monoliths
  for (let i = 0; i < 5; i++) {
    const x = 75 + i * 205;
    ctx.fillStyle = "#0c151c";
    ctx.beginPath(); ctx.moveTo(x - 20, 105); ctx.lineTo(x - 9, 35); ctx.lineTo(x + 15, 45); ctx.lineTo(x + 25, 105); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#5c8791"; ctx.globalAlpha = .35; ctx.stroke(); ctx.globalAlpha = 1;
  }
  pickups.forEach((p) => {
    if (p.taken) return;
    const bob = Math.sin(p.phase) * 7;
    ctx.save(); ctx.translate(p.x, p.y + bob);
    ctx.shadowColor = p.kind === "ore" ? "#f2c36b" : "#65d8f2"; ctx.shadowBlur = 24;
    ctx.fillStyle = p.kind === "ore" ? "#e7b65d" : "#6ee4ff";
    ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(13, 0); ctx.lineTo(0, 19); ctx.lineTo(-13, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.globalAlpha = .8; ctx.beginPath(); ctx.arc(-3, -5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  });
  enemies.slice().sort((a, b) => a.y - b.y).forEach((e) => {
    if (e.dead) return;
    const bob = Math.sin(e.phase) * 4;
    ctx.save(); ctx.translate(e.x, e.y + bob);
    ctx.fillStyle = "#0008"; ctx.beginPath(); ctx.ellipse(0, 21, e.boss ? 48 : 28, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = e.boss ? "#c18bff" : "#ff806d"; ctx.shadowBlur = e.boss ? 25 : 14;
    ctx.fillStyle = e.boss ? "#593d82" : "#8d4351";
    ctx.beginPath();
    if (e.boss) { ctx.moveTo(-36, 10); ctx.lineTo(-30, -32); ctx.lineTo(-12, -49); ctx.lineTo(0, -37); ctx.lineTo(15, -52); ctx.lineTo(34, -25); ctx.lineTo(39, 12); ctx.closePath(); }
    else { ctx.arc(0, -2, 25, 0, Math.PI * 2); }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffdfad";
    ctx.fillRect(-11, -12, 6, 5); ctx.fillRect(6, -12, 6, 5);
    ctx.fillStyle = "#17131d"; ctx.fillRect(-e.boss ? 0 : 0, 0, 1, 1);
    ctx.fillStyle = "#111820"; ctx.fillRect(-31, -65, 62, 6);
    ctx.fillStyle = e.boss ? "#c18bff" : "#ff7b78"; ctx.fillRect(-31, -65, 62 * Math.max(0, e.hp / e.maxHp), 6);
    if (e.flash > 0) { ctx.globalAlpha = Math.min(1, e.flash * 5); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, -5, e.boss ? 43 : 27, 0, Math.PI * 2); ctx.fill(); e.flash -= .04; }
    ctx.restore();
  });
  // player
  ctx.save(); ctx.translate(player.x, player.y + Math.sin(player.anim) * 2);
  ctx.fillStyle = "#0009"; ctx.beginPath(); ctx.ellipse(0, 23, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.shadowColor = "#63d9ed"; ctx.shadowBlur = 18;
  ctx.fillStyle = player.inv > 0 && Math.floor(player.inv * 18) % 2 ? "#ffffff" : "#4d8f9d";
  ctx.beginPath(); ctx.moveTo(-18, 10); ctx.lineTo(-14, -20); ctx.lineTo(0, -34); ctx.lineTo(15, -20); ctx.lineTo(19, 10); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "#d9c8a5"; ctx.beginPath(); ctx.arc(0, -39, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#273642"; ctx.fillRect(-10, -44, 20, 7);
  ctx.fillStyle = "#f6d18c"; ctx.fillRect(player.face > 0 ? 4 : -10, -40, 6, 3);
  ctx.strokeStyle = "#8deaff"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(player.face * 12, -5); ctx.lineTo(player.face * 27, -15); ctx.stroke();
  ctx.fillStyle = "#69dce9"; ctx.shadowColor = "#69dce9"; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(player.face * 34, -19, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  if (attackPulse > 0) {
    ctx.globalAlpha = attackPulse / .18; ctx.strokeStyle = "#8deaff"; ctx.lineWidth = 8; ctx.shadowColor = "#65d8f2"; ctx.shadowBlur = 22;
    ctx.beginPath(); ctx.arc(player.face * 34, -19, 42, player.face > 0 ? -.95 : Math.PI - .95, player.face > 0 ? .95 : Math.PI + .95); ctx.stroke();
  }
  ctx.restore();
  particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); });
  ctx.globalAlpha = 1;
  // HUD overlay
  ctx.fillStyle = "#071018bb"; ctx.fillRect(18, 16, 250, 48);
  ctx.fillStyle = "#e8f5fa"; ctx.font = "800 13px system-ui"; ctx.fillText("VITALITY", 31, 36);
  ctx.fillStyle = "#263a43"; ctx.fillRect(31, 43, 220, 9);
  ctx.fillStyle = "#69d7d5"; ctx.fillRect(31, 43, 220 * Math.max(0, player.hp / (player.maxHp || 100)), 9);
  ctx.fillStyle = "#e8f5fa"; ctx.font = "700 11px system-ui"; ctx.fillText(Math.ceil(player.hp) + " / " + (player.maxHp || 100), 192, 36);
  ctx.fillStyle = "#eaf2f4"; ctx.font = "800 12px system-ui"; ctx.fillText(gameState === "battle" ? "OBJECTIVE  " + questProgress + " / " + questTarget : "CODE REALM", w - 205, 35);
}
function loop(time) {
  const dt = Math.min(.035, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  drawArena();
  requestAnimationFrame(loop);
}
function setCanvasSize() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.setTransform(canvas.width / 1000, 0, 0, canvas.height / 540, 0, 0);
}
function burstPlaceholder() {}
window.addEventListener("resize", setCanvasSize);
window.addEventListener("keydown", (event) => {
  const target = event.target;
  const editing = target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === "TEXTAREA" || target.tagName === "INPUT");
  if (editing) {
    if (target.id === "rCodeEditor" && event.key === "Tab") {
      event.preventDefault();
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const value = target.value;
      if (event.shiftKey) {
        const lineStart = value.lastIndexOf("\\n", Math.max(0, start - 1)) + 1;
        const before = value.slice(lineStart, start);
        if (before.startsWith("    ")) {
          target.setRangeText("", lineStart, lineStart + 4, "end");
        } else if (before.startsWith("\\t")) {
          target.setRangeText("", lineStart, lineStart + 1, "end");
        }
      } else {
        target.setRangeText("    ", start, end, "end");
      }
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
  keys[event.key] = true;
  const k = event.key.toLowerCase();
  if (k === "j" || k === " ") attack();
  if (k === "k" && gameState === "battle" && player.dashCd <= 0) {
    player.dashCd = 1.1; player.inv = .25;
    const dx = (keys.ArrowRight || keys.d ? 1 : 0) - (keys.ArrowLeft || keys.a ? 1 : 0) || player.face;
    const dy = (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0);
    player.x = Math.max(58, Math.min(942, player.x + dx * 95));
    player.y = Math.max(95, Math.min(478, player.y + dy * 75));
    burst(player.x, player.y, "#65d8f2", 12);
  }
});
window.addEventListener("keyup", (event) => { keys[event.key] = false; });
canvas.addEventListener("pointerdown", () => attack());
$("rOpenQuests").addEventListener("click", () => $("rSelectPanel").classList.remove("hidden"));
$("rHomeButton").addEventListener("click", () => {
  if (gameState === "battle" && !confirm("진행 중인 의뢰를 포기하고 게임 홈으로 돌아갈까?")) return;
  gameState = "select";
  $("rArenaPanel").classList.add("hidden");
  $("rSelectPanel").classList.add("hidden");
  ["rLootModal","rChallengeModal","rSuccessModal","rFailModal"].forEach((id) => $(id).classList.add("hidden"));
  $("rProfileScrim").classList.add("hidden");
  $("rStartScreen").classList.remove("hidden");
});
$("rProfileToggle").addEventListener("click", () => $("rProfileScrim").classList.remove("hidden"));
$("rProfileClose").addEventListener("click", () => $("rProfileScrim").classList.add("hidden"));
$("rProfileScrim").addEventListener("click", (event) => { if (event.target.id === "rProfileScrim") $("rProfileScrim").classList.add("hidden"); });
$("rStartQuest").addEventListener("click", startQuest);
$("rBackSelect").addEventListener("click", () => {
  if (gameState === "battle" && !confirm("진행 중인 의뢰를 포기할까?")) return;
  gameState = "select"; $("rArenaPanel").classList.add("hidden"); $("rSelectPanel").classList.remove("hidden");
});
function gradeName(grade) { return ["", "MYTHIC", "EPIC", "RARE", "COMMON"][grade]; }
function gradeColor(grade) { return ["", "#f3c76c", "#c69aff", "#6bcdf0", "#9aaab3"][grade]; }
const rewards = {
  1: [
    { name: "시공의 코어", icon: "✦", effect: "공격력 +24", stat: "attack", value: 24 },
    { name: "별빛 수호각", icon: "⬡", effect: "방어력 +18", stat: "defense", value: 18 },
    { name: "초월 연산석", icon: "◈", effect: "퀘스트 경험치 +35%", stat: "xp", value: 35 }
  ],
  2: [
    { name: "균열 증폭기", icon: "✧", effect: "공격력 +15", stat: "attack", value: 15 },
    { name: "수호자의 문장", icon: "⬢", effect: "방어력 +11", stat: "defense", value: 11 },
    { name: "황금 연산판", icon: "▣", effect: "퀘스트 골드 +25%", stat: "gold", value: 25 }
  ],
  3: [
    { name: "정찰자의 표식", icon: "◇", effect: "공격력 +9", stat: "attack", value: 9 },
    { name: "강화 섬유", icon: "▤", effect: "방어력 +6", stat: "defense", value: 6 },
    { name: "행운의 파편", icon: "❖", effect: "퀘스트 골드 +12%", stat: "gold", value: 12 }
  ],
  4: [
    { name: "초심자 배지", icon: "○", effect: "공격력 +4", stat: "attack", value: 4 },
    { name: "응급 외장", icon: "▱", effect: "방어력 +3", stat: "defense", value: 3 },
    { name: "작은 행운", icon: "✳", effect: "퀘스트 경험치 +8%", stat: "xp", value: 8 }
  ]
};
function makeCandidate(slot) {
  const grade = Math.floor(Math.random() * 4) + 1;
  const pool = rewards[grade];
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { slot, grade, item: { ...item }, status: "available" };
}
function openLoot() {
  lootRound++;
  candidates = [0, 1, 2, 3].map((slot) => makeCandidate(slot));
  selectedCandidate = null;
  renderLoot(false);
}
function renderLoot(fallback) {
  $("rLootModal").classList.remove("hidden");
  $("rLootEyebrow").textContent = fallback ? "REWARD RETRY" : "REWARD DROP";
  $("rLootTitle").textContent = fallback ? "하위 등급에 재도전" : "전리품이 발견됐다";
  $("rLootDesc").textContent = fallback
    ? "실패한 등급보다 낮은 등급만 남았어. 하나를 선택해 다시 도전해."
    : "후보 4개가 각각 25% 확률로 등장했어. 획득하고 싶은 전리품을 선택해.";
  $("rLootCards").innerHTML = candidates.map((candidate) => {
    const available = candidate.status === "available";
    const chosen = candidate.status === "chosen";
    const crossed = !available && !chosen;
    const grade = candidate.grade;
    return '<button class="r-loot-card ' + (available ? "" : "disabled") + '" data-slot="' + candidate.slot + '" style="--grade:' + gradeColor(grade) + '" ' + (available ? "" : "disabled") + '>' +
      (crossed ? '<span class="r-cross">×</span>' : "") +
      '<span class="r-loot-grade">' + grade + '등급</span><span class="r-loot-rarity">' + gradeName(grade) + '</span>' +
      '<span class="r-loot-icon">' + candidate.item.icon + '</span><b>' + escapeHTML(candidate.item.name) + '</b><small>' + escapeHTML(candidate.item.effect) + '</small>' +
      '<span class="r-loot-stage">문제 ' + (5 - grade) + '단계</span></button>';
  }).join("");
  document.querySelectorAll(".r-loot-card:not(.disabled)").forEach((button) => {
    button.addEventListener("click", () => chooseCandidate(Number(button.dataset.slot)));
  });
  $("rLootContinue").classList.add("hidden");
  $("rLootContinue").onclick = null;
}
function chooseCandidate(slot) {
  const candidate = candidates.find((c) => c.slot === slot && c.status === "available");
  if (!candidate) return;
  candidates.forEach((c) => {
    if (c.status === "available" && c.slot !== slot && c.grade <= candidate.grade) c.status = "blocked";
  });
  candidate.status = "chosen";
  selectedCandidate = candidate;
  $("rLootModal").classList.add("hidden");
  startChallenge(candidate);
}
function challengeFor(grade) {
  const stage = 5 - grade;
  if (stage === 1) {
    const level = save.adaptive.choice;
    const pool = {
      0: [
        { title: "출력 명령어", prompt: "화면에 Python을 출력하는 올바른 코드는?", options: ["print('Python')", "echo('Python')", "write('Python')", "console.log('Python')"], answer: 0, explain: "파이썬에서는 print()로 화면에 출력해." },
        { title: "변수 대입", prompt: "score 변수에 정수 10을 저장하는 코드는?", options: ["score == 10", "score = 10", "10 = score", "var score: 10"], answer: 1, explain: "대입 연산자 = 를 사용해 오른쪽 값을 왼쪽 변수에 저장해." }
      ],
      1: [
        { title: "조건문", prompt: "점수가 60 이상일 때 통과를 출력하는 코드는?", options: ["if score >= 60 print('통과')", "if score >= 60: print('통과')", "when score >= 60: print('통과')", "if (score >= 60) then print('통과')"], answer: 1, explain: "if 조건식 뒤에는 콜론(:)이 필요해." },
        { title: "나머지 연산", prompt: "17을 5로 나눈 나머지를 구하는 코드는?", options: ["17 / 5", "17 // 5", "17 % 5", "17 ** 5"], answer: 2, explain: "% 연산자는 나머지를 구해." }
      ],
      2: [
        { title: "반복 횟수", prompt: "숫자 1, 2, 3을 차례대로 출력하는 코드는?", options: ["for i in range(1, 4): print(i)", "for i in range(1, 3): print(i)", "while i in 1, 2, 3: print(i)", "repeat(3): print(i)"], answer: 0, explain: "range(1, 4)는 1부터 3까지 만들어." },
        { title: "리스트 인덱스", prompt: "nums = [4, 8, 12]에서 8을 가져오는 코드는?", options: ["nums[0]", "nums[1]", "nums[2]", "nums(1)"], answer: 1, explain: "리스트의 첫 번째 인덱스는 0이야." }
      ]
    };
    const data = pool[level][Math.floor(Math.random() * pool[level].length)];
    return { stage, level, title: data.title, data };
  }
  if (stage === 2) {
    const level = save.adaptive.fix;
    const pool = {
      0: [
        { title: "따옴표 오류", prompt: "문자열의 따옴표가 잘못됐어. 코드를 고쳐서 OK를 출력해.", starter: "print('OK)", expected: "OK", explain: "문자열을 여는 따옴표와 닫는 따옴표가 짝을 이뤄야 해." },
        { title: "괄호 오류", prompt: "괄호가 빠진 코드를 수정해서 7을 출력해.", starter: "print(7", expected: "7", explain: "print()의 여는 괄호와 닫는 괄호를 확인해." }
      ],
      1: [
        { title: "조건문 오류", prompt: "조건문을 고쳐서 PASS를 출력해.", starter: "score = 85\nif score >= 80\n    print('PASS')", expected: "PASS", explain: "조건식 뒤에 콜론(:)을 붙여야 해." },
        { title: "들여쓰기 오류", prompt: "들여쓰기를 고쳐서 READY를 출력해.", starter: "if True:\nprint('READY')", expected: "READY", explain: "조건문 안에서 실행할 코드는 들여쓰기해야 해." }
      ],
      2: [
        { title: "반복문 오류", prompt: "반복문을 수정해 1, 2, 3을 출력해.", starter: "for i in range(1, 4)\n    print(i)", expected: "1\n2\n3", explain: "for문 끝의 콜론과 반복할 코드의 들여쓰기를 확인해." },
        { title: "복합 오류", prompt: "아래 코드를 고쳐 2, 4, 6을 출력해.", starter: "nums = [2, 4, 6]\nfor n in nums\nprint(n)", expected: "2\n4\n6", explain: "for문 끝의 콜론과 반복문 안의 들여쓰기가 필요해." }
      ]
    };
    const data = pool[level][Math.floor(Math.random() * pool[level].length)];
    return { stage, level, ...data };
  }
  if (stage === 3) {
    const level = save.adaptive.coding;
    const pool = {
      0: [
        { title: "이름표 출력", prompt: "name 변수에 'Ramen'을 저장하고 name을 출력해.", starter: "# 여기에 코드를 작성해.\n", expected: "Ramen", hints: ["문자열은 따옴표로 감싸.", "name = 'Ramen'으로 값을 저장해.", "print(name)으로 출력해."] },
        { title: "두 수의 합", prompt: "a에 7, b에 5를 저장하고 두 수의 합을 출력해.", starter: "a = 7\nb = 5\n# 합계를 출력해.\n", expected: "12", hints: ["두 변수의 값을 더해.", "a + b가 합계야.", "print(a + b)를 실행해."] }
      ],
      1: [
        { title: "반복 합계", prompt: "for와 range()를 사용해 1부터 5까지의 합계 15를 출력해.", starter: "total = 0\n# 반복문을 작성해.\n", expected: "15", hints: ["total에 반복해서 값을 더해.", "range(1, 6)을 사용하면 1~5가 나와.", "반복문 안에서 total += i, 마지막에 print(total)을 사용해."] },
        { title: "조건 필터", prompt: "for문과 if문을 사용해 리스트 [1, 2, 3, 4, 5, 6]에서 짝수만 출력해.", starter: "nums = [1, 2, 3, 4, 5, 6]\n# 짝수만 출력해.\n", expected: "2\n4\n6", hints: ["리스트를 for문으로 하나씩 확인해.", "나머지 연산자 %로 짝수인지 검사해.", "if n % 2 == 0: 조건에서 print(n)을 실행해."] }
      ],
      2: [
        { title: "리스트 가공", prompt: "scores = [72, 91, 84, 65]에서 80 이상인 점수만 출력해.", starter: "scores = [72, 91, 84, 65]\n# 조건문과 반복문을 사용해.\n", expected: "91\n84", hints: ["for문으로 scores를 순회해.", "각 점수가 80 이상인지 비교해.", "if score >= 80: 안에서 print(score)를 실행해."] },
        { title: "함수 구현", prompt: "double(x) 함수를 만들고 double(9)의 결과인 18을 출력해.", starter: "# double 함수를 정의해.\n", expected: "18", hints: ["def double(x): 형태로 함수를 정의해.", "함수 안에서 계산한 값을 돌려줘.", "return x * 2를 사용하고 print(double(9))를 실행해."] }
      ]
    };
    const data = pool[level][Math.floor(Math.random() * pool[level].length)];
    return { stage, level, ...data, hintLimit: 3 - level };
  }
  const pool = [
    { title: "데이터 분석가", prompt: "nums = [8, 3, 11, 6, 2]에서 최댓값과 최솟값을 순서대로 출력해.", starter: "nums = [8, 3, 11, 6, 2]\n# 최댓값과 최솟값을 출력해.\n", expected: "11\n2" },
    { title: "함수와 조건", prompt: "is_even(n) 함수를 만들어 짝수면 True, 홀수면 False를 반환해. is_even(14)와 is_even(9)를 순서대로 출력해.", starter: "# is_even 함수를 작성해.\n", expected: "True\nFalse" },
    { title: "중첩 반복", prompt: "중첩 for문을 사용해 아래 모양을 출력해.\n*\n**\n***", starter: "# 중첩 반복문으로 별을 출력해.\n", expected: "*\n**\n***" }
  ];
  return { stage, level: 2, ...pool[Math.floor(Math.random() * pool.length)], hintLimit: 0 };
}
function startChallenge(candidate) {
  currentChallenge = challengeFor(candidate.grade);
  attemptLeft = 3;
  hintsUsed = 0;
  hintLimit = currentChallenge.hintLimit || 0;
  challengeBusy = false;
  challengeLocked = false;
  renderChallenge();
  $("rChallengeModal").classList.remove("hidden");
  requestAnimationFrame(() => renderCurriculum(curriculumIndex(currentChallenge)));
}
function renderChallenge() {
  const c = currentChallenge;
  renderCurriculum(curriculumIndex(c));
  const stageName = ["", "선택형", "오류 수정", "직접 코딩", "무힌트 코딩"][c.stage];
  const difficulty = c.stage === 4 ? "최상" : ["하", "중", "상"][c.level];
  $("rChallengeGrade").textContent = selectedCandidate.grade + "등급 · " + c.stage + "단계";
  $("rChallengeStage").textContent = stageName + " / 난이도 " + difficulty;
  $("rChallengeTitle").textContent = c.title;
  $("rChallengePrompt").textContent = c.prompt;
  $("rAttempts").textContent = "도전 기회 " + attemptLeft + " / 3";
  $("rChallengeFeedback").textContent = "";
  $("rChallengeFeedback").className = "r-feedback";
  $("rHintArea").innerHTML = "";
  $("rHintButton").classList.toggle("hidden", hintLimit === 0);
  $("rHintButton").textContent = "힌트 보기 (0/" + hintLimit + ")";
  $("rHintButton").disabled = hintLimit === 0;
  $("rChallengeRun").classList.toggle("hidden", c.stage === 1);
  if (c.stage === 1) {
    $("rChallengeInput").innerHTML = '<div class="r-options">' + c.data.options.map((option, i) =>
      '<button class="r-option" data-option="' + i + '"><kbd>' + (i + 1) + '</kbd>' + escapeHTML(option) + '</button>'
    ).join("") + '</div>';
    document.querySelectorAll(".r-option").forEach((button) => button.addEventListener("click", () => checkChoice(Number(button.dataset.option))));
  } else {
    $("rChallengeInput").innerHTML = '<textarea id="rCodeEditor" class="r-code" spellcheck="false" autocapitalize="off" autocomplete="off">' + escapeHTML(c.starter) + '</textarea><div class="r-code-foot">Python 3 · 브라우저에서 실행 · 출력 결과로 자동 채점</div>';
  }
}
function showChallengeFeedback(message, good) {
  const el = $("rChallengeFeedback");
  el.textContent = message;
  el.className = "r-feedback show " + (good ? "good" : "bad");
}
function adjustDifficulty(key, success) {
  if (success) save.adaptive[key] = Math.min(2, save.adaptive[key] + 1);
  else save.adaptive[key] = Math.max(0, save.adaptive[key] - 1);
  persist();
}
function correctChallenge() {
  challengeLocked = true;
  const topicId = curriculum[curriculumIndex(currentChallenge)].id;
  if (!curriculumDone.includes(topicId)) curriculumDone.push(topicId);
  save.curriculumDone = curriculumDone;
  const grade = selectedCandidate.grade;
  save.wins++;
  save.stats["grade" + grade] = (save.stats["grade" + grade] || 0) + 1;
  if (currentChallenge.stage === 1) adjustDifficulty("choice", true);
  if (currentChallenge.stage === 2) adjustDifficulty("fix", true);
  if (currentChallenge.stage === 3) adjustDifficulty("coding", true);
  const item = selectedCandidate.item;
  const hintPenalty = hintsUsed * 5;
  const baseGold = Math.max(15, (5 - grade) * 35 + 35 - hintPenalty);
  const baseXp = (5 - grade) * 45 + 40;
  const gold = Math.round(baseGold * (1 + save.goldBonus / 100));
  const xp = Math.round(baseXp * (1 + save.xpBonus / 100));
  if (item.stat === "attack") save.attack += item.value;
  if (item.stat === "defense") save.defense += item.value;
  if (item.stat === "gold") save.goldBonus += item.value;
  if (item.stat === "xp") save.xpBonus += item.value;
  save.items.push({ ...item, grade, icon: item.icon, name: item.name });
  save.gold += gold;
  save.xp += xp + (item.stat === "xp" ? item.value : 0);
  save.maxHp = Math.min(180, save.maxHp + (grade === 1 ? 4 : 0));
  save.hp = Math.min(save.maxHp, save.hp + 15);
  persist();
  $("rChallengeModal").classList.add("hidden");
  $("rSuccessItem").innerHTML = '<span class="r-success-icon">' + item.icon + '</span><div><b>' + escapeHTML(item.name) + '</b><small>' + grade + '등급 전리품 · ' + escapeHTML(item.effect) + '</small></div>';
  $("rSuccessReward").textContent = "+" + gold + " G  ·  +" + xp + " XP";
  $("rSuccessModal").classList.remove("hidden");
  $("rSuccessContinue").onclick = () => {
    $("rSuccessModal").classList.add("hidden");
    gameState = "select";
    $("rArenaPanel").classList.add("hidden");
    $("rSelectPanel").classList.remove("hidden");
    toast("전리품 획득! 다음 의뢰를 선택해.");
  };
}
function failedChallenge() {
  challengeLocked = true;
  save.fails++;
  const key = currentChallenge.stage === 1 ? "choice" : currentChallenge.stage === 2 ? "fix" : currentChallenge.stage === 3 ? "coding" : null;
  if (key) adjustDifficulty(key, false);
  const grade = selectedCandidate.grade;
  selectedCandidate.status = "blocked";
  candidates.forEach((candidate) => {
    if (candidate.status === "available" && candidate.grade <= grade) candidate.status = "blocked";
  });
  $("rChallengeModal").classList.add("hidden");
  const lower = candidates.some((candidate) => candidate.status === "available" && candidate.grade > grade);
  if (lower) {
    renderLoot(true);
    toast("3번 안에 해결하지 못했어. 더 낮은 등급에 도전할 수 있어.");
  } else {
    $("rLootModal").classList.add("hidden");
    $("rFailModal").classList.remove("hidden");
    $("rFailContinue").onclick = () => {
      $("rFailModal").classList.add("hidden");
      gameState = "select";
      $("rArenaPanel").classList.add("hidden");
      $("rSelectPanel").classList.remove("hidden");
      toast("이번 전리품은 놓쳤어. 다음 의뢰에서 다시 도전해!");
    };
  }
}
function checkChoice(index) {
  if (challengeBusy || challengeLocked) return;
  if (index === currentChallenge.data.answer) {
    challengeLocked = true;
    showChallengeFeedback("정답! " + currentChallenge.data.explain, true);
    setTimeout(correctChallenge, 650);
  } else wrongAttempt("아쉽지만 정답이 아니야. 다시 생각해 봐.");
}
function wrongAttempt(message) {
  attemptLeft--;
  $("rAttempts").textContent = "도전 기회 " + attemptLeft + " / 3";
  if (attemptLeft <= 0) {
    challengeLocked = true;
    showChallengeFeedback("기회를 모두 사용했어. 이번 등급은 놓쳤어.", false);
    setTimeout(failedChallenge, 650);
  } else {
    showChallengeFeedback(message + " 남은 기회: " + attemptLeft, false);
  }
}
async function loadPyodideEngine() {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js";
    document.head.appendChild(script);
    await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = () => reject(new Error("파이썬 실행 환경을 불러오지 못했어. 네트워크를 확인해 줘.")); });
    return await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/" });
  })();
  return pyodidePromise;
}
async function executeUserCode(code) {
  if (code.length > 1500) throw new Error("코드가 너무 길어. 1,500자 이내로 작성해 줘.");
  if (code.split(/\s+/).includes("while") || code.includes("__import__") || code.includes("__builtins__") || code.includes("open(")) throw new Error("이 문제에서는 while문, 파일 접근, 모듈 불러오기를 사용할 수 없어.");
  const py = await loadPyodideEngine();
  py.globals.set("user_code", code);
  const result = await py.runPythonAsync(
    "import io, sys, builtins\n" +
    "_out = io.StringIO()\n" +
    "_old = sys.stdout\n" +
    "_allowed = ('print','range','len','str','int','float','bool','list','dict','tuple','set','sum','min','max','abs','round','enumerate','zip','sorted','reversed','all','any','type')\n" +
    "_safe = {name: getattr(builtins, name) for name in _allowed}\n" +
    "sys.stdout = _out\n" +
    "try:\n" +
    "    exec(compile(user_code, '<quest>', 'exec'), {'__builtins__': _safe})\n" +
    "finally:\n" +
    "    sys.stdout = _old\n" +
    "_out.getvalue()"
  );
  return String(result).replace(/\r\n/g, "\n").trimEnd();
}
$("rChallengeRun").addEventListener("click", async () => {
  if (challengeBusy || challengeLocked) return;
  challengeBusy = true;
  const button = $("rChallengeRun");
  button.disabled = true;
  button.textContent = "파이썬 실행 중...";
  try {
    const actual = await executeUserCode($("rCodeEditor").value);
    if (actual === currentChallenge.expected) {
      challengeLocked = true;
      showChallengeFeedback("코드 실행 성공! 목표 출력이 정확해.", true);
      setTimeout(correctChallenge, 650);
    } else {
      wrongAttempt(actual ? "실행 결과가 목표와 달라. 출력값과 줄바꿈을 확인해." : "출력된 결과가 없어. print()를 확인해.");
    }
  } catch (error) {
    wrongAttempt("코드 오류: " + String(error).split("\n")[0]);
  } finally {
    challengeBusy = false;
    button.disabled = false;
    button.textContent = "▶ 코드 실행 · 정답 확인";
  }
});
$("rHintButton").addEventListener("click", () => {
  if (hintsUsed >= hintLimit || !currentChallenge.hints) return;
  const hint = currentChallenge.hints[hintsUsed];
  hintsUsed++;
  $("rHintArea").innerHTML += '<div class="r-hint-line"><b>힌트 ' + hintsUsed + '</b> ' + escapeHTML(hint) + '</div>';
  $("rHintButton").textContent = "힌트 보기 (" + hintsUsed + "/" + hintLimit + ")";
  if (hintsUsed >= hintLimit) $("rHintButton").disabled = true;
});
$("rLootContinue").addEventListener("click", () => {
  $("rLootModal").classList.add("hidden");
  $("rFailModal").classList.remove("hidden");
});
renderModes();
renderHUD();
setCanvasSize();
requestAnimationFrame(loop);
