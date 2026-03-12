# Rendering System

## Overview
The rendering system draws every visual element of the game onto an HTML5 Canvas at a fixed 1920x1080 virtual resolution. It uses a two-phase approach: world-space drawing (tiles, entities, characters, effects) is rendered under a zoom transform (`WORLD_ZOOM = 0.85`), then screen-space HUD and panels are drawn on top at native resolution. All rendering is procedural Canvas 2D drawing with optional spritesheet support via `AssetLoader`.

## Files
- `js/core/draw.js` -- Main `draw()` function, game loop, camera, minimap, HUD, debug overlays, death/respawn screens
- `js/core/tileRenderer.js` -- `drawLevelBackground()` with per-scene tile styles (lobby, cave, dungeon, mine, farm, skeld, etc.)
- `js/client/rendering/entityRenderers.js` -- `ENTITY_RENDERERS` registry (65 entity types) and `drawLevelEntities()` dispatch
- `js/client/rendering/characterSprite.js` -- Color utilities, 3-layer spritesheet system, `drawChar()`, `drawChoso()` (player), `drawGenericChar()` (mobs)
- `js/core/assetLoader.js` -- `AssetLoader` singleton: loads images from `assets/manifest.json`, provides fallback-to-procedural pattern

## Key Functions & Globals

### Canvas & Viewport
- `BASE_W = 1920`, `BASE_H = 1080` -- virtual canvas resolution (defined in `index.html`)
- `WORLD_ZOOM = 0.85` -- world zoom factor; world content is drawn at 85% scale to show more map
- `VIEW_W = BASE_W / WORLD_ZOOM` (~2259px), `VIEW_H = BASE_H / WORLD_ZOOM` (~1271px) -- visible world area in pixels
- `ctx` -- global Canvas 2D rendering context
- `TILE = 48` -- tile size in pixels (from `levelData.js`)

### Camera
- `camera = { x: 0, y: 0 }` -- defined in `inventory.js`
- `updateCamera()` -- centers camera on player, clamped to map bounds: `camera.x = clamp(player.x - VIEW_W/2, 0, MAP_W - VIEW_W)`

### Draw Pipeline
- `draw()` -- main render function called from `gameLoop()`
- `drawLevelBackground(camX, camY)` -- scene-specific tile rendering
- `drawPlacedTiles(camX, camY)` -- user-placed toolbox tiles on top of background
- `drawLevelEntities(camX, camY)` -- dispatches to `ENTITY_RENDERERS` registry
- `drawChar(sx, sy, dir, frame, moving, skin, hair, shirt, pants, name, hp, isPlayer, mobType, maxHp, ...)` -- unified character renderer
- `drawMinimap()` -- full-screen map overlay toggled by M key

### Game Loop
- `gameLoop(timestamp)` -- `requestAnimationFrame` loop at fixed 60 FPS physics timestep
- `FIXED_DT = 1000/60` -- physics tick interval
- Each frame: `translateIntentsToCommands()` -> `authorityTick()` -> `draw()` (draw only when physics updated)

### Color Utilities (characterSprite.js)
- `parseHex(hex)` -- returns `[r, g, b]` from `"#rrggbb"`
- `toHex(r, g, b)` -- returns `"#rrggbb"` from components
- `darkenColor(hex, factor)` -- multiplies RGB by factor (0-1)
- `lightenColor(hex, factor)` -- blends toward white by factor (0-1)
- `skinShadow(hex, amount)` -- warm shadow tone for skin colors (darkens green/blue channels more)
- `skinHighlight(hex, amount)` -- warm highlight for skin (blends toward off-white)

### AssetLoader
- `AssetLoader.init()` -- fetches `assets/manifest.json`, preloads all sprite/entity assets
- `AssetLoader.get(key)` -- returns cached `Image` or `null` (triggers procedural fallback)
- `AssetLoader.getFrame(key, col, row, sizeType)` -- returns `{ img, sx, sy, sw, sh }` for spritesheet frame
- `AssetLoader.preloadScene(sceneName)` -- lazy-loads tileset assets for a scene on transition
- `AssetLoader.ready()` / `AssetLoader.progress()` -- loading state queries

