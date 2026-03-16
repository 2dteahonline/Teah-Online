// ===================== SPAR DATA =====================
// Shared data: spar building constants, room definitions, persistent progress
// Phase A — loaded after partyData.js

const SPAR_CONFIG = {
  HUB_LEVEL: 'spar_hub_01',
  RETURN_LEVEL: 'lobby_01',
  RETURN_TX: 17, RETURN_TY: 34,
  HP_BASELINE: 100,
  COUNTDOWN_FRAMES: 180,       // 3 seconds at 60fps
  POST_MATCH_FRAMES: 300,      // 5 seconds results
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
// Uses exponential moving averages (alpha=0.3) so recent matches matter more
// Checkpoint: last saved from 24 matches (2026-03-16)
// If localStorage has newer data, it overrides these defaults on load.
// To update: paste sparData() output to Claude, who updates these defaults.
let sparLearning = {
  version: 2,
  matchCount: 24,
  opening: {
    rushBottom: 0.963,
    strafeLeft: 0.416,
    route: 'unknown',
    routeCounts: { bottomLeft: 0, bottomRight: 0, bottomCenter: 0, topHold: 0, midStrafe: 0 },
    speedPct: 0.5,
    firstShotFrame: 180,
    shootsDuringOpening: 0.5,
    takesBottomPct: 0.5,
  },
  botOpenings: {
    lastRoute: 'bottomCenter',
    routeResults: {
      bottomLeft:   { wins: 0, losses: 0, gotBottom: 0, total: 0 },
      bottomRight:  { wins: 0, losses: 0, gotBottom: 0, total: 0 },
      bottomCenter: { wins: 0, losses: 0, gotBottom: 0, total: 0 },
      topHold:      { wins: 0, losses: 0, gotBottom: 0, total: 0 },
      midFlank:     { wins: 0, losses: 0, gotBottom: 0, total: 0 },
      mirrorPlayer: { wins: 0, losses: 0, gotBottom: 0, total: 0 },
    },
  },
  position: {
    bottomBias: 0.763,
    leftBias: 0.531,
  },
  shooting: {
    upPct: 0.051,
    downPct: 0.488,
    leftPct: 0.427,
    rightPct: 0.034,
  },
  dodging: {
    leftBias: 0.438,
    upBias: 0.462,
  },
  aggression: {
    overall: 0.496,
    onEnemyReload: 0.203,
    whenLowHp: 0.310,
  },
  reload: {
    avgNormalizedY: 0.632,
  },
  whenHasBottom: {
    holdsPct: 0.488,
    shotFreq: 0.953,
    pushPct: 0.194,
  },
  whenBotHasBottom: {
    retakePct: 0.267,
    flankPct: 0.256,
    retreatPct: 0.538,
  },
  whenBotApproaches: {
    holdGroundPct: 0.136,
    counterPushPct: 0.339,
    sidestepPct: 0.647,
  },
  whenBotRetreats: {
    chasePct: 0.682,
    shotFreq: 0.813,
  },
  shotByPosition: {
    whenAbove: { downPct: 0.303, sidePct: 0.697 },
    whenBelow: { upPct: 0.178, sidePct: 0.822 },
    whenLevel: { leftPct: 0.437, rightPct: 0.041 },
  },
  playerShots: {
    hitRate: 0.201,
    hitRateClose: 0.247,
    hitRateMid: 0.188,
    hitRateFar: 0.224,
    hitWhenBotStrafing: 0.386,
    hitWhenBotStill: 0.241,
    hitWhenBotApproach: 0.116,
    hitWhenBotRetreat: 0.102,
  },
  botShots: {
    hitRate: 0.131,
    dodgedRate: 0.827,
    hitWhenPlayerStrafing: 0.077,
    hitWhenPlayerStill: 0.350,
    hitWhenPlayerApproach: 0.177,
  },
  combatPatterns: {
    playerHitDist: 217,
    botHitDist: 156,
    playerDmgWhenHasBottom: 0.076,
    botDmgWhenHasBottom: 0.155,
    tradeRatio: 0.5,
  },
  winRate: 0.490,
  history: [],  // history not checkpointed — only lives in localStorage
};

// Quick helper — type sparData() in console to copy learning data to clipboard
function sparData() {
  const json = JSON.stringify(sparLearning, null, 2);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(json).then(() => console.log('sparLearning copied to clipboard!'));
  } else {
    console.log(json);
  }
  return json;
}
