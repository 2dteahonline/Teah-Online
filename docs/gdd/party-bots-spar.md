# Party, Bots, Spar, Mafia, Hide & Seek

## Source of truth

- `js/authority/partySystem.js` — party state, member lifecycle, revive shop, target helpers
- `js/authority/botAI.js` — dungeon bot FSM (HUNT / ENGAGE / FLEE / SHOP / ROAM), telegraph dodging, shop purchases, combat
- `js/authority/sparSystem.js` — spar arena combat, bot AI, match flow, reinforcement learning buckets
- `js/authority/neuralSparInference.js` — trained MLP inference: observation builder, forward pass, action→movement
- `js/authority/mafiaSystem.js` — Among Us-style mode state machine, role assignment, kill/body/ghost mechanics
- `js/authority/hideSeekSystem.js` — 1v1 hide & seek mode state machine, bot patrol/hide AI, tag detection
- `js/shared/sparData.js` — spar config, CT-X stat conversions, duel styles, reward bucket key registries, persistent learning profile
- `js/shared/partyData.js` — party constants and bot cosmetic presets
- `js/shared/mafiaGameData.js` — mafia game mode constants, colors, sabotage tables, map spawns
- `js/shared/hideSeekData.js` — hide & seek constants

## Purpose

The party cluster covers every multi-entity "social" combat system in Teah Online. `PartySystem` and `BotAI` let bots run dungeons independently beside the player, each with their own wallet, loadout, and FSM. `SparSystem` is the 1vN PvP arena with a CT-X point-buy gun, heuristic + neural bot controllers, and a reinforcement-learning profile that adapts to the specific human player. `MafiaSystem` and `HideSeekSystem` are self-contained game modes with their own phase timers and bot AI.

---

# Party System

## Values

### PARTY_CONFIG (js/shared/partyData.js)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| MAX_SIZE | 4 | members | js/shared/partyData.js:6 |
| REVIVE_BASE_COST | 50 | gold (× dungeonFloor) | js/shared/partyData.js:8 |
| REVIVE_SHOP_DURATION | 600 | frames (10s) | js/shared/partyData.js:10 |
| BOT_HP_MULT | 3 | × player.maxHp | js/shared/partyData.js:12 |
| BOT_DMG_MULT | 1 | × default | js/shared/partyData.js:14 |
| BOT_SHOOT_CD | 10 | frames | js/shared/partyData.js:16 |
| BOT_MELEE_CD | 20 | frames | js/shared/partyData.js:18 |
| BOT_FOLLOW_MIN | 80 | px | js/shared/partyData.js:20 |
| BOT_FOLLOW_MAX | 150 | px | js/shared/partyData.js:21 |
| BOT_ENGAGE_RANGE | 250 | px | js/shared/partyData.js:23 |
| BOT_FLEE_THRESHOLD | 0.15 | fraction of maxHp | js/shared/partyData.js:25 |
| BOT_EFFECTIVE_RANGE | 140 | px | js/shared/partyData.js:27 |
| BOT_SEPARATION_DIST | 60 | px | js/shared/partyData.js:29 |
| BOT_SPREAD_RADIUS | 70 | px | js/shared/partyData.js:31 |
| MOB_RETARGET_INTERVAL | 30 | frames | js/shared/partyData.js:33 |
| MOB_COUNT_SCALE_PER_MEMBER | 1.0 | ×/extra member | js/shared/partyData.js:35 |
| MOB_HP_SCALE_PER_MEMBER | 0.5 | ×/extra member | js/shared/partyData.js:36 |

### Shared death/respawn constants

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| DEATH_ANIM_FRAMES | 40 | frames (~0.67s) | js/authority/damageSystem.js:530 |
| RESPAWN_COUNTDOWN | 180 | frames (3s) | js/authority/damageSystem.js:531 |

### PartyMember factory (js/authority/partySystem.js:22)

| Field | Value / default | Citation |
|------|-----------------|----------|
| Slot 0 | always local player | js/authority/partySystem.js:119 |
| Slots 1+ | bots | js/authority/partySystem.js:123 |
| Bot spawn offset X | `slotIndex * 50` px right of player | js/authority/partySystem.js:29 |
| Bot spawn offset Y | player.y + 30 | js/authority/partySystem.js:30 |
| Bot maxHp | `round(player.maxHp * BOT_HP_MULT)` | js/authority/partySystem.js:25 |
| Bot radius | `GAME_CONFIG.PLAYER_RADIUS` | js/authority/partySystem.js:50 |
| Default gun (bot) | DEFAULT_GUN (Sidearm) damage 28, fireRate 5, magSize 35 | js/authority/partySystem.js:56 |
| Default melee (bot) | DEFAULT_MELEE damage 15, range 90, cooldown 28 | js/authority/partySystem.js:57 |
| Default critChance | 0.10 | js/authority/partySystem.js:86 |
| Default knockback | 5.04 | js/authority/partySystem.js:88 |
| Default arcAngle | `Math.PI * 0.8` | js/authority/partySystem.js:88 |
| Dash duration | 14 frames | js/authority/partySystem.js:90 |
| Dash speed | 21.85 px/frame | js/authority/partySystem.js:90 |
| Dash cooldownMax | 240 frames | js/authority/partySystem.js:93 |
| Potion count (local) | uses global potion | js/authority/partySystem.js:97 |
| Potion default count | 3 | js/authority/partySystem.js:97 |
| Potion cooldownMax | 120 frames | js/authority/partySystem.js:97 |
| Potion healAmount | 25 | js/authority/partySystem.js:97 |
| Initial AI state | `'hunt'` | js/authority/partySystem.js:104 |

### Revive shop

| Name | Value | Citation |
|------|-------|----------|
| Revive cost | `REVIVE_BASE_COST * dungeonFloor` (50 × floor) | js/authority/partySystem.js:284 |
| Auto-revive HP fraction | 0.30 × maxHp (chest armor has-revive perk, once per run) | js/authority/partySystem.js:256 |
| Revive HP restore | full maxHp | js/authority/partySystem.js:292 |
| Respawn reposition | `player.x + slotIndex * 50`, `player.y + 30` | js/authority/partySystem.js:301 |

## Behavior

1. `PartySystem.init(slotCount)` always sets `PartyState.active = true` (even solo), pushes player at slot 0, then bots at slots 1..n (js/authority/partySystem.js:111).
2. `reset()` clears members and the current damage target on dungeon exit (js/authority/partySystem.js:129).
3. `getNearestTarget(x, y)` returns the closest alive entity to a position (js/authority/partySystem.js:163).
4. `getMobTarget(mob)` uses sticky targeting — retargets when target dead or `MOB_RETARGET_INTERVAL` (30) frames elapsed (js/authority/partySystem.js:176).
5. `addGold`, `spendGold`, `getGold` treat slot 0 as the global `gold` variable and bots as having their own wallet (js/authority/partySystem.js:203).
6. `resolveKiller(killerId)` returns `{member, entity, gun, melee, equip, id}` for any participant, falling back to the local player (js/authority/partySystem.js:234).
7. `handleMemberDeath(member)`: if chest has revive and `_reviveUsed` is false, revives to 30% and pushes "REVIVE!" + "shockwave" FX; otherwise sets dead, decrements lives, sets `deathTimer = DEATH_ANIM_FRAMES`, `respawnTimer = RESPAWN_COUNTDOWN`, clears status effects. If `allDead()` and member is local, sets `deathGameOver = true` (js/authority/partySystem.js:251).
8. `reviveMember(member)`: costs `50 * dungeonFloor`, paid from member's own wallet, restores full HP, clears status effects, repositions beside player (js/authority/partySystem.js:281).
9. `onFloorAdvance()` respawns dead members with lives > 0 at full HP and repositions bots (js/authority/partySystem.js:313).
10. `healAll()` fully heals all alive members (wave clear) (js/authority/partySystem.js:329).
11. `getSpectateTarget()` returns nearest alive bot to camera/death position when player is dead (js/authority/partySystem.js:338).
12. `getMobCountScale()` / `getMobHPScale()` return `1 + (totalMembers - 1) * scalePerMember` — uses *total* party size, not alive, so rates don't change mid-wave when someone dies (js/authority/partySystem.js:358).

