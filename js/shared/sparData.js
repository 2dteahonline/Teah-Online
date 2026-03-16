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
  BOT_SPEED: 8.33,
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
// Checkpoint: last saved from 119 matches (2026-03-16)
// If localStorage has newer data, it overrides these defaults on load.
// To update: paste sparData() output to Claude, who updates these defaults.
let sparLearning = {
  version: 3,
  matchCount: 119,
  opening: {
    rushBottom: 1.0,
    strafeLeft: 0.358,
    route: 'bottomCenter',
    routeCounts: { bottomLeft: 18, bottomRight: 20, bottomCenter: 33, topHold: 0, midFlank: 13, midStrafe: 18 },
    speedPct: 0.262,
    firstShotFrame: 24.5,
    shootsDuringOpening: 1.0,
    takesBottomPct: 0.844,
  },
  botOpenings: {
    lastRoute: 'midFlank',
    routeResults: {
      bottomLeft:   { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      bottomRight:  { wins: 0, losses: 7, gotBottom: 0, total: 7 },
      bottomCenter: { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      topHold:      { wins: 0, losses: 4, gotBottom: 0, total: 4 },
      midFlank:     { wins: 8, losses: 18, gotBottom: 1, total: 26 },
      mirrorPlayer: { wins: 3, losses: 47, gotBottom: 39, total: 50 },
    },
  },
  position: {
    bottomBias: 0.737,
    leftBias: 0.576,
  },
  shooting: {
    upPct: 0.043,
    downPct: 0.405,
    leftPct: 0.493,
    rightPct: 0.059,
  },
  dodging: {
    leftBias: 0.433,
    upBias: 0.505,
  },
  aggression: {
    overall: 0.496,
    onEnemyReload: 0.443,
    whenLowHp: 0.286,
  },
  reload: {
    avgNormalizedY: 0.716,
  },
  whenHasBottom: {
    holdsPct: 0.491,
    shotFreq: 0.999,
    pushPct: 0.264,
  },
  whenBotHasBottom: {
    retakePct: 0.367,
    flankPct: 0.198,
    retreatPct: 0.406,
  },
  whenBotApproaches: {
    holdGroundPct: 0.096,
    counterPushPct: 0.369,
    sidestepPct: 0.602,
  },
  whenBotRetreats: {
    chasePct: 0.426,
    shotFreq: 0.862,
  },
  shotByPosition: {
    whenAbove: { downPct: 0.407, sidePct: 0.593 },
    whenBelow: { upPct: 0.038, sidePct: 0.962 },
    whenLevel: { leftPct: 0.096, rightPct: 0.002 },
  },
  playerShots: {
    hitRate: 0.086,
    hitRateClose: 0.202,
    hitRateMid: 0.005,
    hitRateFar: 0.150,
    hitWhenBotStrafing: 0.047,
    hitWhenBotStill: 0.048,
    hitWhenBotApproach: 0.174,
    hitWhenBotRetreat: 0.006,
  },
  botShots: {
    hitRate: 0.128,
    dodgedRate: 0.818,
    hitWhenPlayerStrafing: 0.007,
    hitWhenPlayerStill: 0.091,
    hitWhenPlayerApproach: 0.088,
  },
  combatPatterns: {
    playerHitDist: 187,
    botHitDist: 204,
    playerDmgWhenHasBottom: 0.159,
    botDmgWhenHasBottom: 0.014,
    tradeRatio: 0.5,
  },
  winRate: 0.568,
  history: [],  // history not checkpointed — only lives in localStorage
  // Phase 1e: Circumstance learning
  afterHit: { pressesAdvantage: 0.206, retreatsOnDamage: 0.550 },
  lowHpExpanded: { fleesPct: 0.558, killAttemptPct: 0.442 },
  chasePatterns: { giveUpFrames: 176 },
  nearWall: { cornerStuckPct: 0.074 },
  // Phase 2/3: Split data stores
  general1v1: {
    styleResults: {
      pressure: { wins: 4, losses: 26, total: 30, avgDmgDelta: 6 },
      control: { wins: 3, losses: 13, total: 16, avgDmgDelta: 58 },
      bait: { wins: 0, losses: 1, total: 1, avgDmgDelta: -100 },
    },
  },
  jeffProfile: {
    styleResults: {
      pressure: { wins: 4, losses: 26, total: 30, avgDmgDelta: 6 },
      control: { wins: 3, losses: 13, total: 16, avgDmgDelta: 58 },
      bait: { wins: 0, losses: 1, total: 1, avgDmgDelta: -100 },
    },
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
