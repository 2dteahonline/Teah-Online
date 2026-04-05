# Unity Phase 0: Bootstrap — Player Walking in Lobby

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Press Play in Unity → see lobby tiles, see player sprite, walk with WASD, camera follows, lobby entities (portals, buildings) visible.

**Architecture:** GameManager.Start() already creates everything programmatically — player, tilemaps, UI, camera. The scene has GameManager + Camera + Light. We press Play, read console errors, and fix them iteratively until the exit gate passes. No new architecture — just wiring fixes.

**Tech Stack:** Unity 6 (6000.4.0f1), URP 2D, C# scripts (179 existing)

**Key Reference:** `docs/superpowers/specs/2026-04-04-unity-port-reboot-design.md` Phase 0

---

## File Map

All files already exist. We're fixing, not creating.

**Core bootstrap chain (GameManager.Start):**
- `Assets/Scripts/Core/GameManager.cs` — orchestrator, calls CreateTilemaps → SpawnPlayer → InitCamera → SetupPersistentUI → LoadLobby
- `Assets/Scripts/Core/LobbyBuilder.cs` — builds 80×64 lobby tilemap with walls and solid entities
- `Assets/Scripts/Core/SceneManager.cs` — scene state machine (singleton, fade overlay)
- `Assets/Scripts/Core/Parity/LevelDataLoader.cs` — loads level_data.json for collision grids

**Player systems:**
- `Assets/Scripts/Authority/PlayerController.cs` — movement, collision, knockback
- `Assets/Scripts/Client/Input/PlayerInputHandler.cs` — WASD input → moveInput
- `Assets/Scripts/Client/Camera/CameraController.cs` — orthographic follow camera

**Rendering:**
- `Assets/Scripts/Client/Rendering/CharacterRenderer.cs` — 3-layer body/head/hat sprites
- `Assets/Scripts/Client/Rendering/CharacterAnimator.cs` — walk frame cycling
- `Assets/Scripts/Client/Rendering/YSortRenderer.cs` — depth sorting by Y position
- `Assets/Scripts/Client/Rendering/SpriteFactory.cs` — procedural placeholder sprites
- `Assets/Scripts/Client/Rendering/SceneTileRenderer.cs` — procedural tile textures
- `Assets/Scripts/Client/Rendering/EntityRendererRegistry.cs` — entity visuals
- `Assets/Scripts/Client/Rendering/LobbyEntitySpawner.cs` — 60+ lobby entities (buildings, trees, etc.)
- `Assets/Scripts/Core/SceneEntitySpawner.cs` — generic entity spawning from level data

**Data:**
- `Assets/Scripts/Shared/Config/GameConfig.cs` — ScriptableObject with all constants
- `Assets/Scripts/Shared/Config/CollisionGrid.cs` — grid-based AABB collision
- `Assets/StreamingAssets/level_data.json` — exported level collision/entity data

**UI (created by SetupPersistentUI, may need null-safety fixes):**
- `Assets/Scripts/Client/UI/PanelManager.cs` — panel toggle system
- `Assets/Scripts/Client/UI/GameHUD.cs` — HP/gold/wave display
- `Assets/Scripts/Client/UI/HotbarUI.cs` — equipment slots
- ~15 more UI scripts (all created programmatically by GameManager)

---

## Approach

**Iterative Play-and-Fix.** We don't know exactly which null refs will fire until we press Play. The plan is structured as a diagnostic loop, not a predetermined edit list.

Each task follows: Enter Play Mode → Read Console → Identify Error → Fix → Repeat.

The tasks below are ordered by the GameManager.Start() call chain. Each task targets one subsystem in the chain. If a subsystem works without errors, skip its task.

---

### Task 1: Enter Play Mode — First Error Sweep

**Files:**
- Read: `Assets/Scripts/Core/GameManager.cs` (Start method, lines 202-243)
- Read: Unity console output

- [ ] **Step 1: Enter Play mode via MCP**

Use `manage_editor` to enter Play mode. This triggers GameManager.Start().

- [ ] **Step 2: Read console for ALL errors**

Use `read_console` with `types: ["error"]` and `count: 50`. Record every error message and stack trace.

- [ ] **Step 3: Categorize errors by subsystem**

