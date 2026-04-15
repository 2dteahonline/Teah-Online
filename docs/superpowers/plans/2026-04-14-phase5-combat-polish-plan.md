# Phase 5: Combat Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port all combat visual systems (status effects, telegraphs, hazards, attack shapes) and all 348 mob abilities from JS to Unity C#, plus weapon specials (Ninja/Storm/Cleave).

**Architecture:** Infrastructure-first approach. Build 5 core systems (StatusFX, AttackShapes, TelegraphSystem, HazardSystem, MobAbilitySystem), wire them into existing Phase 0-4 scripts, then port 348 mob abilities across 5 dungeon files in parallel. All values cite `js/file.js:line`.

**Tech Stack:** Unity 6 (6000.4.0f1), C#, 2D Built-in Render Pipeline, OnGUI for HUD overlays, GL/Graphics for world-space rendering.

**JS Source Files (canonical references):**
- `js/authority/combatSystem.js:1-528` — StatusFX system
- `js/authority/telegraphSystem.js` — Telegraph shapes + lifecycle
- `js/authority/hazardSystem.js` — Hazard zone system
- `js/authority/attackShapes.js` — Hit detection geometry
- `js/core/meleeSystem.js` — Weapon specials (ninja/storm/cleave)
- `js/authority/combatSystem.js:810+` — Base mob specials (70)
- `js/authority/vortalisSpecials.js` — Vortalis specials (77)
- `js/authority/earth205Specials.js` — Earth-205 specials (61)
- `js/authority/earth216Specials.js` + `2.js` + `3.js` — Earth-216 specials (70)
- `js/authority/wagashiSpecials.js` + `2.js` + `3.js` — Wagashi specials (70)

**Y-axis rule:** JS Canvas is Y-down, Unity is Y-up. Every `cy`, `dy`, `vy`, `direction` needs sign flip on Y. `atan2(dy, dx)` in JS → `atan2(-dy, dx)` in Unity for angles.

---

## File Structure

### New Files (14)
| File | Responsibility |
|------|---------------|
| `Assets/Scripts/Combat/StatusFX.cs` | Full status effect system (13 player + 7 mob effects) — replaces StatusFXStub.cs |
| `Assets/Scripts/Combat/AttackShapes.cs` | Static geometry helpers: circle, line, cone, ring, tile hit detection |
| `Assets/Scripts/Combat/TelegraphSystem.cs` | Warning indicators (5 shapes), lifecycle, GL rendering |
| `Assets/Scripts/Combat/HazardSystem.cs` | Persistent damage zones, tick damage, GL rendering |
| `Assets/Scripts/Combat/MobAbilityContext.cs` | Per-tick context struct passed to every mob ability |
| `Assets/Scripts/Combat/MobAbilitySystem.cs` | Registry + dispatcher: timer management, cooldown, ability lookup |
| `Assets/Scripts/Combat/Abilities/AzurineAbilities.cs` | 70 base/azurine mob abilities |
| `Assets/Scripts/Combat/Abilities/VortalisAbilities.cs` | 77 vortalis mob abilities |
| `Assets/Scripts/Combat/Abilities/Earth205Abilities.cs` | 61 earth-205 mob abilities |
| `Assets/Scripts/Combat/Abilities/Earth216Abilities.cs` | 70 earth-216 mob abilities (3 JS files merged) |
| `Assets/Scripts/Combat/Abilities/WagashiAbilities.cs` | 70 wagashi mob abilities (3 JS files merged) |
| `Assets/Scripts/Combat/WeaponSpecials.cs` | Ninja dash, Storm Blade shockwave/chain, War Cleaver cleave/blood |
| `Assets/Scripts/Combat/StatusFXRenderer.cs` | World-space status effect visuals (GL lines/circles) |
| `Assets/Scripts/Combat/HitEffectSystem.cs` | Floating damage numbers + visual hit bursts |

### Modified Files (7)
| File | Changes |
|------|---------|
| `MobInstance.cs` | Add status effect fields (stunTimer, rootTimer, etc.) |
| `MobManager.cs` | Hook MobAbilitySystem.Tick() + StatusFX.TickMob() into mob update loop |
| `DamageSystem.cs` | Add mark/armorBreak damage multipliers, status-on-hit hooks |
| `BotAI.cs` | Replace `StatusFXStub` calls with `StatusFX` |
| `MeleeSystem.cs` | Add weapon special dispatch (ninja/storm/cleave) |
| `PlayerController.cs` | Add status effect movement modifiers (slow, root, confuse, fear) |
| `GameBootstrap.cs` | Create TelegraphSystem + HazardSystem + MobAbilitySystem singletons |

### Deleted Files (1)
| File | Reason |
|------|--------|
| `StatusFXStub.cs` | Replaced by full StatusFX.cs |

---

## Task 1: StatusFX System

**Files:**
- Create: `Assets/Scripts/Combat/StatusFX.cs`
- Modify: `Assets/Scripts/MobInstance.cs`
- Delete: `Assets/Scripts/StatusFXStub.cs`

**JS Source:** `js/authority/combatSystem.js:1-528`

- [ ] **Step 1: Create StatusFX.cs with effect state + apply/tick**

