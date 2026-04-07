# Mob Abilities — Earth-216 (Sin City)

## Source of truth

- `js/authority/earth216Specials.js` — Floor 1 + Floor 2 specials (28 abilities)
- `js/authority/earth216Specials2.js` — Floor 3 + Floor 4 specials (28 abilities)
- `js/authority/earth216Specials3.js` — Floor 5 specials incl. Hollow Ace mini-boss and Alcazar final boss (14 abilities)

All three files append to the global `MOB_SPECIALS` registry defined in `js/authority/combatSystem.js`.

## Purpose

Defines every unique special ability used by mobs in the Earth-216 "Sin City" dungeon (Dungeon 6). Each ability is a function `(m, ctx) => {...}` invoked by the mob AI tick that manages its own telegraph/wind-up/execute state via underscore-prefixed fields on the mob instance `m`. Abilities return `{ skip: true }` while committed to a telegraph/dash so that base AI movement is suppressed. Damage is multiplied by `getMobDamageMultiplier()` at fire time. All telegraphs use `TelegraphSystem.create()` and all status effects use `StatusFX.applyToPlayer()`. Cooldown is reset to `m._specialCD || <ability default>` after each execution; out-of-range short-timer is 30 frames.

## Values

### Floor 1 — Regular specials (`earth216Specials.js`)

#### chip_toss (chip_runner)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials.js:10 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials.js:33 |
| Bullet speed | `GAME_CONFIG.BULLET_SPEED` | px/frame | js/authority/earth216Specials.js:17 |
| Damage | 20 × mobMult | hp | js/authority/earth216Specials.js:18 |
| Slow duration | 60 | frames | js/authority/earth216Specials.js:21 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials.js:21 |
| Max range | 280 | px | js/authority/earth216Specials.js:31 |
| Telegraph width | 12 | px | js/authority/earth216Specials.js:37 |
| Bullet color | #e8c44a | hex | js/authority/earth216Specials.js:19 |

#### pit_slam (pit_bruiser)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials.js:45 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials.js:61 |
| Radius | 120 | px | js/authority/earth216Specials.js:49 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials.js:50 |
| Activation range | ≤140 | px | js/authority/earth216Specials.js:60 |

#### velvet_slash (velvet_knifer)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials.js:72 |
| Telegraph frames | 30 | frames | js/authority/earth216Specials.js:101 |
| Cone half-angle | π/4 (45°) | rad | js/authority/earth216Specials.js:77 |
| Cone range | 100 | px | js/authority/earth216Specials.js:77 |
| Initial hit damage | 25 × mobMult | hp | js/authority/earth216Specials.js:78 |
| Slow duration | 120 | frames | js/authority/earth216Specials.js:82 |
| Slow amount | 0.15 | fraction | js/authority/earth216Specials.js:82 |
| Bleed total frames | 120 | frames | js/authority/earth216Specials.js:83 |
| Bleed tick interval | 30 | frames | js/authority/earth216Specials.js:92 |
| Bleed tick damage | 5 × mobMult | hp | js/authority/earth216Specials.js:93 |
| Activation range | ≤120 | px | js/authority/earth216Specials.js:99 |

#### vault_leap (vault_hound_e216)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials.js:111 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials.js:145 |
| Dash frames | 14 | frames | js/authority/earth216Specials.js:137 |
| Dash max length | min(dist+20, 220) | px | js/authority/earth216Specials.js:134 |
| Landing radius | 48 | px | js/authority/earth216Specials.js:119 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials.js:120 |
| Activation min dist | 80 | px | js/authority/earth216Specials.js:143 |
| Activation max dist | 260 | px | js/authority/earth216Specials.js:143 |
| Telegraph width | 20 | px | js/authority/earth216Specials.js:149 |

#### gilded_sweep (gilded_maid)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 190 | frames | js/authority/earth216Specials.js:157 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials.js:177 |
| Cone half-angle | π/3 (60°) | rad | js/authority/earth216Specials.js:162 |
| Cone range | 110 | px | js/authority/earth216Specials.js:162 |
| Damage | 22 × mobMult | hp | js/authority/earth216Specials.js:163 |
| Knockback | 4.2 | px/frame | js/authority/earth216Specials.js:168 |
| Activation range | ≤130 | px | js/authority/earth216Specials.js:175 |

#### venom_lunge (cashmere_viper)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials.js:187 |
| Telegraph frames | 30 | frames | js/authority/earth216Specials.js:233 |
| Dash frames | 12 | frames | js/authority/earth216Specials.js:225 |
| Dash max length | min(dist+20, 200) | px | js/authority/earth216Specials.js:222 |
| Landing radius | 44 | px | js/authority/earth216Specials.js:195 |
| Hit damage | 20 × mobMult | hp | js/authority/earth216Specials.js:196 |
| Poison slow duration | 90 | frames | js/authority/earth216Specials.js:200 |
| Poison slow amount | 0.2 | fraction | js/authority/earth216Specials.js:200 |
| Poison total frames | 90 | frames | js/authority/earth216Specials.js:201 |
| Poison tick interval | 30 | frames | js/authority/earth216Specials.js:211 |
| Poison tick damage | 4 × mobMult | hp | js/authority/earth216Specials.js:212 |
| Activation min dist | 60 | px | js/authority/earth216Specials.js:231 |
| Activation max dist | 240 | px | js/authority/earth216Specials.js:231 |

#### gem_bolt (jewel_wraith)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials.js:245 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials.js:265 |
| Bullet speed | 6 | px/frame | js/authority/earth216Specials.js:252 |
| Bullet life | 180 | frames | js/authority/earth216Specials.js:255 |
| Damage | 28 × mobMult | hp | js/authority/earth216Specials.js:253 |
| Max range | 320 | px | js/authority/earth216Specials.js:263 |
| Bullet color | #aa44ff | hex | js/authority/earth216Specials.js:254 |

#### bullion_charge (bullion_knight)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 220 | frames | js/authority/earth216Specials.js:277 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials.js:315 |
| Dash frames | 16 | frames | js/authority/earth216Specials.js:307 |
| Dash max length | min(dist+20, 240) | px | js/authority/earth216Specials.js:304 |
| Landing radius | 52 | px | js/authority/earth216Specials.js:285 |
| Damage | 32 × mobMult | hp | js/authority/earth216Specials.js:286 |
| Stun duration | 60 | frames | js/authority/earth216Specials.js:289 |
| Knockback | 2.8 | px/frame | js/authority/earth216Specials.js:292 |
| Activation min dist | 80 | px | js/authority/earth216Specials.js:313 |
| Activation max dist | 280 | px | js/authority/earth216Specials.js:313 |
| Telegraph width | 26 | px | js/authority/earth216Specials.js:319 |

