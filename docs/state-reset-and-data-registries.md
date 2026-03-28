# State Reset & Shared Data Registries

Covers `resetCombatState()` and all shared data registries that don't have dedicated docs pages.

**Source files:**
- `js/authority/stateReset.js` -- centralized state reset + dungeon rendering (shop, stairs, victory)
- `js/shared/floorConfig.js` -- per-dungeon per-floor wave compositions, palettes, hazards
- `js/shared/dungeonRegistry.js` -- dungeon metadata registry
- `js/shared/skillRegistry.js` -- skill categories, icons, colors
- `js/shared/armorVisuals.js` -- tier color palettes and glow animation
- `js/shared/gunData.js` -- 5 main guns, upgrade materials, recipes
- `js/shared/itemData.js` -- item categories, palette, stat renderers
- `js/shared/oreData.js` -- 15 ore types across 4 mine rooms
- `js/shared/partyData.js` -- party config constants, bot cosmetic presets
- `js/shared/mobTypes.js` -- MOB_TYPES, MOB_CAPS, CROWD_EXEMPT_TYPES, MOB_ENTITY_ARRAYS

---

## State Reset (`stateReset.js`)

### `resetCombatState(mode)`

Single centralized reset function. Before this existed, resets were duplicated in 4 places with subtle differences (and bugs). Every scene transition calls this with the appropriate mode.

**Modes:** `'lobby'`, `'dungeon'`, `'death'`, `'floor'`, `'mine'`, `'cooking'`, `'farm'`, `'hideseek'`

### What Gets Cleared Per Mode

#### Always (all modes)

These are cleared unconditionally at the start of every `resetCombatState()` call:

| What | How |
|------|-----|
| Mob entity sub-arrays | Iterates `MOB_ENTITY_ARRAYS` on each mob, clears arrays, sets to `null` |
| `mobs` | `.length = 0` |
| `bullets` | `.length = 0` |
| `hitEffects` | `.length = 0` |
| `deathEffects` | `.length = 0` |
| `mobParticles` | `.length = 0` |
| `medpacks` | `.length = 0` |
| `oreNodes` | `.length = 0` |
| `_orePickups` | `.length = 0` (if defined) |
| Ground drops | `clearGroundDrops()` (if defined) |
| `waveState` | Reset to `"waiting"` |
| `waveTimer` | Reset to `0` |
| `activeSlot` | Reset to `0` |
| `activeHotbarSlot` | Reset to `0` |
| Phase state | `resetPhaseState()` |
| StatusFX | `StatusFX.clearPoison()` and `StatusFX.clearPlayer()` |
| `freezeTimer` | Reset to `0` |
| `contactCooldown` | Reset to `0` |
| Dev tool flags | `_mobsFrozen=false`, `_godMode=false`, `_mobsNoFire=false`, `_gameSpeed=1`, `_testShootBot=null` (note: `_opMode` is NOT reset) |
| Telegraph system | `TelegraphSystem.clear()` (if defined) |
| Hazard system | `HazardSystem.clear()` (if defined) |
| `_currentDamageTarget` | Reset to `null` |
| Cooking state | `resetCookingState()` (if defined) |
| Farming state | `resetFarmingState()` (if defined) |
| Deli NPCs | `deliNPCs.length = 0` (if defined) |

#### Party Reset (lobby and death only)

| What | How |
|------|-----|
| Party system | `PartySystem.reset()` — only on `mode === 'lobby'` or `mode === 'death'` |

#### Inventory & Equipment Reset

Runs for all modes **except** `'floor'`, `'mine'`, `'cooking'`, `'farm'`, `'hideseek'`.

| What | Details |
|------|---------|
| `quickSlots` | All 4 slots set to `null` |
| `inventory` | Cleared and re-populated with defaults |
| Default guns | `DEFAULT_GUN` + `CT_X_GUN` added |
| Default melee | `DEFAULT_MELEE` added |
| Pickaxes | Restored from `window._pickaxeLevels` (supports both integer and `{tier, level}` format); falls back to starter pickaxe |
| Fishing rod | Restored from `PROG_ITEMS['bronze_rod']` or `ROD_TIERS[0]`; includes `currentDurability` |
| Farming hoe | `HOE_TIERS[0]` added if not already in inventory |
| Potions | 3x Health Potion via `createConsumable()` |
| Owned main guns | Restored from `window._gunLevels` (supports both integer and `{tier, level}` format) |
| `gun` state | `damage`, `magSize`, `ammo` reset to `DEFAULT_GUN` values; `reloading=false`, `reloadTimer=0`, `fireCooldown=0`, `recoilTimer=0`, `special=null` |
| `melee` state | `damage`, `critChance`, `range`, `cooldownMax` reset to `DEFAULT_MELEE`; `cooldown=0`, `swinging=false`, `swingTimer=0`, `special=null`, all dash fields zeroed |
| `shrine` | `charges=0`, `active=false`, `timer=0` |
| `godspeed` | `charges=0`, `active=false`, `timer=0` |
| `playerEquip` | `gun=DEFAULT_GUN`, `melee=DEFAULT_MELEE`, `armor/boots/pants/chest/helmet=null` |
| `fireRateBonus` | Reset to `0` |
| `player.baseSpeed` | Reset to `GAME_CONFIG.PLAYER_BASE_SPEED` |
| `potion` | `count=3`, `cooldown=0` |

#### Lobby Mode (`mode === 'lobby'`)

| What | Details |
|------|---------|
| `player.maxHp` | Capped to `50` |
| `player.hp` | `Math.min(player.hp, 50)` |

#### Dungeon/Death Mode (`mode === 'dungeon'` or `mode === 'death'`)

