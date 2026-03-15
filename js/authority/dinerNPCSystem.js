// ===================== DINER NPC SYSTEM =====================
// Party-based customer NPCs for the diner restaurant.
// NPCs arrive in groups of 1-3, share a booth, leader orders at counter.
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
const DINER_NPC_NAMES = ['Customer', 'Patron', 'Guest', 'Diner', 'Regular', 'Foodie', 'Tourist', 'Local'];

// ===================== DEFINED SPOTS =====================
const DINER_SPOTS = {
  exit:        { tx: 27, ty: 21 },
  counterArea: { tx: 27, ty: 16 },
  counter:     { tx: 13, ty: 16 },
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
  { tx: 44, ty: 4, claimedBy: null },
  { tx: 46, ty: 4, claimedBy: null },
];

// ===================== CONFIG =====================
const DINER_NPC_CONFIG = {
  maxParties: 5,
  spawnInterval: [300, 720],
  baseSpeed: 1.1,
  speedVariance: 0.2,
  eatDuration: [900, 1200],
  arcadeChance: 0.2,
  arcadeDuration: [300, 600],
  menuReadDuration: [180, 300],   // 3-5 sec
};

// ===================== STATE =====================
const dinerNPCs = [];
const dinerParties = [];
const _dinerIdCounter = { value: 0 };
let _dinerPartyId = 0;
const _dinerSpawnState = { timer: 0, nextInterval: 600 };

// Counter queue — only one leader at the counter at a time
const _dinerCounterQueue = [];  // array of partyIds in order
let _dinerCounterActiveParty = null;  // partyId currently at counter

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

// ===================== COUNTER QUEUE =====================
function _dinerEnqueueCounter(partyId) {
  if (_dinerCounterActiveParty === partyId) return;
  if (_dinerCounterQueue.includes(partyId)) return;
  _dinerCounterQueue.push(partyId);
}

function _dinerDequeueCounter(partyId) {
  if (_dinerCounterActiveParty === partyId) {
    _dinerCounterActiveParty = null;
  }
  const idx = _dinerCounterQueue.indexOf(partyId);
  if (idx >= 0) _dinerCounterQueue.splice(idx, 1);
  _dinerPromoteCounter();
}

function _dinerPromoteCounter() {
  // Clear stale active party — if party is gone or leader is despawned/missing
  if (_dinerCounterActiveParty !== null) {
    const activeParty = _getDinerParty(_dinerCounterActiveParty);
    if (!activeParty || activeParty.state === 'leaving' || activeParty.state === 'done') {
      _dinerCounterActiveParty = null;
    } else {
      const leader = _getPartyLeader(activeParty);
      if (!leader || leader.state === '_despawn' || leader.state === '_despawn_walk') {
        _dinerCounterActiveParty = null;
      } else {
        return; // valid active party, nothing to promote
      }
    }
  }
  while (_dinerCounterQueue.length > 0) {
    const nextId = _dinerCounterQueue.shift();
    const party = _getDinerParty(nextId);
    if (!party || party.state === 'leaving' || party.state === 'done') continue;
    const leader = _getPartyLeader(party);
    if (!leader || leader.state === '_despawn' || leader.state === '_despawn_walk') continue;
    _dinerCounterActiveParty = nextId;
    if (leader.state === 'waiting_for_counter') {
      leader.state = 'go_order';
      leader._idleTime = 0;
    }
    return;
  }
}

function _dinerIsCounterFree(partyId) {
  return _dinerCounterActiveParty === null || _dinerCounterActiveParty === partyId;
}

function _getDinerSeatAccess(booth, seatIdx) {
  const seat = booth && booth.seats ? booth.seats[seatIdx] : null;
  if (!booth || !seat) return null;
  return {
    seat: seat,
    entry: booth.entry,
    rowAccess: seat.sitDir === 0 ? booth.topRowAccess : booth.bottomRowAccess,
  };
}

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

function _routeDinerBoothEntryToCounter(booth) {
  if (!booth) return [];
  return _cConcatRoutes(
    booth.entry.tx >= 36 ? [_cWP(36, 14)] : [_cWP(26, 14)],
    [_cWP(26, 16)],
    [_cWP(13, 16)]
  );
}

