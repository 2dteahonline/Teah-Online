# Phase 4: Party + Bots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **MANDATORY RULE:** The JS game is the source of truth. READ the JS file before writing ANY C# code. Every value, formula, timer, and behavior must match JS line-for-line. Do not redesign, do not improve, do not skip "small" features. If JS has it, Unity has it.

**Goal:** 3 AI bots fight alongside the player in dungeons with independent HP, gold, equipment, and a 5-state FSM.

**Architecture:** PartySystem is a singleton data layer managing PartyMember[] (slot 0 = player, 1-3 = bots). BotAI runs a per-frame FSM. All combat paths (damage, heal, knockback) are entity-agnostic. Bots have independent gold wallets and buy their own equipment.

**Tech Stack:** Unity 6 (6000.4.0f1), 2D Built-in, C# scripts in `C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\Scripts\`

**Spec:** `docs/superpowers/specs/2026-04-14-phase4-party-bots-design.md`

**JS Sources:**
- `js/authority/partySystem.js` (369 lines) — party state, member lifecycle
- `js/authority/botAI.js` (976 lines) — bot FSM, combat, shop
- `js/shared/partyData.js` — constants, cosmetics

---

## File Map

### New Files (8)
| File | Purpose | ~Lines |
|------|---------|--------|
| `Assets/Scripts/PartyData.cs` | PARTY_CONFIG constants + BOT_PRESETS | ~80 |
| `Assets/Scripts/PartyMember.cs` | Data class per member | ~120 |
| `Assets/Scripts/PartySystem.cs` | Singleton — members[], targeting, death/revive, scaling | ~300 |
| `Assets/Scripts/BotAI.cs` | FSM + combat execution | ~500 |
| `Assets/Scripts/BotController.cs` | Movement, knockback, separation, dash, animation | ~200 |
| `Assets/Scripts/BotShopLogic.cs` | Equipment/buff purchasing AI | ~250 |
| `Assets/Scripts/PartyHUD.cs` | Bot HP bars, revive shop, spectate overlay | ~200 |
| `Assets/Scripts/StatusFXStub.cs` | Minimal status effect interface | ~30 |

### Modified Files (8)
| File | Changes |
|------|---------|
| `Assets/Scripts/DamageSystem.cs` | DealDamageToBot(), ProcessKill gold routing + party lifesteal |
| `Assets/Scripts/MobManager.cs` | Party targeting, contact damage to bots, body-blocking bots |
| `Assets/Scripts/WaveSystem.cs` | Party scaling, medpack pickup, revive shop trigger, chest regen |
| `Assets/Scripts/GameBootstrap.cs` | Create PartySystem singleton |
| `Assets/Scripts/BulletManager.cs` | Add ownerId to bullets |
| `Assets/Scripts/MeleeSystem.cs` | Expose HitMobsInArc as public static |
| `Assets/Scripts/CameraFollow.cs` | Spectate mode |
| `Assets/Scripts/GameSceneManager.cs` | Init/reset/floorAdvance calls |

---

## Task 1: PartyData.cs — Static Constants

**Files:**
- Create: `Assets/Scripts/PartyData.cs`

**JS Source:** `js/shared/partyData.js` (lines 5-57)

- [ ] **Step 1: READ JS source**

READ `C:\Users\jeff\Desktop\Teah Online\js\shared\partyData.js` completely. Verify every constant value against the spec.

- [ ] **Step 2: Create PartyData.cs**

