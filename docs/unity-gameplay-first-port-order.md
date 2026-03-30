# Unity Gameplay-First Port Order

This is the exact order to port Teah Online into Unity if the goal is gameplay and system parity first, with graphics postponed until later.

The JS game is the source of truth. Unity is not allowed to "improve" behavior during this phase. Every subsystem should be ported by matching observable behavior, tick order, data, and state transitions.

## Rules Before Starting

1. Freeze the JS game as the oracle for mechanics.
2. Do not use Unity physics for core gameplay movement, bullets, melee, knockback, or collision response.
3. Do not start with art, animation controllers, UI polish, particles, or scene dressing.
4. Do not port the whole repo at once.
5. Do not move to the next phase until the current phase passes parity checks.

## Files That Define The Core Runtime

- `index.html`
- `js/authority/gameState.js`
- `js/authority/commands.js`
- `js/authority/authorityTick.js`
- `js/authority/snapshots.js`
- `js/authority/eventBus.js`
- `js/core/draw.js`
- `js/client/ui/inventory.js`
- `js/shared/gameConfig.js`
- `js/shared/levelData.js`

## Progress Tracker

Update this section as each phase completes. Mark status: NOT STARTED / IN PROGRESS / DONE.

| Phase | Name | Status | Date Started | Date Completed | Notes |
|-------|------|--------|-------------|----------------|-------|
| 0 | Freeze Reference & Scope | DONE | 2026-03-28 | 2026-03-28 | Tagged `unity-parity-reference` at `2de68d4fc5ca787cccd3630d6cc6f8af069812f1` |
| 1 | Parity Harness | DONE | 2026-03-28 | 2026-03-28 | ParityHarness.cs, ParitySnapshot.cs, TraceRecorder.js, editor scene setup |
| 2 | Simulation Skeleton | DONE | 2026-03-28 | 2026-03-28 | Already existed: GameState.cs, InputIntent.cs, EventBus.cs, ServerAuthority.cs, PlayerController.cs. 60Hz timestep confirmed. |
| 3 | Shared Constants & Data | DONE | 2026-03-28 | 2026-03-28 | `node tools/export_data.js` — 8 files, 293KB, 0 failures. Automated, no manual entry. |
| 4 | Level Geometry & Collision | DONE | 2026-03-28 | 2026-03-28 | CollisionGrid.cs (isSolid+positionClear+entities), LevelDataLoader.cs, MovementParityTest.cs, verify_collision_parity.js. 3 levels loaded. |
| 5 | Input & Commands | DONE | 2026-03-28 | 2026-03-28 | CommandQueue, CommandTranslator, AuthorityTick, InputIntent update, PlayerInputHandler rewire, CommandParityTest (17 tests) |
| 6 | Player Movement | DONE | 2026-03-28 | 2026-03-28 | PlayerController.TickMovement extracted, authority-driven mode, IMovementModifierProvider, MovementParityTest (18 Phase 6 tests + Phase 4 tests) |
| 7 | Gun & Bullet System | DONE | 2026-03-29 | 2026-03-29 | GunSystem frame-based timers, BulletSystem pixel-space sim, GunBulletParityTest (21 tests PLAY MODE VERIFIED), cardinal velocity, rect-vs-circle hitbox, InitForTest wiring |
| 8 | Damage & Status | DONE | 2026-03-29 | 2026-03-29 | DamageSystem.ProcessKill, frame-based MobStatusEffects+PlayerStatusFX, contact cooldown 30 frames, bullet→DamageSystem path, 14 tests PLAY MODE VERIFIED |
| 9 | Melee & Dash | DONE | 2026-03-29 | 2026-03-29 | MeleeSystem frame-based rewrite, dash chain (14f/21.85px/240f CD), _meleeHitMobs entity-agnostic, all specials (ninja/storm/cleave), lifesteal, knockback, DamageSystem MELEE_HEAL_MULTS, 19 tests PLAY MODE VERIFIED |
| 10 | Waves & First Mob | DONE | 2026-03-29 | 2026-03-29 | Frame-based wave state machine (waiting/active/cleared/revive_shop), grunt as first mob, full heal+potions on clear, medpack spawning, stairsOpen/dungeonComplete, PlayerReady(G key), WaveSpawnParityTest (19 tests) |
| 11 | Mob Movement & Basic AI | DONE | 2026-03-29 | 2026-03-29 | Wall collision (slide/nudge/repulsion/half-speed), BFS pathfinding (frame-based cache), facing dir, shooter stop, stuck detection (90 frames/Manhattan), post-movement body blocking (mob-mob + mob-player + clampOutOfWalls), 13 AI patterns verified, MobMovementParityTest (13 tests) |
| 12 | Combat Specials & Telegraphs | DONE | 2026-03-29 | 2026-03-29 | Frame-based TelegraphSystem rewrite (delay/flash/resolve/clearOwner), HazardSystem (zones/tick/slow/damage), AttackShapes complete (9 missing shapes added), CombatSystemsTicker, 4 representative specials (ground_pound/stun_baton/gas_canister/swipe_blink), CombatSpecialsParityTest (21 tests) |
| 13 | Inventory & Equipment | DONE | 2026-03-29 | 2026-03-29 | InventorySystem full parity: armor helpers (15 functions), RecalcMaxHp floor-based, RecalcArmor includes chest+thorns+stagger, auto-revive, dodge chance, absorb, gun/melee special propagation, shop auto-equip, chest regen in WaveSystem, InventoryEquipParityTest (31 tests) |
| 14 | Scene State & Portals | DONE | 2026-03-29 | 2026-03-29 | StateReset.cs centralized reset (8 modes), ScenePortalSystem.cs (PORTAL_SCENES 30 entries, LOBBY_RESET_SCENES 11, LEAVE_HANDLERS 16, queue system), SceneManager scene_changed events, GameManager wired to StateReset for dungeon/lobby/floor transitions, ScenePortalParityTest (27 tests) |
| 15 | Progression & Economy | DONE | 2026-03-29 | 2026-03-29 | ProgressionSystem.cs (getProgressedStats interpolation, _gunLevels storage, tier/level display), GoldRewardSystem.cs (getGoldReward formula with floorBonus/dungeonMult/quickKillBonus/partyMult, WAVES_PER_FLOOR=10), LootDropSystem.cs (mob_killed→getMobDrop→spawnGroundDrop, 1800f life, 40px pickup, ownership), CraftingSystem.cs (upgrade: ore_prefix + parts deduction, evolve: category-specific part swap + gun materials), ProgressionEconomyParityTest.cs (28 tests) |
| 16 | Secondary Systems | IN PROGRESS | 2026-03-29 | | 16.1 Mining DONE, 16.2 Farming DONE, 16.3 Fishing DONE, 16.4 Cooking DONE |
| 16.4 | Cooking | DONE | 2026-03-29 | 2026-03-29 | CookingRegistry.cs (5 shops, 14+18+12 ingredients, 11+12+10 recipes, 3+5+6 customer types, 3+3+3 timer types, 3 mood stages, 5 grades, CalcDeliPay, DetermineGrade, combo config), CookingSystem.cs (order flow: generate→collect→submit→grade→pay/tip/combo, quality set-matching, time scoring, combo S/A increment/F reset, order expiration), CookingParityTest.cs (23 tests: all shop/ingredient/recipe counts, grade determination 5 scenarios, deli pay formula, combo system, customer/timer types, cover fees, entity mapping) |
| 16.2 | Farming | DONE | 2026-03-29 | 2026-03-29 | FarmingRegistry.cs (4 hoes, 9 crops, 8 land expansions, bucket, config constants), FarmingSystem.cs (full tile state flow: empty→tilled→planted→growing→harvestable, bucket fill/water mechanic, multi-tile till/plant/harvest via swingTiles, hoe management, land expansion, seed selection 1-9, save/load: landLevel+equippedHoe+bucketOwned persisted, stats session-only), FarmingParityTest.cs (17+ tests: all crop values, all hoe tiers, all expansion levels, tile states, growth timing, Manhattan sort, bucket cost) |
| 16.3 | Fishing | DONE | 2026-03-29 | 2026-03-29 | FishingRegistry.cs (4 rods, 6 fish species, timing config, tension/reel mechanics, catch chance formula with overweight/level bonus), FishingSystem.cs (7-phase state machine: idle→casting→waiting→bite→reeling→result→cooldown, tension sweet-spot minigame, reel progress with fish fight-back, line snap, fish approach at 40% wait, cast distance=80+tier×10, vendor panel, save/load), FishingParityTest.cs (15 tests: catch chance formula 3 scenarios, rod/fish data, timing constants, tension mechanics) |
| 16.1 | Mining | DONE | 2026-03-29 | 2026-03-29 | MiningSystem.cs (MINING_CONFIG 9 constants, SPAWN_CONFIG 10 constants, getMiningTickRate/getOreDamagePerTick, ore node spawn 2-phase algorithm, updateMining per-frame tick, directional cone check 0.85, mining level gate, target switch early-fire, crit chance, depletion→respawn cycle 690f, ore collection→inventory/ground pickup, XP award), OreRegistry.cs (15 ore types, 4 rooms, MINE_ROOM_ORES, pickRandomOreForRoom weighted, PICKAXE_TIERS 8 entries with miningSpeed/unlockGate), ore collision circle-circle (MINING_PLAYER_R=10+ORE_COLLISION_RADIUS=17), ground ore pickups (1800f life, 40px range, bob+fade), MiningParityTest.cs (22 tests) |
| 16.5 | Save/Load Parity | DONE | 2026-03-29 | 2026-03-29 | SaveManager.cs (SAVE_VERSION=10, JSON schema parity, PlayerPrefs backend), 13 persistent blocks (keybinds/settings/identity/cosmetics/progression/fishing/farming/cookingProgress/quickSlots/sparProgress/sparLearning/gunSettings/materials), session-only exclusions (gold/inventory/equipment/dungeon progress/combat state), gun/pickaxe level format migration (int→{tier,level}), settings migration (playerIndicator→split hitbox), autoSave 1s debounce, startup load, SaveLoadParityTest.cs (24 tests) |
| 17 | Graphics Parity | NOT STARTED | | | |

