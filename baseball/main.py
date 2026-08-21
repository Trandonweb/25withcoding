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
TEAM_A = "SCREEN"
TEAM_B = "AI TIGERS"
WHITE = (245, 247, 250)
MUTED = (159, 169, 181)
FIELD = (72, 137, 70)
DIRT = (171, 119, 73)
SKY = (119, 176, 224)
RED = (210, 65, 58)
GOLD = (238, 190, 68)

pygame.init()
pygame.display.set_caption("SCREEN BASEBALL")
screen = pygame.display.set_mode((WIDTH, HEIGHT), pygame.RESIZABLE)
clock = pygame.time.Clock()
FONT = pygame.font.SysFont("malgungothic", 20)
SMALL = pygame.font.SysFont("malgungothic", 16)
TINY = pygame.font.SysFont("malgungothic", 13)
BIG = pygame.font.SysFont("malgungothic", 28, bold=True)
HUGE = pygame.font.SysFont("malgungothic", 48, bold=True)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def lerp(a, b, t):
    return a + (b - a) * t


def text(surface, value, pos, font=FONT, color=WHITE, anchor="topleft"):
    img = font.render(str(value), True, color)
    rect = img.get_rect()
    setattr(rect, anchor, pos)
    surface.blit(img, rect)
    return rect


def rounded(surface, rect, color, radius=10, border=0, border_color=None):
    pygame.draw.rect(surface, color, rect, border_radius=radius)
    if border and border_color:
        pygame.draw.rect(surface, border_color, rect, border, border_radius=radius)


class FieldCamera:
    """2.5D broadcast camera: home plate foreground -> mound -> outfield."""
    def project(self, x, z, y=0.0):
        z = clamp(z, 0.0, 1.0)
        horizon_y, home_y = 142, 606
        py = home_y - (home_y - horizon_y) * z
        width = 610 - 470 * z
        px = WIDTH / 2 + x * width
        py -= y * (170 - 80 * z)
        return int(px), int(py)


camera = FieldCamera()


