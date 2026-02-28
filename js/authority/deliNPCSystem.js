// ===================== DELI NPC SYSTEM =====================
// Customer NPCs that line up, order food, sit at tables, buy extras.
// NO pathfinding — straight-line movement between defined waypoints.

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
  exit:        { tx: 13, ty: 27 },
  counterArea: { tx: 13, ty: 22 },   // corridor in front of counter
  counter:     { tx: 11, ty: 22 },   // pickup/order spot
  tipJar:      { tx: 15, ty: 22 },
  corridorE:   { tx: 25, ty: 22 },   // east end — past the counter wall
  diningEntry: { tx: 26, ty: 20 },   // gap into dining area
  condiments:  { tx: 35, ty: 13 },   // south side of condiment table
};

// Queue line — south from counter (vertical line at tx:11, same as ordering spot)
const QUEUE_SPOTS = [
  { tx: 11, ty: 22 },  // spot 0 = at counter (front of line)
  { tx: 11, ty: 23 },
  { tx: 11, ty: 24 },
  { tx: 11, ty: 25 },
  { tx: 11, ty: 26 },
  { tx: 11, ty: 27 },  // spot 5 = back of line (6 max)
];

// Kitchen zone — customer NPCs must stay out.
// Kitchen: tx:1-24, ty:1-20. The door at tx:24, ty:19-20 is open for the player.
const KITCHEN_BOUNDARY_X = 25 * TILE; // px: NPCs must have x >= this when above counter
const KITCHEN_BOUNDARY_Y = 21 * TILE; // px: restriction only applies above this line

// NPC collision constants
const NPC_BLOCK_DIST = 28;    // hard pre-movement blocking radius (px)
const NPC_QUEUE_SEP  = 44;    // hard separation for queue NPCs (nearly full tile)
const NPC_GENERAL_SEP = 28;   // hard separation for non-queue NPCs

// Chairs (NPCs sit here to eat) — 2 per side × 4 sides × 4 tables = 32 seats
const DELI_CHAIRS = [
  // Table 1 (28,4)
  { tx: 27, ty: 4,  sitDir: 3 },  { tx: 27, ty: 5,  sitDir: 3 },   // left ×2
  { tx: 31, ty: 4,  sitDir: 2 },  { tx: 31, ty: 5,  sitDir: 2 },   // right ×2
  { tx: 28, ty: 3,  sitDir: 0 },  { tx: 30, ty: 3,  sitDir: 0 },   // top ×2
  { tx: 28, ty: 6,  sitDir: 1 },  { tx: 30, ty: 6,  sitDir: 1 },   // bottom ×2
  // Table 2 (40,4)
  { tx: 39, ty: 4,  sitDir: 3 },  { tx: 39, ty: 5,  sitDir: 3 },
  { tx: 43, ty: 4,  sitDir: 2 },  { tx: 43, ty: 5,  sitDir: 2 },
  { tx: 40, ty: 3,  sitDir: 0 },  { tx: 42, ty: 3,  sitDir: 0 },
  { tx: 40, ty: 6,  sitDir: 1 },  { tx: 42, ty: 6,  sitDir: 1 },
  // Table 3 (28,17)
  { tx: 27, ty: 17, sitDir: 3 },  { tx: 27, ty: 18, sitDir: 3 },
  { tx: 31, ty: 17, sitDir: 2 },  { tx: 31, ty: 18, sitDir: 2 },
  { tx: 28, ty: 16, sitDir: 0 },  { tx: 30, ty: 16, sitDir: 0 },
  { tx: 28, ty: 19, sitDir: 1 },  { tx: 30, ty: 19, sitDir: 1 },
  // Table 4 (40,17)
  { tx: 39, ty: 17, sitDir: 3 },  { tx: 39, ty: 18, sitDir: 3 },
  { tx: 43, ty: 17, sitDir: 2 },  { tx: 43, ty: 18, sitDir: 2 },
  { tx: 40, ty: 16, sitDir: 0 },  { tx: 42, ty: 16, sitDir: 0 },
  { tx: 40, ty: 19, sitDir: 1 },  { tx: 42, ty: 19, sitDir: 1 },
];

// Aisle browse spots (stand next to shelves — all items are in the aisles now)
// NPCs stand in the walkway between/below shelf rows, centered on a shelf.
// Shelf row 1: ty:22-23. Shelf row 2: ty:26-27.
// Browse spots at ty:25 (gap between rows) and ty:29 (below row 2).
const DELI_AISLES = [
  // Browsing row 1 shelves from below (ty:25)
  { name: 'Frozen',    price: 4, tx: 29, ty: 25 },
  { name: 'Snacks',    price: 3, tx: 36, ty: 25 },
  { name: 'Drinks',    price: 3, tx: 43, ty: 25 },
  // Browsing row 2 shelves from below (ty:29)
  { name: 'Cookies',   price: 3, tx: 29, ty: 29 },
  { name: 'Soups',     price: 4, tx: 36, ty: 29 },
  { name: 'Dairy',     price: 4, tx: 43, ty: 29 },
];

