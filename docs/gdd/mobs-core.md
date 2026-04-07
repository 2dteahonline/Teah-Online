# Mobs — Core Cluster

## Source of truth

- `js/shared/mobTypes.js` — `MOB_TYPES` registry (265 types), `MOB_CAPS`, `CROWD_EXEMPT_TYPES`, `MOB_ENTITY_ARRAYS`
- `js/shared/dungeonRegistry.js` — `DUNGEON_REGISTRY` (7 dungeons, gating, reward multipliers, max floors)
- `js/authority/mobSystem.js` — mob movement, BFS pathfinding, separation, AABB tile collision, status-effect ticking
- `js/authority/combatSystem.js` — `MOB_AI` registry (13 patterns), movement helpers (`clampDashTarget`, `findClearPosition`, `sanitizeAITarget`); special abilities and damage logic live in other clusters
- `js/authority/waveSystem.js` — wave/phase scaling, mob factory `createMob`, spawn pos, gold/medpack logic
- `js/authority/lootDropSystem.js` — ground material drops on `mob_killed`, pickup, despawn

## Purpose

Defines every mob type's stats and AI hookup, the wave system that scales and spawns them, the AI registry that picks movement targets, and the loot drop system that converts kills into ground materials. This cluster is the data + lifecycle layer for mobs; combat/damage logic, individual special abilities, and renderer code live in other clusters and are referenced under Dependencies.

## Values

### Dungeon registry

| Dungeon key | Name | combatLevelId | maxFloors | requiredLevel | rewardMult | difficulty | Citation |
|---|---|---|---|---|---|---|---|
| cave | Cave Dungeon | warehouse_01 | 5 | 0 | 1.0 | 1 | js/shared/dungeonRegistry.js:7-20 |
| azurine | Azurine City | azurine_dungeon_01 | 5 | 10 | 1.5 | 2 | js/shared/dungeonRegistry.js:21-34 |
| vortalis | Vortalis | warehouse_01 | 5 | 20 | 2.0 | 3 | js/shared/dungeonRegistry.js:35-48 |
| earth205 | Earth-205: Marble City | warehouse_01 | 5 | 30 | 2.8 | 4 | js/shared/dungeonRegistry.js:49-62 |
| wagashi | Wagashi: Heavenly Realm | warehouse_01 | 5 | 40 | 3.5 | 5 | js/shared/dungeonRegistry.js:63-76 |
| earth216 | Earth-216: Sin City | warehouse_01 | 5 | 50 | 4.5 | 5 | js/shared/dungeonRegistry.js:77-90 |

`validateDungeonType()` falls back to `'cave'` if key invalid (js/shared/dungeonRegistry.js:94-98).

Dungeon spawn tiles: cave/vortalis/earth205/wagashi/earth216 use `spawnTX=20, spawnTY=20`; azurine uses `18, 18` (js/shared/dungeonRegistry.js:14-86).

### Wave global constants

| Name | Value | Units | Citation |
|---|---|---|---|
| WAVES_PER_FLOOR | 10 | waves | js/authority/waveSystem.js:163 |
| MAX_FLOORS (legacy alias) | 5 | floors | js/authority/waveSystem.js:164 |
| MEDPACK_HEAL | 30 | hp | js/authority/waveSystem.js:186 |
| MEDPACK_PICKUP_RANGE | 40 | px | js/authority/waveSystem.js:187 |
| Medpacks per `spawnMedpacks()` call | 2 | medpacks | js/authority/waveSystem.js:191 |
| Quick-kill bonus threshold | 300 | frames (5 s) | js/authority/waveSystem.js:262 |
| Quick-kill bonus multiplier | 1.2 | × | js/authority/waveSystem.js:262 |

### Phase system

| Name | Value | Citation |
|---|---|---|
| Phases per non-boss wave | 3 | js/authority/waveSystem.js:84 |
| Phase 1 spawn trigger | immediate (`phaseTriggered=[true,false,false]`) | js/authority/waveSystem.js:542 |
| Next-phase trigger threshold | 75% of current phase mobs killed | js/authority/waveSystem.js:704 |
| Phase 2 HP multiplier | 1.04 | js/authority/waveSystem.js:586 |
| Phase 3 HP multiplier | 1.08 | js/authority/waveSystem.js:586 |
| Phase 2 speed multiplier | 1.02 | js/authority/waveSystem.js:587 |
| Phase 3 speed multiplier | 1.04 | js/authority/waveSystem.js:587 |

### Wave scaling formulas

| Formula | Definition | Citation |
|---|---|---|
| `getMobCountForWave(w)` | `min(min(5 + floor(w*1.0), 14) + (dungeonFloor-1)*2, 22)`, then × `PartySystem.getMobCountScale()` if party | js/authority/waveSystem.js:304-314 |
| `getWaveHPMultiplier(w)` | `(1 + (w-1)*0.12) * 2.2^(dungeonFloor-1)` × `PartySystem.getMobHPScale()` if party | js/authority/waveSystem.js:315-325 |
| `getWaveSpeedMultiplier(w)` | `(1 + (w-1)*0.06) * (1 + (dungeonFloor-1)*0.15)` | js/authority/waveSystem.js:326-330 |
| `getMobDamageMultiplier()` | with `f = max(1,dungeonFloor)-1`: `1 + f*0.7 + f^1.5*0.2` | js/authority/waveSystem.js:332-336 |
| `capMobSpeed(type, speed)` | runner: `min(speed, playerSpeed*1.1)`; else `min(speed, playerSpeed*0.85)` | js/authority/waveSystem.js:338-342 |
| `getGoldReward(type, waveNum)` | `round(base * (1 + (globalWave-1)*0.07) * floorBonus * 0.5 * dungeonMult)` | js/authority/waveSystem.js:268-276 |
| Floor gold bonus | F1=1.8, F2=1.3, F3=1.1, F4-5=1.0 | js/authority/waveSystem.js:273 |
| Default gold base | 2 | js/authority/waveSystem.js:270 |
| Farm wave detection (legacy) | `w%8===1 || w%8===3` | js/authority/waveSystem.js:579 |
| Farm wave count multiplier | 1.6 | js/authority/waveSystem.js:580 |
| Farm wave HP multiplier | 0.7 | js/authority/waveSystem.js:584 |
| Boss base HP bonus (`bossHPMult`) | 1.5 | js/authority/waveSystem.js:617, 623 |

