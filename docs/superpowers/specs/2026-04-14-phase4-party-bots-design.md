# Phase 4: Party + Bots — Design Spec

**Date:** 2026-04-14
**Status:** Active
**Phase:** 4 of 10
**GDD Source:** `docs/gdd/party-bots-spar.md` (Party System + Bot AI sections only)
**JS Sources:** `js/authority/partySystem.js` (369 lines), `js/authority/botAI.js` (976 lines), `js/shared/partyData.js`

## Goal

3 AI bots fight alongside the player in dungeons. Each bot has independent HP, gold, equipment, potions, and a 5-state FSM. Bots buy their own gear, dodge telegraphs, and die/revive independently.

**Exit gate:** Enter dungeon with 3 bots → bots fight mobs → see party status HUD → bot dies → revive shop between waves → revive → continue → complete dungeon.

---

## Architecture

PartySystem is a **data layer**, not an event system. It stores state (members[], gold wallets, timers) and provides getters/setters. Other systems (damage, waves, mobs, shops) read from it and call methods on it.

**Core principle:** Bots are PartyMembers with the same data structure as the player. Every combat path (damage, healing, knockback, contact damage, melee arcs) works on any entity — player or bot.

### New Scripts (8)

| Script | Responsibility |
|--------|----------------|
| `PartyData.cs` | Static PARTY_CONFIG constants + BOT_PRESETS cosmetic arrays |
| `PartyMember.cs` | Data class per member — entity state, gun, melee, equip, gold, potion, ai, grab, lives, death timers |
| `PartySystem.cs` | Singleton — members[], init/reset, gold wallets, target helpers, death/revive, wave scaling, spectate |
| `BotAI.cs` | Per-frame FSM (hunt/engage/flee/shop/roam), telegraph dodge, ultimate activation stubs, target selection |
| `BotController.cs` | AABB movement (same as PlayerController), knockback, bot-to-bot separation, dash movement, animation |
| `BotShopLogic.cs` | Equipment purchase priority, buff purchase priority, per-bot `_shopBought[]`, `_applyEquipment()` |
| `PartyHUD.cs` | Bot HP bars, revive shop panel, spectate overlay, party status |
| `StatusFXStub.cs` | Minimal interface: `TickEntity()` returns rooted/stunned/feared/speedMult. No effects until Phase 5. |

### Modified Scripts (8)

| Script | Changes |
|--------|---------|
| `DamageSystem.cs` | Add `DealDamageToBot()`, extend `ProcessKill()` for ownerId-based gold routing + party lifesteal |
| `MobManager.cs` | Mob targeting via `PartySystem.GetMobTarget()`, contact damage checks bots, body-blocking includes bots |
| `WaveSystem.cs` | Multiply mob count/HP by party scaling, wave clear calls `PartySystem.HealAll()` |
| `GameBootstrap.cs` | Create PartySystem singleton on CombatManager GO |
| `BulletManager.cs` | Add `ownerId` string field to bullet struct |
| `MeleeSystem.cs` | Expose `HitMobsInArc()` as public static, add `TickDashMovement()` as public static |
| `CameraFollow.cs` | Spectate mode — follow `PartySystem.GetSpectateTarget()` when player dead |
| `GameSceneManager.cs` | Dungeon entry → `PartySystem.Init()`, floor advance → `OnFloorAdvance()`, exit → `Reset()` |

---

## PartyData.cs — Constants

All values from `js/shared/partyData.js` with exact citations.