// ===================== CONFIG =====================
const DELI_NPC_CONFIG = {
  minNPCs: 0,
  maxNPCs: 12,
  spawnInterval: [300, 900],   // 5-15 sec randomized range (frames at 60fps)
  baseSpeed: 0.9,              // slow relaxed stroll
  speedVariance: 0.15,
  eatDuration:    [1800, 3000], // 30-50 sec — long relaxed meal
  browseDuration: [480, 900],   // 8-15 sec browsing at an aisle
  condimentTime:  [300, 480],   // 5-8 sec at condiments
  condimentChance: 0.5,
  aisleChance:     0.7,        // chance to browse aisles after eating
  tipChance:       0.4,
  tipAmount:       [1, 5],
  // Persistent emoji mood display (5 time-based stages)
  moodEmojis: ['', '😐', '☹️', '😡', '🤬'], // stage 1-5 (stage 1 = no emoji)
  // Leave chance per 5-second check, indexed by moodStage (1-5)
  leaveChance: [0, 0.005, 0.02, 0.06, 0.22, 0.47],
  // Pre-queue aisle browsing
  preQueueBrowseChance: 0.3,      // 30% chance to browse aisles before joining line
  // (mood-based leaving config is in leaveChance array above)
};

// ===================== STATE =====================
const deliNPCs = [];
let _deliNPCId = 0;
let _deliSpawnTimer = 0;
let _nextSpawnInterval = 400; // randomized after each spawn

// ===================== HELPERS =====================
function _randRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function _randFromArray(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _tilePx(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

// ===================== ROUTE BUILDERS =====================
// Build arrays of {tx,ty} waypoints. ALL legs are horizontal or vertical
// to prevent NPCs clipping through solid entities.
//
// LAYOUT — AISLE AREA (tx:27+, ty:22+):
//   Shelf row 1: ty:22-23 → shelves at tx:27-31, tx:34-38, tx:41-45
//   Browse row 1: ty:25   → NPCs stand here to browse row 1 shelves
//   Shelf row 2: ty:26-27 → shelves at tx:27-31, tx:34-38, tx:41-45
//   Browse row 2: ty:29   → NPCs stand here to browse row 2 shelves
//
// GAPS between shelves (safe vertical corridors through aisle area):
//   tx:26  — west of all shelves (main corridor)
//   tx:32-33 — between shelf 1 (tx:27-31) and shelf 2 (tx:34-38)
//   tx:39-40 — between shelf 2 (tx:34-38) and shelf 3 (tx:41-45)
//   tx:46+ — east of all shelves
//
// SAFE CORRIDORS:
//   tx:26  vertical  ty:1-29   (just east of kitchen wall — main N/S corridor)
//   ty:20  horizontal tx:25-46  (below dining tables, above counter wall)
//   ty:25  horizontal tx:26-46  (between shelf rows — NPC browse row 1)
//   ty:29  horizontal tx:26-46  (below shelf row 2 — NPC browse row 2)
//   tx:32  vertical  ty:22-29  (gap between shelf columns 1 and 2)
//   tx:39  vertical  ty:22-29  (gap between shelf columns 2 and 3)

// Find the nearest safe vertical gap for a given tx position in the aisle area
function _nearestAisleGap(tx) {
  // Gaps: tx:26, tx:32, tx:39, tx:46
  const gaps = [26, 32, 39, 46];
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
    { tx: 26, ty: 22 },         // east along counter corridor
    { tx: 26, ty: 20 },         // north to safe horizontal corridor
    { tx: ch.tx, ty: 20 },      // east to chair's column (safe at ty:20)
    { tx: ch.tx, ty: ch.ty },   // north to chair
  ];
}

function _routeCounterToCondiments() {
  return [
    { tx: 26, ty: 22 },        // east along counter corridor
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
    // Gap is tx:26 — go straight south
    return [
      { tx: 26, ty: 22 },              // east to corridor junction
      { tx: 26, ty: aisle.ty },        // south to aisle row
      { tx: aisle.tx, ty: aisle.ty },  // east to aisle spot
    ];
  }
  // Gap is tx:32 or tx:39 — must go north to ty:20 first (above shelves),
  // then east to gap, then south through gap
  return [
    { tx: 26, ty: 22 },              // east to corridor junction
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
    route.push({ tx: 26, ty: 22 });               // south to counter corridor
  }
  route.push({ tx: 13, ty: 22 });  // west to exit area
  route.push({ tx: 13, ty: 27 });  // south to exit
  return route;
}

function _routeToTipJar(fromTX, fromTY) {
  const route = [];
  if (fromTX >= 25) {
    if (fromTY < 20) {
      route.push({ tx: fromTX, ty: 20 });
    } else if (fromTY >= 22) {
      const gap = _nearestAisleGap(fromTX);
      route.push({ tx: gap, ty: fromTY });
      if (gap !== 26) {
        route.push({ tx: gap, ty: 20 });
        route.push({ tx: 26, ty: 20 });
      } else {
        route.push({ tx: 26, ty: 20 });
      }
    }
    route.push({ tx: 26, ty: 22 });
  }
  route.push({ tx: 15, ty: 22 });    // west to tip jar
  return route;
}

// Route from exit to an aisle (for pre-queue browsing)
function _routeExitToAisle(aisle) {
  return [{ tx: 13, ty: 22 }].concat(_routeCounterToAisle(aisle));
}

// Route from aisle area back to a queue spot
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
  // Approach from one tile BELOW the spot to avoid visual double-line at tx:13
  const approachTY = Math.min(queueSpot.ty + 1, 27);
  route.push({ tx: 13, ty: 20 });                          // west to approach corridor
  route.push({ tx: 13, ty: approachTY });                   // south past queue Y level
  route.push({ tx: queueSpot.tx, ty: approachTY });         // west into line column
  route.push({ tx: queueSpot.tx, ty: queueSpot.ty });       // north into exact spot
  return route;
}

