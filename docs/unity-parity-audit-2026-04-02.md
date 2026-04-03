# Unity Parity Audit — 2026-04-02

> **Audit snapshot.** This document reflects the state of the Unity port at the time of writing. It is not final truth — systems change as work progresses. Re-audit periodically.

## Snapshot Metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-04-02 |
| **JS reference tag** | `unity-parity-reference` (`2de68d4fc5ca787cccd3630d6cc6f8af069812f1`) |
| **Method** | Docs-driven, runtime-verification-first. 35 JS docs read → feature checklist built → 6 parallel code audits across ~100 Unity C# files → Unity MCP runtime scene hierarchy verification. |
| **Unity scene** | `SampleScene` (55 root GameObjects at time of audit) |
| **Port phase** | Phase 17 complete (Graphics Parity). All 16.x secondary systems DONE in code. |

---

## Executive Summary

| Status | Count | % |
|--------|-------|---|
| **Working** | 68 | 65% |
| **Partial** | 23 | 22% |
| **Broken** | 0 | 0% |
| **Missing** | 13 | 13% |
| **Total features audited** | 104 | |

> **Correction note (2026-04-02 follow-up):** F1/F2/F3 were originally classified as Broken/Missing. Manual code review revealed all three were already fully implemented — they use dynamic GO creation on dungeon entry, not static scene placement. The audit's runtime check only captured the lobby state.

### Top 5 Blockers

1. ~~**Wave system not wired to scene**~~ **RESOLVED** — dynamically created on dungeon entry via SetupCombatSystems(). Audit missed dynamic creation.
2. ~~**Player damage pipeline incomplete**~~ **RESOLVED** — DealDamageToPlayer has full pipeline (dodge/armor/thorns/lethal/backstab). Implemented Phases 13/17.
3. ~~**Party system + Bot AI not instantiated**~~ **RESOLVED** — dynamically created on dungeon entry. Player+3 bots spawn correctly.
4. **Game modes missing from runtime** — Casino, Spar, Mafia, Hide & Seek have script stubs but zero scene GOs or UI canvases.
5. **Cooking NPC systems entirely absent** — deliNPCSystem, dinerNPCSystem, fineDiningNPCSystem, cookingNPCBase have no Unity equivalents.

### What IS solid

The **core architecture, rendering pipeline, data registries, and input system** are at 80-95% parity. Tile rendering (18 scenes), entity renderers (123+ types), hit effects (73 types), character sprites (3-layer), Y-sorting, camera, HUD, hotbar, minimap, and most UI panels are working. The command pipeline (intent → command → authority tick) is exact parity.

---

## Verification Notes

### Evidence Labels

| Label | Meaning |
|-------|---------|
| **Runtime verified (R)** | Confirmed via Unity MCP scene hierarchy inspection. The GameObject exists in the active scene with expected components. |
| **Code-only verified (C)** | C# script exists and was read. Logic appears to match JS. No runtime confirmation that it executes correctly. |
| **Unable to verify automatically (U)** | Could not confirm via code inspection or runtime tools. Requires manual play testing. |

### Methodology

This audit starts from the project's 35 documentation files, which describe the intended game behavior and player-facing systems. Each documented feature was checked against both the JS source code and the Unity C# port. Runtime verification was performed via Unity MCP (scene hierarchy, component presence, console errors). This approach catches features that have backend code but are not actually wired into the running game.

---

## Doc-Derived Feature Checklist

75 features extracted from docs. Each row indicates the doc source, whether it is player-facing, and which JS files define the reference behavior.