### Witch HP / Golem HP overrides in `createMob`

| Type | HP override | Citation |
|---|---|---|
| witch | `round(MOB_TYPES.tank.hp * 1.2 * hpMult)` | js/authority/waveSystem.js:365 |
| golem | `round(mt.hp * hpMult * 1.5)` | js/authority/waveSystem.js:366 |

### Mob visual scale (createMob)

| Condition | scale | Citation |
|---|---|---|
| `mt.bossScale` | uses bossScale | js/authority/waveSystem.js:376 |
| type==='tank' or ai==='tank' | 1.3 | js/authority/waveSystem.js:377 |
| type==='witch' | 1.1 | js/authority/waveSystem.js:378 |
| type==='golem' | 1.6 | js/authority/waveSystem.js:379 |
| default | 1.0 | js/authority/waveSystem.js:375 |

### Legacy mob unlock waves

| Mob | Unlocked at wave | Citation |
|---|---|---|
| archer | ≥ 2 | js/authority/waveSystem.js:593 |
| runner | ≥ 3 | js/authority/waveSystem.js:594 |
| mummy | ≥ 4 | js/authority/waveSystem.js:597 |
| tank | ≥ 5 | js/authority/waveSystem.js:595 |
| healer | ≥ 5 | js/authority/waveSystem.js:596 |
| witch | ≥ 6 | js/authority/waveSystem.js:598 |
| golem | wave ≥ 10 AND wave % 10 === 0 | js/authority/waveSystem.js:599 |

### Spawn-position search

| Param | Value | Citation |
|---|---|---|
| Edge margin | 4 tiles | js/authority/waveSystem.js:503 |
| Edge attempts | 20 | js/authority/waveSystem.js:504 |
| Fallback min distance from player | 200 px (squared 200²) | js/authority/waveSystem.js:522 |

### Boss-wave forced golem guarantees

`forceGolem` boss waves spawn 1 golem + tank ×3, witch ×2, grunt ×4, runner ×3, archer ×2, healer ×2, mummy ×2 (js/authority/waveSystem.js:649-660).

### MOB_TYPES schema (per-entry fields)

All mobs are entries in `const MOB_TYPES` (js/shared/mobTypes.js:11). Optional physics fields fall back to `GAME_CONFIG` (js/shared/mobTypes.js:4-9):

| Field | Type | Default / Notes | Cited at (example) |
|---|---|---|---|
| `name` | string | display name | js/shared/mobTypes.js:12 |
| `hp` | number | base HP (scaled at spawn) | js/shared/mobTypes.js:12 |
| `speed` | number | base speed (capped via `capMobSpeed`) | js/shared/mobTypes.js:12 |
| `damage` | number | base contact damage (scaled by `getMobDamageMultiplier`) | js/shared/mobTypes.js:12 |
| `killHeal` | number | hp restored to player on kill | js/shared/mobTypes.js:12 |
| `goldReward` | number | base gold (default 2) | js/shared/mobTypes.js:12, js/authority/waveSystem.js:270 |
| `skin`, `hair`, `shirt`, `pants` | hex string | character layer colors | js/shared/mobTypes.js:12 |
| `contactRange` | number | default 76 in `createMob` | js/authority/waveSystem.js:386 |
| `deathColors` | string[] | particle palette | js/shared/mobTypes.js:12 |
| `radius` | number | default `GAME_CONFIG.MOB_RADIUS` | js/authority/waveSystem.js:388, js/shared/mobTypes.js:5 |
| `wallHW` | number | default `GAME_CONFIG.MOB_WALL_HW` | js/authority/waveSystem.js:389, js/shared/mobTypes.js:6 |
| `hitboxR` | number | default `GAME_CONFIG.ENTITY_R` | js/authority/waveSystem.js:390, js/shared/mobTypes.js:7 |
| `ai` | string \| null | MOB_AI key (e.g. `'runner'`, `'witch'`) | js/authority/waveSystem.js:391 |
| `kiteRange` | number | default 160 | js/authority/waveSystem.js:392, js/shared/mobTypes.js:8 |
| `shootRange`, `shootRate`, `bulletSpeed` | number | ranged shooter fields | js/authority/waveSystem.js:397-399 |
| `summonRate`, `summonMax` | number | witch/golem summoning | js/authority/waveSystem.js:401-402 |
| `boulderRate`, `boulderSpeed`, `boulderRange` | number | golem boulder throw | js/authority/waveSystem.js:407-408 |
| `boulderHitRadius` | number | default 40 | js/shared/mobTypes.js:9, js/authority/combatSystem.js:893 |
| `explodeRange`, `explodeDamage`, `fuseMin`, `fuseMax` | number | mummy self-destruct | js/authority/waveSystem.js:411-413 |
| `arrowRate`, `arrowSpeed`, `arrowRange`, `arrowBounces`, `arrowLife` | number | archer projectile | js/authority/waveSystem.js:416-418 |
| `projectileStyle`, `bulletColor` | string / object | rendering | js/authority/waveSystem.js:420-421 |
| `healRadius`, `healRate`, `healAmount` | number | healer | js/authority/waveSystem.js:423-425 |
| `_specials` | string[] | special-ability keys (handled in MOB_SPECIALS) | js/authority/waveSystem.js:428 |
| `specialCD` | number | base cooldown (frames) | js/authority/waveSystem.js:429-430 |
| `isBoss` | bool | boss flag | js/authority/waveSystem.js:462 |
| `bossScale` | number | visual scale override | js/authority/waveSystem.js:376 |
| `_canSplit`, `_frontalShield`, `_damageReduction`, `_contactDamageAura`, `_deathExplosion`, `_counterStance`, `_poisonImmune`, `_lethalEfficiency`, `_showMustGoOn`, `_backstabber`, `_intimidatingPresence` | various | passive flags copied to mob instance | js/authority/waveSystem.js:450-461 |

