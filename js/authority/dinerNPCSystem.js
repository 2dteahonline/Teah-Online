// ===================== DINER NPC SYSTEM =====================
// Party-based customer NPCs for the diner restaurant.
// TWO NPC types: Group NPCs (2-6, sit at tables, order food) and Gamer NPCs (solo, arcade).
// Groups enter periodically, sit at a table, their order becomes active (N parts = group size).
// Only one active order at a time — groups queue. Waitress delivers completed trays.
// NO pathfinding — straight-line movement between defined waypoints.

// ===================== APPEARANCE POOL =====================
const DINER_NPC_APPEARANCES = [
  { skin: '#d4a574', hair: '#3a2a1a', shirt: '#4060a0', pants: '#3a3a50' },
  { skin: '#8d5524', hair: '#1a1a1a', shirt: '#a04040', pants: '#2a3a4a' },
  { skin: '#f0c8a0', hair: '#c08040', shirt: '#40a060', pants: '#4a4a5a' },
  { skin: '#c68642', hair: '#4a3020', shirt: '#d0a040', pants: '#3a4a3a' },
  { skin: '#e0b890', hair: '#8a6a40', shirt: '#6040a0', pants: '#3a3a4a' },
  { skin: '#a0764a', hair: '#2a1a0a', shirt: '#a06030', pants: '#4a3a30' },
  { skin: '#f5d0a0', hair: '#d0a060', shirt: '#306060', pants: '#504040' },
  { skin: '#b5835a', hair: '#1a1010', shirt: '#808080', pants: '#2a2a3a' },
];
const DINER_NPC_NAMES = typeof DINER_NAME_POOL !== 'undefined' ? DINER_NAME_POOL : ['Customer', 'Patron', 'Guest'];

// ===================== DEFINED SPOTS =====================
const DINER_SPOTS = {
  entrance:    { tx: 27, ty: 21 },   // NPCs enter through left "Enter Diner" door
  exit:        { tx: 45, ty: 21 },   // NPCs exit through right "Exit Diner" door
  customerExit: { tx: 45, ty: 21 },  // same as exit
  passWindow:  { tx: 23, ty: 14 },
  counterWait: { tx: 23, ty: 16 },   // waitress idle spot — under kitchen door, facing south
};

// ===================== BOOTHS =====================
// 6 booths in dining area (right side)
// 3 left column (tx: 27-32), 3 right column (tx: 38-43)
const DINER_BOOTHS = [
  // Left column
  { id: 0, tx: 27, ty: 2,  w: 5, h: 3, entry: { tx: 26, ty: 3 }, topRowAccess: { tx: 26, ty: 2 }, bottomRowAccess: { tx: 26, ty: 4 }, seats: [{ tx: 28, ty: 2, sitDir: 0 }, { tx: 30, ty: 2, sitDir: 0 }, { tx: 28, ty: 4, sitDir: 1 }, { tx: 30, ty: 4, sitDir: 1 }], capacity: 4, claimedBy: null, tableNumber: 1 },
  { id: 1, tx: 27, ty: 6,  w: 5, h: 3, entry: { tx: 26, ty: 7 }, topRowAccess: { tx: 26, ty: 6 }, bottomRowAccess: { tx: 26, ty: 8 }, seats: [{ tx: 28, ty: 6, sitDir: 0 }, { tx: 30, ty: 6, sitDir: 0 }, { tx: 28, ty: 8, sitDir: 1 }, { tx: 30, ty: 8, sitDir: 1 }], capacity: 4, claimedBy: null, tableNumber: 2 },
  { id: 2, tx: 27, ty: 10, w: 5, h: 3, entry: { tx: 26, ty: 11 }, topRowAccess: { tx: 26, ty: 10 }, bottomRowAccess: { tx: 26, ty: 12 }, seats: [{ tx: 28, ty: 10, sitDir: 0 }, { tx: 30, ty: 10, sitDir: 0 }, { tx: 28, ty: 12, sitDir: 1 }, { tx: 30, ty: 12, sitDir: 1 }], capacity: 4, claimedBy: null, tableNumber: 3 },
  // Right column
  { id: 3, tx: 38, ty: 2,  w: 5, h: 3, entry: { tx: 36, ty: 3 }, topRowAccess: { tx: 36, ty: 2 }, bottomRowAccess: { tx: 36, ty: 4 }, seats: [{ tx: 39, ty: 2, sitDir: 0 }, { tx: 41, ty: 2, sitDir: 0 }, { tx: 39, ty: 4, sitDir: 1 }, { tx: 41, ty: 4, sitDir: 1 }], capacity: 4, claimedBy: null, tableNumber: 4 },
  { id: 4, tx: 38, ty: 6,  w: 5, h: 3, entry: { tx: 36, ty: 7 }, topRowAccess: { tx: 36, ty: 6 }, bottomRowAccess: { tx: 36, ty: 8 }, seats: [{ tx: 39, ty: 6, sitDir: 0 }, { tx: 41, ty: 6, sitDir: 0 }, { tx: 39, ty: 8, sitDir: 1 }, { tx: 41, ty: 8, sitDir: 1 }], capacity: 4, claimedBy: null, tableNumber: 5 },
  { id: 5, tx: 38, ty: 10, w: 5, h: 3, entry: { tx: 36, ty: 11 }, topRowAccess: { tx: 36, ty: 10 }, bottomRowAccess: { tx: 36, ty: 12 }, seats: [{ tx: 39, ty: 10, sitDir: 0 }, { tx: 41, ty: 10, sitDir: 0 }, { tx: 39, ty: 12, sitDir: 1 }, { tx: 41, ty: 12, sitDir: 1 }], capacity: 4, claimedBy: null, tableNumber: 6 },
];

