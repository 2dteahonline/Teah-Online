# Teah Online — Comprehensive Game Analysis

> **Generated**: March 2026
> **Codebase**: ~48,800 lines of vanilla JavaScript + HTML5 Canvas 2D
> **Files**: 57 active script files across 4 directories + 1 HTML entry point
> **Inspiration**: GraalOnline Era (Steam)

---

## Table of Contents

1. [Project Overview & Stats](#1-project-overview--stats)
2. [Architecture](#2-architecture)
3. [Directory Structure & File Descriptions](#3-directory-structure--file-descriptions)
4. [Key Globals & Patterns](#4-key-globals--patterns)
5. [Game Loop Flow](#5-game-loop-flow)
6. [Combat System](#6-combat-system)
7. [Wave System](#7-wave-system)
8. [Mob System](#8-mob-system)
9. [Progression System](#9-progression-system)
10. [Inventory & Equipment](#10-inventory--equipment)
11. [Save/Load System](#11-saveload-system)
12. [Rendering Systems](#12-rendering-systems)
13. [Input System](#13-input-system)
14. [UI Panels](#14-ui-panels)
15. [Game Modes & Scenes](#15-game-modes--scenes)
16. [Debug Tools & Commands](#16-debug-tools--commands)
17. [Key Conventions & Rules](#17-key-conventions--rules)

---

## 1. Project Overview & Stats

Teah Online is a top-down dungeon crawler built entirely with vanilla JavaScript and HTML5 Canvas 2D. No frameworks, no build tools, no npm dependencies — just `<script>` tags loaded in order.

### Codebase Statistics

| Metric | Value |
|--------|-------|
| Total JavaScript lines | ~48,800 |
| Active script files | 57 |
| Backup files | 9 (not loaded) |
| Entry point | `index.html` (124 lines) |
| Design resolution | 1920×1080 (scaled by WORLD_ZOOM 0.85) |
| Tile size | 48px constant |
| Target framerate | 60 FPS (requestAnimationFrame) |
| Dev server | `python -m http.server 8080` |
| Cache bust version | `?v=70` (most files), up to `?v=133` (levelData) |

### Top 10 Largest Files

| Rank | File | Lines | Purpose |
|------|------|------:|---------|
| 1 | `js/authority/combatSystem.js` | 5,898 | MOB_AI, MOB_SPECIALS, StatusFX, helpers |
| 2 | `js/client/rendering/characterSprite.js` | 3,942 | 3-layer sprite system, color utilities |
| 3 | `js/client/rendering/entityRenderers.js` | 2,975 | ENTITY_RENDERERS (54 types) |
| 4 | `js/client/ui/inventory.js` | 2,707 | Inventory panel + game loop entry point |
| 5 | `js/core/skeldTasks.js` | 2,631 | The Skeld map tasks & sabotage |
| 6 | `js/core/draw.js` | 2,204 | Main draw loop, camera, HUD, minimap |
| 7 | `js/client/ui/panels.js` | 2,024 | Identity panel, stats panel, faction/country pickers |
| 8 | `js/shared/levelData.js` | 1,580 | Tile maps, level definitions, portals |
| 9 | `js/client/ui/toolbox.js` | 1,472 | Level editor (tile/entity placement) |
| 10 | `js/core/meleeSystem.js` | 1,310 | Melee combat, specials, ultimates |

---

## 2. Architecture

### Authority/Client Split

The codebase is organized for future multiplayer. All game logic runs through an authority layer; the client only renders and captures input.

```
js/
├── shared/        # Pure data registries (loaded first) — no logic
├── authority/     # Server-authoritative: combat, damage, waves, mobs, inventory
├── client/        # Presentation only: rendering, input, UI panels
│   ├── rendering/ # Canvas drawing (sprites, entities, effects)
│   ├── input/     # Mouse/keyboard → InputIntent flags
│   └── ui/        # Panel system (inventory, gunsmith, settings)
└── core/          # Bridge layer: save/load, scene management, weapons, interactables
```

### 5-Phase Script Loading Order

Script loading order matters — each phase depends on the previous. Defined in `index.html`:

| Phase | Name | Files | Lines | What Loads |
|-------|------|------:|------:|------------|
| A | Shared Data | 15 | ~4,156 | gameConfig, levelData, mobTypes, floorConfig, itemData, oreData, cookingData, fishingData, farmingData, armorVisuals, dungeonRegistry, gunData, progressionData, skillRegistry, hideSeekData |
| B (initial) | Authority Core | 6 | ~7,411 | eventBus, gameState, combatSystem, attackShapes, telegraphSystem, hazardSystem |
| C (initial) | Rendering Core | 2 | ~3,887 | hitEffects, entityRenderers |
| A.5 | Core Scene | 2 | ~850 | sceneManager, tileRenderer |
| B (continued) | Authority Extended | 12 | ~8,716 | waveSystem, damageSystem, inventorySystem, mobSystem, stateReset, miningSystem, fishingSystem, farmingSystem, snapshots, commands, authorityTick, hideSeekSystem |
| C (continued) | Rendering Extended | 2 | ~4,659 | characterSprite, hideSeekFOV |
| D | Client UI & Input | 10 | ~9,417 | inputIntent, panelManager, chatProfile, toolbox, settings, shopFramework, panels, customize, inventory, testMobPanel |
| E | Core Loop | 10 | ~11,247 | input, gunSystem, meleeSystem, saveLoad, skeldTasks, interactable, cookingSystem, deliNPCSystem, draw, testHarness |

**Critical invariant**: Phase A must complete before Phase B (combatSystem reads MOB_TYPES, GAME_CONFIG). combatSystem (file #18) must load before mobSystem (file #29) since mobSystem dispatches to `MOB_AI[mob.ai]`.

---

## 3. Directory Structure & File Descriptions

### `js/shared/` — Pure Data Registries (15 files, ~4,156 lines)

| File | Lines | Description |
|------|------:|-------------|
| `gameConfig.js` | 33 | Physics/collision constants: PLAYER_BASE_SPEED=6.25, MOB_WALL_HW=14, MOB_RADIUS=27, BULLET_SPEED=9, KNOCKBACK_DECAY=0.8 |
| `levelData.js` | 1,580 | All level definitions (lobby, cave, dungeon, mine, skeld, hideseek). Collision grids (ASCII), entity spawns, portal data. Skeld uses XO=4 offset |
| `mobTypes.js` | 412 | MOB_TYPES registry: 62 mob types + 8 base archetypes. Defines hp, speed, damage, goldReward, AI pattern, specials, visuals |
| `floorConfig.js` | 500 | WAVE_TEMPLATES (grunt_rush, archer_ambush, etc.), SUBFLOOR_BLUEPRINTS, wave composition builder functions |
| `itemData.js` | 78 | ITEM_CATEGORIES, PALETTE (accent/gold/tier colors), ITEM_STAT_RENDERERS (gun, melee, boots, pants, chest, helmet) |
| `oreData.js` | 65 | Ore type definitions and tier progression |
| `cookingData.js` | 116 | Cooking recipes and ingredient definitions |
| `fishingData.js` | 105 | Fish types, bait definitions, rod tier stats |
| `farmingData.js` | 83 | Crop types, growth times, harvest yields |
| `armorVisuals.js` | 80 | Armor sprite color overrides per equipment piece |
| `dungeonRegistry.js` | 79 | Dungeon type definitions (cave, azurine), floor counts, mob pools |
| `gunData.js` | 223 | MAIN_GUNS registry: 5 guns with base/max stat interpolation. `getGunStatsAtLevel(gunId, level)` |
| `progressionData.js` | 671 | PROG_ITEMS (5 tiers × 25 levels), EVOLUTION_COSTS, tier helpers. Covers guns, rods, hoes, pickaxes |
| `skillRegistry.js` | 114 | SKILL_REGISTRY: 6 categories (Killing, Sparring, Basing, Dungeons, Events, Jobs), ~40 total skills |
| `hideSeekData.js` | 17 | Hide & Seek game mode configuration data |

### `js/authority/` — Server-Authoritative Logic (20 files, ~18,500 lines)

| File | Lines | Description |
|------|------:|-------------|
| `eventBus.js` | 32 | Events pub/sub: `Events.on(type, cb)`, `Events.emit(type, data)`, `Events.off(type, cb)` |
| `gameState.js` | 139 | Central state container. Globals aliased to window: player, mobs, bullets, gold, kills, lives, playerLevel, skillData |
| `combatSystem.js` | 5,898 | **Largest file.** StatusFX system, MOB_AI (11 patterns), MOB_SPECIALS (60+ abilities), movement helpers (clampDashTarget, findClearPosition, sanitizeAITarget) |
| `attackShapes.js` | 135 | Geometry helpers: playerInLine(), circleCircleCollide(), lineIntersect() |
| `telegraphSystem.js` | 257 | Ground warning markers before mob special attacks |
| `hazardSystem.js` | 950 | Environmental hazards (10 types): spikes, lava, pressure plates, damage tick systems |
| `waveSystem.js` | 674 | Wave spawning, phase system, createMob() factory, scaling formulas, medpack system |
| `damageSystem.js` | 371 | Damage pipeline: dealDamageToMob(), dealDamageToPlayer(), processKill(), armor/shield/thorns |
| `inventorySystem.js` | 267 | Item creation, equipment slots, applyGunStats(), addToInventory(), MAX_INVENTORY_SLOTS=100 |
| `mobSystem.js` | 1,103 | Mob movement, BFS pathfinding, collision, separation, contact damage, AI dispatch |
| `stateReset.js` | 997 | State reset between runs: clearDungeon(), resetDungeonState(), scene transition cleanup |
| `miningSystem.js` | 604 | Ore node spawning, hit detection, mining speed progression, ore rewards |
| `fishingSystem.js` | 839 | Fishing rod progression (5 tiers), catch mechanics, quality scaling |
| `farmingSystem.js` | 759 | Crop planting, growth stages, water system, harvest mechanics |
| `cookingSystem.js` | 790 | Recipe system, ingredient tracking, cooking level/XP progression |
| `deliNPCSystem.js` | 965 | Deli NPC dialogue, shop system, item vending |
| `hideSeekSystem.js` | 783 | Hide & Seek game mode: AI bot behavior, seeker/hider logic, match flow |
| `snapshots.js` | 485 | Game state serialization for debug/save purposes |
| `commands.js` | 125 | Debug chat commands: /gun, /tp, /heal, /mob, /freeze, /god, /op, etc. |
| `authorityTick.js` | 145 | Main authority update loop: CommandQueue → InputIntent → update() |

### `js/client/rendering/` — Canvas Drawing (4 files, ~8,546 lines)

| File | Lines | Description |
|------|------:|-------------|
| `characterSprite.js` | 3,942 | 3-layer sprite system (body 48×64, head 48×48, hat 48×48). 4 frames × 4 directions per layer. Color utilities (parseHex, darkenColor, skinShadow, hsvToHex). Template generation for player + 10 mob types |
| `entityRenderers.js` | 2,975 | ENTITY_RENDERERS registry: 54 types (spawnPad, barrierH/V, zone, path, fountain, portal, task, sabotage, vent, hazard, queue_zone, etc.) |
| `hitEffects.js` | 912 | HIT_EFFECT_RENDERERS registry: 38 types (kill, hit, crit, frost_hit, burn_hit, poison_hit, heal, shield, status_applied, etc.) |
| `hideSeekFOV.js` | 717 | Hide & Seek visuals: FOV cutout rendering, minimap overlay, role select buttons, post-match summary |

### `js/client/input/` — Input Capture (2 files, 1,019 lines)

| File | Lines | Description |
|------|------:|-------------|
| `inputIntent.js` | 86 | Per-frame input flags. **Held**: moveX/Y, shootHeld, reelHeld. **Pressed** (one-frame): shootPressed, meleePressed, dashPressed, interactPressed, ultimatePressed, slot1-5Pressed. Mouse world coordinates |
| `input.js` | 933 | Mouse/keyboard/drag event handlers. Click routing for hotbar, icons, panels. Scroll wheel handling. Key state tracking |

### `js/client/ui/` — Panel System (9 files, ~9,331 lines)

| File | Lines | Description |
|------|------:|-------------|
| `panelManager.js` | 943 | Panel state machine (one panel at a time). UI._panels registry. Icon button drawing. onOpen/onClose callbacks |
| `inventory.js` | 2,707 | Inventory panel (5 tabs: All, Guns, Melees, Armor, Consumables). Item cards (240×340). **Also contains game loop entry point** (requestAnimationFrame at ~line 2618) |
| `panels.js` | 2,024 | Identity panel (name, stats, faction/country/language pickers). Stats sub-panel (9 skill categories with XP bars) |
| `customize.js` | 888 | Character customization (18 categories: hair, skin, shirt, pants, hat, glasses, etc.). HSV color picker with hue bar + SV plane |
| `testMobPanel.js` | 809 | Mob testing GUI: dungeon/floor/mob selector, ability descriptions (100+ entries), spawn controls |
| `toolbox.js` | 1,472 | Level editor: 7 category tabs (Tilesets, Objects, Hazards, NPCs, Portals, Decorations, Lighting). Paint/erase modes. Ghost preview |
| `shopFramework.js` | 279 | Reusable shop helpers: shopDrawPanel(), shopDrawHeader(), shopDrawTabs(), shopDrawItemRow(), shopDrawItemGrid() |
| `chatProfile.js` | 108 | Chat and profile UI rendering |
| `settings.js` | 101 | Settings panel: 7 tabs (General, Keybinds, Sounds, Indicators, Profile, Message, Privacy). 19 rebindable actions |

### `js/core/` — Bridge Layer (7 files, ~8,909 lines)

| File | Lines | Description |
|------|------:|-------------|
| `draw.js` | 2,204 | Main draw pipeline: background → tiles → entities → mobs (Y-sorted) → bullets → effects → player → HUD → panels. Camera system. Minimap. Debug overlay |
| `skeldTasks.js` | 2,631 | The Skeld (Among Us) task system: 20+ task types, multi-step tasks, sabotage system |
| `meleeSystem.js` | 1,310 | Katana combat: swing arc (120°), dash system (3 charges), specials (cleave, ninja), ultimates (War Cleaver, Storm Blade). 15% lifesteal capped at 20 HP |
| `gunSystem.js` | 807 | Gun mechanics: 4 stat dimensions (Firerate, Freeze, Spread, Stack sum to 100). Bullet physics. Death effects per mob type |
| `interactable.js` | 598 | Interactable registry: shop_station, fish_vendor, farm_vendor, gunsmith_npc, mining_shop, cooking_npc. Equipment tier system |
| `saveLoad.js` | 509 | localStorage persistence (schema v7). Saves keybinds, settings, identity, cosmetics, progression, skill XP. Backward compatible with v1-v6 |
| `tileRenderer.js` | 494 | Scene-specific tile textures: lobby (dark steel/neon), farm (wood/grass), cave (brown stone), mine (rocky), azurine (sci-fi), skeld (clean white/gray) |
| `sceneManager.js` | 356 | Scene state machine, portal system, queue system (dungeon entry), floor progression, fade transitions |

### `js/testing/` — Test Framework (1 file, 500 lines)

| File | Lines | Description |
|------|------:|-------------|
| `testHarness.js` | 500 | Automated test framework for verifying game systems |

---

## 4. Key Globals & Patterns

### Critical Globals

| Global | Type | Defined In | Description |
|--------|------|------------|-------------|
| `ctx` | CanvasRenderingContext2D | index.html (inline) | All canvas drawing operations |
| `TILE` | number (48) | gameConfig.js | Tile size constant used everywhere |
| `player` | object | gameState.js (→ window) | Player state: x, y, hp, maxHp, vx, vy, equipment, cosmetics |
| `mobs` | array | gameState.js (→ window) | All active mob objects |
| `bullets` | array | gameState.js (→ window) | All active projectiles |
| `gold` | number | gameState.js (→ window) | Player's gold currency |
| `kills` | number | gameState.js (→ window) | Total kill count |
| `lives` | number | gameState.js (→ window) | Remaining lives (dungeon only) |
| `playerLevel` | number | gameState.js (→ window) | Character level (max 1000) |
| `playerXP` | number | gameState.js (→ window) | Current XP toward next level |
| `skillData` | object | gameState.js (→ window) | Per-skill XP: `{ skillName: { level, xp } }` |
| `levelEntities` | array | gameState.js | Current level's static entity array |
| `Scene` | object | gameState.js | Scene state machine (current, inDungeon, inLobby, etc.) |
| `GAME_CONFIG` | object | gameConfig.js | Physics constants (collision radii, speeds, knockback) |
| `Events` | object | eventBus.js | Pub/sub event bus: on(), emit(), off() |
| `mouse` | object | input.js | Mouse state: `{ x, y, down }` |
| `keysDown` | object | input.js | Map of key → boolean (currently held keys) |
| `InputIntent` | object | inputIntent.js | Per-frame input flags (held + pressed) |
| `camera` | object | draw.js | Camera offset: `{ x, y }` (world space) |
| `gameSettings` | object | settings.js | All toggle/select game settings |

### Data-Driven Registries

| Registry | Location | Count | Purpose |
|----------|----------|------:|---------|
| `MOB_TYPES` | mobTypes.js | 62 | Mob stat blocks (hp, speed, damage, AI, specials, visuals) |
| `MOB_AI` | combatSystem.js | 11 | Movement AI patterns |
| `MOB_SPECIALS` | combatSystem.js | 60+ | Special attack functions |
| `ENTITY_RENDERERS` | entityRenderers.js | 54 | Entity drawing functions |
| `HIT_EFFECT_RENDERERS` | hitEffects.js | 38 | Hit effect drawing functions |
| `PROG_ITEMS` | progressionData.js | 23 items | 5 tiers × 25 levels per item |
| `MAIN_GUNS` | gunData.js | 5 | Gun stat definitions with interpolation |
| `WAVE_TEMPLATES` | floorConfig.js | 8 | Reusable wave compositions |
| `ITEM_CATEGORIES` | itemData.js | 5+ | Item type groupings |
| `ITEM_STAT_RENDERERS` | itemData.js | 6 | Per-type stat display formatters |
| `PALETTE` | itemData.js | 49+ | UI color theme constants |
| `SKILL_REGISTRY` | skillRegistry.js | ~40 | Skill definitions across 6 categories |
| `DUNGEON_REGISTRY` | dungeonRegistry.js | 2+ | Dungeon metadata (floors, mob pools) |
| `MOB_CAPS` | mobTypes.js | 10+ | Per-type spawn limits per wave |

### Design Patterns

- **`let` in `<script>` tags** are in global lexical scope — accessible from other scripts and `eval()`, but NOT on `window`
- **GameState properties** are aliased to `window` via `Object.defineProperty` for cross-script access
- **Registry pattern** replaces large if/else chains — new entries are added to objects, dispatched by key
- **Command queue** decouples input from authority processing
- **Intent decoupling** separates "player wants to do X" from "what actually happens"
- **Event bus** provides pub/sub for loose coupling between systems

---

## 5. Game Loop Flow

### Entry Point

The game loop lives in `js/client/ui/inventory.js` (~line 2618):

```
requestAnimationFrame(gameLoop)
```

### Per-Frame Flow

```
gameLoop(timestamp)
│
├─ Fixed timestep accumulator (1000/60 ms per physics step)
│  May run 0-2+ update steps per frame
│
├─ Per update step:
│  │
│  ├─ translateIntentsToCommands()        [commands.js]
│  │   └─ Reads InputIntent → enqueues Command objects
│  │
│  ├─ authorityTick()                     [authorityTick.js]
│  │   ├─ Process CommandQueue → set InputIntent flags
│  │   ├─ update()                        [gameState.js / various]
│  │   │   ├─ Player movement (from InputIntent.moveX/Y)
│  │   │   ├─ Gun firing / reloading      [gunSystem.js]
│  │   │   ├─ Melee swings / dashes       [meleeSystem.js]
│  │   │   ├─ Bullet updates              [gunSystem.js]
│  │   │   ├─ Mob updates                 [mobSystem.js]
│  │   │   │   ├─ AI dispatch: MOB_AI[mob.ai](mob, ctx)
│  │   │   │   ├─ Special dispatch: MOB_SPECIALS[key](mob)
│  │   │   │   ├─ Contact damage
│  │   │   │   └─ Knockback decay
│  │   │   ├─ Wave system                 [waveSystem.js]
│  │   │   ├─ Hazard ticks                [hazardSystem.js]
│  │   │   ├─ StatusFX ticks              [combatSystem.js]
│  │   │   └─ Portal/zone checks          [sceneManager.js]
│  │   │
│  │   └─ clearOneFrameIntents()          [inputIntent.js]
│  │
│  └─ Scene-specific updates (fishing, farming, mining, cooking, H&S)
│
├─ draw()                                 [draw.js]
│  ├─ 1. Background (scene-specific color)
│  ├─ 2. Tilemap (visible tiles only — viewport culling)
│  ├─ 3. Level entities (ENTITY_RENDERERS dispatch)
│  ├─ 4. Mobs (Y-sorted for depth, back-to-front)
│  ├─ 5. Bullets (all active projectiles)
│  ├─ 6. Hit effects (HIT_EFFECT_RENDERERS dispatch)
│  ├─ 7. Death particles (mob death bursts)
│  ├─ 8. Player (always on top in world space)
│  ├─ 9. HUD (screen space):
│  │   ├─ Health bar + status effect icons
│  │   ├─ Wave counter + phase timer
│  │   ├─ Gold display (dungeon only)
│  │   ├─ Speed indicator + gun stats
│  │   ├─ Debug flags (GOD, FROZEN, NOFIRE, OP, Nx)
│  │   ├─ Hotbar (5 slots)
│  │   └─ Minimap (if open)
│  ├─ 10. Panels (if any open)
│  ├─ 11. Death/respawn screen (if dead)
│  ├─ 12. Chat messages
│  └─ 13. Fade transitions
│
└─ requestAnimationFrame(gameLoop)
```

### Camera System

- Follows player with smoothing
- Clamps to map bounds
- `camera = { x, y }` (world-space offset)
- Screen-to-world: `worldX = screenX / WORLD_ZOOM + camera.x`
- Minimap cached background regenerated only on level change

---

## 6. Combat System

### Damage Pipeline

```
Player Action (gun/melee/ability)
  → Create bullet or swing arc
    → Collision check (circle/AABB/arc)
      → dealDamageToMob(mob, amount, source)
        ├─ Shield absorb (if mob._shieldHp > 0)
        ├─ Apply damage to mob.hp
        ├─ Split mechanic (Core Guardian at 50% HP → 2 smaller blobs)
        ├─ Emit hit effect
        └─ If hp ≤ 0 → processKill(mob, source)
            ├─ Gold reward: base × waveScalar × floorBonus (+ 20% quick-kill if < 5s alive)
            ├─ Health restore: 2x for gun/melee kills, 1x for DoT
            ├─ Ammo refill (gun kills)
            ├─ XP award (player level + skill-specific)
            └─ Medpack spawn chance

Mob Attack (contact/special/projectile)
  → dealDamageToPlayer(rawDamage, source, attacker)
    ├─ Armor reduction (if source ≠ "dot")
    ├─ Projectile/AOE reduction (if source = "projectile"/"aoe")
    ├─ Thorns reflection → attacker takes damage
    ├─ Stagger application
    └─ Return final damage
```

### StatusFX — Status Effect System

**Mob Effects** (applied via `StatusFX.applyToMob`):

| Effect | Duration | Behavior |
|--------|----------|----------|
| frost | 90 frames | Speed × 0.75 |
| burn | 180 frames | 11 damage per tick (every 60 frames) |
| stagger | 30 frames | Blocks movement |
| stun | 60 frames | Blocks movement |
| root | 42 frames | Blocks movement |
| mark | 240 frames | +15% damage taken |
| silence | 90 frames | Blocks special attacks |

**Player Effects** (applied via `StatusFX.applyToPlayer`):

| Effect | Duration | Behavior |
|--------|----------|----------|
| slow | 240 frames | Speed reduction (default 35%) |
| root | 42 frames | Blocks movement |
| mark | 240 frames | +15% damage taken |
| silence | 90 frames | Blocks abilities |
| stun | 36 frames | Root + blocked actions |
| bleed | 240 frames | 3 damage per tick (every 60 frames) |
| confuse | 72 frames | Reversed controls |
| disorient | 60 frames | Random drift |
| poison | configurable | 1 damage per tick (has absorption immunity tech) |

**Poison Immunity Tech**: If `poisonReduce ≥ 1.0`, poison heals instead: `heal = 2 × (1 + absorbRate × 10)`.

### MOB_AI — 11 Movement Patterns

| Pattern | Behavior |
|---------|----------|
| `crowded` | Mid-screen interception for spawn-clustered mobs |
| `runner` | Evasive, stays outside 150px, circle strafing |
| `grunt` | Direct pursuit with minor evasion |
| `tank` | Slow persistent pursuit, predictive leading |
| `witch` | Maintains ideal kite range (~160px), circles when too close |
| `mummy` | Similar to grunt with slight randomization |
| `skeleton` | Swarm formation around player (8-angle burst) |
| `golem` | Relentless pursuit with far look-ahead prediction |
| `mini_golem` | Same as golem, 30% less predictive |
| `healer` | Positions near injured allies, stays 300px from player |
| `archer` | Maintains 350px distance, circles for optimal shot angle |

**Movement Validation Helpers**:
- `clampDashTarget()` — Binary search dash endpoint against walls (8 iterations)
- `findClearPosition()` — Tries target + 8 compass offsets for pathfinding
- `sanitizeAITarget()` — 1-tile wall check with perpendicular slide fallback

### MOB_SPECIALS — 60+ Special Abilities

**Base Mob Specials**:
- **witch**: Summon skeletons (up to 4, 40-80px away)
- **golem**: Boulder throw + stomp attack (scaled by `getMobDamageMultiplier()`)
- **mini_golem**: Smaller boulder + weaker stomp
- **archer**: Arrow fire (configurable bounces/range)
- **healer**: AOE heal (picks cluster of injured allies)
- **mummy**: Self-destruct explosion (armed on proximity, fuse 32-96 frames)

**Floor 1 Specials** (16): swipe_blink, stun_baton, spot_mark, gas_canister, ground_pound, cloak_backstab, sticky_bomb, ricochet_round, laser_snipe, tommy_burst, smart_mine, smoke_screen, phase_dash, bullet_time_field, afterimage_barrage, summon_renegades

**Floor 2 Specials** (16): overload_drain, weld_beam, charge_pop, tesla_trail, chain_lightning, emp_pulse, tesla_pillars, magnet_snap, briefcase_turret, red_tape_lines, penalty_mark, drone_swarm, dividend_barrage, hostile_takeover, nda_field, golden_parachute

**Floor 3 Specials** (16): scavenge_shield, mag_pull, saw_line, oil_spill_ignite, pile_driver, grab_toss, rebuild, scrap_minions, latch_drain, mud_dive, acid_spit_arc, siphon_beam, spore_cloud, burrow_surge, toxic_nursery, regrowth

**Floor 4 Specials** (16): tripwire, seek_mine, fake_wall, rewind_tag, trap_roulette, puzzle_lasers, loot_bait, remote_hack, suppress_cone, barrier_build, rocket_dash, emp_dome, pulse_override, repulsor_beam, nano_armor, drone_court

**Floor 5 Specials** (16+): bleed_maul, gore_spore_burst, pounce_pin, screech_ring, slime_wave_slash, sticky_field, split_response, glow_mark, symbiote_lash, toxic_spikes, adrenal_surge, absorb_barrier, static_orbs, overcharge_dump, ooze_blade_arc, slime_rampart, melt_floor, summon_elite, shadow_teleport, puppet_shot, abyss_grasp, regen_veil

### Gun System — 4 Stat Dimensions

Each gun allocates 100 total points across 4 stats (increments of 5):

| Stat | Effect at 0 | Effect at 100 |
|------|-------------|---------------|
| **Firerate** | Slow shots | Rapid fire |
| **Freeze** | No slow after firing | 25% movement slow |
| **Spread** | Perfectly straight bullets | Wide angle spread |
| **Stack** | 1 bullet per shot | 10 bullets per shot |

### Melee System

- **Swing arc**: 120° default, 360° for cleave
- **Lifesteal**: 15% of damage dealt, capped at 20 HP
- **Dash system** (Ninja special): 3 charges, ~45 frame duration each, 180 frame chain window
- **Specials**: Cleave (360° sweep + piercing DoT), Ninja (3-dash combo)
- **Ultimates**: War Cleaver (Malevolent Shrine — 180 frames, 45 slashes), Storm Blade (Godspeed — 300 frames, ground strikes + lightning)

---

## 7. Wave System

### Scaling Formulas

```
Mob Count = 5 + wave, +2 per floor, cap 22

HP Multiplier = 2.2^(floor-1) × (1 + (wave-1) × 0.12)

Speed Multiplier = (1 + (floor-1) × 0.15) × (1 + (wave-1) × 0.06)

Damage Multiplier = 1 + (floor-1) × 0.7 + floor^1.5 × 0.2

Gold Reward = base × (1 + (globalWave-1) × 0.07) × floorBonus × 0.5
```

### Floor Scaling Summary

| Floor | HP Mult (W1) | HP Mult (W10) | Speed Mult | Dmg Mult | Gold Bonus |
|------:|-------------:|--------------:|-----------:|---------:|-----------:|
| 1 | 1.0x | 1.12x | 1.0x | 1.0x | 1.8x |
| 2 | 2.2x | 2.47x | 1.15x | 1.5x | 1.3x |
| 3 | 4.84x | 5.6x | 1.30x | 2.2x | 1.1x |
| 4 | 10.6x | 12.3x | 1.45x | 3.2x | 1.0x |
| 5 | 23.4x | 25.5x | 1.60x | 4.5x | 1.0x |

### Phase System

Each wave has 3 phases:
- **Phase 1**: 40-50% of wave mobs spawn
- **Phase 2**: 30-35% spawn
- **Phase 3**: Remaining 15-30% spawn

Boss waves are single-phase. The system tracks `phaseMaxMobs`, `phaseMobsKilled`, and `phaseTriggered`.

### Medpack System

- 2 medpacks spawn per phase at random walkable tiles
- Each heals 30 HP (`MEDPACK_HEAL = 30`)
- Pickup range: 40px (`MEDPACK_PICKUP_RANGE = 40`)
- Visual: bob animation using `sin(frame × 0.06) × 3`

### Quick-Kill Bonus

+20% gold and HP reward if mob is killed within 5 seconds of spawning.

### XP Curves

- **Player level**: `xpForLevel(lvl) = 50 × 1.08^(lvl-1)`, max level 1000
- **Skill XP**: `skillXpForLevel(lvl) = 80 × 1.12^(lvl-1)`, no cap
- Example: Level 1→2 = 50 XP, Level 10→11 ≈ 108 XP

---

## 8. Mob System

### Base Mob Archetypes (10 types)

| Type | HP | Speed | Damage | Gold | AI Pattern | Special |
|------|---:|------:|-------:|-----:|------------|---------|
| Grunt | 106 | 3.4 | 18 | 2 | grunt | — |
| Runner | 50 | 4.1 | 10 | 3 | runner | — |
| Tank | 375 | 3.0 | 20 | 6 | tank | — |
| Witch | 188 | 1.6 | 6 | 7 | witch | Summon |
| Skeleton | 38 | 3.4 | 8 | 0 | skeleton | — |
| Golem | 1000 | 1.3 | 13 | 30 | golem | Boulder + Stomp |
| Mini Golem | 120 | 1.7 | 6 | 5 | mini_golem | Boulder |
| Mummy | 56 | 3.0 | 0 | 3 | mummy | Explode |
| Archer | 75 | 2.6 | 6 | 4 | archer | Arrow fire |
| Healer | 81 | 1.9 | 5 | 5 | healer | Heal allies |

### Floor-Specific Mobs (52 variants)

Each floor adds 4-5 unique mob types + 1-2 bosses:
- **Floor 1**: Neon Pickpocket, Cyber Mugger, Drone Lookout, Street Chemist → Bosses: The Don, Velocity
- **Floor 2**: Circuit Thief, Arc Welder, Battery Drone, Coil Runner → Bosses: Voltmaster, E-Mortis
- **Floor 3**: Scrap Rat, Magnet Scavenger, Rust Sawman, Junkyard Pyro → Bosses: Mourn, Centipede
- **Floor 4**: Tripwire Trickster, Mine Layer, Wall Faker, Tag Runner → Bosses: Game Master, J.U.N.Z
- **Floor 5**: Blood Mauler, Spore Beast, Pounce Cat, Screech Bat → Bosses: Lehvius/Jackman, Malric/Vale

**Total**: 62 mob types (10 base + 52 floor-specific).

### Boss Mechanics

- `isBoss: true` flag → 1.3-1.6x visual scale
- `specialCD`: Ability cooldown (360-900 frames ≈ 6-15 seconds)
- `_specials[]`: 3-4 special abilities per boss
- HP scaling: wave scaling + 50% golem bonus, 20% witch bonus

### Pathfinding

- **BFS pathfinding** (`bfsPath`): 8-directional (includes diagonals)
- Exploration cap: 400-600 tiles (prevents lag on large maps)
- Returns array of `{x, y}` tile coords, or null if unreachable

### Mob Collision & Separation

- **AABB collision** via `positionClear(px, py, hw)` — checks 4 corners against `isSolid()` grid
- **Mob separation**: Push apart to prevent stacking (0.45× force)
- **Crowd immunity**: `CROWD_EXEMPT_TYPES` bypass crowding penalties (runners, golems, archers, specific bosses)
- **Contact damage**: Cooldown-gated (8 frames), distance < contactRange → `dealDamageToPlayer()`
- **Knockback decay**: velocity × KNOCKBACK_DECAY (0.8) per frame, stops below THRESHOLD (0.5)

### Per-Type Spawn Caps (MOB_CAPS)

| Type | Cap |
|------|----:|
| Grunt | 12 |
| Runner | 8 |
| Tank | 3 |
| Witch | 2 |
| Skeleton | (summoned, no cap) |
| Golem | 1 |
| Archer | 4 |
| Healer | 2 |

### Speed Caps

- Runners: capped at 1.1× player speed
- All others: capped at 0.85× player speed

---

## 9. Progression System

### Overview

5 tiers × 25 levels = 125 power steps per item. Stats interpolate linearly from base (L1) to max (L25) within each tier.

### Tiers

| Tier | Name | Color | Cost Multiplier | Evolution Cost |
|-----:|------|-------|----------------:|----------------|
| 0 | Common | #888 | 1× | — (starting) |
| 1 | Uncommon | #5fca80 | 2.5× | 2,000g + materials |
| 2 | Rare | #4a9eff | 5× | 5,000g + rare materials |
| 3 | Epic | #ff9a40 | 10× | 12,000g + epic materials |
| 4 | Legendary | #ff4a8a | 20× | 30,000g + mythril/celestium |

### Evolution

At T(N) L25, the player can evolve to T(N+1) L1. This costs gold + materials defined in `EVOLUTION_COSTS`. There is no power loss on evolution — T(N+1) L1 starts where T(N) L25 left off.

### Progressed Item Categories

| Category | Items | Count |
|----------|-------|------:|
| Main Guns | Storm AR, Heavy AR, Boomstick, Ironwood Bow, Volt-9 | 5 |
| Fishing Rods | Bronze, Iron, Gold, Mythic, + unnamed T4 | 5 |
| Farming Hoes | Bronze, Iron, Gold, Mythic, + unnamed T4 | 5 |
| Pickaxes | Basic, Copper, Iron, Gold, Amethyst, Ruby, Diamond, Emerald | 8 |
| **Total** | | **23** |

### Key Helper Functions

```javascript
getProgressedStats(itemId, tier, level)    // Compute stats at tier+level
createProgressedItem(itemId, tier, level)  // Create inventory item with correct stats
canEvolve(tier, level)                     // true if tier < 4 && level === 25
getEvolutionCost(tier)                     // Gold + material cost for next tier
getProgUpgradeRecipe(itemId, tier, level)  // Recipe to upgrade from current level
getProgItemsByCategory(category)           // Query items by type
```

### Gun Level Format

- **Old format** (schema ≤ v6): Integer level 1-25
- **New format** (schema v7): `{ tier: 0-4, level: 1-25 }`
- Backward compatible: old format auto-converts to `{ tier: 0, level: n }` on load

---

## 10. Inventory & Equipment

### Inventory Structure

- **Max slots**: 100 (`MAX_INVENTORY_SLOTS`)
- **Slot-based**: Fixed slots, not grid
- **Stackable**: Materials and consumables use `count` field
- **Auto-stack**: `addToInventory()` stacks matching items automatically

### Equipment Slots

| Slot | Key | Effect Source |
|------|-----|---------------|
| Weapon (Gun) | `weapon` | damage, fireRate, magSize, reloadSpeed, pierce, spread, range |
| Melee | `melee` | damage, range, cooldown, special ability |
| Armor (Chest) | `armor` | hpBonus, dmgReduce, healBoost, regen, revive |
| Boots | `accessory` | speedBonus, dodgeChance, shadowstep, phase |

### Stat Application

- **`applyGunStats(data)`**: Centralized gun stat application → updates `gun.damage`, `gun.magSize`, `gun.ammo`, `gun.fireCooldownMax`
- **From armor**: hpBonus, dmgReduce, healBoost, regen, revive
- **From boots**: speedBonus, dodgeChance, shadowstep, phase
- **From pants**: dmgReduce, projReduce, thorns, stagger
- **From helmet**: poisonReduce, statusReduce, absorb

### Item Functions

```javascript
createItem(type, tierData)           // Create equipment item
createConsumable(id, name, count)    // Create stackable consumable
addToInventory(item)                 // Add (auto-stack or append), returns true/false
removeFromInventory(slot)            // Remove by slot index
findInventoryItemById(id)            // Find item in inventory
```

---

## 11. Save/Load System

**File**: `js/core/saveLoad.js` (509 lines)
**Storage**: `localStorage` (key: `dungeon_game_save`)
**Current Schema**: Version 7

### Persisted Data

| Category | Fields |
|----------|--------|
| **Keybinds** | All 19 rebindable actions |
| **Settings** | All `gameSettings` toggle/select values |
| **Identity** | Name, status, faction, country, gender |
| **Cosmetics** | 18 character color customizations |
| **Progression** | Level, XP, gun levels, pickaxe levels, discovered ores |
| **Skill XP** | Per-skill `{ level, xp }` objects |
| **Fishing** | Bait count, total caught, total coins |
| **Farming** | Land level, crops planted, crops harvested |

### Version Migrations

Supports backward-compatible migrations from v1 through v6:
- Each migration adds new fields with sensible defaults
- Gun levels: old integer format auto-converts to `{ tier, level }` on save
- No data loss on upgrade

### Auto-Save Triggers

Save is called automatically on:
- Settings change
- Cosmetic change
- Identity change
- Scene transition (entering/leaving dungeons)

---

## 12. Rendering Systems

### Character Sprite System (`characterSprite.js`, 3,942 lines)

**3-layer compositing**:
1. **Body canvas** (48×64px): Torso, arms, legs
2. **Head canvas** (48×48px): Face, hair
3. **Hat canvas** (48×48px): Headgear, accessories

Each layer has 4 columns (frames: idle, walk1, walk2, walk3) × 4 rows (directions: down, up, left, right).

**Color utilities**: `parseHex()`, `toHex()`, `darkenColor()`, `lightenColor()`, `skinShadow()`, `skinHighlight()`, `hsvToHex()`

**Template generation**: `generateLayerTemplate()` creates placeholder spritesheets. `initTemplatesheets()` generates templates for player + 10 mob types.

**Main draw function**: `drawChoso()` — applies cosmetics, layers, colors, animations.

### Entity Renderers (`entityRenderers.js`, 2,975 lines)

54 registered entity types in `ENTITY_RENDERERS`. Key types:

| Type | Visual |
|------|--------|
| `spawnPad` | Pulsing red circle with dark center |
| `barrierH` / `barrierV` | Magenta glowing bars |
| `path_v` / `path_h` | Dark metallic walkways with neon edges |
| `fountain` | Neon fountain with concentric rings, pillar, holographic beam |
| `portal` | Swirling vortex with gradient rings |
| `task` / `sabotage` | Cyan / red glowing markers (Skeld) |
| `vent` | Purple portals with animated circles |
| `queue_zone` | Sigils for dungeon queue circles |

### Hit Effect Renderers (`hitEffects.js`, 912 lines)

38 types in `HIT_EFFECT_RENDERERS`. Effect structure: `{ x, y, life, maxLife, type, dmg, gold }`. Alpha fades based on `life/maxLife`.

| Type | Visual |
|------|--------|
| `kill` | Green burst + gold text |
| `hit` | Red circle + floating damage number |
| `crit` | Purple damage + 6 flying star particles |
| `frost_hit` | Cyan burst + 6 ice shards |
| `burn_hit` | Orange circle + flame trails |
| `poison_hit` | Green circle + poison wisps |
| `heal` | Green circle + "+X" text |
| `shield` | Blue expanding circle |

### Tile Renderer (`tileRenderer.js`, 494 lines)

Scene-specific tilesets:

| Scene | Floor Style | Wall Style |
|-------|-------------|------------|
| Lobby | Dark steel with neon grid | Circuit traces |
| Farm | Wood planks (indoor), grass (outdoor) | Brown wood |
| Cave | Brown stone | Darker stone |
| Mine | Rocky ground | Ore-veined walls |
| Azurine | Dark neon sci-fi | Glowing borders |
| Skeld | Clean white/gray | Among Us style |
| Test Arena | Gray steel | Dark steel |

**Optimization**: Only renders tiles visible in current viewport (culls off-screen).

### Draw Order (Z-layering)

1. Background (scene color)
2. Tilemap (walkable + solid tiles)
3. Level entities (walls, hazards, decorations)
4. Mobs (Y-sorted back-to-front for depth)
5. Bullets
6. Hit effects
7. Death particles
8. Player (always on top in world space)
9. HUD (screen space)
10. Panels (UI overlays)
11. Death screen (if dead)
12. Chat messages
13. Fade transitions

---

## 13. Input System

### Flow

```
Keyboard/Mouse Events
  ↓
[input.js] Event listeners (keydown, keyup, mousemove, mousedown, mouseup, wheel)
  ↓ Sets keysDown[], mouse state, InputIntent flags
  ↓
[inputIntent.js] InputIntent object — per-frame flags
  ↓
[commands.js] translateIntentsToCommands()
  ↓ Converts InputIntent → Command objects { t, ts, data }
  ↓
[authorityTick.js] Processes CommandQueue
  ↓ Authority consumes commands, runs game logic
  ↓
[inputIntent.js] clearOneFrameIntents() — resets "pressed" flags
```

### InputIntent Flags

**Held flags** (persist while key held):
- `moveX`, `moveY` — movement direction (-1, 0, 1)
- `mouseDown` — mouse button held
- `shootHeld` — fire button held
- `arrowShooting` — arrow key aiming active
- `reelHeld` — fishing reel held
- `chatActive` — chat input focused

**Pressed flags** (true for one frame only):
- `shootPressed`, `meleePressed`, `reloadPressed`, `dashPressed`
- `interactPressed`, `potionPressed`, `ultimatePressed`
- `skipWavePressed`, `readyWavePressed`, `reelPressed`
- `slot1Pressed` through `slot5Pressed`

**Mouse coordinates**:
- `mouseX`, `mouseY` — screen space
- `mouseWorldX`, `mouseWorldY` — world space (accounts for camera + zoom)

**Arrow aim**: `arrowAimDir` (0=down, 1=up, 2=left, 3=right)

### Keybinds (19 rebindable actions)

Default bindings include WASD movement, arrow keys for aiming, left-click to shoot, right-click for melee, E to interact, R to reload, Q for dash, 1-5 for hotbar slots, and various panel toggles. All rebindable via Settings → Keybinds.

---

## 14. UI Panels

### Panel Manager

`panelManager.js` enforces **one main panel open at a time** (mutually exclusive). Panels register via `UI._panels` with `onOpen()` and `onClose()` callbacks.

### Registered Panels (14+)

| Panel ID | Purpose | Key Features |
|----------|---------|--------------|
| `chat` | Chat & messages | Message history, command parsing (/commands) |
| `profile` | Player profile | Stats display, faction, country, gender |
| `settings` | Game settings | 7 tabs: General, Keybinds, Sounds, Indicators, Profile, Message, Privacy |
| `inventory` | Items & equipment | 5 tabs (All, Guns, Melees, Armor, Consumables), right-click item cards |
| `identity` | Character identity | Editable name/status, faction/country/language popup selectors |
| `customize` | Character colors | 18 cosmetic categories, HSV color picker with hue bar + SV plane |
| `shop` | Buy items | Context-dependent (dungeon, cave, mining, fishing, farm vendors) |
| `gunsmith` | Gun upgrades | Tier progression display, upgrade recipes, evolve button at L25 |
| `toolbox` | Level editor | 7 tabs (Tilesets, Objects, Hazards, NPCs, Portals, Decorations, Lighting), paint/erase |
| `fishVendor` | Fishing shop | Rod & bait sales |
| `farmVendor` | Farm equipment | Seeds & tools |
| `miningShop` | Mining shop | Pickaxe tier upgrades |
| `testmob` | Mob testing | Dungeon/floor/mob selector, ability descriptions (100+ entries), spawn controls |
| `chatProfile` | Social options | Cosmetics & identity shortcuts |

### Icon Buttons (top-left HUD)

- **Chat** (speech bubble icon)
- **Profile** (phone icon)
- **Map** (folded map with pin)

### Shop Framework

Reusable helpers for vendor panels:
- `shopDrawPanel(pw, ph, opts)` — centered modal with dimmed backdrop
- `shopDrawHeader(px, py, pw, title, opts)` — header bar with title, gold, close button
- `shopDrawTabs(px, py, pw, tabs, activeIdx)` — horizontal tab row
- `shopDrawItemRow(px, py, pw, rowH, item)` — single item list row
- `shopDrawItemGrid(...)` — grid layout for item display

---

## 15. Game Modes & Scenes

### Scene State Machine

`Scene.current` controls the active game mode. Scene transitions use fade animations (fade-to-black → load → fade-from-black).

| Scene | Type | Waves | Features |
|-------|------|:-----:|----------|
| `lobby` | Hub | No | Main town. Chat, shops, portals to all activities. Fishing spots, farm entrance, mine entrance, deli |
| `cave` | Dungeon | Yes | Tutorial dungeon. Wave-based combat with basic mob tiers |
| `dungeon` | Dungeon | Yes | Endgame content. 5 floors × 10 waves. Floor-specific mobs & bosses. Scaling difficulty |
| `azurine` | Dungeon | Yes | Sci-fi themed dungeon. Unique enemies and specials |
| `mine` | Activity | No | Mining area. Ore nodes, pickaxe progression, ore gathering |
| `farm` | Activity | No | Farming area. Crop planting, growth stages, watering, harvesting |
| `cooking` | Activity | No | Cooking area. Recipe-based crafting with ingredients |
| `gunsmith` | Shop | No | Gun upgrade room. Tier progression, crafting recipes |
| `test_arena` | Debug | Optional | Dev testing. Spawn mobs, test abilities, freeze/animate controls |
| `hideseek` | PvP | No | Hide & Seek. Hider vs Seeker roles. FOV-limited vision. AI bot opponent |
| `skeld` | Social | No | Among Us-style map. 20+ task types, multi-step tasks, sabotage system, vent network |

### Portal System

`sceneManager.js` manages zone transitions via `PORTAL_SCENES` registry and `checkPortals()` (called each frame). Portal types: cave_entrance/exit, mine_entrance/exit, deli_entrance/exit, azurine_entrance/exit, farm_entrance/exit, etc.

### Dungeon Queue System

- Player enters queue zone near dungeon entrance
- `queueTimer` counts down 600 frames (10 seconds)
- Player is locked in place during countdown
- On timeout → teleport to dungeon floor 1

### Floor Progression

- `dungeonFloor` tracks current floor (1-5)
- `stairsOpen` set by waveSystem when all waves cleared
- `goToNextFloor()` advances to next floor, resets mobs/waves
- After floor 5 → return to hub

### Hide & Seek

- **Role Select**: Player chooses Hider or Seeker at start
- **Hide Phase**: Seeker has full map overview, hider gets time to hide
- **Seek Phase**: Seeker has circular FOV cutout (limited vision), must find hider
- **Vent System**: Among Us-style vent cycling for movement
- **AI Bot**: Automated opponent with pathfinding

### The Skeld

- **20+ task types**: Upload, download, electrical, card swipe, etc.
- **Multi-step tasks**: Some require 2-3 sequential steps
- **Sabotage system**: Reactor meltdown, O2 depletion, lights out, comms down
- **Vent network**: Purple portals with arrow cycling between connected vents
- **Map uses XO=4 offset**: Virtual coordinates need `+ 4` for actual grid position

---

## 16. Debug Tools & Commands

### Chat Commands (entered via `/command` in chat)

| Command | Args | Effect |
|---------|------|--------|
| `/gun` | `<id> [tier level]` | Spawn/upgrade gun (e.g. `/gun rifle 3 15`) |
| `/test` | `<mobType> [live]` | Spawn mob for testing (live = animate) |
| `/spawn` | `<mobType>` | Spawn mob (frozen) |
| `/killall` | — | Clear all mobs |
| `/gold` | `[amount]` | Add gold (default 500) |
| `/wave` | `[n]` | Jump to wave n |
| `/heal` | — | Restore full HP |
| `/dung` | — | Teleport to dungeon floor 1 |
| `/leave` | — | Exit current scene to hub |
| `/op` | — | Toggle OP mode (infinite gold, 10000 HP, all items) |
| `/stairs` | — | Open staircase to next floor |
| `/floor` | `[n]` | Set dungeon floor |
| `/freeze` | — | Toggle mob freeze (stops all movement) |
| `/god` | — | Toggle god mode (invincible) |
| `/nofire` | — | Toggle mob firing (no projectiles) |
| `/speed` | `<n>` | Set game speed multiplier (0.25-2.0×) |
| `/hp` | `<n\|max>` | Set player HP |
| `/skipw` | — | Skip current wave phase |
| `/sprites` | — | Toggle sprite rendering mode |
| `/export` | — | Export game state as JSON |
| `/save` | — | Force save to localStorage |
| `/resetsave` | — | Clear all saved data |
| `/info` | — | Show help message |

### HUD Debug Flags

Displayed in top-right when active:

| Flag | Color | Meaning |
|------|-------|---------|
| GOD | #ffd700 (gold) | Player invincible |
| FROZEN | #00e5ff (cyan) | All mobs frozen |
| NOFIRE | #ff4444 (red) | Mobs can't shoot |
| OP | #ff80ff (magenta) | OP mode (10000 HP, infinite gold) |
| Nx | #66ff66 (green) | Game speed multiplier (0.5×, 2×, etc.) |

### Test Mob Panel

Full GUI for mob testing (`testMobPanel.js`):
- Dungeon type selector (Cave, Azurine)
- Floor selector (1-5)
- Mob list with full stats
- Spawn controls (freeze/animate, live/test mode)
- Ability info popup (right-click mob → see all specials with descriptions)
- 100+ ability descriptions

---

## 17. Key Conventions & Rules

### Adding New Mobs

1. Define in `MOB_TYPES` (`mobTypes.js`) — hp, speed, damage, ai, specials, visuals
2. Add AI pattern to `MOB_AI` (`combatSystem.js`) if custom movement needed
3. Add specials to `MOB_SPECIALS` (`combatSystem.js`) if mob has abilities
4. Add renderer entry to `ENTITY_RENDERERS` if custom visual (optional)
5. Add to floor config in `floorConfig.js`

### Adding New Entities

1. Add renderer function to `ENTITY_RENDERERS` registry (`entityRenderers.js`)
2. Place entity in level data (`levelData.js`) with type, position, dimensions

### The Skeld Map Rules (MANDATORY)

When modifying The Skeld map in `js/shared/levelData.js`:
- **Do NOT change hallway/corridor positions, widths, or pathing**
- **Do NOT let rooms absorb corridor space or overlap each other**
- **Do NOT move which side of a room the hallway connects from**
- **Only expand rooms outward into dead space (wall tiles)**
- **If a room is at the map edge, ASK before increasing grid size**
- All coordinates use virtual space with `XO=4` offset (actual = virtual + 4)
- Map grid: W=135, H=80
- Minimap labels in `draw.js` use ACTUAL grid coordinates (virtual + XO)
- Spawn/entity positions use `+ XO` in the return block

### Collision System

- **Grid-based AABB** via `positionClear(px, py, hw)`
- Player uses `PLAYER_WALL_HW=16`, `PLAYER_RADIUS=27`
- Mobs use `MOB_WALL_HW=14`, `MOB_RADIUS=27`
- Collision grid: 2D array where `1 = solid`

### Backup Convention

Create backups before major changes:
```
*_backup_pre_<feature_name>.js
*_backup_pre_<feature_name>.html
```

### Script Scope

`let` variables in `<script>` tags are in global lexical scope — accessible from other scripts and `eval()`, but NOT on `window` object. Properties that need cross-script access are aliased to `window` via `Object.defineProperty` in `gameState.js`.

---

## Appendix: Complete Script Loading Manifest

57 script tags loaded in order from `index.html`:

```
 #  File                                          Lines   Phase
 1  js/shared/gameConfig.js                         33    A
 2  js/shared/levelData.js                       1,580    A
 3  js/shared/mobTypes.js                          412    A
 4  js/shared/floorConfig.js                       500    A
 5  js/shared/itemData.js                           78    A
 6  js/shared/oreData.js                            65    A
 7  js/shared/cookingData.js                       116    A
 8  js/shared/fishingData.js                       105    A
 9  js/shared/farmingData.js                        83    A
10  js/shared/armorVisuals.js                       80    A
11  js/shared/dungeonRegistry.js                    79    A
12  js/shared/gunData.js                           223    A
13  js/shared/progressionData.js                   671    A
14  js/shared/skillRegistry.js                     114    A
15  js/shared/hideSeekData.js                       17    A
16  js/authority/eventBus.js                        32    B
17  js/authority/gameState.js                      139    B
18  js/authority/combatSystem.js                 5,898    B
19  js/authority/attackShapes.js                   135    B
20  js/authority/telegraphSystem.js                257    B
21  js/authority/hazardSystem.js                   950    B
22  js/client/rendering/hitEffects.js              912    C
23  js/client/rendering/entityRenderers.js       2,975    C
24  js/core/sceneManager.js                        356    A.5
25  js/core/tileRenderer.js                        494    A.5
26  js/authority/waveSystem.js                     674    B
27  js/authority/damageSystem.js                   371    B
28  js/authority/inventorySystem.js                267    B
29  js/authority/mobSystem.js                    1,103    B
30  js/authority/stateReset.js                     997    B
31  js/authority/miningSystem.js                   604    B
32  js/authority/fishingSystem.js                  839    B
33  js/authority/farmingSystem.js                  759    B
34  js/authority/snapshots.js                      485    B
35  js/authority/commands.js                       125    B
36  js/authority/authorityTick.js                  145    B
37  js/authority/hideSeekSystem.js                 783    B
38  js/client/rendering/characterSprite.js       3,942    C
39  js/client/rendering/hideSeekFOV.js             717    C
40  js/client/input/inputIntent.js                  86    D
41  js/client/ui/panelManager.js                   943    D
42  js/client/ui/chatProfile.js                    108    D
43  js/client/ui/toolbox.js                      1,472    D
44  js/client/ui/settings.js                       101    D
45  js/client/ui/shopFramework.js                  279    D
46  js/client/ui/panels.js                       2,024    D
47  js/client/ui/customize.js                      888    D
48  js/client/ui/inventory.js                    2,707    D  ← game loop entry
49  js/client/ui/testMobPanel.js                   809    D
50  js/client/input/input.js                       933    E
51  js/core/gunSystem.js                           807    E
52  js/core/meleeSystem.js                       1,310    E
53  js/core/saveLoad.js                            509    E
54  js/core/skeldTasks.js                        2,631    E
55  js/core/interactable.js                        598    E
56  js/authority/cookingSystem.js                   790    E
57  js/authority/deliNPCSystem.js                  965    E
58  js/core/draw.js                              2,204    E
59  js/testing/testHarness.js                      500    E
```

---

*This document describes the Teah Online codebase as of March 2026. Total: ~48,800 lines of vanilla JavaScript across 57 active script files, with no external dependencies.*
