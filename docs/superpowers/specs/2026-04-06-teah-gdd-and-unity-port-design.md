# Teah Online — GDD-Driven Unity Port

**Date:** 2026-04-06
**Status:** Draft — pending user approval
**Supersedes:** `2026-04-06-unity-phase-minus-1-triage-design.md`, `2026-04-04-unity-port-reboot-design.md`

## Problem

The Unity port has 179 C# scripts, 0 wired into a scene, and 0% playable. Over multiple iterations, progress has been measured by script count instead of Play mode. 55% of shipped bugs were invented values (`feedback_unity_port_root_causes.md`) — agents wrote C# against guessed numbers instead of reading the JS. Audits repeatedly missed issues because every audit re-reads 121k lines of JS from scratch.

The root cause is that **there is no single, authoritative, machine-greppable description of what Teah Online is.** Every agent, every session, starts from scratch with 91 JS files. Without a source of truth other than the JS itself, drift is inevitable.

## Goal

Produce `docs/gdd/` — a comprehensive, citation-backed Game Design Document covering every system, value, formula, and interaction in Teah Online, built by parallel agent extraction from the JS source. The GDD becomes the authoritative reference for the Unity port and for all future work. Simultaneously, bootstrap a clean new Unity project (`TeahOnline/`) with a playable Phase 0 (walk + walls + camera) so progress is visible from day one.

**Success criteria:**

1. `docs/gdd/` exists with one markdown file per system, covering combat, mobs, movement, scenes, inventory, NPCs, party, casino, spar, UI, save/load, progression, cooking, dungeons, and all 435 mob abilities.
2. Every numeric value (HP, damage, timer, cooldown, speed, radius, range, fire rate, price, formula constant) is cited as `js/path/file.js:LINE`.
3. At least 10% of citations are spot-checked by the main session and verified to match the actual JS line.
4. A new Unity project `TeahOnline/` exists with 2D Built-in pipeline configured, player walks in lobby with wall collision and camera follow, verified in Play mode by the user.
5. The old Unity project is renamed to `TeahOnlineUnity_REFERENCE/` and treated as read-only hint material.
6. CLAUDE.md is updated to make the GDD the #1 source of truth (above "match JS"), because the GDD *is* the authoritative encoding of JS.

**Non-goals:**

