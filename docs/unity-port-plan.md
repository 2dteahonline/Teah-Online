# Unity Port — Comprehensive Parity Audit (2026-03-28, Round 3)

> **113 C# scripts** audited against **~121,200 lines of JS** across 91 files.
> Unity project: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline` (Unity 6, 6000.4.0f1)
> **Overall functional completeness: ~40-45%**
> Previous rounds fixed 82+67 = 149 issues. This deep audit found **~250 new actionable issues**.

---

## Summary

| Severity | Fixed (Rounds 1-2) | NEW (Round 3) | Total Remaining |
|----------|-------------------|---------------|-----------------|
| CRITICAL | 13 | ~35 | ~35 |
| HIGH | 20 | ~55 | ~61 |
| MEDIUM | 21 | ~80 | ~87 |
| LOW | 0 | ~40 | ~40+ |
| **Total** | **54** | **~210** | **~223** |

---

## ⚠ TOP 20 MOST IMPACTFUL ISSUES (fix these first)

| # | Severity | System | Issue | Notes |
|---|----------|--------|-------|-------|
| 1 | **CRIT** | Damage | `processKill()` missing — no gold/heal/XP/ammo on kills | C9 from R1, still a stub |
| 2 | **CRIT** | Combat | Gun special on-hit never fires (frost/burn) — no `special` field on bullets | BulletSystem has no special dispatch |
| 3 | **CRIT** | Combat | Gun special on-kill never fires (frost nova, inferno explosion) | No mob_killed handler for GUN_BEHAVIORS |
| 4 | **CRIT** | Melee | All melee specials missing (ninja/storm/cleave/piercing blood/ultimates) | ~200 lines of JS, 0 in Unity |
| 5 | **CRIT** | StatusFX | PlayerStatusFX is pure Debug.Log stub — 0/14 effects work | No state, no tick, no speed mod |
| 6 | **CRIT** | Telegraph | No `onResolve` callback — telegraphed attacks can't deal damage | Abilities with delayed damage broken |
| 7 | **CRIT** | Inventory | recalcMaxHp() uses hardcoded 50 instead of floor-based HP (100/125/150/200/250) | InventorySystem.cs:302 |
| 8 | **CRIT** | Inventory | ApplyGunStats writes wrong field names — CT-X freeze stats never applied | freezeDuration vs freezeDurationFrames |
| 9 | **CRIT** | Mobs | No global player contact cooldown — player takes damage from ALL mobs simultaneously | JS has 30-frame global CD |
| 10 | **CRIT** | Cooking | Quality scoring uses HashSet (breaks duplicate ingredients) | Count-based matching needed |
| 11 | **CRIT** | Input | Keybinds not rebindable — all hardcoded in PlayerInputHandler | Settings UI stores them but input ignores |
| 12 | **CRIT** | Forge | Costs completely fabricated, shows ALL weapons instead of 5 forge guns, ApplyProgressedStats no-op | H26 from R1 |
| 13 | **HIGH** | Inventory | Armor reduction ignores chest dmgReduce — only pants counted | InventorySystem.cs:293 |
| 14 | **HIGH** | Inventory | No dungeon shop weapon/armor tier registries (GUN_TIERS, MELEE_TIERS, etc.) | interactable.js:185-227 |
| 15 | **HIGH** | Damage | 50% armor cap is Unity-only invention — not in JS | DamageSystem.cs:272 |
| 16 | **HIGH** | Melee | Base katana lifesteals in Unity but shouldn't — only specials do in JS | MeleeSystem.cs:128-133 |
| 17 | **HIGH** | Waves | Medpacks not spawned on normal waves at all — only boss waves | Phase advances and wave starts |
| 18 | **HIGH** | Mobs | Player-to-mob body blocking completely missing — player walks through mobs | mobSystem.js:1387-1429 |
| 19 | **HIGH** | Mining | Ore rewarded as gold instead of inventory items — breaks crafting pipeline | MiningSystem.cs:306 |
| 20 | **HIGH** | Anim | Walk frame cycling wrong: Unity uses 0-3, JS uses 1-3 (col 0 = idle only) | characterSprite.js |

---

## CRITICAL Issues — All (including new from Round 3)

### Combat System
| # | File | Issue | Source |
|---|------|-------|--------|
| C9 | DamageSystem.cs | `processKill()` stub — no gold/heal/XP/ammo refill/witch death/golem death/death explosion on kills | damageSystem.js:354-482 |
| NEW-C1 | BulletSystem.cs | No gun special on-hit dispatch (frost slow, burn DoT never fire) | meleeSystem.js:1106-1109 |
| NEW-C2 | BulletSystem.cs | No `special` field on Bullet struct | meleeSystem.js:1088 |
| NEW-C3 | DamageSystem.cs | GUN_BEHAVIORS on-kill (frost nova, inferno explosion) never trigger | damageSystem.js:511-519 |
| NEW-C4 | MeleeSystem.cs | No melee specials (ninja/storm/cleave/piercing blood) — ~200 lines missing | meleeSystem.js:119-250 |

### Inventory/Player
| # | File | Issue | Source |
|---|------|-------|--------|
| NEW-C5 | InventorySystem.cs | recalcMaxHp() hardcoded 50 instead of floor-based HP (100/125/150/200/250) + clamps instead of adding delta | interactable.js:380-388 |
| NEW-C6 | InventorySystem.cs | ApplyGunStats writes `freezeDuration`/`freezePenalty` but GunSystem reads `freezeDurationFrames`/`freezePenaltyOverride` — CT-X freeze never applied | InventorySystem.cs:233-234 |

### Status Effects / Telegraph
| # | File | Issue | Source |
|---|------|-------|--------|
| NEW-C7 | PlayerStatusFX.cs | Pure Debug.Log stub — 0/14 effects implemented, no state/tick/speed integration | combatSystem.js StatusFX |
| NEW-C8 | TelegraphSystem.cs | No `onResolve` callback — telegraphed delayed damage can't fire | telegraphSystem.js |

### Mobs
| # | File | Issue | Source |
|---|------|-------|--------|
| NEW-C9 | MobController.cs | No global player contact cooldown — player hit by ALL mobs simultaneously | mobSystem.js:1329 (30-frame global CD) |

### Cooking
| # | File | Issue | Source |
|---|------|-------|--------|
| NEW-C10 | CookingSystem.cs | Quality scoring uses HashSet (breaks duplicate ingredients) — need count-based matching | cookingSystem.js:576-590 |

### UI / Forge
| # | File | Issue | Source |
|---|------|-------|--------|
| H26 | ForgePanelUI.cs | Costs fabricated, material requirements missing, shows ALL weapons instead of 5 forge guns, ApplyProgressedStats no-op | forgeUI.js, progressionData.js |
| NEW-C11 | — | Casino UI entirely missing (10 game-specific UIs) | casinoUI.js (740x540) |

### Input
| # | File | Issue | Source |
|---|------|-------|--------|
| NEW-C12 | PlayerInputHandler.cs | Keybind system not rebindable — all keys hardcoded, settings keybinds ignored | settings.js keybind system |
| NEW-C13 | PlayerInputHandler.cs | Escape key not handled — no way to close panels via keyboard | panelManager.js keydown |
| NEW-C14 | PlayerInputHandler.cs | ALL input suppressed when panel open (JS only suppresses movement, arrow shooting still works) | panelManager.js |

### Party
| # | File | Issue | Source |
|---|------|-------|--------|
| NEW-C15 | PartyData.cs | DEFAULT_GUN stats are OLD Pistol values (20/10/30) not current Sidearm (28/5/35) | interactable.js:160 |
| NEW-C16 | PartyData.cs | DEFAULT_MELEE stats are OLD Knife values (15/90/28/0.10) not current Combat Blade (24/110/24/0.15) | interactable.js:162 |

---

## HIGH Issues — All Remaining

### Combat
| # | Issue |
|---|-------|
| H7 | Arrow bullets (bounce, lifetime, poison) missing |
| H8 | Boulder bullets (wall explode, blast damage) missing |
| NEW-H1 | Projectile reflect mechanic missing — mobs with reflect don't deflect bullets |
| NEW-H2 | No `onWallHit` callback for mob bullets — bouncing projectiles won't work |
| NEW-H3 | Mob arrow bounce off walls missing �� arrows just destroyed |
| NEW-H4 | Wrong attacker attribution: `FindAnyObjectByType<PlayerController>()` instead of bullet owner |
| NEW-H5 | DOT + armorBreak interaction wrong — Unity resets to rawDmg, discarding armorBreak for DOT |
| NEW-H6 | 50% armor cap is Unity-only invention — not in JS |
| NEW-H7 | Mark damage bonus may double-dip (applied in DealDamageToMob AND status tick) |
| NEW-H8 | Base katana lifesteals in Unity — JS only lifesteals from specials (ninja/storm/cleave) |
| NEW-H9 | Melee swing uses free-aim in Unity vs 4-cardinal in JS |
| NEW-H10 | Gun aims at feet (transform.position), JS aims at torso (y - 30px) |

### Inventory
| # | Issue |
|---|-------|
| NEW-H11 | Armor reduction ignores chest dmgReduce — only pants summed |
| NEW-H12 | No dungeon shop weapon/armor tier registries (GUN_TIERS, MELEE_TIERS, BOOTS_TIERS, etc.) |
| NEW-H13 | Gun/melee specials never applied by applyGunStats/applyMeleeStats |
| NEW-H14 | No equipment stat helper functions (getThorns, getStagger, getChestRegen, hasRevive, etc.) |

### Mobs / Waves
| # | Issue |
|---|-------|
| NEW-H15 | Medpacks not spawned on normal waves (only boss waves) |
| NEW-H16 | Medpacks not spawned on phase advances |
| NEW-H17 | Player-to-mob body blocking completely missing |
| NEW-H18 | Missing half-speed and wall repulsion collision fallbacks — mobs get stuck |

### Mining / Farming
| # | Issue |
|---|-------|
| NEW-H19 | Ore rewarded as gold instead of inventory items — breaks crafting pipeline |
| NEW-H20 | Missing ore ground pickup system |
| NEW-H21 | Missing ore discovery tracking for pickaxe unlocks |
| NEW-H22 | Missing watering mechanic (bucket, well, water step) |
| NEW-H23 | Missing farm vendor/shop system |

### Cooking
| # | Issue |
|---|-------|
| NEW-H24 | Unity uses variable timer types; JS uses flat 30s for ALL orders |
| NEW-H25 | Entire deli NPC system missing (711 lines) |

### Party / Bot AI
| # | Issue |
|---|-------|
| H14 | Mafia subrole probability wrong (flat 20% vs varying 10-30%) |
| H15 | HideSeek seeker bot detection stubbed |
| H16 | HideSeek bot AABB collision stubbed |
| H19 | BotAI shop behavior missing |
| H20 | BotAI telegraph dodging missing |
| H21 | BotAI status effect processing missing |
| NEW-H26 | Party missing auto-revive from chest armor |
| NEW-H27 | Mafia bot AI completely stubbed (empty method) |
| NEW-H28 | HideSeek hider scoring + seeker patrol + AABB all stubbed |

### Spar / StatusFX / Telegraph
| # | Issue |
|---|-------|
| NEW-H29 | Spar learning profile update is a stub |
| NEW-H30 | Neural model JSON format mismatch (2D weights vs flat, no value head filter) |
| NEW-H31 | No `tickPlayer()` for status effect resolution |
| NEW-H32 | No integration between PlayerStatusFX and PlayerController speed |
| NEW-H33 | Telegraph missing 'ring' and 'tiles' shapes |
| NEW-H34 | HazardSystem entirely missing from Unity |

### Scene / Input / Core
| # | Issue |
|---|-------|
| NEW-H35 | Spectate camera mode missing (dead player should follow party) |
| NEW-H36 | Portal system not ported (PORTAL_SCENES registry, checkPortals) |
| NEW-H37 | Leave/cleanup system not ported (LEAVE_HANDLERS, per-scene cleanup) |
| NEW-H38 | Queue system not ported (dungeon queue, party slot selection) |
| NEW-H39 | Melee key F vs JS slot2 "2" mismatch |
| NEW-H40 | Profile key (H), Identity key (Z) not mapped in Unity |
| NEW-H41 | Save schema missing most fields (settings, identity, cosmetics, fishing, farming, cooking, spar, quickslots, gun settings, CT-X sliders) |
| NEW-H42 | Walk frame cycling wrong: Unity 0-3, JS 1-3 (col 0 = idle only) |
| NEW-H43 | Invented `Mafia` scene type that doesn't exist in JS (JS uses `skeld`) |

### Rendering
| # | Issue |
|---|-------|
| NEW-H44 | Hit effect rendering: 73 types, 0 rendered in Unity |
| NEW-H45 | Entity rendering: 175 types, ~10 in Unity |
| NEW-H46 | Bullet visual rendering missing |
| NEW-H47 | Mob death explosion effects missing |
| NEW-H48 | Melee weapon auras missing (ninja trail, storm lightning, cleave cursed energy) |
| NEW-H49 | Godspeed + Malevolent Shrine ultimate effects missing |
| NEW-H50 | Mob persistent effects: 25+ types missing (turrets, drones, mines, orbs, beams, etc.) |
| NEW-H51 | Mob status overlays incomplete (boss glow, shield HP, mummy armed, cloak smoke) |

---

## MEDIUM Issues (selected — full list in audit agent outputs)

### Combat: M1-M6 (all FIXED in Round 2), plus:
- Muzzle position not ported (bullets from center), CT-X stack count missing, ammo refill witch_skeleton source check

### Mobs:
- Shooter initial cooldown not randomized, farm wave detection uses wrong wave numbering on floors 2+, no summoned minion despawn timer, BFS null-path dot-product fallback missing, velocity threshold per-axis vs magnitude, "kite" AI mapped to Archer (JS has no kite handler)

### UI:
- Inventory layout (full-screen vs 820x600), category names ("Melee"→"Melees", etc.), missing item card popup, customize HSV picker simplified to 8-swatch, minimap room labels missing, UIColors hex mismatches (#c03030→#cc3333, #ffd700→#ffd740), settings scrollbar missing, settings not wired to gameplay

### Input:
- Fishing reel (Space), minimap toggle (M), Escape handling, Mafia-specific keybinds (Q/R/T/V/X), scroll wheel, right-click context menu, mouse hotbar clicks, farm seed selection (1-9)

### Scene/Core:
- Zone label text during transitions missing, head spritesheet axis mapping potentially inverted, missing events (wave_started, floor_changed, scene_changed), sub-panel system missing, CollectState/ApplyState incomplete

### Cooking/Mining:
- Multi-item ticket system missing, grill/teppanyaki system missing, F-grade XP not awarded, farming "planted" state skipped

### Spar:
- Streak room labels missing " Streak" suffix, no match telemetry, spread formula may double

---

## Known Stubs (Expected — Not parity bugs)

These are systems intentionally stubbed during porting, tracked as feature gaps:

- **435 mob abilities** (only 6 cave abilities implemented)
- **Spar bot AI** (~7,300 lines) — planned full remake for Unity
- **Spar learning system** (reinforcement learning) — planned remake
- **HazardSystem** (zone damage) — integration points exist, no implementation
- **Cooking NPC systems** (3 restaurants, ~2000 lines) — CookingSystem exists, NPCs don't
- **Melee specials** (ninja dash, storm blade, cleave, shrine, godspeed)
- **Player status effects** (14 types) — PlayerStatusFX.cs is Debug.Log stub
- **AttackShapes.cs** — only 4 of 13 methods
- **TelegraphSystem.cs** — no onResolve, missing ring/tiles shapes
- **Dev tools** (commands, toolbox, testMobPanel)
- **Casino UI panels** (10 game-specific UIs)
- **Restaurant UIs** (Deli/Diner/Fine Dining)
- **FOV rendering** (Mafia + HideSeek raycasting)
- **Vent system** (4 networks)
- **Security camera system**
- **Skeld tasks** (14 mini-games)
- **Tile renderer** (18 scene styles)
- **Scene-specific HUDs** (spar, casino, cooking, fishing, farming, mining, mafia, H&S — 22 systems)

---

## FIXED Issues (Rounds 1-3)

### Round 1 (82 fixes): C1-C8, C10-C13, H5-H6, H9-H13, H17-H18, H22-H25, M7, M11-M12, M17, M23-M24, M28
### Round 2 (36 fixes): H1-H4, H9-H11, H23-H24, M1-M6, M8-M10, M13-M16, M18-M21, M25-M27, M29-M34

**Note on M27**: Walk animation was "fixed" to `animFrame % 4` but deep audit found JS uses `1 + (frame % 3)` — col 0 is idle only. This fix is WRONG and needs reverting to `1 + (animFrame % 3)`.

---

## Key Constants Reference (Verified 2026-03-28)

```
// Physics (GAME_CONFIG)
TILE=48, PLAYER_BASE_SPEED=7.5, PLAYER_WALL_HW=14, PLAYER_RADIUS=23
MOB_WALL_HW=11, MOB_RADIUS=23, POS_HW=10, MOB_CROWD_RADIUS=46
BULLET_SPEED=9, BULLET_HALF_LONG=15, BULLET_HALF_SHORT=4
ENTITY_R=29, PLAYER_HITBOX_Y=-25, KNOCKBACK_DECAY=0.8, KNOCKBACK_THRESHOLD=0.6
ORE_COLLISION_RADIUS=17, MINING_PLAYER_R=10

// Player defaults (gameState.js / interactable.js)
HP: floor-based (100/125/150/200/250), GUN_DMG=20, GUN_MAG=30
MELEE_DMG=15, MELEE_RANGE=90, MELEE_CD=28, MELEE_CRIT=0.20
DEFAULT_GUN (Sidearm): dmg=28, fireRate=5, magSize=35
DEFAULT_MELEE (Combat Blade): dmg=24, range=110, cd=24, crit=0.15

// Counts
MOB_TYPES=265, MOB_AI=13, MOB_SPECIALS=435, ENTITY_RENDERERS=175
HIT_EFFECTS=73, SCENES=18, CASINO_GAMES=10, INVENTORY_SLOTS=200
```

### Y-Axis: Canvas Y-down → Unity Y-up: negate Y offsets
### Frames→Seconds: ÷60. Velocities: ×60÷PPU for world units/sec
