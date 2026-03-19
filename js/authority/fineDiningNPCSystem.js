// ===================== FINE DINING NPC SYSTEM =====================
// Party-based customer NPCs for the Fine Dining restaurant (teppanyaki style).
// NPCs arrive in groups of 1-4, get assigned a teppanyaki table, sit, order,
// wait for player to cook at their table's grill, eat, optionally tip, then leave.
// NO pathfinding — straight-line waypoint routes only.
// Waiter NPC escorts parties from host stand to tables, takes orders, delivers food.

// ===================== APPEARANCE POOL =====================
const FD_NPC_APPEARANCES = [
  { skin: '#d4a574', hair: '#2a1a0a', shirt: '#1a1a3a', pants: '#1a1a2a' },  // dark suit
  { skin: '#8d5524', hair: '#1a1a1a', shirt: '#3a0a0a', pants: '#2a1a1a' },  // burgundy
  { skin: '#f0c8a0', hair: '#c08040', shirt: '#0a2a3a', pants: '#1a2a3a' },  // navy
  { skin: '#c68642', hair: '#4a3020', shirt: '#2a2a2a', pants: '#1a1a1a' },  // black formal
  { skin: '#e0b890', hair: '#8a6a40', shirt: '#3a2a4a', pants: '#2a1a3a' },  // purple
  { skin: '#a0764a', hair: '#2a1a0a', shirt: '#4a3a2a', pants: '#3a2a1a' },  // brown formal
  { skin: '#f5d0a0', hair: '#d0a060', shirt: '#1a3a2a', pants: '#1a2a1a' },  // forest green
  { skin: '#b5835a', hair: '#1a1010', shirt: '#3a3a3a', pants: '#2a2a2a' },  // charcoal
];
const FD_NPC_NAMES = ['Guest', 'VIP', 'Patron', 'Connoisseur', 'Foodie', 'Celebrity', 'Critic', 'Regular'];

// ===================== KEY SPOTS =====================
const FD_SPOTS = {
  exit: { tx: 40, ty: 24 },
  hostStand: { tx: 40, ty: 20 },
  passWindow: { tx: 20, ty: 20 },  // kitchen pass window where waiter drops/picks up orders
  waiterHome: { tx: 20, ty: 17 },  // waiter stationary spot (2 tiles under kitchen door, dining side)
};

// ===================== TEPPANYAKI TABLES =====================
const FD_TABLES = [
  { id: 0, grillTX: 24, grillTY: 5,  seats: [{ tx: 22, ty: 4, dir: 0 }, { tx: 22, ty: 6, dir: 1 }, { tx: 26, ty: 4, dir: 0 }, { tx: 26, ty: 6, dir: 1 }], claimedBy: null, state: 'empty', _exclamationVisible: false },
  { id: 1, grillTX: 35, grillTY: 5,  seats: [{ tx: 33, ty: 4, dir: 0 }, { tx: 33, ty: 6, dir: 1 }, { tx: 37, ty: 4, dir: 0 }, { tx: 37, ty: 6, dir: 1 }], claimedBy: null, state: 'empty', _exclamationVisible: false },
  { id: 2, grillTX: 24, grillTY: 14, seats: [{ tx: 22, ty: 13, dir: 0 }, { tx: 22, ty: 15, dir: 1 }, { tx: 26, ty: 13, dir: 0 }, { tx: 26, ty: 15, dir: 1 }], claimedBy: null, state: 'empty', _exclamationVisible: false },
  { id: 3, grillTX: 35, grillTY: 14, seats: [{ tx: 33, ty: 13, dir: 0 }, { tx: 33, ty: 15, dir: 1 }, { tx: 37, ty: 13, dir: 0 }, { tx: 37, ty: 15, dir: 1 }], claimedBy: null, state: 'empty', _exclamationVisible: false },
];

// ===================== CONFIG =====================
const FD_NPC_CONFIG = {
  maxParties: 4,
  spawnInterval: [300, 600],  // 5-10s
  baseSpeed: 0.7,
  speedVariance: 0.1,
  eatDuration: [900, 900],    // 15s fixed eating
  hostPauseDuration: [900, 900],  // 15s host interaction
  waiterOrderDuration: 900,      // 15s order taking
  waiterGreetDuration: 90,       // 1.5s greeting pause
  entryInterval: 180,            // 3s between NPCs entering
  seatWaitInterval: 180,         // 3s wait for NPC ahead to sit
  exitInterval: 180,             // 3s between NPCs leaving
  walkToTableInterval: 120,      // 2s between NPCs walking to table
};

// ===================== STATE =====================
let fineDiningNPCs = [];
let fineDiningParties = [];
const _fdIdCounter = { value: 0 };
let _fdPartyId = 0;
const _fdSpawnState = { timer: 0, nextInterval: 600 };

// Waiter NPC — persistent, escorts parties, takes orders, delivers food
let _fdWaiter = null;

// Order visibility flag — hidden until waiter returns to pass window after order_taking
let _fdOrderVisible = false;

// Pending serve queue — completed orders waiting for waiter to deliver
let _fdPendingServe = [];

// Queue of parties waiting for the waiter to become idle
let _fdWaiterQueue = [];

// ===================== HELPERS =====================
// Utility functions (_cRandRange, _cRandFromArray, _cTilePx, _cWP, _cCloneRoute, _cConcatRoutes)
// are provided by cookingNPCBase.js (loaded before this script).

// Kitchen zone check — NPCs must NOT enter kitchen interior
function _isFDKitchenZone(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx <= 19 && ty <= 18) return true;
  return false;
}

// Find an available table (not claimed by any party)
function _findFreeTable(partySize) {
  const candidates = [];
  for (let i = 0; i < FD_TABLES.length; i++) {
    if (FD_TABLES[i].claimedBy === null && FD_TABLES[i].seats.length >= partySize) {
      candidates.push(i);
    }
  }
  return candidates.length ? _cRandFromArray(candidates) : -1;
}

// Party/NPC lookup — thin wrappers over cookingNPCBase.js
function _getFDParty(partyId) { return _cFindParty(fineDiningParties, partyId); }
function _getFDNPC(id) { return _cFindNPCById(fineDiningNPCs, id); }
function _getFDPartyLeader(party) { return _cGetPartyLeader(fineDiningParties, fineDiningNPCs, party); }
function _getFDPartyMembers(party) { return _cGetPartyMembers(fineDiningNPCs, party); }