// ===================== ARCADE SPOTS (centered in dining area) =====================
const DINER_ARCADE_SPOTS = [
  { tx: 34, ty: 18, claimedBy: null },
  { tx: 36, ty: 18, claimedBy: null },
];

// ===================== CONFIG =====================
const DINER_NPC_CONFIG = {
  maxParties: 6,                     // max groups in diner at once
  spawnInterval: [120, 300],         // 2-5 sec between checks for new group spawns
  baseSpeed: 0.77,
  speedVariance: 0.14,
  eatDuration: [900, 900],           // 15 sec eating
  gamerSpawnInterval: [600, 1200],   // 10-20 sec between gamer spawns
  gamerPlayDuration: [1800, 1800],   // 30 sec per game
  gamerFee: 5,                       // gold per play
  gamerMaxPlays: 3,                  // max games before leaving
  waitressTakeOrderDuration: 0,
  waitressSubmitDuration: 30,
  waitressServeDuration: 30,
  menuReadDuration: [60, 120],       // 1-2 sec
};

// ===================== STATE =====================
const dinerNPCs = [];
const dinerParties = [];
const _dinerIdCounter = { value: 0 };
let _dinerPartyId = 0;
const _dinerSpawnState = { timer: 0, nextInterval: 300 };
const _dinerGamerSpawnState = { timer: 0, nextInterval: 900 };

// Waitress NPC — persistent, single instance
let _dinerWaitress = null;

// Pending serve queue — orders completed by player, waiting for waitress delivery
let _dinerPendingServe = [];

// TV queue — tracks order status for diner TV display
let _dinerTVQueue = [];

// Group queue — groups waiting for their order to start (only one active order at a time)
let _dinerGroupQueue = [];

// Active group — the group whose order is currently being prepared
let _dinerActiveGroup = null;

// ===================== HELPERS =====================
// Utility functions (_cRandRange, _cRandFromArray, _cTilePx, _cWP, _cCloneRoute, _cConcatRoutes)
// are provided by cookingNPCBase.js

// Kitchen zone check — NPCs must not enter kitchen interior
function _isDinerKitchenZone(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  // Kitchen interior: tx 0-22, ty 0-14
  if (tx <= 22 && ty <= 14) return true;
  return false;
}

// Find an available booth (not claimed by any party)
function _findFreeBooth(partySize) {
  const candidates = [];
  for (let i = 0; i < DINER_BOOTHS.length; i++) {
    if (DINER_BOOTHS[i].claimedBy === null && DINER_BOOTHS[i].capacity >= partySize) {
      candidates.push(i);
    }
  }
  return candidates.length ? _cRandFromArray(candidates) : -1;
}

// Find a free arcade spot
function _findFreeArcadeSpot() {
  for (let i = 0; i < DINER_ARCADE_SPOTS.length; i++) {
    if (DINER_ARCADE_SPOTS[i].claimedBy === null) return i;
  }
  return -1;
}

// Party/NPC lookups — thin wrappers around cookingNPCBase
function _getDinerParty(partyId) { return _cFindParty(dinerParties, partyId); }
function _getDinerNPC(npcId) { return _cFindNPCById(dinerNPCs, npcId); }
function _getPartyLeader(party) { return _cGetPartyLeader(dinerParties, dinerNPCs, party); }
function _getPartyMembers(party) { return _cGetPartyMembers(dinerNPCs, party); }

function _getDinerSeatAccess(booth, seatIdx) {
  const seat = booth && booth.seats ? booth.seats[seatIdx] : null;
  if (!booth || !seat) return null;
  return {
    seat: seat,
    entry: booth.entry,
    rowAccess: seat.sitDir === 0 ? booth.topRowAccess : booth.bottomRowAccess,
  };
}

// ===================== ROUTE BUILDERS =====================
// All legs are horizontal or vertical to prevent clipping through solids.
//
// SAFE CORRIDORS in the diner:
//   ty: 14  — horizontal corridor between kitchen and dining (main walkway)
//   tx: 26  — vertical corridor between kitchen wall and booths
//   tx: 35-37 — gap between left and right booth columns
//
// ENTRY: NPCs enter from left door (tx:27, ty:21) → north to ty:14 → to booth/arcade
// EXIT:  NPCs go to ty:14 corridor → east to tx:44 → south to ty:21 (right door)

function _routeDinerBoothToSeat(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  const access = _getDinerSeatAccess(booth, seatIdx);
  if (!access) return [];
  return _cConcatRoutes(
    [_cWP(access.rowAccess.tx, access.rowAccess.ty)],
    [_cWP(access.seat.tx, access.seat.ty)]
  );
}

function _routeDinerSeatToBoothEntry(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  const access = _getDinerSeatAccess(booth, seatIdx);
  if (!access) return [];
  return _cConcatRoutes(
    [_cWP(access.rowAccess.tx, access.rowAccess.ty)],
    [_cWP(access.entry.tx, access.entry.ty)]
  );
}

// Entry route: from left entrance (tx:27, ty:21) → north to corridor → to booth
function _routeDinerEntranceToBooth(boothId) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  const route = [];
  // Walk north from entrance to corridor
  route.push({ tx: 27, ty: 14 });
  if (booth.tx >= 38) {
    // Right column booth — east through gap
    route.push({ tx: 36, ty: 14 });
    route.push({ tx: 36, ty: booth.entry.ty });
    route.push({ tx: booth.entry.tx, ty: booth.entry.ty });
  } else {
    // Left column booth — go west to tx:26
    route.push({ tx: 26, ty: 14 });
    route.push({ tx: 26, ty: booth.entry.ty });
    route.push({ tx: booth.entry.tx, ty: booth.entry.ty });
  }
  return route;
}

