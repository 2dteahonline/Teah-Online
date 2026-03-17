// ===================== SPAR TRAINING HARNESS =====================
// Console-driven training for spar bot style generalization.
// Usage: sparTrain('rusher', 20), sparTrain('all', 50), sparSelfPlay(50), sparFullSelfPlay(10000)
//
// Architecture: training archetypes are "scripted player input generators."
// They output { moveX, moveY, shouldShoot, aimDir } each frame.
// authorityTick.js applies these to InputIntent before update(), so the
// player uses the full real movement/gun pipeline (freeze, knockback, etc.).
// The enemy bot (teamB) keeps its real duel style AI — results feed
// general1v1.styleResults.{pressure,control,bait} for the style selector.

const SPAR_TRAINING_TIMING = {
  countdownFrames: 4,
  postMatchFrames: 3,
  joinPollMs: 5,
  nextMatchDelayMs: 5,
  speedMultiplier: 1,
  fixedUpdatesPerLoop: 60,
  maxUpdatesPerFrame: 60,
  disableRender: true,
  renderEveryUpdates: 999999,
  minRenderIntervalMs: 1000,
  useTimeoutScheduler: true,
  logEveryMatches: 100,
  saveEveryMatches: 50,
  snapshotRefreshEvery: 500,
};

const SPAR_TRAINING_ARCHETYPES = {
  rusher: {
    label: 'Rusher',
    desc: 'Pushes toward target, shoots on cooldown, minimal strafe',
    getIntent(p, tgt, dist, dx, dy, speed, rt) {
      let mx = 0, my = 0;
      if (dist > 1) { mx = (dx / dist) * speed * 0.7; my = (dy / dist) * speed * 0.7; }
      mx += rt.strafeDir * speed * 0.2;
      return { mx, my, shouldShoot: true, dx, dy };
    },
  },
  waller: {
    label: 'Waller',
    desc: 'Holds bottom, strafes wide, walls bullets up',
    getIntent(p, tgt, dist, dx, dy, speed, rt) {
      const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaH = arenaLevel.heightTiles * TILE;
      let mx = 0, my = 0;
      if (p.y < arenaH * 0.75) {
        mx = rt.strafeDir * speed * 0.3;
        my = speed * 0.8;
      } else {
        mx = rt.strafeDir * speed * 0.85;
        my = 0;
        if (p.y < arenaH * 0.7) my = speed * 0.3;
      }
      return { mx, my, shouldShoot: true, dx, dy };
    },
  },
  strafer: {
    label: 'Strafer',
    desc: 'Wide strafes, mid-range, picks shots',
    getIntent(p, tgt, dist, dx, dy, speed, rt) {
      let mx = rt.strafeDir * speed * 0.9, my = 0;
      if (dist > 350 && dist > 1) {
        mx += (dx / dist) * speed * 0.3;
        my = (dy / dist) * speed * 0.3;
      } else if (dist < 200 && dist > 1) {
        mx -= (dx / dist) * speed * 0.3;
        my = -(dy / dist) * speed * 0.3;
      }
      const alignX = Math.abs(tgt.x - p.x), alignY = Math.abs(tgt.y - p.y);
      return { mx, my, shouldShoot: Math.min(alignX, alignY) < 50, dx, dy };
    },
  },
  retreater: {
    label: 'Retreater',
    desc: 'Backpedals while shooting',
    getIntent(p, tgt, dist, dx, dy, speed, rt) {
      let mx = 0, my = 0;
      if (dist > 1) { mx = -(dx / dist) * speed * 0.5; my = -(dy / dist) * speed * 0.5; }
      mx += rt.strafeDir * speed * 0.5;
      return { mx, my, shouldShoot: true, dx, dy };
    },
  },
  corner: {
    label: 'Corner',
    desc: 'Holds a bottom corner, peek-shoots',
    getIntent(p, tgt, dist, dx, dy, speed, rt) {
      const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaW = arenaLevel.widthTiles * TILE;
      const arenaH = arenaLevel.heightTiles * TILE;
      if (!rt.cornerTarget) {
        const corners = [
          { x: TILE * 3, y: arenaH - TILE * 3 },
          { x: arenaW - TILE * 3, y: arenaH - TILE * 3 },
        ];
        rt.cornerTarget = corners[Math.floor(Math.random() * 2)];
      }
      const cdx = rt.cornerTarget.x - p.x, cdy = rt.cornerTarget.y - p.y;
      const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
      let mx = 0, my = 0;
      if (cDist > 60) {
        mx = (cdx / cDist) * speed * 0.6;
        my = (cdy / cDist) * speed * 0.6;
      } else {
        mx = rt.strafeDir * speed * 0.5;
      }
      return { mx, my, shouldShoot: true, dx, dy };
    },
  },
};

// ---- Training state ----
let _sparTrainState = null;

function sparTrain(botType, count) {
  if (!count || count < 1) count = 10;

  if (botType === 'all') {
    const types = Object.keys(SPAR_TRAINING_ARCHETYPES);
    const perType = Math.ceil(count / types.length);
    console.log(`[SparTrain] Starting ${count} matches rotating all types (${perType} each)`);
    _sparTrainState = {
      active: true,
      mode: 'archetype',
      botType: null,
      queue: [],
      totalMatches: count,
      completedMatches: 0,
      results: {},
      startTime: Date.now(),
      runtime: _createTrainingRuntime(),
    };
    for (const t of types) {
      _sparTrainState.results[t] = { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 };
      for (let i = 0; i < perType; i++) _sparTrainState.queue.push(t);
    }
    _sparTrainState.queue = _sparTrainState.queue.slice(0, count);
    _sparTrainStartNext();
    return;
  }

  if (!SPAR_TRAINING_ARCHETYPES[botType]) {
    console.log(`[SparTrain] Unknown type: ${botType}. Available: ${Object.keys(SPAR_TRAINING_ARCHETYPES).join(', ')}`);
    return;
  }

  console.log(`[SparTrain] Starting ${count} matches against ${botType}`);
  _sparTrainState = {
    active: true,
    mode: 'archetype',
    botType: botType,
    queue: Array(count).fill(botType),
    totalMatches: count,
    completedMatches: 0,
    results: { [botType]: { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 } },
    startTime: Date.now(),
    runtime: _createTrainingRuntime(),
  };
  _sparTrainStartNext();
}

