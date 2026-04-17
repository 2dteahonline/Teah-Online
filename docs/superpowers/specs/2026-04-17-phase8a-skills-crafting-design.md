# Phase 8a: Mining + Fishing + Farming + Crafting — Unity Port Design

**Date:** 2026-04-17
**Status:** Active
**Depends on:** Phases 0-7 (all complete, code-only)

## Context

Phase 8a ports 3 skill minigames (Mining, Fishing, Farming) plus the Crafting backend to Unity. The 3 cooking restaurants (Deli, Diner, Fine Dining) are deferred to Phase 8b due to their NPC state machine complexity (~5,772 lines).

All 3 skills share a pattern: scene with interactable nodes → tool-based interaction → resource collection → vendor shop → XP progression. Crafting provides the material sink (upgrade/evolve weapons using ores + dungeon materials).

## Shared Foundation

### SkillSystem.cs (NEW)

Static class tracking XP and levels per skill. JS uses `addSkillXP('Mining', xp)` and `skillData['Mining'].xp` — `js/shared/skillRegistry.js`.

```
Methods:
  AddXP(string skillName, int xp)
  int GetLevel(string skillName)     — computed from cumulative XP
  int GetXP(string skillName)
  int GetXPForLevel(int level)       — threshold formula from JS
  Dictionary<string, int> GetAllXP() — for save/load
  void LoadFrom(Dictionary<string, int> data)
```

Skills tracked: Mining, Fishing, Farming, Cooking (Cooking data stored now, used in Phase 8b).

### ProgressionSystem.cs (NEW)

Backend for weapon/tool tier+level progression. Mirrors `js/shared/progressionData.js` PROG_ITEMS registry + `getProgUpgradeRecipe()` + `getEvolutionCost()`.

```
Methods:
  ProgItemDef GetDef(string itemId)
  GunProgress GetProgress(string itemId)
  void SetProgress(string itemId, int tier, int level)
  UpgradeRecipe GetUpgradeRecipe(string itemId, int tier, int toLevel)
  EvoCost GetEvolutionCost(int tier, string itemId)
  List<string> GetItemsByCategory(string category)  — "main_gun", "pickaxe", "fishing_rod"
  ProgStats GetStats(string itemId, int tier, int level) — computed stats
```

Stores `_gunLevels` dictionary (currently duplicated in GunsmithPanelUI — consolidate here).

### CraftingSystem.cs (NEW)

Mirrors `js/authority/craftingSystem.js` (117 lines). Upgrade and evolve logic:
- `CanUpgrade(gunId, tier, toLevel)` — check gold + ores + parts
- `Upgrade(gunId, tier, currentLevel)` — deduct costs, bump level via ProgressionSystem
- `CanEvolve(gunId, tier)` — check gold + materials, require level 25
- `Evolve(gunId, tier)` — deduct costs, bump tier, reset level to 1

### CraftMaterialData.cs (NEW)

Static data class mirroring `js/shared/craftingData.js` (254 lines):
- `CRAFT_MATERIALS` registry (28 materials with id, name, tier, color, source, category)
- `DUNGEON_DROP_POOL` — per-dungeon per-floor material pools
- `DROP_TABLES` — per-mob-type drop chance + specific loot tables
- `GetMobDrop(string mobType, string dungeonId, int floor)` → `(string materialId, int count)?`
- `CreateMaterialItem(string materialId, int count)` → inventory item

### MaterialDropSystem (wire into MobManager)

On mob kill, call `CraftMaterialData.GetMobDrop()` → if result, spawn pickup or add to inventory. Wire into existing kill flow in `MobManager` or `DamageSystem`.

### SaveSystem expansion (v2 → v3)

New fields:
- `skillXP: Dictionary<string, int>` — all skill XP values
- `gunLevels: Dictionary<string, GunProgress>` — weapon/tool tier+level+owned
- `farmPlots: FarmPlotState[]` — tile states for farm (optional, may reset per session like JS)
- `toolOwnership: { hasBucket, rodTier, hoeTier, pickaxeTier }` — what tools the player owns

### Wire ForgePanelUI stubs

13 TODOs in existing `ForgePanelUI.cs` — wire to ProgressionSystem + CraftingSystem + InventorySystem. No new UI code needed, just connect the stubs.

### Wire MiningShopPanelUI stubs

11 TODOs in existing `MiningShopPanelUI.cs` — wire to ProgressionSystem for pickaxe data.

---

## System 1: Mining