```csharp
// PartyData.cs — Party constants and bot cosmetic presets
// Source: js/shared/partyData.js
using UnityEngine;

public static class PartyData
{
    // === PARTY_CONFIG === js/shared/partyData.js:5-37
    public const int MAX_SIZE = 4;                          // :6
    public const int REVIVE_BASE_COST = 50;                 // :8 (× dungeonFloor)
    public const float REVIVE_SHOP_DURATION_SEC = 10f;      // :10 (600 frames / 60)
    public const float BOT_HP_MULT = 3f;                    // :12
    public const float BOT_ENGAGE_RANGE = 250f;             // :23
    public const float BOT_FLEE_THRESHOLD = 0.15f;          // :25
    public const float BOT_EFFECTIVE_RANGE = 140f;          // :27
    public const float BOT_SEPARATION_DIST = 60f;           // :29
    public const float BOT_SPREAD_RADIUS = 70f;             // :31 (unused in current AI — hunt uses 35)
    public const float MOB_RETARGET_INTERVAL_SEC = 0.5f;    // :33 (30 frames / 60)
    public const float MOB_COUNT_SCALE_PER_MEMBER = 1.0f;   // :35
    public const float MOB_HP_SCALE_PER_MEMBER = 0.5f;      // :36

    // Death/respawn (shared with player)
    public const float DEATH_ANIM_SEC = 0.667f;             // 40 frames / 60
    public const float RESPAWN_COUNTDOWN_SEC = 3f;           // 180 frames / 60

    // Bot shop AI thresholds — js/authority/botAI.js
    public const float SHOP_ARRIVAL_DIST = 60f;              // :414
    public const float SHOP_PURCHASE_CD_SEC = 0.75f;         // :428 (45 frames / 60)
    public const float SHOP_IDLE_CD_SEC = 1f;                // :431 (60 frames / 60)
    public const float ROAM_REFRESH_SEC = 2f;                // :661 (120 frames / 60)
    public const float ROAM_MIN_RADIUS = 80f;                // :664
    public const float ROAM_MAX_RADIUS = 230f;               // :664 (80 + 150)
    public const float ROAM_ARRIVAL_DIST = 15f;              // :674
    public const float FLEE_DIST_CHECK = 150f;               // :208
    public const float POTION_AUTO_USE_THRESHOLD = 0.4f;     // :135
    public const float FEAR_SPEED_MULT = 0.6f;               // :152
    public const float DODGE_SPEED_MULT = 1.2f;              // :379
    public const float STRAFE_SPEED_MULT = 0.5f;             // doEngage strafe
    public const float FLEE_SPEED_MULT = 0.8f;               // :838
    public const float MOVEAWAY_SPEED_MULT = 0.7f;           // :905
    public const float SEPARATION_FORCE_MULT = 3f;           // :862
    public const float SEPARATION_MIN_DIST = 0.1f;           // :860
    public const float LOW_HP_THRESHOLD = 0.25f;             // :259 (target selection)
    public const float LOW_HP_DIST_MULT = 1.5f;              // :267 (prefer low-HP within 1.5x)
    public const int RELOAD_FRAMES = 90;                     // :752
    public const float RELOAD_SEC = 1.5f;                    // 90 / 60
    public const float CONTACT_CD_SEC = 0.5f;                // 30 frames / 60

    // Bot spawn offset
    public const float BOT_SPAWN_X_OFFSET = 50f;            // per slotIndex
    public const float BOT_SPAWN_Y_OFFSET = -30f;           // Unity Y-up (JS: +30)

    // Default bot gun (Sidearm) — js/authority/partySystem.js:56
    public const int DEFAULT_GUN_DAMAGE = 28;
    public const int DEFAULT_GUN_FIRE_RATE = 5;              // frames
    public const int DEFAULT_GUN_MAG_SIZE = 35;

    // Default bot melee — js/authority/partySystem.js:57
    public const int DEFAULT_MELEE_DAMAGE = 15;
    public const float DEFAULT_MELEE_RANGE = 90f;
    public const int DEFAULT_MELEE_COOLDOWN_FRAMES = 28;
    public const float DEFAULT_MELEE_CRIT = 0.10f;
    public const float DEFAULT_MELEE_KNOCKBACK = 5.04f;
    public const float DEFAULT_MELEE_ARC = Mathf.PI * 0.8f; // 144°

    // Dash defaults — js/authority/partySystem.js:90-93
    public const int DASH_DURATION_FRAMES = 14;
    public const float DASH_SPEED = 21.85f;                  // px/frame
    public const int DASH_COOLDOWN_FRAMES = 240;

    // Default bot potion — js/authority/partySystem.js:97
    public const int DEFAULT_POTION_COUNT = 3;
    public const int DEFAULT_POTION_COOLDOWN_FRAMES = 120;
    public const int DEFAULT_POTION_HEAL = 25;

    // === BOT_PRESETS === js/shared/partyData.js:40-57
    public static readonly BotPreset[] BOT_PRESETS = new BotPreset[]
    {
        null, // slot 0 = player
        new BotPreset("Bot 1", "#c8a888", "#3a2a1a", "#2a4a8a", "#2a2a3a", "#44aa66", "#3a2a1a", "#2a4a8a"), // :42-46
        new BotPreset("Bot 2", "#b89878", "#8a4a2a", "#8a2a2a", "#3a2a2a", "#aa6644", "#4a3a2a", "#8a2a2a"), // :48-50
        new BotPreset("Bot 3", "#d4c4a8", "#1a1a2a", "#2a6a4a", "#2a3a2a", "#4466aa", "#2a2a1a", "#2a6a4a"), // :52-56
    };

    public class BotPreset
    {
        public string name, skin, hair, shirt, pants, eyes, shoes, hat;
        public BotPreset(string n, string sk, string ha, string sh, string pa, string ey, string sho, string ht)
        {
            name = n; skin = sk; hair = ha; shirt = sh; pants = pa; eyes = ey; shoes = sho; hat = ht;
        }
    }
}
```

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/PartyData.cs
git commit -m "Phase 4: add PartyData constants (js/shared/partyData.js)"
```

---

## Task 2: StatusFXStub.cs — Minimal Interface

**Files:**
- Create: `Assets/Scripts/StatusFXStub.cs`

- [ ] **Step 1: Create StatusFXStub.cs**

```csharp
// StatusFXStub.cs — Minimal status effect interface for bot AI
// Full implementation in Phase 5 when mob abilities exist
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
        // Phase 5: actual status effect processing
        return new EntityStatus { speedMult = 1f };
    }

    public static void ClearEntity(PartyMember member)
    {
        // Phase 5: clear all status effects
    }
}
```

- [ ] **Step 2: `read_console` to check compilation**

- [ ] **Step 3: Commit**

```bash
git add Assets/Scripts/StatusFXStub.cs
git commit -m "Phase 4: add StatusFXStub interface for bot AI"
```

---

## Task 3: PartyMember.cs — Data Class

**Files:**
- Create: `Assets/Scripts/PartyMember.cs`

**JS Source:** `js/authority/partySystem.js:22-108` (createPartyMember factory)

- [ ] **Step 1: READ JS source**

READ `C:\Users\jeff\Desktop\Teah Online\js\authority\partySystem.js` lines 22-108 completely. Cross-reference every field.

- [ ] **Step 2: Create PartyMember.cs**

```csharp
// PartyMember.cs — Per-member data class
// Source: js/authority/partySystem.js:22-108 (createPartyMember)
using UnityEngine;

