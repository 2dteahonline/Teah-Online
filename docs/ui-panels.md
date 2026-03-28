# UI Panel System

## Overview
The UI panel system manages all in-game overlay panels -- inventory, identity, shop, customize, chat, profile, settings, toolbox, gunsmith, fish vendor, and test mob panel. A centralized `UI` manager enforces single-panel-at-a-time behavior: opening one panel automatically closes whatever else is open. All panels are drawn directly onto the Canvas 2D context (no DOM elements), with each panel implementing its own layout and styling.

## Files
- `js/client/ui/panelManager.js` -- `UI` singleton (open/close/toggle), panel registrations, icon buttons, shop panel, toolbox data, customize categories
- `js/client/ui/panels.js` -- Identity panel (`drawIdentityPanel`), stats/leveling panel (`drawStatsPanel`), gunsmith panel (`drawGunsmithPanel`)
- `js/client/ui/inventory.js` -- Inventory panel (`drawInventoryPanel`), item cards, camera definition, `update()` function
- `js/client/ui/customize.js` -- Character customization screen (`drawCustomizeScreen`), HSV color picker
- `js/client/ui/settings.js` -- Settings panel (`drawSettingsPanel`), keybind system, `gameSettings` object
- `js/client/ui/toolbox.js` -- Toolbox panel (`drawToolboxPanel`), tile placement/preview, selected toolbar
- `js/client/ui/chatProfile.js` -- Chat panel (`drawChatPanel`), profile panel (`drawProfilePanel`), icon button renderers
- `js/client/ui/testMobPanel.js` -- Test mob GUI panel (`drawTestMobPanel`), mob ability descriptions

## Key Functions & Globals

### UI Manager
```
UI.register(id, config)   -- register a panel with optional { onOpen, onClose } callbacks
UI.open(id)               -- close current panel, open this one, fire onOpen
UI.close(specificId?)      -- close active panel (optionally only if it matches specificId), fire onClose
UI.toggle(id)             -- toggle a panel open/closed
UI.isOpen(id)             -- check if a specific panel is active
UI.anyOpen()              -- check if any panel is open
UI.active                 -- getter for current panel id string (or null)
```

### Registered Panels
| Panel ID      | File                | onOpen                                        | onClose                                                    |
|---------------|---------------------|-----------------------------------------------|------------------------------------------------------------|
| `chat`        | panelManager.js     | Activates chat input, sets InputIntent.chatActive | Deactivates chat input                                    |
| `profile`     | panelManager.js     | --                                            | Resets statusEditActive                                    |
| `settings`    | panelManager.js     | --                                            | --                                                         |
| `shop`        | panelManager.js     | --                                            | --                                                         |
| `inventory`   | panelManager.js     | --                                            | Clears cardPopup                                           |
| `identity`    | panelManager.js     | --                                            | Resets statusEdit, statsPanel, nameEdit, faction/country/language/relationship popups |
| `customize`   | panelManager.js     | --                                            | Clears hex input state, triggers auto-save                 |
| `toolbox`     | panelManager.js     | --                                            | Keeps activePlaceTool (placement continues after close)    |
| `fishVendor`  | panelManager.js     | Resets fishVendorTab to 0                     | --                                                         |
| `gunsmith`    | panelManager.js     | Resets _gunsmithSelected to 0                 | --                                                         |
| `testmob`     | testMobPanel.js     | --                                            | Clears testMobAbilityPopup                                 |
| `casino`      | panelManager.js     | --                                            | Resets bet editing state, calls casinoReset()               |
| `farmVendor`  | panelManager.js     | Resets farmVendorTab to 0                     | --                                                         |
| `miningShop`  | panelManager.js     | --                                            | --                                                         |
| `forge`       | forgeUI.js          | --                                            | Forge-specific cleanup                                     |
| `skeldTask`   | skeldTasks.js       | --                                            | Task-specific cleanup                                      |

### Panel Drawing Functions
- `drawIdentityPanel()` -- stats, character preview, mini inventory, faction/country/gender display
- `drawStatsPanel()` -- sub-panel of identity (player level, skill XP breakdown)
- `drawGunsmithPanel()` -- gunsmith upgrade/evolution panel
- `drawInventoryPanel()` -- full inventory grid with categories, pagination, item cards
- `drawShopPanel()` -- in-dungeon shop (buy items between waves)
- `drawCustomizeScreen()` -- full-screen character creator with 18 color pickers
- `drawSettingsPanel()` -- 7-tab settings (General, Keybinds, Sounds, Indicators, Profile, Message, Privacy)
- `drawToolboxPanel()` -- world builder tile/object palette
- `drawChatPanel()` -- chat message display and input
- `drawProfilePanel()` -- player status card
- `drawTestMobPanel()` -- mob spawner/tester GUI (opened via `/testmob` command)
- `drawCasinoPanel()` -- casino game interface (10 games: Blackjack, Roulette, Heads or Tails, Cases, Mines, Dice, RPS, Baccarat, Slots, Keno)

