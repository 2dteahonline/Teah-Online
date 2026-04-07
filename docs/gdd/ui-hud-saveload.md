# UI, HUD, Rendering, Save/Load, Commands, Events

## Source of truth

- `js/client/ui/casinoUI.js` — casino panel rendering (10 games)
- `js/client/ui/chatProfile.js` — chat/profile/map icon buttons
- `js/client/ui/customize.js` — character customization panel
- `js/client/ui/forgeUI.js` — forge/crafting panel
- `js/client/ui/inventory.js` — inventory panel + gameplay camera (updateCamera)
- `js/client/ui/panelManager.js` — UI singleton, panel registry, keyboard handling, debug commands
- `js/client/ui/panels.js` — identity, stats, gunsmith, mining shop panels
- `js/client/ui/settings.js` — settings data, keybinds, gameSettings
- `js/client/ui/shopFramework.js` — reusable shop panel helpers
- `js/client/ui/testMobPanel.js` — dev mob spawning panel
- `js/client/ui/toolbox.js` — tile placement toolbox
- `js/core/saveLoad.js` — localStorage persistence (schema v10)
- `js/core/draw.js` — main render pipeline, HUD, minimap, gameLoop
- `js/core/assetLoader.js` — sprite/tile asset loader
- `js/authority/commands.js` — command queue (client→authority message contract)
- `js/authority/eventBus.js` — pub/sub Events system
- `js/authority/snapshots.js` — GameState serialization
- `js/client/rendering/characterSprite.js` — 3-layer Graal character renderer
- `js/client/rendering/entityRenderers.js` — ENTITY_RENDERERS registry
- `js/client/rendering/hideSeekFOV.js` — Hide & Seek fog-of-war
- `js/client/rendering/mafiaFOV.js` — Mafia fog-of-war

## Purpose

The UI layer is canvas-drawn screen-space panels operating over a world-space rendered game. A single `UI` singleton (`panelManager.js`) gates which panel is active so only one main panel opens at a time. The draw pipeline in `draw.js` runs at fixed 60Hz after authority simulation, rendering tiles → entities → Y-sorted characters → effects → HUD → panels. Save/Load persists identity, cosmetics, settings, keybinds, progression, and materials to `localStorage` under schema version 10.

## Values

### Canvas / viewport

| Name | Value | Units | Citation |
|---|---|---|---|
| BASE_W | 1920 | px | index.html:22 |
| BASE_H | 1080 | px | index.html:22 |
| WORLD_ZOOM | 0.85 | — | index.html:23 |
| VIEW_W | BASE_W / WORLD_ZOOM (~2259) | px | index.html:24 |
| VIEW_H | BASE_H / WORLD_ZOOM (~1271) | px | index.html:25 |
| TILE | 48 | px | js/shared/levelData.js:5 |
| FIXED_DT | 1000 / 60 | ms | js/core/draw.js:2946 |
| maxUpdates (per frame) | 4 | ticks | js/core/draw.js:2979 |
| elapsed cap | 100 | ms | js/core/draw.js:2955 |

### Save schema

| Name | Value | Citation |
|---|---|---|
| SAVE_KEY | `"dungeon_game_save"` | js/core/saveLoad.js:8 |
| SAVE_VERSION | 10 | js/core/saveLoad.js:9 |
| autoSave debounce | 1000 ms | js/core/saveLoad.js:381 |

---

## UI Panel Manager (`panelManager.js`)

### Purpose
Centralized panel state. `UI._active` holds current main panel id or null. Opening a new panel auto-closes the active one and runs onClose → onOpen hooks.

### API (js/client/ui/panelManager.js:10-45)
- `UI.register(id, {onOpen, onClose})`
- `UI.open(id)` — closes current then opens
- `UI.close(specificId?)` — closes active if matches
- `UI.toggle(id)`
- `UI.isOpen(id)` / `UI.anyOpen()` / `UI.active`

### Registered panels (js/client/ui/panelManager.js:48-88)

