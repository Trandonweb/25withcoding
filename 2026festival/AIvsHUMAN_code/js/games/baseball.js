let root=null,canvas=null,ctx=null,raf=0,timers=[],keydownHandler=null,resizeHandler=null,state=null;

const PITCHES=[
 {name:'포심',speed:151,dx:0,dy:0},
 {name:'투심',speed:146,dx:.07,dy:.02},
 {name:'슬라이더',speed:137,dx:-.15,dy:.025},
 {name:'커브',speed:123,dx:-.08,dy:.10},
 {name:'포크',speed:131,dx:.045,dy:.11}
];

export function openBaseball(container){
 destroy();
 root=container;
 root.innerHTML=`
 <div class="baseball">
  <canvas id="stadium"></canvas>
  <div class="broadcast-top">
   <div class="scoreboard">
    <div class="club"><small>AWAY</small><b>AI TIGERS</b><strong id="aiScore">0</strong></div>
    <div class="inning-box"><small>INNING</small><strong id="inning">7</strong><span id="half">▲</span></div>
    <div class="club home"><strong id="humanScore">0</strong><b>SCREEN</b><small>HOME</small></div>
   </div>
   <div class="count-box"><b>B</b><i id="balls">0</i><b>S</b><i id="strikes">0</i><b>O</b><i id="outs">0</i></div>
   <div class="base-diamond"><i id="base2"></i><i id="base3"></i><i id="base1"></i><i class="home"></i></div>
  </div>

  <div class="live"><span></span> LIVE · 7회</div>
  <div class="pitch-card"><small id="pitchRole">AI PITCHER</small><b id="pitchName">READY</b><em id="pitchSpeed">—</em></div>

  <div class="zone-wrap" id="zoneWrap">
   <div class="zone-shadow"></div><div class="zone" id="zone">${'<button></button>'.repeat(9)}</div>
   <div class="aim" id="aim"></div>
  </div>

  <div class="batter-label"><small>BATTER</small><b>SCREEN #04</b><span>R · .333 · HR 03</span></div>
  <div class="message"><b id="message">7회초 · 타석에 들어섭니다</b><small id="submessage">투수가 공을 던지면 타이밍을 맞춰 스윙하세요</small></div>

  <div class="pitch-select" id="pitchSelect"></div>
  <button class="swing" id="swing">SWING <small>SPACE</small></button>
  <div class="result-banner" id="resultBanner"><b id="resultTitle"></b><span id="resultText"></span></div>
  <div class="pause" id="pause">PAUSED</div>
 </div>`;
 addStyle();
 canvas=root.querySelector('#stadium'); ctx=canvas.getContext('2d');
 state={inning:7,half:'top',outs:0,balls:0,strikes:0,ai:0,human:0,bases:[0,0,0],pitch:null,pitching:false,swingReady:false,selected:0,aim:{x:.5,y:.5},over:false,paused:false};
 bind(); resize(); renderPitchSelect(); updateHud();
 schedule(()=>pitch(),700);
}

function bind(){
 root.querySelector('#swing').onclick=swing;
 root.querySelectorAll('#zone button').forEach((b,i)=>b.onclick=()=>selectAim(i));
 keydownHandler=e=>{if(e.code==='Space'){e.preventDefault();swing()}if(e.code==='KeyP')togglePause()};
 window.addEventListener('keydown',keydownHandler);
 resizeHandler=resize;window.addEventListener('resize',resizeHandler);
}

