# Mafia (Among Us-style Game Mode)

## Overview

"Mafia" is the game mode; "Skeld" is one map within it -- the same relationship as Among Us has with its maps (Skeld, Polus, Mira HQ). The mode features impostor/crewmate roles, kill/report/meeting/voting mechanics, sabotage systems, a full task mini-game suite, FOV-limited vision, and bot AI. Currently one map (`skeld_01`) is implemented with room for future maps under `MAFIA_GAME.MAPS`.

## Files

- `js/authority/mafiaSystem.js` -- State machine, bot AI, role assignment, kill/body/ghost, meeting/voting, sabotage tick, match lifecycle. 1117 lines.
- `js/shared/mafiaGameData.js` -- Mode-level constants, color palette, sabotage types, per-map data (spawn, room centers), lobby settings defaults. 144 lines.
- `js/core/skeldTasks.js` -- Task state tracker (`SkeldTasks`), vent system (`VentSystem`), task list side panel, and 14 task mini-game implementations via `TASK_HANDLERS` registry. Also handles task categories (common/short/long). 2694 lines.
- `js/client/rendering/mafiaFOV.js` -- FOV overlay, dead body rendering, HUD buttons (kill/report/sabotage), meeting UI with voting/chat, sabotage fix panels (reactor hand scanner, O2 keypad, lights switches), emergency popup, vote results reveal, ejection screen, vent HUD arrows, task list panel. 2564 lines.

## Key Functions & Globals

### State Objects

- **`MafiaState`** (window global) -- The single source of truth for all match state:
  - `phase`: `'idle'` | `'playing'` | `'meeting'` | `'voting'` | `'vote_results'` | `'ejecting'` | `'post_match'`
  - `playerRole`: `'crewmate'` | `'impostor'`
  - `participants[]`: Array of participant objects with `{ id, name, role, entity, isBot, isLocal, alive, votedFor, emergenciesUsed, color, _aiState }`
  - `bodies[]`: `{ x, y, color, name, id }` -- dead bodies on the ground
  - `killCooldown`: Frames remaining before impostor can kill again
  - `sabotage`: `{ active, timer, cooldown, fixers, fixedPanels }` -- active sabotage tracking
  - `meeting`: `{ caller, type, votes, discussionTimer, votingTimer }` -- meeting/voting state
  - `ejection`: `{ name, wasImpostor, timer, message }` -- ejection animation state
  - `taskProgress`: `{ done, total }` -- global crew task progress
  - `playerIsGhost`: true after local player dies
  - `lastMeetingEndFrame`: for emergency cooldown tracking
  - `_settings`: Snapshot of lobby settings for the current match

- **`MAFIA_GAME`** (const) -- Mode-level constants and per-map data:
  - `BOT_COUNT` (8), `IMPOSTOR_COUNT` (1), `BOT_SPEED` (6.25)
  - `FOV_BASE_RADIUS` (9 tiles), `KILL_RANGE` (120px), `REPORT_RANGE` (150px)
  - Timers: `KILL_COOLDOWN`, `DISCUSSION_TIME`, `VOTING_TIME`, `EJECTION_TIME`, `VOTE_RESULTS_TIME`
  - `SABOTAGE_TYPES`: reactor_meltdown, o2_depletion, lights_out (with fix panel configs)
  - `SABOTAGE_PANELS`: tile positions for fix panels
  - `COLORS[]`: 10 Among Us colors (Red, Blue, Green, Pink, Orange, Yellow, Black, White, Purple, Cyan)
  - `SETTINGS_DEFAULTS`: Full lobby settings defaults
  - `MAPS.skeld_01`: `SPAWN` and `ROOM_CENTERS` (14 rooms)

- **`MAFIA_SETTINGS`** (let) -- Runtime copy of settings, modified by lobby UI, cloned from `SETTINGS_DEFAULTS`.

- **`mafiaPlayerColorIdx`** (let) -- Player's chosen color index (0-9), persists across lobby visits.

### MafiaSystem Methods

| Method | Purpose |
|--------|---------|
| `startMatch()` | Spawns bots, assigns colors, initializes all state, resets tasks |
| `setRole(roleName)` | Debug: `/role impostor` or `/role crewmate` |
| `getNearestKillTarget()` | Find nearest alive crewmate within kill range (impostor only) |
| `kill(targetId)` | Execute kill: mark dead, spawn body, teleport to victim, reset cooldown |
| `tryKill()` | Wrapper: find nearest + kill |
| `getNearestReportableBody()` | Find nearest body within `REPORT_RANGE` |
| `report(bodyId)` | Report body -> start meeting |
| `tryReport()` | Wrapper: find nearest body + report |
| `canCallEmergency()` | Checks phase, ghost, sabotage block, uses left, cooldown |
| `callEmergencyMeeting()` | Call emergency -> start meeting |
| `castVote(targetId)` | Player votes for participant or `'skip'` |
| `triggerSabotage(sabotageId)` | Start a sabotage (impostor only) |
| `tryFixSabotage(panelKey, participantId)` | Register fixer at panel (reactor: hold; O2: permanent fix) |
| `releaseSabotagePanel(panelKey)` | Release reactor hold (walked away) |
| `tick()` | Main per-frame tick, delegates to phase-specific tick |
| `isPlayerFrozen()` | Returns true during meeting/voting/ejecting/popup phases |
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

