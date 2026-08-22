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
    mp = None
    mp_python = None
    vision = None

W, H = 1280, 720
FPS = 60
TEAM_HOME = "SCREEN"
TEAM_AWAY = "AI TIGERS"
WHITE = (245, 247, 250)
TEXT = (230, 234, 239)
MUTED = (150, 160, 172)
PANEL = (12, 16, 22)
GREEN = (38, 146, 82)
GRASS = (58, 128, 65)
DIRT = (164, 108, 67)
RED = (214, 63, 61)
GOLD = (241, 190, 67)
CYAN = (82, 190, 214)
BLUE = (55, 105, 173)

pygame.init()
pygame.display.set_caption("SCREEN BASEBALL — Broadcast Edition")
screen = pygame.display.set_mode((W, H), pygame.RESIZABLE)
clock = pygame.time.Clock()
FONT = pygame.font.SysFont("malgungothic", 20)
SMALL = pygame.font.SysFont("malgungothic", 16)
TINY = pygame.font.SysFont("malgungothic", 13)
BOLD = pygame.font.SysFont("malgungothic", 24, bold=True)
BIG = pygame.font.SysFont("malgungothic", 34, bold=True)
HUGE = pygame.font.SysFont("malgungothic", 62, bold=True)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def lerp(a, b, t):
    return a + (b - a) * t


def ease_out(t):
    return 1 - (1 - t) ** 3


def text(surf, value, pos, font=FONT, color=TEXT, anchor="topleft"):
    img = font.render(str(value), True, color)
    rect = img.get_rect()
    setattr(rect, anchor, pos)
    surf.blit(img, rect)
    return rect


def panel(surf, rect, color=PANEL, radius=12, border=0, border_color=None):
    pygame.draw.rect(surf, color, rect, border_radius=radius)
    if border and border_color:
        pygame.draw.rect(surf, border_color, rect, border, border_radius=radius)


def alpha_rect(surf, rect, color, radius=10, border=0, border_color=None):
    layer = pygame.Surface((rect.w, rect.h), pygame.SRCALPHA)
    pygame.draw.rect(layer, color, layer.get_rect(), border_radius=radius)
    if border and border_color:
        pygame.draw.rect(layer, (*border_color, 255), layer.get_rect(), border, border_radius=radius)
    surf.blit(layer, rect.topleft)


class Camera:
    """Broadcast-style 2.5D projection: home plate is foreground, outfield is depth."""
    def project(self, x, z, y=0.0):
        z = clamp(z, 0.0, 1.0)
        horizon, home = 180, 625
        py = lerp(home, horizon, z)
        field_width = lerp(760, 245, z)
        px = W * 0.5 + x * field_width
        py -= y * lerp(210, 95, z)
        return int(px), int(py)

    def scale(self, z):
        return lerp(1.15, 0.35, clamp(z, 0.0, 1.0))


CAM = Camera()