// ===================== ROUTE-BASED MOVEMENT =====================
// NPC walks toward route[0]. When close, shifts to next waypoint.
// When route is empty, movement is done.

function _npcStartRoute(npc, route, nextState, nextTimer) {
  npc.route = route;
  npc._nextState = nextState;
  npc._nextTimer = nextTimer || 0;
  npc.state = 'walking';
  npc.moving = true;
}

function moveDeliNPC(npc) {
  if (!npc.route || npc.route.length === 0) {
    npc.moving = false;
    return;
  }

  // --- Yield behavior: paused to let another NPC pass ---
  if (npc._yieldTimer > 0) {
    npc._yieldTimer--;
    npc.moving = false;
    // Try to sidestep perpendicular to route direction to make room
    if (npc.route && npc.route.length > 0) {
      const wp = npc.route[0];
      const routeDX = wp.tx * TILE + TILE / 2 - npc.x;
      const routeDY = wp.ty * TILE + TILE / 2 - npc.y;
      let stepX = 0, stepY = 0;
      if (Math.abs(routeDX) > Math.abs(routeDY)) {
        stepY = npc._yieldDir * 0.5; // moving horizontally → step vertically
      } else {
        stepX = npc._yieldDir * 0.5; // moving vertically → step horizontally
      }
      // Only step if clear of walls
      const mhw = 14;
      const testX = npc.x + stepX, testY = npc.y + stepY;
      const tcL = Math.floor((testX - mhw) / TILE), tcR = Math.floor((testX + mhw) / TILE);
      const trT = Math.floor((testY - mhw) / TILE), trB = Math.floor((testY + mhw) / TILE);
      if (!isSolid(tcL, trT) && !isSolid(tcR, trT) && !isSolid(tcL, trB) && !isSolid(tcR, trB)) {
        npc.x = testX;
        npc.y = testY;
      }
    }
    return; // skip normal movement this frame
  }

  const wp = npc.route[0];
  const targetX = wp.tx * TILE + TILE / 2;
  const targetY = wp.ty * TILE + TILE / 2;
  const dx = targetX - npc.x;
  const dy = targetY - npc.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 6) {
    // Snap to waypoint and advance
    npc.x = targetX;
    npc.y = targetY;
    npc.route.shift();
    npc._yieldCount = 0; // reset yield counter on successful waypoint arrival
    if (npc.route.length === 0) {
      npc.moving = false;
    }
    return;
  }

  // Walk toward current waypoint
  npc.moving = true;
  const spd = npc.speed;
  let moveX = (dx / dist) * spd;
  let moveY = (dy / dist) * spd;

  // Facing direction
  if (Math.abs(dx) > Math.abs(dy)) {
    npc.dir = dx > 0 ? 3 : 2;
  } else {
    npc.dir = dy > 0 ? 0 : 1;
  }

  npc.frame = (npc.frame + 0.1) % 4;

  // --- Phase A: Pre-movement NPC + Player blocking ---
  // Check if proposed move would overlap another NPC or player. If so, block that axis.
  let blockX = false, blockY = false;
  const _isActive = (s) => s !== 'eating' && s !== 'at_condiments' && s !== 'spawn_wait' && s !== '_despawn';

  for (const other of deliNPCs) {
    if (other === npc || !_isActive(other.state)) continue;
    // Check X-axis: would moving X put us inside other?
    if (Math.abs((npc.x + moveX) - other.x) < NPC_BLOCK_DIST &&
        Math.abs(npc.y - other.y) < NPC_BLOCK_DIST) {
      blockX = true;
    }
    // Check Y-axis: would moving Y put us inside other?
    if (Math.abs(npc.x - other.x) < NPC_BLOCK_DIST &&
        Math.abs((npc.y + moveY) - other.y) < NPC_BLOCK_DIST) {
      blockY = true;
    }
  }
  // Also block against player
  if (typeof GameState !== 'undefined') {
    const p = GameState.player;
    if (Math.abs((npc.x + moveX) - p.x) < NPC_BLOCK_DIST &&
        Math.abs(npc.y - p.y) < NPC_BLOCK_DIST) {
      blockX = true;
    }
    if (Math.abs(npc.x - p.x) < NPC_BLOCK_DIST &&
        Math.abs((npc.y + moveY) - p.y) < NPC_BLOCK_DIST) {
      blockY = true;
    }
  }

  // Zero out blocked axes
  if (blockX) moveX = 0;
  if (blockY) moveY = 0;

  // If fully blocked, trigger yield reaction
  if (blockX && blockY && !npc._yieldTimer) {
    npc._yieldTimer = _randRange(10, 20);
    npc._yieldDir = Math.random() < 0.5 ? -1 : 1;
    npc._yieldCount = (npc._yieldCount || 0) + 1;
    // Emergency unstick: if yielded too many times, snap to next waypoint
    if (npc._yieldCount > 5 && npc.route && npc.route.length > 0) {
      const snapWP = npc.route[0];
      npc.x = snapWP.tx * TILE + TILE / 2;
      npc.y = snapWP.ty * TILE + TILE / 2;
      npc.route.shift();
      npc._yieldCount = 0;
      npc._yieldTimer = 0;
    }
    return;
  }

  // --- AABB tile collision (same pattern as mobs) ---
  const mhw = 14; // NPC half-width

  // Try X axis
  if (moveX !== 0) {
    const nx = npc.x + moveX;
    let cL = Math.floor((nx - mhw) / TILE), cR = Math.floor((nx + mhw) / TILE);
    let rT = Math.floor((npc.y - mhw) / TILE), rB = Math.floor((npc.y + mhw) / TILE);
    if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
      npc.x = nx;
    }
  }
  // Try Y axis
  if (moveY !== 0) {
    const ny = npc.y + moveY;
    let cL = Math.floor((npc.x - mhw) / TILE), cR = Math.floor((npc.x + mhw) / TILE);
    let rT = Math.floor((ny - mhw) / TILE), rB = Math.floor((ny + mhw) / TILE);
    if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
      npc.y = ny;
    }
  }

  // --- Kitchen boundary (customer NPCs only) ---
  if (npc.y < KITCHEN_BOUNDARY_Y && npc.x < KITCHEN_BOUNDARY_X) {
    npc.x = KITCHEN_BOUNDARY_X;
  }

  // --- NPC-Player post-movement push (backup for existing overlaps) ---
  if (typeof GameState !== 'undefined') {
    const p = GameState.player;
    const pdx = npc.x - p.x, pdy = npc.y - p.y;
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
    if (pDist > 0 && pDist < NPC_BLOCK_DIST) {
      const push = (NPC_BLOCK_DIST - pDist);
      npc.x += (pdx / pDist) * push;
      npc.y += (pdy / pDist) * push;
    }
  }

  // --- Phase B: Post-movement hard NPC-NPC separation ---
  const inQueue = (npc.state === 'in_queue' || npc.state === 'ordering' || npc.state === 'waiting_food');
  const hardSep = inQueue ? NPC_QUEUE_SEP : NPC_GENERAL_SEP;
  for (const other of deliNPCs) {
    if (other === npc || !_isActive(other.state)) continue;
    const sx = npc.x - other.x;
    const sy = npc.y - other.y;
    const sd = Math.sqrt(sx * sx + sy * sy);
    if (sd > 0 && sd < hardSep) {
      const overlap = hardSep - sd;
      const ux = sx / sd, uy = sy / sd;

      // Priority: stationary queue NPCs are immovable (they snap each frame)
      const npcMoving = npc.route && npc.route.length > 0 && npc.moving;
      const otherInQueue = (other.state === 'in_queue' || other.state === 'ordering' || other.state === 'waiting_food');
      const otherStationary = otherInQueue && !(other.route && other.route.length > 0 && other.moving);

      if (otherStationary) {
        // Other is anchored in queue — this NPC yields fully
        if (inQueue) {
          npc.y += uy * overlap;
        } else {
          npc.x += ux * overlap;
          npc.y += uy * overlap;
        }
      } else {
        // Both mobile — split the push 50/50
        const halfPush = overlap * 0.5;
        if (inQueue) {
          npc.y += uy * halfPush;
        } else {
          npc.x += ux * halfPush;
          npc.y += uy * halfPush;
        }
      }
    }
  }
}

