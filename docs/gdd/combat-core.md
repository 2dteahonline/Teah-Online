# combat-core

## Source of truth

- `js/core/gunSystem.js` — gun firing authority, bullet spawning, freeze state, CT-X modify panel
- `js/core/meleeSystem.js` — katana swings, ninja dash, shrine/godspeed ultimates, grab system, potions, bullet update + draw
- `js/authority/damageSystem.js` — central `dealDamageToMob` / `dealDamageToPlayer`, `processKill`, `GUN_BEHAVIORS`, `MELEE_HEAL_MULTS`
- `js/authority/combatSystem.js` — combat tick logic (note: file also contains `MOB_AI` registry, which is documented in `mobs-core` cluster)
- `js/authority/attackShapes.js` — `AttackShapes` geometry helpers (circle/line/cone/ring/tile)
- `js/authority/telegraphSystem.js` — `TelegraphSystem` ground markers warning before mob attacks
- `js/authority/hazardSystem.js` — `HazardSystem` persistent damage zones (poison clouds, sticky bombs)
- `js/client/rendering/hitEffects.js` — `HIT_EFFECT_RENDERERS` registry (visual layer)
- `js/shared/gunData.js` — `MAIN_GUNS` 5 progression guns + level interpolation + upgrade recipes
- `js/shared/itemData.js` — only `ITEM_STAT_RENDERERS` for `gun` and `melee` are combat-relevant; rest goes to inventory-crafting cluster
- `js/shared/gameConfig.js` — combat constants used here (BULLET_SPEED, ENTITY_R, PLAYER_HITBOX_Y)

## Purpose

Implements all damage resolution, weapon firing, hit detection, and on-hit/on-kill effects for the player, party bots, and mobs. Responsible for converting an attack input into HP changes, applying armor/projectile/status reductions, awarding kill rewards, dispatching weapon-special behaviors via the `GUN_BEHAVIORS` registry, and feeding visuals to the hit-effect renderer. Telegraph and hazard systems schedule delayed/zonal damage. Attack shape helpers are pure geometry used by mob abilities.

## Values

### Player gun base state (`GameState.gun`)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| ammo | 30 | rounds | js/authority/gameState.js:48 |
| magSize | 30 | rounds | js/authority/gameState.js:49 |
| damage | 20 | hp | js/authority/gameState.js:53 |

### Global combat constants

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| BULLET_SPEED | 9 | px/frame | js/shared/gameConfig.js:19 |
| BULLET_HALF_LONG | 15 | px | js/shared/gameConfig.js:20 |
| BULLET_HALF_SHORT | 4 | px | js/shared/gameConfig.js:21 |
| ENTITY_R | 29 | px | js/shared/gameConfig.js:22 |
| PLAYER_HITBOX_Y | -25 | px (offset from feet) | js/shared/gameConfig.js:23 |
| MUZZLE_OFFSET_Y | 0 | px | js/shared/gameConfig.js:24 |
| DEFAULT_HITBOX_R | 33 | px | js/shared/gameConfig.js:35 |
| KNOCKBACK_DECAY | 0.8 | per frame | js/shared/gameConfig.js:31 |
| KNOCKBACK_THRESHOLD | 0.6 | px/frame | js/shared/gameConfig.js:32 |

### Gun stat sliders (CT-Zero / `gunStats`)

| Name | Value | Notes | Citation |
|------|-------|-------|----------|
| firerate (default) | 50 | 0–100 scale | js/core/gunSystem.js:16 |
| freeze (default) | 50 | 0–100 scale | js/core/gunSystem.js:17 |
| spread (default) | 0 | 0–100 scale | js/core/gunSystem.js:18 |
| stack (default) | 0 | 0–100 scale | js/core/gunSystem.js:19 |
| Total budget | 100 | sum, increments of 5 | js/core/gunSystem.js:21 |

### Gun derived stats (default formulas)

| Name | Formula | Citation |
|------|---------|----------|
| getFireRate (per-gun override) | `playerEquip.gun.fireRate * 4` | js/core/gunSystem.js:28 |
| getFireRate (base) | `Math.round(58 - gunStats.firerate * 0.55)` then `* (1 - fireRateBonus*0.01)` then `*4` | js/core/gunSystem.js:29-30 |
| getFreezeDuration default | 15 frames | js/core/gunSystem.js:35 |
| getFreezePenalty default | `Math.min(0.25, gunStats.freeze * 0.0025)` | js/core/gunSystem.js:40 |
| getReloadTime base | `Math.round(20 + gunStats.firerate * 0.25)` | js/core/gunSystem.js:46 |
| getReloadTime CT-X mult | `* 1.2` | js/core/gunSystem.js:48 |