// Exit route: from position → corridor → east → south to exit door
function _routeDinerToExit(fromTX, fromTY, corridorTX) {
  const route = [];
  // Get to main corridor first
  if (fromTY < 14) {
    if (fromTX >= 35) {
      route.push({ tx: 36, ty: fromTY });
      route.push({ tx: 36, ty: 14 });
    } else if (fromTX >= 24) {
      route.push({ tx: 26, ty: fromTY });
      route.push({ tx: 26, ty: 14 });
    } else {
      route.push({ tx: fromTX, ty: 14 });
    }
  } else if (fromTY > 14 && fromTX < 26) {
    route.push({ tx: fromTX, ty: 16 });
    route.push({ tx: 26, ty: 16 });
    route.push({ tx: 26, ty: 14 });
  }
  // East along corridor to customer exit column
  route.push({ tx: 44, ty: 14 });
  route.push({ tx: 44, ty: DINER_SPOTS.customerExit.ty });
  return route;
}

function _routeDinerSeatToExit(boothId, seatIdx, corridorTX) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  return _cConcatRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    booth.entry.tx >= 36 ? [_cWP(36, 14)] : [_cWP(26, 14)],
    [_cWP(44, 14)],
    [_cWP(44, DINER_SPOTS.customerExit.ty)]
  );
}

// ===================== WAITRESS ROUTE BUILDERS =====================

function _routeCounterToBooth(boothId) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  if (booth.tx >= 38) {
    return _cConcatRoutes(
      [_cWP(26, 16)],
      [_cWP(26, 14)],
      [_cWP(36, 14)],
      [_cWP(booth.entry.tx, booth.entry.ty)]
    );
  } else {
    return _cConcatRoutes(
      [_cWP(26, 16)],
      [_cWP(26, 14)],
      [_cWP(booth.entry.tx, booth.entry.ty)]
    );
  }
}

function _routeBoothToCounter(boothId) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  if (booth.tx >= 38) {
    return _cConcatRoutes(
      [_cWP(36, booth.entry.ty)],
      [_cWP(36, 14)],
      [_cWP(26, 14)],
      [_cWP(26, 16)],
      [_cWP(DINER_SPOTS.counterWait.tx, DINER_SPOTS.counterWait.ty)]
    );
  } else {
    return _cConcatRoutes(
      [_cWP(26, booth.entry.ty)],
      [_cWP(26, 14)],
      [_cWP(26, 16)],
      [_cWP(DINER_SPOTS.counterWait.tx, DINER_SPOTS.counterWait.ty)]
    );
  }
}

// Legacy aliases for route intent system
function _routePassToBooth(boothId) { return _routeCounterToBooth(boothId); }
function _routeBoothToPass(boothId) { return _routeBoothToCounter(boothId); }

// ===================== ARCADE ROUTE BUILDERS =====================

// Gamer entry: from left entrance → north to corridor → east to arcade
function _routeDinerEntranceToArcade(arcadeIdx) {
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!spot) return [];
  // Arcade is centered (tx:34/36) — go directly, no need to go east first
  return _cConcatRoutes(
    [_cWP(27, 14)],
    [_cWP(spot.tx, 14)],
    [_cWP(spot.tx, spot.ty)]
  );
}

function _routeDinerArcadeToExit(arcadeIdx) {
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!spot) return [];
  // From arcade center, go east to exit corridor then south
  return _cConcatRoutes(
    [_cWP(spot.tx, 14)],
    [_cWP(44, 14)],
    [_cWP(44, DINER_SPOTS.customerExit.ty)]
  );
}

// ===================== ROUTE INTENT SYSTEM =====================

function _buildDinerRouteFromIntent(intent, corridorTX) {
  if (!intent) return null;
  switch (intent.kind) {
    case 'entrance_to_booth': return _routeDinerEntranceToBooth(intent.boothId);
    case 'booth_to_seat': return _routeDinerBoothToSeat(intent.boothId, intent.seatIdx);
    case 'seat_to_exit': return _routeDinerSeatToExit(intent.boothId, intent.seatIdx, corridorTX);
    case 'tile_to_exit': return _routeDinerToExit(intent.tx, intent.ty, corridorTX);
    case 'entrance_to_arcade': return _routeDinerEntranceToArcade(intent.arcadeIdx);
    case 'arcade_to_exit': return _routeDinerArcadeToExit(intent.arcadeIdx);
    case 'pass_to_booth': return _routePassToBooth(intent.boothId);
    case 'booth_to_pass': return _routeBoothToPass(intent.boothId);
    default: return null;
  }
}

function _getDinerIntentAnchor(intent, npc) {
  if (!intent) return null;
  switch (intent.kind) {
    case 'entrance_to_booth':
    case 'entrance_to_arcade':
      return DINER_SPOTS.entrance;
    case 'booth_to_seat': {
      const booth = DINER_BOOTHS[intent.boothId];
      return booth ? booth.entry : null;
    }
    case 'seat_to_exit': {
      const booth = DINER_BOOTHS[intent.boothId];
      return booth && booth.seats ? booth.seats[intent.seatIdx] : null;
    }
    case 'pass_to_booth':
    case 'booth_to_pass':
      return DINER_SPOTS.counterWait;
    case 'arcade_to_exit': {
      const spot = DINER_ARCADE_SPOTS[intent.arcadeIdx];
      return spot || null;
    }
    case 'tile_to_exit':
      return { tx: intent.tx, ty: intent.ty };
    default:
      return npc && npc.route && npc.route.length ? { tx: npc.route[0].tx, ty: npc.route[0].ty } : null;
  }
}

