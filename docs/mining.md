# Mining System

## Overview
A resource-gathering skill where the player equips a pickaxe and mines ore nodes in dedicated mine rooms (mine_01 through mine_04). Ore nodes spawn in clustered vein groups when entering a room, are destroyed by repeated pickaxe strikes on a tick timer, drop stackable ore items into the player's inventory, and respawn after a cooldown. Mining level gates access to higher-tier ores, and pickaxe tiers scale mining speed and damage. Discovery tracking unlocks progression gates.

## Files
- `js/shared/oreData.js` — 15 ore type definitions, room-to-ore mapping (`MINE_ROOM_ORES`), weighted random ore picker
- `js/authority/miningSystem.js` — Mining config/constants, ore spawning algorithm, per-frame mining update, ore damage/collection, ore node rendering, collision resolution, swing animation state
- `js/shared/gameConfig.js` — `GAME_CONFIG.ORE_COLLISION_RADIUS` and `GAME_CONFIG.MINING_PLAYER_R` constants
- `js/core/interactable.js` — `PICKAXE_TIERS` definitions (pickaxe stats, miningSpeed multiplier)

## Key Functions & Globals

### State
- `oreNodes` — Array of all spawned ore nodes in the current mine room. Each node: `{ id, tx, ty, x, y, oreId, hp, maxHp, depleted, respawnTimer, shimmerOffset }`.
- `miningTarget` — ID of the ore node currently being mined (null if none).
- `miningTimer` — Frame counter until next mining hit fires.
- `miningProgress` — Number of accumulated hits on the current target.
- `window._miningActive` — Boolean read by `characterSprite.js` for swing animation.
- `window._miningHitFlash` — Frames remaining for hit flash visual spike.
- `window._miningSwingPhase`, `window._miningSwingDir` — Animation phase state.
- `window._miningLockedNodeId`, `window._miningLockedReq` — Set when player aims at a level-locked ore.
- `window._discoveredOres` — `Set` tracking which ore IDs the player has ever mined (for unlock gates).

### Data Constants
- `ORE_TYPES` — Object of 15 ore definitions across 5 tiers. Each: `{ id, name, tier, hp, value, color, colorDark, sparkle, rarity, miningLevelReq, xp }`.
- `MINE_ROOM_ORES` — Maps room IDs to ore ID arrays: mine_01 has beginner ores, mine_04 has elite ores.
- `MINING_CONFIG` — Tuning constants: `range` (90px), `baseTick` (44 frames), `nodeSize` (72px), `collisionRadius`, `hitFlashFrames` (6), `respawnTime` (600 frames/10s), `regrowFrames` (90 frames/1.5s), `baseDamage` (1), `dirConeWidth` (0.85).
- `SPAWN_CONFIG` — Ore placement parameters: `groupCount` (18), `oresPerGroupMin/Max` (5-6), spacing constraints, wall/spawn/exit clearances.

### Core Functions
- `spawnOreNodes()` — Called when entering a mine room. Clears `oreNodes`, runs a two-phase placement algorithm: (1) pick 18 group center positions avoiding walls/spawns/exits/other groups, (2) populate each group with 5-6 ores of one type picked via `pickRandomOreForRoom(level.id)`, placed within a 2-tile radius.
- `updateMining()` — Per-frame update. Only runs when `Scene.inMine`. Ticks respawn timers for depleted ores. If player is holding shoot with a pickaxe equipped, finds the nearest non-depleted ore within 90px in the aim direction (cone check), applies Mining level gate, then runs a tick timer that deals `getOreDamagePerTick()` damage per tick. On ore depletion: collects ore item, awards XP, tracks discovery, starts respawn timer.
- `drawOreNodes()` — Renders all ore nodes in world space. Shows rubble for depleted ores, scale-up animation for regrowing ores, full render for active ores (rock body + ore veins + sparkle + name label + HP bar + interaction prompts).
- `resolveOreCollisions()` — Pushes player out of non-depleted ore nodes using circle-circle collision.
- `getNearestOre()` — Returns nearest non-depleted ore node within range (used by other systems).

### Derived Helpers
- `getMiningTickRate()` — Returns effective frames between mining hits: `baseTick / pickaxe.miningSpeed`. Falls back to `PICKAXE_TIERS` lookup if equipped stats missing.
- `getOreDamagePerTick()` — Returns `floor(pickaxe.damage / 10)`, minimum 1. Higher tier pickaxes deal more damage per strike.
- `createOreItem(oreId)` — Creates a stackable material item with `type: "material"`, tier, value, color, oreId.

### Data Helpers (oreData.js)
- `pickRandomOreForRoom(roomId)` — Weighted random selection from `MINE_ROOM_ORES[roomId]`, using `ORE_TYPES[id].rarity` as weight. Falls back to `'stone'`.
- `pickRandomOre()` — Legacy fallback picking from ALL ore types (used if roomId unknown).

## How It Works

### Mining Rooms
Four mine rooms, each with a distinct ore pool:

| Room | Ores | Tiers |
|------|------|-------|
| mine_01 | Stone, Coal, Copper, Iron | 1-2 |
| mine_02 | Steel, Gold, Amethyst | 2-3 |
| mine_03 | Ruby, Diamond, Emerald | 4 |
| mine_04 | Titanium, Mythril, Celestium, Obsidian, Dusk | 5 |

### Ore Types (15 total)

