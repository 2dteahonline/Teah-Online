# Casino System

## Overview

A full-featured casino with 10 gambling games, each accessible via in-game entity stations. All games enforce a uniform 5% house edge. The player bets gold, plays the game, and receives payouts (or loses their bet). The casino has no persistent stats or currency — everything operates on the global `gold` variable and resets per-session (except the slots jackpot pool which is session-persistent).

## Files

- `js/shared/casinoData.js` — Pure data: `CASINO_CONFIG`, per-game configs, payout tables, symbol definitions, roulette numbers/wheel order
- `js/authority/casinoSystem.js` — Authority layer: bet validation, RNG, game state machines, payout resolution
- `js/client/ui/casinoUI.js` — Rendering + click handling: panel drawing, animations, bet controls, per-game draw/click dispatch

## Games

### Blackjack
- **Config**: `BLACKJACK_CONFIG` — 6-deck shoe, BJ pays 1.5x (with 5% edge), dealer stands on 17.
- **Rules**: Standard blackjack. Player can Hit, Stand, Double Down, or Split (if first two cards have equal value). Insurance offered when dealer shows Ace.
- **Shoe**: 6-deck Fisher-Yates shuffled shoe (`casinoBJ_initShoe()`). Auto-reshuffles when fewer than 20 cards remain.
- **Phases**: `betting` → `dealing` → `insurance` (if dealer shows Ace) → `player` → `dealer` → `result`. Card animations use `_addedAt` timestamps with staggered delays (400ms between cards).
- **Split**: Creates a second hand with equal bet deducted from gold. Each hand plays independently. `bj._handBets[0]` and `bj._handBets[1]` track per-hand wagers.
- **Double Down**: Doubles the current hand's bet, draws exactly one card, then auto-stands.
- **Insurance**: Costs half the original bet. If dealer has BJ, pays 2:1 + returns the insurance bet (3x total).
- **Payout**: Win = bet + `floor(bet * (1 - 0.05))`. Blackjack = bet + `floor(bet * 1.5 * 0.95)`. Push = bet returned.
- **State key**: `casinoState.bj`
- **Key functions**: `casinoBJ_deal()`, `casinoBJ_hit()`, `casinoBJ_stand()`, `casinoBJ_double()`, `casinoBJ_split()`, `casinoBJ_dealerPlay()`, `casinoBJ_canSplit()`, `casinoBJ_canDouble()`

### Roulette
- **Config**: European single-zero (37 numbers: 0-36). `ROULETTE_NUMBERS` defines number/color pairs. `ROULETTE_WHEEL_ORDER` defines physical wheel layout.
- **Bet types**: Outside bets (Red/Black, Odd/Even, Low/High at 1:1), Dozens/Columns (2:1), Inside bets (Straight 35:1, Split 17:1, Street 11:1, Corner 8:1).
- **Multiple bets**: Player can place multiple bets before spinning. All tracked in `casinoState.rl.bets[]`. Clear button refunds all.
- **Phases**: `betting` → `spinning` → `result`. Spin is purely cosmetic (result pre-determined by `Math.floor(Math.random() * 37)`).
- **Payout**: Each winning bet returns `amount + amount * payoutMultiplier`. No house edge reduction on roulette payouts (the zero provides the natural edge).
- **State key**: `casinoState.rl`
- **Key functions**: `casinoRL_placeBet()`, `casinoRL_clearBets()`, `casinoRL_spin()`, `casinoRL_resolve()`

### Heads or Tails
- **Mechanic**: Streak-based coin flip. Player places initial bet, then repeatedly picks heads or tails. Each correct guess multiplies the payout by `1.9^streak` (`STREAK_MULTIPLIER = 1.9`, giving ~5% edge per flip vs fair 2.0x). Player can cash out at any time after streak >= 1.
- **Phases**: `betting` → `choosing` → `flipping` (animation) → loops back to `choosing` on correct, or `result` on wrong.
- **Payout**: `floor(bet * 1.9^streak)` on cash-out. Loss = entire bet forfeited.
- **State key**: `casinoState.hot`
- **Key functions**: `casinoHOT_startRound()`, `casinoHOT_choose()`, `casinoHOT_resolveFlip()`, `casinoHOT_cashOut()`

### Cases
- **Config**: `CASE_TIERS` — three tiers (Cheap 100g, Medium 500g, Expensive 2000g). Each has 4 weighted outcomes.
- **Mechanic**: Buy a case, get a weighted random gold reward. No betting step — the case cost IS the bet. EV is exactly 95% of cost (5% house edge baked into outcome weights).
- **Phases**: `selecting` → `opening` (animation) → `result`.
- **Outcome examples (Cheap Case)**: 34g (50%), 100g (30%), 200g (15%), 360g (5%).
- **State key**: `casinoState.cs`
- **Key functions**: `casinoCS_open()`, `casinoCS_reveal()`