| id | onOpen / onClose hook | Citation |
|---|---|---|
| chat | open: `chatInputActive=true, InputIntent.chatActive=true, chatInput=""`; close: clears chat active | :48 |
| profile | close: `statusEditActive=false` | :52 |
| settings | (none) | :55 |
| shop | (none) | :56 |
| inventory | close: `cardPopup=null` | :57 |
| identity | close: resets statusEdit, stats, nameEdit, faction/relationship/country/language popups | :60 |
| customize | close: resets hexInput; calls `SaveLoad.autoSave()` | :67 |
| toolbox | close: keeps activePlaceTool | :70 |
| fishVendor | open: `fishVendorTab=0` | :73 |
| gunsmith | open: `_gunsmithSelected=0` | :76 |
| casino | close: clears `_casinoBetEditing`, calls `casinoReset()` | :79 |
| farmVendor | open: `farmVendorTab=0` | :85 |
| miningShop | (none) | :88 |

### Keyboard input handling (panelManager.js)

| Key | Action | Citation |
|---|---|---|
| `m` | toggle minimap | :991 |
| `p` | toggle grid overlay (named "gridOverlayOpen") | :999 |
| `r` (with active place tool) | toggle remove mode | :1007 |
| escape (with place tool) | clear placement tool | :1012 |
| `r` (reload, if ammo<mag) | `InputIntent.reloadPressed=true` | :1050 |
| `f` | melee + ultimate pressed | :1053 |
| `q` (Skeld) | `MafiaSystem.tryKill()` | :1058 |
| `r` (Skeld) | `MafiaSystem.tryReport()` | :1064 |
| shift | dash pressed | :1069 |
| `x` (cameras open) | exit CameraSystem | :1073 |
| `t` (Skeld, tracker) | `MafiaSystem.tryTrack()` | :1081 |
| `f` (Skeld, shapeshifter) | toggle shift panel / unshift | :1085 |
| `f` (Skeld, phantom) | `MafiaSystem.toggleInvisibility()` | :1095 |
| `v` (Skeld, scientist) | `MafiaSystem.toggleVitals()` | :1099 |
| keybinds.interact | `InputIntent.interactPressed=true` | :1109 |
| keybinds.identity | toggle identity (or joinQueue if near queue) | :1112 |
| `n` (opMode) | `skipWavePressed` | :1116 |
| `g` (inDungeon) | `readyWavePressed` | :1119 |
| slot1..4 | set slot intent; potion intent if slot is potion | :1126 |
| slot5 | `slot5Pressed` (grab) | :1134 |
| chat input max length | 80 chars | :912 |
| name edit max length | 16 chars | :956 |
| status edit max length | 60 chars | :972 |
| chatMessages max | 50 | :902 |

### Chat text commands (panelManager.js:509-891)

All commands are matched via `cmdLower.startsWith()` on chat input.

| Command | Signature | Effect | Citation |
|---|---|---|---|
| `/addgold`, `/gold` | `/gold [n]` | Adds n (or 500) gold | :509 |
| `/wave` | `/wave [n]` | Wave control | :514 |
| `/heal` | `/heal` | Sets `player.hp = player.maxHp` | :529 |
| `/dung` | `/dung <type>` | Teleport to dungeon | :530 |
| `/trace` | `/trace <arg>` | Trace recorder control | :558 |
| `/floor` | `/floor <n>` | Set dungeon floor | :599 |
| `/spawn` | `/spawn ...` | Spawn via args | :626 |
| `/testmob bot` | `/testmob bot [left|right]` | Spawn test bot | :651 |
| `/test` | `/test ...` | Test/sprite toggle block | :661 |
| `/export` | `/export ...` | Export data | :703 |
| `/speed` | `/speed <n>` | Sets `window._gameSpeed` (game loop reads it) | :739, :2960 |
| `/hp` | `/hp <n>` | HP set | :749 |
| `/gun` | `/gun <id> [tier] [level]` | Give main gun | :799 |
| `/role` | `/role <team or subrole>` | Mafia debug role | :832 |
| `/sabo` | `/sabo <reactor|o2|lights>` | Mafia sabotage | :850 |
| `/party` | `/party <1-4> | /party reset` | Set party size / reset | :875 |

Note: `/tp`, `/mob`, `/freeze` mentioned in CLAUDE.md are NOT present as startsWith branches in panelManager.js chat handler — they are UNKNOWN in this cluster (may exist elsewhere).