**JS source:** `js/authority/miningSystem.js` (~600 lines), `js/shared/oreData.js`

### Scenes

4 mine rooms: `mine_01` through `mine_04`. Player enters via lobby portal. Each room has a door to the next room (tx:33, ty:1). Exit to lobby at (tx:33, ty:45).

| Room | Ores | Citation |
|------|------|----------|
| mine_01 | stone, coal, copper, iron | js/shared/levelData.js:509-513 |
| mine_02 | steel, gold, amethyst | :590-594 |
| mine_03 | ruby, diamond, emerald | :663-667 |
| mine_04 | titanium, mythril, celestium, obsidian, dusk | :736-739 |

### MiningSystem.cs (NEW)

**Ore node spawning** — 18 cluster groups per room, 5-6 ores per group. Clusters use inner spacing 1.2 tiles, outer spacing 12 tiles, 4-tile wall margin, 4-tile player spawn clearance, 5-tile door clearance. Placement radius ±2 tiles from group center. — `js/authority/miningSystem.js:29-40`

**Ore types** — 15 types across 5 tiers, each with HP, value, rarity weight, Mining level requirement, XP reward. Full registry from `js/shared/oreData.js:5-28`. Room-to-ore mapping from `js/shared/oreData.js:31-36`.

**Mining tick** — Player equips pickaxe + holds shoot aimed at ore within 90px → tick timer (base 44 frames, modified by `max(10, round(44 / miningSpeed))`) → damage ore `max(1, floor(pickaxe.damage / 10))` → crit roll (pickaxe.critChance → 2× damage) → on depletion: spawn pickup at ore location. — `js/authority/miningSystem.js:16-26`

**Ore node visual** — 72px colored circles with ore-type color. Hit flash 6 frames. Level-gated ores show lock icon.

**Pickups** — Dropped items from depleted ores. Auto-collect at <40px distance. Lifetime 1800 frames (30s). — `js/authority/miningSystem.js:26`

**Respawn** — Depleted ores respawn after 690 frames (~11.5s) at same position. — `js/authority/miningSystem.js:25`

**Pickaxe tiers** — From PROG_ITEMS (category "pickaxe"). 4 tiers with scaling damage, miningSpeed, critChance. Level-gated via SkillSystem Mining level.

### Mining Vendor

At (tx:37, ty:42) in mine rooms, range 120px, opens `miningShop` panel. — `js/core/interactable.js:112-120`

Transactions: sell ores for listed value, buy pickaxes at tier cost.

MiningShopPanelUI already exists — wire stubs to ProgressionSystem.

---

## System 2: Fishing

**JS source:** `js/authority/fishingSystem.js` (~700 lines), `js/shared/fishingData.js`

### Scene

Fishing spot entity at lobby dock: `(tx:37, ty:58, w:5, h:3)` — `js/shared/levelData.js:203`. Fish vendor at `(tx:33, ty:56)`, range 120px, opens `fishVendor` panel — `js/core/interactable.js:64-73`.

No separate scene — fishing happens in the lobby at the dock.

### FishingSystem.cs (NEW)

**State machine:**
1. **IDLE** → player equips rod + swings near fishing_spot entity
2. **CASTING** — 60 frames (1s), bobber travels to target (80 + rod.tier×10 px in facing direction)
3. **WAITING** — 180-480 frames (3-8s random) for bite
4. **BITE** — 2s window (120 frames) to press reel. If missed → IDLE
5. **REELING** — Tension/progress minigame (180-360 frames based on difficulty):
   - Tension decay (no input): -0.004/frame, clamped 0..1
   - Tension fill (holding reel): +0.006/frame
   - Sweet spot: 0.2-0.85 tension
   - In sweet spot: progress += 0.005 + (1-difficulty)×0.0025
   - Outside sweet spot: progress -= difficulty×0.0006
   - Overweight penalty: (weight - rod.strength) × 0.25 per excess
   - Max line distance: 160px from bobber before snap → IDLE
   - Progress reaches 1.0 → CATCH ROLL
6. **CATCH** — Roll catch chance, add fish to inventory + XP, or "got away"

**Catch chance** — `js/shared/fishingData.js:97-105`:
```
baseCatch = (1 - fish.difficulty)
  + rod.catchBonus
  + min(0.25, fishingLevel × 0.005)
  - max(0, fish.weight - rod.strength) × 0.25
= clamp(0.05, 0.95)
```

**Fish species** — 6 types with rarity weights, sell price, difficulty, min rod tier, XP, weight. — `js/shared/fishingData.js:25-32`

