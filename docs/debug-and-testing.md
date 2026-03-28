# Debug & Testing

## Overview

Teah Online includes a suite of debug slash commands (entered via in-game chat), a graphical mob testing panel, a snapshot system for state serialization, and several dev flags for controlling game behavior during development. Since this is a Canvas-rendered game with no DOM-based game UI, testing relies on direct state inspection rather than screenshots.

## Files

- `js/client/ui/panelManager.js` -- Chat command parsing and slash command implementations (lines ~505-875).
- `js/client/ui/testMobPanel.js` -- Test mob GUI panel (`/testmob`), mob card rendering, `TESTMOB_DUNGEONS` registry, `MOB_ABILITY_DESCRIPTIONS`.
- `js/authority/snapshots.js` -- `serializeGameState()`, `applyGameStateSnapshot()`, `DEBUG_dumpSnapshot()`, `DEBUG_roundTripSnapshot()`.
- `js/authority/commands.js` -- `DEBUG_dumpCommands()` (command history ring buffer).
- `js/testing/testHarness.js` -- Automated mob testing functions (`testAllFloorMobs`, `testMobDeep`, `testBossRotation`, `testAllMobs`).
- `js/authority/authorityTick.js` -- `DEBUG_pauseAuthority` flag.

## Key Functions & Globals

| Name | Type | Description |
|------|------|-------------|
| `window._opMode` | boolean | OP mode: infinite gold, 10000 HP, all items unlocked |
| `window._godMode` | boolean | Player invincibility |
| `window._mobsFrozen` | boolean | All mobs frozen (speed=0, abilities disabled) |
| `window._mobsNoFire` | boolean | Mobs cannot shoot or use abilities |
| `window._gameSpeed` | number | Game speed multiplier (0.25, 0.5, 1, 2) |
| `window.DEBUG_pauseAuthority` | boolean | Freezes the entire game loop (authority tick does nothing) |
| `DEBUG_dumpCommands(n)` | function | Logs last N commands from history ring buffer |
| `DEBUG_dumpSnapshot()` | function | Logs current game state snapshot to console |
| `DEBUG_roundTripSnapshot()` | function | Serialize -> apply -> re-serialize and verify identity |
| `serializeGameState()` | function | Returns a JSON-safe snapshot of all gameplay state |
| `applyGameStateSnapshot(snap)` | function | Writes a snapshot into live GameState |

## How It Works

### Debug Slash Commands

All commands are entered in the chat input (Tab to open, type command, Enter to execute). Commands are parsed in `panelManager.js`.

| Command | Arguments | Description |
|---------|-----------|-------------|
| `/help` | -- | Lists all available commands |
| `/gold` (or `/addgold`) | `[amount]` | Adds gold (default 500) |
| `/wave` | `<n>` | Jump to wave N (auto-calculates floor, spawns wave, resets HP) |
| `/heal` | -- | Restore player HP to max |
| `/hp` | `<amount\|max\|full>` | Set player HP to specific value or max. If amount exceeds maxHp, maxHp is raised |
| `/op` | -- | Toggle OP mode (infinite gold, 10000 HP, all items unlocked) |
| `/god` | -- | Toggle god mode (player invincibility) |
| `/freeze` | -- | Toggle freeze all mobs (speed=0, abilities disabled) |
| `/nofire` | -- | Toggle mob shooting/abilities off |
| `/speed` | `<0.25\|0.5\|1\|2>` | Set game speed multiplier |
| `/spawn` | `<mobType>` | Spawn a mob near the player (live, in current level) |
| `/killall` | -- | Kill all mobs and clear bullets |
| `/test` | `[mobType] [live]` | Enter test arena; spawn mob frozen (or live). No args = enter arena + show help |
| `/testmob` | -- | Open the graphical mob tester panel |
| `/dung` | `<type>` | Teleport to a dungeon (cave, azurine, etc.). Level-gated unless OP mode is on |
| `/floor` | `<n>` | Set dungeon floor number |
| `/stairs` | -- | Force open the staircase |
| `/skipw` | -- | Clear current wave and advance to next |
| `/leave` | -- | Leave current dungeon/mode |
| `/skip` | -- | Skip current Hide & Seek phase |
| `/gun` | `<id> [tier level]` or `<id> [level]` | Give a main gun at specified tier/level |
| `/mg` | -- | Open the gun modification (CT-X) panel |
| `/sprites` | -- | Toggle sprite rendering mode on/off |
| `/export` | `[name]` | Export sprite template as downloadable images |
| `/info` | -- | Show current dungeon/floor/wave/mob info |
| `/save` | -- | Force save to localStorage |
| `/resetsave` | -- | Clear all save data (requires page refresh) |
| `/grunt` | -- | Legacy: spawn a test grunt |
| `/testmob bot` | `[right]` | Spawn a test shoot bot (left side default, or right) |
| `/ghost` | -- | Toggle alive/dead (ghost mode) in Mafia |
| `/role` | `<impostor\|crewmate\|...>` | Change Mafia role (debug, must be in Skeld). Accepts team names, sub-roles from `MAFIA_ROLES`, and "imposter" spelling |
| `/sabo` | `<reactor\|o2\|lights>` | Trigger a sabotage event (must be in Skeld, playing phase) |
| `/fix` | -- | Instantly resolve the active sabotage |
| `/party` | `<1-4\|reset>` | Set party size (2-4 spawns bots), or reset to solo. No args shows status |