| What | Details |
|------|---------|
| `lives` | Reset to `3` |
| `wave` | Reset to `0` |
| `kills` | Reset to `0` |
| `dungeonFloor` | Set from `pendingDungeonFloor` (if >= 1), otherwise `1`; `pendingDungeonFloor` cleared |
| `currentDungeon` | Set from `pendingDungeonType` (validated via `validateDungeonType()`); cleared |
| `dungeonReturnLevel` | Set from `pendingReturnLevel`; cleared |
| `stairsOpen` | `false` |
| `stairsAppearTimer` | `0` |
| `dungeonComplete` | `false` |
| `victoryTimer` | `0` |
| `reviveUsed` | `false` |
| Per-entity flags | `_reviveUsed=false`, `_shadowStep=false`, `_phaseTimer=0` on player + all party members |
| HP | `recalcMaxHp()` then `player.hp = player.maxHp` |
| `contactCooldown` | `60` (1-second grace period) |
| Shop prices | `window._resetShopPrices()` |
| Hazards | `HazardSystem.initForFloor(dungeonFloor)` |

#### Death Mode Additional (`mode === 'death'`)

| What | Details |
|------|---------|
| `gold` | Reset to `0` |
| `deathGameOver` | Reset to `false` |

#### Floor Transition (`mode === 'floor'`)

Partial reset -- keeps equipment, inventory, gold, and weapon specials.

| What | Details |
|------|---------|
| `wave` | Reset to `0` |
| `stairsOpen` | `false` |
| `stairsAppearTimer` | `0` |
| HP | `recalcMaxHp()` then `player.hp = player.maxHp` |
| `potion.count` | `+= 2` (bonus potions per floor) |
| `reviveUsed` | `false` on player + all party members |
| Melee transient state | All dash fields zeroed, `swinging=false`, `swingTimer=0`, `cooldown=0` |
| Ultimate transient state | `shrine.active=false`, `godspeed.active=false` (charges preserved) |
| Gun transient state | `reloading=false`, `reloadTimer=0`, `fireCooldown=0`, `recoilTimer=0`, `ammo=magSize` |
| Bot state | All bot melee/dash/grab/gun transient state reset; `ai.meleeCD=0`; per-entity combat flags cleared |
| Weapon specials | Defensively re-applied from `playerEquip.melee.special` and `playerEquip.gun.special` |
| Hazards | `HazardSystem.initForFloor(dungeonFloor)` |

#### Mine Mode (`mode === 'mine'`)

| What | Details |
|------|---------|
| Ore nodes | `spawnOreNodes()` |
| Mining state | `miningTarget=null`, `miningTimer=0`, `miningProgress=0` |

#### Cooking, Farm, HideSeek Modes

These modes only trigger the "always" section. They are excluded from the inventory/equipment reset block (`mode !== 'floor' && mode !== 'mine' && mode !== 'cooking' && mode !== 'farm' && mode !== 'hideseek'`), meaning they also skip inventory rebuild. The cooking and farming reset functions are called in the "always" block regardless of mode.

### How to Add a New Reset Path

1. Add your mode string to the `resetCombatState(mode)` function
2. The "always" block runs automatically for every mode
3. If the new mode should **keep** inventory/equipment, add it to the exclusion check: `mode !== 'floor' && mode !== 'mine' && mode !== 'cooking' && mode !== 'farm' && mode !== 'hideseek' && mode !== 'YOUR_MODE'`
4. Add a mode-specific block at the bottom (e.g., `if (mode === 'your_mode') { ... }`)
5. If the new mode needs party reset, add it to the `(mode === 'lobby' || mode === 'death')` check
6. Call `resetCombatState('your_mode')` from your scene entry code

---

## Floor Config (`floorConfig.js`)

### Overview

Per-dungeon, per-floor metadata. Keyed by dungeon type then floor number: `FLOOR_CONFIG[dungeonType][floorNum]`. Every dungeon uses this system. The file is large (~1344 lines) because it defines wave compositions for all 6 dungeons x 5 floors each.

### WAVE_TEMPLATES

