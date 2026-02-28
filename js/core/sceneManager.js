// ===================== SCENE MANAGER =====================
// Active level state, scene state machine, zone transitions,
// queue system, collision helpers, and level initialization.
//
// Depends on: TILE, LEVELS, collisionFromAscii (levelData.js)
//             Events (eventBus.js)
// Runtime deps (not needed at parse time):
//             player, mobs, bullets, hitEffects, medpacks (gameState.js)
//             UI (panelManager.js), resetCombatState (stateReset.js)
//             stairsOpen (waveSystem.js), dungeonFloor (gameState.js)
//             initDeliNPCs (deliNPCSystem.js)

// ---- ACTIVE LEVEL STATE ----
let level = null;
let collisionGrid = null;
let levelEntities = null;
let MAP_W = 0, MAP_H = 0;
let placedTiles = []; // early declaration for setLevel access

function setLevel(levelObj) {
  level = levelObj;
  collisionGrid = collisionFromAscii(level.collisionAscii);
  levelEntities = level.entities || [];
  MAP_W = level.widthTiles * TILE;
  MAP_H = level.heightTiles * TILE;
  placedTiles.length = 0;
  Scene._update();
}

// ===================== SCENE STATE MACHINE =====================
// Replaces 24+ scattered level.isLobby / level.isCave checks.
// Scene.is('dungeon')  Scene.inDungeon  Scene.current
const Scene = {
  _current: 'lobby', // 'lobby', 'cave', 'dungeon'

  _update() {
    const prev = this._current;
    if (!level) { this._current = 'lobby'; return; }
    if (level.isLobby) this._current = 'lobby';
    else if (level.isCave) this._current = 'cave';
    else if (level.isMine) this._current = 'mine';
    else if (level.isCooking) this._current = 'cooking';
    else if (level.isFarm) this._current = 'farm';
    else if (level.isAzurine) this._current = 'azurine';
    else if (level.isGunsmith) this._current = 'gunsmith';
    else if (level.isTestArena) this._current = 'test_arena';
    else this._current = 'dungeon';
    if (prev !== this._current) {
      try { Events.emit('scene_changed', { from: prev, to: this._current }); } catch(e) {}
    }
  },

  is(scene) { return this._current === scene; },
  get current() { return this._current; },
  get inDungeon() { return this._current === 'dungeon'; },
  get inLobby() { return this._current === 'lobby'; },
  get inCave() { return this._current === 'cave'; },
  get inMine() { return this._current === 'mine'; },
  get inCooking() { return this._current === 'cooking'; },
  get inFarm() { return this._current === 'farm'; },
  get inAzurine() { return this._current === 'azurine'; },
  get inGunsmith() { return this._current === 'gunsmith'; },
  get inTestArena() { return this._current === 'test_arena'; },
};

// ---- ZONE TRANSITIONS ----
let transitioning = false;
let transitionAlpha = 0;
let transitionPhase = 0;
let transitionTarget = null;
let transitionSpawnTX = 0;
let transitionSpawnTY = 0;

function enterLevel(targetLevelId, spawnTX, spawnTY) {
  try {
    const targetLevel = LEVELS[targetLevelId];
    if (!targetLevel) return;
    setLevel(targetLevel);
    player.x = spawnTX * TILE + TILE / 2;
    player.y = spawnTY * TILE + TILE / 2;
    player.vx = 0; player.vy = 0;
    UI.close();
    mobs.length = 0;
    bullets.length = 0;
    hitEffects.length = 0;
    medpacks.length = 0;
    queueActive = false; queuePlayers = 0; queueTimer = 0;
    if (targetLevel.isTestArena) {
      // Test arena: clear mobs/effects but keep inventory/equipment
      mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
      deathEffects.length = 0; mobParticles.length = 0; medpacks.length = 0;
      waveState = "idle"; waveTimer = 0;
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
      if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
      if (typeof StatusFX !== 'undefined' && StatusFX.clearPlayer) StatusFX.clearPlayer();
    } else if (targetLevel.isLobby || targetLevel.isCave || targetLevel.isAzurine || targetLevel.isGunsmith) {
      resetCombatState('lobby');
    } else if (targetLevel.isMine) {
      resetCombatState('mine');
    } else if (targetLevel.isCooking) {
      resetCombatState('cooking');
      if (typeof initDeliNPCs === 'function') initDeliNPCs();
    } else if (targetLevel.isFarm) {
      resetCombatState('farm');
      if (typeof initFarmState === 'function') initFarmState();
    } else {
      pendingDungeonFloor = queueFloorStart;
      pendingDungeonType = queueDungeonType;
      pendingReturnLevel = queueReturnLevel;
      resetCombatState('dungeon');
    }
    transitioning = true;
    transitionPhase = 2;
    transitionAlpha = 1;
  } catch(err) {
    console.error("enterLevel error:", err);
    transitioning = false;
  }
}

function startTransition(targetLevelId, spawnTX, spawnTY) {
  if (transitioning) return;
  transitionTarget = targetLevelId;
  transitionSpawnTX = spawnTX;
  transitionSpawnTY = spawnTY;
  transitioning = true;
  transitionPhase = 1;
  transitionAlpha = 0;
}

function updateTransition() {
  if (!transitioning) return;
  if (transitionPhase === 1) {
    transitionAlpha += 0.12;
    if (transitionAlpha >= 1) {
      transitionAlpha = 1;
      transitionPhase = 0;
      transitioning = false;
      enterLevel(transitionTarget, transitionSpawnTX, transitionSpawnTY);
    }
  } else if (transitionPhase === 2) {
    transitionAlpha -= 0.08;
    if (transitionAlpha <= 0) {
      transitionAlpha = 0;
      transitioning = false;
      transitionPhase = 0;
    }
  }
}