## How It Works

### Main Draw Loop Order
The `draw()` function renders in this strict order:

1. **Clear screen** -- fill with dark background color (`#2a2a3a`)
2. **Begin world-space zoom** -- `ctx.save(); ctx.scale(WORLD_ZOOM, WORLD_ZOOM)`
3. **Tiles** -- `drawLevelBackground(cx, cy)` renders scene-specific floor/wall tiles
4. **User-placed tiles** -- `drawPlacedTiles(cx, cy)` from the toolbox system
5. **Entity overlays** -- `drawLevelEntities(cx, cy)` renders barriers, spawn pads, zones, buildings, furniture, task stations, etc.
6. **Grid overlay** -- optional coordinate grid toggled with G key (every 5th tile labeled)
7. **World-space characters** (translate to camera offset):
   - Upgrade station, staircase, victory celebration (dungeon only)
   - Ore nodes (under characters)
   - Telegraph/hazard ground markers (under characters)
   - Mob ground effects and ambient particles (under characters)
   - **Y-sorted characters** -- player, mobs, Mafia/H&S participants, deli NPCs all sorted by Y coordinate for correct depth
   - Each character drawn via `drawChar()` with status effect overlays (stun, slow, mark, bleed, confuse, disorient)
   - Melee weapon aura effects (ninja dash trail, storm blade lightning, war cleaver cursed energy)
8. **Bullets and projectiles**
9. **Hit effects, damage numbers, kill feed**
10. **End world-space zoom** -- `ctx.restore()`
11. **FOV masks** -- Hide & Seek and Mafia field-of-view (screen-space)
12. **HUD** (screen-space, native 1920x1080):
    - Mode-specific HUDs (Mafia, H&S, cooking, fishing, farming)
    - Weapon HUD (gun stats or melee stats, right side)
    - Hotbar (weapon slots)
    - Skill-specific panels (gunsmith, mining shop, skeld tasks, vent)
    - Special ability bars (Malevolent Shrine, Godspeed, Ninja Dash)
    - Icon buttons (chat, profile, map, toolbox)
    - All panels (chat, profile, shop, identity, stats, toolbox, test mob, settings)
    - Placement preview (toolbox ghost tile)
    - Player HP bar (top center, hidden in Skeld)
    - Dungeon floor/wave info
    - Kill counter (top right, dungeon only)
    - Debug flags (FROZEN, GOD, NOFIRE, speed multiplier, OP)
    - Gold display (dungeon only)
    - Speed tracker (optional, top right)
    - Debug overlay (zoom/scale info, optional)
    - Death/respawn overlay
13. **Customize screen** -- drawn last to cover all HUD
14. **Inventory panel** -- absolute last, full opaque overlay
15. **Zone transition fade** -- black fade with zone name text
16. **Minimap overlay** -- drawn above everything when M key is held

### Camera System
The camera follows the player with direct centering (no smoothing currently). It is clamped so the viewport never shows beyond the map edges:
```
camera.x = clamp(player.x - VIEW_W / 2, 0, MAP_W - VIEW_W)
camera.y = clamp(player.y - VIEW_H / 2, 0, MAP_H - VIEW_H)
```
World objects are drawn at `(worldX - camera.x, worldY - camera.y)`. The zoom transform is applied before camera translation, so all world-space drawing sees a viewport of `VIEW_W x VIEW_H` pixels.

### Tile Renderer
`drawLevelBackground()` in `tileRenderer.js` iterates only over visible tiles (viewport-culled). Each scene has its own visual style:
- **Lobby** -- cyberpunk dark metallic floors with cyan circuit trace accents
- **Cave** -- gray stone floors with rock texture
- **Dungeon** -- stone brick walls with floor tiles that lighten toward center, blood splatters
- **Mine** -- earthy brown stone with pebbles
- **Farm** -- brown dirt outdoors, wooden plank floors indoors
- **Gunsmith** -- dark wooden plank workshop floor
- **Cooking/Deli** -- checkered tile floor with cream walls
- **Hide & Seek** -- dusty concrete with scuff marks and amber light pools
- **Mafia Lobby** -- brownish metal grating
- **The Skeld** -- spaceship interior with metal hull panels, floor grating, hazard stripes
- **Azurine City** -- dark blue-gray floor with neon crack accents

