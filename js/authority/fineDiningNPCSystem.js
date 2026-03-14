// ===================== FINE DINING NPC SYSTEM =====================
// Party-based customer NPCs for the Fine Dining restaurant (teppanyaki style).
// NPCs arrive in groups of 1-4, get assigned a teppanyaki table, sit, order,
// wait for player to cook at their table's grill, eat, optionally tip, then leave.
// NO pathfinding — straight-line waypoint routes only.

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
  exit: { tx: 45, ty: 35 },
  hostStand: { tx: 42, ty: 22 },
  tipJar: { tx: 16, ty: 21 },
};

// ===================== TEPPANYAKI TABLES =====================
const FD_TABLES = [
  { id: 0, grillTX: 24, grillTY: 5,  seats: [{ tx: 22, ty: 4, dir: 0 }, { tx: 22, ty: 6, dir: 1 }, { tx: 27, ty: 4, dir: 0 }, { tx: 27, ty: 6, dir: 1 }], claimedBy: null, state: 'empty' },
  { id: 1, grillTX: 35, grillTY: 5,  seats: [{ tx: 33, ty: 4, dir: 0 }, { tx: 33, ty: 6, dir: 1 }, { tx: 38, ty: 4, dir: 0 }, { tx: 38, ty: 6, dir: 1 }], claimedBy: null, state: 'empty' },
  { id: 2, grillTX: 24, grillTY: 14, seats: [{ tx: 22, ty: 13, dir: 0 }, { tx: 22, ty: 15, dir: 1 }, { tx: 27, ty: 13, dir: 0 }, { tx: 27, ty: 15, dir: 1 }], claimedBy: null, state: 'empty' },
  { id: 3, grillTX: 35, grillTY: 14, seats: [{ tx: 33, ty: 13, dir: 0 }, { tx: 33, ty: 15, dir: 1 }, { tx: 38, ty: 13, dir: 0 }, { tx: 38, ty: 15, dir: 1 }], claimedBy: null, state: 'empty' },
];

// ===================== CONFIG =====================
const FD_NPC_CONFIG = {
  maxParties: 4,
  spawnInterval: [300, 600],  // 5-10s
  baseSpeed: 1.0,
  speedVariance: 0.15,
  eatDuration: [600, 900],    // 10-15s
  tipChance: 0.5,
  tipAmount: [5, 15],
  hostPauseDuration: [90, 150],  // 1.5-2.5s at host stand
};

// ===================== STATE =====================
let fineDiningNPCs = [];
let fineDiningParties = [];
let _fdNPCId = 0;
let _fdPartyId = 0;
let _fdSpawnTimer = 0;
let _fdNextSpawnInterval = 600;

// ===================== HELPERS =====================
function _fdRandRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function _fdRandFromArray(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _fdTilePx(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function _fdWP(tx, ty) {
  return { tx: tx, ty: ty };
}

function _cloneFDRoute(route) {
  if (!route) return null;
  return route.map(wp => ({ tx: wp.tx, ty: wp.ty }));
}

function _pushFDRoute(route, wp) {
  if (!wp) return;
  const prev = route[route.length - 1];
  if (prev && prev.tx === wp.tx && prev.ty === wp.ty) return;
  route.push({ tx: wp.tx, ty: wp.ty });
}

function _concatFDRoutes() {
  const route = [];
  for (let i = 0; i < arguments.length; i++) {
    const segment = arguments[i];
    if (!segment) continue;
    for (const wp of segment) _pushFDRoute(route, wp);
  }
  return route;
}

// Kitchen zone check — NPCs must NOT enter kitchen interior
function _isFDKitchenZone(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx <= 19 && ty <= 20) return true;
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
  return candidates.length ? _fdRandFromArray(candidates) : -1;
}

// Get party object by id
function _getFDParty(partyId) {
  for (const p of fineDiningParties) {
    if (p.id === partyId) return p;
  }
  return null;
}

// Get NPC by id
function _getFDNPC(npcId) {
  for (const n of fineDiningNPCs) {
    if (n.id === npcId) return n;
  }
  return null;
}

// Get party leader NPC
function _getFDPartyLeader(party) {
  return _getFDNPC(party.leaderId);
}

// Get all party members
function _getFDPartyMembers(party) {
  const members = [];
  for (const id of party.members) {
    const n = _getFDNPC(id);
    if (n) members.push(n);
  }
  return members;
}

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
    { type: 'regular',  partySize: [1, 3], coverFee: 20,  tipMult: 1.0, patience: 1.2, weight: 0.40 },
    { type: 'vip',      partySize: [1, 2], coverFee: 50,  tipMult: 2.0, patience: 1.5, weight: 0.20 },
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
  const cx = corridorTX || 42;
  return _concatFDRoutes(
    [_fdWP(cx, 35)],
    [_fdWP(42, 35)],
    [_fdWP(42, 22)]
  );
}

