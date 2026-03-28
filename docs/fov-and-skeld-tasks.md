# FOV Systems & Skeld Tasks

Reference for porting Hide & Seek FOV, Mafia FOV, and Skeld task mini-games to Unity.

---

## Hide & Seek FOV (`js/client/rendering/hideSeekFOV.js`)

### Overview

Hide & Seek uses simple circular FOV (not wall-aware raycasting). The seeker gets a limited vision circle during the seek phase. The hider has no FOV restriction. All drawing is in screen-space (1920x1080 via `BASE_W`/`BASE_H`).

### Module-Level State

| Variable | Type | Purpose |
|---|---|---|
| `_phaseFlashTimer` | int | Countdown (120 frames = 2s) for "SEEK PHASE BEGINS!" flash |
| `_lastHideSeekPhase` | string | Tracks previous phase to detect hide->seek transition |
| `_showBotOverlay` | bool | Debug toggle to reveal bot position on minimaps |

### FOV Overlay Per Phase

#### `role_select` Phase
- Full-screen panel (500x300, centered) with dim backdrop (`rgba(0,0,0,0.7)`)
- Two role buttons: Hider (green `#5fca80`, 190x150) and Seeker (orange `#ff6a3a`, 190x150)
- Click regions stored in `window._hsRoleButtons = { hider: {x,y,w,h}, seeker: {x,y,w,h} }`
- Hider subtitle: "30s to hide / Stay hidden to win"
- Seeker subtitle: "60s to find hider / Tag with Seeking Baton"

#### `hide` Phase (Seeker's View)
- **Full black screen** (`#000000` fill over entire canvas) -- seeker cannot see game world
- **Map overview** drawn centered on screen showing collision grid:
  - Wall tiles: `#2a2a3a`, floor tiles: `#0e0e18`
  - Map scale: `Math.min((BASE_W - 120) / level.widthTiles, (BASE_H - 200) / level.heightTiles)`
  - Title: "STUDY THE MAP" (18px bold, `rgba(255,255,255,0.5)`)
- **Seeker spawn dot**: pulsing blue (`rgba(60,140,255,...)`) with glow ring, labeled "YOUR SPAWN"
  - Pulse: `0.5 + sin(renderTime / 300) * 0.5`
  - Dot radius: `4 + pulse * 3`, glow ring at `dotR + 4`
- **"Show Hider" toggle** (top-right of map, 130x28): reveals bot position + target on minimap
  - Click region: `window._hsShowBotBtn = {x,y,w,h}`
  - When on: red pulsing bot dot + orange X at target with "TARGET" label

#### `hide` Phase (Hider's View)
- No FOV restriction. Hider sees the full game world normally.

#### `seek` Phase (Seeker's View)
- **Circular FOV cutout** using path subtraction (outer rect CW, inner circle CCW)
- FOV radius: `HIDESEEK.FOV_RADIUS * TILE * WORLD_ZOOM` = **4.5 tiles** (216px world, scaled by zoom)
- Dark overlay: `rgba(0,0,0,0.97)`
- **Soft gradient edge**: radial gradient from `innerR = fovR * 0.7` (transparent) to `fovR` (`rgba(0,0,0,0.97)`)
- Center: player screen position = `(player.x - camera.x) * WORLD_ZOOM`, `(player.y - camera.y) * WORLD_ZOOM`

#### `seek` Phase (Hider's View)
- No FOV restriction. Full world visibility.
- **"Show Seeker" toggle** (top-right, 140x32): shows tracking minimap when enabled
  - Click region: `window._hsShowBotBtn = {x,y,w,h}`

#### `post_match` Phase
- Full-screen overlay panel (500x280, centered) with dim backdrop (`rgba(0,0,0,0.6)`)
- Win/loss determined by: `(isSeeker && seekerWon) || (!isSeeker && !seekerWon)`
- Win text: green `#5fca80` "YOU WIN!" / Loss text: red `#ff4a4a` "YOU LOSE!"
- If seeker found hider: shows time taken in seconds
- If hider survived: "Time ran out! Hider survived."
- If seeker lost: shows minimap (160px wide, aspect-correct) with hider's final position (pulsing red dot)
- "RETURN TO LOBBY" button (220x40, centered): `window._hsReturnButton = {x,y,w,h}`

### Seeker Tracking Minimap (Hider During Seek Phase)

Drawn by `_drawSeekerTrackingMinimap()` when `_showBotOverlay` is toggled on.

| Property | Value |
|---|---|
| Width | 220px |
| Position | `BASE_W - 220 - 20`, Y=60 (below toggle button) |
| Background | Black at 80% opacity, 8px rounded corners |
| Wall tiles | `#2a2a3a` |
| Floor tiles | `#0e0e18` |
| Seeker dot | Orange `rgba(255,154,64,...)`, pulsing, radius `3 + pulse * 2` |
| Seeker target | Orange X (`rgba(255,160,40,0.6)`) |
| Player dot | Green `rgba(95,202,128,...)`, radius 3 |
| Border | `rgba(255,154,64,0.3)` |

### HUD Elements (`drawHideSeekHUD()`)

