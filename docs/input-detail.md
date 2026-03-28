# Input System — Detailed Reference

This document covers the two core input files: `inputIntent.js` (the intent data structure) and `input.js` (mouse/click routing), plus the keyboard handler in `panelManager.js` and the command pipeline in `commands.js` / `authorityTick.js`.

---

## InputIntent (js/client/input/inputIntent.js)

### Purpose

`InputIntent` is a global object (`window.InputIntent`) that acts as a one-frame message bus between the client input layer and the authority simulation. The client writes intents each frame; the authority reads and applies them. This decouples "what the player wants to do" from "what actually happens."

### Complete Object Structure

```js
window.InputIntent = {
  // ---- Chat state (held) ----
  chatActive: false,       // true while chat input is focused (blocks gameplay intents)

  // ---- Movement (held) ----
  moveX: 0,               // -1 = left, 0 = none, 1 = right
  moveY: 0,               // -1 = up, 0 = none, 1 = down

  // ---- Mouse (continuous) ----
  mouseX: 0,              // screen-space mouse X (scaled to BASE_W)
  mouseY: 0,              // screen-space mouse Y (scaled to BASE_H)
  mouseDown: false,        // left mouse button held
  // NOTE: mouseWorldX and mouseWorldY are NOT defined here.
  // They are dynamically added by input.js on mousemove/mousedown:
  //   InputIntent.mouseWorldX = mouse.x / WORLD_ZOOM + camera.x;
  //   InputIntent.mouseWorldY = mouse.y / WORLD_ZOOM + camera.y;

  // ---- Shooting (held + pressed) ----
  shootHeld: false,        // mouse or arrow keys held (continuous fire)
  shootPressed: false,     // ONE-FRAME: just started shooting
  arrowAimDir: 0,         // 0=down, 1=up, 2=left, 3=right (arrow-key aim direction)
  arrowShooting: false,    // arrow keys are actively aiming

  // ---- Melee (pressed) ----
  meleePressed: false,     // ONE-FRAME: F key pressed

  // ---- Reload (pressed) ----
  reloadPressed: false,    // ONE-FRAME: R key pressed

  // ---- Dash (pressed) ----
  dashPressed: false,      // ONE-FRAME: Shift key pressed (ninja dash)

  // ---- Interact (pressed) ----
  interactPressed: false,  // ONE-FRAME: E key pressed (keybind: interact)

  // ---- Hotbar (pressed) ----
  slot1Pressed: false,     // ONE-FRAME: keybind slot 1 (default: "1")
  slot2Pressed: false,     // ONE-FRAME: keybind slot 2 (default: "2")
  slot3Pressed: false,     // ONE-FRAME: keybind slot 3 (default: "3")
  slot4Pressed: false,     // ONE-FRAME: extra item slot (default: "4")
  slot5Pressed: false,     // ONE-FRAME: grab slot (default: "5")

  // ---- Potion (pressed) ----
  potionPressed: false,    // ONE-FRAME: potion use

  // ---- Ultimate (pressed) ----
  ultimatePressed: false,  // ONE-FRAME: F key for shrine/godspeed

  // ---- Wave skip (pressed) ----
  skipWavePressed: false,  // ONE-FRAME: N key (requires _opMode)
  readyWavePressed: false, // ONE-FRAME: G key skip countdown (requires Scene.inDungeon)

  // ---- Fishing reel (pressed + held) ----
  reelPressed: false,      // ONE-FRAME: Space pressed during bite/reel
  reelHeld: false,         // HELD: Space held during reel phase
};
```

### Held Flags vs One-Frame Pressed Flags

**Held flags** persist as long as the key/button is held. They are NOT cleared by `clearOneFrameIntents()`:

