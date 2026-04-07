# NPCs — Cooking Restaurants (Deli / Diner / Fine Dining)

## Source of truth

- `js/authority/cookingNPCBase.js` — shared NPC factory, movement, recovery, spawn-tick, update-loop, party utilities for all 3 restaurants
- `js/authority/cookingSystem.js` — authority cooking loop, ticket queue, order grading, XP/gold payout, HUD
- `js/authority/deliNPCSystem.js` — Street Deli NPCs (order + aisle shoppers)
- `js/authority/dinerNPCSystem.js` — Diner NPCs (party-based booths, waitress, gamers)
- `js/authority/fineDiningNPCSystem.js` — Fine Dining NPCs (party-based teppanyaki tables, host, waiter)
- `js/authority/fineDiningGrill.js` — Fine Dining teppanyaki grill QTE (trick timing bar)
- `js/shared/cookingData.js` — shops, ingredients, recipes, customer types, grades, timer types

## Purpose

Implements all three player-operated restaurants as continuous cooking minigames. The cooking system auto-generates tickets independent of NPCs; restaurant NPC systems spawn customers that flow through eat/leave lifecycles and link to generated orders for visual presentation. Grill QTE (Fine Dining only) replaces direct submission with a timing-bar trick-hit score that blends into the grade formula. Player earns gold, tips, and Cooking XP per graded order.

## Values

### Shop definitions (`js/shared/cookingData.js:6-12`)

| Shop | Tier | Level req | Orders req | Cost req | maxOrderBase | Level ID | Citation |
|---|---|---|---|---|---|---|---|
| street_deli | 1 | 1 | 0 | 0 | 20 | deli_01 | js/shared/cookingData.js:7 |
| diner | 2 | 10 | 500 | 5000 | 35 | diner_01 | js/shared/cookingData.js:8 |
| fine_dining | 3 | 20 | 2000 | 25000 | 75 | fine_dining_01 | js/shared/cookingData.js:9 |
| luxury | 4 | 35 | 5000 | 100000 | 100 | null | js/shared/cookingData.js:10 |
| five_star | 5 | 50 | 10000 | 500000 | 150 | null | js/shared/cookingData.js:11 |

### Shared cooking config (`js/shared/cookingData.js:117-124`)

| Name | Value | Units | Citation |
|---|---|---|---|
| orderSpawnDelay | 30 | frames (0.5s) | js/shared/cookingData.js:118 |
| comboThreshold | 3 | perfect orders | js/shared/cookingData.js:119 |
| comboTipBonus | 0.2 | +20%/combo level | js/shared/cookingData.js:120 |
| comboMaxBonus | 1.0 | max +100% tip | js/shared/cookingData.js:121 |
| ticketQueueMax | 3 | pre-queued tickets | js/shared/cookingData.js:122 |
| ticketSpawnInterval | 60 | frames (1s) | js/shared/cookingData.js:123 |

### Cooking grades (`js/shared/cookingData.js:108-114`)

| Grade | minQuality | minTime | payMult | tipMult | xpMult | Citation |
|---|---|---|---|---|---|---|
| S | 1.0 | 0.5 | 1.0 | 1.5 | 2.0 | js/shared/cookingData.js:109 |
| A | 0.85 | 0.3 | 0.9 | 1.3 | 1.5 | js/shared/cookingData.js:110 |
| B | 0.6 | 0.15 | 0.75 | 1.0 | 1.0 | js/shared/cookingData.js:111 |
| C | 0.4 | 0.0 | 0.5 | 0.5 | 0.5 | js/shared/cookingData.js:112 |
| F | 0.0 | 0.0 | 0.25 | 0.0 | 0.25 | js/shared/cookingData.js:113 |

### Mood stages (`js/shared/cookingData.js:100-104`)

| Stage | baseFrames | Label | Citation |
|---|---|---|---|
| patient | 3600 (60s) | Patient | js/shared/cookingData.js:101 |
| concerned | 2400 (+40s) | Concerned | js/shared/cookingData.js:102 |
| furious | 3000 (+50s) | Furious (leaves) | js/shared/cookingData.js:103 |

### Timer types per restaurant

| Restaurant | Type | Duration (frames) | Weight | Citation |
|---|---|---|---|---|
| Deli | patient | 3600 (60s) | 0.50 | js/shared/cookingData.js:69 |
| Deli | busy | 1800 (30s) | 0.35 | js/shared/cookingData.js:70 |
| Deli | urgent | 900 (15s) | 0.15 | js/shared/cookingData.js:71 |
| Diner | calm | 5400 (90s) | 0.40 | js/shared/cookingData.js:75 |
| Diner | feisty | 3600 (60s) | 0.40 | js/shared/cookingData.js:76 |
| Diner | rowdy | 2700 (45s) | 0.20 | js/shared/cookingData.js:77 |
| FD | calm | 3600 (60s) | 0.40 | js/shared/cookingData.js:81 |
| FD | feisty | 2700 (45s) | 0.35 | js/shared/cookingData.js:82 |
| FD | rowdy | 1800 (30s) | 0.25 | js/shared/cookingData.js:83 |

Note: `cookingSystem.js:216` overrides the per-restaurant timer types with a flat 30-second (1800-frame) `standard` service timer at ticket creation. The DELI_/DINER_/FD_TIMER_TYPES arrays are defined but not used in the ticket build path (js/authority/cookingSystem.js:216).

