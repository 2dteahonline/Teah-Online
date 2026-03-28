# Fishing System

## Overview
A multi-phase minigame where the player equips a fishing rod, casts near a fishing spot, waits for a bite, then reels in fish using a tension-based mechanic. Fish are caught as stackable inventory items and can be sold at the Fish Vendor for gold. The system awards Fishing XP, tracks lifetime stats, and gates rod/fish access behind skill levels and rod tiers.

## Files
- `js/shared/fishingData.js` — Rod tiers, fish species, timing config, spawn table helpers, catch chance formula
- `js/authority/fishingSystem.js` — State machine, cast/reel logic, fish vendor panel, sell/buy handlers, HUD rendering, world-space visual effects (bobber, line, swimming fish)

## State

`fishingState` — global state object:

| Field | Type | Description |
|-------|------|-------------|
| `active` | boolean | Currently fishing |
| `phase` | string | `idle`, `casting`, `waiting`, `bite`, `reeling`, `result`, `cooldown` |
| `timer` | int | Frame counter for current phase |
| `targetFish` | object | Pre-picked fish species for current attempt |
| `baitCount` | int | Worm bait count (persisted, starts at 10) |
| `reelTension` | float | 0-1, fills with SPACE, decays when released |
| `reelProgress` | float | 0-1, gain when tension in sweet spot |
| `caught` | boolean | Result of last attempt |
| `resultMessage` | string | "Caught X!" or failure text |
| `castDir` | int | Direction (0-3) player faced when casting |
| `bobberX/Y` | float | World position of bobber |
| `fishX/Y` | float | World position of swimming fish sprite |
| `fishVisible` | boolean | Whether fish is animated toward bobber |
| `fishColor` | string | Color of target fish (hex) |
| `waitTotal` | int | Total wait frames for timing fish approach |
| `stats` | object | Persisted: `{ totalCaught, biggestFish, biggestFishValue, totalCasts }` |

## Fishing Config (FISHING_CONFIG)

All frame counts at 60fps:

| Constant | Value | Description |
|----------|-------|-------------|
| `castFrames` | 60 (1.0s) | Cast animation duration |
| `waitFramesMin` | 180 (3.0s) | Minimum wait time |
| `waitFramesMax` | 480 (8.0s) | Maximum wait time |
| `biteWindowFrames` | 120 (2.0s) | Time to react to bite |
| `reelFramesMin` | 180 (3.0s) | Minimum reel duration |
| `reelFramesMax` | 360 (6.0s) | Maximum reel duration |
| `resultFrames` | 90 (1.5s) | Result display time |
| `cooldownFrames` | 60 (1.0s) | Rest period between casts |
| `tensionFillRate` | 0.006 | Tension gain per frame (holding SPACE) |
| `tensionDecayRate` | 0.004 | Tension loss per frame (releasing SPACE) |
| `sweetSpotMin` | 0.2 | Lower bound of sweet spot |
| `sweetSpotMax` | 0.85 | Upper bound of sweet spot |
| `tensionCatchThreshold` | 0.45 | Reel progress needed to roll catch |
| `reelProgressBase` | 0.005 | Base progress per frame in sweet spot |
| `reelProgressEasyBonus` | 0.0025 | Bonus scaled by (1 - difficulty) |
| `fishFightBack` | 0.0006 | Progress lost per frame, scaled by difficulty |
| `levelBonusPerLevel` | 0.005 | Catch chance bonus per Fishing level |
| `maxLevelBonus` | 0.25 | Maximum level bonus (at level 50) |
| `overweightPenalty` | 0.25 | Catch penalty per weight point over rod strength |
| `maxLineDistance` | 160 | Pixels — snap line if player walks farther |

## Rod Tiers (4 rods)

Rods are dual-purpose: melee weapons AND fishing tools. `special: 'fishing'` identifies them.

| Rod | Tier | Level Req | Cost | Durability | Strength | Catch Bonus | Damage | Range | Cooldown | Crit | Color |
|-----|------|-----------|------|------------|----------|-------------|--------|-------|----------|------|-------|
| Bronze Rod | 0 | 1 | 20g | 25 | 1 | +0% | 8 | 80 | 34 | 0% | #8a6a3a |
| Iron Rod | 1 | 5 | 80g | 40 | 2 | +10% | 12 | 85 | 30 | 5% | #8a8a8a |
| Gold Rod | 2 | 12 | 200g | 60 | 3 | +20% | 16 | 90 | 26 | 8% | #ffd700 |
| Mythic Rod | 3 | 25 | 500g | 100 | 5 | +35% | 22 | 95 | 22 | 12% | #d4a030 |

- Cast distance: `80 + rod.tier × 10` pixels from player
- Durability tracked on inventory item's `data.currentDurability`

## Fish Species (6 types)

