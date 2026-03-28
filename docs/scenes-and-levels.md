# Scenes and Levels

## Overview

The scene system controls which level the player is in and what gameplay rules apply. A global `Scene` state machine tracks the current scene, exposes boolean flags consumed throughout the codebase, and emits `scene_changed` events. Level data is defined as inline objects in `LEVELS`, each with a collision grid, entity list, and scene-type flags. Transitions between levels use a two-phase screen fade managed by `startTransition` / `enterLevel`.

## Files

- `js/core/sceneManager.js` -- Scene state machine, portal registry, /leave system, queue system, collision, zone transitions
- `js/shared/levelData.js` -- `TILE` constant (48px), `LEVELS` registry (all 27 level definitions), `collisionFromAscii()` helper, portal spawn resolver IIFE
- `js/shared/dungeonRegistry.js` -- `DUNGEON_REGISTRY` (6 dungeon types), `FLOOR_CONFIG`, `validateDungeonType()`
- `js/authority/stateReset.js` -- `resetCombatState(mode)` for inventory/equipment/combat cleanup between runs

## Key Functions & Globals

| Symbol | Type | Purpose |
|--------|------|---------|
| `Scene` | object | State machine with `.current`, `.is(name)`, `.inDungeon`, `.inLobby`, etc. |
| `TILE` | const `48` | Tile size in pixels; all positions convert via `tx * TILE + TILE/2` |
| `LEVELS` | object | Map of level-id to level definition objects |
| `level` | let | Active level object (set by `setLevel()`) |
| `collisionGrid` | let | 2D array of 0/1 parsed from the active level's `collisionAscii` |
| `levelEntities` | let | Array of entity objects in the current level |
| `MAP_W`, `MAP_H` | let | Active level size in pixels |
| `setLevel(levelObj)` | function | Sets active level, rebuilds collision grid, calls `Scene._update()` |
| `isSolid(col, row)` | function | Returns true if tile is wall or contains a solid entity |
| `startTransition(target, spawnTX, spawnTY)` | function | Begins fade-out to a new level |
| `enterLevel(targetId, spawnTX, spawnTY)` | function | Loads level, positions player, resets state based on scene type |
| `checkPortals()` | function | Scans `levelEntities` for portal overlap with player, triggers transitions |
| `goToNextFloor()` | function | Advances `dungeonFloor`, calls `resetCombatState('floor')` |
| `handleLeave()` | function | Processes `/leave` command for enclosed scenes (dungeon, hideseek, skeld, mafia_lobby) |
| `resetCombatState(mode)` | function | Centralized reset for all scenarios: `'lobby'`, `'dungeon'`, `'death'`, `'floor'`, `'mine'`, `'cooking'`, `'farm'`, `'hideseek'` |

## How It Works

### Scene State Machine

`Scene._current` holds a string identifying the active scene. It is recalculated by `Scene._update()` every time `setLevel()` is called, by checking boolean flags on the level object.

**All `Scene.current` values:**

| Value | Level flag | Description |
|-------|-----------|-------------|
| `'lobby'` | `isLobby` | Overworld hub with buildings, portals, NPC entrances |
| `'cave'` | `isCave` | Cave area with dungeon queue zones |
| `'dungeon'` | _(default)_ | Wave-based combat rooms |
| `'test_arena'` | `isTestArena` | Dev testing arena |
| `'mine'` | `isMine` | Mining minigame (4 mine rooms) |
| `'cooking'` | `isCooking` | Restaurant cooking (deli, diner, fine dining) |
| `'farm'` | `isFarm` | Farming area |
| `'azurine'` | `isAzurine` | Azurine City hub (separate dungeon queue) |
| `'gunsmith'` | `isGunsmith` | Gunsmith shop interior |
| `'hideseek'` | `isHideSeek` | Hide & Seek game mode |
| `'mafia_lobby'` | `isMafiaLobby` | Pre-game lobby for Mafia (Among Us-style) |
| `'skeld'` | `isSkeld` | The Skeld map (Mafia game in-progress) |
| `'vortalis'` | `isVortalis` | Vortalis dungeon hub |
| `'earth205'` | `isEarth205` | Earth-205 dungeon hub |
| `'wagashi'` | `isWagashi` | Wagashi dungeon hub |
| `'earth216'` | `isEarth216` | Earth-216 dungeon hub |
| `'casino'` | `isCasino` | Casino interior (10 minigames) |
| `'spar'` | `isSpar` | PvP sparring arena (ranked/casual matches with AI opponent) |