### Test Mob Panel

Opened via `/testmob`. A full GUI panel for spawning and testing any mob in the game.

**Features**:
- Left sidebar: select dungeon (Cave, Azurine City, Vortalis, Earth-205, Wagashi, Earth-216) and floor (1-5)
- Right grid: shows all mobs on that floor as cards with name, stats, boss badge
- Each card has two buttons: FROZEN (spawns mob with speed=0 and abilities disabled) and LIVE (spawns mob with full AI)
- Right-click any mob card to see a detailed mob info card with stats and ability descriptions
- Spawning enters a test arena level automatically, enables OP mode
- Previous mobs/bullets/effects are cleared before each spawn

**Data structures**:
- `TESTMOB_DUNGEONS` -- maps 6 dungeon keys (cave, azurine, vortalis, earth205, wagashi, earth216) to floor -> mob type lists
- `MOB_ABILITY_DESCRIPTIONS` -- human-readable descriptions for all 100+ mob special abilities
- Panel validates floor counts against `DUNGEON_REGISTRY` at load time
- When adding new dungeons/mobs, always update both `TESTMOB_DUNGEONS` and `MOB_ABILITY_DESCRIPTIONS`

### Snapshots System

The snapshot system serializes the entire authoritative game state into a plain JSON object. This is the data contract for future multiplayer networking.

**`serializeGameState()`** captures:
- Player position, velocity, knockback, speed, direction, animation, HP, name, all 18 cosmetic fields
- Wave/combat state: wave number, waveState, kills, dungeon floor, gold, active slot, lives
- Death state: timers, position, rotation, game over flag
- Poison state
- Dungeon progress: stairs, completion, revive, floor
- Grab state
- Gun state: ammo, mag size, reloading, fire cooldown, damage, recoil, special
- Melee state: full swing/dash state (20+ fields)
- Ultimate state: shrine and godspeed (charges, timers, damage)
- Inventory: all items serialized (deep copy of data)
- Equipment: armor, gun, melee, boots, pants, chest, helmet
- Potion state
- All mobs (full state per mob including type-specific fields for witch/golem/archer/healer/mummy)
- All bullets (position, velocity, type flags)
- All medpacks
- ID counters (nextMobId, nextBulletId)

**NOT included in snapshots** (client-only or cosmetic):
- UI state, DOM, chat, mouse, keysDown, canvas context, panels
- Cosmetic particles (hitEffects, deathEffects, mobParticles)
- Camera, transition state, rendering timers

**Debug tools**:
- `DEBUG_dumpSnapshot()` -- logs snapshot summary (mob count, bullet count, size in KB) + full object
- `DEBUG_roundTripSnapshot()` -- serialize -> apply -> re-serialize, then compares (excluding timestamp). Reports PASS or MISMATCH with diff details

### Test Harness

`js/testing/testHarness.js` provides automated testing functions injectable via script tag or `preview_eval`:

| Function | Description |
|----------|-------------|
| `testAllFloorMobs(floor)` | Batch test all mobs on a floor |
| `testMobDeep(typeKey)` | Deep test a single mob |
| `testBossRotation(typeKey)` | Test boss ability rotation |
| `testAllMobs()` | Regression test all implemented floors |