### Freeze multiplier on shoot (per gun)

| Condition | freezeMult | Citation |
|-----------|-----------|----------|
| tier ≥ 4 | 0.3 | js/core/gunSystem.js:469 |
| tier ≥ 3 | 0.5 | js/core/gunSystem.js:470 |
| MAIN_GUNS member | 0.3 | js/core/gunSystem.js:472 |
| Default | 1.0 | js/core/gunSystem.js:468 |
| recoilTimer set on shoot | 6 | js/core/gunSystem.js:587 |
| SHOOT_FACE_DURATION | 7 | js/client/ui/inventory.js:2633 |

### CT-X slider config

| Slider | Min | Max | Step | Set formula | Citation |
|--------|-----|-----|------|-------------|----------|
| Freeze | 0 | 100 | 5 | `penalty = 0.99 - v*0.009` (duration flat 15f) | js/core/gunSystem.js:650-655 |
| RoF (v≤50) | 0 | 100 | 5 | `frames = 10.275 - v*0.1125` | js/core/gunSystem.js:673 |
| RoF (v>50) | — | — | — | `Math.max(3.525, 4.650 - (v-50)*0.0375)` | js/core/gunSystem.js:675 |
| Spread | 0 | 100 | 10 | `degrees = v * 0.5` | js/core/gunSystem.js:685, 689 |

CT_X_GUN base values:

| Name | Value | Citation |
|------|-------|----------|
| damage | 20 | js/core/interactable.js:161 |
| fireRate | 4.650 | js/core/interactable.js:161 |
| magSize | 30 | js/core/interactable.js:161 |
| freezePenalty | 0.54 | js/core/interactable.js:161 |
| freezeDuration | 15 | js/core/interactable.js:161 |

### Stack mechanic

| Name | Formula | Citation |
|------|---------|----------|
| stackCount | `1 + Math.floor(gunStats.stack / 10)` | js/core/gunSystem.js:527 |

### Spar bullet damage tag

| Name | Value | Citation |
|------|-------|----------|
| Default spar bullet damage | 20 (from CT_X_GUN.damage) | js/core/gunSystem.js:562 |

### Player melee base state (`GameState.melee`)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| damage | 15 | hp | js/authority/gameState.js:64 |
| range | 90 | px | js/authority/gameState.js:65 |
| arcAngle | π × 0.8 | radians | js/authority/gameState.js:66 |
| cooldownMax | 28 | frames | js/authority/gameState.js:68 |
| swingDuration | 12 | frames | js/authority/gameState.js:71 |
| knockback | 5.04 | px | js/authority/gameState.js:73 |
| critChance | 0.20 | fraction | js/authority/gameState.js:74 |
| dashDuration | 14 | frames | js/authority/gameState.js:78 |
| dashSpeed | 21.85 | px/frame | js/authority/gameState.js:79 |
| dashCooldownMax | 240 | frames | js/authority/gameState.js:88 |

### Melee multipliers / sub-effects

| Name | Value | Citation |
|------|-------|----------|
| Crit damage multiplier | 1.5 | js/core/meleeSystem.js:148 |
| Ninja dashing damage mult | 4.0 | js/core/meleeSystem.js:149 |
| Ninja splash radius | 60 px | js/core/meleeSystem.js:170 |
| Ninja splash damage | `melee.damage * 0.3 * dashMult` | js/core/meleeSystem.js:166 |
| Storm shockwave radius | 80 px | js/core/meleeSystem.js:202 |
| Storm shockwave dmg | `melee.damage * 0.65` | js/core/meleeSystem.js:198 |
| Storm chain damage | `melee.damage * 0.50` | js/core/meleeSystem.js:224 |
| Storm chain max links | 3 | js/core/meleeSystem.js:228 |
| Storm chain search range | 160 px | js/core/meleeSystem.js:229 |
| Piercing blood damage | `melee.damage * 0.55` | js/core/meleeSystem.js:251 |
| Piercing blood range | 280 px | js/core/meleeSystem.js:252 |
| Lifesteal % | 15% (capped 20 hp) | js/core/meleeSystem.js:9 |
| Ninja dash hit radius | 50 px | js/core/meleeSystem.js:403 |
| Ninja dash damage | `melee.damage * 2.0 * 1.5` | js/core/meleeSystem.js:405 |
| Ninja dash gap (post-dash) | 12 frames | js/core/meleeSystem.js:417 |
| Ninja dash chain window (set) | 180 frames | js/core/meleeSystem.js:74 |

### Malevolent Shrine (cleave ultimate)

