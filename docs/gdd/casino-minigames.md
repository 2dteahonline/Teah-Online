# Casino & Gathering Minigames

## Source of truth

- `js/authority/casinoSystem.js` — authority for all 10 casino games (state, RNG, payouts)
- `js/shared/casinoData.js` — casino config, bet limits, paytables, house edge
- `js/authority/fishingSystem.js` — fishing state machine, reel mechanics, vendor
- `js/shared/fishingData.js` — rods, fish species, fishing timing config (cross-cluster reference)
- `js/authority/farmingSystem.js` — farm tiles, planting, growth, harvest
- `js/shared/farmingData.js` — crops, hoes, land expansions (cross-cluster reference)
- `js/authority/miningSystem.js` — ore spawning, mining ticks, ore pickups
- `js/shared/oreData.js` — ore types and mine room mapping (cross-cluster reference)

## Purpose

The casino cluster provides 10 gold-wagering minigames with a documented 5% house edge. Fishing, farming, and mining are the three gathering skills — each has an authority state machine, tier-gated tools, XP progression, and a vendor tab for buying consumables/tools or selling harvested items.

---

# CASINO

## Values — Global Config

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| BET_MIN | 10 | gold | js/shared/casinoData.js:7 |
| BET_MAX | 10000 | gold | js/shared/casinoData.js:8 |
| BET_PRESETS | [10, 50, 100, 500, 1000, 5000, 10000] | gold | js/shared/casinoData.js:9 |
| HOUSE_EDGE | 0.05 (5%) | fraction | js/shared/casinoData.js:10 |

The 5% house edge is applied to all game payouts via `CASINO_CONFIG.HOUSE_EDGE` (casinoData.js:10). Verified applied in: blackjack win (casinoSystem.js:407, 580), dice payout table (casinoData.js:137,140,142), heads-or-tails streak multiplier (casinoData.js:123), RPS payout (casinoData.js:148), baccarat payouts (casinoData.js:157-159), mines multiplier (casinoData.js:117, casinoSystem.js:832), cases EV (casinoData.js:78,90,102), keno payout tables calibrated to 95% return (casinoData.js:215-216).

## Casino Games List

| ID | Label | Station Entity | Citation |
|----|-------|----------------|----------|
| blackjack | Blackjack | casino_blackjack | js/shared/casinoData.js:259 |
| roulette | Roulette | casino_roulette | js/shared/casinoData.js:260 |
| headsOrTails | Heads or Tails | casino_coinflip | js/shared/casinoData.js:261 |
| cases | Cases | casino_cases | js/shared/casinoData.js:262 |
| mines | Mines | casino_mines | js/shared/casinoData.js:263 |
| dice | Dice | casino_dice | js/shared/casinoData.js:264 |
| rps | Rock Paper Scissors | casino_rps | js/shared/casinoData.js:265 |
| baccarat | Baccarat | casino_baccarat | js/shared/casinoData.js:266 |
| slots | Slots | casino_slots | js/shared/casinoData.js:267 |
| keno | Keno | casino_keno | js/shared/casinoData.js:268 |

## 1. Blackjack

### Values

| Name | Value | Citation |
|------|-------|----------|
| DECKS | 6 | js/shared/casinoData.js:14 |
| BJ_PAYOUT | 1.5 (3:2) | js/shared/casinoData.js:15 |
| DEALER_STAND | 17 | js/shared/casinoData.js:16 |
| Insurance cost | bet / 2 | js/authority/casinoSystem.js:431 |
| Insurance payout | 2:1 (insurance × 3 returned) | js/authority/casinoSystem.js:400, 418 |
| Shoe reshuffle threshold | < 20 cards | js/authority/casinoSystem.js:354, 362 |
| Dealer card reveal delay | 600 ms | js/authority/casinoSystem.js:544 |
| Dealer card stagger | 500 ms | js/authority/casinoSystem.js:550 |
| Initial deal stagger | 400 ms per card | js/authority/casinoSystem.js:368-370 |

### Behavior

1. Place bet via `casinoPlaceBet` (casinoSystem.js:121); validated against BET_MIN/MAX and gold.
2. Shoe built from 6 decks (casinoSystem.js:338) and Fisher-Yates shuffled (casinoSystem.js:346-349).
3. Deal 2 cards each; if dealer shows Ace and player isn't on BJ, offer insurance (casinoSystem.js:385).
4. Natural blackjack pays `bet * 1.5 * (1 - 0.05)` (casinoSystem.js:407).
5. Player can hit, stand, double (bet doubled, one card), or split on equal-rank pairs (casinoSystem.js:445-536).
6. Dealer hits until hand value ≥ 17 (casinoSystem.js:546).
7. Resolution: win pays `bet + floor(bet * (1 - 0.05))`, push returns bet, bust loses (casinoSystem.js:578-585).
8. Aces count as 11 reduced to 1 if over 21 (casinoSystem.js:318).

## 2. Roulette

European single-zero wheel (casinoData.js:20).

### Values — Outside Bets (payout : 1)