### Spatula weapon (`js/shared/cookingData.js:132`)

| Field | Value | Citation |
|---|---|---|
| id | spatula | js/shared/cookingData.js:132 |
| tier | 0 | js/shared/cookingData.js:132 |
| damage | 1 | js/shared/cookingData.js:132 |
| range | 80 | js/shared/cookingData.js:132 |
| cooldown | 20 | js/shared/cookingData.js:132 |
| critChance | 0 | js/shared/cookingData.js:132 |
| special | spatula | js/shared/cookingData.js:132 |

### Customer types — Deli (`js/shared/cookingData.js:59-63`)

| Type | tipMult | moodSpeed | patience | weight | Citation |
|---|---|---|---|---|---|
| regular | 1.0 | 0.7 | 1.2 | 0.55 | js/shared/cookingData.js:60 |
| generous | 1.8 | 0.5 | 1.5 | 0.30 | js/shared/cookingData.js:61 |
| impatient | 0.6 | 1.0 | 0.9 | 0.15 | js/shared/cookingData.js:62 |

### Customer types — Diner (`js/shared/cookingData.js:204-210`)

| Type | partySize | tipMult | moodSpeed | patience | weight | Citation |
|---|---|---|---|---|---|---|
| regular | [1,2] | 1.0 | 0.7 | 1.2 | 0.35 | js/shared/cookingData.js:205 |
| family | [2,3] | 1.2 | 0.5 | 1.5 | 0.25 | js/shared/cookingData.js:206 |
| couple | [2,2] | 1.3 | 0.6 | 1.3 | 0.15 | js/shared/cookingData.js:207 |
| business | [1,1] | 1.5 | 0.9 | 1.0 | 0.15 | js/shared/cookingData.js:208 |
| kids | [2,3] | 0.8 | 1.0 | 0.9 | 0.10 | js/shared/cookingData.js:209 |

### Customer types — Fine Dining (`js/shared/cookingData.js:276-283`)

| Type | partySize | tipMult | moodSpeed | patience | coverFee | weight | Citation |
|---|---|---|---|---|---|---|---|
| regular | [2,4] | 1.0 | 0.6 | 1.3 | 10 | 0.44 | js/shared/cookingData.js:277 |
| vip | [2,4] | 1.8 | 0.5 | 1.3 | 25 | 0.20 | js/shared/cookingData.js:278 |
| group | [4,6] | 1.0 | 0.6 | 1.2 | 10 | 0.20 | js/shared/cookingData.js:279 |
| couple | [2,2] | 1.5 | 0.5 | 1.3 | 30 | 0.10 | js/shared/cookingData.js:280 |
| critic | [2,3] | 2.0 | 0.7 | 1.0 | 40 | 0.01 | js/shared/cookingData.js:281 |
| celebrity | [2,4] | 4.0 | 0.5 | 1.5 | 100 | 0.05 | js/shared/cookingData.js:282 |

### Deli recipes (`js/shared/cookingData.js:41-53`)

All deli basePay is overwritten at ticket-build time by `_calcDeliPay(r) = 8 + r.ingredients.length * 2` (js/shared/cookingData.js:128, cookingSystem.js:238-242).

| Recipe | # Ingredients | basePay (raw) | basePay (calc) | baseXP | Difficulty | Citation |
|---|---|---|---|---|---|---|
| classic_sub | 5 | 12 | 18 | 15 | 1 | js/shared/cookingData.js:42 |
| ham_cheese | 4 | 10 | 16 | 12 | 1 | js/shared/cookingData.js:43 |
| italian_sub | 7 | 18 | 22 | 25 | 2 | js/shared/cookingData.js:44 |
| veggie_delight | 6 | 14 | 20 | 18 | 1 | js/shared/cookingData.js:45 |
| turkey_club | 6 | 16 | 20 | 22 | 2 | js/shared/cookingData.js:46 |
| bagel_classic | 5 | 14 | 18 | 18 | 1 | js/shared/cookingData.js:47 |
| salami_special | 7 | 20 | 22 | 30 | 3 | js/shared/cookingData.js:48 |
| ranch_wrap | 7 | 18 | 22 | 25 | 2 | js/shared/cookingData.js:49 |
| chicken_classic | 5 | 14 | 18 | 18 | 1 | js/shared/cookingData.js:50 |
| chicken_ranch | 6 | 18 | 20 | 25 | 2 | js/shared/cookingData.js:51 |
| chicken_deluxe | 8 | 22 | 24 | 32 | 3 | js/shared/cookingData.js:52 |

Deli ingredients: `bread, bagel, turkey, chicken, ham, salami, lettuce, tomato, cheese, onion, mayo, ketchup, mustard, ranch` (js/shared/cookingData.js:16-31).

### Diner recipes (`js/shared/cookingData.js:186-201`)

