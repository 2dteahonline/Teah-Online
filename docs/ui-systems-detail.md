# UI Systems Detail

Detailed reference for porting Teah Online's client UI systems to Unity.
Source files are in `js/client/ui/` and `js/client/ui/panelManager.js`.

---

## Panel Manager (panelManager.js)

Centralized panel state machine. Only one main panel can be open at a time. Opening a new panel automatically closes the current one.

### Core Object: `UI`

```js
const UI = {
  _active: null,      // current main panel id (string) or null
  _panels: {},         // registered panel configs { [id]: { onOpen?, onClose?, parent? } }
  _subPanels: {},      // sub-panel states (e.g. identity popups)
};
```

### API

| Method | Signature | Behavior |
|--------|-----------|----------|
| `register` | `UI.register(id, config?)` | Register a panel. `config` = `{ onOpen?, onClose?, parent? }`. Called at load time. |
| `open` | `UI.open(id)` | Close current panel (if any), set `_active = id`, call `onOpen()` if defined. No-op if already open. |
| `close` | `UI.close(specificId?)` | If `specificId` given, only closes if that panel is active. Calls `onClose()` callback, sets `_active = null`. |
| `toggle` | `UI.toggle(id)` | If `id` is active, close it; otherwise open it. |
| `isOpen` | `UI.isOpen(id)` | Returns `_active === id`. |
| `anyOpen` | `UI.anyOpen()` | Returns `_active !== null`. |
| `active` | `UI.active` (getter) | Returns current `_active` string or null. |

### One-Panel-At-A-Time Rule

`UI.open(id)` calls `this.close()` before setting the new panel. This ensures:
- Only one main panel is ever active
- The old panel's `onClose()` cleanup runs before the new panel's `onOpen()`
- Escape key calls `UI.close()` which cleans up the current panel

### Registered Panel IDs

| Panel ID | onOpen | onClose |
|----------|--------|---------|
| `'chat'` | `chatInputActive = true; InputIntent.chatActive = true; chatInput = ""` | `chatInputActive = false; InputIntent.chatActive = false` |
| `'profile'` | (none) | `statusEditActive = false` |
| `'settings'` | (none) | (none) |
| `'shop'` | (none) | (none) |
| `'inventory'` | (none) | `cardPopup = null` |
| `'identity'` | (none) | Resets: `statusEditActive`, `statsPanelOpen`, `nameEditActive`, `factionPopupOpen`, `relationshipPopupOpen`, `countryPopupOpen`, `languagePopupOpen` |
| `'customize'` | (none) | `hexInputActive = false; hexInputError = false; SaveLoad.autoSave()` |
| `'toolbox'` | (none) | Keeps `activePlaceTool` intact |
| `'fishVendor'` | `fishVendorTab = 0` | (none) |
| `'gunsmith'` | `_gunsmithSelected = 0` | (none) |
| `'casino'` | (none) | `_casinoBetEditing = false; casinoReset()` |
| `'farmVendor'` | `farmVendorTab = 0` | (none) |
| `'miningShop'` | (none) | (none) |
| `'forge'` | `_forgeTab = 0; _forgeSelectedGun = null; _forgeScroll = 0` | `_forgeSelectedGun = null` |
| `'testmob'` | `testMobScroll = 0; testMobAbilityPopup = null` | `testMobScroll = 0; testMobAbilityPopup = null` |

### How To Add a New Panel

1. Call `UI.register('myPanelId', { onOpen() { ... }, onClose() { ... } })` at script load time.
2. Create a `drawMyPanel()` function that starts with `if (!UI.isOpen('myPanelId')) return;`.
3. Call `drawMyPanel()` from `draw.js` in the panel rendering section.
4. To open: `UI.open('myPanelId')`. To close: `UI.close('myPanelId')`.
5. Handle click events: check `UI.isOpen('myPanelId')` in your click handler.

### Escape Key Handling

The keydown listener in `panelManager.js` handles Escape with a priority chain:
1. Mafia lobby panels (settings/color)
2. Security cameras
3. Sabotage fix panel
4. Active fishing
5. Chat active -> clear + close
6. Name/status edit active -> cancel edit
7. Customize -> close, reopen identity
8. Identity sub-panels (stats, faction, etc.) -> close sub-panel only
9. Any open panel -> `UI.close()`

