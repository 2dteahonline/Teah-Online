// ===================== DELI NPC SYSTEM =====================
// Customer NPCs that line up, order food, sit at tables, buy extras.
// NO pathfinding — straight-line movement between defined waypoints.
//
// Two NPC roles:
//   meal (70%)   — enter → queue → order → wait → receive → condiments → eat → leave
//   retail (30%) — enter → walk to shelf → browse → cashier → pay → leave

// ===================== APPEARANCE POOL =====================
const DELI_NPC_APPEARANCES = [
  { skin: '#d4a574', hair: '#3a2a1a', shirt: '#4060a0', pants: '#3a3a50' },
  { skin: '#8d5524', hair: '#1a1a1a', shirt: '#a04040', pants: '#2a3a4a' },
  { skin: '#f0c8a0', hair: '#c08040', shirt: '#40a060', pants: '#4a4a5a' },
  { skin: '#c68642', hair: '#4a3020', shirt: '#d0a040', pants: '#3a4a3a' },
  { skin: '#e0b890', hair: '#8a6a40', shirt: '#6040a0', pants: '#3a3a4a' },
  { skin: '#a0764a', hair: '#2a1a0a', shirt: '#a06030', pants: '#4a3a30' },
  { skin: '#f5d0a0', hair: '#d0a060', shirt: '#306060', pants: '#504040' },
  { skin: '#b5835a', hair: '#1a1010', shirt: '#808080', pants: '#2a2a3a' },
];
const DELI_NPC_NAMES = ['Customer', 'Patron', 'Guest', 'Visitor', 'Diner', 'Shopper', 'Regular', 'Foodie'];

// ===================== DEFINED SPOTS =====================
// All positions are tile coords. NPCs walk in straight lines between these.
// Every spot is in open floor — no collision checking needed.

const DELI_SPOTS = {
  exit:        { tx: 13, ty: 30 },
  counterArea: { tx: 13, ty: 22 },   // corridor in front of counter
  counter:     { tx: 11, ty: 22 },   // pickup/order spot
  corridorE:   { tx: 25, ty: 22 },   // east end — past the counter wall
  diningEntry: { tx: 26, ty: 20 },   // gap into dining area
  condiments:  { tx: 35, ty: 13 },   // south side of condiment table
};

// Queue line — south from counter (vertical line at tx:11, same as ordering spot)
const QUEUE_SPOTS = [
  { tx: 11, ty: 22 },  // spot 0 = at counter (front of line)
  { tx: 11, ty: 23 },
  { tx: 11, ty: 24 },
  { tx: 11, ty: 25 },  // spot 3 = back of line (4 max)
];

// Chairs (NPCs sit here to eat) — 2 per side × 4 sides × 2 tables = 16 seats
const DELI_CHAIRS = [
  // Table 1 (28,4)
  { tx: 27, ty: 4,  sitDir: 3 },  { tx: 27, ty: 5,  sitDir: 3 },   // left ×2
  { tx: 31, ty: 4,  sitDir: 2 },  { tx: 31, ty: 5,  sitDir: 2 },   // right ×2
  { tx: 28, ty: 3,  sitDir: 0 },  { tx: 30, ty: 3,  sitDir: 0 },   // top ×2
  { tx: 28, ty: 6,  sitDir: 1 },  { tx: 30, ty: 6,  sitDir: 1 },   // bottom ×2
  // Table 2 (28,17)
  { tx: 27, ty: 17, sitDir: 3 },  { tx: 27, ty: 18, sitDir: 3 },
  { tx: 31, ty: 17, sitDir: 2 },  { tx: 31, ty: 18, sitDir: 2 },
  { tx: 28, ty: 16, sitDir: 0 },  { tx: 30, ty: 16, sitDir: 0 },
  { tx: 28, ty: 19, sitDir: 1 },  { tx: 30, ty: 19, sitDir: 1 },
];

// Aisle browse spots — 4 shelves, NPCs stand at ty:27 (below shelf row)
const DELI_AISLES = [
  { name: 'Frozen',  price: 4, tx: 27, ty: 27 },
  { name: 'Snacks',  price: 3, tx: 30, ty: 27 },
  { name: 'Candy',   price: 2, tx: 33, ty: 27 },
  { name: 'Bevs',    price: 3, tx: 36, ty: 27 },
];

// Cashier spot for retail shoppers
const DELI_CASHIER = { tx: 40, ty: 24 };

