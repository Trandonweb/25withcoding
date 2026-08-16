let root=null,canvas=null,ctx=null,raf=0,timers=[],keydownHandler=null,resizeHandler=null,state=null;

const PITCHES=[
 {kr:'포심',speed:148,move:0,drop:0},
 {kr:'투심',speed:143,move:1,drop:5},
 {kr:'커터',speed:139,move:-1,drop:3},
 {kr:'슬라이더',speed:132,move:-2,drop:10},
 {kr:'커브',speed:120,move:2,drop:24},
 {kr:'포크',speed:128,move:1,drop:17}
];

export function openBaseball(container){
 destroy();
 root=container;
 root.innerHTML='<div class="bb">'+
 '<header class="bbtop"><div class="side human">HUMAN<small>타자 / 투수</small></div><div class="score"><b id="hs">0</b><span>1 INNING</span><b id="as">0</b></div><div class="side ai">AI<small>상대팀</small></div></header>'+
 '<div class="phase" id="phase">1회 초 · HUMAN 공격</div>'+
 '<main class="field"><canvas id="bbCanvas"></canvas>'+
 '<div class="count"><b>OUT <em id="out">0</em></b><b>COUNT <em id="cnt">0-0</em></b></div>'+
 '<div class="pitchHud"><b id="pitchName">READY</b><span><i id="speed">---</i> km/h</span><span id="pitchState">준비</span></div>'+ 
 '<div class="zoneWrap"><div class="zoneTitle">STRIKE ZONE</div><div class="zone" id="zone">'+[0,1,2,3,4,5,6,7,8].map(i=>'<button data-zone="'+i+'"></button>').join('')+'</div></div>'+ 
 '<div class="message"><strong id="playText">타석에 들어섭니다.</strong><span id="subText">스트라이크 존을 보고 투구를 기다리세요.</span></div>'+ 
 '<div class="result" id="result"><div><h2 id="resultTitle"></h2><p id="resultText"></p><button id="again">다시 플레이</button></div></div>'+ 
 '</main>'+ 
 '<footer class="controls"><button class="swing" id="swing">⚾ SWING</button><button class="pitchBtn" id="pitchBtn">🎯 투구</button><span id="controlHint">SPACE로 타격 · HUMAN 공격</span></footer>'+ 
 '</div>';
 canvas=root.querySelector('#bbCanvas'); ctx=canvas.getContext('2d');
 state={half:'top',outs:0,balls:0,strikes:0,human:0,ai:0,bases:[0,0,0],pitch:null,pitching:false,over:false,selectedZone:4,canPitch:false,hit:null};
 root.querySelector('#swing').onclick=swing;
 root.querySelector('#again').onclick=resetGame;
 root.querySelector('#pitchBtn').onclick=humanPitch;
 root.querySelectorAll('[data-zone]').forEach(btn=>btn.onclick=()=>selectZone(Number(btn.dataset.zone)));
 keydownHandler=e=>{if(e.code==='Space'){e.preventDefault(); if(state&&state.half==='top') swing(); else humanPitch();}};
 window.addEventListener('keydown',keydownHandler);
 resizeHandler=resize; window.addEventListener('resize',resizeHandler);
 resize(); update(); schedule(startTop,500);
}

