# READ THIS TOMORROW — Session Changes Review (2026-03-16)

All changes from this session's rebalancing. Review before making further adjustments.

---

## 1. Bot Fixes (Phase 1) — Updates #176-183

Entity-agnostic overhaul so bots work identically to player in combat.

- **Bot melee specials**: Bots now use ALL melee specials (cleave 360, storm chain lightning, ninja splash, lifesteal, crits, shadow step)
- **Shared functions extracted**: `_meleeHitMobs()`, `_tickDashMovement()`, `usePotionEntity()` — single codepath for player + bots
- **Bot ultimates**: Bot kills charge shrine/godspeed. Bots auto-activate when charges full. `_activator` tracks who triggered.
- **Per-entity state**: `entity._shadowStep`, `entity._phaseTimer`, `member.grab` — no more globals
- **Spawn overlap fixed**: Bot slots use `slotIndex * 50` offset
- **Floor transition resets**: Bot melee cooldowns, dash state, gun ammo, grab state all reset on floor advance

---

## 2. CT-X Weapon Config Changes

### RoF Curve (shifted — old 70 = new 50)
- Formula below 50: `frames = 10.275 - v * 0.1125`
- Formula above 50: `frames = Math.max(3.525, 4.650 - (v - 50) * 0.0375)`
- Default (slider 50): **4.650 frames** (~0.31s between shots)
- Clamped floor: 3.525 frames (same as old slider 100)

### Freeze Curve (shifted — old 40 = new 50)
- Formula: `penalty = 0.99 - v * 0.009`
- Default (slider 50): **0.54 penalty** (54% slowdown)
- Slider 0: 0.99 (99%), Slider 100: 0.09 (9%)
- Freeze never reaches 0% — 9% minimum at slider 100
- Duration always flat 15 frames

### CT_X_GUN Defaults
- `fireRate: 4.650` (was 5.4)
- `freezePenalty: 0.54` (was 0.45)

---

## 3. Movement Speed Changes

### Progression: Original → ×0.8 → ×0.875 = Current
Total multiplier from original: **0.7×**

| Value | Original | Current |
|-------|----------|---------|
| PLAYER_BASE_SPEED | 8.33 (500 px/s) | **5.83 (350 px/s)** |
| Spar BOT_SPEED | 8.33 | **GAME_CONFIG.PLAYER_BASE_SPEED** (auto) |
| Hide&Seek BOT_SPEED | 6.25 | **4.38** |

### Dash & Knockback
| Value | Original | Current |
|-------|----------|---------|
| dashSpeed | 26 | **18.2** |
| melee knockback | 6 | **4.2** |

All 3 locations synced: gameState.js, partySystem.js, botAI.js

### Boot Speed Bonuses
| Boot | Original | Current |
|------|----------|---------|
| Leather | 0.7 | **0.49** |
| Swift | 1.9 | **1.33** |
| Shadow | 2.3 | **1.61** |
| Phantom | 2.6 | **1.82** |

### Mob Speeds
- **ALL 262 non-zero mob speeds** scaled by total 0.7× from original
- Zero speeds (trench_tentacle, human_statue, dustcore_totem) unchanged

### NPC Speeds (cooking scenes)
| NPC System | baseSpeed | speedVariance | Waiter/Waitress |
|------------|-----------|---------------|-----------------|
| Fine Dining | 0.7 | 0.1 | 0.98 |
| Deli | 0.77 | 0.14 | — |
| Diner | 0.77 | 0.14 | 1.54 |

### Special Ability Knockback (applyKnockback)
- **28+ hardcoded knockback magnitudes** across combatSystem.js, earth205Specials.js, earth216Specials.js, earth216Specials2.js, wagashiSpecials.js all scaled proportionally
- **14 summoned mob movement speeds** in specials files also scaled

---

## 4. Bullet Speed Changes

### Base Bullet Speed
- BULLET_SPEED: **10 → 9** (×0.9)

### Mob Projectile Speeds (in mobTypes.js)
- All `arrowSpeed: 10` → **9**
- All `bulletSpeed: 10` → **9**
- All `boulderSpeed: 10` → **9**
- `arrowSpeed: 8.9` → **8**
- `arrowSpeed: 6.7` → **6**

### Specials File Projectile Speeds
- **55+ projectile speeds** across earth205Specials, vortalisSpecials, wagashiSpecials 1-3, earth216Specials 1-3, combatSystem, mobSystem all scaled ×0.9

---

## 5. Hitbox & Collision Changes — Graal-Style Elliptical

