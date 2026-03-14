// ═══════════════════════════════════════════════════════════════
//  CASINO SYSTEM — Authority layer for all casino games
//  Owns: bet validation, RNG, game state, payout resolution
//  FUTURE: Add persistent casino stats/currency on next casino update
// ═══════════════════════════════════════════════════════════════

const casinoState = {
  activeGame: null,     // 'blackjack'|'roulette'|'headsOrTails'|'cases'|'mines'|'dice'|null
  bet: 0,
  phase: 'idle',        // 'idle'|'betting'|'playing'|'result'
  result: null,         // { won: bool, payout: number, message: '' }
  resultTimer: 0,       // timestamp when result was set (for auto-dismiss)

  // Blackjack
  bj: {
    shoe: [],
    playerHand: [],
    dealerHand: [],
    splitHand: null,      // null or array of cards (when split)
    playingSplit: false,   // true when acting on split hand
    doubled: false,
    dealTimer: 0,         // timestamp for deal animation
    phase: 'betting',     // 'betting'|'dealing'|'player'|'dealer'|'result'|'split'
  },

  // Roulette
  rl: {
    bets: [],             // [{ type, value, amount }]  value = number for straight, [n1,n2] for split, etc.
    resultNumber: null,
    spinTimer: 0,         // timestamp of spin start
    phase: 'betting',     // 'betting'|'spinning'|'result'
    totalBet: 0,
  },

  // Heads or Tails
  hot: {
    streak: 0,
    currentMultiplier: 1,
    lastFlip: null,       // 'heads'|'tails'|null
    flipTimer: 0,         // animation timestamp
    phase: 'betting',     // 'betting'|'flipping'|'streaking'|'result'
  },

  // Cases
  cs: {
    selectedTier: null,   // 'cheap'|'medium'|'expensive'
    openedReward: null,   // { gold, label }
    openTimer: 0,         // animation timestamp
    phase: 'selecting',   // 'selecting'|'opening'|'result'
  },

  // Mines
  mn: {
    board: null,          // 5x5 array: true=mine, false=safe
    revealed: null,       // 5x5 array: true=revealed
    safeRevealed: 0,
    currentMultiplier: 1,
    mineCount: 5,         // user-selectable, 1-24
    phase: 'betting',     // 'betting'|'playing'|'result'
  },

  // Dice
  dc: {
    die1: 0,
    die2: 0,
    choice: null,         // 'higher'|'lower'|'equal'
    rollTimer: 0,         // animation timestamp
    phase: 'betting',     // 'betting'|'rolling1'|'rolled1'|'rolling2'|'result'
  },
};

// ═══════════════════════════════════════════════════════════════
//  SHARED HELPERS
// ═══════════════════════════════════════════════════════════════

function casinoPlaceBet(amount) {
  amount = Math.floor(amount);
  if (amount < CASINO_CONFIG.BET_MIN || amount > CASINO_CONFIG.BET_MAX) return false;
  if (amount > gold) return false;
  gold -= amount;
  casinoState.bet = amount;
  return true;
}

function casinoWin(payout) {
  payout = Math.floor(payout);
  gold += payout;
  casinoState.result = { won: true, payout, message: '+' + payout + 'g' };
  casinoState.phase = 'result';
  casinoState.resultTimer = Date.now();
}

function casinoLose(msg) {
  casinoState.result = { won: false, payout: 0, message: msg || 'You lose!' };
  casinoState.phase = 'result';
  casinoState.resultTimer = Date.now();
}

function casinoReset() {
  casinoState.activeGame = null;
  casinoState.bet = 0;
  casinoState.phase = 'idle';
  casinoState.result = null;
  casinoState.resultTimer = 0;
  // Reset sub-states
  casinoState.bj.shoe = [];
  casinoState.bj.playerHand = [];
  casinoState.bj.dealerHand = [];
  casinoState.bj.splitHand = null;
  casinoState.bj.playingSplit = false;
  casinoState.bj.doubled = false;
  casinoState.bj.dealTimer = 0;
  casinoState.bj.phase = 'betting';
  casinoState.rl.bets = [];
  casinoState.rl.resultNumber = null;
  casinoState.rl.spinTimer = 0;
  casinoState.rl.phase = 'betting';
  casinoState.rl.totalBet = 0;
  casinoState.hot.streak = 0;
  casinoState.hot.currentMultiplier = 1;
  casinoState.hot.lastFlip = null;
  casinoState.hot.flipTimer = 0;
  casinoState.hot.phase = 'betting';
  casinoState.cs.selectedTier = null;
  casinoState.cs.openedReward = null;
  casinoState.cs.openTimer = 0;
  casinoState.cs.phase = 'selecting';
  casinoState.mn.board = null;
  casinoState.mn.revealed = null;
  casinoState.mn.safeRevealed = 0;
  casinoState.mn.currentMultiplier = 1;
  casinoState.mn.mineCount = MINES_CONFIG.DEFAULT_MINES;
  casinoState.mn.phase = 'betting';
  casinoState.dc.die1 = 0;
  casinoState.dc.die2 = 0;
  casinoState.dc.choice = null;
  casinoState.dc.rollTimer = 0;
  casinoState.dc.phase = 'betting';
}

