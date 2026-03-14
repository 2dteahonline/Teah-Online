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
  exit:        { tx: 27, ty: 33 },
  counterArea: { tx: 27, ty: 16 },
  counter:     { tx: 13, ty: 16 },
  tipJar:      { tx: 17, ty: 16 },
};

// ===================== BOOTHS =====================
// 6 booths in dining area (right side)
// 3 left column (tx: 27-32), 3 right column (tx: 38-43)
const DINER_BOOTHS = [
  // Left column
  { id: 0, tx: 27, ty: 2,  w: 5, h: 3, seats: [{ tx: 28, ty: 2, sitDir: 0 }, { tx: 30, ty: 2, sitDir: 0 }, { tx: 28, ty: 4, sitDir: 1 }, { tx: 30, ty: 4, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 1, tx: 27, ty: 6,  w: 5, h: 3, seats: [{ tx: 28, ty: 6, sitDir: 0 }, { tx: 30, ty: 6, sitDir: 0 }, { tx: 28, ty: 8, sitDir: 1 }, { tx: 30, ty: 8, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 2, tx: 27, ty: 10, w: 5, h: 3, seats: [{ tx: 28, ty: 10, sitDir: 0 }, { tx: 30, ty: 10, sitDir: 0 }, { tx: 28, ty: 12, sitDir: 1 }, { tx: 30, ty: 12, sitDir: 1 }], capacity: 4, claimedBy: null },
  // Right column
  { id: 3, tx: 38, ty: 2,  w: 5, h: 3, seats: [{ tx: 39, ty: 2, sitDir: 0 }, { tx: 41, ty: 2, sitDir: 0 }, { tx: 39, ty: 4, sitDir: 1 }, { tx: 41, ty: 4, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 4, tx: 38, ty: 6,  w: 5, h: 3, seats: [{ tx: 39, ty: 6, sitDir: 0 }, { tx: 41, ty: 6, sitDir: 0 }, { tx: 39, ty: 8, sitDir: 1 }, { tx: 41, ty: 8, sitDir: 1 }], capacity: 4, claimedBy: null },
  { id: 5, tx: 38, ty: 10, w: 5, h: 3, seats: [{ tx: 39, ty: 10, sitDir: 0 }, { tx: 41, ty: 10, sitDir: 0 }, { tx: 39, ty: 12, sitDir: 1 }, { tx: 41, ty: 12, sitDir: 1 }], capacity: 4, claimedBy: null },
];

// ===================== ARCADE SPOTS =====================
const DINER_ARCADE_SPOTS = [
  { tx: 45, ty: 4, claimedBy: null },
  { tx: 48, ty: 4, claimedBy: null },
];

// ===================== CONFIG =====================
const DINER_NPC_CONFIG = {
  maxParties: 4,
  spawnInterval: [400, 1200],
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

// ===================== HELPERS =====================
function _dinerRandRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function _dinerRandFromArray(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _dinerTilePx(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
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
  for (let i = 0; i < DINER_BOOTHS.length; i++) {
    if (DINER_BOOTHS[i].claimedBy === null && DINER_BOOTHS[i].capacity >= partySize) {
      return i;
    }
  }
  return -1;
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

// ===================== ROUTE BUILDERS =====================
// All legs are horizontal or vertical to prevent clipping through solids.
//
// SAFE CORRIDORS in the diner:
//   ty: 14  — horizontal corridor between kitchen and dining (main walkway)
//   tx: 26  — vertical corridor between kitchen wall and booths
//   tx: 35-37 — gap between left and right booth columns
//   ty: 14  — main horizontal corridor

function _routeDinerExitToBooth(boothId) {
  const booth = DINER_BOOTHS[boothId];
  // Exit (27,33) → north to corridor (27,14) → west/east to booth column → north to booth
  const route = [];
  route.push({ tx: 27, ty: 14 });           // north to main corridor
  if (booth.tx >= 38) {
    // Right column booth — go east through gap
    route.push({ tx: 36, ty: 14 });          // east to gap
    route.push({ tx: 36, ty: booth.ty + 1 }); // north to booth row
    route.push({ tx: booth.seats[0].tx, ty: booth.seats[0].tx === booth.seats[0].tx ? booth.ty + 1 : booth.ty + 1 });
  } else {
    // Left column booth — go to tx:26 corridor then north
    route.push({ tx: 26, ty: 14 });          // west to corridor
    route.push({ tx: 26, ty: booth.ty + 1 }); // north to booth row
  }
  return route;
}

function _routeDinerNPCToSeat(npc, booth, seatIdx) {
  // From booth entrance area, walk to specific seat
  const seat = booth.seats[seatIdx];
  return [{ tx: seat.tx, ty: seat.ty }];
}

function _routeDinerBoothToCounter(boothId) {
  const booth = DINER_BOOTHS[boothId];
  const route = [];
  // From booth area → south to corridor → west to counter
  if (booth.tx >= 38) {
    // Right column → go to gap → south to corridor
    route.push({ tx: 36, ty: booth.ty + 1 });
    route.push({ tx: 36, ty: 14 });
  } else {
    // Left column → go to tx:26 → south to corridor
    route.push({ tx: 26, ty: booth.ty + 1 });
    route.push({ tx: 26, ty: 14 });
  }
  route.push({ tx: 26, ty: 16 });   // south to counter corridor
  route.push({ tx: 13, ty: 16 });   // west to counter
  return route;
}

function _routeDinerCounterToBooth(boothId) {
  const booth = DINER_BOOTHS[boothId];
  const route = [];
  route.push({ tx: 26, ty: 16 });   // east from counter to corridor
  route.push({ tx: 26, ty: 14 });   // north to main corridor
  if (booth.tx >= 38) {
    route.push({ tx: 36, ty: 14 });
    route.push({ tx: 36, ty: booth.ty + 1 });
  } else {
    route.push({ tx: 26, ty: booth.ty + 1 });
  }
  return route;
}

function _routeDinerBoothToArcade(boothId, arcadeIdx) {
  const booth = DINER_BOOTHS[boothId];
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  const route = [];
  if (booth.tx >= 38) {
    route.push({ tx: 36, ty: booth.ty + 1 });
    route.push({ tx: 36, ty: 14 });
  } else {
    route.push({ tx: 26, ty: booth.ty + 1 });
    route.push({ tx: 26, ty: 14 });
  }
  // Arcade is at top-right area
  route.push({ tx: 36, ty: 14 });
  route.push({ tx: 36, ty: spot.ty });
  route.push({ tx: spot.tx, ty: spot.ty });
  return route;
}

function _routeDinerArcadeToBooth(arcadeIdx, boothId) {
  const spot = DINER_ARCADE_SPOTS[arcadeIdx];
  const booth = DINER_BOOTHS[boothId];
  const route = [];
  route.push({ tx: 36, ty: spot.ty });
  route.push({ tx: 36, ty: 14 });
  if (booth.tx >= 38) {
    route.push({ tx: 36, ty: booth.ty + 1 });
  } else {
    route.push({ tx: 26, ty: 14 });
    route.push({ tx: 26, ty: booth.ty + 1 });
  }
  return route;
}

function _routeDinerToExit(fromTX, fromTY) {
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
  route.push({ tx: 27, ty: 14 });    // east to exit column
  route.push({ tx: 27, ty: 33 });    // south to exit
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

// ===================== ROUTE-BASED MOVEMENT =====================
function _dinerNPCStartRoute(npc, route, nextState, nextTimer) {
  npc.route = route;
  npc._nextState = nextState;
  npc._nextTimer = nextTimer || 0;
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
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
        other.state === 'waiting_food') continue;
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
      npc.route = [{ tx: 27, ty: 16 }, { tx: 27, ty: 33 }];
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
function _spawnDinerNPC(partyId, isLeader) {
  const app = _dinerRandFromArray(DINER_NPC_APPEARANCES);
  const sp = DINER_SPOTS.exit;
  const npc = {
    id: ++_dinerNPCId,
    x: sp.tx * TILE + TILE / 2,
    y: sp.ty * TILE + TILE / 2,
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

function spawnDinerParty() {
  const partySize = _dinerRandRange(1, 3);
  const boothIdx = _findFreeBooth(partySize);
  if (boothIdx < 0) return null; // no free booth

  const partyId = ++_dinerPartyId;
  const booth = DINER_BOOTHS[boothIdx];
  booth.claimedBy = partyId;

  const party = {
    id: partyId,
    members: [],
    leaderId: -1,
    boothId: boothIdx,
    state: 'entering',
  };

  // Create NPCs — first is leader
  for (let i = 0; i < partySize; i++) {
    const npc = _spawnDinerNPC(partyId, i === 0);
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

    const booth = DINER_BOOTHS[party.boothId];
    const route = _routeDinerExitToBooth(party.boothId);

    _dinerNPCStartRoute(npc, route, 'seating', 0);
  },

  // ─── SEATING: Walk to individual seat in booth ─────────
  seating: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const booth = DINER_BOOTHS[party.boothId];
    const seat = booth.seats[npc.claimedSeatIdx];
    if (!seat) { npc.state = '_despawn'; return; }

    _dinerNPCStartRoute(npc, [{ tx: seat.tx, ty: seat.ty }], 'menu_reading',
      _dinerRandRange(DINER_NPC_CONFIG.menuReadDuration[0], DINER_NPC_CONFIG.menuReadDuration[1]));
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

    // Leader goes to order, others wait
    if (npc.isLeader) {
      npc.state = 'go_order';
    } else {
      npc.state = 'waiting_at_booth';
      npc._idleTime = 0;
    }
  },

  // ─── GO_ORDER: Leader walks to counter ─────────────────
  go_order: (npc) => {
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const route = _routeDinerBoothToCounter(party.boothId);
    _dinerNPCStartRoute(npc, route, 'ordering', 0);
  },

  // ─── ORDERING: Leader at counter, waiting for cookingSystem to link order ─
  ordering: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    npc._idleTime = (npc._idleTime || 0) + 1;
    // Snap to counter
    npc.x = DINER_SPOTS.counter.tx * TILE + TILE / 2;
    npc.y = DINER_SPOTS.counter.ty * TILE + TILE / 2;

    // cookingSystem spawnOrder() will find this NPC and link the order
    // If shift ends while waiting, leave
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      npc.hasOrdered = true;
      const party = _getDinerParty(npc.partyId);
      if (party) {
        _triggerPartyLeave(party);
      } else {
        _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0);
      }
      return;
    }

    // Patience timeout — leave after 15 sec if order never linked
    if (npc._idleTime >= 900) {
      npc.hasOrdered = true;
      const party = _getDinerParty(npc.partyId);
      if (party) {
        _triggerPartyLeave(party);
      } else {
        _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0);
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
      const party = _getDinerParty(npc.partyId);
      if (party) _triggerPartyLeave(party);
      else _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0);
      return;
    }

    // Patience timeout — leave angry after 30 sec
    if (npc._idleTime >= 1800) {
      npc.linkedOrderId = null;
      const party = _getDinerParty(npc.partyId);
      if (party) _triggerPartyLeave(party);
      else _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0);
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
      else _dinerNPCStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0);
    }
  },

  // ─── PICKUP_FOOD: Leader got food, routes back to booth ─
  pickup_food: (npc) => {
    if (npc.stateTimer > 0) { npc.stateTimer--; npc.moving = false; return; }

    npc.hasOrdered = true;
    npc.hasFood = true;

    const party = _getDinerParty(npc.partyId);
    if (!party) {
      _dinerNPCStartRoute(npc, _routeDinerToExit(13, 16), '_despawn', 0);
      return;
    }

    const route = _routeDinerCounterToBooth(party.boothId);
    _dinerNPCStartRoute(npc, route, 'return_to_booth', 0);
  },

  // ─── RETURN_TO_BOOTH: Leader walking back with food ────
  return_to_booth: (npc) => {
    // Walk to seat
    const party = _getDinerParty(npc.partyId);
    if (!party) { npc.state = '_despawn'; return; }

    const booth = DINER_BOOTHS[party.boothId];
    const seat = booth.seats[npc.claimedSeatIdx];
    if (!seat) { npc.state = '_despawn'; return; }

    _dinerNPCStartRoute(npc, [{ tx: seat.tx, ty: seat.ty }], 'eating',
      _dinerRandRange(DINER_NPC_CONFIG.eatDuration[0], DINER_NPC_CONFIG.eatDuration[1]));

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
      _dinerNPCStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0);
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
    const route = _routeDinerBoothToArcade(party.boothId, npc._claimedArcadeIdx);
    _dinerNPCStartRoute(npc, route, 'arcade_playing',
      _dinerRandRange(DINER_NPC_CONFIG.arcadeDuration[0], DINER_NPC_CONFIG.arcadeDuration[1]));
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
      _dinerNPCStartRoute(npc, _routeDinerToExit(Math.floor(npc.x / TILE), Math.floor(npc.y / TILE)), '_despawn', 0);
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
    _dinerNPCStartRoute(npc, _routeDinerToExit(17, 16), '_despawn', 0);
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

// Trigger the whole party to leave (walk to exit → despawn)
function _triggerPartyLeave(party) {
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

    const curTX = Math.floor(m.x / TILE);
    const curTY = Math.floor(m.y / TILE);
    _dinerNPCStartRoute(m, _routeDinerToExit(curTX, curTY), '_despawn', 0);
  }

  // Release booth
  if (booth) booth.claimedBy = null;
  party.state = 'leaving';
}

// Post-meal exit: leader tips (maybe), all leave
function _triggerPartyPostMealExit(party) {
  const leader = _getPartyLeader(party);
  const members = _getPartyMembers(party);

  // Leader tips (40% chance)
  if (leader && !leader.hasTipped && Math.random() < DINER_NPC_CONFIG.tipChance) {
    const curTX = Math.floor(leader.x / TILE);
    const curTY = Math.floor(leader.y / TILE);
    _dinerNPCStartRoute(leader, _routeDinerToTipJar(curTX, curTY), 'tipping', 0);
  } else if (leader) {
    const curTX = Math.floor(leader.x / TILE);
    const curTY = Math.floor(leader.y / TILE);
    _dinerNPCStartRoute(leader, _routeDinerToExit(curTX, curTY), '_despawn', 0);
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
    const curTX = Math.floor(m.x / TILE);
    const curTY = Math.floor(m.y / TILE);
    _dinerNPCStartRoute(m, _routeDinerToExit(curTX, curTY), '_despawn', 0);
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
        (npc._idleTime || 0) >= 3600) {
      npc._idleTime = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _dinerNPCStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0);
    }

    // Stuck detection — blocked 1+ second → abandon route, head to exit
    if ((npc._stuckFrames || 0) >= 60 && npc.state !== '_despawn' && npc.state !== '_despawn_walk') {
      npc._stuckFrames = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc._claimedArcadeIdx >= 0) {
        DINER_ARCADE_SPOTS[npc._claimedArcadeIdx].claimedBy = null;
        npc._claimedArcadeIdx = -1;
      }
      // If stuck in kitchen, teleport to safe corridor
      if (_isDinerKitchenZone(npc.x, npc.y)) {
        npc.x = 26 * TILE + TILE / 2;
        npc.y = 16 * TILE + TILE / 2;
      }
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _dinerNPCStartRoute(npc, _routeDinerToExit(curTX, curTY), '_despawn', 0);
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
