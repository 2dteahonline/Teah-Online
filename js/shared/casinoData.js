// ═══════════════════════════════════════════════════════════════
//  CASINO DATA — Pure data registry for all casino games
//  FUTURE: Add persistent casino stats/currency on next casino update
// ═══════════════════════════════════════════════════════════════

const CASINO_CONFIG = {
  BET_MIN: 10,
  BET_MAX: 10000,
  BET_PRESETS: [10, 50, 100, 500, 1000, 5000, 10000],
  HOUSE_EDGE: 0.05,
};

const BLACKJACK_CONFIG = {
  DECKS: 6,
  BJ_PAYOUT: 1.5,
  DEALER_STAND: 17,
};

// European roulette: single zero
const ROULETTE_NUMBERS = [
  { number: 0,  color: 'green' },
  { number: 1,  color: 'red' },   { number: 2,  color: 'black' },
  { number: 3,  color: 'red' },   { number: 4,  color: 'black' },
  { number: 5,  color: 'red' },   { number: 6,  color: 'black' },
  { number: 7,  color: 'red' },   { number: 8,  color: 'black' },
  { number: 9,  color: 'red' },   { number: 10, color: 'black' },
  { number: 11, color: 'black' }, { number: 12, color: 'red' },
  { number: 13, color: 'black' }, { number: 14, color: 'red' },
  { number: 15, color: 'black' }, { number: 16, color: 'red' },
  { number: 17, color: 'black' }, { number: 18, color: 'red' },
  { number: 19, color: 'red' },   { number: 20, color: 'black' },
  { number: 21, color: 'red' },   { number: 22, color: 'black' },
  { number: 23, color: 'red' },   { number: 24, color: 'black' },
  { number: 25, color: 'red' },   { number: 26, color: 'black' },
  { number: 27, color: 'red' },   { number: 28, color: 'black' },
  { number: 29, color: 'black' }, { number: 30, color: 'red' },
  { number: 31, color: 'black' }, { number: 32, color: 'red' },
  { number: 33, color: 'black' }, { number: 34, color: 'red' },
  { number: 35, color: 'black' }, { number: 36, color: 'red' },
];

// Red numbers for quick lookup
const ROULETTE_REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

// Roulette bet definitions: type → { label, payout, check(n) }
// check(n) returns true if number n wins this bet
const ROULETTE_BET_TYPES = {
  // Outside bets (1:1)
  red:    { label: 'Red',    payout: 1, check: n => ROULETTE_REDS.has(n) },
  black:  { label: 'Black',  payout: 1, check: n => n > 0 && !ROULETTE_REDS.has(n) },
  odd:    { label: 'Odd',    payout: 1, check: n => n > 0 && n % 2 === 1 },
  even:   { label: 'Even',   payout: 1, check: n => n > 0 && n % 2 === 0 },
  low:    { label: '1-18',   payout: 1, check: n => n >= 1 && n <= 18 },
  high:   { label: '19-36',  payout: 1, check: n => n >= 19 && n <= 36 },
  // Dozens (2:1)
  dozen1: { label: '1st 12', payout: 2, check: n => n >= 1 && n <= 12 },
  dozen2: { label: '2nd 12', payout: 2, check: n => n >= 13 && n <= 24 },
  dozen3: { label: '3rd 12', payout: 2, check: n => n >= 25 && n <= 36 },
  // Columns (2:1)
  col1:   { label: 'Col 1',  payout: 2, check: n => n > 0 && n % 3 === 1 },
  col2:   { label: 'Col 2',  payout: 2, check: n => n > 0 && n % 3 === 2 },
  col3:   { label: 'Col 3',  payout: 2, check: n => n > 0 && n % 3 === 0 },
};

// Inside bet payout multipliers (amount won per unit bet, NOT including bet return)
const ROULETTE_INSIDE_PAYOUTS = {
  straight: 35,  // single number
  split:    17,  // 2 adjacent numbers
  street:   11,  // row of 3
  corner:    8,  // block of 4
};

const CASE_TIERS = {
  cheap: {
    cost: 100,
    label: 'Cheap Case',
    color: '#888',
    // EV = 95g (5% house edge): 50×34 + 30×100 + 15×200 + 5×360 = 9500
    outcomes: [
      { weight: 50, gold: 34,  label: '34g' },
      { weight: 30, gold: 100, label: '100g' },
      { weight: 15, gold: 200, label: '200g' },
      { weight: 5,  gold: 360, label: '360g' },
    ],
  },
  medium: {
    cost: 500,
    label: 'Medium Case',
    color: '#4a9eff',
    // EV = 475.5g (~5% house edge): 45×150 + 30×400 + 18×900 + 7×1800 = 47550
    outcomes: [
      { weight: 45, gold: 150,  label: '150g' },
      { weight: 30, gold: 400,  label: '400g' },
      { weight: 18, gold: 900,  label: '900g' },
      { weight: 7,  gold: 1800, label: '1800g' },
    ],
  },
  expensive: {
    cost: 2000,
    label: 'Expensive Case',
    color: '#ff9a40',
    // EV = 1900g (5% house edge): 40×500 + 30×1500 + 20×3100 + 10×6300 = 190000
    outcomes: [
      { weight: 40, gold: 500,  label: '500g' },
      { weight: 30, gold: 1500, label: '1500g' },
      { weight: 20, gold: 3100, label: '3100g' },
      { weight: 10, gold: 6300, label: '6300g' },
    ],
  },
};