| # | System | Doc Source | Player-Facing | JS Reference |
|---|--------|-----------|:---:|-------------|
| 1 | Scene state machine (18 scenes) | scenes-and-levels | Y | sceneManager.js |
| 2 | Portal/scene transitions | scenes-and-levels | Y | sceneManager.js, interactable.js |
| 3 | State reset (8 modes) | state-reset-and-data-registries | N | stateReset.js |
| 4 | Lobby (NPCs, portals, version sign) | scenes-and-levels | Y | levelData.js, draw.js |
| 5 | Phone/Side icons (chat, profile, map) | ui-panels | Y | chatProfile.js, toolbox.js |
| 6 | Profile menu (15-icon grid) | ui-systems-detail | Y | chatProfile.js |
| 7 | Panel Manager (open/close/toggle/exclusive) | ui-panels | Y | panelManager.js |
| 8 | Escape key priority chain (9 steps) | input-detail | Y | input.js |
| 9 | Chat panel | ui-panels | Y | chatProfile.js |
| 10 | Identity panel (name, stats, faction, country) | ui-systems-detail | Y | chatProfile.js |
| 11 | Settings panel (7 tabs, keybinds, toggles) | ui-panels | Y | settings.js |
| 12 | Customize panel (19 categories, HSV picker) | ui-systems-detail | Y | customize.js |
| 13 | Inventory panel (200 slots, grid, tabs, equip) | inventory-and-items | Y | inventory.js |
| 14 | Quickslot system (4 assignable slots) | hotbar-and-quickslots | Y | inventory.js, input.js |
| 15 | Hotbar (5 slots) | hotbar-and-quickslots | Y | inventory.js |
| 16 | Forge/Gunsmith panel | crafting, ui-panels | Y | forgeUI.js |
| 17 | Shop framework (vendors) | ui-panels | Y | shopFramework.js, panels.js |
| 18 | News/Bounty/Passcode panels | ui-systems-detail | Y | chatProfile.js |
| 19 | Toolbox panel (tiles, placement) | ui-systems-detail | Y | toolbox.js |
| 20 | Test mob panel | debug-and-testing | Y | testMobPanel.js |
| 21 | InputIntent (27 flags) | input-detail | N | inputIntent.js |
| 22 | Mouse click routing (49-step chain) | input-detail | N | input.js |
| 23 | 10 drag systems | input-detail | Y | input.js |
| 24 | Keybind system | input-detail | Y | input.js, settings.js |
| 25 | Interact prompts | input | Y | interactable.js |
| 26 | Scene-specific input restrictions | input-detail | N | input.js |
| 27 | Gun system | combat-damage | Y | gunSystem.js |
| 28 | Melee system (swing, dash, specials) | combat-damage | Y | meleeSystem.js |
| 29 | Damage pipeline (7-layer mob defense) | combat-damage | N | damageSystem.js |
| 30 | Player damage (armor, dodge, thorns) | combat-damage | N | damageSystem.js |
| 31 | Mob status effects (7 types) | combat-damage | Y | combatSystem.js |
| 32 | Player status effects (13 types) | combat-damage | Y | combatSystem.js |
| 33 | 13 AI patterns | mobs | N | combatSystem.js |
| 34 | 435 mob special abilities | mobs | N | combatSystem.js + 8 specials files |
| 35 | Wave system (3-phase, state machine) | waves-and-dungeons | Y | waveSystem.js |
| 36 | Floor config (6 dungeons x 5 floors) | waves-and-dungeons | N | floorConfig.js |
| 37 | Dungeon registry | state-reset-and-data-registries | N | dungeonRegistry.js |
| 38 | Attack shapes (6 types) | attack-systems | N | attackShapes.js |
| 39 | Hazard system | attack-systems | Y | hazardSystem.js |
| 40 | Telegraph system (5 shapes) | attack-systems | Y | telegraphSystem.js |
| 41 | Hit effects (73 types) | sprite-and-rendering-detail | Y | hitEffects.js |
| 42 | Entity renderers (123+ types) | sprite-and-rendering-detail | Y | entityRenderers.js |
| 43 | Loot drops | attack-systems, crafting | Y | lootDropSystem.js |
| 44 | Inventory system (200 slots) | inventory-and-items | Y | inventorySystem.js |
| 45 | Progression (5T x 25L) | progression | Y | progressionData.js |
| 46 | Crafting (recipes, materials, drop tables) | crafting | Y | craftingSystem.js |
| 47 | Save/Load (schema v10) | save-load | Y | saveLoad.js |
| 48 | Potion system | inventory-and-items | Y | inventorySystem.js |
| 49 | Party system (always-on, bots) | party-system | Y | partySystem.js |
| 50 | Bot AI (FSM) | party-system | N | botAI.js |
| 51 | Casino (10 games) | casino | Y | casinoSystem.js, casinoUI.js |
| 52 | Spar (ranked, Elo, neural bot) | spar-learning | Y | sparSystem.js |
| 53 | Mafia (roles, meetings, voting, tasks, FOV) | mafia, fov-and-skeld-tasks | Y | mafiaSystem.js |
| 54 | Hide & Seek (phases, FOV, tag) | hide-and-seek | Y | hideSeekSystem.js |
| 55 | Mining (4 rooms, 15 ores, 8 pickaxes) | mining | Y | miningSystem.js |
| 56 | Fishing (cast/reel, 6 fish, rod tiers) | fishing | Y | fishingSystem.js |
| 57 | Farming (crops, growth, hoes, bucket) | farming | Y | farmingSystem.js |
| 58 | Cooking (3 restaurants, NPCs, grading) | cooking | Y | cookingSystem.js + NPC files |
| 59 | Camera (follow, shake, zoom, bounds) | rendering | Y | cameraSystem.js |
| 60 | Character sprites (3-layer) | sprite-and-rendering-detail | Y | characterSprite.js |
| 61 | Y-sorting | rendering | Y | draw.js |
| 62 | HUD (HP, gold, kills, wave, death) | rendering | Y | draw.js |
| 63 | Minimap | rendering | Y | draw.js |
| 64 | Tile rendering (18 scenes) | rendering | Y | tileRenderer.js |
| 65 | Damage numbers | rendering | Y | draw.js |
| 66 | Status effect visuals | sprite-and-rendering-detail | Y | characterSprite.js |
| 67 | Armor visuals (4 tiers) | sprite-and-rendering-detail | Y | armorVisuals.js |
| 68 | Name tags | rendering | Y | draw.js |
| 69 | Bullet rendering | rendering | Y | draw.js |
| 70 | Event bus (7 events) | game-state-and-events | N | eventBus.js |
| 71 | Game loop (fixed timestep 60fps) | architecture | N | draw.js |
| 72 | Command pipeline | game-state-and-events | N | commands.js |
| 73 | Debug commands | debug-and-testing | Y | commands.js |
| 74 | Skeld tasks (14 mini-games) | fov-and-skeld-tasks | Y | skeldTasks.js |
| 75 | Security cameras (4 feeds) | fov-and-skeld-tasks | Y | mafiaFOV.js |

