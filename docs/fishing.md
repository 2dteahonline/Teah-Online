# Fishing System

## Overview
A multi-phase minigame where the player equips a fishing rod, casts near a fishing spot, waits for a bite, then reels in fish using a tension-based mechanic. Fish are caught as stackable inventory items and can be sold at the Fish Vendor for gold. The system awards Fishing XP, tracks lifetime stats, and gates rod/fish access behind skill levels and rod tiers.

## Files
- `js/shared/fishingData.js` — Rod tiers, fish species, timing config, spawn table helpers, catch chance formula
- `js/authority/fishingSystem.js` — State machine, cast/reel logic, fish vendor panel, sell/buy handlers, HUD rendering, world-space visual effects (bobber, line, swimming fish)

## Key Functions & Globals

### State
- `fishingState` — Global state object holding phase, timers, tension/progress, target fish, bait count, bobber position, and persisted stats (`totalCaught`, `biggestFish`, `biggestFishValue`, `totalCasts`).
- `fishingState.baitCount` — Worm bait count (starts at 10, overwritten by save/load if save exists).

### Data Constants
- `ROD_TIERS` — Array of 4 rod definitions (Bronze, Iron, Gold, Mythic). Each has `id`, `tier`, `levelReq`, `cost`, `durability`, `strength`, `catchBonus`, `damage`, `range`, `cooldown`, `critChance`. Rods double as melee weapons with `special: 'fishing'`.
- `FISH_SPECIES` — Object of 6 fish (Sardine, Bass, Salmon, Tuna, Swordfish, Golden Leviathan). Each has `rarity` (spawn weight), `sellPrice`, `difficulty` (0-1), `minRodTier`, `xp`, `weight`, `color`.
- `FISHING_CONFIG` — All timing and tuning constants (frame counts at 60fps): cast duration, wait range, bite window, reel duration range, tension rates, sweet spot bounds, catch threshold, level bonus cap, max line distance, overweight penalty.

### Core Functions
- `startFishingCast()` — Triggered from `meleeSwing()` near a `fishing_spot`. Checks rod durability and bait, consumes 1 bait and 1 durability, calculates bobber position from player facing direction and rod tier.
- `updateFishing()` — Per-frame state machine. Runs the 7-phase loop: idle, casting, waiting, bite, reeling, result, cooldown.
- `cancelFishing()` — Hard reset to idle (called when line snaps from distance).
- `awardFish(fish)` — Creates a stackable `fish_<id>` consumable item, adds to inventory, awards Fishing XP, updates stats.

### Data Helpers
- `getFishingSpawnTable(rodTier)` — Returns `[{ fish, weight }]` filtered by `minRodTier <= rodTier`.
- `pickRandomFish(rodTier)` — Weighted random selection from the spawn table.
- `calculateCatchChance(fish, rod, fishingLevel)` — Formula: `baseCatch + rodBonus + levelBonus - overweightPenalty`, clamped to [0.05, 0.95].

### Equipment Helpers
- `getEquippedRod()` — Returns `playerEquip.melee` if its `special === 'fishing'`, else null.
- `getRodInventoryItem()` — Finds the rod's inventory entry (for durability tracking via `findInventoryItemById()`).

### Vendor
- `getFishVendorBuyItems()` — Builds buy list: bait packs (10 worms for 20g) + rods gated by Fishing level. Uses `PROG_ITEMS` for pricing if available, falls back to `ROD_TIERS.cost`.
- `getFishInventoryItems()` — Scans inventory for items with `data.isFish === true`.
- `sellFish(slot)` / `sellAllFish()` — Sells fish from inventory for their `sellPrice`, decrements stack or removes.
- `drawFishVendorPanel()` / `handleFishVendorClick(mx, my)` — Two-tab vendor UI (Buy / Sell) opened via `UI.isOpen('fishVendor')`.

### Rendering
- `drawFishingWorldEffects()` — Called inside `ctx.save/translate` block in `draw.js`. Draws fishing line (bezier curve), bobber with water ripples, swimming fish approaching bobber, and bite indicator ("!" + splash).
- `drawFishingHUD()` — Screen-space HUD showing phase-appropriate feedback: casting bar, waiting dots, bite prompt, tension + reel progress bars during reeling, result message, rod durability, bait count.

## How It Works

