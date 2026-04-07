# CLAUDE.md — Teah Online

## The #1 Rule

**`docs/gdd/` is the source of truth for the Unity port. The JS is the source of truth for the GDD.**

The Game Design Document in `docs/gdd/` is a citation-backed, machine-greppable description of every system, value, formula, and interaction in Teah Online. It was extracted directly from the JS source on 2026-04-06 with mandatory `js/file.js:line` citations for every numeric value (~4,280+ cited values across 18 files). When porting to Unity:

1. **Read the GDD first.** Every Unity script must cite the GDD section(s) it implements.
2. **The GDD is authoritative for values.** Fire rates, damage, timers, HP — use the value in the GDD, not the one you remember. If the GDD has it, copy it. If the GDD marks it UNKNOWN, fix the GDD before porting.
3. **If the GDD is wrong, fix the GDD first, then the port.** Never port against a value you invented.
4. **If JS changes, update the GDD in the same commit.** The GDD is code, not docs.
5. **If a system isn't in the GDD yet, add it to the GDD before touching Unity.** See `docs/gdd/INDEX.md` "Known Gaps" section for systems still needing extraction.

Every system, every mechanic, every interaction — combat, chat, profile menu, inventory, walking, shooting, menus, NPCs, portals, everything — must work in Unity EXACTLY how the GDD says it works, which is EXACTLY how the JS works.

**GDD navigation:** `docs/gdd/INDEX.md` | **GDD schema:** `docs/gdd/README.md`

## Project

Teah Online — top-down dungeon crawler (GraalOnline Era inspired). Vanilla JS + HTML5 Canvas 2D. No frameworks, no build tools, no npm.

- **Entry point**: `index.html` — 93 JS files via `<script>` tags, cache-busted
- **Dev server**: `python -m http.server 8080`
- **Codebase**: ~121,200 lines across 91 non-backup files
- **Docs**: `docs/README.md` — modular index (one file per system)
- **Unity port**: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline` (Unity 6, 6000.4.0f1, 2D Built-in Render Pipeline) — fresh project, Phase 0 in progress
- **Unity reference (read-only)**: `C:\Users\jeff\Desktop\Unity Proj\TeahOnlineUnity_REFERENCE` — old port, hint material only, never imported

## Architecture

Authority/Client split for future multiplayer. All game logic runs through authority; client only renders and captures input.

```
js/
├── shared/       # Pure data registries (loaded first) — no logic (21 files)
├── authority/    # Server-authoritative: combat, damage, waves, mobs, inventory, party, bots, casino, spar (40 files)
├── client/       # Presentation only: rendering, input, UI panels (18 files)
├── core/         # Bridge layer: save/load, scene management, weapons, interactables, camera (10 files)
└── testing/      # Test harness (1 file)
```

**Script loading order matters** — phases A (shared) → B (authority) → C (rendering) → D (UI) → E (core loop). See `index.html`.

## Key Globals

| Global | Purpose |
|--------|---------|
| `ctx` | Canvas 2D rendering context |
| `TILE` | 48px tile size |
| `player`, `mobs`, `bullets`, `gold` | GameState properties aliased to `window` |
| `Scene` | Scene state machine (18 scenes) |
| `Events.on()/emit()` | Pub/sub event bus |
| `GAME_CONFIG` | Physics & collision constants |
| `PartySystem` | Always-on party system (player + bots) |

## Registries (data-driven)

| Registry | Count | File(s) |
|----------|-------|---------|
| `MOB_AI` | 13 patterns | `combatSystem.js` |
| `MOB_SPECIALS` | 435 abilities | 9 files (`*Specials*.js`) |
| `ENTITY_RENDERERS` | 175 types | `entityRenderers.js` |
| `HIT_EFFECT_RENDERERS` | 73 types | `hitEffects.js` |
| `MOB_TYPES` | 265 types | `mobTypes.js` |
| `LEVELS` | 18 scenes | `levelData.js` |
| `PROG_ITEMS` | 5 tiers × 25 levels | `progressionData.js` |

## Game Loop

```
requestAnimationFrame(gameLoop)  [draw.js ~line 2951]
  → authorityTick()              [authorityTick.js]
      → CommandQueue → InputIntent → update()
  → draw()                       [draw.js]
      → tiles → entities (Y-sorted) → mobs → bullets → effects → player → HUD → panels
