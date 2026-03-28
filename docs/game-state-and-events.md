# Game State & Events

Reference for the four core runtime systems: GameState, Event Bus, Authority Tick Pipeline, and Snapshots. All field names and values are taken directly from the JS source.

---

## GameState (`js/authority/gameState.js`)

`GameState` is the single source of truth for all mutable runtime state. It is assigned to `window.GameState` and all its top-level keys are aliased onto `window` via `Object.defineProperty`.

### Full Structure

```js
window.GameState = {
  // ---- Player ----
  player: {
    x: 28 * TILE + TILE/2,   // world position (pixels)
    y: 30 * TILE + TILE/2,
    vx: 0, vy: 0,             // velocity
    knockVx: 0, knockVy: 0,   // knockback velocity (decays separately)
    speed: GAME_CONFIG.PLAYER_BASE_SPEED,
    baseSpeed: GAME_CONFIG.PLAYER_BASE_SPEED,
    dir: 0,                    // facing direction (0=down, 1=up, 2=left, 3=right)
    frame: 0,                  // current animation frame
    animTimer: 0,              // ticks since last frame advance
    moving: false,             // true if velocity is non-zero

    // Cosmetic colors (hex strings)
    skin: "#d4bba8", hair: "#0c0c10", shirt: "#0a0a0c", pants: "#0a0a0c",
    eyes: "#4488aa", facialHair: "#0c0c10", shoes: "#3a2a1a", hat: "#2a2a3a",
    glasses: "#1a1a1a", gloves: "#5a4a3a", belt: "#4a3a2a", cape: "#2a1a3a",
    tattoo: "#1a3a2a", scars: "#c8a090", earring: "#c8a040", necklace: "#c0c0c0",
    backpack: "#6a5a3a", warpaint: "#3a1a1a",

    headId: 'default',         // spritesheet head variant
    name: "Alex",
    hp: 50, maxHp: 50,
  },

  // ---- Input ----
  keysDown: {},                // { [keyCode: string]: boolean } — raw key state

  // ---- Wave / Combat ----
  wave: 0,                     // current wave number (1-indexed during combat)
  mobs: [],                    // Array<MobObject>
  waveState: "waiting",        // "waiting" | "active" | "cleared" | "revive_shop" | "idle"
  kills: 0,                    // total kills this run
  dungeonFloor: 1,             // current dungeon floor (1-indexed)
  currentDungeon: 'cave',      // 'cave' | 'azurine' | 'vortalis' | 'earth205' | etc.
  dungeonReturnLevel: 'cave_01', // level to return to after dungeon completion
  gold: 0,
  medpacks: [],                // Array<{ x, y, bobFrame }>

  // ---- Mining ----
  oreNodes: [],                // Array<OreNodeObject>

  // ---- Gun ----
  gun: {
    ammo: 30,
    magSize: 30,
    reloading: false,
    reloadTimer: 0,            // ticks remaining in reload
    fireCooldown: 0,           // ticks until next shot allowed
    damage: 20,
    recoilTimer: 0,            // visual recoil countdown
    special: null,             // string key or null (e.g. "piercing", "explosive")
  },
  bullets: [],                 // Array<BulletObject>
  hitEffects: [],              // cosmetic only — NOT serialized
  deathEffects: [],            // cosmetic only — NOT serialized
  mobParticles: [],            // cosmetic only — NOT serialized

  // ---- Melee ----
  melee: {
    damage: 15,
    range: 90,                 // pixels
    arcAngle: Math.PI * 0.8,   // radians (144 degrees)
    cooldown: 0,               // ticks until next swing
    cooldownMax: 28,
    swinging: false,
    swingTimer: 0,
    swingDuration: 12,         // ticks per swing animation
    swingDir: 0,               // direction of current swing
    knockback: 5.04,           // knockback force applied to target
    critChance: 0.20,          // 20% crit chance
    special: null,             // string key or null
    // Dash sub-state
    dashing: false,
    dashTimer: 0,
    dashDuration: 14,          // ticks per dash
    dashSpeed: 21.85,          // pixels/tick during dash
    dashDirX: 0, dashDirY: 0,
    dashStartX: 0, dashStartY: 0,
    dashTrail: [],             // Array<{ x, y, life }>
    dashesLeft: 0,             // remaining chain dashes
    dashChainWindow: 0,        // ticks remaining to chain next dash
    dashCooldown: 0,
    dashCooldownMax: 240,      // ticks (4 seconds at 60fps)
    dashActive: false,
    dashGap: 0,
  },

  // ---- Inventory ----
  inventory: [],               // Array<ItemObject|null> — fixed-size slot array
  potion: {
    count: 3,
    healAmount: 25,
    cooldown: 0,
    cooldownMax: 120,          // ticks (2 seconds at 60fps)
  },

  // ---- Equipment ----
  playerEquip: {
    armor: null,               // string key or null
    gun: null,                 // { id, tier, level, ... } or null
    melee: null,               // { id, tier, level, ... } or null
    boots: null,
    pants: null,
    chest: null,
    helmet: null,
  },
};
```

