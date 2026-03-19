"""
Spar Arena Simulator — faithful port of the JS spar physics.
Used for training a neural execution layer. Every constant and formula
is ported directly from the JS codebase with source references.

Usage:
    from spar_sim import SparSim
    sim = SparSim()
    sim.reset()
    for _ in range(3600):  # 60 seconds at 60fps
        obs = sim.get_obs()
        sim.step(action_a=0, action_b=0)  # both idle
        if sim.done:
            break
"""

import math
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

# ============================================================
# CONSTANTS — exact values from js/shared/gameConfig.js
# ============================================================
TILE = 48                       # px per tile
BULLET_SPEED = 9                # px/frame, cardinal only
BULLET_HALF_LONG = 15           # rect half-length along travel
BULLET_HALF_SHORT = 4           # rect half-width perpendicular
ENTITY_R = 29                   # hitbox circle radius
PLAYER_HITBOX_Y = -25           # torso center offset from feet
PLAYER_WALL_HW = 14             # movement AABB half-width
PLAYER_BASE_SPEED = 7.5         # px/frame movement speed
DEFAULT_HITBOX_R = 33           # ENTITY_R + BULLET_HALF_SHORT

# CT-X gun base stats (js/core/interactable.js CT_X_GUN)
CTX_DAMAGE = 20
CTX_MAG_SIZE = 30
CTX_FREEZE_DURATION = 15        # frames, always fixed

# Arena: spar_1v1_01 from js/shared/levelData.js
ARENA_W_TILES = 24
ARENA_H_TILES = 20
ARENA_W = ARENA_W_TILES * TILE  # 1152 px
ARENA_H = ARENA_H_TILES * TILE  # 960 px

# Spawns: tile center = tx*48+24
SPAWN_A = (4 * TILE + 24, 10 * TILE + 24)    # (216, 504)
SPAWN_B = (19 * TILE + 24, 10 * TILE + 24)   # (936, 504)

# Curated spawn presets: (ax_tile, ay_tile, bx_tile, by_tile)
# 16 realistic spar starts — varied gaps, Y offsets, diagonals
# With 50% horizontal flip → 32 effective configurations
SPAWN_PRESETS = [
    (4, 10, 19, 10),   # game default
    (4, 9, 19, 11),    # slight Y offset
    (4, 11, 19, 9),    # reversed Y offset
    (4, 8, 19, 12),    # wider Y offset
    (4, 12, 19, 8),    # reversed wide Y
    (6, 10, 17, 10),   # closer X, center Y
    (6, 9, 17, 11),    # closer X, offset Y
    (6, 11, 17, 9),    # closer X, reversed
    (3, 10, 20, 10),   # wider X, center Y
    (3, 9, 20, 11),    # wider X, offset Y
    (5, 8, 18, 12),    # moderate diagonal
    (5, 12, 18, 8),    # reversed diagonal
    (5, 10, 18, 10),   # moderate X, center
    (4, 7, 19, 13),    # steep diagonal
    (4, 13, 19, 7),    # reversed steep
    (6, 7, 17, 13),    # close + steep diagonal
]

# HP
HP_BASELINE = 100
MAX_MATCH_FRAMES = 3600  # 60 seconds


# ============================================================
# CT-X STAT CONVERSION — from js/shared/sparData.js
# ============================================================
def ctx_freeze_penalty(freeze_pts: float) -> float:
    """freezeToStat: 0→0.90, 50→0.45, 100→0.00"""
    return 0.90 - freeze_pts * 0.009


def ctx_fire_rate(rof_pts: float) -> float:
    """rofToStat: points → frames between shots"""
    p = min(100, rof_pts * 1.2)
    if p <= 50:
        return 11.025 - p * 0.1125
    else:
        return 5.4 - (p - 50) * 0.0375


def ctx_reload_frames(rof_pts: float) -> int:
    """_sparCtxReloadFromRof: points → reload duration frames"""
    p = min(100, rof_pts * 1.2)
    base = round(20 + p * 0.25)
    return round(base * 1.2)