```
PARTY_CONFIG:
  MAX_SIZE             = 4          // js/shared/partyData.js:6
  REVIVE_BASE_COST     = 50         // js/shared/partyData.js:7  (× dungeonFloor)
  REVIVE_SHOP_DURATION = 10f        // js/shared/partyData.js:8  (600 frames / 60)
  BOT_HP_MULT          = 3f         // js/shared/partyData.js:9
  BOT_SHOOT_CD_MULT    = 4          // shoot CD = (fireRate || 5) * 4 frames → / 60 for seconds
  BOT_MELEE_CD_DEFAULT = 0.4f       // (24 frames / 60) js/shared/partyData.js:12
  BOT_FOLLOW_MIN       = 80f        // js/shared/partyData.js:13
  BOT_FOLLOW_MAX       = 150f       // js/shared/partyData.js:14
  BOT_ENGAGE_RANGE     = 250f       // js/shared/partyData.js:15
  BOT_FLEE_THRESHOLD   = 0.15f      // js/shared/partyData.js:16
  BOT_EFFECTIVE_RANGE  = 140f       // js/shared/partyData.js:17
  BOT_SEPARATION_DIST  = 60f        // js/shared/partyData.js:18
  BOT_SPREAD_RADIUS    = 70f        // js/shared/partyData.js:19
  MOB_RETARGET_INTERVAL = 0.5f      // js/shared/partyData.js:20 (30 frames / 60)
  MOB_COUNT_SCALE       = 1.0f      // js/shared/partyData.js:21 (per extra member)
  MOB_HP_SCALE          = 0.5f      // js/shared/partyData.js:22 (per extra member)

Death/Respawn (shared with player):
  DEATH_ANIM_SEC       = 0.667f     // 40 frames / 60
  RESPAWN_COUNTDOWN_SEC = 3f        // 180 frames / 60

Default Bot Gun (Sidearm):
  damage = 28, fireRate = 5, magSize = 35, special = null

Default Bot Melee (Combat Blade):
  damage = 15, range = 90, cooldownMax = 28 frames (0.467s), critChance = 0.10
  knockback = 5.04, arcAngle = PI * 0.8 (144°)

Default Bot Potion:
  count = 3, cooldownMax = 2f (120 frames / 60), healAmount = 25

Bot spawn offset:
  x = player.x + slotIndex * 50
  y = player.y + 30 (Unity: player.y - 30 due to Y-up)
```

### BOT_PRESETS (3 cosmetic presets, indices 1-3)

Each preset defines: skin, hair, shirt, pants, eyes, shoes, hat colors. Copied from `js/shared/partyData.js` BOT_PRESETS array. Index 0 is null (player slot).

---

## PartyMember.cs — Data Class

Mirrors JS `createPartyMember()` at `js/authority/partySystem.js:22-108`.

```csharp
public class PartyMember
{
    // Identity
    public string id;           // "player" or "bot_1", "bot_2", "bot_3"
    public int slotIndex;       // 0-3
    public string name;         // "Player" or "Bot 1"/"Bot 2"/"Bot 3"
    public string controlType;  // "local" or "bot"

    // Entity state (position, HP, physics)
    public float x, y;
    public float vx, vy;
    public float knockVx, knockVy;
    public float speed, baseSpeed;
    public int hp, maxHp;
    public int dir;             // 0=down, 1=up, 2=left, 3=right
    public int frame;           // animation frame
    public float animTimer;
    public bool moving;
    public float radius;        // PLAYER_RADIUS = 23
    public float contactCD;     // per-entity contact cooldown
    public bool isBot;          // true for slots 1-3

    // Death state
    public bool dead;
    public float deathTimer;    // seconds
    public float respawnTimer;  // seconds
    public float deathX, deathY;
    public float deathRotation;
    public bool reviveUsed;     // one-time auto-revive from chest armor
    public int lives;
    public bool active;

    // Gun state (independent per member)
    public string gunId;
    public string gunName;
    public int gunTier;
    public int gunDamage;
    public int gunFireRate;     // raw JS value (frames)
    public int gunMagSize;
    public int gunAmmo;
    public bool gunReloading;
    public float gunReloadTimer;
    public float gunFireCooldown;
    public string gunSpecial;
    public string gunBulletColor;
    public float gunRecoilTimer;

    // Melee state (independent per member)
    public int meleeDamage;
    public float meleeRange;
    public float meleeCooldown;
    public float meleeCooldownMax;
    public float meleeCritChance;
    public string meleeSpecial;
    public float meleeKnockback;
    public float meleeArcAngle;
    // Dash fields (ninja)
    public bool dashActive;
    public bool dashing;
    public float dashTimer;
    public float dashDuration;   // 14 frames / 60 = 0.233s
    public float dashSpeed;      // 21.85 px/frame * 60 = 1311 px/s
    public float dashDirX, dashDirY;
    public int dashesLeft;
    public float dashChainWindow;
    public float dashCooldown;
    public float dashCooldownMax; // 240 frames / 60 = 4s
    public float dashGap;

    // Equipment (independent per member)
    public ItemData.EquipData equippedGun;
    public ItemData.EquipData equippedMelee;
    public ItemData.EquipData equippedBoots;
    public ItemData.EquipData equippedPants;
    public ItemData.EquipData equippedChest;
    public ItemData.EquipData equippedHelmet;

    // Economy (independent per member)
    public int gold;

    // Potion (independent per member)
    public int potionCount;
    public float potionCooldown;
    public float potionCooldownMax;
    public int potionHealAmount;

    // AI state (null for player)
    public BotAIState ai;

    // Grab state
    public bool grabActive;
    public float grabTimer;
    public float grabCooldown;

    // Shop tracking (per-bot purchase counts)
    public int[] shopBought;    // indexed by buff/equip type
    public int lifestealPerKill;

    // Cosmetics
    public int skin, hair, shirt, pantsColor, eyes, shoes, hat;
}

public class BotAIState
{
    public string state;        // "hunt", "engage", "flee", "shop", "roam"
    public MobInstance target;
    public float targetAge;     // seconds since last retarget
    public float shootCD;       // seconds
    public float meleeCD;       // seconds
    public float shopCD;        // seconds between purchases
    public float strafeTimer;   // seconds until strafe flip
    public int strafeDir;       // 1 or -1
    public float roamX, roamY;  // roam destination
    public float roamAge;       // seconds since roam target picked
    public float fxSpeedMult;   // from status effects (1.0 default)
}
```

