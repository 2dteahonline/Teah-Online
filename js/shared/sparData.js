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
let sparLearning = {
  version: 2,
  matchCount: 0,
  opening: {
    rushBottom: 0.5,    // does player rush bottom? 0=never, 1=always
    strafeLeft: 0.5,    // opening strafe bias. 0=right, 1=left
    // v3: expanded opening data
    route: 'unknown',          // detected route: 'bottomLeft', 'bottomRight', 'bottomCenter', 'topHold', 'midStrafe'
    routeCounts: { bottomLeft: 0, bottomRight: 0, bottomCenter: 0, topHold: 0, midStrafe: 0 },
    speedPct: 0.5,             // how fast player commits (0=slow, 1=full speed)
    firstShotFrame: 180,       // avg frame when player fires first shot (lower = shoots earlier)
    shootsDuringOpening: 0.5,  // % of openings where player shoots before settling
    takesBottomPct: 0.5,       // % of openings where player actually secures bottom
  },
  // Bot's own opening performance (what works for the bot)
  botOpenings: {
    lastRoute: 'bottomCenter', // what bot did last match
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
    bottomBias: 0.5,    // 0=plays top, 1=plays bottom
    leftBias: 0.5,      // 0=plays right, 1=plays left
  },
  shooting: {
    upPct: 0.25,
    downPct: 0.25,
    leftPct: 0.25,
    rightPct: 0.25,
  },
  dodging: {
    leftBias: 0.5,      // dodges left vs right for vertical bullets
    upBias: 0.5,        // dodges up vs down for horizontal bullets
  },
  aggression: {
    overall: 0.5,       // 0=passive, 1=aggressive
    onEnemyReload: 0.5, // punish tendency during bot reload
    whenLowHp: 0.5,     // aggression when player is low
  },
  reload: {
    avgNormalizedY: 0.5, // where player reloads (0=top, 1=bottom)
  },
  // --- Situational / relational data (v2) ---
  // "What does the player do based on the game state?"
  whenHasBottom: {
    holdsPct: 0.5,       // 0=leaves/pushes, 1=holds position
    shotFreq: 0.5,       // 0=rarely shoots, 1=spam walls
    pushPct: 0.5,        // 0=stays back, 1=pushes toward bot
  },
  whenBotHasBottom: {
    retakePct: 0.5,      // 0=gives up / plays top, 1=always tries to retake
    flankPct: 0.5,       // 0=comes straight down, 1=flanks to the side
    retreatPct: 0.5,     // 0=stays engaged, 1=retreats / creates distance
  },
  whenBotApproaches: {
    holdGroundPct: 0.5,  // 0=runs away, 1=stands and fights
    counterPushPct: 0.5, // 0=never counter-pushes, 1=always counter-charges
    sidestepPct: 0.5,    // 0=moves vertically, 1=dodges sideways
  },
  whenBotRetreats: {
    chasePct: 0.5,       // 0=lets bot go, 1=chases aggressively
    shotFreq: 0.5,       // 0=stops shooting, 1=shoots while chasing
  },
  shotByPosition: {
    // what dir player shoots from each relative position
    whenAbove: { downPct: 0.5, sidePct: 0.5 },   // above bot: shoot down vs strafe-shoot
    whenBelow: { upPct: 0.5, sidePct: 0.5 },      // below bot: shoot up vs strafe-shoot
    whenLevel: { leftPct: 0.5, rightPct: 0.5 },   // same height: shoot left vs right
  },
  // --- Combat outcome data (v2) ---
  // "What works and what doesn't — cause and effect"
  playerShots: {
    hitRate: 0.5,            // overall accuracy
    hitRateClose: 0.5,       // accuracy at <150px
    hitRateMid: 0.5,         // accuracy at 150-300px
    hitRateFar: 0.5,         // accuracy at 300+px
    hitWhenBotStrafing: 0.5, // accuracy when bot is moving sideways
    hitWhenBotStill: 0.5,    // accuracy when bot isn't moving much
    hitWhenBotApproach: 0.5, // accuracy when bot closing distance
    hitWhenBotRetreat: 0.5,  // accuracy when bot backing off
  },
  botShots: {
    hitRate: 0.5,            // how often bot lands shots
    dodgedRate: 0.5,         // how often player dodges (moved away before impact)
    hitWhenPlayerStrafing: 0.5, // bot accuracy vs strafing player
    hitWhenPlayerStill: 0.5,    // bot accuracy vs still player
    hitWhenPlayerApproach: 0.5, // bot accuracy vs approaching player
  },
  combatPatterns: {
    playerHitDist: 250,         // avg distance when player lands hits
    botHitDist: 250,            // avg distance when bot lands hits
    playerDmgWhenHasBottom: 0.5, // % of player damage dealt while having bottom (0-1)
    botDmgWhenHasBottom: 0.5,    // % of bot damage dealt while having bottom
    tradeRatio: 0.5,            // when both deal damage within 30 frames, player % of damage
  },
  winRate: 0.5,
  history: [],           // last 20 match summaries
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