---

## Settings system (`settings.js`)

### Tabs (js/client/ui/settings.js:6)
`["General", "Keybinds", "Sounds", "Indicators", "Profile", "Message", "Privacy"]`

### Default keybinds (js/client/ui/settings.js:13-18)

| Action | Default key |
|---|---|
| moveUp / moveDown / moveLeft / moveRight | w / s / a / d |
| shootUp / shootDown / shootLeft / shootRight | arrowup / arrowdown / arrowleft / arrowright |
| slot1..slot5 | 1 / 2 / 3 / 4 / 5 |
| chat | tab |
| profile | h |
| interact | e |
| identity | z |

### gameSettings defaults (js/client/ui/settings.js:65-103)

| Key | Default | Citation |
|---|---|---|
| nicknames | true | :67 |
| animations | true | :68 |
| dayNightWeather | false | :69 |
| bloodAnim | true | :70 |
| deathAnim | true | :71 |
| hotbarPosition | "right" | :72 |
| spriteMode | false | :73 |
| showDebugOverlay | false | :74 |
| showSpeedTracker | false | :75 |
| masterVolume / sfx / music / ambient | true | :77-80 |
| damageNumbers / healthBars | true | :82-83 |
| mobHpText | false | :84 |
| killFeed / waveAnnounce / playerHpBar | true | :85-87 |
| showOwnHitbox / showOtherHitbox | true | :88-89 |
| privateStats | false | :91 |
| language | "English" | :92 |
| currency | "USD" | :93 |
| showOnlineTime | true | :94 |
| relationshipStatus | "Single" | :95 |
| chatVisibility | "All" | :97 |
| pmFriendsOnly | false | :98 |
| disableAllMessages | false | :99 |
| receiveBotMessages | true | :100 |
| appearOffMap | false | :102 |

### Settings panel layout (`drawSettingsPanel`, js/core/saveLoad.js:438-667 — defined in saveLoad file despite purpose)

| Field | Value | Citation |
|---|---|---|
| panel width × height | 520 × 480 | :440 |
| bg | `rgba(8,8,14,0.92)` | :444 |
| border | `#2a6a4a` 2px | :446-447 |
| title bar | 34 px | :452 |
| close button | 28×28 rounded 4 at `px+pw-36, py+6` | :460 |
| tab height | 26 px | :473 |
| row height (general) | 36 px | :494 |
| keybind row height | 38 px | :563 |
| toggle switch | 44×22, knob circle radius = (sh-6)/2 | :513-530 |
| select button | 130×24 | :535 |
| scrollbar width | 6 px; min thumb 30px | :649-652 |
| reset defaults button | 160×28 at bottom, `rgba(200,60,60,0.2)` | :628-631 |

---

## Save / Load (`saveLoad.js`) — Schema v10

`SAVE_KEY = "dungeon_game_save"` (:8), `SAVE_VERSION = 10` (:9). Stored as JSON in `localStorage`. Auto-save debounce = 1000 ms (:381).

### Top-level fields (saved object)

| Field | Type | Source | Citation |
|---|---|---|---|
| `version` | int (10) | SAVE_VERSION | :27 |
| `keybinds` | `{action: key}` clone | global `keybinds` | :28 |
| `settings` | clone of `gameSettings` | — | :29 |
| `identity` | `{name, status, faction, country, gender}` | player + globals | :30-36 |
| `cosmetics` | 19 keys (see below) | `player[k]` | :37-41 |
| `progression` | `{playerLevel, playerXP, skillData, gunLevels, pickaxeLevels, discoveredOres}` | — | :43-50 |
| `fishing` | `{baitCount, stats}` | `fishingState` | :52-55 |
| `farming` | `{landLevel, equippedHoe, bucketOwned, stats}` | `farmingState` | :58-64 |
| `quickSlots` | array of 4 | `quickSlots` | :67 |
| `cookingProgress` | `{lifetimeOrdersTotal, lifetimeOrdersByShop, purchasedShops}` | `cookingProgress` | :70-74 |
| `sparProgress` | deep clone | `sparProgress` | :77 |
| `sparLearning` | deep clone | `sparLearning` | :81 |
| `gunSettings` | deep clone | `_gunSettings` | :85 |
| `ctxSliders` | `{freeze, rof, spread}` | `_ctxFreeze, _ctxRof, _ctxSpread` | :89 |
| `materials` | `{id: count}` | walk inventory, items of type='material' | :92-99 |

