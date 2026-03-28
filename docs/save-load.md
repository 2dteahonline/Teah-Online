# Save / Load System

## Overview

The save/load system persists player identity, cosmetics, settings, keybinds, permanent progression, materials, and spar data to `localStorage`. It uses a versioned schema (currently v10) with backward-compatible migrations from v1 through v9. Gold, most inventory items, equipment, and dungeon progress are intentionally NOT saved -- the game follows a session-based roguelike design where each run starts fresh. Materials and main gun/pickaxe progression are the exceptions that persist across sessions.

## Files

- `js/core/saveLoad.js` -- `SaveLoad` object (save/load/clear/autoSave), `SAVE_KEY`, `SAVE_VERSION`, settings panel rendering, `SETTINGS_DATA`.

## Key Functions & Globals

| Name | Type | Description |
|------|------|-------------|
| `SAVE_KEY` | const `'dungeon_game_save'` | localStorage key |
| `SAVE_VERSION` | const `10` | Current schema version |
| `SaveLoad.save()` | method | Serializes all persistent data to localStorage |
| `SaveLoad.load()` | method | Reads from localStorage, applies migrations, restores state. Returns `true` on success |
| `SaveLoad.clear()` | method | Removes the save key from localStorage |
| `SaveLoad.autoSave()` | method | Debounced save (1-second delay). Use after incremental changes |
| `SETTINGS_DATA` | const | Settings panel layout: maps tab names to arrays of `{ label, key, type, options? }` |
| `drawSettingsPanel()` | function | Renders the settings UI (toggles, selectors, keybinds) |
| `cookingProgress` | const | Persistent cooking state: `lifetimeOrdersTotal`, `lifetimeOrdersByShop`, `purchasedShops` |

## How It Works

### Save Schema (v10)

The save data is a single JSON object stored at `localStorage['dungeon_game_save']`:

```
{
  version: 10,

  keybinds: {
    moveUp, moveDown, moveLeft, moveRight,
    shootUp, shootDown, shootLeft, shootRight,
    slot1, slot2, slot3, slot4, slot5,
    chat, profile, interact, identity
  },

  settings: {
    nicknames, animations, dayNightWeather, bloodAnim, deathAnim,
    hotbarPosition, spriteMode, showDebugOverlay, showSpeedTracker,
    masterVolume, sfx, music, ambient,
    damageNumbers, healthBars, mobHpText, killFeed, waveAnnounce,
    playerHpBar, showOwnHitbox, showOtherHitbox,
    privateStats, language, currency, showOnlineTime, relationshipStatus,
    chatVisibility, pmFriendsOnly, disableAllMessages, receiveBotMessages,
    appearOffMap
  },

  identity: {
    name,          // player display name
    status,        // playerStatus string
    faction,       // playerFaction (Wild West, Frostlands, etc.)
    country,       // playerCountry
    gender         // playerGender (Male/Female)
  },

  cosmetics: {
    skin, hair, shirt, pants, shoes, hat, glasses,
    gloves, belt, cape, tattoo, scars, earring, necklace,
    backpack, warpaint, eyes, facialHair, headId
  },

  progression: {
    playerLevel,     // overall player level
    playerXP,        // current XP toward next level
    skillData,       // { skillName: { level, xp } } for all skills
    gunLevels,       // { gunId: { tier, level } | 0 } -- permanent gun progression
    pickaxeLevels,   // { pickId: { tier, level } | 0 } -- permanent pickaxe progression
    discoveredOres   // array of ore IDs the player has found
  },

  fishing: {
    baitCount,       // number of bait items
    stats: {
      totalCaught,
      biggestFish,
      biggestFishValue,
      totalCasts
    }
  },

  farming: {
    landLevel,       // farm land upgrade level
    equippedHoe,     // current hoe tier
    bucketOwned,     // whether watering bucket has been purchased
    stats: {
      totalHarvested,
      totalEarned,
      bestCrop,
      bestCropValue
    }
  },

  cookingProgress: {
    lifetimeOrdersTotal,     // total orders completed across all restaurants
    lifetimeOrdersByShop,    // { shopId: count } per-restaurant totals
    purchasedShops,          // array of unlocked restaurant IDs (starts with 'street_deli')
  },

  quickSlots: [              // 4-element array (slots 1-4), each null or { id, name, equipType, color, cropId }
    null,                    // backwards-compatible: old 3-slot saves load fine (4th defaults to null)
    null,                    // see hotbar-and-quickslots.md for full details
    null,
    null
  ],

  sparProgress: {            // v9+: spar win/loss stats
    totals: { wins, losses, draws },
    byMode: { ... },
    streak: { ... }
  },

  sparLearning: {            // v9+: spar bot learning profile (Elo, history, tactics)
    version,                 // currently 8 (older versions wiped on load)
    history: [...],          // last 20 match records
    ...                      // hierarchical anti-bottom tactics, trap zones, phase rewards
  },

  gunSettings: {             // per-gun side preferences
    [gunId]: { ... }
  },

  ctxSliders: {              // CT-X weapon slider values
    freeze, rof, spread
  },

  materials: {               // v10+: persistent material counts (extracted from inventory)
    [materialId]: count,     // e.g. { ore_iron: 5, ore_gold: 2 }
  }
}
```

### What Is NOT Saved

The following are session-only (reset each page load / dungeon run):

