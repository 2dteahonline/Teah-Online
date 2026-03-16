// ===================== SPAR TRAINING HARNESS =====================
// Manual console-driven training for spar bot generalization
// Usage: sparTrain('rusher', 20) or sparTrain('all', 50)
// Only updates general1v1 learning, never jeffProfile

const SPAR_TRAINING_BOTS = {
  rusher: {
    label: 'Rusher',
    desc: 'Always pushes toward player, shoots on cooldown, bad at dodging',
    tick(member, tgt, dist, dx, dy, speed, ai) {
      // Always push toward target
      if (dist > 1) {
        member._trainMoveX = (dx / dist) * speed * 0.7;
        member._trainMoveY = (dy / dist) * speed * 0.7;
      }
      // Minimal strafe
      member._trainMoveX += ai.strafeDir * speed * 0.2;
      // Always shoot when possible
      return true; // signal: shoot immediately
    },
  },
  waller: {
    label: 'Waller',
    desc: 'Holds bottom, strafes, walls bullets up',
    tick(member, tgt, dist, dx, dy, speed, ai) {
      const bot = member.entity;
      const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaH = arenaLevel.heightTiles * TILE;
      // Rush to bottom first
      if (bot.y < arenaH * 0.75) {
        member._trainMoveX = ai.strafeDir * speed * 0.3;
        member._trainMoveY = speed * 0.8;
      } else {
        // Hold bottom, strafe wide
        member._trainMoveX = ai.strafeDir * speed * 0.85;
        member._trainMoveY = 0;
        // Stay near bottom
        if (bot.y < arenaH * 0.7) member._trainMoveY = speed * 0.3;
      }
      return true;
    },
  },
  strafer: {
    label: 'Strafer',
    desc: 'Wide strafes, mid-range, picks shots, good at dodging',
    tick(member, tgt, dist, dx, dy, speed, ai) {
      // Wide strafes
      member._trainMoveX = ai.strafeDir * speed * 0.9;
      // Maintain mid range (200-350)
      if (dist > 350 && dist > 1) {
        member._trainMoveX += (dx / dist) * speed * 0.3;
        member._trainMoveY = (dy / dist) * speed * 0.3;
      } else if (dist < 200 && dist > 1) {
        member._trainMoveX -= (dx / dist) * speed * 0.3;
        member._trainMoveY = -(dy / dist) * speed * 0.3;
      }
      // Only shoot when well-aligned (picky)
      const alignX = Math.abs(tgt.x - member.entity.x);
      const alignY = Math.abs(tgt.y - member.entity.y);
      return Math.min(alignX, alignY) < 50;
    },
  },
  retreater: {
    label: 'Retreater',
    desc: 'Backpedals, shoots while running',
    tick(member, tgt, dist, dx, dy, speed, ai) {
      // Always back away
      if (dist > 1) {
        member._trainMoveX = -(dx / dist) * speed * 0.5;
        member._trainMoveY = -(dy / dist) * speed * 0.5;
      }
      // Strafe while retreating
      member._trainMoveX += ai.strafeDir * speed * 0.5;
      // Shoot while running
      return true;
    },
  },
  corner: {
    label: 'Corner',
    desc: 'Plays near walls, peek-shoots',
    tick(member, tgt, dist, dx, dy, speed, ai) {
      const bot = member.entity;
      const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaW = arenaLevel.widthTiles * TILE;
      const arenaH = arenaLevel.heightTiles * TILE;
      // Pick a corner and hold it
      if (!ai._cornerTarget) {
        const corners = [
          { x: TILE * 3, y: arenaH - TILE * 3 },
          { x: arenaW - TILE * 3, y: arenaH - TILE * 3 },
          { x: TILE * 3, y: TILE * 3 },
          { x: arenaW - TILE * 3, y: TILE * 3 },
        ];
        // Prefer bottom corners
        const bottomCorners = corners.slice(0, 2);
        ai._cornerTarget = bottomCorners[Math.floor(Math.random() * 2)];
      }
      const cx = ai._cornerTarget.x, cy = ai._cornerTarget.y;
      const cdx = cx - bot.x, cdy = cy - bot.y;
      const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
      if (cDist > 60) {
        // Move to corner
        member._trainMoveX = (cdx / cDist) * speed * 0.6;
        member._trainMoveY = (cdy / cDist) * speed * 0.6;
      } else {
        // At corner — peek shoot by strafing in/out
        member._trainMoveX = ai.strafeDir * speed * 0.5;
        member._trainMoveY = 0;
      }
      return true;
    },
  },
};

