# Attack Systems: Geometry, Hazards, Telegraphs, and Loot Drops

**Source files:**
- `js/authority/attackShapes.js` — Geometry hit-testing helpers
- `js/authority/hazardSystem.js` — Persistent damage/effect zones
- `js/authority/telegraphSystem.js` — Ground warning markers before attacks land
- `js/authority/lootDropSystem.js` — Material drops from mob kills

---

## Attack Shapes (`attackShapes.js`)

`AttackShapes` is a singleton object containing pure geometry helpers for hit-testing. These functions return boolean results or entity arrays — they do NOT render anything. Visuals are handled separately by `TelegraphSystem` and `HIT_EFFECT_RENDERERS`.

All functions use world-space pixel coordinates (not tile coordinates).

### Circle AoE

#### `hitsPlayer(cx, cy, radius, entity?)`
Returns `true` if entity (defaults to `player`) is inside a circle.

| Param | Type | Description |
|-------|------|-------------|
| `cx` | number | Circle center X (world px) |
| `cy` | number | Circle center Y (world px) |
| `radius` | number | Circle radius (world px) |
| `entity` | object? | Target entity; defaults to global `player` |

**Math:** Squared distance check: `dx*dx + dy*dy <= radius*radius`. No sqrt needed.

**Usage example (from combatSystem.js):**
```js
// Cyber Bomber: Sticky Bomb detonation — 96px radius circle
if (AttackShapes.hitsPlayer(bomb.x, bomb.y, bomb.radius, player)) { ... }

// Death pulse — 192px radius circle around mob
if (AttackShapes.hitsPlayer(m.x, m.y, 192, player)) { ... }
```

#### `mobsInCircle(cx, cy, radius, excludeId)`
Returns an array of alive mobs inside the circle, excluding mob with `excludeId`.

| Param | Type | Description |
|-------|------|-------------|
| `cx` | number | Circle center X (world px) |
| `cy` | number | Circle center Y (world px) |
| `radius` | number | Circle radius (world px) |
| `excludeId` | any | Mob ID to exclude (the caster) |

**Math:** Same squared distance check, iterates global `mobs` array, skips `hp <= 0` and `id === excludeId`.

---

### Line / Beam

#### `playerInLine(x1, y1, x2, y2, width, entity?)`
Returns `true` if entity (defaults to `player`) is within a rectangular line/beam.

| Param | Type | Description |
|-------|------|-------------|
| `x1, y1` | number | Line start point (world px) |
| `x2, y2` | number | Line end point (world px) |
| `width` | number | Total width of the line (world px) |
| `entity` | object? | Target entity; defaults to global `player` |

#### `mobsInLine(x1, y1, x2, y2, width, excludeId)`
Returns array of alive mobs hit by the line.

| Param | Type | Description |
|-------|------|-------------|
| `x1, y1` | number | Line start point (world px) |
| `x2, y2` | number | Line end point (world px) |
| `width` | number | Total width of the line (world px) |
| `excludeId` | any | Mob ID to exclude |

**Internal: `_pointInLine(px, py, x1, y1, x2, y2, width)`**

Math detail:
1. Compute line vector `dx = x2 - x1, dy = y2 - y1` and its squared length `lenSq`.
2. If `lenSq === 0` (zero-length line), return `false`.
3. Project the test point onto the line segment: `t = ((px - x1) * dx + (py - y1) * dy) / lenSq`, clamped to `[0, 1]`.
4. Find the closest point on the segment: `closestX = x1 + t * dx, closestY = y1 + t * dy`.
5. Distance check from test point to closest point using `halfW = width / 2`: `distX*distX + distY*distY <= halfW*halfW`.

This is a capsule collision (rounded rectangle): the point's perpendicular distance to the segment must be within `width/2`.

**Usage example:**
```js
// Blink Strike: 32px wide line from start to target position
if (AttackShapes.playerInLine(m._blinkStartX, m._blinkStartY, m._blinkTargetX, m._blinkTargetY, 32, player)) { ... }

// Laser: 24px wide beam
if (AttackShapes.playerInLine(m._laserX1, m._laserY1, m._laserX2, m._laserY2, 24, player)) { ... }
```

---

### Cone

#### `playerInCone(cx, cy, direction, halfAngleRad, range, entity?)`
Returns `true` if entity is inside a cone (pie slice).