Active during `hide` and `seek` phases. Not drawn during `idle`.

| Element | Position | Details |
|---|---|---|
| Phase label | Top center, Y=30 | "HIDE PHASE" / "SEEK PHASE" / "CHOOSING ROLE", 14px bold, `rgba(255,255,255,0.5)` |
| Timer | Top center, Y=68 | 42px bold. Hide=amber `#ffb840`, Seek=red `#ff4a4a`. Pulses when <10s (`0.5 + sin(t/100) * 0.5`) |
| Role indicator | Top center, Y=95 | 18px bold. Hider=green `#5fca80`, Seeker=orange `#ff9a40` |
| Phase flash | Center screen | "SEEK PHASE BEGINS!" 56px bold red `#ff4a4a`. 120-frame fade with 30% scale growth. Triggered on hide->seek transition. |

### Key Functions

| Function | Purpose |
|---|---|
| `drawHideSeekFOV()` | FOV overlay: black screen in hide phase (seeker), circular cutout in seek phase (seeker). No-op for hider. |
| `drawHideSeekHUD()` | Phase timer, role label, transition flash, "Show Seeker" toggle + tracking minimap |
| `drawHideSeekOverlay()` | Role select panel and post-match results overlay |

### Key Constants (from `hideSeekData.js`)

| Constant | Value | Description |
|---|---|---|
| `HIDE_TIME` | 1800 (30s) | Hide phase duration |
| `SEEK_TIME` | 1800 (30s) | Seek phase duration |
| `POST_MATCH_TIME` | 600 (10s) | Results screen duration |
| `TAG_RANGE` | 90px | Melee tag range |
| `FOV_RADIUS` | 4.5 tiles | Seeker's vision circle |
| `BOT_SPEED` | 75% of `PLAYER_BASE_SPEED` | Bot movement speed |
| `BOT_DETECT_RANGE` | 3 tiles | Seeker bot detection range |

---

## Mafia FOV (`js/client/rendering/mafiaFOV.js`)

### Overview

Mafia mode uses **wall-aware raycasting FOV** with DDA (Digital Differential Analyzer) ray casting through the collision grid. This creates Among Us-style shadow occlusion where walls block vision. The system uses an offscreen canvas buffer with heavy blur for soft edges.

### FOV Algorithm

#### Occluder Cache (`buildFOVOccluderCache()`)
- Builds a flat `Uint8Array` grid from `collisionGrid` (1 = wall, 0 = open)
- Extracts **boundary vertices**: grid points where at least one adjacent tile is solid AND at least one is empty
- Stored in `_fovBoundaryVerts` (Float32Array of [wx0,wy0, wx1,wy1, ...])
- Cached per level using `_fovGridLevelId`

#### DDA Raycasting (`_fovCastRay(px, py, dirX, dirY, maxDist)`)
- Steps through tiles in the direction vector using DDA algorithm
- Returns distance (world pixels) to first solid tile, or `maxDist` if no wall hit
- Stops at grid boundaries (returns distance when going OOB)

#### Ray Ring Configuration

| Parameter | Value | Description |
|---|---|---|
| `_FOV_RAY_COUNT` | 120 | One ray every 3 degrees (uniform ring) |
| `_FOV_BLUR` | 36px | Heavy canvas blur for soft edges |
| `_FOV_DARKNESS` | 0.92 | Opacity of dark overlay |
| `_FOV_AMBIENT` | 0.04 | Minimal ambient light in darkness |
| `_FOV_LERP_SPEED` | 0.35 | Smooth player position blend factor per frame |
| `_FOV_VISIBILITY_PAD` | 24px | Forgiveness at FOV edge to prevent flicker |

#### Visibility Polygon (`computeVisibilityPolygon(px, py, maxDist, camX, camY)`)
1. Gets uniform angle ring (120 angles, evenly spaced 0 to 2PI)
2. Casts DDA ray for each angle from player position
3. Records hit distance for each ray
4. Converts to screen-space points: `((px + dx*d - camX) * WORLD_ZOOM, (py + dy*d - camY) * WORLD_ZOOM)`
5. Updates FOV cache for `isMafiaWorldPointVisible()` queries

#### FOV Cache (`isMafiaWorldPointVisible(wx, wy)`)
- O(1) per-query visibility test using cached ray distances
- Returns `true` if: no FOV active, point within 1 tile of player, or point within interpolated ray distance + 24px padding
- Uses angle-based sector lookup with linear interpolation between adjacent rays

#### Vision Radius Calculation

```
visionMult = impostor ? impostorVision (1.5x) : crewVision (1.0x)
lightsMult = 1 - (_lightsDimProgress * (1 - 0.35))
fovWorldR = FOV_BASE_RADIUS * visionMult * lightsMult * TILE
```

- `FOV_BASE_RADIUS` = 4.5 tiles (from `mafiaGameData.js`)
- Impostor vision = 1.5x (configurable 0.25x-5.0x, step 0.25)
- Crew vision = 1.0x (configurable 0.25x-5.0x, step 0.25)