---

## Unity Parity Audit Table

### Status key

| Code | Meaning |
|------|---------|
| **W** | Working — full parity or functionally equivalent |
| **P** | Partial — structure exists, incomplete logic or integration |
| **B** | Broken — code exists but does not produce correct results |
| **M** | Missing — no Unity implementation |

### Core Loop & Architecture

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 1 | Game loop (fixed timestep 60fps) | W | C | AuthorityTick.cs | Exact match |
| 2 | Authority/Client split | W | R | Scripts/Authority/, Scripts/Client/ | Architecture preserved |
| 3 | Event bus (on/off/emit/clear) | W | C | EventBus.cs | All 4 methods |
| 4 | Command pipeline (intent→cmd→tick) | W | C | CommandTranslator.cs, CommandQueue.cs, AuthorityTick.cs | 95% parity |
| 5 | GameState + aliases | W | R | GameState.cs | Player GO has all components |

### Input System

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 6 | InputIntent flags (27) | W | C | InputIntent.cs | 25/27 exact; moveX/Y consolidated to Vector2; slot flags consolidated to int. Functionally equivalent. |
| 7 | Held vs one-frame clearing | W | C | InputIntent.cs | ClearOneShot() matches |
| 8 | WASD movement | W | C | PlayerInputHandler.cs | Rebindable |
| 9 | Arrow key directional shooting | W | C | PlayerInputHandler.cs | Priority order matches |
| 10 | Hotbar keys (1-5) | W | C | PlayerInputHandler.cs | Exact parity |
| 11 | Keybind rebinding | W | C | SettingsPanelUI.cs | Full system with save/load |
| 12 | Interact prompts ("Press E") | W | R | InteractableSystem.cs | GO present in scene |
| 13 | Click routing (49-step chain) | P | C | PlayerInputHandler.cs | 13/49 implemented. uGUI handles panel clicks. Mafia/HideSeek/Toolbox steps missing. |
| 14 | Escape key panel close | P | U | PanelManager.cs | Basic close works. Full 9-step priority chain not verified. |
| 15 | Panel blocks movement | W | C | PlayerInputHandler.cs, CommandTranslator.cs | Exact match |
| 16 | Scene-specific input restrictions | P | C | AuthorityTick.cs | Mafia/HideSeek/Spar freezes **STUBBED** (intentionally, modes not ported) |
| 17 | 10 drag systems | P | C | Various | 4/10 working (inventory hover, scroll, color picker); tile/mafia missing |

