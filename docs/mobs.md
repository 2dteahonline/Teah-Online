# Mobs

## Overview

Mobs are the enemy combatants in Teah Online's dungeon system. They are defined data-first in `MOB_TYPES` (209 entries), with AI movement patterns in `MOB_AI` (13 patterns), special attacks in `MOB_SPECIALS` (435 unique abilities across 9 files), and per-frame logic in `updateMobs()`. The system supports legacy mobs (Floor 0 cave dungeon), 6 dungeons (Azurine, Vortalis, Earth-205, Wagashi, Earth-216, plus the legacy cave) with 4 mob types per subfloor, mini-bosses, and final bosses -- including duo boss fights. Mobs use BFS pathfinding, body-blocking separation, AABB wall collision with wall-sliding, and a stuck-detection safety net.

## Files

- `js/shared/mobTypes.js` -- `MOB_TYPES` registry (209 mob stat definitions), `MOB_CAPS`, `CROWD_EXEMPT_TYPES` (~80 types), `MOB_ENTITY_ARRAYS` (18+ sub-array keys)
- `js/authority/combatSystem.js` -- `StatusFX`, `MOB_AI` (13 movement patterns), `MOB_SPECIALS` (91 base + cave/azurine/tech/junkyard/traphouse/waste ability handlers)
- `js/authority/vortalisSpecials.js` -- 106 Vortalis dungeon ability handlers
- `js/authority/earth205Specials.js` -- 98 Earth-205 dungeon ability handlers
- `js/authority/wagashiSpecials.js` / `wagashiSpecials2.js` / `wagashiSpecials3.js` -- 70 Wagashi dungeon ability handlers (split across 3 files for size)
- `js/authority/earth216Specials.js` / `earth216Specials2.js` / `earth216Specials3.js` -- 70 Earth-216 dungeon ability handlers (split across 3 files for size)
- `js/authority/mobSystem.js` -- `updateMobs()` main loop, `positionClear()`, `bfsPath()`, mob separation, collision, contact damage, special dispatch, `stillActive`/`isMultiFrame` tracking

## Key Functions & Globals

