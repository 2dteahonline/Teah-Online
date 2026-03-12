# Mobs

## Overview

Mobs are the enemy combatants in Teah Online's dungeon system. They are defined data-first in `MOB_TYPES`, with AI movement patterns in `MOB_AI` (11 patterns), special attacks in `MOB_SPECIALS` (60+ abilities), and per-frame logic in `updateMobs()`. The system supports legacy mobs (Floor 0 cave dungeon), 5 themed dungeon floors with 4 mob types each, mini-bosses, and final bosses -- including duo boss fights. Mobs use BFS pathfinding, body-blocking separation, AABB wall collision with wall-sliding, and a stuck-detection safety net.

## Files

- `js/shared/mobTypes.js` -- `MOB_TYPES` registry (all mob stat definitions), `MOB_CAPS`, `CROWD_EXEMPT_TYPES`, `MOB_ENTITY_ARRAYS`
- `js/authority/combatSystem.js` -- `StatusFX`, `MOB_AI` (11 movement patterns), `MOB_SPECIALS` (60+ ability handlers), `clampDashTarget()`, `findClearPosition()`, `sanitizeAITarget()`
- `js/authority/mobSystem.js` -- `updateMobs()` main loop, `positionClear()`, `bfsPath()`, mob separation, collision, contact damage, special dispatch

## Key Functions & Globals

| Symbol | Purpose |
|--------|---------|
| `MOB_TYPES` | Registry of all mob definitions (stats, AI type, specials, per-type physics) |
| `MOB_CAPS` | Per-type max count per wave (e.g., grunt: 12, golem: 1) |
| `CROWD_EXEMPT_TYPES` | Set of types that skip crowded-AI override (ranged/special mobs) |
| `MOB_AI` | Registry of 11 movement targeting functions |
| `MOB_SPECIALS` | Registry of 60+ special ability update functions |
| `MOB_ENTITY_ARRAYS` | List of sub-array keys on mobs (`_bombs`, `_mines`, `_turrets`, etc.) for cleanup |
| `updateMobs()` | Per-frame mob logic: separation, movement, collision, specials, contact damage |
| `positionClear(px, py, hw)` | AABB wall-free check at pixel position (4-corner tile test) |
| `bfsPath(sx, sy, ex, ey, maxExplore)` | 8-directional BFS pathfinder from tile to tile, capped at 600 tiles |
| `clampDashTarget(startX, startY, dir, maxDist)` | Binary-search for farthest wall-clear position along a direction |
| `findClearPosition(targetX, targetY, fallbackX, fallbackY)` | Validates position, tries 8 compass offsets if blocked |
| `sanitizeAITarget(m, targetX, targetY)` | Prevents AI from targeting positions behind walls (1-tile check + perpendicular slide) |

## How It Works

### MOB_TYPES Entry Format

Every mob type is an object in `MOB_TYPES` with these fields:

