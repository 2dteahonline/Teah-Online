# Movement & Collision

## Source of truth

- `js/shared/gameConfig.js` — physics constants (player/mob speed, hitbox sizes, knockback)
- `js/shared/levelData.js` — `TILE` constant (defines world grid pixel size)
- `js/client/input/inputIntent.js` — `InputIntent` flag schema (held + one-frame intents)
- `js/client/input/input.js` — DOM input handlers, mouse → world coordinate translation
- `js/authority/authorityTick.js` — command queue → InputIntent → `update()` driver
- `js/client/ui/inventory.js` — `update()` (player movement + AABB wall collision + knockback) and `updateCamera()` (camera follow with map clamp)
- `js/authority/mobSystem.js` — global `positionClear(px, py, hw)` AABB wall test
- `js/core/sceneManager.js` — `isSolid(col, row)` collision-grid + solid-entity test, `MAP_W`/`MAP_H` derivation
- `js/authority/gameState.js` — canonical `player` entity (x, y, vx, vy, knockVx, knockVy, speed, baseSpeed, dir, frame, moving)
- `js/authority/stateReset.js` — clears velocity / knockback / freeze on scene transitions
- `js/core/tileRenderer.js` — referenced for collision-grid READ side only (rendering only — see Dependencies)
- `js/client/ui/settings.js` — default WASD keybinds
- `index.html` — `BASE_W`, `BASE_H`, `WORLD_ZOOM`, `VIEW_W`, `VIEW_H` constants in inline `<script>`

## Purpose

Defines how player input becomes movement, how movement is bounded by tile walls, how knockback decays against the same wall grid, and how the camera follows the player while clamped to the level bounds. The pipeline is intent-based (`Input → InputIntent → CommandQueue → authorityTick → update`) so the same code path drives local play, bots, and (future) networked clients.

## Values

### Core grid / viewport

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| TILE | 48 | px | js/shared/levelData.js:5 |
| BASE_W | 1920 | px | index.html:22 |
| BASE_H | 1080 | px | index.html:22 |
| WORLD_ZOOM | 0.85 | scalar | index.html:23 |
| VIEW_W | BASE_W / WORLD_ZOOM (≈2259) | px | index.html:24 |
| VIEW_H | BASE_H / WORLD_ZOOM (≈1271) | px | index.html:25 |
| MAP_W | level.widthTiles * TILE | px | js/core/sceneManager.js:24 |
| MAP_H | level.heightTiles * TILE | px | js/core/sceneManager.js:25 |

### Player physics

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| PLAYER_BASE_SPEED | 7.5 | px/frame (≈450 px/sec at 60 FPS, per comment) | js/shared/gameConfig.js:8 |
| PLAYER_WALL_HW | 14 | px (AABB half-width vs walls) | js/shared/gameConfig.js:9 |
| PLAYER_RADIUS | 23 | px (body-blocking circle) | js/shared/gameConfig.js:10 |
| player.speed (init) | GAME_CONFIG.PLAYER_BASE_SPEED | px/frame | js/authority/gameState.js:18 |
| player.baseSpeed (init) | GAME_CONFIG.PLAYER_BASE_SPEED | px/frame | js/authority/gameState.js:18 |
| player spawn x (default) | 28 * TILE + TILE/2 | world px | js/authority/gameState.js:15 |
| player spawn y (default) | 30 * TILE + TILE/2 | world px | js/authority/gameState.js:15 |

### Mob physics (movement-related; full mob doc lives elsewhere)

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| MOB_WALL_HW | 11 | px (AABB half-width vs walls) | js/shared/gameConfig.js:13 |
| MOB_RADIUS | 23 | px (body-blocking circle) | js/shared/gameConfig.js:14 |
| POS_HW | 10 | px (default `positionClear` half-width — used for spawn checks) | js/shared/gameConfig.js:15 |
| MOB_CROWD_RADIUS | 46 | px | js/shared/gameConfig.js:16 |

### Knockback

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| KNOCKBACK_DECAY | 0.8 | velocity multiplier per frame | js/shared/gameConfig.js:31 |
| KNOCKBACK_THRESHOLD | 0.6 | min |v| before clearing to 0 | js/shared/gameConfig.js:32 |