function addStyle(){
 const s=document.createElement('style');
 s.textContent=`
 *{box-sizing:border-box}.baseball{position:relative;width:100%;height:100dvh;overflow:hidden;background:#071018;color:#f5f8fa;font-family:Inter,Pretendard,"Noto Sans KR",Arial,sans-serif;user-select:none}.baseball canvas{position:absolute;inset:0;width:100%;height:100%}
 .broadcast-top{position:absolute;z-index:10;top:0;left:0;right:0;height:86px;padding:11px 22px;display:flex;justify-content:center;align-items:flex-start;background:linear-gradient(180deg,#050b10f5 0%,#071018d0 62%,transparent 100%);pointer-events:none}.scoreboard{width:min(620px,62vw);height:57px;display:grid;grid-template-columns:1fr 86px 1fr;background:#0a1219ed;border:1px solid #ffffff20;box-shadow:0 8px 30px #0008;border-radius:7px;overflow:hidden}.club{display:grid;grid-template-columns:1fr auto;align-items:center;padding:0 14px;gap:12px}.club small{grid-column:1/2;color:#65757e;font-size:7px;letter-spacing:.16em}.club b{grid-column:1/2;font-size:11px;letter-spacing:.04em}.club strong{grid-column:2;grid-row:1/3;font-size:25px}.club.home{text-align:right}.club.home small{grid-column:2}.club.home b{grid-column:2}.club.home strong{grid-column:1;grid-row:1/3}.inning-box{text-align:center;border-left:1px solid #ffffff16;border-right:1px solid #ffffff16;padding-top:7px}.inning-box small{display:block;color:#63737d;font-size:7px;letter-spacing:.15em}.inning-box strong{font-size:22px;line-height:24px}.inning-box span{color:#54df8b;font-size:10px;margin-left:4px}.count-box{position:absolute;left:22px;top:19px;display:flex;align-items:center;gap:5px;padding:8px 10px;background:#081119dd;border:1px solid #ffffff19;border-radius:6px;font-size:10px}.count-box b{color:#687983;font-size:8px;margin-left:3px}.count-box i{font-style:normal;font-weight:800;min-width:9px}.base-diamond{position:absolute;right:24px;top:20px;width:48px;height:48px;transform:rotate(45deg);border:1px solid #7b8a91;background:#07101880}.base-diamond i{position:absolute;width:11px;height:11px;background:#26343b;border:1px solid #b9c4c9}.base-diamond i:nth-child(1){left:18px;top:-6px}.base-diamond i:nth-child(2){left:-6px;top:18px}.base-diamond i:nth-child(3){right:-6px;top:18px}.base-diamond .home{left:18px;bottom:-6px}.base-diamond i.occupied{background:#50df8a;border-color:#b5ffd2;box-shadow:0 0 12px #50df8a}.live{position:absolute;z-index:9;top:98px;left:22px;font-size:8px;letter-spacing:.13em;color:#dce5e9;background:#071018b8;border:1px solid #ffffff17;border-radius:5px;padding:6px 8px}.live span{display:inline-block;width:6px;height:6px;background:#ff4f5e;border-radius:50%;margin-right:5px;box-shadow:0 0 8px #ff4f5e}.pitch-card{position:absolute;z-index:9;top:96px;right:22px;display:flex;align-items:baseline;gap:9px;padding:7px 10px;background:#071018c9;border:1px solid #ffffff17;border-radius:5px}.pitch-card small{font-size:7px;color:#71818a;letter-spacing:.08em}.pitch-card b{font-size:12px}.pitch-card em{font-style:normal;color:#9aa9b1;font-size:9px}.zone-wrap{position:absolute;z-index:8;left:50%;top:58%;width:min(245px,24vw);aspect-ratio:.72;transform:translate(-50%,-50%);pointer-events:none}.zone-shadow{position:absolute;inset:-16px;background:radial-gradient(ellipse,#0007,transparent 68%);filter:blur(8px)}.zone{position:absolute;inset:0;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);border:1px solid #ffffffa8;box-shadow:0 0 0 1px #0008}.zone button{border:1px solid #ffffff25;background:transparent;cursor:pointer}.zone button:hover,.zone button.active{background:#50df8a18;border-color:#50df8a}.aim{position:absolute;width:18px;height:18px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid #6ff0a1;border-radius:50%;opacity:.8}.aim:before,.aim:after{content:"";position:absolute;background:#6ff0a1}.aim:before{width:28px;height:1px;left:-6px;top:8px}.aim:after{height:28px;width:1px;left:8px;top:-6px}.batter-label{position:absolute;z-index:8;left:24px;bottom:118px;border-left:2px solid #50df8a;padding-left:10px}.batter-label small{display:block;font-size:7px;color:#72828c;letter-spacing:.16em}.batter-label b{display:block;font-size:14px;margin:3px 0}.batter-label span{font-size:9px;color:#85959e}.message{position:absolute;z-index:8;left:50%;bottom:128px;transform:translateX(-50%);width:min(650px,80%);text-align:center;text-shadow:0 2px 10px #000}.message b{font-size:19px}.message small{display:block;color:#a9b7be;font-size:10px;margin-top:5px}.pitch-select{position:absolute;z-index:12;right:22px;bottom:119px;display:flex;gap:5px}.pitch-btn{border:1px solid #ffffff20;background:#09131ae8;color:#aebbc1;border-radius:5px;padding:7px 8px;font-size:8px;cursor:pointer}.pitch-btn.active{background:#176b40;border-color:#54df8b;color:#fff}.swing{position:absolute;z-index:13;left:50%;bottom:20px;transform:translateX(-50%);width:210px;height:62px;border:1px solid #77eaa5;border-radius:7px;background:linear-gradient(#35c978,#147641);box-shadow:0 7px 25px #0008;color:white;font-size:21px;font-weight:900;cursor:pointer}.swing:active{transform:translateX(-50%) scale(.98)}.swing small{display:block;font-size:7px;letter-spacing:.18em;opacity:.7;margin-top:3px}.result-banner{position:absolute;z-index:20;left:50%;top:43%;transform:translate(-50%,-50%) scale(.9);opacity:0;pointer-events:none;text-align:center;text-shadow:0 3px 18px #000;transition:.18s}.result-banner.show{opacity:1;transform:translate(-50%,-50%) scale(1)}.result-banner b{display:block;font-size:44px;letter-spacing:.02em}.result-banner span{display:block;margin-top:5px;color:#d3dde2;font-size:11px}.pause{display:none;position:absolute;z-index:40;inset:0;place-items:center;background:#02070c99;font-size:48px;font-weight:900;letter-spacing:.08em}.paused .pause{display:grid}
 @media(max-width:760px){.broadcast-top{height:70px;padding:8px}.scoreboard{width:88vw;height:50px;grid-template-columns:1fr 65px 1fr}.club{padding:0 8px;gap:5px}.club b{font-size:8px}.club strong{font-size:20px}.count-box{left:8px;top:76px}.base-diamond{right:8px;top:74px;transform:scale(.8) rotate(45deg)}.live{top:108px;left:8px}.pitch-card{top:105px;right:8px}.zone-wrap{width:min(65vw,245px);top:57%}.batter-label{left:10px;bottom:93px}.message{bottom:96px;width:90%}.message b{font-size:15px}.message small{font-size:9px}.pitch-select{right:8px;bottom:92px;gap:3px}.pitch-btn{padding:6px 5px;font-size:7px}.swing{bottom:10px;height:58px;width:180px}.result-banner b{font-size:34px}}
 `;
 root.prepend(s);
}