## Dependencies

- Reads: `player`, `gold`, `lives`, `potion`, `gun`, `melee`, `playerEquip`, `playerDead`, `deathX`, `deathY`, `dungeonFloor`, `mobs`, `hitEffects`, `StatusFX` (js/authority/gameState.js and friends)
- Writes: `PartyState`, `_currentDamageTarget`, `deathGameOver`, `member.entity.hp`, `member.entity._isDead`, `member.gold`, `hitEffects[]`
- Cross-cluster: depends on `hasRevive` (inventory/armor) and `DEATH_ANIM_FRAMES` / `RESPAWN_COUNTDOWN` from `js/authority/damageSystem.js:530-531`

## Edge cases

- If `PartyState.members.length === 0`, helper functions fall back to treating the single player as the party (js/authority/partySystem.js:139, 147, 158).
- Wave scaling uses total party size, not alive, so a downed bot still scales mob HP for that wave (comment: js/authority/partySystem.js:357).
- Auto-revive is keyed to `member.entity._reviveUsed`, not per-member, so a member that crosses dungeon runs keeps the flag unless reset externally (js/authority/partySystem.js:254).

---

# Bot AI

## Values

### Shop anchor & priorities (js/authority/botAI.js)

| Name | Value | Citation |
|------|-------|----------|
| SHOP_X | `20 * 48 + 24` = 984 px | js/authority/botAI.js:9 |
| SHOP_Y | `16 * 48 + 24` = 792 px | js/authority/botAI.js:10 |
| BUFF_PRIORITIES | `[0, 1, 4, 5, 3]` (Gun Dmg, Melee Dmg, Lifesteal, Party Lifesteal, Potion) | js/authority/botAI.js:14 |
| Auto-potion HP threshold | 0.4 | js/authority/botAI.js:135 |
| Flee distance gate | 150 px | js/authority/botAI.js:208 |
| Low-HP target prefer factor | 1.5× nearest dist | js/authority/botAI.js:276 |
| Low-HP threshold | `mob.hp / mob.maxHp < 0.25` | js/authority/botAI.js:267 |
| Telegraph circle margin | 20 px | js/authority/botAI.js:301 |
| Telegraph line width margin | 20 px | js/authority/botAI.js:316 |
| Telegraph cone range margin | 20 px | js/authority/botAI.js:326 |
| Telegraph cone angle margin | 0.1 rad | js/authority/botAI.js:334 |
| Telegraph ring outer margin | 20 px | js/authority/botAI.js:346 |
| Telegraph dodge speed | `speed * 1.2` | js/authority/botAI.js:393 |
| Shop purchase cooldown (success) | 45 frames | js/authority/botAI.js:428 |
| Shop purchase cooldown (fail) | 60 frames | js/authority/botAI.js:431 |
| Roam refresh interval | 120 frames | js/authority/botAI.js:661 |
| Roam radius min | 80 px | js/authority/botAI.js:664 |
| Roam radius max | 80 + 150 = 230 px | js/authority/botAI.js:664 |
| Roam arrival distance | 15 px | js/authority/botAI.js:674 |
| Hunt spread offset | `cos/sin(spreadAngle) * 35` | js/authority/botAI.js:694 |
| Engage spread (close) | `… * 20` | js/authority/botAI.js:721 |
| Engage spread (far) | `… * 40` | js/authority/botAI.js:732 |
| Effective range band | `[BOT_EFFECTIVE_RANGE-30, BOT_EFFECTIVE_RANGE+20]` | js/authority/botAI.js:730, 735 |
| Strafe flip interval | `60 + rand*60` frames | js/authority/botAI.js:798 |
| Strafe speed | `speed * 0.5` | js/authority/botAI.js:810 |
| Flee shop arrival dist | 30 px | js/authority/botAI.js:828 |
| Flee move speed | `speed * 0.8` | js/authority/botAI.js:832 |
| Separation push mult | 3 | js/authority/botAI.js:862 |
| Reload time (bot) | 90 frames | js/authority/botAI.js:752 |
| Ninja dash activation range | `meleeRange * 1.5` | js/authority/botAI.js:756 |
| Ninja dash count per activation | 3 | js/authority/botAI.js:758 |
| Ninja dash chain window | 180 frames | js/authority/botAI.js:759 |
| Grab distance | 60 px | js/authority/botAI.js:782 |
| Grab target criteria | `maxHp > 200` OR `hp/maxHp > 0.5` | js/authority/botAI.js:783 |
| Animation frame advance | every 8 frames | js/authority/botAI.js:242 |
| Knockback decay | `GAME_CONFIG.KNOCKBACK_DECAY` | js/authority/botAI.js:117 |
| Shoot cooldown formula | `(fireRate || 5) * 4` frames | js/authority/botAI.js:953 |
| Bullet spawn Y offset | `e.y - 10` | js/authority/botAI.js:940 |
| Feared move factor | 0.6 × speed | js/authority/botAI.js:152 |
| Ultimate cleave slash dmg | `round(melee.damage * 0.6)` | js/authority/botAI.js:186 |
| Ultimate storm strike dmg | `round(melee.damage * 0.5)` | js/authority/botAI.js:195 |

### Bot shop buff indices (reference, SHOP_ITEMS.Buffs)

| Index | Buff | Citation |
|-------|------|----------|
| 0 | Gun Damage +3 | js/authority/botAI.js:625 |
| 1 | Melee Damage +3 | js/authority/botAI.js:631 |
| 2 | Melee Speed + (cooldownMax -= 2, floor 10) | js/authority/botAI.js:634 |
| 3 | Health Potion (+1 count) | js/authority/botAI.js:636 |
| 4 | Lifesteal +5 (base 25, +5 per stack) | js/authority/botAI.js:642 |
| 5 | Party Lifesteal (isPartyCost shared) | js/authority/botAI.js:594 |

## Behavior