public class PartyMember
{
    // === Identity === js/authority/partySystem.js:75-78
    public string id;           // "player" or "bot_1"/"bot_2"/"bot_3"
    public int slotIndex;       // 0-3
    public string name;         // "Player" or "Bot 1"/"Bot 2"/"Bot 3"
    public string controlType;  // "local" or "bot"

    // === Entity state (position, HP, physics) === js/authority/partySystem.js:28-52
    public float x, y;
    public float vx, vy;
    public float knockVx, knockVy;
    public float speed, baseSpeed;
    public int hp, maxHp;
    public int dir;             // 0=down, 1=up, 2=left, 3=right
    public int frame;
    public float animTimer;
    public bool moving;
    public float radius;        // PLAYER_RADIUS = 23
    public float contactCD;     // per-entity contact cooldown (seconds)
    public bool isBot;

    // === Death state === js/authority/partySystem.js:99-101
    public bool dead;
    public float deathTimer;    // seconds remaining in death animation
    public float respawnTimer;  // seconds remaining before respawn
    public float deathX, deathY;
    public float deathRotation;
    public bool reviveUsed;     // one-time auto-revive from chest armor
    public int lives;
    public bool active;

    // === Gun state === js/authority/partySystem.js:55-72
    public string gunId;
    public string gunName;
    public int gunTier;
    public int gunDamage;
    public int gunFireRate;     // raw JS frames
    public int gunMagSize;
    public int gunAmmo;
    public bool gunReloading;
    public float gunReloadTimer;  // seconds
    public float gunFireCooldown; // seconds
    public string gunSpecial;
    public string gunBulletColor;
    public float gunRecoilTimer;  // seconds (visual only)

    // === Melee state === js/authority/partySystem.js:81-94
    public int meleeDamage;
    public float meleeRange;
    public float meleeCooldown;     // seconds remaining
    public float meleeCooldownMax;  // seconds
    public float meleeCritChance;
    public string meleeSpecial;
    public float meleeKnockback;
    public float meleeArcAngle;     // radians

    // Dash (ninja) — js/authority/partySystem.js:90-93
    public bool dashActive;
    public bool dashing;
    public float dashTimer;
    public float dashDuration;    // seconds
    public float dashSpeed;       // px/sec (JS: px/frame * 60)
    public float dashDirX, dashDirY;
    public int dashesLeft;
    public float dashChainWindow; // seconds
    public float dashCooldown;    // seconds remaining
    public float dashCooldownMax; // seconds
    public float dashGap;         // seconds

    // === Equipment === js/authority/partySystem.js:95
    public ItemData.EquipData equippedGun;
    public ItemData.EquipData equippedMelee;
    public ItemData.EquipData equippedBoots;
    public ItemData.EquipData equippedPants;
    public ItemData.EquipData equippedChest;
    public ItemData.EquipData equippedHelmet;

    // === Economy === js/authority/partySystem.js:96
    public int gold;

    // === Potion === js/authority/partySystem.js:97
    public int potionCount;
    public float potionCooldown;    // seconds
    public float potionCooldownMax; // seconds
    public int potionHealAmount;

    // === AI state (null for player) === js/authority/partySystem.js:104
    public BotAIState ai;

    // === Grab state === js/authority/partySystem.js:103
    public bool grabActive;
    public float grabTimer;
    public float grabCooldown;

    // === Shop tracking (per-bot) === js/authority/botAI.js
    public int[] shopBought;     // indexed by buff/equip type
    public int lifestealPerKill; // base 25, +5 per buff purchase

    // === Cosmetics === js/authority/partySystem.js:38-48
    public Color skinColor, hairColor, shirtColor, pantsColor, eyeColor, shoeColor, hatColor;

    // === Rendering ===
    public GameObject gameObject;
    public SpriteRenderer spriteRenderer;

    // --- Helper: position as Vector2 ---
    public Vector2 Position => new Vector2(x, y);
}

public class BotAIState
{
    // === FSM === js/authority/partySystem.js:104
    public string state = "hunt"; // "hunt", "engage", "flee", "shop", "roam"
    public MobInstance target;
    public float targetAge;       // seconds since last retarget
    public float shootCD;         // seconds
    public float meleeCD;         // seconds

    // === Shop === js/authority/botAI.js:428-431
    public float shopCD;          // seconds between purchases

    // === Strafe === js/authority/botAI.js:789
    public float strafeTimer;     // seconds until strafe flip
    public int strafeDir = 1;     // 1 or -1

    // === Roam === js/authority/botAI.js:655
    public float roamX, roamY;
    public float roamAge;         // seconds since roam target picked