### Rendering Functions

| Function | Purpose |
|----------|---------|
| `drawMafiaFOV()` | Wall-aware raycasted FOV overlay; lights sabotage dimming; O2 fog effect |
| `drawMafiaBodies()` | Draw dead bodies in world space (colored crewmate shapes with cracked visors) |
| `drawMafiaHUD()` | KILL/REPORT/SABOTAGE buttons, meeting UI, vote results, ejection screen |
| `drawSabFixPanel()` | Reactor hand scanner, O2 keypad, lights switch panel |
| `drawVentHUD()` | Directional arrows to connected vents while in vent |
| `drawSkeldTaskList()` | Task list side panel with progress bar |

## How It Works

### Phase/State Machine

```
idle
  |
  v  (Scene enters Skeld map)
playing ----> meeting ----> voting ----> vote_results ----> ejecting
  ^                                                           |
  |___________________________________________________________|
  |
  v  (all impostors dead OR all tasks done OR sabotage timer expires)
post_match / endMatch() -> return to mafia_lobby
```

1. **idle**: `tick()` auto-calls `startMatch()` when entering the Skeld scene.
2. **playing**: Kill cooldown ticks, sabotage system ticks, bot AI moves bots between rooms, tasks are playable.
3. **meeting**: Discussion phase -- all players teleported to cafeteria spawn, discussion timer counts down, bots send random chat messages. No voting allowed yet.
4. **voting**: Players and bots cast votes. Bots vote randomly (80% for random player, 20% skip). Timer forces remaining votes as skip.
5. **vote_results**: Votes revealed one by one (shuffled order, 0.75s per reveal) then held briefly. After reveal + hold time, ejection occurs.
6. **ejecting**: Ejection message displayed for `EJECTION_TIME` (5s). Bodies cleared, cooldown reset, then back to playing.

### Roles

- **Crewmate**: Complete tasks, report bodies, call emergency meetings, fix sabotages. Vision = `crewVision` multiplier.
- **Impostor**: Kill crewmates (Q key or KILL button), sabotage systems, use vents. Vision = `impostorVision` multiplier. Currently assigned via `/role impostor` debug command (player starts as crewmate by default).

### Kill Mechanics

- Impostor must be within `killDistance` (Short: 80px, Medium: 120px, Long: 180px) of an alive crewmate.
- Kill cooldown resets to `killCooldown` seconds (default 30s) after each kill.
- On kill: victim marked dead, body spawned at their location, impostor teleported to victim (Among Us snap), blood_slash hit effect shown.
- Dead players become ghosts (semi-transparent blue tint, "GHOST" label, can still observe but not interact).

### Report & Meeting

- **Report**: Player must be within `REPORT_RANGE` (150px) of a body. Press R or click REPORT button.
- **Emergency**: Player presses E at cafeteria table interactable. Requires: no active sabotage, emergencies remaining, cooldown elapsed. Shows confirmation popup before calling.
- Meeting starts -> everyone teleported to spawn, active sabotage cleared, chat reset.

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

Impostor-only traversal network with 5 vent networks:

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