### Mines
- **Config**: `MINES_CONFIG` — 5x5 grid, 1-24 mines (user-selectable, default 5).
- **Mechanic**: Minesweeper-style. Player places a bet, then reveals tiles one by one. Each safe reveal increases the multiplier. Hit a mine = lose everything. Cash out at any time.
- **Multiplier formula**: Product of `(totalCells - i) / (safeCells - i)` for each reveal `i`, then `* (1 - 0.05)` for house edge. More mines = higher multiplier per reveal, but more risk.
- **Phases**: `betting` → `playing` (reveal tiles) → `result` (mine hit or cash out).
- **State key**: `casinoState.mn`
- **Key functions**: `casinoMN_start()`, `casinoMN_reveal()`, `casinoMN_cashOut()`

### Dice
- **Config**: `DICE_PAYOUTS` — precomputed per die1 value and choice, with 5% edge. Formula: `floor((6 / outcomeCount) * 0.95 * 100) / 100`.
- **Mechanic**: First die rolls automatically. Player predicts whether the second die will be Higher, Lower, or Equal. Fewer possible winning outcomes = higher payout.
- **Phases**: `betting` → `rolling1` (animate die 1) → `rolled1` (choose higher/lower/equal) → `rolling2` (animate die 2) → `result`.
- **Payout examples**: Die1=3, choose "higher" (3 outcomes out of 6) → 1.9x. Choose "equal" (1 out of 6) → 5.7x.
- **State key**: `casinoState.dc`
- **Key functions**: `casinoDC_start()`, `casinoDC_getLegalChoices()`, `casinoDC_choose()`, `casinoDC_resolve()`

### Rock Paper Scissors
- **Config**: `RPS_PAYOUT = 1.90` (5% edge on fair 2.0x). Three formats: Best of 1, Best of 3, Best of 5.
- **Mechanic**: Player picks rock/paper/scissors, house picks randomly. Ties replay (no cost). Match continues until one side reaches the required wins for the format.
- **Phases**: `betting` → `format` (pick Bo1/3/5) → `choosing` → `revealing` (animation) → `roundResult` → loops or `result`.
- **State key**: `casinoState.rps`
- **Key functions**: `casinoRPS_start()`, `casinoRPS_choose()`, `casinoRPS_resolveRound()`, `casinoRPS_nextRound()`

### Baccarat
- **Config**: `BACCARAT_CONFIG` — 8-deck shoe. Player payout 0.91:1, Banker payout 0.86:1, Tie payout 9:1 (all ~5% edge).
- **Mechanic**: Standard baccarat tableau rules. Player bets on Player, Banker, or Tie outcome. Cards dealt automatically with third-card drawing rules. If result is a tie and player did NOT bet tie, bet is returned (push).
- **Third card rules**: Player draws on 0-5, stands on 6-7. Banker's draw depends on player's third card value (standard tableau). Natural 8/9 = no more cards.
- **Phases**: `betting` → `dealing` (animated) → `result`.
- **State key**: `casinoState.bac`
- **Key functions**: `casinoBAC_deal()`, `_bacResolve()`

### Slots
- **Config**: `SLOTS_CONFIG` — 3 reels, 64 stops per reel. 7 symbols with weighted distribution. Progressive jackpot (session-only).
- **Symbols**: Cherry (12), Lemon (11), Orange (10), Plum (10), Bell (9), Bar (8), Seven (4). Weights sum to 64 stops.
- **Paytable (3-of-a-kind multipliers)**: Cherry 12x, Lemon 18x, Orange 25x, Plum 36x, Bell 62x, Bar 125x, Seven = jackpot.
- **Consolation**: 2 or more cherries in any position = bet returned (1x).
- **Jackpot**: Progressive pool starts at 500g (`JACKPOT_SEED`). Each spin contributes 2% of bet. Three 7s wins the entire pool + bet back, then pool resets to seed. Pool persists across game resets but not page reloads.
- **Phases**: `betting` → `spinning` (1800ms total, 400ms stagger between reels stopping) → `result`.
- **State key**: `casinoState.sl`
- **Key functions**: `casinoSL_spin()`, `casinoSL_resolve()`

