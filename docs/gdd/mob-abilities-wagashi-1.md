# Mob Abilities — Wagashi (Dungeon 5, Floors 1-2)

Part 1 of 3. See also `mob-abilities-wagashi-2.md` (Floors 3-4) and `mob-abilities-wagashi-3.md` (Floor 5 + Lord Sarugami).

## Source of truth

- `js/authority/wagashiSpecials.js` — Floor 1 + Floor 2 specials (28 abilities)
- `js/authority/wagashiSpecials2.js` — Floor 3 + Floor 4 specials (28 abilities)
- `js/authority/wagashiSpecials3.js` — Floor 5 specials + Lord Sarugami boss (14 abilities)

All abilities register functions on the global `MOB_SPECIALS` registry defined in `js/authority/combatSystem.js`. Every ability receives `(m, ctx)` where `ctx = { player, dist, hitEffects, bullets, mobs }`.

## Purpose

Defines all 28 Wagashi (Heavenly Realm / Asian mythology) Floor 1 and Floor 2 mob specials — the per-frame behavior functions that govern telegraph, execution, damage, status effects, summons, and buff phases. All damage values are scaled by `getMobDamageMultiplier()`. All durations are in frames (60 fps).

## Values

### Common ability parameters (Floor 1 regular specials)

| Ability | Mob | CD (f) | Telegraph (f) | Range gate | Damage | Citation (CD/tele/damage) |
|---|---|---|---|---|---|---|
| snap_web | silk_skitterer | 180 | 40 | dist<=300 | 25 (bullet) | js/authority/wagashiSpecials.js:10, :33, :18 |
| silk_needle_fan | needleback_weaver | 210 | 50 | dist<=320 | 18 (×3 bullets) | js/authority/wagashiSpecials.js:45, :68, :56 |
| brood_glow | brood_lantern_mite | 300 | 30 | dist<=400 | buff only | js/authority/wagashiSpecials.js:78, :112, — |
| wrap_tomb | silk_coffin_widow | 240 | 60 | dist<=250 | 20 + root | js/authority/wagashiSpecials.js:122, :141, :128 |
| metal_skull_bash | copperhide_hoglet | 200 | 35 | 80<=dist<=200 | 30 | js/authority/wagashiSpecials.js:151, :188, :160 |
| dust_rush | tusk_raider | 180 | 0 (dash immediate) | 100<=dist<=280 | 25 | js/authority/wagashiSpecials.js:200, —, :208 |
| armor_brace | bronzeback_crusher | 360 | 25 | dist<=300 | heal 30% maxHp | js/authority/wagashiSpecials.js:232, :246, :237 |
| battle_beat | warboar_drummer | 300 | 30 | dist<=400 | buff only | js/authority/wagashiSpecials.js:257, :290, — |

### snap_web (js/authority/wagashiSpecials.js:8-40)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 180 | frames | js/authority/wagashiSpecials.js:10 |
| Telegraph | 40 | frames | js/authority/wagashiSpecials.js:33 |
| Range gate | 300 | px | js/authority/wagashiSpecials.js:31 |
| Bullet speed | 9 | px/frame | js/authority/wagashiSpecials.js:17 |
| Bullet damage | 25 | hp | js/authority/wagashiSpecials.js:18 |
| On-hit slow duration | 90 | frames | js/authority/wagashiSpecials.js:21 |
| On-hit slow amount | 0.5 | multiplier | js/authority/wagashiSpecials.js:21 |
| Telegraph line width | 12 | px | js/authority/wagashiSpecials.js:37 |
| Telegraph line length | 300 | px | js/authority/wagashiSpecials.js:35 |
| Telegraph color | [200,200,220] | RGB | js/authority/wagashiSpecials.js:37 |
| Retry cooldown (out of range) | 30 | frames | js/authority/wagashiSpecials.js:31 |

### silk_needle_fan (js/authority/wagashiSpecials.js:43-73)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials.js:45 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials.js:68 |
| Range gate | 320 | px | js/authority/wagashiSpecials.js:66 |
| Spread angle (between bullets) | 20 | degrees | js/authority/wagashiSpecials.js:50 |
| Bullet count | 3 | — | js/authority/wagashiSpecials.js:51 |
| Bullet speed | 7 | px/frame | js/authority/wagashiSpecials.js:55 |
| Bullet damage (each) | 18 | hp | js/authority/wagashiSpecials.js:56 |
| Telegraph cone angle | 40 | degrees | js/authority/wagashiSpecials.js:70 |
| Telegraph cone range | 320 | px | js/authority/wagashiSpecials.js:70 |