### Cosmetic keys (saveLoad.js:20-22)
`skin, hair, shirt, pants, shoes, hat, glasses, gloves, belt, cape, tattoo, scars, earring, necklace, backpack, warpaint, eyes, facialHair, headId`

### cookingProgress defaults (saveLoad.js:12-16)
```
lifetimeOrdersTotal: 0
lifetimeOrdersByShop: {}
purchasedShops: ['street_deli']
```

### Load behavior notes

- Rejects save if `!data.version || data.version < 1` (:111)
- Migrates `s.playerIndicator` → `showOwnHitbox=s.playerIndicator, showOtherHitbox=true` (:126-129)
- Gun progression supports legacy integer format → migrated to `{tier:0, level:N}` (:173-179)
- On load, re-creates owned gun items in inventory via `createMainGun` (:187-193)
- Pickaxe progression same pattern (:196-220)
- v3→v4 fishing migration: if `f.rodTier>=0`, adds rod to inventory as melee item (:240-246)
- v1-v7 sparLearning: wiped and replaced with defaults from `createDefaultSparLearning()` (:278-283)
- v8+ sparLearning: deep merge, clamped to `history.length <= 20` (:284-299)
- v10 materials: restored via `createMaterialItem(matId, count)` (:313-321)
- Farming migration: if old hoe was a melee weapon with `special==='farming'`, migrate to `farmingState.equippedHoe` and restore `DEFAULT_MELEE` (:336-357)
- quickSlots: 4 slots, backfills from older 3-slot saves (:360-365)
- Session-only (not saved): gold, inventory (except materials), equipment — dungeon roguelike design (:166)

---

## Asset Loader (`assetLoader.js`)

| Field | Value | Citation |
|---|---|---|
| _basePath | `"assets/"` | :11 |
| manifest path | `assets/manifest.json?v=<Date.now()>` | :21 |
| default frame size | `[48, 48]` | :106 |
| preload categories | `sprites`, `entities` (tiles scene-lazy) | :30-41 |
| `getFrame(key, col, row, sizeType?)` returns `{img, sx, sy, sw, sh}` | col×sw, row×sh | :101-116 |
| `getTileset(sceneName)` → `get('tile_' + sceneName)` | — | :89-91 |

Auto-initialized on script load at :157.

---

## Event Bus (`eventBus.js`)

`Events = { _listeners, on(event, cb), off(event, cb), emit(event, data), clear() }` (:10-32)

Emitter wraps callbacks in `try/catch` and `console.error`s on handler failure (:25-27).

Known event names listed in header (:8-9): `mob_killed, wave_cleared, wave_started, player_damaged, player_died, floor_changed`.

---

## Command Queue (`commands.js`)

Server-authority ready plain-JSON messages. `window.CommandQueue = []` (:23). Pushed via `enqueueCommand(cmd)` which also mirrors to a 200-entry history ring (`_cmdHistoryMax = 200`, :27).

### Command types (commands.js:8-22)

| type | data |
|---|---|
| `move` | `{x: -1|0|1, y: -1|0|1}` |
| `shoot` | `{held: bool, aim: {mouseX, mouseY, arrowAimDir, arrowShooting}}` |
| `melee` | `{}` |
| `reload` | `{}` |
| `dash` | `{}` |
| `interact` | `{}` |
| `usePotion` | `{}` |
| `slot` | `{slot: 0|1|2}` |
| `useExtra` | `{}` |
| `grab` | `{}` |
| `readyWave` | `{}` |
| `skipWave` | `{}` |
| `ultimate` | `{}` |
| `fish_reel` | `{held: bool}` (:110) |

### translateIntentsToCommands (commands.js:40-112)