function css(){return '.bb{height:100%;min-height:620px;background:#071019;color:#eef5f8;font-family:Arial,Pretendard,sans-serif;display:flex;flex-direction:column;overflow:hidden}.bbtop{height:64px;flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 20px;background:linear-gradient(#172633,#0a141d);border-bottom:1px solid #304451}.side{font-size:15px;font-weight:900;letter-spacing:.08em}.side small{display:block;font-size:9px;color:#7d909e;margin-top:3px;letter-spacing:0}.side.ai{text-align:right}.score{display:flex;align-items:center;gap:14px;font-size:28px}.score span{font-size:9px;color:#6e8593;letter-spacing:.12em}.phase{text-align:center;background:#10202b;border-bottom:1px solid #283c49;padding:8px;font-weight:800;font-size:12px;color:#9fe0b8}.field{position:relative;flex:1;min-height:460px;overflow:hidden;background:#123d26}.field canvas{position:absolute;inset:0;width:100%;height:100%}.count,.pitchHud{position:absolute;z-index:4;top:14px;background:#06121ce8;border:1px solid #3a4e5b;border-radius:11px;padding:9px 11px}.count{left:14px;display:flex;gap:10px}.count b{font-size:10px;color:#8fa4b1}.count em{font-style:normal;color:#fff;margin-left:4px}.pitchHud{right:14px;display:flex;gap:8px;align-items:baseline}.pitchHud b{font-size:16px}.pitchHud span{font-size:10px;color:#91a5b1}.pitchHud i{font-style:normal;color:#fff}.zoneWrap{position:absolute;z-index:4;left:50%;top:55%;transform:translate(-50%,-50%);width:min(230px,30vw);min-width:190px}.zoneTitle{text-align:center;font-size:9px;font-weight:900;letter-spacing:.18em;color:#dce7ec;margin-bottom:5px;text-shadow:0 2px 4px #000}.zone{aspect-ratio:1.05;display:grid;grid-template-columns:repeat(3,1fr);border:3px solid #f5f7f8;background:#ffffff18;box-shadow:0 0 0 1px #0008,0 8px 30px #0007}.zone button{border:1px solid #ffffff65;background:#ffffff08;cursor:pointer}.zone button:hover,.zone button.selected{background:#49d47e44}.message{position:absolute;z-index:5;left:50%;bottom:16px;transform:translateX(-50%);width:min(92%,650px);text-align:center;text-shadow:0 2px 6px #000}.message strong{display:block;font-size:20px}.message span{display:block;color:#c2d0d8;font-size:11px;margin-top:4px}.controls{height:82px;flex:none;display:flex;justify-content:center;align-items:center;gap:12px;padding:10px 15px;background:#0a151e;border-top:1px solid #293d4a}.controls button{height:56px;border-radius:14px;font-weight:900;cursor:pointer}.swing{width:min(390px,48%);border:1px solid #66df98;background:linear-gradient(#29b86c,#14713d);color:#fff;font-size:18px}.pitchBtn{width:min(180px,24%);border:1px solid #7891a0;background:linear-gradient(#314755,#1b2b36);color:#fff;font-size:14px}.controls span{font-size:10px;color:#778c99}.result{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#02070ddf;opacity:0;pointer-events:none}.result.show{opacity:1;pointer-events:auto}.result>div{width:min(430px,90%);padding:30px;border-radius:22px;background:#111f2a;border:1px solid #405462;text-align:center;box-shadow:0 25px 70px #000b}.result h2{font-size:36px;margin:0 0 8px}.result p{color:#a4b3bd}.result button{border:0;border-radius:12px;padding:12px 26px;background:#49d47e;font-weight:900}@media(max-width:700px){.bbtop{height:58px;padding:0 10px}.score{font-size:22px;gap:8px}.score span{font-size:8px}.side{font-size:12px}.field{min-height:500px}.zoneWrap{width:210px;min-width:170px;top:50%}.pitchHud{right:8px;top:8px}.count{left:8px;top:8px}.controls{height:76px}.controls span{display:none}.swing{width:55%}.pitchBtn{width:35%}}';}

function q(s){return root?root.querySelector(s):null;}
function schedule(fn,ms){const id=setTimeout(fn,ms);timers.push(id);}
function resize(){if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.floor(r.width*d));canvas.height=Math.max(1,Math.floor(r.height*d));ctx.setTransform(d,0,0,d,0,0);draw();}

function startTop(){state.half='top';state.outs=0;state.balls=0;state.strikes=0;state.bases=[0,0,0];state.canPitch=false;state.pitching=false;update();announce('1회 초 · HUMAN 공격','AI 투수가 투구합니다. 공이 존에 들어오는 순간 SWING!');schedule(pitch,800);}

function selectZone(i){if(!state||state.half!=='bottom'||state.pitching||state.over)return;state.selectedZone=i;root.querySelectorAll('[data-zone]').forEach((b,n)=>b.classList.toggle('selected',n===i));announce('투구 코스 선택','선택한 스트라이크 존으로 투구합니다.');}