**Scene flags (18 total):** `isLobby`, `isFarm`, `isCave`, `isAzurine`, `isMine`, `isCooking`, `isTestArena`, `isGunsmith`, `isHideSeek`, `isSkeld`, `isMafiaLobby`, `isVortalis`, `isEarth205`, `isWagashi`, `isEarth216`, `isCasino`, `isSpar`, `isSparArena`. Each scene value has a corresponding getter (`Scene.inDungeon`, `Scene.inLobby`, `Scene.inCave`, etc.) for convenient boolean checks. Note: `isSparArena` is a supplementary flag on spar arena levels (used alongside `isSpar`), not its own Scene.current value.

### Level Data Format

Each entry in `LEVELS` is an object with:

```
{
  id: 'lobby_01',
  widthTiles: 80,
  heightTiles: 64,
  isLobby: true,           // scene-type flag (only one set per level)
  spawns: { p1: { tx: 40, ty: 42 } },
  collisionAscii: [         // array of strings, one per row
    "@@@@@@@@@@@@",          // '#' or '@' = wall (1), '.' = floor (0)
    "@..........@",
    "@@@@@@@@@@@@",
  ],
  entities: [
    { type: 'cave_entrance', tx: 37, ty: 8, w: 5, h: 2, solid: false,
      target: 'cave_01', spawnTX: 15, spawnTY: 19 },
    { type: 'fountain', tx: 33, ty: 24, w: 14, h: 12, solid: true },
    { type: 'tree', tx: 10, ty: 38, solid: true, variant: 1 },
  ],
}
```

**Tile types in collisionAscii:**
- `.` (dot) = floor (0) -- walkable
- `#` or `@` = wall (1) -- solid, blocks movement

**All 27 level IDs in `LEVELS`:**

| Level ID | Size (WxH) | Scene Flag | Spawn / Notes |
|----------|-----------|------------|---------------|
| `lobby_01` | 80x64 | `isLobby` | spawn 40,42 |
| `house_01` | 40x30 | `isFarm` | spawn 10,26 |
| `cave_01` | 40x24 | `isCave` | spawn 20,19 |
| `azurine_01` | 40x24 | `isAzurine` | spawn 20,19 |
| `warehouse_01` | 40x40 | _(none)_ | p1: 5,20 / p2: 34,20 (dungeon combat room) |
| `azurine_dungeon_01` | 36x36 | _(none)_ | p1: 3,18 / p2: 32,18 (Azurine dungeon combat room) |
| `mine_01` | 70x48 | `isMine` | spawn 35,44 |
| `mine_02` | 70x48 | `isMine` | spawn 35,44 |
| `mine_03` | 70x48 | `isMine` | spawn 35,44 |
| `mine_04` | 70x48 | `isMine` | spawn 35,44 |
| `deli_01` | 40x36 | `isCooking` | spawn 14,34 |
| `diner_01` | 48x24 | `isCooking` | spawn 27,21 |
| `fine_dining_01` | 44x26 | `isCooking` | spawn 40,24 |
| `test_arena` | 36x28 | `isTestArena` | spawn 18,10 |
| `gunsmith_01` | 44x30 | `isGunsmith` | spawn 22,26 |
| `hide_01` | 55x42 | `isHideSeek` | seeker: 5,4 / hider: 45,38 / p1: 5,4 |
| `skeld_01` | 135x80 | `isSkeld` | p1: 74,18 / XO=4 offset |
| `mafia_lobby` | 50x30 | `isMafiaLobby` | spawn 25,20 |
| `vortalis_01` | 40x24 | `isVortalis` | spawn 20,19 |
| `earth205_01` | 40x24 | `isEarth205` | spawn 20,19 |
| `wagashi_01` | 40x24 | `isWagashi` | no explicit spawns |
| `earth216_01` | 40x24 | `isEarth216` | no explicit spawns |
| `casino_01` | 56x40 | `isCasino` | spawn 28,38 |
| `spar_hub_01` | 30x20 | `isSpar` | spawn 15,18 |
| `spar_1v1_01` | 24x20 | `isSpar` + `isSparArena` | |
| `spar_2v2_01` | 24x20 | `isSpar` + `isSparArena` | |
| `spar_3v3_01` | 36x28 | `isSpar` + `isSparArena` | |
| `spar_4v4_01` | 36x28 | `isSpar` + `isSparArena` | |

