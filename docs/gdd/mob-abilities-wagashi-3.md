# Mob Abilities — Wagashi (Dungeon 5, Floor 5 + Lord Sarugami)

Part 3 of 3. See `mob-abilities-wagashi-1.md` and `mob-abilities-wagashi-2.md` for Floors 1-4.

## Source of truth

- `js/authority/wagashiSpecials3.js` — Floor 5 regular + Celestial Toad mini-boss + Lord Sarugami final boss (14 abilities)

## Purpose

Defines the Wagashi Floor 5 mob specials (toads/swamp theme), the Celestial Toad mini-boss kit, and the Lord Sarugami final boss kit including his HP-threshold-reactive `divine_form_shift` transformation system.

## Values

### mire_spit (miregulp_tadpole) (js/authority/wagashiSpecials3.js:8-39)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 180 | frames | js/authority/wagashiSpecials3.js:10 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials3.js:32 |
| Range gate | 300 | px | js/authority/wagashiSpecials3.js:30 |
| Bullet speed | GAME_CONFIG.BULLET_SPEED | px/frame | js/authority/wagashiSpecials3.js:17 |
| Bullet damage | 48 | hp | js/authority/wagashiSpecials3.js:18 |
| Slow duration | 60 | frames | js/authority/wagashiSpecials3.js:21 |
| Slow amount | 0.4 | × | js/authority/wagashiSpecials3.js:21 |
| Telegraph line width | 16 | px | js/authority/wagashiSpecials3.js:36 |

### dread_belch (gulchspine_bloater) (js/authority/wagashiSpecials3.js:42-66)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials3.js:44 |
| Telegraph | 40 | frames | js/authority/wagashiSpecials3.js:61 |
| Range gate | 160 | px | js/authority/wagashiSpecials3.js:59 |
| Cone half-angle | π/6 | rad (30°) | js/authority/wagashiSpecials3.js:49 |
| Cone range | 140 | px | js/authority/wagashiSpecials3.js:49 |
| Damage | 52 | hp | js/authority/wagashiSpecials3.js:50 |

### maw_hymn (hymn_eater_toadlet) (js/authority/wagashiSpecials3.js:69-94)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials3.js:71 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials3.js:88 |
| Range gate | 350 | px | js/authority/wagashiSpecials3.js:87 |
| Hit radius | 200 | px | js/authority/wagashiSpecials3.js:75 |
| Damage | 15 | hp | js/authority/wagashiSpecials3.js:76 |
| Slow duration | 90 | frames | js/authority/wagashiSpecials3.js:79 |
| Slow amount | 0.4 | × | js/authority/wagashiSpecials3.js:79 |

### dark_gulp (abyssal_swallower) (js/authority/wagashiSpecials3.js:97-132)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials3.js:99 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials3.js:127 |
| Range gate | 250 | px | js/authority/wagashiSpecials3.js:125 |
| Cone half-angle | π/9 | rad (20°) | js/authority/wagashiSpecials3.js:104 |
| Cone range | 200 | px | js/authority/wagashiSpecials3.js:104 |
| Damage | 50 | hp | js/authority/wagashiSpecials3.js:105 |
| Pull distance (max) | 80 | px | js/authority/wagashiSpecials3.js:110 |
| Pull safety gap | 20 | px | js/authority/wagashiSpecials3.js:110 |

### shard_toss (shrine_shard_monkey) (js/authority/wagashiSpecials3.js:135-163)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 150 | frames | js/authority/wagashiSpecials3.js:137 |
| Telegraph | 25 | frames | js/authority/wagashiSpecials3.js:156 |
| Range gate | 350 | px | js/authority/wagashiSpecials3.js:154 |
| Bullet speed | 10 | px/frame | js/authority/wagashiSpecials3.js:144 |
| Bullet damage | 42 | hp | js/authority/wagashiSpecials3.js:145 |
| Telegraph line width | 14 | px | js/authority/wagashiSpecials3.js:160 |

### minor_orb_pulse (seal_fragment_sprite) (js/authority/wagashiSpecials3.js:166-190)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 200 | frames | js/authority/wagashiSpecials3.js:168 |
| Telegraph | 40 | frames | js/authority/wagashiSpecials3.js:184 |
| Range gate | 200 | px | js/authority/wagashiSpecials3.js:183 |
| AoE radius | 120 | px | js/authority/wagashiSpecials3.js:172 |
| Damage | 38 | hp | js/authority/wagashiSpecials3.js:173 |

