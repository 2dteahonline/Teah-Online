// ===================== SPAR DATA =====================
// Shared data: spar building constants, room definitions, persistent progress
// Phase A — loaded after partyData.js

const SPAR_CONFIG = {
  HUB_LEVEL: 'spar_hub_01',
  RETURN_LEVEL: 'lobby_01',
  RETURN_TX: 17, RETURN_TY: 34,
  HP_BASELINE: 100,
  COUNTDOWN_FRAMES: 180,       // 3 seconds at 60fps
  POST_MATCH_FRAMES: 60,       // 1 second results (fast testing)
  POINT_BUDGET: 100,           // total points to allocate across CT-X stats
  BOT_SPEED: GAME_CONFIG.PLAYER_BASE_SPEED,  // always match player speed
  ARENA_SMALL: { w: 24, h: 20 },
  ARENA_LARGE: { w: 36, h: 28 },
};

// CT-X stat conversion functions (from 0-100 slider value to gun stat)
// These mirror the existing _mgSliders logic in gunSystem.js
const SPAR_CTX_STATS = {
  // Freeze: slider → penalty. 0→0.90, 50→0.45, 100→0.00
  freezeToStat(pts) {
    return { freezePenalty: 0.90 - pts * 0.009, freezeDuration: 15 };
  },
  // RoF: slider → fireRate frames. Piecewise curve, stretched so old 60→new 50.
  // Input rescaled by 1.2x then fed through the base curve (costs more pts for same RoF).
  rofToStat(pts) {
    const p = Math.min(100, pts * 1.2); // stretch: 50 new pts = 60 old pts
    let frames;
    if (p <= 50) {
      frames = 11.025 - p * 0.1125; // 0→11, ~42→5.4
    } else {
      frames = 5.4 - (p - 50) * 0.0375; // ~42→5.4, 100→3.5
    }
    return frames;
  },
  // Spread: slider → degrees. 0→0°, 100→50°
  spreadToStat(pts) {
    return pts * 0.5;
  },
};

// Duel style definitions — weight multipliers for bot behavior in 1v1
function _sparCtxReloadFromRof(pts) {
  const p = Math.min(100, pts * 1.2);
  const base = Math.round(20 + p * 0.25);
  return Math.round(base * 1.2);
}

const SPAR_DUEL_STYLES = {
  pressure: {
    label: 'Pressure',
    approachMult: 1.3,     // pushes in harder
    strafeMult: 0.8,       // tighter strafes
    retreatMult: 0.5,      // rarely retreats
    baitMult: 0.6,         // less baiting
    shootAggr: 1.2,        // shoots more aggressively
    preferredDist: 150,    // close range
  },
  control: {
    label: 'Control',
    approachMult: 0.7,     // cautious approach
    strafeMult: 1.2,       // wider strafes
    retreatMult: 1.3,      // retreats when needed
    baitMult: 0.8,         // moderate baiting
    shootAggr: 0.8,        // picks shots
    preferredDist: 280,    // mid range
  },
  bait: {
    label: 'Bait',
    approachMult: 1.0,     // normal approach
    strafeMult: 1.0,       // normal strafes
    retreatMult: 1.5,      // frequent fake retreats
    baitMult: 2.0,         // heavy baiting
    shootAggr: 0.7,        // conservative shooting
    preferredDist: 200,    // mid-close range
  },
};

const SPAR_OPENING_ROUTE_KEYS = ['bottomLeft', 'bottomRight', 'bottomCenter', 'topHold', 'midFlank', 'mirrorPlayer'];
const SPAR_ANTI_BOTTOM_RESPONSE_KEYS = ['directContest', 'sideFlank', 'baitPull']; // legacy — kept for migration

