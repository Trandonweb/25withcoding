import sys
from playwright.sync_api import sync_playwright
SRC, OUT = sys.argv[1], sys.argv[2]
errs, cons = [], []
def R(n, ok, d=""): print(f"[{'PASS' if ok else 'FAIL'}] {n} {d}")
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width":1280,"height":720})
    pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: cons.append(m.text) if m.type in("error","warning") else None)
    pg.goto("file://"+SRC); pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/v2_menu.png")
    pg.click("#start"); pg.wait_for_timeout(500)
    T = lambda: pg.evaluate("(()=>{const t=window.__TR;return {st:t.state,x:t.P.x,z:t.P.z,face:t.P.face,atk:t.P.atk,hv:t.P.hv,cd:t.P.cd.h,combo:t.P.combo,hp0:t.E[0]&&t.E[0].hp,ex:t.E[0]&&t.E[0].x,boss:t.world.boss&&t.world.boss.hp}})()")
    pg.evaluate("window.__TR.P.inv=9999;window.__ctx=[];window.addEventListener('contextmenu',e=>__ctx.push(e.defaultPrevented))")
    pg.screenshot(path=f"{OUT}/v2_idle.png")
    # brightness of sky/backdrop region
    lum = pg.evaluate("(()=>{const c=document.getElementById('c'),g=c.getContext('2d'),w=c.width,h=c.height,d=g.getImageData(0,Math.floor(h*.1),w,Math.floor(h*.45)).data;let s=0;for(let i=0;i<d.length;i+=4)s+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];return s/(d.length/4)})()")
    R("backdrop mean luminance > 100 (was ~25 before)", lum>100, f"{lum:.0f}/255")
    # left click aims toward cursor
    pg.mouse.click(1000,300); pg.wait_for_timeout(40); a=T(); R("LMB attacks toward cursor (right)", a['atk']>0 and a['face']==1 and a['hv']==0, str(a))
    pg.wait_for_timeout(400); pg.mouse.click(150,300); pg.wait_for_timeout(40); a=T(); R("LMB toward cursor (left) flips facing", a['atk']>0 and a['face']==-1, f"face={a['face']}")
    pg.screenshot(path=f"{OUT}/v2_lmb_left.png")
    pg.wait_for_timeout(400)
    # right click heavy attack on a real enemy
    pg.evaluate("(()=>{const t=window.__TR,e=t.E[0];t.P.x=e.x-90;t.P.z=e.z;t.P.face=1})()"); pg.wait_for_timeout(300)
    h0=T()['hp0']; pg.mouse.click(1000,300,button='right'); pg.wait_for_timeout(60); a=T()
    R("RMB heavy attack starts (hv=1, cooldown)", a['hv']==1 and a['cd']>0 and a['atk']>0, f"atk={a['atk']:.2f} cd={a['cd']:.2f}")
    pg.screenshot(path=f"{OUT}/v2_rmb.png")
    pg.wait_for_timeout(200); a2=T(); R("RMB damaged the enemy", (a2['hp0'] or 0)<h0 or a2['hp0'] is None, f"{h0}->{a2['hp0']}")
    R("context menu suppressed", all(pg.evaluate("window.__ctx")) and len(pg.evaluate("window.__ctx"))>=1, str(pg.evaluate("window.__ctx")))
    pg.wait_for_timeout(1400); a3=T(); R("RMB cooldown expires", a3['cd']==0, str(a3['cd']))
    # held buttons auto-repeat
    pg.mouse.move(1000,300); pg.mouse.down(); pg.wait_for_timeout(900); k=T()['combo']; pg.mouse.up(); R("holding LMB repeats attacks", k>=3, f"combo={k}")
    # keys alias
    pg.wait_for_timeout(500); pg.keyboard.press("KeyL"); pg.wait_for_timeout(50); R("L = heavy", T()['hv']==1)
    # menu click must not trigger attacks / no errors on restart path
    pg.evaluate("window.__TR.P.inv=9999")
    # screenshots of each zone with movement pose
    pg.wait_for_timeout(800)
    pg.keyboard.down("KeyD"); pg.wait_for_timeout(350); pg.screenshot(path=f"{OUT}/v2_run.png"); pg.keyboard.up("KeyD")
    pg.keyboard.press("Space"); pg.wait_for_timeout(170); pg.screenshot(path=f"{OUT}/v2_jump.png")
    pg.wait_for_timeout(800)
    for z,x0,nm in [(2,1500,'z2'),(3,3000,'z3')]:
        pg.evaluate(f"(()=>{{const t=window.__TR;t.P.x={x0};t.P.z=40;t.P.inv=9999;t.world.zone={z};t.E.length=0}})()"); pg.wait_for_timeout(1800)
        pg.screenshot(path=f"{OUT}/v2_{nm}.png")
    pg.evaluate("(()=>{const t=window.__TR;t.P.x=t.world.len-760;t.P.z=60;t.P.inv=9999})()"); pg.wait_for_timeout(900); pg.screenshot(path=f"{OUT}/v2_boss.png")
    print("pageerrors:", errs, "| console:", cons); b.close()