// ===================== QUEUE MANAGEMENT =====================

function _getQueueIndex(npc) {
  // Find what queue position this NPC is in
  let idx = 0;
  for (const other of deliNPCs) {
    if (other === npc) continue;
    if ((other.state === 'in_queue' || other.state === 'ordering' || other.state === 'waiting_food') && other._queueIdx < npc._queueIdx) {
      idx++;
    }
  }
  return npc._queueIdx;
}

function _nextQueueSpot() {
  // Find the next available queue index.
  // Include ANY NPC with a claimed queueIdx (even walking ones heading to the queue)
  // to prevent duplicate slot assignments when multiple NPCs enter simultaneously.
  const taken = new Set();
  for (const n of deliNPCs) {
    if (n._queueIdx >= 0) {
      taken.add(n._queueIdx);
    }
  }
  for (let i = 0; i < QUEUE_SPOTS.length; i++) {
    if (!taken.has(i)) return i;
  }
  return -1; // queue full
}

function _advanceQueue() {
  // Called when front-of-line NPC leaves. Everyone moves forward one slot.
  // Process front-to-back so each NPC only steps if the slot ahead is free.
  const inQueue = deliNPCs
    .filter(n => (n.state === 'in_queue' || n.state === 'ordering' || n.state === 'waiting_food') && n._queueIdx > 0)
    .sort((a, b) => a._queueIdx - b._queueIdx); // front-to-back order

  const occupied = new Set();
  // Mark slots currently being targeted or occupied
  for (const n of deliNPCs) {
    if (n.state === 'in_queue' || n.state === 'ordering' || n.state === 'waiting_food') {
      occupied.add(n._queueIdx);
    }
  }

  for (const n of inQueue) {
    const targetIdx = n._queueIdx - 1;
    if (!occupied.has(targetIdx)) {
      // Physical space check: is the target spot actually clear of NPCs?
      const targetSpot = QUEUE_SPOTS[targetIdx];
      if (targetSpot) {
        const tpx = targetSpot.tx * TILE + TILE / 2;
        const tpy = targetSpot.ty * TILE + TILE / 2;
        let spotClear = true;
        for (const other of deliNPCs) {
          if (other === n) continue;
          if (other.state === 'eating' || other.state === 'at_condiments' ||
              other.state === 'spawn_wait' || other.state === '_despawn') continue;
          if (Math.abs(other.x - tpx) < 24 && Math.abs(other.y - tpy) < 24) {
            spotClear = false;
            break;
          }
        }
        if (!spotClear) continue; // wait until spot is physically vacated
      }
      occupied.delete(n._queueIdx);
      n._queueIdx = targetIdx;
      occupied.add(targetIdx);
      if (targetSpot) {
        n.route = [{ tx: targetSpot.tx, ty: targetSpot.ty }];
      }
    }
    // else: slot ahead is still occupied — wait
  }
}