---

## Phase 0 - Freeze The Reference And Scope

Goal: lock down what "1:1" means before any more Unity work.

1. Define the parity target as:
   same fixed timestep behavior
   same movement and collision feel
   same hitboxes and damage results
   same cooldown timing
   same mob movement and contact logic
   same scene/portal/reset behavior
   same inventory/equipment/stat outcomes
2. Explicitly postpone:
   full graphics parity
   advanced sprite rendering
   VFX and hit effects
   final UI look
   sound
3. Choose the first shipping target:
   one parity lab scene in Unity with player, walls, bullets, one simple enemy, and debug HUD
4. Tag the exact JS commit as `unity-parity-reference`:
   **Reference commit**: `2de68d4fc5ca787cccd3630d6cc6f8af069812f1`
   **Tag**: `unity-parity-reference`
   **Date frozen**: 2026-03-28

Exit gate:
You can say in one sentence what counts as parity and what is intentionally out of scope for now.

## Phase 1 - Build The Parity Harness First

Goal: make it possible to prove Unity matches JS tick by tick.

1. Reuse the snapshot contract from `js/authority/snapshots.js`.
2. Reuse the existing validation mindset from:
   `training/validate_sim.py`
   `training/validate_in_browser.js`
   `js/testing/testHarness.js`