### Elliptical Hitbox Overhaul
Replaced circular hitboxes with Graal Online Era-style elliptical hitboxes. Wider horizontally, narrow vertically — vertical positioning matters for dodging (peeking from below doesn't get you hit).

| Value | Original | Current |
|-------|----------|---------|
| ENTITY_R (circular) | 25 | **REMOVED** — replaced by RX/RY |
| ENTITY_RX | — | **38** (horizontal half-width) |
| ENTITY_RY | — | **13** (vertical half-height) |
| BULLET_R | 5 | **7** (~30% bigger to match larger bullet visuals) |
| Hit zone horizontal (BULLET_R + ENTITY_RX) | 30 | **45** |
| Hit zone vertical (BULLET_R + ENTITY_RY) | 30 | **20** |
| PLAYER_RADIUS | 27 | **23** |
| MOB_RADIUS | 27 | **23** |
| PLAYER_WALL_HW | 16 | **14** |
| MOB_WALL_HW | 14 | **11** |
| POS_HW | 12 | **10** |
| MOB_CROWD_RADIUS | 55 | **46** |
| ORE_COLLISION_RADIUS | 20 | **17** |
| MINING_PLAYER_R | 12 | **10** |
| DEFAULT_HITBOX_RX | — | **45** (visual matches collision) |
| DEFAULT_HITBOX_RY | — | **20** (visual matches collision) |

### Hitbox Positioning
- **Players/bots**: hitbox centered at `entity.y + 5` (below feet, Graal-style biased down)
- **Mobs**: hitbox at `entity.y - 20` (body center) — to be moved to feet level later

### Collision Math
Ellipse-vs-point: `dx²·ry² + dy²·rx² < rx²·ry²` (Minkowski sum of bullet circle + entity ellipse)

### Body Blocking — Hard Stop (No Push)
- **Mob-player**: 50/50 equal separation, no momentum transfer (was 70/30 push)
- **Spar entities**: Hard stop between all spar participants
- Uses `positionClear()` to prevent pushing into walls

### Bullet Visuals — Wide/Flat Elliptical
All 7 projectile types changed to wide/flat Graal-style elliptical visuals:
- Default bullet: 30×8 body, 22×4 core, 18×10 glow (was 24×6, 18×3, 14×8)
- Neon bolt, tracer, golden, saw blade, poison arrow, boulder — all elliptical

### Per-Mob Ellipse Support
Mobs can override hitbox with `hitboxRX`/`hitboxRY` or legacy `hitboxR` (auto-scales Y proportionally)

### Mob Contact Ranges
- **265 contactRange values** scaled (74→56, 76→57, 78→58, 80→60, 82→62)
- `_contactDamageAura` range: 60 → **45**

### NOT Scaled (gameplay ranges, not hitboxes)
- kiteRange, arrowRange, boulderRange, healRadius, explodeRange, melee range — all unchanged

---

## 6. Spar Bot Learning

- `sparData.js` BOT_SPEED now references `GAME_CONFIG.PLAYER_BASE_SPEED` (auto-scales with player speed)
- Learning profile checkpointed at **140 matches** (version 3)
- Physics change noted at ~match 119: speed 8.33→6.66, bullet 10→9, hitbox 17→19
- Bot uses `mirrorPlayer` and `midFlank` routes primarily
- Win rate: 22.1% (bot wins)

---

## 7. CT-X Reload Speed Halved — Update #263

Reload was way too slow. Formula changed:
- **Old**: `40 + firerate * 0.5` → 40-90 frames (0.67s-1.50s)
- **New**: `20 + firerate * 0.25` → 20-45 frames (0.33s-0.75s)

| ROF Slider | Old (frames/sec) | New (frames/sec) |
|-----------|------------------|------------------|
| 0 | 40 / 0.67s | 20 / 0.33s |
| 50 | 65 / 1.08s | 33 / 0.55s |
| 100 | 90 / 1.50s | 45 / 0.75s |

---

## Current GAME_CONFIG (Update #263)

```
PLAYER_BASE_SPEED: 5.83    // 350 px/sec
PLAYER_WALL_HW: 14
PLAYER_RADIUS: 23
MOB_WALL_HW: 11
MOB_RADIUS: 23
POS_HW: 10
MOB_CROWD_RADIUS: 46
BULLET_SPEED: 9
BULLET_R: 7
ENTITY_RX: 38
ENTITY_RY: 13
ORE_COLLISION_RADIUS: 17
MINING_PLAYER_R: 10
KNOCKBACK_DECAY: 0.8
KNOCKBACK_THRESHOLD: 0.5
DEFAULT_HITBOX_RX: 45
DEFAULT_HITBOX_RY: 20
```

---

## Key Files Modified

- `js/shared/gameConfig.js` — all physics constants (elliptical RX/RY, BULLET_R=7, hitbox indicator)
- `js/shared/mobTypes.js` — 262 mob speeds, 265 contactRanges, projectile speeds
- `js/shared/sparData.js` — bot speed reference, learning checkpoint
- `js/shared/hideSeekData.js` — bot speed
- `js/authority/gameState.js` — dash, knockback
- `js/authority/partySystem.js` — bot dash, knockback
- `js/authority/botAI.js` — bot dash, knockback, melee specials
- `js/authority/combatSystem.js` — knockback values
- `js/authority/earth205Specials.js` — knockback + projectile speeds
- `js/authority/earth216Specials.js` — knockback + projectile speeds
- `js/authority/earth216Specials2.js` — knockback + projectile speeds
- `js/authority/earth216Specials3.js` — projectile speeds
- `js/authority/vortalisSpecials.js` — projectile + summoned mob speeds
- `js/authority/wagashiSpecials.js` — knockback + projectile speeds
- `js/authority/wagashiSpecials2.js` — projectile speeds
- `js/authority/wagashiSpecials3.js` — projectile speeds
- `js/authority/mobSystem.js` — orb speed, body blocking (50/50 hard stop)
- `js/authority/sparSystem.js` — spar body blocking, bot gun side + muzzle parity
- `js/authority/waveSystem.js` — ENTITY_RX reference update
- `js/authority/fineDiningNPCSystem.js` — NPC speeds
- `js/authority/deliNPCSystem.js` — NPC speeds
- `js/authority/dinerNPCSystem.js` — NPC speeds
- `js/core/gunSystem.js` — CT-X freeze + RoF curves, reload speed halved
- `js/core/interactable.js` — CT_X_GUN defaults, boot bonuses
- `js/core/meleeSystem.js` — elliptical collision, feet-level hitbox, elliptical bullet visuals
- `js/client/rendering/characterSprite.js` — elliptical hitbox indicator, bot gun side rendering
- `js/core/draw.js` — bot entity reference for gun side rendering