### Floor 1 — Boss specials (victor_graves + madame_midas)

#### tribute_taken (victor_graves)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials.js:329 |
| Telegraph frames | 45 | frames | js/authority/earth216Specials.js:353 |
| Hit range | 300 | px | js/authority/earth216Specials.js:337 |
| Damage | 40 × mobMult | hp | js/authority/earth216Specials.js:338 |
| Knockback | 5.6 | px/frame | js/authority/earth216Specials.js:343 |
| Telegraph width | 28 | px | js/authority/earth216Specials.js:357 |
| Max target range | 320 | px | js/authority/earth216Specials.js:351 |

#### call_collection (victor_graves — summon)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 480 | frames | js/authority/earth216Specials.js:365 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials.js:408 |
| Max active minions | 4 | count | js/authority/earth216Specials.js:376 |
| Summons per cast | 2 | count | js/authority/earth216Specials.js:377 |
| Spawn ring radius | 60 | px | js/authority/earth216Specials.js:379-380 |
| Minion type | grunt | string | js/authority/earth216Specials.js:384 |
| Minion HP | round(boss.maxHp × 0.1) | hp | js/authority/earth216Specials.js:385 |
| Minion speed | 1.9 | px/frame | js/authority/earth216Specials.js:386 |
| Minion damage | round(boss.damage × 0.35) | hp | js/authority/earth216Specials.js:386 |
| Minion contactRange | 30 | px | js/authority/earth216Specials.js:387 |
| Minion scale | 0.85 | — | js/authority/earth216Specials.js:395 |
| Despawn timer | 300 | frames | js/authority/earth216Specials.js:394 |

#### iron_debt (victor_graves — self-buff)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials.js:419 |
| Buff duration | 240 | frames | js/authority/earth216Specials.js:434 |
| Damage multiplier | 1.5× | — | js/authority/earth216Specials.js:433 |
| Max range check | 350 | px | js/authority/earth216Specials.js:430 |

#### jackpot_bloom (madame_midas)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials.js:447 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials.js:477 |
| Bloom count | 3 | count | js/authority/earth216Specials.js:472 |
| Bloom radius | 70 | px | js/authority/earth216Specials.js:455 |
| Spawn offset min | 30 | px | js/authority/earth216Specials.js:474 |
| Spawn offset max | 30+80=110 | px | js/authority/earth216Specials.js:474 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials.js:456 |
| Max target range | 350 | px | js/authority/earth216Specials.js:470 |

#### crown_of_debt (madame_midas)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials.js:489 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials.js:508 |
| Hit radius | 90 | px | js/authority/earth216Specials.js:494 |
| Slow duration | 180 | frames | js/authority/earth216Specials.js:495 |
| Slow amount | 0.3 | fraction | js/authority/earth216Specials.js:495 |
| Damage | 18 × mobMult | hp | js/authority/earth216Specials.js:496 |
| Ring inner radius | 50 | px | js/authority/earth216Specials.js:510 |
| Ring outer radius | 90 | px | js/authority/earth216Specials.js:510 |

#### touch_of_midas (madame_midas — self-buff)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 420 | frames | js/authority/earth216Specials.js:518 |
| Damage reduction | 0.4 | fraction | js/authority/earth216Specials.js:529 |
| Buff duration | 300 | frames | js/authority/earth216Specials.js:530 |
| Max range check | 400 | px | js/authority/earth216Specials.js:528 |

### Floor 2 — Regular specials

#### scar_flurry (scar_punk)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials.js:544 |
| Telegraph frames | 25 | frames | js/authority/earth216Specials.js:564 |
| Cone half-angle | π/4 (45°) | rad | js/authority/earth216Specials.js:549 |
| Cone range | 90 | px | js/authority/earth216Specials.js:549 |
| Hit ticks | 3 | count | js/authority/earth216Specials.js:551 |
| Damage per tick | 12 × mobMult | hp | js/authority/earth216Specials.js:552 |
| Activation range | ≤110 | px | js/authority/earth216Specials.js:562 |

#### jaw_lunge (splitjaw)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 190 | frames | js/authority/earth216Specials.js:574 |
| Telegraph frames | 28 | frames | js/authority/earth216Specials.js:619 |
| Dash frames | 10 | frames | js/authority/earth216Specials.js:611 |
| Dash max length | min(dist+20, 160) | px | js/authority/earth216Specials.js:608 |
| Landing radius | 44 | px | js/authority/earth216Specials.js:582 |
| Damage | 28 × mobMult | hp | js/authority/earth216Specials.js:583 |
| Bleed slow duration | 90 | frames | js/authority/earth216Specials.js:586 |
| Bleed slow amount | 0.2 | fraction | js/authority/earth216Specials.js:586 |
| Bleed total frames | 90 | frames | js/authority/earth216Specials.js:587 |
| Bleed tick interval | 30 | frames | js/authority/earth216Specials.js:597 |
| Bleed tick damage | 4 × mobMult | hp | js/authority/earth216Specials.js:598 |
| Activation min dist | 50 | px | js/authority/earth216Specials.js:617 |
| Activation max dist | 200 | px | js/authority/earth216Specials.js:617 |

#### razor_sprint (razorback_youth)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials.js:631 |
| Telegraph frames | 30 | frames | js/authority/earth216Specials.js:669 |
| Dash frames | 16 | frames | js/authority/earth216Specials.js:661 |
| Dash max length | min(dist+40, 260) | px | js/authority/earth216Specials.js:658 |
| Trail interval | every 4 frames | frames | js/authority/earth216Specials.js:639 |
| Trail smoke life | 60 | frames | js/authority/earth216Specials.js:640 |
| Landing radius | 48 | px | js/authority/earth216Specials.js:643 |
| Damage | 26 × mobMult | hp | js/authority/earth216Specials.js:644 |
| Activation min dist | 80 | px | js/authority/earth216Specials.js:667 |
| Activation max dist | 300 | px | js/authority/earth216Specials.js:667 |

#### stitch_bomb (grin_stitcher)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 220 | frames | js/authority/earth216Specials.js:681 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials.js:700 |
| Radius | 80 | px | js/authority/earth216Specials.js:686 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials.js:687 |
| Max target range | 280 | px | js/authority/earth216Specials.js:697 |

#### shade_note (chorus_shade)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials.js:710 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials.js:733 |
| Bullet speed | 7 | px/frame | js/authority/earth216Specials.js:717 |
| Damage | 18 × mobMult | hp | js/authority/earth216Specials.js:718 |
| Silence duration | 120 | frames | js/authority/earth216Specials.js:721 |
| Max range | 300 | px | js/authority/earth216Specials.js:731 |