```

## Unity MCP Tools

| Tool | Use for |
|------|---------|
| `manage_scene` | Load, save, query scene hierarchy |
| `manage_gameobject` | Create/modify GameObjects and components |
| `manage_script` | Create/modify C# scripts |
| `read_console` | Check compilation errors after script changes |
| `manage_asset` | Search, import, configure assets |
| `run_tests` | Execute parity tests |
| `unity_reflect` | Verify Unity API before writing C# |
| `manage_editor` | Play mode control, editor state |

**After any script change:** Always `read_console` to check compilation before proceeding.

## Mandatory Rules

### GAME_UPDATE Version
**Increment `GAME_CONFIG.GAME_UPDATE`** in `js/shared/gameConfig.js` on every commit+push. **Always READ first** to get current value, then +1. Tell me the update # after push.

### Sprite Pipeline
Graal-style 3-layer: Body (32×32, 4×32) + Head (32×32, 4×4) + Hat (32×32, 5×5). Templates in `assets/sprites/`.

**ASK before adding new animation rows.** Current: Body=32 rows, Head=4 rows, Hat=5 rows.

### Skeld Map
- Do NOT change hallway/corridor positions, widths, or pathing
- Only expand rooms outward into dead space
- All coordinates use virtual space with `XO=4` offset
- Grid: W=135, H=80

### Adding Content
- **Mobs**: `MOB_TYPES` → `MOB_AI` → `MOB_SPECIALS` → renderer if custom → update testMobPanel
- **Entities**: add renderer to `ENTITY_RENDERERS`
- **Debug commands**: `/gun`, `/tp`, `/heal`, `/mob`, `/freeze` in `commands.js`

## Conventions

- **`let` in `<script>` tags** = global lexical scope (accessible from other scripts, NOT on `window`)
- **Backup before major changes**: `*_backup_pre_<feature>.js` copies
- **Collision**: grid-based AABB via `positionClear(px, py, hw)`; mobs use `MOB_WALL_HW=11`, `MOB_RADIUS=23`
- **Design principle**: Bots = future multiplayer users. Every system must be player-agnostic.

## Key Systems Quick Reference

| System | Primary File | Data File |
|--------|-------------|-----------|
| Party/Bots | `partySystem.js`, `botAI.js` | — |
| Casino (10 games, 5% edge) | `casinoSystem.js` | `casinoData.js` |
| Spar (PvP + neural bot) | `sparSystem.js` | `sparData.js` |
| Crafting | `craftingSystem.js` | `craftingData.js` |
| Progression (5T×25L) | `progressionData.js` | — |
| Save/Load (schema v10) | `saveLoad.js` | — |

## Unity Port Status

**Fresh project `TeahOnline/` (2D Built-in).** Old `TeahOnlineUnity_REFERENCE/` is read-only hint material, never imported. Script count is not progress — Play mode is progress.

**Living plan:** `docs/superpowers/specs/2026-04-06-teah-gdd-and-unity-port-design.md`
**Implementation plan:** `docs/superpowers/plans/2026-04-06-teah-gdd-and-unity-port-plan.md`
**Current phase:** **0 — Bootstrap** (walk + walls + camera in new project, port from GDD)
**GDD status:** Complete (18 files, ~4,280+ cited values) — see `docs/gdd/INDEX.md`

### Hard Stops (non-negotiable)

1. **No new C# scripts until Phase 0 ships.** Phase 0 = player walking in the lobby in Play mode, verified by the user. Until that happens, the only allowed C# work is wiring, deleting, or fixing existing scripts. "I found one more system to port" is the trap that got us here.

2. **A phase is not done until the user sees it in Play mode.** "It compiles" ≠ done. "Tests pass" ≠ done. "I see it running" = done. Every session on Unity work ends with either a Play-mode demo or an honest "still not playable."

3. **Every number, timer, formula, and field name must cite `js/path/file.js:line`** in the commit or the code comment. No citation = not merged. 55% of shipped bugs were invented values (`feedback_unity_port_root_causes.md`). This rule exists to mechanically stop that.

4. **Fix forward, don't rewrite.** If a script is wrong, fix it in place. If it's unwired duplicate garbage, delete it. Do not start a parallel v2.

5. **One phase at a time.** No jumping ahead. No "while I'm here, I'll also…"

### Status Vocabulary (no percentages)

Every C# script is in exactly one bucket. Percentages like "GunSystem 95%" are banned — they're guesses that sound like progress.

- **WIRED** — referenced by a GameObject in a scene, runs in Play mode, verified by the user
- **CODE-ONLY** — compiles, not referenced by any scene, never executed
- **WRONG** — known-bad values, diverged architecture, or duplicates another script
- **UNKNOWN** — not yet audited

The authoritative list lives in `docs/unity-triage.md` (produced by Phase -1). CLAUDE.md does not track per-script status.

### Before ANY Unity work, read these (in this order)

1. `docs/gdd/INDEX.md` — navigate the GDD, find your system
2. `docs/gdd/<your-system>.md` — the actual values to port
3. `feedback_unity_port_parity.md` — 20+ wrong values previously shipped (history; GDD prevents this)
4. `feedback_unity_port_root_causes.md` — 5 failure patterns (history; GDD mechanically prevents most)
5. `feedback_playability_not_compilation.md` — measure by Play mode, not script count

If the GDD is missing a value you need, STOP. Add it to the GDD (with `js/file.js:line` citation) before touching Unity. Do not read 23 memory files before starting work.

### Y-axis / API checklist (quick)

- Canvas is Y-down, Unity is Y-up. Every direction, angle, velocity, and Y-coord needs conversion. Assume every port is wrong until you've checked this.
- Trace helper functions on both sides of every API. If JS calls `getFoo()`, read `getFoo()`.
- Field names must match on both sides — grep the C# consumer before renaming.
