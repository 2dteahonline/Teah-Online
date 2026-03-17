# Rendering System

## Overview
The rendering system draws every visual element of the game onto an HTML5 Canvas at a fixed 1920x1080 virtual resolution. It uses a two-phase approach: world-space drawing (tiles, entities, characters, effects) is rendered under a zoom transform (`WORLD_ZOOM = 0.85`), then screen-space HUD and panels are drawn on top at native resolution. All rendering is procedural Canvas 2D drawing with optional spritesheet support via `AssetLoader`.

## Files
- `js/core/draw.js` -- Main `draw()` function, game loop, camera, minimap, HUD, debug overlays, death/respawn screens
- `js/core/tileRenderer.js` -- `drawLevelBackground()` with per-scene tile styles (lobby, cave, dungeon, mine, farm, skeld, etc.)
- `js/core/cameraSystem.js` -- Among Us-style security camera overlay (4 live feeds in 2x2 grid, scan lines, REC indicators)
- `js/client/rendering/entityRenderers.js` -- `ENTITY_RENDERERS` registry (~130 entity types including 16 grocery shelf variants) and `drawLevelEntities()` dispatch
- `js/client/rendering/characterSprite.js` -- Color utilities, 3-layer spritesheet system, `drawChar()`, `drawChoso()` (player), `drawGenericChar()` (mobs), `_charEquipOverride`/`_charColorOverride` for bot rendering
- `js/client/rendering/hitEffects.js` -- `HIT_EFFECT_RENDERERS` registry (73 effect types) and hit effect dispatch
- `js/client/rendering/mafiaFOV.js` -- Wall-aware raycasting FOV overlay, dead body rendering, Mafia HUD, meeting UI, sabotage fix panels, role ability buttons
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
   - **Y-sorted characters** -- player, mobs, Mafia/H&S participants, party bots, deli/diner/fine dining NPCs all sorted by Y coordinate for correct depth
   - Each character drawn via `drawChar()` with status effect overlays (stun, slow, mark, bleed, confuse, disorient)
   - Melee weapon aura effects (ninja dash trail, storm blade lightning, war cleaver cursed energy)
8. **Bullets and projectiles**
9. **Hit effects, damage numbers, kill feed**
10. **End world-space zoom** -- `ctx.restore()`
11. **FOV masks** -- Hide & Seek and Mafia field-of-view (screen-space)
12. **Security camera overlay** -- `CameraSystem.drawOverlay()` when active (full-screen 2x2 camera feed grid)
13. **HUD** (screen-space, native 1920x1080):
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
14. **Customize screen** -- drawn last to cover all HUD
15. **Inventory panel** -- absolute last, full opaque overlay
16. **Zone transition fade** -- black fade with zone name text
17. **Minimap overlay** -- drawn above everything when M key is held

### Camera System
The camera follows the player with direct centering (no smoothing currently). It is clamped so the viewport never shows beyond the map edges:
```
camera.x = clamp(player.x - VIEW_W / 2, 0, MAP_W - VIEW_W)
camera.y = clamp(player.y - VIEW_H / 2, 0, MAP_H - VIEW_H)
```
World objects are drawn at `(worldX - camera.x, worldY - camera.y)`. The zoom transform is applied before camera translation, so all world-space drawing sees a viewport of `VIEW_W x VIEW_H` pixels.

### Security Camera System (`cameraSystem.js`)

Among Us-style security cameras for The Skeld, implemented as a standalone system:

- **`CameraState`**: `{ active, blinking }` -- tracks whether player is viewing and whether wall cameras should blink.
- **4 camera feeds** defined in `SKELD_CAMERAS`, each with an ID, display name, and center tile coordinates:
  - Medbay Hallway (40, 10), Security Hallway (20, 34), Admin Hallway (76, 44), Comms Hallway (87, 62)
- **Rendering**: `drawOverlay()` renders a 2x2 grid of feeds at 60% screen size. Each feed draws:
  - Tiles from the collision grid (wall/floor distinction)
  - Entities via `ENTITY_RENDERERS` dispatch
  - Participants via `drawChar()` (bots and player)
  - Dead bodies (Among Us-style half-body)
