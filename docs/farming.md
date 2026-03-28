# Farming System

## Overview
A tile-based farming skill inside `house_01`. The player tills soil, plants seeds, waters once, waits for growth, then harvests for gold and Farming XP. Hoes are pure tools (not melee weapons) with multi-tile swing capabilities. The garden grid is expandable through 8 land upgrade tiers at the Garden Shop. Seeds are selected via keyboard hotkeys (1-9) or the vendor panel.

**Core loop:** till → plant → water once → wait → harvest

## Files
- `js/shared/farmingData.js` — Crop types (9 crops, 3 tiers with gardenReq), hoe tiers (4 pure tools with swingTiles), bucket data, farming config, land expansions (8 levels)
- `js/authority/farmingSystem.js` — Farming state, tile management, growth ticking, farm action handler, seed selection, garden vendor panel (4 tabs), world-space tile rendering, countdown bubble, screen-space HUD

## State

`farmingState` — global state object:

| Field | Type | Description |
|-------|------|-------------|
| `active` | boolean | True when `Scene.inFarm` |
| `tiles[]` | array | `{ tx, ty, state, cropId, growthTimer }` per plot |
| `landLevel` | int | Index into `LAND_EXPANSIONS` (0-7, persisted) |
| `equippedHoe` | string | Hoe ID, e.g. `'iron_hoe'` (persisted, defaults to `'bronze_hoe'`) |
| `selectedSeed` | string/null | Crop ID for planting |
| `actionCooldown` | int | Frames until next action allowed |
| `bucketOwned` | boolean | Whether player owns the metal bucket (persisted) |
| `bucketFilled` | boolean | Whether bucket is currently filled with water |
| `stats` | object | Persisted: `{ totalHarvested, totalEarned, bestCrop, bestCropValue }` |

`FARM_TILE_STATES` — `EMPTY`, `TILLED`, `PLANTED`, `GROWING`, `HARVESTABLE`

## Crop Lifecycle (5 tile states)

1. **EMPTY** → till action (requires hoe) → **TILLED**
   - Hoe affects up to `hoe.swingTiles` tiles per swing
   - Cooldown: 15 frames (0.25s)

2. **TILLED** → plant action (select seed, costs gold, checks levelReq + gardenReq) → **PLANTED**
   - Consumes 1 seed from inventory
   - Sets `tile.cropId` and `tile.growthTimer = 0`
   - Cooldown: 10 frames (0.17s)

3. **PLANTED** → water action → **GROWING**
   - Bucket mode: waters up to `hoe.swingTiles` adjacent tiles at once
   - No-bucket mode: waters only single tile
   - Sets `bucketFilled = false` after use
   - Cooldown: 10 frames (0.17s)

4. **GROWING** → automatic (growthTimer increments each frame) → **HARVESTABLE**
   - No player action needed
   - Countdown bubble shows remaining seconds above faced tile

5. **HARVESTABLE** → harvest action (requires hoe) → **TILLED**
   - Harvests up to `hoe.swingTiles` tiles per swing
   - Awards: `crop.sellPrice` gold + `crop.xp` Farming XP
   - Updates stats (totalHarvested, totalEarned, bestCrop)
   - Cooldown: 15 frames (0.25s)
   - Tile resets to TILLED (can replant immediately)

## Crop Types (9 total, 3 tiers)

### Tier 0 — Starter Garden (gardenReq: 0)

| Crop | Growth Time | Seed Cost | Sell | XP | Level Req | Color |
|------|------------|-----------|------|-----|-----------|-------|
| Carrot | 15s (900f) | 5g | 12g | 8 | 1 | #e07830 |
| Potato | 20s (1200f) | 8g | 18g | 12 | 3 | #c0a060 |
| Tomato | 25s (1500f) | 12g | 25g | 18 | 6 | #dd3030 |

### Tier 1 — Small Garden (gardenReq: 1)

| Crop | Growth Time | Seed Cost | Sell | XP | Level Req | Color |
|------|------------|-----------|------|-----|-----------|-------|
| Corn | 30s (1800f) | 15g | 35g | 25 | 10 | #e0d040 |
| Pumpkin | 40s (2400f) | 20g | 50g | 35 | 15 | #d08020 |
| Watermelon | 50s (3000f) | 30g | 70g | 45 | 20 | #40a040 |