| Name | Value | Citation |
|------|-------|----------|
| chargesMax | 10 | js/core/meleeSystem.js:14 |
| duration | 180 frames (3 s) | js/core/meleeSystem.js:17 |
| range | 150 px | js/core/meleeSystem.js:18 |
| slashInterval | 4 frames | js/core/meleeSystem.js:19 |
| Execute threshold | hp ≤ maxHp × 0.15 | js/core/meleeSystem.js:319 |

### Godspeed (storm ultimate)

| Name | Value | Citation |
|------|-------|----------|
| chargesMax | 10 | js/core/meleeSystem.js:26 |
| duration | 300 frames (5 s) | js/core/meleeSystem.js:27 |
| range | 180 px | js/core/meleeSystem.js:28 |
| strikeInterval | 8 frames | js/core/meleeSystem.js:29 |
| Execute threshold | hp ≤ maxHp × 0.15 | js/core/meleeSystem.js:356 |

### Grab system

| Name | Value | Citation |
|------|-------|----------|
| GRAB_RANGE | 60 | js/authority/waveSystem.js:285 |
| GRAB_DURATION | 40 frames | js/authority/waveSystem.js:286 |
| GRAB_COOLDOWN | 0 | js/authority/waveSystem.js:287 |
| Grab initial damage | `melee.damage * 0.3` | js/core/meleeSystem.js:482 |
| Grab tick stun | 2 frames | js/core/meleeSystem.js:518 |
| Grab follow distance | 40 px | js/core/meleeSystem.js:516-517 |
| Throw distance | 80 px | js/core/meleeSystem.js:523 |
| Throw damage | `melee.damage * 0.5` | js/core/meleeSystem.js:527 |

### Potion (`GameState.potion`)

| Name | Value | Citation |
|------|-------|----------|
| count | 3 | js/authority/gameState.js:96 |
| healAmount | 25 | js/authority/gameState.js:97 |
| cooldownMax | 120 frames | js/authority/gameState.js:99 |

### Player damage modifiers (damageSystem.js)

| Name | Formula / Value | Citation |
|------|----------------|----------|
| Lethal Efficiency mult | ×1.15 when target.hp < maxHp × 0.4 | js/authority/damageSystem.js:182-185 |
| Backstabber mult | ×1.30 when angle from facing > π/2 | js/authority/damageSystem.js:189-197 |
| Frontal-shield arc | < π/3 (~60°) blocks | js/authority/damageSystem.js:57 |
| Damage reduction floor | min 1 hp after reduction | js/authority/damageSystem.js:80 |
| Core Guardian split HP threshold | maxHp × 0.5 | js/authority/damageSystem.js:96 |
| Split offspring HP | maxHp × 0.35 | js/authority/damageSystem.js:118 |
| Split offspring speed | parent × 1.6 | js/authority/damageSystem.js:119 |
| Split offspring scale | parent × 0.7 | js/authority/damageSystem.js:130 |
| Number of splits | 2 | js/authority/damageSystem.js:100 |
| Death animation frames | 40 | js/authority/damageSystem.js:530 |
| Respawn countdown | 180 frames | js/authority/damageSystem.js:531 |
| Poison total duration (player) | 1200 frames | js/authority/damageSystem.js:527 |
| witch_skeleton heal | 1 hp flat | js/authority/damageSystem.js:400 |

### Gun special behaviors (`GUN_BEHAVIORS`)

| Special | Effect | Value | Citation |
|---------|--------|-------|----------|
| frost on-hit | apply frost | duration 90, slow 0.25 | js/authority/damageSystem.js:260 |
| frost on-kill nova radius | 120 | js/authority/damageSystem.js:265 |
| frost nova applied | duration 60, slow 1.0 | js/authority/damageSystem.js:271 |
| frost killSources | `["gun"]` | js/authority/damageSystem.js:276 |
| burn on-hit | apply burn | duration 180, dmg 11 | js/authority/damageSystem.js:281 |
| burn explosion radius | 100 | js/authority/damageSystem.js:287 |
| burn explosion damage | `gun.damage * 0.8` | js/authority/damageSystem.js:288 |
| burn 2nd-tier explosion | × 0.6 | js/authority/damageSystem.js:306 |
| burn killSources | `["gun","burn_dot"]` | js/authority/damageSystem.js:316 |

### Heal multipliers per kill source (`MELEE_HEAL_MULTS`)

