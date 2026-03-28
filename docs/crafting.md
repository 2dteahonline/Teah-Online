# Crafting System

## Overview
A recipe-based weapon upgrading and evolution system. Players collect materials from dungeon mob kills (ground drops), mine ores from mining rooms, and spend gold + materials at the Forge UI to level up weapons (upgrade) or prestige them to the next tier (evolve). The system spans four files: shared data definitions, authority-side crafting logic, a loot drop system for spawning ground pickups, and a client-side Forge panel.

## Files
- `js/shared/craftingData.js` — Material registry (`CRAFT_MATERIALS`), dungeon drop pools (`DUNGEON_DROP_POOL`), per-mob drop tables (`DROP_TABLES`), drop resolution helper (`getMobDrop()`), material item factory (`createMaterialItem()`)
- `js/authority/craftingSystem.js` — `CraftingSystem` namespace: `canUpgrade()`, `upgrade()`, `canEvolve()`, `evolve()`
- `js/authority/lootDropSystem.js` — Ground-based material drops from mob kills: `spawnGroundDrop()`, `updateGroundDrops()`, `drawGroundDrops()`, `clearGroundDrops()`
- `js/client/ui/forgeUI.js` — Forge panel UI: weapon grid, weapon detail (prestige view), materials inventory tab, click/scroll handlers
- `js/shared/progressionData.js` — Upgrade recipe generator (`getProgUpgradeRecipe()`), evolution cost table (`EVOLUTION_COSTS`, `getEvolutionCost()`), tier cost multipliers, category-specific part key mappings
- `js/authority/inventorySystem.js` — `countMaterialInInventory()` and `removeMaterial()` helpers used by CraftingSystem

## Material Registry (CRAFT_MATERIALS)

28 materials organized by source dungeon and category:

### Generic Weapon Parts (Cave)

| Material | Tier | Category | Color |
|----------|------|----------|-------|
| Common Weapon Parts | 0 | generic_part | #888888 |
| Uncommon Weapon Parts | 1 | generic_part | #5fca80 |
| Rare Weapon Parts | 2 | generic_part | #4a9eff |
| Epic Weapon Parts | 3 | generic_part | #ff9a40 |
| Legendary Weapon Parts | 4 | generic_part | #ff4a8a |

### Category-Specific Parts (Cave)

| Material | Tier | Category |
|----------|------|----------|
| Rare Gun Parts | 2 | gun_part |
| Epic Gun Parts | 3 | gun_part |
| Legendary Gun Parts | 4 | gun_part |
| Rare Rod Parts | 2 | rod_part |
| Epic Rod Parts | 3 | rod_part |
| Legendary Rod Parts | 4 | rod_part |
| Rare Pick Parts | 2 | pick_part |
| Epic Pick Parts | 3 | pick_part |
| Legendary Pick Parts | 4 | pick_part |

### Dungeon-Specific Materials

| Material | Tier | Source | Used By |
|----------|------|--------|---------|
| Storm Capacitor | 1 | Azurine | Storm AR, Volt-9 |
| Wind Crystal | 2 | Azurine | Storm AR |
| Volt Coil | 2 | Azurine | Volt-9 |
| Plasma Cell | 3 | Azurine | Volt-9 |
| Ironwood Limb | 1 | Vortalis | Ironwood Bow |
| Sinew String | 2 | Vortalis | Ironwood Bow |
| Fletching Kit | 3 | Vortalis | Ironwood Bow |
| Heavy Barrel Liner | 2 | Earth-205 | Heavy AR |
| Blast Powder | 3 | Earth-205 | Heavy AR |
| Scatter Core | 2 | Wagashi | Boomstick |
| Gunpowder Charge | 3 | Wagashi | Boomstick |
| Buckshot Mold | 3 | Wagashi | Boomstick |
| Shadow Alloy | 3 | Earth-216 | (reserved) |
| Neon Filament | 4 | Earth-216 | (reserved) |