1. `BotAI.tick()` iterates all `PartyState.members` and dispatches dead bots to `tickDeadBot` or alive bots to `tickBot` (js/authority/botAI.js:17).
2. **Dead bot tick**: death animation rotates `_deathRotation` toward π/2 over `DEATH_ANIM_FRAMES`. When it ends and lives > 0, starts `respawnTimer = RESPAWN_COUNTDOWN`. When that hits 0, hp = maxHp and bot teleports to a random alive member's position ±40 px (js/authority/botAI.js:30).
3. **Alive bot tick order** (js/authority/botAI.js:63):
   - Tick cooldowns (`shootCD`, `meleeCD`, `_contactCD`).
   - Tick ninja dash state, including active dash movement which overrides all other AI.
   - Apply knockback with AABB collision using `PLAYER_WALL_HW`.
   - Tick gun reload (90 frames).
   - Tick potion: auto-use when `hp/maxHp < 0.4` and count > 0.
   - Tick `StatusFX`: rooted/stunned = skip, feared = random-walk at 60% speed, else store `_fxSpeedMult`.
   - Telegraph dodge check (highest priority — can still shoot while dodging).
   - Activate party ultimate (`shrine` if melee special === 'cleave' and charges full; `godspeed` if special === 'storm').
   - Smart target selection: prefer low-HP (<25%) mob if within 1.5× nearest distance.
   - FSM transitions:
     - `hpFrac < 0.15` AND mob within 150 px → **flee**
     - mob within 250 px → **engage**
     - else any mob → **hunt**
     - else if `waveState` is cleared/waiting/revive_shop → **shop**
     - else → **roam**
4. **HUNT**: face and move toward the mob with per-slot angular spread of 35 px offset (js/authority/botAI.js:685).
5. **ENGAGE**: picks melee vs gun by comparing `meleeDPS = damage/cooldown` vs `gunDPS = damage/(fireRate*4)`; melee-focused if `meleeDPS >= 0.8*gunDPS` or gun empty. Gun-focused bots maintain a `[BOT_EFFECTIVE_RANGE-30, BOT_EFFECTIVE_RANGE+20]` band; otherwise strafe. Fires with `botShoot`, reloads when empty, melees when in range, ninja dashes activated within `meleeRange*1.5`, grabs high-value targets at 60 px (js/authority/botAI.js:702).
6. **FLEE**: runs toward shop station (984, 792) at 80% speed, still shooting at the threatening mob (js/authority/botAI.js:820).
7. **SHOP**: walks to shop; within 60 px, first calls `_tryBuyEquipment` (buys next tier in order Guns, Melees, Chest, Pants, Boots, Helmets respecting `waveReq` + cost), else `_tryBuyBuff` (uses `BUFF_PRIORITIES` with potion bumped to top when hp<70%, per-bot `_shopBought` counts and `item.baseCost + idx*priceIncrease` pricing) (js/authority/botAI.js:407, 442, 566).
8. **ROAM**: pick a random target within 80–230 px, walk to it, refresh every 120 frames.
9. `botShoot`: spawns bullet at `(e.x, e.y-10)`, `vx/vy = dir * BULLET_SPEED`, tagged `_botBullet`, `ownerId = member.id`; sets `shootCD = fireRate*4` (js/authority/botAI.js:931).
10. `botMelee`: uses `_meleeHitMobs(e, ml, swingDir, arcHalf)`; passes `arcAngle/2` from the weapon (js/authority/botAI.js:956).
11. `applySeparation` pushes bots apart when closer than 60 px with force `(sepDist-d)/sepDist * 3`.

## Dependencies

- Reads: `PartyState.members`, `mobs`, `bullets`, `TelegraphSystem.active`, `GAME_CONFIG`, `shrine`, `godspeed`, `waveState`, `dungeonFloor`, `wave`, `WAVES_PER_FLOOR`, `SHOP_ITEMS`, `GUN_TIERS`, `MELEE_TIERS`, `CHEST_TIERS`, `PANTS_TIERS`, `BOOTS_TIERS`, `HELMET_TIERS`, `StatusFX`, `window._opMode`
- Writes: `member.entity.{x,y,hp,maxHp,speed,dir,moving,frame,animTimer,knockVx,knockVy,_deathRotation,_isDead}`, `member.{gun,melee,equip,gold,potion,ai,_shopBought,_chestHpBonus,_lifestealPerKill}`, `shrine.*`, `godspeed.*`, `bullets[]`, `hitEffects[]`
- Uses shared helpers: `_tickDashMovement`, `_meleeHitMobs`, `usePotionEntity`, `positionClear`, `isSolid`, `tryGrabEntity`

## Edge cases

- Ninja dash takes priority over all other AI via an early `return` (js/authority/botAI.js:98).
- Rooted/stunned bots cannot shoot or move at all for that tick (js/authority/botAI.js:144).
- `waveReq` checks are bypassed when `window._opMode` is truthy (js/authority/botAI.js:463).
- Bot respawn teleports to a random alive member, not always the player (js/authority/botAI.js:53).
- `faceTarget` uses a Manhattan comparison so diagonals resolve to the larger component's direction (js/authority/botAI.js:913).

---

# Spar

## Values

### SPAR_CONFIG (js/shared/sparData.js)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| HUB_LEVEL | `'spar_hub_01'` | — | js/shared/sparData.js:6 |
| RETURN_LEVEL | `'lobby_01'` | — | js/shared/sparData.js:7 |
| RETURN_TX, RETURN_TY | 17, 34 | tiles | js/shared/sparData.js:8 |
| HP_BASELINE | 100 | hp | js/shared/sparData.js:9 |
| COUNTDOWN_FRAMES | 180 | frames (3s @ 60fps) | js/shared/sparData.js:10 |
| POST_MATCH_FRAMES | 60 | frames (1s) | js/shared/sparData.js:11 |
| POINT_BUDGET | 100 | CT-X points | js/shared/sparData.js:12 |
| BOT_SPEED | `GAME_CONFIG.PLAYER_BASE_SPEED` | px/frame | js/shared/sparData.js:13 |
| ARENA_SMALL | 24×20 | tiles | js/shared/sparData.js:14 |
| ARENA_LARGE | 36×28 | tiles | js/shared/sparData.js:15 |

### SPAR_DERIVED (js/shared/sparData.js:19)

| Name | Formula | Citation |
|------|---------|----------|
| DODGE_SIN_THETA | `min(0.34, BOT_SPEED / BULLET_SPEED)` | js/shared/sparData.js:21 |
| DODGE_COS_THETA | `sqrt(1 - DODGE_SIN_THETA^2)` | js/shared/sparData.js:22 |
| FRAMES_TO_CLEAR | `ceil((DEFAULT_HITBOX_R||33) / BOT_SPEED)` | js/shared/sparData.js:24 |
| FROZEN_SPEED_FACTOR | `1 - 0.54` | js/shared/sparData.js:26 |
| BOTTOM_GAP | `GAME_CONFIG.ENTITY_R || 29` | js/shared/sparData.js:28 |
| REACT_FRAMES | `ceil(2.7 * (HIT_R||33) / (BULLET_SPEED||9))` | js/shared/sparData.js:30 |
| OPENING_FACTOR | 1.3 | js/shared/sparData.js:32 |
| HIT_RADIUS | `DEFAULT_HITBOX_R || 33` | js/shared/sparData.js:34 |
| BULLET_SPEED | `GAME_CONFIG.BULLET_SPEED || 9` | js/shared/sparData.js:36 |

### CT-X point-buy conversions (SPAR_CTX_STATS, js/shared/sparData.js:43)