| Flag | Type | Source |
|------|------|--------|
| `chatActive` | boolean | Set when chat UI is open |
| `moveX` | -1/0/1 | Computed from keysDown each frame |
| `moveY` | -1/0/1 | Computed from keysDown each frame |
| `mouseX` | float | Updated on mousemove |
| `mouseY` | float | Updated on mousemove |
| `mouseWorldX` | float | Dynamically added by `input.js` on mousemove/mousedown (not in initial object) |
| `mouseWorldY` | float | Dynamically added by `input.js` on mousemove/mousedown (not in initial object) |
| `mouseDown` | boolean | Set on mousedown, cleared on mouseup |
| `shootHeld` | boolean | Mouse held OR arrow keys held |
| `arrowAimDir` | 0-3 | Updated on arrow key press |
| `arrowShooting` | boolean | True while arrow shoot keys are held |
| `reelHeld` | boolean | Space held during fishing reel phase |

**One-frame pressed flags** are true for exactly ONE frame, then cleared by `clearOneFrameIntents()`:

| Flag | Trigger |
|------|---------|
| `shootPressed` | Mouse click or arrow key press (first frame) |
| `meleePressed` | F key |
| `reloadPressed` | R key (only if gun is not reloading and ammo < magSize) |
| `dashPressed` | Shift key |
| `interactPressed` | E key (keybind: interact) |
| `slot1Pressed` | Keybind slot1 (default: "1") or hotbar click slot 0 |
| `slot2Pressed` | Keybind slot2 (default: "2") or hotbar click slot 1 |
| `slot3Pressed` | Keybind slot3 (default: "3") or hotbar click slot 2 |
| `slot4Pressed` | Keybind slot4 (default: "4") or hotbar click slot 3 |
| `slot5Pressed` | Keybind slot5 (default: "5") or hotbar click slot 4 |
| `potionPressed` | Potion-type item in slot, triggered via slot key or click |
| `ultimatePressed` | F key (shared with meleePressed) |
| `skipWavePressed` | N key (only in OP mode) |
| `readyWavePressed` | G key (only in dungeon) |
| `reelPressed` | Space key (one frame, during fishing) |

### Reset Behavior

`clearOneFrameIntents()` is called once per frame AFTER the authority has consumed intents. It resets all 15 one-frame flags to `false`. It does NOT reset held/continuous flags (`moveX`, `moveY`, `mouseDown`, `shootHeld`, `arrowShooting`, `arrowAimDir`, `reelHeld`, `chatActive`, mouse positions).

### How InputIntent Bridges Client to Authority

The data flow per frame is:

1. **Client input handlers** (mouse/keyboard events) set raw `InputIntent` flags and `keysDown` state.
2. **`translateIntentsToCommands()`** (in `commands.js`) reads `InputIntent` + `keysDown` and produces serializable `Command` objects into `CommandQueue`. It also computes `moveX`/`moveY` from `keysDown` and WASD keybinds.
3. **`authorityTick()`** (in `authorityTick.js`) copies and clears `CommandQueue`, then applies each command back to `InputIntent` flags.
4. **Authority freezes** are applied after commands: Mafia meetings, Hide & Seek freeze, Spar countdown/post-match, and scene-specific weapon restrictions all zero out relevant intents.
5. **`update()`** reads `InputIntent` to drive player movement, shooting, melee, etc.
6. **`clearOneFrameIntents()`** resets pressed flags for the next frame.

**Command types** (network-ready JSON format `{ t: string, ts: number, data: object }`):

| Type | Data | Maps To |
|------|------|---------|
| `move` | `{ x: -1/0/1, y: -1/0/1 }` | `moveX`, `moveY` |
| `shoot` | `{ held: bool, aim: { mouseX, mouseY, arrowAimDir, arrowShooting } }` | `shootHeld`, aim data |
| `reload` | `{}` | `reloadPressed` |
| `melee` | `{}` | `meleePressed` |
| `dash` | `{}` | `dashPressed` |
| `interact` | `{}` | `interactPressed` |
| `ultimate` | `{}` | `ultimatePressed` |
| `skipWave` | `{}` | `skipWavePressed` |
| `readyWave` | `{}` | `readyWavePressed` |
| `slot` | `{ slot: 0/1/2 }` | `slot1Pressed`/`slot2Pressed`/`slot3Pressed` |
| `usePotion` | `{}` | `potionPressed` |
| `grab` | `{}` | `slot5Pressed` |
| `useExtra` | `{}` | `slot4Pressed` |
| `fish_reel` | `{ held: bool }` | `reelPressed`, `reelHeld` |