---

## Shop Framework (shopFramework.js)

Reusable drawing and click helpers for vendor/shop panels. New shops use these helpers instead of duplicating layout code.

### `shopDrawPanel(pw, ph, opts)` -- Centered Modal

Draws a dimmed backdrop + rounded panel centered on screen. Returns `{ px, py, pw, ph }`.

| Option | Default | Description |
|--------|---------|-------------|
| `dim` | `true` | Draw backdrop dim |
| `dimColor` | `'rgba(0,0,0,0.5)'` | Backdrop color |
| `bgColor` | `'rgba(12,16,24,0.95)'` | Panel fill |
| `borderColor` | `'rgba(100,200,160,0.35)'` | Panel stroke |
| `radius` | `12` | Corner radius |

**Centering formula**: `px = Math.round(BASE_W / 2 - pw / 2)`, `py = Math.round(BASE_H / 2 - ph / 2)`

### `shopDrawHeader(px, py, pw, title, opts)` -- Title Bar

Draws header bar with title (centered), gold display (left), close button (right). Returns `{ closeX, closeY, closeW, closeH, barH }`.

| Option | Default | Description |
|--------|---------|-------------|
| `barH` | `50` | Header bar height |
| `barColor` | `'rgba(30,60,45,0.5)'` | Header fill |
| `titleFont` | `'bold 20px monospace'` | Title font |
| `titleColor` | `PALETTE.accent` (`#5fca80`) | Title color |
| `goldFont` | `'bold 14px monospace'` | Gold text font |
| `closeBtnSize` | `32` | Close button width/height |

**Close button position**: `cbX = px + pw - cbS - 10`, `cbY = py + (barH - cbS) / 2 + 3`
**Close button color**: `PALETTE.closeBtn` (`#c33`), white X character `\u2715`

### `shopDrawTabs(px, py, pw, tabs, activeIdx, opts)` -- Tab Bar

Draws horizontal tabs evenly distributed across panel width. Returns array of `{ x, y, w, h }` rects for hit testing.

| Option | Default | Description |
|--------|---------|-------------|
| `tabH` | `30` | Tab height |
| `pad` | `20` | Left/right padding |
| `activeColor` | `'rgba(80,200,120,0.2)'` | Active tab fill |
| `inactiveColor` | `'rgba(20,20,30,0.6)'` | Inactive tab fill |
| `accentColor` | `PALETTE.accent` | Active tab border + text color |
| `tabFont` | `'bold 11px monospace'` | Tab label font |

**Tab width**: `(pw - pad * 2) / tabs.length`, with 6px gap between tabs.

### `shopDrawItemRow(px, py, pw, rowH, item, opts)` -- List Row

Draws a single row for list-style shops. `item` shape: `{ name, desc?, cost, isLocked, lockReason?, isOwned, color? }`. Returns `{ x, y, w, h }`.

**Layout**:
- Row padded by `padX` (default 14) on each side
- Optional color swatch at left (16px wide, 6px from left)
- Name at 38% of row height, desc at 72%
- Price/status right-aligned

**State colors**:
- Buyable (can afford + not locked/owned): bg `'rgba(40,60,80,0.6)'`
- Default: bg `'rgba(20,25,35,0.6)'`
- Locked name: `#606060`, price: `#804040`
- Owned name: `#60a060`, status: `#60a060 "OWNED"`
- Affordable price: `#ffd700`, unaffordable: `#804040`

### `shopDrawItemGrid(px, py, pw, items, opts)` -- Card Grid

Draws a grid of item cards. Returns array of `{ x, y, w, h, idx }`.

| Option | Default | Description |
|--------|---------|-------------|
| `cols` | `3` | Number of columns |
| `cardW` | `200` | Card width |
| `cardH` | `130` | Card height |
| `gap` | `12` | Gap between cards |

