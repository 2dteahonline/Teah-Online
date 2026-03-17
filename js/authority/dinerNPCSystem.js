// ===================== DINER NPC SYSTEM =====================
// Party-based customer NPCs for the diner restaurant.
// NPCs arrive in groups of 1-3, share a booth. A persistent waitress
// takes orders at booths, submits tickets, and serves completed plates.
// 20% of spawns are arcade-only visitors (no booth, no food).
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
  exit:        { tx: 27, ty: 21 },
  customerExit: { tx: 45, ty: 21 },
  passWindow:  { tx: 23, ty: 14 },
  counterWait: { tx: 12, ty: 16 }, // waitress idle spot — dining side, south of pickup counter
};

// ===================== BOOTHS =====================
// 6 booths in dining area (right side)
// 3 left column (tx: 27-32), 3 right column (tx: 38-43)
const DINER_BOOTHS = [
  // Left column
  { id: 0, tx: 27, ty: 2,  w: 5, h: 3, entry: { tx: 26, ty: 3 }, topRowAccess: { tx: 26, ty: 2 }, bottomRowAccess: { tx: 26, ty: 4 }, seats: [{ tx: 28, ty: 2, sitDir: 0 }, { tx: 30, ty: 2, sitDir: 0 }, { tx: 28, ty: 4, sitDir: 1 }, { tx: 30, ty: 4, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 1, tx: 27, ty: 6,  w: 5, h: 3, entry: { tx: 26, ty: 7 }, topRowAccess: { tx: 26, ty: 6 }, bottomRowAccess: { tx: 26, ty: 8 }, seats: [{ tx: 28, ty: 6, sitDir: 0 }, { tx: 30, ty: 6, sitDir: 0 }, { tx: 28, ty: 8, sitDir: 1 }, { tx: 30, ty: 8, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 2, tx: 27, ty: 10, w: 5, h: 3, entry: { tx: 26, ty: 11 }, topRowAccess: { tx: 26, ty: 10 }, bottomRowAccess: { tx: 26, ty: 12 }, seats: [{ tx: 28, ty: 10, sitDir: 0 }, { tx: 30, ty: 10, sitDir: 0 }, { tx: 28, ty: 12, sitDir: 1 }, { tx: 30, ty: 12, sitDir: 1 }], capacity: 4, claimedBy: null },
  // Right column
  { id: 3, tx: 38, ty: 2,  w: 5, h: 3, entry: { tx: 36, ty: 3 }, topRowAccess: { tx: 36, ty: 2 }, bottomRowAccess: { tx: 36, ty: 4 }, seats: [{ tx: 39, ty: 2, sitDir: 0 }, { tx: 41, ty: 2, sitDir: 0 }, { tx: 39, ty: 4, sitDir: 1 }, { tx: 41, ty: 4, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 4, tx: 38, ty: 6,  w: 5, h: 3, entry: { tx: 36, ty: 7 }, topRowAccess: { tx: 36, ty: 6 }, bottomRowAccess: { tx: 36, ty: 8 }, seats: [{ tx: 39, ty: 6, sitDir: 0 }, { tx: 41, ty: 6, sitDir: 0 }, { tx: 39, ty: 8, sitDir: 1 }, { tx: 41, ty: 8, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 5, tx: 38, ty: 10, w: 5, h: 3, entry: { tx: 36, ty: 11 }, topRowAccess: { tx: 36, ty: 10 }, bottomRowAccess: { tx: 36, ty: 12 }, seats: [{ tx: 39, ty: 10, sitDir: 0 }, { tx: 41, ty: 10, sitDir: 0 }, { tx: 39, ty: 12, sitDir: 1 }, { tx: 41, ty: 12, sitDir: 1 }], capacity: 4, claimedBy: null },
];

// ===================== ARCADE SPOTS =====================
const DINER_ARCADE_SPOTS = [
  { tx: 44, ty: 18, claimedBy: null },
  { tx: 46, ty: 18, claimedBy: null },
];

// ===================== CONFIG =====================
const DINER_NPC_CONFIG = {
  maxParties: 5,
  spawnInterval: [300, 720],
  baseSpeed: 0.77,
  speedVariance: 0.14,
  eatDuration: [900, 1200],
  arcadeChance: 0.2,
  arcadeDuration: [300, 600],
  menuReadDuration: [180, 300],   // 3-5 sec
  arcadeOnlyChance: 0.2,         // 20% of spawns are arcade-only visitors
  arcadeOnlyDuration: [300, 600], // 5-10 sec playing
  arcadeOnlyFee: 5,              // gold given to player
  waitressTakeOrderDuration: 180, // 3 sec at booth
  waitressSubmitDuration: 30,     // brief pause at pass window
  waitressServeDuration: 30,      // brief pause when serving
};

// ===================== STATE =====================
const dinerNPCs = [];
const dinerParties = [];
const _dinerIdCounter = { value: 0 };
let _dinerPartyId = 0;
const _dinerSpawnState = { timer: 0, nextInterval: 600 };
let _dinerTableCounter = 0;

// Waitress NPC — persistent, single instance
let _dinerWaitress = null;

// Pending serve queue — orders completed by player, waiting for waitress delivery
let _dinerPendingServe = [];

// TV queue — tracks order status for diner TV display
let _dinerTVQueue = [];

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

function _routeDinerExitToBooth(boothId, corridorTX) {
  const booth = DINER_BOOTHS[boothId];
  const cx = corridorTX || 27;
  const route = [];
  route.push({ tx: cx, ty: 14 });           // north to main corridor
  if (booth.tx >= 38) {
    // Right column booth — go east through gap
    route.push({ tx: 36, ty: 14 });
    route.push({ tx: 36, ty: booth.ty + 1 });
  } else {
    // Left column booth — go to tx:26 corridor then north
    route.push({ tx: 26, ty: 14 });
    route.push({ tx: 26, ty: booth.ty + 1 });
  }
  return route;
}

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

function _routeDinerSeatToArcade(boothId, seatIdx, arcadeIdx) {
  const booth = DINER_BOOTHS[boothId];
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!booth || !spot) return [];
  return _cConcatRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    booth.entry.tx >= 36 ? [_cWP(36, 14)] : [_cWP(26, 14)],
    [_cWP(44, 14)],
    [_cWP(44, spot.ty)],
    [_cWP(spot.tx, spot.ty)]
  );
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
// Waitress idles at counterWait (tx:12, ty:16) — dining side, south of pickup counter

function _routeCounterToBooth(boothId) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  // counterWait(12,16) → east to (26,16) → north to corridor (26,14) → booth
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
  // booth entry → corridor → west to counterWait
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

// ===================== ARCADE-ONLY ROUTE BUILDERS =====================

function _routeDinerExitToArcade(arcadeIdx, corridorTX) {
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!spot) return [];
  const cx = corridorTX || 27;
  return _cConcatRoutes(
    [_cWP(cx, 14)],
    [_cWP(44, 14)],
    [_cWP(44, spot.ty)],
    [_cWP(spot.tx, spot.ty)]
  );
}

function _routeDinerArcadeToExit(arcadeIdx, corridorTX) {
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!spot) return [];
  return _cConcatRoutes(
    [_cWP(44, spot.ty)],
    [_cWP(44, DINER_SPOTS.customerExit.ty)]
  );
}

// ===================== ROUTE INTENT SYSTEM =====================

function _buildDinerRouteFromIntent(intent, corridorTX) {
  if (!intent) return null;
  const cx = corridorTX;
  switch (intent.kind) {
    case 'exit_to_booth': return _routeDinerExitToBooth(intent.boothId, cx);
    case 'booth_to_seat': return _routeDinerBoothToSeat(intent.boothId, intent.seatIdx);
    case 'seat_to_arcade': return _routeDinerSeatToArcade(intent.boothId, intent.seatIdx, intent.arcadeIdx);
    case 'seat_to_exit': return _routeDinerSeatToExit(intent.boothId, intent.seatIdx, cx);
    case 'tile_to_exit': return _routeDinerToExit(intent.tx, intent.ty, cx);
    case 'exit_to_arcade': return _routeDinerExitToArcade(intent.arcadeIdx, cx);
    case 'arcade_to_exit': return _routeDinerArcadeToExit(intent.arcadeIdx, cx);
    case 'pass_to_booth': return _routePassToBooth(intent.boothId);
    case 'booth_to_pass': return _routeBoothToPass(intent.boothId);
    default: return null;
  }
}

function _getDinerIntentAnchor(intent, npc) {
  if (!intent) return null;
  switch (intent.kind) {
    case 'exit_to_booth':
    case 'exit_to_arcade':
      return DINER_SPOTS.exit;
    case 'booth_to_seat': {
      const booth = DINER_BOOTHS[intent.boothId];
      return booth ? booth.entry : null;
    }
    case 'seat_to_arcade':
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

const _dinerMoveSkipStates = new Set(['eating', 'menu_reading', 'waiting_at_booth', 'arcade_playing', '_despawn', 'arcade_only_playing', 'taking_order', 'submitting_ticket', 'serving']);

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
function _spawnDinerNPC(partyId, isLeader, corridorTX, extraOverrides) {
  const spawnTX = corridorTX || DINER_SPOTS.exit.tx;
  const npc = _cCreateNPC(_dinerIdCounter, { tx: spawnTX, ty: DINER_SPOTS.exit.ty }, DINER_NPC_APPEARANCES, DINER_NPC_NAMES, DINER_NPC_CONFIG, {
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
    _role: 'customer', // 'customer' or 'arcade_only'
    ...(extraOverrides || {}),
  });
  dinerNPCs.push(npc);
  return npc;
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
  npc.moving = false;
  // Waitress state tracking
  npc._targetBoothId = -1;
  npc._targetPartyId = -1;
  dinerNPCs.push(npc);
  return npc;
}

// Find the oldest party that has menu_read_done and hasn't been served yet
function _waitressFindNextOrder() {
  let oldest = null;
  let oldestFrame = Infinity;
  for (const party of dinerParties) {
    if (party.state === 'leaving' || party.state === 'done') continue;
    if (!party.menu_read_done) continue;
    if (party._waitressSubmitted) continue;
    if (party._waitressTaking) continue; // already being taken
    if (party._menuDoneFrame < oldestFrame) {
      oldestFrame = party._menuDoneFrame;
      oldest = party;
    }
  }
  return oldest;
}

// Find the oldest pending serve entry
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
      // Snap to counter wait spot (dining side, south of pickup counter)
      w.moving = false;
      w.dir = 1; // face north toward counter
      w.x = DINER_SPOTS.counterWait.tx * TILE + TILE / 2;
      w.y = DINER_SPOTS.counterWait.ty * TILE + TILE / 2;

      // Priority 1: serve completed orders
      const serve = _waitressFindNextServe();
      if (serve) {
        w._targetBoothId = serve.boothId;
        w._targetPartyId = serve.partyId;
        w.hasFood = true;
        w._recipeIngredients = serve.recipeIngredients || null;
        _dinerPendingServe.shift(); // remove from queue
        // Remove from TV queue
        const tvIdx = _dinerTVQueue.findIndex(e => e.partyId === serve.partyId);
        if (tvIdx >= 0) _dinerTVQueue.splice(tvIdx, 1);
        // Route from counter to booth
        const route = _routeCounterToBooth(serve.boothId);
        _cStartRoute(w, route, 'serving', DINER_NPC_CONFIG.waitressServeDuration, { kind: 'pass_to_booth', boothId: serve.boothId });
        return;
      }

      // Priority 2: take orders from booths with menu_read_done
      const party = _waitressFindNextOrder();
      if (party) {
        party._waitressTaking = true;
        w._targetBoothId = party.boothId;
        w._targetPartyId = party.id;
        const route = _routeCounterToBooth(party.boothId);
        _cStartRoute(w, route, 'taking_order', DINER_NPC_CONFIG.waitressTakeOrderDuration, { kind: 'pass_to_booth', boothId: party.boothId });
      }
      break;
    }

    case 'taking_order': {
      // Paused at booth, taking order (180 frames = 3 sec)
      w.moving = false;
      const booth = DINER_BOOTHS[w._targetBoothId];
      if (booth) {
        w.x = booth.entry.tx * TILE + TILE / 2;
        w.y = booth.entry.ty * TILE + TILE / 2;
        // Face into the booth
        w.dir = 1; // face up toward booth interior
      }
      if (w.stateTimer > 0) { w.stateTimer--; return; }

      // Generate ticket via cookingSystem, then tag it with booth/party info
      if (typeof _generateTicket === 'function' && typeof cookingState !== 'undefined') {
        const queueLenBefore = cookingState.ticketQueue.length;
        _generateTicket();
        // Tag the newly added ticket with diner booth/party info
        if (cookingState.ticketQueue.length > queueLenBefore) {
          const newTicket = cookingState.ticketQueue[cookingState.ticketQueue.length - 1];
          newTicket._dinerBoothId = w._targetBoothId;
          newTicket._dinerPartyId = w._targetPartyId;
          const _tp = _getDinerParty(w._targetPartyId);
          if (_tp) newTicket._dinerTableNumber = _tp.tableNumber;
          const _tvParty = _getDinerParty(w._targetPartyId);
          const _tvName = _tvParty ? _getPartyMembers(_tvParty).find(m => !m.isWaitress)?.name || 'Customer' : 'Customer';
          const _tvTableNum = _tvParty ? _tvParty.tableNumber : 0;
          _dinerTVQueue.push({ name: _tvName, tableNumber: _tvTableNum, status: 'pending', partyId: w._targetPartyId });
        }
      }

      // Walk back to counter to submit
      const route = _routeBoothToCounter(w._targetBoothId);
      _cStartRoute(w, route, 'submitting_ticket', DINER_NPC_CONFIG.waitressSubmitDuration, { kind: 'booth_to_pass', boothId: w._targetBoothId });
      break;
    }

    case 'submitting_ticket': {
      // Brief pause at counter wait spot, ticket appears in HUD
      w.moving = false;
      w.x = DINER_SPOTS.counterWait.tx * TILE + TILE / 2;
      w.y = DINER_SPOTS.counterWait.ty * TILE + TILE / 2;
      w.dir = 1; // face north toward counter
      if (w.stateTimer > 0) { w.stateTimer--; return; }

      // Mark the party order as submitted
      const party = _getDinerParty(w._targetPartyId);
      if (party) {
        party._waitressSubmitted = true;
        party._waitressTaking = false;
        // Start table timer
        // Count items in the ticket queue for this party
        let itemCount = 1;
        if (typeof cookingState !== 'undefined' && cookingState.ticketQueue.length > 0) {
          const t = cookingState.ticketQueue.find(t => t._dinerPartyId === party.id);
          if (t && t.ticketItems) itemCount = t.ticketItems.length;
        }
        party._tableDuration = 2700 + (itemCount - 1) * 900; // 45s base + 15s per extra item
        party._tableTimer = 0;
        party._tableTimerActive = true;
      }
      // Safety: if party was deleted mid-service, clear targeting anyway

      // Reset and go idle
      w._targetBoothId = -1;
      w._targetPartyId = -1;
      w.state = 'idle';
      break;
    }

    case 'serving': {
      // At booth, serving food to party
      w.moving = false;
      const booth = DINER_BOOTHS[w._targetBoothId];
      if (booth) {
        w.x = booth.entry.tx * TILE + TILE / 2;
        w.y = booth.entry.ty * TILE + TILE / 2;
        w.dir = 1;
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
        // Stop table timer — food delivered
        party._tableTimerActive = false;

        // Tip based on remaining time — more time remaining = bigger tip
        if (party._tableDuration > 0) {
          const timeRemaining = Math.max(0, 1.0 - (party._tableTimer / party._tableDuration));
          // Tip chance: 70-90% if fast (>60% remaining), 30-50% if slow (<30% remaining)
          let tipChance = 0.5;
          if (timeRemaining > 0.6) tipChance = 0.7 + timeRemaining * 0.2;
          else if (timeRemaining < 0.3) tipChance = 0.3 + timeRemaining * 0.2;
          else tipChance = 0.5 + timeRemaining * 0.2;

          if (Math.random() < tipChance) {
            // Tip amount: base 5-15g scaled by time remaining and customer type
            const leader = _getPartyLeader(party);
            const customerTipMult = leader && leader._customerTipMult ? leader._customerTipMult : 1.0;
            const baseTip = Math.round((5 + timeRemaining * 10) * customerTipMult);
            if (baseTip > 0 && typeof gold !== 'undefined') {
              gold += baseTip;
              if (typeof cookingState !== 'undefined') {
                cookingState.stats.totalTips += baseTip;
              }
              // Floating gold text at booth
              if (typeof hitEffects !== 'undefined' && booth) {
                hitEffects.push({
                  x: (booth.tx + 2.5) * TILE, y: booth.ty * TILE,
                  life: 35, maxLife: 35, type: "heal", dmg: "+$" + baseTip + " tip!"
                });
              }
            }
          }
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

// ===================== SPAWN PARTY =====================

function spawnDinerParty() {
  // 20% chance: arcade-only visitor (single NPC, no booth)
  if (Math.random() < DINER_NPC_CONFIG.arcadeOnlyChance) {
    return _spawnArcadeOnlyVisitor();
  }

  const partySize = _cRandRange(1, 3);
  const boothIdx = _findFreeBooth(partySize);
  if (boothIdx < 0) return null; // no free booth

  const partyId = ++_dinerPartyId;
  const booth = DINER_BOOTHS[boothIdx];
  booth.claimedBy = partyId;

  // Each party gets a random corridor column (26-29) so they don't all walk single-file
  const corridorTX = _cRandRange(26, 29);

  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    boothId: boothIdx,
    tableNumber: ++_dinerTableCounter,
    _tableTimer: 0,
    _tableDuration: 0,
    _tableTimerActive: false,
    corridorTX: corridorTX,
    state: 'entering',
    menu_read_done: false,
    _menuDoneFrame: 0,
    _waitressSubmitted: false,
    _waitressTaking: false,
  };

  // Create NPCs — first is leader
  const partyCustomerType = pickDinerCustomerType();
  for (let i = 0; i < partySize; i++) {
    const npc = _spawnDinerNPC(partyId, i === 0, corridorTX);
    // Store customer type tip multiplier from party type
    npc._customerTipMult = partyCustomerType.tipMult || 1.0;
    party.members.push(npc.id);
    if (i === 0) party.leaderId = npc.id;

    // Assign seat in booth
    npc.claimedSeatIdx = i;

    // Stagger entry — followers enter a bit behind the leader
    if (i > 0) {
      npc.state = 'spawn_wait';
      npc.stateTimer = i * 40; // ~0.67 sec stagger
    }
  }

  dinerParties.push(party);
  return party;
}

// Spawn an arcade-only visitor (no booth, walks to arcade, plays, leaves)
function _spawnArcadeOnlyVisitor() {
  const arcadeIdx = _findFreeArcadeSpot();
  if (arcadeIdx < 0) return null; // no free arcade spot

  const partyId = ++_dinerPartyId;
  const corridorTX = _cRandRange(26, 29);

  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    boothId: -1,
    corridorTX: corridorTX,
    state: 'entering',
    menu_read_done: false,
    _menuDoneFrame: 0,
    _waitressSubmitted: false,
    _waitressTaking: false,
  };

  const npc = _spawnDinerNPC(partyId, true, corridorTX, { _role: 'arcade_only' });
  party.members.push(npc.id);
  party.leaderId = npc.id;

  DINER_ARCADE_SPOTS[arcadeIdx].claimedBy = npc.id;
  npc._claimedArcadeIdx = arcadeIdx;
  npc.name = 'Gamer';
  npc.state = 'go_arcade_only';

  dinerParties.push(party);
  return party;
}

// ===================== INIT =====================

function initDinerNPCs() {
  dinerNPCs.length = 0;
  dinerParties.length = 0;
  _dinerIdCounter.value = 0;
  _dinerPartyId = 0;
  _dinerTableCounter = 0;
  _dinerSpawnState.timer = 0;
  _dinerSpawnState.nextInterval = _cRandRange(120, 300);
  _dinerPendingServe = [];
  _dinerTVQueue = [];
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

  // ─── ENTERING: Walk from exit to booth area ────────────
  entering: (npc) => {
    if (npc.isWaitress) return; // waitress doesn't use this
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeDinerExitToBooth(party.boothId, party.corridorTX);
    _cStartRoute(npc, route, 'seating', 0, { kind: 'exit_to_booth', boothId: party.boothId });
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
      'menu_reading',
      _cRandRange(DINER_NPC_CONFIG.menuReadDuration[0], DINER_NPC_CONFIG.menuReadDuration[1]),
      { kind: 'booth_to_seat', boothId: party.boothId, seatIdx: npc.claimedSeatIdx }
    );
  },

  // ─── MENU_READING: Idle at seat, reading menu ──────────
  menu_reading: (npc) => {
    npc.moving = false;
    // Face inward based on seat direction
    const party = _getDinerParty(npc.partyId);
    if (party) {
      const booth = DINER_BOOTHS[party.boothId];
      const seat = booth.seats[npc.claimedSeatIdx];
      if (seat) {
        npc.dir = seat.sitDir;
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
      }
    }
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Menu reading done — set party-level flag for waitress
    if (party && !party.menu_read_done) {
      party.menu_read_done = true;
      party._menuDoneFrame = typeof gameFrame !== 'undefined' ? gameFrame : 0;
    }

    // All members go to waiting_at_booth
    npc.state = 'waiting_at_booth';
    npc._idleTime = 0;
  },

  // ─── WAITING_AT_BOOTH: All members wait for waitress ─────
  waiting_at_booth: (npc) => {
    npc.moving = false;
    npc._idleTime = (npc._idleTime || 0) + 1;
    // Snap to seat
    const party = _getDinerParty(npc.partyId);
    if (party) {
      const booth = DINER_BOOTHS[party.boothId];
      const seat = booth.seats[npc.claimedSeatIdx];
      if (seat) {
        npc.dir = seat.sitDir;
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
      }
    }

    // Patience timeout — 90 sec max waiting at booth
    if (npc._idleTime >= 5400) {
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
      const seat = booth.seats[npc.claimedSeatIdx];
      if (seat) {
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

  // ─── POST_MEAL: Decide post-meal behavior ─────────────
  post_meal: (npc) => {
    npc.moving = false;
    const party = _getDinerParty(npc.partyId);
    if (!party) {
      _cStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
      return;
    }

    // Wait for all party members to finish eating
    const members = _getPartyMembers(party);
    const allDone = members.every(m => m.isWaitress || m.state === 'post_meal' || m.state === 'arcade_playing' ||
                                        m.state === 'leaving' || m.state === '_despawn');
    if (!allDone) return; // wait

    // Only the leader decides for the party (prevent duplicate decisions)
    if (!npc.isLeader) return;

    // 20% chance 1-2 members go to arcade
    if (Math.random() < DINER_NPC_CONFIG.arcadeChance) {
      const arcadeCount = Math.min(_cRandRange(1, 2), members.filter(m => !m.isWaitress).length);
      const shuffled = members.filter(m => !m.isWaitress).slice().sort(() => Math.random() - 0.5);
      let sent = 0;
      for (const m of shuffled) {
        if (sent >= arcadeCount) break;
        const arcadeIdx = _findFreeArcadeSpot();
        if (arcadeIdx < 0) break;
        DINER_ARCADE_SPOTS[arcadeIdx].claimedBy = m.id;
        m._claimedArcadeIdx = arcadeIdx;
        m.state = 'go_arcade';
        sent++;
      }
    }

    // Remaining post_meal members → wait for arcade players
    for (const m of members) {
      if (m.isWaitress) continue;
      if (m.state !== 'post_meal') continue;
      m.state = 'post_meal_wait'; // wait for arcade players
    }

    // If no one went to arcade, trigger leaving
    const anyArcade = members.some(m => m.state === 'go_arcade' || m.state === 'arcade_playing');
    if (!anyArcade) {
      _triggerPartyPostMealExit(party);
    }
  },

  // ─── POST_MEAL_WAIT: Waiting at booth for arcade players ─
  post_meal_wait: (npc) => {
    npc.moving = false;
    npc._idleTime = (npc._idleTime || 0) + 1;
    // Snap to seat
    const party = _getDinerParty(npc.partyId);
    if (party) {
      const booth = DINER_BOOTHS[party.boothId];
      const seat = booth.seats[npc.claimedSeatIdx];
      if (seat) {
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
        npc.dir = seat.sitDir;
      }
    }

    // Safety: if waiting too long, just leave
    if (npc._idleTime >= 1200) {
      if (party) _triggerPartyLeave(party);
      else npc.state = '_despawn';
    }
  },

  // ─── GO_ARCADE: Walking to arcade cabinet (post-meal) ──
  go_arcade: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party || npc._claimedArcadeIdx < 0) {
      npc.state = 'post_meal_wait';
      return;
    }
    const route = _routeDinerSeatToArcade(party.boothId, npc.claimedSeatIdx, npc._claimedArcadeIdx);
    _cStartRoute(
      npc,
      route,
      'arcade_playing',
      _cRandRange(DINER_NPC_CONFIG.arcadeDuration[0], DINER_NPC_CONFIG.arcadeDuration[1]),
      { kind: 'seat_to_arcade', boothId: party.boothId, seatIdx: npc.claimedSeatIdx, arcadeIdx: npc._claimedArcadeIdx }
    );
  },

  // ─── ARCADE_PLAYING: Idle at arcade cabinet ────────────
  arcade_playing: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face arcade (north)
    if (npc._claimedArcadeIdx >= 0) {
      const spot = DINER_ARCADE_SPOTS[npc._claimedArcadeIdx];
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Done playing — release arcade spot
    if (npc._claimedArcadeIdx >= 0) {
      DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
      npc._claimedArcadeIdx = -1;
    }

    // Return to booth area, then trigger leaving check
    const party = _getDinerParty(npc.partyId);
    if (!party) {
      _cStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
      return;
    }

    npc.state = 'arcade_done';
  },

  // ─── ARCADE_DONE: Finished arcade, rejoin party ────────
  arcade_done: (npc) => {
    npc.moving = false;
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    // Check if all arcade players are done
    const members = _getPartyMembers(party);
    const anyPlaying = members.some(m => m.state === 'go_arcade' || m.state === 'arcade_playing');
    if (anyPlaying) return; // wait for others

    // All done — trigger leaving for whole party
    _triggerPartyPostMealExit(party);
  },

  // ─── GO_ARCADE_ONLY: Arcade-only visitor walks to arcade ─
  go_arcade_only: (npc) => {
    const party = _getDinerParty(npc.partyId);
    const cx = party ? party.corridorTX : 27;
    if (npc._claimedArcadeIdx < 0) {
      npc.state = '_despawn';
      return;
    }
    const route = _routeDinerExitToArcade(npc._claimedArcadeIdx, cx);
    _cStartRoute(
      npc,
      route,
      'arcade_only_playing',
      _cRandRange(DINER_NPC_CONFIG.arcadeOnlyDuration[0], DINER_NPC_CONFIG.arcadeOnlyDuration[1]),
      { kind: 'exit_to_arcade', arcadeIdx: npc._claimedArcadeIdx }
    );
  },

  // ─── ARCADE_ONLY_PLAYING: Arcade visitor playing ──────
  arcade_only_playing: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face arcade (north)
    if (npc._claimedArcadeIdx >= 0) {
      const spot = DINER_ARCADE_SPOTS[npc._claimedArcadeIdx];
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }

    // Pay arcade fee on first frame
    if (!npc._arcadeFeePaid) {
      npc._arcadeFeePaid = true;
      if (typeof gold !== 'undefined') {
        gold += DINER_NPC_CONFIG.arcadeOnlyFee;
      }
      // Gold popup
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: npc.x, y: npc.y - 30, life: 30, maxLife: 30,
          type: "heal", dmg: "+" + DINER_NPC_CONFIG.arcadeOnlyFee + " gold"
        });
      }
    }

    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Check for replay — 50% chance to play again
    if (!npc._arcadePlaysRemaining && npc._arcadePlaysRemaining !== 0) {
      npc._arcadePlaysRemaining = _cRandRange(0, 2); // 0-2 more plays
    }
    if (npc._arcadePlaysRemaining > 0) {
      npc._arcadePlaysRemaining--;
      npc._arcadeFeePaid = false; // will pay again next frame
      npc.stateTimer = _cRandRange(DINER_NPC_CONFIG.arcadeOnlyDuration[0], DINER_NPC_CONFIG.arcadeOnlyDuration[1]);
      return;
    }

    // Done — release spot and leave
    if (npc._claimedArcadeIdx >= 0) {
      DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
      npc._claimedArcadeIdx = -1;
    }

    const party = _getDinerParty(npc.partyId);
    const cx = party ? party.corridorTX : 27;
    // Walk straight to exit from current position
    const curTX = Math.floor(npc.x / TILE);
    const curTY = Math.floor(npc.y / TILE);
    _cStartRoute(npc, _routeDinerToExit(curTX, curTY, cx), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
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
      (npc.state === 'menu_reading' || npc.state === 'waiting_at_booth' ||
       npc.state === 'eating' || npc.state === 'post_meal' ||
       npc.state === 'post_meal_wait')) {
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

// Trigger the whole party to leave (walk to exit → despawn)
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
}

// Post-meal exit: all leave
function _triggerPartyPostMealExit(party) {
  const leader = _getPartyLeader(party);
  const members = _getPartyMembers(party);

  // Leader exits
  if (leader) {
    const exitPlan = _buildDinerExitPlan(leader);
    _cStartRoute(leader, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Non-leaders leave directly
  for (const m of members) {
    if (m.isWaitress) continue;
    if (m.id === party.leaderId) continue;
    if (m.state === '_despawn' || m.state === '_despawn_walk') continue;
    if (m._claimedArcadeIdx >= 0) {
      DINER_ARCADE_SPOTS[m._claimedArcadeIdx].claimedBy = null;
      m._claimedArcadeIdx = -1;
    }
    m.hasFood = false;
    m._recipeIngredients = null;
    const exitPlan = _buildDinerExitPlan(m);
    _cStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Release booth
  const booth = DINER_BOOTHS[party.boothId];
  if (booth) booth.claimedBy = null;
  party.state = 'leaving';
}

// ===================== MAIN UPDATE =====================
function updateDinerNPCs() {
  // Update waitress BEFORE the main NPC loop
  _updateDinerWaitress();

  // Update table timers for parties
  for (const party of dinerParties) {
    if (!party._tableTimerActive) continue;
    if (party.state === 'leaving' || party.state === 'done') continue;
    party._tableTimer++;
    if (party._tableTimer >= party._tableDuration) {
      // Timer expired — party leaves angry, missed order
      party._tableTimerActive = false;
      _triggerPartyLeave(party);
      // Increment missed orders
      if (typeof _incrementMissedOrders === 'function') _incrementMissedOrders();
      // Gold popup for missed order
      if (typeof hitEffects !== 'undefined') {
        const booth = DINER_BOOTHS[party.boothId];
        if (booth) {
          hitEffects.push({
            x: (booth.tx + 2.5) * TILE, y: booth.ty * TILE - 10,
            life: 40, maxLife: 40, type: "heal", dmg: "Table " + party.tableNumber + " left!"
          });
        }
      }
    }
  }

  _cUpdateNPCLoop({
    restaurantId: 'diner',
    spawnState: _dinerSpawnState,
    spawnInterval: DINER_NPC_CONFIG.spawnInterval,
    canSpawn: () => {
      const activeParties = dinerParties.filter(p => p.state !== 'done').length;
      return activeParties < DINER_NPC_CONFIG.maxParties && dinerNPCs.filter(n => !n.isWaitress).length < 8;
    },
    doSpawn: spawnDinerParty,
    npcList: dinerNPCs,
    stateHandlers: DINER_NPC_AI,
    moveFn: moveDinerNPC,
    exemptIdleStates: new Set(['eating', 'waiting_at_booth', 'post_meal_wait', 'menu_reading', 'arcade_playing', 'arcade_only_playing', 'idle', 'taking_order', 'submitting_ticket', 'serving']),
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
        // Waitress stuck — teleport back to pass window and reset to idle
        npc.x = DINER_SPOTS.passWindow.tx * TILE + TILE / 2;
        npc.y = DINER_SPOTS.passWindow.ty * TILE + TILE / 2;
        npc.state = 'idle';
        npc._stuckFrames = 0;
        npc.route = null;
        npc.moving = false;
        // Release any in-progress waitress tasks
        if (npc._targetPartyId >= 0) {
          const party = _getDinerParty(npc._targetPartyId);
          if (party) party._waitressTaking = false;
        }
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
        // Clear _waitressTaking if party had it set
        if (party._waitressTaking) party._waitressTaking = false;
        // Remove pending serve entries for this party
        if (typeof _dinerPendingServe !== 'undefined') {
          for (let i = _dinerPendingServe.length - 1; i >= 0; i--) {
            if (_dinerPendingServe[i].partyId === party.id) {
              _dinerPendingServe.splice(i, 1);
            }
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
