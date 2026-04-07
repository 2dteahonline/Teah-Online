# Mob Abilities — Wagashi (Dungeon 5, Floors 3-4)

Part 2 of 3. See `mob-abilities-wagashi-1.md` for intro and Floors 1-2. See `mob-abilities-wagashi-3.md` for Floor 5 + Lord Sarugami.

## Source of truth

- `js/authority/wagashiSpecials2.js` — Floor 3 + Floor 4 specials (28 abilities)

## Purpose

Defines all 28 Wagashi Floor 3 (lightning/fire/storm) and Floor 4 (blade/shadow/moon) mob and boss specials. All damage scales by `getMobDamageMultiplier()`, all durations in frames (60 fps).

## Values

### static_lunge (tempest_spearman) (js/authority/wagashiSpecials2.js:8-53)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials2.js:10 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials2.js:45 |
| Range gate min | 80 | px | js/authority/wagashiSpecials2.js:43 |
| Range gate max | 220 | px | js/authority/wagashiSpecials2.js:43 |
| Dash duration | 16 | frames | js/authority/wagashiSpecials2.js:38 |
| Max dash distance | 200 | px | js/authority/wagashiSpecials2.js:35 |
| Hit radius | 50 | px | js/authority/wagashiSpecials2.js:18 |
| Damage | 40 | hp | js/authority/wagashiSpecials2.js:19 |
| Stun duration | 20 | frames | js/authority/wagashiSpecials2.js:22 |
| Telegraph line width | 20 | px | js/authority/wagashiSpecials2.js:49 |

### charged_burst_arrow (cloudscale_archer) (js/authority/wagashiSpecials2.js:56-104)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials2.js:58 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials2.js:97 |
| Delayed AoE delay | 20 | frames | js/authority/wagashiSpecials2.js:90 |
| Range gate | 380 | px | js/authority/wagashiSpecials2.js:95 |
| Bullet speed | 9 | px/frame | js/authority/wagashiSpecials2.js:82 |
| Bullet damage | 35 | hp | js/authority/wagashiSpecials2.js:83 |
| AoE radius | 60 | px | js/authority/wagashiSpecials2.js:63 |
| AoE damage | 15 | hp | js/authority/wagashiSpecials2.js:64 |

### wave_cut (tideblade_disciple) (js/authority/wagashiSpecials2.js:107-136)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 200 | frames | js/authority/wagashiSpecials2.js:109 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials2.js:129 |
| Range gate | 280 | px | js/authority/wagashiSpecials2.js:127 |
| Bullet speed | GAME_CONFIG.BULLET_SPEED | px/frame | js/authority/wagashiSpecials2.js:117 |
| Bullet damage | 38 | hp | js/authority/wagashiSpecials2.js:118 |

### lightning_seal (thunder_crest_knight) (js/authority/wagashiSpecials2.js:139-167)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials2.js:141 |
| Strike delay | 70 | frames | js/authority/wagashiSpecials2.js:161 |
| Range gate | 300 | px | js/authority/wagashiSpecials2.js:158 |
| Strike radius | 60 | px | js/authority/wagashiSpecials2.js:146 |
| Damage | 42 | hp | js/authority/wagashiSpecials2.js:147 |
| Stun duration | 25 | frames | js/authority/wagashiSpecials2.js:150 |

### cinder_step (ember_guard) (js/authority/wagashiSpecials2.js:170-217)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials2.js:172 |
| Range gate min | 80 | px | js/authority/wagashiSpecials2.js:209 |
| Range gate max | 200 | px | js/authority/wagashiSpecials2.js:209 |
| Dash duration | 14 | frames | js/authority/wagashiSpecials2.js:214 |
| Max dash dist | 180 | px | js/authority/wagashiSpecials2.js:211 |
| Dash hit radius | 50 | px | js/authority/wagashiSpecials2.js:195 |
| Dash damage | 35 | hp | js/authority/wagashiSpecials2.js:196 |
| Fire zone duration | 150 | frames | js/authority/wagashiSpecials2.js:201 |
| Fire zone radius | 50 | px | js/authority/wagashiSpecials2.js:178 |
| Fire zone tick interval | 30 | frames | js/authority/wagashiSpecials2.js:176 |
| Fire zone tick damage | 8 | hp | js/authority/wagashiSpecials2.js:179 |