**Card backgrounds by state**:
- Owned: `'rgba(30,50,35,0.9)'`, border `PALETTE.accent`
- Locked: `'rgba(15,15,20,0.9)'`, border `'rgba(60,40,40,0.4)'`
- Affordable: `'rgba(25,35,45,0.9)'`, border `'rgba(80,200,120,0.4)'`
- Can't afford: `'rgba(20,18,15,0.9)'`, border `'rgba(60,50,40,0.3)'`

**Card interior**:
- Tier color bar: 3px tall at top, uses `getTierColor(item.tier)`
- Name at y+24, desc at y+40 (wraps at 30 chars)
- Status at bottom: locked/owned/maxed labels, or buy button (80x24, centered)

### Click Helpers

| Function | Description |
|----------|-------------|
| `shopHitTest(mx, my, rect)` | AABB test against `{ x, y, w, h }` |
| `shopTabHitTest(mx, my, tabRects)` | Returns tab index or -1 |
| `shopItemHitTest(mx, my, itemRects)` | Returns item index (using `.idx` if present) or -1 |
| `shopBuy(cost, onSuccess)` | Checks gold, deducts, calls callback. Shows "NOT ENOUGH GOLD" hit effect on failure. Returns bool. |
| `shopDrawEmpty(cx, cy, text)` | Centered empty-state text, font `14px monospace`, color `#506070` |

### Global Color Constants (PALETTE)

Defined in `js/shared/itemData.js`:
```js
const PALETTE = {
  accent: "#5fca80",
  panelBg: "#0c1018",
  panelBorder: "#2a6a4a",
  headerBg: "rgba(30,60,45,0.5)",
  closeBtn: "#c33",
  gold: "#ffd740",
  tierColors: ['#888', '#5fca80', '#4a9eff', '#ff9a40', '#ff4a8a'],
  tierNames: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
};
```

---

## Character Customize (customize.js)

Full-screen character customization panel. Opened as panel ID `'customize'`.

### Layout Structure

| Region | Position | Size | Description |
|--------|----------|------|-------------|
| Header | Center top | `BASE_W` wide | "CHARACTER CREATOR" title at y=32 |
| Sidebar | Left | x=24, y=28, w=76 (iconSize+18), h=BASE_H-80 | Scrollable category icons |
| Content panel | Center | x=sidebar+14, y=28, w=BASE_W*0.48, h=BASE_H-80 | Color picker or head grid |
| Player preview | Right | Centered in remaining space, y=BASE_H/2+60 | 7x scale `drawChoso()` |
| Bottom buttons | Bottom | y=BASE_H-56 | Cancel (120x40) + Save (120x40) |

### Background

- Full screen fill: `#080a10`
- Top accent gradient: `#1a2a40` -> `#3a6a8a` -> `#1a2a40`, 2px tall

### CUSTOMIZE_CATS (19 categories)

Each category maps a display name to a `player` property key:

| Index | Name | Key | Icon Color |
|-------|------|-----|------------|
| 0 | Head | `headId` | `#d4a888` |
| 1 | Hair | `hair` | `#e8a040` |
| 2 | Facial Hair | `facialHair` | `#b08050` |
| 3 | Skin | `skin` | `#e8b898` |
| 4 | Eyes | `eyes` | `#50aaee` |
| 5 | Shirt | `shirt` | `#5090dd` |
| 6 | Pants | `pants` | `#6070cc` |
| 7 | Shoes | `shoes` | `#c06830` |
| 8 | Hat | `hat` | `#ee5533` |
| 9 | Glasses | `glasses` | `#80ccff` |
| 10 | Gloves | `gloves` | `#a09070` |
| 11 | Belt | `belt` | `#e8c040` |
| 12 | Cape | `cape` | `#aa44dd` |
| 13 | Tattoo | `tattoo` | `#40cc70` |
| 14 | Scars | `scars` | `#ee8877` |
| 15 | Earring | `earring` | `#ffd040` |
| 16 | Necklace | `necklace` | `#d0d8f0` |
| 17 | Backpack | `backpack` | `#b09050` |
| 18 | Warpaint | `warpaint` | `#ee4444` |

### Sidebar Icons

