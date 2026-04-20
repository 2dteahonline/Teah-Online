# Phase 9b: Mafia Game Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the full Among Us-style Mafia game mode to Unity — state machine, kills, meetings/voting, sabotage, FOV raycasting, vents, cameras, role abilities, and all UI. No bot AI movement this pass (bots spawn but stand still).

**Architecture:** Singleton `MafiaSystem` drives a 9-phase state machine. `MafiaData` holds all constants/colors/roles. `MafiaFOV` renders wall-aware FOV via OnGUI. `MafiaPanelUI` handles all meeting/voting/sabotage/HUD rendering via OnGUI. `VentSystem` and `SkeldCameraSystem` are standalone singletons. All scripts follow the existing CasinoSystem pattern — singleton on persistent CombatManager GameObject, wired via GameBootstrap.

**Tech Stack:** Unity 6 (6000.4.0f1), 2D Built-in Render Pipeline, OnGUI for all UI, ShopFramework helpers.

**Scope exclusion:** Bot AI movement/pathfinding is deferred. Bots spawn at start positions and exist as entities, but don't move, pathfind, or do tasks. Bot voting still works (random). Mafia lobby settings UI is deferred — uses defaults.

---

## File Map

| # | File | Action | Responsibility |
|---|------|--------|---------------|
| 1 | `Scripts/Mafia/MafiaData.cs` | CREATE | Constants, 10 colors, 14 room centers, 7 subroles, 3 sabotage types, lobby setting defaults, role assignment |
| 2 | `Scripts/Mafia/MafiaSystem.cs` | CREATE | Singleton authority — 9-phase state machine, participant registry, kills, meetings, voting, sabotage, role abilities, win conditions, endMatch |
| 3 | `Scripts/Mafia/VentSystem.cs` | CREATE | 4 vent networks, enter/exit/cycle, engineer time/cooldown, animation |
| 4 | `Scripts/Mafia/SkeldCameraSystem.cs` | CREATE | 4 camera feeds, 2x2 grid overlay, visual effects |
| 5 | `Scripts/Mafia/MafiaFOV.cs` | CREATE | DDA raycasting, visibility polygon, lights dim, O2 fog, ghost overlay |
| 6 | `Scripts/Mafia/MafiaPanelUI.cs` | CREATE | Role reveal, splashes, meeting/voting, ejection, HUD buttons, sabotage fix panels, sabotage picker, vitals, shapeshifter picker, death alert |
| 7 | `Scripts/UI/MafiaSettingsPanelUI.cs` | FIX | Leave destination, tab indices |
| 8 | `Scripts/UI/SkeldTaskPanelUI.cs` | FIX | Task selection/reset, isStepDone, TaskBar setting |
| 9 | `Scripts/GameBootstrap.cs` | MODIFY | Wire MafiaSystem, VentSystem, SkeldCameraSystem, MafiaFOV, MafiaPanelUI |
| 10 | `Scripts/ChatSystem.cs` | MODIFY | Add /mafia, /role debug commands |
| 11 | `Scripts/PlayerController.cs` | MODIFY | Freeze during mafia phases |
| 12 | `Scripts/GameSceneManager.cs` | MODIFY | Skeld leave handler cleanup |

---

## Key Unity APIs (for subagents)

```
TileCollision.Instance.IsSolid(col, row) → bool
TileCollision.Instance.PositionClear4Corner(px, py, hw) → bool
TileCollision.TILE = 48f
GameConfig.PLAYER_BASE_SPEED = 7.5f (px/frame)
GameConfig.PLAYER_WALL_HW = 14f
GameSceneManager.Instance.Is("skeld") / .InSkeld / .StartTransition(levelId, tx, ty)
GameSceneManager.Instance.CurrentLevel → LevelEntry
CombatState.Instance.gold, .hp, .isDead, .dir
ShopFramework.WhiteTex, .MakeStyle(size, color, style, anchor), .DrawRect(...)
PanelManager.Instance.Toggle(id), .IsOpen(id), .AnyOpen()
ChatSystem.Instance.AddMessage(text, color)
CasinoSystem singleton pattern: Instance { get; private set; }, Awake() { Instance = this; }
```

---

### Task 1: MafiaData.cs — All constants, colors, roles, sabotage types

**Files:**
- Create: `Assets/Scripts/Mafia/MafiaData.cs`

**JS sources to READ (mandatory):**
- `js/shared/mafiaGameData.js` (144 lines) — all constants
- `js/shared/mafiaRoleData.js` (196 lines) — role definitions + assignment

- [ ] **Step 1: Create `Scripts/Mafia/` directory**

- [ ] **Step 2: Write MafiaData.cs**

Must contain ALL of the following with exact JS citations:

**Match config** (mafiaGameData.js:8-10):
```csharp
public const int BOT_COUNT = 8;        // :8
public const int IMPOSTOR_COUNT = 1;   // :9
```