### Default keybinds

| Action | Default key | Citation |
|--------|-------------|----------|
| moveUp | `w` | js/client/ui/settings.js:14 |
| moveDown | `s` | js/client/ui/settings.js:14 |
| moveLeft | `a` | js/client/ui/settings.js:14 |
| moveRight | `d` | js/client/ui/settings.js:14 |

### Misc movement-pipeline values

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| Corner-nudge step | 2 | px (each cardinal nudge attempt) | js/client/ui/inventory.js:3085 |
| Respawn x (party respawn) | 20 * TILE + TILE/2 | world px | js/client/ui/inventory.js:2695 |
| Respawn y (party respawn) | 20 * TILE + TILE/2 | world px | js/client/ui/inventory.js:2696 |

## Behavior

### 1. Input → InputIntent

1. DOM `mousemove` writes screen-space `mouse.x/y` and computes world-space mouse using camera + zoom (js/client/input/input.js:21–24):
   - `InputIntent.mouseWorldX = mouse.x / WORLD_ZOOM + camera.x`
   - `InputIntent.mouseWorldY = mouse.y / WORLD_ZOOM + camera.y`
2. `InputIntent` is the only contract between client and authority. Held flags persist; `*Pressed` flags last one frame and are cleared by `clearOneFrameIntents()` (js/client/input/inputIntent.js:70–86).
3. Movement-relevant intents (js/client/input/inputIntent.js:18–19):
   - `InputIntent.moveX` ∈ {-1, 0, 1}
   - `InputIntent.moveY` ∈ {-1, 0, 1}

### 2. authorityTick (per frame)

1. If `DEBUG_pauseAuthority` is true, command queue is discarded and tick returns null (js/authority/authorityTick.js:23–26).
2. Copy + clear `CommandQueue` (js/authority/authorityTick.js:29–30).
3. Reset continuous `shootHeld` flag, then walk commands; `move` commands write `InputIntent.moveX/moveY` directly (js/authority/authorityTick.js:36–44).
4. Multiple authority "freeze" gates can zero out movement intents this frame:
   - Mafia frozen state (js/authority/authorityTick.js:112–122)
   - Mafia lobby panel (js/authority/authorityTick.js:125–129)
   - Hide & Seek frozen state (js/authority/authorityTick.js:132–142)
   - Spar frozen state (js/authority/authorityTick.js:145–156)
5. Spar training override replaces `moveX/moveY` with scripted archetype values (js/authority/authorityTick.js:189–190).
6. Sets `_authorityDriven = true`, calls `update()`, then unsets it (js/authority/authorityTick.js:219–221). The flag tells `update()` to skip its own keysDown→intent translation.

### 3. update() — movement step (js/client/ui/inventory.js:2640+)

1. Compute movement gating: `isTyping` (chat/name edit), `panelBlocksMovement` (any UI open except toolbox), `fishingActive`, `ventBlocks` (js/client/ui/inventory.js:2643–2645, 2784–2785).
2. If NOT `_authorityDriven`, translate raw `keysDown` via `keybinds` to `InputIntent.moveX/moveY` (js/client/ui/inventory.js:2793–2806). Otherwise, the previously-set intents are reused.
3. Compute `speedMult` starting at 1.0 (js/client/ui/inventory.js:2745):
   - Freeze recovery: `1 - getFreezePenalty()` while `freezeTimer > 0` (js/client/ui/inventory.js:2746–2749)
   - StatusFX rooted → `0`; else multiply by `fxResult.speedMult` for slows (js/client/ui/inventory.js:2752–2759)
   - Hazard zones with `slow > 0` multiply `(1 - z.slow)` while inside `radius` (js/client/ui/inventory.js:2762–2771)
   - Hide & Seek frozen → `0` (js/client/ui/inventory.js:2774–2776)
4. Apply movement-mutating status effects to direction vector (`mx, my`):
   - Fear: replace with `_fearDirX/Y` (js/client/ui/inventory.js:2998–3001)
   - Confuse: rotate 180° + swap axes — `mx = -my; my = -tmp` (js/client/ui/inventory.js:3003–3005)
   - Disorient: random rotation by `(Math.random() - 0.5) * 0.6` rad (js/client/ui/inventory.js:3007–3013)
