// ===================== DELI NPC SYSTEM =====================
// Customer NPCs that enter, order at counter, sit at tables, eat, and leave.
// NO pathfinding — straight-line movement between defined waypoints.
//
// Two NPC roles:
//   meal (70%)   — enter → counter → place order → sit → wait → pickup → eat → leave
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

// ===================== DEFINED SPOTS =====================
// All positions are tile coords. NPCs walk in straight lines between these.
// Every spot is in open floor — no collision checking needed.

const DELI_SPOTS = {
  exit:        { tx: 13, ty: 34 },
  counterArea: { tx: 13, ty: 22 },   // corridor in front of counter
  corridorE:   { tx: 25, ty: 22 },   // east end — past the counter wall
  diningEntry: { tx: 26, ty: 20 },   // gap into dining area
  condiments:  { tx: 35, ty: 13 },   // south side of condiment table
};

// Counter approach spots — south side of pickup counter (ty:22)
const DELI_COUNTER_SPOTS = [
  { tx: 9, ty: 22 }, { tx: 10, ty: 22 }, { tx: 11, ty: 22 }, { tx: 12, ty: 22 },
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

// Aisle browse spots — 4 shelves in 2 rows, NPCs stand below each shelf
const DELI_AISLES = [
  { name: 'Frozen',    price: 4, tx: 29, ty: 26 },   // shelf ty:24-25, browse ty:26
  { name: 'Snacks',    price: 3, tx: 36, ty: 26 },
  { name: 'Candy',     price: 2, tx: 29, ty: 29 },   // shelf ty:27-28, browse ty:29
  { name: 'Beverages', price: 3, tx: 36, ty: 29 },
];

// Cashier spot for retail shoppers
const DELI_CASHIER = { tx: 38, ty: 24 };

// ===================== CONFIG =====================
const DELI_NPC_CONFIG = {
  minNPCs: 0,
  maxNPCs: 4,
  spawnInterval: [180, 540],   // 3-9 sec randomized range (frames at 60fps)
  baseSpeed: 0.77,             // slow relaxed stroll
  speedVariance: 0.14,
  eatDuration:    [900, 900],  // 15 sec at 60fps
  browseDuration: [480, 900],  // 8-15 sec browsing at an aisle
  counterWaitTime: [60, 120],  // 1-2 sec at counter placing order
  seatPatience:   [3600, 3600], // 60 sec patience while seated waiting
  aisleChance:     0.7,        // chance to browse aisles after eating (meal customers)
};

// ===================== STATE =====================
const deliNPCs = [];
const _deliIdCounter = { value: 0 };
const _deliSpawnState = { timer: 0, nextInterval: 600 };

// Customer numbering — sequential "Customer 1", "Customer 2", etc.
let _deliCustomerCounter = 0;

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

// Claim a free counter spot
function _claimCounterSpot(npc) {
  const taken = new Set();
  for (const n of deliNPCs) {
    if (n !== npc && n._counterSpotIdx >= 0) taken.add(n._counterSpotIdx);
  }
  for (let i = 0; i < DELI_COUNTER_SPOTS.length; i++) {
    if (!taken.has(i)) return i;
  }
  return -1; // all spots taken
}

// Claim a free chair
function _claimChair(npc) {
  const claimed = new Set();
  for (const n of deliNPCs) if (n.claimedChair !== null) claimed.add(n.claimedChair);
  const avail = [];
  for (let i = 0; i < DELI_CHAIRS.length; i++) if (!claimed.has(i)) avail.push(i);
  return avail.length > 0 ? _cRandFromArray(avail) : 0;
}

// ===================== ROUTE BUILDERS =====================
// Build arrays of {tx,ty} waypoints. ALL legs are horizontal or vertical
// to prevent NPCs clipping through solid entities.
//
// TRAFFIC LANES (separated to prevent body-blocking):
//   tx:13  — ENTRY lane (meal NPCs walking north to counter)
//   tx:16  — MAIN EXIT lane (NPCs leaving from dining/aisles)
//   tx:18  — RETAIL ENTRY lane (retail NPCs entering to shelves)
//   tx:26  — MAIN N/S corridor (east of kitchen wall)
//   ty:22  — E/W corridor south of counter wall (counter-departing NPCs go east)
//   ty:20  — E/W corridor below dining tables (dining/condiment traffic)
//
// AISLE AREA (tx:27+, ty:22+):
//   Shelf rows: ty:24-25 and ty:27-28
//   Browse rows: ty:26 and ty:29
//   Gaps: tx:26 (west), tx:32 (between shelf columns)

// Find the nearest safe vertical gap for a given tx position in the aisle area
function _nearestAisleGap(tx) {
  // Gaps: tx:26, tx:32 (between shelf columns)
  const gaps = [26, 32];
  let best = gaps[0];
  let bestDist = Math.abs(tx - gaps[0]);
  for (let i = 1; i < gaps.length; i++) {
    const d = Math.abs(tx - gaps[i]);
    if (d < bestDist) { bestDist = d; best = gaps[i]; }
  }
  return best;
}

// Route from exit to a counter spot
function _routeExitToCounter(spotIdx) {
  const spot = DELI_COUNTER_SPOTS[spotIdx];
  return [
    { tx: 13, ty: 22 },            // north along entry lane to counter row
    { tx: spot.tx, ty: spot.ty },   // west to counter spot
  ];
}

// Route from counter spot to a chair
function _routeCounterToChair(spotIdx, chairIdx) {
  const ch = DELI_CHAIRS[chairIdx];
  return [
    { tx: 13, ty: 22 },             // east to entry lane
    { tx: 26, ty: 22 },             // east along open floor (south of counter wall)
    { tx: 26, ty: 20 },             // north to safe horizontal corridor
    { tx: ch.tx, ty: 20 },          // east to chair's column (safe at ty:20)
    { tx: ch.tx, ty: ch.ty },       // north/south to chair
  ];
}

// Route from chair back to counter spot (to pick up food)
function _routeChairToCounter(chairIdx, spotIdx) {
  const ch = DELI_CHAIRS[chairIdx];
  const spot = DELI_COUNTER_SPOTS[spotIdx];
  return [
    { tx: ch.tx, ty: 20 },          // south/north to safe corridor
    { tx: 26, ty: 20 },             // west to main corridor
    { tx: 26, ty: 22 },             // south past counter wall
    { tx: spot.tx, ty: spot.ty },    // west to counter spot
  ];
}

// Route from counter to chair with food (same path as counterToChair)
function _routeCounterToChairEat(spotIdx, chairIdx) {
  return _routeCounterToChair(spotIdx, chairIdx);
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
    // Exit lane at tx:16 — separated from entry lane (tx:13)
    route.push({ tx: 26, ty: 22 });               // south past counter wall
    route.push({ tx: 16, ty: 22 });               // west on ty:22
  }
  route.push({ tx: 16, ty: 34 });  // south to exit on tx:16
  return route;
}