### Authority Freeze Conditions

After commands are applied, `authorityTick()` zeroes out intents in these situations:

- **Mafia frozen** (`MafiaSystem.isPlayerFrozen()`): zeros movement + all combat intents
- **Mafia lobby panel open** (`isMafiaLobbyPanelOpen()`): zeros movement + interact
- **Hide & Seek frozen** (`HideSeekSystem.isPlayerFrozen()`): zeros movement + all combat intents
- **Spar frozen** (`SparSystem.isPlayerFrozen()`): zeros movement + all combat + potion intents
- **Spar fighting**: forces `activeSlot = 0` (gun only), blocks melee/dash/potion/ultimate
- **Hide & Seek active**: forces `activeSlot = 1` (melee only); hiders have melee blocked too
- **Spar training mode**: replaces all intents with scripted archetype movement/shooting

---

## Keybind System (js/client/ui/settings.js)

### Default Keybinds

```js
const DEFAULT_KEYBINDS = {
  moveUp: "w",
  moveDown: "s",
  moveLeft: "a",
  moveRight: "d",
  shootUp: "arrowup",
  shootDown: "arrowdown",
  shootLeft: "arrowleft",
  shootRight: "arrowright",
  slot1: "1",
  slot2: "2",
  slot3: "3",
  slot4: "4",
  slot5: "5",
  chat: "tab",
  profile: "h",
  interact: "e",
  identity: "z",
};
```

All keybinds are remappable via the Settings panel Keybinds tab. The rebinding system captures the next key press and assigns it, with automatic key-swap if the new key was already bound elsewhere. Keys are stored lowercase via `e.key.toLowerCase()`.

### Keybind UI Items

The KEYBIND_ITEMS array defines the order and grouping in the settings panel:

- **MOVEMENT**: Move Up, Move Down, Move Left, Move Right
- **SHOOTING**: Shoot Up, Shoot Down, Shoot Left, Shoot Right
- **HOTBAR**: Slot 1 (Gun), Slot 2 (Melee), Slot 3 (Potion), Slot 4 (Item), Slot 5 (Grab)
- **PANELS**: Chat, Profile, Interact / Inventory, Identity

### Hard-coded Keys (Not Rebindable)

| Key | Action | Condition |
|-----|--------|-----------|
| `F` | Melee attack + Ultimate | Always (when not typing) |
| `R` | Reload | Only if gun not reloading and ammo < magSize |
| `Shift` | Ninja dash | When not typing |
| `Space` | Fishing reel | Only during active fishing |
| `N` | Skip wave | Only in OP mode |
| `G` | Ready wave (skip countdown) | Only in dungeon |
| `M` | Toggle minimap | When not typing |
| `P` | Toggle grid coordinate overlay | When not typing |
| `R` | Toggle remove mode | Only when placement tool is active |
| `Escape` | Close panel / deselect tool | Context-dependent |
| `Q` | Mafia kill | Only in Skeld scene |
| `R` | Mafia report | Only in Skeld scene |
| `T` | Mafia track ability | Only Tracker role in Skeld |
| `F` | Mafia shapeshift/vanish | Only Shapeshifter/Phantom in Skeld |
| `V` | Mafia vitals | Only Scientist role in Skeld |
| `X` | Close security cameras | Only when cameras active |
| `1-9` | Farm seed selection | Only in farm scene |

---

## Input Handler (js/client/input/input.js)

### applyCosmetic() Function

```js
function applyCosmetic(key, value) {
  player[key] = value;
}
```

