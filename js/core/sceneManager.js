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
    else if (level.isHideSeek) this._current = 'hideseek';
    else if (level.isMafiaLobby) this._current = 'mafia_lobby';
    else if (level.isSkeld) this._current = 'skeld';
    else if (level.isVortalis) this._current = 'vortalis';
    else if (level.isEarth205) this._current = 'earth205';
    else if (level.isWagashi) this._current = 'wagashi';
    else if (level.isEarth216) this._current = 'earth216';
    else if (level.isCasino) this._current = 'casino';
    else if (level.isSpar) this._current = 'spar';
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
  get inHideSeek() { return this._current === 'hideseek'; },
  get inMafiaLobby() { return this._current === 'mafia_lobby'; },
  get inSkeld() { return this._current === 'skeld'; },
  get inVortalis() { return this._current === 'vortalis'; },
  get inEarth205() { return this._current === 'earth205'; },
  get inWagashi() { return this._current === 'wagashi'; },
  get inEarth216() { return this._current === 'earth216'; },
  get inCasino() { return this._current === 'casino'; },
  get inSpar() { return this._current === 'spar'; },
};

// ---- PORTAL TYPE REGISTRY ----
// Maps portal entity type → required scene for the portal to activate.
// All portal types call startTransition(e.target, e.spawnTX, e.spawnTY).
// Adding a new portal: just add one entry here + the entity in levelData.
const PORTAL_SCENES = {
  cave_entrance: 'lobby',   cave_exit: 'cave',
  mine_entrance: 'lobby',   mine_exit: 'mine',    mine_door: 'mine',
  deli_entrance: 'lobby',   deli_exit: 'cooking',
  diner_entrance: 'lobby',  diner_exit: 'cooking',
  fine_dining_entrance: 'lobby', fine_dining_exit: 'cooking',
  house_entrance: 'lobby',  house_exit: 'farm',
  azurine_entrance: 'lobby', azurine_exit: 'azurine',
  gunsmith_entrance: 'lobby', gunsmith_exit: 'gunsmith',
  hideseek_entrance: 'lobby',
  skeld_entrance: 'lobby',
  mafia_lobby_exit: 'mafia_lobby',
  vortalis_entrance: 'lobby',
  vortalis_exit: 'vortalis',
  earth205_entrance: 'lobby',
  earth205_exit: 'earth205',
  wagashi_entrance: 'lobby',
  wagashi_exit: 'wagashi',
  earth216_entrance: 'lobby',
  earth216_exit: 'earth216',
  casino_entrance: 'lobby',
  casino_exit: 'casino',
  spar_entrance: 'lobby',
  spar_exit: 'spar',
};

// Scenes that reset to 'lobby' state on entry (non-combat, non-dungeon)
const LOBBY_RESET_SCENES = new Set(['lobby', 'cave', 'azurine', 'gunsmith', 'skeld', 'mafia_lobby', 'vortalis', 'earth205', 'wagashi', 'earth216', 'casino']);

