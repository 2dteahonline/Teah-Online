# Cooking System

## Overview
A timed shift-based minigame where the player runs a deli, assembling sandwich orders for NPC customers by swinging a spatula at ingredient stations. Orders are graded on ingredient accuracy and speed (S/A/B/C/F), awarding gold, tips, and Cooking XP. Customer NPCs autonomously walk in, queue up, order food, sit down to eat, browse store aisles, tip, and leave. A 5-minute shift timer and optional rush hour mode add pressure. Currently only the Street Deli (tier 1) is implemented; 4 higher-tier restaurants are defined for future use.

## Files
- `js/shared/cookingData.js` — Shop definitions (5 tiers), 14 ingredients, 11 recipes, 3 customer types, mood stages, grade thresholds, timing config, spatula weapon definition, helper functions
- `js/authority/cookingSystem.js` — Shift lifecycle, order spawning, station interaction (spatula-based), grading formula, result application, combo tracking, HUD rendering, shift-end overlay
- `js/authority/deliNPCSystem.js` — Customer NPC AI: appearance pool, waypoint routing, queue management, 15+ AI states, emoji mood bubbles, spawn/despawn lifecycle

## Key Functions & Globals

### Cooking State
- `cookingState` — Global state object:
  - `active` — Whether a shift is in progress.
  - `shopId` — Currently `'street_deli'`.
  - `shiftTimer` / `shiftDuration` — Current frame count vs. max (18000 frames / 5 min).
  - `assembly[]` — Ingredient IDs the player has added so far for the current order.
  - `currentOrder` — `{ id, recipe, customer, moodTimer, mood, moodStageIdx, moodThresholds, npcId }`.
  - `comboCount` / `comboMultiplier` — Consecutive S/A grades boost tip multiplier.
  - `rushActive` — True after 15 completed orders; speeds up mood decay and order spawning.
  - `shiftEnded` / `shiftComplete` — End-of-shift overlay flags.
  - `tipJar` — Accumulated tips the player must collect by swinging at the tip jar entity.
  - `stats` — Per-shift: `{ ordersCompleted, perfectDishes, totalEarned, totalTips, totalXP, grades: { S, A, B, C, F } }`.
  - `lastResult` / `lastResultTimer` — Last graded order for popup display.
- `_savedMeleeEquip` / `_savedActiveSlot` — Saved weapon state restored when leaving the deli.

### Deli NPC State
- `deliNPCs[]` — Array of active customer NPC objects.
- `DELI_NPC_AI` — Object of 15+ state handler functions (entering, in_queue, ordering, waiting_food, pickup_food, eating, shopping_aisle, tipping, etc.).
- `QUEUE_SPOTS` — 6-slot queue line (vertical at tx:11, ty:22-27).
- `DELI_CHAIRS` — 32 chair positions across 4 dining tables.
- `DELI_AISLES` — 6 aisle browse spots with purchasable items (Frozen, Snacks, Drinks, Cookies, Soups, Dairy).
- `DELI_SPOTS` — Named waypoints (exit, counter, tipJar, corridorE, diningEntry, condiments).

### Data Constants
- `COOKING_SHOPS` — 5 shop tiers: Street Deli (Lv.1), Family Restaurant (Lv.10), Fine Dining (Lv.20), Luxury (Lv.35), 5 Star Elite (Lv.50). Only Street Deli has a `levelId`.
- `DELI_INGREDIENTS` — 14 ingredients: bread, bagel, turkey, chicken, ham, salami, lettuce, tomato, cheese, onion, mayo, ketchup, mustard, ranch. Each maps to an entity type (`ing_bread`, etc.).
- `ENTITY_TO_INGREDIENT` — Reverse lookup: entity type string to ingredient ID.
- `DELI_RECIPES` — 11 sandwich recipes with ordered ingredient lists, basePay (10-22g), baseXP (12-32), difficulty (1-3).
- `CUSTOMER_TYPES` — 3 types: Regular (55% weight, 1.0x tip, 0.7x mood speed, 1.2x patience), Generous (30%, 1.8x tip, 0.5x speed, 1.5x patience), Impatient (15%, 0.6x tip, 1.0x speed, 0.9x patience).
- `MOOD_STAGES` — 3 stages: Patient (60s), Concerned (+40s), Furious (+50s). Thresholds scaled by customer patience.
- `COOKING_GRADES` — S/A/B/C/F with quality and time thresholds, pay/tip/XP multipliers.
- `COOKING_CONFIG` — Shift duration (18000 frames/5 min), order spawn delay (180 frames/3s), combo threshold (3), rush starts after 15 orders, rush mood speed mult (1.15x), rush order delay mult (0.75x).
- `SPATULA_WEAPON` — `{ id: 'spatula', damage: 1, range: 80, cooldown: 20, special: 'spatula' }`.