```csharp
// Assets/Scripts/Combat/StatusFX.cs
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Full status effect system. Replaces StatusFXStub.
/// Port of js/authority/combatSystem.js:1-528
/// </summary>
public static class StatusFX
{
    // === PLAYER/BOT EFFECT STATE (per-entity bag) ===
    // js/authority/combatSystem.js:101-140
    public class EffectState
    {
        // Movement
        public float slow;           // speed reduction (0-1), default 0
        public float slowTimer;      // frames remaining
        public bool rooted;          // no movement
        public float rootTimer;

        // Damage
        public bool marked;          // increased incoming damage
        public float markTimer;
        public float markBonus;      // e.g. 0.15 = +15% damage taken
        public bool silenced;        // blocks weapon fire
        public float silenceTimer;

        // DoT
        public bool bleeding;
        public float bleedTimer;
        public float bleedDmg;       // damage per tick
        public float bleedTick;      // frames since last tick

        // Control
        public bool confused;        // swaps movement directions
        public float confuseTimer;
        public bool disoriented;     // random drift
        public float disorientTimer;
        public bool feared;          // random walk
        public float fearTimer;
        public float fearDirTimer;
        public float fearDirX, fearDirY;

        // Vision/Armor
        public bool blind;
        public float blindTimer;
        public string blindMode;     // "darken" or "flash"
        public bool armorBreak;
        public float armorBreakTimer;
        public float armorBreakMult; // e.g. 1.5 = 50% more damage taken

        // Special
        public bool mobilityLocked;  // no dash/sprint
        public float mobilityLockTimer;
        public bool tethered;
        public float tetherTimer;
        public int tetherMobId;
        public float tetherSlow;     // e.g. 0.6

        // Per-entity poison (bots)
        public float poisonTimer;
        public float poisonTickTimer;
    }

    // Per-entity storage
    static Dictionary<object, EffectState> _entityStates = new Dictionary<object, EffectState>();

    public static EffectState GetOrCreate(object entity)
    {
        if (!_entityStates.TryGetValue(entity, out var state))
        {
            state = new EffectState();
            _entityStates[entity] = state;
        }
        return state;
    }

    public static void ClearEntity(object entity)
    {
        _entityStates.Remove(entity);
    }

    public static void ClearAll()
    {
        _entityStates.Clear();
    }

    // === APPLY TO PLAYER/BOT ===
    // js/authority/combatSystem.js:152-227
    public static void ApplyToEntity(object entity, string effectId, Dictionary<string, float> parms = null)
    {
        var s = GetOrCreate(entity);
        float Get(string key, float def) => parms != null && parms.ContainsKey(key) ? parms[key] : def;

        switch (effectId)
        {
            case "slow":
                s.slow = Get("amount", 0.35f);
                s.slowTimer = Get("duration", 240f);
                break;
            case "root":
                s.rooted = true;
                s.rootTimer = Get("duration", 42f);
                break;
            case "stun": // js/authority/combatSystem.js:178 — stun = root alias
                s.rooted = true;
                s.rootTimer = Get("duration", 36f);
                break;
            case "mark":
                s.marked = true;
                s.markTimer = Get("duration", 240f);
                s.markBonus = Get("bonus", 0.15f);
                break;
            case "silence":
                s.silenced = true;
                s.silenceTimer = Get("duration", 90f);
                break;
            case "bleed":
                s.bleeding = true;
                s.bleedTimer = Get("duration", 240f);
                s.bleedDmg = Get("dmg", 3f);
                s.bleedTick = 0f;
                break;
            case "confuse":
                s.confused = true;
                s.confuseTimer = Get("duration", 72f);
                break;
            case "disorient":
                s.disoriented = true;
                s.disorientTimer = Get("duration", 60f);
                break;
            case "fear":
                s.feared = true;
                s.fearTimer = Get("duration", 90f);
                s.fearDirTimer = 0f;
                break;
            case "blind":
                s.blind = true;
                s.blindTimer = Get("duration", 120f);
                s.blindMode = Get("mode", 0f) > 0 ? "flash" : "darken";
                break;
            case "mobility_lock":
                s.mobilityLocked = true;
                s.mobilityLockTimer = Get("duration", 120f);
                break;
            case "armor_break":
                s.armorBreak = true;
                s.armorBreakTimer = Get("duration", 180f);
                s.armorBreakMult = Get("mult", 1.5f);
                break;
            case "tether":
                s.tethered = true;
                s.tetherTimer = Get("duration", 180f);
                s.tetherMobId = (int)Get("mobId", -1f);
                s.tetherSlow = Get("slow", 0.6f);
                break;
            case "poison":
                s.poisonTimer = Get("duration", 180f);
                s.poisonTickTimer = 0f;
                break;
        }
    }

    // === TICK RESULT (returned to movement/combat systems) ===
    public struct TickResult
    {
        public float speedMult;
        public bool rooted, feared, silenced, confused, disoriented;
        public bool marked; public float markBonus;
        public bool armorBreak; public float armorBreakMult;
        public bool blind; public string blindMode;
        public bool tethered;
        public float fearDirX, fearDirY;
    }

    // js/authority/combatSystem.js:229-323
    public static TickResult TickEntity(object entity)
    {
        var r = new TickResult { speedMult = 1f };
        if (!_entityStates.TryGetValue(entity, out var s)) return r;

        // Decrement all timers, clear flags when expired
        if (s.slowTimer > 0) { s.slowTimer--; r.speedMult *= (1f - s.slow); }
        else s.slow = 0f;

        if (s.rootTimer > 0) { s.rootTimer--; r.rooted = true; }
        else s.rooted = false;

        if (s.markTimer > 0) { s.markTimer--; r.marked = true; r.markBonus = s.markBonus; }
        else { s.marked = false; s.markBonus = 0f; }

        if (s.silenceTimer > 0) { s.silenceTimer--; r.silenced = true; }
        else s.silenced = false;

        // Bleed DoT — tick every 60 frames (js/authority/combatSystem.js:256-267)
        if (s.bleedTimer > 0)
        {
            s.bleedTimer--;
            s.bleedTick++;
            if (s.bleedTick >= 60f)
            {
                s.bleedTick = 0f;
                // Caller must apply bleed damage externally
            }
        }
        else s.bleeding = false;

        if (s.confuseTimer > 0) { s.confuseTimer--; r.confused = true; }
        else s.confused = false;

        if (s.disorientTimer > 0) { s.disorientTimer--; r.disoriented = true; }
        else s.disoriented = false;

        // Fear — random walk (js/authority/combatSystem.js:276-286)
        if (s.fearTimer > 0)
        {
            s.fearTimer--;
            r.feared = true;
            s.fearDirTimer--;
            if (s.fearDirTimer <= 0)
            {
                float angle = Random.Range(0f, Mathf.PI * 2f);
                s.fearDirX = Mathf.Cos(angle);
                s.fearDirY = Mathf.Sin(angle);
                s.fearDirTimer = Random.Range(15f, 25f);
            }
            r.fearDirX = s.fearDirX;
            r.fearDirY = s.fearDirY;
        }
        else s.feared = false;

        if (s.blindTimer > 0) { s.blindTimer--; r.blind = true; r.blindMode = s.blindMode; }
        else s.blind = false;

        if (s.armorBreakTimer > 0) { s.armorBreakTimer--; r.armorBreak = true; r.armorBreakMult = s.armorBreakMult; }
        else { s.armorBreak = false; s.armorBreakMult = 1f; }

        if (s.mobilityLockTimer > 0) s.mobilityLockTimer--;
        else s.mobilityLocked = false;

        // Tether — breaks on LoS or mob death (js/authority/combatSystem.js:299-321)
        if (s.tetherTimer > 0)
        {
            s.tetherTimer--;
            r.tethered = true;
            r.speedMult *= s.tetherSlow;
            // LoS check done by caller (needs wall data)
        }
        else s.tethered = false;

        // Poison DoT — tick every 60 frames
        if (s.poisonTimer > 0)
        {
            s.poisonTimer--;
            s.poisonTickTimer++;
            if (s.poisonTickTimer >= 60f)
            {
                s.poisonTickTimer = 0f;
                // Caller must apply poison damage externally
            }
        }

        return r;
    }

    // === MOB EFFECTS ===
    // js/authority/combatSystem.js:11-93

    public struct MobTickResult
    {
        public float speedMult;
        public float dmgMult;
        public bool skip;      // staggered/stunned — skip AI this frame
        public bool silenced;
    }

    public static void ApplyToMob(MobInstance mob, string effectId, float duration = 0, float value = 0)
    {
        switch (effectId)
        {
            case "frost": // js:14-20
                mob.frostTimer = duration > 0 ? duration : 90f;
                mob.frostSlow = value > 0 ? value : 0.25f;
                break;
            case "burn": // js:22-30
                mob.burnTimer = duration > 0 ? duration : 180f;
                mob.burnDmg = value > 0 ? value : 11f;
                mob.burnTick = 0f;
                break;
            case "stagger": // js:32-38
                mob.staggerTimer = duration > 0 ? duration : 30f;
                break;
            case "stun": // js:40-46
                mob.stunTimer = duration > 0 ? duration : 36f;
                break;
            case "root": // js:48-54
                mob.rootTimer = duration > 0 ? duration : 42f;
                break;
            case "mark": // js:56-64
                mob.markTimer = duration > 0 ? duration : 240f;
                mob.markBonus = value > 0 ? value : 0.15f;
                break;
            case "silence": // js:66-72
                mob.silenceTimer = duration > 0 ? duration : 90f;
                break;
        }
    }

    public static MobTickResult TickMob(MobInstance mob)
    {
        var r = new MobTickResult { speedMult = 1f, dmgMult = 1f };

        if (mob.frostTimer > 0) { mob.frostTimer--; r.speedMult *= (1f - mob.frostSlow); }

        if (mob.burnTimer > 0)
        {
            mob.burnTimer--;
            mob.burnTick++;
            if (mob.burnTick >= 60f)
            {
                mob.burnTick = 0f;
                mob.hp -= Mathf.RoundToInt(mob.burnDmg);
            }
        }

        if (mob.staggerTimer > 0) { mob.staggerTimer--; r.skip = true; }
        if (mob.stunTimer > 0) { mob.stunTimer--; r.skip = true; }
        if (mob.rootTimer > 0) { mob.rootTimer--; r.skip = true; }

        if (mob.markTimer > 0) { mob.markTimer--; r.dmgMult = 1f + mob.markBonus; }
        if (mob.silenceTimer > 0) { mob.silenceTimer--; r.silenced = true; }

        return r;
    }
}
```