### Universal/legacy mobs (cave dungeon base 9)

| Type | hp | speed | damage | killHeal | goldReward | contactRange | Notes | Citation |
|---|---|---|---|---|---|---|---|---|
| grunt | 106 | 3.8 | 18 | 10 | 2 | 57 | base melee | js/shared/mobTypes.js:12 |
| runner | 50 | 4.6 | 10 | 3 | 3 | 56 | fast pursuer | js/shared/mobTypes.js:13 |
| tank | 375 | 3.4 | 20 | 20 | 6 | 58 | bulky | js/shared/mobTypes.js:14 |
| witch | 188 | 1.8 | 6 | 25 | 7 | 57 | summonRate 540, summonMax 4 | js/shared/mobTypes.js:15 |
| skeleton | 38 | 3.8 | 8 | 1 | 0 | 56 | summoned only | js/shared/mobTypes.js:16 |
| golem | 1000 | 1.5 | 13 | 40 | 30 | 62 | boulderRate 88, boulderSpeed 9, boulderRange 1000, summonRate 300, summonMax 3 | js/shared/mobTypes.js:17 |
| mini_golem | 120 | 1.9 | 6 | 10 | 5 | 38 | boulderRate 140, boulderSpeed 9, boulderRange 500 | js/shared/mobTypes.js:18 |
| mummy | 56 | 3.4 | 0 | 5 | 3 | 57 | explodeRange 140, explodeDamage 28, fuseMin 32, fuseMax 96 | js/shared/mobTypes.js:19 |
| archer | 75 | 2.9 | 6 | 8 | 4 | 56 | arrowRate 80, arrowSpeed 9, arrowRange 400, arrowBounces 4, arrowLife 600 | js/shared/mobTypes.js:20 |
| healer | 81 | 2.1 | 5 | 15 | 5 | 56 | healRadius 220, healRate 72, healAmount 10 | js/shared/mobTypes.js:21 |

### Sample mobs per dungeon (full lists in mobTypes.js)

#### Floor 1 — Azurine City (js/shared/mobTypes.js:23-91)

| Type | hp | speed | damage | ai | _specials | specialCD | Citation |
|---|---|---|---|---|---|---|---|
| neon_pickpocket | 60 | 4.4 | 12 | runner | swipe_blink | 420 | js/shared/mobTypes.js:25-29 |
| cyber_mugger | 90 | 3.6 | 16 | grunt | stun_baton | 480 | js/shared/mobTypes.js:30-34 |
| drone_lookout | 70 | 3.1 | 8 | archer | spot_mark | 600 | js/shared/mobTypes.js:35-41 |
| street_chemist | 65 | 2.8 | 6 | witch | gas_canister | 540 | js/shared/mobTypes.js:42-47 |
| renegade_bruiser | 200 | 3.4 | 22 | tank | ground_pound | 540 | js/shared/mobTypes.js:50-54 |
| renegade_shadowknife | 55 | 4.8 | 18 | runner | cloak_backstab | 900 | js/shared/mobTypes.js:55-59 |
| the_don (mini-boss L5) | 800 | 1.9 | 28 | archer | laser_snipe / tommy_burst / smart_mine / smoke_screen | 720 | js/shared/mobTypes.js:74-83 |
| velocity (boss L10) | 1500 | 4.3 | 30 | runner | phase_dash / bullet_time_field / afterimage_barrage / summon_renegades | 480 | js/shared/mobTypes.js:86-91 |

#### Floor 2 — Tech District / Corporate Core (js/shared/mobTypes.js:93-162)

| Type | hp | speed | damage | ai | _specials | Citation |
|---|---|---|---|---|---|---|
| circuit_thief | 75 | 3.9 | 10 | runner | overload_drain | js/shared/mobTypes.js:95-99 |
| arc_welder | 85 | 3.4 | 14 | grunt | weld_beam | js/shared/mobTypes.js:100-104 |
| voltmaster (mini-boss L15) | 1000 | 2.3 | 18 | witch | chain_lightning / emp_pulse / tesla_pillars / magnet_snap | js/shared/mobTypes.js:118-124 |
| suit_enforcer | 120 | 3.1 | 16 | tank | briefcase_turret | js/shared/mobTypes.js:127-132 |
| e_mortis (boss L20) | 1800 | 2.6 | 22 | archer | dividend_barrage / hostile_takeover / nda_field / golden_parachute | js/shared/mobTypes.js:153-162 |

#### Floor 3 — Junkyard / Swamp (js/shared/mobTypes.js:164-227)

