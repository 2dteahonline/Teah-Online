# Mob Abilities — Earth-205 (Marble City)

## Source of truth

- `js/authority/earth205Specials.js` — all 96 mob specials for Earth-205 dungeon (regular mobs + bosses across 5 floors)

## Purpose

Defines every special ability used by Earth-205 mobs and bosses. Each entry is a function on global `MOB_SPECIALS` that runs per-tick; abilities read `m._specialTimer`/`m._specialCD` (regulars) or `m._abilityCDs[name]` (bosses) for cooldowns, call shared helpers `dealDamageToPlayer`, `getMobDamageMultiplier`, `applyKnockback`, `StatusFX.applyToPlayer`, `TelegraphSystem.create`, `HazardSystem.createZone`, `AttackShapes.*`, and push entries to the `bullets`, `mobs`, and `hitEffects` arrays. Damage values are `Math.round(base * getMobDamageMultiplier())` and are listed below as `base`.

## Values

All numeric constants found in `js/authority/earth205Specials.js`. Columns: base damage (pre-multiplier), range/radius (px), cooldown (frames), telegraph delay (frames), status effects (duration frames), citation line.

### Floor 1 regulars

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Telegraph | Status / Extra | Citation |
|---|---------|----------|------------------|----------|-----------|----------------|----------|
| 1 | pipe_swipe | 25 | cone 60°, range 80; approach dist ≤100 | 180 | 30 | — | js/authority/earth205Specials.js:8-32 |
| 2 | slingshot_snipe | 30 | projectile speed 11; range 350; line width 16 | 240 | 60 | — | js/authority/earth205Specials.js:35-63 |
| 3 | ankle_bite | 18 | dash up to 240; hit radius 48; trigger 60<dist<280 | 210 | dash 16 | bleed 180f, 4/tick | js/authority/earth205Specials.js:66-96 |
| 4 | hairspray_flamethrower | 8/tick | cone 45°, range 120; channel 120f; tick every 18f | 300 | — | trigger dist ≤140 | js/authority/earth205Specials.js:99-125 |
| 5 | frenzied_slash | 12 x3 | hit radius 70; hits at elapsed 0/20/40 of 60f | 240 | — | stun 30 on 3rd hit; trigger dist ≤90 | js/authority/earth205Specials.js:128-160 |
| 6 | pneumatic_shot | 22 | proj speed 9; range 300 | 180 | — | root 60 | js/authority/earth205Specials.js:163-182 |
| 7 | glass_flurry | 28 | 3 segments of 5f; perp offset 60; hit radius 50; trigger 50<dist<200 | 240 | — | — | js/authority/earth205Specials.js:185-221 |
| 8 | earthquake_slam_e205 | 35 | radius 100; knockback 8.4 | 300 | 48 | trigger dist ≤120 | js/authority/earth205Specials.js:224-251 |

### Floor 2 regulars

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Telegraph | Status / Extra | Citation |
|---|---------|----------|------------------|----------|-----------|----------------|----------|
| 9 | boomerang_cleave | 20 out + 20 return | proj speed 7; range cap 200; return at phase frame 15; phase 40 | 270 | — | — | js/authority/earth205Specials.js:256-290 |
| 10 | chain_whip | 22 | line length 150, width 30; trigger ≤170 | 240 | — | silence 60 | js/authority/earth205Specials.js:293-310 |
| 11 | flare_trap | 10 + 6 zone/tick | proj speed 5, life 60; zone radius 80, duration 300 | 300 | — | fire zone | js/authority/earth205Specials.js:313-343 |
| 12 | guillotine_drop | 50 | hit radius 60; self-stun 60 on miss | 360 | 72 | trigger dist ≤80 | js/authority/earth205Specials.js:346-379 |
| 13 | suppressive_burst | 15 x3 | 15° spread; proj speed 7; trigger ≤300 | 210 | — | slow 60f @0.5 | js/authority/earth205Specials.js:382-404 |
| 14 | kick_and_clear | 15 dash + 10 x3 shotgun | dash 120; 15° spread; trigger 60<dist<180 | 300 | — | stun 30 on dash hit | js/authority/earth205Specials.js:407-460 |
| 15 | laser_designation | 40 | proj speed 11; line length 400, width 20 | 300 | 90 | trigger ≤350 | js/authority/earth205Specials.js:463-491 |
| 16 | bouncing_blast | 30 on-expire | proj speed 5, life 180, 2 bounces; explosion radius 80 | 270 | — | trigger ≤300 | js/authority/earth205Specials.js:494-531 |