// Reset just the current game for "play again"
function casinoResetGame() {
  casinoState.result = null;
  casinoState.resultTimer = 0;
  casinoState.bet = 0;
  const g = casinoState.activeGame;
  if (g === 'blackjack') {
    casinoState.bj.playerHand = [];
    casinoState.bj.dealerHand = [];
    casinoState.bj.splitHand = null;
    casinoState.bj.playingSplit = false;
    casinoState.bj.doubled = false;
    casinoState.bj.dealTimer = 0;
    casinoState.bj.phase = 'betting';
  } else if (g === 'roulette') {
    casinoState.rl.bets = [];
    casinoState.rl.resultNumber = null;
    casinoState.rl.spinTimer = 0;
    casinoState.rl.phase = 'betting';
    casinoState.rl.totalBet = 0;
  } else if (g === 'headsOrTails') {
    casinoState.hot.streak = 0;
    casinoState.hot.currentMultiplier = 1;
    casinoState.hot.lastFlip = null;
    casinoState.hot.flipTimer = 0;
    casinoState.hot.phase = 'betting';
  } else if (g === 'cases') {
    casinoState.cs.selectedTier = null;
    casinoState.cs.openedReward = null;
    casinoState.cs.openTimer = 0;
    casinoState.cs.phase = 'selecting';
  } else if (g === 'mines') {
    casinoState.mn.board = null;
    casinoState.mn.revealed = null;
    casinoState.mn.safeRevealed = 0;
    casinoState.mn.currentMultiplier = 1;
    casinoState.mn.phase = 'betting';
  } else if (g === 'dice') {
    casinoState.dc.die1 = 0;
    casinoState.dc.die2 = 0;
    casinoState.dc.choice = null;
    casinoState.dc.rollTimer = 0;
    casinoState.dc.phase = 'betting';
  }
  casinoState.phase = 'betting';
}

// ═══════════════════════════════════════════════════════════════
//  BLACKJACK
// ═══════════════════════════════════════════════════════════════