function pitch(){if(!state||state.over||state.half!=='top')return;const p=PITCHES[Math.floor(Math.random()*PITCHES.length)];state.pitch={...p,zone:Math.floor(Math.random()*9),progress:0,start:performance.now(),speed:p.speed+Math.floor(Math.random()*7-3)};state.pitching=true;q('#pitchName').textContent=p.kr;q('#speed').textContent=state.pitch.speed;q('#pitchState').textContent='투구 중';q('#playText').textContent='투구!';q('#subText').textContent='스트라이크 존을 보고 타이밍을 맞추세요.';raf=requestAnimationFrame(tick);}

function humanPitch(){if(!state||state.over||state.half!=='bottom'||state.pitching)return;const p=PITCHES[Math.floor(Math.random()*PITCHES.length)];state.pitch={...p,zone:state.selectedZone,progress:0,start:performance.now(),speed:p.speed+Math.floor(Math.random()*7-3),ai:true};state.pitching=true;q('#pitchName').textContent=p.kr;q('#speed').textContent=state.pitch.speed;q('#pitchState').textContent='투구 중';q('#playText').textContent='AI 타자에게 투구!';q('#subText').textContent='AI의 타격 타이밍을 지켜보세요.';raf=requestAnimationFrame(tickAI);}

function tick(t){if(!state||!state.pitching||state.half!=='top')return;const duration=Math.max(560,930-(state.pitch.speed-115)*2.4);state.pitch.progress=Math.min(1,(t-state.pitch.start)/duration);draw();if(state.pitch.progress>=1){state.pitching=false;resolvePitch(false);return;}raf=requestAnimationFrame(tick);}
function tickAI(t){if(!state||!state.pitching||state.half!=='bottom')return;const duration=Math.max(560,930-(state.pitch.speed-115)*2.4);state.pitch.progress=Math.min(1,(t-state.pitch.start)/duration);draw();if(state.pitch.progress>.67&&!state.pitch.aiSwung){state.pitch.aiSwung=true;const chance=.42+(state.pitch.zone===4?.18:0)+(state.pitch.kr==='커브'?.08:0);if(Math.random()<chance){const quality=.55+Math.random()*.43;state.pitching=false;resolveSwing(quality,true);return;}}if(state.pitch.progress>=1){state.pitching=false;resolvePitch(true);return;}raf=requestAnimationFrame(tickAI);}

function swing(){if(!state||state.over||state.half!=='top'||!state.pitching)return;const p=state.pitch.progress;const quality=Math.max(0,1-Math.abs(p-.72)/.24);state.pitching=false;cancelAnimationFrame(raf);resolveSwing(quality,false);}

function resolvePitch(aiBat){if(Math.random()<.38){state.strikes++;announce('STRIKE','공이 스트라이크 존을 통과했습니다.');if(state.strikes>=3){out(aiBat?'AI 삼진':'삼진 아웃');return;}}else{state.balls++;announce('BALL','존을 벗어난 공입니다.');if(state.balls>=4){walk(aiBat);return;}}schedule(aiBat?humanPitch:pitch,650);update();}

function resolveSwing(quality,aiBat){if(quality<.28){state.strikes++;announce(aiBat?'AI 헛스윙':'헛스윙','타이밍이 크게 어긋났습니다.');if(state.strikes>=3){out(aiBat?'AI 삼진':'삼진 아웃');return;}schedule(aiBat?humanPitch:pitch,650);return;}const r=Math.random();let hit='1B';if(quality>.94&&r<.30)hit='HR';else if(quality>.84&&r<.35)hit='3B';else if(quality>.67&&r<.48)hit='2B';else if(quality<.45&&r<.34)hit='FO';else if(quality<.54&&r<.50)hit='GO';applyHit(hit,quality,aiBat);}

function applyHit(hit,quality,aiBat){state.balls=0;state.strikes=0;if(hit==='FO'||hit==='GO'){out(aiBat?(hit==='FO'?'AI 뜬공 아웃':'AI 땅볼 아웃'):(hit==='FO'?'뜬공 아웃':'땅볼 아웃'));return;}const n=hit==='HR'?4:hit==='3B'?3:hit==='2B'?2:1;advance(n,aiBat);const title=hit==='HR'?'HOME RUN!':hit==='3B'?'3루타!':hit==='2B'?'2루타!':'안타!';announce((aiBat?'AI ':'')+title,quality>.86?'완벽한 타이밍!':'좋은 컨택입니다.');state.hit={type:hit,start:performance.now(),ai:aiBat};raf=requestAnimationFrame(hitAnim);update();schedule(aiBat?humanPitch:pitch,900);}

