# Teah Online — Documentation Index

> Modular docs for the Teah Online codebase (~121,200 lines, 91 JS files).
> Each file covers one system — read only what you need.

## All Docs

| # | Doc | Description |
|---|-----|-------------|
| 1 | [architecture.md](architecture.md) | Project structure, script loading order, authority/client split, game loop, key globals, event bus, GAME_CONFIG |
| 2 | [scenes-and-levels.md](scenes-and-levels.md) | Scene state machine, level data format, collision grids, portals, zones, state reset |
| 3 | [combat-damage.md](combat-damage.md) | Gun system, melee system, damage pipeline, armor/dodge/absorb, status effects, hit effects |
| 4 | [mobs.md](mobs.md) | 255 mob types, 13 AI patterns, 435 special abilities, BFS pathfinding, mob movement/collision |
| 5 | [waves-and-dungeons.md](waves-and-dungeons.md) | Wave state machine, 3-phase spawning, floor config, dungeon registry, hazards, telegraphs |
| 6 | [progression.md](progression.md) | 5-tier x 25-level weapon progression, evolution, upgrade recipes, skill XP |
| 7 | [inventory-and-items.md](inventory-and-items.md) | Inventory (200 slots), item types, equipment/armor, shops, interactables |
| 8 | [mafia.md](mafia.md) | Mafia game mode — roles, kills, meetings, voting, sabotage, tasks, FOV, bot AI, Skeld map |
| 9 | [hide-and-seek.md](hide-and-seek.md) | Hide & Seek mode — roles, phases, FOV, bot AI, tag detection |
| 10 | [fishing.md](fishing.md) | Fishing minigame — cast/reel flow, 6 fish, rod tiers, bait, XP |
| 11 | [mining.md](mining.md) | Mining — 4 rooms, 15 ore types, pickaxe tiers, ore spawning |
| 12 | [farming.md](farming.md) | Farming — crops, growth stages, land levels, hoe tiers |
| 13 | [cooking.md](cooking.md) | Cooking — 3 restaurants (deli, diner, fine dining), customer orders, recipe assembly, grading, NPCs, ticket queues |
| 14 | [rendering.md](rendering.md) | Draw loop, tile renderer, entity renderers, character sprites, asset loader, minimap, camera |
| 15 | [ui-panels.md](ui-panels.md) | Panel manager, inventory panel, gunsmith, identity, settings, customize, toolbox, shops |
| 16 | [input.md](input.md) | Keyboard/mouse capture, InputIntent flags, command queue, drag systems, keybinds |
| 17 | [save-load.md](save-load.md) | localStorage persistence, schema v10, migrations v1-9, what's saved vs session-only |
| 18 | [debug-and-testing.md](debug-and-testing.md) | Debug slash commands, test mob panel, dev flags, snapshots |
| 19 | [conventions.md](conventions.md) | Coding conventions, gotchas, adding-new-content checklists, backup rules, Skeld map rules |
| 20 | [casino.md](casino.md) | Casino system — 10 games (Blackjack, Roulette, Coinflip, Cases, Mines, Dice, RPS, Baccarat, Slots, Keno), betting, 5% house edge |
| 21 | [party-system.md](party-system.md) | Party system — bot AI, entity-agnostic design, independent state, equip sync |
| 22 | [hotbar-and-quickslots.md](hotbar-and-quickslots.md) | Hotbar (5 slots), quickslot assignment, activeSlot vs activeHotbarSlot, keybind routing, save/load |
| 23 | [spar-learning.md](spar-learning.md) | Spar bot learning system — neural net inference, self-play training, Elo tracking, console commands |
| 24 | [spar-fullbvb-audit.md](spar-fullbvb-audit.md) | Spar bot-vs-bot full audit — parity issues, combat analysis, behavior fixes |
| 25 | [READTHISTOMORROW.md](READTHISTOMORROW.md) | Session changelog — recent update summaries, physics constant changes, feature notes |
| 26 | [unity-port-plan.md](unity-port-plan.md) | Unity port planning — system migration map, data registry catalog, networking design, phased migration order |
| 27 | [crafting.md](crafting.md) | Crafting system — materials, drop tables, weapon upgrades, evolution, forge UI |
| 28 | [unity-parity-audit.md](unity-parity-audit.md) | Unity port parity audit — value checks, formula verification |
| 29 | [game-state-and-events.md](game-state-and-events.md) | GameState structure, property aliases, Event Bus API (7 events), Authority Tick pipeline, CommandQueue, Snapshots/networking |
| 30 | [attack-systems.md](attack-systems.md) | Attack shape geometry (circle/line/cone/ring), Hazard zones (tick damage, slow), Telegraph system (5 shape types), Loot drop system |
| 31 | [sprite-and-rendering-detail.md](sprite-and-rendering-detail.md) | Character sprite 3-layer system, 148 entity renderers, 72 hit effects, tile renderer (18 scenes), asset loader pipeline, camera system, armor visuals (4 tiers) |
| 32 | [ui-systems-detail.md](ui-systems-detail.md) | Panel Manager API, Shop Framework helpers, Character Customize (HSV picker), Chat/Profile icons, Toolbox, Test Mob Panel, Forge UI |
| 33 | [input-detail.md](input-detail.md) | InputIntent (27 flags, held vs one-frame), mouse/keyboard handlers, 10 drag systems, 49-step click routing, keybind system, scene-specific restrictions |
| 34 | [fov-and-skeld-tasks.md](fov-and-skeld-tasks.md) | Hide & Seek FOV, Mafia raycasting FOV (DDA algorithm), meeting/voting UI, sabotage panels, vent system, 14 Skeld task mini-games |
| 35 | [state-reset-and-data-registries.md](state-reset-and-data-registries.md) | State reset (8 modes), Floor Config (wave templates), Dungeon Registry, Skill Registry (56 skills), Gun Data (5 guns), Item Data, Ore Data (15 ores), Party Data, Mob Types structure |