// ---- /LEAVE SYSTEM ----
// Registry for enclosed scenes that require /leave to exit (no walkable door).
// Each entry: scene name → { cleanup(), returnLevel, message }
// cleanup() is called before transition. returnLevel can be a string or function.
const LEAVE_HANDLERS = {
  test_arena: {
    cleanup() {
      mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
      deathEffects.length = 0; mobParticles.length = 0; medpacks.length = 0;
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
      if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
      if (typeof StatusFX !== 'undefined' && StatusFX.clearPlayer) StatusFX.clearPlayer();
      window._opMode = false;
    },
    returnLevel: 'lobby_01',
    returnTX: 40, returnTY: 42,
    message: 'Leaving test arena...',
  },
  mine: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 53, returnTY: 9,
    message: 'Leaving mine...',
  },
  cooking: {
    cleanup() {},
    get returnLevel() { return 'lobby_01'; },
    get returnTX() {
      if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'fine_dining') return 6;
      if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') return 6;
      return 6;
    },
    get returnTY() {
      if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'fine_dining') return 45;
      if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') return 33;
      return 21;
    },
    get message() {
      if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'fine_dining') return 'Leaving restaurant...';
      if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') return 'Leaving diner...';
      return 'Leaving deli...';
    },
  },
  farm: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 15, returnTY: 9,
    message: 'Leaving farm...',
  },
  cave: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 39, returnTY: 10,
    message: 'Leaving cave...',
  },
  azurine: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 72, returnTY: 9,
    message: 'Leaving Azurine City...',
  },
  vortalis: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 53, returnTY: 21,
    message: 'Leaving Vortalis...',
  },
  earth205: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 53, returnTY: 33,
    message: 'Leaving Earth-205...',
  },
  wagashi: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 53, returnTY: 45,
    message: 'Leaving Wagashi...',
  },
  earth216: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 53, returnTY: 57,
    message: 'Leaving Earth-216...',
  },
  gunsmith: {
    cleanup() {},
    returnLevel: 'lobby_01',
    returnTX: 72, returnTY: 21,
    message: 'Leaving gunsmith...',
  },
  casino: {
    cleanup() { if (typeof casinoReset === 'function') casinoReset(); UI.close(); },
    returnLevel: 'lobby_01',
    returnTX: 72,
    returnTY: 33,
    message: 'Leaving casino...',
  },
  spar: {
    cleanup() {
      if (typeof SparSystem !== 'undefined') SparSystem.endMatch();
    },
    returnLevel: null,
    message: 'Left Spar Building.',
  },
  dungeon: {
    cleanup() {
      mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
      deathEffects.length = 0; mobParticles.length = 0; medpacks.length = 0;
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
      if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
      if (typeof StatusFX !== 'undefined' && StatusFX.clearPlayer) StatusFX.clearPlayer();
      gold = 0;
    },
    get returnLevel() { return dungeonReturnLevel || 'cave_01'; },
    message: 'Leaving dungeon...',
  },
  hideseek: {
    cleanup() {
      if (typeof HideSeekSystem !== 'undefined') HideSeekSystem.endMatch();
    },
    returnLevel: null, // endMatch handles its own transition
    message: 'Left Hide & Seek.',
  },
  mafia_lobby: {
    cleanup() {
      if (typeof closeMafiaSettingsPanel === 'function') closeMafiaSettingsPanel();
      if (typeof closeMafiaColorPicker === 'function') closeMafiaColorPicker();
    },
    returnLevel: 'lobby_01',
    returnTX: 28, returnTY: 21,
    message: 'Leaving Mafia lobby...',
  },
  skeld: {
    cleanup() {
      if (typeof closeTaskPanel === 'function') closeTaskPanel();
      if (typeof SkeldTasks !== 'undefined') SkeldTasks.reset();
      if (typeof VentSystem !== 'undefined') VentSystem.reset();
      if (typeof MafiaState !== 'undefined') {
        MafiaState.phase = 'idle';
        MafiaState.participants = [];
        MafiaState.bodies = [];
        MafiaState.playerRole = null;
      }
      if (typeof _taskListExpanded !== 'undefined') _taskListExpanded = true;
    },
    returnLevel: 'mafia_lobby',
    returnTX: 25, returnTY: 20,
    message: 'Leaving The Skeld...',
  },
};

function handleLeave() {
  const handler = LEAVE_HANDLERS[Scene.current];
  if (!handler) return false;
  if (handler.cleanup) handler.cleanup();
  if (handler.returnLevel) startTransition(handler.returnLevel, handler.returnTX || 20, handler.returnTY || 20);
  chatMessages.push({ name: 'SYSTEM', text: handler.message, time: Date.now() });
  return true;
}

// ---- ZONE TRANSITIONS ----
let transitioning = false;
let transitionAlpha = 0;
let transitionPhase = 0;
let transitionTarget = null;
let transitionSpawnTX = 0;
let transitionSpawnTY = 0;