| Ore | Tier | HP | Value | Mining Lv | XP | Rarity Weight |
|-----|------|----|-------|-----------|-----|---------------|
| Stone | 1 | 5 | 1 | 1 | 3 | 0.40 |
| Coal | 1 | 7 | 1 | 1 | 4 | 0.25 |
| Copper | 1 | 9 | 2 | 1 | 6 | 0.20 |
| Iron | 2 | 12 | 3 | 3 | 9 | 0.15 |
| Steel | 2 | 16 | 4 | 8 | 12 | 0.15 |
| Gold | 3 | 20 | 5 | 12 | 18 | 0.10 |
| Amethyst | 3 | 24 | 7 | 16 | 22 | 0.08 |
| Ruby | 4 | 30 | 10 | 20 | 30 | 0.06 |
| Diamond | 4 | 35 | 14 | 25 | 40 | 0.05 |
| Emerald | 4 | 35 | 16 | 30 | 50 | 0.04 |
| Titanium | 5 | 42 | 20 | 35 | 65 | 0.035 |
| Mythril | 5 | 48 | 24 | 40 | 80 | 0.03 |
| Celestium | 5 | 55 | 28 | 45 | 100 | 0.025 |
| Obsidian | 5 | 60 | 32 | 50 | 125 | 0.02 |
| Dusk | 5 | 70 | 40 | 55 | 150 | 0.015 |

### Ore Spawning Algorithm
1. **Group center placement**: 18 attempts, each placing a group center on a non-solid tile with clearances from walls (4 tiles), spawns (4 tiles), exits/doors (5 tiles), and other group centers (12 tiles apart).
2. **Ore population**: Each group gets 5-6 ores of a single randomly-picked type (weighted by rarity). Ores are placed within a 2-tile radius of the group center with a minimum 1.2-tile spacing between ores in the same group.

### Mining Tick Loop
1. Player must hold shoot (`InputIntent.shootHeld`) with a pickaxe equipped (`melee.special === 'pickaxe'`, `activeSlot === 1`).
2. System finds the nearest non-depleted ore within 90px that is in front of the player (directional cone check using `getAimDir()`).
3. Mining level is checked against `oreType.miningLevelReq`. If too low, a lock icon is shown and mining does not proceed.
4. A tick timer counts up to `getMiningTickRate()` frames. On tick:
   - Ore takes `getOreDamagePerTick()` damage.
   - Hit flash and particle effect trigger.
   - If ore HP reaches 0: ore becomes depleted, item is collected, XP awarded, `_discoveredOres` updated, respawn timer set to `respawnTime + regrowFrames` (about 11.5 seconds).

### Ore Respawn
- Depleted ores wait `RESPAWN_TIME` (600 frames / 10s) showing rubble.
- Then over `REGROW_FRAMES` (90 frames / 1.5s), the ore visually scales from 30% to 100% size at increasing opacity.
- Once fully regrown, `depleted` is set to false and `hp` is restored to `maxHp`.

### Discovery Tracking
When an ore is mined, its ID is added to `window._discoveredOres` (a `Set`). This is used by other systems (e.g., pickaxe unlock gates) to track which ores the player has encountered.

## Connections to Other Systems
- **Melee System** — Mining uses the melee weapon slot. Pickaxes have `special: 'pickaxe'`. The swing animation is handled by `meleeSwing()`, but mining damage is on a separate tick timer in `updateMining()`.
- **Input System** — Reads `InputIntent.shootHeld` for continuous mining. Uses `getAimDir()` for directional ore targeting.
- **Inventory System** — Collected ores are stackable material items via `createOreItem()` and `addToInventory()`.
- **Skill XP** — Awards Mining XP via `addSkillXP('Mining', xp)`. Ore access gated by `skillData['Mining'].level`.
- **Character Sprite** — `window._miningActive`, `_miningHitFlash`, `_miningSwingPhase`, `_miningSwingDir` drive the pickaxe swing animation in `characterSprite.js`.
- **Collision System** — `resolveOreCollisions()` is called after player movement to push the player out of ore nodes.
- **Scene System** — `spawnOreNodes()` is called when entering a mine room. `updateMining()` only runs when `Scene.inMine` is true.
- **Draw System** — `drawOreNodes()` is called from `draw.js` in the world-space translated context.
- **Game Config** — Uses `GAME_CONFIG.ORE_COLLISION_RADIUS` and `GAME_CONFIG.MINING_PLAYER_R` for collision radii.

## Gotchas & Rules
- Pickaxes are melee weapons. They deal combat damage AND mine ores. The `special: 'pickaxe'` property is what enables mining behavior.
- Mining uses `getAimDir()` (mouse/arrow key direction) rather than `player.dir` for the directional cone check. This is because `player.dir` can revert after `shootFaceTimer` expires (~14 frames), but the mining tick rate is 44 frames, which would cause inconsistent targeting.
- Ore damage per tick scales with pickaxe damage: `floor(damage / 10)`. A Bronze Pickaxe (10 dmg) does 1 damage per tick, a Steel Pickaxe (20 dmg) does 2.
- Mining tick rate scales with `miningSpeed` multiplier from `PICKAXE_TIERS`: `baseTick / miningSpeed`. Faster pickaxes hit more frequently.
- Legacy aliases (`MINE_RANGE`, `MINE_TICK_RATE`, `ORE_NODE_SIZE`, etc.) exist for backward compatibility with other files.
- The first mining hit on a new target fires early (`tickRate - melee.swingDuration` frames) so it aligns with the swing animation connecting, rather than waiting a full tick cycle.
- Ore collision uses circle-circle resolution, not grid-based AABB like wall collision.
- Each ore group in a room contains a single ore type (e.g., a Gold vein won't have random Amethyst mixed in).