const MINES_CONFIG = {
  GRID_SIZE: 5,
  MIN_MINES: 1,
  MAX_MINES: 24,
  DEFAULT_MINES: 5,
  EDGE: 0.05,  // 5% house edge on multipliers
};

// European roulette wheel order (clockwise from 0)
const ROULETTE_WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

const STREAK_MULTIPLIER = 1.9;  // Heads or Tails: Math.pow(1.9, streak) — 5% edge per flip

// Dice: precomputed payouts per die1 value and choice, with 5% house edge
// payout = (1 / probability) * (1 - HOUSE_EDGE)
const DICE_PAYOUTS = {};
(function() {
  for (let d1 = 1; d1 <= 6; d1++) {
    DICE_PAYOUTS[d1] = {};
    // Count outcomes for each choice
    let higherCount = 6 - d1;   // numbers > d1
    let lowerCount = d1 - 1;    // numbers < d1
    let equalCount = 1;         // exactly d1

    if (higherCount > 0) {
      DICE_PAYOUTS[d1].higher = Math.floor(((6 / higherCount) * (1 - CASINO_CONFIG.HOUSE_EDGE)) * 100) / 100;
    }
    if (lowerCount > 0) {
      DICE_PAYOUTS[d1].lower = Math.floor(((6 / lowerCount) * (1 - CASINO_CONFIG.HOUSE_EDGE)) * 100) / 100;
    }
    DICE_PAYOUTS[d1].equal = Math.floor(((6 / equalCount) * (1 - CASINO_CONFIG.HOUSE_EDGE)) * 100) / 100;
  }
})();

const RPS_CHOICES = ['rock', 'paper', 'scissors'];
const RPS_BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
const RPS_PAYOUT = Math.floor((2 * (1 - CASINO_CONFIG.HOUSE_EDGE)) * 100) / 100; // ~1.90x (5% edge on 1:1)
const RPS_FORMATS = [
  { id: 'bo1', label: 'Best of 1', winsNeeded: 1 },
  { id: 'bo3', label: 'Best of 3', winsNeeded: 2 },
  { id: 'bo5', label: 'Best of 5', winsNeeded: 3 },
];

const BACCARAT_CONFIG = {
  DECKS: 8,
  PLAYER_PAYOUT: 0.91,  // ~5% house edge (fair ≈ 1.03:1, reduced to 0.91:1)
  BANKER_PAYOUT: 0.86,  // ~5% house edge (fair ≈ 0.96:1, reduced to 0.86:1)
  TIE_PAYOUT: 9,        // ~5% house edge (P(tie)≈9.52%, 9+1=10, 0.0952×10≈0.95)
};

const SLOTS_SYMBOLS = ['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven'];
const SLOTS_SYMBOL_DISPLAY = {
  cherry: { emoji: '🍒', color: '#ff4444', label: 'Cherry' },
  lemon:  { emoji: '🍋', color: '#ffdd00', label: 'Lemon' },
  orange: { emoji: '🍊', color: '#ff8800', label: 'Orange' },
  plum:   { emoji: '🍇', color: '#9944cc', label: 'Plum' },
  bell:   { emoji: '🔔', color: '#ffcc00', label: 'Bell' },
  bar:    { emoji: '📊', color: '#4488ff', label: 'Bar' },
  seven:  { emoji: '7️⃣',  color: '#ff2222', label: 'Seven' },
};

const SLOTS_CONFIG = {
  REELS: 3,
  STOPS_PER_REEL: 64,
  // Weighted symbol distribution per reel (same for all 3 reels)
  REEL_WEIGHTS: [
    { symbol: 'cherry', count: 12 },
    { symbol: 'lemon',  count: 11 },
    { symbol: 'orange', count: 10 },
    { symbol: 'plum',   count: 10 },
    { symbol: 'bell',   count: 9 },
    { symbol: 'bar',    count: 8 },
    { symbol: 'seven',  count: 4 },
  ],
  // Paytable: 3-of-a-kind multipliers on bet (winnings only, bet returned on top)
  // Calibrated with 2-cherry consolation for ~93% paytable return + ~2% jackpot = ~95% total
  PAYTABLE: {
    cherry: 12,
    lemon:  18,
    orange: 25,
    plum:   36,
    bell:   62,
    bar:    125,
    seven:  0,  // jackpot — handled separately
  },
  TWO_CHERRY_PAYOUT: 1,  // 2× cherry in any positions = return bet
  JACKPOT_SEED: 500,
  JACKPOT_CONTRIBUTION: 0.02,  // 2% of each bet added to pool
  SPIN_DURATION: 1800,  // ms total spin time
  REEL_STAGGER: 400,    // ms between each reel stopping
};