**Vision** (mafiaGameData.js:13):
```csharp
public const float FOV_BASE_RADIUS = 4.5f; // tiles — :13
```

**Kill/meeting timers** (mafiaGameData.js:16-26) — ALL in seconds (÷60 from JS frames):
```csharp
public const float KILL_RANGE = 120f;         // px — :16
public const float KILL_COOLDOWN = 30f;       // seconds (1800/60) — :17
public const float DISCUSSION_TIME = 15f;     // seconds (900/60) — :18
public const float VOTING_TIME = 30f;         // seconds (1800/60) — :19
public const float EJECTION_TIME = 5f;        // seconds (300/60) — :20
public const float VOTE_RESULTS_TIME = 15f;   // seconds (900/60) — :21
public const float REPORT_RANGE = 150f;       // px — :22
public const float EMERGENCY_RANGE = 120f;    // px — :23
public const float SABOTAGE_COOLDOWN = 30f;   // seconds (1800/60) — :24
public const float REACTOR_TIMER = 30f;       // seconds (1800/60) — :25
public const float O2_TIMER = 30f;            // seconds (1800/60) — :26
```

**Bot timing** (mafiaGameData.js:29-31):
```csharp
public const float BOT_TASK_PAUSE_MIN = 3f;   // seconds (180/60) — :29
public const float BOT_TASK_PAUSE_MAX = 5f;   // seconds (300/60) — :30
public const int BOT_PATH_LIMIT = 8000;       // :31
```

**Return** (mafiaGameData.js:34-36):
```csharp
public const string RETURN_LEVEL = "mafia_lobby"; // :34
public const int RETURN_TX = 25;               // :35
public const int RETURN_TY = 20;               // :36
```

**Timing constants used by system** (mafiaSystem.js):
```csharp
public const float ROLE_REVEAL_TIME = 3f;      // 180/60 — mafiaSystem.js:199
public const float REPORT_SPLASH_TIME = 2f;    // 120/60 — mafiaSystem.js:625
public const float VOTE_REVEAL_INTERVAL = 0.75f; // 45/60 — mafiaSystem.js:793
public const float SHIFT_ANIM_TIME = 0.75f;    // 45/60 — mafiaSystem.js:433
```

**Kill distance map** (mafiaSystem.js:70-75):
```csharp
public static float GetKillRange(string distance) => distance switch {
    "Short" => 80f,
    "Medium" => 120f,
    "Long" => 180f,
    _ => 120f
};
```

**10 colors** (mafiaGameData.js:39-50) — struct with name, body Color, dark Color.

**14 room centers** (mafiaGameData.js:117-135) — dictionary string→Vector2Int.

**Spawn point** (mafiaGameData.js:136): tx=74, ty=18.

**3 sabotage types** (mafiaGameData.js:58-74) — struct with id, label, timer (seconds), panel keys array, simultaneous bool.

**Sabotage panel positions** (mafiaGameData.js:78-84) — dictionary string→Vector2Int (tx, ty).

**Lobby settings defaults** (mafiaGameData.js:88-112) — class with all 18 fields.

**7 subrole definitions** (mafiaRoleData.js:7-83) — struct with id, team (crew/impostor), description, color, settings dictionary.

**Role assignment chances** (mafiaRoleData.js:87-95).

**Role assignment method** (mafiaRoleData.js:125-195):
```csharp
public static void AssignRoles(List<MafiaParticipant> participants, int impostorCount, MafiaRoleSettings roleSettings)
```
- Player NEVER impostor (mafiaRoleData.js:129)
- Shuffle bots, first N are impostor
- Weighted random subrole from chance percentages

- [ ] **Step 3: Compile check**

Run: `read_console` — expect 0 errors from MafiaData.cs

- [ ] **Step 4: Commit**

```
git add Assets/Scripts/Mafia/MafiaData.cs
git commit -m "Phase 9b Task 1: MafiaData — constants, colors, roles, sabotage types"
```

---

### Task 2: MafiaSystem.cs — State machine, kills, meetings, voting, sabotage, role abilities

**Files:**
- Create: `Assets/Scripts/Mafia/MafiaSystem.cs`

**JS sources to READ (mandatory):**
- `js/authority/mafiaSystem.js` (1534 lines) — entire file

- [ ] **Step 1: Write MafiaSystem.cs skeleton — state + participant classes**

**MafiaParticipant class** (mafiaSystem.js:105-183):
```csharp
public class MafiaParticipant {
    public string id;          // "player" or "bot_N"
    public string name;
    public string role;        // "crewmate" or "impostor"
    public string subrole;     // null or subrole id
    public GameObject entity;  // the actual game object
    public bool isBot;
    public bool isLocal;
    public bool alive = true;
    public string votedFor;    // participant id, "skip", or null
    public int emergenciesUsed;
    public MafiaColor color;
    // Bot AI state (placeholder for later)
    public float pauseTimer;
}
```

