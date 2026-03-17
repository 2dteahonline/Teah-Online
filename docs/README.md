# Teah Online — Documentation Index

> Modular docs for the Teah Online codebase (~48,800 lines, 63+ JS files).
> Each file covers one system — read only what you need.

## All Docs

| # | Doc | Description |
|---|-----|-------------|
| 1 | [architecture.md](architecture.md) | Project structure, script loading order, authority/client split, game loop, key globals, event bus, GAME_CONFIG |
| 2 | [scenes-and-levels.md](scenes-and-levels.md) | Scene state machine, level data format, collision grids, portals, zones, state reset |
| 3 | [combat-damage.md](combat-damage.md) | Gun system, melee system, damage pipeline, armor/dodge/absorb, status effects, hit effects |
| 4 | [mobs.md](mobs.md) | 40+ mob types, 11 AI patterns, 60+ special abilities, BFS pathfinding, mob movement/collision |
| 5 | [waves-and-dungeons.md](waves-and-dungeons.md) | Wave state machine, 3-phase spawning, floor config, dungeon registry, hazards, telegraphs |
| 6 | [progression.md](progression.md) | 5-tier x 25-level weapon progression, evolution, upgrade recipes, skill XP |
| 7 | [inventory-and-items.md](inventory-and-items.md) | Inventory (100 slots), item types, equipment/armor, shops, interactables |
| 8 | [mafia.md](mafia.md) | Mafia game mode — roles, kills, meetings, voting, sabotage, tasks, FOV, bot AI, Skeld map |
| 9 | [hide-and-seek.md](hide-and-seek.md) | Hide & Seek mode — roles, phases, FOV, bot AI, tag detection |
| 10 | [fishing.md](fishing.md) | Fishing minigame — cast/reel flow, 6 fish, rod tiers, bait, XP |
| 11 | [mining.md](mining.md) | Mining — 4 rooms, 15 ore types, pickaxe tiers, ore spawning |
| 12 | [farming.md](farming.md) | Farming — crops, growth stages, land levels, hoe tiers |
| 13 | [cooking.md](cooking.md) | Cooking — 3 restaurants (deli, diner, fine dining), customer orders, recipe assembly, grading, NPCs, ticket queues |
| 14 | [rendering.md](rendering.md) | Draw loop, tile renderer, entity renderers, character sprites, asset loader, minimap, camera |
| 15 | [ui-panels.md](ui-panels.md) | Panel manager, inventory panel, gunsmith, identity, settings, customize, toolbox, shops |
| 16 | [input.md](input.md) | Keyboard/mouse capture, InputIntent flags, command queue, drag systems, keybinds |
| 17 | [save-load.md](save-load.md) | localStorage persistence, schema v7, migrations v1-6, what's saved vs session-only |
| 18 | [debug-and-testing.md](debug-and-testing.md) | Debug slash commands, test mob panel, dev flags, snapshots |
| 19 | [conventions.md](conventions.md) | Coding conventions, gotchas, adding-new-content checklists, backup rules, Skeld map rules |
| 20 | [casino.md](casino.md) | Casino system — 6 games (Slots, Blackjack, Keno, Cases, Roulette, Hi-Lo), betting, 5% house edge |
| 21 | [party-system.md](party-system.md) | Party system — bot AI, entity-agnostic design, independent state, equip sync |

## I want to change X — read Y

| What you want to do | Read these docs |
|---------------------|-----------------|
| Add a new mob type | [mobs.md](mobs.md), [conventions.md](conventions.md) |
| Add a mob ability | [mobs.md](mobs.md), [combat-damage.md](combat-damage.md) |
| Add a new gun | [progression.md](progression.md), [inventory-and-items.md](inventory-and-items.md) |
| Add a melee weapon | [combat-damage.md](combat-damage.md) |
| Add a new entity type | [rendering.md](rendering.md), [conventions.md](conventions.md) |
| Add a new scene/level | [scenes-and-levels.md](scenes-and-levels.md), [rendering.md](rendering.md) |
| Add a new UI panel | [ui-panels.md](ui-panels.md) |
| Modify the Skeld map | [mafia.md](mafia.md), [conventions.md](conventions.md) |
| Add a Mafia task | [mafia.md](mafia.md) |
| Change damage/armor formulas | [combat-damage.md](combat-damage.md) |
| Add a new hazard type | [waves-and-dungeons.md](waves-and-dungeons.md) |
| Add a new ore/fish/crop | [mining.md](mining.md) / [fishing.md](fishing.md) / [farming.md](farming.md) |
| Add a cooking recipe | [cooking.md](cooking.md) |
| Add a casino game | [casino.md](casino.md) |
| Modify party/bot system | [party-system.md](party-system.md), [conventions.md](conventions.md) |
| Modify save data | [save-load.md](save-load.md) |
| Add a debug command | [debug-and-testing.md](debug-and-testing.md) |
| Change input/keybinds | [input.md](input.md) |
| Add a new animation row | [rendering.md](rendering.md), [conventions.md](conventions.md) |
| Understand the game loop | [architecture.md](architecture.md) |
| Understand script loading | [architecture.md](architecture.md) |
