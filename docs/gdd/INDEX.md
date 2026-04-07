# Teah Online GDD — Index

See `README.md` for schema and rules.

**The GDD is the source of truth for the Unity port.** Every numeric value has a `js/file.js:line` citation. If a value is missing, the GDD is wrong — fix the GDD, then the port.

## Core Systems
- [combat-core.md](combat-core.md) — guns, melee, damage, bullets, telegraphs, hazards, hit effects (~180 values)
- [movement-collision.md](movement-collision.md) — player movement, tile collision, gameplay camera, input intent (~70 values)
- [mobs-core.md](mobs-core.md) — mob types schema, MOB_AI (13 patterns), wave system, loot drops (~200 values)
- [scenes-levels.md](scenes-levels.md) — 28 level entries, scene state machine, interactables, skeld tasks (~200 values)

## Mob Abilities (359 total)
- [mob-abilities-azurine.md](mob-abilities-azurine.md) — Floor 1, 17 abilities (in combatSystem.js)
- [mob-abilities-vortalis.md](mob-abilities-vortalis.md) — 106 abilities incl. 9 bosses
- [mob-abilities-earth205.md](mob-abilities-earth205.md) — 96 abilities incl. 8 bosses
- [mob-abilities-earth216.md](mob-abilities-earth216.md) — 70 abilities across 3 files
- [mob-abilities-wagashi-1.md](mob-abilities-wagashi-1.md) — Floors 1-2
- [mob-abilities-wagashi-2.md](mob-abilities-wagashi-2.md) — Floors 3-4
- [mob-abilities-wagashi-3.md](mob-abilities-wagashi-3.md) — Floor 5 + Lord Sarugami

## Gameplay Systems
- [inventory-crafting.md](inventory-crafting.md) — inventory, crafting, progression (5T×25L), ores (~330 values)
- [npcs-cooking.md](npcs-cooking.md) — deli, diner, fine dining, cookingNPCBase (~210 values)
- [party-bots-spar.md](party-bots-spar.md) — party, bot AI, spar (+neural), mafia, hide & seek (~220 values)
- [casino-minigames.md](casino-minigames.md) — 10 casino games (5% edge), fishing, farming, mining (~260 values)

## Presentation & Infrastructure
- [ui-hud-saveload.md](ui-hud-saveload.md) — panels, save/load schema v10, commands, events, gameplay camera location (~210 values)
- [shared-data.md](shared-data.md) — armor visuals, skills, party data, fishing/farming/mafia/hide-seek registries (~230 values)

## Known Gaps (follow-up extraction needed)

These are files the Wave 2 `ui-hud-saveload` agent couldn't deeply cover in one pass. Entry points documented but inner constants are UNKNOWN:

- `js/client/ui/casinoUI.js`, `customize.js`, `forgeUI.js`, `testMobPanel.js`, `toolbox.js`, `panels.js` (per-panel layout values)
- `js/client/rendering/characterSprite.js`, `entityRenderers.js`, `hideSeekFOV.js`, `mafiaFOV.js`
- Large sections of `inventory.js` beyond the gameplay camera

Before porting any of those systems to Unity, dispatch a targeted extraction agent for the specific file.

## Key discoveries flagged during extraction

- **Gameplay camera is in `js/client/ui/inventory.js:2609`**, NOT `js/core/cameraSystem.js` (which is Skeld security UI). Documented in `ui-hud-saveload.md`.
- **`drawSettingsPanel` lives in `saveLoad.js:438`**, not settings.js.
- **`TOOLBOX_CATEGORIES` lives in `panelManager.js:98`**, not toolbox.js.
- **Save schema v10** fully documented with every migration branch.
- **Casino 5% house edge** verified across all 10 games with citations.
