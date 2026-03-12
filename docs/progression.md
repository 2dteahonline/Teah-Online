# Progression System

## Overview

The progression system provides 125 power steps per weapon through a 5-tier by 25-level grid. Weapons start at Common Lv.1 and can be upgraded through ore-gated recipes and evolved at Lv.25 to advance to the next tier. This system covers main guns, fishing rods, farming hoes, and pickaxes. Dungeon shop items (session-scoped armor, weapons) are NOT part of this system. A parallel skill XP system tracks player proficiency across 6 categories.

## Files

- `js/shared/progressionData.js` -- `PROG_ITEMS` registry, `PROGRESSION_CONFIG`, stat interpolation, evolution costs, upgrade recipes
- `js/client/ui/panels.js` -- `_getGunProgress()`, `_setGunProgress()`, gunsmith UI rendering
- `js/authority/inventorySystem.js` -- `createMainGun()`, `createPickaxe()`, item creation from progression data
- `js/shared/skillRegistry.js` -- `SKILL_REGISTRY`, skill categories, derived lookups
- `js/authority/waveSystem.js` -- `addSkillXP()`, `addPlayerXP()`, player leveling, `skillData`

## Key Functions & Globals

### Stat Interpolation

| Function | File | Purpose |
|---|---|---|
| `getProgressedStats(itemId, tier, level)` | `progressionData.js` | Returns computed stats for any PROG_ITEM at a given tier+level via linear interpolation |
| `createProgressedItem(itemId, tier, level)` | `progressionData.js` | Creates an inventory-ready item object from a PROG_ITEMS definition |
| `createMainGun(gunId, tier, level)` | `inventorySystem.js` | Creates a gun inventory item; supports both old `(id, level)` and new `(id, tier, level)` signatures |
| `createPickaxe(pickId, tier, level)` | `inventorySystem.js` | Creates a pickaxe inventory item; same dual-signature support |

### Evolution

| Function | File | Purpose |
|---|---|---|
| `canEvolve(tier, level)` | `progressionData.js` | Returns `true` if `tier < 4` and `level >= 25` |
| `getEvolutionCost(tier)` | `progressionData.js` | Returns `{ gold, materials }` for evolving from current tier |
| `getProgUpgradeRecipe(itemId, tier, toLevel)` | `progressionData.js` | Returns `{ gold, ores, parts }` for upgrading to a specific level |

### Progress Tracking

| Function | File | Purpose |
|---|---|---|
| `_getGunProgress(gunId)` | `panels.js` | Returns `{ tier, level, owned }` from `window._gunLevels` |
| `_setGunProgress(gunId, tier, level)` | `panels.js` | Writes `{ tier, level }` to `window._gunLevels` |

### Skill XP

| Function | File | Purpose |
|---|---|---|
| `addSkillXP(skillName, amount)` | `waveSystem.js` | Adds XP to a skill and player level simultaneously |
| `addPlayerXP(amount)` | `waveSystem.js` | Adds XP directly to the overall player level |
| `skillXpForLevel(lvl)` | `waveSystem.js` | XP curve: `floor(80 * 1.12^(lvl-1))` |
| `xpForLevel(lvl)` | `waveSystem.js` | Player XP curve: `floor(50 * 1.08^(lvl-1))` |

### Helpers

| Function | File | Purpose |
|---|---|---|
| `getProgItemsByCategory(category)` | `progressionData.js` | Returns all PROG_ITEMS ids for a category (e.g. `'main_gun'`) |
| `getTierLevelDisplay(tier, level)` | `progressionData.js` | Returns display string like `"Rare Lv.14"` |
| `getProgItemDef(itemId)` | `progressionData.js` | Returns the PROG_ITEMS definition for an item |

## How It Works

### 5-Tier x 25-Level Grid