// v8 anti-bottom tactical system: 9 tactics in 3 families
const SPAR_ANTI_BOTTOM_TACTIC_KEYS = [
  'contestDirect', 'contestSprint', 'lateCrossUnder',
  'flankWide', 'flankTight', 'forceMirrorThenBreak',
  'baitRetreat', 'baitFake', 'doubleFakeRetreat',
];
const SPAR_ANTI_BOTTOM_FAMILY_KEYS = ['contest', 'flank', 'bait'];
const SPAR_ANTI_BOTTOM_FAMILY_MAP = {
  contestDirect: 'contest', contestSprint: 'contest', lateCrossUnder: 'contest',
  flankWide: 'flank', flankTight: 'flank', forceMirrorThenBreak: 'flank',
  baitRetreat: 'bait', baitFake: 'bait', doubleFakeRetreat: 'bait',
};
const SPAR_GUN_SIDE_POLICY_KEYS = ['forcePeek', 'holdAngle', 'preAimLaneHold', 'reAngleWide', 'yieldLane'];
const SPAR_GUN_SIDE_FAMILY_KEYS = ['hold', 'reposition'];
const SPAR_GUN_SIDE_FAMILY_MAP = {
  forcePeek: 'hold',
  holdAngle: 'hold',
  preAimLaneHold: 'hold',
  reAngleWide: 'reposition',
  yieldLane: 'reposition',
};
const SPAR_ESCAPE_POLICY_KEYS = ['cornerBreak', 'highReset', 'wideDisengage', 'baitPullout'];
const SPAR_ESCAPE_FAMILY_KEYS = ['break', 'reset', 'bait'];
const SPAR_ESCAPE_FAMILY_MAP = {
  cornerBreak: 'break',
  wideDisengage: 'break',
  highReset: 'reset',
  baitPullout: 'bait',
};
const SPAR_SHOT_TIMING_KEYS = ['shootImmediate', 'delayShot', 'baitShot'];
const SPAR_SHOT_TIMING_FAMILY_KEYS = ['aggressive', 'patient'];
const SPAR_SHOT_TIMING_FAMILY_MAP = {
  shootImmediate: 'aggressive',
  delayShot: 'patient',
  baitShot: 'patient',
};

const SPAR_RELOAD_BEHAVIOR_KEYS = ['hardReloadPunish', 'safeReloadPunish', 'reloadBait', 'reloadBaitPeek'];
const SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS = ['punish', 'bait'];
const SPAR_RELOAD_BEHAVIOR_FAMILY_MAP = {
  hardReloadPunish: 'punish',
  safeReloadPunish: 'punish',
  reloadBait: 'bait',
  reloadBaitPeek: 'bait',
};

const SPAR_MID_PRESSURE_KEYS = ['pressureHard', 'pressureSoft', 'holdLane'];
const SPAR_MID_PRESSURE_FAMILY_KEYS = ['press', 'hold'];
const SPAR_MID_PRESSURE_FAMILY_MAP = {
  pressureHard: 'press',
  pressureSoft: 'press',
  holdLane: 'hold',
};

const SPAR_WALL_PRESSURE_KEYS = ['wallPinHold', 'pressureWiden', 'prefireCorner'];
const SPAR_WALL_PRESSURE_FAMILY_KEYS = ['pin', 'widen'];
const SPAR_WALL_PRESSURE_FAMILY_MAP = {
  wallPinHold: 'pin',
  pressureWiden: 'pin',
  prefireCorner: 'widen',
};

const SPAR_LANE_SHAPE_KEYS = ['center', 'left', 'right', 'topLeft', 'topRight'];

function createSparRewardBuckets(keys) {
  const buckets = {};
  for (const key of keys) buckets[key] = { plays: 0, reward: 0.5 };
  return buckets;
}