| Source | Mult | Citation |
|--------|------|----------|
| gun | 2.0 | js/authority/damageSystem.js:329 |
| melee (ninja dashActive) | 2.0 | js/authority/damageSystem.js:331 |
| melee (storm) | 1.5 | js/authority/damageSystem.js:332 |
| melee (default) | 1.0 | js/authority/damageSystem.js:333 |
| ninja_splash (dashActive) | 2.0 | js/authority/damageSystem.js:335 |
| ninja_splash (else) | 1.0 | js/authority/damageSystem.js:335 |
| ninja_dash_kill | 2.0 | js/authority/damageSystem.js:336 |
| storm_shock | 1.5 | js/authority/damageSystem.js:337 |
| storm_chain | 1.5 | js/authority/damageSystem.js:338 |
| shrine | 1.0 | js/authority/damageSystem.js:339 |
| godspeed | 1.0 | js/authority/damageSystem.js:340 |
| burn_dot | 1.0 | js/authority/damageSystem.js:341 |
| inferno_chain | 1.0 | js/authority/damageSystem.js:342 |
| thorns | 1.0 | js/authority/damageSystem.js:343 |
| piercing_blood | 1.5 | js/authority/damageSystem.js:344 |
| Default heal base (no killHeal) | 5 | js/authority/damageSystem.js:396 |
| Player XP per kill | 5 | js/authority/damageSystem.js:377 |

### MAIN_GUNS (progression guns) — base/max stats

Linear interpolation: `stat(level) = round(base + (max - base) * (level - 1) / 24)` (js/shared/gunData.js:8, 86, 96).

| Gun | Field | Base (L1) | Max (L25) | Citation |
|-----|-------|-----------|-----------|----------|
| storm_ar | damage | 25 | 85 | js/shared/gunData.js:20-21 |
| storm_ar | fireRate | 6 | 3 | js/shared/gunData.js:20-21 |
| storm_ar | magSize | 32 | 55 | js/shared/gunData.js:20-21 |
| storm_ar | reloadSpeed | 50 | 30 | js/shared/gunData.js:20-21 |
| storm_ar | buyPrice | 200 | — | js/shared/gunData.js:17 |
| heavy_ar | damage | 45 | 140 | js/shared/gunData.js:33-34 |
| heavy_ar | fireRate | 12 | 7 | js/shared/gunData.js:33-34 |
| heavy_ar | magSize | 24 | 40 | js/shared/gunData.js:33-34 |
| heavy_ar | reloadSpeed | 60 | 35 | js/shared/gunData.js:33-34 |
| heavy_ar | buyPrice | 300 | — | js/shared/gunData.js:30 |
| boomstick | damage | 18 | 45 | js/shared/gunData.js:46-47 |
| boomstick | fireRate | 20 | 14 | js/shared/gunData.js:46-47 |
| boomstick | magSize | 6 | 12 | js/shared/gunData.js:46-47 |
| boomstick | reloadSpeed | 70 | 45 | js/shared/gunData.js:46-47 |
| boomstick | pellets | 3 | 5 | js/shared/gunData.js:46-47 |
| boomstick | spread | 15 | 12 | js/shared/gunData.js:46-47 |
| boomstick | maxRange | 200 | 200 | js/shared/gunData.js:46-47 |
| boomstick | buyPrice | 350 | — | js/shared/gunData.js:42 |
| ironwood_bow | damage | 60 | 200 | js/shared/gunData.js:59-60 |
| ironwood_bow | fireRate | 18 | 10 | js/shared/gunData.js:59-60 |
| ironwood_bow | magSize | 12 | 20 | js/shared/gunData.js:59-60 |
| ironwood_bow | reloadSpeed | 90 | 50 | js/shared/gunData.js:59-60 |
| ironwood_bow | pierceCount | 1 | 3 | js/shared/gunData.js:59-60 |
| ironwood_bow | flags | pierce, isArrow | always | js/shared/gunData.js:62 |
| ironwood_bow | buyPrice | 400 | — | js/shared/gunData.js:55 |
| volt_9 | damage | 12 | 35 | js/shared/gunData.js:74-75 |
| volt_9 | fireRate | 3 | 2 | js/shared/gunData.js:74-75 |
| volt_9 | magSize | 50 | 80 | js/shared/gunData.js:74-75 |
| volt_9 | reloadSpeed | 55 | 30 | js/shared/gunData.js:74-75 |
| volt_9 | spread | 8 | 5 | js/shared/gunData.js:74-75 |
| volt_9 | buyPrice | 250 | — | js/shared/gunData.js:69 |

### Tier cost multipliers (gun upgrades)

| Tier | Mult | Citation |
|------|------|----------|
| 0 | 1 | js/shared/gunData.js:170 |
| 1 | 2.5 | js/shared/gunData.js:170 |
| 2 | 5 | js/shared/gunData.js:170 |
| 3 | 10 | js/shared/gunData.js:170 |
| 4 | 20 | js/shared/gunData.js:170 |