**Slot 0 (player):** PartyMember wraps references to existing singletons. `gold` reads/writes `CombatState.Instance.gold`. Gun/melee/equip read from `CombatState.Instance` and `InventorySystem.Instance`. No duplication — just aliased access.

**Slots 1-3 (bots):** Own all state independently. No singletons.

---

## PartySystem.cs — Singleton Data Layer

Mirrors `js/authority/partySystem.js` line-for-line.

### State

```
PartyState:
  bool active
  List<PartyMember> members       // slot 0 = player, 1-3 = bots
  string localPlayerId = "player"
  bool shopOpen                   // revive shop active between waves
  PartyMember spectateTarget      // camera target when player dead
```

### Public API

```
Init(int slotCount)               // Create player + bots on dungeon entry
Reset()                           // Clear all state on dungeon exit
GetAliveEntities() → List<PartyMember>
GetAliveCount() → int
GetAlive() → List<PartyMember>
AllDead() → bool
GetNearestTarget(float x, float y) → PartyMember   // For mob AI
GetMobTarget(MobInstance mob) → PartyMember         // Sticky targeting
GetLocalMember() → PartyMember
GetMemberById(string id) → PartyMember
AddGold(string memberId, int amount)                // Route to correct wallet
GetGold(string memberId) → int
SpendGold(string memberId, int amount) → bool
HandleMemberDeath(PartyMember member)               // Auto-revive check, death state, game over
ReviveMember(PartyMember member) → bool             // Gold charge, heal, reposition
HasRevivable() → bool
OnFloorAdvance()                                    // Auto-respawn dead with lives
HealAll()                                           // Wave clear full heal
GetSpectateTarget() → PartyMember                   // Nearest alive bot
GetMobCountScale() → float                          // 1 + (total-1) × 1.0
GetMobHPScale() → float                             // 1 + (total-1) × 0.5
```

### Key Behaviors

**Init (js/authority/partySystem.js:111-127):**
- Slot 0: wrap player globals (CombatState, gun, melee, equip, gold, potion, lives)
- Slots 1-N: create fresh PartyMember with BOT_PRESETS cosmetics, default gun/melee/potion
- Bot HP = `Round(player.maxHp * BOT_HP_MULT)` (3×)
- Bot position = player.x + slotIndex×50, player.y - 30 (Unity Y-up)

**HandleMemberDeath (js/authority/partySystem.js:251-278):**
1. Check chest armor auto-revive: `HasRevive(member.equippedChest)` AND `!member.reviveUsed`
   - If yes: `reviveUsed = true`, hp = 30% maxHp, emit "REVIVE!" effect, return
