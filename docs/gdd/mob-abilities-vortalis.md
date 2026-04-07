# Mob Abilities — Vortalis Dungeon

## Source of truth

- `js/authority/vortalisSpecials.js` — pirate/ocean themed dungeon special abilities (regular mobs + bosses), appended to the global `MOB_SPECIALS` registry defined in `combatSystem.js`.

## Purpose

Defines the behavior functions for every Vortalis dungeon mob special ability. Each entry attaches to `MOB_SPECIALS.<name>` and is invoked per-mob each tick by the combat system with a `(m, ctx)` signature. Regular mob abilities (IDs 1–38) gate themselves via `_specialTimer`/`_specialCD`; boss abilities gate themselves via `m._abilityCDs[name]` set after execution. All player damage scales with `m.damage * getMobDamageMultiplier()`.

## Values

Units: all durations, telegraph delays, timers, and cooldowns are in **frames** (60 fps). Ranges/radii/distances are in **pixels**. Damage is `m.damage * MULT` where `MULT` is listed.

### Common context fields (not ability-specific)

| Field | Source | Citation |
|---|---|---|
| `_specialTimer` default seed | per-ability `m._specialCD` | js/authority/vortalisSpecials.js:10, 41, 74, 98, 131, 177, 206, 242, 272, 310, 345, 368, 387, 406, 429, 447, 476, 495, 514, 544, 576, 605, 633, 664, 690, 708, 727, 759, 786, 808, 828, 844, 870, 897, 916, 943, 962, 991 |
| Out-of-range retry backoff | `_specialTimer = 30` (regular mobs) | js/authority/vortalisSpecials.js:28, 59, 118, 162, 191, 227, 258, 295, 332, 347, 370, 389, 408, 431, 463, 497, 562, 592, 622, 652, 679, 692, 710, 745, 775, 830, 858, 978, 1010 |

### 1. `shiv_lunge` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:10 |
| Max trigger distance | 250 | js/authority/vortalisSpecials.js:28 |
| Min trigger distance | 30 | js/authority/vortalisSpecials.js:28 |
| Dash length | 200 | js/authority/vortalisSpecials.js:30 |
| Dash duration | 12 | js/authority/vortalisSpecials.js:33 |
| Hit radius | 40 | js/authority/vortalisSpecials.js:17 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:18 |

### 2. `spear_dash` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 420 | js/authority/vortalisSpecials.js:41 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:59 |
| Dash length | min(dist+20, 240) | js/authority/vortalisSpecials.js:61 |
| Dash duration | 14 | js/authority/vortalisSpecials.js:64 |
| Line width | 28 | js/authority/vortalisSpecials.js:48, 66 |
| Telegraph delay | 6 | js/authority/vortalisSpecials.js:66 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:49 |

### 3. `blood_frenzy` (regular, self-buff)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:74 |
| Speed mult | 1.4 | js/authority/vortalisSpecials.js:86 |
| Damage mult | 1.3 | js/authority/vortalisSpecials.js:87 |
| Duration | 180 | js/authority/vortalisSpecials.js:88 |

### 4. `rabid_pounce` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:98 |
| Max trigger distance | 280 | js/authority/vortalisSpecials.js:118 |
| Min trigger distance | 40 | js/authority/vortalisSpecials.js:118 |
| Dash length | min(dist+30, 250) | js/authority/vortalisSpecials.js:120 |
| Dash duration | 16 | js/authority/vortalisSpecials.js:123 |
| Hit radius | 48 | js/authority/vortalisSpecials.js:105 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:106 |
| Stun duration | 30 | js/authority/vortalisSpecials.js:109 |

### 5. `reckless_charge` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:131 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:162 |
| Dash length | 300 | js/authority/vortalisSpecials.js:164 |
| Dash duration | 20 | js/authority/vortalisSpecials.js:167 |
| Line width | 36 | js/authority/vortalisSpecials.js:149, 169 |
| Telegraph delay | 12 | js/authority/vortalisSpecials.js:169 |
| Damage mult | 1.5 | js/authority/vortalisSpecials.js:150 |
| On-hit player stun | 18 | js/authority/vortalisSpecials.js:153 |
| Self-stun on wall hit | 60 | js/authority/vortalisSpecials.js:143 |

### 6. `phase_lunge` (regular — teleport behind)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:177 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:191 |
| Behind-player offset | 40 | js/authority/vortalisSpecials.js:193–194 |
| Delay before hit | 8 | js/authority/vortalisSpecials.js:199 |
| Hit radius | 50 | js/authority/vortalisSpecials.js:181 |
| Damage mult | 1.4 | js/authority/vortalisSpecials.js:182 |

### 7. `tidal_lunge` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:206 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:227 |
| Dash length | min(dist+20, 240) | js/authority/vortalisSpecials.js:229 |
| Dash duration | 16 | js/authority/vortalisSpecials.js:232 |
| Hit radius | 40 | js/authority/vortalisSpecials.js:216 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:217 |
| Slow-zone radius | 36 | js/authority/vortalisSpecials.js:213 |
| Slow-zone duration | 180 | js/authority/vortalisSpecials.js:213 |
| Slow amount | 0.35 | js/authority/vortalisSpecials.js:213 |
| Line telegraph width | 32 | js/authority/vortalisSpecials.js:234 |
| Telegraph delay | 8 | js/authority/vortalisSpecials.js:234 |

### 8. `royal_thrust` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 420 | js/authority/vortalisSpecials.js:242 |
| Max trigger distance | 220 | js/authority/vortalisSpecials.js:258 |
| Thrust length | 180 | js/authority/vortalisSpecials.js:260–261 |
| Telegraph delay | 14 | js/authority/vortalisSpecials.js:262, 264 |
| Line width | 24 | js/authority/vortalisSpecials.js:247, 264 |
| Damage mult | 1.3 | js/authority/vortalisSpecials.js:248 |

### 9. `leviathan_lunge` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:272 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:295 |
| Dash length | min(dist+30, 280) | js/authority/vortalisSpecials.js:297 |
| Dash duration | 18 | js/authority/vortalisSpecials.js:300 |
| Wiggle amplitude | 30 | js/authority/vortalisSpecials.js:278 |
| Wiggle freq | 4π | js/authority/vortalisSpecials.js:278 |
| Hit radius | 72 | js/authority/vortalisSpecials.js:283 |
| Damage mult | 1.3 | js/authority/vortalisSpecials.js:284 |
| Line width | 40 | js/authority/vortalisSpecials.js:302 |
| Telegraph delay | 10 | js/authority/vortalisSpecials.js:302 |

### 10. `shard_glide` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:310 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:332 |
| Dash length | 200 | js/authority/vortalisSpecials.js:334 |
| Dash duration | 14 | js/authority/vortalisSpecials.js:337 |
| Shard bullet speed | 3.6 | js/authority/vortalisSpecials.js:320 |
| Shard damage mult | 0.6 | js/authority/vortalisSpecials.js:321 |
| Shard life | 90 | js/authority/vortalisSpecials.js:322 |
| Shard drop interval | every 4 frames | js/authority/vortalisSpecials.js:316 |