- Each category has a unique procedural pixel-art icon drawn at 58x58px
- Active category: blue border `#4a9eff` 2.5px, side accent bar 5px wide
- Inactive: `#0c1018` bg, dimmed colors (shadeColor -55)
- Label: `bold 11px 'Segoe UI'`, active `#c0e0ff`, inactive `#556878`
- Scrollable with clamped offset `customizeSideScroll`
- Scroll indicator: 3px wide, `rgba(74,158,255,0.3)`

### Content Panel: Head Selection (when `headId` category)

- Grid of head thumbnails, 52x52px each, 8px gap
- Columns = `floor((cpW - 32) / (52 + 8))`
- Default head: renders mini procedural face preview
- Spritesheet heads: draws frame (0,0,32,32) from head image
- Selected: blue border `#4a9eff`, bg `#1a2a40`

### Content Panel: Color Picker (all other categories)

**Preset palette** (`COLOR_PALETTE`): 42 colors in a grid, 32x32px swatches with 5px gap. Selected swatch gets white border 2.5px.

```js
const COLOR_PALETTE = [
  "#0c0c10","#1a1a2e","#2a1a0a","#3a2a1a","#5a3a20","#7a5a30",
  "#8a7060","#a08060","#c8a060","#d4bba8","#e8d0c0","#f5e6d8",
  "#fff8f0","#ffffff","#c0c0c0","#808080","#404040","#1a1a1a",
  "#e03030","#ff6040","#ff9020","#ffcc00","#ffff40","#a0ff40",
  "#40cc40","#208820","#0a440a","#40cccc","#2090e0","#3060cc",
  "#4040cc","#8040cc","#cc40cc","#ff40a0","#ff8090","#884444",
  "#445566","#556644","#664444","#4a2a2a","#2a3a4a","#3a3a2a",
];
```

**HSV Picker** (below presets):

| Element | Position | Size | Description |
|---------|----------|------|-------------|
| SV picker | `svX=palX`, `svY=palY + palRows*(32+5) + 14` | `cpW-36` x `100` | Saturation-Value gradient area |
| Hue bar | Below SV, +10px gap | `svW` x `18` | Rainbow gradient, 0-360 degrees |
| Color preview | Below hue, +12px gap | 42x32 | Current color swatch |
| Hex input | Next to preview | 130x32 | Text input for hex code |
| Apply button | Next to input | 70x32 | Validates `#RRGGBB` format |

**Drag state variables**:
- `pickerHue` (0-360), `pickerSat` (0-1), `pickerVal` (0-1)
- `draggingHue` (bool), `draggingSV` (bool)

**SV picker cursor**: white circle r=7, black outline r=8, at `(svX + pickerSat * svW, svY + (1-pickerVal) * svH)`

**Hue bar cursor**: white rounded rect 8x(hueH+4), at `hueX + (pickerHue/360) * hueW`

**HSV to Hex conversion**: `hsvToHex(h, s, v)` -- standard HSV formula.

### Save/Apply

- "Cancel" button (120x40 at cpX, btnY): bg `#1a1218`, border `#4a2a2a`, text `#d08080`
- "Save" button (120x40 at cpX+136, btnY): bg `#121a2e`, border `#3060a0`, text `#80b0e0`
- On close, calls `SaveLoad.autoSave()`
- `customizeBackup` stores colors before editing so Cancel can restore

---

## Chat & Profile Icons (chatProfile.js)

### Icon Button Constants

```js
const ICON_X = 12;       // Left edge x
const ICON_SIZE = 48;    // Width and height
const ICON_GAP = 8;      // Vertical gap between buttons
const ICON_RADIUS = 10;  // Corner radius
```

### `drawIconButton(x, y, active, drawContent)`

Base icon button renderer used by all left-side HUD buttons.

**Styling**:
- Active bg: `rgba(60,60,70,0.85)`, border `rgba(255,255,255,0.4)`
- Inactive bg: `rgba(20,20,28,0.8)`, border `rgba(255,255,255,0.15)`
- Border width: 1.5
- Inner highlight: 1px line at top `rgba(255,255,255,0.06)`
- `drawContent(x, y)` callback renders the icon artwork inside

### Icon Button Types (Vertical Stack, Left Side)

