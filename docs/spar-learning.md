# Spar Bot Reference (Update #445)

The complete reference for the spar bot AI, learning system, and training pipeline.
Read this before making any spar-related changes.

---

## How Spar Works (Game Theory)

Spar is a 1v1 top-down arena with **4-directional shooting** (up/down/left/right, no free aim).

### The 3 Objectives (Priority Order)

1. **Bottom control** — #1 win condition. Being below the opponent gives better shot lanes and forces them into disadvantaged positions. Losing bottom is the #1 way to lose.
2. **Gun-side advantage** — being on the side where your shots connect cleanly. Matters because it creates/preserves/recovers bottom.
3. **Corner pressure** — using bottom + gun-side to slowly force the opponent into a corner where they're trapped.

### Walling

"Walling" = strafe diagonally while shooting a fixed direction. Each bullet launches from a different position, creating a staggered diagonal line of bullets. "Wall up" from bottom = shoot left/right while moving up-diagonally, creating a rising wall that prevents the opponent from crossing down. Essential — if you don't wall at bottom, the opponent takes it for free.

### Why Distance Matters

- **Far**: more time to read bullet gaps and cross safely, opponent can't react to your cross
- **Close**: opponent reacts to cross attempt, can shoot the crossing path
- Recovery/crossing is about reading the LIVE bullet field + having enough distance to act on gaps

### Advantage Chaining

Each advantage creates the next:
- Gun-side peek pressure forces reactions
- Those reactions cause opponent to lose bottom control
- Bottom control enables walling
- Walling enables corner pressure
- It's a chain, not isolated goals

### What Kills Humans

1. Losing bottom
2. Bad peeks (forcing disadvantaged angles)
3. Getting cornered (bottom loss → wall pressure → trapped)
4. Cumulative failure rate — even imperfect bullet walls create pressure because humans can't dodge everything

---

## Bot Architecture

### Files

| File | Role |
|------|------|
| `js/shared/sparData.js` | Data shape, bucket creation, reset functions, policy key lists |
| `js/authority/sparSystem.js` | All bot AI: decisions, rewards, engagement lifecycle, tick logic (~7000 lines) |
| `js/testing/sparTraining.js` | Training harness: `sparTrain()`, `sparSelfPlay()`, variants |
| `js/core/draw.js` | Turbo loop for fast automated training |
| `js/shared/gameConfig.js` | Physics constants (bullet speed, hitbox sizes) |

### Decision Layers (Top to Bottom)

1. **Strategic** — which duel style, opening route, overall approach
2. **Tactical** — which specific tactic for anti-bottom, gun-side, escape, etc.
3. **Reactive** — dodge bullets, wall shots, punish reloads
4. **Parametric** — exact speeds, distances, thresholds

When debugging: diagnose which layer is wrong FIRST. Don't tune parameters when the strategy is the problem.

### Key Design Rules

- **No frame counts** — all decisions are game-state conditions (damage, position, EMA stability). Frame counts don't port to Unity, don't scale with map size.
- **Arena-relative** — thresholds expressed as % of arena dimensions, not pixel constants
- **Entity-agnostic** — bots = future multiplayer users, every system works for any entity
- **Condition-based lifecycle** — engagements enter/exit based on game state, not timers

---

## Learning System

### 3 Learning Scopes

| Scope | Learns From | Priority |
|-------|------------|----------|
| `player` | Real 1v1 spars against you | Highest — personal adaptation |
| `general` | `sparTrain()` vs scripted archetypes | Medium — broad baseline |
| `selfPlay` | `sparSelfPlay()` bot vs frozen snapshot | Lowest — general competitive ceiling |

When making decisions, player scope gets highest weight (28x base), general gets 12x, selfPlay gets 5x.

### 12 Policy Dimensions

Each scope tracks these independently:

| Dimension | What It Decides | Example Options |
|-----------|----------------|-----------------|
| `style` | Overall duel approach | aggressive, defensive, balanced, spacing, rush |
| `opening` | First ~2 seconds route | slantFast, slantSlow, centerDrop, wallHug, lateralFirst |
| `antiBottomTactic` | How to retake bottom | contestDirect, contestSprint, flankWide, flankTight, baitRetreat, etc. (11 tactics) |
| `antiBottomFamily` | Tactic family grouping | contest, flank, bait, angle |
| `gunSidePolicy` | How to get/use gun-side | directCross, wideArc, fadeAway, holdAndShoot, etc. |
| `escapePolicy` | How to escape bad positions | cornerBreak, highReset, wideDisengage, baitPullout |
| `shotTimingPolicy` | When/how aggressively to shoot | aggressive, conservative, reactive, burstAndMove |
| `reloadPolicy` | How to handle reload windows | aggressive, conservative, punishOnly |
| `midPressurePolicy` | Mid-fight pressure tactics | pushDirect, anglePressure, wallTrap |
| `wallPressurePolicy` | Wall-based pressure | wallPin, wallBounce, wallTrap |
| `openingContestPolicy` | How to contest the opening | rushContest, mirrorContest, delayedContest |
| `centerRecoveryPolicy` | How to recover from center/top | directDrop, lateralFirst, baitAndDrop |

Plus `punishWindowPolicy` for reload punish timing.

### Hierarchical Picker (`_pickHierarchicalPolicy`)

For each decision, the bot:
1. Looks at **player scope** first (if 3+ plays with this specific tactic)
2. Falls back to **family-level data** in player scope (if 3+ plays at family level)
3. Falls back to **general scope** (same 3-play threshold)
4. Falls back to **selfPlay scope** (same threshold)
5. Falls back to **0.5** (neutral) if no data anywhere

Each option gets a score via UCB (Upper Confidence Bound):
```
score = reward + exploreWeight * sqrt(log(totalPlays + 2) / (dataPlays + 1))
```
This balances exploitation (pick what worked) vs exploration (try undersampled options).

### Two Reward Signals

Every policy bucket stores TWO independent reward tracks:

| Signal | Written By | Measures | Weight |
|--------|-----------|----------|--------|
| `phaseReward` / `phasePlays` | Finalize functions (engagement end) | Did THIS specific decision work? | 70% |
| `reward` / `plays` | `_updateMatchReinforcement` (match end) | Did the match end well? | 30% |

At decision time, `_scoreRewardBucket` blends: **phaseReward * 0.7 + matchReward * 0.3**

Why separate? A great anti-bottom escape can happen in a match the bot loses for unrelated reasons. Without separation, the escape tactic gets punished despite working perfectly.

### EMA (Exponential Moving Average)

Both reward signals use EMA instead of simple averaging:
```
alpha = max(0.1, 1 / (plays + 1))
newReward = oldReward * (1 - alpha) + newData * alpha
```

- Early: alpha is large (fast learning, ~1 play = full update)
- Later: alpha floors at 0.1 (10% weight for new data, 90% old)
- 10x faster at detecting when something stopped working vs simple average

### Fail Streaks

Tactics that fail repeatedly get a penalty that suppresses their selection. Four fail streak maps:
- `tacticFailStreaks` — anti-bottom tactics
- `escapeFailStreaks` — escape tactics
- `centerRecoveryFailStreaks` — center recovery tactics
- `repeekFailStreaks` — lane repeek attempts

**Decay**: Every 200 matches, all fail streaks are halved so old failures don't permanently block tactics.

---

## Engagement Lifecycle

Each tactical engagement (anti-bottom, gun-side, escape, etc.) follows this pattern:

### Entry Conditions (game state, never frame counts)
- Anti-bottom: enemy stability EMA > 0.6 OR vertical gap > 20% arena height
- Gun-side: lane quality dropped below threshold + favorable geometry exists
- Escape: cornered OR taking sustained damage with no positional gain

### Progress Tracking (during engagement)
- Damage dealt vs taken since engagement start
- Y-progress toward goal (e.g., toward bottom for anti-bottom)
- Lane quality improvement

### Exit/Finalize Conditions
- **Success**: reached goal (e.g., bot got bottom, lane improved enough)
- **Failure**: taking damage + no progress (e.g., >15 damage taken with <5% Y progress)
- **Safety cap**: arena-relative maximum (arenaH / speed * 3) — only as circuit breaker

### Cooldown (situation-changed snapshots)
After failure, don't retry until the situation has meaningfully changed:
```
positionShift > 8-28% of arena dimensions (escalates with consecutive failures)
```
This replaces fixed frame-count cooldowns.

### Phase Reward Calculation
Each finalize function computes a phase reward from engagement-specific outcomes:
- Anti-bottom: regain progress (50%) + damage trade (28%) + speed (22%)
- Gun-side: resolution (50%) + lane quality gain (30%) + damage (20%)
- Escape: resolution (55%) + damage (20%) + speed (15%) + quality (10%)