### 11. `scattershot` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 420 | js/authority/vortalisSpecials.js:345 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:347 |
| Bullet count | 5 | js/authority/vortalisSpecials.js:351 |
| Cone spread | π/5 (each side) | js/authority/vortalisSpecials.js:349 |
| Bullet speed | 7 | js/authority/vortalisSpecials.js:350 |
| Damage mult | 0.7 | js/authority/vortalisSpecials.js:356 |

### 12. `piercing_musket` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:368 |
| Max trigger distance | 500 | js/authority/vortalisSpecials.js:370 |
| Bullet speed | 12 | js/authority/vortalisSpecials.js:372 |
| Damage mult | 2.5 | js/authority/vortalisSpecials.js:376 |

### 13. `paralysis_dart` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:387 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:389 |
| Bullet speed | GAME_CONFIG.BULLET_SPEED | js/authority/vortalisSpecials.js:393 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:394 |
| Root duration on-hit | 42 | js/authority/vortalisSpecials.js:396 |

### 14. `shard_spread` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:406 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:408 |
| Bullet count | 3 | js/authority/vortalisSpecials.js:411 |
| Bullet speed | 6 | js/authority/vortalisSpecials.js:415 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:416 |
| Slow amount / duration on-hit | 0.3 / 90 | js/authority/vortalisSpecials.js:418 |

### 15. `soul_bullet` (regular — homing)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:429 |
| Max trigger distance | 450 | js/authority/vortalisSpecials.js:431 |
| Bullet speed | 4.5 | js/authority/vortalisSpecials.js:435 |
| Damage mult | 0.8 | js/authority/vortalisSpecials.js:436 |
| Homing strength | 0.04 | js/authority/vortalisSpecials.js:437 |
| Bullet life | 180 | js/authority/vortalisSpecials.js:437 |

### 16. `blinding_ink` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:447 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:463 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:465, 467 |
| Radius | 72 | js/authority/vortalisSpecials.js:451, 467 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:452 |
| Blind duration | 90 | js/authority/vortalisSpecials.js:454 |

### 17. `wealth_volley` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:476 |
| Bullet count | 8 (full circle) | js/authority/vortalisSpecials.js:478–479 |
| Bullet speed | 4.5 | js/authority/vortalisSpecials.js:482 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:483 |

### 18. `venom_spit` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:495 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:497 |
| Bullet speed | 6 (vy −2 arc) | js/authority/vortalisSpecials.js:501 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:502 |
| Poison duration | 180 | js/authority/vortalisSpecials.js:504 |
| Poison tick dmg | m.damage × 0.15 | js/authority/vortalisSpecials.js:504 |

### 19. `barrel_drop` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:514 |
| Barrel fuse | 90 | js/authority/vortalisSpecials.js:532 |
| Explosion radius | 80 | js/authority/vortalisSpecials.js:522, 535 |
| Damage mult | 1.5 | js/authority/vortalisSpecials.js:523 |
| Telegraph delay | 90 | js/authority/vortalisSpecials.js:535 |

### 20. `anchor_sweep` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:544 |
| Max trigger distance | 150 | js/authority/vortalisSpecials.js:562 |
| Telegraph delay | 16 | js/authority/vortalisSpecials.js:564, 566 |
| Cone angle | 180° (π/2 half) | js/authority/vortalisSpecials.js:550, 566 |
| Cone range | 120 | js/authority/vortalisSpecials.js:550, 566 |
| Damage mult | 1.4 | js/authority/vortalisSpecials.js:551 |
| Slow amount/duration | 0.3 / 60 | js/authority/vortalisSpecials.js:554 |

### 21. `water_geyser` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:576 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:592 |
| Telegraph delay | 30 | js/authority/vortalisSpecials.js:594, 596 |
| Radius | 80 | js/authority/vortalisSpecials.js:580, 596 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:581 |
| Slow amount/duration | 0.3 / 60 | js/authority/vortalisSpecials.js:584 |

### 22. `earthquake_slam` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:605 |
| Max trigger distance | 160 | js/authority/vortalisSpecials.js:622 |
| Telegraph delay | 20 | js/authority/vortalisSpecials.js:623, 625 |
| Radius | 120 | js/authority/vortalisSpecials.js:609, 625 |
| Damage mult | 1.3 | js/authority/vortalisSpecials.js:610 |
| Stun duration | 30 | js/authority/vortalisSpecials.js:613 |

### 23. `wail_of_depths` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:633 |
| Max trigger distance | 220 | js/authority/vortalisSpecials.js:652 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:653, 655 |
| Radius | 180 | js/authority/vortalisSpecials.js:637, 655 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:638 |
| Slow amount/duration | 0.5 / 90 | js/authority/vortalisSpecials.js:640 |
| Fear push distance | 100 | js/authority/vortalisSpecials.js:642–643 |

### 24. `abyssal_slam` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:664 |
| Max trigger distance | 190 | js/authority/vortalisSpecials.js:679 |
| Telegraph delay | 22 | js/authority/vortalisSpecials.js:680, 682 |
| Radius | 150 | js/authority/vortalisSpecials.js:668, 682 |
| Damage mult | 1.8 | js/authority/vortalisSpecials.js:669 |

### 25. `pressure_zone` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:690 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:692 |
| Zone radius | 100 | js/authority/vortalisSpecials.js:695 |
| Zone duration | 240 | js/authority/vortalisSpecials.js:695 |
| Tick rate | 60 | js/authority/vortalisSpecials.js:696 |
| Tick damage mult | 0.3 | js/authority/vortalisSpecials.js:696 |
| Slow amount | 0.4 | js/authority/vortalisSpecials.js:697 |

### 26. `coral_barricade` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:708 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:710 |
| Zone radius | 60 | js/authority/vortalisSpecials.js:715 |
| Zone duration | 300 | js/authority/vortalisSpecials.js:715 |
| Slow amount | 0.7 | js/authority/vortalisSpecials.js:716 |

### 27. `crashing_surf` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 480 | js/authority/vortalisSpecials.js:727 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:745 |
| Line length | 300 | js/authority/vortalisSpecials.js:748 |
| Line width | 60 | js/authority/vortalisSpecials.js:731, 751 |
| Telegraph delay | 20 | js/authority/vortalisSpecials.js:749, 751 |
| Damage mult | 1.1 | js/authority/vortalisSpecials.js:732 |
| Push distance | 60 | js/authority/vortalisSpecials.js:736–737 |

### 28. `pincer_guillotine` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 420 | js/authority/vortalisSpecials.js:759 |
| Max trigger distance | 90 | js/authority/vortalisSpecials.js:775 |
| Telegraph delay | 12 | js/authority/vortalisSpecials.js:776, 778 |
| Radius | 60 | js/authority/vortalisSpecials.js:763, 778 |
| Damage mult | 1.6 | js/authority/vortalisSpecials.js:764 |
| Mark duration / bonus | 180 / 0.2 | js/authority/vortalisSpecials.js:767 |