### Property Aliases via Object.defineProperty

Every top-level key of `GameState` is aliased onto `window` so legacy code works unchanged:

```js
(function() {
  const keys = Object.keys(GameState);
  for (const key of keys) {
    Object.defineProperty(window, key, {
      get() { return GameState[key]; },
      set(v) { GameState[key] = v; },
      configurable: true,
      enumerable: true,
    });
  }
})();
```

This means all of these are equivalent:

| Canonical                    | Alias (legacy)          |
|------------------------------|-------------------------|
| `GameState.player.x`        | `player.x`              |
| `GameState.gold = 100`      | `gold = 100`            |
| `GameState.mobs`            | `mobs`                  |
| `GameState.bullets`         | `bullets`               |
| `GameState.wave`            | `wave`                  |
| `GameState.gun.ammo`        | `gun.ammo`              |
| `GameState.melee.swinging`  | `melee.swinging`        |
| `GameState.inventory`       | `inventory`             |
| `GameState.playerEquip`     | `playerEquip`           |
| `GameState.potion`          | `potion`                |
| `GameState.keysDown`        | `keysDown`              |
| `GameState.medpacks`        | `medpacks`              |
| `GameState.oreNodes`        | `oreNodes`              |

**Important**: The aliases use getter/setter on `window`, so `player = newObj` replaces `GameState.player` entirely. Sub-property writes like `player.x = 5` go through the getter to get the existing object, then set `.x` on it.

### How to Add New State Properties

1. Add the property to the `GameState` object literal in `gameState.js`.
2. The IIFE at the bottom automatically creates the `window` alias for any top-level key.
3. If the new property needs to survive save/load, update `saveLoad.js`.
4. If the new property needs network sync, update `snapshots.js` (both `serializeGameState` and `applyGameStateSnapshot`).

### Gameplay State vs UI State

`GameState` holds **gameplay state only** -- data the authority needs for simulation. The following are explicitly **NOT** in GameState:

- UI panel open/close state (`UI`, `panelManager.js`)
- Camera position (`camera.js`)
- Chat messages and DOM state
- Canvas context (`ctx`)
- Scene transitions and fade state
- Cosmetic-only particles (`hitEffects`, `deathEffects`, `mobParticles` are in GameState for rendering convenience but excluded from snapshots)

### Debug/Dev Flags

These are on `window` but **not** inside `GameState`:

```js
window._mobsFrozen = false;   // /freeze — all mobs stop moving + abilities
window._godMode = false;      // /god — player takes 0 damage
window._mobsNoFire = false;   // /nofire — mobs can't shoot or use abilities
window._gameSpeed = 1;        // /speed — game speed multiplier (0.25, 0.5, 1, 2)
```