| Type | hp | speed | damage | ai | Citation |
|---|---|---|---|---|---|
| scrap_rat | 80 | 3.6 | 10 | grunt | js/shared/mobTypes.js:166-170 |
| rust_sawman | 85 | 3.9 | 16 | runner | js/shared/mobTypes.js:176-181 |
| mourn (mini-boss L25) | 1200 | 1.7 | 24 | tank | js/shared/mobTypes.js:190-195 |
| chem_frog | 70 | 3.1 | 10 | witch | js/shared/mobTypes.js:208-213 |
| centipede (boss L30) | 2200 | 1.9 | 20 | witch | js/shared/mobTypes.js:221-227 |

#### Floor 4 — Trap House / R.E.G.I.M.E (js/shared/mobTypes.js:229-294)

| Type | hp | speed | damage | ai | Citation |
|---|---|---|---|---|---|
| tripwire_tech | 80 | 3.4 | 12 | grunt | js/shared/mobTypes.js:231-235 |
| gizmo_hound | 70 | 4.8 | 14 | runner | js/shared/mobTypes.js:236-240 |
| game_master (mini-boss L35) | 1400 | 1.9 | 18 | witch | js/shared/mobTypes.js:254-260 |
| signal_jammer | 80 | 3.4 | 10 | witch | js/shared/mobTypes.js:278-283 |
| junz (boss L40) | 2500 | 2.3 | 25 | archer | js/shared/mobTypes.js:286-294 |

#### Floor 5 — Waste Planet / Slime / Dusk (js/shared/mobTypes.js:296-372)

| Type | hp | speed | damage | ai | Citation |
|---|---|---|---|---|---|
| rabid_hyenaoid | 105 | 4.6 | 18 | runner | js/shared/mobTypes.js:298-302 |
| spore_stag | 120 | 3.9 | 20 | tank | js/shared/mobTypes.js:303-307 |
| lehvius (duo mini-boss L45) | 1900 | 3.3 | 26 | tank | js/shared/mobTypes.js:321-326 |
| jackman (duo mini-boss L45) | 1500 | 2.6 | 19 | witch | js/shared/mobTypes.js:327-333 |
| core_guardian | 175 | 3.3 | 14 | tank, `_canSplit:true`, specialCD 9999 (passive) | js/shared/mobTypes.js:347-352 |
| malric (final duo boss L50) | 3600 | 2.9 | 32 | tank | js/shared/mobTypes.js:360-365 |
| vale (final duo boss L50) | 2600 | 3.6 | 24 | witch | js/shared/mobTypes.js:366-372 |

#### Other dungeons (Vortalis, Earth-205, Wagashi, Earth-216)

The same pattern continues. Each dungeon has 5 floors × 8 mob types + 2 bosses (mini + boss). Full per-mob entries are at:

- Vortalis: js/shared/mobTypes.js:374 onward (`bilge_rat`, `powder_keg`, …)
- Earth-205: starts in mid-file (see `MOB_CAPS` block js/shared/mobTypes.js:1928-1946 for full type list per floor)
- Wagashi: js/shared/mobTypes.js:1948-1966
- Earth-216: js/shared/mobTypes.js:1968-1986
- Final boss `alcazar` (Earth-216 F5): hp 8500, speed 3.8, damage 70, ai archer, _specials [corrupt_vessel, black_benediction, unsealing_maw], js/shared/mobTypes.js:1872-1881

### MOB_CAPS (per-wave per-type cap)

Universal: `grunt:12, runner:8, tank:3, witch:2, golem:1, mini_golem:6, mummy:3, archer:2, healer:2` (js/shared/mobTypes.js:1886). Floor mob caps generally 3-4; bosses always 1; Wagashi and Earth-216 use cap 8 for trash and 1 for bosses (js/shared/mobTypes.js:1885-1987). Default cap if missing: 99 (js/authority/waveSystem.js:670).

### CROWD_EXEMPT_TYPES

Mobs in this Set bypass the `crowded` AI fallback and always run their own AI even when ≥2 allies are within `MOB_CROWD_RADIUS` (js/authority/mobSystem.js:162). Set members include `runner, golem, mini_golem, archer, healer` plus all ranged/boss mobs across every dungeon (js/shared/mobTypes.js:1989-2009).

### MOB_ENTITY_ARRAYS

Per-mob sub-array fields cleaned up on death/floor transition (js/shared/mobTypes.js:2012-2018):
`_bombs, _mines, _oilPuddles, _traps, _oozeLines, _rampartZones, _meltTargets, _summonedMinions, _turrets, _drones, _pillars, _eggs, _lasers, _baits, _staticOrbs, _holoClones, _rocketDrones, _junzBeam, _tetherLine, _geyserZones, _inkPuddles, _coralWalls, _tentacles, _barnacleTraps, _whirlpools`.

### MOB_AI registry (13 patterns)

All entries live in `MOB_AI` (js/authority/combatSystem.js:539-751). Each is `(m, ctx) => { targetX, targetY }`. `ctx` provides `{ player, dist, dx, dy, playerVelX, playerVelY, mapCenterX, mapCenterY, amBetween, isCrowded, mobs }` (js/authority/mobSystem.js:160).