| Bet | Payout | Citation |
|-----|--------|----------|
| Red / Black | 1:1 | js/shared/casinoData.js:49-50 |
| Odd / Even | 1:1 | js/shared/casinoData.js:51-52 |
| Low (1-18) / High (19-36) | 1:1 | js/shared/casinoData.js:53-54 |
| Dozens (1st/2nd/3rd 12) | 2:1 | js/shared/casinoData.js:56-58 |
| Columns (col1/2/3) | 2:1 | js/shared/casinoData.js:60-62 |

### Values — Inside Bets

| Bet | Payout | Citation |
|-----|--------|----------|
| straight (single number) | 35:1 | js/shared/casinoData.js:67 |
| split (2 adjacent) | 17:1 | js/shared/casinoData.js:68 |
| street (row of 3) | 11:1 | js/shared/casinoData.js:69 |
| corner (block of 4) | 8:1 | js/shared/casinoData.js:70 |

| Name | Value | Citation |
|------|-------|----------|
| Wheel numbers | 0-36 (37 total) | js/authority/casinoSystem.js:635 |
| Red numbers | {1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36} | js/shared/casinoData.js:43 |
| Wheel order | [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26] | js/shared/casinoData.js:121 |

### Behavior

1. Multiple bets can be placed; each stored as `{ type, value, amount }` (casinoSystem.js:621).
2. Spin picks `Math.floor(Math.random() * 37)` (casinoSystem.js:635).
3. Each bet checked; winning bet returns `amount + amount * payoutMult` (casinoSystem.js:669).
4. Note: payouts here are stated as "x : 1" winnings only; stake is returned separately. House edge comes from the 0 slot reducing the 1:1 fair odds (18/37 ≠ 0.5).

## 3. Heads or Tails (Streak)

### Values

| Name | Value | Citation |
|------|-------|----------|
| STREAK_MULTIPLIER | 1.9 per correct flip | js/shared/casinoData.js:123 |
| Win probability | 0.5 | js/authority/casinoSystem.js:701 |
| Multiplier formula | `pow(1.9, streak)` | js/authority/casinoSystem.js:711 |

### Behavior

1. Start round; bet locked, streak = 0 (casinoSystem.js:685).
2. Player picks heads/tails; coin flipped via `Math.random() < 0.5` (casinoSystem.js:701).
3. On correct guess: streak++, multiplier = `1.9^streak`; player may keep going or cash out (casinoSystem.js:710).
4. Cash out pays `floor(bet * currentMultiplier)` (casinoSystem.js:722).
5. Wrong guess: entire bet lost (casinoSystem.js:715). The 5% edge is baked into 1.9 (fair = 2.0).

## 4. Cases

### Values — Cheap Case (cost 100g, EV 95g)

| Weight | Gold | Label | Citation |
|--------|------|-------|----------|
| 50 | 34 | 34g | js/shared/casinoData.js:80 |
| 30 | 100 | 100g | js/shared/casinoData.js:81 |
| 15 | 200 | 200g | js/shared/casinoData.js:82 |
| 5 | 360 | 360g | js/shared/casinoData.js:83 |

### Values — Medium Case (cost 500g, EV 475.5g)

| Weight | Gold | Label | Citation |
|--------|------|-------|----------|
| 45 | 150 | 150g | js/shared/casinoData.js:92 |
| 30 | 400 | 400g | js/shared/casinoData.js:93 |
| 18 | 900 | 900g | js/shared/casinoData.js:94 |
| 7 | 1800 | 1800g | js/shared/casinoData.js:95 |

### Values — Expensive Case (cost 2000g, EV 1900g)

| Weight | Gold | Label | Citation |
|--------|------|-------|----------|
| 40 | 500 | 500g | js/shared/casinoData.js:104 |
| 30 | 1500 | 1500g | js/shared/casinoData.js:105 |
| 20 | 3100 | 3100g | js/shared/casinoData.js:106 |
| 10 | 6300 | 6300g | js/shared/casinoData.js:107 |

| Name | Value | Citation |
|------|-------|----------|
| Cheap cost | 100 | js/shared/casinoData.js:75 |
| Medium cost | 500 | js/shared/casinoData.js:87 |
| Expensive cost | 2000 | js/shared/casinoData.js:99 |

Behavior: weighted random selection (casinoSystem.js:741-747); reward added to gold directly on reveal (casinoSystem.js:758). Result flagged "won" if reward ≥ cost (casinoSystem.js:761).

## 5. Mines

### Values

| Name | Value | Citation |
|------|-------|----------|
| GRID_SIZE | 5 (5×5 = 25 cells) | js/shared/casinoData.js:113 |
| MIN_MINES | 1 | js/shared/casinoData.js:114 |
| MAX_MINES | 24 | js/shared/casinoData.js:115 |
| DEFAULT_MINES | 5 | js/shared/casinoData.js:116 |
| EDGE | 0.05 (5%) | js/shared/casinoData.js:117 |

### Behavior