const _BJSuits = ['♠', '♥', '♦', '♣'];
const _BJRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function _bjCardValue(card) {
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function _bjHandValue(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    total += _bjCardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function _bjIsBust(hand) { return _bjHandValue(hand) > 21; }
function _bjIsBlackjack(hand) { return hand.length === 2 && _bjHandValue(hand) === 21; }

function _bjIsSoft(hand) {
  // hand has an ace counted as 11
  let total = 0, aces = 0;
  for (const c of hand) {
    total += _bjCardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return aces > 0;
}

function casinoBJ_initShoe() {
  const shoe = [];
  for (let d = 0; d < BLACKJACK_CONFIG.DECKS; d++) {
    for (const suit of _BJSuits) {
      for (const rank of _BJRanks) {
        shoe.push({ rank, suit, color: (suit === '♥' || suit === '♦') ? 'red' : 'black' });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  casinoState.bj.shoe = shoe;
}

function _bjDraw() {
  if (casinoState.bj.shoe.length < 20) casinoBJ_initShoe();
  return casinoState.bj.shoe.pop();
}

function casinoBJ_deal() {
  const bj = casinoState.bj;
  if (bj.shoe.length < 20) casinoBJ_initShoe();
  bj.playerHand = [_bjDraw(), _bjDraw()];
  bj.dealerHand = [_bjDraw(), _bjDraw()];
  bj.splitHand = null;
  bj.playingSplit = false;
  bj.doubled = false;
  bj.dealTimer = Date.now();
  bj.phase = 'dealing';
  casinoState.phase = 'playing';
}

// Called from UI after dealing animation completes (~1s)
function casinoBJ_finishDeal() {
  const bj = casinoState.bj;
  const playerBJ = _bjIsBlackjack(bj.playerHand);
  const dealerBJ = _bjIsBlackjack(bj.dealerHand);
  if (playerBJ && dealerBJ) {
    bj.phase = 'result';
    casinoWin(casinoState.bet);
    casinoState.result.message = 'Push! Both Blackjack';
    return;
  }
  if (playerBJ) {
    bj.phase = 'result';
    const payout = Math.floor(casinoState.bet * (1 + BLACKJACK_CONFIG.BJ_PAYOUT));
    casinoWin(payout);
    casinoState.result.message = 'Blackjack! +' + payout + 'g';
    return;
  }
  if (dealerBJ) {
    bj.phase = 'result';
    casinoLose('Dealer Blackjack!');
    return;
  }
  bj.phase = 'player';
}

function casinoBJ_hit() {
  const bj = casinoState.bj;
  const hand = bj.playingSplit ? bj.splitHand : bj.playerHand;
  hand.push(_bjDraw());
  if (_bjIsBust(hand)) {
    if (bj.playingSplit) {
      // Bust on split hand — check main hand
      bj.playingSplit = false;
      if (_bjIsBust(bj.playerHand)) {
        bj.phase = 'result';
        casinoLose('Bust!');
      }
      // else main hand already resolved or waiting
      return;
    }
    if (bj.splitHand && !bj.playingSplit) {
      // Main hand bust, switch to split
      bj.playingSplit = true;
      return;
    }
    bj.phase = 'result';
    casinoLose('Bust!');
  }
}

function casinoBJ_stand() {
  const bj = casinoState.bj;
  if (bj.splitHand && !bj.playingSplit) {
    // Standing on main hand, switch to split
    bj.playingSplit = true;
    return;
  }
  // Dealer's turn
  bj.phase = 'dealer';
  casinoBJ_dealerPlay();
}

function casinoBJ_double() {
  const bj = casinoState.bj;
  const hand = bj.playingSplit ? bj.splitHand : bj.playerHand;
  if (hand.length !== 2) return;
  if (gold < casinoState.bet) return;
  gold -= casinoState.bet;
  casinoState.bet *= 2;
  bj.doubled = true;
  hand.push(_bjDraw());
  if (_bjIsBust(hand)) {
    bj.phase = 'result';
    casinoLose('Bust on Double!');
    return;
  }
  casinoBJ_stand();
}

function casinoBJ_split() {
  const bj = casinoState.bj;
  if (bj.playerHand.length !== 2) return;
  if (bj.playerHand[0].rank !== bj.playerHand[1].rank) return;
  if (bj.splitHand) return;
  if (gold < casinoState.bet) return;
  gold -= casinoState.bet;
  bj.splitHand = [bj.playerHand.pop()];
  bj.playerHand.push(_bjDraw());
  bj.splitHand.push(_bjDraw());
  bj.playingSplit = false;
  bj.phase = 'player';
}

function casinoBJ_dealerPlay() {
  const bj = casinoState.bj;
  // Dealer hits until 17+ (stands on soft 17)
  while (_bjHandValue(bj.dealerHand) < BLACKJACK_CONFIG.DEALER_STAND) {
    bj.dealerHand.push(_bjDraw());
  }
  bj.phase = 'result';
  _bjResolve();
}

function _bjResolve() {
  const bj = casinoState.bj;
  const dealerVal = _bjHandValue(bj.dealerHand);
  const dealerBust = _bjIsBust(bj.dealerHand);

  let totalPayout = 0;
  const hands = [bj.playerHand];
  if (bj.splitHand) hands.push(bj.splitHand);
  const betPerHand = bj.splitHand ? casinoState.bet / 2 : casinoState.bet;

  for (const hand of hands) {
    const val = _bjHandValue(hand);
    if (_bjIsBust(hand)) continue; // already lost
    if (dealerBust || val > dealerVal) {
      totalPayout += betPerHand * 2; // win: bet + winnings
    } else if (val === dealerVal) {
      totalPayout += betPerHand; // push: return bet
    }
    // else dealer wins, no payout
  }

  if (totalPayout > 0) {
    casinoWin(totalPayout);
    if (totalPayout === casinoState.bet) {
      casinoState.result.message = 'Push!';
    }
  } else {
    casinoLose('Dealer wins!');
  }
}

function casinoBJ_canSplit() {
  const bj = casinoState.bj;
  return bj.phase === 'player' && !bj.splitHand &&
    bj.playerHand.length === 2 &&
    bj.playerHand[0].rank === bj.playerHand[1].rank &&
    gold >= casinoState.bet;
}

function casinoBJ_canDouble() {
  const bj = casinoState.bj;
  const hand = bj.playingSplit ? bj.splitHand : bj.playerHand;
  return bj.phase === 'player' && hand && hand.length === 2 && gold >= casinoState.bet;
}

// ═══════════════════════════════════════════════════════════════
//  ROULETTE
// ═══════════════════════════════════════════════════════════════

function casinoRL_placeBet(type, value, amount) {
  amount = Math.floor(amount);
  if (amount < CASINO_CONFIG.BET_MIN) return false;
  if (amount > gold) return false;
  gold -= amount;
  casinoState.rl.bets.push({ type, value, amount });
  casinoState.rl.totalBet += amount;
  return true;
}

function casinoRL_clearBets() {
  // Refund all bets
  for (const b of casinoState.rl.bets) gold += b.amount;
  casinoState.rl.bets = [];
  casinoState.rl.totalBet = 0;
}

function casinoRL_spin() {
  if (casinoState.rl.bets.length === 0) return;
  casinoState.rl.resultNumber = Math.floor(Math.random() * 37); // 0-36
  casinoState.rl.spinTimer = Date.now();
  casinoState.rl.phase = 'spinning';
  casinoState.phase = 'playing';
}

function casinoRL_resolve() {
  const rl = casinoState.rl;
  const n = rl.resultNumber;
  let totalPayout = 0;

  for (const bet of rl.bets) {
    let won = false;
    let payoutMult = 0;

    if (ROULETTE_BET_TYPES[bet.type]) {
      // Outside bet or dozen/column
      won = ROULETTE_BET_TYPES[bet.type].check(n);
      payoutMult = ROULETTE_BET_TYPES[bet.type].payout;
    } else if (bet.type === 'straight') {
      won = n === bet.value;
      payoutMult = ROULETTE_INSIDE_PAYOUTS.straight;
    } else if (bet.type === 'split') {
      won = bet.value.includes(n);
      payoutMult = ROULETTE_INSIDE_PAYOUTS.split;
    } else if (bet.type === 'street') {
      won = bet.value.includes(n);
      payoutMult = ROULETTE_INSIDE_PAYOUTS.street;
    } else if (bet.type === 'corner') {
      won = bet.value.includes(n);
      payoutMult = ROULETTE_INSIDE_PAYOUTS.corner;
    }

    if (won) {
      totalPayout += bet.amount + bet.amount * payoutMult;
    }
  }

  rl.phase = 'result';
  if (totalPayout > 0) {
    casinoWin(totalPayout);
  } else {
    casinoLose('No winners — ' + n + ' ' + (ROULETTE_REDS.has(n) ? 'Red' : n === 0 ? 'Green' : 'Black'));
  }
}

// ═══════════════════════════════════════════════════════════════
//  HEADS OR TAILS
// ═══════════════════════════════════════════════════════════════

function casinoHOT_startRound(betAmount) {
  if (!casinoPlaceBet(betAmount)) return false;
  casinoState.hot.streak = 0;
  casinoState.hot.currentMultiplier = 1;
  casinoState.hot.lastFlip = null;
  casinoState.hot.phase = 'streaking';
  casinoState.phase = 'playing';
  return true;
}

function casinoHOT_flip() {
  const hot = casinoState.hot;
  hot.flipTimer = Date.now();
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  hot.lastFlip = result;
  if (result === 'heads') {
    hot.streak++;
    hot.currentMultiplier = Math.pow(STREAK_MULTIPLIER, hot.streak);
    hot.phase = 'streaking';
  } else {
    hot.phase = 'result';
    casinoLose('Tails! Lost ' + casinoState.bet + 'g');
  }
}

function casinoHOT_cashOut() {
  const hot = casinoState.hot;
  if (hot.streak === 0) return;
  const payout = Math.floor(casinoState.bet * hot.currentMultiplier);
  hot.phase = 'result';
  casinoWin(payout);
}

// ═══════════════════════════════════════════════════════════════
//  CASES
// ═══════════════════════════════════════════════════════════════

function casinoCS_open(tierId) {
  const tier = CASE_TIERS[tierId];
  if (!tier) return false;
  if (gold < tier.cost) return false;
  gold -= tier.cost;
  casinoState.bet = tier.cost;
  casinoState.cs.selectedTier = tierId;

  // Weighted random selection
  const outcomes = tier.outcomes;
  const totalWeight = outcomes.reduce((s, o) => s + o.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = outcomes[0];
  for (const o of outcomes) {
    roll -= o.weight;
    if (roll <= 0) { selected = o; break; }
  }

  casinoState.cs.openedReward = selected;
  casinoState.cs.openTimer = Date.now();
  casinoState.cs.phase = 'opening';
  casinoState.phase = 'playing';
  return true;
}

function casinoCS_reveal() {
  const cs = casinoState.cs;
  gold += cs.openedReward.gold;
  cs.phase = 'result';
  casinoState.result = {
    won: cs.openedReward.gold >= CASE_TIERS[cs.selectedTier].cost,
    payout: cs.openedReward.gold,
    message: cs.openedReward.label + '!',
  };
  casinoState.phase = 'result';
  casinoState.resultTimer = Date.now();
}

// ═══════════════════════════════════════════════════════════════
//  MINES
// ═══════════════════════════════════════════════════════════════

function casinoMN_start(betAmount) {
  if (!casinoPlaceBet(betAmount)) return false;
  const mn = casinoState.mn;
  const size = MINES_CONFIG.GRID_SIZE;

  // Create empty board
  mn.board = [];
  mn.revealed = [];
  for (let r = 0; r < size; r++) {
    mn.board[r] = [];
    mn.revealed[r] = [];
    for (let c = 0; c < size; c++) {
      mn.board[r][c] = false;
      mn.revealed[r][c] = false;
    }
  }

  // Place mines randomly using user-selected count
  const mineCount = mn.mineCount;
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (!mn.board[r][c]) {
      mn.board[r][c] = true;
      placed++;
    }
  }

  mn.safeRevealed = 0;
  mn.currentMultiplier = 1;
  mn.phase = 'playing';
  casinoState.phase = 'playing';
  return true;
}

function casinoMN_reveal(r, c) {
  const mn = casinoState.mn;
  if (mn.phase !== 'playing') return;
  if (r < 0 || r >= MINES_CONFIG.GRID_SIZE || c < 0 || c >= MINES_CONFIG.GRID_SIZE) return;
  if (mn.revealed[r][c]) return;

  mn.revealed[r][c] = true;

  if (mn.board[r][c]) {
    // Hit a mine!
    mn.phase = 'result';
    casinoLose('BOOM! Hit a mine!');
    return;
  }

  mn.safeRevealed++;
  const totalSafe = MINES_CONFIG.GRID_SIZE * MINES_CONFIG.GRID_SIZE - mn.mineCount;
  // Multiplier: product of (total_cells - i) / (safe_cells - i) for each reveal, with house edge
  let mult = 1;
  const totalCells = MINES_CONFIG.GRID_SIZE * MINES_CONFIG.GRID_SIZE;
  for (let i = 0; i < mn.safeRevealed; i++) {
    mult *= (totalCells - i) / (totalSafe - i);
  }
  mn.currentMultiplier = Math.floor(mult * (1 - MINES_CONFIG.EDGE) * 100) / 100;
}

function casinoMN_cashOut() {
  const mn = casinoState.mn;
  if (mn.safeRevealed === 0) return;
  const payout = Math.floor(casinoState.bet * mn.currentMultiplier);
  mn.phase = 'result';
  casinoWin(payout);
}

// ═══════════════════════════════════════════════════════════════
//  DICE
// ═══════════════════════════════════════════════════════════════

function casinoDC_start(betAmount) {
  if (!casinoPlaceBet(betAmount)) return false;
  casinoState.dc.die2 = 0;
  casinoState.dc.choice = null;
  casinoState.dc.rollTimer = Date.now();
  casinoState.dc.phase = 'rolling1';  // animate die 1 rolling
  casinoState.phase = 'playing';
  // Pre-determine result but show animation first
  casinoState.dc.die1 = Math.floor(Math.random() * 6) + 1;
  return true;
}

function casinoDC_getLegalChoices() {
  const d1 = casinoState.dc.die1;
  const choices = [];
  if (d1 > 1) choices.push('lower');
  choices.push('equal');
  if (d1 < 6) choices.push('higher');
  return choices;
}

function casinoDC_choose(choice) {
  const legal = casinoDC_getLegalChoices();
  if (!legal.includes(choice)) return;
  casinoState.dc.choice = choice;
  casinoState.dc.die2 = Math.floor(Math.random() * 6) + 1;
  casinoState.dc.rollTimer = Date.now();
  casinoState.dc.phase = 'rolling2';

  // Resolve after animation (will be called from UI when timer expires)
}

function casinoDC_resolve() {
  const dc = casinoState.dc;
  const d1 = dc.die1, d2 = dc.die2;
  let won = false;

  if (dc.choice === 'higher') won = d2 > d1;
  else if (dc.choice === 'lower') won = d2 < d1;
  else if (dc.choice === 'equal') won = d2 === d1;

  dc.phase = 'result';
  if (won) {
    const payoutMult = DICE_PAYOUTS[d1][dc.choice];
    const payout = Math.floor(casinoState.bet * payoutMult);
    casinoWin(payout);
  } else {
    casinoLose('Rolled ' + d2 + ' — not ' + dc.choice + '!');
  }
}