#### spotlight_dash (spotlight_stalker)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 220 | frames | js/authority/earth216Specials.js:745 |
| Telegraph frames (mark delay) | 50 | frames | js/authority/earth216Specials.js:782 |
| Dash frames | 14 | frames | js/authority/earth216Specials.js:772 |
| Dash max length | min(markDist+10, 300) | px | js/authority/earth216Specials.js:769 |
| Mark radius | 50 | px | js/authority/earth216Specials.js:784 |
| Landing radius | 50 | px | js/authority/earth216Specials.js:753 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials.js:754 |
| Max target range | 320 | px | js/authority/earth216Specials.js:778 |

#### mourning_wail (velvet_mourner)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials.js:792 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials.js:809 |
| Radius | 130 | px | js/authority/earth216Specials.js:796 |
| Damage | 22 × mobMult | hp | js/authority/earth216Specials.js:797 |
| Slow duration | 90 | frames | js/authority/earth216Specials.js:800 |
| Slow amount | 0.35 | fraction | js/authority/earth216Specials.js:800 |
| Activation range | ≤150 | px | js/authority/earth216Specials.js:808 |

#### static_shot (static_tenor)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials.js:820 |
| Telegraph frames | 30 | frames | js/authority/earth216Specials.js:843 |
| Bullet speed | 10 | px/frame | js/authority/earth216Specials.js:827 |
| Damage | 24 × mobMult | hp | js/authority/earth216Specials.js:828 |
| Stun duration | 45 | frames | js/authority/earth216Specials.js:831 |
| Max range | 300 | px | js/authority/earth216Specials.js:841 |

### Floor 2 — Boss specials (blackout_belle + slasher_e216)

#### total_blackout (blackout_belle)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials.js:857 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials.js:885 |
| Blind duration | 180 | frames | js/authority/earth216Specials.js:861 |
| Speed multiplier | 1.4× | — | js/authority/earth216Specials.js:866 |
| Speed buff duration | 180 | frames | js/authority/earth216Specials.js:868 |
| Telegraph radius | 400 | px | js/authority/earth216Specials.js:887 |
| Max target range | 400 | px | js/authority/earth216Specials.js:884 |

#### feedback_kiss (blackout_belle)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials.js:896 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials.js:914 |
| Cone half-angle | π/4 (45°) | rad | js/authority/earth216Specials.js:901 |
| Cone range | 180 | px | js/authority/earth216Specials.js:901 |
| Damage | 40 × mobMult | hp | js/authority/earth216Specials.js:902 |
| Slow duration | 180 | frames | js/authority/earth216Specials.js:905 |
| Slow amount | 0.35 | fraction | js/authority/earth216Specials.js:905 |
| Activation range | ≤200 | px | js/authority/earth216Specials.js:912 |

#### dead_applause (blackout_belle)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials.js:924 |
| Telegraph frames | 60 | frames | js/authority/earth216Specials.js:953 |
| Burst count | 4-5 | count | js/authority/earth216Specials.js:946 |
| Burst radius | 65 | px | js/authority/earth216Specials.js:930 |
| Damage per hit (single) | 28 × mobMult | hp | js/authority/earth216Specials.js:931 |
| Spawn offset min | 20 | px | js/authority/earth216Specials.js:950 |
| Spawn offset max | 20+70=90 | px | js/authority/earth216Specials.js:950 |
| Max target range | 350 | px | js/authority/earth216Specials.js:945 |

#### carnage_arm (slasher_e216 — self-buff)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials.js:965 |
| Buff duration | 240 | frames | js/authority/earth216Specials.js:982 |
| Damage multiplier | 1.3× | — | js/authority/earth216Specials.js:980 |
| Contact range multiplier | 1.3× | — | js/authority/earth216Specials.js:981 |
| Max range check | 350 | px | js/authority/earth216Specials.js:977 |

#### blood_trail_dash (slasher_e216)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials.js:995 |
| Telegraph frames | 45 | frames | js/authority/earth216Specials.js:1034 |
| Dash frames | 18 | frames | js/authority/earth216Specials.js:1026 |
| Dash max length | min(dist+60, 320) | px | js/authority/earth216Specials.js:1023 |
| Trail interval | every 3 frames | frames | js/authority/earth216Specials.js:1003 |
| Trail smoke life | 80 | frames | js/authority/earth216Specials.js:1004 |
| Hit frame | dash==9 | frames | js/authority/earth216Specials.js:1007 |
| Hit radius | 50 | px | js/authority/earth216Specials.js:1007 |
| Damage | 38 × mobMult | hp | js/authority/earth216Specials.js:1008 |
| Activation min dist | 80 | px | js/authority/earth216Specials.js:1032 |
| Activation max dist | 350 | px | js/authority/earth216Specials.js:1032 |

#### predator_lock (slasher_e216)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials.js:1046 |
| Mark delay (telegraph) | 90 | frames | js/authority/earth216Specials.js:1085 |
| Leap frames | 16 | frames | js/authority/earth216Specials.js:1075 |
| Leap max length | min(markDist+10, 350) | px | js/authority/earth216Specials.js:1072 |
| AoE radius | 80 | px | js/authority/earth216Specials.js:1055 |
| Damage | 42 × mobMult | hp | js/authority/earth216Specials.js:1056 |
| Max target range | 400 | px | js/authority/earth216Specials.js:1081 |

### Floor 3 — Regular specials (`earth216Specials2.js`)

#### bone_wall (marrow_guard)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials2.js:10 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials2.js:38 |
| Zone life | 180 | frames | js/authority/earth216Specials2.js:28 |
| Zone tick interval | 30 | frames | js/authority/earth216Specials2.js:16 |
| Zone radius | 55 | px | js/authority/earth216Specials2.js:18 |
| Damage per tick | 15 × mobMult | hp | js/authority/earth216Specials2.js:19 |
| Max target range | 250 | px | js/authority/earth216Specials2.js:35 |

#### candle_toss (candle_child)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials2.js:48 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:76 |
| Zone life | 120 | frames | js/authority/earth216Specials2.js:66 |
| Zone tick interval | 20 | frames | js/authority/earth216Specials2.js:54 |
| Zone radius | 45 | px | js/authority/earth216Specials2.js:56 |
| Damage per tick | 12 × mobMult | hp | js/authority/earth216Specials2.js:57 |
| Max target range | 280 | px | js/authority/earth216Specials2.js:73 |

#### spirit_ward (ofrenda_keeper — heal aura)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials2.js:86 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials2.js:116 |
| Aura duration | 180 | frames | js/authority/earth216Specials2.js:109 |
| Tick interval | 30 | frames | js/authority/earth216Specials2.js:90 |
| Aura radius | 200 | px | js/authority/earth216Specials2.js:94 |
| Heal per tick | floor(ally.maxHp × 0.03) | hp | js/authority/earth216Specials2.js:96 |
| Max target range | 400 | px | js/authority/earth216Specials2.js:115 |