2. `member.dead = true`, `member.lives--`
3. `deathTimer = DEATH_ANIM_SEC`, `respawnTimer = RESPAWN_COUNTDOWN_SEC`
4. Store deathX/deathY, deathRotation = 0
5. Clear status effects
6. If `AllDead()` and member is local player → game over

**ReviveMember (js/authority/partySystem.js:281-306):**
- Cost: `REVIVE_BASE_COST × dungeonFloor` from member's own gold
- Heal to maxHp, clear dead/status, reposition near player

**Wave Scaling (js/authority/partySystem.js:357-368):**
- Uses `members.Count` (TOTAL, not alive) — scaling doesn't change mid-wave
- Mob count: `1 + (total - 1) × 1.0` → 2× at duo, 3× at trio, 4× at quad
- Mob HP: `1 + (total - 1) × 0.5` → 1.5× at duo, 2× at trio, 2.5× at quad

**Sticky Mob Targeting (js/authority/partySystem.js:176-184):**
- Each mob caches `_partyTarget` (PartyMember reference)
- Retarget when: target dead OR `targetAge >= MOB_RETARGET_INTERVAL` (0.5s)
- Pick nearest alive entity to mob position

**Gold Routing:**
- Slot 0 (player): reads/writes `CombatState.Instance.gold`
- Slots 1-3 (bots): reads/writes `member.gold` (independent wallet)
- Kill gold → goes to killer identified by bullet `ownerId`

---

## BotAI.cs — FSM & Combat

Mirrors `js/authority/botAI.js` (976 lines).

### Tick Order (per alive bot, per frame)

1. Decrement cooldowns: shootCD, meleeCD, contactCD
2. Tick ninja dash (if dashActive — overrides all other AI, early return)
3. Apply knockback with AABB collision (PLAYER_WALL_HW = 14)
4. Tick gun reload (reload time from gun data)
5. Tick potion: auto-use when `hp/maxHp < 0.4` AND count > 0 AND cooldown <= 0
6. Tick StatusFX: query `StatusFXStub.TickEntity()` → rooted/stunned = skip actions, feared = random walk
7. Telegraph dodge check (highest priority — still shoots during dodge)
8. Ultimate activation stubs (shrine/godspeed — null-check, no-op until Phase 7)
9. Smart target selection: prefer low-HP (<25%) mobs within 1.5× nearest distance
10. FSM state transitions + dispatch

### FSM States

**Transitions (js/authority/botAI.js:206-224):**
```
if hp/maxHp < 0.15 AND mob within 150px → FLEE
else if mob within 250px → ENGAGE (set target)
else if mob exists → HUNT (set target)
else if waveState ∈ {cleared, waiting, revive_shop} → SHOP
else → ROAM
```

**HUNT (js/authority/botAI.js:684-700):**
- Move toward mob with per-slot angular spread (35px offset)
- No shooting (out of range)

**ENGAGE (js/authority/botAI.js:701-788):**
- Melee vs gun decision: `meleeDPS = damage/cooldown` vs `gunDPS = damage/(fireRate*4/60)`
  - Prefer melee if `meleeDPS >= 0.8 × gunDPS` OR gun empty
- Melee-focused: rush into meleeRange - 10, strafe when in range
- Gun-focused: maintain BOT_EFFECTIVE_RANGE band [range-30, range+20]
  - Move toward if too far, move away if too close, strafe if in band
- Shoot when: gun exists, not reloading, ammo > 0, shootCD <= 0
- Melee when: in range, meleeCD <= 0
- Ninja dash when: special == "ninja", dist < meleeRange × 1.5, dashCooldown <= 0
- Grab when: dist < 60, mob maxHp > 200 OR hp/maxHp > 0.5 (stub — no grab system yet)
- Strafe: perpendicular movement, flip direction every 60-120 frames, speed × 0.5

**FLEE (js/authority/botAI.js:819-848):**
- Move toward shop station (984, 792) at speed × 0.8
- Still shoots at threatening mob while fleeing
- Transition out when: reached shop OR HP recovered