## Dungeon Drop Pools (DUNGEON_DROP_POOL)

Maps `dungeonId` + `floor` to an array of material IDs that regular mobs can drop. Floor number roughly corresponds to tier (floor 1 = tier 0 materials, floor 5 = tier 4 materials).

| Dungeon | Floor 1 | Floor 2 | Floor 3 | Floor 4 | Floor 5 |
|---------|---------|---------|---------|---------|---------|
| Cave | Common Parts | Common + Uncommon Parts | Uncommon + Rare Parts | Rare + Epic Parts | Epic + Legendary Parts |
| Azurine | Storm Cap. + Common Parts | Storm Cap. + Wind Crystal | Wind Crystal + Volt Coil | Volt Coil + Plasma Cell | Plasma Cell + Storm Cap. |
| Vortalis | Ironwood + Common Parts | Ironwood + Sinew | Sinew + Fletching | Fletching + Ironwood | Fletching + Sinew |
| Earth-205 | Heavy Barrel + Common Parts | Heavy Barrel + Uncommon Parts | Heavy Barrel + Blast Powder | Blast Powder + Heavy Barrel | Blast Powder + Heavy Barrel |
| Wagashi | Scatter Core + Common Parts | Scatter Core + Gunpowder | Gunpowder + Buckshot | Buckshot + Scatter Core | Buckshot + Gunpowder |
| Earth-216 | Shadow Alloy + Common Parts | Shadow Alloy + Uncommon Parts | Shadow Alloy + Neon Filament | Neon Filament + Shadow Alloy | Neon Filament + Shadow Alloy |

## Drop Tables (DROP_TABLES)

Per-mob-type drop configuration. Each entry has:
- `dropChance` — probability (0-1) that a kill produces a drop
- `items` — `null` uses the dungeon pool; otherwise an array of `{ materialId, weight, countMin, countMax }`

### Regular Mobs
Regular mobs use `items: null` (dungeon pool) with ~10-20% drop chance:
- Cave: grunt (15%), runner (12%), tank (20%), witch (18%), archer (15%), healer (18%), mummy (10%)
- Azurine: neon_pickpocket (15%), cyber_mugger (15%), drone_lookout (15%), street_chemist (18%), renegade_bruiser (18%), renegade_shadowknife (12%), renegade_demo (15%), renegade_sniper (15%)

Mobs not in `DROP_TABLES` use `DEFAULT_DROP_CHANCE` of 12%.

### Bosses
All bosses have `dropChance: 1.0` (guaranteed drop) with specific weighted loot tables. Boss drops include dungeon-specific materials in higher quantities, and later bosses can drop category-specific parts (e.g., `rare_gun_parts`, `epic_gun_parts`, `legendary_weapon_parts`).

## Drop Resolution: getMobDrop()

`getMobDrop(mobType, dungeonId, floor)` resolves what a mob should drop:
1. Look up the mob in `DROP_TABLES`. If not found, use `DEFAULT_DROP_CHANCE` (12%).
2. Roll against `dropChance`. If the roll fails, return `null`.
3. If the mob has a specific `items` array, do a weighted random selection and roll a count between `countMin` and `countMax`.
4. If `items` is `null`, pick a random material from `DUNGEON_DROP_POOL[dungeonId][floor]` with count 1.
5. Returns `{ materialId, count }` or `null`.

## Material Item Factory: createMaterialItem()

`createMaterialItem(materialId, count)` creates a stackable inventory item:
- Sets `type: 'material'`, `tier`, `data.color`, `data.materialId`, `data.desc` from the `CRAFT_MATERIALS` registry.
- Uses `createConsumable()` as the base item constructor.

## Loot Drop System (lootDropSystem.js)

Handles ground-based material drops from mob kills. Mirrors the ore pickup pattern from `miningSystem.js`.

### State
- `_groundDrops` — Array of active ground drops. Each: `{ id, materialId, count, x, y, life, bobOffset, ownerId, ownerLeft }`.
- `_groundDropCounter` — Monotonic ID counter for drop uniqueness.

