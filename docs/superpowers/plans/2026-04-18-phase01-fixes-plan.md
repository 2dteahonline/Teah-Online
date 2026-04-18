# Phase 0-1 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 11 CRITICAL+IMPORTANT issues in Phase 0-1 (movement, collision, camera, scene state) so the foundation is correct before fixing later phases.

**Architecture:** All fixes are to existing scripts in the Unity project at `C:\Users\jeff\Desktop\Unity Proj\TeahOnline`. Every fix matches JS source exactly — no invented values.

**Tech Stack:** Unity 6 (6000.4.0f1), C#, 2D Built-in Render Pipeline.

**Review document:** `docs/superpowers/reviews/2026-04-18-full-phase-review.md`

---

## File Map

### Task 1: GameConfig — Add All Missing Constants
- Modify: `Assets/Scripts/GameConfig.cs`

### Task 2: PlayerController — Knockback, Facing, Disorient, Freeze, Panel Blocking, Moving Flag
- Modify: `Assets/Scripts/PlayerController.cs`
- Modify: `Assets/Scripts/CombatState.cs` (add knockback + facing + moving + freezeTimer fields)

### Task 3: TileCollision — Solid Entity Collision
- Modify: `Assets/Scripts/TileCollision.cs`

### Task 4: GameSceneManager — Fix InDungeon, Add InCombatScene, Emit scene_changed
- Modify: `Assets/Scripts/GameSceneManager.cs`

---

## Shared API Signatures (ALL tasks must use these EXACTLY)

```csharp
// GameConfig constants (Task 1 creates these)
GameConfig.PLAYER_BASE_SPEED        // 7.5f (px/frame at 60fps)
GameConfig.PLAYER_WALL_HW           // 14f
GameConfig.PLAYER_RADIUS            // 23f
GameConfig.MOB_WALL_HW              // 11f
GameConfig.MOB_RADIUS               // 23f
GameConfig.POS_HW                   // 10f
GameConfig.MOB_CROWD_RADIUS         // 46f
GameConfig.BULLET_SPEED             // 9f (already exists)
GameConfig.BULLET_HALF_LONG         // 15f
GameConfig.BULLET_HALF_SHORT        // 4f
GameConfig.ENTITY_R                 // 29f
GameConfig.PLAYER_HITBOX_Y          // 25f (flipped from JS -25)
GameConfig.MUZZLE_OFFSET_Y          // 0f
GameConfig.ORE_COLLISION_RADIUS     // 17f
GameConfig.MINING_PLAYER_R          // 10f
GameConfig.KNOCKBACK_DECAY          // 0.8f
GameConfig.KNOCKBACK_THRESHOLD      // 0.6f
GameConfig.DEFAULT_HITBOX_R         // 33f

// Existing singletons
PanelManager.Instance.AnyOpen()     // true if any panel open
PanelManager.Instance.IsOpen(id)    // true if specific panel open
CombatState.Instance                // player combat state
StatusFX.TickEntity(entity)         // returns StatusFXResult
TileCollision.Instance.PositionClear4Corner(px, py, hw)
```

---

## Task 1: GameConfig — Add All Missing Constants

**Why:** JS `gameConfig.js:6-38` defines 18 constants. C# `GameConfig.cs` only has `BULLET_SPEED`. All other scripts duplicate these values locally, causing drift. Centralizing them matches JS architecture.

**Files:**
- Modify: `Assets/Scripts/GameConfig.cs`

- [x] **Step 1: Replace GameConfig.cs with all constants from JS** ✅ DONE

Replace the entire file contents of `Assets/Scripts/GameConfig.cs` with:

```csharp
// GameConfig.cs — All constants from js/shared/gameConfig.js:6-38
// Y-axis: JS PLAYER_HITBOX_Y=-25 (Y-down) → Unity +25 (Y-up)
public static class GameConfig
{
    // Movement — js/shared/gameConfig.js:8-10
    public const float PLAYER_BASE_SPEED = 7.5f;    // px/frame at 60fps
    public const float PLAYER_WALL_HW = 14f;        // AABB collision half-width
    public const float PLAYER_RADIUS = 23f;          // body-blocking circle radius

    // Mobs — js/shared/gameConfig.js:13-16
    public const float MOB_WALL_HW = 11f;            // mob AABB collision half-width
    public const float MOB_RADIUS = 23f;             // mob body-blocking circle radius
    public const float POS_HW = 10f;                 // spawn/position clearance half-width
    public const float MOB_CROWD_RADIUS = 46f;       // crowding detection radius

    // Bullets — js/shared/gameConfig.js:19-21
    public const float BULLET_SPEED = 9f;            // px/frame
    public const float BULLET_HALF_LONG = 15f;       // along travel direction
    public const float BULLET_HALF_SHORT = 4f;       // perpendicular to travel

    // Hitboxes — js/shared/gameConfig.js:22-24
    public const float ENTITY_R = 29f;               // entity hitbox circle radius
    public const float PLAYER_HITBOX_Y = 25f;        // Unity Y-up (JS: -25 Y-down) — torso center offset from feet
    public const float MUZZLE_OFFSET_Y = 0f;         // no peek (Graal-style)

    // Mining — js/shared/gameConfig.js:27-28
    public const float ORE_COLLISION_RADIUS = 17f;
    public const float MINING_PLAYER_R = 10f;

    // Knockback — js/shared/gameConfig.js:31-32
    public const float KNOCKBACK_DECAY = 0.8f;       // velocity *= this per frame
    public const float KNOCKBACK_THRESHOLD = 0.6f;   // below this → clear to 0

    // Derived — js/shared/gameConfig.js:35
    public const float DEFAULT_HITBOX_R = 33f;       // BULLET_HALF_SHORT + ENTITY_R
}
```

- [ ] **Step 2: read_console — verify 0 errors** (Unity not running — deferred to end)

---

## Task 2: PlayerController — Knockback, Facing, Disorient, Freeze, Panel Blocking, Moving Flag

**Why:** Fixes 6 issues: C1 (knockback missing), C2 (facing not tracked), C4 (disorient wrong), I1 (freeze penalty missing), I3 (moving flag missing), I5 (panel blocking incomplete). All are in PlayerController.cs and CombatState.cs.

**Files:**
- Modify: `Assets/Scripts/PlayerController.cs`
- Modify: `Assets/Scripts/CombatState.cs`

**JS references:**
- Knockback: `inventory.js:3055-3077` — apply knockVx/Vy with wall collision, decay 0.8/frame, threshold 0.6
- Facing: `inventory.js:3099-3111` — `player.dir` from movement, `shootFaceDir` override with timer
- Disorient: `inventory.js:3007-3013` — rotation matrix, NOT additive offset
- Freeze: `inventory.js:2742-2749` + `gunSystem.js:38-41` — `freezeTimer` countdown, `getFreezePenalty()` speed reduction
- Moving: `inventory.js:3025` — `player.moving = dx !== 0 || dy !== 0`
- Panel blocking: `inventory.js:2644-2645` — `UI.anyOpen() && !UI.isOpen('toolbox')`

- [x] **Step 1: Add fields to CombatState.cs** ✅ DONE — knockVx/Vy, dir, moving, freezeTimer, freezePenalty + resets in all 4 methods

In `CombatState.cs`, after the `phaseTimer` field (line 74), add:

```csharp
    // --- Knockback state --- js/client/ui/inventory.js:3055-3077
    public float knockVx, knockVy;

    // --- Player facing --- js/client/ui/inventory.js:3099-3111
    // 0=up(+Y), 1=down(-Y), 2=left(-X), 3=right(+X)
    // NOTE: JS uses 0=up,1=down,2=left,3=right in canvas Y-down.
    // In Unity Y-up, "up" is still dir=0, "down" is still dir=1.
    // The dir values are sprite-row indices, not vectors.
    public int dir;

    // --- Movement state --- js/client/ui/inventory.js:3025
    public bool moving;

    // --- Freeze penalty from shooting --- js/client/ui/inventory.js:2742-2749
    // Set by GunSystem when player fires. Counts down each frame.
    public float freezeTimer;
    public float freezePenalty; // cached from gun's freezePenalty stat
```

