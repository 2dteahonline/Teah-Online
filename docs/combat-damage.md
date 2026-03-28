# Combat and Damage

## Overview

Combat in Teah Online revolves around three weapon classes (guns, melee, potions) and a centralized damage pipeline that handles armor reduction, status effects, lifesteal, kill rewards, and visual hit effects. Guns fire projectile bullets with per-gun stats. Melee weapons (4 types) have unique specials and ultimates. The damage system tracks 13 player-targeted status effects and 7 mob-targeted status effects. A registry of 73 hit effect renderers provides visual feedback for every combat interaction. Party-aware damage routing lets mobs target and deal damage to any party member via `_currentDamageTarget`.

## Files

- `js/core/gunSystem.js` -- Gun firing, reloading, bullet spawning, CT-X stat sliders, death effects, mob ambient particles
- `js/core/meleeSystem.js` -- Melee swing, dash, specials (ninja/storm/piercing), ultimates (Malevolent Shrine, Godspeed)
- `js/authority/damageSystem.js` -- `dealDamageToMob()`, `dealDamageToPlayer()`, `processKill()`, `GUN_BEHAVIORS` registry, kill event subscribers
- `js/authority/combatSystem.js` -- `StatusFX` system (mob + player effects), `MOB_AI` (13 patterns), `MOB_SPECIALS` (91 abilities in this file)
- `js/authority/vortalisSpecials.js` -- 106 Vortalis dungeon ability handlers
- `js/authority/earth205Specials.js` -- 98 Earth-205 dungeon ability handlers
- `js/authority/wagashiSpecials.js` / `wagashiSpecials2.js` / `wagashiSpecials3.js` -- 70 Wagashi dungeon ability handlers
- `js/authority/earth216Specials.js` / `earth216Specials2.js` / `earth216Specials3.js` -- 70 Earth-216 dungeon ability handlers
- `js/shared/gunData.js` -- `MAIN_GUNS` definitions (5 progression guns), stat interpolation, upgrade recipes
- `js/client/rendering/hitEffects.js` -- `HIT_EFFECT_RENDERERS` registry (73 visual effect types)

## Key Functions & Globals

| Symbol | Purpose |
|--------|---------|
| `shoot()` | Creates bullets from the player's gun muzzle, handles ammo/reload |
| `updateGun()` | Ticks cooldowns, continuous fire check, routes to `shoot()` or `meleeSwing()` |
| `meleeSwing()` | Melee attack with arc detection, knockback, special effects per weapon type |
| `dealDamageToMob(mob, amount, source)` | Subtract HP, handle shields/frontal shields/counter stance/invulnerability/damage reduction, split mechanic, call `processKill()` on death. Returns true if mob died. |
| `dealDamageToPlayer(rawDmg, source, attacker, targetEntity)` | Apply armor/proj reduction, thorns, death check. Routes to correct party member via `targetEntity` or `_currentDamageTarget`. Returns final damage dealt. |
| `processKill(mob, source)` | Awards gold, XP, kill heal (with source multiplier), ammo refill, emits `mob_killed` event |
| `calcLifesteal(dmg)` | Returns `Math.min(Math.round(dmg * 0.15), 20)` -- 15% of damage, capped at 20 HP |
| `StatusFX` | Central status effect manager with mob registry (tick/apply per effect) and player effects |
| `GUN_BEHAVIORS` | Data-driven gun special effects (frost, burn), dispatched on hit and kill |
| `getFireRate()` | Returns fire cooldown in frames based on equipped gun or CT-X slider |
| `getFreezeDuration()` | Post-shot movement freeze duration |
| `getFreezePenalty()` | Speed reduction multiplier during freeze |
| `getGunStatsAtLevel(gunId, level)` | Linearly interpolates gun stats between `base` (L1) and `max` (L25) |
| `_currentDamageTarget` | Global reference set per-mob-per-frame by `PartySystem.getMobTarget()`, used by `dealDamageToPlayer` and `StatusFX` calls in specials |

## How It Works

### Gun System

**Firing flow:**
1. `updateGun()` checks `InputIntent.shootHeld` every frame
2. If `activeSlot === 0` (gun slot), calls `shoot()`
3. `shoot()` checks ammo, cooldown, then creates bullet(s) at `getMuzzlePos(aimDir)`
4. Bullet velocity set by aim direction (4-directional: up/down/left/right)
5. Post-shot: `freezeTimer` set (movement penalty), `gun.fireCooldown` set, `gun.recoilTimer` set
6. If ammo hits 0, auto-reload begins