- [ ] **Step 2: Add status fields to MobInstance.cs**

Add after existing fields in `MobInstance.cs`:

```csharp
    // Status effect fields (js/authority/combatSystem.js:11-93)
    [HideInInspector] public float frostTimer, frostSlow;
    [HideInInspector] public float burnTimer, burnDmg, burnTick;
    [HideInInspector] public float staggerTimer;
    [HideInInspector] public float stunTimer;
    [HideInInspector] public float rootTimer;
    [HideInInspector] public float markTimer, markBonus;
    [HideInInspector] public float silenceTimer;
```

- [ ] **Step 3: Delete StatusFXStub.cs, update BotAI.cs references**

In `BotAI.cs`, replace all `StatusFXStub.TickEntity(m)` calls with `StatusFX.TickEntity(m)` and `StatusFXStub.ClearEntity(m)` with `StatusFX.ClearEntity(m)`. The return type `EntityStatus` → `StatusFX.TickResult` — update field names:
- `fxResult.rooted` → same
- `fxResult.stunned` → `fxResult.rooted` (stun = root in StatusFX)
- `fxResult.feared` → same
- `fxResult.speedMult` → same

- [ ] **Step 4: Wire StatusFX.TickMob into MobManager.cs**

In `MobManager.cs` Update(), after the cooldown tick (line ~255), before AI movement:

```csharp
    var fxResult = StatusFX.TickMob(mob);
    if (fxResult.skip) continue; // stunned/staggered — skip AI
    float mobSpeedMult = fxResult.speedMult;
    // Use mobSpeedMult when computing mob movement velocity below
```

- [ ] **Step 5: Wire mark/armorBreak into DamageSystem.cs**

In `DealDamageToMob`, before applying damage:
```csharp
    if (mob.markTimer > 0) damage = Mathf.RoundToInt(damage * (1f + mob.markBonus));
```

In `DealDamageToPlayer`/`DealDamageToBot`, check entity's armorBreak:
```csharp
    var state = StatusFX.GetOrCreate(entity);
    if (state.armorBreak) damage = Mathf.RoundToInt(damage * state.armorBreakMult);
    if (state.marked) damage = Mathf.RoundToInt(damage * (1f + state.markBonus));
```

- [ ] **Step 6: Wire status movement into PlayerController.cs**

In PlayerController's Update, after reading input:
```csharp
    var fx = StatusFX.TickEntity(this);
    if (fx.rooted) { /* zero velocity, skip movement */ }
    else if (fx.feared) { /* override input with fearDirX/Y */ }
    else if (fx.confused) { /* swap vx/vy signs */ }
    float speed = baseSpeed * fx.speedMult;
    if (fx.disoriented) { /* add Random.Range drift to velocity */ }
```

- [ ] **Step 7: `read_console` to verify compilation**

- [ ] **Step 8: Commit**
```
feat(phase5): add StatusFX system replacing StatusFXStub — 13 player + 7 mob effects
```

---

## Task 2: AttackShapes

**Files:**
- Create: `Assets/Scripts/Combat/AttackShapes.cs`

**JS Source:** `js/authority/attackShapes.js`

- [ ] **Step 1: Create AttackShapes.cs**

```csharp
// Assets/Scripts/Combat/AttackShapes.cs
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Static geometry hit detection. Port of js/authority/attackShapes.js.
/// All positions in world-space (Unity Y-up).
/// </summary>
public static class AttackShapes
{
    // js/authority/attackShapes.js — hitsPlayer (circle)
    public static bool PointInCircle(float px, float py, float cx, float cy, float radius)
    {
        float dx = px - cx, dy = py - cy;
        return dx * dx + dy * dy <= radius * radius;
    }

    // Returns all alive party entities inside circle
    public static List<Transform> EntitiesInCircle(float cx, float cy, float radius)
    {
        var result = new List<Transform>();
        // Check player + all bots via PartySystem
        foreach (var entity in PartySystem.Instance.GetAliveEntities())
        {
            if (PointInCircle(entity.position.x, entity.position.y, cx, cy, radius))
                result.Add(entity);
        }
        return result;
    }

    // Returns all mobs inside circle (excluding caster)
    public static List<MobInstance> MobsInCircle(float cx, float cy, float radius, int excludeId = -1)
    {
        var result = new List<MobInstance>();
        foreach (var mob in MobManager.Instance.GetAliveMobs())
        {
            if (mob.id == excludeId) continue;
            float dx = mob.transform.position.x - cx, dy = mob.transform.position.y - cy;
            if (dx * dx + dy * dy <= radius * radius)
                result.Add(mob);
        }
        return result;
    }

    // js/authority/attackShapes.js — playerInLine
    public static bool PointInLine(float px, float py, float x1, float y1, float x2, float y2, float width)
    {
        float ldx = x2 - x1, ldy = y2 - y1;
        float lenSq = ldx * ldx + ldy * ldy;
        if (lenSq < 0.001f) return PointInCircle(px, py, x1, y1, width * 0.5f);
        float t = Mathf.Clamp01(((px - x1) * ldx + (py - y1) * ldy) / lenSq);
        float projX = x1 + t * ldx, projY = y1 + t * ldy;
        float dx = px - projX, dy = py - projY;
        float halfW = width * 0.5f;
        return dx * dx + dy * dy <= halfW * halfW;
    }

    public static List<MobInstance> MobsInLine(float x1, float y1, float x2, float y2, float width, int excludeId = -1)
    {
        var result = new List<MobInstance>();
        foreach (var mob in MobManager.Instance.GetAliveMobs())
        {
            if (mob.id == excludeId) continue;
            var p = mob.transform.position;
            if (PointInLine(p.x, p.y, x1, y1, x2, y2, width))
                result.Add(mob);
        }
        return result;
    }

    // js/authority/attackShapes.js — playerInCone
    public static bool PointInCone(float px, float py, float cx, float cy, float direction, float halfAngleRad, float range)
    {
        float dx = px - cx, dy = py - cy;
        float distSq = dx * dx + dy * dy;
        if (distSq > range * range) return false;
        float angle = Mathf.Atan2(dy, dx);
        float diff = Mathf.DeltaAngle(angle * Mathf.Rad2Deg, direction * Mathf.Rad2Deg) * Mathf.Deg2Rad;
        return Mathf.Abs(diff) <= halfAngleRad;
    }

    public static List<MobInstance> MobsInCone(float cx, float cy, float direction, float halfAngleRad, float range, int excludeId = -1)
    {
        var result = new List<MobInstance>();
        foreach (var mob in MobManager.Instance.GetAliveMobs())
        {
            if (mob.id == excludeId) continue;
            var p = mob.transform.position;
            if (PointInCone(p.x, p.y, cx, cy, direction, halfAngleRad, range))
                result.Add(mob);
        }
        return result;
    }

    // js/authority/attackShapes.js — playerInRing
    public static bool PointInRing(float px, float py, float cx, float cy, float innerR, float outerR)
    {
        float dx = px - cx, dy = py - cy;
        float distSq = dx * dx + dy * dy;
        return distSq >= innerR * innerR && distSq <= outerR * outerR;
    }

    // Direction helpers
    public static float DirToEntity(Vector2 from, Vector2 to)
    {
        return Mathf.Atan2(to.y - from.y, to.x - from.x);
    }

    public static float DistToEntity(Vector2 a, Vector2 b)
    {
        float dx = b.x - a.x, dy = b.y - a.y;
        return Mathf.Sqrt(dx * dx + dy * dy);
    }

    public static Vector2 Endpoint(float x, float y, float direction, float length)
    {
        return new Vector2(x + Mathf.Cos(direction) * length, y + Mathf.Sin(direction) * length);
    }
}
```

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): add AttackShapes — circle/line/cone/ring hit detection
```

---

## Task 3: TelegraphSystem

**Files:**
- Create: `Assets/Scripts/Combat/TelegraphSystem.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs`

**JS Source:** `js/authority/telegraphSystem.js`

- [ ] **Step 1: Create TelegraphSystem.cs**

```csharp
// Assets/Scripts/Combat/TelegraphSystem.cs
using UnityEngine;
using System;
using System.Collections.Generic;

