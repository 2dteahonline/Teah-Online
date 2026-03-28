# Waves & Dungeons

## Overview

The wave system drives all dungeon combat. Each dungeon floor runs 10 waves of increasing difficulty, with a 3-phase spawning model that staggers mob reinforcements as the player clears enemies. Floor configurations define mob pools, boss encounters, and hazard zones per dungeon type and floor number. Telegraphs warn players before high-damage attacks land. Party scaling increases mob count and HP based on total party size, with bosses exempt from HP scaling.

## Files

- `js/authority/waveSystem.js` -- Wave state machine, phase logic, mob factory, scaling functions, medpacks, gold rewards
- `js/shared/floorConfig.js` -- Per-dungeon per-floor wave compositions, wave templates, subfloor blueprints, builder functions
- `js/shared/dungeonRegistry.js` -- Single source of truth for all 6 dungeon types (name, max floors, return level, spawn position)
- `js/shared/mobTypes.js` -- `MOB_TYPES` definitions (265 entries) and `MOB_CAPS` per-type limits
- `js/authority/hazardSystem.js` -- Zone-based damage areas (poison clouds, sticky bombs)
- `js/authority/telegraphSystem.js` -- Ground warning markers before attacks resolve
- `js/authority/combatSystem.js` -- 91 base ability handlers in `MOB_SPECIALS`
- `js/authority/vortalisSpecials.js` -- 106 Vortalis ability handlers
- `js/authority/earth205Specials.js` -- 98 Earth-205 ability handlers
- `js/authority/wagashiSpecials.js` / `wagashiSpecials2.js` / `wagashiSpecials3.js` -- 70 Wagashi ability handlers
- `js/authority/earth216Specials.js` / `earth216Specials2.js` / `earth216Specials3.js` -- 70 Earth-216 ability handlers

## Key Functions & Globals

### Wave System (`waveSystem.js`)

| Function / Global | Purpose |
|---|---|
| `spawnWave()` | Increments `wave`, sets `waveState = "active"`, resets phases, spawns phase 1 mobs |
| `spawnPhase(comp, phase, isBossWave)` | Spawns a single phase of mobs from a composition object |
| `checkPhaseAdvance(deadMobPhase)` | Called on mob death; triggers next phase when 75% of current phase killed |
| `createMob(typeKey, x, y, hpMult, spdMult, opts)` | Factory that builds a fully initialized mob object from `MOB_TYPES` |
| `getWaveComposition(w)` | Looks up `FLOOR_CONFIG[currentDungeon][dungeonFloor]` for the wave's mob mix |
| `getMobCountForWave(w)` | Base 5-14 mobs scaling with wave number, +2 per floor, cap 22. Multiplied by party mob count scale. |
| `getWaveHPMultiplier(w)` | Exponential floor scaling (floor 1 = 1x, floor 5 = 25x) + 12% per wave. Multiplied by party HP scale. |
| `getWaveSpeedMultiplier(w)` | Floor speed scaling + 6% per wave |
| `getMobDamageMultiplier()` | Floor 1 = 1x, scales up to ~4.5x on floor 5 |
| `capMobSpeed(type, speed)` | Runners capped at 1.1x player speed, everything else at 0.85x |
| `getGoldReward(type, waveNum)` | Base from `MOB_TYPES.goldReward`, scales with global wave + floor bonus |
| `getQuickKillBonus(mob)` | 20% bonus gold/HP if killed within 5 seconds (300 frames) of spawning |
| `pickFromWeighted(entries)` | Weighted random selection from `[{type, weight}]` arrays |
| `getSpawnPos()` | Picks a random walkable edge tile, falls back to scanning |
| `WAVES_PER_FLOOR` | Constant: `10` |
| `getDungeonMaxFloors()` | Reads from `DUNGEON_REGISTRY[currentDungeon].maxFloors` |

### Floor Config (`floorConfig.js`)

| Item | Purpose |
|---|---|
| `WAVE_TEMPLATES` | Reusable wave compositions (e.g. `grunt_rush`, `archer_ambush`, `elite_wave`) |
| `SUBFLOOR_BLUEPRINTS` | Reusable subfloor structures referencing templates by name |
| `_buildFloor(floorDef)` | Resolves templates into concrete floor config |
| `_resolveSubFloor(subFloor)` | Expands `waveTemplates` names into `waveComps` objects (deep-cloned) |
| `getFloorWaveComposition(floorConfig, waveNum)` | Finds the matching subfloor for a wave number and returns its composition |
| `FLOOR_CONFIG` | Final assembled config: `FLOOR_CONFIG[dungeonType][floorNum]` |

