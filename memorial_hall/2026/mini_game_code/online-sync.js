import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgOAO72ArbW8dO7OSYsTVEQtRHT049U20",
  authDomain: "points2026-f5e50.firebaseapp.com",
  projectId: "points2026-f5e50",
  storageBucket: "points2026-f5e50.firebasestorage.app",
  messagingSenderId: "248724251417",
  appId: "1:248724251417:web:02d85cdc4addac98069b88"
};
const app = initializeApp(firebaseConfig, "miniGameSyncShared");
const db = getFirestore(app);
let room = null, ref = null, unsub = null, handler = null, lastStateAt = 0;
let lastRemoteInputId = null, processedRemoteInputs = new Set(), mirrorRoot = null;
let remotePressed = new Set(), lastMirrorAt = 0, mirrorTimer = null, heartbeatTimer = null;

function readRoom() {
  try { return JSON.parse(localStorage.getItem("miniGameRoom") || "null"); }
  catch { return null; }
}
function roomKey(r) { return r && r.connected && r.code && r.role ? r.code + ":" + r.role : ""; }
function setStatus(text) {
  let el = document.getElementById("mgOnlineStatus");
  if (!el) {
    el = document.createElement("div");
    el.id = "mgOnlineStatus";
    Object.assign(el.style, { position:"fixed", left:"10px", top:"10px", zIndex:"9500", maxWidth:"min(94vw,420px)", padding:"8px 12px", borderRadius:"10px", background:"#173d28", color:"#f4fff6", border:"1px solid #8bd5a2", font:"700 12px/1.4 Arial,'Noto Sans KR',sans-serif", boxShadow:"0 4px 18px #0002", pointerEvents:"none" });
    document.body.appendChild(el);
  }
  el.textContent = text;
}
function renderHostMirror(data) {
  // Keep the last good frame during a transient capture failure.
  if (!data.images || !data.images.length) return;
  if (!mirrorRoot) {
    mirrorRoot = document.createElement("section");
    mirrorRoot.id = "mgHostMirror";
    Object.assign(mirrorRoot.style, { position:"fixed", inset:"0", zIndex:"9000", overflow:"auto", padding:"clamp(12px,3vw,28px)", background:"#f2f5f1", color:"#17251c", fontFamily:"Inter,'Noto Sans KR',sans-serif", pointerEvents:"none", display:"block" });
    const heading = document.createElement("div");
    heading.textContent = "온라인 대전 · 방장 화면";
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
  mirrorRoot.style.display = "block";
  const status = mirrorRoot.querySelector("#mgHostMirrorStatus");
  status.textContent = data.text || "방장이 게임을 진행하고 있습니다.";
  const shots = mirrorRoot.querySelector("#mgHostMirrorShots");
  shots.replaceChildren();
  (data.images || []).forEach(src => {
    const img = document.createElement("img");
    img.alt = "방장 게임 화면";
    img.src = src;
    Object.assign(img.style, { display:"block", maxWidth:data.images.length > 1 ? "min(48%,700px)" : "min(100%,900px)", maxHeight:"62dvh", objectFit:"contain", background:"#fff", border:"1px solid #dbe5dc", borderRadius:"14px", boxShadow:"0 8px 24px #203b2810" });
    shots.appendChild(img);
  });
}
async function captureWholePage() {
  const sourceBody = document.body;
  const viewportW = Math.max(320, Math.min(900, window.innerWidth || 900));
  const viewportH = Math.max(240, Math.min(680, window.innerHeight || 600));
  const scale = Math.min(1, 900 / viewportW, 680 / viewportH);
  const outW = Math.max(1, Math.round(viewportW * scale));
  const outH = Math.max(1, Math.round(viewportH * scale));
  const clone = sourceBody.cloneNode(true);
  clone.querySelectorAll("#mgOnlineStatus,#mgHostMirror,#miniSoundPanel,script").forEach(el => el.remove());
  clone.style.setProperty("box-sizing","border-box","important");
  clone.style.setProperty("width",viewportW+"px","important");
  clone.style.setProperty("min-height",viewportH+"px","important");
  clone.style.setProperty("margin","0","important");
  clone.style.setProperty("overflow","hidden","important");
  const originals = [sourceBody, ...sourceBody.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  for (let i=0; i<Math.min(originals.length,copies.length); i++) {
    const original = originals[i], copy = copies[i];
    if (original.id === "mgOnlineStatus" || original.id === "mgHostMirror" || original.id === "miniSoundPanel") continue;
    try {
      const cs = getComputedStyle(original);
      for (let j=0; j<cs.length; j++) {
        const prop = cs[j];
        copy.style.setProperty(prop,cs.getPropertyValue(prop),cs.getPropertyPriority(prop));
      }
    } catch {}
    if (original instanceof HTMLInputElement) copy.setAttribute("value",original.value);
    if (original instanceof HTMLTextAreaElement) copy.textContent=original.value;
    if (original instanceof HTMLSelectElement) copy.querySelectorAll("option").forEach((option,k)=>option.toggleAttribute("selected",original.options[k]?.selected===true));
    if (original instanceof HTMLCanvasElement) {
      try {
        const img=document.createElement("img");
        img.src=original.toDataURL("image/png");
        img.width=original.width; img.height=original.height;
        img.style.cssText=copy.style.cssText;
        copy.replaceWith(img);
      } catch {}
    }
  }
  const markup = new XMLSerializer().serializeToString(clone);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+viewportW+'" height="'+viewportH+'"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:'+viewportW+'px;height:'+viewportH+'px;overflow:hidden">'+markup+'</div></foreignObject></svg>';
  const blobUrl = URL.createObjectURL(new Blob([svg],{type:"image/svg+xml;charset=utf-8"}));
  try {
    const img = new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=blobUrl;});
    const canvas=document.createElement("canvas");
    canvas.width=outW; canvas.height=outH;
    const ctx=canvas.getContext("2d");
    if(!ctx) throw new Error("Canvas context unavailable");
    ctx.fillStyle="#07100b";ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(img,0,0,outW,outH);
    return canvas.toDataURL("image/jpeg",0.58);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
function dispatchKey(type, key, code, repeat=false) {
  try { const event = new KeyboardEvent(type, { key, code, bubbles:true, cancelable:true, repeat }); Object.defineProperty(event,"mgRemote",{value:true}); document.dispatchEvent(event); } catch {}
}
function dispatchRemotePointer(data) {
  if (!data || !Number.isFinite(data.x) || !Number.isFinite(data.y)) return;
  const target = document.elementFromPoint(Math.round(data.x * innerWidth), Math.round(data.y * innerHeight));
  if (!target || target.closest("#miniSoundPanel,#mgOnlineStatus,#mgHostMirror")) return;
  if (typeof target.click === "function") target.click();
}
function processRemoteInputQueue(queue) {
  if (!Array.isArray(queue)) return;
  for (const input of queue) {
    if (!input || !input.id || processedRemoteInputs.has(input.id)) continue;
    if (["keydown","keyup"].includes(input.type) && typeof input.key === "string" && typeof input.code === "string") {
      dispatchKey(input.type,input.key,input.code,!!input.repeat);
      processedRemoteInputs.add(input.id);
      if (processedRemoteInputs.size > 500) processedRemoteInputs = new Set([...processedRemoteInputs].slice(-250));
    }
  }
}
function ensureSubscription() {
  const nextRoom = readRoom();
  const nextKey = roomKey(nextRoom);
  const currentKey = roomKey(room);
  if (nextKey === currentKey && (nextKey ? !!unsub : true)) return;
  if (unsub) { unsub(); unsub = null; }
  if (mirrorTimer) { clearInterval(mirrorTimer); mirrorTimer = null; }
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  room = nextRoom;
  ref = null; lastStateAt = 0; lastRemoteInputId = null; processedRemoteInputs = new Set();
  if (!nextKey) {
    if (document.getElementById("mgOnlineStatus")) document.getElementById("mgOnlineStatus").remove();
    return;
  }
  ref = doc(db, "miniGameRooms", room.code);
  const heartbeatField = room.role === "host" ? "hostSeenAt" : "guestSeenAt";
  const heartbeat = () => updateDoc(ref, { [heartbeatField]: Date.now(), updatedAt: Date.now() }).catch(err => console.warn("MINI GAME heartbeat failed", err));
  heartbeat(); heartbeatTimer = setInterval(heartbeat, 2000);
  setStatus("온라인 대전 연결 중 · 방 " + room.code);
  unsub = onSnapshot(ref, snap => {
    if (!snap.exists()) { setStatus("방이 삭제되었거나 연결이 끊겼습니다."); return; }
    const data = snap.data();
    const now = Date.now();
    const bothLive = !!data.hostSeenAt && !!data.guestSeenAt && now-data.hostSeenAt<7000 && now-data.guestSeenAt<7000 && data.status === "connected" && !!data.guestId;
    setStatus((room.role === "host" ? "방장" : "참가자") + " · 방 " + room.code + (bothLive ? " · 실시간 연결됨" : " · 상대 연결 확인 중") + " · 새로고침 유지 / 나가기: Ctrl+Shift+L");
    if (room.role === "host") {
      if (data.remotePointer && data.remotePointer.id !== lastRemoteInputId) { lastRemoteInputId = data.remotePointer.id; dispatchRemotePointer(data.remotePointer); }
      processRemoteInputQueue(data.remoteInputQueue);
      if (data.remoteInput && data.remoteInput.id !== lastRemoteInputId) {
        lastRemoteInputId = data.remoteInput.id;
        const input = data.remoteInput;
        if (["keydown","keyup"].includes(input.type) && typeof input.key === "string" && typeof input.code === "string") dispatchKey(input.type,input.key,input.code,!!input.repeat);
      }
    }
    if (room.role === "guest" && data.gameState && data.gameState.updatedAt !== lastStateAt) {
      lastStateAt = data.gameState.updatedAt;
      handler?.(data.gameState.payload, data.gameState.updatedAt);
    }
    if (room.role === "guest" && data.mirror) {
      if (data.mirror.page === "index.html" && data.mirror.screen !== "onlineRoomScreen" && location.pathname.includes("/game/game")) {
        location.href = "../index.html"; return;
      }
      renderHostMirror(data.mirror);
    }
    if (room.role === "guest" && data.matchConfig) {
      const cfg = data.matchConfig;
      const target = "game/" + cfg.currentGame + ".html";
      const launchId = String(cfg.launchId || "");
      const seenLaunchId = localStorage.getItem("miniGameLastLaunchId") || "";
      if (cfg.currentGame && launchId && launchId !== seenLaunchId) {
        localStorage.setItem("miniGameLastLaunchId", launchId);
        localStorage.setItem("miniGameSettings", JSON.stringify({ ...cfg, mode:"online", modeName:"온라인 대전 · 방 " + room.code }));
        localStorage.setItem("miniGameSelected", cfg.currentGame);
        if (!location.pathname.endsWith(target)) location.href = target;
      }
    }
  }, err => {
    console.error("MINI GAME sync error", err);
    setStatus("온라인 연결 오류 · " + (err.code || "네트워크/권한 확인 필요"));
  });
  if (room.role === "host") {
    mirrorTimer = setInterval(async () => {
      if (document.visibilityState === "hidden" || !ref) return;
      const now = Date.now();
      if (now - lastMirrorAt < 1000) return;
      lastMirrorAt = now;
      let images = [];
      try {
        const frame = await captureWholePage();
        if (frame) images = [frame];
      } catch (e) { console.warn("MINI GAME full-page capture failed",e); }
      const text = (document.body.innerText || "").replace(/\s+/g," ").trim().slice(0,500);
      const screen = document.querySelector(".screen:not(.hidden)")?.id || "";
      if (!images.length) return;
      try { await updateDoc(ref,{ mirror:{page:location.pathname.split("/").pop(),screen,text,images,updatedAt:now} }); }
      catch (e) { console.warn("MINI GAME mirror update failed",e); }
    },1000);
  }
}
window.mgOnline = {
  get active() { return !!roomKey(readRoom()); },
  get role() { return readRoom()?.role || null; },
  get code() { return readRoom()?.code || null; },
  get isHost() { return !roomKey(readRoom()) || readRoom()?.role === "host"; },
  async publish(payload) {
    ensureSubscription();
    const r = readRoom(); if (!roomKey(r) || r.role !== "host") return;
    try { await updateDoc(doc(db,"miniGameRooms",r.code),{gameState:{payload,updatedAt:Date.now()},updatedAt:Date.now()}); }
    catch(e) { console.warn("MINI GAME state publish failed",e); }
  },
  listen(fn) { handler = fn; },
  async setMatchConfig(config) {
    ensureSubscription();
    const r = readRoom(); if (!roomKey(r) || r.role !== "host") throw new Error("온라인 방장 연결이 준비되지 않았습니다.");
    try { await updateDoc(doc(db,"miniGameRooms",r.code),{matchConfig:config,updatedAt:Date.now()}); }
    catch(e) { console.error("MINI GAME match config failed",e); throw e; }
  },
  destroy() { if (unsub) unsub(); unsub=null; if(mirrorTimer)clearInterval(mirrorTimer); }
};
function installGuestInputRelay() {
  const remoteKeys = new Set(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","Enter","KeyA","KeyD","KeyS","KeyW","KeyL","KeyQ","KeyP"]);
  const pressed = new Set();
  let queue = [], writeChain = Promise.resolve();
  const enqueue = (type,e) => {
    const r = readRoom(); if (!roomKey(r) || r.role !== "guest") return;
    const input = { id:Date.now().toString(36)+"-"+Math.random().toString(36).slice(2), type, key:e.key, code:e.code, repeat:!!e.repeat, at:Date.now() };
    queue = [...queue,input].slice(-40);
    const snapshot = queue.slice();
    writeChain = writeChain.then(()=>updateDoc(doc(db,"miniGameRooms",r.code),{remoteInputQueue:snapshot,updatedAt:Date.now()}))
      .catch(err=>console.warn("MINI GAME remote input failed",err));
  };
  const onKeyDown = e => {
    if (e.target?.closest?.("#miniSoundPanel")) return;
    if (!remoteKeys.has(e.code)) return;
    const r = readRoom(); if (!roomKey(r) || r.role !== "guest") return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (!pressed.has(e.code)) { pressed.add(e.code); enqueue("keydown",e); }
  };
  const onKeyUp = e => {
    if (!remoteKeys.has(e.code)) return;
    const r = readRoom(); if (!roomKey(r) || r.role !== "guest") return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (pressed.delete(e.code)) enqueue("keyup",e);
  };
  const blockLocal = e => {
    const r = readRoom(); if (!roomKey(r) || r.role !== "guest") return;
    if (e.target?.closest?.("#miniSoundPanel")) return;
    if (e.type === "click") {
      const remotePointer = { id: Date.now().toString(36)+"-"+Math.random().toString(36).slice(2), x: Math.max(0,Math.min(1,e.clientX/Math.max(1,innerWidth))), y: Math.max(0,Math.min(1,e.clientY/Math.max(1,innerHeight))), at:Date.now() };
      updateDoc(doc(db,"miniGameRooms",r.code),{remotePointer,updatedAt:Date.now()}).catch(err=>console.warn("MINI GAME remote click failed",err));
    }
    if (e.type === "pointerdown" || e.type === "click" || e.type === "touchstart") { e.preventDefault(); e.stopImmediatePropagation(); }
  };
  ["keydown","keyup"].forEach(type=>document.addEventListener(type,type==="keydown"?onKeyDown:onKeyUp,true));
  ["pointerdown","click","touchstart"].forEach(type=>document.addEventListener(type,blockLocal,true));
  window.addEventListener("blur",()=>{for(const code of [...pressed]){const key=code==="Space"?" ":code.startsWith("Key")?code.slice(3).toLowerCase():code;enqueue("keyup",{key,code,repeat:false});}pressed.clear();});
}
async function leaveOnlineRoom(){
  const r=readRoom();
  if(r?.code&&r?.role){
    try{
      const roomRef=doc(db,"miniGameRooms",r.code);
      if(r.role==="host") await updateDoc(roomRef,{status:"closed",updatedAt:Date.now()});
      else await updateDoc(roomRef,{guestId:null,guestSeenAt:null,status:"waiting",updatedAt:Date.now()});
    }catch(err){console.warn("MINI GAME room exit update failed",err);}
  }
  if(unsub)unsub();unsub=null;
  if(mirrorTimer)clearInterval(mirrorTimer);mirrorTimer=null;
  if(heartbeatTimer)clearInterval(heartbeatTimer);heartbeatTimer=null;
  localStorage.removeItem("miniGameRoom");
  localStorage.removeItem("miniGameSettings");
  localStorage.removeItem("miniGameSelected");
  localStorage.removeItem("miniGameResult");
  window.dispatchEvent(new Event("mini-game-room-updated"));
  location.href="../index.html";
}
document.addEventListener("keydown",e=>{
  if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==="l"){
    e.preventDefault();e.stopImmediatePropagation();leaveOnlineRoom();
  }else if(e.ctrlKey&&!e.shiftKey&&e.key.toLowerCase()==="l"){
    // Best effort only: browsers reserve Ctrl+L for focusing the address bar.
    e.preventDefault();e.stopImmediatePropagation();leaveOnlineRoom();
  }
},true);
window.addEventListener("mini-game-room-updated",ensureSubscription);
window.addEventListener("storage",e=>{if(e.key==="miniGameRoom")ensureSubscription();});
window.addEventListener("beforeunload",()=>{if(unsub)unsub();if(mirrorTimer)clearInterval(mirrorTimer);if(heartbeatTimer)clearInterval(heartbeatTimer);});
installGuestInputRelay();
ensureSubscription();
window.dispatchEvent(new Event("mg-online-ready"));
