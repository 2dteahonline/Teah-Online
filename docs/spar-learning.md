# Spar Bot Learning Profile

This document tracks what the spar bot has learned about the player's tendencies.
Updated after spar sessions. The bot uses this data to adapt its strategy each match.

---

## Current Profile (Match Count: 8)

### Opening Habits
- **Rush Bottom**: 97% (STRONG — player almost always rushes bottom immediately)
- **Strafe Bias**: 35% left / 65% right (slight right strafe preference)

### Position Tendencies
- **Bottom Bias**: 79% (STRONG — player dominates the lower half of the arena)
- **Left Bias**: 54% (neutral — roughly centered horizontally)

### Shooting Patterns
- **Up**: 3% | **Down**: 49% | **Left**: 43% | **Right**: 5%
- Player almost exclusively shoots **down** and **left** (92% combined)
- Rarely shoots up or right — bot should exploit those lanes

### Dodge Patterns
- **Left vs Right**: 50/50 (neutral — no dodge bias detected yet)
- **Up vs Down**: 52/48 slight up bias (neutral)

### Aggression
- **Overall**: 0.35 (LOW — player plays passive/defensive)
- **On Enemy Reload**: 0.30 (LOW — player does NOT punish reloads)
- **When Low HP**: 0.50 (neutral — no data yet, hasn't been low HP)

### Reload Behavior
- **Average Y Position**: 0.69 (reloads in bottom territory — stays in position)

### Win Rate
- **Player Win Rate**: 97% (8 wins, 0 losses)

---

## Scouting Report

**Playstyle**: Positional/defensive. Locks down bottom early, holds it, and shoots down/left. Doesn't chase or punish openings. Very consistent — same opener every match.

**Strengths**:
- Excellent bottom control (79% bottom bias)
- Consistent positioning — hard to dislodge once set up
- Efficient shooting (20-34 shots per match)

**Weaknesses to exploit**:
- Predictable opener (97% rush bottom — bot should contest or cut off)
- Doesn't punish reloads (0.30) — bot can reload aggressively
- Almost never shoots up/right (3%/5%) — bot should approach from above-right
- Passive style (0.35) — bot should be MORE aggressive, not less

---

## Match History

| # | Result | Duration | Shots | Bottom Bias | Date |
|---|--------|----------|-------|-------------|------|
| 1 | Player Win | 14.0s | 26 | 80% | 2026-03-16 |
| 2 | Player Win | 22.8s | 34 | 80% | 2026-03-16 |
| 3 | Player Win | 14.3s | 23 | 82% | 2026-03-16 |
| 4 | Player Win | 12.6s | 22 | 79% | 2026-03-16 |
| 5 | Player Win | 15.3s | 24 | 82% | 2026-03-16 |
| 6 | Player Win | 18.3s | 28 | 82% | 2026-03-16 |
| 7 | Player Win | 15.9s | 21 | 76% | 2026-03-16 |
| 8 | Player Win | 11.2s | 20 | 84% | 2026-03-16 |

**Average match**: 15.5 seconds, 24.8 shots, 80.7% bottom bias

---

## How It Works

- **Data collected every match**: position, movement, dodge directions, shot patterns, aggression
- **Exponential moving average (alpha=0.3)**: recent matches weighted 3x more than older ones
- **First 2 matches**: baseline, no adaptation
- **3+ matches**: bot starts countering player habits
- **10+ matches**: strong player profile built
- **Adapts if you change**: switch playstyle and the bot adjusts within 3-4 matches

## Bot Adaptations

Based on the profile, the bot adjusts:
- **Opening route**: counters your opener (if you always rush bottom-left, bot cuts that off)
- **Shot axis avoidance**: stays off your most common shooting lane
- **Dodge prediction**: anticipates which way you'll dodge
- **Aggression**: plays defensive vs aggressive players, pushes passive ones
- **Strafe speed**: increases difficulty if losing, eases if winning

## How to Update This Doc

After a spar session, run in the browser console:
```js
console.log(JSON.stringify(sparLearning, null, 2));
```
Or ask Claude to update this doc with the latest `sparLearning` data.

To reset the bot's memory:
```js
sparLearning.matchCount = 0;
sparLearning.opening = { rushBottom: 0.5, strafeLeft: 0.5 };
sparLearning.position = { bottomBias: 0.5, leftBias: 0.5 };
sparLearning.shooting = { upPct: 0.25, downPct: 0.25, leftPct: 0.25, rightPct: 0.25 };
sparLearning.dodging = { leftBias: 0.5, upBias: 0.5 };
sparLearning.aggression = { overall: 0.5, onEnemyReload: 0.5, whenLowHp: 0.5 };
sparLearning.reload = { avgNormalizedY: 0.5 };
sparLearning.winRate = 0.5;
sparLearning.history = [];
```