### 29. `toxic_trail` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:786 |
| Active duration | 180 | js/authority/vortalisSpecials.js:799 |
| Drop interval | every 10 frames | js/authority/vortalisSpecials.js:789 |
| Zone radius | 32 | js/authority/vortalisSpecials.js:791 |
| Zone duration | 150 | js/authority/vortalisSpecials.js:791 |
| Tick rate | 30 | js/authority/vortalisSpecials.js:792 |
| Tick damage mult | 0.2 | js/authority/vortalisSpecials.js:792 |

### 30. `pack_howl` (regular — ally buff)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 720 | js/authority/vortalisSpecials.js:808 |
| Ally range | 200 | js/authority/vortalisSpecials.js:813 |
| Speed mult | 1.3 | js/authority/vortalisSpecials.js:815 |
| Buff duration | 240 | js/authority/vortalisSpecials.js:816 |

### 31. `hamstring_bite` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 420 | js/authority/vortalisSpecials.js:828 |
| Max trigger distance | 60 | js/authority/vortalisSpecials.js:830 |
| Damage mult | 0.8 | js/authority/vortalisSpecials.js:831 |
| Slow amount/duration | 0.35 / 120 | js/authority/vortalisSpecials.js:834 |
| Bleed duration / dmg | 180 / m.dmg×0.1 | js/authority/vortalisSpecials.js:835 |

### 32. `spectral_tether` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:844 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:858 |
| Duration | 180 | js/authority/vortalisSpecials.js:860 |
| Leash distance | 150 | js/authority/vortalisSpecials.js:849 |
| Pull speed | 4 | js/authority/vortalisSpecials.js:851–852 |

### 33. `sticky_trap` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:870 |
| Trap life | 600 | js/authority/vortalisSpecials.js:888 |
| Arm delay | 30 | js/authority/vortalisSpecials.js:888 |
| Trigger radius | 40 | js/authority/vortalisSpecials.js:878 |
| Root duration | 60 | js/authority/vortalisSpecials.js:879 |
| Damage mult | 0.4 | js/authority/vortalisSpecials.js:880 |

### 34. `tower_shield` (regular — self shield)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:897 |
| Duration | 180 | js/authority/vortalisSpecials.js:905 |

### 35. `blood_pool` (regular — self heal zone)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:916 |
| Duration | 300 | js/authority/vortalisSpecials.js:931 |
| Heal interval | every 60 frames | js/authority/vortalisSpecials.js:919 |
| Heal amount | 4% maxHp | js/authority/vortalisSpecials.js:922 |
| Zone radius | 80 | js/authority/vortalisSpecials.js:921, 934 |

### 36. `aegis_reflect` (regular — reflect)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 600 | js/authority/vortalisSpecials.js:943 |
| Duration | 120 | js/authority/vortalisSpecials.js:951 |

### 37. `tentacle_bind` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:962 |
| Max trigger distance | 250 | js/authority/vortalisSpecials.js:978 |
| Telegraph delay | 18 | js/authority/vortalisSpecials.js:980, 982 |
| Radius | 56 | js/authority/vortalisSpecials.js:966, 982 |
| Damage mult | 0.7 | js/authority/vortalisSpecials.js:967 |
| Root duration | 60 | js/authority/vortalisSpecials.js:969 |

### 38. `abyssal_undertow` (regular)

| Field | Value | Citation |
|---|---|---|
| Default cooldown | 540 | js/authority/vortalisSpecials.js:991 |
| Max trigger distance | 200 | js/authority/vortalisSpecials.js:1010 |
| Telegraph delay | 20 | js/authority/vortalisSpecials.js:1011, 1013 |
| Radius | 160 | js/authority/vortalisSpecials.js:995, 1013 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:996 |
| Slow amount/duration | 0.4 / 90 | js/authority/vortalisSpecials.js:998 |
| Pull distance | 80 | js/authority/vortalisSpecials.js:1000–1001 |

---

### Boss: Captain Husa

### 39. `flintlock_volley`

| Field | Value | Citation |
|---|---|---|
| Cooldown after use | 360 | js/authority/vortalisSpecials.js:1036 |
| Bullet count | 6 | js/authority/vortalisSpecials.js:1026 |
| Cone spread | π/4 | js/authority/vortalisSpecials.js:1025 |
| Bullet speed | 7 | js/authority/vortalisSpecials.js:1030 |
| Damage mult | 0.7 | js/authority/vortalisSpecials.js:1031 |

### 40. `cutlass_cleave`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 300 | js/authority/vortalisSpecials.js:1052 |
| Max trigger distance | 160 | js/authority/vortalisSpecials.js:1056 |
| Telegraph delay | 14 | js/authority/vortalisSpecials.js:1058, 1060 |
| Cone angle | 120° (π/3 half) | js/authority/vortalisSpecials.js:1047, 1060 |
| Range | 130 | js/authority/vortalisSpecials.js:1047, 1060 |
| Damage mult | 1.4 | js/authority/vortalisSpecials.js:1048 |

### 41. `call_to_arms`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 900 | js/authority/vortalisSpecials.js:1091 |
| Max minions | 3 | js/authority/vortalisSpecials.js:1069 |
| Summons per cast | 2 | js/authority/vortalisSpecials.js:1070 |
| Spawn offset | 80 | js/authority/vortalisSpecials.js:1072–1073 |
| Minion HP | 15% boss maxHp | js/authority/vortalisSpecials.js:1077 |
| Minion speed | 2.1 | js/authority/vortalisSpecials.js:1078 |
| Minion damage | boss.dmg × 0.4 | js/authority/vortalisSpecials.js:1078 |

### 42. `weathered_resolve`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:1110 |
| HP gate | <50% maxHp | js/authority/vortalisSpecials.js:1107 |
| Duration | 180 | js/authority/vortalisSpecials.js:1108 |
| Heal interval | every 36 frames | js/authority/vortalisSpecials.js:1100 |
| Heal amount | 3% maxHp | js/authority/vortalisSpecials.js:1101 |

### 43. `boarding_rush`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 420 | js/authority/vortalisSpecials.js:1130 |
| Max / min trigger distance | 350 / 40 | js/authority/vortalisSpecials.js:1134 |
| Dash length | min(dist+20, 250) | js/authority/vortalisSpecials.js:1136 |
| Dash duration | 14 | js/authority/vortalisSpecials.js:1139 |
| Hit radius | 50 | js/authority/vortalisSpecials.js:1123 |
| Damage mult | 1.3 | js/authority/vortalisSpecials.js:1124 |
| Stun duration | 18 | js/authority/vortalisSpecials.js:1127 |

---

### Boss: Admiral Von Kael