1. Board = 5×5; user-selected mine count 1-24 placed randomly (casinoSystem.js:793-800).
2. On safe reveal, multiplier updates via hypergeometric product:
   `mult = ∏ (totalCells - i) / (safeCells - i)` for i in 0..safeRevealed−1, then `floor(mult * (1 - 0.05) * 100) / 100` (casinoSystem.js:829-832).
3. Mine hit → lose bet (casinoSystem.js:820).
4. Cash out → `floor(bet * currentMultiplier)` (casinoSystem.js:838).

## 6. Dice (Higher/Lower/Equal)

### Values

Payout table built dynamically at load (casinoData.js:128-144):
`payout = floor((6 / outcomeCount) * (1 - 0.05) * 100) / 100`

Outcome counts per die1:
- higher: `6 - d1` winning outcomes (casinoData.js:132)
- lower: `d1 - 1` winning outcomes (casinoData.js:133)
- equal: 1 winning outcome (casinoData.js:134)
- equal payout always `6 * 0.95 = 5.7x` (casinoData.js:142)

### Behavior

1. Roll die1; present legal choices (hide 'lower' if d1=1, 'higher' if d1=6) (casinoSystem.js:859-866).
2. Player picks; roll die2 (casinoSystem.js:872).
3. If match: `floor(bet * DICE_PAYOUTS[d1][choice])` (casinoSystem.js:890-891).

## 7. Rock Paper Scissors

### Values

| Name | Value | Citation |
|------|-------|----------|
| RPS_CHOICES | ['rock','paper','scissors'] | js/shared/casinoData.js:146 |
| RPS_BEATS | rock→scissors, paper→rock, scissors→paper | js/shared/casinoData.js:147 |
| RPS_PAYOUT | `floor(2 * 0.95 * 100)/100` = 1.90x | js/shared/casinoData.js:148 |
| Formats | bo1 (1 win), bo3 (2 wins), bo5 (3 wins) | js/shared/casinoData.js:149-153 |

### Behavior

1. House picks uniformly at random (casinoSystem.js:921).
2. Tie = round repeats (no score change) (casinoSystem.js:931).
3. First to `winsNeeded` wins the match; payout `floor(bet * 1.90)` (casinoSystem.js:947).

## 8. Baccarat

### Values

| Name | Value | Citation |
|------|-------|----------|
| DECKS | 8 | js/shared/casinoData.js:156 |
| PLAYER_PAYOUT | 0.91 (91% of bet on win) | js/shared/casinoData.js:157 |
| BANKER_PAYOUT | 0.86 | js/shared/casinoData.js:158 |
| TIE_PAYOUT | 9 | js/shared/casinoData.js:159 |
| Reshuffle threshold | < 20 cards | js/authority/casinoSystem.js:988, 1009 |

Card values: 10/J/Q/K = 0, A = 1, others face value; hand value = `sum % 10` (casinoSystem.js:994-1004).

### Behavior

1. Deal 2 cards each, player first, staggered 400ms (casinoSystem.js:1013-1018).
2. Natural (8 or 9) → no draws (casinoSystem.js:1030).
3. Player tableau rule: draw if player total ≤ 5 (casinoSystem.js:1037).
4. Banker tableau rule (casinoSystem.js:1044-1067):
   - If player stood: banker draws on 0-5.
   - If player drew 3rd card (value p3):
     - Banker ≤ 2 → draw
     - Banker 3 → draw unless p3 = 8
     - Banker 4 → draw if p3 in [2..7]
     - Banker 5 → draw if p3 in [4..7]
     - Banker 6 → draw if p3 in [6,7]
     - Banker 7 → stand
5. Payout multiplier = `1 + PAYOUT` (casinoSystem.js:1092-1094). Tie without tie bet returns bet (push) (casinoSystem.js:1098).

## 9. Slots

### Values

| Name | Value | Citation |
|------|-------|----------|
| REELS | 3 | js/shared/casinoData.js:174 |
| STOPS_PER_REEL | 64 | js/shared/casinoData.js:175 |
| JACKPOT_SEED | 500 | js/shared/casinoData.js:198 |
| JACKPOT_CONTRIBUTION | 0.02 (2% of bet) | js/shared/casinoData.js:199 |
| SPIN_DURATION | 1800 ms | js/shared/casinoData.js:200 |
| REEL_STAGGER | 400 ms | js/shared/casinoData.js:201 |
| TWO_CHERRY_PAYOUT | 1 (bet returned) | js/shared/casinoData.js:197 |

### Reel Strip Weights (per reel, 64 stops)

| Symbol | Count | Citation |
|--------|-------|----------|
| cherry | 12 | js/shared/casinoData.js:178 |
| lemon | 11 | js/shared/casinoData.js:179 |
| orange | 10 | js/shared/casinoData.js:180 |
| plum | 10 | js/shared/casinoData.js:181 |
| bell | 9 | js/shared/casinoData.js:182 |
| bar | 8 | js/shared/casinoData.js:183 |
| seven | 4 | js/shared/casinoData.js:184 |

### Paytable (3-of-a-kind multiplier on bet)