Sets a cosmetic property directly on the player object. Does NOT trigger autoSave -- the customize panel has explicit Save/Cancel buttons. In multiplayer this would emit a cosmetic-change event to the server. Used for color/visual changes from the customization panel (body color, head color, etc.) and for head selection.

### Mouse State

```js
const mouse = { x: BASE_W / 2, y: BASE_H / 2, down: false };
```

Local mouse tracking object. Coordinates are scaled to virtual screen space: `(e.clientX - rect.left) / scale`.

### mousemove Handler

Updates on every mouse movement:

1. **Screen-space position**: `mouse.x`, `mouse.y` (scaled to virtual coordinates)
2. **InputIntent continuous**: `mouseX`, `mouseY`, `mouseWorldX`, `mouseWorldY`
   - World coords: `mouse.x / WORLD_ZOOM + camera.x` (and Y equivalent)
3. **Drag systems** (processed in order):
   - **CT-X gun modification slider**: `handleModifyGunDrag(mouse.x)`
   - **Tile painting drag**: if `isDraggingTile && activePlaceTool`, calls `placeTileAt(worldX, worldY)`
   - **Inventory hover**: `handleInventoryHover(mouse.x, mouse.y)`
   - **Mafia lobby settings scrollbar drag**: computes scroll position from mouse Y
   - **Settings scrollbar drag**: computes scroll position from mouse Y relative to panel
   - **Customization SV picker / Hue bar drag**: updates `pickerSat`/`pickerVal` or `pickerHue`, calls `applyCosmetic()`

### mousedown Handler — Click Routing Logic

The mousedown handler is the main click dispatcher. It processes clicks top-to-bottom with early returns. **Order matters** -- the first matching handler consumes the click. The full priority chain:

1. **Security camera close button** (`CameraSystem.handleClick`)
2. **Hide & Seek role select buttons** (hider/seeker during `role_select` phase)
3. **Hide & Seek "Show Bot" toggle button**
4. **Hide & Seek post-match return button**
5. **Mafia lobby panel clicks** (settings close, tab buttons, scrollbar drag, map selection, settings +/- buttons, color picker close, color selection, then block other clicks if panel is open)
6. **Mafia kill button** (Q button on screen)
7. **Sabotage fix panel clicks** (close button, reactor hand hold, O2 keypad buttons, lights toggle switches; consumes all clicks while panel is open)
8. **Mafia sabotage menu option clicks** (reactor/O2/lights; click outside closes menu)
9. **Mafia sabotage toggle button**
10. **Mafia emergency popup** (confirm button or click-outside-to-cancel)
11. **Mafia report button**
12. **Shapeshifter target selection panel**
13. **Mafia role-specific buttons**: Track (Tracker), Vitals (Scientist), Shift (Shapeshifter), Vanish (Phantom)
14. **Meeting chat toggle button**
15. **Meeting chat input box click**
16. **Mafia vote confirm/cancel buttons**
17. **Mafia vote portrait clicks** (sets confirm target)
18. **Mafia skip vote confirm/cancel/button**
19. **Block all clicks during Mafia meeting/voting/vote_results/ejecting phases**
20. **Mafia settings gear icon** (in-game settings, not lobby)
21. **Mafia in-game settings panel buttons** (Leave, Sounds, General)
22. **Close mafia settings if clicking outside**
23. **Vent arrow buttons** (Among Us-style vent navigation)
24. **Hotbar slot clicks** (5 slots, left-click only):
    - Slot 0 -> `slot1Pressed`, Slot 1 -> `slot2Pressed`, Slot 2 -> `slot3Pressed` (+ `potionPressed` if no quickSlot), Slot 3 -> `slot4Pressed`, Slot 4 -> `slot5Pressed`
    - Also starts weapon stats hold timer (`hotbarHoldSlot`, `hotbarHoldTime`)
    - Hotbar position is configurable: bottom (horizontal) or right side (vertical)
    - Blocked in Mafia lobby
