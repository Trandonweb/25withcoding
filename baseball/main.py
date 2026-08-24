import argparse
import json
import math
import os
import random
import socket
import threading
import time

import pygame

try:
    import cv2
except Exception:
    cv2 = None

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision
except Exception:
    mp = mp_python = vision = None

W, H = 1280, 720
FPS = 60
TEAM_HOME, TEAM_AWAY = "SCREEN", "AI TIGERS"
WHITE=(245,247,250); TEXT=(232,235,239); MUTED=(153,162,173)
GREEN=(35,145,78); DARK=(9,13,18); RED=(218,62,62); GOLD=(242,190,66)
BLUE=(57,108,180); CYAN=(79,190,214); GRASS=(53,125,62); DIRT=(157,103,64)

pygame.init()
pygame.display.set_caption("SCREEN BASEBALL — Broadcast Edition")
screen=pygame.display.set_mode((W,H),pygame.RESIZABLE)
clock=pygame.time.Clock()
FONT=pygame.font.SysFont("malgungothic",20)
SMALL=pygame.font.SysFont("malgungothic",16)
TINY=pygame.font.SysFont("malgungothic",13)
BOLD=pygame.font.SysFont("malgungothic",24,bold=True)
BIG=pygame.font.SysFont("malgungothic",36,bold=True)
HUGE=pygame.font.SysFont("malgungothic",64,bold=True)

def clamp(v,a,b): return max(a,min(b,v))
def lerp(a,b,t): return a+(b-a)*t
def ease(t): return 1-(1-t)**3

def text(s,v,pos,font=FONT,color=TEXT,anchor="topleft"):
    img=font.render(str(v),True,color); r=img.get_rect(); setattr(r,anchor,pos); s.blit(img,r); return r

def box(s,r,color=DARK,radius=10,border=0,border_color=None):
    pygame.draw.rect(s,color,r,border_radius=radius)
    if border and border_color: pygame.draw.rect(s,border_color,r,border,border_radius=radius)

def alpha_box(s,r,color,radius=10,border=0,border_color=None):
    layer=pygame.Surface(r.size,pygame.SRCALPHA)
    pygame.draw.rect(layer,color,layer.get_rect(),border_radius=radius)
    if border and border_color: pygame.draw.rect(layer,(*border_color,255),layer.get_rect(),border,border_radius=radius)
    s.blit(layer,r.topleft)

class Camera:
    """Low third-person broadcast camera: batter in foreground, pitcher centered in depth."""
    def project(self,x,z,y=0):
        z=clamp(z,0,1)
        py=lerp(646,205,z)-y*lerp(230,90,z)
        width=lerp(850,255,z)
        return int(W*.5+x*width),int(py)
    def scale(self,z): return lerp(1.25,.34,clamp(z,0,1))
CAM=Camera()