#### death_note (grave_trumpeter)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials2.js:126 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials2.js:145 |
| Bullet speed | 11 | px/frame | js/authority/earth216Specials2.js:133 |
| Bullet life | 60 | frames | js/authority/earth216Specials2.js:135 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials2.js:134 |
| Pierce | true | bool | js/authority/earth216Specials2.js:135 |
| Max range | 350 | px | js/authority/earth216Specials2.js:143 |

#### veil_mist (veil_sister — fog+heal)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials2.js:157 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:192 |
| Mist duration | 240 | frames | js/authority/earth216Specials2.js:185 |
| Tick interval | 40 | frames | js/authority/earth216Specials2.js:161 |
| Mist radius | 180 | px | js/authority/earth216Specials2.js:164 |
| Slow duration | 45 | frames | js/authority/earth216Specials2.js:165 |
| Slow amount | 0.5 | fraction | js/authority/earth216Specials2.js:165 |
| Ally heal per tick | floor(ally.maxHp × 0.02) | hp | js/authority/earth216Specials2.js:173 |
| Max target range | 350 | px | js/authority/earth216Specials2.js:191 |

#### flame_kiss (candle_bride)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials2.js:202 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:221 |
| Cone half-angle | π/6 (30°) | rad | js/authority/earth216Specials2.js:207 |
| Cone range | 160 | px | js/authority/earth216Specials2.js:207 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials2.js:208 |
| Slow duration | 90 | frames | js/authority/earth216Specials2.js:210 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials2.js:210 |
| Activation range | ≤180 | px | js/authority/earth216Specials2.js:219 |

#### rosary_thrust (rosary_fencer)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials2.js:231 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials2.js:266 |
| Dash frames | 12 | frames | js/authority/earth216Specials2.js:258 |
| Dash max length | min(dist+20, 220) | px | js/authority/earth216Specials2.js:255 |
| Landing radius | 45 | px | js/authority/earth216Specials2.js:239 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials2.js:240 |
| Knockback | 3.5 | px/frame | js/authority/earth216Specials2.js:244 |
| Activation min dist | 60 | px | js/authority/earth216Specials2.js:264 |
| Activation max dist | 250 | px | js/authority/earth216Specials2.js:264 |

#### dirge_arrow (choir_widow)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials2.js:278 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:301 |
| Bullet speed | 4.5 | px/frame | js/authority/earth216Specials2.js:285 |
| Bullet life | 90 | frames | js/authority/earth216Specials2.js:287 |
| Damage | 25 × mobMult | hp | js/authority/earth216Specials2.js:286 |
| Slow duration | 120 | frames | js/authority/earth216Specials2.js:289 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials2.js:289 |
| Max range | 320 | px | js/authority/earth216Specials2.js:299 |

### Floor 3 — Boss specials (macabre_e216 + rosa_calavera)

#### cemetery_call (macabre_e216 — summon)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 600 | frames | js/authority/earth216Specials2.js:315 |
| Telegraph frames | 60 | frames | js/authority/earth216Specials2.js:348 |
| Max active minions | 6 | count | js/authority/earth216Specials2.js:320 |
| Summons per cast | 3 | count | js/authority/earth216Specials2.js:321 |
| Spawn ring radius | 70 | px | js/authority/earth216Specials2.js:323-324 |
| Minion type | skeleton | string | js/authority/earth216Specials2.js:327 |
| Minion HP | round(boss.maxHp × 0.06) | hp | js/authority/earth216Specials2.js:328 |
| Minion speed | 1.9 | px/frame | js/authority/earth216Specials2.js:329 |
| Minion damage | round(boss.damage × 0.25) | hp | js/authority/earth216Specials2.js:329 |
| Minion scale | 0.8 | — | js/authority/earth216Specials2.js:337 |

#### funeral_ring (macabre_e216)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials2.js:359 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials2.js:376 |
| Hit radius | 160 | px | js/authority/earth216Specials2.js:363 |
| Damage | 40 × mobMult | hp | js/authority/earth216Specials2.js:364 |
| Root duration | 90 | frames | js/authority/earth216Specials2.js:366 |
| Ring inner radius | 40 | px | js/authority/earth216Specials2.js:378 |
| Ring outer radius | 160 | px | js/authority/earth216Specials2.js:378 |
| Activation range | ≤200 | px | js/authority/earth216Specials2.js:375 |

#### ofrenda_burst (macabre_e216)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials2.js:387 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials2.js:407 |
| Radius | 80 | px | js/authority/earth216Specials2.js:392 |
| Damage | 45 × mobMult | hp | js/authority/earth216Specials2.js:393 |
| Slow duration | 90 | frames | js/authority/earth216Specials2.js:395 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials2.js:395 |
| Max target range | 300 | px | js/authority/earth216Specials2.js:404 |

#### ghost_mariachi (rosa_calavera)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials2.js:417 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:447 |
| Shot sequence timer | 30 | frames | js/authority/earth216Specials2.js:440 |
| Shots | 3 (at t=20, 10, 0) | count | js/authority/earth216Specials2.js:421 |
| Bullet speed | `GAME_CONFIG.BULLET_SPEED` | px/frame | js/authority/earth216Specials2.js:426 |
| Bullet life | 60 | frames | js/authority/earth216Specials2.js:428 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials2.js:427 |
| Spread | ±0.1 rad random | rad | js/authority/earth216Specials2.js:423 |
| Max range | 350 | px | js/authority/earth216Specials2.js:445 |

#### candle_procession (rosa_calavera)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials2.js:459 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials2.js:498 |
| Procession sequence | 60 | frames | js/authority/earth216Specials2.js:485 |
| Circles | 4 at 70/140/210/280 px | count/px | js/authority/earth216Specials2.js:494-496 |
| Ignition frames | 45, 30, 15, 0 | frames | js/authority/earth216Specials2.js:464 |
| Circle radius | 50 | px | js/authority/earth216Specials2.js:469 |
| Damage per hit | 25 × mobMult | hp | js/authority/earth216Specials2.js:470 |
| Circle stagger delay | 15 per index | frames | js/authority/earth216Specials2.js:502 |
| Max target range | 350 | px | js/authority/earth216Specials2.js:490 |

