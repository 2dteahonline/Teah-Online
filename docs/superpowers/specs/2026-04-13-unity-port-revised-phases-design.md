# Teah Online Unity Port — Revised Phase Plan

**Date:** 2026-04-13
**Status:** Active
**Supersedes:** `2026-04-04-unity-port-reboot-design.md`

## Context

Phase 0 is complete and verified in Play mode (`TeahOnline/` at `C:\Users\jeff\Desktop\Unity Proj\TeahOnline`). Player walks with WASD, walls block movement, camera follows. The GDD (`docs/gdd/`) is complete with ~4,280+ cited values across 18 files.

This document defines the revised phase ordering for the remaining port. Every phase ends with Play mode verification. Every value cites `js/file.js:line` or the GDD.

## Key Changes From Original Plan

1. **Phase 1 split into 1a/1b/1c** — original was too large (portals + combat + waves + floor progression all at once)
2. **Save/load starts in Phase 3** — not Phase 10. Each subsequent phase expands saved fields. Avoids discovering serialization bugs across all systems at once.
3. **UI Panels (Phase 6) before Ultimates (Phase 7)** — ultimates need charge bar HUDs which are UI elements
4. **Minimal HUD moved into Phase 1b** — need HP bar to verify damage is working

## Unity Project

- **Location:** `C:\Users\jeff\Desktop\Unity Proj\TeahOnline`
- **Unity version:** 6000.4.0f1, 2D Built-in Render Pipeline
- **Source of truth:** `docs/gdd/` (GDD), then JS source with `js/file.js:line` citations
- **Reference project (read-only):** `C:\Users\jeff\Desktop\Unity Proj\TeahOnlineUnity_REFERENCE`

## Phase 0: Bootstrap — DONE

**Status:** Complete, committed (`aed7a51`)

**What exists:**
- PlayerController.cs — WASD movement, axis-separated AABB sliding, speed=450px/sec (js/shared/gameConfig.js:8)
- TileCollision.cs — 50x50 hardcoded grid, TILE=48, 4-corner AABB positionClear
- CameraFollow.cs — hard-locked camera with map-bound clamping (js/client/ui/inventory.js:2609-2628)
- WallVisualizer.cs — debug helper, spawns red squares at blocked tiles
- SampleScene with Player (green square), TileCollision, Floor, Main Camera

**Verified:** WASD moves, walls block, camera follows.

---

## Phase 1a: Real Level Data + Scene Transitions

**Goal:** Replace hardcoded test grid with real lobby tilemap. Walk into a dungeon portal.

**What to build:**
1. LevelDataLoader — reads level data from `levelData.js` format (28 levels defined in `docs/gdd/scenes-levels.md`)
2. Update TileCollision to load collision grid from level data instead of hardcoded walls
3. SceneTileRenderer — render actual floor/wall tiles (colored squares fine, no art yet)
4. Entity spawning — portals and buildings from `ENTITY_RENDERERS` (placeholder sprites fine)
5. Scene transition — walk into dungeon portal → load dungeon arena tilemap
6. SceneManager — state machine for scene transitions (18 scenes per `docs/gdd/scenes-levels.md`)

**GDD sources:**
- `docs/gdd/scenes-levels.md` — all 28 level entries, scene state machine, interactables
- `docs/gdd/movement-collision.md` — collision grid, tile rendering

**Exit gate:** Walk around the real lobby, see portals/buildings, walk into dungeon portal, see dungeon tiles load.

**Dependencies:** Phase 0

---

## Phase 1b: Core Combat

**Goal:** Shoot mobs, they die. Get hit, lose HP.

**What to build:**
1. GunSystem — fire bullets on click (docs/gdd/combat-core.md)
2. BulletSystem — bullet movement, wall collision, lifetime
3. MobSystem — spawn one basic mob type, basic AI (chase player)
4. MobRenderer — visible mob (colored square fine)
5. DamageSystem — bullets hit mobs, mobs hit player, HP tracking
6. MeleeSystem — swing + arc hit detection
7. Minimal HUD — HP bar + current wave text (just enough to verify damage)

**GDD sources:**
- `docs/gdd/combat-core.md` — guns, melee, damage, bullets (~180 values)
- `docs/gdd/mobs-core.md` — mob types, AI patterns

**Exit gate:** Shoot a mob, it dies. Swing melee, it dies. See your HP decrease when hit. HP bar reflects actual health.

**Dependencies:** Phase 1a (dungeon arena loaded)

---

## Phase 1c: Dungeon Run

**Goal:** Complete a full 5-floor dungeon.

**What to build:**
1. WaveSystem — spawn waves with scaling formulas (docs/gdd/mobs-core.md)
2. LootDropSystem — gold drops from dead mobs
3. Floor progression — wave clear → staircase appears → next floor loads
4. 5 floors → dungeon complete → return to lobby
5. Death + respawn flow
6. StateReset — clean state between floors/dungeons