Per tick: movement is emitted every frame (zero vector if typing or a non-toolbox panel is open). Shoot emitted every non-typing tick. One-frame intents (reload, melee, dash, interact, ultimate, skipWave, readyWave, slot1..3) emitted when flag set. Slot4→`useExtra`, slot5→`grab`. Potion emitted only if not overlapping a slot key press (:99).

`DEBUG_dumpCommands(n=30)` prints last N from history (:116-125).

---

## Snapshots (`snapshots.js`)

`serializeGameState()` returns JSON-safe GameState for multiplayer. Schema version `v: 1` (:20).

Included (js/authority/snapshots.js:16-120, partial read):

- Player: x, y, vx, vy, knockVx, knockVy, speed, baseSpeed, dir, frame, animTimer, moving, hp, maxHp, name, + 18 cosmetic keys (:23-37)
- Wave/combat: wave, waveState, kills, dungeonFloor, gold, activeSlot, lives, contactCooldown, waveTimer (:40-48)
- Death: playerDead, deathTimer, deathX, deathY, deathRotation, deathGameOver, respawnTimer (:51-57)
- Poison: poisonTimer, poisonTickTimer (:60-61)
- Dungeon: stairsOpen, dungeonComplete, reviveUsed, currentDungeon, dungeonReturnLevel, fireRateBonus (:64-69)
- Grab: isGrabbing, grabTimer, grabTargetId (:72-74)
- Scene: `Scene.current` (:77)
- Gun snapshot (:80-89): ammo, magSize, reloading, reloadTimer, fireCooldown, damage, recoilTimer, special
- Melee snapshot (:92-120): damage, range, arcAngle, cooldown, cooldownMax, swinging, swingTimer, swingDuration, swingDir, knockback, critChance, special, dashing, dashTimer, dashDuration, dashSpeed, dashDirX/Y, dashStartX/Y, dashTrail (map to {x,y,life}), dashesLeft, dashChainWindow, dashCooldown, dashCooldownMax, dashActive, dashGap

Excluded (per header :11-13): UI state, DOM, chat, mouse, keysDown, ctx, panels, cosmetic particles (hitEffects, deathEffects, mobParticles), camera, transition, rendering timers.

---

## Draw pipeline (`draw.js`)

### Game loop (draw.js:2951-3018)
1. Clamp `elapsed` to ≤100 ms (:2955)
2. Apply `window._gameSpeed` multiplier (:2960) and training speed multiplier (:2963-2965)
3. Accumulator integrates elapsed; fixed timestep loop runs up to `maxUpdates` ticks (4 default, :2979) at `FIXED_DT = 1000/60` ms (:2946)
4. Each tick: `translateIntentsToCommands()` → `TraceRecorder.recordTick()` → `authorityTick()` (:2983-2987)
5. Render only when `updates > 0` (caps to 60 FPS) (:2993)
6. Training mode variants skip or interval-limit `draw()` (:2994-3009)
7. `requestAnimationFrame(gameLoop)` unless training uses `setTimeout` scheduler (:3014-3017)

### draw() pipeline (draw.js:187+)

Order of draws inside `draw()`:

1. Clear screen (`#2a2a3a`) (:190-191)
2. `ctx.save(); ctx.scale(WORLD_ZOOM, WORLD_ZOOM)` — begin world-space (:194-195)
3. `drawLevelBackground(cx, cy)` (:200)
4. `drawPlacedTiles(cx, cy)` — toolbox-placed tiles on top of background (:203)
5. `updateMafiaFOVCache()` (:206)
6. `drawLevelEntities(cx, cy)` (:209)
7. Grid coordinate overlay if `gridOverlayOpen` — 10px mono labels every 5 tiles (:212-245)
8. `ctx.save(); ctx.translate(-cx, -cy)` — camera offset (:247-248)
9. Build sortedChars list: player, mobs (hp>0), partyBots, HideSeek participants, Mafia bodies, Mafia participants (FOV-gated), deliNPCs, dinerNPCs, fineDiningNPCs + waiter + host, spar bots (:250-306). Sort by `y` ascending (:307)
10. Upgrade station, staircase, victory celebration (dungeon only) (:253-257)
11. Farm tiles and countdown bubble (:310-311)
12. Ore nodes, ore pickups, ground drops (:314-316)
13. Telegraph system, Hazard system ground effects (:319-321)
14. `drawMobGroundEffects()`, `drawMobAmbientEffects()` (:324-326)
15. Iterate sortedChars and draw each (player with death-rot/vent/shift/phase/invisible variants, mobs, bots, NPCs) (:328+)
16. Interactable prompts (Skeld task/vent/sabotage and Mafia lobby) (:2218-2241)
17. `ctx.restore()` — end world-space (:2244)
18. Screen-space FOV masks: `drawHideSeekFOV()`, `drawMafiaFOV()` (:2247-2249)
19. Screen-space HUDs: HideSeek/Mafia/MafiaLobby HUD, Gun HUD, Melee HUD, Hotbar, Cooking, Fishing, Fish vendor, Farming, Farm vendor, Gunsmith, Mining shop, Forge, Casino, Spar HUD, Camera overlay, Skeld task panel + list, Vent HUD (:2252-2271)
20. Shrine charge bar (cleave + dungeon): 120×12 at `BASE_W/2 - 60, BASE_H - 90` (:2277-2279)
21. `drawMinimap()` (:2858)

### Minimap (draw.js:10-184)

| Field | Value | Citation |
|---|---|---|
| Room labels registry | `MINIMAP_LABELS.skeld_01` (14 rooms w/ tx,ty,w,h) | :11-27 |
| Minimap scale | `S = max(3, min(floor(1600/W), floor(900/H)))` | :37 |
| Background fill | `#0a0a14` | :43 |
| Floor tile | `#3a3a5c`, border `#2e2e4a` (S≥5) | :53-57 |
| Wall tile | `#12121e` | :61 |
| Room outline | `#0ff` 2px | :72-74 |
| Room label font | `max(10, min(18, S*1.4))` bold mono | :77-78 |
| Overlay dim | `rgba(0,0,0,0.88)` | :106 |
| Task dot | `rgba(0,220,240,0.8)` | :134 |
| Sabotage dot | `rgba(255,60,30,0.8)` | :134 |
| Task dot radius | `max(3, S*0.45)` | :133 |
| Player pulse | `0.7 + 0.3*sin(renderTime*0.008)` | :149 |

### Gameplay camera (inventory.js:2609-2628)

**IMPORTANT: This is the main world follow camera. It lives in `inventory.js` despite the file name being misleading (`js/core/cameraSystem.js` is Skeld security UI, not the gameplay camera).**

```js
const camera = { x: 0, y: 0 };
function updateCamera() { ... }
```

Behavior (js/client/ui/inventory.js:2610-2628):

1. Default `camTarget = player` (:2612)
2. Party spectator override: if party active (members > 1) AND `playerDead`, use `PartySystem.getSpectateTarget()` (:2613-2616)
3. X axis: if `MAP_W <= VIEW_W`, `camera.x = (MAP_W - VIEW_W)/2` (center small maps like spar arenas). Else clamp: `max(0, min(camTarget.x - VIEW_W/2, MAP_W - VIEW_W))` (:2618-2622)
4. Y axis: mirror logic with `MAP_H/VIEW_H` (:2623-2627)

Notes:
- **No deadzone** — camera snaps to center target each frame
- **No smoothing / lerp** — direct assignment
- **No look-ahead**
- Cliffs camera at map edges (standard clamp)
- Small maps are centered instead of clamped to 0
- Target is an entity reference, so spectating just reassigns the pointer

Related (inventory.js):

| Field | Value | Citation |
|---|---|---|
| SHOOT_FACE_DURATION | 7 | :2633 |
| FPS constant | 60 | :2638 |
| prevX/prevY tracker | `player.x/y` at file load | :2636 |

### Top-left icon buttons (chatProfile.js)