## I want to change X — read Y

| What you want to do | Read these docs |
|---------------------|-----------------|
| Add a new mob type | [mobs.md](mobs.md), [state-reset-and-data-registries.md](state-reset-and-data-registries.md), [conventions.md](conventions.md) |
| Add a mob ability | [mobs.md](mobs.md), [combat-damage.md](combat-damage.md), [attack-systems.md](attack-systems.md) |
| Add a new gun | [progression.md](progression.md), [inventory-and-items.md](inventory-and-items.md), [state-reset-and-data-registries.md](state-reset-and-data-registries.md) |
| Add a melee weapon | [combat-damage.md](combat-damage.md) |
| Add a new entity type | [rendering.md](rendering.md), [sprite-and-rendering-detail.md](sprite-and-rendering-detail.md), [conventions.md](conventions.md) |
| Add a new scene/level | [scenes-and-levels.md](scenes-and-levels.md), [rendering.md](rendering.md), [state-reset-and-data-registries.md](state-reset-and-data-registries.md) |
| Add a new UI panel | [ui-panels.md](ui-panels.md), [ui-systems-detail.md](ui-systems-detail.md) |
| Modify the Skeld map | [mafia.md](mafia.md), [conventions.md](conventions.md) |
| Add a Mafia task | [mafia.md](mafia.md), [fov-and-skeld-tasks.md](fov-and-skeld-tasks.md) |
| Change damage/armor formulas | [combat-damage.md](combat-damage.md), [attack-systems.md](attack-systems.md) |
| Add a new hazard type | [waves-and-dungeons.md](waves-and-dungeons.md), [attack-systems.md](attack-systems.md) |
| Add a new ore/fish/crop | [mining.md](mining.md) / [fishing.md](fishing.md) / [farming.md](farming.md), [state-reset-and-data-registries.md](state-reset-and-data-registries.md) |
| Add a cooking recipe | [cooking.md](cooking.md) |
| Add a casino game | [casino.md](casino.md) |
| Add/modify crafting recipes | [crafting.md](crafting.md), [progression.md](progression.md) |
| Modify party/bot system | [party-system.md](party-system.md), [state-reset-and-data-registries.md](state-reset-and-data-registries.md), [conventions.md](conventions.md) |
| Modify save data | [save-load.md](save-load.md) |
| Add a debug command | [debug-and-testing.md](debug-and-testing.md) |
| Change input/keybinds | [input.md](input.md), [input-detail.md](input-detail.md), [hotbar-and-quickslots.md](hotbar-and-quickslots.md) |
| Modify hotbar/quickslots | [hotbar-and-quickslots.md](hotbar-and-quickslots.md) |
| Modify spar system | [spar-learning.md](spar-learning.md), [spar-fullbvb-audit.md](spar-fullbvb-audit.md), [combat-damage.md](combat-damage.md) |
| Add a new animation row | [rendering.md](rendering.md), [sprite-and-rendering-detail.md](sprite-and-rendering-detail.md), [conventions.md](conventions.md) |
| Add a hit effect | [sprite-and-rendering-detail.md](sprite-and-rendering-detail.md), [combat-damage.md](combat-damage.md) |
| Add a telegraph/hazard | [attack-systems.md](attack-systems.md), [waves-and-dungeons.md](waves-and-dungeons.md) |
| Understand GameState | [game-state-and-events.md](game-state-and-events.md), [architecture.md](architecture.md) |
| Understand the game loop | [architecture.md](architecture.md), [game-state-and-events.md](game-state-and-events.md) |
| Understand script loading | [architecture.md](architecture.md) |
| Understand the event bus | [game-state-and-events.md](game-state-and-events.md) |
| Understand state resets | [state-reset-and-data-registries.md](state-reset-and-data-registries.md), [scenes-and-levels.md](scenes-and-levels.md) |
| Understand FOV systems | [fov-and-skeld-tasks.md](fov-and-skeld-tasks.md) |
| Understand loot drops | [attack-systems.md](attack-systems.md), [crafting.md](crafting.md) |
| Plan Unity port | [unity-port-plan.md](unity-port-plan.md), [architecture.md](architecture.md) |