### Cast/Reel Flow (7 phases)
1. **idle** — Player is not fishing.
2. **casting** (60 frames / 1s) — Animation plays. Bobber landing position calculated: `player position + facing direction * (80 + tier * 10)` pixels.
3. **waiting** (3-8s random) — Bobber sits in water. A target fish is pre-picked via `pickRandomFish(rodTier)`. At ~40% time remaining, a fish sprite spawns 100-140px away and lerps toward the bobber.
4. **bite** (120 frames / 2s window) — Yellow "!" appears above bobber. Player must press SPACE (`InputIntent.reelPressed`) within this window or the fish escapes.
5. **reeling** (1-2s scaled by fish difficulty) — Tension minigame:
   - Holding SPACE fills tension at `+0.012/frame`, releasing decays at `-0.008/frame`.
   - Sweet spot: tension between 0.2 and 0.85 grants reel progress.
   - Progress gains: `0.012 + (1 - difficulty) * 0.006` per frame in sweet spot; fish fights back at `difficulty * 0.0015` per frame.
   - Tension hits 1.0 = line snaps (fail).
   - Progress reaches 0.45 threshold = catch chance roll: `(1 - difficulty) + rodBonus + levelBonus - overweightPenalty`.
   - Timer expires = fish escapes.
6. **result** (30 frames / 0.5s) — Shows "Caught X!" or failure message. Checks if rod broke (durability 0).
7. **cooldown** (60 frames / 1s) — Rest period before next cast.

### Line Snap Safety
During all active phases (except result/cooldown), if the player walks more than 160px from the bobber, the line snaps and fishing is cancelled.

### Fish Species Table

| Fish | Rarity | Sell | Difficulty | Min Rod | XP | Weight |
|------|--------|------|------------|---------|-----|--------|
| Sardine | 40 | 3g | 0.20 | Bronze | 5 | 1 |
| Bass | 25 | 8g | 0.35 | Bronze | 10 | 2 |
| Salmon | 18 | 15g | 0.50 | Iron | 18 | 2 |
| Tuna | 10 | 25g | 0.65 | Iron | 30 | 3 |
| Swordfish | 5 | 50g | 0.80 | Gold | 50 | 4 |
| Golden Leviathan | 2 | 120g | 0.95 | Mythic | 100 | 5 |

### Rod Tiers Table

| Rod | Tier | Level Req | Cost | Durability | Strength | Catch Bonus |
|-----|------|-----------|------|------------|----------|-------------|
| Bronze Rod | 0 | 1 | 20g | 25 | 1 | +0% |
| Iron Rod | 1 | 5 | 80g | 40 | 2 | +10% |
| Gold Rod | 2 | 12 | 200g | 60 | 3 | +20% |
| Mythic Rod | 3 | 25 | 500g | 100 | 5 | +35% |

### Catch Chance Formula
```
baseCatch     = 1.0 - fish.difficulty
rodBonus      = rod.catchBonus
levelBonus    = min(0.25, fishingLevel * 0.005)
overweight    = max(0, fish.weight - rod.strength) * 0.25
finalCatch    = clamp(baseCatch + rodBonus + levelBonus - overweight, 0.05, 0.95)
```

### Persisted Stats
Saved via `saveLoad.js`: `fishingState.stats` (`totalCaught`, `biggestFish`, `biggestFishValue`, `totalCasts`) and `fishingState.baitCount`.

## Connections to Other Systems
- **Melee System** — `startFishingCast()` is called from `meleeSwing()` when the equipped weapon has `special: 'fishing'` and the player is near a `fishing_spot` entity.
- **Input System** — Reads `InputIntent.reelPressed` (bite phase) and `InputIntent.reelHeld` (reeling phase) for SPACE key.
- **Inventory System** — Fish are stackable consumable items (`createConsumable()`). Rods are melee items with durability tracked via `findInventoryItemById()`.
- **Progression System** — Rod vendor uses `PROG_ITEMS` and `createProgressedItem()` when available (5-tier progression).
- **Skill XP** — Awards Fishing XP via `addSkillXP('Fishing', xp)`. Rod vendor gates by `skillData['Fishing'].level`.
- **Save/Load** — `fishingState.stats` and `fishingState.baitCount` are persisted. Rod durability is tracked on the inventory item's `data.currentDurability`.
- **Draw System** — `drawFishingWorldEffects()` is called from `draw.js` in the world-space translated context. `drawFishingHUD()` is called from the screen-space HUD pass.
- **UI Panel System** — Fish Vendor opens via `UI.isOpen('fishVendor')`, click handling via `handleFishVendorClick()`.

## Gotchas & Rules
- Rods are melee weapons (they have damage, range, cooldown, critChance) and can be used for combat. The `special: 'fishing'` property is what makes them function as rods.
- Bait is consumed at cast time (not on catch), so failed attempts still cost bait.
- Rod durability is consumed on cast, not on catch. A broken rod (durability 0) cannot cast but may still be equipped.
- Overweight fish (weight > rod strength) incur a -25% catch penalty per weight point over. A Bronze Rod (strength 1) trying to catch a Tuna (weight 3) gets -50% catch rate.
- The minimum catch chance is always 5% and maximum is 95%, regardless of bonuses or penalties.
- `fishVendorTab` is a global `let` variable (script-level lexical scope, not on `window`).
- The bobber cast distance scales with rod tier: `80 + tier * 10` pixels.
- The fish vendor uses `PROG_ITEMS` pricing when available, falling back to `ROD_TIERS[].cost` for legacy behavior.