### Telegraph system

| Name | Value | Citation |
|------|-------|----------|
| Default color | [255, 80, 80] | js/authority/telegraphSystem.js:29 |
| Default cone angleDeg | 45 | js/authority/telegraphSystem.js:148 |
| Default cone range | 96 | js/authority/telegraphSystem.js:150 |
| Default ring innerRadius | 40 | js/authority/telegraphSystem.js:172 |
| Default ring outerRadius | 100 | js/authority/telegraphSystem.js:173 |
| Default line width | 20 | js/authority/telegraphSystem.js:117 |
| Resolved flash hold frames | 8 | js/authority/telegraphSystem.js:48 |

### Hazard zones

| Name | Default | Citation |
|------|---------|----------|
| tickRate | 60 frames | js/authority/hazardSystem.js:19 |
| tickDamage | 0 | js/authority/hazardSystem.js:21 |
| color | [100,200,100] | js/authority/hazardSystem.js:23 |
| slow | 0 | js/authority/hazardSystem.js:24 |

### Death-effect particle counts (gunSystem.js spawnDeathEffect)

| Mob type | Particle count | Citation |
|----------|---------------|----------|
| golem | 24 | js/core/gunSystem.js:66 |
| mini_golem | 16 | js/core/gunSystem.js:66 |
| witch | 18 | js/core/gunSystem.js:66 |
| default | 12 | js/core/gunSystem.js:66 |
| Hard cap on mob ambient particles | 100 | js/core/gunSystem.js:296 |

### HIT_EFFECT_RENDERERS

| Name | Value | Citation |
|------|-------|----------|
| Registered renderer count | UNKNOWN (registry defined at js/client/rendering/hitEffects.js:7; per-cluster scope limits exhaustive enumeration here — see hit-effects-cluster) | js/client/rendering/hitEffects.js:7 |

## Behavior

### Shooting (`shoot()` — js/core/gunSystem.js:455)

1. Bail if not neverReload and (`gun.ammo <= 0` or reloading) (js/core/gunSystem.js:458).
2. Bail if `gun.fireCooldown > 0` (js/core/gunSystem.js:459).
3. Compute aim direction (4-cardinal) via `getAimDir` (js/core/gunSystem.js:415).
4. Set `shootFaceDir`/`shootFaceTimer = SHOOT_FACE_DURATION = 7` (js/core/gunSystem.js:464-465).
5. Compute `freezeMult` from gun tier / MAIN_GUNS (js/core/gunSystem.js:468-472), set `freezeTimer = round(getFreezeDuration() * freezeMult)` (js/core/gunSystem.js:473).
6. Pick `bSpeed` from per-gun override or `BULLET_SPEED=9` (js/core/gunSystem.js:476).
7. Get muzzle position via `getMuzzlePos(aimDir)` (js/core/gunSystem.js:485, 428).
8. If `pelletCount > 0`: shotgun mode — spawn N pellets across `spread` cone (js/core/gunSystem.js:504-524). Pellets carry `maxRange` and despawn after that distance.
9. Else: spawn `stackCount = 1 + floor(stack/10)` bullets (js/core/gunSystem.js:527). For SMG-style spread, add random angular offset within `spreadDeg` (js/core/gunSystem.js:532-539).
10. Apply pierce flags from gun (js/core/gunSystem.js:551-555) and arrow flag (js/core/gunSystem.js:556-558).
11. Spar mode tags bullet with team / damage 20 (js/core/gunSystem.js:560-566).
12. Decrement `gun.ammo` unless neverReload (js/core/gunSystem.js:584); set `gun.fireCooldown = getFireRate()` (js/core/gunSystem.js:586); `gun.recoilTimer = 6` (js/core/gunSystem.js:587).
13. If ammo hits 0, set reloading + `gun.reloadTimer = getReloadTime()` (js/core/gunSystem.js:589-592).

### Gun update (`updateGun()` — js/core/gunSystem.js:595)

1. Decrement `fireCooldown` and `recoilTimer` (js/core/gunSystem.js:596-597).
2. If reloading, decrement `reloadTimer`; on ≤0 set `ammo = magSize`, clear reloading (js/core/gunSystem.js:599-605).
3. While `InputIntent.shootHeld` and not in chat/menus/Skeld/Mafia/Casino, dispatch by hotbar slot to `shoot()`, `meleeSwing()`, or `usePotion()` (js/core/gunSystem.js:608-616).

### Melee swing (`meleeSwing()` — js/core/meleeSystem.js:35)