In `CombatState.ResetForDungeon()`, before the comment `// gold persists`, add:

```csharp
        knockVx = 0; knockVy = 0;
        freezeTimer = 0;
```

In `CombatState.ResetForFloor()`, at the end before the closing brace, add:

```csharp
        knockVx = 0; knockVy = 0;
        freezeTimer = 0;
```

In `CombatState.Respawn()`, after `ResetUltimateOnDeath();`, add:

```csharp
        knockVx = 0; knockVy = 0;
        freezeTimer = 0;
```

In `CombatState.GameOver()`, after `dashDirX = 0; dashDirY = 0;`, add:

```csharp
        knockVx = 0; knockVy = 0;
        freezeTimer = 0;
```

- [x] **Step 2: Rewrite PlayerController.cs** ✅ DONE — knockback, facing, disorient rotation, freeze, hazard slow, panel blocking, moving flag, fishing block

Replace the entire contents of `Assets/Scripts/PlayerController.cs` with:

```csharp
// PlayerController — Phase 0
// Source of truth: docs/gdd/movement-collision.md
// Underlying JS: js/client/ui/inventory.js:2640-3120, js/shared/gameConfig.js
// Y-axis: JS canvas Y-down, Unity Y-up. W=+Y, S=-Y in Unity.
// 1 Unity unit = 1 JS pixel for Phase 0.
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    // Speed — js/shared/gameConfig.js:8
    public float speedPxPerSec = GameConfig.PLAYER_BASE_SPEED * 60f; // 7.5 px/frame * 60 = 450 px/sec

    private TileCollision walls;

    void Start()
    {
        walls = TileCollision.Instance;
        if (walls == null) walls = Object.FindAnyObjectByType<TileCollision>();
        if (walls == null) Debug.LogError("[PlayerController] No TileCollision found in scene.");
    }

    void Update()
    {
        var cs = CombatState.Instance;

        // Block movement when dead — js/client/ui/inventory.js:2660-2740
        if (cs != null && cs.isDead) return;

        // Block movement during ninja dash — MeleeSystem controls position
        if (cs != null && cs.dashing) return;

        // --- Panel blocking --- js/client/ui/inventory.js:2644-2645
        // UI.anyOpen() && !UI.isOpen('toolbox') blocks movement
        bool panelBlocksMovement = false;
        var pm = PanelManager.Instance;
        if (pm != null)
            panelBlocksMovement = pm.AnyOpen() && !pm.IsOpen("toolbox");

        // Chat typing also blocks — js/client/ui/inventory.js:2644
        bool isTyping = ChatSystem.Instance != null && ChatSystem.Instance.IsOpen;

        // --- Freeze timer countdown --- js/client/ui/inventory.js:2743
        if (cs != null && cs.freezeTimer > 0)
            cs.freezeTimer -= 60f * Time.deltaTime; // frame-based countdown

        // --- Speed multiplier --- js/client/ui/inventory.js:2745-2749
        float speedMult = 1.0f;
        if (cs != null && cs.freezeTimer > 0)
        {
            // js/core/gunSystem.js:38-41 — getFreezePenalty()
            float maxPenalty = cs.freezePenalty;
            speedMult = 1.0f - maxPenalty;
        }

        // --- StatusFX tick --- js/authority/combatSystem.js:229-323
        var fxResult = StatusFX.TickEntity(cs);

        // Rooted — zero velocity — js/combatSystem.js:243-247
        if (fxResult.rooted)
        {
            if (cs != null) cs.moving = false;
            return;
        }

        // StatusFX speed multiplier (slow/tether) — js/combatSystem.js:235-242
        speedMult *= fxResult.speedMult;

        // Hazard zone slow — js/client/ui/inventory.js:2761-2771
        // For each hazard zone, if player inside radius: speedMult *= (1 - zone.slow)
        if (HazardSystem.Instance != null)
        {
            Vector2 pPos = transform.position;
            foreach (var zone in HazardSystem.Instance.ActiveZones)
            {
                float dist = Vector2.Distance(pPos, new Vector2(zone.x, zone.y));
                if (dist <= zone.radius)
                    speedMult *= (1f - zone.slow);
            }
        }

        // --- Input --- js/client/ui/inventory.js:2794
        float mx = 0f, my = 0f;
        bool inputBlocked = isTyping || panelBlocksMovement;
        // Also block if fishing active — js/client/ui/inventory.js:2818
        if (FishingSystem.Instance != null && FishingSystem.Instance.fishingActive)
            inputBlocked = true;

        if (!inputBlocked)
        {
            if (Input.GetKey(KeyCode.A)) mx -= 1f;
            if (Input.GetKey(KeyCode.D)) mx += 1f;
            if (Input.GetKey(KeyCode.W)) my += 1f;
            if (Input.GetKey(KeyCode.S)) my -= 1f;
        }

        // Raw input direction for facing (before status overrides)
        float dx = mx, dy = my;

        // --- Fear override --- js/combatSystem.js:276-286
        if (fxResult.feared)
        {
            mx = fxResult.fearDirX;
            my = fxResult.fearDirY;
        }

        // --- Confuse --- js/combatSystem.js:268-271
        if (fxResult.confused)
        {
            float tmp = mx; mx = -my; my = -tmp;
        }

        // --- Normalize --- js/client/ui/inventory.js:3015-3016
        float mag = Mathf.Sqrt(mx * mx + my * my);
        if (mag > 0f) { mx /= mag; my /= mag; }

        // --- Disorient --- js/client/ui/inventory.js:3007-3013
        // ROTATION MATRIX, not additive offset
        if (fxResult.disoriented && (mx != 0f || my != 0f))
        {
            float drift = (Random.value - 0.5f) * 0.6f; // small random angle
            float cos = Mathf.Cos(drift), sin = Mathf.Sin(drift);
            float omx = mx, omy = my;
            mx = omx * cos - omy * sin;
            my = omx * sin + omy * cos;
        }

        // --- Moving flag --- js/client/ui/inventory.js:3025
        if (cs != null) cs.moving = (dx != 0 || dy != 0);

        // --- Effective speed --- js/client/ui/inventory.js:3018-3023
        float bootsBonus = 0f;
        var inv = InventorySystem.Instance;
        if (inv != null)
            bootsBonus = ItemData.GetBootsSpeedBonus(inv.equippedBoots);
        float totalSpeed = (speedPxPerSec + bootsBonus * 60f) * speedMult;

        float vx = mx * totalSpeed * Time.deltaTime;
        float vy = my * totalSpeed * Time.deltaTime;

        // --- Position update with collision --- js/client/ui/inventory.js:3027-3053
        Vector2 pos = transform.position;
        if (walls != null)
        {
            // X axis
            float nx = pos.x + vx;
            if (walls.PositionClear4Corner(nx, pos.y, GameConfig.PLAYER_WALL_HW))
                pos.x = nx;

            // Y axis
            float ny = pos.y + vy;
            if (walls.PositionClear4Corner(pos.x, ny, GameConfig.PLAYER_WALL_HW))
                pos.y = ny;

            // Corner nudge — js/client/ui/inventory.js:3083-3095
            if (vx != 0 && vy != 0)
            {
                bool stuckX = !walls.PositionClear4Corner(pos.x + vx, pos.y, GameConfig.PLAYER_WALL_HW);
                bool stuckY = !walls.PositionClear4Corner(pos.x, pos.y + vy, GameConfig.PLAYER_WALL_HW);
                if (stuckX && stuckY)
                {
                    const float nudge = 2f;
                    float[][] nudges = { new[]{nudge,0f}, new[]{-nudge,0f}, new[]{0f,nudge}, new[]{0f,-nudge} };
                    foreach (var n in nudges)
                    {
                        float tx = pos.x + n[0], ty = pos.y + n[1];
                        if (walls.PositionClear4Corner(tx, ty, GameConfig.PLAYER_WALL_HW))
                        {
                            pos.x = tx; pos.y = ty;
                            break;
                        }
                    }
                }
            }
        }
        else
        {
            pos.x += vx; pos.y += vy;
        }

        // --- Knockback --- js/client/ui/inventory.js:3055-3077
        if (cs != null && (cs.knockVx != 0f || cs.knockVy != 0f))
        {
            if (walls != null)
            {
                // X knockback with collision
                float knx = pos.x + cs.knockVx * 60f * Time.deltaTime;
                if (walls.PositionClear4Corner(knx, pos.y, GameConfig.PLAYER_WALL_HW))
                    pos.x = knx;
                else
                    cs.knockVx = 0f;

                // Y knockback with collision
                float kny = pos.y + cs.knockVy * 60f * Time.deltaTime;
                if (walls.PositionClear4Corner(pos.x, kny, GameConfig.PLAYER_WALL_HW))
                    pos.y = kny;
                else
                    cs.knockVy = 0f;
            }
            else
            {
                pos.x += cs.knockVx * 60f * Time.deltaTime;
                pos.y += cs.knockVy * 60f * Time.deltaTime;
            }

            // Decay — js/shared/gameConfig.js:31-32
            float decay = Mathf.Pow(GameConfig.KNOCKBACK_DECAY, 60f * Time.deltaTime);
            cs.knockVx *= decay;
            cs.knockVy *= decay;
            if (Mathf.Abs(cs.knockVx) < GameConfig.KNOCKBACK_THRESHOLD) cs.knockVx = 0f;
            if (Mathf.Abs(cs.knockVy) < GameConfig.KNOCKBACK_THRESHOLD) cs.knockVy = 0f;
        }

        transform.position = new Vector3(pos.x, pos.y, transform.position.z);

        // --- Facing direction --- js/client/ui/inventory.js:3099-3111
        // Use raw input direction (dx/dy), not status-overridden direction
        // JS: dy<0 → dir=1(down), dy>0 → dir=0(up), dx<0 → dir=2(left), dx>0 → dir=3(right)
        // JS is canvas Y-down, so dy<0 means UP key (W). In Unity, W gives dy>0.
        // So: Unity dy>0(W pressed) → dir=0(up), dy<0(S pressed) → dir=1(down)
        if (cs != null && (dx != 0 || dy != 0))
        {
            if (dy > 0) cs.dir = 0;  // up
            if (dy < 0) cs.dir = 1;  // down
            if (dx < 0) cs.dir = 2;  // left
            if (dx > 0) cs.dir = 3;  // right
        }

        // Shoot-face override — js/client/ui/inventory.js:3107-3111
        // shootFaceTimer is set by GunSystem when player fires
        // (will be wired in Phase 2-3 fixes)
    }
}
```