| Symbol | Multiplier | Citation |
|--------|------------|----------|
| cherry | 12x | js/shared/casinoData.js:189 |
| lemon | 18x | js/shared/casinoData.js:190 |
| orange | 25x | js/shared/casinoData.js:191 |
| plum | 36x | js/shared/casinoData.js:192 |
| bell | 62x | js/shared/casinoData.js:193 |
| bar | 125x | js/shared/casinoData.js:194 |
| seven | jackpot (progressive) | js/shared/casinoData.js:195 |

### Behavior

1. 2% of each bet added to jackpot pool (casinoSystem.js:1138).
2. Each reel draws from shuffled weighted strip (casinoSystem.js:1115-1132).
3. 3-seven → jackpot pays `jackpotPool + bet`, pool reset to 500 (casinoSystem.js:1157-1159).
4. Other 3-of-a-kind → `floor(bet * mult) + bet` (casinoSystem.js:1164).
5. ≥2 cherries → bet returned as consolation (casinoSystem.js:1173-1174).

## 10. Keno

### Values

| Name | Value | Citation |
|------|-------|----------|
| BOARD_SIZE | 40 | js/shared/casinoData.js:205 |
| BOARD_COLS × ROWS | 8 × 5 | js/shared/casinoData.js:206-207 |
| MAX_PICKS | 10 | js/shared/casinoData.js:208 |
| DRAW_COUNT | 10 | js/shared/casinoData.js:209 |
| DRAW_INTERVAL | 40 ms | js/shared/casinoData.js:210 |
| RISK_LEVELS | low, medium, high | js/shared/casinoData.js:211 |
| Max payout (low) | 500x | js/shared/casinoData.js:217 |
| Max payout (medium) | 2500x | js/shared/casinoData.js:217 |
| Max payout (high) | 10000x | js/shared/casinoData.js:217 |

All risk tables are calibrated so each pick count returns 95% expected value (documented at casinoData.js:215-216). Full payout matrices at js/shared/casinoData.js:218-255 — PAYOUTS[risk][picks][matches] = multiplier.

### Behavior

1. Player toggles up to 10 numbers from 1-40 (casinoSystem.js:1186-1197).
2. On start: draw 10 unique numbers via partial Fisher-Yates (casinoSystem.js:1209-1216).
3. Match count = overlap between picks and drawn (casinoSystem.js:1229).
4. Payout = `floor(bet * PAYOUTS[risk][picks][matches])`; 0 if no entry (casinoSystem.js:1240-1245).

## Casino Dependencies

- Reads: `gold` (gameState), `casinoPlaceBet` validates against `CASINO_CONFIG.BET_MIN/MAX` (casinoSystem.js:123).
- Writes: `gold` (direct += / -=), `casinoState.*` substates, `casinoState.sl.jackpotPool` (session-persistent).
- No event emissions documented.

## Casino Edge Cases

- `jackpotPool` is session-only — not persisted across save/load (casinoSystem.js:210 comment).
- `casinoReset` preserves jackpot pool (casinoSystem.js:210).
- Blackjack shoe auto-reshuffles at <20 cards mid-hand (casinoSystem.js:354).
- Mines: user selects mine count between start presses; persists via `casinoState.mn.mineCount`.
- Insurance: charged separately from main bet (bet/2), lost on non-dealer-BJ outcomes.
- Keno resetGame preserves picks so the player doesn't re-select (casinoSystem.js:289).
- RPS format selection preserved across "play again" (casinoSystem.js:269).
- Baccarat on tie without tie bet: pushes (bet returned) rather than losing (casinoSystem.js:1098-1102).

---

# FISHING

## Values — Config

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| castFrames | 60 | frames (1.0s) | js/shared/fishingData.js:36 |
| waitFramesMin | 180 | frames (3.0s) | js/shared/fishingData.js:37 |
| waitFramesMax | 480 | frames (8.0s) | js/shared/fishingData.js:38 |
| biteWindowFrames | 120 | frames (2.0s) | js/shared/fishingData.js:39 |
| reelFramesMin | 180 | frames (3.0s) | js/shared/fishingData.js:40 |
| reelFramesMax | 360 | frames (6.0s) | js/shared/fishingData.js:41 |
| resultFrames | 90 | frames (1.5s) | js/shared/fishingData.js:42 |
| cooldownFrames | 60 | frames (1.0s) | js/shared/fishingData.js:43 |
| tensionDecayRate | 0.004 | /frame | js/shared/fishingData.js:45 |
| tensionFillRate | 0.006 | /frame | js/shared/fishingData.js:47 |
| tensionCatchThreshold | 0.45 | progress | js/shared/fishingData.js:49 |
| sweetSpotMin | 0.2 | tension | js/shared/fishingData.js:51 |
| sweetSpotMax | 0.85 | tension | js/shared/fishingData.js:52 |
| reelProgressBase | 0.005 | /frame | js/shared/fishingData.js:54 |
| reelProgressEasyBonus | 0.0025 | /frame | js/shared/fishingData.js:56 |
| fishFightBack | 0.0006 | /frame | js/shared/fishingData.js:58 |
| maxLevelBonus | 0.25 | catch % | js/shared/fishingData.js:60 |
| levelBonusPerLevel | 0.005 | /level | js/shared/fishingData.js:61 |
| maxLineDistance | 160 | px | js/shared/fishingData.js:63 |
| overweightPenalty | 0.25 | per weight over | js/shared/fishingData.js:65 |
| Starter bait count | 10 | items | js/authority/fishingSystem.js:35 |
| Cast distance | `80 + rod.tier * 10` | px | js/authority/fishingSystem.js:91 |
| Fish approach trigger | < 40% of wait remaining | frames | js/authority/fishingSystem.js:143 |
| Fish spawn distance | 100-140 | px from bobber | js/authority/fishingSystem.js:148 |
| Fish lerp speed | 0.02 | /frame | js/authority/fishingSystem.js:154 |
| Initial reel tension | 0.5 | tension | js/authority/fishingSystem.js:176 |
| Catch chance clamp | [0.05, 0.95] | fraction | js/shared/fishingData.js:104 |