| Fish | Rarity | Sell | Difficulty | MinRod | XP | Weight |
|------|--------|------|-----------|--------|----|----|
| Sardine | 40 | 3g | 0.20 | 0 | 5 | 1 |
| Bass | 25 | 8g | 0.35 | 0 | 10 | 2 |
| Salmon | 18 | 15g | 0.50 | 1 | 18 | 2 |
| Tuna | 10 | 25g | 0.65 | 1 | 30 | 3 |
| Swordfish | 5 | 50g | 0.80 | 2 | 50 | 4 |
| Golden Leviathan | 2 | 120g | 0.95 | 3 | 100 | 5 |

**Rod tiers** — 4 tiers (Bronze/Iron/Gold/Mythic), each with durability, strength, catchBonus, damage, range, cooldown, critChance. — `js/shared/fishingData.js:9-18`

**Rod durability** — -1 per cast. At 0, rod breaks (unequip).

**Starter bait** — 10 worms given at start. — `js/authority/fishingSystem.js:35`

### FishingVendorPanelUI.cs (NEW)

Vendor at dock. Transactions:
- Buy Worm Bait ×10: 20g
- Buy rods by tier (requires Fishing level gate)
- Sell fish for listed price

---

## System 3: Farming

**JS source:** `js/authority/farmingSystem.js` (~500 lines), `js/shared/farmingData.js`

### Scene

Farm interior: `house_01` (40×30 tiles) — `js/shared/levelData.js:214-218`.
- Farm zone entity: `(tx:2, ty:2, w:36, h:16)` — :255
- Well: `(tx:2, ty:21, w:2, h:2)` — :262, fill range <144px
- Vendor: `(tx:30, ty:21, w:2, h:2)` — :257, range 120px, opens `farmVendor`
- Exit: `(tx:8, ty:27, w:4, h:3)` → `lobby_01` spawn (15,9) — :253

### FarmingSystem.cs (NEW)

**Tile state machine:**
- **EMPTY** → till (hoe swing, affects `swingTiles` nearby, cooldown per hoe tier) → **TILLED**
- **TILLED** → plant selected seed (consume 1 from inventory, check levelReq + gardenReq) → **PLANTED**
- **PLANTED** → water (bucket filled at well <144px) → **GROWING** (starts growth timer)
- **GROWING** → growth timer increments each frame → at `crop.growthFrames` → **HARVESTABLE**
- **HARVESTABLE** → harvest (interact) → add crop to inventory + gold + XP → **EMPTY**

**Timing constants** — `js/shared/farmingData.js:43-52`:
- Till cooldown: 15 frames (0.25s)
- Plant cooldown: 10 frames (0.17s)
- Harvest cooldown: 15 frames (0.25s)
- Tile interact range: 60px
- Plot size: 1 tile (48×48px)

**Crop types** — 9 crops with growth time (15s-100s), seed cost, sell price, XP, level req, garden req. — `js/shared/farmingData.js:29-39`

| Crop | Growth | Seed | Sell | XP | LvlReq | GardenReq |
|------|--------|------|------|----|--------|-----------|
| Carrot | 900f (15s) | 5g | 12g | 8 | 1 | 0 |
| Potato | 1200f (20s) | 8g | 18g | 12 | 3 | 0 |
| Tomato | 1500f (25s) | 12g | 25g | 18 | 6 | 0 |
| Corn | 1800f (30s) | 15g | 35g | 25 | 10 | 1 |
| Pumpkin | 2400f (40s) | 20g | 50g | 35 | 15 | 1 |
| Watermelon | 3000f (50s) | 30g | 70g | 45 | 20 | 1 |
| Sunflower | 3600f (60s) | 40g | 95g | 60 | 28 | 2 |
| Starfruit | 4800f (80s) | 60g | 140g | 80 | 35 | 2 |
| Dragonfruit | 6000f (100s) | 100g | 220g | 120 | 45 | 2 |

**Hoe tiers** — 4 tiers (Bronze/Iron/Gold/Mythic) with reach, cooldown, swingTiles. — `js/shared/farmingData.js:10-15`

**Bucket** — 50g one-time purchase, required for watering. Fill at well (<144px). — `js/shared/farmingData.js:19-20`

**Land expansions** — 8 levels from 3×3 (9 plots, free) up to 36×16 (576 plots, 20000g). Each gated by Farming level + gold cost. — `js/shared/farmingData.js:58-67`