| Button | Y Position | Panel ID | Icon Description |
|--------|-----------|----------|------------------|
| Chat | `12` | `'chat'` | White speech bubble with 3 dots + tail |
| Profile | `12 + ICON_SIZE + ICON_GAP` = `68` | `'profile'` | Smartphone icon with screen lines |
| Map | `12 + (ICON_SIZE + ICON_GAP) * 2` = `124` | (none, always inactive) | Folded 3-panel map with red pin |

### Chat Panel (`drawChatPanel`)

- Position: `px=12, py=BASE_H-320, pw=420, ph=260`
- Background: `rgba(10,10,18,0.85)`, border `rgba(255,255,255,0.12)`, radius 8
- Title: "CHAT" in `bold 13px monospace`, color `#4f8`
- Messages: last 10 of `chatMessages[]`, name in `#fa0`, text in `#ddd`
- Input box: at `py + ph - 32`, 24px tall, placeholder "Type a message..."
- Blinking cursor: `#4f8`, 500ms interval

### Profile Panel (`drawProfilePanel`)

**Layout**: Centered modal with icon grid.
- Grid: 5 columns, 60px icons, 18px gap, 24px label space
- Panel size: `gridW + 64` x `gridH + 120`
- Title bar: player character preview (0.55 scale `drawChoso`) + player name

**MENU_ITEMS** (15 items in 5x3 grid):

| Index | Name | Icon Key |
|-------|------|----------|
| 0 | Inventory | `inventory` |
| 1 | Identity | `id` |
| 2 | Settings | `settings` |
| 3 | News | `news` |
| 4 | Shop | `shop` |
| 5 | Map | `map` |
| 6 | Guide | `guide` |
| 7 | Friends | `friends` |
| 8 | Gangs | `gangs` |
| 9 | Scores | `scores` |
| 10 | PM History | `pm` |
| 11 | Passcode | `passcode` |
| 12 | Bounty | `bounty` |
| 13 | Career | `career` |
| 14 | Challenges | `challenges` |

Each icon is drawn at 1.4x scale via `drawMenuIcon(0, 0, icon)`.
Icon backgrounds: `rgba(30,30,44,0.85)`, border `rgba(255,255,255,0.12)`, radius 10.
Labels: auto-shrinking sans-serif from 14px down to 10px to fit.

**Footer**: "Stats" and "Help" buttons, 80x32, green accent styling.

---

## Toolbox (toolbox.js + panelManager.js)

Tile placement tool system for level design. Panel ID `'toolbox'`.

### State Variables

```js
let toolboxCategory = 0;       // Active category index
let toolboxScroll = 0;         // Scroll offset within category
let activePlaceTool = null;    // { name, color, group, catIdx, itemIdx }
let isDraggingTile = false;    // Mouse held for painting
let removeModeActive = false;  // Hold R to remove tiles
```

### TOOLBOX_CATEGORIES (7 categories)

| Index | Name | Icon | Groups | Item Count |
|-------|------|------|--------|------------|
| 0 | Tilesets | brick emoji | Ground (11), Stone (7), Paths (6), Flooring (8), Water (5), Walls (9) | 46 |
| 1 | Objects | chair emoji | Furniture (9), Nature (11), Structures (10), Urban (8), Dungeon (8) | 46 |
| 2 | NPCs | person emoji | Friendly (10), Enemies (10), Animals (8) | 28 |
| 3 | Guns | gun emoji | Pistols (5), Rifles (5), Shotguns (4), SMGs (4), Special (6) | 24 |
| 4 | Melee | sword emoji | Swords (9), Heavy (5+Battle Axe), Light (7), Shields (4) | ~26 |
| 5 | Armor | shield emoji | Helmets (8), Chestplates (8), Boots (6), Accessories (6) | 28 |
| 6 | Consumables | potion emoji | Potions (8), Food (8), Materials (8), Scrolls & Keys (8) | 32 |

Each item: `{ name: string, color: hex, selected: bool, group: string }`

### `getSelectedToolboxItems()`

Iterates all categories and items, returns array of items where `selected === true`, with `catIdx` and `itemIdx` added.