/// <summary>
/// Warning indicators before mob attacks.
/// Port of js/authority/telegraphSystem.js.
/// Renders with GL lines in world-space (OnRenderObject).
/// </summary>
public class TelegraphSystem : MonoBehaviour
{
    public static TelegraphSystem Instance;

    public enum Shape { Circle, Line, Cone, Ring, Tiles }

    public class Telegraph
    {
        public int id;
        public Shape shape;
        public float cx, cy, radius;                    // circle/ring
        public float x1, y1, x2, y2, width;             // line
        public float direction, angleDeg, range;         // cone
        public float innerRadius, outerRadius;           // ring
        public Vector2Int[] tiles;                       // tiles
        public float delay, maxDelay;
        public float flashTimer;
        public Color color;
        public int ownerId;
        public Action onResolve;
        public bool resolved;
    }

    List<Telegraph> _active = new List<Telegraph>();
    int _nextId;

    // js/authority/telegraphSystem.js:29
    static readonly Color DEFAULT_COLOR = new Color(1f, 0.31f, 0.31f); // [255,80,80]
    const float FLASH_FRAMES = 8f; // js/authority/telegraphSystem.js:48
    const float TILE = 48f;

    void Awake() { Instance = this; }

    public int Create(Shape shape, float delayFrames, Action onResolve, int ownerId,
        float cx = 0, float cy = 0, float radius = 0,
        float x1 = 0, float y1 = 0, float x2 = 0, float y2 = 0, float width = 20,
        float direction = 0, float angleDeg = 45, float range = 96,
        float innerRadius = 40, float outerRadius = 100,
        Vector2Int[] tiles = null, Color? color = null)
    {
        var t = new Telegraph
        {
            id = _nextId++, shape = shape,
            cx = cx, cy = cy, radius = radius,
            x1 = x1, y1 = y1, x2 = x2, y2 = y2, width = width,
            direction = direction, angleDeg = angleDeg, range = range,
            innerRadius = innerRadius, outerRadius = outerRadius,
            tiles = tiles,
            delay = delayFrames, maxDelay = delayFrames,
            color = color ?? DEFAULT_COLOR,
            ownerId = ownerId,
            onResolve = onResolve
        };
        _active.Add(t);
        return t.id;
    }

    // js/authority/telegraphSystem.js:37-57
    public void Tick()
    {
        for (int i = _active.Count - 1; i >= 0; i--)
        {
            var t = _active[i];
            if (!t.resolved)
            {
                t.delay--;
                if (t.delay <= 0)
                {
                    t.resolved = true;
                    t.flashTimer = FLASH_FRAMES;
                    try { t.onResolve?.Invoke(); } catch (Exception e) { Debug.LogWarning(e); }
                }
            }
            else
            {
                t.flashTimer--;
                if (t.flashTimer <= 0)
                {
                    _active.RemoveAt(i);
                }
            }
        }
    }

    public void Clear() { _active.Clear(); }

    public void ClearOwner(int ownerId)
    {
        _active.RemoveAll(t => t.ownerId == ownerId);
    }

    // Rendering via OnRenderObject — GL lines for each shape
    // js/authority/telegraphSystem.js:60-244
    void OnRenderObject()
    {
        if (_active.Count == 0) return;
        GL.PushMatrix();
        GL.LoadOrtho();
        // Use a simple unlit material
        var mat = GetLineMaterial();
        mat.SetPass(0);

        Camera cam = Camera.main;
        if (cam == null) return;

        foreach (var t in _active)
        {
            float progress = t.resolved ? 1f : (1f - t.delay / t.maxDelay);
            float alpha;
            Color c;
            if (t.resolved)
            {
                // White flash, fading out
                alpha = t.flashTimer / FLASH_FRAMES * 0.5f;
                c = new Color(1f, 1f, 1f, alpha);
            }
            else
            {
                // Pulsing fill
                alpha = 0.15f + 0.05f * Mathf.Sin(progress * Mathf.PI * 4f);
                c = new Color(t.color.r, t.color.g, t.color.b, alpha);
            }

            switch (t.shape)
            {
                case Shape.Circle:
                    DrawCircleGL(cam, t.cx, t.cy, t.radius * progress, c);
                    // Outline at full radius
                    DrawCircleOutlineGL(cam, t.cx, t.cy, t.radius,
                        new Color(t.color.r, t.color.g, t.color.b, 0.3f + progress * 0.4f));
                    break;
                case Shape.Line:
                    DrawLineGL(cam, t.x1, t.y1, t.x2, t.y2, t.width, c);
                    break;
                case Shape.Cone:
                    DrawConeGL(cam, t.cx, t.cy, t.direction, t.angleDeg, t.range * progress, c);
                    break;
                case Shape.Ring:
                    DrawRingGL(cam, t.cx, t.cy, t.innerRadius, t.outerRadius, c);
                    break;
                case Shape.Tiles:
                    if (t.tiles != null)
                        foreach (var tile in t.tiles)
                            DrawTileGL(cam, tile.x, tile.y, c);
                    break;
            }
        }
        GL.PopMatrix();
    }

    // GL helper methods for drawing shapes
    // (Circle = triangle fan, Line = quad, Cone = triangle fan arc, etc.)

    static Material _lineMat;
    static Material GetLineMaterial()
    {
        if (_lineMat == null)
        {
            var shader = Shader.Find("Hidden/Internal-Colored");
            _lineMat = new Material(shader) { hideFlags = HideFlags.HideAndDontSave };
            _lineMat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            _lineMat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            _lineMat.SetInt("_Cull", (int)UnityEngine.Rendering.CullMode.Off);
            _lineMat.SetInt("_ZWrite", 0);
        }
        return _lineMat;
    }

    void DrawCircleGL(Camera cam, float wx, float wy, float r, Color c)
    {
        if (r <= 0) return;
        GL.Begin(GL.TRIANGLES);
        GL.Color(c);
        int segs = 32;
        for (int i = 0; i < segs; i++)
        {
            float a0 = i * Mathf.PI * 2f / segs;
            float a1 = (i + 1) * Mathf.PI * 2f / segs;
            Vector3 center = cam.WorldToViewportPoint(new Vector3(wx, wy, 0));
            Vector3 p0 = cam.WorldToViewportPoint(new Vector3(wx + Mathf.Cos(a0) * r, wy + Mathf.Sin(a0) * r, 0));
            Vector3 p1 = cam.WorldToViewportPoint(new Vector3(wx + Mathf.Cos(a1) * r, wy + Mathf.Sin(a1) * r, 0));
            GL.Vertex3(center.x, center.y, 0);
            GL.Vertex3(p0.x, p0.y, 0);
            GL.Vertex3(p1.x, p1.y, 0);
        }
        GL.End();
    }

    void DrawCircleOutlineGL(Camera cam, float wx, float wy, float r, Color c)
    {
        if (r <= 0) return;
        GL.Begin(GL.LINES);
        GL.Color(c);
        int segs = 32;
        for (int i = 0; i < segs; i++)
        {
            float a0 = i * Mathf.PI * 2f / segs;
            float a1 = (i + 1) * Mathf.PI * 2f / segs;
            Vector3 p0 = cam.WorldToViewportPoint(new Vector3(wx + Mathf.Cos(a0) * r, wy + Mathf.Sin(a0) * r, 0));
            Vector3 p1 = cam.WorldToViewportPoint(new Vector3(wx + Mathf.Cos(a1) * r, wy + Mathf.Sin(a1) * r, 0));
            GL.Vertex3(p0.x, p0.y, 0);
            GL.Vertex3(p1.x, p1.y, 0);
        }
        GL.End();
    }