### FarmVendorPanelUI.cs (NEW)

Vendor at farm. Transactions:
- Buy seeds (per crop type, level-gated)
- Buy hoe tiers (level-gated)
- Buy bucket (50g, one-time)
- Buy land expansions (level+cost gated)
- Sell harvested crops

---

## System 4: Crafting

**JS source:** `js/authority/craftingSystem.js` (117 lines), `js/shared/craftingData.js` (254 lines), `js/shared/progressionData.js:579-646` (upgrade recipe function)

### CraftingSystem.cs (NEW)

Upgrade/evolve logic — checks costs against gold + materials, deducts, bumps progression:

**Upgrade** (level within tier, L1→L25):
- Recipe from `getProgUpgradeRecipe(itemId, tier, toLevel)`:
  - Gold cost: bracket-based (50-3000g base × tier multiplier [1/2.5/5/10/20])
  - Ores: bracket-based (coal/copper→iron→steel/gold→ruby/diamond→titanium/mythril)
  - Parts: category-specific (gun_parts, rod_parts, pick_parts)
  - Gun-specific materials for main_gun category

**Evolve** (tier up, T0→T4, requires L25):
- Cost from `EVOLUTION_COSTS[tier]`:
  - T0→T1: 2000g + uncommon_weapon_parts×5 + ore_steel×10 + ore_gold×5
  - T1→T2: 5000g + rare parts×8 + ore_ruby×8 + ore_diamond×5
  - T2→T3: 12000g + epic parts×12 + ore_emerald×10 + ore_titanium×8
  - T3→T4: 30000g + legendary parts×15 + ore_mythril×12 + ore_celestium×10 + ore_dusk×5
- Category-specific part swapping (weapon→gun/rod/pick parts)
- Gun-specific dungeon materials added for main_gun category

### Wire ForgePanelUI

Connect 13 stubs to: CraftingSystem.CanUpgrade/Upgrade/CanEvolve/Evolve, ProgressionSystem.GetProgress/GetStats, InventorySystem.CountItem, CombatState.gold.

### MaterialDropSystem

Wire into mob kill flow: `CraftMaterialData.GetMobDrop(mob.type, dungeon, floor)` → drop chance roll → weighted loot table → `createMaterialItem()` → add to inventory. Handles both generic dungeon pool drops and boss-specific loot tables.

---

## Task Structure (Parallelization)

**Task 0: Shared Foundation** (must complete first)
- SkillSystem.cs
- ProgressionSystem.cs (PROG_ITEMS registry, upgrade recipes, evolution costs)
- CraftMaterialData.cs (material registry, drop pools, drop tables)
- SaveSystem v3 expansion
- Wire GunsmithPanelUI._gunLevels → ProgressionSystem (consolidate)

**Task 1: Mining** (after Task 0)
- MiningSystem.cs (ore spawning, mining tick, pickups, respawn)
- Wire MiningShopPanelUI stubs
- Mine room portal/scene navigation (mine_01 through mine_04 doors)
- Mining vendor interactable

**Task 2: Fishing** (after Task 0)
- FishingSystem.cs (cast/wait/bite/reel state machine, tension minigame)
- FishingVendorPanelUI.cs
- Fishing spot entity interaction in lobby
- Fish vendor interactable

**Task 3: Farming** (after Task 0)
- FarmingSystem.cs (tile grid, till/plant/water/harvest, growth timers)
- FarmVendorPanelUI.cs
- Farm scene navigation (house_01)
- Farm vendor + well interactable
- Land expansion system

**Task 4: Crafting** (after Task 0)
- CraftingSystem.cs (upgrade/evolve logic)
- MaterialDropSystem (wire into mob kill flow)
- Wire ForgePanelUI 13 stubs

Tasks 1-4 are fully independent and can run in parallel.

---

## Exit Gate

- Walk into mine → mine ores → sell at vendor → XP levels up → unlock higher tier pickaxe
- Cast rod at dock → reel fish → sell at vendor → XP levels up → buy better rod
- Enter farm → till → plant → water → wait → harvest → sell → XP → buy land expansion
- Kill dungeon mobs → collect material drops → forge panel → upgrade/evolve weapon
- Save → reload → skill levels + tools + materials persist

---

## Key Values Quick Reference

**Frame-to-seconds:** frames / 60
**1 Unity unit = 1 JS pixel**
**TILE = 48 units**
**Y-axis:** Canvas Y-down → Unity Y-up: `unityRow = (heightTiles - 1) - jsRow`