### Willis boss (Floor 1)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 17 | jury_rigged_taser | 30 | proj speed 9 | 240 | stun 60 | js/authority/earth205Specials.js:537-553 |
| 18 | chemical_flask | 20 + 8/tick | proj speed 4.5; life 60; zone radius 70, duration 300; direct bleed 300f @8 | 300 | poison zone | js/authority/earth205Specials.js:556-582 |
| 19 | caltrop_scatter | 10 per caltrop | 5 caltrops, scatter 40-120px; pickup radius 20; caltrop life 360 | 360 | slow 90f @0.5 | js/authority/earth205Specials.js:585-616 |
| 20 | decoy_device | 0 | spawn offset 60; decoy speed 4.2, hp 1, life 300 | 600 | — | js/authority/earth205Specials.js:619-643 |
| 21 | calculated_dodge | 0 | dash 100; 30% proc on damage; invuln 18; internal CD 120 | passive | — | js/authority/earth205Specials.js:646-668 |
| 22 | makeshift_emp | 25 | radius 120 | 720 | silence 120 | js/authority/earth205Specials.js:671-683 |
| 23 | master_plan | 20 (flask) | flask proj spd 4.5, zone r70 dur 300 tick 8; 5 caltrops life 360; 3 decoys offset 80 | 1200 | combo | js/authority/earth205Specials.js:686-736 |

### Puppedrill boss (Floor 1)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 24 | crowbar_hook | 25 | pull up to 100; trigger ≤180 | 210 | pulls player | js/authority/earth205Specials.js:742-759 |
| 25 | shattering_swing | 40 | cone 60°, range 90; trigger ≤120; knockback 9.8 | 240 | — | js/authority/earth205Specials.js:762-777 |
| 26 | scrap_metal_toss | 20 x3 | 15° spread; proj speed 6 | 300 | — | js/authority/earth205Specials.js:780-796 |
| 27 | adrenaline_sprint | 0 | speed x2 for 180f | 480 | self-buff | js/authority/earth205Specials.js:799-816 |
| 28 | kneecap_sweep | 30 | radius 70; trigger ≤100 | 360 | root 120 | js/authority/earth205Specials.js:819-832 |
| 29 | brutal_beatdown | 30 x5 | hit radius 60; 5 hits at 24f intervals over 120f; knockback 11.2 on final | 900 | — | js/authority/earth205Specials.js:835-865 |

### Sackhead boss (Floor 2)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 30 | barbed_swing | 35 | cone 45°, range 80; trigger ≤110 | 180 | bleed 180f @6 | js/authority/earth205Specials.js:871-885 |
| 31 | skull_cracker | 45 | radius 70; trigger ≤100 | 300 | stun 60; tele 36 | js/authority/earth205Specials.js:888-912 |
| 32 | bull_charge | 40 | dash 250 over 20f; hit radius 50; trigger 60≤dist≤350; knockback 11.2 | 420 | tele line width 40, delay 8 | js/authority/earth205Specials.js:915-948 |
| 33 | stranglehold | 10/30f over 120f | trigger ≤60 | 480 | root 120 | js/authority/earth205Specials.js:951-974 |
| 34 | batter_up | 60 | cone 180°, range 100; trigger ≤130; knockback 14 | 1080 | stun 90; tele 48 | js/authority/earth205Specials.js:977-1006 |