// Training state
let _sparTrainState = null;

function sparTrain(botType, count) {
  if (!count || count < 1) count = 10;

  if (botType === 'all') {
    const types = Object.keys(SPAR_TRAINING_BOTS);
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
    };
    for (const t of types) {
      _sparTrainState.results[t] = { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 };
      for (let i = 0; i < perType; i++) {
        _sparTrainState.queue.push(t);
      }
    }
    _sparTrainState.queue = _sparTrainState.queue.slice(0, count);
    _sparTrainStartNext();
    return;
  }

  if (!SPAR_TRAINING_BOTS[botType]) {
    console.log(`[SparTrain] Unknown bot type: ${botType}. Available: ${Object.keys(SPAR_TRAINING_BOTS).join(', ')}`);
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
  };
  _sparTrainStartNext();
}

function _sparTrainStartNext() {
  if (!_sparTrainState || _sparTrainState.queue.length === 0) {
    _sparTrainPrintSummary();
    _sparTrainState = null;
    return;
  }

  const nextType = _sparTrainState.queue.shift();
  _sparTrainState.botType = nextType;

  // Auto-enter 1v1 spar
  console.log(`[SparTrain] Match ${_sparTrainState.completedMatches + 1}/${_sparTrainState.totalMatches}: vs ${nextType}`);

  // Ensure we're in spar hub or can join
  if (SparState.phase !== 'hub') {
    // Need to navigate to spar hub first
    if (typeof SparSystem !== 'undefined') {
      // Enter spar scene
      if (typeof enterLevel !== 'undefined') {
        enterLevel('spar_hub_01', 15, 18);
        SparSystem.enterHub();
      }
    }
  }

  // Small delay to let scene settle, then join 1v1
  setTimeout(() => {
    if (_sparTrainState) {
      // Mark this as a training match
      _sparTrainState._currentMatchType = nextType;
      SparSystem.joinRoom('spar_1v1');
    }
  }, 100);
}

function _sparTrainOnMatchEnd(won) {
  if (!_sparTrainState) return;

  const type = _sparTrainState._currentMatchType || _sparTrainState.botType;
  if (!_sparTrainState.results[type]) {
    _sparTrainState.results[type] = { wins: 0, losses: 0, dmgDealt: 0, dmgTaken: 0 };
  }

  const r = _sparTrainState.results[type];
  if (won) r.losses++; else r.wins++; // won = player won, bot lost

  // Track damage
  const enemyBot = SparState.teamB[0] && SparState.teamB[0].member;
  if (enemyBot) {
    r.dmgDealt += enemyBot.ai._matchDmgDealt || 0;
    r.dmgTaken += enemyBot.ai._matchDmgTaken || 0;
  }

  _sparTrainState.completedMatches++;

  // Update ONLY general1v1 (not jeffProfile)
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

  console.log(`[SparTrain] Match ${_sparTrainState.completedMatches}/${_sparTrainState.totalMatches}: Bot ${won ? 'LOST' : 'WON'} (${type})`);

  // Start next match after short delay
  if (_sparTrainState.queue.length > 0) {
    setTimeout(() => _sparTrainStartNext(), 500);
  } else {
    _sparTrainPrintSummary();
    _sparTrainState = null;
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

  // Print overall style results from general1v1
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
}

// Stop training
function sparTrainStop() {
  if (_sparTrainState) {
    console.log('[SparTrain] Stopping training...');
    _sparTrainPrintSummary();
    _sparTrainState = null;
  }
}

// Check if training is active
function _isSparTraining() {
  return _sparTrainState && _sparTrainState.active;
}

// Get current training bot behavior override
function _getSparTrainingBotOverride() {
  if (!_sparTrainState || !_sparTrainState._currentMatchType) return null;
  return SPAR_TRAINING_BOTS[_sparTrainState._currentMatchType] || null;
}