25. **Toolbox icon** (top-right corner, blocked in Skeld)
26. **Selected items toolbar** (quick-access slots left of toolbox icon)
27. **Tile placement on map** (left click with active tool, not on UI)
28. **Toolbox panel** (close button, category tabs, item slot toggle-selection)
29. **Chat icon** (top-left, first icon)
30. **Profile icon** (top-left, second icon, blocked in Skeld)
31. **Settings panel** (scrollbar drag, close, tabs, keybind clicks, toggle/select items)
32. **Profile panel** (close, stats footer button, grid icon clicks for settings/inventory/identity)
33. **Stats panel** (close, category tabs, consume clicks)
34. **Identity panel** (faction popup, country popup, language popup, relationship popup, close, name edit, bottom buttons: Stats/Status/Edit, stat row clicks for faction/country/language/gender/relationship, "View All" inventory link)
35. **Customization screen** (cancel/save buttons, sidebar category clicks with scroll, head selection grid, hex input, apply button, SV picker drag, hue bar drag, color palette presets)
36. **Click on self** (opens identity panel if within 40px world distance, blocked in Skeld/Mafia Lobby)
37. **CT-X gun modification panel clicks** (`handleModifyGunClick`)
38. **Test mob panel clicks** (`handleTestMobClick`)
39. **Inventory panel clicks** (left-click only, `handleInventoryClick`)
40. **Fish vendor panel clicks** (`handleFishVendorClick`)
41. **Farm vendor panel clicks** (`handleFarmVendorClick`)
42. **Forge panel clicks** (`handleForgeClick`)
43. **Gunsmith panel clicks** (`handleGunsmithClick`)
44. **Casino panel clicks** (`handleCasinoClick`)
45. **Mining shop panel clicks** (`handleMiningShopClick`)
46. **Revive shop clicks** (party mode, wave state `revive_shop`)
47. **Shop panel clicks** (close, category tabs, item buy)
48. **Queue zone clicks** (tap to join/start, party slot toggles, start button)
49. **Fallback**: Sets `mouse.down = true`, `InputIntent.mouseDown = true`, `InputIntent.shootHeld = true`, `InputIntent.shootPressed = true`

**Key detail**: If the click is consumed by any UI handler (via early `return`), the shoot intent is never set. Only clicks that fall through ALL UI handlers trigger shooting.

### mouseup Handler

On left button release:
- Clears `mouse.down`
- Clears all drag states: `draggingSV`, `draggingHue`, `isDraggingTile`, `settingsScrollbarDrag`, `_mafiaLobbyScrollbarDrag`
- Calls `handleModifyGunUp()` (CT-X slider release)
- Resets hotbar hold: `hotbarHoldSlot = -1`, `hotbarHoldTime = 0`, `showWeaponStats = false`
- Releases reactor hand hold (`_sabPanel.holding = false`)
- Clears `InputIntent.mouseDown`
- Clears `InputIntent.shootHeld` ONLY if arrow keys are not shooting (`!InputIntent.arrowShooting`)

### contextmenu Handler (Right-Click)

Prevents default browser context menu. Handles:
1. **Test mob panel right-click**: shows ability info (`handleTestMobRightClick`)
2. **Inventory item right-click**: shows card popup at cursor position (`cardPopup = { item, x, y }`)
3. **Armor tab card right-click**: shows card popup for equipped armor
4. **Dismiss card popup** on right-click elsewhere
5. **Tile removal**: right-click with active placement tool removes placed tiles at world position

### wheel Handler (Scroll)

Scroll routing (first match wins):
1. **Mafia lobby settings** (`handleMafiaSettingsScroll`)
2. **Test mob panel** (`handleTestMobScroll`)
3. **Forge panel** (`handleForgeScroll`)
4. **Country popup** (row-based scroll, clamped)
5. **Language popup** (row-based scroll, clamped)
6. **Toolbox panel** (pixel scroll * 0.8)
7. **Settings panel** (pixel scroll * 0.5, computed from tab content height)
8. **Inventory armor tab** (pixel scroll * 0.6, only when `invCategory === 3`)
9. **Stats panel** (pixel scroll * 0.6, skill list area)
10. **Customize sidebar** (pixel scroll * 0.6, category sidebar)

