# Farming System

## Overview
A tile-based farming skill where the player equips a hoe in a farm zone (inside `house_01`), tills soil, plants seeds, waters crops, and harvests for gold and Farming XP. Crops only grow while watered, and higher-tier hoes extend water duration. The farm grid size is expandable through land level upgrades purchased at the Farm Vendor. Seeds are selected via keyboard hotkeys or the vendor panel.

## Files
- `js/shared/farmingData.js` — Crop types (9 crops), hoe tiers (4 hoes), farming config, land expansions (5 levels), helper functions
- `js/authority/farmingSystem.js` — Farming state, tile management, growth ticking, hoe swing handler, seed selection, farm vendor panel/click handling, world-space tile rendering, screen-space HUD

## Key Functions & Globals

### State
- `farmingState` — Global state object:
  - `active` — Whether the farming system is running (true when in farm zone).
  - `tiles[]` — Array of tile objects: `{ tx, ty, state, cropId, growthTimer, watered, waterTimer }`.
  - `landLevel` — Index into `LAND_EXPANSIONS` (persisted across sessions).
  - `selectedSeed` — Crop ID currently selected for planting.
  - `actionCooldown` — Frames until next swing action allowed.
  - `stats` — Persisted: `{ totalHarvested, totalEarned, bestCrop, bestCropValue }`.
- `FARM_TILE_STATES` — Enum: `EMPTY`, `TILLED`, `PLANTED`, `GROWING`, `HARVESTABLE`.

### Data Constants
- `CROP_TYPES` — Object of 9 crops. Each: `{ id, name, growthFrames, stages, seedCost, sellPrice, xp, levelReq, color }`.
- `HOE_TIERS` — Array of 4 hoe definitions (Bronze, Iron, Gold, Mythic). Each: `{ id, name, tier, levelReq, cost, durability, damage, range, cooldown, critChance, special: 'farming', waterRange, waterDuration }`.
- `FARMING_CONFIG` — Cooldowns: `tillCooldown` (15 frames), `plantCooldown` (10), `waterCooldown` (20), `harvestCooldown` (15). Also `tileInteractRange` (60px).
- `LAND_EXPANSIONS` — Array of 5 levels: Starter Plot (3x3) through Grand Farm (7x7), with cost and level requirements.

### Core Functions
- `initFarmState()` — Called when entering `house_01`. Finds the `farm_zone` entity, builds the tile grid centered in the zone based on `landLevel`, auto-selects the first unlocked seed.
- `resetFarmingState()` — Clears all farming state on scene exit.
- `updateFarming()` — Per-frame update. Ticks action cooldown, water timers (watered tiles dry out when timer hits 0), and growth timers (only while watered). Transitions tiles from PLANTED to GROWING to HARVESTABLE when `growthTimer >= crop.growthFrames`.
- `handleFarmSwing()` — Called when the player swings a hoe. Determines the targeted farm tile, then acts based on tile state:
  - EMPTY -> TILLED (till the soil)
  - TILLED -> PLANTED (plant selected seed, costs gold)
  - PLANTED/GROWING -> watered (if not already watered)
  - HARVESTABLE -> harvest (awards gold + XP, resets tile to TILLED)
- `handleFarmSeedSelect(keyNum)` — Keyboard handler for number keys 1-9 to select unlocked seeds.

### Equipment/Data Helpers
- `getEquippedHoe()` — Returns `playerEquip.melee` if `special === 'farming'`, else null.
- `getFarmTileAtSwing()` — Finds the farm tile the player is facing (checks 1-2 tiles in facing direction, then standing tile).
- `getUnlockedCrops(farmingLevel)` — Returns array of crops where `levelReq <= farmingLevel`.
- `getUnlockedTileCount(landLevel)` — Returns `gridW * gridH` for the given land level.
- `getLandExpansion(landLevel)` — Returns the `LAND_EXPANSIONS` entry for the given level.

### Vendor
- `farmVendorTab` — 0=Seeds, 1=Equipment, 2=Sell.
- `getFarmVendorSeedItems()` — Lists all crops with lock status based on Farming level.
- `getFarmVendorEquipItems()` — Lists hoes + land expansions with lock/owned status.
- `drawFarmVendorPanel()` / `handleFarmVendorClick(mx, my)` — Three-tab vendor UI opened via `UI.isOpen('farmVendor')`.

### Rendering
- `drawFarmTiles()` — World-space rendering of all farm tiles. Empty tiles show faint grid outline. Tilled tiles show dark soil with furrow lines. Planted/growing tiles show soil + crop at the current growth stage (5 visual stages: seed, small sprout, medium plant, large plant, fully grown with crop color). Harvestable tiles get a sparkle effect.
- `drawFarmingHUD()` — Screen-space HUD: selected seed display (bottom-center with crop color, name, cost, grow time, sell price), farming level + stats (top-left), gold display, hotkey hint.

## How It Works

### Crop Lifecycle (5 tile states)
1. **EMPTY** — Untilled ground. Swing hoe to till.
2. **TILLED** — Dark soil with furrows. Swing hoe to plant the selected seed (costs `seedCost` gold, requires `levelReq` Farming level).
3. **PLANTED** — Seed in ground. Must be watered to start growing. Swing hoe to water.
4. **GROWING** — Crop is actively growing (only while watered). `growthTimer` increments each frame. When `growthTimer >= crop.growthFrames`, transitions to HARVESTABLE.
5. **HARVESTABLE** — Sparkle effect. Swing hoe to harvest: awards `sellPrice` gold + `xp` Farming XP, resets tile to TILLED (can re-plant immediately).