    void DrawLineGL(Camera cam, float x1, float y1, float x2, float y2, float w, Color c)
    {
        float dx = x2 - x1, dy = y2 - y1;
        float len = Mathf.Sqrt(dx * dx + dy * dy);
        if (len < 0.001f) return;
        float nx = -dy / len * w * 0.5f, ny = dx / len * w * 0.5f;
        GL.Begin(GL.QUADS);
        GL.Color(c);
        Vector3 a = cam.WorldToViewportPoint(new Vector3(x1 + nx, y1 + ny, 0));
        Vector3 b = cam.WorldToViewportPoint(new Vector3(x2 + nx, y2 + ny, 0));
        Vector3 cc2 = cam.WorldToViewportPoint(new Vector3(x2 - nx, y2 - ny, 0));
        Vector3 d = cam.WorldToViewportPoint(new Vector3(x1 - nx, y1 - ny, 0));
        GL.Vertex3(a.x, a.y, 0); GL.Vertex3(b.x, b.y, 0);
        GL.Vertex3(cc2.x, cc2.y, 0); GL.Vertex3(d.x, d.y, 0);
        GL.End();
    }

    void DrawConeGL(Camera cam, float cx, float cy, float dir, float angleDeg, float r, Color c)
    {
        if (r <= 0) return;
        float halfAngle = angleDeg * 0.5f * Mathf.Deg2Rad;
        GL.Begin(GL.TRIANGLES);
        GL.Color(c);
        int segs = 16;
        float startAngle = dir - halfAngle;
        float step = halfAngle * 2f / segs;
        Vector3 center = cam.WorldToViewportPoint(new Vector3(cx, cy, 0));
        for (int i = 0; i < segs; i++)
        {
            float a0 = startAngle + i * step;
            float a1 = startAngle + (i + 1) * step;
            Vector3 p0 = cam.WorldToViewportPoint(new Vector3(cx + Mathf.Cos(a0) * r, cy + Mathf.Sin(a0) * r, 0));
            Vector3 p1 = cam.WorldToViewportPoint(new Vector3(cx + Mathf.Cos(a1) * r, cy + Mathf.Sin(a1) * r, 0));
            GL.Vertex3(center.x, center.y, 0);
            GL.Vertex3(p0.x, p0.y, 0);
            GL.Vertex3(p1.x, p1.y, 0);
        }
        GL.End();
    }

    void DrawRingGL(Camera cam, float cx, float cy, float innerR, float outerR, Color c)
    {
        GL.Begin(GL.QUADS);
        GL.Color(c);
        int segs = 32;
        for (int i = 0; i < segs; i++)
        {
            float a0 = i * Mathf.PI * 2f / segs;
            float a1 = (i + 1) * Mathf.PI * 2f / segs;
            Vector3 i0 = cam.WorldToViewportPoint(new Vector3(cx + Mathf.Cos(a0) * innerR, cy + Mathf.Sin(a0) * innerR, 0));
            Vector3 o0 = cam.WorldToViewportPoint(new Vector3(cx + Mathf.Cos(a0) * outerR, cy + Mathf.Sin(a0) * outerR, 0));
            Vector3 o1 = cam.WorldToViewportPoint(new Vector3(cx + Mathf.Cos(a1) * outerR, cy + Mathf.Sin(a1) * outerR, 0));
            Vector3 i1 = cam.WorldToViewportPoint(new Vector3(cx + Mathf.Cos(a1) * innerR, cy + Mathf.Sin(a1) * innerR, 0));
            GL.Vertex3(i0.x, i0.y, 0); GL.Vertex3(o0.x, o0.y, 0);
            GL.Vertex3(o1.x, o1.y, 0); GL.Vertex3(i1.x, i1.y, 0);
        }
        GL.End();
    }

    void DrawTileGL(Camera cam, int tx, int ty, Color c)
    {
        float wx = tx * TILE, wy = ty * TILE;
        GL.Begin(GL.QUADS);
        GL.Color(c);
        Vector3 a = cam.WorldToViewportPoint(new Vector3(wx, wy, 0));
        Vector3 b = cam.WorldToViewportPoint(new Vector3(wx + TILE, wy, 0));
        Vector3 cc2 = cam.WorldToViewportPoint(new Vector3(wx + TILE, wy + TILE, 0));
        Vector3 d = cam.WorldToViewportPoint(new Vector3(wx, wy + TILE, 0));
        GL.Vertex3(a.x, a.y, 0); GL.Vertex3(b.x, b.y, 0);
        GL.Vertex3(cc2.x, cc2.y, 0); GL.Vertex3(d.x, d.y, 0);
        GL.End();
    }
}
```

- [ ] **Step 2: Add TelegraphSystem to GameBootstrap.cs**

In GameBootstrap's initialization, create the TelegraphSystem singleton on a new GameObject (or on GameManager):

```csharp
    var telegraphGO = new GameObject("TelegraphSystem");
    telegraphGO.AddComponent<TelegraphSystem>();
```

- [ ] **Step 3: Call TelegraphSystem.Instance.Tick() from authority tick**

In the main game loop (wherever `authorityTick` runs), add:
```csharp
    TelegraphSystem.Instance?.Tick();
```

- [ ] **Step 4: `read_console` to verify compilation**

- [ ] **Step 5: Commit**
```
feat(phase5): add TelegraphSystem — 5 shapes with GL rendering
```

---

## Task 4: HazardSystem

**Files:**
- Create: `Assets/Scripts/Combat/HazardSystem.cs`
- Modify: `Assets/Scripts/GameBootstrap.cs`

**JS Source:** `js/authority/hazardSystem.js`

- [ ] **Step 1: Create HazardSystem.cs**

```csharp
// Assets/Scripts/Combat/HazardSystem.cs
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Persistent damage zones. Port of js/authority/hazardSystem.js.
/// </summary>
public class HazardSystem : MonoBehaviour
{
    public static HazardSystem Instance;

    public class Zone
    {
        public int id;
        public float cx, cy, radius;
        public float life, maxLife;
        public float tickRate;      // frames between damage ticks (default 60)
        public float tickDamage;
        public float tickCounter;
        public string tickEffect;   // hit effect type
        public Color color;
        public float slow;          // 0 = no slow, 0.5 = 50% slow
    }

    List<Zone> _zones = new List<Zone>();
    int _nextId;

    void Awake() { Instance = this; }

    // js/authority/hazardSystem.js:10-27
    public int CreateZone(float cx, float cy, float radius, float duration,
        float tickRate = 60f, float tickDamage = 0f, string tickEffect = null,
        float r = 0.39f, float g = 0.78f, float b = 0.39f, float slow = 0f)
    {
        var z = new Zone
        {
            id = _nextId++,
            cx = cx, cy = cy, radius = radius,
            life = duration, maxLife = duration,
            tickRate = tickRate, tickDamage = tickDamage,
            tickEffect = tickEffect,
            color = new Color(r, g, b),
            slow = slow
        };
        _zones.Add(z);
        return z.id;
    }

    // js/authority/hazardSystem.js:29-63
    public void Tick()
    {
        for (int i = _zones.Count - 1; i >= 0; i--)
        {
            var z = _zones[i];
            z.life--;
            if (z.life <= 0) { _zones.RemoveAt(i); continue; }

            // Check party entities inside zone
            bool anyInside = false;
            var alive = PartySystem.Instance.GetAliveEntities();
            foreach (var entity in alive)
            {
                float dx = entity.position.x - z.cx, dy = entity.position.y - z.cy;
                if (dx * dx + dy * dy <= z.radius * z.radius)
                    anyInside = true;
            }

            if (anyInside)
            {
                z.tickCounter++;
                if (z.tickCounter >= z.tickRate)
                {
                    z.tickCounter = 0;
                    // Damage all entities inside
                    foreach (var entity in alive)
                    {
                        float dx = entity.position.x - z.cx, dy = entity.position.y - z.cy;
                        if (dx * dx + dy * dy <= z.radius * z.radius)
                        {
                            int dmg = Mathf.RoundToInt(z.tickDamage);
                            if (dmg > 0)
                            {
                                // Route through DamageSystem for proper entity handling
                                DamageSystem.DealDamageToEntity(entity, dmg, "hazard_zone");
                            }
                        }
                    }
                }
            }
        }
    }