**SHOP (js/authority/botAI.js:406-437):**
- Walk to shop station (984, 792)
- Within 60px: attempt `_tryBuyEquipment()`, then `_tryBuyBuff()`
- 45-frame (0.75s) cooldown between purchases
- 60-frame (1s) cooldown on failure → transition to ROAM

**ROAM (js/authority/botAI.js:655-682):**
- Pick random point every 2s (120 frames) or when reached (dist < 15)
- Distance: 80-230px from current position
- Random angle: 0 to 2π

### Combat Execution

**botShoot (js/authority/botAI.js:931-954):**
- Bullet spawns at (bot.x, bot.y + 10) (Unity Y-up: +10 not -10)
- Direction: normalized vector toward mob
- Damage: `member.gunDamage`
- Speed: `BULLET_SPEED` (540 px/s)
- ownerId: `member.id`
- shootCD = `(fireRate || 5) * 4 / 60` seconds

**botMelee (js/authority/botAI.js:956-969):**
- Calls shared `MeleeSystem.HitMobsInArc(botPos, aimAngle, damage, range, arcAngle/2)`
- swingDir = `Atan2(mob.y - bot.y, mob.x - bot.x)`
- meleeCD = `meleeCooldownMax`

**Bot Reload (js/authority/botAI.js:145-153):**
- When ammo <= 0: set reloading, reloadTimer = 90 frames / 60 = 1.5s
- On complete: ammo = magSize, reloading = false

**Potion (js/authority/botAI.js:155-161):**
- Calls shared `UsePotionEntity(member)` — heals member.potionHealAmount, decrements count, sets cooldown

### Telegraph Dodging (js/authority/botAI.js:285-404)

Checks all active telegraphs (TelegraphSystem.active). 5 shape types:
- **Circle**: dodge away if dist < radius + 20px margin
- **Line**: dodge perpendicular if dist_to_line < width/2 + 20px
- **Cone**: dodge away if within range+20 AND angle+0.1rad
- **Ring**: dodge outward/inward based on position relative to mid-radius ± 20px
- **Tiles**: dodge away from tile center if on danger tile

Dodge speed: `speed × 1.2`. Can still shoot during dodge. Returns true to override normal FSM.

**Phase 4 note:** No telegraphs exist yet (Phase 5). Stub checks empty list, never triggers. Architecture ready.

### Separation (js/authority/botAI.js:850-872)

Push bots apart when closer than BOT_SEPARATION_DIST (60px):
- Force: `(threshold - dist) / threshold × 3`
- Applied to both bots in pair
- Checked against all PartyState.members (skip dead/inactive)

### Dead Bot Tick (js/authority/botAI.js:30-61)

1. Rotate deathRotation toward π/2 over DEATH_ANIM_SEC (0.667s)
2. When death anim complete AND lives > 0: start respawnTimer (3s)
3. When respawnTimer hits 0: hp = maxHp, teleport to random alive member ±40px, clear dead state

---

## BotController.cs — Movement

Same AABB sliding collision as `PlayerController.cs`, driven by AI steering instead of WASD input.

**Movement (mirrors js/authority/botAI.js:875-911):**
- `MoveToward(targetX, targetY)`: normalize direction, apply speed × fxSpeedMult × dt, 4-corner AABB, wall-slide recovery on corner block
- `MoveAway(fromX, fromY)`: opposite direction at 70% speed
- Collision uses `PLAYER_WALL_HW = 14` (NOT MOB_WALL_HW = 11)

**Dash Movement (mirrors js/core/meleeSystem.js `_tickDashMovement`):**
- `TickDashMovement(member)`: if dashing, move at dashSpeed in dashDir, check walls, decrement dashTimer
- On dash end: dashGap = 3 frames, dashChainWindow starts counting
- Exposed as public static so player can use it later (Phase 7)

**Knockback (mirrors js/authority/botAI.js:97-110):**
- Apply knockVx/knockVy with AABB wall check
- Decay: `× KNOCKBACK_DECAY (0.8)` per frame
- Clear when < `KNOCKBACK_THRESHOLD (0.6)`