Reusable wave composition templates. Each defines mob mix only (no difficulty scaling -- that's handled by `waveSystem.js`).

```js
const WAVE_TEMPLATES = {
  template_name: {
    primary: [{ type: 'mob_type_key', weight: Number }],  // main mob pool
    support: [{ type: 'mob_type_key', weight: Number }],  // secondary mob pool
    primaryPct: Number,  // 0-1, fraction of wave that is primary mobs
    theme: String,       // display name for the wave
  },
};
```

**Defined templates:** `grunt_rush`, `archer_ambush`, `speed_swarm`, `heavy_assault`, `mummy_ambush`, `witch_coven`, `blitz_wave`, `elite_wave`, `pirate_rush`, `pirate_gunners`, `pirate_heavy`, `pirate_mixed`

### SUBFLOOR_BLUEPRINTS

Reusable subFloor structures that reference templates by name. Boss subFloors are NOT blueprinted -- they stay explicit per floor.

```js
const SUBFLOOR_BLUEPRINTS = {
  blueprint_name: {
    waves: [Number],           // wave numbers this subfloor covers
    theme: String,             // display theme name
    waveTemplates: {           // wave# -> template_name mapping
      [waveNum]: 'template_name',
    },
  },
};
```

**Defined blueprints:** `cave_early` (waves 1-4), `cave_late` (waves 6-9)

### Builder Functions

#### `_resolveSubFloor(subFloor)`

Resolves a subFloor definition into a concrete subFloor object:
- If `waveTemplates` present: expands template names into `waveComps` (deep-cloned to prevent cross-floor mutation)
- Inline `waveComps` take priority over templates for the same wave number
- Boss subFloors or fully-inline subFloors pass through unchanged
- Returns `{ waves, theme, waveComps }` or the original if no templates

#### `_buildFloor(floorDef)`

Builds a full floor entry:
```js
{
  name: String,
  subFloors: Array,   // each resolved via _resolveSubFloor
  palette: Object,    // tile colors (or {})
  hazards: Array,     // hazard definitions (or [])
}
```

### Per-Floor Palette System

Each floor defines a color palette for tile rendering:

```js
palette: {
  floor1: '#hex',      // primary floor tile color
  floor2: '#hex',      // secondary floor tile color
  wall: '#hex',        // wall tile color
  wallAccent: '#hex',  // wall accent/highlight color
  accent2: '#hex',     // secondary accent color
  gridLine: '#hex',    // grid line overlay color
}
```

**Cave palette:** `floor1:'#3a3840'`, `floor2:'#383638'`, `wall:'#2a2a32'`, `wallAccent:'#454552'`, `accent2:'#8a2020'`, `gridLine:'#32303a'`

**Azurine palette:** `floor1:'#2a2a3a'`, `floor2:'#242438'`, `wall:'#1a1a2a'`, `wallAccent:'#00ccff'`, `accent2:'#ff00aa'`, `gridLine:'#333348'`

### Floor Structure (per subFloor)

Normal wave subFloor:
```js
{
  waves: [1, 2, 3, 4],
  theme: 'theme_name',
  waveComps: {
    1: { primary: [...], support: [...], primaryPct: 0.85, theme: 'Display Name' },
    // ...
  },
}
```

Boss wave subFloor:
```js
{
  waves: [5],
  theme: 'boss_arena',
  boss: 'mob_type_key',
  bossComp: {
    theme: 'Boss Name',
    forceGolem: Boolean,        // legacy flag, usually false
    forceBoss: 'mob_type_key',  // the boss mob type to force-spawn
    duoBoss: 'mob_type_key',    // optional second boss (e.g., Lehvius & Jackman)
    support: [
      { type: 'mob_type_key', count: Number },
    ],
  },
}
```

### FLOOR_CONFIG Assembly

```js
const FLOOR_CONFIG = {
  cave: _caveConfig,        // 5 floors (all share same wave compositions, differ only in bosses potentially)
  azurine: _azurineConfig,  // 5 floors (unique per floor)
  vortalis: _vortalisConfig, // 5 floors
  earth205: _earth205Config, // 5 floors
  wagashi: _wagashiConfig,   // 5 floors
  earth216: _earth216Config, // 5 floors
};
```

### `getFloorWaveComposition(floorConfig, waveNum)`

Looks up wave composition for a specific wave number within a floor config:
- Iterates `subFloors`, finds the one whose `waves` array includes `waveNum`
- If it's a boss subFloor (`sub.boss && sub.bossComp`), returns `bossComp`
- Otherwise returns `sub.waveComps[waveNum]`
- Returns `null` if not found (shouldn't happen with complete config)

### How Templates Reduce Duplication

Cave dungeon uses `SUBFLOOR_BLUEPRINTS.cave_early` and `SUBFLOOR_BLUEPRINTS.cave_late` for all 5 floors. Only the boss waves (5 and 10) are defined inline per floor. Templates are deep-cloned during resolution so floors don't share mutable state. Other dungeons define all compositions inline because their floors have unique mob pools.

---

## Dungeon Registry (`dungeonRegistry.js`)

### `DUNGEON_REGISTRY`

Single source of truth for all dungeon types. All systems read from this.

```js
const DUNGEON_REGISTRY = {
  dungeon_key: {
    name: String,            // display name (e.g., 'Cave Dungeon')
    combatLevelId: String,   // level ID for combat map (e.g., 'warehouse_01')
    maxFloors: Number,       // number of floors (always 5 currently)
    returnLevel: String,     // level to return to after completion (e.g., 'cave_01')
    hasHazards: Boolean,     // whether HazardSystem floor hazards are active
    spawnTX: Number,         // player spawn tile X
    spawnTY: Number,         // player spawn tile Y
    requiredLevel: Number,   // soft level check (warn but don't block during testing)
    rewardMult: Number,      // gold/XP multiplier
    tileset: String,         // map tileset name (future, currently '')
    difficulty: Number,      // numeric tier 1-5
    music: String,           // audio track key (no music system yet, currently '')
  },
};
```

### All Dungeon Entries

| Key | Name | combatLevelId | maxFloors | returnLevel | spawnTX | spawnTY | requiredLevel | rewardMult | difficulty |
|-----|------|---------------|-----------|-------------|---------|---------|---------------|------------|------------|
| `cave` | Cave Dungeon | `warehouse_01` | 5 | `cave_01` | 20 | 20 | 0 | 1.0 | 1 |
| `azurine` | Azurine City | `azurine_dungeon_01` | 5 | `azurine_01` | 18 | 18 | 10 | 1.5 | 2 |
| `vortalis` | Vortalis | `warehouse_01` | 5 | `vortalis_01` | 20 | 20 | 20 | 2.0 | 3 |
| `earth205` | Earth-205: Marble City | `warehouse_01` | 5 | `earth205_01` | 20 | 20 | 30 | 2.8 | 4 |
| `wagashi` | Wagashi: Heavenly Realm | `warehouse_01` | 5 | `wagashi_01` | 20 | 20 | 40 | 3.5 | 5 |
| `earth216` | Earth-216: Sin City | `warehouse_01` | 5 | `earth216_01` | 20 | 20 | 50 | 4.5 | 5 |

### `validateDungeonType(key)`

Returns the key if valid, or `'cave'` as safe fallback. Logs a warning on invalid keys.

### How to Add a New Dungeon

1. Add an entry to `DUNGEON_REGISTRY` with all fields
2. Add a `_newDungeonConfig` in `floorConfig.js` with 5 floor definitions
3. Add it to the `FLOOR_CONFIG` assembly object
4. Add mob types to `MOB_TYPES`, `MOB_CAPS`, `CROWD_EXEMPT_TYPES`
5. Add specials to `MOB_SPECIALS` in the appropriate specials file
6. Add entity renderers to `ENTITY_RENDERERS`

---

## Skill Registry (`skillRegistry.js`)

### `SKILL_REGISTRY`

Unified skill metadata with categories, icons, and colors. Adding a new skill = 1 line here.

Depends on: `PALETTE` (from `itemData.js`) for Jobs category color fallback.

```js
const SKILL_REGISTRY = {
  CategoryName: {
    color: String,       // hex color for the category
    icon: String,        // emoji icon for the category
    skills: {
      'Skill Name': { icon: String, color: String },
    },
  },
};
```

### Categories and Skills

| Category | Color | Icon | Skills |
|----------|-------|------|--------|
| **Killing** | `#e05050` | skull | Total Kills, Deaths, K/D Ratio, Melee Kills, Gun Kills, Headshots, Multi Kills, Revenge Kills, Explosive Kills, Sniper Kills, Critical Kills, Kill Streaks |
| **Sparring** | `#60c0e0` | gun | Duels Played, Duels Won, Win Rate, Combos Landed, Parries, Ring Outs |
| **Basing** | `#c08040` | house | Walls Built, Turrets Placed, Repairs Done, Raids Defended |
| **Dungeons** | `#7080e0` | castle | Floor Clearing, Boss Slaying, Trap Dodging, Chest Looting, Speed Runs, No Death Runs, Wave Surviving, Secret Rooms, Mini Bosses, Dungeon Escapes |
| **Events** | `#ffc040` | trophy | Games Played, Events Won, Tournaments, Races, Survival, Team Battles, Puzzles Solved, Hide N Seek, Capture Flag, King of Hill, Tag Games, Obstacle Course, Treasure Hunt, Dance Off |
| **Jobs** | `PALETTE.accent` / `#60c0a0` | briefcase | Mining, Digging, Farming, Mailing, Fishing, Brewing, Cooking, Breeding, Taxi Driving, Woodcutting |

### Derived Lookups

Built automatically from `SKILL_REGISTRY` at load time:

| Constant | Type | Description |
|----------|------|-------------|
| `SKILL_CATEGORIES` | `{ [cat]: string[] }` | Category name -> array of skill names |
| `SKILL_ICONS` | `{ [skill]: string }` | Skill name -> emoji icon |
| `SKILL_COLORS` | `{ [skill]: string }` | Skill name -> hex color |
| `CAT_COLORS` | `{ [cat]: string }` | Category name -> hex color |
| `CAT_ICONS` | `{ [cat]: string }` | Category name -> emoji icon |
| `ALL_SKILLS` | `string[]` | Flat array of all skill names |

### How to Add New Skills

1. Add an entry under the appropriate category in `SKILL_REGISTRY.CategoryName.skills`
2. Provide `icon` (emoji) and `color` (hex string)
3. Derived lookups are built automatically -- no other files need changes

---

## Armor Visuals (`armorVisuals.js`)

### `ARMOR_VISUALS`

Tier color palettes used across all armor pieces. Maps directly to Unity ScriptableObjects.

```js
const ARMOR_VISUALS = {
  tierNumber: {
    name: String,
    primary: String,       // hex - main color
    secondary: String,     // hex - secondary color
    dark: String,          // hex - shadow/dark variant
    highlight: String,     // hex - light/highlight variant
    glow: null | {         // animated glow config (null = no glow)
      color: [r, g, b],   // RGB 0-255
      baseAlpha: Number,   // base alpha (0-1)
      amplitude: Number,   // sin wave amplitude
    },
    animSpeed: Number,     // glow animation speed (0 = static)
    // Plus tier-specific extra fields
  },
};
```

### All Tiers

| Tier | Name | Primary | Secondary | Dark | Highlight | Glow | animSpeed |
|------|------|---------|-----------|------|-----------|------|-----------|
| 1 | Leather | `#6a5030` | `#7a6040` | `#5a4028` | `#7a6040` | none | 0 |
| 2 | Iron | `#4a5a64` | `#6a7a84` | `#3a4a54` | `#5a6a74` | none | 0 |
| 3 | Warden | `#3a4a3a` | `#4a5a4a` | `#2a3a2a` | `#5a6a5a` | `[220,140,50]` base=0.3 amp=0.15 | 0.005 |
| 4 | Void | `#1a1020` | `#2a1a30` | `#1a1020` | `#2a1a30` | `[140,50,220]` base=0.4 amp=0.2 | 0.006 |

### Tier-Specific Extra Fields

**Tier 1 (Leather):** `darker: '#3a2a18'`, `belt: '#5a4020'`, `accent: null`

**Tier 2 (Iron):** `accent: '#8a9aa4'` (rivets, helmet bolts), `bootStripe: '#7a8a94'`

**Tier 3 (Warden):** `emberEmblem: '#8a6030'` (chest center emblem base)

**Tier 4 (Void):** `voidCore: '#3a1a4a'` (chest cross emblem), `bootSole: '#0a0810'`, `shimmer: [180,100,255]` (boot shimmer), `coreGlow: [180,80,255]` (chest core orb), `eyeGlow: [160,60,255]` (helmet visor eyes)

### `tierGlow(tier, time, speedOverride)`

Computes animated glow alpha for a given time. Returns `0` for tiers with no glow definition.

Formula: `baseAlpha + Math.sin(time * speed) * amplitude`

---

## Gun Data (`gunData.js`)

### `MAIN_GUNS`

5 permanent progression guns bought from the Gunsmith. Leveled 1-25, each with unique shooting mechanics. These exist ALONGSIDE the dungeon shop guns (Pistol, CT-X, SMG, etc.).

**Stat interpolation:** `stat(level) = Math.round(base + (max - base) * (level - 1) / 24)`

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier |
| `name` | String | Display name |
| `type` | String | Always `'gun'` |
| `category` | String | `'assault_rifle'`, `'shotgun'`, `'bow'`, `'smg'` |
| `desc` | String | Short description |
| `buyPrice` | Number | Gold cost to purchase |
| `bulletColor` | `{ main, core, glow }` | Bullet rendering colors |
| `upgradeMaterials` | `String[]` | Required material IDs for upgrades |
| `base` | Object | Stats at level 1 |
| `max` | Object | Stats at level 25 |
| `flags` | Object | Optional permanent flags (e.g., `{ pierce: true, isArrow: true }`) |

### All 5 Guns

| Gun | Category | Buy Price | Base Damage | Max Damage | Base FireRate | Max FireRate | Base Mag | Max Mag | Base Reload | Max Reload | Special Stats |
|-----|----------|-----------|-------------|------------|---------------|--------------|----------|---------|-------------|------------|---------------|
| `storm_ar` (Storm AR) | assault_rifle | 200 | 25 | 85 | 6 | 3 | 32 | 55 | 50 | 30 | -- |
| `heavy_ar` (Heavy AR) | assault_rifle | 300 | 45 | 140 | 12 | 7 | 24 | 40 | 60 | 35 | -- |
| `boomstick` (Boomstick) | shotgun | 350 | 18 | 45 | 20 | 14 | 6 | 12 | 70 | 45 | pellets: 3->5, spread: 15->12, maxRange: 200 |
| `ironwood_bow` (Ironwood Bow) | bow | 400 | 60 | 200 | 18 | 10 | 12 | 20 | 90 | 50 | pierceCount: 1->3, flags: `{pierce:true, isArrow:true}` |
| `volt_9` (Volt-9) | smg | 250 | 12 | 35 | 3 | 2 | 50 | 80 | 55 | 30 | spread: 8->5 |

### `getGunStatsAtLevel(gunId, level)`

Returns interpolated stats for a gun at level 1-25. Clamps level to [1, 25]. Returns object with `id`, `name`, `tier: 0`, all interpolated numeric stats, merged `flags`, and `bulletColor` reference.

### Upgrade Materials

**Gun-specific materials (`GUN_MATERIALS`):**

| Material | Gun | Color |
|----------|-----|-------|
| `storm_capacitor` | storm_ar | `#66ccff` |
| `wind_crystal` | storm_ar | `#aaddff` |
| `heavy_barrel_liner` | heavy_ar | `#ff9944` |
| `blast_powder` | heavy_ar | `#ffbb77` |
| `scatter_core` | boomstick | `#ffcc33` |
| `gunpowder_charge` | boomstick | `#ffdd77` |
| `buckshot_mold` | boomstick | `#e6b800` |
| `ironwood_limb` | ironwood_bow | `#8b5e3c` |
| `sinew_string` | ironwood_bow | `#a07050` |
| `fletching_kit` | ironwood_bow | `#6b4e2c` |
| `volt_coil` | volt_9 | `#aa66ff` |
| `plasma_cell` | volt_9 | `#cc99ff` |

### Weapon Parts (`WEAPON_PARTS`)

Shared at Common/Uncommon tiers, category-specific at Rare+ tiers.

| ID | Name | Tier | Color |
|----|------|------|-------|
| `common_weapon_parts` | Common Weapon Parts | 1 | `#888` |
| `uncommon_weapon_parts` | Uncommon Weapon Parts | 2 | `#5fca80` |
| `rare_weapon_parts` | Rare Weapon Parts | 3 | `#4a9eff` |
| `epic_weapon_parts` | Epic Weapon Parts | 4 | `#ff9a40` |
| `legendary_weapon_parts` | Legendary Weapon Parts | 5 | `#ff4a8a` |
| `rare_gun_parts` | Rare Gun Parts | 3 | `#4a9eff` |
| `epic_gun_parts` | Epic Gun Parts | 4 | `#ff9a40` |
| `legendary_gun_parts` | Legendary Gun Parts | 5 | `#ff4a8a` |
| `rare_rod_parts` | Rare Rod Parts | 3 | `#4a9eff` |
| `epic_rod_parts` | Epic Rod Parts | 4 | `#ff9a40` |
| `legendary_rod_parts` | Legendary Rod Parts | 5 | `#ff4a8a` |
| `rare_pick_parts` | Rare Pick Parts | 3 | `#4a9eff` |
| `epic_pick_parts` | Epic Pick Parts | 4 | `#ff9a40` |
| `legendary_pick_parts` | Legendary Pick Parts | 5 | `#ff4a8a` |

### Upgrade Recipes (`GUN_UPGRADE_RECIPES`)

Built by `_buildUpgradeRecipes()`. Structure: `recipes[gunId][tier][level]` = `{ gold, ores, parts }`.

**Tier cost multipliers:** `_TIER_COST_MULT = [1, 2.5, 5, 10, 20]` (T0=1x through T4=20x)

**Part keys per tier:** `_TIER_PART_KEYS = ['common_weapon_parts', 'uncommon_weapon_parts', 'rare_gun_parts', 'epic_gun_parts', 'legendary_gun_parts']`

**Cost brackets (base gold, before tier multiplier):**

| Level Range | Base Gold | Ores Used |
|-------------|-----------|-----------|
| L2-6 | 50 + (lvl-2)*25 | Coal (L2-3), Copper (L4-5), Iron (L6) |
| L7-13 | 200 + (lvl-7)*50 | Steel (L7-9), Gold (L10-11), Amethyst (L12-13) |
| L14-19 | 600 + (lvl-14)*120 | Ruby (L14-15), Diamond (L16-17), Emerald (L18-19) |
| L20-25 | 1500 + (lvl-20)*300 | Titanium (L20-21), Mythril (L22-23), Celestium (L24-25) |

**Ore amount per level:** `lvl - 1` (L2-6), `lvl - 4` (L7-13), `lvl - 8` (L14-19), `lvl - 12` (L20-25)

**Parts per level:** `Math.ceil((lvl - 1) / 2)`

### Helper Functions

| Function | Description |
|----------|-------------|
| `getGunStatsAtLevel(gunId, level)` | Interpolated stats at level 1-25 |
| `getUpgradeRecipe(gunId, tier, toLevel)` | DEPRECATED -- delegates to `getProgUpgradeRecipe()` |
| `getMainGunIds()` | Returns `Object.keys(MAIN_GUNS)` |
| `getGunLevelDesc(gunId, tierOrLevel, level)` | Returns display string like `"85 dmg x5 pellets . 12 mag"` |

---

## Item Data (`itemData.js`)

### `ITEM_CATEGORIES`

```js
const ITEM_CATEGORIES = {
  equipment: ['gun', 'melee', 'boots', 'pants', 'chest', 'helmet'],
  armor: ['boots', 'pants', 'chest', 'helmet'],
  weapons: ['gun', 'melee'],
};
```

### `PALETTE`

Centralized color constants for the entire UI.

```js
const PALETTE = {
  accent: "#5fca80",        // Main UI green (buttons, highlights, titles)
  panelBg: "#0c1018",       // Dark panel backgrounds
  panelBorder: "#2a6a4a",   // Green panel borders
  headerBg: "rgba(30,60,45,0.5)", // Panel header bar fill
  closeBtn: "#c33",         // Close/cancel button red
  gold: "#ffd740",          // Gold/currency text
  tierColors: ['#888', '#5fca80', '#4a9eff', '#ff9a40', '#ff4a8a'],
  tierNames: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
};
```

**Tier color mapping (index = tier):**

| Tier | Name | Color |
|------|------|-------|
| 0 | Common | `#888` |
| 1 | Uncommon | `#5fca80` |
| 2 | Rare | `#4a9eff` |
| 3 | Epic | `#ff9a40` |
| 4 | Legendary | `#ff4a8a` |

### `ITEM_STAT_RENDERERS`

Per-item-type rendering functions. Each takes `(data, drawStat)` where `drawStat(label, value, color)` renders a stat line.

| Type | Stats Rendered |
|------|----------------|
| `gun` | Damage, Pellets (if present), Fire Rate (as rounds/sec = 60/fireRate), Ammo (Unlimited if neverReload, else Mag Size), Pierce (if present, as pierceCount+1 mobs), Spread (if present and no pellets), Range (if maxRange), Special |
| `melee` | Damage, Crit Chance (as %), Range, Cooldown (as seconds = cooldown/60), Special |
| `boots` | Speed bonus, Dodge chance (if present), Special (Shadow Step or Phase Through) |
| `pants` | Damage Reduce (as %), Projectile Reduce (if present), Thorns (if present), Stagger (if present) |
| `chest` | HP Bonus (if present), Damage Reduce, Heal Boost (if present), Regen (if present, as HP/s), Special (Auto-Revive if revive) |
| `helmet` | Poison Resist, Status Resist (if present), Absorb (if present, as % -> Heal) |
| `resource` | Crop grow time + sell price (if cropId), or reach + cooldown (if farming special) |

### Helper Functions

| Function | Description |
|----------|-------------|
| `getTierColor(tier)` | Returns `PALETTE.tierColors[tier]` or `'#888'` |
| `getTierName(tier)` | Returns `PALETTE.tierNames[tier]` or `''` |

### How to Add New Item Types

1. Add the type string to the appropriate array in `ITEM_CATEGORIES`
2. Add a renderer function to `ITEM_STAT_RENDERERS[typeName]`
3. The renderer receives `(data, drawStat)` -- call `drawStat(label, value, color)` for each stat

---

## Ore Data (`oreData.js`)

### `ORE_TYPES`

15 ore types across 4 mine rooms. Each entry:

```js
{
  id: String,            // unique key
  name: String,          // display name
  tier: Number,          // 1-5
  hp: Number,            // hits to mine
  value: Number,         // gold value per ore
  color: String,         // hex - main color
  colorDark: String,     // hex - dark/shadow color
  sparkle: String,       // hex - sparkle highlight color
  rarity: Number,        // spawn weight (higher = more common)
  miningLevelReq: Number,// mining level required
  xp: Number,            // XP granted per mine
}
```

### Complete Ore Table

**Room 1 -- Beginner (mine_01):**

| ID | Name | Tier | HP | Value | Color | Rarity | MiningLvl | XP |
|----|------|------|----|-------|-------|--------|-----------|-----|
| `stone` | Stone | 1 | 5 | 1 | `#9a9a9a` | 0.40 | 1 | 3 |
| `coal` | Coal | 1 | 7 | 1 | `#3a3a3a` | 0.25 | 1 | 4 |
| `copper` | Copper Ore | 1 | 9 | 2 | `#b87333` | 0.20 | 1 | 6 |
| `iron` | Iron Ore | 2 | 12 | 3 | `#8a8a8a` | 0.15 | 3 | 9 |

**Room 2 -- Intermediate (mine_02):**

| ID | Name | Tier | HP | Value | Color | Rarity | MiningLvl | XP |
|----|------|------|----|-------|-------|--------|-----------|-----|
| `steel` | Steel Ore | 2 | 16 | 4 | `#7090a8` | 0.15 | 8 | 12 |
| `gold` | Gold Ore | 3 | 20 | 5 | `#ffd700` | 0.10 | 12 | 18 |
| `amethyst` | Amethyst | 3 | 24 | 7 | `#9b59b6` | 0.08 | 16 | 22 |

**Room 3 -- Advanced (mine_03):**

| ID | Name | Tier | HP | Value | Color | Rarity | MiningLvl | XP |
|----|------|------|----|-------|-------|--------|-----------|-----|
| `ruby` | Ruby | 4 | 30 | 10 | `#e74c3c` | 0.06 | 20 | 30 |
| `diamond` | Diamond | 4 | 35 | 14 | `#85c1e9` | 0.05 | 25 | 40 |
| `emerald` | Emerald | 4 | 35 | 16 | `#2ecc71` | 0.04 | 30 | 50 |

**Room 4 -- Elite (mine_04):**

| ID | Name | Tier | HP | Value | Color | Rarity | MiningLvl | XP |
|----|------|------|----|-------|-------|--------|-----------|-----|
| `titanium` | Titanium Ore | 5 | 42 | 20 | `#d0d0e0` | 0.035 | 35 | 65 |
| `mythril` | Mythril Ore | 5 | 48 | 24 | `#40c8e0` | 0.030 | 40 | 80 |
| `celestium` | Celestium | 5 | 55 | 28 | `#e8d070` | 0.025 | 45 | 100 |
| `obsidian` | Obsidian | 5 | 60 | 32 | `#4a2a5a` | 0.020 | 50 | 125 |
| `dusk` | Dusk Ore | 5 | 70 | 40 | `#301848` | 0.015 | 55 | 150 |

### `MINE_ROOM_ORES`

Maps room IDs to their ore pools:

```js
{
  mine_01: ['stone', 'coal', 'copper', 'iron'],
  mine_02: ['steel', 'gold', 'amethyst'],
  mine_03: ['ruby', 'diamond', 'emerald'],
  mine_04: ['titanium', 'mythril', 'celestium', 'obsidian', 'dusk'],
}
```

### Helper Functions

| Function | Description |
|----------|-------------|
| `pickRandomOreForRoom(roomId)` | Weighted random ore from a specific room's pool. Falls back to `'stone'` if room invalid. |
| `pickRandomOre()` | Legacy -- weighted random from ALL ores regardless of room. |

Both use rarity-weighted selection: `totalWeight = sum of rarity`, then cumulative subtraction.

---

## Party Data (`partyData.js`)

### `PARTY_CONFIG`

All party system constants in one place.

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_SIZE` | `4` | Maximum party size (player + 3 bots) |
| `REVIVE_BASE_COST` | `50` | Base gold cost to revive (scales with floor) |
| `REVIVE_SHOP_DURATION` | `600` | Revive shop display duration in frames (10 seconds) |
| `BOT_HP_MULT` | `3` | Bot HP multiplier relative to player maxHp |
| `BOT_DMG_MULT` | `1` | Bot damage multiplier (1x = same as default gun) |
| `BOT_SHOOT_CD` | `10` | Bot shoot cooldown in frames |
| `BOT_MELEE_CD` | `20` | Bot melee cooldown in frames |
| `BOT_FOLLOW_MIN` | `80` | Minimum follow distance in px |
| `BOT_FOLLOW_MAX` | `150` | Maximum follow distance in px |
| `BOT_ENGAGE_RANGE` | `250` | Range at which bots start shooting mobs in px |
| `BOT_FLEE_THRESHOLD` | `0.15` | Fraction of maxHp below which bots flee |
| `BOT_EFFECTIVE_RANGE` | `140` | Effective shooting range in px |
| `BOT_SEPARATION_DIST` | `60` | Bot-to-bot minimum separation in px |
| `BOT_SPREAD_RADIUS` | `70` | Spread radius around leader for bot positioning in px |
| `MOB_RETARGET_INTERVAL` | `30` | Mob retarget interval in frames |
| `MOB_COUNT_SCALE_PER_MEMBER` | `1.0` | Mob count multiplier per alive party member (duo=2x, trio=3x, quad=4x) |
| `MOB_HP_SCALE_PER_MEMBER` | `0.5` | Mob HP multiplier per alive party member (duo=1.5x, trio=2x, quad=2.5x) |

### `BOT_PRESETS`

Cosmetic templates for party bots. Index 0 is `null` (player slot).

```js
const BOT_PRESETS = [
  null, // slot 0 = player
  {
    name: 'Bot 1',
    skin: '#c8a888', hair: '#3a2a1a', shirt: '#2a4a8a', pants: '#2a2a3a',
    eyes: '#44aa66', shoes: '#3a2a1a', hat: '#2a4a8a',
  },
  {
    name: 'Bot 2',
    skin: '#b89878', hair: '#8a4a2a', shirt: '#8a2a2a', pants: '#3a2a2a',
    eyes: '#aa6644', shoes: '#4a3a2a', hat: '#8a2a2a',
  },
  {
    name: 'Bot 3',
    skin: '#d4c4a8', hair: '#1a1a2a', shirt: '#2a6a4a', pants: '#2a3a2a',
    eyes: '#4466aa', shoes: '#2a2a1a', hat: '#2a6a4a',
  },
];
```

### Scaling Per Party Size

Mob count formula: `baseMobCount * aliveMembers * MOB_COUNT_SCALE_PER_MEMBER`
Mob HP formula: `baseMobHp * (1 + (aliveMembers - 1) * MOB_HP_SCALE_PER_MEMBER)`

| Party Size | Mob Count Mult | Mob HP Mult |
|------------|---------------|-------------|
| 1 (solo) | 1x | 1x |
| 2 (duo) | 2x | 1.5x |
| 3 (trio) | 3x | 2x |
| 4 (quad) | 4x | 2.5x |

---

## Mob Types Registry (`mobTypes.js`)

### `MOB_TYPES` Structure

~265 mob entries. Each mob is keyed by its type string (e.g., `'grunt'`, `'neon_pickpocket'`).

**Required fields (every mob):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | String | Display name |
| `hp` | Number | Base hit points |
| `speed` | Number | Movement speed in px/frame |
| `damage` | Number | Contact/melee damage |
| `killHeal` | Number | HP healed to player on kill |
| `goldReward` | Number | Gold dropped on kill |
| `skin` | String | Hex color -- skin |
| `hair` | String | Hex color -- hair |
| `shirt` | String | Hex color -- shirt |
| `pants` | String | Hex color -- pants |
| `contactRange` | Number | Contact damage trigger range in px (typically 56-62) |
| `deathColors` | `String[]` | 4 hex colors for death particle effect |

**Optional AI/behavior fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `ai` | String | (inferred from type) | AI pattern key from `MOB_AI` registry (e.g., `'grunt'`, `'runner'`, `'archer'`, `'witch'`, `'tank'`) |
| `_specials` | `String[]` | none | Special ability keys from `MOB_SPECIALS` registry |
| `specialCD` | Number | none | Cooldown between special ability uses in frames |
| `isBoss` | Boolean | false | Whether this is a boss mob |
| `bossScale` | Number | 1 | Visual scale multiplier for bosses (typically 1.4-1.5) |

**Optional physics properties (all fall back to GAME_CONFIG defaults):**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `radius` | Number | 27 | Body-blocking + collision circle in px |
| `wallHW` | Number | 14 | Wall collision AABB half-width in px |
| `hitboxR` | Number | 15 | Bullet hit-detection radius in px |
| `kiteRange` | Number | 160 | Ideal kiting distance for ranged AI in px |
| `boulderHitRadius` | Number | 40 | Boulder direct-hit radius in px |

**Optional ranged attack fields (for archer/golem AI):**

| Field | Type | Description |
|-------|------|-------------|
| `arrowRate` | Number | Frames between ranged attacks |
| `arrowSpeed` | Number | Arrow projectile speed |
| `arrowRange` | Number | Maximum arrow travel distance in px |
| `arrowBounces` | Number | Number of wall bounces |
| `arrowLife` | Number | Arrow lifetime in frames |
| `projectileStyle` | String | Visual style key (e.g., `'neon_bolt'`, `'tracer'`, `'golden'`, `'electric_bolt'`) |
| `bulletColor` | `{ main, core, glow }` | Custom bullet colors |
| `bulletSpeed` | Number | Bullet speed (for non-arrow projectiles) |

**Optional special mob fields:**

| Field | Type | Description |
|-------|------|-------------|
| `summonRate` | Number | Frames between summons (witch, golem) |
| `summonMax` | Number | Maximum active summons |
| `boulderRate` | Number | Frames between boulder throws (golem) |
| `boulderSpeed` | Number | Boulder projectile speed |
| `boulderRange` | Number | Boulder max range in px |
| `explodeRange` | Number | Self-destruct explosion radius in px (mummy) |
| `explodeDamage` | Number | Self-destruct damage |
| `fuseMin` | Number | Minimum fuse time in frames (mummy) |
| `fuseMax` | Number | Maximum fuse time in frames (mummy) |
| `healRadius` | Number | Healing aura radius in px (healer) |
| `healRate` | Number | Frames between heals |
| `healAmount` | Number | HP healed per tick |

### Death Colors System

Every mob has a `deathColors` array of exactly 4 hex strings. These are used to generate death particles when the mob dies. The colors are typically themed to match the mob's visual identity.

Example: `deathColors: ["#aa4444","#884444","#cc6666","#663333"]` (grunt -- reds/browns)

### `MOB_CAPS`

Per-type mob spawn limits. Prevents excessive numbers of any single mob type on screen.

```js
const MOB_CAPS = {
  grunt: 12, runner: 8, tank: 3, witch: 2, golem: 1, mini_golem: 6, mummy: 3, archer: 2, healer: 2,
  // ... every mob type has a cap, bosses are always 1
};
```

Typical cap ranges: basic mobs 8-12, support/tank mobs 2-4, bosses 1.

### `CROWD_EXEMPT_TYPES`

A `Set` of mob type keys that are exempt from crowd-control (knockback, stagger, etc.). Includes all ranged mobs, bosses, and certain special mobs. Currently contains ~80+ entries.

### `MOB_ENTITY_ARRAYS`

List of all sub-array keys a mob can carry. Used for cleanup on death + floor transitions to prevent orphaned references.

```js
const MOB_ENTITY_ARRAYS = [
  '_bombs', '_mines', '_oilPuddles', '_traps', '_oozeLines', '_rampartZones',
  '_meltTargets', '_summonedMinions', '_turrets', '_drones', '_pillars',
  '_eggs', '_lasers', '_baits', '_staticOrbs',
  '_holoClones', '_rocketDrones', '_junzBeam',
  '_tetherLine', '_geyserZones', '_inkPuddles', '_coralWalls', '_tentacles', '_barnacleTraps', '_whirlpools',
];
```

### How to Add a New Mob Type

1. Add entry to `MOB_TYPES` with all required fields
2. Add cap to `MOB_CAPS` (typically 4-8 for normal mobs, 1 for bosses)
3. Add to `CROWD_EXEMPT_TYPES` if it should ignore knockback/stagger (ranged mobs, bosses)
4. Add AI pattern to `MOB_AI` in `combatSystem.js` if using a new AI type
5. Add specials to `MOB_SPECIALS` in the appropriate specials file
6. Add renderer entry to `ENTITY_RENDERERS` if custom rendering is needed
7. Add to `FLOOR_CONFIG` wave compositions
8. If the mob has entity sub-arrays (bombs, mines, etc.), add the key to `MOB_ENTITY_ARRAYS`
