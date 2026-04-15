# Phase 6: UI Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port all JS Canvas UI panels to Unity C# OnGUI, matching existing panel patterns (InventoryPanelUI, ShopPanelUI, CombatHUD).

**Architecture:** Each JS draw function becomes a C# MonoBehaviour with OnGUI(). PanelManager singleton gates open/close state. All values read directly from JS source with `js/file.js:line` citations. SaveLoad uses PlayerPrefs (JSON serialized) matching JS localStorage schema v10.

**Tech Stack:** Unity 6 C#, OnGUI (matching existing panels), PlayerPrefs for persistence.

**Existing Unity UI code (DO NOT rewrite — extend):**
- `ChatSystem.cs` (331L) — Canvas-based chat
- `InventoryPanelUI.cs` (353L) — OnGUI inventory
- `ShopPanelUI.cs` (414L) — OnGUI shop vendor
- `CombatHUD.cs` (573L) — OnGUI HUD
- `PartyHUD.cs` (269L) — OnGUI party status

---

## File Structure

### Infrastructure (sequential — Tasks 1-3)
| C# File | JS Source | Purpose |
|---------|-----------|---------|
| `Assets/Scripts/UI/PanelManager.cs` | `js/client/ui/panelManager.js` (1166L) | Singleton open/close/toggle, keyboard dispatch |
| `Assets/Scripts/UI/ShopFramework.cs` | `js/client/ui/shopFramework.js` (279L) | Reusable panel/tab/grid OnGUI helpers |
| `Assets/Scripts/UI/SaveLoadSystem.cs` | `js/core/saveLoad.js` (668L) | PlayerPrefs persistence, schema v10 |

### Panels (parallelizable — Tasks 4-15)
| C# File | JS Source | Lines | Purpose |
|---------|-----------|-------|---------|
| `Assets/Scripts/UI/SettingsPanelUI.cs` | `js/core/saveLoad.js:438-667` + `js/client/ui/settings.js` (104L) | 7-tab settings |
| `Assets/Scripts/UI/IdentityPanelUI.cs` | `js/client/ui/panels.js:6-693` | Name/status/faction editor |
| `Assets/Scripts/UI/StatsPanelUI.cs` | `js/client/ui/panels.js:694-978` | Skill XP, progression |
| `Assets/Scripts/UI/GunsmithPanelUI.cs` | `js/client/ui/panels.js:979-1581` | Weapon stats + purchase |
| `Assets/Scripts/UI/MiningShopPanelUI.cs` | `js/client/ui/panels.js:1582-2066` | Ore/pickaxe shop |
| `Assets/Scripts/UI/CustomizePanelUI.cs` | `js/client/ui/customize.js` (992L) | 19-color character customization |
| `Assets/Scripts/UI/ForgePanelUI.cs` | `js/client/ui/forgeUI.js` (693L) | Weapon crafting |
| `Assets/Scripts/UI/MinimapUI.cs` | `js/core/draw.js:10-184` | Fullscreen minimap overlay |
| `Assets/Scripts/UI/ChatProfileUI.cs` | `js/client/ui/chatProfile.js` (108L) | Top-left icon buttons |
| `Assets/Scripts/UI/TestMobPanelUI.cs` | `js/client/ui/testMobPanel.js` (1389L) | Debug mob spawner |
| `Assets/Scripts/UI/CasinoPanelUI.cs` | `js/client/ui/casinoUI.js` (2339L) | 10 casino games |
| `Assets/Scripts/UI/ToolboxUI.cs` | `js/client/ui/toolbox.js` (1472L) | Tile placement editor |

### Task 16: Integration + wiring

---

## Task Details

### Task 1: PanelManager Singleton
**Files:**
- Create: `Assets/Scripts/UI/PanelManager.cs`
- Read: `js/client/ui/panelManager.js:1-50` (API), `:48-88` (registered panels), `:991-1080` (keyboard)

Port the `UI` singleton:
- [ ] Read panelManager.js lines 1-100 for API surface
- [ ] Create PanelManager.cs with Register/Open/Close/Toggle/IsOpen/AnyOpen
- [ ] Port keyboard input dispatch (m=minimap, escape=close, etc.)
- [ ] Port panel registry with onOpen/onClose hooks
- [ ] Test: open/close/toggle cycle in Play mode
- [ ] Commit

Key API:
```csharp
public class PanelManager : MonoBehaviour {
    public static PanelManager Instance;
    string _active;
    Dictionary<string, PanelEntry> _panels;
    void Register(string id, Action onOpen = null, Action onClose = null);
    void Open(string id);
    void Close(string id = null);
    void Toggle(string id);
    bool IsOpen(string id);
    bool AnyOpen();
}
```

### Task 2: ShopFramework Helpers
**Files:**
- Create: `Assets/Scripts/UI/ShopFramework.cs`
- Read: `js/client/ui/shopFramework.js` (all 279 lines)