```
{
  // Required
  name: "Grunt",              // display name
  hp: 106,                    // base HP (scaled by wave multiplier at spawn)
  speed: 3.4,                 // base movement speed in px/frame
  damage: 18,                 // contact/attack damage (scaled by getMobDamageMultiplier())
  killHeal: 10,               // HP restored to player on kill
  goldReward: 2,              // base gold dropped
  skin: "#7a6050",            // character color: skin
  hair: "#3a2a1a",            //   hair
  shirt: "#556644",           //   shirt
  pants: "#3a3a2a",           //   pants
  contactRange: 76,           // px range for contact damage check
  deathColors: ["#aa4444"...],// particle colors on death

  // Optional: AI override (Floor 1+ mobs reuse legacy AI patterns)
  ai: 'runner',               // key into MOB_AI (if no direct MOB_AI[type] entry)

  // Optional: special abilities
  _specials: ['swipe_blink'], // array of ability keys into MOB_SPECIALS
  specialCD: 420,             // cooldown between ability uses (frames)

  // Optional: boss flags
  isBoss: true,
  bossScale: 1.4,             // visual scale multiplier

  // Optional: ranged attack stats
  arrowRate: 80,              // frames between arrow shots
  arrowSpeed: 9,              // arrow projectile speed
  arrowRange: 400,            // max arrow engagement range
  arrowBounces: 4,            // number of wall bounces
  arrowLife: 600,             // arrow despawn timer
  projectileStyle: 'neon_bolt', // visual style for arrows
  bulletColor: { main, core, glow }, // custom bullet colors

  shootRange: 0,              // generic ranged attack range
  shootRate: 0,               // generic ranged attack rate
  bulletSpeed: 0,             // generic bullet speed

  // Optional: summoning
  summonRate: 540,            // frames between summon attempts
  summonMax: 4,               // max summons alive at once

  // Optional: mummy-style self-destruct
  explodeRange: 140,          // explosion radius
  explodeDamage: 28,          // explosion damage
  fuseMin: 32,                // min fuse time (frames)
  fuseMax: 96,                // max fuse time (frames)

  // Optional: healer support
  healRadius: 220,            // range to heal allies
  healRate: 72,               // frames between heals
  healAmount: 10,             // HP healed per pulse

  // Optional: golem boulder
  boulderRate: 88,            // frames between boulder throws
  boulderSpeed: 9,            // boulder projectile speed
  boulderRange: 1000,         // max boulder throw range

  // Optional: per-mob physics overrides (all default to GAME_CONFIG values)
  radius: 27,                 // body-blocking collision circle (default: MOB_RADIUS=27)
  wallHW: 14,                 // wall collision AABB half-width (default: MOB_WALL_HW=14)
  hitboxR: 15,                // bullet hit-detection radius (default: 15)
  kiteRange: 160,             // ideal kiting distance for ranged AI
  boulderHitRadius: 40,       // boulder direct-hit radius

  // Optional: split mechanic (Core Guardian)
  _canSplit: true,            // splits into 2 smaller copies at 50% HP
}
```

### Floor Breakdown

#### Legacy Mobs (Cave Dungeon, Floor 0)

Direct `MOB_AI` and `MOB_SPECIALS` entries keyed by type name:

| Type | Role | Notable Mechanic |
|------|------|-----------------|
| `grunt` | Melee chaser | Basic interceptor with slight flanking |
| `runner` | Fast melee | Velocity-prediction targeting, intercepts player movement |
| `tank` | Slow brawler | High HP (375), heavy flanking angles |
| `witch` | Summoner | Kites at range, summons up to 4 skeletons |
| `skeleton` | Swarm minion | Summoned by witches, swarms in 8 formation angles |
| `golem` | Boss-tier | Boulders + stomp + summons mini golems |
| `mini_golem` | Golem minion | Smaller boulders, relentless pursuit |
| `mummy` | Suicide bomber | Arms fuse on approach, explodes for 28 damage in 140px |
| `healer` | Support | Heals nearest ally within 220px, flees player |
| `archer` | Ranged sniper | Bouncing poison arrows, maintains 350px distance |

#### Floor 1: Azurine City (Levels 1-10)

**Levels 1-4 (Gangsters & Goons):**
- `neon_pickpocket` -- runner AI, `swipe_blink`
- `cyber_mugger` -- grunt AI, `stun_baton`
- `drone_lookout` -- archer AI, `spot_mark`
- `street_chemist` -- witch AI, `gas_canister`

**Levels 6-9 (Renegade Members):**
- `renegade_bruiser` -- tank AI, `ground_pound`
- `renegade_shadowknife` -- runner AI, `cloak_backstab`
- `renegade_demo` -- grunt AI, `sticky_bomb`
- `renegade_sniper` -- archer AI, `ricochet_round`

**Level 5 Mini-Boss:** `the_don` (HP 800) -- archer AI, 4 abilities: `laser_snipe`, `tommy_burst`, `smart_mine`, `smoke_screen`

**Level 10 Boss:** `velocity` (HP 1500) -- runner AI, 4 abilities: `phase_dash`, `bullet_time_field`, `afterimage_barrage`, `summon_renegades`

#### Floor 2: Tech District / Corporate Core (Levels 11-20)

**Levels 11-14 (Tech District):**
- `circuit_thief` -- runner AI, `overload_drain`
- `arc_welder` -- grunt AI, `weld_beam`
- `battery_drone` -- runner AI, `charge_pop` (self-destruct)
- `coil_runner` -- runner AI, `tesla_trail`