### Icon Buttons
- `drawIconButton(x, y, active, drawContent)` -- base rounded square icon (48x48, dark bg, highlight border when active)
- `drawChatIcon()` -- speech bubble icon (position: left side, row 1)
- `drawProfileIcon()` -- smartphone icon (position: left side, row 2)
- `drawMapIcon()` -- folded map icon with red pin (position: left side, row 3)
- `drawToolboxIcon()` -- wrench icon (position: top right)

## How It Works

### Panel Manager Architecture
The `UI` object is a simple singleton with `_active` tracking the current panel ID string and `_panels` storing registered configs. The key invariant is **only one main panel can be open at a time**. Calling `UI.open('shop')` will automatically call `UI.close()` first, which fires the previous panel's `onClose` callback before switching.

Sub-panels (like faction selection popups within the identity panel) are tracked separately in `UI._subPanels` and don't conflict with the main panel state.

Panel drawing functions all start with a guard like `if (!UI.isOpen('identity')) return;` so they can be called unconditionally from the draw loop.

### Panel Framework Decision
Each panel has intentionally different styling -- different title bar heights, corner radii, background colors, accent colors, and layout structures. A shared panel framework function was evaluated and rejected because it would need too many parameters to accommodate the variations. Each panel draws its own chrome (background, border, title bar, close button) directly.

### Identity Panel
- Dimensions: 740x500, centered on screen
- Left side: 11 stat rows (online time, level, faction, country, language, gender, relationship, gold, HP, kills, spars) with inline icons (faction emblems, flags, gender symbols)
- Center: 3x scaled character preview using `drawGenericChar()` at 3x zoom
- Right side: status column with player achievements
- Bottom-left: 3 quick inventory slots (gun, melee, potion) with pixel art icons
- Title bar: mini player avatar + editable name (click to rename)
- Sub-panels: faction picker, country picker (with scrollable flag list), language picker, relationship status dropdown

### Gunsmith Panel
- Shows all owned guns in a selectable list
- Displays tier color, tier name, and level for each gun
- Uses the 5-tier progression system: Common -> Uncommon -> Rare -> Epic -> Legendary
- Tier colors: `#888` (Common), `#5fca80` (Uncommon), `#4a9eff` (Rare), `#ff9a40` (Epic), `#ff4a8a` (Legendary)
- At tier N level 25, an EVOLVE button appears to advance to tier N+1 level 1
- Evolution costs defined in `EVOLUTION_COSTS`
- Recipe ingredients shown per level from `GUN_UPGRADE_RECIPES[gunId][tier][level]`

### Inventory Panel
- Full-screen opaque overlay (drawn absolute last in the render pipeline)
- 5 category tabs: All, Guns, Melees, Armor, Consumables (`INV_CATEGORIES`)
- Grid layout with pagination (`invPage` state)
- Item cards: clicking an item shows a detailed card popup with:
  - Tier badge with color coding
  - Art area with pixel art illustration
  - Stat lines rendered via `ITEM_STAT_RENDERERS` registry
  - Cost badge and level progress bar (for progression items)
- Armor tab has its own scroll (`armorInvScroll`) and hover highlighting (`armorHoverSlot`)

### Settings Panel
- 7 tabs defined in `SETTINGS_TABS`: General, Keybinds, Sounds, Indicators, Profile, Message, Privacy
- Scrollable content per tab (`settingsScroll`)
- **Keybind system**: `DEFAULT_KEYBINDS` defines default keys for 18 actions (movement, shooting, hotbar, panels). Rebinding is done by clicking a keybind slot, then pressing the new key (`rebindingKey` state)
- `gameSettings` object holds all toggle/choice settings with sensible defaults:
  - General: nicknames, animations, dayNightWeather, bloodAnim, deathAnim, hotbarPosition, spriteMode, debug overlays
  - Sounds: masterVolume, sfx, music, ambient (all boolean toggles)
  - Indicators: damageNumbers, healthBars, mobHpText, killFeed, waveAnnounce, hitbox display
  - Profile: privateStats, language, currency, showOnlineTime, relationshipStatus
  - Message: chatVisibility, pmFriendsOnly, disableAllMessages, receiveBotMessages
  - Privacy: appearOffMap

### Customize Panel
- Full-screen character creator (`drawCustomizeScreen()`)
- Left sidebar: 18 customization categories in scrollable icon strip, each with custom pixel art icon:
  - Hair, Facial Hair, Skin, Eyes, Shirt, Pants, Shoes, Hat, Glasses, Gloves, Belt, Cape, Tattoo, Scars, Earring, Necklace, Backpack, Warpaint
- Categories defined in `CUSTOMIZE_CATS` array (in `panelManager.js`)
- Color picker: HSV model with hue bar + saturation/value 2D picker
  - `hsvToHex(h, s, v)` converts HSV to hex color
  - `pickerHue`, `pickerSat`, `pickerVal` track current picker state
  - `draggingHue`, `draggingSV` track mouse drag state