### `drawSelectedToolbar()`

Draws selected tool icons to the LEFT of the toolbox icon button (top-right area).

- Slot size: 44x44, gap 4px
- Position: starts at `tbX - (count * (slotS + slotGap)) - 4`, y=14
- Active tool (matches `activePlaceTool`): green bg `rgba(60,140,80,0.6)`, accent border, glow
- Inactive: dark bg `rgba(20,20,28,0.85)`, dim border
- Color swatch: 32x22px centered in slot
- Name: `bold 8px monospace` at bottom

### Tile Placement System

**`drawPlacedTiles(camX, camY)`**: Renders all `placedTiles[]` as colored TILE-sized rects with subtle texture (1px dark lines on top/left edges at 8% opacity).

**`drawPlacementPreview(camX, camY)`**: Ghost tile under cursor.
- Normal mode: semi-transparent tile color at 50% opacity + white 1px border
- Remove mode: red X overlay + `rgba(200,40,40,0.3)` bg
- Mode indicator text above cursor: "PLACE" (green) or "REMOVE (R)" (red)

**`placeTileAt(worldPixelX, worldPixelY)`**: Snaps to TILE grid. In remove mode, splices matching tile from `placedTiles[]`. In place mode, replaces or pushes `{ x, y, color, name }`.

### Icon Rendering (`drawToolboxItemIcon`)

Massive switch statement (570+ lines) with procedural pixel-art icons for every item. Categories:
- **Objects**: furniture, nature, structures, urban, dungeon -- each hand-drawn with canvas paths
- **NPCs**: delegates to `drawMiniPerson()` (friendly/enemies) or `drawMiniAnimal()` (animals)
- **Guns**: delegates to `drawMiniGun(cx, cy, s, name, color, type)` where type = pistol/rifle/shotgun/smg/special
- **Melee**: delegates to `drawMiniMelee()` with type = sword/heavy/light/shield
- **Armor**: delegates to `drawMiniArmor()` with type = helmet/chest/boots/accessory
- **Consumables**: `drawMiniPotion()`, `drawMiniFood()`, `drawMiniGem()`, `drawMiniScroll()`, `drawMiniKey()`
- **Default fallback**: colored circle radius `s*0.35`

All icon functions use `s` (scale factor ~12-14px) and `p = Math.round(s/6)` as pixel unit.

---

## Test Mob Panel (testMobPanel.js)

Debug panel for testing mobs. Opened via `/testmob` command. Panel ID `'testmob'`.

### Panel Layout

- Panel: `pw=700, ph=520`, centered on screen
- Background: `#0a0e18`, border `rgba(100,180,220,0.35)`, radius 14
- Header bar: `rgba(20,40,60,0.6)`, title "MOB TESTER" in `#66ccff`
- Close button: 32x32, `PALETTE.closeBtn`

### Left Sidebar (Dungeon + Floor Selection)

- Width: 180px, position: `px+12, py+56`
- Background: `rgba(15,20,30,0.8)`, radius 8

**Dungeon buttons**: 30px tall, 6px gap. Active: `rgba(60,140,200,0.3)` + `#66ccff` border. Inactive: `rgba(30,35,50,0.8)`.

**Floor buttons**: Same sizing, active: `rgba(60,200,120,0.2)` + `PALETTE.accent` border.

### State Variables

```js
let testMobDungeon = 'azurine';   // Current dungeon key
let testMobFloor = 1;             // Current floor number
let testMobScroll = 0;            // Mob grid scroll
let testMobAbilityPopup = null;   // { typeKey, mobName, abilities[], x, y, isBoss }
```

### TESTMOB_DUNGEONS Registry

| Key | Name | Floors |
|-----|------|--------|
| `cave` | Cave Dungeon | 5 (10 mobs each) |
| `azurine` | Azurine City | 5 (10-12 mobs each) |
| `vortalis` | Vortalis | 5 (10 mobs each) |
| `earth205` | Earth-205 | 5 (10 mobs each) |
| `wagashi` | Wagashi | 5 (10 mobs each) |
| `earth216` | Earth-216 | 5 (10 mobs each) |

