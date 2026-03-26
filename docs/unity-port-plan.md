# Unity Port Planning Document

> Complete mapping of the Teah Online JS prototype → Unity C#.
> Current state: ~121,200 lines JS, 91 files.
> Unity project: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline` (Unity 6, 6000.4.0f1)
> **Foundation complete** (68 C# scripts, 13,537 lines). Core gameplay systems next.

---

## Table of Contents

1. [Current State — What Actually Works](#1-current-state--what-actually-works)
2. [Revised Phase Plan](#2-revised-phase-plan)
3. [Unity Project Structure](#3-unity-project-structure)
4. [System-by-System Migration Map](#4-system-by-system-migration-map)
5. [Data Registry Migration](#5-data-registry-migration)
6. [Art & Audio Pipeline](#6-art--audio-pipeline)
7. [UI Migration](#7-ui-migration)
8. [Save/Load & Persistence](#8-saveload--persistence)
9. [Networking Architecture](#9-networking-architecture)
10. [Gaps & Decisions Needed](#10-gaps--decisions-needed)

---

## 1. Current State — What Actually Works

### Fully Working (Playable)
- Player movement with collision (lobby + dungeon)
- Camera follow with bounds clamping
- Lobby ↔ dungeon scene transition (cave portal)
- Shooting (sidearm: dmg=28, mag=35, fireRate=5)
- Melee (combat_blade: dmg=24, range=110, arc=144°, crit 15%, lifesteal 15%)
- Mob spawning with 13 AI patterns
- Wave system (10 waves × 5 floors, 3-phase spawning, boss waves)
- Damage pipeline (invuln → shield → reduction → mark → apply)
- 7 mob status effects (frost, burn, stagger, stun, root, mark, silence)
- BFS pathfinding + line-of-sight
- Gold rewards + quick-kill bonus
- Player death → return to lobby
- GameHUD (floor/wave/kills display)

### Data Ported (Registries Loaded, Not Used In Gameplay Yet)
- 265 mob types (JSON, 49 fields each)
- 6 dungeon definitions + 30 floor configs
- 442 mob ability stubs (framework ready, logic not implemented)
- Skill data (6 categories, 56 skills, XP curves)
- Progression data (17 items, 5 tiers × 25 levels)
- Crafting data (49 materials, 60+ drop tables)
- Fishing/mining/farming/cooking data (all registries)
- Casino data (10 games), Mafia data (7 roles), Spar data, Hide&Seek data

### Scaffolding Only (Architecture Exists, No Working Logic)
- Network infrastructure (no transport layer, no actual send/receive)
- Client prediction (empty replay method)
- Server input handling (empty handler)
- Casino/Mafia/HideSeek/Spar systems (data + lifecycle, bots don't work)

### Not Started At All
- Inventory system
- Equipment swapping
- UI panels (inventory, shop, forge, settings, etc.)
- Save/load
- Character rendering (using cyan placeholder square)
- Scene management (only lobby ↔ cave dungeon works)
- Party system
- Bot AI
- Art/sprites/audio
- Multiple dungeon portals

---

## 2. Revised Phase Plan

### Completed Phases

| Phase | Goal | Status |
|-------|------|--------|
| **0** | Project setup, folder structure, GameConfig SO | DONE |
| **1** | Player movement, collision, camera, input (lobby) | DONE & VERIFIED |
| **1.5** | Vertical slice: 1 dungeon, mobs, gun, melee, waves | DONE & VERIFIED |
| **2** | Full combat: damage pipeline, status FX, 13 AI, pathfinding | DONE & VERIFIED |
| **S** | Scaffolding: all data registries, ability stubs, game mode skeletons, network architecture | DONE (data only) |
| **3** | Inventory + equipment + items | DONE |
| **4** | UI panels (inventory, shop, forge, settings, HUD, hotbar) | DONE |
| **5** | Save/load + progression persistence | DONE |

### Remaining Phases

#### Phase 3: Inventory + Equipment + Items
**Goal**: Player can carry, equip, swap, and use items.

| Task | JS Source | Scope |
|------|-----------|-------|
| Item data model (guns, melee, potions, materials, armor) | `itemData.js`, `interactable.js` | Medium |
| Inventory system (100 slots, add/remove/stack) | `inventorySystem.js` | Large (~1500 lines) |
| Equipment slots (gun, melee, armor) + stat application | `inventorySystem.js` | Medium |
| Quickslot system (4 slots, hotbar) | `inventorySystem.js` | Small |
| Potion system (heal, use from quickslot) | `inventorySystem.js` | Small |
| Loot drops (mobs drop items on death) | `waveSystem.js`, `craftingData.js` | Medium |
| GunSystem reads equipped gun stats (not hardcoded) | `gunSystem.js` | Small |
| MeleeSystem reads equipped melee stats (not hardcoded) | `meleeSystem.js` | Small |

**Milestone**: Player picks up loot, equips different weapons, combat stats change.

#### Phase 4: UI Panels
**Goal**: Player can interact with inventory, shop, settings.

| Task | JS Source | Scope |
|------|-----------|-------|
| Panel manager (single-panel-at-a-time, open/close) | `panelManager.js` | Medium |
| Inventory panel (grid, drag-drop, equip, tooltips) | `inventory.js` UI section | Large |
| Shop panel (buy/sell weapons + armor) | `inventory.js` shop section | Medium |
| Forge/Gunsmith panel (upgrade + evolve weapons) | `forgeUI.js` | Medium |
| Settings panel (keybinds, toggles, sliders) | `settingsUI.js` | Medium |
| HUD improvements (HP bar, gold, ammo, quickslots) | `draw.js` HUD section | Medium |

**Milestone**: Full gameplay UI — inventory, shops, upgrades all functional.

#### Phase 5: Save/Load + Progression
**Goal**: Progress persists between sessions.

| Task | JS Source | Scope |
|------|-----------|-------|
| Save/load system (JSON file, schema versioning) | `saveLoad.js` (~800 lines) | Large |
| Progression tracking (player level, XP, skill data) | `waveSystem.js`, `skillRegistry.js` | Medium |
| Gun/melee/tool level persistence | `saveLoad.js` tier/level format | Small |
| Settings + keybind persistence | `saveLoad.js` | Small |
| Cooking/farming/fishing progress persistence | `saveLoad.js` | Small |

**Milestone**: Player can close and reopen the game without losing progress.

#### Phase 6: Character Rendering
**Goal**: Replace placeholder squares with actual characters.

| Task | JS Source | Scope |
|------|-----------|-------|
| 3-layer sprite system (body/head/hat) | `characterSprite.js` (~2000 lines) | Large |
| Direction-based animation (walk, idle, swing, shoot) | `characterSprite.js` | Large |
| Mob rendering (per-type sprites or procedural) | `entityRenderers.js` | Large |
| Entity rendering (trees, buildings, NPCs, portals) | `entityRenderers.js` (143 types) | Large |
| Hit effects (73 types) | `hitEffects.js` | Large |
| Identity/customize panel (skin, hair, colors) | `panelManager.js` | Medium |

**Milestone**: Game looks like the JS version — characters, mobs, entities all rendered properly.

#### Phase 7: Scene Management + Dungeons
**Goal**: All dungeons and scenes accessible.

| Task | JS Source | Scope |
|------|-----------|-------|
| Scene manager (18 scenes, portal registry) | `sceneManager.js` | Medium |
| Level data → tilemaps (28+ levels) | `levelData.js` (~5000 lines) | Large |
| All dungeon portals in lobby | `levelData.js` lobby section | Small |
| Un-stub 442 mob abilities (per dungeon) | 9 ability files (~15K lines total) | Huge |
| Floor transitions (stairs between floors) | `waveSystem.js` | Small |
| Dungeon-specific hazards + telegraphs | `telegraphSystem.js`, `hazardSystem.js` | Medium |

**Milestone**: All 6 dungeons playable with full mob abilities.

#### Phase 8: Skills + Crafting
**Goal**: Fishing, mining, farming, cooking all playable.

| Task | JS Source | Scope |
|------|-----------|-------|
| Fishing state machine (cast/wait/reel) | `fishingSystem.js` (~938 lines) | Large |
| Mining system (ore spawning, breaking, drops) | `miningSystem.js` (~690 lines) | Large |
| Farming system (tile state, planting, growth, harvest) | `farmingSystem.js` (~1197 lines) | Large |
| Cooking system (order/assembly mini-game) | `cookingSystem.js` (~1022 lines) | Large |
| Crafting system wiring (forge uses CraftingSystem) | `craftingSystem.js` | Small |
| Skill scenes (mine, farm, cooking, fishing areas) | `levelData.js` | Medium |

**Milestone**: All 4 skill mini-games functional.

#### Phase 9: Party + Bot AI
**Goal**: Player can have bot party members.

| Task | JS Source | Scope |
|------|-----------|-------|
| Party system (add/remove bots, 4-member max) | `partySystem.js` (~800 lines) | Large |
| Bot AI (combat, movement, targeting, equipment) | `botAI.js` (~2000+ lines) | Large |
| Bot rendering (same 3-layer sprite system) | `characterSprite.js` | Medium (reuse Phase 6) |
| Party HUD (bot HP bars, status) | `draw.js` | Small |

**Milestone**: Player fights dungeons with AI party members.

#### Phase 10: Game Modes
**Goal**: Spar, Mafia, Casino, Hide&Seek all playable.

| Task | JS Source | Scope |
|------|-----------|-------|
| Casino — wire up UI for 10 games | `casinoUI.js` | Large |
| Mafia — bot AI, pathfinding, scenes | `mafiaSystem.js` bot section | Large |
| Hide & Seek — bot AI, collision, FOV | `hideSeekSystem.js` bot section | Medium |
| Spar — full remake (separate project) | `sparSystem.js` (~10K lines) | Huge |
| Game mode scene transitions | `sceneManager.js` | Small |

**Milestone**: All 4 game modes playable.

#### Phase 11: Networking + Multiplayer
**Goal**: Multiple players can play together online.

| Task | Scope |
|------|-------|
| Choose + implement transport (WebSocket/UDP) | Large |
| Wire ServerAuthority.HandleInput() | Medium |
| Complete ClientPrediction reconciliation | Medium |
| Lobby broadcasting (ready/start/settings sync) | Medium |
| Delta compression for bandwidth | Medium |
| Interest management (spatial filtering) | Medium |
| Server hosting decision + deployment | Large |
| Account system + persistence backend | Large |

**Milestone**: 2+ players in same dungeon, fighting together.

#### Phase 12: Art, Audio, Polish
**Goal**: Production-quality visuals and sound.

| Task | Scope |
|------|-------|
| Pixel art spritesheets (32×32, Graal-style) | Huge (art) |
| Tileset art per biome | Large (art) |
| UI art (panel backgrounds, icons, buttons) | Large (art) |
| SFX (~110 sounds: guns, melee, mobs, UI, skills) | Large (audio) |
| Music (8-10 per-scene tracks) | Large (audio) |
| VFX polish (particles, shaders) | Medium |
| Mobile input adaptation | Medium |
| Performance optimization | Medium |

**Milestone**: Shippable game.

---

## 3. Unity Project Structure

Maps directly from the JS authority/client split:

```
Assets/
├── Scripts/
│   ├── Shared/              ← js/shared/ (data classes + registries)
│   │   ├── Data/            ← MobType.cs, ItemData, etc.
│   │   ├── Config/          ← GameConfig.cs (ScriptableObject)
│   │   ├── Registries/      ← Runtime lookup tables (JSON + C#)
│   │   └── Network/         ← NetworkConstants.cs, NetworkMessages.cs
│   │
│   ├── Authority/           ← js/authority/ (server-side logic)
│   │   ├── Combat/          ← DamageSystem, GunSystem, MeleeSystem, BulletSystem
│   │   │   └── Abilities/   ← LegacyAbilities, dungeon ability files
│   │   ├── Mobs/            ← MobController, MobAIPatterns, MobStatusEffects, Pathfinding
│   │   ├── Waves/           ← WaveSystem
│   │   ├── Party/           ← (empty — Phase 9)
│   │   ├── Inventory/       ← (empty — Phase 3)
│   │   ├── Skills/          ← SkillXPSystem, CraftingSystem
│   │   ├── GameModes/       ← SparSystem, MafiaSystem, CasinoSystem, HideSeekSystem
│   │   ├── Network/         ← ServerAuthority
│   │   └── State/           ← GameState
│   │
│   ├── Client/              ← js/client/ (client-side only)
│   │   ├── Input/           ← InputIntent, PlayerInputHandler
│   │   ├── Rendering/       ← (empty — Phase 6)
│   │   ├── UI/              ← GameHUD (only file so far)
│   │   ├── Camera/          ← CameraController
│   │   └── Network/         ← ClientPrediction, RemoteEntityInterpolator
│   │
│   ├── Core/                ← js/core/ (bridge layer)
│   │   ├── Events/          ← EventBus
│   │   ├── Network/         ← NetworkManager, NetworkLobby
│   │   ├── SaveLoad/        ← (empty — Phase 5)
│   │   └── SceneManagement/ ← (empty — Phase 7)
│   │
│   └── Editor/              ← CreateGameConfigAsset, SetInputBoth

Assets/Resources/            ← Runtime JSON data
├── dungeon_registry.json    (6 dungeons)
├── mob_types.json           (265 mob types, 7140 lines)
└── floor_config.json        (30 floor configs, 162KB)

Assets/ScriptableObjects/
└── GameConfig.asset         (all default values matching JS)
```

---

## 4. System-by-System Migration Map

### Combat System
| JS | Unity | Status |
|----|-------|--------|
| `combatSystem.js` StatusFX object | `MobStatusEffects.cs` (7 effects) | DONE |
| `MOB_AI` function registry | `MobAIPatterns.cs` (13 patterns) | DONE |
| `MOB_SPECIALS` function registry | `MobAbilitySystem.cs` + ability files | Stubs only |
| `damageSystem.js` pipeline | `DamageSystem.cs` | DONE |
| `GUN_BEHAVIORS` | Not started | Phase 3 |
| `attackShapes.js` | `AttackShapes.cs` | Stub |
| `telegraphSystem.js` | `TelegraphSystem.cs` | Stub |

### Mob System
| JS | Unity | Status |
|----|-------|--------|
| `mobSystem.js` BFS pathfinding | `Pathfinding.cs` (BFS 8-dir) | DONE |
| Wall collision + wall-sliding | Via `Tilemap.HasTile()` | DONE |
| `MOB_CAPS` per-type limits | Not implemented | Phase 7 |
| Mob spawning | `WaveSystem.cs` | DONE |

### Input System
| JS | Unity | Status |
|----|-------|--------|
| `keysDown` object | Unity Input System | DONE |
| `InputIntent` flags | `InputIntent.cs` | DONE |
| Mouse world coords | `Camera.main.ScreenToWorldPoint()` | DONE |

### Scene Management
| JS | Unity | Status |
|----|-------|--------|
| `Scene._current` string | `GameScene` enum in `GameManager.cs` | Lobby+Dungeon only |
| `PORTAL_SCENES` registry | Hardcoded portal positions | Phase 7 |
| `LEAVE_HANDLERS` | Not started | Phase 7 |
| `enterLevel()` auto-cleanup | `ReturnToLobby()` in GameManager | Partial |

### Save/Load
| JS | Unity | Status |
|----|-------|--------|
| `localStorage` schema v10 | Not started | Phase 5 |
| Schema versioning + migrations | Not started | Phase 5 |
| Keybinds persistence | Not started | Phase 5 |

### UI
| JS | Unity | Status |
|----|-------|--------|
| Panel manager (one-at-a-time) | `PanelManager.cs` | DONE |
| Inventory panel (grid, tabs, equip, tooltips) | `InventoryPanelUI.cs` | DONE |
| Shop panel (buy weapons/armor) | `ShopPanelUI.cs` | DONE |
| Forge panel (upgrade/evolve) | `ForgePanelUI.cs` | DONE |
| Settings panel (toggles, keybinds, audio) | `SettingsPanelUI.cs` | DONE |
| Chat panel | Not started | Future |
| GameHUD (floor/wave/kills) | `GameHUD.cs` | DONE |

### Rendering
| JS | Unity | Status |
|----|-------|--------|
| `characterSprite.js` 3-layer | Not started (cyan square placeholder) | Phase 6 |
| `entityRenderers.js` (143 types) | Not started | Phase 6 |
| `hitEffects.js` (73 types) | Not started | Phase 6 |
| Y-sorted entity drawing | Not started | Phase 6 |

---

## 5. Data Registry Migration

**DECIDED**: Large data registries use **Runtime JSON** (loaded via `Resources.Load<TextAsset>()`), NOT ScriptableObjects.

### Registry Status
| Registry | Entries | Status |
|----------|---------|--------|
| MOB_TYPES | 265 | DONE (JSON + loader) |
| MOB_SPECIALS | 442 | DONE (stubs registered) |
| FLOOR_CONFIG | 30 | DONE (JSON + loader) |
| DUNGEON_REGISTRY | 6 | DONE (JSON + loader) |
| PROG_ITEMS | 17 | DONE (C# registry) |
| CRAFT_MATERIALS | 49 | DONE (C# registry) |
| SKILL_REGISTRY | 56 | DONE (C# registry) |
| FISHING_REGISTRY | 6 fish, 4 rods | DONE (C# registry) |
| ORE_REGISTRY | 15 ores | DONE (C# registry) |
| FARMING_REGISTRY | 9 crops, 4 hoes | DONE (C# registry) |
| COOKING_REGISTRY | 33 recipes, 44 ingredients | DONE (C# registry) |
| CASINO_DATA | 10 games | DONE (C# registry) |
| MAFIA_DATA | 7 roles | DONE (C# registry) |
| SPAR_DATA | arena sizes, CT-X formulas | DONE (C# registry) |
| HIDESEEK_DATA | timers, ranges | DONE (C# registry) |
| ENTITY_RENDERERS | 143 | Not started |
| HIT_EFFECT_RENDERERS | 73 | Not started |
| LEVELS | 28+ | Not started |
| ITEM_DATA | Items, tiers, colors | Not started |
| GUN_BEHAVIORS | 10+ | Not started |
| ARMOR_VISUALS | 4 tiers | Not started |

---

## 6. Art & Audio Pipeline

### Art — Decisions Made
| Decision | Status |
|----------|--------|
| Art style | 32×32 pixel art (Graal-style) |
| Sprite resolution | 32×32 (all 3 layers uniform) |
| Tile size | 48px (TILE constant) |
| Animation method | TBD — frame-based spritesheets vs skeletal |
| Art & audio | ON HOLD until systems are playable |

### Sprite Layer System
```
Unity Sorting Layers:
  Background (tiles)
  Entities (Y-sorted)
    └─ Character (parent GO)
       ├─ Body (SpriteRenderer, order=0)  ← 32×32, 4 cols × 32 rows
       ├─ Head (SpriteRenderer, order=1)  ← 32×32, 4 cols × 4 rows
       └─ Hat  (SpriteRenderer, order=2)  ← 32×32, 5 cols × 5 rows
  Effects (particles, UI)
```

### Audio — Needs Full Design
| Category | Est. Count |
|----------|-----------|
| Gun SFX | 15 |
| Melee SFX | 12 |
| Mob SFX | 20+ |
| UI SFX | 10 |
| Skill SFX | 15 |
| Environment | 10+ |
| Music | 8-10 |
| Status FX | 8 |
| Game Mode | 10 |
| **Total** | **~110+** |

---

## 7. UI Migration

### Unity UI Approach: Canvas uGUI (decided Phase 4)

### Panel Migration Map
| Panel | Phase | Complexity |
|-------|-------|-----------|
| Inventory | 4 | High — 100 slots, drag-drop, equipment, quickslots, tooltips |
| Casino | 10 | High — 10 game UIs |
| Identity/Customize | 6 | Medium — color pickers, preview |
| Settings | 4 | Medium — tabs, toggles, sliders, keybinds |
| Gunsmith/Forge | 4 | Medium — upgrade UI, tier display, costs |
| Shop | 4 | Medium — buy/sell, grid layout |
| Chat | 4 | Medium — text input, history, commands |
| Profile | 4 | Low — static display |
| Test Mob | 4 | Low — debug spawn buttons |

---

## 8. Save/Load & Persistence

### Current Schema (v10) — What Gets Saved
```
Persisted (survives page reload):
  - Keybinds, settings, identity, cosmetics
  - Progression (player level, XP, skill data)
  - Gun/pickaxe/hoe levels (tier + level)
  - Fishing stats, farming stats
  - Cooking progress (lifetime orders, purchased shops)
  - Spar progress + learning data
  - CT-X slider settings
  - Crafting materials
  - Quickslots

NOT Persisted (session-only, roguelike design):
  - Gold, inventory, equipment
  - Dungeon progress (floor, wave, kills)
  - Combat state (HP, bullets, mobs, effects)
  - Farm tiles (only landLevel persists)
```

### Unity Approach: JSON file with same schema versioning pattern
- Single-player: JSON file in Application.persistentDataPath
- Multiplayer (future): Server-side DB + local cache for settings

---

## 9. Networking Architecture

### Current State
The JS codebase has full networking-ready architecture:
- `CommandQueue` — FIFO command buffer
- `authorityTick()` — processes commands → updates state
- `InputIntent` — one-frame vs held flags
- Authority/client split throughout

### Unity Networking — DONE (infrastructure only)
- `NetworkManager.cs` — Offline/Host/Client modes, 60Hz tick, 20Hz snapshots
- `NetworkMessages.cs` — Wire protocol (InputFrame, GameSnapshot, entity snapshots)
- `ServerAuthority.cs` — Entity registration, snapshot builder
- `ClientPrediction.cs` — Local prediction framework
- `RemoteEntityInterpolator.cs` — Remote entity smoothing
- `NetworkLobby.cs` — Room management

### Still Needs
- Transport layer implementation (WebSocket/UDP)
- ServerAuthority.HandleInput() wiring
- ClientPrediction reconciliation completion
- Lobby broadcast implementation
- Server hosting decision

---

## 10. Gaps & Decisions Needed

### Decided
| Decision | Answer |
|----------|--------|
| Unity version | Unity 6 (6000.4.0f1) |
| Target platform | PC first, mobile later |
| Art style | 32×32 pixel art (Graal-style) |
| Data registries | Runtime JSON for large, SO for small configs |
| Networking architecture | Custom CommandQueue → AuthorityTick → Snapshot |
| Coordinate system | PPU=48, 1 tile = 1 Unity world unit |
| Fixed timestep | 60Hz |

### Still Open
| Decision | When |
|----------|------|
| Transport (WebSocket vs UDP) | Phase 11 |
| Server hosting (dedicated/player-hosted/relay) | Phase 11 |
| Persistence backend (local JSON/Firebase/custom DB) | Phase 11 |
| Animation method (frame vs skeletal) | Phase 6 |
| UI framework | Canvas uGUI (decided) |
| Anti-cheat approach | Phase 11 |
| Audio implementation | Phase 12 |

---

## Appendix: Key Constants Reference

These values must be preserved exactly during port for gameplay parity:

```
// Physics (from GAME_CONFIG)
TILE                = 48 px
PLAYER_BASE_SPEED   = 7.5 px/frame (450 px/sec @ 60fps)
PLAYER_WALL_HW      = 14 px
PLAYER_RADIUS       = 23 px
MOB_WALL_HW         = 11 px
MOB_RADIUS          = 23 px
POS_HW              = 10 px
MOB_CROWD_RADIUS    = 46 px
BULLET_SPEED        = 9 px/frame (540 px/sec @ 60fps)
BULLET_HALF_LONG    = 15 px
BULLET_HALF_SHORT   = 4 px
ENTITY_R            = 29 px
PLAYER_HITBOX_Y     = -25 px
KNOCKBACK_DECAY     = 0.8 per frame
KNOCKBACK_THRESHOLD = 0.6 px/frame

// Screen
BASE_W              = 1920 px
BASE_H              = 1080 px
WORLD_ZOOM          = 0.85

// Game
MAX_PARTY_SIZE      = 4
INVENTORY_SLOTS     = 100
TIERS               = 5
LEVELS_PER_TIER     = 25
DUNGEONS            = 6
FLOORS_PER_DUNGEON  = 5
CASINO_GAMES        = 10
MOB_TYPES_COUNT     = 265
MOB_AI_PATTERNS     = 13
MOB_SPECIALS_COUNT  = 442
ENTITY_TYPES        = 143
HIT_EFFECT_TYPES    = 73
SCENES              = 18
```

**Frame-rate note**: All px/frame values assume 60fps. In Unity with variable deltaTime, convert to px/sec: `value * 60`. Use `Time.fixedDeltaTime` for physics or implement a fixed tick rate for authority simulation.