    // Slow query — called by movement systems
    public float GetSlowAtPosition(float x, float y)
    {
        float maxSlow = 0f;
        foreach (var z in _zones)
        {
            if (z.slow <= 0) continue;
            float dx = x - z.cx, dy = y - z.cy;
            if (dx * dx + dy * dy <= z.radius * z.radius)
                maxSlow = Mathf.Max(maxSlow, z.slow);
        }
        return maxSlow;
    }

    public void Clear() { _zones.Clear(); }

    // GL rendering — colored circles
    // js/authority/hazardSystem.js:65-83
    void OnRenderObject()
    {
        if (_zones.Count == 0) return;
        Camera cam = Camera.main;
        if (cam == null) return;

        GL.PushMatrix();
        GL.LoadOrtho();
        TelegraphSystem.Instance?.GetType(); // ensure material exists
        var mat = GetLineMaterial();
        mat.SetPass(0);

        foreach (var z in _zones)
        {
            float lifeRatio = z.life / z.maxLife;
            float alpha = Mathf.Min(0.25f, lifeRatio * 0.25f);
            float pulse = z.radius * (1f + Mathf.Sin(z.life * 0.1f) * 0.05f);
            Color c = new Color(z.color.r, z.color.g, z.color.b, alpha);
            DrawFilledCircle(cam, z.cx, z.cy, pulse, c);
        }

        GL.PopMatrix();
    }

    void DrawFilledCircle(Camera cam, float wx, float wy, float r, Color c)
    {
        GL.Begin(GL.TRIANGLES);
        GL.Color(c);
        int segs = 24;
        for (int i = 0; i < segs; i++)
        {
            float a0 = i * Mathf.PI * 2f / segs;
            float a1 = (i + 1) * Mathf.PI * 2f / segs;
            Vector3 center = cam.WorldToViewportPoint(new Vector3(wx, wy, 0));
            Vector3 p0 = cam.WorldToViewportPoint(new Vector3(wx + Mathf.Cos(a0) * r, wy + Mathf.Sin(a0) * r, 0));
            Vector3 p1 = cam.WorldToViewportPoint(new Vector3(wx + Mathf.Cos(a1) * r, wy + Mathf.Sin(a1) * r, 0));
            GL.Vertex3(center.x, center.y, 0);
            GL.Vertex3(p0.x, p0.y, 0);
            GL.Vertex3(p1.x, p1.y, 0);
        }
        GL.End();
    }

    static Material _lineMat;
    static Material GetLineMaterial()
    {
        if (_lineMat == null)
        {
            var shader = Shader.Find("Hidden/Internal-Colored");
            _lineMat = new Material(shader) { hideFlags = HideFlags.HideAndDontSave };
            _lineMat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            _lineMat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            _lineMat.SetInt("_Cull", (int)UnityEngine.Rendering.CullMode.Off);
            _lineMat.SetInt("_ZWrite", 0);
        }
        return _lineMat;
    }
}
```

- [ ] **Step 2: Add `DamageSystem.DealDamageToEntity` routing method**

In `DamageSystem.cs`, add a static method that routes damage to player or bot based on the entity Transform:

```csharp
    public static void DealDamageToEntity(Transform entity, int damage, string source)
    {
        var playerCtrl = entity.GetComponent<PlayerController>();
        if (playerCtrl != null) { DealDamageToPlayer(damage, source); return; }
        // Check if it's a bot via PartySystem
        var member = PartySystem.Instance?.GetMemberByTransform(entity);
        if (member != null) DealDamageToBot(member, damage, source);
    }
```

- [ ] **Step 3: Wire HazardSystem into GameBootstrap + tick loop**

- [ ] **Step 4: `read_console` to verify compilation**

- [ ] **Step 5: Commit**
```
feat(phase5): add HazardSystem — persistent damage zones with GL rendering
```

---

## Task 5: MobAbilitySystem Framework

**Files:**
- Create: `Assets/Scripts/Combat/MobAbilityContext.cs`
- Create: `Assets/Scripts/Combat/MobAbilitySystem.cs`
- Modify: `Assets/Scripts/MobManager.cs`

**JS Source:** `js/authority/combatSystem.js:470-500` (specCtx construction), `js/authority/mobSystem.js:476-495` (dispatch)

- [ ] **Step 1: Create MobAbilityContext.cs**

```csharp
// Assets/Scripts/Combat/MobAbilityContext.cs

/// <summary>
/// Per-tick context passed to every mob ability function.
/// Mirrors JS specCtx: { dist, dx, dy, player, mobs, hitEffects, bullets, wave, playerDead }
/// js/authority/mobSystem.js:478
/// </summary>
public struct MobAbilityContext
{
    public float dist;           // distance to mob's target
    public float dx, dy;         // delta to target (Unity Y-up)
    public UnityEngine.Transform target;  // mob's assigned party target
    public int wave;             // current wave number
    public bool targetDead;      // is target dead

    /// <summary>
    /// Return value from ability tick. If skip=true, mob skips movement this frame.
    /// </summary>
    public struct Result
    {
        public bool skip;
    }
}
```

- [ ] **Step 2: Create MobAbilitySystem.cs**

```csharp
// Assets/Scripts/Combat/MobAbilitySystem.cs
using UnityEngine;
using System;
using System.Collections.Generic;

/// <summary>
/// Registry + dispatcher for all 348 mob abilities.
/// Each ability is a static Func that takes (MobInstance, MobAbilityContext) → Result.
/// js/authority/combatSystem.js:810 (MOB_SPECIALS registry)
/// js/authority/mobSystem.js:476-495 (dispatch logic)
/// </summary>
public class MobAbilitySystem : MonoBehaviour
{
    public static MobAbilitySystem Instance;

    // Registry: ability name → tick function
    static Dictionary<string, Func<MobInstance, MobAbilityContext, MobAbilityContext.Result>> _registry
        = new Dictionary<string, Func<MobInstance, MobAbilityContext, MobAbilityContext.Result>>();

    void Awake()
    {
        Instance = this;
        // Register all dungeon abilities
        AzurineAbilities.Register(_registry);
        VortalisAbilities.Register(_registry);
        Earth205Abilities.Register(_registry);
        Earth216Abilities.Register(_registry);
        WagashiAbilities.Register(_registry);
    }

    public static void Register(string name, Func<MobInstance, MobAbilityContext, MobAbilityContext.Result> fn)
    {
        _registry[name] = fn;
    }

    /// <summary>
    /// Tick a mob's abilities. Called from MobManager per-mob loop.
    /// Mirrors js/authority/mobSystem.js:476-495 dispatch logic.
    /// </summary>
    public MobAbilityContext.Result TickMob(MobInstance mob, MobAbilityContext ctx)
    {
        var result = new MobAbilityContext.Result();

        // Legacy mob types keyed by type name (js:476-479)
        if (_registry.TryGetValue(mob.type, out var typeFn))
        {
            return typeFn(mob, ctx);
        }

        // Floor 1+ mobs: specials array (js:481-495)
        if (mob.specials != null && mob.specials.Length > 0)
        {
            // Tick each ability in order; first skip=true wins
            foreach (var abilKey in mob.specials)
            {
                if (_registry.TryGetValue(abilKey, out var fn))
                {
                    var r = fn(mob, ctx);
                    if (r.skip) result.skip = true;
                }
            }
        }

        return result;
    }

    // Damage multiplier helper — used by all abilities
    // js/authority/waveSystem.js getMobDamageMultiplier()
    public static float GetMobDamageMultiplier()
    {
        return WaveSystem.Instance != null ? WaveSystem.Instance.GetDamageMultiplier() : 1f;
    }
}
```

- [ ] **Step 3: Add specials array to MobInstance.cs**

```csharp
    [HideInInspector] public string[] specials; // ability keys from MOB_TYPES._specials
