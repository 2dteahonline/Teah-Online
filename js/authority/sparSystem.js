// ===================== SPAR SYSTEM =====================
// Authority: spar arena combat, bot AI, match flow
// Phase B — loaded after casinoSystem.js
// Depends on: SPAR_CONFIG, SPAR_ROOMS, SPAR_CTX_STATS, sparProgress (sparData.js)
//             CT_X_GUN (interactable.js)
//             player, bullets, hitEffects (gameState.js)
//             enterLevel, Scene, LEVELS (sceneManager.js)
//             positionClear (mobSystem.js)
//             TILE (levelData.js)
//             GAME_CONFIG (gameConfig.js)

// ---- SPAR STATE ----
const SparState = {
  phase: 'idle',           // 'idle' | 'hub' | 'countdown' | 'fighting' | 'post_match'
  activeRoom: null,        // SPAR_ROOMS entry
  teamA: [],               // [{ id, entity, isLocal, isBot, alive, member }]
  teamB: [],               // same
  countdown: 0,
  matchTimer: 0,
  lastResult: null,        // 'teamA' | 'teamB'
  postMatchTimer: 0,
  streakCount: 0,
  _sparBots: [],           // all spar bot member objects (both teams)
  _savedSnapshot: null,    // loadout snapshot for restore
  _nextBotId: 1,
  _matchCollector: null,   // per-match data collection for learning
  // Diagnostic: engagement telemetry (reset per match, printed via sparEngagementReport())
  _engagementLog: null,
};

// Engagement telemetry tracker — call sparEngagementReport() after matches
function _resetEngagementLog() {
  SparState._engagementLog = {
    antiBottom:   { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
    gunSide:      { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
    escape:       { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
    shotTiming:   { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
    reload:       { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
    midPressure:  { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
    wallPressure: { count: 0, totalFrames: 0, zeroFrames: 0, zeroDmg: 0, shortCount: 0, durations: [], dmgDeltas: [] },
  };
}

function _logEngagement(type, frames, dmgDelta) {
  const log = SparState._engagementLog;
  if (!log || !log[type]) return;
  const entry = log[type];
  entry.count++;
  entry.totalFrames += frames;
  if (frames <= 1) entry.zeroFrames++;
  if (frames <= 5) entry.shortCount++;
  if (dmgDelta === 0) entry.zeroDmg++;
  entry.durations.push(frames);
  entry.dmgDeltas.push(dmgDelta);
}

// Snapshot current game context for engagement tracking.
// Called at engagement START (saved on ai) and at END (compared against start).
function _snapEngagementCtx(bot, tgt, ai) {
  const dx = (tgt.x || 0) - (bot.x || 0), dy = (tgt.y || 0) - (bot.y || 0);
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxHp = bot.maxHp || (typeof SPAR_CONFIG !== 'undefined' ? SPAR_CONFIG.HP_BASELINE : 100);
  const tgtMaxHp = tgt.maxHp || maxHp;
  return {
    dist: Math.round(dist),
    botX: Math.round(bot.x || 0),
    botY: Math.round(bot.y || 0),
    tgtX: Math.round(tgt.x || 0),
    tgtY: Math.round(tgt.y || 0),
    botHpPct: +(((bot.hp || 0) / maxHp)).toFixed(2),
    tgtHpPct: +(((tgt.hp || 0) / tgtMaxHp)).toFixed(2),
    botBelow: (bot.y || 0) > (tgt.y || 0),
    tgtMovingX: Math.round(tgt.vx || 0),
    tgtMovingY: Math.round(tgt.vy || 0),
    frame: SparState.matchTimer || 0,
  };
}

function sparEngagementReport() {
  const log = SparState._engagementLog;
  if (!log) { console.log('[SparDiag] No engagement log — play a match first'); return; }
  console.log('=== SPAR ENGAGEMENT TELEMETRY ===');
  for (const [type, e] of Object.entries(log)) {
    if (e.count === 0) { console.log(`  ${type}: 0 engagements`); continue; }
    const avgF = (e.totalFrames / e.count).toFixed(1);
    const avgD = e.dmgDeltas.length > 0 ? (e.dmgDeltas.reduce((a, b) => a + b, 0) / e.dmgDeltas.length).toFixed(1) : '0';
    const minF = Math.min(...e.durations);
    const maxF = Math.max(...e.durations);
    const minD = Math.min(...e.dmgDeltas);
    const maxD = Math.max(...e.dmgDeltas);
    console.log(`  ${type}: ${e.count} engagements | avg ${avgF}f (${minF}-${maxF}) | avgDmg ${avgD} (${minD}-${maxD}) | <=1f: ${e.zeroFrames} | <=5f: ${e.shortCount} | zeroDmg: ${e.zeroDmg}`);
  }
  console.log('=================================');
}

// ---- SPAR SYSTEM ----
const SparSystem = {
  enterHub() {
    playerDead = false;
    deathTimer = 0;
    if (typeof respawnTimer !== 'undefined') respawnTimer = 0;
    deathGameOver = false;
    SparState.phase = 'hub';
    SparState.activeRoom = null;
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;
  },

  // Build CT-X gun object from 100-point allocation {freeze, rof, spread}
  // Returns a full gun object matching the party member gun structure
  _buildCtxGun(freezePts, rofPts, spreadPts) {
    const frzStat = SPAR_CTX_STATS.freezeToStat(freezePts);
    const fireRate = SPAR_CTX_STATS.rofToStat(rofPts);
    const reloadSpeed = typeof SPAR_CTX_STATS.reloadToStat === 'function'
      ? SPAR_CTX_STATS.reloadToStat(rofPts)
      : this._getSparReloadFrames({ _sparRof: rofPts });
    const spread = SPAR_CTX_STATS.spreadToStat(spreadPts);
    return {
      id: 'ct_x',
      name: 'CT-X',
      damage: CT_X_GUN.damage,          // 20
      fireRate: fireRate,
      reloadSpeed: reloadSpeed,
      magSize: CT_X_GUN.magSize,         // 30
      ammo: CT_X_GUN.magSize,
      reloading: false,
      reloadTimer: 0,
      fireCooldown: 0,
      freezePenalty: frzStat.freezePenalty,
      freezeDuration: frzStat.freezeDuration,
      spread: spread,
      special: null,
      bulletColor: null,               // use default yellow (same as player)
      color: CT_X_GUN.color || '#3a5a3a',
      // Store point allocation for HUD display
      _sparFreeze: freezePts,
      _sparRof: rofPts,
      _sparSpread: spreadPts,
    };
  },

  // Meta builds — bots pick from proven competitive loadouts
  _META_BUILDS: [
    { freeze: 50, rof: 50, spread: 0 },
    { freeze: 40, rof: 50, spread: 10 },
    { freeze: 30, rof: 40, spread: 30 },
  ],

  // Pick a random meta build for a bot
  _randomBotAlloc() {
    return this._META_BUILDS[Math.floor(Math.random() * this._META_BUILDS.length)];
  },

  _clamp01(v) {
    return Math.max(0, Math.min(1, v));
  },

  // vNext: Stable center direction — avoids Math.sign(0)=0 at exact midX
  // Simply returns -1 or 1, never 0. Uses strafeDir as tiebreaker at exact overlap.
  _getStableCenterDir(ai, botX, midX) {
    const diff = midX - botX;
    if (diff > 0.5) return 1;
    if (diff < -0.5) return -1;
    // Exact overlap (within 0.5px) — use strafe dir as tiebreaker
    return ai.strafeDir || 1;
  },

  _getSparPerpHitRadius() {
    const entityR = GAME_CONFIG.ENTITY_R || 25;
    const bulletHalfShort = GAME_CONFIG.BULLET_HALF_SHORT || 4;
    return GAME_CONFIG.DEFAULT_HITBOX_R || (entityR + bulletHalfShort);
  },

  _getSparAimSlack() {
    return this._getSparPerpHitRadius() + Math.max(4, GAME_CONFIG.BULLET_HALF_SHORT || 4);
  },

  _getSparBottomGap() {
    return Math.max(20, Math.round(this._getSparPerpHitRadius() * 0.9));
  },

  _getSparWideBottomGap() {
    return this._getSparBottomGap() + Math.max(6, Math.round((GAME_CONFIG.BULLET_HALF_SHORT || 4) * 1.5));
  },

  _getSparSideOffsetNear() {
    return Math.round(this._getSparAimSlack() * 2.2);
  },

  _getSparSideOffsetWide() {
    return Math.round(this._getSparAimSlack() * 3.0);
  },

  _getSparReloadFrames(gun) {
    if (gun && typeof gun.reloadSpeed === 'number') return gun.reloadSpeed;
    const rofPts = gun && typeof gun._sparRof === 'number' ? gun._sparRof : 50;
    if (typeof _sparCtxReloadFromRof === 'function') return _sparCtxReloadFromRof(rofPts);
    const base = Math.round(20 + Math.min(100, rofPts * 1.2) * 0.25);
    return Math.round(base * 1.2);
  },

  _ensureReinforcementProfile(sl) {
    if (!sl) return null;
    const routeKeys = typeof SPAR_OPENING_ROUTE_KEYS !== 'undefined'
      ? SPAR_OPENING_ROUTE_KEYS
      : ['bottomLeft', 'bottomRight', 'bottomCenter', 'topHold', 'midFlank', 'mirrorPlayer'];
    const antiBottomKeys = typeof SPAR_ANTI_BOTTOM_RESPONSE_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_RESPONSE_KEYS
      : ['directContest', 'sideFlank', 'baitPull'];
    if (!sl.reinforcement1v1) sl.reinforcement1v1 = {};
    if (!sl.reinforcement1v1.general) sl.reinforcement1v1.general = {};
    if (!sl.reinforcement1v1.player) sl.reinforcement1v1.player = {};
    if (!sl.reinforcement1v1.selfPlay) sl.reinforcement1v1.selfPlay = {};
    const scopes = [sl.reinforcement1v1.general, sl.reinforcement1v1.player, sl.reinforcement1v1.selfPlay];
    const tacticKeys = typeof SPAR_ANTI_BOTTOM_TACTIC_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_TACTIC_KEYS
      : ['contestDirect', 'contestSprint', 'flankWide', 'flankTight', 'baitRetreat', 'baitFake'];
    const familyKeys = typeof SPAR_ANTI_BOTTOM_FAMILY_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_FAMILY_KEYS
      : ['contest', 'flank', 'bait'];
    const gunSideKeys = typeof SPAR_GUN_SIDE_POLICY_KEYS !== 'undefined'
      ? SPAR_GUN_SIDE_POLICY_KEYS
      : ['forcePeek', 'holdAngle', 'reAngleWide', 'yieldLane'];
    const gunSideFamilies = typeof SPAR_GUN_SIDE_FAMILY_KEYS !== 'undefined'
      ? SPAR_GUN_SIDE_FAMILY_KEYS
      : ['hold', 'reposition'];
    const escapeKeys = typeof SPAR_ESCAPE_POLICY_KEYS !== 'undefined'
      ? SPAR_ESCAPE_POLICY_KEYS
      : ['cornerBreak', 'highReset', 'wideDisengage', 'baitPullout'];
    const escapeFamilies = typeof SPAR_ESCAPE_FAMILY_KEYS !== 'undefined'
      ? SPAR_ESCAPE_FAMILY_KEYS
      : ['break', 'reset', 'bait'];
    for (const scope of scopes) {
      if (!scope.style) scope.style = createSparRewardBuckets(Object.keys(SPAR_DUEL_STYLES || {}));
      if (!scope.opening) scope.opening = createSparRewardBuckets(routeKeys);
      if (!scope.antiBottom) scope.antiBottom = createSparRewardBuckets(antiBottomKeys);
      if (!scope.antiBottomFamily) scope.antiBottomFamily = createSparRewardBuckets(familyKeys);
      if (!scope.antiBottomTactic) scope.antiBottomTactic = createSparRewardBuckets(tacticKeys);
      if (!scope.gunSidePolicy) scope.gunSidePolicy = createSparRewardBuckets(gunSideKeys);
      if (!scope.gunSideFamily) scope.gunSideFamily = createSparRewardBuckets(gunSideFamilies);
      if (!scope.escapePolicy) scope.escapePolicy = createSparRewardBuckets(escapeKeys);
      if (!scope.escapeFamily) scope.escapeFamily = createSparRewardBuckets(escapeFamilies);
      // v10: shot timing + reload behavior buckets
      const shotTimingKeys = typeof SPAR_SHOT_TIMING_KEYS !== 'undefined' ? SPAR_SHOT_TIMING_KEYS : ['shootImmediate', 'delayShot', 'baitShot'];
      const shotTimingFamilyKeys = typeof SPAR_SHOT_TIMING_FAMILY_KEYS !== 'undefined' ? SPAR_SHOT_TIMING_FAMILY_KEYS : ['aggressive', 'patient'];
      const reloadKeys = typeof SPAR_RELOAD_BEHAVIOR_KEYS !== 'undefined' ? SPAR_RELOAD_BEHAVIOR_KEYS : ['hardReloadPunish', 'safeReloadPunish', 'reloadBait'];
      const reloadFamilyKeys = typeof SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS !== 'undefined' ? SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS : ['punish', 'bait'];
      if (!scope.shotTimingPolicy) scope.shotTimingPolicy = createSparRewardBuckets(shotTimingKeys);
      if (!scope.shotTimingFamily) scope.shotTimingFamily = createSparRewardBuckets(shotTimingFamilyKeys);
      if (!scope.reloadPolicy) scope.reloadPolicy = createSparRewardBuckets(reloadKeys);
      if (!scope.reloadFamily) scope.reloadFamily = createSparRewardBuckets(reloadFamilyKeys);
      // v11: mid-fight pressure + wall pressure buckets
      const midPressureKeys = typeof SPAR_MID_PRESSURE_KEYS !== 'undefined' ? SPAR_MID_PRESSURE_KEYS : ['pressureHard', 'pressureSoft', 'holdLane'];
      const midPressureFamilyKeys = typeof SPAR_MID_PRESSURE_FAMILY_KEYS !== 'undefined' ? SPAR_MID_PRESSURE_FAMILY_KEYS : ['press', 'hold'];
      const wallPressureKeys = typeof SPAR_WALL_PRESSURE_KEYS !== 'undefined' ? SPAR_WALL_PRESSURE_KEYS : ['wallPinHold', 'pressureWiden', 'prefireCorner'];
      const wallPressureFamilyKeys = typeof SPAR_WALL_PRESSURE_FAMILY_KEYS !== 'undefined' ? SPAR_WALL_PRESSURE_FAMILY_KEYS : ['pin', 'widen'];
      if (!scope.midPressurePolicy) scope.midPressurePolicy = createSparRewardBuckets(midPressureKeys);
      if (!scope.midPressureFamily) scope.midPressureFamily = createSparRewardBuckets(midPressureFamilyKeys);
      if (!scope.wallPressurePolicy) scope.wallPressurePolicy = createSparRewardBuckets(wallPressureKeys);
      if (!scope.wallPressureFamily) scope.wallPressureFamily = createSparRewardBuckets(wallPressureFamilyKeys);
      // vNext: opening contest + punish window buckets
      const openContestKeys = typeof SPAR_OPENING_CONTEST_KEYS !== 'undefined' ? SPAR_OPENING_CONTEST_KEYS : ['hardRace', 'denyLane', 'delayedDrop', 'mirrorThenBreak', 'fakeCommit'];
      const openContestFamilyKeys = typeof SPAR_OPENING_CONTEST_FAMILY_KEYS !== 'undefined' ? SPAR_OPENING_CONTEST_FAMILY_KEYS : ['race', 'deny', 'bait'];
      const punishWindowKeys = typeof SPAR_PUNISH_WINDOW_KEYS !== 'undefined' ? SPAR_PUNISH_WINDOW_KEYS : ['hardConvert', 'angleConvert', 'baitConvert'];
      const punishWindowFamilyKeys = typeof SPAR_PUNISH_WINDOW_FAMILY_KEYS !== 'undefined' ? SPAR_PUNISH_WINDOW_FAMILY_KEYS : ['rush', 'angle', 'bait'];
      if (!scope.openingContestPolicy) scope.openingContestPolicy = createSparRewardBuckets(openContestKeys);
      if (!scope.openingContestFamily) scope.openingContestFamily = createSparRewardBuckets(openContestFamilyKeys);
      if (!scope.punishWindowPolicy) scope.punishWindowPolicy = createSparRewardBuckets(punishWindowKeys);
      if (!scope.punishWindowFamily) scope.punishWindowFamily = createSparRewardBuckets(punishWindowFamilyKeys);
    }
    if (!sl.tactical) {
      sl.tactical = {
        tacticFailStreaks: { contestDirect: 0, contestSprint: 0, lateCrossUnder: 0, flankWide: 0, flankTight: 0, forceMirrorThenBreak: 0, baitRetreat: 0, baitFake: 0, doubleFakeRetreat: 0 },
        trapZones: { center: { hits: 0, frames: 0 }, near: { hits: 0, frames: 0 }, wide: { hits: 0, frames: 0 } },
        antiBottomOutcomes: { attempts: 0, regainedBottom: 0, avgDmgTakenDuring: 0, avgDuration: 0 },
        openingLostBottom: { fromLeft: 0, fromRight: 0, fromCenter: 0, totalLosses: 0 },
      };
    }
    if (!sl.tactical.badLaneOutcomes) sl.tactical.badLaneOutcomes = { attempts: 0, resolved: 0, avgDmgTakenDuring: 0, avgDuration: 0 };
    if (!sl.tactical.escapeOutcomes) sl.tactical.escapeOutcomes = { attempts: 0, resolved: 0, avgDmgTakenDuring: 0, avgDuration: 0 };
    if (!sl.tactical.gunSidePunish) sl.tactical.gunSidePunish = { attempts: 0, punished: 0, avgDmgTaken: 0 };
    if (!sl.tactical.repeekFailStreaks) sl.tactical.repeekFailStreaks = { center: 0, left: 0, right: 0, topLeft: 0, topRight: 0 };
    if (!sl.tactical.escapeFailStreaks) sl.tactical.escapeFailStreaks = { cornerBreak: 0, highReset: 0, wideDisengage: 0, baitPullout: 0 };
    // v10: shot timing + reload behavior tactical tracking
    if (!sl.tactical.shotTimingOutcomes) sl.tactical.shotTimingOutcomes = { attempts: 0, hitsDuring: 0, avgDmgDealt: 0, avgDuration: 0 };
    if (!sl.tactical.reloadPunishOutcomes) sl.tactical.reloadPunishOutcomes = { attempts: 0, punished: 0, avgDmgDealt: 0, avgDuration: 0 };
    // v11: mid-fight pressure + wall pressure tactical tracking
    if (!sl.tactical.midPressureOutcomes) sl.tactical.midPressureOutcomes = { attempts: 0, dmgDealtDuring: 0, avgDmgDealt: 0, avgDuration: 0 };
    if (!sl.tactical.wallPressureOutcomes) sl.tactical.wallPressureOutcomes = { attempts: 0, pinned: 0, avgDmgDealt: 0, avgDuration: 0 };
    if (!sl.tactical.openingContestOutcomes) sl.tactical.openingContestOutcomes = { attempts: 0, securedBottom: 0, deniedBottom: 0, avgDmgDealt: 0, avgDuration: 0 };
    if (!sl.tactical.punishWindowOutcomes) sl.tactical.punishWindowOutcomes = { attempts: 0, converted: 0, avgDmgDealt: 0, avgReturnDmg: 0, avgDuration: 0 };
    if (typeof sl.tactical.idleBreaks !== 'number') sl.tactical.idleBreaks = 0;
    if (typeof sl.tactical.lowMotionRescues !== 'number') sl.tactical.lowMotionRescues = 0;
    return sl.reinforcement1v1;
  },

  _sumBucketPlays(bucketMap) {
    let total = 0;
    if (!bucketMap) return total;
    for (const bucket of Object.values(bucketMap)) total += (bucket && bucket.plays) || 0;
    return total;
  },

  _scoreRewardBucket(bucket, totalPlays, exploreWeight) {
    const plays = bucket && bucket.plays ? bucket.plays : 0;
    const reward = bucket && typeof bucket.reward === 'number' ? bucket.reward : 0.5;
    const bonus = exploreWeight * Math.sqrt(Math.log((totalPlays || 0) + 2) / (plays + 1));
    return reward + bonus;
  },

  _pickWeightedScoreChoice(scores) {
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
  },

  _getPhaseScopes() {
    const isTraining = typeof _isSparTraining === 'function' && _isSparTraining();
    const isSelfPlay = typeof _isSparSelfPlay === 'function' && _isSparSelfPlay();
    return isTraining
      ? (isSelfPlay ? ['general', 'selfPlay'] : ['general'])
      : ['general', 'player'];
  },

  _updateRewardBucket(bucket, reward) {
    if (!bucket) return;
    const clamped = this._clamp01(reward);
    if (isNaN(clamped)) return; // safety: never corrupt bucket with NaN
    const plays = bucket.plays || 0;
    bucket.reward = plays > 0 ? ((bucket.reward * plays) + clamped) / (plays + 1) : clamped;
    bucket.plays = plays + 1;
  },

  _computeDamageReward(dmgDelta) {
    return this._clamp01(0.5 + dmgDelta / (SPAR_CONFIG.HP_BASELINE * 1.5));
  },

  _getAimDirToTarget(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
  },

  _getEntityGunSide(entity) {
    if (entity === player) {
      return typeof getCurrentGunSide === 'function' ? getCurrentGunSide() : 'left';
    }
    return entity && entity._gunSide ? entity._gunSide : 'left';
  },

  _getSparMuzzlePos(entity, aimDir, gunSide) {
    const bx = entity.x - 20;
    const by = entity.y - 68;
    const bodyL = bx + 2;
    const bodyR = bx + 36;
    const armY = by + 35;
    const isRight = gunSide === 'right';
    if (aimDir === 0) return { x: isRight ? (bodyL - 1) : (bodyR + 1), y: armY + 6 + 49 };
    if (aimDir === 1) return { x: isRight ? (bodyR + 1) : (bodyL - 1), y: by + 28 - 49 };
    const mOff = GAME_CONFIG.MUZZLE_OFFSET_Y ?? 0;
    if (aimDir === 2) return { x: bodyL + 2 - 49, y: isRight ? (armY - mOff) : (armY + mOff) };
    return { x: bodyR + 9 + 49, y: isRight ? (armY + mOff) : (armY - mOff) };
  },

  _getGunSideLaneScore(source, target) {
    if (!source || !target) return 0.5;
    const aimDir = this._getAimDirToTarget(source, target);
    const muzzle = this._getSparMuzzlePos(source, aimDir, this._getEntityGunSide(source));
    if (aimDir === 0 || aimDir === 1) {
      return this._clamp01(1 - Math.abs(target.x - muzzle.x) / 90);
    }
    return this._clamp01(1 - Math.abs(target.y - muzzle.y) / 55);
  },

  _getLaneShape(bot, tgt, bottomGap, aimSlack) {
    const dx = bot.x - tgt.x;
    const above = bot.y < tgt.y - bottomGap;
    if (Math.abs(dx) < aimSlack * 1.2) return 'center';
    if (!above) return dx < 0 ? 'left' : 'right';
    return dx < 0 ? 'topLeft' : 'topRight';
  },

  _pickHierarchicalPolicy(config) {
    const {
      keys, familyMap, pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores, familyBiases, failStreaks,
      playerWeight = 24, generalWeight = 12, selfPlayWeight = 8,
      playerExplore = 0.18, generalExplore = 0.1, selfPlayExplore = 0.08,
      noise = 2.5,
    } = config;

    // Dynamic player-scope weighting: scale by total player evidence
    // 0-4 plays: weak prior (half weight, more exploration)
    // 5-9 plays: strong blend (1.3x weight, moderate exploration)
    // 10+ plays: dominant (1.7x weight, minimal exploration)
    let dynPW, dynPE, dynGW, dynSW;
    if (totalPP >= 10) {
      dynPW = playerWeight * 1.7;
      dynPE = playerExplore * 0.35;
      dynGW = generalWeight * 0.5;
      dynSW = selfPlayWeight * 0.5;
    } else if (totalPP >= 5) {
      dynPW = playerWeight * 1.3;
      dynPE = playerExplore * 0.65;
      dynGW = generalWeight * 0.8;
      dynSW = selfPlayWeight * 0.8;
    } else {
      dynPW = playerWeight * 0.5;
      dynPE = playerExplore * 1.3;
      dynGW = generalWeight;
      dynSW = selfPlayWeight;
    }

    let best = keys[0];
    let bestScore = -Infinity;
    for (const key of keys) {
      const family = familyMap[key];
      let score = baseScores[key] || 0;
      if (familyBiases && familyBiases[family]) score += familyBiases[family];
      const pPlays = pPolicy && pPolicy[key] ? pPolicy[key].plays || 0 : 0;
      const gPlays = gPolicy && gPolicy[key] ? gPolicy[key].plays || 0 : 0;
      const sPlays = sPolicy && sPolicy[key] ? sPolicy[key].plays || 0 : 0;
      const pScore = pPlays >= 3
        ? this._scoreRewardBucket(pPolicy && pPolicy[key], totalPP, dynPE)
        : this._scoreRewardBucket(pFamily && pFamily[family], totalPF, dynPE);
      const gScore = gPlays >= 3
        ? this._scoreRewardBucket(gPolicy && gPolicy[key], totalGP, generalExplore)
        : this._scoreRewardBucket(gFamily && gFamily[family], totalGF, generalExplore);
      const sScore = sPlays >= 3
        ? this._scoreRewardBucket(sPolicy && sPolicy[key], totalSP, selfPlayExplore)
        : this._scoreRewardBucket(sFamily && sFamily[family], totalSF, selfPlayExplore);
      score += (pScore - 0.5) * dynPW;
      score += (gScore - 0.5) * dynGW;
      score += (sScore - 0.5) * dynSW;

      // Exploitation bonus: strong player evidence with clearly positive reward
      if (pPlays >= 3) {
        const pReward = pPolicy && pPolicy[key] ? pPolicy[key].reward || 0.5 : 0.5;
        if (pReward > 0.62) score += (pReward - 0.5) * 8;  // bonus for proven winners
      }

      // Fail streak suppression (strengthened)
      const fs = failStreaks && failStreaks[key] ? failStreaks[key] : 0;
      if (fs >= 5) score -= 20;
      else if (fs >= 4) score -= 13;
      else if (fs >= 3) score -= 7;
      // Family-level suppression: if 2+ policies in same family have streaks, penalize family
      if (fs >= 3 && familyBiases) {
        let familyFailCount = 0;
        for (const k2 of keys) {
          if (familyMap[k2] === family && failStreaks && (failStreaks[k2] || 0) >= 3) familyFailCount++;
        }
        if (familyFailCount >= 2) score -= 6;
      }

      score += Math.random() * noise;
      if (score > bestScore) {
        bestScore = score;
        best = key;
      }
    }
    return best;
  },

  _updateMatchReinforcement(won, collector, enemyBot, scopes) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    if (!sl || !collector || !enemyBot || !enemyBot.ai) return;
    const rf = this._ensureReinforcementProfile(sl);
    if (!rf) return;

    const botWon = !won;
    const dmgDelta = (enemyBot.ai._matchDmgDealt || 0) - (enemyBot.ai._matchDmgTaken || 0);
    const dmgReward = this._computeDamageReward(dmgDelta);
    const gotBottomAtOpening = collector.botYAtOpeningEnd > 0 && collector.playerYAtOpeningEnd > 0
      ? (collector.botYAtOpeningEnd > collector.playerYAtOpeningEnd + 20 ? 1 : 0)
      : 0.5;
    const totalBottomFrames = (collector.botHasBottom_frames || 0) + (collector.hasBottom_frames || 0);
    const retakeShare = totalBottomFrames > 0 ? ((collector.botHasBottom_frames || 0) / totalBottomFrames) : 0.5;
    const verticalFrames = (collector.botUnderEnemy_frames || 0) + (collector.botAboveEnemy_frames || 0);
    const underReward = verticalFrames > 0 ? ((collector.botUnderEnemy_frames || 0) / verticalFrames) : 0.5;
    const gunFrames = (collector.botGunAdv_frames || 0) + (collector.botGunDisadv_frames || 0);
    const gunReward = gunFrames > 0 ? ((collector.botGunAdv_frames || 0) / gunFrames) : 0.5;
    const winReward = botWon ? 1 : 0;
    // Winning is the biggest signal, then damage trade, then posture.
    const baseReward = this._clamp01(
      winReward * 0.5 +
      dmgReward * 0.24 +
      underReward * 0.16 +
      gunReward * 0.10
    );
    const styleReward = baseReward;
    const routeReward = this._clamp01(baseReward * 0.7 + gotBottomAtOpening * 0.2 + underReward * 0.1);
    const antiBottomReward = this._clamp01(baseReward * 0.62 + retakeShare * 0.2 + underReward * 0.1 + gunReward * 0.08);
    const gunSideReward = this._clamp01(baseReward * 0.55 + gunReward * 0.3 + underReward * 0.15);
    const cornerStuck = collector.nearWall_cornerStuckFrames || 0;
    const wallFrames = collector.nearWall_frames || 1;
    const escapeReward = this._clamp01(baseReward * 0.6 + (1 - Math.min(1, cornerStuck / Math.max(1, wallFrames))) * 0.2 + gunReward * 0.2);
    // v10: shot timing + reload behavior rewards
    // Use normalized damage delta instead of binary "any damage" — phase reward handles per-engagement
    const shotTimingReward = this._clamp01(baseReward * 0.6 + dmgReward * 0.25 + gunReward * 0.15);
    const reloadReward = this._clamp01(baseReward * 0.7 + dmgReward * 0.3);
    // v11: mid-fight pressure + wall pressure rewards
    const midPressureReward = this._clamp01(baseReward * 0.65 + dmgReward * 0.35);
    const wallPressureReward = this._clamp01(baseReward * 0.55 + underReward * 0.25 + gunReward * 0.20);
    const scopeList = Array.isArray(scopes) ? scopes : [];
    for (const scopeName of scopeList) {
      const scope = rf[scopeName];
      if (!scope) continue;
      if (enemyBot.ai._duelStyle && scope.style && scope.style[enemyBot.ai._duelStyle]) {
        this._updateRewardBucket(scope.style[enemyBot.ai._duelStyle], styleReward);
      }
      if (SparState._botOpeningRoute && scope.opening && scope.opening[SparState._botOpeningRoute]) {
        this._updateRewardBucket(scope.opening[SparState._botOpeningRoute], routeReward);
      }
      // Legacy anti-bottom bucket (backward compat)
      if (enemyBot.ai._antiBottomResponse && enemyBot.ai._antiBottomFrames > 20 &&
          scope.antiBottom && scope.antiBottom[enemyBot.ai._antiBottomResponse]) {
        this._updateRewardBucket(scope.antiBottom[enemyBot.ai._antiBottomResponse], antiBottomReward);
      }
      // v8 tactic/family buckets — fall back to _last fields if engagement already finalized
      const abTactic = enemyBot.ai._antiBottomTactic || enemyBot.ai._lastAntiBottomTactic || null;
      const abFamily = enemyBot.ai._antiBottomFamily || enemyBot.ai._lastAntiBottomFamily || null;
      if (abTactic) {
        if (scope.antiBottomTactic && scope.antiBottomTactic[abTactic]) {
          this._updateRewardBucket(scope.antiBottomTactic[abTactic], antiBottomReward);
        }
        if (abFamily && scope.antiBottomFamily && scope.antiBottomFamily[abFamily]) {
          this._updateRewardBucket(scope.antiBottomFamily[abFamily], antiBottomReward);
        }
      }
      const gunPolicy = enemyBot.ai._gunSidePolicy || enemyBot.ai._lastGunSidePolicy;
      const gunFamily = enemyBot.ai._gunSideFamily || enemyBot.ai._lastGunSideFamily;
      if (gunPolicy && scope.gunSidePolicy && scope.gunSidePolicy[gunPolicy]) {
        this._updateRewardBucket(scope.gunSidePolicy[gunPolicy], gunSideReward);
      }
      if (gunFamily && scope.gunSideFamily && scope.gunSideFamily[gunFamily]) {
        this._updateRewardBucket(scope.gunSideFamily[gunFamily], gunSideReward);
      }
      const escapePolicy = enemyBot.ai._escapePolicy || enemyBot.ai._lastEscapePolicy;
      const escapeFamily = enemyBot.ai._escapeFamily || enemyBot.ai._lastEscapeFamily;
      if (escapePolicy && scope.escapePolicy && scope.escapePolicy[escapePolicy]) {
        this._updateRewardBucket(scope.escapePolicy[escapePolicy], escapeReward);
      }
      if (escapeFamily && scope.escapeFamily && scope.escapeFamily[escapeFamily]) {
        this._updateRewardBucket(scope.escapeFamily[escapeFamily], escapeReward);
      }
      // v10: shot timing policy match-end update — half weight (phase reward is primary)
      const stPolicy = enemyBot.ai._shotTimingPolicy || enemyBot.ai._lastShotTimingPolicy || null;
      const stFamily = enemyBot.ai._shotTimingFamily || enemyBot.ai._lastShotTimingFamily || null;
      const stRewardHalf = this._clamp01(0.5 + (shotTimingReward - 0.5) * 0.5);
      if (stPolicy && scope.shotTimingPolicy && scope.shotTimingPolicy[stPolicy]) {
        this._updateRewardBucket(scope.shotTimingPolicy[stPolicy], stRewardHalf);
      }
      if (stFamily && scope.shotTimingFamily && scope.shotTimingFamily[stFamily]) {
        this._updateRewardBucket(scope.shotTimingFamily[stFamily], stRewardHalf);
      }
      // v10: reload behavior match-end update — half weight (phase reward is primary)
      const rlPolicy = enemyBot.ai._reloadPolicy || enemyBot.ai._lastReloadPolicy || null;
      const rlFamily = enemyBot.ai._reloadFamily || enemyBot.ai._lastReloadFamily || null;
      const rlRewardHalf = this._clamp01(0.5 + (reloadReward - 0.5) * 0.5);
      if (rlPolicy && scope.reloadPolicy && scope.reloadPolicy[rlPolicy]) {
        this._updateRewardBucket(scope.reloadPolicy[rlPolicy], rlRewardHalf);
      }
      if (rlFamily && scope.reloadFamily && scope.reloadFamily[rlFamily]) {
        this._updateRewardBucket(scope.reloadFamily[rlFamily], rlRewardHalf);
      }
      // v11: mid-fight pressure match-end update — half weight
      const mpPolicy = enemyBot.ai._midPressurePolicy || enemyBot.ai._lastMidPressurePolicy || null;
      const mpFamily = enemyBot.ai._midPressureFamily || enemyBot.ai._lastMidPressureFamily || null;
      const mpRewardHalf = this._clamp01(0.5 + (midPressureReward - 0.5) * 0.5);
      if (mpPolicy && scope.midPressurePolicy && scope.midPressurePolicy[mpPolicy]) {
        this._updateRewardBucket(scope.midPressurePolicy[mpPolicy], mpRewardHalf);
      }
      if (mpFamily && scope.midPressureFamily && scope.midPressureFamily[mpFamily]) {
        this._updateRewardBucket(scope.midPressureFamily[mpFamily], mpRewardHalf);
      }
      // v11: wall pressure match-end update — half weight
      const wpPolicy = enemyBot.ai._wallPressurePolicy || enemyBot.ai._lastWallPressurePolicy || null;
      const wpFamily = enemyBot.ai._wallPressureFamily || enemyBot.ai._lastWallPressureFamily || null;
      const wpRewardHalf = this._clamp01(0.5 + (wallPressureReward - 0.5) * 0.5);
      if (wpPolicy && scope.wallPressurePolicy && scope.wallPressurePolicy[wpPolicy]) {
        this._updateRewardBucket(scope.wallPressurePolicy[wpPolicy], wpRewardHalf);
      }
      if (wpFamily && scope.wallPressureFamily && scope.wallPressureFamily[wpFamily]) {
        this._updateRewardBucket(scope.wallPressureFamily[wpFamily], wpRewardHalf);
      }
      // vNext: opening contest match-end update
      const ocPolicy = enemyBot.ai._openingContestPolicy || enemyBot.ai._lastOpeningContestPolicy || null;
      const ocFamily = enemyBot.ai._openingContestFamily || enemyBot.ai._lastOpeningContestFamily || null;
      const openingContestReward = this._clamp01(baseReward * 0.5 + gotBottomAtOpening * 0.35 + underReward * 0.15);
      if (ocPolicy && scope.openingContestPolicy && scope.openingContestPolicy[ocPolicy]) {
        this._updateRewardBucket(scope.openingContestPolicy[ocPolicy], openingContestReward);
      }
      if (ocFamily && scope.openingContestFamily && scope.openingContestFamily[ocFamily]) {
        this._updateRewardBucket(scope.openingContestFamily[ocFamily], openingContestReward);
      }
      // vNext: punish window match-end update — half weight (phase reward is primary)
      const pwPolicy = enemyBot.ai._punishWindowPolicy || enemyBot.ai._lastPunishWindowPolicy || null;
      const pwFamily = enemyBot.ai._punishWindowFamily || enemyBot.ai._lastPunishWindowFamily || null;
      const punishWindowReward = this._clamp01(baseReward * 0.6 + dmgReward * 0.4);
      const pwRewardHalf = this._clamp01(0.5 + (punishWindowReward - 0.5) * 0.5);
      if (pwPolicy && scope.punishWindowPolicy && scope.punishWindowPolicy[pwPolicy]) {
        this._updateRewardBucket(scope.punishWindowPolicy[pwPolicy], pwRewardHalf);
      }
      if (pwFamily && scope.punishWindowFamily && scope.punishWindowFamily[pwFamily]) {
        this._updateRewardBucket(scope.punishWindowFamily[pwFamily], pwRewardHalf);
      }
    }
  },

  // Legacy picker — kept for backward compat (training harness may call it)
  _pickAntiBottomResponse(pm) {
    return this._pickAntiBottomTactic(pm);
  },

  // v8 hierarchical anti-bottom tactic selector — unified through _pickHierarchicalPolicy
  _pickAntiBottomTactic(pm, openingLostDir) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const tactics = typeof SPAR_ANTI_BOTTOM_TACTIC_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_TACTIC_KEYS
      : ['contestDirect', 'contestSprint', 'flankWide', 'flankTight', 'baitRetreat', 'baitFake'];
    const familyMap = typeof SPAR_ANTI_BOTTOM_FAMILY_MAP !== 'undefined'
      ? SPAR_ANTI_BOTTOM_FAMILY_MAP
      : { contestDirect: 'contest', contestSprint: 'contest', flankWide: 'flank', flankTight: 'flank', baitRetreat: 'bait', baitFake: 'bait' };
    if (!sl) return tactics[Math.floor(Math.random() * tactics.length)];

    const rf = this._ensureReinforcementProfile(sl);
    const pTactic = rf && rf.player ? rf.player.antiBottomTactic : null;
    const gTactic = rf && rf.general ? rf.general.antiBottomTactic : null;
    const sTactic = rf && rf.selfPlay ? rf.selfPlay.antiBottomTactic : null;
    const pFamily = rf && rf.player ? rf.player.antiBottomFamily : null;
    const gFamily = rf && rf.general ? rf.general.antiBottomFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.antiBottomFamily : null;
    const totalPT = this._sumBucketPlays(pTactic);
    const totalGT = this._sumBucketPlays(gTactic);
    const totalST = this._sumBucketPlays(sTactic);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);
    const failStreaks = sl.tactical ? sl.tactical.tacticFailStreaks : null;

    // Build base scores from family + profile bonuses + opening context
    const baseScores = {};
    const familyBiases = { contest: 0, flank: 0, bait: 0 };
    for (const tactic of tactics) {
      const family = familyMap[tactic];
      baseScores[tactic] = family === 'flank' ? 7 : (family === 'contest' ? 6 : 5);
    }

    // Profile bonuses (mapped to family + specific tactics)
    if (pm) {
      if (pm.playerWallsFromBottom > 0.45) familyBiases.flank += 10;
      if (pm.playerHoldsBottom > 0.55) familyBiases.flank += 6;
      if (pm.playerRetreatsSameSide > 0.55) baseScores.forceMirrorThenBreak = (baseScores.forceMirrorThenBreak || 7) + 4;
      if (pm.playerHoldsBottom > 0.6 && pm.playerPushesFromBottom < 0.35) familyBiases.contest += 10;
      if (pm.playerPushesFromBottom > 0.45) familyBiases.contest -= 4;
      if (pm.playerShootsFast) baseScores.lateCrossUnder = (baseScores.lateCrossUnder || 6) + 5;
      if (pm.playerPushesFromBottom > 0.45) familyBiases.bait += 11;
      if (pm.playerWallsFromBottom > 0.55) familyBiases.bait += 3;
      if (pm.playerChases > 0.45) baseScores.doubleFakeRetreat = (baseScores.doubleFakeRetreat || 5) + 5;
    }

    // Opening context bonus: prefer opposite side of player's bottom approach
    if (openingLostDir) {
      if (openingLostDir === 'left' || openingLostDir === 'right') {
        for (const t of ['flankWide', 'flankTight', 'forceMirrorThenBreak']) baseScores[t] = (baseScores[t] || 7) + 5;
        for (const t of ['contestSprint', 'lateCrossUnder']) baseScores[t] = (baseScores[t] || 6) + 3;
      } else {
        baseScores.flankWide = (baseScores.flankWide || 7) + 4;
        for (const t of ['baitRetreat', 'doubleFakeRetreat']) baseScores[t] = (baseScores[t] || 5) + 4;
      }
    }

    return this._pickHierarchicalPolicy({
      keys: tactics, familyMap,
      pPolicy: pTactic, gPolicy: gTactic, sPolicy: sTactic,
      pFamily, gFamily, sFamily,
      totalPP: totalPT, totalGP: totalGT, totalSP: totalST,
      totalPF, totalGF, totalSF,
      baseScores, familyBiases, failStreaks,
      playerWeight: 28, generalWeight: 14, selfPlayWeight: 10,
      playerExplore: 0.24, generalExplore: 0.12, selfPlayExplore: 0.08,
      noise: 3,
    });
  },

  _pickGunSidePolicy(pm, laneInfo) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const rf = this._ensureReinforcementProfile(sl);
    const familyMap = typeof SPAR_GUN_SIDE_FAMILY_MAP !== 'undefined'
      ? SPAR_GUN_SIDE_FAMILY_MAP
      : { forcePeek: 'hold', holdAngle: 'hold', reAngleWide: 'reposition', yieldLane: 'reposition', peekPressure: 'pressure' };
    const pPolicy = rf && rf.player ? rf.player.gunSidePolicy : null;
    const gPolicy = rf && rf.general ? rf.general.gunSidePolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.gunSidePolicy : null;
    const pFamily = rf && rf.player ? rf.player.gunSideFamily : null;
    const gFamily = rf && rf.general ? rf.general.gunSideFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.gunSideFamily : null;
    const totalPP = this._sumBucketPlays(pPolicy);
    const totalGP = this._sumBucketPlays(gPolicy);
    const totalSP = this._sumBucketPlays(sPolicy);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);
    const laneFail = sl && sl.tactical && sl.tactical.repeekFailStreaks && laneInfo
      ? sl.tactical.repeekFailStreaks[laneInfo.laneShape] || 0 : 0;
    const failStreaks = {
      forcePeek: laneFail,
      holdAngle: Math.max(0, laneFail - 1),
      preAimLaneHold: Math.max(0, laneFail - 1),
      reAngleWide: 0,
      yieldLane: 0,
      peekPressure: 0,
    };
    const baseScores = {
      forcePeek: laneInfo && laneInfo.score > 0.56 ? 7 : 3,
      holdAngle: 6,
      preAimLaneHold: laneInfo && laneInfo.score > 0.52 ? 7 : 4,
      reAngleWide: 7,
      yieldLane: 6,
      peekPressure: laneInfo && laneInfo.score > 0.55 ? 8 : 4,
    };
    const familyBiases = { hold: 0, reposition: 0, pressure: 0 };
    if (laneInfo) {
      if (laneInfo.badGunSide) familyBiases.reposition += 4;
      if (laneInfo.repeekedBadLane) familyBiases.reposition += 5;
      if (laneInfo.score < 0.38) familyBiases.reposition += 4;
    }
    if (pm) {
      if (pm.playerHitRate > 0.55) familyBiases.reposition += 2;
      if (pm.peekEffective === false) familyBiases.reposition += 3;
      if (pm.bestEvasion === 'retreat') baseScores.yieldLane += 2;
      if (pm.playerChases > 0.45) baseScores.yieldLane += 2;
    }
    return this._pickHierarchicalPolicy({
      keys: typeof SPAR_GUN_SIDE_POLICY_KEYS !== 'undefined'
        ? SPAR_GUN_SIDE_POLICY_KEYS : ['forcePeek', 'holdAngle', 'reAngleWide', 'yieldLane'],
      familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores, familyBiases, failStreaks,
      playerWeight: 26, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.18, generalExplore: 0.1, selfPlayExplore: 0.08,
      noise: 2.2,
    });
  },

  _pickEscapePolicy(pm, laneInfo) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const rf = this._ensureReinforcementProfile(sl);
    const familyMap = typeof SPAR_ESCAPE_FAMILY_MAP !== 'undefined'
      ? SPAR_ESCAPE_FAMILY_MAP
      : { cornerBreak: 'break', highReset: 'reset', wideDisengage: 'break', baitPullout: 'bait' };
    const pPolicy = rf && rf.player ? rf.player.escapePolicy : null;
    const gPolicy = rf && rf.general ? rf.general.escapePolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.escapePolicy : null;
    const pFamily = rf && rf.player ? rf.player.escapeFamily : null;
    const gFamily = rf && rf.general ? rf.general.escapeFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.escapeFamily : null;
    const totalPP = this._sumBucketPlays(pPolicy);
    const totalGP = this._sumBucketPlays(gPolicy);
    const totalSP = this._sumBucketPlays(sPolicy);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);
    const failStreaks = sl && sl.tactical ? sl.tactical.escapeFailStreaks : null;
    const baseScores = {
      cornerBreak: laneInfo && laneInfo.topCornerTrapped ? 10 : 6,
      highReset: 6,
      wideDisengage: 8,
      baitPullout: 5,
    };
    const familyBiases = { break: 0, reset: 0, bait: 0 };
    if (laneInfo) {
      if (laneInfo.topCornerTrapped) familyBiases.break += 5;
      if (laneInfo.noAdvantageState) familyBiases.break += 3;
      if (laneInfo.lostBottomAndNoLane) familyBiases.reset += 2;
    }
    if (pm) {
      if (pm.playerChases > 0.5) baseScores.baitPullout += 5;
      if (pm.playerWallsFromBottom > 0.55) baseScores.wideDisengage += 3;
      if (pm.playerHitRate > 0.55) familyBiases.break += 2;
    }
    return this._pickHierarchicalPolicy({
      keys: typeof SPAR_ESCAPE_POLICY_KEYS !== 'undefined'
        ? SPAR_ESCAPE_POLICY_KEYS : ['cornerBreak', 'highReset', 'wideDisengage', 'baitPullout'],
      familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores, familyBiases, failStreaks,
      playerWeight: 24, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.16, generalExplore: 0.08, selfPlayExplore: 0.06,
      noise: 2.0,
    });
  },

  // vNext: Opening contest policy picker — how to fight the first 180 frames
  _pickOpeningContestPolicy(pm) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const familyMap = typeof SPAR_OPENING_CONTEST_FAMILY_MAP !== 'undefined'
      ? SPAR_OPENING_CONTEST_FAMILY_MAP
      : { hardRace: 'race', denyLane: 'deny', delayedDrop: 'deny', mirrorThenBreak: 'bait', fakeCommit: 'bait' };
    const rf = sl ? this._ensureReinforcementProfile(sl) : null;
    const pPolicy = rf && rf.player ? rf.player.openingContestPolicy : null;
    const gPolicy = rf && rf.general ? rf.general.openingContestPolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.openingContestPolicy : null;
    const pFamily = rf && rf.player ? rf.player.openingContestFamily : null;
    const gFamily = rf && rf.general ? rf.general.openingContestFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.openingContestFamily : null;
    const baseScores = {
      hardRace: 8, denyLane: 6, delayedDrop: 5, mirrorThenBreak: 5, fakeCommit: 4,
    };
    const familyBiases = { race: 0, deny: 0, bait: 0 };
    if (sl && sl.opening) {
      if (sl.opening.rushBottom > 0.6) { familyBiases.deny += 4; familyBiases.bait += 3; }
      if (sl.opening.takesBottomPct > 0.65) { familyBiases.deny += 5; familyBiases.bait += 4; familyBiases.race -= 2; }
      if (sl.opening.shootsDuringOpening > 0.6) baseScores.delayedDrop += 4;
      if (sl.opening.strafeLeft > 0.65 || sl.opening.strafeLeft < 0.35) baseScores.denyLane += 4;
    }
    if (sl && sl.gunSide && sl.gunSide.playerPreference) baseScores.mirrorThenBreak += 2;
    return this._pickHierarchicalPolicy({
      keys: typeof SPAR_OPENING_CONTEST_KEYS !== 'undefined'
        ? SPAR_OPENING_CONTEST_KEYS : ['hardRace', 'denyLane', 'delayedDrop', 'mirrorThenBreak', 'fakeCommit'],
      familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP: this._sumBucketPlays(pPolicy), totalGP: this._sumBucketPlays(gPolicy), totalSP: this._sumBucketPlays(sPolicy),
      totalPF: this._sumBucketPlays(pFamily), totalGF: this._sumBucketPlays(gFamily), totalSF: this._sumBucketPlays(sFamily),
      baseScores, familyBiases, failStreaks: null,
      playerWeight: 22, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.2, generalExplore: 0.12, selfPlayExplore: 0.08,
      noise: 2.5,
    });
  },

  // vNext: Punish window policy picker
  _pickPunishWindowPolicy(pm, trigger) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const familyMap = typeof SPAR_PUNISH_WINDOW_FAMILY_MAP !== 'undefined'
      ? SPAR_PUNISH_WINDOW_FAMILY_MAP
      : { hardConvert: 'rush', angleConvert: 'angle', baitConvert: 'bait' };
    const rf = sl ? this._ensureReinforcementProfile(sl) : null;
    const pPolicy = rf && rf.player ? rf.player.punishWindowPolicy : null;
    const gPolicy = rf && rf.general ? rf.general.punishWindowPolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.punishWindowPolicy : null;
    const pFamily = rf && rf.player ? rf.player.punishWindowFamily : null;
    const gFamily = rf && rf.general ? rf.general.punishWindowFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.punishWindowFamily : null;
    const baseScores = { hardConvert: 7, angleConvert: 6, baitConvert: 5 };
    const familyBiases = { rush: 0, angle: 0, bait: 0 };
    if (sl && sl.rhythm) {
      if (sl.rhythm.avgShotDelay < 6) { familyBiases.angle += 3; familyBiases.bait += 2; familyBiases.rush -= 2; }
      if (sl.rhythm.repeeksQuickly > 0.55) baseScores.baitConvert += 4;
      if (sl.rhythm.retreatsSameSide > 0.55) baseScores.angleConvert += 3;
    }
    if (trigger === 'reload') familyBiases.rush += 3;
    else if (trigger === 'whiff') familyBiases.angle += 2;
    else if (trigger === 'repeek') familyBiases.bait += 3;
    return this._pickHierarchicalPolicy({
      keys: typeof SPAR_PUNISH_WINDOW_KEYS !== 'undefined'
        ? SPAR_PUNISH_WINDOW_KEYS : ['hardConvert', 'angleConvert', 'baitConvert'],
      familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP: this._sumBucketPlays(pPolicy), totalGP: this._sumBucketPlays(gPolicy), totalSP: this._sumBucketPlays(sPolicy),
      totalPF: this._sumBucketPlays(pFamily), totalGF: this._sumBucketPlays(gFamily), totalSF: this._sumBucketPlays(sFamily),
      baseScores, familyBiases, failStreaks: null,
      playerWeight: 24, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.18, generalExplore: 0.1, selfPlayExplore: 0.08,
      noise: 2.0,
    });
  },

  // vNext: Finalize opening contest engagement
  _finalizeOpeningContest(ai, botSecuredBottom, playerDeniedBottom, dmgDealt, duration, openingQuality) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const policy = ai._openingContestPolicy;
    const family = ai._openingContestFamily;
    if (!policy) return;
    const securedR = botSecuredBottom ? 1 : 0;
    const deniedR = playerDeniedBottom ? 1 : 0;
    const dmgR = this._clamp01(0.5 + dmgDealt / (SPAR_CONFIG.HP_BASELINE * 0.5));
    const qualityR = typeof openingQuality === 'number' ? openingQuality : 0.5;
    // Opening contest: bottom control is the key objective (50% + 25% deny = 75% objective-driven)
    const phaseReward = this._clamp01(securedR * 0.50 + deniedR * 0.25 + dmgR * 0.10 + qualityR * 0.15);
    if (sl) {
      const rf = this._ensureReinforcementProfile(sl);
      if (rf) {
        for (const scopeName of this._getPhaseScopes()) {
          const scope = rf[scopeName];
          if (!scope) continue;
          if (scope.openingContestPolicy && scope.openingContestPolicy[policy]) this._updateRewardBucket(scope.openingContestPolicy[policy], phaseReward);
          if (scope.openingContestFamily && scope.openingContestFamily[family]) this._updateRewardBucket(scope.openingContestFamily[family], phaseReward);
        }
      }
      if (sl.tactical && sl.tactical.openingContestOutcomes) {
        const oco = sl.tactical.openingContestOutcomes;
        oco.attempts++;
        if (botSecuredBottom) oco.securedBottom++;
        if (playerDeniedBottom) oco.deniedBottom++;
        oco.avgDmgDealt = oco.attempts > 1 ? oco.avgDmgDealt * 0.8 + dmgDealt * 0.2 : dmgDealt;
        oco.avgDuration = oco.attempts > 1 ? oco.avgDuration * 0.8 + duration * 0.2 : duration;
      }
    }
    ai._lastOpeningContestPolicy = policy;
    ai._lastOpeningContestFamily = family;
    ai._openingContestPolicy = null;
    ai._openingContestFamily = null;
  },

  // vNext: Finalize punish window engagement
  _finalizePunishWindow(ai) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const policy = ai._punishWindowPolicy;
    const family = ai._punishWindowFamily;
    const frames = ai._punishWindowFrames || 0;
    if (!policy || frames <= 0) return;
    const dmgDealt = (ai._matchDmgDealt || 0) - (ai._punishWindowStartDmgDealt || 0);
    const dmgTaken = (ai._matchDmgTaken || 0) - (ai._punishWindowStartDmgTaken || 0);
    const converted = dmgDealt > 0 && dmgTaken <= dmgDealt * 0.5;
    const dmgR = this._clamp01(0.5 + dmgDealt / (SPAR_CONFIG.HP_BASELINE * 0.3));
    const safeR = this._clamp01(1 - dmgTaken / (SPAR_CONFIG.HP_BASELINE * 0.2));
    const convertR = converted ? 1 : 0;
    // Punish window: conversion inside the window is the key objective
    const phaseReward = this._clamp01(convertR * 0.45 + dmgR * 0.30 + safeR * 0.25);
    if (sl) {
      const rf = this._ensureReinforcementProfile(sl);
      if (rf) {
        for (const scopeName of this._getPhaseScopes()) {
          const scope = rf[scopeName];
          if (!scope) continue;
          if (scope.punishWindowPolicy && scope.punishWindowPolicy[policy]) this._updateRewardBucket(scope.punishWindowPolicy[policy], phaseReward);
          if (scope.punishWindowFamily && scope.punishWindowFamily[family]) this._updateRewardBucket(scope.punishWindowFamily[family], phaseReward);
        }
      }
      if (sl.tactical && sl.tactical.punishWindowOutcomes) {
        const pwo = sl.tactical.punishWindowOutcomes;
        pwo.attempts++;
        if (converted) pwo.converted++;
        pwo.avgDmgDealt = pwo.attempts > 1 ? pwo.avgDmgDealt * 0.8 + dmgDealt * 0.2 : dmgDealt;
        pwo.avgReturnDmg = pwo.attempts > 1 ? pwo.avgReturnDmg * 0.8 + dmgTaken * 0.2 : dmgTaken;
        pwo.avgDuration = pwo.attempts > 1 ? pwo.avgDuration * 0.8 + frames * 0.2 : frames;
      }
    }
    ai._lastPunishWindowPolicy = policy;
    ai._lastPunishWindowFamily = family;
    ai._punishWindowPolicy = null;
    ai._punishWindowFamily = null;
    ai._punishWindowFrames = 0;
    ai._punishWindowTrigger = null;
    ai._punishWindowCooldown = 30;
  },

  _finalizeGunSideEngagement(ai, resolved) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const policy = ai._gunSidePolicy;
    const family = ai._gunSideFamily;
    const frames = ai._gunSideFrames || 0;
    if (!policy || frames <= 0) return;
    const dmgTaken = (ai._matchDmgTaken || 0) - (ai._gunSideStartDmg || 0);
    _logEngagement('gunSide', frames, dmgTaken);
    const _gsCollector = SparState._matchCollector;
    if (_gsCollector && _gsCollector.gunSideEngagements) {
      _gsCollector.gunSideEngagements.push({
        policy, family, frames, resolved, dmgTaken,
        startCtx: ai._gunSideStartCtx || null,
        qualityStart: ai._gunSideStartQuality, qualityBest: ai._gunSideBestQuality,
      });
    }
    const startQuality = typeof ai._gunSideStartQuality === 'number' ? ai._gunSideStartQuality : 0.35;
    const endQuality = typeof ai._gunSideBestQuality === 'number' ? ai._gunSideBestQuality : startQuality;
    const qualityGain = this._clamp01(0.5 + (endQuality - startQuality));
    const dmgR = this._clamp01(1 - dmgTaken / (SPAR_CONFIG.HP_BASELINE * 0.35));
    // Gun side: resolution + lane improvement are key; damage matters less
    const phaseReward = this._clamp01((resolved ? 1 : 0) * 0.50 + qualityGain * 0.30 + dmgR * 0.20);
    if (sl) {
      const rf = this._ensureReinforcementProfile(sl);
      if (rf) {
        for (const scopeName of this._getPhaseScopes()) {
          const scope = rf[scopeName];
          if (!scope) continue;
          if (scope.gunSidePolicy && scope.gunSidePolicy[policy]) this._updateRewardBucket(scope.gunSidePolicy[policy], phaseReward);
          if (scope.gunSideFamily && scope.gunSideFamily[family]) this._updateRewardBucket(scope.gunSideFamily[family], phaseReward);
        }
      }
      if (sl.tactical) {
        const bo = sl.tactical.badLaneOutcomes;
        if (bo) {
          bo.attempts++;
          if (resolved) bo.resolved++;
          bo.avgDmgTakenDuring = bo.attempts > 1 ? bo.avgDmgTakenDuring * 0.8 + dmgTaken * 0.2 : dmgTaken;
          bo.avgDuration = bo.attempts > 1 ? bo.avgDuration * 0.8 + frames * 0.2 : frames;
        }
        const gp = sl.tactical.gunSidePunish;
        if (gp) {
          gp.attempts++;
          if (!resolved && dmgTaken > 0) gp.punished++;
          gp.avgDmgTaken = gp.attempts > 1 ? gp.avgDmgTaken * 0.8 + dmgTaken * 0.2 : dmgTaken;
        }
        const laneShape = ai._gunSideLaneShape || 'center';
        if (sl.tactical.repeekFailStreaks && laneShape in sl.tactical.repeekFailStreaks) {
          if (!resolved) sl.tactical.repeekFailStreaks[laneShape] = (sl.tactical.repeekFailStreaks[laneShape] || 0) + 1;
          else sl.tactical.repeekFailStreaks[laneShape] = 0;
        }
      }
    }
    ai._lastGunSidePolicy = policy;
    ai._lastGunSideFamily = family;
    ai._gunSidePolicy = null;
    ai._gunSideFamily = null;
    ai._gunSideFrames = 0;
    ai._gunSideLaneShape = null;
    ai._gunSideStartDmg = 0;
    ai._gunSideStartQuality = 0;
    ai._gunSideBestQuality = 0;
    ai._gunSideStartCtx = null;
  },

  _finalizeEscapeEngagement(ai, resolved) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const policy = ai._escapePolicy;
    const family = ai._escapeFamily;
    const frames = ai._escapeFrames || 0;
    if (!policy || frames <= 0) return;
    const dmgTaken = (ai._matchDmgTaken || 0) - (ai._escapeStartDmg || 0);
    _logEngagement('escape', frames, dmgTaken);
    const _escCollector = SparState._matchCollector;
    if (_escCollector && _escCollector.escapeEngagements) {
      _escCollector.escapeEngagements.push({
        policy, family, frames, resolved, dmgTaken,
        startCtx: ai._escapeStartCtx || null,
      });
    }
    const startQuality = typeof ai._escapeStartQuality === 'number' ? ai._escapeStartQuality : 0.25;
    const endQuality = typeof ai._escapeBestQuality === 'number' ? ai._escapeBestQuality : startQuality;
    const qualityGain = this._clamp01(0.5 + (endQuality - startQuality));
    const dmgR = this._clamp01(1 - dmgTaken / (SPAR_CONFIG.HP_BASELINE * 0.4));
    const speedR = this._clamp01(1 - frames / 220);
    // Escape: successful neutral reset is the key objective; damage is secondary
    const phaseReward = this._clamp01((resolved ? 1 : 0) * 0.55 + dmgR * 0.20 + speedR * 0.15 + qualityGain * 0.10);
    if (sl) {
      const rf = this._ensureReinforcementProfile(sl);
      if (rf) {
        for (const scopeName of this._getPhaseScopes()) {
          const scope = rf[scopeName];
          if (!scope) continue;
          if (scope.escapePolicy && scope.escapePolicy[policy]) this._updateRewardBucket(scope.escapePolicy[policy], phaseReward);
          if (scope.escapeFamily && scope.escapeFamily[family]) this._updateRewardBucket(scope.escapeFamily[family], phaseReward);
        }
      }
      if (sl.tactical) {
        const eo = sl.tactical.escapeOutcomes;
        if (eo) {
          eo.attempts++;
          if (resolved) eo.resolved++;
          eo.avgDmgTakenDuring = eo.attempts > 1 ? eo.avgDmgTakenDuring * 0.8 + dmgTaken * 0.2 : dmgTaken;
          eo.avgDuration = eo.attempts > 1 ? eo.avgDuration * 0.8 + frames * 0.2 : frames;
        }
        if (sl.tactical.escapeFailStreaks && policy in sl.tactical.escapeFailStreaks) {
          if (!resolved) sl.tactical.escapeFailStreaks[policy] = (sl.tactical.escapeFailStreaks[policy] || 0) + 1;
          else sl.tactical.escapeFailStreaks[policy] = 0;
        }
      }
    }
    ai._lastEscapePolicy = policy;
    ai._lastEscapeFamily = family;
    ai._escapePolicy = null;
    ai._escapeFamily = null;
    ai._escapeFrames = 0;
    ai._escapeLaneShape = null;
    ai._escapeStartDmg = 0;
    ai._escapeStartQuality = 0;
    ai._escapeBestQuality = 0;
    ai._escapeStartCtx = null;
  },

  // v10: Shot timing policy picker — same pattern as _pickGunSidePolicy
  _pickShotTimingPolicy(pm, duelContext) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const rf = this._ensureReinforcementProfile(sl);
    const policies = typeof SPAR_SHOT_TIMING_KEYS !== 'undefined' ? SPAR_SHOT_TIMING_KEYS : ['shootImmediate', 'delayShot', 'baitShot'];
    const familyMap = typeof SPAR_SHOT_TIMING_FAMILY_MAP !== 'undefined' ? SPAR_SHOT_TIMING_FAMILY_MAP : { shootImmediate: 'aggressive', delayShot: 'patient', baitShot: 'patient' };
    const pPolicy = rf && rf.player ? rf.player.shotTimingPolicy : null;
    const gPolicy = rf && rf.general ? rf.general.shotTimingPolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.shotTimingPolicy : null;
    const pFamily = rf && rf.player ? rf.player.shotTimingFamily : null;
    const gFamily = rf && rf.general ? rf.general.shotTimingFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.shotTimingFamily : null;
    const totalPP = this._sumBucketPlays(pPolicy);
    const totalGP = this._sumBucketPlays(gPolicy);
    const totalSP = this._sumBucketPlays(sPolicy);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);

    const baseScores = {};
    for (const p of policies) baseScores[p] = 5;

    // Context-based scoring
    if (duelContext) {
      if (duelContext.dist < 150) baseScores.shootImmediate += 4;        // close range = fire fast
      if (duelContext.hasBottom) baseScores.delayShot += 3;              // advantage = be patient
      if (duelContext.recentHit) baseScores.shootImmediate += 3;         // momentum = keep firing
      if (duelContext.recentTookHit) baseScores.baitShot += 3;           // damaged = bait mistakes
      if (duelContext.laneQuality > 0.6) baseScores.shootImmediate += 2; // good lane = fire
      if (duelContext.laneQuality < 0.4) baseScores.delayShot += 3;     // bad lane = wait
    }

    // Rhythm-based scoring
    if (pm) {
      if (pm.playerShootsFast) {
        baseScores.shootImmediate += 2;  // match aggression
        baseScores.baitShot += 3;        // or bait their impatience
      }
      if (pm.playerShootsEarly) baseScores.delayShot += 3;  // patient vs sprayer
      if (pm.playerRepeeksQuickly) baseScores.baitShot += 3; // bait the re-peek
    }

    return this._pickHierarchicalPolicy({
      keys: policies, familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores,
      familyBiases: {},
      failStreaks: null,
      playerWeight: 24, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.16, generalExplore: 0.08, selfPlayExplore: 0.06,
      noise: 2.5,
    });
  },

  // v10: Finalize shot timing engagement — fires when policy is re-evaluated
  _finalizeShotTimingEngagement(ai, hitsDuring, dmgDealt) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    if (!sl || !ai._shotTimingPolicy) return;
    _logEngagement('shotTiming', ai._shotTimingFrames || 0, dmgDealt);
    const policy = ai._shotTimingPolicy;
    const family = ai._shotTimingFamily;
    const _stCollector = SparState._matchCollector;
    if (_stCollector && _stCollector.shotTimingEngagements) {
      _stCollector.shotTimingEngagements.push({
        policy, family, frames: ai._shotTimingFrames || 0, hits: hitsDuring, dmgDealt,
        startCtx: ai._shotTimingStartCtx || null,
      });
    }
    // Shot timing: landing hits during the window is the objective
    const phaseReward = this._clamp01(
      (hitsDuring > 0 ? 0.65 : 0) * 0.65 +
      this._computeDamageReward(dmgDealt) * 0.35
    );
    const rf = this._ensureReinforcementProfile(sl);
    if (rf) {
      for (const scopeName of this._getPhaseScopes()) {
        const scope = rf[scopeName];
        if (!scope) continue;
        if (scope.shotTimingPolicy && scope.shotTimingPolicy[policy]) this._updateRewardBucket(scope.shotTimingPolicy[policy], phaseReward);
        if (scope.shotTimingFamily && scope.shotTimingFamily[family]) this._updateRewardBucket(scope.shotTimingFamily[family], phaseReward);
      }
    }
    // Track outcomes
    const stFrames = ai._shotTimingFrames || 0;
    if (sl.tactical && sl.tactical.shotTimingOutcomes) {
      const so = sl.tactical.shotTimingOutcomes;
      so.attempts++;
      if (hitsDuring > 0) so.hitsDuring++;
      so.avgDmgDealt = so.attempts > 1 ? so.avgDmgDealt * 0.8 + dmgDealt * 0.2 : dmgDealt;
      so.avgDuration = so.attempts > 1 ? so.avgDuration * 0.8 + stFrames * 0.2 : stFrames;
    }
    ai._lastShotTimingPolicy = policy;
    ai._lastShotTimingFamily = family;
    ai._shotTimingPolicy = null;
    ai._shotTimingFamily = null;
    ai._shotTimingStartCtx = null;
  },

  // v10: Reload behavior policy picker
  _pickReloadBehavior(pm, duelContext) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const rf = this._ensureReinforcementProfile(sl);
    const policies = typeof SPAR_RELOAD_BEHAVIOR_KEYS !== 'undefined' ? SPAR_RELOAD_BEHAVIOR_KEYS : ['hardReloadPunish', 'safeReloadPunish', 'reloadBait'];
    const familyMap = typeof SPAR_RELOAD_BEHAVIOR_FAMILY_MAP !== 'undefined' ? SPAR_RELOAD_BEHAVIOR_FAMILY_MAP : { hardReloadPunish: 'punish', safeReloadPunish: 'punish', reloadBait: 'bait' };
    const pPolicy = rf && rf.player ? rf.player.reloadPolicy : null;
    const gPolicy = rf && rf.general ? rf.general.reloadPolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.reloadPolicy : null;
    const pFamily = rf && rf.player ? rf.player.reloadFamily : null;
    const gFamily = rf && rf.general ? rf.general.reloadFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.reloadFamily : null;
    const totalPP = this._sumBucketPlays(pPolicy);
    const totalGP = this._sumBucketPlays(gPolicy);
    const totalSP = this._sumBucketPlays(sPolicy);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);

    const baseScores = {};
    for (const p of policies) baseScores[p] = 5;

    // Context-based
    if (duelContext) {
      if (duelContext.dist < 200) baseScores.hardReloadPunish += 4;     // close = rush
      if (duelContext.dist > 250) baseScores.safeReloadPunish += 3;     // far = safe poke
      if (duelContext.hasBottom) baseScores.hardReloadPunish += 3;       // advantage = press
      if (duelContext.enemyHasBottom) baseScores.safeReloadPunish += 2;  // disadvantage = careful
    }

    // Rhythm-based
    if (pm) {
      if (pm.playerShootsFast) baseScores.reloadBait += 4;            // fast shooter = bait the reload
      if (pm.playerRetreatsSameSide > 0.6) baseScores.hardReloadPunish += 3; // predictable = chase
      if (pm.playerReEngageDelay > 40) baseScores.hardReloadPunish += 2;     // slow re-engage = free push
      if (pm.playerReEngageDelay < 20) baseScores.safeReloadPunish += 3;     // fast re-engage = be careful
      // reloadBaitPeek: bonus when enemy dodges well or near cover (brief peek to draw panic shot)
      if (pm.playerSidesteps > 0.4) baseScores.reloadBaitPeek = (baseScores.reloadBaitPeek || 5) + 3;
      if (pm.playerHitRate > 0.5) baseScores.reloadBaitPeek = (baseScores.reloadBaitPeek || 5) + 2;
    }

    return this._pickHierarchicalPolicy({
      keys: policies, familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores,
      familyBiases: {},
      failStreaks: null,
      playerWeight: 24, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.16, generalExplore: 0.08, selfPlayExplore: 0.06,
      noise: 2.5,
    });
  },

  // v10: Finalize reload behavior — fires when enemy finishes reloading or bot disengages
  _finalizeReloadBehavior(ai, dmgDealt) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    if (!sl || !ai._reloadPolicy) return;
    _logEngagement('reload', ai._reloadFrames || 0, dmgDealt);
    const policy = ai._reloadPolicy;
    const family = ai._reloadFamily;
    const punished = dmgDealt > 0 ? 1 : 0;
    const _rlCollector = SparState._matchCollector;
    if (_rlCollector && _rlCollector.reloadEngagements) {
      _rlCollector.reloadEngagements.push({
        policy, family, frames: ai._reloadFrames || 0, dmgDealt, punished,
        startCtx: ai._reloadStartCtx || null,
      });
    }
    // Reload punish: actually dealing damage during the window is the objective
    const phaseReward = this._clamp01(punished * 0.55 + this._computeDamageReward(dmgDealt) * 0.45);
    const rf = this._ensureReinforcementProfile(sl);
    if (rf) {
      for (const scopeName of this._getPhaseScopes()) {
        const scope = rf[scopeName];
        if (!scope) continue;
        if (scope.reloadPolicy && scope.reloadPolicy[policy]) this._updateRewardBucket(scope.reloadPolicy[policy], phaseReward);
        if (scope.reloadFamily && scope.reloadFamily[family]) this._updateRewardBucket(scope.reloadFamily[family], phaseReward);
      }
    }
    const rlFrames = ai._reloadFrames || 0;
    if (sl.tactical && sl.tactical.reloadPunishOutcomes) {
      const ro = sl.tactical.reloadPunishOutcomes;
      ro.attempts++;
      if (dmgDealt > 0) ro.punished++;
      ro.avgDmgDealt = ro.attempts > 1 ? ro.avgDmgDealt * 0.8 + dmgDealt * 0.2 : dmgDealt;
      ro.avgDuration = ro.attempts > 1 ? ro.avgDuration * 0.8 + rlFrames * 0.2 : rlFrames;
    }
    ai._lastReloadPolicy = policy;
    ai._lastReloadFamily = family;
    ai._reloadPolicy = null;
    ai._reloadFamily = null;
    ai._reloadStartCtx = null;
  },

  // v11: Mid-fight pressure policy picker
  _pickMidFightPressure(pm, duelContext) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const rf = this._ensureReinforcementProfile(sl);
    const policies = typeof SPAR_MID_PRESSURE_KEYS !== 'undefined' ? SPAR_MID_PRESSURE_KEYS : ['pressureHard', 'pressureSoft', 'holdLane'];
    const familyMap = typeof SPAR_MID_PRESSURE_FAMILY_MAP !== 'undefined' ? SPAR_MID_PRESSURE_FAMILY_MAP : { pressureHard: 'press', pressureSoft: 'press', holdLane: 'hold' };
    const pPolicy = rf && rf.player ? rf.player.midPressurePolicy : null;
    const gPolicy = rf && rf.general ? rf.general.midPressurePolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.midPressurePolicy : null;
    const pFamily = rf && rf.player ? rf.player.midPressureFamily : null;
    const gFamily = rf && rf.general ? rf.general.midPressureFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.midPressureFamily : null;
    const totalPP = this._sumBucketPlays(pPolicy);
    const totalGP = this._sumBucketPlays(gPolicy);
    const totalSP = this._sumBucketPlays(sPolicy);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);

    const baseScores = {};
    for (const p of policies) baseScores[p] = 5;

    // Context-based
    if (duelContext) {
      if (duelContext.hasBottom) { baseScores.pressureHard += 4; baseScores.holdLane += 2; }
      if (duelContext.enemyHasBottom) { baseScores.pressureSoft += 3; baseScores.holdLane += 3; }
      if (duelContext.recentHit) baseScores.pressureHard += 4;   // momentum
      if (duelContext.recentTookHit) baseScores.holdLane += 3;    // stabilize
      if (duelContext.dist < 180) baseScores.pressureHard += 2;
      if (duelContext.dist > 280) baseScores.holdLane += 3;
      if (duelContext.laneQuality > 0.6) baseScores.pressureHard += 2;
      if (duelContext.laneQuality < 0.4) baseScores.holdLane += 3;
      if (duelContext.enemyNearWall) baseScores.pressureHard += 3;
    }

    // Rhythm-based
    if (pm) {
      if (pm.playerShootsFast) baseScores.pressureSoft += 2;       // don't rush a fast shooter
      if (pm.playerRetreatsSameSide > 0.6) baseScores.pressureHard += 3; // predictable = pressure
      if (pm.playerReEngageDelay > 40) baseScores.pressureHard += 2;     // slow re-engage = push
      if (pm.playerRepeeksQuickly) baseScores.holdLane += 3;            // they'll come to you
    }

    return this._pickHierarchicalPolicy({
      keys: policies, familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores,
      familyBiases: {},
      failStreaks: null,
      playerWeight: 24, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.16, generalExplore: 0.08, selfPlayExplore: 0.06,
      noise: 2.5,
    });
  },

  // v11: Finalize mid-fight pressure engagement
  _finalizeMidFightPressure(ai, dmgDealt) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    if (!sl || !ai._midPressurePolicy) return;
    _logEngagement('midPressure', ai._midPressureFrames || 0, dmgDealt);
    const policy = ai._midPressurePolicy;
    const family = ai._midPressureFamily;
    const converted = dmgDealt > 0 ? 1 : 0;
    const _mpCollector = SparState._matchCollector;
    if (_mpCollector && _mpCollector.midPressureEngagements) {
      _mpCollector.midPressureEngagements.push({
        policy, family, frames: ai._midPressureFrames || 0, dmgDealt, converted,
        startCtx: ai._midPressureStartCtx || null,
      });
    }
    // Mid-pressure: dealing damage is the objective, but actually converting matters more
    const phaseReward = this._clamp01(converted * 0.45 + this._computeDamageReward(dmgDealt) * 0.55);
    const rf = this._ensureReinforcementProfile(sl);
    if (rf) {
      for (const scopeName of this._getPhaseScopes()) {
        const scope = rf[scopeName];
        if (!scope) continue;
        if (scope.midPressurePolicy && scope.midPressurePolicy[policy]) this._updateRewardBucket(scope.midPressurePolicy[policy], phaseReward);
        if (scope.midPressureFamily && scope.midPressureFamily[family]) this._updateRewardBucket(scope.midPressureFamily[family], phaseReward);
      }
    }
    if (sl.tactical && sl.tactical.midPressureOutcomes) {
      const mo = sl.tactical.midPressureOutcomes;
      mo.attempts++;
      if (dmgDealt > 0) mo.dmgDealtDuring++;
      mo.avgDmgDealt = mo.attempts > 1 ? mo.avgDmgDealt * 0.8 + dmgDealt * 0.2 : dmgDealt;
      mo.avgDuration = mo.attempts > 1 ? mo.avgDuration * 0.8 + (ai._midPressureFrames || 0) * 0.2 : (ai._midPressureFrames || 0);
    }
    ai._midPressurePolicy = null;
    ai._midPressureFamily = null;
    ai._midPressureFrames = 0;
    ai._midPressureStartCtx = null;
  },

  // v11: Wall pressure policy picker
  _pickWallPressure(pm, duelContext) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const rf = this._ensureReinforcementProfile(sl);
    const policies = typeof SPAR_WALL_PRESSURE_KEYS !== 'undefined' ? SPAR_WALL_PRESSURE_KEYS : ['wallPinHold', 'pressureWiden', 'prefireCorner'];
    const familyMap = typeof SPAR_WALL_PRESSURE_FAMILY_MAP !== 'undefined' ? SPAR_WALL_PRESSURE_FAMILY_MAP : { wallPinHold: 'pin', pressureWiden: 'widen', prefireCorner: 'widen' };
    const pPolicy = rf && rf.player ? rf.player.wallPressurePolicy : null;
    const gPolicy = rf && rf.general ? rf.general.wallPressurePolicy : null;
    const sPolicy = rf && rf.selfPlay ? rf.selfPlay.wallPressurePolicy : null;
    const pFamily = rf && rf.player ? rf.player.wallPressureFamily : null;
    const gFamily = rf && rf.general ? rf.general.wallPressureFamily : null;
    const sFamily = rf && rf.selfPlay ? rf.selfPlay.wallPressureFamily : null;
    const totalPP = this._sumBucketPlays(pPolicy);
    const totalGP = this._sumBucketPlays(gPolicy);
    const totalSP = this._sumBucketPlays(sPolicy);
    const totalPF = this._sumBucketPlays(pFamily);
    const totalGF = this._sumBucketPlays(gFamily);
    const totalSF = this._sumBucketPlays(sFamily);

    const baseScores = {};
    for (const p of policies) baseScores[p] = 5;

    // Context-based
    if (duelContext) {
      if (duelContext.enemyInCorner) baseScores.wallPinHold += 5;
      if (duelContext.enemyNearWall && !duelContext.enemyInCorner) baseScores.pressureWiden += 4;
      if (duelContext.dist < 200) baseScores.prefireCorner += 3;
      if (duelContext.hasBottom) { baseScores.wallPinHold += 3; baseScores.pressureWiden += 2; }
      if (duelContext.laneQuality > 0.6) baseScores.wallPinHold += 2;
    }

    // Rhythm-based
    if (pm) {
      if (pm.playerRetreatsSameSide > 0.6) baseScores.wallPinHold += 3;
      if (pm.playerCrossesAfterBottomLoss > 0.5) baseScores.pressureWiden += 3;
      if (pm.playerShootsFast) baseScores.prefireCorner += 2;
    }

    return this._pickHierarchicalPolicy({
      keys: policies, familyMap,
      pPolicy, gPolicy, sPolicy, pFamily, gFamily, sFamily,
      totalPP, totalGP, totalSP, totalPF, totalGF, totalSF,
      baseScores,
      familyBiases: {},
      failStreaks: null,
      playerWeight: 24, generalWeight: 12, selfPlayWeight: 8,
      playerExplore: 0.16, generalExplore: 0.08, selfPlayExplore: 0.06,
      noise: 2.5,
    });
  },

  // v11: Finalize wall pressure engagement
  _finalizeWallPressure(ai, dmgDealt) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    if (!sl || !ai._wallPressurePolicy) return;
    _logEngagement('wallPressure', ai._wallPressureFrames || 0, dmgDealt);
    const policy = ai._wallPressurePolicy;
    const family = ai._wallPressureFamily;
    const pinned = dmgDealt > 10 ? 1 : 0;
    const _wpCollector = SparState._matchCollector;
    if (_wpCollector && _wpCollector.wallPressureEngagements) {
      _wpCollector.wallPressureEngagements.push({
        policy, family, frames: ai._wallPressureFrames || 0, dmgDealt, pinned,
        startCtx: ai._wallPressureStartCtx || null,
      });
    }
    // Wall pressure: pinning + dealing damage are the objectives
    const phaseReward = this._clamp01(pinned * 0.40 + this._computeDamageReward(dmgDealt) * 0.60);
    const rf = this._ensureReinforcementProfile(sl);
    if (rf) {
      for (const scopeName of this._getPhaseScopes()) {
        const scope = rf[scopeName];
        if (!scope) continue;
        if (scope.wallPressurePolicy && scope.wallPressurePolicy[policy]) this._updateRewardBucket(scope.wallPressurePolicy[policy], phaseReward);
        if (scope.wallPressureFamily && scope.wallPressureFamily[family]) this._updateRewardBucket(scope.wallPressureFamily[family], phaseReward);
      }
    }
    if (sl.tactical && sl.tactical.wallPressureOutcomes) {
      const wo = sl.tactical.wallPressureOutcomes;
      wo.attempts++;
      if (dmgDealt > 10) wo.pinned++;
      wo.avgDmgDealt = wo.attempts > 1 ? wo.avgDmgDealt * 0.8 + dmgDealt * 0.2 : dmgDealt;
      wo.avgDuration = wo.attempts > 1 ? wo.avgDuration * 0.8 + (ai._wallPressureFrames || 0) * 0.2 : (ai._wallPressureFrames || 0);
    }
    ai._wallPressurePolicy = null;
    ai._wallPressureFamily = null;
    ai._wallPressureFrames = 0;
    ai._wallPressureStartCtx = null;
  },

  // Phase reward: fires when an anti-bottom engagement ends
  _finalizeAntiBottomEngagement(ai, regainedBottom, collector) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const tactic = ai._antiBottomTactic;
    const family = ai._antiBottomFamily;
    const frames = ai._antiBottomFrames;
    const dmgTaken = (ai._matchDmgTaken || 0) - (ai._antiBottomDmgAtStart || 0);
    _logEngagement('antiBottom', frames || 0, dmgTaken);

    // Record engagement in collector with full context
    if (collector && collector.antiBottomEngagements) {
      collector.antiBottomEngagements.push({
        tactic, family, frames, regained: regainedBottom, dmgTaken,
        phaseReached: ai._antiBottomPhase || 0,
        bodyBlocks: ai._antiBottomStallCount || 0,
        dirFlips: ai._abDirFlips || 0,
        maxClearance: Math.round(ai._abMaxClearance || 0),
        startCtx: ai._abStartCtx || null,
        endReason: regainedBottom ? 'success'
          : (ai._antiBottomStallCount >= 3) ? 'stallAbandon'
          : (frames >= 120) ? 'timeout' : 'stateChange',
      });
    }

    // Anti-bottom: regaining bottom is the key objective (50%)
    const hpBase = SPAR_CONFIG.HP_BASELINE || 100;
    const regainR = regainedBottom ? 1 : 0;
    const dmgR = Math.max(0, Math.min(1, 1 - dmgTaken / (hpBase * 0.5)));
    const speedR = Math.max(0, Math.min(1, 1 - frames / 120));
    const phaseReward = regainR * 0.50 + dmgR * 0.28 + speedR * 0.22;

    // Update reinforcement buckets — respect training/self-play data separation
    if (sl) {
      const rf = this._ensureReinforcementProfile(sl);
      const phaseScopes = this._getPhaseScopes();
      if (rf) {
        for (const scopeName of phaseScopes) {
          const scope = rf[scopeName];
          if (!scope) continue;
          if (scope.antiBottomTactic && scope.antiBottomTactic[tactic]) {
            this._updateRewardBucket(scope.antiBottomTactic[tactic], phaseReward);
          }
          if (scope.antiBottomFamily && scope.antiBottomFamily[family]) {
            this._updateRewardBucket(scope.antiBottomFamily[family], phaseReward);
          }
        }
      }

      // Update fail streaks
      if (sl.tactical && sl.tactical.tacticFailStreaks) {
        if (!regainedBottom) {
          sl.tactical.tacticFailStreaks[tactic] = (sl.tactical.tacticFailStreaks[tactic] || 0) + 1;
        } else {
          sl.tactical.tacticFailStreaks[tactic] = 0;
        }
      }

      // Update outcome stats
      if (sl.tactical && sl.tactical.antiBottomOutcomes) {
        const ao = sl.tactical.antiBottomOutcomes;
        ao.attempts++;
        if (regainedBottom) ao.regainedBottom++;
        ao.avgDmgTakenDuring = ao.attempts > 1
          ? ao.avgDmgTakenDuring * 0.8 + dmgTaken * 0.2
          : dmgTaken;
        ao.avgDuration = ao.attempts > 1
          ? ao.avgDuration * 0.8 + frames * 0.2
          : frames;
      }
    }

    // Reset engagement state
    ai._antiBottomTactic = null;
    ai._antiBottomFamily = null;
    ai._antiBottomFrames = 0;
    ai._antiBottomPhase = 0;
    ai._antiBottomPhaseFrames = 0;
    ai._antiBottomHysteresisFrames = 0;
    ai._antiBottomResponse = null;
    ai._lastAntiBottomTactic = tactic;
    ai._lastAntiBottomFamily = family;
  },

  joinRoom(roomId) {
    // CT-X must be equipped to enter spar
    if (!playerEquip.gun || playerEquip.gun.id !== 'ct_x') {
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: player.x, y: player.y - 40, life: 50, maxLife: 50, type: "heal", dmg: "Equip CT-X to spar!" });
      }
      return;
    }
    const room = SPAR_ROOMS.find(r => r.id === roomId);
    if (!room) return;
    SparState.activeRoom = room;

    // 1. Snapshot loadout
    SparState._savedSnapshot = {
      gunDamage: gun.damage,
      gunFireRate: gun.fireRate,
      gunMagSize: gun.magSize,
      gunAmmo: gun.ammo,
      gunReloading: gun.reloading,
      gunReloadTimer: gun.reloadTimer,
      gunSpecial: gun.special,
      gunFreezePenalty: gun.freezePenalty,
      gunFreezeDuration: gun.freezeDuration,
      gunSpread: gun.spread,
      meleeDamage: melee.damage,
      meleeRange: melee.range,
      meleeSpeed: melee.speed,
      meleeSpecial: melee.special,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      activeSlot: activeSlot,
      lives: lives,
      playerDead: playerDead,
      playerEquipGun: playerEquip.gun ? JSON.parse(JSON.stringify(playerEquip.gun)) : null,
      playerEquipBoots: playerEquip.boots ? JSON.parse(JSON.stringify(playerEquip.boots)) : null,
      playerEquipPants: playerEquip.pants ? JSON.parse(JSON.stringify(playerEquip.pants)) : null,
      playerEquipChest: playerEquip.chest ? JSON.parse(JSON.stringify(playerEquip.chest)) : null,
      playerEquipHelmet: playerEquip.helmet ? JSON.parse(JSON.stringify(playerEquip.helmet)) : null,
    };

    // 2. Apply CT-X spar loadout
    // Read player's current CT-X slider values, clamp total to 100
    let pFreeze = typeof _ctxFreeze !== 'undefined' ? _ctxFreeze : 50;
    let pRof = typeof _ctxRof !== 'undefined' ? _ctxRof : 50;
    let pSpread = typeof _ctxSpread !== 'undefined' ? _ctxSpread : 0;
    const total = pFreeze + pRof + pSpread;
    if (total > SPAR_CONFIG.POINT_BUDGET) {
      const scale = SPAR_CONFIG.POINT_BUDGET / total;
      pFreeze = Math.floor(pFreeze * scale);
      pRof = Math.floor(pRof * scale);
      pSpread = SPAR_CONFIG.POINT_BUDGET - pFreeze - pRof;
    }
    const playerGun = this._buildCtxGun(pFreeze, pRof, pSpread);

    // Apply to player's gun state
    gun.damage = playerGun.damage;
    gun.fireRate = playerGun.fireRate;
    gun.magSize = playerGun.magSize;
    gun.freezePenalty = playerGun.freezePenalty;
    gun.freezeDuration = playerGun.freezeDuration;
    gun.spread = playerGun.spread;
    gun.ammo = playerGun.magSize;
    gun.reloading = false;
    gun.reloadTimer = 0;
    playerEquip.gun = { ...CT_X_GUN, ...playerGun };

    player.hp = SPAR_CONFIG.HP_BASELINE;
    player.maxHp = SPAR_CONFIG.HP_BASELINE;
    activeSlot = 0;
    lives = 1;
    playerDead = false;

    // Zero out melee/armor effects during spar
    melee.damage = 0;
    melee.range = 0;

    // 3. Create spar bots
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;

    const arenaLevel = LEVELS[room.arenaLevel];
    if (!arenaLevel) return;
    const spawns = arenaLevel.spawns;

    // Player on teamA (or a bot in fullBvB mode)
    const isFullBvB = typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot();
    if (isFullBvB) {
      const spawnPtA = spawns.teamA || spawns.p1;
      const memberA = this._createBot('selfplay_a_0', spawnPtA.tx, spawnPtA.ty, 'teamA');
      SparState._sparBots.push(memberA);
      SparState.teamA.push({
        id: memberA.id,
        entity: memberA.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: memberA,
      });
    } else {
      SparState.teamA.push({
        id: 'player',
        entity: player,
        isLocal: true,
        isBot: false,
        alive: true,
        member: null, // player uses globals (gun, melee, playerEquip)
      });
    }

    // Ally bots (teamA, teamSize - 1)
    for (let i = 1; i < room.teamSize; i++) {
      const spawnKey = 'teamA' + (i > 0 ? (i + 1) : '');
      const spawnPt = spawns[spawnKey] || spawns.teamA;
      const member = this._createBot('ally_' + i, spawnPt.tx, spawnPt.ty, 'teamA');
      SparState._sparBots.push(member);
      SparState.teamA.push({
        id: member.id,
        entity: member.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: member,
      });
    }

    // Enemy bots (teamB, full teamSize)
    for (let i = 0; i < room.teamSize; i++) {
      const spawnKey = i === 0 ? 'teamB' : ('teamB' + (i + 1));
      const spawnPt = spawns[spawnKey] || spawns.teamB;
      const member = this._createBot('enemy_' + i, spawnPt.tx, spawnPt.ty, 'teamB');
      SparState._sparBots.push(member);
      SparState.teamB.push({
        id: member.id,
        entity: member.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: member,
      });
    }

    // 4. Enter arena level
    enterLevel(room.arenaLevel, spawns.p1.tx, spawns.p1.ty);

    // Position bots at their spawn points (after enterLevel resets)
    for (const member of SparState._sparBots) {
      member.entity.x = member._spawnTX * TILE + TILE / 2;
      member.entity.y = member._spawnTY * TILE + TILE / 2;
    }

    // FullBvB: park real player offscreen so it doesn't interfere
    if (isFullBvB) {
      player.x = -9999; player.y = -9999;
      player.vx = 0; player.vy = 0;
      player.hp = player.maxHp; // keep alive to avoid death screen
    }

    // 5. Start countdown
    SparState._botOpeningRoute = null;
    const trainTiming = typeof _getSparTrainingTiming === 'function' ? _getSparTrainingTiming() : null;
    SparState.phase = 'countdown';
    SparState.countdown = trainTiming ? trainTiming.countdownFrames : SPAR_CONFIG.COUNTDOWN_FRAMES;
    SparState.matchTimer = 0;
    SparState.lastResult = null;
    SparState.postMatchTimer = 0;
  },

  // Create a spar bot as a full member object (mirrors createPartyMember pattern)
  _createBot(nameId, spawnTX, spawnTY, team) {
    const id = 'spar_bot_' + SparState._nextBotId++;

    // CT-X allocation: fixed build for 1v1 enemy bots, random meta for others
    const room = SparState.activeRoom;
    const is1v1Enemy = team === 'teamB' && room && room.teamSize === 1;
    // FullBvB teamA: use training variant's CT-X allocation if available
    const isFullBvBTeamA = team === 'teamA' && typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot();
    const trainAlloc = isFullBvBTeamA && typeof _sparTrainState !== 'undefined' && _sparTrainState && _sparTrainState._selfPlayCtxAlloc
      ? _sparTrainState._selfPlayCtxAlloc : null;
    const alloc = trainAlloc || (is1v1Enemy ? { freeze: 50, rof: 50, spread: 0 } : this._randomBotAlloc());
    const botGun = this._buildCtxGun(alloc.freeze, alloc.rof, alloc.spread);

    // Entity — same structure as party bot entities
    const entity = {
      x: spawnTX * TILE + TILE / 2,
      y: spawnTY * TILE + TILE / 2,
      vx: 0, vy: 0,
      knockVx: 0, knockVy: 0,
      speed: SPAR_CONFIG.BOT_SPEED,
      baseSpeed: SPAR_CONFIG.BOT_SPEED,
      hp: SPAR_CONFIG.HP_BASELINE,
      maxHp: SPAR_CONFIG.HP_BASELINE,
      dir: team === 'teamA' ? 0 : 2,
      frame: 0, animTimer: 0, moving: false,
      name: nameId.startsWith('ally') ? 'Ally Bot' : 'Spar Bot',
      radius: typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG.PLAYER_RADIUS : 14,
      _isBot: true,
      _isSparBot: true,
      _sparTeam: team,
      _gunSide: 'left',
      _contactCD: 0,
      // Cosmetics
      skin: team === 'teamA' ? '#4488cc' : '#cc4444',
      hair: '#333',
      shirt: team === 'teamA' ? '#2266aa' : '#aa2222',
      pants: '#222',
      shoes: '#111',
      hat: null,
    };

    // Full member object (same pattern as partySystem.createPartyMember)
    const member = {
      id: id,
      controlType: 'bot',
      entity: entity,
      _sparTeam: team,
      _spawnTX: spawnTX,
      _spawnTY: spawnTY,
      // Independent gun state (same structure as party member.gun)
      gun: botGun,
      // Melee zeroed (spar = gun only)
      melee: { damage: 0, range: 0, cooldown: 0, cooldownMax: 0, critChance: 0, special: null },
      // Equipment
      equip: { armor: null, boots: null, pants: null, chest: null, helmet: null, gun: botGun, melee: null },
      dead: false,
      deathTimer: 0,
      active: true,
      // AI state (same pattern as party bot ai)
      ai: {
        state: 'engage',
        target: null,
        targetAge: 0,
        shootCD: 0,              // fire cooldown (frames), same as BotAI
        _freezeTimer: 0,         // post-shot freeze (same as player freezeTimer)
        _freezePenalty: 0,       // speed penalty during freeze (same as player)
        // Spar-specific tactical state
        aggression: 0.3 + Math.random() * 0.7,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: Math.floor(40 + Math.random() * 60),
        targetId: null,
        targetTimer: 0,
        laneY: null,
        laneShiftTimer: 0,
        jukeTimer: 0,            // cooldown for juke direction flips
        // Smooth movement
        smoothVx: 0,
        smoothVy: 0,
        // Baiting
        baitTimer: 0,            // >0 = currently faking
        baitDirX: 0,             // fake direction
        baitDirY: 0,
        baitCooldown: 120 + Math.floor(Math.random() * 120),
        // Phase 1a: circumstance tracking
        _lastHitFrame: 0,
        _lastTookHitFrame: 0,
        _lastEnemyShotFrame: 0,   // frame when player last fired at this bot (hit or miss)
        _prevEnemyShotFrame: 0,   // frame of the shot BEFORE _lastEnemyShotFrame (for gap calc)
        _lastEnemyWhiffFrame: 0,  // frame when player last missed this bot
        _losBlockedFrames: 0,
        _chaseFrames: 0,
        _retreatFrames: 0,
        _shotMode: 'immediate',
        _styleSwitchEvaluated: false,
        _matchDmgDealt: 0,
        _matchDmgTaken: 0,
        _antiBottomResponse: null,    // legacy — kept for match-end reinforcement compat
        _antiBottomTactic: null,      // v8 tactic key
        _antiBottomFamily: null,      // v8 family key
        _antiBottomFrames: 0,
        _antiBottomPhase: 0,          // sub-phase within tactic (0,1,2)
        _antiBottomPhaseFrames: 0,
        _antiBottomOffsetDir: 0,      // chosen side: -1 or 1
        _antiBottomDmgAtStart: 0,     // bot dmgTaken when engagement started
        _antiBottomStartFrame: 0,
        _antiBottomHysteresisFrames: 0, // hysteresis counter for engagement start/end
        _antiBottomCooldown: 0,       // frames until anti-bottom can re-open after finalize
        _openingLostBottomDir: null,  // direction player came from when taking bottom
        _lastAntiBottomTactic: null,
        _lastAntiBottomFamily: null,
        _gunSidePolicy: null,
        _gunSideFamily: null,
        _gunSideFrames: 0,
        _gunSideStartDmg: 0,
        _gunSideStartQuality: 0,
        _gunSideBestQuality: 0,
        _gunSideLaneShape: null,
        _gunSideCooldown: 0,          // frames until gun-side can re-open after finalize
        _lastGunSidePolicy: null,
        _lastGunSideFamily: null,
        _escapePolicy: null,
        _escapeFamily: null,
        _escapeFrames: 0,
        _escapeStartDmg: 0,
        _escapeStartQuality: 0,
        _escapeBestQuality: 0,
        _escapeLaneShape: null,
        _escapeCooldown: 0,            // frames until escape can re-open
        _lastEscapePolicy: null,
        _lastEscapeFamily: null,
        // v10: shot timing policy state
        _shotTimingPolicy: null,
        _shotTimingFamily: null,
        _shotTimingStartDmg: 0,
        _shotTimingFrames: 0,
        _lastShotTimingPolicy: null,
        _lastShotTimingFamily: null,
        // v10: reload behavior policy state
        _reloadPolicy: null,
        _reloadFamily: null,
        _reloadStartDmg: 0,
        _reloadFrames: 0,
        _lastReloadPolicy: null,
        _lastReloadFamily: null,
        // v11: mid-fight pressure policy state
        _midPressurePolicy: null,
        _midPressureFamily: null,
        _midPressureFrames: 0,
        _midPressureStartDmg: 0,
        _lastMidPressurePolicy: null,
        _lastMidPressureFamily: null,
        _midPressureCooldown: 0,       // frames until mid-pressure can re-open
        // v11: wall pressure policy state
        _wallPressurePolicy: null,
        _wallPressureFamily: null,
        _wallPressureFrames: 0,
        _wallPressureStartDmg: 0,
        _lastWallPressurePolicy: null,
        _lastWallPressureFamily: null,
        _wallPressureCooldown: 0,      // frames until wall-pressure can re-open
        _cornerFrames: 0,         // consecutive frames stuck in a corner
        _topStuckFrames: 0,       // consecutive frames in top half without bottom
        _idleFrames: 0,           // consecutive frames with near-zero movement (idle guard)
        _lowMotionFrames: 0,     // anti-passivity: frames with tiny movement in neutral
        _momentumBreakFrames: 0, // frames remaining in forced break direction after idle/low-motion guard
        _momentumBreakDirX: 0,   // forced X direction during momentum break
        _momentumBreakDirY: 0,   // forced Y direction during momentum break
        // vNext: opening contest policy state
        _openingContestPolicy: null,
        _openingContestFamily: null,
        _openingContestStartDmg: 0,
        _lastOpeningContestPolicy: null,
        _lastOpeningContestFamily: null,
        // vNext: punish window policy state
        _punishWindowPolicy: null,
        _punishWindowFamily: null,
        _punishWindowFrames: 0,
        _punishWindowStartDmgDealt: 0,
        _punishWindowStartDmgTaken: 0,
        _punishWindowTrigger: null,   // 'reload'|'whiff'|'repeek'|'lane'
        _punishWindowCooldown: 0,
        _lastPunishWindowPolicy: null,
        _lastPunishWindowFamily: null,
        // Anti-passivity: stop-start pause cap
        _pauseMaxFrames: 0,
      },
    };

    // Phase 2: Assign duel style for 1v1 enemy bots
    if (is1v1Enemy && typeof SPAR_DUEL_STYLES !== 'undefined') {
      const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
      let style = 'pressure'; // default

      if (sl && sl.general1v1 && sl.general1v1.styleResults) {
        const rf = this._ensureReinforcementProfile(sl);
        const pStyleBuckets = rf && rf.player ? rf.player.style : null;
        const gStyleBuckets = rf && rf.general ? rf.general.style : null;
        const sStyleBuckets = rf && rf.selfPlay ? rf.selfPlay.style : null;
        const totalPlayerStylePlays = this._sumBucketPlays(pStyleBuckets);
        const totalGeneralStylePlays = this._sumBucketPlays(gStyleBuckets);
        const totalSelfPlayStylePlays = this._sumBucketPlays(sStyleBuckets);
        // Pick style with best win rate, 10% exploration
        if (Math.random() < 0.1) {
          const styleNames = Object.keys(SPAR_DUEL_STYLES);
          style = styleNames[Math.floor(Math.random() * styleNames.length)];
        } else {
          let bestScore = -Infinity;
          const hasPersonal = sl.player1v1 && sl.player1v1.styleResults;
          let personalSamples = 0;
          if (hasPersonal) {
            for (const name of Object.keys(SPAR_DUEL_STYLES)) {
              personalSamples += (sl.player1v1.styleResults[name] && sl.player1v1.styleResults[name].total) || 0;
            }
          }
          for (const [name, _] of Object.entries(SPAR_DUEL_STYLES)) {
            const sr = sl.general1v1.styleResults[name];
            const jr = hasPersonal ? sl.player1v1.styleResults[name] : null;
            const kr = sl.selfPlay1v1 && sl.selfPlay1v1.styleResults ? sl.selfPlay1v1.styleResults[name] : null;
            // Only force untested styles when we have no personal read yet.
            if (personalSamples < 1 && (!sr || sr.total < 1) && (!jr || jr.total < 1) && (!kr || kr.total < 1)) {
              style = name; break;
            }
            let score;
            if (jr && jr.total >= 3) {
              // Player1v1 has enough data — use it as PRIMARY
              score = jr.wins / jr.total;
              // General1v1 as small tiebreaker
              if (sr && sr.total > 0) {
                score += (sr.wins / sr.total - 0.5) * 0.15;
              }
              if (kr && kr.total > 0) {
                score += (kr.wins / kr.total - 0.5) * 0.10;
              }
            } else if (jr && jr.total > 0) {
              // Some personal data — blend 60/40 personal/general
              const pScore = jr.wins / jr.total;
              const gScore = sr && sr.total > 0 ? sr.wins / sr.total : 0.5;
              const kScore = kr && kr.total > 0 ? kr.wins / kr.total : gScore;
              score = pScore * 0.6 + gScore * 0.25 + kScore * 0.15;
            } else {
              // No personal data — blend general and self-play
              const gScore = sr && sr.total > 0 ? sr.wins / sr.total : 0.5;
              const kScore = kr && kr.total > 0 ? kr.wins / kr.total : gScore;
              score = gScore * 0.65 + kScore * 0.35;
            }
            const playerRewardScore = this._scoreRewardBucket(
              pStyleBuckets && pStyleBuckets[name],
              totalPlayerStylePlays,
              0.18
            );
            const generalRewardScore = this._scoreRewardBucket(
              gStyleBuckets && gStyleBuckets[name],
              totalGeneralStylePlays,
              0.1
            );
            const selfPlayRewardScore = this._scoreRewardBucket(
              sStyleBuckets && sStyleBuckets[name],
              totalSelfPlayStylePlays,
              0.08
            );
            if (jr && jr.total >= 3) {
              score = score * 0.68 + playerRewardScore * 0.20 + generalRewardScore * 0.06 + selfPlayRewardScore * 0.06;
            } else if (jr && jr.total > 0) {
              score = score * 0.68 + playerRewardScore * 0.14 + generalRewardScore * 0.10 + selfPlayRewardScore * 0.08;
            } else {
              score = score * 0.68 + generalRewardScore * 0.20 + selfPlayRewardScore * 0.12;
            }
            if (score > bestScore) { bestScore = score; style = name; }
          }
        }
      }

      member.ai._duelStyle = style;
    }

    return member;
  },

  tick() {
    if (SparState.phase === 'idle' || SparState.phase === 'hub') return;

    if (SparState.phase === 'countdown') {
      SparState.countdown--;
      for (const m of SparState._sparBots) {
        m.entity.vx = 0; m.entity.vy = 0; m.entity.moving = false;
      }
      if (SparState.countdown <= 0) {
        SparState.phase = 'fighting';
        SparState.matchTimer = 0;
        _resetEngagementLog();
        // FullBvB: pre-initialize collector stub so reinforcement learning still runs
        if (typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot()) {
          SparState._matchCollector = {
            samples: 10,
            // Fields accessed by _tickOneBot — must exist on stub to prevent crashes
            botYAtOpeningEnd: -1,
            playerYAtOpeningEnd: -1,
            trapZoneFrames: { center: 0, near: 0, wide: 0 },
            trapZoneHits:   { center: 0, near: 0, wide: 0 },
          };
        }
      }
      return;
    }

    if (SparState.phase === 'fighting') {
      SparState.matchTimer++;
      this._collectPlayerData();
      this._tickSparBots();
      this._bodyBlockSpar();

      // Check alive counts
      const aAlive = SparState.teamA.filter(p => p.alive).length;
      const bAlive = SparState.teamB.filter(p => p.alive).length;

      // Hard timeout — training uses a short watchdog, real matches use full duration
      const isTraining = typeof _isSparTraining === 'function' && _isSparTraining();
      const MAX_MATCH_FRAMES = isTraining ? 1200 : 3600; // training: 20s, real: 60s
      const matchTimedOut = aAlive > 0 && bAlive > 0 && SparState.matchTimer >= MAX_MATCH_FRAMES;
      if (matchTimedOut) {
        // Force resolve by remaining HP, then damage dealt as tiebreak
        const aHP = SparState.teamA.reduce((sum, p) => sum + (p.alive ? (p.entity.hp || 0) : 0), 0);
        const bHP = SparState.teamB.reduce((sum, p) => sum + (p.alive ? (p.entity.hp || 0) : 0), 0);
        if (aHP !== bHP) {
          SparState.lastResult = aHP > bHP ? 'teamA' : 'teamB';
        } else {
          // HP tied — compare total damage dealt
          const aDmg = SparState.teamB.reduce((sum, p) => sum + ((p.entity.maxHp || SPAR_CONFIG.HP_BASELINE) - (p.alive ? (p.entity.hp || 0) : 0)), 0);
          const bDmg = SparState.teamA.reduce((sum, p) => sum + ((p.entity.maxHp || SPAR_CONFIG.HP_BASELINE) - (p.alive ? (p.entity.hp || 0) : 0)), 0);
          SparState.lastResult = aDmg >= bDmg ? 'teamA' : 'teamB';
        }
        if (!isTraining) {
          console.log(`[Spar] Match timeout at ${MAX_MATCH_FRAMES}f — resolved by HP (A:${aHP} B:${bHP})`);
        }
      }

      if (matchTimedOut || aAlive <= 0 || bAlive <= 0) {
        if (!matchTimedOut) SparState.lastResult = aAlive > 0 ? 'teamA' : 'teamB';
        // (timeout result already set above from HP comparison — don't overwrite)
        SparState.phase = 'post_match';
        // Auto-print engagement telemetry (skip during bulk training for cleaner logs)
        if (SparState._engagementLog && !(typeof _isSparTraining === 'function' && _isSparTraining())) {
          sparEngagementReport();
        }
        const trainTiming = typeof _getSparTrainingTiming === 'function' ? _getSparTrainingTiming() : null;
        SparState.postMatchTimer = trainTiming ? trainTiming.postMatchFrames : SPAR_CONFIG.POST_MATCH_FRAMES;

        // Record results
        const won = SparState.lastResult === 'teamA';

        // Skip progression/stats/save during automated training
        if (!isTraining) {
          const modeKey = SparState.activeRoom.teamSize + 'v' + SparState.activeRoom.teamSize;
          sparProgress.totals[won ? 'wins' : 'losses']++;
          if (sparProgress.byMode[modeKey]) {
            sparProgress.byMode[modeKey][won ? 'wins' : 'losses']++;
          }
          if (won) spars++;

          // Streak tracking
          if (SparState.activeRoom.streakMode) {
            const sk = sparProgress.streak[modeKey];
            if (sk) {
              if (won) {
                SparState.streakCount++;
                sk.current = SparState.streakCount;
                if (sk.current > sk.best) sk.best = sk.current;
              } else {
                SparState.streakCount = 0;
                sk.current = 0;
              }
            }
          }
        }

        // Update learning profile (skips internally during training)
        this._updateLearningProfile(won);

        // Training harness hook — auto-advance to next match
        if (typeof _sparTrainOnMatchEnd === 'function') {
          _sparTrainOnMatchEnd(won);
        }

        // Auto-save (skip during training to avoid persisting training state)
        if (!isTraining && typeof SaveLoad !== 'undefined') SaveLoad.save();
      }
      return;
    }

    if (SparState.phase === 'post_match') {
      SparState.postMatchTimer--;
      if (SparState.postMatchTimer <= 0) {
        if (SparState.activeRoom && SparState.activeRoom.streakMode && SparState.lastResult === 'teamA') {
          this._resetForStreakContinue();
        } else {
          this.exitToHub();
        }
      }
      return;
    }
  },

  _resetForStreakContinue() {
    SparState._matchCollector = null;
    const isFullBvB = typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot();

    // Remove old enemy bots
    const oldEnemies = SparState._sparBots.filter(m => m._sparTeam === 'teamB');
    for (const e of oldEnemies) {
      const idx = SparState._sparBots.indexOf(e);
      if (idx >= 0) SparState._sparBots.splice(idx, 1);
    }
    SparState.teamB.length = 0;

    // FullBvB: also remove and recreate teamA bot
    if (isFullBvB) {
      const oldAllies = SparState._sparBots.filter(m => m._sparTeam === 'teamA');
      for (const a of oldAllies) {
        const idx = SparState._sparBots.indexOf(a);
        if (idx >= 0) SparState._sparBots.splice(idx, 1);
      }
      SparState.teamA.length = 0;
    }

    // Restore player + ally HP and reset to spawn positions
    const room = SparState.activeRoom;
    const arenaLevel = LEVELS[room.arenaLevel];
    const spawns = arenaLevel.spawns;

    if (isFullBvB) {
      // Create fresh teamA bot
      const spawnPtA = spawns.teamA || spawns.p1;
      const memberA = this._createBot('selfplay_a_0', spawnPtA.tx, spawnPtA.ty, 'teamA');
      SparState._sparBots.push(memberA);
      SparState.teamA.push({
        id: memberA.id, entity: memberA.entity,
        isLocal: false, isBot: true, alive: true, member: memberA,
      });
      // Keep player parked offscreen
      player.x = -9999; player.y = -9999;
      player.vx = 0; player.vy = 0;
    } else {
      player.hp = SPAR_CONFIG.HP_BASELINE;
      player.x = spawns.p1.tx * TILE + TILE / 2;
      player.y = spawns.p1.ty * TILE + TILE / 2;
      player.vx = 0; player.vy = 0;
      playerDead = false;
      deathTimer = 0;
      deathGameOver = false;
      gun.ammo = gun.magSize;
      gun.reloading = false;
    }
    for (const p of SparState.teamA) {
      p.alive = true;
      p.entity.hp = SPAR_CONFIG.HP_BASELINE;
      if (p.isBot && p.member) {
        const m = p.member;
        m.entity.x = m._spawnTX * TILE + TILE / 2;
        m.entity.y = m._spawnTY * TILE + TILE / 2;
        m.entity.vx = 0; m.entity.vy = 0;
        m.gun.ammo = m.gun.magSize;
        m.gun.reloading = false;
        m.gun.fireCooldown = 0;
        m.ai.shootCD = 0;
        m.dead = false;
        // Reset per-match AI state for ally bots
        m.ai._matchDmgDealt = 0;
        m.ai._matchDmgTaken = 0;
        m.ai._openingRoute = null;
        m.ai._duelStyle = null;
        m.ai._antiBottomTactic = null;
        m.ai._antiBottomFamily = null;
        m.ai._antiBottomFrames = 0;
        m.ai._antiBottomCooldown = 0;
        m.ai._antiBottomHysteresisFrames = 0;
        m.ai._gunSidePolicy = null;
        m.ai._gunSideCooldown = 0;
        m.ai._escapePolicy = null;
        m.ai._escapeCooldown = 0;
        m.ai._midPressurePolicy = null;
        m.ai._midPressureCooldown = 0;
        m.ai._wallPressurePolicy = null;
        m.ai._wallPressureCooldown = 0;
        m.ai._shotTimingPolicy = null;
        m.ai._reloadPolicy = null;
        m.ai._topStuckFrames = 0;
        m.ai._chaseFrames = 0;
        m.ai._retreatFrames = 0;
        m.ai._cornerFrames = 0;
        m.ai._idleFrames = 0;
        m.ai._lowMotionFrames = 0;
        m.ai._momentumBreakFrames = 0;
        m.ai._momentumBreakDirX = 0;
        m.ai._momentumBreakDirY = 0;
        m.ai._openingContestPolicy = null;
        m.ai._openingContestFamily = null;
        m.ai._punishWindowPolicy = null;
        m.ai._punishWindowCooldown = 0;
        m.ai._profileMods = null;
        // Reset stale frame stamps — prevent negative deltas after matchTimer resets
        m.ai._lastHitFrame = 0;
        m.ai._lastTookHitFrame = 0;
        m.ai._lastEnemyShotFrame = 0;
        m.ai._prevEnemyShotFrame = 0;
        m.ai._lastEnemyWhiffFrame = 0;
        m.ai._losBlockedFrames = 0;
      }
    }

    for (let i = 0; i < room.teamSize; i++) {
      const spawnKey = i === 0 ? 'teamB' : ('teamB' + (i + 1));
      const spawnPt = spawns[spawnKey] || spawns.teamB;
      const member = this._createBot('enemy_' + i, spawnPt.tx, spawnPt.ty, 'teamB');
      member.entity.x = spawnPt.tx * TILE + TILE / 2;
      member.entity.y = spawnPt.ty * TILE + TILE / 2;
      SparState._sparBots.push(member);
      SparState.teamB.push({
        id: member.id,
        entity: member.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: member,
      });
    }

    // Restart countdown — shorter between streak matches (1.5s vs 3s for first match)
    bullets.length = 0;
    hitEffects.length = 0;
    SparState._botOpeningRoute = null;
    const trainTiming = typeof _getSparTrainingTiming === 'function' ? _getSparTrainingTiming() : null;
    SparState.phase = 'countdown';
    const STREAK_COUNTDOWN = 90; // 1.5 seconds — player knows the drill
    SparState.countdown = trainTiming ? trainTiming.countdownFrames : STREAK_COUNTDOWN;
    SparState.lastResult = null;
  },

  onParticipantDeath(entity) {
    const allParticipants = [...SparState.teamA, ...SparState.teamB];
    for (const p of allParticipants) {
      if (p.entity === entity) {
        p.alive = false;
        if (p.member) p.member.dead = true;
        break;
      }
    }

    if (entity === player) {
      playerDead = true;
      deathTimer = 60;
      if (typeof respawnTimer !== 'undefined') respawnTimer = 0;
      deathX = player.x;
      deathY = player.y;
      deathRotation = 0;
      deathGameOver = false;
    }

    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({ x: entity.x, y: entity.y, life: 25, type: "shockwave" });
    }
  },

  exitToHub() {
    this._restoreSnapshot();
    this._cleanupBots();
    SparState._matchCollector = null;
    SparState._botOpeningRoute = null;
    SparState.phase = 'hub';
    SparState.activeRoom = null;
    SparState.lastResult = null;
    enterLevel(SPAR_CONFIG.HUB_LEVEL, 15, 18);
  },

  endMatch() {
    if (SparState.phase === 'idle') return;
    this._restoreSnapshot();
    this._cleanupBots();
    SparState._matchCollector = null;
    SparState._botOpeningRoute = null;
    SparState.phase = 'idle';
    SparState.activeRoom = null;
    SparState.lastResult = null;
    SparState.streakCount = 0;
    if (!transitioning) {
      enterLevel(SPAR_CONFIG.RETURN_LEVEL, SPAR_CONFIG.RETURN_TX, SPAR_CONFIG.RETURN_TY);
    }
  },

  _restoreSnapshot() {
    const snap = SparState._savedSnapshot;
    if (!snap) return;
    gun.damage = snap.gunDamage;
    gun.fireRate = snap.gunFireRate;
    gun.magSize = snap.gunMagSize;
    gun.ammo = snap.gunAmmo;
    gun.reloading = snap.gunReloading;
    gun.reloadTimer = snap.gunReloadTimer;
    gun.special = snap.gunSpecial;
    gun.freezePenalty = snap.gunFreezePenalty;
    gun.freezeDuration = snap.gunFreezeDuration;
    gun.spread = snap.gunSpread;
    melee.damage = snap.meleeDamage;
    melee.range = snap.meleeRange;
    melee.speed = snap.meleeSpeed;
    melee.special = snap.meleeSpecial;
    player.hp = snap.playerHp;
    player.maxHp = snap.playerMaxHp;
    activeSlot = snap.activeSlot;
    lives = snap.lives;
    playerDead = snap.playerDead;
    playerEquip.gun = snap.playerEquipGun;
    playerEquip.boots = snap.playerEquipBoots;
    playerEquip.pants = snap.playerEquipPants;
    playerEquip.chest = snap.playerEquipChest;
    playerEquip.helmet = snap.playerEquipHelmet;
    deathTimer = 0;
    if (typeof respawnTimer !== 'undefined') respawnTimer = 0;
    deathGameOver = false;
    SparState._savedSnapshot = null;
  },

  _cleanupBots() {
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;
  },

  isPlayerFrozen() {
    return SparState.phase === 'countdown' || SparState.phase === 'post_match';
  },

  getTeamForEntity(entity) {
    for (const p of SparState.teamA) if (p.entity === entity) return 'teamA';
    for (const p of SparState.teamB) if (p.entity === entity) return 'teamB';
    return null;
  },

  isAlly(a, b) {
    const teamA = this.getTeamForEntity(a);
    const teamB = this.getTeamForEntity(b);
    return teamA && teamB && teamA === teamB;
  },

  // ===================== SPAR BOT AI =====================
  // Follows BotAI.tick() pattern — each member ticks independently
  _tickSparBots() {
    for (const member of SparState._sparBots) {
      if (member.dead || member.entity.hp <= 0) continue;

      // Tick reload (same as BotAI)
      if (member.gun.reloading) {
        member.gun.reloadTimer--;
        if (member.gun.reloadTimer <= 0) {
          member.gun.reloading = false;
          member.gun.ammo = member.gun.magSize;
        }
      }

      // Tick fire cooldown
      if (member.ai.shootCD > 0) member.ai.shootCD--;
      // Tick recoil (visual — same as player updateGun())
      if (member.gun.recoilTimer > 0) member.gun.recoilTimer--;

      // Tick juke timer
      if (member.ai.jukeTimer > 0) member.ai.jukeTimer--;

      this._tickOneBot(member);
    }
  },

  // Body blocking — hard stop, no pushing. All spar entities can't overlap.
  _bodyBlockSpar() {
    // Gather all alive spar entities (player + bots)
    const entities = [];
    for (const p of SparState.teamA) {
      if (p.alive) entities.push(p.entity);
    }
    for (const p of SparState.teamB) {
      if (p.alive) entities.push(p.entity);
    }
    const R = GAME_CONFIG.PLAYER_RADIUS;
    const minDist = R * 2;
    // Resolve overlaps — push apart equally (hard stop, no momentum)
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i], b = entities[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0.1) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          // Push each entity half the overlap — hard stop, equal
          const axNew = a.x + nx * overlap;
          const ayNew = a.y + ny * overlap;
          const bxNew = b.x - nx * overlap;
          const byNew = b.y - ny * overlap;
          if (typeof positionClear === 'function') {
            const bbHw = GAME_CONFIG.PLAYER_WALL_HW;
            if (positionClear(axNew, ayNew, bbHw)) { a.x = axNew; a.y = ayNew; }
            if (positionClear(bxNew, byNew, bbHw)) { b.x = bxNew; b.y = byNew; }
          } else {
            a.x = axNew; a.y = ayNew;
            b.x = bxNew; b.y = byNew;
          }
        } else if (dist <= 0.1) {
          // Exact overlap — nudge apart
          a.x += R; b.x -= R;
        }
      }
    }
  },

  // Shoot — 4 cardinal directions only (same as player shoot() in gunSystem.js)
  _sparBotShoot(member, target) {
    const e = member.entity;
    const g = member.gun;
    const bspd = GAME_CONFIG.BULLET_SPEED;
    const ai = member.ai;

    // --- WALLING MODE ---
    // When walling, shoot in a fixed horizontal direction (toward opponent's side)
    // instead of aiming at the opponent. The bot's diagonal strafing creates the
    // Y-stagger between consecutive bullets, forming an undodgable wall.
    if (ai._wallMode) {
      const wallDir = (target.x > e.x) ? 3 : 2; // shoot toward opponent's side
      e.dir = wallDir;
      // Compute muzzle position for this aim direction
      const bx = e.x - 20, by = e.y - 68;
      const bodyL = bx + 2, bodyR = bx + 36;
      const armY = by + 35;
      const mOff = GAME_CONFIG.MUZZLE_OFFSET_Y ?? 0;
      const isRight = e._gunSide === 'right';
      let mx, my;
      if (wallDir === 2) { mx = bodyL + 2 - 49; my = isRight ? (armY - mOff) : (armY + mOff); }
      else { mx = bodyR + 9 + 49; my = isRight ? (armY + mOff) : (armY - mOff); }
      const bvx = wallDir === 3 ? bspd : -bspd;
      // Apply spread
      let fvx = bvx, fvy = 0;
      const spreadDeg = g.spread || 0;
      if (spreadDeg > 0) {
        const spreadRad = spreadDeg * Math.PI / 180;
        const randOffset = (Math.random() - 0.5) * spreadRad;
        fvx = Math.cos(randOffset) * bspd * Math.sign(bvx);
        fvy = Math.sin(randOffset) * bspd;
      }
      // Fire the wall bullet — skip predictive aiming entirely
      bullets.push({
        id: typeof nextBulletId !== 'undefined' ? nextBulletId++ : Date.now() + Math.random(),
        x: mx, y: my, vx: fvx, vy: fvy,
        fromPlayer: true, sparTeam: member._sparTeam,
        damage: g.damage, special: g.special, ownerId: member.id,
        _botBullet: true, bulletColor: g.bulletColor || null,
        startX: mx, startY: my, _sparDir: e.dir,
      });
      g.ammo--;
      ai.shootCD = Math.round((g.fireRate || 5) * 4);
      ai._freezeTimer = g.freezeDuration || 15;
      ai._freezePenalty = g.freezePenalty != null ? g.freezePenalty : 0.54;
      g.recoilTimer = 6;
      if (g.ammo <= 0) {
        g.reloading = true;
        g.reloadTimer = this._getSparReloadFrames(g);
      }
      return;
    }

    // PREDICTIVE AIMING: lead the target based on velocity and distance
    const tVx = target.vx || 0, tVy = target.vy || 0;
    const rawDx = target.x - e.x, rawDy = target.y - e.y;
    const rawDist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    // Estimate frames for bullet to reach target
    const travelFrames = rawDist > 1 ? rawDist / (bspd * 60) * 60 : 5; // approx frames
    const leadFrames = Math.min(travelFrames, 15); // don't over-predict

    // Predicted position
    const predX = target.x + tVx * leadFrames * 0.5;
    const predY = target.y + tVy * leadFrames * 0.5;

    // Use predicted position for direction
    const dx = predX - e.x, dy = predY - e.y;

    // Learning: bias based on player's dodge tendency
    let aimBiasX = 0, aimBiasY = 0;
    const pm = member.ai._profileMods;
    if (pm && Math.abs(pm.dodgePredictBiasX) > 0.15) {
      aimBiasX = pm.dodgePredictBiasX * 30; // shift aim toward predicted dodge
    }

    const aimDx = dx + aimBiasX;
    const aimDy = dy + aimBiasY;

    // Pick best cardinal direction
    // dir: 0=down, 1=up, 2=left, 3=right
    // Cardinal bullets care about perpendicular lane width, so keep the learned
    // horizontal-vs-vertical bias but ground it in the current live bullet/body setup.
    let effectiveDx = Math.abs(aimDx);
    let effectiveDy = Math.abs(aimDy);
    const pm2 = member.ai._profileMods;
    if (pm2 && pm2.horizShotAdvantage) {
      // horizShotAdvantage < 1 means vertical is better → bias toward vertical
      // horizShotAdvantage > 1 means horizontal is better → bias toward horizontal
      if (pm2.horizShotAdvantage < 0.5) {
        // Vertical shots are 2x+ better — strongly prefer vertical
        effectiveDy *= 1.8;
      } else if (pm2.horizShotAdvantage < 1.0) {
        effectiveDy *= 1.3;
      }
    }
    let bvx = 0, bvy = 0;
    let aimDir;
    if (effectiveDx > effectiveDy) {
      bvx = aimDx > 0 ? bspd : -bspd;
      aimDir = aimDx > 0 ? 3 : 2;
    } else {
      bvy = aimDy > 0 ? bspd : -bspd;
      aimDir = aimDy > 0 ? 0 : 1;
    }
    e.dir = aimDir;

    // Muzzle position — same body-relative formula as player getMuzzlePos()
    // Uses entity._gunSide (left for now) — matches player getMuzzlePos exactly
    const bx = e.x - 20;
    const by = e.y - 68;
    const bodyL = bx + 2;
    const bodyR = bx + 36;
    const armY = by + 35;
    const mOff = GAME_CONFIG.MUZZLE_OFFSET_Y ?? 0;
    const isRight = e._gunSide === 'right';
    let mx, my;
    if (aimDir === 0) { // down
      mx = isRight ? (bodyL - 1) : (bodyR + 1);
      my = armY + 6 + 49;
    } else if (aimDir === 1) { // up
      mx = isRight ? (bodyR + 1) : (bodyL - 1);
      my = by + 28 - 49;
    } else if (aimDir === 2) { // left
      mx = bodyL + 2 - 49;
      my = isRight ? (armY - mOff) : (armY + mOff);
    } else { // right
      mx = bodyR + 9 + 49;
      my = isRight ? (armY + mOff) : (armY - mOff);
    }

    // Apply spread (same as player shoot() — random angular offset)
    const spreadDeg = g.spread || 0;
    if (spreadDeg > 0) {
      const spreadRad = spreadDeg * Math.PI / 180;
      const randOffset = (Math.random() - 0.5) * spreadRad;
      const baseAngle = Math.atan2(bvy, bvx);
      const newAngle = baseAngle + randOffset;
      bvx = Math.cos(newAngle) * bspd;
      bvy = Math.sin(newAngle) * bspd;
    }

    bullets.push({
      id: typeof nextBulletId !== 'undefined' ? nextBulletId++ : Date.now() + Math.random(),
      x: mx,
      y: my,
      vx: bvx,
      vy: bvy,
      fromPlayer: true,
      sparTeam: member._sparTeam,
      damage: g.damage,
      special: g.special,
      ownerId: member.id,
      _botBullet: true,
      bulletColor: g.bulletColor || null,
      startX: mx,
      startY: my,
      _sparDir: e.dir,
    });

    g.ammo--;
    // Fire rate: match player's actual cooldown (fireRate * 4, same as gunSystem.js)
    member.ai.shootCD = Math.round((g.fireRate || 5) * 4);
    // v10: baitShot adds 50% more cooldown between shots to feign hesitation
    if (member.ai._shotTimingPolicy === 'baitShot') {
      member.ai.shootCD = Math.round(member.ai.shootCD * 1.5);
    }

    // Freeze penalty after shooting — same as player (gunSystem.js shoot())
    member.ai._freezeTimer = g.freezeDuration || 15;
    member.ai._freezePenalty = g.freezePenalty != null ? g.freezePenalty : 0.54;

    // Recoil visual — same as player (gun.recoilTimer = 6)
    g.recoilTimer = 6;

    if (g.ammo <= 0) {
      g.reloading = true;
      // Keep reload timing on the exact same spar CT-X curve used for the player.
      g.reloadTimer = this._getSparReloadFrames(g);
    }
  },

  // Dodge incoming enemy bullets — optimized for 4-cardinal bullet paths
  _getIncomingBulletDodge(bot, team) {
    let dodgeX = 0, dodgeY = 0;
    const speed = bot.speed || SPAR_CONFIG.BOT_SPEED;
    const botHitY = bot.y + 5; // hitbox at feet level (entity.y + 5)
    const hitRadius = this._getSparPerpHitRadius();
    const reactionMargin = Math.max(speed * 2, (GAME_CONFIG.BULLET_SPEED || 9) * 1.5);
    const dodgeLane = hitRadius + reactionMargin;
    const maxThreatDist = Math.max(320, (GAME_CONFIG.BULLET_SPEED || 9) * 36);

    for (const b of bullets) {
      if (!b.sparTeam || b.sparTeam === team) continue;
      const dbx = bot.x - b.x, dby = botHitY - b.y;
      const bDist = Math.sqrt(dbx * dbx + dby * dby);
      if (bDist > maxThreatDist || bDist < 8) continue;

      // Urgency: closer = stronger dodge
      const urgency = Math.max(0.45, 1.35 - bDist / Math.max(260, maxThreatDist));

      if (Math.abs(b.vy) > Math.abs(b.vx)) {
        // Vertical bullet — dodge LEFT or RIGHT (perpendicular to travel)
        const isApproaching = (b.vy > 0 && b.y < botHitY) || (b.vy < 0 && b.y > botHitY);
        if (!isApproaching) continue;
        if (Math.abs(dbx) > dodgeLane) continue;
        const dodgeDir = dbx >= 0 ? 1 : -1;
        const laneProximity = Math.max(0.2, 1 - Math.abs(dbx) / dodgeLane);
        dodgeX += dodgeDir * urgency * laneProximity * 3.0;
      } else {
        // Horizontal bullet — dodge UP or DOWN (perpendicular to travel)
        const isApproaching = (b.vx > 0 && b.x < bot.x) || (b.vx < 0 && b.x > bot.x);
        if (!isApproaching) continue;
        if (Math.abs(dby) > dodgeLane) continue;
        const dodgeDir = dby >= 0 ? 1 : -1;
        const laneProximity = Math.max(0.2, 1 - Math.abs(dby) / dodgeLane);
        dodgeY += dodgeDir * urgency * laneProximity * 3.0;
      }
    }

    // Clamp total dodge so it doesn't exceed reasonable movement
    const dodgeLen = Math.sqrt(dodgeX * dodgeX + dodgeY * dodgeY);
    const maxDodge = Math.max(3.5, speed * 0.95);
    if (dodgeLen > maxDodge) {
      dodgeX = (dodgeX / dodgeLen) * maxDodge;
      dodgeY = (dodgeY / dodgeLen) * maxDodge;
    }
    return { x: dodgeX, y: dodgeY };
  },

  // --- BULLET GAP READING: scan live bullet field for safe crossing corridors ---
  // Returns { vertClear, horizClear, gapQuality (0-1), bestCrossDir (-1 or 1) }
  // vertClear = safe to descend/ascend through vertical corridor
  // horizClear = safe to cross laterally
  // gapQuality = overall safety of the best crossing path (1 = totally clear)
  _findSafeCrossWindow(bot, tgt, team) {
    const bspd = GAME_CONFIG.BULLET_SPEED || 9;
    const hitR = this._getSparPerpHitRadius();
    const lookAheadFrames = 20; // how far ahead to project bullet trajectories
    const corridorWidth = hitR * 2.5; // width of the crossing corridor to check
    let vertThreats = 0, horizThreats = 0;
    let leftThreats = 0, rightThreats = 0;

    for (const b of bullets) {
      if (!b.sparTeam || b.sparTeam === team) continue;
      const dbx = bot.x - b.x, dby = bot.y - b.y;
      const bDist = Math.sqrt(dbx * dbx + dby * dby);
      if (bDist > bspd * lookAheadFrames * 1.5) continue; // too far to matter

      // Project bullet position over the next lookAheadFrames
      for (let f = 0; f <= lookAheadFrames; f += 4) {
        const projX = b.x + b.vx * f;
        const projY = b.y + b.vy * f;

        // Check vertical corridor (bot descending/ascending toward tgt.y)
        // Corridor: horizontal band centered on bot.x, extending from bot.y toward tgt.y
        if (Math.abs(projX - bot.x) < corridorWidth) {
          const minY = Math.min(bot.y, tgt.y) - hitR;
          const maxY = Math.max(bot.y, tgt.y) + hitR;
          if (projY > minY && projY < maxY) {
            vertThreats++;
          }
        }

        // Check horizontal corridor (bot crossing left or right)
        if (Math.abs(projY - bot.y) < corridorWidth) {
          // Left crossing corridor
          if (projX < bot.x && projX > bot.x - 200) leftThreats++;
          // Right crossing corridor
          if (projX > bot.x && projX < bot.x + 200) rightThreats++;
          horizThreats++;
        }
      }
    }

    const vertClear = vertThreats <= 1;
    const horizClear = Math.min(leftThreats, rightThreats) <= 1;
    const bestCrossDir = leftThreats <= rightThreats ? -1 : 1;
    const totalThreats = Math.min(vertThreats, Math.min(leftThreats, rightThreats));
    const gapQuality = this._clamp01(1 - totalThreats / 5);

    return { vertClear, horizClear, gapQuality, bestCrossDir };
  },

  // ---- LEARNING: collect player data each frame during fighting ----
  // NOTE: If you add new fields here that _tickOneBot reads from the collector,
  // you MUST also add them to the fullBvB stub in tick() (search "fullBvB stub").
  _collectPlayerData() {
    if (SparState.phase !== 'fighting') return;
    // FullBvB: player is offscreen, skip all player-specific data collection
    if (typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot()) return;
    if (!SparState._matchCollector) {
      // Initialize collector at first call
      SparState._matchCollector = {
        samples: 0,
        posYSum: 0,       // normalized Y accumulator (0=top, 1=bottom)
        posXSum: 0,       // normalized X accumulator (0=left, 1=right)
        openingFrames: [],  // [{x,y}] for first 180 frames
        dodgeLeftCount: 0,  // vertical bullet dodges to the left
        dodgeRightCount: 0,
        dodgeUpCount: 0,    // horizontal bullet dodges up
        dodgeDownCount: 0,
        shotDirs: { up: 0, down: 0, left: 0, right: 0 },
        reloadYSamples: [],  // normalized Y when player is reloading
        distSamples: [],     // distance to nearest enemy
        aggrOnReload: 0,     // frames player pushes toward bot during bot reload
        aggrOnReloadTotal: 0,
        lowHpAggrFrames: 0,
        lowHpTotalFrames: 0,
        // --- Situational / relational data ---
        // When player has bottom
        hasBottom_frames: 0,        // total frames player had bottom
        hasBottom_holdFrames: 0,    // frames staying roughly same Y (holding)
        hasBottom_pushFrames: 0,    // frames moving toward bot
        hasBottom_shots: 0,         // shots fired while having bottom
        // When bot has bottom
        botBottom_frames: 0,
        botBottom_retakeFrames: 0,  // frames moving downward (trying to retake)
        botBottom_flankFrames: 0,   // frames moving horizontally more than vertically
        botBottom_retreatFrames: 0, // frames moving away from bot
        // When bot is approaching (closing distance)
        botApproach_frames: 0,
        botApproach_holdFrames: 0,  // player stays still or moves toward bot
        botApproach_counterFrames: 0, // player moves TOWARD approaching bot
        botApproach_sidestepFrames: 0, // player moves sideways
        // When bot is retreating
        botRetreat_frames: 0,
        botRetreat_chaseFrames: 0,  // player moves toward retreating bot
        botRetreat_shots: 0,        // shots while bot retreats
        // Shot direction by relative position
        shotWhenAbove: { down: 0, side: 0, total: 0 }, // player above bot
        shotWhenBelow: { up: 0, side: 0, total: 0 },   // player below bot
        shotWhenLevel: { left: 0, right: 0, total: 0 }, // roughly same Y
        // --- Opening tracking (v3) ---
        firstShotFrame: -1,        // frame player first fires
        openingShotCount: 0,       // shots during first 180 frames
        botYAtOpeningEnd: -1,      // bot Y position at frame 180
        playerYAtOpeningEnd: -1,   // player Y position at frame 180
        // --- Combat outcome tracking ---
        playerHits: [],    // [{dist, botMoving, botVx, botVy, dir, relY}]
        playerMisses: [],  // [{dist, botMoving, botVx, botVy, dir, relY}]
        botHits: [],       // [{dist, playerMoving, playerVx, playerVy, dir, relY}]
        botMisses: [],     // [{dist, playerMoving, playerVx, playerVy, dir, relY}]
        playerDmgFrames: [],  // [{frame, dmg, hasBottom}] — when player deals damage
        botDmgFrames: [],     // [{frame, dmg, hasBottom}] — when bot deals damage
        // Phase 1e: Circumstance-specific sampling
        afterHit_frames: 0,
        afterHit_aggrFrames: 0,
        afterTookHit_frames: 0,
        afterTookHit_retreatFrames: 0,
        lowHp_aggrFrames: 0,
        lowHp_fleeFrames: 0,
        chase_frames: 0,
        chase_giveUpFrames: 0,
        nearWall_frames: 0,
        nearWall_cornerStuckFrames: 0,
        // Position value tracking
        botHasBottom_frames: 0,
        botHasBottom_dmgDealt: 0,
        botHasBottom_dmgTaken: 0,
        botInTop_frames: 0,
        botInTop_dmgDealt: 0,
        botInTop_dmgTaken: 0,
        // Reinforcement posture tracking
        botUnderEnemy_frames: 0,
        botAboveEnemy_frames: 0,
        botGunAdv_frames: 0,
        botGunDisadv_frames: 0,
        // Gun side tracking (v4)
        playerGunSideSamples: { left: 0, right: 0 },
        // Directional hit rates — hitbox awareness (v4)
        hitsByBulletDir: { horiz: { hits: 0, total: 0 }, vert: { hits: 0, total: 0 } },
        botHitsByBulletDir: { horiz: { hits: 0, total: 0 }, vert: { hits: 0, total: 0 } },
        // Peek tracking: bot has bottom + shooting horizontal (v4)
        peekAttempts: 0,
        peekHits: 0,
        // v8 anti-bottom tactical tracking
        antiBottomEngagements: [],   // [{tactic, family, frames, regained, dmgTaken, startCtx, endReason, ...}]
        gunSideEngagements: [],      // [{policy, family, frames, resolved, dmgTaken, startCtx}]
        escapeEngagements: [],       // [{policy, family, frames, resolved, dmgTaken, startCtx}]
        shotTimingEngagements: [],   // [{policy, family, frames, hits, dmgDealt, startCtx}]
        reloadEngagements: [],       // [{policy, family, frames, dmgDealt, punished, startCtx}]
        midPressureEngagements: [],  // [{policy, family, frames, dmgDealt, startCtx}]
        wallPressureEngagements: [], // [{policy, family, frames, dmgDealt, pinned, startCtx}]
        trapZoneHits:   { center: 0, near: 0, wide: 0 },
        trapZoneFrames: { center: 0, near: 0, wide: 0 },
        openingBottomLostDir: null,  // 'left'|'right'|'center'
        // Rhythm tracking (v10)
        rhythm_losGainFrames: [],      // frames when player gains line-of-sight
        rhythm_shotAfterLos: [],       // frames between LOS gain and first shot
        rhythm_postShotRetreat: [],    // frames after shot before player retreats
        rhythm_reEngageDelays: [],     // frames after retreat before re-approaching
        rhythm_shotAlignQuality: [],   // alignment quality (0-1) at time of shot
        rhythm_bottomLostCrosses: 0,   // times player changed side after losing bottom
        rhythm_bottomLostTotal: 0,     // total bottom losses
        rhythm_retreatSameSide: 0,     // retreats in same horizontal direction
        rhythm_retreatCrossSide: 0,    // retreats crossing to other side
        rhythm_peekReEngageFrames: [], // frames between disengage and re-peek
        // State for tracking
        _lastLosFrame: -1,             // frame when player last gained LOS
        _lastShotFrame: -1,            // frame when player last fired
        _lastShotCount: 0,             // total shots at last check
        _lastRetreatFrame: -1,         // frame when player last started retreating
        _lastRetreatDir: 0,            // last retreat horizontal direction
        _playerWasRetreating: false,   // was player retreating last frame
        _playerHadLos: false,          // did player have LOS last frame
        _playerSideAtBottomLoss: 0,    // x offset when player lost bottom
        _playerHadBottom: false,       // did player have bottom last frame
      };
    }

    // Sample every 6 frames (10Hz)
    if (SparState.matchTimer % 6 !== 0) return;

    const c = SparState._matchCollector;
    const bottomGap = this._getSparBottomGap();
    const wideBottomGap = this._getSparWideBottomGap();
    const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
    if (!arenaLevel) return;
    const arenaW = arenaLevel.widthTiles * TILE;
    const arenaH = arenaLevel.heightTiles * TILE;

    // Normalized position (0-1)
    const normY = Math.max(0, Math.min(1, player.y / arenaH));
    const normX = Math.max(0, Math.min(1, player.x / arenaW));
    c.posYSum += normY;
    c.posXSum += normX;
    c.samples++;

    // Track player gun side (v4)
    const pGunSide = typeof getCurrentGunSide === 'function' ? getCurrentGunSide() : 'left';
    if (pGunSide === 'left') c.playerGunSideSamples.left++;
    else c.playerGunSideSamples.right++;

    // Opening movement (first 180 frames = 3 seconds)
    if (SparState.matchTimer <= 180) {
      c.openingFrames.push({ x: player.x, y: player.y, vx: player.vx || 0, vy: player.vy || 0 });
    }
    // Snapshot positions at end of opening for gotBottom tracking
    if (SparState.matchTimer >= 174 && SparState.matchTimer <= 186 && c.botYAtOpeningEnd < 0) {
      c.playerYAtOpeningEnd = player.y;
      const botE = SparState.teamB[0] && SparState.teamB[0].alive ? SparState.teamB[0].entity : null;
      if (botE) c.botYAtOpeningEnd = botE.y;
      // v8: detect if player secured bottom during opening and from which direction
      if (c.playerYAtOpeningEnd > 0 && c.botYAtOpeningEnd > 0 && !c.openingBottomLostDir) {
        const bg = this._getSparBottomGap();
        if (c.playerYAtOpeningEnd > c.botYAtOpeningEnd + bg) {
          // Player got bottom — record approach direction using widthTiles (same as rest of file)
          const arenaLvl = (typeof LEVELS !== 'undefined' && SparState.activeRoom)
            ? LEVELS[SparState.activeRoom.arenaLevel] : null;
          const arenaMidX = arenaLvl && arenaLvl.widthTiles
            ? arenaLvl.widthTiles * TILE / 2 : 576;
          c.openingBottomLostDir = player.x < arenaMidX - 50 ? 'left'
            : (player.x > arenaMidX + 50 ? 'right' : 'center');
          // Feed to all bots on team B for tactic selection
          for (const m of SparState.teamB) {
            if (m && m.member && m.member.ai) m.member.ai._openingLostBottomDir = c.openingBottomLostDir;
          }
        }
      }
    }

    // Dodge direction tracking — check if player is moving away from nearby bullets
    for (const b of bullets) {
      if (!b.sparTeam || b.sparTeam === 'teamA') continue; // only enemy bullets
      const dbx = player.x - b.x, dby = player.y - b.y;
      const bDist = Math.sqrt(dbx * dbx + dby * dby);
      if (bDist > 200 || bDist < 20) continue;

      const pVx = player.vx || 0;
      const pVy = player.vy || 0;
      if (Math.abs(pVx) < 0.5 && Math.abs(pVy) < 0.5) continue;

      if (Math.abs(b.vy) > Math.abs(b.vx)) {
        // Vertical bullet — player dodges left/right
        if (pVx < -1) c.dodgeLeftCount++;
        else if (pVx > 1) c.dodgeRightCount++;
      } else {
        // Horizontal bullet — player dodges up/down
        if (pVy < -1) c.dodgeUpCount++;
        else if (pVy > 1) c.dodgeDownCount++;
      }
    }

    // --- Rhythm tracking (v10) ---
    const botEntity = SparState.teamB[0] && SparState.teamB[0].alive ? SparState.teamB[0].entity : null;
    if (botEntity && typeof this._hasLOS === 'function') {
      const _hbY = GAME_CONFIG.PLAYER_HITBOX_Y || -25;
      const hasLos = this._hasLOS(player.x, player.y + _hbY, botEntity.x, botEntity.y + _hbY);
      const rpVx = player.vx || 0, rpVy = player.vy || 0;
      const rpSpeed = Math.sqrt(rpVx * rpVx + rpVy * rpVy);
      const rdx = botEntity.x - player.x, rdy = botEntity.y - player.y;
      const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
      const isApproaching = rDist > 30 && (rdx * rpVx + rdy * rpVy) > rpSpeed * 0.3;
      const isRetreating = rDist > 30 && (rdx * rpVx + rdy * rpVy) < -rpSpeed * 0.3;

      // LOS transition: gained LOS
      if (hasLos && !c._playerHadLos) {
        c._lastLosFrame = SparState.matchTimer;
      }
      c._playerHadLos = hasLos;

      // Shot delay: player fires after gaining LOS
      if (c.shotDirs && c._lastLosFrame > 0) {
        const totalShots = c.shotDirs.up + c.shotDirs.down + c.shotDirs.left + c.shotDirs.right;
        if (totalShots > (c._lastShotCount || 0)) {
          const delay = SparState.matchTimer - c._lastLosFrame;
          if (delay > 0 && delay < 120) c.rhythm_shotAfterLos.push(delay);
          c._lastShotCount = totalShots;
          c._lastShotFrame = SparState.matchTimer;
        }
      }

      // Retreat delay: player retreats after shooting
      if (isRetreating && !c._playerWasRetreating && c._lastShotFrame > 0) {
        const delay = SparState.matchTimer - c._lastShotFrame;
        if (delay > 0 && delay < 120) c.rhythm_postShotRetreat.push(delay);
        c._lastRetreatFrame = SparState.matchTimer;
        // Track retreat direction: same side vs cross
        if (rpVx !== 0) {
          const prevSide = c._lastRetreatDir || 0;
          const curSide = Math.sign(rpVx);
          if (prevSide !== 0 && curSide !== 0) {
            if (curSide === prevSide) c.rhythm_retreatSameSide++;
            else c.rhythm_retreatCrossSide++;
          }
          c._lastRetreatDir = curSide;
        }
      }
      c._playerWasRetreating = isRetreating;

      // Re-engage delay: player approaches after retreating
      if (isApproaching && c._lastRetreatFrame > 0) {
        const delay = SparState.matchTimer - c._lastRetreatFrame;
        if (delay > 0 && delay < 300) {
          c.rhythm_reEngageDelays.push(delay);
          c._lastRetreatFrame = -1; // only count once per retreat
        }
      }

      // Bottom loss tracking: player changes side after losing bottom
      const bg = this._getSparBottomGap();
      const playerHadBottom = player.y > botEntity.y + bg;
      if (!playerHadBottom && c._playerHadBottom) {
        // Player just lost bottom
        c.rhythm_bottomLostTotal++;
        if (c._playerSideAtBottomLoss !== 0) {
          const oldSide = c._playerSideAtBottomLoss > 0 ? 1 : -1;
          const newSide = player.x > botEntity.x ? 1 : -1;
          if (oldSide !== newSide) c.rhythm_bottomLostCrosses++;
        }
      }
      if (playerHadBottom) {
        c._playerSideAtBottomLoss = player.x - botEntity.x;
      }
      c._playerHadBottom = playerHadBottom;
    }

    // Reload position tracking
    if (gun.reloading) {
      c.reloadYSamples.push(normY);
    }

    // Distance to nearest enemy
    let minDist = Infinity;
    for (const p of SparState.teamB) {
      if (!p.alive) continue;
      const edx = player.x - p.entity.x, edy = player.y - p.entity.y;
      const ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < minDist) minDist = ed;
    }
    if (minDist < Infinity) c.distSamples.push(minDist);

    // Aggression during bot reload
    for (const p of SparState.teamB) {
      if (!p.alive || !p.member) continue;
      if (p.member.gun.reloading) {
        c.aggrOnReloadTotal++;
        const edx = p.entity.x - player.x, edy = p.entity.y - player.y;
        const ed = Math.sqrt(edx * edx + edy * edy);
        const pVx = player.vx || 0, pVy = player.vy || 0;
        // Dot product of player velocity toward enemy
        if (ed > 1) {
          const dot = (pVx * edx + pVy * edy) / ed;
          if (dot > 1) c.aggrOnReload++;
        }
      }
    }

    // Low HP aggression
    const hpPct = player.hp / player.maxHp;
    if (hpPct < 0.35) {
      c.lowHpTotalFrames++;
      // Check if moving toward nearest enemy
      let nearestEnemy = null;
      let nearDist = Infinity;
      for (const p of SparState.teamB) {
        if (!p.alive) continue;
        const edx = p.entity.x - player.x, edy = p.entity.y - player.y;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed < nearDist) { nearDist = ed; nearestEnemy = p.entity; }
      }
      if (nearestEnemy && nearDist > 1) {
        const pVx = player.vx || 0, pVy = player.vy || 0;
        const edx = nearestEnemy.x - player.x, edy = nearestEnemy.y - player.y;
        const dot = (pVx * edx + pVy * edy) / nearDist;
        if (dot > 1) c.lowHpAggrFrames++;
      }
    }

    // ---- Situational / relational data collection ----
    // Find nearest bot enemy for relational tracking
    let nearBot = null;
    let nearBotDist = Infinity;
    for (const p of SparState.teamB) {
      if (!p.alive) continue;
      const edx = p.entity.x - player.x, edy = p.entity.y - player.y;
      const ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < nearBotDist) { nearBotDist = ed; nearBot = p; }
    }
    if (!nearBot) return;
    const botE = nearBot.entity;
    const pVx = player.vx || 0, pVy = player.vy || 0;
    const botVx = botE.vx || 0, botVy = botE.vy || 0;
    const relDx = botE.x - player.x, relDy = botE.y - player.y;
    const playerHasBottom = player.y > botE.y + bottomGap;
    const botHasBottom = botE.y > player.y + bottomGap;

    // --- When player has bottom ---
    if (playerHasBottom) {
      c.hasBottom_frames++;
      // Holding: player not moving much vertically (staying in position)
      if (Math.abs(pVy) < 2) c.hasBottom_holdFrames++;
      // Pushing: player moving toward bot (upward since player is below)
      if (pVy < -2 && nearBotDist < 400) c.hasBottom_pushFrames++;
    }

    // --- When bot has bottom ---
    if (botHasBottom) {
      c.botBottom_frames++;
      // Retaking: player moving downward (toward bottom)
      if (pVy > 2) c.botBottom_retakeFrames++;
      // Flanking: player moving more horizontally than vertically
      if (Math.abs(pVx) > Math.abs(pVy) + 1 && Math.abs(pVx) > 2) c.botBottom_flankFrames++;
      // Retreating: player moving away from bot (increasing distance)
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot < -2) c.botBottom_retreatFrames++;
      }
    }

    // --- When bot is approaching player (closing distance) ---
    if (nearBotDist > 1 && nearBotDist < 400) {
      const botClosing = (botVx * -relDx + botVy * -relDy) / nearBotDist;
      if (botClosing > 2) {
        // Bot is closing distance on player
        c.botApproach_frames++;
        // Player holds ground (doesn't move away much)
        const playerFlee = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (playerFlee > 1) {
          c.botApproach_counterFrames++; // moving TOWARD the approaching bot
        } else if (playerFlee > -1) {
          c.botApproach_holdFrames++; // standing ground
        }
        // Sidestep: perpendicular movement
        const perp = Math.abs(pVx * relDy - pVy * relDx) / nearBotDist;
        if (perp > 3) c.botApproach_sidestepFrames++;
      }

      // --- When bot is retreating (moving away from player) ---
      const botRetreating = (botVx * relDx + botVy * relDy) / nearBotDist;
      if (botRetreating > 2) {
        c.botRetreat_frames++;
        // Player chasing: moving toward retreating bot
        const playerChase = (pVx * -relDx + pVy * -relDy) / nearBotDist;
        if (playerChase > 1) c.botRetreat_chaseFrames++;
      }
    }

    // --- Shot direction by relative position ---
    // Track what direction the player was LAST shooting (use player.dir)
    // Only count if player is actively shooting (check fire cooldown proxy: recent shot)
    const recentShot = c.shotDirs.up + c.shotDirs.down + c.shotDirs.left + c.shotDirs.right;
    const prevTotal = c._prevShotTotal || 0;
    if (recentShot > prevTotal) {
      // A shot was fired this sample window
      const vertDiff = Math.abs(player.y - botE.y);
      if (player.y < botE.y - 40) {
        // Player is ABOVE bot
        c.shotWhenAbove.total++;
        if (player.dir === 0) c.shotWhenAbove.down++; // shooting down toward bot
        else c.shotWhenAbove.side++;
      } else if (player.y > botE.y + wideBottomGap) {
        // Player is BELOW bot
        c.shotWhenBelow.total++;
        if (player.dir === 1) c.shotWhenBelow.up++; // shooting up toward bot
        else c.shotWhenBelow.side++;
      } else {
        // Roughly same Y level
        c.shotWhenLevel.total++;
        if (player.dir === 2) c.shotWhenLevel.left++;
        else if (player.dir === 3) c.shotWhenLevel.right++;
      }
    }
    c._prevShotTotal = recentShot;

    // --- Track shots while having bottom / bot retreating ---
    if (playerHasBottom && recentShot > prevTotal) c.hasBottom_shots++;
    if (nearBotDist > 1 && nearBotDist < 400) {
      const botRetreating2 = (botVx * relDx + botVy * relDy) / nearBotDist;
      if (botRetreating2 > 2 && recentShot > prevTotal) c.botRetreat_shots++;
    }

    // --- Phase 1e: Circumstance-specific sampling ---
    // After-hit tracking: did player just hit the bot?
    const recentPlayerHit = c.playerDmgFrames.length > 0 &&
      (SparState.matchTimer - c.playerDmgFrames[c.playerDmgFrames.length - 1].frame) < 30;
    if (recentPlayerHit) {
      c.afterHit_frames++;
      // Is player pushing toward bot (aggressive after hit)?
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot > 1) c.afterHit_aggrFrames++;
      }
    }

    // After-took-hit tracking: did player just take damage?
    const recentPlayerTookHit = c.botDmgFrames.length > 0 &&
      (SparState.matchTimer - c.botDmgFrames[c.botDmgFrames.length - 1].frame) < 30;
    if (recentPlayerTookHit) {
      c.afterTookHit_frames++;
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot < -1) c.afterTookHit_retreatFrames++;
      }
    }

    // Low HP expanded: flee vs aggress
    if (hpPct < 0.25) {
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot < -1) c.lowHp_fleeFrames++;
      }
    }

    // Chase tracking
    if (nearBotDist > 1 && nearBotDist < 400) {
      const playerChasing = (pVx * relDx + pVy * relDy) / nearBotDist;
      if (playerChasing > 2) {
        c.chase_frames++;
      }
      // Give-up detection: was chasing but stopped
      if (c.chase_frames > 30 && Math.abs(pVx) < 1 && Math.abs(pVy) < 1) {
        c.chase_giveUpFrames++;
      }
    }

    // Position value tracking (for bot's position, not player's)
    // This tracks damage dealt/taken while bot is in bottom vs top
    if (SparState.teamB && SparState.teamB.length > 0) {
      const dBot = SparState.teamB[0];
      if (dBot && dBot.alive && dBot.entity) {
        const bMidY = arenaLevel ? arenaLevel.heightTiles * TILE / 2 : 480;
        const botIsBottom = dBot.entity.y > player.y + bottomGap;
        const botIsTop = dBot.entity.y < bMidY;
        if (botIsBottom) c.botHasBottom_frames++;
        if (botIsTop) c.botInTop_frames++;
      }
    }

    // Reinforcement posture tracking: staying under the enemy is generally strong,
    // and using the better gun-side lane matters even when not literally at bottom.
    if (SparState.teamB && SparState.teamB.length > 0) {
      const dBot = SparState.teamB[0];
      if (dBot && dBot.alive && dBot.entity) {
        if (dBot.entity.y > player.y + Math.max(12, bottomGap - 8)) c.botUnderEnemy_frames++;
        else if (dBot.entity.y < player.y - 20) c.botAboveEnemy_frames++;

        const botLane = this._getGunSideLaneScore(dBot.entity, player);
        const playerLane = this._getGunSideLaneScore(player, dBot.entity);
        if (botLane > playerLane + 0.08) c.botGunAdv_frames++;
        else if (playerLane > botLane + 0.08) c.botGunDisadv_frames++;
      }
    }

    // Near-wall tracking
    const arenaLevelW = arenaLevel.widthTiles * TILE;
    const arenaLevelH = arenaLevel.heightTiles * TILE;
    const pNearWall = player.x < TILE * 3 || player.x > arenaLevelW - TILE * 3 ||
                      player.y < TILE * 3 || player.y > arenaLevelH - TILE * 3;
    if (pNearWall) {
      c.nearWall_frames++;
      if (Math.abs(pVx) < 1 && Math.abs(pVy) < 1) c.nearWall_cornerStuckFrames++;
    }
  },

  // ---- LEARNING: update persistent profile at match end ----
  _updateLearningProfile(won) {
    const c = SparState._matchCollector;
    if (!c || c.samples < 3) { SparState._matchCollector = null; return; }
    if (typeof sparLearning === 'undefined') { SparState._matchCollector = null; return; }

    const enemyBot1v1 = SparState.teamB[0] && SparState.teamB[0].member;

    // Skip player profile learning during automated training — training bots
    // have scripted behavior that would pollute human-player telemetry.
    // We still update the general reinforcement buckets so bulk sims keep
    // teaching the bot broad meta/style preferences.
    if (typeof _isSparTraining === 'function' && _isSparTraining()) {
      const scopes = (typeof _isSparSelfPlay === 'function' && _isSparSelfPlay())
        ? ['general', 'selfPlay']
        : ['general'];
      this._updateMatchReinforcement(won, c, enemyBot1v1, scopes);
      SparState._matchCollector = null;
      return;
    }

    const alpha = 0.72; // EMA weight for new data — fast personal adaptation
    const ema = (oldVal, newVal) => alpha * newVal + (1 - alpha) * oldVal;
    const sl = sparLearning;

    sl.matchCount++;

    // --- Opening analysis ---
    if (c.openingFrames.length > 5) {
      const first = c.openingFrames[0];
      const last = c.openingFrames[c.openingFrames.length - 1];
      const dyOpening = last.y - first.y;
      const dxOpening = last.x - first.x;
      // rushBottom: did player move downward (positive Y = down)?
      const rushed = dyOpening > 30 ? 1 : (dyOpening > 0 ? 0.5 : 0);
      sl.opening.rushBottom = ema(sl.opening.rushBottom, rushed);

      // Strafe bias: average horizontal velocity direction
      let leftFrames = 0, totalFrames = 0;
      for (const f of c.openingFrames) {
        if (Math.abs(f.vx) > 0.5) {
          totalFrames++;
          if (f.vx < 0) leftFrames++;
        }
      }
      if (totalFrames > 3) {
        sl.opening.strafeLeft = ema(sl.opening.strafeLeft, leftFrames / totalFrames);
      }

      // v3: Classify opening route
      const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaW = arenaLevel ? arenaLevel.widthTiles * TILE : 1;
      const arenaH = arenaLevel ? arenaLevel.heightTiles * TILE : 1;
      const endNormX = last.x / arenaW;
      const endNormY = last.y / arenaH;
      let route = 'midFlank';
      if (endNormY > 0.6) {
        // Went to bottom — which side?
        if (endNormX < 0.4) route = 'bottomLeft';
        else if (endNormX > 0.6) route = 'bottomRight';
        else route = 'bottomCenter';
      } else if (endNormY < 0.35) {
        route = 'topHold';
      }
      sl.opening.route = route;
      if (sl.opening.routeCounts[route] !== undefined) sl.opening.routeCounts[route]++;

      // Speed commitment: how much of max distance did player cover?
      const totalDist = Math.sqrt(dxOpening * dxOpening + dyOpening * dyOpening);
      const maxPossible = SPAR_CONFIG.BOT_SPEED * c.openingFrames.length * 6; // 6 frames per sample
      sl.opening.speedPct = ema(sl.opening.speedPct, Math.min(1, totalDist / Math.max(1, maxPossible)));

      // First shot timing
      if (c.firstShotFrame > 0) {
        sl.opening.firstShotFrame = ema(sl.opening.firstShotFrame, c.firstShotFrame);
      }
      // Shoots during opening?
      sl.opening.shootsDuringOpening = ema(sl.opening.shootsDuringOpening, c.openingShotCount > 0 ? 1 : 0);

      // Did player actually secure bottom by end of opening?
      if (c.botYAtOpeningEnd > 0) {
        const gotBottom = last.y > c.botYAtOpeningEnd + Math.max(12, this._getSparBottomGap() - 8) ? 1 : 0;
        sl.opening.takesBottomPct = ema(sl.opening.takesBottomPct, gotBottom);
      }
    }

    // --- Bot opening results ---
    if (sl.botOpenings && SparState._botOpeningRoute) {
      const bRoute = SparState._botOpeningRoute;
      const rr = sl.botOpenings.routeResults[bRoute];
      if (rr) {
        if (typeof rr.failStreak !== 'number') rr.failStreak = 0;
        rr.total++;
        if (won) {
          rr.losses++;
          rr.failStreak++;
        } else {
          rr.wins++;
          rr.failStreak = 0;
        }
        // Did bot get bottom at END OF OPENING (frame ~180), not match end
        if (c.botYAtOpeningEnd > 0 && c.playerYAtOpeningEnd > 0) {
          if (c.botYAtOpeningEnd > c.playerYAtOpeningEnd + Math.max(12, this._getSparBottomGap() - 8)) rr.gotBottom++;
        }
      }
      sl.botOpenings.lastRoute = bRoute;
    }

    // --- Position bias ---
    sl.position.bottomBias = ema(sl.position.bottomBias, c.posYSum / c.samples);
    sl.position.leftBias = ema(sl.position.leftBias, 1 - c.posXSum / c.samples);

    // --- Shooting directions ---
    const totalShots = c.shotDirs.up + c.shotDirs.down + c.shotDirs.left + c.shotDirs.right;
    if (totalShots > 5) {
      sl.shooting.upPct = ema(sl.shooting.upPct, c.shotDirs.up / totalShots);
      sl.shooting.downPct = ema(sl.shooting.downPct, c.shotDirs.down / totalShots);
      sl.shooting.leftPct = ema(sl.shooting.leftPct, c.shotDirs.left / totalShots);
      sl.shooting.rightPct = ema(sl.shooting.rightPct, c.shotDirs.right / totalShots);
    }

    // --- Dodge bias ---
    const dodgeHTotal = c.dodgeLeftCount + c.dodgeRightCount;
    if (dodgeHTotal > 3) {
      sl.dodging.leftBias = ema(sl.dodging.leftBias, c.dodgeLeftCount / dodgeHTotal);
    }
    const dodgeVTotal = c.dodgeUpCount + c.dodgeDownCount;
    if (dodgeVTotal > 3) {
      sl.dodging.upBias = ema(sl.dodging.upBias, c.dodgeUpCount / dodgeVTotal);
    }

    // --- Aggression ---
    // Overall: based on average distance (closer = more aggressive)
    if (c.distSamples.length > 5) {
      const avgDist = c.distSamples.reduce((a, b) => a + b, 0) / c.distSamples.length;
      // Normalize: 0 dist = 1.0 aggression, 500+ dist = 0.0
      const aggrVal = Math.max(0, Math.min(1, 1 - avgDist / 500));
      sl.aggression.overall = ema(sl.aggression.overall, aggrVal);
    }
    if (c.aggrOnReloadTotal > 3) {
      sl.aggression.onEnemyReload = ema(sl.aggression.onEnemyReload, c.aggrOnReload / c.aggrOnReloadTotal);
    }
    if (c.lowHpTotalFrames > 3) {
      sl.aggression.whenLowHp = ema(sl.aggression.whenLowHp, c.lowHpAggrFrames / c.lowHpTotalFrames);
    }

    // --- Reload position ---
    if (c.reloadYSamples.length > 2) {
      const avgReloadY = c.reloadYSamples.reduce((a, b) => a + b, 0) / c.reloadYSamples.length;
      sl.reload.avgNormalizedY = ema(sl.reload.avgNormalizedY, avgReloadY);
    }

    // --- Situational / relational learning (v2) ---

    // When player has bottom: holding, pushing, shot frequency
    if (c.hasBottom_frames > 5) {
      sl.whenHasBottom.holdsPct = ema(sl.whenHasBottom.holdsPct, c.hasBottom_holdFrames / c.hasBottom_frames);
      sl.whenHasBottom.pushPct = ema(sl.whenHasBottom.pushPct, c.hasBottom_pushFrames / c.hasBottom_frames);
      // Shot frequency: shots per frame while having bottom (normalized 0-1, cap at ~0.2 shots/frame)
      const shotFreq = Math.min(1, (c.hasBottom_shots / c.hasBottom_frames) / 0.2);
      sl.whenHasBottom.shotFreq = ema(sl.whenHasBottom.shotFreq, shotFreq);
    }

    // When bot has bottom: retake, flank, retreat
    if (c.botBottom_frames > 5) {
      sl.whenBotHasBottom.retakePct = ema(sl.whenBotHasBottom.retakePct, c.botBottom_retakeFrames / c.botBottom_frames);
      sl.whenBotHasBottom.flankPct = ema(sl.whenBotHasBottom.flankPct, c.botBottom_flankFrames / c.botBottom_frames);
      sl.whenBotHasBottom.retreatPct = ema(sl.whenBotHasBottom.retreatPct, c.botBottom_retreatFrames / c.botBottom_frames);
    }

    // When bot approaches: hold ground, counter-push, sidestep
    if (c.botApproach_frames > 5) {
      sl.whenBotApproaches.holdGroundPct = ema(sl.whenBotApproaches.holdGroundPct, c.botApproach_holdFrames / c.botApproach_frames);
      sl.whenBotApproaches.counterPushPct = ema(sl.whenBotApproaches.counterPushPct, c.botApproach_counterFrames / c.botApproach_frames);
      sl.whenBotApproaches.sidestepPct = ema(sl.whenBotApproaches.sidestepPct, c.botApproach_sidestepFrames / c.botApproach_frames);
    }

    // When bot retreats: chase, shot frequency
    if (c.botRetreat_frames > 5) {
      sl.whenBotRetreats.chasePct = ema(sl.whenBotRetreats.chasePct, c.botRetreat_chaseFrames / c.botRetreat_frames);
      const chaseShots = Math.min(1, (c.botRetreat_shots / c.botRetreat_frames) / 0.2);
      sl.whenBotRetreats.shotFreq = ema(sl.whenBotRetreats.shotFreq, chaseShots);
    }

    // Shot direction by relative position
    if (c.shotWhenAbove.total > 3) {
      sl.shotByPosition.whenAbove.downPct = ema(sl.shotByPosition.whenAbove.downPct, c.shotWhenAbove.down / c.shotWhenAbove.total);
      sl.shotByPosition.whenAbove.sidePct = ema(sl.shotByPosition.whenAbove.sidePct, c.shotWhenAbove.side / c.shotWhenAbove.total);
    }
    if (c.shotWhenBelow.total > 3) {
      sl.shotByPosition.whenBelow.upPct = ema(sl.shotByPosition.whenBelow.upPct, c.shotWhenBelow.up / c.shotWhenBelow.total);
      sl.shotByPosition.whenBelow.sidePct = ema(sl.shotByPosition.whenBelow.sidePct, c.shotWhenBelow.side / c.shotWhenBelow.total);
    }
    if (c.shotWhenLevel.total > 3) {
      sl.shotByPosition.whenLevel.leftPct = ema(sl.shotByPosition.whenLevel.leftPct, c.shotWhenLevel.left / c.shotWhenLevel.total);
      sl.shotByPosition.whenLevel.rightPct = ema(sl.shotByPosition.whenLevel.rightPct, c.shotWhenLevel.right / c.shotWhenLevel.total);
    }

    // --- Combat outcomes (v2) ---
    // Player shot accuracy by context
    const pH = c.playerHits, pM = c.playerMisses;
    const pTotal = pH.length + pM.length;
    if (pTotal > 3) {
      sl.playerShots.hitRate = ema(sl.playerShots.hitRate, pH.length / pTotal);

      // By distance
      const closeH = pH.filter(r => r.dist < 150).length;
      const closeM = pM.filter(r => r.dist < 150).length;
      if (closeH + closeM > 2) sl.playerShots.hitRateClose = ema(sl.playerShots.hitRateClose, closeH / (closeH + closeM));

      const midH = pH.filter(r => r.dist >= 150 && r.dist < 300).length;
      const midM = pM.filter(r => r.dist >= 150 && r.dist < 300).length;
      if (midH + midM > 2) sl.playerShots.hitRateMid = ema(sl.playerShots.hitRateMid, midH / (midH + midM));

      const farH = pH.filter(r => r.dist >= 300).length;
      const farM = pM.filter(r => r.dist >= 300).length;
      if (farH + farM > 2) sl.playerShots.hitRateFar = ema(sl.playerShots.hitRateFar, farH / (farH + farM));

      // By bot movement state
      const strafH = pH.filter(r => r.tMovement === 'strafe').length;
      const strafM = pM.filter(r => r.tMovement === 'strafe').length;
      if (strafH + strafM > 2) sl.playerShots.hitWhenBotStrafing = ema(sl.playerShots.hitWhenBotStrafing, strafH / (strafH + strafM));

      const stillH = pH.filter(r => r.tMovement === 'still').length;
      const stillM = pM.filter(r => r.tMovement === 'still').length;
      if (stillH + stillM > 2) sl.playerShots.hitWhenBotStill = ema(sl.playerShots.hitWhenBotStill, stillH / (stillH + stillM));

      const apprH = pH.filter(r => r.tMovement === 'approach').length;
      const apprM = pM.filter(r => r.tMovement === 'approach').length;
      if (apprH + apprM > 2) sl.playerShots.hitWhenBotApproach = ema(sl.playerShots.hitWhenBotApproach, apprH / (apprH + apprM));

      const retH = pH.filter(r => r.tMovement === 'retreat').length;
      const retM = pM.filter(r => r.tMovement === 'retreat').length;
      if (retH + retM > 2) sl.playerShots.hitWhenBotRetreat = ema(sl.playerShots.hitWhenBotRetreat, retH / (retH + retM));
    }

    // Bot shot accuracy
    const bH = c.botHits, bM = c.botMisses;
    const bTotal = bH.length + bM.length;
    if (bTotal > 3) {
      sl.botShots.hitRate = ema(sl.botShots.hitRate, bH.length / bTotal);

      const dodged = bM.filter(r => r.tMovement !== 'still').length;
      if (bTotal > 5) sl.botShots.dodgedRate = ema(sl.botShots.dodgedRate, dodged / bTotal);

      const pStrafH = bH.filter(r => r.tMovement === 'strafe').length;
      const pStrafT = pStrafH + bM.filter(r => r.tMovement === 'strafe').length;
      if (pStrafT > 2) sl.botShots.hitWhenPlayerStrafing = ema(sl.botShots.hitWhenPlayerStrafing, pStrafH / pStrafT);

      const pStillH = bH.filter(r => r.tMovement === 'still').length;
      const pStillT = pStillH + bM.filter(r => r.tMovement === 'still').length;
      if (pStillT > 2) sl.botShots.hitWhenPlayerStill = ema(sl.botShots.hitWhenPlayerStill, pStillH / pStillT);

      const pApprH = bH.filter(r => r.tMovement === 'approach').length;
      const pApprT = pApprH + bM.filter(r => r.tMovement === 'approach').length;
      if (pApprT > 2) sl.botShots.hitWhenPlayerApproach = ema(sl.botShots.hitWhenPlayerApproach, pApprH / pApprT);
    }

    // Combat patterns
    if (pH.length > 2) {
      const avgPDist = pH.reduce((s, r) => s + r.dist, 0) / pH.length;
      sl.combatPatterns.playerHitDist = ema(sl.combatPatterns.playerHitDist, avgPDist);
    }
    if (bH.length > 2) {
      const avgBDist = bH.reduce((s, r) => s + r.dist, 0) / bH.length;
      sl.combatPatterns.botHitDist = ema(sl.combatPatterns.botHitDist, avgBDist);
    }

    // Damage while having bottom
    const pDmgTotal = c.playerDmgFrames.reduce((s, f) => s + f.dmg, 0);
    const pDmgBottom = c.playerDmgFrames.filter(f => f.hasBottom).reduce((s, f) => s + f.dmg, 0);
    if (pDmgTotal > 0) {
      sl.combatPatterns.playerDmgWhenHasBottom = ema(sl.combatPatterns.playerDmgWhenHasBottom, pDmgBottom / pDmgTotal);
    }
    const bDmgTotal = c.botDmgFrames.reduce((s, f) => s + f.dmg, 0);
    const bDmgBottom = c.botDmgFrames.filter(f => f.hasBottom).reduce((s, f) => s + f.dmg, 0);
    if (bDmgTotal > 0) {
      sl.combatPatterns.botDmgWhenHasBottom = ema(sl.combatPatterns.botDmgWhenHasBottom, bDmgBottom / bDmgTotal);
    }

    // Trade ratio: when both deal damage within 30 frames of each other
    let tradePlayerDmg = 0, tradeBotDmg = 0;
    for (const pf of c.playerDmgFrames) {
      for (const bf of c.botDmgFrames) {
        if (Math.abs(pf.frame - bf.frame) <= 30) {
          tradePlayerDmg += pf.dmg;
          tradeBotDmg += bf.dmg;
          break;
        }
      }
    }
    if (tradePlayerDmg + tradeBotDmg > 0) {
      sl.combatPatterns.tradeRatio = ema(sl.combatPatterns.tradeRatio, tradePlayerDmg / (tradePlayerDmg + tradeBotDmg));
    }

    // --- Phase 1e: Circumstance EMA updates ---
    if (!sl.afterHit) sl.afterHit = { pressesAdvantage: 0.5, retreatsOnDamage: 0.5 };
    if (!sl.lowHpExpanded) sl.lowHpExpanded = { fleesPct: 0.5, killAttemptPct: 0.5 };
    if (!sl.chasePatterns) sl.chasePatterns = { giveUpFrames: 90 };
    if (!sl.nearWall) sl.nearWall = { cornerStuckPct: 0.3 };

    if (c.afterHit_frames > 3) {
      sl.afterHit.pressesAdvantage = ema(sl.afterHit.pressesAdvantage, c.afterHit_aggrFrames / c.afterHit_frames);
    }
    if (c.afterTookHit_frames > 3) {
      sl.afterHit.retreatsOnDamage = ema(sl.afterHit.retreatsOnDamage, c.afterTookHit_retreatFrames / c.afterTookHit_frames);
    }
    if (c.lowHpTotalFrames > 3) {
      const flees = c.lowHp_fleeFrames / c.lowHpTotalFrames;
      sl.lowHpExpanded.fleesPct = ema(sl.lowHpExpanded.fleesPct, flees);
      sl.lowHpExpanded.killAttemptPct = ema(sl.lowHpExpanded.killAttemptPct, 1 - flees);
    }
    if (c.chase_frames > 10) {
      const giveUpRate = c.chase_giveUpFrames / c.chase_frames;
      sl.chasePatterns.giveUpFrames = ema(sl.chasePatterns.giveUpFrames, giveUpRate > 0.1 ? c.chase_frames : 180);
    }
    if (c.nearWall_frames > 5) {
      sl.nearWall.cornerStuckPct = ema(sl.nearWall.cornerStuckPct, c.nearWall_cornerStuckFrames / c.nearWall_frames);
    }

    // --- Position value: how well does the bot perform from bottom vs top? ---
    if (!sl.positionValue) sl.positionValue = { bottomWinCorrelation: 0.6, topPenalty: 0.3 };
    const totalSampleFrames = c.botHasBottom_frames + c.botInTop_frames;
    if (totalSampleFrames > 10) {
      // bottomWinCorrelation: did having bottom predict the match outcome?
      // Bot had bottom + bot won → bottom helps (1.0)
      // Bot had NO bottom + bot lost → bottom matters (1.0)
      // Bot had bottom + bot lost → bottom didn't help (0.0)
      // Bot had NO bottom + bot won → bottom doesn't matter (0.0)
      const botWon = !won;
      const botHadBottom = c.botHasBottom_frames / (c.samples || 1) > 0.3;
      const bottomPredictedOutcome = (botHadBottom === botWon) ? 1.0 : 0.0;
      sl.positionValue.bottomWinCorrelation = ema(sl.positionValue.bottomWinCorrelation, bottomPredictedOutcome);
      // topPenalty: how much time in top half when bot loses
      const topPct = c.botInTop_frames / (c.samples || 1);
      sl.positionValue.topPenalty = ema(sl.positionValue.topPenalty,
        botWon ? 0 : topPct);
    }

    // --- Gun side preference (v4) ---
    if (!sl.gunSide) sl.gunSide = { playerPreference: 'left', leftPct: 1.0 };
    const gsTotal = c.playerGunSideSamples.left + c.playerGunSideSamples.right;
    if (gsTotal > 3) {
      const leftPct = c.playerGunSideSamples.left / gsTotal;
      sl.gunSide.leftPct = ema(sl.gunSide.leftPct, leftPct);
      sl.gunSide.playerPreference = sl.gunSide.leftPct > 0.5 ? 'left' : 'right';
    }

    // --- Hitbox awareness: directional hit rates (v4) ---
    if (!sl.hitboxAwareness) sl.hitboxAwareness = { playerHorizHitRate: 0.1, playerVertHitRate: 0.05, botHorizHitRate: 0.1, botVertHitRate: 0.05, peekSuccessRate: 0.5 };
    const phDir = c.hitsByBulletDir;
    if (phDir.horiz.total > 2) sl.hitboxAwareness.playerHorizHitRate = ema(sl.hitboxAwareness.playerHorizHitRate, phDir.horiz.hits / phDir.horiz.total);
    if (phDir.vert.total > 2) sl.hitboxAwareness.playerVertHitRate = ema(sl.hitboxAwareness.playerVertHitRate, phDir.vert.hits / phDir.vert.total);
    const bhDir = c.botHitsByBulletDir;
    if (bhDir.horiz.total > 2) sl.hitboxAwareness.botHorizHitRate = ema(sl.hitboxAwareness.botHorizHitRate, bhDir.horiz.hits / bhDir.horiz.total);
    if (bhDir.vert.total > 2) sl.hitboxAwareness.botVertHitRate = ema(sl.hitboxAwareness.botVertHitRate, bhDir.vert.hits / bhDir.vert.total);
    if (c.peekAttempts > 2) sl.hitboxAwareness.peekSuccessRate = ema(sl.hitboxAwareness.peekSuccessRate, c.peekHits / c.peekAttempts);

    // --- Rhythm profile updates (v10) ---
    if (!sl.rhythm) sl.rhythm = { avgShotDelay: 8, avgRetreatDelay: 12, avgReEngageDelay: 30, shootsEarlyPct: 0.5, crossesAfterBottomLoss: 0.5, repeeksQuickly: 0.5, retreatsSameSide: 0.5 };
    if (c.rhythm_shotAfterLos && c.rhythm_shotAfterLos.length > 2) {
      const avgDelay = c.rhythm_shotAfterLos.reduce((a, b) => a + b, 0) / c.rhythm_shotAfterLos.length;
      sl.rhythm.avgShotDelay = ema(sl.rhythm.avgShotDelay, avgDelay);
    }
    if (c.rhythm_postShotRetreat && c.rhythm_postShotRetreat.length > 2) {
      const avgDelay = c.rhythm_postShotRetreat.reduce((a, b) => a + b, 0) / c.rhythm_postShotRetreat.length;
      sl.rhythm.avgRetreatDelay = ema(sl.rhythm.avgRetreatDelay, avgDelay);
    }
    if (c.rhythm_reEngageDelays && c.rhythm_reEngageDelays.length > 1) {
      const avgDelay = c.rhythm_reEngageDelays.reduce((a, b) => a + b, 0) / c.rhythm_reEngageDelays.length;
      sl.rhythm.avgReEngageDelay = ema(sl.rhythm.avgReEngageDelay, avgDelay);
    }
    if (c.rhythm_shotAlignQuality && c.rhythm_shotAlignQuality.length > 3) {
      const earlyPct = c.rhythm_shotAlignQuality.filter(q => q < 0.4).length / c.rhythm_shotAlignQuality.length;
      sl.rhythm.shootsEarlyPct = ema(sl.rhythm.shootsEarlyPct, earlyPct);
    }
    if (c.rhythm_bottomLostTotal > 0) {
      sl.rhythm.crossesAfterBottomLoss = ema(sl.rhythm.crossesAfterBottomLoss, c.rhythm_bottomLostCrosses / c.rhythm_bottomLostTotal);
    }
    const totalRetreats = c.rhythm_retreatSameSide + c.rhythm_retreatCrossSide;
    if (totalRetreats > 1) {
      sl.rhythm.retreatsSameSide = ema(sl.rhythm.retreatsSameSide, c.rhythm_retreatSameSide / totalRetreats);
    }
    if (c.rhythm_peekReEngageFrames && c.rhythm_peekReEngageFrames.length > 1) {
      const quickPeeks = c.rhythm_peekReEngageFrames.filter(f => f < 30).length;
      sl.rhythm.repeeksQuickly = ema(sl.rhythm.repeeksQuickly, quickPeeks / c.rhythm_peekReEngageFrames.length);
    }

    // --- Win rate ---
    sl.winRate = ema(sl.winRate, won ? 1 : 0);

    // --- Match history (cap at 20) ---
    sl.history.push({
      won: won,
      matchTimer: SparState.matchTimer,
      shots: totalShots,
      bottomBias: c.samples > 0 ? c.posYSum / c.samples : 0.5,
      ts: Date.now(),
    });
    if (sl.history.length > 20) sl.history = sl.history.slice(-20);

    // --- Phase 2e: Style result tracking ---
    // Find the enemy bot's duel style for this match
    if (enemyBot1v1 && enemyBot1v1.ai._duelStyle) {
      const style = enemyBot1v1.ai._duelStyle;
      // Ensure structure exists
      if (!sl.general1v1) sl.general1v1 = { styleResults: {} };
      if (!sl.general1v1.styleResults) sl.general1v1.styleResults = {};
      if (!sl.general1v1.styleResults[style]) {
        sl.general1v1.styleResults[style] = { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 };
      }
      const sr = sl.general1v1.styleResults[style];
      sr.total++;
      if (won) sr.losses++; else sr.wins++; // won = player won, so bot lost
      // Damage delta: bot damage dealt minus taken
      const dmgDelta = (enemyBot1v1.ai._matchDmgDealt || 0) - (enemyBot1v1.ai._matchDmgTaken || 0);
      sr.avgDmgDelta = sr.total > 1 ? ema(sr.avgDmgDelta, dmgDelta) : dmgDelta;

      // Player-specific style results (training is already early-returned above)
      if (!sl.player1v1) sl.player1v1 = { styleResults: {} };
      if (!sl.player1v1.styleResults) sl.player1v1.styleResults = {};
      if (!sl.player1v1.styleResults[style]) {
        sl.player1v1.styleResults[style] = { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 };
      }
      const jr = sl.player1v1.styleResults[style];
      jr.total++;
      if (won) jr.losses++; else jr.wins++;
      jr.avgDmgDelta = jr.total > 1 ? ema(jr.avgDmgDelta, dmgDelta) : dmgDelta;
    }

    this._updateMatchReinforcement(won, c, enemyBot1v1, ['general', 'player']);

    // v8: persist trap zone data with decay
    if (c.trapZoneFrames && sl.tactical && sl.tactical.trapZones) {
      for (const zone of ['center', 'near', 'wide']) {
        const tz = sl.tactical.trapZones[zone];
        // Decay old data to weight recent matches (0.95 per match)
        tz.hits *= 0.95;
        tz.frames *= 0.95;
        // Add this match's data
        tz.hits += c.trapZoneHits[zone] || 0;
        tz.frames += c.trapZoneFrames[zone] || 0;
      }
    }

    // v8: persist opening-lost-bottom direction
    if (c.openingBottomLostDir && sl.tactical && sl.tactical.openingLostBottom) {
      const olb = sl.tactical.openingLostBottom;
      olb.totalLosses++;
      if (c.openingBottomLostDir === 'left') olb.fromLeft++;
      else if (c.openingBottomLostDir === 'right') olb.fromRight++;
      else olb.fromCenter++;
    }

    // v8: decay all tactic fail streaks by 1 per match (prevent permanent lockout)
    if (sl.tactical && sl.tactical.tacticFailStreaks) {
      const tKeys = typeof SPAR_ANTI_BOTTOM_TACTIC_KEYS !== 'undefined'
        ? SPAR_ANTI_BOTTOM_TACTIC_KEYS
        : Object.keys(sl.tactical.tacticFailStreaks);
      for (const key of tKeys) {
        if (sl.tactical.tacticFailStreaks[key] > 0) {
          sl.tactical.tacticFailStreaks[key]--;
        }
      }
    }
    if (sl.tactical && sl.tactical.repeekFailStreaks) {
      for (const key of Object.keys(sl.tactical.repeekFailStreaks)) {
        if (sl.tactical.repeekFailStreaks[key] > 0) sl.tactical.repeekFailStreaks[key]--;
      }
    }
    if (sl.tactical && sl.tactical.escapeFailStreaks) {
      for (const key of Object.keys(sl.tactical.escapeFailStreaks)) {
        if (sl.tactical.escapeFailStreaks[key] > 0) sl.tactical.escapeFailStreaks[key]--;
      }
    }

    SparState._matchCollector = null;
  },

  // ---- LEARNING: compute bot behavior modifiers from player profile ----
  _getProfileModifiers() {
    if (typeof sparLearning === 'undefined' || sparLearning.matchCount < 2) {
      return null; // not enough data yet — bot stays fully neutral
    }
    const sl = sparLearning;
    const mc = sl.matchCount;

    // Confidence gating: lower thresholds for fast adaptation
    const hasShootingData = mc >= 3;   // shooting direction bias (high signal)
    const hasPositionData = mc >= 3;   // bottom/position modifiers
    const hasOpeningData = mc >= 2;    // opening route selection (very high signal)
    const hasCombatData = mc >= 4;     // combat outcomes (needs more samples)

    // Opening goal Y: if player rushes bottom, bot should also rush bottom harder
    const openingGoalY = hasOpeningData && sl.opening.rushBottom > 0.6 ? 0.82 : 0.72;

    // Counter player's opening strafe
    const openingStrafeDir = hasOpeningData ? (sl.opening.strafeLeft > 0.6 ? 1 : (sl.opening.strafeLeft < 0.4 ? -1 : 0)) : 0;

    // Aggression multiplier: counter-play (wider range for faster felt impact)
    const aggressionMult = mc >= 2 ? (1.5 - sl.aggression.overall * 1.0) : 1.0; // 0.5 to 1.5

    // Dodge prediction bias
    const dodgePredictBiasX = mc >= 3 ? (sl.dodging.leftBias - 0.5) * 2 : 0; // -1 to 1

    // Preferred X offset: stay off player's shot axis
    const vertShotPct = sl.shooting.upPct + sl.shooting.downPct;
    const horizShotPct = sl.shooting.leftPct + sl.shooting.rightPct;
    const preferredOffsetX = hasShootingData ? (vertShotPct - horizShotPct) * 0.5 : 0; // -0.5 to 0.5

    // Strafe speed: based on win rate (losing = speed up, NEVER exceed player speed)
    const strafeSpeedMult = Math.min(1.0, 1.25 - sl.winRate * 0.5); // 0.75 to 1.0

    // --- Situational modifiers (v2) ---

    // Situational modifiers — gated until position data available
    // When we have bottom and player tries to retake:
    const playerRetakes = hasPositionData ? sl.whenBotHasBottom.retakePct : 0;
    const playerFlanks = hasPositionData ? sl.whenBotHasBottom.flankPct : 0;
    const playerRetreats = hasPositionData ? sl.whenBotHasBottom.retreatPct : 0;

    // When player has bottom:
    const playerHoldsBottom = hasPositionData ? sl.whenHasBottom.holdsPct : 0;
    const playerWallsFromBottom = hasPositionData ? sl.whenHasBottom.shotFreq : 0;
    const playerPushesFromBottom = hasPositionData ? sl.whenHasBottom.pushPct : 0;

    // When bot approaches: does player stand or run?
    const playerHoldsOnApproach = hasPositionData ? sl.whenBotApproaches.holdGroundPct : 0;
    const playerCounterPushes = hasPositionData ? sl.whenBotApproaches.counterPushPct : 0;
    const playerSidesteps = hasPositionData ? sl.whenBotApproaches.sidestepPct : 0;

    // When bot retreats: does player chase?
    const playerChases = hasPositionData ? sl.whenBotRetreats.chasePct : 0;

    // Shot patterns by position: which direction to avoid from each angle
    const aboveShootsDown = hasShootingData ? sl.shotByPosition.whenAbove.downPct : 0.5;
    const belowShootsUp = hasShootingData ? sl.shotByPosition.whenBelow.upPct : 0.5;
    const levelShootsLeft = hasShootingData ? sl.shotByPosition.whenLevel.leftPct : 0.5;

    // --- Combat outcome modifiers ---
    const ps = sl.playerShots;
    const bs = sl.botShots;
    const cp = sl.combatPatterns;
    // hasCombatData already set above in confidence gating

    // Player's best range: where they're most accurate → bot should avoid that distance
    let bestRange = 'mid';
    let preferredDist = 220; // neutral default
    if (hasCombatData) {
      const ranges = [
        { name: 'close', rate: ps.hitRateClose, dist: 120 },
        { name: 'mid', rate: ps.hitRateMid, dist: 220 },
        { name: 'far', rate: ps.hitRateFar, dist: 350 },
      ];
      ranges.sort((a, b) => a.rate - b.rate); // lowest accuracy first
      bestRange = ranges[0].name;
      preferredDist = ranges[0].dist;
    }

    // What bot movement is hardest for player to hit?
    let botMoveEffectiveness = { strafe: 0.5, still: 0.5, approach: 0.5, retreat: 0.5 };
    let bestEvasion = 'strafe'; // neutral default
    if (hasCombatData) {
      botMoveEffectiveness = {
        strafe: 1 - ps.hitWhenBotStrafing,
        still: 1 - ps.hitWhenBotStill,
        approach: 1 - ps.hitWhenBotApproach,
        retreat: 1 - ps.hitWhenBotRetreat,
      };
      let bestEvasionVal = botMoveEffectiveness.strafe;
      for (const [k, v] of Object.entries(botMoveEffectiveness)) {
        if (v > bestEvasionVal) { bestEvasion = k; bestEvasionVal = v; }
      }
    }

    // What player movement is hardest for bot to hit?
    const playerWorstToHit = {
      strafe: bs.hitWhenPlayerStrafing,
      still: bs.hitWhenPlayerStill,
      approach: bs.hitWhenPlayerApproach,
    };

    // Should bot avoid trades? If player wins trades consistently
    const avoidTrades = hasCombatData ? cp.tradeRatio > 0.6 : false;

    // Bottom value: does having bottom actually help?
    const bottomMatters = hasCombatData ? cp.playerDmgWhenHasBottom > 0.5 : true;

    return {
      openingGoalY,
      openingStrafeDir,
      aggressionMult,
      dodgePredictBiasX,
      preferredOffsetX,
      strafeSpeedMult,
      // v2 situational
      playerRetakes,
      playerFlanks,
      playerRetreats,
      playerHoldsBottom,
      playerWallsFromBottom,
      playerPushesFromBottom,
      playerHoldsOnApproach,
      playerCounterPushes,
      playerSidesteps,
      playerChases,
      aboveShootsDown,
      belowShootsUp,
      levelShootsLeft,
      // v2 combat outcomes
      preferredDist,        // ideal engagement distance (avoid player's best range)
      bestEvasion,          // what movement makes player miss most (strafe/still/approach/retreat)
      botMoveEffectiveness, // full breakdown of evasion effectiveness
      avoidTrades,          // should bot avoid mutual damage exchanges?
      bottomMatters,        // is bottom position actually decisive?
      playerHitRate: ps.hitRate, // overall player accuracy
      // Phase 1e circumstance modifiers — gated until enough data
      playerPressesAfterHit: hasPositionData && sl.afterHit ? sl.afterHit.pressesAdvantage : 0.5,
      playerRetreatsOnDamage: hasPositionData && sl.afterHit ? sl.afterHit.retreatsOnDamage : 0.5,
      playerFleesLowHp: hasPositionData && sl.lowHpExpanded ? sl.lowHpExpanded.fleesPct : 0.5,
      playerChaseEndurance: hasPositionData && sl.chasePatterns ? sl.chasePatterns.giveUpFrames : 90,
      // Position value — how important is bottom? (defaults favor bottom)
      bottomWinCorrelation: hasPositionData && sl.positionValue ? sl.positionValue.bottomWinCorrelation : 0.7,
      topPenalty: hasPositionData && sl.positionValue ? sl.positionValue.topPenalty : 0.4,
      // Gun side + hitbox awareness (v4) — need 5+ matches for reliable data
      playerGunSide: hasShootingData && sl.gunSide ? sl.gunSide.playerPreference : 'left',
      playerLeftPct: hasShootingData && sl.gunSide ? sl.gunSide.leftPct : 0.5,
      horizShotAdvantage: hasShootingData && sl.hitboxAwareness ?
        (sl.hitboxAwareness.botHorizHitRate || 0.1) / Math.max(0.01, sl.hitboxAwareness.botVertHitRate || 0.05) : 1.0,
      peekEffective: hasShootingData && sl.hitboxAwareness ? sl.hitboxAwareness.peekSuccessRate > 0.3 : true,
      // Rhythm modifiers (v10)
      playerShootsFast: sl.rhythm ? sl.rhythm.avgShotDelay < 6 : false,
      playerShotDelay: sl.rhythm ? sl.rhythm.avgShotDelay : 8,
      playerRetreatDelay: sl.rhythm ? sl.rhythm.avgRetreatDelay : 12,
      playerReEngageDelay: sl.rhythm ? sl.rhythm.avgReEngageDelay : 30,
      playerShootsEarly: sl.rhythm ? sl.rhythm.shootsEarlyPct > 0.5 : false,
      playerCrossesAfterBottomLoss: sl.rhythm ? sl.rhythm.crossesAfterBottomLoss : 0.5,
      playerRepeeksQuickly: sl.rhythm ? sl.rhythm.repeeksQuickly > 0.5 : false,
      playerRetreatsSameSide: sl.rhythm ? sl.rhythm.retreatsSameSide : 0.5,
      // v8 trap zone danger rates
      trapZoneDanger: sl.tactical && sl.tactical.trapZones ? (() => {
        const tz = sl.tactical.trapZones;
        const danger = {};
        for (const zone of ['center', 'near', 'wide']) {
          const z = tz[zone];
          danger[zone] = z && z.frames > 30 ? z.hits / z.frames : 0;
        }
        return danger;
      })() : { center: 0, near: 0, wide: 0 },
      badLanePunishRate: sl.tactical && sl.tactical.gunSidePunish && sl.tactical.gunSidePunish.attempts > 0
        ? sl.tactical.gunSidePunish.punished / sl.tactical.gunSidePunish.attempts : 0,
      escapeSuccessRate: sl.tactical && sl.tactical.escapeOutcomes && sl.tactical.escapeOutcomes.attempts > 0
        ? sl.tactical.escapeOutcomes.resolved / sl.tactical.escapeOutcomes.attempts : 0,
      laneFailStreaks: sl.tactical && sl.tactical.repeekFailStreaks ? sl.tactical.repeekFailStreaks
        : { center: 0, left: 0, right: 0, topLeft: 0, topRight: 0 },
    };
  },

  // ---- OPENING ROUTE SELECTION ----
  // Pick the best opening route based on learning data
  _pickBotOpeningRoute(pm, arenaW, arenaH) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;

    // Available routes — bottom is meta, so bottom routes are default
    const routes = ['bottomCenter', 'bottomLeft', 'bottomRight', 'topHold', 'midFlank', 'mirrorPlayer'];

    // Not enough data — still favor bottom, but don't lock out all other routes.
    if (!sl || sl.matchCount < 2) {
      const openers = {
        bottomCenter: 0.24,
        bottomLeft: 0.18,
        bottomRight: 0.18,
        midFlank: 0.15,
        mirrorPlayer: 0.15,
        topHold: 0.10,
      };
      return this._pickWeightedScoreChoice(openers);
    }

    // Score each route — WIN RATE IS EVERYTHING
    const scores = {};
    for (const r of routes) scores[r] = 0;
    const rf = sl ? this._ensureReinforcementProfile(sl) : null;
    const pOpeningBuckets = rf && rf.player ? rf.player.opening : null;
    const gOpeningBuckets = rf && rf.general ? rf.general.opening : null;
    const sOpeningBuckets = rf && rf.selfPlay ? rf.selfPlay.opening : null;
    const totalPlayerOpening = this._sumBucketPlays(pOpeningBuckets);
    const totalGeneralOpening = this._sumBucketPlays(gOpeningBuckets);
    const totalSelfPlayOpening = this._sumBucketPlays(sOpeningBuckets);

    // Light priors only. The bot should sample broadly and let outcomes decide.
    scores['bottomCenter'] += 1.6;
    scores['bottomLeft'] += 1.4;
    scores['bottomRight'] += 1.4;
    scores['mirrorPlayer'] += 1.3;
    scores['midFlank'] += 1.3;
    scores['topHold'] += 1.0;

    const rr = sl.botOpenings.routeResults;
    for (const r of routes) {
      const routeRec = rr[r];
      if (routeRec && typeof routeRec.failStreak !== 'number') routeRec.failStreak = 0;
      if (routeRec && routeRec.total > 0) {
        // Win rate dominates scoring
        const winRate = routeRec.wins / routeRec.total;
        scores[r] += winRate * 54;

        // Getting bottom is only slightly valuable — it doesn't help if we still lose
        const bottomRate = routeRec.gotBottom / routeRec.total;
        scores[r] += bottomRate * 3;

        // Penalize routes that consistently LOSE — HARD
        const lossRate = routeRec.losses / routeRec.total;
        scores[r] -= lossRate * 34;

        // Repeated failed starts should get shoved out quickly.
        scores[r] -= routeRec.failStreak * 18;
        if (routeRec.failStreak >= 2) scores[r] -= 18;
        if (routeRec.failStreak >= 3) scores[r] -= 28;

        // Routes with no wins and many attempts: massive penalty
        if (routeRec.wins === 0 && routeRec.total >= 3) {
          scores[r] -= 42;
        }
        // Additional scaling penalty for high-sample losers
        if (routeRec.wins === 0 && routeRec.total >= 5) {
          scores[r] -= routeRec.total * 4;
        }
      } else {
        // Untested routes should actually get sampled.
        scores[r] += 14;
      }

      const playerRewardScore = this._scoreRewardBucket(
        pOpeningBuckets && pOpeningBuckets[r],
        totalPlayerOpening,
        0.25
      );
      const generalRewardScore = this._scoreRewardBucket(
        gOpeningBuckets && gOpeningBuckets[r],
        totalGeneralOpening,
        0.14
      );
      const selfPlayRewardScore = this._scoreRewardBucket(
        sOpeningBuckets && sOpeningBuckets[r],
        totalSelfPlayOpening,
        0.1
      );
      scores[r] += (playerRewardScore - 0.5) * 26;
      scores[r] += (generalRewardScore - 0.5) * 14;
      scores[r] += (selfPlayRewardScore - 0.5) * 10;
    }

    // Counter player's specific route — but not so hard that we collapse into one answer.
    const playerRoute = sl.opening.route;
    if (playerRoute === 'bottomLeft') {
      scores['bottomRight'] += 9;
      scores['midFlank'] += 8;
      scores['mirrorPlayer'] += 5;
    } else if (playerRoute === 'bottomRight') {
      scores['bottomLeft'] += 9;
      scores['midFlank'] += 8;
      scores['mirrorPlayer'] += 5;
    } else if (playerRoute === 'bottomCenter') {
      // Counter center by flanking to a side
      scores['bottomLeft'] += 5;
      scores['bottomRight'] += 5;
      scores['midFlank'] += 10;
      scores['mirrorPlayer'] += 7;
      scores['topHold'] += 3;
    }

    // Variety penalty — repeated routes should drop off fast.
    const lastRoute = sl.botOpenings.lastRoute;
    if (lastRoute) {
      scores[lastRoute] -= 16;
      if (rr[lastRoute] && rr[lastRoute].total >= 3) {
        const lastWinRate = rr[lastRoute].wins / rr[lastRoute].total;
        if (lastWinRate < 0.4) scores[lastRoute] -= 14;
      }
    }

    // If the player heavily rushes bottom, make side counters and mirrors more appealing.
    if (sl.opening && sl.opening.rushBottom > 0.6) {
      scores['midFlank'] += 10;
      scores['mirrorPlayer'] += 8;
      scores['topHold'] += 4;
    }

    // Small randomness for unpredictability
    for (const r of routes) scores[r] += Math.random() * 6;

    // Occasionally force broad exploration so weak habits do not calcify.
    if (Math.random() < 0.24) {
      return routes[Math.floor(Math.random() * routes.length)];
    }

    return this._pickWeightedScoreChoice(scores);
  },

  // ---- LEARNING: called from meleeSystem when a spar bullet hits or misses ----
  _onSparBulletHit(bullet, hitEntity, wasHit) {
    const c = SparState._matchCollector;
    if (!c) return;

    const isPlayerBullet = bullet.sparTeam === 'teamA';
    const isFullBvB = typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot();

    // FullBvB: resolve shooter/target from team arrays (no player global)
    // Then track damage on bot AI, but skip player-centric collector arrays
    let shooter, target;
    if (isFullBvB) {
      // Find shooter from the bullet's own team
      const shooterTeam = isPlayerBullet ? SparState.teamA : SparState.teamB;
      const targetTeam = isPlayerBullet ? SparState.teamB : SparState.teamA;
      let nearS = null, nearDS = Infinity;
      for (const p of shooterTeam) {
        if (!p.alive) continue;
        const d = Math.sqrt((p.entity.x - bullet.startX) ** 2 + (p.entity.y - bullet.startY) ** 2);
        if (d < nearDS) { nearDS = d; nearS = p.entity; }
      }
      shooter = nearS;
      let nearT = null, nearDT = Infinity;
      for (const p of targetTeam) {
        if (!p.alive) continue;
        const d = Math.sqrt((p.entity.x - bullet.x) ** 2 + (p.entity.y - bullet.y) ** 2);
        if (d < nearDT) { nearDT = d; nearT = p.entity; }
      }
      target = nearT;
    } else if (isPlayerBullet) {
      shooter = player;
      let nearBot = null, nearDist = Infinity;
      for (const p of SparState.teamB) {
        if (!p.alive) continue;
        const d = Math.sqrt((p.entity.x - player.x) ** 2 + (p.entity.y - player.y) ** 2);
        if (d < nearDist) { nearDist = d; nearBot = p.entity; }
      }
      target = nearBot;
    } else {
      let nearBot = null, nearDist = Infinity;
      for (const p of SparState.teamB) {
        if (!p.alive) continue;
        const d = Math.sqrt((p.entity.x - bullet.startX) ** 2 + (p.entity.y - bullet.startY) ** 2);
        if (d < nearDist) { nearDist = d; nearBot = p.entity; }
      }
      shooter = nearBot;
      target = player;
    }
    if (!shooter || !target) return;

    const dist = Math.sqrt((shooter.x - target.x) ** 2 + (shooter.y - target.y) ** 2);
    const tVx = target.vx || 0, tVy = target.vy || 0;
    const tSpeed = Math.sqrt(tVx * tVx + tVy * tVy);
    const tMoving = tSpeed > 2;

    // Relative movement: is target strafing, approaching, or retreating?
    const relDx = shooter.x - target.x, relDy = shooter.y - target.y;
    const relDist = Math.sqrt(relDx * relDx + relDy * relDy);
    let tMovement = 'still';
    if (tMoving && relDist > 1) {
      const dot = (tVx * relDx + tVy * relDy) / relDist;
      const perp = Math.abs(tVx * relDy - tVy * relDx) / relDist;
      if (dot > tSpeed * 0.5) tMovement = 'approach';
      else if (dot < -tSpeed * 0.5) tMovement = 'retreat';
      else if (perp > tSpeed * 0.3) tMovement = 'strafe';
    }

    // Who has bottom?
    const shooterHasBottom = shooter.y > target.y + this._getSparBottomGap();

    const bulletDir = Math.abs(bullet.vx) > Math.abs(bullet.vy) ? 'horiz' : 'vert';
    const record = { dist, tMovement, dir: bullet._sparDir || 0, relY: shooter.y - target.y, bulletDir };

    // Phase 1b: Track hit/took-hit frames + damage on bot AI (critical for rewards)
    // Must run for ALL modes including fullBvB
    if (wasHit && !isPlayerBullet) {
      // Bot bullet hit target — find the shooter bot to credit damage
      for (const m of SparState._sparBots) {
        if (m.entity === shooter || m.id === (bullet.ownerId || null)) {
          m.ai._lastHitFrame = SparState.matchTimer;
          m.ai._matchDmgDealt += bullet.damage || 20;
          break;
        }
      }
    }
    if (isPlayerBullet) {
      // TeamA bullet — track on target bot for whiff/repeek detection + damage taken
      for (const m of SparState._sparBots) {
        if (m.entity === target || (m.entity.x === target.x && m.entity.y === target.y)) {
          m.ai._prevEnemyShotFrame = m.ai._lastEnemyShotFrame;
          m.ai._lastEnemyShotFrame = SparState.matchTimer;
          if (!wasHit) m.ai._lastEnemyWhiffFrame = SparState.matchTimer;
          if (wasHit) {
            m.ai._lastTookHitFrame = SparState.matchTimer;
            m.ai._matchDmgTaken += bullet.damage || 20;
          }
          break;
        }
      }
    }

    // FullBvB: damage tracked above, skip player-centric collector arrays below
    if (isFullBvB) return;

    // Player-centric hit/miss tracking (only for human player matches)
    if (isPlayerBullet) {
      if (wasHit) {
        c.playerHits.push(record);
        c.playerDmgFrames.push({ frame: SparState.matchTimer, dmg: bullet.damage || 20, hasBottom: player.y > (target.y + this._getSparBottomGap()) });
      } else {
        c.playerMisses.push(record);
      }
      c.hitsByBulletDir[bulletDir].total++;
      if (wasHit) c.hitsByBulletDir[bulletDir].hits++;
    } else {
      if (wasHit) {
        c.botHits.push(record);
        c.botDmgFrames.push({ frame: SparState.matchTimer, dmg: bullet.damage || 20, hasBottom: shooterHasBottom });
      } else {
        c.botMisses.push(record);
      }
      c.botHitsByBulletDir[bulletDir].total++;
      if (wasHit) c.botHitsByBulletDir[bulletDir].hits++;
      if (shooterHasBottom && bulletDir === 'horiz') {
        c.peekAttempts++;
        if (wasHit) c.peekHits++;
      }
    }
  },

  _tickOneBot(member) {
    const bot = member.entity;
    const team = member._sparTeam;
    const enemies = team === 'teamA' ? SparState.teamB : SparState.teamA;
    const allies = team === 'teamA' ? SparState.teamA : SparState.teamB;
    const ai = member.ai;

    // --- Cache learning profile modifiers (once per match) ---
    // During training/self-play, opponent is synthetic — don't bias with human profile
    const isFullBvB = typeof _isSparFullBotVsBot === 'function' && _isSparFullBotVsBot();
    if (!ai._profileMods && (team === 'teamB' || isFullBvB)) {
      const isTrainingRun = typeof _isSparTraining === 'function' && _isSparTraining();
      ai._profileMods = isTrainingRun ? null : this._getProfileModifiers();
    }
    const pm = ai._profileMods; // may be null

    // Phase 2: Apply duel style weights
    let styleWeights = null;
    if (ai._duelStyle && typeof SPAR_DUEL_STYLES !== 'undefined') {
      styleWeights = SPAR_DUEL_STYLES[ai._duelStyle];
    }

    // --- Arena awareness ---
    const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
    const arenaW = arenaLevel.widthTiles * TILE;
    const arenaH = arenaLevel.heightTiles * TILE;
    const midX = arenaW / 2;
    const midY = arenaH / 2;
    const homeSideX = team === 'teamA' ? arenaW * 0.3 : arenaW * 0.7;

    // --- Target selection (prefer invaders, switch when current dies) ---
    ai.targetTimer--;
    let target = null;
    if (ai.targetId) {
      const prev = enemies.find(p => p.id === ai.targetId && p.alive);
      if (prev) target = prev;
    }
    if (!target || ai.targetTimer <= 0) {
      let bestScore = -Infinity;
      for (const p of enemies) {
        if (!p.alive) continue;
        const pdx = bot.x - p.entity.x, pdy = bot.y - p.entity.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        const onOurSide = team === 'teamA' ? (p.entity.x < midX) : (p.entity.x > midX);
        // Prioritize: invaders > close > low HP
        const hpBonus = (1 - p.entity.hp / p.entity.maxHp) * 150;
        const score = -pdist + (onOurSide ? 400 : 0) + hpBonus;
        if (score > bestScore) { bestScore = score; target = p; }
      }
      if (target) {
        ai.targetId = target.id;
        ai.targetTimer = 60 + Math.floor(Math.random() * 60);
      }
    }
    if (!target) return;

    const tgt = target.entity;
    const dx = tgt.x - bot.x, dy = tgt.y - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // --- Enemy gun side awareness ---
    // Player's gun side from getCurrentGunSide(), bot entities have _gunSide directly
    const enemyGunSide = tgt._gunSide || (typeof getCurrentGunSide === 'function' ? getCurrentGunSide() : 'left');

    // --- Detect enemy state ---
    const enemyMember = target.member;
    // Player has member=null, uses global gun; bots have member.gun
    const enemyReloading = enemyMember ? enemyMember.gun.reloading : (typeof gun !== 'undefined' ? gun.reloading : false);

    // v10: Finalize reload behavior when enemy stops reloading
    if (!enemyReloading && ai._reloadPolicy) {
      const rlDmg = (ai._matchDmgDealt || 0) - (ai._reloadStartDmg || 0);
      this._finalizeReloadBehavior(ai, rlDmg);
    }

    // --- Situational awareness ---
    const hpPct = bot.hp / bot.maxHp;
    const hasAmmo = !member.gun.reloading && member.gun.ammo > 0;
    const speed = bot.speed || SPAR_CONFIG.BOT_SPEED;
    let moveX = 0, moveY = 0;

    // --- Vertical positioning ---
    const bottomGap = this._getSparBottomGap();
    const hasBottom = bot.y > tgt.y + bottomGap;
    const enemyHasBottom = tgt.y > bot.y + bottomGap;
    const enemyMovingDown = tgt.vy > 1;
    const enemyMovingUp = tgt.vy < -1;
    const enemyMovingLeft = tgt.vx < -1;
    const enemyMovingRight = tgt.vx > 1;
    const isOpening = SparState.matchTimer < 180;  // first 3 seconds
    const aimSlack = this._getSparAimSlack();
    const sideOffsetNear = this._getSparSideOffsetNear();
    const alignX = Math.abs(tgt.x - bot.x);
    const nearLeftWallBase = bot.x < TILE * 3;
    const nearRightWallBase = bot.x > arenaW - TILE * 3;
    const nearTopWallBase = bot.y < TILE * 3;
    const nearBottomWallBase = bot.y > arenaH - TILE * 3;
    const nearAnyWallBase = nearLeftWallBase || nearRightWallBase || nearTopWallBase || nearBottomWallBase;
    const inCornerBase = (nearLeftWallBase || nearRightWallBase) && (nearTopWallBase || nearBottomWallBase);
    // v11: target wall proximity detection
    const tNearLeft = tgt.x < TILE * 3;
    const tNearRight = tgt.x > arenaW - TILE * 3;
    const tNearTop = tgt.y < TILE * 3;
    const tNearBottom = tgt.y > arenaH - TILE * 3;
    const nearEnemyWall = tNearLeft || tNearRight || tNearTop || tNearBottom;
    const enemyInCorner = (tNearLeft || tNearRight) && (tNearTop || tNearBottom);
    const botLaneScore = this._getGunSideLaneScore(bot, tgt);
    const enemyLaneScore = this._getGunSideLaneScore(tgt, bot);
    const laneShape = this._getLaneShape(bot, tgt, bottomGap, aimSlack);
    const trapZone = alignX < aimSlack ? 'center' : (alignX < sideOffsetNear ? 'near' : 'wide');
    const trapDanger = pm && pm.trapZoneDanger ? (pm.trapZoneDanger[trapZone] || 0) : 0;
    const laneRepeatStreak = pm && pm.laneFailStreaks ? (pm.laneFailStreaks[laneShape] || 0) : 0;
    const verticalLane = hasBottom ? 1 : (enemyHasBottom ? 0 : (bot.y >= tgt.y ? 0.62 : 0.38));
    const wallRisk = Math.min(1, (nearTopWallBase ? 0.35 : 0) + (inCornerBase ? 0.45 : 0) + (nearAnyWallBase && enemyHasBottom ? 0.15 : 0));
    const laneQuality = this._clamp01(
      verticalLane * 0.34 +
      botLaneScore * 0.36 +
      (1 - wallRisk) * 0.18 +
      (1 - Math.min(1, trapDanger + laneRepeatStreak * 0.08)) * 0.12
    );
    // Full gun-side positional check — applies to ALL shooting angles (down, up, horizontal):
    // Right gun → muzzle geometry favors being RIGHT of enemy in every direction:
    //   - Down: muzzle.x left of body → right-of-enemy aligns bullet path to target
    //   - Horizontal: MUZZLE_OFFSET_Y=0, no gun-side advantage (both sides fire from armY)
    //   - Up: right gun → muzzle.x right of body → left-of-enemy aligns (weaker case)
    // Left gun: opposite — favors being LEFT of enemy
    // Bottom advantage comes from arm(-33) vs hitbox(-25) gap, not gun side
    const _botGunSide = this._getEntityGunSide(bot);
    const _wrongSide = (
      (_botGunSide === 'right' && bot.x < tgt.x - 8) ||
      (_botGunSide === 'left' && bot.x > tgt.x + 8)
    );
    const _wantingToShootDown = bot.y < tgt.y - 15;
    const _wrongSideForDown = _wantingToShootDown && _wrongSide;
    // With MUZZLE_OFFSET_Y=0, horizontal gun-side advantage is gone.
    // Lane score differences now reflect vertical disadvantage (arm-hitbox gap),
    // NOT gun-side positioning — bottom-seeking in neutral handles that.
    // badGunSide should only flag X-positioning issues for downward shots.
    const badGunSide = _wrongSideForDown;
    const repeekedBadLane = laneRepeatStreak >= 2 || (!!ai._gunSideLaneShape && ai._gunSideLaneShape === laneShape && badGunSide && ai._gunSideFrames > 24);
    const topCornerTrapped = !hasBottom && enemyHasBottom && (inCornerBase || (nearTopWallBase && (nearLeftWallBase || nearRightWallBase)));
    const lostBottomAndNoLane = !hasBottom && enemyHasBottom && laneQuality < 0.42;
    const noAdvantageState = !hasBottom && badGunSide && (nearTopWallBase || inCornerBase);
    const laneInfo = {
      score: laneQuality,
      laneShape,
      trapZone,
      trapDanger,
      botLaneScore,
      enemyLaneScore,
      badGunSide,
      repeekedBadLane,
      topCornerTrapped,
      lostBottomAndNoLane,
      noAdvantageState,
    };

    // --- v8 anti-bottom engagement lifecycle (hysteresis + cooldown) ---
    const c = SparState._matchCollector;
    // Cooldown: prevent re-open for 30 frames after finalize
    if (ai._antiBottomCooldown > 0) ai._antiBottomCooldown--;
    if (enemyHasBottom) {
      ai._antiBottomHysteresisFrames = (ai._antiBottomHysteresisFrames || 0) + 1;
    } else {
      // Enemy lost bottom — check if engagement should end
      if (ai._antiBottomTactic && ai._antiBottomFrames > 0) {
        ai._antiBottomHysteresisFrames = (ai._antiBottomHysteresisFrames || 0) - 1;
        if (ai._antiBottomHysteresisFrames <= -15) {
          // Engagement ended — fire phase reward
          this._finalizeAntiBottomEngagement(ai, hasBottom, c);
          ai._antiBottomCooldown = 30;
          ai._antiBottomHysteresisFrames = 0;
        }
      } else {
        ai._antiBottomHysteresisFrames = 0;
      }
    }

    // Cooldown: prevent gun-side re-open for 20 frames after finalize
    if (ai._gunSideCooldown > 0) ai._gunSideCooldown--;
    if (ai._gunSidePolicy) {
      ai._gunSideFrames++;
      ai._gunSideBestQuality = Math.max(ai._gunSideBestQuality || laneQuality, laneQuality);
      if (ai._gunSidePolicy === 'peekPressure') {
        // peekPressure success: gained bottom through gun-side pressure (advantage chain complete)
        if (ai._gunSideFrames >= 20 && hasBottom) {
          this._finalizeGunSideEngagement(ai, true);
          ai._gunSideCooldown = 20;
        } else if (ai._gunSideFrames > 180 || badGunSide || (ai._gunSideFrames >= 20 && noAdvantageState)) {
          // Failed: lost gun-side, timed out, or no advantage left
          this._finalizeGunSideEngagement(ai, false);
          ai._gunSideCooldown = 20;
        }
      // Require minimum 20 frames before success-finalize to avoid lane flicker
      } else if (ai._gunSideFrames >= 20 && ((!badGunSide && laneQuality > 0.58) || (dist > 260 && !enemyHasBottom))) {
        this._finalizeGunSideEngagement(ai, true);
        ai._gunSideCooldown = 25;
      } else if (ai._gunSideFrames > 150 || (ai._gunSideFrames >= 20 && noAdvantageState)) {
        this._finalizeGunSideEngagement(ai, false);
        ai._gunSideCooldown = 45; // longer cooldown on failure to prevent spam re-entry
      }
    }
    if (ai._escapeCooldown > 0) ai._escapeCooldown--;
    if (ai._escapePolicy) {
      ai._escapeFrames++;
      ai._escapeBestQuality = Math.max(ai._escapeBestQuality || laneQuality, laneQuality);
      if (ai._escapeFrames >= 20 && !topCornerTrapped && laneQuality > 0.56 && (!enemyHasBottom || !badGunSide)) {
        this._finalizeEscapeEngagement(ai, true);
        ai._escapeCooldown = 20;
      } else if (ai._escapeFrames > 210) {
        this._finalizeEscapeEngagement(ai, false);
        ai._escapeCooldown = 20;
      }
    }

    if (!isOpening && (topCornerTrapped || noAdvantageState || lostBottomAndNoLane)) {
      // Only force-finalize if engagement has run long enough to be meaningful
      if (ai._antiBottomTactic && ai._antiBottomFrames >= 30) {
        this._finalizeAntiBottomEngagement(ai, false, c);
        ai._antiBottomCooldown = 30;
        ai._antiBottomHysteresisFrames = 0;
      }
      if (ai._gunSidePolicy && ai._gunSideFrames >= 20) {
        this._finalizeGunSideEngagement(ai, false);
        ai._gunSideCooldown = 20;
      }
      if (!ai._escapePolicy && !(ai._escapeCooldown > 0)) {
        const chosenEscape = this._pickEscapePolicy(pm, laneInfo);
        ai._escapePolicy = chosenEscape;
        ai._escapeFamily = (typeof SPAR_ESCAPE_FAMILY_MAP !== 'undefined') ? SPAR_ESCAPE_FAMILY_MAP[chosenEscape] : 'break';
        ai._escapeFrames = 0;
        ai._escapeStartDmg = ai._matchDmgTaken || 0;
        ai._escapeStartQuality = laneQuality;
        ai._escapeBestQuality = laneQuality;
        ai._escapeLaneShape = laneShape;
        ai._escapeStartCtx = _snapEngagementCtx(bot, tgt, ai);
        ai._escapeStartCtx.laneQuality = laneQuality;
        ai._escapeStartCtx.topCornerTrapped = topCornerTrapped;
      }
    } else if (!isOpening && !ai._escapePolicy && !ai._antiBottomTactic && (badGunSide || repeekedBadLane) && laneQuality < 0.48) {
      if (!ai._gunSidePolicy && !(ai._gunSideCooldown > 0)) {
        const chosenGunSide = this._pickGunSidePolicy(pm, laneInfo);
        ai._gunSidePolicy = chosenGunSide;
        ai._gunSideFamily = (typeof SPAR_GUN_SIDE_FAMILY_MAP !== 'undefined') ? SPAR_GUN_SIDE_FAMILY_MAP[chosenGunSide] : 'reposition';
        ai._gunSideFrames = 0;
        ai._gunSideStartDmg = ai._matchDmgTaken || 0;
        ai._gunSideStartQuality = laneQuality;
        ai._gunSideBestQuality = laneQuality;
        ai._gunSideLaneShape = laneShape;
        ai._gunSideStartCtx = _snapEngagementCtx(bot, tgt, ai);
        ai._gunSideStartCtx.laneQuality = laneQuality;
        ai._gunSideStartCtx.badGunSide = badGunSide;
      }
    // --- Advantage chaining: peekPressure activation ---
    // When bot HAS gun-side but NOT bottom, use gun-side peek to pressure opponent into losing bottom
    } else if (!isOpening && !ai._escapePolicy && !ai._antiBottomTactic
      && !badGunSide && laneQuality > 0.55 && !hasBottom && enemyHasBottom) {
      if (!ai._gunSidePolicy && !(ai._gunSideCooldown > 0)) {
        ai._gunSidePolicy = 'peekPressure';
        ai._gunSideFamily = 'pressure';
        ai._gunSideFrames = 0;
        ai._gunSideStartDmg = ai._matchDmgTaken || 0;
        ai._gunSideStartQuality = laneQuality;
        ai._gunSideBestQuality = laneQuality;
        ai._gunSideLaneShape = laneShape;
        ai._peekPressureStartBottom = false;
      }
    }

    // --- Strafe helper (used by all behaviors) ---
    ai.strafeTimer--;
    if (ai.strafeTimer <= 0) {
      ai.strafeDir *= -1;
      ai.strafeTimer = 25 + Math.floor(Math.random() * 35);
    }
    if (ai.jukeTimer <= 0 && Math.random() < 0.012) {
      ai.strafeDir *= -1;
      ai.jukeTimer = 15;
    }

    // Cooldowns: prevent rapid reopen after finalize
    if (ai._midPressureCooldown > 0) ai._midPressureCooldown--;
    if (ai._wallPressureCooldown > 0) ai._wallPressureCooldown--;
    if (ai._punishWindowCooldown > 0) ai._punishWindowCooldown--;
    // vNext: Finalize opening contest at opening-to-fight transition (frame 180)
    if (!isOpening && ai._openingContestPolicy) {
      const c = SparState._matchCollector;
      const bg = this._getSparBottomGap();
      // botSecured: bot clearly has bottom advantage (below player by gap)
      const botSecured = c && c.botYAtOpeningEnd > 0 && c.playerYAtOpeningEnd > 0
        ? (c.botYAtOpeningEnd > c.playerYAtOpeningEnd + bg) : false;
      // playerDenied: player failed to establish strong bottom — distinct from botSecured
      // Player is NOT meaningfully below arena midpoint (didn't reach bottom territory)
      const arenaLvl = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaHPx = arenaLvl ? arenaLvl.heightTiles * TILE : 960;
      const playerDenied = c && c.playerYAtOpeningEnd > 0 && !botSecured
        ? (c.playerYAtOpeningEnd < arenaHPx * 0.6) : false;
      // Lane quality at opening end: vertical advantage + lateral offset from enemy
      const botY = c ? c.botYAtOpeningEnd : 0;
      const playerY = c ? c.playerYAtOpeningEnd : 0;
      const vertScore = (botY > 0 && playerY > 0) ? this._clamp01(0.5 + (botY - playerY) / 200) : 0.5;
      const botLateralOffset = Math.abs(bot.x - tgt.x);
      const laneScore = this._clamp01(botLateralOffset / 200); // wider offset = cleaner lane
      const openingQuality = vertScore * 0.6 + laneScore * 0.4;
      const dmgDealt = (ai._matchDmgDealt || 0) - (ai._openingContestStartDmg || 0);
      this._finalizeOpeningContest(ai, botSecured, playerDenied, dmgDealt, 180, openingQuality);
    }
    // v11: Detect when leaving neutral state → finalize mid-fight pressure
    const isNeutral = !isOpening && !member.gun.reloading && !enemyReloading && !hasBottom && !enemyHasBottom;
    if (!isNeutral && ai._midPressurePolicy && (ai._midPressureFrames || 0) >= 20) {
      const mpDmg = (ai._matchDmgDealt || 0) - (ai._midPressureStartDmg || 0);
      this._finalizeMidFightPressure(ai, mpDmg);
      ai._midPressureCooldown = 25;
    }
    // v11: Detect when enemy leaves wall → finalize wall pressure
    if (!nearEnemyWall && ai._wallPressurePolicy && (ai._wallPressureFrames || 0) >= 15) {
      const wpDmg = (ai._matchDmgDealt || 0) - (ai._wallPressureStartDmg || 0);
      this._finalizeWallPressure(ai, wpDmg);
      ai._wallPressureCooldown = 20;
    }

    // === MOVEMENT AUTHORITY: determine which system owns movement this frame ===
    // Priority: escape > antiBottom > gunSide > wallPressure > midPressure > neutral
    // modifierLevel: 2=minimal (only wall safety, collision, freeze, dodge-reduced), 1=medium, 0=full
    const movementOwner =
      ai._escapePolicy ? 'escape' :
      (enemyHasBottom && ai._antiBottomTactic) ? 'antiBottom' :
      ai._gunSidePolicy ? 'gunSide' :
      ai._wallPressurePolicy ? 'wallPressure' :
      ai._midPressurePolicy ? 'midPressure' :
      isOpening ? 'opening' :
      'neutral';
    const modifierLevel = (movementOwner === 'escape' || movementOwner === 'antiBottom') ? 2
      : (movementOwner === 'gunSide' || movementOwner === 'wallPressure') ? 1
      : 0;

    // Clear wall mode — only hasBottom section activates it
    ai._wallMode = false;

    if (isOpening) {
      // === PHASE 1: Opening — choose a route + contest policy and commit ===
      if (!ai._openingRoute) {
        ai._openingRoute = this._pickBotOpeningRoute(pm, arenaW, arenaH);
        SparState._botOpeningRoute = ai._openingRoute;
      }
      // vNext: Pick opening contest policy once (how to FIGHT during opening)
      if (!ai._openingContestPolicy) {
        const contestPolicy = this._pickOpeningContestPolicy(pm);
        const contestFamilyMap = typeof SPAR_OPENING_CONTEST_FAMILY_MAP !== 'undefined'
          ? SPAR_OPENING_CONTEST_FAMILY_MAP
          : { hardRace: 'race', denyLane: 'deny', delayedDrop: 'deny', mirrorThenBreak: 'bait', fakeCommit: 'bait' };
        ai._openingContestPolicy = contestPolicy;
        ai._openingContestFamily = contestFamilyMap[contestPolicy] || 'race';
        ai._openingContestStartDmg = ai._matchDmgDealt || 0;
      }
      const route = ai._openingRoute;
      const contest = ai._openingContestPolicy;

      // Base route destination
      let routeGoalY = arenaH * 0.85;
      let routeGoalX = midX;
      let routeSpeedY = speed;
      let routeSpeedX = 0;
      if (route === 'bottomCenter') {
        routeGoalX = midX;
        routeSpeedX = ai.strafeDir * speed * 0.15;
      } else if (route === 'bottomLeft') {
        routeGoalX = arenaW * 0.25;
        routeSpeedY = speed * 0.95;
        routeSpeedX = Math.sign(routeGoalX - bot.x) * speed * 0.3;
      } else if (route === 'bottomRight') {
        routeGoalX = arenaW * 0.75;
        routeSpeedY = speed * 0.95;
        routeSpeedX = Math.sign(routeGoalX - bot.x) * speed * 0.3;
      } else if (route === 'topHold') {
        routeGoalY = arenaH * 0.3;
        routeSpeedY = Math.sign(routeGoalY - bot.y) * speed * 0.5;
        routeSpeedX = ai.strafeDir * speed * 0.8;
      } else if (route === 'midFlank') {
        routeGoalY = arenaH * 0.8;
        const flankSide = tgt.x < midX ? arenaW * 0.7 : arenaW * 0.3;
        routeGoalX = flankSide;
        routeSpeedY = speed * 0.92;
        routeSpeedX = Math.sign(flankSide - bot.x) * speed * 0.35;
      } else if (route === 'mirrorPlayer') {
        const tVx = tgt.vx || 0, tVy = tgt.vy || 0;
        routeSpeedX = tVx * 0.9;
        routeSpeedY = tVy * 0.9;
        if (bot.y < arenaH * 0.8) routeSpeedY = Math.max(routeSpeedY, speed * 0.85);
      }

      // --- Arrival detection: once bot reaches route goal, switch to active fighting ---
      const arrivedAtGoal = bot.y >= routeGoalY - 10;

      // Contest policy modifies HOW we execute the route
      if (arrivedAtGoal) {
        // Arrived at destination — strafe and fight, don't just stand still
        moveX = ai.strafeDir * speed * 0.7;
        // Hold position: slight downward drift if not at very bottom
        if (bot.y < arenaH * 0.92) moveY = speed * 0.1;
        // Engage: approach if enemy is far, maintain distance if close
        if (dist > 250 && dist > 1) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.2;
        } else if (dist < 120 && dist > 1) {
          moveX -= (dx / dist) * speed * 0.15;
        }
      } else if (contest === 'hardRace') {
        // Max-speed direct bottom race with lateral deny
        if (bot.y < routeGoalY - 10) moveY = routeSpeedY;
        moveX = routeSpeedX;
        // Add slight lateral deny toward enemy lane
        if (Math.abs(tgt.x - bot.x) < arenaW * 0.3) {
          moveX += Math.sign(tgt.x - bot.x) * speed * 0.15;
        }
      } else if (contest === 'denyLane') {
        // Cut off player's favored bottom side while descending hard
        const _sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
        const playerFavSide = (_sl && _sl.opening && _sl.opening.strafeLeft > 0.55) ? -1 : 1;
        const denyX = Math.max(TILE * 5, Math.min(arenaW - TILE * 5, midX + playerFavSide * arenaW * 0.2));
        if (SparState.matchTimer < 30) {
          // Phase 1: deny lane while descending hard — bottom is priority
          moveX = Math.sign(denyX - bot.x) * speed * 0.45;
          moveY = speed * 0.75;
        } else {
          // Phase 2: race to bottom from deny position
          if (bot.y < routeGoalY - 10) moveY = speed;
          moveX = Math.sign(routeGoalX - bot.x) * speed * 0.3;
        }
      } else if (contest === 'delayedDrop') {
        // Very brief lateral shift, then drop fast to bottom
        if (SparState.matchTimer < 20) {
          // Short lateral phase — still descend hard
          moveX = ai.strafeDir * speed * 0.55;
          moveY = speed * 0.65;
        } else {
          // Fast drop to bottom, opposite side of player
          const oppSide = tgt.x < midX ? arenaW * 0.7 : arenaW * 0.3;
          if (bot.y < routeGoalY - 10) moveY = speed;
          moveX = Math.sign(oppSide - bot.x) * speed * 0.35;
        }
      } else if (contest === 'mirrorThenBreak') {
        // Mirror first 20f, then break opposite — always descend hard
        if (SparState.matchTimer < 20) {
          moveX = (tgt.vx || 0) * 0.85;
          moveY = (tgt.vy || 0) * 0.85;
          if (bot.y < arenaH * 0.8) moveY = Math.max(moveY, speed * 0.7);
        } else {
          const breakSide = tgt.x < midX ? 1 : -1;
          moveX = breakSide * speed * 0.5;
          if (bot.y < routeGoalY - 10) moveY = speed * 0.92;
        }
      } else if (contest === 'fakeCommit') {
        // Show one route for 20f, then cut — always descend hard
        if (SparState.matchTimer < 20) {
          if (bot.y < routeGoalY - 10) moveY = speed * 0.85;
          moveX = routeSpeedX;
        } else {
          const cutX = tgt.x < midX ? arenaW * 0.65 : arenaW * 0.35;
          moveX = Math.sign(cutX - bot.x) * speed * 0.45;
          if (bot.y < routeGoalY - 10) moveY = speed * 0.92;
        }
      } else {
        // Fallback: basic route movement
        if (bot.y < routeGoalY - 10) moveY = routeSpeedY;
        moveX = routeSpeedX;
      }

      // Dodge bullets even during opening — don't just tank hits
      const openDodge = this._getIncomingBulletDodge(bot, team);
      const openDodgeMag = Math.sqrt(openDodge.x * openDodge.x + openDodge.y * openDodge.y);
      if (openDodgeMag > 0.5) {
        moveX += openDodge.x * speed * 0.7;
        moveY += openDodge.y * speed * 0.4;
      }

    } else if (member.gun.reloading) {
      // === RELOADING: dodge hard, create distance, strafe unpredictably ===
      moveX = ai.strafeDir * speed * 0.85;
      if (dist < 300 && dist > 1) {
        // Back away from enemy while reloading
        moveX -= (dx / dist) * speed * 0.3;
        moveY -= (dy / dist) * speed * 0.3;
      }

    } else if (enemyReloading) {
      // === PUNISH: enemy reloading — v10 policy-driven ===
      // vNext: Activate punish window on reload trigger
      if (!ai._punishWindowPolicy && !(ai._punishWindowCooldown > 0)) {
        const pwPolicy = this._pickPunishWindowPolicy(pm, 'reload');
        const pwFamilyMap = typeof SPAR_PUNISH_WINDOW_FAMILY_MAP !== 'undefined' ? SPAR_PUNISH_WINDOW_FAMILY_MAP : { hardConvert: 'rush', angleConvert: 'angle', baitConvert: 'bait' };
        ai._punishWindowPolicy = pwPolicy;
        ai._punishWindowFamily = pwFamilyMap[pwPolicy] || 'rush';
        ai._punishWindowFrames = 0;
        ai._punishWindowStartDmgDealt = ai._matchDmgDealt || 0;
        ai._punishWindowStartDmgTaken = ai._matchDmgTaken || 0;
        ai._punishWindowTrigger = 'reload';
      }
      if (ai._punishWindowPolicy) ai._punishWindowFrames++;
      // Pick reload behavior policy if not active
      if (!ai._reloadPolicy) {
        const duelCtx = {
          dist: dist,
          hasBottom: hasBottom,
          enemyHasBottom: enemyHasBottom,
        };
        const rlPolicy = this._pickReloadBehavior(pm, duelCtx);
        const rlFamilyMap = typeof SPAR_RELOAD_BEHAVIOR_FAMILY_MAP !== 'undefined' ? SPAR_RELOAD_BEHAVIOR_FAMILY_MAP : { hardReloadPunish: 'punish', safeReloadPunish: 'punish', reloadBait: 'bait' };
        ai._reloadPolicy = rlPolicy;
        ai._reloadFamily = rlFamilyMap[rlPolicy] || 'punish';
        ai._reloadStartDmg = ai._matchDmgDealt || 0;
        ai._reloadFrames = 0;
        ai._reloadStartCtx = _snapEngagementCtx(bot, tgt, ai);
        ai._reloadStartCtx.hasBottom = hasBottom;
      }
      ai._reloadFrames++;

      const punishAggr = pm ? pm.aggressionMult : 1.1;
      if (ai._reloadPolicy === 'hardReloadPunish') {
        // Aggressive close-in at 75% speed, tight approach
        if (dist > 80 && dist > 1) {
          moveX = (dx / dist) * speed * 0.75 * punishAggr;
          moveY = (dy / dist) * speed * 0.75 * punishAggr;
        }
        moveX += ai.strafeDir * speed * 0.15;
      } else if (ai._reloadPolicy === 'safeReloadPunish') {
        // Approach at 45% speed, wider strafe, maintain distance >120
        if (dist > 120 && dist > 1) {
          moveX = (dx / dist) * speed * 0.45 * punishAggr;
          moveY = (dy / dist) * speed * 0.45 * punishAggr;
        } else if (dist < 120 && dist > 1) {
          // Back off slightly to stay at range
          moveX = -(dx / dist) * speed * 0.2;
          moveY = -(dy / dist) * speed * 0.2;
        }
        moveX += ai.strafeDir * speed * 0.85;
      } else if (ai._reloadPolicy === 'reloadBait') {
        // Fake approach for 20 frames, then retreat to bait them out of reload position
        if (ai._reloadFrames <= 20) {
          // Fake approach
          if (dist > 80 && dist > 1) {
            moveX = (dx / dist) * speed * 0.5;
            moveY = (dy / dist) * speed * 0.5;
          }
        } else {
          // Retreat to bait
          if (dist > 1) {
            moveX = -(dx / dist) * speed * 0.55;
            moveY = -(dy / dist) * speed * 0.55;
          }
          moveX += ai.strafeDir * speed * 0.4;
        }
      } else if (ai._reloadPolicy === 'reloadBaitPeek') {
        // Brief advance (peek) for 15-20 frames to draw a panic shot, then retreat to punish
        if (ai._reloadFrames <= 18) {
          // Quick peek advance — aggressive burst toward enemy
          if (dist > 60 && dist > 1) {
            moveX = (dx / dist) * speed * 0.65;
            moveY = (dy / dist) * speed * 0.65;
          }
          moveX += ai.strafeDir * speed * 0.2;
        } else {
          // Retreat sharply after the peek — create space to punish panic response
          if (dist > 1) {
            moveX = -(dx / dist) * speed * 0.6;
            moveY = -(dy / dist) * speed * 0.6;
          }
          moveX += ai.strafeDir * speed * 0.55;
        }
      } else {
        // Fallback: original behavior
        if (dist > 80 && dist > 1) {
          moveX = (dx / dist) * speed * 0.65 * punishAggr;
          moveY = (dy / dist) * speed * 0.65 * punishAggr;
        }
        moveX += ai.strafeDir * speed * 0.25;
      }
      // Learning v2: if player holds ground on approach, commit harder
      // If player sidesteps, match their lateral direction
      if (pm && ai._reloadPolicy !== 'reloadBait' && ai._reloadPolicy !== 'reloadBaitPeek') {
        if (pm.playerHoldsOnApproach > 0.4) {
          if (dist > 1) {
            moveX = (dx / dist) * speed * 0.75 * punishAggr;
            moveY = (dy / dist) * speed * 0.75 * punishAggr;
          }
        }
        if (pm.playerSidesteps > 0.4) {
          moveX += pm.dodgePredictBiasX * speed * 0.25;
        }
      }
      // vNext: Punish window movement modifier on top of reload behavior
      if (ai._punishWindowPolicy && dist > 1) {
        if (ai._punishWindowPolicy === 'hardConvert') {
          // Amplify approach — push harder
          moveX += (dx / dist) * speed * 0.2;
          moveY += (dy / dist) * speed * 0.2;
        } else if (ai._punishWindowPolicy === 'angleConvert') {
          // Increase lateral offset before shooting
          moveX += ai.strafeDir * speed * 0.25;
        } else if (ai._punishWindowPolicy === 'baitConvert') {
          // After 15f of approach, fake a brief retreat to draw a panic response
          if (ai._punishWindowFrames > 15 && ai._punishWindowFrames < 25) {
            moveX = -(dx / dist) * speed * 0.3;
            moveY = -(dy / dist) * speed * 0.3;
            moveX += ai.strafeDir * speed * 0.4;
          }
        }
      }
      // Finalize punish window when enemy stops reloading
      // (handled below at punish window finalization section)

    } else if (hasBottom) {
      // === WE HAVE BOTTOM — use it actively, don't just camp ===

      // --- WALLING: strafe diagonally while shooting horizontally to create bullet walls ---
      // Wall ONLY from the very bottom of the arena — if you wall from mid-height,
      // the player just ducks under your bullets and takes bottom for free.
      // From the bottom, the rising wall blocks them from descending.
      const atArenaBottom = bot.y > arenaH * 0.88;
      const shouldWall = atArenaBottom && // must be at very bottom — walling from mid-height lets player duck under
        bot.y > tgt.y && // we're below them (have bottom)
        Math.abs(dx) < arenaW * 0.6 && // they're not way off to the side
        !member.gun.reloading && member.gun.ammo > 0;
      ai._wallMode = shouldWall;

      // When walling, add vertical oscillation to create Y-stagger between bullets
      if (shouldWall) {
        // Strafe with slight upward bias to create the rising wall pattern
        moveY -= speed * 0.15;
      }

      // CRITICAL: if player hits strafing bot more than retreating/still, use stop-start movement
      const playerHitsStrafe = pm && pm.botMoveEffectiveness &&
        (pm.botMoveEffectiveness.strafe < pm.botMoveEffectiveness.retreat ||
         pm.botMoveEffectiveness.strafe < pm.botMoveEffectiveness.still);

      if (playerHitsStrafe) {
        // Player destroys horizontal strafing — use stop-start + vertical jukes
        // vNext: cap pause to 6f max, always maintain minimum drift
        if (!ai._pauseTimer) ai._pauseTimer = 0;
        ai._pauseTimer--;
        if (ai._pauseTimer > 0) {
          // Full stop during pause — real players stop, not drift
          moveX = 0;
          moveY = 0;
        } else {
          moveX = ai.strafeDir * speed * 0.75;
          moveY = (Math.random() < 0.5 ? -1 : 1) * speed * 0.35;
          if (ai._pauseTimer <= -18) {
            ai._pauseTimer = 3 + Math.floor(Math.random() * 4); // capped 3-6f
            ai.strafeDir *= -1;
          }
        }
      } else {
        moveX = ai.strafeDir * speed * 0.7;
      }

      // Elliptical peek advantage: maintain vertical gap
      if (Math.abs(dy) > 40) {
        moveY *= 0.35;
      }

      // Stay engaged — push toward enemy if too far, tighter leash
      const engageDist = (pm && pm.preferredDist) ? pm.preferredDist + 30 : 250;
      if (dist > engageDist && dist > 1) {
        moveX += (dx / dist) * speed * 0.3;
        moveY += (dy / dist) * speed * 0.3;
      }

      // Learning v2: adapt based on what player does when we have bottom
      if (pm) {
        // If player retakes hard, wall bullets and be ready
        if (pm.playerRetakes > 0.35 && enemyMovingDown) {
          moveX = ai.strafeDir * speed * 0.85;
          if (dist < 200) moveY -= speed * 0.2;
        }
        // If player flanks, track their horizontal movement
        if (pm.playerFlanks > 0.3) {
          moveX += Math.sign(dx) * speed * 0.4;
        }
        // If player retreats / gives up bottom, PUSH and pressure
        if (pm.playerRetreats > 0.3 && !enemyMovingDown && dist > 180) {
          if (dist > 1) moveY += (dy / dist) * speed * 0.45;
        }
      }

      if (enemyMovingDown) {
        moveX += Math.sign(dx) * speed * 0.35;
        if (dist < 200) moveY -= speed * 0.25;
      } else if (enemyMovingLeft || enemyMovingRight) {
        moveX += Math.sign(dx) * speed * 0.3;
      }
      if (bot.y > arenaH - TILE * 2) moveY -= speed * 0.3;

      // --- BOTTOM RETENTION: dodge incoming bullets while maintaining bottom ---
      // When we have bottom and bullets are incoming, dodge to preserve position
      // rather than standing still and eating hits. Re-stabilize after dodge.
      const bottomDodge = this._getIncomingBulletDodge(bot, team);
      const bottomDodgeMag = Math.sqrt(bottomDodge.x * bottomDodge.x + bottomDodge.y * bottomDodge.y);
      if (bottomDodgeMag > 0.5) {
        // Dodge laterally to preserve bottom — don't dodge upward (would lose bottom)
        moveX += bottomDodge.x * speed * 0.75;
        // Only allow downward or minimal vertical dodge — never dodge up significantly
        if (bottomDodge.y > 0) moveY += bottomDodge.y * speed * 0.3; // downward dodge OK
        // else: suppress upward dodge to keep bottom position
      }
      // If recently took a hit, increase strafe speed to be harder to hit
      if (ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 20) {
        moveX *= 1.2; // faster strafe after getting hit
      }

    } else if (enemyHasBottom && ai._antiBottomHysteresisFrames >= 20 && !(ai._antiBottomCooldown > 0)) {
      // === ENEMY HAS BOTTOM — v8 tactical retake system ===
      const aimSlack = this._getSparAimSlack();
      const sideOffsetNear = this._getSparSideOffsetNear();
      const sideOffsetWide = this._getSparSideOffsetWide();
      const alignX = Math.abs(dx);

      // Initialize engagement if not started
      if (!ai._antiBottomTactic) {
        const chosen = this._pickAntiBottomTactic(pm, ai._openingLostBottomDir);
        ai._antiBottomTactic = chosen;
        ai._antiBottomFamily = (typeof SPAR_ANTI_BOTTOM_FAMILY_MAP !== 'undefined')
          ? SPAR_ANTI_BOTTOM_FAMILY_MAP[chosen] : 'flank';
        ai._antiBottomResponse = chosen; // legacy compat for match-end reinforcement
        ai._antiBottomPhase = 0;
        ai._antiBottomPhaseFrames = 0;
        ai._antiBottomDmgAtStart = ai._matchDmgTaken || 0;
        ai._antiBottomStartFrame = SparState.matchTimer;
        ai._antiBottomStallCount = 0;
        ai._abBlockedFrames = 0;
        ai._abLastY = bot.y;
        ai._abDirFlips = 0;      // how many times offset direction flipped
        ai._abMaxClearance = 0;  // max lateral clearance achieved
        ai._abStartCtx = _snapEngagementCtx(bot, tgt, ai);
        ai._abStartCtx.badGunSide = badGunSide;
        // Pick offset direction: favorable gun-side for crossing
        const favorableDir = (_botGunSide === 'right') ? 1 : -1;
        ai._antiBottomOffsetDir = favorableDir;
        if (favorableDir < 0 && bot.x < TILE * 4) ai._antiBottomOffsetDir = 1;
        else if (favorableDir > 0 && bot.x > arenaW - TILE * 4) ai._antiBottomOffsetDir = -1;
      }
      ai._antiBottomFrames++;
      ai._antiBottomPhaseFrames++;

      const tactic = ai._antiBottomTactic;
      const phase = ai._antiBottomPhase;
      let offDir = ai._antiBottomOffsetDir;
      // Track max lateral clearance achieved this engagement
      if (alignX > (ai._abMaxClearance || 0)) ai._abMaxClearance = alignX;

      // --- Body-block awareness (shared across all tactics) ---
      // Track whether bot is making vertical progress toward bottom
      const vertProgress = bot.y - (ai._abLastY || bot.y);
      ai._abLastY = bot.y;
      if (Math.abs(vertProgress) < 0.5 && bot.y < tgt.y) {
        // Not descending despite wanting to — likely body-blocked
        ai._abBlockedFrames = (ai._abBlockedFrames || 0) + 1;
      } else {
        ai._abBlockedFrames = 0;
      }
      // If body-blocked for 8+ frames, increase lateral offset to go AROUND
      const bodyBlocked = ai._abBlockedFrames >= 8;
      if (bodyBlocked) {
        // Flip offset direction if near enemy X (trying to go through them)
        if (alignX < GAME_CONFIG.PLAYER_RADIUS * 3) {
          // Too close laterally — commit harder to current offset direction
          // If still stuck after another 8 frames, flip direction entirely
          if (ai._abBlockedFrames >= 16) {
            ai._antiBottomOffsetDir *= -1;
            offDir = ai._antiBottomOffsetDir;
            ai._abBlockedFrames = 0;
            ai._abDirFlips = (ai._abDirFlips || 0) + 1;
            // Wall clamp after flip
            if (offDir < 0 && bot.x < TILE * 4) { ai._antiBottomOffsetDir = 1; offDir = 1; }
            else if (offDir > 0 && bot.x > arenaW - TILE * 4) { ai._antiBottomOffsetDir = -1; offDir = -1; }
          }
        }
      }

      // --- Context flags used by all tactics ---
      const clearedLaterally = alignX > sideOffsetNear;      // past enemy's aim slack
      const clearedWide = alignX > sideOffsetWide * 1.5;     // well past enemy
      const belowEnemy = bot.y > tgt.y;                       // already below
      const hasEnoughDistance = dist > 250;                    // created separation
      const enemyChasing = Math.abs(tgt.vx || 0) > 2 && Math.sign(tgt.vx || 0) === offDir; // enemy following our flank
      const tookRecentHit = ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 10;
      const onFavorableGunSide = !badGunSide;

      // --- Tactic-specific movement (context-driven, no frame timers) ---
      if (tactic === 'contestDirect') {
        // WHY: descend diagonally with lateral offset — go beside enemy, not through
        // WHEN to adjust: body-blocked → go wider; close range → prioritize lateral clearance
        if (bodyBlocked || alignX < GAME_CONFIG.PLAYER_RADIUS * 2.5) {
          // Can't get past — go wider first
          moveX = offDir * speed * 0.9;
          moveY = speed * 0.15;
        } else {
          // Clear path — descend with offset
          moveX = offDir * speed * 0.55;
          moveY = speed * 0.45;
        }

      } else if (tactic === 'contestSprint') {
        // WHY: full-speed to a point below+beside enemy
        const goalX = tgt.x + offDir * 75;
        const goalY = tgt.y + bottomGap + 30;
        const gdx = goalX - bot.x, gdy = goalY - bot.y;
        const gd = Math.sqrt(gdx * gdx + gdy * gdy);
        if (bodyBlocked) {
          // Body-blocked — go wider around
          moveX = offDir * speed * 0.9;
          moveY = speed * 0.2;
        } else if (gd > 15) {
          moveX = (gdx / gd) * speed;
          moveY = (gdy / gd) * speed;
        } else {
          // Arrived at goal — strafe and hold
          moveX = ai.strafeDir * speed * 0.6;
          moveY = speed * 0.1;
        }

      } else if (tactic === 'flankWide') {
        // WHY: go wide to get completely past enemy's aim, then descend from safe angle
        // Phase 0→1: when laterally clear (not frame count)
        if (!clearedWide && !belowEnemy) {
          // Still need to get wider — full lateral
          moveX = offDir * speed * 0.95;
          moveY = speed * 0.08;
        } else {
          // Wide enough or below — descend from this angle
          moveX = offDir * speed * 0.35;
          moveY = speed * 0.7;
        }

      } else if (tactic === 'flankTight') {
        // WHY: quick lateral to just outside aim slack, then descend
        // Phase 0→1: when past enemy's aim cone (not frame count)
        if (!clearedLaterally && !belowEnemy) {
          moveX = offDir * speed * 0.85;
          moveY = speed * 0.15;
        } else {
          // Cleared aim cone — descend while maintaining offset
          moveX = offDir * speed * 0.4;
          moveY = speed * 0.6;
        }

      } else if (tactic === 'baitRetreat') {
        // WHY: pull upward to create distance, then re-enter from side when far enough
        // Phase 0→1: when enough distance created (not frame count)
        if (!hasEnoughDistance && bot.y < tgt.y) {
          // Still too close — keep retreating upward + laterally
          moveY = -speed * 0.4;
          moveX = ai.strafeDir * speed * 0.7;
        } else {
          // Created distance — re-enter from the side diagonally
          moveX = offDir * speed * 0.6;
          moveY = speed * 0.55;
          // If body-blocked during re-entry, go wider
          if (bodyBlocked) { moveX = offDir * speed * 0.9; moveY = speed * 0.15; }
        }

      } else if (tactic === 'baitFake') {
        // WHY: fake approach to draw enemy reaction, then juke laterally, then descend
        // Phases based on position context, not frame count:
        // Phase 0: approach until close enough to sell the fake
        // Phase 1: juke laterally until cleared
        // Phase 2: descend from new angle
        if (phase === 0) {
          moveY = speed * 0.4;
          moveX = ai.strafeDir * speed * 0.3;
          // Sell the fake: transition when close enough OR enemy reacts (moves laterally)
          if (dist < 180 || (Math.abs(tgt.vx || 0) > 3 && dist < 250)) {
            ai._antiBottomPhase = 1;
          }
        } else if (phase === 1) {
          // Hard lateral juke
          moveX = offDir * speed * 0.95;
          moveY = speed * 0.05;
          // Transition when laterally clear of enemy
          if (clearedLaterally) {
            ai._antiBottomPhase = 2;
          }
        } else {
          // Descend from new angle
          moveX = offDir * speed * 0.4;
          moveY = speed * 0.6;
          if (bodyBlocked) { moveX = offDir * speed * 0.9; moveY = speed * 0.15; }
        }

      } else if (tactic === 'doubleFakeRetreat') {
        // WHY: fake retreat to bait chase, reverse with lateral offset, then descend
        // Phase 0→1: when enough distance created
        // Phase 1→2: when laterally clear
        if (phase === 0) {
          moveY = -speed * 0.55;
          moveX = ai.strafeDir * speed * 0.5;
          if (dist > 220 || (enemyChasing && dist > 150)) {
            ai._antiBottomPhase = 1;
          }
        } else if (phase === 1) {
          // Reverse — move toward bottom with heavy lateral offset
          moveY = speed * 0.35;
          moveX = offDir * speed * 0.8;
          if (clearedLaterally || belowEnemy) {
            ai._antiBottomPhase = 2;
          }
        } else {
          moveX = offDir * speed * 0.45;
          moveY = speed * 0.6;
          if (bodyBlocked) { moveX = offDir * speed * 0.9; moveY = speed * 0.15; }
        }

      } else if (tactic === 'lateCrossUnder') {
        // WHY: strafe to read bullet patterns, cross under when safe
        // Phase 0→1: when bullet gap found OR already on favorable side
        const crossGap = this._findSafeCrossWindow(bot, tgt, team);
        const botGunSideForCross = this._getEntityGunSide(bot);
        const favorableCrossDir = (botGunSideForCross === 'right') ? 1 : -1;
        const alreadyFavorable = (favorableCrossDir === 1 && bot.x > tgt.x + 8) ||
          (favorableCrossDir === -1 && bot.x < tgt.x - 8);
        if (phase === 0) {
          moveX = ai.strafeDir * speed * 0.9;
          moveY = speed * 0.1;
          // Cross when: safe gap AND far enough, OR already on favorable side
          const gapReady = crossGap.gapQuality > 0.5 && dist > 180;
          if (gapReady || alreadyFavorable) {
            ai._antiBottomPhase = 1;
          }
        } else {
          if (alreadyFavorable) {
            moveX = favorableCrossDir * speed * 0.3;
            moveY = speed * 0.75;
          } else {
            const crossDir = ai._antiBottomOffsetDir || favorableCrossDir;
            moveX = crossDir * speed * 0.85;
            moveY = speed * 0.65;
          }
          if (bodyBlocked) { moveX = offDir * speed * 0.9; moveY = speed * 0.15; }
        }

      } else if (tactic === 'forceMirrorThenBreak') {
        // WHY: mirror enemy X to build predictability, then break when they commit to mirroring
        // Phase 0→1: when enemy is mirroring back (they're tracking our X)
        //   OR if we've descended enough that breaking now gets us past them
        if (phase === 0) {
          const tVx = tgt.vx || 0;
          moveX = tVx * 0.85 + ai.strafeDir * speed * 0.15;
          moveY = speed * 0.15;
          // Break when enemy is actively mirroring (moving same direction as us)
          const enemyMirroring = Math.abs(tVx) > 2 && Math.sign(tVx) === Math.sign(bot.vx || ai.strafeDir);
          if (enemyMirroring || (bot.y > tgt.y - 60 && clearedLaterally)) {
            ai._antiBottomPhase = 1;
          }
        } else {
          moveX = offDir * speed * 0.85;
          moveY = speed * 0.55;
          if (bodyBlocked) { moveX = offDir * speed * 0.9; moveY = speed * 0.15; }
        }
      }

      // --- Shared: trap zone awareness ---
      const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
      if (sl && sl.tactical && sl.tactical.trapZones) {
        const tz = sl.tactical.trapZones;
        const currentZone = alignX < aimSlack ? 'center' : (alignX < sideOffsetNear ? 'near' : 'wide');
        const zoneData = tz[currentZone];
        const zoneHitRate = zoneData && zoneData.frames > 30
          ? zoneData.hits / zoneData.frames : 0;
        if (zoneHitRate > 0.15) {
          const escapeDir = alignX < sideOffsetNear
            ? (offDir || ai.strafeDir)
            : Math.sign(bot.x - tgt.x);
          moveX += escapeDir * speed * Math.min(0.4, zoneHitRate);
          moveY *= Math.max(0.6, 1.0 - zoneHitRate);
        }
        if (c && c.trapZoneFrames) {
          c.trapZoneFrames[currentZone]++;
          const lastHit = ai._lastTookHitFrame || 0;
          if (lastHit >= SparState.matchTimer - 1 && lastHit <= SparState.matchTimer) {
            c.trapZoneHits[currentZone]++;
          }
        }
      }

      // --- Shared: profile-based adjustments ---
      if (pm) {
        if (pm.preferredOffsetX > 0.1) {
          moveX += Math.sign(bot.x - tgt.x || ai.strafeDir) * speed * pm.preferredOffsetX * 0.25;
        }
        if (pm.belowShootsUp > 0.6) {
          moveX += Math.sign(bot.x - tgt.x || ai.strafeDir) * speed * 0.2;
        }
        if (pm.playerPushesFromBottom > 0.45 && tactic !== 'baitRetreat' && tactic !== 'baitFake' && tactic !== 'doubleFakeRetreat' && dist < 220) {
          moveY -= speed * 0.04;
        }
      }

      // Normalize to full speed — bot must always move at max speed during anti-bottom
      const abLen = Math.sqrt(moveX * moveX + moveY * moveY);
      if (abLen > 0.1) {
        moveX = (moveX / abLen) * speed;
        moveY = (moveY / abLen) * speed;
      }

      // --- Timeout: force re-pick after 120 frames ---
      if (ai._antiBottomFrames > 120) {
        this._finalizeAntiBottomEngagement(ai, false, c);
        ai._antiBottomCooldown = 10;
        ai._antiBottomHysteresisFrames = 0;
      }

    } else if (enemyHasBottom) {
      // Hysteresis not yet met — waiting for 20+ frames to confirm enemy has bottom
      // Full speed strafe + descent toward bottom
      moveX = ai.strafeDir * speed * 0.85;
      moveY = (bot.y < tgt.y) ? speed * 0.53 : speed * 0.1;

    } else {
      // Reset engagement if enemy lost bottom (handled by hysteresis above)
      if (!ai._antiBottomTactic) ai._antiBottomFrames = 0;
      // === NEUTRAL — neither has clear bottom, actively contest ===
      // === DEAD-STATE PREVENTION: block moves that would worsen position ===
      // If disadvantaged and drifting toward center band, push laterally
      const driftingToCenter = !hasBottom && badGunSide &&
        Math.abs(bot.x - midX) < arenaW * 0.22 && Math.abs(bot.x - midX) > arenaW * 0.08;
      if (driftingToCenter) {
        // Push away from center band
        const preventDir = this._getStableCenterDir(ai, bot.x, midX) > 0 ? -1 : 1;
        moveX += preventDir * speed * 0.25;
      }
      // If disadvantaged and drifting toward wall, push toward center
      const driftingToWall = !hasBottom && (badGunSide || laneQuality < 0.5) &&
        (bot.x < TILE * 5 || bot.x > arenaW - TILE * 5);
      if (driftingToWall && !ai._escapePolicy) {
        moveX += this._getStableCenterDir(ai, bot.x, midX) * speed * 0.3;
      }
      // v11: Pick mid-fight pressure policy if not active (respect cooldown)
      if (!ai._midPressurePolicy && !(ai._midPressureCooldown > 0)) {
        const mpCtx = {
          dist, hasBottom, enemyHasBottom,
          recentHit: ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30,
          recentTookHit: ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 30,
          laneQuality, enemyNearWall: nearEnemyWall,
        };
        const mpPolicy = this._pickMidFightPressure(pm, mpCtx);
        const mpFamilyMap = typeof SPAR_MID_PRESSURE_FAMILY_MAP !== 'undefined' ? SPAR_MID_PRESSURE_FAMILY_MAP : { pressureHard: 'press', pressureSoft: 'press', holdLane: 'hold' };
        ai._midPressurePolicy = mpPolicy;
        ai._midPressureFamily = mpFamilyMap[mpPolicy] || 'press';
        ai._midPressureStartDmg = ai._matchDmgDealt || 0;
        ai._midPressureFrames = 0;
        ai._midPressureStartCtx = _snapEngagementCtx(bot, tgt, ai);
        ai._midPressureStartCtx.hasBottom = hasBottom;
        ai._midPressureStartCtx.laneQuality = laneQuality;
        ai._lastMidPressurePolicy = mpPolicy;
        ai._lastMidPressureFamily = mpFamilyMap[mpPolicy] || 'press';
      }
      ai._midPressureFrames++;

      // Policy-driven neutral movement
      // Determine if bot has a positional advantage worth pressing
      const hasPressAdvantage = hasBottom || (!badGunSide && laneQuality > 0.6);

      if (ai._midPressurePolicy === 'pressureHard') {
        // Controlled pressure — approach closer when we have advantage, hold distance otherwise
        moveX = ai.strafeDir * speed * 0.55;
        if (hasPressAdvantage) {
          // Has advantage: press closer (controlled push, not rush)
          if (dist > 140 && dist > 1) {
            moveX += (dx / dist) * speed * 0.45;
            moveY += (dy / dist) * speed * 0.4;
          }
          // Even with advantage, don't stack on top — maintain minimum gap
          if (dist < 90 && dist > 1) {
            moveX -= (dx / dist) * speed * 0.15;
            moveY -= (dy / dist) * speed * 0.1;
          }
        } else {
          // No advantage: keep distance — more aggressively when on wrong gun-side
          const noAdvMinDist = badGunSide ? 200 : 140;
          if (dist > 220 && dist > 1) {
            moveX += (dx / dist) * speed * 0.35;
            moveY += (dy / dist) * speed * 0.3;
          } else if (dist < noAdvMinDist && dist > 1) {
            const retreatStr = badGunSide ? 0.3 : 0.15;
            moveX -= (dx / dist) * speed * retreatStr;
            // Only retreat vertically if we have bottom — never resist descent
            if (bot.y >= tgt.y) moveY -= (dy / dist) * speed * (retreatStr * 0.7);
          }
        }
        // Push toward bottom position — bottom is the primary objective
        if (bot.y < tgt.y) moveY += speed * 0.35;
        else moveY += speed * 0.1;
      } else if (ai._midPressurePolicy === 'pressureSoft') {
        // Moderate: 70% strafe, 30% approach when far, don't chase close
        moveX = ai.strafeDir * speed * 0.7;
        const prefDist = (pm && pm.preferredDist) ? pm.preferredDist : 220;
        if (dist > prefDist && dist > 1) {
          moveX += (dx / dist) * speed * 0.3;
          moveY += (dy / dist) * speed * 0.3;
        } else if (dist < 150 && dist > 1) {
          // Don't chase when close — maintain distance (lateral only when above enemy)
          moveX -= (dx / dist) * speed * 0.15;
          if (bot.y >= tgt.y) moveY -= (dy / dist) * speed * 0.15;
        }
        // Moderate bottom push — still prioritize getting below enemy
        if (bot.y < tgt.y) moveY += speed * 0.25;
        else moveY += speed * 0.05;
      } else {
        // holdLane: 80% strafe, no vertical push unless losing position, maintain distance
        moveX = ai.strafeDir * speed * 0.8;
        // Only approach if enemy retreats (moving away)
        const enemyRetreating = dist > 1 && ((tgt.vx || 0) * -dx + (tgt.vy || 0) * -dy) / dist < -2;
        if (enemyRetreating && dist > 200 && dist > 1) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.25;
        }
        // Stay at preferred engagement distance
        if (pm && pm.preferredDist && dist > 1) {
          const distDiff = dist - pm.preferredDist;
          if (distDiff > 50) {
            moveX += (dx / dist) * speed * 0.2;
            moveY += (dy / dist) * speed * 0.2;
          } else if (distDiff < -50) {
            moveX -= (dx / dist) * speed * 0.15;
            if (bot.y >= tgt.y) moveY -= (dy / dist) * speed * 0.15;
          }
        }
        // Only push toward bottom if significantly above
        if (bot.y < tgt.y - 40) moveY += speed * 0.15;
      }

      // === BOTTOM IS THE PRIMARY OBJECTIVE IN NEUTRAL ===
      // If bot is above enemy, always push toward bottom — this is the main win condition
      // Stronger push the further above we are
      const vertGap = tgt.y - bot.y; // positive = bot is above enemy (needs to descend)
      if (vertGap > 20) {
        // Scale bottom push by distance — stronger when far above
        const bottomPush = Math.min(0.4, 0.15 + (vertGap / arenaH) * 0.5);
        if (moveY < speed * bottomPush) moveY = Math.max(moveY, speed * bottomPush);
      }
      // Anti-passivity — maintain minimum lateral drift in open center
      const botInOpenCenter = bot.x > arenaW * 0.2 && bot.x < arenaW * 0.8 &&
        bot.y > arenaH * 0.25 && bot.y < arenaH * 0.75;
      if (botInOpenCenter && Math.abs(moveX) < speed * 0.3) {
        moveX = ai.strafeDir * speed * 0.35;
      }

      // Maintain fighting distance — close range must be earned, not drifted into
      // With advantage (bottom/gun-side): pressing closer is correct, only prevent stacking
      // Without advantage: no reason to be close, maintain space
      if (hasPressAdvantage) {
        // Pressing from advantage — only separate if truly stacking (dist < 90)
        if (dist < 90 && dist > 1) {
          moveX -= (dx / dist) * speed * 0.2;
          if (bot.y >= tgt.y) moveY -= (dy / dist) * speed * 0.15;
        }
      } else if (dist < 160 && dist > 1) {
        // No advantage — separate laterally, but never resist descent toward bottom
        const sepStrength = (160 - dist) / 160;
        moveX -= (dx / dist) * speed * (0.15 + sepStrength * 0.25);
        if (bot.y >= tgt.y) moveY -= (dy / dist) * speed * (0.10 + sepStrength * 0.20);
      }
      // Learning v2: use approach/retreat knowledge in neutral
      if (pm) {
        // Dodge prediction bias
        if (Math.abs(pm.dodgePredictBiasX) > 0.15) {
          moveX += pm.dodgePredictBiasX * speed * 0.2;
        }
        // If player sidesteps a lot when we approach, fake approach then cut perpendicular
        if (pm.playerSidesteps > 0.4 && dist < 250) {
          moveX += ai.strafeDir * speed * 0.2;
        }
        // If player counter-pushes, don't approach head-on — angle in
        if (pm.playerCounterPushes > 0.35 && dist < 300) {
          moveX += ai.strafeDir * speed * 0.25;
        }
        // If player chases when we retreat, exploit it for baiting
        if (pm.playerChases > 0.5 && hpPct > 0.5 && dist < 200) {
          if (ai.baitCooldown > 25) ai.baitCooldown = 25;
        }
      }

      // v11: Finalize mid-fight pressure after 180 frames timeout
      if (ai._midPressureFrames >= 180) {
        const mpDmg = (ai._matchDmgDealt || 0) - (ai._midPressureStartDmg || 0);
        this._finalizeMidFightPressure(ai, mpDmg);
        ai._midPressureCooldown = 25;
      }
    }

    let suppressPeekShots = false;
    // Suppress shots when lane quality is poor (bad angle / wrong vertical position).
    // With MUZZLE_OFFSET_Y=0, gun-side only matters for vertical shots (up/down).
    // Only suppress if no policy is actively managing movement (they handle their own suppression).
    // Allow close-range aggression when there's a tactical reason (finishing low HP, pressing after hit)
    const _enemyLowHp = tgt.hp < (tgt.maxHp || SPAR_CONFIG.HP_BASELINE) * 0.35;
    const _recentLandedHit = ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30;
    const _hasCloseReason = _enemyLowHp || _recentLandedHit;
    if (!isOpening && !ai._escapePolicy && !ai._gunSidePolicy && !ai._antiBottomTactic
      && !ai._midPressurePolicy && !ai._wallPressurePolicy
      && badGunSide && laneQuality < 0.55 && !_hasCloseReason) {
      suppressPeekShots = true;
    }
    if (!isOpening && ai._escapePolicy) {
      suppressPeekShots = true;
      const centerDir = this._getStableCenterDir(ai, bot.x, midX);
      const awayDir = -Math.sign(dx || ai.strafeDir);
      const descendDir = bot.y < arenaH * 0.6 ? 1 : -0.2;
      if (ai._escapePolicy === 'cornerBreak') {
        moveX = centerDir * speed * 0.95;
        moveY = Math.sign(midY - bot.y) * speed * 0.75;
      } else if (ai._escapePolicy === 'highReset') {
        moveX = centerDir * speed * 0.7;
        moveY = (nearTopWallBase ? 0.35 : -0.25) * speed;
      } else if (ai._escapePolicy === 'wideDisengage') {
        moveX = awayDir * speed * 0.95;
        moveY = descendDir * speed * 0.55;
      } else if (ai._escapePolicy === 'baitPullout') {
        moveX = awayDir * speed * 0.65 + ai.strafeDir * speed * 0.25;
        moveY = (pm && pm.playerChases > 0.45 ? 0.45 : 0.2) * speed;
      }
      // Wall avoidance inside escape — prevent drifting into dead wall states
      if (bot.x < TILE * 4) moveX = Math.max(moveX, speed * 0.3);
      else if (bot.x > arenaW - TILE * 4) moveX = Math.min(moveX, -speed * 0.3);
      if (bot.y < TILE * 3) moveY = Math.max(moveY, speed * 0.1);
      if (!topCornerTrapped && laneQuality > 0.62 && !badGunSide && dist < 165) suppressPeekShots = false;
    } else if (!isOpening && ai._gunSidePolicy) {
      const awayDir = -Math.sign(dx || ai.strafeDir);
      const reAngleDir = Math.sign(bot.x - tgt.x || ai.strafeDir);
      if (ai._gunSidePolicy === 'forcePeek') {
        moveX += ai.strafeDir * speed * 0.15;
      } else if (ai._gunSidePolicy === 'holdAngle') {
        suppressPeekShots = laneQuality < 0.5;
        // vNext: Only plant if conditions justify it; otherwise maintain movement
        const canPlantHold = hasBottom || nearEnemyWall || laneQuality > 0.55;
        if (canPlantHold) {
          moveX += ai.strafeDir * speed * 0.18;
          moveY += (badGunSide ? 0.08 : 0) * speed;
        } else {
          // Open center — maintain meaningful lateral drift
          moveX += ai.strafeDir * speed * 0.4;
          moveY += (badGunSide ? 0.12 : 0.05) * speed;
        }
      } else if (ai._gunSidePolicy === 'preAimLaneHold') {
        // Hold position firmly with pre-aimed lane
        suppressPeekShots = laneQuality < 0.45;
        // vNext: Only micro-adjust if conditions justify planting
        const canPlantPreAim = hasBottom || nearEnemyWall || laneQuality > 0.58;
        if (canPlantPreAim) {
          moveX += ai.strafeDir * speed * 0.06;
          moveY *= 0.2;
        } else {
          // Open center — must maintain minimum lateral movement
          moveX += ai.strafeDir * speed * 0.35;
          if (bot.y < tgt.y - 20) moveY += speed * 0.12;
        }
      } else if (ai._gunSidePolicy === 'reAngleWide') {
        // Suppress shots while repositioning to correct side — shooting from wrong side is a losing trade
        suppressPeekShots = laneQuality < 0.45 || _wrongSide;
        moveX = reAngleDir * speed * 0.9;
        moveY += (!hasBottom ? 0.18 : 0.05) * speed;
      } else if (ai._gunSidePolicy === 'yieldLane') {
        suppressPeekShots = true;
        moveX = awayDir * speed * 0.7 + this._getStableCenterDir(ai, bot.x, midX) * speed * 0.25;
        moveY += (enemyHasBottom ? 0.25 : -0.05) * speed;
      } else if (ai._gunSidePolicy === 'peekPressure') {
        // Advantage chaining: use gun-side peek to pressure opponent into losing bottom
        // Strafe to maintain gun-side angle, gradually descend toward bottom, keep shooting
        suppressPeekShots = false; // the pressure IS shooting from favorable angle
        moveX += ai.strafeDir * speed * 0.25; // maintain gun-side with lateral movement
        // Gradually descend — the goal is to take bottom while pressuring with shots
        if (bot.y < tgt.y) {
          moveY += speed * 0.2; // descend toward bottom when above opponent
        } else {
          moveY += speed * 0.08; // slight downward drift when near same height
        }
        // Don't get too close — pressure works from distance where opponent can't react easily
        if (dist < 160 && dist > 1) {
          const sepStr = (160 - dist) / 160;
          moveX -= (dx / dist) * speed * sepStr * 0.3;
          moveY -= (dy / dist) * speed * sepStr * 0.2;
        }
      }
      if (laneQuality > 0.62 && !badGunSide && !repeekedBadLane) suppressPeekShots = false;
    }

    // === DUEL STYLE WEIGHT APPLICATION ===
    // Style weights adjust approach/strafe/distance, but must respect distance discipline:
    // - Without advantage: never pull closer than 160px
    // - With advantage: allow pressing closer (minimum ~90px)
    // - approachMult only amplifies when bot is already moving toward enemy AND is far enough
    if (styleWeights && !isOpening && modifierLevel < 2) {
      const hasAdvantage = hasBottom || (!badGunSide && laneQuality > 0.6);
      // Context-aware distance: close in when there's a REASON (pressure, finish, momentum)
      const enemyLowHp = tgt.hp < (tgt.maxHp || SPAR_CONFIG.HP_BASELINE) * 0.35;
      const recentLandedHit = ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30;
      const hasCloseReason = enemyLowHp || recentLandedHit;
      const styleMinDist = hasAdvantage ? 90 : (badGunSide && !hasCloseReason ? 220 : 160);

      // Scale approach/retreat based on style
      if (dist > 1) {
        const moveDot = (moveX * dx + moveY * dy) / dist;
        if (moveDot > 0 && dist > styleMinDist) {
          // Moving toward enemy AND far enough — scale by approachMult
          const approachComponent = moveDot / speed;
          const scaledApproach = approachComponent * styleWeights.approachMult;
          const diff = (scaledApproach - approachComponent) * speed;
          moveX += (dx / dist) * diff;
          moveY += (dy / dist) * diff;
        }
      }
      // Active retreat when below minimum distance without advantage
      if (dist < styleMinDist && dist > 1 && !hasAdvantage) {
        const retreatStr = Math.min(0.35, (styleMinDist - dist) / styleMinDist);
        moveX -= (dx / dist) * speed * retreatStr;
        moveY -= (dy / dist) * speed * retreatStr;
      }
      // Scale strafe intensity
      const perpComponent = Math.abs(moveX * dy - moveY * dx) / Math.max(1, dist);
      if (perpComponent > 0.5) {
        moveX *= styleWeights.strafeMult;
      }
      // Apply preferred distance from style — but never pull closer than floor
      if (styleWeights.preferredDist && dist > 1) {
        const effectiveDist = Math.max(styleWeights.preferredDist, styleMinDist);
        const distDiff = dist - effectiveDist;
        if (Math.abs(distDiff) > 40) {
          const adjust = Math.min(0.3, Math.abs(distDiff) / 450);
          const dir = distDiff > 0 ? 1 : -1;
          moveX += (dx / dist) * speed * adjust * dir;
          moveY += (dy / dist) * speed * adjust * dir;
        }
      }
      // Scale bait frequency
      if (styleWeights.baitMult) {
        // Already handled in bait section, just adjust cooldown
      }
    }

    // === MID-MATCH SOFT-SWITCH ===
    if (ai._duelStyle && !ai._styleSwitchEvaluated && !isOpening && SparState.matchTimer > 480) {
      // Check if we should switch: down by >=30 HP or no hits for 180 frames
      const hpDiff = bot.hp - tgt.hp;
      const noHitsRecently = (SparState.matchTimer - ai._lastHitFrame) > 180;
      if (hpDiff <= -30 || noHitsRecently) {
        ai._styleSwitchEvaluated = true;
        const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
        const rf = sl ? this._ensureReinforcementProfile(sl) : null;
        const pStyleBuckets = rf && rf.player ? rf.player.style : null;
        const totalPlayerStylePlays = this._sumBucketPlays(pStyleBuckets);
        let newStyle = ai._duelStyle;
        let bestScore = -Infinity;
        for (const candidate of Object.keys(SPAR_DUEL_STYLES || {})) {
          if (candidate === ai._duelStyle) continue;
          const score = this._scoreRewardBucket(
            pStyleBuckets && pStyleBuckets[candidate],
            totalPlayerStylePlays,
            0.12
          );
          if (score > bestScore) {
            bestScore = score;
            newStyle = candidate;
          }
        }
        if (newStyle && newStyle !== ai._duelStyle && typeof SPAR_DUEL_STYLES !== 'undefined') {
          ai._duelStyle = newStyle;
          styleWeights = SPAR_DUEL_STYLES[newStyle];
        }
      }
    }

    // === CIRCUMSTANCE LAYERS (Phase 1c) ===

    // After-hit momentum: within 30 frames of landing a hit, press advantage
    // Only approach if far enough — don't blindly rush in after every hit
    if (ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30 && !isOpening && modifierLevel < 2) {
      const hasHitAdvantage = hasBottom || (!badGunSide && laneQuality > 0.6);
      if (dist > 1 && (dist > 200 || hasHitAdvantage)) {
        const hitPush = dist > 200 ? 0.2 : 0.1; // weaker push when closer
        moveX += (dx / dist) * speed * hitPush;
        moveY += (dy / dist) * speed * hitPush;
      }
    }

    // After-taking-hit defense: within 30 frames of taking a hit, strafe harder and back off
    if (ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 30 && !isOpening && modifierLevel < 1) {
      moveX += ai.strafeDir * speed * 0.12;
      if (dist < 250 && dist > 1) {
        moveX -= (dx / dist) * speed * 0.1;
        moveY -= (dy / dist) * speed * 0.1;
      }
    }

    // === CORNER ESCAPE + POSITION VALUE SYSTEM ===
    const nearLeftWall = bot.x < TILE * 3;
    const nearRightWall = bot.x > arenaW - TILE * 3;
    const nearTopWall = bot.y < TILE * 3;
    const nearBottomWall = bot.y > arenaH - TILE * 3;
    const nearAnyWall = nearLeftWall || nearRightWall || nearTopWall || nearBottomWall;
    const inCorner = (nearLeftWall || nearRightWall) && (nearTopWall || nearBottomWall);
    const inTopHalf = bot.y < midY;

    // Track corner/top stuck time
    if (inCorner) {
      ai._cornerFrames++;
    } else {
      ai._cornerFrames = Math.max(0, ai._cornerFrames - 3);
    }
    if (inTopHalf && !hasBottom) {
      ai._topStuckFrames++;
    } else {
      ai._topStuckFrames = Math.max(0, ai._topStuckFrames - 2);
    }

    if (!isOpening && modifierLevel < 2) {
      // CORNER ESCAPE: increasingly urgent the longer we're stuck
      if (inCorner) {
        const urgency = Math.min(0.7, ai._cornerFrames / 60); // ramps to 0.7 over 1 second
        // Push toward center — always
        moveX += this._getStableCenterDir(ai, bot.x, midX) * speed * urgency;
        moveY += Math.sign(midY - bot.y) * speed * urgency;
      } else if (nearAnyWall) {
        // Near wall but not corner — dodge perpendicular if enemy closing
        const closing = dist > 1 ? ((tgt.vx || 0) * -dx + (tgt.vy || 0) * -dy) / dist : 0;
        if (closing > 2) {
          if (nearLeftWall || nearRightWall) {
            moveY += (bot.y < midY ? 1 : -1) * speed * 0.4;
          }
          if (nearTopWall || nearBottomWall) {
            moveX += this._getStableCenterDir(ai, bot.x, midX) * speed * 0.4;
          }
        }
      }

      // v11: WALL PRESSURE — exploit enemy near wall (suppresses mid-fight pressure)
      if (nearEnemyWall && !nearAnyWall && !member.gun.reloading && !ai._escapePolicy) {
        // Finalize mid-fight pressure if wall pressure is taking over (respect min duration)
        if (ai._midPressurePolicy && (ai._midPressureFrames || 0) >= 20) {
          const mpDmg = (ai._matchDmgDealt || 0) - (ai._midPressureStartDmg || 0);
          this._finalizeMidFightPressure(ai, mpDmg);
          ai._midPressureCooldown = 25;
        }
        // Pick wall pressure policy if not active (respect cooldown)
        if (!ai._wallPressurePolicy && !(ai._wallPressureCooldown > 0)) {
          const wpCtx = {
            dist, hasBottom, enemyHasBottom,
            enemyNearWall: nearEnemyWall, enemyInCorner,
            laneQuality,
          };
          const wpPolicy = this._pickWallPressure(pm, wpCtx);
          const wpFamilyMap = typeof SPAR_WALL_PRESSURE_FAMILY_MAP !== 'undefined' ? SPAR_WALL_PRESSURE_FAMILY_MAP : { wallPinHold: 'pin', pressureWiden: 'widen', prefireCorner: 'widen' };
          ai._wallPressurePolicy = wpPolicy;
          ai._wallPressureFamily = wpFamilyMap[wpPolicy] || 'pin';
          ai._wallPressureStartDmg = ai._matchDmgDealt || 0;
          ai._wallPressureFrames = 0;
          ai._wallPressureStartCtx = _snapEngagementCtx(bot, tgt, ai);
          ai._wallPressureStartCtx.hasBottom = hasBottom;
          ai._wallPressureStartCtx.enemyInCorner = enemyInCorner;
          ai._lastWallPressurePolicy = wpPolicy;
          ai._lastWallPressureFamily = wpFamilyMap[wpPolicy] || 'pin';
        }
        ai._wallPressureFrames++;

        if (ai._wallPressurePolicy === 'wallPinHold') {
          // Hold position that pins enemy against wall, block escape route, maintain 120-180px
          const pinDist = 150;
          if (dist > pinDist + 30 && dist > 1) {
            moveX += (dx / dist) * speed * 0.4;
            moveY += (dy / dist) * speed * 0.4;
          } else if (dist < pinDist - 30 && dist > 1) {
            moveX -= (dx / dist) * speed * 0.2;
            moveY -= (dy / dist) * speed * 0.2;
          }
          // Block escape: position between enemy and center
          const escapeX = midX - tgt.x;
          if (Math.abs(escapeX) > 30) {
            moveX += Math.sign(escapeX) * speed * 0.15;
          }
        } else if (ai._wallPressurePolicy === 'pressureWiden') {
          // Push toward enemy but offset wide to cut off escape
          // Wall pressure is deliberate advantage pressing — but don't stack on top
          if (dist > 150 && dist > 1) {
            moveX += (dx / dist) * speed * 0.35;
            moveY += (dy / dist) * speed * 0.35;
          } else if (dist < 100 && dist > 1) {
            moveX -= (dx / dist) * speed * 0.15;
            moveY -= (dy / dist) * speed * 0.1;
          }
          // Offset wide: move perpendicular to cut escape
          const perpDir = (tgt.x < midX) ? 1 : -1;
          moveX += perpDir * speed * 0.3;
        } else if (ai._wallPressurePolicy === 'prefireCorner') {
          // Stand off at 200px, fire at predicted escape path
          const prefireDist = 200;
          if (dist > prefireDist + 30 && dist > 1) {
            moveX += (dx / dist) * speed * 0.3;
            moveY += (dy / dist) * speed * 0.3;
          } else if (dist < prefireDist - 30 && dist > 1) {
            moveX -= (dx / dist) * speed * 0.25;
            moveY -= (dy / dist) * speed * 0.25;
          }
          // Strafe to track escape angle
          moveX += ai.strafeDir * speed * 0.4;
        }

        // Finalize after 150 frames timeout
        if (ai._wallPressureFrames >= 150) {
          const wpDmg = (ai._matchDmgDealt || 0) - (ai._wallPressureStartDmg || 0);
          this._finalizeWallPressure(ai, wpDmg);
          ai._wallPressureCooldown = 20;
        }
      }

      // POSITION VALUE: top half without bottom is BAD — push to retake
      // Scales with stuck duration AND learned bottom-win correlation
      if (inTopHalf && !hasBottom && !member.gun.reloading) {
        const posValueMult = pm ? pm.bottomWinCorrelation : 0.7;
        const topUrgency = Math.min(0.65, ai._topStuckFrames / 70) * posValueMult; // faster ramp
        // Push downward toward bottom position — strong base push
        moveY += speed * (0.3 + topUrgency);
        // Push toward center (not toward enemy) to avoid corners — but only if far from center
        if (Math.abs(bot.x - midX) > arenaW * 0.25) {
          moveX += Math.sign(midX - bot.x) * speed * 0.15;
        }
      }
    }

    // LOS blocked tracking
    if (!isOpening && dist > 1 && modifierLevel < 2) {
      const _hbY2 = GAME_CONFIG.PLAYER_HITBOX_Y || -25;
      const hasLOS = this._hasLOS(bot.x, bot.y + _hbY2, tgt.x, tgt.y + _hbY2);
      if (!hasLOS) {
        ai._losBlockedFrames++;
        if (ai._losBlockedFrames > 60) {
          // Reposition: move toward center and perpendicular to enemy
          moveX += this._getStableCenterDir(ai, bot.x, midX) * speed * 0.3;
          moveY += Math.sign(midY - bot.y) * speed * 0.3;
        }
      } else {
        ai._losBlockedFrames = Math.max(0, ai._losBlockedFrames - 2);
      }
    }

    // Chase/retreat reset: track consecutive chase and retreat frames
    // Skip during active anti-bottom — tactic handles its own approach
    const inActiveAntiBottom = !!ai._antiBottomTactic && enemyHasBottom;
    if (!isOpening && !inActiveAntiBottom && dist > 1 && modifierLevel < 1) {
      const movingToward = (moveX * dx + moveY * dy) / dist;
      if (movingToward > speed * 0.3) {
        ai._chaseFrames++;
        ai._retreatFrames = 0;
        // Break off chase if no hit in 180 frames of pursuit
        if (ai._chaseFrames > 180 && (SparState.matchTimer - ai._lastHitFrame) > 180) {
          moveX = ai.strafeDir * speed * 0.7;
          moveY = 0;
          ai._chaseFrames = 0;
        }
      } else if (movingToward < -speed * 0.3) {
        ai._retreatFrames++;
        ai._chaseFrames = 0;
        // Stop endless retreat — recommit after 120 frames
        if (ai._retreatFrames > 120) {
          moveX = ai.strafeDir * speed * 0.5;
          moveY = (dy / dist) * speed * 0.2;
          ai._retreatFrames = 0;
        }
      } else {
        ai._chaseFrames = Math.max(0, ai._chaseFrames - 1);
        ai._retreatFrames = Math.max(0, ai._retreatFrames - 1);
      }
    }

    // === Expanded Low HP behavior (below 25%) ===
    // Skip during active anti-bottom engagement — tactic handles its own movement
    if (hpPct < 0.25 && !isOpening && !inActiveAntiBottom && modifierLevel < 2) {
      const tgtHpPct = tgt.hp / tgt.maxHp;
      // Estimate shots to kill each other
      const botDmg = member.gun.damage || 20;
      const tgtDmg = 20; // assume player does 20 per hit
      const shotsToKillTarget = Math.ceil(tgt.hp / botDmg);
      const shotsToKillBot = Math.ceil(bot.hp / tgtDmg);

      if (shotsToKillTarget <= 2) {
        // Within 2 shots of killing — override to aggression
        ai._lowHpKillAttempt = true;
        if (dist > 1) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.25;
        }
      } else if (tgtHpPct < 0.25 && shotsToKillBot >= shotsToKillTarget) {
        // Both low, but we need more shots — race (push in)
        if (dist > 1) {
          moveX += (dx / dist) * speed * 0.15;
          moveY += (dy / dist) * speed * 0.15;
        }
      } else {
        // Full evasion mode — no speed boost, same rules as player
        if (dist < 250 && dist > 1) {
          moveX -= (dx / dist) * speed * 0.25;
          moveY -= (dy / dist) * speed * 0.25;
        }
      }
    }

    // --- Combat-informed adjustments (STRONG — override base behaviors) ---
    // Skip during active anti-bottom engagement — tactic handles positioning
    if (pm && !isOpening && !inActiveAntiBottom && modifierLevel < 1) {
      // DISTANCE MANAGEMENT: push toward preferred engagement range
      // Respect distance floor: never pull closer than 160 without advantage
      if (pm.preferredDist && dist > 1) {
        const hasAdvantage2 = hasBottom || (!badGunSide && laneQuality > 0.6);
        const minFloor = hasAdvantage2 ? 90 : 160;
        const effectivePrefDist = Math.max(pm.preferredDist, minFloor);
        const distDiff = dist - effectivePrefDist;
        if (Math.abs(distDiff) > 30) {
          const adjustStr = Math.min(0.45, Math.abs(distDiff) / 400);
          const towardEnemy = distDiff > 0 ? 1 : -1;
          moveX += (dx / dist) * speed * adjustStr * towardEnemy;
          moveY += (dy / dist) * speed * adjustStr * towardEnemy;
        }
      }

      // EVASION STYLE: STRONGLY favor the movement that makes player miss most
      if (pm.bestEvasion === 'still') {
        // Player can't hit a still bot — use STOP-START movement
        // This is critical: don't constantly strafe, pause between bursts
        if (!ai._pauseTimer) ai._pauseTimer = 0;
        if (ai._pauseTimer <= 0 && Math.random() < 0.06) {
          ai._pauseTimer = 10 + Math.floor(Math.random() * 15); // pause 10-25 frames
        }
        if (ai._pauseTimer > 0) {
          moveX = 0; // full stop — real players stop, not drift
          moveY = 0;
          ai._pauseTimer--;
        }
      } else if (pm.bestEvasion === 'strafe') {
        moveX += ai.strafeDir * speed * 0.15;
      } else if (pm.bestEvasion === 'retreat') {
        // Player can't hit a retreating bot — use spacing, but don't run forever
        // Only retreat when enemy is pushing in close; otherwise hold position
        if (dist < 200 && dist > 1) {
          moveX -= (dx / dist) * speed * 0.25;
          moveY -= (dy / dist) * speed * 0.25;
        }
        moveX += ai.strafeDir * speed * 0.15;
      } else if (pm.bestEvasion === 'approach' && dist > 120) {
        if (dist > 1) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.25;
        }
      }

      // VERTICAL MOVEMENT: if player primarily shoots horizontally, move vertically more
      const horizShootPct = (typeof sparLearning !== 'undefined') ?
        sparLearning.shooting.leftPct + sparLearning.shooting.rightPct : 0;
      if (horizShootPct > 0.5) {
        // Player shoots mostly left/right — add vertical movement to dodge
        moveY += (Math.random() < 0.5 ? 1 : -1) * speed * 0.15 * horizShootPct;
      }

      // CIRCULAR HITBOX + RECTANGULAR BULLET AWARENESS
      // Bullet is narrow perpendicular to travel (4px half-width) — dodge perpendicular
      // Both directions equally evasive with circular hitbox
      if (tgt.dir === 2 || tgt.dir === 3) {
        // Enemy shooting horizontally — dodge VERTICALLY (perpendicular to bullet)
        const vertOffset = bot.y - tgt.y;
        if (Math.abs(vertOffset) < 30) {
          moveY += (vertOffset >= 0 ? 1 : -1) * speed * 0.2;
        }
        // With MUZZLE_OFFSET_Y=0, gun side has no horizontal muzzle advantage.
        // Bottom advantage comes from arm(-33) vs hitbox(-25) gap instead.
      } else if (tgt.dir === 0 || tgt.dir === 1) {
        // Enemy shooting vertically — dodge HORIZONTALLY (perpendicular to bullet)
        const horizOffset = bot.x - tgt.x;
        if (Math.abs(horizOffset) < 30) {
          moveX += (horizOffset >= 0 ? 1 : -1) * speed * 0.2;
        }
      }

      // TRADE AVOIDANCE: if player wins trades, don't stand and trade
      if (pm.avoidTrades && dist < 200) {
        moveX += ai.strafeDir * speed * 0.2;
        if (dist > 1 && hasAmmo) {
          moveX -= (dx / dist) * speed * 0.15;
          moveY -= (dy / dist) * speed * 0.15;
        }
      }
    }

    // --- Bullet dodging (reactive, OVERRIDES movement when urgent) ---
    const dodge = this._getIncomingBulletDodge(bot, team);
    const dodgeMag = Math.sqrt(dodge.x * dodge.x + dodge.y * dodge.y);
    // During anti-bottom or center recovery, reduce dodge override so bot keeps committed
    const maxDodgeOverride = inActiveAntiBottom ? 0.45 : 0.85;
    if (dodgeMag > 1.5) {
      // Strong dodge signal — override movement (reduced during anti-bottom)
      const overridePct = Math.min(maxDodgeOverride, dodgeMag / 4);
      moveX = moveX * (1 - overridePct) + dodge.x * speed * overridePct * 1.5;
      moveY = moveY * (1 - overridePct) + dodge.y * speed * overridePct * 1.5;
    } else if (dodgeMag > 0.1) {
      // Mild dodge — additive (reduced during anti-bottom)
      const dodgeScale = inActiveAntiBottom ? 0.5 : 1.0;
      moveX += dodge.x * speed * dodgeScale;
      moveY += dodge.y * speed * dodgeScale;
    }

    // Separation from allies
    for (const a of allies) {
      if (!a.alive || a.entity === bot) continue;
      const adx = bot.x - a.entity.x, ady = bot.y - a.entity.y;
      const adist = Math.sqrt(adx * adx + ady * ady);
      if (adist < 80 && adist > 1) {
        moveX += (adx / adist) * speed * 0.35;
        moveY += (ady / adist) * speed * 0.35;
      }
    }

    // Wall avoidance
    const wallMargin = TILE * 1.5;
    if (bot.x < wallMargin) moveX += speed * 0.4;
    else if (bot.x > arenaW - wallMargin) moveX -= speed * 0.4;
    if (bot.y < wallMargin) moveY += speed * 0.4;
    else if (bot.y > arenaH - wallMargin) moveY -= speed * 0.3;

    // --- Baiting: occasionally fake a direction then snap back ---
    // Skip during active anti-bottom / center recovery — don't fake directions while committed
    if (ai.baitTimer > 0 && !inActiveAntiBottom && modifierLevel < 2) {
      ai.baitTimer--;
      if (ai.baitTimer > 8) {
        // Fake phase — move in bait direction
        moveX = ai.baitDirX * speed * 0.7;
        moveY = ai.baitDirY * speed * 0.7;
      }
      // else: snap back (use the real moveX/moveY calculated above)
    } else {
      ai.baitCooldown--;
      if (ai.baitCooldown <= 0 && !isOpening && !inActiveAntiBottom && modifierLevel < 2 && dist < 350 && dist > 100) {
        // Start a bait — fake going one direction
        ai.baitTimer = 18; // 12 frames fake + 6 frames real snap
        // Fake toward enemy then pull back, or fake a strafe direction
        if (Math.random() < 0.5) {
          // Fake push toward enemy
          ai.baitDirX = dist > 1 ? (dx / dist) : 0;
          ai.baitDirY = dist > 1 ? (dy / dist) : 0;
        } else {
          // Fake strafe in opposite direction
          ai.baitDirX = -ai.strafeDir;
          ai.baitDirY = 0;
        }
        ai.baitCooldown = 60 + Math.floor(Math.random() * 80);
      }
    }

    // vNext: Punish window lifecycle — finalize when trigger ends or window times out
    if (ai._punishWindowPolicy) {
      const pwTimedOut = ai._punishWindowFrames >= 40;
      const triggerEnded = (ai._punishWindowTrigger === 'reload' && !enemyReloading);
      if (pwTimedOut || triggerEnded) {
        this._finalizePunishWindow(ai);
      }
    }
    // vNext: Detect whiff/repeek punish windows in non-reload contexts
    if (!ai._punishWindowPolicy && !(ai._punishWindowCooldown > 0) && !isOpening && !member.gun.reloading && !enemyReloading) {
      // Whiff detection: enemy fired and MISSED recently (actual miss, not a hit)
      const enemyWhiffed = ai._lastEnemyWhiffFrame > 0 &&
        (SparState.matchTimer - ai._lastEnemyWhiffFrame) >= 3 &&
        (SparState.matchTimer - ai._lastEnemyWhiffFrame) < 18 &&
        // Only count as whiff if bot wasn't ALSO hit in the same window
        (ai._lastTookHitFrame === 0 || (SparState.matchTimer - ai._lastTookHitFrame) > 12);
      // Quick re-peek: enemy fired recently AND there was a meaningful gap before it
      // Requires TWO prior shots — can't re-peek on the very first shot of the match
      const hasPrevShot = ai._prevEnemyShotFrame > 0 && ai._lastEnemyShotFrame > ai._prevEnemyShotFrame;
      const shotGap = hasPrevShot ? (ai._lastEnemyShotFrame - ai._prevEnemyShotFrame) : 0;
      const recentShot = ai._lastEnemyShotFrame > 0 && (SparState.matchTimer - ai._lastEnemyShotFrame) < 10;
      const quickRepeek = hasPrevShot && pm && pm.playerRepeeksQuickly &&
        recentShot && shotGap >= 20; // real disengage (20+ frame gap) then fast return
      const trigger = quickRepeek ? 'repeek' : (enemyWhiffed ? 'whiff' : null);
      if (trigger && Math.random() < 0.35) { // don't trigger every time
        const pwPolicy = this._pickPunishWindowPolicy(pm, trigger);
        const pwFamilyMap = typeof SPAR_PUNISH_WINDOW_FAMILY_MAP !== 'undefined' ? SPAR_PUNISH_WINDOW_FAMILY_MAP : { hardConvert: 'rush', angleConvert: 'angle', baitConvert: 'bait' };
        ai._punishWindowPolicy = pwPolicy;
        ai._punishWindowFamily = pwFamilyMap[pwPolicy] || 'rush';
        ai._punishWindowFrames = 0;
        ai._punishWindowStartDmgDealt = ai._matchDmgDealt || 0;
        ai._punishWindowStartDmgTaken = ai._matchDmgTaken || 0;
        ai._punishWindowTrigger = trigger;
      }
    }
    // vNext: Apply non-reload punish window movement modifier
    if (ai._punishWindowPolicy && !enemyReloading && dist > 1 && modifierLevel < 2) {
      if (ai._punishWindowPolicy === 'hardConvert') {
        // Only approach if we're far enough — don't stack on top of enemy
        if (dist > 130) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.25;
        }
      } else if (ai._punishWindowPolicy === 'angleConvert') {
        moveX += ai.strafeDir * speed * 0.2;
      } else if (ai._punishWindowPolicy === 'baitConvert' && ai._punishWindowFrames > 12) {
        // Fake retreat then snap back
        if (ai._punishWindowFrames < 22) {
          moveX -= (dx / dist) * speed * 0.2;
        } else if (dist > 130) {
          moveX += (dx / dist) * speed * 0.15;
        }
      }
      ai._punishWindowFrames++;
    }

    // --- Momentum break: if active, override movement to prevent re-sticking ---
    // Allow stall-detector breaks during anti-bottom/escape — they're the only way
    // to physically escape body-block situations. Only cancel non-stall breaks
    // (e.g., idle breaks that fire coincidentally).
    if (ai._momentumBreakFrames > 0 && (ai._antiBottomTactic || ai._escapePolicy) && !ai._stallBreakActive) {
      ai._momentumBreakFrames = 0;
    }
    if (ai._momentumBreakFrames > 0) {
      moveX = ai._momentumBreakDirX * speed;
      moveY = ai._momentumBreakDirY * speed;
      ai._momentumBreakFrames--;
    }

    // === OWNER-AWARE STALL DETECTOR ===
    // Works in ALL states (not just neutral) — detects when an owner is active but
    // the bot is barely moving or not improving geometry. Forces action to prevent
    // the "stand still in a bad state" problem.
    // IMPORTANT: Uses ACTUAL position (post-collision) snapshots, not intended moveX/moveY.
    // The old approach missed body-block/wall stalls because intended movement looked fine.
    const hasActiveOwner = !!(ai._escapePolicy || ai._antiBottomTactic || ai._gunSidePolicy);

    // Snapshot position BEFORE collision for this frame (we'll compare after collision below)
    ai._stallPreX = bot.x;
    ai._stallPreY = bot.y;

    // (Old pre-collision stall logic removed — now runs post-collision below)

    // Removed: strafeSpeedMult — real players move at full speed or stop, no fractional speeds

    // Binary movement: full speed or stopped (like a real player)
    // Weights above determine DIRECTION, this enforces full-speed magnitude
    const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLen > 1) {
      moveX = (moveX / moveLen) * speed;
      moveY = (moveY / moveLen) * speed;
    } else {
      moveX = 0;
      moveY = 0;
    }

    // Direction commitment: real players don't reverse direction every frame.
    // If the new direction is >90° from last frame's, keep the old direction
    // for a few frames before allowing the change. This prevents jitter from
    // competing forces that nearly cancel and flip the resultant each frame.
    if (moveLen > 1 && ai._lastMoveX !== undefined) {
      const dotProd = moveX * ai._lastMoveX + moveY * ai._lastMoveY;
      // dotProd < 0 means >90° turn (direction reversal)
      if (dotProd < 0 && ai._momentumBreakFrames <= 0) {
        ai._dirCommitFrames = (ai._dirCommitFrames || 0) + 1;
        if (ai._dirCommitFrames < 5) {
          // Keep old direction — don't allow the flip yet
          moveX = ai._lastMoveX;
          moveY = ai._lastMoveY;
        } else {
          // Committed long enough, allow the direction change
          ai._dirCommitFrames = 0;
        }
      } else {
        ai._dirCommitFrames = 0;
      }
    }
    ai._lastMoveX = moveX;
    ai._lastMoveY = moveY;

    // Freeze penalty after shooting — applied AFTER normalization (the only valid speed reduction)
    if (ai._freezeTimer > 0) {
      ai._freezeTimer--;
      const penalty = ai._freezePenalty || 0.54;
      moveX *= (1.0 - penalty);
      moveY *= (1.0 - penalty);
    }

    // --- Idle guard: if near-stationary too long, force a lateral break ---
    const idleThreshold = 0.4;
    if (Math.abs(moveX) < idleThreshold && Math.abs(moveY) < idleThreshold && ai._momentumBreakFrames <= 0) {
      ai._idleFrames++;
    } else {
      ai._idleFrames = 0;
    }
    // After 20 idle frames, force a lateral break — works in ALL states including owner states
    // The bot should NEVER visibly stand still for 20+ frames regardless of owner
    if (ai._idleFrames >= 20 && !(member && member.gun.reloading)) {
      const breakDir = (Math.random() < 0.5 ? -1 : 1);
      const breakDirY = (bot.y < tgt.y) ? 0.3 : ((Math.random() < 0.5 ? -1 : 1) * 0.25);
      moveX = breakDir * speed * 0.7;
      moveY = breakDirY * speed;
      ai._idleFrames = 0;
      ai.strafeDir = breakDir;
      ai.strafeTimer = 20 + Math.floor(Math.random() * 20);
      // Commit to this break direction for 25-35 frames
      ai._momentumBreakFrames = 25 + Math.floor(Math.random() * 10);
      ai._momentumBreakDirX = breakDir * 0.7;
      ai._momentumBreakDirY = breakDirY;
      // Track diagnostics
      const sl2 = typeof sparLearning !== 'undefined' ? sparLearning : null;
      if (sl2 && sl2.tactical) {
        if (typeof sl2.tactical.idleBreaks !== 'number') sl2.tactical.idleBreaks = 0;
        sl2.tactical.idleBreaks++;
      }
    }

    // === MOVEMENT OWNER DIAGNOSTICS ===
    if (!ai._ownerFrames) ai._ownerFrames = {};
    ai._ownerFrames[movementOwner] = (ai._ownerFrames[movementOwner] || 0) + 1;

    // Collision — use player wall size, not mob (bots = future players)
    const hw = GAME_CONFIG.PLAYER_WALL_HW;
    if (positionClear(bot.x + moveX, bot.y, hw)) bot.x += moveX;
    if (positionClear(bot.x, bot.y + moveY, hw)) bot.y += moveY;

    // === POST-COLLISION STALL MEASUREMENT ===
    // Now that collision is applied, measure ACTUAL displacement this frame
    const actualDispX = bot.x - (ai._stallPreX || bot.x);
    const actualDispY = bot.y - (ai._stallPreY || bot.y);
    ai._stallAccumX = (ai._stallAccumX || 0) + actualDispX;
    ai._stallAccumY = (ai._stallAccumY || 0) + actualDispY;
    ai._stallWindow = (ai._stallWindow || 0) + 1;

    if (ai._stallWindow >= 10) {
      const netDisp = Math.sqrt(ai._stallAccumX * ai._stallAccumX + ai._stallAccumY * ai._stallAccumY);
      const isStalled = netDisp < speed * 2.5; // less than 2.5 frames of movement in 10 frames

      if (isStalled && hasActiveOwner && ai._momentumBreakFrames <= 0 && SparState.phase === 'fighting') {
        ai._ownerStallFrames = (ai._ownerStallFrames || 0) + 10;
        if (ai._ownerStallFrames >= 10) {
          const breakDir = (bot.x < midX) ? 1 : -1;
          const breakDirY = (bot.y < tgt.y) ? 0.4 : -0.15;
          ai._stallBreakActive = true;
          ai._ownerStallFrames = 0;
          // Apply momentum break on NEXT frame via flag
          ai._momentumBreakFrames = 15 + Math.floor(Math.random() * 10);
          ai._momentumBreakDirX = breakDir * 0.8;
          ai._momentumBreakDirY = breakDirY;
          const _sl2 = typeof sparLearning !== 'undefined' ? sparLearning : null;
          if (_sl2 && _sl2.tactical) {
            if (typeof _sl2.tactical.ownerStallBreaks !== 'number') _sl2.tactical.ownerStallBreaks = 0;
            _sl2.tactical.ownerStallBreaks++;
          }
          // Track stalls per anti-bottom engagement — abandon failing tactics
          if (ai._antiBottomTactic) {
            ai._antiBottomStallCount = (ai._antiBottomStallCount || 0) + 1;
            if (ai._antiBottomStallCount >= 3) {
              // Tactic is body-blocked — abandon and force a different one
              this._finalizeAntiBottomEngagement(ai, false, c);
              ai._antiBottomCooldown = 10; // short cooldown — pick new tactic fast
              ai._antiBottomHysteresisFrames = 0;
            }
          }
        }
      } else {
        ai._ownerStallFrames = 0;
        ai._stallBreakActive = false;
      }

      // Neutral stall detection (existing low-motion rescue)
      const isInNeutralOpen = !hasActiveOwner && !isOpening && !member.gun.reloading &&
        !enemyReloading && !ai._wallPressurePolicy && SparState.phase === 'fighting';
      if (isInNeutralOpen && isStalled && ai._momentumBreakFrames <= 0) {
        const breakDir2 = (bot.x < midX) ? 1 : -1;
        const breakDirY2 = (bot.y < tgt.y) ? 0.35 : -0.15;
        ai.strafeDir = breakDir2;
        ai.strafeTimer = 20 + Math.floor(Math.random() * 20);
        // Commit to the break via momentum break — just changing strafeDir
        // gets overridden by the next force computation
        ai._momentumBreakFrames = 15 + Math.floor(Math.random() * 10);
        ai._momentumBreakDirX = breakDir2 * 0.75;
        ai._momentumBreakDirY = breakDirY2;
        const sl2 = typeof sparLearning !== 'undefined' ? sparLearning : null;
        if (sl2 && sl2.tactical) {
          if (typeof sl2.tactical.idleBreaks !== 'number') sl2.tactical.idleBreaks = 0;
          sl2.tactical.idleBreaks++;
        }
      }

      // Reset window
      ai._stallAccumX = 0;
      ai._stallAccumY = 0;
      ai._stallWindow = 0;
    }

    bot.vx = moveX; bot.vy = moveY;
    bot.moving = Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5;

    // Facing — always face target
    // dir: 0=down, 1=up, 2=left, 3=right
    if (dist < 500) {
      if (Math.abs(dx) > Math.abs(dy)) {
        bot.dir = dx > 0 ? 3 : 2;
      } else {
        bot.dir = dy > 0 ? 0 : 1;
      }
    } else if (Math.abs(moveX) > Math.abs(moveY)) {
      bot.dir = moveX > 0 ? 3 : 2;
    } else if (Math.abs(moveY) > 0.5) {
      bot.dir = moveY > 0 ? 0 : 1;
    }

    // --- Shooting with shot timing modes (v10: policy-driven) ---
    // Re-evaluate shot mode every 90 frames or on context change
    if (SparState.matchTimer % 90 === 0 || (ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 2)) {
      // Finalize previous shot timing engagement if active
      if (ai._shotTimingPolicy) {
        const stDmg = (ai._matchDmgDealt || 0) - (ai._shotTimingStartDmg || 0);
        this._finalizeShotTimingEngagement(ai, stDmg > 0 ? 1 : 0, stDmg);
      }
      // Pick mode based on context — escape/wall overrides take priority
      if (ai._escapePolicy || suppressPeekShots) {
        ai._shotMode = 'held';
        ai._shotTimingPolicy = null;
        ai._shotTimingFamily = null;
      } else if (nearAnyWall && !this._hasLOS(bot.x, bot.y + (GAME_CONFIG.PLAYER_HITBOX_Y || -25), tgt.x, tgt.y + (GAME_CONFIG.PLAYER_HITBOX_Y || -25))) {
        ai._shotMode = 'prefire';
        ai._shotTimingPolicy = null;
        ai._shotTimingFamily = null;
      } else {
        // v10: Use policy picker for normal combat
        const duelCtx = {
          dist: dist,
          hasBottom: hasBottom,
          enemyHasBottom: enemyHasBottom,
          recentHit: ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30,
          recentTookHit: ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 30,
          laneQuality: laneQuality,
        };
        const stPolicy = this._pickShotTimingPolicy(pm, duelCtx);
        const stFamilyMap = typeof SPAR_SHOT_TIMING_FAMILY_MAP !== 'undefined' ? SPAR_SHOT_TIMING_FAMILY_MAP : { shootImmediate: 'aggressive', delayShot: 'patient', baitShot: 'patient' };
        ai._shotTimingPolicy = stPolicy;
        ai._shotTimingFamily = stFamilyMap[stPolicy] || 'aggressive';
        ai._shotTimingStartDmg = ai._matchDmgDealt || 0;
        ai._shotTimingFrames = 0;
        ai._shotTimingStartCtx = _snapEngagementCtx(bot, tgt, ai);
        ai._shotTimingStartCtx.hasBottom = hasBottom;
        ai._shotTimingStartCtx.laneQuality = laneQuality;
        // Map policy to shot mode
        if (stPolicy === 'shootImmediate') {
          ai._shotMode = 'immediate';
        } else if (stPolicy === 'delayShot') {
          ai._shotMode = 'held';
        } else if (stPolicy === 'baitShot') {
          ai._shotMode = 'held'; // baitShot uses held + extra cooldown (applied below)
        }
      }
    }
    // Increment shot timing frame counter for ALL active policies
    if (ai._shotTimingPolicy) {
      ai._shotTimingFrames++;
    }

    if (!member.gun.reloading && member.gun.ammo > 0 && member.ai.shootCD <= 0) {
      const hasLOS = this._hasLOS(bot.x, bot.y + (GAME_CONFIG.PLAYER_HITBOX_Y || -25), tgt.x, tgt.y + (GAME_CONFIG.PLAYER_HITBOX_Y || -25));
      // --- OPENING FIRE GATE ---
      // Don't shoot during opening unless bot has bottom — if bot shoots from above,
      // player just ducks under the bullets and takes bottom for free.
      const openingFireGated = isOpening && !hasBottom;

      const policyShotAllowed = (!ai._escapePolicy && !suppressPeekShots && !openingFireGated)
        || (laneQuality > 0.62 && !badGunSide && !openingFireGated)
        || (dist < 130 && botLaneScore > enemyLaneScore + 0.08 && !_wrongSide && !openingFireGated)
        // Stall-break fail-safe: if bot is stalled in an owner state, allow defensive firing
        || (ai._stallBreakActive && laneQuality > 0.35)
        // Long-stall fail-safe: if suppressPeekShots has been active 30+ frames without progress
        || (ai._ownerStallFrames >= 20 && laneQuality > 0.40);

      if (!policyShotAllowed) {
        // Hold fire while escaping or re-angling out of a bad lane.
      } else if (ai._shotMode === 'immediate' && hasLOS) {
        this._sparBotShoot(member, tgt);
      } else if (ai._shotMode === 'held' && hasLOS) {
        // Wait for better alignment: target about to cross our shot axis
        const alignX = Math.abs(tgt.x - bot.x);
        const alignY = Math.abs(tgt.y - bot.y);
        const axisSlack = this._getSparAimSlack();
        let aligned = Math.min(alignX, alignY) < axisSlack;
        // With vertical offset, horizontal alignment still valuable for perpendicular shot
        if ((hasBottom || enemyHasBottom) && alignX < axisSlack + Math.max(4, GAME_CONFIG.BULLET_HALF_SHORT || 4)) aligned = true;
        if (aligned) {
          this._sparBotShoot(member, tgt);
        } else if (member.ai.shootCD <= -10) {
          // Been waiting too long, just fire
          this._sparBotShoot(member, tgt);
        }
      } else if (ai._shotMode === 'prefire') {
        // Fire toward where LOS is about to open (corner peek)
        // Fire at predicted position even without current LOS
        const tgtMoving = Math.abs(tgt.vx || 0) > 1 || Math.abs(tgt.vy || 0) > 1;
        if (hasLOS || (tgtMoving && dist < 300)) {
          this._sparBotShoot(member, tgt);
          if (hasLOS) ai._shotMode = 'immediate'; // got LOS, switch back
        }
      } else if (ai._shotMode === 'cutoff' && hasLOS) {
        // Fire perpendicular to predict wall run exit
        this._sparBotShoot(member, tgt);
      } else if (hasLOS) {
        // Fallback
        this._sparBotShoot(member, tgt);
      }
    }
  },

  _hasLOS(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 24);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      if (isSolid(col, row)) return false;
    }
    return true;
  },
};

// ---- SPAR DOOR INTERACTABLE REGISTRATION ----
Events.on('scene_changed', (data) => {
  if (data.to === 'spar') {
    for (let i = interactables.length - 1; i >= 0; i--) {
      if (interactables[i].id && interactables[i].id.startsWith('spar_door_')) {
        interactables.splice(i, 1);
      }
    }
    if (level && level.isSpar && !level.isSparArena) {
      SparSystem.enterHub();
      for (const e of levelEntities) {
        if (e.type !== 'spar_room_door') continue;
        const doorCenterX = (e.tx + (e.w || 2) / 2) * TILE;
        const doorCenterY = (e.ty + (e.h || 2) / 2) * TILE;
        registerInteractable({
          id: 'spar_door_' + e.roomId,
          x: doorCenterX,
          y: doorCenterY,
          range: 80,
          label: 'Enter ' + (e.label || '') + ' ' + (e.mode === 'streak' ? 'Streak' : 'Standard'),
          type: 'spar_door',
          canInteract() { return SparState.phase === 'hub' && Scene.inSpar; },
          onInteract() { SparSystem.joinRoom(e.roomId); },
        });
      }
    }
  } else {
    for (let i = interactables.length - 1; i >= 0; i--) {
      if (interactables[i].id && interactables[i].id.startsWith('spar_door_')) {
        interactables.splice(i, 1);
      }
    }
  }
});