- Hex input field for direct color entry
- Character preview updates in real-time as colors are changed
- Auto-saves on panel close via `SaveLoad.autoSave()`

### Shop Panel
- Available between waves in dungeon mode
- Auto-closes if player walks away from shop station (`isNearInteractable('shop_station')`) or if a wave starts
- Displays purchasable items with gold costs

### Chat & Profile Panels
- **Chat**: text input with `chatInput` string, renders message history, toggles `InputIntent.chatActive` to block game input while typing
- **Profile**: displays player status message with editable status field (`statusEditActive`, `statusEditValue`)
- Both use the shared `drawIconButton()` renderer for their sidebar icons

### Toolbox Panel
- World builder / tile editor system
- `TOOLBOX_CATEGORIES` defines available tiles and objects across multiple groups:
  - Tilesets: Ground (grass, dirt, sand, snow, ice), Stone, Paths, Flooring, Water, Walls -- 47+ tile types
  - Objects: Furniture, decorations
- Multi-select: items have a `selected` boolean, multiple can be active simultaneously
- Selected items appear as a toolbar strip to the left of the toolbox icon via `drawSelectedToolbar()`
- Active placement tool (`activePlaceTool`) persists after panel close -- player can walk around and paint tiles
- Remove mode: hold R to delete placed tiles
- `drawPlacedTiles(camX, camY)` renders all placed tiles during world drawing
- `drawPlacementPreview(camX, camY)` shows ghost tile under cursor (or red X in remove mode)

### Test Mob Panel
- Debug panel opened via `/testmob` command
- State: `testMobDungeon` (cave/azurine/vortalis/earth205/wagashi/earth216), `testMobFloor` (1-5), `testMobScroll`
- Lists all mobs for the selected dungeon and floor
- Click a mob to spawn it; shows ability descriptions in popup (`testMobAbilityPopup`)
- `MOB_ABILITY_DESCRIPTIONS` contains human-readable descriptions for every mob special ability (100+ entries covering all dungeons)
- `TESTMOB_DUNGEONS` maps 7 dungeons (Cave, Azurine City, Vortalis, Earth-205, Wagashi, Earth-216) to floor/mob lists
- Validates floor counts against `DUNGEON_REGISTRY` at load time

## Connections to Other Systems
- **Input System** (`input.js`) -- `UI.anyOpen()` blocks player movement (except when toolbox is open). Chat panel sets `InputIntent.chatActive` to redirect keyboard input to chat.
- **Save/Load** (`saveLoad.js`) -- settings, keybinds, identity, and customization colors are persisted to localStorage. Customize panel triggers auto-save on close.
- **Rendering** (`draw.js`) -- panels are drawn in the screen-space HUD phase of the render pipeline, after world content. Inventory and customize are drawn last to overlay everything.
- **Progression System** (`progressionData.js`) -- gunsmith panel reads `PROG_ITEMS`, `_getGunProgress()`, `_setGunProgress()` for tier/level display and evolution.
- **Inventory System** (`inventorySystem.js`) -- inventory panel reads `playerInventory`, `playerEquip`, item data for display.
- **Scene Manager** -- certain panels are hidden in Skeld/Mafia Lobby scenes (profile, map, toolbox, identity, shop).
- **Combat/Wave System** -- shop auto-closes when a wave starts (`waveState === "active"`).

## Gotchas & Rules
- **Single panel at a time** -- calling `UI.open()` always closes the current panel first. Never bypass this by setting `_active` directly.
- **Movement blocking** -- `UI.anyOpen()` returns true when any panel is active, which blocks player movement in `update()`. The toolbox is explicitly exempted (`!UI.isOpen('toolbox')`) so players can walk while placing tiles.
- **Draw order matters** -- inventory panel is drawn absolute last (`drawInventoryPanel()` after all other panels) because it's a full opaque overlay. Customize screen is drawn second-to-last. Zone transition fades and minimap are drawn even later in `draw.js`.
- **Panel styling is intentionally inconsistent** -- each panel has its own visual treatment. Do not try to extract a shared panel frame function; it was evaluated and rejected due to too many parameter variations.
- **Keybind conflicts** -- `isKeyBound(key)` checks all bindings. The rebind UI should prevent duplicate bindings.
- **Customize auto-saves** -- the customize panel fires `SaveLoad.autoSave()` on close. Other panels do not auto-save; the game relies on periodic auto-save elsewhere.
- **Toolbox placement persists** -- closing the toolbox panel does NOT clear `activePlaceTool`. The player can continue painting tiles after closing the panel. Only explicitly deselecting or clearing clears the tool.
- **Chat input priority** -- when the chat panel is open, `InputIntent.chatActive = true` causes the input system to route all keyboard input to the chat string instead of game controls.