### Dungeon Registry (`dungeonRegistry.js`)

| Item | Purpose |
|---|---|
| `DUNGEON_REGISTRY` | Object keyed by dungeon ID (`cave`, `azurine`, `vortalis`, `earth205`, `wagashi`, `earth216`) |
| `validateDungeonType(key)` | Returns the key if valid, falls back to `'cave'` |

Each entry contains: `name`, `combatLevelId`, `maxFloors`, `returnLevel`, `hasHazards`, `spawnTX/TY`, `requiredLevel`, `rewardMult`, `tileset`, `difficulty`, `music`.

## How It Works

### Wave State Machine

```
inactive  --[spawnWave()]--> active  --[all mobs dead]--> victory
                                     --[player dies, 0 lives]--> loss
```

- `waveState` is one of: `"inactive"`, `"active"`, `"victory"` (checked externally in the game loop)
- Between waves (inactive), the player can access the shop station and explore
- After wave 10, `stairsOpen = true` and the player can descend to the next floor
- After clearing floor 5 wave 10, `dungeonComplete = true` and a victory celebration plays

### 3-Phase Spawning System

Each non-boss wave spawns mobs in up to 3 phases:

1. **Phase 1** -- Spawns immediately when the wave starts.
2. **Phase 2** -- Triggers when 75% of Phase 1 mobs are killed. +4% HP, +2% speed.
3. **Phase 3** -- Triggers when 75% of Phase 2 mobs are killed. +8% HP, +4% speed.

Boss waves bypass phasing entirely -- all mobs spawn at once and all three phases are marked as triggered.

Each phase also spawns 2 medpacks at random walkable tiles. Medpacks heal 30 HP on pickup (range 40px).

### Party Wave Scaling

When playing with a party (2+ members), waves scale to maintain difficulty:

**Mob count scaling:**
```
scale = 1 + (totalMembers - 1) * MOB_COUNT_SCALE_PER_MEMBER
```
`MOB_COUNT_SCALE_PER_MEMBER = 1.0` means: duo = 2x mobs, trio = 3x, quad = 4x.

**Mob HP scaling:**
```
scale = 1 + (totalMembers - 1) * MOB_HP_SCALE_PER_MEMBER
```
`MOB_HP_SCALE_PER_MEMBER = 0.5` means: duo = 1.5x HP, trio = 2x, quad = 2.5x.

**Key design decisions:**
- Both scales use **total** party size, not alive count. Rates don't change when someone dies.
- **Bosses are excluded from party HP scaling.** Boss HP uses `getWaveHPMultiplier(wave) * farmHPMult * phaseHPMult` with no party multiplier. This prevents bosses from becoming impossibly tanky with large parties.
- Mob count scaling applies to `getMobCountForWave()` and HP scaling applies to `getWaveHPMultiplier()`.

### createMob() Factory

`createMob(typeKey, x, y, hpMult, spdMult, opts)` builds a mob object from `MOB_TYPES[typeKey]`:

- **HP scaling**: `mt.hp * hpMult`, with special overrides for witch (1.2x tank HP), golem (1.5x), and bosses (`opts.bossHPMult`)
- **Speed**: `mt.speed * spdMult`, capped via `capMobSpeed()`
- **Damage**: `mt.damage * getMobDamageMultiplier()`
- **Visual scale**: Bosses use `mt.bossScale`, tanks get 1.3, witch 1.1, golem 1.6
- **All type-specific fields** are copied: shooter (shootRange/Rate), witch (summonRate/Max), golem (boulderRate/Speed), mummy (explodeRange/Damage/fuse), archer (arrowRate/Speed/Bounces), healer (healRadius/Rate/Amount)
- **Special abilities**: `_specials` array, cooldown map `_abilityCDs`, plus flags for cloak, bombs, mines, shields, turrets, drones, etc.
- **Phase tag**: `mob.phase = opts.phase || 1`
- **Freeze support**: If `window._mobsFrozen` is active, new mobs spawn frozen

### MOB_CAPS Per-Type Limits

Defined in `js/shared/mobTypes.js`. Prevents mob type spam:

| Type | Cap | Type | Cap |
|---|---|---|---|
| grunt | 12 | runner | 8 |
| tank | 3 | witch | 2 |
| golem | 1 | mummy | 3 |
| archer | 2 | healer | 2 |
| mini_golem | 6 | bosses | 1 each |

Dungeon-specific mobs (neon_pickpocket, renegade_bruiser, etc.) typically cap at 3-4. When a type hits its cap, the spawner picks from remaining available types.

### Floor Config Format

Each dungeon type defines a config per floor. A floor contains:

```js
{
  name: 'Floor Name',
  subFloors: [
    {
      waves: [1, 2, 3, 4],           // which wave numbers this subfloor covers
      theme: 'cave_depths',
      waveComps: {                    // or waveTemplates (resolved at load time)
        1: { primary: [...], support: [...], primaryPct: 0.85, theme: 'Grunt Rush' },
        ...
      }
    },
    {
      waves: [5],
      boss: 'golem',
      bossComp: { forceBoss: 'golem', support: [...], theme: 'The Boss' }
    },
    ...
  ],
  palette: { floor1, floor2, wall, wallAccent, ... },
  hazards: []
}
```

**Wave composition** objects contain:
- `primary` -- Array of `{type, weight}` for the main mob pool
- `support` -- Array of `{type, weight}` for the secondary pool
- `primaryPct` -- Probability of picking from primary vs support (e.g. 0.7 = 70% primary)
- `theme` -- Display name for the wave (e.g. "Grunt Rush", "Witch Coven")
- `forceBoss` -- Boss type key for boss waves
- `duoBoss` -- Optional second boss for duo encounters (Floor 5)
- `support` (on boss comps) -- Guaranteed spawns with `{type, count}`

**Template system**: `WAVE_TEMPLATES` defines reusable compositions. `SUBFLOOR_BLUEPRINTS` references template names. `_resolveSubFloor()` deep-clones templates into concrete `waveComps` at load time. Inline `waveComps` take priority over templates for the same wave number.

### Dungeon Registry

6 dungeon entries:

| Key | Name | Max Floors | Difficulty | Required Level | Reward Mult | Status |
|---|---|---|---|---|---|---|
| `cave` | Cave Dungeon | 5 | 1 | 0 | 1.0x | Fully configured |
| `azurine` | Azurine City | 5 | 2 | 10 | 1.5x | Fully configured |
| `vortalis` | Vortalis | 5 | 3 | 20 | 2.0x | Fully configured |
| `earth205` | Earth-205: Marble City | 5 | 4 | 30 | 2.8x | Fully configured |
| `wagashi` | Wagashi: Heavenly Realm | 5 | 5 | 40 | 3.5x | Fully configured |
| `earth216` | Earth-216: Sin City | 5 | 5 | 50 | 4.5x | Fully configured |

Each dungeon has a `combatLevelId` for the combat arena map, a `returnLevel` for where the player exits to, and spawn coordinates (`spawnTX`/`spawnTY`).

To add a new dungeon: add an entry to `DUNGEON_REGISTRY`, a corresponding config in `FLOOR_CONFIG`, mob types in `MOB_TYPES`, and specials in a new `*Specials.js` file.

### Specials File Organization

Ability handlers are split across multiple files due to codebase size:

| File | Abilities | Dungeon |
|---|---|---|
| `combatSystem.js` | 91 | Cave + Azurine + Tech/Corporate + Junkyard/Swamp + Trap House/REGIME + Waste/Slime |
| `vortalisSpecials.js` | 106 | Vortalis (pirate/ocean themed) |
| `earth205Specials.js` | 98 | Earth-205: Marble City (urban/gangster themed) |
| `wagashiSpecials.js` | 28 | Wagashi floors 1-2 (feudal Japan) |
| `wagashiSpecials2.js` | 28 | Wagashi floors 3-4 (samurai/elemental) |
| `wagashiSpecials3.js` | 14 | Wagashi floor 5 (void/corruption boss) |
| `earth216Specials.js` | 28 | Earth-216 floors 1-2 (casino/underworld) |
| `earth216Specials2.js` | 28 | Earth-216 floors 3-4 (Day of Dead/racing) |
| `earth216Specials3.js` | 14 | Earth-216 floor 5 (occult boss) |

The base file (`combatSystem.js`) defines `MOB_SPECIALS` as an object literal. External files append to it via `MOB_SPECIALS.abilityName = function(m, ctx) { ... }`. Script load order ensures the base object exists before external files run.

### Hazard System (`hazardSystem.js`)

The hazard system manages persistent damage zones created by mob abilities:

```js
HazardSystem.createZone({
  cx, cy,          // center position
  radius,          // effect radius
  duration,        // frames until expiry
  tickRate,        // frames between damage ticks (default 60)
  tickDamage,      // damage per tick
  tickEffect,      // hit effect type (optional)
  color,           // [r, g, b] array
  slow,            // speed multiplier while inside (0 = no slow)
});
```