### Portal System

Portals are level entities with a `target` (level ID), `spawnTX`, and `spawnTY`. The `PORTAL_SCENES` registry maps entity types to their required scene:

```
cave_entrance: 'lobby',   cave_exit: 'cave',
mine_entrance: 'lobby',   mine_exit: 'mine',    mine_door: 'mine',
deli_entrance: 'lobby',   deli_exit: 'cooking',
diner_entrance: 'lobby',  diner_exit: 'cooking',
fine_dining_entrance: 'lobby', fd_exit_door: 'cooking',
house_entrance: 'lobby',  house_exit: 'farm',
azurine_entrance: 'lobby', azurine_exit: 'azurine',
gunsmith_entrance: 'lobby', gunsmith_exit: 'gunsmith',
hideseek_entrance: 'lobby',
skeld_entrance: 'lobby',
mafia_lobby_exit: 'mafia_lobby',
vortalis_entrance: 'lobby', vortalis_exit: 'vortalis',
earth205_entrance: 'lobby', earth205_exit: 'earth205',
wagashi_entrance: 'lobby',  wagashi_exit: 'wagashi',
earth216_entrance: 'lobby', earth216_exit: 'earth216',
casino_entrance: 'lobby',   casino_exit: 'casino',
spar_entrance: 'lobby',     spar_exit: 'spar',
```

**16 lobby portals with coordinates (tile positions in lobby_01):**

| Portal Entity | Position (tx,ty) | Target Level | Portal spawnTX,spawnTY |
|---------------|-----------------|--------------|----------------------|
| `cave_entrance` | 37,8 | `cave_01` | 15,19 |
| `house_entrance` | 14,7 | `house_01` | 10,26 |
| `mine_entrance` | 52,7 | `mine_01` | 35,44 |
| `azurine_entrance` | 71,7 | `azurine_01` | 20,19 |
| `deli_entrance` | 5,19 | `deli_01` | 14,30 |
| `hideseek_entrance` | 16,19 | `hide_01` | 5,5 |
| `skeld_entrance` | 27,19 | `mafia_lobby` | 25,20 |
| `gunsmith_entrance` | 71,19 | `gunsmith_01` | 22,26 |
| `vortalis_entrance` | 52,19 | `vortalis_01` | 20,19 |
| `casino_entrance` | 71,31 | `casino_01` | 28,37 |
| `earth205_entrance` | 52,31 | `earth205_01` | 20,19 |
| `diner_entrance` | 5,31 | `diner_01` | 27,33 |
| `wagashi_entrance` | 52,43 | `wagashi_01` | 20,19 |
| `fine_dining_entrance` | 5,43 | `fine_dining_01` | 40,24 |
| `earth216_entrance` | 52,55 | `earth216_01` | 20,19 |
| `spar_entrance` | 16,31 | `spar_hub_01` | 15,18 |

**Portal Spawn Resolver:** An IIFE at the bottom of `levelData.js` auto-computes `spawnTX`/`spawnTY` for exit portals. For each entity with a `target`, it finds the partner portal in the target level (the portal that leads back), then sets spawnTX to the center of the partner zone and spawnTY to 1 tile on the interior side (above if partner is near bottom, below if near top).

`checkPortals()` runs every frame, scanning `levelEntities` for portal overlap. When the player's tile position falls inside a portal zone and the current scene matches `PORTAL_SCENES[type]`, it calls `startTransition()`.

**Spawn alignment:** Player is positioned at `spawnTX * TILE + TILE/2, spawnTY * TILE + TILE/2` (center of the spawn tile).

### Zone Transitions

Transitions use a two-phase alpha fade:
1. **Phase 1 (fade out):** `transitionAlpha` increases from 0 to 1 at +0.12/frame. At 1.0, calls `enterLevel()`.
2. **Phase 2 (fade in):** `transitionAlpha` decreases from 1 to 0 at -0.08/frame. During this phase the new level is visible.