### coal_breath (furnace_hound) (js/authority/wagashiSpecials2.js:220-246)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials2.js:222 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials2.js:240 |
| Range gate | 140 | px | js/authority/wagashiSpecials2.js:238 |
| Cone half-angle | 25 | degrees | js/authority/wagashiSpecials2.js:228 |
| Cone range | 120 | px | js/authority/wagashiSpecials2.js:228 |
| Damage | 38 | hp | js/authority/wagashiSpecials2.js:229 |

### war_ember_chant (ashen_banner_monk) (js/authority/wagashiSpecials2.js:249-290)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials2.js:251 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials2.js:285 |
| Range gate | 400 | px | js/authority/wagashiSpecials2.js:284 |
| Buff radius | 200 | px | js/authority/wagashiSpecials2.js:260 |
| Damage multiplier | 1.3 | × | js/authority/wagashiSpecials2.js:263 |
| Buff duration | 180 | frames | js/authority/wagashiSpecials2.js:264 |

### magma_breaker (crimson_furnace_captain) (js/authority/wagashiSpecials2.js:293-329)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials2.js:295 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials2.js:321 |
| Range gate | 300 | px | js/authority/wagashiSpecials2.js:319 |
| Line points | 5 | — | js/authority/wagashiSpecials2.js:302 |
| Point spacing | 60 | px | js/authority/wagashiSpecials2.js:303 |
| Hit radius | 40 | px | js/authority/wagashiSpecials2.js:306 |
| Damage | 45 | hp | js/authority/wagashiSpecials2.js:307 |
| Telegraph line width | 24 | px | js/authority/wagashiSpecials2.js:325 |

### lightning_mark (azure_dragon boss) (js/authority/wagashiSpecials2.js:334-374)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials2.js:336 |
| Strike delay | 60 | frames | js/authority/wagashiSpecials2.js:371 |
| Range gate | 400 | px | js/authority/wagashiSpecials2.js:359 |
| Mark count (random) | 2-3 | — | js/authority/wagashiSpecials2.js:361 |
| Mark scatter range | ±60 | px | js/authority/wagashiSpecials2.js:364 |
| Strike radius | 80 | px | js/authority/wagashiSpecials2.js:342 |
| Damage | 55 | hp | js/authority/wagashiSpecials2.js:343 |
| Stun duration | 30 | frames | js/authority/wagashiSpecials2.js:346 |

### tidal_wave (azure_dragon boss) (js/authority/wagashiSpecials2.js:377-415)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials2.js:379 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials2.js:407 |
| Range gate | 400 | px | js/authority/wagashiSpecials2.js:405 |
| Bullet speed | 6 | px/frame | js/authority/wagashiSpecials2.js:387 |
| Bullet damage | 50 | hp | js/authority/wagashiSpecials2.js:388 |
| Push distance | 60 | px | js/authority/wagashiSpecials2.js:393 |
| Telegraph line width | 30 | px | js/authority/wagashiSpecials2.js:411 |

### cyclone_guard (azure_dragon boss) (js/authority/wagashiSpecials2.js:418-456)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials2.js:420 |
| Telegraph | 25 | frames | js/authority/wagashiSpecials2.js:450 |
| Active duration | 180 | frames | js/authority/wagashiSpecials2.js:445 |
| Aura radius | 120 | px | js/authority/wagashiSpecials2.js:426 |
| Damage | 20 | hp | js/authority/wagashiSpecials2.js:427 |
| Damage tick interval | 30 | frames | js/authority/wagashiSpecials2.js:425 |
| Speed multiplier while active | 0.5 | × | js/authority/wagashiSpecials2.js:444 |

