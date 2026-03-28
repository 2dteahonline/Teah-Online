# Cooking System

## Overview

A continuous restaurant minigame where the player assembles orders for NPC customers by swinging a spatula at ingredient stations. Orders are graded on ingredient accuracy and speed (S/A/B/C/F), awarding gold, tips, and Cooking XP. The system supports five restaurant tiers (three currently implemented), each with unique mechanics, customer types, and NPC behaviors. Sessions run continuously until the player leaves the scene (no shift timer).

### Restaurant Tiers

| Shop ID | Name | Tier | Level Req | Orders Req | Cost Req | Max Orders | Level ID | Status |
|---------|------|------|-----------|-----------|----------|-----------|----------|--------|
| `street_deli` | Street Deli | 1 | 1 | 0 | 0 | 20 | `deli_01` | Implemented |
| `diner` | Diner | 2 | 10 | 500 | 5,000 | 35 | `diner_01` | Implemented |
| `fine_dining` | Fine Dining | 3 | 20 | 2,000 | 25,000 | 75 | `fine_dining_01` | Implemented |
| `luxury` | Luxury Restaurant | 4 | 35 | 5,000 | 100,000 | 100 | null | Future |
| `five_star` | 5 Star Elite | 5 | 50 | 10,000 | 500,000 | 150 | null | Future |

### COOKING_CONFIG

| Key | Value | Description |
|-----|-------|-------------|
| `orderSpawnDelay` | 30 | Frames before first order spawns |
| `comboThreshold` | 3 | Consecutive S/A grades needed before combo tip bonus activates |
| `comboTipBonus` | 0.2 | Tip bonus per combo step (20%) |
| `comboMaxBonus` | 1.0 | Maximum combo tip bonus (100%, i.e., 2x tips at 5+ combo) |
| `ticketQueueMax` | 3 | Maximum queued tickets |
| `ticketSpawnInterval` | 60 | Frames between ticket auto-generation (1 second) |

### Mood Stages

NPCs cycle through 3 mood stages while waiting for their order:

| Stage | Mood | Color | Duration |
|-------|------|-------|----------|
| Patient | Happy | `#60c060` | 3600 frames (60s) |
| Concerned | Neutral | `#e0c040` | 2400 frames (+40s) |
| Furious | Angry | `#e04040` | 3000 frames (+50s, then leaves) |

### Spatula Weapon

The spatula is auto-equipped during cooking sessions:

| Field | Value |
|-------|-------|
| `id` | `'spatula'` |
| `damage` | 1 |
| `range` | 80 |
| `cooldown` | 20 |
| `critChance` | 0 |
| `special` | `'spatula'` |

## Files

- `js/shared/cookingData.js` — Shop definitions (5 tiers), all ingredients/recipes/customer types for all 3 restaurants, service timer types, grade thresholds, cooking config, spatula weapon, helper functions.
- `js/authority/cookingSystem.js` — Session lifecycle, ticket queue, order spawning, station interaction (spatula-based), grading formula, result application, combo tracking, HUD rendering.
- `js/authority/cookingNPCBase.js` — Shared NPC utilities for all restaurants: NPC factory, movement with avoidance, route system, recovery, spawn timers, update loop, party utilities.
- `js/authority/deliNPCSystem.js` — Deli customer NPC AI: queue-based ordering, two roles (meal/retail), 4 dining tables, 4 aisle shelves, cashier.
- `js/authority/dinerNPCSystem.js` — Diner NPC AI: party-based booth seating, persistent waitress NPC, arcade spots, ticket queue integration.
- `js/authority/fineDiningNPCSystem.js` — Fine dining NPC AI: party-based teppanyaki table seating, persistent waiter NPC, cover fees, order visibility gating.
- `js/authority/fineDiningGrill.js` — Teppanyaki grill QTE timing bar mini-game, trick scoring, VIP/Critic grade overrides.

## Shared NPC Base Module (cookingNPCBase.js)

All three restaurant NPC systems delegate common functionality to `cookingNPCBase.js`, which is loaded before any per-restaurant script. Each restaurant provides a config object to these shared functions rather than re-implementing boilerplate.

### What It Provides

**Utility functions:**
- `_cRandRange(min, max)`, `_cRandFromArray(arr)` — random helpers
- `_cTilePx(tx, ty)` — tile coords to pixel center
- `_cWP(tx, ty)` — create a waypoint object
- `_cCloneRoute(route)` — safely clone a route array
- `_cConcatRoutes(...)` — concatenate multiple route segments

**NPC factory:**
- `_cCreateNPC(idCounter, spawnPos, appearances, names, config, extraFields)` — creates a base NPC with all shared fields (id, position, direction, frame, movement state, appearance, name, state machine fields). Per-restaurant fields are merged via `extraFields`.