// Pick a customer type for fine dining (use FINE_DINING_CUSTOMER_TYPES if available, else fallback)
function _pickFDCustomerType() {
  if (typeof FINE_DINING_CUSTOMER_TYPES !== 'undefined') {
    const types = Object.values(FINE_DINING_CUSTOMER_TYPES);
    let totalWeight = 0;
    for (const t of types) totalWeight += (t.weight || 1);
    let r = Math.random() * totalWeight;
    for (const t of types) {
      r -= (t.weight || 1);
      if (r <= 0) return t;
    }
    return types[0];
  }
  // Fallback if FINE_DINING_CUSTOMER_TYPES not yet defined
  const fallback = [
    { type: 'regular',  partySize: [2, 3], coverFee: 20,  tipMult: 1.0, patience: 1.2, weight: 0.40 },
    { type: 'vip',      partySize: [2, 2], coverFee: 50,  tipMult: 2.0, patience: 1.5, weight: 0.20 },
    { type: 'couple',   partySize: [2, 2], coverFee: 35,  tipMult: 1.5, patience: 1.3, weight: 0.20 },
    { type: 'group',    partySize: [3, 4], coverFee: 15,  tipMult: 1.0, patience: 1.0, weight: 0.20 },
  ];
  let totalWeight = 0;
  for (const t of fallback) totalWeight += t.weight;
  let r = Math.random() * totalWeight;
  for (const t of fallback) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return fallback[0];
}

// ===================== ROUTE BUILDERS =====================
// All routes use horizontal/vertical legs only to prevent clipping through solids.
//
// SAFE CORRIDORS in the fine dining map:
//   ty:20  — horizontal main walkway between kitchen wall and tables
//   tx:20  — vertical corridor between kitchen wall and tables
//   tx:31  — vertical gap between left and right table columns
//   tx:42  — vertical corridor to host stand

// Exit(45,35) → Host Stand(42,22)
function _routeFDExitToHost(corridorTX) {
  const cx = corridorTX || 40;
  return _cConcatRoutes(
    [_cWP(cx, 24)],
    [_cWP(40, 24)],
    [_cWP(40, 20)]
  );
}

// Host(40,20) → Table seat
function _routeFDHostToTable(tableId, seatIdx) {
  const table = FD_TABLES[tableId];
  if (!table) return [];
  const seat = table.seats[seatIdx];
  if (!seat) return [];

  const route = [];
  // Host stand to main walkway
  route.push(_cWP(40, 20));

  // Determine which column the table is in
  const isRightCol = (table.grillTX >= 30);
  const isBottomRow = (table.grillTY >= 10);

  if (isRightCol) {
    // Right column tables (1, 3) — go to tx:31 gap, then approach
    route.push(_cWP(31, 20));
    if (isBottomRow) {
      // Table 3: seats at ty:13-15
      route.push(_cWP(31, seat.ty));
    } else {
      // Table 1: seats at ty:4-6, go north
      route.push(_cWP(31, seat.ty));
    }
    route.push(_cWP(seat.tx, seat.ty));
  } else {
    // Left column tables (0, 2) — go to tx:20 corridor
    route.push(_cWP(20, 20));
    if (isBottomRow) {
      // Table 2: seats at ty:13-15
      route.push(_cWP(20, seat.ty));
    } else {
      // Table 0: seats at ty:4-6, go north
      route.push(_cWP(20, seat.ty));
    }
    route.push(_cWP(seat.tx, seat.ty));
  }

  return route;
}

// Host(40,20) → Table grill center (for waiter, not a seat)
function _routeFDHostToTableGrill(tableId) {
  const table = FD_TABLES[tableId];
  if (!table) return [];

  const route = [];
  route.push(_cWP(40, 20));

  const isRightCol = (table.grillTX >= 30);

  if (isRightCol) {
    route.push(_cWP(31, 20));
    route.push(_cWP(31, table.grillTY));
    route.push(_cWP(table.grillTX, table.grillTY));
  } else {
    route.push(_cWP(20, 20));
    route.push(_cWP(20, table.grillTY));
    route.push(_cWP(table.grillTX, table.grillTY));
  }

  return route;
}

// Table grill → Host stand (waiter return route)
function _routeFDTableGrillToHost(tableId) {
  const table = FD_TABLES[tableId];
  if (!table) return [];

  const route = [];
  const isRightCol = (table.grillTX >= 30);

  if (isRightCol) {
    route.push(_cWP(31, table.grillTY));
    route.push(_cWP(31, 20));
  } else {
    route.push(_cWP(20, table.grillTY));
    route.push(_cWP(20, 20));
  }

  route.push(_cWP(40, 20));
  return route;
}

// Host stand → Pass window (tx:20, ty:20)
function _routeFDHostToPass() {
  return [_cWP(40, 20), _cWP(20, 20)];
}

// Pass window → Host stand
function _routeFDPassToHost() {
  return [_cWP(20, 20), _cWP(40, 20)];
}

// Pass window → Table grill (for delivering food)
function _routeFDPassToTableGrill(tableId) {
  const table = FD_TABLES[tableId];
  if (!table) return [];

  const route = [];
  const isRightCol = (table.grillTX >= 30);

  if (isRightCol) {
    route.push(_cWP(20, 20));
    route.push(_cWP(31, 20));
    route.push(_cWP(31, table.grillTY));
    route.push(_cWP(table.grillTX, table.grillTY));
  } else {
    route.push(_cWP(20, 20));
    route.push(_cWP(20, table.grillTY));
    route.push(_cWP(table.grillTX, table.grillTY));
  }

  return route;
}

// Table seat → Exit (through exit door at tx:20, ty:23)
function _routeFDTableToExit(tableId, seatIdx, corridorTX) {
  const table = FD_TABLES[tableId];
  if (!table) return [];
  const seat = table.seats[seatIdx];
  if (!seat) return [];

  const route = [];
  const isRightCol = (table.grillTX >= 30);

  // Seat → vertical corridor
  if (isRightCol) {
    route.push(_cWP(31, seat.ty));
    route.push(_cWP(31, 20));
  } else {
    route.push(_cWP(20, seat.ty));
    route.push(_cWP(20, 20));
  }

  // Main walkway west to exit door
  route.push(_cWP(20, 20));
  route.push(_cWP(20, 24));

  return route;
}