// ===================== SPAWN =====================
function spawnDeliNPC() {
  const app = _randFromArray(DELI_NPC_APPEARANCES);
  const sp = DELI_SPOTS.exit;
  const npc = {
    id: ++_deliNPCId,
    x: sp.tx * TILE + TILE / 2,
    y: sp.ty * TILE + TILE / 2,
    dir: 1, frame: 0, moving: false,
    skin: app.skin, hair: app.hair, shirt: app.shirt, pants: app.pants,
    name: _randFromArray(DELI_NPC_NAMES),
    state: 'entering',
    stateTimer: 0,
    route: null,
    _nextState: null,
    _nextTimer: 0,
    _queueIdx: -1,
    hasOrdered: false, hasFood: false, hasTipped: false,
    purchasedExtras: [],
    claimedChair: null,
    linkedOrderId: null,
    _pendingPurchase: null,
    _lastChairIdx: -1,
    _browseFirst: false,       // true if browsing aisles before joining queue
    _browsedPreQueue: false,   // true after completing pre-queue browse
    _aisleVisits: 0,           // track aisle visit count
    // Mood system — 5 time-based stages with persistent emoji display
    _moodStage: 1,             // 1=happy, 2=neutral, 3=upset, 4=angry, 5=raging
    _moodThreshold: _randRange(1800, 3600), // base threshold in frames (30-60s), randomized per NPC
    _waitFrames: 0,            // total frames spent waiting in queue
    _leaveCheckTimer: 0,       // frames until next leave-chance roll (every 300 = 5s)
    _moodProgress: 0,          // smooth 0→1 progress for mood meter rendering
    // Yield/collision reaction state
    _yieldTimer: 0,            // frames remaining in yield pause
    _yieldDir: 0,              // sidestep direction (-1 or 1)
    _yieldCount: 0,            // consecutive yields (for emergency unstick)
    // Emoji bubble rendering state (kept for draw.js compatibility)
    _bubbleTimer: 0,
    _bubbleActive: 0,
    _bubbleSpawnAnim: 0,
    _bubbleEmoji: null,
    _recipeIngredients: null,  // set when food is picked up (for food visual colors)
    speed: DELI_NPC_CONFIG.baseSpeed + (Math.random() - 0.5) * DELI_NPC_CONFIG.speedVariance * 2,
    isDeliNPC: true,
  };
  deliNPCs.push(npc);
  return npc;
}

function initDeliNPCs() {
  deliNPCs.length = 0;
  _deliNPCId = 0;
  _deliSpawnTimer = 0;
  // First customer walks in after 1-3 seconds, then 10-60s between each after that
  _nextSpawnInterval = _randRange(60, 180);
}

// ===================== AI STATE HANDLERS =====================