def draw_stadium(surface):
    surface.fill(SKY)
    for i in range(8):
        x, y = 70 + i * 165, 45 + (i % 3) * 24
        pygame.draw.ellipse(surface, (205, 225, 240), (x, y, 150, 35))

    pygame.draw.polygon(surface, (43, 47, 53), [(0, 126), (WIDTH, 126), (WIDTH, 265), (0, 265)])
    for x in range(-20, WIDTH + 40, 55):
        pygame.draw.rect(surface, (67, 70, 76), (x, 165, 40, 85))

    rounded(surface, (500, 108, 280, 82), (24, 28, 33), 8)
    text(surface, "SCREEN BASEBALL", (640, 130), SMALL, (210, 215, 220), "center")
    text(surface, "LIVE", (640, 160), BIG, RED, "center")

    pygame.draw.polygon(surface, FIELD, [(0, 258), (WIDTH, 258), (WIDTH, HEIGHT), (0, HEIGHT)])
    for i in range(12):
        y0, y1 = 260 + i * 40, 300 + i * 40
        col = (76, 143, 72) if i % 2 == 0 else (69, 133, 66)
        pygame.draw.polygon(surface, col, [(0, y0), (WIDTH, y0), (WIDTH, y1), (0, y1)])

    pygame.draw.polygon(surface, (154, 105, 65), [(0, 250), (WIDTH, 250), (WIDTH, 275), (0, 275)])
    pygame.draw.line(surface, WHITE, (WIDTH // 2, 604), (0, 266), 4)
    pygame.draw.line(surface, WHITE, (WIDTH // 2, 604), (WIDTH, 266), 4)

    home = camera.project(0, 0.0)
    first = camera.project(0.88, 0.35)
    second = camera.project(0, 0.70)
    third = camera.project(-0.88, 0.35)
    pygame.draw.polygon(surface, DIRT, [home, first, second, third])
    pygame.draw.polygon(surface, (52, 121, 60), [
        camera.project(0, 0.07), camera.project(0.73, 0.37),
        camera.project(0, 0.64), camera.project(-0.73, 0.37)])

    mound = camera.project(0, 0.48)
    pygame.draw.ellipse(surface, (194, 139, 84), (mound[0] - 54, mound[1] - 13, 108, 28))
    pygame.draw.rect(surface, WHITE, (mound[0] - 16, mound[1] - 3, 32, 6))

    for bx, bz in [(0, 0.02), (0.88, 0.35), (0, 0.70), (-0.88, 0.35)]:
        p = camera.project(bx, bz)
        s = int(10 + bz * 5)
        pygame.draw.polygon(surface, WHITE, [
            (p[0], p[1]-s), (p[0]+s, p[1]), (p[0], p[1]+s), (p[0]-s, p[1])])

    hp = camera.project(0, 0.0)
    pygame.draw.polygon(surface, WHITE, [
        (hp[0]-17, hp[1]-9), (hp[0]+17, hp[1]-9),
        (hp[0]+17, hp[1]+4), (hp[0], hp[1]+17), (hp[0]-17, hp[1]+4)])


def draw_player(surface, x, z, uniform, scale=1.0, swing=0.0):
    px, py = camera.project(x, z)
    depth = 1.0 - z
    body_h = int(122 * (0.65 + depth * 0.6) * scale)
    body_w = max(16, int(body_h * 0.35))
    head_r = max(8, int(body_h * 0.105))
    pygame.draw.ellipse(surface, (35, 48, 35), (px-body_w, py+4, body_w*2, 13))
    pygame.draw.line(surface, (225, 225, 225), (px-8, py-4), (px-15, py+body_h//2), max(4, body_w//6))
    pygame.draw.line(surface, (225, 225, 225), (px+8, py-4), (px+15, py+body_h//2), max(4, body_w//6))
    body_rect = pygame.Rect(px-body_w//2, py-body_h//2, body_w, int(body_h*0.55))
    rounded(surface, body_rect, uniform, max(4, body_w//4))
    pygame.draw.circle(surface, (221, 177, 143), (px, py-body_h//2-head_r), head_r)
    pygame.draw.arc(surface, (24, 25, 28),
                    (px-head_r-2, py-body_h//2-head_r-5, head_r*2+4, head_r+12),
                    math.pi, math.tau, max(3, head_r//3))
    arm_y = py-body_h//2 - int(body_h*0.13)
    pygame.draw.line(surface, (221,177,143), (px-body_w//2+3, arm_y),
                     (px-body_w-3, arm_y+12), max(4, body_w//5))
    pygame.draw.line(surface, (221,177,143), (px+body_w//2-3, arm_y),
                     (px+body_w-4, arm_y+4), max(4, body_w//5))
    bat_len = int(80 * (0.55 + depth*0.75) * scale)
    angle = -65 + swing * 120
    ex = px + math.cos(math.radians(angle)) * bat_len
    ey = arm_y + math.sin(math.radians(angle)) * bat_len
    pygame.draw.line(surface, (76, 51, 34), (px+body_w//2, arm_y),
                     (ex, ey), max(3, int(body_w*0.16)))
    pygame.draw.circle(surface, (110, 75, 48), (int(ex), int(ey)), max(3, int(body_w*0.10)))


def draw_scoreboard(surface, inning, half, score_a, score_b, outs, balls, strikes):
    rounded(surface, (18, 16, 560, 82), (11, 14, 18), 9)
    rounded(surface, (28, 26, 132, 62), (30, 34, 40), 6)
    text(surface, TEAM_A, (40, 37), SMALL, MUTED)
    text(surface, score_a, (142, 56), BIG, WHITE, "right")
    rounded(surface, (166, 26, 132, 62), (30, 34, 40), 6)
    text(surface, TEAM_B, (178, 37), SMALL, MUTED)
    text(surface, score_b, (286, 56), BIG, WHITE, "right")
    text(surface, f"{inning}회 {half}", (318, 35), SMALL, WHITE)
    text(surface, f"{outs} OUT", (318, 60), BIG, GOLD)
    for i in range(3):
        pygame.draw.circle(surface, GOLD if i < balls else (70, 75, 82), (480+i*18, 40), 6)
    for i in range(2):
        pygame.draw.circle(surface, RED if i < strikes else (70, 75, 82), (480+i*18, 65), 6)
    text(surface, "B", (540, 33), TINY, MUTED)
    text(surface, "S", (540, 58), TINY, MUTED)


def draw_player_card(surface, rect, name, pos, rating, color, stats):
    rounded(surface, rect, (16, 19, 24), 10, 1, (65, 72, 82))
    x, y, w, h = rect
    rr = pygame.Rect(x + 12, y + 12, 52, 52)
    rounded(surface, rr, color, 8)
    text(surface, rating, rr.center, BIG, WHITE, "center")
    text(surface, pos, (x+12, y+h-14), TINY, MUTED, "bottomleft")
    text(surface, name, (x+76, y+16), FONT, WHITE)
    for i, (k, v) in enumerate(stats):
        text(surface, f"{k} {v}", (x+76, y+45+i*18), TINY, MUTED)


def draw_pitch_target(surface, target, active=True):
    cx, cy, size = 645, 420, 132
    cell = size // 3
    colors = [(58, 107, 180), (68, 130, 185), (64, 105, 170)]
    for r in range(3):
        for c in range(3):
            idx = r*3+c+1
            col = (210, 74, 61) if idx == target and active else colors[(r+c) % len(colors)]
            pygame.draw.rect(surface, col,
                             (cx-size//2+c*cell, cy-size//2+r*cell, cell-2, cell-2))
    pygame.draw.rect(surface, WHITE, (cx-size//2, cy-size//2, size, size), 2)


def draw_bottom_controls(surface, message):
    rounded(surface, (18, 650, 1244, 54), (12, 15, 19), 10)
    text(surface, message, (38, 677), SMALL, (222, 226, 232), "left")
    rounded(surface, (1050, 659, 195, 36), (31, 105, 65), 8)
    text(surface, "SPACE  /  스윙", (1148, 677), SMALL, WHITE, "center")


class Ball:
    def __init__(self, target):
        self.t = 0.0
        row, col = (target-1)//3, (target-1)%3
        self.end_x = (col-1)*0.38
        self.end_y = (row-1)*0.28
        self.done = False

    def update(self, dt):
        self.t += dt * 1.25
        if self.t >= 1:
            self.t, self.done = 1, True

    def position(self):
        t = self.t
        z = lerp(0.47, 0.06, t)
        x = lerp(0.0, self.end_x, t)
        y = math.sin(t*math.pi) * 0.10 + self.end_y * t
        return camera.project(x, z, y)


class Game:
    def __init__(self):
        self.inning, self.half = 7, "초"
        self.score_a = self.score_b = 0
        self.outs = self.balls = self.strikes = 0
        self.target = random.randint(1, 9)
        self.ball = None
        self.swinging = False
        self.swing_timer = 0.0
        self.message = "PLAY BALL — ENTER로 투구, SPACE로 스윙"
        self.result_timer = 0.0
        self.result_text = ""
        self.runners = [False, False, False]
        self.paused = False

    def next_pitch(self):
        if self.ball is not None and not self.ball.done:
            return
        self.target = random.randint(1, 9)
        self.ball = Ball(self.target)
        self.message = "투구 시작 — 타이밍에 맞춰 스윙!"

    def swing(self):
        if self.ball is None or self.ball.done or self.swinging:
            return
        self.swinging, self.swing_timer = True, 0.0
        quality = clamp(1.0 - abs(self.ball.t - 0.88) / 0.45, -1.0, 1.0)
        if quality > 0.74:
            self.hit(random.choice(["HOMERUN!", "2루타!", "안타!"]))
        elif quality > 0.36:
            self.hit(random.choice(["안타!", "파울!"]))
        else:
            self.strike()

    def hit(self, result):
        self.result_text, self.result_timer = result, 1.3
        self.ball.done = True
        if result == "HOMERUN!":
            if self.half == "초": self.score_a += 1
            else: self.score_b += 1
        elif result == "안타!": self.runners[0] = True
        elif result == "2루타!": self.runners[1] = True
        if result != "파울!":
            self.balls = self.strikes = 0
        self.message = result

    def strike(self):
        self.strikes += 1
        self.ball.done = True
        if self.strikes >= 3:
            self.outs += 1
            self.strikes = self.balls = 0
            self.message = "삼진!"
        else:
            self.message = f"스트라이크 {self.strikes}"

    def update(self, dt):
        if self.paused: return
        if self.swinging:
            self.swing_timer += dt
            if self.swing_timer >= 0.22: self.swinging = False
        if self.ball:
            self.ball.update(dt)
            if self.ball.done and not self.swinging and self.result_timer <= 0: self.ball = None
        if self.result_timer > 0:
            self.result_timer -= dt
            if self.result_timer <= 0: self.ball = None
        if self.outs >= 3:
            self.outs = 0
            self.half = "말" if self.half == "초" else "초"
            if self.half == "초": self.inning += 1
            self.message = f"{self.inning}회 {self.half} 공격 시작"

    def draw(self, surface):
        draw_stadium(surface)
        draw_player(surface, 0.0, 0.48, (240, 240, 242), scale=1.15)
        swing_amount = clamp(self.swing_timer / 0.22, 0, 1) if self.swinging else 0.0
        draw_player(surface, -0.37, 0.01, (25, 70, 135), scale=1.28, swing=swing_amount)
        draw_player(surface, 0.18, 0.02, (28, 31, 34), scale=0.9)
        draw_player(surface, 0.00, 0.00, (25, 25, 25), scale=0.75)
        if self.ball is not None and not self.ball.done:
            bx, by = self.ball.position()
            r = int(4 + (1-self.ball.t)*8)
            pygame.draw.circle(surface, WHITE, (bx, by), r)
            pygame.draw.circle(surface, (170, 170, 170), (bx, by), r, 1)

        draw_scoreboard(surface, self.inning, self.half, self.score_a, self.score_b,
                        self.outs, self.balls, self.strikes)
        draw_player_card(surface, (18, 505, 292, 126), "BATTER 01", "RF", 96,
                         (39, 95, 170), [("AVG", ".318"), ("HR", "12"), ("RBI", "41")])
        draw_player_card(surface, (970, 505, 292, 126), "ACE 01", "SP", 103,
                         (184, 54, 49), [("ERA", "2.81"), ("K", "88"), ("W", "9")])
        draw_pitch_target(surface, self.target, self.ball is not None and not self.ball.done)

        text(surface, "BASES", (620, 523), TINY, MUTED, "center")
        for i, occupied in enumerate(self.runners):
            c = GOLD if occupied else (64, 70, 78)
            pygame.draw.polygon(surface, c, [(612+i*24, 540), (620+i*24, 548),
                                             (612+i*24, 556), (604+i*24, 548)])
        if self.result_timer > 0:
            alpha = int(clamp(self.result_timer / 1.3, 0, 1) * 220)
            overlay = pygame.Surface((WIDTH, 140), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, alpha))
            surface.blit(overlay, (0, 290))
            text(surface, self.result_text, (WIDTH//2, 350), HUGE, WHITE, "center")
        draw_bottom_controls(surface, self.message)


class SwingDetector:
    """Windows DSHOW webcam motion fallback for SCREEN BASEBALL."""
    def __init__(self):
        self.cap = None
        self.enabled = False
        self.cooldown = 0.0
        if cv2 is not None:
            try:
                self.cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
                self.enabled = bool(self.cap.isOpened())
            except Exception:
                self.enabled = False

    def update(self, dt):
        if not self.enabled or self.cap is None: return False
        self.cooldown = max(0.0, self.cooldown - dt)
        ok, frame = self.cap.read()
        if not ok: return False
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        small = cv2.resize(gray, (64, 36))
        previous = getattr(self, "_prev", small)
        motion = float(cv2.mean(cv2.absdiff(small, previous))[0])
        self._prev = small
        if motion > 16 and self.cooldown <= 0:
            self.cooldown = 0.45
            return True
        return False

    def close(self):
        if self.cap is not None: self.cap.release()


def main():
    global screen
    game = Game()
    detector = SwingDetector()
    running = True
    while running:
        dt = clock.tick(FPS) / 1000.0
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.VIDEORESIZE:
                screen = pygame.display.set_mode(event.size, pygame.RESIZABLE)
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE: running = False
                elif event.key == pygame.K_SPACE: game.swing()
                elif event.key == pygame.K_RETURN: game.next_pitch()
                elif event.key == pygame.K_p: game.paused = not game.paused
            elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                game.swing()

        if detector.update(dt): game.swing()
        game.update(dt)
        frame = pygame.Surface((WIDTH, HEIGHT))
        game.draw(frame)
        sw, sh = screen.get_size()
        screen.blit(pygame.transform.smoothscale(frame, (sw, sh)), (0, 0))
        pygame.display.flip()

    detector.close()
    pygame.quit()


if __name__ == "__main__":
    main()