### Core Functions (cookingSystem.js)
- `startCookingShift()` — Saves current weapon, equips spatula (auto-added to inventory if needed), resets all shift state.
- `endCookingShift()` — Sets `shiftEnded` and `shiftComplete`, clears order/assembly.
- `resetCookingState()` — Called on scene exit. Removes spatula, re-equips saved weapon, resets all state.
- `spawnOrder()` — Picks random recipe and customer type, creates order object with mood thresholds, links to a waiting NPC at the counter.
- `updateCooking()` — Per-frame update. Auto-starts shift on deli entry. Advances shift timer, checks rush mode, ticks mood timer (customer gets angrier over time), handles spatula hit detection against ingredient entities and station entities, auto-fails order if customer leaves.
- `handleStationInteract(entityType)` — Routes interactions:
  - Ingredient entity (`ing_*`) -> adds ingredient to assembly (if recipe needs more of it).
  - `deli_counter` -> clears assembly (reset plate).
  - `pickup_counter` -> submits order for grading.
  - `tip_jar` -> collects accumulated tips.
- `gradeOrder()` — Scoring formula: quality score (correct ingredients in correct order, penalized for extras) and time score (% of total mood time remaining). Maps to S/A/B/C/F grade.
- `applyOrderResult(result)` — Updates stats, awards gold (pay directly, tips to jar), awards Cooking XP, updates combo, notifies linked NPC, schedules next order.

### Core Functions (deliNPCSystem.js)
- `spawnDeliNPC()` — Creates NPC with random appearance, name, speed variance, patience range. Spawns at exit tile.
- `initDeliNPCs()` — Clears all NPCs and resets spawn timer.
- `updateDeliNPCs()` — Per-frame: manages spawn intervals (5-15s between customers, max 12 NPCs), runs each NPC's state handler from `DELI_NPC_AI`, updates emoji mood bubbles, handles route-based movement, despawns NPCs.
- `moveDeliNPC(npc)` — Route-following movement: walks toward `route[0]` waypoint, snaps when close, advances to next. Includes NPC-NPC separation push (queue NPCs only push vertically to stay in line).
- `_advanceQueue()` — When front-of-line NPC leaves, all queued NPCs move forward one slot.

### Route Builders (deliNPCSystem.js)
Pre-built route generators return arrays of `{tx, ty}` waypoints for straight-line walking:
- `_routeCounterToChair(chairIdx)` — Counter to dining chair via safe corridors.
- `_routeCounterToCondiments()` — Counter to condiment station.
- `_routeChairToAisle(chairIdx, aisle)` — Chair to shopping aisle via nearest gap.
- `_routeCounterToAisle(aisle)` — Counter to aisle, routing around shelf rows.
- `_routeAisleToAisle(fromTX, fromTY, toAisle)` — Between aisles using nearest shelf gap.
- `_routeToExit(fromTX, fromTY)` — Any position to exit, via safe corridors.
- `_routeToTipJar(fromTX, fromTY)` — Any position to tip jar.

## How It Works

### Shift Flow
1. Player enters the deli scene (`Scene.inCooking` becomes true).
2. `startCookingShift()` auto-fires: saves weapon, equips spatula, starts 5-minute timer.
3. First customer NPC walks in from exit, joins queue, reaches counter -> `spawnOrder()` creates order.
4. Player runs between ingredient stations swinging spatula to collect ingredients in order.
5. Player swings at `pickup_counter` to submit -> `gradeOrder()` scores it -> gold/tips/XP awarded.
6. Next customer orders. Cycle repeats until shift timer expires.
7. `endCookingShift()` triggers -> shift-end overlay shows stats. Press interact to dismiss.
8. On scene exit, `resetCookingState()` restores original weapon.

### Order Assembly
- Each recipe has an ordered ingredient list (e.g., Classic Sub = bread, turkey, lettuce, tomato, mayo).
- Player swings spatula at ingredient entities (`ing_bread`, `ing_turkey`, etc.) placed in the deli level.
- Each swing adds the ingredient to `cookingState.assembly[]`.
- If the player already has enough of that ingredient for the recipe, swing shows "Don't need X!".
- Swinging at `deli_counter` clears the assembly (starts over).
- Swinging at `pickup_counter` submits for grading.

### Grading Formula
```
qualityScore = (correctInOrder / totalRequired) - (extraWrong * 0.1)
timeScore    = 1.0 - (moodTimer / totalMoodTime)

S: quality >= 1.0  AND  time >= 0.5   -> 1.0x pay, 1.5x tip, 2.0x XP
A: quality >= 0.85 AND  time >= 0.3   -> 0.9x pay, 1.3x tip, 1.5x XP
B: quality >= 0.6  AND  time >= 0.15  -> 0.75x pay, 1.0x tip, 1.0x XP
C: quality >= 0.4                     -> 0.5x pay, 0.5x tip, 0.5x XP
F: anything else (or customer left)   -> 0.25x pay, 0x tip, 0.25x XP
```

Quality scoring checks ingredients in order -- `assembly[i] === recipe.ingredients[i]`. Extra wrong ingredients penalize by -10% each.

### Combo System
- Consecutive S or A grades increment `comboCount`.
- Tip multiplier: `1.0 + min(comboCount * 0.2, 1.0)` (max 2x tips at 5+ combo).
- An F grade resets the combo to 0.

