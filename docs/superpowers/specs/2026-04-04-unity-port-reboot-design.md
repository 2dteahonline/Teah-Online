# Unity Port Reboot — Playability-First Plan

## Problem Statement

We have **179 C# scripts** (many high-quality, 90%+ complete) but **0% playability**. The Unity scene contains only a Camera and a Light. No GameObjects, no prefabs, no sprites. None of the 429 mob abilities, 23 UI panels, or 6 combat systems have ever been tested because nothing is wired to run.

**Root cause:** We treated the port as a translation exercise (JS -> C#) instead of building a playable game incrementally. Every session produced more code but nobody ever wired a GameObject into a scene.

## Design Principle

**Every phase must end with something you can see and interact with in Play mode.**

No more writing code that can't be verified. If you can't press Play and see it work, the phase isn't done.

## Phase Map

### Phase 0: Bootstrap — "I can walk around the lobby"
**Goal:** GameManager in scene, player walks, camera follows, tiles render.

**What to do:**
1. Create a `GameManager` GameObject in SampleScene
2. Attach `GameManager.cs`, assign `GameConfig.asset` reference
3. Verify `GameManager.Start()` bootstraps: Grid/Tilemaps, Player (with CharacterRenderer, PlayerController, PlayerInputHandler, YSortRenderer), Camera
4. Fix any null refs or missing wiring that prevents Start() from completing
5. Enter Play mode — see lobby tiles, see player sprite, walk with WASD, camera follows

**Exit gate:** Press Play → see lobby, walk around, see entity sprites (portals, buildings), camera tracks player.

**Systems validated:** GameManager, SceneManager, SceneTileRenderer, LobbyBuilder, PlayerController, CharacterRenderer, CharacterAnimator, YSortRenderer, CameraController, PlayerInputHandler, EntityRendererRegistry, CollisionGrid, EventBus

**Risk:** GameManager.Start() references ~30 systems. Some may have broken dependencies. Fix them one at a time — don't rewrite, just wire.

---

### Phase 1: Combat Loop — "I can fight mobs in a dungeon"
**Goal:** Walk into dungeon portal, arena loads, mobs spawn, shoot/melee, mobs die, wave clears.

**What to do:**
1. Walk into dungeon entrance portal → scene transitions to dungeon arena
2. WaveSystem spawns mobs → MobController + MobRenderer create visible mobs
3. GunSystem fires bullets → BulletSystem moves them → DamageSystem processes hits
4. MeleeSystem swings → damage applies → mobs take damage
5. Mobs die → LootDropSystem drops gold → wave clears
6. Floor clear → staircase appears → next floor loads
7. 5 floors → dungeon complete → return to lobby

**Exit gate:** Complete a full 5-floor cave dungeon run (basic mobs only — no specials needed yet).

**Systems validated:** WaveSystem, MobController, MobRenderer, GunSystem, BulletSystem, MeleeSystem, DamageSystem, LootDropSystem, HitEffectRenderer, ScenePortalSystem, StateReset

**Dependencies from Phase 0:** Player exists, tiles render, camera works, input works.

---

### Phase 2: Core HUD — "I can see my HP, wave, and equipment"
**Goal:** All essential combat HUD elements visible and updating.

**What to do:**
1. GameHUD: HP bar, lives, gold, kills counter, wave display (floor/wave/mob count)
2. HotbarUI: 5 slots with equipped items, key hints
3. Interactable prompts (portal approach text)
4. Death overlay ("YOU DIED" + respawn countdown)
5. Wave state messages (GET READY, FLOOR CLEAR, DUNGEON COMPLETE)
6. Chat (basic — local echo, debug commands)

**Exit gate:** Play a dungeon run and see all HUD elements update in real-time. Die and see death screen. Clear dungeon and see victory.

**Systems validated:** GameHUD, HotbarUI, ChatUI, death/respawn flow, wave state display

---

### Phase 3: Equipment & Economy — "I can buy gear and get stronger"
**Goal:** Shop works, inventory works, equipment affects combat.

**What to do:**
1. ShopPanelUI: Browse tiers, buy guns/melee/armor with gold
2. InventoryPanelUI: See items, equip/unequip, category tabs
3. Equipment effects: armor reduction, HP bonus, speed from boots, dodge chance
4. Weapon tiers: T1-T4 guns and melee with correct damage/fire rate
5. Buff purchases: gun dmg +3, melee dmg +3, health potion, lifesteal
6. Potion usage (quickslot)

**Exit gate:** Start dungeon → earn gold → open shop → buy T2 weapon → equip it → see damage increase → buy armor → see HP increase.

**Systems validated:** ShopPanelUI, InventoryPanelUI, InventorySystem, equipment stat calculations, all interactable.js shop formulas

---

### Phase 4: Party & Bots — "I have AI companions"
**Goal:** PartySystem spawns bots, bots fight alongside player, party UI shows status.

**What to do:**
1. PartySystem creates 3 bot entities with equipment
2. BotAI: movement, targeting, shooting, melee
3. PartyStatusUI: member HP bars, gold, lives, equipment tier dots
4. Party gold distribution on kills
5. Party lifesteal
6. Bot death/revive mechanics
7. ReviveShopUI between floors

**Exit gate:** Enter dungeon with 3 bots → bots fight mobs → see party status panel → bot dies → revive shop appears → revive bot → continue.

---

### Phase 5: Combat Polish — "Abilities work and look right"
**Goal:** Verify 429 mob abilities, status effects render, telegraphs/hazards visible.

**What to do:**
1. Status effect rendering: stun ring, slow tint, mark crosshair, bleed drips, confuse swirl, disorient wave
2. Telegraph visuals (circles, lines, cones with color fills)
3. Hazard zone visuals (colored ground areas with tick damage)
4. Mob persistent effects (20+ types: lasers, beams, pools, gravity wells, cyclones, etc.)
5. Test all 5 dungeons — verify abilities fire, telegraphs appear, damage applies
6. Ninja dash (3-chain + afterimages)
7. Storm Blade shockwave + chain lightning
8. War Cleaver cleave + piercing blood

**Exit gate:** Run each dungeon to floor 3+. See telegraphs, hazards, status effects. All abilities fire without errors.

---

### Phase 6: Ultimates & Weapon Specials — "Endgame combat works"
**Goal:** Shrine, Godspeed, frost/burn gun effects, shadow step.

**What to do:**
1. Shrine (War Cleaver): charge on cleave kills, activate for AOE slash ticks
2. Godspeed (Storm Blade): 10 charges, 300f duration, lightning strikes
3. Charge bar HUDs (3 variants: Shrine red, Godspeed cyan, Ninja Dash segments)
4. Frost Rifle: slow on hit, nova on kill
5. Burn Rifle: DOT on hit, chain explosion on kill
6. Shadow Step: boots T3 teleport on melee crit
7. Visual effects: lightning auras, cursed energy, domain boundary

**Exit gate:** Equip T4 weapons → charge ultimate → activate → see visual effects → damage applies correctly.

---

### Phase 7: UI Panels — "All menus work"
**Goal:** All remaining UI panels functional.

**What to do:**
1. ProfileMenuUI, IdentityPanelUI (name, faction, country, language, relationship)
2. StatsPanelUI (skill XP, progression)
3. SettingsPanelUI (keybinds, toggles, sound)
4. CustomizePanelUI (19-color picker, head selection)
5. ForgePanelUI (crafting)
6. WeaponStatsUI (gun/melee detailed stats)
7. Minimap (fullscreen overlay with room labels)
8. TestMobPanel (debug mob spawner)

**Exit gate:** Every panel opens, displays correct data, interactions work (buy, equip, customize, rebind keys).

---

### Phase 8: Skill Systems — "Mining, fishing, farming, cooking work"
**Goal:** All 4 skill minigames playable.

**What to do:**
1. MiningSystem: ore nodes, pickaxe tiers, mining shop
2. FishingSystem: cast, bite, reel QTE, fish vendor
3. FarmingSystem: plant seeds, water, harvest, farm vendor
4. CookingSystem + CookingNPCBase (5,772 lines):
   - Deli: order NPCs, aisle shoppers, 4-slot counter
   - Diner: party groups, waitress, multi-item tickets, booth seating
   - Fine Dining: teppanyaki grill QTE, VIP/Critic, waiter service
5. Cooking HUD (order panel, timer, stats)

**Exit gate:** Visit each skill scene → complete the activity → earn gold/XP → buy upgrades at vendor.

---

### Phase 9: Game Modes — "Casino, Mafia, Hide & Seek, Spar"
**Goal:** All 4 multiplayer-style game modes work (single-player with bots).

**What to do:**
1. Casino: 10 mini-games (blackjack, roulette, slots, dice, etc.)
2. Mafia (Among Us): roles, tasks, voting, sabotage, Skeld map
3. Hide & Seek: hider/seeker, FOV, tagging
4. Spar: PvP arena with neural bot

**Exit gate:** Enter each game mode → play a round → mode-specific mechanics work.

---

### Phase 10: Save/Load & Polish
**Goal:** Game state persists, all edge cases handled.

**What to do:**
1. SaveManager: schema v10 save/load
2. All save fields (inventory, progression, cosmetics, keybinds)
3. Spectator mode (watch party when dead)
4. Victory celebration (confetti)
5. Zone transition fades with labels
6. Debug overlay (zoom, tile count, speed tracker)
7. Full parity test suite against JS snapshots

**Exit gate:** Save game → quit → reload → all state restored. Run full parity test suite — zero failures.

---

## What Changed From the Old Plan

| Old Approach | New Approach |
|---|---|
| Port systems as isolated C# files | Wire systems into scene, verify in Play mode |
| Measure progress by script count | Measure progress by what you can DO |
| 18 phases based on system category | 11 phases based on playability milestones |
| Mob abilities = high priority | Mob abilities = Phase 5 (after combat loop works) |
| No scene setup phase | Phase 0 = get the game RUNNING |
| No verification loop | Every phase has a Play mode exit gate |
| CLAUDE.md references deleted docs | CLAUDE.md references this living plan |

## Estimated Effort Per Phase

| Phase | Scope | Est. Sessions |
|---|---|---|
| 0: Bootstrap | Wire GameManager, fix nullrefs | 1-2 |
| 1: Combat Loop | Dungeons, mobs, shooting, waves | 2-3 |
| 2: Core HUD | HP, wave, hotbar, death screen | 1-2 |
| 3: Equipment | Shop, inventory, gear effects | 2-3 |
| 4: Party & Bots | 3 AI companions, party UI | 2-3 |
| 5: Combat Polish | 429 abilities, status FX, telegraphs | 3-5 |
| 6: Ultimates | Shrine, Godspeed, weapon specials | 2-3 |
| 7: UI Panels | All remaining menus | 3-4 |
| 8: Skill Systems | Mining, fishing, farming, cooking | 5-8 |
| 9: Game Modes | Casino, mafia, hide & seek, spar | 5-8 |
| 10: Save/Load | Persistence, polish, parity tests | 2-3 |

## Rules Going Forward

1. **Play mode after every phase.** If you can't see it work, it's not done.
2. **Fix forward, don't rewrite.** 179 scripts exist and most are good. Wire them, don't replace them.
3. **One phase at a time.** Don't jump to Phase 5 before Phase 1 works.
4. **Test in-game, not in compiler.** "It compiles" means nothing. "I can see it" means everything.
5. **Scene setup is real work.** Creating GameObjects, wiring references, fixing nullrefs — this IS the port.