### brood_glow (js/authority/wagashiSpecials.js:76-117)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials.js:78 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials.js:112 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:111 |
| Ally buff radius | 200 | px | js/authority/wagashiSpecials.js:86 |
| Ally speed multiplier | 1.3 | × | js/authority/wagashiSpecials.js:89 |
| Ally buff duration | 180 | frames | js/authority/wagashiSpecials.js:91 |
| Telegraph circle radius | 200 | px | js/authority/wagashiSpecials.js:114 |

### wrap_tomb (js/authority/wagashiSpecials.js:120-146)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials.js:122 |
| Telegraph | 60 | frames | js/authority/wagashiSpecials.js:141 |
| Range gate | 250 | px | js/authority/wagashiSpecials.js:138 |
| Detonation radius | 60 | px | js/authority/wagashiSpecials.js:127 |
| Damage | 20 | hp | js/authority/wagashiSpecials.js:128 |
| Root duration | 60 | frames | js/authority/wagashiSpecials.js:130 |

### metal_skull_bash (js/authority/wagashiSpecials.js:149-195)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 200 | frames | js/authority/wagashiSpecials.js:151 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials.js:188 |
| Range gate min | 80 | px | js/authority/wagashiSpecials.js:186 |
| Range gate max | 200 | px | js/authority/wagashiSpecials.js:186 |
| Dash duration | 14 | frames | js/authority/wagashiSpecials.js:180 |
| Max dash dist | 180 | px | js/authority/wagashiSpecials.js:177 |
| Hit radius | 48 | px | js/authority/wagashiSpecials.js:159 |
| Damage | 30 | hp | js/authority/wagashiSpecials.js:160 |
| Knockback magnitude | 3.5 | px/frame | js/authority/wagashiSpecials.js:165 |
| Telegraph line width | 24 | px | js/authority/wagashiSpecials.js:192 |

### dust_rush (js/authority/wagashiSpecials.js:198-227)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 180 | frames | js/authority/wagashiSpecials.js:200 |
| Range gate min | 100 | px | js/authority/wagashiSpecials.js:218 |
| Range gate max | 280 | px | js/authority/wagashiSpecials.js:218 |
| Max dash dist | 250 | px | js/authority/wagashiSpecials.js:220 |
| Dash duration | 16 | frames | js/authority/wagashiSpecials.js:223 |
| Hit radius | 48 | px | js/authority/wagashiSpecials.js:207 |
| Damage | 25 | hp | js/authority/wagashiSpecials.js:208 |
| Dust cloud life | 60 | frames | js/authority/wagashiSpecials.js:225 |

### armor_brace (js/authority/wagashiSpecials.js:230-252)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials.js:232 |
| Telegraph | 25 | frames | js/authority/wagashiSpecials.js:246 |
| Range gate | 300 | px | js/authority/wagashiSpecials.js:245 |
| Heal fraction | 0.3 | × maxHp | js/authority/wagashiSpecials.js:237 |
| Telegraph circle radius | 40 | px | js/authority/wagashiSpecials.js:248 |

### battle_beat (js/authority/wagashiSpecials.js:255-295)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials.js:257 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials.js:290 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:289 |
| Buff radius | 200 | px | js/authority/wagashiSpecials.js:264 |
| Damage multiplier | 1.3 | × | js/authority/wagashiSpecials.js:267 |
| Buff duration | 180 | frames | js/authority/wagashiSpecials.js:269 |

### silk_snare (sichou boss) (js/authority/wagashiSpecials.js:300-349)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials.js:302 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials.js:340 |
| Range gate | 350 | px | js/authority/wagashiSpecials.js:337 |
| Web count | 3 | — | js/authority/wagashiSpecials.js:324 |
| Web base distance | 40 | px | js/authority/wagashiSpecials.js:326 |
| Web random distance | 0-60 | px | js/authority/wagashiSpecials.js:326 |
| Web trigger radius | 50 | px | js/authority/wagashiSpecials.js:311 |
| Web lifetime | 300 | frames | js/authority/wagashiSpecials.js:329 |
| Web damage | 30 | hp | js/authority/wagashiSpecials.js:312 |
| Web root duration | 45 | frames | js/authority/wagashiSpecials.js:314 |

