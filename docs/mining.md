# Mining System

## Overview
A resource-gathering skill where the player equips a pickaxe and mines ore nodes in dedicated mine rooms (mine_01 through mine_04). Ore nodes spawn in clustered vein groups when entering a room, are destroyed by repeated pickaxe strikes on a tick timer, drop stackable ore items into the player's inventory, and respawn after a cooldown. Mining level gates access to higher-tier ores, and pickaxe tiers scale mining speed and damage. Discovery tracking unlocks pickaxe progression gates.

## Files
- `js/shared/oreData.js` — 15 ore type definitions (`ORE_TYPES`), room-to-ore mapping (`MINE_ROOM_ORES`), weighted random ore picker
- `js/authority/miningSystem.js` — Mining config/constants, ore spawning algorithm, per-frame mining update, ore damage/collection, ground ore pickups, ore node rendering, collision resolution, swing animation state
- `js/shared/gameConfig.js` — `GAME_CONFIG.ORE_COLLISION_RADIUS` and `GAME_CONFIG.MINING_PLAYER_R` constants
- `js/core/interactable.js` — `PICKAXE_TIERS` definitions (8 pickaxes with miningSpeed multiplier)
- `js/client/ui/panels.js` — Mining shop UI, pickaxe progression tracking (`_pickaxeLevels`, `_discoveredOres`)
- `js/core/saveLoad.js` — Ore discovery and pickaxe progression persistence

## Mining Config (MINING_CONFIG)

| Constant | Value | Description |
|----------|-------|-------------|
| `range` | 90px | Max distance to mine ore |
| `baseTick` | 44 frames | Base frames between mining hits (before speed scaling) |
| `nodeSize` | 72px | Visual size of ore nodes |
| `collisionRadius` | `GAME_CONFIG.ORE_COLLISION_RADIUS` | Circle-circle collision radius |
| `hitFlashFrames` | 6 | Frames of hit flash per strike |
| `respawnTime` | 600 frames (10s) | Wait time before regrow starts |
| `regrowFrames` | 90 frames (1.5s) | Regrow scale-up animation duration |
| `baseDamage` | 1 | Base ore damage per tick |
| `dirConeWidth` | 0.85 | Directional check cone width (0-1, lower = wider) |

## Spawn Config (SPAWN_CONFIG)

| Constant | Value | Description |
|----------|-------|-------------|
| `groupCount` | 18 | Number of ore vein groups per room |
| `oresPerGroupMin` | 5 | Min ores per group |
| `oresPerGroupMax` | 6 | Max ores per group |
| `innerSpacing` | 1.2 tiles | Min distance between ores in same group |
| `outerSpacing` | 12 tiles | Min distance between group centers |
| `wallMargin` | 4 tiles | Clearance from wall edges |
| `spawnClearance` | 4 tiles | Clearance from spawn points |
| `exitClearance` | 5 tiles | Clearance from exits/doors |
| `placementRadius` | 2 tiles | ±tiles from group center for ore placement |
| `maxGroupAttempts` | 80 | Placement attempts per group center |
| `maxOreAttempts` | 20 | Placement attempts per ore within group |

## State

### Mining Instance Tracking

| Variable | Type | Description |
|----------|------|-------------|
| `oreNodes[]` | array | All spawned ore nodes in current room |
| `miningTarget` | int/null | Ore node ID currently being mined |
| `miningTimer` | int | Frames until next mining hit |
| `miningProgress` | int | Accumulated hits on current target |
| `window._miningActive` | boolean | True while actively mining (read by characterSprite.js) |
| `window._miningSwingPhase` | float | 0-1 normalized phase within one swing cycle |
| `window._miningSwingDir` | int | 1 = winding up, -1 = striking down |
| `window._miningHitFlash` | int | Frames remaining for hit flash visual |
| `window._miningLockedNodeId` | int/null | Set when aiming at level-locked ore |
| `window._miningLockedReq` | int/null | Required mining level for locked ore |

### Persistent State

| Variable | Type | Description |
|----------|------|-------------|
| `window._pickaxeLevels` | object | `{ pickId: { tier, level } }` — ownership/progression per pickaxe |
| `window._discoveredOres` | Set | Ore IDs ever mined (for unlock gates) |

### Ore Node Structure
```js
{
  id: int,                    // unique ID
  tx, ty: int,                // tile coordinates
  x, y: float,               // pixel coordinates (tile center)
  oreId: string,              // key into ORE_TYPES
  hp: int,                    // current health (0 when depleted)
  maxHp: int,                 // from oreType.hp
  depleted: boolean,          // true when hp = 0
  respawnTimer: int,          // countdown to respawn + regrow
  shimmerOffset: float        // random animation phase offset
}
```