#### FOV Rendering (`drawMafiaFOV()`)
1. Uses offscreen canvas buffer (`drawMafiaFOV._buf`, allocated once at `BASE_W x BASE_H`)
2. Fills buffer with `rgba(0,0,0,0.92)` darkness
3. Cuts out visibility polygon using `destination-out` composite mode with `blur(36px)` filter
4. Alpha of cutout: `1 - _FOV_AMBIENT` = 0.96
5. Stamps buffer onto main canvas

#### When FOV is Disabled
FOV cache is cleared (everything visible) during:
- `idle` phase
- Ghost state (`playerIsGhost`)
- Meeting phases (`meeting`, `voting`, `ejection`)

### Lights Sabotage

| Parameter | Value |
|---|---|
| `_LIGHTS_FADE_FRAMES` | 180 (3 seconds at 60fps) |
| `_LIGHTS_DIM_AMOUNT` | 0.35 (shrink to 35% of normal radius) |
| Fade direction | +1/180 per frame when lights sabotage active (crewmate only), -1/180 when inactive |
| Effect on impostors | None -- impostors keep full vision during lights sabotage |

### O2 Sabotage Fog Effect

Applied on top of FOV overlay for crewmates during O2 depletion:
- `fogProgress = 1 - (sabotage.timer / sabType.timer)` (0 to 1 as time runs out)
- Radial gradient from player center:
  - Clear radius = `max(canvasW, canvasH) * 0.6 * (1 - fogProgress * 0.9)` (shrinks to 10% at max)
  - Inner stop (0.3x clearRadius): transparent
  - Mid stop (0.6x): `rgba(20,30,40, fogProgress * 0.4)`
  - Outer stop: `rgba(20,30,40, fogProgress * 0.85)`
- Extra edge fog: `rgba(15,20,30, fogProgress * 0.3)` full-screen fill

### Dead Bodies (`drawMafiaBodies()`)

Rendered in world-space, only if `isMafiaWorldPointVisible()` returns true.

| Element | Details |
|---|---|
| Shadow | `rgba(0,0,0,0.3)` ellipse, 20x8, offset Y+4 |
| Body | Dark color ellipse 18x12 at rotation 0.3 |
| Suit | Body color ellipse 14x9 |
| Visor | `#a8d8ea` ellipse 6x5 with crack lines (hidden at <50% dissolve) |
| Bone | `#e8e0d0` rect (hidden at <25% dissolve) |
| Dissolve | Viper ability. 4 stages based on `dissolveTimer/dissolveMax`. Alpha = `max(0.15, pct * 0.85 + 0.15)`. Green acid particles when dissolving. |
| Name label | 11px bold below body, dark background rect |

### Ghost Overlay

When `playerIsGhost` is true:
- Blue-tinted overlay: `rgba(100, 120, 180, 0.08)` full-screen
- "GHOST" label: 22px bold, `rgba(180, 200, 255, 0.5)`, top center at Y=60

### HUD Buttons & Click Regions

#### Kill Button (Impostor Only, Bottom-Right)

| Property | Value |
|---|---|
| Size | 100x50 |
| Position | `canvas.width - 100 - 30`, `canvas.height - 50 - 100` |
| Active color | `rgba(200, 20, 20, 0.85)`, border `#ff4444` |
| Inactive color | `rgba(80, 30, 30, 0.6)`, border `#664444` |
| Cooldown display | "KILL" text + seconds countdown below |
| Key hint | [Q] above button |
| Click region | `window._mafiaKillBtn = {x,y,w,h}` (null when not impostor) |

#### Report Button (Bottom-Left, Near Body)

| Property | Value |
|---|---|
| Size | 110x50 |
| Position | X=30, `canvas.height - 50 - 100` |
| Active color | `rgba(200, 160, 20, 0.85)`, border `#ffcc00` |
| Inactive color | `rgba(60, 50, 20, 0.4)`, border `#665500` |
| Key hint | [R] above button |
| Click region | `window._mafiaReportBtn = {x,y,w,h}` (null when no body nearby) |

#### Sabotage Button (Impostor Only, Bottom-Center)

| Property | Value |
|---|---|
| Size | 140x50 |
| Position | centered horizontally, `canvas.height - 50 - 30` |
| Active color | `rgba(180, 50, 180, 0.85)`, border `#cc66cc` |
| Click region | `window._mafiaSabotageBtn = {x,y,w,h}` |

#### Sabotage Picker Menu (Above Sabotage Button)

| Property | Value |
|---|---|
| Size | 200x160 |
| Position | centered, `sabBtnY - 160 - 10` |
| Options | Reactor (`#cc3333`), O2 (`#3388cc`), Lights (`#cc9922`) |
| Option size | 176x36 each, 8px gap |
| Click regions | `window._mafiaSabReactorBtn`, `window._mafiaSabO2Btn`, `window._mafiaSabLightsBtn` |

#### Role Ability Buttons (Left of Kill Button Area)

All role ability buttons are 100x50, positioned at `killBtnX - 120`, stacked with 60px spacing.