## Values — Rod Tiers

| Name | Tier | Lvl | Cost | Durability | Strength | catchBonus | Damage | Crit | Citation |
|------|------|-----|------|-----------|----------|-----------|--------|------|----------|
| Bronze Rod | 0 | 1 | 20 | 25 | 1 | 0.00 | 8 | 0 | js/shared/fishingData.js:10 |
| Iron Rod | 1 | 5 | 80 | 40 | 2 | 0.10 | 12 | 0.05 | js/shared/fishingData.js:12 |
| Gold Rod | 2 | 12 | 200 | 60 | 3 | 0.20 | 16 | 0.08 | js/shared/fishingData.js:14 |
| Mythic Rod | 3 | 25 | 500 | 100 | 5 | 0.35 | 22 | 0.12 | js/shared/fishingData.js:16 |

## Values — Fish Species

| Fish | Rarity | Sell | Diff | minRod | XP | Weight | Citation |
|------|--------|------|------|--------|----|--------|----------|
| Sardine | 40 | 3g | 0.20 | 0 | 5 | 1 | js/shared/fishingData.js:26 |
| Bass | 25 | 8g | 0.35 | 0 | 10 | 2 | js/shared/fishingData.js:27 |
| Salmon | 18 | 15g | 0.50 | 1 | 18 | 2 | js/shared/fishingData.js:28 |
| Tuna | 10 | 25g | 0.65 | 1 | 30 | 3 | js/shared/fishingData.js:29 |
| Swordfish | 5 | 50g | 0.80 | 2 | 50 | 4 | js/shared/fishingData.js:30 |
| Golden Leviathan | 2 | 120g | 0.95 | 3 | 100 | 5 | js/shared/fishingData.js:31 |

## Values — Fish Vendor

| Item | Cost | Notes | Citation |
|------|------|-------|----------|
| Worm Bait ×10 | 20g | + 10 bait | js/authority/fishingSystem.js:627, 630 |
| Rod prices | See rod tiers (uses PROG_ITEMS.buyPrice if defined, else rod.cost) | — | js/authority/fishingSystem.js:641 |

## Behavior

1. Swing fishing rod near a `fishing_spot` → `startFishingCast` (casinoSystem.js calls absent — triggered from meleeSwing, fishingSystem.js:55).
2. Guards: rod equipped, durability > 0, bait count > 0 (fishingSystem.js:61-69).
3. Cast phase: timer counts down castFrames=60; bobber lands at `player + dir * (80 + tier*10)` (fishingSystem.js:91-94).
4. Wait phase: random timer in [180, 480); targetFish pre-picked via `pickRandomFish(rod.tier)` (fishingSystem.js:130-133).
5. Fish approach: when <40% wait remaining, fish sprite spawns 100-140 px away and lerps 0.02/frame toward bobber (fishingSystem.js:143-156).
6. Bite phase: 120-frame window to press reel input (`InputIntent.reelPressed`) (fishingSystem.js:168-186).
7. Reel phase: timer = `reelFramesMin + (reelFramesMax - reelFramesMin) * fish.difficulty` (fishingSystem.js:175).
8. Tension dynamics: +0.006/frame when holding reel, −0.004/frame otherwise; clamped 0..1 (fishingSystem.js:192-197).
9. In sweet spot [0.2, 0.85]: progress += `0.005 + (1 - difficulty) * 0.0025`; always: progress −= `difficulty * 0.0006` (fishingSystem.js:200-205).
10. Tension ≥ 1.0 → line snaps, fail (fishingSystem.js:208).
11. Progress ≥ 0.45 → roll `calculateCatchChance`:
    `baseCatch = 1 - difficulty; + rod.catchBonus; + min(0.25, level*0.005); - max(0, weight - strength)*0.25; clamp[0.05, 0.95]` (fishingData.js:97-104).