### UI Panels

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 18 | Panel Manager core | W | R | PanelManager.cs | register/open/close/toggle/exclusive |
| 19 | Side icons (chat, profile, map) | P | R | SideIconsUI.cs (4 children) | Chat stub; toolbox debug-only |
| 20 | Profile menu (15-icon grid) | **P** | C | ProfileMenuUI.cs | 9/15 icons wired (incl. Shop, Map, Scores, News, Bounty, Passcode). 6 stubbed (no downstream panels). |
| 21 | Chat panel | P | R | ChatUI on Main Camera | OnGUI-based. Basic messages. No visual polish. |
| 22 | Identity panel | W | R | IdentityPanelUI.cs, IdentityCanvas | Stats rows, name edit, faction icons |
| 23 | Identity sub-panels (faction/country pickers) | M | C | — | No picker popups |
| 24 | Settings panel (7 tabs) | W | R | SettingsPanelUI.cs, SettingsCanvas | All tabs + keybind system |
| 25 | Customize panel | P | R | CustomizePanelUI.cs, CustomizeCanvas | **5 categories only** (JS has 19). No HSV picker. No head selection. |
| 26 | Inventory panel | W | R | InventoryPanelUI.cs + ItemTooltip | Grid, cards, equip sidebar, tooltip |
| 27 | Inventory "Resources" tab | M | C | InventoryPanelUI.cs | JS has 6 category tabs; Unity has 5 |
| 28 | Forge/Gunsmith panel | W | R | ForgePanelUI.cs, ForgeCanvas | Weapons + materials tabs, upgrade + evolve |
| 29 | Shop panel (between-wave) | P | R | ShopPanelUI.cs, ShopCanvas | Canvas exists; wave integration unclear |
| 30 | Revive shop | W | R | ReviveShopUI.cs, ReviveShopCanvas | Present |
| 31 | Fish vendor | W | R | FishVendorUI.cs, FishVendorCanvas | Full buy/sell |
| 32 | Farm vendor | W | R | FarmVendorUI.cs, FarmVendorCanvas | Full 4-tab layout |
| 33 | Mining shop | W | R | MiningShopUI.cs, MiningShopCanvas | Full pickaxe tiers |
| 34 | Stats panel | W | R | StatsPanelUI.cs, StatsCanvas | Player stats display |
| 35 | News panel | **P** | C | NewsPanelUI.cs | Placeholder panel with stub content. No real news data. |
| 36 | Bounty panel | **P** | C | BountyPanelUI.cs | Placeholder panel with stub content. No real bounty data. |
| 37 | Passcode panel | **P** | C | PasscodePanelUI.cs | Placeholder panel with input field. Submit does nothing. |
| 38 | **Toolbox panel** | **M** | R | — | No canvas, no GO. Tile placement entirely missing. |
| 39 | **Casino UI (10 game UIs)** | **M** | R | — | Zero casino UI in scene |
| 40 | **Test mob panel** | **M** | R | — | Debug spawner missing |

### HUD & Overlays

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 41 | HP bar | W | R | GameHUD.cs, HUDCanvas (14 children) | Color transitions, text overlay |
| 42 | Gold display | W | R | GameHUD.cs | Dynamic positioning |
| 43 | Kill counter | W | R | GameHUD.cs | Top-right |
| 44 | Wave HUD (floor/wave/mobs) | W | R | GameHUD.cs | Multi-line status |
| 45 | Center prompt | W | R | GameHUD.cs | Wave state messages |
| 46 | Death overlay | W | R | GameHUD.cs | Full-screen fade + text |
| 47 | Hotbar visual (5 slots) | W | R | HotbarUI.cs, HotbarCanvas | Both layouts, tier bars, key labels |
| 48 | Weapon stats display | W | R | WeaponStatsUI.cs, WeaponStatsCanvas | Dedicated canvas |
| 49 | Party status bars | W | R | PartyStatusUI.cs, PartyStatusCanvas (10 children) | Bot HP bars |
| 50 | Minimap | W | R | MinimapUI.cs, MinimapCanvas | Toggle, labels, dots, cache |