function _routeDinerCounterToBoothEntry(booth) {
  if (!booth) return [];
  return _cConcatRoutes(
    [_cWP(26, 16)],
    [_cWP(26, 14)],
    booth.entry.tx >= 36 ? [_cWP(36, 14)] : null,
    [_cWP(booth.entry.tx, booth.entry.ty)]
  );
}

function _routeDinerSeatToCounter(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  return _cConcatRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    _routeDinerBoothEntryToCounter(booth)
  );
}

function _routeDinerCounterToSeat(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  return _cConcatRoutes(
    _routeDinerCounterToBoothEntry(booth),
    _routeDinerBoothToSeat(boothId, seatIdx)
  );
}

function _routeDinerSeatToArcade(boothId, seatIdx, arcadeIdx) {
  const booth = DINER_BOOTHS[boothId];
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!booth || !spot) return [];
  return _cConcatRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    booth.entry.tx >= 36 ? [_cWP(36, 14)] : [_cWP(26, 14)],
    booth.entry.tx >= 36 ? null : [_cWP(36, 14)],
    [_cWP(36, spot.ty)],
    [_cWP(spot.tx, spot.ty)]
  );
}

function _routeDinerSeatToExit(boothId, seatIdx, corridorTX) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  const cx = corridorTX || 27;
  return _cConcatRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    booth.entry.tx >= 36 ? [_cWP(36, 14)] : [_cWP(26, 14)],
    [_cWP(cx, 14)],
    [_cWP(cx, DINER_SPOTS.exit.ty)]
  );
}

function _buildDinerRouteFromIntent(intent, corridorTX) {
  if (!intent) return null;
  const cx = corridorTX;
  switch (intent.kind) {
    case 'exit_to_booth': return _routeDinerExitToBooth(intent.boothId, cx);
    case 'booth_to_seat': return _routeDinerBoothToSeat(intent.boothId, intent.seatIdx);
    case 'seat_to_counter': return _routeDinerSeatToCounter(intent.boothId, intent.seatIdx);
    case 'counter_to_seat': return _routeDinerCounterToSeat(intent.boothId, intent.seatIdx);
    case 'seat_to_arcade': return _routeDinerSeatToArcade(intent.boothId, intent.seatIdx, intent.arcadeIdx);
    case 'seat_to_exit': return _routeDinerSeatToExit(intent.boothId, intent.seatIdx, cx);
    case 'counter_to_exit': return _routeDinerToExit(DINER_SPOTS.counter.tx, DINER_SPOTS.counter.ty, cx);
    case 'tile_to_exit': return _routeDinerToExit(intent.tx, intent.ty, cx);
    default: return null;
  }
}