### thunder_tail_crash (thundertail_ape) (js/authority/wagashiSpecials3.js:193-231)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials3.js:195 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials3.js:223 |
| Range gate | 250 | px | js/authority/wagashiSpecials3.js:221 |
| Line points | 4 | — | js/authority/wagashiSpecials3.js:202 |
| Point spacing | 60 | px | js/authority/wagashiSpecials3.js:203 |
| Point hit radius | 36 | px | js/authority/wagashiSpecials3.js:206 |
| Damage | 50 | hp | js/authority/wagashiSpecials3.js:212 |
| Telegraph line length | 240 | px | js/authority/wagashiSpecials3.js:225 |
| Telegraph line width | 30 | px | js/authority/wagashiSpecials3.js:227 |

### seal_rupture (heavens_gate_breaker) (js/authority/wagashiSpecials3.js:234-259)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials3.js:236 |
| Telegraph | 55 | frames | js/authority/wagashiSpecials3.js:253 |
| Range gate | 220 | px | js/authority/wagashiSpecials3.js:252 |
| AoE radius | 150 | px | js/authority/wagashiSpecials3.js:240 |
| Damage | 55 | hp | js/authority/wagashiSpecials3.js:241 |
| Stun duration | 25 | frames | js/authority/wagashiSpecials3.js:244 |

### devouring_pull (celestial_toad) (js/authority/wagashiSpecials3.js:264-309)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials3.js:266 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials3.js:304 |
| Active suction duration | 120 | frames | js/authority/wagashiSpecials3.js:296 |
| Range gate | 350 | px | js/authority/wagashiSpecials3.js:302 |
| Cone half-angle | π/7.2 | rad (25°) | js/authority/wagashiSpecials3.js:272 |
| Cone range | 250 | px | js/authority/wagashiSpecials3.js:272 |
| Pull per frame | 3 | px | js/authority/wagashiSpecials3.js:274 |
| Damage tick interval | 30 | frames | js/authority/wagashiSpecials3.js:281 |
| Damage per tick | 8 | hp | js/authority/wagashiSpecials3.js:282 |

### void_spit (celestial_toad) (js/authority/wagashiSpecials3.js:312-343)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials3.js:314 |
| Telegraph | 40 | frames | js/authority/wagashiSpecials3.js:338 |
| Range gate | 400 | px | js/authority/wagashiSpecials3.js:336 |
| Bullet count | 5 | — | js/authority/wagashiSpecials3.js:321 |
| Spread half-angle | 30 | degrees | js/authority/wagashiSpecials3.js:320 |
| Bullet speed | 6 | px/frame | js/authority/wagashiSpecials3.js:325 |
| Bullet damage (each) | 40 | hp | js/authority/wagashiSpecials3.js:326 |

### corruption_mire (celestial_toad) (js/authority/wagashiSpecials3.js:346-409)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials3.js:348 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials3.js:402 |
| Range gate | 400 | px | js/authority/wagashiSpecials3.js:389 |
| Pool count | 3 | — | js/authority/wagashiSpecials3.js:392 |
| Pool max offset | 200 | px | js/authority/wagashiSpecials3.js:396 |
| Pool lifetime | 300 | frames | js/authority/wagashiSpecials3.js:380 |
| Pool damage radius | 50 | px | js/authority/wagashiSpecials3.js:363 |
| Pool damage tick interval | 30 | frames | js/authority/wagashiSpecials3.js:360 |
| Pool damage per tick | 10 | hp | js/authority/wagashiSpecials3.js:364 |

### black_orb_sentinels (lord_sarugami) (js/authority/wagashiSpecials3.js:414-468)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials3.js:416 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials3.js:462 |
| Sentinel count | 5 | — | js/authority/wagashiSpecials3.js:453 |
| Orbit radius | 80 | px | js/authority/wagashiSpecials3.js:424 |
| Orbit angular velocity | 0.03 | rad/frame | js/authority/wagashiSpecials3.js:420 |
| Active duration | 300 | frames | js/authority/wagashiSpecials3.js:451 |
| Collision radius | 40 | px | js/authority/wagashiSpecials3.js:430 |
| Damage | 20 | hp | js/authority/wagashiSpecials3.js:431 |
| Max hits per frame | 1 | — | js/authority/wagashiSpecials3.js:434 |

### orb_bomb_command (lord_sarugami) (js/authority/wagashiSpecials3.js:471-542)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 420 | frames | js/authority/wagashiSpecials3.js:473 |
| Telegraph | 70 | frames | js/authority/wagashiSpecials3.js:534 |
| Range gate | 450 | px | js/authority/wagashiSpecials3.js:524 |
| Bomb count | 3 | — | js/authority/wagashiSpecials3.js:527 |
| Bomb total timer | 70 | frames | js/authority/wagashiSpecials3.js:516 |
| Bomb travel frames | 40 | frames | js/authority/wagashiSpecials3.js:481 |
| Bomb post-arrival delay | 30 | frames | js/authority/wagashiSpecials3.js:516 |
| Explosion radius | 70 | px | js/authority/wagashiSpecials3.js:489 |
| Damage | 55 | hp | js/authority/wagashiSpecials3.js:490 |
| Target offset min | 80 | px | js/authority/wagashiSpecials3.js:529 |
| Target offset max | 140 | px | js/authority/wagashiSpecials3.js:529 |

