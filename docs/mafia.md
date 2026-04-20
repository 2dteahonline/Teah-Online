# Mafia (Among Us-style Game Mode)

## Overview

"Mafia" is the game mode; "Skeld" is one map within it -- the same relationship as Among Us has with its maps (Skeld, Polus, Mira HQ). The mode features impostor/crewmate roles with specialized subroles, kill/report/meeting/voting mechanics, sabotage systems, a full task mini-game suite, FOV-limited vision via wall-aware raycasting, security cameras, and bot AI. Currently one map (`skeld_01`) is implemented with room for future maps under `MAFIA_GAME.MAPS`.

## Files

- `js/authority/mafiaSystem.js` -- State machine, bot AI, role assignment, kill/body/ghost, meeting/voting, sabotage tick, role ability ticking, match lifecycle.
- `js/shared/mafiaGameData.js` -- Mode-level constants, color palette, sabotage types, per-map data (spawn, room centers), lobby settings defaults. 144 lines.
- `js/shared/mafiaRoleData.js` -- Role definitions (`MAFIA_ROLES`), role assignment logic (`assignRoles()`), weighted subrole distribution. Loaded in Phase A (shared data).
- `js/core/skeldTasks.js` -- Task state tracker (`SkeldTasks`), vent system (`VentSystem`), task list side panel, and 14 task mini-game implementations via `TASK_HANDLERS` registry. Also handles task categories (common/short/long). 2694 lines.
- `js/client/rendering/mafiaFOV.js` -- FOV overlay (wall-aware raycasting), dead body rendering, HUD buttons (kill/report/sabotage/role abilities), meeting UI with voting/chat, sabotage fix panels (reactor hand scanner, O2 keypad, lights switches), emergency popup, vote results reveal, ejection screen, vent HUD arrows, task list panel, role ability HUD (tracker/shapeshifter/phantom buttons).
- `js/core/cameraSystem.js` -- Among Us-style security cameras: 4 live feeds (2x2 grid), scan lines + REC indicator, wall-mounted camera blink state. Player is locked in place while viewing.

## Key Functions & Globals

### State Objects

- **`MafiaState`** (window global) -- The single source of truth for all match state:
  - `phase`: `'idle'` | `'role_reveal'` | `'playing'` | `'report_splash'` | `'meeting'` | `'voting'` | `'vote_results'` | `'ejecting'` | `'post_match'`
  - `playerRole`: `'crewmate'` | `'impostor'`
  - `playerSubrole`: role id (`'engineer'`, `'tracker'`, `'scientist'`, `'noisemaker'`, `'shapeshifter'`, `'phantom'`, `'viper'`) or `null`
  - `participants[]`: Array of participant objects with `{ id, name, role, subrole, entity, isBot, isLocal, alive, votedFor, emergenciesUsed, color, _aiState }`
  - `bodies[]`: `{ x, y, color, name, id, dissolveTimer?, dissolveMax? }` -- dead bodies on the ground (dissolveTimer used by Viper subrole)
  - `killCooldown`: Frames remaining before impostor can kill again
  - `sabotage`: `{ active, timer, cooldown, fixers, fixedPanels }` -- active sabotage tracking
  - `meeting`: `{ caller, type, votes, discussionTimer, votingTimer, splashTimer }` -- meeting/voting state
  - `ejection`: `{ name, wasImpostor, timer, message }` -- ejection animation state
  - `taskProgress`: `{ done, total }` -- global crew task progress
  - `playerIsGhost`: true after local player dies
  - `lastMeetingEndFrame`: for emergency cooldown tracking
  - `_settings`: Snapshot of lobby settings for the current match
  - `_roleState`: Per-role ability state (tracker, scientist, shapeshifter, phantom, noisemaker timers/cooldowns)