// Generic: from any tile position → Exit (through exit door at tx:20, ty:24)
function _routeFDToExit(fromTX, fromTY, corridorTX) {
  const route = [];

  // If in kitchen zone, get out through the service wall door
  if (fromTX <= 19 && fromTY <= 18) {
    route.push(_cWP(fromTX, 15));
    route.push(_cWP(18, 15));
    route.push(_cWP(20, 15));
    route.push(_cWP(20, 24));
    return route;
  }

  // In dining area — get to main walkway (ty:20)
  if (fromTY < 20) {
    // Above walkway: go to nearest vertical corridor first
    if (fromTX >= 30) {
      route.push(_cWP(31, fromTY));
      route.push(_cWP(31, 20));
    } else if (fromTX >= 20) {
      route.push(_cWP(20, fromTY));
      route.push(_cWP(20, 20));
    } else {
      route.push(_cWP(fromTX, 20));
    }
  }

  // On or below walkway — head west to exit door
  route.push(_cWP(20, 20));
  route.push(_cWP(20, 24));

  return route;
}

// ===================== ROUTE INTENT SYSTEM =====================
function _buildFDRouteFromIntent(intent, corridorTX) {
  if (!intent) return null;
  const cx = corridorTX;
  switch (intent.kind) {
    case 'exit_to_host': return _routeFDExitToHost(cx);
    case 'host_to_table': return _routeFDHostToTable(intent.tableId, intent.seatIdx);
    case 'table_to_exit': return _routeFDTableToExit(intent.tableId, intent.seatIdx, cx);
    case 'tile_to_exit': return _routeFDToExit(intent.tx, intent.ty, cx);
    default: return null;
  }
}

function _getFDIntentAnchor(intent, npc) {
  if (!intent) return null;
  switch (intent.kind) {
    case 'exit_to_host':
      return FD_SPOTS.exit;
    case 'host_to_table':
      return FD_SPOTS.hostStand;
    case 'table_to_exit': {
      const table = FD_TABLES[intent.tableId];
      return table && table.seats ? table.seats[intent.seatIdx] : null;
    }
    case 'tile_to_exit':
      return { tx: intent.tx, ty: intent.ty };
    default:
      return npc && npc.route && npc.route.length ? { tx: npc.route[0].tx, ty: npc.route[0].ty } : null;
  }
}

function _recoverFDNPC(npc) {
  return _cRecoverNPC(npc, {
    buildRouteFromIntent: (intent, cx) => _buildFDRouteFromIntent(intent, cx),
    getIntentAnchor: (intent, npc) => _getFDIntentAnchor(intent, npc),
    kitchenCheck: _isFDKitchenZone,
    kitchenSafe: { tx: 20, ty: 20 },
    routeToExit: (tx, ty, cx) => _routeFDToExit(tx, ty, cx),
    getPartyCX: (npc) => { const p = _getFDParty(npc.partyId); return p ? p.corridorTX : undefined; },
  });
}

// ===================== MOVEMENT =====================
const _fdMoveSkipStates = new Set(['eating', 'seated', 'waiting_cook', 'watching_cook', 'at_host', '_despawn', 'wait_to_walk', 'wait_to_leave']);

function moveFDNPC(npc) {
  _cMoveNPC(npc, {
    npcList: fineDiningNPCs,
    skipStates: _fdMoveSkipStates,
    kitchenCheck: _isFDKitchenZone,
    kitchenSafe: { tx: 20, ty: 20 },
    kitchenFallback: [{ tx: 40, ty: 20 }, { tx: 40, ty: 24 }],
    laneMode: 'none',
    pairSkip: (npc, other) => other.partyId === npc.partyId,
  });
}

// ===================== WAITER MOVEMENT =====================
// Waiter uses same movement but is not in fineDiningNPCs list
function _moveFDWaiter(waiter) {
  if (!waiter || !waiter.route || waiter.route.length === 0) {
    waiter.moving = false;
    return;
  }

  const target = waiter.route[0];
  const tx = target.tx * TILE + TILE / 2;
  const ty = target.ty * TILE + TILE / 2;
  const dx = tx - waiter.x;
  const dy = ty - waiter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < waiter.speed + 1) {
    waiter.x = tx;
    waiter.y = ty;
    waiter.route.shift();
    if (waiter.route.length === 0) {
      waiter.moving = false;
      // Route complete — transition to next state
      waiter.state = waiter._nextState || 'idle';
      waiter.stateTimer = waiter._nextTimer || 0;
    }
  } else {
    waiter.moving = true;
    const nx = dx / dist;
    const ny = dy / dist;
    waiter.x += nx * waiter.speed;
    waiter.y += ny * waiter.speed;

    // Set direction based on movement
    if (Math.abs(dx) > Math.abs(dy)) {
      waiter.dir = dx > 0 ? 3 : 2;
    } else {
      waiter.dir = dy > 0 ? 0 : 1;
    }
  }
}

// Start waiter on a route
function _startWaiterRoute(route, nextState, nextTimer) {
  if (!_fdWaiter) return;
  _fdWaiter.route = _cCloneRoute(route);
  _fdWaiter._nextState = nextState;
  _fdWaiter._nextTimer = nextTimer || 0;
  _fdWaiter.state = 'walking';
  _fdWaiter.moving = true;
}

// ===================== SPAWN =====================
function _spawnFDNPC(partyId, isLeader, corridorTX) {
  const spawnTX = corridorTX || FD_SPOTS.exit.tx;
  const npc = _cCreateNPC(_fdIdCounter, { tx: spawnTX, ty: FD_SPOTS.exit.ty }, FD_NPC_APPEARANCES, FD_NPC_NAMES, FD_NPC_CONFIG, {
    partyId: partyId,
    isLeader: isLeader,
    claimedSeatIdx: -1,
    _recoveryTried: false,
    _routeIntent: null,
    isFineDiningNPC: true,
  });
  fineDiningNPCs.push(npc);
  return npc;
}

