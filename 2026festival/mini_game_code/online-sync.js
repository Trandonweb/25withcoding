import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyBgOAO72ArbW8dO7OSYsTVEQtRHT049U20",
  authDomain: "points2026-f5e50.firebaseapp.com",
  projectId: "points2026-f5e50",
  storageBucket: "points2026-f5e50.firebasestorage.app",
  messagingSenderId: "248724251417",
  appId: "1:248724251417:web:02d85cdc4addac98069b88"
};

function renderHostMirror(data) {
  if (!mirrorRoot) {
    mirrorRoot = document.createElement("section");
    mirrorRoot.id = "mgHostMirror";
    Object.assign(mirrorRoot.style, { position:"fixed", inset:"0", zIndex:"9000", overflow:"auto", padding:"clamp(12px,3vw,28px)", background:"#f2f5f1", color:"#17251c", fontFamily:"Inter,'Noto Sans KR',sans-serif", pointerEvents:"none", display:"block" });
    const heading = document.createElement("div");
    heading.textContent = "방장 화면 동기화";
    Object.assign(heading.style, { fontWeight:"850", fontSize:"clamp(20px,4vw,30px)", marginBottom:"8px" });
    const status = document.createElement("div");
    status.id = "mgHostMirrorStatus";
    Object.assign(status.style, { whiteSpace:"pre-wrap", fontSize:"clamp(12px,2vw,15px)", lineHeight:"1.45", marginBottom:"12px", color:"#526457" });
    const shots = document.createElement("div");
    shots.id = "mgHostMirrorShots";
    Object.assign(shots.style, { display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"10px" });
    mirrorRoot.append(heading,status,shots);
    document.body.appendChild(mirrorRoot);
  }
  const status = mirrorRoot.querySelector("#mgHostMirrorStatus");
  status.textContent = data.text || "방장이 게임을 진행하고 있습니다.";
  const shots = mirrorRoot.querySelector("#mgHostMirrorShots");
  shots.replaceChildren();
  (data.images || []).forEach(src => {
    const img = document.createElement("img");
    img.alt = "방장 게임 화면";
    img.src = src;
    Object.assign(img.style, { display:"block", maxWidth:"min(100%,720px)", maxHeight:"48dvh", objectFit:"contain", background:"#fff", border:"1px solid #dbe5dc", borderRadius:"14px", boxShadow:"0 8px 24px #203b2810" });
    shots.appendChild(img);
  });
}

const app = initializeApp(cfg, "miniGameSyncShared");
const db = getFirestore(app);
const room = JSON.parse(localStorage.getItem("miniGameRoom") || "null");
const active = !!(room && room.connected && room.code && room.role);
let ref = null, unsub = null, lastStateAt = 0, handler = null, mirrorRoot = null;
if (active) {
  ref = doc(db, "miniGameRooms", room.code);
  unsub = onSnapshot(ref, snap => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (room.role === "guest" && data.gameState && data.gameState.updatedAt !== lastStateAt) {
      lastStateAt = data.gameState.updatedAt;
      handler?.(data.gameState.payload, data.gameState.updatedAt);
    }
    if (room.role === "guest" && data.mirror) renderHostMirror(data.mirror);
    if (room.role === "guest" && data.matchConfig) {
      const old = JSON.parse(localStorage.getItem("miniGameSettings") || "null");
      const cfg = data.matchConfig;
      if (cfg.currentGame && (!old || old.currentGame !== cfg.currentGame || old.round !== cfg.round)) {
        localStorage.setItem("miniGameSettings", JSON.stringify({ ...cfg, mode: "online", modeName: "온라인 대전 · 방 " + room.code }));
        localStorage.setItem("miniGameSelected", cfg.currentGame);
        const target = "game/" + cfg.currentGame + ".html";
        if (!location.pathname.endsWith(target)) location.href = target;
      }
    }
  }, err => console.warn("MINI GAME sync error", err));
}
window.mgOnline = {
  active, role: active ? room.role : null, code: active ? room.code : null,
  isHost: !active || room.role === "host",
  async publish(payload) {
    if (!active || room.role !== "host" || !ref) return;
    const updatedAt = Date.now();
    try { await updateDoc(ref, { gameState: { payload, updatedAt }, updatedAt }); }
    catch (e) { console.warn("MINI GAME state publish failed", e); }
  },
  listen(fn) { handler = fn; },
  async setMatchConfig(config) {
    if (!active || room.role !== "host" || !ref) return;
    try { await updateDoc(ref, { matchConfig: config, updatedAt: Date.now() }); }
    catch (e) { console.warn("MINI GAME match config failed", e); }
  },
  destroy() { if (unsub) unsub(); }
};
if (active && room.role === "guest") {
  document.documentElement.classList.add("mg-online-guest");
  const lock = e => {
    if (e.target.closest("#miniSoundPanel")) return;
    if (e.type === "keydown" && !["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Enter","a","A","d","D","s","S","w","W","l","L"].includes(e.key)) return;
    e.preventDefault(); e.stopImmediatePropagation();
  };
  ["pointerdown","click","keydown","touchstart"].forEach(type => document.addEventListener(type, lock, true));
}
window.dispatchEvent(new Event("mg-online-ready"));
if (active && room.role === "host") {
  let lastMirrorAt = 0;
  setInterval(async () => {
    if (document.visibilityState === "hidden" || !ref) return;
    const now = Date.now();
    if (now - lastMirrorAt < 650) return;
    lastMirrorAt = now;
    const images = [];
    document.querySelectorAll("canvas").forEach(canvas => {
      if (images.length >= 2) return;
      try { images.push(canvas.toDataURL("image/jpeg", 0.42)); } catch {}
    });
    const text = (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 850);
    try { await updateDoc(ref, { mirror: { page: location.pathname.split("/").pop(), text, images, updatedAt: now } }); }
    catch (e) { console.warn("MINI GAME mirror update failed", e); }
  }, 650);
}
window.addEventListener("beforeunload", () => { if (unsub) unsub(); });