function _recoverDinerNPC(npc) {
  return _cRecoverNPC(npc, {
    buildRouteFromIntent: (intent, cx) => _buildDinerRouteFromIntent(intent, cx),
    getIntentAnchor: (intent, npc) => _getDinerIntentAnchor(intent, npc),
    kitchenCheck: _isDinerKitchenZone,
    kitchenSafe: { tx: 26, ty: 16 },
    routeToExit: (tx, ty, cx) => _routeDinerToExit(tx, ty, cx),
    getPartyCX: (npc) => { const p = _getDinerParty(npc.partyId); return p ? p.corridorTX : undefined; },
  });
}

// ===================== MOVEMENT =====================

const _dinerMoveSkipStates = new Set(['eating', 'waiting_at_booth', 'arcade_playing', '_despawn', 'taking_order', 'submitting_ticket', 'serving', 'gamer_playing']);

function moveDinerNPC(npc) {
  _cMoveNPC(npc, {
    npcList: dinerNPCs,
    skipStates: _dinerMoveSkipStates,
    kitchenCheck: _isDinerKitchenZone,
    kitchenSafe: { tx: 26, ty: 16 },
    kitchenFallback: [{ tx: 27, ty: 16 }, { tx: 27, ty: 21 }],
    laneMode: 'always',
    selfAvoidSkip: (npc) => npc.isWaitress,
  });
}

// ===================== SPAWN =====================

// Spawn a group NPC at the LEFT entrance door
function _spawnDinerGroupNPC(partyId, isLeader, extraOverrides) {
  const npc = _cCreateNPC(_dinerIdCounter, DINER_SPOTS.entrance, DINER_NPC_APPEARANCES, DINER_NPC_NAMES, DINER_NPC_CONFIG, {
    partyId: partyId,
    isLeader: isLeader,
    claimedSeatIdx: -1,
    _claimedArcadeIdx: -1,
    _recipeIngredients: null,
    _laneOffX: (Math.random() - 0.5) * 32,
    _laneOffY: (Math.random() - 0.5) * 32,
    _recoveryTried: false,
    _routeIntent: null,
    isDinerNPC: true,
    isWaitress: false,
    _role: 'customer',
    ...(extraOverrides || {}),
  });
  dinerNPCs.push(npc);
  return npc;
}

// Spawn a gamer NPC at the LEFT entrance door
function _spawnDinerGamerNPC() {
  const arcadeIdx = _findFreeArcadeSpot();
  if (arcadeIdx < 0) return null;

  const partyId = ++_dinerPartyId;
  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    boothId: -1,
    tableNumber: 0,
    corridorTX: 27,
    state: 'entering',
    _isGamer: true,
  };

  const npc = _cCreateNPC(_dinerIdCounter, DINER_SPOTS.entrance, DINER_NPC_APPEARANCES, ['Gamer'], DINER_NPC_CONFIG, {
    partyId: partyId,
    isLeader: true,
    claimedSeatIdx: -1,
    _claimedArcadeIdx: arcadeIdx,
    _recipeIngredients: null,
    _laneOffX: (Math.random() - 0.5) * 32,
    _laneOffY: (Math.random() - 0.5) * 32,
    _recoveryTried: false,
    _routeIntent: null,
    isDinerNPC: true,
    isWaitress: false,
    _role: 'gamer',
    name: 'Gamer',
    _arcadeFeePaid: false,
    _arcadePlaysTotal: 0,
  });

  DINER_ARCADE_SPOTS[arcadeIdx].claimedBy = npc.id;
  party.members.push(npc.id);
  party.leaderId = npc.id;
  npc.state = 'gamer_entering';
  dinerNPCs.push(npc);
  dinerParties.push(party);
  return party;
}

// ===================== WAITRESS =====================

function _spawnDinerWaitress() {
  const npc = _cCreateNPC(_dinerIdCounter, DINER_SPOTS.counterWait, DINER_NPC_APPEARANCES, ['Waitress'], DINER_NPC_CONFIG, {
    partyId: -1,
    isLeader: false,
    claimedSeatIdx: -1,
    _claimedArcadeIdx: -1,
    _recipeIngredients: null,
    _laneOffX: 0,
    _laneOffY: 0,
    _recoveryTried: false,
    _routeIntent: null,
    isDinerNPC: true,
    isWaitress: true,
    _role: 'waitress',
    // Distinct appearance — apron-colored shirt
    skin: '#f0c8a0',
    hair: '#8a5030',
    shirt: '#f0c8c8',
    pants: '#3a3a50',
    name: 'Waitress',
  });
  npc.speed = 1.54; // faster than customers
  npc.state = 'idle';
  npc.dir = 0; // face south
  npc.moving = false;
  // Waitress state tracking
  npc._targetBoothId = -1;
  npc._targetPartyId = -1;
  dinerNPCs.push(npc);
  return npc;
}

// Find the oldest pending serve entry (completed tray on counter)
function _waitressFindNextServe() {
  if (_dinerPendingServe.length === 0) return null;
  return _dinerPendingServe[0];
}