```

- [ ] **Step 4: Hook MobAbilitySystem into MobManager.cs mob loop**

After `StatusFX.TickMob(mob)` and before movement, build context and dispatch:

```csharp
    // Build ability context
    var target = PartySystem.Instance.GetMobTarget(mob);
    float dx = target.position.x - mob.transform.position.x;
    float dy = target.position.y - mob.transform.position.y;
    float dist = Mathf.Sqrt(dx * dx + dy * dy);

    var ctx = new MobAbilityContext
    {
        dist = dist, dx = dx, dy = dy,
        target = target,
        wave = WaveSystem.Instance?.CurrentWave ?? 1,
        targetDead = false // resolved by PartySystem
    };

    var abilResult = MobAbilitySystem.Instance.TickMob(mob, ctx);
    if (abilResult.skip) continue;
```

- [ ] **Step 5: Wire MobAbilitySystem singleton in GameBootstrap.cs**

- [ ] **Step 6: `read_console` to verify compilation**

- [ ] **Step 7: Commit**
```
feat(phase5): add MobAbilitySystem framework — registry, dispatcher, context
```

---

## Task 6: Azurine/Base Abilities (70 abilities)

**Files:**
- Create: `Assets/Scripts/Combat/Abilities/AzurineAbilities.cs`

**JS Source:** `js/authority/combatSystem.js:810-6161` (70 abilities)

**Pattern:** Each ability is a static method registered via `Register()`. Every ability follows this template:

```csharp
// Example: ground_pound (js/authority/combatSystem.js:1368)
static MobAbilityContext.Result GroundPound(MobInstance m, MobAbilityContext ctx)
{
    // Timer init
    if (m.specialTimer < 0) m.specialTimer = m.specialCD > 0 ? m.specialCD : 300;
    if (m.specialTimer > 0) { m.specialTimer--; return default; }
    if (ctx.dist > 120) { m.specialTimer = 30; return default; }

    // Telegraph
    TelegraphSystem.Instance.Create(
        TelegraphSystem.Shape.Circle, 40, // 40 frame delay
        () => {
            // On resolve: damage + knockback
            int dmg = Mathf.RoundToInt(m.damage * MobAbilitySystem.GetMobDamageMultiplier());
            var hits = AttackShapes.EntitiesInCircle(m.transform.position.x, m.transform.position.y, 80);
            foreach (var hit in hits)
                DamageSystem.DealDamageToEntity(hit, dmg, "mob_special");
        },
        m.id, cx: m.transform.position.x, cy: m.transform.position.y, radius: 80
    );
    m.specialTimer = m.specialCD > 0 ? m.specialCD : 300;
    return new MobAbilityContext.Result { skip = true };
}
```

- [ ] **Step 1: Create AzurineAbilities.cs with Register() and all 70 abilities**

Port each ability from `js/authority/combatSystem.js:810+`. Each ability reads its JS source for exact values (cooldown, range, damage multiplier, telegraph shape/delay, status effects applied).

**Critical:** Add `specialTimer` and `specialCD` fields to MobInstance.cs:
```csharp
    [HideInInspector] public float specialTimer = -1;
    [HideInInspector] public float specialCD;
    // Per-ability state (reusable scratch fields)
    [HideInInspector] public float abil_f1, abil_f2, abil_f3, abil_f4;
    [HideInInspector] public int abil_i1, abil_i2;
    [HideInInspector] public bool abil_b1, abil_b2;
```

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): port 70 azurine/base mob abilities
```

---

## Task 7: Vortalis Abilities (77 abilities)

**Files:**
- Create: `Assets/Scripts/Combat/Abilities/VortalisAbilities.cs`

**JS Source:** `js/authority/vortalisSpecials.js` (2,680 lines, 77 abilities)

- [ ] **Step 1: Create VortalisAbilities.cs with Register() and all 77 abilities**

Same pattern as Task 6. Port each ability from JS source with exact values.

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): port 77 vortalis mob abilities
```

---

## Task 8: Earth-205 Abilities (61 abilities)

**Files:**
- Create: `Assets/Scripts/Combat/Abilities/Earth205Abilities.cs`

**JS Source:** `js/authority/earth205Specials.js` (3,037 lines, 61 abilities)

- [ ] **Step 1: Create Earth205Abilities.cs with Register() and all 61 abilities**

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): port 61 earth-205 mob abilities
```

---

## Task 9: Earth-216 Abilities (70 abilities)

**Files:**
- Create: `Assets/Scripts/Combat/Abilities/Earth216Abilities.cs`

**JS Source:** `js/authority/earth216Specials.js` (28) + `earth216Specials2.js` (28) + `earth216Specials3.js` (14) = 70 abilities, 2,835 lines

- [ ] **Step 1: Create Earth216Abilities.cs with Register() and all 70 abilities**

Merge all 3 JS files into one C# file.

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): port 70 earth-216 mob abilities
```

---

## Task 10: Wagashi Abilities (70 abilities)

**Files:**
- Create: `Assets/Scripts/Combat/Abilities/WagashiAbilities.cs`

**JS Source:** `js/authority/wagashiSpecials.js` (28) + `wagashiSpecials2.js` (28) + `wagashiSpecials3.js` (14) = 70 abilities, 2,793 lines

- [ ] **Step 1: Create WagashiAbilities.cs with Register() and all 70 abilities**

Merge all 3 JS files into one C# file.

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): port 70 wagashi mob abilities
```

---

## Task 11: Weapon Specials

**Files:**
- Create: `Assets/Scripts/Combat/WeaponSpecials.cs`
- Modify: `Assets/Scripts/MeleeSystem.cs`

**JS Source:** `js/core/meleeSystem.js`

- [ ] **Step 1: Create WeaponSpecials.cs**