function _getDinerIntentAnchor(intent, npc) {
  if (!intent) return null;
  switch (intent.kind) {
    case 'exit_to_booth':
      return DINER_SPOTS.exit;
    case 'booth_to_seat': {
      const booth = DINER_BOOTHS[intent.boothId];
      return booth ? booth.entry : null;
    }
    case 'seat_to_counter':
    case 'seat_to_arcade':
    case 'seat_to_exit': {
      const booth = DINER_BOOTHS[intent.boothId];
      return booth && booth.seats ? booth.seats[intent.seatIdx] : null;
    }
    case 'counter_to_seat':
    case 'counter_to_exit':
      return DINER_SPOTS.counter;
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

// ===================== ROUTE BUILDERS =====================
// All legs are horizontal or vertical to prevent clipping through solids.
//
// SAFE CORRIDORS in the diner:
//   ty: 14  — horizontal corridor between kitchen and dining (main walkway)
//   tx: 26  — vertical corridor between kitchen wall and booths
//   tx: 35-37 — gap between left and right booth columns
//   ty: 14  — main horizontal corridor

function _routeDinerExitToBooth(boothId, corridorTX) {
  const booth = DINER_BOOTHS[boothId];
  const cx = corridorTX || 27;
  // Exit → north to corridor → west/east to booth column → north to booth
  const route = [];
  route.push({ tx: cx, ty: 14 });           // north to main corridor
  if (booth.tx >= 38) {
    // Right column booth — go east through gap
    route.push({ tx: 36, ty: 14 });          // east to gap
    route.push({ tx: 36, ty: booth.ty + 1 }); // north to booth row
  } else {
    // Left column booth — go to tx:26 corridor then north
    route.push({ tx: 26, ty: 14 });          // west to corridor
    route.push({ tx: 26, ty: booth.ty + 1 }); // north to booth row
  }
  return route;
}

function _routeDinerToExit(fromTX, fromTY, corridorTX) {
  const cx = corridorTX || _cRandRange(26, 29);
  const route = [];
  // Get to main corridor first
  if (fromTY < 14) {
    // Above corridor — go south to corridor
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
    // Below corridor, west side — go to counter area first
    route.push({ tx: fromTX, ty: 16 });
    route.push({ tx: 26, ty: 16 });
    route.push({ tx: 26, ty: 14 });
  }
  route.push({ tx: cx, ty: 14 });    // to exit column
  route.push({ tx: cx, ty: DINER_SPOTS.exit.ty });    // south to exit
  return route;
}

const _dinerMoveSkipStates = new Set(['eating', 'menu_reading', 'waiting_at_booth', 'arcade_playing', '_despawn', 'ordering', 'waiting_food', 'waiting_for_counter']);

function moveDinerNPC(npc) {
  _cMoveNPC(npc, {
    npcList: dinerNPCs,
    skipStates: _dinerMoveSkipStates,
    kitchenCheck: _isDinerKitchenZone,
    kitchenSafe: { tx: 26, ty: 16 },
    kitchenFallback: [{ tx: 27, ty: 16 }, { tx: 27, ty: 21 }],
    laneMode: 'always',
    selfAvoidSkip: (npc) => npc.state === 'ordering' || npc.state === 'waiting_food',
  });
}

// ===================== SPAWN =====================
function _spawnDinerNPC(partyId, isLeader, corridorTX) {
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
  });
  dinerNPCs.push(npc);
  return npc;
}

// _cStartRoute provided by cookingNPCBase.js

