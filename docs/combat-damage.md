# Combat and Damage

## Overview

Combat in Teah Online revolves around three weapon classes (guns, melee, potions) and a centralized damage pipeline that handles armor reduction, status effects, lifesteal, kill rewards, and visual hit effects. Guns fire projectile bullets with per-gun stats. Melee weapons (4 types) have unique specials and ultimates. The damage system tracks 13 player-targeted status effects and 7 mob-targeted status effects. A registry of 73 hit effect renderers provides visual feedback for every combat interaction. Party-aware damage routing lets mobs target and deal damage to any party member via `_currentDamageTarget`.

## Files

- `js/core/gunSystem.js` -- Gun firing, reloading, bullet spawning, CT-X stat sliders, death effects, mob ambient particles
- `js/core/meleeSystem.js` -- Melee swing, dash, specials (ninja/storm/cleave), ultimates (Malevolent Shrine, Godspeed)
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

| Gun | Category | Mechanic |
|-----|----------|----------|
| Storm AR | Assault Rifle | Fast full-auto, reliable |
| Heavy AR | Assault Rifle | Slow, high damage |
| Boomstick | Shotgun | Close-range pellet spread |
| Ironwood Bow | Bow | Piercing arrows, no reload |
| Volt-9 | SMG | Very fast fire, slight spread |

Stats interpolated linearly: `stat(level) = Math.round(base + (max - base) * (level - 1) / 24)`

### Melee System

**4 melee weapon types:**

| Weapon | Special | Ultimate | Mechanic |
|--------|---------|----------|----------|
| Sword | _(none)_ | _(none)_ | Basic 120-degree arc swing with knockback |
| Ninja Katanas | `'ninja'` | _(none)_ | Dual crossing slashes, 30% AOE splash to nearby mobs within 60px, 3-dash chain, 4x damage during dash, lifesteal on hit |
| Storm Blade | `'storm'` | Godspeed | Shockwave ring (65% damage to mobs within 80px), chain lightning (50% damage, chains 3 times within 160px range), lifesteal on all hits |
| War Cleaver | `'cleave'` | Malevolent Shrine | 360-degree cleave (hits all mobs in range), piercing blood slash arcs, lifesteal on hit |

**Melee swing flow:**
1. `meleeSwing()` checks cooldown, sets swing direction from aim
2. Iterates all mobs in range, checks arc (or 360 for cleave)
3. Calculates crit (20% chance normally, 100% during ninja dash or shadow step)
4. Applies damage via `dealDamageToMob(m, dmg, "melee")`
5. Applies weapon-specific effects (splash, shockwave, chain lightning)
6. Applies knockback

**Ultimates:**
- **Malevolent Shrine** (War Cleaver): 10 kill charges, 3-second duration, slashes every 4 frames (45 total) within 150px range
- **Godspeed** (Storm Blade): 10 kill charges, 5-second duration, lightning strikes every 8 frames within 180px range

**Lifesteal:** `calcLifesteal(dmg)` = 15% of damage dealt, hard capped at 20 HP per hit. Applied on melee direct hits, splash damage, shockwave, and chain lightning for ninja/storm/cleave weapons.

### Damage Pipeline

#### Damage to Mobs: `dealDamageToMob(mob, amount, source, attackerEntity)`

1. Check `mob._invulnerable` (mud_dive, nano_armor) -- if true, return false
2. **Active shield** (`mob._shielded`): if true and source is not DOT/thorns, block all damage with `shield_block` visual
3. **Frontal shield** (`mob._frontalShield`): negate damage from within 60-degree arc of mob's facing direction
4. **Counter stance** (`mob._counterStance`): melee attacks are reflected back to the attacker via `dealDamageToPlayer`
5. **Passive damage reduction** (`mob._damageReduction`): percentage-based reduction (e.g. 0.3 = 30% less damage, min 1)
6. **Shield absorb**: if `mob._shieldHp > 0`, damage hits shield first, remainder passes through
7. Subtract HP
8. **Split mechanic:** Core Guardian splits into 2 smaller blobs at 50% HP (`_canSplit` flag)
9. If HP <= 0: call `processKill(mob, source)`, return true

**Kill sources** (determines heal multiplier and behavior):

