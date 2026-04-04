# CLAUDE.md — Teah Online

## The #1 Rule

**The JS game is the source of truth. Unity must be EXACTLY 1:1.**

Every system, every mechanic, every interaction — combat, chat, profile menu, inventory, walking, shooting, menus, NPCs, portals, everything — must work in Unity EXACTLY how it works in JS. Not "similar." Not "improved." EXACTLY the same.

- Don't redesign systems. Don't "improve" architecture. Don't skip small features.
- If JS has it, Unity has it. If JS doesn't have it, Unity doesn't have it.
- Every value, formula, timer, cooldown, UI behavior, and interaction must match the JS source line-for-line.
- When in doubt, READ the JS. The answer is always in the JS.

## Project

Teah Online — top-down dungeon crawler (GraalOnline Era inspired). Vanilla JS + HTML5 Canvas 2D. No frameworks, no build tools, no npm.

- **Entry point**: `index.html` — 93 JS files via `<script>` tags, cache-busted
- **Dev server**: `python -m http.server 8080`
- **Codebase**: ~121,200 lines across 91 non-backup files
- **Docs**: `docs/README.md` — modular index (one file per system)
- **Unity port**: `C:\Users\jeff\Desktop\Unity Proj\TeahOnlineUnity` (Unity 6, 6000.4.0f1)

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

**179 C# scripts written, 0% playable.** Scene is empty — no GameObjects wired. All code compiles but nothing runs.

**Living plan:** `docs/superpowers/specs/2026-04-04-unity-port-reboot-design.md` — 11-phase playability-first plan.

**Current phase: 0 (Bootstrap)** — Wire GameManager into scene, get player walking in lobby.

### What Exists (code-complete, not wired)
- Core: GameManager (2,280 lines), SceneManager, PlayerController, AuthorityTick, PlayerInputHandler
- Combat: GunSystem (95%), MeleeSystem (90%), DamageSystem (98%), BulletSystem (95%), WaveSystem (98%)
- Rendering: SceneTileRenderer (98%), CharacterRenderer (90%), MobRenderer (85%), EntityRendererRegistry (90%), YSortRenderer (100%)
- Abilities: 429 mob abilities across 5 dungeons (Azurine, Vortalis, Earth-205, Earth-216, Wagashi)
- UI: 23 panel scripts at 35-40% coverage
- Data: All registries ported

### What's Missing
- **Scene setup** — no GameObjects, no prefabs, no sprites in scene
- **Ultimate systems** — Shrine & Godspeed (high-impact combat)
- **Status effect rendering** — 0/6 visual types
- **Mob persistent effects** — 0/20+ visual types
- **Cooking NPC systems** — 5,772 JS lines, 3 restaurants, completely missing
- **Charge bar HUDs** — Godspeed, Shrine, Ninja Dash
- **Gun behaviors** — frost/burn on-kill effects

### Unity Port Rules
1. **Every phase ends with Play mode verification.** "It compiles" is not done. "I can see it" is done.
2. **Fix forward, don't rewrite.** 179 scripts exist and most are good. Wire them, don't replace them.
3. **One phase at a time.** Don't jump to Phase 5 before Phase 1 works.
4. **NEVER guess JS values.** Every number must cite a JS source line.
5. Trace helper functions. Check both sides of every API. Y-axis: canvas Y-down → Unity Y-up.

**Before ANY Unity port work**, read these memory files:
- `feedback_unity_port_parity.md` — 20+ wrong values shipped
- `feedback_unity_port_root_causes.md` — 5 failure patterns
- `feedback_audit_depth.md` — why audits keep missing issues
