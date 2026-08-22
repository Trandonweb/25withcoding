import math
import random
import time
import pygame

try:
    import cv2
except Exception:
    cv2 = None

WIDTH, HEIGHT = 1280, 720
FPS = 60
WHITE=(245,247,250); BLACK=(12,14,18); MUTED=(160,169,181)
FIELD=(68,132,68); DIRT=(169,116,70); SKY=(116,174,222)
RED=(211,65,58); BLUE=(55,108,184); GOLD=(239,190,67); GREEN=(38,153,88)
PITCH_COLORS={"포심":(232,232,235),"투심":(218,218,220),"슬라이더":(244,208,86),"커브":(192,116,224),"체인지업":(90,178,226),"포크":(242,145,83)}
PITCH_DATA={
    "포심":(150,0.00,0.00,0.78), "투심":(146,0.08,0.01,0.82),
    "슬라이더":(132,0.20,0.09,0.91), "커브":(118,-0.05,0.25,1.05),
    "체인지업":(126,-0.08,0.13,1.16), "포크":(138,0.02,0.32,1.00)
}

pygame.init(); pygame.display.set_caption("SCREEN BASEBALL")
screen=pygame.display.set_mode((WIDTH,HEIGHT),pygame.RESIZABLE); clock=pygame.time.Clock()
FONT=pygame.font.SysFont("malgungothic",20); SMALL=pygame.font.SysFont("malgungothic",16)
TINY=pygame.font.SysFont("malgungothic",13); BIG=pygame.font.SysFont("malgungothic",28,True); HUGE=pygame.font.SysFont("malgungothic",54,True)

def clamp(v,a,b): return max(a,min(b,v))
def lerp(a,b,t): return a+(b-a)*t

def txt(s,v,p,f=FONT,c=WHITE,anchor="topleft"):
    im=f.render(str(v),True,c); r=im.get_rect(); setattr(r,anchor,p); s.blit(im,r); return r

def box(s,r,c,rad=10,b=0,bc=None):
    pygame.draw.rect(s,c,r,border_radius=rad)
    if b and bc: pygame.draw.rect(s,bc,r,b,border_radius=rad)

class Camera:
    def project(self,x,z,y=0):
        z=clamp(z,0,1); hy,py=145,610; sy=py-(py-hy)*z
        return int(WIDTH/2+x*(610-475*z)),int(sy-y*(170-75*z))
cam=Camera()

def stadium(s):
    s.fill(SKY)
    pygame.draw.rect(s,(43,47,53),(0,125,WIDTH,130))
    for x in range(0,WIDTH,52): pygame.draw.rect(s,(67,70,76),(x,165,38,80))
    pygame.draw.polygon(s,FIELD,[(0,250),(WIDTH,250),(WIDTH,HEIGHT),(0,HEIGHT)])
    for i in range(11):
        y=260+i*42; c=(75,142,72) if i%2==0 else (68,132,67)
        pygame.draw.polygon(s,c,[(0,y),(WIDTH,y),(WIDTH,y+42),(0,y+42)])
    pygame.draw.polygon(s,(153,103,63),[(0,246),(WIDTH,246),(WIDTH,272),(0,272)])
    pygame.draw.line(s,WHITE,(640,610),(0,265),4); pygame.draw.line(s,WHITE,(640,610),(1280,265),4)
    h=cam.project(0,0); f=cam.project(.88,.35); se=cam.project(0,.70); th=cam.project(-.88,.35)
    pygame.draw.polygon(s,DIRT,[h,f,se,th])
    pygame.draw.polygon(s,(52,119,59),[cam.project(0,.07),cam.project(.73,.37),cam.project(0,.64),cam.project(-.73,.37)])
    m=cam.project(0,.48); pygame.draw.ellipse(s,(193,137,82),(m[0]-52,m[1]-12,104,26)); pygame.draw.rect(s,WHITE,(m[0]-15,m[1]-3,30,6))
    for x,z in [(0,.02),(.88,.35),(0,.70),(-.88,.35)]:
        p=cam.project(x,z); q=int(9+z*5); pygame.draw.polygon(s,WHITE,[(p[0],p[1]-q),(p[0]+q,p[1]),(p[0],p[1]+q),(p[0]-q,p[1])])
    pygame.draw.polygon(s,WHITE,[(623,600),(657,600),(657,614),(640,626),(623,614)])