| Key | Behavior summary | Citation |
|---|---|---|
| `crowded` | Walks toward a 35% cutoff between player and map center, predicts player by `dist/speed*0.5` if player moving, then rotates target around mob by `((id%8)-3.5)*0.5` rad. Used as override when `isCrowded && !CROWD_EXEMPT_TYPES`. | js/authority/combatSystem.js:540-556 |
| `runner` | Direct chase if `dist>50`. If `amBetween` or `dist<150`, predict player by `dist/speed*0.6`; else go to 35% cutoff with `dist/speed*0.7` predict. Spread by `((id%6)-2.5)*0.35` rad. | js/authority/combatSystem.js:558-582 |
| `grunt` | Direct chase if `dist>40`, predict by `dist/speed*0.3`, spread `((id%4)-1.5)*0.3` rad. | js/authority/combatSystem.js:584-598 |
| `tank` | Same as grunt but predict `*0.5` and spread `((id%5)-2)*0.4` rad. | js/authority/combatSystem.js:600-614 |
| `witch` | Kite at `m.kiteRange||160`. If `dist>idealDist` chase player; if `dist<idealDist*0.5` retreat 30 px and rotate by `((id%3)-1)*0.6` rad; else strafe perpendicular ±60 px depending on `id%2`. | js/authority/combatSystem.js:616-637 |
| `mummy` | grunt-like with predict `*0.5`, spread `((id%3)-1)*0.45` rad. | js/authority/combatSystem.js:639-653 |
| `skeleton` | Swarm at radius 40 around player with angle `(id%8)*(2π/8)`, predict by `dist/speed*0.4`. | js/authority/combatSystem.js:655-669 |
| `golem` | Direct chase, predict by `min(dist/speed*0.4, 60)` (capped). | js/authority/combatSystem.js:671-681 |
| `mini_golem` | Direct chase if `dist>30`, predict by `min(dist/speed*0.3, 40)`. | js/authority/combatSystem.js:683-694 |
| `healer` | Stays away from player at idealDist 300. Retreats 100 px if `dist<160`, otherwise moves to nearest non-healer/non-skeleton ally (offset 60 px past the ally away from player). | js/authority/combatSystem.js:696-719 |
| `archer` | Kite at idealDist 350. Retreat 120 px if `dist<180`; if `dist<idealDist*0.7` retreat 60 px + perpendicular 40 px (`id%2` direction); if `dist>idealDist*1.4` chase predicted by `dist/speed*0.4`; else strafe perpendicular ±100 px at idealDist. | js/authority/combatSystem.js:721-744 |
| `stationary` | Returns mob position (no movement). | js/authority/combatSystem.js:745 |
| `hover` | Returns player position directly; flying mobs ignore wall collision in `updateMobs` (`isHoverMob` branch). | js/authority/combatSystem.js:746-750, js/authority/mobSystem.js:269-270 |

`MOB_AI[m.type]` is used first, then `m.ai` from MOB_TYPES (js/authority/mobSystem.js:161). When `isCrowded && !CROWD_EXEMPT_TYPES.has(m.type) && dist>60`, `MOB_AI.crowded` overrides (js/authority/mobSystem.js:162-163).

### Movement validation helpers (combatSystem.js)

| Helper | Purpose | Citation |
|---|---|---|
| `clampDashTarget(startX, startY, dir, maxDist)` | Binary-search 8 iterations for max safe distance along `dir`; clamps inside map by 1 tile | js/authority/combatSystem.js:757-772 |
| `findClearPosition(targetX, targetY, fallbackX, fallbackY)` | Try target → 8 compass offsets at distance `TILE` → fallback | js/authority/combatSystem.js:776-788 |
| `sanitizeAITarget(m, targetX, targetY)` | If 1 tile ahead is wall-blocked, slide perpendicular ±0.5 TILE; else freeze at mob position | js/authority/combatSystem.js:792-805 |

### Loot drop system

| Constant | Value | Units | Citation |
|---|---|---|---|
| Drop life | 1800 | frames (30 s @ 60 fps) | js/authority/lootDropSystem.js:18 |
| Pickup distance | 40 | px (player.y offset −20) | js/authority/lootDropSystem.js:60-63 |
| Fade-out window | 120 | frames | js/authority/lootDropSystem.js:100 |
| Glow radius | `12 + tier*3` | px | js/authority/lootDropSystem.js:106 |
| Glow alpha | `0.15 + tier*0.05` | — | js/authority/lootDropSystem.js:107 |
| Main circle radius | 8 | px | js/authority/lootDropSystem.js:115 |
| Sparkle tier threshold | tier ≥ 2 (single), tier ≥ 3 (dual) | — | js/authority/lootDropSystem.js:123-130 |
| `DEFAULT_DROP_CHANCE` | 0.12 | probability | js/shared/craftingData.js:199 |

### Drop rates per mob (DROP_TABLES, js/shared/craftingData.js:105-196)

| Mob | dropChance | items | Citation |
|---|---|---|---|
| grunt | 0.15 | dungeon pool | js/shared/craftingData.js:107 |
| runner | 0.12 | dungeon pool | js/shared/craftingData.js:108 |
| tank | 0.20 | dungeon pool | js/shared/craftingData.js:109 |
| witch | 0.18 | dungeon pool | js/shared/craftingData.js:110 |
| archer | 0.15 | dungeon pool | js/shared/craftingData.js:111 |
| healer | 0.18 | dungeon pool | js/shared/craftingData.js:112 |
| mummy | 0.10 | dungeon pool | js/shared/craftingData.js:113 |
| All Azurine trash mobs | 0.12-0.18 | dungeon pool | js/shared/craftingData.js:125-132 |
| All bosses (golem, the_don, velocity, captain_husa, … alcazar) | **1.0** | explicit weighted item table | js/shared/craftingData.js:115-195 |