---

## Training System

### Console Commands

```js
sparSelfPlay(50000)    // Bot vs frozen snapshot (main training mode)
sparTrain('all', 100)  // Bot vs scripted archetypes
resetSparLearning()    // Full data wipe
resetGeometryLearning() // Reset policy buckets only (keeps observational data)
sparData()             // Export full learning data as JSON
sparSummary()          // Quick reward summary (match-level only)
sparTrainStop()        // Stop running training
```

### Self-Play Variants

~40% of self-play matches apply random forced variants:
- Random style, opening route, anti-bottom family
- Random shot aggression, retreat speed, gun-side bias, reload behavior
- Random reaction delay, side preference

**Variant tagging**: Forced dimensions are tagged so match-end rewards DON'T record under the forced dimension. This prevents "random style X happened to win → style X gets credit" pollution.

Tagged dimensions: `style`, `opening`, `antiBottom`, `gunSide`, `escape`, `shotTiming`, `reload`
Plus: `reactionDelay > 0` tags `shotTiming` as forced.

Defensive guards also exist for: `midPressure`, `wallPressure`, `openingContest`, `punishWindow`, `centerRecovery` (no variants currently force these, but guards prevent future bugs).

### Recommended Training Flow

1. `resetSparLearning()` — start clean
2. `sparSelfPlay(50000)` — build baseline
3. Check `sparData()` — verify learning converges
4. Real spars against yourself — builds `player` scope data
5. Note what still feels weak → fix logic or retrain

---

## How to Read sparData()

### Quick Health Checks

1. **Are all tactic families being explored?** Check `antiBottomFamily` — all families (contest, flank, bait, angle) should have 3+ plays
2. **Are phase rewards diverging from match rewards?** Compare `phaseReward` vs `reward` in the same bucket. If identical, phase separation isn't working.
3. **Is anything stuck at 0.5?** Buckets with many plays but reward ~0.5 means the signal is too noisy or the tactic is truly neutral.
4. **Check fail streaks**: `tacticFailStreaks` — any value > 10 means that tactic is being heavily suppressed. Verify it deserves it.

### Key Metrics

- **Anti-bottom regain rate**: How often the bot successfully retakes bottom. Target: >15%
- **Opening secured bottom**: How often bot gets bottom in the opening. Target: >40%
- **Win rate** (self-play): Should converge near 50% (playing itself). If lopsided, one side has a degenerate strategy.
- **Phase plays vs match plays**: Phase plays should be higher (multiple engagements per match). If phase plays are 0, finalize functions aren't firing.

---

## Known Issues & History

### Fixed (Update #439-445)

- Bot rushing to bottom through bullets (bullet wall detection: 1 bullet blocks, 18-frame lookahead)
- Angle tactics getting 0 plays (UCB family fallback: require 3+ plays before using data)
- Frame-count decisions (all converted to game-state conditions)
- Reward pollution from variants (forced dimension tagging)
- Slow adaptation (EMA replaces simple average)
- Ghost fail streaks (decay every 200 matches)
- Missing repeekFailStreaks decay
- Missing phase fields in bucket initialization

### Remaining Backlog

- **Weak UCB exploration bonus** — undersampled tactics only get ~2.5x bonus, may not compete with established options
- **No context-dependent rewards** — "flankWide" near a wall is terrible but in open space is great; bot can't distinguish
- **Style-opening coupling** — style and opening are chosen independently but interact heavily
- **Hardcoded hierarchical weights** — player 28x, general 12x, selfPlay 5x are fixed, not adaptive
- **No in-match behavioral adaptation** — bot commits to choices at match start, can't switch mid-fight based on what's working

---

## Design Principles (Non-Negotiable)

1. **No frame counts for decisions** — game state conditions only. Frame counts don't port to Unity, don't scale with map size, aren't how humans think.
2. **Arena-relative thresholds** — express as % of arenaW/arenaH, not pixels
3. **Entity-agnostic** — every system works for any entity, not just the local player
4. **Phase reward > match reward** — engagement-specific outcomes are more reliable than global match outcome
5. **Diagnose the right layer** — don't tune parameters when the strategy is wrong
6. **Clean variant data** — never record forced-variant outcomes under the learned policy
