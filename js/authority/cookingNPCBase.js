// ===================== COOKING NPC BASE =====================
// Shared utilities for all restaurant NPC systems (deli, diner, fine dining).
// Loaded BEFORE per-restaurant NPC scripts.

// ===================== UTILITY FUNCTIONS =====================

function _cRandRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function _cRandFromArray(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function _cTilePx(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
}

function _cWP(tx, ty) {
  return { tx: tx, ty: ty };
}

function _cCloneRoute(route) {
  if (!route) return null;
  return route.map(wp => ({ tx: wp.tx, ty: wp.ty }));
}

function _cConcatRoutes() {
  const route = [];
  for (let i = 0; i < arguments.length; i++) {
    const segment = arguments[i];
    if (Array.isArray(segment)) {
      for (const wp of segment) route.push({ tx: wp.tx, ty: wp.ty });
    }
  }
  return route;
}

// ===================== NPC FACTORY =====================

// Create a base NPC with all shared fields. Per-system fields are merged via extraFields.
// idCounter: { value: N } (mutated), spawnPos: { tx, ty }
function _cCreateNPC(idCounter, spawnPos, appearances, names, config, extraFields) {
  const app = _cRandFromArray(appearances);
  const npc = {
    id: ++idCounter.value,
    x: spawnPos.tx * TILE + TILE / 2,
    y: spawnPos.ty * TILE + TILE / 2,
    dir: 1, frame: 0, moving: false,
    skin: app.skin, hair: app.hair, shirt: app.shirt, pants: app.pants,
    name: _cRandFromArray(names),
    state: 'entering',
    stateTimer: 0,
    route: null,
    _nextState: null,
    _nextTimer: 0,
    hasOrdered: false, hasFood: false,
    linkedOrderId: null,
    _stuckFrames: 0,
    _idleTime: 0,
    speed: config.baseSpeed + (Math.random() - 0.5) * config.speedVariance * 2,
  };
  if (extraFields) Object.assign(npc, extraFields);
  return npc;
}

// ===================== ROUTE START =====================

// Start an NPC walking along a route. Always clones route for safety.
// intent: optional route intent object for recovery (diner/FD)
function _cStartRoute(npc, route, nextState, nextTimer, intent) {
  npc.route = _cCloneRoute(route);
  npc._nextState = nextState;
  npc._nextTimer = nextTimer || 0;
  if (intent !== undefined) {
    npc._routeIntent = intent || null;
    npc._recoveryTried = false;
  }
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
}

// ===================== MOVEMENT =====================
//
// cfg = {
//   npcList:           Array,           — the NPC array for avoidance
//   skipStates:        Set<string>,     — other NPCs in these states are ignored
//   kitchenCheck:      fn(px,py)->bool, — returns true if position is in kitchen
//   kitchenSafe:       {tx,ty},         — teleport position when stuck in kitchen
//   kitchenFallback:   [{tx,ty},...],   — route after kitchen teleport
//   laneMode:          'checked'|'always'|'none',  — how to apply lane offsets
//   laneDisableStates: Set<string>,     — states where lane offsets are disabled
//   selfAvoidSkip:     fn(npc)->bool,   — if true, skip ALL avoidance for this NPC
//   pairSkip:          fn(npc,other)->bool, — if true, skip avoidance for this pair
//   pairBehavior:      fn(npc,other)->'skip'|'slow'|'yield', — custom pair behavior
// }

function _cMoveNPC(npc, cfg) {
  if (!npc.route || npc.route.length === 0) {
    npc.moving = false;
    return;
  }

  const wp = npc.route[0];
  const rawX = wp.tx * TILE + TILE / 2;
  const rawY = wp.ty * TILE + TILE / 2;
  let targetX, targetY;

  // Target with optional lane offset
  if (cfg.laneMode === 'none') {
    targetX = rawX;
    targetY = rawY;
  } else {
    const disableLane = cfg.laneDisableStates && cfg.laneDisableStates.has(npc.state);
    const offX = disableLane ? 0 : (npc._laneOffX || 0);
    const offY = disableLane ? 0 : (npc._laneOffY || 0);
    targetX = rawX + offX;
    targetY = rawY + offY;
    // 'checked' mode: drop offset if it puts NPC inside a wall
    if (cfg.laneMode === 'checked' && typeof positionClear === 'function' && !positionClear(targetX, targetY, 14)) {
      targetX = rawX;
      targetY = rawY;
    }
  }

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

  // NPC-NPC avoidance — lower-ID NPCs have priority, higher-ID yields
  if (!cfg.selfAvoidSkip || !cfg.selfAvoidSkip(npc)) {
    for (const other of cfg.npcList) {
      if (other === npc) continue;
      if (cfg.skipStates.has(other.state)) continue;
      if (cfg.pairSkip && cfg.pairSkip(npc, other)) continue;

      const sx = npc.x - other.x;
      const sy = npc.y - other.y;
      const sd = Math.sqrt(sx * sx + sy * sy);
      if (sd > 0 && sd < 50) {
        const behavior = cfg.pairBehavior ? cfg.pairBehavior(npc, other) : 'yield';
        if (behavior === 'skip') continue;
        if (behavior === 'slow') {
          spd *= 0.15;
        } else if (npc.id > other.id) {
          // Yield: slow down and nudge away
          spd *= 0.3;
          const pushStr = (50 - sd) * 0.2;
          const nx = sx / sd, ny = sy / sd;
          const testX = npc.x + nx * pushStr;
          const testY = npc.y + ny * pushStr;
          if (!cfg.kitchenCheck(testX, testY) &&
              (typeof positionClear !== 'function' || positionClear(testX, testY, 14))) {
            npc.x = testX;
            npc.y = testY;
          }
        }
      }
    }
  }

  // Recalculate direction after any nudge
  dx = targetX - npc.x;
  dy = targetY - npc.y;
  dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;

  // Calculate next position
  const nextX = npc.x + (dx / dist) * spd;
  const nextY = npc.y + (dy / dist) * spd;

  // Kitchen zone restriction — NPCs must not enter kitchen
  if (cfg.kitchenCheck(nextX, nextY)) {
    if (cfg.kitchenCheck(npc.x, npc.y)) {
      // Already inside — teleport out
      const safe = _cTilePx(cfg.kitchenSafe.tx, cfg.kitchenSafe.ty);
      npc.x = safe.x;
      npc.y = safe.y;
      npc._stuckFrames = 0;
      npc.route = _cCloneRoute(cfg.kitchenFallback);
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

  // Movement succeeded — reset stuck counter
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

// ===================== RECOVERY =====================
//
// Attempts to recover a stuck NPC by rebuilding its route from saved intent.
// cfg = {
//   buildRouteFromIntent: fn(intent, cx)->route,
//   getIntentAnchor:      fn(intent, npc)->{tx,ty},
//   kitchenCheck:         fn(px,py)->bool,
//   kitchenSafe:          {tx,ty},
//   routeToExit:          fn(tx,ty,cx)->route,
//   getPartyCX:           fn(npc)->corridorTX,
// }
// Returns true if recovery succeeded.

function _cRecoverNPC(npc, cfg) {
  if (!cfg.buildRouteFromIntent) return false;
  if (npc._recoveryTried) return false;

  npc._recoveryTried = true;
  if (npc._laneOffX !== undefined) { npc._laneOffX = 0; npc._laneOffY = 0; }

  const intent = npc._routeIntent;
  const cx = cfg.getPartyCX ? cfg.getPartyCX(npc) : undefined;
  let route = cfg.buildRouteFromIntent(intent, cx);
  let anchor = cfg.getIntentAnchor(intent, npc);

  if ((!route || route.length === 0) && cfg.kitchenCheck(npc.x, npc.y)) {
    anchor = cfg.kitchenSafe;
    route = cfg.routeToExit(anchor.tx, anchor.ty, cx);
    npc._routeIntent = { kind: 'tile_to_exit', tx: anchor.tx, ty: anchor.ty };
  }

  if (!anchor || !route || route.length === 0) return false;

  const pos = _cTilePx(anchor.tx, anchor.ty);
  npc.x = pos.x;
  npc.y = pos.y;
  npc.route = _cCloneRoute(route);
  npc.state = 'walking';
  npc.moving = true;
  npc._idleTime = 0;
  return true;
}

// ===================== SPAWN TIMER =====================
//
// timerState: { timer: N, nextInterval: N } (mutated)
// Returns true if spawn should happen this frame.

function _cSpawnTick(timerState, intervalRange, canSpawn) {
  timerState.timer++;
  if (timerState.timer >= timerState.nextInterval) {
    timerState.timer = 0;
    timerState.nextInterval = _cRandRange(intervalRange[0], intervalRange[1]);
    return canSpawn();
  }
  return false;
}

// ===================== UPDATE LOOP =====================
//
// loopCfg = {
//   restaurantId:     string,            — e.g. 'street_deli', 'diner', 'fine_dining'
//   spawnState:       { timer, nextInterval },
//   spawnInterval:    [min, max],
//   canSpawn:         fn()->bool,
//   doSpawn:          fn(),
//   npcList:          Array,
//   stateHandlers:    {},
//   moveFn:           fn(npc),
//   exemptIdleStates: Set<string>,       — states exempt from 60s idle timeout
//   onIdleTimeout:    fn(npc),           — cleanup + route to exit
//   onStuckTimeout:   fn(npc)->bool,     — return true if handled (recovery), false to despawn
//   onDespawn:        fn(npc, i),        — splice + resource cleanup
//   postLoop:         fn(),              — party cleanup (optional)
// }

function _cUpdateNPCLoop(loopCfg) {
  if (typeof Scene === 'undefined' || !Scene.inCooking) return;
  if (typeof cookingState === 'undefined' || cookingState.activeRestaurantId !== loopCfg.restaurantId) return;

  // Spawn timer
  if (_cSpawnTick(loopCfg.spawnState, loopCfg.spawnInterval, loopCfg.canSpawn)) {
    loopCfg.doSpawn();
  }

  // Update each NPC
  const list = loopCfg.npcList;
  for (let i = list.length - 1; i >= 0; i--) {
    const npc = list[i];
    const prevState = npc.state;

    // Run state handler
    const handler = loopCfg.stateHandlers[npc.state];
    if (handler) handler(npc);

    // Reset idle timer on state change
    if (npc.state !== prevState) npc._idleTime = 0;

    // Move along route (walking state)
    if (npc.state === 'walking') {
      loopCfg.moveFn(npc);
    }

    // Universal idle safety net — 60+ sec in non-exempt states → force exit
    if (npc.state !== '_despawn' && npc.state !== '_despawn_walk' &&
        npc.state !== 'walking' &&
        !loopCfg.exemptIdleStates.has(npc.state) &&
        (npc._idleTime || 0) >= 3600) {
      loopCfg.onIdleTimeout(npc);
    }

    // Stuck detection — blocked 3+ seconds
    if ((npc._stuckFrames || 0) >= 180 && npc.state !== '_despawn' && npc.state !== '_despawn_walk') {
      loopCfg.onStuckTimeout(npc);
    }

    // Despawn
    if (npc.state === '_despawn') {
      loopCfg.onDespawn(npc, i);
    }
  }

  // Post-loop cleanup (e.g. party cleanup)
  if (loopCfg.postLoop) loopCfg.postLoop();
}

// ===================== PARTY UTILITIES =====================
// Shared by diner and fine dining (party-based systems).

function _cFindNPCById(npcList, id) {
  for (const n of npcList) { if (n.id === id) return n; }
  return null;
}

function _cFindParty(partyList, partyId) {
  for (const p of partyList) { if (p.id === partyId) return p; }
  return null;
}

function _cGetPartyLeader(partyList, npcList, party) {
  if (!party) return null;
  return _cFindNPCById(npcList, party.leaderId);
}

function _cGetPartyMembers(npcList, party) {
  if (!party) return [];
  return party.members.map(id => _cFindNPCById(npcList, id)).filter(n => n !== null);
}

// Clean up parties where all members have despawned.
// releaseResource: fn(party) — release booth/table
function _cCleanupParties(partyList, npcList, releaseResource) {
  for (let i = partyList.length - 1; i >= 0; i--) {
    const party = partyList[i];
    const anyAlive = party.members.some(id => _cFindNPCById(npcList, id) !== null);
    if (!anyAlive) {
      releaseResource(party);
      party.state = 'done';
      partyList.splice(i, 1);
    }
  }
}