| Stat | Formula | Citation |
|------|---------|----------|
| freezePenalty | `0.90 - pts * 0.009` (slider 0→0.90, 100→0.00) | js/shared/sparData.js:46 |
| freezeDuration | 15 frames | js/shared/sparData.js:46 |
| rofToStat (p = min(100, pts*1.2)) | `p≤50: 11.025 - p*0.1125`  ·  `p>50: 5.4 - (p-50)*0.0375` | js/shared/sparData.js:50 |
| spreadToStat | `pts * 0.5` (degrees) | js/shared/sparData.js:61 |
| `_sparCtxReloadFromRof(pts)` | `round(round(20 + min(100, pts*1.2)*0.25) * 1.2)` frames | js/shared/sparData.js:67 |

### Spar match timers (runtime)

| Name | Value | Citation |
|------|-------|----------|
| Countdown | `SPAR_CONFIG.COUNTDOWN_FRAMES` (180) or `trainTiming.countdownFrames` | js/authority/sparSystem.js:2159 |
| Post-match | `SPAR_CONFIG.POST_MATCH_FRAMES` (60) or `trainTiming.postMatchFrames` | js/authority/sparSystem.js:2554 |
| Max match frames | 3600 (real, 60s) / 1200 (training, 20s) | js/authority/sparSystem.js:2515 |

### Meta builds (bot loadouts, js/authority/sparSystem.js:189)

| Freeze | RoF | Spread |
|--------|-----|--------|
| 50 | 50 | 0 |
| 40 | 50 | 10 |
| 30 | 40 | 30 |

### SPAR_DUEL_STYLES (js/shared/sparData.js:73)

| Style | approachMult | strafeMult | retreatMult | baitMult | shootAggr | preferredDist | Citation |
|-------|-------|-------|-------|-------|-------|-------|----------|
| pressure | 1.1 | 0.9 | 0.7 | 0.6 | 1.2 | 220 | js/shared/sparData.js:74 |
| control  | 0.8 | 1.2 | 1.2 | 0.8 | 0.8 | 280 | js/shared/sparData.js:83 |
| bait     | 0.9 | 1.0 | 1.5 | 2.0 | 0.7 | 240 | js/shared/sparData.js:92 |

### SPAR_ROOMS (js/shared/sparData.js:209)

| id | label | teamSize | streakMode | arenaLevel | column |
|----|-------|----------|------------|------------|--------|
| spar_1v1 | 1v1 | 1 | false | spar_1v1_01 | left |
| spar_2v2 | 2v2 | 2 | false | spar_2v2_01 | left |
| spar_3v3 | 3v3 | 3 | false | spar_3v3_01 | left |
| spar_4v4 | 4v4 | 4 | false | spar_4v4_01 | left |
| spar_1v1_streak | 1v1 Streak | 1 | true | spar_1v1_01 | right |
| spar_2v2_streak | 2v2 Streak | 2 | true | spar_2v2_01 | right |
| spar_3v3_streak | 3v3 Streak | 3 | true | spar_3v3_01 | right |
| spar_4v4_streak | 4v4 Streak | 4 | true | spar_4v4_01 | right |

Citations: js/shared/sparData.js:210-217.

### Policy key registries (js/shared/sparData.js)

| Registry | Keys | Citation |
|----------|------|----------|
| SPAR_OPENING_ROUTE_KEYS | bottomLeft, bottomRight, bottomCenter, topHold, midFlank, mirrorPlayer | js/shared/sparData.js:103 |
| SPAR_ANTI_BOTTOM_TACTIC_KEYS | contestDirect, contestSprint, lateCrossUnder, flankWide, flankTight, forceMirrorThenBreak, baitRetreat, baitFake, doubleFakeRetreat, angleStrafe, angleWait | js/shared/sparData.js:107 |
| SPAR_ANTI_BOTTOM_FAMILY_KEYS | contest, flank, bait, angle | js/shared/sparData.js:113 |
| SPAR_GUN_SIDE_POLICY_KEYS | forcePeek, holdAngle, preAimLaneHold, reAngleWide, yieldLane, peekPressure | js/shared/sparData.js:120 |
| SPAR_GUN_SIDE_FAMILY_KEYS | hold, reposition, pressure | js/shared/sparData.js:121 |
| SPAR_ESCAPE_POLICY_KEYS | cornerBreak, highReset, wideDisengage, baitPullout | js/shared/sparData.js:130 |
| SPAR_ESCAPE_FAMILY_KEYS | break, reset, bait | js/shared/sparData.js:131 |
| SPAR_SHOT_TIMING_KEYS | shootImmediate, delayShot, baitShot | js/shared/sparData.js:138 |
| SPAR_SHOT_TIMING_FAMILY_KEYS | aggressive, patient | js/shared/sparData.js:139 |
| SPAR_RELOAD_BEHAVIOR_KEYS | hardReloadPunish, safeReloadPunish, reloadBait, reloadBaitPeek | js/shared/sparData.js:146 |
| SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS | punish, bait | js/shared/sparData.js:147 |
| SPAR_MID_PRESSURE_KEYS | pressureHard, pressureSoft, holdLane | js/shared/sparData.js:155 |
| SPAR_WALL_PRESSURE_KEYS | wallPinHold, pressureWiden, prefireCorner | js/shared/sparData.js:163 |
| SPAR_OPENING_CONTEST_KEYS | hardRace, denyLane, delayedDrop, mirrorThenBreak, fakeCommit | js/shared/sparData.js:172 |
| SPAR_PUNISH_WINDOW_KEYS | hardConvert, angleConvert, baitConvert | js/shared/sparData.js:183 |
| SPAR_CENTER_RECOVERY_KEYS | crossCommit, fakeCrossBreak, baitShotDrop, wideUnderEntry | js/shared/sparData.js:192 |
| SPAR_LANE_SHAPE_KEYS | center, left, right, topLeft, topRight | js/shared/sparData.js:201 |

### createSparRewardBuckets (js/shared/sparData.js:203)

Each bucket initialized to `{ plays: 0, reward: 0.5, phasePlays: 0, phaseReward: 0.5 }`.

### sparLearning neutral defaults (`createDefaultSparLearning`, js/shared/sparData.js:239)

| Field | Default | Citation |
|-------|---------|----------|
| version | 8 | js/shared/sparData.js:241 |
| opening.firstShotFrame | 90 | js/shared/sparData.js:249 |
| shooting.{up,down,left,right}Pct | 0.25 | js/shared/sparData.js:269 |
| rhythm.avgShotDelay | 8 frames | js/shared/sparData.js:340 |
| rhythm.avgRetreatDelay | 12 frames | js/shared/sparData.js:341 |
| rhythm.avgReEngageDelay | 30 frames | js/shared/sparData.js:342 |
| chasePatterns.giveUpFrames | 90 | js/shared/sparData.js:338 |
| positionValue.bottomWinCorrelation | 0.65 | js/shared/sparData.js:349 |
| positionValue.topPenalty | 0.4 | js/shared/sparData.js:349 |
| combatPatterns.playerHitDist | 250 | js/shared/sparData.js:328 |
| combatPatterns.botHitDist | 250 | js/shared/sparData.js:328 |

### Reward bucket scoring (js/authority/sparSystem.js:355)

- Blended reward: if phasePlays > 0 and matchPlays > 0 → `phaseReward*0.7 + matchReward*0.3`; if only phase → phase; else match (js/authority/sparSystem.js:362).
- UCB1-like bonus: `exploreWeight * sqrt(log(totalPlays+2) / (totalData+1))` (js/authority/sparSystem.js:371).
- `_pickWeightedScoreChoice` normalizes to non-negative weights with a 0.05 floor (js/authority/sparSystem.js:375).

