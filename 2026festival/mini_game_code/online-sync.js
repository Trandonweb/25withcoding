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
const app = initializeApp(cfg, "miniGameSyncShared");
const db = getFirestore(app);
const room = JSON.parse(localStorage.getItem("miniGameRoom") || "null");
const active = !!(room && room.connected && room.code && room.role);
let ref = null, unsub = null, lastStateAt = 0, handler = null;
if (active) {
  ref = doc(db, "miniGameRooms", room.code);
  unsub = onSnapshot(ref, snap => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (room.role === "guest" && data.gameState && data.gameState.updatedAt !== lastStateAt) {
      lastStateAt = data.gameState.updatedAt;
      handler?.(data.gameState.payload, data.gameState.updatedAt);
    }
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
window.addEventListener("beforeunload", () => { if (unsub) unsub(); });