### divine_form_shift (lord_sarugami) (js/authority/wagashiSpecials3.js:547-603)

HP-threshold reactive, NOT cooldown-based. Checks every frame but only triggers at HP transition points.

| Name | Value | Units | Citation |
|---|---|---|---|
| Default max HP fallback | 8000 | hp | js/authority/wagashiSpecials3.js:549 |
| Titan Form HP threshold | ≤0.66 | fraction of maxHp | js/authority/wagashiSpecials3.js:574 |
| Titan Form scale | 1.8 | × | js/authority/wagashiSpecials3.js:576 |
| Titan Form damage multiplier | 1.3 | × | js/authority/wagashiSpecials3.js:578 |
| Titan Form speed multiplier | 0.8 | × | js/authority/wagashiSpecials3.js:580 |
| Titan shockwave radius | 150 | px | js/authority/wagashiSpecials3.js:583 |
| Titan shockwave damage | 40 | hp | js/authority/wagashiSpecials3.js:584 |
| Statue Form HP threshold | ≤0.33 | fraction of maxHp | js/authority/wagashiSpecials3.js:592 |
| Statue invulnerability duration | 120 | frames | js/authority/wagashiSpecials3.js:594 |
| Statue speed | 0 | px/frame | js/authority/wagashiSpecials3.js:596 |
| Primal shockwave radius | 200 | px | js/authority/wagashiSpecials3.js:558 |
| Primal shockwave damage | 70 | hp | js/authority/wagashiSpecials3.js:559 |
| Primal Form scale | 1.5 | × | js/authority/wagashiSpecials3.js:564 |
| Primal Form speed multiplier | 1.5 | × (of original 3.5) | js/authority/wagashiSpecials3.js:565 |
| Primal Form damage multiplier | 1.2 | × | js/authority/wagashiSpecials3.js:566 |
| Primal Form CD multiplier | 0.6 | × | js/authority/wagashiSpecials3.js:567 |
| Fallback original speed | 3.5 | px/frame | js/authority/wagashiSpecials3.js:565 |
| Fallback original damage | 70 | hp | js/authority/wagashiSpecials3.js:566 |

## Behavior

**Floor 5 regular and Celestial Toad kit** — same two-phase pattern as prior floors (telegraph → execution → reset CD).

### devouring_pull active phase (js/authority/wagashiSpecials3.js:268-291)
1. While `_devourPullTimer > 0`, each frame: compute direction from mob to player.
2. Check if player is in cone (half-angle π/7.2, range 250px).
3. If yes, pull player 3px toward mob if `positionClear(nx, ny)`.
4. Every 30 frames, deal 8 damage.
5. On timer expiry, reset `_specialTimer`.

### corruption_mire pool logic (js/authority/wagashiSpecials3.js:350-371)
1. Each pool has `life` and `_tick` counters; `life` decrements each frame.
2. Every 30 `_tick` frames, check if player within 50px of pool; if yes deal 10 dmg.
3. Pool removed when `life <= 0`. Mob does NOT skip movement during active pool phase (js/authority/wagashiSpecials3.js:370 comment).

### black_orb_sentinels orbit math (js/authority/wagashiSpecials3.js:418-443)
1. `m._orbBaseAngle += 0.03` each frame.
2. For each of 5 sentinels: `angle = _orbBaseAngle + (i * 2π / 5)`, position `(m.x + cos(angle)*80, m.y + sin(angle)*80)`.
3. Check player within 40px of any sentinel; at most 1 hit per frame (`hitThisFrame` guard).
4. Active for 300 frames; returns `{}` (not skip) so boss can still move.

### orb_bomb_command phases (js/authority/wagashiSpecials3.js:475-521)
1. Cast: spawn 3 bomb records with `timer=70`, `startX/Y` at mob, `targetX/Y` at player+offset (80-140px radial).
2. Travel phase (timer 70→30, over 40 frames): `t = 1 - (timer-30)/40`; `bomb.x = startX + (targetX-startX)*t`.
3. Post-arrival (timer 30→0): bomb sits at target.
4. Explosion on `timer <= 0`: `AttackShapes.hitsPlayer(targetX, targetY, 70, player)` → 55 damage.

### divine_form_shift state machine (js/authority/wagashiSpecials3.js:547-603)

