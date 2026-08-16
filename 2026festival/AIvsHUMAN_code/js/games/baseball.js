let root=null,canvas=null,ctx=null,raf=0,timers=[],keydownHandler=null;
let state=null;

const PITCHES=[
  {name:'FOUR-SEAM',kr:'포심',speed:148,move:0},
  {name:'TWO-SEAM',kr:'투심',speed:143,move:1},
  {name:'CUTTER',kr:'커터',speed:139,move:-1},
  {name:'SLIDER',kr:'슬라이더',speed:132,move:-2},
  {name:'CURVE',kr:'커브',speed:120,move:2},
  {name:'FORK',kr:'포크',speed:128,move:1}
];

export function openBaseball(container){
  destroy();
  root=container;
  root.innerHTML=''+
    '<style>'+css()+'</style>'+ 
    '<div class="bb">'+
      '<div class="bb-head">'+
        '<div class="team">HUMAN<small>BATTER</small></div>'+ 
        '<div class="score"><span id="hs">0</span><em>VS</em><span id="as">0</span></div>'+ 
        '<div class="team ai">AI PITCHER<small>OPPONENT</small></div>'+ 
      '</div>'+ 
      '<div class="stadium">'+
        '<div class="stands"></div><div class="lights"></div><canvas id="bbCanvas"></canvas>'+ 
        '<div class="count"><span class="pill">INN <b id="inn">1</b></span><span class="pill">OUT <b id="out">0</b></span><span class="pill">COUNT <b id="cnt">0-0</b></span></div>'+ 
        '<div class="hud"><div class="label">PITCHER</div><div class="pitch-name" id="pitchName">READY</div><div class="meta"><span id="speed">---</span> km/h · <span id="pitchState">준비</span></div><div class="energy"><i id="energy"></i></div></div>'+ 
        '<div class="result" id="result"><div class="card"><h2 id="resultTitle"></h2><p id="resultText"></p><button class="again" id="again">다시 플레이</button></div></div>'+ 
      '</div>'+ 
      '<div class="bottom"><div class="status"><strong id="playText">타석에 들어섭니다.</strong><span id="subText">투구가 홈플레이트에 도달하기 전에 SWING!</span></div><button class="swing" id="swing">⚾ SWING</button><div class="hint">SPACE / 버튼<br>타이밍이 승부를 결정합니다.</div></div>'+ 
    '</div>';

  canvas=root.querySelector('#bbCanvas');
  ctx=canvas.getContext('2d');
  state={inning:1,outs:0,balls:0,strikes:0,score:0,aiScore:0,bases:[0,0,0],pitch:null,pitching:false,over:false,energy:100,hit:null};
  root.querySelector('#swing').addEventListener('click',swing);
  root.querySelector('#again').addEventListener('click',resetGame);
  keydownHandler=function(e){if(e.code==='Space'){e.preventDefault();swing();}};
  window.addEventListener('keydown',keydownHandler);
  window.addEventListener('resize',resize);
  resize();
  update();
  draw();
  schedulePitch(650);
}