All scroll handlers call `e.preventDefault()`. The wheel listener uses `{ passive: false }`.

### Drag Systems Summary

| Drag System | Start (mousedown) | Move (mousemove) | End (mouseup) |
|-------------|-------------------|-------------------|---------------|
| CT-X gun mod slider | `handleModifyGunClick()` | `handleModifyGunDrag(mouse.x)` | `handleModifyGunUp()` |
| Tile painting | `isDraggingTile = true` + `placeTileAt()` | `placeTileAt()` if dragging | `isDraggingTile = false` |
| Inventory | (handled in `handleInventoryClick`) | `handleInventoryHover()` | (handled internally) |
| Settings scrollbar | `settingsScrollbarDrag = true` + `settingsScrollbarGrabY` | Computes scroll from mouse Y | `settingsScrollbarDrag = false` |
| Mafia lobby scrollbar | `_mafiaLobbyScrollbarDrag = true` + `_mafiaLobbyScrollbarGrabY` | Computes scroll from mouse Y | `_mafiaLobbyScrollbarDrag = false` |
| SV color picker | `draggingSV = true` | Updates `pickerSat`/`pickerVal` + `applyCosmetic()` | `draggingSV = false` |
| Hue bar | `draggingHue = true` | Updates `pickerHue` + `applyCosmetic()` | `draggingHue = false` |
| Reactor hand hold | `_sabPanel.holding = true` | (none) | `_sabPanel.holding = false` |
| Hotbar hold (weapon stats) | `hotbarHoldSlot = i` + `hotbarHoldTime = 0` | (time incremented in update) | `hotbarHoldSlot = -1` |

---

## Keyboard Handlers (js/client/ui/panelManager.js)

### keydown Handler

The keydown handler in `panelManager.js` processes keys through a priority chain:

**1. Chat toggle** (`keybinds.chat`, default: Tab)
- Prevents default if Tab
- Blocked during Mafia meeting/voting phases
- Toggles chat UI, clears name edit, zeroes all movement keys

**2. Profile toggle** (`keybinds.profile`, default: H)
- Only when not typing (`!chatInputActive && !nameEditActive && !statusEditActive`)
- Blocked in Skeld scene

**3. Escape** — Context-sensitive close chain:
- Mafia lobby settings/color panels -> close
- Security cameras -> exit
- Sabotage fix panel -> close
- Active fishing -> cancel
- Chat active -> clear input, close
- Name edit -> cancel
- Status edit -> cancel
- Customize panel -> back to identity
- Identity sub-panels (stats, faction/relationship/country/language popups) -> close sub-panel
- Any open panel -> close

**4. Casino bet input** (when `_casinoBetEditing` is true)
- Captures Enter/Escape (commit), Backspace, digits 0-9 (max 6 chars)
- Blocks all other input

**5. Chat input** (when `chatInputActive` is true)
- Enter: sends message or processes chat command, closes chat
- Backspace: delete last char
- Single character keys: append (max 80 chars)
- **Chat commands** (processed when message starts with `/`):
  - `/gold [amt]`, `/wave [n]`, `/heal`, `/dung <type>`, `/leave`, `/skip`, `/stairs`, `/floor [n]`
  - `/op`, `/mg` (modify gun), `/spawn <type>`, `/killall`, `/grunt`
  - `/testmob`, `/testmob bot [right]`, `/test <type> [live]`
  - `/sprites`, `/export [name]`, `/freeze`, `/god`, `/nofire`, `/speed <n>`
  - `/hp <n|max>`, `/skipw`, `/info`, `/gun <id> [tier level]`
  - `/ghost`, `/role <role>`, `/sabo <type>`, `/fix`, `/party <1-4>`, `/save`, `/resetsave`, `/help`