| Param | Type | Description |
|-------|------|-------------|
| `cx, cy` | number | Cone origin (world px) |
| `direction` | number | Center direction of the cone (radians, 0 = right, PI/2 = down) |
| `halfAngleRad` | number | Half of the cone's angular spread (radians) |
| `range` | number | Maximum reach of the cone (world px) |
| `entity` | object? | Target entity; defaults to global `player` |

#### `mobsInCone(cx, cy, direction, halfAngleRad, range, excludeId)`
Returns array of alive mobs inside the cone.

Same parameters as `playerInCone` except `entity` is replaced by `excludeId`.

**Internal: `_pointInCone(px, py, cx, cy, direction, halfAngleRad, range)`**

Math detail:
1. Compute distance from cone origin to test point: `dist = sqrt(dx*dx + dy*dy)`.
2. If `dist > range` or `dist === 0`, return `false`.
3. Compute angle to point: `angle = atan2(dy, dx)`.
4. Compute angular difference: `diff = angle - direction`, normalized to `[-PI, PI]` by repeated addition/subtraction of `2*PI`.
5. Pass if `abs(diff) <= halfAngleRad`.

**Important:** The parameter is `halfAngleRad` (half the total cone spread in radians). A 90-degree cone uses `halfAngleRad = PI/4`.

**Usage example:**
```js
// Stun Baton: 90-degree cone, 96px range
const dir = Math.atan2(player.y - m.y, player.x - m.x);
const halfAngle = Math.PI / 4; // 90° total / 2
if (AttackShapes.playerInCone(m.x, m.y, dir, halfAngle, 96, player)) { ... }
```

---

### Ring (Donut)

#### `playerInRing(cx, cy, innerRadius, outerRadius, entity?)`
Returns `true` if entity is inside the ring (between inner and outer radius).

| Param | Type | Description |
|-------|------|-------------|
| `cx, cy` | number | Ring center (world px) |
| `innerRadius` | number | Inner radius — safe zone (world px) |
| `outerRadius` | number | Outer radius — hit zone extends from inner to outer (world px) |
| `entity` | object? | Target entity; defaults to global `player` |

**Math:** `d2 >= innerRadius^2 && d2 <= outerRadius^2` (squared distance check, no sqrt).

**Note:** There is no corresponding `mobsInRing()` function in the current codebase — only player-targeted ring checks exist.

---

### Tile Area

#### `tileArea(centerTX, centerTY, radiusTiles)`
Returns an array of `{tx, ty}` tile coordinates within a circular radius of the center tile.

| Param | Type | Description |
|-------|------|-------------|
| `centerTX` | number | Center tile X (tile coords, not pixels) |
| `centerTY` | number | Center tile Y (tile coords, not pixels) |
| `radiusTiles` | number | Radius in tiles |

**Math:** Iterates a square from `-radiusTiles` to `+radiusTiles` on both axes, includes tiles where `dx*dx + dy*dy <= radiusTiles*radiusTiles` (circular, not square).

#### `playerOnTiles(tiles, entity?)`
Returns `true` if entity is standing on one of the given tiles.

| Param | Type | Description |
|-------|------|-------------|
| `tiles` | Array<{tx, ty}> | Tile coordinates to check |
| `entity` | object? | Target entity; defaults to global `player` |

**Math:** Converts entity pixel position to tile: `ptx = floor(entity.x / TILE), pty = floor(entity.y / TILE)`, then checks for exact match.

---

### Direction Helpers

#### `dirToPlayer(mob, entity?)`
Returns the angle (radians) from `mob` to `entity` (defaults to `player`).

**Math:** `atan2(target.y - mob.y, target.x - mob.x)`

#### `distToPlayer(mob, entity?)`
Returns the Euclidean distance from `mob` to `entity` (defaults to `player`).

**Math:** `sqrt(dx*dx + dy*dy)`

#### `endpoint(x, y, direction, length)`
Returns `{x, y}` of a point at the given distance and direction from the origin.

| Param | Type | Description |
|-------|------|-------------|
| `x, y` | number | Origin (world px) |
| `direction` | number | Angle in radians |
| `length` | number | Distance (world px) |

**Math:** `{ x: x + cos(direction) * length, y: y + sin(direction) * length }`

---

## Hazard System (`hazardSystem.js`)

`HazardSystem` is a singleton that manages persistent damage/effect zones (poison clouds, smoke, slow fields, etc.) created by mob abilities.

### State