function enterLevel(targetLevelId, spawnTX, spawnTY) {
  try {
    // Run cleanup for current scene before transitioning (close panels, etc.)
    // Guard: skip spar cleanup on intra-spar transitions (hub↔arena)
    const _targetIsSpar = LEVELS[targetLevelId] && LEVELS[targetLevelId].isSpar;
    const leavingHandler = LEAVE_HANDLERS[Scene.current];
    if (leavingHandler && leavingHandler.cleanup && !(Scene.inSpar && _targetIsSpar)) leavingHandler.cleanup();

    const targetLevel = LEVELS[targetLevelId];
    if (!targetLevel) return;
    setLevel(targetLevel);
    player.x = spawnTX * TILE + TILE / 2;
    player.y = spawnTY * TILE + TILE / 2;
    player.vx = 0; player.vy = 0;
    // Reposition party bots near player on scene transition
    if (PartyState.members.length > 0) {
      for (const _pm of PartyState.members) {
        if (_pm.controlType === 'bot' && !_pm.dead && _pm.entity) {
          _pm.entity.x = player.x + (_pm.slotIndex - 1) * 40 - 40;
          _pm.entity.y = player.y + 30;
          _pm.entity.knockVx = 0; _pm.entity.knockVy = 0;
        }
      }
    }
    UI.close();
    mobs.length = 0;
    bullets.length = 0;
    hitEffects.length = 0;
    medpacks.length = 0;
    queueActive = false; queuePlayers = 0; queueTimer = 0;
    if (Scene.is('test_arena')) {
      // Test arena: clear mobs/effects but keep inventory/equipment
      mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
      deathEffects.length = 0; mobParticles.length = 0; medpacks.length = 0;
      waveState = "idle"; waveTimer = 0;
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
      if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
      if (typeof StatusFX !== 'undefined' && StatusFX.clearPlayer) StatusFX.clearPlayer();
      if (!PartyState.active) PartySystem.init(1);
    } else if (LOBBY_RESET_SCENES.has(Scene.current)) {
      resetCombatState('lobby');
    } else if (Scene.is('mine')) {
      resetCombatState('mine');
    } else if (Scene.is('cooking')) {
      resetCombatState('cooking');
      // Determine which restaurant from level id
      if (targetLevel.id === 'diner_01') {
        if (typeof cookingState !== 'undefined') cookingState.activeRestaurantId = 'diner';
        if (typeof initDinerNPCs === 'function') initDinerNPCs();
      } else if (targetLevel.id === 'fine_dining_01') {
        if (typeof cookingState !== 'undefined') cookingState.activeRestaurantId = 'fine_dining';
        if (typeof initFineDiningNPCs === 'function') initFineDiningNPCs();
      } else {
        if (typeof cookingState !== 'undefined') cookingState.activeRestaurantId = 'street_deli';
        if (typeof initDeliNPCs === 'function') initDeliNPCs();
      }
    } else if (Scene.is('farm')) {
      resetCombatState('farm');
      if (typeof initFarmState === 'function') initFarmState();
    } else if (Scene.is('hideseek')) {
      resetCombatState('hideseek');
      if (typeof HideSeekState !== 'undefined') HideSeekState.phase = 'role_select';
    } else if (Scene.inSpar) {
      // Spar: clear combat entities but keep spar loadout (gun/equip set by joinRoom)
      mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
      deathEffects.length = 0; mobParticles.length = 0; medpacks.length = 0;
      waveState = "idle"; waveTimer = 0;
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
      if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
      if (typeof StatusFX !== 'undefined' && StatusFX.clearPlayer) StatusFX.clearPlayer();
    } else {
      pendingDungeonFloor = queueFloorStart;
      pendingDungeonType = queueDungeonType;
      pendingReturnLevel = queueReturnLevel;
      resetCombatState('dungeon');
      // Ensure party is initialized (solo if not already set up via queue)
      if (!PartyState.active) PartySystem.init(1);
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
    // Portal registry lookup — replaces 13 individual if-statements
    const requiredScene = PORTAL_SCENES[e.type];
    if (requiredScene && Scene.is(requiredScene) && inZone) {
      // Restaurant entrance gating — check cooking level requirements
      if (e.type === 'diner_entrance' || e.type === 'fine_dining_entrance') {
        const shopId = e.type === 'diner_entrance' ? 'diner' : 'fine_dining';
        const shop = typeof COOKING_SHOPS !== 'undefined' ? COOKING_SHOPS[shopId] : null;
        if (shop) {
          const cookingLvl = typeof skillData !== 'undefined' && skillData.Cooking ? skillData.Cooking.level : 1;
          if (!window._opMode && cookingLvl < shop.levelReq) {
            if (typeof hitEffects !== 'undefined') {
              hitEffects.push({
                x: player.x, y: player.y - 40, life: 50, maxLife: 50,
                type: "heal", dmg: "Requires Cooking Lv" + shop.levelReq + " (you are Lv" + cookingLvl + ")"
              });
            }
            continue;
          }
        }
      }
      startTransition(e.target, e.spawnTX, e.spawnTY);
      return;
    }
    if (e.type === 'queue_zone' && (Scene.inCave || Scene.inAzurine || Scene.inVortalis || Scene.inEarth205 || Scene.inWagashi || Scene.inEarth216) && inZone) {
      nearQueue = true;
      const _regEntry = typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[e.dungeonType || 'cave'];
      queueDungeonId = _regEntry ? (_regEntry.combatLevelId || 'warehouse_01') : 'warehouse_01';
      queueSpawnTX = _regEntry ? (_regEntry.spawnTX || 20) : 20;
      queueSpawnTY = _regEntry ? (_regEntry.spawnTY || 20) : 20;
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
  const _floorEntry = typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[currentDungeon];
  const _floorSpawnTX = _floorEntry ? (_floorEntry.spawnTX || 20) : 20;
  const _floorSpawnTY = _floorEntry ? (_floorEntry.spawnTY || 20) : 20;
  player.x = _floorSpawnTX * TILE + TILE / 2;
  player.y = _floorSpawnTY * TILE + TILE / 2;
  player.vx = 0; player.vy = 0;
  // Transition effect
  transitioning = true;
  transitionPhase = 2;
  transitionAlpha = 1;
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "FLOOR " + dungeonFloor });
  // Party: respawn dead members with lives, reposition bots
  if (typeof PartySystem !== 'undefined' && PartyState.members.length > 0) {
    PartySystem.onFloorAdvance();
  }
  Events.emit('floor_changed', { floor: dungeonFloor });
}

function joinQueue() {
  if (!nearQueue || transitioning) return;
  // Entry gating — check dungeon level requirement
  const _gateEntry = typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[queueDungeonType];
  if (!window._opMode && _gateEntry && _gateEntry.requiredLevel > 0) {
    const _myDungLvl = typeof getDungeonLevel === 'function' ? getDungeonLevel() : 0;
    if (_myDungLvl < _gateEntry.requiredLevel) {
      chatMessages.push({ name: 'SYSTEM', text: 'Dungeon Level ' + _gateEntry.requiredLevel + ' required (yours: ' + _myDungLvl + ')', time: Date.now() });
      return;
    }
  }
  if (queueActive) {
    queueActive = false;
    queuePlayers = Math.max(0, queuePlayers - 1);
    // Reset queue slots
    if (typeof PartyState !== 'undefined') {
      PartyState.queueSlots = [true, false, false, false];
    }
    return;
  }
  if (queuePlayers >= QUEUE_MAX) return;
  queueActive = true;
  queuePlayers = 1;
  // Party mode: no countdown timer — player picks slots then clicks Start
  queueTimer = 999999; // stays open until Start clicked or player moves
  // Reset queue slots
  if (typeof PartyState !== 'undefined') {
    PartyState.queueSlots = [true, false, false, false];
  }
  // Snap to first circle position
  if (queueCirclePositions.length > 0) {
    queueLockX = queueCirclePositions[0].x;
    queueLockY = queueCirclePositions[0].y;
  } else {
    queueLockX = player.x;
    queueLockY = player.y;
  }
}

// Start dungeon from queue (called by Start button click)
function startDungeon() {
  if (!queueActive) return;
  // Count filled slots
  const slotCount = typeof PartyState !== 'undefined' ? PartyState.queueSlots.filter(Boolean).length : 1;
  // Initialize party system
  if (typeof PartySystem !== 'undefined') {
    PartySystem.init(slotCount);
  }
  queueActive = false;
  queuePlayers = 0;
  enterLevel(queueDungeonId, queueSpawnTX, queueSpawnTY);
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
  // No auto-countdown in party mode — wait for Start click
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
