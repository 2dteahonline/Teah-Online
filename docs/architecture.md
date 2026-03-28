# Architecture

## Overview

Teah Online is a top-down dungeon crawler built with vanilla JS and HTML5 Canvas 2D. There are no frameworks, no build tools, and no npm dependencies. The entire game loads from a single `index.html` that pulls in 91 script files, and all game logic is organized around a future-multiplayer authority/client split.

## Files

- `index.html` -- entry point; loads all scripts in dependency order with cache-busting query params
- `js/shared/` -- pure data registries (no logic); loaded first (21 files)
- `js/authority/` -- server-authoritative systems: combat, damage, waves, mobs, inventory, party, bots, casino, cooking, spar (40 files)
- `js/client/rendering/` -- canvas drawing: sprites, entities, effects, FOV (5 files)
- `js/client/input/` -- mouse/keyboard capture, InputIntent flags, command translation (2 files)
- `js/client/ui/` -- panel system: inventory, gunsmith, settings, shop, customization, casino, testmob (11 files)
- `js/core/` -- bridge layer: save/load, scene management, weapons, interactables, camera, draw loop (10 files)
- `js/testing/` -- test harness + spar training (2 files)

## Project Structure

```
Teah Online/
  index.html              -- entry point, canvas setup, script loading (91 scripts)
  assets/
    manifest.json          -- sprite asset manifest
    sprites/               -- body/head/hat sprite templates
  js/
    shared/                -- data registries (loaded first, no logic) — 21 files
      gameConfig.js          physics & collision constants, GAME_UPDATE version
      levelData.js           tile maps, room definitions, TILE constant
      mobTypes.js            mob type definitions
      floorConfig.js         dungeon floor configs
      itemData.js            item definitions
      oreData.js             ore node data
      cookingData.js         cooking recipes
      fishingData.js         fishing spot data
      farmingData.js         farming plot data
      armorVisuals.js        armor cosmetic data
      dungeonRegistry.js     dungeon type registry
      gunData.js             gun stat definitions
      progressionData.js     PROG_ITEMS (5 tiers x 25 levels)
      skillRegistry.js       skill XP categories
      hideSeekData.js        Hide & Seek mode data
      mafiaGameData.js       Mafia mode data + per-map configs
      mafiaRoleData.js       Mafia role definitions (impostor abilities, etc.)
      casinoData.js          casino game configs, payouts, house edge
      partyData.js           party system constants, bot equipment data
    authority/               -- server-authoritative game logic — 40 files
      eventBus.js            Events pub/sub
      gameState.js           GameState + global aliases
      combatSystem.js        StatusFX, MOB_AI (13 patterns), MOB_SPECIALS (91 base abilities)
      vortalisSpecials.js    MOB_SPECIALS for Vortalis dungeon (106 abilities)
      attackShapes.js        attack shape geometry
      telegraphSystem.js     telegraph/warning indicators
      hazardSystem.js        environmental hazards
      earth205Specials.js    MOB_SPECIALS for Earth-205 dungeon (98 abilities)
      wagashiSpecials.js     MOB_SPECIALS for Wagashi dungeon part 1 (28 abilities)
      wagashiSpecials2.js    MOB_SPECIALS for Wagashi dungeon part 2 (28 abilities)
      wagashiSpecials3.js    MOB_SPECIALS for Wagashi dungeon part 3 (14 abilities)
      earth216Specials.js    MOB_SPECIALS for Earth-216 dungeon part 1 (28 abilities)
      earth216Specials2.js   MOB_SPECIALS for Earth-216 dungeon part 2 (28 abilities)
      earth216Specials3.js   MOB_SPECIALS for Earth-216 dungeon part 3 (14 abilities)
      waveSystem.js          wave spawning, createMob()
      damageSystem.js        damage calc, mob death, event emission
      inventorySystem.js     inventory management
      mobSystem.js           mob movement, collision, positionClear()
      stateReset.js          state cleanup between scenes
      miningSystem.js        ore mining logic
      fishingSystem.js       fishing minigame logic
      farmingSystem.js       farming plot logic
      partySystem.js         always-on party system, bot member management
      botAI.js               bot combat/movement AI, equipment buying, auto-respawn
      snapshots.js           game state serialization
      commands.js            debug slash commands
      authorityTick.js       per-frame authority simulation wrapper
      hideSeekSystem.js      Hide & Seek game mode
      mafiaSystem.js         Mafia (Among Us-style) game mode
      casinoSystem.js        casino game logic (10 games, 5% house edge)
      cookingSystem.js       cooking logic
      cookingNPCBase.js      shared base module for all restaurant NPC systems
      deliNPCSystem.js       deli NPC interaction
      dinerNPCSystem.js      diner NPC interaction
      fineDiningNPCSystem.js fine dining NPC system
      fineDiningGrill.js     fine dining teppanyaki grill minigame
    client/
      rendering/             -- 5 files
        hitEffects.js          HIT_EFFECT_RENDERERS (73 effect types)
        entityRenderers.js     ENTITY_RENDERERS (148 entity types)
        characterSprite.js     player/NPC sprite drawing (Graal-style layers)
        hideSeekFOV.js         Hide & Seek FOV rendering
        mafiaFOV.js            Mafia FOV + HUD rendering
      input/                 -- 2 files
        inputIntent.js         InputIntent flag object
        input.js               keyboard/mouse listeners, command translation
      ui/                    -- 11 files
        panelManager.js        panel open/close state machine
        chatProfile.js         chat and profile UI
        toolbox.js             toolbox icon grid
        settings.js            settings panel
        shopFramework.js       shop UI framework
        panels.js              gunsmith, armor, progression panels
        customize.js           character customization panel
        inventory.js           inventory panel + game loop host
        testMobPanel.js        debug mob spawning panel
        casinoUI.js            casino game UI (all 10 games)
        forgeUI.js             forge/crafting UI (weapon upgrades, materials)
    core/                    -- 10 files
      assetLoader.js         AssetLoader (sprite loading from manifest)
      sceneManager.js        Scene state machine (18 scenes, including spar)
      tileRenderer.js        tile map rendering
      gunSystem.js           gun firing, reloading, bullet logic
      meleeSystem.js         melee swing, dash, hit detection
      saveLoad.js            localStorage persistence (schema v10)
      skeldTasks.js          Skeld map task minigames
      cameraSystem.js        camera follow, shake, zoom
      interactable.js        entity interaction, death handling
      draw.js                main draw loop, gameLoop(), HUD
    testing/                 -- 1 file
      testHarness.js         automated test utilities
```