// Host(42,22) → Table seat
function _routeFDHostToTable(tableId, seatIdx) {
  const table = FD_TABLES[tableId];
  if (!table) return [];
  const seat = table.seats[seatIdx];
  if (!seat) return [];

  const route = [];
  // Host stand down to main walkway
  route.push(_fdWP(42, 22));
  route.push(_fdWP(42, 20));

  // Determine which column the table is in
  const isRightCol = (table.grillTX >= 30);
  const isBottomRow = (table.grillTY >= 10);

  if (isRightCol) {
    // Right column tables (1, 3) — go to tx:31 gap, then approach
    route.push(_fdWP(31, 20));
    if (isBottomRow) {
      // Table 3: seats at ty:13-15
      route.push(_fdWP(31, seat.ty));
    } else {
      // Table 1: seats at ty:4-6, go north
      route.push(_fdWP(31, seat.ty));
    }
    route.push(_fdWP(seat.tx, seat.ty));
  } else {
    // Left column tables (0, 2) — go to tx:20 corridor
    route.push(_fdWP(20, 20));
    if (isBottomRow) {
      // Table 2: seats at ty:13-15
      route.push(_fdWP(20, seat.ty));
    } else {
      // Table 0: seats at ty:4-6, go north
      route.push(_fdWP(20, seat.ty));
    }
    route.push(_fdWP(seat.tx, seat.ty));
  }

  return route;
}

// Table seat → Tip Jar (through service wall door at ty:16-17, tx:18-19)
function _routeFDTableToTipJar(tableId, seatIdx) {
  const table = FD_TABLES[tableId];
  if (!table) return [];
  const seat = table.seats[seatIdx];
  if (!seat) return [];

  const route = [];
  const isRightCol = (table.grillTX >= 30);
  const isBottomRow = (table.grillTY >= 10);

  // Seat → vertical corridor
  if (isRightCol) {
    route.push(_fdWP(31, seat.ty));
    route.push(_fdWP(31, 20));
  } else {
    route.push(_fdWP(20, seat.ty));
    route.push(_fdWP(20, 20));
  }

  // Main walkway to service wall door area
  route.push(_fdWP(20, 20));
  // Through service wall door (ty:16-17 gap at tx:18-19)
  route.push(_fdWP(20, 17));
  route.push(_fdWP(18, 17));
  // Into kitchen area to tip jar
  route.push(_fdWP(16, 17));
  route.push(_fdWP(16, 21));

  return route;
}

// Table seat → Exit
function _routeFDTableToExit(tableId, seatIdx, corridorTX) {
  const table = FD_TABLES[tableId];
  if (!table) return [];
  const seat = table.seats[seatIdx];
  if (!seat) return [];
  const cx = corridorTX || 42;

  const route = [];
  const isRightCol = (table.grillTX >= 30);

  // Seat → vertical corridor
  if (isRightCol) {
    route.push(_fdWP(31, seat.ty));
    route.push(_fdWP(31, 20));
  } else {
    route.push(_fdWP(20, seat.ty));
    route.push(_fdWP(20, 20));
  }

  // Main walkway east to exit corridor
  route.push(_fdWP(42, 20));
  route.push(_fdWP(cx, 20));
  route.push(_fdWP(cx, 35));

  return route;
}