// Route from exit (13,34) to a shelf browse spot (for retail shoppers)
// Retail NPCs enter on tx:18 — separate from meal entry at tx:13
function _routeExitToShelf(shelf) {
  const gap = _nearestAisleGap(shelf.tx);
  if (gap <= 26) {
    return [
      { tx: 18, ty: 22 },              // north-east to open floor (own entry lane)
      { tx: 26, ty: 22 },              // east to main corridor
      { tx: 26, ty: shelf.ty },        // south to browse row
      { tx: shelf.tx, ty: shelf.ty },  // east to shelf spot
    ];
  }
  return [
    { tx: 18, ty: 22 },              // north-east to open floor
    { tx: 26, ty: 22 },              // east to main corridor
    { tx: 26, ty: 20 },              // north above shelves
    { tx: gap, ty: 20 },             // east to gap column
    { tx: gap, ty: shelf.ty },       // south through gap to browse row
    { tx: shelf.tx, ty: shelf.ty },  // east/west to shelf spot
  ];
}

// Route from shelf browse spot to cashier
function _routeShelfToCashier() {
  return [
    { tx: DELI_CASHIER.tx, ty: 29 },             // east along browse row to cashier column
    { tx: DELI_CASHIER.tx, ty: DELI_CASHIER.ty }, // north to cashier spot
  ];
}

