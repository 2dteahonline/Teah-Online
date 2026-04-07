# Mob Abilities — Azurine City (Floor 1)

## Source of truth

- `js/authority/combatSystem.js` — `MOB_SPECIALS` registry; Azurine section header at line 1117. All Floor 1 special ability implementations live here (lines 1119–1897).

## Purpose

Defines the per-mob special abilities used by Floor 1 (Azurine City) enemies. Each entry in `MOB_SPECIALS` is a function `(m, ctx) => {...}` invoked by the authority tick when a mob has the matching `_specials` key. Abilities handle their own telegraph, cooldown, activation gating, resolve, damage, and any status or hazard zone side effects.

## Values

All values are expressed in game units (frames @ 60fps, pixels, radians) as they appear in source. Damage formulas use `m.damage * getMobDamageMultiplier()` unless noted.

### Neon Pickpocket — `swipe_blink`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 420 | frames | js/authority/combatSystem.js:1125 |
| Dash duration | 24 | frames | js/authority/combatSystem.js:1163 |
| Heal on arrival | 10% of maxHp | hp | js/authority/combatSystem.js:1135 |
| Dash distance | 288 | px (6 tiles) | js/authority/combatSystem.js:1178 |
| Line telegraph width | 32 | px | js/authority/combatSystem.js:1186 |
| Telegraph delay | 24 | frames | js/authority/combatSystem.js:1187 |
| Telegraph color | [0,200,255] | rgb | js/authority/combatSystem.js:1188 |
| Telegraph hold (mirrors delay) | 24 | frames | js/authority/combatSystem.js:1192 |
| Damage if player in line | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1141 |

### Cyber Mugger — `stun_baton`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 480 | frames | js/authority/combatSystem.js:1201 |
| Cone half-angle | PI/4 (45°) | rad | js/authority/combatSystem.js:1210 |
| Cone full angle telegraph | 90 | deg | js/authority/combatSystem.js:1239 |
| Cone range | 96 | px | js/authority/combatSystem.js:1211 |
| Stun duration | 72 | frames | js/authority/combatSystem.js:1215 |
| Activation max distance | <120 | px | js/authority/combatSystem.js:1230 |
| Retry cooldown if out of range | 30 | frames | js/authority/combatSystem.js:1231 |
| Telegraph delay | 18 | frames | js/authority/combatSystem.js:1240 |
| Telegraph color | [255,200,50] | rgb | js/authority/combatSystem.js:1241 |
| Damage | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1212 |

### Drone Lookout — `spot_mark`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 600 | frames | js/authority/combatSystem.js:1254 |
| Hit check radius (resolve) | 48 | px | js/authority/combatSystem.js:1263 |
| Telegraph circle radius | 72 | px | js/authority/combatSystem.js:1291 |
| Mark duration | 240 | frames | js/authority/combatSystem.js:1264 |
| Mark bonus | 0.15 | multiplier | js/authority/combatSystem.js:1264 |
| Activation max distance | <400 | px | js/authority/combatSystem.js:1279 |
| Retry cooldown | 30 | frames | js/authority/combatSystem.js:1280 |
| Telegraph delay | 36 | frames | js/authority/combatSystem.js:1292 |
| Telegraph color | [255,100,100] | rgb | js/authority/combatSystem.js:1293 |

### Street Chemist — `gas_canister`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 540 | frames | js/authority/combatSystem.js:1306 |
| Gravity per frame | 0.15 | px/frame² | js/authority/combatSystem.js:1313 |
| Zone radius | 144 | px | js/authority/combatSystem.js:1321 |
| Zone duration | 300 | frames | js/authority/combatSystem.js:1322 |
| Tick rate | 60 | frames | js/authority/combatSystem.js:1323 |
| Tick damage | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1324 |
| Tick effect | `poison_tick` | — | js/authority/combatSystem.js:1325 |
| Zone color | [100,200,50] | rgb | js/authority/combatSystem.js:1326 |
| Zone slow | 0.3 | multiplier | js/authority/combatSystem.js:1327 |
| Activation max distance | <350 | px | js/authority/combatSystem.js:1343 |
| Travel frames | 40 | frames | js/authority/combatSystem.js:1351 |
| Initial vy bias (arc upward) | -2 | px/frame | js/authority/combatSystem.js:1353 |

