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
  tipJar:      { tx: 17, ty: 16 },
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
  tipChance: 0.4,
  tipAmount: [2, 8],
  menuReadDuration: [180, 300],   // 3-5 sec
};

// ===================== STATE =====================
const dinerNPCs = [];
const dinerParties = [];
let _dinerNPCId = 0;
let _dinerPartyId = 0;
let _dinerSpawnTimer = 0;
let _dinerNextSpawnInterval = 600;

// Counter queue — only one leader at the counter at a time
const _dinerCounterQueue = [];  // array of partyIds in order
let _dinerCounterActiveParty = null;  // partyId currently at counter

// ===================== HELPERS =====================
function _dinerRandRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function _dinerRandFromArray(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _dinerTilePx(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function _dinerWP(tx, ty, lane) {
  return lane ? { tx: tx, ty: ty, lane: true } : { tx: tx, ty: ty };
}

function _cloneDinerRoute(route) {
  if (!route) return null;
  return route.map(wp => wp.lane ? { tx: wp.tx, ty: wp.ty, lane: true } : { tx: wp.tx, ty: wp.ty });
}

function _pushDinerRoute(route, wp) {
  if (!wp) return;
  const prev = route[route.length - 1];
  if (prev && prev.tx === wp.tx && prev.ty === wp.ty && !!prev.lane === !!wp.lane) return;
  route.push(wp.lane ? { tx: wp.tx, ty: wp.ty, lane: true } : { tx: wp.tx, ty: wp.ty });
}

function _concatDinerRoutes() {
  const route = [];
  for (let i = 0; i < arguments.length; i++) {
    const segment = arguments[i];
    if (!segment) continue;
    for (const wp of segment) _pushDinerRoute(route, wp);
  }
  return route;
}

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
  return candidates.length ? _dinerRandFromArray(candidates) : -1;
}

// Find a free arcade spot
function _findFreeArcadeSpot() {
  for (let i = 0; i < DINER_ARCADE_SPOTS.length; i++) {
    if (DINER_ARCADE_SPOTS[i].claimedBy === null) return i;
  }
  return -1;
}

// Get party object by id
function _getDinerParty(partyId) {
  for (const p of dinerParties) {
    if (p.id === partyId) return p;
  }
  return null;
}

// Get NPC by id
function _getDinerNPC(npcId) {
  for (const n of dinerNPCs) {
    if (n.id === npcId) return n;
  }
  return null;
}

// Get party leader NPC
function _getPartyLeader(party) {
  return _getDinerNPC(party.leaderId);
}

// Get all party members
function _getPartyMembers(party) {
  const members = [];
  for (const id of party.members) {
    const n = _getDinerNPC(id);
    if (n) members.push(n);
  }
  return members;
}

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
  return _concatDinerRoutes(
    [_dinerWP(access.rowAccess.tx, access.rowAccess.ty)],
    [_dinerWP(access.seat.tx, access.seat.ty)]
  );
}

function _routeDinerSeatToBoothEntry(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  const access = _getDinerSeatAccess(booth, seatIdx);
  if (!access) return [];
  return _concatDinerRoutes(
    [_dinerWP(access.rowAccess.tx, access.rowAccess.ty)],
    [_dinerWP(access.entry.tx, access.entry.ty)]
  );
}

function _routeDinerBoothEntryToCounter(booth) {
  if (!booth) return [];
  return _concatDinerRoutes(
    booth.entry.tx >= 36 ? [_dinerWP(36, 14, true)] : [_dinerWP(26, 14)],
    [_dinerWP(26, 16)],
    [_dinerWP(13, 16)]
  );
}

function _routeDinerCounterToBoothEntry(booth) {
  if (!booth) return [];
  return _concatDinerRoutes(
    [_dinerWP(26, 16)],
    [_dinerWP(26, 14)],
    booth.entry.tx >= 36 ? [_dinerWP(36, 14, true)] : null,
    [_dinerWP(booth.entry.tx, booth.entry.ty)]
  );
}

function _routeDinerSeatToCounter(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  return _concatDinerRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    _routeDinerBoothEntryToCounter(booth)
  );
}

function _routeDinerCounterToSeat(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  return _concatDinerRoutes(
    _routeDinerCounterToBoothEntry(booth),
    _routeDinerBoothToSeat(boothId, seatIdx)
  );
}