### Entity ID Counters

Global `let` variables (not in GameState, but serialized in snapshots):

```js
let nextBulletId = 1;   // gameState.js
let nextOreNodeId = 1;  // gameState.js
let nextMobId = 1;      // waveSystem.js
```

---

## Event Bus (`js/authority/eventBus.js`)

Lightweight pub/sub for decoupling game systems. Defined as a `const Events` object (global lexical scope, not on `window`).

### API

```js
Events.on(eventName, callback)    // Subscribe. callback receives (data).
Events.off(eventName, callback)   // Unsubscribe specific callback.
Events.emit(eventName, data)      // Fire event. All handlers called synchronously.
Events.clear()                    // Remove ALL listeners (used on reset/cleanup).
```

Handlers are wrapped in try/catch -- a failing handler logs an error but does not break other handlers or the game loop.

### All Known Event Names and Payloads

#### `mob_killed`

**Emitted by**: `damageSystem.js` (two call sites -- normal kill and summoned mob kill)

**Payload**:
```js
{
  mob,           // MobObject — the dead mob
  source,        // string — "gun" | "melee" | "grab" | etc.
  goldEarned,    // number — gold awarded (0 for summoned mobs)
  heal,          // number — HP healed on kill (1 for summoned, variable for normal)
  qkb,           // object|undefined — quick-kill bonus data
  killerId,      // string|undefined — entity ID of the killer
  killerMember,  // PartyMember|undefined — party member who got the kill
}
```

**Subscribers**:
| File | Purpose |
|------|---------|
| `damageSystem.js` (3 handlers) | Kill tracking, XP awards, special ability triggers |
| `lootDropSystem.js` | Loot drop rolls on mob death |

#### `wave_cleared`

**Emitted by**: `mobSystem.js`

**Payload**:
```js
{
  wave,            // number — wave that was just cleared
  floor,           // number — dungeonFloor
  stairsOpen,      // boolean — whether stairs to next floor opened
  dungeonComplete, // boolean — whether dungeon is fully complete
}
```

**Subscribers**: None currently registered via `Events.on` (consumed inline by wave system).

#### `wave_started`

**Emitted by**: `waveSystem.js` (two call sites -- boss wave and normal wave)

**Payload**:
```js
{
  wave,       // number — wave number starting
  floor,      // number — dungeonFloor
  isBoss,     // boolean — true if this is a boss wave
  mobCount,   // number — how many mobs were spawned
}
```

**Subscribers**: None currently registered via `Events.on`.

#### `player_damaged`

**Emitted by**: `damageSystem.js`

**Payload**:
```js
{
  amount,    // number — final damage after armor/reduction
  raw,       // number — raw damage before reduction
  source,    // string — damage source type
  attacker,  // MobObject|null — mob that dealt damage
  target,    // PlayerObject — the damaged entity
}
```

**Subscribers**: None currently registered via `Events.on`.

#### `player_died`

**Emitted by**: `interactable.js`

**Payload**:
```js
{
  lives,     // number — remaining lives
  gameOver,  // boolean — true if no lives remain
  x,         // number — death position X
  y,         // number — death position Y
}
```

**Subscribers**: None currently registered via `Events.on`.

#### `floor_changed`

**Emitted by**: `sceneManager.js`

**Payload**:
```js
{
  floor,     // number — new dungeonFloor value
}
```

**Subscribers**: None currently registered via `Events.on`.

#### `scene_changed`

**Emitted by**: `sceneManager.js` (inside `Scene.current` setter)

**Payload**:
```js
{
  from,      // string — previous scene name
  to,        // string — new scene name
}
```

**Subscribers**:
| File | Purpose |
|------|---------|
| `sparSystem.js` | Registers spar door interactable when entering spar scene |

### Integration Pattern

The event bus is intentionally one-way: emitters do not know who is listening. This makes it safe to add new subscribers without modifying the emitting system. For the Unity port, each event maps to a C# event or delegate:

```csharp
// Unity equivalent pattern
public static event Action<MobKilledData> OnMobKilled;
public static event Action<WaveStartedData> OnWaveStarted;
// etc.
```

---

## Authority Tick Pipeline (`js/authority/authorityTick.js`)

The authority tick is the core simulation step. It bridges client input to server-authoritative game logic.

### Pipeline Overview

```
Per frame:
  1. translateIntentsToCommands()   [commands.js]    — reads keysDown/InputIntent, fills CommandQueue
  2. authorityTick()                [authorityTick.js] — consumes commands, runs simulation
     a) Copy & clear CommandQueue
     b) Apply commands → set InputIntent flags
     c) System-specific intent overrides (freeze, restrictions)
     d) _authorityDriven = true
     e) update()                    — the main simulation tick
     f) _authorityDriven = false
     g) BotAI.tick()                — bot AI runs after update, before snapshot
     h) Return serializeGameState() — snapshot of the new state
```

### CommandQueue (`js/authority/commands.js`)

Commands are plain JSON objects enqueued by the client and consumed by the authority each tick.

**Format**: `{ t: string, ts: number, data: object }`

**`window.CommandQueue`**: `Array<Command>` -- cleared every tick by `authorityTick()`.

**`window.enqueueCommand(cmd)`**: Pushes to `CommandQueue` and a 200-entry debug history ring buffer.

#### Command Types

| `t` value     | `data` fields                                                    | Intent flag(s) set                              |
|---------------|------------------------------------------------------------------|--------------------------------------------------|
| `'move'`      | `{ x: -1\|0\|1, y: -1\|0\|1 }`                                 | `moveX`, `moveY`                                 |
| `'shoot'`     | `{ held: bool, aim: { mouseX, mouseY, arrowAimDir, arrowShooting } }` | `shootHeld`, `mouseX`, `mouseY`, `arrowAimDir`, `arrowShooting` |
| `'reload'`    | `{}`                                                             | `reloadPressed`                                  |
| `'melee'`     | `{}`                                                             | `meleePressed`                                   |
| `'dash'`      | `{}`                                                             | `dashPressed`                                    |
| `'interact'`  | `{}`                                                             | `interactPressed`                                |
| `'ultimate'`  | `{}`                                                             | `ultimatePressed`                                |
| `'skipWave'`  | `{}`                                                             | `skipWavePressed`                                |
| `'readyWave'` | `{}`                                                             | `readyWavePressed`                               |
| `'slot'`      | `{ slot: 0\|1\|2 }`                                             | `slot1Pressed`, `slot2Pressed`, or `slot3Pressed` |
| `'usePotion'` | `{}`                                                             | `potionPressed`                                  |
| `'grab'`      | `{}`                                                             | `slot5Pressed`                                   |
| `'useExtra'`  | `{}`                                                             | `slot4Pressed`                                   |
| `'fish_reel'` | `{ held: bool }`                                                 | `reelPressed`, optionally `reelHeld`             |

### InputIntent (`js/client/input/inputIntent.js`)

The bridge between raw input and the authority. Two categories of flags:

**Held flags** (persist while key/button is held, NOT auto-cleared):

| Field            | Type    | Description                          |
|------------------|---------|--------------------------------------|
| `chatActive`     | boolean | True while chat input is focused     |
| `moveX`          | number  | -1 (left), 0 (none), 1 (right)      |
| `moveY`          | number  | -1 (up), 0 (none), 1 (down)         |
| `mouseX`         | number  | Screen-space mouse X                 |
| `mouseY`         | number  | Screen-space mouse Y                 |
| `mouseDown`      | boolean | Left mouse button held               |
| `shootHeld`      | boolean | Mouse or arrow keys held             |
| `arrowAimDir`    | number  | 0=down, 1=up, 2=left, 3=right       |
| `arrowShooting`  | boolean | Arrow keys are actively aiming       |
| `reelHeld`       | boolean | Space held during fishing reel phase |