**Route system:**
- `_cStartRoute(npc, route, nextState, nextTimer, intent)` — starts an NPC walking along a cloned route, with transition state and optional route intent for recovery.

**Movement:**
- `_cMoveNPC(npc, cfg)` — route-following movement with NPC-NPC avoidance (lower-ID priority), kitchen zone restriction, wall collision checks, lane offsets, and configurable pair behaviors (`skip`, `slow`, `yield`). Config includes: `npcList`, `skipStates`, `kitchenCheck`, `kitchenSafe`, `kitchenFallback`, `laneMode`, `selfAvoidSkip`, `pairBehavior`.

**Recovery:**
- `_cRecoverNPC(npc, cfg)` — attempts to recover a stuck NPC by rebuilding its route from saved intent. Teleports to anchor position and restarts walking.

**Spawn timer:**
- `_cSpawnTick(timerState, intervalRange, canSpawn)` — generic spawn interval management.

**Update loop:**
- `_cUpdateNPCLoop(loopCfg)` — per-frame update loop shared by all restaurants. Handles spawn timing, state handler dispatch, movement, 60-second idle timeout, stuck detection (1+ second blocked), despawn. Config includes: `restaurantId`, `stateHandlers`, `exemptIdleStates`, `onIdleTimeout`, `onStuckTimeout`, `onDespawn`, `postLoop`.

**Party utilities** (used by diner and fine dining):
- `_cFindNPCById()`, `_cFindParty()`, `_cGetPartyLeader()`, `_cGetPartyMembers()`
- `_cCleanupParties(partyList, npcList, releaseResource)` — removes parties where all members have despawned, releasing booths/tables.

### How Restaurants Delegate

Each restaurant defines its own:
1. **Appearance pool** and **name pool** (passed to `_cCreateNPC`)
2. **Config object** with spawn intervals, speeds, durations (passed to spawn/update functions)
3. **State handler map** (e.g., `DELI_NPC_AI`, `DINER_NPC_AI`, `FD_NPC_AI`) — passed to `_cUpdateNPCLoop`
4. **Move function** wrapping `_cMoveNPC` with restaurant-specific config (kitchen zones, lane modes, pair behaviors)
5. **Route builders** — per-restaurant waypoint routes
6. **Kitchen zone check** function

## Cooking State

`cookingState` — global state object shared across all restaurants:

| Field | Description |
|-------|-------------|
| `active` | Whether a session is in progress |
| `activeRestaurantId` | `'street_deli'`, `'diner'`, or `'fine_dining'` |
| `assembly[]` | Ingredient IDs the player has added so far |
| `currentOrder` | Active order with recipe, customer, service timer, timer type, linked NPC/table/party IDs |
| `ticket` | Multi-item ticket: `{ items, completedCount }` (diner orders can have 1-3 items) |
| `ticketQueue[]` | Pre-generated orders waiting to activate (max 3) |
| `ticketSpawnTimer` | Frames until next ticket auto-generation |
| `comboCount` / `comboMultiplier` | Consecutive S/A grades boost tip multiplier |
| `missedOrders` | Count of timed-out/missed orders |
| `stagingPlates[]` | Plate staging for multi-item tickets |
| `stats` | Per-session: ordersCompleted, perfectDishes, totalEarned, totalTips, totalXP, grades |
| `lastResult` / `lastResultTimer` | Last graded order for popup display |

Multi-restaurant routing helpers select the correct ingredients, recipes, entity maps, NPC lists, and timer types based on `activeRestaurantId`: `_getActiveIngredients()`, `_getActiveEntityToIngredient()`, `_pickActiveRecipe()`, `_getActiveNPCs()`, `_getActiveTimerTypes()`.

## Session Lifecycle

1. Player enters a restaurant scene (`Scene.inCooking` becomes true).
2. `startCookingShift(restaurantId)` auto-fires: saves current weapon, equips spatula, resets all state.
3. Ticket queue auto-generates orders on a timer (every 60 frames / 1 second, max 3 queued).
4. When no active order exists, next ticket activates as `currentOrder`.
5. Player assembles ingredients by swinging spatula at ingredient stations.
6. Player submits at pickup counter (or grill auto-submits for fine dining).
7. `gradeOrder()` scores it, `applyOrderResult()` awards gold + tips + XP.
8. Cycle repeats continuously until player leaves.
9. On scene exit, `resetCookingState()` restores original weapon, removes spatula, resets all state.

There is no shift timer or end-of-shift overlay. Sessions are continuous.

## Per-Restaurant Details

---

### Street Deli (Tier 1)

**Concept:** Quick-service sandwich counter with dining area and grocery aisles.

