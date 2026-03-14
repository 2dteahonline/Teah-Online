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
    outcomes: [
      { weight: 50, gold: 50,  label: '50g' },
      { weight: 30, gold: 150, label: '150g' },
      { weight: 15, gold: 300, label: '300g' },
      { weight: 5,  gold: 500, label: '500g' },
    ],
  },
  medium: {
    cost: 500,
    label: 'Medium Case',
    color: '#4a9eff',
    outcomes: [
      { weight: 45, gold: 200,  label: '200g' },
      { weight: 30, gold: 600,  label: '600g' },
      { weight: 18, gold: 1200, label: '1200g' },
      { weight: 7,  gold: 2500, label: '2500g' },
    ],
  },
  expensive: {
    cost: 2000,
    label: 'Expensive Case',
    color: '#ff9a40',
    outcomes: [
      { weight: 40, gold: 800,   label: '800g' },
      { weight: 30, gold: 2500,  label: '2500g' },
      { weight: 20, gold: 5000,  label: '5000g' },
      { weight: 10, gold: 10000, label: '10000g' },
    ],
  },
};

const MINES_CONFIG = {
  GRID_SIZE: 5,
  MIN_MINES: 1,
  MAX_MINES: 24,
  DEFAULT_MINES: 5,
  EDGE: 0.03,  // 3% house edge on multipliers
};

// European roulette wheel order (clockwise from 0)
const ROULETTE_WHEEL_ORDER = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

const STREAK_MULTIPLIER = 1.5;  // Heads or Tails: Math.pow(1.5, streak)

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
  PLAYER_PAYOUT: 1,     // 1:1
  BANKER_PAYOUT: 0.95,  // 1:1 minus 5% commission
  TIE_PAYOUT: 8,        // 8:1
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
  // Paytable: 3-of-a-kind multipliers on bet
  PAYTABLE: {
    cherry: 2,
    lemon:  3,
    orange: 4,
    plum:   6,
    bell:   10,
    bar:    20,
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
  DRAW_INTERVAL: 300,  // ms between each number drawn
  // Payout table: PAYOUTS[picks][matches] = multiplier (0 = no payout)
  PAYOUTS: {
    1:  { 1: 3.5 },
    2:  { 2: 8 },
    3:  { 2: 2, 3: 20 },
    4:  { 2: 1, 3: 4, 4: 50 },
    5:  { 3: 2, 4: 10, 5: 100 },
    6:  { 3: 1, 4: 4, 5: 20, 6: 200 },
    7:  { 4: 2, 5: 8, 6: 50, 7: 400 },
    8:  { 4: 1, 5: 4, 6: 20, 7: 100, 8: 800 },
    9:  { 5: 2, 6: 8, 7: 40, 8: 200, 9: 1500 },
    10: { 5: 1, 6: 4, 7: 20, 8: 80, 9: 400, 10: 2000 },
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
