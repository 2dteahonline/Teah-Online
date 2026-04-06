# Phase -1: Unity C# Triage

**Date:** 2026-04-06
**Status:** Draft — pending user approval
**Precedes:** Phase 0 (Bootstrap — player walks in lobby)

## Problem

The Unity port has 179 C# scripts, 1 default scene (`SampleScene.unity`), and 0 prefabs. Nothing runs. Over multiple iterations, work has added more scripts rather than making the game playable. Audits have repeatedly missed wrong values (20+ documented in `feedback_unity_port_parity.md`) because scripts were written against invented values instead of JS source lines (55% of bugs — `feedback_unity_port_root_causes.md`).

Before Phase 0 can start, we need to know which of the 179 scripts are trustworthy, which are wrong, and which are unwired garbage. Without this, Phase 0 will wire broken scripts into the scene and repeat the same mistakes.

## Goal

Produce a single authoritative document — `docs/unity-triage.md` — that classifies every one of the 179 C# scripts into exactly one of four buckets, and produces a concrete "delete list" and "fix list" that Phase 0 can act on.

**Success criteria:**
1. Every C# script in `Unity Proj/TeahOnlineUnity/Assets/Scripts/` appears in `unity-triage.md` exactly once.
2. Each script has a status (WIRED / CODE-ONLY / WRONG / UNKNOWN), a one-line purpose, and — if WRONG — a citation of the bug and the JS source line it should match.
3. A **kill list** is produced: scripts to delete outright (duplicates, abandoned stubs, diverged v2 attempts).
4. A **trust list** is produced: scripts Phase 0 is allowed to wire without re-auditing.
5. A **fix list** is produced: scripts that are keep-worthy but have known-wrong values, with JS source citations.
6. No C# scripts are written or deleted during Phase -1. Triage is read-only analysis. Deletions happen at the start of Phase 0.