| Recipe | Ingredients | basePay | baseXP | Difficulty | Citation |
|---|---|---|---|---|---|
| pancakes | pancake_batter, butter, syrup | 18 | 22 | 1 | js/shared/cookingData.js:188 |
| waffles | waffle_batter, butter, syrup | 18 | 22 | 1 | js/shared/cookingData.js:189 |
| eggs_bacon | eggs, bacon, toast | 16 | 20 | 1 | js/shared/cookingData.js:190 |
| hash_plate | hash_browns, eggs, d_cheese | 16 | 20 | 1 | js/shared/cookingData.js:191 |
| full_breakfast | eggs, bacon, hash_browns, toast, butter | 28 | 38 | 3 | js/shared/cookingData.js:192 |
| toast_eggs | toast, eggs, butter | 14 | 18 | 1 | js/shared/cookingData.js:193 |
| classic_burger | burger_patty, bun, d_lettuce, d_tomato | 20 | 25 | 1 | js/shared/cookingData.js:195 |
| cheeseburger | burger_patty, bun, d_cheese, d_lettuce, d_tomato | 24 | 30 | 2 | js/shared/cookingData.js:196 |
| hot_dog_meal | hot_dog, bun, d_onion | 16 | 20 | 1 | js/shared/cookingData.js:197 |
| fries_plate | fries | 10 | 12 | 1 | js/shared/cookingData.js:198 |
| milkshake | milkshake_base | 12 | 15 | 1 | js/shared/cookingData.js:199 |
| coffee_cup | coffee | 10 | 12 | 1 | js/shared/cookingData.js:200 |

Diner ingredients: breakfast (eggs, bacon, pancake_batter, waffle_batter, hash_browns, toast, butter, syrup), lunch (burger_patty, bun, fries, hot_dog, d_cheese, d_lettuce, d_tomato, d_onion), drinks (milkshake_base, coffee) — js/shared/cookingData.js:155-177.

### Fine Dining recipes (`js/shared/cookingData.js:262-273`)

| Recipe | # Ingredients | basePay | baseXP | Difficulty | trickCount | trickDifficulty | Citation |
|---|---|---|---|---|---|---|---|
| hibachi_steak | 4 | 45 | 55 | 2 | 4 | 2 | js/shared/cookingData.js:263 |
| shrimp_teppanyaki | 3 | 40 | 50 | 1 | 3 | 1 | js/shared/cookingData.js:264 |
| chicken_teriyaki | 3 | 35 | 45 | 1 | 3 | 1 | js/shared/cookingData.js:265 |
| volcano_fried_rice | 5 | 50 | 65 | 2 | 5 | 2 | js/shared/cookingData.js:266 |
| miso_salmon | 4 | 55 | 70 | 3 | 4 | 3 | js/shared/cookingData.js:267 |
| garlic_mushrooms | 3 | 30 | 40 | 1 | 3 | 1 | js/shared/cookingData.js:268 |
| teppanyaki_combo | 6 | 60 | 80 | 3 | 6 | 3 | js/shared/cookingData.js:269 |
| onion_volcano | 4 | 40 | 50 | 2 | 4 | 2 | js/shared/cookingData.js:270 |
| zucchini_steak | 4 | 48 | 60 | 2 | 4 | 2 | js/shared/cookingData.js:271 |
| mushroom_rice | 5 | 42 | 55 | 2 | 5 | 2 | js/shared/cookingData.js:272 |

FD ingredients: `fd_steak, fd_shrimp, fd_chicken, fd_rice, fd_onion, fd_egg, fd_mushroom, fd_zucchini, fd_garlic_butter, fd_soy_sauce, fd_sesame_oil, fd_miso` (js/shared/cookingData.js:238-251).

### Shared NPC update loop timings (`js/authority/cookingNPCBase.js`)

| Name | Value | Units | Citation |
|---|---|---|---|
| Universal idle timeout | 3600 | frames (60s) | js/authority/cookingNPCBase.js:347 |
| Stuck detection threshold | 180 | frames (3s) | js/authority/cookingNPCBase.js:352 |
| Avoidance radius | 50 | px | js/authority/cookingNPCBase.js:149 |
| Waypoint arrival distance | 6 | px | js/authority/cookingNPCBase.js:126 |
| Yield slowdown factor | 0.3 | multiplier | js/authority/cookingNPCBase.js:156 |
| 'slow' pair slowdown | 0.15 | multiplier | js/authority/cookingNPCBase.js:153 |
| Push strength | (50 − sd) × 0.2 | px | js/authority/cookingNPCBase.js:157 |
| Collision half-width | 14 | px | js/authority/cookingNPCBase.js:116, 197, 201, 212 |
| Frame advance per step | 0.1 | frames | js/authority/cookingNPCBase.js:205, 216, 237 |
| Speed randomization | baseSpeed + (rand−0.5)×variance×2 | — | js/authority/cookingNPCBase.js:56 |

## Behavior — shared (cookingNPCBase.js)