1. Cooldown check is bypassed during ninja dash chain (js/core/meleeSystem.js:37-41).
2. Set swinging flags + cooldown (js/core/meleeSystem.js:43-45).
3. Compute swing direction from aim (js/core/meleeSystem.js:54-57).
4. Fishing rod intercept and farming branches (js/core/meleeSystem.js:60-64).
5. Ninja dash-attack: triggers a dash in attack direction (js/core/meleeSystem.js:69-81).
6. Hide & seek tag check (js/core/meleeSystem.js:90-110).
7. Calls shared `_meleeHitMobs` (js/core/meleeSystem.js:113).

### `_meleeHitMobs` shared logic (js/core/meleeSystem.js:119)

For each mob within `range`:
1. Skip if dead. Compute distance + arc check (cleave hits 360°) (js/core/meleeSystem.js:126-141).
2. Roll crit: ninja dash and shadowStep guarantee crit; else `Math.random() < critChance` (default 0.20) (js/core/meleeSystem.js:144-147).
3. Damage = `round(damage * critMult * dashMult)` (js/core/meleeSystem.js:150).
4. Call `dealDamageToMob(m, dmg, "melee", entity)` (js/core/meleeSystem.js:151).
5. Push hit/crit visuals (js/core/meleeSystem.js:155-158).
6. Ninja: dual slashes + 60-px AOE splash dealing `damage*0.3*dashMult`, with lifesteal per hit (js/core/meleeSystem.js:161-181).
7. Knockback applied if path is non-solid (js/core/meleeSystem.js:184-190).
8. Storm: shockwave 80 px doing `damage*0.65` source `storm_shock` (js/core/meleeSystem.js:193-209).
9. Cleave: tracks hits for piercing blood (js/core/meleeSystem.js:212-217).

After loop:
- Storm chain lightning: from each storm hit, find up to 3 closest mobs ≤160 px and deal `damage*0.5` source `storm_chain` (js/core/meleeSystem.js:223-247).
- Piercing blood: cleave hits emit blood arcs hitting all mobs within 280 px for `damage*0.55` source `piercing_blood` (js/core/meleeSystem.js:250-274).

### `updateMelee()` (js/core/meleeSystem.js:277)

1. Decrement cooldowns and dash chain window (js/core/meleeSystem.js:278-294).
2. If dashing, call `_tickDashMovement` (js/core/meleeSystem.js:298-300).
3. Shrine ultimate: every `slashInterval=4` frames, slash all mobs within 150 px; mobs ≤15% HP execute (js/core/meleeSystem.js:303-340).
4. Godspeed ultimate: every `strikeInterval=8` frames strike all mobs within 180 px; ≤15% executes (js/core/meleeSystem.js:342-372).
5. Tick dash trail lifetimes (js/core/meleeSystem.js:374-378).

### Damage resolution (`dealDamageToMob` — js/authority/damageSystem.js:30)

1. `_poisonImmune` blocks poison/bleed sources (js/authority/damageSystem.js:33).
2. `_invulnerable` blocks all (js/authority/damageSystem.js:36).
3. `_shielded` blocks all except dot/burn_dot/thorns; emits shield_block hit effect (js/authority/damageSystem.js:39-44).
4. `_frontalShield` blocks attacks from within ~60° of facing (js/authority/damageSystem.js:47-63).
5. `_counterStance` reflects melee back to attacker (js/authority/damageSystem.js:66-75).
6. `_damageReduction` percentage applied with floor 1 (js/authority/damageSystem.js:78-81).
7. `_shieldHp` absorbs first (js/authority/damageSystem.js:84-91).
8. Subtract HP (js/authority/damageSystem.js:93).
9. Split mechanic at 50% HP for `_canSplit` mobs spawns 2 shards (js/authority/damageSystem.js:96-139).
10. If hp ≤ 0, call `processKill` (js/authority/damageSystem.js:141-149).

### Player damage (`dealDamageToPlayer` — js/authority/damageSystem.js:171)

1. Resolve target (player or bot) (js/authority/damageSystem.js:173-175).
2. Bail if dead or `_godMode` (js/authority/damageSystem.js:177-179).
3. Lethal Efficiency ×1.15 if target hp < maxHp×0.4 (js/authority/damageSystem.js:182-185).
4. Backstabber ×1.30 if angle from facing > π/2 (js/authority/damageSystem.js:189-197).
5. Apply armor reduction unless source = `dot` (js/authority/damageSystem.js:202-204). Helper `getArmorReduction` lives in `js/core/interactable.js:232` — see armor cluster.
6. Apply projectile reduction for `projectile`/`aoe` (js/authority/damageSystem.js:207-209). Helper at js/core/interactable.js:280.
7. Armor break multiplier from StatusFX if active (js/authority/damageSystem.js:212-214).
8. Round, subtract HP (js/authority/damageSystem.js:217-218).
9. Thorns reflection on `contact` source via `getThorns`/`getStagger` (js/authority/damageSystem.js:221-233).
10. Death check (bot vs player) (js/authority/damageSystem.js:236-243).
11. Emit `player_damaged` event (js/authority/damageSystem.js:246).