```js
HazardSystem = {
  active: [],    // unused legacy array (kept for API compat)
  zones: [],     // active damage/effect zones
  _nextId: 1,    // auto-incrementing zone ID
  types: {},     // empty — floor hazard types were removed
}
```

### `createZone({ cx, cy, radius, duration, tickRate, tickDamage, tickEffect, color, slow })`

Creates a persistent zone. Returns the zone's numeric `id`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `cx` | number | required | Zone center X (world px) |
| `cy` | number | required | Zone center Y (world px) |
| `radius` | number | required | Zone radius (world px) |
| `duration` | number | required | Lifetime in frames (60fps). E.g., 300 = 5 seconds |
| `tickRate` | number | 60 | Frames between damage ticks. E.g., 60 = once per second |
| `tickDamage` | number | 0 | Damage dealt per tick. 0 = no damage (utility zone) |
| `tickEffect` | string? | null | Hit effect type string pushed to `hitEffects` on each tick (e.g., `'poison_tick'`) |
| `color` | number[3] | [100, 200, 100] | RGB array for rendering |
| `slow` | number | 0 | Speed multiplier applied to entities inside (0 = no slow, 0.3 = 30% speed) |

#### Internal zone structure (stored in `zones[]`):
```js
{
  id: number,
  cx: number, cy: number, radius: number,
  life: number,       // remaining frames (counts down)
  maxLife: number,     // original duration (for alpha calculation)
  tickRate: number,
  tickCounter: number, // counts up to tickRate, then resets
  tickDamage: number,
  tickEffect: string | null,
  color: [r, g, b],
  slow: number,
}
```

### Zone Lifecycle

**Creation:** `createZone()` pushes a new zone object to `zones[]`.

**Tick (`updateZones()`, called from `update()`):**
1. Decrement `life` by 1 each frame.
2. If `life <= 0`, splice zone from array (destroyed).
3. Get all alive party entities via `PartySystem.getAliveEntities()`.
4. Check if ANY entity is inside the zone (squared distance check).
5. If at least one entity is inside, increment `tickCounter`.
6. When `tickCounter >= tickRate`, reset to 0 and apply damage:
   - For each entity inside: call `dealDamageToPlayer(tickDamage, 'hazard_zone', null, entity)`.
   - If `tickEffect` is set, push a hit effect at the entity's position (`y - 20`).
7. **Important:** `tickCounter` only increments while an entity is inside. If the player leaves and re-enters, ticking pauses.

**Rendering (`drawZones(ctx, camX, camY)`):**
- Alpha fades linearly: `alpha = min(0.25, (life / maxLife) * 0.25)`. Max alpha is 0.25.
- Pulsing radius: `radius * (1 + sin(life * 0.1) * 0.05)` — subtle 5% oscillation.
- Fill: circle with `rgba(r,g,b, alpha)`.
- Edge glow: stroke with `rgba(r,g,b, alpha + 0.1)`, lineWidth 2.

**Clear:** `clear()` empties both `active` and `zones` arrays. Called on scene/floor change via `initForFloor()`.

### Usage Examples from Mob Specials

```js
// Poison cloud: 144px radius, 5s duration, 1 tick/sec, mob-damage per tick, 30% slow
HazardSystem.createZone({
  cx: proj.targetX, cy: proj.targetY,
  radius: 144, duration: 300, tickRate: 60,
  tickDamage: Math.round(m.damage * getMobDamageMultiplier()),
  tickEffect: 'poison_tick',
  color: [100, 200, 50],
  slow: 0.3,
});

// Smoke screen: 192px radius, 4s duration, no damage, visual obstruction only
HazardSystem.createZone({
  cx: m.x, cy: m.y,
  radius: 192, duration: 240, tickRate: 999,
  tickDamage: 0, color: [80, 80, 80], slow: 0,
});

// Bullet time field: 192px radius, 4s duration, no damage, 35% slow on player
HazardSystem.createZone({
  cx: player.x, cy: player.y,
  radius: 192, duration: 240, tickRate: 999,
  tickDamage: 0, color: [100, 100, 200], slow: 0.35,
});
```

---

## Telegraph System (`telegraphSystem.js`)

`TelegraphSystem` is a singleton that manages ground warning markers before attacks land. Used by bosses, mini-bosses, and advanced mobs to telegraph upcoming attacks.

### State