// ===================== CONFIG =====================
const DELI_NPC_CONFIG = {
  minNPCs: 0,
  maxNPCs: 4,
  spawnInterval: [180, 540],   // 3-9 sec randomized range (frames at 60fps)
  baseSpeed: 1.1,              // slow relaxed stroll
  speedVariance: 0.2,
  eatDuration:    [900, 900],  // 15 sec at 60fps
  browseDuration: [480, 900],   // 8-15 sec browsing at an aisle
  condimentTime:  [300, 480],   // 5-8 sec at condiments
  condimentChance: 0.5,
  aisleChance:     0.7,        // chance to browse aisles after eating (meal customers)
};

// ===================== STATE =====================
const deliNPCs = [];
const _deliIdCounter = { value: 0 };
const _deliSpawnState = { timer: 0, nextInterval: 600 };

// Queue advancement delay — frames remaining before next NPC can advance to ordering
let _queueAdvanceDelay = 0;

// ===================== HELPERS =====================
// _cRandRange, _cRandFromArray, _cTilePx provided by cookingNPCBase.js

// Kitchen zone check — NPCs must not enter kitchen interior or door
function _isKitchenZone(px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  // Kitchen interior: tx 0-23, ty 0-20
  if (tx <= 23 && ty <= 20) return true;
  // Kitchen door: tx 24, ty 19-20 (prevent NPCs standing in doorway)
  if (tx === 24 && ty >= 19 && ty <= 20) return true;
  return false;
}