**Animation (mirrors js/authority/botAI.js:239-248):**
- 4-frame walk cycle, advance every 8/60 seconds
- Direction: 0=down(−Y), 1=up(+Y), 2=left(−X), 3=right(+X)
- Face target: compare |dx| vs |dy|, pick dominant axis

---

## BotShopLogic.cs — Purchase AI

Mirrors `js/authority/botAI.js:406-653`.

### Shop Position
```
// Don't hardcode — read from ShopStation.Instance.transform.position
// ShopStation already handles Y-conversion (tile 20,16 → world coords)
// Bots navigate to ShopStation.Instance.transform.position
```

### Equipment Purchase Priority (js/authority/botAI.js:442-478)

Order: Guns → Melees → Chest → Pants → Boots → Helmets

For each category:
1. Find current tier (`member.equippedGun.tier || 0`)
2. Find next tier item from `ItemData.GUN_TIERS[currentTier]`
3. Check wave requirement: `WaveSystem.Instance.GetGlobalWave() >= item.waveReq`
4. Check gold: `member.gold >= item.cost`
5. Purchase: deduct gold, call `_applyEquipment(member, slot, item)`

### _applyEquipment (js/authority/botAI.js:494-563)

- **Gun**: Create new gun state, preserve accumulated damage buffs (`_baseDamage` tracking), sync `member.equippedGun = data`
- **Melee**: Create new melee state, preserve damage buffs, sync `member.equippedMelee = data`
- **Boots**: Set `member.speed = member.baseSpeed + ItemData.GetBootsSpeedBonus(data)`
- **Chest**: Increase maxHp by `(newBonus - oldBonus)`, heal proportionally
- **Pants/Helmet**: Store as equip data (stat helpers read from equip)

### Buff Purchase Priority (js/authority/botAI.js:565-653)

BUFF_PRIORITIES: `[0, 1, 4, 5, 3]` → Gun Dmg +3, Melee Dmg +3, Lifesteal +5, Party Lifesteal, Potion

**Dynamic priority:** If hp/maxHp < 0.7, move Potion (index 3) to top.

**Per-buff logic:**
| Index | Buff | Base Cost | Price Increase | Max Buy | Effect |
|-------|------|-----------|---------------|---------|--------|
| 0 | Gun Damage +3 | 15 | 8 | ∞ | `member.gunDamage += 3` |
| 1 | Melee Damage +3 | 15 | 9 | ∞ | `member.meleeDamage += 3` |
| 2 | Melee Speed | 20 | 11 | 6 | `meleeCooldownMax = Max(10/60, cooldownMax - 2/60)` |
| 3 | Health Potion | 15 | 4 | ∞ | `member.potionCount++` |
| 4 | Lifesteal +5 | 10 | 4 | 10 | `member.lifestealPerKill += 5` (base 25) |
| 5 | Party Lifesteal | 80 | 60 | 4 | Split cost from all members, global effect |

Cost formula: `baseCost + shopBought[index] × priceIncrease`

Purchase cooldown: 0.75s (45 frames) on success, 1s (60 frames) on failure.

---

## DamageSystem.cs — Modifications

### New: DealDamageToBot(PartyMember bot, int damage, string source)

Mirrors `DealDamageToPlayer()` but targets a bot:
1. Dodge check: `ItemData.GetDodgeChance(bot.equippedBoots)` → random < chance → miss
2. Armor reduction: `ItemData.GetArmorReduction(bot.equippedPants, bot.equippedChest)` (capped 50%)
3. Projectile reduction (if source == "projectile"/"aoe"): `ItemData.GetProjReduction(bot.equippedPants)`
4. DOT bypasses armor (if source == "dot")
5. `bot.hp -= finalDamage`
6. If hp <= 0: `PartySystem.Instance.HandleMemberDeath(bot)`
7. Set `bot.contactCD = 0.5f` (30 frames / 60) for contact hits

### Modified: ProcessKill()

Currently: gold → player, heal → player, ammo refill → player.