**Tracker (Crewmate) -- TRACK** (key: [T])
- Active: `rgba(34,136,255,0.85)`, border `#2288ff`
- Shows cooldown/track timer seconds
- Click region: `window._mafiaTrackBtn`

**Scientist (Crewmate) -- VITALS** (key: [V])
- Active: `rgba(80,170,20,0.85)` / Open: `rgba(126,211,33,0.85)`
- Shows cooldown or remaining vitals time
- Click region: `window._mafiaVitalsBtn`

**Shapeshifter (Impostor) -- SHIFT** (key: [F])
- Active: `rgba(140,10,180,0.85)`, border `#bd10e0`
- States: SHIFT (ready), SHIFTING (animating), UNSHIFT (shifted, shows timer)
- Opens target selection panel on click
- Click region: `window._mafiaShiftBtn`

**Phantom (Impostor) -- VANISH** (key: [F])
- Active: `rgba(80,10,140,0.85)`, border `#6a0dad`
- States: VANISH (ready), VISIBLE (invisible, shows timer)
- Click region: `window._mafiaVanishBtn`

### Sabotage Fix Panels

#### Panel State (`_sabPanel`)

| Field | Type | Description |
|---|---|---|
| `active` | bool | Panel is open |
| `type` | string | `'reactor'`, `'o2'`, or `'lights'` |
| `panelKey` | string | Which fix panel entity opened this |
| `holding` | bool | Reactor: mouse held on hand scanner |
| `holdProgress` | float 0-1 | Reactor: visual fill progress |
| `code` | string | O2: 5-digit target code |
| `input` | string | O2: player's typed digits |
| `codeWrong` | bool | O2: wrong code flash active |
| `wrongTimer` | int | O2: frames remaining for wrong flash (30 = 0.5s) |
| `switches` | bool[5] | Lights: persisted on `MafiaState.sabotage._switches` |

#### Reactor Fix Panel (`_drawReactorFixPanel`)

- Panel size: 420x460 (centered)
- **Hand scanner area**: 220x280, centered in panel
- Hand shape: palm ellipse (55x55) + 5 finger roundRects with grid overlay + white outline
- **Hold mechanic**: while mouse held on scanner, `holdProgress` fills at +1/60 per frame (~1s visual)
- Each frame while holding: calls `MafiaSystem.tryFixSabotage(panelKey, playerId)`
- On release: calls `MafiaSystem.releaseSabotagePanel(panelKey)`
- Progress bar: below scanner, 220px wide, green `#44cc66`
- Click region: `window._sabFixHandBtn = {x,y,w,h}`
- **Both panels must be held simultaneously** to fix reactor

#### O2 Fix Panel (`_drawO2FixPanel`)

- Panel size: 420x460 (centered)
- **Keypad**: 280x340 centered, grey background `#c8c8c8`
- Display screen: input digits shown, 5-digit code
- **Sticky note** with code shown (tilted yellow note, top-right of keypad)
- Number pad: 3x4 grid (1-9, X, 0, checkmark), button size 60x60, gap 8
- X = clear all input, checkmark = submit
- Wrong code: 30-frame red flash, then input cleared
- On correct code: calls `MafiaSystem.tryFixSabotage()` and closes panel
- Click regions: `window._sabFixKeypadBtns = [{key, x, y, w, h}, ...]`
- **Both O2 panels** (O2 room + Admin) must be fixed to stop sabotage

#### Lights Fix Panel (`_drawLightsFixPanel`)

- Panel size: **540x560** (bigger than other panels)
- **3 display screens** (80px tall each, 16px gap): show animated waveforms when their paired switches are on
  - Screen 1 active when switches[0] AND switches[1] are on
  - Screen 2 active when switches[2] is on
  - Screen 3 active when switches[3] AND switches[4] are on
- Wire/pipe details connecting screens to panel sides
- **5 toggle switches**: 56x120 each, 26px gap, centered below screens
  - Switch lever handle: 28x44, position changes based on on/off state
  - LED indicators below each switch: green `#22cc44` when on, dark `#333` when off
- When all 5 switches on: auto-calls `MafiaSystem.tryFixSabotage()` and closes panel
- Click regions: `window._sabFixSwitchBtns = [{idx, x, y, w, h}, ...]`
- Switch state persists on `MafiaState.sabotage._switches` (closing/reopening panel keeps progress)

### Sabotage Alert Overlay (`_drawSabotageOverlay`)

Visible to all players during active reactor or O2 sabotage (not lights).

| Element | Details |
|---|---|
| Red vignette | Flashes every 1.5s, alpha `0.08 + progress * 0.07` |
| Alert bar | 400x50, top center at Y=10, rounded corners 10px |
| Bar color | Red-orange gradient based on progress |
| Timer | Bold 22px, amber normally, red-ish when urgent (<=10s) |
| Fix status | Below bar: "Reactor Panel 1: HELD/EMPTY \| Panel 2: HELD/EMPTY" (reactor) or "O2 Room: FIXED/NEEDS FIX \| Admin: FIXED/NEEDS FIX" (O2) |

### Emergency Meeting Popup (`_drawEmergencyPopup`)

Shown when player presses E at cafeteria table.