### thread_shot (sichou boss) (js/authority/wagashiSpecials.js:352-384)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 180 | frames | js/authority/wagashiSpecials.js:354 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials.js:377 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:375 |
| Bullet speed | 10 | px/frame | js/authority/wagashiSpecials.js:361 |
| Bullet damage | 35 | hp | js/authority/wagashiSpecials.js:362 |
| Slow duration | 120 | frames | js/authority/wagashiSpecials.js:365 |
| Slow amount | 0.4 | multiplier | js/authority/wagashiSpecials.js:365 |

### brood_call (sichou boss) (js/authority/wagashiSpecials.js:387-429)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 600 | frames | js/authority/wagashiSpecials.js:389 |
| Telegraph | 60 | frames | js/authority/wagashiSpecials.js:423 |
| Minion count (random) | 2-3 | — | js/authority/wagashiSpecials.js:393 |
| Max active minions | 6 | — | js/authority/wagashiSpecials.js:395 |
| Spawn radius | 60 | px | js/authority/wagashiSpecials.js:399 |
| Minion type | silk_skitterer | — | js/authority/wagashiSpecials.js:402 |
| Minion hp | 8% of parent maxHp | — | js/authority/wagashiSpecials.js:403 |
| Minion speed | 2.1 | px/frame | js/authority/wagashiSpecials.js:404 |
| Minion damage | 30% of parent damage | — | js/authority/wagashiSpecials.js:404 |
| Minion scale | 0.7 | × | js/authority/wagashiSpecials.js:412 |

### titan_charge (tongya boss) (js/authority/wagashiSpecials.js:432-476)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials.js:434 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials.js:469 |
| Range gate min | 100 | px | js/authority/wagashiSpecials.js:467 |
| Range gate max | 400 | px | js/authority/wagashiSpecials.js:467 |
| Dash duration | 20 | frames | js/authority/wagashiSpecials.js:461 |
| Max dash dist | 360 | px | js/authority/wagashiSpecials.js:458 |
| Hit radius | 60 | px | js/authority/wagashiSpecials.js:441 |
| Damage | 50 | hp | js/authority/wagashiSpecials.js:442 |
| Knockback magnitude | 7 | px/frame | js/authority/wagashiSpecials.js:447 |
| Telegraph line width | 30 | px | js/authority/wagashiSpecials.js:473 |

### war_stomp (tongya boss) (js/authority/wagashiSpecials.js:479-503)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials.js:481 |
| Telegraph | 40 | frames | js/authority/wagashiSpecials.js:497 |
| Range gate | 180 | px | js/authority/wagashiSpecials.js:496 |
| AoE radius | 150 | px | js/authority/wagashiSpecials.js:485 |
| Damage | 45 | hp | js/authority/wagashiSpecials.js:486 |

### boar_fury (tongya boss) (js/authority/wagashiSpecials.js:506-541)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 420 | frames | js/authority/wagashiSpecials.js:508 |
| Telegraph | 20 | frames | js/authority/wagashiSpecials.js:536 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:535 |
| Active duration | 240 | frames | js/authority/wagashiSpecials.js:527 |
| Speed multiplier | 1.5 | × | js/authority/wagashiSpecials.js:525 |
| Special CD multiplier | 0.6 | × | js/authority/wagashiSpecials.js:526 |

### venom_arc (temple_fang_acolyte) (js/authority/wagashiSpecials.js:546-571)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 200 | frames | js/authority/wagashiSpecials.js:548 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials.js:566 |
| Range gate | 200 | px | js/authority/wagashiSpecials.js:564 |
| Cone half-angle | π/6 | rad (30°) | js/authority/wagashiSpecials.js:553 |
| Cone range | 120 | px | js/authority/wagashiSpecials.js:553 |
| Damage | 30 | hp | js/authority/wagashiSpecials.js:554 |
| Poison duration | 120 | frames | js/authority/wagashiSpecials.js:557 |
| Poison dmg per tick | 3 | hp | js/authority/wagashiSpecials.js:557 |