### Keno
- **Config**: `KENO_CONFIG` — 40-number board (8x5), pick 1-10 numbers, 10 drawn. Three risk levels (Low/Medium/High) change payout tables only, not draw mechanics.
- **Payout tables**: Precomputed via hypergeometric distribution for exactly 5% house edge per pick count. Low risk = flatter returns (max 500x). Medium = balanced (max 2500x). High = extreme top-end (max 10000x) but worse small hits.
- **Mechanic**: Player selects 1-10 numbers from 1-40, chooses risk level, places bet. System draws 10 numbers (animated one at a time, 40ms interval). Payout based on matches.
- **Phases**: `picking` → `drawing` (animated) → `result`. On "play again", picks are preserved.
- **State key**: `casinoState.kn`
- **Key functions**: `casinoKN_togglePick()`, `casinoKN_clearPicks()`, `casinoKN_start()`, `casinoKN_resolve()`

## House Edge

All 10 games enforce a 5% house edge (`CASINO_CONFIG.HOUSE_EDGE = 0.05`). Implementation varies by game:

| Game | How 5% Edge is Applied |
|------|----------------------|
| Blackjack | Winnings multiplied by `(1 - 0.05)` before adding bet return |
| Roulette | Natural edge from single zero (2.7%); payout multipliers are standard |
| Heads or Tails | Streak multiplier is 1.9x instead of fair 2.0x |
| Cases | Outcome weights/values calibrated so EV = 95% of case cost |
| Mines | Multiplier formula includes `* (1 - 0.05)` factor |
| Dice | Payouts precomputed as `(1/probability) * 0.95` |
| RPS | Payout is 1.90x instead of fair 2.0x |
| Baccarat | Payout rates reduced (Player 0.91:1, Banker 0.86:1, Tie 9:1) |
| Slots | Paytable calibrated for ~93% base return + ~2% jackpot contribution = ~95% |
| Keno | Payout tables computed via hypergeometric for exactly 95% expected return |

## Data Structures

### `CASINO_CONFIG`
```js
{ BET_MIN: 10, BET_MAX: 10000, BET_PRESETS: [10, 50, 100, 500, 1000, 5000, 10000], HOUSE_EDGE: 0.05 }
```

### `casinoState` (global)
Top-level fields: `activeGame`, `bet`, `phase` (`idle`|`betting`|`playing`|`result`), `result` (`{ won, payout, message }`), `resultTimer`.
Sub-state objects: `bj`, `rl`, `hot`, `cs`, `mn`, `dc`, `rps`, `bac`, `sl`, `kn` — each game has its own phase machine nested inside.

### `CASINO_GAMES`
Array of 10 game definitions: `{ id, label, stationEntity }`. The `stationEntity` field maps to the interactable entity type in the game world (e.g., `casino_blackjack`).

## UI Rendering & Interaction

### Panel Layout
- Panel size: 740x540 (`_CASINO_PW`, `_CASINO_PH`), centered on canvas.
- Style: "Stake-style" dark navy theme (`#0d1b2a` background, `#0a1520` title bar).
- Dimmed backdrop (`rgba(0,0,0,0.75)`) covers the game world.
- Close button (X) in top-right corner. Clicking outside the panel also closes it.

### Entry Points
- `drawCasinoPanel()` — Called from the draw loop when `UI.isOpen('casino')`. Draws shared chrome (backdrop, panel, title bar, close button), then dispatches to per-game `_draw*()` function.
- `handleCasinoClick(mx, my)` — Called from click handler when casino is open. Handles close, result overlay, loss auto-reset, then dispatches to per-game `_click*()` function.

### Bet Controls
- Shared bet input UI drawn by `_casinoDrawBetControls()` at the bottom of the panel.
- Features: numeric input field (click to type), +/- step buttons, half/2x/max quick buttons, preset amount buttons (10, 50, 100, 500, 1000, 5000, 10000).
- Bet is validated by `casinoPlaceBet()`: must be within `[BET_MIN, BET_MAX]` and `<= gold`.
- `_casinoBetInput` holds the current bet amount (persists across games within a session).
- Click handling: `_casinoHandleBetClick()`. Custom typing via `_casinoBetEditing`/`_casinoBetString`.

### Result Overlay
- Win: green overlay with "+Xg" message and "Play Again" button, drawn by `_casinoDrawResult()`.
- Loss: no overlay — the game state pauses for 1.5 seconds so the player can see the outcome (final cards, roulette number, etc.), then auto-resets to betting via `_lossAutoReset`. Clicking during the pause (after 300ms) skips to betting immediately.

### Animations
- Card dealing: `_addedAt` timestamp per card, slide-in with `_easeOutCubic()`. Dealer's hidden card uses `_revealAt` for flip animation.
- Roulette wheel: `_drawRouletteWheel()` draws a full European wheel with ball spinning animation.
- Coin flip: Timer-based flip animation in Heads or Tails.
- Dice: Rotation animation via `_casinoDrawDie()` with `rotation` parameter.
- RPS: Hand reveal animation with shake effect via `_drawRPSHand()`.
- Slots: Staggered reel stop (400ms between reels), spin duration 1800ms.
- Keno: Numbers drawn one at a time (40ms interval) with color-coded hit/miss.