// Pick an aisle spot that no other NPC is currently browsing at
function _pickFreeAisle() {
  const occupied = new Set();
  for (const n of deliNPCs) {
    if (n.state === 'shopping_aisle' || n.state === 'browsing_shelf') {
      const ntx = Math.floor(n.x / TILE);
      const nty = Math.floor(n.y / TILE);
      for (let i = 0; i < DELI_AISLES.length; i++) {
        if (DELI_AISLES[i].tx === ntx && DELI_AISLES[i].ty === nty) {
          occupied.add(i);
          break;
        }
      }
    }
  }
  const free = [];
  for (let i = 0; i < DELI_AISLES.length; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return _cRandFromArray(DELI_AISLES); // all taken, fallback
  return DELI_AISLES[free[Math.floor(Math.random() * free.length)]];
}

// ===================== ROUTE BUILDERS =====================
// Build arrays of {tx,ty} waypoints. ALL legs are horizontal or vertical
// to prevent NPCs clipping through solid entities.
//
// LAYOUT — AISLE AREA (tx:27+, ty:22+):
//   Shelf row: ty:24-25 → shelves at tx:27-31, tx:34-38
//   Browse row: ty:27   → NPCs stand here to browse shelves
//
// GAPS between shelves (safe vertical corridors through aisle area):
//   tx:26  — west of all shelves (main corridor)
//   tx:32-33 — between shelf columns
//
// SAFE CORRIDORS:
//   tx:26  vertical  ty:1-30   (just east of kitchen wall — main N/S corridor)
//   ty:20  horizontal tx:25-39  (below dining tables, above counter wall)
//   ty:27  horizontal tx:26-39  (below shelf row — NPC browse)
//   tx:32  vertical  ty:24-27  (gap between shelf columns 1 and 2)

// Find the nearest safe vertical gap for a given tx position in the aisle area
function _nearestAisleGap(tx) {
  // Gaps: tx:26, tx:32 (only 2 shelf columns now)
  const gaps = [26, 32];
  let best = gaps[0];
  let bestDist = Math.abs(tx - gaps[0]);
  for (let i = 1; i < gaps.length; i++) {
    const d = Math.abs(tx - gaps[i]);
    if (d < bestDist) { bestDist = d; best = gaps[i]; }
  }
  return best;
}

function _routeCounterToChair(chairIdx) {
  const ch = DELI_CHAIRS[chairIdx];
  return [
    { tx: 13, ty: 23 },         // south-east away from counter + queue
    { tx: 26, ty: 23 },         // east past counter wall (1 tile south of solid wall)
    { tx: 26, ty: 20 },         // north to safe horizontal corridor
    { tx: ch.tx, ty: 20 },      // east to chair's column (safe at ty:20)
    { tx: ch.tx, ty: ch.ty },   // north to chair
  ];
}

function _routeCounterToCondiments() {
  return [
    { tx: 13, ty: 23 },        // south-east away from counter + queue
    { tx: 26, ty: 23 },        // east past counter wall (1 tile south of solid wall)
    { tx: 26, ty: 20 },        // north to dining entry
    { tx: 26, ty: 13 },        // north to condiment row
    { tx: 35, ty: 13 },        // east to condiments
  ];
}

function _routeCondimentsToChair(chairIdx) {
  const ch = DELI_CHAIRS[chairIdx];
  return [
    { tx: 35, ty: 20 },         // south to safe horizontal corridor ty:20
    { tx: ch.tx, ty: 20 },      // east/west to chair's column
    { tx: ch.tx, ty: ch.ty },   // north to chair
  ];
}

function _routeChairToAisle(chairIdx, aisle) {
  const ch = DELI_CHAIRS[chairIdx];
  // Chair → south to ty:20 → east to nearest gap → south to aisle row → east/west to spot
  const gap = _nearestAisleGap(aisle.tx);
  return [
    { tx: ch.tx, ty: 20 },           // south on own column to safe corridor
    { tx: gap, ty: 20 },             // east/west to nearest aisle gap
    { tx: gap, ty: aisle.ty },       // south through gap to aisle row
    { tx: aisle.tx, ty: aisle.ty },  // east/west to aisle spot
  ];
}

function _routeCounterToAisle(aisle) {
  const gap = _nearestAisleGap(aisle.tx);
  if (gap <= 26) {
    // Gap is tx:26 — go south-east then straight south
    return [
      { tx: 13, ty: 23 },              // south-east away from counter + queue
      { tx: 26, ty: 23 },              // east past counter wall
      { tx: 26, ty: aisle.ty },        // south to aisle row
      { tx: aisle.tx, ty: aisle.ty },  // east to aisle spot
    ];
  }
  // Gap is tx:32 or tx:39 — must go north to ty:20 first (above shelves),
  // then east to gap, then south through gap
  return [
    { tx: 13, ty: 23 },              // south-east away from counter + queue
    { tx: 26, ty: 23 },              // east past counter wall
    { tx: 26, ty: 20 },              // north above shelves
    { tx: gap, ty: 20 },             // east to gap column
    { tx: gap, ty: aisle.ty },       // south through gap to aisle row
    { tx: aisle.tx, ty: aisle.ty },  // east/west to aisle spot
  ];
}

// Route between two aisle spots using nearest gap
function _routeAisleToAisle(fromTX, fromTY, toAisle) {
  const gap = _nearestAisleGap(fromTX);
  const toGap = _nearestAisleGap(toAisle.tx);
  const route = [];
  if (fromTY === toAisle.ty) {
    // Same row — walk to gap, then to target
    route.push({ tx: gap, ty: fromTY });
    if (gap !== toGap) route.push({ tx: toGap, ty: fromTY });
    route.push({ tx: toAisle.tx, ty: toAisle.ty });
  } else {
    // Different row — go to gap, change rows, go to target
    route.push({ tx: gap, ty: fromTY });        // west/east to gap
    route.push({ tx: gap, ty: toAisle.ty });     // north/south through gap
    route.push({ tx: toAisle.tx, ty: toAisle.ty }); // east/west to spot
  }
  return route;
}

function _routeToExit(fromTX, fromTY) {
  const route = [];
  if (fromTX >= 25) {
    if (fromTY < 20) {
      // Dining area — south on own column to ty:20, then west
      route.push({ tx: fromTX, ty: 20 });
    } else if (fromTY >= 22) {
      // Aisle area — go to nearest gap, then north to ty:20
      const gap = _nearestAisleGap(fromTX);
      route.push({ tx: gap, ty: fromTY });       // west/east to gap
      if (gap !== 26) {
        route.push({ tx: gap, ty: 20 });          // north through gap
        route.push({ tx: 26, ty: 20 });           // west to main corridor
      } else {
        route.push({ tx: 26, ty: 20 });           // north on main corridor
      }
    }
    route.push({ tx: 26, ty: 23 });               // south past counter wall (safe clearance)
  }
  route.push({ tx: 13, ty: 23 });  // west to exit area (1 tile south of counter)
  route.push({ tx: 13, ty: 30 });  // south to exit
  return route;
}

// Route from queue position to exit — steps EAST out of the line first (to tx:13)
// so the NPC doesn't walk through other queue members at tx:11.
function _routeQueueToExit(npc) {
  const npcTY = Math.floor(npc.y / TILE);
  return [
    { tx: 13, ty: npcTY },   // step east out of queue line (tx:11 → tx:13)
    { tx: 13, ty: 30 },      // south to exit
  ];
}

// Route from exit (13,30) to a shelf browse spot (for retail shoppers)
function _routeExitToShelf(shelf) {
  const gap = _nearestAisleGap(shelf.tx);
  if (gap <= 26) {
    return [
      { tx: 13, ty: 23 },              // north to counter area
      { tx: 26, ty: 23 },              // east past counter wall
      { tx: 26, ty: shelf.ty },        // south to browse row
      { tx: shelf.tx, ty: shelf.ty },  // east to shelf spot
    ];
  }
  return [
    { tx: 13, ty: 23 },              // north to counter area
    { tx: 26, ty: 23 },              // east past counter wall
    { tx: 26, ty: 20 },              // north above shelves
    { tx: gap, ty: 20 },             // east to gap column
    { tx: gap, ty: shelf.ty },       // south through gap to browse row
    { tx: shelf.tx, ty: shelf.ty },  // east/west to shelf spot
  ];
}

// Route from shelf browse spot to cashier (40,24)
function _routeShelfToCashier() {
  // From browse row (ty:27) → east along ty:27 to cashier column → north to cashier
  return [
    { tx: DELI_CASHIER.tx, ty: 27 },             // east along browse row to cashier column
    { tx: DELI_CASHIER.tx, ty: DELI_CASHIER.ty }, // north to cashier spot
  ];
}

// Route from cashier (40,24) to exit (13,30)
function _routeCashierToExit() {
  return [
    { tx: DELI_CASHIER.tx, ty: 27 },  // south to browse row
    { tx: 26, ty: 27 },               // west along browse row to main corridor
    { tx: 26, ty: 23 },               // north to safe clearance
    { tx: 13, ty: 23 },               // west to exit area
    { tx: 13, ty: 30 },               // south to exit
  ];
}

// Route from aisle area back to a queue spot (meal customers only)
function _routeAisleToQueue(fromTX, fromTY, queueSpot) {
  const route = [];
  const gap = _nearestAisleGap(fromTX);
  route.push({ tx: gap, ty: fromTY });
  if (gap !== 26) {
    route.push({ tx: gap, ty: 20 });
    route.push({ tx: 26, ty: 20 });
  } else {
    route.push({ tx: 26, ty: 20 });
  }
  // Go south to ty:23 (safe clearance from counter wall at ty:21)
  route.push({ tx: 26, ty: 23 });                      // south past counter wall
  route.push({ tx: 13, ty: 23 });                      // west along safe corridor
  route.push({ tx: 13, ty: queueSpot.ty });             // south to queue Y level (vertical)
  route.push({ tx: queueSpot.tx, ty: queueSpot.ty });   // west into line (horizontal)
  return route;
}

// ===================== ROUTE-BASED MOVEMENT =====================
// NPC walks toward route[0]. When close, shifts to next waypoint.
// When route is empty, movement is done.

// Movement config for _cMoveNPC
const _deliMoveSkipStates = new Set(['eating', 'at_condiments', 'spawn_wait', '_despawn']);
const _deliMoveLaneDisable = new Set(['in_queue', 'ordering', 'waiting_food']);

function moveDeliNPC(npc) {
  _cMoveNPC(npc, {
    npcList: deliNPCs,
    skipStates: _deliMoveSkipStates,
    kitchenCheck: _isKitchenZone,
    kitchenSafe: { tx: 26, ty: 22 },
    kitchenFallback: [{ tx: 13, ty: 23 }, { tx: 13, ty: 30 }],
    laneMode: 'checked',
    laneDisableStates: _deliMoveLaneDisable,
    pairBehavior: (npc, other) => {
      const npcInQueue = _deliMoveLaneDisable.has(npc.state);
      const otherInQueue = _deliMoveLaneDisable.has(other.state);
      if (npcInQueue && otherInQueue) return 'skip';
      if (otherInQueue) return 'slow';
      return 'yield';
    },
  });
}

// ===================== QUEUE MANAGEMENT =====================

function _nextQueueSpot() {
  // Always join at the BACK of the queue (one past last occupied)
  // Check ALL NPCs with a claimed queue index — not just those in queue states.
  // NPCs walking to their queue spot already have _queueIdx set; ignoring them
  // caused duplicate indices and NPCs stacking on top of each other.
  let maxOccupied = -1;
  for (const n of deliNPCs) {
    if (n._queueIdx > maxOccupied) maxOccupied = n._queueIdx;
  }
  const nextIdx = maxOccupied + 1;
  return nextIdx < QUEUE_SPOTS.length ? nextIdx : -1;
}

function _advanceQueue(fromIdx) {
  // Advance queue NPCs behind the vacated position forward by one.
  // fromIdx: the index that was just vacated (default 0 for front-of-line departure)
  const minIdx = fromIdx !== undefined ? fromIdx : 0;
  const inQueue = deliNPCs.filter(n =>
    (n.state === 'in_queue' || n.state === 'ordering' || n.state === 'waiting_food') && n._queueIdx > minIdx
  );
  for (const n of inQueue) {
    n._queueIdx--;
    const spot = QUEUE_SPOTS[n._queueIdx];
    if (spot) {
      // Walk to new queue spot
      n.route = [{ tx: spot.tx, ty: spot.ty }];
      // Don't change state — stay in_queue but walk forward
    }
  }
  // Set queue advance delay: 3-5 seconds (180-300 frames)
  _queueAdvanceDelay = _cRandRange(180, 300);
}

// ===================== SPAWN =====================
function spawnDeliNPC() {
  // Decide role: 70% meal, 30% retail
  const role = Math.random() < 0.7 ? 'meal' : 'retail';
  const npc = _cCreateNPC(_deliIdCounter, DELI_SPOTS.exit, DELI_NPC_APPEARANCES, DELI_NPC_NAMES, DELI_NPC_CONFIG, {
    _queueIdx: -1,
    purchasedExtras: [],
    claimedChair: null,
    _pendingPurchase: null,
    _lastChairIdx: -1,
    _aisleVisits: 0,
    _recipeIngredients: null,
    _laneOffX: (Math.random() - 0.5) * 32,
    _laneOffY: (Math.random() - 0.5) * 32,
    _role: role,
    isDeliNPC: true,
  });
  deliNPCs.push(npc);
  return npc;
}

function initDeliNPCs() {
  deliNPCs.length = 0;
  _deliIdCounter.value = 0;
  _deliSpawnState.timer = 0;
  _deliSpawnState.nextInterval = _cRandRange(60, 180);
  _queueAdvanceDelay = 0;
}

// ===================== AI STATE HANDLERS =====================

const DELI_NPC_AI = {

  // ─── SPAWN_WAIT: Staggered delay before entering ───────
  spawn_wait: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    npc.state = 'entering';
  },

  // ─── ENTERING: Walk from exit to queue (meal) or shelf (retail) ──
  entering: (npc) => {
    // Retail shoppers go directly to a shelf — never enter food queue
    if (npc._role === 'retail') {
      const shelf = _pickFreeAisle();
      npc._pendingPurchase = shelf;
      _cStartRoute(npc, _routeExitToShelf(shelf),
        'browsing_shelf', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      return;
    }

    // Meal customers join the queue
    const qIdx = _nextQueueSpot();
    if (qIdx < 0) {
      // Queue full — browse aisles instead
      const aisle = _pickFreeAisle();
      const route = _routeCounterToAisle(aisle);
      _cStartRoute(npc, route,
        'shopping_aisle', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      npc._pendingPurchase = Math.random() < 0.6 ? aisle : null;
      return;
    }
    npc._queueIdx = qIdx;
    const spot = QUEUE_SPOTS[qIdx];
    // Walk north along tx:13 to the spot's Y level, then west into line
    // This prevents walking through customers already ahead in line
    _cStartRoute(npc,
      [{ tx: 13, ty: spot.ty }, { tx: spot.tx, ty: spot.ty }],
      'in_queue', 0
    );
  },

  // ─── WALKING: Follow route, then transition ────────────
  walking: (npc) => {
    // Movement handled by moveDeliNPC. Just check if route is done.
    if (npc.route && npc.route.length > 0) return;
    npc.state = npc._nextState || 'in_queue';
    npc.stateTimer = npc._nextTimer || 0;
  },

  // ─── IN QUEUE: Stand in line, wait for turn (meal customers only) ────────────
  in_queue: (npc) => {
    // If we're still walking to our queue spot, keep going
    if (npc.route && npc.route.length > 0) {
      // Don't advance if the NPC directly ahead in the queue is still in our way
      // (prevents queue NPCs walking through each other when advancing)
      if (npc._queueIdx > 0) {
        for (const other of deliNPCs) {
          if (other === npc || other._queueIdx !== npc._queueIdx - 1) continue;
          const dy = other.y - npc.y;
          // If the NPC ahead (smaller queue idx = north/up = smaller Y) is within 30px, wait
          if (dy < 0 && dy > -30) {
            npc.moving = false;
            npc._idleTime = 0;
            return;
          }
        }
      }
      moveDeliNPC(npc);
      // Face north (toward person ahead) even while walking into position
      if (npc.route.length <= 1) npc.dir = 1;
      npc._idleTime = 0;
      return;
    }
    npc.moving = false;
    npc.dir = 1; // face north — toward the back of the customer ahead in line
    npc._idleTime = (npc._idleTime || 0) + 1;

    // Snap to exact queue spot — prevents drifting sideways from separation push
    const spot = QUEUE_SPOTS[npc._queueIdx];
    if (spot) {
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }

    // Front of line + shift active + no advance delay → become ordering
    if (npc._queueIdx === 0 && typeof cookingState !== 'undefined' && cookingState.active) {
      if (_queueAdvanceDelay <= 0) {
        npc.state = 'ordering';
        npc._idleTime = 0;
        return;
      }
    }

    // Patience timeout — leave if shift not active (5 sec) or waited too long (30 sec)
    const shiftActive = typeof cookingState !== 'undefined' && cookingState.active;
    const patienceLimit = shiftActive ? 1800 : 300;
    if (npc._idleTime >= patienceLimit) {
      const leftIdx = npc._queueIdx;
      npc._queueIdx = -1;
      _advanceQueue(leftIdx);
      // Cancel any linked ticket and increment missed
      if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
        _incrementMissedOrders();
      }
      _cStartRoute(npc, _routeQueueToExit(npc), '_despawn', 0);
      return;
    }
  },

  // ─── ORDERING: At counter, waiting for spawnOrder() to link us ──
  ordering: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    npc._idleTime = (npc._idleTime || 0) + 1;

    // Counter validity: only valid if NPC is on queue spot 0
    if (npc._queueIdx !== 0) {
      // Not at front — cancel ticket, increment missed, leave
      if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
        _incrementMissedOrders();
        npc.linkedOrderId = null;
      }
      npc.hasOrdered = true;
      npc._queueIdx = -1;
      _cStartRoute(npc, _routeQueueToExit(npc), '_despawn', 0);
      return;
    }

    // Snap to queue spot 0 (counter)
    npc.x = QUEUE_SPOTS[0].tx * TILE + TILE / 2;
    npc.y = QUEUE_SPOTS[0].ty * TILE + TILE / 2;
    // spawnOrder() in cookingSystem.js will find us and link the order
    // If shift ends while waiting, leave
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      npc.hasOrdered = true;
      npc._queueIdx = -1;
      _advanceQueue(0);
      const aisle = _pickFreeAisle();
      _cStartRoute(npc, _routeCounterToAisle(aisle),
        'shopping_aisle', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      npc._pendingPurchase = Math.random() < 0.5 ? aisle : null;
      return;
    }
    // Patience timeout — leave after 15 sec if order never gets linked
    if (npc._idleTime >= 900) {
      npc.hasOrdered = true;
      if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
        _incrementMissedOrders();
        npc.linkedOrderId = null;
      }
      npc._queueIdx = -1;
      _advanceQueue(0);
      _cStartRoute(npc, _routeQueueToExit(npc), '_despawn', 0);
      return;
    }
  },

  // ─── WAITING FOOD: Linked to order, waiting for cook ───
  waiting_food: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    npc._idleTime = (npc._idleTime || 0) + 1;

    // Counter validity: must still be at queue spot 0
    if (npc._queueIdx !== 0) {
      if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
        _incrementMissedOrders();
      }
      npc.linkedOrderId = null;
      npc._queueIdx = -1;
      _cStartRoute(npc, _routeQueueToExit(npc), '_despawn', 0);
      return;
    }

    // Snap to queue spot 0 (counter)
    npc.x = QUEUE_SPOTS[0].tx * TILE + TILE / 2;
    npc.y = QUEUE_SPOTS[0].ty * TILE + TILE / 2;
    // applyOrderResult() in cookingSystem.js will set us to pickup_food
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
        _incrementMissedOrders();
      }
      npc.linkedOrderId = null;
      npc._queueIdx = -1;
      _advanceQueue(0);
      _cStartRoute(npc, _routeQueueToExit(npc), '_despawn', 0);
      return;
    }
    // Patience timeout — leave angry after 30 sec if food never comes
    if (npc._idleTime >= 1800) {
      if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
        _incrementMissedOrders();
      }
      npc.linkedOrderId = null;
      npc._queueIdx = -1;
      _advanceQueue(0);
      _cStartRoute(npc, _routeQueueToExit(npc), '_despawn', 0);
      return;
    }
  },

  // ─── PICKUP FOOD: Got food! Brief pause, then go eat ───
  pickup_food: (npc) => {
    if (npc.stateTimer > 0) { npc.stateTimer--; npc.moving = false; return; }

    npc.hasOrdered = true;
    npc._queueIdx = -1;
    _advanceQueue(0);

    // Claim a chair
    const claimed = new Set();
    for (const n of deliNPCs) if (n.claimedChair !== null) claimed.add(n.claimedChair);
    const avail = [];
    for (let i = 0; i < DELI_CHAIRS.length; i++) if (!claimed.has(i)) avail.push(i);
    const chairIdx = avail.length > 0 ? _cRandFromArray(avail) : 0;
    npc.claimedChair = chairIdx;
    npc._lastChairIdx = chairIdx;

    // 50% visit condiments first
    if (Math.random() < DELI_NPC_CONFIG.condimentChance) {
      _cStartRoute(npc, _routeCounterToCondiments(), 'at_condiments',
        _cRandRange(DELI_NPC_CONFIG.condimentTime[0], DELI_NPC_CONFIG.condimentTime[1]));
    } else {
      _cStartRoute(npc, _routeCounterToChair(chairIdx), 'eating',
        _cRandRange(DELI_NPC_CONFIG.eatDuration[0], DELI_NPC_CONFIG.eatDuration[1]));
    }
  },

  // ─── AT CONDIMENTS: Using condiments, then go to chair ─
  at_condiments: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    // Head to chair
    const chairIdx = npc.claimedChair !== null ? npc.claimedChair : 0;
    _cStartRoute(npc, _routeCondimentsToChair(chairIdx), 'eating',
      _cRandRange(DELI_NPC_CONFIG.eatDuration[0], DELI_NPC_CONFIG.eatDuration[1]));
  },

  // ─── EATING: Sitting in chair, eating food ─────────────
  eating: (npc) => {
    npc.moving = false;
    // Snap to chair
    if (npc.claimedChair !== null) {
      const ch = DELI_CHAIRS[npc.claimedChair];
      npc.x = ch.tx * TILE + TILE / 2;
      npc.y = ch.ty * TILE + TILE / 2;
      npc.dir = ch.sitDir;
    }
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Done eating
    npc.hasFood = false;
    npc._recipeIngredients = null;
    const lastChair = npc.claimedChair;
    npc.claimedChair = null;

    // Browse aisles after eating (meal customers post-eat browsing)
    if (Math.random() < DELI_NPC_CONFIG.aisleChance) {
      const aisle = _pickFreeAisle();
      npc._pendingPurchase = Math.random() < 0.6 ? aisle : null;
      _cStartRoute(npc, _routeChairToAisle(lastChair, aisle), 'shopping_aisle',
        _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1]));
    } else {
      // Leave
      if (lastChair !== null && lastChair >= 0) {
        const ch = DELI_CHAIRS[lastChair];
        _cStartRoute(npc, _routeToExit(ch.tx, ch.ty), '_despawn', 0);
      } else {
        const curTX = Math.floor(npc.x / TILE);
        const curTY = Math.floor(npc.y / TILE);
        _cStartRoute(npc, _routeToExit(curTX, curTY), '_despawn', 0);
      }
    }
  },

  // ─── SHOPPING AISLE: Browsing grocery shelves (meal customers post-eat) ──────────
  shopping_aisle: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face shelves
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Purchase (if they decided to buy)
    if (npc._pendingPurchase) {
      const item = npc._pendingPurchase;
      if (typeof gold !== 'undefined') gold += item.price;
      if (typeof cookingState !== 'undefined' && cookingState.active) {
        cookingState.stats.totalEarned += item.price;
      }
      npc.purchasedExtras.push(item.name);
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: npc.x, y: npc.y - 40, life: 30, maxLife: 30, type: 'heal', dmg: '+$' + item.price + ' (' + item.name + ')' });
      }
      npc._pendingPurchase = null;
    }

    // Browse another aisle? (up to 3 aisles total)
    if (npc._aisleVisits === undefined) npc._aisleVisits = 0;
    npc._aisleVisits++;
    if (npc._aisleVisits < 3 && Math.random() < 0.6) {
      const aisle = _pickFreeAisle();
      npc._pendingPurchase = Math.random() < 0.5 ? aisle : null;
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      // Route through nearest shelf gap — natural aisle movement
      _cStartRoute(npc,
        _routeAisleToAisle(curTX, curTY, aisle),
        'shopping_aisle', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1]));
      return;
    }

    // Done browsing — if hasn't ordered yet, try to rejoin queue before leaving
    const aTX = Math.floor(npc.x / TILE);
    const aTY = Math.floor(npc.y / TILE);
    if (!npc.hasOrdered) {
      const qIdx = _nextQueueSpot();
      if (qIdx >= 0) {
        npc._queueIdx = qIdx;
        const spot = QUEUE_SPOTS[qIdx];
        _cStartRoute(npc, _routeAisleToQueue(aTX, aTY, spot), 'in_queue', 0);
        return;
      }
    }
    // Already ordered or queue full — leave
    _cStartRoute(npc, _routeToExit(aTX, aTY), '_despawn', 0);
  },

  // ─── BROWSING SHELF: Retail shopper standing at shelf, browsing ──────────
  browsing_shelf: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face north (toward shelves)
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Purchase the item
    if (npc._pendingPurchase) {
      const item = npc._pendingPurchase;
      if (typeof gold !== 'undefined') gold += item.price;
      if (typeof cookingState !== 'undefined' && cookingState.active) {
        cookingState.stats.totalEarned += item.price;
      }
      npc.purchasedExtras.push(item.name);
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: npc.x, y: npc.y - 40, life: 30, maxLife: 30, type: 'heal', dmg: '+$' + item.price + ' (' + item.name + ')' });
      }
      npc._pendingPurchase = null;
    }

    // Route to cashier to pay
    _cStartRoute(npc, _routeShelfToCashier(), 'at_cashier', 0);
  },

  // ─── AT CASHIER: Retail shopper paying at cashier ──────────
  at_cashier: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face north (toward cashier counter)

    // Brief pause at cashier (1-2 sec)
    npc._idleTime = (npc._idleTime || 0) + 1;
    if (npc._idleTime < 90) return;

    // Payment gold popup for any remaining purchases
    const totalSpent = npc.purchasedExtras.length;
    if (totalSpent > 0 && npc._idleTime === 90) {
      // Already paid at shelf — just show a "Thank you" or similar
    }

    // Route to exit
    _cStartRoute(npc, _routeCashierToExit(), '_despawn', 0);
  },

  // ─── DESPAWN WALK: Walking to exit then despawn ────────
  _despawn_walk: (npc) => {
    if (npc.route && npc.route.length > 0) {
      moveDeliNPC(npc);
      return;
    }
    npc.state = '_despawn';
  },
};