**One-frame flags** (cleared by `clearOneFrameIntents()` after each tick):

| Field              | Type    | Description                 |
|--------------------|---------|-----------------------------|
| `shootPressed`     | boolean | Just started shooting       |
| `meleePressed`     | boolean | F key pressed               |
| `reloadPressed`    | boolean | R key pressed               |
| `dashPressed`      | boolean | Shift pressed               |
| `interactPressed`  | boolean | E key pressed               |
| `slot1Pressed`     | boolean | Hotbar slot 1               |
| `slot2Pressed`     | boolean | Hotbar slot 2               |
| `slot3Pressed`     | boolean | Hotbar slot 3               |
| `slot4Pressed`     | boolean | Extra item slot              |
| `slot5Pressed`     | boolean | Grab slot                   |
| `potionPressed`    | boolean | Potion use                  |
| `ultimatePressed`  | boolean | Ultimate ability (shrine/godspeed) |
| `skipWavePressed`  | boolean | N key (OP mode wave skip)   |
| `readyWavePressed` | boolean | G key (skip countdown)      |
| `reelPressed`      | boolean | Space pressed during fishing |

### System-Specific Intent Overrides

After commands are applied to `InputIntent`, `authorityTick` applies several override blocks in order:

1. **Mafia freeze**: If `MafiaSystem.isPlayerFrozen()`, zeroes movement and blocks all combat/interact intents.
2. **Mafia lobby panel**: If lobby panel is open, zeroes movement and blocks interact.
3. **Hide & Seek freeze**: If `HideSeekSystem.isPlayerFrozen()`, same as Mafia freeze.
4. **Spar freeze**: If `SparSystem.isPlayerFrozen()` (countdown/post_match), blocks all intents including potion.
5. **Spar fighting restrictions**: During spar fighting phase, forces `activeSlot = 0` (gun only), blocks melee/dash/potion/ultimate.
6. **Hide & Seek weapon restrictions**: Forces melee slot; if player is hider, also blocks melee.
7. **Spar training override**: If `_isSparTraining()`, replaces ALL intents with scripted archetype movement/shooting.

### `_authorityDriven` Flag

```js
window._authorityDriven = false;
```

Set to `true` during `update()` so that the update function skips its own `keysDown -> InputIntent.moveX/moveY` translation (since `authorityTick` already did it from commands). This prevents double-processing of input.

### `DEBUG_pauseAuthority`

```js
window.DEBUG_pauseAuthority = false;
```

When `true`, `authorityTick()` discards all commands and returns `null` (the game freezes completely -- no simulation, no snapshot).

---

## Snapshots (`js/authority/snapshots.js`)

Serialization system for network-ready state transfer. Currently used for debug round-trip testing; designed for future multiplayer.

### Schema Version

```js
snap.v = 1  // Current schema version — checked on apply
snap.t       // Date.now() timestamp of serialization
```

`applyGameStateSnapshot` rejects any snapshot where `v !== 1`.

### `serializeGameState()` -- What Is Included

Returns a plain JSON-safe object. Every field listed below is explicitly copied (no pass-by-reference):

#### Top-level snapshot fields