### `processKill` (js/authority/damageSystem.js:354)

1. Resolve killer (party member or 'player') (js/authority/damageSystem.js:357-372).
2. `kills++`, +5 player XP, +5 Total Kills skill XP (js/authority/damageSystem.js:375-379).
3. Quick-kill bonus via `getQuickKillBonus` (waveSystem.js:260, out of cluster) (js/authority/damageSystem.js:382).
4. Gold reward × party size mult, paid to killer's wallet (js/authority/damageSystem.js:386-393).
5. Compute heal: base from MOB_TYPES.killHeal (default 5) × qkb × source mult × (1 + chest healBoost). Lifesteal floor enforced (js/authority/damageSystem.js:396-425).
6. Party Lifesteal heals all alive members (js/authority/damageSystem.js:428-439).
7. Push kill / heal hit effects (js/authority/damageSystem.js:441-445).
8. Witch death cascades to skeletons; golem death cascades to mini golems (js/authority/damageSystem.js:448-464).
9. `_deathExplosion` AoE on all party members (js/authority/damageSystem.js:466-478).
10. Emit `mob_killed` event (js/authority/damageSystem.js:481).

### `mob_killed` subscribers (damageSystem.js:486-519)

- Refill killer's gun ammo + clear reloading (js/authority/damageSystem.js:486-494).
- Charge shrine (cleave) or godspeed (storm) ultimate by 1 if not active (js/authority/damageSystem.js:497-507).
- Dispatch gun special on-kill via `GUN_BEHAVIORS[special].onKill` if `killSources` includes source (js/authority/damageSystem.js:511-519).

### Bullet update (`updateBullets` — js/core/meleeSystem.js:926)

For each bullet:
- Player bullets: hit-test against mobs; pierce decrements `pierceCount` and tracks `hitMobs`; non-pierce destroys bullet (js/core/meleeSystem.js:1099-1132).
- Test shoot bot collision (js/core/meleeSystem.js:1134-1148).
- Mob bullets: arrow applies poison (`StatusFX.applyPoison(round(1200 * (1-getEffectReduction)))`) and destroys (js/core/meleeSystem.js:1153-1174). Boulder uses radius `b.boulderHitRadius || 40` and pushes explosion + dmg `20 * getMobDamageMultiplier()` (js/core/meleeSystem.js:1176-1195). Generic mob bullet uses `b.damage || gun.damage` (js/core/meleeSystem.js:1197-1214).
- Tick hit effect lifetimes (js/core/meleeSystem.js:1220-1223).

### Telegraph lifecycle (telegraphSystem.js:37)

1. `update()` decrements `delay`; on ≤0 fires `onResolve()`, sets `_flashTimer = 8`, then removes after flash expires.
2. `draw()` renders fill+outline by shape with progress 0→1. Resolved telegraphs draw a white flash for 8 frames.
3. `clear()` empties active list; `clearOwner(id)` removes by mob owner.

### Hazard zone lifecycle (hazardSystem.js:13)

1. `createZone` pushes a zone with `tickRate`, `tickDamage`, `color`, `slow`.
2. `updateZones` decrements life; if any party member is inside, increments `tickCounter`; on `tickRate` calls `dealDamageToPlayer(tickDamage,'hazard_zone',null,target)` and pushes `tickEffect` hit effect.
3. `drawZones` draws pulsing alpha cloud (max alpha 0.25).
4. `initForFloor` and `activateBossHazards` are no-ops (floor hazards removed).

### Attack shapes (`AttackShapes` — attackShapes.js:6)

Pure geometry helpers used by mob abilities. All return either booleans (player tests) or arrays of mobs (multi-target). Shapes: circle, line/beam (segment-distance), cone (range + half-angle), ring (donut), tile area (radius in tiles), point-on-tiles. Plus `dirToPlayer`, `distToPlayer`, `endpoint`.

## Dependencies