#### last_serenade (rosa_calavera)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials2.js:511 |
| Telegraph frames | 65 | frames | js/authority/earth216Specials2.js:531 |
| Radius | 200 | px | js/authority/earth216Specials2.js:515 |
| Damage | 50 × mobMult | hp | js/authority/earth216Specials2.js:516 |
| Fear duration | 120 | frames | js/authority/earth216Specials2.js:518 |
| Knockback | 5.6 | px/frame | js/authority/earth216Specials2.js:522 |
| Activation range | ≤250 | px | js/authority/earth216Specials2.js:530 |

### Floor 4 — Regular specials

#### chain_whip (chain_gremlin)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials2.js:544 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials2.js:565 |
| Hit radius | 200 | px | js/authority/earth216Specials2.js:549 |
| Damage | 25 × mobMult | hp | js/authority/earth216Specials2.js:550 |
| Pull magnitude | 4.9 | px/frame | js/authority/earth216Specials2.js:555 |
| Telegraph width | 18 | px | js/authority/earth216Specials2.js:569 |
| Max target range | 220 | px | js/authority/earth216Specials2.js:563 |

#### road_rage (road_reaper)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 190 | frames | js/authority/earth216Specials2.js:577 |
| Telegraph frames | 30 | frames | js/authority/earth216Specials2.js:613 |
| Dash frames | 10 | frames | js/authority/earth216Specials2.js:605 |
| Dash max length | min(dist-30, 140) | px | js/authority/earth216Specials2.js:602 |
| Cone half-angle | π/4 (45°) | rad | js/authority/earth216Specials2.js:587 |
| Cone range | 100 | px | js/authority/earth216Specials2.js:587 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials2.js:588 |
| Activation min dist | 80 | px | js/authority/earth216Specials2.js:611 |
| Activation max dist | 250 | px | js/authority/earth216Specials2.js:611 |

#### furnace_punch (furnace_knuckle)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials2.js:625 |
| Telegraph frames | 30 | frames | js/authority/earth216Specials2.js:642 |
| Radius | 70 | px | js/authority/earth216Specials2.js:629 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials2.js:630 |
| Slow duration | 90 | frames | js/authority/earth216Specials2.js:632 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials2.js:632 |
| Activation range | ≤90 | px | js/authority/earth216Specials2.js:641 |

#### rev_charge (rev_hound)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials2.js:653 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:693 |
| Dash frames | 18 | frames | js/authority/earth216Specials2.js:684 |
| Dash max length | min(dist+80, 320) | px | js/authority/earth216Specials2.js:681 |
| Hit radius | 40 | px | js/authority/earth216Specials2.js:661 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials2.js:662 |
| Trail interval | every 3 frames | frames | js/authority/earth216Specials2.js:667 |
| Trail smoke life | 30 | frames | js/authority/earth216Specials2.js:668 |
| Activation min dist | 100 | px | js/authority/earth216Specials2.js:691 |
| Activation max dist | 350 | px | js/authority/earth216Specials2.js:691 |

#### drift_blink (drift_phantom)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials2.js:705 |
| Telegraph frames | 45 | frames | js/authority/earth216Specials2.js:730 |
| Teleport offset | 50 (behind player) | px | js/authority/earth216Specials2.js:711-712 |
| Backstab radius | 55 | px | js/authority/earth216Specials2.js:718 |
| Damage | 45 × mobMult | hp | js/authority/earth216Specials2.js:719 |
| Max target range | 300 | px | js/authority/earth216Specials2.js:729 |

#### dummy_detonate (crash_dummy)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials2.js:744 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials2.js:762 |
| Radius | 120 | px | js/authority/earth216Specials2.js:748 |
| Damage | 50 × mobMult | hp | js/authority/earth216Specials2.js:749 |
| Knockback | 4.9 | px/frame | js/authority/earth216Specials2.js:753 |
| Activation range | ≤150 | px | js/authority/earth216Specials2.js:761 |

#### neon_shriek (neon_screamer)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials2.js:773 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:794 |
| Cone half-angle | π/4 (45°) | rad | js/authority/earth216Specials2.js:778 |
| Cone range | 180 | px | js/authority/earth216Specials2.js:778 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials2.js:779 |
| Fear duration | 90 | frames | js/authority/earth216Specials2.js:781 |
| Knockback | 4.2 | px/frame | js/authority/earth216Specials2.js:784 |
| Activation range | ≤200 | px | js/authority/earth216Specials2.js:792 |

#### ramp_launch (ramp_widow)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials2.js:804 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials2.js:841 |
| Leap frames | 20 | frames | js/authority/earth216Specials2.js:832 |
| Landing radius | 90 | px | js/authority/earth216Specials2.js:813 |
| Damage | 40 × mobMult | hp | js/authority/earth216Specials2.js:814 |
| Knockback | 4.9 | px/frame | js/authority/earth216Specials2.js:818 |
| Max target range | 300 | px | js/authority/earth216Specials2.js:838 |

### Floor 4 — Boss specials (motor_demon + nitro_wraith)

#### redline_e216 (motor_demon — self-buff)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 420 | frames | js/authority/earth216Specials2.js:853 |
| Telegraph frames | 20 | frames | js/authority/earth216Specials2.js:877 |
| Buff duration | 180 | frames | js/authority/earth216Specials2.js:868 |
| Speed multiplier | 2× | — | js/authority/earth216Specials2.js:867 |
| Max range check | 400 | px | js/authority/earth216Specials2.js:876 |

#### hell_exhaust (motor_demon)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials2.js:888 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials2.js:910 |
| Direction | backward (away from player) | — | js/authority/earth216Specials2.js:893 |
| Cone half-angle | π/4 (45°) | rad | js/authority/earth216Specials2.js:894 |
| Cone range | 180 | px | js/authority/earth216Specials2.js:894 |
| Damage | 40 × mobMult | hp | js/authority/earth216Specials2.js:895 |
| Slow duration | 90 | frames | js/authority/earth216Specials2.js:897 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials2.js:897 |
| Knockback | 5.6 | px/frame | js/authority/earth216Specials2.js:900 |
| Activation range | ≤220 | px | js/authority/earth216Specials2.js:908 |

#### geargrind_slam (motor_demon)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 270 | frames | js/authority/earth216Specials2.js:920 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials2.js:953 |
| Leap frames | 18 | frames | js/authority/earth216Specials2.js:944 |
| Landing radius | 100 | px | js/authority/earth216Specials2.js:928 |
| Damage | 55 × mobMult | hp | js/authority/earth216Specials2.js:929 |
| Stun duration | 90 | frames | js/authority/earth216Specials2.js:931 |
| Max target range | 350 | px | js/authority/earth216Specials2.js:950 |