### Mr. Schwallie boss (Floor 2)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 35 | cigar_flick | 15 | proj speed 6; zone radius 60, duration 180, tick 6 | 240 | fire zone | js/authority/earth205Specials.js:1012-1036 |
| 36 | cqc_counter | 35 | counter stance 120f | 360 | heals self back to pre-counter hp | js/authority/earth205Specials.js:1039-1072 |
| 37 | akimbo_barrage | 18 x6 | 180° spread; speed = GAME_CONFIG.BULLET_SPEED | 300 | — | js/authority/earth205Specials.js:1075-1091 |
| 38 | tactical_slide | 0 | slide 150 over 10f perpendicular | 240 | invuln 12 | js/authority/earth205Specials.js:1094-1119 |
| 39 | flashbang_breach | 20 | proj speed 7 | 480 | blind 90 (flash) | js/authority/earth205Specials.js:1122-1138 |
| 40 | one_man_army | 20 (flashbang) + 18 x6 (barrage) | slide 150, barrage at timer 60, flashbang at 30; duration 90f | 1200 | combo; invuln 12 | js/authority/earth205Specials.js:1141-1208 |

### Floor 3 regulars (Carnival)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 41 | pin_cascade | 12 + 15 AoE | 3 bullets speed 5, spread π/10; 1 bounce; aoe radius 50 | 240 | trigger ≤250 | js/authority/earth205Specials.js:1215-1237 |
| 42 | static_poodle | 0 | spawn poodle hp 60; aoe radius 80, slow dur 120; max 2 active | 480 | summon | js/authority/earth205Specials.js:1240-1266 |
| 43 | stone_ambush | 35 | wait 120f, dash up to 200 over 16f; hit radius 60; knockback 60 | 360 | trigger ≤300 | js/authority/earth205Specials.js:1269-1317 |
| 44 | smoke_and_mirrors | 0 | reactive teleport 150 on damage | 300 | — | js/authority/earth205Specials.js:1320-1345 |
| 45 | rigging_drop | 30 | AoE radius 60 at telegraphed player pos | 300 | tele 60; stun 30; trigger ≤200 | js/authority/earth205Specials.js:1348-1378 |
| 46 | soprano_shriek | 15 | cone 90°, range 140; pierces walls | 270 | confuse 120 | js/authority/earth205Specials.js:1381-1401 |
| 47 | prop_toss | 14 x3 | 20° spread; proj speed 7-10 random | 210 | trigger ≤280 | js/authority/earth205Specials.js:1404-1426 |
| 48 | pirouette_dash | 20 | dash 180 over 14f; hit radius 30; reflects bullets during dash; trigger 50<dist<200 | 240 | tele line width 30, delay 6 | js/authority/earth205Specials.js:1429-1467 |

### Floor 4 regulars (Casino/Mob)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 49 | baton_sweep | 22 | cone 90°, range 80; trigger ≤100 | 300 | tele 12; mobility_lock 120 | js/authority/earth205Specials.js:1472-1498 |
| 50 | tripwire_drop_e205 | 0 | dash away 180 over 12f; trap life 300, trigger radius 25; trigger 80<dist<250 | 300 | root 90 | js/authority/earth205Specials.js:1501-1544 |
| 51 | auto_turret | 0 | spawn turret hp 80, shootRange 300, shootRate 90, bulletSpeed 7, life 480; max 2 | 600 | summon | js/authority/earth205Specials.js:1547-1572 |
| 52 | flash_and_fade | 10 | flash radius 180; smoke zone radius 80, duration 240, slow 0.3 | 360 | blind 30 (flash); trigger ≤200 | js/authority/earth205Specials.js:1575-1597 |
| 53 | knee_capper | 20 | radius 70; trigger ≤90 | 240 | slow 150f @0.4 | js/authority/earth205Specials.js:1600-1614 |
| 54 | hustle_step | 18 | speed x1.5 for 120f; random dir change every 20f; contact radius 40 | 180 | self-buff | js/authority/earth205Specials.js:1617-1656 |
| 55 | spray_and_pray | 8/shot | channel 180f; fires every 12f; 60° total cone; proj speed 9 | 300 | trigger ≤350 | js/authority/earth205Specials.js:1659-1688 |
| 56 | execution_shot | 55 | lock 120f; proj speed 13; line width 12, length 400 | 420 | trigger ≤400 | js/authority/earth205Specials.js:1691-1726 |