**Non-goals:**
- Fixing bugs (that's Phase 0+)
- Wiring scene GameObjects (that's Phase 0)
- Writing new scripts (banned by CLAUDE.md hard stop until Phase 0 ships)
- Touching the JS codebase (source of truth, do not modify)

## Scope

**In scope:** All files under `Unity Proj/TeahOnlineUnity/Assets/Scripts/` (179 `.cs` files across `Authority/`, `Client/`, `Core/`, `Data/`, `Editor/`, `Shared/`).

**Out of scope:** `ScriptableObjects/`, `Prefabs/`, `Scenes/`, `Resources/`, `Art/`, `Tilemaps/`. These are empty or near-empty and will be populated in Phase 0+.

## Approach

Triage is a read-only pass done in parallel across the six script directories. Each bucket is audited by comparing the C# file against its JS counterpart and checking whether any scene or prefab references it.

### Classification rules

A script is **WIRED** if and only if it is referenced by a GameObject in `SampleScene.unity` or a prefab. (Current answer: zero scripts are WIRED. The bucket exists for Phase 0+ use.)

A script is **WRONG** if any of these are true:
- It contains a numeric value, timer, cooldown, or formula that does not match the corresponding JS source line
- It reimplements a system that already exists in another C# script (duplicate)
- Its architecture diverges from the JS authority/client split
- It depends on a field or method name that does not exist on the other side of an API
- It contains a Y-axis value copied from canvas without Y-up conversion

A script is **CODE-ONLY** if it compiles, is not referenced by any scene or prefab, has been spot-checked against JS, and no WRONG criteria apply. CODE-ONLY is the default "trusted but unwired" bucket — these are candidates for Phase 0+ wiring.

A script is **UNKNOWN** if it has not yet been audited. Every script starts here. The goal of Phase -1 is to move every script out of UNKNOWN.

### Spot-check depth (per script)

Because 179 scripts cannot all be line-by-line audited in one pass without another 70-bug audit cycle, each script gets a **bounded spot-check**:

1. **Read the C# file in full.** If >500 lines, read the whole thing anyway — large files hide the most bugs.
2. **Identify the JS counterpart** by filename, system name, or header comment. If no counterpart exists in JS, the script is likely WRONG (invented system) or belongs to Unity-only plumbing (e.g., `MonoBehaviour` lifecycle adapters).
3. **Sample 5 numeric values** — any timer, speed, damage, cooldown, range, radius, or size. For each, grep the JS source and verify the value matches. A single mismatch = WRONG.
4. **Sample 3 field/method names** used across an API boundary (e.g., script A reads `mob.foo`, does JS have `mob.foo` with the same meaning?). A single mismatch = WRONG.
5. **Check for Y-axis bugs** — any `transform.position.y`, `velocity.y`, `angle`, or direction math. If the source JS is canvas-Y-down and the C# does not flip, mark WRONG.

This is a spot-check, not a proof. A script marked CODE-ONLY may still have bugs Phase 0 discovers during wiring. That is acceptable — the goal is to catch the obvious disasters before wiring, not to formally verify 179 scripts.

### Parallelization

The six directories are independent and will be audited in parallel using sub-agents, one per directory:
- `Authority/` — combat, damage, waves, mobs (largest, most bug-prone)
- `Client/` — rendering, input, UI panels
- `Core/` — GameManager, SceneManager, AuthorityTick, PlayerController
- `Data/` — registries (MOB_TYPES, MOB_AI, MOB_SPECIALS, etc.)
- `Shared/` — shared config, constants
- `Editor/` — Unity editor tooling (lowest priority, likely all CODE-ONLY)

Each agent is given:
- The exact classification rules above
- The three mandatory memory files (`feedback_unity_port_parity.md`, `feedback_unity_port_root_causes.md`, `feedback_playability_not_compilation.md`)
- The JS source root path
- A template for its section of `unity-triage.md`
- **Explicit instruction: do not edit, delete, or create any files. Read-only.**

Each agent returns a markdown section with one row per script. The main session assembles the sections into `unity-triage.md`.

## Output: `docs/unity-triage.md`

Single file, one table per directory, plus three summary lists at the top.

```markdown
# Unity C# Triage — 2026-04-06

## Kill List (delete at start of Phase 0)
- Scripts/Authority/FooSystem.cs — duplicate of BarSystem.cs
- ...

## Fix List (keep, but wrong — fix before wiring)
- Scripts/Authority/GunSystem.cs — fire rate 0.15 should be 0.12 (js/authority/gunSystem.js:47)
- ...

## Trust List (CODE-ONLY, safe to wire in Phase 0)
- Scripts/Core/AuthorityTick.cs
- ...

## Authority/ (N scripts)
| Script | Status | Purpose | Notes |
|--------|--------|---------|-------|
| GunSystem.cs | WRONG | Gun firing authority | Fire rate mismatch, see Fix List |
| ... | | | |

## Client/ (N scripts)
...
```

## Risks

1. **Agents mark scripts CODE-ONLY based on shallow reads and miss bugs.** Mitigation: the spot-check rules require sampling 5 numeric values and 3 API names. Missing a bug is acceptable; we catch them in Phase 0 wiring. Missing an *obvious* bug (wrong fire rate, duplicate system) is not.

2. **Agents invent JS line citations.** Mitigation: every citation must be in the form `js/path/file.js:LINE`. The main session spot-checks 10% of citations before committing `unity-triage.md`.

3. **Triage becomes its own multi-day rabbit hole.** Mitigation: hard time-box. Phase -1 is one session. If a directory takes more than one agent invocation to triage, mark the remaining scripts UNKNOWN and move on. UNKNOWN scripts are treated as untrusted and re-audited lazily when Phase 0 needs them.

4. **The user approves Phase 0 starting before triage is complete.** Mitigation: the triage document itself is the gate. Phase 0 cannot start until `unity-triage.md` exists and is committed.

## Deliverables

1. `docs/unity-triage.md` — the classification document
2. A commit on `main` containing only that file and this spec
3. A short summary message to the user: "X killed, Y to fix, Z trusted. Phase 0 ready to start."

## Next

After Phase -1 completes, the implementation plan for Phase 0 (Bootstrap) is written using the `writing-plans` skill. Phase 0 will consume the Kill List (delete), Fix List (fix in place), and Trust List (wire into scene).