def draw_gradient_background(surf):
    for y in range(H):
        t = y / H
        c = (int(105 + 18 * t), int(168 + 12 * t), int(220 + 5 * t))
        pygame.draw.line(surf, c, (0, y), (W, y))

    for x, y, w in [(80, 70, 170), (340, 44, 220), (770, 72, 190), (1030, 48, 210)]:
        cloud = pygame.Surface((w, 70), pygame.SRCALPHA)
        for i in range(5):
            pygame.draw.ellipse(cloud, (255, 255, 255, 38), (i * w // 6, 18 - (i % 2) * 8, w // 3, 36))
        surf.blit(cloud, (x, y))


def draw_stands(surf):
    pygame.draw.polygon(surf, (38, 43, 50), [(0, 155), (W, 155), (W, 290), (0, 290)])
    pygame.draw.polygon(surf, (27, 31, 37), [(0, 192), (W, 192), (W, 275), (0, 275)])
    for row in range(5):
        y = 202 + row * 14
        for x in range(-10, W + 20, 17):
            col = (83 + (x // 17 + row) % 3 * 8, 88, 95)
            pygame.draw.rect(surf, col, (x, y, 11, 7), border_radius=2)
    pygame.draw.rect(surf, (17, 20, 24), (0, 270, W, 20))
    for x in range(25, W, 85):
        pygame.draw.rect(surf, (225, 226, 211), (x, 276, 38, 3))
    panel(surf, (500, 116, 280, 70), (18, 22, 28), 8, 1, (82, 90, 101))
    text(surf, "SCREEN BASEBALL", (640, 133), SMALL, (205, 211, 218), "center")
    text(surf, "LIVE", (640, 162), BOLD, RED, "center")


def draw_field(surf):
    pygame.draw.polygon(surf, (72, 137, 69), [(0, 285), (W, 285), (W, H), (0, H)])
    for i in range(13):
        z0, z1 = i / 13, (i + 1) / 13
        y0, y1 = int(lerp(286, H, z0)), int(lerp(286, H, z1))
        c = (61, 130, 66) if i % 2 else (67, 143, 71)
        pygame.draw.polygon(surf, c, [(0, y0), (W, y0), (W, y1), (0, y1)])
    pygame.draw.polygon(surf, (151, 102, 66), [(0, 278), (W, 278), (W, 303), (0, 303)])

    home = CAM.project(0, 0.0)
    left = CAM.project(-1.0, 0.98)
    right = CAM.project(1.0, 0.98)
    pygame.draw.line(surf, (242, 242, 237), home, left, 3)
    pygame.draw.line(surf, (242, 242, 237), home, right, 3)

    first = CAM.project(0.82, 0.31)
    second = CAM.project(0, 0.64)
    third = CAM.project(-0.82, 0.31)
    pygame.draw.polygon(surf, DIRT, [home, first, second, third])
    inner = [CAM.project(0, 0.055), CAM.project(0.70, 0.34), CAM.project(0, 0.60), CAM.project(-0.70, 0.34)]
    pygame.draw.polygon(surf, (51, 121, 60), inner)

    for bx, bz in [(0.0, 0.02), (0.82, 0.31), (0.0, 0.64), (-0.82, 0.31)]:
        px, py = CAM.project(bx, bz)
        size = int(7 + 8 * (1 - bz))
        pygame.draw.polygon(surf, (248, 248, 242), [(px, py - size), (px + size, py), (px, py + size), (px - size, py)])

    mx, my = CAM.project(0, 0.47)
    pygame.draw.ellipse(surf, (193, 135, 82), (mx - 53, my - 12, 106, 27))
    pygame.draw.rect(surf, (245, 245, 239), (mx - 17, my - 3, 34, 6))

    hx, hy = CAM.project(0, 0.0)
    pygame.draw.polygon(surf, (248, 248, 242), [(hx - 19, hy - 10), (hx + 19, hy - 10), (hx + 18, hy + 4), (hx, hy + 18), (hx - 18, hy + 4)])


def draw_player(surf, x, z, uniform, accent=(245, 245, 245), scale=1.0, swing=0.0, handed="R"):
    px, py = CAM.project(x, z)
    s = CAM.scale(z) * scale
    body_h = max(34, int(132 * s))
    body_w = max(16, int(50 * s))
    head_r = max(6, int(14 * s))
    pygame.draw.ellipse(surf, (28, 62, 32), (px - int(body_w * 0.95), py + int(8 * s), int(body_w * 1.9), max(4, int(12 * s))))
    leg_y = py + int(body_h * 0.30)
    pygame.draw.line(surf, (220, 222, 220), (px - 7 * s, py + body_h * 0.05), (px - 11 * s, leg_y), max(2, int(8 * s)))
    pygame.draw.line(surf, (220, 222, 220), (px + 7 * s, py + body_h * 0.05), (px + 11 * s, leg_y), max(2, int(8 * s)))
    body = pygame.Rect(px - body_w // 2, py - body_h // 2, body_w, int(body_h * 0.57))
    pygame.draw.rect(surf, uniform, body, border_radius=max(3, int(9 * s)))
    pygame.draw.rect(surf, accent, body, max(1, int(2 * s)), border_radius=max(3, int(9 * s)))
    head_y = py - body_h // 2 - head_r + 2
    pygame.draw.circle(surf, (216, 170, 135), (px, head_y), head_r)
    pygame.draw.arc(surf, (24, 26, 30), (px - head_r - 2, head_y - head_r, head_r * 2 + 4, head_r + 10), math.pi, math.tau, max(2, int(3 * s)))

    shoulder_y = py - int(body_h * 0.12)
    hand_x = px + int(25 * s) if handed == "R" else px - int(25 * s)
    pygame.draw.line(surf, (216, 170, 135), (px - int(17 * s), shoulder_y), (hand_x, shoulder_y + int(12 * s)), max(2, int(7 * s)))
    pygame.draw.line(surf, (216, 170, 135), (px + int(17 * s), shoulder_y), (hand_x, shoulder_y + int(10 * s)), max(2, int(7 * s)))

    bat_len = int(88 * s)
    angle = -64 + swing * 118
    if handed == "L":
        angle = 244 - swing * 118
    ex = hand_x + math.cos(math.radians(angle)) * bat_len
    ey = shoulder_y + math.sin(math.radians(angle)) * bat_len
    pygame.draw.line(surf, (83, 55, 35), (hand_x, shoulder_y + int(5 * s)), (ex, ey), max(2, int(6 * s)))
    pygame.draw.circle(surf, (115, 77, 46), (int(ex), int(ey)), max(2, int(5 * s)))


class Pitch:
    def __init__(self, target, speed=0.82, curve=0.0):
        self.target = target
        self.t = 0.0
        self.speed = speed
        self.curve = curve
        row, col = (target - 1) // 3, (target - 1) % 3
        self.end_x = (col - 1) * 0.13
        self.end_y = (row - 1) * 0.10
        self.done = False

    def update(self, dt):
        self.t += dt * self.speed
        if self.t >= 1:
            self.t = 1
            self.done = True

    def pos(self):
        t = ease_out(self.t)
        z = lerp(0.47, 0.045, t)
        x = lerp(0, self.end_x, t) + math.sin(t * math.pi) * self.curve * 0.10
        y = math.sin(t * math.pi) * 0.08 + self.end_y * t
        return CAM.project(x, z, y)

    def radius(self):
        return int(3 + 10 * ease_out(self.t))


class SwingDetector:
    """Optional MediaPipe Tasks hand swing detector; SPACE remains the fallback."""
    def __init__(self):
        self.cap = None
        self.landmarker = None
        self.last_x = None
        self.last_t = None
        self.cooldown = 0.0
        self.preview = None
        if cv2 is None:
            return
        try:
            self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
            if not self.cap.isOpened():
                self.cap.release()
                self.cap = None
                return
            if mp is not None and mp_python is not None and vision is not None:
                model_path = os.path.join(os.path.dirname(__file__), "models", "hand_landmarker.task")
                if os.path.exists(model_path):
                    base = mp_python.BaseOptions(model_asset_path=model_path)
                    opts = vision.HandLandmarkerOptions(base_options=base, running_mode=vision.RunningMode.IMAGE, num_hands=1, min_hand_detection_confidence=0.45, min_hand_presence_confidence=0.45, min_tracking_confidence=0.45)
                    self.landmarker = vision.HandLandmarker.create_from_options(opts)
        except Exception:
            self.landmarker = None

    def update(self, dt):
        self.cooldown = max(0.0, self.cooldown - dt)
        if self.cap is None:
            return False
        ok, frame = self.cap.read()
        if not ok:
            return False
        frame = cv2.flip(frame, 1)
        self.preview = cv2.resize(frame, (240, 135))
        if self.landmarker is not None:
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                result = self.landmarker.detect(mp_image)
                if result.hand_landmarks:
                    wrist = result.hand_landmarks[0][0]
                    now = time.perf_counter()
                    if self.last_x is not None and self.last_t is not None:
                        speed = abs(wrist.x - self.last_x) / max(0.001, now - self.last_t)
                        if speed > 1.05 and self.cooldown <= 0:
                            self.cooldown = 0.45
                            self.last_x, self.last_t = wrist.x, now
                            return True
                    self.last_x, self.last_t = wrist.x, now
            except Exception:
                pass
        return False

    def surface(self):
        if self.preview is None or cv2 is None:
            return None
        rgb = cv2.cvtColor(self.preview, cv2.COLOR_BGR2RGB)
        return pygame.image.frombuffer(rgb.tobytes(), rgb.shape[1::-1], "RGB").copy()

    def close(self):
        if self.landmarker is not None:
            try:
                self.landmarker.close()
            except Exception:
                pass
        if self.cap is not None:
            self.cap.release()


class LANPeer:
    def __init__(self, mode=None, address=None, port=5000):
        self.sock = None
        self.conn = None
        self.mode = mode
        self.address = address
        self.port = port
        self.inbox = []
        self.lock = threading.Lock()

    def start(self):
        if self.mode == "host":
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                self.sock.bind(("0.0.0.0", self.port))
                self.sock.listen(1)
                self.sock.settimeout(0.2)
                threading.Thread(target=self._accept, daemon=True).start()
            except Exception:
                self.sock = None
        elif self.mode == "join" and self.address:
            try:
                self.conn = socket.create_connection((self.address, self.port), timeout=2)
                threading.Thread(target=self._receive, daemon=True).start()
            except Exception:
                self.conn = None

    def _accept(self):
        while self.sock:
            try:
                self.conn, _ = self.sock.accept()
                threading.Thread(target=self._receive, daemon=True).start()
                return
            except socket.timeout:
                continue
            except Exception:
                return

    def _receive(self):
        buf = b""
        while self.conn:
            try:
                data = self.conn.recv(4096)
                if not data:
                    return
                buf += data
                while b"\n" in buf:
                    raw, buf = buf.split(b"\n", 1)
                    try:
                        with self.lock:
                            self.inbox.append(json.loads(raw.decode("utf-8")))
                    except Exception:
                        pass
            except Exception:
                return

    def send(self, msg):
        if not self.conn:
            return
        try:
            self.conn.sendall((json.dumps(msg, ensure_ascii=False) + "\n").encode("utf-8"))
        except Exception:
            pass

    def poll(self):
        with self.lock:
            data = self.inbox[:]
            self.inbox.clear()
            return data

    def close(self):
        for s in (self.conn, self.sock):
            try:
                if s:
                    s.close()
            except Exception:
                pass


class Game:
    def __init__(self, peer=None):
        self.peer = peer
        self.inning = 7
        self.half = "초"
        self.home_score = 0
        self.away_score = 0
        self.outs = 0
        self.balls = 0
        self.strikes = 0
        self.runners = [False, False, False]
        self.pitch = None
        self.target = 5
        self.pitch_speed = 0.88
        self.swing_timer = 99.0
        self.result = ""
        self.result_timer = 0.0
        self.message = "ENTER 또는 투구 버튼으로 시작"
        self.paused = False
        self.game_over = False
        self.pitcher = ("AI TIGERS", "P", "151 km/h")
        self.batter = ("SCREEN", "4번 타자", ".333")
        self.pitch_count = 0

    def reset(self):
        peer = self.peer
        self.__init__(peer)

    def next_pitch(self):
        if self.game_over or self.paused or (self.pitch is not None and not self.pitch.done):
            return
        self.target = random.randint(1, 9)
        self.pitch_speed = random.uniform(0.76, 1.00)
        curve = random.choice([-0.55, -0.30, 0, 0.30, 0.55])
        self.pitch = Pitch(self.target, self.pitch_speed, curve)
        self.pitch_count += 1
        self.message = "투구 시작 · 타이밍에 맞춰 스윙"
        if self.peer:
            self.peer.send({"type": "pitch", "target": self.target, "speed": self.pitch_speed, "curve": curve})

    def swing(self):
        if self.game_over or self.paused:
            return
        if self.pitch is None or self.pitch.done:
            self.message = "먼저 ENTER로 투구하세요"
            return
        timing = clamp(1.0 - abs(self.pitch.t - 0.84) / 0.28, -1.0, 1.0)
        self.pitch.done = True
        self.swing_timer = 0.0
        if timing >= 0.76:
            self.resolve_hit(random.choices(["홈런", "2루타", "안타"], weights=[12, 23, 65], k=1)[0], "PERFECT")
        elif timing >= 0.42:
            result = random.choices(["안타", "파울", "뜬공"], weights=[48, 34, 18], k=1)[0]
            if result == "파울":
                self.strikes = min(2, self.strikes + 1)
                self.message = "파울 · 타이밍이 조금 늦었습니다"
                self.show_result("FOUL")
            elif result == "뜬공":
                self.outs += 1
                self.message = "뜬공 아웃"
                self.show_result("OUT")
                self.advance_after_plate()
            else:
                self.resolve_hit("안타", "GOOD")
        else:
            self.strikes += 1
            self.message = f"헛스윙 · 스트라이크 {self.strikes}"
            self.show_result("STRIKE")
            if self.strikes >= 3:
                self.outs += 1
                self.strikes = 0
                self.balls = 0
                self.message = "삼진 아웃"
                self.show_result("STRIKEOUT")
                self.advance_after_plate()
        if self.peer:
            self.peer.send({"type": "swing"})

    def resolve_hit(self, result, quality):
        self.balls = 0
        self.strikes = 0
        self.message = f"{result} · {quality}"
        self.show_result(result.upper())
        if result == "홈런":
            score = 1 + sum(self.runners)
            if self.half == "초":
                self.away_score += score
            else:
                self.home_score += score
            self.runners = [False, False, False]
        elif result == "2루타":
            self.runners = [False, True, False]
        else:
            self.runners = [True, self.runners[0], self.runners[1]]
        self.advance_after_plate()

    def show_result(self, value):
        self.result = value
        self.result_timer = 1.25

    def advance_after_plate(self):
        self.pitch = None
        if self.outs < 3:
            return
        self.outs = self.balls = self.strikes = 0
        self.runners = [False, False, False]
        if self.half == "초":
            self.half = "말"
        else:
            self.half = "초"
            self.inning += 1
        if self.inning > 9:
            if self.home_score != self.away_score:
                self.game_over = True
                self.message = "경기 종료"
                return
            self.runners = [True, True, False]
            self.message = "연장 승부 · 1, 2루 주자 배치"
        else:
            self.message = f"{self.inning}회 {self.half} 시작"

    def update(self, dt):
        if self.paused or self.game_over:
            return
        if self.pitch is not None and not self.pitch.done:
            self.pitch.update(dt)
            if self.pitch.done:
                self.balls += 1
                self.message = f"볼 · {self.balls}"
                self.show_result("BALL")
                if self.balls >= 4:
                    self.balls = self.strikes = 0
                    self.message = "볼넷"
                    self.show_result("WALK")
                    self.advance_after_plate()
        self.swing_timer += dt
        self.result_timer = max(0.0, self.result_timer - dt)


def draw_scoreboard(surf, game):
    panel(surf, (18, 15, 650, 92), (10, 14, 19), 10)
    panel(surf, (28, 25, 170, 68), (28, 34, 42), 7)
    text(surf, TEAM_AWAY, (40, 36), SMALL, MUTED)
    text(surf, game.away_score, (184, 59), BIG, WHITE, "right")
    panel(surf, (204, 25, 170, 68), (28, 34, 42), 7)
    text(surf, TEAM_HOME, (216, 36), SMALL, MUTED)
    text(surf, game.home_score, (360, 59), BIG, WHITE, "right")
    text(surf, f"{game.inning}회", (395, 37), SMALL, WHITE)
    text(surf, game.half, (395, 61), BOLD, GOLD)
    text(surf, "B", (480, 34), TINY, MUTED)
    for i in range(3):
        pygame.draw.circle(surf, GOLD if i < game.balls else (63, 69, 77), (502 + i * 16, 37), 5)
    text(surf, "S", (480, 61), TINY, MUTED)
    for i in range(2):
        pygame.draw.circle(surf, RED if i < game.strikes else (63, 69, 77), (502 + i * 16, 64), 5)
    cx, cy = 605, 55
    bases = [(0, 17), (18, 0), (0, -17), (-18, 0)]
    for i, (x, y) in enumerate(bases):
        p = [(cx + x, cy + y - 5), (cx + x + 5, cy + y), (cx + x, cy + y + 5), (cx + x - 5, cy + y)]
        filled = (i == 0 and game.runners[0]) or (i == 1 and game.runners[1]) or (i == 2 and game.runners[2])
        pygame.draw.polygon(surf, GOLD if filled else (70, 77, 84), p)
    text(surf, f"{game.outs} OUT", (640, 22), SMALL, MUTED)
    text(surf, "LIVE", (640, 52), SMALL, RED)


def draw_card(surf, rect, title, name, subtitle, stats, accent):
    panel(surf, rect, (14, 19, 25), 10, 1, (67, 76, 88))
    x, y, w, h = rect
    pygame.draw.rect(surf, accent, (x, y, 5, h), border_radius=4)
    text(surf, title, (x + 17, y + 12), TINY, MUTED)
    text(surf, name, (x + 17, y + 30), BOLD, WHITE)
    text(surf, subtitle, (x + 17, y + 59), TINY, accent)
    for i, (k, v) in enumerate(stats):
        text(surf, f"{k}  {v}", (x + 17, y + 84 + i * 18), TINY, MUTED)


def draw_strike_zone(surf, game):
    x, y, w, h = 565, 326, 150, 190
    alpha_rect(surf, pygame.Rect(x - 12, y - 12, w + 24, h + 24), (8, 14, 20, 82), 12, 1, (235, 240, 245))
    for r in range(3):
        for c in range(3):
            rect = pygame.Rect(int(x + c * w / 3), int(y + r * h / 3), int(w / 3 - 1), int(h / 3 - 1))
            layer = pygame.Surface(rect.size, pygame.SRCALPHA)
            pygame.draw.rect(layer, (45, 115, 175, 26), layer.get_rect())
            surf.blit(layer, rect.topleft)
    pygame.draw.rect(surf, (248, 248, 244), (x, y, w, h), 2)
    if game.pitch is not None and not game.pitch.done:
        row, col = (game.target - 1) // 3, (game.target - 1) % 3
        cx = x + (col + 0.5) * w / 3
        cy = y + (row + 0.5) * h / 3
        pygame.draw.circle(surf, (121, 218, 117), (int(cx), int(cy)), 22, 2)
        pygame.draw.line(surf, (121, 218, 117), (int(cx - 30), int(cy)), (int(cx - 8), int(cy)), 1)
        pygame.draw.line(surf, (121, 218, 117), (int(cx + 8), int(cy)), (int(cx + 30), int(cy)), 1)
        pygame.draw.line(surf, (121, 218, 117), (int(cx), int(cy - 30)), (int(cx), int(cy - 8)), 1)
        pygame.draw.line(surf, (121, 218, 117), (int(cx), int(cy + 8)), (int(cx), int(cy + 30)), 1)


def draw_scene(surf, game):
    draw_gradient_background(surf)
    draw_stands(surf)
    draw_field(surf)
    draw_player(surf, -0.72, 0.76, (28, 64, 43), scale=0.95)
    draw_player(surf, 0.0, 0.88, (28, 64, 43), scale=0.85)
    draw_player(surf, 0.72, 0.76, (28, 64, 43), scale=0.95)
    draw_player(surf, 0.0, 0.47, (23, 43, 72), accent=(110, 150, 208), scale=1.35)
    draw_player(surf, 0.0, 0.035, (36, 48, 39), accent=(188, 190, 184), scale=0.95)
    swing = clamp(game.swing_timer / 0.24, 0, 1) if game.swing_timer < 0.24 else 1
    draw_player(surf, 0.48, 0.035, (37, 72, 145), accent=(231, 235, 242), scale=2.65, swing=swing, handed="R")

    if game.pitch is not None:
        bx, by = game.pitch.pos()
        r = game.pitch.radius()
        pygame.draw.circle(surf, (255, 255, 250), (bx, by), r + 1)
        pygame.draw.circle(surf, (215, 45, 45), (bx, by), max(1, r // 3), 1)

    draw_scoreboard(surf, game)
    draw_card(surf, pygame.Rect(20, 125, 230, 135), "BATTER", game.batter[0], game.batter[1], [("AVG", game.batter[2]), ("AB", max(1, game.pitch_count)), ("HR", "3")], BLUE)
    draw_card(surf, pygame.Rect(1030, 125, 230, 135), "PITCHER", game.pitcher[0], game.pitcher[1], [("SPD", game.pitcher[2]), ("PITCH", str(game.pitch_count)), ("ERA", "2.81")], RED)

    panel(surf, (930, 530, 330, 82), (10, 15, 21), 10)
    text(surf, "PITCH DATA", (950, 546), TINY, MUTED)
    text(surf, f"{int(145 + 13 * game.pitch_speed)} km/h", (950, 570), BOLD, WHITE)
    text(surf, "4-SEAM FASTBALL", (1105, 575), TINY, CYAN, "center")
    draw_strike_zone(surf, game)

    if game.result_timer > 0:
        overlay = pygame.Surface((W, 110), pygame.SRCALPHA)
        overlay.fill((7, 11, 16, 150))
        surf.blit(overlay, (0, 300))
        color = GOLD if game.result in ("홈런", "2루타", "안타", "HOMERUN", "2루타", "안타") else RED
        text(surf, game.result, (W // 2, 355), HUGE, color, "center")

    panel(surf, (18, 650, 1244, 54), (10, 14, 19), 10)
    text(surf, game.message, (38, 677), SMALL, WHITE, "left")
    panel(surf, (1040, 658, 205, 38), (31, 105, 65), 8)
    text(surf, "SPACE · SWING", (1142, 677), SMALL, WHITE, "center")


def draw_webcam(surf, detector):
    cam = detector.surface()
    if cam is None:
        return
    rect = pygame.Rect(18, 520, 220, 124)
    panel(surf, rect, (8, 12, 16), 8, 1, (85, 94, 104))
    cam = pygame.transform.smoothscale(cam, (216, 120))
    surf.blit(cam, (20, 522))
    text(surf, "CAMERA", (28, 530), TINY, WHITE)


def parse_args():
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--host", action="store_true")
    p.add_argument("--join", type=str, default=None)
    p.add_argument("--port", type=int, default=5000)
    return p.parse_args()


def main():
    args = parse_args()
    detector = SwingDetector()
    peer = None
    if args.host or args.join:
        peer = LANPeer("host" if args.host else "join", args.join, args.port)
        peer.start()
    game = Game(peer)
    running = True

    while running:
        dt = clock.tick(FPS) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
                elif event.key == pygame.K_RETURN:
                    game.next_pitch()
                elif event.key == pygame.K_SPACE:
                    game.swing()
                elif event.key == pygame.K_p:
                    game.paused = not game.paused
                elif event.key == pygame.K_r:
                    game.reset()

        if not game.paused and not game.game_over and detector.update(dt):
            game.swing()
        game.update(dt)

        if peer:
            for msg in peer.poll():
                if msg.get("type") == "pitch" and game.pitch is None:
                    game.target = int(msg.get("target", 5))
                    game.pitch = Pitch(game.target, float(msg.get("speed", 0.88)), float(msg.get("curve", 0)))
                elif msg.get("type") == "swing" and game.pitch and not game.pitch.done:
                    game.swing()

        draw_scene(screen, game)
        draw_webcam(screen, detector)

        if game.paused:
            alpha_rect(screen, pygame.Rect(0, 0, W, H), (0, 0, 0, 145), 0)
            text(screen, "PAUSED", (W // 2, H // 2 - 20), HUGE, WHITE, "center")
            text(screen, "P 키로 계속", (W // 2, H // 2 + 40), SMALL, MUTED, "center")

        if game.game_over:
            alpha_rect(screen, pygame.Rect(0, 0, W, H), (0, 0, 0, 155), 0)
            winner = TEAM_HOME if game.home_score > game.away_score else TEAM_AWAY
            if game.home_score == game.away_score:
                winner = "DRAW"
            text(screen, "GAME SET", (W // 2, 280), HUGE, GOLD, "center")
            text(screen, winner, (W // 2, 350), BIG, WHITE, "center")
            text(screen, "R 키로 새 경기", (W // 2, 405), SMALL, MUTED, "center")

        pygame.display.flip()

    detector.close()
    if peer:
        peer.close()
    pygame.quit()


if __name__ == "__main__":
    main()