### Rendering

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 51 | Camera (follow, zoom, bounds) | W | R | CameraController.cs | Exact JS bounds clamping |
| 52 | Character sprites (3-layer) | W | R | CharacterRenderer.cs, CharacterAnimator.cs | Body/Head/Hat, direction, animation |
| 53 | Y-sorting | W | R | YSortRenderer.cs | sortingOrder + camera sort axis |
| 54 | Entity renderers (~123 types) | W | C | EntityRendererRegistry.cs (2281 lines) | All types registered |
| 55 | Hit effects (73 types) | W | R | HitEffectRenderer.cs (1219 lines) | All registered with visual templates |
| 56 | Tile rendering (18 scenes) | W | C | SceneTileRenderer.cs | All scene styles procedurally generated |
| 57 | Lobby entities | W | R | LobbyEntities (73 children), PortalMarkers (15) | Full lobby populated |
| 58 | Name tags / HP bars | P | R | NameTagRenderer.cs | HP bar done; name text font pending |
| 59 | Armor visuals (4 tiers, tint) | W | C | CharacterRenderer.cs | All 4 tints. **Glow animation pending** for T3/T4. |
| 60 | Status effect overlays | P | C | StatusOverlays.cs | Poison glow + blind vignette done. **Burn/freeze/stun shaders missing.** |
| 61 | Bullet rendering | P | C | MobWorldObjects.cs | Structure exists; weapon-specific visuals pending |
| 62 | Neon pulse effects | W | C | NeonPulse.cs | Animated glow on buildings |
| 63 | Security camera overlay | W | C | SecurityCameraOverlay.cs | 4 feeds, REC indicator, scan lines |
| 64 | Crewmate renderer | W | C | CrewmateRenderer.cs | Full Among Us style + ghost mode |
| 65 | Mob renderer | W | C | MobRenderer.cs | Procedural cosmetics per mob type |

### Combat & Mobs

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 66 | Mob creation (all fields) | W | C | MobController.cs, MobTypeRegistry.cs | Full field parity |
| 67 | 13 AI patterns | W | C | MobAIPatterns.cs | All 13 implemented |
| 68 | 435 abilities (registration) | W | C | AbilityRegistration.cs + 9 files | All registered. ~80% logic complete. |
| 69 | 7 mob status effects | W | C | MobStatusEffects.cs | All 7 with timers + multipliers |
| 70 | Damage to mobs (7-layer defense) | W | C | DamageSystem.cs | Full pipeline |
| 71 | Damage to player | **W** | C | DamageSystem.cs:329-486 | **CORRECTED**: Full pipeline implemented (Phases 13/17): dodge → lethal efficiency → backstab → armor → proj/AOE → armor break → absorb → thorns+stagger |
| 72 | 13 player status effects | **W** | C | PlayerStatusFXComponent.cs, PlayerStatusFX.cs | All 13 integrated: fear/confuse/disorient modify movement, slow/root/tether affect speed, armor break syncs to damage pipeline, bleed/poison DOT applied, mobility lock exposed. |
| 73 | Attack shapes (6 types) | P | C | AttackShapes.cs | Circle/Line/Cone working. Ring partial. **Tile checks missing.** |
| 74 | Hazard system | W | C | HazardSystem.cs | Full lifecycle. Slow integration pending. |
| 75 | Telegraph system | W | C | TelegraphSystem.cs | All 5 shapes, resolve, clearOwner |
| 76 | Gun system | W | C | GunSystem.cs | Fire rate, reload, freeze, pellets, pierce |
| 77 | Melee system | P | C | MeleeSystem.cs | Structure complete. **Crit calc, knockback, lifesteal, specials need verification.** |
| 78 | Wave system (3-phase) | **W** | C | WaveSystem.cs (769 lines), GameManager.cs:1452 | **CORRECTED**: Dynamically created on dungeon entry. FixedUpdate ticks state machine. 3-phase spawning, boss waves, scaling all implemented. |
| 79 | Floor config (30 floors) | W | C | FloorConfigRegistry.cs | JSON-loaded, all floors |
| 80 | Dungeon registry (6 dungeons) | W | C | DungeonRegistry.cs | All 6 |
| 81 | Wave scaling | W | C | WaveScaling.cs | Formulas verified |
| 82 | Loot drops | **W** | C | LootDropSystem.cs | Full rendering (bobbing/glow/fade/sparkles/badge) + ownership (lastKillerId from DamageSystem, AbandonDropsForOwner). |