### jade_flash (jade_idol_watcher) (js/authority/wagashiSpecials.js:574-599)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials.js:576 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials.js:594 |
| Range gate | 160 | px | js/authority/wagashiSpecials.js:592 |
| Cone half-angle | π/4 | rad (45°) | js/authority/wagashiSpecials.js:581 |
| Cone range | 140 | px | js/authority/wagashiSpecials.js:581 |
| Damage | 20 | hp | js/authority/wagashiSpecials.js:582 |
| Slow duration | 90 | frames | js/authority/wagashiSpecials.js:585 |
| Slow amount | 0.4 | × | js/authority/wagashiSpecials.js:585 |

### snake_call (coil_priestess) (js/authority/wagashiSpecials.js:602-640)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 480 | frames | js/authority/wagashiSpecials.js:604 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials.js:634 |
| Max minions | 3 | — | js/authority/wagashiSpecials.js:609 |
| Spawn distance | 50 | px | js/authority/wagashiSpecials.js:611 |
| Minion type | temple_fang_acolyte | — | js/authority/wagashiSpecials.js:614 |
| Minion hp | 15% of parent maxHp | — | js/authority/wagashiSpecials.js:615 |
| Minion speed | 2.1 | px/frame | js/authority/wagashiSpecials.js:616 |
| Minion damage | 40% of parent damage | — | js/authority/wagashiSpecials.js:616 |
| Minion scale | 0.7 | × | js/authority/wagashiSpecials.js:624 |

### petrify_glint (jade_vein_stalker) (js/authority/wagashiSpecials.js:643-669)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials.js:645 |
| Mark duration | 90 | frames | js/authority/wagashiSpecials.js:664 |
| Initial range gate | 300 | px | js/authority/wagashiSpecials.js:663 |
| Stun check range | 350 | px | js/authority/wagashiSpecials.js:652 |
| Damage | 25 | hp | js/authority/wagashiSpecials.js:653 |
| Stun duration | 45 | frames | js/authority/wagashiSpecials.js:655 |

### rubble_toss (rubblebound_sentinel) (js/authority/wagashiSpecials.js:672-698)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 210 | frames | js/authority/wagashiSpecials.js:674 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials.js:693 |
| Range gate | 350 | px | js/authority/wagashiSpecials.js:690 |
| Impact radius | 60 | px | js/authority/wagashiSpecials.js:679 |
| Damage | 35 | hp | js/authority/wagashiSpecials.js:680 |

### ground_split (pillarbreaker_brute) (js/authority/wagashiSpecials.js:701-744)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials.js:703 |
| Telegraph | 45 | frames | js/authority/wagashiSpecials.js:736 |
| Range gate | 300 | px | js/authority/wagashiSpecials.js:733 |
| Line points checked | 5 | — | js/authority/wagashiSpecials.js:710 |
| Point spacing | 60 | px | js/authority/wagashiSpecials.js:711 |
| Point hit radius | 40 | px | js/authority/wagashiSpecials.js:714 |
| Damage | 38 | hp | js/authority/wagashiSpecials.js:720 |
| Telegraph line width | 28 | px | js/authority/wagashiSpecials.js:740 |
| Telegraph line length | 300 | px | js/authority/wagashiSpecials.js:738 |

### stone_ward (dustcore_totem) (js/authority/wagashiSpecials.js:747-774)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 300 | frames | js/authority/wagashiSpecials.js:749 |
| Telegraph | 35 | frames | js/authority/wagashiSpecials.js:769 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:768 |
| Heal radius | 200 | px | js/authority/wagashiSpecials.js:756 |
| Heal amount | 10% of ally maxHp | — | js/authority/wagashiSpecials.js:757 |

### aftershock_ring (mausoleum_warden) (js/authority/wagashiSpecials.js:777-821)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials.js:779 |
| Telegraph phase 1 | 50 | frames | js/authority/wagashiSpecials.js:815 |
| Phase 2 delay | 30 | frames | js/authority/wagashiSpecials.js:809 |
| Range gate | 250 | px | js/authority/wagashiSpecials.js:814 |
| Initial hit radius | 80 | px | js/authority/wagashiSpecials.js:801 |
| Initial damage | 25 | hp | js/authority/wagashiSpecials.js:802 |
| Ring inner radius | 80 | px | js/authority/wagashiSpecials.js:786 |
| Ring outer radius | 150 | px | js/authority/wagashiSpecials.js:786 |
| Ring damage | 35 | hp | js/authority/wagashiSpecials.js:787 |