function _updateDinerWaitress() {
  if (!_dinerWaitress) return;
  const w = _dinerWaitress;

  // Handle walking state — move along route
  if (w.state === 'walking') {
    moveDinerNPC(w);
    if (!w.route || w.route.length === 0) {
      w.state = w._nextState || 'idle';
      w.stateTimer = w._nextTimer || 0;
      w.moving = false;
    }
    return;
  }

  switch (w.state) {
    case 'idle': {
      // Snap to counter wait spot (under kitchen door, facing south)
      w.moving = false;
      w.dir = 0; // face south
      w.x = DINER_SPOTS.counterWait.tx * TILE + TILE / 2;
      w.y = DINER_SPOTS.counterWait.ty * TILE + TILE / 2;

      // Check if there's a completed tray to deliver
      const serve = _waitressFindNextServe();
      if (serve) {
        w._targetBoothId = serve.boothId;
        w._targetPartyId = serve.partyId;
        w.hasFood = true;
        w._recipeIngredients = serve.recipeIngredients || null;
        _dinerPendingServe.shift(); // remove from queue

        // Update TV queue — mark as delivered
        const tvIdx = _dinerTVQueue.findIndex(e => e.partyId === serve.partyId && (e.status === 'pending' || e.status === 'ready'));
        if (tvIdx >= 0) {
          _dinerTVQueue[tvIdx].status = 'delivered';
          _dinerTVQueue[tvIdx]._removeTimer = 300; // remove after 5 seconds
        }

        // Route from counter to booth
        const route = _routeCounterToBooth(serve.boothId);
        _cStartRoute(w, route, 'serving', DINER_NPC_CONFIG.waitressServeDuration, { kind: 'pass_to_booth', boothId: serve.boothId });
      }
      break;
    }

    case 'serving': {
      // At booth, serving food to party
      w.moving = false;
      const booth = DINER_BOOTHS[w._targetBoothId];
      if (booth) {
        w.x = booth.entry.tx * TILE + TILE / 2;
        w.y = booth.entry.ty * TILE + TILE / 2;
        w.dir = 1; // face into booth
      }
      if (w.stateTimer > 0) { w.stateTimer--; return; }

      // Set all party members to eating
      const party = _getDinerParty(w._targetPartyId);
      if (party) {
        const members = _getPartyMembers(party);
        for (const m of members) {
          if (m.isWaitress) continue;
          if (m.state === 'waiting_at_booth') {
            m.state = 'eating';
            m.stateTimer = _cRandRange(DINER_NPC_CONFIG.eatDuration[0], DINER_NPC_CONFIG.eatDuration[1]);
            m.hasFood = true;
            m._recipeIngredients = w._recipeIngredients;
          }
        }

        // Tip based on delivery speed
        const leader = _getPartyLeader(party);
        const customerTipMult = leader && leader._customerTipMult ? leader._customerTipMult : 1.0;
        const baseTip = Math.round((5 + Math.random() * 10) * customerTipMult);
        if (baseTip > 0 && typeof gold !== 'undefined') {
          gold += baseTip;
          if (typeof cookingState !== 'undefined') {
            cookingState.stats.totalTips += baseTip;
          }
          if (typeof hitEffects !== 'undefined' && booth) {
            hitEffects.push({
              x: (booth.tx + 2.5) * TILE, y: booth.ty * TILE,
              life: 35, maxLife: 35, type: "heal", dmg: "+$" + baseTip + " tip!"
            });
          }
        }

        // Clear active group if this is the active group
        if (_dinerActiveGroup && _dinerActiveGroup.id === party.id) {
          _dinerActiveGroup = null;
        }
      }

      // Waitress drops food, walks back to counter
      w.hasFood = false;
      w._recipeIngredients = null;
      const servedBoothId = w._targetBoothId;
      const routeBack = _routeBoothToCounter(servedBoothId);
      w._targetBoothId = -1;
      w._targetPartyId = -1;
      _cStartRoute(w, routeBack, 'idle', 0, { kind: 'booth_to_pass', boothId: servedBoothId });
      break;
    }

    default:
      // Unknown state — reset to idle
      w.state = 'idle';
      break;
  }
}

// ===================== GROUP ORDER SYSTEM =====================

// Try to activate the next group's order if no active order and a group is waiting
function _tryActivateNextGroupOrder() {
  if (_dinerActiveGroup) return; // already have an active order
  if (_dinerGroupQueue.length === 0) return;

  // Check that there's no current active order in the cooking system for the diner
  if (typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') {
    // If there's already a current order with diner tags, wait
    if (cookingState.currentOrder && cookingState.currentOrder._dinerPartyId != null) return;
    // If there are diner-tagged tickets in the queue, wait
    const hasDinerTicket = cookingState.ticketQueue.some(t => t._dinerPartyId != null);
    if (hasDinerTicket) return;
  }

  const party = _dinerGroupQueue.shift();
  if (!party) return;

  // Verify the party still exists and is seated
  const liveParty = _getDinerParty(party.id);
  if (!liveParty || liveParty.state === 'leaving' || liveParty.state === 'done') return;

  _dinerActiveGroup = liveParty;

  // Generate a multi-item ticket: N items where N = group size
  const groupSize = liveParty.members.length;
  if (typeof _pickActiveRecipe === 'function' && typeof cookingState !== 'undefined') {
    const recipe = _pickActiveRecipe();
    if (!recipe) return;

    const customerType = typeof pickDinerCustomerType === 'function' ? pickDinerCustomerType() : { patience: 1.0 };
    const moodThresholds = typeof MOOD_STAGES !== 'undefined'
      ? MOOD_STAGES.map(s => Math.round(s.baseFrames * customerType.patience))
      : [1800, 3600, 5400];

    // 30-second service timer per part
    const timerType = { id: 'standard', duration: 1800 };

    // Create N copies of the same recipe (one per group member)
    const ticketItems = [];
    for (let i = 0; i < groupSize; i++) {
      ticketItems.push({ recipe: _pickActiveRecipe() || recipe, qty: 1 });
    }

    // Compute per-ingredient pay for deli-style if needed
    if (cookingState.activeRestaurantId === 'street_deli' && typeof _calcDeliPay === 'function') {
      for (const item of ticketItems) {
        item.recipe = Object.assign({}, item.recipe, { basePay: _calcDeliPay(item.recipe) });
      }
    }

    const ticket = {
      ticketItems: ticketItems,
      customer: customerType,
      moodThresholds: moodThresholds,
      timerType: timerType,
      _dinerBoothId: liveParty.boothId,
      _dinerPartyId: liveParty.id,
      _dinerTableNumber: DINER_BOOTHS[liveParty.boothId] ? DINER_BOOTHS[liveParty.boothId].tableNumber : 0,
    };

    cookingState.ticketQueue.push(ticket);

    // Add to TV queue
    const tableNum = DINER_BOOTHS[liveParty.boothId] ? DINER_BOOTHS[liveParty.boothId].tableNumber : 0;
    _dinerTVQueue.push({
      name: 'Table ' + tableNum,
      tableNumber: tableNum,
      status: 'pending',
      partyId: liveParty.id,
    });
  }
}

