# Teah Online — GDD-Driven Unity Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a comprehensive citation-backed GDD at `docs/gdd/` via parallel agent extraction from the 91 JS source files, while simultaneously bootstrapping a fresh Unity project `TeahOnline/` with a playable Phase 0 (walk + walls + camera) using Unity MCP.

**Architecture:** Two parallel tracks in one session. Track A dispatches ~10 sub-agents in two waves to extract per-system GDD sections, each agent limited to a non-overlapping cluster of JS files, with mandatory `js/file.js:line` citations for every numeric value. Track B renames the existing Unity project to `_REFERENCE`, creates a new 2D Built-in project, and ports walk/walls/camera directly from JS. Track C updates CLAUDE.md to promote the GDD to the #1 source of truth.

**Tech Stack:** Vanilla JS source, Markdown GDD files, Unity 6000.4.0f1 with 2D Built-in Render Pipeline, Unity MCP bridge, C# scripts for player/collision/camera, git for version control.

---

## File Structure

**Track A — GDD:**
- Create: `docs/gdd/README.md` — schema lock document
- Create: `docs/gdd/INDEX.md` — navigation index
- Create: `docs/gdd/combat-core.md`
- Create: `docs/gdd/movement-collision.md`
- Create: `docs/gdd/mobs-core.md`
- Create: `docs/gdd/mob-abilities-azurine.md`
- Create: `docs/gdd/mob-abilities-vortalis.md`
- Create: `docs/gdd/mob-abilities-earth205.md`
- Create: `docs/gdd/mob-abilities-earth216.md`
- Create: `docs/gdd/mob-abilities-wagashi.md`
- Create: `docs/gdd/scenes-levels.md`
- Create: `docs/gdd/inventory-crafting.md`
- Create: `docs/gdd/npcs-cooking.md`
- Create: `docs/gdd/party-bots-spar.md`
- Create: `docs/gdd/casino-minigames.md`
- Create: `docs/gdd/ui-hud-saveload.md`
- Create: `docs/gdd/shared-data.md`

**Track B — Unity Phase 0:**
- Rename: `C:/Users/jeff/Desktop/Unity Proj/TeahOnlineUnity/` → `TeahOnlineUnity_REFERENCE/`
- Create (via Unity Hub, manual user step): `C:/Users/jeff/Desktop/Unity Proj/TeahOnline/`
- Create: `Unity Proj/TeahOnline/Assets/Scripts/PlayerController.cs`
- Create: `Unity Proj/TeahOnline/Assets/Scripts/TileCollision.cs`
- Create: `Unity Proj/TeahOnline/Assets/Scripts/CameraFollow.cs`
- Create: `Unity Proj/TeahOnline/Assets/Scenes/Lobby.unity` (may already exist as default; modify if so)