// Tip jar → Exit
function _routeFDTipJarToExit(corridorTX) {
  const cx = corridorTX || 42;
  return _concatFDRoutes(
    [_fdWP(16, 21)],
    [_fdWP(16, 17)],
    [_fdWP(18, 17)],
    [_fdWP(20, 17)],
    [_fdWP(20, 20)],
    [_fdWP(42, 20)],
    [_fdWP(cx, 35)]
  );
}

// Generic: from any tile position → Exit
function _routeFDToExit(fromTX, fromTY, corridorTX) {
  const cx = corridorTX || _fdRandRange(42, 44);
  const route = [];

  // If in kitchen zone, get out through the service wall door
  if (fromTX <= 19 && fromTY <= 20) {
    route.push(_fdWP(fromTX, 17));
    route.push(_fdWP(18, 17));
    route.push(_fdWP(20, 17));
    route.push(_fdWP(20, 20));
    route.push(_fdWP(42, 20));
    route.push(_fdWP(cx, 35));
    return route;
  }

  // In dining area — get to main walkway (ty:20)
  if (fromTY < 20) {
    // Above walkway: go to nearest vertical corridor first
    if (fromTX >= 30) {
      route.push(_fdWP(31, fromTY));
      route.push(_fdWP(31, 20));
    } else if (fromTX >= 20) {
      route.push(_fdWP(20, fromTY));
      route.push(_fdWP(20, 20));
    } else {
      route.push(_fdWP(fromTX, 20));
    }
  }

  // On or below walkway — head east to exit corridor
  route.push(_fdWP(42, 20));
  route.push(_fdWP(cx, 20));
  route.push(_fdWP(cx, 35));

  return route;
}

// ===================== ROUTE INTENT SYSTEM =====================
function _buildFDRouteFromIntent(intent, corridorTX) {
  if (!intent) return null;
  const cx = corridorTX;
  switch (intent.kind) {
    case 'exit_to_host': return _routeFDExitToHost(cx);
    case 'host_to_table': return _routeFDHostToTable(intent.tableId, intent.seatIdx);
    case 'table_to_tipjar': return _routeFDTableToTipJar(intent.tableId, intent.seatIdx);
    case 'table_to_exit': return _routeFDTableToExit(intent.tableId, intent.seatIdx, cx);
    case 'tipjar_to_exit': return _routeFDTipJarToExit(cx);
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
    case 'table_to_tipjar':
    case 'table_to_exit': {
      const table = FD_TABLES[intent.tableId];
      return table && table.seats ? table.seats[intent.seatIdx] : null;
    }
    case 'tipjar_to_exit':
      return FD_SPOTS.tipJar;
    case 'tile_to_exit':
      return { tx: intent.tx, ty: intent.ty };
    default:
      return npc && npc.route && npc.route.length ? { tx: npc.route[0].tx, ty: npc.route[0].ty } : null;
  }
}

function _recoverFDNPC(npc) {
  if (npc._recoveryTried) return false;

  npc._recoveryTried = true;

  const intent = npc._routeIntent;
  const party = _getFDParty(npc.partyId);
  const cx = party ? party.corridorTX : undefined;
  let route = _buildFDRouteFromIntent(intent, cx);
  let anchor = _getFDIntentAnchor(intent, npc);

  if ((!route || route.length === 0) && _isFDKitchenZone(npc.x, npc.y)) {
    anchor = { tx: 20, ty: 20 };
    route = _routeFDToExit(anchor.tx, anchor.ty, cx);
    npc._routeIntent = { kind: 'tile_to_exit', tx: anchor.tx, ty: anchor.ty };
  }

  if (!anchor || !route || route.length === 0) return false;

  const pos = _fdTilePx(anchor.tx, anchor.ty);
  npc.x = pos.x;
  npc.y = pos.y;
  npc.route = _cloneFDRoute(route);
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
  npc._stuckFrames = 0;
  return true;
}