- **Visual effects per feed**: Green security tint, scan lines, sparse static noise, blinking REC indicator (top-left), camera name label (bottom-left), real-time timestamp (bottom-right).
- **Interaction**: Enter by interacting with the camera console entity. Exit via X/Escape key or close button. Player is frozen in place while viewing.
- **Wall camera mounts** (`skeld_camera_mount` entities) blink red when `CameraState.blinking` is true.
- Integrated into `draw()` at line ~2153: `if (CameraSystem.isActive()) CameraSystem.drawOverlay()`.

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

There are currently ~130 entity types including:
- **Structural**: `spawnPad`, `barrierH`, `barrierV`, `zone`, `path_v`, `path_h`, `fountain`, `version_sign`
- **Nature**: `tree`, `flower`, `bush`, `rock`
- **Buildings**: `building_shop`, `building_house`, `building_tavern`, `building_mine`, `building_chapel`, `building_azurine`, `building_deli`, `building_diner`, `building_hideseek`, `building_skeld`, `building_fine_dining`, `building_casino`
- **Furniture**: `bench`, `table`, `lamp`, `torch`, `neon_light`, `fence`
- **Mine/Cave**: `mine_entrance`, `mine_exit`, `mine_door`, `cave_entrance`, `cave_exit`
- **Deli**: `bread_station`, `meat_station`, `veggie_station`, `sauce_station`, `deli_counter`, `pickup_counter`, `deli_queue_area`, `deli_table`, `deli_chair`, `deli_divider`, `deli_service_counter`, `kitchen_door`, `deli_vending`, `deli_condiment_table`, `deli_kitchen_floor`
- **Deli Grocery Shelves** (16 variants via `SHELF_TYPES` + `_shelfRenderer`): `deli_shelf_canned`, `deli_shelf_snacks`, `deli_shelf_drinks`, `deli_shelf_cereal`, `deli_shelf_bread`, `deli_shelf_pasta`, `deli_shelf_sauces`, `deli_shelf_dairy`, `deli_shelf_frozen`, `deli_shelf_produce`, `deli_shelf_candy`, `deli_shelf_baking`, `deli_shelf_spices`, `deli_shelf_cleaning`, `deli_shelf_cookies`, `deli_shelf_soups`
- **Diner**: `diner_booth`, `diner_booth_table`, `diner_booth_seat`, `arcade_cabinet`, `diner_jukebox`, `diner_floor`, `diner_counter`, `diner_pickup_counter`, `diner_service_counter`, `diner_kitchen_floor`, `kitchen_door_diner`
- **Fine Dining**: `fine_dining_entrance`, `fine_dining_exit`
- **Casino**: `casino_carpet`, `casino_bar`, `casino_pillar`, `casino_blackjack`, `casino_roulette`, `casino_coinflip`, `casino_cases`, `casino_mines`, `casino_dice`, `casino_rps`, `casino_baccarat`, `casino_slots`, `casino_keno`
- **Skeld/Mafia**: `skeld_entrance`, `skeld_task`, `skeld_vent`, `skeld_emergency_table`, `skeld_sabotage`, `skeld_electrical_box`, `skeld_camera_mount`, `skeld_cameras`
- **Dungeon**: `dungeon_door`, `queue_zone`, `tower_exterior`
- **Farm**: `farm_vendor`, `farm_well`, `farm_table`, `farm_bed`, `farm_chest`, `farm_zone`
- **Entrances/Exits**: `azurine_entrance`, `azurine_exit`, `deli_entrance`, `deli_exit`, `diner_entrance`, `diner_exit`, `house_entrance`, `house_exit`, `skeld_entrance`