    // === StatusFX === js/authority/botAI.js:146
    public float fxSpeedMult = 1f;
}
```

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/PartyMember.cs
git commit -m "Phase 4: add PartyMember data class (js/authority/partySystem.js:22-108)"
```

---

## Task 4: BulletManager.cs — Add ownerId

**Files:**
- Modify: `Assets/Scripts/BulletManager.cs`

- [ ] **Step 1: READ BulletManager.cs**

READ the full file. Find the bullet struct/class and SpawnBullet method.

- [ ] **Step 2: Add ownerId field to bullet**

Add `public string ownerId;` to the bullet data structure.

- [ ] **Step 3: Update SpawnBullet signature**

Add `string ownerId = "player"` parameter and set it on the bullet.

- [ ] **Step 4: `read_console` to check compilation**

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/BulletManager.cs
git commit -m "Phase 4: add ownerId to bullets for kill attribution"
```

---

## Task 5: MeleeSystem.cs — Expose HitMobsInArc

**Files:**
- Modify: `Assets/Scripts/MeleeSystem.cs`

- [ ] **Step 1: READ MeleeSystem.cs**

READ the full file. Find the hit detection logic.

- [ ] **Step 2: Extract HitMobsInArc as public static**

Create a public static method that takes position, angle, damage, range, half-arc, knockback, crit chance, and ownerId. Move the existing mob-hitting loop into it. Have the existing player melee call this new method.

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/MeleeSystem.cs
git commit -m "Phase 4: expose HitMobsInArc as public static for bot melee"
```

---

## Task 6: PartySystem.cs — Singleton Data Layer

**Files:**
- Create: `Assets/Scripts/PartySystem.cs`

**JS Source:** `js/authority/partySystem.js` (full file, 369 lines)

- [ ] **Step 1: READ JS source**

READ `js/authority/partySystem.js` completely. Cross-reference every method.

- [ ] **Step 2: Create PartySystem.cs**

Implement all methods from the spec. Key methods:

```
Init(int slotCount)           — create player at slot 0, bots at 1-N
Reset()                       — clear all state
GetAliveEntities()            — List<PartyMember> where !dead && active
GetAliveCount()               — count
GetAlive()                    — same as GetAliveEntities
AllDead()                     — true if all dead or inactive
GetNearestTarget(float x, float y)  — closest alive member
GetMobTarget(MobInstance mob)        — sticky targeting with retarget interval
GetLocalMember()              — slot 0
GetMemberById(string id)      — lookup by "player"/"bot_N"
GetMemberByEntity(PartyMember member) — reverse lookup (identity check)
AddGold(string memberId, int amount) — route to correct wallet
GetGold(string memberId)      — read from correct wallet
SpendGold(string memberId, int amount) — deduct, return success
HandleMemberDeath(PartyMember member) — auto-revive, death state, game over
ReviveMember(PartyMember member)      — gold charge, heal, reposition
HasRevivable()                — any dead with lives > 0
OnFloorAdvance()              — respawn dead with lives, reposition
HealAll()                     — full heal all alive
GetSpectateTarget()           — nearest alive bot to last known player pos
GetMobCountScale()            — 1 + (total-1) * 1.0
GetMobHPScale()               — 1 + (total-1) * 0.5
```

Critical behaviors:
- Slot 0 gold reads/writes `CombatState.Instance.gold`
- Scaling uses `members.Count` (TOTAL, not alive)
- HandleMemberDeath checks `ItemData.HasRevive(member.equippedChest)` AND `!member.reviveUsed`
- Auto-revive sets HP to 30% maxHp
- ReviveMember costs `REVIVE_BASE_COST × WaveSystem.Instance.dungeonFloor` from member's own gold
- Bot spawn: `player.x + slotIndex * 50`, `player.y - 30` (Unity Y-up)
- Bot maxHp: `Mathf.RoundToInt(playerMaxHp * BOT_HP_MULT)`

- [ ] **Step 3: Create bot GameObjects in Init()**

Each bot gets a GameObject with:
- Colored square SpriteRenderer (color from BOT_PRESETS)
- Direction indicator child object
- Name label (TextMesh or UI overlay)

Destroyed in Reset().

- [ ] **Step 4: `read_console` to check compilation**

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/PartySystem.cs
git commit -m "Phase 4: add PartySystem singleton (js/authority/partySystem.js)"
```

---

## Task 7: GameBootstrap.cs + GameSceneManager.cs — Wire PartySystem

**Files:**
- Modify: `Assets/Scripts/GameBootstrap.cs`
- Modify: `Assets/Scripts/GameSceneManager.cs`

**JS Source:** `js/authority/authorityTick.js:224-225`, `js/core/sceneManager.js:324,362,503,554`

- [ ] **Step 1: READ both files**

READ GameBootstrap.cs and GameSceneManager.cs completely.

- [ ] **Step 2: Add PartySystem to GameBootstrap**

In the CombatManager GO creation section, add:
```csharp
if (go.GetComponent<PartySystem>() == null) go.AddComponent<PartySystem>();
```

- [ ] **Step 3: Wire GameSceneManager**

Find dungeon entry code → add `PartySystem.Instance.Init(4);`
Find floor advance code → add `PartySystem.Instance.OnFloorAdvance();`
Find dungeon exit / lobby return code → add `PartySystem.Instance.Reset();`

- [ ] **Step 4: `read_console` to check compilation**

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/GameBootstrap.cs Assets/Scripts/GameSceneManager.cs
git commit -m "Phase 4: wire PartySystem init/reset/floorAdvance to scene manager"
```