### 44. `naval_artillery`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1161 |
| Telegraph delay | 36 | js/authority/vortalisSpecials.js:1172, 1175 |
| Target count | 3 | js/authority/vortalisSpecials.js:1166 |
| Target scatter | ±60 each axis | js/authority/vortalisSpecials.js:1167–1168 |
| Radius | 72 | js/authority/vortalisSpecials.js:1153, 1172 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:1154 |

### 45. `spectral_chain_binding`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1193 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:1197 |
| Duration | 90 | js/authority/vortalisSpecials.js:1198 |
| Pull speed | 3 | js/authority/vortalisSpecials.js:1186–1187 |
| Damage mult (end) | 1.0 | js/authority/vortalisSpecials.js:1190 |
| Slow amount/duration | 0.5 / 90 | js/authority/vortalisSpecials.js:1199 |

### 46. `tattered_tide`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 540 | js/authority/vortalisSpecials.js:1222 |
| Telegraph delay | 30 | js/authority/vortalisSpecials.js:1208, 1226 |
| Radius | 200 | js/authority/vortalisSpecials.js:1208, 1213 |
| Damage mult | 0.8 | js/authority/vortalisSpecials.js:1214 |
| Slow amount/duration | 0.4 / 120 | js/authority/vortalisSpecials.js:1216 |
| Hazard zone duration | 240 | js/authority/vortalisSpecials.js:1220 |
| Hazard tick rate | 60 | js/authority/vortalisSpecials.js:1220 |
| Hazard tick dmg mult | 0.2 | js/authority/vortalisSpecials.js:1220 |
| Hazard slow | 0.3 | js/authority/vortalisSpecials.js:1220 |

### 47. `command_authority`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:1246 |
| Ally range | 300 | js/authority/vortalisSpecials.js:1237 |
| Speed mult | 1.25 | js/authority/vortalisSpecials.js:1240 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:1241 |
| Buff duration | 300 | js/authority/vortalisSpecials.js:1242 |

### 48. `admirals_resolve`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1264 |
| HP gate | <40% maxHp | js/authority/vortalisSpecials.js:1259 |
| Duration | 240 | js/authority/vortalisSpecials.js:1260 |

---

### Boss: Zongo

### 49. `spear_barrage`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 420 | js/authority/vortalisSpecials.js:1287 |
| Shot count | 5 | js/authority/vortalisSpecials.js:1275, 1285 |
| Shot interval | every 6 frames | js/authority/vortalisSpecials.js:1275 |
| Bullet speed | 9 | js/authority/vortalisSpecials.js:1279 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:1280 |

### 50. `vine_snare`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1310 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:1314 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:1316, 1318 |
| Radius | 60 | js/authority/vortalisSpecials.js:1304, 1318 |
| Root duration | 72 | js/authority/vortalisSpecials.js:1305 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:1306 |

### 51. `primal_roar`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1335 |
| Radius | 200 | js/authority/vortalisSpecials.js:1326 |
| Slow amount/duration | 0.5 / 120 | js/authority/vortalisSpecials.js:1327 |
| Push distance | 80 | js/authority/vortalisSpecials.js:1329–1330 |

### 52. `tribal_summon`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 840 | js/authority/vortalisSpecials.js:1364 |
| Max active | 4 | js/authority/vortalisSpecials.js:1343 |
| Summons per cast | 2 | js/authority/vortalisSpecials.js:1344 |
| Spawn offset | 90 | js/authority/vortalisSpecials.js:1346–1347 |
| Minion HP | 12% boss maxHp | js/authority/vortalisSpecials.js:1351 |
| Minion speed | 2.5 | js/authority/vortalisSpecials.js:1352 |
| Minion damage | boss.dmg × 0.35 | js/authority/vortalisSpecials.js:1352 |

### 53. `jungle_fury`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:1386 |
| Duration | 240 | js/authority/vortalisSpecials.js:1383 |
| Speed mult | 1.6 | js/authority/vortalisSpecials.js:1381 |
| Damage mult | 1.4 | js/authority/vortalisSpecials.js:1382 |

---

### Boss: Bloodborne Marlon

### 54. `chain_grapple`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1405 |
| Max / min trigger distance | 400 / 60 | js/authority/vortalisSpecials.js:1395 |
| Pull distance fraction | 0.6 × dist | js/authority/vortalisSpecials.js:1397 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:1401 |

### 55. `crimson_cleave`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 360 | js/authority/vortalisSpecials.js:1421 |
| Max trigger distance | 200 | js/authority/vortalisSpecials.js:1425 |
| Telegraph delay | 16 | js/authority/vortalisSpecials.js:1429, 1431 |
| Line length | 180 | js/authority/vortalisSpecials.js:1427–1428 |
| Line width | 40 | js/authority/vortalisSpecials.js:1415, 1431 |
| Damage mult | 1.6 | js/authority/vortalisSpecials.js:1416 |
| Bleed duration / dmg | 180 / m.dmg×0.15 | js/authority/vortalisSpecials.js:1419 |

### 56. `shard_of_betrayal`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 420 | js/authority/vortalisSpecials.js:1453 |
| Shards | 4 | js/authority/vortalisSpecials.js:1440 |
| Spawn offset | 200 | js/authority/vortalisSpecials.js:1442–1443 |
| Bullet speed | 5 | js/authority/vortalisSpecials.js:1447 |
| Damage mult | 0.7 | js/authority/vortalisSpecials.js:1448 |
| Bullet life | 120 | js/authority/vortalisSpecials.js:1449 |

### 57. `blood_siphon`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1467 |
| Max trigger distance | 250 | js/authority/vortalisSpecials.js:1460 |
| Damage mult | 0.8 | js/authority/vortalisSpecials.js:1461 |
| Heal fraction | 0.5 × dealt | js/authority/vortalisSpecials.js:1463 |

### 58. `bone_guard`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1484 |
| Duration | 240 | js/authority/vortalisSpecials.js:1480 |

### 59. `demonic_shift`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1502 |
| Teleport offset (behind) | 60 | js/authority/vortalisSpecials.js:1493–1494 |
| Burst radius | 100 | js/authority/vortalisSpecials.js:1497 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:1498 |

---

### Boss: Wolfbeard

### 60. `quick_draw`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 240 | js/authority/vortalisSpecials.js:1519 |
| Bullet speed | 13 | js/authority/vortalisSpecials.js:1514 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:1515 |

### 61. `feral_slash`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 300 | js/authority/vortalisSpecials.js:1534 |
| Max trigger distance | 100 | js/authority/vortalisSpecials.js:1526 |
| Cone angle | 90° (π/4 half) | js/authority/vortalisSpecials.js:1528 |
| Range | 100 | js/authority/vortalisSpecials.js:1528 |
| Damage mult | 1.3 | js/authority/vortalisSpecials.js:1529 |
| Bleed duration / dmg | 120 / m.dmg×0.1 | js/authority/vortalisSpecials.js:1532 |

