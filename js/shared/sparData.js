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
// Checkpoint: last saved from 50 matches (2026-03-16)
// If localStorage has newer data, it overrides these defaults on load.
// To update: paste sparData() output to Claude, who updates these defaults.
let sparLearning = {
  version: 2,
  matchCount: 50,
  opening: {
    rushBottom: 0.773,
    strafeLeft: 0.252,
    route: 'bottomRight',
    routeCounts: { bottomLeft: 0, bottomRight: 7, bottomCenter: 4, topHold: 0, midStrafe: 9 },
    speedPct: 0.321,
    firstShotFrame: 16.5,
    shootsDuringOpening: 1.0,
    takesBottomPct: 0.5,
  },
  botOpenings: {
    lastRoute: 'bottomRight',
    routeResults: {
      bottomLeft:   { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      bottomRight:  { wins: 0, losses: 5, gotBottom: 0, total: 5 },
      bottomCenter: { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      topHold:      { wins: 0, losses: 4, gotBottom: 0, total: 4 },
      midFlank:     { wins: 0, losses: 9, gotBottom: 0, total: 9 },
      mirrorPlayer: { wins: 0, losses: 0, gotBottom: 0, total: 0 },
    },
  },
  position: {
    bottomBias: 0.780,
    leftBias: 0.518,
  },
  shooting: {
    upPct: 0.004,
    downPct: 0.470,
    leftPct: 0.466,
    rightPct: 0.060,
  },
  dodging: {
    leftBias: 0.683,
    upBias: 0.459,
  },
  aggression: {
    overall: 0.402,
    onEnemyReload: 0.281,
    whenLowHp: 0.276,
  },
  reload: {
    avgNormalizedY: 0.771,
  },
  whenHasBottom: {
    holdsPct: 0.412,
    shotFreq: 0.916,
    pushPct: 0.185,
  },
  whenBotHasBottom: {
    retakePct: 0.276,
    flankPct: 0.296,
    retreatPct: 0.338,
  },
  whenBotApproaches: {
    holdGroundPct: 0.087,
    counterPushPct: 0.389,
    sidestepPct: 0.676,
  },
  whenBotRetreats: {
    chasePct: 0.593,
    shotFreq: 0.960,
  },
  shotByPosition: {
    whenAbove: { downPct: 0.247, sidePct: 0.753 },
    whenBelow: { upPct: 0.060, sidePct: 0.940 },
    whenLevel: { leftPct: 0.169, rightPct: 0.011 },
  },
  playerShots: {
    hitRate: 0.210,
    hitRateClose: 0.303,
    hitRateMid: 0.030,
    hitRateFar: 0.361,
    hitWhenBotStrafing: 0.486,
    hitWhenBotStill: 0.031,
    hitWhenBotApproach: 0.081,
    hitWhenBotRetreat: 0.141,
  },
  botShots: {
    hitRate: 0.048,
    dodgedRate: 0.941,
    hitWhenPlayerStrafing: 0.082,
    hitWhenPlayerStill: 0.171,
    hitWhenPlayerApproach: 0.030,
  },
  combatPatterns: {
    playerHitDist: 309,
    botHitDist: 149,
    playerDmgWhenHasBottom: 0.147,
    botDmgWhenHasBottom: 0.371,
    tradeRatio: 0.5,
  },
  winRate: 1.0,
  history: [],  // history not checkpointed — only lives in localStorage
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