| Element | Details |
|---|---|
| Panel | 360x220, centered, dark bg `rgba(15,12,20,0.95)` |
| Border | Red pulsing glow, shadow blur 15px |
| Warning icon | Triangle `\u26A0`, 36px red |
| Title | "EMERGENCY MEETING", 20px bold white |
| Confirm button | 240x56, red `rgba(200,30,20,0.85)`, "CALL MEETING" |
| Cancel | "Click outside to cancel" hint text |
| Click region | `window._mafiaEmergencyConfirmBtn = {x,y,w,h}` |

### Meeting UI (`_drawMeetingUI`)

Full-screen overlay with tablet-style frame.

#### Tablet Frame

| Property | Value |
|---|---|
| Outer frame | 920+16 x 600+16, dark metallic `#2a2d35`, round 30px |
| Inner panel | 920x600, light blue-grey `#c2ccd8`, round 24px |
| Chat toggle | Top-right icon, 36x36, toggles between voting view and chat view |
| Click region | `window._meetingChatToggleBtn = {x,y,w,h}` |

#### Voting View

- Title: "Who Is The Impostor?" (26px bold, `#1a1a2e`)
- **Player cards**: 2-column grid, each card 390x82
  - Contains mini crewmate sprite (1.5x scale), player name (18px bold)
  - Alive cards: `#f0f2f5` bg. Dead cards: `#8a8a8a` bg
  - "VOTED" stamp: rotated red circle + text when player has voted
- **Vote confirmation**: clicking a card first selects it (highlight), then shows confirm (green check 36x36) and cancel (red X 36x36) buttons on the card
  - `window._mafiaVoteConfirmBtn`, `window._mafiaVoteCancelBtn`
- Vote portrait click regions: `window._mafiaVotePortraits = [{id, x, y, w, h}, ...]`

#### Bottom Bar

| Element | Details |
|---|---|
| Skip Vote button | 160x38, left side. `window._mafiaSkipBtn` |
| Skip confirmation | Green check (34x34) + Red X (34x34) appear after clicking skip |
| Skip confirm regions | `window._mafiaSkipConfirmBtn`, `window._mafiaSkipCancelBtn` |
| Discussion timer | Center: "Discussion: Xs -- Voting begins soon..." |
| Voting timer | Right: "Voting Ends In: Xs" |

#### Chat View

- Title: "Meeting Chat" (20px bold)
- Message bubbles: 68px height, 8px gap
- Local messages: right-aligned, light bg `#f0f2f5`, crewmate sprite on right
- Remote messages: left-aligned, crewmate sprite on left, name color matches player color
- Chat input box at bottom: 44px tall, "Click here to type..." placeholder (inactive) / "Type a message..." (active)
- Click region: `window._meetingChatInputBtn`

### Vote Results / Ejection Screens

- **Vote Results** (`_drawVoteResultsUI`): shows vote tally per player with colored vote indicators
- **Ejection** (`_drawEjectionUI`): Among Us-style ejection animation with starfield, crewmate floating away, and role reveal text
- **Report Splash** (`_drawReportSplash`): "DEAD BODY REPORTED" -- red speed-lines bg, white banner, dead body illustration with skull speech bubble. Or "EMERGENCY MEETING" -- orange speed-lines bg, pulsing red emergency button
- **Role Reveal** (`_drawRoleRevealScreen`): "SHHHHH!" at top, role text (IMPOSTOR red `#ff2222` / CREWMATE blue `#4ac9ff`) 72px, subrole + description, fellow impostors list

### Shapeshifter Target Panel

- Panel: 300x(dynamic), centered, purple theme `#bd10e0`
- Lists all alive non-local participants with color dot + name
- Row: 40px tall, purple bg `rgba(60,20,80,0.5)`
- Click regions: `window._mafiaShiftTargetBtns = [{id, x, y, w, h}, ...]`
- Close: ESC key

### Scientist Vitals Overlay

- Panel: 400x500, centered, green theme `#7ed321`
- Lists all participants with color dot, name, and ALIVE/DEAD status
- Remaining time shown at bottom
- Click region: `window._mafiaVitalsBtn`

### Noisemaker Death Alert Ping

- Directional arrow on screen edge pointing toward death location
- Pulsing at `0.5 + 0.5 * sin(Date.now() * 0.008)`
- Arrow triangle + "!" exclamation nearby
- Color from `alert.color` (default `#e8d44d`)

### Vent System (also in `skeldTasks.js`)

#### Vent Networks (No Cross-Network Travel)

| Network | Vents |
|---|---|
| 1 | Security <-> MedBay <-> Electrical (triangle) |
| 2 | Admin <-> Cafe Hallway <-> Nav Hallway (triangle) |
| 3 | Shields <-> Navigation (back and forth) |
| 4 | Weapons Upper <-> Nav Upper (back and forth) |

#### Vent Mechanics