// ===================== SPAWN GROUP =====================

function spawnDinerGroup() {
  const partySize = _cRandRange(2, 6);
  // Need a booth with enough capacity — seats go up to 4, but groups up to 6
  // For groups > 4, they still use a 4-seat booth (some stand)
  const boothIdx = _findFreeBooth(Math.min(partySize, 4));
  if (boothIdx < 0) return null;

  const partyId = ++_dinerPartyId;
  const booth = DINER_BOOTHS[boothIdx];
  booth.claimedBy = partyId;

  const corridorTX = _cRandRange(26, 29);

  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    boothId: boothIdx,
    tableNumber: booth.tableNumber,
    corridorTX: corridorTX,
    state: 'entering',
    _isGamer: false,
  };

  // Create NPCs — first is leader
  const partyCustomerType = typeof pickDinerCustomerType === 'function' ? pickDinerCustomerType() : { tipMult: 1.0 };
  for (let i = 0; i < partySize; i++) {
    const npc = _spawnDinerGroupNPC(partyId, i === 0);
    npc._customerTipMult = partyCustomerType.tipMult || 1.0;
    party.members.push(npc.id);
    if (i === 0) party.leaderId = npc.id;

    // Assign seat (wrap around if more NPCs than seats)
    npc.claimedSeatIdx = i < booth.seats.length ? i : i % booth.seats.length;

    // Stagger entry — followers enter a bit behind the leader
    if (i > 0) {
      npc.state = 'spawn_wait';
      npc.stateTimer = i * 40; // ~0.67 sec stagger
    }
  }

  dinerParties.push(party);

  // Add to group queue for order processing
  _dinerGroupQueue.push(party);

  return party;
}

// ===================== INIT =====================

function initDinerNPCs() {
  dinerNPCs.length = 0;
  dinerParties.length = 0;
  _dinerIdCounter.value = 0;
  _dinerPartyId = 0;
  _dinerSpawnState.timer = 0;
  _dinerSpawnState.nextInterval = _cRandRange(120, 300);
  _dinerGamerSpawnState.timer = 0;
  _dinerGamerSpawnState.nextInterval = _cRandRange(DINER_NPC_CONFIG.gamerSpawnInterval[0], DINER_NPC_CONFIG.gamerSpawnInterval[1]);
  _dinerPendingServe = [];
  _dinerTVQueue = [];
  _dinerGroupQueue = [];
  _dinerActiveGroup = null;
  _dinerWaitress = null;
  // Reset booths
  for (const b of DINER_BOOTHS) b.claimedBy = null;
  // Reset arcade spots
  for (const a of DINER_ARCADE_SPOTS) a.claimedBy = null;
  // Spawn waitress
  _dinerWaitress = _spawnDinerWaitress();
}

// ===================== AI STATE HANDLERS =====================