| Fish | Rarity | Sell | Difficulty | Min Rod | XP | Weight | Color |
|------|--------|------|------------|---------|-----|--------|-------|
| Sardine | 40 | 3g | 0.20 | Bronze (0) | 5 | 1 | #8ab4c8 |
| Bass | 25 | 8g | 0.35 | Bronze (0) | 10 | 2 | #5a8a5a |
| Salmon | 18 | 15g | 0.50 | Iron (1) | 18 | 2 | #d08060 |
| Tuna | 10 | 25g | 0.65 | Iron (1) | 30 | 3 | #4060a0 |
| Swordfish | 5 | 50g | 0.80 | Gold (2) | 50 | 4 | #607090 |
| Leviathan | 2 | 120g | 0.95 | Mythic (3) | 100 | 5 | #d4a030 |

Rarity is spawn weight for weighted random selection. Higher rarity = more common.

## Cast/Reel Flow (7 phases)

1. **idle** — Player is not fishing.

2. **casting** (60 frames / 1s) — Animation plays. Bobber landing position: `player position + facing direction × (80 + tier × 10)` pixels. Consumes 1 bait and 1 rod durability at cast start.

3. **waiting** (3-8s random) — Bobber in water. Target fish pre-picked via `pickRandomFish(rodTier)`. At ~40% time remaining, a fish sprite spawns 100-140px away and lerps toward the bobber at speed 0.02.

4. **bite** (120 frames / 2s window) — Yellow "!" appears above bobber with splash animation. Player must press SPACE (`InputIntent.reelPressed`) within this window or the fish escapes.

5. **reeling** (3-6s, scaled by difficulty) — Tension minigame:
   - Reel duration: `180 + (360 - 180) × difficulty` frames
   - Holding SPACE: tension fills at +0.006/frame
   - Releasing SPACE: tension decays at -0.004/frame
   - Tension reaches 1.0 = line snaps (fail)
   - Sweet spot (0.2-0.85): reel progress gains `0.005 + (1-difficulty) × 0.0025` per frame
   - Fish fights back: progress lost at `difficulty × 0.0006` per frame
   - Progress reaches 0.45 = catch chance roll via `calculateCatchChance()`
   - Success → `awardFish()`, failure → "It escaped at the last moment!"
   - Timer expires → "The fish got away!"

6. **result** (90 frames / 1.5s) — Shows catch/fail message. Checks if rod broke (durability 0).

7. **cooldown** (60 frames / 1s) — Rest period before next cast.

### Line Snap Safety
During all active phases (except result/cooldown), if the player walks more than 160px from the bobber, the line snaps and fishing is cancelled.

## Catch Chance Formula

```
baseCatch     = 1.0 - fish.difficulty
rodBonus      = rod.catchBonus
levelBonus    = min(0.25, fishingLevel × 0.005)
overweight    = max(0, fish.weight - rod.strength) × 0.25
finalCatch    = clamp(baseCatch + rodBonus + levelBonus - overweight, 0.05, 0.95)
```

Examples:
- Bronze Rod + Sardine (diff 0.2): 0.80 + 0 + level×0.005 = ~80%+
- Bronze Rod + Tuna (diff 0.65, overweight 2): 0.35 + 0 + level×0.005 - 0.50 = very low

## Fish Vendor Panel

420×380px panel, two tabs: Buy / Sell. Opened via `UI.isOpen('fishVendor')`.

### Buy Tab
- **Bait**: 10 worms for 20g (adds to `fishingState.baitCount`)
- **Rods**: 4 rods gated by Fishing level. Uses `PROG_ITEMS` pricing if available, falls back to `ROD_TIERS.cost`. Shows "OWNED" if in inventory, level requirement if locked.

### Sell Tab
- **Sell All** button (top right)
- Fish list with color swatch, name, count, price per unit, individual sell buttons
- Empty state: "No fish to sell"

### Sell Functions
- `sellFish(slot)` — Sell single fish from inventory slot, decrement stack or remove
- `sellAllFish()` — Iterate backwards through inventory, sell all `data.isFish === true` items

## World-Space Rendering (drawFishingWorldEffects)

Called from draw.js in the world-space translated context.

### Fishing Line
- Bezier curve from player to bobber with sag
- Color changes during reeling based on tension:
  - Default: light blue `rgba(200,230,255,0.6)`
  - High tension (>sweetSpotMax-0.1): orange
  - Danger (>sweetSpotMax): red

### Bobber
- Red/white bobber sprite (4px red circle, 2.5px white semi-circle)
- Bobbing animation: `sin(t × bobSpeed) × intensity`
- Water ripples (animated ellipses)
- Lateral shake during reel: `sin(t × 0.02) × tension × 3`

### Swimming Fish (waiting/bite phases)
- Colored ellipse body (8×4px) + triangle tail + eye
- Animated toward bobber via lerp

### Bite Indicator
- Yellow "!" text at bobber + 4 animated splash circles

## Screen-Space HUD (drawFishingHUD)

Panel: 320×120px (normal) or 360×160px (reeling). Centered, dark background with blue border.

| Phase | Display |
|-------|---------|
| casting | "Casting..." + progress bar |
| waiting | "Waiting for a bite..." + animated dots |
| bite | Large "! BITE !" + "Press SPACE to reel!" + urgency bar |
| reeling | Fish name + tension bar (sweet spot zones) + reel progress bar + instructions |
| result | Green success or red failure message + fish value |
| cooldown | "..." |