**MafiaBody class** (mafiaSystem.js:315-321):
```csharp
public class MafiaBody {
    public float x, y;
    public MafiaColor color;
    public string name, id;
    public float dissolveTimer, dissolveMax; // Viper only
}
```

**MafiaState fields** — port ALL fields from mafiaSystem.js:7-45:
- phase (string), phaseTimer (float, seconds)
- playerRole, playerSubrole, playerIsGhost
- participants (List), bodies (List)
- killCooldown (float, seconds)
- sabotage struct: active, timer, cooldown, fixers dict, fixedPanels dict
- meeting struct: caller, type, votes dict, discussionTimer, votingTimer, splashTimer, voteResults, skipVoters, voteOrder, revealedCount, revealTimer, resultsTimer
- ejection struct: name, wasImpostor, timer, message
- taskProgress: done, total
- lastMeetingEndTime
- roleState struct: trackedTarget, trackTimer, trackCooldown, vitalsOpen, vitalsTimer, vitalsCooldown, shiftedAs, shiftTimer, shiftCooldown, shiftAnim, invisible, invisTimer, invisCooldown, deathAlert
- reportedBody
- settings (MafiaSettings snapshot)
- roleSettings

- [ ] **Step 2: Write StartMatch()** (mafiaSystem.js:84-225)

Key behavior:
1. Clear mobs via MobManager.Instance if available
2. Assign player their chosen color
3. Spawn bot entities as GameObjects (standalone, NOT in MobManager) — position at spawn with grid offset: `offsetX = ((i%4) - 1.5f) * 30`, `offsetY = (Mathf.Floor(i/4f) - 0.5f) * 30` (mafiaSystem.js:139-140)
4. Bot hp = -1 (skip HP bars)
5. Build participants list
6. Call MafiaData.AssignRoles()
7. Set phase = "role_reveal", phaseTimer = ROLE_REVEAL_TIME
8. Set killCooldown = settings.killCooldown
9. Player speed = PLAYER_BASE_SPEED * settings.playerSpeed (mafiaSystem.js:131)

- [ ] **Step 3: Write kill system** (mafiaSystem.js:269-366)

Methods: `GetNearestKillTarget()`, `Kill(targetId)`, `TryKill()`

Kill flow (mafiaSystem.js:295-358):
- Validate: impostor, not ghost, cooldown <= 0, not invisible (Phantom)
- Distance check against GetKillRange(settings.killDistance)
- target.alive = false
- Spawn body at target position
- Viper: dissolveTimer = roleSettings.dissolveTime, dissolveMax = same
- Noisemaker victim: set deathAlert with timer = roleSettings.alertDuration
- Teleport player to victim (snap)
- Reset killCooldown = settings.killCooldown
- End invisibility if Phantom
- Push blood_slash hit effect (life=25/60 seconds)

- [ ] **Step 4: Write meeting system** (mafiaSystem.js:516-664)

Methods: `GetNearestReportableBody()`, `Report(bodyId)`, `TryReport()`, `CanCallEmergency()`, `CallEmergencyMeeting()`, `_StartMeeting(callerName, type)`

_StartMeeting (mafiaSystem.js:599-664):
- Phase = "report_splash", splashTimer = REPORT_SPLASH_TIME
- Reset voting state
- Teleport all alive to spawn grid: 5 columns, 40px spacing
  - `offsetX = ((i%5) - 2) * 40`, `offsetY = (Mathf.Floor(i/5f) - 0.5f) * 40`
- Clear sabotage, set sabotage cooldown
- Clear bot sabotage targets

- [ ] **Step 5: Write voting system** (mafiaSystem.js:666-848)

Methods: `CastVote(targetId)`, `_BotVote(participant)`, `_CheckAllVoted()`, `_TallyVotes()`, `_EndEjection()`

Bot vote (mafiaSystem.js:683-703): 20% skip, 80% random alive non-self player.

Tally (mafiaSystem.js:714-796):
- Count votes per target + skip count
- maxVotes starts at skipCount, ejectedId starts null
- Tie detection: if votes == maxVotes && > 0 → tie = true
- Tie or ejectedId null → "No one was ejected. (Skipped)"
- Otherwise: build message with confirmEjects check
- Build voteOrder (shuffled), revealedCount = 0
- resultsTimer = voteOrder.Count * VOTE_REVEAL_INTERVAL + 1f + VOTE_RESULTS_TIME

Vote results tick: reveal one vote per VOTE_REVEAL_INTERVAL. When resultsTimer <= 0, actually kill ejected, transition to ejecting.

_EndEjection (mafiaSystem.js:826-849):
- If message is win/defeat → endMatch()
- Clear bodies, reset kill cooldown, phase = "playing"
- lastMeetingEndTime = Time.time
- Check win conditions