```js
TelegraphSystem = {
  active: [],     // array of active telegraph objects
  _nextId: 1,     // auto-incrementing ID
}
```

### `create({ shape, params, delayFrames, onResolve, color, owner })`

Creates a new telegraph ground marker. Returns the telegraph's numeric `id`.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `shape` | string | required | One of: `'circle'`, `'line'`, `'cone'`, `'ring'`, `'tiles'` |
| `params` | object | required | Shape-specific parameters (see below) |
| `delayFrames` | number | required | Frames until the attack resolves (60fps). E.g., 24 = 0.4s |
| `onResolve` | function? | null | Callback invoked when delay expires. This is where damage/status is applied. |
| `color` | number[3] | [255, 80, 80] | RGB array for the telegraph color |
| `owner` | number | 0 | Mob ID that owns this telegraph (for `clearOwner()`) |

#### Internal telegraph structure:
```js
{
  id: number,
  shape: string,
  params: object,
  delay: number,      // remaining frames (counts down from delayFrames)
  maxDelay: number,   // original delayFrames (for progress calculation)
  onResolve: function | null,
  color: [r, g, b],
  owner: number,
  resolved: boolean,  // set to true when delay reaches 0
  _flashTimer: number // 8-frame flash after resolve, then removed
}
```

### Shape Parameter Structures

#### Circle: `shape: 'circle'`
```js
params: {
  cx: number,     // center X (world px)
  cy: number,     // center Y (world px)
  radius: number  // radius (world px)
}
```

#### Line: `shape: 'line'`
```js
params: {
  x1: number,     // start X (world px)
  y1: number,     // start Y (world px)
  x2: number,     // end X (world px)
  y2: number,     // end Y (world px)
  width: number   // total width (world px), defaults to 20 in renderer
}
```

#### Cone: `shape: 'cone'`
```js
params: {
  cx: number,       // cone origin X (world px)
  cy: number,       // cone origin Y (world px)
  direction: number, // center direction in radians (0 = right, default 0)
  angleDeg: number,  // TOTAL cone angle in degrees (default 45)
  range: number      // cone reach in pixels (default 96)
}
```
**Important:** `angleDeg` is the TOTAL spread, not half. The renderer converts: `halfAngle = angleDeg * PI / 360` (equivalent to `(angleDeg / 2) * PI / 180`).

#### Ring: `shape: 'ring'`
```js
params: {
  cx: number,          // center X (world px)
  cy: number,          // center Y (world px)
  innerRadius: number, // inner radius (default 40)
  outerRadius: number  // outer radius (default 100)
}
```

#### Tiles: `shape: 'tiles'`
```js
params: {
  tiles: Array<{tx: number, ty: number}> // tile coordinates
}
```
Each tile renders as a `TILE x TILE` (48x48) rectangle at `(tx * TILE, ty * TILE)`.

### Telegraph Lifecycle

**Creation:** `create()` pushes a telegraph to `active[]`.

**Tick (`update()`, called from authority tick):**
1. Decrement `delay` by 1 each frame.
2. When `delay <= 0` and `!resolved`:
   - Set `resolved = true`.
   - Call `onResolve()` callback (wrapped in try/catch, failures silently ignored).
   - Set `_flashTimer = 8` (flash frames).
3. While `resolved`, decrement `_flashTimer` each frame.
4. When `_flashTimer <= 0`, splice telegraph from array (removed).

**Total visual lifetime:** `delayFrames` (warning phase) + 8 (flash phase).

### Visual Rendering

All shapes use a `progress` value: `1 - (delay / maxDelay)`, going from 0 to 1 as the telegraph fills.

#### Circle rendering:
- **Fill:** Circle at center with radius `radius * progress` (grows outward). Alpha: `0.15 + sin(progress * PI * 4) * 0.05` (pulsing).
- **Outline:** Full-radius circle stroke. Alpha: `0.3 + progress * 0.4` (brightens as it fills).

#### Line rendering:
- **Fill:** Rectangle from start to `start + (end - start) * progress` with perpendicular width. Alpha: `0.15 + progress * 0.15`.
- The rectangle is constructed using perpendicular vectors: `perpX = cos(angle + PI/2) * width/2`, `perpY = sin(angle + PI/2) * width/2`.
- **Outline:** Full-length rectangle stroke. Alpha: `0.3 + progress * 0.3`.