3. In Unity, create:
   `CollectState()` to export the current sim state
   `ApplyInputTrace()` to feed deterministic inputs
   `CompareState()` to diff Unity state against JS reference snapshots
4. Compare at minimum:
   player x/y
   player vx/vy
   facing dir
   hp/maxHp
   cooldown timers
   active slot
   bullets with ids, x/y, vx/vy, lifetime
   mobs with ids, x/y, hp, ai timers, special timers
   wave state
   scene id
5. Add a "fail on first divergence" mode that reports the first bad tick.
6. Snapshot format: JSON (human-readable, diffable). Per-tick snapshots during trace replay, per-event snapshots for targeted tests.

Exit gate:
Unity can load a saved JS snapshot or trace fixture and print a per-tick diff report.

## Phase 2 - Port The Simulation Skeleton

Goal: reproduce the JS runtime shape before any feature logic.

1. Implement a Unity-side equivalent of:
   `GameState`
   `InputIntent`
   `CommandQueue`
   `authorityTick`
   `Events` (pub/sub event bus from `js/authority/eventBus.js`)
2. Match the JS loop shape from `js/core/draw.js`:
   fixed 60 Hz tick
   accumulator
   capped catch-up updates
   `_gameSpeed`-style speed multiplier support if needed for debugging
3. Keep rendering outside the simulation step.
4. Keep Unity-facing components thin:
   input goes in
   simulation ticks
   render reads state out