Map each error to the GameManager.Start() call that caused it:
1. `LevelDataLoader.LoadAll()` — missing/malformed level_data.json
2. `CreateTilemaps()` — tilemap/tile creation issues
3. `SpawnPlayer()` — player component wiring issues
4. `InitCamera()` — camera setup issues
5. `SetupPersistentUI()` — UI panel creation issues (many possible null refs here)
6. `LoadLobby()` — LobbyBuilder/LobbyEntitySpawner issues

- [ ] **Step 4: Exit Play mode**

Use `manage_editor` to exit Play mode before making code changes.

- [ ] **Step 5: Document the error list**

Write down every error with file:line so subsequent tasks have a clear target list.

---

### Task 2: Fix LevelDataLoader / Collision Grid Issues

**Files:**
- Modify: `Assets/Scripts/Core/Parity/LevelDataLoader.cs`
- Read: `Assets/StreamingAssets/level_data.json` (verify it exists and parses)

- [ ] **Step 1: Check if level_data.json loads**

If LevelDataLoader.LoadAll() errors:
- Verify `level_data.json` exists in StreamingAssets
- Check JSON structure matches what LevelDataLoader expects
- Fix any deserialization issues

- [ ] **Step 2: Verify lobby collision grid loads**

The lobby level ID should be `"lobby_01"`. Check that `LevelDataLoader.Get("lobby_01")` returns a valid CollisionGrid with width=80, height=64.

- [ ] **Step 3: Test — Enter Play mode, verify no LevelDataLoader errors**

Play → read_console → confirm LevelDataLoader errors are gone. Exit Play.

---

### Task 3: Fix Tilemap Creation (CreateTilemaps)

**Files:**
- Modify: `Assets/Scripts/Core/GameManager.cs` (CreateTilemaps method, ~line 1645)

GameManager.CreateTilemaps() creates:
1. Grid GameObject (cellSize=1)
2. WallTilemap (TilemapRenderer sortingOrder=0, layer="Walls")
3. FloorTilemap (TilemapRenderer sortingOrder=-1)
4. Two Tile assets with square sprites

- [ ] **Step 1: Check for tilemap errors in console**

Common issues:
- Missing URP 2D Renderer (tilemaps need 2D Renderer in URP)
- Sorting layer "Walls" may not exist (needs to be created in Tags & Layers)
- Sprite creation for tiles may fail

- [ ] **Step 2: Fix any sorting layer issues**

If "Walls" sorting layer doesn't exist, either:
a) Create it via manage_editor (Tags & Layers), or
b) Change code to use "Default" sorting layer

- [ ] **Step 3: Fix any tile/sprite creation issues**

GameManager creates square sprites via `MakeSquareSprite()`. If this method doesn't exist or fails, check the implementation and fix.

- [ ] **Step 4: Test — verify tilemap renders**

Play → should see colored tiles. Exit Play.

---

### Task 4: Fix Player Spawning (SpawnPlayer)

**Files:**
- Modify: `Assets/Scripts/Core/GameManager.cs` (SpawnPlayer method, ~line 1724)
- Modify: `Assets/Scripts/Authority/PlayerController.cs` (if Initialize fails)
- Modify: `Assets/Scripts/Client/Rendering/CharacterRenderer.cs` (if Initialize fails)
- Modify: `Assets/Scripts/Client/Rendering/SpriteFactory.cs` (if sprite generation fails)

SpawnPlayer() creates a Player GameObject with:
- CharacterAnimator → CharacterRenderer.Initialize(cyan, skin, hair) → YSortRenderer → NameTagRenderer → PlayerController.Initialize() → PlayerInputHandler

- [ ] **Step 1: Check for player spawn errors**

Common issues:
- CharacterRenderer.Initialize() needs CharacterAnimator sibling (RequireComponent)
- SpriteFactory.CreateBodySheet() may fail creating procedural textures
- PlayerController.Initialize() needs config assigned
- NameTagRenderer may have missing font/TextMesh dependencies

- [ ] **Step 2: Fix CharacterRenderer initialization**

If sprite creation fails, check SpriteFactory methods. They create Texture2D programmatically — should work without external assets. Fix any null refs in the chain.

- [ ] **Step 3: Fix PlayerController initialization**

PlayerController.Initialize() sets collider size from config. Verify:
- `config` field is assigned (GameManager passes it)
- `wallTilemap` is assigned before movement starts
- Rigidbody2D is kinematic, BoxCollider2D is trigger

- [ ] **Step 4: Fix PlayerInputHandler wiring**