**Zone behavior**:
- Zones tick down each frame and are removed when `life <= 0`
- Player proximity check uses distance-squared against the zone radius
- When the player is inside: `tickCounter` increments each frame, damage applied when it reaches `tickRate`
- Zones render as pulsing semi-transparent circles with edge glow, fading as they expire

**Lifecycle methods**: `initForFloor(floor)`, `activateBossHazards(bossType)`, `update()`, `draw()`, `clear()`

Note: Floor-based hazard types were removed. Only zone-based hazards remain (used by mob specials like poison clouds and sticky bombs).

### Telegraph System (`telegraphSystem.js`)

Ground warning markers that telegraph incoming attacks:

```js
TelegraphSystem.create({
  shape: 'circle',                              // shape type
  params: { cx: mob.x, cy: mob.y, radius: 96 }, // shape-specific params
  delayFrames: 48,                               // warning time (0.8s at 60fps)
  onResolve: () => { /* damage logic */ },       // callback when timer expires
  color: [255, 80, 80],                          // RGB tint
  owner: mob.id                                  // for cleanup on mob death
});
```

**5 telegraph shapes**:

| Shape | Params | Visual |
|---|---|---|
| `circle` | `{ cx, cy, radius }` | Filling circle with pulsing alpha, outline at full radius |
| `line` | `{ x1, y1, x2, y2, width }` | Rectangle filling from start to end point |
| `cone` | `{ cx, cy, direction, angleDeg, range }` | Arc sector filling outward |
| `ring` | `{ cx, cy, innerRadius, outerRadius }` | Donut shape (outer circle with inner cutout) |
| `tiles` | `{ tiles: [{tx, ty}, ...] }` | Individual tile highlights on the grid |

**Lifecycle**: Each telegraph counts down `delay` frames. At 0, `onResolve()` fires and an 8-frame white flash plays before removal. `clearOwner(ownerId)` removes all telegraphs belonging to a dead mob.

## Connections to Other Systems

- **Combat System** (`combatSystem.js`) -- `MOB_AI` patterns, `MOB_SPECIALS` abilities drive mob behavior; specials create telegraphs and hazard zones
- **Game State** (`gameState.js`) -- `wave`, `waveState`, `mobs`, `medpacks`, `dungeonFloor`, `currentDungeon`, `gold`, `kills` are all GameState properties
- **Mob Types** (`mobTypes.js`) -- `MOB_TYPES` defines base stats, `MOB_CAPS` limits spawning
- **Mob System** (`mobSystem.js`) -- `updateMobs()` dispatches specials, manages `stillActive`/`isMultiFrame` for boss abilities
- **Party System** (`partySystem.js`) -- `PartySystem.getMobCountScale()` and `getMobHPScale()` for wave scaling
- **Inventory System** (`inventorySystem.js`) -- Shop is accessible between waves; armor/weapons are session-scoped to dungeon runs
- **Save/Load** (`saveLoad.js`) -- Dungeon progress is not saved mid-run (roguelike); only permanent progression persists
- **Event Bus** (`eventBus.js`) -- `wave_started` and `player_died` events emitted

## Gotchas & Rules

- **Script load order matters**: `floorConfig.js` and `dungeonRegistry.js` (Phase A shared) must load before `waveSystem.js` (Phase B authority). External specials files must load after `combatSystem.js`.
- **FLOOR_CONFIG templates are deep-cloned** at load time to prevent cross-floor mutation. Inline `waveComps` override templates for the same wave number.
- **Boss waves have no phases** -- `phaseTriggered` is set to `[true, true, true]` immediately
- **Boss HP is exempt from party scaling** -- `bossHpMult` is calculated without `PartySystem.getMobHPScale()` to prevent impossibly tanky bosses in large parties
- **Farm waves** (legacy composition only) get 1.6x mob count but 0.7x HP -- more targets, less individual threat
- **`getSpawnPos()` tries edge spawns first** (20 attempts), then falls back to scanning all walkable tiles at least 200px from the player
- **Speed is hard-capped** regardless of scaling: runners at 1.1x player speed, everything else at 0.85x
- **Medpacks are cleared** at the start of each wave (`medpacks.length = 0`)
- **Floor hazard types were removed** from HazardSystem -- only `createZone()` remains (used by mob abilities)
- **Telegraph `onResolve` callbacks are try/caught** to prevent a bad callback from breaking the update loop
- **`nextMobId`** is a global incrementing counter -- never reset it during a session
- **New dungeons require entries in multiple places**: `DUNGEON_REGISTRY`, `FLOOR_CONFIG`, `MOB_TYPES` (all mobs), `MOB_SPECIALS` (all abilities), and both `stillActive`/`isMultiFrame` lists in `mobSystem.js`