Runs EVERY frame (no CD gating). Tracks `_titanDone`, `_statueDone`, `_statuePhase` flags.

1. If `_statuePhase > 0` (active invulnerable Statue → Primal transition):
   - Decrement. When expires: `_invulnerable = false`; 200px AoE shockwave for 70 damage; transition to Primal Form (scale 1.5, speed × 1.5, damage × 1.2, `_specialCD × 0.6`).
2. Check Titan threshold: if `hp/maxHp ≤ 0.66` and `!_titanDone`:
   - Set `_titanDone = true`; save `_origDamage`/`_origSpeed`; scale 1.8; damage × 1.3; speed × 0.8; 150px shockwave for 40 damage.
3. Check Statue threshold: if `hp/maxHp ≤ 0.33` and `!_statueDone`:
   - Set `_statueDone = true`; `_statuePhase = 120`; `_invulnerable = true`; `speed = 0`.
   - Boss becomes invulnerable and immobile for 2 seconds, then Primal Form activates via the first branch.

## Dependencies

- Reads: `player.x`, `player.y`, `m.hp`, `m.maxHp`, `m.damage`, `m.speed`, `m.scale`, `dist`
- Reads: `MOB_TYPES.lord_sarugami.hp` for maxHp fallback (js/authority/wagashiSpecials3.js:549)
- Reads: `GAME_CONFIG.BULLET_SPEED` (mire_spit)
- Writes: `bullets[]`, `hitEffects[]`, `player.x`/`player.y` (pulls), `m.scale`, `m.speed`, `m.damage`, `m._specialCD`, `m._invulnerable`
- Calls: `dealDamageToPlayer`, `getMobDamageMultiplier`, `positionClear`, `StatusFX.applyToPlayer`, `TelegraphSystem.create`, `AttackShapes.hitsPlayer`, `AttackShapes.playerInCone`
- Uses global: `nextBulletId`, `MOB_TYPES`

## Edge cases

- `dark_gulp` pull: if `pullDist = Math.min(80, dist - 20)` is ≤ 0 (player very close), no pull applied (js/authority/wagashiSpecials3.js:110-111).
- `devouring_pull` and `corruption_mire` do NOT return `{ skip: true }` during their active/pool phases — the toad can continue moving and casting other abilities while the effect persists (js/authority/wagashiSpecials3.js:290, :370).
- `black_orb_sentinels` also returns `{}` (not skip) during the active phase — Lord Sarugami continues to walk and attack while sentinels orbit (js/authority/wagashiSpecials3.js:443).
- `corruption_mire` pool positions are clamped to a radius of 200px from the player via `clampedMag = Math.min(mag, 200)` — however, the raw random offset is ±200 in each axis (so up to ~282px Euclidean), then clamped to 200 (js/authority/wagashiSpecials3.js:393-398). The telegraph and the spawn use DIFFERENT sampled positions? No — the spawned pools reuse `m._corrMirePoolTargets` set during telegraph (js/authority/wagashiSpecials3.js:378-382), so telegraph matches the actual spawn.
- `divine_form_shift` DOES NOT stack: the `_titanDone` and `_statueDone` guards ensure each transition fires exactly once regardless of HP flickering above/below thresholds.
- `divine_form_shift` during Statue phase returns `{ skip: true }`, preventing the boss from moving or acting via other specials (js/authority/wagashiSpecials3.js:570, :598).
- `divine_form_shift` stacks: Titan Form is applied FIRST (at 66% HP) with scale 1.8 and speed × 0.8. Then when HP drops to 33%, Statue phase overrides speed to 0 (js/authority/wagashiSpecials3.js:596). After Statue expires, Primal Form sets scale to 1.5 (overriding Titan's 1.8) and uses `(_origSpeed || 3.5) * 1.5` and `(_origDamage || 70) * 1.2`. NOTE: Primal uses `_origSpeed` from the Titan transition save, not the Titan-modified speed.
- `MOB_TYPES.lord_sarugami.hp` fallback to 8000 only activates if `MOB_TYPES` is undefined or `lord_sarugami` missing (js/authority/wagashiSpecials3.js:549). UNKNOWN: actual value of `MOB_TYPES.lord_sarugami.hp` is not in this cluster — see mob-types documentation.
- `orb_bomb_command` active bombs phase returns `{ skip: true }` so Lord Sarugami is immobile while bombs are in flight/pending (js/authority/wagashiSpecials3.js:502).
- The `orb_bomb_command` target sampling uses `80 + Math.random() * 60` so actual range is 80-140px, not 80-140 as a simple range (js/authority/wagashiSpecials3.js:529).
- `mire_spit` has NO defined hit radius of its own — relies entirely on the bullet collision system.