const DINER_NPC_AI = {

  // ─── SPAWN_WAIT: Staggered delay before entering ───────
  spawn_wait: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    npc.state = 'entering';
  },

  // ─── ENTERING: Group NPC walks from entrance to booth ────
  entering: (npc) => {
    if (npc.isWaitress) return;
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeDinerEntranceToBooth(party.boothId);
    _cStartRoute(npc, route, 'seating', 0, { kind: 'entrance_to_booth', boothId: party.boothId });
  },

  // ─── SEATING: Walk to individual seat in booth ─────────
  seating: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeDinerBoothToSeat(party.boothId, npc.claimedSeatIdx);
    if (!route.length) { npc.state = '_despawn'; return; }

    _cStartRoute(
      npc,
      route,
      'waiting_at_booth',
      0,
      { kind: 'booth_to_seat', boothId: party.boothId, seatIdx: npc.claimedSeatIdx }
    );
  },

  // ─── WAITING_AT_BOOTH: Seated, waiting for food delivery ─────
  waiting_at_booth: (npc) => {
    npc.moving = false;
    npc._idleTime = (npc._idleTime || 0) + 1;
    // Snap to seat
    const party = _getDinerParty(npc.partyId);
    if (party) {
      const booth = DINER_BOOTHS[party.boothId];
      if (booth && booth.seats[npc.claimedSeatIdx]) {
        const seat = booth.seats[npc.claimedSeatIdx];
        npc.dir = seat.sitDir;
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
      }
    }

    // Patience timeout — 120 sec max waiting at booth
    if (npc._idleTime >= 7200) {
      if (party) _triggerPartyLeave(party);
      else _cStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
    }
  },

  // ─── EATING: Sitting in booth, eating food ─────────────
  eating: (npc) => {
    npc.moving = false;
    // Snap to seat
    const party = _getDinerParty(npc.partyId);
    if (party) {
      const booth = DINER_BOOTHS[party.boothId];
      if (booth && booth.seats[npc.claimedSeatIdx]) {
        const seat = booth.seats[npc.claimedSeatIdx];
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
        npc.dir = seat.sitDir;
      }
    }
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Done eating
    npc.hasFood = false;
    npc._recipeIngredients = null;
    npc.state = 'post_meal';
  },

  // ─── POST_MEAL: Wait for all to finish, then leave ─────
  post_meal: (npc) => {
    npc.moving = false;
    const party = _getDinerParty(npc.partyId);
    if (!party) {
      _cStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
      return;
    }

    // Wait for all party members to finish eating
    const members = _getPartyMembers(party);
    const allDone = members.every(m => m.isWaitress || m.state === 'post_meal' ||
                                        m.state === 'leaving' || m.state === '_despawn');
    if (!allDone) return;

    // Only the leader triggers exit for the whole party
    if (!npc.isLeader) return;

    _triggerPartyLeave(party);
  },

  // ─── GAMER_ENTERING: Gamer NPC walks from entrance to arcade ─
  gamer_entering: (npc) => {
    if (npc._claimedArcadeIdx < 0) {
      npc.state = '_despawn';
      return;
    }
    const route = _routeDinerEntranceToArcade(npc._claimedArcadeIdx);
    _cStartRoute(
      npc,
      route,
      'gamer_playing',
      _cRandRange(DINER_NPC_CONFIG.gamerPlayDuration[0], DINER_NPC_CONFIG.gamerPlayDuration[1]),
      { kind: 'entrance_to_arcade', arcadeIdx: npc._claimedArcadeIdx }
    );
  },

  // ─── GAMER_PLAYING: Idle at arcade cabinet ──────────────
  gamer_playing: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face arcade (north)
    if (npc._claimedArcadeIdx >= 0) {
      const spot = DINER_ARCADE_SPOTS[npc._claimedArcadeIdx];
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }

    // Pay arcade fee on first frame of each play session
    if (!npc._arcadeFeePaid) {
      npc._arcadeFeePaid = true;
      npc._arcadePlaysTotal = (npc._arcadePlaysTotal || 0) + 1;
      if (typeof gold !== 'undefined') {
        gold += DINER_NPC_CONFIG.gamerFee;
      }
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: npc.x, y: npc.y - 30, life: 30, maxLife: 30,
          type: "heal", dmg: "+" + DINER_NPC_CONFIG.gamerFee + " gold"
        });
      }
    }

    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Game finished — 50% win chance
    const won = Math.random() < 0.5;
    const playsLeft = DINER_NPC_CONFIG.gamerMaxPlays - (npc._arcadePlaysTotal || 1);

    if (won && playsLeft > 0) {
      // Won — wants to play again? 50% chance
      if (Math.random() < 0.5) {
        // Replay
        npc._arcadeFeePaid = false;
        npc.stateTimer = _cRandRange(DINER_NPC_CONFIG.gamerPlayDuration[0], DINER_NPC_CONFIG.gamerPlayDuration[1]);
        return;
      }
    } else if (!won && playsLeft > 0) {
      // Lost — 50% chance to leave, 50% chance to retry
      if (Math.random() < 0.5) {
        // Retry
        npc._arcadeFeePaid = false;
        npc.stateTimer = _cRandRange(DINER_NPC_CONFIG.gamerPlayDuration[0], DINER_NPC_CONFIG.gamerPlayDuration[1]);
        return;
      }
    }

    // Done — release spot and leave
    if (npc._claimedArcadeIdx >= 0) {
      DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
      npc._claimedArcadeIdx = -1;
    }

    const curTX = Math.floor(npc.x / TILE);
    const curTY = Math.floor(npc.y / TILE);
    _cStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
  },

  // ─── LEAVING: Walking to exit ──────────────────────────
  leaving: (npc) => {
    // Route already set by _triggerPartyLeave
    if (npc.route && npc.route.length > 0) return;
    npc.state = '_despawn';
  },

  // ─── WALKING: Follow route, then transition ────────────
  walking: (npc) => {
    if (npc.route && npc.route.length > 0) return;
    npc.state = npc._nextState || '_despawn';
    npc.stateTimer = npc._nextTimer || 0;
  },

  // ─── DESPAWN WALK: Walking to exit then despawn ────────
  _despawn_walk: (npc) => {
    if (npc.route && npc.route.length > 0) {
      moveDinerNPC(npc);
      return;
    }
    npc.state = '_despawn';
  },

  // ─── Waitress states are handled in _updateDinerWaitress ─
  idle: (npc) => { /* handled by _updateDinerWaitress */ },
  taking_order: (npc) => { /* handled by _updateDinerWaitress */ },
  submitting_ticket: (npc) => { /* handled by _updateDinerWaitress */ },
  serving: (npc) => { /* handled by _updateDinerWaitress */ },
};

// ===================== PARTY HELPERS =====================

function _buildDinerExitPlan(npc) {
  const party = _getDinerParty(npc.partyId);
  const cx = party ? party.corridorTX : undefined;
  if (party && npc.claimedSeatIdx >= 0 &&
      (npc.state === 'waiting_at_booth' || npc.state === 'eating' ||
       npc.state === 'post_meal')) {
    return {
      route: _routeDinerSeatToExit(party.boothId, npc.claimedSeatIdx, cx),
      intent: { kind: 'seat_to_exit', boothId: party.boothId, seatIdx: npc.claimedSeatIdx },
    };
  }

  const curTX = Math.floor(npc.x / TILE);
  const curTY = Math.floor(npc.y / TILE);
  return {
    route: _routeDinerToExit(curTX, curTY, cx),
    intent: { kind: 'tile_to_exit', tx: curTX, ty: curTY },
  };
}