New behavior:
1. Determine killer via bullet `ownerId` → `PartySystem.GetMemberById(ownerId)`
2. Gold → killer's wallet: `PartySystem.AddGold(killer.id, goldAmount)`
3. Heal → killer only (source-based multiplier × heal boost from chest)
4. Ammo refill → killer only (if gun kill)
5. **Party lifesteal:** If `ShopSystem.Instance.partyLifesteal > 0`, heal ALL alive members by partyLifesteal amount
6. `WaveSystem.Instance.OnMobKilled()` (unchanged — counts for phase advance regardless of killer)

---

## MobManager.cs — Modifications

### Mob Targeting

Replace direct player targeting with party-aware targeting:

```csharp
// OLD: target = player
// NEW:
PartyMember target = PartySystem.Instance.GetMobTarget(mob);
```

Sticky targeting with `mob._partyTarget` cached reference, retarget every 0.5s or when target dead.

### Contact Damage Loop

Currently only checks player. Add bot loop:

```csharp
// After player contact check:
foreach (var bot in PartySystem.Instance.GetAlive())
{
    if (bot.isBot && bot.contactCD <= 0)
    {
        float dist = Vector2.Distance(mob.position, bot.position);
        if (dist < mob.contactRange)
        {
            DamageSystem.DealDamageToBot(bot, mob.damage, "contact");
            bot.contactCD = 0.5f; // 30 frames / 60
        }
    }
}
```

### Body Blocking

Add bot-to-mob body blocking (same push logic as player-to-mob):
- For each alive bot, push mob half-overlap distance when within `PLAYER_RADIUS + mob.radius`

---

## WaveSystem.cs — Modifications

### Mob Scaling

In `SpawnWave()`, multiply counts and HP:
```csharp
int scaledCount = Mathf.RoundToInt(baseCount * PartySystem.Instance.GetMobCountScale());
float hpMult = baseHPMult * PartySystem.Instance.GetMobHPScale();
```

### Wave Clear Heal

After wave clear (all mobs dead), call:
```csharp
PartySystem.Instance.HealAll();
```

---

## CameraFollow.cs — Spectate Mode

When player is dead:
```csharp
PartyMember spectateTarget = PartySystem.Instance.GetSpectateTarget();
if (spectateTarget != null)
    followTarget = new Vector3(spectateTarget.x, spectateTarget.y, 0);
```

Smooth follow same as player camera. Return to player camera on respawn.

---

## PartyHUD.cs — UI

### Bot Status Panel (top-left area)

For each bot member (slots 1-3):
- Name label ("Bot 1", "Bot 2", "Bot 3")
- HP bar (green fill, red background, same style as player HP)
- Gold counter
- Equipment tier dots (gun/melee/armor tier indicators)
- Dead overlay (grayed out with "DEAD" text, lives remaining)

### Revive Shop Panel

Triggered when `PartyState.shopOpen == true` (between waves, 10s duration):
- List dead members with lives > 0
- Show cost per member: `REVIVE_BASE_COST × dungeonFloor`
- Show member's gold balance
- Click to revive (calls `PartySystem.ReviveMember()`)
- Timer bar showing remaining shop duration

### Spectate Overlay

When player dead and spectating a bot:
- "Spectating: [Bot Name]" text at top
- Arrow indicator on followed bot

---

## GameSceneManager.cs — Integration

### Dungeon Entry
```csharp
PartySystem.Instance.Init(4); // always 4 (player + 3 bots)
```

### Floor Advance
```csharp
PartySystem.Instance.OnFloorAdvance(); // respawn dead with lives, reposition
```

### Dungeon Exit / Return to Lobby
```csharp
PartySystem.Instance.Reset(); // clear all party state
```

---

## BulletManager.cs — ownerId

Add `ownerId` field to bullet struct:
```csharp
public string ownerId; // "player" or "bot_1"/"bot_2"/"bot_3"
```

`SpawnBullet()` signature gains `string ownerId = "player"`.

On mob hit, pass ownerId to `DamageSystem.ProcessKill()` for gold routing.

---

## MeleeSystem.cs — Expose Shared Functions

### HitMobsInArc (public static)

Currently private, called only for player. Make public static:
```csharp
public static void HitMobsInArc(Vector2 origin, float aimAngle, int damage,
    float range, float halfArc, float knockback, float critChance, string ownerId)
```

Bots call this with their own stats. Same hit detection, same damage pipeline.