### Killer Mime boss

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 57 | finger_gun | 30 | proj speed 10; nearly invisible | 240 | trigger ≤300 | js/authority/earth205Specials.js:1731-1745 |
| 58 | invisible_wall | 0 | spawn mime_wall hp 100, life 240; max 2 | 480 | summon | js/authority/earth205Specials.js:1748-1771 |
| 59 | heavy_mallet | 40 | radius 70; knockback 80 (positional); trigger ≤90 | 300 | tele 36; stun 60 | js/authority/earth205Specials.js:1774-1802 |
| 60 | tug_of_war | 15 | pull up to 120; trigger ≤200 | 420 | root 60 | js/authority/earth205Specials.js:1805-1823 |
| 61 | trapped_in_box | 0 | 4 box walls around player at ±40; hp 40 each, life 180 | 1080 | summon trap | js/authority/earth205Specials.js:1826-1851 |

### Major Phantom boss

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 62 | overture_slash | 20 x3 | cone 60°, range 80; 20f between slashes; trigger ≤120 | 210 | — | js/authority/earth205Specials.js:1856-1883 |
| 63 | stage_blood | 45 | AoE radius 80 at marked pos; trigger ≤300 | 360 | tele 120 | js/authority/earth205Specials.js:1886-1910 |
| 64 | theatrical_parry | 40 | counter stance 120f | 420 | on-hit counter | js/authority/earth205Specials.js:1913-1944 |
| 65 | phantom_step | 35 | teleport 60 behind player; hit radius 50; trigger ≤250 | 300 | 8f strike delay | js/authority/earth205Specials.js:1947-1973 |
| 66 | grand_finale | 55 | AoE radius 200; knockback 100 (positional) | 1500 | channel 120f; only below 60% hp | js/authority/earth205Specials.js:1976-2013 |

### Lady Red boss

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 67 | concealed_stiletto | 30 | trigger ≤80 | 210 | bleed 180f @6 | js/authority/earth205Specials.js:2018-2028 |
| 68 | suppressed_fire | 20 x3 | 10° spread; proj speed 9; 8f between shots | 300 | trigger ≤280 | js/authority/earth205Specials.js:2031-2071 |
| 69 | toxic_perfume | 10 + zone | aoe radius 100; zone dur 180, tickRate 60, tick dmg 5, slow 0.2 | 420 | confuse 120; bleed 180f @5 | js/authority/earth205Specials.js:2074-2097 |
| 70 | red_herring | 0 | dash away 150 over 12f; spawn decoy hp 1, speed 1.7, life 240 | 600 | trigger ≤250 | js/authority/earth205Specials.js:2100-2138 |
| 71 | checkmate | 15 x5 | teleport 50 behind, 5 stabs at 10f intervals, hit radius 60 | 1200 | bleed 240f @5 | js/authority/earth205Specials.js:2141-2180 |

### The Boss (the_boss_e205)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 72 | gold_ring_hook | 25 | proj speed 9; pull 100 on hit; trigger ≤250 | 240 | hook | js/authority/earth205Specials.js:2185-2200 |
| 73 | saturday_night_shuffle | 30 | 3 segments 80 each over 6f; zig ±π/4; hit radius 50; trigger 40<dist<300 | 300 | — | js/authority/earth205Specials.js:2203-2251 |
| 74 | call_the_goons | 0 | spawn 2 tracksuit_goons @offset 80, hp = boss.maxHp*0.1, dmg = boss.dmg*0.35; max 4 active | 900 | summon | js/authority/earth205Specials.js:2254-2281 |
| 75 | dirty_money | 25 | 4 decoys 40-120px around player; life 360, trigger radius 20 | 480 | slow 120f @0.5 | js/authority/earth205Specials.js:2284-2316 |
| 76 | the_hit | 70 | lock 120f → tele 50 behind → 8f delay → strike radius 50; trigger ≤400 | 1320 | tele line length 350 width 16 | js/authority/earth205Specials.js:2319-2368 |