#### Cone rendering:
- **Fill:** Arc from origin with radius `range * progress`. Alpha: `0.12 + progress * 0.15`.
- **Outline:** Arc at full range. Alpha: `0.3 + progress * 0.3`.

#### Ring rendering:
- **Fill:** Donut shape (outer circle with inner counter-clockwise cutout). Alpha: `0.12 + progress * 0.15`.
- **Outlines:** Both inner and outer radius stroked. Alpha: `0.3 + progress * 0.3`.

#### Tiles rendering:
- **Fill:** Each tile as a `TILE x TILE` rect. Alpha: `0.1 + progress * 0.25 + sin(progress * PI * 3) * 0.08` (pulsing).
- **Border:** Each tile stroked. Alpha: `0.4 + progress * 0.3`.

#### Resolved flash (circle, line, cone, tiles only — ring is not flashed):
- White (`#ffffff`) fill of the full shape area.
- Alpha: `(flashTimer / 8) * 0.6`, fading from 0.6 to 0 over 8 frames.

### Additional Methods

#### `clear()`
Removes all active telegraphs. Called on wave clear, floor change, scene change.

#### `clearOwner(ownerId)`
Removes all telegraphs belonging to a specific mob (by `owner` field). Iterates in reverse and splices matches.

### Usage Examples from Mob Specials

```js
// Blink Strike: line telegraph, 24-frame (0.4s) delay, cyan color
TelegraphSystem.create({
  shape: 'line',
  params: { x1: m.x, y1: m.y, x2: m._blinkTargetX, y2: m._blinkTargetY, width: 32 },
  delayFrames: 24,
  color: [0, 200, 255],
  owner: m.id,
});

// Stun Baton: cone telegraph, 18-frame (0.3s) delay, yellow color
TelegraphSystem.create({
  shape: 'cone',
  params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 96 },
  delayFrames: 18,
  color: [255, 200, 50],
  owner: m.id,
});

// Phase Dash: line telegraph, 8-frame (0.13s) delay, blue color — very fast!
TelegraphSystem.create({
  shape: 'line',
  params: { x1: m.x, y1: m.y, x2: m._phaseDashTargetX, y2: m._phaseDashTargetY, width: 32 },
  delayFrames: 8,
  color: [100, 100, 255],
  owner: m.id,
});
```

**Common pattern:** Mob specials create a telegraph, store the delay in a mob field (e.g., `m._stunTelegraph = 18`), count it down manually, then resolve damage using `AttackShapes` when the timer hits 0. The `onResolve` callback is optional — many specials handle resolution inline instead.

---

## Loot Drop System (`lootDropSystem.js`)

Ground-based material drops from mob kills. Mirrors the pattern used by `_orePickups` in the mining system.

### State

```js
let _groundDrops = [];        // array of active ground drops
let _groundDropCounter = 0;   // auto-incrementing ID counter
```

### `spawnGroundDrop(materialId, count, x, y, ownerId?)`

Creates a ground drop at the given position.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `materialId` | string | required | Key into `CRAFT_MATERIALS` registry |
| `count` | number | required | Number of materials in this drop |
| `x` | number | required | World X position (pixels) |
| `y` | number | required | World Y position (pixels) |
| `ownerId` | string? | `'player'` | Entity ID that owns this drop for pickup priority |

#### Ground drop structure:
```js
{
  id: string,            // 'drop_0', 'drop_1', etc.
  materialId: string,    // key into CRAFT_MATERIALS
  count: number,         // quantity
  x: number,             // world position X
  y: number,             // world position Y
  life: 1800,            // 30 seconds at 60fps (counts down)
  bobOffset: number,     // random [0, 2*PI) for desynchronized bob animation
  ownerId: string,       // 'player' or bot member ID
  ownerLeft: boolean,    // true if the owning bot left the party
}
```

### Event Subscription: `mob_killed`

Listens to `Events.on('mob_killed', ...)` with payload `{ mob, source, killerId, killerMember }`.