function spawnDinerParty() {
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
    corridorTX: corridorTX,
    state: 'entering',
  };

  // Create NPCs — first is leader
  for (let i = 0; i < partySize; i++) {
    const npc = _spawnDinerNPC(partyId, i === 0, corridorTX);
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

function initDinerNPCs() {
  dinerNPCs.length = 0;
  dinerParties.length = 0;
  _dinerIdCounter.value = 0;
  _dinerPartyId = 0;
  _dinerSpawnState.timer = 0;
  _dinerSpawnState.nextInterval = _cRandRange(120, 300);
  // Reset counter queue
  _dinerCounterQueue.length = 0;
  _dinerCounterActiveParty = null;
  // Reset booths
  for (const b of DINER_BOOTHS) b.claimedBy = null;
  // Reset arcade spots
  for (const a of DINER_ARCADE_SPOTS) a.claimedBy = null;
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

    // Leader goes to order (or waits for counter), others wait
    if (npc.isLeader) {
      _dinerEnqueueCounter(npc.partyId);
      if (_dinerIsCounterFree(npc.partyId)) {
        _dinerCounterActiveParty = npc.partyId;
        const idx = _dinerCounterQueue.indexOf(npc.partyId);
        if (idx >= 0) _dinerCounterQueue.splice(idx, 1);
        npc.state = 'go_order';
      } else {
        npc.state = 'waiting_for_counter';
      }
    } else {
      npc.state = 'waiting_at_booth';
      npc._idleTime = 0;
    }
  },

  // ─── WAITING_FOR_COUNTER: Leader waits in booth for counter ─
  waiting_for_counter: (npc) => {
    npc.moving = false;
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
    // _dinerPromoteCounter() will set state to go_order when it's our turn
    // Safety timeout — 90 sec
    npc._idleTime = (npc._idleTime || 0) + 1;
    if (npc._idleTime >= 5400) {
      _dinerDequeueCounter(npc.partyId);
      if (party) _triggerPartyLeave(party);
    }
  },

  // ─── GO_ORDER: Leader walks to counter ─────────────────
  go_order: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeDinerSeatToCounter(party.boothId, npc.claimedSeatIdx);
    _cStartRoute(npc, route, 'ordering', 0, { kind: 'seat_to_counter', boothId: party.boothId, seatIdx: npc.claimedSeatIdx });
  },

  // ─── ORDERING: Leader at counter, waiting for cookingSystem to link order ─
  ordering: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    npc._idleTime = (npc._idleTime || 0) + 1;
    // Snap to counter
    npc.x = DINER_SPOTS.counter.tx * TILE + TILE / 2;
    npc.y = DINER_SPOTS.counter.ty * TILE + TILE / 2;

    // cookingSystem will find this NPC and link the order
    // If shift ends while waiting, leave (guard: only dequeue if still active counter party)
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      npc.hasOrdered = true;
      if (_dinerCounterActiveParty === npc.partyId) {
        _dinerDequeueCounter(npc.partyId);
      }
      const party = _getDinerParty(npc.partyId);
      if (party && party.state !== 'leaving') {
        _triggerPartyLeave(party);
      } else if (!party) {
        _cStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
      }
      return;
    }

    // Patience timeout — leave after 15 sec if order never linked
    if (npc._idleTime >= 900) {
      npc.hasOrdered = true;
      if (_dinerCounterActiveParty === npc.partyId) {
        _dinerDequeueCounter(npc.partyId);
      }
      const party = _getDinerParty(npc.partyId);
      if (party && party.state !== 'leaving') {
        _triggerPartyLeave(party);
      } else if (!party) {
        _cStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
      }
    }
  },

  // ─── WAITING_FOOD: Linked to order, waiting for cook ───
  waiting_food: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    npc._idleTime = (npc._idleTime || 0) + 1;
    // Snap to counter
    npc.x = DINER_SPOTS.counter.tx * TILE + TILE / 2;
    npc.y = DINER_SPOTS.counter.ty * TILE + TILE / 2;

    // applyOrderResult() in cookingSystem will set us to pickup_food
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      npc.linkedOrderId = null;
      if (_dinerCounterActiveParty === npc.partyId) {
        _dinerDequeueCounter(npc.partyId);
      }
      const party = _getDinerParty(npc.partyId);
      if (party && party.state !== 'leaving') _triggerPartyLeave(party);
      else if (!party) _cStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
      return;
    }

    // Patience timeout — leave angry after 30 sec
    if (npc._idleTime >= 1800) {
      npc.linkedOrderId = null;
      if (_dinerCounterActiveParty === npc.partyId) {
        _dinerDequeueCounter(npc.partyId);
      }
      const party = _getDinerParty(npc.partyId);
      if (party && party.state !== 'leaving') _triggerPartyLeave(party);
      else if (!party) _cStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
    }
  },

  // ─── WAITING_AT_BOOTH: Non-leaders wait while leader orders ─
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

    // Patience timeout — 60 sec max waiting at booth
    if (npc._idleTime >= 3600) {
      if (party) _triggerPartyLeave(party);
      else _cStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
    }
  },

  // ─── PICKUP_FOOD: Leader got food, routes back to booth ─
  pickup_food: (npc) => {
    if (npc.stateTimer > 0) { npc.stateTimer--; npc.moving = false; return; }

    npc.hasOrdered = true;
    npc.hasFood = true;
    _dinerDequeueCounter(npc.partyId);

    const party = _getDinerParty(npc.partyId);
    if (!party) {
      _cStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
      return;
    }

    const route = _routeDinerCounterToSeat(party.boothId, npc.claimedSeatIdx);
    _cStartRoute(npc, route, 'return_to_booth', 0, { kind: 'counter_to_seat', boothId: party.boothId, seatIdx: npc.claimedSeatIdx });
  },

  // ─── RETURN_TO_BOOTH: Leader walking back with food ────
  return_to_booth: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const booth = DINER_BOOTHS[party.boothId];
    const seat = booth.seats[npc.claimedSeatIdx];
    if (!seat) { npc.state = '_despawn'; return; }

    npc.state = 'eating';
    npc.stateTimer = _cRandRange(DINER_NPC_CONFIG.eatDuration[0], DINER_NPC_CONFIG.eatDuration[1]);
    npc.x = seat.tx * TILE + TILE / 2;
    npc.y = seat.ty * TILE + TILE / 2;
    npc.dir = seat.sitDir;

    // Trigger all waiting party members to start eating too
    const members = _getPartyMembers(party);
    for (const m of members) {
      if (m.id !== npc.id && m.state === 'waiting_at_booth') {
        m.state = 'eating';
        m.stateTimer = _cRandRange(DINER_NPC_CONFIG.eatDuration[0], DINER_NPC_CONFIG.eatDuration[1]);
        m.hasFood = true;
      }
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
    const allDone = members.every(m => m.state === 'post_meal' || m.state === 'arcade_playing' ||
                                        m.state === 'leaving' || m.state === '_despawn');
    if (!allDone) return; // wait

    // Only the leader decides for the party (prevent duplicate decisions)
    if (!npc.isLeader) return;

    // 20% chance 1-2 members go to arcade
    if (Math.random() < DINER_NPC_CONFIG.arcadeChance) {
      // Pick 1-2 random members (could include leader)
      const arcadeCount = Math.min(_cRandRange(1, 2), members.length);
      const shuffled = members.slice().sort(() => Math.random() - 0.5);
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

    // Remaining post_meal members → decide tip or leave
    for (const m of members) {
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

  // ─── GO_ARCADE: Walking to arcade cabinet ──────────────
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
};

// ===================== PARTY HELPERS =====================

function _buildDinerExitPlan(npc) {
  const party = _getDinerParty(npc.partyId);
  const cx = party ? party.corridorTX : undefined;
  if (party && npc.claimedSeatIdx >= 0 &&
      (npc.state === 'menu_reading' || npc.state === 'waiting_at_booth' ||
       npc.state === 'eating' || npc.state === 'post_meal' ||
       npc.state === 'post_meal_wait' || npc.state === 'return_to_booth' ||
       npc.state === 'waiting_for_counter')) {
    return {
      route: _routeDinerSeatToExit(party.boothId, npc.claimedSeatIdx, cx),
      intent: { kind: 'seat_to_exit', boothId: party.boothId, seatIdx: npc.claimedSeatIdx },
    };
  }

  if (npc.state === 'ordering' || npc.state === 'waiting_food' || npc.state === 'pickup_food') {
    return {
      route: _routeDinerToExit(DINER_SPOTS.counter.tx, DINER_SPOTS.counter.ty, cx),
      intent: { kind: 'counter_to_exit' },
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
  _dinerDequeueCounter(party.id);
  const booth = DINER_BOOTHS[party.boothId];
  const members = _getPartyMembers(party);

  for (const m of members) {
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

// Post-meal exit: leader tips (maybe), all leave
function _triggerPartyPostMealExit(party) {
  _dinerDequeueCounter(party.id);
  const leader = _getPartyLeader(party);
  const members = _getPartyMembers(party);

  // Leader exits
  if (leader) {
    const exitPlan = _buildDinerExitPlan(leader);
    _cStartRoute(leader, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Non-leaders leave directly
  for (const m of members) {
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
  _cUpdateNPCLoop({
    restaurantId: 'diner',
    spawnState: _dinerSpawnState,
    spawnInterval: DINER_NPC_CONFIG.spawnInterval,
    canSpawn: () => {
      const activeParties = dinerParties.filter(p => p.state !== 'done').length;
      return activeParties < DINER_NPC_CONFIG.maxParties && dinerNPCs.length < 8;
    },
    doSpawn: spawnDinerParty,
    npcList: dinerNPCs,
    stateHandlers: DINER_NPC_AI,
    moveFn: moveDinerNPC,
    exemptIdleStates: new Set(['eating', 'waiting_at_booth', 'post_meal_wait', 'ordering', 'waiting_food', 'menu_reading', 'arcade_playing', 'waiting_for_counter']),
    onIdleTimeout: (npc) => {
      npc._idleTime = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc.partyId) _dinerDequeueCounter(npc.partyId);
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
    },
    onStuckTimeout: (npc) => {
      npc._stuckFrames = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc.partyId) _dinerDequeueCounter(npc.partyId);
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
      });
    },
  });
}