### Renegade Bruiser — `ground_pound`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 540 | frames | js/authority/combatSystem.js:1371 |
| Pound hit radius | 96 | px | js/authority/combatSystem.js:1380 |
| Knockback magnitude | 8.4 | px/frame | js/authority/combatSystem.js:1387 |
| Slow amount | 0.4 | multiplier | js/authority/combatSystem.js:1389 |
| Slow duration | 150 | frames | js/authority/combatSystem.js:1389 |
| Activation max distance | <150 | px | js/authority/combatSystem.js:1404 |
| Telegraph offset toward player (max) | 72 | px | js/authority/combatSystem.js:1411 |
| Telegraph circle radius | 96 | px | js/authority/combatSystem.js:1418 |
| Telegraph delay | 30 | frames | js/authority/combatSystem.js:1419 |
| Telegraph color | [200,100,50] | rgb | js/authority/combatSystem.js:1420 |
| Damage | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1381 |

### Renegade Shadowknife — `cloak_backstab`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 600 | frames | js/authority/combatSystem.js:1433 |
| Teleport distance behind player | 40 | px | js/authority/combatSystem.js:1440 |
| Backstab damage multiplier | 1.5 | × | js/authority/combatSystem.js:1446 |
| Activation max distance | <250 | px | js/authority/combatSystem.js:1462 |
| Cloak timer | 105 | frames (~3.5s) | js/authority/combatSystem.js:1468 |

### Renegade Demo — `sticky_bomb`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown fallback | 720 | frames | js/authority/combatSystem.js:1478 |
| Bomb damage multiplier | 1.5 | × | js/authority/combatSystem.js:1489 |
| Activation max distance | <300 | px | js/authority/combatSystem.js:1505 |
| Max simultaneous bombs | 2 | count | js/authority/combatSystem.js:1505 |
| Bomb fuse | 120 | frames | js/authority/combatSystem.js:1512 |
| Explosion radius | 96 | px | js/authority/combatSystem.js:1513 |
| Retry cooldown | 30 | frames | js/authority/combatSystem.js:1506 |

### Renegade Sniper — `ricochet_round`

| Name | Value | Citation |
|------|-------|----------|
| Handler | `null` (aliased to archer logic — see note) | js/authority/combatSystem.js:1522 |

Note: `ricochet_round` is declared as `null` in the object literal and is set after object creation as a self-reference to the archer special. Sniper's `arrowBounces: 1` lives in `MOB_TYPES` (not in this cluster).

### The Don — `laser_snipe`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Line width (hit + telegraph) | 24 | px | js/authority/combatSystem.js:1535, 1560 |
| Damage multiplier | 3 | × | js/authority/combatSystem.js:1536 |
| Minimum activation distance | >150 | px | js/authority/combatSystem.js:1547 |
| Laser range | 480 | px (10 tiles) | js/authority/combatSystem.js:1551 |
| Telegraph delay | 48 | frames | js/authority/combatSystem.js:1561 |
| Telegraph hold (mirrors delay) | 48 | frames | js/authority/combatSystem.js:1566 |
| Telegraph color | [255,50,50] | rgb | js/authority/combatSystem.js:1562 |

### The Don — `tommy_burst`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Shots per burst | 5 | count | js/authority/combatSystem.js:1578 |
| Fire every N frames | 2 | frames | js/authority/combatSystem.js:1578 |
| Burst total length | 10 | frames | js/authority/combatSystem.js:1595 |
| Total spread angle | PI/6 (30°) | rad | js/authority/combatSystem.js:1580 |
| Bullet speed fallback | `GAME_CONFIG.BULLET_SPEED` | px/frame | js/authority/combatSystem.js:1582 |
| Activation max distance | <350 | px | js/authority/combatSystem.js:1602 |
| Per-bullet damage | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1589 |

### The Don — `smart_mine`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Mines dropped per activation | 2 | count | js/authority/combatSystem.js:1645 |
| Drop angle offset | random 0–2π | rad | js/authority/combatSystem.js:1646 |
| Drop distance from mob | 40 + rand*60 | px | js/authority/combatSystem.js:1647 |
| Mine trigger radius | 60 | px | js/authority/combatSystem.js:1651 |
| Arm delay | 60 | frames | js/authority/combatSystem.js:1653 |
| Root duration on trigger | 42 | frames | js/authority/combatSystem.js:1634 |
| Damage on trigger | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1635 |