5. Normalize `(mx, my)` to unit length when nonzero (js/client/ui/inventory.js:3015–3016).
6. Compute effective speed: `((player.baseSpeed || player.speed) + getBootsSpeedBonus()) * speedMult` (js/client/ui/inventory.js:3018).
7. Set velocity instantly — no acceleration: `player.vx = mx * effectiveSpeed; player.vy = my * effectiveSpeed` (js/client/ui/inventory.js:3022–3023). Comment: "INSTANT movement — no acceleration, no smoothing. Press = move at full speed. Release = stop immediately. Graal-style." (js/client/ui/inventory.js:3020–3021).
8. `player.moving = dx !== 0 || dy !== 0` (uses raw intents, not the speed-multiplied vector) (js/client/ui/inventory.js:3025).

### 4. Wall collision — axis-separated AABB sliding (js/client/ui/inventory.js:3027–3053)

Half-width is `hw = GAME_CONFIG.PLAYER_WALL_HW` = 14 (js/client/ui/inventory.js:3031).

1. Compute candidate `nx = player.x + player.vx`, `ny = player.y + player.vy`.
2. Test X-axis move with current Y:
   ```
   cL = floor((nx - hw) / TILE)
   cR = floor((nx + hw) / TILE)
   rT = floor((player.y - hw) / TILE)
   rB = floor((player.y + hw) / TILE)
   if any of (cL,rT) (cR,rT) (cL,rB) (cR,rB) is solid → canMoveX = false
   ```
3. If `canMoveX`, commit `player.x = nx`.
4. Test Y-axis move with new X (post-X commit). Same 4-corner test using `(player.x ± hw, ny ± hw)`.
5. If `canMoveY`, commit `player.y = ny`.

This produces classic axis-separated wall sliding: blocked on one axis still allows the other.

### 5. Knockback integration (js/client/ui/inventory.js:3055–3077)

Active only when `player.knockVx !== 0 || player.knockVy !== 0`.

1. Compute `knx = player.x + player.knockVx`, `kny = player.y + player.knockVy`.
2. Same 4-corner AABB test on X-axis using `hw2 = GAME_CONFIG.PLAYER_WALL_HW`. If clear, commit `player.x = knx`; else zero `player.knockVx` (js/client/ui/inventory.js:3061–3065).
3. Repeat for Y-axis (js/client/ui/inventory.js:3067–3071).
4. Decay both components by `GAME_CONFIG.KNOCKBACK_DECAY` (0.8) (js/client/ui/inventory.js:3073–3074).
5. Snap to 0 when `|knockVx| < KNOCKBACK_THRESHOLD` (0.6) (js/client/ui/inventory.js:3075–3076).

### 6. Corner nudge (js/client/ui/inventory.js:3083–3095)

When BOTH `canMoveX` and `canMoveY` are false AND velocity is nonzero, attempt 4 cardinal nudges of 2 px each: `[+2,0]`, `[-2,0]`, `[0,+2]`, `[0,-2]`. First nudge whose destination passes the 4-corner AABB test commits and breaks. This unsticks the player from corner geometry.

### 7. positionClear (shared utility) — js/authority/mobSystem.js:7–12

```
function positionClear(px, py, hw) {
  hw = hw ?? GAME_CONFIG.POS_HW;        // default 10
  const cL = floor((px - hw) / TILE), cR = floor((px + hw) / TILE);
  const rT = floor((py - hw) / TILE), rB = floor((py + hw) / TILE);
  return !isSolid(cL,rT) && !isSolid(cR,rT) && !isSolid(cL,rB) && !isSolid(cR,rB);
}
```

Signature: `(centerX_px, centerY_px, halfWidth_px?)`. Returns true when all 4 AABB corners of the centered square are non-solid. Used by mob spawning, mob AI, body-blocking and other systems. The player movement code does NOT call this helper — it inlines the same 4-corner test (see Edge cases).

### 8. isSolid (js/core/sceneManager.js:574–587)