const SPAR_ROOMS = [
  { id: 'spar_1v1',        label: '1v1',        teamSize: 1, streakMode: false, arenaLevel: 'spar_1v1_01',   column: 'left' },
  { id: 'spar_2v2',        label: '2v2',        teamSize: 2, streakMode: false, arenaLevel: 'spar_2v2_01',   column: 'left' },
  { id: 'spar_3v3',        label: '3v3',        teamSize: 3, streakMode: false, arenaLevel: 'spar_3v3_01',   column: 'left' },
  { id: 'spar_4v4',        label: '4v4',        teamSize: 4, streakMode: false, arenaLevel: 'spar_4v4_01',   column: 'left' },
  { id: 'spar_1v1_streak', label: '1v1 Streak', teamSize: 1, streakMode: true,  arenaLevel: 'spar_1v1_01',   column: 'right' },
  { id: 'spar_2v2_streak', label: '2v2 Streak', teamSize: 2, streakMode: true,  arenaLevel: 'spar_2v2_01',   column: 'right' },
  { id: 'spar_3v3_streak', label: '3v3 Streak', teamSize: 3, streakMode: true,  arenaLevel: 'spar_3v3_01',   column: 'right' },
  { id: 'spar_4v4_streak', label: '4v4 Streak', teamSize: 4, streakMode: true,  arenaLevel: 'spar_4v4_01',   column: 'right' },
];

let sparProgress = {
  totals: { wins: 0, losses: 0 },
  byMode: {
    '1v1': { wins: 0, losses: 0 },
    '2v2': { wins: 0, losses: 0 },
    '3v3': { wins: 0, losses: 0 },
    '4v4': { wins: 0, losses: 0 },
  },
  streak: {
    '1v1': { current: 0, best: 0 },
    '2v2': { current: 0, best: 0 },
    '3v3': { current: 0, best: 0 },
    '4v4': { current: 0, best: 0 },
  },
};

