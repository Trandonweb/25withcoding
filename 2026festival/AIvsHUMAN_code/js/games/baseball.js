let root=null,canvas=null,ctx=null,raf=0,timers=[],keydownHandler=null,resizeHandler=null,state=null;

const PITCHES=[
 {name:'포심',speed:148,move:0,drop:0},
 {name:'투심',speed:143,move:1,drop:7},
 {name:'커터',speed:139,move:-1,drop:4},
 {name:'슬라이더',speed:132,move:-2,drop:12},
 {name:'커브',speed:120,move:2,drop:22},
 {name:'포크',speed:128,move:1,drop:17}
];

export function openBaseball(container){
 destroy();
 root=container;
 root.innerHTML='<div class="bb"><header><div><b>HUMAN</b><small id="hrole">BATTER</small></div><div class="score"><b id="hs">0</b><span>:</span><b id="as">0</b></div><div class="ar"><b>AI</b><small id="arole">PITCHER</small></div></header><main class="field"><canvas id="cv"></canvas><div class="viewtag" id="viewtag">CATCHER VIEW</div><div class="count"><b>1회 <i id="half">초</i></b><b>OUT <i id="out">0</i></b><b id="cnt">0 - 0</b></div><div class="pitchhud"><b id="pname">READY</b><span id="pspeed">---</span><small id="pstate">준비</small></div><div class="bat-zone" id="batZone"><div class="zone-grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="aim" id="aim"><div class="aimline" id="aimline"></div><div class="release" id="release"></div><div class="target" id="target"></div><span>드래그해서 투구 코스 지정</span></div><div class="msg"><b id="msg">타석에 들어섭니다.</b><small id="sub">공이 홈플레이트로 들어옵니다.</small></div><div class="result" id="result"><div><strong id="rtitle"></strong><p id="rtext"></p><button id="again">다시 경기</button></div></div></main><footer><div id="lefthelp">타이밍을 맞춰 SWING</div><button id="action">SWING</button><div id="pitchControls"></div></footer></div>';
 addStyle();
 canvas=root.querySelector('#cv');ctx=canvas.getContext('2d');
 state={half:'top',outs:0,balls:0,strikes:0,human:0,ai:0,bases:[0,0,0],pitch:null,pitching:false,selectedPitch:null,available:randomPitches(),target:{x:.5,y:.5},drag:false,over:false,transition:false};
 root.querySelector('#action').onclick=action;
 root.querySelector('#again').onclick=reset;
 bindAim();
 keydownHandler=e=>{if(e.code==='Space'){e.preventDefault();action()}};
 window.addEventListener('keydown',keydownHandler);
 resizeHandler=resize;window.addEventListener('resize',resizeHandler);
 resize();renderPitchButtons();update();schedule(pitch,900);
}

function randomPitches(){
 const count=3+Math.floor(Math.random()*3);
 return PITCHES.slice().sort(()=>Math.random()-.5).slice(0,count);
}