def ctx_spread_deg(spread_pts: float) -> float:
    """spreadToStat: 0→0°, 100→50°"""
    return spread_pts * 0.5


# ============================================================
# COLLISION — from js/authority/mobSystem.js positionClear()
#             and js/core/sceneManager.js isSolid()
# ============================================================

# Build collision grid: 1-tile border walls, open interior
# collisionAscii from levelData.js spar_1v1_01
COLLISION_GRID = []
for row in range(ARENA_H_TILES):
    grid_row = []
    for col in range(ARENA_W_TILES):
        # Border walls: first/last row, first/last col
        if row == 0 or row == ARENA_H_TILES - 1 or col == 0 or col == ARENA_W_TILES - 1:
            grid_row.append(1)
        else:
            grid_row.append(0)
    COLLISION_GRID.append(grid_row)


def is_solid(col: int, row: int) -> bool:
    """isSolid from sceneManager.js — checks collision grid bounds + value"""
    if col < 0 or row < 0 or col >= ARENA_W_TILES or row >= ARENA_H_TILES:
        return True
    return COLLISION_GRID[row][col] == 1


def position_clear(px: float, py: float, hw: float = PLAYER_WALL_HW) -> bool:
    """positionClear from mobSystem.js — AABB 4-corner check"""
    c_l = math.floor((px - hw) / TILE)
    c_r = math.floor((px + hw) / TILE)
    r_t = math.floor((py - hw) / TILE)
    r_b = math.floor((py + hw) / TILE)
    return (not is_solid(c_l, r_t) and not is_solid(c_r, r_t) and
            not is_solid(c_l, r_b) and not is_solid(c_r, r_b))


# ============================================================
# BULLET HIT TEST — from js/core/meleeSystem.js _bulletHitsCircle()
# ============================================================
def bullet_hits_circle(bx: float, by: float, bvx: float, bvy: float,
                       ex: float, ey: float, er: float = ENTITY_R) -> bool:
    """Rectangle-circle collision: bullet rect vs entity circle.
    Bullet rect oriented by travel direction."""
    is_h = abs(bvx) > abs(bvy)
    hw = BULLET_HALF_LONG if is_h else BULLET_HALF_SHORT
    hh = BULLET_HALF_SHORT if is_h else BULLET_HALF_LONG
    cdx = max(0.0, abs(bx - ex) - hw)
    cdy = max(0.0, abs(by - ey) - hh)
    return cdx * cdx + cdy * cdy < er * er


# ============================================================
# DATA CLASSES
# ============================================================
@dataclass
class Gun:
    damage: int = CTX_DAMAGE
    mag_size: int = CTX_MAG_SIZE
    ammo: int = CTX_MAG_SIZE
    fire_rate: float = 5.4       # frames between shots (50/50 build default)
    reload_speed: int = 42       # frames to reload (50/50 build default)
    freeze_penalty: float = 0.45 # speed multiplier reduction (50/50 build)
    freeze_duration: int = CTX_FREEZE_DURATION
    spread_deg: float = 0.0
    reloading: bool = False
    reload_timer: int = 0
    shoot_cd: int = 0            # frames until can fire again

    @staticmethod
    def from_points(freeze_pts: float, rof_pts: float, spread_pts: float) -> 'Gun':
        return Gun(
            fire_rate=ctx_fire_rate(rof_pts),
            reload_speed=ctx_reload_frames(rof_pts),
            freeze_penalty=ctx_freeze_penalty(freeze_pts),
            spread_deg=ctx_spread_deg(spread_pts),
        )


@dataclass
class Bullet:
    x: float
    y: float
    vx: float
    vy: float
    team: str           # 'a' or 'b'
    damage: int = CTX_DAMAGE


@dataclass
class Fighter:
    x: float
    y: float
    vx: float = 0.0     # current frame velocity (for observation)
    vy: float = 0.0
    hp: int = HP_BASELINE
    speed: float = PLAYER_BASE_SPEED
    gun: Gun = field(default_factory=Gun)
    freeze_timer: int = 0
    freeze_penalty: float = 0.0
    team: str = 'a'
    dir: int = 0         # 0=down, 1=up, 2=left, 3=right
    alive: bool = True