**Levels 16-19 (Corporate Core):**
- `suit_enforcer` -- tank AI, `briefcase_turret`
- `compliance_officer` -- witch AI, `red_tape_lines`
- `contract_assassin` -- runner AI, `penalty_mark`
- `executive_handler` -- archer AI, `drone_swarm`

**Level 15 Mini-Boss:** `voltmaster` (HP 1000) -- witch AI, 4 abilities: `chain_lightning`, `emp_pulse`, `tesla_pillars`, `magnet_snap`

**Level 20 Boss:** `e_mortis` (HP 1800) -- archer AI, 4 abilities: `dividend_barrage`, `hostile_takeover`, `nda_field`, `golden_parachute`

#### Floor 3: Junkyard / Swamp Mutation (Levels 21-30)

**Levels 21-24 (Junkyard Scavengers):**
- `scrap_rat` -- grunt AI, `scavenge_shield`
- `magnet_scavenger` -- grunt AI, `mag_pull`
- `rust_sawman` -- runner AI, `saw_line`
- `junkyard_pyro` -- witch AI, `oil_spill_ignite`

**Levels 26-29 (Swamp Mutants):**
- `toxic_leechling` -- runner AI, `latch_drain`
- `bog_stalker` -- grunt AI, `mud_dive`
- `chem_frog` -- witch AI, `acid_spit_arc`
- `mosquito_drone` -- runner AI, `siphon_beam`

**Level 25 Mini-Boss:** `mourn` (HP 1200) -- tank AI, 4 abilities: `pile_driver`, `grab_toss`, `rebuild`, `scrap_minions`

**Level 30 Boss:** `centipede` (HP 2200) -- witch AI, 4 abilities: `spore_cloud`, `burrow_surge`, `toxic_nursery`, `regrowth`

#### Floor 4: Trap House / R.E.G.I.M.E (Levels 31-40)

**Levels 31-34 (Trap House):**
- `tripwire_tech` -- grunt AI, `tripwire`
- `gizmo_hound` -- runner AI, `seek_mine`
- `holo_jester` -- witch AI, `fake_wall`
- `time_prankster` -- runner AI, `rewind_tag`

**Levels 36-39 (R.E.G.I.M.E Bots):**
- `enforcer_drone` -- grunt AI, `suppress_cone`
- `synth_builder` -- tank AI, `barrier_build`
- `shock_trooper` -- runner AI, `rocket_dash`
- `signal_jammer` -- witch AI, `emp_dome`

**Level 35 Mini-Boss:** `game_master` (HP 1400) -- witch AI, 4 abilities: `trap_roulette`, `puzzle_lasers`, `loot_bait`, `remote_hack`

**Level 40 Boss:** `junz` (HP 2500) -- archer AI, 4 abilities: `pulse_override`, `repulsor_beam`, `nano_armor`, `drone_court`

#### Floor 5: Waste Planet / Slime Dusk (Levels 41-50)

**Levels 41-44 (Waste Planet Beasts):**
- `rabid_hyenaoid` -- runner AI, `bleed_maul`
- `spore_stag` -- tank AI, `gore_spore_burst`
- `wasteland_raptor` -- runner AI, `pounce_pin`
- `plague_batwing` -- witch AI, `screech_ring`

**Levels 46-49 (Slime/Dusk Creatures):**
- `gel_swordsman` -- grunt AI, `slime_wave_slash`
- `viscosity_mage` -- witch AI, `sticky_field`
- `core_guardian` -- tank AI, `split_response` (splits at 50% HP into 2 shards)
- `biolum_drone` -- runner AI, `glow_mark`

**Level 45 Duo Mini-Boss:** `lehvius` (HP 1900, tank AI: `symbiote_lash`, `toxic_spikes`, `adrenal_surge`) + `jackman` (HP 1500, witch AI: `absorb_barrier`, `static_orbs`, `overcharge_dump`)

**Level 50 Duo Boss:** `malric` (HP 3600, tank AI: `ooze_blade_arc`, `slime_rampart`, `melt_floor`, `summon_elite`) + `vale` (HP 2600, witch AI: `shadow_teleport`, `puppet_shot`, `abyss_grasp`, `regen_veil`)