```
Tier 0: Common     (levels 1-25)  --[evolve at L25]--> Tier 1
Tier 1: Uncommon   (levels 1-25)  --[evolve at L25]--> Tier 2
Tier 2: Rare       (levels 1-25)  --[evolve at L25]--> Tier 3
Tier 3: Epic       (levels 1-25)  --[evolve at L25]--> Tier 4
Tier 4: Legendary  (levels 1-25)  -- max tier
```

Total: 125 power steps per weapon.

### Tier Configuration

| Tier | Name | Color | Upgrade Cost Multiplier |
|---|---|---|---|
| 0 | Common | `#888` | 1x |
| 1 | Uncommon | `#5fca80` | 2.5x |
| 2 | Rare | `#4a9eff` | 5x |
| 3 | Epic | `#ff9a40` | 10x |
| 4 | Legendary | `#ff4a8a` | 20x |

### PROG_ITEMS Registry

Each item in `PROG_ITEMS` defines:

```js
{
  id: 'storm_ar',
  name: 'Storm AR',
  category: 'main_gun',       // main_gun, fishing_rod, farming_hoe, pickaxe
  type: 'gun',                 // gun or melee
  subtype: 'assault_rifle',    // weapon subtype
  desc: 'Fast, reliable full-auto workhorse',
  buyPrice: 200,
  bulletColor: { main, core, glow },
  flags: { pierce: true, ... },
  tiers: [
    // T0 Common
    { base: { damage: 25, fireRate: 6, magSize: 32, reloadSpeed: 50 },
      max:  { damage: 85, fireRate: 3, magSize: 55, reloadSpeed: 30 } },
    // T1 Uncommon ... T4 Legendary
  ]
}
```

**Constraint**: `tier[N+1].base >= tier[N].max` for ascending stats (damage, magSize). For descending stats (fireRate, reloadSpeed), `tier[N+1].base <= tier[N].max`. This guarantees no power loss on evolution.

### Main Guns (5 weapons)

| ID | Name | Subtype | T0 Base Damage | T4 Max Damage | Key Trait |
|---|---|---|---|---|---|
| `storm_ar` | Storm AR | Assault Rifle | 25 | 500 | Fast, reliable full-auto |
| `heavy_ar` | Heavy AR | Assault Rifle | 45 | 700 | Slow but hits hard |
| `boomstick` | Boomstick | Shotgun | 18 (x3 pellets) | 260 (x10 pellets) | Close-range pellet spread |
| `ironwood_bow` | Ironwood Bow | Bow | 60 | 950 | Pierce through mobs |
| `volt_9` | Volt-9 | SMG | 12 | 200 | Bullet hose, random spread |

Additional categories: 4 fishing rods, 4 farming hoes, 8 pickaxes.

### Stat Interpolation Formula

`getProgressedStats()` uses linear interpolation within each tier:

```
t = (level - 1) / 24          // 0 at L1, 1 at L25
stat = round(base + (max - base) * t)
```

All numeric fields in `base`/`max` are interpolated. Non-numeric flags (pierce, isArrow) are applied directly from `def.flags`.

### Evolution Mechanics

When a weapon reaches T(N) L25, the player can evolve it to T(N+1) L1:

**Evolution Costs**:

| Transition | Gold | Materials |
|---|---|---|
| T0 -> T1 (Common -> Uncommon) | 2,000g | 5 uncommon_weapon_parts, 10 steel, 5 gold_ore |
| T1 -> T2 (Uncommon -> Rare) | 5,000g | 8 rare_weapon_parts, 8 ruby, 5 diamond |
| T2 -> T3 (Rare -> Epic) | 12,000g | 12 epic_weapon_parts, 10 emerald, 8 titanium |
| T3 -> T4 (Epic -> Legendary) | 30,000g | 15 legendary_weapon_parts, 12 mythril, 10 celestium, 5 dusk |

### Upgrade Recipes

`getProgUpgradeRecipe(itemId, tier, toLevel)` generates costs based on level brackets. The tier multiplier scales all costs (T0 = 1x through T4 = 20x):