# ============================================================
# ACTIONS — discrete primitives the strategic layer understands
# ============================================================
# The neural net picks one action per frame. The sim converts it
# to moveX, moveY, shoot.
ACTION_NAMES = [
    'idle',             # 0: stand still (strafe lightly)
    'push',             # 1: move toward enemy
    'retreat',          # 2: move away from enemy
    'strafe_left',      # 3: strafe left (relative to arena)
    'strafe_right',     # 4: strafe right
    'dodge_left',       # 5: dodge perpendicular left
    'dodge_right',      # 6: dodge perpendicular right
    'descend',          # 7: move toward bottom (positive Y)
    'ascend',           # 8: move toward top (negative Y)
    'shoot',            # 9: fire (if able) + maintain position
]
NUM_ACTIONS = len(ACTION_NAMES)


def action_to_movement(action: int, fighter: Fighter, enemy: Fighter) -> Tuple[float, float, bool]:
    """Convert discrete action to (moveX, moveY, should_shoot).
    Movement is at full speed in the chosen direction."""
    s = fighter.speed
    dx = enemy.x - fighter.x
    dy = enemy.y - fighter.y
    dist = math.sqrt(dx * dx + dy * dy)
    if dist < 1:
        dist = 1

    shoot = False
    mx, my = 0.0, 0.0

    if action == 0:    # idle — slight lateral drift
        mx = s * 0.3 * (1 if fighter.x < ARENA_W / 2 else -1)
    elif action == 1:  # push toward enemy
        mx = (dx / dist) * s
        my = (dy / dist) * s
    elif action == 2:  # retreat from enemy
        mx = -(dx / dist) * s
        my = -(dy / dist) * s
    elif action == 3:  # strafe left
        mx = -s
    elif action == 4:  # strafe right
        mx = s
    elif action == 5:  # dodge left (perpendicular to enemy direction)
        # Perpendicular: rotate (dx,dy) by 90° CCW
        mx = (dy / dist) * s
        my = -(dx / dist) * s
    elif action == 6:  # dodge right (perpendicular CW)
        mx = -(dy / dist) * s
        my = (dx / dist) * s
    elif action == 7:  # descend (toward bottom)
        my = s
    elif action == 8:  # ascend (toward top)
        my = -s
    elif action == 9:  # shoot + hold position
        shoot = True
        # Slight strafe while shooting
        mx = s * 0.2 * (1 if fighter.x < enemy.x else -1)

    return mx, my, shoot