// Route from cashier to exit — uses tx:16 exit lane
function _routeCashierToExit() {
  return [
    { tx: DELI_CASHIER.tx, ty: 29 },  // south to browse row
    { tx: 26, ty: 29 },               // west along browse row to main corridor
    { tx: 26, ty: 22 },               // north past counter wall
    { tx: 16, ty: 22 },               // west on ty:22
    { tx: 16, ty: 34 },               // south to exit on tx:16
  ];
}

// ===================== ROUTE-BASED MOVEMENT =====================
// NPC walks toward route[0]. When close, shifts to next waypoint.
// When route is empty, movement is done.

// Movement config for _cMoveNPC
const _deliMoveSkipStates = new Set(['eating', 'seated_waiting', 'spawn_wait', '_despawn']);
const _deliMoveLaneDisable = new Set(['at_counter', 'picking_up']);

function moveDeliNPC(npc) {
  _cMoveNPC(npc, {
    npcList: deliNPCs,
    skipStates: _deliMoveSkipStates,
    kitchenCheck: _isKitchenZone,
    kitchenSafe: { tx: 26, ty: 22 },
    kitchenFallback: [{ tx: 13, ty: 23 }, { tx: 13, ty: 34 }],
    laneMode: 'checked',
    laneDisableStates: _deliMoveLaneDisable,
    pairBehavior: (npc, other) => {
      const npcAtCounter = _deliMoveLaneDisable.has(npc.state);
      const otherAtCounter = _deliMoveLaneDisable.has(other.state);
      if (npcAtCounter && otherAtCounter) return 'skip';
      if (otherAtCounter && (npc.hasFood || npc.hasOrdered)) return 'skip';
      if (otherAtCounter) return 'slow';
      return 'yield';
    },
  });
}