1. `_cCreateNPC(idCounter, spawnPos, appearances, names, config, extraFields)` spawns an NPC with random appearance/name, state='entering', and `speed = baseSpeed + (rand−0.5)*variance*2` (js/authority/cookingNPCBase.js:56).
2. `_cStartRoute(npc, route, nextState, nextTimer, intent)` sets NPC to 'walking' with a cloned route (js/authority/cookingNPCBase.js:66-77).
3. `_cMoveNPC(npc, cfg)` executes waypoint following with kitchen-zone restriction (teleport-out if inside), NPC-NPC avoidance within 50 px (lower-ID wins), wall sliding on X or Y when diagonal is blocked, and sets `dir` to 0 (down)/1 (up)/2 (left)/3 (right) based on dominant axis (js/authority/cookingNPCBase.js:94-238).
4. `_cRecoverNPC(npc, cfg)` rebuilds route from saved intent if NPC stuck. Only tried once per NPC (`_recoveryTried`) (js/authority/cookingNPCBase.js:253-281).
5. `_cUpdateNPCLoop(loopCfg)` early-exits unless `Scene.inCooking` and `cookingState.activeRestaurantId === loopCfg.restaurantId` (js/authority/cookingNPCBase.js:317-318). Runs spawn tick, state handler, movement, 60-second idle safety net (js/authority/cookingNPCBase.js:347), and stuck recovery at 180 frames (js/authority/cookingNPCBase.js:352).
6. `_cSpawnTick(timerState, intervalRange, canSpawn)` increments the timer and triggers spawn when threshold hit (js/authority/cookingNPCBase.js:288-296).
7. Party utilities: `_cFindNPCById`, `_cFindParty`, `_cGetPartyLeader`, `_cGetPartyMembers`, `_cCleanupParties` — shared by Diner and Fine Dining (js/authority/cookingNPCBase.js:369-401).

## Behavior — cookingSystem.js

1. On entering restaurant scene, `updateCooking()` auto-starts a session via `startCookingShift()` (js/authority/cookingSystem.js:334-336).
2. `startCookingShift()` saves prior melee equip/slot, injects `SPATULA_WEAPON` into inventory, equips it, sets `activeSlot=1`, and resets combo/stats (js/authority/cookingSystem.js:85-128).
3. Every frame, `ticketSpawnTimer` ticks; when it reaches `COOKING_CONFIG.ticketSpawnInterval` (60 frames) and queue < `ticketQueueMax` (3), `_generateTicket()` runs (js/authority/cookingSystem.js:341-346).
4. `_generateTicket()` picks a recipe for the active restaurant, picks a customer type, builds mood thresholds (`baseFrames * customer.patience`), creates a single-item ticket for deli or multi-item (2-4 for diner / 2-6 for FD) ticket (js/authority/cookingSystem.js:204-261).
5. Deli recipes use per-ingredient pay formula `8 + ingredients.length * 2` applied at ticket build (js/authority/cookingSystem.js:238-242; js/shared/cookingData.js:128).
6. `_activateNextTicket()` pops the queue into `cookingState.currentOrder` with fresh `serviceTimer=0`, service duration of 1800 frames, and tries to link an NPC at the counter (js/authority/cookingSystem.js:266-308).
7. Mood timer increments by `customer.moodSpeed` (default 0.7) per frame; stage advances when cumulative threshold is exceeded (js/authority/cookingSystem.js:369-378).
8. Spatula melee swing detection: when `melee.swinging && melee.special==='spatula'`, searches for nearest ingredient/station entity within 40 px with facing-direction bias of 15 px (js/authority/cookingSystem.js:381-425).
9. `handleStationInteract(entityType)`: ingredient entities push ingredient id to `assembly[]` if needed count not yet met; counter entities (`deli_counter` / `diner_counter` / `fd_counter`) clear the plate; pickup counters (`pickup_counter` / `diner_pickup_counter` / `fd_pickup_counter` / `fd_serve_counter` / `fd_service_counter`) call `gradeOrder()`; teppanyaki grill types (`fd_teppanyaki_grill_*`) call `startGrillSequence(tableId, recipe)` if assembly is complete and table matches (js/authority/cookingSystem.js:486-567).
10. Service timer expiry → linked NPC routed out angry, F grade applied, missed counter incremented (js/authority/cookingSystem.js:430-475).
11. `gradeOrder()` quality: set-based ingredient match with excess-penalty 0.1 per extra wrong item (js/authority/cookingSystem.js:575-590). Time score: `1 − serviceTimer/serviceDuration` (js/authority/cookingSystem.js:593). Fine Dining blends: `0.4*quality + 0.4*grillState.trickScore + 0.2*time` (js/authority/cookingSystem.js:598-603). Grade lookup uses COOKING_GRADES thresholds (js/authority/cookingSystem.js:607-610).
12. Payment: `pay = round(basePay * grade.payMult)`, `tip = round(pay * 0.2 * grade.tipMult * customer.tipMult * comboMult)`, `xp = round(recipe.baseXP * grade.xpMult)` (js/authority/cookingSystem.js:613-623).
13. Combo: S/A increments combo, multiplier = `1 + min(comboCount * comboTipBonus, comboMaxBonus)`; F resets (js/authority/cookingSystem.js:651-660).
14. `applyOrderResult()` adds `pay+tip` to `gold`, adds XP via `addSkillXP('Cooking', xp)` (js/authority/cookingSystem.js:663-670). Popups last 120 frames (2s) (js/authority/cookingSystem.js:704).
15. Multi-item tickets: on non-F grade, `ticket.completedCount++` and advances to next item resetting `serviceTimer=0` (js/authority/cookingSystem.js:717-733).
16. On completion, route to waitress pending serve (diner), waiter pending serve (FD), or counter plate slot (deli) — F grades skip plate placement (js/authority/cookingSystem.js:736-804).
17. `resetCookingState()` removes spatula, restores saved melee equip/slot, clears all ticket/counter/grill state (js/authority/cookingSystem.js:142-199).

## Behavior — Street Deli (deliNPCSystem.js)

