// ===================== SPAR TRAINING HARNESS =====================
// Console-driven training for spar bot style generalization.
// Usage: sparTrain('rusher', 20) or sparTrain('all', 50)
//
// Architecture: training archetypes are "scripted player input generators."
// They output { moveX, moveY, shouldShoot, aimDir } each frame.
// authorityTick.js applies these to InputIntent before update(), so the
// player uses the full real movement/gun pipeline (freeze, knockback, etc.).
// The enemy bot (teamB) keeps its real duel style AI — results feed
// general1v1.styleResults.{pressure,control,bait} for the style selector.

const SPAR_TRAINING_TIMING = {
  countdownFrames: 20,
  postMatchFrames: 12,
  joinPollMs: 50,
  nextMatchDelayMs: 100,
  speedMultiplier: 6,
  maxUpdatesPerFrame: 24,
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
  return { strafeDir: 1, strafeTimer: 0, cornerTarget: null };
}

function _sparTrainJoinWhenReady() {
  setTimeout(() => {
    if (!_sparTrainState) return;
    if (typeof SparState === 'undefined' || typeof SparSystem === 'undefined') return;
    if (SparState.phase === 'hub') {
      SparSystem.joinRoom('spar_1v1');
    } else {
      _sparTrainJoinWhenReady();
    }
  }, SPAR_TRAINING_TIMING.joinPollMs);
}

function _sparTrainStartNext() {
  if (!_sparTrainState || _sparTrainState.queue.length === 0) {
    _sparTrainPrintSummary();
    _sparTrainState = null;
    return;
  }

  const nextType = _sparTrainState.queue.shift();
  _sparTrainState.botType = nextType;
  _sparTrainState._currentMatchType = nextType;
  // Reset runtime for each new match
  _sparTrainState.runtime = _createTrainingRuntime();

  console.log(`[SparTrain] Match ${_sparTrainState.completedMatches + 1}/${_sparTrainState.totalMatches}: vs ${nextType}`);

  if (typeof SparSystem === 'undefined') return;

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
  const archetype = SPAR_TRAINING_ARCHETYPES[_sparTrainState._currentMatchType];
  if (!archetype) return null;

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
  const intent = archetype.getIntent(player, te, dist, dx, dy, speed, rt);

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
    if (!sl.general1v1) sl.general1v1 = { styleResults: {} };
    if (!sl.general1v1.styleResults) sl.general1v1.styleResults = {};
    if (!sl.general1v1.styleResults[style]) {
      sl.general1v1.styleResults[style] = { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 };
    }
    const sr = sl.general1v1.styleResults[style];
    sr.total++;
    if (won) sr.losses++; else sr.wins++;
    const dmgDelta = (enemyBot.ai._matchDmgDealt || 0) - (enemyBot.ai._matchDmgTaken || 0);
    sr.avgDmgDelta = sr.total > 1 ? (0.5 * sr.avgDmgDelta + 0.5 * dmgDelta) : dmgDelta;
  }

  // Persist after every completed match (normal autosave is skipped during training)
  if (typeof SaveLoad !== 'undefined') SaveLoad.save();

  console.log(`[SparTrain] Match ${_sparTrainState.completedMatches}/${_sparTrainState.totalMatches}: Bot ${won ? 'LOST' : 'WON'} (${type})`);

  if (_sparTrainState.queue.length > 0) {
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
  if (sl && sl.general1v1 && sl.general1v1.styleResults) {
    console.log('\nStyle effectiveness (general1v1):');
    for (const [style, sr] of Object.entries(sl.general1v1.styleResults)) {
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