// ===================== SPAWN =====================
function spawnDeliNPC() {
  // Decide role: 70% meal, 30% retail
  const role = Math.random() < 0.7 ? 'meal' : 'retail';
  _deliCustomerCounter++;
  const customerNumber = _deliCustomerCounter;
  const npc = _cCreateNPC(_deliIdCounter, DELI_SPOTS.exit, DELI_NPC_APPEARANCES,
    ['Customer ' + customerNumber], DELI_NPC_CONFIG, {
    customerNumber: customerNumber,
    purchasedExtras: [],
    claimedChair: null,
    _pendingPurchase: null,
    _lastChairIdx: -1,
    _aisleVisits: 0,
    _recipeIngredients: null,
    _laneOffX: (Math.random() - 0.5) * 32,
    _laneOffY: (Math.random() - 0.5) * 32,
    _role: role,
    _counterSpotIdx: -1,
    _foodReady: false,
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
  _deliCustomerCounter = 0;
  if (typeof cookingState !== 'undefined') {
    cookingState.counterOrders = [];
  }
}

// ===================== AI STATE HANDLERS =====================

const DELI_NPC_AI = {

  // ─── SPAWN_WAIT: Staggered delay before entering ───────
  spawn_wait: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    npc.state = 'entering';
  },

  // ─── ENTERING: Walk from exit to counter (meal) or shelf (retail) ──
  entering: (npc) => {
    // Retail shoppers go directly to a shelf — never enter food line
    if (npc._role === 'retail') {
      const shelf = _pickFreeAisle();
      npc._pendingPurchase = shelf;
      _cStartRoute(npc, _routeExitToShelf(shelf),
        'browsing_shelf', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      return;
    }

    // Meal customers walk to counter
    const spotIdx = _claimCounterSpot(npc);
    if (spotIdx < 0) {
      // All counter spots taken — browse aisles instead
      const aisle = _pickFreeAisle();
      _cStartRoute(npc, _routeExitToShelf(aisle),
        'shopping_aisle', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      npc._pendingPurchase = Math.random() < 0.6 ? aisle : null;
      return;
    }
    npc._counterSpotIdx = spotIdx;
    _cStartRoute(npc, _routeExitToCounter(spotIdx),
      'at_counter', _cRandRange(DELI_NPC_CONFIG.counterWaitTime[0], DELI_NPC_CONFIG.counterWaitTime[1])
    );
  },

  // ─── WALKING: Follow route, then transition ────────────
  walking: (npc) => {
    // Movement handled by moveDeliNPC. Just check if route is done.
    if (npc.route && npc.route.length > 0) return;
    npc.state = npc._nextState || 'at_counter';
    npc.stateTimer = npc._nextTimer || 0;
  },

  // ─── AT COUNTER: Pause briefly, place order, then go sit ──
  at_counter: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face north (toward kitchen)

    // Snap to counter spot
    if (npc._counterSpotIdx >= 0 && npc._counterSpotIdx < DELI_COUNTER_SPOTS.length) {
      const spot = DELI_COUNTER_SPOTS[npc._counterSpotIdx];
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }

    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Place order — create a ticket in the cooking system
    if (typeof cookingState !== 'undefined' && cookingState.active) {
      const recipe = typeof pickDeliRecipe === 'function' ? pickDeliRecipe() : null;
      if (recipe) {
        const customerType = typeof pickCustomerType === 'function' ? pickCustomerType() : { name: 'Regular', patience: 1.0, moodSpeed: 0.7, tipMult: 1.0, color: '#80a0c0' };
        const moodThresholds = typeof MOOD_STAGES !== 'undefined'
          ? MOOD_STAGES.map(s => Math.round(s.baseFrames * customerType.patience))
          : [600, 600, 600, 600];
        // Compute per-ingredient pay for deli
        if (typeof _calcDeliPay === 'function') {
          recipe.basePay = _calcDeliPay(recipe);
        }
        cookingState.ticketQueue.push({
          ticketItems: [{ recipe: recipe, qty: 1 }],
          customer: customerType,
          moodThresholds: moodThresholds,
          timerType: { id: 'standard', duration: 1800 },
          _deliCustomerNumber: npc.customerNumber,
          _deliNpcId: npc.id,
        });
      }
    }

    npc.hasOrdered = true;

    // Claim a chair and walk to it
    const chairIdx = _claimChair(npc);
    npc.claimedChair = chairIdx;
    npc._lastChairIdx = chairIdx;

    _cStartRoute(npc, _routeCounterToChair(npc._counterSpotIdx, chairIdx),
      'seated_waiting', _cRandRange(DELI_NPC_CONFIG.seatPatience[0], DELI_NPC_CONFIG.seatPatience[1]));
    npc._counterSpotIdx = -1; // release counter spot
  },

  // ─── SEATED WAITING: Sitting in chair, waiting for food ─────────────
  seated_waiting: (npc) => {
    npc.moving = false;
    // Snap to chair
    if (npc.claimedChair !== null) {
      const ch = DELI_CHAIRS[npc.claimedChair];
      npc.x = ch.tx * TILE + TILE / 2;
      npc.y = ch.ty * TILE + TILE / 2;
      npc.dir = ch.sitDir;
    }

    // Food is ready — go pick it up
    if (npc._foodReady) {
      npc._foodReady = false;
      // Find a free counter spot for pickup
      const spotIdx = _claimCounterSpot(npc);
      if (spotIdx >= 0) {
        npc._counterSpotIdx = spotIdx;
        _cStartRoute(npc, _routeChairToCounter(npc.claimedChair, spotIdx),
          'picking_up', 30);
      } else {
        // No counter spot free, wait a bit and check again
        npc._foodReady = true; // re-set so we check next frame
      }
      return;
    }

    // Patience timeout — leave angry
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Timed out waiting for food
    if (npc.linkedOrderId && typeof _incrementMissedOrders === 'function') {
      _incrementMissedOrders();
    }
    npc.linkedOrderId = null;
    const lastChair = npc.claimedChair;
    npc.claimedChair = null;
    if (lastChair !== null && lastChair >= 0) {
      const ch = DELI_CHAIRS[lastChair];
      _cStartRoute(npc, _routeToExit(ch.tx, ch.ty), '_despawn', 0);
    } else {
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeToExit(curTX, curTY), '_despawn', 0);
    }
  },

  // ─── PICKING UP: Brief pause at counter, grab food ───
  picking_up: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face north

    // Snap to counter spot
    if (npc._counterSpotIdx >= 0 && npc._counterSpotIdx < DELI_COUNTER_SPOTS.length) {
      const spot = DELI_COUNTER_SPOTS[npc._counterSpotIdx];
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }

    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Pick up food from counterOrders
    npc.hasFood = true;
    if (typeof cookingState !== 'undefined' && cookingState.counterOrders) {
      for (let i = cookingState.counterOrders.length - 1; i >= 0; i--) {
        if (cookingState.counterOrders[i].npcId === npc.id) {
          if (cookingState.counterOrders[i].recipeIngredients) {
            npc._recipeIngredients = cookingState.counterOrders[i].recipeIngredients;
          }
          cookingState.counterOrders.splice(i, 1);
          break;
        }
      }
    }

    const chairIdx = npc.claimedChair !== null ? npc.claimedChair : _claimChair(npc);
    if (npc.claimedChair === null) npc.claimedChair = chairIdx;
    const spotIdx = npc._counterSpotIdx;
    npc._counterSpotIdx = -1; // release counter spot

    _cStartRoute(npc, _routeCounterToChairEat(spotIdx, chairIdx), 'eating',
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
      _cStartRoute(npc,
        _routeAisleToAisle(curTX, curTY, aisle),
        'shopping_aisle', _cRandRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1]));
      return;
    }

    // Done browsing — leave
    const aTX = Math.floor(npc.x / TILE);
    const aTY = Math.floor(npc.y / TILE);
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

  // Initialize counterOrders if not present
  if (!cookingState.counterOrders) cookingState.counterOrders = [];

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
    exemptIdleStates: new Set(['eating', 'seated_waiting', 'at_counter', 'picking_up', 'browsing_shelf', 'at_cashier']),
    onIdleTimeout: (npc) => {
      npc._idleTime = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc.claimedChair !== null) npc.claimedChair = null;
      if (npc._counterSpotIdx >= 0) npc._counterSpotIdx = -1;
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      _cStartRoute(npc, _routeToExit(curTX, curTY), '_despawn', 0);
    },
    onStuckTimeout: (npc) => {
      npc._stuckFrames = 0;
      npc.hasFood = false;
      npc._recipeIngredients = null;
      if (npc.claimedChair !== null) npc.claimedChair = null;
      if (npc._counterSpotIdx >= 0) npc._counterSpotIdx = -1;
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
      if (npc._counterSpotIdx >= 0) npc._counterSpotIdx = -1;
      // Clean up any counter orders for this NPC
      if (typeof cookingState !== 'undefined' && cookingState.counterOrders) {
        for (let j = cookingState.counterOrders.length - 1; j >= 0; j--) {
          if (cookingState.counterOrders[j].npcId === npc.id) {
            cookingState.counterOrders.splice(j, 1);
          }
        }
      }
      npc.hasFood = false;
      npc._recipeIngredients = null;
      deliNPCs.splice(i, 1);
    },
  });
}