// ---- QUEUE SYSTEM ----
let queueActive = false;
let queueTimer = 0;
const QUEUE_DURATION = 600;
let queuePlayers = 0;
const QUEUE_MAX = 4;
let queueDungeonId = '';
let queueSpawnTX = 0;
let queueSpawnTY = 0;
let nearQueue = false;
let nearStairs = false;
let nearFishingSpot = false;
let queueLockX = 0;
let queueLockY = 0;
let queueFloorStart = 1; // which dungeonFloor to set on entry (minimum 1)
let queueDungeonType = 'cave'; // 'cave' | 'azurine' | future dungeon types
let queueReturnLevel = 'cave_01'; // level to return to after dungeon complete
let pendingDungeonFloor = null; // set by queue, consumed by resetCombatState
let pendingDungeonType = null; // set by queue, consumed by resetCombatState
let pendingReturnLevel = null; // set by queue, consumed by resetCombatState
let queueCirclePositions = []; // world positions of the 4 sigils

function checkPortals() {
  if (transitioning) return;
  nearQueue = false;
  nearFishingSpot = false;
  for (const e of levelEntities) {
    const ew = e.w || 1, eh = e.h || 1;
    const px = player.x / TILE, py = player.y / TILE;
    const inZone = px >= e.tx && px < e.tx + ew && py >= e.ty && py < e.ty + eh;
    if (e.type === 'cave_entrance' && Scene.inLobby && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'mine_entrance' && Scene.inLobby && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'mine_exit' && Scene.inMine && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'mine_door' && Scene.inMine && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'deli_entrance' && Scene.inLobby && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'deli_exit' && Scene.inCooking && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'house_entrance' && Scene.inLobby && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'house_exit' && Scene.inFarm && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'cave_exit' && Scene.inCave && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'azurine_entrance' && Scene.inLobby && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'azurine_exit' && Scene.inAzurine && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'gunsmith_entrance' && Scene.inLobby && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'gunsmith_exit' && Scene.inGunsmith && inZone) {
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'queue_zone' && (Scene.inCave || Scene.inAzurine) && inZone) {
      nearQueue = true;
      queueDungeonId = e.dungeonId;
      queueSpawnTX = e.spawnTX;
      queueSpawnTY = e.spawnTY;
      queueFloorStart = e.floorStart || 0;
      queueDungeonType = e.dungeonType || 'cave';
      const _qEntry = typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[queueDungeonType];
      queueReturnLevel = _qEntry ? _qEntry.returnLevel : 'cave_01';
    }
    if (e.type === 'fishing_spot' && Scene.inLobby && inZone) {
      nearFishingSpot = true;
    }
  }
  // Staircase interaction — dungeon only, stairs must be open, press E to enter
  nearStairs = false;
  if (stairsOpen && Scene.inDungeon) {
    const stairCX = level.widthTiles / 2;
    const stairCY = level.heightTiles / 2;
    const px = player.x / TILE, py = player.y / TILE;
    if (px >= stairCX - 2 && px < stairCX + 2 && py >= stairCY - 2 && py < stairCY + 2) {
      nearStairs = true;
    }
  }
}

function goToNextFloor() {
  if (transitioning) return;
  if (!Scene.inDungeon) return; // safety: only advance floors inside a dungeon
  if (dungeonFloor >= getDungeonMaxFloors()) return; // already at final floor
  dungeonFloor++;
  resetCombatState('floor');
  // Re-enter same level layout, spawn at center
  player.x = 20 * TILE + TILE / 2;
  player.y = 20 * TILE + TILE / 2;
  player.vx = 0; player.vy = 0;
  // Transition effect
  transitioning = true;
  transitionPhase = 2;
  transitionAlpha = 1;
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "FLOOR " + dungeonFloor });
  Events.emit('floor_changed', { floor: dungeonFloor });
}

function joinQueue() {
  if (!nearQueue || transitioning) return;
  if (queueActive) {
    queueActive = false;
    queuePlayers = Math.max(0, queuePlayers - 1);
    return;
  }
  if (queuePlayers >= QUEUE_MAX) return;
  queueActive = true;
  queuePlayers = 1;
  queueTimer = QUEUE_DURATION;
  // Snap to first circle position
  if (queueCirclePositions.length > 0) {
    queueLockX = queueCirclePositions[0].x;
    queueLockY = queueCirclePositions[0].y;
  } else {
    queueLockX = player.x;
    queueLockY = player.y;
  }
}

function updateQueue() {
  if (!queueActive) return;
  // Lock player in place on their sigil
  player.x = queueLockX;
  player.y = queueLockY;
  player.vx = 0;
  player.vy = 0;
  player.moving = false;
  player.dir = 1; // face up toward dungeon (back facing camera)
  queueTimer--;
  if (queueTimer <= 0) {
    queueActive = false;
    queuePlayers = 0;
    enterLevel(queueDungeonId, queueSpawnTX, queueSpawnTY);
  }
}

// ---- COLLISION ----
function isSolid(col, row) {
  if (!level || !collisionGrid) return true;
  if (!(col >= 0) || !(row >= 0) || col >= level.widthTiles || row >= level.heightTiles) return true;
  const gridRow = collisionGrid[row];
  if (!gridRow) return true;
  if (gridRow[col] === 1) return true;
  for (const e of levelEntities) {
    if (!e.solid) continue;
    const w = e.w ?? 1;
    const h = e.h ?? 1;
    if (col >= e.tx && col < e.tx + w && row >= e.ty && row < e.ty + h) return true;
  }
  return false;
}

// Initialize level
setLevel(LEVELS.lobby_01);