**6. Hex input** (customize panel hex color entry)
- Enter: apply if valid `#RRGGBB`
- Escape: cancel
- Backspace: delete
- Hex chars + `#`: append

**7. Name edit** (identity panel name field)
- Enter: save name (max 16 chars)
- Backspace: delete
- Single chars: append

**8. Status edit** (identity panel status field)
- Enter: save status
- Escape: cancel
- Backspace: delete
- Single chars: append (max 60 chars)

**9. Fishing reel** (Space during active fishing)
- Sets `InputIntent.reelPressed = true` and `InputIntent.reelHeld = true`

**10. Normal gameplay input** (not typing):
- Sets `keysDown[key] = true`
- Prevents default for all bound keys and Space
- `M` key: toggle minimap
- `P` key: toggle grid coordinate overlay
- `R` key: toggle remove mode (only with active placement tool)
- `Escape`: deselect active placement tool
- **Keybind rebinding**: if `rebindingKey` is set, captures next key (not Escape/Enter), swaps if already bound
- **Arrow key shooting**: maps shoot keybinds to `arrowAimDir` (0=down, 1=up, 2=left, 3=right), sets `arrowShooting`, `shootHeld`, `shootPressed`
- `R`: `reloadPressed` (only if `!gun.reloading && gun.ammo < gun.magSize`)
- `F`: `meleePressed` + `ultimatePressed` (always both)
- `Q`: Mafia kill (Skeld only)
- `R`: Mafia report (Skeld only)
- `Shift`: `dashPressed`
- `X`: close security cameras
- Mafia role abilities: `T` (track), `F` (shift/vanish), `V` (vitals)
- `keybinds.interact` (E): `interactPressed`
- `keybinds.identity` (Z): toggle identity panel, or join queue if near one
- `N`: `skipWavePressed` (OP mode only)
- `G`: `readyWavePressed` (dungeon only)
- **Hotbar keys** (`keybinds.slot1`-`slot4`): set corresponding `slotNPressed`; if item is potion type, also sets `potionPressed`. Blocked in Mafia lobby.
- `keybinds.slot5` (5): `slot5Pressed`
- **Farm seed selection**: number keys 1-9 in farm scene call `handleFarmSeedSelect()`

### keyup Handler

- Clears `keysDown[key]`
- **Space release**: clears `InputIntent.reelHeld` (fishing)
- **Arrow shoot key release**: clears `arrowShooting`; if no arrow keys held, clears `InputIntent.arrowShooting` and sets `InputIntent.shootHeld = InputIntent.mouseDown` (preserves mouse-hold shooting)

---

## Scene-Specific Input Handling

| Scene | Input Restrictions |
|-------|-------------------|
| **Mafia Lobby** | Hotbar/weapon switching blocked (both keys and clicks); lobby panel clicks consume input |
| **Skeld (Mafia)** | Profile icon blocked; Toolbox blocked; Q/R/T/F/V for role abilities; meeting phases block all clicks; vent arrows active |
| **Hide & Seek** | Role select buttons, show-bot toggle, post-match return button; weapon forced to melee; hiders can't melee |
| **Spar** | Gun-only during fighting; melee/dash/potion/ultimate blocked; freeze during countdown/post-match |
| **Farm** | Number keys 1-9 select seeds via `handleFarmSeedSelect()` |
| **Fishing** | Space for reel; Escape cancels fishing; movement blocked during cast |
| **Dungeon** | G key ready wave; N key skip wave (OP); shop/revive shop clicks |
| **Casino** | Bet editing captures digit keys |

---

## Coordinate Systems

- **Screen space**: `(0,0)` top-left to `(BASE_W, BASE_H)` bottom-right. Mouse events are scaled: `(e.clientX - rect.left) / scale`.
- **World space**: `screenX / WORLD_ZOOM + camera.x`. Used for tile placement, entity hit-testing, queue zone clicks.
- **InputIntent stores both**: `mouseX`/`mouseY` (screen) and `mouseWorldX`/`mouseWorldY` (world), updated on mousemove and mousedown.