- [ ] **Step 6: Write sabotage system** (mafiaSystem.js:852-1054)

Methods: `CanSabotage()`, `TriggerSabotage(sabotageId)`, `TryFixSabotage(panelKey, participantId)`, `ReleaseSabotagePanel(panelKey)`, `_TickSabotage()`, `_ClearSabotage()`, `_SabotageWin(sabotageId)`

Reactor fix check (mafiaSystem.js:934-937): validate each fixer still in range — center at `(panelTX * TILE + TILE, panelTY * TILE + TILE/2)`, range > 120px = walked away. All panels held simultaneously → clear.

O2/Lights: check all fixedPanels true → clear.

Timer tick: only if sabType.timer > 0. Decrement. If expired → _SabotageWin().

- [ ] **Step 7: Write role abilities** (mafiaSystem.js:369-514, 1125-1180)

Methods: `TryTrack()`, `ToggleVitals()`, `TryShapeshift(targetId)`, `_CompleteShapeshift()`, `ToggleInvisibility()`, `_TickRoleAbilities()`

All timer values from roleSettings, converted to seconds. Each ability has duration + cooldown.

Key details:
- Tracker range: 150px (mafiaSystem.js:393)
- Shapeshifter SHIFT_ANIM_TIME = 0.75s. Cannot kill during animation.
- Phantom cannot kill while invisible (mafiaSystem.js:300)
- Viper body dissolve ticked per frame

- [ ] **Step 8: Write win conditions** (mafiaSystem.js:1456-1498)

Method: `_CheckWinConditions()`

4 conditions:
1. All impostors dead → "Crewmates Win — All impostors eliminated!"
2. Impostors >= crewmates → "Impostors Win — Crewmates outnumbered!"
3. All tasks done → "Crewmates Win — All tasks completed!"
4. Sabotage timer expires (handled in _SabotageWin) → "Defeat — [label]!"

- [ ] **Step 9: Write EndMatch()** (mafiaSystem.js:1503-1533)

Full state reset. Destroy bot GameObjects. Return to mafia_lobby (25, 20).

- [ ] **Step 10: Write Tick()** (mafiaSystem.js:1058-1081)

Phase dispatch:
- idle → StartMatch()
- role_reveal → countdown, transition to playing
- playing → tick kill cooldown, sabotage, role abilities, task progress, win conditions
- report_splash → countdown, transition to meeting
- meeting → discussion timer, bot chat (0.3%/frame chance, 17 phrases)
- voting → voting timer, bot votes (0.8%/frame chance), force remaining as skip
- vote_results → sequential reveal, then eject
- ejecting → countdown, _EndEjection()

- [ ] **Step 11: Write IsPlayerFrozen()** (mafiaSystem.js:1440-1452)

Return true during: role_reveal, report_splash, meeting, voting, vote_results, ejecting. Also when sabotage panel active, cameras active, task panel active.

- [ ] **Step 12: Write SetRole() debug** (mafiaSystem.js:228-266)

Accept "impostor", "crewmate", or any subrole id.

- [ ] **Step 13: Compile check**

Run: `read_console` — expect 0 errors

- [ ] **Step 14: Commit**

---

### Task 3: VentSystem.cs — 4 networks, enter/exit/cycle

**Files:**
- Create: `Assets/Scripts/Mafia/VentSystem.cs`

**JS sources to READ (mandatory):**
- `js/core/skeldTasks.js:153-290` — vent system

- [ ] **Step 1: Write VentSystem.cs**

Singleton pattern. Port from skeldTasks.js:153-290.

**4 vent networks** (skeldTasks.js:158-169):
| Network | Vents | Topology |
|---------|-------|----------|
| 1 | security, medbay, electrical | Triangle |
| 2 | admin, cafe_hallway, nav_hallway | Triangle |
| 3 | shields, navigation | Pair |
| 4 | weapons_upper, nav_upper | Pair |

**State fields:**
- active (bool), currentVentId (string)
- animTimer (float, seconds), animType (string: "enter"/"exit"/null)
- ANIM_DURATION = 20f/60f seconds (skeldTasks.js:175)
- ventTimer, ventMaxTime (float, seconds) — engineer limits
- ventCooldown (float, seconds) — engineer re-entry cooldown

**Methods:**
- `IsNearVent(string ventId)` — find vent entity, check < 100px distance (skeldTasks.js:187)
  - Vent center = `(entity.tx * TILE + TILE, entity.ty * TILE + TILE)` (2x2 entity center)
- `Enter(string ventId)` — start enter animation, snap player to vent center (skeldTasks.js:196-220)
  - Engineer: ventMaxTime = roleSettings.ventDuration, ventTimer = same
  - Impostor: unlimited (ventTimer = 0, ventMaxTime = 0)