- Reads: `player`, `mobs`, `bullets`, `gold`, `gun`, `melee`, `potion`, `playerEquip` (from js/authority/gameState.js)
- Reads: `MOB_TYPES`, `MOB_AI`, `MOB_SPECIALS` (mobs-core cluster)
- Reads: `StatusFX.applyToMob`, `StatusFX.applyPoison`, `StatusFX.playerEffects` (status-effects cluster)
- Reads: `PartySystem.getMemberByEntity`, `PartySystem.getAliveEntities`, `PartySystem.addGold`, `PartyState.members` (party cluster)
- Reads: `getArmorReduction`, `getProjReduction`, `getThorns`, `getStagger`, `getEffectReduction` (js/core/interactable.js — armor cluster)
- Reads: `getQuickKillBonus`, `getGoldReward`, `getMobDamageMultiplier` (js/authority/waveSystem.js — waves cluster)
- Reads: `addPlayerXP`, `addSkillXP` (progression cluster)
- Reads: `positionClear`, `isSolid`, `TILE`, `GAME_CONFIG` (collision/world cluster)
- Reads: `Scene`, `InputIntent`, `UI` (scene/input cluster)
- Reads: `SparState`, `HideSeekState/System` (game-modes cluster)
- Writes: `bullets[]`, `hitEffects[]`, `mob.hp`, `player.hp`, `gun.ammo`, `gun.fireCooldown`, `gun.reloading`, `freezeTimer`, `kills`, `gold`
- Emits: `player_damaged`, `mob_killed` (Events bus)
- Provides: `dealDamageToMob`, `dealDamageToPlayer`, `processKill`, `applyKnockback`, `GUN_BEHAVIORS`, `MELEE_HEAL_MULTS`, `getKillHealMult`, `AttackShapes`, `TelegraphSystem`, `HazardSystem`, `MAIN_GUNS`, `getGunStatsAtLevel`, `HIT_EFFECT_RENDERERS`

## Edge cases

- `neverReload` guns (the bow) skip ammo decrement and reload entirely; only `fireCooldown` gates fire (js/core/gunSystem.js:457-458, 583-584).
- Pierce bullets track hit mob IDs in `b.hitMobs` to prevent double-hitting the same mob (js/core/gunSystem.js:554, js/core/meleeSystem.js:1115-1118).
- Spar fighting mode adds `bulletObj.sparTeam`, `damage`, `_sparDir`, and start coords for learning telemetry (js/core/gunSystem.js:559-566).
- Frontal shield uses a hardcoded facing-angle table `[π/2, -π/2, π, 0]` for dirs `[down, up, left, right]` — note the player damage version uses a different table `[π/2, π, -π/2, 0]` (js/authority/damageSystem.js:52, 191).
- Thorns reflection on a mob that has 0 HP after thorns triggers `dealDamageToMob` with source `"thorns"`, which does NOT trigger ultimate charge (subscriber bails on `witch_skeleton`; thorns also does not pass the source filter on `GUN_BEHAVIORS`).
- Witch and Golem deaths cascade-kill their summons via recursive `processKill(s,"witch_skeleton",killerId)` regardless of golem owner (js/authority/damageSystem.js:448-464).
- `_canSplit` mobs spawn shards even if `positionClear` fails — falls back to mob position after 8 angle retries (js/authority/damageSystem.js:105-114).
- `dealDamageToMob` returns `false` for invulnerable / shielded targets — caller's on-kill effects must check the return value before triggering AoE.
- Knockback in melee only moves mob if destination tile is non-solid (no sliding along wall) (js/core/meleeSystem.js:187-189).
- Ninja dash sets `m.dashHit = true` per-mob within a single dash, then deletes the flag for ALL mobs at dash end — concurrent dashes from multiple party members would race on this flag (js/core/meleeSystem.js:401, 418).
- Shrine and Godspeed center on `_activator` (the party member who triggered them) so bots and players can both activate (js/core/meleeSystem.js:305, 344).
- CT-X slider total is enforced ≤100 by clamping each slider against the sum of the other two (js/core/gunSystem.js:914-917).
- Stack mechanic: `stackCount = 1 + floor(stack/10)` is bypassed in shotgun mode (pelletCount>0 path skips it entirely) (js/core/gunSystem.js:504, 527).
- Shotgun pellet distribution uses `(p / (pelletCount-1 || 1) - 0.5) * spreadRad`, so a single pellet still spawns at center (js/core/gunSystem.js:510).
- `MUZZLE_OFFSET_Y` defaults to 0 (Graal-style flat aim) — left/right shots come straight from the arm with no vertical peek (js/shared/gameConfig.js:24).
- HazardSystem `initForFloor` and `activateBossHazards` are no-ops since floor hazards were removed; only `createZone` is functional (js/authority/hazardSystem.js:87-94).