### Event Subscriber
Listens to `Events.on('mob_killed')`. On mob kill:
1. Skips skeleton/summon kills (no loot from summoned mobs).
2. Only drops in dungeons (`Scene.inDungeon`).
3. Calls `getMobDrop(mob.type, dungeonId, floor)` to resolve the drop.
4. If a drop is resolved, calls `spawnGroundDrop()` at the mob's death position.

### Core Functions

- **`spawnGroundDrop(materialId, count, x, y, ownerId)`** — Pushes a new drop onto `_groundDrops` with 1800 frames (30 seconds at 60fps) lifetime, a random bob animation offset, and an owner ID for pickup ownership.

- **`updateGroundDrops()`** — Per-frame update, only runs when `Scene.inDungeon`:
  1. Decrements `life` on each drop; removes if expired.
  2. Checks pickup collision with the player (distance < 40px).
  3. Ownership check: player can pick up their own drops or drops from bots that left the party (`ownerLeft`).
  4. On pickup: creates a material item via `createMaterialItem()`, adds to inventory via `addToInventory()`, shows a floating text effect.
  5. If inventory is full, the drop stays on the ground.
  6. Marks drops as `ownerLeft` if the owning bot is no longer in the party.

- **`clearGroundDrops()`** — Clears all drops. Called on scene change.

- **`drawGroundDrops()`** — Renders drops in world space:
  - Tier-colored glow circle (radius scales with tier).
  - Main colored circle (8px radius) with inner white highlight.
  - Sparkle particles for tier 2+ materials (extra sparkle for tier 3+).
  - Count badge ("x2", "x3") if count > 1.
  - Bobbing animation via `Math.sin()`.
  - Fade-out over last 120 frames (2 seconds) before despawn.

## CraftingSystem Namespace (craftingSystem.js)

Authority-side crafting logic. All methods are on the `CraftingSystem` object.

### getMaterialCount(materialId)
Delegates to `countMaterialInInventory(materialId)` from `inventorySystem.js`. Sums across all inventory stacks with matching ID.

### canUpgrade(itemId, tier, toLevel)
Checks if the player can afford upgrading a weapon to the target level:
1. Gets the recipe from `getProgUpgradeRecipe(itemId, tier, toLevel)`.
2. Checks gold >= recipe gold cost.
3. Checks ore counts (prefixed with `ore_`).
4. Checks part counts.
5. Returns `true` only if all costs are met.

### upgrade(gunId, tier, currentLevel)
Executes a level-up upgrade:
1. Calls `canUpgrade()` — returns `false` if not affordable.
2. Deducts gold, ores, and parts via `removeMaterial()`.
3. Applies progression via `_setGunProgress(gunId, tier, toLevel)`.
4. Resets combat state, shows "LEVEL UP!" floating text.
5. Auto-saves via `SaveLoad.save()`.

### canEvolve(gunId, tier)
Checks if the player can prestige a weapon:
1. Weapon must be owned, at the specified tier, and at level 25 (max level).
2. Tier must be < 4 (not already Legendary).
3. Gets cost from `getEvolutionCost(tier, gunId)`.
4. Checks gold and material counts.

### evolve(gunId, tier)
Executes a prestige/evolution:
1. Calls `canEvolve()` — returns `false` if not affordable.
2. Deducts gold and materials.
3. Sets progression to `tier + 1, level 1` via `_setGunProgress()`.
4. Resets combat state, shows "PRESTIGE: [TierName]!" floating text.
5. Auto-saves.

## Upgrade Cost Formula (progressionData.js)

`getProgUpgradeRecipe(itemId, tier, toLevel)` generates upgrade costs dynamically:

### Gold Cost
Base gold scales with level, then multiplied by tier multiplier:

| Tier | Multiplier |
|------|-----------|
| Common (0) | 1x |
| Uncommon (1) | 2.5x |
| Rare (2) | 5x |
| Epic (3) | 10x |
| Legendary (4) | 20x |