# ============================================================
# SIMULATION
# ============================================================
class SparSim:
    """Headless spar arena simulator with exact JS physics."""

    def __init__(self, gun_a: Optional[Gun] = None, gun_b: Optional[Gun] = None):
        self.gun_a_template = gun_a or Gun.from_points(50, 50, 0)  # default 50/50 build
        self.gun_b_template = gun_b or Gun.from_points(50, 50, 0)
        self.reset()

    def reset(self) -> dict:
        """Reset to match start. Returns initial observation."""
        self.frame = 0
        self.done = False
        self.winner = None  # 'a', 'b', or 'draw'
        self.bullets: List[Bullet] = []

        # Spawn targeting: A = trained/exported side, must match live deployment
        # Live: neural bot = teamB at SPAWN_B (936,504), player at SPAWN_A (216,504)
        # So trained side A should predominantly start at the RIGHT position
        roll = random.random()
        if roll < 0.75:
            # 75%: Exact live deployment — A at right, B at left
            ax, ay = SPAWN_B  # (936, 504)
            bx, by = SPAWN_A  # (216, 504)
        elif roll < 0.85:
            # 10%: Mirrored — A at left, B at right (generalization)
            ax, ay = SPAWN_A  # (216, 504)
            bx, by = SPAWN_B  # (936, 504)
        else:
            # 15%: Curated variants, A preferentially on right
            preset = random.choice(SPAWN_PRESETS[1:])
            left_x = preset[0] * TILE + 24
            left_y = preset[1] * TILE + 24
            right_x = preset[2] * TILE + 24
            right_y = preset[3] * TILE + 24
            # A takes rightward position 75% of the time
            if random.random() < 0.75:
                ax, ay, bx, by = right_x, right_y, left_x, left_y
            else:
                ax, ay, bx, by = left_x, left_y, right_x, right_y

        self.a = Fighter(
            x=ax, y=ay,
            gun=Gun.from_points(0, 0, 0),
            team='a', dir=2 if ax > bx else 3,  # face toward enemy
        )
        self.a.gun = self._copy_gun(self.gun_a_template)

        self.b = Fighter(
            x=bx, y=by,
            gun=Gun.from_points(0, 0, 0),
            team='b', dir=2 if bx > ax else 3,  # face toward enemy
        )
        self.b.gun = self._copy_gun(self.gun_b_template)

        # Stats tracking
        self.stats = {
            'a_dmg_dealt': 0, 'b_dmg_dealt': 0,
            'a_shots_fired': 0, 'b_shots_fired': 0,
            'a_shots_hit': 0, 'b_shots_hit': 0,
        }

        # Per-frame tracking for reward shaping
        self._prev_hp_a = self.a.hp
        self._prev_hp_b = self.b.hp
        self._last_action_a = -1
        self._last_action_b = -1
        self._action_repeat_a = 0
        self._action_repeat_b = 0
        self._no_shoot_frames_a = 0
        self._no_shoot_frames_b = 0

        return self.get_obs()

    def _copy_gun(self, template: Gun) -> Gun:
        return Gun(
            damage=template.damage,
            mag_size=template.mag_size,
            ammo=template.mag_size,
            fire_rate=template.fire_rate,
            reload_speed=template.reload_speed,
            freeze_penalty=template.freeze_penalty,
            freeze_duration=template.freeze_duration,
            spread_deg=template.spread_deg,
        )

    def step(self, action_a: int, action_b: int) -> Tuple[dict, float, float, bool]:
        """Advance one frame. Returns (obs, reward_a, reward_b, done)."""
        if self.done:
            return self.get_obs(), 0.0, 0.0, True

        self.frame += 1

        # Track HP before this frame (for damage reward)
        self._prev_hp_a = self.a.hp
        self._prev_hp_b = self.b.hp

        # Track action repeats
        if action_a == self._last_action_a:
            self._action_repeat_a += 1
        else:
            self._action_repeat_a = 0
        self._last_action_a = action_a

        if action_b == self._last_action_b:
            self._action_repeat_b += 1
        else:
            self._action_repeat_b = 0
        self._last_action_b = action_b

        # Passivity tracking moved to after shooting (check actual shots, not intent)
        _prev_shots_a = self.stats['a_shots_fired']
        _prev_shots_b = self.stats['b_shots_fired']

        # Convert actions to movement + shoot intent
        mx_a, my_a, shoot_a = action_to_movement(action_a, self.a, self.b)
        mx_b, my_b, shoot_b = action_to_movement(action_b, self.b, self.a)

        # Apply freeze penalty (js: sparSystem.js lines 6959-6966)
        mx_a, my_a = self._apply_freeze(self.a, mx_a, my_a)
        mx_b, my_b = self._apply_freeze(self.b, mx_b, my_b)

        # Normalize to max speed
        mx_a, my_a = self._clamp_speed(mx_a, my_a, self.a.speed)
        mx_b, my_b = self._clamp_speed(mx_b, my_b, self.b.speed)

        # Move fighters (js: collision via positionClear)
        self._move_fighter(self.a, mx_a, my_a)
        self._move_fighter(self.b, mx_b, my_b)

        # Gun cooldowns
        self._tick_gun(self.a)
        self._tick_gun(self.b)

        # Shooting
        if shoot_a:
            self._try_shoot(self.a, self.b)
        if shoot_b:
            self._try_shoot(self.b, self.a)

        # Move bullets + check collisions
        self._tick_bullets()

        # Track passivity: reset on ACTUAL shot fired, not action intent
        if self.stats['a_shots_fired'] > _prev_shots_a:
            self._no_shoot_frames_a = 0
        else:
            self._no_shoot_frames_a += 1
        if self.stats['b_shots_fired'] > _prev_shots_b:
            self._no_shoot_frames_b = 0
        else:
            self._no_shoot_frames_b += 1

        # Check match end
        if self.a.hp <= 0 or self.b.hp <= 0 or self.frame >= MAX_MATCH_FRAMES:
            self.done = True
            if self.a.hp <= 0 and self.b.hp <= 0:
                self.winner = 'draw'
            elif self.a.hp <= 0:
                self.winner = 'b'
            elif self.b.hp <= 0:
                self.winner = 'a'
            else:
                # Timeout: whoever has more HP wins
                if self.a.hp > self.b.hp:
                    self.winner = 'a'
                elif self.b.hp > self.a.hp:
                    self.winner = 'b'
                else:
                    self.winner = 'draw'

        # Compute rewards
        reward_a, reward_b = self._compute_rewards()

        return self.get_obs(), reward_a, reward_b, self.done

    def _apply_freeze(self, f: Fighter, mx: float, my: float) -> Tuple[float, float]:
        """Post-shot freeze: reduce speed. js: sparSystem.js lines 6959-6966"""
        if f.freeze_timer > 0:
            f.freeze_timer -= 1
            penalty = f.freeze_penalty
            mx *= (1.0 - penalty)
            my *= (1.0 - penalty)
        return mx, my

    def _clamp_speed(self, mx: float, my: float, max_speed: float) -> Tuple[float, float]:
        mag = math.sqrt(mx * mx + my * my)
        if mag > max_speed and mag > 0.01:
            mx = (mx / mag) * max_speed
            my = (my / mag) * max_speed
        return mx, my

    def _move_fighter(self, f: Fighter, mx: float, my: float):
        """Move with per-axis collision. js: sparSystem.js lines 7028-7029"""
        if position_clear(f.x + mx, f.y, PLAYER_WALL_HW):
            f.x += mx
        if position_clear(f.x, f.y + my, PLAYER_WALL_HW):
            f.y += my
        f.vx = mx
        f.vy = my

    def _tick_gun(self, f: Fighter):
        """Tick gun cooldowns. js: sparSystem.js _tickSparWeapons"""
        g = f.gun
        if g.reloading:
            g.reload_timer -= 1
            if g.reload_timer <= 0:
                g.reloading = False
                g.ammo = g.mag_size
        if g.shoot_cd > 0:
            g.shoot_cd -= 1

    def _try_shoot(self, shooter: Fighter, target: Fighter):
        """Attempt to fire. js: sparSystem.js _sparBotShoot"""
        g = shooter.gun
        if g.reloading or g.ammo <= 0 or g.shoot_cd > 0:
            return

        # Determine aim direction (cardinal, with lead prediction)
        # js: sparSystem.js lines 2975-3019
        t_vx = target.vx
        t_vy = target.vy
        raw_dx = target.x - shooter.x
        raw_dy = target.y - shooter.y
        raw_dist = math.sqrt(raw_dx * raw_dx + raw_dy * raw_dy)

        travel_frames = raw_dist / BULLET_SPEED if raw_dist > 1 else 5.0
        lead_frames = min(travel_frames, 15.0)

        pred_x = target.x + t_vx * lead_frames * 0.5
        pred_y = target.y + t_vy * lead_frames * 0.5

        dx = pred_x - shooter.x
        dy = pred_y - shooter.y

        # Cardinal direction: choose axis with larger component
        if abs(dx) >= abs(dy):
            bvx = BULLET_SPEED if dx > 0 else -BULLET_SPEED
            bvy = 0.0
            shooter.dir = 3 if dx > 0 else 2
        else:
            bvx = 0.0
            bvy = BULLET_SPEED if dy > 0 else -BULLET_SPEED
            shooter.dir = 0 if dy > 0 else 1

        # Apply spread (js: lines 3010-3018)
        if g.spread_deg > 0:
            spread_rad = g.spread_deg * math.pi / 180.0
            rand_offset = (random.random() - 0.5) * spread_rad
            base_angle = math.atan2(bvy, bvx)
            new_angle = base_angle + rand_offset
            bvx = math.cos(new_angle) * BULLET_SPEED
            bvy = math.sin(new_angle) * BULLET_SPEED

        # Muzzle position: simplified — spawn at shooter center
        # (Full muzzle offset depends on sprite geometry which doesn't affect
        # gameplay meaningfully. For sim fidelity we use shooter.x, hitbox Y)
        mx = shooter.x
        my = shooter.y + PLAYER_HITBOX_Y  # torso center

        self.bullets.append(Bullet(x=mx, y=my, vx=bvx, vy=bvy,
                                   team=shooter.team, damage=g.damage))

        # Apply fire cooldown and freeze
        g.shoot_cd = round(g.fire_rate * 4)  # js: Math.round(fireRate * 4)
        g.ammo -= 1
        if g.ammo <= 0:
            g.reloading = True
            g.reload_timer = g.reload_speed

        # Freeze penalty
        shooter.freeze_timer = g.freeze_duration
        shooter.freeze_penalty = g.freeze_penalty

        # Stats
        self.stats[f'{shooter.team}_shots_fired'] += 1

    def _tick_bullets(self):
        """Move bullets, check wall collision and entity hits.
        js: meleeSystem.js lines 949-1072"""
        remaining = []
        for b in self.bullets:
            # Move
            b.x += b.vx
            b.y += b.vy

            # Wall collision (js: line 978)
            col = math.floor(b.x / TILE)
            row = math.floor(b.y / TILE)
            if is_solid(col, row):
                continue  # bullet destroyed by wall

            # Entity hit check (js: lines 1047-1072)
            hit = False
            target = self.b if b.team == 'a' else self.a
            if target.alive:
                hit_y = target.y + PLAYER_HITBOX_Y
                if bullet_hits_circle(b.x, b.y, b.vx, b.vy,
                                      target.x, hit_y, ENTITY_R):
                    target.hp -= b.damage
                    self.stats[f'{b.team}_shots_hit'] += 1
                    self.stats[f'{"b" if b.team == "a" else "a"}_dmg_dealt'] -= 0  # tracked via hits
                    hit = True

            if not hit:
                remaining.append(b)

        self.bullets = remaining

    def _compute_rewards(self) -> Tuple[float, float]:
        """Per-frame reward signal. Shaped to encourage fighting, not camping."""
        r_a = 0.0
        r_b = 0.0

        # === Terminal reward: win/loss ===
        if self.done:
            if self.winner == 'a':
                r_a += 1.0
                r_b -= 1.0
            elif self.winner == 'b':
                r_a -= 1.0
                r_b += 1.0
            # draw: slight penalty for both (incentivize decisive play)
            else:
                r_a -= 0.1
                r_b -= 0.1

        # === Damage rewards: zero-sum differential ===
        # Trades are worth 0; only unanswered hits matter
        dmg_dealt_a = max(0, self._prev_hp_b - self.b.hp)
        dmg_dealt_b = max(0, self._prev_hp_a - self.a.hp)
        dmg_diff = (dmg_dealt_a - dmg_dealt_b) * 0.01  # +0.2 for unanswered hit
        r_a += dmg_diff
        r_b -= dmg_diff

        # === Anti-camping: capped repetition penalty ===
        # Starts after 10 frames, capped at 0.01/frame to never exceed win reward
        if self._action_repeat_a > 10:
            r_a -= min(0.01, 0.002 * (self._action_repeat_a - 10))
        if self._action_repeat_b > 10:
            r_b -= min(0.01, 0.002 * (self._action_repeat_b - 10))

        # === Anti-passivity: penalize never shooting ===
        # If >120 frames (2 seconds) without attempting to shoot, small penalty
        if self._no_shoot_frames_a > 120:
            r_a -= 0.001
        if self._no_shoot_frames_b > 120:
            r_b -= 0.001

        # === Engagement range reward ===
        # Reward being in fighting range (not camping at max distance)
        dx = self.a.x - self.b.x
        dy = self.a.y - self.b.y
        dist = math.sqrt(dx * dx + dy * dy)
        # Sweet spot: 150-400px (close enough to fight, not stacking)
        if 150 < dist < 400:
            r_a += 0.0005
            r_b += 0.0005
        elif dist > 500:
            # Too far apart — both penalized for disengaging
            r_a -= 0.0003
            r_b -= 0.0003

        # Bottom position reward REMOVED — caused desc action collapse.
        # If bottom helps win, the terminal +1.0 reward propagates via GAE.

        return r_a, r_b

    # ============================================================
    # OBSERVATION VECTOR
    # ============================================================
    def get_obs(self) -> dict:
        """Return observation dict for both fighters.
        All values normalized to [-1, 1] or [0, 1] range."""
        return {
            'a': self._fighter_obs(self.a, self.b),
            'b': self._fighter_obs(self.b, self.a),
        }

    def _fighter_obs(self, me: Fighter, enemy: Fighter) -> list:
        """Fixed-size observation vector for one fighter. ~30 floats."""
        # Normalize positions to [0, 1] relative to arena
        mx = me.x / ARENA_W
        my = me.y / ARENA_H
        ex = enemy.x / ARENA_W
        ey = enemy.y / ARENA_H

        # Relative position (enemy - me), normalized
        rel_x = (enemy.x - me.x) / ARENA_W
        rel_y = (enemy.y - me.y) / ARENA_H

        # Distance normalized
        dx = enemy.x - me.x
        dy = enemy.y - me.y
        dist = math.sqrt(dx * dx + dy * dy)
        norm_dist = min(1.0, dist / (ARENA_W * 0.7))

        # Velocities normalized to speed
        my_vx = me.vx / PLAYER_BASE_SPEED if PLAYER_BASE_SPEED > 0 else 0
        my_vy = me.vy / PLAYER_BASE_SPEED if PLAYER_BASE_SPEED > 0 else 0
        en_vx = enemy.vx / PLAYER_BASE_SPEED if PLAYER_BASE_SPEED > 0 else 0
        en_vy = enemy.vy / PLAYER_BASE_SPEED if PLAYER_BASE_SPEED > 0 else 0

        # HP normalized
        my_hp = me.hp / HP_BASELINE
        en_hp = enemy.hp / HP_BASELINE

        # Gun state
        my_ammo = me.gun.ammo / me.gun.mag_size
        en_ammo = enemy.gun.ammo / enemy.gun.mag_size  # opponent ammo observable
        my_reloading = 1.0 if me.gun.reloading else 0.0
        en_reloading = 1.0 if enemy.gun.reloading else 0.0
        my_can_shoot = 1.0 if (not me.gun.reloading and me.gun.ammo > 0 and me.gun.shoot_cd <= 0) else 0.0
        my_freeze = me.freeze_timer / CTX_FREEZE_DURATION if CTX_FREEZE_DURATION > 0 else 0.0

        # Wall distances normalized
        wall_left = me.x / ARENA_W
        wall_right = (ARENA_W - me.x) / ARENA_W
        wall_top = me.y / ARENA_H
        wall_bottom = (ARENA_H - me.y) / ARENA_H

        # Bottom advantage: positive = I'm below enemy = I have bottom
        bottom_adv = (me.y - enemy.y) / ARENA_H

        # Bullet threats: summarize nearest 5 enemy bullets
        bullet_obs = self._bullet_obs(me, enemy.team)

        # Match progress
        match_progress = self.frame / MAX_MATCH_FRAMES

        obs = [
            mx, my,                      # 0-1: my position
            ex, ey,                      # 2-3: enemy position
            rel_x, rel_y,               # 4-5: relative position
            norm_dist,                   # 6: distance
            my_vx, my_vy,               # 7-8: my velocity
            en_vx, en_vy,               # 9-10: enemy velocity
            my_hp, en_hp,               # 11-12: HP
            my_ammo, en_ammo,           # 13-14: ammo
            my_reloading, en_reloading, # 15-16: reload state
            my_can_shoot,               # 17: can shoot now
            my_freeze,                  # 18: freeze remaining
            wall_left, wall_right,      # 19-20: wall distances
            wall_top, wall_bottom,      # 21-22: wall distances
            bottom_adv,                 # 23: bottom advantage
            match_progress,             # 24: match timer
        ]
        obs.extend(bullet_obs)          # 25-34: 5 bullets × 2 (rel_x, rel_y)
        return obs

    def _bullet_obs(self, me: Fighter, enemy_team: str) -> list:
        """Summarize nearest 5 enemy bullets as (rel_x, rel_y) pairs.
        Padded with zeros if fewer than 5 bullets."""
        threats = []
        hit_y = me.y + PLAYER_HITBOX_Y
        for b in self.bullets:
            if b.team != enemy_team:
                continue
            dx = b.x - me.x
            dy = b.y - hit_y
            dist_sq = dx * dx + dy * dy
            threats.append((dist_sq, dx / ARENA_W, dy / ARENA_H,
                            b.vx / BULLET_SPEED, b.vy / BULLET_SPEED))

        # Sort by distance, take nearest 5
        threats.sort(key=lambda t: t[0])
        result = []
        for i in range(5):
            if i < len(threats):
                _, rx, ry, vx, vy = threats[i]
                result.extend([rx, ry, vx, vy])
            else:
                result.extend([0.0, 0.0, 0.0, 0.0])
        return result  # 20 floats (5 bullets × 4)

    # ============================================================
    # VALIDATION HELPERS
    # ============================================================
    def get_state_snapshot(self) -> dict:
        """Full state for JS-vs-Python validation."""
        return {
            'frame': self.frame,
            'a': {'x': self.a.x, 'y': self.a.y, 'hp': self.a.hp,
                  'ammo': self.a.gun.ammo, 'reloading': self.a.gun.reloading,
                  'shoot_cd': self.a.gun.shoot_cd, 'freeze_timer': self.a.freeze_timer},
            'b': {'x': self.b.x, 'y': self.b.y, 'hp': self.b.hp,
                  'ammo': self.b.gun.ammo, 'reloading': self.b.gun.reloading,
                  'shoot_cd': self.b.gun.shoot_cd, 'freeze_timer': self.b.freeze_timer},
            'bullets': [{'x': b.x, 'y': b.y, 'vx': b.vx, 'vy': b.vy, 'team': b.team}
                        for b in self.bullets],
        }