```
function isSolid(col, row) {
  if (!level || !collisionGrid) return true;
  if (col<0 || row<0 || col >= level.widthTiles || row >= level.heightTiles) return true;
  const gridRow = collisionGrid[row];
  if (!gridRow) return true;
  if (gridRow[col] === 1) return true;
  for (const e of levelEntities) {
    if (!e.solid) continue;
    const w = e.w ?? 1, h = e.h ?? 1;
    if (col >= e.tx && col < e.tx + w && row >= e.ty && row < e.ty + h) return true;
  }
  return false;
}
```

Two solidity sources: `collisionGrid[row][col] === 1` (tile walls) and any `levelEntities` whose `solid` flag covers the (col,row) cell. Out-of-bounds and missing-grid both return solid (acts as a closed border).

### 9. Camera follow — js/client/ui/inventory.js:2609–2628

1. `camera = { x: 0, y: 0 }` is a module-level singleton (js/client/ui/inventory.js:2609).
2. Default target is `player`; if party has > 1 member and `playerDead`, target is `PartySystem.getSpectateTarget()` (js/client/ui/inventory.js:2611–2616).
3. X axis:
   - If `MAP_W <= VIEW_W`: `camera.x = (MAP_W - VIEW_W) / 2` (centers a small map; can go negative) (js/client/ui/inventory.js:2618–2619)
   - Else: `camera.x = clamp(camTarget.x - VIEW_W/2, 0, MAP_W - VIEW_W)` (js/client/ui/inventory.js:2621)
4. Y axis: identical pattern with `MAP_H` / `VIEW_H` (js/client/ui/inventory.js:2623–2627).
5. There is no deadzone, no smoothing, no lerp — camera is hard-locked to the target position each frame (no easing constants exist).

### 10. State reset on scene change

`resetCombatState(mode)` (js/authority/stateReset.js:9+) clears mob/bullet/effect arrays and resets `freezeTimer` and `contactCooldown` (js/authority/stateReset.js:27–28), but does NOT itself zero `player.vx/vy/knockVx/knockVy`. Those are zeroed at scene transitions in `sceneManager.js`:

| Reset | Citation |
|-------|----------|
| `player.vx = 0; player.vy = 0;` (transition cleanup) | js/core/sceneManager.js:299 |
| `_pm.entity.knockVx = 0; _pm.entity.knockVy = 0;` (party members) | js/core/sceneManager.js:306 |
| `player.vx = 0; player.vy = 0;` (enterLevel) | js/core/sceneManager.js:495 |
| Queue lock zeroes vx/vy and sets moving=false | js/core/sceneManager.js:566–568 |

## Dependencies

- **Reads**:
  - `GAME_CONFIG.PLAYER_BASE_SPEED`, `PLAYER_WALL_HW`, `PLAYER_RADIUS`, `MOB_WALL_HW`, `MOB_RADIUS`, `POS_HW`, `KNOCKBACK_DECAY`, `KNOCKBACK_THRESHOLD` (js/shared/gameConfig.js)
  - `TILE` (js/shared/levelData.js:5)
  - `BASE_W`, `BASE_H`, `WORLD_ZOOM`, `VIEW_W`, `VIEW_H` (index.html:22–25)
  - `MAP_W`, `MAP_H`, `level.widthTiles`, `level.heightTiles`, `collisionGrid`, `levelEntities` (js/core/sceneManager.js)
  - `keysDown`, `keybinds` (js/client/ui/settings.js)
  - `getBootsSpeedBonus()` — boots speed equipment bonus (covered in equipment doc)
  - `StatusFX.tickPlayer()`, `StatusFX.playerEffects._fear/_confuse/_disorient/_mobilityLocked` (status effect doc)
  - `HazardSystem.zones` (hazard doc)
  - `getFreezePenalty()` (gun/freeze doc)
  - `PartyState.members`, `PartySystem.getSpectateTarget()` (party doc)
- **Writes**:
  - `player.x`, `player.y`, `player.vx`, `player.vy`, `player.knockVx`, `player.knockVy`, `player.moving` (js/authority/gameState.js)
  - `InputIntent.moveX`, `InputIntent.moveY`, `InputIntent.mouseWorldX/Y` (js/client/input/inputIntent.js)
  - `camera.x`, `camera.y` (js/client/ui/inventory.js:2609)