- **Gold** -- earned fresh each dungeon run
- **Inventory items** -- found/purchased during a run (except materials, which are persisted since v10, and main guns/pickaxes which are re-created from gunLevels/pickaxeLevels)
- **Equipment** -- gun/melee/armor equipped during a run
- **Dungeon progress** -- floor, wave, kills, stairs state
- **Combat state** -- HP (reset to base), bullets, mobs, effects
- **Farm tiles** -- tile state is session-only; only `landLevel` and stats persist
- **Fishing rod** -- rod is an inventory item (session-only); only bait count and stats persist

This is by design: the game is a roguelike where each dungeon run starts fresh. Only meta-progression (gun levels, skills, cosmetics) carries over.

### Gun/Pickaxe Level Format

Gun and pickaxe levels support two formats for backward compatibility:

- **New format (v6+)**: `{ tier: 0-4, level: 1-25 }` -- 5 tiers x 25 levels = 125 power steps
- **Old format (pre-v6)**: plain integer -- migrated on load to `{ tier: 0, level: N }`

On load, owned guns/pickaxes are re-created as inventory items via `createMainGun()` / `createPickaxe()` and added to the player's inventory.

### Migration History

| Version | Changes |
|---------|---------|
| v1 | Base: keybinds, settings, identity, cosmetics |
| v2 | Added `progression` block (playerLevel, playerXP, skillData) |
| v3 | Added `fishing` block (rodTier, rodDurability, baitCount, stats) |
| v4 | Fishing rod moved to inventory item; fishing save now only stores baitCount + stats. Old `rodTier` migrated to an inventory rod item |
| v5 | Added `farming` block (landLevel, equippedHoe, bucketOwned, stats). Includes migration: old saves with hoe as melee weapon get hoe moved to `farmingState.equippedHoe` and removed from inventory |
| v6 | Added `gunLevels` to progression (permanent gun progression with tier/level objects) |
| v7 | Added `pickaxeLevels` and `discoveredOres` to progression |
| v8 | Added `cookingProgress` block (lifetimeOrdersTotal, lifetimeOrdersByShop, purchasedShops) |
| v9 | Added `sparProgress` (win/loss/streak stats) and `sparLearning` (Elo, match history, bot training data). Also added `gunSettings` (per-gun side prefs) and `ctxSliders` (CT-X weapon sliders) |
| v10 | Materials stored as separate data (decoupled from inventory for persistence across sessions) |

Migration is implicit: the `load()` method checks for each block's existence and applies defaults for missing fields. The v3-to-v4 fishing rod migration explicitly checks `data.version < 4` and converts old `rodTier` to an inventory item. The spar learning profile (`sparLearning`) has its own internal version (currently 8) — saves with `sparLearning.version < 8` are wiped and replaced with fresh defaults, since older data is structurally incompatible.

### Settings Migration

One notable settings migration: old saves with `playerIndicator` (single boolean) are split into `showOwnHitbox` and `showOtherHitbox` (two separate toggles). If the old key exists and the new keys don't, the migration applies automatically during load.

### Auto-Save Behavior

`SaveLoad.autoSave()` uses a 1-second debounce. Multiple rapid changes (e.g., dragging a color picker) coalesce into a single write. It is called by:

- Settings changes (toggles, selectors)
- Keybind changes
- Identity changes (faction, country, gender, relationship)
- Gun level changes (via `/gun` command)
- Cosmetic save (explicit Save button in customize panel)

### Startup

`SaveLoad.load()` is called immediately when `saveLoad.js` executes (at script load time). After loading, `useSpriteMode` is synced from `gameSettings.spriteMode`.

## Connections to Other Systems

- **Input/Keybinds** (`settings.js`): Keybinds are loaded into the `keybinds` object and saved on rebind.
- **Progression** (`progressionData.js`, `inventorySystem.js`): Gun/pickaxe levels restored from save; items re-created via `createMainGun()` / `createPickaxe()`.
- **Fishing** (`fishingSystem.js`): Bait count and stats restored; old rod tiers migrated to inventory items.
- **Farming**: Land level and stats restored; tiles are session-only.
- **Settings Panel** (`saveLoad.js`): The settings UI (`drawSettingsPanel`) is defined in the same file. Renders tabs (General, Keybinds, Sounds, Indicators, Profile, Message, Privacy) with toggles and selectors. Tab definitions are in `settings.js` (`SETTINGS_TABS`), data layout in `SETTINGS_DATA` within `saveLoad.js`.
- **Chat Commands**: `/save` triggers `SaveLoad.save()`, `/resetsave` triggers `SaveLoad.clear()`.

## Gotchas & Rules

- **Do not save session data**: Gold, dungeon equipment, and dungeon progress are intentionally excluded. The roguelike design means each run starts fresh. Materials and permanent gun/pickaxe progression are exceptions that persist via dedicated save blocks.
- **Backward compatibility is required**: The `load()` method must handle saves from any version (v1 through v10). Always check for existence of blocks/fields before reading.
- **Gun level format ambiguity**: Always handle both integer and `{ tier, level }` formats when reading `gunLevels` or `pickaxeLevels`. Use `typeof saved === 'number'` to detect old format.
- **autoSave is debounced**: Do not call `save()` directly for frequent changes; use `autoSave()` to avoid excessive localStorage writes.
- **Cosmetics use explicit save**: The customize panel has Save/Cancel buttons. `applyCosmetic()` does NOT trigger autoSave -- the caller decides when to persist.
- **Load runs at script load time**: `SaveLoad.load()` executes as soon as `saveLoad.js` is parsed. Any globals it references (`keybinds`, `gameSettings`, `player`, `skillData`, `fishingState`, etc.) must already exist.