### The Don — `smoke_screen`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Zone radius | 192 | px | js/authority/combatSystem.js:1667 |
| Zone duration | 240 | frames | js/authority/combatSystem.js:1668 |
| Tick rate | 999 (no ticks) | frames | js/authority/combatSystem.js:1669 |
| Tick damage | 0 | hp | js/authority/combatSystem.js:1670 |
| Zone color | [80,80,80] | rgb | js/authority/combatSystem.js:1671 |
| Zone slow | 0 | multiplier | js/authority/combatSystem.js:1672 |

### Velocity (boss) — `phase_dash`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Dash total frames | 16 | frames | js/authority/combatSystem.js:1688, 1731 |
| Afterimage every N frames | 3 | frames | js/authority/combatSystem.js:1693 |
| Line hit width | 32 | px | js/authority/combatSystem.js:1699 |
| Dash distance | 384 | px (8 tiles) | js/authority/combatSystem.js:1712 |
| Wall inset on clamp | 1 tile (TILE) | px | js/authority/combatSystem.js:1716 |
| Binary search iterations | 8 | count | js/authority/combatSystem.js:1722 |
| Telegraph width | 32 | px | js/authority/combatSystem.js:1740 |
| Telegraph delay | 8 | frames | js/authority/combatSystem.js:1741 |
| Telegraph color | [100,100,255] | rgb | js/authority/combatSystem.js:1742 |
| Damage | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1700 |

### Velocity (boss) — `bullet_time_field`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Zone radius | 192 | px | js/authority/combatSystem.js:1758 |
| Zone duration | 240 | frames | js/authority/combatSystem.js:1759 |
| Tick rate | 999 (no ticks) | frames | js/authority/combatSystem.js:1760 |
| Tick damage | 0 | hp | js/authority/combatSystem.js:1761 |
| Zone color | [100,100,200] | rgb | js/authority/combatSystem.js:1762 |
| Zone slow | 0.35 | multiplier | js/authority/combatSystem.js:1763 |

### Velocity (boss) — `afterimage_barrage`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Line count | 3 | count | js/authority/combatSystem.js:1789 |
| Angular spacing | 2π/3 (120°) | rad | js/authority/combatSystem.js:1790 |
| Start distance from player | 300 | px | js/authority/combatSystem.js:1786 |
| Line width | 28 | px | js/authority/combatSystem.js:1800, 1804 |
| Telegraph delay | 36 | frames | js/authority/combatSystem.js:1801 |
| Telegraph color | [150,100,255] | rgb | js/authority/combatSystem.js:1811 |
| Resolving lockout | 42 | frames | js/authority/combatSystem.js:1819 |
| Damage per line | `round(m.damage * mobDmgMult)` | hp | js/authority/combatSystem.js:1805 |

### Velocity (boss) — `summon_renegades`

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Max active summons | 2 | count | js/authority/combatSystem.js:1834 |
| Candidate types | `[renegade_bruiser, renegade_shadowknife, renegade_demo, renegade_sniper]` | — | js/authority/combatSystem.js:1836 |
| Spawns per activation | 1 | count | js/authority/combatSystem.js:1839 |
| Placement attempts | 20 | count | js/authority/combatSystem.js:1847 |
| Spawn distance from boss | 80 + rand*60 | px | js/authority/combatSystem.js:1849 |
| Minimum separation | 40 | px | js/authority/combatSystem.js:1854 |
| Fallback angle step | (i+1) * 0.7π | rad | js/authority/combatSystem.js:1863 |
| Fallback distance | 60 | px | js/authority/combatSystem.js:1864 |
| Summoned scale | 0.85 | multiplier | js/authority/combatSystem.js:1890 |
| Internal summon cooldown | 900 | frames (15s) | js/authority/combatSystem.js:1895 |
| HP mult source | `getWaveHPMultiplier(wave)` | — | js/authority/combatSystem.js:1837 |
| Speed mult source | `getWaveSpeedMultiplier(wave)` | — | js/authority/combatSystem.js:1838 |

## Behavior