### Deli values

| Name | Value | Citation |
|---|---|---|
| minNPCs | 0 | js/authority/deliNPCSystem.js:73 |
| maxNPCs | 6 | js/authority/deliNPCSystem.js:74 |
| spawnInterval | [180, 420] (3-7s) | js/authority/deliNPCSystem.js:75 |
| baseSpeed | 0.77 | js/authority/deliNPCSystem.js:76 |
| speedVariance | 0.14 | js/authority/deliNPCSystem.js:77 |
| eatDuration | [900, 900] (15s) | js/authority/deliNPCSystem.js:78 |
| browseDuration | [480, 900] (8-15s) | js/authority/deliNPCSystem.js:79 |
| aisleSpawnInterval | [1800, 1800] (30s) | js/authority/deliNPCSystem.js:80 |
| Idle timeout | 3600 frames (60s) | js/authority/deliNPCSystem.js:688 |
| Stuck retry | 180 frames | js/authority/deliNPCSystem.js:640 |
| Stuck retry backoff | 60 frames | js/authority/deliNPCSystem.js:658 |

Door/spots (js/authority/deliNPCSystem.js:32-38): `enterDoor (13,34)`, `exitDoor (14,34)`, `counterArea (13,22)`, `corridorE (25,22)`, `diningEntry (26,20)`.
Pickup spots on service counter (js/authority/deliNPCSystem.js:42-44): `(14,22), (15,22), (16,22), (17,22)`.
Chairs — 8 total at tables (28,4) and (28,17), side chairs only, with `sitDir` 2 or 3 (js/authority/deliNPCSystem.js:47-54).
Shelves with prices: Frozen 4, Snacks 3, Candy 2, Beverages 3 — each with 2 browse spots (js/authority/deliNPCSystem.js:58-63).
Cashier: `(37, 24)` (js/authority/deliNPCSystem.js:69).
8 appearance colorsets and 32 names (js/authority/deliNPCSystem.js:11-28).
Kitchen zone: `tx ≤ 23 && ty ≤ 20`, plus `tx=24, ty=18..21` (js/authority/deliNPCSystem.js:92-99).

### Deli flow

1. Two NPC types: Order NPCs only enter when unclaimed food is on the counter; Aisle NPCs enter regardless and browse shelves (js/authority/deliNPCSystem.js:1-8, 583, 598).
2. Spawn gate for Order NPCs: `_hasUnclaimedCounterOrders() && deliNPCs.length < maxNPCs (6)` (js/authority/deliNPCSystem.js:583).
3. Aisle NPC spawn gate: `aisleNPCCount < 4 && deliNPCs.length < 6` (js/authority/deliNPCSystem.js:598).
4. Order NPC lifecycle: enter door → counter area → ordering at pickup spot → `waiting_food` → `pickup_food` (stateTimer ~30 frames) → claim a chair → `walking` → `eating` (900 frames / 15s) → walk out via `(16,22)→(16,34)` (js/authority/cookingSystem.js:443-448).
5. Chairs are claimed via `npc.claimedChair = chairIdx`; on expiration route walks back through the dining gap.
6. Aisle NPCs pick a free shelf spot (`_pickFreeShelfSpot`), browse 8-15s, pay price at cashier, exit (js/authority/deliNPCSystem.js:103-120, 79).
7. All NPCs use `_cMoveNPC` with kitchen-zone teleport fallback; stuck >180 frames triggers recovery or stateTimer=60 retry backoff (js/authority/deliNPCSystem.js:639-658).
8. Idle timeout 60s in non-exempt states forces exit (js/authority/deliNPCSystem.js:687-689).

## Behavior — Diner (dinerNPCSystem.js)

### Diner values

| Name | Value | Citation |
|---|---|---|
| maxParties | 6 | js/authority/dinerNPCSystem.js:54 |
| spawnInterval | [3600, 3600] (60s) | js/authority/dinerNPCSystem.js:55 |
| baseSpeed | 0.77 | js/authority/dinerNPCSystem.js:56 |
| speedVariance | 0.14 | js/authority/dinerNPCSystem.js:57 |
| eatDuration | [900, 900] (15s) | js/authority/dinerNPCSystem.js:58 |
| gamerSpawnInterval | [600, 1200] (10-20s) | js/authority/dinerNPCSystem.js:59 |
| gamerPlayDuration | [900, 900] (15s) | js/authority/dinerNPCSystem.js:60 |
| gamerFee | 5 gold/play | js/authority/dinerNPCSystem.js:61 |
| gamerMaxPlays | 2 | js/authority/dinerNPCSystem.js:62 |
| waitressTakeOrderDuration | 0 | js/authority/dinerNPCSystem.js:63 |
| waitressSubmitDuration | 30 (0.5s) | js/authority/dinerNPCSystem.js:64 |
| waitressServeDuration | 30 (0.5s) | js/authority/dinerNPCSystem.js:65 |
| menuReadDuration | [60, 120] (1-2s) | js/authority/dinerNPCSystem.js:66 |
| Long idle timeout | 7200 frames (120s) | js/authority/dinerNPCSystem.js:934 |
| Exit cooldown | 5 seconds (300 frames) | js/authority/dinerNPCSystem.js:83 (comment) |
| Party size for spawn | `_cRandRange(2, 4)` | js/authority/dinerNPCSystem.js:740 |