function spawnFineDiningParty() {
  // Only spawn if waiter is idle
  if (_fdWaiter && _fdWaiter.state !== 'idle') {
    return null; // waiter is busy, will be queued
  }

  const customerType = _pickFDCustomerType();
  const sizeRange = customerType.partySize || [2, 4];
  const partySize = Math.max(2, Math.min(4, _cRandRange(sizeRange[0], sizeRange[1])));
  const tableIdx = _findFreeTable(partySize);
  if (tableIdx < 0) return null; // no free table

  const partyId = ++_fdPartyId;
  const table = FD_TABLES[tableIdx];
  table.claimedBy = partyId;
  table.state = 'claimed';

  // Each party gets a random corridor column (42-44) so they don't all walk single-file
  const corridorTX = _cRandRange(39, 41);

  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    tableId: tableIdx,
    corridorTX: corridorTX,
    seatAssignments: [],
    customerType: customerType,
    state: 'entering',
  };

  // Create NPCs — first is leader
  for (let i = 0; i < partySize; i++) {
    const npc = _spawnFDNPC(partyId, i === 0, corridorTX);
    npc.customerType = customerType.type; // for VIP/critic rendering

    // VIP/Critic name colors
    if (customerType.type === 'vip') {
      npc._nameColor = '#ffd700';  // gold
    } else if (customerType.type === 'critic') {
      npc._nameColor = '#e04040';  // red
    }

    party.members.push(npc.id);
    if (i === 0) party.leaderId = npc.id;

    // Assign seat at table
    npc.claimedSeatIdx = i;
    party.seatAssignments.push(i);

    // All party members wait for waiter escort — start in spawn_wait
    npc.state = 'spawn_wait';
    npc.stateTimer = i * FD_NPC_CONFIG.entryInterval; // 3s stagger entry from exit
  }

  fineDiningParties.push(party);

  // Trigger waiter greeting
  if (_fdWaiter && _fdWaiter.state === 'idle') {
    _fdWaiter._currentPartyId = party.id;
    _fdWaiter.state = 'greeting';
    _fdWaiter.stateTimer = FD_NPC_CONFIG.waiterGreetDuration;
  }

  return party;
}

// ===================== SPAWN GROUP FOR TABLE (diner-style) =====================
function _spawnFDGroupForTable(tableIdx) {
  const table = FD_TABLES[tableIdx];
  if (!table) return null;
  const plateCount = table._serveData && table._serveData.allTrayItems ? table._serveData.allTrayItems.length : 2;
  const partySize = Math.max(2, Math.min(4, plateCount));

  const partyId = ++_fdPartyId;
  table.claimedBy = partyId;

  const corridorTX = _cRandRange(39, 41);
  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    tableId: tableIdx,
    corridorTX: corridorTX,
    seatAssignments: [],
    customerType: _pickFDCustomerType(),
    state: 'entering',
  };

  for (let i = 0; i < partySize; i++) {
    const npc = _spawnFDNPC(partyId, i === 0, corridorTX);
    npc.customerType = party.customerType.type;
    if (party.customerType.type === 'vip') npc._nameColor = '#ffd700';
    else if (party.customerType.type === 'critic') npc._nameColor = '#e04040';
    party.members.push(npc.id);
    if (i === 0) party.leaderId = npc.id;
    npc.claimedSeatIdx = i;
    party.seatAssignments.push(i);
    // Stagger entry
    npc.state = 'spawn_wait';
    npc.stateTimer = i * FD_NPC_CONFIG.entryInterval;
  }

  fineDiningParties.push(party);
  return party;
}

// ===================== INIT =====================
function initFineDiningNPCs() {
  fineDiningNPCs.length = 0;
  fineDiningParties.length = 0;
  _fdIdCounter.value = 0;
  _fdPartyId = 0;
  _fdSpawnState.timer = 0;
  _fdSpawnState.nextInterval = _cRandRange(120, 300);
  _fdOrderVisible = true;
  _fdPendingServe.length = 0;
  _fdWaiterQueue.length = 0;
  for (const t of FD_TABLES) { t.claimedBy = null; t.state = 'empty'; t._exclamationVisible = false; t._foodServed = false; t._serveData = null; }

  // Create persistent waiter NPC at waiter home spot (3 tiles under kitchen entrance)
  _fdWaiter = {
    id: 'waiter',
    x: FD_SPOTS.waiterHome.tx * TILE + TILE / 2,
    y: FD_SPOTS.waiterHome.ty * TILE + TILE / 2,
    dir: 0, // face down
    speed: 0.98,
    moving: false,
    state: 'idle',
    stateTimer: 0,
    route: [],
    _nextState: 'idle',
    _nextTimer: 0,
    _currentPartyId: null,
    _currentTableId: null,
    hasFood: false,
    isFineDiningNPC: true,
    isWaiter: true,
    skin: '#e0b890',
    hair: '#4a3020',
    shirt: '#ffffff',  // white waiter shirt
    pants: '#1a1a1a',  // black pants
    name: 'Waiter',
    anim: 0,
  };
}

// ===================== EXIT PLAN BUILDERS =====================
function _buildFDExitPlan(npc) {
  const party = _getFDParty(npc.partyId);
  const cx = party ? party.corridorTX : undefined;

  // If seated at a table
  if (party && npc.claimedSeatIdx >= 0 &&
      (npc.state === 'seated' || npc.state === 'waiting_cook' ||
       npc.state === 'watching_cook' || npc.state === 'eating' ||
       npc.state === 'post_meal')) {
    return {
      route: _routeFDTableToExit(party.tableId, npc.claimedSeatIdx, cx),
      intent: { kind: 'table_to_exit', tableId: party.tableId, seatIdx: npc.claimedSeatIdx },
    };
  }

  // If at host stand
  if (npc.state === 'at_host') {
    return {
      route: _routeFDToExit(FD_SPOTS.hostStand.tx, FD_SPOTS.hostStand.ty, cx),
      intent: { kind: 'tile_to_exit', tx: FD_SPOTS.hostStand.tx, ty: FD_SPOTS.hostStand.ty },
    };
  }

  // Generic: from current position
  const curTX = Math.floor(npc.x / TILE);
  const curTY = Math.floor(npc.y / TILE);
  return {
    route: _routeFDToExit(curTX, curTY, cx),
    intent: { kind: 'tile_to_exit', tx: curTX, ty: curTY },
  };
}

// ===================== PARTY HELPERS =====================

