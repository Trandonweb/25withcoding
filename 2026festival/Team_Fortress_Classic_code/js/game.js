import {CLASSES} from './data.js';
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const scene=new THREE.Scene();scene.add(camera);scene.background=new THREE.Color(0x9baeb8);scene.fog=new THREE.Fog(0x9baeb8,48,120);
const camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.1,180);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;$('#game').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xe7f1ff,0x555044,2));const sun=new THREE.DirectionalLight(0xffe0b2,2.4);sun.position.set(-18,30,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
const mat=(c,r=.78)=>new THREE.MeshStandardMaterial({color:c,roughness:r}),M={ground:mat(0x68745e),wall:mat(0xb5a78d),dark:mat(0x3a4145),red:mat(0xb94335),blue:mat(0x3b78b5),skin:mat(0xd2ad8c),metal:mat(0x68747c,.42),black:mat(0x25292d),gold:mat(0xe5bb4e),white:mat(0xe0ddd2)};
function box(p,x,y,z,w,h,d,m){const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;p.add(o);return o}
function ball(p,x,y,z,r,m){const o=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),m);o.position.set(x,y,z);o.castShadow=true;p.add(o);return o}
box(scene,0,-.35,0,110,.6,110,M.ground);const obstacles=[];const pickups=[];const tracers=[];
function wall(x,y,z,w,h,d,m=M.wall){box(scene,x,y,z,w,h,d,m);obstacles.push({x,z,w,d})}
for(let i=-48;i<=48;i+=12){wall(i,3,-48,11,6,1,M.dark);wall(i,3,48,11,6,1,M.dark)}for(let i=-36;i<=36;i+=12){wall(-48,3,i,1,6,11,M.dark);wall(48,3,i,1,6,11,M.dark)}
wall(-27,2.3,-18,12,4.6,9);wall(27,2.3,18,12,4.6,9);wall(-27,1.5,20,8,3,5,M.dark);wall(27,1.5,-20,8,3,5,M.dark);wall(-10,1.1,-5,5,2.2,2,M.dark);wall(10,1.1,5,5,2.2,2,M.dark);wall(0,1.4,-17,10,2.8,2);wall(0,1.4,17,10,2.8,2);
for(const [x,z] of [[-19,-8],[18,9],[-7,25],[8,-25],[-33,10],[32,-10],[-18,31],[19,-31]])box(scene,x,.8,z,2,1.6,2,mat(0x82705a));
const cpBase=new THREE.Mesh(new THREE.CylinderGeometry(4.2,4.2,.16,40),mat(0x303a40));cpBase.position.y=.03;scene.add(cpBase);const cpRing=new THREE.Mesh(new THREE.TorusGeometry(4.6,.16,10,56),M.gold);cpRing.rotation.x=Math.PI/2;cpRing.position.y=.2;scene.add(cpRing);box(scene,0,2.6,0,.18,5,.18,M.dark);box(scene,0,4.8,0,2.2,.9,.12,M.gold);
let cls=CLASSES[0],team='red',running=false,locked=false,health=125,wi=0,ammo=6,reserve=32,ammoState=[],reserveState=[],player=new THREE.Vector3(-36,0,0),vy=0,onGround=true,yaw=0,pitch=0,lastShot=0,reloading=false,keys={},bots=[],projectiles=[],scoreR=0,scoreB=0,cap=50,capOwner='neutral',deathCount=0,clock=0;
const weapon=()=>cls.weapons[wi],ray=new THREE.Raycaster(),objective=new THREE.Vector3(0,0,0);
function buildBotModel(b){const g=new THREE.Group(),shirt=b.cls.id==='medic'?M.white:(b.side==='red'?M.red:M.blue),skin=M.skin,id=b.cls.id;
box(g,0,.82,0,id==='heavy'?1.05:.72,1.05,id==='heavy'?.65:.43,shirt);box(g,-.2,.22,0,.23,.45,.27,M.black);box(g,.2,.22,0,.23,.45,.27,M.black);box(g,0,1.55,0,.52,.5,.48,id==='spy'?M.black:skin);
if(id==='scout'){box(g,0,1.84,0,.7,.14,.68,mat(b.side==='red'?0x4b2720:0x203c5a));box(g,.32,1.59,.05,.2,.08,.08,M.white)}
if(id==='soldier'){box(g,0,1.86,0,.67,.18,.64,mat(0x59666b));box(g,0,1.97,0,.36,.09,.34,M.dark)}
if(id==='pyro'){box(g,0,1.55,.28,.55,.35,.18,M.black);for(const x of [-.2,.2])ball(g,x,1.62,.39,.065,M.gold);box(g,-.48,.95,-.05,.18,.75,.25,M.metal);box(g,-.48,1.35,-.05,.22,.25,.28,M.gold)}
if(id==='demoman'){box(g,.18,1.57,.25,.14,.1,.08,M.black);box(g,0,1.84,0,.66,.17,.65,mat(0x343b3d))}
if(id==='heavy'){box(g,0,1.48,.26,.75,.25,.15,M.skin);box(g,-.48,1,-.03,.28,.7,.35,M.metal)}
if(id==='engineer'){box(g,0,1.85,0,.7,.16,.66,mat(0xd39b36));box(g,0,1.98,0,.3,.1,.3,M.dark)}
if(id==='medic'){box(g,0,1.82,0,.66,.15,.6,M.white);box(g,0,1.02,-.31,.45,.6,.2,M.white);box(g,0,1.02,-.42,.16,.16,.04,M.red)}
if(id==='sniper'){box(g,0,1.85,0,.68,.13,.62,mat(0x7a8b68));box(g,.24,1.56,.27,.22,.12,.08,M.black)}
if(id==='spy'){box(g,0,1.57,.26,.4,.25,.09,M.black);box(g,0,1.85,0,.68,.12,.6,mat(0x262b32))}
if(['soldier','demoman'].includes(id)){box(g,.42,1.04,.38,.24,.24,.85,M.metal);box(g,.42,1.04,.78,.18,.18,.38,M.black)}
else if(id==='heavy'){box(g,.43,1.1,.42,.38,.28,.6,M.metal);for(const x of [.3,.4,.5,.6])box(g,x,1.1,.8,.055,.055,.65,M.black)}
else if(id==='sniper'){box(g,.4,1.1,.4,.13,.13,1.15,M.black);box(g,.4,1.2,.25,.18,.1,.24,M.gold)}
else if(id==='pyro'){box(g,.42,1.03,.4,.3,.28,.58,M.metal);box(g,.42,1.04,.8,.2,.2,.42,M.black)}
else if(id==='medic'){box(g,.42,1.05,.35,.22,.22,.5,M.white);box(g,.42,1.05,.65,.13,.13,.25,M.red)}
else box(g,.4,1.05,.35,.19,.18,.42,id==='spy'?M.black:M.metal);
g.position.copy(b.pos);scene.add(g);b.mesh=g}
function spawnBot(i,side){const c=CLASSES[(i*3+Math.floor(i/2))%CLASSES.length],b={id:i,side,cls:c,hp:c.hp,max:c.hp,pos:new THREE.Vector3((side==='red'?-1:1)*(22+Math.random()*17),0,(Math.random()-.5)*52),alive:true,cd:Math.random(),respawn:0,mesh:null};buildBotModel(b);return b}
function makeBots(){for(const b of bots)scene.remove(b.mesh);bots=[];for(let i=0;i<18;i++)bots.push(spawnBot(i,i%2?'blue':'red'))}
function say(t,ms=1400){const e=$('.center-message');e.textContent=t;e.style.opacity='1';clearTimeout(say.timer);say.timer=setTimeout(()=>e.style.opacity='0',ms)}
function feed(t){const el=$('.killfeed'),n=document.createElement('div');n.className='feed';n.textContent=t;el.prepend(n);while(el.children.length>4)el.lastChild.remove();setTimeout(()=>n.remove(),4300)}
function updateHud(){health=Math.min(health,cls.hp);$('.health').textContent=Math.max(0,Math.ceil(health));$('.health-fill').style.width=Math.max(0,health/cls.hp*100)+'%';$('.weapon-name').textContent=weapon().name;$('.ammo').innerHTML=weapon().kind==='melee'?'∞':ammo+' <small>/ '+reserve+'</small>';$('.team-score.red').textContent=scoreR;$('.team-score.blue').textContent=scoreB;$('.class-hud').textContent=cls.ko.toUpperCase();$('.team-hud').textContent=team.toUpperCase();$('.team-hud').style.color=team==='red'?'#f17668':'#7db9f4';$('.point-fill').style.width=cap+'%';$('.point-fill').style.background=capOwner==='red'?'var(--red)':capOwner==='blue'?'var(--blue)':'linear-gradient(90deg,var(--red),var(--blue))';const ot=$('#objectiveText');if(ot)ot.textContent=capOwner==='neutral'?'FIGHT FOR CONTROL':capOwner.toUpperCase()+' CONTROL'}

