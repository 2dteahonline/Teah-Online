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
// Checkpoint: last saved from 140 matches (2026-03-16)
// Physics changed at ~match 119: speed 8.33→6.66, bullet 10→9, hitbox 17→19
// If localStorage has newer data, it overrides these defaults on load.
// To update: paste sparData() output to Claude, who updates these defaults.
let sparLearning = {
  version: 3,
  matchCount: 140,
  opening: {
    rushBottom: 1.0,
    strafeLeft: 0.251,
    route: 'bottomCenter',
    routeCounts: { bottomLeft: 24, bottomRight: 20, bottomCenter: 47, topHold: 0, midFlank: 13, midStrafe: 19 },
    speedPct: 0.359,
    firstShotFrame: 35.5,
    shootsDuringOpening: 1.0,
    takesBottomPct: 0.392,
  },
  botOpenings: {
    lastRoute: 'midFlank',
    routeResults: {
      bottomLeft:   { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      bottomRight:  { wins: 0, losses: 7, gotBottom: 0, total: 7 },
      bottomCenter: { wins: 0, losses: 1, gotBottom: 0, total: 1 },
      topHold:      { wins: 0, losses: 4, gotBottom: 0, total: 4 },
      midFlank:     { wins: 20, losses: 27, gotBottom: 4, total: 47 },
      mirrorPlayer: { wins: 3, losses: 47, gotBottom: 39, total: 50 },
    },
  },
  position: {
    bottomBias: 0.823,
    leftBias: 0.534,
  },
  shooting: {
    upPct: 0.055,
    downPct: 0.477,
    leftPct: 0.440,
    rightPct: 0.028,
  },
  dodging: {
    leftBias: 0.628,
    upBias: 0.389,
  },
  aggression: {
    overall: 0.491,
    onEnemyReload: 0.412,
    whenLowHp: 0.238,
  },
  reload: {
    avgNormalizedY: 0.637,
  },
  whenHasBottom: {
    holdsPct: 0.467,
    shotFreq: 0.898,
    pushPct: 0.260,
  },
  whenBotHasBottom: {
    retakePct: 0.489,
    flankPct: 0.268,
    retreatPct: 0.248,
  },
  whenBotApproaches: {
    holdGroundPct: 0.106,
    counterPushPct: 0.445,
    sidestepPct: 0.298,
  },
  whenBotRetreats: {
    chasePct: 0.461,
    shotFreq: 0.833,
  },
  shotByPosition: {
    whenAbove: { downPct: 0.232, sidePct: 0.768 },
    whenBelow: { upPct: 0.026, sidePct: 0.974 },
    whenLevel: { leftPct: 0.112, rightPct: 0.0001 },
  },
  playerShots: {
    hitRate: 0.083,
    hitRateClose: 0.187,
    hitRateMid: 0.026,
    hitRateFar: 0.017,
    hitWhenBotStrafing: 0.297,
    hitWhenBotStill: 0.154,
    hitWhenBotApproach: 0.129,
    hitWhenBotRetreat: 0.010,
  },
  botShots: {
    hitRate: 0.197,
    dodgedRate: 0.663,
    hitWhenPlayerStrafing: 0.026,
    hitWhenPlayerStill: 0.139,
    hitWhenPlayerApproach: 0.090,
  },
  combatPatterns: {
    playerHitDist: 155,
    botHitDist: 187,
    playerDmgWhenHasBottom: 0.096,
    botDmgWhenHasBottom: 0.053,
    tradeRatio: 0.5,
  },
  winRate: 0.221,
  history: [],  // history not checkpointed — only lives in localStorage
  // Phase 1e: Circumstance learning
  afterHit: { pressesAdvantage: 0.092, retreatsOnDamage: 0.640 },
  lowHpExpanded: { fleesPct: 0.465, killAttemptPct: 0.535 },
  chasePatterns: { giveUpFrames: 89 },
  nearWall: { cornerStuckPct: 0.115 },
  // Phase 2/3: Split data stores
  general1v1: {
    styleResults: {
      pressure: { wins: 13, losses: 32, total: 45, avgDmgDelta: 38 },
      control: { wins: 6, losses: 16, total: 22, avgDmgDelta: 35 },
      bait: { wins: 0, losses: 1, total: 1, avgDmgDelta: -100 },
    },
  },
  jeffProfile: {
    styleResults: {
      pressure: { wins: 13, losses: 32, total: 45, avgDmgDelta: 38 },
      control: { wins: 6, losses: 16, total: 22, avgDmgDelta: 35 },
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