**GDD sources:**
- `docs/gdd/mobs-core.md` — wave system, loot drops, scaling
- `docs/gdd/scenes-levels.md` — floor transitions

**Exit gate:** Complete a full 5-floor dungeon run. Die at least once and respawn. Return to lobby after completion.

**Dependencies:** Phase 1b (combat works)

---

## Phase 2: HUD + Death Flow

**Goal:** All essential combat HUD elements visible and updating.

**What to build:**
1. Full GameHUD — HP bar, lives, gold counter, kills counter, wave display (floor/wave/mob count)
2. HotbarUI — 5 slots with equipped items, key hints
3. Death overlay — "YOU DIED" + respawn countdown
4. Wave state messages — GET READY, FLOOR CLEAR, DUNGEON COMPLETE
5. Interactable prompts — portal approach text
6. Basic chat — local echo + debug commands (/gun, /tp, /heal, /mob, /freeze)

**GDD sources:**
- `docs/gdd/ui-hud-saveload.md` — panels, HUD layout
- `docs/gdd/combat-core.md` — death/respawn flow

**Exit gate:** Play a dungeon run and see all HUD elements update in real-time. Die and see death screen. Clear dungeon and see victory.

**Dependencies:** Phase 1c (full dungeon run works)

---

## Phase 3: Equipment + Economy + Basic Save

**Goal:** Buy gear, equip it, see combat improve. Save progress.

**What to build:**
1. ShopPanelUI — browse tiers, buy guns/melee/armor with gold
2. InventoryPanelUI — see items, equip/unequip, category tabs
3. Equipment effects — armor reduction, HP bonus, speed from boots, dodge chance
4. Weapon tiers — T1-T4 guns and melee with correct damage/fire rate
5. Buff purchases — gun dmg +3, melee dmg +3, health potion, lifesteal
6. Potion usage (quickslot)
7. **Basic save/load** — gold, inventory, equipped items, progression tier

**GDD sources:**
- `docs/gdd/inventory-crafting.md` — inventory, crafting, progression (~330 values)
- `docs/gdd/ui-hud-saveload.md` — save schema v10, shop panel
- `docs/gdd/combat-core.md` — equipment stat formulas

**Exit gate:** Earn gold → buy T2 weapon → equip → damage increases → buy armor → HP increases → save → reload → still equipped with correct gold.

**Dependencies:** Phase 2 (HUD shows equipment state)

---

## Phase 4: Party + Bots

**Goal:** 3 AI companions fight alongside player.

**What to build:**
1. PartySystem — create 3 bot entities with equipment
2. BotAI — movement, targeting, shooting, melee (entity-agnostic, same code path as player)
3. PartyStatusUI — member HP bars, gold, lives, equipment tier dots
4. Party gold distribution on kills
5. Party lifesteal
6. Bot death/revive mechanics
7. ReviveShopUI between floors
8. Save/load expanded — party state

**GDD sources:**
- `docs/gdd/party-bots-spar.md` — party system, bot AI (~220 values)

**Exit gate:** Enter dungeon with 3 bots → bots fight mobs → see party status → bot dies → revive shop → revive → continue.

**Dependencies:** Phase 3 (equipment system exists for bot loadouts)

---

## Phase 5: Combat Polish

**Goal:** All 429 mob abilities verified, visual FX working.

**What to build:**
1. Status effect rendering — stun ring, slow tint, mark crosshair, bleed drips, confuse swirl, disorient wave
2. Telegraph visuals — circles, lines, cones with color fills
3. Hazard zone visuals — colored ground areas with tick damage
4. Mob persistent effects — 20+ types: lasers, beams, pools, gravity wells, cyclones
5. Test all 5 dungeons — verify abilities fire, telegraphs appear, damage applies
6. Ninja dash (3-chain + afterimages)
7. Storm Blade shockwave + chain lightning
8. War Cleaver cleave + piercing blood

**GDD sources:**
- `docs/gdd/mob-abilities-azurine.md` — 17 abilities
- `docs/gdd/mob-abilities-vortalis.md` — 106 abilities
- `docs/gdd/mob-abilities-earth205.md` — 96 abilities
- `docs/gdd/mob-abilities-earth216.md` — 70 abilities
- `docs/gdd/mob-abilities-wagashi-1.md`, `wagashi-2.md`, `wagashi-3.md` — remaining abilities
- `docs/gdd/combat-core.md` — telegraphs, hazards, hit effects

**Exit gate:** Run each dungeon to floor 3+. See telegraphs, hazards, status effects. All abilities fire without errors.

**Dependencies:** Phase 4 (bots test entity-agnostic ability targeting)

---

## Phase 6: UI Panels

**Goal:** All remaining menus functional.