`startTransition()` guards against double-transitions (`if (transitioning) return`).

### Queue System

Dungeon entry uses a queue mechanic:
- Player walks onto a `queue_zone` entity in the cave/azurine hub
- Pressing interact calls `joinQueue()`, locking the player on a sigil position
- `queueTimer` counts down from `QUEUE_DURATION` (600 frames = 10s)
- When timer hits 0, `enterLevel()` is called with the queued dungeon ID
- Queue tracks `queueDungeonType` (one of the 6 registered dungeon types: `cave`, `azurine`, `vortalis`, `earth205`, `wagashi`, `earth216`) and `queueFloorStart` for the starting floor

### State Reset Between Runs

`resetCombatState(mode)` is the single cleanup function, replacing 4+ previously scattered reset blocks. Modes:

| Mode | What it does |
|------|-------------|
| `'lobby'` | Full reset: clears mobs/effects, re-creates default inventory (guns, melee, pickaxe, rod, hoe, potions), restores persistent gun levels, caps HP to 50 |
| `'dungeon'` | Full reset + sets `dungeonFloor`, `lives=3`, `wave=0`, recalculates maxHp, resets shop prices, inits hazards |
| `'death'` | Same as dungeon + resets gold, `deathGameOver=false` |
| `'floor'` | Partial reset: clears mobs/effects but keeps inventory/equipment, restores HP to max, adds 2 potions, inits hazards for new floor |
| `'mine'` | Keeps everything, spawns ore nodes, resets mining state |
| `'cooking'` | Keeps everything, resets cooking state, inits deli NPCs |
| `'farm'` | Keeps everything, resets farming state, inits farm |
| `'hideseek'` | Keeps inventory, resets combat arrays |

All modes share a common preamble: clear `mobs`, `bullets`, `hitEffects`, `deathEffects`, `mobParticles`, `medpacks`, `oreNodes`, reset wave state, clear status effects, clear telegraph/hazard systems, reset dev flags (`_mobsFrozen`, `_godMode`, `_mobsNoFire`, `_gameSpeed`).

### Collision: `isSolid(col, row)`

Returns `true` if:
1. Position is out of bounds (negative or beyond level dimensions)
2. `collisionGrid[row][col] === 1` (wall tile from collisionAscii)
3. Any entity in `levelEntities` with `solid: true` spans that tile (checked via `tx`, `ty`, `w`, `h`)

This is the foundation for all movement collision -- player AABB checks, mob `positionClear()`, BFS pathfinding, and bullet despawn.

### /leave System

`LEAVE_HANDLERS` maps scene names to cleanup + return-level configurations. When the player types `/leave`:
1. Look up handler for `Scene.current`
2. Call `handler.cleanup()` (clears scene-specific state)
3. `startTransition()` to the return level (if provided)
4. Push system chat message

Scenes with `/leave` support: `test_arena`, `mine`, `cooking`, `farm`, `cave`, `azurine`, `vortalis`, `earth205`, `wagashi`, `earth216`, `gunsmith`, `casino`, `dungeon`, `hideseek`, `mafia_lobby`, `skeld`, `spar`.

### LEAVE_HANDLER Auto-Cleanup

`enterLevel()` now automatically runs the current scene's `LEAVE_HANDLER.cleanup()` before transitioning to a new level. This means portal transitions get the same cleanup (closing panels, resetting state) that `/leave` provides. You do not need to manually call cleanup on portal exits -- it happens automatically.

### Dungeon Floor Progression

- `goToNextFloor()` increments `dungeonFloor`, calls `resetCombatState('floor')`, repositions player to center, triggers fade
- Stairs appear at room center when all waves are cleared (`stairsOpen` flag)
- Player presses interact near stairs to advance
- Final floor shows "EXIT DUNGEON" instead of floor number
- `Events.emit('floor_changed', { floor })` notifies subscribers

### DUNGEON_REGISTRY

Defined in `js/shared/dungeonRegistry.js`. Maps dungeon type keys to configuration objects. All dungeons have `hasHazards: false`, `tileset: ''`, `music: ''`.

