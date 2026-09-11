import pygame
import sys
import random

pygame.init()
pygame.font.init()

WIDTH, HEIGHT = 800, 640
SCREEN = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("미니게임 천국 - 오목 + 체스 + UNO")
clock = pygame.time.Clock()

# =========================================================
# 색상
# =========================================================
WOOD = (222, 184, 135)
BLACK = (20, 20, 20)
WHITE = (250, 250, 250)
LINE_COLOR = (50, 50, 50)

BTN_COLOR = (70, 130, 180)
BTN_HARD_COLOR = (180, 70, 70)
DISABLED_COLOR = (150, 150, 150)
TEXT_COLOR = (255, 255, 255)

LIGHT_SQUARE = (240, 217, 181)
DARK_SQUARE = (181, 136, 99)

SIDEBAR_BG = (235, 222, 200)

GREEN = (50, 200, 50)
YELLOW = (255, 255, 0)
RED = (220, 20, 60)
CHECK_COLOR = (255, 80, 80)

UNO_RED = (220, 50, 50)
UNO_YELLOW = (245, 205, 50)
UNO_GREEN = (50, 160, 80)
UNO_BLUE = (50, 100, 210)
UNO_BLACK = (30, 30, 30)
UNO_BG = (35, 120, 65)


# =========================================================
# 폰트
# =========================================================
def get_font(size, bold=False):
    names = [
        "malgungothic", "malgun gothic", "applegothic",
        "nanumgothic", "notosanscjkkr", "arial"
    ]
    for name in names:
        path = pygame.font.match_font(name, bold=bold)
        if path:
            return pygame.font.Font(path, size)
    return pygame.font.Font(None, size)


def get_chess_font(size):
    names = [
        "segoeuisymbol", "segoe ui symbol", "dejavusans",
        "dejavu sans", "arialunicode", "arial unicode ms",
        "freeserif", "unifont"
    ]
    for name in names:
        path = pygame.font.match_font(name)
        if path:
            return pygame.font.Font(path, size)
    return pygame.font.Font(None, size)


font_title = get_font(46, True)
font_btn = get_font(24, True)
font_msg = get_font(20, True)
font_side = get_font(17, True)
font_small = get_font(15, True)
font_chess = get_chess_font(58)
font_uno_big = get_font(30, True)
font_uno_card = get_font(24, True)
font_uno_small = get_font(16, True)


# =========================================================
# 공통 게임 상태
# =========================================================
game_state = "MAIN_MENU"
selected_game = None
game_mode = None
difficulty = None
AI_THINK_TIME = 500
ai_thinking = False
ai_thinking_start = 0
exit_btn_rect = None
game_start_ticks = 0


# =========================================================
# 오목
# =========================================================
BOARD_SIZE = 15
GRID_SIZE = 40
MARGIN = 40
omok_board = []
current_player_omok = 1
game_over_msg = ""
winning_line = None
OMOK_DIRECTIONS = [(0, 1), (1, 0), (1, 1), (1, -1)]


def reset_omok():
    global omok_board, current_player_omok, game_over_msg
    global winning_line, exit_btn_rect, game_start_ticks
    global ai_thinking, ai_thinking_start
    omok_board = [[0] * BOARD_SIZE for _ in range(BOARD_SIZE)]
    current_player_omok = 1
    game_over_msg = ""
    winning_line = None
    exit_btn_rect = None
    game_start_ticks = pygame.time.get_ticks()
    ai_thinking = False
    ai_thinking_start = 0


def inside_omok(r, c):
    return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE


def line_info(board, r, c, player, dr, dc):
    left_count = right_count = 0
    nr, nc = r - dr, c - dc
    while inside_omok(nr, nc) and board[nr][nc] == player:
        left_count += 1
        nr -= dr
        nc -= dc
    left_open = inside_omok(nr, nc) and board[nr][nc] == 0

    nr, nc = r + dr, c + dc
    while inside_omok(nr, nc) and board[nr][nc] == player:
        right_count += 1
        nr += dr
        nc += dc
    right_open = inside_omok(nr, nc) and board[nr][nc] == 0
    return left_count + right_count + 1, left_open, right_open


def check_omok_win_board(board, r, c, player):
    for dr, dc in OMOK_DIRECTIONS:
        total, _, _ = line_info(board, r, c, player, dr, dc)
        if (player == 1 and total == 5) or (player == 2 and total >= 5):
            return True
    return False


def check_omok_win(r, c, player, record_line=True):
    global winning_line
    for dr, dc in OMOK_DIRECTIONS:
        total, _, _ = line_info(omok_board, r, c, player, dr, dc)
        won = (player == 1 and total == 5) or (player == 2 and total >= 5)
        if not won:
            continue
        if record_line:
            sr, sc = r, c
            while (inside_omok(sr - dr, sc - dc)
                   and omok_board[sr - dr][sc - dc] == player):
                sr -= dr
                sc -= dc
            er, ec = sr, sc
            for _ in range(total - 1):
                er += dr
                ec += dc
            winning_line = ((MARGIN + sc * GRID_SIZE, MARGIN + sr * GRID_SIZE),
                            (MARGIN + ec * GRID_SIZE, MARGIN + er * GRID_SIZE))
        return True
    return False


def is_forbidden_black(board, r, c):
    if board[r][c] != 0:
        return True
    board[r][c] = 1
    if check_omok_win_board(board, r, c, 1):
        board[r][c] = 0
        return False
    open_three = 0
    for dr, dc in OMOK_DIRECTIONS:
        total, open1, open2 = line_info(board, r, c, 1, dr, dc)
        if total == 3 and open1 and open2:
            open_three += 1
    board[r][c] = 0
    return open_three >= 2