def stadium(s):
    for y in range(H):
        t=y/H; c=(int(67+42*t),int(118+35*t),int(166+34*t)); pygame.draw.line(s,c,(0,y),(W,y))
    # upper deck / crowd
    pygame.draw.rect(s,(25,29,35),(0,146,W,145))
    pygame.draw.rect(s,(16,19,24),(0,216,W,75))
    for row in range(5):
        y=222+row*13
        for x in range(-10,W,16):
            c=(72+(x//16+row)%4*9,76,83)
            pygame.draw.rect(s,c,(x,y,10,6),border_radius=2)
    # scoreboard in center field
    box(s,pygame.Rect(515,116,250,62),(12,16,21),7,1,(76,85,96))
    text(s,"SCREEN BASEBALL",(640,129),SMALL,(211,216,221),"center")
    text(s,"LIVE",(640,158),BOLD,RED,"center")

def field(s):
    pygame.draw.polygon(s,(48,119,59),[(0,288),(W,288),(W,H),(0,H)])
    for i in range(12):
        y0=int(288+i*(H-288)/12); y1=int(288+(i+1)*(H-288)/12)
        c=(47,118,58) if i%2 else (53,129,63)
        pygame.draw.rect(s,c,(0,y0,W,y1-y0))
    # warning track
    pygame.draw.rect(s,(139,91,60),(0,280,W,20))
    home=CAM.project(0,0); left=CAM.project(-1,1); right=CAM.project(1,1)
    pygame.draw.line(s,(244,244,238),home,left,3); pygame.draw.line(s,(244,244,238),home,right,3)
    first=CAM.project(.82,.31); second=CAM.project(0,.64); third=CAM.project(-.82,.31)
    pygame.draw.polygon(s,DIRT,[home,first,second,third])
    pygame.draw.polygon(s,(45,115,56),[CAM.project(0,.05),CAM.project(.69,.34),CAM.project(0,.60),CAM.project(-.69,.34)])
    for bx,bz in [(0,.02),(.82,.31),(0,.64),(-.82,.31)]:
        x,y=CAM.project(bx,bz); q=int(6+8*(1-bz)); pygame.draw.polygon(s,(246,246,241),[(x,y-q),(x+q,y),(x,y+q),(x-q,y)])
    x,y=CAM.project(0,.47); pygame.draw.ellipse(s,(188,127,77),(x-54,y-12,108,25)); pygame.draw.rect(s,(245,245,239),(x-17,y-3,34,6))
    x,y=CAM.project(0,0); pygame.draw.polygon(s,(247,247,241),[(x-19,y-10),(x+19,y-10),(x+17,y+5),(x,y+18),(x-17,y+5)])

def player(s,x,z,uniform,accent=(240,240,240),scale=1,swing=0,hand="R"):
    px,py=CAM.project(x,z); k=CAM.scale(z)*scale
    bh=max(34,int(128*k)); bw=max(16,int(48*k)); hr=max(6,int(14*k))
    pygame.draw.ellipse(s,(27,65,34),(px-int(bw*.95),py+int(10*k),int(bw*1.9),max(5,int(13*k))))
    pygame.draw.line(s,(220,220,218),(px-int(7*k),py+int(bh*.02)),(px-int(12*k),py+int(bh*.34)),max(2,int(7*k)))
    pygame.draw.line(s,(220,220,218),(px+int(7*k),py+int(bh*.02)),(px+int(12*k),py+int(bh*.34)),max(2,int(7*k)))
    body=pygame.Rect(px-bw//2,py-bh//2,bw,int(bh*.57)); pygame.draw.rect(s,uniform,body,border_radius=max(3,int(8*k))); pygame.draw.rect(s,accent,body,max(1,int(2*k)),border_radius=max(3,int(8*k)))
    hy=py-bh//2-hr+2; pygame.draw.circle(s,(215,168,134),(px,hy),hr); pygame.draw.arc(s,(24,26,30),(px-hr-2,hy-hr,hr*2+4,hr+10),math.pi,math.tau,max(2,int(3*k)))
    sy=py-int(bh*.12); hx=px+int(25*k) if hand=="R" else px-int(25*k)
    pygame.draw.line(s,(215,168,134),(px-int(17*k),sy),(hx,sy+int(12*k)),max(2,int(7*k))); pygame.draw.line(s,(215,168,134),(px+int(17*k),sy),(hx,sy+int(10*k)),max(2,int(7*k)))
    bl=int(88*k); ang=-64+swing*118
    if hand=="L": ang=244-swing*118
    ex=hx+math.cos(math.radians(ang))*bl; ey=sy+math.sin(math.radians(ang))*bl
    pygame.draw.line(s,(79,53,35),(hx,sy+int(5*k)),(int(ex),int(ey)),max(2,int(6*k)))

def draw_ball(s,x,y,r):
    pygame.draw.circle(s,(250,250,245),(x,y),r+2); pygame.draw.circle(s,(214,45,45),(x,y),max(1,r//3),1)

class Pitch:
    def __init__(self,target,speed=.88,curve=0):
        self.target=target; self.t=0; self.speed=speed; self.curve=curve; self.done=False
        row,col=(target-1)//3,(target-1)%3; self.ex=(col-1)*.13; self.ey=(row-1)*.10
    def update(self,dt):
        self.t=min(1,self.t+dt*self.speed); self.done=self.t>=1
    def pos(self):
        t=ease(self.t); z=lerp(.49,.045,t); x=lerp(0,self.ex,t)+math.sin(t*math.pi)*self.curve*.10; y=math.sin(t*math.pi)*.08+self.ey*t
        return CAM.project(x,z,y)
    def radius(self): return int(3+11*ease(self.t))

class SwingDetector:
    def __init__(self):
        self.cap=None; self.landmarker=None; self.last_x=None; self.last_t=None; self.cool=0; self.preview=None
        if cv2 is None: return
        try:
            self.cap=cv2.VideoCapture(0,cv2.CAP_DSHOW)
            if not self.cap.isOpened(): self.cap.release(); self.cap=None; return
            if mp and mp_python and vision:
                path=os.path.join(os.path.dirname(__file__),"models","hand_landmarker.task")
                if os.path.exists(path):
                    base=mp_python.BaseOptions(model_asset_path=path)
                    opt=vision.HandLandmarkerOptions(base_options=base,running_mode=vision.RunningMode.IMAGE,num_hands=1,min_hand_detection_confidence=.45,min_hand_presence_confidence=.45,min_tracking_confidence=.45)
                    self.landmarker=vision.HandLandmarker.create_from_options(opt)
        except Exception: self.landmarker=None
    def update(self,dt):
        self.cool=max(0,self.cool-dt)
        if not self.cap: return False
        ok,frame=self.cap.read()
        if not ok:return False
        frame=cv2.flip(frame,1); self.preview=cv2.resize(frame,(240,135))
        if self.landmarker:
            try:
                rgb=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB); img=mp.Image(image_format=mp.ImageFormat.SRGB,data=rgb); r=self.landmarker.detect(img)
                if r.hand_landmarks:
                    wrist=r.hand_landmarks[0][0]; now=time.perf_counter()
                    if self.last_x is not None and self.last_t is not None and abs(wrist.x-self.last_x)/max(.001,now-self.last_t)>1.05 and self.cool<=0:
                        self.cool=.45; self.last_x,self.last_t=wrist.x,now; return True
                    self.last_x,self.last_t=wrist.x,now
            except Exception: pass
        return False
    def surface(self):
        if self.preview is None:return None
        rgb=cv2.cvtColor(self.preview,cv2.COLOR_BGR2RGB); return pygame.image.frombuffer(rgb.tobytes(),rgb.shape[1::-1],"RGB").copy()
    def close(self):
        if self.landmarker:
            try:self.landmarker.close()
            except Exception:pass
        if self.cap:self.cap.release()

class LANPeer:
    def __init__(self,mode=None,address=None,port=5000): self.mode=mode; self.address=address; self.port=port; self.sock=None; self.conn=None; self.inbox=[]; self.lock=threading.Lock()
    def start(self):
        try:
            if self.mode=="host":
                self.sock=socket.socket(socket.AF_INET,socket.SOCK_STREAM); self.sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); self.sock.bind(("0.0.0.0",self.port)); self.sock.listen(1); self.sock.settimeout(.2); threading.Thread(target=self.accept,daemon=True).start()
            elif self.mode=="join": self.conn=socket.create_connection((self.address,self.port),timeout=2); threading.Thread(target=self.receive,daemon=True).start()
        except Exception:self.sock=self.conn=None
    def accept(self):
        while self.sock:
            try:self.conn,_=self.sock.accept(); threading.Thread(target=self.receive,daemon=True).start(); return
            except socket.timeout:continue
            except Exception:return
    def receive(self):
        buf=b""
        while self.conn:
            try:
                data=self.conn.recv(4096)
                if not data:return
                buf+=data
                while b"\n" in buf:
                    raw,buf=buf.split(b"\n",1)
                    try:
                        with self.lock:self.inbox.append(json.loads(raw.decode()))
                    except Exception:pass
            except Exception:return
    def send(self,msg):
        if self.conn:
            try:self.conn.sendall((json.dumps(msg,ensure_ascii=False)+"\n").encode())
            except Exception:pass
    def poll(self):
        with self.lock:r=self.inbox[:]; self.inbox.clear(); return r
    def close(self):
        for s in (self.conn,self.sock):
            try:
                if s:s.close()
            except Exception:pass

class Game:
    def __init__(self,peer=None):
        self.peer=peer; self.inning=7; self.half="초"; self.home_score=self.away_score=0; self.outs=self.balls=self.strikes=0; self.runners=[False]*3
        self.pitch=None; self.target=5; self.pitch_speed=.88; self.swing_timer=99; self.result=""; self.result_timer=0; self.message="ENTER로 투구 · SPACE 또는 웹캠으로 스윙"; self.paused=False; self.game_over=False; self.pitch_count=0
        self.pitcher=("AI TIGERS","P","151 km/h"); self.batter=("SCREEN","4번 타자",".333")
    def reset(self): self.__init__(self.peer)
    def next_pitch(self):
        if self.game_over or self.paused or (self.pitch and not self.pitch.done):return
        self.target=random.randint(1,9); self.pitch_speed=random.uniform(.76,1); curve=random.choice([-.55,-.3,0,.3,.55]); self.pitch=Pitch(self.target,self.pitch_speed,curve); self.pitch_count+=1; self.message="투구 시작 · 공을 끝까지 보고 스윙"
        if self.peer:self.peer.send({"type":"pitch","target":self.target,"speed":self.pitch_speed,"curve":curve})
    def swing(self):
        if self.game_over or self.paused:return
        if not self.pitch or self.pitch.done:self.message="먼저 ENTER로 투구하세요"; return
        timing=clamp(1-abs(self.pitch.t-.84)/.28,-1,1); self.pitch.done=True; self.swing_timer=0
        if timing>=.76:self.hit(random.choices(["홈런","2루타","안타"],[12,23,65])[0],"PERFECT")
        elif timing>=.42:
            r=random.choices(["안타","파울","뜬공"],[48,34,18])[0]
            if r=="파울":self.strikes=min(2,self.strikes+1); self.message="파울"; self.show("FOUL")
            elif r=="뜬공":self.outs+=1; self.message="뜬공 아웃"; self.show("OUT"); self.advance()
            else:self.hit("안타","GOOD")
        else:
            self.strikes+=1; self.message=f"헛스윙 · 스트라이크 {self.strikes}"; self.show("STRIKE")
            if self.strikes>=3:self.outs+=1; self.strikes=self.balls=0; self.message="삼진 아웃"; self.show("STRIKEOUT"); self.advance()
        if self.peer:self.peer.send({"type":"swing"})
    def hit(self,r,q):
        self.balls=self.strikes=0; self.message=f"{r} · {q}"; self.show(r.upper())
        if r=="홈런":
            score=1+sum(self.runners); self.away_score+=score if self.half=="초" else 0; self.home_score+=score if self.half=="말" else 0; self.runners=[False]*3
        elif r=="2루타":self.runners=[False,True,self.runners[0]]
        else:self.runners=[True,self.runners[0],self.runners[1]]
        self.advance()
    def show(self,v):self.result=v; self.result_timer=1.1
    def advance(self):
        self.pitch=None
        if self.outs<3:return
        self.outs=self.balls=self.strikes=0; self.runners=[False]*3
        if self.half=="초":self.half="말"
        else:self.half="초"; self.inning+=1
        if self.inning>9 and self.home_score!=self.away_score:self.game_over=True; self.message="경기 종료"
        elif self.inning>9:self.runners=[True,True,False]; self.message="연장 승부 · 1, 2루 주자 배치"
        else:self.message=f"{self.inning}회 {self.half} 시작"
    def update(self,dt):
        if self.paused or self.game_over:return
        if self.pitch and not self.pitch.done:
            self.pitch.update(dt)
            if self.pitch.done:
                self.balls+=1; self.message=f"볼 · {self.balls}"; self.show("BALL")
                if self.balls>=4:self.balls=self.strikes=0; self.message="볼넷"; self.show("WALK"); self.advance()
        self.swing_timer+=dt; self.result_timer=max(0,self.result_timer-dt)

def scoreboard(s,g):
    box(s,pygame.Rect(18,15,660,88),(9,13,18),9)
    for i,(name,score) in enumerate([(TEAM_AWAY,g.away_score),(TEAM_HOME,g.home_score)]):
        x=28+i*174; box(s,pygame.Rect(x,24,166,68),(27,33,41),7); text(s,name,(x+12,35),SMALL,MUTED); text(s,score,(x+150,56),BIG,WHITE,"right")
    text(s,f"{g.inning}회",(390,32),SMALL,WHITE); text(s,g.half,(390,57),BOLD,GOLD)
    text(s,"B",(470,30),TINY,MUTED)
    for i in range(3):pygame.draw.circle(s,GOLD if i<g.balls else (62,69,77),(494+i*15,34),5)
    text(s,"S",(470,58),TINY,MUTED)
    for i in range(2):pygame.draw.circle(s,RED if i<g.strikes else (62,69,77),(494+i*15,62),5)
    text(s,f"{g.outs} OUT",(560,27),TINY,MUTED); text(s,"LIVE",(560,52),SMALL,RED)
    cx,cy=642,62
    for i,(dx,dy) in enumerate([(0,16),(16,0),(0,-16),(-16,0)]):
        filled=(i==0 and g.runners[0]) or (i==1 and g.runners[1]) or (i==2 and g.runners[2]); pygame.draw.polygon(s,GOLD if filled else (68,75,83),[(cx+dx,cy+dy-5),(cx+dx+5,cy+dy),(cx+dx,cy+dy+5),(cx+dx-5,cy+dy)])

def card(s,r,title,name,sub,accent):
    box(s,r,(12,17,23),9,1,(65,75,87)); x,y,_,_=r; pygame.draw.rect(s,accent,(x,y,4,r.h),border_radius=3); text(s,title,(x+15,y+11),TINY,MUTED); text(s,name,(x+15,y+29),BOLD,WHITE); text(s,sub,(x+15,y+59),TINY,accent)

def strike_zone(s,g):
    # Small in-world target instead of a giant floating UI grid.
    x,y,w,h=573,337,134,174; pygame.draw.rect(s,(245,245,240),(x,y,w,h),2)
    for i in range(1,3): pygame.draw.line(s,(235,235,230),(x+i*w//3,y),(x+i*w//3,y+h),1); pygame.draw.line(s,(235,235,230),(x,y+i*h//3),(x+w,y+i*h//3),1)
    if g.pitch and not g.pitch.done:
        row,col=(g.target-1)//3,(g.target-1)%3; cx=x+(col+.5)*w/3; cy=y+(row+.5)*h/3; pygame.draw.circle(s,(120,225,120),(int(cx),int(cy)),18,2)

def scene(s,g):
    stadium(s); field(s)
    # defensive alignment
    player(s,-.73,.76,(27,61,42),scale=.92); player(s,0,.88,(27,61,42),scale=.82); player(s,.73,.76,(27,61,42),scale=.92)
    player(s,0,.48,(23,42,72),(106,147,207),1.38) # pitcher
    player(s,0,.035,(35,47,38),(188,190,184),.94) # catcher
    swing=clamp(g.swing_timer/.24,0,1) if g.swing_timer<.24 else 1
    player(s,.48,.035,(37,72,145),(232,236,242),2.65,swing) # batter
    # pitch trail
    if g.pitch and not g.pitch.done:
        pts=[]
        for i in range(8):
            old=g.pitch.t; g.pitch.t=clamp(old-i*.035,0,1); pts.append(g.pitch.pos()); g.pitch.t=old
        for i in range(len(pts)-1):
            pygame.draw.line(s,(245,245,245,120),(pts[i]),(pts[i+1]),max(1,4-i//2))
        bx,by=g.pitch.pos(); draw_ball(s,bx,by,g.pitch.radius())
    scoreboard(s,g)
    card(s,pygame.Rect(20,124,220,92),"BATTER","SCREEN","4번 타자   AVG .333",BLUE)
    card(s,pygame.Rect(1040,124,220,92),"PITCHER","AI TIGERS","P   151 km/h",RED)
    # subtle camera focus line
    alpha_box(s,pygame.Rect(520,307,240,234),(5,10,15,22),12,1,(220,225,230))
    strike_zone(s,g)
    box(s,pygame.Rect(948,542,312,68),(10,15,21),9); text(s,"PITCH",(965,555),TINY,MUTED); text(s,f"{int(145+13*g.pitch_speed)} km/h",(965,578),BOLD,WHITE); text(s,"4-SEAM FASTBALL",(1130,582),TINY,CYAN,"center")
    if g.result_timer>0:
        alpha_box(s,pygame.Rect(0,300,W,105),(7,11,16,145),0); good=g.result in ("홈런","2루타","안타","HOMERUN","2루타","안타"); text(s,g.result,(W//2,353),HUGE,GOLD if good else RED,"center")
    box(s,pygame.Rect(18,651,1244,52),(9,13,18),9); text(s,g.message,(36,677),SMALL,WHITE,"left"); box(s,pygame.Rect(1050,659,194,36),(31,105,65),8); text(s,"SPACE · SWING",(1147,677),SMALL,WHITE,"center")

def webcam(s,d):
    cam=d.surface()
    if cam is None:return
    r=pygame.Rect(20,535,216,110); box(s,r,(7,11,15),7,1,(80,90,100)); s.blit(pygame.transform.smoothscale(cam,(210,104)),(23,538)); text(s,"CAMERA",(30,544),TINY,WHITE)

def args():
    p=argparse.ArgumentParser(); p.add_argument("--host",action="store_true"); p.add_argument("--join"); p.add_argument("--port",type=int,default=5000); return p.parse_args()

def main():
    a=args(); detector=SwingDetector(); peer=None
    if a.host or a.join: peer=LANPeer("host" if a.host else "join",a.join,a.port); peer.start()
    g=Game(peer); running=True
    while running:
        dt=clock.tick(FPS)/1000
        for e in pygame.event.get():
            if e.type==pygame.QUIT:running=False
            elif e.type==pygame.KEYDOWN:
                if e.key==pygame.K_ESCAPE:running=False
                elif e.key==pygame.K_RETURN:g.next_pitch()
                elif e.key==pygame.K_SPACE:g.swing()
                elif e.key==pygame.K_p:g.paused=not g.paused
                elif e.key==pygame.K_r:g.reset()
        if not g.paused and not g.game_over and detector.update(dt):g.swing()
        g.update(dt)
        if peer:
            for m in peer.poll():
                if m.get("type")=="pitch" and g.pitch is None:g.target=int(m.get("target",5)); g.pitch=Pitch(g.target,float(m.get("speed",.88)),float(m.get("curve",0))); g.pitch_count+=1
                elif m.get("type")=="swing" and g.pitch and not g.pitch.done:g.swing()
        scene(screen,g); webcam(screen,detector)
        if g.paused:
            alpha_box(screen,pygame.Rect(0,0,W,H),(0,0,0,150),0); text(screen,"PAUSED",(W//2,330),HUGE,WHITE,"center"); text(screen,"P 키로 계속",(W//2,390),SMALL,MUTED,"center")
        if g.game_over:
            alpha_box(screen,pygame.Rect(0,0,W,H),(0,0,0,160),0); winner=TEAM_HOME if g.home_score>g.away_score else TEAM_AWAY; text(screen,"GAME SET",(W//2,280),HUGE,GOLD,"center"); text(screen,winner,(W//2,350),BIG,WHITE,"center"); text(screen,"R 키로 새 경기",(W//2,405),SMALL,MUTED,"center")
        pygame.display.flip()
    detector.close(); peer.close() if peer else None; pygame.quit()

if __name__=="__main__":main()