12. On catch: inventory fish item with sellPrice, award `fish.xp` to Fishing skill, update stats (fishingSystem.js:268-289).
13. Rod durability −1 per cast (fishingSystem.js:85).
14. Leash: if player distance from bobber > 160 px during active phases → line snaps (fishingSystem.js:117).

## Dependencies

- Reads: `playerEquip.melee`, `gold`, `player.x/y`, `shootFaceDir`, `skillData['Fishing']`, `InputIntent.reelPressed/reelHeld`, `inventory`, `PROG_ITEMS`, `ROD_TIERS`, `FISH_SPECIES`, `FISHING_CONFIG`.
- Writes: `fishingState`, `gold`, `inventory` (addToInventory), `hitEffects`, rod `currentDurability`, `skillData['Fishing'].xp` via `addSkillXP`.

## Edge cases

- Rod broken (`currentDurability <= 0`) blocks cast; after result, a "Your rod broke!" popup appears (fishingSystem.js:250).
- If rod not equipped (playerEquip.melee.special !== 'fishing'), `startFishingCast` no-ops (fishingSystem.js:58).
- In opMode (`window._opMode`), level gates on rods are bypassed (fishingSystem.js:642).
- Fish item carries `isFish: true`, `sellPrice`, `color` for vendor sell logic (fishingSystem.js:272-274).

---

# FARMING

## Values — Config

| Name | Value | Citation |
|------|-------|----------|
| PLOT_SIZE | 1 tile (48×48 px) | js/shared/farmingData.js:42 |
| tillCooldown | 15 frames (0.25s) | js/shared/farmingData.js:45 |
| plantCooldown | 10 frames (0.17s) | js/shared/farmingData.js:46 |
| harvestCooldown | 15 frames (0.25s) | js/shared/farmingData.js:47 |
| growthCheckInterval | 1 frame | js/shared/farmingData.js:49 |
| tileInteractRange | 60 px | js/shared/farmingData.js:51 |

## Values — Hoe Tiers

| Name | Tier | Lvl | Cost | Reach | Cooldown | swingTiles | Citation |
|------|------|-----|------|-------|----------|-----------|----------|
| Bronze Hoe | 0 | 1 | 20 | 1 | 36 | 2 | js/shared/farmingData.js:11 |
| Iron Hoe | 1 | 5 | 80 | 1 | 30 | 3 | js/shared/farmingData.js:12 |
| Gold Hoe | 2 | 12 | 200 | 2 | 24 | 5 | js/shared/farmingData.js:13 |
| Mythic Hoe | 3 | 25 | 500 | 2 | 20 | 8 | js/shared/farmingData.js:14 |

## Values — Bucket

| Name | Value | Citation |
|------|-------|----------|
| metal_bucket cost | 50 | js/shared/farmingData.js:19 |
| metal_bucket levelReq | 1 | js/shared/farmingData.js:19 |
| Well fill range | < TILE * 3 (144 px) | js/authority/farmingSystem.js:140 |

## Values — Crop Types

| Crop | Grow (frames) | Seed | Sell | XP | Lvl | GardenReq | Citation |
|------|---------------|------|------|----|----|-----------|----------|
| Carrot | 900 (15s) | 5 | 12 | 8 | 1 | 0 | js/shared/farmingData.js:30 |
| Potato | 1200 (20s) | 8 | 18 | 12 | 3 | 0 | js/shared/farmingData.js:31 |
| Tomato | 1500 (25s) | 12 | 25 | 18 | 6 | 0 | js/shared/farmingData.js:32 |
| Corn | 1800 (30s) | 15 | 35 | 25 | 10 | 1 | js/shared/farmingData.js:33 |
| Pumpkin | 2400 (40s) | 20 | 50 | 35 | 15 | 1 | js/shared/farmingData.js:34 |
| Watermelon | 3000 (50s) | 30 | 70 | 45 | 20 | 1 | js/shared/farmingData.js:35 |
| Sunflower | 3600 (60s) | 40 | 95 | 60 | 28 | 2 | js/shared/farmingData.js:36 |
| Starfruit | 4800 (80s) | 60 | 140 | 80 | 35 | 2 | js/shared/farmingData.js:37 |
| Dragonfruit | 6000 (100s) | 100 | 220 | 120 | 45 | 2 | js/shared/farmingData.js:38 |

## Values — Land Expansions

| Lvl | Name | Grid | Cost | Lvl Req | Citation |
|-----|------|------|------|---------|----------|
| 0 | Starter Garden | 3×3 | 0 | 1 | js/shared/farmingData.js:59 |
| 1 | Small Garden | 5×4 | 250 | 5 | js/shared/farmingData.js:60 |
| 2 | Medium Garden | 8×5 | 800 | 12 | js/shared/farmingData.js:61 |
| 3 | Large Garden | 11×7 | 2000 | 20 | js/shared/farmingData.js:62 |
| 4 | Grand Garden | 16×9 | 4000 | 30 | js/shared/farmingData.js:63 |
| 5 | Vast Garden | 22×11 | 7000 | 45 | js/shared/farmingData.js:64 |
| 6 | Huge Garden | 28×14 | 12000 | 65 | js/shared/farmingData.js:65 |
| 7 | Maximum Garden | 36×16 | 20000 | 85 | js/shared/farmingData.js:66 |