PlayerInputHandler needs `playerController` reference. GameManager sets this. Verify the assignment. Also check that it handles null SettingsPanelUI gracefully (falls back to WASD defaults).

- [ ] **Step 5: Test — verify player appears and accepts WASD input**

Play → should see a colored player sprite at spawn position. WASD should move it. Exit Play.

---

### Task 5: Fix Camera (InitCamera)

**Files:**
- Modify: `Assets/Scripts/Core/GameManager.cs` (InitCamera method, ~line 1758)
- Modify: `Assets/Scripts/Client/Camera/CameraController.cs`

InitCamera() gets Camera.main, adds CameraController, sets target + bounds.

- [ ] **Step 1: Check camera errors**

Common issues:
- Camera.main might not find the Main Camera (needs "MainCamera" tag)
- CameraController may have issues with orthographic size calculation
- Map bounds (80, 64) must be set correctly

- [ ] **Step 2: Verify camera tag**

The existing Main Camera in scene must have tag "MainCamera". If not, fix via MCP.

- [ ] **Step 3: Fix CameraController if needed**

CameraController follows playerController.transform. Verify:
- `target` is assigned
- Orthographic size is reasonable (JS VIEW_H / PPU)
- Bounds clamping works for 80×64 lobby

- [ ] **Step 4: Test — verify camera follows player**

Play → walk with WASD → camera should track player smoothly. Exit Play.

---

### Task 6: Fix Persistent UI (SetupPersistentUI)

**Files:**
- Modify: `Assets/Scripts/Core/GameManager.cs` (SetupPersistentUI method, ~line 516)
- Potentially modify: Any UI script that crashes during creation

SetupPersistentUI() creates ~25 GameObjects with UI components. This is the highest-risk area for null refs because it touches the most systems.

- [ ] **Step 1: Identify which UI creation crashes**

Read console errors. The most likely failures:
- SaveManager.Load() — may crash on missing save file
- UIFactory.CreateCanvas() — may have missing dependencies
- Panel Initialize() methods — may reference missing UI prefabs/fonts
- IdentityPanelUI.Initialize() — creates its own canvas
- ProfileMenuUI/NewsPanelUI — self-creates canvas, self-registers

- [ ] **Step 2: Add null-safety guards where needed**

For Phase 0, UI doesn't need to WORK — it just needs to not CRASH. Wrap any crashing initialization in try-catch or null checks so GameManager.Start() completes.

Strategy: If a UI script crashes, wrap its creation in a try-catch in GameManager.SetupPersistentUI() so it logs a warning but doesn't halt the bootstrap. Example:

```csharp
try
{
    var hudGO = new GameObject("GameHUD");
    gameHUD = hudGO.AddComponent<GameHUD>();
    gameHUD.player = playerController;
    gameHUD.inventory = inventorySystem;
}
catch (System.Exception e)
{
    Debug.LogWarning($"[GameManager] GameHUD init failed (Phase 0 OK): {e.Message}");
}
```

Only apply this to UI systems that aren't needed for walking. Do NOT wrap core systems (tilemap, player, camera).

- [ ] **Step 3: Fix SaveManager if it crashes**

SaveManager.Load() may fail on first run (no save file). Should handle gracefully — check if it does.

- [ ] **Step 4: Test — verify Start() completes without fatal errors**

Play → all GameObjects created → no blocking errors. UI may look wrong but player/camera/tiles should work. Exit Play.

---

### Task 7: Fix Lobby Loading (LoadLobby)

**Files:**
- Modify: `Assets/Scripts/Core/GameManager.cs` (LoadLobby method, ~line 1672)
- Modify: `Assets/Scripts/Core/LobbyBuilder.cs` (BuildLobby)
- Modify: `Assets/Scripts/Client/Rendering/SceneTileRenderer.cs` (Initialize + ApplyVisuals)

LoadLobby() does:
1. LobbyBuilder.BuildLobby() — fills tilemaps with 80×64 grid
2. SceneTileRenderer.Initialize("lobby", 80, 64) + ApplyVisuals()
3. LobbyEntitySpawner.SpawnAllEntities() — 60+ visual entities
4. Create portal markers (colored squares)
5. SetupFishingSystem()
6. RegisterLobbyInteractables()

- [ ] **Step 1: Fix LobbyBuilder.BuildLobby()**

BuildLobby() needs wallTilemap, floorTilemap, and tile references. These are passed from GameManager. Check the wiring.