### 11 AI Patterns (MOB_AI)

Each AI function receives `(m, ctx)` where `ctx` contains `{ player, dist, dx, dy, playerVelX, playerVelY, mapCenterX, mapCenterY, amBetween, isCrowded, mobs }`. Returns `{ targetX, targetY }`.

| Pattern | Behavior |
|---------|----------|
| `crowded` | Auto-applied when 2+ allies nearby (non-exempt types). Targets cut-off point between player and map center, with player velocity prediction and ID-based angular spread. |
| `runner` | Fast interceptor. Predicts player movement with 0.6-0.7x velocity factor. If already between player and center, heads straight. Otherwise targets cut-off point. Slight angular spread per ID. |
| `grunt` | Direct chaser with mild velocity prediction (0.3x factor) and slight ID-based flanking angle. |
| `tank` | Similar to grunt but with stronger velocity prediction (0.5x) and wider flanking angles per ID. |
| `witch` | Kiting AI. Approaches if far, retreats if too close (<50% of kiteRange), circles at ideal distance. Uses perpendicular strafing at ideal range. Default kiteRange: 160px. |
| `mummy` | Direct chaser with 0.5x velocity prediction and moderate angular spread. Closes distance to trigger self-destruct. |
| `skeleton` | Swarm formation. 8 mobs form a ring around player at 40px radius, each at a fixed angle based on ID. |
| `golem` | Relentless pursuit with capped velocity prediction (0.4x, max 60px). No flanking -- walks straight at player. |
| `mini_golem` | Same as golem but slightly less predictive (0.3x, max 40px). |
| `healer` | Prioritizes fleeing player if within 160px. Otherwise positions behind nearest non-healer/non-skeleton ally at 60px offset. Retreats if < idealDist (300px). |
| `archer` | Maintains 350px ideal distance. Retreats hard if < 180px. Circle-strafes at ideal range. Approaches with velocity prediction if too far (>490px). |

**Dispatch priority:**
1. If crowded (2+ allies nearby) and type not in `CROWD_EXEMPT_TYPES` and dist > 60 --> use `crowded` AI
2. Else look up `MOB_AI[m.type]` first (legacy mobs), then `MOB_AI[m.ai]` (Floor 1+ mobs with `ai` field)
3. Result passed through `sanitizeAITarget()` to prevent wall-backing

### AI Dispatch Flow in `mobSystem.js`

The per-mob-per-frame flow in `updateMobs()` is a 10-step pipeline:

1. **Mob separation** -- Push overlapping mobs apart (body-blocking). Uses `MOB_RADIUS * 2` as minimum separation distance. For exact overlaps, tries 8 random angles.

2. **Freeze/status check** -- If `_mobsFrozen`, set speed to 0 and skip. Tick all status effects via `StatusFX.tickMob(m)`. If result has `skip: true` (stagger/stun/root), skip this mob's movement.

3. **Distance calculation** -- Compute `dx`, `dy`, `dist` from mob to player.

4. **AI targeting** -- Crowding detection (count allies within `MOB_CROWD_RADIUS`). Dispatch to appropriate `MOB_AI` function. Sanitize result against walls.

5. **Speed calculation** -- Cap effective speed based on player base speed (runners: 1.1x, others: 0.85x). Apply frost slow multiplier from status effects.

6. **Pathfinding** -- Line-of-sight check by sampling tiles along the direct path. If any tile is solid, use BFS pathfinding. BFS cache refreshes every 12 frames (5 frames if near a wall). If BFS fails (600-tile cap), fall back to best-direction neighbor search.

7. **Movement application** -- AABB tile collision with independent X/Y axis testing. If blocked on one axis, try sliding along the other with a 1.5px nudge. If blocked on both, try half-speed on each axis independently.

8. **Wall repulsion** -- If mob overlaps a wall after movement, sample 8 directions to find open space and push outward at 2.5px/frame. If still stuck, spiral-search for nearest clear tile.

9. **Stuck detection** -- If mob hasn't moved > 2px in 90 frames (~1.5s), teleport to nearest clear tile (spiral search radius 1-3 tiles).