function q(s){return root.querySelector(s)}
function schedule(fn,ms){const id=setTimeout(fn,ms);timers.push(id);return id}
function resize(){if(!canvas)return;const d=Math.min(devicePixelRatio||1,2),r=canvas.getBoundingClientRect();canvas.width=Math.max(1,r.width*d);canvas.height=Math.max(1,r.height*d);ctx.setTransform(d,0,0,d,0,0);draw()}
function updateHud(){
 q('#aiScore').textContent=state.ai;q('#humanScore').textContent=state.human;q('#inning').textContent=state.inning;q('#half').textContent=state.half==='top'?'▲':'▼';
 q('#balls').textContent=state.balls;q('#strikes').textContent=state.strikes;q('#outs').textContent=state.outs;q('.live').innerHTML='<span></span> LIVE · '+state.inning+'회';
 q('#pitchRole').textContent=state.half==='top'?'AI PITCHER':'HUMAN PITCHER';
 ['base1','base2','base3'].forEach((id,i)=>q('#'+id).classList.toggle('occupied',!!state.bases[i]));
 q('#zoneWrap').style.pointerEvents=state.half==='bottom'?'auto':'none';
 q('#pitchSelect').style.display=state.half==='bottom'?'flex':'none';
}
function renderPitchSelect(){const box=q('#pitchSelect');box.innerHTML=PITCHES.map((p,i)=>`<button class="pitch-btn ${i===state.selected?'active':''}" data-i="${i}">${p.name}</button>`).join('');box.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(state.half==='bottom'&&!state.pitching){state.selected=+b.dataset.i;renderPitchSelect();q('#submessage').textContent=PITCHES[state.selected].name+' · 코스를 선택하세요'}})}
function selectAim(i){if(state.half!=='bottom'||state.pitching)return;state.aim={x:(i%3+.5)/3,y:(Math.floor(i/3)+.5)/3};q('#aim').style.left=state.aim.x*100+'%';q('#aim').style.top=state.aim.y*100+'%';q('#zone').querySelectorAll('button').forEach((b,n)=>b.classList.toggle('active',n===i));q('#submessage').textContent='코스 선택 완료 · 투구 버튼 없이 자동으로 던집니다'}
function pitch(){
 if(!state||state.over||state.paused||state.pitching)return;
 const p=state.half==='bottom'?PITCHES[state.selected]:PITCHES[Math.floor(Math.random()*PITCHES.length)];
 state.pitch={...p,t:0,start:performance.now(),target:{x:.29+Math.random()*.42,y:.28+Math.random()*.44}};state.pitching=true;state.swingReady=false;
 q('#pitchName').textContent='???';q('#pitchSpeed').textContent='—';q('#message').textContent=state.half==='top'?'AI가 투구합니다':'SCREEN 투구';q('#submessage').textContent=state.half==='top'?'공이 날아옵니다 · 타이밍을 보고 스윙':'AI 타자가 타격합니다';raf=requestAnimationFrame(tick)
}
function tick(now){if(!state||!state.pitching||state.paused)return;const duration=900-(state.pitch.speed-120)*2.2;state.pitch.t=Math.min(1,(now-state.pitch.start)/duration);draw();if(state.pitch.t>=1){state.pitching=false;q('#pitchName').textContent=state.pitch.name;q('#pitchSpeed').textContent=state.pitch.speed+' km/h';if(state.half==='top'){state.swingReady=true;q('#message').textContent='지금!';q('#submessage').textContent='SPACE 또는 SWING';schedule(()=>{if(state.swingReady){state.swingReady=false;resolveSwing(0)},},180)}else schedule(aiAtBat,220)}else raf=requestAnimationFrame(tick)}
function swing(){if(!state||state.over||state.paused||state.half!=='top'||!state.pitch||!state.swingReady)return;state.swingReady=false;const qv=Math.max(0,1-Math.abs(state.pitch.t-.82)/.22);resolveSwing(qv)}
function resolveSwing(qv){if(!state||state.over)return;state.pitch=null;if(qv>.82){const r=Math.random();if(r<.12)hit('홈런','타구가 담장을 넘어갑니다');else if(r<.42)hit('2루타','강한 타구가 외야로 빠집니다');else hit('안타','타구가 수비 사이를 빠집니다');return}if(qv>.48){if(Math.random()<.55){state.strikes=Math.min(2,state.strikes+1);announce('파울','타이밍은 맞았습니다 · 파울')}else{state.outs++;announce('아웃','타구가 수비 정면으로 갑니다');endPlateAppearance()}return}state.strikes++;announce('STRIKE','헛스윙');if(state.strikes>=3){state.outs++;state.strikes=0;state.balls=0;announce('삼진','3스트라이크 · 아웃');endPlateAppearance()}else nextPitch(500)}
function aiAtBat(){if(!state||state.over)return;const r=Math.random();if(r<.16){state.strikes++;announce('STRIKE','AI 타자의 헛스윙');if(state.strikes>=3){state.outs++;state.strikes=0;state.balls=0;announce('삼진','AI 타자 아웃');endPlateAppearance()}else nextPitch(650);return}if(r<.30){state.outs++;announce('아웃','수비가 타구를 처리했습니다');endPlateAppearance();return}if(r<.42){state.balls++;announce('볼','스트라이크 존을 벗어났습니다');if(state.balls>=4){state.balls=0;state.strikes=0;walk();}else nextPitch(650);return}hit(Math.random()<.12?'홈런':Math.random()<.35?'2루타':'안타', 'AI의 타구가 외야로 향합니다')}
function hit(kind,text){
 const advance=kind==='홈런'?4:kind==='2루타'?2:1;
 if(state.half==='top'){state.human+=kind==='홈런'?1:0;advanceRunners(advance,true)}else{state.ai+=kind==='홈런'?1:0;advanceRunners(advance,false)}
 announce(kind,text);state.balls=0;state.strikes=0;nextPitch(1100)
}
function advanceRunners(n,humanBat){let runs=0;if(n>=4){runs=state.bases.filter(Boolean).length+1;state.bases=[0,0,0]}else{for(let i=2;i>=0;i--){if(state.bases[i]){let to=i+n;if(to>=3)runs++;else state.bases[to]=1;state.bases[i]=0}}state.bases[n-1]=1}if(runs){if(humanBat)state.human+=runs;else state.ai+=runs}updateHud()}
function walk(){advanceRunners(1,state.half==='top');nextPitch(900)}
function announce(title,text){q('#resultTitle').textContent=title;q('#resultText').textContent=text;q('#resultBanner').classList.add('show');q('#message').textContent=title;q('#submessage').textContent=text;updateHud();schedule(()=>q('#resultBanner').classList.remove('show'),750)}
function nextPitch(delay){if(!state||state.over)return;schedule(()=>{if(!state||state.over)return;updateHud();if(state.outs>=3){changeHalf();return}pitch()},delay)}
function endPlateAppearance(){state.pitch=null;if(state.outs>=3)schedule(changeHalf,850);else nextPitch(850)}
function changeHalf(){state.outs=0;state.balls=0;state.strikes=0;state.bases=[0,0,0];state.half=state.half==='top'?'bottom':'top';if(state.half==='top')state.inning++;updateHud();if(state.inning>9&&state.human!==state.ai){finish()}else if(state.inning>9&&state.human===state.ai){state.inning=10;state.half='top';updateHud();schedule(pitch,900)}else{q('#message').textContent=state.inning+'회'+(state.half==='top'?'초':'말')+' 시작';q('#submessage').textContent=state.half==='top'?'타석에 들어섭니다':'AI 타자가 준비합니다';schedule(pitch,950)}}
function finish(){state.over=true;q('#message').textContent=state.human>state.ai?'HUMAN 승리':'AI 승리';q('#submessage').textContent='경기 종료 · 브라우저 새로고침으로 다시 시작할 수 있습니다'}
function togglePause(){if(!state)return;state.paused=!state.paused;root.classList.toggle('paused',state.paused);if(!state.paused){if(state.pitching){state.pitch.start=performance.now()-state.pitch.t*700;raf=requestAnimationFrame(tick)}}}