- `Exit()` — start exit animation, teleport player to vent center (skeldTasks.js:222-241)
  - Engineer: ventCooldown = roleSettings.ventCooldown
- `CycleVent(string targetId)` — validate target in network, snap player (skeldTasks.js:243-254)
- `Tick()` — decrement animTimer, ventTimer (auto-eject on 0), ventCooldown (skeldTasks.js:256-278)
- `Reset()` — clear all state (skeldTasks.js:280-289)

- [ ] **Step 2: Compile check**

- [ ] **Step 3: Commit**

---

### Task 4: SkeldCameraSystem.cs — 4 live feeds

**Files:**
- Create: `Assets/Scripts/Mafia/SkeldCameraSystem.cs`

**JS sources to READ (mandatory):**
- `js/core/cameraSystem.js` (full file, ~200 lines)

- [ ] **Step 1: Write SkeldCameraSystem.cs**

Singleton. NOT to be confused with CameraFollow.cs (the main game camera).

**4 camera feeds** (cameraSystem.js:14-19):
| id | name | cx | cy |
|----|------|----|----|
| hallway | Medbay Hallway | 40 | 10 |
| xroads | Security Hallway | 20 | 34 |
| admin | Admin Hallway | 76 | 44 |
| lower | Comms Hallway | 87 | 62 |

**State:** active (bool), blinking (bool)

**Methods:**
- `Enter()` — active=true, blinking=true
- `Exit()` — active=false, blinking=false
- `IsActive()` → bool

**OnGUI overlay** (cameraSystem.js:37-200):
- Full-screen dark bg: `rgba(0,0,0,0.92)`
- 2×2 grid: `fullW = 1920 * 0.6`, `fullH = 1080 * 0.6`, gap = 12px
- Panels: `(fullW - 12) / 2` × `(fullH - 12) / 2`
- Title: "SECURITY CAMERAS" (16px bold monospace, `rgba(120,180,200,0.7)`)
- Close button: circle at top-left area
- Per feed: green tint overlay, scan lines (3px spacing), REC blink indicator, camera name label, timestamp
- Exit on Escape, X key, or close button click

For this pass, render feed panels as labeled dark rectangles with REC indicator and camera name (full entity rendering in feeds deferred — just showing the frame/UI).

- [ ] **Step 2: Compile check**

- [ ] **Step 3: Commit**

---

### Task 5: MafiaFOV.cs — Wall-aware raycasting

**Files:**
- Create: `Assets/Scripts/Mafia/MafiaFOV.cs`

**JS sources to READ (mandatory):**
- `js/client/rendering/mafiaFOV.js:45-340` — FOV algorithm + sabotage visual effects

- [ ] **Step 1: Write MafiaFOV.cs**

Singleton with OnGUI rendering.

**Constants** (mafiaFOV.js:128-144):
```csharp
const int RAY_COUNT = 120;         // :133
const float BLUR_RADIUS = 36f;     // :134 (cosmetic only in OnGUI — use gradient)
const float DARKNESS = 0.92f;      // :135
const float AMBIENT = 0.04f;       // :136
const float LERP_SPEED = 0.35f;    // :128
const float VISIBILITY_PAD = 24f;  // :144
const int LIGHTS_FADE_FRAMES = 180; // :42
const float LIGHTS_DIM_AMOUNT = 0.35f; // :43
```

**Collision grid cache** (mafiaFOV.js:57-93):
- Build flat bool array from TileCollision grid on level change
- Cache by level id (rebuild when level changes)

**DDA raycasting** (mafiaFOV.js:97-123):
- For each of 120 rays (every 3°), march through collision grid via DDA
- Stop when hitting solid tile or exceeding max distance
- Store ray distances in float array for per-frame visibility cache

**Vision radius formula** (mafiaFOV.js:245):
```csharp
float visionMult = (playerRole == "impostor") ? settings.impostorVision : settings.crewVision;
float lightsMult = 1f - (_lightsDimProgress * (1f - LIGHTS_DIM_AMOUNT));
float fovWorldR = MafiaData.FOV_BASE_RADIUS * visionMult * lightsMult * TileCollision.TILE;
```

**Lights sabotage dim** (mafiaFOV.js:234-244):
- Crewmate + lights_out active: `_lightsDimProgress += dt * 60f / LIGHTS_FADE_FRAMES` (cap 1)
- Otherwise: `_lightsDimProgress -= dt * 60f / LIGHTS_FADE_FRAMES` (cap 0)
- Impostors unaffected

**O2 fog overlay** (mafiaFOV.js:307-334):
- Only for crewmates during o2_depletion
- fogProgress = 1 - (timer / maxTimer)
- Radial gradient from clear center to dark edge
- Extra edge fog: `rgba(15,20,30, fogProgress * 0.3)`