**Drop resolution flow:**
1. Skip if `source === 'witch_skeleton'` (summoned kills don't drop loot).
2. Skip if `mob.type === 'skeleton'` or `mob.type === 'mini_golem'` (summoned mobs don't drop).
3. Skip if not in a dungeon (`!Scene.inDungeon`).
4. Get `dungeonId` from `GameState.currentDungeon` (default `'cave'`).
5. Get `floor` from `dungeonFloor` (default `1`).
6. Call `getMobDrop(mob.type, dungeonId, floor)` to resolve drop (defined in `craftingData.js`).
7. If drop is non-null, call `spawnGroundDrop(drop.materialId, drop.count, mob.x, mob.y, killerId || 'player')`.

### `getMobDrop(mobType, dungeonId, floor)` (in `craftingData.js`)

Returns `{ materialId, count }` or `null`.

1. Look up `DROP_TABLES[mobType]`. Get `dropChance` (or `DEFAULT_DROP_CHANCE` if no table).
2. Roll `Math.random()` against `dropChance`. If fail, return `null`.
3. If mob has a specific loot table (`table.items`):
   - Weighted random selection from items array.
   - Each item: `{ materialId, weight, countMin, countMax }`.
   - Count: `countMin + floor(random() * (countMax - countMin + 1))`.
4. If no specific table, fall back to `DUNGEON_DROP_POOL[dungeonId][floor]` — a flat array of materialIds. Picks one at random with count = 1.

### Update (`updateGroundDrops()`)

Called each frame from the authority tick.

1. If not in dungeon, clear all drops and return.
2. For each drop (iterated in reverse for safe splicing):
   - Decrement `life`. Remove if `life <= 0` (despawned).
   - **Pickup check:** Distance from `player` to drop: `sqrt(dx^2 + dy^2)` where `dy = (player.y - 20) - d.y` (player's visual center is 20px above foot position). Pickup radius: **40px**.
   - **Ownership check:** Player can only pick up drops where `ownerId === 'player'` OR `ownerLeft === true`.
   - On pickup: create a material item via `createMaterialItem(materialId, count)`, attempt `addToInventory(item)`. If inventory is full, the drop stays on the ground.
   - On successful pickup: push a `'heal'`-type hit effect showing `"+count materialName"` at the drop position.
   - **Bot ownership tracking:** If `ownerId` is not `'player'` and the owning bot is no longer active in `PartyState.members`, set `ownerLeft = true` (anyone can now grab it).

### Rendering (`drawGroundDrops()`)

Called from `draw.js` in world space (uses global `ctx`, coordinates are pre-camera-offset).

Only renders if `Scene.inDungeon` and drops exist. Uses `Date.now() / 1000` for time-based animation.

**For each drop:**

1. Look up `CRAFT_MATERIALS[d.materialId]` for `color` and `tier`.
2. **Bob animation:** `bob = sin(t * 3 + bobOffset) * 4` — 4px vertical oscillation at 3 rad/s, offset per drop.
3. **Fade:** If `life < 120` (last 2 seconds), `fadeAlpha = life / 120`. Otherwise `fadeAlpha = 1`.
4. **Tier glow:** Circle with radius `12 + tier * 3`, alpha `0.15 + tier * 0.05`, using `mat.color`.
5. **Main circle:** Solid 8px radius circle in `mat.color`.
6. **Inner highlight:** White 3px radius circle offset (-2, -2) at 40% alpha.
7. **Sparkle (tier >= 2):** Pulsing white 1.5px dots. One sparkle at tier 2, two at tier 3+.
8. **Count badge (count > 1):** Bold 9px monospace text `"x2"`, `"x3"`, etc., centered 12px above the drop.

### `clearGroundDrops()`

Empties the `_groundDrops` array. Called on scene change.

---

## System Integration Summary

### Typical mob special flow:
1. **Telegraph created** — `TelegraphSystem.create()` with shape, delay, and color.
2. **Delay countdown** — mob tracks its own timer (e.g., `m._stunTelegraph--`).
3. **Attack resolves** — `AttackShapes` geometry check determines if player is hit.
4. **Damage dealt** — `dealDamageToPlayer()` called on hit.
5. **Optional hazard** — `HazardSystem.createZone()` for lingering effects (poison, slow).
6. **On mob death** — `mob_killed` event fires, `lootDropSystem` spawns material drops.

### Update order (per frame):
- `authorityTick()` calls `TelegraphSystem.update()` and `HazardSystem.update()` and `updateGroundDrops()`.
- `draw()` calls `TelegraphSystem.draw()`, `HazardSystem.draw()`, and `drawGroundDrops()` in world space.

### Clear triggers:
- Scene/floor change: all three systems are cleared (`TelegraphSystem.clear()`, `HazardSystem.clear()`, `clearGroundDrops()`).
- Mob death: `TelegraphSystem.clearOwner(mob.id)` removes that mob's pending telegraphs.