### Watering Mechanic
- Swinging the hoe on a PLANTED or GROWING tile sets `watered = true` and `waterTimer` to the equipped hoe's `waterDuration`.
- Water timer counts down every frame. When it reaches 0, `watered` is set to false and growth pauses.
- Higher-tier hoes have longer `waterDuration`: Bronze (1800 frames/30s), Iron (2700/45s), Gold (3600/60s), Mythic (5400/90s).
- Crops only grow while watered. Un-watered crops pause growth but do not lose progress.

### Crop Types (9 total)

| Crop | Growth Time | Seed Cost | Sell Price | XP | Level Req | Stages |
|------|-------------|-----------|------------|-----|-----------|--------|
| Carrot | 15s | 5g | 12g | 8 | 1 | 4 |
| Potato | 20s | 8g | 18g | 12 | 3 | 4 |
| Tomato | 25s | 12g | 25g | 18 | 6 | 5 |
| Corn | 30s | 15g | 35g | 25 | 10 | 5 |
| Pumpkin | 40s | 20g | 50g | 35 | 15 | 5 |
| Watermelon | 50s | 30g | 70g | 45 | 20 | 5 |
| Sunflower | 60s | 40g | 95g | 60 | 28 | 5 |
| Starfruit | 80s | 60g | 140g | 80 | 35 | 6 |
| Dragonfruit | 100s | 100g | 220g | 120 | 45 | 6 |

### Hoe Tiers (4 total)

| Hoe | Tier | Level Req | Cost | Water Duration | Damage |
|-----|------|-----------|------|----------------|--------|
| Bronze Hoe | 0 | 1 | 20g | 30s | 6 |
| Iron Hoe | 1 | 5 | 80g | 45s | 10 |
| Gold Hoe | 2 | 12 | 200g | 60s | 14 |
| Mythic Hoe | 3 | 25 | 500g | 90s | 20 |

### Land Expansions (5 levels)

| Level | Name | Grid | Cost | Farming Lv |
|-------|------|------|------|------------|
| 0 | Starter Plot | 3x3 (9 tiles) | Free | 1 |
| 1 | Small Garden | 4x4 (16 tiles) | 100g | 5 |
| 2 | Garden | 5x5 (25 tiles) | 300g | 12 |
| 3 | Large Garden | 6x6 (36 tiles) | 700g | 20 |
| 4 | Grand Farm | 7x7 (49 tiles) | 1500g | 35 |

### Seed Selection
- Number keys 1-9 select the Nth unlocked crop (handled by `handleFarmSeedSelect(keyNum)`).
- Clicking a seed in the vendor's Seeds tab also selects it (does not cost gold -- seeds are paid per-plant, not per-purchase).

## Connections to Other Systems
- **Melee System** — Hoes are melee weapons with `special: 'farming'`. `handleFarmSwing()` is called when swinging a hoe in the farm zone.
- **Inventory System** — Hoes are melee items purchased via `createProgressedItem()` (if PROG_ITEMS available) or `createItem('melee', ...)` fallback. Auto-equipped on purchase.
- **Skill XP** — Awards Farming XP via `addSkillXP('Farming', xp)`. Crop and equipment access gated by `skillData['Farming'].level`.
- **Scene System** — `initFarmState()` is called when entering `house_01` (where the farm zone is). `resetFarmingState()` on exit. Only updates when `Scene.inFarm` is true.
- **Level Data** — Farm zone bounds come from a `farm_zone` entity in `levelEntities`.
- **UI Panel System** — Farm Vendor opens via `UI.isOpen('farmVendor')`.
- **Save/Load** — `farmingState.landLevel` and `farmingState.stats` are persisted.
- **Progression System** — Hoe vendor uses `PROG_ITEMS` and `createProgressedItem()` when available.

## Gotchas & Rules
- Hoes are melee weapons (they have damage, range, cooldown, critChance) and can be used for combat. The `special: 'farming'` property enables farming behavior.
- Crops auto-sell on harvest (gold is immediately added). There is no "crop item" in inventory -- the Sell tab in the vendor is informational only, showing lifetime stats.
- Seeds are not inventory items. Selecting a seed just sets `farmingState.selectedSeed`. The gold cost is deducted when planting.
- Water does not stack. Watering an already-watered tile shows "Already watered!" and does nothing.
- Growth timer only increments while `watered === true`. Un-watered crops freeze in place but retain progress.
- When buying a land expansion, `initFarmState()` is re-called, which rebuilds the entire tile grid. Any in-progress crops on the old grid are lost.
- The tile grid is centered within the `farm_zone` entity bounds. The zone default size is 38x18 tiles.
- `farmVendorTab` is a global `let` variable (script-level lexical scope, not on `window`).
- Hoes have a `waterRange` property defined in `HOE_TIERS` but it is not currently used in the farming logic -- only `waterDuration` is used. `waterRange` may be reserved for future area-watering mechanics.