### `sparProgress` persistent stats (js/shared/sparData.js:220)

- Totals: wins/losses.
- ByMode: 1v1, 2v2, 3v3, 4v4 wins/losses.
- Streaks: 1v1..4v4 current/best.

## Behavior

1. `SparSystem.enterHub()` resets `playerDead`, clears spar bot lists, sets phase `'hub'` (js/authority/sparSystem.js:143).
2. `_buildCtxGun(freeze, rof, spread)` constructs a CT-X gun using `CT_X_GUN.damage=20`, `magSize=30`, with `fireRate/reloadSpeed/freezePenalty/freezeDuration/spread` computed from the point allocation (js/authority/sparSystem.js:157).
3. `_randomBotAlloc()` picks one of the three meta builds uniformly (js/authority/sparSystem.js:196).
4. `_ensureReinforcementProfile(sl)` lazy-initializes all policy scopes — `general`, `player`, `selfPlay` — with every bucket registry listed above (js/authority/sparSystem.js:248).
5. Phase flow (runtime):
   - `phase === 'countdown'`: countdown ticks, enters `'fighting'` with `matchTimer = 0` (js/authority/sparSystem.js:2479).
   - `phase === 'fighting'`: ticks `matchTimer` each frame; if both teams alive and `matchTimer >= MAX_MATCH_FRAMES` (3600 real / 1200 training), match is resolved by HP totals (js/authority/sparSystem.js:2503-2530).
   - On match end, sets `postMatchTimer = POST_MATCH_FRAMES` (60) and phase `'post_match'` (js/authority/sparSystem.js:2554).
   - `post_match` counts down, then returns to hub or next streak match (js/authority/sparSystem.js:2599).
6. Neural execution layer: `sparSetNeural(enabled, model)` — `true='full'`, `'movement'`, `'shooting'`, or `false`; loads model asynchronously via `_loadNeuralModel`. Model paths: `training/exports/final_model.json` and `training/exports/model_iter1400.json` (js/authority/sparSystem.js:43, 62).
7. Engagement telemetry: `_logEngagement(type, frames, dmgDelta)` tracks seven engagement categories (antiBottom, gunSide, escape, shotTiming, reload, midPressure, wallPressure) with count/frames/zeroFrames/shortCount/durations/dmgDeltas; reported via `sparEngagementReport()` (js/authority/sparSystem.js:77, 124).
8. Bot damage collection per match: `c.playerDmgFrames` and `c.botDmgFrames` push `{frame, dmg, hasBottom}` on every bullet hit (js/authority/sparSystem.js:4831, 4840).

## Dependencies

- Reads: `GAME_CONFIG`, `CT_X_GUN`, `SPAR_CONFIG`, `SPAR_CTX_STATS`, `SPAR_ROOMS`, `sparProgress`, `sparLearning`, `TILE`, `player`, `bullets`, `hitEffects`, `Scene`, `LEVELS`, `NeuralSparPolicy`, `_isSparTraining`, `_isSparSelfPlay`
- Writes: `SparState.*`, `sparProgress.*`, `sparLearning.reinforcement1v1.*`, `sparLearning.tactical.*`, `bullets[]`, `hitEffects[]`, per-bot `ai._*` scratch fields
- Cross-cluster: enters/exits levels via `enterLevel`, uses `positionClear` from mobSystem, reads `gun/melee/player` globals

## Edge cases

- `DODGE_SIN_THETA` is capped at 0.34 (comment: raw optimal ~56° is "too aggressive"; cap ≈ 20° from perpendicular) (js/shared/sparData.js:21).
- `FROZEN_SPEED_FACTOR` in SPAR_DERIVED is a placeholder — actual penalty comes from runtime gun stats (js/shared/sparData.js:26).
- `_getStableCenterDir` returns ±1 even at exact midX overlap, using `ai.strafeDir` as tiebreaker to avoid `Math.sign(0) === 0` bugs (js/authority/sparSystem.js:206).
- `resetGeometryLearning()` only resets policy buckets whose success criteria changed; preserves descriptive player stats and raw telemetry (js/shared/sparData.js:571).
- Training timeout (1200f / 20s) is much shorter than real matches (3600f / 60s) to speed up iteration (js/authority/sparSystem.js:2515).

---

# Neural Spar Inference

## Purpose

Loads exported MLP policy weights from JSON and runs inference per-frame to produce a bot movement + shoot intent. Model is small (~24K params) and inference is sub-millisecond (js/authority/neuralSparInference.js:1).

## Values

### Constants (js/authority/neuralSparInference.js)

| Name | Value | Citation |
|------|-------|----------|
| ARENA_W | 1152 | js/authority/neuralSparInference.js:20 |
| ARENA_H | 960 | js/authority/neuralSparInference.js:21 |
| PLAYER_BASE_SPEED fallback | 7.5 | js/authority/neuralSparInference.js:22 |
| BULLET_SPEED fallback | 9 | js/authority/neuralSparInference.js:23 |
| ENTITY_R fallback | 29 | js/authority/neuralSparInference.js:24 |
| PLAYER_HITBOX_Y fallback | -25 | js/authority/neuralSparInference.js:25 |
| HP_BASELINE | 100 | js/authority/neuralSparInference.js:26 |
| CTX_FREEZE_DURATION | 15 | js/authority/neuralSparInference.js:27 |
| MAX_MATCH_FRAMES | 3600 | js/authority/neuralSparInference.js:28 |
| Base obs dim | 25 floats | js/authority/neuralSparInference.js:165 |
| Bullet threat slots | 5 bullets × 4 floats = 20 | js/authority/neuralSparInference.js:183, 200 |

### Action space (js/authority/neuralSparInference.js:30)

| Index | Name | Movement | Citation |
|-------|------|----------|----------|
| 0 | idle | `moveX = s*0.3 * (me.x<ARENA_W/2 ? 1 : -1)` | js/authority/neuralSparInference.js:239 |
| 1 | push | `(dx/dist)*s, (dy/dist)*s` | js/authority/neuralSparInference.js:242 |
| 2 | retreat | `-(dx/dist)*s, -(dy/dist)*s` | js/authority/neuralSparInference.js:246 |
| 3 | strafe_left | `moveX = -s` | js/authority/neuralSparInference.js:250 |
| 4 | strafe_right | `moveX = s` | js/authority/neuralSparInference.js:253 |
| 5 | dodge_left (perp CCW) | `(dy/dist)*s, -(dx/dist)*s` | js/authority/neuralSparInference.js:256 |
| 6 | dodge_right (perp CW) | `-(dy/dist)*s, (dx/dist)*s` | js/authority/neuralSparInference.js:260 |
| 7 | descend | `moveY = s` | js/authority/neuralSparInference.js:264 |
| 8 | ascend | `moveY = -s` | js/authority/neuralSparInference.js:267 |
| 9 | shoot | `shoot=true; moveX = s*0.2 * (me.x<enemy.x ? 1 : -1)` | js/authority/neuralSparInference.js:270 |

### Observation vector (`buildObs`, js/authority/neuralSparInference.js:119)