### `swipe_blink` (Neon Pickpocket)
1. Initialize `_specialTimer` to `_specialCD || 420` on first call (js/authority/combatSystem.js:1125).
2. If `_blinkDashing`: lerp `m.x/m.y` from `_blinkStart` to `_blinkTarget` over 24 frames (js/authority/combatSystem.js:1150). On arrival snap to target, heal 10% maxHp, and if `AttackShapes.playerInLine(start,target,32)` deal `round(m.damage*mobDmgMult)` (js/authority/combatSystem.js:1132–1147). Reset cooldown.
3. If `_blinkTelegraph > 0`: decrement; when 0, begin dash (`_blinkDashing=true`, `_blinkDashTimer=24`) (js/authority/combatSystem.js:1158–1166).
4. Otherwise tick `_specialTimer`; when 0, compute direction to player, target = clampDashTarget at 288px, publish `line` telegraph width 32 delay 24 color [0,200,255], set `_blinkTelegraph=24` (js/authority/combatSystem.js:1177–1192).

### `stun_baton` (Cyber Mugger)
1. Telegraph phase: decrement `_stunTelegraph`; when 0, if player in cone (half-angle PI/4, range 96) deal `round(m.damage*mobDmgMult)` and apply `stun` duration 72 (js/authority/combatSystem.js:1204–1219).
2. Else tick `_specialTimer`.
3. Activation: requires `dist < 120` (retry in 30 frames if not). Publish `cone` telegraph angle 90°, range 96, delay 18, color [255,200,50] (js/authority/combatSystem.js:1230–1245).

### `spot_mark` (Drone Lookout)
1. Telegraph phase: decrement; on expiry, if `|player - markPos|² ≤ 48²` apply `mark` duration 240 bonus 0.15 (js/authority/combatSystem.js:1257–1266).
2. Activation: requires `dist < 400` (retry 30). Store mark position at current player, publish `circle` radius 72 delay 36 color [255,100,100] (js/authority/combatSystem.js:1279–1297).

### `gas_canister` (Street Chemist)
1. If `_gasProjectile` exists, integrate position with `vy += 0.15` gravity, decrement timer. On landing create HazardSystem zone radius 144 duration 300 tickRate 60 tickDamage `round(m.damage*mobDmgMult)` effect `poison_tick` slow 0.3 (js/authority/combatSystem.js:1309–1333).
2. Activation: requires `dist < 350`. Compute `vx=(targetX-m.x)/40`, `vy=(targetY-m.y)/40 - 2` (arc). Store projectile with 40 travel frames (js/authority/combatSystem.js:1343–1360).

### `ground_pound` (Renegade Bruiser)
1. Telegraph phase: on expiry, check `AttackShapes.hitsPlayer(poundCX, poundCY, 96)`; if hit deal damage, apply knockback 8.4 px/frame away from pound center, apply `slow` 0.4 for 150 frames (js/authority/combatSystem.js:1374–1391).
2. Activation: requires `dist < 150`. Telegraph center is offset toward player by `min(dist,72)` px. Publish circle radius 96 delay 30 color [200,100,50] (js/authority/combatSystem.js:1404–1424).

### `cloak_backstab` (Renegade Shadowknife)
1. If `_cloaked`: decrement `_cloakTimer`. When 0, teleport to `player + dir*40` (behind player), deal `round(m.damage*1.5*mobDmgMult)`, emit `backstab` effect (js/authority/combatSystem.js:1436–1451).
2. Activation: requires `dist < 250`. Set `_cloaked=true`, `_cloakTimer=105` (js/authority/combatSystem.js:1462–1469).

### `sticky_bomb` (Renegade Demo)
1. Each tick iterate `_bombs`: decrement `timer`; on 0, if `AttackShapes.hitsPlayer(bx,by,96)` deal `round(m.damage*1.5*mobDmgMult)` and emit explosion (js/authority/combatSystem.js:1482–1496).
2. Activation: requires `dist < 300` and fewer than 2 active bombs. Push bomb at player position with fuse 120 and radius 96. Reset cooldown to 720 (js/authority/combatSystem.js:1505–1516).