- **Rendering-only neighbors (NOT documented here)**:
  - `js/core/tileRenderer.js` — `drawLevelBackground(camX, camY)` reads `collisionGrid` only to PAINT walls/floors. The collision grid itself is owned by `sceneManager.js`. Tile rendering belongs in the rendering doc.
  - `js/core/cameraSystem.js` — despite the filename, this is the **Among Us security-camera UI overlay**, not the gameplay follow camera. It defines `CameraState`, `SKELD_CAMERAS`, and `CameraSystem.drawOverlay()`. The gameplay follow camera lives in `js/client/ui/inventory.js`. Documented under the Skeld / mafia UI cluster.

## Edge cases

- **`positionClear` is NOT used by player movement.** The player's wall test (js/client/ui/inventory.js:3036–3050) inlines the same 4-corner formula instead of calling `positionClear(nx, player.y, PLAYER_WALL_HW)`. Mob movement, spawning, and knockback go through `positionClear`. Any Unity port must reproduce both the inline player path and the shared helper path.
- **Default `positionClear` half-width is `POS_HW` (10), not `MOB_WALL_HW` (11) or `PLAYER_WALL_HW` (14).** Callers must pass the correct `hw` for movement vs spawn checks (js/authority/mobSystem.js:8 comment, js/shared/gameConfig.js:13–15).
- **Out-of-bounds tiles count as solid.** `isSolid` returns true for negative or beyond-grid coords and for missing rows (js/core/sceneManager.js:576–578). The level border is implicit, not just the `@` tiles.
- **`levelEntities` with `solid: true` extend collision.** `isSolid` walks `levelEntities` per call; large entity lists make collision O(N) per check (js/core/sceneManager.js:580–585). 4 corner checks × 2 axes × per-frame movement + knockback = up to 16 entity scans per player per frame.
- **X-then-Y commit ordering biases corner sliding.** The Y test uses the post-X-commit `player.x` (js/client/ui/inventory.js:3047), so on tight diagonals the player slides further along X than Y. Reversing the order would change feel.
- **Knockback collision uses `PLAYER_WALL_HW` (14), not `PLAYER_RADIUS` (23).** Same hitbox as walking. A stopped knockback axis is hard-zeroed (not bounced).
- **Decimal `moveX/moveY`.** Spar training/disorient/confuse/fear can write non-±1 values into `mx, my`. Normalization at js/client/ui/inventory.js:3015–3016 handles arbitrary magnitudes.
- **`player.moving` uses RAW `dx, dy` (intent), not the post-status-effect vector.** A confused or feared player still reports `moving = true` based on key input, even if the actual translation differs (js/client/ui/inventory.js:3025).
- **`player.speed` vs `player.baseSpeed`.** Effective speed reads `player.baseSpeed || player.speed` (js/client/ui/inventory.js:3018). `gameState.js:18` initializes both to `PLAYER_BASE_SPEED`. Code that mutates one without the other will desync.
- **`MAP_W <= VIEW_W` produces a NEGATIVE `camera.x`.** For maps smaller than the viewport (e.g. spar arenas) the camera is centered at `(MAP - VIEW) / 2` which is negative, so world (0,0) renders inside the visible canvas, not at its edge (js/client/ui/inventory.js:2618–2619).
- **No camera deadzone, no easing.** Each frame snaps directly. Any "smooth follow" would be an addition, not parity.
- **Authority can drive movement without raw keys.** When `_authorityDriven` is set by `authorityTick()`, `update()` SKIPS the keysDown→intent translation (js/client/ui/inventory.js:2793). This is how bots, network commands, and spar-training archetypes inject movement.
- **`clearOneFrameIntents` is called from `update()`'s end** (per comment at js/authority/authorityTick.js:228), not from `authorityTick`. Moving the call site would double-clear or double-fire intents.
- **`enterLevel` zeroes velocity but NOT knockback for the local player** (js/core/sceneManager.js:495 only sets `player.vx = 0; player.vy = 0`). Party members get knockback cleared at js/core/sceneManager.js:306. Any leftover `player.knockVx/Vy` from before a scene swap would carry into the new scene's first frame.
- **The `cameraSystem.js` filename is misleading.** It is the Skeld security-camera UI, not the player-follow camera. Look in `inventory.js` for the gameplay camera.