| Property | Value |
|---|---|
| Enter/exit animation | 20 frames (`ANIM_DURATION`) |
| Engineer max vent time | `MAFIA_ROLE_SETTINGS.ventDuration` (default 30s) |
| Engineer vent cooldown | `MAFIA_ROLE_SETTINGS.ventCooldown` (default 15s) |
| Impostor vent time | Unlimited (timer = 0) |
| Snap position | Vent center = `e.tx * TILE + TILE`, `e.ty * TILE + TILE` |
| Proximity range | 100px from vent center |

#### Vent HUD

- Directional arrows pointing toward connected vents, radius 24px, green glow
- Arrow buttons stored in `window._ventArrowButtons = [{x, y, w, h, targetId}, ...]`
- "[E] Exit Vent" text below
- Engineer timer bar: 120x10, color transitions green -> yellow -> red

### All Click Regions Summary

| Window Variable | Purpose |
|---|---|
| `_mafiaKillBtn` | Kill button (impostor) |
| `_mafiaReportBtn` | Report body button |
| `_mafiaVotePortraits` | Array of voteable player cards |
| `_mafiaSkipBtn` | Skip vote button |
| `_mafiaEmergencyPopup` | Emergency popup visible flag |
| `_mafiaEmergencyConfirmBtn` | Emergency confirm button |
| `_mafiaSabotageBtn` | Sabotage button (impostor) |
| `_mafiaSabotageMenu` | Sabotage picker open flag |
| `_mafiaSabReactorBtn` | Reactor sabotage option |
| `_mafiaSabO2Btn` | O2 sabotage option |
| `_mafiaSabLightsBtn` | Lights sabotage option |
| `_mafiaTrackBtn` | Tracker TRACK button |
| `_mafiaShiftBtn` | Shapeshifter SHIFT button |
| `_mafiaVanishBtn` | Phantom VANISH button |
| `_mafiaShiftPanelOpen` | Shift target panel open flag |
| `_mafiaShiftTargetBtns` | Array of shift target rows |
| `_mafiaVoteConfirmBtn` | Vote confirm (green check) |
| `_mafiaVoteCancelBtn` | Vote cancel (red X) |
| `_mafiaSkipConfirmBtn` | Skip confirm (green check) |
| `_mafiaSkipCancelBtn` | Skip cancel (red X) |
| `_meetingChatToggleBtn` | Chat/vote view toggle |
| `_meetingChatInputBtn` | Chat input box |
| `_mafiaVitalsBtn` | Scientist vitals button |
| `_sabFixCloseBtn` | Sabotage panel close (X) |
| `_sabFixHandBtn` | Reactor hand scanner area |
| `_sabFixKeypadBtns` | O2 keypad buttons array |
| `_sabFixSwitchBtns` | Lights switch toggle buttons |
| `_ventArrowButtons` | Vent directional arrows |
| `_hsRoleButtons` | H&S role select (hider/seeker) |
| `_hsShowBotBtn` | H&S show bot toggle |
| `_hsReturnButton` | H&S return to lobby |

---

## Skeld Tasks (`js/core/skeldTasks.js`)

### Task System Overview

Tasks are Among Us-style mini-games performed at specific locations on The Skeld map. Players press E near a `skeld_task` entity to open a task panel. Each task has a unique mini-game. Completing all assigned tasks contributes to the crew task progress bar.

### Task Categories

| Category | Task Count | Description |
|---|---|---|
| **Common** | 4 types | Given to ALL crewmates (if faked, everyone notices) |
| **Short** | 5 types | Single-step, quick mini-games |
| **Long** | 5 types | Multi-step or time-based |

### Task Assignment (`SkeldTasks.reset(settings)`)

Per match, tasks are randomly selected from each category:
- Default: `commonTasks=1`, `shortTasks=2`, `longTasks=1` (from settings)
- Categories are shuffled, then sliced to the desired count
- Each selected task gets state: `{ done: false, stepsCompleted: Set<number>, totalSteps }`
- `totalSteps` = number of `skeld_task` entities with matching `taskId`

### SkeldTasks API

| Method | Description |
|---|---|
| `reset(settings)` | Initialize task state for new match. Settings: `{commonTasks, shortTasks, longTasks}` |
| `completeStep(taskId, step)` | Mark a step complete. When all steps done, marks task done. |
| `isStepDone(entity)` | Check if this entity's step is complete |
| `isDone(taskId)` | Check if entire task is complete |
| `canDoStep(entity)` | Check if this step can be done (previous step complete, this step not done) |
| `getProgress()` | Returns `{done, total}` counts |
| `getTaskList()` | Returns display array: `[{label, room, done, stepsText}]` |

### Task Panel

| Property | Value |
|---|---|
| Panel size | 500x440 |
| Position | Centered on screen |
| Background | `#0a0e14` with `#1a3040` border |
| Title bar | `#0c1620`, cyan title text `#0ff` |
| Close button (X) | Top-right, 28x28, red text |
| Game area | Inset 20px from sides, 50px from top, 70px from total height |
| Dark overlay | `rgba(0,0,0,0.75)` behind panel |

Mouse tracking uses canvas-relative coordinates scaled to `BASE_W x BASE_H`.

### All 14 Task Types

---

#### Task 1: `tap_sequence` (Common -- Cafeteria)
**Simon Says with 5 colored buttons.**