function _routeDinerSeatToArcade(boothId, seatIdx, arcadeIdx) {
  const booth = DINER_BOOTHS[boothId];
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  if (!booth || !spot) return [];
  return _concatDinerRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    booth.entry.tx >= 36 ? [_dinerWP(36, 14, true)] : [_dinerWP(26, 14)],
    booth.entry.tx >= 36 ? null : [_dinerWP(36, 14, true)],
    [_dinerWP(36, spot.ty)],
    [_dinerWP(spot.tx, spot.ty)]
  );
}

function _routeDinerSeatToExit(boothId, seatIdx, corridorTX) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  const cx = corridorTX || 27;
  return _concatDinerRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    booth.entry.tx >= 36 ? [_dinerWP(36, 14, true)] : [_dinerWP(26, 14)],
    [_dinerWP(cx, 14, true)],
    [_dinerWP(cx, DINER_SPOTS.exit.ty)]
  );
}

function _routeDinerSeatToTipJar(boothId, seatIdx) {
  const booth = DINER_BOOTHS[boothId];
  if (!booth) return [];
  return _concatDinerRoutes(
    _routeDinerSeatToBoothEntry(boothId, seatIdx),
    _routeDinerBoothEntryToCounter(booth),
    [_dinerWP(17, 16)]
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
    case 'seat_to_tipjar': return _routeDinerSeatToTipJar(intent.boothId, intent.seatIdx);
    case 'counter_to_exit': return _routeDinerToExit(DINER_SPOTS.counter.tx, DINER_SPOTS.counter.ty, cx);
    case 'tipjar_to_exit': return _routeDinerToExit(DINER_SPOTS.tipJar.tx, DINER_SPOTS.tipJar.ty, cx);
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
    case 'seat_to_exit':
    case 'seat_to_tipjar': {
      const booth = DINER_BOOTHS[intent.boothId];
      return booth && booth.seats ? booth.seats[intent.seatIdx] : null;
    }
    case 'counter_to_seat':
    case 'counter_to_exit':
      return DINER_SPOTS.counter;
    case 'tipjar_to_exit':
      return DINER_SPOTS.tipJar;
    case 'tile_to_exit':
      return { tx: intent.tx, ty: intent.ty };
    default:
      return npc && npc.route && npc.route.length ? { tx: npc.route[0].tx, ty: npc.route[0].ty } : null;
  }
}

function _recoverDinerNPC(npc) {
  if (npc._recoveryTried) return false;

  npc._recoveryTried = true;
  npc._laneOffX = 0;
  npc._laneOffY = 0;

  const intent = npc._routeIntent;
  const party = _getDinerParty(npc.partyId);
  const cx = party ? party.corridorTX : undefined;
  let route = _buildDinerRouteFromIntent(intent, cx);
  let anchor = _getDinerIntentAnchor(intent, npc);

  if ((!route || route.length === 0) && _isDinerKitchenZone(npc.x, npc.y)) {
    anchor = { tx: 26, ty: 16 };
    route = _routeDinerToExit(anchor.tx, anchor.ty, cx);
    npc._routeIntent = { kind: 'tile_to_exit', tx: anchor.tx, ty: anchor.ty };
  }

  if (!anchor || !route || route.length === 0) return false;

  const pos = _dinerTilePx(anchor.tx, anchor.ty);
  npc.x = pos.x;
  npc.y = pos.y;
  npc.route = _cloneDinerRoute(route);
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
  npc._stuckFrames = 0;
  return true;
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
  const cx = corridorTX || _dinerRandRange(26, 29);
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

function _routeDinerToTipJar(fromTX, fromTY) {
  const route = [];
  // Get to counter corridor
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
    route.push({ tx: 26, ty: 14 });
    route.push({ tx: 26, ty: 16 });
  } else if (fromTY >= 14 && fromTX >= 26) {
    route.push({ tx: 26, ty: fromTY });
    route.push({ tx: 26, ty: 16 });
  }
  route.push({ tx: 17, ty: 16 });    // west to tip jar
  return route;
}