## Script Loading Order

Scripts are loaded via `<script>` tags in `index.html`. Order matters because later scripts depend on globals defined by earlier ones. The loading is organized into phases:

### Phase A: Shared Data

Pure data registries with no logic. These define constants and lookup tables that every other system reads from.

| File | Key Export |
|------|-----------|
| `js/core/assetLoader.js` | `AssetLoader` |
| `js/shared/gameConfig.js` | `GAME_CONFIG` |
| `js/shared/levelData.js` | `TILE`, `LEVELS`, level tile data |
| `js/shared/mobTypes.js` | `MOB_TYPES` |
| `js/shared/floorConfig.js` | floor configuration |
| `js/shared/itemData.js` | item definitions |
| `js/shared/oreData.js` | ore node data |
| `js/shared/cookingData.js` | cooking recipes |
| `js/shared/fishingData.js` | fishing data |
| `js/shared/farmingData.js` | farming data |
| `js/shared/armorVisuals.js` | armor cosmetic mappings |
| `js/shared/dungeonRegistry.js` | dungeon type registry |
| `js/shared/gunData.js` | gun stat tables |
| `js/shared/progressionData.js` | `PROG_ITEMS` |
| `js/shared/skillRegistry.js` | skill XP categories |
| `js/shared/hideSeekData.js` | Hide & Seek mode constants |
| `js/shared/mafiaGameData.js` | `MAFIA_GAME` |
| `js/shared/mafiaRoleData.js` | Mafia role definitions |
| `js/shared/casinoData.js` | casino game configs, payouts |
| `js/shared/partyData.js` | party/bot constants |
| `js/shared/sparData.js` | spar system constants |
| `js/shared/craftingData.js` | crafting recipes, materials, drop tables |

### Phase B: Authority Systems (Part 1)