## Ore Types (15 total, 5 tiers)

### Room 1 (mine_01) — Beginner

| Ore | Tier | HP | Value | Mining Lv | XP | Rarity |
|-----|------|----|-------|-----------|-----|--------|
| Stone | 1 | 5 | 1g | 1 | 3 | 0.40 |
| Coal | 1 | 7 | 1g | 1 | 4 | 0.25 |
| Copper | 1 | 9 | 2g | 1 | 6 | 0.20 |
| Iron | 2 | 12 | 3g | 3 | 9 | 0.15 |

### Room 2 (mine_02) — Intermediate

| Ore | Tier | HP | Value | Mining Lv | XP | Rarity |
|-----|------|----|-------|-----------|-----|--------|
| Steel | 2 | 16 | 4g | 8 | 12 | 0.15 |
| Gold | 3 | 20 | 5g | 12 | 18 | 0.10 |
| Amethyst | 3 | 24 | 7g | 16 | 22 | 0.08 |

### Room 3 (mine_03) — Advanced

| Ore | Tier | HP | Value | Mining Lv | XP | Rarity |
|-----|------|----|-------|-----------|-----|--------|
| Ruby | 4 | 30 | 10g | 20 | 30 | 0.06 |
| Diamond | 4 | 35 | 14g | 25 | 40 | 0.05 |
| Emerald | 4 | 35 | 16g | 30 | 50 | 0.04 |

### Room 4 (mine_04) — Elite

| Ore | Tier | HP | Value | Mining Lv | XP | Rarity |
|-----|------|----|-------|-----------|-----|--------|
| Titanium | 5 | 42 | 20g | 35 | 65 | 0.035 |
| Mythril | 5 | 48 | 24g | 40 | 80 | 0.030 |
| Celestium | 5 | 55 | 28g | 45 | 100 | 0.025 |
| Obsidian | 5 | 60 | 32g | 50 | 125 | 0.020 |
| Dusk | 5 | 70 | 40g | 55 | 150 | 0.015 |

## Pickaxe Tiers (8 types)

Defined in `interactable.js`. Pickaxes are melee weapons with `special: 'pickaxe'`.

| Pickaxe | Tier | Damage | Range | Cooldown | Mining Speed | Crit | Color | Unlocked After |
|---------|------|--------|-------|----------|--------------|------|-------|----------------|
| Pickaxe | 0 | 10 | 70 | 32 | 1.0 | 0% | #8a6a3a | — (default) |
| Copper Pickaxe | 1 | 14 | 70 | 30 | 1.15 | 0% | #b87333 | Coal |
| Iron Pickaxe | 2 | 18 | 70 | 28 | 1.3 | 0% | #8a8a8a | Iron Ore |
| Gold Pickaxe | 3 | 22 | 75 | 26 | 1.5 | 0% | #ffd700 | Gold Ore |
| Amethyst Pickaxe | 4 | 26 | 75 | 24 | 1.7 | 0% | #9b59b6 | Amethyst |
| Ruby Pickaxe | 5 | 30 | 80 | 22 | 1.9 | 0% | #e74c3c | Ruby |
| Diamond Pickaxe | 6 | 35 | 80 | 20 | 2.1 | 0% | #85c1e9 | Diamond |
| Emerald Pickaxe | 7 | 40 | 85 | 18 | 2.4 | 0% | #2ecc71 | Emerald |

- **Damage**: Used for both combat AND ore mining (`floor(damage / 10)` per tick)
- **Mining Speed**: Multiplier on baseTick (higher = faster). Tick rate = `floor(44 / miningSpeed)`
- **Unlocked After**: Must have mined that ore type (in `_discoveredOres`) to purchase

### Damage & Speed Examples

| Pickaxe | Ore Dmg/Tick | Tick Rate | Effective DPS |
|---------|-------------|-----------|---------------|
| Pickaxe (10 dmg, 1.0 speed) | 1 | 44 frames | ~1.4/sec |
| Iron (18 dmg, 1.3 speed) | 1 | 33 frames | ~1.8/sec |
| Gold (22 dmg, 1.5 speed) | 2 | 29 frames | ~4.1/sec |
| Diamond (35 dmg, 2.1 speed) | 3 | 21 frames | ~8.6/sec |
| Emerald (40 dmg, 2.4 speed) | 4 | 18 frames | ~13.3/sec |

## Ore Spawning Algorithm

`spawnOreNodes()` — called when entering a mine room (via stateReset.js).

**Phase 1: Group center placement**
- 18 attempts to place group centers on non-solid tiles
- Each must clear: walls (4 tiles), spawns (4 tiles), exits (5 tiles), other groups (12 tiles)
- Up to 80 placement attempts per group