**Bullet types:**
- **Standard** -- single bullet, straight line
- **Shotgun** (pellets > 0) -- N pellets in a cone spread
- **SMG spread** (spread > 0, pellets = 0) -- single bullet with random angular offset
- **Piercing** (pierce: true) -- passes through mobs, tracks hitMobs[] to avoid double-hit
- **Arrow** (isArrow: true) -- visual flag for bow projectiles

**CT-X Weapon Config:**
The CT-X gun has 3 sliders (Freeze, RoF, Spread) adjustable via `/mg` command. Sliders use piecewise scaling -- e.g., RoF below 50 gives +0.075s/10, above 50 gives -0.025s/10.

**Main Guns (Progression):**
5 permanent guns bought from the Gunsmith, leveled 1-25 per tier:

| Gun | Category | Dmg | FR | Mag | Reload | Special |
|-----|----------|-----|-----|-----|--------|---------|
| Storm AR | Assault Rifle | 25-85 | 6-3 | 32-55 | 50-30 | Fast full-auto, reliable |
| Heavy AR | Assault Rifle | 45-140 | 12-7 | 24-40 | 60-35 | Slow, high damage |
| Boomstick | Shotgun | 18-45 | 20-14 | 6-12 | 70-45 | 3-5 pellets, 15-12 spread, maxRange 200 |
| Ironwood Bow | Bow | 60-200 | 18-10 | 12-20 | 90-50 | 1-3 pierce |
| Volt-9 | SMG | 12-35 | 3-2 | 50-80 | 55-30 | 8-5 spread |

Stats shown as base(L1)-max(L25). Interpolated linearly: `stat(level) = Math.round(base + (max - base) * (level - 1) / 24)`

### Melee System

**4 melee weapon types:**

| Weapon | Special | Ultimate | Mechanic |
|--------|---------|----------|----------|
| Sword | `'default'` | _(none)_ | Basic swing with knockback |
| Ninja Katanas | `'ninja'` | _(none)_ | Dual crossing slashes, AOE splash to nearby mobs, 3-dash chain (14f duration, 21.85 speed, 240f cooldown, 6f gap between dashes), lifesteal on hit |
| Storm Blade | `'storm'` | Godspeed | Ground slam AoE (range 130, dmg*0.8, 60f stun, 45f CD), chain lightning (dmg*0.5, 3 targets, 160px range), lifesteal on all hits |
| War Cleaver | `'piercing'` | Malevolent Shrine | Bleed DoT (dmg*0.3 over 180f, tick every 30f), execute (<25% HP = 2x damage), piercing blood slash arcs, lifesteal on hit |

**Melee swing flow:**
1. `meleeSwing()` checks cooldown, sets swing direction from aim
2. Iterates all mobs in range, checks arc (or 360 for cleave)
3. Calculates crit (20% base chance, 2x multiplier)
4. Applies damage via `dealDamageToMob(m, dmg, "melee")`
5. Applies weapon-specific effects (splash, shockwave, chain lightning)
6. Applies knockback

**Dash mechanics:** `clampDashTarget` uses binary search (8 iterations) for wall collision. Dash gap of 6 frames between chain dashes.

**Ultimates:**
- **Malevolent Shrine** (War Cleaver): 10 kill charges, 3-second duration, slashes every 4 frames (45 total) within 150px range
- **Godspeed** (Storm Blade): 10 kill charges, 5-second duration, lightning strikes every 8 frames within 180px range

**Lifesteal:** Kill heal uses `baseHeal` from `MOB_TYPES.killHeal` (default 5). Applied on melee direct hits, splash damage, shockwave, and chain lightning for ninja/storm/piercing weapons.

### Damage Pipeline

#### Damage to Mobs: `dealDamageToMob(mob, amount, source, attackerEntity)`

1. **Poison immune** (`mob._poisonImmune`): if true and source is poison/DOT, return false
2. Check `mob._invulnerable` (mud_dive, nano_armor) -- if true, return false
3. **Shield absorb** (`mob._shieldHp`): if `_shielded` and `_shieldHp > 0`, damage hits shield first, remainder passes through
4. **Frontal shield** (`mob._frontalShield`): negate damage from within 60-degree arc of mob's facing direction
5. **Counter stance** (`mob._counterStance`): melee attacks are reflected back to the attacker via `dealDamageToPlayer`
6. **Passive damage reduction** (`mob._damageReduction`): percentage-based reduction (e.g. 0.3 = 30% less damage, min 1)
7. Subtract HP
8. **Split mechanic:** at 50% HP if `_canSplit`, spawns 2 shards at 35% maxHp, 1.6x speed, 0.7x scale
9. If HP <= 0: call `processKill(mob, source)`, return true