Port reusable OnGUI shop drawing helpers:
- [ ] Read shopFramework.js entirely
- [ ] Create static ShopFramework class with DrawPanel, DrawHeader, DrawTabs, DrawItemRow, DrawItemGrid, Buy
- [ ] Match exact colors: bg `rgba(12,16,24,0.95)`, border `rgba(100,200,160,0.35)`, etc.
- [ ] Commit

### Task 3: SaveLoadSystem
**Files:**
- Create: `Assets/Scripts/UI/SaveLoadSystem.cs`
- Read: `js/core/saveLoad.js` (all 668 lines), `js/client/ui/settings.js:13-103` (defaults)

Port save/load with PlayerPrefs:
- [ ] Read saveLoad.js save() and load() functions
- [ ] Create SaveLoadSystem with Save/Load/Clear/AutoSave
- [ ] Port schema v10 fields: keybinds, settings, identity, cosmetics, progression, fishing, farming, cooking, spar, quickSlots, materials
- [ ] Port gameSettings defaults (28 settings from settings.js:65-103)
- [ ] Port keybind defaults (settings.js:13-18)
- [ ] Port cosmetic keys list (saveLoad.js:20-22)
- [ ] Commit

### Task 4: SettingsPanelUI
**Files:**
- Create: `Assets/Scripts/UI/SettingsPanelUI.cs`
- Read: `js/core/saveLoad.js:438-667` (drawSettingsPanel), `js/client/ui/settings.js` (104L)

- [ ] Read drawSettingsPanel in saveLoad.js
- [ ] Create SettingsPanelUI with OnGUI
- [ ] Port 7 tabs: General, Keybinds, Sounds, Indicators, Profile, Message, Privacy
- [ ] Port toggle switches (44x22, knob circle), select buttons (130x24), keybind rebinding
- [ ] Panel: 520x480, bg rgba(8,8,14,0.92), border #2a6a4a
- [ ] Commit

### Task 5: IdentityPanelUI
**Files:**
- Create: `Assets/Scripts/UI/IdentityPanelUI.cs`
- Read: `js/client/ui/panels.js:6-693` (drawIdentityPanel)

- [ ] Read drawIdentityPanel
- [ ] Create IdentityPanelUI with OnGUI
- [ ] Port name/status/faction/country/gender/language/relationship editors
- [ ] Port character preview display
- [ ] Commit

### Task 6: StatsPanelUI
**Files:**
- Create: `Assets/Scripts/UI/StatsPanelUI.cs`
- Read: `js/client/ui/panels.js:694-978` (drawStatsPanel)

- [ ] Read drawStatsPanel
- [ ] Create StatsPanelUI with OnGUI
- [ ] Port skill XP bars, tier display, level progression
- [ ] Commit

### Task 7: GunsmithPanelUI
**Files:**
- Create: `Assets/Scripts/UI/GunsmithPanelUI.cs`
- Read: `js/client/ui/panels.js:979-1581` (drawGunsmithPanel, handleGunsmithClick)

- [ ] Read drawGunsmithPanel and click handler
- [ ] Create GunsmithPanelUI with OnGUI
- [ ] Port weapon grid, detail view, purchase flow
- [ ] Port gun progression helpers (_getGunProgress, _setGunProgress)
- [ ] Commit

### Task 8: MiningShopPanelUI
**Files:**
- Create: `Assets/Scripts/UI/MiningShopPanelUI.cs`
- Read: `js/client/ui/panels.js:1582-2066` (drawMiningShopPanel, handleMiningShopClick)

- [ ] Read drawMiningShopPanel and click handler
- [ ] Create MiningShopPanelUI with OnGUI
- [ ] Port pickaxe grid, ore display, material costs, purchase flow
- [ ] Port pickaxe progression helpers (_getPickaxeProgress, etc.)
- [ ] Commit

### Task 9: CustomizePanelUI
**Files:**
- Create: `Assets/Scripts/UI/CustomizePanelUI.cs`
- Read: `js/client/ui/customize.js` (all 992 lines)

- [ ] Read customize.js entirely
- [ ] Create CustomizePanelUI with OnGUI
- [ ] Port 19-color category picker, HSV color wheel, hex input
- [ ] Port head/hat selection grid
- [ ] Port character preview with live updates
- [ ] Commit

### Task 10: ForgePanelUI
**Files:**
- Create: `Assets/Scripts/UI/ForgePanelUI.cs`
- Read: `js/client/ui/forgeUI.js` (all 693 lines)

- [ ] Read forgeUI.js entirely
- [ ] Create ForgePanelUI with OnGUI
- [ ] Port weapon grid, detail view, upgrade section, evolve section, material grid
- [ ] Port forge click + scroll handlers
- [ ] Commit