10. **Animation** -- Frame counter advances proportional to effective speed: `m.frame = (m.frame + 0.015 * effSpeed + 0.01) % 4`.

After movement, the system handles:
- **Ranged attacks** (shooters): fire bullets at player if within range and cooldown expired
- **MOB_SPECIALS dispatch**: legacy mobs by type key, Floor 1+ mobs by `_specials` array
- **Contact damage**: if player within `contactRange` and `contactCooldown === 0`, deal damage

### BFS Pathfinding

- **8-directional** (cardinal + diagonal)
- **Diagonal validation**: both adjacent cardinal tiles must be clear (prevents corner-cutting through walls)
- **600-tile exploration cap** (default, overridable via `maxExplore` param)
- **Early termination**: accepts tiles adjacent to target (within 1 tile in any direction)
- **Cached per mob**: stored in `m._pathCache`, refreshed every 12 frames (5 if near wall) or when target tile changes
- **BFS failure fallback**: best-direction neighbor search using dot-product with target direction

### Key Helper Functions

| Function | Purpose |
|----------|---------|
| `positionClear(px, py, hw)` | Tests 4 AABB corners against `isSolid()`. Default `hw = GAME_CONFIG.POS_HW` for spawning, pass `MOB_WALL_HW` for movement. |
| `bfsPath(sx, sy, ex, ey, maxExplore)` | Returns array of `{x,y}` tile coords from start to end, or null if no path within budget. |
| `clampDashTarget(startX, startY, dir, maxDist)` | Binary search (8 iterations) for farthest wall-clear position along a direction. Used by dash/teleport abilities. |
| `findClearPosition(targetX, targetY, fallbackX, fallbackY)` | Tries target, then 8 compass offsets at 1-tile distance, then fallback. For teleport/spawn validation. |
| `sanitizeAITarget(m, targetX, targetY)` | 1-tile wall check in target direction. If blocked, tries perpendicular slide (both directions). Cost: 1-3 `positionClear` calls. |

### MOB_SPECIALS: All ~60 Abilities by Floor

**Legacy mobs (keyed by type name in MOB_SPECIALS):**

| Key | Mob | Mechanic |
|-----|-----|----------|
| `witch` | Witch | Summon up to 4 skeletons (40-frame cast, `summonRate` cooldown) |
| `golem` | Golem | Boulder throw at range, ground stomp + knockback up close, summon mini golems |
| `mini_golem` | Mini Golem | Smaller boulders (140-frame rate, 500px range) |
| `archer` | Archer | Bouncing poison arrows (4 bounces, 600-frame life, 80-frame rate) |
| `healer` | Healer | Heal nearest ally within 220px for 10 HP, visual heal beam |
| `mummy` | Mummy | Arm fuse on approach, explode for 28 damage in 140px radius |

**Floor 1: Azurine City:**
`swipe_blink`, `stun_baton`, `spot_mark`, `gas_canister`, `ground_pound`, `cloak_backstab`, `sticky_bomb`, `ricochet_round`, `laser_snipe`, `tommy_burst`, `smart_mine`, `smoke_screen`, `phase_dash`, `bullet_time_field`, `afterimage_barrage`, `summon_renegades`

**Floor 2: Tech District / Corporate Core:**
`overload_drain`, `weld_beam`, `charge_pop`, `tesla_trail`, `chain_lightning`, `emp_pulse`, `tesla_pillars`, `magnet_snap`, `briefcase_turret`, `red_tape_lines`, `penalty_mark`, `drone_swarm`, `dividend_barrage`, `hostile_takeover`, `nda_field`, `golden_parachute`

**Floor 3: Junkyard / Swamp:**
`scavenge_shield`, `mag_pull`, `saw_line`, `oil_spill_ignite`, `pile_driver`, `grab_toss`, `rebuild`, `scrap_minions`, `latch_drain`, `mud_dive`, `acid_spit_arc`, `siphon_beam`, `spore_cloud`, `burrow_surge`, `toxic_nursery`, `regrowth`