**14 Ingredients:** bread, bagel, turkey, chicken, ham, salami, lettuce, tomato, cheese, onion, mayo, ketchup, mustard, ranch. Entity prefix: `ing_*`.

**11 Recipes:**

| Recipe | Ingredients | Pay | XP | Difficulty |
|--------|-------------|-----|-----|-----------|
| Classic Sub | bread, turkey, lettuce, tomato, mayo | 12 | 15 | 1 |
| Ham & Cheese | bread, ham, cheese, mustard | 10 | 12 | 1 |
| Italian Sub | bread, salami, ham, cheese, lettuce, onion, mayo | 18 | 25 | 2 |
| Veggie Delight | bread, lettuce, tomato, onion, cheese, ranch | 14 | 18 | 1 |
| Turkey Club | bread, turkey, ham, lettuce, tomato, mayo | 16 | 22 | 2 |
| Bagel Classic | bagel, turkey, cheese, lettuce, mayo | 14 | 18 | 1 |
| Salami Special | bread, salami, cheese, tomato, onion, ketchup, mustard | 20 | 30 | 3 |
| Ranch Wrap | bread, turkey, lettuce, tomato, cheese, onion, ranch | 18 | 25 | 2 |
| Chicken Classic | bread, chicken, lettuce, tomato, mayo | 14 | 18 | 1 |
| Chicken Ranch | bread, chicken, cheese, lettuce, onion, ranch | 18 | 25 | 2 |
| Chicken Deluxe | bagel, chicken, ham, cheese, lettuce, tomato, mayo, mustard | 22 | 32 | 3 |

Pay formula override: `8 + (ingredientCount * 2)` (replaces static basePay).

**3 Customer Types:**

| Type | Weight | Tip Mult | Mood Speed | Patience |
|------|--------|----------|-----------|----------|
| Regular | 55% | 1.0x | 0.7x | 1.2x |
| Generous | 30% | 1.8x | 0.5x | 1.5x |
| Impatient | 15% | 0.6x | 1.0x | 0.9x |

**Service Timer Types:** Patient (60s, 50%), Busy (30s, 35%), Urgent (15s, 15%).

**NPC Roles:** 70% meal customers (queue, order, eat, browse, leave), 30% retail shoppers (browse shelves, cashier, leave).

**Layout:** Kitchen (tx 0-23, ty 0-20), queue line (4 spots at tx:11), 2 dining tables (16 chairs), 4 aisle shelves (Frozen, Snacks, Candy, Bevs), cashier at tx:40.

**Config:** Max 4 NPCs, spawn every 3-9 sec, eat 15 sec, browse 8-15 sec, 50% condiment visit chance, 70% post-meal aisle browse chance.

**NPC States:** `spawn_wait`, `entering`, `walking`, `in_queue`, `ordering`, `waiting_food`, `pickup_food`, `at_condiments`, `eating`, `shopping_aisle`, `browsing_shelf`, `at_cashier`, `_despawn_walk`, `_despawn`.

---

### Diner (Tier 2)

**Concept:** Retro 50s diner with booth seating, a waitress NPC, and an arcade corner.

**18 Ingredients:** eggs, bacon, pancake_batter, waffle_batter, hash_browns, toast, butter, syrup, burger_patty, bun, fries, hot_dog, d_cheese, d_lettuce, d_tomato, d_onion, milkshake_base, coffee. Entity prefix: `ding_*`.

**12 Recipes:**

| Recipe | Ingredients | Pay | XP | Difficulty |
|--------|-------------|-----|-----|-----------|
| Pancakes | pancake_batter, butter, syrup | 18 | 22 | 1 |
| Waffles | waffle_batter, butter, syrup | 18 | 22 | 1 |
| Eggs & Bacon | eggs, bacon, toast | 16 | 20 | 1 |
| Hash Brown Plate | hash_browns, eggs, d_cheese | 16 | 20 | 1 |
| Full Breakfast | eggs, bacon, hash_browns, toast, butter | 28 | 38 | 3 |
| Toast & Eggs | toast, eggs, butter | 14 | 18 | 1 |
| Classic Burger | burger_patty, bun, d_lettuce, d_tomato | 20 | 25 | 1 |
| Cheeseburger | burger_patty, bun, d_cheese, d_lettuce, d_tomato | 24 | 30 | 2 |
| Hot Dog | hot_dog, bun, d_onion | 16 | 20 | 1 |
| Fries | fries | 10 | 12 | 1 |
| Milkshake | milkshake_base | 12 | 15 | 1 |
| Coffee | coffee | 10 | 12 | 1 |

**5 Customer Types:**