// Trigger the whole party to leave
function _triggerFDPartyLeave(party) {
  const table = FD_TABLES[party.tableId];
  const members = _getFDPartyMembers(party);

  for (const m of members) {
    if (m.state === '_despawn' || m.state === '_despawn_walk') continue;
    m.hasFood = false;
    m.linkedOrderId = null;

    const exitPlan = _buildFDExitPlan(m);
    _cStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Release table + clear food
  if (table) {
    table.claimedBy = null;
    table.state = 'empty';
    table._exclamationVisible = false;
    table._foodServed = false;
    table._serveData = null;
  }
  party.state = 'leaving';
}

// Post-meal exit: staggered leave (now handled by post_meal state)
function _triggerFDPartyPostMealExit(party) {
  const leader = _getFDPartyLeader(party);
  const members = _getFDPartyMembers(party);

  // Stagger exits with intervals
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    if (m.state === '_despawn' || m.state === '_despawn_walk') continue;
    m.hasFood = false;
    m.linkedOrderId = null;
    m.state = 'wait_to_leave';
    m.stateTimer = i * FD_NPC_CONFIG.exitInterval;
  }

  // Release table + clear food
  const table = FD_TABLES[party.tableId];
  if (table) {
    table.claimedBy = null;
    table.state = 'empty';
    table._exclamationVisible = false;
  }
  party.state = 'leaving';
}

// Generate a ticket for this party (called during waiter order_taking)
function _generateFDTicket(party) {
  if (typeof cookingState === 'undefined' || !cookingState.active) return;
  if (typeof _generateTicket === 'function') {
    // Use the cooking system's ticket generator
    _generateTicket();
    // Link the ticket to the party's leader
    const leader = _getFDPartyLeader(party);
    if (leader && cookingState.ticketQueue.length > 0) {
      const ticket = cookingState.ticketQueue[cookingState.ticketQueue.length - 1];
      leader.linkedOrderId = ticket;
      ticket._fdPartyId = party.id;
      ticket._fdTableId = party.tableId;
    }
  }
}

// ===================== WAITER STATE MACHINE =====================

