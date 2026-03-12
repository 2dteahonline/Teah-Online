# Conventions

## Overview

Coding conventions, mandatory rules, and checklists for working on Teah Online. Following these conventions prevents common bugs, maintains consistency across the codebase, and avoids breaking the authority/client split.

## JavaScript Scoping: `let` in `<script>` Tags

Variables declared with `let` (or `const`) at the top level of a `<script>` tag are in **global lexical scope**. This means:

- They are accessible from other `<script>` tags and from `eval()`
- They are **NOT** on the `window` object
- `typeof myLetVar` works, but `window.myLetVar` is `undefined`
- This is by design -- the codebase relies on this behavior extensively

```js
<!-- script A -->
<script>
  let foo = 42;  // global lexical scope, NOT window.foo
</script>

<!-- script B -->
<script>
  console.log(foo);        // 42 -- works fine
  console.log(window.foo); // undefined -- NOT on window
</script>
```

Variables that need to be on `window` (like `GameState`, debug flags) are explicitly assigned with `window.` prefix.

## Backup Convention

Before making major changes to any file, create a backup copy:

```
originalFile.js  -->  originalFile_backup_pre_<feature>.js
```

Examples from the codebase:
- `inventorySystem_backup_pre_audit.js`
- `input_backup_pre_audit.js`
- `characterSprite_backup_pre_audit.js`
- `draw_backup_pre_audit.js`

Backups are untracked (not committed) and serve as a safety net during development.

## Cache Busting

When modifying scripts, two version numbers must be incremented:

1. **Query param on `<script>` tags** in `index.html`: `?v=70` (or higher). Increment for the specific file you changed.
2. **`const _v`** in the inline `<script>` block at the top of `index.html` (currently `const _v = 15`). This is a global cache-bust version.

Both must be updated or browsers may serve stale cached versions of your changes.

## Collision System

### `positionClear(px, py, hw)`

Grid-based AABB collision check. Returns `true` if the position is not inside any solid tile.

- Defined in `js/authority/mobSystem.js`
- `hw` defaults to `GAME_CONFIG.POS_HW` (12) if not provided
- Checks the four corner tiles of the bounding box `(px - hw, py - hw)` to `(px + hw, py + hw)`
- Uses `isSolid(col, row)` for tile lookup

### Collision Constants

| Constant | Value | Used For |
|----------|-------|----------|
| `PLAYER_WALL_HW` | 16 | Player wall collision half-width |
| `PLAYER_RADIUS` | 27 | Player body-blocking circle |
| `MOB_WALL_HW` | 14 | Mob wall collision half-width |
| `MOB_RADIUS` | 27 | Mob body-blocking circle |
| `POS_HW` | 12 | Default `positionClear` half-width (spawn clearance) |

### Common Pitfall: `positionClear` Default `hw`

If you call `positionClear(px, py)` without the third argument, it uses `POS_HW` (12), which is smaller than `PLAYER_WALL_HW` (16) or `MOB_WALL_HW` (14). A position that passes `positionClear` may still cause wall clipping for the player or mobs. Always pass the appropriate `hw` for the entity you are checking.

## Adding Mobs Checklist

When adding a new mob type, you must update four registries:

1. **`MOB_TYPES`** in `js/shared/mobTypes.js`
   - Define hp, speed, damage, contactRange, AI pattern, color, special abilities
   - Optionally set `radius`, `wallHW` for custom collision sizes

2. **`MOB_AI`** in `js/authority/combatSystem.js`
   - Add a movement pattern entry (11 patterns exist: basic, tank, runner, etc.)
   - Controls how the mob moves toward/around the player

3. **`MOB_SPECIALS`** in `js/authority/combatSystem.js`
   - Add special ability entries if the mob has abilities (38 abilities exist)
   - Defines cooldowns, ranges, damage, projectile types

4. **`ENTITY_RENDERERS`** in `js/client/rendering/entityRenderers.js`
   - Add a renderer function if the mob needs custom visuals (54 renderers exist)
   - If omitted, the mob uses the default procedural renderer

### Common Pitfall: `createMob` Parameters

`createMob(typeKey, x, y, hpMult, spdMult, opts)` in `js/authority/waveSystem.js` requires `hpMult` and `spdMult`. These are multipliers applied to the base stats from `MOB_TYPES`. Forgetting them (or passing `undefined`) will result in `NaN` hp/speed. Always pass at least `1, 1` for baseline stats:

```js
createMob('my_new_mob', x, y, 1, 1);
```

## Adding Entities Checklist