function addStyle(){
 if(root.querySelector('style'))return;
 const s=document.createElement('style');
 s.textContent='*{box-sizing:border-box}.bb{width:100%;height:100dvh;background:#071018;color:#f2f6f8;display:flex;flex-direction:column;overflow:hidden;font-family:Arial,Pretendard,sans-serif}.bb header{height:70px;flex:0 0 70px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 26px;background:linear-gradient(#172631,#0b141b);border-bottom:1px solid #344651;z-index:10}.bb header b{font-size:15px}.bb header small{display:block;color:#82939f;font-size:9px;letter-spacing:.14em;margin-top:4px}.bb .ar{text-align:right}.score{display:flex;gap:18px;align-items:center;font-size:34px}.score span{font-size:12px;color:#4bd47d}.field{position:relative;flex:1;min-height:0;overflow:hidden;background:#173f29}.field canvas{position:absolute;inset:0;width:100%;height:100%}.viewtag{position:absolute;left:50%;top:18px;transform:translateX(-50%);z-index:6;background:#07131ed9;border:1px solid #526672;border-radius:20px;padding:7px 14px;font-size:10px;letter-spacing:.12em;color:#c4d0d7}.count,.pitchhud{position:absolute;top:18px;z-index:6;background:#07131ee8;border:1px solid #3b505d;border-radius:13px;padding:9px 12px;display:flex;gap:12px}.count{left:18px}.count b{font-size:11px;color:#a9b7c0}.count i{font-style:normal;color:#fff}.pitchhud{right:18px;align-items:baseline}.pitchhud b{font-size:18px}.pitchhud span{font-size:12px}.pitchhud small{color:#8ea0ab}.bat-zone{position:absolute;left:50%;top:51%;width:min(31vw,350px);height:min(39vw,430px);max-height:56%;transform:translate(-50%,-50%);z-index:4;pointer-events:none}.zone-grid{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);border:4px solid #fff;box-shadow:0 0 0 2px #0008,0 0 32px #0009}.zone-grid i{border:1px solid #ffffffb5;background:#ffffff08}.aim{position:absolute;left:50%;top:50%;width:min(42vw,500px);height:min(48vw,500px);transform:translate(-50%,-50%);z-index:7;display:none;touch-action:none}.aim>span{position:absolute;left:50%;bottom:-28px;transform:translateX(-50%);font-size:11px;white-space:nowrap;color:#e0e7eb;text-shadow:0 2px 5px #000}.release{position:absolute;width:22px;height:22px;border-radius:50%;left:50%;bottom:13%;transform:translate(-50%,50%);background:#fff;border:4px solid #42d37d;box-shadow:0 0 18px #42d37d}.target{position:absolute;width:30px;height:30px;border:3px solid #fff;border-radius:50%;left:50%;top:45%;transform:translate(-50%,-50%);box-shadow:0 0 15px #fff8}.target:after{content:"";position:absolute;inset:7px;border-radius:50%;background:#42d37d}.aimline{position:absolute;left:50%;bottom:13%;width:3px;height:32%;background:#42d37d;transform-origin:50% 100%;opacity:.8}.pitchControls{display:none;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}.pitchBtn{border:1px solid #455c69;background:#15232e;border-radius:11px;padding:10px 13px;cursor:pointer;color:#d8e2e7;font-weight:800}.pitchBtn.active{background:#248b53;border-color:#66e09a;box-shadow:0 0 14px #42d37d55}.msg{position:absolute;z-index:8;left:50%;bottom:18px;transform:translateX(-50%);text-align:center;text-shadow:0 2px 8px #000;width:80%}.msg b{display:block;font-size:21px}.msg small{display:block;color:#d0d9df;margin-top:5px;font-size:11px}.bb footer{height:84px;flex:0 0 84px;background:#0b151e;border-top:1px solid #2c3f4b;display:grid;grid-template-columns:1fr minmax(240px,420px) 1fr;align-items:center;gap:16px;padding:10px 22px;color:#8295a2;font-size:11px}.bb footer #pitchControls{grid-column:2}.bb footer #pitchControls:before{content:'AVAILABLE PITCHES';display:block;text-align:center;font-size:8px;color:#687d89;letter-spacing:.12em;margin-bottom:5px}.bb footer button#action{height:58px;border:1px solid #61df96;border-radius:15px;background:linear-gradient(#29b96b,#14733f);font-size:20px;font-weight:900;cursor:pointer;box-shadow:0 8px 24px #0006}.result{position:absolute;inset:0;background:#02070ddd;z-index:30;display:grid;place-items:center;opacity:0;pointer-events:none;transition:.2s}.result.show{opacity:1;pointer-events:auto}.result>div{width:min(500px,90%);padding:38px;border:1px solid #435664;border-radius:24px;background:#101c27;text-align:center;box-shadow:0 30px 90px #000b}.result strong{font-size:42px}.result p{color:#a6b4be;margin:12px 0 22px}.result button{border:0;border-radius:12px;padding:13px 30px;background:#49d47e;color:#07150c;font-weight:900}@media(max-width:700px){.bb header{height:60px;flex-basis:60px;padding:0 11px}.score{font-size:24px;gap:9px}.bb header b{font-size:12px}.count{top:8px;left:8px}.pitchhud{top:8px;right:8px}.viewtag{top:8px}.bat-zone{width:min(66vw,330px);height:min(70vw,370px)}.aim{width:78vw;height:72vw}.bb footer{height:96px;flex-basis:96px;grid-template-columns:1fr;padding:7px 10px}.bb footer #lefthelp{display:none}.bb footer #pitchControls{grid-column:1}.bb footer button#action{width:100%;height:56px}.pitchBtn{padding:8px 10px;font-size:11px}.msg{bottom:8px}}';
 root.prepend(s);
}