Validates against `DUNGEON_REGISTRY` at load time.

### Right Area: Mob Grid

- 2 columns, card size `(gridW - 30) / 2` x 52px, gap 6px
- Scrollable with scroll indicator (6px wide, `rgba(100,180,255,0.5)` thumb)

**Mob card contents**:
- Color swatches: shirt + pants colors (10x10, rounded)
- Name: `bold 11px monospace`, boss = `#ff9966`, normal = `#ccc`
- Stats: `HP:{hp} SPD:{speed} DMG:{damage}` in `#777`
- Boss badge: orange `#ff7744` tag
- "FROZEN" button: blue tint `rgba(60,120,200,0.3)`, text `#88bbff`
- "LIVE" button: red tint `rgba(200,80,60,0.3)`, text `#ff8866`

### Mob Card Popup (Right-Click)

Centered overlay card, 260x420px, with:
- Outer glow border (shadow blur 12)
- Boss badge (top-left, if boss)
- HP badge (top-right, green)
- Character portrait area (100px tall, gradient bg)
- Mob name + type subtitle (BOSS/MOB + AI pattern)
- Divider line
- Stat rows (HP, Speed, Damage, AI, etc.)
- Ability list with descriptions from `MOB_ABILITY_DESCRIPTIONS`

### MOB_ABILITY_DESCRIPTIONS Registry

Over 300 ability descriptions covering all dungeons. Each key maps an ability function name to a human-readable string. Organized by dungeon floor:

- **Azurine**: Floors 1-5 (City Streets, Tech District, Junkyard, Trap House, Waste Planet)
- **Vortalis**: Floors 1-5 (Pirate Shores, Jungle/Blood Cove, Moonlit Docks, Sunken Reef, Coral Throne)
- **Earth-205**: Floors 1-5 (Scrapyard, Butcher Row, Carnival of Decay, Casino Noir, Meltdown Labs)
- **Wagashi**: Floors 1-5 (Silk Nest, Jade Temple, Storm Palace, Execution Grounds, Devouring Maw)
- **Earth-216**: Floors 1-5 (Crime & Casino, Cursed Flesh, Spirit & Death, Hell Engines, Fate & Corruption)

Cave mobs have no special abilities (use built-in AI patterns).

### How To Add Descriptions for New Mobs

1. Add the mob's type key to the appropriate floor in `TESTMOB_DUNGEONS`.
2. Add ability descriptions to `MOB_ABILITY_DESCRIPTIONS` using the special function name as key.
3. Validate floor count matches `DUNGEON_REGISTRY.maxFloors`.

### Spawn System (`_testmobSpawn`)

- Enters `test_arena` scene if not already there
- Sets `dungeonFloor`, `_opMode = true`, player HP to 10000, gold to 999999
- Clears all mobs/bullets/effects/telegraphs/hazards
- Spawns mob at `player.x + 150, player.y`
- Frozen mode: `speed = 0`, `_specialTimer = 99999`, `_testDummy = true`

### Test Shoot Bot

Spawned via `/testmob bot left|right`. Stationary bot at spar distance (720px right of player) that fires CT-X bullets.

```js
_testShootBot = {
  x, y, dir: 2,         // faces left
  gunSide,               // 'right' or 'left'
  fireTimer: 0,
  reloadTimer: 0,
  ammo: 30, magSize: 30,
  fireRate: 17,          // ~ROF 50
  reloadTime: 36,        // ~0.6s
  damage: 20,
  hp: 500, maxHp: 500,
};
```

---

## Forge UI (forgeUI.js)

Weapon prestige/upgrade panel. Panel ID `'forge'`. Uses `shopFramework.js` helpers.

### State Variables

```js
let _forgeTab = 0;              // 0 = weapons, 1 = materials
let _forgeSelectedGun = null;   // gun ID string or null (grid vs detail view)
let _forgeScroll = 0;           // Materials tab scroll offset
```

### Constants