### Tier 2 — Medium Garden (gardenReq: 2)

| Crop | Growth Time | Seed Cost | Sell | XP | Level Req | Color |
|------|------------|-----------|------|-----|-----------|-------|
| Sunflower | 60s (3600f) | 40g | 95g | 60 | 28 | #f0c020 |
| Starfruit | 80s (4800f) | 60g | 140g | 80 | 35 | #e0d060 |
| Dragonfruit | 100s (6000f) | 100g | 220g | 120 | 45 | #e040a0 |

## Hoe Tiers (4 pure tools)

Hoes are NOT melee weapons. They are stored as `farmingState.equippedHoe` (string ID) and kept in inventory as `type: 'resource'` with `equipType: 'hoe'`.

| Hoe | Tier | Level Req | Cost | Reach | Swing Tiles | Cooldown | Color |
|-----|------|-----------|------|-------|-------------|----------|-------|
| Bronze Hoe | 0 | 1 | 20g | 1 | 2 | 36f | #8a6a3a |
| Iron Hoe | 1 | 5 | 80g | 1 | 3 | 30f | #8a8a8a |
| Gold Hoe | 2 | 12 | 200g | 2 | 5 | 24f | #ffd700 |
| Mythic Hoe | 3 | 25 | 500g | 2 | 8 | 20f | #d4a030 |

- **Reach** — tile range in facing direction (1 = adjacent, 2 = two tiles out)
- **Swing Tiles** — number of garden tiles affected per action (till, harvest, bucket water)
- All hoes have `special: 'farming'` property

## Bucket

One-time purchase from the vendor: `Metal Bucket` — 50g, level req 1.

- **Fill at well**: Walk near `farm_well` entity (distance < TILE × 3), press F
- **Water crops**: When bucket is filled, water action affects `hoe.swingTiles` adjacent tiles
- **Without bucket**: Water action only affects single tile
- **State**: `farmingState.bucketOwned` (persisted), `farmingState.bucketFilled` (session only)

## Garden Expansions (8 levels)

| Level | Name | Grid (W×H) | Total Plots | Cost | Farming Lv |
|-------|------|-----------|-------------|------|------------|
| 0 | Starter Garden | 3×3 | 9 | Free | 1 |
| 1 | Small Garden | 5×4 | 20 | 250g | 5 |
| 2 | Medium Garden | 8×5 | 40 | 800g | 12 |
| 3 | Large Garden | 11×7 | 77 | 2,000g | 20 |
| 4 | Grand Garden | 16×9 | 144 | 4,000g | 30 |
| 5 | Vast Garden | 22×11 | 242 | 7,000g | 45 |
| 6 | Huge Garden | 28×14 | 392 | 12,000g | 65 |
| 7 | Maximum Garden | 36×16 | 576 | 20,000g | 85 |

- Grid is centered within the farm zone (`house_01`: rows 2-17, cols 2-37, max 36×16 tiles)
- **Expansion preserves existing tiles** — old crops don't reset, new tiles added as EMPTY
- **Blocked if any crop is active** (PLANTED, GROWING, or HARVESTABLE) — must harvest first

## Farming Config

| Constant | Value | Description |
|----------|-------|-------------|
| `tillCooldown` | 15 frames | 0.25s cooldown after tilling |
| `plantCooldown` | 10 frames | 0.17s cooldown after planting |
| `harvestCooldown` | 15 frames | 0.25s cooldown after harvesting |
| `growthCheckInterval` | 1 frame | Check every frame |
| `tileInteractRange` | 60px | Not enforced; reach determined by hoe |

## Crop Rendering (4 visual stages)

All crops use procedural rendering with 4 stages based on growth progress:
- `progress = min(1.0, growthTimer / growthFrames)`
- `stage = floor(progress × 3)`

| Stage | Visual | When |
|-------|--------|------|
| 0 (seed) | Small colored dot | 0-33% growth |
| 1 (sprout) | Thin stem + 2 leaves | 33-66% growth |
| 2 (medium) | Thicker stem + 3 leaves | 66-99% growth |
| 3 (mature) | Thick stem + 3 large leaves + colored fruit | 100% (harvestable) |