function advance(n,aiBat){if(n===4){scoreRun(aiBat);state.bases=[0,0,0];return;}const old=state.bases.slice();state.bases=[0,0,0];for(let i=2;i>=0;i--){if(!old[i])continue;const dest=i+n;if(dest>=3)scoreRun(aiBat);else state.bases[dest]=1;}state.bases[n-1]=1;}
function walk(aiBat){state.balls=0;state.strikes=0;const b=state.bases.slice();if(b[0]&&b[1]&&b[2])scoreRun(aiBat);state.bases=[1,b[0]?1:0,b[0]&&b[1]?1:b[2]];announce(aiBat?'AI 볼넷':'볼넷','타자가 1루로 진루합니다.');schedule(aiBat?humanPitch:pitch,750);update();}

function out(text){state.outs++;state.balls=0;state.strikes=0;state.pitch=null;announce(text,'아웃 카운트 '+state.outs+'개');if(state.outs>=3){schedule(endHalf,850);return;}schedule(state.half==='top'?pitch:humanPitch,800);update();}

function endHalf(){if(state.half==='top'){state.half='bottom';state.outs=0;state.balls=0;state.strikes=0;state.bases=[0,0,0];state.pitch=null;state.pitching=false;update();announce('1회 말 · AI 공격','이제 HUMAN이 투수입니다. 스트라이크 존을 클릭해 코스를 정하고 투구하세요.');q('#swing').style.display='none';q('#pitchBtn').style.display='block';q('#controlHint').textContent='존을 선택하고 투구 · AI가 자동 타격';root.querySelectorAll('[data-zone]').forEach((b,n)=>b.classList.toggle('selected',n===4));schedule(humanPitch,1000);return;}finish();}

function scoreRun(aiBat){if(aiBat){state.ai++;q('#as').textContent=state.ai;}else{state.human++;q('#hs').textContent=state.human;}}
function update(){if(!state)return;q('#out').textContent=state.outs;q('#cnt').textContent=state.balls+'-'+state.strikes;q('#phase').textContent=state.half==='top'?'1회 초 · HUMAN 공격':'1회 말 · AI 공격';}
function announce(a,b){q('#playText').textContent=a;q('#subText').textContent=b;update();}
function hitAnim(t){if(!state||!state.hit)return;draw();if(t-state.hit.start<850)raf=requestAnimationFrame(hitAnim);else state.hit=null;}

function finish(){state.over=true;state.pitching=false;cancelAnimationFrame(raf);const title=state.human>state.ai?'HUMAN WIN!':state.human<state.ai?'AI WIN!':'DRAW!';q('#resultTitle').textContent=title;q('#resultText').textContent='1이닝 종료 · HUMAN '+state.human+' : '+state.ai+' AI';q('#result').classList.add('show');}
function resetGame(){timers.forEach(clearTimeout);timers=[];q('#result').classList.remove('show');q('#swing').style.display='block';q('#pitchBtn').style.display='none';q('#controlHint').textContent='SPACE로 타격 · HUMAN 공격';state={half:'top',outs:0,balls:0,strikes:0,human:0,ai:0,bases:[0,0,0],pitch:null,pitching:false,over:false,selectedZone:4,canPitch:false,hit:null};q('#hs').textContent='0';q('#as').textContent='0';startTop();}