| Idx | Feature | Formula | Citation |
|-----|---------|---------|----------|
| 0,1 | me normalized pos | `(x,y)/(ARENA_W, ARENA_H)` | :120 |
| 2,3 | enemy normalized pos | same | :122 |
| 4,5 | relX, relY | `(enemy - me)/(ARENA_W, ARENA_H)` | :125 |
| 6 | normDist | `min(1, dist/(ARENA_W*0.7))` | :131 |
| 7,8 | my vel | `me._neuralVx / PLAYER_BASE_SPEED` | :134 |
| 9,10 | enemy vel | same | :136 |
| 11,12 | hp | `(hp / HP_BASELINE)` | :140 |
| 13,14 | ammo | `ammo / magSize(30 default)` | :146 |
| 15,16 | reloading flags | 0/1 | :148 |
| 17 | myCanShoot | 0/1 | :150 |
| 18 | myFreeze | `freeze_timer / CTX_FREEZE_DURATION(15)` | :151 |
| 19-22 | wall distances | `x/ARENA_W`, `(W-x)/W`, `y/ARENA_H`, `(H-y)/H` | :154 |
| 23 | bottomAdv | `(me.y - enemy.y) / ARENA_H` | :160 |
| 24 | matchProgress | `matchFrame / MAX_MATCH_FRAMES(3600)` | :163 |
| 25-44 | Nearest 5 enemy bullets | `{rx, ry, vx, vy}` each, sorted by distSq | :183, :200 |

## Behavior

1. `NeuralSparPolicy.load(url)` fetches JSON, logs version/dimensions, returns a `Policy` instance (js/authority/neuralSparInference.js:292).
2. `Policy` constructor filters out the value head layers (only policy layers are used for inference) (js/authority/neuralSparInference.js:107).
3. Forward pass (`mlpForward`): sequential dense layers with `tanh` or `none` activations (js/authority/neuralSparInference.js:39).
4. `softmaxAction(logits, deterministic)`: numerically-stable softmax; deterministic=argmax, else sample from the distribution (js/authority/neuralSparInference.js:66).
5. `buildObs(me, enemy, bullets, matchFrame)` assembles the 45-float observation vector. Enemy bullets are filtered by `sparTeam` (uses `b.sparTeam = 'teamA'/'teamB'`, NOT `b.team`) (js/authority/neuralSparInference.js:184).
6. `getAction(obs, deterministic=true)` returns the integer action index (js/authority/neuralSparInference.js:220).
7. `actionToMovement(action, me, enemy)` converts the action index to `{moveX, moveY, shoot}` using the action table above, multiplying by `me.speed || PLAYER_BASE_SPEED` (js/authority/neuralSparInference.js:229).

## Dependencies

- Reads: `GAME_CONFIG.PLAYER_BASE_SPEED`, `BULLET_SPEED`, `ENTITY_R`, `PLAYER_HITBOX_Y`; per-entity: `x`, `y`, `hp`, `gun`, `freeze_timer`, `_neuralVx/Vy`, `sparTeam`; global `bullets` array
- Writes: nothing — pure function surface; caller (`SparSystem`) uses returned action to drive the bot
- Loaded from: `training/exports/final_model.json` or `training/exports/model_iter1400.json` (referenced from `sparSystem.js:62`)

## Edge cases

- Bullet filter uses `sparTeam`, NOT `team` (explicit comment at :184).
- `Float32Array` is zero-initialized, so fewer than 5 enemy bullets leaves trailing slots as zeros automatically (js/authority/neuralSparInference.js:208).
- `MAX_MATCH_FRAMES` here is hardcoded to 3600 even though spar training uses 1200 — normalization is fixed to the real match length (js/authority/neuralSparInference.js:28).
- Default magSize assumed 30 when gun lacks a value (js/authority/neuralSparInference.js:146).

---

# Mafia

## Values

### MAFIA_GAME (js/shared/mafiaGameData.js)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| BOT_COUNT | 8 (+1 player = 9) | participants | js/shared/mafiaGameData.js:8 |
| IMPOSTOR_COUNT | 1 | — | js/shared/mafiaGameData.js:9 |
| BOT_SPEED | `GAME_CONFIG.PLAYER_BASE_SPEED` | px/frame | js/shared/mafiaGameData.js:10 |
| FOV_BASE_RADIUS | 4.5 | tiles | js/shared/mafiaGameData.js:13 |
| KILL_RANGE | 120 | px | js/shared/mafiaGameData.js:16 |
| KILL_COOLDOWN | 1800 | frames (30s) | js/shared/mafiaGameData.js:17 |
| DISCUSSION_TIME | 900 | frames (15s) | js/shared/mafiaGameData.js:18 |
| VOTING_TIME | 1800 | frames (30s) | js/shared/mafiaGameData.js:19 |
| EJECTION_TIME | 300 | frames (5s) | js/shared/mafiaGameData.js:20 |
| VOTE_RESULTS_TIME | 900 | frames (15s) | js/shared/mafiaGameData.js:21 |
| REPORT_RANGE | 150 | px | js/shared/mafiaGameData.js:22 |
| EMERGENCY_RANGE | 120 | px | js/shared/mafiaGameData.js:23 |
| SABOTAGE_COOLDOWN | 1800 | frames (30s) | js/shared/mafiaGameData.js:24 |
| REACTOR_TIMER | 1800 | frames (30s) | js/shared/mafiaGameData.js:25 |
| O2_TIMER | 1800 | frames (30s) | js/shared/mafiaGameData.js:26 |
| BOT_TASK_PAUSE_MIN | 180 | frames (3s) | js/shared/mafiaGameData.js:29 |
| BOT_TASK_PAUSE_MAX | 300 | frames (5s) | js/shared/mafiaGameData.js:30 |
| BOT_PATH_LIMIT | 8000 | BFS nodes | js/shared/mafiaGameData.js:31 |
| RETURN_LEVEL | `'mafia_lobby'` | — | js/shared/mafiaGameData.js:34 |
| RETURN_TX, RETURN_TY | 25, 20 | tiles | js/shared/mafiaGameData.js:35 |

### Kill distance settings (`_getKillRange`, js/authority/mafiaSystem.js:70)

| Setting | Range (px) | Citation |
|---------|------------|----------|
| Short | 80 | js/authority/mafiaSystem.js:72 |
| Medium (default) | 120 | js/authority/mafiaSystem.js:74 |
| Long | 180 | js/authority/mafiaSystem.js:73 |

### MAFIA_GAME.COLORS (js/shared/mafiaGameData.js:39)

Ten colors in order: Red `#c51111`, Blue `#132ed1`, Green `#127f2d`, Pink `#ed54ba`, Orange `#ef7d0e`, Yellow `#f5f557`, Black `#3f474e`, White `#d6e0f0`, Purple `#6b2fbb`, Cyan `#38fedb` (each with body/dark variants) (js/shared/mafiaGameData.js:40-49).

### SABOTAGE_TYPES (js/shared/mafiaGameData.js:58)

| Type | Timer | Label | Panels | Simultaneous | Citation |
|------|-------|-------|--------|--------------|----------|
| reactor_meltdown | 1800 | Reactor Meltdown | reactor_p1, reactor_p2 | true | js/shared/mafiaGameData.js:59 |
| o2_depletion | 1800 | O2 Depleted | o2_o2, o2_admin | false | js/shared/mafiaGameData.js:64 |
| lights_out | 0 (until fixed) | Lights Out | lights_electrical | false | js/shared/mafiaGameData.js:69 |

### SABOTAGE_PANELS (js/shared/mafiaGameData.js:78)