const DELI_NPC_AI = {

  // ─── SPAWN_WAIT: Staggered delay before entering ───────
  spawn_wait: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    npc.state = 'entering';
  },

  // ─── ENTERING: Walk from exit to queue (or browse aisles first) ──
  entering: (npc) => {
    // Pre-queue browsing chance — some customers grab sides before lining up
    if (!npc._browseFirst && !npc._browsedPreQueue &&
        Math.random() < DELI_NPC_CONFIG.preQueueBrowseChance) {
      npc._browseFirst = true;
      const aisle = _randFromArray(DELI_AISLES);
      npc._pendingPurchase = Math.random() < 0.6 ? aisle : null;
      _npcStartRoute(npc, _routeExitToAisle(aisle),
        'pre_queue_browse', _randRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      return;
    }

    const qIdx = _nextQueueSpot();
    if (qIdx < 0) {
      // Queue full — browse aisles instead
      const aisle = _randFromArray(DELI_AISLES);
      const route = [{ tx: 13, ty: 22 }].concat(_routeCounterToAisle(aisle));
      _npcStartRoute(npc, route,
        'shopping_aisle', _randRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      npc._pendingPurchase = Math.random() < 0.6 ? aisle : null;
      return;
    }
    npc._queueIdx = qIdx;
    const spot = QUEUE_SPOTS[qIdx];
    // Approach from one tile BELOW the spot, then walk north into position.
    // This avoids creating a visual "second line" at tx:13 alongside queue at tx:11.
    const approachTY = Math.min(spot.ty + 1, 27);
    _npcStartRoute(npc,
      [{ tx: 13, ty: approachTY }, { tx: spot.tx, ty: approachTY }, { tx: spot.tx, ty: spot.ty }],
      'in_queue', 0
    );
  },

  // ─── PRE-QUEUE BROWSE: Browsing aisles before joining queue ──
  pre_queue_browse: (npc) => {
    npc.moving = false;
    npc.dir = 1; // face shelves
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Process purchase
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

    // Done browsing — try to join queue
    npc._browsedPreQueue = true;
    const qIdx = _nextQueueSpot();
    if (qIdx < 0) {
      // Queue still full — browse another aisle or leave
      npc._aisleVisits++;
      if (npc._aisleVisits < 2 && Math.random() < 0.5) {
        const aisle = _randFromArray(DELI_AISLES);
        npc._pendingPurchase = Math.random() < 0.5 ? aisle : null;
        const curTX = Math.floor(npc.x / TILE);
        const curTY = Math.floor(npc.y / TILE);
        _npcStartRoute(npc, _routeAisleToAisle(curTX, curTY, aisle),
          'pre_queue_browse', _randRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1]));
      } else {
        const aTX = Math.floor(npc.x / TILE);
        const aTY = Math.floor(npc.y / TILE);
        _npcStartRoute(npc, _routeToExit(aTX, aTY), '_despawn', 0);
      }
      return;
    }

    // Join the queue from aisle
    npc._queueIdx = qIdx;
    const spot = QUEUE_SPOTS[qIdx];
    const curTX = Math.floor(npc.x / TILE);
    const curTY = Math.floor(npc.y / TILE);
    _npcStartRoute(npc, _routeAisleToQueue(curTX, curTY, spot), 'in_queue', 0);
  },

  // ─── WALKING: Follow route, then transition ────────────
  walking: (npc) => {
    // Movement handled by moveDeliNPC. Just check if route is done.
    if (npc.route && npc.route.length > 0) return;
    npc.state = npc._nextState || 'in_queue';
    npc.stateTimer = npc._nextTimer || 0;
  },

  // ─── IN QUEUE: Stand in line, wait for turn ────────────
  in_queue: (npc) => {
    // If we're still walking to our queue spot, keep going
    if (npc.route && npc.route.length > 0) {
      moveDeliNPC(npc);
      // Face north (toward person ahead) even while walking into position
      if (npc.route.length <= 1) npc.dir = 1;
      return;
    }
    npc.moving = false;
    npc.dir = 1; // face north — toward the back of the customer ahead in line

    // Snap to exact queue spot — prevents drifting sideways from separation push
    const spot = QUEUE_SPOTS[npc._queueIdx];
    if (spot) {
      npc.x = spot.tx * TILE + TILE / 2;
      npc.y = spot.ty * TILE + TILE / 2;
    }

    npc._waitFrames++; // track how long this NPC has been waiting

    // Front of line + shift active → become ordering
    if (npc._queueIdx === 0 && typeof cookingState !== 'undefined' && cookingState.active) {
      npc.state = 'ordering';
      return;
    }

    // Mood-based leaving: check every 5 seconds (300 frames)
    // Higher mood stage = higher chance to leave
    npc._leaveCheckTimer++;
    if (npc._leaveCheckTimer >= 300) {
      npc._leaveCheckTimer = 0;
      const chance = DELI_NPC_CONFIG.leaveChance[npc._moodStage] || 0;
      if (Math.random() < chance) {
        // Angry leave — show rage emote, walk to exit
        npc._bubbleEmoji = '🤬';
        npc._bubbleActive = 120; // show for 2s while leaving
        npc._bubbleSpawnAnim = 12;
        npc._queueIdx = -1;
        _advanceQueue();
        const curTX = Math.floor(npc.x / TILE);
        const curTY = Math.floor(npc.y / TILE);
        _npcStartRoute(npc, _routeToExit(curTX, curTY), '_despawn', 0);
        return;
      }
    }
  },

  // ─── MID-QUEUE BROWSE: Left queue to browse, will re-enter ──
  mid_queue_browse: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    // Process purchase
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

    // Try to rejoin queue
    const qIdx = _nextQueueSpot();
    if (qIdx < 0) {
      // Queue full — give up and leave
      const aTX = Math.floor(npc.x / TILE);
      const aTY = Math.floor(npc.y / TILE);
      _npcStartRoute(npc, _routeToExit(aTX, aTY), '_despawn', 0);
      return;
    }

    npc._queueIdx = qIdx;
    const spot = QUEUE_SPOTS[qIdx];
    const curTX = Math.floor(npc.x / TILE);
    const curTY = Math.floor(npc.y / TILE);
    _npcStartRoute(npc, _routeAisleToQueue(curTX, curTY, spot), 'in_queue', 0);
  },

  // ─── ORDERING: At counter, waiting for spawnOrder() to link us ──
  ordering: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    // Snap to queue spot 0 (counter)
    npc.x = QUEUE_SPOTS[0].tx * TILE + TILE / 2;
    npc.y = QUEUE_SPOTS[0].ty * TILE + TILE / 2;
    // spawnOrder() in cookingSystem.js will find us and link the order
    // If shift ends while waiting, leave
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      npc.hasOrdered = true;
      npc._queueIdx = -1;
      _advanceQueue();
      // Go browse aisles instead
      const aisle = _randFromArray(DELI_AISLES);
      _npcStartRoute(npc, _routeCounterToAisle(aisle),
        'shopping_aisle', _randRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1])
      );
      npc._pendingPurchase = Math.random() < 0.5 ? aisle : null;
    }
  },

  // ─── WAITING FOOD: Linked to order, waiting for cook ───
  waiting_food: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    // Snap to queue spot 0 (counter)
    npc.x = QUEUE_SPOTS[0].tx * TILE + TILE / 2;
    npc.y = QUEUE_SPOTS[0].ty * TILE + TILE / 2;
    // applyOrderResult() in cookingSystem.js will set us to pickup_food
    if (typeof cookingState !== 'undefined' && !cookingState.active) {
      npc.linkedOrderId = null;
      npc._queueIdx = -1;
      _advanceQueue();
      _npcStartRoute(npc, _routeToExit(11, 22), '_despawn', 0);
    }
  },

  // ─── PICKUP FOOD: Got food! Brief pause, then go eat ───
  pickup_food: (npc) => {
    if (npc.stateTimer > 0) { npc.stateTimer--; npc.moving = false; return; }

    npc.hasOrdered = true;
    npc._queueIdx = -1;
    _advanceQueue();

    // Claim a chair
    const claimed = new Set();
    for (const n of deliNPCs) if (n.claimedChair !== null) claimed.add(n.claimedChair);
    const avail = [];
    for (let i = 0; i < DELI_CHAIRS.length; i++) if (!claimed.has(i)) avail.push(i);
    const chairIdx = avail.length > 0 ? _randFromArray(avail) : 0;
    npc.claimedChair = chairIdx;
    npc._lastChairIdx = chairIdx;

    // 50% visit condiments first
    if (Math.random() < DELI_NPC_CONFIG.condimentChance) {
      _npcStartRoute(npc, _routeCounterToCondiments(), 'at_condiments',
        _randRange(DELI_NPC_CONFIG.condimentTime[0], DELI_NPC_CONFIG.condimentTime[1]));
    } else {
      _npcStartRoute(npc, _routeCounterToChair(chairIdx), 'eating',
        _randRange(DELI_NPC_CONFIG.eatDuration[0], DELI_NPC_CONFIG.eatDuration[1]));
    }
  },

  // ─── AT CONDIMENTS: Using condiments, then go to chair ─
  at_condiments: (npc) => {
    npc.moving = false;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }
    // Head to chair
    const chairIdx = npc.claimedChair !== null ? npc.claimedChair : 0;
    _npcStartRoute(npc, _routeCondimentsToChair(chairIdx), 'eating',
      _randRange(DELI_NPC_CONFIG.eatDuration[0], DELI_NPC_CONFIG.eatDuration[1]));
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
    const lastChair = npc.claimedChair;
    npc.claimedChair = null;

    // Browse aisles after eating
    if (Math.random() < DELI_NPC_CONFIG.aisleChance) {
      const aisle = _randFromArray(DELI_AISLES);
      npc._pendingPurchase = Math.random() < 0.6 ? aisle : null;
      _npcStartRoute(npc, _routeChairToAisle(lastChair, aisle), 'shopping_aisle',
        _randRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1]));
    } else if (!npc.hasTipped && Math.random() < DELI_NPC_CONFIG.tipChance) {
      // Go tip
      const ch = DELI_CHAIRS[lastChair];
      _npcStartRoute(npc, _routeToTipJar(ch.tx, ch.ty), 'tipping', 0);
    } else {
      // Leave
      const ch = DELI_CHAIRS[lastChair];
      _npcStartRoute(npc, _routeToExit(ch.tx, ch.ty), '_despawn', 0);
    }
  },

  // ─── SHOPPING AISLE: Browsing grocery shelves ──────────
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
      const aisle = _randFromArray(DELI_AISLES);
      npc._pendingPurchase = Math.random() < 0.5 ? aisle : null;
      const curTX = Math.floor(npc.x / TILE);
      const curTY = Math.floor(npc.y / TILE);
      // Route through nearest shelf gap — natural aisle movement
      _npcStartRoute(npc,
        _routeAisleToAisle(curTX, curTY, aisle),
        'shopping_aisle', _randRange(DELI_NPC_CONFIG.browseDuration[0], DELI_NPC_CONFIG.browseDuration[1]));
      return;
    }

    // Done browsing — tip or leave
    const aTX = Math.floor(npc.x / TILE);
    const aTY = Math.floor(npc.y / TILE);
    if (!npc.hasTipped && Math.random() < DELI_NPC_CONFIG.tipChance) {
      _npcStartRoute(npc, _routeToTipJar(aTX, aTY), 'tipping', 0);
    } else {
      _npcStartRoute(npc, _routeToExit(aTX, aTY), '_despawn', 0);
    }
  },

  // ─── TIPPING: At tip jar ───────────────────────────────
  tipping: (npc) => {
    npc.moving = false;
    npc.dir = 1;
    if (npc.stateTimer > 0) { npc.stateTimer--; return; }

    if (!npc.hasTipped) {
      npc.hasTipped = true;
      npc.stateTimer = 60; // pause while tipping (~1 sec)
      const tipAmt = _randRange(DELI_NPC_CONFIG.tipAmount[0], DELI_NPC_CONFIG.tipAmount[1]);
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
    _npcStartRoute(npc, _routeToExit(15, 22), '_despawn', 0);
  },

  // ─── LEAVING (legacy compat for cookingSystem) ─────────
  leaving: (npc) => {
    // cookingSystem may set this state — route to exit
    if (!npc.route || npc.route.length === 0) {
      npc.route = [{ tx: 13, ty: 22 }, { tx: 13, ty: 27 }];
    }
    moveDeliNPC(npc);
    if (!npc.route || npc.route.length === 0) {
      npc.state = '_despawn';
    }
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

// ===================== MOOD STAGE UPDATE =====================
// 5 time-based stages. Mood only worsens while waiting in line.
// _moodThreshold is randomized per NPC (30-60s base, frames at 60fps).
//   Stage 1: 0 → threshold         (happy, no emoji)
//   Stage 2: threshold → threshold*2 (neutral 😐)
//   Stage 3: threshold*2 → threshold*3 (upset ☹️)
//   Stage 4: threshold*3 → threshold*4 (angry 😡)
//   Stage 5: threshold*4+             (raging 🤬)
function _updateNPCMood(npc) {
  // Only track mood for NPCs in line
  const inLine = npc.state === 'in_queue' || npc.state === 'waiting_food' || npc.state === 'ordering';
  if (!inLine) {
    // Reset emoji when not in line (keep waitFrames for re-entry)
    npc._bubbleEmoji = null;
    return;
  }

  // Compute mood stage from wait time
  const t = npc._moodThreshold;
  const w = npc._waitFrames;
  let stage;
  if (w < t)       stage = 1;
  else if (w < t * 2) stage = 2;
  else if (w < t * 3) stage = 3;
  else if (w < t * 4) stage = 4;
  else                 stage = 5;
  npc._moodStage = stage;

  // Smooth progress 0→1 for mood meter (continuous, not stepped)
  // Goes from 0 (just joined) to 1.0 (max rage = threshold*5 frames)
  npc._moodProgress = Math.min(1, w / (t * 5));

  // Persistent emoji — always shown when stage >= 2
  const emojis = DELI_NPC_CONFIG.moodEmojis;
  npc._bubbleEmoji = stage >= 2 ? emojis[stage - 1] : null;
  // Keep _bubbleActive high so draw.js always renders it
  npc._bubbleActive = stage >= 2 ? 999 : 0;
  npc._bubbleSpawnAnim = 12; // skip spawn animation for persistent display
}

// ===================== MAIN UPDATE =====================
function updateDeliNPCs() {
  if (typeof Scene === 'undefined' || !Scene.inCooking) return;

  // Spawn management — one customer at a time, 10-60s apart
  _deliSpawnTimer++;
  if (_deliSpawnTimer >= _nextSpawnInterval) {
    _deliSpawnTimer = 0;
    _nextSpawnInterval = _randRange(DELI_NPC_CONFIG.spawnInterval[0], DELI_NPC_CONFIG.spawnInterval[1]);
    if (deliNPCs.length < DELI_NPC_CONFIG.maxNPCs) {
      spawnDeliNPC(); // enters in 'entering' state — walks in one by one
    }
  }

  // Update each NPC
  for (let i = deliNPCs.length - 1; i >= 0; i--) {
    const npc = deliNPCs[i];

    // Run state handler
    const handler = DELI_NPC_AI[npc.state];
    if (handler) handler(npc);

    // Update mood stage + persistent emoji
    _updateNPCMood(npc);

    // Move along route (walking state — other states that move call moveDeliNPC internally)
    if (npc.state === 'walking') {
      moveDeliNPC(npc);
    }

    // Despawn
    if (npc.state === '_despawn') {
      if (npc.claimedChair !== null) npc.claimedChair = null;
      if (npc._queueIdx >= 0) { npc._queueIdx = -1; _advanceQueue(); }
      deliNPCs.splice(i, 1);
    }
  }
}