**Floor 4: Trap House / R.E.G.I.M.E:**
`tripwire`, `seek_mine`, `fake_wall`, `rewind_tag`, `trap_roulette`, `puzzle_lasers`, `loot_bait`, `remote_hack`, `suppress_cone`, `barrier_build`, `rocket_dash`, `emp_dome`, `pulse_override`, `repulsor_beam`, `nano_armor`, `drone_court`

**Floor 5: Waste Planet / Slime Dusk:**
`bleed_maul`, `gore_spore_burst`, `pounce_pin`, `screech_ring`, `symbiote_lash`, `toxic_spikes`, `adrenal_surge`, `absorb_barrier`, `static_orbs`, `overcharge_dump`, `slime_wave_slash`, `sticky_field`, `split_response`, `glow_mark`, `ooze_blade_arc`, `slime_rampart`, `melt_floor`, `summon_elite`, `shadow_teleport`, `puppet_shot`, `abyss_grasp`, `regen_veil`

### Multi-Ability Boss System

Bosses and mini-bosses have multiple abilities in their `_specials` array. The dispatch system works differently based on count:

**Single-special mobs** (most regular mobs): The named handler is called every frame with internal cooldown management.

**Multi-special bosses** (4+ abilities): Round-robin ability rotation:
1. `m._specialTimer` counts down from `specialCD` (per-boss, typically 360-720 frames)
2. When timer expires, the next ability in the `_specials` array is selected (`m._abilityIndex` cycles)
3. The ability handler is called, setting `m._activeAbility` during execution
4. After the ability completes, the timer resets and the index advances

**Persistent entity ticking:** Some abilities spawn persistent objects (mines, turrets, pillars, drones, oil puddles). These are ticked every frame regardless of which ability is currently active. All are tracked in `MOB_ENTITY_ARRAYS` for cleanup on death/floor transition.

## Connections to Other Systems

- **Wave system** (`waveSystem.js`) -- spawns mobs by type/count per wave, applies HP/speed/damage multipliers
- **Damage system** (`damageSystem.js`) -- `dealDamageToMob()`, `dealDamageToPlayer()`, `processKill()`
- **Combat system** (`combatSystem.js`) -- `StatusFX` for effect ticking, `MOB_AI` + `MOB_SPECIALS` registries
- **Gun system** (`gunSystem.js`) -- bullet creation, death effects, ambient mob particles
- **Entity renderers** (`entityRenderers.js`) -- `ENTITY_RENDERERS` for visual rendering of each mob type
- **Telegraph/Hazard systems** -- visual indicators for boss telegraphs and floor hazards

## Gotchas & Rules

- **Adding a new mob requires entries in multiple registries:** define in `MOB_TYPES`, add AI pattern or set `ai` field, add specials to `MOB_SPECIALS`, add renderer entry if custom visuals, add cap in `MOB_CAPS`, add to `CROWD_EXEMPT_TYPES` if ranged/special.
- **`MOB_CAPS` is per-type per-wave**, not global. Having 12 grunts and 8 runners simultaneously is valid.
- **Speed capping is relative to player base speed.** Runners are capped at 1.1x `PLAYER_BASE_SPEED`, all others at 0.85x. This prevents mobs from being uncatchable or trivially outrunnable regardless of wave multipliers.
- **BFS failure is common on large maps.** The 600-tile cap means mobs on the opposite side of a complex maze may not find a path. The fallback (best-direction neighbor) keeps them moving instead of standing still.
- **`_specials` array vs `MOB_SPECIALS[type]`**: Legacy mobs (grunt, witch, golem, etc.) are dispatched by type name directly. Floor 1+ mobs use the `_specials` array of ability names. Both coexist in the same dispatch block.
- **Mob entity sub-arrays must be cleaned up.** `MOB_ENTITY_ARRAYS` lists all possible sub-arrays (`_bombs`, `_mines`, `_turrets`, etc.). `resetCombatState()` iterates these and clears them before zeroing the mobs array, preventing orphaned references.
- **Skeleton kill source is `"witch_skeleton"`** -- this gives only flat 1 HP heal and 0 gold, by design. Golem mini-golem deaths also use this source.
- **`positionClear` has two half-width modes.** Default `POS_HW` is used for spawn validation (larger). Pass `MOB_WALL_HW` explicitly for movement collision checks (tighter).
