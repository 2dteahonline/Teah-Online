# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Teah Online is a top-down dungeon crawler (inspired by GraalOnline Era) built with vanilla JS + HTML5 Canvas 2D. No frameworks, no build tools, no npm dependencies.

- **Entry point**: `index.html` loads 55+ JS files via `<script>` tags with cache-busting (`?v=70`)
- **Dev server**: `python -m http.server 8080` (configured in `.claude/launch.json`)
- **Total codebase**: ~48,800 lines of JavaScript
- **Comprehensive reference**: `GAME_DOCS.md` contains detailed documentation of all systems

## Architecture: Authority/Client Split

The codebase is organized for future multiplayer. All game logic runs through an authority layer; the client only renders and captures input.

```
js/
├── shared/       # Pure data registries (loaded first) — no logic
├── authority/    # Server-authoritative: combat, damage, waves, mobs, inventory
├── client/       # Presentation only: rendering, input, UI panels
│   ├── rendering/  # Canvas drawing (sprites, entities, effects)
│   ├── input/      # Mouse/keyboard → InputIntent flags
│   └── ui/         # Panel system (inventory, gunsmith, settings)
└── core/         # Bridge layer: save/load, scene management, weapons, interactables
```

**Script loading order matters** — phases A (shared) → B (authority) → C (rendering) → D (UI) → E (core loop). See `index.html` for exact order.

## Key Globals & Patterns

- `ctx` — global Canvas 2D rendering context
- `TILE` — constant tile size (48px)
- `player`, `mobs`, `bullets`, `gold` — GameState properties aliased to `window` via defineProperty
- `Scene` — scene state machine (lobby, dungeon, mine, skeld, hideseek, etc.)
- `Events.on()/emit()` — pub/sub event bus (`js/authority/eventBus.js`)
- `GAME_CONFIG` — physics & collision constants (`js/shared/gameConfig.js`)

**Registries** (data-driven, replace large if/else chains):
- `MOB_AI` (11 patterns), `MOB_SPECIALS` (38 abilities) — `combatSystem.js`
- `ENTITY_RENDERERS` (54 types) — `entityRenderers.js`
- `HIT_EFFECT_RENDERERS` (38 types) — `hitEffects.js`
- `MOB_TYPES` — `mobTypes.js`, `LEVELS` — `levelData.js`
- `PROG_ITEMS` — unified 5-tier × 25-level progression — `progressionData.js`

## Game Loop

```
requestAnimationFrame(gameLoop)  [inventory.js ~line 2618]
  → authorityTick()              [authorityTick.js]
      → CommandQueue → InputIntent → update()
  → draw()                       [draw.js]
      → tiles → entities (Y-sorted) → mobs → bullets → effects → player → HUD → panels
```

## The Skeld Map Rules (MANDATORY)

When modifying The Skeld map in `js/shared/levelData.js`:
- Do NOT change hallway/corridor positions, widths, or pathing
- Do NOT let rooms absorb corridor space or overlap each other
- Only expand rooms outward into dead space (wall tiles)
- All coordinates use virtual space with `XO=4` offset (actual grid x = virtual x + 4)
- Map grid: W=135, H=80
- Minimap labels in `draw.js` use ACTUAL grid coordinates (virtual + XO)

## Save/Load

`js/core/saveLoad.js` — localStorage with schema version 7. Supports migrations from v1-v6. Saved data includes keybinds, settings, identity, cosmetics, progression, skill XP. Gun levels can be old integer format or new `{tier, level}` object.

## Progression System

5 tiers (Common → Uncommon → Rare → Epic → Legendary) × 25 levels = 125 power steps per weapon. Defined in `PROG_ITEMS` (`progressionData.js`). Helpers: `getProgressedStats()`, `_getGunProgress()`, `_setGunProgress()`. Evolution at T(N) L25 → T(N+1) L1.

## Conventions

- **`let` in `<script>` tags** are in global lexical scope — accessible from other scripts and `eval()`, but NOT on `window`
- **Backup before major changes**: create `*_backup_pre_<feature>.js` copies
- **Collision**: grid-based AABB via `positionClear(px, py, hw)`; mobs use `MOB_WALL_HW=14` and `MOB_RADIUS=27`
- **Adding mobs**: define in `MOB_TYPES`, add AI pattern to `MOB_AI`, add specials to `MOB_SPECIALS`, add renderer entry if custom
- **Adding entities**: add renderer function to `ENTITY_RENDERERS` registry
- **Debug commands**: `/gun`, `/tp`, `/heal`, `/mob`, `/freeze` — defined in `commands.js`