| Type | Party Size | Tip Mult | Weight |
|------|-----------|----------|--------|
| Regular | 1-2 | 1.0x | 35% |
| Family | 2-3 | 1.2x | 25% |
| Couple | 2 | 1.3x | 15% |
| Business | 1 | 1.5x | 15% |
| Kids | 2-3 | 0.8x | 10% |

**Service Timer Types:** Calm (90s, 40%), Feisty (60s, 40%), Rowdy (45s, 20%).

**Unique Mechanics:**

- **Party system:** Customers arrive in groups of 1-3, share a booth.
- **Ticket queue:** Diner orders can contain 1-3 items per ticket (multi-item). Player must complete all items before the ticket is done.
- **Persistent waitress NPC:** Walks between booths and pass window. Takes orders from parties that finish reading menus, generates tickets via `_generateTicket()`, tags tickets with booth/party info, delivers completed plates from a pending serve queue (`_dinerPendingServe`).
- **Waitress priority:** Serve completed orders first, then take new orders from waiting parties.
- **6 booths:** 3 left column (tx:27-32), 3 right column (tx:38-43), 4 seats each.
- **Arcade corner:** 2 arcade spots. 20% of spawns are arcade-only visitors who pay a fee (5 gold) and leave. Post-meal parties have a 20% chance to send 1-2 members to play.
- **20% arcade-only visitors:** Single NPCs who walk to the arcade, play, pay 5 gold, and leave without ordering food.

**Name Pool:** 40 names.

**Config:** Max 5 parties, max 8 customer NPCs, spawn every 5-12 sec, eat 15-20 sec, menu read 3-5 sec.

**NPC States (customers):** `spawn_wait`, `entering`, `walking`, `seating`, `menu_reading`, `waiting_at_booth`, `eating`, `post_meal`, `post_meal_wait`, `go_arcade`, `arcade_playing`, `arcade_done`, `go_arcade_only`, `arcade_only_playing`, `leaving`, `_despawn_walk`, `_despawn`.

**Waitress States:** `idle`, `walking`, `taking_order`, `submitting_ticket`, `serving`.

---

### Fine Dining (Tier 3)

**Concept:** Teppanyaki-style Japanese restaurant with table-side grilling and a trick timing mini-game.

**12 Ingredients:** fd_steak, fd_shrimp, fd_chicken, fd_rice, fd_onion, fd_egg, fd_mushroom, fd_zucchini, fd_garlic_butter, fd_soy_sauce, fd_sesame_oil, fd_miso. Entity prefix: `fding_*`.

**10 Recipes:**

| Recipe | Ingredients | Pay | XP | Diff | Tricks | Trick Diff |
|--------|-------------|-----|-----|------|--------|-----------|
| Hibachi Steak | steak, onion, garlic butter, soy sauce | 45 | 55 | 2 | 4 | 2 |
| Shrimp Teppanyaki | shrimp, garlic butter, soy sauce | 40 | 50 | 1 | 3 | 1 |
| Chicken Teriyaki | chicken, soy sauce, sesame oil | 35 | 45 | 1 | 3 | 1 |
| Volcano Fried Rice | rice, egg, onion, soy sauce, sesame oil | 50 | 65 | 2 | 5 | 2 |
| Miso Glazed Salmon | shrimp, miso, garlic butter, sesame oil | 55 | 70 | 3 | 4 | 3 |
| Garlic Butter Mushrooms | mushroom, garlic butter, soy sauce | 30 | 40 | 1 | 3 | 1 |
| Teppanyaki Combo Platter | steak, shrimp, chicken, rice, onion, garlic butter | 60 | 80 | 3 | 6 | 3 |
| Onion Volcano Special | onion, egg, rice, sesame oil | 40 | 50 | 2 | 4 | 2 |
| Steak & Zucchini | steak, zucchini, garlic butter, soy sauce | 48 | 60 | 2 | 4 | 2 |
| Mushroom Fried Rice | rice, mushroom, egg, soy sauce, sesame oil | 42 | 55 | 2 | 5 | 2 |

**6 Customer Types:**

| Type | Party Size | Tip Mult | Cover Fee | Weight |
|------|-----------|----------|----------|--------|
| Regular | 2-4 | 1.0x | $10 | 44% |
| VIP | 2-4 | 1.8x | $25 | 20% |
| Group | 4-6 | 1.0x | $10 | 20% |
| Couple | 2-2 | 1.5x | $30 | 10% |
| Critic | 2-3 | 2.0x | $40 | 1% |
| Celebrity | 2-4 | 4.0x | $100 | 5% |

**Service Timer Types:** Calm (60s, 40%), Feisty (45s, 35%), Rowdy (30s, 25%).

**Unique Mechanics:**