```js
const _FORGE_TABS = ['Weapons', 'Materials'];
const _FORGE_PW = 820;   // Panel width
const _FORGE_PH = 580;   // Panel height
const _FORGE_GUN_IDS = ['storm_ar', 'heavy_ar', 'boomstick', 'ironwood_bow', 'volt_9'];

const _MAT_SOURCE_NAMES = {
  cave: 'Cave', azurine: 'Azurine', vortalis: 'Vortalis',
  earth205: 'Earth-205', wagashi: 'Wagashi', earth216: 'Earth-216',
};
```

### Panel Structure

Uses `shopDrawPanel(820, 580)` and `shopDrawHeader()` for consistent styling.

**Grid view** (no gun selected):
- Tabs: "Weapons" / "Materials" via `shopDrawTabs()`
- Back button only shown in detail view: 30x30, green accent, left arrow

**Content area**: `contentY = py + header.barH + (detail ? 8 : 40)`

### Weapons Tab: Grid View (`_drawWeaponGrid`)

5 weapon cards in a centered row:
- Card size: 140x170, gap 12px
- Card content:
  - Tier color top bar (4px, using `PROGRESSION_CONFIG.TIER_COLORS`)
  - Gun icon via `_drawGunsmithIcon()` at 50px scale
  - Gun name: `bold 13px monospace`
  - Tier name + level (e.g., "Rare Lv. 15 / 25")
  - Mini progress bar: `cardW - 32` wide, 8px tall, filled by `(level-1)/24`
  - Prestige stars: 4 stars, filled = tier colors, unfilled = `rgba(60,60,60,0.5)`
  - Not owned: "Not Owned" + buy price hint

### Weapons Tab: Detail View (`_drawWeaponDetail`)

Entered by clicking an owned weapon card.

**Header**: Large gun icon (70px), name, tier + level text.

**Prestige bar**: Segmented into 4 segments (one per tier). Each filled segment uses that tier's color. Stars centered in segments.
- Bar position: `barX = px + pad + 80`, width = `pw - pad*2 - 160`, height 24
- Label: "Prestige:" left, "tier / 4" right

**Level bar**: Single continuous bar, same dimensions.
- Percentage: `(level - 1) / 24`
- Sheen effect: 50% height overlay `rgba(255,255,255,0.1)`

**Action section** (below bars):
- **Max tier + max level**: Shimmer "LEGENDARY MAX" text with pulsing opacity
- **Max level, not max tier**: Evolve/prestige section
- **Below max level**: Upgrade section

### Upgrade Section (`_drawUpgradeSection`)

Material requirement cards in 4-column grid:
- Card size: 160x50, gap 8px
- Each card: color dot (r=5), material name (10px), count "have / need" (bold 12px)
- Sufficient: green bg + border, `#5fca80` count
- Insufficient: red bg + border, `#ff5555` count

**Upgrade button**: 200x40, centered. Green if affordable, gray if not.
- Text: `"UPGRADE -- {gold}g"`
- Stored in `window._forgeUpgradeBtn` for click handling

### Evolve Section (`_drawEvolveSection`)

Similar to upgrade but with:
- Warning text: "Prestiging resets level to 1 but unlocks {tierName} tier stats!"
- Preview bar showing next tier at level 1
- Pulsing evolve button (220x44) with tier-specific glow color
- Text: "PRESTIGE" with star characters
- Stored in `window._forgeEvolveBtn`

### Materials Tab (`_drawMaterialGrid`)

Displays all crafting materials + ores in scrollable 4-column grid:
- Card size: 180x56, gap 6px
- Card: color dot (r=7), name, count, source name (right-aligned)
- Owned: green tint bg, white highlight on dot
- Scroll hint at bottom if more content

### Click Handler (`handleForgeClick`)

Priority chain:
1. Close button (from header)
2. Back button (detail -> grid)
3. Tab clicks (grid view)
4. Weapon card clicks (grid view, weapons tab) -- only opens detail if owned
5. Upgrade button click -> `CraftingSystem.upgrade()`
6. Evolve button click -> `CraftingSystem.evolve()`
7. Click inside panel = consumed (no passthrough)
8. Click outside panel = close forge

### Scroll Handler (`handleForgeScroll`)

Only active on materials tab. Increments/decrements `_forgeScroll` by 1, clamped to `[0, maxScroll]`.
