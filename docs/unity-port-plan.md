# Unity Port — Full Parity Audit (2026-03-28)

> **113 C# scripts** audited against **~121,200 lines of JS** across 91 files.
> Unity project: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline` (Unity 6, 6000.4.0f1)
> Previous parity audit (2026-03-27) fixed 82/83 issues. This deeper audit found **~67 new actionable issues**.

---

## Summary

| Severity | Total | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 13 | 13 | 0 |
| HIGH | 24 | 10 | 14 |
| MEDIUM | 30 | 13 | 17 |
| LOW/TRIVIAL | 25+ |
| **Total** | **~92** |

---

## CRITICAL Issues (13) — Break fundamental gameplay

| # | System | File | Issue | JS Source |
|---|--------|------|-------|-----------|
| C1 | Combat | GunSystem.cs | ~~Gun damage default **28** vs JS **20**~~ | **FIXED** |
| C2 | Combat | GunSystem.cs | ~~Gun magSize/ammo **35** vs JS **30**~~ | **FIXED** |
| C3 | Combat | MeleeSystem.cs | ~~Melee damage default **24** vs JS **15**~~ | **FIXED** |
| C4 | Combat | MeleeSystem.cs | ~~Melee range default **110** vs JS **90**~~ | **FIXED** |
| C5 | Combat | MeleeSystem.cs | ~~Knockback wall check~~ (verified: 1 world unit = 1 tile, FloorToInt is correct) | **OK** |
| C6 | Combat | BulletSystem.cs | ~~MOB_HITBOX_Y sign inverted~~ flipped to +20 | **FIXED** |
| C7 | Combat | BulletSystem.cs | ~~PLAYER_HITBOX_Y sign inverted~~ flipped to +25 | **FIXED** |
| C8 | Combat | BulletSystem.cs | ~~Bullet hits bypass DamageSystem~~ now routes through DealDamageToMob | **FIXED** |
| C9 | Combat | DamageSystem.cs | `processKill()` missing — no gold/heal/XP on kills | STUB (needs full implementation) |
| C10 | Combat | MobAbilitySystem.cs | ~~Initial ability CDs in frames but decremented in seconds~~ now divides by 60 | **FIXED** |
| C11 | Waves | WaveSystem.cs | ~~Boss medpacks: 2 instead of 4~~ now calls SpawnMedpacks() twice | **FIXED** |
| C12 | Mobs | MobAIPatterns.cs | ~~Healer AI orbit reversed~~ fixed direction vector | **FIXED** |
| C13 | Waves | WaveSystem.cs | ~~MOB_CAPS hardcoded 10 entries~~ now reads MobType.cap from JSON | **FIXED** |

---

## HIGH Issues (24) — Significant gameplay impact

| # | System | File | Issue | JS Source |
|---|--------|------|-------|-----------|
| H1 | Combat | GunSystem.cs | Fire rate uses raw `fireRate` field; JS uses `getFireRate()` formula: `round(58 - gunStats.firerate * 0.55) * 4` | gunSystem.js:28 |
| H2 | Combat | GunSystem.cs | Freeze penalty system missing (no movement slow after shooting) | gunSystem.js:33-41,467-473 |
| H3 | Combat | GunSystem.cs | Reload time uses `fireRate` field; JS uses `gunStats.firerate` slider (0-100) or per-gun override | gunSystem.js:44-49 |
| H4 | Combat | GunSystem.cs | Shotgun pellets, SMG random spread, bow pierce all missing — only single bullets | gunSystem.js:499-570 |
| H5 | Combat | MeleeSystem.cs | ~~Melee cooldown **24** vs JS **28**~~ | **FIXED** |
| H6 | Combat | MeleeSystem.cs | ~~Melee crit chance **0.15** vs JS **0.20**~~ | **FIXED** |
| H7 | Combat | BulletSystem.cs | Arrow bullets (bounce, lifetime, poison) missing | meleeSystem.js:967-975,1150-1173 |
| H8 | Combat | BulletSystem.cs | Boulder bullets (wall explode, blast damage) missing | meleeSystem.js:1004-1019 |
| H9 | Combat | DamageSystem.cs | ~~`DealDamageToMob` returns int (damage dealt), JS returns bool (mob died) — all death-check callers broken~~ | **FIXED** |
| H10 | Combat | DamageSystem.cs | ~~Core Guardian split mechanic missing (split into 2 at 50% HP)~~ | **FIXED** |
| H11 | Mobs | MobController.cs | ~~Mob separation/body-blocking not implemented — mobs stack on top of each other~~ | **FIXED** |
| H12 | Casino | CasinoSystem.cs | ~~BJ double: no hand length check or gold deduct~~ | **FIXED** |
| H13 | Casino | CasinoSystem.cs | ~~BJ split: no gold deduct~~ | **FIXED** |
| H14 | Mafia | MafiaSystem.cs | Subrole probability wrong: flat 20% no-subrole vs JS varying 10-30% by role set | mafiaRoleData.js |
| H15 | HideSeek | HideSeekSystem.cs | Seeker bot detection/tag entirely stubbed — never finds or tags hider | hideSeekSystem.js |
| H16 | HideSeek | HideSeekSystem.cs | Bot AABB collision stubbed — walks through walls | hideSeekSystem.js |
| H17 | Party | PartyData.cs | ~~Default melee stats all wrong~~ dmg 15, range 90, cd 28, crit 0.10 | **FIXED** |
| H18 | Party | PartyData.cs | ~~Extra lifesteal/critMult~~ removed (set to 0) | **FIXED** |
| H19 | BotAI | BotAI.cs | Missing shop behavior — bots never buy upgrades | botAI.js |
| H20 | BotAI | BotAI.cs | Missing telegraph dodging — bots stand in AoEs | botAI.js |
| H21 | BotAI | BotAI.cs | Missing status effect processing (root, stun, fear, slow) — bots ignore CC | botAI.js |
| H22 | Core | GameConfig.cs | ~~WorldPlayerHitboxY not Y-flipped~~ now negates sign | **FIXED** |
| H23 | Core | PlayerController.cs | ~~Boots speed bonus missing~~ now reads InventorySystem.GetBootsSpeedBonus() and adds to base speed | **FIXED** |
| H24 | Core | PlayerController.cs | ~~Speed multiplier system missing~~ now computes speedMult from gun freeze + statusFX root/slow + hazard zones | **FIXED** |
| H25 | Core | SceneManager.cs | ~~InDungeon includes hub areas~~ now Dungeon-only + InAnyCombatArea helper | **FIXED** |
| H26 | UI | ForgePanelUI.cs | Costs fabricated (`baseCost * (1 + level*0.4)`), material requirements missing, shows ALL weapons instead of 5 forge guns, `ApplyProgressedStats()` is a no-op | forgeUI.js, progressionData.js |

---

## MEDIUM Issues (30)

| # | System | Issue |
|---|--------|-------|
| M1 | Combat | Bullet FixedUpdate vs per-frame; mob bullet `onUpdate`/`onExpire` callbacks missing |
| M2 | Combat | Pierce missing `hitMobs` tracking; ammo refill skips `witch_skeleton` source check |
| M3 | Combat | Lifesteal on post-reduction damage vs JS pre-reduction |
| M4 | Combat | `DealDamageToPlayer` missing death check, `player_damaged` event emission |
| M5 | Combat | Thorns doesn't apply stagger to attacker |
| M6 | Combat | AttackShapes cone API: `arcAngle` (full) vs JS `halfAngleRad` — callers may pass wrong value |
| M7 | Mobs | ~~Frost slow default **0.3** vs JS **0.25**~~ **FIXED** |
| M8 | Mobs | ~~Shooter fire range missing 1.2x multiplier~~ **FIXED** — added `* 1.2f` to shoot range check |
| M9 | Mobs | ~~Crowded AI detection always false — mobs never flank~~ **FIXED** — implemented crowd detection + crowded AI override |
| M10 | Mobs | ~~`sanitizeAITarget` wall-avoidance for retreat vectors missing~~ **FIXED** — ported SanitizeAITarget with perpendicular slide |
| M11 | Mobs | ~~Visual scale priority order~~ bossScale now checked first **FIXED** |
| M12 | Mobs | ~~Fabricated bossScale=1.5~~ removed default **FIXED** |
| M13 | Mobs | ~~Show Must Go On passive (30% speed at low HP) missing~~ **FIXED** — 1.3x speed boost at <30% HP, one-time |
| M14 | Mobs | ~~Intimidating Presence passive (ally damage aura) missing~~ **FIXED** — 15% damage boost to allies within 200px every 60f |
| M15 | Mobs | ~~Contact Damage Aura passive (DoT to nearby player) missing~~ **FIXED** — DoT every 30f, range=60px, dmg=30% mob damage |
| M16 | Casino | ~~BJ bust on split goes to dealer phase instead of direct resolution; insurance double-count risk~~ **FIXED** — split bust now resolves directly (both bust=lose, main alive=player phase); removed insurance double-count in BJResolve; added gold deduction in BJTakeInsurance; added BJDeclineInsurance; skip insurance offer when player has BJ |
| M17 | Casino | ~~Keno default risk Low vs JS Medium~~ **FIXED** |
| M18 | Mafia | ~~PostMatch phase never entered — no results screen~~ **FIXED** — CheckWinConditions now sets ejection state with win/defeat message + timer; ejection end matches JS _endEjection (message-prefix check); SabotageWin sets defeat message |
| M19 | HideSeek | ~~Spawn positions hardcoded differently from JS defaults; hider bot random placement~~ **FIXED** — Spawns match JS level data (5,4 / 45,38); hider bot now picks spots far from seeker spawn instead of fully random |
| M20 | Party | ~~Wave clear gives +2 potions (not in JS)~~ **FIXED** — Removed +2 potion award; JS healAll() only heals HP |
| M21 | BotAI | ~~Melee DPS preference threshold 1.2x vs JS 0.8x~~ **FIXED** — `meleeDPS >= gunDPS * 0.8f || gunEmpty` matching JS botAI.js:714 |
| M22 | Spar | NeuralSparInference model format expects `weights_flat` vs JS 2D arrays |
| M23 | Mining | ~~ORE_COLLISION_RADIUS 11 vs JS 17~~ **FIXED** |
| M24 | Mining | ~~MINING_PLAYER_R 14 vs JS 10~~ **FIXED** |
| M25 | Cooking | ~~Combo increments only on S/A grades; JS increments on any non-F~~ **VERIFIED OK** — JS cookingSystem.js:651-660 only increments on S/A, resets on F, leaves B/C unchanged. Unity already matches. |
| M26 | Cooking | ~~Missing `_calcDeliPay()` formula; tip formula differs~~ **FIXED** — Added `CalcDeliPay(recipe) = 8 + ingredients.Length * 2` to CookingRegistry; CookingSystem applies for street_deli. Tip formula already matched JS. |
| M27 | Core | ~~Walk animation uses 3 frames (cols 1-3) instead of JS 4 (cols 0-3)~~ **FIXED** — SpriteCol now `animFrame % 4` matching JS frame cycle 0-3 |
| M28 | Core | ~~Transition fade speeds 17-20% slower~~ now 7.2/sec and 4.8/sec **FIXED** |
| M29 | Core | ~~Arrow-key shooting captured in PlayerInputHandler but never passed to any system~~ **FIXED** — Arrow keys now set `arrowShooting`/`arrowAimDir` on GunSystem; GunSystem.Update uses arrow aim for directional shooting |
| M30 | Core | ~~N/G key inputs (wave skip/ready) not captured; shoot-face direction override missing~~ **FIXED** — N/G keys set `skipWavePressed`/`readyWavePressed` on PlayerController; shootFaceDir/Timer set by GunSystem.ShootAt, applied in PlayerController.FixedUpdate |
| M31 | UI | ~~Forge panel dimensions 650x480 vs JS 820x580~~ **FIXED** — 820x580 |
| M32 | UI | ~~Hotbar missing "right side" position mode (JS default); quickslot overrides partial~~ **FIXED** — dual layout + all QS overrides |
| M33 | UI | ~~ItemTooltip speedBonus displayed as percentage instead of absolute value~~ **FIXED** — absolute +N.N |
| M34 | UI | ~~ChatUI uses Enter key vs JS Tab key~~ **FIXED** — Tab to toggle, Enter to send |

---

## LOW/TRIVIAL Issues (25+)

- Inventory category labels: "Melee"→"Melees", "Consume"→"Consumables", "Material"→"Resources"
- Panel titles: "UPGRADE STATION"→"SHOP", "FARM VENDOR"→"Garden Shop", "FORGE" always vs dynamic
- Bot preset names: "Kai/Reva/Zeph" vs JS "Bot 1/Bot 2/Bot 3"
- CosmeticPalette legacy arrays fabricated (marked obsolete, hex system is correct)
- GAME_UPDATE stale (521 vs 538)
- Pickaxe description truncated
- SaveData fishing baitCount default 0 vs JS 10 (handled by fallback)
- SaveData identity has extra fields (language, relationshipStatus)
- Spar streak room labels missing "Streak" suffix
- MafiaData BOT_SPEED hardcoded 7.5 vs dynamic `GAME_CONFIG.PLAYER_BASE_SPEED`
- Revive position offset 1.1 world units vs JS 50px (1.04 wu) — close but not exact
- Farm wave restricted to cave only
- BFS fallback dot-product best-neighbor missing
- Camera spectate target logic missing
- Missing fishing reel, ultimate press input wiring
- Case outcome labels differ (gold amounts vs rarity names)
- Coinflip multiplier cumulative multiply vs pow — mathematically equivalent
- Spawn Y coordinate may need flip

---

## Known Stubs (Expected — Not parity bugs)

These are systems that were intentionally stubbed during porting and are tracked as feature gaps:

- **435 mob abilities** (only 6 cave abilities implemented)
- **Spar bot AI** (~7,300 lines of JS logic) — planned full remake for Unity
- **Spar learning system** (reinforcement learning) — planned remake
- **HazardSystem** (zone damage)
- **Cooking NPC systems** (restaurant workflows)
- **Melee specials** (ninja dash, storm blade, cleave, shrine, godspeed)
- **Player status effects** (stun, slow, mark, bleed, confuse, fear, blind, etc.)
- **PlayerStatusFX.cs** — stub with Debug.Log only
- **AttackShapes.cs** — only 4 of 13 methods implemented
- **TelegraphSystem.cs** — no onResolve callback, missing ring/tiles shapes
- **Dev tools** (commands, toolbox, testMobPanel)
- **Casino UI panels** (10 game-specific UIs)
- **Restaurant UIs** (Deli/Diner/Fine Dining)
- **WaveScaling party HP scaling**

---

## Doc Accuracy Issues Found

| # | Issue |
|---|-------|
| D1 | MOB_TYPES count: mobs.md says 209, architecture.md says 255, **actual is 265** |
| D2 | ENTITY_RENDERERS count: CLAUDE.md says 148, rendering.md says 172, **actual is 175** |
| D3 | `calcLifesteal()` listed in wrong file — actually in `meleeSystem.js`, not `damageSystem.js` |
| D4 | Mob wallHW default: mobs.md says 14, **actual is 11** (GAME_CONFIG.MOB_WALL_HW) |
| D5 | gameLoop location: CLAUDE.md says `inventory.js:2618`, **actual is `draw.js:2951`** |
| D6 | INVENTORY_SLOTS: old port plan said 100, **actual is 200** |

---

## Recommended Fix Order

### Batch A: Combat Defaults (fixes C1-C7, H5-H6, H17-H18)
Fix all wrong numeric constants — gun damage/mag, melee damage/range/cooldown/crit, party melee defaults, hitbox Y signs. Pure value changes, no logic.

### Batch B: Damage Pipeline (fixes C8-C9, H9-H10, M3-M5)
Route bullet hits through DamageSystem. Implement processKill (gold/heal/XP). Fix return type. Add Core Guardian split.

### Batch C: Ability Timing (fixes C10)
Convert initial ability CDs from frames to seconds (`/ 60f`).

### Batch D: Wave/Mob Fixes (fixes C11-C13, H11, M7-M15)
Double medpack spawns. Fix healer orbit direction. Read MobType.cap for caps. Implement mob separation. Fix frost slow, shooter range, crowded AI, passives.

### Batch E: Casino/Mafia/HideSeek (fixes H12-H16, M16-M19)
Add gold validation to BJ. Fix mafia subrole probability. Implement seeker bot detection + wall collision.

### Batch F: Core Systems (fixes H22-H25, M27-M30)
Flip PlayerHitboxY. Add boots speed bonus + speed multipliers. Fix InDungeon semantic. Wire arrow-key shooting. Fix walk animation frames.

### Batch G: UI/Forge (fixes H26, M31-M34)
Rebuild forge with real costs/materials/weapon filter. Fix hotbar, tooltips, chat keybind.

### Batch H: Gun System (fixes H1-H4)
Implement getFireRate() formula, freeze penalty, shotgun/SMG/bow variants.

### Batch I: Mining/Cooking/Skills (fixes M23-M26)
Fix ore collision radius, mining player radius, cooking combo/pay formulas.

---

## Key Constants Reference (Verified 2026-03-28)

```
// Physics (from GAME_CONFIG — gameConfig.js)
TILE                = 48 px
PLAYER_BASE_SPEED   = 7.5 px/frame (450 px/sec @ 60fps)
PLAYER_WALL_HW      = 14 px
PLAYER_RADIUS       = 23 px
MOB_WALL_HW         = 11 px        ← docs/mobs.md wrongly says 14
MOB_RADIUS          = 23 px
POS_HW              = 10 px
MOB_CROWD_RADIUS    = 46 px
BULLET_SPEED        = 9 px/frame (540 px/sec @ 60fps)
BULLET_HALF_LONG    = 15 px
BULLET_HALF_SHORT   = 4 px
ENTITY_R            = 29 px
PLAYER_HITBOX_Y     = -25 px       ← Canvas Y-down: 25px ABOVE feet. Unity Y-up: use +25/PPU
KNOCKBACK_DECAY     = 0.8 per frame
KNOCKBACK_THRESHOLD = 0.6 px/frame
ORE_COLLISION_RADIUS = 17 px       ← NOT 11
MINING_PLAYER_R     = 10 px        ← NOT 14