When adding a new interactive entity (chest, NPC, door, etc.):

1. **`ENTITY_RENDERERS`** in `js/client/rendering/entityRenderers.js`
   - Add a renderer function keyed by entity type string
   - The function receives `(entity, camX, camY)` and draws to the global `ctx`

2. **Level data** in `js/shared/levelData.js`
   - Add the entity to the appropriate level's entity array with `x`, `y`, `type`, and any custom properties

3. **Interaction logic** in `js/core/interactable.js` (if the entity is interactive)
   - Add handling for the entity type in the interaction system

## File Modification Checklist

Before modifying any file:

1. Create a backup: `cp original.js original_backup_pre_<feature>.js`
2. Increment the `?v=N` query param on the file's `<script>` tag in `index.html`
3. Test that the game loads without console errors
4. Test the specific feature you modified
5. Test adjacent features that share the same data/state

After modifying shared data files (`js/shared/`):

- Verify all consumers of that data still work (search for the constant/registry name across the codebase)
- Shared data is loaded first, so changes propagate to every system

## Skeld Map Rules (MANDATORY)

When modifying The Skeld map in `js/shared/levelData.js`, these rules are non-negotiable:

### Do NOT

- **Change hallway/corridor positions, widths, or pathing.** Corridors are the map's structural skeleton.
- **Let rooms absorb corridor space.** A room expanding into a corridor changes the entrance point, which breaks map identity and pathing.
- **Move which side of a room the hallway connects from.** Connection points are fixed.
- **Let rooms overlap each other.** Always check all adjacent rooms and corridors before expanding.
- **Silently increase map grid size.** If a room at the map edge needs to expand outward, ask the user first.

### Do

- **Only expand rooms outward into dead space** (wall tiles that are not part of corridors or other rooms).
- **Before any room resize**, list which directions are safe, which are blocked, and why.
- **Check coordinates carefully.** All existing coordinates use virtual space with `XO=4` offset. Actual grid x = virtual x + 4.

### Coordinate System

- Map grid dimensions: **W=135, H=80**
- Virtual-to-actual offset: **XO = 4** (actual grid x = virtual x + 4)
- Minimap labels in `draw.js` use **actual** grid coordinates (virtual + XO)
- Spawn and entity positions in the level return block use `+ XO`

## Common Pitfalls

### Windows Shell

- **Do not use `copy`** in bash. Use `cp` instead. The `copy` command is a Windows CMD builtin and does not work in bash/Git Bash.
- Use forward slashes in paths, not backslashes.

### Large Refactors

- Refactors touching 800+ lines should be done carefully with thorough testing.
- Always verify output after completion: check registry entries, dispatch loops, and that no references were broken.
- Some refactors are not worth doing if code is too interleaved or has too many variations (see the skipped systemization steps in project history).

### `replace_all` on Colors

When doing mass find-and-replace on color values, verify that the replacement did not corrupt the PALETTE definition itself. The PALETTE object in `js/client/ui/panels.js` defines the canonical color values and can be accidentally self-modified.

### Portal Return Coordinates

Portal return coordinates (`RETURN_TX`, `RETURN_TY`) must be checked against the portal entrance zone. If the return point overlaps the portal entrance, the player will be instantly re-teleported, creating an infinite loop.

### Module-Level State in Callbacks

When referencing module-level state objects inside callbacks or helper functions, use the full object path (e.g., `HideSeekState.botMob`) rather than destructured or aliased variables (e.g., `hs.botMob`). The alias may not be in scope when the callback executes.

### Sprite Animations

When adding any new player/character animation (new skill, emote, action):
1. Ask whether a new spritesheet row is needed for body/head/hat templates
2. If yes, add the row to the templates and references, update `assets/manifest.json` frameSize
3. Update `CLAUDE.md` with the new row count

Current body rows: 32 (4 cols x 32 rows = 128x1280)
Current head/hat rows: 5 (4 cols x 5 rows = 128x160 for head, 5 cols x 5 rows = 160x160 for hat)

## Connections to Other Systems

- **Architecture** (`docs/architecture.md`): Script loading order, authority/client split, game loop, key globals
- **Save/Load**: Schema version 7 in `js/core/saveLoad.js`; adding new saved fields requires a migration
- **Progression**: 5 tiers x 25 levels in `PROG_ITEMS`; gun upgrades use `[gunId][tier][level]` recipe structure
- **Debug Commands**: `/gun`, `/tp`, `/heal`, `/mob`, `/freeze`, `/god`, `/nofire`, `/speed` in `js/authority/commands.js`