function _createTrainingRuntime() {
  return {
    strafeDir: 1, strafeTimer: 0, cornerTarget: null,
    selfPlayStyle: null, selfPlayRoute: null, selfPlayAntiBottom: null,
    selfPlayReactionDelay: 0, selfPlaySidePref: null, selfPlayVariantLabel: null,
    // Policy-dimension behavioral overrides for self-play diversity
    selfPlayShootAggr: null,     // 'aggressive'|'patient'|null — shot timing behavior
    selfPlayRetreatSpeed: null,  // 'fast'|'slow'|null — how quickly to disengage
    selfPlayGunSideBias: null,   // 'peek'|'hold'|null — lateral aggression
    selfPlayReloadPunish: null,  // 'hard'|'soft'|null — how aggressively to punish reloads
  };
}

// Randomize self-play snapshot bot parameters for diversity across matches.
// Returns a variant config object with overrides to apply to the runtime.
function _randomizeSelfPlayVariant(policy) {
  const variant = { label: 'base' };
  const parts = [];

  // (a) Opening route bias: 30% chance to override with a random route
  if (Math.random() < 0.30) {
    const routes = typeof SPAR_OPENING_ROUTE_KEYS !== 'undefined'
      ? SPAR_OPENING_ROUTE_KEYS
      : ['bottomLeft', 'bottomRight', 'bottomCenter', 'topHold', 'midFlank', 'mirrorPlayer'];
    variant.route = routes[Math.floor(Math.random() * routes.length)];
    parts.push('route=' + variant.route);
  }

  // (b) Duel style rotation: 25% chance to override with a random style
  if (Math.random() < 0.25) {
    const styles = Object.keys(SPAR_DUEL_STYLES);
    variant.style = styles[Math.floor(Math.random() * styles.length)];
    parts.push('style=' + variant.style);
  }

  // (c) Stat allocation: randomize CT-X point distribution
  // Randomly distribute 100 points: freeze(0-60), rof(20-80), spread(0-40)
  const budget = typeof SPAR_CONFIG !== 'undefined' ? SPAR_CONFIG.POINT_BUDGET : 100;
  const freezeMin = 0, freezeMax = 60;
  const rofMin = 20, rofMax = 80;
  const spreadMin = 0, spreadMax = 40;
  const freeze = freezeMin + Math.floor(Math.random() * (freezeMax - freezeMin + 1));
  const remaining = budget - freeze;
  const rofLow = Math.max(rofMin, remaining - spreadMax);
  const rofHigh = Math.min(rofMax, remaining - spreadMin);
  const rof = rofLow + Math.floor(Math.random() * (rofHigh - rofLow + 1));
  const spread = budget - freeze - rof;
  variant.ctxAlloc = { freeze, rof, spread };
  parts.push('ctx=' + freeze + '/' + rof + '/' + spread);

  // (d) Reaction delay: 0-4 frames artificial delay on shooting
  variant.reactionDelay = Math.floor(Math.random() * 5);
  if (variant.reactionDelay > 0) parts.push('delay=' + variant.reactionDelay + 'f');

  // (e) Side preference: 40% left, 40% right, 20% none
  const sideRoll = Math.random();
  if (sideRoll < 0.40) {
    variant.sidePref = 'left';
    parts.push('side=L');
  } else if (sideRoll < 0.80) {
    variant.sidePref = 'right';
    parts.push('side=R');
  } else {
    variant.sidePref = null;
  }

  // (f) Anti-bottom family bias: 20% chance to force a specific family
  if (Math.random() < 0.20) {
    const families = typeof SPAR_ANTI_BOTTOM_FAMILY_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_FAMILY_KEYS
      : ['contest', 'flank', 'bait'];
    variant.antiBottomFamily = families[Math.floor(Math.random() * families.length)];
    parts.push('ab=' + variant.antiBottomFamily);
  }

  // (g) Shot timing behavior: 25% aggressive, 25% patient, 50% default
  const shootRoll = Math.random();
  if (shootRoll < 0.25) { variant.shootAggr = 'aggressive'; parts.push('shoot=aggr'); }
  else if (shootRoll < 0.50) { variant.shootAggr = 'patient'; parts.push('shoot=patient'); }

  // (h) Retreat speed: 20% fast, 20% slow, 60% default
  const retreatRoll = Math.random();
  if (retreatRoll < 0.20) { variant.retreatSpeed = 'fast'; parts.push('retreat=fast'); }
  else if (retreatRoll < 0.40) { variant.retreatSpeed = 'slow'; parts.push('retreat=slow'); }

  // (i) Gun side bias: 20% peek-heavy, 20% hold-heavy, 60% default
  const gunSideRoll = Math.random();
  if (gunSideRoll < 0.20) { variant.gunSideBias = 'peek'; parts.push('gs=peek'); }
  else if (gunSideRoll < 0.40) { variant.gunSideBias = 'hold'; parts.push('gs=hold'); }

  // (j) Reload punishment: 20% hard rush, 20% soft/safe, 60% default
  const reloadRoll = Math.random();
  if (reloadRoll < 0.20) { variant.reloadPunish = 'hard'; parts.push('rl=hard'); }
  else if (reloadRoll < 0.40) { variant.reloadPunish = 'soft'; parts.push('rl=soft'); }

  variant.label = parts.length > 0 ? parts.join(' ') : 'base';
  return variant;
}