- 5 buttons: Red(R), Green(G), Blue(B), Yellow(Y), Purple(P)
- Button size: 70x70, gap 12px
- Colors: `['#ff4444', '#44cc44', '#4488ff', '#ffcc44', '#cc44cc']`
- Dim colors: `['#441111', '#114411', '#112244', '#443311', '#441144']`
- **1 round** with a 4-step sequence
- Show phase: lights each button in sequence (lit 25 frames, dark 12 frames per step)
- Input phase: player clicks buttons in same order
- Wrong = reset current round (60-frame error display, then restart)
- Progress dots below buttons
- On complete: calls `completeCurrentTask()`

---

#### Task 2: `code_entry` (Common -- Admin)
**Memorize and enter a 6-digit code.**

- **2 rounds** with different 6-digit codes
- Show phase: code displayed for 80 frames (~1.3s) in 36px cyan
- Input phase: number pad (5x2 grid, buttons 60x50, gap 10) + CLR button
- 6 code slots shown above keypad (42x55 each)
- Active slot highlighted with cyan border
- Wrong code = regenerate new code, show again
- On both rounds correct: "ACCESS GRANTED"

---

#### Task 3: `simple_math` (Common -- Lower Engine)
**Flash arithmetic: add 5 single-digit numbers.**

- 5 numbers (1-9) flashed one at a time
- Each number shown for **120 frames (2 seconds)**
- Progress dots and timer bar during flash phase
- Pop-in animation: number scales from 0 to 64px over first 10% of duration
- Input phase: number pad (2 rows of 5, buttons 55x45) + DEL + ENTER
- Max 3 digits input
- Wrong answer = new set of 5 numbers, restart from flash phase (80-frame error)

---

#### Task 4: `match_symbol` (Common -- Weapons)
**Memory card matching with shuffle confusion.**

- 16 cards in 4x4 grid (8 symbol pairs)
- Symbols: star, heart, triangle, circle, scissors, music note, radiation, shamrock
- Card size: 60x70, gap 10
- Click to reveal, reveal 2 at a time, 20-frame check delay
- **Mismatch penalty**: 2 random unmatched cards swap positions (shuffle confusion)
- Matched cards: green border `#44ff44` on dark green `#0a2a0a`
- Face-down cards: dark with "?" label
- Win at 8/8 pairs found

---

#### Task 5: `slider_alignment` (Short -- Reactor)
**Align 5 drifting sliders to target markers.**

- 5 horizontal sliders, each with a target position (0.3-0.8 range)
- Sliders **drift** at -0.002 to +0.002 per frame, bouncing off 0 and 1
- Drift stops when aligned (within 0.02 of target)
- Drag thumb to align: drag interaction with 20px expanded hit area
- Target marker: cyan line with 16px highlight band
- Thumb: 16x26, green `#44ff44` when aligned, orange `#ff6644` when not
- "LOCK IN" button (140x38): only succeeds if ALL sliders aligned
- Failed lock: "NOT ALIGNED!" flash for 30 frames

---

#### Task 6: `security_auth` (Short -- Security)
**Pattern memorization on a 4x4 grid, 3 rounds.**

- Round 1: 4 cells lit, shown for 90 frames
- Round 2: 6 cells lit, shown for 70 frames
- Round 3: 8 cells lit, shown for 50 frames
- Cell size: 55x55, gap 8
- Show phase: highlighted cells glow cyan
- Input phase: click to toggle cells on/off, then SUBMIT (120x36)
- Mismatch: new random pattern generated for current round, retry
- Pattern comparison: exact set equality check

---

#### Task 7: `hold_to_charge` (Short -- Upper Engine)
**Chase a moving zone and hold mouse to charge.**

- Charge zone moves in **Lissajous pattern**: `x = sin(frame * 0.02) * 80`, `y = cos(frame * 0.015) * 50`
- Zone radius: 60px, pulsing `1 + sin(frame * 0.1) * 0.08`
- **Charging**: +0.8 per frame when mouse held inside zone
- **Decay**: -1.0 per frame when mouse held outside zone, -2.0 when not held at all
- Max charge: 200 units at +0.8/frame = 250 frames (~4.2 seconds of pure charging)
- Charge arc drawn around zone border
- Charge bar at bottom: green `#44ff44` when >80%, orange `#ff8800` otherwise
- Color transitions: orange while charging, green at >80%

---

#### Task 8: `rotate_pipes` (Short -- O2)
**Rotate pipe segments in a 4x4 grid to connect IN to OUT.**

- 16 pipe cells, each starts at rotation 1-3 (0 = solved)
- Cell size: 55x55, gap 6
- Click to rotate 90 degrees clockwise (rotation = (rotation + 1) % 4)
- Pipe shapes vary by grid position:
  - Interior cells: cross (+) shape
  - Corner cells: L-bend shape
  - Edge cells: straight pipe
- "IN" arrow on left side, "OUT" arrow on right side
- Solved cells: green border + green pipe color
- All cells at rotation 0 = auto-complete

---

