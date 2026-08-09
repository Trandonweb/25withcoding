import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const mainFirebaseConfig={apiKey:"AIzaSyBgAf4JrArW8dO7OSYsTVEQtRHT049U20",authDomain:"points2026-f5e50.firebaseapp.com",projectId:"points2026-f5e50",storageBucket:"points2026-f5e50.firebasestorage.app",messagingSenderId:"248724251417",appId:"1:248724251417:web:02d85cdc4addac98069b88"};
const db=getFirestore(initializeApp(mainFirebaseConfig,"cobySettings"));
const TONE_KEY="coby_settings";
const TONES={friendly:"친근하게",professional:"전문적으로",easy:"쉽게 설명",concise:"간결하게",teacher:"선생님처럼",custom:"직접 입력"};

export function isAdminRole(role){return role==="president"||role==="vice";}
function getSavedSettings(){try{return JSON.parse(localStorage.getItem(TONE_KEY)||"{}")||{};}catch{return {};}}
function saveTone(tone,customTone=""){localStorage.setItem(TONE_KEY,JSON.stringify({tone,customTone}));}

function renderSettings(admin){
 const list=document.getElementById("settingsList"); if(!list)return;
 const saved=getSavedSettings(), selected=saved.tone||"friendly";
 list.innerHTML=`<section class="settings-section"><div class="settings-section-title">💬 COBY 말투</div><p class="settings-section-desc">COBY가 답변할 때 사용할 말투를 선택하세요.</p><div class="tone-options">${Object.entries(TONES).map(([v,l])=>`<button type="button" class="tone-option ${selected===v?"selected":""}" data-tone="${v}"><span>${l}</span><span class="tone-check">✓</span></button>`).join("")}</div><div class="custom-tone-wrap" id="customToneWrap" ${selected==="custom"?"":"hidden"}><textarea id="customToneInput" maxlength="300" placeholder="원하는 말투를 직접 입력하세요.">${saved.customTone||""}</textarea><button type="button" class="custom-tone-save" id="customToneSave">저장</button></div></section>${admin?`<div id="settingsAdminLogsButton" class="settings-admin-row"><button type="button" class="settings-admin-button" onclick="openAdminLogs()"><span>👥</span><span><strong>사용자별 대화 로그 보기</strong><small>관리자 전용</small></span><span>›</span></button></div>`:""}`;
 const wrap=document.getElementById("customToneWrap");
 list.querySelectorAll(".tone-option").forEach(btn=>btn.addEventListener("click",()=>{const tone=btn.dataset.tone;const old=getSavedSettings();saveTone(tone,old.customTone||"");list.querySelectorAll(".tone-option").forEach(x=>x.classList.toggle("selected",x===btn));if(wrap)wrap.hidden=tone!=="custom";}));
 document.getElementById("customToneSave")?.addEventListener("click",()=>{const value=document.getElementById("customToneInput")?.value.trim()||"";saveTone("custom",value);const b=document.getElementById("customToneSave");b.textContent="저장됨 ✓";setTimeout(()=>b.textContent="저장",1200);});
}

async function loadSettingsAccess(){
 const userId=localStorage.getItem("userId"); let admin=false;
 if(userId){try{const s=await getDoc(doc(db,"users",userId));admin=s.exists()&&isAdminRole(s.data().role);}catch(e){console.warn("설정 권한 확인 실패",e);}}
 renderSettings(admin);
}

export function getCobyToneSettings(){const s=getSavedSettings();return{tone:s.tone||"friendly",toneLabel:TONES[s.tone]||TONES.friendly,customTone:s.customTone||""};}
export function openSettings(){const m=document.getElementById("settingsModal");if(!m)return;m.classList.add("show");m.setAttribute("aria-hidden","false");loadSettingsAccess();}
export function closeSettings(){const m=document.getElementById("settingsModal");if(!m)return;m.classList.remove("show");m.setAttribute("aria-hidden","true");}
window.openSettings=openSettings;window.closeSettings=closeSettings;
loadSettingsAccess();