- **Cover fee:** Each party pays a cover fee on seating (Regular/Group $10, VIP $25, Couple $30, Critic $40, Celebrity $100), added directly to player gold.
- **Party system:** Customers arrive in groups of 2-6 (varies by type), assigned to a teppanyaki table.
- **4 teppanyaki tables:** Each with a grill entity and 4 seats. Tables have state tracking (`empty`, `seated`, `cooking`, `eating`).
- **Persistent waiter NPC:** Escorts parties from host stand to tables, takes orders, delivers food. Manages a waiter queue for multiple waiting parties.
- **Order visibility gating:** The order HUD shows "Waiter taking order..." until the waiter returns to the pass window. Controlled by `_fdOrderVisible` flag.
- **Grill station mini-game:** After collecting all ingredients, the player swings at the correct table's teppanyaki grill to start a QTE timing bar. Swing during trick zones to score Perfect/Good/Miss. See "Grill Station Mini-Game" section below.
- **Table validation:** Player must swing at the grill matching the current order's `_fdTableId`. Swinging at the wrong table shows "Wrong table! Check order."
- **Grill auto-submit:** After the grill bar completes, the order is automatically submitted for grading (no need to swing at the pickup counter).
- **Exclamation marks:** Tables show exclamation marks when waiting for the player to cook.

**Config:** Max 4 parties, spawn every 5-10 sec, eat 10-15 sec, waiter order taking 15 sec.

**NPC States (customers):** `spawn_wait`, `entering`, `at_host`, `walking_to_table`, `seated`, `waiting_cook`, `watching_cook`, `eating`, `leaving`, `walking`, `_despawn_walk`, `_despawn`.

**Waiter States:** `idle`, `walking`, `greeting`, `escorting`, `order_taking`, `submitting_ticket`, `serving`.

## Grill Station Mini-Game (Fine Dining)

The teppanyaki grill is a timing bar QTE unique to fine dining. It replaces the normal pickup counter submission.

### Flow

1. Player collects all ingredients for the current order.
2. Player swings spatula at the correct table's grill entity (`fd_teppanyaki_grill_N`).
3. `startGrillSequence(tableId, recipe)` kicks off: a timing bar appears in the HUD.
4. A cursor moves left-to-right across the bar. Colored trick zones are placed at intervals.
5. Player swings spatula while cursor is inside a trick zone.
6. **Perfect** (within 2.5% of zone center): full score for that trick.
7. **Good** (within 6% of zone center): 0.6x score for that trick.
8. **Miss** (cursor passes zone, or swing outside any zone): 0x score, combo reset.
9. After bar completes, `endGrillSequence()` calculates `trickScore` (0.0-1.0).
10. 1-second finishing pause, then auto-submits the order.

### Trick Scoring

- 6 trick types (cosmetic labels): Spatula Spin, Onion Volcano, Shrimp Toss, Egg Crack, Flame Burst, Rice Flip.
- Trick count: determined by recipe (`trickCount: 3-6`) or forced to 5 for VIP/Critic.
- Zone width: base 8% of bar, scaled by difficulty (1.0x/0.8x/0.6x for difficulty 1/2/3).
- Bar duration: 480 frames (diff 1) to 300 frames (diff 3). VIP/Critic fixed at 300 frames.
- Combo: consecutive hits give +15% per hit, max 2.5x multiplier. Miss resets combo.

### Customer Type Overrides

- **VIP:** Needs 3+ of 5 hits for bonus. If met: +50% tips, +20% pay on top of normal grade.
- **Critic:** ALL tricks must be Perfect or Good. Any miss = automatic F grade, party leaves immediately, counts as missed order.

### Grade Blending

For fine dining orders, the final grade uses a blended score:
```
blendedScore = quality * 0.4 + trickScore * 0.4 + timeScore * 0.2
```
Both quality and time thresholds use this blended value.

### Config (FD_GRILL_CONFIG)

| Key | Value | Description |
|-----|-------|-------------|
| `barDuration` | [300, 480] | Frame range for bar speed (by difficulty) |
| `perfectWindow` | 0.025 | +/-2.5% of bar for Perfect |
| `goodWindow` | 0.06 | +/-6% of bar for Good |
| `trickZoneWidth` | 0.08 | Each zone is 8% of bar width (before difficulty scaling) |
| `comboBonus` | 0.15 | +15% per consecutive hit |
| `maxComboMult` | 2.5 | Maximum combo multiplier |
| `missComboReset` | true | Miss resets combo to 0 |
| `finishDelay` | 60 | 1 sec pause after bar ends |
| `vipCriticBarDuration` | 300 | Fixed 5 sec for VIP/Critic |
| `vipCriticTrickCount` | 5 | Always 5 tricks for VIP/Critic |