function q(x){return root.querySelector(x)}
function schedule(fn,ms){const id=setTimeout(fn,ms);timers.push(id)}
function resize(){if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0);draw()}

function bindAim(){
 const a=q('#aim');
 const point=e=>{const r=a.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
 a.addEventListener('pointerdown',e=>{if(state.half!=='bottom'||state.over||state.pitching||!state.selectedPitch)return;a.setPointerCapture(e.pointerId);state.drag=true;setAim(point(e));q('#msg').textContent=state.selectedPitch.name+' · 코스를 정하세요';q('#sub').textContent='손을 놓으면 그 코스로 투구합니다.'});
 a.addEventListener('pointermove',e=>{if(!state.drag)return;setAim(point(e))});
 a.addEventListener('pointerup',e=>{if(!state.drag)return;state.drag=false;const p=point(e);setAim(p);throwPitch(p.x,p.y)});
 a.addEventListener('pointercancel',()=>state.drag=false);
}

function setAim(xy){
 state.target={x:xy.x,y:xy.y};
 const t=q('#target'),l=q('#aimline');t.style.left=(xy.x*100)+'%';t.style.top=(xy.y*100)+'%';
 const sx=.5,sy=.87,dx=xy.x-sx,dy=xy.y-sy,dist=Math.sqrt(dx*dx+dy*dy);l.style.height=(Math.max(.08,dist)*100)+'%';l.style.transform='translate(-50%,0) rotate('+Math.atan2(dx,-dy)+'rad)';
}

function renderPitchButtons(){
 const box=q('#pitchControls');box.innerHTML='';
 state.available.forEach((p,i)=>{const b=document.createElement('button');b.className='pitchBtn';b.textContent=p.name;b.title=p.speed+' km/h';b.onclick=()=>{if(state.half!=='bottom'||state.pitching)return;state.selectedPitch=p;root.querySelectorAll('.pitchBtn').forEach(x=>x.classList.remove('active'));b.classList.add('active');q('#pname').textContent=p.name;q('#pspeed').textContent=p.speed+' km/h';q('#msg').textContent=p.name+' 선택';q('#sub').textContent='중앙의 릴리스 지점에서 원하는 코스로 드래그';};box.appendChild(b)});
}

function pitch(){
 if(!state||state.over||state.transition||state.pitching)return;
 if(state.half==='bottom'){q('#msg').textContent='구종을 선택하세요';q('#sub').textContent='옆 버튼에서 구종을 고른 뒤 드래그';return}
 const p=state.available[Math.floor(Math.random()*state.available.length)];
 const z={x:(Math.floor(Math.random()*3)+.5)/3,y:(Math.floor(Math.random()*3)+.5)/3};
 state.pitch={...p,progress:0,start:performance.now(),speed:p.speed+Math.floor(Math.random()*7-3),zone:z};state.pitching=true;
 q('#pname').textContent=p.name;q('#pspeed').textContent=state.pitch.speed+' km/h';q('#pstate').textContent='AI 투수';q('#msg').textContent='투구!';q('#sub').textContent='공을 끝까지 보고 타격';
 raf=requestAnimationFrame(tick);
}

function throwPitch(x,y){
 if(!state.selectedPitch||state.pitching||state.over)return;
 state.pitch={...state.selectedPitch,progress:0,start:performance.now(),speed:state.selectedPitch.speed+Math.floor(Math.random()*5-2),zone:{x,y}};state.pitching=true;
 q('#pname').textContent=state.pitch.name;q('#pspeed').textContent=state.pitch.speed+' km/h';q('#pstate').textContent='HUMAN 투수';q('#msg').textContent='투구!';q('#sub').textContent='AI 타자의 타이밍을 기다리는 중';
 raf=requestAnimationFrame(tick);
}

function tick(t){
 if(!state||!state.pitching)return;
 const dur=Math.max(520,940-(state.pitch.speed-115)*2.7);state.pitch.progress=Math.min(1,(t-state.pitch.start)/dur);draw();
 if(state.pitch.progress>=1){state.pitching=false;if(state.half==='top')missPitch();else aiSwing()}else raf=requestAnimationFrame(tick);
}

function action(){
 if(!state||state.over||state.transition)return;
 if(state.half==='top'){if(!state.pitching)return;const p=state.pitch.progress;state.pitching=false;cancelAnimationFrame(raf);swingResult(Math.max(0,1-Math.abs(p-.74)/.25));}
 else {q('#sub').textContent='구종을 선택하고 릴리스 지점에서 드래그하세요';}
}

function missPitch(){
 const z=state.pitch.zone;const strike=z.x>.18&&z.x<.82&&z.y>.18&&z.y<.82;
 if(strike){state.strikes++;announce('STRIKE','스트라이크 존에 꽂혔습니다.')}else{state.balls++;announce('BALL','존을 벗어났습니다.')}
 if(state.strikes>=3)return makeOut('삼진');if(state.balls>=4)return walk();schedule(pitch,650);update();
}
function swingResult(v){
 if(v<.27){state.strikes++;announce('헛스윙','타이밍을 놓쳤습니다.');if(state.strikes>=3)return makeOut('삼진');return schedule(pitch,600)}
 const r=Math.random();let hit='1B';if(v>.94&&r<.4)hit='HR';else if(v>.84&&r<.45)hit='2B';else if(r<.22)hit='FO';applyHit(hit,v);
}
function aiSwing(){
 const contact=Math.random();if(contact<.3)return makeOut('AI 헛스윙');if(contact<.52){state.strikes++;announce('AI STRIKE','AI 타자의 타이밍이 늦었습니다.');if(state.strikes>=3)return makeOut('AI 삼진');return schedule(pitch,600)}const r=Math.random();const hit=r<.08?'HR':r<.3?'2B':r<.68?'1B':'FO';if(hit==='FO')return makeOut('AI 뜬공 아웃');applyHit(hit,.75);
}
function applyHit(hit,v){state.balls=0;state.strikes=0;if(hit==='FO')return makeOut('뜬공 아웃');const n=hit==='HR'?4:hit==='2B'?2:1;advance(n);announce(hit==='HR'?'HOME RUN!':hit==='2B'?'2루타!':'안타!',v>.86?'완벽한 타이밍!':'좋은 타구입니다.');schedule(pitch,800);update()}
function advance(n){if(n===4){run();state.bases=[0,0,0];return}const old=state.bases.slice();state.bases=[0,0,0];for(let i=2;i>=0;i--)if(old[i]){const d=i+n;if(d>=3)run();else state.bases[d]=1}state.bases[n-1]=1}
function walk(){state.balls=0;state.strikes=0;const b=state.bases.slice();if(b[0]&&b[1]&&b[2])run();state.bases=[1,b[0]?1:0,b[0]&&b[1]?1:b[2]];announce('볼넷','타자가 1루로 진루합니다.');schedule(pitch,700);update()}
function run(){if(state.half==='top'){state.human++;q('#hs').textContent=state.human}else{state.ai++;q('#as').textContent=state.ai}}
function makeOut(text){state.outs++;state.balls=0;state.strikes=0;state.pitch=null;announce(text,'아웃 '+state.outs+'개');if(state.outs>=3)return schedule(changeHalf,900);schedule(pitch,700)}
function changeHalf(){
 state.transition=true;state.pitching=false;state.balls=0;state.strikes=0;state.outs=0;state.bases=[0,0,0];state.pitch=null;
 if(state.half==='top'){
  state.half='bottom';state.available=randomPitches();state.selectedPitch=state.available[0];q('#hrole').textContent='PITCHER';q('#arole').textContent='BATTER';q('#half').textContent='말';q('#action').style.display='none';q('#pitchControls').style.display='flex';q('#aim').style.display='block';q('#batZone').style.display='none';q('#viewtag').textContent='SHORTSTOP VIEW';q('#lefthelp').textContent='구종 선택 후 드래그';q('#msg').textContent='공수교대!';q('#sub').textContent='구종을 선택하고 코스를 드래그하세요';renderPitchButtons();root.querySelectorAll('.pitchBtn')[0]?.classList.add('active');
 }else{state.half='done';finish();return}
 state.transition=false;update();schedule(()=>draw(),100);
}
function finish(){state.over=true;q('#rtitle').textContent=state.human>state.ai?'HUMAN WIN':state.human<state.ai?'AI WIN':'DRAW';q('#rtext').textContent='1이닝 최종 스코어  HUMAN '+state.human+' : '+state.ai+' AI';q('#result').classList.add('show')}
function reset(){
 timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);q('#result').classList.remove('show');
 state={half:'top',outs:0,balls:0,strikes:0,human:0,ai:0,bases:[0,0,0],pitch:null,pitching:false,selectedPitch:null,available:randomPitches(),target:{x:.5,y:.5},drag:false,over:false,transition:false};
 q('#hs').textContent='0';q('#as').textContent='0';q('#hrole').textContent='BATTER';q('#arole').textContent='PITCHER';q('#half').textContent='초';q('#action').textContent='SWING';q('#action').style.display='block';q('#pitchControls').style.display='none';q('#aim').style.display='none';q('#batZone').style.display='block';q('#viewtag').textContent='CATCHER VIEW';renderPitchButtons();update();schedule(pitch,700);
}
function announce(a,b){q('#msg').textContent=a;q('#sub').textContent=b;update()}
function update(){if(!state)return;q('#out').textContent=state.outs;q('#cnt').textContent=state.balls+' - '+state.strikes}