Server-authoritative logic. Runs the simulation that would live on a server in multiplayer.

| File | Key Export |
|------|-----------|
| `js/authority/eventBus.js` | `Events` |
| `js/authority/gameState.js` | `GameState`, global aliases |
| `js/authority/combatSystem.js` | `StatusFX`, `MOB_AI`, `MOB_SPECIALS` |
| `js/authority/vortalisSpecials.js` | Vortalis dungeon MOB_SPECIALS (106) |
| `js/authority/attackShapes.js` | attack geometry |
| `js/authority/telegraphSystem.js` | telegraph rendering |
| `js/authority/hazardSystem.js` | hazard logic |

### Phase C: Client Rendering (Part 1)

Hit effects and entity renderers load here because dungeon specials files (Phase B Part 2) need `ENTITY_RENDERERS` and `HIT_EFFECT_RENDERERS` to exist.

| File | Key Export |
|------|-----------|
| `js/client/rendering/hitEffects.js` | `HIT_EFFECT_RENDERERS` (73 types) |
| `js/client/rendering/entityRenderers.js` | `ENTITY_RENDERERS` (148 types) |

### Phase A.5: Core Scene Management

Depends on Phase A data + eventBus. Inserted between Phase B halves.

| File | Key Export |
|------|-----------|
| `js/core/sceneManager.js` | `Scene` (18 scene types) |
| `js/core/tileRenderer.js` | tile drawing |

### Phase B (continued): Authority Systems (Part 2)

Dungeon-specific specials, wave spawning, damage, inventory, mob movement, and game mode systems.

| File | Key Export |
|------|-----------|
| `js/authority/earth205Specials.js` | Earth-205 MOB_SPECIALS (98) |
| `js/authority/wagashiSpecials.js` | Wagashi MOB_SPECIALS part 1 (28) |
| `js/authority/wagashiSpecials2.js` | Wagashi MOB_SPECIALS part 2 (28) |
| `js/authority/wagashiSpecials3.js` | Wagashi MOB_SPECIALS part 3 (14) |
| `js/authority/earth216Specials.js` | Earth-216 MOB_SPECIALS part 1 (28) |
| `js/authority/earth216Specials2.js` | Earth-216 MOB_SPECIALS part 2 (28) |
| `js/authority/earth216Specials3.js` | Earth-216 MOB_SPECIALS part 3 (14) |
| `js/authority/waveSystem.js` | `createMob()`, wave spawning |
| `js/authority/damageSystem.js` | damage calculation, mob death |
| `js/authority/inventorySystem.js` | inventory management |
| `js/authority/mobSystem.js` | `positionClear()`, mob movement |
| `js/authority/stateReset.js` | state cleanup |
| `js/authority/miningSystem.js` | mining logic |
| `js/authority/fishingSystem.js` | fishing logic |
| `js/authority/farmingSystem.js` | farming logic |
| `js/authority/partySystem.js` | `PartySystem` (always-on party management) |
| `js/authority/botAI.js` | `BotAI` (bot combat/movement AI) |
| `js/authority/snapshots.js` | `serializeGameState()` |
| `js/authority/commands.js` | debug commands |
| `js/authority/authorityTick.js` | `authorityTick()` |
| `js/authority/hideSeekSystem.js` | `HideSeekSystem` |
| `js/authority/mafiaSystem.js` | `MafiaSystem` |
| `js/authority/casinoSystem.js` | `CasinoSystem` (10 games, 5% house edge) |

### Phase C (continued): Client Rendering (Part 2)

| File | Key Export |
|------|-----------|
| `js/client/rendering/characterSprite.js` | character sprite drawing |
| `js/client/rendering/hideSeekFOV.js` | Hide & Seek FOV |
| `js/client/rendering/mafiaFOV.js` | Mafia FOV + HUD |

### Phase D: Client UI

Panel system and input handling.