function moveDinerNPC(npc) {
  if (!npc.route || npc.route.length === 0) {
    npc.moving = false;
    return;
  }

  const wp = npc.route[0];
  const targetX = wp.tx * TILE + TILE / 2 + (npc._laneOffX || 0);
  const targetY = wp.ty * TILE + TILE / 2 + (npc._laneOffY || 0);
  let dx = targetX - npc.x;
  let dy = targetY - npc.y;
  let dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 6) {
    npc.x = targetX;
    npc.y = targetY;
    npc.route.shift();
    if (npc.route.length === 0) {
      npc.moving = false;
    }
    return;
  }

  npc.moving = true;
  let spd = npc.speed;

  // NPC-NPC avoidance — lower-ID NPCs have priority
  for (const other of dinerNPCs) {
    if (other === npc) continue;
    // Skip seated/despawning NPCs
    if (other.state === 'eating' || other.state === 'menu_reading' ||
        other.state === 'waiting_at_booth' || other.state === 'arcade_playing' ||
        other.state === '_despawn' || other.state === 'ordering' ||
        other.state === 'waiting_food' || other.state === 'waiting_for_counter') continue;
    // Skip avoidance if we are ordering
    if (npc.state === 'ordering' || npc.state === 'waiting_food') continue;
    const sx = npc.x - other.x;
    const sy = npc.y - other.y;
    const sd = Math.sqrt(sx * sx + sy * sy);
    if (sd > 0 && sd < 50) {
      if (npc.id > other.id) {
        spd *= 0.3;
        const pushStr = (50 - sd) * 0.2;
        const nx = sx / sd, ny = sy / sd;
        const testX = npc.x + nx * pushStr;
        const testY = npc.y + ny * pushStr;
        if (!_isDinerKitchenZone(testX, testY) &&
            (typeof positionClear !== 'function' || positionClear(testX, testY, 14))) {
          npc.x = testX;
          npc.y = testY;
        }
      }
    }
  }

  // Recalculate direction after nudge
  dx = targetX - npc.x;
  dy = targetY - npc.y;
  dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;

  const nextX = npc.x + (dx / dist) * spd;
  const nextY = npc.y + (dy / dist) * spd;

  // Kitchen zone restriction
  if (_isDinerKitchenZone(nextX, nextY)) {
    if (_isDinerKitchenZone(npc.x, npc.y)) {
      npc.x = 26 * TILE + TILE / 2;
      npc.y = 16 * TILE + TILE / 2;
      npc._stuckFrames = 0;
      npc.route = [{ tx: 27, ty: 16 }, { tx: 27, ty: DINER_SPOTS.exit.ty }];
      return;
    }
    npc._stuckFrames = (npc._stuckFrames || 0) + 1;
    return;
  }

  // Wall/solid entity collision check
  if (typeof positionClear === 'function' && !positionClear(nextX, nextY, 14)) {
    npc._stuckFrames = (npc._stuckFrames || 0) + 1;
    return;
  }

  npc._stuckFrames = 0;
  npc.x = nextX;
  npc.y = nextY;

  // Facing direction
  if (Math.abs(dx) > Math.abs(dy)) {
    npc.dir = dx > 0 ? 3 : 2;
  } else {
    npc.dir = dy > 0 ? 0 : 1;
  }

  npc.frame = (npc.frame + 0.1) % 4;
}

// ===================== SPAWN =====================
function _spawnDinerNPC(partyId, isLeader, corridorTX) {
  const app = _dinerRandFromArray(DINER_NPC_APPEARANCES);
  const spawnTX = corridorTX || DINER_SPOTS.exit.tx;
  const npc = {
    id: ++_dinerNPCId,
    x: spawnTX * TILE + TILE / 2,
    y: DINER_SPOTS.exit.ty * TILE + TILE / 2,
    dir: 1, frame: 0, moving: false,
    skin: app.skin, hair: app.hair, shirt: app.shirt, pants: app.pants,
    name: _dinerRandFromArray(DINER_NPC_NAMES),
    state: 'entering',
    stateTimer: 0,
    route: null,
    _nextState: null,
    _nextTimer: 0,
    partyId: partyId,
    isLeader: isLeader,
    hasOrdered: false, hasFood: false, hasTipped: false,
    claimedSeatIdx: -1,
    linkedOrderId: null,
    _claimedArcadeIdx: -1,
    _laneOffX: (Math.random() - 0.5) * 32,
    _laneOffY: (Math.random() - 0.5) * 32,
    _stuckFrames: 0,
    _idleTime: 0,
    _recipeIngredients: null,
    speed: DINER_NPC_CONFIG.baseSpeed + (Math.random() - 0.5) * DINER_NPC_CONFIG.speedVariance * 2,
    isDinerNPC: true,
  };
  dinerNPCs.push(npc);
  return npc;
}