### inferno_crash (jaja boss) (js/authority/wagashiSpecials2.js:459-484)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials2.js:461 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials2.js:478 |
| Range gate | 200 | px | js/authority/wagashiSpecials2.js:477 |
| AoE radius | 160 | px | js/authority/wagashiSpecials2.js:466 |
| Damage | 58 | hp | js/authority/wagashiSpecials2.js:467 |

### blazing_advance (jaja boss) (js/authority/wagashiSpecials2.js:487-555)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 330 | frames | js/authority/wagashiSpecials2.js:489 |
| Telegraph | 40 | frames | js/authority/wagashiSpecials2.js:547 |
| Range gate min | 120 | px | js/authority/wagashiSpecials2.js:545 |
| Range gate max | 350 | px | js/authority/wagashiSpecials2.js:545 |
| Dash duration | 20 | frames | js/authority/wagashiSpecials2.js:540 |
| Max dash dist | 320 | px | js/authority/wagashiSpecials2.js:537 |
| Dash hit radius | 50 | px | js/authority/wagashiSpecials2.js:522 |
| Dash damage | 55 | hp | js/authority/wagashiSpecials2.js:523 |
| Fire trail zone duration | 120 | frames | js/authority/wagashiSpecials2.js:518 |
| Fire trail drop interval | 5 | frames | js/authority/wagashiSpecials2.js:516 |
| Fire trail tick interval | 30 | frames | js/authority/wagashiSpecials2.js:495 |
| Fire trail radius | 50 | px | js/authority/wagashiSpecials2.js:497 |
| Fire trail tick damage | 10 | hp | js/authority/wagashiSpecials2.js:498 |

### ember_mantle (jaja boss) (js/authority/wagashiSpecials2.js:558-593)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials2.js:560 |
| Telegraph | 20 | frames | js/authority/wagashiSpecials2.js:587 |
| Active duration | 240 | frames | js/authority/wagashiSpecials2.js:581 |
| Aura radius | 100 | px | js/authority/wagashiSpecials2.js:566 |
| Damage tick interval | 30 | frames | js/authority/wagashiSpecials2.js:565 |
| Damage per tick | 12 | hp | js/authority/wagashiSpecials2.js:567 |

### draw_cut (ashen_blade_retainer) (js/authority/wagashiSpecials2.js:598-636)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 180 | frames | js/authority/wagashiSpecials2.js:600 |
| Telegraph | 25 | frames | js/authority/wagashiSpecials2.js:629 |
| Range gate | 150 | px | js/authority/wagashiSpecials2.js:627 |
| Line length | 120 | px | js/authority/wagashiSpecials2.js:607 |
| Line points | 3 | — | js/authority/wagashiSpecials2.js:611 |
| Point spacing | 40 | px | js/authority/wagashiSpecials2.js:612 |
| Hit radius | 30 | px | js/authority/wagashiSpecials2.js:615 |
| Damage | 45 | hp | js/authority/wagashiSpecials2.js:616 |
| Telegraph line width | 20 | px | js/authority/wagashiSpecials2.js:633 |
| Out-of-range retry | 20 | frames | js/authority/wagashiSpecials2.js:627 |

### afterimage_dash (lantern_veil_assassin) (js/authority/wagashiSpecials2.js:639-672)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials2.js:641 |
| Range gate min | 80 | px | js/authority/wagashiSpecials2.js:663 |
| Range gate max | 280 | px | js/authority/wagashiSpecials2.js:663 |
| Dash duration | 18 | frames | js/authority/wagashiSpecials2.js:669 |
| Overshoot past player | 80 | px | js/authority/wagashiSpecials2.js:666 |
| Hit radius | 50 | px | js/authority/wagashiSpecials2.js:649 |
| Damage | 42 | hp | js/authority/wagashiSpecials2.js:650 |