| Symbol | Purpose |
|--------|---------|
| `MOB_TYPES` | Registry of all 209 mob definitions (stats, AI type, specials, per-type physics) |
| `MOB_CAPS` | Per-type max count per wave (generic 2-12, dungeon regular 3-8, all bosses: 1) |
| `CROWD_EXEMPT_TYPES` | Set of ~80 types that skip crowded-AI override (ranged/special mobs) |
| `MOB_AI` | Registry of 13 movement targeting functions |
| `MOB_SPECIALS` | Registry of 435 special ability update functions (across 9 files) |
| `MOB_ENTITY_ARRAYS` | List of 18+ sub-array keys on mobs (`_bombs`, `_mines`, `_turrets`, etc.) for cleanup |
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
  speed: 3.8,                 // base movement speed in px/frame
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
  radius: 23,                 // body-blocking collision circle (default: MOB_RADIUS=23)
  wallHW: 14,                 // wall collision AABB half-width (default: MOB_WALL_HW=14)
  hitboxR: 15,                // bullet hit-detection radius (default: 15)
  kiteRange: 160,             // ideal kiting distance for ranged AI
  boulderHitRadius: 40,       // boulder direct-hit radius

  // Optional: split mechanic (Core Guardian)
  _canSplit: true,            // splits into 2 smaller copies at 50% HP

  // Optional: special passive flags (see Special Mob Flags section below)
  _frontalShield: true,       // blocks frontal bullets (ironclad_marine, coral_crusher)
  _damageReduction: 0.2,      // flat damage reduction multiplier (puppedrill 0.2, sackhead 0.25)
  _lethalEfficiency: true,    // enhanced kill mechanics (mr_schwallie)
  _showMustGoOn: true,        // +30% speed below 30% HP (major_phantom)
  _backstabber: true,         // bonus damage from behind (lady_red)
  _intimidatingPresence: true,// +15% damage buff to nearby allies every 60 frames (the_boss_e205)
  _poisonImmune: true,        // immune to poison status (lady_elixir)
  _contactDamageAura: { range: 45, dmg: 8 }, // passive DoT aura every 30 frames (nofaux)
  _deathExplosion: { radius: 120, dmg: 60 }, // explodes on death (nofaux)
}
```

### Special Mob Flags

Certain mobs have passive flags that modify combat behavior beyond standard stats:

| Flag | Mobs | Effect |
|------|------|--------|
| `_frontalShield` | ironclad_marine, coral_crusher | Blocks bullets hitting from the front |
| `_canSplit` | core_guardian | Splits into 2 smaller copies at 50% HP |
| `_damageReduction` | puppedrill (0.2), sackhead (0.25) | Flat damage reduction multiplier |
| `_lethalEfficiency` | mr_schwallie | Enhanced kill mechanics |
| `_showMustGoOn` | major_phantom | +30% speed when below 30% HP |
| `_backstabber` | lady_red | Bonus damage from behind |
| `_intimidatingPresence` | the_boss_e205 | +15% damage buff to nearby allies every 60 frames |
| `_poisonImmune` | lady_elixir | Immune to poison status effects |
| `_contactDamageAura` | nofaux | Passive DoT aura (range 45px, 8 dmg) every 30 frames |
| `_deathExplosion` | nofaux | Explodes on death (radius 120px, 60 dmg) |
| `speed: 0` + `ai: 'stationary'` | trench_tentacle, human_statue, dustcore_totem | Immobile turret-style mobs |

### Floor Breakdown

#### Legacy Mobs (Cave Dungeon, 10 types)

Direct `MOB_AI` and `MOB_SPECIALS` entries keyed by type name:

| Type | Role | Notable Mechanic |
|------|------|-----------------|
| `grunt` | Melee chaser | HP 106, spd 3.8, dmg 18. Basic interceptor with slight flanking |
| `runner` | Fast melee | HP 50, spd 4.6, dmg 10. Velocity-prediction targeting, intercepts player movement |
| `tank` | Slow brawler | HP 375, spd 3.4, dmg 20. Heavy flanking angles |
| `witch` | Summoner | HP 188, spd 1.8, dmg 6. Kites at range, summons up to 4 skeletons (summonRate 540) |
| `skeleton` | Swarm minion | HP 38, spd 3.8, dmg 8. Summoned by witches, swarms in 8 formation angles |
| `golem` | Boss-tier | HP 1000, spd 1.5, dmg 13. Boulders (rate 88) + stomp + summons mini golems |
| `mini_golem` | Golem minion | HP 120, spd 1.9, dmg 6. Smaller boulders, relentless pursuit |
| `mummy` | Suicide bomber | HP 56, spd 3.4, dmg 0. Arms fuse on approach, explodes for 28 damage in 140px |
| `archer` | Ranged sniper | HP 75, spd 2.9, dmg 6. Bouncing poison arrows (4 bounces, rate 80), maintains 350px distance |
| `healer` | Support | HP 81, spd 2.1, dmg 5. Heals nearest ally within 220px for 10 HP (rate 72), flees player |

#### Azurine City (50 mobs, 10 bosses, Levels 1-50)

**Floor 1: Gangsters & Goons / Renegade (Levels 1-10)**

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

**Floor 2: Tech District / Corporate Core (Levels 11-20)**

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

**Floor 3: Junkyard / Swamp Mutation (Levels 21-30)**

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

**Floor 4: Trap House / R.E.G.I.M.E (Levels 31-40)**

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

**Floor 5: Waste Planet / Slime Dusk (Levels 41-50)**

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

#### Vortalis Dungeon (50 mobs, 10 bosses, 106 unique specials)

5 floors of pirate/ocean-themed mobs. Specials defined in `js/authority/vortalisSpecials.js`. Each floor has 2 bosses (duo encounters).

| Floor | Theme | Bosses | Abilities |
|-------|-------|--------|-----------|
| 1 | Pirate / Naval | Captain Husa (5), Admiral Von Kael (5) | flintlock_volley, cutlass_cleave, naval_artillery, spectral_chain_binding, etc. |
| 2 | Jungle / Blood | Zongo (5), Bloodborne Marlon (6) | spear_barrage, vine_snare, chain_grapple, crimson_cleave, demonic_shift, etc. |
| 3 | Werewolf / Ghost | Wolfbeard (8), Ghostbeard (8) | quick_draw, feral_slash, alpha_rampage, phantom_slash, ghost_ship, soul_drain, etc. |
| 4 | Sea Creatures / Deep-Sea | Kraken Jim (8), King Requill (8) | tentacle_grab, ink_blast, kraken_call, gilded_maelstrom, abyssal_roar, etc. |
| 5 | Merfolk / Ocean Deity | Queen Siralyth (8), Mami Wata (7) | golden_shard_volley, sovereigns_cage, leviathans_fang, wrath_of_sea, etc. |

#### Earth-205: Marble City (50 mobs, 10 bosses, 98 unique specials)

5 floors of urban/gangster-themed mobs. Specials defined in `js/authority/earth205Specials.js`. Each floor has 2 bosses.

| Floor | Theme | Bosses | Abilities |
|-------|-------|--------|-----------|
| 1 | Back Alleys | Willis (7), Puppedrill (6) | jury_rigged_taser, chemical_flask, master_plan, crowbar_hook, brutal_beatdown, etc. |
| 2 | Syndicate District | Sackhead (5), Mr. Schwallie (6) | barbed_swing, bull_charge, batter_up, cigar_flick, one_man_army, etc. |
| 3 | Carnival of Dread | Killer Mime (5), Major Phantom (5) | finger_gun, invisible_wall, trapped_in_box, overture_slash, grand_finale, etc. |
| 4 | Casino / Mob HQ | Lady Red (5), The Boss (5) | concealed_stiletto, toxic_perfume, checkmate, gold_ring_hook, the_hit, etc. |
| 5 | Chemical Plant | Lady Elixir (5), Nofaux (6) | toxic_stream, maximum_overpressure, caustic_cleave, critical_meltdown, etc. |

Notable flags: Puppedrill (`_damageReduction: 0.2`), Sackhead (`_damageReduction: 0.25`), Mr. Schwallie (`_lethalEfficiency`), Major Phantom (`_showMustGoOn`), Lady Red (`_backstabber`), The Boss (`_intimidatingPresence`), Lady Elixir (`_poisonImmune`), Nofaux (`_contactDamageAura`, `_deathExplosion`).

#### Wagashi: Heavenly Realm (50 mobs, 10 bosses, 70 unique specials)

5 floors of Japanese mythology-themed mobs. Specials split across `js/authority/wagashiSpecials.js`, `wagashiSpecials2.js`, `wagashiSpecials3.js`. Each floor has a mini-boss (L5/15/25/35/45) and a boss (L10/20/30/40/50).

| Floor | Theme | Mini-Boss | Boss | Abilities |
|-------|-------|-----------|------|-----------|
| 1 | Silk Nest / Boar Territory | Sichou (3) | Tongya (3) | silk_snare, thread_shot, brood_call, titan_charge, war_stomp, boar_fury |
| 2 | Jade Temple / Ruined Sanctum | Jade Serpent (3) | Stone Golem Guardian (3) | jade_glare, serpent_swarm, jade_spires, earthbreaker_slam, boulder_hurl, stonehide |
| 3 | Storm Palace / Inferno Bastion | Azure Dragon (3) | Jaja (3) | lightning_mark, tidal_wave, cyclone_guard, inferno_crash, blazing_advance, ember_mantle |
| 4 | Execution Grounds / Void Sanctum | Gensai (3) | Moon Rabbit (3) | shadow_step, blood_crescent, demon_cleaver, gravity_well, moon_rift_orb, phase_skip |
| 5 | Devouring Maw / Unsealed Heaven | Celestial Toad (3) | Lord Sarugami (3) | devouring_pull, void_spit, corruption_mire, black_orb_sentinels, orb_bomb_command, divine_form_shift |

#### Earth-216: Sin City (50 mobs, 10 bosses, 70 unique specials)

5 floors of casino/underworld-themed mobs. Specials split across `js/authority/earth216Specials.js`, `earth216Specials2.js`, `earth216Specials3.js`. Each floor has a mini-boss (L5/15/25/35/45) and a boss (L10/20/30/40/50).

| Floor | Theme | Mini-Boss | Boss | Abilities |
|-------|-------|-----------|------|-----------|
| 1 | Crime & Casino | Victor Graves (3) | Madame Midas (3) | tribute_taken, call_collection, iron_debt, jackpot_bloom, crown_of_debt, touch_of_midas |
| 2 | Cursed Flesh / Dead Performance | Slasher (3) | Blackout Belle (3) | carnage_arm, blood_trail_dash, predator_lock, total_blackout, feedback_kiss, dead_applause |
| 3 | Spirit & Death | Macabre (3) | Rosa Calavera (3) | cemetery_call, funeral_ring, ofrenda_burst, ghost_mariachi, candle_procession, last_serenade |
| 4 | Hell Engines & Speed | Motor Demon (3) | Nitro Wraith (3) | redline_e216, hell_exhaust, geargrind_slam, nitro_line, phantom_splitstream, crash_bloom |
| 5 | Fate & Corruption | Hollow Ace (3) | Alcazar (3) | stacked_deck, cold_read_e216, house_pull, corrupt_vessel, black_benediction, unsealing_maw |

### 13 AI Patterns (MOB_AI)

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
| `stationary` | Returns mob's current position. Mob does not move. Used for turret-style mobs. |
| `hover` | Flies directly toward player, ignoring wall pathfinding. Used for flying mobs. |

**Dispatch priority:**
1. If crowded (2+ allies nearby) and type not in `CROWD_EXEMPT_TYPES` and dist > 60 --> use `crowded` AI
2. Else look up `MOB_AI[m.type]` first (legacy mobs), then `MOB_AI[m.ai]` (Floor 1+ mobs with `ai` field)
3. Result passed through `sanitizeAITarget()` to prevent wall-backing

### AI Dispatch Flow in `mobSystem.js`

The per-frame flow in `updateMobs()` is a 10-step pipeline:

1. **Global ticks** -- Decrement `contactCooldown` for all mobs (30 frames after contact hit). Tick per-entity `_phaseTimer` for boss phase transitions.

2. **Mob separation** -- Push overlapping mobs apart (body-blocking). Uses `MOB_RADIUS * 2` (`minSep`) as minimum separation distance, push factor 0.45. For exact overlaps, tries 8 random angles.

3. **Per-mob main loop** (steps 3a-3k for each mob):
   - **3a. Freeze check** -- If `_mobsFrozen`, set speed to 0 and skip.
   - **3b. Despawn timer** -- Tick despawn timers for summoned minions.
   - **3c. StatusFX tick** -- `StatusFX.tickMob(m)`. If result has `skip: true` (stagger/stun/root), skip movement.
   - **3d. Party-aware targeting** -- `PartySystem.getMobTarget(m)` via `getMobTarget()`. Sets `_currentDamageTarget`.
   - **3e. AI dispatch** -- Crowding detection, dispatch to `MOB_AI` function, sanitize against walls.
   - **3f. BFS pathfinding** -- LoS check along direct path. If blocked, use BFS (8-dir, 600-tile cap). Cache refreshes every 5-12 frames (5 if near wall, 12 otherwise). Fallback: best-direction neighbor search.
   - **3g. AABB movement with sliding** -- Independent X/Y axis testing with wall-slide. If blocked on both, try half-speed per axis.
   - **3h. Wall repulsion** -- 8-direction sampling, push at 2.5px/frame. Spiral search if still stuck.
   - **3i. Stuck detection** -- If < 2px movement in 90 frames, teleport to nearest clear tile.
   - **3j. Animation** -- `frame += speed * 0.015 + 0.01`, modulo 4.
   - **3k. Passive flag processing** -- `_showMustGoOn` (+30% speed below 30% HP), `_intimidatingPresence` (+15% dmg buff to nearby allies every 60 frames), `_contactDamageAura` (DoT every 30 frames).
   - **3l. Shooter** -- Fire bullets at target if within range and cooldown expired (60-frame mob attack cooldown).
   - **3m. MOB_SPECIALS dispatch** -- Legacy mobs by type key, Floor 1+ mobs by `_specials` array. Multi-ability rotation with `stillActive`/`isMultiFrame` tracking.

4. **Contact damage** -- Checks `PartySystem.getAliveEntities()`, dodge chance, `dealDamageToPlayer()`. Contact cooldown: 30 frames.

5. **Body blocking** -- Mob-mob and mob-player collision resolution.

6. **clampOutOfWalls** -- Nudge/spiral search to push mobs out of solid tiles.

7. **Dead mob cleanup** -- `spawnDeathEffect()`, clean all `MOB_ENTITY_ARRAYS` sub-arrays, filter dead mobs, `checkPhaseAdvance()`.

8. **Dead mob bullet cleanup** -- Remove bullets owned by dead mobs.

9. **Wave state machine transitions** -- Advance wave state based on remaining mob count.

### BFS Pathfinding

- **8-directional** (cardinal + diagonal)
- **Diagonal validation**: both adjacent cardinal tiles must be clear (prevents corner-cutting through walls)
- **600-tile exploration cap** (default, overridable via `maxExplore` param)
- **Early termination**: accepts tiles adjacent to target (within 1 tile in any direction)
- **Cached per mob**: stored in `m._pathCache`, refreshed every 5-12 frames (5 if near wall, 12 otherwise) or when target tile changes
- **BFS failure fallback**: best-direction neighbor search using dot-product with target direction

### Key Helper Functions

| Function | Purpose |
|----------|---------|
| `positionClear(px, py, hw)` | Tests 4 AABB corners against `isSolid()`. Default `hw = GAME_CONFIG.POS_HW` for spawning, pass `MOB_WALL_HW` for movement. |
| `bfsPath(sx, sy, ex, ey, maxExplore)` | Returns array of `{x,y}` tile coords from start to end, or null if no path within budget. |
| `clampDashTarget(startX, startY, dir, maxDist)` | Binary search (8 iterations) for farthest wall-clear position along a direction. Used by dash/teleport abilities. |
| `findClearPosition(targetX, targetY, fallbackX, fallbackY)` | Tries target, then 8 compass offsets at 1-tile distance, then fallback. For teleport/spawn validation. |
| `sanitizeAITarget(m, targetX, targetY)` | 1-tile wall check in target direction. If blocked, tries perpendicular slide (both directions). Cost: 1-3 `positionClear` calls. |

### MOB_SPECIALS: 435 Abilities Across 9 Files

**Specials file organization:**

| File | Count | Dungeon / Content |
|------|-------|-------------------|
| `combatSystem.js` | 91 | Cave legacy + Azurine + Tech/Corporate + Junkyard/Swamp + Trap House/REGIME + Waste/Slime |
| `vortalisSpecials.js` | 106 | Vortalis (pirate/ocean) |
| `earth205Specials.js` | 98 | Earth-205: Marble City (urban/gangster) |
| `wagashiSpecials.js` | 28 | Wagashi floors 1-2 (feudal Japan) |
| `wagashiSpecials2.js` | 28 | Wagashi floors 3-4 (samurai/elemental) |
| `wagashiSpecials3.js` | 14 | Wagashi floor 5 (void/corruption boss) |
| `earth216Specials.js` | 28 | Earth-216 floors 1-2 (casino/underworld) |
| `earth216Specials2.js` | 28 | Earth-216 floors 3-4 (Day of Dead/racing) |
| `earth216Specials3.js` | 14 | Earth-216 floor 5 (occult boss) |

**Legacy mobs (keyed by type name in MOB_SPECIALS):**

| Key | Mob | Mechanic |
|-----|-----|----------|
| `witch` | Witch | Summon up to 4 skeletons (40-frame cast, `summonRate` cooldown) |
| `golem` | Golem | Boulder throw at range, ground stomp + knockback up close, summon mini golems |
| `mini_golem` | Mini Golem | Smaller boulders (140-frame rate, 500px range) |
| `archer` | Archer | Bouncing poison arrows (4 bounces, 600-frame life, 80-frame rate) |
| `healer` | Healer | Heal nearest ally within 220px for 10 HP, visual heal beam |
| `mummy` | Mummy | Arm fuse on approach, explode for 28 damage in 140px radius |

### Multi-Ability Boss System

Bosses and mini-bosses have multiple abilities in their `_specials` array. The dispatch system works differently based on count:

**Single-special mobs** (most regular mobs): The named handler is called every frame with internal cooldown management.

**Multi-special bosses** (4+ abilities): Round-robin ability rotation with per-ability cooldowns:
1. Each ability has its own cooldown tracked in `m._abilityCDs` (initialized to random 120-240 frames)
2. All cooldowns tick down every frame
3. When no ability is active, the system scans from `m._abilityIndex` for the next ready ability
4. When found, the handler fires, its CD resets to `m._specialCD`, and the index advances
5. The ability handler sets `m._activeAbility` during execution

### stillActive / isMultiFrame System (CRITICAL)

Multi-frame abilities (dashes, telegraphs, channeled attacks) need two flag checks in `mobSystem.js`:

1. **`stillActive`** -- Checked every frame while `m._activeAbility` is set. A massive boolean OR of all possible "ability in progress" flags (telegraph timers > 0, dash flags, firing flags, etc.). If false, `m._activeAbility` is cleared so the boss can start its next ability.

2. **`isMultiFrame`** -- Checked immediately after a new ability fires. Same boolean OR list. If true, sets `m._activeAbility = abilKey` to lock the boss into that ability until it completes.

**Why this is critical:** If a new boss ability's flags are missing from both lists, the ability will fire but `_activeAbility` won't be set. The boss will immediately try to fire another ability next frame, causing broken behavior -- abilities overlapping, animations cutting short, or the boss doing nothing. Every new dungeon MUST update BOTH lists with ALL new boss flags.

The lists are duplicated (same checks in both `stillActive` and `isMultiFrame` blocks) and organized by dungeon with comments. Currently covers flags for all 6 dungeons: Cave/Azurine/Tech/Junkyard/Trap House/Waste (base), Vortalis, Earth-205, Wagashi, and Earth-216.

### Summoned Mob Rules

Mobs that summon other mobs (e.g. Victor Graves' thugs, Macabre's skeletons) must follow these rules:

1. **Summoned mobs need `ai: 'grunt'`** in their `MOB_TYPES` entry. Without an `ai` field, the dispatch system won't find a movement pattern and the mob will stand still.

2. **Despawn timers must tick in the global `updateMobs()` loop**, not inside the summoning ability handler. The `_despawnTimer` is decremented at the top of the mob loop (before status effects) so it runs every frame regardless of which ability is active.

3. Summoned mobs inherit wave scaling (HP/speed/damage multipliers) from `createMob()` at spawn time.

### Persistent Entity Ticking

Some abilities spawn persistent objects (mines, turrets, pillars, drones, oil puddles, orb sentinels). These are stored in mob sub-arrays (`m._mines`, `m._turrets`, `m._pillars`, etc.) and must be ticked every frame regardless of which ability the boss is currently executing. The specials dispatch system handles this by calling every handler in `_specials` when `m._activeAbility` is set -- the active ability does its work while other handlers just tick their persistent entities. All persistent arrays are tracked in `MOB_ENTITY_ARRAYS` for cleanup on death/floor transition.

## Connections to Other Systems

- **Wave system** (`waveSystem.js`) -- spawns mobs by type/count per wave, applies HP/speed/damage multipliers
- **Damage system** (`damageSystem.js`) -- `dealDamageToMob()`, `dealDamageToPlayer()`, `processKill()`; handles shields, frontal shields, counter stance, damage reduction
- **Combat system** (`combatSystem.js`) -- `StatusFX` for effect ticking, `MOB_AI` + `MOB_SPECIALS` registries
- **Party system** (`partySystem.js`) -- `PartySystem.getMobTarget()` for party-aware targeting, mob count/HP scaling
- **Gun system** (`gunSystem.js`) -- bullet creation, death effects, ambient mob particles
- **Entity renderers** (`entityRenderers.js`) -- `ENTITY_RENDERERS` for visual rendering of each mob type
- **Telegraph/Hazard systems** -- visual indicators for boss telegraphs and floor hazards

## Gotchas & Rules

- **Adding a new mob requires entries in multiple registries:** define in `MOB_TYPES`, add AI pattern or set `ai` field, add specials to `MOB_SPECIALS`, add renderer entry if custom visuals, add cap in `MOB_CAPS`, add to `CROWD_EXEMPT_TYPES` if ranged/special.
- **Adding a new dungeon boss requires updating `stillActive` AND `isMultiFrame`** in `mobSystem.js` with ALL new boss flags. Missing flags = broken boss behavior.
- **Summoned mobs need `ai: 'grunt'`** and their `_despawnTimer` must tick in the global `updateMobs()` loop, not inside the ability handler.
- **`MOB_CAPS` is per-type per-wave**, not global. Generic mobs cap at 2-12, dungeon regulars at 3-8, all bosses at 1.
- **Speed capping is relative to player base speed.** Runners are capped at 1.1x `PLAYER_BASE_SPEED`, all others at 0.85x. This prevents mobs from being uncatchable or trivially outrunnable regardless of wave multipliers.
- **Contact cooldown is 30 frames** after a contact hit. **Mob attack cooldown is 60 frames** between ranged shots.
- **BFS failure is common on large maps.** The 600-tile cap means mobs on the opposite side of a complex maze may not find a path. The fallback (best-direction neighbor) keeps them moving instead of standing still.
- **`_specials` array vs `MOB_SPECIALS[type]`**: Legacy mobs (grunt, witch, golem, etc.) are dispatched by type name directly. Floor 1+ mobs use the `_specials` array of ability names. Both coexist in the same dispatch block.
- **Mob entity sub-arrays must be cleaned up.** `MOB_ENTITY_ARRAYS` lists all possible sub-arrays (`_bombs`, `_mines`, `_turrets`, etc.). `resetCombatState()` iterates these and clears them before zeroing the mobs array, preventing orphaned references.
- **Skeleton kill source is `"witch_skeleton"`** -- this gives only flat 1 HP heal and 0 gold, by design. Golem mini-golem deaths also use this source.
- **`positionClear` has two half-width modes.** Default `POS_HW` is used for spawn validation (larger). Pass `MOB_WALL_HW` explicitly for movement collision checks (tighter).
- **Specials files are split for size.** Wagashi and Earth-216 each use 3 files because a single file would exceed reasonable sizes. All files append to the global `MOB_SPECIALS` object via `MOB_SPECIALS.xxx = function(m, ctx) { ... }` syntax.