## Order Assembly

1. Each recipe has an ingredient list (e.g., Classic Sub = bread, turkey, lettuce, tomato, mayo).
2. Player swings spatula at ingredient entities placed in the level.
3. Each swing adds the ingredient to `cookingState.assembly[]`.
4. If the player already has enough of that ingredient for the recipe, swing shows "Don't need X!".
5. Swinging at the counter entity (`deli_counter`, `diner_counter`, `fd_counter`) clears the assembly.
6. Swinging at the pickup counter (`pickup_counter`, `diner_pickup_counter`, `fd_pickup_counter`) submits for grading.
7. Fine dining: swinging at a teppanyaki grill with full assembly starts the grill QTE instead of manual submission.

## Grading Formula

```
qualityScore = (correctIngredients / totalRequired) - (extraWrong * 0.1)
timeScore    = 1.0 - (serviceTimer / serviceDuration)
```

Quality uses **set-based matching** (ingredient order does NOT matter). Counts how many of each ingredient match, penalizes extras at -10% each.

For fine dining, scoring is blended with trickScore (see "Grill Station Mini-Game" above).

### Grade Thresholds

| Grade | Min Quality | Min Time | Pay Mult | Tip Mult | XP Mult | Color |
|-------|------------|----------|----------|----------|---------|-------|
| S | 1.0 | 0.5 | 1.0x | 1.5x | 2.0x | Gold |
| A | 0.85 | 0.3 | 0.9x | 1.3x | 1.5x | Green |
| B | 0.6 | 0.15 | 0.75x | 1.0x | 1.0x | Blue |
| C | 0.4 | 0.0 | 0.5x | 0.5x | 0.5x | Gray |
| F | 0.0 | 0.0 | 0.25x | 0.0x | 0.25x | Red |

### Tip Calculation

```
rawTip = pay * 0.2 * grade.tipMult * customer.tipMult * comboMultiplier
```

Gold (pay + tips combined) is awarded directly on submission. No separate tip jar collection.

## Combo System