| File | Key Export |
|------|-----------|
| `js/client/input/inputIntent.js` | `InputIntent` |
| `js/client/ui/panelManager.js` | panel state machine |
| `js/client/ui/chatProfile.js` | chat/profile UI |
| `js/client/ui/toolbox.js` | toolbox icons |
| `js/client/ui/settings.js` | settings panel |
| `js/client/ui/shopFramework.js` | shop UI |
| `js/client/ui/panels.js` | gunsmith, armor panels |
| `js/client/ui/customize.js` | character customization |
| `js/client/ui/inventory.js` | inventory panel |
| `js/client/ui/testMobPanel.js` | debug mob panel |
| `js/client/ui/casinoUI.js` | casino game UI |
| `js/client/ui/forgeUI.js` | forge/crafting UI |

### Phase E: Input + Core Loop

Final phase. Wires input, weapon systems, persistence, and the main draw loop.

| File | Key Export |
|------|-----------|
| `js/client/input/input.js` | keyboard/mouse listeners |
| `js/core/gunSystem.js` | gun firing logic |
| `js/core/meleeSystem.js` | melee combat logic |
| `js/core/saveLoad.js` | localStorage save/load |
| `js/core/skeldTasks.js` | Skeld task minigames |
| `js/core/cameraSystem.js` | camera follow, shake, zoom |
| `js/core/interactable.js` | entity interactions |
| `js/authority/cookingSystem.js` | cooking logic |
| `js/authority/cookingNPCBase.js` | shared NPC base for all restaurants |
| `js/authority/deliNPCSystem.js` | deli NPC |
| `js/authority/dinerNPCSystem.js` | diner NPC |
| `js/authority/fineDiningNPCSystem.js` | fine dining NPC |
| `js/authority/fineDiningGrill.js` | teppanyaki grill minigame |
| `js/core/draw.js` | `gameLoop()`, `draw()` |
| `js/testing/testHarness.js` | test utilities |

## Authority/Client Split

The codebase is organized for future multiplayer. All game logic runs through an authority layer; the client only renders and captures input.

**Authority** (`js/authority/`): Owns all mutable game state. Computes mob movement, damage, wave spawning, inventory changes, collision, party management, bot AI, and casino game logic. In singleplayer this runs locally in the browser. In multiplayer, this code would run on the server.

**Client** (`js/client/`): Captures keyboard/mouse input and translates it into `InputIntent` flags. The rendering layer reads `GameState` and draws everything to the canvas. The client never mutates game state directly.

**Core** (`js/core/`): Bridge layer that connects authority and client. Manages scene transitions, weapon firing, save/load, camera, and the main draw loop.

**Data flow per frame:**

```
Keyboard/Mouse
    |
    v
InputIntent flags  (client/input/)
    |
    v
translateIntentsToCommands()  (client/input/input.js)
    |
    v
CommandQueue  (array of {t: 'move'|'shoot'|'melee'|..., data: {...}})
    |
    v
authorityTick()  (authority/authorityTick.js)
    |-- copies & clears CommandQueue
    |-- applies commands -> sets InputIntent flags
    |-- calls update() (the simulation)
    |-- returns serializeGameState() snapshot
    v
draw()  (core/draw.js)
    |-- reads GameState
    |-- draws tiles, entities, mobs, bullets, effects, player, HUD, panels
```

## Game Loop

The game loop lives in `js/core/draw.js` (line 2223). It uses a fixed-timestep model at 60 ticks/second to ensure consistent physics regardless of display refresh rate.

```
requestAnimationFrame(gameLoop)
  |
  |-- Calculate elapsed time, cap at 100ms
  |-- Apply _gameSpeed multiplier (for /speed debug command)
  |-- Accumulate time
  |
  |-- while (accumulator >= FIXED_DT && updates < 4):
  |     |-- translateIntentsToCommands()    // client: input -> commands
  |     |-- authorityTick()                 // authority: commands -> simulation
  |     |-- accumulator -= FIXED_DT
  |
  |-- if (updates > 0): draw()              // only draw when physics updated
  |
  |-- requestAnimationFrame(gameLoop)       // schedule next frame
```

Key constants:
- `FIXED_DT` = 1000/60 = ~16.67ms (60 FPS physics)
- Max 4 physics steps per frame (prevents spiral of death on slow machines)
- `_gameSpeed` multiplier: supports 0.25x slow-mo to 2x fast-forward

## Key Globals