Spots (js/authority/dinerNPCSystem.js:22-29): `entrance (27,21)`, `exit/customerExit (45,21)`, `passWindow (23,14)`, `counterWait (23,16)`, `pickupSpot (15,16)`.

6 booths, capacity 4 each, tableNumber 1-6 (js/authority/dinerNPCSystem.js:34-44):
- Left column (tx=28): ty=2,7,12 → booth ids 0-2 → tables 1-3
- Right column (tx=38): ty=2,7,12 → booth ids 3-5 → tables 4-6
- Each booth: 4 seats (top row `ty, sitDir=0` up; bottom row `ty+3, sitDir=1` down), entry/topRowAccess/bottomRowAccess west of booth.

2 arcade spots at (34,21) and (36,21) (js/authority/dinerNPCSystem.js:47-50).

### Diner flow

1. Diner is party-based: a customer type is picked, party size randomized 2-4 (js/authority/dinerNPCSystem.js:740), and `_findFreeBooth(partySize)` returns a booth with `claimedBy === null && capacity >= partySize` (js/authority/dinerNPCSystem.js:109-113).
2. Party spawns `partySize` NPCs at entrance, routes them to their seats in the booth, and sets booth `claimedBy=partyId`.
3. Waitress (persistent single instance) walks between `counterWait (23,16)`, `pickupSpot (15,16)`, `passWindow (23,14)`, and booths. She runs `pass_to_booth` serve route in `waitressServeDuration=30` frames (js/authority/dinerNPCSystem.js:662).
4. Diner orders are multi-item tickets — `_ticketRandRange(2, 4)` items per ticket (js/authority/cookingSystem.js:221-226).
5. When player completes a diner order, the result is pushed to `_dinerPendingServe` with `boothId`, `partyId`, `tableNumber`, `recipeIngredients`, `allTrayItems`. TV queue entry status flips `pending → ready` (js/authority/cookingSystem.js:737-757).
6. Party leaves booth after `eatDuration` (15s). Exit cooldown (5s) separates groups (js/authority/dinerNPCSystem.js:83).
7. Gamers are a separate NPC category: `gamerSpawnInterval [600,1200]`, sit at arcade spot, play for 900 frames, fee 5 gold per play, up to 2 plays, then leave (js/authority/dinerNPCSystem.js:59-62, 1041, 1093).
8. F-grade for diner: pre-assigned booth released (`claimedBy=null`, `_plates=null`), TV queue entry flipped to `failed` with 180-frame (3s) removal timer (js/authority/cookingSystem.js:807-823).
9. Service-timer expiry triggers `_triggerPartyLeave` on the linked booth (js/authority/cookingSystem.js:454-462).
10. Cycling `tableNumber` (1-6) is assigned at ticket generation via `_dinerNextTableNum % 6 + 1` (js/authority/cookingSystem.js:247-251).
11. Idle safety: 120-second timeout in long-running non-exempt states (js/authority/dinerNPCSystem.js:934).

## Behavior — Fine Dining (fineDiningNPCSystem.js)

### FD values

| Name | Value | Citation |
|---|---|---|
| maxParties | 4 | js/authority/fineDiningNPCSystem.js:66 |
| spawnInterval | [300, 600] (5-10s) | js/authority/fineDiningNPCSystem.js:67 |
| baseSpeed | 0.7 | js/authority/fineDiningNPCSystem.js:68 |
| speedVariance | 0.1 | js/authority/fineDiningNPCSystem.js:69 |
| eatDuration | [900, 900] (15s) | js/authority/fineDiningNPCSystem.js:70 |
| hostPauseDuration | [900, 900] (15s) | js/authority/fineDiningNPCSystem.js:71 |
| waiterOrderDuration | 900 (15s) | js/authority/fineDiningNPCSystem.js:72 |
| waiterGreetDuration | 90 (1.5s) | js/authority/fineDiningNPCSystem.js:73 |
| entryInterval | 180 (3s) | js/authority/fineDiningNPCSystem.js:74 |
| seatWaitInterval | 180 (3s) | js/authority/fineDiningNPCSystem.js:75 |
| exitInterval | 300 (5s) | js/authority/fineDiningNPCSystem.js:76 |
| walkToTableInterval | 120 (2s) | js/authority/fineDiningNPCSystem.js:77 |

Spots (js/authority/fineDiningNPCSystem.js:35-41): `exit (40,24)`, `hostStand (41,19)`, `passWindow (17,19)`, `waiterHome (18,19)`, `hostQueue (40,21)`.

4 teppanyaki tables (js/authority/fineDiningNPCSystem.js:57-62), grill tiles at (25,5),(35,5),(25,14),(35,14); 6 seats per table, middle seats face grill (dir=3 left side, dir=2 right side), top/bottom seats face up (dir=0) and down (dir=1).

4 table approach points (1 tile south of grill) (js/authority/fineDiningNPCSystem.js:47-52): `(25,7), (35,7), (25,16), (35,16)`.

Kitchen zone: `tx ≤ 19 && ty ≤ 18` (js/authority/fineDiningNPCSystem.js:110).

Customer type pool (also in cookingData.js but duplicated here for spawning) (js/authority/fineDiningNPCSystem.js:146-151): regular/vip/group/couple/critic/celebrity with weights 0.44/0.20/0.20/0.10/0.01/0.05 — note celebrity weight is 0.05 in both files but critic weight is 0.01.