### Floor 5 regulars (Chemical Plant)

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 77 | acid_splash | 15 + puddle | proj speed 4.5, life 60; puddle radius 60, dur 240, tick 5, slow 0.2 | 270 | trigger ≤250 | js/authority/earth205Specials.js:2375-2409 |
| 78 | crop_dust | 0 | dash 250 over 20f; drops puddle (radius 40, dmg 6, interval 30) every 4f | 300 | trigger ≤350 | js/authority/earth205Specials.js:2412-2445 |
| 79 | volatile_reaction | 20 | proj speed 5 | 300 | trigger ≤280 | js/authority/earth205Specials.js:2448-2467 |
| 80 | fume_slam | 28 | radius 90; trigger ≤110 | 300 | tele 30; confuse 90 | js/authority/earth205Specials.js:2470-2498 |
| 81 | sticky_trail | 0 | drop slow zone every 60 moved-frames; radius 30, life 180, slow 0.5 | 180 | passive | js/authority/earth205Specials.js:2501-2525 |
| 82 | rad_burst | 15 | radius 70; reactive on damage | 240 | bleed 120f @4 | js/authority/earth205Specials.js:2528-2547 |
| 83 | stasis_beam | 18 | sweep 180° over 60f; range 180; cone half 10°; trigger ≤200 | 360 | mobility_lock 120 | js/authority/earth205Specials.js:2550-2601 |
| 84 | feral_leap | 25 | leap up to 200 over 16f; hit radius 50; trigger 60<dist<200 | 240 | stun 48 | js/authority/earth205Specials.js:2604-2642 |

### Lady Elixir boss

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 85 | toxic_stream | 20 | proj speed 7; trail every 8f; trail puddle r30 dmg 3 life 120 int 30; trigger ≤300 | 240 | bleed 120f @4 | js/authority/earth205Specials.js:2647-2678 |
| 86 | corrosive_puddle | 0 (puddle 8/tick) | puddle at player r90, life 300, interval 30 | 360 | mark 180f +0.15 | js/authority/earth205Specials.js:2681-2699 |
| 87 | volatile_flask_boss | 30 | proj speed 5, life 50; trigger ≤350 | 300 | random: bleed 180f @4 / slow 150f @0.4 / confuse 90 | js/authority/earth205Specials.js:2702-2731 |
| 88 | stim_valve | 0 | heal 10% maxHp; speed x1.5 for 180f | 720 | self-buff | js/authority/earth205Specials.js:2734-2758 |
| 89 | maximum_overpressure | 65 | channel 120f; explosion radius 200 | 1500 | bleed 300f @6 | js/authority/earth205Specials.js:2761-2795 |

### Nofaux boss

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 90 | caustic_cleave | 35 | cone 120°, range 100; trigger ≤110 | 210 | bleed 180f @5 | js/authority/earth205Specials.js:2800-2816 |
| 91 | viscous_sludge | 20 | proj speed 5; slow zone radius 80, dur 240, slow 0.4; trigger ≤350 | 300 | — | js/authority/earth205Specials.js:2819-2841 |
| 92 | reactive_gel_shield | 25 (burst) | shield 600f @80% dmg reduction; burst radius 80 on expire | 600 | self-buff | js/authority/earth205Specials.js:2844-2869 |
| 93 | hazard_spill | 0 (puddle 7/tick) | 3 puddles r70 around player at 80 offset, life 300, interval 30 | 420 | — | js/authority/earth205Specials.js:2872-2893 |
| 94 | bio_grapple | 25 | pull up to 100; trigger ≤200 | 480 | root 90; bleed 120f @5 | js/authority/earth205Specials.js:2896-2919 |
| 95 | critical_meltdown | 80 | channel 180f; explosion radius 250; self-dmg 15% maxHp; only ≤25% hp | 1800 | bleed 300f @6 | js/authority/earth205Specials.js:2922-2961 |

### Missing Floor 5 extras

| # | Ability | Base dmg | Key radii/ranges | Cooldown | Status / Extra | Citation |
|---|---------|----------|------------------|----------|----------------|----------|
| 96 | plasma_bolt | 30 | proj speed 13; pierce; trigger ≤350 | 480 | armor_break 180f mult 1.25 | js/authority/earth205Specials.js:2966-2985 |
| 97 | ooze_spread | 0 | 3 puddles r50 @70 offset, dur 240, tick 5, slow 0.15; trigger ≤280 | 540 | — | js/authority/earth205Specials.js:2988-3005 |
| 98 | reactor_slam | 38 | radius 80; knockback 9.8; trigger ≤120 | 600 | tele 60; root 45 | js/authority/earth205Specials.js:3008-3035 |