## Behavior

1. Enter house_01 → `initFarmState`: find `farm_zone` entity, build grid centered based on `LAND_EXPANSIONS[landLevel]` (farmingSystem.js:41-73).
2. Tile states: EMPTY → TILLED → PLANTED → GROWING → HARVESTABLE (farmingSystem.js:31-37).
3. Update tick: action cooldown decrements; growing tiles' `growthTimer++` — when ≥ `crop.growthFrames`, state becomes HARVESTABLE (farmingSystem.js:94-102).
4. Action handler:
   - Near well with empty bucket → fill bucket (farmingSystem.js:134-145).
   - EMPTY tile + hoe equipped → till (swings hoe, affects `hoe.swingTiles` nearby tiles), cooldown 15 (farmingSystem.js:157-170).
   - TILLED tile → plant selected seed; consumes seed; level + gardenReq gated (farmingSystem.js:174+). (Not fully displayed in read window — planting consumes one seed from inventory.)
5. No re-watering required — one water starts growth (header comment fishingSystem — actually farmingSystem.js:3).
6. Hoes are tools, not melee weapons (farmingSystem.js:3 header comment; farmingData.js:7).

## Dependencies

- Reads: `playerEquip.melee`, `Scene.inFarm`, `levelEntities` (farm_zone, farm_well), `CROP_TYPES`, `HOE_TIERS`, `FARMING_CONFIG`, `LAND_EXPANSIONS`, `skillData['Farming']`, `inventory`, `player.x/y`, `TILE`.
- Writes: `farmingState`, `inventory` (seed consumption, harvest add), `gold` (vendor), `hitEffects`, `skillData['Farming']`.

## Edge cases

- `farmingState.landLevel`, `equippedHoe`, `bucketOwned` are persisted via save/load (farmingSystem.js:16-21 state comments).
- `farmingState.bucketFilled` is runtime-only.
- In opMode, level and gardenReq gates bypassed (farmingSystem.js:183, 187).
- Crop count per plot: 1×1 tile each (PLOT_SIZE=1).

---

# MINING

## Values — Config

| Name | Value | Units | Citation |
|------|-------|-------|----------|
| range | 90 | px | js/authority/miningSystem.js:17 |
| baseTick | 44 | frames | js/authority/miningSystem.js:18 |
| nodeSize | 72 | px | js/authority/miningSystem.js:19 |
| collisionRadius | GAME_CONFIG.ORE_COLLISION_RADIUS | px | js/authority/miningSystem.js:20 |
| hitFlashFrames | 6 | frames | js/authority/miningSystem.js:21 |
| respawnTime | 600 | frames (~10s) | js/authority/miningSystem.js:22 |
| regrowFrames | 90 | frames (1.5s) | js/authority/miningSystem.js:23 |
| baseDamage | 1 | hp/tick | js/authority/miningSystem.js:24 |
| dirConeWidth | 0.85 | — | js/authority/miningSystem.js:25 |
| Pickup life | 1800 frames (~30s) | — | js/authority/miningSystem.js:93 |
| Pickup range | 40 px | — | js/authority/miningSystem.js:107 |
| Ore damage formula | `max(1, floor(equip.damage / 10))` | — | js/authority/miningSystem.js:67 |
| Tick rate formula | `max(10, round(baseTick / miningSpeed))` | — | js/authority/miningSystem.js:58 |
| Crit multiplier | 2× | — | js/authority/miningSystem.js:370 |

## Values — Spawn Config

| Name | Value | Citation |
|------|-------|----------|
| groupCount | 18 | js/authority/miningSystem.js:30 |
| oresPerGroupMin | 5 | js/authority/miningSystem.js:31 |
| oresPerGroupMax | 6 | js/authority/miningSystem.js:32 |
| innerSpacing | 1.2 tiles | js/authority/miningSystem.js:33 |
| outerSpacing | 12 tiles | js/authority/miningSystem.js:34 |
| wallMargin | 4 tiles | js/authority/miningSystem.js:35 |
| spawnClearance | 4 tiles | js/authority/miningSystem.js:36 |
| exitClearance | 5 tiles | js/authority/miningSystem.js:37 |
| placementRadius | 2 tiles | js/authority/miningSystem.js:38 |
| maxGroupAttempts | 80 | js/authority/miningSystem.js:39 |
| maxOreAttempts | 20 | js/authority/miningSystem.js:40 |

## Values — Ore Types