**Ghost overlay** (mafiaFOV.js:450-457):
- Semi-transparent tint: `rgba(100,120,180,0.08)`
- "GHOST" label: 22px bold, `rgba(180,200,255,0.5)`

**OnGUI rendering:**
- Skip during meeting/voting/ejecting phases (full visibility)
- Skip for ghosts (full visibility + ghost overlay)
- Draw dark overlay with polygon cutout from raycasted visibility
- Since OnGUI can't do complex polygons easily, use a circle approximation: draw dark fullscreen rect, then use a radial gradient texture for the vision circle edge. For wall occlusion, draw dark rectangles over occluded sectors.

**Visibility check method:**
```csharp
public bool IsWorldPointVisible(float wx, float wy)
```
- Points within 1 TILE of player: always visible
- Others: check against ray distance cache + VISIBILITY_PAD

- [ ] **Step 2: Compile check**

- [ ] **Step 3: Commit**

---

### Task 6: MafiaPanelUI.cs — All meeting/voting/HUD/sabotage UI

**Files:**
- Create: `Assets/Scripts/Mafia/MafiaPanelUI.cs`

**JS sources to READ (mandatory):**
- `js/client/rendering/mafiaFOV.js` — entire file (~3744 lines)

This is the largest file. Port section by section:

- [ ] **Step 1: Write skeleton + role reveal** (mafiaFOV.js:1878-1941)

OnGUI MonoBehaviour. Only renders when `GameSceneManager.Instance.InSkeld`.

Role reveal overlay:
- Full screen `rgba(0,0,0,0.92)`
- "SHHHHH!" at 60px bold, white, y = Screen.height * 0.2
- Role text at 72px bold: impostor `#ff2222`, crewmate `#4ac9ff`, y = 0.42
- Subrole name at 36px bold with role color, y = 0.55
- Subrole description at 18px, `rgba(255,255,255,0.7)`, y = 0.55 + 40px

- [ ] **Step 2: Write report/emergency splash** (mafiaFOV.js:1943-2191)

Report splash (mafiaFOV.js:1959-2101):
- Red background `#1a0000`
- White banner at 35% height
- "DEAD BODY REPORTED" text (fontSize = Screen.width / 22)
- Dead body visual (simplified for OnGUI)
- Hazard stripes at bottom 50px

Emergency splash (mafiaFOV.js:2103-2186):
- Orange background `#1a0800`
- "EMERGENCY MEETING" text (fontSize = Screen.width / 20)
- Pulsing red button visual

- [ ] **Step 3: Write meeting/voting UI** (mafiaFOV.js:2203-2506)

Meeting tablet frame:
- 920×600 px (scaled), centered
- Outer frame `#2a2d35` +8px padding, inner panel `#c2ccd8`
- Title: "Who Is The Impostor?" 26px bold `#1a1a2e`

Voting cards:
- 2 columns, cardW=390, cardH=82, gapX=16, gapY=6
- Card backgrounds: dead `#8a8a8a`, voted-for `#e8c8c8`, confirm `#d8e8f8`, normal `#f0f2f5`
- Mini crewmate sprite (simplified colored ellipse)
- Name 18px bold
- "VOTED" stamp (rotated text)
- Two-step confirm: click → show green ✓ / red ✗ buttons (36×36 each)

Skip vote button:
- 160×38 px at bottom-left of tablet
- Same two-step confirm pattern

Discussion timer display: "Discussion: Xs" / "Voting Ends In: Xs"

- [ ] **Step 4: Write vote reveal + ejection screen** (mafiaFOV.js:2814-2959)

Vote reveal: mini crewmate icons appear sequentially, 28px spacing, at bottom of each card.

Ejection screen (mafiaFOV.js:2894-2959):
- Full black background
- 80 stars: deterministic positions from seed 42
- Crewmate body flying left to right: `x = -100 + progress * (Screen.width + 200)`
- Sinusoidal wobble: `y = center - 40 + sin(progress * PI * 3) * 30`
- Spinning: rotation = progress * PI * 6
- Message fades in after 30% progress

- [ ] **Step 5: Write HUD buttons** (mafiaFOV.js:468-555, 1154-1670)

**KILL button** (impostor only):
- Position: right side, 130px from right, 150px from bottom. 100×50 px.
- Active: `rgba(200,20,20,0.85)`, border `#ff4444`
- Inactive: `rgba(80,30,30,0.6)`, border `#664444`
- Shows cooldown seconds when cooling down
- Key hint: [Q]

**REPORT button** (all living):
- Position: left side, 30px from left, 150px from bottom. 110×50 px.
- Active: `rgba(200,160,20,0.85)`, border `#ffcc00`
- Key hint: [R]

**SABOTAGE button** (impostor only):
- Position: centered, 80px from bottom. 140×50 px.
- Active: `rgba(180,50,180,0.85)`, border `#cc66cc`