---

## Task 8: DamageSystem.cs — Party-Aware Damage

**Files:**
- Modify: `Assets/Scripts/DamageSystem.cs`

**JS Source:** `js/authority/damageSystem.js` (lines 144-145, 174-175, 239-240, 359-434, 470-474)

- [ ] **Step 1: READ DamageSystem.cs and JS damageSystem.js**

READ both files completely. Map every party integration point.

- [ ] **Step 2: Add DealDamageToBot()**

New static method mirroring DealDamageToPlayer but for a PartyMember:
1. Dodge check via `ItemData.GetDodgeChance(bot.equippedBoots)`
2. Armor reduction via `ItemData.GetArmorReduction(bot.equippedPants, bot.equippedChest)` (capped 50%)
3. Projectile reduction for "projectile"/"aoe" sources
4. DOT bypasses armor
5. `bot.hp -= finalDamage`
6. If hp <= 0: `PartySystem.Instance.HandleMemberDeath(bot)`
7. Set `bot.contactCD = PartyData.CONTACT_CD_SEC`

- [ ] **Step 3: Modify ProcessKill() for party gold routing**

1. Get killer via `ownerId`: `PartySystem.Instance.GetMemberById(ownerId)`
2. Gold × party size: `goldEarned = Round(baseGold * PartySystem.Instance.members.Count)`
3. Route gold: `PartySystem.Instance.AddGold(killer.id, goldEarned)`
4. Heal killer only (existing logic, but read from killer's equip)
5. Ammo refill → killer only
6. Party lifesteal: heal all alive EXCEPT killer by `ShopSystem.Instance.partyLifesteal`

- [ ] **Step 4: `read_console` to check compilation**

- [ ] **Step 5: Commit**

```bash
git add Assets/Scripts/DamageSystem.cs
git commit -m "Phase 4: party-aware damage, gold routing, party lifesteal"
```

---

## Task 9: MobManager.cs — Party-Aware Targeting & Contact

**Files:**
- Modify: `Assets/Scripts/MobManager.cs`

**JS Source:** `js/authority/mobSystem.js` (lines 126-127, 1333-1374)

- [ ] **Step 1: READ MobManager.cs and JS mobSystem.js targeting/contact sections**

READ MobManager.cs completely. READ JS mobSystem.js lines 120-130 (targeting) and 1330-1380 (contact damage).

- [ ] **Step 2: Replace player-only targeting with party targeting**

In the mob AI update loop, replace direct player reference:
```csharp
// OLD: target player directly
// NEW:
PartyMember target = PartySystem.Instance?.GetMobTarget(m);
if (target == null) continue;
float tx = target.x, ty = target.y;
```

- [ ] **Step 3: Add bot contact damage loop**

After the existing player contact check, add:
```csharp
if (PartySystem.Instance != null)
{
    foreach (var bot in PartySystem.Instance.GetAlive())
    {
        if (!bot.isBot || bot.contactCD > 0) continue;
        float bdx = bot.x - m.x, bdy = bot.y - m.y;
        float bdist = Mathf.Sqrt(bdx * bdx + bdy * bdy);
        if (bdist < m.contactRange)
        {
            DamageSystem.DealDamageToBot(bot, m.damage, "contact");
            bot.contactCD = PartyData.CONTACT_CD_SEC;
        }
    }
}
```

- [ ] **Step 4: Add bot body-blocking**

In the body-blocking loop, also check bot positions and push mobs away from bots.

- [ ] **Step 5: `read_console` to check compilation**

- [ ] **Step 6: Commit**

```bash
git add Assets/Scripts/MobManager.cs
git commit -m "Phase 4: party targeting, bot contact damage, bot body-blocking"
```

---

## Task 10: WaveSystem.cs — Party Scaling & Revive Shop

**Files:**
- Modify: `Assets/Scripts/WaveSystem.cs`

**JS Source:** `js/authority/waveSystem.js:210-217,310-323`, `js/authority/mobSystem.js:1533,1563-1565,1579-1587`

- [ ] **Step 1: READ WaveSystem.cs and JS sources**

READ WaveSystem.cs completely. READ the JS wave/mob party integration lines.

- [ ] **Step 2: Add mob count/HP scaling**

In the mob spawning method, when `PartySystem.Instance.members.Count > 1`:
```csharp
int scaledCount = Mathf.RoundToInt(baseCount * PartySystem.Instance.GetMobCountScale());
float hpMult = baseHPMult * PartySystem.Instance.GetMobHPScale();
```

- [ ] **Step 3: Add wave clear heal + revive shop trigger**

After wave clear (all mobs dead):
```csharp
PartySystem.Instance?.HealAll();

// Check for revive shop
if (PartySystem.Instance != null && PartySystem.Instance.HasRevivable() && !stairsOpen)
{
    waveState = "revive_shop";
    betweenWaveTimer = PartyData.REVIVE_SHOP_DURATION_SEC;
}
```

- [ ] **Step 4: Add medpack pickup for all party members**

Replace player-only medpack check with loop over `PartySystem.Instance.GetAlive()`.

- [ ] **Step 5: Add chest regen between waves**

During cleared/waiting phase, tick chest regen for all alive members.

- [ ] **Step 6: `read_console` to check compilation**

- [ ] **Step 7: Commit**

```bash
git add Assets/Scripts/WaveSystem.cs
git commit -m "Phase 4: party scaling, revive shop, medpack/regen for all members"
```

---

## Task 11: BotController.cs — Movement & Physics

**Files:**
- Create: `Assets/Scripts/BotController.cs`

**JS Source:** `js/authority/botAI.js` (lines 875-911 movement, 850-872 separation, 97-120 knockback, 239-248 animation)

- [ ] **Step 1: READ JS source sections**

READ botAI.js lines 850-920 (movement/separation) and 97-120 (knockback) and 239-248 (animation).

- [ ] **Step 2: Create BotController.cs**

Implement:
- `MoveToward(PartyMember m, float tx, float ty)` — normalize, speed × fxSpeedMult × dt, 4-corner AABB via TileCollision, wall-slide recovery
- `MoveAway(PartyMember m, float fx, float fy)` — opposite direction at 70% speed
- `ApplySeparation(PartyMember m, List<PartyMember> members)` — push apart when < 60px, force = (sepDist - d) / sepDist × 3
- `ApplyKnockback(PartyMember m, float dt)` — decay 0.8, clear at 0.6, AABB collision check
- `UpdateAnimation(PartyMember m, float dt)` — 4-frame walk cycle, advance every 8/60s
- `FaceTarget(PartyMember m, float tx, float ty)` — cardinal direction from dominant axis
- `FaceDirection(PartyMember m, float nx, float ny)` — cardinal from unit vector
- `TickDashMovement(PartyMember m, float dt)` — ninja dash movement, shared with player later

All movement uses `PLAYER_WALL_HW = 14` (NOT MOB_WALL_HW = 11).

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/BotController.cs
git commit -m "Phase 4: add BotController movement/separation/knockback/animation"
```

---

## Task 12: BotShopLogic.cs — Purchase AI

**Files:**
- Create: `Assets/Scripts/BotShopLogic.cs`

**JS Source:** `js/authority/botAI.js` (lines 406-653)

- [ ] **Step 1: READ JS source**

READ botAI.js lines 406-653 completely. Every equipment tier, every buff, every cost formula.

- [ ] **Step 2: Create BotShopLogic.cs**

Implement:
- `DoShop(PartyMember m)` — walk to ShopStation, attempt purchases
- `TryBuyEquipment(PartyMember m)` — priority: Guns → Melees → Chest → Pants → Boots → Helmets. Check wave requirement, check gold, apply.
- `TryBuyBuff(PartyMember m)` — BUFF_PRIORITIES [0,1,4,5,3]. Dynamic: potion to top when HP < 70%. Cost = baseCost + shopBought[idx] × priceIncrease.
- `ApplyEquipment(PartyMember m, string slot, ItemData.EquipData item)` — update gun/melee/equip state, preserve damage buffs, sync equip references.
- `GetBotEquipTier(PartyMember m, string slot)` — return current tier (0 = default/none).

Buff definitions (from ShopSystem.cs existing data):
| Index | Buff | baseCost | priceIncrease | maxBuy |
|-------|------|----------|---------------|--------|
| 0 | Gun Dmg +3 | 15 | 8 | ∞ |
| 1 | Melee Dmg +3 | 15 | 9 | ∞ |
| 2 | Melee Speed | 20 | 11 | 6 |
| 3 | Health Potion | 15 | 4 | ∞ |
| 4 | Lifesteal +5 | 10 | 4 | 10 |
| 5 | Party Lifesteal | 80 | 60 | 4 |

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/BotShopLogic.cs
git commit -m "Phase 4: add BotShopLogic equipment/buff purchasing AI"
```

---

## Task 13: BotAI.cs — FSM & Combat

**Files:**
- Create: `Assets/Scripts/BotAI.cs`

**JS Source:** `js/authority/botAI.js` (full file, 976 lines)

This is the largest task. READ the entire JS file before writing.

- [ ] **Step 1: READ JS source**

READ `js/authority/botAI.js` completely. All 976 lines.

- [ ] **Step 2: Create BotAI.cs — Main tick loop**

```csharp
public class BotAI : MonoBehaviour
{
    public static BotAI Instance { get; private set; }
    BotController controller;
    BotShopLogic shopLogic;

    void Awake() { Instance = this; controller = new BotController(); shopLogic = new BotShopLogic(); }

    // Called each frame from game loop — js/authority/authorityTick.js:224
    public void Tick()
    {
        if (PartySystem.Instance == null) return;
        var members = PartySystem.Instance.members;
        if (members.Count <= 1) return;
        float dt = Time.deltaTime;

        for (int i = 1; i < members.Count; i++) // skip slot 0 (player)
        {
            var m = members[i];
            if (!m.active) continue;
            if (m.dead) { TickDeadBot(m, dt); continue; }
            TickBot(m, dt);
        }
    }
}
```

- [ ] **Step 3: Implement TickDeadBot (js/authority/botAI.js:30-61)**

Death rotation → respawn timer → auto-respawn at random alive member ±40px.

- [ ] **Step 4: Implement TickBot main loop (js/authority/botAI.js:63-237)**

1. Decrement cooldowns (shootCD, meleeCD, contactCD)
2. Tick dash (early return if active)
3. Apply knockback
4. Tick reload
5. Tick potion (auto-use at < 40% HP)
6. Tick StatusFX (stub — just get speedMult)
7. Telegraph dodge check (stub — no telegraphs yet)
8. Ultimate stubs (null-check shrine/godspeed)
9. Target selection (prefer low-HP < 25% within 1.5× nearest)
10. FSM transitions
11. FSM dispatch (hunt/engage/flee/shop/roam)
12. Separation
13. Animation update
14. Sync GameObject position

- [ ] **Step 5: Implement FSM states**

- `DoHunt(m, mob, dist)` — move toward with 35px spread offset
- `DoEngage(m, mob, dist)` — melee/gun DPS decision, range management, strafe, shoot, melee, ninja dash
- `DoFlee(m, mob)` — move to shop at 80% speed, still shoot
- `DoShop(m)` — delegate to BotShopLogic
- `DoRoam(m)` — random point every 2s within 80-230px

- [ ] **Step 6: Implement BotShoot (js/authority/botAI.js:931-954)**

```csharp
void BotShoot(PartyMember m, MobInstance mob)
{
    var g = m; // gun state on member
    if (g.gunAmmo <= 0 || g.gunReloading || m.ai.shootCD > 0) return;

    float dx = mob.x - m.x, dy = mob.y - m.y;
    float dist = Mathf.Sqrt(dx * dx + dy * dy);
    if (dist < 0.1f) return;
    float nx = dx / dist, ny = dy / dist;

    // Bullet spawn at (m.x, m.y + 10) — Unity Y-up, JS was y-10
    BulletManager.Instance.SpawnBullet(m.x, m.y + 10f,
        nx * BulletManager.BULLET_SPEED_PX_SEC,
        ny * BulletManager.BULLET_SPEED_PX_SEC,
        m.gunDamage, true, m.id); // isPlayerBullet=true (hits mobs), ownerId=member.id

    m.gunAmmo--;
    m.ai.shootCD = (m.gunFireRate > 0 ? m.gunFireRate : 5) * 4f / 60f; // frames to seconds
    m.gunRecoilTimer = 6f / 60f; // visual only

    if (m.gunAmmo <= 0)
    {
        m.gunReloading = true;
        m.gunReloadTimer = PartyData.RELOAD_SEC; // 1.5s (90 frames / 60)
    }
}
```

- [ ] **Step 7: Implement BotMelee (js/authority/botAI.js:956-969)**

```csharp
void BotMelee(PartyMember m, MobInstance mob)
{
    if (m.ai.meleeCD > 0) return;
    float dx = mob.x - m.x, dy = mob.y - m.y;
    float dist = Mathf.Sqrt(dx * dx + dy * dy);
    if (dist > m.meleeRange) return;

    float aimAngle = Mathf.Atan2(dy, dx);
    float halfArc = m.meleeArcAngle / 2f;

    MeleeSystem.HitMobsInArc(
        new Vector2(m.x, m.y), aimAngle, m.meleeDamage,
        m.meleeRange, halfArc, m.meleeKnockback, m.meleeCritChance, m.id);

    m.ai.meleeCD = m.meleeCooldownMax;
}
```

- [ ] **Step 8: Wire BotAI.Tick() call**

In the game loop (wherever authority tick runs), add:
```csharp
BotAI.Instance?.Tick();
```

- [ ] **Step 9: `read_console` to check compilation**

- [ ] **Step 10: Commit**

```bash
git add Assets/Scripts/BotAI.cs
git commit -m "Phase 4: add BotAI FSM with hunt/engage/flee/shop/roam + combat"
```

---

## Task 14: CameraFollow.cs — Spectate Mode

**Files:**
- Modify: `Assets/Scripts/CameraFollow.cs`

**JS Source:** `js/core/draw.js:2619-2629`

- [ ] **Step 1: READ CameraFollow.cs**

READ the full file.

- [ ] **Step 2: Add spectate mode**

When player is dead and party has alive bots:
```csharp
if (CombatState.Instance.isDead && PartySystem.Instance != null)
{
    var spectateTarget = PartySystem.Instance.GetSpectateTarget();
    if (spectateTarget != null)
    {
        targetPos = new Vector3(spectateTarget.x, spectateTarget.y, 0);
        // Use same follow/clamp logic as normal
    }
}
```

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/CameraFollow.cs
git commit -m "Phase 4: spectate mode follows alive bot when player dead"
```

---

## Task 15: PartyHUD.cs — Bot Status & Revive Shop

**Files:**
- Create: `Assets/Scripts/PartyHUD.cs`

**JS Source:** `js/core/draw.js:2569-2668`

- [ ] **Step 1: READ JS draw.js party HUD sections**

READ draw.js lines 2569-2668 for exact layout, colors, and positioning.

- [ ] **Step 2: Create PartyHUD.cs**

Using Unity Canvas uGUI (same approach as CombatHUD.cs):

1. **Bot Status Panel** (top-left, below player HP):
   - For each bot (slots 1-3): name label, HP bar, gold counter
   - Dead bots: grayed out with "DEAD" text and remaining lives
   - Contact flash: alternate visibility when contactCD > 0

2. **Revive Shop Panel** (center screen, during revive_shop waveState):
   - Title: "REVIVE SHOP — Ns"
   - List dead members with lives > 0
   - Per member: name, cost (50 × floor), member's gold
   - Click/button to revive
   - "[G] Skip" hint text

3. **Spectate Overlay** (bottom center, when player dead):
   - "Spectating: [Bot Name]" text

- [ ] **Step 3: `read_console` to check compilation**

- [ ] **Step 4: Commit**

```bash
git add Assets/Scripts/PartyHUD.cs
git commit -m "Phase 4: add PartyHUD with bot status, revive shop, spectate overlay"
```

---

## Task 16: Integration Test — Enter Play Mode

**No new files — verification only.**

- [ ] **Step 1: Enter Play Mode**

Use `manage_editor` to enter Play Mode.

- [ ] **Step 2: Check console for errors**

Use `read_console` to verify no compilation errors or runtime exceptions.

- [ ] **Step 3: Walk into dungeon portal**

Verify:
- 3 bots spawn beside player (colored squares)
- Bots visible in scene
- Party HUD shows 3 bot HP bars

- [ ] **Step 4: Observe bot combat**

Verify:
- Bots move toward mobs (HUNT → ENGAGE)
- Bots shoot bullets at mobs
- Bots use melee when in range
- Mob HP decreases from bot attacks
- Bots take contact damage from mobs
- Bot HP bars decrease

- [ ] **Step 5: Observe wave scaling**

Verify:
- More mobs spawn than solo (4× count with 4 party members)
- Mobs have more HP (2.5× with 4 party members)

- [ ] **Step 6: Observe wave clear**

Verify:
- All members healed on wave clear
- Bots navigate to shop during cleared phase
- Bots buy equipment/buffs

- [ ] **Step 7: Observe bot death/revive**

Verify:
- When bot HP reaches 0, death animation plays
- Revive shop appears between waves if bots are dead
- Can revive bots using their gold
- Camera spectates alive bot when player dies

- [ ] **Step 8: Complete dungeon run**

Verify:
- Floor advance respawns dead bots
- Full 5-floor dungeon completes with party
- Return to lobby resets party state

- [ ] **Step 9: Fix any bugs found**

Address issues discovered during Play mode testing.

- [ ] **Step 10: Final commit**

```bash
git add -A
git commit -m "Phase 4: Party + Bots verified in Play mode"
```

---

## Execution Order & Dependencies

```
Task 1 (PartyData)      — no deps
Task 2 (StatusFXStub)   — no deps
Task 3 (PartyMember)    — no deps
Task 4 (BulletManager)  — no deps
Task 5 (MeleeSystem)    — no deps

Task 6 (PartySystem)    — depends on 1, 2, 3
Task 7 (Bootstrap/Scene)— depends on 6

Task 8 (DamageSystem)   — depends on 3, 4, 6
Task 9 (MobManager)     — depends on 3, 6, 8
Task 10 (WaveSystem)    — depends on 6

Task 11 (BotController) — depends on 1, 3
Task 12 (BotShopLogic)  — depends on 1, 3

Task 13 (BotAI)         — depends on 6, 8, 9, 11, 12 (biggest task, integrates everything)
Task 14 (CameraFollow)  — depends on 6
Task 15 (PartyHUD)      — depends on 6

Task 16 (Play Mode)     — depends on ALL
```

**Parallelizable:** Tasks 1-5 can run in parallel. Tasks 11-12 can run in parallel. Tasks 14-15 can run in parallel.

---

## Y-Axis Conversion Checklist

Every Y value from JS must be negated for Unity (JS Y-down → Unity Y-up):

| JS Value | Unity Value | Where |
|----------|-------------|-------|
| `player.y + 30` (bot spawn) | `player.y - 30` | PartySystem.Init() |
| `e.y - 10` (bullet offset) | `e.y + 10` | BotAI.BotShoot() |
| `dir 0=down (+Y)` | `dir 0=down (-Y)` | BotController.FaceTarget() |
| Mob position Y | Already converted | MobManager (no change) |

---

## Self-Audit Checklist (run before final commit)

1. For each new state variable: grep all readers — does every reader handle null/missing?
2. For each gold operation: does slot 0 read/write CombatState.Instance.gold?
3. For each death path: are status effects cleared? Is reviveUsed checked?
4. For each damage path: does it resolve equipment from the correct member (not always playerEquip)?
5. For each movement: does it use PLAYER_WALL_HW (14), not MOB_WALL_HW (11)?
6. For each timer: is it in seconds (not frames)? Is dt applied?
7. For each Y coordinate: is it negated from JS?
8. Wave scaling: uses members.Count (total), NOT GetAliveCount()?