### blood_seal_shot (blood_script_archer) (js/authority/wagashiSpecials2.js:675-719)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials2.js:677 |
| Arrow flight timer | 60 | frames | js/authority/wagashiSpecials2.js:717 |
| AoE delay after landing | 45 | frames | js/authority/wagashiSpecials2.js:697 |
| Range gate | 400 | px | js/authority/wagashiSpecials2.js:705 |
| Bullet speed | 7 | px/frame | js/authority/wagashiSpecials2.js:712 |
| Bullet damage | 20 | hp | js/authority/wagashiSpecials2.js:713 |
| AoE radius | 50 | px | js/authority/wagashiSpecials2.js:682 |
| AoE damage | 40 | hp | js/authority/wagashiSpecials2.js:683 |

### judgment_drop (crimson_gate_executioner) (js/authority/wagashiSpecials2.js:722-759)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials2.js:724 |
| Telegraph | 55 | frames | js/authority/wagashiSpecials2.js:751 |
| Range gate | 200 | px | js/authority/wagashiSpecials2.js:749 |
| Line points | 3 | — | js/authority/wagashiSpecials2.js:732 |
| Point spacing | 50 | px | js/authority/wagashiSpecials2.js:733 |
| Hit radius | 40 | px | js/authority/wagashiSpecials2.js:736 |
| Damage | 48 | hp | js/authority/wagashiSpecials2.js:737 |
| Telegraph line width | 26 | px | js/authority/wagashiSpecials2.js:755 |

### dust_pop (lunar_dust_hare) (js/authority/wagashiSpecials2.js:762-789)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 180 | frames | js/authority/wagashiSpecials2.js:764 |
| Teleport min dist | 100 | px | js/authority/wagashiSpecials2.js:771 |
| Teleport max dist | 200 | px | js/authority/wagashiSpecials2.js:771 |
| Position attempts | 10 | — | js/authority/wagashiSpecials2.js:768 |
| Burst radius | 60 | px | js/authority/wagashiSpecials2.js:780 |
| Damage | 38 | hp | js/authority/wagashiSpecials2.js:781 |

### mirror_split (crescent_mirror_wisp) (js/authority/wagashiSpecials2.js:792-817)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials2.js:794 |
| Range gate | 300 | px | js/authority/wagashiSpecials2.js:796 |
| Decoy offset distance | 80 | px | js/authority/wagashiSpecials2.js:799 |
| Decoy angle offset | ±π/3 | rad | js/authority/wagashiSpecials2.js:798 |
| Bullet speed | GAME_CONFIG.BULLET_SPEED | px/frame | js/authority/wagashiSpecials2.js:810 |
| Bullet damage | 35 | hp | js/authority/wagashiSpecials2.js:811 |

### gravity_press (gravity_ear_monk) (js/authority/wagashiSpecials2.js:820-861)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials2.js:822 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials2.js:855 |
| Range gate | 250 | px | js/authority/wagashiSpecials2.js:852 |
| Zone active duration | 180 | frames | js/authority/wagashiSpecials2.js:839 |
| Zone radius | 70 | px | js/authority/wagashiSpecials2.js:827 |
| Slow duration | 60 | frames | js/authority/wagashiSpecials2.js:828 |
| Slow amount | 0.5 | × | js/authority/wagashiSpecials2.js:828 |
| Initial damage | 15 | hp | js/authority/wagashiSpecials2.js:842 |

### rift_leap (eclipse_burrower) (js/authority/wagashiSpecials2.js:864-905)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials2.js:866 |
| Telegraph (invisible) | 35 | frames | js/authority/wagashiSpecials2.js:899 |
| Reappear delay | 5 | frames | js/authority/wagashiSpecials2.js:889 |
| Range gate min | 120 | px | js/authority/wagashiSpecials2.js:894 |
| Range gate max | 350 | px | js/authority/wagashiSpecials2.js:894 |
| Hit radius | 50 | px | js/authority/wagashiSpecials2.js:875 |
| Damage | 45 | hp | js/authority/wagashiSpecials2.js:876 |