### jade_glare (jade_serpent boss) (js/authority/wagashiSpecials.js:826-864)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials.js:828 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials.js:856 |
| Range gate | 350 | px | js/authority/wagashiSpecials.js:853 |
| Beam length | 350 | px | js/authority/wagashiSpecials.js:833 |
| Beam width (line hit check) | 30 | px | js/authority/wagashiSpecials.js:836 |
| Fallback hit radius | 100 | px | js/authority/wagashiSpecials.js:842 |
| Damage | 40 | hp | js/authority/wagashiSpecials.js:837 |
| Stun duration | 50 | frames | js/authority/wagashiSpecials.js:840 |
| Telegraph line width | 24 | px | js/authority/wagashiSpecials.js:860 |

### serpent_swarm (jade_serpent boss) (js/authority/wagashiSpecials.js:867-908)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 600 | frames | js/authority/wagashiSpecials.js:869 |
| Telegraph | 55 | frames | js/authority/wagashiSpecials.js:902 |
| Max minions | 8 | — | js/authority/wagashiSpecials.js:874 |
| Spawn count | 3 | — | js/authority/wagashiSpecials.js:875 |
| Spawn radius | 70 | px | js/authority/wagashiSpecials.js:877 |
| Minion type | temple_fang_acolyte | — | js/authority/wagashiSpecials.js:881 |
| Minion hp | 6% of parent maxHp | — | js/authority/wagashiSpecials.js:882 |
| Minion speed | 2.3 | px/frame | js/authority/wagashiSpecials.js:883 |
| Minion damage | 30% of parent damage | — | js/authority/wagashiSpecials.js:883 |
| Minion scale | 0.65 | × | js/authority/wagashiSpecials.js:891 |

### jade_spires (jade_serpent boss) (js/authority/wagashiSpecials.js:911-949)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials.js:913 |
| Telegraph | 55 | frames | js/authority/wagashiSpecials.js:941 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:938 |
| Line points | 4 | — | js/authority/wagashiSpecials.js:920 |
| Point spacing | 80 | px | js/authority/wagashiSpecials.js:921 |
| Hit radius | 40 | px | js/authority/wagashiSpecials.js:924 |
| Damage | 35 | hp | js/authority/wagashiSpecials.js:925 |
| Telegraph line width | 30 | px | js/authority/wagashiSpecials.js:945 |
| Telegraph line length | 320 | px | js/authority/wagashiSpecials.js:943 |

### earthbreaker_slam (stone_golem_guardian boss) (js/authority/wagashiSpecials.js:952-979)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 240 | frames | js/authority/wagashiSpecials.js:954 |
| Telegraph | 50 | frames | js/authority/wagashiSpecials.js:973 |
| Range gate | 200 | px | js/authority/wagashiSpecials.js:972 |
| AoE radius | 160 | px | js/authority/wagashiSpecials.js:958 |
| Damage | 50 | hp | js/authority/wagashiSpecials.js:959 |
| Knockback magnitude | 5.6 | px/frame | js/authority/wagashiSpecials.js:964 |

### boulder_hurl (stone_golem_guardian boss) (js/authority/wagashiSpecials.js:982-1012)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 270 | frames | js/authority/wagashiSpecials.js:984 |
| Telegraph | 60 | frames | js/authority/wagashiSpecials.js:1004 |
| Range gate min | 150 | px | js/authority/wagashiSpecials.js:1001 |
| Bullet speed | 7 | px/frame | js/authority/wagashiSpecials.js:991 |
| Bullet damage | 55 | hp | js/authority/wagashiSpecials.js:992 |
| Telegraph line length | 400 | px | js/authority/wagashiSpecials.js:1006 |
| Telegraph line width | 24 | px | js/authority/wagashiSpecials.js:1008 |

### stonehide (stone_golem_guardian boss) (js/authority/wagashiSpecials.js:1015-1036)

| Name | Value | Units | Citation |
|---|---|---|---|
| Cooldown | 360 | frames | js/authority/wagashiSpecials.js:1017 |
| Telegraph | 30 | frames | js/authority/wagashiSpecials.js:1030 |
| Range gate | 400 | px | js/authority/wagashiSpecials.js:1029 |
| Heal fraction | 0.25 | × maxHp | js/authority/wagashiSpecials.js:1021 |