const FD_WAITER_AI = {

  // ─── IDLE: Standing at waiter home spot, waiting for work ──────
  idle: (w) => {
    w.moving = false;
    w.dir = 0; // face down
    w.hasFood = false;

    // Snap to waiter home spot
    w.x = FD_SPOTS.waiterHome.tx * TILE + TILE / 2;
    w.y = FD_SPOTS.waiterHome.ty * TILE + TILE / 2;

    // Priority 1: Deliver pending serve (completed orders from submit counter)
    if (_fdPendingServe.length > 0) {
      const serveEntry = _fdPendingServe[0];
      // Find a free table for this order
      const freeTableIdx = _findFreeTable(1);
      if (freeTableIdx < 0) return; // no free table, wait
      _fdPendingServe.shift();
      serveEntry.tableId = freeTableIdx;
      FD_TABLES[freeTableIdx].claimedBy = -1; // mark as claimed by incoming order
      FD_TABLES[freeTableIdx].state = 'waiting_cook';
      w._currentTableId = freeTableIdx;
      w._currentPartyId = null;
      w._serveData = serveEntry;
      w.hasFood = true;

      // Walk from waiter home through kitchen door to pickup counter
      const routeToPickup = [_cWP(20, 17), _cWP(19, 14), _cWP(19, 12)];
      _startWaiterRoute(routeToPickup, 'picking_up', 0);
      return;
    }
  },

  // ─── GREETING: Brief pause when new party arrives ────────
  greeting: (w) => {
    w.moving = false;
    w.dir = 0; // face down toward entrance

    if (w.stateTimer > 0) { w.stateTimer--; return; }

    const party = _getFDParty(w._currentPartyId);
    if (!party) { w.state = 'idle'; return; }

    // Start escorting — walk from waiter home to the table grill
    w._currentTableId = party.tableId;
    const table = FD_TABLES[party.tableId];
    if (!table) { w.state = 'idle'; return; }
    const isRightCol = (table.grillTX >= 30);
    // Route: waiterHome(20,17) → main walkway → table grill
    const route = [];
    route.push(_cWP(20, 17));
    route.push(_cWP(20, 20));
    if (isRightCol) {
      route.push(_cWP(31, 20));
      route.push(_cWP(31, table.grillTY));
    } else {
      route.push(_cWP(20, table.grillTY));
    }
    route.push(_cWP(table.grillTX, table.grillTY));

    // Start party members walking to their table (staggered with intervals)
    const members = _getFDPartyMembers(party);
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m.state === 'spawn_wait') {
        m.stateTimer = i * FD_NPC_CONFIG.walkToTableInterval; // 2s stagger
      }
    }

    _startWaiterRoute(route, 'order_taking', FD_NPC_CONFIG.waiterOrderDuration);
    // Override state to escorting during walk
    w.state = 'escorting';
  },

  // ─── ESCORTING: Walking to table, party follows ──────────
  escorting: (w) => {
    _moveFDWaiter(w);

    // Party members will route themselves in the entering/walking_to_table states
    // Waiter arrives at table first, transitions to order_taking
    if (!w.moving && (!w.route || w.route.length === 0)) {
      w.state = 'order_taking';
      w.stateTimer = FD_NPC_CONFIG.waiterOrderDuration;
    }
  },

  // ─── ORDER_TAKING: At table, 15s pause, generates ticket ─
  order_taking: (w) => {
    w.moving = false;

    // Face toward the table center
    if (w._currentTableId !== null && FD_TABLES[w._currentTableId]) {
      const table = FD_TABLES[w._currentTableId];
      w.x = table.grillTX * TILE + TILE / 2;
      w.y = table.grillTY * TILE + TILE / 2;
    }

    if (w.stateTimer > 0) {
      w.stateTimer--;

      // Generate ticket halfway through order taking
      if (w.stateTimer === Math.floor(FD_NPC_CONFIG.waiterOrderDuration / 2)) {
        const party = _getFDParty(w._currentPartyId);
        if (party) {
          _generateFDTicket(party);
          // Set exclamation visible — ticket generated but not yet posted
          const table = FD_TABLES[party.tableId];
          if (table) {
            table._exclamationVisible = true;
            table.state = 'waiting_cook';
          }
          // Order is always visible now (cooking system generates tickets independently)
        }
      }
      return;
    }

    // Order taking complete — transition all seated party members to waiting_cook
    const party = _getFDParty(w._currentPartyId);
    if (party) {
      const members = _getFDPartyMembers(party);
      for (const m of members) {
        if (m.state === 'seated' || m.state === 'walking_to_table' || m.state === 'entering') {
          // If still walking, snap them to seat
          const table = FD_TABLES[party.tableId];
          const seat = table.seats[m.claimedSeatIdx];
          if (seat) {
            m.x = seat.tx * TILE + TILE / 2;
            m.y = seat.ty * TILE + TILE / 2;
            m.dir = seat.dir;
          }
          m.state = 'waiting_cook';
          m._idleTime = 0;
        }
      }
      party.state = 'waiting_cook';
    }

    // Walk back to host stand (via pass window to post the order)
    const route = _routeFDTableGrillToHost(w._currentTableId);
    if (route && route.length) {
      // Route: table → main walkway → pass window → host stand
      // We go via pass window to make the order visible
      const tableGrillToPass = [];
      const table = FD_TABLES[w._currentTableId];
      if (table) {
        const isRightCol = (table.grillTX >= 30);
        if (isRightCol) {
          tableGrillToPass.push(_cWP(31, table.grillTY));
          tableGrillToPass.push(_cWP(31, 20));
          tableGrillToPass.push(_cWP(20, 20));
        } else {
          tableGrillToPass.push(_cWP(20, table.grillTY));
          tableGrillToPass.push(_cWP(20, 20));
        }
      }
      _startWaiterRoute(tableGrillToPass, 'posting_order', 0);
    } else {
      w.state = 'returning';
    }
  },

  // ─── POSTING_ORDER: Arrived at pass window, make order visible ─
  posting_order: (w) => {
    w.moving = false;

    // Make the order visible on the HUD
    _fdOrderVisible = true;

    // Clear exclamation on the table
    if (w._currentTableId !== null && FD_TABLES[w._currentTableId]) {
      FD_TABLES[w._currentTableId]._exclamationVisible = false;
    }

    // Now walk back to waiter home spot
    const route = [_cWP(20, 20), _cWP(20, 17)];
    _startWaiterRoute(route, 'idle', 0);
    // Override to returning state during walk
    w.state = 'returning';
  },

  // ─── RETURNING: Walking back to waiter home ──────────────
  returning: (w) => {
    _moveFDWaiter(w);

    if (!w.moving && (!w.route || w.route.length === 0)) {
      w._currentPartyId = null;
      w._currentTableId = null;
      w.state = 'idle';
    }
  },

  // ─── PICKING_UP: Walking to pickup counter to get food ─
  picking_up: (w) => {
    _moveFDWaiter(w);

    if (!w.moving && (!w.route || w.route.length === 0)) {
      // At pickup counter — now walk to the table to deliver
      w.hasFood = true;
      const table = FD_TABLES[w._currentTableId];
      if (!table) { w.state = 'idle'; return; }
      const isRightCol = (table.grillTX >= 30);
      // Route: pickup counter(19,12) → kitchen door → walkway → table grill
      const route = [];
      route.push(_cWP(19, 14));
      route.push(_cWP(20, 20));
      if (isRightCol) {
        route.push(_cWP(31, 20));
        route.push(_cWP(31, table.grillTY));
      } else {
        route.push(_cWP(20, table.grillTY));
      }
      route.push(_cWP(table.grillTX, table.grillTY));
      _startWaiterRoute(route, 'serving', 30);
      w.state = 'delivering';
    }
  },

  // ─── DELIVERING: Carrying plate from counter to table ──────
  delivering: (w) => {
    _moveFDWaiter(w);

    if (!w.moving && (!w.route || w.route.length === 0)) {
      w.state = 'serving';
      w.stateTimer = 30; // brief pause
    }
  },

  // ─── SERVING: At table, place food on grill, spawn NPCs to eat ─────────────
  serving: (w) => {
    w.moving = false;
    w.hasFood = false;

    if (w.stateTimer > 0) { w.stateTimer--; return; }

    // Place food on grill — fire and food visuals activate
    const tableIdx = w._currentTableId;
    const table = tableIdx != null ? FD_TABLES[tableIdx] : null;
    if (table) {
      table._foodServed = true;
      table._serveData = w._serveData || null;
      table.state = 'eating';
      table._exclamationVisible = false;

      // Spawn NPC group to eat at this table (like diner _spawnGroupForBooth)
      _spawnFDGroupForTable(tableIdx);
    }

    // Return to waiter home
    if (table) {
      const isRightCol = (table.grillTX >= 30);
      const route = [];
      if (isRightCol) {
        route.push(_cWP(31, table.grillTY));
        route.push(_cWP(31, 20));
      } else {
        route.push(_cWP(20, table.grillTY));
        route.push(_cWP(20, 20));
      }
      route.push(_cWP(20, 17));
      _startWaiterRoute(route, 'idle', 0);
      w.state = 'returning';
    } else {
      w.state = 'idle';
    }
    w._currentPartyId = null;
    w._currentTableId = null;
    w._serveData = null;
  },

  // ─── WALKING: Generic walking state ─────────────────────
  walking: (w) => {
    _moveFDWaiter(w);
  },
};

// ===================== AI STATE HANDLERS =====================