#### nitro_line (nitro_wraith)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 270 | frames | js/authority/earth216Specials2.js:963 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials2.js:1018 |
| Dash frames | 22 | frames | js/authority/earth216Specials2.js:1009 |
| Dash length | 400 | px | js/authority/earth216Specials2.js:1006 |
| Dash hit radius | 40 | px | js/authority/earth216Specials2.js:989 |
| Dash damage | 40 × mobMult | hp | js/authority/earth216Specials2.js:990 |
| Trail interval | every 3 frames | frames | js/authority/earth216Specials2.js:985 |
| Trail zone life | 120 | frames | js/authority/earth216Specials2.js:986 |
| Trail zone tick | 20 | frames | js/authority/earth216Specials2.js:969 |
| Trail zone radius | 35 | px | js/authority/earth216Specials2.js:971 |
| Trail zone damage | 15 × mobMult | hp | js/authority/earth216Specials2.js:972 |
| Max target range | 450 | px | js/authority/earth216Specials2.js:1016 |

#### phantom_splitstream (nitro_wraith)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials2.js:1030 |
| Telegraph frames | 45 | frames | js/authority/earth216Specials2.js:1077 |
| Dash frames | 14 | frames | js/authority/earth216Specials2.js:1067 |
| Dash max length | min(dist+20, 260) | px | js/authority/earth216Specials2.js:1063 |
| Landing radius | 45 | px | js/authority/earth216Specials2.js:1038 |
| Real dash damage | 35 × mobMult | hp | js/authority/earth216Specials2.js:1039 |
| Afterimage radius | 50 | px | js/authority/earth216Specials2.js:1055 |
| Afterimage damage | 25 × mobMult | hp | js/authority/earth216Specials2.js:1056 |
| Afterimage spread | π/8 | rad | js/authority/earth216Specials2.js:1075 |
| Activation min dist | 80 | px | js/authority/earth216Specials2.js:1073 |
| Activation max dist | 350 | px | js/authority/earth216Specials2.js:1073 |

#### crash_bloom (nitro_wraith)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials2.js:1099 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials2.js:1155 |
| Charge dash frames | 16 | frames | js/authority/earth216Specials2.js:1145 |
| Ring phase duration | 50 | frames | js/authority/earth216Specials2.js:1129 |
| Rings | 3 (r=80, 160, 240) | count/px | js/authority/earth216Specials2.js:1106 |
| Ring ignition frames | 40, 25, 10 | frames | js/authority/earth216Specials2.js:1104 |
| Ring hit band | ±40 of radius | px | js/authority/earth216Specials2.js:1109 |
| Ring damage | 35 × mobMult | hp | js/authority/earth216Specials2.js:1110 |
| Ring stagger delay | 10, 25, 40 | frames | js/authority/earth216Specials2.js:1133 |
| Max target range | 500 | px | js/authority/earth216Specials2.js:1151 |

### Floor 5 — Regular specials (`earth216Specials3.js`)

#### card_flick (cardling)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 150 | frames | js/authority/earth216Specials3.js:10 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials3.js:33 |
| Projectile count | 2 | count | js/authority/earth216Specials3.js:16 |
| Spread | 15° | deg | js/authority/earth216Specials3.js:15 |
| Bullet speed | `GAME_CONFIG.BULLET_SPEED` | px/frame | js/authority/earth216Specials3.js:20 |
| Damage | 20 × mobMult | hp | js/authority/earth216Specials3.js:21 |
| Max range | 300 | px | js/authority/earth216Specials3.js:31 |

#### oracle_curse (pit_oracle)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 240 | frames | js/authority/earth216Specials3.js:45 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials3.js:64 |
| Radius | 70 | px | js/authority/earth216Specials3.js:50 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials3.js:51 |
| Slow duration | 120 | frames | js/authority/earth216Specials3.js:53 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials3.js:53 |
| Max target range | 350 | px | js/authority/earth216Specials3.js:61 |

#### spin_slash (roulette_revenant)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials3.js:74 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials3.js:90 |
| Radius | 100 | px | js/authority/earth216Specials3.js:78 |
| Damage | 35 × mobMult | hp | js/authority/earth216Specials3.js:79 |
| Activation range | ≤130 | px | js/authority/earth216Specials3.js:89 |

#### reaper_cut (suit_reaper)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials3.js:100 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials3.js:119 |
| Cone half-angle | π/4.5 (40°) | rad | js/authority/earth216Specials3.js:105 |
| Cone range | 120 | px | js/authority/earth216Specials3.js:105 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials3.js:106 |
| Slow duration | 150 | frames | js/authority/earth216Specials3.js:108 |
| Slow amount | 0.5 | fraction | js/authority/earth216Specials3.js:108 |
| Activation range | ≤140 | px | js/authority/earth216Specials3.js:117 |

#### blight_burst (blight_husk)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials3.js:129 |
| Telegraph frames | 45 | frames | js/authority/earth216Specials3.js:146 |
| Radius | 90 | px | js/authority/earth216Specials3.js:133 |
| Damage | 25 × mobMult | hp | js/authority/earth216Specials3.js:134 |
| Slow duration | 120 | frames | js/authority/earth216Specials3.js:136 |
| Slow amount | 0.4 | fraction | js/authority/earth216Specials3.js:136 |
| Activation range | ≤120 | px | js/authority/earth216Specials3.js:145 |

#### maw_bite (maw_sprite)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 180 | frames | js/authority/earth216Specials3.js:156 |
| Telegraph frames | 35 | frames | js/authority/earth216Specials3.js:194 |
| Dash frames | 14 | frames | js/authority/earth216Specials3.js:186 |
| Dash max length | min(dist+20, 200) | px | js/authority/earth216Specials3.js:183 |
| Landing radius | 50 | px | js/authority/earth216Specials3.js:164 |
| Damage | 30 × mobMult | hp | js/authority/earth216Specials3.js:165 |
| Self-heal | floor(maxHp × 0.05) | hp | js/authority/earth216Specials3.js:170 |
| Activation min dist | 60 | px | js/authority/earth216Specials3.js:192 |
| Activation max dist | 250 | px | js/authority/earth216Specials3.js:192 |

#### rift_pulse (rift_penitent)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 210 | frames | js/authority/earth216Specials3.js:206 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials3.js:226 |
| Outer radius | 110 | px | js/authority/earth216Specials3.js:212 |
| Inner radius (safe) | 40 | px | js/authority/earth216Specials3.js:212 |
| Damage | 28 × mobMult | hp | js/authority/earth216Specials3.js:213 |
| Slow duration | 120 | frames | js/authority/earth216Specials3.js:215 |
| Slow amount | 0.45 | fraction | js/authority/earth216Specials3.js:215 |
| Max target range | 300 | px | js/authority/earth216Specials3.js:223 |