### 62. `predator_dash`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 360 | js/authority/vortalisSpecials.js:1554 |
| Max / min trigger distance | 350 / 40 | js/authority/vortalisSpecials.js:1558 |
| Dash length | 280 | js/authority/vortalisSpecials.js:1560 |
| Dash duration | 12 | js/authority/vortalisSpecials.js:1563 |
| Line width | 32 | js/authority/vortalisSpecials.js:1548 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:1549 |

### 63. `hunters_mark`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1574 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:1570 |
| Mark duration / bonus | 300 / 0.25 | js/authority/vortalisSpecials.js:1571 |

### 64. `howl_of_terror`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 660 | js/authority/vortalisSpecials.js:1590 |
| Radius | 220 | js/authority/vortalisSpecials.js:1581 |
| Slow amount/duration | 0.5 / 120 | js/authority/vortalisSpecials.js:1582 |
| Push distance | 100 | js/authority/vortalisSpecials.js:1584–1585 |

### 65. `pack_instinct`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1608 |
| Ally range | 200 | js/authority/vortalisSpecials.js:1601 |
| Speed per nearby | +15% per ally | js/authority/vortalisSpecials.js:1605 |
| Buff duration | 300 | js/authority/vortalisSpecials.js:1606 |

### 66. `silver_fang_strike`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:1624 |
| Max trigger distance | 100 | js/authority/vortalisSpecials.js:1628 |
| Telegraph delay | 10 | js/authority/vortalisSpecials.js:1629, 1631 |
| Radius | 70 | js/authority/vortalisSpecials.js:1618, 1631 |
| Damage mult | 2.0 | js/authority/vortalisSpecials.js:1619 |
| Bleed duration / dmg | 240 / m.dmg×0.15 | js/authority/vortalisSpecials.js:1622 |

### 67. `alpha_rampage`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1659 |
| Dash count | 3 | js/authority/vortalisSpecials.js:1651 |
| Dash length | 150 | js/authority/vortalisSpecials.js:1653, 1665 |
| Dash duration | 10 | js/authority/vortalisSpecials.js:1656, 1668 |
| Hit radius | 40 | js/authority/vortalisSpecials.js:1645 |
| Damage mult | 0.8 | js/authority/vortalisSpecials.js:1646 |

---

### Boss: Ghostbeard

### 68. `phantom_slash`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 360 | js/authority/vortalisSpecials.js:1691 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:1679 |
| Teleport offset (in front) | 40 | js/authority/vortalisSpecials.js:1682–1683 |
| Hit radius | 60 | js/authority/vortalisSpecials.js:1685 |
| Damage mult | 1.4 | js/authority/vortalisSpecials.js:1686 |

### 69. `ghost_dash`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 420 | js/authority/vortalisSpecials.js:1711 |
| Duration | 16 | js/authority/vortalisSpecials.js:1719 |
| Target offset | 40 past player | js/authority/vortalisSpecials.js:1717–1718 |
| Hit radius | 50 | js/authority/vortalisSpecials.js:1705 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:1706 |

### 70. `haunted_cutlass`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 360 | js/authority/vortalisSpecials.js:1735 |
| Max trigger distance | 90 | js/authority/vortalisSpecials.js:1726 |
| Cone angle | 120° (π/3 half) | js/authority/vortalisSpecials.js:1728 |
| Range | 90 | js/authority/vortalisSpecials.js:1728 |
| Damage mult | 1.5 | js/authority/vortalisSpecials.js:1729 |
| Mark duration / bonus | 240 / 0.2 | js/authority/vortalisSpecials.js:1732 |

### 71. `spirit_shield`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 540 | js/authority/vortalisSpecials.js:1752 |
| Duration | 180 | js/authority/vortalisSpecials.js:1748 |

### 72. `cursed_mark`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:1764 |
| Max trigger distance | 350 | js/authority/vortalisSpecials.js:1759 |
| Mark duration / bonus | 360 / 0.2 | js/authority/vortalisSpecials.js:1760 |
| Slow amount/duration | 0.25 / 120 | js/authority/vortalisSpecials.js:1761 |

### 73. `spectral_crew`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 840 | js/authority/vortalisSpecials.js:1794 |
| Max active | 3 | js/authority/vortalisSpecials.js:1772 |
| Summons per cast | 2 | js/authority/vortalisSpecials.js:1773 |
| Spawn offset | 80 | js/authority/vortalisSpecials.js:1775–1776 |
| Minion HP | 10% boss maxHp | js/authority/vortalisSpecials.js:1780 |
| Minion speed | 2.5 | js/authority/vortalisSpecials.js:1781 |
| Minion damage | boss.dmg × 0.3 | js/authority/vortalisSpecials.js:1781 |

### 74. `soul_drain`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 540 | js/authority/vortalisSpecials.js:1812 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:1816, 1818 |
| Radius | 140 | js/authority/vortalisSpecials.js:1804, 1818 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:1805 |
| Heal fraction | 0.4 × dealt | js/authority/vortalisSpecials.js:1807 |

### 75. `ghost_ship`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:1828 |
| Beam count | 5 | js/authority/vortalisSpecials.js:1832 |
| Cone spread | π/3 total | js/authority/vortalisSpecials.js:1833 |
| Line length | 350 | js/authority/vortalisSpecials.js:1834–1835 |
| Line width | 30 | js/authority/vortalisSpecials.js:1840 |
| Telegraph delay | 30 + i×6 (staggered) | js/authority/vortalisSpecials.js:1841 |
| Self-busy window | 60 | js/authority/vortalisSpecials.js:1852 |
| Damage mult | 0.8 | js/authority/vortalisSpecials.js:1844 |

---

### Boss: Kraken Jim

### 76. `tentacle_grab`

| Field | Value | Citation |
|---|---|---|
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:1879 |
| Line length | 250 | js/authority/vortalisSpecials.js:1881–1882 |
| Line width | 36 | js/authority/vortalisSpecials.js:1866, 1885 |
| Telegraph delay | 18 | js/authority/vortalisSpecials.js:1883, 1885 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:1871 |
| Root duration | 48 | js/authority/vortalisSpecials.js:1874 |
| Pull distance | 100 | js/authority/vortalisSpecials.js:1868–1869 |

### 77. `coral_armor`

| Field | Value | Citation |
|---|---|---|
| Duration | 180 | js/authority/vortalisSpecials.js:1894 |

### 78. `ink_blast`

| Field | Value | Citation |
|---|---|---|
| Telegraph delay | 20 | js/authority/vortalisSpecials.js:1915, 1917 |
| Radius | 120 | js/authority/vortalisSpecials.js:1906, 1917 |
| Damage mult | 0.7 | js/authority/vortalisSpecials.js:1907 |
| Blind duration | 120 | js/authority/vortalisSpecials.js:1910 |

### 79. `tidal_slam`

| Field | Value | Citation |
|---|---|---|
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:1937, 1939 |
| Radius | 140 | js/authority/vortalisSpecials.js:1928, 1939 |
| Damage mult | 1.6 | js/authority/vortalisSpecials.js:1929 |
| Stun duration | 30 | js/authority/vortalisSpecials.js:1932 |