**Phase 2: Ore population**
- Each group gets 5-6 ores of a single type (weighted random via `pickRandomOreForRoom()`)
- Placed within 2-tile radius of group center
- 1.2-tile minimum spacing between ores in same group
- Up to 20 attempts per ore

## Mining Tick Loop

`updateMining()` — per-frame, only when `Scene.inMine`.

### Respawn Phase
- Each depleted ore: decrement `respawnTimer`
- When timer reaches 0: restore `depleted = false`, `hp = maxHp`

### Mining Activation
```
isSwinging = InputIntent.shootHeld && melee.special === 'pickaxe' && activeSlot === 1
```
If not swinging: reset all mining state.

### Ore Targeting
1. Find nearest non-depleted ore within 90px
2. Direction check: uses `getAimDir()` (mouse/arrow), NOT `player.dir` (stale at 14 frames)
3. Cone check with `dirConeWidth` (0.85)

### Mining Level Gate
If `skillData['Mining'].level < oreType.miningLevelReq`:
- Show locked indicator ("🔒 Mining Lv.X")
- Set `_miningLockedNodeId` and `_miningLockedReq`
- Do not mine

### Target Switch
When target changes, timer initialized to `tickRate - melee.swingDuration` (first hit fires early to align with swing animation).

### Damage Tick
When `miningTimer >= tickRate`:
1. Calculate `dmgPerTick = floor(pickaxe.damage / 10)`, minimum 1
2. Roll crit chance: if hit, dmgPerTick × 2
3. Apply damage: `ore.hp -= dmgPerTick`
4. Trigger hit flash effect
5. If ore depleted (hp <= 0):
   - Mark depleted, set respawnTimer = `respawnTime + regrowFrames` (690 frames ≈ 11.5s)
   - Collect ore: `addToInventory(createOreItem(oreId))`
   - If inventory full: spawn ground pickup via `spawnOrePickup()`
   - Add to `_discoveredOres`
   - Award XP: `addSkillXP('Mining', oreType.xp)`

## Ore Respawn Cycle

| Phase | Duration | Visual |
|-------|----------|--------|
| Depleted | 600 frames (10s) | 4 rubble chunks + scattered pebbles |
| Regrowing | 90 frames (1.5s) | Scale 0.3→1.0, opacity 0.5→1.0 |
| Active | — | Full rock body + veins + sparkles + bobbing |

## Ground Ore Pickups

When inventory is full, mined ores spawn as floating ground pickups.

### Pickup Structure
```js
{ oreId, x, y, life: 1800, bobOffset: random }
```

### Behavior
- Lifetime: 1800 frames (~30s at 60fps)
- Pickup distance: 40px from player
- Auto-collects on player touch via `addToInventory()`
- Shows "+1 Ore Name" floating text on collection
- Bobbing animation: `sin(time × 3 + offset) × 3` px
- Fade-out over last 120 frames (2 seconds)
- Despawns at life <= 0

### Rendering
- Dark body circle (10px radius, colorDark)
- Bright core circle (5px radius, color)
- Sparkle dot (2px, pulsing opacity)

## Ore Node Rendering (drawOreNodes)

All ore nodes rendered in world space. Each active (non-depleted) ore shows:

1. **Shadow**: ellipse at base (0.6×0.2 scale, 20% opacity)
2. **Rock body**: 7-point irregular polygon (colorDark)
3. **Ore veins**: 2 brighter inlaid polygons (color)
4. **Sparkles**: 3 circles pulsing (sparkle color, 30-40% opacity)
5. **Bobbing**: `sin(time × 1.5 + offset) × 1.5px` vertical sway
6. **Name label**: ore name in ore color, bold 9px, above node
7. **HP bar**: green→yellow→red, 5px tall (only if partially mined)

### Interaction Prompts
- "⛏ Mine" (white, 10px) — when ore is minable
- "🔒 Mining Lv.X" (red, 11px) — when level-locked (only shown when shootHeld)
- "Equip Pickaxe" (faded, 9px) — when pickaxe not equipped

## Collision

`resolveOreCollisions()` — called after player movement each frame.

- Circle-circle collision (NOT grid-based AABB)
- Player radius: `GAME_CONFIG.MINING_PLAYER_R`
- Ore radius: `GAME_CONFIG.ORE_COLLISION_RADIUS`
- Only non-depleted ores collide (player walks through rubble)
- Resolution: push player out along normal vector

## Mining Rooms

Four mine rooms in `levelData.js`, each 70×48 tiles:

| Room | Ores | Tiers | Entities |
|------|------|-------|----------|
| mine_01 | Stone, Coal, Copper, Iron | 1-2 | Door to mine_02, mining_npc, torches |
| mine_02 | Steel, Gold, Amethyst | 2-3 | Doors to mine_01 + mine_03, mining_npc, torches |
| mine_03 | Ruby, Diamond, Emerald | 4 | Door to mine_02 + mine_04, mining_npc, torches |
| mine_04 | Titanium, Mythril, Celestium, Obsidian, Dusk | 5 | Door to mine_03 + lobby exit, mining_npc, torches |

Linear progression: mine_01 → mine_02 → mine_03 → mine_04.

## Key Functions

| Function | Description |
|----------|-------------|
| `spawnOreNodes()` | Two-phase spawning: group centers → ore population. Called on room enter |
| `updateMining()` | Per-frame: respawn timers, target finding, tick damage, ore depletion |
| `drawOreNodes()` | World-space: ore visuals (rock + veins + sparkle + labels + HP bars) |
| `resolveOreCollisions()` | Push player out of non-depleted ores (circle-circle) |
| `getNearestOre()` | Returns nearest non-depleted ore within range |
| `getMiningTickRate()` | Effective tick rate: `floor(baseTick / miningSpeed)`, min 10 |
| `getOreDamagePerTick()` | `floor(pickaxe.damage / 10)`, min 1 |
| `createOreItem(oreId)` | Creates stackable material item with tier/value/color/oreId |
| `spawnOrePickup(oreId, x, y)` | Ground pickup when inventory full |
| `updateOrePickups()` | Per-frame: lifetime, player pickup collision |
| `drawOrePickups()` | World-space: floating ore sprites with bob + fade |
| `pickRandomOreForRoom(roomId)` | Weighted random from MINE_ROOM_ORES |

## Save/Load Integration

### Saved
- `window._pickaxeLevels` — `{ pickId: { tier, level } }` per pickaxe
- `window._discoveredOres` — Array of ore ID strings (serialized from Set)

### Loaded
- Pickaxe levels restored, with migration from old integer format (v1-v6) to `{ tier, level }` (v7+)
- Owned pickaxes recreated in inventory via `createPickaxe(pickId, tier, level)`
- Discovered ores restored to Set

## Connections to Other Systems

- **Melee System** — Pickaxes are melee weapons (`special: 'pickaxe'`). Swing animation from `meleeSwing()`, but mining damage is on a separate tick timer.
- **Input System** — `InputIntent.shootHeld` for continuous mining. `getAimDir()` for directional targeting.
- **Inventory System** — Ores are stackable material items via `createOreItem()` + `addToInventory()`.
- **Crafting System** — Mined ores are used as upgrade/evolution ingredients in the Forge. Share `type: 'material'` with crafting materials.
- **Skill XP** — Awards Mining XP via `addSkillXP('Mining', xp)`. Ore access gated by `skillData['Mining'].level`.
- **Character Sprite** — `window._miningActive`, `_miningHitFlash`, `_miningSwingPhase`, `_miningSwingDir` drive pickaxe swing animation.
- **Collision** — `resolveOreCollisions()` called after player movement.
- **Scene System** — `spawnOreNodes()` on room enter. `updateMining()` only when `Scene.inMine`.
- **Draw System** — `drawOreNodes()` and `drawOrePickups()` in world-space context.
- **State Reset** — `spawnOreNodes()` called from stateReset on mine room entry. Pickaxes restored from `_pickaxeLevels` on floor transitions.
- **Save/Load** — Persists `_pickaxeLevels` and `_discoveredOres`.

## Gotchas & Rules

- Pickaxes are melee weapons — they deal combat damage AND mine ores. `special: 'pickaxe'` enables mining.
- Mining uses `getAimDir()` (mouse/arrow) not `player.dir` for cone check. `player.dir` reverts after `shootFaceTimer` (~14 frames), but mining tick is 44 frames.
- Ore damage scales: `floor(damage / 10)`. Bronze (10 dmg) = 1/tick, Gold (22 dmg) = 2/tick, Emerald (40 dmg) = 4/tick.
- Mining tick rate scales with `miningSpeed`: `baseTick / miningSpeed`. Higher = faster.
- First hit on a new target fires early (`tickRate - melee.swingDuration` frames) to align with swing animation.
- Ore collision uses circle-circle, not grid-based AABB.
- Each ore group contains a single ore type (Gold vein won't have Amethyst mixed in).
- Legacy aliases exist: `MINE_RANGE`, `MINE_TICK_RATE`, `ORE_NODE_SIZE` etc.
- If inventory is full, mined ore spawns as ground pickup (not lost).
- Ground pickups despawn after 30 seconds with 2-second fade-out.
- Discovery tracking is permanent and persisted — used for pickaxe unlock gates.
- `window._opMode` bypasses mining level requirements.