function css(){return '.bb{height:100%;min-height:620px;background:#071018;color:#eef5f8;display:flex;flex-direction:column;overflow:hidden;position:relative;font-family:Arial,Pretendard,sans-serif}.bb *{box-sizing:border-box}.bb-head{height:72px;flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 24px;background:linear-gradient(#152331,#0b141d);border-bottom:1px solid #304252}.team{font-weight:900;font-size:15px;letter-spacing:.08em}.team small{display:block;color:#728595;font-size:9px;margin-top:4px;letter-spacing:.15em}.team.ai{text-align:right}.score{font-size:29px;font-weight:900}.score em{font-style:normal;color:#48d27e;font-size:11px;margin:0 12px}.stadium{position:relative;flex:1;min-height:420px;overflow:hidden;background:radial-gradient(ellipse at 50% 58%,#2d7043 0,#1b4a2e 40%,#0b2319 72%,#071018 100%)}.stadium:before{content:"";position:absolute;inset:0;background:linear-gradient(#111c27dd 0 14%,transparent 14%),repeating-linear-gradient(90deg,transparent 0 7%,#fff2 7.2% 7.35%);opacity:.35}.stands{position:absolute;top:5%;left:8%;right:8%;height:17%;border-radius:50%;background:repeating-linear-gradient(90deg,#1a2732 0 14px,#263743 14px 18px);box-shadow:0 8px 25px #0008}.lights{position:absolute;top:3%;left:10%;right:10%;height:9px;background:radial-gradient(circle,#fff 0 2px,transparent 3px) 0 0/20px 9px;opacity:.8}canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}.count{position:absolute;z-index:4;left:18px;top:18px;display:flex;gap:7px}.pill{background:#09131ddd;border:1px solid #334755;border-radius:9px;padding:7px 10px;color:#93a5b3;font-size:11px}.pill b{color:#fff;margin-left:4px}.hud{position:absolute;z-index:4;right:18px;top:18px;width:190px;padding:13px;background:#08121de8;border:1px solid #344958;border-radius:14px}.label{font-size:9px;color:#718493;letter-spacing:.16em}.pitch-name{font-size:19px;font-weight:900;margin:4px 0}.meta{font-size:11px;color:#9eb0bc}.energy{height:5px;background:#263743;border-radius:5px;margin-top:9px;overflow:hidden}.energy i{display:block;height:100%;width:100%;background:#45d27d}.bottom{flex:none;padding:13px 18px 16px;display:grid;grid-template-columns:1fr minmax(260px,460px) 1fr;gap:15px;align-items:center;background:linear-gradient(#0e1923,#091119);border-top:1px solid #293b49}.status strong{display:block;font-size:17px;margin-bottom:4px}.status span,.hint{font-size:11px;color:#7e919f}.hint{text-align:right;line-height:1.5}.swing{width:100%;height:56px;border:1px solid #4bdd86;border-radius:15px;background:linear-gradient(#24a861,#126e3c);color:white;font-size:18px;font-weight:900;cursor:pointer;box-shadow:0 8px 25px #0006}.result{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:#02070ccc;opacity:0;pointer-events:none}.result.show{opacity:1;pointer-events:auto}.card{width:min(450px,90%);padding:30px;border-radius:23px;background:linear-gradient(145deg,#172431,#0a1118);border:1px solid #405362;text-align:center}.card h2{font-size:38px;margin-bottom:8px}.card p{color:#9cacb8;margin-bottom:20px}.again{border:0;border-radius:12px;padding:13px 28px;background:#45d27d;color:#06130c;font-weight:900;cursor:pointer}@media(max-width:760px){.bb-head{height:62px;padding:0 12px}.score{font-size:22px}.score em{margin:0 6px}.count{left:8px;top:8px}.hud{right:8px;top:8px;width:155px}.bottom{grid-template-columns:1fr;padding:10px}.status,.hint{display:none}.stadium{min-height:430px}}';}