Boss-specific item tables follow the form `{ materialId, weight, countMin, countMax }`. Example — golem: `rare_weapon_parts (40, 1-3) / epic_weapon_parts (30, 1-2) / uncommon_weapon_parts (30, 2-4)` (js/shared/craftingData.js:116-122). Final-boss tables for `nofaux`, `lord_sarugami`, `mami_wata`, `alcazar`, `hollow_ace` mix legendary parts at weight 20-30 (js/shared/craftingData.js:171, 183, 159, 195, 194).

### DUNGEON_DROP_POOL (per-dungeon, per-floor material pool)

`getMobDrop` chooses uniformly from the floor's pool when mob is not in `DROP_TABLES.items` (js/shared/craftingData.js:247-253).

| Dungeon | F1 | F2 | F3 | F4 | F5 | Citation |
|---|---|---|---|---|---|---|
| cave | common_weapon_parts | common+uncommon | uncommon+rare | rare+epic | epic+legendary | js/shared/craftingData.js:55-61 |
| azurine | storm_capacitor + common | storm_capacitor + wind_crystal | wind_crystal + volt_coil | volt_coil + plasma_cell | plasma_cell + storm_capacitor | js/shared/craftingData.js:62-68 |
| vortalis | ironwood_limb + common | ironwood + sinew_string | sinew_string + fletching_kit | fletching_kit + ironwood | fletching_kit + sinew_string | js/shared/craftingData.js:69-75 |
| earth205 | heavy_barrel_liner + common | heavy_barrel + uncommon | heavy_barrel + blast_powder | blast + heavy_barrel | blast + heavy_barrel | js/shared/craftingData.js:76-82 |
| wagashi | scatter_core + common | scatter + gunpowder_charge | gunpowder + buckshot_mold | buckshot + scatter | buckshot + gunpowder | js/shared/craftingData.js:83-89 |
| earth216 | shadow_alloy + common | shadow + uncommon | shadow + neon_filament | neon + shadow | neon + shadow | js/shared/craftingData.js:90-96 |

## Behavior

### Wave lifecycle (`spawnWave`, js/authority/waveSystem.js:533-572)

1. Increment `wave`, set `waveState='active'`, fetch `comp = getWaveComposition(wave)`.
2. Reset phase tracking: `currentPhase=1, phaseMobsKilled=0, phaseTriggered=[true,false,false]`.
3. Clear `medpacks`.
4. If `comp.forceGolem || comp.forceBoss`, run boss branch: optionally activate hazards (js/authority/waveSystem.js:551-553), spawn 2 medpack rounds, call `spawnPhase(comp, 1, true)`, set `phaseTriggered=[true,true,true]` (no further phases), tag all mobs as `phase=1`, emit `wave_started` with `isBoss:true`. Return.
5. Otherwise spawn medpacks, call `spawnPhase(comp, 1, false)`, set `phaseMaxMobs = mobs.length`, tag mobs `phase=1`, emit `wave_started`.

### `spawnPhase` (js/authority/waveSystem.js:575-686)

1. Detect farm wave (legacy only, `w%8===1 || w%8===3`) → `farmMult=1.6`, `farmHPMult=0.7`.
2. Compute `hpMult = getWaveHPMultiplier(w) * farmHPMult * phaseHPMult`, `spdMult = getWaveSpeedMultiplier(w) * phaseSpdMult`.
3. Filter `comp.primary`/`comp.support` by `unlocked(type)` legacy gating (js/authority/waveSystem.js:592-606).
4. **`forceBoss` branch** (js/authority/waveSystem.js:612-639): spawn one `comp.forceBoss` mob via `createMob` with `bossHPMult:1.5`, then optional `comp.duoBoss`, then iterate `comp.support` entries spawning `entry.count` copies each (NOT weighted random — guaranteed spawns).
5. **`forceGolem` branch** (js/authority/waveSystem.js:641-661): spawn 1 golem + the fixed guarantees listed above.
6. **Normal branch** (js/authority/waveSystem.js:663-685): for `i in count`, choose primary vs support pool by `Math.random() < comp.primaryPct`, weighted-pick a type, enforce `MOB_CAPS[type]` (default 99), fall back to any uncapped type, then `createMob`.

### `checkPhaseAdvance(deadMobPhase)` (js/authority/waveSystem.js:689-724)

1. No-op if `waveState !== 'active'` or all 3 phases triggered.
2. Increment `phaseMobsKilled` only if `deadMobPhase === currentPhase`.
3. When `phaseMobsKilled >= floor(phaseMaxMobs * 0.75)`, advance: set `currentPhase = nextPhase`, mark triggered, reset `phaseMobsKilled`, spawn medpacks, call `spawnPhase(comp, nextPhase, false)`, retag new mobs with `nextPhase`, set `phaseMaxMobs = mobs.length - mobsBefore` (only the new mobs count for the next 75% threshold), push announcement hitEffect.

### `createMob(typeKey, x, y, hpMult, spdMult, opts)` (js/authority/waveSystem.js:360-486)

1. Look up `MOB_TYPES[typeKey]`, return null if missing.
2. Compute HP: base × `hpMult`, override for witch (×1.2 of tank.hp) and golem (×1.5), apply `opts.bossHPMult` for bosses.
3. Compute speed cap: runner/`ai==='runner'` cap at `playerSpeed*1.1`, else use `capMobSpeed` (×0.85).
4. Compute scale via bossScale / tank / witch / golem rules.
5. Build mob object with all stat copies, ranged fields, summon fields, special-ability fields, passive flags.
6. Stagger boss multi-ability cooldowns by `floor(120 + random*120)` for each special (js/authority/waveSystem.js:466-471).
7. Tag with `phase` from opts.
8. If `window._mobsFrozen`, immediately freeze (`speed=0, _specialTimer=99999, _frozen=true, _testDummy=true`).

