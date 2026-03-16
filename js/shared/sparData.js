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
  // RoF: slider → fireRate frames. Piecewise: below 50 slower, above 50 faster
  rofToStat(pts) {
    let frames;
    if (pts <= 50) {
      frames = 11.025 - pts * 0.1125; // 0→11, 50→5.4
    } else {
      frames = 5.4 - (pts - 50) * 0.0375; // 50→5.4, 100→3.5
    }
    return frames;
  },
  // Spread: slider → degrees. 0→0°, 100→50°
  spreadToStat(pts) {
    return pts * 0.5;
  },
};

// Duel style definitions — weight multipliers for bot behavior in 1v1
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

// Persistent learning profile — bot tracks player tendencies across matches
// Uses exponential moving averages (alpha=0.5) so recent matches matter more
// Checkpoint: last saved from 148 matches (2026-03-16)
// Physics changed at ~match 119: speed 8.33→6.66, bullet 10→9, hitbox 17→19
// v4: Elliptical hitboxes (RX=38,RY=13), gun side awareness, body blocking, BULLET_R=7→23
// If localStorage has newer data, it overrides these defaults on load.
// To update: paste sparData() output to Claude, who updates these defaults.
let sparLearning = {
  version: 4,
  matchCount: 299,
  opening: {
    rushBottom: 0.969,
    strafeLeft: 0.171,
    route: 'bottomCenter',
    routeCounts: { bottomLeft: 44, bottomRight: 29, bottomCenter: 158, topHold: 0, midFlank: 13, midStrafe: 38 },
    speedPct: 0.445,
    firstShotFrame: 35.61,
    shootsDuringOpening: 0.969,
    takesBottomPct: 0.027,
  },
  botOpenings: {
    lastRoute: 'midFlank',
    routeResults: {
      bottomLeft:   { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      bottomRight:  { wins: 0, losses: 7, gotBottom: 0, total: 7 },
      bottomCenter: { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      topHold:      { wins: 0, losses: 4, gotBottom: 0, total: 4 },
      midFlank:     { wins: 66, losses: 140, gotBottom: 27, total: 206 },
      mirrorPlayer: { wins: 3, losses: 47, gotBottom: 39, total: 50 },
    },
  },
  position: {
    bottomBias: 0.756,
    leftBias: 0.537,
  },
  shooting: {
    upPct: 0.010,
    downPct: 0.777,
    leftPct: 0.185,
    rightPct: 0.029,
  },
  dodging: {
    leftBias: 0.450,
    upBias: 0.319,
  },
  aggression: {
    overall: 0.455,
    onEnemyReload: 0.605,
    whenLowHp: 0.129,
  },
  reload: {
    avgNormalizedY: 0.926,
  },
  whenHasBottom: {
    holdsPct: 0.386,
    shotFreq: 0.982,
    pushPct: 0.228,
  },
  whenBotHasBottom: {
    retakePct: 0.349,
    flankPct: 0.079,
    retreatPct: 0.116,
  },
  whenBotApproaches: {
    holdGroundPct: 0.092,
    counterPushPct: 0.699,
    sidestepPct: 0.165,
  },
  whenBotRetreats: {
    chasePct: 0.086,
    shotFreq: 0.732,
  },
  shotByPosition: {
    whenAbove: { downPct: 0.013, sidePct: 0.987 },
    whenBelow: { upPct: 0.440, sidePct: 0.560 },
    whenLevel: { leftPct: 0.051, rightPct: 0.0 },
  },
  playerShots: {
    hitRate: 0.505,
    hitRateClose: 0.608,
    hitRateMid: 0.258,
    hitRateFar: 0.063,
    hitWhenBotStrafing: 0.605,
    hitWhenBotStill: 0.603,
    hitWhenBotApproach: 0.389,
    hitWhenBotRetreat: 0.396,
  },
  botShots: {
    hitRate: 0.017,
    dodgedRate: 0.761,
    hitWhenPlayerStrafing: 0.155,
    hitWhenPlayerStill: 0.036,
    hitWhenPlayerApproach: 0.006,
  },
  combatPatterns: {
    playerHitDist: 114,
    botHitDist: 101,
    playerDmgWhenHasBottom: 0.488,
    botDmgWhenHasBottom: 0.125,
    tradeRatio: 0.5,
  },
  winRate: 0.99999,
  history: [],  // history not checkpointed — only lives in localStorage
  // Phase 1e: Circumstance learning
  afterHit: { pressesAdvantage: 0.243, retreatsOnDamage: 0.376 },
  lowHpExpanded: { fleesPct: 0.180, killAttemptPct: 0.820 },
  chasePatterns: { giveUpFrames: 180 },
  nearWall: { cornerStuckPct: 0.052 },
  positionValue: { bottomWinCorrelation: 0.95, topPenalty: 0.8 },
  // Phase 2/3: Split data stores
  general1v1: {
    styleResults: {
      pressure: { wins: 33, losses: 71, total: 104, avgDmgDelta: -90 },
      control: { wins: 32, losses: 84, total: 116, avgDmgDelta: -68 },
      bait: { wins: 0, losses: 7, total: 7, avgDmgDelta: -83 },
    },
  },
  jeffProfile: {
    styleResults: {
      pressure: { wins: 33, losses: 71, total: 104, avgDmgDelta: -90 },
      control: { wins: 32, losses: 84, total: 116, avgDmgDelta: -68 },
      bait: { wins: 0, losses: 7, total: 7, avgDmgDelta: -83 },
    },
  },
  // v4: Gun side + elliptical hitbox awareness
  gunSide: {
    playerPreference: 'right',
    leftPct: 0.0,
  },
  hitboxAwareness: {
    playerHorizHitRate: 0.491,
    playerVertHitRate: 0.716,
    botHorizHitRate: 0.004,
    botVertHitRate: 0.458,
    peekSuccessRate: 0.105,
  },
};

// Quick helper — type sparData() in console to copy learning data
function sparData() {
  const json = JSON.stringify(sparLearning, null, 2);
  // Try clipboard first, fall back to a selectable textarea
  try {
    const ta = document.createElement('textarea');
    ta.value = json;
    ta.style.cssText = 'position:fixed;top:10px;left:10px;width:80vw;height:80vh;z-index:99999;font-size:12px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    console.log('Copied! Close the text box by clicking the page or running: document.querySelector("textarea").remove()');
    setTimeout(() => { if (ta.parentNode) ta.remove(); }, 15000); // auto-remove after 15s
  } catch (e) {
    console.log(json);
  }
  return json;
}