## Behavior

All abilities follow a common pattern implemented independently by each function:
1. Initialize `m._specialTimer` to `m._specialCD` on first call (each ability cites its default CD).
2. If a state flag is set (`_<ability>Tele`, `_<ability>Dashing`, active timer), tick it and execute phase behavior — usually returns `{ skip: true }` to skip normal movement.
3. If timer > 0, decrement and return `{}` (normal movement allowed).
4. If out of range, set timer to retry cooldown (usually 30) and return `{}`.
5. Otherwise, start telegraph phase by setting the `_tele` state and creating `TelegraphSystem.create(...)`.
6. On telegraph expiry, compute damage via `Math.round(BASE * getMobDamageMultiplier())`, call `dealDamageToPlayer(dmg, 'mob_special', m)`, push `hitEffects` entries, and reset `_specialTimer`.

Dash-type abilities (metal_skull_bash, dust_rush, titan_charge, metal path dashes) interpolate position `m.x = sx + (tx - sx) * t` where `t = 1 - (timer / duration)` — see metal_skull_bash at js/authority/wagashiSpecials.js:155-157 as reference.

Summon abilities (brood_call, snake_call, serpent_swarm) push new mob objects directly into `mobs[]` with full mob schema fields and set `_summonOwnerId: m.id` for tracking active minion count.

Buff abilities (brood_glow, battle_beat, stone_ward) iterate `mobs[]` and set `_speedBoosted`/`_dmgBoosted` flags with `_glowBuffTimer`/`_dmgBoostTimer` countdowns; the same ability function also ticks down these timers on all mobs during its per-frame call (see js/authority/wagashiSpecials.js:101-108, :279-286).

## Dependencies

- Reads: `player.x`, `player.y`, `m.hp`, `m.maxHp`, `m.damage`, `m.speed` (GameState)
- Reads: `MOB_TYPES[m.type].hp` (from js/shared/mobTypes.js) — used by armor_brace at js/authority/wagashiSpecials.js:236
- Reads: `GAME_CONFIG.BULLET_SPEED` — not used in Part 1
- Writes: `bullets[]`, `mobs[]`, `hitEffects[]`, `player.x`/`player.y` (for pulls)
- Calls: `dealDamageToPlayer`, `getMobDamageMultiplier`, `applyKnockback`, `positionClear`, `clampDashTarget`, `StatusFX.applyToPlayer`, `TelegraphSystem.create`, `AttackShapes.hitsPlayer`, `AttackShapes.playerInCone`, `AttackShapes.playerInLine`
- Uses global: `nextBulletId`, `nextMobId`, `gameFrame`

## Edge cases

- `brood_glow` and `battle_beat` tick their own buff timers every frame the ability function runs — if the mob dies before buff expiry, the buffed allies retain the buffed stats until another tick happens (potential orphan bug; not handled here).
- `armor_brace` clamps to `m.maxHp` via `Math.min(m.hp + Math.floor(maxHp * 0.3), m.maxHp)` — note it uses `MOB_TYPES[m.type].hp` for the addition but `m.maxHp` as the cap, which can differ if the mob has been scaled (js/authority/wagashiSpecials.js:236-237).
- `petrify_glint` sets `m._specialTimer = 0` at cast time so the next iteration can immediately process the mark tick, relying on the mark countdown to gate the stun (js/authority/wagashiSpecials.js:667).
- `aftershock_ring` is a two-phase ability — the ring damages only when `pdist >= 80 && pdist <= 150`, creating a ring-shaped damage zone rather than a circle (js/authority/wagashiSpecials.js:786).
- `silk_snare` uses fresh `Math.random()` calls for both telegraph visualization AND web placement — positions may not exactly match the telegraphs shown (js/authority/wagashiSpecials.js:325, :343).
- `brood_call` / `serpent_swarm` skip spawning on blocked tiles with `continue` but do not reduce the minion count — fewer minions may spawn than requested (js/authority/wagashiSpecials.js:400, :879).
- `dust_rush` has NO telegraph phase — it dashes immediately when conditions met (js/authority/wagashiSpecials.js:219).
- `jade_glare` falls back to a circular hit check if `AttackShapes.playerInLine` is unavailable (js/authority/wagashiSpecials.js:842).