**Kill sources** (determines heal multiplier and behavior):

| Source | Heal Mult | Notes |
|--------|-----------|-------|
| `"gun"` | 2.0x | Direct bullet kill, refills ammo |
| `"melee"` | function (2.0x ninja dash, 1.5x storm, else 1.0x) | Direct melee swing |
| `"ninja_splash"` | function (varies) | Ninja AOE splash kill |
| `"ninja_dash_kill"` | 2.0x | Ninja dash-attack direct kill |
| `"storm_shock"` | 1.5x | Storm Blade shockwave kill |
| `"storm_chain"` | 1.5x | Chain lightning kill |
| `"shrine"` | 1.0x | Malevolent Shrine slash kill, refills ammo |
| `"godspeed"` | 1.0x | Godspeed lightning kill, refills ammo |
| `"burn_dot"` | 1.0x | Burn DOT tick kill |
| `"inferno_chain"` | 1.0x | Inferno cannon chain explosion |
| `"thorns"` | 1.0x | Thorns reflect damage |
| `"piercing_blood"` | 1.5x | Piercing blood slash arc kill |

#### Damage to Player: `dealDamageToPlayer(rawDmg, source, attacker, targetEntity)`

1. **Target resolution**: `targetEntity` param > `_currentDamageTarget` > global `player`. This routes damage to the correct party member.
2. Check `playerDead` and `_godMode`
3. **Lethal efficiency** (`_lethalEfficiency`): +15% damage if target is below 40% HP
4. **Backstabber** (`_backstabber`): +30% damage if mob is behind target
5. **Armor reduction** (all sources except `"dot"`): `reduced *= (1 - getArmorReduction())`
6. **Projectile/AOE reduction** (for `"projectile"` and `"aoe"` sources): `reduced *= (1 - getProjReduction())`
7. **Armor break** multiplier: if `_armorBreak` active, applies `_armorBreakMult` to damage
8. Round and subtract HP
9. **Thorns** (on `"contact"` source): reflect `finalDmg * thornsRate` back to attacker, apply stagger
10. Death check: bots via `PartySystem.handleMemberDeath()`, player via `checkPlayerDeath()`
11. Emit `player_damaged` event

**Damage sources:** `"contact"`, `"projectile"`, `"aoe"`, `"dot"`

**Party damage routing:** `_currentDamageTarget` is set per-mob-per-frame in `updateMobs()` via `PartySystem.getMobTarget(m)`. All `dealDamageToPlayer` calls within mob specials and contact damage automatically route to the correct party member. `processKill` also resolves the killer via `_currentDamageTarget` for proper gold/XP credit.

#### Kill Rewards: `processKill(mob, source)`

1. Increment `kills`, add 5 player XP, add 5 skill XP to "Total Kills"
2. Calculate quick-kill bonus (`getQuickKillBonus(mob)`)
3. Award gold: `getGoldReward(mob.type, wave) * quickKillBonus * partyMemberCount`, routed via `PartySystem`
4. Apply kill heal: `baseHeal` from `MOB_TYPES.killHeal` (default 5) `* quickKillBonus * healMult * (1 + chestHealBoost)`, floored by lifesteal
5. Lifesteal floor, party lifesteal
6. Push visual effects (kill burst, heal popup)
7. Witch death cascades: kill all skeletons with `witchId === mob.id`
8. Golem death cascades: kill all mini golems with `golemOwnerId === mob.id`
9. Death explosion AoE (if applicable)
10. Emit `mob_killed` event

**Event subscribers on `mob_killed`:**
- Ammo refill (skips skeleton kills)
- Ultimate charge increment (shrine or godspeed based on equipped melee)
- Gun on-kill specials (frost nova, inferno explosion via `GUN_BEHAVIORS`)

### Gun Special Behaviors (`GUN_BEHAVIORS`)

Data-driven registry -- each gun special defines `onHit` and `onKill` callbacks:

**Frost:**
- `onHit`: applies frost status (90 frames, 25% slow)
- `onKill`: frost nova AOE -- freezes all mobs within 120px (60 frames, 100% freeze)
- Triggers on: `"gun"` kills only

**Burn (Inferno Cannon):**
- `onHit`: applies burn DOT (180 frames, 11 dmg/tick every 60 frames)
- `onKill`: burning mobs explode (80% gun damage to mobs within 100px), chain reaction at 60% damage for 2nd tier
- Triggers on: `"gun"` and `"burn_dot"` kills