| Source | Heal Mult | Notes |
|--------|-----------|-------|
| `"gun"` | 2.0x | Direct bullet kill, refills ammo |
| `"melee"` | 1.0x (2.0x during ninja dash, 1.5x for storm) | Direct melee swing |
| `"ninja_splash"` | 1.0x (2.0x during dash) | Ninja AOE splash kill |
| `"ninja_dash_kill"` | 2.0x | Ninja dash-attack direct kill |
| `"storm_shock"` | 1.5x | Storm Blade shockwave kill |
| `"storm_chain"` | 1.5x | Chain lightning kill |
| `"shrine"` | 1.0x | Malevolent Shrine slash kill, refills ammo |
| `"godspeed"` | 1.0x | Godspeed lightning kill, refills ammo |
| `"burn_dot"` | 1.0x | Burn DOT tick kill |
| `"inferno_chain"` | 1.0x | Inferno cannon chain explosion |
| `"thorns"` | 1.0x | Thorns reflect damage |
| `"witch_skeleton"` | flat 1 HP | Auto-kill skeletons when witch dies |

#### Damage to Player: `dealDamageToPlayer(rawDmg, source, attacker, targetEntity)`

1. **Target resolution**: `targetEntity` param > `_currentDamageTarget` > global `player`. This routes damage to the correct party member.
2. Check `playerDead` and `_godMode`
3. **Armor reduction** (all sources except `"dot"`): `reduced *= (1 - getArmorReduction())`
4. **Projectile/AOE reduction** (for `"projectile"` and `"aoe"` sources): `reduced *= (1 - getProjReduction())`
5. Round and subtract HP
6. **Thorns** (on `"contact"` source): reflect `finalDmg * thornsRate` back to attacker, apply stagger
7. Death check
8. Emit `player_damaged` event

**Party damage routing:** `_currentDamageTarget` is set per-mob-per-frame in `updateMobs()` via `PartySystem.getMobTarget(m)`. All `dealDamageToPlayer` calls within mob specials and contact damage automatically route to the correct party member. `processKill` also resolves the killer via `_currentDamageTarget` for proper gold/XP credit.

#### Kill Rewards: `processKill(mob, source)`

1. Increment `kills`, add 5 XP
2. Calculate quick-kill bonus (`getQuickKillBonus(mob)`)
3. Award gold: `getGoldReward(mob.type, wave) * quickKillBonus`
4. Apply kill heal: `baseHeal * quickKillBonus * sourceMultiplier * (1 + chestHealBoost)`, floored by `lifestealPerKill`
5. Push visual effects (kill burst, heal popup)
6. Witch death cascades: kill all skeletons with `witchId === mob.id`
7. Golem death cascades: kill all mini golems with `golemOwnerId === mob.id`
8. Emit `mob_killed` event

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

### Hit Effects Registry

`HIT_EFFECT_RENDERERS` maps effect type strings to renderer functions `(h, ctx, alpha) => { ... }`.

**All 73 registered effect types:**

| Category | Types |
|----------|-------|
| Core combat | `kill`, `hit`, `crit`, `heal`, `text_popup` |
| Gun specials | `frost_hit`, `frost_nova`, `burn_hit`, `burn_tick`, `inferno_explode` |
| Melee: Ninja | `ninja_dash`, `ninja_activate`, `ninja_aoe`, `ninja_slash`, `ninja_dash_end` |
| Melee: Storm | `shockwave`, `lightning`, `godspeed_activate`, `ground_lightning` |
| Melee: Cleave | `cleave_hit`, `blood_slash_hit`, `blood_slash_arc`, `shrine_activate`, `shrine_slash` |
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
- **`dealDamageToMob` has a 6-layer defense pipeline.** Checked in order: invulnerability > active shield > frontal shield > counter stance > damage reduction > shield HP. Only if all layers pass does damage reach mob HP.
- **Freeze timer reduces movement speed, not fire rate.** The post-shot freeze only affects player movement. Higher-tier guns and main guns get reduced freeze multipliers (0.3x-0.5x).
- **Gun behaviors are additive with kill events.** The `GUN_BEHAVIORS.onKill` callback fires inside a `mob_killed` event subscriber, which means it runs alongside ammo refill and ultimate charge callbacks.
- **Bullet collision is checked in `mobSystem.js`**, not in `gunSystem.js`. The gun system only creates bullets; the mob system handles hit detection per-frame.
- **Party damage routing is implicit.** `_currentDamageTarget` is set once per mob per frame. All `dealDamageToPlayer` calls within that mob's specials automatically target the correct party member without explicit parameter passing.
- **Counter stance reflects melee only.** Gun and DOT damage bypass counter stance entirely -- only `source === 'melee'` triggers the reflect.