function draw(){
 if(!ctx||!canvas)return;const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#122c22');g.addColorStop(.5,'#23613a');g.addColorStop(1,'#092015');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 if(state&&state.half==='bottom')drawPitcherView(w,h);else drawBatterView(w,h);
 if(state&&state.pitching)drawBall(w,h);
}

function drawBatterView(w,h){
 const cx=w*.5,base=h*.9,mound=h*.43;
 ctx.fillStyle='#b28a61';ctx.beginPath();ctx.ellipse(cx,base,w*.15,h*.055,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d5b487';ctx.beginPath();ctx.moveTo(cx-w*.09,base);ctx.lineTo(cx+w*.09,base);ctx.lineTo(cx+w*.055,base-h*.06);ctx.lineTo(cx-w*.055,base-h*.06);ctx.closePath();ctx.fill();
 ctx.fillStyle='#bd8d5e';ctx.beginPath();ctx.ellipse(cx,mound,w*.065,h*.028,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e8edf0';ctx.beginPath();ctx.arc(cx,mound-h*.025,8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d7ddd9';ctx.beginPath();ctx.ellipse(cx,h*.34,w*.035,h*.055,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#14231b';ctx.fillRect(cx-w*.025,h*.28,w*.05,h*.09);
 ctx.fillStyle='#e7e0d1';ctx.beginPath();ctx.ellipse(cx,base-h*.035,w*.045,h*.012,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#f5f2e9';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,base);ctx.lineTo(cx-w*.06,base-h*.035);ctx.moveTo(cx,base);ctx.lineTo(cx+w*.06,base-h*.035);ctx.stroke();
 drawCrowd(w,h);drawLines(w,h,cx,base);
}
function drawPitcherView(w,h){
 const homeX=w*.67,homeY=h*.78,moundX=w*.45,moundY=h*.44;
 ctx.fillStyle='#b8895e';ctx.beginPath();ctx.ellipse(homeX,homeY,w*.12,h*.045,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e8ddca';ctx.beginPath();ctx.moveTo(homeX,homeY);ctx.lineTo(homeX+w*.04,homeY-h*.035);ctx.lineTo(homeX,homeY-h*.065);ctx.lineTo(homeX-w*.04,homeY-h*.035);ctx.closePath();ctx.fill();
 ctx.fillStyle='#b8895e';ctx.beginPath();ctx.ellipse(moundX,moundY,w*.065,h*.025,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#e8edf0';ctx.beginPath();ctx.arc(moundX,moundY-h*.025,8,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d6ddd8';ctx.beginPath();ctx.ellipse(homeX,homeY-h*.09,w*.028,h*.045,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#18231d';ctx.fillRect(homeX-w*.025,homeY-h*.15,w*.05,h*.08);
 ctx.fillStyle='#d7a36d';ctx.beginPath();ctx.ellipse(homeX-w*.065,homeY-h*.06,w*.035,h*.015,-.25,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#e6e1d6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(homeX,homeY);ctx.lineTo(homeX-w*.06,homeY-h*.035);ctx.moveTo(homeX,homeY);ctx.lineTo(homeX+w*.06,homeY-h*.035);ctx.stroke();
 drawCrowd(w,h);drawInfieldPerspective(w,h,moundX,moundY,homeX,homeY);
}
function drawLines(w,h,cx,base){ctx.strokeStyle='#e7eadf88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx,base);ctx.lineTo(w*.05,h*.13);ctx.moveTo(cx,base);ctx.lineTo(w*.95,h*.13);ctx.stroke()}
function drawInfieldPerspective(w,h,mx,my,hx,hy){ctx.strokeStyle='#dce4dc77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(hx,hy);ctx.moveTo(mx,my);ctx.lineTo(w*.18,h*.7);ctx.stroke()}
function drawCrowd(w,h){ctx.fillStyle='#1b2930';ctx.fillRect(0,h*.05,w,h*.12);for(let x=0;x<w;x+=22){ctx.fillStyle=x%44?'#2e4048':'#43555d';ctx.fillRect(x,h*.08,14,7)}}
function drawBall(w,h){
 const p=state.pitch.progress,z=state.pitch.zone||{x:.5,y:.5};let x,y;
 if(state.half==='top'){const start={x:w*.5,y:h*.42};const end={x:w*(.5+(z.x-.5)*.2),y:h*(.76+(z.y-.5)*.08)};const k=p*p;x=start.x+(end.x-start.x)*k;y=start.y+(end.y-start.y)*k;const r=5+p*12;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d74b4b';ctx.lineWidth=1;ctx.stroke()}
 else {const start={x:w*.45,y:h*.42};const end={x:w*.67+(z.x-.5)*w*.16,y:h*.72+(z.y-.5)*h*.10};const k=p*p;x=start.x+(end.x-start.x)*k;y=start.y+(end.y-start.y)*k;const r=5+p*12;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d74b4b';ctx.stroke()}
}

export function destroy(){
 timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);raf=0;
 if(keydownHandler)window.removeEventListener('keydown',keydownHandler);
 if(resizeHandler)window.removeEventListener('resize',resizeHandler);
 if(root)root.innerHTML='';root=null;canvas=null;ctx=null;state=null;keydownHandler=null;resizeHandler=null;
}