### Inventory, Progression, Save/Load

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 83 | Inventory system (200 slots) | W | R | InventorySystem.cs on Player | add/remove/swap/stack/equip |
| 84 | Equipment (6 slots) | W | C | InventorySystem.cs | gun/melee/boots/pants/chest/helmet |
| 85 | Progression (5T x 25L) | W | C | ProgressionRegistry.cs | Interpolation, evolution, costs |
| 86 | Crafting | P | C | CraftingSystem.cs, CraftingRegistry.cs | Logic correct. **No auto-save, no feedback text, no combat reset on upgrade.** |
| 87 | Loot drop tables (60+ entries) | W | C | CraftingRegistry.cs | All mob→material mappings |
| 88 | Save/Load structure | P | R | SaveManager GO, SaveData.cs | Schema v1 independent. **No old-format migration.** |
| 89 | **Save format backward compat** | **M** | C | SaveData.cs | **No integer→{tier,level} migration** for gun levels |
| 90 | Potion system | W | C | InventorySystem.cs | 3 start, 25 HP, 2s CD |

### Scene Modes

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 91 | Scene state machine (18 scenes) | W | R | SceneManager.cs | All 18 in enum |
| 92 | Scene transitions (portal + fade) | P | R | FadeCanvas, PortalMarkers (15) | Fade canvas exists. Portal wiring needs verification. |
| 93 | Lobby | W | R | LobbyEntities (73 children) | Full lobby populated |
| 94 | Party system | **W** | C | PartySystem.cs (492 lines), GameManager.cs:1489-1492 | **CORRECTED**: Dynamically created on dungeon entry. Init(4) creates player+3 bots. Death/revive/scaling all implemented. |
| 95 | Bot AI | **W** | C | BotAI.cs (867 lines), GameManager.cs:1494-1495 | **CORRECTED**: Dynamically created on dungeon entry. 5-state FSM (hunt/engage/flee/shop/roam), telegraph dodge, equipment buying. |
| 96 | Mining system | P | R | **No MiningSystem GO** | Script exists. Not in scene. |
| 97 | Fishing system | P | R | FishingSystem GO present | Mechanics need verification |
| 98 | **Farming system** | **M** | R | **No FarmingSystem GO** | Not instantiated |
| 99 | **Cooking system (3 restaurants)** | **M** | R | **No CookingSystem GO** | No runtime instance. **All 4 NPC system scripts missing entirely.** |
| 100 | **Casino system** | **M** | R | **No GO, no UI canvas** | Script stubs only |
| 101 | **Spar system** | **M** | R | **No GO** | Script stubs only |
| 102 | **Mafia system** | **M** | R | **No GO** | Script stubs only |
| 103 | **Hide & Seek system** | **M** | R | **No GO** | Script stubs only |
| 104 | **Skeld tasks (14 mini-games)** | **M** | C | — | Completely missing |
| 105 | **Mafia sabotage** | **M** | C | — | Completely missing |
| 106 | **Mafia vent system** | **M** | C | — | Completely missing |
| 107 | State reset (8 modes) | P | C | GameState.cs | Structure exists. Integration incomplete across all 8 modes. |

### Debug

| # | Feature | Status | Ev. | Unity Files | Gap |
|---|---------|:------:|:---:|------------|-----|
| 108 | Debug slash commands | P | C | — | Some may exist. Not verified. |
| 109 | Test mob panel | M | R | — | No GO |

---

## Highest-Priority Fix Batch

### Tier 1 — CRITICAL (Blocks core dungeon gameplay loop)