- [ ] **Step 3: read_console — verify 0 errors**

Note: This may produce warnings if `HazardSystem.Instance.ActiveZones` or `FishingSystem.Instance.fishingActive` don't exist yet. If so, wrap those checks in null-safe patterns or add stub properties. Fix any compilation errors before proceeding.

- [ ] **Step 4: Commit**

```
Phase 0-1 fix: PlayerController — knockback, facing, disorient, freeze penalty, panel blocking, moving flag
```

---

## Task 3: TileCollision — Solid Entity Collision

**Why:** Fix C3 — JS `isSolid()` at `sceneManager.js:580-585` checks ALL solid entities at runtime, not just buildings/towers. Trees, fountains, warehouse barriers, and other solid entities are walk-through in Unity.

**Files:**
- Modify: `Assets/Scripts/TileCollision.cs`

**JS reference:** `sceneManager.js:574-585`
```javascript
function isSolid(col, row) {
  if (!level || !collisionGrid) return true;
  if (!(col >= 0) || !(row >= 0) || col >= level.widthTiles || row >= level.heightTiles) return true;
  const gridRow = collisionGrid[row];
  if (!gridRow) return true;
  if (gridRow[col] === 1) return true;
  for (const e of levelEntities) {
    if (!e.solid) continue;
    const w = e.w ?? 1;
    const h = e.h ?? 1;
    if (col >= e.tx && col < e.tx + w && row >= e.ty && row < e.ty + h) return true;
  }
  return false;
}
```