### `updateMobs()` per-frame (js/authority/mobSystem.js:54-…)

1. Decrement `contactCooldown`, tick per-party-member `_phaseTimer`.
2. **Separation pass** (js/authority/mobSystem.js:67-100): O(n²) loop, for each pair within `max(radii)*2` push apart by 0.45×overlap (only if destination is wall-clear via `positionClear` with `wallHW`). Exact-overlap fallback rotates 8 angles at 0.6× minSep.
3. For each mob `m`:
   a. Skip if `hp<=0`. Auto-freeze if `window._mobsFrozen`. Decrement `boneSwing`, `_despawnTimer` (kill at 0).
   b. `StatusFX.tickMob(m)` — if `result.skip`, skip movement (stagger/stun).
   c. Skip movement entirely for `_testDummy`.
   d. Resolve `_mobTarget = PartySystem.getMobTarget(m)`; set `_currentDamageTarget`.
   e. Compute `dx,dy,dist`. If `dist>5` and not in shoot range:
      - Build `aiCtx`. Pick AI key (`MOB_AI[m.type] || m.ai`). If crowded and not exempt and `dist>60`, use `MOB_AI.crowded` instead. Run AI to get `targetX,targetY`. Run `sanitizeAITarget`.
      - Compute speed cap (runner ai → ×1.1, else ×0.85), then × `fxResult.speedMult`.
      - **Pathfinding**: raycast tile line from mob to target; if any solid → use `bfsPath` (cached, refresh every 12 frames or 5 if near a wall). Follow `path[1]` waypoint. If BFS returns null (>600 explored), pick best 8-direction neighbor by dot product with desired direction. Otherwise direct vector.
      - Update facing (`m.dir` 0/1/2/3) by largest of `|dx|,|dy|`.
      - Apply X then Y AABB tile collision with `wallHW`. If blocked on one axis, nudge ±1.5 px in the other to slide. Hover mobs (`ai==='hover' || type==='hover'`) bypass walls entirely.

### Mob death → loot drop (`mob_killed` event subscriber)

1. Subscriber lives at js/authority/lootDropSystem.js:31. Skip if `source==='witch_skeleton'` or mob type is `skeleton`/`mini_golem`. Skip if not in dungeon.
2. Read current `dungeonId` from `GameState.currentDungeon` (default `'cave'`) and `dungeonFloor`.
3. `getMobDrop(mob.type, dungeonId, floor)` (js/shared/craftingData.js:223-254): roll vs `DROP_TABLES[type].dropChance` or `DEFAULT_DROP_CHANCE`. If table has explicit `items`, weighted pick + roll count `[countMin..countMax]`. Otherwise pick uniformly from `DUNGEON_DROP_POOL[dungeonId][floor]` with count 1.
4. Spawn ground drop at mob (x,y) with `ownerId = killerId || 'player'` and `life=1800`.

### Ground drop update (`updateGroundDrops`, js/authority/lootDropSystem.js:51-88)

1. Wipe all drops if not `Scene.inDungeon`.
2. For each drop: decrement `life`, despawn if 0.
3. Pickup check: distance < 40 px from `player` (using `player.y - 20` offset). Owner check: `ownerId==='player'` or `ownerLeft`. Add via `addToInventory`; on success push a `+N name` heal hitEffect, splice. If inventory full, drop stays.
4. If `ownerId !== 'player'` and party member with that id is missing/inactive, set `ownerLeft = true` so anyone can grab it.

### Medpacks

`spawnMedpacks` always spawns 2 medpacks per call at random non-solid tiles (50 attempts) within margins of 6 (js/authority/waveSystem.js:189-208). `updateMedpacks` heals first party member within 40 px squared by up to 30 hp (js/authority/waveSystem.js:210-232).

### Gold reward

`getGoldReward(type, waveNum)`: base from `MOB_TYPES[type].goldReward` (default 2), scaled by `(1 + (globalWave-1)*0.07) * floorBonus * 0.5 * dungeonMult` (js/authority/waveSystem.js:268-276). The `0.5` constant halves all gold globally.

## Dependencies

