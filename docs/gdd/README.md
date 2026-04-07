# Teah Online — Game Design Document

This directory is the authoritative reference for every system, value, formula, and interaction in Teah Online. It is generated from the JS source code via citation-backed extraction. When JS changes, the GDD updates in the same commit.

**The GDD is the source of truth for the Unity port. The JS is the source of truth for the GDD.**

## Schema (all system files MUST follow this)

Every file in `docs/gdd/` (except this README and `INDEX.md`) describes one system cluster and must contain the following sections, in this order.

### `## Source of truth`

Bullet list of every JS file that implements this system, with one-line descriptions.

Example:
```
- `js/core/gunSystem.js` — gun firing authority and bullet spawning
- `js/shared/gunData.js` — gun definitions and stats
```

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

Ordered bullet list or numbered steps describing what happens when the system runs. Each step that triggers on a specific value must cite that value.

Example:
1. On mouse click, check `canFire` (js/core/gunSystem.js:112)
2. If true, spawn bullet at player position + muzzle offset (js/core/gunSystem.js:118)
3. Set cooldown timer to FIRE_RATE (js/core/gunSystem.js:125)

### `## Dependencies`

Bullet list of other systems this reads from or writes to.

Example:
```
- Reads: `player.x`, `player.y`, `player.facing` (from js/authority/gameState.js)
- Writes: `bullets[]` array (to js/authority/gameState.js)
- Emits: `bullet:spawned` event (via js/authority/eventBus.js)
```

### `## Edge cases`

Bullet list of non-obvious interactions, known quirks, or gotchas. If none, write `None documented.`

## Format rules

- **Tight schema** for combat, mobs, values, formulas, damage, timers — tables only, zero prose ambiguity.
- **Narrative allowed** for NPC dialogue systems, cooking flow, casino game rules, UI navigation — but every value in the narrative must still cite.
- **Citation rule** — every numeric value gets `(js/path.js:LINE)` inline or in a table column. No exceptions.
- **Length discipline** — most files should be 200–600 lines. If a file exceeds 1000 lines, split it into `<name>-1.md`, `<name>-2.md` with a shared intro.
- **No invented values** — if you cannot find a value in the JS, write `UNKNOWN` in the Value column. Do not guess.
- **No cross-cluster work** — your cluster is your cluster. Do not document systems outside it. List cross-cluster needs under Dependencies.
- **No backup files** — never read from `*_backup_pre_*.js`. Those are snapshots, not source of truth.