### shadow_step (gensai boss) (js/authority/wagashiSpecials2.js:910-959)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials2.js:912 |
| Telegraph | 20 | frames | js/authority/wagashiSpecials2.js:954 |
| Slash delay after teleport | 10 | frames | js/authority/wagashiSpecials2.js:943 |
| Range gate min | 100 | px | js/authority/wagashiSpecials2.js:948 |
| Range gate max | 350 | px | js/authority/wagashiSpecials2.js:948 |
| Teleport offset (behind) | 50 | px | js/authority/wagashiSpecials2.js:933 |
| Hit radius | 60 | px | js/authority/wagashiSpecials2.js:917 |
| Damage | 58 | hp | js/authority/wagashiSpecials2.js:918 |

### blood_crescent (gensai boss) (js/authority/wagashiSpecials2.js:962-992)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials2.js:964 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials2.js:984 |
| Range gate | 400 | px | js/authority/wagashiSpecials2.js:982 |
| Bullet speed | 10 | px/frame | js/authority/wagashiSpecials2.js:972 |
| Bullet damage | 55 | hp | js/authority/wagashiSpecials2.js:973 |
| Telegraph line length | 400 | px | js/authority/wagashiSpecials2.js:986 |
| Telegraph line width | 20 | px | js/authority/wagashiSpecials2.js:988 |

### demon_cleaver (gensai boss) (js/authority/wagashiSpecials2.js:995-1021)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials2.js:997 |
| Telegraph | 60 | frames | js/authority/wagashiSpecials2.js:1015 |
| Range gate | 180 | px | js/authority/wagashiSpecials2.js:1013 |
| Cone half-angle | π/4 | rad (45°) | js/authority/wagashiSpecials2.js:1003 |
| Cone range | 150 | px | js/authority/wagashiSpecials2.js:1003 |
| Damage | 65 | hp | js/authority/wagashiSpecials2.js:1004 |

### gravity_well (moon_rabbit boss) (js/authority/wagashiSpecials2.js:1024-1070)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 330 | frames | js/authority/wagashiSpecials2.js:1026 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials2.js:1064 |
| Active duration | 120 | frames | js/authority/wagashiSpecials2.js:1055 |
| Range gate | 350 | px | js/authority/wagashiSpecials2.js:1061 |
| Pull radius | 100 | px | js/authority/wagashiSpecials2.js:1032 |
| Pull speed | 2 | px/frame | js/authority/wagashiSpecials2.js:1035 |
| Damage tick interval | 30 | frames | js/authority/wagashiSpecials2.js:1040 |
| Damage per tick | 5 | hp | js/authority/wagashiSpecials2.js:1041 |

### moon_rift_orb (moon_rabbit boss) (js/authority/wagashiSpecials2.js:1073-1099)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials2.js:1075 |
| Range gate | 400 | px | js/authority/wagashiSpecials2.js:1077 |
| Bullet speed | 3.6 | px/frame | js/authority/wagashiSpecials2.js:1083 |
| Bullet life | 90 | frames | js/authority/wagashiSpecials2.js:1085 |
| Impact damage | 15 | hp | js/authority/wagashiSpecials2.js:1084 |
| Expire AoE radius | 80 | px | js/authority/wagashiSpecials2.js:1088 |
| Expire AoE damage | 60 | hp | js/authority/wagashiSpecials2.js:1089 |

### phase_skip (moon_rabbit boss) (js/authority/wagashiSpecials2.js:1102-1154)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials2.js:1104 |
| Invisible duration | 20 | frames | js/authority/wagashiSpecials2.js:1152 |
| Reappear delay | 10 | frames | js/authority/wagashiSpecials2.js:1138 |
| Teleport dist min | 150 | px | js/authority/wagashiSpecials2.js:1129 |
| Teleport dist max | 300 | px | js/authority/wagashiSpecials2.js:1129 |
| Departure burst radius | 70 | px | js/authority/wagashiSpecials2.js:1145 |
| Departure damage | 40 | hp | js/authority/wagashiSpecials2.js:1146 |
| Arrival burst radius | 70 | px | js/authority/wagashiSpecials2.js:1110 |
| Arrival damage | 40 | hp | js/authority/wagashiSpecials2.js:1111 |