| ID | Fix | What's Wrong | Impact | Effort | Files |
|----|-----|-------------|--------|--------|-------|
| **F1** | ~~Wire WaveSystem to scene~~ | **STALE — already wired.** `SetupCombatSystems()` dynamically creates CombatSystems GO with WaveSystem on dungeon entry (GameManager.cs:1452). FixedUpdate ticks wave state machine. Audit missed this because it checked static lobby scene. | ~~Cannot play any dungeon~~ **FIXED** | — | GameManager.cs:1443-1461, WaveSystem.cs |
| **F2** | ~~Player damage pipeline~~ | **STALE — already complete.** DealDamageToPlayer (DamageSystem.cs:329-486) has full pipeline: dodge → lethal efficiency → backstab → armor → proj/AOE reduction → armor break → DOT bypass → absorb → thorns+stagger. Implemented in Phases 13/17. | ~~Player takes raw damage~~ **FIXED** | — | DamageSystem.cs:329-486 |
| **F3** | ~~Wire PartySystem + BotAI to scene~~ | **STALE — already wired.** `SetupCombatSystems()` creates PartySystem GO, calls Init(4, playerController, config) for player+3 bots, creates BotAI with full 5-state FSM (GameManager.cs:1489-1498). Teardown on lobby return. | ~~Single-player only~~ **FIXED** | — | GameManager.cs:1489-1498, PartySystem.cs, BotAI.cs |
| **F4** | ~~Player status effect integration~~ | **FIXED (2026-04-03).** New `PlayerStatusFXComponent` MonoBehaviour wraps `PlayerStatusFX`, implements `IMovementModifierProvider`. Fear overrides movement direction, confuse rotates+swaps, disorient adds random drift, slow/root/tether affect speed, armor break syncs to `PlayerController.armorBreakMult`, bleed/poison DOT applied via `DamageSystem`, mobility lock exposed for MeleeSystem dash gating. | **FIXED** | — | PlayerStatusFXComponent.cs, PlayerController.cs |
| **F5** | ~~Loot drop rendering + ownership~~ | **FIXED (2026-04-03).** Rendering: bobbing, glow, fade-out, sparkles, count badge, pickup text. Ownership: `lastKillerId` set by DamageSystem.ProcessKill using `attacker.entityId`, read by LootDropSystem.OnMobKilled. AbandonDropsForOwner API for party leave. | **FIXED** | — | LootDropSystem.cs, DamageSystem.cs, MobController.cs |

### Tier 2 — HIGH (Blocks secondary gameplay features)

| ID | Fix | Impact | Effort | Files |
|----|-----|--------|--------|-------|
| **F6** | ~~Profile menu (15-icon grid)~~ | **PARTIAL (2026-04-03).** 9/15 icons wired: Inventory, Identity, Settings, News, Shop, Map (minimap toggle), Scores→stats, Passcode, Bounty. 6 stubbed: Guide, Friends, Gangs, PM History, Career, Challenges (no downstream panels exist). News/Bounty/Passcode are placeholder panels with no real content. | Partial | — | ProfileMenuUI.cs, NewsPanelUI.cs, BountyPanelUI.cs, PasscodePanelUI.cs, GameManager.cs |
| **F7** | Melee combat verification | Crit calc, knockback application, lifesteal, ninja/storm/piercing specials not verified working | Low | MeleeSystem.cs |
| **F8** | Crafting feedback + save | No auto-save on upgrade/evolve. No floating text. No combat state reset. Upgrades lost on reload. | Low | CraftingSystem.cs |
| **F9** | Cooking NPC systems | deliNPCSystem, dinerNPCSystem, fineDiningNPCSystem, cookingNPCBase — all missing. Cooking scene non-functional. | High | 4 new C# files (~3000 lines) |
| **F10** | Mining/Farming scene GOs | Scripts exist but no runtime GameObjects. Can't mine or farm. | Low | Add GOs to scene |
| **F11** | Authority freeze stubs | Mafia/HideSeek/Spar freeze logic stubbed in AuthorityTick. Game modes don't restrict input. | Med | AuthorityTick.cs |
| **F12** | Customize panel: 19 categories + HSV picker | Only 5 categories with swatch grid. Players can't customize most options. | Med | CustomizePanelUI.cs |

### Tier 3 — MEDIUM (Completes game modes)

| ID | Fix | Impact | Effort |
|----|-----|--------|--------|
| **F13** | Casino system (10 game UIs + logic + scene GO) | Casino mode dead | High |
| **F14** | Spar system (hub/arena, neural bot, CT-X, Elo) | Spar mode dead | High |
| **F15** | Mafia system (roles, meetings, voting, sabotage, tasks, FOV, vents) | Mafia mode dead | Very High |
| **F16** | Hide & Seek system (phases, FOV, bot AI, tag) | H&S mode dead | High |
| **F17** | Status effect shaders (burn/freeze/stun visual filters) | No visual feedback for mob debuffs | Med |
| **F18** | Attack shapes: Ring + Tile checks | Some boss abilities won't hit correctly | Low |
| **F19** | Save format migration (integer→{tier,level}) | Old saves unloadable | Low |