| Global | Type | Defined In | Description |
|--------|------|-----------|-------------|
| `ctx` | `CanvasRenderingContext2D` | `index.html` (inline) | Canvas 2D rendering context; used by all draw code |
| `TILE` | `number` (48) | `js/shared/levelData.js` | Tile size in pixels; fundamental unit for all grid operations |
| `GameState` | `object` | `js/authority/gameState.js` | Single source of truth for all mutable runtime state |
| `player` | `object` | alias for `GameState.player` | Player position, velocity, HP, cosmetics, name |
| `mobs` | `array` | alias for `GameState.mobs` | Active mob instances |
| `bullets` | `array` | alias for `GameState.bullets` | Active bullet projectiles |
| `gold` | `number` | alias for `GameState.gold` | Current gold currency |
| `wave` | `number` | alias for `GameState.wave` | Current wave number |
| `gun` | `object` | alias for `GameState.gun` | Gun state: ammo, cooldown, damage |
| `melee` | `object` | alias for `GameState.melee` | Melee state: cooldown, swing, dash |
| `inventory` | `array` | alias for `GameState.inventory` | Player inventory items |
| `Scene` | `object` | `js/core/sceneManager.js` | Scene state machine with 18 scene types |
| `GAME_CONFIG` | `object` | `js/shared/gameConfig.js` | Physics and collision constants |
| `MOB_TYPES` | `object` | `js/shared/mobTypes.js` | Mob type definitions (255 entries: hp, speed, damage, AI pattern) |
| `MOB_AI` | `object` | `js/authority/combatSystem.js` | 13 mob AI movement patterns |
| `MOB_SPECIALS` | `object` | `combatSystem.js` + 8 specials files | 435 mob special ability definitions |
| `Events` | `object` | `js/authority/eventBus.js` | Pub/sub event bus |
| `levelEntities` | `array` | `js/core/sceneManager.js` | Current level's interactive entity array |
| `InputIntent` | `object` | `js/client/input/inputIntent.js` | Per-frame input flags (moveX, moveY, shootHeld, etc.) |
| `CommandQueue` | `array` | `js/client/input/input.js` | Queued commands for authorityTick to consume |
| `LEVELS` | `object` | `js/shared/levelData.js` | Level/map definitions (tile grids, entity spawn points) |
| `PROG_ITEMS` | `object` | `js/shared/progressionData.js` | Unified 5-tier x 25-level weapon progression data |
| `PartySystem` | `object` | `js/authority/partySystem.js` | Always-on party management (player + bots) |
| `BotAI` | `object` | `js/authority/botAI.js` | Bot combat/movement AI |
| `CasinoSystem` | `object` | `js/authority/casinoSystem.js` | Casino game logic (10 games) |

Global aliases are created in `gameState.js` using `Object.defineProperty` on `window`. Every key of `GameState` (player, mobs, gold, bullets, etc.) gets a getter/setter so that `player.x = 5` transparently reads/writes `GameState.player.x`.

## Event Bus

The event bus (`js/authority/eventBus.js`) provides lightweight pub/sub for decoupling game systems. Any system can subscribe to events without the emitter knowing about it.

### API

| Method | Signature | Description |
|--------|-----------|-------------|
| `Events.on()` | `on(event, callback)` | Subscribe to an event |
| `Events.off()` | `off(event, callback)` | Unsubscribe a specific callback |
| `Events.emit()` | `emit(event, data)` | Fire an event with data payload |
| `Events.clear()` | `clear()` | Remove all listeners (used during reset/cleanup) |

Error handling: each handler is wrapped in try/catch so one failing listener does not break others.

### Known Events

| Event | Emitted By | Payload | Subscribers |
|-------|-----------|---------|-------------|
| `mob_killed` | `damageSystem.js` | `{ mob, source, goldEarned, heal, qkb }` | Kill streak tracking, skill XP, wave completion checks |
| `wave_cleared` | `mobSystem.js` | `{ wave, floor, stairsOpen, dungeonComplete }` | Floor transition, UI updates |
| `wave_started` | `waveSystem.js` | `{ wave, floor, isBoss, mobCount }` | HUD wave counter, music triggers |
| `player_damaged` | `damageSystem.js` | `{ amount, raw, source, attacker }` | Screen shake, damage flash, HP bar update |
| `player_died` | `interactable.js` | `{ lives, gameOver, x, y }` | Death screen, respawn logic |
| `floor_changed` | `sceneManager.js` | `{ floor }` | Floor indicator update, mob scaling |

