# Farming System (v2 — Simplified)

## Overview
A tile-based farming skill inside `house_01`. The player tills soil, plants seeds, waters once, waits for growth, then harvests for gold and Farming XP. Hoes are pure tools (not melee weapons). The garden grid is expandable through land upgrades at the Garden Shop. Seeds are selected via keyboard hotkeys or the vendor panel.

**Core loop:** till → plant → water once → wait → harvest

## Files
- `js/shared/farmingData.js` — Crop types (9 crops with gardenReq), hoe tiers (4 pure tools), farming config, land expansions (4 levels)
- `js/authority/farmingSystem.js` — Farming state, tile management, growth ticking, farm action handler, seed selection, garden vendor panel, world-space tile rendering, countdown bubble, screen-space HUD

## Key Changes from v1
- Hoes are **pure tools** — no damage/durability/combat stats. Stored as `farmingState.equippedHoe` (string ID), not in inventory/melee slot.
- **Water once** — no re-watering. Water a PLANTED tile to start GROWING. No water timer decay.
- **4 visual stages** for all crops (was 4-6): seed → sprout → medium → mature.
- **Crop tier gating** via `gardenReq` — Tier 1 crops need Small Garden, Tier 2 need Medium Garden.
- **4 land tiers** (was 5): 4×4 → 6×6 → 8×8 → 10×10.
- **Garden expansion preserves tiles** — `expandFarmGrid()` adds new EMPTY tiles without resetting existing ones. Blocked if crops are active.
- **Countdown bubble** — shows remaining seconds above the faced growing tile.
- **Input decoupled** — farm action dispatched directly in game loop, not via meleeSwing() intercept.

## State
- `farmingState` — Global state:
  - `active` — true when in farm zone.
  - `tiles[]` — `{ tx, ty, state, cropId, growthTimer }` (no watered/waterTimer).
  - `landLevel` — Index into `LAND_EXPANSIONS` (persisted).
  - `equippedHoe` — Hoe ID string, e.g. `'iron_hoe'` (persisted).
  - `selectedSeed` — Crop ID for planting.
  - `actionCooldown` — Frames until next action.
  - `stats` — Persisted: `{ totalHarvested, totalEarned, bestCrop, bestCropValue }`.
- `FARM_TILE_STATES` — `EMPTY`, `TILLED`, `PLANTED`, `GROWING`, `HARVESTABLE`.

## Crop Lifecycle (5 tile states)
1. **EMPTY** → action → **TILLED**
2. **TILLED** → action (plant seed, costs gold, checks levelReq + gardenReq) → **PLANTED**
3. **PLANTED** → action (water once) → **GROWING** (growthTimer starts at 0)
4. **GROWING** → growthTimer increments each frame → **HARVESTABLE** when done
5. **HARVESTABLE** → action → harvest (gold + XP), reset to **TILLED**

## Crop Types (9 total, 3 tiers)

| Tier | Crop | Growth | Seed | Sell | XP | Lv | Garden Req |
|------|------|--------|------|------|-----|-----|-----------|
| 0 | Carrot | 15s | 5g | 12g | 8 | 1 | Starter |
| 0 | Potato | 20s | 8g | 18g | 12 | 3 | Starter |
| 0 | Tomato | 25s | 12g | 25g | 18 | 6 | Starter |
| 1 | Corn | 30s | 15g | 35g | 25 | 10 | Small |
| 1 | Pumpkin | 40s | 20g | 50g | 35 | 15 | Small |
| 1 | Watermelon | 50s | 30g | 70g | 45 | 20 | Small |
| 2 | Sunflower | 60s | 40g | 95g | 60 | 28 | Medium |
| 2 | Starfruit | 80s | 60g | 140g | 80 | 35 | Medium |
| 2 | Dragonfruit | 100s | 100g | 220g | 120 | 45 | Medium |

## Hoe Tiers (4 pure tools)

| Hoe | Tier | Lv Req | Cost | Reach | Cooldown |
|-----|------|--------|------|-------|----------|
| Bronze | 0 | 1 | 20g | 1 | 36f |
| Iron | 1 | 5 | 80g | 1 | 30f |
| Gold | 2 | 12 | 200g | 2 | 24f |
| Mythic | 3 | 25 | 500g | 2 | 20f |

## Garden Expansions (4 levels)

| Level | Name | Grid | Cost | Farming Lv |
|-------|------|------|------|------------|
| 0 | Starter Garden | 4×4 | Free | 1 |
| 1 | Small Garden | 6×6 | 250g | 10 |
| 2 | Medium Garden | 8×8 | 1000g | 25 |
| 3 | Large Garden | 10×10 | 3000g | 50 |

## Connections
- **Input** — `handleFarmAction()` dispatched directly in inventory.js game loop when `Scene.inFarm && farmingState.equippedHoe && InputIntent.meleePressed`.
- **Skill XP** — Awards Farming XP via `addSkillXP('Farming', xp)`.
- **Scene** — `initFarmState()` on enter, `resetFarmingState()` on exit, only updates when `Scene.inFarm`.
- **Save/Load** — Persists `landLevel`, `equippedHoe`, `stats`. Migration from old saves (hoe-as-melee-weapon).
- **UI** — Garden Vendor opens via `UI.isOpen('farmVendor')`.

## Deferred Features
- Crop quality tiers, rare/event crops
- Cosmetics, processing, automation
- Restaurant/cooking ingredient hookup
- Leaderboards, separate tool ladders
- Sprinklers, soil types, material tiers