#### Task 9: `calibrate_dial` (Short -- Shields)
**Spinning dial: click when needle is in the green zone.**

- Dial: 90px radius, dark background
- Needle rotates continuously
- **Speed ramp**: `0.04 + hits * 0.02` radians per frame
- Green zone: arc from -0.25 to +0.25 radians (centered at top)
- **Zone shrinks** per hit: `shrinkPerHit = 0.06` (0.03 from each side per hit)
- Need **3 successful hits** to complete
- **Miss resets hits to 0**
- Hit flash: 15 frames green. Miss flash: 15 frames red.
- Progress dots below dial

---

#### Task 10: `circuit_paths` (Long -- 3-step: Electrical -> Admin -> Security)
**Trace wire path by clicking numbered nodes in order.**

- 10 real nodes + 4 decoy nodes on an 8x5 grid
- Real nodes: numbered 1-10, connected by dim wire lines
- Path generated randomly: mostly moves right with occasional up/down
- Decoy nodes: labeled "?" in dark circles
- **Click correct next node**: progress advances, wire lights up green
- **Click wrong node or decoy**: progress resets to 0 (decoy shows "DECOY!" error)
- Error display: 30-frame timer
- Node hit radius: 13px (real) / 10px (decoy) + 5px padding

---

#### Task 11: `sample_analyzer` (Long -- MedBay)
**Temperature monitoring: keep temp in optimal zone.**

- 3 phases: `start` -> `monitoring` -> `collect`
- **Start**: click START button to begin
- **Monitoring**: temperature drifts randomly (velocity += `(Math.random() - 0.5) * 0.08` per frame, i.e. -0.04 to +0.04; capped at +/-0.8)
  - Optimal zone: **25-75** (progress only accumulates in this range)
  - Fail zone: below 5 or above 95 (resets to start phase)
  - Need **200 frames** of in-zone time to complete
  - COOL button: velocity -= 1.2
  - HEAT button: velocity += 1.2
  - Thermometer display: left side, 30x220px
  - Progress bar: right side
  - Status text: "IN OPTIMAL ZONE" (green) or "OUT OF ZONE - No progress!" (orange)
- **Collect**: click COLLECT button to finish

---

#### Task 12: `path_trace` (Long -- 2-step: Admin -> Navigation)
**Trace a winding path through 12 checkpoints while avoiding scanner bars.**

- 12 waypoints generated along a sine-wave path (left to right)
- Path rendered as 20px wide line
- **2 scanner bars** moving vertically:
  - Scanner 1: speed 0.003, starts at y=0.2
  - Scanner 2: speed 0.004, starts at y=0.7
  - Bounce between y=0.05 and y=0.95
- Hold mouse and pass through each checkpoint in order (14px hit radius)
- **Scanner collision** (while mouse held): resets progress by 3 checkpoints, 15-frame cooldown
- Scanner proximity threshold: 0.04 in normalized Y
- Lit path (green `#44ff44`) shows already-traced segments
- Next checkpoint: larger (12px) with cyan glow ring

---

#### Task 13: `package_assembly` (Long -- 2-step: Storage -> Comms)
**Place 7 items in correct order, avoiding 3 decoys.**

- 7 real items: Chip, Battery, Wire, Coolant, Board, Fuse, Case
- 3 decoy items: Scrap, Dust, Rock
- All 10 shuffled together in the available list
- **Correct order always shown** at top of panel: "Order: Chip > Battery > Wire > ..."
- Left side: available items list (click to place)
- Right side: box showing placed items (125px wide)
- Click correct next item: added to box
- Click wrong item or decoy: **all progress reset** (30-frame error)
- Item rows dynamically sized to fit available vertical space

---

#### Task 14: `empty_trash` (Long -- 2-step: Comms -> Storage)
**Pull 3 levers down sequentially, then flush.**

- 3 lever tracks: 40px wide, spaced 55px apart, centered
- Trash chute visual behind levers (160x200)
- Trash items decrease as levers complete
- **Lever mechanics**:
  - Drag handle downward (only downward movement allowed)
  - Must pull to 95%+ to lock (y >= 0.95)
  - Release before 95%: springs back to top (y = 0)
  - Handle: 36x28
  - Only active lever is draggable (sequential: 1, then 2, then 3)
- After all 3 levers locked: FLUSH button appears (140x45)
- Click FLUSH to complete

---

### Task List Side Panel

Always visible in Skeld (unless doing a task mini-game). Collapsible.

| Property | Value |
|---|---|
| Panel width | 280px |
| Position | Left edge (X=0), Y=76 |
| Line height | 18px per task entry |
| Tab | 28x60, vertical "Tasks" text, right edge of panel or standalone when collapsed |
| Progress bar | "TOTAL TASKS COMPLETED", green `#44dd44` fill |
| Completed tasks | Green `#44cc44` with checkmark and strikethrough |
| Pending tasks | Yellow `#eedd55` with pulsing highlight and arrow indicator |
| Visibility | Controlled by "Task Bar Updates" setting: Always / Meetings / Never |

Click the tab to expand/collapse. Click region = `_taskListTab` (28x60).