| Ore | Tier | HP | Value | Rarity | MineLvl | XP | Citation |
|-----|------|----|-------|--------|---------|----|----------|
| Stone | 1 | 5 | 1 | 0.40 | 1 | 3 | js/shared/oreData.js:7 |
| Coal | 1 | 7 | 1 | 0.25 | 1 | 4 | js/shared/oreData.js:8 |
| Copper Ore | 1 | 9 | 2 | 0.20 | 1 | 6 | js/shared/oreData.js:9 |
| Iron Ore | 2 | 12 | 3 | 0.15 | 3 | 9 | js/shared/oreData.js:10 |
| Steel Ore | 2 | 16 | 4 | 0.15 | 8 | 12 | js/shared/oreData.js:13 |
| Gold Ore | 3 | 20 | 5 | 0.10 | 12 | 18 | js/shared/oreData.js:14 |
| Amethyst | 3 | 24 | 7 | 0.08 | 16 | 22 | js/shared/oreData.js:15 |
| Ruby | 4 | 30 | 10 | 0.06 | 20 | 30 | js/shared/oreData.js:18 |
| Diamond | 4 | 35 | 14 | 0.05 | 25 | 40 | js/shared/oreData.js:19 |
| Emerald | 4 | 35 | 16 | 0.04 | 30 | 50 | js/shared/oreData.js:20 |
| Titanium | 5 | 42 | 20 | 0.035 | 35 | 65 | js/shared/oreData.js:23 |
| Mythril | 5 | 48 | 24 | 0.03 | 40 | 80 | js/shared/oreData.js:24 |
| Celestium | 5 | 55 | 28 | 0.025 | 45 | 100 | js/shared/oreData.js:25 |
| Obsidian | 5 | 60 | 32 | 0.02 | 50 | 125 | js/shared/oreData.js:26 |
| Dusk Ore | 5 | 70 | 40 | 0.015 | 55 | 150 | js/shared/oreData.js:27 |

## Values — Mine Room Mapping

| Room | Ores | Citation |
|------|------|----------|
| mine_01 | stone, coal, copper, iron | js/shared/oreData.js:32 |
| mine_02 | steel, gold, amethyst | js/shared/oreData.js:33 |
| mine_03 | ruby, diamond, emerald | js/shared/oreData.js:34 |
| mine_04 | titanium, mythril, celestium, obsidian, dusk | js/shared/oreData.js:35 |

## Behavior

1. `spawnOreNodes` runs on mine entry: 18 group centers picked with constraints (wall margin 4, spawn clearance 4, exit clearance 5, outer spacing 12) (miningSystem.js:171-212).
2. Each group gets 5-6 ores from the room's pool, weighted by rarity, placed within ±2 tiles, inner spacing 1.2 (miningSystem.js:217-254).
3. Each frame in mine: depleted nodes tick down respawnTimer; at 0 → hp restored (miningSystem.js:262-273).
4. Mining active when `InputIntent.shootHeld && melee.special === 'pickaxe' && activeSlot === 1` (miningSystem.js:277).
5. Nearest ore in range (90px) + in facing cone (dirConeWidth 0.85) selected (miningSystem.js:293-315).
6. Level gate: `skillData['Mining'].level < ore.miningLevelReq` blocks mining; shows 🔒 indicator (miningSystem.js:332, 617-622).
7. Tick rate = `max(10, round(44 / pickaxe.miningSpeed))` (miningSystem.js:58).
8. Per tick: `damage = max(1, floor(pickaxe.damage / 10))`; roll crit via `pickaxe.critChance` → 2× damage (miningSystem.js:363-371).
9. On depletion: ore added to inventory (or dropped as pickup if full), XP awarded, respawn timer = `respawnTime + regrowFrames` (600+90=690) (miningSystem.js:397-437).
10. Ore pickups: live 1800 frames; auto-collected at <40 px distance (miningSystem.js:100-114).
11. Ore collision: pushes player out using `PLAYER_R + ORE_COLLISION_RADIUS` (miningSystem.js:673-689).

## Dependencies

- Reads: `Scene.inMine`, `level`, `levelEntities`, `playerEquip.melee`, `PICKAXE_TIERS`, `ORE_TYPES`, `MINE_ROOM_ORES`, `GAME_CONFIG.ORE_COLLISION_RADIUS`/`MINING_PLAYER_R`, `InputIntent.shootHeld`, `activeSlot`, `skillData['Mining']`, `melee`, `getAimDir()`, `nextOreNodeId`, `oreNodes`, `TILE`, `UI`, `_discoveredOres`.
- Writes: `oreNodes`, `_orePickups`, `inventory` (createOreItem), `hitEffects`, `skillData['Mining'].xp` via `addSkillXP`, `window._miningActive`, `window._miningHitFlash`, `window._miningLockedNodeId`.

## Edge cases

- In opMode, mining level gate bypassed (miningSystem.js:332, 617).
- `_discoveredOres` set tracks unlocks for pickaxe gates (miningSystem.js:404).
- First-hit timing: after target switch, `miningTimer = tickRate - melee.swingDuration` so first hit aligns with the swing connecting (miningSystem.js:352).
- Ore pickups cleared on mine exit (miningSystem.js:99).
- Aim direction uses `getAimDir()` rather than `player.dir` since player.dir reverts after 14 frames but mining tick is 44 frames (miningSystem.js:289-291 comments).
- Respawn draws as "rubble" until `respawnTimer <= regrowFrames`, then fades/scales in over 90 frames (miningSystem.js:451-524).