| Level Range | Base Gold Formula |
|-------------|-------------------|
| 2-6 | 50 + (level-2) * 25 |
| 7-13 | 200 + (level-7) * 50 |
| 14-19 | 600 + (level-14) * 120 |
| 20-25 | 1500 + (level-20) * 300 |

### Ore Cost
Ores required scale with level. The ore type progresses through mining tiers:

| Level Range | Ore Types |
|-------------|-----------|
| 2-3 | Coal |
| 4-5 | Copper |
| 6 | Iron |
| 7-9 | Steel |
| 10-11 | Gold |
| 12-13 | Amethyst |
| 14-15 | Ruby |
| 16-17 | Diamond |
| 18-19 | Emerald |
| 20-21 | Titanium |
| 22-23 | Mythril |
| 24-25 | Celestium |

### Part Cost
- Generic/category parts: `ceil((toLevel-1) / 2)` of the tier-appropriate part key.
- Part keys are category-specific: `main_gun` uses gun parts, `fishing_rod` uses rod parts, `pickaxe` uses pick parts.
- Gun-specific dungeon materials (from `gunDef.upgradeMaterials`): `max(1, ceil((toLevel/8) * sqrt(tierMult)))`.

### Gun-Specific Upgrade Materials
Each gun requires materials from its source dungeon in addition to generic parts:

| Gun | Source Dungeon | Upgrade Materials |
|-----|----------------|-------------------|
| Storm AR | Azurine | Storm Capacitor, Wind Crystal |
| Heavy AR | Earth-205 | Heavy Barrel Liner, Blast Powder |
| Boomstick | Wagashi | Scatter Core, Gunpowder Charge, Buckshot Mold |
| Ironwood Bow | Vortalis | Ironwood Limb, Sinew String, Fletching Kit |
| Volt-9 | Azurine | Volt Coil, Plasma Cell |

## Evolution Cost Table (progressionData.js)

`EVOLUTION_COSTS` defines base costs per tier transition. `getEvolutionCost(tier, gunId)` swaps generic weapon parts for category-specific parts and adds gun-specific dungeon materials at `3 * (tier + 1)` quantity.

| Transition | Gold | Base Materials |
|-----------|------|----------------|
| Common -> Uncommon | 2,000 | 5 Uncommon Weapon Parts, 10 Steel Ore, 5 Gold Ore |
| Uncommon -> Rare | 5,000 | 8 Rare Weapon Parts, 8 Ruby Ore, 5 Diamond Ore |
| Rare -> Epic | 12,000 | 12 Epic Weapon Parts, 10 Emerald Ore, 8 Titanium Ore |
| Epic -> Legendary | 30,000 | 15 Legendary Weapon Parts, 12 Mythril Ore, 10 Celestium Ore, 5 Dusk Ore |

Note: For guns, "Rare Weapon Parts" becomes "Rare Gun Parts", etc. Dungeon-specific materials are added on top.

## Forge UI (forgeUI.js)

The Forge panel has two tabs: **Weapons** and **Materials**. Panel size is 820x580px. Registered as UI panel `'forge'`.

### Weapons Tab (Grid View)
Displays 5 weapon cards in a horizontal row: Storm AR, Heavy AR, Boomstick, Ironwood Bow, Volt-9. Each card shows:
- Gun icon (via `_drawGunsmithIcon()`)
- Gun name
- Tier name + color
- Level progress ("Lv. X / 25") with a progress bar
- Prestige stars (filled stars for completed tiers)
- "Not Owned" state with buy price hint for unowned guns

Clicking an owned weapon enters the **Weapon Detail** view.