const KENO_CONFIG = {
  BOARD_SIZE: 40,
  BOARD_COLS: 8,
  BOARD_ROWS: 5,
  MAX_PICKS: 10,
  DRAW_COUNT: 10,
  DRAW_INTERVAL: 40,  // ms between each number drawn
  RISK_LEVELS: ['low', 'medium', 'high'],
  // Payout tables per risk level: PAYOUTS[risk][picks][matches] = multiplier
  // Same RNG/draw — only reward distribution changes.
  // Low = flatter, steadier returns. High = extreme top-end, worse small hits.
  // Payout tables computed via hypergeometric distribution for exactly 5% house edge.
  // Each pick count sums to 95% expected return. Max payouts capped per risk level.
  // Low max: 500x, Medium max: 2500x, High max: 10000x
  PAYOUTS: {
    low: {
      1:  { 1: 3.8 },
      2:  { 1: 2.06, 2: 2.73 },
      3:  { 1: 1.2, 2: 2.32, 3: 8.62 },
      4:  { 1: 0.82, 2: 1.36, 3: 5.57, 4: 32.6 },
      5:  { 2: 1.37, 3: 3.99, 4: 19.8, 5: 165.8 },
      6:  { 2: 0.93, 3: 2.26, 4: 9.45, 5: 56.9, 6: 500 },
      7:  { 3: 1.81, 4: 6.34, 5: 38.2, 6: 334.3, 7: 500 },
      8:  { 3: 1.3, 4: 3.75, 5: 15.4, 6: 127.7, 7: 500, 8: 500 },
      9:  { 4: 3.09, 5: 10.8, 6: 77.3, 7: 500, 8: 500, 9: 500 },
      10: { 4: 2.44, 5: 5.63, 6: 29.1, 7: 249.3, 8: 500, 9: 500, 10: 500 },
    },
    medium: {
      1:  { 1: 3.8 },
      2:  { 1: 1.85, 2: 4.13 },
      3:  { 2: 5.21, 3: 19.6 },
      4:  { 2: 2.46, 3: 8.04, 4: 46.3 },
      5:  { 2: 1.43, 3: 3.99, 4: 16.5, 5: 204.8 },
      6:  { 3: 3.12, 4: 13.3, 5: 80.4, 6: 1445.8 },
      7:  { 3: 1.77, 4: 6.16, 5: 34.8, 6: 400.6, 7: 2500 },
      8:  { 4: 4.58, 5: 21.4, 6: 171.8, 7: 2500, 8: 2500 },
      9:  { 4: 2.66, 5: 9.98, 6: 72.8, 7: 876.8, 8: 2500, 9: 2500 },
      10: { 5: 10.8, 6: 38.5, 7: 300, 8: 2500, 9: 2500, 10: 2500 },
    },
    high: {
      1:  { 1: 3.8 },
      2:  { 2: 16.5 },
      3:  { 2: 3.48, 3: 39.1 },
      4:  { 3: 16.1, 4: 137.4 },
      5:  { 3: 5.99, 4: 33.1, 5: 412.3 },
      6:  { 4: 20, 5: 161, 6: 2868.1 },
      7:  { 4: 7.72, 5: 54.6, 6: 626, 7: 10000 },
      8:  { 5: 30.7, 6: 273, 7: 4517, 8: 10000 },
      9:  { 5: 16, 6: 82.7, 7: 1248.3, 8: 10000, 9: 10000 },
      10: { 6: 67.6, 7: 446.4, 8: 10000, 9: 10000, 10: 10000 },
    },
  },
};

const CASINO_GAMES = [
  { id: 'blackjack',    label: 'Blackjack',     stationEntity: 'casino_blackjack' },
  { id: 'roulette',     label: 'Roulette',      stationEntity: 'casino_roulette' },
  { id: 'headsOrTails', label: 'Heads or Tails', stationEntity: 'casino_coinflip' },
  { id: 'cases',        label: 'Cases',          stationEntity: 'casino_cases' },
  { id: 'mines',        label: 'Mines',          stationEntity: 'casino_mines' },
  { id: 'dice',         label: 'Dice',           stationEntity: 'casino_dice' },
  { id: 'rps',          label: 'Rock Paper Scissors', stationEntity: 'casino_rps' },
  { id: 'baccarat',     label: 'Baccarat',           stationEntity: 'casino_baccarat' },
  { id: 'slots',        label: 'Slots',          stationEntity: 'casino_slots' },
  { id: 'keno',         label: 'Keno',           stationEntity: 'casino_keno' },
];