| Field | Type | Source |
|-------|------|--------|
| `v` | `1` | Hardcoded schema version |
| `t` | `number` | `Date.now()` |
| `player` | `object` | See below |
| `wave` | `number` | `GameState.wave` |
| `waveState` | `string` | `GameState.waveState` |
| `kills` | `number` | `GameState.kills` |
| `dungeonFloor` | `number` | `GameState.dungeonFloor` |
| `gold` | `number` | `GameState.gold` |
| `activeSlot` | `number` | Global `activeSlot` (not in GameState) |
| `lives` | `number` | Global `lives` |
| `contactCooldown` | `number` | Global `contactCooldown` |
| `waveTimer` | `number` | Global `waveTimer` |
| `playerDead` | `boolean` | Global `playerDead` |
| `deathTimer` | `number` | Global `deathTimer` |
| `deathX` | `number` | Global `deathX` |
| `deathY` | `number` | Global `deathY` |
| `deathRotation` | `number` | Global `deathRotation` |
| `deathGameOver` | `boolean` | Global `deathGameOver` |
| `respawnTimer` | `number` | Global `respawnTimer` |
| `poisonTimer` | `number` | Global `poisonTimer` |
| `poisonTickTimer` | `number` | Global `poisonTickTimer` |
| `stairsOpen` | `boolean` | Global `stairsOpen` |
| `dungeonComplete` | `boolean` | Global `dungeonComplete` |
| `reviveUsed` | `boolean` | Global `reviveUsed \|\| player._reviveUsed` |
| `currentDungeon` | `string` | Global `currentDungeon` |
| `dungeonReturnLevel` | `string` | Global `dungeonReturnLevel` |
| `fireRateBonus` | `number` | Global `fireRateBonus` |
| `isGrabbing` | `boolean` | Global `isGrabbing` |
| `grabTimer` | `number` | Global `grabTimer` |
| `grabTargetId` | `number\|null` | `grabTarget ? grabTarget.id : null` |
| `scene` | `string` | `Scene.current` (read-only in snapshot) |
| `gun` | `object` | See below |
| `melee` | `object` | See below |
| `shrine` | `object` | See below |
| `godspeed` | `object` | See below |
| `inventory` | `Array` | Deep-copied item objects |
| `potion` | `object` | See below |
| `playerEquip` | `object` | Deep-copied (gun/melee use `JSON.parse(JSON.stringify())`) |
| `mobs` | `Array` | See below |
| `bullets` | `Array` | See below |
| `medpacks` | `Array` | `{ x, y, bobFrame }` per entry |
| `nextMobId` | `number` | Global `nextMobId` |
| `nextBulletId` | `number` | Global `nextBulletId` |
| `partyActive` | `boolean` | `PartyState.members.length > 0` |
| `partyMembers` | `Array` | See below |

#### `snap.player` fields

```
x, y, vx, vy, knockVx, knockVy, speed, baseSpeed,
dir, frame, animTimer, moving, hp, maxHp, name,
skin, hair, shirt, pants, eyes, facialHair, shoes, hat,
glasses, gloves, belt, cape, tattoo, scars, earring, necklace,
backpack, warpaint
```

Note: `headId` is NOT included in the snapshot.

#### `snap.gun` fields

```
ammo, magSize, reloading, reloadTimer, fireCooldown, damage, recoilTimer, special
```

#### `snap.melee` fields

All fields from `GameState.melee` are serialized, including all dash sub-state:
```
damage, range, arcAngle, cooldown, cooldownMax, swinging, swingTimer,
swingDuration, swingDir, knockback, critChance, special,
dashing, dashTimer, dashDuration, dashSpeed, dashDirX, dashDirY,
dashStartX, dashStartY, dashTrail (deep-copied: [{x, y, life}]),
dashesLeft, dashChainWindow, dashCooldown, dashCooldownMax, dashActive, dashGap
```

#### `snap.shrine` and `snap.godspeed` (ultimates)

These come from global `shrine` and `godspeed` objects (not in GameState):

```js
// shrine
{ charges, chargesMax, active, timer, duration, range, slashInterval, damagePerSlash }

// godspeed
{ charges, chargesMax, active, timer, duration, range, strikeInterval, damagePerStrike }
```

#### `snap.mobs[]` fields per mob