const FD_NPC_AI = {

  // ─── SPAWN_WAIT: Staggered delay before entering ───────
  spawn_wait: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    npc.state = 'entering';
  },

  // ─── ENTERING: Walk from exit door directly to table seat (food already on grill) ──────
  entering: (npc) => {
    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const table = FD_TABLES[party.tableId];
    if (!table) { npc.state = '_despawn'; return; }

    const seat = table.seats[npc.claimedSeatIdx];
    if (!seat) { npc.state = '_despawn'; return; }

    // Route: exit door → main walkway → vertical corridor → seat
    const isRightCol = (table.grillTX >= 30);
    const route = [];
    route.push(_cWP(40, 24));
    route.push(_cWP(40, 20));
    if (isRightCol) {
      route.push(_cWP(31, 20));
      route.push(_cWP(31, seat.ty));
    } else {
      route.push(_cWP(20, 20));
      route.push(_cWP(20, seat.ty));
    }
    route.push(_cWP(seat.tx, seat.ty));

    _cStartRoute(npc, route, 'eating', FD_NPC_CONFIG.eatDuration[0],
      { kind: 'host_to_table', tableId: party.tableId, seatIdx: npc.claimedSeatIdx });
  },

  // ─── AT_HOST: 15 sec interaction with host, pay, wait for full group ──
  at_host: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face up toward host stand

    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    // Wait for ALL party members to arrive at host
    const members = _getFDPartyMembers(party);
    const allAtHost = members.every(m => m.state === 'at_host');
    if (!allAtHost) return; // wait for full group

    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Only leader handles payment + transition
    if (!npc.isLeader) return;

    // Charge cover fee
    const coverFee = party.customerType.coverFee || 20;
    if (typeof gold !== 'undefined') gold += coverFee;

    if (typeof cookingState !== 'undefined' && cookingState.stats) {
      cookingState.stats.totalEarned = (cookingState.stats.totalEarned || 0) + coverFee;
    }

    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({
        x: npc.x, y: npc.y - 40,
        life: 45, maxLife: 45,
        type: 'heal',
        dmg: '+ $' + coverFee + ' Table Fee',
      });
    }

    // Transition all members to walk to table with 2-sec intervals
    party.state = 'seating';
    for (let i = 0; i < members.length; i++) {
      members[i].state = 'wait_to_walk';
      members[i].stateTimer = i * FD_NPC_CONFIG.walkToTableInterval; // 2s stagger
    }
  },

  // ─── WAIT_TO_WALK: Staggered delay before walking to table ─────
  wait_to_walk: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Check if NPC ahead has sat down (3-sec seating wait)
    const party = _getFDParty(npc.partyId);
    if (party) {
      const members = _getFDPartyMembers(party);
      const myIdx = members.indexOf(npc);
      if (myIdx > 0) {
        const prev = members[myIdx - 1];
        if (prev.state === 'walking_to_table') {
          // Previous NPC still walking — wait
          return;
        }
      }
    }

    npc.state = 'walking_to_table';
  },

  // ─── WALKING_TO_TABLE: Walk to closest available seat ─────
  walking_to_table: (npc) => {
    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const table = FD_TABLES[party.tableId];
    if (!table) { npc.state = '_despawn'; return; }

    // Find closest available seat (not claimed by another party member)
    const takenSeats = new Set();
    const members = _getFDPartyMembers(party);
    for (const m of members) {
      if (m.id !== npc.id && m.claimedSeatIdx >= 0) takenSeats.add(m.claimedSeatIdx);
    }

    let bestIdx = -1, bestDist = Infinity;
    for (let si = 0; si < table.seats.length; si++) {
      if (takenSeats.has(si)) continue;
      const seat = table.seats[si];
      const dx = seat.tx * TILE - npc.x;
      const dy = seat.ty * TILE - npc.y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; bestIdx = si; }
    }

    if (bestIdx < 0) bestIdx = 0; // fallback
    npc.claimedSeatIdx = bestIdx;
    party.seatAssignments[members.indexOf(npc)] = bestIdx;

    // Build route from current position (near host stand) to table seat
    const seat = table.seats[bestIdx];
    const curTX = Math.floor(npc.x / TILE);
    const curTY = Math.floor(npc.y / TILE);
    const isRightCol = (table.grillTX >= 30);
    const route = [];

    // Walk to main walkway first
    route.push(_cWP(curTX, 20));
    if (isRightCol) {
      route.push(_cWP(31, 20));
      route.push(_cWP(31, seat.ty));
    } else {
      route.push(_cWP(20, 20));
      route.push(_cWP(20, seat.ty));
    }
    route.push(_cWP(seat.tx, seat.ty));

    _cStartRoute(npc, route, 'seated', 0,
      { kind: 'host_to_table', tableId: party.tableId, seatIdx: bestIdx });
  },

  // ─── SEATED: Just arrived at seat, wait for waiter to finish order ──────
  seated: (npc) => {
    npc.moving = false;
    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const table = FD_TABLES[party.tableId];
    const seat = table.seats[npc.claimedSeatIdx];
    if (seat) {
      npc.dir = seat.dir;
      npc.x = seat.tx * TILE + TILE / 2;
      npc.y = seat.ty * TILE + TILE / 2;
    }

    // Wait for waiter to transition them to waiting_cook via order_taking
    // (waiter AI handles the state change)
  },

  // ─── WAITING_COOK: Order active, waiting for player to cook ──
  waiting_cook: (npc) => {
    npc.moving = false;
    npc._idleTime = (npc._idleTime || 0) + 1;

    // Snap to seat
    const party = _getFDParty(npc.partyId);
    if (party) {
      const table = FD_TABLES[party.tableId];
      const seat = table.seats[npc.claimedSeatIdx];
      if (seat) {
        npc.dir = seat.dir;
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
      }
    }

    // Shift ended — leave
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      if (party && party.state !== 'leaving') _triggerFDPartyLeave(party);
      return;
    }

    // Patience timeout — leave after 60 sec if never cooked
    if (npc._idleTime >= 3600) {
      if (party && party.state !== 'leaving') _triggerFDPartyLeave(party);
    }
  },

  // ─── WATCHING_COOK: Player is cooking at their table ───
  watching_cook: (npc) => {
    npc.moving = false;
    npc._idleTime = 0; // reset patience while watching

    // Snap to seat
    const party = _getFDParty(npc.partyId);
    if (party) {
      const table = FD_TABLES[party.tableId];
      const seat = table.seats[npc.claimedSeatIdx];
      if (seat) {
        // Face the grill (center of table)
        const grillPx = table.grillTX * TILE + TILE / 2;
        const grillPy = table.grillTY * TILE + TILE / 2;
        const dx = grillPx - npc.x;
        const dy = grillPy - npc.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          npc.dir = dx > 0 ? 3 : 2;
        } else {
          npc.dir = dy > 0 ? 0 : 1;
        }
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
      }
    }

    // cookingSystem or grillState will transition to eating when cooking is complete
  },

  // ─── EATING: Eating after cooking complete ─────────────
  eating: (npc) => {
    npc.moving = false;

    // Snap to seat
    const party = _getFDParty(npc.partyId);
    if (party) {
      const table = FD_TABLES[party.tableId];
      const seat = table.seats[npc.claimedSeatIdx];
      if (seat) {
        npc.x = seat.tx * TILE + TILE / 2;
        npc.y = seat.ty * TILE + TILE / 2;
        npc.dir = seat.dir;
      }
    }
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Done eating
    npc.hasFood = false;
    npc.state = 'post_meal';
  },

  // ─── POST_MEAL: Leave one by one with 3-sec intervals ─────────────
  post_meal: (npc) => {
    npc.moving = false;
    const party = _getFDParty(npc.partyId);
    if (!party) {
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeFDToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
      return;
    }

    // Wait for all party members to finish eating
    const members = _getFDPartyMembers(party);
    const allDone = members.every(m => m.state === 'post_meal' || m.state === 'leaving' || m.state === '_despawn' || m.state === '_despawn_walk');
    if (!allDone) return; // wait

    // Only the leader triggers the staggered exit
    if (!npc.isLeader) return;

    // Clear table food/fire
    const table = FD_TABLES[party.tableId];
    if (table) {
      table._foodServed = false;
      table._serveData = null;
      table.claimedBy = null;
      table.state = 'empty';
      table._exclamationVisible = false;
    }
    party.state = 'leaving';

    // Stagger exits: each NPC leaves 3 sec after the previous
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (m.state === '_despawn' || m.state === '_despawn_walk') continue;
      m.hasFood = false;
      m.linkedOrderId = null;
      m.state = 'wait_to_leave';
      m.stateTimer = i * FD_NPC_CONFIG.exitInterval; // 3s intervals
    }
  },

  // ─── WAIT_TO_LEAVE: Staggered exit delay ──────────────
  wait_to_leave: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    // Build exit route and go
    const exitPlan = _buildFDExitPlan(npc);
    _cStartRoute(npc, exitPlan.route, '_despawn', 0, exitPlan.intent);
  },

  // ─── LEAVING: Walking to exit ──────────────────────────
  leaving: (npc) => {
    // Route already set by _triggerFDPartyLeave
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
      moveFDNPC(npc);
      return;
    }
    npc.state = '_despawn';
  },
};