function _dinerNPCStartRoute(npc, route, nextState, nextTimer, intent) {
  npc.route = _cloneDinerRoute(route);
  npc._nextState = nextState;
  npc._nextTimer = nextTimer || 0;
  npc._routeIntent = intent || null;
  npc._recoveryTried = false;
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
}

function spawnDinerParty() {
  const partySize = _dinerRandRange(1, 3);
  const boothIdx = _findFreeBooth(partySize);
  if (boothIdx < 0) return null; // no free booth

  const partyId = ++_dinerPartyId;
  const booth = DINER_BOOTHS[boothIdx];
  booth.claimedBy = partyId;

  // Each party gets a random corridor column (26-29) so they don't all walk single-file
  const corridorTX = _dinerRandRange(26, 29);

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
  _dinerNPCId = 0;
  _dinerPartyId = 0;
  _dinerSpawnTimer = 0;
  _dinerNextSpawnInterval = 600;
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

    _dinerNPCStartRoute(npc, route, 'seating', 0, { kind: 'exit_to_booth', boothId: party.boothId });
  },

  // ─── SEATING: Walk to individual seat in booth ─────────
  seating: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeDinerBoothToSeat(party.boothId, npc.claimedSeatIdx);
    if (!route.length) { npc.state = '_despawn'; return; }

    _dinerNPCStartRoute(
      npc,
      route,
      'menu_reading',
      _dinerRandRange(DINER_NPC_CONFIG.menuReadDuration[0], DINER_NPC_CONFIG.menuReadDuration[1]),
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
    _dinerNPCStartRoute(npc, route, 'ordering', 0, { kind: 'seat_to_counter', boothId: party.boothId, seatIdx: npc.claimedSeatIdx });
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
        _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
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
        _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
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
      else if (!party) _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
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
      else if (!party) _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
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
      else _dinerNPCStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
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
      _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0, { kind: 'counter_to_exit' });
      return;
    }

    const route = _routeDinerCounterToSeat(party.boothId, npc.claimedSeatIdx);
    _dinerNPCStartRoute(npc, route, 'return_to_booth', 0, { kind: 'counter_to_seat', boothId: party.boothId, seatIdx: npc.claimedSeatIdx });
  },

  // ─── RETURN_TO_BOOTH: Leader walking back with food ────
  return_to_booth: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const booth = DINER_BOOTHS[party.boothId];
    const seat = booth.seats[npc.claimedSeatIdx];
    if (!seat) { npc.state = '_despawn'; return; }

    npc.state = 'eating';
    npc.stateTimer = _dinerRandRange(DINER_NPC_CONFIG.eatDuration[0], DINER_NPC_CONFIG.eatDuration[1]);
    npc.x = seat.tx * TILE + TILE / 2;
    npc.y = seat.ty * TILE + TILE / 2;
    npc.dir = seat.sitDir;

    // Trigger all waiting party members to start eating too
    const members = _getPartyMembers(party);
    for (const m of members) {
      if (m.id !== npc.id && m.state === 'waiting_at_booth') {
        m.state = 'eating';
        m.stateTimer = _dinerRandRange(DINER_NPC_CONFIG.eatDuration[0], DINER_NPC_CONFIG.eatDuration[1]);
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
      _dinerNPCStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
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
      const arcadeCount = Math.min(_dinerRandRange(1, 2), members.length);
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
    _dinerNPCStartRoute(
      npc,
      route,
      'arcade_playing',
      _dinerRandRange(DINER_NPC_CONFIG.arcadeDuration[0], DINER_NPC_CONFIG.arcadeDuration[1]),
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
      _dinerNPCStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0, { kind: 'tile_to_exit', tx: Math.floor(npc.x / TILE), ty: Math.floor(npc.y / TILE) });
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

  // ─── TIPPING: Leader at tip jar ────────────────────────
  tipping: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    if (!npc.hasTipped) {
      npc.hasTipped = true;
      npc.stateTimer = 60; // pause ~1 sec
      const tipAmt = _dinerRandRange(DINER_NPC_CONFIG.tipAmount[0], DINER_NPC_CONFIG.tipAmount[1]);
      if (typeof cookingState !== 'undefined' && cookingState.active) {
        cookingState.tipJar += tipAmt;
      } else {
        if (typeof gold !== 'undefined') gold += tipAmt;
      }
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: npc.x, y: npc.y - 40, life: 30, maxLife: 30, type: 'heal', dmg: 'Tip +$' + tipAmt });
      }
      return;
    }

    // After tipping, leave
    _dinerNPCStartRoute(npc, _routeDinerToExit(17, 16), '_despawn', 0, { kind: 'tipjar_to_exit' });
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