# ============================================================
# QUICK SMOKE TEST
# ============================================================
if __name__ == '__main__':
    sim = SparSim()
    sim.reset()

    print(f"Arena: {ARENA_W}x{ARENA_H} px ({ARENA_W_TILES}x{ARENA_H_TILES} tiles)")
    print(f"Spawn A: ({sim.a.x}, {sim.a.y})")
    print(f"Spawn B: ({sim.b.x}, {sim.b.y})")
    print(f"Obs size: {len(sim.get_obs()['a'])} floats")

    # Run 100 frames: A pushes + shoots, B strafes + shoots
    for i in range(600):
        action_a = 9 if i % 3 == 0 else 1   # shoot every 3rd frame, push otherwise
        action_b = 9 if i % 4 == 0 else 3   # shoot every 4th, strafe left
        obs, ra, rb, done = sim.step(action_a, action_b)
        if done:
            print(f"\nMatch ended at frame {sim.frame}: winner={sim.winner}")
            print(f"  A: hp={sim.a.hp}, shots={sim.stats['a_shots_fired']}, hits={sim.stats['a_shots_hit']}")
            print(f"  B: hp={sim.b.hp}, shots={sim.stats['b_shots_fired']}, hits={sim.stats['b_shots_hit']}")
            break

    if not sim.done:
        snap = sim.get_state_snapshot()
        print(f"\nFrame {snap['frame']}:")
        print(f"  A: pos=({snap['a']['x']:.1f}, {snap['a']['y']:.1f}), hp={snap['a']['hp']}")
        print(f"  B: pos=({snap['b']['x']:.1f}, {snap['b']['y']:.1f}), hp={snap['b']['hp']}")
        print(f"  Bullets in flight: {len(snap['bullets'])}")
        print(f"  Stats: {sim.stats}")