### Hit Effect Renderers
The `HIT_EFFECT_RENDERERS` registry maps effect type strings to render functions with signature `(h, ctx, alpha)`. There are currently 73 effect types including:
- **Core combat**: `kill`, `hit`, `crit`, `explosion`, `cleave_hit`
- **Elemental**: `frost_hit`, `frost_nova`, `burn_hit`, `burn_tick`, `inferno_explode`, `lightning`, `ground_lightning`
- **Status**: `poison_hit`, `poison_tick`, `heal`, `heal_zone`, `heal_beam`, `mob_heal`, `stun`, `buff`
- **Melee weapons**: `blood_slash_hit`, `blood_slash_arc`, `blood_slash`, `ninja_dash`, `ninja_activate`, `ninja_aoe`, `ninja_slash`, `ninja_dash_end`
- **Ranged weapons**: `pipe_hit`, `slingshot_impact`, `flamethrower_tick`, `nail_pin`, `glass_slash`, `sledgehammer_shockwave`, `cleaver_slash`, `chain_hit`, `flare_burst`, `grenade_explosion`, `pin_pop`, `sandbag_drop`, `sonic_wave`, `stiletto_stab`, `chemical_beam`, `meltdown_pulse`
- **Boss/special**: `shockwave`, `thorns`, `stomp`, `arrow_bounce`, `arrow_fade`, `summon`, `mummy_explode`
- **Nautical dungeon**: `water_geyser`, `anchor_sweep`, `ink_splash`, `coral_spike`, `fear_swirl`, `tether_chain`, `shield_block`, `reflect_spark`, `ghost_ship`, `kraken_tentacle`, `whirlpool`, `trident_slash`, `poison_puddle`, `cannon_explosion`
- **Ability**: `godspeed_activate`, `shrine_activate`, `shrine_slash`
- **Utility**: `text_popup`, `grab`, `cast`, `smoke`

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

#### Bot Equipment Override System (`_charEquipOverride`)

When rendering party bots, the game needs `drawChoso()` to use the bot's equipment instead of the player's global state. This is accomplished via a save/restore globals pattern:

```
// Set overrides before drawChar()
_charEquipOverride = botMember.equip;      // bot's equip object (replaces playerEquip)
_charColorOverride = { skin, hair, shirt, pants };  // bot's colors

// Save player state
const _savedSlot = activeSlot;
const _savedRecoil = gun.recoilTimer;
activeSlot = 0;                            // bots always show gun
gun.recoilTimer = bot.gun.recoilTimer;     // bot's own recoil

// Draw the bot via drawChar() — drawChoso reads _charEquipOverride
drawChar(entity.x, entity.y, ...);

// Restore player state
_charEquipOverride = null;
_charColorOverride = null;
activeSlot = _savedSlot;
gun.recoilTimer = _savedRecoil;
```

This pattern ensures `drawChoso()` renders the bot's armor, weapon, and colors without modifying any permanent player state. The overrides are checked inside `drawChoso()` and used in place of `playerEquip`/player colors when non-null.

### Party Bot Rendering Pipeline (draw.js ~lines 934-980)

Party bots are rendered within the Y-sorted character loop alongside mobs, the player, and NPCs. The rendering pipeline:

1. **Equipment override setup**: Set `_charEquipOverride` to the bot's `equip` object and `_charColorOverride` to the bot's skin/hair/shirt/pants.
2. **Weapon state swap**: Save player's `activeSlot` and `gun.recoilTimer`, set bot's values (slot 0, bot's own recoil timer).
3. **Death animation**: If `_pm.dead`, draw with rotation animation (`_deathRotation` from 0 to PI/2) and fading opacity. HP passed as `-1` to suppress HP bar.
4. **Alive rendering**: Draw with damage flash (`_contactCD > 0` toggles 50% opacity) and status effect visual tints via `ctx.filter`:
   - Burn: `sepia(0.4) saturate(1.5)`
   - Slow: `hue-rotate(180deg) saturate(0.6)`
   - Stun: `brightness(1.5) saturate(0.3)`
5. **Cleanup**: Reset `_charEquipOverride`, `_charColorOverride`, `activeSlot`, and `gun.recoilTimer` to player values.

### Mafia FOV Rendering (Wall-Aware Raycasting)

The Mafia FOV uses a raycasting polygon approach, not a simple circle gradient. This is critical -- the old circle approach allowed players to see through walls.

- **`buildFOVOccluderCache()`**: Builds flat `Uint8Array` collision grid + extracts wall-boundary vertices. Cached per level.
- **Boundary vertex extraction**: Grid points where at least one adjacent tile is solid AND at least one is empty.
- **Ray generation**: 3 rays per boundary vertex (center +/- epsilon) + 72 fill rays (every 5 degrees). Total ~200-500 rays/frame.
- **DDA raycasting**: Each ray walks through the collision grid until hitting a wall tile or exceeding FOV radius.
- **Visibility polygon**: Sorted ray endpoints form a polygon cutout in a dark overlay (`rgba(0,0,0,0.93)` with `blur(12px)`).
- **Raycast origin lerped** (0.35 blend) toward player position for smooth shadow movement.
- **Lights sabotage dimming**: `_lightsDimProgress` smoothly fades 0 to 1 over 180 frames (3s), shrinking FOV to 35% of normal. Impostors unaffected.
- **O2 sabotage fog**: Progressive darkening overlay for crewmates as timer runs down.
- **`isMafiaWorldPointVisible()`**: Tests whether a world point falls inside the visibility polygon. Gates rendering of bots, bodies, task indicators, and sabotage panels -- environment tiles remain softly readable through darkness.
- **Ghost players** see full map (FOV overlay skipped).
- **Only wall tiles block FOV** -- solid entities do not.
- **Pre-allocated offscreen buffer**: Canvas allocated once, cleared with `clearRect` each frame (not reallocated).

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
- Room labels from `MINIMAP_LABELS` drawn with cyan borders and centered text (currently defined for Skeld with 14 rooms: Cafeteria, Upper Engine, Reactor, MedBay, Security, Lower Engine, Electrical, Admin, Storage, Shields, Comms, Weapons, O2, Navigation)
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
- **Party System** -- `PartySystem.members` provides party bot entities for Y-sorting and bot-specific rendering pipeline
- **Camera System** (`cameraSystem.js`) -- `CameraSystem.drawOverlay()` renders security camera feeds over the main viewport
- **StatusFX** -- provides player status effect timers for visual overlays
- **Melee System** -- provides special weapon state for aura rendering (ninja trail, storm lightning, cleave energy)
- **Save/Load** -- `gameSettings` (debug overlay, speed tracker, hitbox display) persisted to localStorage

## Gotchas & Rules
- **Draw order is critical** -- world-space items must be drawn between `ctx.save()/ctx.scale()` and `ctx.restore()`. HUD elements are drawn after the restore at native resolution.
- **Y-sorting** -- all characters (player, mobs, Mafia/H&S participants, party bots, deli/diner/fine dining NPCs) are collected into `sortedChars[]` and sorted by Y before drawing. This ensures correct visual depth.
- **Camera is not smoothed** -- it snaps to the clamped player position each frame.
- **Minimap labels use ACTUAL grid coordinates** (virtual + XO offset) for Skeld. The `MINIMAP_LABELS` data uses raw grid coordinates, not virtual coordinates.
- **`WORLD_ZOOM` affects all world drawing** -- anything drawn between the scale save/restore is affected. Screen-space HUD coordinates use `BASE_W`/`BASE_H` directly.
- **Spritesheet row additions** -- when adding any new player/character animation, you MUST ask if new rows are needed for body/head/hat templates and update `assets/manifest.json` frameSize accordingly.
- **AssetLoader returns null for missing assets** -- all renderers must handle this gracefully with procedural fallback. Never assume an image is loaded.
- **Fixed timestep physics** -- the game loop uses accumulator-based fixed timestep at 60 Hz. On high-refresh displays (120Hz+), `draw()` is only called when physics actually updated, capping visual output to 60 FPS.
- **Bot equipment override must be cleaned up** -- `_charEquipOverride` and `_charColorOverride` MUST be set back to `null` after drawing each bot. Failing to reset causes the player to render with the last bot's equipment.
- **`ctx.filter` must be reset** -- Status effect tints (`sepia`, `hue-rotate`, `brightness`) applied via `ctx.filter` for bots must be reset to `'none'` after drawing. Filter state leaks to subsequent draw calls.
- **Canvas offscreen buffer: allocate ONCE** -- setting `buf.width/height` every frame causes expensive GPU reallocation. Use `clearRect` instead.
- **FOV uses raycasting polygon, not circle gradient** -- the circle gradient was replaced because it allowed seeing through walls. DDA raycasting + polygon cutout is the correct approach.