### Status Effects

#### Mob Status Effects (via `StatusFX.applyToMob`)

| Effect | Duration (default) | Behavior |
|--------|--------------------|----------|
| `frost` | 90 frames (1.5s) | Speed reduced by `frostSlow` (default 25%) |
| `burn` | 180 frames (3s) | DOT: 11 damage every 60 frames |
| `stagger` | 30 frames (0.5s) | Skips movement entirely |
| `stun` | 60 frames (1s) | Skips movement entirely |
| `root` | 42 frames (0.7s) | Skips movement entirely |
| `mark` | 240 frames (4s) | Takes +15% damage (via `dmgMult`) |
| `silence` | 90 frames (1.5s) | Prevents special ability use |

#### Player Status Effects (via `StatusFX.applyToPlayer`)

| Effect | Duration (default) | Behavior |
|--------|--------------------|----------|
| `slow` | 240 frames (4s) | Speed reduced by 35% |
| `root` | 42 frames (0.7s) | Cannot move |
| `stun` | 36 frames (0.6s) | Cannot move or act (implemented as root) |
| `mark` | 240 frames (4s) | Takes +15% damage |
| `silence` | 90 frames (1.5s) | Blocks ability use |
| `bleed` | 240 frames (4s) | DOT: 3 damage every 60 frames |
| `confuse` | 72 frames (1.2s) | Swap movement directions |
| `disorient` | 60 frames (1s) | Random drift added to movement |
| `fear` | 90 frames (1.5s) | Override movement with random walk (cannot control character) |
| `blind` | 120 frames (2s) | Black or white vignette overlay (mode: `'darken'` or `'flash'`) |
| `mobility_lock` | 120 frames (2s) | Disables dash/sprint but not attacks |
| `armor_break` | 180 frames (3s) | Reduces armor effectiveness |
| `tether` | 180 frames (3s) | Linked to a mob with heavy slow (60% speed reduction via `_tetherSlow`) |
| `poison` | 180 frames (3s) | DOT: configurable damage per tick |

**Player effect state fields:** `_slow`, `_slowTimer`, `_root`, `_rootTimer`, `_mark`, `_markTimer`, `_markBonus`, `_silence`, `_silenceTimer`, `_bleed`, `_bleedTimer`, `_bleedDmg`, `_bleedTick`, `_confuse`, `_confuseTimer`, `_disorient`, `_disorientTimer`, `_fear`, `_fearTimer`, `_fearDirTimer`, `_fearDirX`, `_fearDirY`, `_blind`, `_blindTimer`, `_blindMode`, `_mobilityLocked`, `_mobilityLockTimer`, `_armorBreak`, `_armorBreakTimer`, `_armorBreakMult`, `_tether`, `_tetherTimer`, `_tetherMobId`, `_tetherSlow` (0.6), `_poisonTimer`, `_poisonTickTimer`

**`tickPlayer` returns:** `{speedMult, rooted, marked, markBonus, silenced, confused, disoriented, bleeding, feared, blind, armorBreak, armorBreakMult, tethered}`

### MOB_AI Patterns (13)

| Pattern | Behavior |
|---------|----------|
| `crowded` | Crowd-following movement |
| `runner` | Runs away from target |
| `grunt` | Basic chase-and-attack |
| `tank` | Slow, aggressive push |
| `witch` | Kite at 160px range |
| `skeleton` | Swarm at 40px range |
| `golem` | Heavy melee |
| `mini_golem` | Smaller golem variant |
| `mummy` | Melee attacker |
| `healer` | Flee if <160px, heal allies within 220px radius |
| `archer` | Kite at 350px range |
| `stationary` | Does not move |
| `hover` | Hovering movement |

### Death State

**Death state fields:** `playerDead=false`, `poisonTimer=0`, `deathTimer=0`, `DEATH_ANIM_FRAMES=40`, `RESPAWN_COUNTDOWN=180`, `respawnTimer=0`, `deathX/Y=0`, `deathRotation=0`, `deathGameOver=false`

### Hotbar Slots

**Default hotbar:** `[{name:"RECRUIT", type:"gun", key:"1"}, {name:"KATANA", type:"melee", key:"2"}, {name:"POTION", type:"potion", key:"3"}]`

### Hit Effects Registry

`HIT_EFFECT_RENDERERS` maps effect type strings to renderer functions `(h, ctx, alpha) => { ... }`.

**All 73 registered effect types:**