### 80. `barnacle_trap_boss`

| Field | Value | Citation |
|---|---|---|
| Traps per cast | 3 | js/authority/vortalisSpecials.js:1964 |
| Trap scatter | ±60 each axis | js/authority/vortalisSpecials.js:1965–1966 |
| Trap life | 600 | js/authority/vortalisSpecials.js:1967 |
| Arm delay | 30 | js/authority/vortalisSpecials.js:1967 |
| Trigger radius | 40 | js/authority/vortalisSpecials.js:1955 |
| Root duration | 48 | js/authority/vortalisSpecials.js:1956 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:1957 |

### 81. `ocean_regen`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:1989 |
| HP gate | <40% maxHp | js/authority/vortalisSpecials.js:1985 |
| Duration | 300 | js/authority/vortalisSpecials.js:1986 |
| Heal interval | every 30 frames | js/authority/vortalisSpecials.js:1978 |
| Heal amount | 2% maxHp | js/authority/vortalisSpecials.js:1979 |

### 82. `deep_sea_strike`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2007 |
| Telegraph delay | 30 | js/authority/vortalisSpecials.js:2012, 2014 |
| Radius | 100 | js/authority/vortalisSpecials.js:2001, 2014 |
| Damage mult | 1.6 | js/authority/vortalisSpecials.js:2002 |
| Stun duration | 18 | js/authority/vortalisSpecials.js:2005 |

### 83. `kraken_call`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 900 | js/authority/vortalisSpecials.js:2046 |
| Max active | 4 | js/authority/vortalisSpecials.js:2024 |
| Summons per cast | 3 | js/authority/vortalisSpecials.js:2025 |
| Spawn offset | 100 | js/authority/vortalisSpecials.js:2027–2028 |
| Minion HP | 8% boss maxHp | js/authority/vortalisSpecials.js:2032 |
| Minion speed | 1.3 | js/authority/vortalisSpecials.js:2033 |
| Minion damage | boss.dmg × 0.3 | js/authority/vortalisSpecials.js:2033 |
| Minion specials | `['tentacle_bind']` | js/authority/vortalisSpecials.js:2039 |

---

### Boss: King Requill

### 84. `deepsea_decapitation`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 420 | js/authority/vortalisSpecials.js:2064 |
| Max trigger distance | 200 | js/authority/vortalisSpecials.js:2068 |
| Telegraph delay | 18 | js/authority/vortalisSpecials.js:2070, 2072 |
| Cone angle | 120° (π/3 half) | js/authority/vortalisSpecials.js:2059, 2072 |
| Range | 160 | js/authority/vortalisSpecials.js:2059, 2072 |
| Damage mult | 2.0 | js/authority/vortalisSpecials.js:2060 |

### 85. `coiling_constriction`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 540 | js/authority/vortalisSpecials.js:2092 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:2080 |
| Pull fraction | 0.5 × dist | js/authority/vortalisSpecials.js:2082 |
| Root duration | 60 | js/authority/vortalisSpecials.js:2086 |
| Bleed duration / dmg | 180 / m.dmg×0.12 | js/authority/vortalisSpecials.js:2087 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:2088 |

### 86. `gilded_maelstrom`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2109 |
| Bullet count | 12 (full circle) | js/authority/vortalisSpecials.js:2099 |
| Bullet speed | 3.6 | js/authority/vortalisSpecials.js:2103 |
| Damage mult | 0.6 | js/authority/vortalisSpecials.js:2104 |
| Bullet life | 120 | js/authority/vortalisSpecials.js:2105 |

### 87. `pressure_zone_boss`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:2125 |
| Zone radius | 140 | js/authority/vortalisSpecials.js:2118 |
| Zone duration | 360 | js/authority/vortalisSpecials.js:2118 |
| Tick rate | 45 | js/authority/vortalisSpecials.js:2119 |
| Tick dmg mult | 0.4 | js/authority/vortalisSpecials.js:2119 |
| Slow amount | 0.5 | js/authority/vortalisSpecials.js:2120 |

### 88. `silt_cloud`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2140 |
| Zone radius | 100 | js/authority/vortalisSpecials.js:2134 |
| Zone duration | 240 | js/authority/vortalisSpecials.js:2134 |
| Slow amount | 0.2 | js/authority/vortalisSpecials.js:2135 |
| Blind duration | 60 | js/authority/vortalisSpecials.js:2138 |

### 89. `abyssal_roar`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 660 | js/authority/vortalisSpecials.js:2161 |
| Telegraph delay | 28 | js/authority/vortalisSpecials.js:2165, 2167 |
| Radius | 250 | js/authority/vortalisSpecials.js:2150, 2167 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:2151 |
| Slow amount/duration | 0.5 / 120 | js/authority/vortalisSpecials.js:2153 |
| Push distance | 120 | js/authority/vortalisSpecials.js:2155–2156 |

### 90. `golden_retribution`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 300 | js/authority/vortalisSpecials.js:2191 |
| HP loss threshold | 5% maxHp | js/authority/vortalisSpecials.js:2179 |
| Bullet count | 8 | js/authority/vortalisSpecials.js:2181 |
| Bullet speed | 5 | js/authority/vortalisSpecials.js:2185 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:2186 |

### 91. `reign_of_deep`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:2200 |
| Target count | 5 | js/authority/vortalisSpecials.js:2204 |
| Target scatter | ±150 each axis | js/authority/vortalisSpecials.js:2205–2206 |
| Radius | 64 | js/authority/vortalisSpecials.js:2211, 2214 |
| Telegraph delay | 36 + i×8 (staggered) | js/authority/vortalisSpecials.js:2212 |
| Self-busy window | 76 | js/authority/vortalisSpecials.js:2224 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:2215 |

---

### Boss: Queen Siralyth

### 92. `golden_shard_volley`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 420 | js/authority/vortalisSpecials.js:2249 |
| Shots | 10 | js/authority/vortalisSpecials.js:2237, 2247 |
| Shot interval | every 3 frames | js/authority/vortalisSpecials.js:2237 |
| Angle step | π/5 | js/authority/vortalisSpecials.js:2238 |
| Bullet speed | 5 | js/authority/vortalisSpecials.js:2241 |
| Damage mult | 0.5 | js/authority/vortalisSpecials.js:2242 |
| Bullet life | 150 | js/authority/vortalisSpecials.js:2243 |

### 93. `abyssal_maw`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2272 |
| Telegraph delay | 28 | js/authority/vortalisSpecials.js:2277, 2279 |
| Radius | 120 | js/authority/vortalisSpecials.js:2265, 2279 |
| Damage mult | 2.0 | js/authority/vortalisSpecials.js:2266 |
| Slow amount/duration | 0.4 / 90 | js/authority/vortalisSpecials.js:2269 |

### 94. `coral_aegis`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:2300 |
| Duration | 180 | js/authority/vortalisSpecials.js:2295 |