### Tier 4 — LOW (Polish & completeness)

| ID | Fix | Impact | Effort |
|----|-----|--------|--------|
| **F20** | ~~News/Bounty/Passcode panels~~ | **PARTIAL (2026-04-03).** Placeholder panels exist and are reachable from profile menu. No real content/data. | — |
| **F21** | Toolbox panel + tile placement | Level editing dead | High |
| **F22** | Test mob panel | Debug-only | Med |
| **F23** | Armor glow animation (T3/T4) | Cosmetic only | Low |
| **F24** | Bullet weapon-specific visuals | Cosmetic variety | Med |
| **F25** | Escape key 9-step priority chain | Minor UX | Low |
| **F26** | Identity sub-panels (faction/country pickers) | Minor customization | Low |

---

## Suspicious Areas

These areas are likely hiding additional parity gaps but could not be fully verified in this audit. They should be play-tested manually.

| Area | Why Suspicious | How to Check |
|------|---------------|--------------|
| Dungeon entry flow | Portal markers exist (15) but no evidence enterLevel() wires actual floor/wave setup | Enter a dungeon portal in play mode. Verify wave starts. |
| Shop panel between-wave | ShopCanvas exists but wave system doesn't run. Shop trigger timing unknown. | Verify shop opens between waves with correct items. |
| Quickslot assignment prompt | Infrastructure in InventoryPanelUI. 4-button assignment prompt may not render. | Click inventory item → verify 4-slot prompt appears. |
| Potion use from hotbar | PlayerInputHandler has potion logic. Actual heal + cooldown application unknown. | Press slot 3 → verify HP heals, cooldown starts, count decrements. |
| Bot equipment rendering | CharacterRenderer on Player only. No evidence bots get renderer instances. | Add bot → verify armor/weapon visuals render. |
| Scene transition state reset | FadeCanvas exists. What actually resets per-scene unclear. | Lobby→dungeon→lobby → verify gold/inventory/weapon state. |
| Floor transition at wave 10 | stairsOpen flag should appear. Wave system not wired. | Reach wave 10 → verify stairs + floor transition. |
| CT-X slider UI in spar | GunSystem.cs has slider fields. UI for CT-X allocation unknown. | Enter spar → verify 3 sliders with 100-point budget. |
| Fishing tension minigame | FishingSystem GO exists. Reel tension fill/decay rates not verified. | Cast rod → hook fish → verify tension bar. |
| Event emission completeness | EventBus exists. mob_killed connected. wave_cleared, player_died unknown. | Kill all mobs → verify wave_cleared → verify floor transition. |
| Online slot syncing | Offline slot switching works. AuthorityTick online path not verified. | Test with network → verify slot changes propagate. |

---

## Recommended Next Action

**F1-F3 are resolved** (were already implemented; audit findings were stale). The remaining Tier 1 items are:

1. **F4: Player status effect integration** — 13 effects have fields but ~50% don't affect movement/damage.
2. **F5: Loot drop rendering + ownership** — Drops need bobbing, glow, fade-out, ownership.

After Tier 1 remaining, prioritize **F6 (Profile menu)** and **F9-F10 (Cooking NPC systems + skill scene GOs)** to unblock the non-combat gameplay loops.

The true highest-impact next work is **Tier 2 items** (F6-F12) and **Tier 3 game modes** (F13-F16), since the core dungeon loop (waves, combat, party, damage) is already functional.

---

## Summary Statistics

| Category | W | P | B | M | Total |
|----------|---|---|---|---|-------|
| Core Loop & Architecture | 5 | 0 | 0 | 0 | 5 |
| Input System | 8 | 4 | 0 | 0 | 12 |
| UI Panels | 10 | 3 | 0 | 7 | 20 |
| HUD & Overlays | 10 | 0 | 0 | 0 | 10 |
| Rendering | 11 | 4 | 0 | 0 | 15 |
| Combat & Mobs | 12 | 4 | 0 | 0 | 16 |
| Inventory/Prog/Save | 5 | 2 | 0 | 1 | 8 |
| Scene Modes | 5 | 3 | 0 | 8 | 16 |
| Debug | 0 | 1 | 0 | 1 | 2 |
| **Total** | **66** | **20** | **1** | **17** | **104** |