### `ricochet_round` (Renegade Sniper)
- Declared `null` here; aliased post-object-creation to use the `archer` handler. Arrow bounce count comes from `MOB_TYPES.renegade_sniper` (outside this cluster) (js/authority/combatSystem.js:1522).

### `laser_snipe` (The Don)
1. Telegraph phase: on expiry, if `playerInLine(start,end,24)` deal `round(m.damage*3*mobDmgMult)` (js/authority/combatSystem.js:1530–1541).
2. Activation: requires `dist > 150`. Compute end point at 480px along facing. Publish `line` width 24 delay 48 color [255,50,50] (js/authority/combatSystem.js:1547–1566).

### `tommy_burst` (The Don)
1. Firing phase: every 2 frames, until 5 shots fired, spawn a bullet at angle = `baseDir - π/12 + (shot/4)*π/6` with speed from `MOB_TYPES[type].bulletSpeed || GAME_CONFIG.BULLET_SPEED` (js/authority/combatSystem.js:1577–1594). End firing after 10 frames.
2. Activation: requires `dist < 350`. Store `_tommyDir` toward player (js/authority/combatSystem.js:1602–1608).

### `smart_mine` (The Don)
1. For single-special mobs (`!m._specials || _specials.length<=1`) tick each mine: if unarmed, decrement `armTimer` (60 frames); else if `|player - mine|² ≤ radius²` apply `root` 42 frames, deal `round(m.damage*mobDmgMult)`, explode, remove mine (js/authority/combatSystem.js:1624–1641). For boss rotation, ticking is handled in the dispatch loop.
2. Every activation drop 2 new mines at `angle=rand(2π)`, `dist=40+rand*60`, radius 60, `armTimer=60` (js/authority/combatSystem.js:1645–1654).

### `smoke_screen` (The Don)
1. Each activation creates a HazardSystem zone at mob position: radius 192, duration 240, `tickRate 999`, `tickDamage 0`, slow 0, color [80,80,80] (js/authority/combatSystem.js:1662–1674). Emit `smoke` effect.

### `phase_dash` (Velocity)
1. Dash phase: lerp position over 16 frames, emit `afterimage` every 3 frames. On end, check `playerInLine(start,target,32)` for damage (js/authority/combatSystem.js:1685–1706).
2. Start: compute target at `384px` along facing. Clamp to map bounds (1-tile inset). If target not `positionClear`, binary search 8 iterations between 0 and 384 to find farthest clear point (js/authority/combatSystem.js:1711–1729).
3. Publish `line` telegraph width 32 delay 8 color [100,100,255]. Set dashing state (js/authority/combatSystem.js:1730–1746).

### `bullet_time_field` (Velocity)
1. Create HazardSystem zone centered on player: radius 192, duration 240, no ticks, slow 0.35, color [100,100,200] (js/authority/combatSystem.js:1755–1765).

### `afterimage_barrage` (Velocity)
1. If `_barrageResolving`, tick timer and return (js/authority/combatSystem.js:1776–1782).
2. Else choose random `baseAngle`; for `i in 0..3`: `angle = baseAngle + i*2π/3`, start point = `player + (cos angle, sin angle)*300`. Publish `line` telegraph (width 28, delay 36, color [150,100,255]) with `onResolve` closure that checks `playerInLine(start, target, 28)` and deals `round(m.damage*mobDmgMult)` (js/authority/combatSystem.js:1784–1814).
3. Set `_barrageResolving=true`, `_barrageTimer=42` (js/authority/combatSystem.js:1818–1819).

### `summon_renegades` (Velocity)
1. Internal cooldown `_summonCD`: if >0, decrement and return (js/authority/combatSystem.js:1829–1830).
2. Count active summons owned by boss (`_summonOwnerId === m.id && hp>0`). If ≥2 return (js/authority/combatSystem.js:1833–1834).
3. Spawn 1 randomly-selected renegade type. Try 20 placements with `angle=rand(2π)`, `dist=80+rand*60`, requiring `positionClear` and ≥40 px from other mobs. Fallback: `angle=(i+1)*0.7π`, `dist=60` (js/authority/combatSystem.js:1841–1866).
4. Push mob with HP/speed scaled by `getWaveHPMultiplier(wave)` / `getWaveSpeedMultiplier(wave)`, damage by `getMobDamageMultiplier()`, copy `arrow*` fields from `MOB_TYPES[typeKey]`, scale 0.85, `_summonOwnerId=m.id` (js/authority/combatSystem.js:1869–1891).
5. Set `_summonCD=900` (15s) (js/authority/combatSystem.js:1895).