### UI Helper Functions
- `_casinoDrawButton()` — Flat button with enabled/highlight states.
- `_casinoHitBtn()` — AABB click test.
- `_casinoDrawCard()` — Full playing card renderer (face-up with rank/suit, or face-down with diamond pattern).
- `_casinoDrawDie()` — 3D-styled die with dot patterns for values 1-6.

## Key Functions & Entry Points

### Shared Helpers (casinoSystem.js)
- `casinoPlaceBet(amount)` — Validates and deducts bet from `gold`. Returns `true`/`false`.
- `casinoWin(payout)` — Adds payout to `gold`, sets result state, transitions to result phase.
- `casinoLose(msg)` — Sets result to null, enables `_lossAutoReset` flag for timed auto-dismiss.
- `casinoReset()` — Full reset of all state (called when closing the casino panel entirely).
- `casinoResetGame()` — Resets only the current game's sub-state for "play again" (preserves `activeGame`).

### Per-Game Functions
Each game follows the pattern: `casino<ABBR>_start/deal/open()` to begin, internal state updates, `casino<ABBR>_resolve()` to determine outcome. See individual game sections above for specific function names.

## How Betting Works

1. Player interacts with a casino station entity (e.g., `casino_blackjack`).
2. `UI.open('casino')` is called, `casinoState.activeGame` is set to the game ID.
3. Bet controls appear at the bottom of the panel. Player adjusts bet via presets, +/-, typing, or quick buttons.
4. Player clicks the game-specific action button (e.g., "Deal" for BJ, "Spin" for roulette).
5. `casinoPlaceBet()` validates the amount and deducts from `gold`.
6. Game plays through its phases (dealing, spinning, revealing, etc.).
7. Resolution: `casinoWin()` or `casinoLose()` is called.
8. Win: result overlay with "Play Again" button. Loss: 1.5s pause then auto-reset.
9. Player can play again (same game) or close the panel to leave.

## Connections to Other Systems

- **Gold** — All bets deduct from the global `gold` variable. All payouts add to it. Gold is the only currency used.
- **Save/Load** — Gold is saved via `saveLoad.js`. Casino state itself is NOT saved — all games reset on page reload. The slots jackpot pool is session-persistent only (survives game resets but not reloads).
- **Entity/Interactable System** — Each game has a `stationEntity` type (e.g., `casino_blackjack`) defined in `CASINO_GAMES`. These entities are placed in the game world and trigger the casino UI when interacted with.
- **UI Panel System** — Casino opens via `UI.isOpen('casino')`. `drawCasinoPanel()` and `handleCasinoClick()` are called from the main draw/click loops.

## Gotchas & Rules

- `casinoState` has TWO phase levels: the top-level `casinoState.phase` (`idle`/`betting`/`playing`/`result`) AND each sub-game has its own `.phase` field (e.g., `casinoState.bj.phase`). Both must be managed correctly.
- The `_lossAutoReset` flag on `casinoState` controls the 1.5s loss pause. It is set by `casinoLose()` and cleared by `casinoResetGame()` or by clicking during the pause.
- `casinoReset()` resets EVERYTHING (all 10 sub-states). `casinoResetGame()` only resets the active game. Use the right one.
- Blackjack's `_animateCallback` pattern: actions like hit/double/dealer set `bj.phase = 'animating'` and store a callback. The UI checks if all card animations have completed, then calls the callback. This prevents input during animations.
- Roulette allows multiple bets before spinning. Each bet independently deducts gold. `casinoRL_clearBets()` refunds all placed bets.
- Cases bypass the normal `casinoPlaceBet()` flow — the case cost is deducted directly in `casinoCS_open()` and `casinoState.bet` is set to the case cost.
- Keno preserves player picks on "play again" (`casinoResetGame()` does not clear `kn.picks`).
- Slots jackpot pool is NOT reset by `casinoReset()` — it survives full panel close/reopen but does not persist across page reloads.
- Baccarat pushes on tie if player did not bet tie (bet returned, no win/loss).
- `_casinoBetInput` is a global `let` variable (script-level lexical scope, not on `window`).
- All card-based games (Blackjack, Baccarat) use Fisher-Yates shuffled multi-deck shoes. Auto-reshuffle triggers when fewer than 20 cards remain.
- RPS ties replay without consuming an additional bet or counting as a round toward the win total.
- The Blackjack insurance check happens BEFORE checking for player blackjack (if dealer shows Ace and player also has BJ, insurance phase is skipped and both-BJ push is resolved directly).