// v8 neutral factory — creates a clean learning profile with no bias
// All percentages start at 0.5 (neutral), all counts at 0
// Called on first load and on mechanics resets that invalidate old spar data
function createDefaultSparLearning() {
  return {
    version: 8,
    matchCount: 0,
    opening: {
      rushBottom: 0.5,
      strafeLeft: 0.5,
      route: 'bottomCenter',
      routeCounts: { bottomLeft: 0, bottomRight: 0, bottomCenter: 0, topHold: 0, midFlank: 0 },
      speedPct: 0.5,
      firstShotFrame: 90,
      shootsDuringOpening: 0.5,
      takesBottomPct: 0.5,
    },
    botOpenings: {
      lastRoute: null,
      routeResults: {
        bottomLeft:   { wins: 0, losses: 0, gotBottom: 0, total: 0, failStreak: 0 },
        bottomRight:  { wins: 0, losses: 0, gotBottom: 0, total: 0, failStreak: 0 },
        bottomCenter: { wins: 0, losses: 0, gotBottom: 0, total: 0, failStreak: 0 },
        topHold:      { wins: 0, losses: 0, gotBottom: 0, total: 0, failStreak: 0 },
        midFlank:     { wins: 0, losses: 0, gotBottom: 0, total: 0, failStreak: 0 },
        mirrorPlayer: { wins: 0, losses: 0, gotBottom: 0, total: 0, failStreak: 0 },
      },
    },
    position: {
      bottomBias: 0.5,
      leftBias: 0.5,
    },
    shooting: {
      upPct: 0.25,
      downPct: 0.25,
      leftPct: 0.25,
      rightPct: 0.25,
    },
    dodging: {
      leftBias: 0.5,
      upBias: 0.5,
    },
    aggression: {
      overall: 0.5,
      onEnemyReload: 0.5,
      whenLowHp: 0.5,
    },
    reload: {
      avgNormalizedY: 0.5,
    },
    whenHasBottom: {
      holdsPct: 0.5,
      shotFreq: 0.5,
      pushPct: 0.5,
    },
    whenBotHasBottom: {
      retakePct: 0.5,
      flankPct: 0.5,
      retreatPct: 0.5,
    },
    whenBotApproaches: {
      holdGroundPct: 0.5,
      counterPushPct: 0.5,
      sidestepPct: 0.5,
    },
    whenBotRetreats: {
      chasePct: 0.5,
      shotFreq: 0.5,
    },
    shotByPosition: {
      whenAbove: { downPct: 0.5, sidePct: 0.5 },
      whenBelow: { upPct: 0.5, sidePct: 0.5 },
      whenLevel: { leftPct: 0.5, rightPct: 0.5 },
    },
    playerShots: {
      hitRate: 0.5,
      hitRateClose: 0.5,
      hitRateMid: 0.5,
      hitRateFar: 0.5,
      hitWhenBotStrafing: 0.5,
      hitWhenBotStill: 0.5,
      hitWhenBotApproach: 0.5,
      hitWhenBotRetreat: 0.5,
    },
    botShots: {
      hitRate: 0.5,
      dodgedRate: 0.5,
      hitWhenPlayerStrafing: 0.5,
      hitWhenPlayerStill: 0.5,
      hitWhenPlayerApproach: 0.5,
    },
    combatPatterns: {
      playerHitDist: 250,
      botHitDist: 250,
      playerDmgWhenHasBottom: 0.5,
      botDmgWhenHasBottom: 0.5,
      tradeRatio: 0.5,
    },
    winRate: 0.5,
    history: [],
    afterHit: { pressesAdvantage: 0.5, retreatsOnDamage: 0.5 },
    lowHpExpanded: { fleesPct: 0.5, killAttemptPct: 0.5 },
    chasePatterns: { giveUpFrames: 90 },
    rhythm: {
      avgShotDelay: 8,         // avg frames from gaining LOS to firing (lower = faster shooter)
      avgRetreatDelay: 12,     // avg frames after firing before retreating
      avgReEngageDelay: 30,    // avg frames after retreating before re-approaching
      shootsEarlyPct: 0.5,     // tendency to fire before good alignment (0=patient, 1=spray)
      crossesAfterBottomLoss: 0.5,  // tendency to change horizontal side after losing bottom
      repeeksQuickly: 0.5,     // tendency to re-peek quickly after disengaging
      retreatsSameSide: 0.5,   // tendency to retreat in same direction vs crossing
    },
    nearWall: { cornerStuckPct: 0.5 },
    positionValue: { bottomWinCorrelation: 0.65, topPenalty: 0.4 },
    general1v1: {
      styleResults: {
        pressure: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
        control: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
        bait: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
      },
    },
    player1v1: {
      styleResults: {
        pressure: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
        control: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
        bait: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
      },
    },
    selfPlay1v1: {
      styleResults: {
        pressure: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
        control: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
        bait: { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 },
      },
    },
    reinforcement1v1: {
      general: {
        style: createSparRewardBuckets(Object.keys(SPAR_DUEL_STYLES)),
        opening: createSparRewardBuckets(SPAR_OPENING_ROUTE_KEYS),
        antiBottom: createSparRewardBuckets(SPAR_ANTI_BOTTOM_RESPONSE_KEYS),
        antiBottomFamily: createSparRewardBuckets(SPAR_ANTI_BOTTOM_FAMILY_KEYS),
        antiBottomTactic: createSparRewardBuckets(SPAR_ANTI_BOTTOM_TACTIC_KEYS),
        gunSidePolicy: createSparRewardBuckets(SPAR_GUN_SIDE_POLICY_KEYS),
        gunSideFamily: createSparRewardBuckets(SPAR_GUN_SIDE_FAMILY_KEYS),
        escapePolicy: createSparRewardBuckets(SPAR_ESCAPE_POLICY_KEYS),
        escapeFamily: createSparRewardBuckets(SPAR_ESCAPE_FAMILY_KEYS),
        shotTimingPolicy: createSparRewardBuckets(SPAR_SHOT_TIMING_KEYS),
        shotTimingFamily: createSparRewardBuckets(SPAR_SHOT_TIMING_FAMILY_KEYS),
        reloadPolicy: createSparRewardBuckets(SPAR_RELOAD_BEHAVIOR_KEYS),
        reloadFamily: createSparRewardBuckets(SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS),
        midPressurePolicy: createSparRewardBuckets(SPAR_MID_PRESSURE_KEYS),
        midPressureFamily: createSparRewardBuckets(SPAR_MID_PRESSURE_FAMILY_KEYS),
        wallPressurePolicy: createSparRewardBuckets(SPAR_WALL_PRESSURE_KEYS),
        wallPressureFamily: createSparRewardBuckets(SPAR_WALL_PRESSURE_FAMILY_KEYS),
      },
      player: {
        style: createSparRewardBuckets(Object.keys(SPAR_DUEL_STYLES)),
        opening: createSparRewardBuckets(SPAR_OPENING_ROUTE_KEYS),
        antiBottom: createSparRewardBuckets(SPAR_ANTI_BOTTOM_RESPONSE_KEYS),
        antiBottomFamily: createSparRewardBuckets(SPAR_ANTI_BOTTOM_FAMILY_KEYS),
        antiBottomTactic: createSparRewardBuckets(SPAR_ANTI_BOTTOM_TACTIC_KEYS),
        gunSidePolicy: createSparRewardBuckets(SPAR_GUN_SIDE_POLICY_KEYS),
        gunSideFamily: createSparRewardBuckets(SPAR_GUN_SIDE_FAMILY_KEYS),
        escapePolicy: createSparRewardBuckets(SPAR_ESCAPE_POLICY_KEYS),
        escapeFamily: createSparRewardBuckets(SPAR_ESCAPE_FAMILY_KEYS),
        shotTimingPolicy: createSparRewardBuckets(SPAR_SHOT_TIMING_KEYS),
        shotTimingFamily: createSparRewardBuckets(SPAR_SHOT_TIMING_FAMILY_KEYS),
        reloadPolicy: createSparRewardBuckets(SPAR_RELOAD_BEHAVIOR_KEYS),
        reloadFamily: createSparRewardBuckets(SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS),
        midPressurePolicy: createSparRewardBuckets(SPAR_MID_PRESSURE_KEYS),
        midPressureFamily: createSparRewardBuckets(SPAR_MID_PRESSURE_FAMILY_KEYS),
        wallPressurePolicy: createSparRewardBuckets(SPAR_WALL_PRESSURE_KEYS),
        wallPressureFamily: createSparRewardBuckets(SPAR_WALL_PRESSURE_FAMILY_KEYS),
      },
      selfPlay: {
        style: createSparRewardBuckets(Object.keys(SPAR_DUEL_STYLES)),
        opening: createSparRewardBuckets(SPAR_OPENING_ROUTE_KEYS),
        antiBottom: createSparRewardBuckets(SPAR_ANTI_BOTTOM_RESPONSE_KEYS),
        antiBottomFamily: createSparRewardBuckets(SPAR_ANTI_BOTTOM_FAMILY_KEYS),
        antiBottomTactic: createSparRewardBuckets(SPAR_ANTI_BOTTOM_TACTIC_KEYS),
        gunSidePolicy: createSparRewardBuckets(SPAR_GUN_SIDE_POLICY_KEYS),
        gunSideFamily: createSparRewardBuckets(SPAR_GUN_SIDE_FAMILY_KEYS),
        escapePolicy: createSparRewardBuckets(SPAR_ESCAPE_POLICY_KEYS),
        escapeFamily: createSparRewardBuckets(SPAR_ESCAPE_FAMILY_KEYS),
        shotTimingPolicy: createSparRewardBuckets(SPAR_SHOT_TIMING_KEYS),
        shotTimingFamily: createSparRewardBuckets(SPAR_SHOT_TIMING_FAMILY_KEYS),
        reloadPolicy: createSparRewardBuckets(SPAR_RELOAD_BEHAVIOR_KEYS),
        reloadFamily: createSparRewardBuckets(SPAR_RELOAD_BEHAVIOR_FAMILY_KEYS),
        midPressurePolicy: createSparRewardBuckets(SPAR_MID_PRESSURE_KEYS),
        midPressureFamily: createSparRewardBuckets(SPAR_MID_PRESSURE_FAMILY_KEYS),
        wallPressurePolicy: createSparRewardBuckets(SPAR_WALL_PRESSURE_KEYS),
        wallPressureFamily: createSparRewardBuckets(SPAR_WALL_PRESSURE_FAMILY_KEYS),
      },
    },
    tactical: {
      tacticFailStreaks: {
        contestDirect: 0, contestSprint: 0, lateCrossUnder: 0,
        flankWide: 0, flankTight: 0, forceMirrorThenBreak: 0,
        baitRetreat: 0, baitFake: 0, doubleFakeRetreat: 0,
      },
      trapZones: {
        center: { hits: 0, frames: 0 },
        near:   { hits: 0, frames: 0 },
        wide:   { hits: 0, frames: 0 },
      },
      antiBottomOutcomes: {
        attempts: 0, regainedBottom: 0,
        avgDmgTakenDuring: 0, avgDuration: 0,
      },
      openingLostBottom: {
        fromLeft: 0, fromRight: 0, fromCenter: 0, totalLosses: 0,
      },
      badLaneOutcomes: {
        attempts: 0, resolved: 0,
        avgDmgTakenDuring: 0, avgDuration: 0,
      },
      escapeOutcomes: {
        attempts: 0, resolved: 0,
        avgDmgTakenDuring: 0, avgDuration: 0,
      },
      gunSidePunish: {
        attempts: 0, punished: 0, avgDmgTaken: 0,
      },
      repeekFailStreaks: {
        center: 0, left: 0, right: 0, topLeft: 0, topRight: 0,
      },
      escapeFailStreaks: {
        cornerBreak: 0, highReset: 0, wideDisengage: 0, baitPullout: 0,
      },
      shotTimingOutcomes: {
        attempts: 0, hitsDuring: 0,
        avgDmgDealt: 0, avgDuration: 0,
      },
      reloadPunishOutcomes: {
        attempts: 0, punished: 0,
        avgDmgDealt: 0, avgDuration: 0,
      },
      midPressureOutcomes: {
        attempts: 0, dmgDealtDuring: 0,
        avgDmgDealt: 0, avgDuration: 0,
      },
      wallPressureOutcomes: {
        attempts: 0, pinned: 0,
        avgDmgDealt: 0, avgDuration: 0,
      },
    },
    gunSide: {
      playerPreference: 'left',
      leftPct: 0.5,
    },
    hitboxAwareness: {
      playerHorizHitRate: 0.5,
      playerVertHitRate: 0.5,
      botHorizHitRate: 0.5,
      botVertHitRate: 0.5,
      peekSuccessRate: 0.5,
    },
  };
}