// ===================== EXTERNAL TRIGGERS =====================
// Called by cookingSystem/grillState when player starts cooking at a table's grill
function notifyFDTableCookingStarted(tableId) {
  const table = FD_TABLES[tableId];
  if (!table || table.claimedBy === null) return;
  const party = _getFDParty(table.claimedBy);
  if (!party) return;
  const members = _getFDPartyMembers(party);
  for (const m of members) {
    if (m.state === 'waiting_cook') {
      m.state = 'watching_cook';
      m._idleTime = 0;
    }
  }
  table.state = 'cooking';
  table._exclamationVisible = false;
  party.state = 'watching_cook';
}

// Called by cookingSystem/grillState when cooking is complete at a table
// Now pushes to pending serve queue instead of immediately setting eating
function notifyFDTableCookingComplete(tableId) {
  const table = FD_TABLES[tableId];
  if (!table || table.claimedBy === null) return;
  const party = _getFDParty(table.claimedBy);
  if (!party) return;

  // Push to pending serve queue — waiter will deliver the food
  _fdPendingServe.push({
    tableId: tableId,
    partyId: party.id,
  });
}

// ===================== WAITER UPDATE =====================
function _updateFDWaiter() {
  if (!_fdWaiter) return;

  const handler = FD_WAITER_AI[_fdWaiter.state];
  if (handler) {
    handler(_fdWaiter);
  }
}

// ===================== MAIN UPDATE =====================
function updateFineDiningNPCs() {
  // Update waiter first
  _updateFDWaiter();

  _cUpdateNPCLoop({
    restaurantId: 'fine_dining',
    spawnState: _fdSpawnState,
    spawnInterval: FD_NPC_CONFIG.spawnInterval,
    canSpawn: () => false,
    doSpawn: () => {
      const party = spawnFineDiningParty();
      if (!party && _fdWaiter && _fdWaiter.state !== 'idle') {
        // Waiter is busy — queue this spawn attempt for later
        // The spawn timer will retry naturally
      }
      return party;
    },
    npcList: fineDiningNPCs,
    stateHandlers: FD_NPC_AI,
    moveFn: moveFDNPC,
    exemptIdleStates: new Set(['eating', 'seated', 'waiting_cook', 'watching_cook', 'at_host', 'spawn_wait', 'wait_to_walk', 'wait_to_leave']),
    onIdleTimeout: (npc) => {
      npc._idleTime = 0;
      npc.hasFood = false;
      npc.linkedOrderId = null;
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeFDToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
    },
    onStuckTimeout: (npc) => {
      npc._stuckFrames = 0;
      npc.hasFood = false;
      npc.linkedOrderId = null;
      if (!_recoverFDNPC(npc)) {
        if (_isFDKitchenZone(npc.x, npc.y)) {
          npc.x = 20 * TILE + TILE / 2;
          npc.y = 20 * TILE + TILE / 2;
        }
        const curTX = Math.floor(npc.x / TILE);
        const curTY = Math.floor(npc.y / TILE);
        _cStartRoute(npc, _routeFDToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
      }
    },
    onDespawn: (npc, i) => {
      npc.hasFood = false;
      npc.linkedOrderId = null;
      fineDiningNPCs.splice(i, 1);
    },
    postLoop: () => {
      _cCleanupParties(fineDiningParties, fineDiningNPCs, (party) => {
        const table = FD_TABLES[party.tableId];
        if (table && table.claimedBy === party.id) {
          table.claimedBy = null;
          table.state = 'empty';
          table._exclamationVisible = false;
          table._foodServed = false;
          table._serveData = null;
        }
        // Remove pending serve entries for this party
        for (let i = _fdPendingServe.length - 1; i >= 0; i--) {
          if (_fdPendingServe[i].partyId === party.id) {
            _fdPendingServe.splice(i, 1);
          }
        }
        // Reset waiter if currently serving this party
        if (_fdWaiter && _fdWaiter._currentPartyId === party.id) {
          _fdWaiter.state = 'idle';
          _fdWaiter._currentPartyId = null;
          _fdWaiter._currentTableId = null;
          _fdWaiter.hasFood = false;
        }
      });
    },
  });
}