- [ ] **Step 2: Fix SceneTileRenderer if procedural textures fail**

SceneTileRenderer.ApplyVisuals() replaces tile sprites with procedural textures. If it crashes, the fallback is colored squares (still functional). Make it non-fatal.

- [ ] **Step 3: Fix LobbyEntitySpawner if entity rendering fails**

LobbyEntitySpawner creates 60+ GameObjects for buildings, trees, etc. Each needs a texture from EntityRendererRegistry/LobbyEntityFactory. If textures are null, entities are invisible but shouldn't crash.

- [ ] **Step 4: Fix portal marker creation**

Portal markers are simple colored sprites. CreatePortalMarker() should be straightforward — fix any null refs.

- [ ] **Step 5: Make fishing/interactables non-fatal**

SetupFishingSystem() and RegisterLobbyInteractables() are Phase 8+ features. If they crash, wrap in try-catch. They're not needed for walking.

- [ ] **Step 6: Test — verify lobby renders with tiles and entities**

Play → see green/dark floor and wall tiles → see building sprites → see portal markers. Exit Play.

---

### Task 8: Fix Collision (Player Can't Walk Through Walls)

**Files:**
- Modify: `Assets/Scripts/Authority/PlayerController.cs` (TickMovement, collision checks)
- Modify: `Assets/Scripts/Shared/Config/CollisionGrid.cs` (if grid isn't loading)

- [ ] **Step 1: Verify collision grid is assigned to PlayerController**

GameManager should assign either:
- `playerController.wallTilemap` (tilemap-based collision), or
- `playerController.collisionGrid` (data-driven collision from level_data.json)

Check which path GameManager uses and verify the assignment.

- [ ] **Step 2: Test collision**

Walk into a wall. Player should stop. Walk along a wall. Player should slide (separate axis collision).

- [ ] **Step 3: Fix Y-axis collision if inverted**

If player walks through walls but gets stuck on floors, Y-axis is flipped in collision checks. CollisionGrid converts JS Y-down to Unity Y-up — verify the row flip in `FromExportedData()`.

- [ ] **Step 4: Test — walk the full lobby perimeter**

Walk along all 4 borders. Walk into buildings. Verify walls are solid everywhere they should be.

---

### Task 9: Exit Gate Verification

**Files:** None — this is a Play mode verification pass.

- [ ] **Step 1: Enter Play mode**

- [ ] **Step 2: Verify lobby tiles render**

See green floor tiles and dark wall tiles covering the 80×64 grid.

- [ ] **Step 3: Verify player sprite is visible**

See a colored character sprite (cyan body, placeholder head/hat) at the spawn point.

- [ ] **Step 4: Verify WASD movement**

Press WASD → player moves in correct directions (W=up, S=down, A=left, D=right). Movement is instant (no acceleration — Graal-style).

- [ ] **Step 5: Verify camera follows**

Camera tracks the player. When player moves, view scrolls. Camera clamps at map edges.

- [ ] **Step 6: Verify wall collision**

Player cannot walk through walls or building footprints. Player slides along walls on diagonal input.

- [ ] **Step 7: Verify lobby entities visible**

Buildings, trees, portal markers (colored squares) are visible at expected positions.

- [ ] **Step 8: Verify Y-sorting**

Player renders in front of entities below them and behind entities above them.

- [ ] **Step 9: Exit Play mode — Phase 0 COMPLETE**

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Unity Phase 0: player walking in lobby — scene bootstrap complete"
```

---

## Error Triage Priority

When multiple errors appear, fix in this order (earlier = blocks more):

1. **LevelDataLoader** — collision data needed for walking
2. **CreateTilemaps** — tiles needed for rendering + collision
3. **SpawnPlayer** — player needed for everything
4. **InitCamera** — can't see anything without camera
5. **LoadLobby** — lobby content (tiles, entities, portals)
6. **SetupPersistentUI** — UI can be wrapped in try-catch, non-blocking
7. **Collision** — walking works but may clip through walls

## Non-Goals (Phase 1+)

Do NOT fix these in Phase 0:
- Combat systems (GunSystem, MeleeSystem, WaveSystem)
- Dungeon transitions
- UI panel functionality (shop, inventory, settings)
- Save/Load
- Party/Bot systems
- Networking
- Any UI that doesn't crash (ugly is fine, broken is not)