function _cloneTrainingPolicy(src) {
  try {
    return JSON.parse(JSON.stringify(src || {}));
  } catch (e) {
    return null;
  }
}

function sparSelfPlay(count) {
  if (!count || count < 1) count = 10;
  console.log(`[SparTrain] Starting ${count} self-play matches (current bot vs frozen snapshot)`);
  // Use _remainingMatches counter instead of pre-allocating a huge array
  // to avoid memory waste for large counts (1M+)
  _sparTrainState = {
    active: true,
    mode: 'selfplay',
    botType: 'selfPlay',
    queue: [],
    _remainingMatches: count,
    totalMatches: count,
    completedMatches: 0,
    results: { selfPlay: { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 } },
    startTime: Date.now(),
    runtime: _createTrainingRuntime(),
    snapshotPolicy: _cloneTrainingPolicy(typeof sparLearning !== 'undefined' ? sparLearning : null),
  };
  _sparTrainStartNext();
}

// Full bot-vs-bot self-play: both teams run _tickOneBot with full AI.
// No scripted InputIntent — the player entity is parked offscreen.
// Difficulty escalates as both sides use the same improving learned policy.
function sparFullSelfPlay(count) {
  if (!count || count < 1) count = 10;
  console.log(`[SparTrain] Starting ${count} FULL bot-vs-bot self-play matches`);
  _sparTrainState = {
    active: true,
    mode: 'selfplay',
    fullBotVsBot: true,
    botType: 'selfPlay',
    queue: [],
    _remainingMatches: count,
    totalMatches: count,
    completedMatches: 0,
    results: { selfPlay: { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 } },
    startTime: Date.now(),
    runtime: _createTrainingRuntime(),
    snapshotPolicy: _cloneTrainingPolicy(typeof sparLearning !== 'undefined' ? sparLearning : null),
  };
  _sparTrainStartNext();
}

function _isSparFullBotVsBot() {
  return _sparTrainState && _sparTrainState.active && _sparTrainState.fullBotVsBot === true;
}

function _getSnapshotStyleScore(policy, name) {
  const player = policy && policy.player1v1 && policy.player1v1.styleResults ? policy.player1v1.styleResults[name] : null;
  const general = policy && policy.general1v1 && policy.general1v1.styleResults ? policy.general1v1.styleResults[name] : null;
  const selfPlay = policy && policy.selfPlay1v1 && policy.selfPlay1v1.styleResults ? policy.selfPlay1v1.styleResults[name] : null;
  const rf = policy && policy.reinforcement1v1 ? policy.reinforcement1v1 : null;
  const pBucket = rf && rf.player && rf.player.style ? rf.player.style[name] : null;
  const gBucket = rf && rf.general && rf.general.style ? rf.general.style[name] : null;
  const sBucket = rf && rf.selfPlay && rf.selfPlay.style ? rf.selfPlay.style[name] : null;
  const pScore = player && player.total > 0 ? player.wins / player.total : 0.5;
  const gScore = general && general.total > 0 ? general.wins / general.total : 0.5;
  const sScore = selfPlay && selfPlay.total > 0 ? selfPlay.wins / selfPlay.total : gScore;
  const pReward = pBucket && typeof pBucket.reward === 'number' ? pBucket.reward : 0.5;
  const gReward = gBucket && typeof gBucket.reward === 'number' ? gBucket.reward : 0.5;
  const sReward = sBucket && typeof sBucket.reward === 'number' ? sBucket.reward : 0.5;
  return pScore * 0.4 + gScore * 0.25 + sScore * 0.15 + pReward * 0.1 + gReward * 0.05 + sReward * 0.05;
}