### Rush Hour
- Triggers after 15 completed orders.
- Mood decays 15% faster (`rushMoodSpeedMult: 1.15`).
- Orders spawn 25% faster (`rushOrderDelayMult: 0.75`).
- "RUSH HOUR!" indicator appears on HUD.

### Customer NPC Lifecycle
1. **Spawn** at exit tile (tx:13, ty:27), walk north.
2. **Pre-queue browse** (30% chance): browse an aisle before joining queue.
3. **Queue** at next available slot (6 max). Face north. May leave mid-queue if stuck at position 3+.
4. **Order** when reaching front of line. `spawnOrder()` links NPC to cooking order.
5. **Wait for food**. Gets increasingly impatient (emoji mood bubbles based on wait/patience ratio).
6. **Pick up food** when `applyOrderResult()` fires. Advance queue for others.
7. **Condiments** (50% chance): visit condiment station (5-8s).
8. **Eat** at claimed dining chair (30-50s).
9. **Browse aisles** (70% chance after eating): visit 1-3 aisle spots, may purchase items ($3-4 each).
10. **Tip** (40% chance): walk to tip jar, add $1-5 to `cookingState.tipJar`.
11. **Leave**: walk to exit, despawn.

### NPC Mood Bubbles
Based on `waitFrames / patienceMax` ratio while in queue:
- < 0.3: S grade (happy, no bubble)
- 0.3-0.6: A/B (mild, occasional smiley every 8-12s)
- 0.6-0.8: C (annoyed face every 6-8s)
- 0.8-0.9: near-F (angry face every 3-5s)
- > 0.9: F (furious face every 2-4s)

### Customer Mood Stages (Order Timer)
| Stage | Duration | Effect |
|-------|----------|--------|
| Patient | 60s * patience | Green mood bar |
| Concerned | +40s * patience | Yellow mood bar |
| Furious | +50s * patience | Red mood bar, then customer leaves (auto F) |

Customer patience multipliers: Regular 1.2x, Generous 1.5x, Impatient 0.9x.

### Recipes (11 total)

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

## Connections to Other Systems
- **Melee System** — The spatula is auto-equipped as a melee weapon (`special: 'spatula'`). Station interaction is detected via `melee.swinging` during `updateCooking()`. The player's original weapon is saved/restored on shift start/end.
- **Inventory System** — Spatula is added/removed from inventory. Uses `createItem()`, `addToInventory()`, `equipItem()`, `isInInventory()`.
- **Input System** — Reads `InputIntent.interactPressed` to dismiss shift-end overlay. Melee swing input triggers station detection.
- **Skill XP** — Awards Cooking XP via `addSkillXP('Cooking', xp)`.
- **Scene System** — Auto-starts shift when `Scene.inCooking` becomes true. `resetCookingState()` called on scene exit.
- **Level Entities** — Ingredient and station entities (`ing_bread`, `deli_counter`, `pickup_counter`, `tip_jar`) are placed in the deli level and detected by proximity during spatula swings.
- **Draw System** — `drawCookingHUD()` renders shift timer, order panel, combo counter, rush indicator, last result popup, and stats bar. `drawShiftEndOverlay()` shows the end-of-shift summary.
- **Gold System** — Order pay goes directly to `gold`. Tips go to `cookingState.tipJar` (collected by swinging at tip jar). Aisle purchases by NPCs also add to `gold`.

## Gotchas & Rules
- The spatula is a real melee weapon (1 damage, 80 range) that gets added to inventory and equipped. Leaving the deli without going through `resetCookingState()` would leave the player holding a spatula.
- Ingredient order matters for grading. The assembly is compared position-by-position against the recipe's ingredient list. Out-of-order ingredients count as wrong.
- Tips accumulate in `cookingState.tipJar` and are NOT auto-collected. The player must swing at the `tip_jar` entity to collect them.
- NPC customers can also generate revenue by purchasing aisle items ($3-4 each). This gold goes directly to the player, not the tip jar.
- The shift auto-starts when entering the deli. There is no manual start -- `startCookingShift()` fires automatically on the first frame `Scene.inCooking` is true (and shift hasn't already ended).
- If the customer's mood runs out completely (all three stages expire), the order auto-fails with an F grade.
- NPC routing uses pre-defined waypoints and straight-line movement -- there is no pathfinding. All routes follow safe corridors to avoid clipping through walls and shelves.
- Queue management: NPCs at position 3+ in line have a small per-frame chance (0.1%) to leave and browse aisles instead, then rejoin later.
- Max 12 NPCs in the deli at once. New customers spawn every 5-15 seconds.
- `cookingState.stats` is per-shift only and resets on `resetCookingState()`. Lifetime cooking stats are tracked in `skillData['Cooking']`.
- The `_swingHandled` flag ensures each melee swing only triggers one station interaction (prevents double-hits from a single swing animation).
- Four higher-tier restaurants (Family Restaurant through 5 Star Elite) are defined in `COOKING_SHOPS` but have `levelId: null` -- they are not yet implemented.