let viewWeapon=new THREE.Group();camera.add(viewWeapon);
function buildViewWeapon(){
 camera.remove(viewWeapon);viewWeapon=new THREE.Group();camera.add(viewWeapon);
 const w=weapon(),metal=mat(0x4b555c,.38),dark=mat(0x20262b,.6),wood=mat(0x72513a),accent=mat(team==='red'?0xb84738:0x3e7eb9),skin=mat(0xc59c7c);
 const add=(x,y,z,a,b,c,m)=>box(viewWeapon,x,y,z,a,b,c,m);
 add(.39,-.34,-.72,.26,.28,.42,dark);add(.4,-.24,-.75,.18,.1,.32,accent);
 if(w.kind==='rocket'||w.kind==='grenade'){add(.35,-.28,-1.02,.2,.2,.75,metal);add(.35,-.28,-1.43,.28,.28,.18,dark);add(.35,-.16,-.99,.08,.08,.6,accent)}
 else if(w.kind==='flame'){add(.34,-.3,-.94,.25,.24,.5,metal);add(.34,-.29,-1.27,.18,.18,.42,dark);add(.34,-.19,-1.48,.25,.13,.2,accent)}
 else if(w.kind==='shotgun'||w.kind==='sniper'){add(.36,-.28,-1,.15,.16,.78,metal);add(.36,-.28,-1.42,.21,.2,.2,dark);if(w.kind==='sniper')add(.36,-.16,-.85,.12,.1,.32,accent)}
 else if(w.kind==='melee'){add(.36,-.18,-.91,.12,.58,.14,wood);const blade=add(.36,.18,-.93,.11,.48,.08,metal);blade.rotation.z=-.12}
 else if(w.kind==='heal'){add(.35,-.3,-.86,.25,.28,.42,mat(0xdedbd0));add(.35,-.3,-1.13,.12,.12,.2,mat(0xb9443d))}
 else {add(.35,-.28,-.95,.19,.18,.68,metal);add(.35,-.28,-1.34,.24,.2,.18,dark)}
 add(.18,-.43,-.67,.22,.16,.25,skin);
}
function tracer(from,to,color=0xffe5a1){const g=new THREE.BufferGeometry().setFromPoints([from,to]);const line=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));scene.add(line);tracers.push({line,life:.075})}
function makePickups(){
 for(const p of pickups)scene.remove(p.mesh);pickups.length=0;
 for(const [i,pos] of [[0,[-13,0,-11]],[1,[13,0,11]],[2,[-34,0,0]],[3,[34,0,0]],[4,[0,0,-31]],[5,[0,0,31]]]){
  const g=new THREE.Group();g.position.set(...pos);const isHealth=i%2===0;
  box(g,0,.48,0,.95,.85,.75,mat(isHealth?0xb93e38:0x4a91c8));box(g,0,.48,.39,.12,.55,.05,mat(0xf4f0dc));if(isHealth)box(g,0,.48,.42,.48,.12,.05,mat(0xf4f0dc));
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.62,.06,8,24),mat(0xf0cb58));ring.rotation.x=Math.PI/2;ring.position.y=.06;g.add(ring);scene.add(g);pickups.push({mesh:g,pos:new THREE.Vector3(...pos),type:isHealth?'health':'ammo',cooldown:0,phase:i});
 }
}
function updatePickups(dt){
 for(const p of pickups){p.mesh.rotation.y+=dt*.7;p.mesh.position.y=.08+Math.sin(clock*2+p.phase)*.08;if(p.cooldown>0){p.cooldown-=dt;p.mesh.visible=false;if(p.cooldown<=0)p.mesh.visible=true;continue}
  if(player.distanceTo(p.pos)<1.7){if(p.type==='health'&&health<cls.hp){health=Math.min(cls.hp,health+45);say('+ HEALTH',700)}else if(p.type==='ammo'&&weapon().kind!=='melee'){reserve=Math.min(weapon().reserve*2,reserve+Math.max(8,Math.ceil(weapon().clip*1.5)));reserveState[wi]=reserve;say('AMMO RESTOCKED',700)}else continue;p.cooldown=14;p.mesh.visible=false;updateHud()}
 }
 for(let i=tracers.length-1;i>=0;i--){tracers[i].life-=dt;if(tracers[i].life<=0){scene.remove(tracers[i].line);tracers.splice(i,1)}}
}
\nfunction resetWeapon(){wi=0;ammoState=cls.weapons.map(w=>w.ammo);reserveState=cls.weapons.map(w=>w.reserve);ammo=ammoState[0];reserve=reserveState[0];reloading=false;buildViewWeapon();updateHud()}
function start(){cls=CLASSES.find(c=>c.id===$('.class-card.active')?.dataset.id)||CLASSES[0];team=$('.team.active').dataset.team;health=cls.hp;player.set(team==='red'?-36:36,0,0);yaw=team==='red'?-Math.PI/2:Math.PI/2;pitch=0;camera.position.set(player.x,1.7,player.z);scoreR=scoreB=0;cap=50;capOwner='neutral';clock=0;makeBots();makePickups();resetWeapon();$('#menu').style.display='none';$('#hud').style.display='block';$('#pause').style.display='none';running=true;renderer.domElement.requestPointerLock?.();say(team.toUpperCase()+' TEAM — TAKE THE POINT',2200);updateHud()}
function pause(){if(!running)return;running=false;$('#pause').style.display='flex';document.exitPointerLock?.()}
function menu(){running=false;$('#pause').style.display='none';$('#hud').style.display='none';$('#menu').style.display='flex';document.exitPointerLock?.()}
CLASSES.forEach((c,i)=>{const el=document.createElement('button');el.className='class-card'+(i===0?' active':'');el.dataset.id=c.id;el.innerHTML='<b>'+c.name+'</b><small>'+c.desc+' · '+c.hp+' HP</small>';el.onclick=()=>{$$('.class-card').forEach(x=>x.classList.remove('active'));el.classList.add('active')};$('#classes').append(el)});
$$('.team').forEach(b=>b.onclick=()=>{$$('.team').forEach(x=>x.classList.remove('active'));b.classList.add('active')});$('#start').onclick=start;$('#resume').onclick=()=>{$('#pause').style.display='none';running=true;renderer.domElement.requestPointerLock?.()};$('#back').onclick=menu;$('#pauseBtn').onclick=pause;
document.addEventListener('pointerlockchange',()=>locked=document.pointerLockElement===renderer.domElement);renderer.domElement.addEventListener('click',()=>{if(running&&!locked)renderer.domElement.requestPointerLock()});
document.addEventListener('mousemove',e=>{if(!locked||!running)return;yaw-=e.movementX*.0022;pitch=Math.max(-1.48,Math.min(1.48,pitch-e.movementY*.0022));camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)});
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Escape'&&running)pause();if(e.code==='KeyR'&&running)reload();if(e.code.startsWith('Digit')&&running){const n=+e.code.slice(5)-1;if(n>=0&&n<3)switchWeapon(n)}if(e.code==='Space')e.preventDefault()});document.addEventListener('keyup',e=>keys[e.code]=false);document.addEventListener('mousedown',e=>{if(e.button===0&&running&&locked)shoot()});document.addEventListener('contextmenu',e=>e.preventDefault());
function switchWeapon(n){if(n===wi)return;ammoState[wi]=ammo;reserveState[wi]=reserve;wi=n;ammo=ammoState[wi]??weapon().ammo;reserve=reserveState[wi]??weapon().reserve;reloading=false;buildViewWeapon();updateHud()}
function reload(){const w=weapon();if(reloading||w.kind==='melee'||ammo>=w.clip||reserve<=0)return;reloading=true;say('RELOADING',650);setTimeout(()=>{if(!running&&$('#pause').style.display==='none')return;const take=Math.min(w.clip-ammo,reserve);ammo+=take;reserve-=take;ammoState[wi]=ammo;reserveState[wi]=reserve;reloading=false;updateHud()},w.kind==='sniper'?1450:1000)}
function killBot(b,attacker='YOU'){if(!b.alive)return;b.hp=0;b.alive=false;b.mesh.visible=false;b.respawn=5+Math.random()*3;if(b.side==='red')scoreB++;else scoreR++;feed(attacker+' ✕ '+b.cls.name+' ['+b.side.toUpperCase()+']');if(b.side!==team)health=Math.min(cls.hp,health+8);updateHud()}
function hurtBot(b,d,attacker='YOU'){if(!b.alive)return;b.hp-=d;const h=$('.hitmarker');h.classList.add('show');setTimeout(()=>h.classList.remove('show'),90);if(b.hp<=0)killBot(b,attacker)}
function harmPlayer(d){health-=d;if(health<=0){deathCount++;feed('YOU WERE ELIMINATED');respawn()}updateHud()}
function makeProjectile(origin,dir,owner,damage,speed,radius,side){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.17,8,8),mat(owner==='player'?0xffb64c:side==='red'?0xf46d4e:0x69b9ff));mesh.position.copy(origin);scene.add(mesh);projectiles.push({mesh,dir:dir.clone(),owner,damage,speed,radius,side,life:3.4})}
function shoot(){const w=weapon(),now=performance.now()/1000;if(now-lastShot<w.rate||reloading)return;lastShot=now;if(w.kind!=='melee'&&w.kind!=='heal'){if(ammo<=0){say('PRESS R TO RELOAD',650);return}ammo--;ammoState[wi]=ammo}const dir=new THREE.Vector3(0,0,-1).applyEuler(camera.rotation).normalize(),origin=camera.position.clone();
if(w.kind==='heal'){const ally=bots.filter(b=>b.alive&&b.side===team&&b.pos.distanceTo(player)<w.range).sort((a,b)=>a.hp/a.max-b.hp/b.max)[0];if(ally)ally.hp=Math.min(ally.max,ally.hp+12);else health=Math.min(cls.hp,health+4);updateHud();return}
if(w.kind==='melee'){const t=bots.filter(b=>b.alive&&b.side!==team).sort((a,b)=>a.pos.distanceTo(player)-b.pos.distanceTo(player))[0];if(t&&t.pos.distanceTo(player)<(w.range||2.8)+1)hurtBot(t,w.damage);updateHud();return}
if(w.kind==='rocket'||w.kind==='grenade')makeProjectile(origin.clone().addScaledVector(dir,.8),dir,'player',w.damage,w.speed,w.radius,team);
else if(w.kind==='flame'){for(const b of bots.filter(b=>b.alive&&b.side!==team)){const d=b.pos.clone().add(new THREE.Vector3(0,1.25,0)).sub(origin),dist=d.length();if(dist<(w.range||9)&&d.normalize().dot(dir)>.77)hurtBot(b,w.damage*2)}}
else{const pellets=w.kind==='shotgun'?(w.pellets||9):1;for(let i=0;i<pellets;i++){const d=dir.clone();d.x+=(Math.random()-.5)*(w.spread||.02);d.y+=(Math.random()-.5)*(w.spread||.02);d.z+=(Math.random()-.5)*(w.spread||.02);d.normalize();ray.set(origin,d);ray.far=w.kind==='sniper'?130:75;const hits=ray.intersectObjects(bots.filter(b=>b.alive&&b.side!==team).flatMap(b=>b.mesh.children),false);tracer(origin,origin.clone().addScaledVector(d,w.kind==='sniper'?85:24),team==='red'?0xff8071:0x7fc3ff);if(hits.length){const b=bots.find(b=>b.alive&&b.side!==team&&b.mesh.children.includes(hits[0].object));if(b)hurtBot(b,w.damage*(w.kind==='shotgun'?.62:1))}}}updateHud()}
function respawn(){health=cls.hp;player.set(team==='red'?-36:36,0,0);vy=0;camera.position.set(player.x,1.7,player.z);say('RESPAWNING',950);updateHud()}
function blocked(x,z){if(Math.abs(x)>45||Math.abs(z)>45)return true;return obstacles.some(o=>Math.abs(x-o.x)<o.w/2+.5&&Math.abs(z-o.z)<o.d/2+.5)}
function closestEnemy(b){let best=null,dist=Infinity;for(const t of bots){if(!t.alive||t.side===b.side)continue;const d=t.pos.distanceTo(b.pos);if(d<dist){dist=d;best=t}}const pd=player.distanceTo(b.pos);if(team!==b.side&&pd<dist){dist=pd;best={isPlayer:true,pos:player,hp:health,alive:true,side:team}}return best?{target:best,dist}:null}
function botShoot(b,t,dist,dt){b.cd-=dt;if(b.cd>0)return;let w=b.cls.weapons[0];if(dist<3.1&&b.cls.weapons[2]?.kind==='melee')w=b.cls.weapons[2];else if(b.cls.id==='pyro'&&dist>9&&b.cls.weapons[1])w=b.cls.weapons[1];const range=w.kind==='sniper'?65:w.kind==='rocket'||w.kind==='grenade'?36:w.kind==='flame'?8:w.kind==='melee'?2.7:32;if(dist>range)return;b.cd=w.rate+Math.random()*.18;const dir=t.pos.clone().add(new THREE.Vector3(0,t.isPlayer?1.4:1.2,0)).sub(b.pos.clone().add(new THREE.Vector3(0,1.25,0))).normalize();
if(w.kind==='rocket'||w.kind==='grenade'){makeProjectile(b.pos.clone().add(new THREE.Vector3(0,1.2,0)),dir,b,w.damage*.42,w.speed||23,w.radius||3,b.side);return}
if(w.kind==='heal'){if(t.isPlayer)health=Math.min(cls.hp,health+3);else if(t.side===b.side)t.hp=Math.min(t.max,t.hp+6);return}
if(w.kind==='flame'){if(dist<9){if(t.isPlayer)harmPlayer(4);else t.hp-=4}return}
if(w.kind==='melee'){if(dist<3){if(t.isPlayer)harmPlayer(w.damage*.22);else t.hp-=w.damage*.35}return}
if(Math.random()<(w.kind==='sniper'?.88:.56)){const dmg=w.kind==='shotgun'?w.damage*3:w.damage*.65;if(t.isPlayer)harmPlayer(dmg);else t.hp-=dmg}}
function update(dt){clock+=dt;if(locked){const f=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),r=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));let m=new THREE.Vector3();if(keys.KeyW||keys.ArrowUp)m.add(f);if(keys.KeyS||keys.ArrowDown)m.sub(f);if(keys.KeyD||keys.ArrowRight)m.add(r);if(keys.KeyA||keys.ArrowLeft)m.sub(r);if(m.lengthSq())m.normalize().multiplyScalar(cls.speed*(keys.ShiftLeft||keys.ShiftRight?1.3:1)*dt);let nx=player.x+m.x,nz=player.z+m.z;if(!blocked(nx,player.z))player.x=nx;if(!blocked(player.x,nz))player.z=nz;if(keys.Space&&onGround){vy=cls.id==='soldier'?7.8:7;onGround=false;keys.Space=false}if(cls.id==='scout'&&keys.Space&&!onGround&&player.y<1.25&&vy<0){vy=6.4;keys.Space=false}vy-=18*dt;player.y+=vy*dt;if(player.y<=0){player.y=0;vy=0;onGround=true}camera.position.set(player.x,1.7+player.y,player.z);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0)}
// AI units fight enemies, protect teammates, and return to the shared control point.
for(const b of bots){if(!b.alive){b.respawn-=dt;if(b.respawn<=0){b.hp=b.max;b.alive=true;b.mesh.visible=true;b.pos.set((b.side==='red'?-1:1)*(22+Math.random()*17),0,(Math.random()-.5)*52);b.mesh.position.copy(b.pos);b.cd=.5}continue}
if(b.cls.id==='medic'){const patient=bots.filter(a=>a!==b&&a.alive&&a.side===b.side&&a.hp<a.max&&a.pos.distanceTo(b.pos)<10).sort((a,z)=>a.hp/a.max-z.hp/z.max)[0];if(patient){patient.hp=Math.min(patient.max,patient.hp+18*dt);}}const en=closestEnemy(b);let target=en?.target,dist=en?.dist??999;
if(target&&dist<34){const preferred=b.cls.id==='sniper'?23:b.cls.id==='heavy'?11:14;const delta=target.pos.clone().sub(b.pos);delta.y=0;if(delta.lengthSq()){delta.normalize();let push=dist>preferred?1:dist<preferred*.55?-.65:0;const strafe=new THREE.Vector3(-delta.z,0,delta.x).multiplyScalar(Math.sin(clock*1.7+b.id)*.28);const speed=b.cls.speed*.55*dt,nx=b.pos.x+(delta.x*push+strafe.x)*speed,nz=b.pos.z+(delta.z*push+strafe.z)*speed;if(!blocked(nx,b.pos.z))b.pos.x=nx;if(!blocked(b.pos.x,nz))b.pos.z=nz}botShoot(b,target,dist,dt)}
else{const lane=(b.id%5-2)*2.6,goal=new THREE.Vector3(lane*.32,0,(b.side==='red'?1:-1)*1.8),to=goal.sub(b.pos);if(to.length()>1.3){to.normalize();const speed=b.cls.speed*.52*dt,nx=b.pos.x+to.x*speed,nz=b.pos.z+to.z*speed;if(!blocked(nx,b.pos.z))b.pos.x=nx;if(!blocked(b.pos.x,nz))b.pos.z=nz}}
b.mesh.position.copy(b.pos);if(target)b.mesh.lookAt(target.pos.x,1.1,target.pos.z);if(b.hp<=0)killBot(b,b.cls.name)}
for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.life-=dt;p.mesh.position.addScaledVector(p.dir,p.speed*dt);let hit=null;for(const b of bots)if(b.alive&&b.side!==p.side&&b.pos.distanceTo(p.mesh.position)<1.15){hit=b;break}const playerHit=p.side!==team&&player.distanceTo(p.mesh.position)<1.1;if(hit||playerHit||p.life<=0||Math.abs(p.mesh.position.x)>53||Math.abs(p.mesh.position.z)>53){if(p.radius>0){for(const b of bots)if(b.alive&&b.side!==p.side){const d=b.pos.distanceTo(p.mesh.position);if(d<p.radius)hurtBot(b,p.damage*(1-d/p.radius),p.owner==='player'?'YOU':p.side.toUpperCase())}if(playerHit)harmPlayer(p.damage*.25)}else if(hit)hurtBot(hit,p.damage,p.owner==='player'?'YOU':p.side.toUpperCase());scene.remove(p.mesh);projectiles.splice(i,1)}}
const redN=bots.filter(b=>b.alive&&b.side==='red'&&b.pos.distanceTo(objective)<5).length+(team==='red'&&player.distanceTo(objective)<5?1:0),blueN=bots.filter(b=>b.alive&&b.side==='blue'&&b.pos.distanceTo(objective)<5).length+(team==='blue'&&player.distanceTo(objective)<5?1:0),before=capOwner;
if(redN>blueN)cap=Math.min(100,cap+dt*(redN-blueN)*4);else if(blueN>redN)cap=Math.max(0,cap-dt*(blueN-redN)*4);
capOwner=cap>=100?'red':cap<=0?'blue':'neutral';
if(capOwner!==before&&capOwner!=='neutral'){if(capOwner==='red')scoreR+=3;else scoreB+=3;say(capOwner.toUpperCase()+' TEAM CAPTURED THE POINT!',1700);feed(capOwner.toUpperCase()+' TEAM CAPTURED CONTROL POINT')}
if(cls.id==='medic'&&health<cls.hp)health=Math.min(cls.hp,health+dt*1.2);updatePickups(dt);
if(clock>180){clock=0;say(scoreR===scoreB?'OVERTIME — FIGHT FOR THE POINT':scoreR>scoreB?'RED TEAM LEADS':'BLU TEAM LEADS')}updateHud()}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.04,(now-prev)/1000);prev=now;if(running)update(dt);renderer.render(scene,camera)}let prev=performance.now();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});requestAnimationFrame(loop);