### TickDashMovement (public static)

New function for ninja dash movement:
```csharp
public static void TickDashMovement(PartyMember member, TileCollision walls)
```

Shared between player (future) and bots (now).

---

## StatusFXStub.cs — Minimal Interface

```csharp
public static class StatusFXStub
{
    public struct EntityStatus
    {
        public bool rooted;
        public bool stunned;
        public bool feared;
        public float speedMult; // 1.0 = normal
    }

    public static EntityStatus TickEntity(PartyMember member)
    {
        // Phase 5 will implement actual status effects
        return new EntityStatus { speedMult = 1f };
    }

    public static void ClearEntity(PartyMember member)
    {
        // Phase 5 implementation
    }
}
```

---

## Bot Rendering

Bots are rendered as colored squares (same as player Phase 0 placeholder) with:
- Distinct color per bot (from BOT_PRESETS)
- Direction indicator (small triangle showing facing)
- Name label above
- HP bar above name
- Death animation: rotate toward 90° over 0.667s, then fade
- Contact damage flash: alternate visibility every 80ms when contactCD > 0

Each bot gets a GameObject spawned by PartySystem.Init(), destroyed by PartySystem.Reset().

---

## Y-Axis Conversion Checklist

| JS Value | Unity Conversion | Where |
|----------|-----------------|-------|
| Bot spawn: `player.y + 30` | `player.y - 30` | PartySystem.Init() |
| Bullet Y offset: `e.y - 10` | `e.y + 10` | BotAI.botShoot() |
| Face direction: 0=down(+Y JS) | 0=down(−Y Unity) | BotController.FaceTarget() |
| Mob targeting Y | Already converted in MobManager | No change needed |
| Shop position Y: `16*48+24=792` | Convert via level data Y-flip | BotShopLogic |
| Roam/flee Y directions | Negate Y components | BotController movement |

---

## Integration Verification Checklist

Every integration point from the JS audit must be wired:

- [ ] `authorityTick` → BotAI.Tick() called each frame when party active
- [ ] `mobSystem` → getMobTarget() for mob AI targeting
- [ ] `mobSystem` → contact damage loop includes bots
- [ ] `mobSystem` → healAll() on wave clear
- [ ] `damageSystem` → handleMemberDeath() on lethal damage
- [ ] `damageSystem` → ProcessKill routes gold by ownerId
- [ ] `damageSystem` → party lifesteal heals all alive
- [ ] `waveSystem` → getMobCountScale/getMobHPScale for spawn scaling
- [ ] `sceneManager` → init/reset/onFloorAdvance calls
- [ ] `meleeSystem` → shared HitMobsInArc for bot melee
- [ ] `meleeSystem` → shared TickDashMovement for ninja dash
- [ ] `bulletManager` → ownerId on bullets
- [ ] `cameraFollow` → spectate mode when player dead
- [ ] `stateReset` → PartySystem.Reset() on death/lobby
- [ ] Bot potion → shared UsePotionEntity logic
- [ ] Bot separation → 60px push-apart
- [ ] Bot body blocking → mobs push bots same as player
- [ ] Bot knockback → same decay/threshold as player
- [ ] Bot rendering → visible GameObjects with color/direction/HP
- [ ] Bot HUD → HP bars, gold, equipment dots, death overlay
- [ ] Revive shop → between-wave UI, gold charge, heal/reposition
- [ ] Wave scaling uses TOTAL members (not alive)
- [ ] Auto-revive from chest armor (once per run, _reviveUsed flag)
- [ ] Dead bot tick → death rotation → respawn timer → auto-respawn

---

## What Phase 4 Does NOT Include

- **Mob abilities / telegraphs** — Phase 5 (StatusFXStub is architecture-only)
- **Ultimates (shrine/godspeed)** — Phase 7 (null-check stubs in BotAI)
- **Grab mechanic** — stub only (no grab system exists yet)
- **Sprite rendering** — Phase 4 uses colored squares (no drawChar/equipment visuals)
- **Spar/Mafia/HideSeek bots** — Phase 9
- **Save/load of party preferences** — bots are transient (created fresh each dungeon)
- **Bullet spread for bots** — minor parity detail, stub for now