These functions use the test arena, automatically entering it and setting up OP mode.

### Dev Flags

| Flag | Default | Effect |
|------|---------|--------|
| `window._opMode` | `false` | Infinite gold (999999), 10000 HP, bypasses wave/tier requirements for equipment |
| `window._godMode` | `false` | Player takes no damage |
| `window._mobsFrozen` | `false` | All mobs have speed=0 and abilities disabled |
| `window._mobsNoFire` | `false` | Mobs cannot shoot or use special abilities |
| `window._gameSpeed` | `1` | Game tick speed multiplier |
| `window.DEBUG_pauseAuthority` | `false` | Freezes the entire authority tick (game is completely paused) |

**Reset behavior:** `_godMode`, `_mobsFrozen`, `_mobsNoFire`, and `_gameSpeed` are all reset to defaults by `resetCombatState()` on every scene transition. `_opMode` and `DEBUG_pauseAuthority` are NOT reset -- they persist until manually toggled off.

The debug overlay (toggled via Settings > General > Debug Overlay, or `gameSettings.showDebugOverlay`) shows zoom/scale/tile info. Active flags (OP, GOD, FROZEN, NOFIRE) are rendered as colored badges in the HUD.

### Development Server

```
python -m http.server 8080
```

No build tools, no npm, no bundler. Open `http://localhost:8080` in a browser. The dev server config is in `.claude/launch.json`.

### Testing Approach

Since Teah Online renders entirely to a Canvas element, DOM inspection and screenshots are not useful for verifying game state. Instead:

- **`preview_eval()`** -- Execute JS in the game context to read state directly. Example: `JSON.stringify({ mobs: mobs.length, hp: player.hp, wave: wave })` (~50 tokens vs ~3000 for a screenshot).
- **`preview_console_logs(level: 'error')`** -- Check for runtime errors.
- **Batch checks** -- Test multiple things in a single `JSON.stringify({...})` call.
- **Do NOT use screenshots** to verify Canvas-drawn content.
- **`DEBUG_dumpCommands(30)`** -- Inspect recent input commands for debugging input issues.
- **`DEBUG_roundTripSnapshot()`** -- Verify snapshot serialization integrity after state changes.

## Connections to Other Systems

- **Authority Tick** (`authorityTick.js`): `DEBUG_pauseAuthority` halts the tick entirely. Snapshots are produced at the end of each tick.
- **Command Queue** (`commands.js`): `DEBUG_dumpCommands()` reads from the 200-entry command history ring buffer.
- **Save/Load** (`saveLoad.js`): `/save` and `/resetsave` trigger `SaveLoad.save()` and `SaveLoad.clear()`.
- **Mob System** (`mobSystem.js`, `combatSystem.js`): `/spawn`, `/test`, `/testmob`, `/killall`, `/freeze` all manipulate the `mobs` array and mob properties.
- **Wave System** (`waveSystem.js`): `/wave`, `/skipw`, `/floor` manipulate wave and floor state.
- **Gun System** (`gunSystem.js`, `inventorySystem.js`): `/gun` creates gun items and sets progression.
- **Scene System**: `/dung` and `/test` trigger `enterLevel()` to change scenes.

## Gotchas & Rules

- **All slash commands are client-side only**: In a future multiplayer setup, these would need to be gated server-side. Currently there is no authentication or access control.
- **Test arena is a separate level**: `/test` and `/testmob` spawn enter `test_arena` -- a dedicated small level. This sets `_opMode = true` and `gold = 999999` automatically.
- **Frozen vs. Live mobs**: Frozen mobs have `speed = 0`, `_specialTimer = 99999` (effectively disabling abilities), `_frozen = true`, and `_testDummy = true`. Original speed is saved to `_savedSpeed` for restoration on unfreeze. Live mobs run full AI. The `/freeze` command toggles all existing mobs; `/test <type>` defaults to frozen unless you pass `live`.
- **Snapshots exclude rendering state**: Hit effects, death effects, particles, camera, and panel state are not in snapshots. A snapshot round-trip will lose all visual effects.
- **OP mode flag is shown in HUD**: When `_opMode` is true, an "OP" badge appears in the debug flags area of the HUD. Same for GOD, FROZEN, and NOFIRE.
- **Command history is a ring buffer**: Only the last 200 commands are retained. Older commands are silently dropped.