| Category | Types |
|----------|-------|
| Core combat | `kill`, `hit`, `crit`, `heal`, `text_popup` |
| Gun specials | `frost_hit`, `frost_nova`, `burn_hit`, `burn_tick`, `inferno_explode` |
| Melee: Ninja | `ninja_dash`, `ninja_activate`, `ninja_aoe`, `ninja_slash`, `ninja_dash_end` |
| Melee: Storm | `shockwave`, `lightning`, `godspeed_activate`, `ground_lightning` |
| Melee: Piercing/Shrine | `cleave_hit`, `blood_slash_hit`, `blood_slash_arc`, `shrine_activate`, `shrine_slash` |
| Mob combat | `poison_hit`, `poison_tick`, `mummy_explode`, `explosion`, `stomp`, `stun` |
| Mob support | `heal_zone`, `heal_beam`, `mob_heal`, `summon`, `cast`, `smoke`, `buff` |
| Equipment | `thorns` |
| Projectile | `arrow_bounce`, `arrow_fade` |
| Vortalis | `water_geyser`, `anchor_sweep`, `ink_splash`, `coral_spike`, `fear_swirl`, `tether_chain`, `shield_block`, `reflect_spark`, `ghost_ship`, `kraken_tentacle`, `whirlpool`, `trident_slash`, `poison_puddle`, `cannon_explosion`, `blood_slash` |
| Earth-205 | `pipe_hit`, `slingshot_impact`, `flamethrower_tick`, `nail_pin`, `glass_slash`, `sledgehammer_shockwave`, `cleaver_slash`, `chain_hit`, `flare_burst`, `grenade_explosion`, `pin_pop`, `sandbag_drop`, `sonic_wave`, `stiletto_stab`, `chemical_beam`, `meltdown_pulse` |
| UI | `grab` |
| Fallback | `_default` |

Each renderer receives the hit effect object `h` (with `x`, `y`, `life`, `maxLife`, `type`, and optional data like `dmg`, `gold`, `angle`), the canvas context `ctx`, and a computed `alpha` for fade-out.

## Connections to Other Systems

- **Inventory system** (`inventorySystem.js`) -- `playerEquip.gun`, `playerEquip.melee`, armor stats, `createMainGun()`
- **Progression system** (`progressionData.js`) -- `PROG_ITEMS` for tiered weapon stats, `getProgressedStats()`
- **Wave system** (`waveSystem.js`) -- `wave` count drives HP/speed/damage multipliers for spawned mobs
- **Event bus** (`eventBus.js`) -- `mob_killed`, `player_damaged` events drive kill rewards, ultimate charges, gun specials
- **Mob system** (`mobSystem.js`) -- bullet-mob collision, contact damage, special ability dispatch
- **Party system** (`partySystem.js`) -- `PartySystem.getMobTarget()` sets `_currentDamageTarget` for party-aware damage routing
- **Game state** (`gameState.js`) -- `gun`, `melee`, `player`, `mobs`, `bullets`, `hitEffects` globals

## Gotchas & Rules

- **Ammo refills on non-skeleton kills.** Any kill (except skeleton and witch_skeleton) instantly refills the gun magazine. This is a deliberate design choice, not a bug.
- **Lifesteal is per-hit, not per-swing.** A cleave hitting 5 mobs calculates lifesteal independently for each one, each capped at 20 HP.
- **Witch death cascade is recursive.** Killing a witch calls `processKill` on each skeleton, which in turn emits `mob_killed` for each -- all within the same frame.
- **`dealDamageToMob` has a 7-layer defense pipeline.** Checked in order: poison immune > invulnerability > shield HP absorb > frontal shield > counter stance > damage reduction > subtract HP. Only if all layers pass does damage reach mob HP.
- **Freeze timer reduces movement speed, not fire rate.** The post-shot freeze only affects player movement. Higher-tier guns and main guns get reduced freeze multipliers (0.3x-0.5x).
- **Gun behaviors are additive with kill events.** The `GUN_BEHAVIORS.onKill` callback fires inside a `mob_killed` event subscriber, which means it runs alongside ammo refill and ultimate charge callbacks.
- **Bullet collision is checked in `mobSystem.js`**, not in `gunSystem.js`. The gun system only creates bullets; the mob system handles hit detection per-frame.
- **Party damage routing is implicit.** `_currentDamageTarget` is set once per mob per frame. All `dealDamageToPlayer` calls within that mob's specials automatically target the correct party member without explicit parameter passing.
- **Counter stance reflects melee only.** Gun and DOT damage bypass counter stance entirely -- only `source === 'melee'` triggers the reflect.