| Level Bracket | Gold Range (T0) | Ore Types |
|---|---|---|
| L2-6 | 50-150g | Coal, Copper, Iron |
| L7-13 | 200-500g | Steel, Gold Ore, Amethyst |
| L14-19 | 600-1,200g | Ruby, Diamond, Emerald |
| L20-25 | 1,500-3,000g | Titanium, Mythril, Celestium |

Each upgrade also costs tier-appropriate weapon parts (e.g. `common_weapon_parts` at T0, `legendary_weapon_parts` at T4). Part count = `ceil((toLevel - 1) / 2)`.

### Skill XP System

Skills are organized into 6 categories defined in `SKILL_REGISTRY` (`js/shared/skillRegistry.js`):

| Category | Skills | Example Skills |
|---|---|---|
| Killing | 12 | Total Kills, Headshots, Multi Kills, Kill Streaks |
| Sparring | 6 | Duels Won, Combos Landed, Parries |
| Basing | 4 | Walls Built, Turrets Placed, Repairs Done |
| Dungeons | 10 | Floor Clearing, Boss Slaying, Speed Runs |
| Events | 14 | Games Played, Tournaments, Hide N Seek, Treasure Hunt |
| Jobs | 10 | Mining, Fishing, Farming, Cooking, Woodcutting |

**XP curves**:
- Skill XP per level: `floor(80 * 1.12^(lvl-1))` -- no level cap
- Player XP per level: `floor(50 * 1.08^(lvl-1))` -- cap at level 1000
- Adding skill XP also contributes the same amount to player XP

**Data structures**:
- `skillData[skillName]` = `{ level, xp }` -- initialized at `{ level: 1, xp: 0 }` for every skill in `ALL_SKILLS`
- `SKILL_CATEGORIES[cat]` = array of skill names
- `SKILL_ICONS[skill]`, `SKILL_COLORS[skill]` -- display metadata per skill

## Connections to Other Systems

- **Inventory System** (`inventorySystem.js`) -- `createMainGun()` and `createPickaxe()` consume `getProgressedStats()` to build inventory items
- **Gunsmith UI** (`panels.js`) -- Reads/writes progress via `_getGunProgress()` / `_setGunProgress()`, shows upgrade costs and evolution button
- **Save/Load** (`saveLoad.js`) -- Persists `_gunLevels` (supports both old integer and new `{tier, level}` format), skill data, player level/XP
- **Item Data** (`itemData.js`) -- `PALETTE.tierColors` and `PALETTE.tierNames` match `PROGRESSION_CONFIG` values
- **Mining System** -- Pickaxe progression uses the same PROG_ITEMS tiers; ores from mining feed upgrade recipes
- **Wave System** -- Mob kills trigger `addSkillXP('Total Kills', ...)` and related skill XP

## Gotchas & Rules

- **Dual-signature support**: `createMainGun(id, level)` still works (assumes tier 0) for backward compatibility. New code should use `createMainGun(id, tier, level)`.
- **`_getGunProgress()` handles legacy format**: `window._gunLevels[id]` can be a plain integer (old saves) or `{tier, level}` object (new saves). The function normalizes both.
- **T0 base stats match the original game values exactly** -- this ensures backward compatibility with existing saves. T1-T4 are scaled projections.
- **No power loss on evolution**: `tier[N+1].base >= tier[N].max` for ascending stats. A weapon at T0 L25 is slightly weaker than T1 L1.
- **Session-scoped items are excluded**: Dungeon shop guns, melee weapons, and armor are NOT in the PROG_ITEMS system -- they reset each dungeon run.
- **Upgrade cost multipliers compound**: A T4 L25 upgrade costs 20x what the same level costs at T0.
- **Debug command**: `/gun <id> [tier level]` or `/gun <id> [level]` for testing (defined in `commands.js`)
