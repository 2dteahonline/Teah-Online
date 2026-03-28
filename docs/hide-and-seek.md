# Hide & Seek

## Overview

Hide & Seek is a 1v1 game mode where the player picks either the hider or seeker role, and a bot takes the opposite role. The match has two timed phases: a hide phase (30s) where the hider moves freely while the seeker is frozen (shown a map overview), and a seek phase (30s) where the seeker hunts while the hider is frozen in place. The seeker wins by tagging the hider; the hider wins by surviving the timer.

## Files

- `js/authority/hideSeekSystem.js` -- State machine, bot AI (hider spot selection, seeker patrol/chase), tag detection, match lifecycle, weapon save/restore. 784 lines.
- `js/shared/hideSeekData.js` -- Constants: phase durations, tag range, FOV radius, bot speed, map ID, return destination. 17 lines.
- `js/client/rendering/hideSeekFOV.js` -- FOV overlay (seeker circular cutout), map overview (seeker during hide phase), HUD (phase timer, role label, transition flash), role select panel, post-match results panel, debug bot tracking minimap. 718 lines.

## Key Functions & Globals

### State Objects

- **`HideSeekState`** (window global) -- All match state:
  - `phase`: `'idle'` | `'role_select'` | `'hide'` | `'seek'` | `'post_match'`
  - `playerRole`: `'hider'` | `'seeker'`
  - `botRole`: opposite of `playerRole`
  - `phaseTimer`: frames remaining in current phase
  - `matchStartFrame`: frame when seek phase started (for timing stats)
  - `tagFrame`: frame when tag happened (0 = no tag)
  - `seekerWon`: true if seeker tagged hider before time ran out
  - `botMob`: the bot entity object (NOT in `mobs[]`)
  - `participants[]`: `[{ id, role, entity, isBot, isLocal }]` -- multiplayer-ready registry
  - Bot AI state: `_botTarget`, `_botPath`, `_botPathIdx`, `_botHideSpot`, `_seekerWaypoints`, `_seekerWPIdx`, `_chasing`, `_botStuckTimer`, `_botLastX`, `_botLastY`
  - `_savedMelee`, `_savedSlot`: weapon state saved before match, restored after

- **`HIDESEEK`** (const) -- Mode constants:
  - `HIDE_TIME`: 1800 frames (30s)
  - `SEEK_TIME`: 1800 frames (30s)
  - `POST_MATCH_TIME`: 600 frames (10s)
  - `TAG_RANGE`: 90px (matches default melee range)
  - `FOV_RADIUS`: 4.5 tiles
  - `BOT_SPEED`: 5.625 (`PLAYER_BASE_SPEED * 0.75` = 7.5 * 0.75)
  - `BOT_DETECT_RANGE`: 3 tiles
  - `MAP_ID`: `'hide_01'`
  - `RETURN_LEVEL`: `'lobby_01'`, `RETURN_TX`: 17, `RETURN_TY`: 22

- **`_HIDESEEK_DEFAULTS`** (const) -- Snapshot of default state values, used by `endMatch()` to reset all fields cleanly.

### HideSeekSystem Methods

| Method | Purpose |
|--------|---------|
| `startMatch(playerRole)` | Assign roles, spawn bot, save weapon state, equip Seeking Baton (if seeker), enter hide phase |
| `tick()` | Main per-frame tick: decrement timer, handle phase transitions, run bot AI |
| `onTag()` | Seeker caught hider: set `seekerWon`, enter post_match, show stun_stars effect |
| `isPlayerFrozen(participantId?)` | Returns true when participant should not move (seeker during hide, hider during seek, role_select, post_match) |
| `endMatch()` | Restore saved weapon, clean up globals, reset state, return to lobby |
| `getLocalPlayer()` | Find local player in participants array |
| `getHiders()` / `getSeekers()` / `getBots()` | Participant filters |

### Rendering Functions

| Function | Purpose |
|----------|---------|
| `drawHideSeekFOV()` | FOV overlay for seeker (circular cutout during seek, full map overview during hide) |
| `drawHideSeekHUD()` | Phase timer, role indicator, "Show Bot" toggle, seeker tracking minimap, phase transition flash |
| `drawHideSeekOverlay()` | Role select panel and post-match results panel |