- Consecutive S or A grades increment `comboCount`.
- Combo tip bonus only activates after reaching `comboThreshold` (3 consecutive S/A grades).
- Tip bonus: `1.0 + min(comboCount * 0.2, 1.0)` (max 2x tips at 5+ combo).
- An F grade resets the combo to 0.
- B and C grades do NOT reset the combo (they just don't increment it).

## Ticket Queue System

Orders auto-generate independently of NPC behavior via a ticket queue:

- `orderSpawnDelay`: 30 frames (0.5 second) initial delay before first order spawns.
- `ticketSpawnInterval`: 60 frames (1 second) between ticket generations.
- `ticketQueueMax`: 3 maximum queued tickets.
- When no active order exists, the next ticket pops from the queue and becomes the current order.
- Diner tickets contain 1-3 items; deli and fine dining tickets contain 1 item each.
- Diner and fine dining tickets are tagged with booth/table and party IDs so that completed orders are routed to the correct waitress/waiter for delivery.

## Service Timer Types

Each restaurant has its own timer type pool. A timer type is randomly assigned when a ticket is generated. The timer determines how long the player has to complete the order before it auto-fails.

| Restaurant | Timer Type | Duration | Weight |
|-----------|-----------|----------|--------|
| Deli | Patient | 60s | 50% |
| Deli | Busy | 30s | 35% |
| Deli | Urgent | 15s | 15% |
| Diner | Calm | 90s | 40% |
| Diner | Feisty | 60s | 40% |
| Diner | Rowdy | 45s | 20% |
| Fine Dining | Calm | 60s | 40% |
| Fine Dining | Feisty | 45s | 35% |
| Fine Dining | Rowdy | 30s | 25% |

The HUD shows a green-to-yellow-to-red timer bar that interpolates based on remaining time.

## NPC Lifecycle (Shared States)

All restaurants share these base states via `cookingNPCBase.js`:

| State | Description |
|-------|-------------|
| `spawn_wait` | Staggered delay before entering |
| `entering` | Walking from spawn/exit to first destination |
| `walking` | Following a route, transitions to `_nextState` when done |
| `_despawn_walk` | Walking to exit, then despawn |
| `_despawn` | Remove NPC from list |

### Deli-Specific States

| State | Description |
|-------|-------------|
| `in_queue` | Standing in queue line, waiting for turn |
| `ordering` | At counter (queue spot 0), waiting for order to be linked |
| `waiting_food` | Order linked, waiting for player to cook |
| `pickup_food` | Got food, brief pause before going to eat |
| `at_condiments` | Using condiment station (5-8 sec) |
| `eating` | Sitting at dining chair eating (15 sec) |
| `shopping_aisle` | Browsing grocery aisle (meal customers post-eat) |
| `browsing_shelf` | Retail shopper at shelf (8-15 sec) |
| `at_cashier` | Retail shopper paying at cashier |

### Diner-Specific States

| State | Description |
|-------|-------------|
| `seating` | Walking to individual booth seat |
| `menu_reading` | Reading menu at seat (3-5 sec), sets party flag for waitress |
| `waiting_at_booth` | Waiting for waitress to take order / for food |
| `eating` | Eating at booth (15-20 sec) |
| `post_meal` | Deciding post-meal behavior (leader decides for party) |
| `post_meal_wait` | Waiting at booth for arcade players to return |
| `go_arcade` | Walking to arcade cabinet (post-meal) |
| `arcade_playing` | Playing arcade (5-10 sec) |
| `arcade_done` | Finished arcade, rejoining party |
| `go_arcade_only` | Arcade-only visitor walking to arcade |
| `arcade_only_playing` | Arcade-only visitor playing |
| `leaving` | Walking to exit |

### Fine Dining-Specific States

| State | Description |
|-------|-------------|
| `at_host` | Pausing at host stand, cover fee charged |
| `walking_to_table` | Walking to assigned teppanyaki table seat |
| `seated` | At seat, waiting for waiter to take order |
| `waiting_cook` | Order active, waiting for player to cook at their table |
| `watching_cook` | Player is actively cooking at their table's grill |
| `eating` | Eating at seat (10-15 sec) |
| `leaving` | Walking to exit |

## Cooking Skill XP

Orders award Cooking XP via `addSkillXP('Cooking', xp)`. XP is calculated as `recipe.baseXP * grade.xpMult`. Lifetime cooking stats are tracked separately in `skillData['Cooking']`. Per-session stats are in `cookingState.stats` and reset on exit.

## Key Functions & Entry Points

### cookingSystem.js

| Function | Description |
|----------|-------------|
| `startCookingShift(restaurantId)` | Save weapon, equip spatula, reset state, set active |
| `endCookingShift()` | Deactivate session, clear orders, reset grill state |
| `resetCookingState()` | Full cleanup: remove spatula, restore weapon, reset all state |
| `updateCooking()` | Per-frame: auto-start, ticket generation, order activation, mood/timer updates, spatula hit detection, timeout handling |
| `handleStationInteract(entityType)` | Routes spatula hits: ingredient add, counter clear, pickup submit, grill start |
| `gradeOrder()` | Calculate quality + time scores, determine grade, compute pay/tip/xp |
| `applyOrderResult(result)` | Update stats, award gold/xp, combo tracking, route to waitress/waiter/NPC |
| `drawCookingHUD()` | Render order panel, timer bar, combo counter, stats line, result popup |

### cookingNPCBase.js

| Function | Description |
|----------|-------------|
| `_cCreateNPC(...)` | Factory for base NPC with shared fields |
| `_cStartRoute(...)` | Begin route-following with transition state |
| `_cMoveNPC(npc, cfg)` | Movement with avoidance, kitchen restriction, wall checks |
| `_cRecoverNPC(npc, cfg)` | Attempt stuck NPC recovery from saved route intent |
| `_cSpawnTick(...)` | Generic spawn interval management |
| `_cUpdateNPCLoop(loopCfg)` | Shared per-frame update loop |
| `_cCleanupParties(...)` | Remove parties with all members despawned |

### Per-Restaurant Init/Update

| Restaurant | Init | Update | NPC Array |
|-----------|------|--------|-----------|
| Deli | `initDeliNPCs()` | `updateDeliNPCs()` | `deliNPCs[]` |
| Diner | `initDinerNPCs()` | `updateDinerNPCs()` | `dinerNPCs[]`, `dinerParties[]` |
| Fine Dining | `initFineDiningNPCs()` | `updateFineDiningNPCs()` | `fineDiningNPCs[]`, `fineDiningParties[]` |

### fineDiningGrill.js

| Function | Description |
|----------|-------------|
| `startGrillSequence(tableId, recipe)` | Begin QTE timing bar |
| `updateGrill()` | Per-frame cursor advance, auto-miss detection |
| `_checkTrickHit()` | Evaluate spatula swing during active grill |
| `endGrillSequence()` | Calculate final trick score, enter finishing phase |
| `resetGrillState()` | Full grill state reset |
| `drawGrillHUD()` | Render timing bar, trick zones, cursor, stats |

## Data Structures

### COOKING_SHOPS
```js
{ id, name, tier, levelReq, ordersReq, costReq, maxOrderBase, levelId }
```

### Recipe
```js
{ id, name, ingredients: string[], basePay, baseXP, difficulty }
// Fine dining adds: trickCount, trickDifficulty
```

### Customer Type (varies by restaurant)
```js
// Deli:
{ id, name, tipMult, moodSpeed, patience, color, weight }

// Diner:
{ type, partySize: [min, max], tipMult, moodSpeed, patience, weight }

// Fine Dining:
{ type, partySize: [min, max], tipMult, moodSpeed, patience, coverFee, weight }
```

### NPC Config
```js
{
  maxNPCs/maxParties, spawnInterval: [min, max],
  baseSpeed, speedVariance,
  eatDuration: [min, max], browseDuration: [min, max],
  // Restaurant-specific fields...
}
```

### Service Timer Type
```js
{ id, label, duration, weight }
```

## Connections to Other Systems

- **Melee System** — The spatula is auto-equipped as a melee weapon (`special: 'spatula'`). Station interaction is detected via `melee.swinging` during `updateCooking()`. The player's original weapon is saved/restored on session start/end.
- **Inventory System** — Spatula is added/removed from inventory. Uses `createItem()`, `addToInventory()`, `equipItem()`, `isInInventory()`.
- **Input System** — Melee swing input triggers station/grill detection. Grill QTE intercepts swings during active grill sequences.
- **Skill XP** — Awards Cooking XP via `addSkillXP('Cooking', xp)`.
- **Scene System** — Auto-starts session when `Scene.inCooking` becomes true. `resetCookingState()` called on scene exit.
- **Level Entities** — Ingredient and station entities are placed in each restaurant's level and detected by proximity during spatula swings.
- **Draw System** — `drawCookingHUD()` renders order panel, timer bar, combo counter, stats bar. `drawGrillHUD()` renders the grill timing bar (fine dining).
- **Gold System** — Pay + tips combined go directly to `gold`. Cover fees (fine dining) also go directly to `gold`. Aisle purchases (deli) add to `gold`.
- **Cooking Progress** — `cookingProgress.lifetimeOrdersTotal` and `cookingProgress.lifetimeOrdersByShop[shopId]` track lifetime stats for unlocking higher-tier restaurants.

## Gotchas & Rules

- **`tipMult` not `tipMultiplier`**: Customer type objects use the field name `tipMult`. Grade thresholds also use `tipMult`. Using `tipMultiplier` anywhere will silently produce `undefined`. Always check field name consistency.
- **Equip sync**: The spatula is a real melee weapon (1 damage, 80 range, 20 cooldown, 0 critChance) added to inventory. Leaving a restaurant without `resetCookingState()` would leave the player holding a spatula. The system saves/restores `_savedMeleeEquip` and `_savedActiveSlot`.
- **Grill auto-submit**: Fine dining orders auto-submit after the grill bar finishes. The player does NOT need to swing at the pickup counter. Swinging at `fd_pickup_counter` also works as a fallback.
- **Grill trick score bleed**: `grillState.trickScore` is reset to 0 after `applyOrderResult()` to prevent the previous order's trick score from affecting the next order's grade.
- **Table validation**: In fine dining, swinging at a grill entity checks `_fdTableId` on the current order. Wrong table shows an error message.
- **Order visibility gating**: Fine dining hides the order HUD until the waiter returns to the pass window (`_fdOrderVisible`). Shows "Waiter taking order..." placeholder instead.
- **Multi-item tickets (diner)**: Diner tickets can have 1-3 items. `cookingState.ticket.completedCount` tracks progress. The order is not finished until all items are served.
- **Pending serve queues**: Diner and fine dining use `_dinerPendingServe` and `_fdPendingServe` arrays. Completed orders are pushed here for the waitress/waiter to pick up and deliver.
- **Waitress/waiter are never despawned**: The persistent NPCs have special-case handling in `onIdleTimeout`, `onStuckTimeout`, and `onDespawn` to prevent removal.
- **Kitchen zone restriction**: Each restaurant defines its own kitchen zone check function. NPCs that enter the kitchen are teleported to a safe position.
- **Route intent system**: Diner and fine dining NPCs save a `_routeIntent` object when starting routes. If the NPC gets stuck, `_cRecoverNPC()` can rebuild the route from the saved intent.
- **Set-based ingredient matching**: Quality scoring counts ingredients by type (order does NOT matter). This is a change from the original position-based matching documented in earlier versions.
- **Continuous sessions**: There is no shift timer. Sessions run until the player leaves. The old shift-based system with `shiftTimer`, `shiftDuration`, and end-of-shift overlay has been removed.
- **`_swingHandled` flag**: Ensures each melee swing only triggers one station interaction per swing animation, preventing double-hits.
- **`resetGrillState()`**: Called both in `endCookingShift()` and `resetCookingState()` to ensure no grill state bleeds between sessions.