// Initialize with neutral defaults — localStorage overrides on load
let sparLearning = createDefaultSparLearning();

// Quick helper — type sparData() in console to copy learning data
function sparData() {
  const json = JSON.stringify(sparLearning, null, 2);
  try {
    const ta = document.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'position:fixed;top:10px;left:10px;width:80vw;height:80vh;z-index:99999;font-size:12px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    console.log('Copied! Close the text box by clicking the page or running: document.querySelector("textarea").remove()');
    setTimeout(() => { if (ta.parentNode) ta.remove(); }, 15000);
  } catch (e) {
    console.log(json);
  }
  return json;
}

// Console helper to wipe learning data during testing
function resetSparLearning() {
  const fresh = createDefaultSparLearning();
  Object.keys(sparLearning).forEach(k => delete sparLearning[k]);
  Object.assign(sparLearning, fresh);
  if (typeof SaveLoad !== 'undefined') SaveLoad.save();
  console.log('[Spar] Learning profile wiped to neutral v8-compatible defaults');
  return sparLearning;
}

// Console helper — compact summary of Jeff-specific anti-bottom learning
function sparSummary() {
  const sl = sparLearning;
  const t = sl.tactical || {};
  const rf = sl.reinforcement1v1 || {};
  const pTactic = rf.player && rf.player.antiBottomTactic || {};
  const pFamily = rf.player && rf.player.antiBottomFamily || {};
  const pGunSide = rf.player && rf.player.gunSidePolicy || {};
  const pEscape = rf.player && rf.player.escapePolicy || {};

  console.log('=== Spar Bot v9 Summary ===');
  console.log(`Matches: ${sl.matchCount}, Win Rate: ${(sl.winRate * 100).toFixed(1)}%`);

  // Fail streaks
  const fs = t.tacticFailStreaks || {};
  const worstFS = Object.entries(fs).sort((a, b) => b[1] - a[1]);
  console.log('\n--- Fail Streaks (highest first) ---');
  for (const [k, v] of worstFS) console.log(`  ${k}: ${v}`);

  // Tactic rewards
  console.log('\n--- Player Anti-Bottom Tactic Rewards ---');
  for (const [k, v] of Object.entries(pTactic)) {
    console.log(`  ${k}: reward=${(v.reward || 0.5).toFixed(3)} plays=${v.plays || 0}`);
  }

  // Family rewards
  console.log('\n--- Player Anti-Bottom Family Rewards ---');
  for (const [k, v] of Object.entries(pFamily)) {
    console.log(`  ${k}: reward=${(v.reward || 0.5).toFixed(3)} plays=${v.plays || 0}`);
  }

  // Trap zones
  const tz = t.trapZones || {};
  console.log('\n--- Trap Zone Danger ---');
  for (const zone of ['center', 'near', 'wide']) {
    const z = tz[zone] || { hits: 0, frames: 0 };
    const rate = z.frames > 30 ? (z.hits / z.frames * 100).toFixed(1) + '%' : 'n/a';
    console.log(`  ${zone}: ${rate} (${Math.round(z.frames)} frames)`);
  }

  // Anti-bottom outcomes
  const ao = t.antiBottomOutcomes || {};
  const regainPct = ao.attempts > 0 ? (ao.regainedBottom / ao.attempts * 100).toFixed(1) + '%' : 'n/a';
  console.log(`\n--- Anti-Bottom Outcomes ---`);
  console.log(`  Attempts: ${ao.attempts}, Regain Rate: ${regainPct}`);
  console.log(`  Avg Dmg Taken: ${(ao.avgDmgTakenDuring || 0).toFixed(1)}, Avg Duration: ${Math.round(ao.avgDuration || 0)} frames`);

  // Gun-side policy rewards
  console.log('\n--- Player Gun-Side Policy Rewards ---');
  for (const [k, v] of Object.entries(pGunSide)) {
    console.log(`  ${k}: reward=${(v.reward || 0.5).toFixed(3)} plays=${v.plays || 0}`);
  }

  // Escape policy rewards
  console.log('\n--- Player Escape Policy Rewards ---');
  for (const [k, v] of Object.entries(pEscape)) {
    console.log(`  ${k}: reward=${(v.reward || 0.5).toFixed(3)} plays=${v.plays || 0}`);
  }

  const bo = t.badLaneOutcomes || {};
  const eo = t.escapeOutcomes || {};
  const gp = t.gunSidePunish || {};
  const repeek = t.repeekFailStreaks || {};
  const worstLane = Object.entries(repeek).sort((a, b) => b[1] - a[1])[0] || ['none', 0];
  const badLaneResolve = bo.attempts > 0 ? (bo.resolved / bo.attempts * 100).toFixed(1) + '%' : 'n/a';
  const escapeResolve = eo.attempts > 0 ? (eo.resolved / eo.attempts * 100).toFixed(1) + '%' : 'n/a';
  const punishRate = gp.attempts > 0 ? (gp.punished / gp.attempts * 100).toFixed(1) + '%' : 'n/a';
  console.log('\n--- Lane / Escape Outcomes ---');
  console.log(`  Bad lane resolve: ${badLaneResolve}, avg dmg=${(bo.avgDmgTakenDuring || 0).toFixed(1)}, avg duration=${Math.round(bo.avgDuration || 0)}f`);
  console.log(`  Escape success: ${escapeResolve}, avg dmg=${(eo.avgDmgTakenDuring || 0).toFixed(1)}, avg duration=${Math.round(eo.avgDuration || 0)}f`);
  console.log(`  Gun-side punish rate: ${punishRate}, avg dmg taken=${(gp.avgDmgTaken || 0).toFixed(1)}`);
  console.log(`  Worst repeated lane shape: ${worstLane[0]} (${worstLane[1]})`);

  return 'Done';
}