## How It Works

### Phases

```
idle --> role_select --> hide (30s) --> seek (30s) --> post_match (10s) --> endMatch() --> lobby
                                            |
                                            +--> (tag!) --> post_match
```

1. **idle**: No match running. Portal entry triggers role_select.
2. **role_select**: Full-screen overlay with two clickable buttons (Hider / Seeker). Player picks a role.
3. **hide** (30s): The hider moves freely to find a hiding spot. The seeker is frozen and shown a full map overview (can study layout, optionally toggle "Show Hider" debug). Hider bot gets 2x speed boost to reach distant spots.
4. **seek** (30s): Roles swap movement -- seeker moves with FOV-limited vision, hider is frozen in place. Seeker has circular FOV cutout. Tag detection active.
5. **post_match** (10s): Results screen showing win/lose, time taken (if seeker won), or "Time ran out" (if hider won). If seeker lost, minimap reveals where the hider was hiding. "RETURN TO LOBBY" button or auto-return after timer.

### Roles

- **Hider**: Moves during hide phase, frozen during seek phase. Wins by surviving the full seek timer. Shown the "Show Seeker" toggle during seek phase (debug: tracking minimap showing seeker bot's position and current waypoint target).
- **Seeker**: Frozen during hide phase (sees map overview to study layout), moves during seek phase with FOV-limited vision. Wins by tagging the hider. Equipped with the Seeking Baton melee weapon.

### FOV System

- **Seeker during hide phase**: Full black screen with a map overview drawn on top. Shows all tiles (walls vs. floor), player spawn position (pulsing blue dot), and optional hider bot position (pulsing red dot + target marker, via "Show Hider" toggle).
- **Seeker during seek phase**: Standard circular FOV cutout. Dark overlay (`rgba(0,0,0,0.97)`) with radial gradient fade (inner 70% clear, outer 30% gradient). Radius = `FOV_RADIUS * TILE * WORLD_ZOOM` (4.5 tiles).
- **Hider**: No FOV restriction (full visibility). Optional "Show Seeker" toggle reveals a tracking minimap in the top-right corner showing the seeker bot's current position and target waypoint.

### Tag Detection

Two detection paths:
1. **Player as seeker**: Melee system detects Seeking Baton hit on the `hideseek_bot` entity -> calls `HideSeekSystem.onTag()`.
2. **Bot as seeker**: Bot AI checks distance to hider. When within `TAG_RANGE` (90px) during chase mode -> calls `onTag()`.

On tag: `seekerWon = true`, `tagFrame` recorded for timing, `stun_stars` hit effect at tag location, phase transitions to `post_match`.

### Bot AI

#### Hider Bot (during hide phase)

1. **Spot selection**: Scores every walkable tile on the map based on:
   - Number of surrounding walls (8-directional, more = better hiding)
   - Cardinal openings (dead-ends with 1 opening get +15 bonus, corners +5)
   - Distance from seeker spawn (farther = better, weighted 0.5x)
   - Tiles with 3+ cardinal openings are skipped (too exposed)
2. **Pathfinding**: Top 20% of scored tiles shuffled, first 20 candidates tested for BFS reachability. First reachable path is committed.
3. **Speed boost**: 2x normal speed during hide phase so bot can reach distant spots in time. Reset to normal when seek begins.
4. **Frozen during seek**: Bot stops moving once seek phase starts (stays at chosen spot).

#### Seeker Bot (during seek phase)

1. **Waypoint generation** (dynamic, works on any map):
   - Grid sample every 6 tiles, attracted toward locally open areas
   - Junction waypoints (3+ cardinal openings) and dead-end waypoints (1 opening) added
   - BFS-validated for reachability from seeker spawn
   - Ordered via nearest-neighbor greedy traversal
   - 25% of adjacent pairs randomly swapped for variety
2. **Patrol mode**: Navigate through waypoints in order (loop around). BFS pathfind to each waypoint, advance when within 1.5 tiles.
3. **Detection**: If hider is within `FOV_RADIUS * TILE` and line-of-sight is clear (step-by-step wall check), enter chase mode.
4. **Chase mode**: BFS pathfind directly to hider's tile. Tag if within `TAG_RANGE`. Lose tracking if hider exceeds 3x detect range.
5. **Stuck detection**: If bot moves less than 2px in 60 frames, skip to next waypoint.

#### Movement

Both hider and seeker bots use player-style AABB collision:
- `PLAYER_WALL_HW` (16px) half-width for wall collision
- Separate X/Y axis collision resolution
- 2px corner unsticking nudge when stuck on both axes
- Direction facing based on dominant movement axis
- `bot.frame += 0.15` for walk animation

### Score & Win Conditions

- **Seeker wins**: Tag the hider before `SEEK_TIME` expires. Post-match shows "YOU WIN!" (if player is seeker) or "YOU LOSE!" with time taken (e.g., "Hider was found in 12.3s").
- **Hider wins**: Survive the full seek timer. Post-match shows "Time ran out! Hider survived."
- If seeker (player) lost, post-match includes a minimap revealing where the hider was hiding (pulsing red dot with "HIDER WAS HERE" label).

### Map & Level Data

- Default map: `hide_01` (set via `HIDESEEK.MAP_ID`).
- Maps define spawn points via `level.spawns.seeker` and `level.spawns.hider` (tile coordinates).
- Any map with these spawn definitions works -- the bot AI dynamically generates waypoints for any map layout.
- Debug command: `_hideSeekDebug('seeker')` or `_hideSeekDebug('hider', 'hide_02')` starts a match directly.

## Connections to Other Systems

- **Scene Manager** (`sceneManager.js`): `Scene.inHideSeek` gates all Hide & Seek rendering/logic. `enterLevel()` used for map transitions and return to lobby.
- **Game Loop** (`authorityTick.js`): `HideSeekSystem.tick()` called each frame when `Scene.inHideSeek`.
- **Mob System** (`mobSystem.js`): `bfsPath()` and `isSolid()` used for bot pathfinding. `positionClear()` available but not directly used (AABB collision done inline).
- **Melee System** (`meleeSystem.js`): Seeking Baton melee hit on `hideseek_bot` triggers `onTag()`. The Seeking Baton weapon data is defined in `SEEKING_BATON`.
- **Input** (`input.js`): Click detection for role select buttons, "Show Bot" toggle, and "RETURN TO LOBBY" button. Window globals `_hsRoleButtons`, `_hsShowBotBtn`, `_hsReturnButton` store click regions.
- **Hit Effects** (`hitEffects.js`): `stun_stars` effect spawned at tag location.
- **Game Config** (`gameConfig.js`): `PLAYER_BASE_SPEED` and `PLAYER_WALL_HW` used for bot movement and collision.
- **Weapon System**: `applyMeleeStats()` and `applyDefaultMelee()` used to equip Seeking Baton at match start and restore original weapon at match end. `activeSlot` forced to melee slot (1) when playing as seeker.

## Gotchas & Rules

- The bot is NOT in the `mobs[]` array. It is stored as `HideSeekState.botMob` and tracked in `participants[]`. Standard mob rendering and collision do not apply.
- Weapon state is saved before match and restored after. If `applyMeleeStats` is unavailable, `applyDefaultMelee()` is used as fallback.
- The hider bot commits to a single hiding spot during the hide phase and does not re-pick. This is intentional -- it simulates a real player's commitment to a spot.
- Hider bot gets 2x speed during hide phase only. Speed resets to normal (`BOT_SPEED`) when seek phase begins.
- Seeker bot waypoints are generated dynamically at match start using the current map's collision grid. They are not hardcoded per map.
- `isPlayerFrozen()` accepts an optional `participantId` for multiplayer readiness. Without it, defaults to the local player.
- Portal return coordinates (`RETURN_TX`, `RETURN_TY`) must be set below the portal entrance zone in the lobby to avoid instant re-teleport loops.
- The `_showBotOverlay` toggle is shared between seeker's hide-phase map overview and hider's seek-phase tracking minimap. It resets to `false` at match start.
- Window globals for click regions (`_hsShowBotBtn`, `_hsRoleButtons`, `_hsReturnButton`) are cleaned up in `endMatch()`.
- When referencing `HideSeekState` in callbacks, use the full path `HideSeekState.botMob` rather than a cached reference to avoid stale references after state resets.