## Behavior

Same pattern as Part 1: each ability owns its state (`_<name>Tele`, `_<name>Timer`, `_<name>Dashing`) on the mob instance. Phase transitions proceed telegraph → execution → cooldown. Dash abilities interpolate `m.x`/`m.y` each frame via `t = 1 - (timer/duration)`.

Special patterns in Part 2:
- `charged_burst_arrow` uses a two-stage delay: arrow fires immediately at telegraph end, then sets `_burstAoeTele = 20` to schedule the delayed AoE at the stored target position (js/authority/wagashiSpecials2.js:88-90).
- `blood_seal_shot` has a THREE-phase flow: arrow flight timer (60f) → on landing, set telegraph (45f) → AoE damage (js/authority/wagashiSpecials2.js:693-702).
- `lightning_mark` telegraphs 2-3 random marks around the player at once and strikes them all on expiry (js/authority/wagashiSpecials2.js:341-352).
- `cyclone_guard` halves the boss's `m.speed` while active via `m.speed = Math.round(m.speed * 0.5)` and restores from `m._cycloneOrigSpeed` (js/authority/wagashiSpecials2.js:443-444, 434).
- `blazing_advance` drops fire zones every 5 frames during the dash (js/authority/wagashiSpecials2.js:516).
- `moon_rift_orb` uses the bullet `onExpire` callback to trigger a delayed AoE rather than tracking state on the mob (js/authority/wagashiSpecials2.js:1086-1094).
- `phase_skip` and `dust_pop` retry position sampling up to 10 times with `positionClear` before giving up (js/authority/wagashiSpecials2.js:768, :1126).

## Dependencies

- Reads: `player.x`, `player.y`, `m.hp`, `m.speed`, `dist`, `GAME_CONFIG.BULLET_SPEED`
- Writes: `bullets[]`, `hitEffects[]`, `mobs[]`, `player.x`/`player.y` (push in tidal_wave, pull in gravity_well)
- Calls: `dealDamageToPlayer`, `getMobDamageMultiplier`, `positionClear`, `clampDashTarget`, `StatusFX.applyToPlayer`, `TelegraphSystem.create`, `AttackShapes.hitsPlayer`, `AttackShapes.playerInCone`
- Uses global: `nextBulletId`

## Edge cases

- `cinder_step` has NO telegraph phase — it starts dashing immediately when conditions met (js/authority/wagashiSpecials2.js:208-215).
- `dust_pop` has NO telegraph phase (js/authority/wagashiSpecials2.js:765) — the teleport and burst happen on the same frame as the CD expiry.
- `mirror_split` has NO telegraph phase (js/authority/wagashiSpecials2.js:795) — fires instantly.
- `moon_rift_orb` has NO telegraph phase (js/authority/wagashiSpecials2.js:1076) — fires instantly, relies on bullet travel for warning.
- `tidal_wave` uses the `onHitPlayer` callback to push the target AWAY from the mob's position at the time of spawn (stored via closure on `m.x`/`m.y`), not the bullet's current position (js/authority/wagashiSpecials2.js:392).
- `blood_seal_shot` fires the arrow visually but damage only applies via the delayed AoE — the fired bullet itself has damage 20 and still hits on direct collision (js/authority/wagashiSpecials2.js:713).
- `lightning_mark` breaks after first hit — multiple overlapping marks still deal damage only once per strike (js/authority/wagashiSpecials2.js:347).
- `shadow_step` falls back to teleporting directly onto the player if the behind-position is blocked (js/authority/wagashiSpecials2.js:939-941).
- `gravity_well` does not return `skip` during the active phase — boss can still move while the well is pulling (js/authority/wagashiSpecials2.js:1049).
- `ember_mantle` does not return `skip` during the active aura — boss can still move (js/authority/wagashiSpecials2.js:575).
- `phase_skip` uses `m._phaseOldX`/`m._phaseOldY` as the CENTER of the teleport radius (js/authority/wagashiSpecials2.js:1130) — so successive phase skips expand outward from the original departure point.