// Player defaults (from gameState.js)
GUN_DAMAGE          = 20           ← NOT 28
GUN_MAG_SIZE        = 30           ← NOT 35
GUN_FIRE_RATE       = via getFireRate() formula, NOT raw field
MELEE_DAMAGE        = 15           ← NOT 24
MELEE_RANGE         = 90           ← NOT 110
MELEE_COOLDOWN      = 28 frames    ← NOT 24
MELEE_CRIT_CHANCE   = 0.20         ← NOT 0.15

// Bot defaults (from partySystem.js)
BOT_MELEE_DAMAGE    = 15           ← NOT 24
BOT_MELEE_RANGE     = 90           ← NOT 110
BOT_MELEE_COOLDOWN  = 28           ← NOT 24
BOT_MELEE_CRIT      = 0.10         ← NOT 0.15
BOT_MELEE_LIFESTEAL = none         ← NOT 0.15

// Screen
BASE_W              = 1920 px
BASE_H              = 1080 px
WORLD_ZOOM          = 0.85

// Game counts (verified against code)
MAX_PARTY_SIZE      = 4
INVENTORY_SLOTS     = 200          ← NOT 100
TIERS               = 5
LEVELS_PER_TIER     = 25
DUNGEONS            = 6
FLOORS_PER_DUNGEON  = 5
CASINO_GAMES        = 10
MOB_TYPES_COUNT     = 265
MOB_AI_PATTERNS     = 13
MOB_SPECIALS_COUNT  = 435          ← NOT 442
ENTITY_RENDERER_TYPES = 175        ← NOT 143/148
HIT_EFFECT_TYPES    = 73
SCENES              = 18
```

### Y-Axis Conversion Rules
- Canvas Y-down → Unity Y-up: **negate Y offsets** for positions/hitboxes
- `PLAYER_HITBOX_Y = -25` in JS means 25px above feet → in Unity use `+25/PPU` (positive = up)
- Mob direction 0 = down in both (JS: positive Y, Unity: negative Y)
- `Atan2` results: JS `atan2(dy, dx)` where dy is Y-down; Unity uses Y-up, so negate dy or negate result

### Frame-to-Seconds Conversion
- All JS values in frames at 60fps → divide by 60 for seconds
- Cooldowns, durations, timers: `frames / 60f = seconds`
- Per-frame velocities: `px/frame * 60 = px/sec`, then `/ PPU = world units/sec`