- **DDA raycasting** through the collision grid — walls block vision, creating Among Us-style shadow occlusion.
- 360 base rays (1° intervals) + extra corner rays aimed at wall tile corners for crisp shadow edges at doorways.
- **Raycast origin snapped to tile center** — shadows only shift when player crosses a tile boundary, eliminating per-pixel jitter.
- Dark overlay (`rgba(0,0,0,0.93)`) with polygon cutout for visible area + soft radial vignette at max range.
- Performance: cached `Uint8Array` flat grid (rebuilt per level), pre-computed cos/sin tables, pre-allocated offscreen buffer.
- Vision radius = `FOV_BASE_RADIUS * visionMultiplier * lightsMult * TILE`.
- Vision multiplier differs by role: crewmates use `crewVision` (default 1x), impostors use `impostorVision` (default 1.5x).
- **Lights sabotage dimming**: crewmate FOV smoothly shrinks to 35% of normal radius over 3 seconds (`_lightsDimProgress` 0→1). Fades back up over 3 seconds when fixed. Impostors completely unaffected.
- Ghost players see full map (no FOV overlay).
- During O2 sabotage: additional progressive fog overlay for crewmates (shrinking clear radius as timer runs down).
- **Only wall tiles block FOV** — solid entities (crates, tables, etc.) do NOT block vision (tried and reverted — didn't look good).

### Bot AI

- Bots are standalone entities (not in `mobs[]`), typed as `'mafia_bot'`.
- **Crewmate bots**: Pick random room from `ROOM_CENTERS`, BFS pathfind to it, pause 3-5s (simulating a task), repeat. Stuck detection at 90 frames triggers re-pick.
- **Sabotage response**: Closest unassigned crewmate bots auto-navigate to fix panels. Bots within 80px of panel call `tryFixSabotage()`.
- **Meeting chat**: Bots randomly post from a pool of 17 phrases (e.g., "Where?", "I was in Electrical", "Seems sus").
- **Voting**: 20% chance to skip, 80% chance to vote for a random alive player (not self). Votes cast at random intervals during voting phase.
- Movement uses player-style AABB collision with `PLAYER_WALL_HW` and corner unsticking.

### Skeld Map Layout

14 rooms defined in `MAFIA_GAME.MAPS.skeld_01.ROOM_CENTERS`:

Cafeteria (spawn), Upper Engine, Reactor, Security, MedBay, Electrical, Admin, Storage, Shields, Communications, Lower Engine, Weapons, O2, Navigation.

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

## Connections to Other Systems

- **Scene Manager** (`sceneManager.js`): `Scene.inSkeld` gates all Mafia rendering/logic. `enterLevel()` used for match start and return to lobby.
- **Game Loop** (`authorityTick.js`): `MafiaSystem.tick()` called each frame when `Scene.inSkeld`.
- **Mob System** (`mobSystem.js`): `bfsPath()` and `isSolid()` used for bot pathfinding and collision.
- **Input** (`input.js`): Q for kill, R for report, E for interact (emergency/tasks/vents). Click detection on canvas for all HUD buttons.
- **Level Data** (`levelData.js`): Skeld map tiles, entity definitions (tasks, vents, sabotage panels) defined as level entities.
- **Hit Effects** (`hitEffects.js`): `blood_slash` effect on kill.
- **Entity Renderers** (`entityRenderers.js`): Skeld-specific entity types (tasks, vents, sabotage panels) rendered in world space.
- **Save/Load** (`saveLoad.js`): Lobby settings and color choice are not persisted to localStorage (session-only).
- **Game Config** (`gameConfig.js`): `PLAYER_BASE_SPEED` and `PLAYER_WALL_HW` used for bot movement.

### Character Rendering (Among Us Crewmate Sprites)

- In Mafia mode (Skeld + Mafia Lobby), ALL characters render as colored Among Us crewmates instead of normal character sprites.
- Handled by `_drawCrewmateWorld()` in `characterSprite.js` — intercepts at the top of `drawChar()` when `Scene.inSkeld || Scene.inMafiaLobby`.
- Direction-aware: visor faces movement direction, hidden when facing away (shows back of helmet).
- Walk animation: legs alternate when moving.
- Ghost mode: dead player renders at 35% opacity.
- Player color: from `MafiaState.participants` (in-game) or `mafiaPlayerColorIdx` (lobby).
- Bot colors: stored as `skin = color.body`, `hair = color.dark` in the entity.
- **No clothing/armor/hair/skin** is shown — only the solid color crewmate body.

### Lobby

- Physical EXIT door at bottom-center of mafia lobby (5-tile gap in collision wall) — walk south to return to main lobby. No need to use `/leave`.
- `/leave` also works as a fallback.
- Combat (melee + shooting) is disabled in both the main lobby and mafia lobby.

### Debug Commands

- `/sabo <reactor|o2|lights>` — trigger a sabotage for testing.
- `/fix` — instantly fix the active sabotage.
- `/role impostor` / `/role crewmate` — switch roles.

## Gotchas & Rules

- Player always starts as crewmate. Use `/role impostor` to test impostor features.
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
- **FOV raycast origin is snapped to tile center** — this prevents jitter. Do NOT change this to use exact player position.
- **Solid entities do NOT block FOV** — this was tried and reverted because it looked bad. Only wall tiles (`collisionGrid`) block vision.
- **Impostors are unaffected by ALL sabotage visual effects** (lights dimming, O2 fog). Check `MafiaState.playerRole` before applying.
- `_fovGridLevelId` caches the FOV grid per level. It auto-rebuilds when `level.id` changes.
- Task entities in `levelData.js` have `taskId`, `taskStep`, `room`, and `label` fields that link to the `TASK_HANDLERS` registry.
- Vent networks are hardcoded per map in `VENT_NETWORK` (not data-driven from `MAFIA_GAME.MAPS`).