function draw(){if(!ctx||!canvas||!state)return;const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#102c1d');g.addColorStop(.46,'#27653b');g.addColorStop(1,'#0a2517');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);drawStadium(w,h);drawDiamond(w,h);drawPlayers(w,h);drawBases(w,h);drawStrikeZone(w,h);if(state.pitching)drawBall(w,h);if(state.hit)drawHit(w,h);}
function drawStadium(w,h){ctx.fillStyle='#151f27';ctx.fillRect(0,h*.07,w,h*.16);ctx.fillStyle='#263640';for(let x=0;x<w;x+=18){ctx.fillRect(x,h*.10,12,5);ctx.fillRect(x+5,h*.145,9,5);}ctx.fillStyle='#e9f0f2';for(let i=0;i<55;i++){const x=(i*83)%Math.max(1,w);ctx.beginPath();ctx.arc(x,h*.055+(i%3)*3,1.6,0,Math.PI*2);ctx.fill();}}
function drawDiamond(w,h){ctx.fillStyle='#bca678';ctx.beginPath();ctx.moveTo(w*.5,h*.46);ctx.lineTo(w*.17,h*1.03);ctx.lineTo(w*.83,h*1.03);ctx.closePath();ctx.fill();ctx.fillStyle='#2d6c3d';ctx.beginPath();ctx.moveTo(w*.5,h*.50);ctx.lineTo(w*.27,h*.96);ctx.lineTo(w*.73,h*.96);ctx.closePath();ctx.fill();ctx.fillStyle='#d5bd8b';ctx.beginPath();ctx.arc(w*.5,h*.70,Math.min(w,h)*.095,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(w*.485,h*.84,w*.03,6);}
function drawPlayers(w,h){const ai=state.half==='top';drawPerson(w*.5,h*.43,ai?'#334a59':'#263b4b',1.1);drawPerson(w*.38,h*.82,ai?'#263b4b':'#334a59',.9);}
function drawPerson(x,y,jersey,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='#202a31';ctx.beginPath();ctx.arc(0,0,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d6aa85';ctx.beginPath();ctx.arc(0,-2,7,0,Math.PI*2);ctx.fill();ctx.fillStyle=jersey;ctx.fillRect(-10,9,20,31);ctx.strokeStyle='#d6aa85';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-7,15);ctx.lineTo(-13,28);ctx.moveTo(7,15);ctx.lineTo(13,28);ctx.stroke();ctx.fillStyle='#202a31';ctx.fillRect(-10,39,7,20);ctx.fillRect(3,39,7,20);ctx.restore();}
function drawBases(w,h){const pts=[[w*.5,h*.84],[w*.35,h*.70],[w*.65,h*.70]];for(let i=0;i<3;i++){ctx.save();ctx.translate(pts[i][0],pts[i][1]);ctx.rotate(Math.PI/4);ctx.fillStyle=state.bases[i]?'#49d47e':'#f1f3f3';ctx.fillRect(-7,-7,14,14);ctx.restore();}}
function drawStrikeZone(w,h){const zw=Math.min(230,w*.30),zh=zw*.92,x=w/2-zw/2,y=h*.49-zh/2;ctx.fillStyle='#ffffff0b';ctx.fillRect(x,y,zw,zh);ctx.strokeStyle='#ffffffcc';ctx.lineWidth=2;ctx.strokeRect(x,y,zw,zh);ctx.strokeStyle='#ffffff55';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+zw/3,y);ctx.lineTo(x+zw/3,y+zh);ctx.moveTo(x+2*zw/3,y);ctx.lineTo(x+2*zw/3,y+zh);ctx.moveTo(x,y+zh/3);ctx.lineTo(x+zw,y+zh/3);ctx.moveTo(x,y+2*zh/3);ctx.lineTo(x+zw,y+2*zh/3);ctx.stroke();}
function drawBall(w,h){const p=state.pitch.progress;const sx=w*.5,sy=h*.43,ex=w*.5,ey=h*.84;const x=sx+(ex-sx)*p+Math.sin(p*Math.PI)*state.pitch.move*w*.025;const y=sy+(ey-sy)*p-state.pitch.drop*Math.sin(p*Math.PI);const r=3+10*p;ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=12;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#c44';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*.7,0,Math.PI);ctx.stroke();}
function drawHit(w,h){const a=(performance.now()-state.hit.start)/850;const dx=state.hit.type==='HR'?w*.32:state.hit.type==='3B'?w*.22:w*.14;const dir=state.hit.ai?-1:1;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.globalAlpha=Math.max(0,1-a);ctx.beginPath();ctx.moveTo(w*.5,h*.83);ctx.lineTo(w*.5+dir*dx*a,h*.83-h*.40*a);ctx.stroke();ctx.globalAlpha=1;}

export function destroy(){timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);if(keydownHandler)window.removeEventListener('keydown',keydownHandler);if(resizeHandler)window.removeEventListener('resize',resizeHandler);root=null;canvas=null;ctx=null;state=null;keydownHandler=null;resizeHandler=null;}