Harvestable tiles also show a sine-wave sparkle animation (yellow glow).

## Garden Vendor Panel

540×480px centered panel with 4 tabs:

### Seeds Tab
- Lists all 9 crops with lock status (by Farming level + garden tier)
- Shows: crop color, name, growth time, sell price, owned count
- Click opens quantity selector (280×90px) for bulk seed buying

### Equipment Tab
- Lists 4 hoes + bucket
- Shows: equipped indicator (green border), reach, swing tiles, owned count
- Buying a hoe auto-equips it in `farmingState.equippedHoe`
- Bucket shows "OWNED" if purchased

### Acres Tab
- Lists land expansions 1-7 (Starter is free/default)
- Shows: grid dimensions, total plots, cost
- "OWNED" label if already purchased

### Sell Tab
- Static info: total harvested, total earned, best crop value

## Key Functions

| Function | Description |
|----------|-------------|
| `initFarmState()` | Called on Scene.inFarm enter. Builds tile grid from LAND_EXPANSIONS, centers within farm zone |
| `resetFarmingState()` | Called on Scene.inFarm exit. Clears session tiles, resets cooldowns. Does NOT clear persisted fields |
| `updateFarming()` | Per-frame: decrements cooldown, ticks growth timers, transitions GROWING → HARVESTABLE |
| `handleFarmAction(fromClick)` | Main action handler: till/plant/water/harvest based on tile state. Handles bucket filling at well |
| `expandFarmGrid(newLandLevel)` | Expands grid, preserves existing tiles. Blocked if crops active |
| `handleFarmSeedSelect(keyNum)` | Keys 1-9 select unlocked crops for planting |
| `drawFarmTiles()` | World-space: renders all tiles with procedural crop visuals |
| `drawFarmCountdownBubble()` | World-space: growth time remaining above faced GROWING tile |
| `drawFarmingHUD()` | Screen-space: farming level, stats, selected seed panel, bucket status |
| `drawFarmVendorPanel()` | Screen-space: 4-tab vendor panel |
| `handleFarmVendorClick(mx, my)` | Click handler for vendor panel |

## Connections to Other Systems

- **Input** — `handleFarmAction()` dispatched in inventory.js game loop when `Scene.inFarm && InputIntent.meleePressed`. Seed hotkeys (1-9) handled in panelManager.js.
- **Skill XP** — Awards Farming XP via `addSkillXP('Farming', xp)` on each harvest.
- **Scene** — `initFarmState()` on enter (via sceneManager), `resetFarmingState()` on exit (via stateReset).
- **Save/Load** — Persists `landLevel`, `equippedHoe`, `bucketOwned`, `stats`. Migrates old saves where hoe was a melee weapon.
- **Inventory** — Hoes stored as `resource` type items with `equipType: 'hoe'`. Seeds stored as `resource` with `equipType: 'seed'`. Bucket as `resource` with `equipType: 'bucket'`.
- **Draw System** — `drawFarmTiles()` and `drawFarmCountdownBubble()` called from draw.js world-space. `drawFarmingHUD()` and `drawFarmVendorPanel()` from screen-space.
- **UI** — Garden Vendor opens via `UI.isOpen('farmVendor')`.

## Gotchas & Rules

- Hoes are pure tools, NOT melee weapons. No damage, no durability, no combat stats.
- Water once only — no re-watering mechanic. Watering transitions PLANTED → GROWING immediately.
- Bucket multi-waters up to `hoe.swingTiles` tiles at once, but empties after one use (must refill at well).
- Grid centering: farm tiles are centered within the `farm_zone` entity bounds in the level.
- Garden tier gating: crops unlock by BOTH Farming level AND land expansion tier (`gardenReq`).
- Harvest blocks expansion: can't buy land upgrades if any crop is in PLANTED, GROWING, or HARVESTABLE state.
- `farmingState.equippedHoe` auto-defaults to `'bronze_hoe'` if not set.
- Seeds are consumed from inventory on planting (stackable resource items).
- `window._opMode` bypasses level and garden tier requirements.

## Deferred Features
- Crop quality tiers, rare/event crops
- Cosmetics, processing, automation
- Restaurant/cooking ingredient hookup
- Leaderboards, separate tool ladders
- Sprinklers, soil types, material tiers