**Track C — Housekeeping:**
- Modify: `CLAUDE.md` (promote GDD to #1 rule, update Unity project path)

---

## Track A — GDD Extraction

### Task A1: Lock the GDD Schema

**Files:**
- Create: `docs/gdd/README.md`

- [ ] **Step 1: Write the schema-lock document**

Create `docs/gdd/README.md` with the exact content below. This is what every extraction agent will be instructed to follow.

```markdown
# Teah Online — Game Design Document

This directory is the authoritative reference for every system, value, formula, and interaction in Teah Online. It is generated from the JS source code via citation-backed extraction. When JS changes, the GDD updates in the same commit.

## Schema (all system files MUST follow this)

Every file in `docs/gdd/` (except this README and INDEX.md) describes one system cluster and must contain the following sections, in this order:

### `## Source of truth`
Bullet list of every JS file that implements this system, with one-line descriptions. Example:
- `js/core/gunSystem.js` — gun firing authority and bullet spawning
- `js/shared/gunData.js` — gun definitions and stats

### `## Purpose`
One paragraph (max 4 sentences) describing what the system does and why it exists. No marketing language. No player-experience prose.

### `## Values`
Structured table(s) of every numeric constant, timer, cooldown, formula input, field size, and threshold. Every row must have a citation in the form `js/path/file.js:LINE`. No exceptions. No rounding. No "approximately."

Example:
| Name | Value | Units | Citation |
|------|-------|-------|----------|
| FIRE_RATE | 0.12 | seconds | js/core/gunSystem.js:47 |
| BULLET_SPEED | 14 | px/frame | js/core/gunSystem.js:89 |

### `## Behavior`
Ordered bullet list or numbered steps describing what happens when the system runs. Each step that triggers on a specific value must cite that value. Example:
1. On mouse click, check `canFire` (js/core/gunSystem.js:112)
2. If true, spawn bullet at player position + muzzle offset (js/core/gunSystem.js:118)
3. Set cooldown timer to FIRE_RATE (js/core/gunSystem.js:125)

### `## Dependencies`
Bullet list of other systems this reads from or writes to. Example:
- Reads: `player.x`, `player.y`, `player.facing` (from `js/authority/gameState.js`)
- Writes: `bullets[]` array (to `js/authority/gameState.js`)
- Emits: `bullet:spawned` event (via `js/authority/eventBus.js`)

### `## Edge cases`
Bullet list of non-obvious interactions, known quirks, or gotchas. If none, write "None documented."

## Format rules

- **Tight schema** for combat, mobs, values, formulas, damage, timers — tables only, zero prose ambiguity
- **Narrative allowed** for NPC dialogue systems, cooking flow, casino game rules, UI navigation — but every value in the narrative must still cite
- **Citation rule** — every numeric value gets `(js/path.js:LINE)` or in a table column. No exceptions.
- **Length discipline** — most files should be 200-600 lines. If a file exceeds 1000 lines, split it into `<name>-1.md`, `<name>-2.md` with a shared intro.
- **No invented values** — if you cannot find a value in the JS, write `UNKNOWN` in the Value column. Do not guess.
- **No cross-cluster work** — your cluster is your cluster. Do not document systems outside it.
```

- [ ] **Step 2: Commit the schema**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
git add docs/gdd/README.md
git commit -m "GDD: lock schema before parallel extraction"
```

---

### Task A2: Dispatch GDD Wave 1 (6 parallel agents)

**Files:**
- Create: `docs/gdd/combat-core.md` (agent 1)
- Create: `docs/gdd/movement-collision.md` (agent 2)
- Create: `docs/gdd/mobs-core.md` (agent 3)
- Create: `docs/gdd/scenes-levels.md` (agent 4)
- Create: `docs/gdd/inventory-crafting.md` (agent 5)
- Create: `docs/gdd/shared-data.md` (agent 6)

- [ ] **Step 1: Dispatch all 6 agents in a single message**

Each agent uses `Agent` tool with `subagent_type: "general-purpose"`. All 6 tool calls go in ONE message for true parallelism. Each agent receives the exact prompt template below, with the cluster files substituted.

**Prompt template (substitute `<OUTPUT_FILE>` and `<CLUSTER_FILES>`):**

```
You are extracting one section of the Teah Online GDD. This is a READ-ONLY task — you must not modify any JS file, run any code, or create files outside your assigned output.

FIRST, read the schema you MUST follow:
- C:/Users/jeff/Desktop/Teah Online/docs/gdd/README.md

Your assigned cluster files (READ these with the Read tool in full):
<CLUSTER_FILES>

Your output file (CREATE this with the Write tool):
<OUTPUT_FILE>

MANDATORY RULES:
1. Every numeric value in your output must cite js/path/file.js:LINE. No exceptions. No rounding. No "approximately".
2. If you cannot find a value in the JS, write "UNKNOWN" in the Value column. DO NOT GUESS.
3. Follow the schema from docs/gdd/README.md exactly: Source of truth, Purpose, Values, Behavior, Dependencies, Edge cases.
4. Use tight tables for values. Narrative only where the schema allows it (dialogue, game rules).
5. Do not document systems outside your cluster files. If you see a dependency on another cluster, list it under Dependencies but do not document it.
6. Target length: 200-600 lines. Split into multiple sections within the same file if needed.
7. Do NOT modify any JS file. Do NOT run code. READ-ONLY.

After creating your output file, respond with:
- The path to the file you created
- The number of values documented with citations
- Any JS files you read
- Any values you marked UNKNOWN (with reason)
```

**Cluster assignments for Wave 1:**

Agent 1 — `combat-core` → `docs/gdd/combat-core.md`
Files: `js/core/gunSystem.js`, `js/core/meleeSystem.js`, `js/authority/damageSystem.js`, `js/authority/combatSystem.js` (combat logic only), `js/authority/attackShapes.js`, `js/authority/telegraphSystem.js`, `js/authority/hazardSystem.js`, `js/client/rendering/hitEffects.js`, `js/shared/gunData.js`, `js/shared/itemData.js`

Agent 2 — `movement-collision` → `docs/gdd/movement-collision.md`
Files: `js/client/input/input.js`, `js/client/input/inputIntent.js`, `js/authority/authorityTick.js`, `js/core/cameraSystem.js`, `js/core/tileRenderer.js` (collision portions), `js/shared/gameConfig.js`, `js/shared/floorConfig.js`, `js/authority/gameState.js`, `js/authority/stateReset.js`

Agent 3 — `mobs-core` → `docs/gdd/mobs-core.md`
Files: `js/shared/mobTypes.js`, `js/authority/mobSystem.js`, `js/authority/combatSystem.js` (MOB_AI portion only, already covered in Agent 1 should be skipped), `js/authority/waveSystem.js`, `js/authority/lootDropSystem.js`, `js/shared/dungeonRegistry.js`

Agent 4 — `scenes-levels` → `docs/gdd/scenes-levels.md`
Files: `js/shared/levelData.js`, `js/core/sceneManager.js`, `js/core/interactable.js`, `js/core/skeldTasks.js`

Agent 5 — `inventory-crafting` → `docs/gdd/inventory-crafting.md`
Files: `js/authority/inventorySystem.js`, `js/authority/craftingSystem.js`, `js/shared/craftingData.js`, `js/shared/progressionData.js`, `js/shared/oreData.js`

Agent 6 — `shared-data` → `docs/gdd/shared-data.md`
Files: `js/shared/armorVisuals.js`, `js/shared/skillRegistry.js`, `js/shared/partyData.js`, `js/shared/fishingData.js`, `js/shared/farmingData.js`, `js/shared/mafiaRoleData.js`, `js/shared/mafiaGameData.js`, `js/shared/hideSeekData.js`

- [ ] **Step 2: Review each agent's return**

For each of the 6 returned outputs, verify:
- Output file exists at the specified path
- File contains all mandatory sections (Source of truth, Purpose, Values, Behavior, Dependencies, Edge cases)
- Grep the file for any number followed by whitespace (not inside a citation) — flag suspicious uncited values
- Agent reported zero or explained UNKNOWN entries

If any agent's output is malformed or has uncited values, re-dispatch that agent with specific corrections.

- [ ] **Step 3: Spot-check 10% of citations**

For each agent's output file, pick 10% of the cited values at random. For each, open the cited line in the JS source and verify the value matches. Any mismatch = full cluster redo.

- [ ] **Step 4: Commit Wave 1 output**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
git add docs/gdd/combat-core.md docs/gdd/movement-collision.md docs/gdd/mobs-core.md docs/gdd/scenes-levels.md docs/gdd/inventory-crafting.md docs/gdd/shared-data.md
git commit -m "GDD Wave 1: combat, movement, mobs, scenes, inventory, shared"
```

---

### Task A3: Dispatch GDD Wave 2 (8 parallel agents — mob abilities + larger systems)

**Files:**
- Create: `docs/gdd/mob-abilities-azurine.md`
- Create: `docs/gdd/mob-abilities-vortalis.md`
- Create: `docs/gdd/mob-abilities-earth205.md`
- Create: `docs/gdd/mob-abilities-earth216.md`
- Create: `docs/gdd/mob-abilities-wagashi.md`
- Create: `docs/gdd/npcs-cooking.md`
- Create: `docs/gdd/party-bots-spar.md`
- Create: `docs/gdd/casino-minigames.md`
- Create: `docs/gdd/ui-hud-saveload.md`

- [ ] **Step 1: Dispatch all 8 agents in a single message (same template as A2)**

Agent 1 — `mob-abilities-azurine` → `docs/gdd/mob-abilities-azurine.md`
Files: find azurine specials file(s) — grep `azurine` in `js/authority/` to locate. Expected: specials file for Floor 1.

Agent 2 — `mob-abilities-vortalis` → `docs/gdd/mob-abilities-vortalis.md`
Files: `js/authority/vortalisSpecials.js`

Agent 3 — `mob-abilities-earth205` → `docs/gdd/mob-abilities-earth205.md`
Files: `js/authority/earth205Specials.js`

Agent 4 — `mob-abilities-earth216` → `docs/gdd/mob-abilities-earth216.md`
Files: `js/authority/earth216Specials.js`, `js/authority/earth216Specials2.js`, `js/authority/earth216Specials3.js`

Agent 5 — `mob-abilities-wagashi` → `docs/gdd/mob-abilities-wagashi.md`
Files: `js/authority/wagashiSpecials.js`, `js/authority/wagashiSpecials2.js`, `js/authority/wagashiSpecials3.js`

Agent 6 — `npcs-cooking` → `docs/gdd/npcs-cooking.md`
Files: `js/authority/cookingNPCBase.js`, `js/authority/cookingSystem.js`, `js/authority/deliNPCSystem.js`, `js/authority/dinerNPCSystem.js`, `js/authority/fineDiningNPCSystem.js`, `js/authority/fineDiningGrill.js`, `js/shared/cookingData.js`

Agent 7 — `party-bots-spar` → `docs/gdd/party-bots-spar.md`
Files: `js/authority/partySystem.js`, `js/authority/botAI.js`, `js/authority/sparSystem.js`, `js/authority/neuralSparInference.js`, `js/authority/mafiaSystem.js`, `js/authority/hideSeekSystem.js`, `js/shared/sparData.js`

Agent 8 — `casino-minigames-ui-saveload` → split into TWO files to keep under 1000 lines each:
- `docs/gdd/casino-minigames.md` — Files: `js/authority/casinoSystem.js`, `js/authority/fishingSystem.js`, `js/authority/farmingSystem.js`, `js/authority/miningSystem.js`, `js/shared/casinoData.js`
- `docs/gdd/ui-hud-saveload.md` — Files: all files in `js/client/ui/`, `js/core/saveLoad.js`, `js/authority/commands.js`, `js/authority/eventBus.js`, `js/authority/snapshots.js`, `js/client/rendering/characterSprite.js`, `js/client/rendering/entityRenderers.js`, `js/client/rendering/hideSeekFOV.js`, `js/client/rendering/mafiaFOV.js`, `js/core/draw.js`, `js/core/assetLoader.js`

(Agent 8 creates both files; it's a single agent with two outputs.)

- [ ] **Step 2: Review each agent's return (same process as A2 Step 2)**

- [ ] **Step 3: Spot-check 10% of citations (same process as A2 Step 3)**

- [ ] **Step 4: Commit Wave 2 output**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
git add docs/gdd/mob-abilities-*.md docs/gdd/npcs-cooking.md docs/gdd/party-bots-spar.md docs/gdd/casino-minigames.md docs/gdd/ui-hud-saveload.md
git commit -m "GDD Wave 2: mob abilities, NPCs, party, casino, UI"
```

---

### Task A4: Build the GDD INDEX

**Files:**
- Create: `docs/gdd/INDEX.md`

- [ ] **Step 1: Write the index file**

Create `docs/gdd/INDEX.md` with a one-line description linking to every GDD file. Format:

```markdown
# Teah Online GDD — Index

See `README.md` for schema and rules.

## Core Systems
- [combat-core.md](combat-core.md) — guns, melee, damage, bullets, telegraphs, hit effects
- [movement-collision.md](movement-collision.md) — player movement, tile collision, camera, input
- [mobs-core.md](mobs-core.md) — mob types, AI, waves, loot drops
- [scenes-levels.md](scenes-levels.md) — level data, scene manager, interactables

## Mob Abilities
- [mob-abilities-azurine.md](mob-abilities-azurine.md) — Floor 1 specials
- [mob-abilities-vortalis.md](mob-abilities-vortalis.md) — Vortalis specials
- [mob-abilities-earth205.md](mob-abilities-earth205.md) — Earth-205 specials
- [mob-abilities-earth216.md](mob-abilities-earth216.md) — Earth-216 specials (3 files)
- [mob-abilities-wagashi.md](mob-abilities-wagashi.md) — Wagashi specials (3 files)

## Gameplay Systems
- [inventory-crafting.md](inventory-crafting.md) — inventory, crafting, progression, ores
- [npcs-cooking.md](npcs-cooking.md) — deli, diner, fine dining, cooking base
- [party-bots-spar.md](party-bots-spar.md) — party system, bot AI, spar, mafia, hide-and-seek
- [casino-minigames.md](casino-minigames.md) — casino games, fishing, farming, mining

## Presentation & Infrastructure
- [ui-hud-saveload.md](ui-hud-saveload.md) — panels, HUD, rendering, save/load, commands, events
- [shared-data.md](shared-data.md) — shared registries not covered elsewhere
```

- [ ] **Step 2: Commit the index**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
git add docs/gdd/INDEX.md
git commit -m "GDD: add navigation index"
```

---

## Track B — Unity Phase 0 Bootstrap

**Track B runs in parallel with Track A Wave 1. These tasks begin after Task A2 is dispatched (Wave 1 agents running in background).**

### Task B1: Prompt User to Close Unity and Prepare Rename

**Files:** none (user action + bash rename)

- [ ] **Step 1: Tell the user to close Unity**

Message the user:
> "Track A Wave 1 is running. Now please CLOSE Unity completely (if it's open) so I can rename the old project folder. Reply when Unity is fully closed."

Wait for user confirmation.

- [ ] **Step 2: Verify no process holds the old project folder**

Run:
```bash
ls "C:/Users/jeff/Desktop/Unity Proj/TeahOnlineUnity/" 2>&1 | head -5
```
Expected: directory listing shown, no "in use" errors.

- [ ] **Step 3: Rename the old project**

```bash
mv "C:/Users/jeff/Desktop/Unity Proj/TeahOnlineUnity" "C:/Users/jeff/Desktop/Unity Proj/TeahOnlineUnity_REFERENCE"
```
Expected: no output, command succeeds.

- [ ] **Step 4: Verify the rename**

```bash
ls "C:/Users/jeff/Desktop/Unity Proj/" 2>&1
```
Expected: shows `TeahOnlineUnity_REFERENCE/` and NOT `TeahOnlineUnity/`.

---

### Task B2: User Creates New Unity Project

**Files:** user-driven

- [ ] **Step 1: Tell the user the exact Unity Hub steps**

Message the user with this exact checklist:
> "Now in Unity Hub:
> 1. Click **New project**
> 2. Template: **2D (Built-in Render Pipeline)** — NOT URP, NOT 2D Core
> 3. Project name: `TeahOnline`
> 4. Location: `C:\Users\jeff\Desktop\Unity Proj\`
> 5. Click **Create project**
> 6. Wait for import (30-60 sec)
> 7. Once Unity is open on the new project, install the MCP bridge package the same way it was installed in the reference project. (If unsure, open the reference project's `Packages/manifest.json` to see the MCP bridge package line and install the same one via Window → Package Manager → Add package from Git URL.)
> 8. Reply 'Unity is open on TeahOnline with MCP bridge installed.'"

Wait for user confirmation.

- [ ] **Step 2: Verify new project exists on disk**

```bash
ls "C:/Users/jeff/Desktop/Unity Proj/TeahOnline/Assets/" 2>&1
```
Expected: shows default Unity folders (Scenes, etc.).

- [ ] **Step 3: Verify MCP can see the new Unity instance**

Use the MCP tool to list instances (check `mcpforunity://instances` resource or run a simple `manage_editor` read).
Expected: `TeahOnline` appears in instance list.

---

### Task B3: Read JS Source for Phase 0 Values

**Files:** (read-only)
- Read: `js/shared/gameConfig.js`
- Read: `js/client/input/input.js`
- Read: `js/authority/authorityTick.js`
- Read: `js/core/cameraSystem.js`

- [ ] **Step 1: Read gameConfig.js and extract required constants**

```bash
# Use the Read tool, not bash cat
```
Use `Read` on `C:/Users/jeff/Desktop/Teah Online/js/shared/gameConfig.js`. Record line numbers for:
- `TILE` (tile size in pixels)
- `MOB_WALL_HW` (collision half-width)
- `MOB_RADIUS`
- Player move speed (may be in this file or `gameState.js` or `authorityTick.js`)
- Any wall collision constants

- [ ] **Step 2: Read input.js and find WASD handling**

Use `Read` on `js/client/input/input.js`. Record line numbers for WASD key codes and the input → intent translation.

- [ ] **Step 3: Read authorityTick.js for player movement application**

Use `Read` on `js/authority/authorityTick.js`. Find where player velocity is applied and collision is checked. Record the exact formula for position update and the function name for collision check.

- [ ] **Step 4: Read cameraSystem.js**

Use `Read` on `js/core/cameraSystem.js`. Record camera follow behavior — offset, deadzone, interpolation (if any), viewport size.

- [ ] **Step 5: Create a scratchpad file (NOT committed) documenting the values**

Create `_temp_phase0_values.txt` in the Teah Online directory with the extracted values and citations. This is a working file, not committed. Example:

```
TILE = 48 (js/shared/gameConfig.js:12)
PLAYER_SPEED = 3.2 (js/shared/gameConfig.js:45)
MOB_WALL_HW = 11 (js/shared/gameConfig.js:78)
...
CAMERA: centered on player, no deadzone (js/core/cameraSystem.js:23-40)
```

---

### Task B4: Create PlayerController.cs

**Files:**
- Create: `Unity Proj/TeahOnline/Assets/Scripts/PlayerController.cs`

- [ ] **Step 1: Write the C# script via Unity MCP**

Use `manage_script` with `action: create`, `name: PlayerController`, `path: Scripts/`. The script content must include header citation comments for every value.

Script template (substitute actual values from Task B3):

```csharp
// PlayerController — Phase 0
// Source of truth: js/client/input/input.js, js/authority/authorityTick.js, js/shared/gameConfig.js
// All values cite js/path:line
using UnityEngine;

public class PlayerController : MonoBehaviour
{
    // PLAYER_SPEED — cite js/shared/gameConfig.js:<LINE>
    public float moveSpeed = <VALUE_FROM_JS>;

    // TILE — cite js/shared/gameConfig.js:<LINE>
    public const float TILE = 48f;

    private TileCollision collision;

    void Start()
    {
        collision = FindObjectOfType<TileCollision>();
    }

    void Update()
    {
        // WASD input — cite js/client/input/input.js:<LINE>
        float h = 0f, v = 0f;
        if (Input.GetKey(KeyCode.A)) h -= 1f;
        if (Input.GetKey(KeyCode.D)) h += 1f;
        if (Input.GetKey(KeyCode.W)) v += 1f; // Unity Y-up; JS uses canvas Y-down
        if (Input.GetKey(KeyCode.S)) v -= 1f;

        if (h != 0f && v != 0f)
        {
            float inv = 1f / Mathf.Sqrt(2f);
            h *= inv; v *= inv;
        }

        // Position update — cite js/authority/authorityTick.js:<LINE>
        Vector2 pos = transform.position;
        Vector2 target = pos + new Vector2(h, v) * moveSpeed * Time.deltaTime;

        // Tile collision — cite js/authority/authorityTick.js:<LINE>
        if (collision != null && collision.PositionClear(target.x, target.y, PlayerController.PlayerHalfWidth()))
        {
            transform.position = target;
        }
    }

    public static float PlayerHalfWidth()
    {
        // MOB_WALL_HW — cite js/shared/gameConfig.js:<LINE>
        return 11f;
    }
}
```

- [ ] **Step 2: Read console to check compile status**

Use `read_console` MCP tool.
Expected: no compilation errors for PlayerController. If errors, fix them before proceeding.

---

### Task B5: Create TileCollision.cs

**Files:**
- Create: `Unity Proj/TeahOnline/Assets/Scripts/TileCollision.cs`

- [ ] **Step 1: Find JS positionClear implementation**

Use Grep on `js/` for `function positionClear` or `positionClear =`. Record the exact file, line, and logic.

- [ ] **Step 2: Write TileCollision.cs via manage_script**

Script template (substitute actual grid lookup logic from JS):

```csharp
// TileCollision — Phase 0 mirrors js positionClear()
// Source of truth: js/<FILE>.js:<LINE>
using UnityEngine;

public class TileCollision : MonoBehaviour
{
    // Tile grid — placeholder static grid for Phase 0
    // Phase 0 only needs "some walls exist"; full tile loading comes later
    private bool[,] blockedTiles;
    public int gridWidth = 50;
    public int gridHeight = 50;
    public const float TILE = 48f;

    void Awake()
    {
        blockedTiles = new bool[gridWidth, gridHeight];
        // Hand-place a few walls for Phase 0 verification
        for (int x = 0; x < gridWidth; x++)
        {
            blockedTiles[x, 0] = true;
            blockedTiles[x, gridHeight - 1] = true;
        }
        for (int y = 0; y < gridHeight; y++)
        {
            blockedTiles[0, y] = true;
            blockedTiles[gridWidth - 1, y] = true;
        }
    }

    // Mirrors js positionClear(px, py, hw) — cite js/<FILE>.js:<LINE>
    public bool PositionClear(float px, float py, float hw)
    {
        // AABB check against blocked tiles
        float left = px - hw;
        float right = px + hw;
        float bottom = py - hw;
        float top = py + hw;

        int x0 = Mathf.FloorToInt(left / TILE);
        int x1 = Mathf.FloorToInt(right / TILE);
        int y0 = Mathf.FloorToInt(bottom / TILE);
        int y1 = Mathf.FloorToInt(top / TILE);

        for (int x = x0; x <= x1; x++)
        {
            for (int y = y0; y <= y1; y++)
            {
                if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) return false;
                if (blockedTiles[x, y]) return false;
            }
        }
        return true;
    }
}
```

- [ ] **Step 3: read_console for compile errors**

Expected: no errors. Fix if any.

---

### Task B6: Create CameraFollow.cs

**Files:**
- Create: `Unity Proj/TeahOnline/Assets/Scripts/CameraFollow.cs`

- [ ] **Step 1: Write CameraFollow.cs via manage_script**

```csharp
// CameraFollow — Phase 0
// Source of truth: js/core/cameraSystem.js:<LINE>
using UnityEngine;

public class CameraFollow : MonoBehaviour
{
    public Transform target;

    void LateUpdate()
    {
        if (target == null) return;
        // Center on target — cite js/core/cameraSystem.js:<LINE>
        Vector3 pos = target.position;
        pos.z = -10f;
        transform.position = pos;
    }
}
```

- [ ] **Step 2: read_console for compile errors**

Expected: no errors.

---

### Task B7: Wire Scene via Unity MCP

**Files:**
- Modify: `Unity Proj/TeahOnline/Assets/Scenes/SampleScene.unity` (rename to `Lobby.unity` if possible, else use SampleScene)

- [ ] **Step 1: Open the default scene**

Use `manage_scene` with `action: open`, scene path `Assets/Scenes/SampleScene.unity`.

- [ ] **Step 2: Create the Player GameObject**

Use `manage_gameobject` with `action: create`, name `Player`, position `(1000, 1000, 0)` (inside the grid bounds).

- [ ] **Step 3: Add visual to Player**

Use `manage_gameobject` to add a `SpriteRenderer` component. Set it to a built-in Unity square sprite (or any placeholder). Color green so it's visible.

- [ ] **Step 4: Attach PlayerController to Player**

Use `manage_components` with `action: add`, component `PlayerController`.

- [ ] **Step 5: Create the TileCollision GameObject**

Use `manage_gameobject` with `action: create`, name `TileCollision`, attach `TileCollision` component.

- [ ] **Step 6: Attach CameraFollow to Main Camera**

Use `manage_gameobject` to find `Main Camera`. Use `manage_components` to add `CameraFollow`. Set `target` field to the Player GameObject reference.

- [ ] **Step 7: Set camera orthographic size**

Use `manage_components` to set `Camera.orthographicSize` to match the JS viewport (e.g., half the visible height in world units; if JS canvas is 720 tall and TILE=48, set to 7.5 — but verify against `cameraSystem.js`).

- [ ] **Step 8: Add a visible wall for testing**

Create a second GameObject with a SpriteRenderer (red square) positioned at `(1200, 1000, 0)` so there's something visible to walk into. This is just for visual confirmation; the actual collision is handled by `TileCollision.blockedTiles`.

- [ ] **Step 9: Save the scene**

Use `manage_scene` with `action: save`.

- [ ] **Step 10: read_console**

Expected: no errors, no warnings about missing references.

---

### Task B8: Play Mode Verification

**Files:** none

- [ ] **Step 1: Enter Play mode via MCP**

Use `manage_editor` with `action: play` (or equivalent).

- [ ] **Step 2: Tell the user to verify**

Message the user:
> "Unity is now in Play mode. Please confirm in the Unity Editor:
> 1. Can you see a green player square?
> 2. Does WASD move the player?
> 3. Does the player stop at the grid edges (walls)?
> 4. Does the camera follow the player?
>
> Reply with which of 1-4 work and which don't."

Wait for user response.

- [ ] **Step 3: Fix-forward any failures**

For each failure reported, diagnose and fix. Re-run Play mode verification. Do NOT move on until all 4 pass.

- [ ] **Step 4: Exit Play mode**

Use `manage_editor` with `action: stop`.

- [ ] **Step 5: Commit Phase 0 in the new Unity project**

```bash
cd "C:/Users/jeff/Desktop/Unity Proj/TeahOnline"
git init 2>&1 || true
git add .
git commit -m "Phase 0: player walks in lobby with wall collision and camera follow"
```

(If the new Unity project already has a git repo, skip `git init`. If it shares a repo with the Teah Online repo, commit from there instead.)

---

## Track C — Housekeeping

### Task C1: Update CLAUDE.md to Promote GDD as #1 Rule

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current CLAUDE.md**

Use `Read` on `C:/Users/jeff/Desktop/Teah Online/CLAUDE.md`.

- [ ] **Step 2: Replace "The #1 Rule" section**

Use `Edit` to replace the current `## The #1 Rule` section with:

```markdown
## The #1 Rule

**`docs/gdd/` is the source of truth for the Unity port. The JS is the source of truth for the GDD.**

The Game Design Document in `docs/gdd/` is a citation-backed, machine-greppable description of every system, value, formula, and interaction in Teah Online. It was extracted directly from the JS source with mandatory `js/file.js:line` citations. When porting to Unity:

1. **Read the GDD first.** Every Unity script must cite the GDD section(s) it implements.
2. **The GDD is authoritative for values.** Fire rates, damage, timers, HP — use the value in the GDD, not the one you remember.
3. **If the GDD is wrong, fix the GDD first, then the port.** Never port against a value you invented.
4. **If JS changes, update the GDD in the same commit.** The GDD is code, not docs.
5. **If a system isn't in the GDD yet, add it to the GDD before touching Unity.**

Every system, every mechanic, every interaction — combat, chat, profile menu, inventory, walking, shooting, menus, NPCs, portals, everything — must work in Unity EXACTLY how the GDD says it works, which is EXACTLY how the JS works.
```

- [ ] **Step 3: Update Unity project path in the `## Project` section**

Use `Edit` to change:
```
- **Unity port**: `C:\Users\jeff\Desktop\Unity Proj\TeahOnlineUnity` (Unity 6, 6000.4.0f1)
```
to:
```
- **Unity port**: `C:\Users\jeff\Desktop\Unity Proj\TeahOnline` (Unity 6, 6000.4.0f1, 2D Built-in)
- **Unity reference (read-only)**: `C:\Users\jeff\Desktop\Unity Proj\TeahOnlineUnity_REFERENCE` — old port, hints only
```

- [ ] **Step 4: Update Unity Port Status section**

Use `Edit` to change the Unity Port Status header line from:
```
**179 C# scripts exist. 0 are wired into the scene. The game does not run.** Script count is not progress — Play mode is progress.
```
to:
```
**Fresh project `TeahOnline/` — Phase 0 shipped (player walks in lobby). Old `TeahOnlineUnity_REFERENCE/` is read-only hint material.** Script count is not progress — Play mode is progress.
```

And change the `**Current phase:**` line from:
```
**Current phase:** **-1 — C# Triage** (audit all 179 scripts into keep/fix/delete before Phase 0)
**Next phase:** 0 — Bootstrap (player walks in the lobby in Play mode)
```
to:
```
**Current phase:** **0 complete** — player walks in lobby with collision and camera
**Next phase:** 1 — first JS commit cluster or first GDD system (TBD at next session)
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
git add CLAUDE.md
git commit -m "CLAUDE.md: GDD is now #1 source of truth, Unity project path updated"
```

---

### Task C2: Delete Temporary Scratchpad

**Files:**
- Delete: `_temp_phase0_values.txt` (if it exists and wasn't already deleted)

- [ ] **Step 1: Remove scratchpad**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
rm -f _temp_phase0_values.txt
```

- [ ] **Step 2: Verify clean working tree**

```bash
git status
```
Expected: working tree has no new files except what's already committed.

---

### Task C3: Final Push

**Files:** none

- [ ] **Step 1: Push all commits**

```bash
cd "C:/Users/jeff/Desktop/Teah Online"
git push origin main
```

- [ ] **Step 2: Tell the user the results**

Message the user with a summary:
- Number of GDD files created and total values cited
- Phase 0 status (playable/not)
- Any UNKNOWN values flagged by agents for follow-up
- Next session's starting point

---

## Self-Review Notes

- Spec coverage: all 6 success criteria from the spec are covered (GDD files, citations, spot-check, Phase 0 playable, old project renamed, CLAUDE.md updated).
- Placeholder scan: `<LINE>` and `<VALUE_FROM_JS>` placeholders in B4/B5/B6 are intentional — they must be filled in at execution time from the values read in B3. The agent executing B4 must do the substitution.
- Type consistency: `PositionClear(float, float, float)` matches between PlayerController.cs usage and TileCollision.cs definition. `PlayerHalfWidth()` is defined in PlayerController as a static method.
- `positionClear` JS signature assumption — actual signature must be verified in B5 Step 1 before writing the C# version. If JS uses different parameters (e.g. `positionClear(px, py, hw, mobId)`), the C# mirror must match.
- Mob abilities: Wave 2 assumes one specials file per dungeon. Azurine file location is discovered at execution time (see A3 Agent 1 note). If files don't match expectation, adjust cluster at dispatch time.