function _pickSnapshotStyle(policy) {
  let best = 'pressure', bestScore = -Infinity;
  for (const name of Object.keys(SPAR_DUEL_STYLES)) {
    const score = _getSnapshotStyleScore(policy, name) + Math.random() * 0.03;
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return best;
}

function _pickWeightedSnapshotChoice(scores) {
  let minScore = Infinity;
  for (const value of Object.values(scores)) {
    if (value < minScore) minScore = value;
  }
  let total = 0;
  const weights = {};
  for (const [key, value] of Object.entries(scores)) {
    const weight = Math.max(0.05, value - minScore + 0.05);
    weights[key] = weight;
    total += weight;
  }
  let roll = Math.random() * total;
  for (const [key, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return key;
  }
  return Object.keys(scores)[0];
}

function _pickSnapshotRoute(policy) {
  const routes = typeof SPAR_OPENING_ROUTE_KEYS !== 'undefined'
    ? SPAR_OPENING_ROUTE_KEYS
    : ['bottomLeft', 'bottomRight', 'bottomCenter', 'topHold', 'midFlank', 'mirrorPlayer'];
  const rr = policy && policy.botOpenings ? policy.botOpenings.routeResults : null;
  const rf = policy && policy.reinforcement1v1 ? policy.reinforcement1v1 : null;
  const scores = {};
  for (const name of routes) {
    let score = name.indexOf('bottom') === 0 ? 0.54 : 0.5;
    const route = rr && rr[name] ? rr[name] : null;
    if (route && route.total > 0) {
      score += (route.wins / route.total) * 0.22;
      score += (route.gotBottom / route.total) * 0.12;
    } else {
      score += 0.14; // push untested routes into circulation
    }
    const gBucket = rf && rf.general && rf.general.opening ? rf.general.opening[name] : null;
    const sBucket = rf && rf.selfPlay && rf.selfPlay.opening ? rf.selfPlay.opening[name] : null;
    score += ((gBucket && gBucket.reward) || 0.5) * 0.05;
    score += ((sBucket && sBucket.reward) || 0.5) * 0.08;
    if (name === 'topHold') score += 0.04;
    if (name === 'midFlank') score += 0.05;
    if (name === 'mirrorPlayer') score += 0.05;
    if (policy && policy.opening) {
      if (policy.opening.route === 'bottomCenter' && name === 'midFlank') score += 0.08;
      if (policy.opening.route === 'bottomLeft' && name === 'bottomRight') score += 0.08;
      if (policy.opening.route === 'bottomRight' && name === 'bottomLeft') score += 0.08;
      if (policy.opening.rushBottom > 0.6 && name === 'mirrorPlayer') score += 0.05;
    }
    scores[name] = score + Math.random() * 0.03;
  }
  if (Math.random() < 0.22) {
    return routes[Math.floor(Math.random() * routes.length)];
  }
  return _pickWeightedSnapshotChoice(scores);
}

function _pickSnapshotAntiBottom(policy) {
  // Use family keys (contest/flank/bait) instead of legacy response keys
  const families = typeof SPAR_ANTI_BOTTOM_FAMILY_KEYS !== 'undefined'
    ? SPAR_ANTI_BOTTOM_FAMILY_KEYS
    : ['contest', 'flank', 'bait'];
  let best = 'flank', bestScore = -Infinity;
  const rf = policy && policy.reinforcement1v1 ? policy.reinforcement1v1 : null;
  const holdBottom = policy && policy.whenHasBottom ? policy.whenHasBottom.holdsPct : 0.5;
  const wallBottom = policy && policy.whenHasBottom ? policy.whenHasBottom.shotFreq : 0.5;
  const pushBottom = policy && policy.whenHasBottom ? policy.whenHasBottom.pushPct : 0.5;
  for (const name of families) {
    let score = name === 'flank' ? 0.55 : (name === 'contest' ? 0.5 : 0.48);
    if (name === 'flank') score += wallBottom * 0.2 + holdBottom * 0.12;
    if (name === 'contest') score += holdBottom * 0.18 - pushBottom * 0.08;
    if (name === 'bait') score += pushBottom * 0.22;
    const gBucket = rf && rf.general && rf.general.antiBottomFamily ? rf.general.antiBottomFamily[name] : null;
    const sBucket = rf && rf.selfPlay && rf.selfPlay.antiBottomFamily ? rf.selfPlay.antiBottomFamily[name] : null;
    score += ((gBucket && gBucket.reward) || 0.5) * 0.05;
    score += ((sBucket && sBucket.reward) || 0.5) * 0.08;
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return best;
}

function _getSparSelfPlayIntent(p, tgt, dist, dx, dy, speed, rt, policy) {
  if (!policy) return null;
  if (!rt.selfPlayStyle) rt.selfPlayStyle = _pickSnapshotStyle(policy);
  if (!rt.selfPlayRoute) rt.selfPlayRoute = _pickSnapshotRoute(policy);
  if (!rt.selfPlayAntiBottom) rt.selfPlayAntiBottom = _pickSnapshotAntiBottom(policy);

  const style = SPAR_DUEL_STYLES[rt.selfPlayStyle] || SPAR_DUEL_STYLES.pressure;
  const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
  const arenaW = arenaLevel.widthTiles * TILE;
  const arenaH = arenaLevel.heightTiles * TILE;
  const midX = arenaW / 2;
  const enemyReloading = !!(SparState.teamB[0] && SparState.teamB[0].member && SparState.teamB[0].member.gun && SparState.teamB[0].member.gun.reloading);
  const isOpening = SparState.matchTimer < 180;
  const hasBottom = p.y > tgt.y + 30;
  const enemyHasBottom = tgt.y > p.y + 30;
  const alignX = Math.abs(dx), alignY = Math.abs(dy);
  const incomingDodge = (typeof SparSystem !== 'undefined' && typeof SparSystem._getIncomingBulletDodge === 'function')
    ? SparSystem._getIncomingBulletDodge(p, 'teamA')
    : { x: 0, y: 0 };
  let mx = 0, my = 0;

  if (isOpening) {
    const route = rt.selfPlayRoute;
    if (route === 'bottomCenter') {
      const goalY = arenaH * 0.89;
      if (p.y < goalY - 10) my = speed;
      mx = rt.strafeDir * speed * 0.15;
    } else if (route === 'bottomLeft') {
      const goalY = arenaH * 0.89, goalX = arenaW * 0.23;
      if (p.y < goalY - 10) my = speed * 0.95;
      mx = Math.sign(goalX - p.x) * speed * 0.42;
    } else if (route === 'bottomRight') {
      const goalY = arenaH * 0.89, goalX = arenaW * 0.77;
      if (p.y < goalY - 10) my = speed * 0.95;
      mx = Math.sign(goalX - p.x) * speed * 0.42;
    } else if (route === 'topHold') {
      const goalY = arenaH * 0.3;
      my = Math.sign(goalY - p.y) * speed * 0.5;
      mx = rt.strafeDir * speed * 0.8;
    } else if (route === 'midFlank') {
      const goalY = arenaH * 0.86;
      const flankSide = tgt.x < midX ? arenaW * 0.7 : arenaW * 0.3;
      if (p.y < goalY - 10) my = speed * 0.85;
      mx = Math.sign(flankSide - p.x) * speed * 0.45;
    } else {
      mx = (tgt.vx || 0) * 0.85;
      my = (tgt.vy || 0) * 0.85;
      if (p.y < arenaH * 0.86) my = Math.max(my, speed * 0.78);
    }
  } else if (enemyReloading && dist > 1) {
    // Reload punish variant: hard rushes in, soft stays at range
    const rlAggr = rt.selfPlayReloadPunish === 'hard' ? 1.1 : (rt.selfPlayReloadPunish === 'soft' ? 0.4 : 0.7);
    mx = (dx / dist) * speed * rlAggr * style.approachMult;
    my = (dy / dist) * speed * rlAggr * style.approachMult;
    mx += rt.strafeDir * speed * (rt.selfPlayReloadPunish === 'soft' ? 0.45 : 0.2);
  } else if (hasBottom) {
    // Gun side bias: peek = wider lateral movement, hold = stay planted
    const gsMult = rt.selfPlayGunSideBias === 'peek' ? 1.2 : (rt.selfPlayGunSideBias === 'hold' ? 0.6 : 1.0);
    mx = rt.strafeDir * speed * (0.62 + 0.2 * style.strafeMult) * gsMult;
    if (Math.abs(dy) > 40) my *= 0.25;
    if (dist > style.preferredDist + 40 && dist > 1) {
      mx += (dx / dist) * speed * 0.28;
      my += (dy / dist) * speed * 0.22;
    }
    if (alignX < 70) mx += rt.strafeDir * speed * 0.3;
  } else if (enemyHasBottom) {
    const abFamily = rt.selfPlayAntiBottom;  // now a family key: contest/flank/bait
    const aboveTrapLine = p.y < tgt.y - 35;
    if (abFamily === 'flank') {
      const flankDir = alignX < 110 ? rt.strafeDir : Math.sign(dx || rt.strafeDir);
      mx = flankDir * speed * 0.9;
      my = speed * (alignX < 110 ? 0.18 : 0.5);
      if (aboveTrapLine && alignX < 90) my = Math.min(my, 0.12 * speed);
    } else if (abFamily === 'bait') {
      if (dist < 240) {
        my = -speed * 0.35;
        mx = rt.strafeDir * speed * 0.8;
      } else {
        mx = Math.sign(dx || rt.strafeDir) * speed * 0.55;
        my = speed * 0.35;
      }
    } else {
      // contest (default): direct approach
      mx = rt.strafeDir * speed * 0.7;
      my = speed * 0.55;
    }
    if (alignX < 80) {
      mx += rt.strafeDir * speed * 0.22;
      if (aboveTrapLine) my = Math.min(my, speed * 0.15);
    }
  } else {
    // Retreat speed variant: fast disengages quicker, slow holds ground longer
    const retreatMult = rt.selfPlayRetreatSpeed === 'fast' ? 1.4 : (rt.selfPlayRetreatSpeed === 'slow' ? 0.5 : 1.0);
    mx = rt.strafeDir * speed * (0.68 + 0.18 * style.strafeMult);
    if (dist > style.preferredDist + 40 && dist > 1) {
      mx += (dx / dist) * speed * 0.34;
      my += (dy / dist) * speed * 0.34;
    } else if (dist < style.preferredDist - 40 && dist > 1) {
      mx -= (dx / dist) * speed * 0.24 * retreatMult;
      my -= (dy / dist) * speed * 0.24 * retreatMult;
    } else if (p.y < tgt.y) {
      my = speed * 0.42;
    } else {
      my = speed * 0.1;
    }
  }

  const dodgeMag = Math.sqrt(incomingDodge.x * incomingDodge.x + incomingDodge.y * incomingDodge.y);
  if (dodgeMag > 0.35) {
    mx += incomingDodge.x * speed * 0.5;
    my += incomingDodge.y * speed * 0.42;
  }
  if (Math.random() < 0.015) {
    rt.strafeDir *= -1;
  }

  let shouldShoot = false;
  if (enemyReloading) shouldShoot = true;
  else if (rt.selfPlayStyle === 'pressure') shouldShoot = Math.min(alignX, alignY) < 80 || dist < 180;
  else if (rt.selfPlayStyle === 'control') shouldShoot = Math.min(alignX, alignY) < 45 && dist > 110 && dist < 320;
  else shouldShoot = Math.min(alignX, alignY) < 60 || hasBottom || dist < 170;

  // Shot timing variant: aggressive widens thresholds, patient tightens them
  if (rt.selfPlayShootAggr === 'aggressive' && !shouldShoot) {
    shouldShoot = Math.min(alignX, alignY) < 100 || dist < 200;
  } else if (rt.selfPlayShootAggr === 'patient' && shouldShoot && !enemyReloading) {
    shouldShoot = Math.min(alignX, alignY) < 35 && dist < 280;
  }

  // (d) Reaction delay: suppress shooting for N frames after it first becomes valid
  if (shouldShoot && rt.selfPlayReactionDelay > 0) {
    rt._reactionFramesLeft = (rt._reactionFramesLeft || 0);
    if (rt._reactionFramesLeft <= 0) {
      // Start a new reaction delay window
      rt._reactionFramesLeft = rt.selfPlayReactionDelay;
    }
    if (rt._reactionFramesLeft > 0) {
      rt._reactionFramesLeft--;
      if (rt._reactionFramesLeft > 0) shouldShoot = false;
    }
  } else {
    // Reset reaction counter when not trying to shoot
    rt._reactionFramesLeft = 0;
  }

  // (e) Side preference: bias strafe direction back toward preferred side
  if (rt.selfPlaySidePref && !isOpening && Math.random() < 0.03) {
    const arenaMidX = arenaW / 2;
    if (rt.selfPlaySidePref === 'left' && p.x > arenaMidX) rt.strafeDir = -1;
    else if (rt.selfPlaySidePref === 'right' && p.x < arenaMidX) rt.strafeDir = 1;
  }

  return { mx, my, shouldShoot, dx, dy };
}

function _sparTrainJoinWhenReady(retries) {
  const maxRetries = 200; // ~1 second at 5ms poll
  const attempt = retries || 0;
  setTimeout(() => {
    if (!_sparTrainState) return;
    if (typeof SparState === 'undefined' || typeof SparSystem === 'undefined') {
      if (attempt >= maxRetries) {
        console.warn('[SparTrain] Join failed: SparState/SparSystem unavailable after ' + maxRetries + ' retries, skipping match');
        _sparTrainState.completedMatches++;
        _sparTrainStartNext();
        return;
      }
      _sparTrainJoinWhenReady(attempt + 1);
      return;
    }
    if (SparState.phase === 'hub') {
      // (c) Apply CT-X stat allocation variant before joining
      if (_sparTrainState.mode === 'selfplay' && _sparTrainState._selfPlayCtxAlloc) {
        const alloc = _sparTrainState._selfPlayCtxAlloc;
        if (typeof _ctxFreeze !== 'undefined') _ctxFreeze = alloc.freeze;
        if (typeof _ctxRof !== 'undefined') _ctxRof = alloc.rof;
        if (typeof _ctxSpread !== 'undefined') _ctxSpread = alloc.spread;
      }
      SparSystem.joinRoom('spar_1v1');
    } else {
      if (attempt >= maxRetries) {
        console.warn('[SparTrain] Join failed: not in hub after ' + maxRetries + ' retries, skipping match');
        _sparTrainState.completedMatches++;
        _sparTrainStartNext();
        return;
      }
      _sparTrainJoinWhenReady(attempt + 1);
    }
  }, SPAR_TRAINING_TIMING.joinPollMs);
}

function _sparTrainStartNext() {
  const remaining = _sparTrainState ? (_sparTrainState._remainingMatches || _sparTrainState.queue.length) : 0;
  if (!_sparTrainState || remaining <= 0) {
    _sparTrainPrintSummary();
    _sparTrainState = null;
    return;
  }

  // Decrement counter for selfplay, shift queue for archetype mode
  let nextType;
  if (_sparTrainState._remainingMatches > 0) {
    _sparTrainState._remainingMatches--;
    nextType = 'selfPlay';
  } else {
    nextType = _sparTrainState.queue.shift();
  }
  _sparTrainState.botType = nextType;
  _sparTrainState._currentMatchType = nextType;
  // Reset runtime for each new match
  _sparTrainState.runtime = _createTrainingRuntime();

  // Apply self-play variant rotation per-match
  if (_sparTrainState.mode === 'selfplay') {
    const variant = _randomizeSelfPlayVariant(_sparTrainState.snapshotPolicy);
    const rt = _sparTrainState.runtime;
    // (a) Override opening route
    if (variant.route) rt.selfPlayRoute = variant.route;
    // (b) Override duel style
    if (variant.style) rt.selfPlayStyle = variant.style;
    // (d) Reaction delay on shooting
    rt.selfPlayReactionDelay = variant.reactionDelay || 0;
    // (e) Side preference (applied as initial strafe direction)
    if (variant.sidePref === 'left') { rt.strafeDir = -1; rt.selfPlaySidePref = 'left'; }
    else if (variant.sidePref === 'right') { rt.strafeDir = 1; rt.selfPlaySidePref = 'right'; }
    // (f) Anti-bottom family override (using family key, not legacy response)
    if (variant.antiBottomFamily) rt.selfPlayAntiBottom = variant.antiBottomFamily;
    // (g-j) Policy-dimension behavioral overrides
    if (variant.shootAggr) rt.selfPlayShootAggr = variant.shootAggr;
    if (variant.retreatSpeed) rt.selfPlayRetreatSpeed = variant.retreatSpeed;
    if (variant.gunSideBias) rt.selfPlayGunSideBias = variant.gunSideBias;
    if (variant.reloadPunish) rt.selfPlayReloadPunish = variant.reloadPunish;
    // Store label for logging
    rt.selfPlayVariantLabel = variant.label;
    // (c) Store CT-X allocation for bot creation override
    _sparTrainState._selfPlayCtxAlloc = variant.ctxAlloc;
  }

  const nextMatchNum = _sparTrainState.completedMatches + 1;
  const logEvery = SPAR_TRAINING_TIMING.logEveryMatches || 1;
  if (nextMatchNum === 1 || nextMatchNum === _sparTrainState.totalMatches || nextMatchNum % logEvery === 0) {
    const variantInfo = _sparTrainState.mode === 'selfplay' && _sparTrainState.runtime.selfPlayVariantLabel
      ? ` [${_sparTrainState.runtime.selfPlayVariantLabel}]`
      : '';
    console.log(`[SparTrain] Match ${nextMatchNum}/${_sparTrainState.totalMatches}: vs ${nextType}${variantInfo}`);
  }

  if (typeof SparSystem === 'undefined') {
    console.warn('[SparTrain] SparSystem unavailable, skipping match');
    _sparTrainState.completedMatches++;
    setTimeout(() => _sparTrainStartNext(), SPAR_TRAINING_TIMING.nextMatchDelayMs);
    return;
  }

  if (SparState.phase !== 'hub') {
    if (SparState.phase !== 'idle') {
      SparSystem.exitToHub();
    } else if (typeof enterLevel !== 'undefined') {
      enterLevel('spar_hub_01', 15, 18);
      SparSystem.enterHub();
    }
  }

  _sparTrainJoinWhenReady();
}

// ---- Called by authorityTick — returns one frame of scripted intent ----
function _getSparTrainingArchetype() {
  if (!_sparTrainState || !_sparTrainState._currentMatchType) return null;
  // Full bot-vs-bot: player entity is parked offscreen, no scripted input needed
  if (_sparTrainState.fullBotVsBot) return null;
  const isSelfPlay = _sparTrainState.mode === 'selfplay';
  const archetype = isSelfPlay ? null : SPAR_TRAINING_ARCHETYPES[_sparTrainState._currentMatchType];
  if (!isSelfPlay && !archetype) return null;

  // Validate player alive + enemy alive
  if (!player || player.hp <= 0) return null;
  const enemyMember = SparState.teamB.find(p => p.alive);
  if (!enemyMember) return null;

  const te = enemyMember.entity;
  const dx = te.x - player.x, dy = te.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const rt = _sparTrainState.runtime;

  // Tick strafe timer
  rt.strafeTimer = (rt.strafeTimer || 0) - 1;
  if (rt.strafeTimer <= 0) {
    rt.strafeDir = Math.random() < 0.5 ? -1 : 1;
    rt.strafeTimer = 30 + Math.floor(Math.random() * 60);
  }

  const speed = GAME_CONFIG.PLAYER_BASE_SPEED;
  const intent = isSelfPlay
    ? _getSparSelfPlayIntent(player, te, dist, dx, dy, speed, rt, _sparTrainState.snapshotPolicy)
    : archetype.getIntent(player, te, dist, dx, dy, speed, rt);
  if (!intent) return null;

  // Movement quantization: convert continuous velocity to binary key presses.
  // inventory.js normalizes diagonal (dx,dy) to unit length (0.707/0.707),
  // so we solve for per-frame probabilities that reproduce the archetype's
  // intended average velocity on each axis.
  //
  // When total <= 1: single-axis frames only (no normalization penalty).
  // When total > 1: some diagonal frames are required. We solve for the
  // minimum diagonal probability (pDiag) that keeps idle probability >= 0,
  // accounting for diagonal normalization (each axis gets √2/2 * speed).
  const ratioX = Math.min(1, Math.abs(intent.mx) / speed);
  const ratioY = Math.min(1, Math.abs(intent.my) / speed);
  const total = ratioX + ratioY;
  let moveX = 0, moveY = 0;
  if (total <= 0.01) {
    // No movement
  } else if (total <= 1) {
    // Single-axis only — no diagonal normalization issue
    if (Math.random() < total) {
      if (Math.random() < ratioX / total) {
        moveX = intent.mx > 0 ? 1 : -1;
      } else {
        moveY = intent.my > 0 ? 1 : -1;
      }
    }
  } else {
    // total > 1: need diagonal frames to reach target velocity.
    // Solve: pX + pDiag*DIAG = ratioX, pY + pDiag*DIAG = ratioY
    // where DIAG = √2/2 ≈ 0.7071 (per-axis speed on diagonal frames).
    // Minimum pDiag for pIdle >= 0: (total - 1) / (√2 - 1)
    const DIAG = Math.SQRT1_2;
    const minR = Math.min(ratioX, ratioY);
    let pDiag = (total - 1) / (Math.SQRT2 - 1);
    // Cap: pDiag can't exceed minR/DIAG or pX/pY goes negative
    const maxDiag = minR / DIAG;
    if (pDiag > maxDiag) pDiag = maxDiag; // fallback for total > ~1.41
    const pX = ratioX - DIAG * pDiag;
    const pY = ratioY - DIAG * pDiag;
    // Roll once to select frame type
    const roll = Math.random();
    if (roll < pX) {
      moveX = intent.mx > 0 ? 1 : -1;
    } else if (roll < pX + pY) {
      moveY = intent.my > 0 ? 1 : -1;
    } else if (roll < pX + pY + pDiag) {
      moveX = intent.mx > 0 ? 1 : -1;
      moveY = intent.my > 0 ? 1 : -1;
    }
    // else: idle frame
  }

  // Compute aim direction toward enemy
  let aimDir = 0;
  if (Math.abs(intent.dx) > Math.abs(intent.dy)) {
    aimDir = intent.dx > 0 ? 3 : 2;
  } else {
    aimDir = intent.dy > 0 ? 0 : 1;
  }

  return { moveX, moveY, shouldShoot: !!intent.shouldShoot, aimDir };
}

// ---- Match end callback ----
function _sparTrainOnMatchEnd(won) {
  if (!_sparTrainState) return;

  const type = _sparTrainState._currentMatchType || _sparTrainState.botType;
  if (!_sparTrainState.results[type]) {
    _sparTrainState.results[type] = { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 };
  }

  const r = _sparTrainState.results[type];
  if (won) r.losses++; else r.wins++; // won = player won, bot lost

  const enemyBot = SparState.teamB[0] && SparState.teamB[0].member;
  if (enemyBot) {
    r.dmgDealt += enemyBot.ai._matchDmgDealt || 0;
    r.dmgTaken += enemyBot.ai._matchDmgTaken || 0;
  }

  _sparTrainState.completedMatches++;

  // Update general1v1 under the bot's REAL duel style
  const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
  if (sl && enemyBot && enemyBot.ai._duelStyle) {
    const style = enemyBot.ai._duelStyle;
    const destKey = _sparTrainState.mode === 'selfplay' ? 'selfPlay1v1' : 'general1v1';
    if (!sl[destKey]) sl[destKey] = { styleResults: {} };
    if (!sl[destKey].styleResults) sl[destKey].styleResults = {};
    if (!sl[destKey].styleResults[style]) {
      sl[destKey].styleResults[style] = { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 };
    }
    const sr = sl[destKey].styleResults[style];
    sr.total++;
    if (won) sr.losses++; else sr.wins++;
    const dmgDelta = (enemyBot.ai._matchDmgDealt || 0) - (enemyBot.ai._matchDmgTaken || 0);
    sr.avgDmgDelta = sr.total > 1 ? (0.5 * sr.avgDmgDelta + 0.5 * dmgDelta) : dmgDelta;
  }

  // Refresh snapshot every N matches so opponent difficulty scales with bot improvement
  const refreshEvery = SPAR_TRAINING_TIMING.snapshotRefreshEvery || 500;
  if (_sparTrainState.mode === 'selfplay' && _sparTrainState.completedMatches % refreshEvery === 0) {
    _sparTrainState.snapshotPolicy = _cloneTrainingPolicy(typeof sparLearning !== 'undefined' ? sparLearning : null);
    console.log(`[SparTrain] Snapshot refreshed at match ${_sparTrainState.completedMatches} — opponent now uses latest learned policy`);
  }

  const saveEvery = SPAR_TRAINING_TIMING.saveEveryMatches || 1;
  const shouldSave = _sparTrainState.completedMatches % saveEvery === 0 || _sparTrainState.queue.length === 0;
  if (shouldSave && typeof SaveLoad !== 'undefined') SaveLoad.save();

  const logEvery = SPAR_TRAINING_TIMING.logEveryMatches || 1;
  const shouldLog = _sparTrainState.completedMatches === 1
    || _sparTrainState.completedMatches === _sparTrainState.totalMatches
    || _sparTrainState.completedMatches % logEvery === 0;
  if (shouldLog) {
    console.log(`[SparTrain] Match ${_sparTrainState.completedMatches}/${_sparTrainState.totalMatches}: Bot ${won ? 'LOST' : 'WON'} (${type})`);
  }

  const moreMatches = (_sparTrainState._remainingMatches > 0) || (_sparTrainState.queue.length > 0);
  if (moreMatches) {
    setTimeout(() => _sparTrainStartNext(), SPAR_TRAINING_TIMING.nextMatchDelayMs);
  } else {
    _sparTrainPrintSummary();
    _sparTrainState = null;
    _clearTrainingInput();
  }
}

function _sparTrainPrintSummary() {
  if (!_sparTrainState) return;
  const elapsed = ((Date.now() - _sparTrainState.startTime) / 1000).toFixed(1);
  console.log('\n===== SPAR TRAINING SUMMARY =====');
  console.log(`Total matches: ${_sparTrainState.completedMatches} in ${elapsed}s`);

  for (const [type, r] of Object.entries(_sparTrainState.results)) {
    const total = r.wins + r.losses;
    if (total === 0) continue;
    const winRate = ((r.wins / total) * 100).toFixed(1);
    const avgDmg = total > 0 ? (r.dmgDealt / total).toFixed(0) : 0;
    const avgTaken = total > 0 ? (r.dmgTaken / total).toFixed(0) : 0;
    console.log(`  ${type}: ${r.wins}W/${r.losses}L (${winRate}% bot win rate) | avgDmg: ${avgDmg} dealt, ${avgTaken} taken`);
  }

  const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
  const styleBucket = _sparTrainState.mode === 'selfplay' ? 'selfPlay1v1' : 'general1v1';
  if (sl && sl[styleBucket] && sl[styleBucket].styleResults) {
    console.log(`\nStyle effectiveness (${styleBucket}):`);
    for (const [style, sr] of Object.entries(sl[styleBucket].styleResults)) {
      if (sr.total > 0) {
        console.log(`  ${style}: ${sr.wins}W/${sr.losses}L (${((sr.wins / sr.total) * 100).toFixed(1)}%) avgDmgDelta: ${sr.avgDmgDelta.toFixed(0)}`);
      }
    }
  }

  console.log('=================================\n');

  // Final persistence (also covers manual stop)
  if (typeof SaveLoad !== 'undefined') {
    SaveLoad.save();
    console.log('[SparTrain] Results saved to localStorage');
  }
}

function sparTrainStop() {
  if (_sparTrainState) {
    console.log('[SparTrain] Stopping training...');
    _sparTrainPrintSummary();
    _sparTrainState = null;
    _clearTrainingInput();
  }
}

function _isSparTraining() {
  return _sparTrainState && _sparTrainState.active;
}

function _isSparSelfPlay() {
  return _sparTrainState && _sparTrainState.active && _sparTrainState.mode === 'selfplay';
}

function _getSparTrainingTiming() {
  return _isSparTraining() ? SPAR_TRAINING_TIMING : null;
}

function _getSparTrainingLoopConfig() {
  return _isSparTraining() ? SPAR_TRAINING_TIMING : null;
}

// Clear held InputIntent fields that training wrote. Training override
// happens in authorityTick AFTER CommandQueue is consumed, so the queue
// never contains training-produced entries — only legitimate user commands.
// We only need to zero the InputIntent flags to prevent stale shoot/move
// from leaking into the next frame's translateIntentsToCommands.
function _clearTrainingInput() {
  if (typeof InputIntent !== 'undefined') {
    InputIntent.shootHeld = false;
    InputIntent.arrowShooting = false;
    InputIntent.moveX = 0;
    InputIntent.moveY = 0;
  }
}