| Field | Value | Citation |
|---|---|---|
| ICON_X | 12 | :8 |
| ICON_SIZE | 48 | :8 |
| ICON_GAP | 8 | :8 |
| ICON_RADIUS | 10 | :9 |
| Chat icon y | 12 | :30 |
| Profile icon y | `12 + ICON_SIZE + ICON_GAP` = 68 | :50 |
| Map icon y | `12 + (ICON_SIZE + ICON_GAP) * 2` = 124 | :71 |
| Active bg | `rgba(60,60,70,0.85)` | :13 |
| Inactive bg | `rgba(20,20,28,0.8)` | :13 |
| Active border | `rgba(255,255,255,0.4)` 1.5px | :16 |
| Inactive border | `rgba(255,255,255,0.15)` 1.5px | :16 |

---

## Shop Framework (`shopFramework.js`)

Reusable helpers. All values are defaults from `opts` args.

| Helper | Default values | Citation |
|---|---|---|
| `shopDrawPanel(pw, ph, opts)` | dim `rgba(0,0,0,0.5)`; bg `rgba(12,16,24,0.95)`; border `rgba(100,200,160,0.35)` 2px; radius 12; centered `BASE_W/2, BASE_H/2` | :11-30 |
| `shopDrawHeader` | barH 50; title font `bold 20px mono`; gold `bold 14px mono`; close btn 32×32 radius 6 at `px+pw-cbS-10` | :34-67 |
| `shopDrawTabs` | tabH 30; pad 20; active bg `rgba(80,200,120,0.2)`; inactive `rgba(20,20,30,0.6)`; tab font `bold 11px mono` | :70-95 |
| `shopDrawItemRow` | padX 14; buyable bg `rgba(40,60,80,0.6)`; default bg `rgba(20,25,35,0.6)`; locked `#606060`; owned `#60a060`; normal `#d0e0f0`; price `#ffd700` if affordable else `#804040` | :100-148 |
| `shopDrawItemGrid` | cols 3; card 200×130; gap 12; owned bg `rgba(30,50,35,0.9)`; locked `rgba(15,15,20,0.9)`; afford `rgba(25,35,45,0.9)`; default `rgba(20,18,15,0.9)`; buy btn 80×24 | :153-235 |
| `shopBuy(cost, onSuccess)` | Fails with "NOT ENOUGH GOLD" hit effect at `player.x, player.y-40`, life 30 | :262-270 |

---

## Panels (`panels.js`) — identity / stats / gunsmith / mining shop

Entry points (js/client/ui/panels.js):

| Function | Line |
|---|---|
| `drawIdentityPanel` | :6 |
| `drawStatsPanel` | :694 |
| `drawGunsmithPanel` | :979 |
| `drawMiningShopPanel` | :1582 |

Detailed per-panel values are UNKNOWN in this read pass (sampled only function entry points — file is 2066 lines).

---

## Other UI panels — summaries (UNKNOWN-detailed values)

Files exist but were not exhaustively read in this pass. Purpose inferred from filename/CLAUDE.md.

- **`casinoUI.js` (2339 lines)** — 10-game casino panel renderer. Registers `casino` UI panel; clears `_casinoBetEditing` and calls `casinoReset()` on close (panelManager.js:79-83). Values UNKNOWN.
- **`customize.js` (992 lines)** — Character customization. Uses `CUSTOMIZE_CATS` array (referenced in panelManager.js:922). Hex input max length 7 incl. `#` (panelManager.js:934). Values UNKNOWN.
- **`forgeUI.js` (693 lines)** — Forge/crafting. Entry `drawForgePanel` called from draw.js:2265. Values UNKNOWN.
- **`inventory.js` (3171 lines)** — Inventory panel + gun-draw helpers (lines 2500+) + gameplay camera (:2609, documented above). Panel layout values UNKNOWN.
- **`testMobPanel.js` (1389 lines)** — Developer mob spawner; updated whenever new mobs/dungeons added (per CLAUDE.md). Values UNKNOWN.
- **`toolbox.js` (1472 lines)** — Tile placement editor. `TOOLBOX_CATEGORIES` declared in panelManager.js:98 (declared/state there, data here). Group keys: Ground, Stone, Paths, Flooring, Water, Walls, etc. (:101-150). Specific tile colors cited inline (panelManager.js:102-149).

---

## Rendering modules (summary)