## Behavior

- Regular specials use `m._specialTimer` counting down from `m._specialCD`; when 0, ability checks range, sets telegraph/dash state and returns `{ skip: true }` to suppress AI; on resolution resets `m._specialTimer`.
- Boss specials use `m._abilityCDs[name]` which is set only at resolution (no descending timer in-function — external scheduler).
- All damage values are multiplied by `getMobDamageMultiplier()` at the call site (js/authority/earth205Specials.js:16, 45, 76, 109, etc.) before being passed to `dealDamageToPlayer(dmg, 'mob_special', m)`.
- Telegraphs created via `TelegraphSystem.create({ shape, params, delayFrames, color, owner })`; shapes used: `cone`, `circle`, `line`.
- Hazard zones created via `HazardSystem.createZone({ cx, cy, radius, duration, tickRate?, tickDamage, color, slow? })`.
- Status effects applied via `StatusFX.applyToPlayer(type, opts)` — types seen: `bleed`, `stun`, `root`, `silence`, `slow`, `blind`, `confuse`, `mobility_lock`, `armor_break`, `mark`.

## Dependencies

- Reads: `player.x`, `player.y`, `player.hp`, `dist`, `ctx.bullets`, `ctx.mobs`, `ctx.hitEffects`
- Writes: `bullets[]`, `mobs[]`, `hitEffects[]`, `player.x`/`player.y` (pulls/knockbacks), `m._*` state fields
- Calls: `dealDamageToPlayer` (js/authority/combatSystem.js — external), `getMobDamageMultiplier`, `applyKnockback`, `clampDashTarget`, `positionClear`, `StatusFX.applyToPlayer`, `TelegraphSystem.create`, `HazardSystem.createZone`, `AttackShapes.hitsPlayer` / `playerInCone` / `playerInLine`
- Globals read: `nextBulletId`, `nextMobId`, `gameFrame`, `GAME_CONFIG.BULLET_SPEED`, `TILE`
- Registers onto global `MOB_SPECIALS` (defined in `js/authority/combatSystem.js`)

## Edge cases

- `calculated_dodge` (Willis) is passive — only 30% proc on detected damage, never sets `_specialTimer`, has its own 120f internal `_dodgeCD` (js/authority/earth205Specials.js:650-663).
- `grand_finale` (Major Phantom) only triggers when `m.hp <= m.maxHp * 0.6` (js/authority/earth205Specials.js:2003).
- `critical_meltdown` (Nofaux) only triggers when `m.hp <= m.maxHp * 0.25` and self-damages 15% maxHp, clamped to minimum 1 hp (js/authority/earth205Specials.js:2947-2954).
- `cqc_counter` restores boss HP to pre-stance value on successful counter (js/authority/earth205Specials.js:1052) — can effectively negate damage taken during stance.
- `bouncing_blast` ricochet uses previous/current tile comparison to pick reflection axis, with fallback to full reverse if same tile (js/authority/earth205Specials.js:510-517).
- `soprano_shriek` ignores wall collision for damage — intentional through-wall cone (js/authority/earth205Specials.js:1386).
- `stone_ambush` returns `{ skip: true }` even when on cooldown, keeping mob stationary permanently (js/authority/earth205Specials.js:1311).
- `sticky_trail` is passive — only drops zones when mob has moved >1px since last frame (js/authority/earth205Specials.js:2507-2510).
- `hustle_step`, `stim_valve` cache `m._hustleOrigSpd`/`m._stimOrigSpeed` and restore on expire — if ability interrupted/mob killed mid-buff, speed will not restore.
- `master_plan`, `one_man_army`, `the_hit`, `checkmate` are multi-phase combos; no early cancellation path if mob is killed mid-combo (state fields persist on mob instance only).
- `auto_turret` and `static_poodle` spawn full mob objects; turret has its own `shootRange 300`, `shootRate 90`, `bulletSpeed 7` handled by external mob AI, not this file.
- `decoy_device` / `red_herring` decoys have `aiType: 'runner'` / no special AI; `hp: 1` so single-hit kill.