**What to build:**
1. ProfileMenuUI — name, faction, country, language, relationship
2. IdentityPanelUI
3. StatsPanelUI — skill XP, progression
4. SettingsPanelUI — keybinds, toggles, sound
5. CustomizePanelUI — 19-color picker, head selection
6. ForgePanelUI — crafting
7. WeaponStatsUI — gun/melee detailed stats
8. Minimap — fullscreen overlay with room labels
9. TestMobPanel — debug mob spawner
10. Save/load expanded — cosmetics, keybinds, settings

**GDD sources:**
- `docs/gdd/ui-hud-saveload.md` — all panel definitions
- `docs/gdd/inventory-crafting.md` — crafting/forge data

**Exit gate:** Every panel opens, displays correct data, interactions work (buy, equip, customize, rebind keys).

**Dependencies:** Phase 5 (all combat systems exist for stats display)

---

## Phase 7: Ultimates + Weapon Specials

**Goal:** Endgame combat mechanics.

**What to build:**
1. Shrine (War Cleaver) — charge on cleave kills, activate for AOE slash ticks
2. Godspeed (Storm Blade) — 10 charges, 300f duration, lightning strikes
3. Charge bar HUDs — 3 variants: Shrine red, Godspeed cyan, Ninja Dash segments
4. Frost Rifle — slow on hit, nova on kill
5. Burn Rifle — DOT on hit, chain explosion on kill
6. Shadow Step — boots T3 teleport on melee crit
7. Visual effects — lightning auras, cursed energy, domain boundary

**GDD sources:**
- `docs/gdd/combat-core.md` — ultimate mechanics, weapon specials
- `docs/gdd/inventory-crafting.md` — weapon tier data

**Exit gate:** Equip T4 weapons → charge ultimate → activate → visual FX correct → damage applies correctly.

**Dependencies:** Phase 6 (UI framework for charge bar HUDs)

---

## Phase 8: Skill Systems

**Goal:** All 4 skill minigames playable.

**What to build:**
1. MiningSystem — ore nodes, pickaxe tiers, mining shop
2. FishingSystem — cast, bite, reel QTE, fish vendor
3. FarmingSystem — plant seeds, water, harvest, farm vendor
4. CookingSystem + CookingNPCBase (5,772 JS lines):
   - Deli: order NPCs, aisle shoppers, 4-slot counter
   - Diner: party groups, waitress, multi-item tickets, booth seating
   - Fine Dining: teppanyaki grill QTE, VIP/Critic, waiter service
5. Cooking HUD (order panel, timer, stats)
6. Save/load expanded — skill levels, farm plots, recipes

**GDD sources:**
- `docs/gdd/casino-minigames.md` — fishing, farming, mining sections
- `docs/gdd/npcs-cooking.md` — deli, diner, fine dining (~210 values)
- `docs/gdd/shared-data.md` — fishing/farming registries

**Exit gate:** Visit each skill scene → complete activity → earn gold/XP → buy upgrades at vendor.

**Dependencies:** Phase 7 (all combat done, side content begins)

---

## Phase 9: Game Modes

**Goal:** All multiplayer-style game modes work (single-player with bots).

**What to build:**
1. Casino — 10 mini-games (blackjack, roulette, slots, dice, etc., 5% house edge)
2. Mafia (Among Us style) — roles, tasks, voting, sabotage, Skeld map
3. Hide & Seek — hider/seeker, FOV, tagging
4. Spar — PvP arena with neural bot

**GDD sources:**
- `docs/gdd/casino-minigames.md` — 10 casino games (~260 values)
- `docs/gdd/party-bots-spar.md` — spar, mafia, hide & seek
- `docs/gdd/shared-data.md` — mafia/hide-seek registries

**Exit gate:** Enter each game mode → play a round → mode-specific mechanics work.

**Dependencies:** Phase 8 (all side content scenes exist)

---

## Phase 10: Save/Load Completion + Polish

**Goal:** Full persistence, final parity.

**What to build:**
1. Full schema v10 parity — all remaining save fields
2. Parity test suite against JS snapshots — zero failures
3. Spectator mode (watch party when dead)
4. Victory celebration (confetti)
5. Zone transition fades with labels
6. Debug overlay (zoom, tile count, speed tracker)

**GDD sources:**
- `docs/gdd/ui-hud-saveload.md` — complete save schema v10

**Exit gate:** Save → quit → reload → zero data loss. Full parity test suite passes.

**Dependencies:** Phase 9 (everything exists, save everything)

---

## Rules (carried forward)

1. **Play mode after every phase.** Can't see it work = not done.
2. **Every value cites `js/file.js:line` or GDD section.** No invented values.
3. **One phase at a time.** No jumping ahead.
4. **Fix forward, don't rewrite.** Fix scripts in place or delete garbage.
5. **GDD is source of truth.** If it's missing a value, fix the GDD first.
6. **Entity-agnostic design.** Bots = future multiplayer users. Same code path.
7. **Y-axis conversion on every port.** Canvas Y-down → Unity Y-up.
