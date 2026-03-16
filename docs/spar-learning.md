# Spar Bot Learning Profile

This document tracks what the spar bot has learned about the player's tendencies.
Updated after spar sessions. The bot uses this data to adapt its strategy each match.

---

## Current Profile (Match Count: 24 — Win Rate: 49%)

Bot has won 2 matches. Player dominance dropping from 97% → 49%.

---

### Opening Habits
- **Rush Bottom**: 96% (LOCKED IN — player always rushes bottom)
- **Strafe Bias**: 42% left / 58% right (slight right preference)

### Position Tendencies
- **Bottom Bias**: 76% (STRONG — player lives in the bottom zone)
- **Left Bias**: 53% (centered)

### Shooting Patterns
- **Up**: 5% | **Down**: 49% | **Left**: 43% | **Right**: 3%
- Still 92% down+left. Almost never shoots up or right.

### Dodge Patterns
- **Left vs Right**: 44% left / 56% right (slight right dodge bias emerging)
- **Up vs Down**: 46% up / 54% down (slight down dodge bias)

### Aggression
- **Overall**: 0.50 (moved from 0.35 to neutral — player getting more aggressive)
- **On Enemy Reload**: 0.20 (VERY LOW — still doesn't punish reloads)
- **When Low HP**: 0.31 (LOW — plays passive when hurt)

### Reload Behavior
- **Average Y Position**: 0.63 (reloads in bottom zone, slightly less deep than before)

---

## Situational Behavior (What Player Does Based on Game State)

### When Player Has Bottom
- **Holds position**: 49% (half the time holds, half pushes or repositions)
- **Shot frequency**: 95% (VERY HIGH — walls bullets constantly from bottom)
- **Pushes toward bot**: 19% (rarely pushes — prefers to hold and shoot)

**Bot counter**: Player is a turret when they have bottom. Spam bullets but don't push. Bot should strafe wide, approach at angles, don't walk into the wall.

### When Bot Has Bottom
- **Tries to retake**: 27% (LOW — usually doesn't fight for bottom back)
- **Flanks sideways**: 26% (sometimes tries horizontal approach)
- **Retreats**: 54% (MORE THAN HALF THE TIME gives up and backs off)

**Bot counter**: Player gives up bottom easily. Bot should hold it aggressively — player won't challenge hard.

### When Bot Approaches Player
- **Holds ground**: 14% (VERY LOW — almost always runs)
- **Counter-pushes**: 34% (sometimes fights back)
- **Sidesteps**: 65% (PRIMARY RESPONSE — dodges sideways)

**Bot counter**: Player sidesteps on approach. Bot should lead shots toward dodge direction, use approach baits to trigger sidestep then shoot where they dodge TO.

### When Bot Retreats
- **Chases**: 68% (HIGH — player chases retreating bot)
- **Shoots while chasing**: 81% (HIGH — aggressively shoots during chase)

**Bot counter**: Player chases hard. Bot can use retreats as BAIT — fake retreat, let player overextend chasing, then reverse and punish.

---

## Shot Direction by Position

### When Player Is ABOVE Bot
- **Shoots down**: 30% | **Shoots sideways**: 70%
- Player prefers side-shots even from above. Doesn't commit to shooting straight down.

### When Player Is BELOW Bot (has bottom)
- **Shoots up**: 18% | **Shoots sideways**: 82%
- Even from bottom advantage, player shoots left/right way more than up. Bot is safer staying directly above than to the side.

### When Level (same height)
- **Shoots left**: 44% | **Shoots right**: 4%
- Heavily favors shooting left. Bot should stay to player's RIGHT side when level.

---

## Combat Outcomes (Cause & Effect)

### Player Accuracy
- **Overall hit rate**: 20%
- **Close range (<150px)**: 25% — best range
- **Mid range (150-300px)**: 19%
- **Far range (300+px)**: 22%

**By bot movement:**
- **Bot strafing**: 39% hit rate (WORST for bot — player tracks strafes well)
- **Bot standing still**: 24%
- **Bot approaching**: 12% (player struggles to hit incoming bot)
- **Bot retreating**: 10% (player can't hit retreating bot either)

**Key insight**: Player is BEST at hitting strafing targets (39%) and WORST at hitting approaching/retreating targets (10-12%). Bot should approach/retreat more, strafe less.

### Bot Accuracy
- **Overall hit rate**: 13%
- **Player dodge rate**: 83% (player is very evasive)
- **vs strafing player**: 8% (almost impossible to hit)
- **vs still player**: 35% (much easier when player stops)
- **vs approaching player**: 18%

### Combat Patterns
- **Player's best hit distance**: 217px (mid range)
- **Bot's best hit distance**: 156px (close range)
- **Player damage from bottom**: 8% (LOW — having bottom doesn't translate to damage?)
- **Bot damage from bottom**: 16%
- **Trade ratio**: 50/50 (even in mutual exchanges)

---

## Match History (last 20)

| # | Result | Duration | Shots | Bottom % | Date |
|---|--------|----------|-------|----------|------|
| 5 | Player Win | 15.3s | 24 | 82% | 2026-03-16 |
| 6 | Player Win | 12.4s | 17 | 79% | 2026-03-16 |
| 7 | Player Win | 23.5s | 41 | 76% | 2026-03-16 |
| 8 | Player Win | 7.9s | 14 | 85% | 2026-03-16 |
| 9 | Player Win | 16.9s | 27 | 82% | 2026-03-16 |
| 10 | Player Win | 29.9s | 49 | 77% | 2026-03-16 |
| 11 | Player Win | 22.2s | 22 | 71% | 2026-03-16 |
| 12 | Player Win | 17.7s | 25 | 81% | 2026-03-16 |
| 13 | Player Win | 13.8s | 12 | 66% | 2026-03-16 |
| 14 | Player Win | 11.2s | 19 | 83% | 2026-03-16 |
| 15 | Player Win | 12.4s | 21 | 82% | 2026-03-16 |
| 16 | Player Win | 21.8s | 35 | 68% | 2026-03-16 |
| 17 | Player Win | 24.2s | 43 | 76% | 2026-03-16 |
| 18 | Player Win | 12.2s | 22 | 83% | 2026-03-16 |
| 19 | **Bot Win** | 38.2s | 68 | 64% | 2026-03-16 |
| 20 | **Bot Win** | 10.8s | 17 | 82% | 2026-03-16 |

**Trend**: Bot won the last 2 matches. Match 19 was a long grind (38s, 68 shots). Match 20 was a quick kill (10.8s).

---

## What's Missing — Data We Should Still Track

The current system tracks WHERE you are and WHAT you do, but it's missing:

1. **Timing/rhythm patterns**: When do you peek? Do you burst-fire or single-shot? What's your shot cadence? Do you shoot immediately after dodging?
2. **Action chains**: After getting hit → do you retreat, counter-shoot, or panic? After landing a hit → do you push or stay? After dodging → do you counter?
3. **Peek patterns**: How long do you expose yourself before shooting? Do you strafe-peek left or right?
4. **Reload timing**: Do you reload early (half mag) or empty? Do you reload at safe times or risky times?
5. **Kill conditions**: What was the exact state when kills happened? Distance, who had bottom, movement, recent actions
6. **Adaptation detection**: Does your playstyle change mid-match? Do you play differently in the first 10s vs later?
7. **Response to specific bot actions**: When bot walls bullets → what do you do? When bot baits → do you fall for it?

---

## How It Works

- **Data collected every match**: position, movement, dodge dirs, shot patterns, aggression, combat outcomes
- **Exponential moving average (alpha=0.3)**: recent matches weighted 3x more than older
- **v2 additions**: situational behavior, shot context, hit/miss tracking with full game state
- **Adapts if you change**: switch playstyle and the bot adjusts within 3-4 matches

## How to Update This Doc

After a spar session, run in the browser console:
```js
console.log(JSON.stringify(sparLearning, null, 2));
```

To reset the bot's memory:
```js
Object.assign(sparLearning, {
  version: 2, matchCount: 0,
  opening: { rushBottom: 0.5, strafeLeft: 0.5 },
  position: { bottomBias: 0.5, leftBias: 0.5 },
  shooting: { upPct: 0.25, downPct: 0.25, leftPct: 0.25, rightPct: 0.25 },
  dodging: { leftBias: 0.5, upBias: 0.5 },
  aggression: { overall: 0.5, onEnemyReload: 0.5, whenLowHp: 0.5 },
  reload: { avgNormalizedY: 0.5 },
  whenHasBottom: { holdsPct: 0.5, shotFreq: 0.5, pushPct: 0.5 },
  whenBotHasBottom: { retakePct: 0.5, flankPct: 0.5, retreatPct: 0.5 },
  whenBotApproaches: { holdGroundPct: 0.5, counterPushPct: 0.5, sidestepPct: 0.5 },
  whenBotRetreats: { chasePct: 0.5, shotFreq: 0.5 },
  shotByPosition: { whenAbove: { downPct: 0.5, sidePct: 0.5 }, whenBelow: { upPct: 0.5, sidePct: 0.5 }, whenLevel: { leftPct: 0.5, rightPct: 0.5 } },
  playerShots: { hitRate: 0.5, hitRateClose: 0.5, hitRateMid: 0.5, hitRateFar: 0.5, hitWhenBotStrafing: 0.5, hitWhenBotStill: 0.5, hitWhenBotApproach: 0.5, hitWhenBotRetreat: 0.5 },
  botShots: { hitRate: 0.5, dodgedRate: 0.5, hitWhenPlayerStrafing: 0.5, hitWhenPlayerStill: 0.5, hitWhenPlayerApproach: 0.5 },
  combatPatterns: { playerHitDist: 250, botHitDist: 250, playerDmgWhenHasBottom: 0.5, botDmgWhenHasBottom: 0.5, tradeRatio: 0.5 },
  winRate: 0.5, history: [],
});
```