// ===================== MOVEMENT =====================
function moveFDNPC(npc) {
  if (!npc.route || npc.route.length === 0) {
    npc.moving = false;
    return;
  }

  const wp = npc.route[0];
  const targetX = wp.tx * TILE + TILE / 2;
  const targetY = wp.ty * TILE + TILE / 2;
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
  for (const other of fineDiningNPCs) {
    if (other === npc) continue;
    // Skip seated/despawning NPCs
    if (other.state === 'eating' || other.state === 'seated' ||
        other.state === 'waiting_cook' || other.state === 'watching_cook' ||
        other.state === 'at_host' || other.state === '_despawn') continue;
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
        if (!_isFDKitchenZone(testX, testY) &&
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
  if (_isFDKitchenZone(nextX, nextY)) {
    if (_isFDKitchenZone(npc.x, npc.y)) {
      // Already in kitchen — teleport out
      npc.x = 20 * TILE + TILE / 2;
      npc.y = 20 * TILE + TILE / 2;
      npc._stuckFrames = 0;
      npc.route = [_fdWP(42, 20), _fdWP(42, 35)];
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
function _spawnFDNPC(partyId, isLeader, corridorTX) {
  const app = _fdRandFromArray(FD_NPC_APPEARANCES);
  const spawnTX = corridorTX || FD_SPOTS.exit.tx;
  const npc = {
    id: ++_fdNPCId,
    x: spawnTX * TILE + TILE / 2,
    y: FD_SPOTS.exit.ty * TILE + TILE / 2,
    dir: 1, frame: 0, moving: false,
    skin: app.skin, hair: app.hair, shirt: app.shirt, pants: app.pants,
    name: _fdRandFromArray(FD_NPC_NAMES),
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
    _stuckFrames: 0,
    _idleTime: 0,
    _recoveryTried: false,
    _routeIntent: null,
    speed: FD_NPC_CONFIG.baseSpeed + (Math.random() - 0.5) * FD_NPC_CONFIG.speedVariance * 2,
    isFineDiningNPC: true,
  };
  fineDiningNPCs.push(npc);
  return npc;
}

function _fdNPCStartRoute(npc, route, nextState, nextTimer, intent) {
  npc.route = _cloneFDRoute(route);
  npc._nextState = nextState;
  npc._nextTimer = nextTimer || 0;
  npc._routeIntent = intent || null;
  npc._recoveryTried = false;
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
}

function spawnFineDiningParty() {
  const customerType = _pickFDCustomerType();
  const sizeRange = customerType.partySize || [1, 4];
  const partySize = _fdRandRange(sizeRange[0], sizeRange[1]);
  const tableIdx = _findFreeTable(partySize);
  if (tableIdx < 0) return null; // no free table

  const partyId = ++_fdPartyId;
  const table = FD_TABLES[tableIdx];
  table.claimedBy = partyId;
  table.state = 'claimed';

  // Each party gets a random corridor column (42-44) so they don't all walk single-file
  const corridorTX = _fdRandRange(42, 44);

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
    npc.customerType = customerType.type; // for VIP/celebrity rendering
    party.members.push(npc.id);
    if (i === 0) party.leaderId = npc.id;

    // Assign seat at table
    npc.claimedSeatIdx = i;
    party.seatAssignments.push(i);

    // Stagger entry — followers enter a bit behind the leader
    if (i > 0) {
      npc.state = 'spawn_wait';
      npc.stateTimer = i * 40; // ~0.67 sec stagger
    }
  }

  fineDiningParties.push(party);
  return party;
}

// ===================== INIT =====================
function initFineDiningNPCs() {
  fineDiningNPCs.length = 0;
  fineDiningParties.length = 0;
  _fdNPCId = 0;
  _fdPartyId = 0;
  _fdSpawnTimer = 0;
  _fdNextSpawnInterval = 600;
  // Reset tables
  for (const t of FD_TABLES) {
    t.claimedBy = null;
    t.state = 'empty';
  }
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

function _buildFDTipPlan(npc, party) {
  if (party && npc.claimedSeatIdx >= 0) {
    return {
      route: _routeFDTableToTipJar(party.tableId, npc.claimedSeatIdx),
      intent: { kind: 'table_to_tipjar', tableId: party.tableId, seatIdx: npc.claimedSeatIdx },
    };
  }
  const curTX = Math.floor(npc.x / TILE);
  const curTY = Math.floor(npc.y / TILE);
  return {
    route: _routeFDToExit(curTX, curTY),
    intent: null,
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
    _fdNPCStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Release table
  if (table) {
    table.claimedBy = null;
    table.state = 'empty';
  }
  party.state = 'leaving';
}

// Post-meal exit: leader tips (maybe), all leave
function _triggerFDPartyPostMealExit(party) {
  const leader = _getFDPartyLeader(party);
  const members = _getFDPartyMembers(party);

  // Leader tips (50% chance)
  if (leader && !leader.hasTipped && Math.random() < FD_NPC_CONFIG.tipChance) {
    const tipPlan = _buildFDTipPlan(leader, party);
    _fdNPCStartRoute(leader, tipPlan.route, 'tipping', 0, tipPlan.intent);
  } else if (leader) {
    const exitPlan = _buildFDExitPlan(leader);
    _fdNPCStartRoute(leader, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Non-leaders leave directly
  for (const m of members) {
    if (m.id === party.leaderId) continue;
    if (m.state === '_despawn' || m.state === '_despawn_walk') continue;
    m.hasFood = false;
    const exitPlan = _buildFDExitPlan(m);
    _fdNPCStartRoute(m, exitPlan.route, '_despawn', 0, exitPlan.intent);
  }

  // Release table
  const table = FD_TABLES[party.tableId];
  if (table) {
    table.claimedBy = null;
    table.state = 'empty';
  }
  party.state = 'leaving';
}

// Generate a ticket for this party (called when seated)
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

// ===================== AI STATE HANDLERS =====================

const FD_NPC_AI = {

  // ─── SPAWN_WAIT: Staggered delay before entering ───────
  spawn_wait: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    npc.state = 'entering';
  },

  // ─── ENTERING: Walk from exit/spawn to host stand ──────
  entering: (npc) => {
    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeFDExitToHost(party.corridorTX);
    _fdNPCStartRoute(npc, route, 'at_host', _fdRandRange(FD_NPC_CONFIG.hostPauseDuration[0], FD_NPC_CONFIG.hostPauseDuration[1]), { kind: 'exit_to_host' });
  },

  // ─── AT_HOST: Pause at host stand, cover fee, claim table ──
  at_host: (npc) => {
    npc.moving = false;
    npc.dir = 2; // face left (toward dining area)

    // Snap to host stand
    npc.x = FD_SPOTS.hostStand.tx * TILE + TILE / 2;
    npc.y = FD_SPOTS.hostStand.ty * TILE + TILE / 2;

    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    // Only leader handles cover fee + transition
    if (npc.isLeader) {
      // Charge cover fee
      const coverFee = party.customerType.coverFee || 20;
      if (typeof gold !== 'undefined') gold += coverFee;

      // Track earnings
      if (typeof cookingState !== 'undefined' && cookingState.stats) {
        cookingState.stats.totalEarned = (cookingState.stats.totalEarned || 0) + coverFee;
      }

      // Show hit effect popup
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: npc.x, y: npc.y - 40,
          life: 45, maxLife: 45,
          type: 'heal',
          dmg: '+ $' + coverFee + ' Cover Fee',
        });
      }

      // Transition all party members to walk to table
      const members = _getFDPartyMembers(party);
      for (const m of members) {
        if (m.state === 'at_host' || m.state === 'entering' || m.state === 'walking') {
          m.state = 'walking_to_table';
        }
      }
      party.state = 'seating';
    }
  },

  // ─── WALKING_TO_TABLE: Walk to assigned table seat ─────
  walking_to_table: (npc) => {
    const party = _getFDParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeFDHostToTable(party.tableId, npc.claimedSeatIdx);
    if (!route.length) { npc.state = '_despawn'; return; }

    _fdNPCStartRoute(
      npc,
      route,
      'seated',
      0,
      { kind: 'host_to_table', tableId: party.tableId, seatIdx: npc.claimedSeatIdx }
    );
  },

  // ─── SEATED: Just arrived at seat, generate order ──────
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

    // Only leader generates the ticket
    if (npc.isLeader) {
      _generateFDTicket(party);
      table.state = 'waiting';

      // All seated members → waiting_cook
      const members = _getFDPartyMembers(party);
      for (const m of members) {
        if (m.state === 'seated') {
          m.state = 'waiting_cook';
          m._idleTime = 0;
        }
      }
      party.state = 'waiting_cook';
    } else {
      // Non-leaders just wait for leader to trigger transition
      npc.state = 'waiting_cook';
      npc._idleTime = 0;
    }
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

  // ─── POST_MEAL: Decide post-meal behavior ─────────────
  post_meal: (npc) => {
    npc.moving = false;
    const party = _getFDParty(npc.partyId);
    if (!party) {
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _fdNPCStartRoute(npc, _routeFDToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
      return;
    }

    // Wait for all party members to finish eating
    const members = _getFDPartyMembers(party);
    const allDone = members.every(m => m.state === 'post_meal' || m.state === 'leaving' || m.state === '_despawn');
    if (!allDone) return; // wait

    // Only the leader decides for the party
    if (!npc.isLeader) return;

    // Trigger tip or leave
    _triggerFDPartyPostMealExit(party);
  },

  // ─── TIPPING: Leader at tip jar ────────────────────────
  tipping: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    if (!npc.hasTipped) {
      npc.hasTipped = true;
      npc.stateTimer = 60; // pause ~1 sec
      const tipAmt = _fdRandRange(FD_NPC_CONFIG.tipAmount[0], FD_NPC_CONFIG.tipAmount[1]);
      if (typeof cookingState !== 'undefined' && cookingState.active) {
        cookingState.tipJar = (cookingState.tipJar || 0) + tipAmt;
      } else {
        if (typeof gold !== 'undefined') gold += tipAmt;
      }
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: npc.x, y: npc.y - 40, life: 30, maxLife: 30, type: 'heal', dmg: 'Tip +$' + tipAmt });
      }
      // Track in stats
      if (typeof cookingState !== 'undefined' && cookingState.stats) {
        cookingState.stats.totalEarned = (cookingState.stats.totalEarned || 0) + tipAmt;
      }
      return;
    }

    // After tipping, leave
    const party = _getFDParty(npc.partyId);
    const cx = party ? party.corridorTX : undefined;
    _fdNPCStartRoute(npc, _routeFDTipJarToExit(cx), '_despawn', 0, { kind: 'tipjar_to_exit' });
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
  party.state = 'watching_cook';
}

// Called by cookingSystem/grillState when cooking is complete at a table
function notifyFDTableCookingComplete(tableId) {
  const table = FD_TABLES[tableId];
  if (!table || table.claimedBy === null) return;
  const party = _getFDParty(table.claimedBy);
  if (!party) return;
  const members = _getFDPartyMembers(party);
  for (const m of members) {
    if (m.state === 'watching_cook' || m.state === 'waiting_cook') {
      m.state = 'eating';
      m.hasFood = true;
      m.stateTimer = _fdRandRange(FD_NPC_CONFIG.eatDuration[0], FD_NPC_CONFIG.eatDuration[1]);
      // Store recipe ingredients for food visual
      if (typeof cookingState !== 'undefined' && cookingState.currentOrder && cookingState.currentOrder.recipe) {
        m._recipeIngredients = cookingState.currentOrder.recipe.ingredients.slice();
      }
    }
  }
  table.state = 'eating';
  party.state = 'eating';
}

// ===================== MAIN UPDATE =====================
function updateFineDiningNPCs() {
  if (typeof Scene === 'undefined' || !Scene.inCooking) return;
  if (typeof cookingState === 'undefined' || cookingState.activeRestaurantId !== 'fine_dining') return;

  // Spawn parties on timer
  _fdSpawnTimer++;
  if (_fdSpawnTimer >= _fdNextSpawnInterval) {
    _fdSpawnTimer = 0;
    _fdNextSpawnInterval = _fdRandRange(FD_NPC_CONFIG.spawnInterval[0], FD_NPC_CONFIG.spawnInterval[1]);

    // Count active parties (not fully despawned)
    const activeParties = fineDiningParties.filter(p => p.state !== 'done').length;
    if (activeParties < FD_NPC_CONFIG.maxParties && fineDiningNPCs.length < 16) {
      spawnFineDiningParty();
    }
  }

  // Update each NPC
  for (let i = fineDiningNPCs.length - 1; i >= 0; i--) {
    const npc = fineDiningNPCs[i];
    const prevState = npc.state;

    // Run state handler
    const handler = FD_NPC_AI[npc.state];
    if (handler) handler(npc);

    // Reset idle timer on state change
    if (npc.state !== prevState) npc._idleTime = 0;

    // Move along route (walking state)
    if (npc.state === 'walking') {
      moveFDNPC(npc);
    }

    // Universal idle safety net — 60+ sec in non-seated/non-eating states → force exit
    if (npc.state !== '_despawn' && npc.state !== '_despawn_walk' &&
        npc.state !== 'walking' && npc.state !== 'eating' &&
        npc.state !== 'seated' && npc.state !== 'waiting_cook' &&
        npc.state !== 'watching_cook' && npc.state !== 'at_host' &&
        npc.state !== 'spawn_wait' &&
        (npc._idleTime || 0) >= 3600) {
      npc._idleTime = 0;
      npc.hasFood = false;
      npc.linkedOrderId = null;
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _fdNPCStartRoute(npc, _routeFDToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
    }

    // Stuck detection — blocked 1+ second → abandon route, head to exit
    if ((npc._stuckFrames || 0) >= 60 && npc.state !== '_despawn' && npc.state !== '_despawn_walk') {
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
        _fdNPCStartRoute(npc, _routeFDToExit(curTX, curTY), '_despawn', 0, { kind: 'tile_to_exit', tx: curTX, ty: curTY });
      }
    }

    // Despawn
    if (npc.state === '_despawn') {
      npc.hasFood = false;
      npc.linkedOrderId = null;
      fineDiningNPCs.splice(i, 1);
    }
  }

  // Clean up fully-despawned parties
  for (let i = fineDiningParties.length - 1; i >= 0; i--) {
    const party = fineDiningParties[i];
    const anyAlive = party.members.some(id => _getFDNPC(id) !== null);
    if (!anyAlive) {
      // Release table if still claimed
      const table = FD_TABLES[party.tableId];
      if (table && table.claimedBy === party.id) {
        table.claimedBy = null;
        table.state = 'empty';
      }
      party.state = 'done';
      fineDiningParties.splice(i, 1);
    }
  }
}