function _buildDinerTipPlan(npc, party) {
  if (party && npc.claimedSeatIdx >= 0) {
    return {
      route: _routeDinerSeatToTipJar(party.boothId, npc.claimedSeatIdx),
      intent: { kind: 'seat_to_tipjar', boothId: party.boothId, seatIdx: npc.claimedSeatIdx },
    };
  }
  const curTX = Math.floor(npc.x / TILE);
  const curTY = Math.floor(npc.y / TILE);
  return {
    route: _routeDinerToTipJar(curTX, curTY),
    intent: null,
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
    _dinerNPCStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
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

  // Leader tips (40% chance)
  if (leader && !leader.hasTipped && Math.random() < DINER_NPC_CONFIG.tipChance) {
    const tipPlan = _buildDinerTipPlan(leader, party);
    _dinerNPCStartRoute(leader, tipPlan.route, 'tipping', 0, tipPlan.intent);
  } else if (leader) {
    const exitPlan = _buildDinerExitPlan(leader);
    _dinerNPCStartRoute(leader, exitPlan.route, '_despawn', 0, exitPlan.intent);
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
    _dinerNPCStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Release booth
  const booth = DINER_BOOTHS[party.boothId];
  if (booth) booth.claimedBy = null;
  party.state = 'leaving';
}

// ===================== MAIN UPDATE =====================
function updateDinerNPCs() {
  if (typeof Scene === 'undefined' || !Scene.inCooking) return;
  if (typeof cookingState === 'undefined' || cookingState.activeRestaurantId !== 'diner') return;

  // Spawn parties on timer
  _dinerSpawnTimer++;
  if (_dinerSpawnTimer >= _dinerNextSpawnInterval) {
    _dinerSpawnTimer = 0;
    _dinerNextSpawnInterval = _dinerRandRange(DINER_NPC_CONFIG.spawnInterval[0], DINER_NPC_CONFIG.spawnInterval[1]);

    // Count active parties (not fully despawned)
    const activeParties = dinerParties.filter(p => p.state !== 'done').length;
    if (activeParties < DINER_NPC_CONFIG.maxParties) {
      spawnDinerParty();
    }
  }

  // Update each NPC
  for (let i = dinerNPCs.length - 1; i >= 0; i--) {
    const npc = dinerNPCs[i];
    const prevState = npc.state;

    // Run state handler
    const handler = DINER_NPC_AI[npc.state];
    if (handler) handler(npc);

    // Reset idle timer on state change
    if (npc.state !== prevState) npc._idleTime = 0;

    // Move along route (walking state)
    if (npc.state === 'walking') {
      moveDinerNPC(npc);
    }

    // Universal idle safety net — 60+ sec in non-eating/non-waiting states → force exit
    if (npc.state !== '_despawn' && npc.state !== '_despawn_walk' &&
        npc.state !== 'walking' && npc.state !== 'eating' &&
        npc.state !== 'waiting_at_booth' && npc.state !== 'post_meal_wait' &&
        npc.state !== 'ordering' && npc.state !== 'waiting_food' &&
        npc.state !== 'menu_reading' && npc.state !== 'arcade_playing' &&
        npc.state !== 'waiting_for_counter' &&
        (npc._idleTime || 0) >= 3600) {
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
      _dinerNPCStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
    }

    // Stuck detection — blocked 1+ second → abandon route, head to exit
    if ((npc._stuckFrames || 0) >= 60 && npc.state !== '_despawn' && npc.state !== '_despawn_walk') {
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
        _dinerNPCStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
      }
    }

    // Despawn
    if (npc.state === '_despawn') {
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      npc.hasFood = false;
      npc._recipeIngredients = null;
      dinerNPCs.splice(i, 1);
    }
  }

  // Clean up fully-despawned parties
  for (let i = dinerParties.length - 1; i >= 0; i--) {
    const party = dinerParties[i];
    const anyAlive = party.members.some(id => _getDinerNPC(id) !== null);
    if (!anyAlive) {
      // Release booth if still claimed
      const booth = DINER_BOOTHS[party.boothId];
      if (booth && booth.claimedBy === party.id) booth.claimedBy = null;
      party.state = 'done';
      dinerParties.splice(i, 1);
    }
  }
}