### FD flow

1. Party size: `max(2, min(6, _cRandRange(partySize[0], partySize[1])))` from customer type (js/authority/fineDiningNPCSystem.js:488-489).
2. Host NPC is persistent and stationary at `hostStand (41,19)`. Incoming party walks to `hostQueue (40,21)`, pauses for `hostPauseDuration` 900 frames (15s) (js/authority/fineDiningNPCSystem.js:1076).
3. Cover fee awarded immediately when party is seated: `gold += coverFee` (10/25/10/30/40/100 by customer type), also added to `cookingState.stats.totalEarned` (js/authority/fineDiningNPCSystem.js:1099-1111).
4. Waiter NPC (persistent single instance) queues parties via `_fdWaiterQueue`. Greets 90 frames, takes order for `waiterOrderDuration` 900 frames (15s) at approach point, then returns to `passWindow (17,19)` where order becomes visible (`_fdOrderVisible=true`) (js/authority/fineDiningNPCSystem.js:857-892, 1128).
5. FD tickets are multi-item: 1 item per guest (party size 2-6) (js/authority/cookingSystem.js:228-235).
6. After player cooks each item and submits via grill completion, completed tray is pushed to `_fdPendingServe` with `tableId=null` (waiter picks a free table on pickup) (js/authority/cookingSystem.js:758-771).
7. Waiter walks to assigned table approach point, delivers, party eats `eatDuration` 900 frames (15s), then exits via `exit (40,24)` spaced by `exitInterval` 300 frames (5s) (js/authority/fineDiningNPCSystem.js:76, 1294).
8. Teppanyaki grill validation: player must be at the correct `tableId` for the current order; mismatch shows "Wrong table! Check order." popup (js/authority/cookingSystem.js:524-528).
9. Idle/stuck safety from base loop (60s idle, 180-frame stuck).

## Behavior — Fine Dining Grill QTE (fineDiningGrill.js)

### Grill config (`js/authority/fineDiningGrill.js:18-29`)

| Name | Value | Citation |
|---|---|---|
| barDuration | [300, 480] (5-8s) | js/authority/fineDiningGrill.js:19 |
| perfectWindow | 0.025 (±2.5%) | js/authority/fineDiningGrill.js:20 |
| goodWindow | 0.06 (±6%) | js/authority/fineDiningGrill.js:21 |
| trickZoneWidth | 0.08 (8%) | js/authority/fineDiningGrill.js:22 |
| comboBonus | 0.15 (+15%/hit) | js/authority/fineDiningGrill.js:23 |
| maxComboMult | 2.5 | js/authority/fineDiningGrill.js:24 |
| missComboReset | true | js/authority/fineDiningGrill.js:25 |
| finishDelay | 60 frames (1s) | js/authority/fineDiningGrill.js:26 |
| vipCriticBarDuration | 300 frames (5s) | js/authority/fineDiningGrill.js:27 |
| vipCriticTrickCount | 5 | js/authority/fineDiningGrill.js:28 |

Trick types (cosmetic): Spatula Spin, Onion Volcano, Shrimp Toss, Egg Crack, Flame Burst, Rice Flip (js/authority/fineDiningGrill.js:8-15).

Difficulty-to-barDuration mapping (js/authority/fineDiningGrill.js:79-84): difficulty 1 → 480 frames (slow), difficulty 3 → 300 frames (fast); linear interpolation with `t=(diff-1)/2`, `barDuration = 480 - 180*t`.

Difficulty-to-zoneWidth multiplier (js/authority/fineDiningGrill.js:113): diff 1 → ×1.0, diff 2 → ×0.8, diff 3 → ×0.6.

### Grill flow

1. Triggered by `startGrillSequence(tableId, recipe)` when player swings spatula at `fd_teppanyaki_grill_*` after collecting all ingredients (js/authority/cookingSystem.js:519-531, js/authority/fineDiningGrill.js:61).
2. VIP or Critic customers override: `barDuration=300`, `trickCount=5`, `diff=2` (js/authority/fineDiningGrill.js:71, 75-76, 106-112).
3. Cursor speed = `1 / barDuration`; tricks placed evenly across `0.1..0.9` range with `pos = 0.1 + 0.8*(i+0.5)/trickCount` (js/authority/fineDiningGrill.js:91, 119).
4. Each tick: cursor advances; unhit tricks whose zone the cursor passed auto-miss; combo reset on miss (js/authority/fineDiningGrill.js:243-259).
5. Spatula swing during active grill calls `_checkTrickHit()`: if cursor is within any unhit trick `[start,end]`, measure distance to center; ≤ `perfectWindow` (0.025) = Perfect, else Good; outside any zone = Miss (js/authority/fineDiningGrill.js:273-327).
6. Combo multiplier = `1 + min(comboCount * 0.15, 1.5)` (max 2.5) (js/authority/fineDiningGrill.js:313-317).
7. Bar complete (cursor ≥ 1.0) → `endGrillSequence()` computes final trickScore and enters 'finishing' phase (js/authority/fineDiningGrill.js:261-265).
8. After `finishDelay=60` frames, grade is computed:
   - **Critic**: requires all 5 hits (perfect+good). Any miss → F grade forced, party leaves, "Critic Failed!" popup (js/authority/fineDiningGrill.js:171-206). All hits → normal grade with tip ×2.0 and pay ×1.5 (js/authority/fineDiningGrill.js:222-227).
   - **VIP**: if 3+ of 5 hits → tip ×1.5, pay ×1.2 bonus on top of normal grade (js/authority/fineDiningGrill.js:208-221).
   - **Regular**: normal grading (js/authority/fineDiningGrill.js:228-232).