- Porting additional Unity systems beyond Phase 0 in this spec (that's Phase 1+, covered by follow-up plans)
- Modifying JS code (source of truth, read-only during this work)
- Writing narrative / lore / player-experience essays (GDD is reference, not marketing)
- Documenting emergent behavior of trained systems (e.g. spar neural bot policy) — only its mechanics

## Scope

**In scope (GDD):**
- All 91 non-backup JS files under `js/`
- All registries: MOB_TYPES, MOB_AI, MOB_SPECIALS, ENTITY_RENDERERS, HIT_EFFECT_RENDERERS, LEVELS, PROG_ITEMS
- All systems listed in CLAUDE.md's "Key Systems Quick Reference"
- All 435 mob abilities across all 5 dungeons
- All UI panels and HUD elements
- Save/load schema v10

**In scope (Unity Phase 0):**
- New project bootstrap (`TeahOnline/`, 2D Built-in, Unity 6000.4.0f1)
- Player GameObject with input-driven movement
- Wall collision (tile-based AABB, matching JS `positionClear` semantics)
- Camera follow (matching JS camera behavior)
- One scene loaded (lobby)
- Play mode verification by user

**Out of scope:**
- JS backup files (`*_backup_pre_*.js`)
- Neural network weights / training data (mechanics only)
- Unity port of any system beyond walk+walls+camera
- Any modification to `TeahOnlineUnity_REFERENCE/` (the old project)
- Art, sprites, tile graphics for Phase 0 (placeholder squares are fine)

## Approach

Two parallel tracks running in the same session, with agents dispatched in waves.

### Track A — GDD Extraction (parallel agents)

**A1. Lock the schema (main session, before any agent dispatch).**

Define `docs/gdd/README.md` as the schema-lock document. It specifies:

- GDD file naming convention (`<system>.md`, lowercase, dash-separated)
- Mandatory sections per system file:
  - `## Source of truth` — list of JS files that implement this system
  - `## Purpose` — one paragraph, what it is and why it exists
  - `## Values` — structured table, every number with citation
  - `## Behavior` — what happens in what order (bullet list or numbered steps)
  - `## Dependencies` — what other systems this reads from or writes to
  - `## Edge cases` — non-obvious interactions, known quirks
- Format rules:
  - **Tight schema** for combat, mobs, values, formulas, damage, timers — structured tables, zero prose ambiguity
  - **Narrative allowed** for NPC dialogue systems, cooking flavor, casino game rules, UI flow — but still must cite values
- Citation rule: every numeric value gets `(js/path.js:LINE)` inline. No exceptions.
- Length discipline: most system files should be 200-600 lines. If a file exceeds 1000 lines, split it.

**A2. Partition JS into clusters (main session).**

Split the 91 JS files into ~10 clusters that can be processed independently. Each agent gets one cluster. Clusters are drawn so that cross-cluster dependencies are minimized:

1. **Combat core** — gunSystem, meleeSystem, bulletSystem, damageSystem, hitEffects
2. **Movement & collision** — player movement, positionClear, tile collision, camera
3. **Mobs core** — mobTypes, mobAI, combatSystem mob logic, wave system
4. **Mob abilities** — all `*Specials*.js` files (9 files, 435 abilities, may need sub-splitting)
5. **Scenes & levels** — levelData, scene state machine, portals, interactables
6. **Inventory & crafting** — inventorySystem, craftingSystem, progressionData, items
7. **NPCs & cooking** — deliNPCSystem, cookingNPCBase, restaurant systems (5,772 lines)
8. **Party, bots & spar** — partySystem, botAI, sparSystem, sparData
9. **Casino & minigames** — casinoSystem, casinoData, fishing, farming
10. **UI, HUD, save/load** — panels, HUD, saveLoad, commands, events, gameConfig

**A3. Dispatch waves (6-8 agents per wave).**

Wave 1 dispatches clusters 1, 2, 3, 5, 6, 10 (foundational systems). Main session waits for all to return. Reviews output for:
- Citation quality (grep for numbers without `(js/...)` suffix)
- Schema adherence (all mandatory sections present)
- Length discipline (flag files >1000 lines for split)

Wave 2 dispatches clusters 4, 7, 8, 9 (larger / more complex systems). Same review process.

If any agent returns incomplete or sloppy output, the main session re-dispatches that cluster with specific corrections. Do not accept "close enough."

**A4. Integration & audit (main session).**

- Cross-reference: grep for values that appear in multiple clusters (e.g., player HP referenced by combat AND UI AND save/load). Verify they agree.
- Spot-check 10% of citations by reading the cited line. Mismatch = cluster redone.
- Build `docs/gdd/INDEX.md` — a one-page index with links to every GDD file and one-line descriptions.
- Commit the complete GDD as a single commit on `main`.

### Track B — Unity Phase 0 Bootstrap (single agent, runs in parallel with Track A)

Track B runs simultaneously with Track A Wave 1. It does not depend on the GDD being complete because Phase 0's scope (walk + walls + camera) is small enough to port directly from JS.

**B1. Rename old project** — `Unity Proj/TeahOnlineUnity/` → `Unity Proj/TeahOnlineUnity_REFERENCE/`. Verify no scripts or tools reference the old path before renaming.

**B2. Create new project** — `Unity Proj/TeahOnline/` using Unity 6000.4.0f1, 2D Built-in pipeline template. Configure:
- Input System package (matches reference project)
- Tile size constant = 48px (JS `TILE = 48`, cite `js/shared/gameConfig.js`)
- Scene aspect / camera orthographic size set to match JS canvas viewport
- One scene: `Lobby.unity`

**B3. Port walk + walls + camera directly from JS.**

- Read `js/client/input/input.js`, `js/shared/gameConfig.js`, the player movement section of `js/core/draw.js` or wherever player update lives
- Write a single `PlayerController.cs` that handles WASD input, applies velocity, calls collision check
- Write a single `TileCollision.cs` that mirrors `positionClear(px, py, hw)` semantics — grid-based AABB, `MOB_WALL_HW` and `MOB_RADIUS` constants cited from JS
- Write a single `CameraFollow.cs` that tracks player position with whatever offset/deadzone JS uses
- Every numeric value in every script must cite `js/file.js:line`
- Place a placeholder player sprite (green square is fine) and a few wall tiles in `Lobby.unity`

**B4. User verification.**

User opens the project, enters Play mode, confirms:
- Player moves with WASD
- Player cannot walk through walls
- Camera follows player

If any of those fail, Phase 0 is not done. Fix forward.

**B5. Commit** — Phase 0 bootstrap as a single commit in the new Unity project.

### Track C — Housekeeping

- Update CLAUDE.md: GDD becomes #1 rule, above "match JS." The GDD *is* the encoding of JS.
- Update CLAUDE.md: Unity path points to new project, reference project path documented.
- Mark old triage spec as superseded with a header note.

## Risks

1. **GDD extraction takes longer than expected.** 121k lines is a lot. Mitigation: the format is mostly tables, not prose. Agents are extracting, not writing. Schema lock in A1 prevents freestyling. If a wave runs long, it runs long — this is a one-time cost.

2. **Agents invent citations.** Mitigation: 10% spot-check in A4. Any mismatch triggers full cluster redo. Agents are explicitly told citations will be verified.

3. **GDD goes stale as JS changes.** Mitigation: CLAUDE.md rule — JS changes must update GDD in the same commit. Since active development on JS has mostly stopped in favor of Unity work, drift risk is low.

4. **Track B Phase 0 blocks on a Unity quirk.** Mitigation: fix forward, don't rewrite. If something can't be resolved in one session, commit the partial work and raise the issue in the next session.

5. **Waves get out of sync with review time.** The main session must actually review each wave's output before dispatching the next — no rubber-stamping. If review reveals systemic issues (e.g., whole wave missed citations), fix the instructions and re-dispatch the whole wave.

6. **The user gets impatient with "still no Unity progress" halfway through the GDD.** Mitigation: Track B Phase 0 exists specifically for this — the walking player ships alongside the GDD, not after it.

## Deliverables

1. `docs/gdd/` — folder with ~25-35 markdown files, one per system, plus `README.md` (schema lock) and `INDEX.md` (navigation)
2. `Unity Proj/TeahOnline/` — new Unity project with Phase 0 playable
3. `Unity Proj/TeahOnlineUnity_REFERENCE/` — renamed old project, untouched
4. Updated `CLAUDE.md` with GDD as #1 rule and new Unity project path
5. Old triage spec marked superseded
6. Commits:
   - GDD commit (one big commit on `main`)
   - Phase 0 Unity bootstrap commit (in new Unity project)
   - CLAUDE.md update commit
   - Triage spec supersede commit

## Next

After this spec is approved, use the `writing-plans` skill to produce the detailed implementation plan, including exact cluster partitioning of the 91 JS files, exact agent instructions per cluster, the GDD schema template, and the Phase 0 Unity bootstrap checklist. The implementation plan goes to `docs/superpowers/plans/2026-04-06-teah-gdd-and-unity-port-plan.md`.