### 95. `royal_gilded_beam`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2323 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:2330, 2332 |
| Line length | 400 | js/authority/vortalisSpecials.js:2328–2329 |
| Line width | 40 | js/authority/vortalisSpecials.js:2310, 2332 |
| Damage mult | 1.8 | js/authority/vortalisSpecials.js:2311 |
| Burn zone count | 3 | js/authority/vortalisSpecials.js:2318 |
| Burn zone radius | 40 | js/authority/vortalisSpecials.js:2320 |
| Burn zone duration | 180 | js/authority/vortalisSpecials.js:2320 |
| Burn tick rate | 30 | js/authority/vortalisSpecials.js:2320 |
| Burn tick dmg mult | 0.3 | js/authority/vortalisSpecials.js:2320 |

### 96. `tidal_surge`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 540 | js/authority/vortalisSpecials.js:2352 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:2360, 2362 |
| Line length | 400 | js/authority/vortalisSpecials.js:2358–2359 |
| Line width | 80 | js/authority/vortalisSpecials.js:2343, 2362 |
| Damage mult | 1.2 | js/authority/vortalisSpecials.js:2344 |
| Push distance | 100 | js/authority/vortalisSpecials.js:2348–2349 |

### 97. `sovereigns_cage`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 660 | js/authority/vortalisSpecials.js:2384 |
| Zone count | 8 | js/authority/vortalisSpecials.js:2371 |
| Ring radius | 120 | js/authority/vortalisSpecials.js:2373–2374 |
| Zone radius | 36 | js/authority/vortalisSpecials.js:2376 |
| Zone duration | 300 | js/authority/vortalisSpecials.js:2376 |
| Tick rate | 30 | js/authority/vortalisSpecials.js:2377 |
| Tick dmg mult | 0.3 | js/authority/vortalisSpecials.js:2377 |
| Slow amount | 0.5 | js/authority/vortalisSpecials.js:2378 |

### 98. `blessing_of_deep`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 720 | js/authority/vortalisSpecials.js:2406 |
| HP gate | <50% maxHp | js/authority/vortalisSpecials.js:2400 |
| Duration | 240 | js/authority/vortalisSpecials.js:2401 |
| Heal interval | every 40 frames | js/authority/vortalisSpecials.js:2393 |
| Heal amount | 3% maxHp | js/authority/vortalisSpecials.js:2394 |
| Speed mult | 1.3 | js/authority/vortalisSpecials.js:2403 |

### 99. `reign_gilded_reef`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 660 | js/authority/vortalisSpecials.js:2438 |
| Zone count | 4 | js/authority/vortalisSpecials.js:2415 |
| Zone offset | 80 + rand(0–150) | js/authority/vortalisSpecials.js:2417 |
| Zone radius | 48 | js/authority/vortalisSpecials.js:2420 |
| Zone duration | 300 | js/authority/vortalisSpecials.js:2420 |
| Tick rate | 45 | js/authority/vortalisSpecials.js:2420 |
| Tick dmg mult | 0.25 | js/authority/vortalisSpecials.js:2421 |
| Slow amount | 0.3 | js/authority/vortalisSpecials.js:2422 |
| Bullet count | 10 (full circle) | js/authority/vortalisSpecials.js:2427 |
| Bullet speed | 4.5 | js/authority/vortalisSpecials.js:2431 |
| Bullet dmg mult | 0.4 | js/authority/vortalisSpecials.js:2432 |
| Bullet life | 120 | js/authority/vortalisSpecials.js:2433 |

---

### Boss: Mami Wata

### 100. `leviathans_fang`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2466 |
| Max trigger distance | 400 | js/authority/vortalisSpecials.js:2470 |
| Dash length | min(dist+40, 320) | js/authority/vortalisSpecials.js:2472 |
| Dash duration | 20 | js/authority/vortalisSpecials.js:2475 |
| Wiggle amplitude / freq | 40 / 6π | js/authority/vortalisSpecials.js:2452 |
| Line width | 44 | js/authority/vortalisSpecials.js:2477 |
| Telegraph delay | 12 | js/authority/vortalisSpecials.js:2477 |
| Hit radius | 60 | js/authority/vortalisSpecials.js:2458 |
| Damage mult | 2.0 | js/authority/vortalisSpecials.js:2459 |
| Bleed duration / dmg | 240 / m.dmg×0.15 | js/authority/vortalisSpecials.js:2462 |

### 101. `serpents_strike`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 360 | js/authority/vortalisSpecials.js:2494 |
| Max trigger distance | 300 | js/authority/vortalisSpecials.js:2498 |
| Telegraph delay | 14 | js/authority/vortalisSpecials.js:2502, 2504 |
| Line length | 240 | js/authority/vortalisSpecials.js:2500–2501 |
| Line width | 32 | js/authority/vortalisSpecials.js:2488, 2504 |
| Damage mult | 1.4 | js/authority/vortalisSpecials.js:2489 |
| Poison duration / dmg | 180 / m.dmg×0.12 | js/authority/vortalisSpecials.js:2492 |

### 102. `tidal_trample`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 480 | js/authority/vortalisSpecials.js:2528 |
| Max / min trigger distance | 400 / 60 | js/authority/vortalisSpecials.js:2532 |
| Dash length | 300 | js/authority/vortalisSpecials.js:2534 |
| Dash duration | 18 | js/authority/vortalisSpecials.js:2537 |
| Line width | 40 | js/authority/vortalisSpecials.js:2521, 2539 |
| Telegraph delay | 10 | js/authority/vortalisSpecials.js:2539 |
| Damage mult | 1.5 | js/authority/vortalisSpecials.js:2522 |
| Stun duration | 24 | js/authority/vortalisSpecials.js:2525 |
| Trail zone radius | 32 | js/authority/vortalisSpecials.js:2518 |
| Trail zone duration | 180 | js/authority/vortalisSpecials.js:2518 |
| Trail slow amount | 0.35 | js/authority/vortalisSpecials.js:2518 |
| Trail interval | every 4 frames | js/authority/vortalisSpecials.js:2517 |

### 103. `abyssal_undertow_mw`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 540 | js/authority/vortalisSpecials.js:2563 |
| Telegraph delay | 24 | js/authority/vortalisSpecials.js:2567, 2569 |
| Radius | 200 | js/authority/vortalisSpecials.js:2550, 2569 |
| Damage mult | 1.0 | js/authority/vortalisSpecials.js:2555 |
| Slow amount/duration | 0.5 / 120 | js/authority/vortalisSpecials.js:2557 |
| Pull distance | 120 | js/authority/vortalisSpecials.js:2552–2553 |
| Hazard zone duration | 240 | js/authority/vortalisSpecials.js:2561 |
| Hazard tick rate | 60 | js/authority/vortalisSpecials.js:2561 |
| Hazard tick dmg mult | 0.3 | js/authority/vortalisSpecials.js:2561 |
| Hazard slow | 0.4 | js/authority/vortalisSpecials.js:2561 |