// Trigger the whole party to leave (walk to exit -> despawn)
function _triggerPartyLeave(party) {
  const booth = DINER_BOOTHS[party.boothId];
  const members = _getPartyMembers(party);

  for (const m of members) {
    if (m.isWaitress) continue;
    if (m.state === '_despawn' || m.state === '_despawn_walk') continue;
    // Release arcade spot if claimed
    if (m._claimedArcadeIdx >= 0) {
      DINER_ARCADE_SPOTS[m._claimedArcadeIdx].claimedBy = null;
      m._claimedArcadeIdx = -1;
    }
    m.hasFood = false;
    m._recipeIngredients = null;
    m.linkedOrderId = null;

    const exitPlan = _buildDinerExitPlan(m);
    _cStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Release booth
  if (booth) booth.claimedBy = null;
  party.state = 'leaving';

  // Clear from group queue if still queued
  const qIdx = _dinerGroupQueue.indexOf(party);
  if (qIdx >= 0) _dinerGroupQueue.splice(qIdx, 1);

  // Clear active group reference if this was the active group
  if (_dinerActiveGroup && _dinerActiveGroup.id === party.id) {
    _dinerActiveGroup = null;
  }
}

// ===================== TV QUEUE MANAGEMENT =====================

function _updateDinerTVQueue() {
  // Tick removal timers on delivered entries
  for (let i = _dinerTVQueue.length - 1; i >= 0; i--) {
    const entry = _dinerTVQueue[i];
    if (entry.status === 'delivered' && entry._removeTimer != null) {
      entry._removeTimer--;
      if (entry._removeTimer <= 0) {
        _dinerTVQueue.splice(i, 1);
      }
    }
  }
}

// ===================== MAIN UPDATE =====================
function updateDinerNPCs() {
  // Update waitress BEFORE the main NPC loop
  _updateDinerWaitress();

  // Try to activate the next group order
  _tryActivateNextGroupOrder();

  // Update TV queue timers
  _updateDinerTVQueue();

  // Gamer spawn timer (independent of group spawns)
  if (typeof Scene !== 'undefined' && Scene.inCooking &&
      typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') {
    _dinerGamerSpawnState.timer++;
    if (_dinerGamerSpawnState.timer >= _dinerGamerSpawnState.nextInterval) {
      _dinerGamerSpawnState.timer = 0;
      _dinerGamerSpawnState.nextInterval = _cRandRange(DINER_NPC_CONFIG.gamerSpawnInterval[0], DINER_NPC_CONFIG.gamerSpawnInterval[1]);
      // Only spawn if there's a free arcade spot
      if (_findFreeArcadeSpot() >= 0) {
        _spawnDinerGamerNPC();
      }
    }
  }

  _cUpdateNPCLoop({
    restaurantId: 'diner',
    spawnState: _dinerSpawnState,
    spawnInterval: DINER_NPC_CONFIG.spawnInterval,
    canSpawn: () => {
      const activeParties = dinerParties.filter(p => p.state !== 'done' && !p._isGamer).length;
      return activeParties < DINER_NPC_CONFIG.maxParties && _findFreeBooth(2) >= 0;
    },
    doSpawn: spawnDinerGroup,
    npcList: dinerNPCs,
    stateHandlers: DINER_NPC_AI,
    moveFn: moveDinerNPC,
    exemptIdleStates: new Set(['eating', 'waiting_at_booth', 'post_meal', 'gamer_playing', 'idle', 'taking_order', 'submitting_ticket', 'serving']),
    onIdleTimeout: (npc) => {
      if (npc.isWaitress) return; // never despawn waitress
      npc._idleTime = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
    },
    onStuckTimeout: (npc) => {
      if (npc.isWaitress) {
        // Waitress stuck — teleport back to counter wait and reset to idle
        npc.x = DINER_SPOTS.counterWait.tx * TILE + TILE / 2;
        npc.y = DINER_SPOTS.counterWait.ty * TILE + TILE / 2;
        npc.state = 'idle';
        npc._stuckFrames = 0;
        npc.route = null;
        npc.moving = false;
        npc._targetBoothId = -1;
        npc._targetPartyId = -1;
        npc.hasFood = false;
        npc._recipeIngredients = null;
        return;
      }
      npc._stuckFrames = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      if (!_recoverDinerNPC(npc)) {
        if (_isDinerKitchenZone(npc.x, npc.y)) {
          npc.x = 26 * TILE + TILE / 2;
          npc.y = 16 * TILE + TILE / 2;
        }
        const curTX = Math.floor(npc.x / TILE);
        const curTY = Math.floor(npc.y / TILE);
        _cStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
      }
    },
    onDespawn: (npc, i) => {
      if (npc.isWaitress) return; // NEVER despawn the waitress
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      npc.hasFood = false;
      npc._recipeIngredients = null;
      dinerNPCs.splice(i, 1);
    },
    postLoop: () => {
      _cCleanupParties(dinerParties, dinerNPCs, (party) => {
        const booth = DINER_BOOTHS[party.boothId];
        if (booth && booth.claimedBy === party.id) booth.claimedBy = null;
        // Remove pending serve entries for this party
        if (typeof _dinerPendingServe !== 'undefined') {
          for (let i = _dinerPendingServe.length - 1; i >= 0; i--) {
            if (_dinerPendingServe[i].partyId === party.id) {
              _dinerPendingServe.splice(i, 1);
            }
          }
        }
        // Remove from group queue if still there
        const qIdx = _dinerGroupQueue.indexOf(party);
        if (qIdx >= 0) _dinerGroupQueue.splice(qIdx, 1);
        // Clear active group if this was it
        if (_dinerActiveGroup && _dinerActiveGroup.id === party.id) {
          _dinerActiveGroup = null;
        }
        // Remove TV queue entries for this party
        for (let i = _dinerTVQueue.length - 1; i >= 0; i--) {
          if (_dinerTVQueue[i].partyId === party.id) {
            _dinerTVQueue.splice(i, 1);
          }
        }
        // Reset waitress if she's serving this party
        if (_dinerWaitress && (_dinerWaitress._targetPartyId === party.id)) {
          _dinerWaitress.state = 'idle';
          _dinerWaitress._targetBoothId = -1;
          _dinerWaitress._targetPartyId = -1;
          _dinerWaitress.hasFood = false;
          _dinerWaitress._recipeIngredients = null;
        }
      });
    },
  });
}