Exit gate:
Unity can run an empty fixed-step simulation loop with commands in and state out, without MonoBehaviour gameplay code owning the rules.

## Phase 3 - Port Shared Constants And Data Registries

Goal: eliminate guessed values.

1. Port the canonical values from:
   `js/shared/gameConfig.js`
   `js/shared/levelData.js`
   `js/shared/gunData.js`
   `js/shared/itemData.js`
   `js/shared/progressionData.js`
   `js/shared/partyData.js`
   `js/shared/dungeonRegistry.js`
2. Keep names as close to JS as possible.
3. Do not hand-type values from memory.
4. **MANDATORY**: Use automated data export — write a Node script that `require`s the JS data files and dumps JSON. Manual re-entry is the #1 bug source (55% of past port bugs were invented values).
5. Create a one-time validation script that checks counts and key fields on both sides.

Exit gate:
Unity data values are source-traceable to JS and a verifier confirms no fabricated constants for the systems being ported.

## Phase 4 - Port Level Geometry, Collision Grid, And Coordinates

Goal: make world movement happen in the same space.

1. Recreate tile size, world units, and Y-axis conventions from JS.
2. Port collision helpers first, not map rendering.
3. Match:
   `isSolid`
   `positionClear`
   player wall half-width logic
   mob wall half-width logic
4. Use the same per-axis collision order as JS.
5. Test edge cases:
   corners
   wall sliding
   spawn positions
   out-of-bounds blocking

Exit gate:
The same scripted movement traces stop at the same coordinates in JS and Unity.

## Phase 5 - Port Raw Input, Intent Translation, And Commands

Goal: preserve how input becomes gameplay.

1. Match the JS split between:
   raw input capture
   `InputIntent`
   `translateIntentsToCommands()`
   authority-side intent application
2. Preserve held vs one-frame pressed flags.
3. Match keybind routing behavior before trying to redesign it.
4. Keep scene-specific input freezes and restrictions as data/logic, not scattered UI hacks.

Exit gate:
Given the same held/pressed sequence, Unity emits the same command stream as JS for movement, shooting, melee, reload, interact, slots, and potion use.

## Phase 6 - Port Player Movement And Core State Transitions

Goal: match the feel of the player before adding combat depth.

1. Port the player movement path from `update()` in `js/client/ui/inventory.js`.
2. Match:
   velocity updates
   facing changes
   moving flag
   knockback storage and decay
   freeze penalties
   root/stun movement suppression
3. Ignore final art and animation for now.
4. Use debug shapes instead of sprites until parity is stable.

Exit gate:
Player movement, stopping, facing, knockback, and freeze behavior are visually and numerically aligned with JS.

## Phase 7 - Port Gun System And Bullet System

Goal: get ranged combat fully correct before mobs become complex.

1. Port:
   fire rate
   reload time
   ammo rules
   shoot cooldown
   muzzle origin
   aim direction math
2. Port bullet behavior exactly:
   spawn position
   speed
   orientation-specific hitbox
   lifetime
   wall hit behavior