- [x] **Step 1: Remove the building/tower filter from TileCollision.LoadFromLevel()** ✅ DONE — all solid entities now block movement

In `TileCollision.cs`, replace lines 65-87 (the solid entities section) with:

```csharp
        // Solid entities: ALL solid entities get baked into the grid.
        // js/core/sceneManager.js:580-585 — isSolid checks ALL entities with e.solid=true
        // Previously only building/tower types were added — this missed trees, fountains,
        // warehouse barriers, and other solid entities.
        if (level.entities != null)
        {
            foreach (var e in level.entities)
            {
                if (!e.solid) continue;
                int w = e.w > 0 ? e.w : 1;
                int h = e.h > 0 ? e.h : 1;
                for (int dx = 0; dx < w; dx++)
                {
                    for (int dy = 0; dy < h; dy++)
                    {
                        int col = e.tx + dx;
                        int row = (gridHeight - 1) - (e.ty + dy);
                        if (col >= 0 && col < gridWidth && row >= 0 && row < gridHeight)
                            collisionGrid[col, row] = 1;
                    }
                }
            }
        }
```

The portal carve-out section (lines 90-111) stays as-is — portals override solid tiles.

- [ ] **Step 2: read_console — verify 0 errors**

- [ ] **Step 3: Commit**

```
Phase 0-1 fix: TileCollision — all solid entities block movement (not just buildings/towers)
```