- **Reads**: `MOB_TYPES`, `MOB_CAPS`, `CROWD_EXEMPT_TYPES` (js/shared/mobTypes.js); `DUNGEON_REGISTRY` (js/shared/dungeonRegistry.js); `FLOOR_CONFIG`, `WAVE_TEMPLATES`, `getFloorWaveComposition` (js/shared/floorConfig.js); `GAME_CONFIG.MOB_RADIUS / MOB_WALL_HW / ENTITY_R / MOB_CROWD_RADIUS / PLAYER_BASE_SPEED / POS_HW`; `level.widthTiles/heightTiles`, `TILE`, `isSolid`; `player`, `mobs`, `bullets`, `medpacks`, `hitEffects`, `wave`, `dungeonFloor`, `currentDungeon`, `gameFrame` (js/authority/gameState.js); `PartySystem.getMobTarget / getAliveEntities / getMobCountScale / getMobHPScale` (js/authority/partySystem.js); `StatusFX.tickMob` (js/authority/combatSystem.js); `CRAFT_MATERIALS`, `getMobDrop`, `DROP_TABLES`, `DUNGEON_DROP_POOL`, `DEFAULT_DROP_CHANCE` (js/shared/craftingData.js); `addToInventory`, `createMaterialItem` (js/authority/inventorySystem.js, js/shared/craftingData.js).
- **Writes**: `mobs[]`, `bullets[]`, `medpacks[]`, `hitEffects[]`, `_groundDrops[]`, `wave`, `waveState`, `currentPhase`, `phaseMaxMobs`, `phaseMobsKilled`, `phaseTriggered`.
- **Emits**: `wave_started` `{ wave, floor, isBoss, mobCount }` (js/authority/waveSystem.js:561, 571).
- **Listens**: `mob_killed` (js/authority/lootDropSystem.js:31).
- **Cross-cluster references** (NOT documented here):
  - **Combat / damage / weapons**: js/authority/combatSystem.js (everything except `MOB_AI` and the three movement helpers) — `dealDamageToPlayer`, `applyKnockback`, `StatusFX`, gun/melee/bullet logic.
  - **Mob special abilities** (`MOB_SPECIALS`): js/authority/combatSystem.js:810+ for cave bases; per-dungeon files (`*Specials*.js`, e.g. `azurineSpecials.js`, `vortalisSpecials.js`, `earth205Specials.js`, `earth216Specials.js`, `wagashiSpecials.js`) — Wave 2 cluster.
  - **Floor wave compositions** (`FLOOR_CONFIG`, `WAVE_TEMPLATES`, `SUBFLOOR_BLUEPRINTS`, `getFloorWaveComposition`): js/shared/floorConfig.js (>1300 lines) — separate cluster.
  - **Hazards** (`HazardSystem.activateBossHazards`): js/authority/hazardSystem.js — separate cluster.
  - **Renderers** (`ENTITY_RENDERERS`, mob sprite rendering, `HIT_EFFECT_RENDERERS`): js/client/rendering/* — separate cluster.
  - **Crafting materials** (`CRAFT_MATERIALS`, tier colors, descriptions): js/shared/craftingData.js — separate cluster.
  - **Party scaling functions**: js/authority/partySystem.js — separate cluster.

## Edge cases

- **Witch and golem HP overrides** in `createMob` ignore the per-type `hp` field for those two — witch HP is `tank.hp * 1.2 * hpMult`, golem HP is `mt.hp * hpMult * 1.5`. Anything reading raw `MOB_TYPES.witch.hp = 188` will get the wrong value (js/authority/waveSystem.js:365-366).
- **Boss HP ignores party scaling**: forceBoss/forceGolem branches use `getWaveHPMultiplier(wave) * farmHPMult * phaseHPMult` directly **without** the `PartySystem.getMobHPScale()` factor that normal `getWaveHPMultiplier` applies — but `getWaveHPMultiplier` itself multiplies by party scale internally (js/authority/waveSystem.js:321-323), so the comment "no party HP scale" at js/authority/waveSystem.js:615 is misleading: party HP scaling **does** apply to bosses.
- **`createMob` random initial timers** stagger boss specials and projectile timers using `Math.floor(Math.random()*…)` — non-deterministic across runs (js/authority/waveSystem.js:398, 402, 409, 419, 425).
- **Speed cap discrepancy**: `capMobSpeed` uses `playerSpeed * 0.85` for non-runners but `createMob` uses `* 0.85` (line 372) while in `updateMobs` per-frame the runner cap is `* 1.1` and others `* 0.85` (js/authority/mobSystem.js:179-181) — so a boots-buffed player effectively cannot outrun runner-AI mobs.
- **Phase 75% threshold uses `floor`**: a 4-mob phase advances at `floor(4*0.75)=3` kills; a 3-mob phase advances at `floor(3*0.75)=2` kills (js/authority/waveSystem.js:704).
- **Phase 1 mobs are tagged AFTER spawn**, only if `!m.phase` already set (js/authority/waveSystem.js:560, 570) — boss/duo mobs from `forceBoss` are spawned with `phaseOpts={phase:1}` so they already have it.
- **Hover AI mobs ignore walls completely**, including in separation push checks (js/authority/mobSystem.js:269-270) — only pure-`isHoverMob` is exempt; AI uses `m.ai === 'hover' || m.type === 'hover'`.
- **Crowded override only triggers if `dist > 60`** (js/authority/mobSystem.js:162) — close mobs always run their own AI even when crowded.
- **`MOB_AI` lookup precedence**: `MOB_AI[m.type]` overrides `m.ai`, so a mob with `type:'witch'` always uses the witch AI even if it sets `ai:'archer'` (js/authority/mobSystem.js:161).
- **Loot drops are skipped for skeleton, mini_golem, and `source==='witch_skeleton'`** — summons never drop (js/authority/lootDropSystem.js:32-34).
- **Loot pickup uses `player.y - 20`** as the test point and circle radius 40, not the standard player hitbox (js/authority/lootDropSystem.js:60-63).
- **Bot-owned drops** are never picked up by bots; they auto-convert to `ownerLeft=true` only when the owning bot leaves the party (js/authority/lootDropSystem.js:81-86).
- **`MOB_CAPS` default 99** silently allows uncapped spawning of any new mob type added to a wave composition without a cap entry (js/authority/waveSystem.js:670, 673).
- **Farm-wave detection only fires for legacy compositions** (`!comp.forceBoss && !comp.forceGolem`) — FLOOR_CONFIG-based dungeons never trigger the 1.6× count / 0.7× HP modifier (js/authority/waveSystem.js:578-580).
- **`getWaveComposition` falls back to a generic grunt wave** with a `console.warn` if FLOOR_CONFIG is missing for the current dungeon/floor (js/authority/waveSystem.js:352-354).
- **`core_guardian` uses `specialCD: 9999`** as a sentinel — its split is handled passively on damage rather than via the cooldown timer (js/shared/mobTypes.js:350-351).
- **`mob.contactRange` defaults to 76 in `createMob`** even though every MOB_TYPES entry sets it (typically 56-63), so a missing field would silently use 76 (js/authority/waveSystem.js:386).