| Panel | tx | ty | Citation |
|-------|----|----|----------|
| reactor_p1 | 6 | 25 | js/shared/mafiaGameData.js:79 |
| reactor_p2 | 6 | 44 | js/shared/mafiaGameData.js:80 |
| o2_o2 | 99 | 32 | js/shared/mafiaGameData.js:81 |
| o2_admin | 92 | 38 | js/shared/mafiaGameData.js:82 |
| lights_electrical | 41 | 55 | js/shared/mafiaGameData.js:83 |

### SETTINGS_DEFAULTS (js/shared/mafiaGameData.js:88)

| Setting | Default | Citation |
|---------|---------|----------|
| impostors | 1 | js/shared/mafiaGameData.js:90 |
| killCooldown | 30 seconds | js/shared/mafiaGameData.js:91 |
| killDistance | Medium | js/shared/mafiaGameData.js:92 |
| playerSpeed | 1 | js/shared/mafiaGameData.js:93 |
| discussionTime | 15 seconds | js/shared/mafiaGameData.js:95 |
| votingTime | 30 seconds | js/shared/mafiaGameData.js:96 |
| emergencyMeetings | 1 | js/shared/mafiaGameData.js:97 |
| emergencyCooldown | 15 seconds | js/shared/mafiaGameData.js:98 |
| confirmEjects | true | js/shared/mafiaGameData.js:99 |
| anonymousVotes | false | js/shared/mafiaGameData.js:100 |
| commonTasks | 1 | js/shared/mafiaGameData.js:102 |
| longTasks | 1 | js/shared/mafiaGameData.js:103 |
| shortTasks | 2 | js/shared/mafiaGameData.js:104 |
| taskBarUpdates | Always | js/shared/mafiaGameData.js:105 |
| crewVision | 1× | js/shared/mafiaGameData.js:107 |
| impostorVision | 1.5× | js/shared/mafiaGameData.js:108 |
| map | `skeld_01` | js/shared/mafiaGameData.js:110 |
| maxPlayers | 10 | js/shared/mafiaGameData.js:111 |

### Skeld room centers (MAPS.skeld_01, js/shared/mafiaGameData.js:117)

| Room | tx | ty | Citation |
|------|----|----|----------|
| SPAWN (cafeteria) | 74 | 18 | :118 |
| cafeteria | 74 | 17 | :120 |
| upper_engine | 16 | 9 | :121 |
| reactor | 6 | 35 | :122 |
| security | 34 | 33 | :123 |
| medbay | 49 | 25 | :124 |
| electrical | 50 | 52 | :125 |
| admin | 91 | 46 | :126 |
| storage | 70 | 66 | :127 |
| shields | 112 | 62 | :128 |
| communications | 92 | 73 | :129 |
| lower_engine | 16 | 60 | :130 |
| weapons | 109 | 9 | :131 |
| o2 | 96 | 29 | :132 |
| navigation | 127 | 34 | :133 |

### startMatch snapshot (js/authority/mafiaSystem.js:84)

| Step | Value | Citation |
|------|-------|----------|
| Bot spawn X offset | `((i%4) - 1.5) * 30` | js/authority/mafiaSystem.js:139 |
| Bot spawn Y offset | `(floor(i/4) - 0.5) * 30` | js/authority/mafiaSystem.js:140 |
| Bot `hp/maxHp` | -1 (sentinel: non-damageable) | js/authority/mafiaSystem.js:147 |
| Bot hitboxR | 15 | js/authority/mafiaSystem.js:159 |
| Role reveal duration | 180 frames (3s) | js/authority/mafiaSystem.js:199 |
| Initial killCooldown | `settings.killCooldown * 60` frames | js/authority/mafiaSystem.js:201 |

## Behavior

1. `MafiaState.phase` transitions through `idle → role_reveal → playing → report_splash → meeting → voting → vote_results → ejecting → post_match` (js/authority/mafiaSystem.js:8).
2. `startMatch()` loads the map from `MAFIA_GAME.MAPS[level.id]`, clears mobs, shuffles bot colors (Fisher-Yates, :94), creates the player participant as crewmate with chosen color, and spawns `min(maxPlayers-1, BOT_COUNT)` bots with per-bot `_aiState` (js/authority/mafiaSystem.js:84).
3. Player speed is set to `PLAYER_BASE_SPEED * settings.playerSpeed` (js/authority/mafiaSystem.js:131).
4. Roles are assigned via `assignRoles(participants, impostorCount)` and the local player's role/subrole mirrored into `MafiaState.playerRole/playerSubrole` (js/authority/mafiaSystem.js:189).
5. Role reveal phase runs for 180 frames then transitions to `playing` (js/authority/mafiaSystem.js:198).
6. `setRole(roleName)` is a debug command for switching local player role/subrole; setting impostor zeros kill cooldown (js/authority/mafiaSystem.js:230).
7. `_getKillRange()` maps settings strings `Short/Medium/Long` to 80/120/180 px (js/authority/mafiaSystem.js:70).
8. Role state struct (`_roleState`): tracker (trackedTarget/trackTimer/trackCooldown), scientist (vitalsOpen/vitalsTimer/vitalsCooldown), shapeshifter (shiftedAs/shiftTimer/shiftCooldown/shiftAnim), phantom (invisible/invisTimer/invisCooldown), noisemaker (deathAlert) (js/authority/mafiaSystem.js:24-44).

## Dependencies

- Reads: `MAFIA_GAME`, `MAFIA_SETTINGS`, `MAFIA_ROLES`, `MAFIA_ROLE_SETTINGS`, `mafiaPlayerColorIdx`, `player`, `playerName`, `level`, `gameFrame`, `mobs`, `TILE`, `GAME_CONFIG`, `assignRoles`, `SkeldTasks`
- Writes: `MafiaState.*`, `mobs.length = 0`, `player.{x,y,vx,vy,speed,baseSpeed}`
- Cross-cluster: `SkeldTasks.reset(settings)` (tasks system), level pathfinding `bfsPath`/`isSolid`

## Edge cases

- Both player and bots start as crewmates; `/role` is the only way to switch during testing (js/authority/mafiaSystem.js:103, 135).
- Bots use `hp = -1` as sentinel to mark them as mafia-bots rather than mobs (js/authority/mafiaSystem.js:147).
- Kill cooldown defaults to 30 × 60 = 1800 frames from `SETTINGS_DEFAULTS.killCooldown`, but initial in-match cooldown is set to that value on `startMatch` regardless of role (js/authority/mafiaSystem.js:201).
- `lights_out` sabotage has `timer: 0` — stays until fixed (no auto-loss) (js/shared/mafiaGameData.js:70).

---

# Hide & Seek

## Values

### HIDESEEK (js/shared/hideSeekData.js)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| HIDE_TIME | 1800 | frames (30s) | js/shared/hideSeekData.js:6 |
| SEEK_TIME | 1800 | frames (30s) | js/shared/hideSeekData.js:7 |
| POST_MATCH_TIME | 600 | frames (10s) | js/shared/hideSeekData.js:8 |
| TAG_RANGE | 90 | px | js/shared/hideSeekData.js:9 |
| FOV_RADIUS | 4.5 | tiles | js/shared/hideSeekData.js:10 |
| MAP_ID | `'hide_01'` | — | js/shared/hideSeekData.js:11 |
| BOT_SPEED | `PLAYER_BASE_SPEED * 0.75` | px/frame | js/shared/hideSeekData.js:12 |
| BOT_DETECT_RANGE | 3 | tiles | js/shared/hideSeekData.js:13 |
| RETURN_LEVEL | `'lobby_01'` | — | js/shared/hideSeekData.js:14 |
| RETURN_TX, RETURN_TY | 17, 22 | tiles | js/shared/hideSeekData.js:15 |