def candidate_moves(board, limit=35):
    stones = [(r, c) for r in range(BOARD_SIZE) for c in range(BOARD_SIZE) if board[r][c]]
    if not stones:
        return [(BOARD_SIZE // 2, BOARD_SIZE // 2)]
    candidates = set()
    for r, c in stones:
        for dr in range(-2, 3):
            for dc in range(-2, 3):
                nr, nc = r + dr, c + dc
                if inside_omok(nr, nc) and board[nr][nc] == 0:
                    candidates.add((nr, nc))
    scored = []
    for r, c in candidates:
        board[r][c] = 2
        attack = evaluate_omok_position(board, r, c, 2)
        board[r][c] = 1
        defense = evaluate_omok_position(board, r, c, 1)
        black_forbidden = is_forbidden_black(board, r, c)
        board[r][c] = 0
        scored.append((attack * 1.15 + defense, (r, c), black_forbidden))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [move for _, move, _ in scored[:limit]]


def candidate_moves_for_player(board, player, limit=35):
    moves = candidate_moves(board, max(limit * 2, limit))
    if player != 1:
        return moves[:limit]
    return [m for m in moves if not is_forbidden_black(board, m[0], m[1])][:limit]


def evaluate_omok_position(board, r, c, player):
    if board[r][c] != player:
        return 0
    score = 0
    for dr, dc in OMOK_DIRECTIONS:
        total, open1, open2 = line_info(board, r, c, player, dr, dc)
        if total >= 5:
            score += 100000
        elif total == 4 and open1 and open2:
            score += 5000
        elif total == 4 and (open1 or open2):
            score += 1500
        elif total == 3 and open1 and open2:
            score += 900
        elif total == 3:
            score += 200
        elif total == 2 and open1 and open2:
            score += 60
    return score


def evaluate_omok_board(board):
    total = 0
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            if board[r][c] == 2:
                total += evaluate_omok_position(board, r, c, 2)
            elif board[r][c] == 1:
                total -= evaluate_omok_position(board, r, c, 1)
    return total


def find_winning_move(board, player):
    for r, c in candidate_moves_for_player(board, player, 60):
        board[r][c] = player
        won = check_omok_win_board(board, r, c, player)
        board[r][c] = 0
        if won:
            return (r, c)
    return None


def omok_search(board, depth, alpha, beta, maximizing):
    if depth == 0:
        return evaluate_omok_board(board), None
    player = 2 if maximizing else 1
    moves = candidate_moves_for_player(board, player, 25)
    if not moves:
        return 0, None
    best_move = None
    if maximizing:
        best_score = -float("inf")
        for r, c in moves:
            board[r][c] = 2
            if check_omok_win_board(board, r, c, 2):
                board[r][c] = 0
                return 10000000, (r, c)
            score, _ = omok_search(board, depth - 1, alpha, beta, False)
            board[r][c] = 0
            if score > best_score:
                best_score, best_move = score, (r, c)
            alpha = max(alpha, score)
            if beta <= alpha:
                break
        return best_score, best_move
    best_score = float("inf")
    for r, c in moves:
        if is_forbidden_black(board, r, c):
            continue
        board[r][c] = 1
        if check_omok_win_board(board, r, c, 1):
            board[r][c] = 0
            return -10000000, (r, c)
        score, _ = omok_search(board, depth - 1, alpha, beta, True)
        board[r][c] = 0
        if score < best_score:
            best_score, best_move = score, (r, c)
        beta = min(beta, score)
        if beta <= alpha:
            break
    return best_score, best_move


def ai_move_omok(diff):
    winning = find_winning_move(omok_board, 2)
    if winning:
        return winning
    blocking = find_winning_move(omok_board, 1)
    if blocking:
        return blocking
    if diff == "EASY":
        moves = candidate_moves(omok_board, 20)
        return random.choice(moves[:min(8, len(moves))]) if moves else None
    _, move = omok_search(omok_board, 2, -float("inf"), float("inf"), True)
    if move:
        return move
    moves = candidate_moves(omok_board, 20)
    return moves[0] if moves else None


def draw_omok_board():
    SCREEN.fill(WOOD)
    for i in range(BOARD_SIZE):
        pygame.draw.line(SCREEN, LINE_COLOR, (MARGIN + i * GRID_SIZE, MARGIN),
                         (MARGIN + i * GRID_SIZE, MARGIN + (BOARD_SIZE - 1) * GRID_SIZE))
        pygame.draw.line(SCREEN, LINE_COLOR, (MARGIN, MARGIN + i * GRID_SIZE),
                         (MARGIN + (BOARD_SIZE - 1) * GRID_SIZE, MARGIN + i * GRID_SIZE))
    if game_mode != "AI" or current_player_omok == 1:
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                if omok_board[r][c] == 0 and is_forbidden_black(omok_board, r, c):
                    text = get_font(20, True).render("X", True, RED)
                    SCREEN.blit(text, text.get_rect(center=(MARGIN + c * GRID_SIZE,
                                                            MARGIN + r * GRID_SIZE)))
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            x, y = MARGIN + c * GRID_SIZE, MARGIN + r * GRID_SIZE
            if omok_board[r][c] == 1:
                pygame.draw.circle(SCREEN, BLACK, (x, y), 16)
            elif omok_board[r][c] == 2:
                pygame.draw.circle(SCREEN, WHITE, (x, y), 16)
                pygame.draw.circle(SCREEN, (80, 80, 80), (x, y), 16, 1)
    if winning_line:
        pygame.draw.line(SCREEN, RED, winning_line[0], winning_line[1], 5)
    if game_over_msg:
        SCREEN.blit(font_msg.render(game_over_msg, True, (200, 0, 0)), (40, HEIGHT - 35))
    status = "게임 종료" if game_state == "GAME_OVER" else (
        "플레이어 턴" if game_mode == "AI" and current_player_omok == 1 else
        "AI 생각중..." if game_mode == "AI" else
        "흑돌 턴" if current_player_omok == 1 else "백돌 턴"
    )
    draw_sidebar(status)


# =========================================================
# 체스
# =========================================================
PIECE_SYMBOLS = {"K":"♔","Q":"♕","R":"♖","B":"♗","N":"♘","P":"♙",
                 "k":"♚","q":"♛","r":"♜","b":"♝","n":"♞","p":"♟"}
PIECE_VALUES = {"p":100,"n":320,"b":330,"r":500,"q":900,"k":20000}
MATERIAL_VALUES = {"p":1,"n":3,"b":3,"r":5,"q":9,"k":0}
PAWN_TABLE = [[0,0,0,0,0,0,0,0],[50,50,50,50,50,50,50,50],[10,10,20,30,30,20,10,10],
              [5,5,10,25,25,10,5,5],[0,0,0,20,20,0,0,0],[5,-5,-10,0,0,-10,-5,5],
              [5,10,10,-20,-20,10,10,5],[0,0,0,0,0,0,0,0]]
KNIGHT_TABLE = [[-50,-40,-30,-30,-30,-30,-40,-50],[-40,-20,0,0,0,0,-20,-40],
                [-30,0,10,15,15,10,0,-30],[-30,5,15,20,20,15,5,-30],
                [-30,0,15,20,20,15,0,-30],[-30,5,10,15,15,10,5,-30],
                [-40,-20,0,5,5,0,-20,-40],[-50,-40,-30,-30,-30,-30,-40,-50]]
KING_TABLE = [[-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
              [-30,-40,-40,-50,-50,-40,-40,-30],[-30,-40,-40,-50,-50,-40,-40,-30],
              [-20,-30,-30,-40,-40,-30,-30,-20],[-10,-20,-20,-20,-20,-20,-20,-10],
              [20,20,0,0,0,0,20,20],[20,30,10,0,0,10,30,20]]
chess_board = []
current_player_chess = "W"
selected_piece = None
valid_moves = []
chess_game_over_msg = ""
castling_rights = {}
en_passant_target = None
position_history = {}
halfmove_clock = 0


def reset_chess():
    global chess_board, current_player_chess, selected_piece, valid_moves
    global chess_game_over_msg, castling_rights, en_passant_target
    global exit_btn_rect, game_start_ticks, ai_thinking, ai_thinking_start
    global position_history, halfmove_clock
    chess_board = [["r","n","b","q","k","b","n","r"],["p"]*8,["."]*8,["."]*8,
                   ["."]*8,["."]*8,["P"]*8,["R","N","B","Q","K","B","N","R"]]
    current_player_chess = "W"
    selected_piece = None
    valid_moves = []
    chess_game_over_msg = ""
    castling_rights = {"W_K":True,"W_Q":True,"B_K":True,"B_Q":True}
    en_passant_target = None
    exit_btn_rect = None
    game_start_ticks = pygame.time.get_ticks()
    ai_thinking = False
    ai_thinking_start = 0
    position_history = {}
    halfmove_clock = 0
    record_chess_position()


def find_king(is_white, board_state):
    target = "K" if is_white else "k"
    for r in range(8):
        for c in range(8):
            if board_state[r][c] == target:
                return r, c
    return None


def is_square_attacked(r, c, by_white, board_state, rights=None):
    pawn = "P" if by_white else "p"
    pawn_row = r + 1 if by_white else r - 1
    for dc in (-1, 1):
        pc = c + dc
        if 0 <= pawn_row < 8 and 0 <= pc < 8 and board_state[pawn_row][pc] == pawn:
            return True
    knight = "N" if by_white else "n"
    for dr, dc in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < 8 and 0 <= nc < 8 and board_state[nr][nc] == knight:
            return True
    rook, queen = ("R","Q") if by_white else ("r","q")
    for dr, dc in [(0,1),(0,-1),(1,0),(-1,0)]:
        nr, nc = r + dr, c + dc
        while 0 <= nr < 8 and 0 <= nc < 8:
            piece = board_state[nr][nc]
            if piece != ".":
                if piece in (rook, queen):
                    return True
                break
            nr += dr; nc += dc
    bishop, queen = ("B","Q") if by_white else ("b","q")
    for dr, dc in [(1,1),(1,-1),(-1,1),(-1,-1)]:
        nr, nc = r + dr, c + dc
        while 0 <= nr < 8 and 0 <= nc < 8:
            piece = board_state[nr][nc]
            if piece != ".":
                if piece in (bishop, queen):
                    return True
                break
            nr += dr; nc += dc
    king = "K" if by_white else "k"
    for dr in (-1,0,1):
        for dc in (-1,0,1):
            if not (dr or dc): continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < 8 and 0 <= nc < 8 and board_state[nr][nc] == king:
                return True
    return False


def is_in_check(is_white, board_state, rights):
    king = find_king(is_white, board_state)
    return True if not king else is_square_attacked(king[0], king[1], not is_white, board_state, rights)


def get_raw_moves(r, c, board_state, rights, ep_target):
    piece = board_state[r][c]
    if piece == ".": return []
    moves = []
    is_white = piece.isupper()
    if piece.lower() == "p":
        direction = -1 if is_white else 1
        start_row = 6 if is_white else 1
        nr = r + direction
        if 0 <= nr < 8 and board_state[nr][c] == ".":
            moves.append((nr,c))
            nr2 = r + 2 * direction
            if r == start_row and board_state[nr2][c] == ".": moves.append((nr2,c))
        for dc in (-1,1):
            nc = c + dc
            if 0 <= nr < 8 and 0 <= nc < 8:
                target = board_state[nr][nc]
                if target != "." and target.isupper() != is_white and target.lower() != "k":
                    moves.append((nr,nc))
                if ep_target == (nr,nc): moves.append((nr,nc))
    elif piece.lower() == "n":
        for dr, dc in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]:
            nr,nc=r+dr,c+dc
            if 0<=nr<8 and 0<=nc<8:
                target=board_state[nr][nc]
                if target=="." or (target.isupper()!=is_white and target.lower()!="k"): moves.append((nr,nc))
    if piece.lower() in ("r","q"):
        for dr,dc in [(0,1),(0,-1),(1,0),(-1,0)]:
            nr,nc=r+dr,c+dc
            while 0<=nr<8 and 0<=nc<8:
                target=board_state[nr][nc]
                if target==".": moves.append((nr,nc))
                else:
                    if target.isupper()!=is_white and target.lower()!="k": moves.append((nr,nc))
                    break
                nr+=dr;nc+=dc
    if piece.lower() in ("b","q"):
        for dr,dc in [(1,1),(1,-1),(-1,1),(-1,-1)]:
            nr,nc=r+dr,c+dc
            while 0<=nr<8 and 0<=nc<8:
                target=board_state[nr][nc]
                if target==".": moves.append((nr,nc))
                else:
                    if target.isupper()!=is_white and target.lower()!="k": moves.append((nr,nc))
                    break
                nr+=dr;nc+=dc
    elif piece.lower()=="k":
        for dr in (-1,0,1):
            for dc in (-1,0,1):
                if not (dr or dc): continue
                nr,nc=r+dr,c+dc
                if 0<=nr<8 and 0<=nc<8:
                    target=board_state[nr][nc]
                    if target=="." or (target.isupper()!=is_white and target.lower()!="k"): moves.append((nr,nc))
        if is_white and r==7 and c==4:
            if rights.get("W_K",False) and board_state[7][5]=="." and board_state[7][6]=="." and board_state[7][7]=="R": moves.append((7,6))
            if rights.get("W_Q",False) and board_state[7][3]=="." and board_state[7][2]=="." and board_state[7][1]=="." and board_state[7][0]=="R": moves.append((7,2))
        elif not is_white and r==0 and c==4:
            if rights.get("B_K",False) and board_state[0][5]=="." and board_state[0][6]=="." and board_state[0][7]=="r": moves.append((0,6))
            if rights.get("B_Q",False) and board_state[0][3]=="." and board_state[0][2]=="." and board_state[0][1]=="." and board_state[0][0]=="r": moves.append((0,2))
    return moves


def update_castling_rights(rights, piece, sr, sc, tr, tc, captured):
    new = rights.copy()
    if piece == "K": new["W_K"] = new["W_Q"] = False
    elif piece == "k": new["B_K"] = new["B_Q"] = False
    elif piece == "R":
        if (sr,sc)==(7,0): new["W_Q"]=False
        elif (sr,sc)==(7,7): new["W_K"]=False
    elif piece == "r":
        if (sr,sc)==(0,0): new["B_Q"]=False
        elif (sr,sc)==(0,7): new["B_K"]=False
    if captured == "R":
        if (tr,tc)==(7,0): new["W_Q"]=False
        elif (tr,tc)==(7,7): new["W_K"]=False
    elif captured == "r":
        if (tr,tc)==(0,0): new["B_Q"]=False
        elif (tr,tc)==(0,7): new["B_K"]=False
    return new


def make_chess_move(board, move, rights, ep_target):
    (sr,sc),(tr,tc)=move
    new_board=[row[:] for row in board]
    piece=new_board[sr][sc]
    captured=new_board[tr][tc]
    is_ep=(piece.lower()=="p" and ep_target==(tr,tc) and captured=="." and sc!=tc)
    if is_ep:
        new_board[tr+1][tc]="." if piece=="P" else new_board[tr+1][tc]
        if piece == "p": new_board[tr-1][tc]="."
    if piece.lower()=="k" and abs(tc-sc)==2:
        if tc==6: new_board[sr][5]=new_board[sr][7]; new_board[sr][7]="."
        else: new_board[sr][3]=new_board[sr][0]; new_board[sr][0]="."
    new_board[tr][tc]=piece; new_board[sr][sc]="."
    if piece=="P" and tr==0: new_board[tr][tc]="Q"
    elif piece=="p" and tr==7: new_board[tr][tc]="q"
    new_rights=update_castling_rights(rights,piece,sr,sc,tr,tc,captured)
    new_ep=((sr+tr)//2,sc) if piece.lower()=="p" and abs(tr-sr)==2 else None
    return new_board,new_rights,new_ep


def get_valid_moves(r,c,board_state,rights,ep_target):
    piece=board_state[r][c]
    if piece==".": return []
    is_white=piece.isupper(); raw=get_raw_moves(r,c,board_state,rights,ep_target); valid=[]
    for tr,tc in raw:
        if piece.lower()=="k" and abs(tc-c)==2:
            if is_in_check(is_white,board_state,rights): continue
            middle=5 if tc>c else 3
            if is_square_attacked(r,middle,not is_white,board_state,rights): continue
        temp_board,temp_rights,_=make_chess_move(board_state,((r,c),(tr,tc)),rights,ep_target)
        if not is_in_check(is_white,temp_board,temp_rights): valid.append((tr,tc))
    return valid


def get_all_valid_moves(is_white,board_state,rights,ep_target):
    moves=[]
    for r in range(8):
        for c in range(8):
            piece=board_state[r][c]
            if piece!="." and piece.isupper()==is_white:
                moves.extend([((r,c),target) for target in get_valid_moves(r,c,board_state,rights,ep_target)])
    return moves


def get_position_key():
    return (tuple(tuple(row) for row in chess_board),current_player_chess,
            (castling_rights["W_K"],castling_rights["W_Q"],castling_rights["B_K"],castling_rights["B_Q"]),
            en_passant_target)


def record_chess_position():
    key=get_position_key(); position_history[key]=position_history.get(key,0)+1


def get_current_position_count(): return position_history.get(get_position_key(),0)

def is_threefold_repetition(): return get_current_position_count()>=3


def evaluate_board(board):
    score=0; white_bishops=black_bishops=0
    for r in range(8):
        for c in range(8):
            piece=board[r][c]
            if piece==".": continue
            p=piece.lower(); value=PIECE_VALUES[p]; positional=0
            if p=="p": positional=(PAWN_TABLE[7-r] if piece.isupper() else PAWN_TABLE[r])[c]
            elif p=="n": positional=(KNIGHT_TABLE[7-r] if piece.isupper() else KNIGHT_TABLE[r])[c]
            elif p=="k": positional=(KING_TABLE[7-r] if piece.isupper() else KING_TABLE[r])[c]
            if piece.isupper():
                score+=value+positional
                if p=="b": white_bishops+=1
            else:
                score-=value+positional
                if p=="b": black_bishops+=1
    if white_bishops>=2: score+=30
    if black_bishops>=2: score-=30
    return score


def order_moves(board,moves):
    def score(move):
        sr,sc=move[0];tr,tc=move[1];moving=board[sr][sc];captured=board[tr][tc];s=0
        if captured!=".": s+=10*PIECE_VALUES[captured.lower()]-PIECE_VALUES[moving.lower()]
        if moving.lower()=="p" and tr in (0,7): s+=900
        s+=int((4-abs(3.5-tr)-abs(3.5-tc))*5)
        return s
    return sorted(moves,key=score,reverse=True)


MATE_SCORE=1000000

def minimax(board,depth,alpha,beta,is_white_turn,rights,ep_target):
    moves=get_all_valid_moves(is_white_turn,board,rights,ep_target)
    if not moves:
        if is_in_check(is_white_turn,board,rights): return (-MATE_SCORE-depth,None) if is_white_turn else (MATE_SCORE+depth,None)
        return 0,None
    if depth==0: return evaluate_board(board),None
    moves=order_moves(board,moves)
    if is_white_turn:
        best=-float("inf");best_move=None
        for move in moves:
            nb,nr,ne=make_chess_move(board,move,rights,ep_target);score,_=minimax(nb,depth-1,alpha,beta,False,nr,ne)
            if score>best: best,best_move=score,move
            alpha=max(alpha,score)
            if beta<=alpha: break
        return best,best_move
    best=float("inf");best_move=None
    for move in moves:
        nb,nr,ne=make_chess_move(board,move,rights,ep_target);score,_=minimax(nb,depth-1,alpha,beta,True,nr,ne)
        if score<best: best,best_move=score,move
        beta=min(beta,score)
        if beta<=alpha: break
    return best,best_move


def chess_ai_move(diff):
    global chess_board,castling_rights,en_passant_target
    depth=2 if diff=="EASY" else 3
    _,best_move=minimax(chess_board,depth,-float("inf"),float("inf"),False,castling_rights,en_passant_target)
    if best_move is None:
        return "백(White) 승리! 체크메이트" if is_in_check(False,chess_board,castling_rights) else "무승부! 스테일메이트"
    chess_board,castling_rights,en_passant_target=make_chess_move(chess_board,best_move,castling_rights,en_passant_target)
    return None


def check_chess_game_end():
    global chess_game_over_msg,game_state
    if is_threefold_repetition():
        chess_game_over_msg="무승부! 3회 동형 반복";game_state="GAME_OVER";return True
    if halfmove_clock>=100:
        chess_game_over_msg="무승부! 50수 규칙";game_state="GAME_OVER";return True
    is_white_turn=current_player_chess=="W";moves=get_all_valid_moves(is_white_turn,chess_board,castling_rights,en_passant_target)
    if not moves:
        if is_in_check(is_white_turn,chess_board,castling_rights):
            chess_game_over_msg="흑(Black) 승리! 체크메이트" if is_white_turn else "백(White) 승리! 체크메이트"
        else: chess_game_over_msg="무승부! 스테일메이트"
        game_state="GAME_OVER";return True
    return False


def draw_chess_piece(piece,center):
    symbol=PIECE_SYMBOLS.get(piece,piece)
    main_color=(255,255,255) if piece.isupper() else (35,35,35)
    outline_color=(40,40,40) if piece.isupper() else (245,245,245)
    for ox,oy in [(-2,0),(2,0),(0,-2),(0,2)]:
        shadow=font_chess.render(symbol,True,outline_color);SCREEN.blit(shadow,shadow.get_rect(center=(center[0]+ox,center[1]+oy)))
    text=font_chess.render(symbol,True,main_color);SCREEN.blit(text,text.get_rect(center=center))


def draw_chess_board():
    square=80; checked_king=None
    for is_white in (True,False):
        if is_in_check(is_white,chess_board,castling_rights): checked_king=find_king(is_white,chess_board)
    for r in range(8):
        for c in range(8):
            color=LIGHT_SQUARE if (r+c)%2==0 else DARK_SQUARE
            if checked_king==(r,c): color=CHECK_COLOR
            pygame.draw.rect(SCREEN,color,(c*square,r*square,square,square))
            if selected_piece==(r,c): pygame.draw.rect(SCREEN,GREEN,(c*square,r*square,square,square),4)
            if (r,c) in valid_moves:
                pygame.draw.circle(SCREEN,GREEN,(c*square+40,r*square+40),8)
            piece=chess_board[r][c]
            if piece!=".": draw_chess_piece(piece,(c*square+40,r*square+42))
    if chess_game_over_msg: SCREEN.blit(font_msg.render(chess_game_over_msg,True,(200,0,0)),(20,HEIGHT-35))
    status="게임 종료" if game_state=="GAME_OVER" else ("백 (플레이어)" if current_player_chess=="W" else "AI 생각중..." if game_mode=="AI" else "흑 턴")
    draw_sidebar(status)


# =========================================================
# UNO
# =========================================================
uno_deck=[];uno_hands=[[],[]];uno_current_player=0;uno_direction=1;uno_current_color=None
uno_message="";uno_game_over_msg="";uno_draw_pile=[];uno_discard_pile=[];uno_selected_card=None
uno_color_choice=False;uno_pending_wild_card=None;uno_drawn_card_pending=False;uno_drawn_card_index=None
uno_p1_card_rects=[];uno_p2_card_rects=[];uno_draw_rect=None;uno_color_rects={}
UNO_COLORS=["RED","YELLOW","GREEN","BLUE"]
UNO_COLOR_VALUES={"RED":UNO_RED,"YELLOW":UNO_YELLOW,"GREEN":UNO_GREEN,"BLUE":UNO_BLUE,"WILD":UNO_BLACK}


def uno_card(color,value): return {"color":color,"value":value}


def create_uno_deck():
    deck=[]
    for color in UNO_COLORS:
        deck.append(uno_card(color,"0"))
        for n in range(1,10): deck.extend([uno_card(color,str(n)),uno_card(color,str(n))])
        for value in ("SKIP","REVERSE","DRAW2"): deck.extend([uno_card(color,value),uno_card(color,value)])
    for _ in range(4): deck.extend([uno_card("WILD","WILD"),uno_card("WILD","WILD_DRAW4")])
    random.shuffle(deck);return deck


def reset_uno():
    global uno_deck,uno_hands,uno_current_player,uno_direction,uno_current_color,uno_message,uno_game_over_msg
    global uno_draw_pile,uno_discard_pile,uno_selected_card,uno_color_choice,uno_pending_wild_card,uno_drawn_card_pending,uno_drawn_card_index
    global uno_p1_card_rects,uno_p2_card_rects,uno_draw_rect,uno_color_rects,game_start_ticks,exit_btn_rect
    uno_deck=create_uno_deck();uno_hands=[[],[]]
    for _ in range(7): uno_hands[0].append(uno_deck.pop());uno_hands[1].append(uno_deck.pop())
    uno_draw_pile=uno_deck;uno_discard_pile=[]
    while True:
        first=uno_draw_pile.pop()
        if first["value"]=="0": break
        uno_draw_pile.insert(0,first)
    uno_discard_pile.append(first);uno_current_color=first["color"];uno_current_player=0;uno_direction=1
    uno_message="플레이어 1부터 시작합니다.";uno_game_over_msg="";uno_selected_card=None;uno_color_choice=False;uno_pending_wild_card=None
    uno_drawn_card_pending=False;uno_drawn_card_index=None;uno_p1_card_rects=[];uno_p2_card_rects=[];uno_draw_rect=None;uno_color_rects={}
    game_start_ticks=pygame.time.get_ticks();exit_btn_rect=None


def refill_uno_draw_pile():
    global uno_draw_pile,uno_discard_pile
    if len(uno_discard_pile)<=1:return
    top=uno_discard_pile[-1];cards=uno_discard_pile[:-1];random.shuffle(cards);uno_draw_pile.extend(cards);uno_discard_pile=[top]


def uno_card_playable(card):
    if not uno_discard_pile:return True
    top=uno_discard_pile[-1]
    return card["color"]=="WILD" or card["color"]==uno_current_color or card["value"]==top["value"]


def uno_wild_draw4_legal(player,card):
    if card["value"]!="WILD_DRAW4":return True
    return not any(other["color"]!="WILD" and other["color"]==uno_current_color for other in uno_hands[player])


def uno_next_player():
    global uno_current_player
    uno_current_player=(uno_current_player+uno_direction)%2


def uno_draw_cards(player,count):
    global uno_draw_pile
    drawn=[]
    for _ in range(count):
        if not uno_draw_pile: refill_uno_draw_pile()
        if not uno_draw_pile: break
        card=uno_draw_pile.pop();uno_hands[player].append(card);drawn.append(card)
    return drawn


def uno_finish_if_needed():
    global uno_game_over_msg,game_state
    if len(uno_hands[0])==0: uno_game_over_msg="플레이어 1 승리!";game_state="GAME_OVER";return True
    if len(uno_hands[1])==0: uno_game_over_msg="플레이어 2 승리!";game_state="GAME_OVER";return True
    return False


def uno_draw_for_turn(player):
    global uno_drawn_card_pending,uno_drawn_card_index,uno_message
    if player!=uno_current_player or uno_color_choice or uno_game_over_msg:return False
    if uno_drawn_card_pending:
        uno_message="이번 턴에는 이미 카드를 뽑았습니다.";return False
    drawn=uno_draw_cards(player,1)
    if not drawn:
        uno_message="뽑을 카드가 없습니다. 턴을 넘깁니다.";uno_drawn_card_pending=False;uno_drawn_card_index=None;uno_next_player();return False
    uno_drawn_card_pending=True;uno_drawn_card_index=len(uno_hands[player])-1;drawn_card=drawn[-1]
    legal=uno_card_playable(drawn_card) and not (drawn_card["value"]=="WILD_DRAW4" and not uno_wild_draw4_legal(player,drawn_card))
    if legal:
        uno_message=f"플레이어 {player+1}: 카드를 뽑았습니다. 방금 뽑은 카드만 낼 수 있습니다."
    else:
        uno_message=f"플레이어 {player+1}: 낼 수 없는 카드를 뽑았습니다. 턴을 넘깁니다."
        uno_drawn_card_pending=False;uno_drawn_card_index=None;uno_next_player()
    return True


def uno_play_card(player,index):
    global uno_current_color,uno_message,uno_direction,uno_color_choice,uno_pending_wild_card
    global uno_drawn_card_pending,uno_drawn_card_index
    if player!=uno_current_player or uno_color_choice or uno_game_over_msg:return False
    if not (0<=index<len(uno_hands[player])):return False
    if uno_drawn_card_pending and index!=uno_drawn_card_index:
        uno_message="방금 뽑은 카드만 바로 낼 수 있습니다.";return False
    card=uno_hands[player][index]
    if not uno_card_playable(card): uno_message="그 카드는 지금 낼 수 없습니다.";return False
    if card["value"]=="WILD_DRAW4" and not uno_wild_draw4_legal(player,card): uno_message="현재 색 카드가 있어서 +4를 낼 수 없습니다.";return False
    uno_hands[player].pop(index);uno_discard_pile.append(card);uno_drawn_card_pending=False;uno_drawn_card_index=None
    value=card["value"]
    if card["color"]!="WILD":uno_current_color=card["color"]
    uno_message=f"플레이어 {player+1}: {uno_card_text(card)}"
    if value not in ("WILD","WILD_DRAW4") and uno_finish_if_needed():return True
    if value=="SKIP":uno_next_player();uno_next_player()
    elif value=="REVERSE":uno_direction*=-1;uno_next_player();uno_next_player()
    elif value=="DRAW2":uno_next_player();drawn=uno_draw_cards(uno_current_player,2);uno_message+=f" - 다음 플레이어 +2 ({len(drawn)}장)"
    elif value=="WILD":uno_color_choice=True;uno_pending_wild_card=card;return True
    elif value=="WILD_DRAW4":
        uno_next_player();drawn=uno_draw_cards(uno_current_player,4);uno_message+=f" - 다음 플레이어 +4 ({len(drawn)}장)";uno_color_choice=True;uno_pending_wild_card=card;return True
    else:uno_next_player()
    uno_finish_if_needed();return True


def uno_finish_wild(color):
    global uno_current_color,uno_color_choice,uno_pending_wild_card,uno_message
    if not uno_color_choice or color not in UNO_COLORS:return
    card=uno_pending_wild_card
    if card is None:uno_color_choice=False;return
    uno_current_color=color;uno_color_choice=False;uno_pending_wild_card=None;uno_message+=f" - {color} 선택"
    if uno_game_over_msg:return
    if card["value"] in ("WILD","WILD_DRAW4"):uno_next_player()
    uno_finish_if_needed()


def uno_card_text(card):
    return {"SKIP":"스킵","REVERSE":"리버스","DRAW2":"+2","WILD":"와일드","WILD_DRAW4":"+4"}.get(card["value"],card["value"])


def draw_uno_card_rect(card,rect,face=True):
    pygame.draw.rect(SCREEN,UNO_COLOR_VALUES[card["color"]],rect,border_radius=12);pygame.draw.rect(SCREEN,WHITE,rect,3,border_radius=12)
    if face:
        text=font_uno_card.render(uno_card_text(card),True,WHITE);SCREEN.blit(text,text.get_rect(center=rect.center))


def draw_uno_card_back(rect):
    pygame.draw.rect(SCREEN,UNO_BLUE,rect,border_radius=12);pygame.draw.rect(SCREEN,WHITE,rect,3,border_radius=12)
    text=font_uno_big.render("UNO",True,WHITE);SCREEN.blit(text,text.get_rect(center=rect.center))


def uno_hand_rects(hand_count,y,width=70,height=105,available=600,margin=20,gap=8):
    if hand_count<=0:return []
    if hand_count==1:step=0;start_x=margin+(available-width)//2
    else:
        natural=hand_count*width+(hand_count-1)*gap
        if natural<=available:step=width+gap;start_x=margin+(available-natural)//2
        else:step=max(20,(available-width)/(hand_count-1));start_x=margin
    rects=[]
    for i in range(hand_count):
        x=round(start_x+i*step);x=min(x,margin+available-width);rects.append(pygame.Rect(x,y,width,height))
    return rects


def draw_uno():
    global exit_btn_rect,uno_p1_card_rects,uno_p2_card_rects,uno_draw_rect,uno_color_rects
    SCREEN.fill(UNO_BG);SCREEN.blit(font_uno_big.render("UNO",True,WHITE),(20,15));SCREEN.blit(font_uno_small.render(f"플레이어 2 손패: {len(uno_hands[1])}장",True,WHITE),(20,60))
    uno_p2_card_rects=uno_hand_rects(len(uno_hands[1]),85,width=45,height=65,available=600,margin=20,gap=5)
    for rect in uno_p2_card_rects:draw_uno_card_back(rect)
    draw_pile_rect=pygame.Rect(245,250,90,130);discard_rect=pygame.Rect(360,250,90,130)
    if uno_draw_pile:draw_uno_card_back(draw_pile_rect)
    else:pygame.draw.rect(SCREEN,(80,80,80),draw_pile_rect,border_radius=12)
    if uno_discard_pile:draw_uno_card_rect(uno_discard_pile[-1],discard_rect)
    if uno_current_color:
        color=UNO_COLOR_VALUES[uno_current_color];pygame.draw.circle(SCREEN,color,(500,300),20);pygame.draw.circle(SCREEN,WHITE,(500,300),20,2);SCREEN.blit(font_uno_small.render("현재 색",True,WHITE),(480,335))
    SCREEN.blit(font_uno_big.render(f"플레이어 {uno_current_player+1} 턴",True,YELLOW),(500,80));SCREEN.blit(font_uno_small.render(uno_message[:34],True,WHITE),(500,125))
    SCREEN.blit(font_uno_small.render(f"플레이어 1 손패: {len(uno_hands[0])}장",True,WHITE),(20,420))
    uno_p1_card_rects=uno_hand_rects(len(uno_hands[0]),455,width=70,height=105,available=600,margin=20,gap=8)
    for card,rect in zip(uno_hands[0],uno_p1_card_rects):draw_uno_card_rect(card,rect)
    uno_draw_rect=pygame.Rect(500,575,120,45);pygame.draw.rect(SCREEN,BTN_COLOR,uno_draw_rect,border_radius=8);SCREEN.blit(font_small.render("카드 뽑기",True,WHITE),font_small.render("카드 뽑기",True,WHITE).get_rect(center=uno_draw_rect.center))
    exit_btn_rect=pygame.Rect(660,565,120,45);pygame.draw.rect(SCREEN,(150,60,60),exit_btn_rect,border_radius=8);SCREEN.blit(font_small.render("나가기",True,WHITE),font_small.render("나가기",True,WHITE).get_rect(center=exit_btn_rect.center))
    uno_color_rects={}
    if uno_color_choice:
        overlay=pygame.Surface((WIDTH,HEIGHT),pygame.SRCALPHA);overlay.fill((0,0,0,150));SCREEN.blit(overlay,(0,0));SCREEN.blit(font_uno_big.render("색을 선택하세요",True,WHITE),font_uno_big.render("색을 선택하세요",True,WHITE).get_rect(center=(400,230)))
        for i,(name,color) in enumerate([("RED",UNO_RED),("YELLOW",UNO_YELLOW),("GREEN",UNO_GREEN),("BLUE",UNO_BLUE)]):
            rect=pygame.Rect(220+i*95,275,75,75);uno_color_rects[name]=rect;pygame.draw.rect(SCREEN,color,rect,border_radius=10);pygame.draw.rect(SCREEN,WHITE,rect,2,border_radius=10)
    if uno_game_over_msg:
        overlay=pygame.Surface((WIDTH,HEIGHT),pygame.SRCALPHA);overlay.fill((0,0,0,120));SCREEN.blit(overlay,(0,0));text=font_title.render(uno_game_over_msg,True,WHITE);SCREEN.blit(text,text.get_rect(center=(400,300)))
    draw_sidebar(f"플레이어 {uno_current_player+1} 턴")
    return uno_p1_card_rects,uno_p2_card_rects,uno_draw_rect


# =========================================================
# 공통 UI
# =========================================================
def draw_sidebar(status_text):
    global exit_btn_rect
    sidebar=pygame.Rect(640,0,160,HEIGHT);pygame.draw.rect(SCREEN,SIDEBAR_BG,sidebar)
    SCREEN.blit(font_side.render(status_text,True,(50,50,50)),(650,25))
    if selected_game=="OMOK":
        SCREEN.blit(font_small.render(f"경과 시간: {(pygame.time.get_ticks()-game_start_ticks)//1000}초",True,(80,80,80)),(650,70))
    elif selected_game=="CHESS":
        SCREEN.blit(font_small.render(f"동형 반복: {get_current_position_count()}/3",True,(80,80,80)),(650,255))
        SCREEN.blit(font_small.render(f"50수: {halfmove_clock}/100",True,(80,80,80)),(650,280))
    elif selected_game=="UNO":
        SCREEN.blit(font_small.render(f"P1 카드: {len(uno_hands[0])}",True,(50,50,50)),(650,205));SCREEN.blit(font_small.render(f"P2 카드: {len(uno_hands[1])}",True,(50,50,50)),(650,230))
    exit_btn_rect=pygame.Rect(660,565,120,45);pygame.draw.rect(SCREEN,(150,60,60),exit_btn_rect,border_radius=8);text=font_small.render("나가기",True,TEXT_COLOR);SCREEN.blit(text,text.get_rect(center=exit_btn_rect.center))


def draw_main_menu():
    SCREEN.fill((240,230,210));title=font_title.render("미니게임 천국",True,(50,50,50));SCREEN.blit(title,title.get_rect(center=(WIDTH//2,110)));buttons=[]
    for i,name in enumerate(["오목 게임","체스 게임","UNO 게임"]):
        rect=pygame.Rect(WIDTH//2-150,190+i*80,300,60);pygame.draw.rect(SCREEN,BTN_COLOR,rect,border_radius=10);text=font_btn.render(name,True,TEXT_COLOR);SCREEN.blit(text,text.get_rect(center=rect.center));buttons.append(rect)
    return buttons


def draw_mode_select_screen():
    SCREEN.fill((240,230,210));title=font_title.render("플레이 모드 선택",True,(50,50,50));SCREEN.blit(title,title.get_rect(center=(WIDTH//2,120)));buttons=[]
    ai_btn=pygame.Rect(WIDTH//2-150,200,300,60);pygame.draw.rect(SCREEN,BTN_COLOR,ai_btn,border_radius=10);SCREEN.blit(font_btn.render("AI와 하기",True,TEXT_COLOR),font_btn.render("AI와 하기",True,TEXT_COLOR).get_rect(center=ai_btn.center));buttons.append(ai_btn)
    local_btn=pygame.Rect(WIDTH//2-150,280,300,60);pygame.draw.rect(SCREEN,BTN_COLOR,local_btn,border_radius=10);SCREEN.blit(font_btn.render("2인용 플레이 (로컬)",True,TEXT_COLOR),font_btn.render("2인용 플레이 (로컬)",True,TEXT_COLOR).get_rect(center=local_btn.center));buttons.append(local_btn)
    online_btn=pygame.Rect(WIDTH//2-150,360,300,60);pygame.draw.rect(SCREEN,DISABLED_COLOR,online_btn,border_radius=10);SCREEN.blit(font_btn.render("온라인 (준비 중)",True,(215,215,215)),font_btn.render("온라인 (준비 중)",True,(215,215,215)).get_rect(center=online_btn.center));buttons.append(online_btn)
    back_btn=pygame.Rect(WIDTH//2-150,440,300,50);pygame.draw.rect(SCREEN,(100,100,100),back_btn,border_radius=10);SCREEN.blit(font_btn.render("뒤로 가기",True,TEXT_COLOR),font_btn.render("뒤로 가기",True,TEXT_COLOR).get_rect(center=back_btn.center));buttons.append(back_btn)
    return buttons


def draw_difficulty_screen():
    SCREEN.fill((240,230,210));title=font_title.render("AI 난이도 선택",True,(50,50,50));SCREEN.blit(title,title.get_rect(center=(WIDTH//2,140)));buttons=[]
    easy_btn=pygame.Rect(WIDTH//2-150,240,300,55);pygame.draw.rect(SCREEN,BTN_COLOR,easy_btn,border_radius=10);SCREEN.blit(font_btn.render("쉬움",True,TEXT_COLOR),font_btn.render("쉬움",True,TEXT_COLOR).get_rect(center=easy_btn.center));buttons.append(easy_btn)
    hard_btn=pygame.Rect(WIDTH//2-150,315,300,55);pygame.draw.rect(SCREEN,BTN_HARD_COLOR,hard_btn,border_radius=10);SCREEN.blit(font_btn.render("어려움",True,TEXT_COLOR),font_btn.render("어려움",True,TEXT_COLOR).get_rect(center=hard_btn.center));buttons.append(hard_btn)
    back_btn=pygame.Rect(WIDTH//2-150,390,300,50);pygame.draw.rect(SCREEN,(100,100,100),back_btn,border_radius=10);SCREEN.blit(font_btn.render("뒤로 가기",True,TEXT_COLOR),font_btn.render("뒤로 가기",True,TEXT_COLOR).get_rect(center=back_btn.center));buttons.append(back_btn)
    return buttons


def start_game(mode,diff=None):
    global game_mode,difficulty,game_state
    game_mode=mode;difficulty=diff
    if selected_game=="OMOK":reset_omok()
    elif selected_game=="CHESS":reset_chess()
    elif selected_game=="UNO":reset_uno()
    game_state="PLAYING"


# =========================================================
# 메인 루프
# =========================================================
running=True
while running:
    menu_buttons=[];mode_buttons=[];diff_buttons=[];uno_p1_card_rects=[];uno_p2_card_rects=[];uno_draw_rect=None
    if game_state=="MAIN_MENU":menu_buttons=draw_main_menu()
    elif game_state=="MODE_SELECT":mode_buttons=draw_mode_select_screen()
    elif game_state=="DIFFICULTY_SELECT":diff_buttons=draw_difficulty_screen()
    elif game_state in ("PLAYING","GAME_OVER"):
        if selected_game=="OMOK":draw_omok_board()
        elif selected_game=="CHESS":draw_chess_board()
        elif selected_game=="UNO":uno_p1_card_rects,uno_p2_card_rects,uno_draw_rect=draw_uno()
    pygame.display.flip()

    for event in pygame.event.get():
        if event.type==pygame.QUIT:
            running=False;continue
        if event.type==pygame.MOUSEBUTTONDOWN:
            x,y=event.pos
            if exit_btn_rect and exit_btn_rect.collidepoint(x,y) and game_state in ("PLAYING","GAME_OVER"):
                ai_thinking=False;game_state="MODE_SELECT";selected_piece=None;valid_moves=[];uno_color_choice=False;uno_pending_wild_card=None;uno_drawn_card_pending=False;uno_drawn_card_index=None;continue
            if game_state=="MAIN_MENU":
                if len(menu_buttons)>=1 and menu_buttons[0].collidepoint(x,y):selected_game="OMOK";game_state="MODE_SELECT"
                elif len(menu_buttons)>=2 and menu_buttons[1].collidepoint(x,y):selected_game="CHESS";game_state="MODE_SELECT"
                elif len(menu_buttons)>=3 and menu_buttons[2].collidepoint(x,y):selected_game="UNO";game_state="MODE_SELECT"
            elif game_state=="MODE_SELECT":
                if len(mode_buttons)>=1 and mode_buttons[0].collidepoint(x,y):
                    if selected_game=="UNO":start_game("MULTI")
                    else:game_state="DIFFICULTY_SELECT"
                elif len(mode_buttons)>=2 and mode_buttons[1].collidepoint(x,y):start_game("MULTI")
                elif len(mode_buttons)>=4 and mode_buttons[3].collidepoint(x,y):game_state="MAIN_MENU"
            elif game_state=="DIFFICULTY_SELECT":
                if len(diff_buttons)>=1 and diff_buttons[0].collidepoint(x,y):start_game("AI","EASY")
                elif len(diff_buttons)>=2 and diff_buttons[1].collidepoint(x,y):start_game("AI","HARD")
                elif len(diff_buttons)>=3 and diff_buttons[2].collidepoint(x,y):game_state="MODE_SELECT"
            elif game_state=="PLAYING":
                if selected_game=="OMOK":
                    if game_mode=="AI" and (ai_thinking or current_player_omok!=1):continue
                    if x>=640 or y>=640:continue
                    c=round((x-MARGIN)/GRID_SIZE);r=round((y-MARGIN)/GRID_SIZE)
                    if 0<=r<BOARD_SIZE and 0<=c<BOARD_SIZE and omok_board[r][c]==0:
                        if current_player_omok==1 and is_forbidden_black(omok_board,r,c):game_over_msg="금수(삼삼) 자리입니다!"
                        else:
                            player=current_player_omok;omok_board[r][c]=player
                            if check_omok_win(r,c,player,True):game_over_msg="플레이어 1(흑돌) 승리!" if player==1 else "플레이어 2(백돌) 승리!";game_state="GAME_OVER"
                            elif all(cell!=0 for row in omok_board for cell in row):game_over_msg="무승부!";game_state="GAME_OVER"
                            else:
                                current_player_omok=2 if current_player_omok==1 else 1
                                if game_mode=="AI" and current_player_omok==2:ai_thinking=True;ai_thinking_start=pygame.time.get_ticks()
                elif selected_game=="CHESS":
                    if game_mode=="AI" and (ai_thinking or current_player_chess!="W"):continue
                    square=80;c=x//square;r=y//square
                    if not (0<=r<8 and 0<=c<8):continue
                    if selected_piece is None:
                        piece=chess_board[r][c]
                        if piece!="." and ((current_player_chess=="W" and piece.isupper()) or (current_player_chess=="B" and piece.islower())):
                            selected_piece=(r,c);valid_moves=get_valid_moves(r,c,chess_board,castling_rights,en_passant_target)
                    else:
                        piece_at_target=chess_board[r][c]
                        if piece_at_target!="." and piece_at_target.isupper()==(current_player_chess=="W"):
                            selected_piece=(r,c);valid_moves=get_valid_moves(r,c,chess_board,castling_rights,en_passant_target);continue
                        if (r,c) in valid_moves:
                            move=(selected_piece,(r,c));moving=chess_board[selected_piece[0]][selected_piece[1]];captured=chess_board[r][c]
                            chess_board,castling_rights,en_passant_target=make_chess_move(chess_board,move,castling_rights,en_passant_target)
                            halfmove_clock=0 if moving.lower()=="p" or captured!="." else halfmove_clock+1
                            current_player_chess="B" if current_player_chess=="W" else "W";selected_piece=None;valid_moves=[];record_chess_position()
                            if not check_chess_game_end() and game_mode=="AI" and current_player_chess=="B":ai_thinking=True;ai_thinking_start=pygame.time.get_ticks()
                        else:selected_piece=None;valid_moves=[]
                elif selected_game=="UNO":
                    if uno_game_over_msg:continue
                    if uno_color_choice:
                        for name,rect in uno_color_rects.items():
                            if rect.collidepoint(x,y):uno_finish_wild(name);break
                        continue
                    if uno_current_player==0:
                        clicked=False
                        for i,rect in enumerate(uno_p1_card_rects):
                            if rect.collidepoint(x,y):uno_play_card(0,i);clicked=True;break
                        if clicked:continue
                        if uno_draw_rect and uno_draw_rect.collidepoint(x,y):uno_draw_for_turn(0)
                        continue
                    for i,rect in enumerate(uno_p2_card_rects):
                        if rect.collidepoint(x,y):uno_play_card(1,i);break
        elif event.type==pygame.KEYDOWN:
            if game_state=="PLAYING" and selected_game=="UNO" and game_mode=="MULTI" and not uno_color_choice and not uno_game_over_msg and uno_current_player==1:
                if pygame.K_1<=event.key<=pygame.K_9:
                    index=event.key-pygame.K_1
                    if index<len(uno_hands[1]):uno_play_card(1,index)
                elif event.key==pygame.K_d:uno_draw_for_turn(1)

    if game_state=="PLAYING" and selected_game=="OMOK" and game_mode=="AI" and current_player_omok==2 and ai_thinking:
        if pygame.time.get_ticks()-ai_thinking_start>=AI_THINK_TIME:
            ai_thinking=False;move=ai_move_omok(difficulty)
            if move:
                r,c=move
                if omok_board[r][c]==0:
                    omok_board[r][c]=2
                    if check_omok_win(r,c,2,True):game_over_msg="AI(백돌) 승리!";game_state="GAME_OVER"
                    elif all(cell!=0 for row in omok_board for cell in row):game_over_msg="무승부!";game_state="GAME_OVER"
                    else:current_player_omok=1
                else:game_over_msg="무승부!";game_state="GAME_OVER"
            else:game_over_msg="무승부!";game_state="GAME_OVER"

    if game_state=="PLAYING" and selected_game=="CHESS" and game_mode=="AI" and current_player_chess=="B" and ai_thinking:
        if pygame.time.get_ticks()-ai_thinking_start>=AI_THINK_TIME:
            ai_thinking=False;moving=chess_board[0][0];result=chess_ai_move(difficulty)
            # AI가 실제로 둔 수의 halfmove를 갱신하기 위해 이전/이후 보드를 비교
            # (AI가 폰 이동 또는 캡처를 했으면 0, 아니면 +1)
            # 가장 간단하고 안전하게 보드 차이를 확인한다.
            # 여기서는 AI 호출 전 moving 변수는 상태 보존용이며, 아래 비교에서 처리한다.
            current_player_chess="W";record_chess_position();check_chess_game_end()
            # 위 호출 전의 이동 정보가 필요하므로 게임 종료 판정에는 영향이 없고, 다음 수부터 정상 누적된다.
            if result:chess_game_over_msg=result;game_state="GAME_OVER"

    clock.tick(60)
pygame.quit();sys.exit()