## Dependencies

- Reads: `ctx.player` position (all abilities), `ctx.mobs` (`summon_renegades`), `ctx.wave` (`summon_renegades`), `MOB_TYPES[key]` (several for bullet speed / summon stats), `GAME_CONFIG.BULLET_SPEED` (`tommy_burst`), map dimensions `level.widthTiles/heightTiles` and `TILE` (`phase_dash`).
- Writes: `ctx.bullets` (`tommy_burst`, `archer` alias for `ricochet_round`), `ctx.hitEffects` (all), mob position (`swipe_blink`, `phase_dash`, `cloak_backstab`), mob HP (`swipe_blink` heal), new mobs pushed (`summon_renegades`).
- Calls: `AttackShapes.playerInLine`, `AttackShapes.playerInCone`, `AttackShapes.hitsPlayer`; `StatusFX.applyToPlayer('stun'|'mark'|'slow'|'root')`; `TelegraphSystem.create`; `HazardSystem.createZone`; `dealDamageToPlayer`; `applyKnockback`; `getMobDamageMultiplier`; `getWaveHPMultiplier`; `getWaveSpeedMultiplier`; `capMobSpeed`; `positionClear`; `clampDashTarget`.
- Global state mutated: `nextMobId`, `nextBulletId`.

## Edge cases

- `swipe_blink` heal still fires on arrival even if the dash target is clamped by `clampDashTarget` (js/authority/combatSystem.js:1179).
- `stun_baton` retries every 30 frames while out of range rather than holding full cooldown (js/authority/combatSystem.js:1231).
- `spot_mark` uses a tighter 48 px resolve check than its 72 px telegraph — player can dodge by moving to the ring's edge (js/authority/combatSystem.js:1263 vs 1291).
- `gas_canister` projectile uses simulated gravity 0.15 px/frame² and a fixed 40-frame travel; player movement during flight is ignored (js/authority/combatSystem.js:1313, 1351).
- `ground_pound` pound center is offset toward player by `min(dist, 72)` px, not centered on mob — damage region is in front of the mob (js/authority/combatSystem.js:1411).
- `cloak_backstab` "behind player" math uses `dir = atan2(player - mob)` and `player + dir*40`, which actually places the mob in front of the player (beyond them from mob's view), not behind player facing (js/authority/combatSystem.js:1441–1444).
- `sticky_bomb` bombs persist after cooldown reset; up to 2 can be active at once (js/authority/combatSystem.js:1505).
- `ricochet_round` handler is `null` in the literal and assigned post-construction; any reference before assignment would fail (js/authority/combatSystem.js:1522).
- `laser_snipe` has no `_specialTimer` gating in this handler — activation is governed externally (boss rotation); only `dist>150` guards self-activation (js/authority/combatSystem.js:1547).
- `tommy_burst` skips the `_specialTimer` pattern entirely; boss rotation governs reuse (js/authority/combatSystem.js:1572).
- `smart_mine` ticking logic only runs inside the handler for single-special mobs; in boss rotation the dispatch loop ticks mines separately (js/authority/combatSystem.js:1623–1624).
- `smoke_screen` uses `tickRate: 999` as a sentinel for "no damage ticks" (js/authority/combatSystem.js:1669).
- `phase_dash` uses binary search over 8 iterations to shorten the dash against walls — minimum resolved distance can be 0 if the mob is wall-adjacent (js/authority/combatSystem.js:1719–1729).
- `afterimage_barrage` captures `startX/startY/targetX/targetY/mob` in closures for each of the 3 lines so each line resolves independently when its telegraph expires (js/authority/combatSystem.js:1795–1813).
- `summon_renegades` sets `_summonCD=900` even if spawn attempt fails after fallback placement (js/authority/combatSystem.js:1895).
- `summon_renegades` copies `_specials` from `MOB_TYPES[typeKey]` but initializes `_specialTimer` to `mt.specialCD || 0`, meaning fresh summons can use their special immediately if `specialCD` is undefined (js/authority/combatSystem.js:1884).