**Tension Bar** (reeling):
- 260px wide, 22px tall
- Sweet spot zone (0.2-0.85): semi-transparent green
- Danger zone (>0.85): semi-transparent red
- Fill color: green (sweet), orange (risky), red (danger), blue (too low)
- Zone labels: "LOW" / "SWEET SPOT" / "SNAP!"

**Reel Progress Bar** (reeling):
- 260px wide, 22px tall, blue fill
- Gold marker line at catch threshold (0.45)

**Rod/Bait Status** (always visible):
- Left: Rod name + durability `[current/max]`
- Right: "Bait: {count}"

## Key Functions

| Function | Description |
|----------|-------------|
| `startFishingCast()` | Triggered from meleeSwing() near fishing_spot. Checks rod/bait/durability, consumes bait+durability, calculates bobber position |
| `updateFishing()` | Per-frame state machine (7 phases). Called from inventory.js |
| `cancelFishing()` | Hard reset to idle (line snap from distance) |
| `awardFish(fish)` | Creates fish item, adds to inventory, awards XP, updates stats |
| `getEquippedRod()` | Returns playerEquip.melee if `special === 'fishing'`, else null |
| `getRodInventoryItem()` | Finds rod's inventory entry for durability tracking |
| `getFishingSpawnTable(rodTier)` | Returns fish filtered by minRodTier |
| `pickRandomFish(rodTier)` | Weighted random selection from spawn table |
| `calculateCatchChance(fish, rod, fishingLevel)` | Formula: baseCatch + rodBonus + levelBonus - overweight, clamped [0.05, 0.95] |
| `drawFishingWorldEffects()` | World-space: fishing line, bobber, swimming fish, bite indicator |
| `drawFishingHUD()` | Screen-space: phase HUD, tension/progress bars, rod/bait status |
| `drawFishVendorPanel()` | Screen-space: vendor panel (Buy/Sell tabs) |
| `handleFishVendorClick(mx, my)` | Click handler for vendor |

## Fishing Spot Entity

Located in the lobby (`Scene.inLobby`) at tile (37, 58), size 5×3 tiles. Entity type: `fishing_spot`.

- Procedural dock renderer with water, planks, posts, rope railing
- Context label: "Attack to Cast" (rod equipped) or "Equip a Rod" (no rod)
- `nearFishingSpot` global flag set in `checkPortals()` function, reset every frame

## Melee System Intercept

In meleeSystem.js, when a rod swings:
1. Check `melee.special === 'fishing'`
2. Check `nearFishingSpot && !fishingState.active`
3. If yes: call `startFishingCast()` instead of dealing melee damage

This allows rods to function as both combat weapons and fishing tools.

## Connections to Other Systems

- **Melee System** — `startFishingCast()` called from `meleeSwing()` when rod equipped near fishing spot.
- **Input System** — Reads `InputIntent.reelPressed` (bite phase) and `InputIntent.reelHeld` (reeling phase) for SPACE key.
- **Inventory System** — Fish are stackable consumables (`createConsumable()`). Rods are melee items with durability.
- **Progression System** — Rod vendor uses `PROG_ITEMS` and `createProgressedItem()` when available.
- **Skill XP** — Awards Fishing XP via `addSkillXP('Fishing', xp)`. Rod/fish access gated by `skillData['Fishing'].level`.
- **Save/Load** — Persists `fishingState.stats` and `fishingState.baitCount`. Rod durability tracked on inventory item `data.currentDurability`. v3→v4 migration adds bronze rod for old saves.
- **Draw System** — `drawFishingWorldEffects()` from draw.js world-space. `drawFishingHUD()` and `drawFishVendorPanel()` from screen-space.
- **Scene System** — `nearFishingSpot` only set when `Scene.inLobby`. Fishing only available in lobby.
- **UI Panel System** — Fish Vendor opens via `UI.isOpen('fishVendor')`.

## Gotchas & Rules

- Rods are dual-purpose melee weapons. They have damage, range, cooldown, critChance for combat. `special: 'fishing'` enables fishing behavior.
- Bait is consumed at cast time, not on catch. Failed attempts still cost 1 bait.
- Rod durability consumed on cast, not catch. Broken rods (durability 0) cannot cast.
- Overweight penalty: fish weight > rod strength incurs -25% catch per point over. Bronze Rod (strength 1) + Tuna (weight 3) = -50%.
- Minimum catch 5%, maximum 95% — hard-clamped regardless of bonuses/penalties.
- `fishVendorTab` is a script-level `let` (global lexical scope, NOT on `window`).
- Tension fills faster than it decays (0.006 vs 0.004) — tension slowly creeps up if held continuously.
- Sweet spot is wide (0.2-0.85 = 65% of the bar) — manageable with correct timing.
- Fish approach animation starts at ~40% of wait time remaining, lerps to bobber at 0.02 speed.
- Line snap distance: 160px from bobber, immediate cancellation.
- Fishing only works in the lobby (`checkPortals()` only sets `nearFishingSpot` when `Scene.inLobby`).
- HUD panel expands to 360×160 during reeling phase to fit tension and progress bars.
