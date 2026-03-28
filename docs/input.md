# Input System

## Overview

The input system captures keyboard and mouse events from the browser, translates them into abstract `InputIntent` flags each frame, and then converts those intents into a `CommandQueue` that the authority tick consumes. This three-layer design (raw input -> intent -> command) decouples client presentation from server-authoritative game logic, making the architecture multiplayer-ready.

## Files

- `js/client/input/inputIntent.js` -- Defines the `InputIntent` object (all per-frame flags) and `clearOneFrameIntents()`.
- `js/client/input/input.js` -- Mouse/keyboard event listeners, click routing for all panels and UI, drag systems.
- `js/authority/commands.js` -- `CommandQueue`, `enqueueCommand()`, `translateIntentsToCommands()`, and `DEBUG_dumpCommands()`.
- `js/authority/authorityTick.js` -- Consumes the command queue, writes to `InputIntent`, runs `update()`.
- `js/client/ui/settings.js` -- `DEFAULT_KEYBINDS`, `keybinds`, `KEYBIND_ITEMS`, `rebindingKey`.

## Key Functions & Globals

| Name | Type | Location |
|------|------|----------|
| `InputIntent` | `window` global object | `inputIntent.js` |
| `clearOneFrameIntents()` | function | `inputIntent.js` |
| `mouse` | `{ x, y, down }` | `input.js` |
| `keysDown` | object (key -> boolean) | `gameState.js` (declared), `panelManager.js` (keydown/keyup set) |
| `CommandQueue` | `window` global array | `commands.js` |
| `enqueueCommand(cmd)` | `window` function | `commands.js` |
| `translateIntentsToCommands()` | function | `commands.js` |
| `authorityTick()` | `window` function | `authorityTick.js` |
| `DEFAULT_KEYBINDS` | const object | `settings.js` |
| `keybinds` | mutable object (copy of defaults) | `settings.js` |

## How It Works

### InputIntent Flags

`InputIntent` is a flat object on `window` with two categories of flags:

**Held flags** (persist as long as key/button is held):

| Flag | Description |
|------|-------------|
| `chatActive` | True while chat input is focused; blocks all gameplay intents |
| `moveX` | -1 (left), 0 (none), 1 (right) |
| `moveY` | -1 (up), 0 (none), 1 (down) |
| `mouseX`, `mouseY` | Screen-space mouse position |
| `mouseDown` | Left mouse button held |
| `shootHeld` | Mouse or arrow keys held (continuous fire) |
| `arrowAimDir` | 0=down, 1=up, 2=left, 3=right (arrow-key aim direction) |
| `arrowShooting` | Arrow keys are actively aiming |
| `reelHeld` | Space held during fishing reel phase |

**Pressed flags** (true for ONE frame only, cleared by `clearOneFrameIntents()`):

| Flag | Description |
|------|-------------|
| `shootPressed` | Just started shooting this frame |
| `meleePressed` | F key pressed |
| `reloadPressed` | R key pressed |
| `dashPressed` | Shift pressed (ninja dash) |
| `interactPressed` | E key pressed |
| `slot1Pressed` | Hotbar slot 1 keybind (checks quickslot first — see [hotbar-and-quickslots.md](hotbar-and-quickslots.md)) |
| `slot2Pressed` | Hotbar slot 2 keybind |
| `slot3Pressed` | Hotbar slot 3 keybind |
| `slot4Pressed` | Hotbar slot 4 keybind (quickslot-aware, falls back to `useExtraSlotItem()`) |
| `slot5Pressed` | Grab slot keybind (never assignable) |
| `potionPressed` | Potion use (only set if default slot type is potion, not for quickslot overrides) |
| `ultimatePressed` | F key for shrine/godspeed ultimate |
| `skipWavePressed` | N key (OP mode only) |
| `readyWavePressed` | G key (skip wave countdown) |
| `reelPressed` | Space pressed during fishing bite/reel |

### Mouse Object

```
const mouse = { x: BASE_W / 2, y: BASE_H / 2, down: false };
```

Updated on `mousemove`. Coordinates are scaled from screen space to canvas virtual space using `(e.clientX - rect.left) / scale`. World-space coordinates are also computed on `mousedown` via `mx / WORLD_ZOOM + camera.x`.

### Command Queue Flow

Each frame follows this pipeline:

```
1. Browser events fire
     |
     v
2. Event handlers set InputIntent flags + keysDown
     |
     v
3. translateIntentsToCommands()
     Reads InputIntent, produces { t, ts, data } command objects
     Pushes to CommandQueue via enqueueCommand()
     |
     v
4. authorityTick()
     a) Copies & clears CommandQueue
     b) Applies commands back to InputIntent flags
     c) Applies authority-level freezes (Mafia meetings, Hide & Seek, etc.)
     d) Calls update() with _authorityDriven = true
     e) Returns snapshot via serializeGameState()
     |
     v
5. clearOneFrameIntents()
     Called at end of update(); resets all "pressed" flags to false
```

Command format: `{ t: string, ts: number, data: object }`

Command types:

| Type | Data | Description |
|------|------|-------------|
| `move` | `{ x, y }` | Movement direction (-1/0/1 each axis) |
| `shoot` | `{ held, aim: { mouseX, mouseY, arrowAimDir, arrowShooting } }` | Shoot state + aim data |
| `melee` | `{}` | Melee swing |
| `reload` | `{}` | Reload gun |
| `dash` | `{}` | Ninja dash |
| `interact` | `{}` | Interact with entity |
| `usePotion` | `{}` | Use potion |
| `slot` | `{ slot: 0\|1\|2 }` | Switch hotbar slot |
| `useExtra` | `{}` | Use extra item (slot 4) |
| `grab` | `{}` | Grab mob (slot 5) |
| `readyWave` | `{}` | Skip wave countdown |
| `skipWave` | `{}` | Skip wave (OP mode) |
| `ultimate` | `{}` | Activate shrine/godspeed |
| `fish_reel` | `{ held }` | Fishing reel press/hold |

### Keyboard Capture

Keyboard events are handled in `panelManager.js` via `keydown`/`keyup` listeners. The `keysDown` object tracks which keys are currently held. On `keydown`, the system checks context (chat active, name editing, panel open, rebinding key) before setting `InputIntent` flags.

Special routing: when `chatActive` or `nameEditActive` is true, gameplay keys are blocked and keystrokes go to text input instead.

### Drag Systems

Seven drag behaviors are tracked via `mousemove`:

| Drag | Flag | Description |
|------|------|-------------|
| CT-X Slider | `handleModifyGunDrag()` | Gun modification stat slider |
| Tile Placement | `isDraggingTile` | Paint tiles on map while mouse held |
| Inventory Hover | `handleInventoryHover()` | Item hover tracking in inventory grid |
| Mafia Lobby Scrollbar | `_mafiaLobbyScrollbarDrag` | Settings scrollbar in Mafia lobby |
| Settings Scrollbar | `settingsScrollbarDrag` | Settings panel scrollbar |
| Color Picker (SV) | `draggingSV` | Saturation/value picker in customize panel |
| Color Picker (Hue) | `draggingHue` | Hue bar in customize panel |

All drags are released on `mouseup` (sets flags to false).

### Hotbar (5 Slots)

The hotbar has 5 clickable slots with two layout modes controlled by `gameSettings.hotbarPosition`:

| Slot | Index | Default Key | Purpose |
|------|-------|-------------|---------|
| 1 | 0 | `1` | Gun |
| 2 | 1 | `2` | Melee |
| 3 | 2 | `3` | Potion |
| 4 | 3 | `4` | Extra item |
| 5 | 4 | `5` | Grab |

Slots can be activated by keyboard or by clicking the hotbar UI. A hold timer (`hotbarHoldSlot`, `hotbarHoldTime`) shows weapon stats on long press.

### Keybind System

Keybinds are stored in a mutable `keybinds` object initialized from `DEFAULT_KEYBINDS`:

```js
const DEFAULT_KEYBINDS = {
  moveUp: "w", moveDown: "s", moveLeft: "a", moveRight: "d",
  shootUp: "arrowup", shootDown: "arrowdown", shootLeft: "arrowleft", shootRight: "arrowright",
  slot1: "1", slot2: "2", slot3: "3", slot4: "4", slot5: "5",
  chat: "tab", profile: "h", interact: "e", identity: "z",
};
```

Rebinding: In the Settings panel Keybinds tab, clicking a key button sets `rebindingKey` to that action. The next keypress assigns the new key. Keybinds are persisted via `SaveLoad.autoSave()`. A "Reset Defaults" button restores all bindings.

`KEYBIND_ITEMS` defines the full list of rebindable actions organized into sections: Movement, Shooting, Hotbar, and Panels.

## Connections to Other Systems

- **Authority Tick** (`authorityTick.js`): Sole consumer of the command queue. Also applies authority-level input freezes for Mafia meetings, Hide & Seek, and lobby panels.
- **Save/Load** (`saveLoad.js`): Keybinds are persisted to localStorage and restored on load.
- **UI Panel Manager** (`panelManager.js`): Houses the `keydown`/`keyup` handlers, chat command parsing, and panel-open checks that block movement.
- **Settings Panel** (`saveLoad.js` / `settings.js`): Renders the keybind rebinding UI.

## Gotchas & Rules

- **One-frame vs. held**: Pressed flags are only true for a single frame. If you read `meleePressed` after `clearOneFrameIntents()` has run, it will always be false. Authority must consume intents before they are cleared.
- **Chat blocks gameplay**: When `InputIntent.chatActive` is true, `translateIntentsToCommands()` zeros movement and skips all action commands. Name editing (`nameEditActive`) has the same effect.
- **Panels block movement**: When any UI panel is open (except toolbox), movement intents are zeroed. Shooting and other actions are still blocked at the typing level, not the panel level.
- **Authority freezes override input**: `authorityTick()` can zero out intents for Mafia meetings, Hide & Seek frozen states, casino games, and lobby panels regardless of what the client sent.
- **`_authorityDriven` flag**: When true (during `authorityTick -> update()`), the `update()` function skips its own keysDown -> InputIntent translation to avoid double-processing.
- **Command history**: `enqueueCommand()` also pushes to a 200-entry ring buffer (`_cmdHistory`) accessible via `DEBUG_dumpCommands(n)` for debugging.