---

## Task 4: GameSceneManager — Fix InDungeon, Add InCombatScene

**Why:** Fix C5 — JS `Scene.inDungeon` only returns true when `_current === 'dungeon'`. The C# version incorrectly includes cave, azurine, vortalis, etc. JS has separate getters for each (`Scene.inCave`, `Scene.inAzurine`). Also adds missing `scene_changed` event (M3) via a C# Action.

**Files:**
- Modify: `Assets/Scripts/GameSceneManager.cs`

**JS reference:** `sceneManager.js:62-81`
```javascript
get inDungeon() { return this._current === 'dungeon'; }
get inLobby()   { return this._current === 'lobby'; }
get inCave()    { return this._current === 'cave'; }
// ... etc, each is exact string match
```

- [x] **Step 1: Fix InDungeon and add all scene getters** ✅ DONE — 18 individual getters, InDungeon = exact match only, InAnyCombatScene for "mobs spawning?"

In `GameSceneManager.cs`, replace lines 174-193 with:

```csharp
    // Scene type queries — js/core/sceneManager.js:62-81
    // EACH getter is an EXACT string match. InDungeon is ONLY 'dungeon' (the fallback).
    public bool Is(string scene) => CurrentScene == scene;
    public bool InLobby => CurrentScene == "lobby";
    public bool InCave => CurrentScene == "cave";
    public bool InMine => CurrentScene == "mine";
    public bool InCooking => CurrentScene == "cooking";
    public bool InFarm => CurrentScene == "farm";
    public bool InAzurine => CurrentScene == "azurine";
    public bool InGunsmith => CurrentScene == "gunsmith";
    public bool InTestArena => CurrentScene == "test_arena";
    public bool InHideSeek => CurrentScene == "hideseek";
    public bool InMafiaLobby => CurrentScene == "mafia_lobby";
    public bool InSkeld => CurrentScene == "skeld";
    public bool InVortalis => CurrentScene == "vortalis";
    public bool InEarth205 => CurrentScene == "earth205";
    public bool InWagashi => CurrentScene == "wagashi";
    public bool InEarth216 => CurrentScene == "earth216";
    public bool InCasino => CurrentScene == "casino";
    public bool InSpar => CurrentScene == "spar";

    // InDungeon — ONLY the fallback 'dungeon' state — js/core/sceneManager.js:64
    public bool InDungeon => CurrentScene == "dungeon";

    // Convenience: true for ANY combat dungeon (cave + all specific dungeons + fallback)
    // This is what the old InDungeon was trying to be. Use this for "are we fighting mobs?"
    public bool InCombatArena => CurrentLevel != null &&
        (CurrentLevel.id == "warehouse_01" || CurrentLevel.id == "azurine_dungeon_01"
         || CurrentLevel.id == "test_arena");

    // InAnyCombatScene — true for any scene where mobs spawn (broader than InCombatArena)
    public bool InAnyCombatScene => InCave || InDungeon || InAzurine || InVortalis
        || InEarth205 || InWagashi || InEarth216;
```