3. Test against:
   `training/validate_sim.py`
   `training/validate_in_browser.js`
4. Do not proceed until sidearm behavior is right.

Exit gate:
The default gun can be fired in Unity and produces the same timings, hit results, and wall collisions as JS.

## Phase 8 - Port Damage Resolution And Status Foundations

Goal: make damage numbers and combat outcomes trustworthy.

1. Port the damage pipeline before adding more content:
   direct damage
   armor interaction
   contact damage cooldown
   kill processing
   on-hit and on-kill callbacks
2. Implement real player status effect state, not stubs.
3. Match speed modifiers and combat timers exactly.
4. Add parity tests for:
   contact damage cooldown scope
   armor math
   kill rewards
   freeze/burn/poison style effects used by currently ported weapons

Exit gate:
For the same combat trace, Unity and JS produce the same HP changes, cooldown outcomes, and kill side effects.

## Phase 9 - Port Melee And Dash

Goal: lock down close combat before enemy complexity grows.

1. Port base melee first:
   swing timing
   swing arc
   range
   per-target crit logic
   knockback
2. Then port dash logic:
   activation gates
   duration
   speed
   chain windows
   cooldown
3. Only after base melee is correct, add melee specials.

Exit gate:
Base melee and ninja-style dash behavior match JS in both timing and results.

## Phase 10 - Port Waves, Spawning, And One Simple Mob End-To-End

Goal: get the first full PvE loop working.

1. Port wave state changes:
   waiting
   active
   cleared
   revive/shop where applicable
2. Port `createMob()` and the **Cave Bat** (simplest cave mob) completely as the first representative mob.
3. Match:
   spawn timing
   hp/damage scaling
   contact range
   initial cooldowns
4. Add medpack spawn checks if that mob or wave path depends on them.

Exit gate:
Unity can run a wave with one simple mob type and the full player-vs-mob loop matches JS.

## Phase 11 - Port Mob Movement, Contact, And Basic AI Set

Goal: get the core enemy layer stable before special abilities.

1. Port mob collision and crowding behavior.
2. Match player-to-mob body blocking.
3. Match global player contact cooldown behavior.
4. Port only the simplest AI patterns first:
   melee chase
   simple shooter
   simple kite if needed
5. Add pathfinding only after the simpler motion rules are verified.

Exit gate:
At least 3 representative mob archetypes behave the same in Unity as in JS on the same map and input trace.

## Phase 12 - Port Combat Specials, Telegraphs, Hazards

Goal: move from "basic combat works" to "real encounters work."

1. Port telegraph system with resolve callbacks.
2. Port attack shape helpers.
3. Port hazard zones and slow/damage application.
4. Port weapon specials and the representative mob specials needed for your current target dungeon.
5. Test one special at a time, not a whole floor at once.

Exit gate:
Telegraphed attacks resolve at the same tick and create the same gameplay outcomes as JS.

## Phase 13 - Port Inventory, Equipment, And Stat Application

Goal: make progression-relevant combat numbers match.

1. Port inventory slot behavior and equipment application.
2. Match equipment-driven stat helpers exactly.
3. Port the current default shop/loadout path before the whole economy.
4. Verify:
   max HP calculation
   armor reduction
   gun stat application
   melee stat application
   potion logic

Exit gate:
Equipping the same items in JS and Unity produces the same player stats and combat performance.

## Phase 14 - Port Scene State, Portals, Reset, And Queue Logic

Goal: make the game move between gameplay states correctly.

1. Port:
   scene ids
   portal checks
   transition logic
   leave handlers
   reset rules
   queue logic where required
2. Match the behavior currently driven from `update()` and scene manager helpers.
3. Do not build full scene visuals yet; use one or two test maps plus transition state.

Exit gate:
Entering, leaving, resetting, and changing scenes produce the same authoritative state changes as JS.

## Phase 15 - Port Progression And Core Economy

Goal: make long-term gameplay systems correct once combat is trustworthy.

1. Port:
   gold changes
   drops
   crafting inputs/outputs
   progression scaling
   forge calculations