```csharp
// Assets/Scripts/Combat/WeaponSpecials.cs
using UnityEngine;
using System.Collections.Generic;

/// <summary>
/// Ninja dash, Storm Blade, War Cleaver weapon specials.
/// Port of js/core/meleeSystem.js
/// </summary>
public static class WeaponSpecials
{
    // === NINJA DASH ===
    // js/core/meleeSystem.js:403-417
    public const float NINJA_DASH_RADIUS = 50f;
    public const float NINJA_DASH_DMG_MULT = 3f;     // 2.0 * 1.5 (js:405)
    public const float NINJA_SPLASH_RADIUS = 60f;     // js:170
    public const float NINJA_SPLASH_DMG_MULT = 0.3f;  // js:166
    public const int NINJA_DASH_GAP = 12;              // js:417
    public const int NINJA_CHAIN_WINDOW = 180;         // js:74

    public static void NinjaDashHit(Vector2 pos, int baseDamage, string ownerId)
    {
        int dashDmg = Mathf.RoundToInt(baseDamage * NINJA_DASH_DMG_MULT);
        var mobs = AttackShapes.MobsInCircle(pos.x, pos.y, NINJA_DASH_RADIUS);
        foreach (var mob in mobs)
            DamageSystem.DealDamageToMob(mob, dashDmg, "melee_dash", ownerId);

        // Splash
        int splashDmg = Mathf.RoundToInt(baseDamage * NINJA_SPLASH_DMG_MULT);
        var splashMobs = AttackShapes.MobsInCircle(pos.x, pos.y, NINJA_SPLASH_RADIUS);
        foreach (var mob in splashMobs)
            DamageSystem.DealDamageToMob(mob, splashDmg, "melee_splash", ownerId);
    }

    // === STORM BLADE ===
    // js/core/meleeSystem.js:198-240
    public const float STORM_SHOCKWAVE_RADIUS = 80f;    // js:202
    public const float STORM_SHOCKWAVE_DMG_MULT = 0.65f; // js:198
    public const float STORM_CHAIN_DMG_MULT = 0.50f;     // js:224
    public const int STORM_CHAIN_MAX = 3;                 // js:228
    public const float STORM_CHAIN_RANGE = 160f;          // js:229

    public static void StormShockwave(Vector2 pos, int baseDamage, string ownerId)
    {
        int swDmg = Mathf.RoundToInt(baseDamage * STORM_SHOCKWAVE_DMG_MULT);
        var hitMobs = AttackShapes.MobsInCircle(pos.x, pos.y, STORM_SHOCKWAVE_RADIUS);

        foreach (var mob in hitMobs)
        {
            DamageSystem.DealDamageToMob(mob, swDmg, "shockwave", ownerId);
            // Chain lightning from each hit mob
            ChainLightning(mob, baseDamage, ownerId, STORM_CHAIN_MAX);
        }
    }

    static void ChainLightning(MobInstance source, int baseDamage, string ownerId, int chainsLeft)
    {
        if (chainsLeft <= 0) return;
        int chainDmg = Mathf.RoundToInt(baseDamage * STORM_CHAIN_DMG_MULT);

        // Find nearest mob within range (not source)
        var nearby = AttackShapes.MobsInCircle(
            source.transform.position.x, source.transform.position.y,
            STORM_CHAIN_RANGE, source.id);

        // Sort by distance, pick up to 1 per chain
        MobInstance closest = null;
        float closestDist = float.MaxValue;
        foreach (var m in nearby)
        {
            if (m.hp <= 0) continue;
            float d = Vector2.Distance(source.transform.position, m.transform.position);
            if (d < closestDist) { closestDist = d; closest = m; }
        }

        if (closest != null)
        {
            DamageSystem.DealDamageToMob(closest, chainDmg, "chain_lightning", ownerId);
            ChainLightning(closest, baseDamage, ownerId, chainsLeft - 1);
        }
    }

    // === WAR CLEAVER ===
    // js/core/meleeSystem.js:85,120,135 (360° arc)
    // js/core/meleeSystem.js:251-268 (piercing blood)
    public const float CLEAVE_BLOOD_DMG_MULT = 0.55f;  // js:251
    public const float CLEAVE_BLOOD_RANGE = 280f;       // js:252
    public const int CLEAVE_BLOOD_ANGLES = 5;            // js:257

    public static void CleaveBlood(MobInstance hitMob, int baseDamage, string ownerId)
    {
        int bloodDmg = Mathf.RoundToInt(baseDamage * CLEAVE_BLOOD_DMG_MULT);
        Vector2 origin = hitMob.transform.position;

        // 5 blood slashes radiating outward from hit mob
        for (int i = 0; i < CLEAVE_BLOOD_ANGLES; i++)
        {
            float angle = i * Mathf.PI * 2f / CLEAVE_BLOOD_ANGLES;
            Vector2 end = AttackShapes.Endpoint(origin.x, origin.y, angle, CLEAVE_BLOOD_RANGE);

            var lineMobs = AttackShapes.MobsInLine(
                origin.x, origin.y, end.x, end.y, 20f, hitMob.id);
            foreach (var m in lineMobs)
                DamageSystem.DealDamageToMob(m, bloodDmg, "piercing_blood", ownerId);
        }
    }

    // === GODSPEED ULTIMATE (Storm) ===
    // js/core/meleeSystem.js:26-31
    public const int GODSPEED_CHARGES_MAX = 10;
    public const float GODSPEED_DURATION = 300f;       // js:27
    public const float GODSPEED_RANGE = 180f;           // js:28
    public const float GODSPEED_STRIKE_INTERVAL = 8f;   // js:29 (was 31)
    public const float GODSPEED_EXECUTE_THRESHOLD = 0.15f; // js:356

    // === MALEVOLENT SHRINE ULTIMATE (Cleave) ===
    // js/core/meleeSystem.js:14-19
    public const int SHRINE_CHARGES_MAX = 10;
    public const float SHRINE_DURATION = 180f;          // js:17
    public const float SHRINE_RANGE = 150f;             // js:18
    public const float SHRINE_SLASH_INTERVAL = 4f;      // js:19
    public const float SHRINE_EXECUTE_THRESHOLD = 0.15f; // js:319
}
```

- [ ] **Step 2: Hook weapon specials into MeleeSystem.cs**

After hit detection in `HitMobsInArc`, check weapon special and dispatch:

```csharp
    // After each mob hit:
    string special = CombatState.Instance.melee.special;
    if (special == "storm")
        WeaponSpecials.StormShockwave(origin, damage, ownerId);
    else if (special == "cleave")
        WeaponSpecials.CleaveBlood(mob, damage, ownerId);
```

For ninja dash, hook into the dash movement system in PlayerController/BotController.

- [ ] **Step 3: `read_console` to verify compilation**

- [ ] **Step 4: Commit**
```
feat(phase5): add weapon specials — ninja dash, storm shockwave/chain, cleave blood
```

---

## Task 12: Status Effect HUD Rendering

**Files:**
- Create: `Assets/Scripts/Combat/StatusFXRenderer.cs`

- [ ] **Step 1: Create StatusFXRenderer.cs**

OnGUI-based rendering of status effect icons/text on player and bots (matching JS draw.js:500-614 patterns). Shows: STUNNED (yellow), SLOWED (blue), SILENCED (purple), FEARED (red), BLEEDING (red), CONFUSED (purple), DISORIENTED (green), ARMOR BREAK (orange), TETHERED (gold), LOCKED (grey).

- [ ] **Step 2: `read_console` to verify compilation**

- [ ] **Step 3: Commit**
```
feat(phase5): add status effect HUD rendering
```

---

## Task 13: Integration + Scene Wiring

**Files:**
- Modify: `Assets/Scripts/GameBootstrap.cs`
- Modify: `Assets/Scripts/GameSceneManager.cs`

- [ ] **Step 1: Create all singletons in GameBootstrap**

Ensure TelegraphSystem, HazardSystem, MobAbilitySystem are created on scene init.

- [ ] **Step 2: Wire cleanup on scene transitions**

In GameSceneManager's scene transition code:
```csharp
    TelegraphSystem.Instance?.Clear();
    HazardSystem.Instance?.Clear();
    StatusFX.ClearAll();
```

- [ ] **Step 3: Wire cleanup on floor advance**

Same cleanup in WaveSystem's floor advance code.

- [ ] **Step 4: Enter Play mode and verify**

- Open dungeon, verify mobs use abilities, telegraphs render, hazard zones visible.

- [ ] **Step 5: `read_console` to check for runtime errors**

- [ ] **Step 6: Final commit**
```
feat(phase5): wire all combat polish systems + scene cleanup
```

---

## Execution Notes

**Tasks 1-5** are sequential (infrastructure must exist before abilities).

**Tasks 6-10** (dungeon abilities) are **fully parallel** — each agent gets one dungeon file, reads the JS source, and ports all abilities using the infrastructure from Tasks 1-5.

**Tasks 11-13** can run after Tasks 1-5 complete.

**Estimated scope:**
| Task | Files | Est. LOC |
|------|-------|----------|
| 1: StatusFX | 3 files | ~350 |
| 2: AttackShapes | 1 file | ~120 |
| 3: TelegraphSystem | 2 files | ~300 |
| 4: HazardSystem | 2 files | ~200 |
| 5: MobAbilitySystem | 3 files | ~150 |
| 6: Azurine abilities | 1 file | ~2,000 |
| 7: Vortalis abilities | 1 file | ~1,800 |
| 8: Earth-205 abilities | 1 file | ~2,000 |
| 9: Earth-216 abilities | 1 file | ~1,900 |
| 10: Wagashi abilities | 1 file | ~1,800 |
| 11: Weapon specials | 2 files | ~250 |
| 12: StatusFX HUD | 1 file | ~200 |
| 13: Integration | 3 files | ~50 |
| **Total** | **~22 files** | **~11,120** |