**Role ability buttons** (TRACK, VITALS, SHIFT, VANISH):
- Stacked vertically, left of KILL button area
- Each 100×50 px with role-specific colors (see design audit above)

- [ ] **Step 6: Write sabotage picker + fix panels** (mafiaFOV.js:683-1141, 1187-1247)

Sabotage picker menu:
- 200×160 px, 3 options: Reactor (`#cc3333`), O2 (`#3388cc`), Lights (`#cc9922`)

Sabotage fix panels (all have dark overlay `rgba(0,0,0,0.75)`, close button):

**Reactor** (mafiaFOV.js:739-853): Hand scanner, hold progress bar (1/60 per frame fill rate → 1 second). Progress bar: bg `#333`, fill `#44cc66`.

**O2** (mafiaFOV.js:855-958): Keypad with 5-digit random code on sticky note. 3×4 number grid (60px buttons). Wrong code flash 30 frames.

**Lights** (mafiaFOV.js:989-1141): 5 toggle switches (56×120 px each). LED indicators. All ON = fixed. Switches persist across close/reopen (stored on sabotage state).

- [ ] **Step 7: Write sabotage alert overlay** (mafiaFOV.js:1250-1322)

Flashing red vignette (toggles every 1.5s). Top-center bar 400×50 px with timer countdown.

- [ ] **Step 8: Write scientist vitals + shapeshifter picker** (mafiaFOV.js:1681-1875)

Vitals panel: 400×500 px centered, participant rows with alive/dead status.
Shapeshifter picker: 300px wide, target rows, click to shift into.

- [ ] **Step 9: Write death alert (Noisemaker)** (mafiaFOV.js:1752-1805)

Direction arrow on screen edge pointing toward death location. Pulsing at `sin(Time.time * 0.008 * 60)`. "!" icon near arrow.

- [ ] **Step 10: Write body rendering** (mafiaFOV.js:338-432)

Bodies hidden outside FOV. Shadow ellipse, fallen body, cracked visor, bone. Viper dissolve: 4 visual stages, alpha fades from 1.0 to 0.15.

- [ ] **Step 11: Write mini crewmate renderer** (mafiaFOV.js:1429-1488)

Utility method for drawing mini Among Us crewmate sprites in meeting cards and vote reveals. Body ellipse 14×18, visor 8×7, backpack 5×10, two legs. Dead X overlay.

For OnGUI: approximate with colored rectangles and circles (GUI.DrawTexture with tinting).

- [ ] **Step 12: Compile check**

- [ ] **Step 13: Commit**

---

### Task 7: Fix MafiaSettingsPanelUI.cs

**Files:**
- Modify: `Assets/Scripts/UI/MafiaSettingsPanelUI.cs`

**JS sources to READ:**
- `js/client/rendering/mafiaFOV.js:2970-3082`
- `js/core/sceneManager.js:337-338` (leave handler)

- [ ] **Step 1: Fix Leave destination**

Change line 170 from:
```csharp
GameSceneManager.Instance.StartTransition("town", 35, 30);
```
To:
```csharp
GameSceneManager.Instance.StartTransition("mafia_lobby", 25, 20);
```

- [ ] **Step 2: Add tab index for General/Sounds buttons**

For General (case 0): set settings tab to 0 before toggling.
For Sounds (case 1): set settings tab to 2 before toggling.

(If SettingsPanelUI has no tab index API, just document — minor issue.)

- [ ] **Step 3: Compile check + commit**

---

### Task 8: Fix SkeldTaskPanelUI.cs — Task selection + isStepDone

**Files:**
- Modify: `Assets/Scripts/UI/SkeldTaskPanelUI.cs`

**JS sources to READ:**
- `js/core/skeldTasks.js:33-147` — task selection/reset/isStepDone

- [ ] **Step 1: Add ResetWithSettings method**

Port `SkeldTasks.reset(settings)` from skeldTasks.js:33-78:
```csharp
public void ResetWithSettings(MafiaData.MafiaSettings settings, LevelEntry level)
```
- Group level entities by task category (common/short/long)
- Shuffle each category
- Pick `settings.commonTasks` from common, `settings.shortTasks` from short, `settings.longTasks` from long
- Register selected tasks into _taskStates and _activeTasks

- [ ] **Step 2: Add IsStepDone method**

Port from skeldTasks.js:92-97:
```csharp
public bool IsStepDone(string taskId, int step)
```
Check if specific step is already completed for the task.

- [ ] **Step 3: Add TaskBar updates setting check**

In the task list sidebar drawing code, check `MafiaSystem.Instance` for taskBarUpdates setting:
- "Never" → don't draw task list at all
- "Meetings" → only draw during meeting/voting phases
- "Always" → always draw (current behavior)

- [ ] **Step 4: Compile check + commit**