function q(s){return root?root.querySelector(s):null;}
function schedule(fn,ms){var id=setTimeout(fn,ms);timers.push(id);}
function schedulePitch(ms){if(!state||state.over)return;state.pitching=false;state.pitch=null;q('#pitchState').textContent='준비';q('#playText').textContent='AI 투수가 준비합니다.';schedule(pitch,ms);}
function pitch(){if(!state||state.over)return;var p=PITCHES[Math.floor(Math.random()*PITCHES.length)];state.pitch={name:p.name,kr:p.kr,speed:p.speed,move:p.move,zone:Math.floor(Math.random()*9),progress:0,start:performance.now()};state.pitching=true;q('#pitchName').textContent=p.kr;q('#speed').textContent=String(p.speed+Math.floor(Math.random()*7-3));q('#pitchState').textContent='투구 중';q('#playText').textContent='공이 들어옵니다!';raf=requestAnimationFrame(tick);}
function tick(t){if(!state||!state.pitching||!state.pitch)return;var speed=Number(q('#speed').textContent)||145;var duration=Math.max(520,900-(speed-115)*2.1);state.pitch.progress=Math.min(1,(t-state.pitch.start)/duration);draw();if(state.pitch.progress>=1){state.pitching=false;resolvePitch();return;}raf=requestAnimationFrame(tick);}
function swing(){if(!state||state.over||!state.pitching||!state.pitch)return;var timing=Math.abs(state.pitch.progress-.72);var quality=Math.max(0,1-timing/.25);state.pitching=false;cancelAnimationFrame(raf);state.energy=Math.max(0,state.energy-3);resolveSwing(quality);}
function resolvePitch(){var strike=Math.random()<.38;if(strike){state.strikes++;announce('스트라이크','좋은 공이 지나갔습니다.');if(state.strikes>=3){out('루킹 삼진');return;}}else{state.balls++;announce('볼','존을 벗어난 공입니다.');if(state.balls>=4){walk();return;}}schedulePitch(600);}
function resolveSwing(quality){if(quality<.34){state.strikes++;announce('헛스윙','타이밍을 조금 조절해 보세요.');if(state.strikes>=3){out('삼진 아웃');return;}schedulePitch(650);return;}var roll=Math.random();var result='1B';if(quality>.94&&roll<.30)result='HR';else if(quality>.84&&roll<.35)result='3B';else if(quality>.68&&roll<.48)result='2B';else if(quality<.48&&roll<.30)result='FO';else if(quality<.55&&roll<.50)result='GO';applyResult(result,quality);}
function applyResult(result,quality){state.strikes=0;state.balls=0;if(result==='FO'||result==='GO'){out(result==='FO'?'뜬공 아웃':'땅볼 아웃');return;}var n=result==='HR'?4:result==='3B'?3:result==='2B'?2:1;advance(n);var text=result==='HR'?'HOME RUN!':result==='3B'?'3루타!':result==='2B'?'2루타!':'안타!';announce(text,quality>.85?'완벽한 타이밍!':'좋은 컨택입니다.');state.hit={type:result,start:performance.now()};raf=requestAnimationFrame(hitAnim);schedulePitch(950);update();}
function advance(n){if(n===4){scoreRun();state.bases=[0,0,0];return;}var old=state.bases.slice();state.bases=[0,0,0];for(var i=2;i>=0;i--){if(!old[i])continue;var dest=i+n;if(dest>=3)scoreRun();else state.bases[dest]=1;}state.bases[n-1]=1;}
function walk(){state.strikes=0;state.balls=0;var old=state.bases.slice();state.bases=[0,0,0];if(old[2])state.bases[2]=1;if(old[1]){if(old[2])scoreRun();else state.bases[2]=1;}if(old[0]){if(old[1]){if(old[2])scoreRun();else state.bases[2]=1;}else state.bases[1]=1;}state.bases[0]=1;announce('볼넷','침착하게 1루로 진루합니다.');schedulePitch(800);update();}
function out(text){state.outs++;state.strikes=0;state.balls=0;state.pitch=null;announce(text,'아웃 카운트가 올라갑니다.');if(state.outs>=3){schedule(endInning,850);}else schedulePitch(850);}
function endInning(){if(state.inning>=3){finish();return;}state.inning++;state.outs=0;state.balls=0;state.strikes=0;state.bases=[0,0,0];state.energy=100;announce(state.inning+'회 시작','새로운 이닝입니다.');schedulePitch(1000);update();}
function scoreRun(){state.score++;q('#hs').textContent=String(state.score);}
function finish(){state.over=true;state.pitching=false;cancelAnimationFrame(raf);var title=state.score>state.aiScore?'HUMAN WIN!':state.score<state.aiScore?'AI WIN':'DRAW';q('#resultTitle').textContent=title;q('#resultText').textContent='최종 스코어  HUMAN '+state.score+' : '+state.aiScore+' AI';q('#result').classList.add('show');}
function resetGame(){timers.forEach(clearTimeout);timers=[];q('#result').classList.remove('show');state={inning:1,outs:0,balls:0,strikes:0,score:0,aiScore:0,bases:[0,0,0],pitch:null,pitching:false,over:false,energy:100,hit:null};q('#hs').textContent='0';q('#as').textContent='0';update();schedulePitch(500);}
function announce(title,sub){q('#playText').textContent=title;q('#subText').textContent=sub;update();}
function update(){if(!state)return;q('#inn').textContent=String(state.inning);q('#out').textContent=String(state.outs);q('#cnt').textContent=state.balls+'-'+state.strikes;q('#energy').style.width=state.energy+'%';}
function hitAnim(t){if(!state||!state.hit)return;draw();if(t-state.hit.start<900)raf=requestAnimationFrame(hitAnim);else state.hit=null;}
function draw(){if(!ctx||!canvas)return;var w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);drawField(w,h);drawStands(w,h);drawPlayers(w,h);drawBases(w,h);if(state&&state.pitching&&state.pitch)drawBall(w,h);if(state&&state.hit)drawHit(w,h);}
function drawField(w,h){var g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#173d29');g.addColorStop(.55,'#25653b');g.addColorStop(1,'#0b2819');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.fillStyle='#bda878';ctx.beginPath();ctx.moveTo(w*.5,h*.48);ctx.lineTo(w*.20,h*.92);ctx.lineTo(w*.80,h*.92);ctx.closePath();ctx.fill();ctx.fillStyle='#2c6037';ctx.beginPath();ctx.arc(w*.5,h*.78,w*.30,Math.PI,0);ctx.fill();ctx.fillStyle='#caa875';ctx.beginPath();ctx.arc(w*.5,h*.68,Math.min(w,h)*.12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(w*.475,h*.84,w*.05,5);}
function drawStands(w,h){ctx.fillStyle='#17232d';ctx.fillRect(0,h*.10,w,h*.14);ctx.fillStyle='#26343d';for(var x=0;x<w;x+=18){ctx.fillRect(x,h*.11,11,5);ctx.fillRect(x+4,h*.145,9,5);}ctx.fillStyle='#e8edf0';for(var i=0;i<40;i++){var lx=(i*97)%Math.max(1,w);ctx.beginPath();ctx.arc(lx,h*.075,2,0,Math.PI*2);ctx.fill();}}
function drawPlayers(w,h){ctx.fillStyle='#202b34';ctx.beginPath();ctx.arc(w*.5,h*.46,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d5a982';ctx.beginPath();ctx.arc(w*.5,h*.44,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#30404b';ctx.fillRect(w*.5-10,h*.46,20,32);ctx.strokeStyle='#d5a982';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(w*.5-8,h*.50);ctx.lineTo(w*.46,h*.58);ctx.moveTo(w*.5+8,h*.50);ctx.lineTo(w*.54,h*.58);ctx.stroke();ctx.fillStyle='#202b34';ctx.beginPath();ctx.arc(w*.39,h*.80,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d5a982';ctx.beginPath();ctx.arc(w*.39,h*.78,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#253746';ctx.fillRect(w*.39-9,h*.80,18,27);ctx.strokeStyle='#c58b48';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(w*.40,h*.81);ctx.lineTo(w*.32,h*.75);ctx.stroke();}
function drawBall(w,h){var p=state.pitch.progress;var sx=w*.5,sy=h*.45,ex=w*.5,ey=h*.83;var x=sx+(ex-sx)*p+Math.sin(p*Math.PI)*state.pitch.move*w*.025;var y=sy+(ey-sy)*p;var r=4+10*p;ctx.fillStyle='#fff';ctx.shadowColor='#fff';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle='#d44';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r*.7,0,Math.PI);ctx.stroke();}
function drawBases(w,h){var pts=[[w*.5,h*.83],[w*.36,h*.69],[w*.64,h*.69]];for(var i=0;i<3;i++){ctx.fillStyle=state&&state.bases[i]?'#45d27d':'#eee';ctx.save();ctx.translate(pts[i][0],pts[i][1]);ctx.rotate(Math.PI/4);ctx.fillRect(-7,-7,14,14);ctx.restore();}}
function drawHit(w,h){var age=(performance.now()-state.hit.start)/900;var x=w*.5,y=h*.82;var dx=state.hit.type==='HR'?w*.28:state.hit.type==='3B'?w*.20:w*.12;var dy=-h*.35;ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.globalAlpha=Math.max(0,1-age);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*age,y+dy*age);ctx.stroke();ctx.globalAlpha=1;}
function destroy(){timers.forEach(clearTimeout);timers=[];cancelAnimationFrame(raf);if(keydownHandler)window.removeEventListener('keydown',keydownHandler);window.removeEventListener('resize',resize);root=null;canvas=null;ctx=null;state=null;keydownHandler=null;}