Wall tiles (`collisionGrid[ty][tx] === 1`) get distinct wall/border treatment per scene. All tiles use deterministic pseudo-random variation based on `(tx, ty)` coordinates for visual noise without runtime randomness.

### Entity Renderers
The `ENTITY_RENDERERS` registry maps entity type strings to render functions with signature `(entity, ctx, screenX, screenY, widthTiles, heightTiles)`. The dispatch function `drawLevelEntities()` iterates `levelEntities` and calls the matching renderer for each.

There are currently 65 entity types including:
- **Structural**: `spawnPad`, `barrierH`, `barrierV`, `zone`, `path_v`, `path_h`, `fountain`
- **Nature**: `tree`, `flower`, `bush`, `rock`
- **Buildings**: `building_shop`, `building_house`, `building_tavern`, `building_mine`, `building_chapel`, `building_azurine`, `building_deli`, `building_hideseek`, `building_skeld`
- **Furniture**: `bench`, `table`, `lamp`, `torch`, `neon_light`, `fence`
- **Mine/Cave**: `mine_entrance`, `mine_exit`, `mine_door`, `cave_entrance`, `cave_exit`
- **Deli**: `bread_station`, `meat_station`, `veggie_station`, `sauce_station`, `deli_counter`, `pickup_counter`, `deli_queue_area`, `deli_table`, `deli_chair`, `deli_divider`, `deli_service_counter`, `kitchen_door`, `tip_jar`, `deli_vending`, `deli_condiment_table`, `deli_kitchen_floor`
- **Skeld/Mafia**: `skeld_entrance`, `skeld_task`, `skeld_vent`, `skeld_emergency_table`, `skeld_sabotage`, `skeld_electrical_box`
- **Dungeon**: `dungeon_door`, `queue_zone`, `tower_exterior`
- **Farm**: `farm_vendor`, `farm_well`, `farm_table`, `farm_bed`, `farm_chest`
- **Entrances/Exits**: `azurine_entrance`, `azurine_exit`, `deli_entrance`, `deli_exit`, `house_entrance`, `house_exit`, `skeld_entrance`

### Character Sprite System (3-Layer)
Characters use a Graal-style 3-layer compositing system. Each layer is a separate spritesheet:

1. **Body** (base layer) -- torso, arms, legs, feet
   - Frame size: 32x40 cells (but rendered as 48x64 in-game via `LAYER_SIZES`)
   - Sheet layout: 4 columns x 32 rows = 128x1280 total
   - Columns: Idle, Walk1, Walk2, Walk3
   - Rows: 32 animation states (idle, walk, swing, shoot, dash, grab, push, pull, lift, hold, fish, mine, farm, cook, hurt, dead)

2. **Head** (middle layer) -- face, hair, skin
   - Frame size: 32x32 cells (rendered as 48x48)
   - Sheet layout: 4 columns x 5 rows = 128x160 total
   - Rows: Walk/Idle, Attack, Shoot, Hurt/Dying, Skill

3. **Hat** (top layer) -- headwear, accessories
   - Frame size: 32x32 cells (rendered as 48x48)
   - Sheet layout: 5 columns x 5 rows = 160x160 total
   - Same row mapping as head

All three layers align at center-bottom of the character. Row direction mapping: 0=Down, 1=Up, 2=Left, 3=Right. Column selection: col 0 for idle, cols 1-3 cycle for walking.

The `drawChar()` function is the unified entry point. It first tries `useSpriteMode` (toggled via `/sprites` command), which calls `drawLayeredSprite()` to composite the three sheets. If sprites are unavailable, it falls back to the procedural canvas drawing functions `drawChoso()` (for the player) and `drawGenericChar()` (for mobs/NPCs). Characters are drawn at `CHAR_SCALE = 1.1` with optional per-mob scale.

Template spritesheets are generated at startup by `initTemplatesheets()` for the player and 10 mob types, providing placeholder silhouettes until real art is loaded.