## GAME_CONFIG Constants

All physics and collision tuning lives in `js/shared/gameConfig.js`. Every system reads from this object rather than using magic numbers.

| Constant | Value | Description |
|----------|-------|-------------|
| `PLAYER_BASE_SPEED` | 7.5 | Base movement speed (no boots); 450 px/sec at 60 FPS |
| `PLAYER_WALL_HW` | 14 | Player wall collision half-width (AABB) |
| `PLAYER_RADIUS` | 23 | Player body-blocking circle radius |
| `MOB_WALL_HW` | 11 | Mob wall collision half-width (AABB) |
| `MOB_RADIUS` | 23 | Mob body-blocking circle radius |
| `POS_HW` | 10 | Spawn/position clearance half-width (default for `positionClear`) |
| `MOB_CROWD_RADIUS` | 46 | Crowding detection radius |
| `BULLET_SPEED` | 9 | Default bullet speed in px/frame |
| `BULLET_HALF_LONG` | 15 | Bullet collision half-length along travel direction |
| `BULLET_HALF_SHORT` | 4 | Bullet collision half-width perpendicular to travel |
| `ENTITY_R` | 29 | Entity hitbox circle radius (bullet vs entity) |
| `PLAYER_HITBOX_Y` | -25 | Player/spar hitbox Y offset from feet (torso center) |
| `ORE_COLLISION_RADIUS` | 17 | Ore node collision circle radius |
| `MINING_PLAYER_R` | 10 | Player half-width for ore push-out |
| `KNOCKBACK_DECAY` | 0.8 | Knockback velocity multiplier per frame |
| `KNOCKBACK_THRESHOLD` | 0.6 | Minimum knockback velocity before clearing |
| `DEFAULT_HITBOX_R` | 33 | Hitbox visual radius (BULLET_HALF_SHORT + ENTITY_R) |

## Connections to Other Systems

- **Save/Load** (`docs/conventions.md`): `saveLoad.js` serializes `GameState` to localStorage with schema versioning
- **Progression**: `PROG_ITEMS` feeds into gunsmith panels and `getProgressedStats()` for weapon scaling
- **Sprite Pipeline**: `AssetLoader` loads sprites from `assets/manifest.json`; renderers check `AssetLoader.get(key)` first, fall back to procedural drawing
- **Mafia/Hide & Seek**: `authorityTick()` checks for mode-specific freezes (meetings, voting, ejection) and weapon restrictions before running `update()`
- **Party System**: `PartySystem` manages player + bot party members; `BotAI` provides combat/movement intelligence for bots
- **Casino**: `CasinoSystem` runs 10 gambling games with 5% house edge; separate scene with dedicated UI

## Gotchas & Rules

- **Script order is load-bearing.** Moving a `<script>` tag to a different position will cause undefined reference errors. Always respect the phase order (A -> B1 -> C1 -> A.5 -> B2 -> C2 -> D -> E).
- **GameState aliases use `defineProperty`.** Writing `player = {...}` replaces the `GameState.player` reference. Writing `player.x = 5` modifies the existing object. Both work, but understand the difference.
- **Fixed timestep matters.** The game runs exactly 60 physics ticks/sec. On 120Hz+ displays, the fixed timestep prevents double-speed physics. Max 4 steps per frame prevents spiral of death.
- **`DEBUG_pauseAuthority`** freezes the entire simulation. Commands are discarded while paused. Set via debug tools.
- **`_gameSpeed`** multiplier affects elapsed time before accumulation. Values: 0.25, 0.5, 1, 2.
- **MOB_SPECIALS span 9 files.** The base 91 abilities live in `combatSystem.js` (435 total). Dungeon-specific abilities are in separate files (`vortalisSpecials.js`, `earth205Specials.js`, `wagashiSpecials1-3.js`, `earth216Specials1-3.js`) that append to the same `MOB_SPECIALS` object.
- **Party system is always-on.** Every player is a party member. Bots are future multiplayer users -- never special-case bot vs player in system design.