| Key | Name | Level ID | Floors | Return Level | Req. Level | Reward Mult | Difficulty | Spawn |
|-----|------|----------|--------|-------------|-----------|-------------|-----------|-------|
| `cave` | Cave Dungeon | `warehouse_01` | 5 | `cave_01` | 0 | 1.0 | 1 | 20,20 |
| `azurine` | Azurine City | `azurine_dungeon_01` | 5 | `azurine_01` | 10 | 1.5 | 2 | 18,18 |
| `vortalis` | Vortalis | `warehouse_01` | 5 | `vortalis_01` | 20 | 2.0 | 3 | 20,20 |
| `earth205` | Earth-205: Marble City | `warehouse_01` | 5 | `earth205_01` | 30 | 2.8 | 4 | 20,20 |
| `wagashi` | Wagashi: Heavenly Realm | `warehouse_01` | 5 | `wagashi_01` | 40 | 3.5 | 5 | 20,20 |
| `earth216` | Earth-216: Sin City | `warehouse_01` | 5 | `earth216_01` | 50 | 4.5 | 5 | 20,20 |

Note: Azurine is the only dungeon using `azurine_dungeon_01` (36x36). All others use `warehouse_01` (40x40). Both `wagashi` and `earth216` share difficulty 5.

### The Skeld Room Coordinates

All coordinates are in virtual space. Add `XO=4` to get actual grid coordinates. Minimap labels in `draw.js` use actual (virtual + XO).

| Room | Virtual (x1,y1)-(x2,y2) | Size (WxH) |
|------|-------------------------|------------|
| Cafeteria | (57,1)-(84,34) | 28x34 |
| Upper Engine | (1,1)-(23,17) | 23x17 |
| Reactor | (-3,23)-(8,46) | 12x24 |
| Security | (24,24)-(36,41) | 13x18 |
| MedBay | (38,18)-(53,32) | 16x15 |
| Electrical | (37,42)-(55,62) | 19x21 |
| Admin | (78,37)-(96,54) | 19x18 |
| Storage | (58,53)-(75,78) | 18x26 |
| Shields | (99,54)-(117,70) | 19x17 |
| Communications | (80,67)-(97,78) | 18x12 |
| Lower Engine | (1,52)-(23,68) | 23x17 |
| Weapons | (95,1)-(115,17) | 21x17 |
| O2 | (86,22)-(99,35) | 14x14 |
| Navigation | (117,24)-(129,44) | 13x21 |

## Connections to Other Systems

- **Wave system** (`waveSystem.js`) -- controls `stairsOpen`, `waveState`, mob spawning per floor
- **Dungeon registry** (`js/shared/dungeonRegistry.js`) -- `DUNGEON_REGISTRY` maps 6 dungeon types to level IDs, floor counts, return levels, difficulty, reward multipliers
- **Event bus** (`eventBus.js`) -- `scene_changed` and `floor_changed` events
- **Game state** (`gameState.js`) -- `player`, `mobs`, `bullets`, `hitEffects`, `gold`, `dungeonFloor`
- **Panel manager** (`panelManager.js`) -- `UI.close()` called on every level transition
- **Mafia system** (`mafiaSystem.js`) -- skeld/mafia_lobby cleanup in LEAVE_HANDLERS

## Gotchas & Rules

- **Script load order matters.** `levelData.js` (Phase A) must load before `sceneManager.js` (Phase E) because `setLevel(LEVELS.lobby_01)` runs at parse time.
- **The Skeld map coordinates use a virtual offset.** All Skeld coordinates have `XO=4` applied. Minimap labels in `draw.js` use actual grid coordinates (virtual + XO). See CLAUDE.md for mandatory Skeld editing rules.
- **Portal re-teleport loops.** Spawn coordinates must not overlap the portal entrance zone, or the player will immediately re-teleport. Always verify return coordinates are outside the portal trigger area.
- **`LOBBY_RESET_SCENES`** is a Set controlling which scenes get the lobby-style full inventory reset: `lobby`, `cave`, `azurine`, `gunsmith`, `skeld`, `mafia_lobby`, `vortalis`, `earth205`, `wagashi`, `earth216`, `casino`.
- **Dungeon type and return level** flow through pending variables (`pendingDungeonFloor`, `pendingDungeonType`, `pendingReturnLevel`), set by the queue system and consumed by `resetCombatState('dungeon')`.
- **`isSolid` checks entities too**, not just the collision grid. A 7x8 solid building entity will block movement even though the underlying collision grid tiles are floor.