### Task 11: MinimapUI
**Files:**
- Create: `Assets/Scripts/UI/MinimapUI.cs`
- Read: `js/core/draw.js:10-184` (drawMinimap)

- [ ] Read drawMinimap function
- [ ] Create MinimapUI with OnGUI
- [ ] Port room labels registry (MINIMAP_LABELS.skeld_01, 14 rooms)
- [ ] Port scale calculation, floor/wall tile rendering, room outlines
- [ ] Port player pulse indicator, task/sabotage dots
- [ ] Toggle with 'm' key via PanelManager
- [ ] Commit

### Task 12: ChatProfileUI (icon buttons)
**Files:**
- Create: `Assets/Scripts/UI/ChatProfileUI.cs`
- Read: `js/client/ui/chatProfile.js` (all 108 lines)

- [ ] Read chatProfile.js
- [ ] Create ChatProfileUI with OnGUI
- [ ] Port 3 icon buttons: Chat (y=12), Profile (y=68), Map (y=124)
- [ ] ICON_SIZE=48, ICON_GAP=8, ICON_RADIUS=10
- [ ] Active bg rgba(60,60,70,0.85), inactive rgba(20,20,28,0.8)
- [ ] Commit

### Task 13: TestMobPanelUI
**Files:**
- Create: `Assets/Scripts/UI/TestMobPanelUI.cs`
- Read: `js/client/ui/testMobPanel.js` (all 1389 lines)

- [ ] Read testMobPanel.js
- [ ] Create TestMobPanelUI with OnGUI
- [ ] Port mob card grid with all dungeon categories
- [ ] Port spawn/click/scroll/right-click handlers
- [ ] Port test shoot bot helpers
- [ ] Commit

### Task 14: CasinoPanelUI (10 games)
**Files:**
- Create: `Assets/Scripts/UI/Casino/CasinoPanelUI.cs` (main panel + game dispatch)
- Create: `Assets/Scripts/UI/Casino/CasinoGames_A.cs` (Blackjack, Roulette, HeadsOrTails, Cases, Mines)
- Create: `Assets/Scripts/UI/Casino/CasinoGames_B.cs` (Dice, RPS, Baccarat, Slots, Keno)
- Read: `js/client/ui/casinoUI.js` (all 2339 lines)

Split into 3 files (same pattern as Phase 5 abilities):
- [ ] Read casinoUI.js — panel frame, bet controls, card/die rendering
- [ ] Create CasinoPanelUI with game selection, bet flow, result display
- [ ] Create CasinoGames_A with 5 games: Blackjack, Roulette, HeadsOrTails, Cases, Mines
- [ ] Create CasinoGames_B with 5 games: Dice, RPS, Baccarat, Slots, Keno
- [ ] Port exact 5% house edge math from casinoData.js
- [ ] Commit

### Task 15: ToolboxUI
**Files:**
- Create: `Assets/Scripts/UI/ToolboxUI.cs`
- Read: `js/client/ui/toolbox.js` (all 1472 lines)

- [ ] Read toolbox.js
- [ ] Create ToolboxUI with OnGUI
- [ ] Port category tabs (Ground, Stone, Paths, Flooring, Water, Walls, etc.)
- [ ] Port mini-renderers (person, animal, gun, melee, armor, potion, food, gem, scroll, key)
- [ ] Port tile placement preview + place logic
- [ ] Commit

### Task 16: Integration + Scene Wiring
**Files:**
- Modify: `Assets/Scripts/UI/PanelManager.cs` — register all panels
- Modify: `Assets/Scripts/GameBootstrap.cs` (or equivalent) — add UI singletons
- Modify: `js/shared/gameConfig.js` — bump GAME_UPDATE

- [ ] Wire all panel MonoBehaviours to a UI GameObject in scene
- [ ] Register all panels with PanelManager in Awake
- [ ] Verify keyboard shortcuts work (tab=chat, h=profile, z=identity, m=minimap, etc.)
- [ ] Bump GAME_UPDATE
- [ ] Commit + push

---

## Execution Strategy

**Sequential (Tasks 1-3):** PanelManager → ShopFramework → SaveLoad (each depends on the previous)

**Parallel (Tasks 4-15):** All 12 panels can be implemented in parallel after infrastructure. Each reads its JS source directly and creates an independent C# file.

**Integration (Task 16):** After all panels complete, wire everything together.

## Notes
- All panels use OnGUI (matching existing InventoryPanelUI, ShopPanelUI, CombatHUD patterns)
- Screen coordinates: BASE_W=1920, BASE_H=1080 with GUI.matrix scaling
- Every numeric value must cite `js/file.js:line`
- Entity-agnostic design: use PartySystem/CombatState, not hardcoded player refs
- Casino split into 3 files to avoid 32K token limit per agent