- [x] **Step 2: Add scene_changed event** ✅ DONE — OnSceneChanged(from, to) fires on scene transitions

At the top of `GameSceneManager`, after the singleton fields, add:

```csharp
    // Scene change event — js/core/sceneManager.js:57-58
    public event System.Action<string, string> OnSceneChanged; // (fromScene, toScene)
```

In `UpdateSceneState()`, before setting CurrentScene, capture the old value and fire the event after:

```csharp
    void UpdateSceneState(LevelEntry entry)
    {
        string prevScene = CurrentScene;

        if (entry.flags == null) { CurrentScene = "lobby"; }
        else
        {
            var f = entry.flags;
            if (f.isLobby) CurrentScene = "lobby";
            else if (f.isCave) CurrentScene = "cave";
            else if (f.isMine) CurrentScene = "mine";
            else if (f.isCooking) CurrentScene = "cooking";
            else if (f.isFarm) CurrentScene = "farm";
            else if (f.isAzurine) CurrentScene = "azurine";
            else if (f.isGunsmith) CurrentScene = "gunsmith";
            else if (f.isTestArena) CurrentScene = "test_arena";
            else if (f.isHideSeek) CurrentScene = "hideseek";
            else if (f.isMafiaLobby) CurrentScene = "mafia_lobby";
            else if (f.isSkeld) CurrentScene = "skeld";
            else if (f.isVortalis) CurrentScene = "vortalis";
            else if (f.isEarth205) CurrentScene = "earth205";
            else if (f.isWagashi) CurrentScene = "wagashi";
            else if (f.isEarth216) CurrentScene = "earth216";
            else if (f.isCasino) CurrentScene = "casino";
            else if (f.isSpar) CurrentScene = "spar";
            else CurrentScene = "dungeon";
        }

        if (prevScene != CurrentScene)
            OnSceneChanged?.Invoke(prevScene, CurrentScene);
    }
```

- [x] **Step 3: Fix all consumers of the old InDungeon** ✅ DONE — UltimateSystem.cs + InteractableSystem.cs → InAnyCombatScene. ShopStation/WaveSystem were method names, not property refs.

Search for all uses of `InDungeon` in the Unity project. Any that meant "are we in a combat scene with mobs?" should switch to `InAnyCombatScene` or `InCombatArena`. Any that meant the specific JS `Scene.inDungeon` stays as `InDungeon`.

Run: `grep -rn "InDungeon" Assets/Scripts/` and fix each usage. Common cases:
- `LootDropSystem.cs` — drop spawning → use `InAnyCombatScene`
- `WaveSystem.cs` — wave checks → use `InCombatArena` (already correct via level ID check)
- `ShopSystem.cs` — shop spawning → check what JS does for each case

- [ ] **Step 4: read_console — verify 0 errors**

- [ ] **Step 5: Commit**

```
Phase 0-1 fix: GameSceneManager — InDungeon matches JS exactly, add all scene getters + scene_changed event
```

---

## Post-Fix: Verify in Play Mode

After all 4 tasks are committed:

- [ ] Enter Play mode
- [ ] WASD movement works with correct speed
- [ ] Trees/fountains/barriers block movement
- [ ] Open any panel (M for minimap) → movement blocked
- [ ] Close panel → movement resumes
- [ ] Check console for 0 errors