### AssetLoader
The `AssetLoader` singleton manages all external image assets:
1. On startup, `init()` fetches `assets/manifest.json` which lists sprites, entities, and tiles with their file paths
2. Sprite and entity assets are preloaded immediately via `Promise.all`
3. Tile assets are lazy-loaded per scene via `preloadScene(sceneName)` on scene transitions
4. `get(key)` returns the cached `Image` or `null` -- renderers check for `null` and fall back to procedural drawing
5. `getFrame(key, col, row, sizeType)` computes source rectangle from `manifest.frameSize`

### Minimap Rendering
The minimap (`drawMinimap()`, toggled with M key) renders a cached top-down view of the current level:
- Built once per level by `_buildMinimapCache()` onto an off-screen canvas
- Scale factor auto-calculated to fill most of the screen (max ~1600px wide or ~900px tall)
- Walkable tiles shown as `#3a3a5c`, walls as `#12121e`
- Room labels from `MINIMAP_LABELS` drawn with cyan borders and centered text (currently defined for Skeld)
- Task/sabotage dots shown in real-time (cyan for tasks, red for sabotage)
- Player position shown as a pulsing yellow dot
- Dark overlay (`rgba(0,0,0,0.88)`) behind the map

### Debug Overlays
- **Grid overlay** (G key) -- shows tile coordinates every 5 tiles with yellow labels
- **Debug flags HUD** -- shows active dev tool indicators: FROZEN, GOD, NOFIRE, speed multiplier, OP mode
- **Speed tracker** (`gameSettings.showSpeedTracker`) -- displays current movement speed in px/sec, plus CT-X weapon stats
- **Debug overlay** (`gameSettings.showDebugOverlay`) -- shows WORLD_ZOOM, CHAR_SCALE, visible tile count, character height

## Connections to Other Systems
- **Scene Manager** (`sceneManager.js`) -- `Scene.inDungeon`, `Scene.inLobby`, `Scene.inSkeld`, etc. control which HUD elements and tile styles are active
- **Authority Tick** (`authorityTick.js`) -- `gameLoop()` calls `authorityTick()` before `draw()` each frame
- **Input System** (`input.js`) -- `translateIntentsToCommands()` converts `InputIntent` flags to commands before authority tick
- **Level Data** (`levelData.js`) -- `level`, `collisionGrid`, `levelEntities` define what to render
- **Panel System** (`panelManager.js`) -- `UI.isOpen()` checks determine which panels to draw
- **Mafia/H&S Systems** -- `MafiaState`, `HideSeekState` provide participant entities for Y-sorting
- **StatusFX** -- provides player status effect timers for visual overlays
- **Melee System** -- provides special weapon state for aura rendering (ninja trail, storm lightning, cleave energy)
- **Save/Load** -- `gameSettings` (debug overlay, speed tracker, hitbox display) persisted to localStorage

## Gotchas & Rules
- **Draw order is critical** -- world-space items must be drawn between `ctx.save()/ctx.scale()` and `ctx.restore()`. HUD elements are drawn after the restore at native resolution.
- **Y-sorting** -- all characters (player, mobs, Mafia/H&S participants, deli NPCs) are collected into `sortedChars[]` and sorted by Y before drawing. This ensures correct visual depth.
- **Camera is not smoothed** -- it snaps to the clamped player position each frame.
- **Minimap labels use ACTUAL grid coordinates** (virtual + XO offset) for Skeld. The `MINIMAP_LABELS` data uses raw grid coordinates, not virtual coordinates.
- **`WORLD_ZOOM` affects all world drawing** -- anything drawn between the scale save/restore is affected. Screen-space HUD coordinates use `BASE_W`/`BASE_H` directly.
- **Spritesheet row additions** -- when adding any new player/character animation, you MUST ask if new rows are needed for body/head/hat templates and update `assets/manifest.json` frameSize accordingly.
- **AssetLoader returns null for missing assets** -- all renderers must handle this gracefully with procedural fallback. Never assume an image is loaded.
- **Fixed timestep physics** -- the game loop uses accumulator-based fixed timestep at 60 Hz. On high-refresh displays (120Hz+), `draw()` is only called when physics actually updated, capping visual output to 60 FPS.