def player(s,x,z,uniform,scale=1,bat=False,throw=0):
    px,py=cam.project(x,z); d=1-z; h=int(120*(.65+d*.6)*scale); w=max(16,int(h*.35)); r=max(8,int(h*.105))
    pygame.draw.ellipse(s,(34,47,34),(px-w,py+5,2*w,13))
    pygame.draw.line(s,WHITE,(px-8,py-3),(px-15,py+h//2),max(4,w//6)); pygame.draw.line(s,WHITE,(px+8,py-3),(px+15,py+h//2),max(4,w//6))
    box(s,(px-w//2,py-h//2,w,int(h*.55)),uniform,7)
    pygame.draw.circle(s,(221,177,143),(px,py-h//2-r),r)
    arm=py-h//2-int(h*.13)
    pygame.draw.line(s,(221,177,143),(px-w//2,arm),(px-w-2,arm+12),max(4,w//5))
    pygame.draw.line(s,(221,177,143),(px+w//2,arm),(px+w+3,arm+4),max(4,w//5))
    if bat:
        a=-68+clamp(throw,0,1)*135; L=int(82*(.55+d*.75)*scale); ex=px+math.cos(math.radians(a))*L; ey=arm+math.sin(math.radians(a))*L
        pygame.draw.line(s,(77,52,34),(px+w//2,arm),(ex,ey),max(3,int(w*.16)))
    else:
        a=-105+throw*95; L=int(52*scale); ex=px+math.cos(math.radians(a))*L; ey=arm+math.sin(math.radians(a))*L
        pygame.draw.line(s,(221,177,143),(px+w//2,arm),(ex,ey),max(4,w//5))

def scoreboard(s,g):
    box(s,(18,16,585,84),(11,14,18),10); txt(s,"SCREEN",(36,34),SMALL,MUTED); txt(s,g.score_a,(146,55),BIG,WHITE,"center")
    txt(s,"AI TIGERS",(176,34),SMALL,MUTED); txt(s,g.score_b,(286,55),BIG,WHITE,"center")
    txt(s,f"{g.inning}회 {g.half}",(320,34),SMALL); txt(s,f"{g.outs} OUT",(320,61),BIG,GOLD)
    for i in range(3): pygame.draw.circle(s,GOLD if i<g.balls else (70,75,82),(485+i*18,41),6)
    for i in range(2): pygame.draw.circle(s,RED if i<g.strikes else (70,75,82),(485+i*18,67),6)
    txt(s,"B",(545,34),TINY,MUTED); txt(s,"S",(545,60),TINY,MUTED)

def zone(s,center,aim,show_path=False):
    x,y,w,h=575,310,180,250
    # translucent ABS-style strike zone
    ov=pygame.Surface((w,h),pygame.SRCALPHA); ov.fill((30,80,150,32)); s.blit(ov,(x,y))
    pygame.draw.rect(s,(230,235,240),(x,y,w,h),2)
    for i in (1,2):
        pygame.draw.line(s,(185,195,205),(x+i*w//3,y),(x+i*w//3,y+h),1)
        pygame.draw.line(s,(185,195,205),(x,y+i*h//3),(x+w,y+i*h//3),1)
    cx=x+aim[0]*w; cy=y+aim[1]*h
    pygame.draw.circle(s,RED if center else GOLD,(int(cx),int(cy)),13,3)
    if show_path: pygame.draw.circle(s,WHITE,(int(cx),int(cy)),4)
    txt(s,"ABS STRIKE ZONE",(x+w//2,y-23),TINY,(215,220,226),"center")

def pitch_buttons(s,g):
    names=list(PITCH_DATA); x=1110
    for i,n in enumerate(names):
        y=205+i*64; active=n==g.pitch
        pygame.draw.circle(s,(29,34,41),(x,y),25)
        pygame.draw.circle(s,PITCH_COLORS[n] if active else (95,102,111),(x,y),25,3)
        txt(s,n,(x-43,y+34),TINY,WHITE if active else MUTED)
        txt(s,str(PITCH_DATA[n][0]),(x,y),SMALL,WHITE,"center")

def control_gauge(s,g):
    x,y,w=420,625,440; box(s,(x,y,w,42),(14,17,21),9)
    pygame.draw.rect(s,(210,64,58),(x+10,y+14,95,13),6); pygame.draw.rect(s,(226,145,60),(x+105,y+14,85,13),0)
    pygame.draw.rect(s,(46,164,91),(x+190,y+14,60,13),0); pygame.draw.rect(s,(226,145,60),(x+250,y+14,85,13),0); pygame.draw.rect(s,(210,64,58),(x+335,y+14,95,13),6)
    px=x+10+g.control*420; pygame.draw.circle(s,WHITE,(int(px),y+20),8); txt(s,"제구 타이밍",(x+w//2,y-9),TINY,MUTED,"center")

def info(s,g):
    box(s,(18,510,285,112),(15,19,24),10); txt(s,"PITCHER  ACE 01",(34,529),FONT); txt(s,f"{g.pitch}   {PITCH_DATA[g.pitch][0]} km/h",(34,559),SMALL,MUTED); txt(s,f"제구 {g.control_rating}",(34,586),SMALL,GREEN)
    box(s,(970,510,292,112),(15,19,24),10); txt(s,"BATTER  BATTER 01",(988,529),FONT); txt(s,"AVG .318   HR 12   RBI 41",(988,559),SMALL,MUTED); txt(s,"CONTACT 96",(988,586),SMALL,GOLD)

class Ball:
    def __init__(self,g):
        self.t=0; self.done=False; self.pitch=g.pitch; self.speed=PITCH_DATA[self.pitch][0]; self.dx=PITCH_DATA[self.pitch][1]; self.drop=PITCH_DATA[self.pitch][2]; self.target=g.aim
    def update(self,dt):
        self.t+=dt*(1.05+PITCH_DATA[self.pitch][3]*.22)
        if self.t>=1: self.t=1; self.done=True
    def pos(self):
        t=self.t; x0,y0=0,0; tx=(self.target[0]-.5)*.72; ty=(self.target[1]-.5)*.80
        x=lerp(x0,tx,t)+self.dx*(t*t)*(1-t*.35); y=lerp(y0,ty,t)+self.drop*(t*t)
        z=lerp(.48,.045,t); return cam.project(x,z,y),max(3,int(11*(1-t)+3))

class Game:
    def __init__(self):
        self.inning=7; self.half="초"; self.score_a=self.score_b=0; self.outs=0; self.balls=0; self.strikes=0
        self.pitch="포심"; self.aim=(.5,.5); self.control=.5; self.control_rating=94
        self.ball=None; self.phase="ready"; self.windup=0; self.result=""; self.result_t=0; self.message="구종 선택 → 스트라이크존에 목표점 지정 → ENTER로 투구"
    def set_pitch(self,n):
        if self.phase in ("ready","aim"): self.pitch=n; self.message=f"{n} 선택 · 목표점을 정하고 ENTER"
    def aim_at(self,pos):
        if self.phase not in ("ready","aim"): return
        x=clamp((pos[0]-575)/180,0,1); y=clamp((pos[1]-310)/250,0,1); self.aim=(x,y); self.phase="aim"
    def start_pitch(self):
        if self.phase not in ("ready","aim"): return
        self.phase="windup"; self.windup=0; self.control=random.random(); self.control_rating=int(82+18*(1-abs(self.control-.5)*2)); self.message="투구 동작 시작… 릴리스 타이밍!"
    def release(self):
        if self.phase=="windup": self.phase="flight"; self.ball=Ball(self); self.message=f"{self.pitch} {self.ball.speed} km/h"
    def swing(self):
        if self.phase!="flight" or not self.ball: return
        q=1-abs(self.ball.t-.88)/.44; zone_center=abs(self.aim[0]-.5)<.5 and abs(self.aim[1]-.5)<.5
        self.ball.done=True
        if q>.68 and zone_center: self.finish(random.choice(["안타!","2루타!","HOMERUN!"]))
        elif q>.35: self.finish("파울!")
        else: self.finish("헛스윙!")
    def finish(self,r):
        self.result=r; self.result_t=1.25; self.phase="result"; self.message=r
        if r=="HOMERUN!": self.score_a+=1 if self.half=="초" else 0; self.score_b+=1 if self.half=="말" else 0
        elif r in ("헛스윙!",): self.strikes+=1
        elif r=="파울!": self.strikes=min(2,self.strikes+1)
    def resolve_ball(self):
        if self.phase!="flight" or not self.ball or not self.ball.done:return
        # ABS: compare the projected end point to the zone. Borderline calls are visible.
        x,y=self.aim; inside=.03<x<.97 and .02<y<.98
        if inside:self.strikes+=1; self.message=f"STRIKE · ABS {self.pitch}"
        else:self.balls+=1; self.message=f"BALL · ABS 판정"
        self.result="STRIKE" if inside else "BALL"; self.result_t=.85; self.phase="result"
    def update(self,dt):
        if self.phase=="windup":
            self.windup+=dt
            if self.windup>=.72:self.release()
        elif self.phase=="flight":
            self.ball.update(dt)
            if self.ball.done:self.resolve_ball()
        elif self.phase=="result":
            self.result_t-=dt
            if self.result_t<=0:
                if self.strikes>=3:self.outs+=1; self.strikes=0; self.balls=0
                if self.balls>=4:self.balls=self.strikes=0
                if self.outs>=3:self.outs=0; self.half="말" if self.half=="초" else "초"; self.inning+=1 if self.half=="초" else 0
                self.ball=None; self.result=""; self.phase="ready"; self.message="다음 투구: 구종을 선택하세요"
    def draw(self,s):
        stadium(s); player(s,0,.48,(240,240,242),1.1,throw=clamp(self.windup/.72,0,1)); player(s,-.37,.01,(27,70,135),1.3,bat=True)
        if self.ball and self.phase in ("flight","result") and not self.ball.done:
            p,r=self.ball.pos(); pygame.draw.circle(s,WHITE,p,r); pygame.draw.circle(s,(160,160,160),p,r,1)
        scoreboard(s,self); zone(s,self.phase in ("flight","result"),self.aim,self.phase=="flight"); pitch_buttons(s,self); control_gauge(s,self); info(s,self)
        box(s,(305,645,665,45),(12,15,19),9); txt(s,self.message,(325,668),SMALL,WHITE,"left")
        if self.result_t>0:
            txt(s,self.result,(640,355),HUGE,WHITE,"center")
            if self.result in ("STRIKE","BALL") and self.ball:
                txt(s,"ABS REVIEW",(640,402),SMALL,MUTED,"center")

class SwingDetector:
    def __init__(self):
        self.cap=None; self.prev=None; self.cool=0
        if cv2:
            try:self.cap=cv2.VideoCapture(0,cv2.CAP_DSHOW)
            except Exception:self.cap=None
    def update(self,dt):
        if not self.cap or not self.cap.isOpened():return False
        self.cool=max(0,self.cool-dt); ok,f=self.cap.read()
        if not ok:return False
        g=cv2.resize(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),(64,36)); p=self.prev or g; self.prev=g
        if self.cool<=0 and float(cv2.mean(cv2.absdiff(g,p))[0])>16:self.cool=.45; return True
        return False
    def close(self):
        if self.cap:self.cap.release()

def main():
    global screen
    g=Game(); camdet=SwingDetector(); run=True
    while run:
        dt=clock.tick(FPS)/1000
        for e in pygame.event.get():
            if e.type==pygame.QUIT:run=False
            elif e.type==pygame.VIDEORESIZE:screen=pygame.display.set_mode(e.size,pygame.RESIZABLE)
            elif e.type==pygame.KEYDOWN:
                if e.key==pygame.K_ESCAPE:run=False
                elif e.key==pygame.K_RETURN:g.start_pitch()
                elif e.key==pygame.K_SPACE:g.swing()
                elif e.key==pygame.K_1:g.set_pitch("포심")
                elif e.key==pygame.K_2:g.set_pitch("투심")
                elif e.key==pygame.K_3:g.set_pitch("슬라이더")
                elif e.key==pygame.K_4:g.set_pitch("커브")
                elif e.key==pygame.K_5:g.set_pitch("체인지업")
                elif e.key==pygame.K_6:g.set_pitch("포크")
            elif e.type==pygame.MOUSEBUTTONDOWN and e.button==1:
                if 1080<e.pos[0]<1140:
                    idx=round((e.pos[1]-205)/64); names=list(PITCH_DATA)
                    if 0<=idx<len(names):g.set_pitch(names[idx])
                elif 575<=e.pos[0]<=755 and 310<=e.pos[1]<=560:g.aim_at(e.pos)
                else:g.swing()
        if camdet.update(dt):g.swing()
        g.update(dt)
        frame=pygame.Surface((WIDTH,HEIGHT)); g.draw(frame); sw,sh=screen.get_size(); screen.blit(pygame.transform.smoothscale(frame,(sw,sh)),(0,0)); pygame.display.flip()
    camdet.close(); pygame.quit()

if __name__=="__main__":main()