// ===================== MAIN UPDATE =====================
function updateDeliNPCs() {
  if (typeof Scene === 'undefined' || !Scene.inCooking) return;
  if (typeof cookingState === 'undefined' || cookingState.activeRestaurantId !== 'street_deli') return;

  // Tick down queue advance delay
  if (_queueAdvanceDelay > 0) _queueAdvanceDelay--;

  // Queue deduplication — detect multiple NPCs claiming same queue slot
  const _queueSlots = new Map(); // idx → npc
  for (const npc of deliNPCs) {
    if (npc._queueIdx < 0) continue;
    if (_queueSlots.has(npc._queueIdx)) {
      // Conflict — the NPC with higher id (spawned later) yields
      const existing = _queueSlots.get(npc._queueIdx);
      const yielder = npc.id > existing.id ? npc : existing;
      if (yielder === existing) _queueSlots.set(npc._queueIdx, npc);
      // Find next free slot for the yielder
      let nextFree = -1;
      for (let s = 0; s < QUEUE_SPOTS.length; s++) {
        let taken = false;
        for (const n2 of deliNPCs) {
          if (n2 !== yielder && n2._queueIdx === s) { taken = true; break; }
        }
        if (!taken && s > npc._queueIdx) { nextFree = s; break; }
      }
      if (nextFree >= 0) {
        yielder._queueIdx = nextFree;
        const spot = QUEUE_SPOTS[nextFree];
        if (spot) yielder.route = [{ tx: spot.tx, ty: spot.ty }];
      } else {
        // No free slot — eject from queue
        yielder._queueIdx = -1;
        _cStartRoute(yielder, _routeQueueToExit(yielder), '_despawn', 0);
      }
    } else {
      _queueSlots.set(npc._queueIdx, npc);
    }
  }

  // Shared update loop
  _cUpdateNPCLoop({
    restaurantId: 'street_deli',
    spawnState: _deliSpawnState,
    spawnInterval: DELI_NPC_CONFIG.spawnInterval,
    canSpawn: () => deliNPCs.length < DELI_NPC_CONFIG.maxNPCs,
    doSpawn: spawnDeliNPC,
    npcList: deliNPCs,
    stateHandlers: DELI_NPC_AI,
    moveFn: moveDeliNPC,
    exemptIdleStates: new Set(['eating', 'in_queue', 'ordering', 'waiting_food', 'browsing_shelf', 'at_cashier']),
    onIdleTimeout: (npc) => {
      npc._idleTime = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc.claimedChair !== null) npc.claimedChair = null;
      if (npc._queueIdx >= 0) {
        const leftIdx = npc._queueIdx;
        npc._queueIdx = -1;
        _advanceQueue(leftIdx);
      }
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeToExit(curTX, curTY), '_despawn', 0);
    },
    onStuckTimeout: (npc) => {
      npc._stuckFrames = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc.claimedChair !== null) npc.claimedChair = null;
      if (npc._queueIdx >= 0) {
        const leftIdx = npc._queueIdx;
        npc._queueIdx = -1;
        _advanceQueue(leftIdx);
      }
      if (_isKitchenZone(npc.x, npc.y)) {
        npc.x = 26 * TILE + TILE / 2;
        npc.y = 22 * TILE + TILE / 2;
      }
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeToExit(curTX, curTY), '_despawn', 0);
    },
    onDespawn: (npc, i) => {
      if (npc.claimedChair !== null) npc.claimedChair = null;
      if (npc._queueIdx >= 0) {
        const leftIdx = npc._queueIdx;
        npc._queueIdx = -1;
        _advanceQueue(leftIdx);
        // If NPC despawns while at counter with a linked order, count as missed
        if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
          _incrementMissedOrders();
        }
      }
      npc.hasFood = false;
      npc._recipeIngredients = null;
      deliNPCs.splice(i, 1);
    },
  });
}