9. `grillState.trickScore` is read by `gradeOrder()` at js/authority/cookingSystem.js:598-603 and blended 40/40/20 with quality and time when `activeRestaurantId==='fine_dining'`.
10. `resetGrillState()` clears all grill fields on restaurant entry/exit (invoked from `endCookingShift`/`resetCookingState`, js/authority/cookingSystem.js:139, 144).

## Dependencies

- Reads: `Scene.inCooking`, `player.x/y/dir`, `melee.swinging/special`, `gameFrame`, `TILE`, `gold`, `inventory`, `playerEquip`, `activeSlot`, `levelEntities`, `hitEffects`, `BASE_W`, `BASE_H`, `ctx`
- Writes: `gold` (pay+tip, cover fees), `inventory` (spatula add/remove), `playerEquip.melee`, `activeSlot`, `cookingProgress.lifetimeOrdersTotal/lifetimeOrdersByShop`, `cookingState.stats` (orders, perfectDishes, totalEarned, totalTips, totalXP, grades)
- Calls: `addSkillXP('Cooking', xp)` (progression), `createItem`, `addToInventory`, `isInInventory`, `equipItem`, `positionClear(px,py,14)` (collision), `Events.emit` (none direct)
- Cross-cluster: `progressionData.js` for Cooking skill, `levelData.js` for restaurant scene IDs (`deli_01`, `diner_01`, `fine_dining_01`), `entityRenderers.js` for ingredient/station entity rendering, `saveLoad.js` for `cookingProgress` persistence, `cookingPanel.js` / UI panels for HUD overlays beyond `drawCookingHUD`.

## Edge cases

- The per-restaurant `DELI_TIMER_TYPES` / `DINER_TIMER_TYPES` / `FD_TIMER_TYPES` are declared (js/shared/cookingData.js:68-84) but `_generateTicket` overrides them with a flat `{ id: 'standard', duration: 1800 }` (js/authority/cookingSystem.js:216), so timer-type weights are currently dead data.
- `customerType.weight` for `critic` differs between places: cookingData.js:281 says 0.01 and fineDiningNPCSystem.js:150 duplicates it as 0.01. Both files sum to >1.00 (0.44+0.20+0.20+0.10+0.01+0.05 = 1.00 exactly).
- Deli `basePay` values in the DELI_RECIPES array (10-22) are overwritten at ticket-build by `_calcDeliPay = 8 + ingredients*2` (16-24). The array values are never used for payout.
- `_tryLinkNPCToOrder()` only links NPCs in `ordering` state with no `linkedOrderId`. If all waiting NPCs are already linked, new orders stay NPC-less and the system keeps retrying for non-deli restaurants (js/authority/cookingSystem.js:358-362).
- Fine Dining orders are hidden from HUD until the waiter posts them at the pass window via `_fdOrderVisible` (js/authority/cookingSystem.js:872-875).
- F-grade orders skip ticket advancement entirely — the whole multi-item ticket fails (`isFailedOrder` branch, js/authority/cookingSystem.js:714-717).
- F-grade deli orders skip plate placement at counter (js/authority/cookingSystem.js:774).
- Diner F-grade cleanup releases the pre-assigned booth and updates TV queue (js/authority/cookingSystem.js:807-823).
- NPC-NPC avoidance uses ID-based priority: higher-ID NPC yields (js/authority/cookingNPCBase.js:154). If two NPCs have equal skip/pair/slow behavior, the lower-ID always wins.
- Kitchen-zone teleport fallback: if an NPC's position is already inside the kitchen, it is teleported to `kitchenSafe` and its route replaced with `kitchenFallback` (js/authority/cookingNPCBase.js:182-194).
- Recovery is one-shot per NPC (`_recoveryTried`); second stuck event leads to despawn via `onStuckTimeout(npc)` returning false (js/authority/cookingNPCBase.js:255, 352).
- Combo multiplier is capped at `1 + comboMaxBonus = 2.0` (js/authority/cookingSystem.js:653-656), while grill combo multiplier is capped at `maxComboMult = 2.5` (js/authority/fineDiningGrill.js:316) — two independent combo systems.
- Spatula swing detection uses a single melee-based facing bias of 15 px subtracted from distance (js/authority/cookingSystem.js:418), so entities in front are preferred even when slightly farther.
- `_dinerNextTableNum` cycles 1-6 regardless of which booths are actually free — table numbers may not correspond to occupancy (js/authority/cookingSystem.js:247-251).
- Grill `finishTimer` phase leaves `grillState.active=true` so updateGrill continues to tick; only `phase='finishing'` branch runs (js/authority/fineDiningGrill.js:152-238).
- Universal `_cUpdateNPCLoop` idle safety net (60s) uses `exemptIdleStates`; per-restaurant loops provide their own exempt sets, but diner overrides with its own 120s check (js/authority/dinerNPCSystem.js:934).