```
id, type, x, y, hp, maxHp, speed, damage, contactRange,
dir, frame, attackCooldown, scale, spawnFrame,
skin, hair, shirt, pants, name,
shootRange, shootRate, shootTimer, bulletSpeed,
summonRate, summonMax, summonTimer, witchId, boneSwing, castTimer,
boulderRate, boulderSpeed, boulderRange, boulderTimer, throwAnim,
explodeRange, explodeDamage, mummyFuse, mummyArmed, mummyFlash,
arrowRate, arrowSpeed, arrowRange, arrowTimer, arrowBounces, arrowLife, bowDrawAnim,
healRadius, healRate, healAmount, healTimer, healAnim, healZoneX, healZoneY
```

#### `snap.bullets[]` fields per bullet

```
id, x, y, vx, vy, fromPlayer, mobBullet (bool), damage,
ownerId (string|null), isBoulder (bool), isArrow (bool),
bouncesLeft (number, default 0), arrowLife (number, default 0)
```

#### `snap.partyMembers[]` fields per member

```js
{
  id,              // string — unique member ID
  name,            // string
  controlType,     // "local" | "bot"
  slotIndex,       // number — party slot
  dead,            // boolean
  lives,           // number
  active,          // boolean
  entity: {        // null for local player, object for bots
    x, y, hp, maxHp, dir, frame, moving,
    skin, hair, shirt, pants, name
  },
  gun: {           // null if no gun
    damage, ammo, magSize
  }
}
```

### What Is Explicitly EXCLUDED from Snapshots

- `keysDown` (input state)
- `hitEffects`, `deathEffects`, `mobParticles` (cosmetic particles)
- `oreNodes` (mining state)
- UI state, DOM, chat, mouse position
- Camera position and transition state
- Rendering timers and Canvas context (`ctx`)
- `headId` on player

### `applyGameStateSnapshot(snap)`

Writes a snapshot back into `GameState` and related globals. Returns `true` on success, `false` if version mismatch.

Key behaviors:
- **Player**: Writes all fields individually into `GameState.player` (no object replacement).
- **Gun/Melee**: Writes all fields individually into `GameState.gun` / `GameState.melee`.
- **Ultimates**: Writes into global `shrine` and `godspeed` objects.
- **Mobs/Bullets/Medpacks**: Replaces entire arrays (`GameState.mobs = snap.mobs.map(...)`) -- creates new objects, no reference sharing.
- **Inventory/Equipment**: Deep-copied via `JSON.parse(JSON.stringify())` for nested data.
- **Grab target**: Resolved AFTER mobs are loaded by finding mob with matching `grabTargetId`.
- **Party sync**: After grab state is restored, syncs `PartySystem.getLocalMember().grab` from legacy globals.
- **Globals written**: `activeSlot`, `activeHotbarSlot`, `lives`, `contactCooldown`, `waveTimer`, `playerDead`, `deathTimer`, `deathX`, `deathY`, `deathRotation`, `deathGameOver`, `respawnTimer`, `poisonTimer`, `poisonTickTimer`, `stairsOpen`, `dungeonComplete`, `reviveUsed`, `player._reviveUsed`, `currentDungeon`, `dungeonReturnLevel`, `fireRateBonus`, `isGrabbing`, `grabTimer`, `grabTarget`, `nextMobId`, `nextBulletId`.

### Debug Utilities

#### `DEBUG_dumpSnapshot()`

Serializes current state and logs a summary to console:
```
[snapshots] Snapshot v1 | 5 mobs | 12 bullets | 0 medpacks | 3 items | 2.1 KB
```
Returns the snapshot object.

#### `DEBUG_roundTripSnapshot()`

1. Serializes current state (before).
2. Applies that snapshot back (overwrites GameState).
3. Re-serializes (after).
4. Compares before vs after (excluding timestamp `t`).
5. Logs `PASS` if identical, or `MISMATCH` with the first differing key.
Returns `true`/`false`.

This is the primary tool for verifying snapshot completeness. Any field that is gameplay-relevant but missing from `serializeGameState` will cause a mismatch here.