- **`MAFIA_GAME`** (const) -- Mode-level constants and per-map data:
  - `BOT_COUNT` (8 — 8 bots + 1 player = 9 total), `IMPOSTOR_COUNT` (1), `BOT_SPEED` (`PLAYER_BASE_SPEED` = 7.5)
  - `FOV_BASE_RADIUS` (4.5 tiles), `KILL_RANGE` (120px), `REPORT_RANGE` (150px), `EMERGENCY_RANGE` (120px)
  - Timers (frames @ 60fps): `KILL_COOLDOWN` (1800 = 30s), `DISCUSSION_TIME` (900 = 15s), `VOTING_TIME` (1800 = 30s), `EJECTION_TIME` (300 = 5s), `VOTE_RESULTS_TIME` (900 = 15s), `SABOTAGE_COOLDOWN` (1800 = 30s), `REACTOR_TIMER` (1800 = 30s), `O2_TIMER` (1800 = 30s)
  - Bot timing: `BOT_TASK_PAUSE_MIN` (180 = 3s), `BOT_TASK_PAUSE_MAX` (300 = 5s), `BOT_PATH_LIMIT` (8000)
  - Return: `RETURN_LEVEL` = `'mafia_lobby'`, `RETURN_TX` = 25, `RETURN_TY` = 20
  - `SABOTAGE_TYPES`: reactor_meltdown (timer 1800, panels [reactor_p1, reactor_p2], simultaneous=true), o2_depletion (timer 1800, panels [o2_o2, o2_admin], simultaneous=false — each independent keypad), lights_out (timer 0, panels [lights_electrical], simultaneous=false — flip switches)
  - `SABOTAGE_PANELS`: reactor_p1 (tx6,ty25), reactor_p2 (tx6,ty44), o2_o2 (tx99,ty32), o2_admin (tx92,ty38), lights_electrical (tx41,ty55)
  - `COLORS[]`: 10 Among Us colors — Red (#c51111), Blue (#132ed1), Green (#127f2d), Pink (#ed54ba), Orange (#ef7d0e), Yellow (#f5f557), Black (#3f474e), White (#d6e0f0), Purple (#6b2fbb), Cyan (#38fedb)
  - `SETTINGS_DEFAULTS`: Full lobby settings defaults
  - `MAPS.skeld_01`: `SPAWN` and `ROOM_CENTERS` (14 rooms)

- **`MAFIA_ROLES`** (const, `mafiaRoleData.js`) -- Role definitions registry with `id`, `name`, `team`, `description`, `color`, and per-role `settings`.

- **`MAFIA_ROLE_SETTINGS`** (const) -- Runtime role settings initialized from `MAFIA_ROLE_DEFAULTS` (percentage chances) and each role's specific setting defaults. Modified by lobby UI.

- **`MAFIA_SETTINGS`** (let) -- Runtime copy of general match settings, modified by lobby UI, cloned from `SETTINGS_DEFAULTS`.

- **`mafiaPlayerColorIdx`** (let) -- Player's chosen color index (0-9), persists across lobby visits.

### MafiaSystem Methods

| Method | Purpose |
|--------|---------|
| `startMatch()` | Spawns bots, assigns colors, calls `assignRoles()`, initializes all state, resets tasks, enters `role_reveal` phase |
| `setRole(roleName)` | Debug: `/role impostor`, `/role crewmate`, `/role engineer`, `/role shapeshifter`, etc. Resets `_roleState` |
| `getNearestKillTarget()` | Find nearest alive crewmate within kill range (impostor only) |
| `kill(targetId)` | Execute kill: mark dead, spawn body, teleport to victim, reset cooldown. Triggers Noisemaker alert if victim has that subrole |
| `tryKill()` | Wrapper: find nearest + kill |
| `getNearestReportableBody()` | Find nearest body within `REPORT_RANGE` |
| `report(bodyId)` | Report body -> start report splash -> meeting |
| `tryReport()` | Wrapper: find nearest body + report |
| `canCallEmergency()` | Checks phase, ghost, sabotage block, uses left, cooldown |
| `callEmergencyMeeting()` | Call emergency -> start meeting |
| `castVote(targetId)` | Player votes for participant or `'skip'` |
| `triggerSabotage(sabotageId)` | Start a sabotage (impostor only) |
| `tryFixSabotage(panelKey, participantId)` | Register fixer at panel (reactor: hold; O2: permanent fix) |
| `releaseSabotagePanel(panelKey)` | Release reactor hold (walked away) |
| `tick()` | Main per-frame tick, delegates to phase-specific tick |
| `_tickRoleAbilities()` | Ticks tracker/scientist/shapeshifter/phantom/noisemaker timers, Viper body dissolve |
| `_checkWinConditions()` | Checks impostor/crewmate/task victory conditions |
| `isPlayerFrozen()` | Returns true during role_reveal, report_splash, meeting, voting, vote_results, or ejecting phases |
| `endMatch()` | Reset all state, return to `mafia_lobby` |

### SkeldTasks

| Method | Purpose |
|--------|---------|
| `reset(settings)` | Initialize task state; picks random subset per category based on lobby settings |
| `completeStep(taskId, step)` | Mark a step done; auto-completes task when all steps done |
| `isStepDone(entity)` | Check if specific entity's step is done |
| `isDone(taskId)` | Check if entire task is complete |
| `canDoStep(entity)` | Check if entity's step is next (multi-step ordering) |
| `getProgress()` | Returns `{ done, total }` |
| `getTaskList()` | Returns display-ready list with labels, rooms, done status |

### VentSystem

| Method | Purpose |
|--------|---------|
| `enter(ventId)` | Start enter animation, snap player to vent center |
| `exit()` | Start exit animation |
| `cycleVent(targetId)` | Move to connected vent (no animation, camera follows) |
| `tick()` | Animate enter/exit transitions |
| `reset()` | Clear all vent state |

### CameraSystem

| Method | Purpose |
|--------|---------|
| `enter()` | Activate camera view, set blinking flag |
| `exit()` | Deactivate camera view |
| `isActive()` | Returns true if player is viewing cameras |
| `drawOverlay()` | Renders 2x2 camera feed grid with tiles, entities, participants, bodies |
| `handleClick(mx, my)` | Close button click detection |
| `handleKey(key)` | Escape/X to close |

4 camera feeds defined in `SKELD_CAMERAS`: Medbay Hallway, Security Hallway, Admin Hallway, Comms Hallway.

### Rendering Functions

| Function | Purpose |
|----------|---------|
| `drawMafiaFOV()` | Wall-aware raycasted FOV overlay; lights sabotage dimming; O2 fog effect |
| `drawMafiaBodies()` | Draw dead bodies in world space (colored crewmate shapes with cracked visors) |
| `drawMafiaHUD()` | KILL/REPORT/SABOTAGE/role ability buttons, meeting UI, vote results, ejection screen |
| `drawSabFixPanel()` | Reactor hand scanner, O2 keypad, lights switch panel |
| `drawVentHUD()` | Directional arrows to connected vents while in vent |
| `drawSkeldTaskList()` | Task list side panel with progress bar |

## Role System (`mafiaRoleData.js`)

Roles are split into base team (`crewmate`/`impostor`) and optional subroles that grant special abilities. Subroles are assigned probabilistically at match start via `assignRoles()` using weighted random picks based on `MAFIA_ROLE_SETTINGS` chance percentages.

### Crewmate Subroles

| Role | Description | Key Settings |
|------|-------------|-------------|
| **Engineer** | Can use vents to move around the map (normally impostor-only). | `ventCooldown` (15s), `ventDuration` (30s max time in vent) |
| **Tracker** | Can track a player and see their position on the map via a ping/arrow indicator. | `trackDuration` (15s), `trackCooldown` (30s) |
| **Noisemaker** | Triggers a visible alert on the map when killed, notifying all crewmates of the kill location. | `alertDuration` (10s) |
| **Scientist** | Can check the vitals panel from anywhere on the map (remotely view who is alive/dead). | `vitalsDuration` (15s), `vitalsCooldown` (30s) |

### Impostor Subroles

| Role | Description | Key Settings |
|------|-------------|-------------|
| **Shapeshifter** | Can disguise as another player (color/name swap). Can kill while shifted. Shift animation plays during transformation. | `shiftDuration` (20s), `shiftCooldown` (30s) |
| **Phantom** | Can turn fully invisible. Cannot kill while invisible. | `invisDuration` (10s), `invisCooldown` (25s) |
| **Viper** | Bodies dissolve shortly after a kill, removing evidence. Bodies have a `dissolveTimer` that ticks down. | `dissolveTime` (30s) |

### Role Assignment

Default chance percentages (`MAFIA_ROLE_DEFAULTS`): Engineer 30%, Tracker 20%, Noisemaker 20%, Scientist 20%, Shapeshifter 30%, Phantom 20%, Viper 20%. Chance values are configurable from the lobby settings panel. A roll against total chance determines whether a participant gets any subrole vs. staying base crewmate/impostor. **Player is always crewmate** (single-player constraint) — only bots can be impostor. Subroles are assigned via weighted random roll.

### Role State (`MafiaState._roleState`)

All role ability timers and state are stored in `_roleState`:
- **Tracker**: `trackedTarget`, `trackTimer`, `trackCooldown`
- **Scientist**: `vitalsOpen`, `vitalsTimer`, `vitalsCooldown`
- **Shapeshifter**: `shiftedAs`, `shiftTimer`, `shiftCooldown`, `shiftAnim` (animation state with `fromColor`/`toColor`)
- **Phantom**: `invisible`, `invisTimer`, `invisCooldown`
- **Noisemaker**: `deathAlert` (`{ x, y, timer, color }`)

Role abilities are ticked every frame via `MafiaSystem._tickRoleAbilities()`.

## How It Works

### Phase/State Machine

```
idle
  |
  v  (Scene enters Skeld map)
role_reveal (phaseTimer countdown)
  |
  v
playing ----> report_splash ----> meeting ----> voting ----> vote_results ----> ejecting
  ^                                                                               |
  |_______________________________________________________________________________|
  |
  v  (all impostors dead OR all tasks done OR sabotage timer expires)
post_match / endMatch() -> return to mafia_lobby
```

1. **idle**: `tick()` auto-calls `startMatch()` when entering the Skeld scene.
2. **role_reveal**: Brief screen showing the player their assigned role and subrole. Timer counts down, then transitions to playing.
3. **playing**: Kill cooldown ticks, sabotage system ticks, bot AI moves bots between rooms, tasks are playable, role abilities tick (tracker/shapeshifter/phantom/viper/noisemaker timers). Win conditions checked every frame.
4. **report_splash**: 2-second splash screen ("DEAD BODY REPORTED" or "EMERGENCY MEETING") before the meeting UI appears.
5. **meeting**: Discussion phase -- all players teleported to cafeteria spawn, discussion timer counts down, bots send random chat messages. No voting allowed yet.
6. **voting**: Players and bots cast votes. Bots vote randomly (80% for random player, 20% skip). Timer forces remaining votes as skip.
7. **vote_results**: Votes revealed one by one (shuffled order, 0.75s per reveal) then held briefly. After reveal + hold time, ejection occurs.
8. **ejecting**: Ejection message displayed for `EJECTION_TIME` (5s). Bodies cleared, cooldown reset, then back to playing.

### Roles

- **Crewmate**: Complete tasks, report bodies, call emergency meetings, fix sabotages. Vision = `crewVision` multiplier. May have a subrole (Engineer, Tracker, Noisemaker, Scientist).
- **Impostor**: Kill crewmates (Q key or KILL button), sabotage systems, use vents. Vision = `impostorVision` multiplier. May have a subrole (Shapeshifter, Phantom, Viper). Use `/role <subrole>` to test specific roles.

### Kill Mechanics

- Impostor must be within `killDistance` (Short: 80px, Medium: 120px, Long: 180px) of an alive crewmate.
- Kill cooldown resets to `killCooldown` seconds (default 30s) after each kill.
- On kill: victim marked dead, body spawned at their location, impostor teleported to victim (Among Us snap), blood_slash hit effect shown.
- If victim has the Noisemaker subrole, a death alert ping is triggered at the kill location visible to all players for `alertDuration` seconds.
- If killer has the Viper subrole, a `dissolveTimer` is set on the body so it disappears after `dissolveTime` seconds.
- Dead players become ghosts (semi-transparent blue tint, "GHOST" label, can still observe but not interact).

### Report & Meeting

- **Report**: Player must be within `REPORT_RANGE` (150px) of a body. Press R or click REPORT button.
- **Emergency**: Player presses E at cafeteria table interactable. Requires: no active sabotage, emergencies remaining, cooldown elapsed. Shows confirmation popup before calling.
- Report/emergency triggers `report_splash` phase (2s) then `meeting` phase. Everyone teleported to spawn, active sabotage cleared, chat reset.

### Voting

- Two-step confirmation: click player card -> confirm (green check) or cancel (red X). Same for skip.
- Anonymous votes setting hides who voted for whom.
- Confirm ejects setting controls whether role is revealed after ejection.
- Ties or skip majority -> "No one was ejected."

### Sabotage System

Three sabotage types, each with different fix mechanics:

| Sabotage | Timer | Fix Mechanic | Panels |
|----------|-------|-------------|--------|
| Reactor Meltdown | 30s | Both panels must be **held simultaneously** (reactor_p1, reactor_p2) | 2 hand scanners |
| O2 Depletion | 30s | Each panel fixed **independently** via 5-digit keypad code (o2_o2, o2_admin) | 2 keypads |
| Lights Out | No timer | Single panel with 5 toggle switches, all must be ON (lights_electrical) | 1 switch panel |

- Impostor triggers via SABOTAGE button (bottom center) -> picker menu with Reactor/O2/Lights options.
- Cooldown: 30s between sabotages.
- Timer-based sabotages (reactor, O2) show alert bar with countdown. Timer expiring = impostor wins.
- O2 adds progressive fog effect for crewmates (darkening vision as timer runs down).
- Meeting clears active sabotage (like Among Us).
- Emergency meetings blocked during active sabotage.
- Bot AI: crewmate bots auto-assign to fix panels (one bot per panel, closest unassigned).

### Task System

14 mini-games organized into 3 categories:

**Common** (given to all crewmates -- 4 available):
- `tap_sequence` -- Tap numbered circles in order
- `code_entry` -- Type a displayed code
- `simple_math` -- Solve arithmetic problems
- `match_symbol` -- Match symbols to their pairs

**Short** (single-step, quick -- 5 available):
- `slider_alignment` -- Align sliders to target positions
- `security_auth` -- Swipe card through reader
- `hold_to_charge` -- Hold button to fill charge bar
- `rotate_pipes` -- Rotate pipe segments to connect flow
- `calibrate_dial` -- Stop spinning dial at target zone

**Long** (multi-step or time-based -- 5 available):
- `circuit_paths` -- Wire colored circuits to correct endpoints
- `sample_analyzer` -- Start analyzer, wait, check result
- `path_trace` -- Trace a path through a maze
- `package_assembly` -- Assemble package components
- `empty_trash` -- Pull lever to empty trash

Lobby settings control how many of each category are active per match (`commonTasks`, `shortTasks`, `longTasks`). Tasks are randomly selected from each pool at match start.

Multi-step tasks require visiting multiple locations in order (tracked via `stepsCompleted` Set).

Task bar updates setting: `'Always'` (always visible), `'Meetings'` (only during meetings), `'Never'` (hidden).

### Vent System

Impostor-only traversal network (Engineers can also use vents) with 4 vent networks:

| Network | Vents (bidirectional) |
|---------|----------------------|
| 1 | Security <-> MedBay <-> Electrical (triangle) |
| 2 | Admin <-> Cafe Hallway <-> Nav Hallway (triangle) |
| 3 | Shields <-> Navigation (pair) |
| 4 | Weapons Upper <-> Nav Upper (pair) |

- Enter/exit with E key (20-frame animation).
- While inside: directional arrow buttons point toward connected vents; click or use arrow keys to move between.
- Player is invisible while in vent.

### FOV Rendering (Wall-Aware Raycasting)

The FOV system creates Among Us-style fog-of-war using wall-boundary vertex raycasting, not a simple circle gradient.

- **`buildFOVOccluderCache()`**: Builds a flat `Uint8Array` collision grid + extracts boundary vertices (grid corners where wall meets open space). Cached per level via `_fovGridLevelId`.
- **Boundary vertex extraction**: Each grid point `(gx, gy)` is checked against its 4 adjacent tiles. Points where at least one tile is solid AND at least one is empty become boundary vertices.
- **`getFOVCandidateAngles()`**: Filters boundary vertices within FOV range, generates 3 rays per vertex (center +/- epsilon) + 72 fill rays (every 5 degrees).
- **`computeVisibilityPolygon()`**: Sorts angles, DDA-casts each ray through the collision grid, returns a screen-space polygon defining the visible area.
- **Raycast origin is lerped** (0.35 blend factor) toward player position for smooth shadow movement without per-pixel jitter.
- **Dark overlay** (`rgba(0,0,0,0.93)`) with blurred polygon cutout (`blur(12px)`) for soft shadow edges.
- **Performance**: Cached `Uint8Array` flat grid + boundary vertex list (rebuilt per level), pre-allocated offscreen buffer. ~200-500 rays/frame.
- **Vision radius** = `FOV_BASE_RADIUS (4.5) * visionMultiplier * lightsMult * TILE`.
- **Vision multiplier**: Crewmates use `crewVision` (default 1x), impostors use `impostorVision` (default 1.5x).
- **Lights sabotage dimming**: Crewmate FOV smoothly shrinks to 35% of normal radius over 3 seconds (`_lightsDimProgress` 0 to 1, `_LIGHTS_FADE_FRAMES = 180`). Fades back up over 3 seconds when fixed. Impostors completely unaffected.
- **Ghost players** see full map (no FOV overlay).
- **O2 sabotage**: Additional progressive fog overlay for crewmates (shrinking clear radius as timer runs down).
- **Only wall tiles block FOV** -- solid entities (crates, tables, etc.) do NOT block vision (tried and reverted).
- **`isMafiaWorldPointVisible()`**: Gates gameplay objects (bots, bodies, tasks, sabotage panels) while environment stays softly readable through the darkness.

### Security Camera System (`cameraSystem.js`)

- Player interacts with the camera console entity to enter camera view.
- 4 simultaneous live feeds displayed in a 2x2 grid (60% of screen size).
- Each feed renders tiles, entities, other participants (via `drawChar()`), and dead bodies from its fixed camera position.
- Camera positions defined in `SKELD_CAMERAS`: Medbay Hallway (40,10), Security Hallway (20,34), Admin Hallway (76,44), Comms Hallway (87,62).
- Visual effects: green security tint, scan lines, static noise, blinking REC indicator, camera name labels, real-time timestamps.
- Wall-mounted camera entities (`skeld_camera_mount`) blink red when `CameraState.blinking` is true (someone is watching).
- Player is frozen in place while viewing. Close with X, Escape, or close button.

### Bot AI

- Bots are standalone entities (not in `mobs[]`), typed as `'mafia_bot'`.
- **Crewmate bots**: Pick random room from `ROOM_CENTERS`, BFS pathfind to it, pause 3-5s (simulating a task), repeat. Stuck detection at 90 frames triggers re-pick.
- **Sabotage response**: Closest unassigned crewmate bots auto-navigate to fix panels. Bots within 80px of panel call `tryFixSabotage()`.
- **Meeting chat**: Bots randomly post from a pool of 17 phrases (e.g., "Where?", "I was in Electrical", "Seems sus").
- **Voting**: 20% chance to skip, 80% chance to vote for a random alive player (not self). Votes cast at random intervals during voting phase.
- Movement uses player-style AABB collision with `PLAYER_WALL_HW` and corner unsticking.

### Skeld Map Layout

14 rooms defined in `MAFIA_GAME.MAPS.skeld_01.ROOM_CENTERS`:

| Room | Tile Coords |
|------|-------------|
| Cafeteria (spawn) | (74, 17) |
| Upper Engine | (16, 9) |
| Reactor | (6, 35) |
| Security | (34, 33) |
| MedBay | (49, 25) |
| Electrical | (50, 52) |
| Admin | (91, 46) |
| Storage | (70, 66) |
| Shields | (112, 62) |
| Communications | (92, 73) |
| Lower Engine | (16, 60) |
| Weapons | (109, 9) |
| O2 | (96, 29) |
| Navigation | (127, 34) |

Map grid: 135 wide x 80 tall tiles, with `XO=4` offset for virtual-to-actual coordinates.

### Lobby Settings

All settings are configurable from the pre-game lobby UI and stored in `MAFIA_SETTINGS`:

| Setting | Default | Range/Options |
|---------|---------|---------------|
| `impostors` | 1 | Integer |
| `killCooldown` | 30s | Integer (seconds) |
| `killDistance` | Medium | Short / Medium / Long |
| `playerSpeed` | 1x | Multiplier |
| `discussionTime` | 15s | Seconds |
| `votingTime` | 30s | Seconds |
| `emergencyMeetings` | 1 | Per player |
| `emergencyCooldown` | 15s | Seconds |
| `confirmEjects` | true | Boolean |
| `anonymousVotes` | false | Boolean |
| `commonTasks` | 1 | Count |
| `shortTasks` | 2 | Count |
| `longTasks` | 1 | Count |
| `taskBarUpdates` | Always | Always / Meetings / Never |
| `crewVision` | 1x | 0.25x - 5x |
| `impostorVision` | 1.5x | 0.25x - 5x |
| `map` | skeld_01 | Map ID |
| `maxPlayers` | 10 | Count |

Role-specific settings are also configurable per subrole (e.g., vent cooldown for Engineer, shift duration for Shapeshifter). These are stored in `MAFIA_ROLE_SETTINGS` alongside percentage chances for each subrole.

## Connections to Other Systems

- **Scene Manager** (`sceneManager.js`): `Scene.inSkeld` gates all Mafia rendering/logic. `enterLevel()` used for match start and return to lobby.
- **Game Loop** (`authorityTick.js`): `MafiaSystem.tick()` called each frame when `Scene.inSkeld`.
- **Mob System** (`mobSystem.js`): `bfsPath()` and `isSolid()` used for bot pathfinding and collision.
- **Input** (`input.js`): Q for kill, R for report, E for interact (emergency/tasks/vents). Click detection on canvas for all HUD buttons.
- **Level Data** (`levelData.js`): Skeld map tiles, entity definitions (tasks, vents, sabotage panels) defined as level entities.
- **Hit Effects** (`hitEffects.js`): `blood_slash` effect on kill.
- **Entity Renderers** (`entityRenderers.js`): Skeld-specific entity types (tasks, vents, sabotage panels, camera mounts) rendered in world space.
- **Save/Load** (`saveLoad.js`): Lobby settings and color choice are not persisted to localStorage (session-only).
- **Game Config** (`gameConfig.js`): `PLAYER_BASE_SPEED` and `PLAYER_WALL_HW` used for bot movement.

### Character Rendering (Among Us Crewmate Sprites)

- In Mafia mode (Skeld + Mafia Lobby), ALL characters render as colored Among Us crewmates instead of normal character sprites.
- Handled by `_drawCrewmateWorld()` in `characterSprite.js` -- intercepts at the top of `drawChar()` when `Scene.inSkeld || Scene.inMafiaLobby`.
- Direction-aware: visor faces movement direction, hidden when facing away (shows back of helmet).
- Walk animation: legs alternate when moving.
- Ghost mode: dead player renders at 35% opacity.
- Player color: from `MafiaState.participants` (in-game) or `mafiaPlayerColorIdx` (lobby).
- Bot colors: stored as `skin = color.body`, `hair = color.dark` in the entity.
- **No clothing/armor/hair/skin** is shown -- only the solid color crewmate body.

### Lobby

The mafia lobby is a pre-game room where the player configures match settings before starting. Three interactable objects are placed in the lobby level (`mafia_lobby` in `levelData.js`), registered as interactables on scene load via `interactable.js:821`:

#### Interactables

| Entity Type | Interact Label | Action | Range |
|-------------|---------------|--------|-------|
| `mafia_lobby_laptop` | `[E] Game Settings` | Opens the settings panel | 100px |
| `mafia_lobby_customize` | `[E] Customize` | Opens the color picker | 100px |
| `mafia_lobby_start` | `[E] Start Game` | Starts the match (transitions to Skeld map) | 100px |

All three require `Scene.inMafiaLobby` to be true and are triggered via the interact key (default E).

#### Settings Panel (`openMafiaSettingsPanel()`)

A 720×560 centered overlay with two tabs:

**Game Settings tab** — Configures `MAFIA_SETTINGS`:
- Map selector (currently only "The Skeld")
- Settings grouped into sections (Impostors, Crewmates, Tasks, Match)
- Each setting has +/- buttons; numeric values also accept direct input on click
- Boolean settings (Confirm Ejects, Anonymous Votes) have ON/OFF toggle buttons
- Enum settings (Kill Distance, Task Bar Updates) cycle through values
- Scrollable with a draggable scrollbar when content exceeds panel height

**Role Settings tab** — Configures `MAFIA_ROLE_SETTINGS`:
- Split into Crewmate Roles and Impostor Roles sections
- Each role shows: name, description, chance percentage (+/- in 10% increments, 0-100%)
- Per-role specific settings (e.g., Engineer vent cooldown, Shapeshifter shift duration) with +/- buttons using each setting's defined step/min/max

Close via the red X button in the top-right corner. Opening the settings panel auto-closes the color picker (and vice versa).

#### Color Picker (`openMafiaColorPicker()`)

A 400×380 centered overlay titled "CHOOSE YOUR COLOR":
- 10 Among Us colors displayed in a 5×2 grid of colored circles
- Each circle shows the color name below it
- Currently selected color has a white highlight ring
- Clicking a color sets `mafiaPlayerColorIdx` (persists for the session, not saved to localStorage)
- The selected color is also shown in the lobby HUD (bottom-left corner with color swatch + name)

#### Start Button (`startMafiaFromLobby()`)

- Blocked if either the settings panel or color picker is currently open
- Reads `MAFIA_SETTINGS.map` to determine which map to load (defaults to `skeld_01`)
- Uses `startTransition()` to fade into the Skeld map at the map's spawn point

#### Lobby HUD (`drawMafiaLobbyHUD()`)

Always drawn when `Scene.inMafiaLobby`:
- **Top banner**: "MAFIA LOBBY" title bar (dark background, white text)
- **Bottom-left**: Selected player color (circle swatch + color name)
- **Bottom-right**: Selected map name (e.g., "MAP: The Skeld")

#### Other Lobby Features

- Physical EXIT door at bottom-center of mafia lobby (5-tile gap in collision wall) -- walk south to return to main lobby. No need to use `/leave`.
- `/leave` also works as a fallback.
- Combat (melee + shooting) is disabled in both the main lobby and mafia lobby.

### Debug Commands

- `/role <roleName>` -- switch to any role or subrole: `impostor`, `crewmate`, `engineer`, `tracker`, `scientist`, `noisemaker`, `shapeshifter`, `phantom`, `viper`. Resets role ability state.
- `/sabo <reactor|o2|lights>` -- trigger a sabotage for testing.
- `/fix` -- instantly fix the active sabotage.

## Gotchas & Rules

- Player always starts as crewmate (single-player constraint — only bots can be impostor). Player may get a crewmate subrole from weighted random assignment. Use `/role impostor` or `/role <subrole>` to test.
- Bots are NOT in the `mobs[]` array -- they are tracked in `MafiaState.participants[].entity`. This means standard mob rendering/collision does not apply; they have custom rendering.
- Bot `hp` is set to `-1` so HP bars are skipped by the standard draw pipeline.
- Kill cooldown and sabotage cooldown are stored in frames (multiply seconds by 60).
- Meeting teleports ALL alive participants to spawn; clears active sabotage; resets chat.
- Vote results use a sequential reveal system (shuffled order, 45 frames per vote) before showing the final ejection.
- Sabotage fix panels freeze player movement while open (`_sabPanel.active` checked in `isPlayerFrozen()`).
- Reactor requires simultaneous hold on both panels -- a single player cannot fix it alone (by design).
- O2 keypad codes are randomly generated per panel open. The code is displayed on a sticky note in the panel.
- Lights switches persist on `mk.sabotage._switches` so closing/reopening the panel does not reset progress.
- Emergency meetings are blocked during active sabotage (like Among Us).
- The `_getKillRange()` method reads from `MafiaState._settings.killDistance`, not the constant `MAFIA_GAME.KILL_RANGE`.
- All Skeld coordinates use virtual space with `XO=4` offset. Minimap labels use actual grid coordinates.
- **FOV raycast origin is lerped** (0.35 blend) toward player position for smooth shadow movement. Do NOT use exact player position (causes jitter) or tile-center snapping (causes jumps).
- **Solid entities do NOT block FOV** -- this was tried and reverted because it looked bad. Only wall tiles (`collisionGrid`) block vision.
- **Impostors are unaffected by ALL sabotage visual effects** (lights dimming, O2 fog). Check `MafiaState.playerRole` before applying.
- `_fovGridLevelId` caches the FOV grid per level. It auto-rebuilds when `level.id` changes.
- Task entities in `levelData.js` have `taskId`, `taskStep`, `room`, and `label` fields that link to the `TASK_HANDLERS` registry.
- Vent networks are hardcoded per map in `VENT_NETWORK` (not data-driven from `MAFIA_GAME.MAPS`).
- **Viper body dissolve** is ticked in `_tickRoleAbilities()`, not per-body. Bodies with `dissolveTimer <= 0` are filtered out of `mk.bodies`.
- **Shapeshifter animation** (`shiftAnim`) plays during transformation with `fromColor`/`toColor` interpolation. The actual color swap happens in `_completeShapeshift()` when the animation timer reaches zero.