#### apostle_dash (grin_apostle)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 200 | frames | js/authority/earth216Specials3.js:236 |
| Telegraph frames | 40 | frames | js/authority/earth216Specials3.js:287 |
| Dash frames | 16 | frames | js/authority/earth216Specials3.js:279 |
| Dash max length | min(dist+20, 240) | px | js/authority/earth216Specials3.js:276 |
| Landing radius | 48 | px | js/authority/earth216Specials3.js:258 |
| Damage | 25 × mobMult | hp | js/authority/earth216Specials3.js:259 |
| Zone life | 180 | frames | js/authority/earth216Specials3.js:264 |
| Zone tick interval | 20 | frames | js/authority/earth216Specials3.js:242 |
| Zone radius | 60 | px | js/authority/earth216Specials3.js:244 |
| Zone tick damage | 10 × mobMult | hp | js/authority/earth216Specials3.js:245 |
| Activation min dist | 80 | px | js/authority/earth216Specials3.js:285 |
| Activation max dist | 300 | px | js/authority/earth216Specials3.js:285 |

### Floor 5 — Hollow Ace mini-boss specials

#### stacked_deck (hollow_ace)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials3.js:301 |
| Telegraph frames | 45 | frames | js/authority/earth216Specials3.js:346 |
| Sequence duration | 32 | frames | js/authority/earth216Specials3.js:339 |
| Shots | 4 (every 8 frames) | count | js/authority/earth216Specials3.js:307 |
| Bullet speed | 9 | px/frame | js/authority/earth216Specials3.js:319 |
| Damage per shot | 35 × mobMult | hp | js/authority/earth216Specials3.js:320 |
| Shot 0 status | slow 90f, 0.5 | — | js/authority/earth216Specials3.js:310 |
| Shot 1 status | root 45f | — | js/authority/earth216Specials3.js:311 |
| Shot 2 status | none (pure damage) | — | js/authority/earth216Specials3.js:312 |
| Shot 3 status | stun 30f | — | js/authority/earth216Specials3.js:313 |
| Max target range | 350 | px | js/authority/earth216Specials3.js:344 |

#### cold_read_e216 (hollow_ace)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials3.js:358 |
| Initial telegraph | 40 | frames | js/authority/earth216Specials3.js:392 |
| Delayed eruption | 120 | frames | js/authority/earth216Specials3.js:380 |
| Radius | 80 | px | js/authority/earth216Specials3.js:364 |
| Damage | 55 × mobMult | hp | js/authority/earth216Specials3.js:365 |
| Stun duration | 45 | frames | js/authority/earth216Specials3.js:367 |
| Max target range | 400 | px | js/authority/earth216Specials3.js:389 |

#### house_pull (hollow_ace — vortex)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 420 | frames | js/authority/earth216Specials3.js:403 |
| Telegraph frames | 50 | frames | js/authority/earth216Specials3.js:438 |
| Vortex duration | 120 | frames | js/authority/earth216Specials3.js:431 |
| Pull range | 250 | px | js/authority/earth216Specials3.js:410 |
| Pull dead zone | 30 | px | js/authority/earth216Specials3.js:410 |
| Pull strength | 1.8 | px/frame | js/authority/earth216Specials3.js:411 |
| Tick interval | 30 | frames | js/authority/earth216Specials3.js:416 |
| Tick damage | 12 × mobMult | hp | js/authority/earth216Specials3.js:417 |
| Max target range | 300 | px | js/authority/earth216Specials3.js:437 |

### Floor 5 — Alcazar final boss specials

#### corrupt_vessel (alcazar)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 300 | frames | js/authority/earth216Specials3.js:451 |
| Telegraph frames | 55 | frames | js/authority/earth216Specials3.js:498 |
| Projectile count | 5 | count | js/authority/earth216Specials3.js:472 |
| Fan spread | ±30° total | — | js/authority/earth216Specials3.js:471 |
| Bullet speed | 6 | px/frame | js/authority/earth216Specials3.js:474 |
| Damage | 40 × mobMult | hp | js/authority/earth216Specials3.js:478 |
| On-hit slow duration | 90 | frames | js/authority/earth216Specials3.js:481 |
| On-hit slow amount | 0.5 | fraction | js/authority/earth216Specials3.js:481 |
| Puddle life | 240 | frames | js/authority/earth216Specials3.js:485 |
| Puddle tick interval | 25 | frames | js/authority/earth216Specials3.js:457 |
| Puddle radius | 50 | px | js/authority/earth216Specials3.js:459 |
| Puddle damage | 15 × mobMult | hp | js/authority/earth216Specials3.js:460 |
| Puddle slow duration | 60 | frames | js/authority/earth216Specials3.js:462 |
| Puddle slow amount | 0.4 | fraction | js/authority/earth216Specials3.js:462 |
| Max target range | 400 | px | js/authority/earth216Specials3.js:496 |

#### black_benediction (alcazar)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 420 | frames | js/authority/earth216Specials3.js:508 |
| Telegraph frames | 70 | frames | js/authority/earth216Specials3.js:531 |
| Self-heal | floor(maxHp × 0.10) | hp | js/authority/earth216Specials3.js:514 |
| Hit radius | 160 | px | js/authority/earth216Specials3.js:517 |
| Damage | 50 × mobMult | hp | js/authority/earth216Specials3.js:518 |
| Silence duration | 120 | frames | js/authority/earth216Specials3.js:520 |
| Slow duration | 120 | frames | js/authority/earth216Specials3.js:521 |
| Slow amount | 0.5 | fraction | js/authority/earth216Specials3.js:521 |
| Out-of-range short CD | 60 | frames | js/authority/earth216Specials3.js:530 |
| Out-of-range threshold | 500 | px | js/authority/earth216Specials3.js:530 |

#### unsealing_maw (alcazar)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Default cooldown | 360 | frames | js/authority/earth216Specials3.js:542 |
| Telegraph frames | 80 | frames | js/authority/earth216Specials3.js:578 |
| Radius | 90 | px | js/authority/earth216Specials3.js:561 |
| Damage | 65 × mobMult | hp | js/authority/earth216Specials3.js:562 |
| Root duration | 120 | frames | js/authority/earth216Specials3.js:564 |
| Hazard zone life | 300 | frames | js/authority/earth216Specials3.js:568 |
| Hazard tick interval | 20 | frames | js/authority/earth216Specials3.js:548 |
| Hazard radius | 70 | px | js/authority/earth216Specials3.js:550 |
| Hazard tick damage | 18 × mobMult | hp | js/authority/earth216Specials3.js:551 |
| Max target range | 400 | px | js/authority/earth216Specials3.js:575 |

## Behavior

All Earth-216 specials share the same state machine template:

1. On first invocation, `m._specialTimer` is initialized to `m._specialCD || <ability default cooldown>` (e.g. js/authority/earth216Specials.js:10).
2. While `_specialTimer > 0`, decrement and return `{}` (normal AI movement allowed).
3. If out of activation range, set `_specialTimer = 30` and return — short retry cooldown.
4. Otherwise begin the telegraph phase: set `m._<ability>Tele = <N>`, call `TelegraphSystem.create()` with the appropriate shape (line/circle/cone/ring), and return `{ skip: true }` to block base AI movement until commit.
5. When telegraph decrements to 0, commit: either fire bullets (`bullets.push`), deal AoE damage via `AttackShapes.hitsPlayer`/`playerInCone`, start a dash phase, or apply a self-buff. Status effects go through `StatusFX.applyToPlayer()`.
6. Dash phases linearly interpolate `m.x`/`m.y` from stored start (`_<ability>SX`/`SY`) to target (`_<ability>TX`/`TY`) over a fixed frame count; target is clamped via `clampDashTarget()`.
7. Damage on execute: `dealDamageToPlayer(Math.round(<base> * getMobDamageMultiplier()), 'mob_special', m)`.
8. Persistent hazard zones (bone_wall, candle_toss, apostle_dash corruption, nitro_line trail, corrupt_vessel puddles, unsealing_maw hazard) are stored on `m._<zoneArray>` and ticked each call; they filter out expired zones (`life > 0`) and deal damage when player is within their radius on tick boundaries.
9. Summon specials (call_collection, cemetery_call) track active minion IDs and cap re-summon; summoned mobs carry `_summonOwnerId = m.id` and (for call_collection) `_despawnTimer = 300` (js/authority/earth216Specials.js:394).
10. Self-buff specials (iron_debt, touch_of_midas, carnage_arm, redline_e216, blackout_belle speed) store `_origDamage`/`_origSpeed`/`_origContactRange`, multiply the stat, and restore on buff timer expiry.
11. Reset `_specialTimer = m._specialCD || <default>` after execution.

## Dependencies

- Reads: `player.x`, `player.y`, `m.x`, `m.y`, `m.hp`, `m.maxHp`, `m.damage`, `m.speed`, `m.contactRange`, `m.type`, `m.id`, `MOB_TYPES`, `GAME_CONFIG.BULLET_SPEED`, `gameFrame`, `dist` (passed in ctx) — from `js/authority/gameState.js`, `js/shared/mobTypes.js`, `js/shared/gameConfig.js`, `js/authority/combatSystem.js`.
- Writes: `bullets[]` (push with `nextBulletId`), `mobs[]` (push for summons with `nextMobId`), `hitEffects[]`, mob underscore-fields for state machines, and `m.hp`/`m.damage`/`m.speed`/`m.contactRange` for self-buffs and heals.
- Calls: `TelegraphSystem.create()`, `AttackShapes.hitsPlayer()`, `AttackShapes.playerInCone()`, `StatusFX.applyToPlayer()`, `dealDamageToPlayer()`, `applyKnockback()`, `clampDashTarget()`, `positionClear()`, `getMobDamageMultiplier()` — all defined in `js/authority/combatSystem.js`, `js/authority/statusFX.js`, `js/authority/telegraphSystem.js`, `js/core/collision.js`.
- Appends entries to the global `MOB_SPECIALS` object owned by `js/authority/combatSystem.js`.

## Edge cases

- `chip_toss` uses `GAME_CONFIG.BULLET_SPEED` rather than a hardcoded number; porting must preserve that indirection (js/authority/earth216Specials.js:17).
- `call_collection` minions are `grunt` AI despite boss theming and use `m.maxHp * 0.1` for their own `hp` and `maxHp` — boss death does NOT despawn minions automatically; despawn is driven by `_despawnTimer = 300` ticked in `updateMobs()` (js/authority/earth216Specials.js:394, comment at :406).
- `iron_debt`, `touch_of_midas`, `carnage_arm`, `redline_e216`, `total_blackout` store `_orig*` fields for stat restoration. If a second cast triggers before the first expires, state machines gate via active-timer branch so the buff does NOT stack, but the restoration still uses the saved `_orig*` — the ordering prevents permanent stat inflation.
- `velvet_slash` and `venom_lunge` bleed/poison ticks are driven by a single mob-side counter (`_bleedTarget`, `_poisonTarget`); two mobs using these specials on the same player do NOT share DoTs because state lives on the mob, but only one application per mob tracks at a time.
- `hell_exhaust` fires BACKWARD (opposite direction from player); the cone direction is computed as `Math.atan2(m.y - player.y, m.x - player.x)` (js/authority/earth216Specials2.js:893).
- `rift_pulse` is a ring hit: player is safe at center (<40) and outside (>110); only damaged between the two radii (js/authority/earth216Specials3.js:212).
- `house_pull` directly mutates `player.x`/`player.y` each frame (js/authority/earth216Specials3.js:412-413) — not a knockback, a hard teleport each frame. A 30px dead zone prevents stacking the player onto the boss.
- `black_benediction` uses a 60-frame short-cooldown instead of the usual 30 when out of range, and heals the boss before the player damage check, so it will still heal even if player is >500 px away (js/authority/earth216Specials3.js:530 vs :514).
- `phantom_splitstream` damages the player if they're near the afterimage endpoints at telegraph-end time — not along the line, only at the terminal point (js/authority/earth216Specials2.js:1054-1055).
- `crash_bloom` uses the midpoint of mob+player at cast time as the "arena center" for the three expanding rings; a fast-moving player can escape by standing exactly at the ring radii ±40 boundaries (js/authority/earth216Specials2.js:1109, :1153).
- `stacked_deck` shot 2 has `null` status and relies on `onHitPlayer` being `undefined` so the bullet skips the status application (js/authority/earth216Specials3.js:312, :325).
- `spotlight_dash` and `predator_lock` both mark the player's PAST position; moving reliably before the dash commits defeats them entirely.
- `apostle_dash`, `bone_wall`, `candle_toss`, `nitro_line`, `corrupt_vessel`, `unsealing_maw` all keep hazard zone arrays on the mob. These are NOT cleared on mob death/despawn — the arrays live with the mob object and are GC'd when the mob is removed from `mobs[]`, but any active zones cease ticking immediately because the tick happens inside the special function which is no longer called.
- `drift_blink` telegraph renders at the computed teleport position BEFORE the teleport happens; if the player moves between telegraph spawn and commit, the teleport recomputes a NEW behind-player position, so the telegraph circle can be misleading (js/authority/earth216Specials2.js:710-712 vs :732-734).
- `ramp_launch` stores the target position at telegraph-start time, so player movement during the 50f telegraph window can dodge (js/authority/earth216Specials2.js:839).