function draw(){if(!ctx||!canvas||!state)return;const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);drawStadium(w,h);if(state.pitching)drawBall(w,h);drawPlayers(w,h)}
function drawStadium(w,h){
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#16232a');g.addColorStop(.36,'#243b35');g.addColorStop(1,'#09130f');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 const horizon=h*.38;ctx.fillStyle='#10191f';ctx.fillRect(0,horizon,w,h*.16);
 for(let i=0;i<15;i++){ctx.fillStyle=i%2?'#18252b':'#202e34';ctx.fillRect(i*w/15,horizon,(w/15)-1,h*.16)}
 ctx.fillStyle='#305c3b';ctx.beginPath();ctx.moveTo(w*.5,h*.42);ctx.lineTo(w*.08,h);ctx.lineTo(w*.92,h);ctx.closePath();ctx.fill();
 const dirt=ctx.createRadialGradient(w*.5,h*.83,10,w*.5,h*.83,w*.5);dirt.addColorStop(0,'#b38b5b');dirt.addColorStop(.55,'#8b6848');dirt.addColorStop(1,'#5d4633');ctx.fillStyle=dirt;ctx.beginPath();ctx.ellipse(w*.5,h*.91,w*.34,h*.18,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#f7f2dd';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*.5,h*.49);ctx.lineTo(w*.17,h);ctx.moveTo(w*.5,h*.49);ctx.lineTo(w*.83,h);ctx.stroke();
 const cy=h*.84,cx=w*.5;ctx.fillStyle='#a47c54';ctx.beginPath();ctx.ellipse(cx,cy,w*.075,h*.035,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#d9d3bd';ctx.beginPath();ctx.moveTo(cx-18,h-27);ctx.lineTo(cx+18,h-27);ctx.lineTo(cx+12,h-12);ctx.lineTo(cx-12,h-12);ctx.closePath();ctx.fill();
 for(let i=0;i<18;i++){const x=(i+.5)*w/18;ctx.fillStyle=i%2?'#303d42':'#435055';ctx.beginPath();ctx.arc(x,horizon+h*.04,3+(i%3),0,Math.PI*2);ctx.fill()}
}
function drawPlayers(w,h){
 const cx=w*.5,cy=h*.82;
 // catcher
 ctx.fillStyle='#17242c';ctx.beginPath();ctx.ellipse(cx,cy+8,20,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#cfd8dc';ctx.beginPath();ctx.arc(cx,cy-18,10,0,Math.PI*2);ctx.fill();
 // batter, slightly offset like a real broadcast camera
 const bx=cx-52,by=h*.78;ctx.fillStyle='#111b22';ctx.beginPath();ctx.ellipse(bx,by+18,20,38,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d7dce0';ctx.beginPath();ctx.arc(bx,by-20,10,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#c5d0d4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(bx+8,by+2);ctx.lineTo(bx+34,by-31);ctx.stroke();
 // pitcher
 const px=cx,py=h*.49;ctx.fillStyle='#24333b';ctx.beginPath();ctx.ellipse(px,py+8,13,27,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d6dde0';ctx.beginPath();ctx.arc(px,py-20,7,0,Math.PI*2);ctx.fill();
}
function drawBall(w,h){
 const p=state.pitch.t;const target=state.pitch.target;const sx=w*.5,sy=h*.49;const ex=w*(.5+(target.x-.5)*.55),ey=h*(.83+(target.y-.5)*.08);const z=Math.pow(p,1.7);const x=sx+(ex-sx)*z+Math.sin(p*Math.PI)*state.pitch.dx*w*.18;const y=sy+(ey-sy)*z+state.pitch.dy*h*p*(1-p);
 const size=3+17*Math.pow(p,.7);ctx.save();ctx.globalAlpha=.18;for(let i=5;i>0;i--){ctx.beginPath();ctx.fillStyle='#fff';ctx.arc(x-(ex-sx)*i*.012,y-(ey-sy)*i*.012,size*i*.18,0,Math.PI*2);ctx.fill()}ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c52e35';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,size*.65,.3,2.5);ctx.stroke();ctx.restore()}

function reset(){if(!root)return;openBaseball(root)}
export function destroy(){if(raf)cancelAnimationFrame(raf);timers.forEach(clearTimeout);timers=[];if(keydownHandler)window.removeEventListener('keydown',keydownHandler);if(resizeHandler)window.removeEventListener('resize',resizeHandler);root=null;canvas=null;ctx=null;state=null;raf=0;keydownHandler=null;resizeHandler=null}