2. Validate all values against shared registries.
3. Only implement the minimum UI needed to exercise the systems.

Exit gate:
A full gameplay loop from combat to reward to upgrade produces the same numeric results as JS.

## Phase 16 - Port Secondary Gameplay Systems

Goal: finish non-core but real gameplay before visuals.

Recommended order:

1. mining
2. farming
3. fishing
4. cooking
5. party system
6. bot AI
7. hide and seek
8. mafia
9. casino
10. spar (last — depends on combat, weapons, stats, and neural inference; will be rebuilt for Unity)

Reason:
Life skills (1-4) are self-contained. Party/bot (5-6) build on core combat. Social modes (7-9) are isolated scenes. Spar is last because it requires the most dependencies and the bot AI will be remade anyway.

Exit gate:
Each system gets its own parity pass and does not regress the core combat loop.

## Phase 16.5 - Port Save/Load Parity

Goal: ensure game state persistence matches between JS and Unity.

1. Port `js/core/saveLoad.js` schema (currently v10) to Unity.
2. Match all saved fields: keybinds, settings, identity, cosmetics, progression, skill XP, cooking progress, quickslots.
3. Handle old gun level format (integer) vs new format (`{tier, level}`).
4. Decide: will Unity read JS saves, or start fresh? Document the decision.
5. If cross-compatible: validate round-trip (JS save → Unity load → Unity save → JS load).

Exit gate:
Save/load produces the same restored state in Unity as in JS for the same save data.

## Phase 17 - Only Then Start Graphics Parity

Goal: make the game look right after it already behaves right.

1. Start with debug visuals during all gameplay phases.
2. After systems are stable, port:
   tile rendering
   character rendering
   sort order
   hit effects
   scene-specific visuals
3. Leave cosmetic-only effects until gameplay parity is already locked.

Exit gate:
Changing visuals does not change simulation behavior.

## What Not To Do

- Do not use Rigidbody2D movement for player or mobs.
- Do not let Animator state machines drive combat timing.
- Do not port UI before the system underneath it is correct.
- Do not guess numeric values.
- Do not port all 255+ mobs before 3 representative ones match.
- Do not port every scene before portals and resets are correct.
- Do not call a phase "done" because it looks close.

## Exact Working Rhythm For Claude Or Any Agent

For every subsystem, use this prompt shape:

1. Read only the JS files for this subsystem.
2. Port only this subsystem into pure C# simulation code with no Unity physics.
3. Keep names close to JS.
4. Do not redesign or improve.
5. Add or update parity tests for this subsystem.
6. Report the first tick where Unity diverges from JS if parity fails.
7. Do not touch unrelated systems.

## First 10 Concrete Tasks To Execute Now

1. Tag the JS reference as `unity-parity-reference` at commit `2de68d4`.
2. Build the Unity parity lab scene with debug-only visuals.
3. Implement Unity `GameState`, `InputIntent`, command queue, `Events` bus, and fixed 60 Hz simulation shell.
4. Implement Unity state export and per-tick diff tooling (JSON format).
5. Port `GAME_CONFIG` and the minimum level collision data needed for one arena/test map. **Use automated Node export, not manual re-entry.**
6. Port `isSolid`, `positionClear`, and per-axis movement collision.
7. Port input-to-command translation and one-frame intent clearing.
8. Port player movement, facing, knockback, freeze penalties, and base state updates.
9. Port sidearm shooting, reload, bullet motion, and bullet-vs-wall / bullet-vs-target collision.
10. Port damage resolution, contact cooldowns, and kill processing for that same test slice.

If those 10 are not done and verified, do not branch into art, UI polish, advanced mobs, or secondary game modes yet.

## First Full Vertical Slice Target

Use this as the first "real parity" milestone:

- one map
- one player
- one gun
- one melee weapon
- one potion
- one basic enemy (Cave Bat)
- one wave
- one portal or reset path
- debug HUD with timers and state values

If that slice is right, the rest of the port becomes controlled work instead of guesswork.