---

### Task 9: Wire to GameBootstrap + ChatSystem

**Files:**
- Modify: `Assets/Scripts/GameBootstrap.cs`
- Modify: `Assets/Scripts/ChatSystem.cs`

- [ ] **Step 1: Add Mafia singletons to GameBootstrap.EnsureCombatManagers()**

Add after the CasinoSystem line:
```csharp
if (MafiaSystem.Instance == null) go.AddComponent<MafiaSystem>();
if (VentSystem.Instance == null) go.AddComponent<VentSystem>();
if (SkeldCameraSystem.Instance == null) go.AddComponent<SkeldCameraSystem>();
if (MafiaFOV.Instance == null) go.AddComponent<MafiaFOV>();
if (MafiaPanelUI.Instance == null) go.AddComponent<MafiaPanelUI>();
```

- [ ] **Step 2: Add debug commands to ChatSystem**

Add to ProcessCommand():
```csharp
case "mafia":
    // Teleport to Skeld and start match
    GameSceneManager.Instance.StartTransition("skeld_01", 74, 18);
    AddMessage("Entering Skeld...", COL_CYAN);
    break;
case "role":
    // /role impostor, /role engineer, etc.
    if (parts.Length > 1 && MafiaSystem.Instance != null)
        MafiaSystem.Instance.SetRole(parts[1]);
    break;
```

- [ ] **Step 3: Compile check + commit**

---

### Task 10: Player freeze + scene integration

**Files:**
- Modify: `Assets/Scripts/PlayerController.cs`
- Modify: `Assets/Scripts/GameSceneManager.cs`

- [ ] **Step 1: Add Mafia freeze check to PlayerController**

In the movement blocking section, add:
```csharp
if (MafiaSystem.Instance != null && MafiaSystem.Instance.IsPlayerFrozen())
{
    // Zero out movement but allow looking around
    return;
}
```

- [ ] **Step 2: Add Skeld leave handler to GameSceneManager**

When leaving Skeld scene, call cleanup:
```csharp
if (MafiaSystem.Instance != null) MafiaSystem.Instance.EndMatch();
if (VentSystem.Instance != null) VentSystem.Instance.Reset();
if (SkeldCameraSystem.Instance != null) SkeldCameraSystem.Instance.Exit();
```

- [ ] **Step 3: Add input handling for Mafia keys**

In PlayerController or a new input section:
- Q key → MafiaSystem.Instance.TryKill()
- R key → MafiaSystem.Instance.TryReport()
- E key → interact (vent enter/exit, emergency button, task/sabotage/camera interact)
- Only active when InSkeld and Mafia phase is "playing"

- [ ] **Step 4: Compile check + commit**

---

### Task 11: Final compile + integration test

- [ ] **Step 1: Full compile check**

`read_console` — expect 0 errors, 0 new warnings.

- [ ] **Step 2: Increment GAME_UPDATE**

Read current value from `js/shared/gameConfig.js`, increment by 1.

- [ ] **Step 3: Final commit + push**

```
git add -A
git commit -m "Phase 9b: Mafia game mode — state machine, kills, meetings, voting, sabotage, FOV, vents, cameras, all UI (no bot AI)"
```

Push to remote.

---

## Verification Checklist (Play Mode)

After all tasks complete, verify in Unity Play mode:
1. `/mafia` command loads Skeld map
2. Role reveal screen shows for 3 seconds
3. Player can move around Skeld
4. FOV raycasting works (dark outside vision circle, walls block)
5. `/role impostor` switches to impostor
6. Q key kills nearest bot (teleports player to victim)
7. Body appears at kill location
8. R key reports body → meeting starts
9. Report splash → discussion → voting → vote results → ejection
10. Sabotage triggers via button (reactor/O2/lights)
11. Sabotage fix panels work (reactor hold, O2 keypad, lights switches)
12. Vents: E near vent → enter → cycle arrows → exit
13. Camera console: E → 2×2 feed overlay → close
14. Win condition triggers when all impostors ejected
15. endMatch returns to mafia_lobby

---

## Dependencies Between Tasks

```
Task 1 (MafiaData) ← Task 2 (MafiaSystem) ← Task 5 (MafiaFOV)
                   ← Task 3 (VentSystem)      ← Task 6 (MafiaPanelUI)
                   ← Task 4 (CameraSystem)
Task 7 (Fix Settings) — independent
Task 8 (Fix Tasks) — independent
Task 9 (Bootstrap wiring) ← Tasks 1-6
Task 10 (Player/Scene) ← Task 2
Task 11 (Final) ← all
```

**Parallelizable:** Tasks 3, 4, 7, 8 can run in parallel with Task 2.
**Sequential:** Task 1 must complete before 2-6. Task 9 needs 1-6 done. Task 10 needs Task 2. Task 11 is last.