### Bot entity spawn (js/authority/hideSeekSystem.js:127)

| Field | Value | Citation |
|-------|-------|----------|
| hp / maxHp | 999 / 999 | js/authority/hideSeekSystem.js:132 |
| speed | `HIDESEEK.BOT_SPEED` | js/authority/hideSeekSystem.js:134 |
| type | `'hideseek_bot'` | js/authority/hideSeekSystem.js:135 |
| hitboxR | 15 | js/authority/hideSeekSystem.js:144 |
| Default seeker spawn fallback | tx=5, ty=5 | js/authority/hideSeekSystem.js:113 |
| Default hider spawn fallback | tx=10, ty=10 | js/authority/hideSeekSystem.js:114 |

## Behavior

1. `startMatch(playerRole)` assigns roles (player vs bot), saves the player's current melee + activeSlot, and for seekers equips `SEEKING_BATON` into slot 1 (js/authority/hideSeekSystem.js:85, 104).
2. Bot is created as a standalone entity — NOT pushed to `mobs[]` — and registered in `participants[]` alongside the player (js/authority/hideSeekSystem.js:147, 150).
3. Match enters `'hide'` phase with `phaseTimer = HIDE_TIME` (1800). If bot is hider, `_initHiderBot` runs (js/authority/hideSeekSystem.js:156, 164).
4. `tick()`:
   - `hide` phase: decrements `phaseTimer`; when it hits 0, transitions to `seek` with `phaseTimer = SEEK_TIME` (1800), resets `botMob.speed`, initializes seeker bot if needed, returns early to let state settle.
   - `seek` phase: decrements timer; on 0 → `post_match` with `seekerWon = false`, `phaseTimer = POST_MATCH_TIME` (600).
   - `post_match`: decrements; on 0 calls `endMatch()`.
   - During `hide`/`seek`, calls `_tickBotAI()`.
5. `onTag()` sets `seekerWon = true`, stores `tagFrame = gameFrame`, transitions to `post_match`, and pushes a `stun_stars` hit effect at the tag location (js/authority/hideSeekSystem.js:223).
6. `isPlayerFrozen(participantId)`: during `hide`, seekers are frozen; during `seek`, hiders are frozen (js/authority/hideSeekSystem.js:242).

## Dependencies

- Reads: `HIDESEEK`, `SEEKING_BATON`, `applyMeleeStats`, `player`, `playerEquip`, `activeSlot`, `activeHotbarSlot`, `level.spawns`, `TILE`, `gameFrame`, `mobs`, `hitEffects`, `bfsPath`, `positionClear`, `isSolid`
- Writes: `HideSeekState.*`, `player.{x,y,vx,vy}`, `activeSlot`, `activeHotbarSlot`, `mobs.length = 0`, `playerEquip.melee` (via `applyMeleeStats`)
- Cross-cluster: melee tag detection is handled by `meleeSystem.js`, which calls `HideSeekSystem.onTag()` when the Seeking Baton connects.

## Edge cases

- The bot is kept outside `mobs[]` so it doesn't interact with mob AI, damage, or rendering paths intended for enemies (js/authority/hideSeekSystem.js:146).
- Hider bot gets a speed boost during `hide` phase that is reset back to `HIDESEEK.BOT_SPEED` when `seek` starts (js/authority/hideSeekSystem.js:189-190); the boost value itself is set inside `_initHiderBot` (not shown in the read range — UNKNOWN exact multiplier).
- `tick()` returns early on phase transitions so AI doesn't run on the same frame as a phase change (js/authority/hideSeekSystem.js:196, 205, 210).
- Weapon save/restore uses shallow `Object.assign({}, playerEquip.melee)`; nested references (not present in default melee) would alias (js/authority/hideSeekSystem.js:97).

---

## Cross-cluster dependencies (all sub-systems)

- `GAME_CONFIG.PLAYER_BASE_SPEED`, `BULLET_SPEED`, `ENTITY_R`, `DEFAULT_HITBOX_R`, `PLAYER_WALL_HW`, `PLAYER_RADIUS`, `KNOCKBACK_DECAY`, `KNOCKBACK_THRESHOLD` — from `js/shared/gameConfig.js`
- `TILE`, `level`, `LEVELS`, `enterLevel` — from `js/shared/levelData.js` + `js/core/sceneManager.js`
- `bullets`, `mobs`, `hitEffects`, `player`, `gold`, `lives`, `gun`, `melee`, `playerEquip`, `potion`, `gameFrame`, `playerName`, `playerDead`, `deathX`, `deathY`, `deathTimer`, `deathGameOver` — from `js/authority/gameState.js`
- `StatusFX`, `TelegraphSystem`, `shrine`, `godspeed` — other authority systems
- `SHOP_ITEMS`, `GUN_TIERS`, `MELEE_TIERS`, `CHEST_TIERS`, `PANTS_TIERS`, `BOOTS_TIERS`, `HELMET_TIERS`, `DEFAULT_GUN`, `DEFAULT_MELEE`, `CT_X_GUN`, `SEEKING_BATON` — from data registries / inventory
- `positionClear`, `isSolid`, `bfsPath` — from `js/authority/mobSystem.js`
- `_tickDashMovement`, `_meleeHitMobs`, `usePotionEntity`, `applyMeleeStats`, `hasRevive`, `tryGrabEntity` — from melee / inventory / interactable systems
- `assignRoles`, `MAFIA_ROLES`, `MAFIA_ROLE_SETTINGS`, `SkeldTasks` — from mafia role data / task system
- `NeuralSparPolicy` — from `js/authority/neuralSparInference.js`

## UNKNOWN entries

- **Hider bot hide-phase speed multiplier** — `_initHiderBot` sets a boosted speed that is reset at seek-phase start (js/authority/hideSeekSystem.js:190), but the exact multiplier lives outside the read range of this extraction. UNKNOWN.
- **`BULLET_SPEED` authoritative value** — referenced via `GAME_CONFIG.BULLET_SPEED` with a fallback of 9 in sparData.js:21 and neuralSparInference.js:23. The canonical value lives in `js/shared/gameConfig.js` (outside this cluster). UNKNOWN in this cluster.
- **`DEFAULT_HITBOX_R`, `ENTITY_R`, `PLAYER_HITBOX_Y`** — same situation; fallbacks are 33, 29, -25 but the canonical values are in `gameConfig.js` (outside cluster). UNKNOWN in this cluster.
- **CT_X_GUN fields** (`damage=20`, `magSize=30`, `color='#3a5a3a'`) are referenced in `sparSystem.js:167-180`. Definition lives in `js/core/interactable.js` per the header comment (js/authority/sparSystem.js:5). UNKNOWN authoritative citation in this cluster.
- **Bot buff item `priceIncrease` / `baseCost` / `maxBuy` values** — referenced via `SHOP_ITEMS.Buffs[idx]` (js/authority/botAI.js:590-616), defined outside this cluster in the shop data file. UNKNOWN in this cluster.