- **`characterSprite.js` (4218 lines)** — Graal-style 3-layer character renderer: Body 32×32 (4×32 grid), Head 32×32 (4×4), Hat 32×32 (5×5), per `CLAUDE.md` sprite pipeline. Detailed coordinates UNKNOWN in this pass.
- **`entityRenderers.js` (5983 lines)** — `ENTITY_RENDERERS` registry with 175 entity types (per CLAUDE.md). Individual entity art UNKNOWN in this pass.
- **`hideSeekFOV.js` (717 lines)** — Hide & Seek fog of war. Called from `draw.js:2247` as `drawHideSeekFOV()`. Values UNKNOWN.
- **`mafiaFOV.js` (3743 lines)** — Mafia Among-Us-style fog of war. `updateMafiaFOVCache()` called early (`draw.js:206`), `isMafiaWorldPointVisible(x,y)` gates participant sortedChars (`draw.js:282`), `drawMafiaFOV()` called for screen mask (`draw.js:2249`). Only wall tiles block vision per CLAUDE.md. Values UNKNOWN.

---

## Dependencies

- Reads: `GameState.player`, `gold`, `inventory`, `waveState`, `level`, `Scene`, `mobs`, `PartyState`, `SparState`, `MafiaState`, `HideSeekState`, `fishingState`, `farmingState`, `cookingState`, `cookingProgress`, `sparProgress`, `sparLearning`, `_gunSettings`, `_gunLevels`, `_pickaxeLevels`, `_discoveredOres`, `_ctxFreeze/_ctxRof/_ctxSpread`, `keybinds`, `gameSettings`, `quickSlots`
- Writes: `localStorage['dungeon_game_save']`, `CommandQueue`, `InputIntent.*` flags, `player.*` cosmetics, `playerLevel`, `playerXP`, `skillData`, `fishingState.*`, `farmingState.*`, `inventory` (material restore, gun restore, pickaxe restore)
- Emits (via `Events`): `mob_killed`, `wave_cleared`, `wave_started`, `player_damaged`, `player_died`, `floor_changed` (js/authority/eventBus.js:8-9)
- Consumes commands: `authorityTick()` (js/core/draw.js:2987)

## Edge cases

- Auto-save is debounced 1000 ms — rapid changes coalesce (saveLoad.js:381).
- Save rejects entries older than v1; but each individual subsystem has its own migration branches that gate on `data.version < N`. Only sparLearning explicitly wipes pre-v8 data (saveLoad.js:278).
- Gold, inventory, and equipment are intentionally NOT persisted (dungeon roguelike design comment, saveLoad.js:166); materials ARE persisted and restored on load (v10).
- `UI.open(id)` no-ops if panel is already active (panelManager.js:21). Open always closes the currently active panel and runs onClose hooks first (:22-23).
- Gameplay camera centers small maps instead of clamping — spar arenas appear centered, not top-left (inventory.js:2618-2624).
- When `playerDead` and party mode, camera follows `PartySystem.getSpectateTarget()`. If no spectate target, camera remains on player corpse (inventory.js:2613-2616).
- draw() is skipped when `updates === 0` in a frame (zero physics ticks) — caps FPS to 60 on high-refresh displays (draw.js:2993).
- Chat input max length 80; name max 16; status max 60 (panelManager.js:912, 956, 972).
- `chatMessages` ring-trimmed to 50 (panelManager.js:902).
- Keybind rebinding: pressing a key already bound swaps the bindings (panelManager.js:1024-1028). Escape and enter are forbidden as keybinds (:1021).
- `/gun`, `/tp`, `/heal`, `/mob`, `/freeze` — `/heal` and `/gun` are present (panelManager.js:529, :799). `/tp`, `/mob`, `/freeze` are NOT found in panelManager.js command handler — UNKNOWN whether they exist elsewhere in cluster.
- Snapshot schema version = 1 (js/authority/snapshots.js:20) is separate from SAVE_VERSION = 10 (saveLoad.js:9).
- `gridOverlayOpen` toggle is bound to `p`, not `g`, despite the "G key toggles grid" comment (panelManager.js:998-1004).
- `AssetLoader` auto-init on file load races with `index.html` bootstrap; renderers must tolerate `AssetLoader.get(key)` returning null and fall back to procedural drawing (assetLoader.js:80-84).