### 104. `divine_deluge`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 600 | js/authority/vortalisSpecials.js:2580 |
| Target count | 6 | js/authority/vortalisSpecials.js:2584 |
| Target scatter | ±175 each axis | js/authority/vortalisSpecials.js:2585–2586 |
| Radius | 72 | js/authority/vortalisSpecials.js:2591, 2594 |
| Telegraph delay | 30 + i×10 (staggered) | js/authority/vortalisSpecials.js:2592 |
| Self-busy window | 90 | js/authority/vortalisSpecials.js:2604 |
| Damage mult | 0.9 | js/authority/vortalisSpecials.js:2595 |

### 105. `oceanic_domain`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 900 | js/authority/vortalisSpecials.js:2637 |
| Duration | 360 | js/authority/vortalisSpecials.js:2634 |
| Zone radius | 250 | js/authority/vortalisSpecials.js:2627 |
| Zone duration | 360 | js/authority/vortalisSpecials.js:2627 |
| Tick rate | 45 | js/authority/vortalisSpecials.js:2628 |
| Tick dmg mult | 0.2 | js/authority/vortalisSpecials.js:2628 |
| Slow amount | 0.3 | js/authority/vortalisSpecials.js:2629 |
| Heal interval | every 60 frames | js/authority/vortalisSpecials.js:2615 |
| Heal amount | 2% maxHp | js/authority/vortalisSpecials.js:2616 |
| Self speed mult | 1.4 | js/authority/vortalisSpecials.js:2633 |

### 106. `wrath_of_sea`

| Field | Value | Citation |
|---|---|---|
| Cooldown | 900 | js/authority/vortalisSpecials.js:2648 |
| Ring radii | [100, 180, 260] | js/authority/vortalisSpecials.js:2653 |
| Ring telegraph delays | 20 + i×16 | js/authority/vortalisSpecials.js:2659 |
| Self-busy window | 68 | js/authority/vortalisSpecials.js:2677 |
| Damage mult | 1.2 − i×0.2 per ring | js/authority/vortalisSpecials.js:2662 |
| Center pull distance | 60 | js/authority/vortalisSpecials.js:2673–2674 |

## Behavior

General pattern for **regular mob** abilities (IDs 1–38):
1. On first tick, `_specialTimer` is seeded from `m._specialCD` or the default constant (cited per-ability).
2. Each tick, if an in-progress phase flag is set (e.g. `_shivDashing`, `_inkTelegraph`), run that phase.
3. Else if `_specialTimer > 0`, decrement and return.
4. Else check trigger distance. If out of range, set a short backoff (usually 30) and return.
5. Else kick off the ability (create telegraph / start dash / spawn bullets) and reset `_specialTimer = _specialCD || default`.

General pattern for **boss** abilities (IDs 39–106):
1. On each tick, if telegraph/phase timer active, decrement and resolve at 0.
2. Else check distance/HP gates.
3. On execute, perform effect and set `m._abilityCDs[name]` to the per-ability cooldown.
4. Boss cooldown tracking is done by the combat system elsewhere (not in this file), which clears `_abilityCDs` entries over time.

All telegraphs are created via `TelegraphSystem.create({ shape, params, delayFrames, color, owner })`. Player damage is dealt via `dealDamageToPlayer(dmg, 'mob_special', m)`. All damage values multiply by `getMobDamageMultiplier()`.

## Dependencies

- Reads: `player.x`, `player.y`, `player.hp`, `mobs[]`, `m.damage`, `m.hp`, `m.maxHp`, `m.speed`, `m.x`, `m.y`, `m.id`, `dist`, `GAME_CONFIG.BULLET_SPEED`.
- Writes: `bullets[]` (push new projectiles), `m.*` transient state (`_shivDashing`, `_specialTimer`, `_abilityCDs`, etc), `player.x/y` (pull/push), `hitEffects[]`.
- Calls: `dealDamageToPlayer`, `getMobDamageMultiplier`, `clampDashTarget`, `positionClear`, `AttackShapes.hitsPlayer`, `AttackShapes.playerInLine`, `AttackShapes.playerInCone`, `TelegraphSystem.create`, `HazardSystem.createZone`, `StatusFX.applyToPlayer`.
- Registers: entries on `MOB_SPECIALS` (defined in `js/authority/combatSystem.js`).
- Summon abilities push mobs with `type` in `{pirate_grunt, tribal_warrior, ghost_pirate, kraken_tentacle}` using `nextMobId++`.

## Edge cases

- `reckless_charge` self-stuns for 60 frames if the dash is blocked by `positionClear` (js/authority/vortalisSpecials.js:141–146). The in-flight dash can also deal damage mid-dash as it steps.
- `phase_lunge` falls through to `m.x = player.x; m.y = player.y` if the behind-player teleport target is blocked (js/authority/vortalisSpecials.js:196–197).
- `leviathan_lunge` and `leviathans_fang` apply a perpendicular sinusoidal wiggle during the dash; the rendered path is not a straight line (js/authority/vortalisSpecials.js:278–281, 2452–2455).
- `tattered_tide` calls `TelegraphSystem.create` every frame (outside the `_tideTele` gate — js/authority/vortalisSpecials.js:1207–1209), creating a telegraph spam bug.
- `reign_of_deep`, `ghost_ship`, `divine_deluge`, `wrath_of_sea` use per-telegraph `onResolve` callbacks that capture `m` and `player` by closure; damage at resolve time re-reads live player position (js/authority/vortalisSpecials.js:1842–1848, 2213–2220, 2593–2600, 2660–2667).
- `golden_retribution` compares `m.hp >= m._lastRetribHp || 0` — operator precedence makes this effectively `m.hp >= (m._lastRetribHp || 0)`, which is almost always true on first call, so it silently initialises instead of firing (js/authority/vortalisSpecials.js:2176).
- `barnacle_trap_boss` has no explicit cooldown set after firing — it relies on external ability scheduling (js/authority/vortalisSpecials.js:1945–1971).
- `call_to_arms`, `tribal_summon`, `spectral_crew`, `kraken_call` use `_summonOwnerId` to attribute minions; active count is filtered by `hp > 0`.
- `pack_howl`, `command_authority`, `pack_instinct` all store `_packOrigSpd` / `_cmdOrigSpd` / `_piOrigSpd` on allies; these are never cleared when the buff timer expires in this file (the cleanup must happen elsewhere).
- `ghost_ship.ghostShipTele = 60` phase window is shorter than some of its staggered telegraph delays (30 + 4×6 = 54), so the mob cooldown is set before the final ring resolves.
- `wrath_of_sea` damage formula `1.2 − i*0.2` yields 1.2/1.0/0.8 mults for the three rings (outer = weakest).
- `oceanic_domain` sets `_domainOrigSpd` at cast and restores only if timer hits 0 naturally — early ability interrupt would leave the buff permanently applied.
- Minions summoned by `kraken_call` are seeded with `['tentacle_bind']` specials at `_specialTimer=60`, `_specialCD=300` (js/authority/vortalisSpecials.js:2039).