### Weapon Detail (Prestige View)
Shows a single weapon with:
- Large gun icon + name + current tier/level
- **Prestige bar**: 4 segmented sections with stars, filled per completed tier
- **Level bar**: progress within current tier (1-25)
- **Action section** (one of three states):
  - **Upgrade**: material requirement cards in a 4-column grid (gold, ores, parts, dungeon materials), each showing current count vs. required, colored green (met) or red (unmet). Upgrade button enabled when all costs are met.
  - **Evolve**: warning that prestige resets level to 1, next-tier preview bar, material requirement cards, pulsing evolve button.
  - **Max**: "LEGENDARY MAX" shimmer text when weapon is tier 4 level 25.

Back arrow returns to grid view.

### Materials Tab
Displays all 28 materials from `CRAFT_MATERIALS` plus any ores from `ORE_TYPES` (if count > 0) in a scrollable 4-column grid. Each card shows:
- Tier-colored dot
- Material name
- Current count ("x0", "x3", etc.)
- Source dungeon label

Scrollable with mouse wheel.

## Material Flow: Mob Kill to Crafting

```
Mob killed in dungeon
  → Events.emit('mob_killed')
    → lootDropSystem subscriber
      → getMobDrop(mobType, dungeonId, floor)
        → (roll dropChance, pick from DROP_TABLES or DUNGEON_DROP_POOL)
      → spawnGroundDrop(materialId, count, mob.x, mob.y)
        → drop appears on ground with bobbing animation

Player walks over drop (distance < 40px)
  → updateGroundDrops() pickup check
    → createMaterialItem(materialId, count)
    → addToInventory(item)
    → floating text effect

Player opens Forge panel
  → selects weapon → sees upgrade/evolve costs
    → CraftingSystem.canUpgrade() / canEvolve()
      → checks gold + countMaterialInInventory() for each required material
    → clicks Upgrade/Evolve button
      → CraftingSystem.upgrade() / evolve()
        → deducts gold, removeMaterial() for each cost
        → _setGunProgress() advances tier/level
        → SaveLoad.save()
```

## Connections to Other Systems
- **Progression System** — Upgrade recipes and evolution costs are generated by `progressionData.js`. Tier/level progression stored via `_getGunProgress()` / `_setGunProgress()`.
- **Mining System** — Ores mined from mining rooms are used as upgrade ingredients. Ore items share the `type: 'material'` inventory type.
- **Inventory System** — Materials are stackable inventory items. `countMaterialInInventory()` and `removeMaterial()` handle counting and consumption.
- **Event Bus** — `Events.on('mob_killed')` triggers drop spawning.
- **Scene System** — Drops only spawn and update when `Scene.inDungeon` is true. `clearGroundDrops()` runs on scene change.
- **Gunsmith** — Weapons must be purchased from the Gunsmith before they can be upgraded/evolved at the Forge.
- **Save/Load** — Crafting operations auto-save via `SaveLoad.save()`. Material inventory persists across sessions.
- **Combat State** — `resetCombatState('lobby')` is called after upgrade/evolve to recalculate weapon stats.
- **Party System** — Ground drops have ownership. Bot-owned drops become claimable if the bot leaves the party.

## Gotchas & Rules
- Upgrades go from level 1 to 25 within a tier. Level 1 is the starting level (no upgrade needed). Recipes exist for levels 2-25.
- Evolution requires level 25 AND sufficient materials/gold. It resets the weapon to tier+1, level 1.
- Maximum progression is Legendary (tier 4) level 25. No further upgrades or evolutions are possible.
- Generic weapon parts (e.g., "Rare Weapon Parts") are swapped to category-specific parts in recipes: guns use "Rare Gun Parts", rods use "Rare Rod Parts", pickaxes use "Rare Pick Parts".
- Ground drops despawn after 30 seconds (1800 frames). They fade out over the last 2 seconds.
- Ground drops have ownership: only the killing player/bot's owner can pick them up. If a bot leaves the party, its drops become claimable by anyone.
- Skeleton/summon kills do not produce drops.
- If the player's inventory is full, ground drops remain on the ground (they are not lost).
- The `DEFAULT_DROP_CHANCE` (12%) applies to any mob type not explicitly listed in `DROP_TABLES`.
