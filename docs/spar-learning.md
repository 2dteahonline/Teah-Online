# Spar Learning Notes

## Overview

This document is the living reference for the spar bot's learning system and a place to record human observations after testing.

Use it for two things:
- understanding what the bot currently learns and where that data lives
- writing down what you see from your perspective so tuning is guided by both telemetry and actual spar feel

## Files

- `js/shared/sparData.js` -- default spar learning profile, persistent data shape
- `js/authority/sparSystem.js` -- live spar telemetry, reinforcement rewards, bot decision logic
- `js/testing/sparTraining.js` -- `sparTrain(...)`, `sparSelfPlay(...)`, fast automated spar modes
- `js/core/draw.js` -- turbo loop support for automated spar modes

## Current Learning Sources

There are now 3 distinct data sources:

### 1. `player1v1`

This is the personal layer.

It learns from:
- real 1v1 spars against you

It should answer:
- what do you specifically do a lot?
- which duel styles work best against you?
- what counters have already worked on you?

This is the most important layer for live adaptation against you.

### 2. `general1v1`

This is the broad archetype layer.

It learns from:
- `sparTrain(...)`
- automated matches against scripted archetypes like `rusher`, `waller`, `strafer`, `retreater`, `corner`

It should answer:
- what styles/routes/counters are broadly strong against repeatable opponent patterns?

This is the bot's general baseline knowledge.

### 3. `selfPlay1v1`

This is the self-play layer.

It learns from:
- `sparSelfPlay(...)`
- current bot fighting a frozen snapshot of an earlier/current policy

It should answer:
- what tends to win in bot-vs-bot meta play?
- what policies survive against stronger automated opponents?

This is useful for broad strength, but should not override your personal layer when real `player1v1` data exists.

## Reinforcement Buckets

In addition to win-rate/style summaries, the bot now keeps reward buckets in:

- `reinforcement1v1.player`
- `reinforcement1v1.general`
- `reinforcement1v1.selfPlay`

Each scope tracks rewards for:
- `style`
- `opening`
- `antiBottom`

This means the bot is not only learning "what the player does." It is also learning:
- which style choice actually paid off
- which opening route actually paid off
- which anti-bottom response actually paid off

## What The Bot Is Learning

The live telemetry and reward model currently care most about:

### Match Result

Biggest signal:
- winning is the largest reward
- losing is the largest punishment

### Damage Trade

Strong signal:
- dealing damage without taking return damage is heavily rewarded
- taking damage while doing little or none back is punished

### Vertical Control

Important positional signal:
- being under the opponent is rewarded
- being above the opponent is punished

This is broader than literal bottom-of-map control.
The real idea is:
- can the bot stay in the stronger "under them" relationship?

### Gun-Side Lane Advantage

Important angle signal:
- if the bot's muzzle/shot lane is more favorable than the opponent's, that is rewarded
- if the opponent has the cleaner lane, that is punished

This uses spar muzzle geometry rather than a fake left/right heuristic.

### Opening Results

The bot also learns:
- which openings get bottom early
- which openings convert into wins
- which openings repeatedly fail

### Anti-Bottom Responses

The bot now tracks which of these works better against bottom holders:
- `directContest`
- `sideFlank`
- `baitPull`

## Automated Modes

### `sparTrain(type, count)`

Examples:

```js
sparTrain('rusher', 50)
sparTrain('all', 100)
```

Use this for:
- scripted archetype testing
- broad generalization
- learning counters to repeatable patterns

Writes mainly to:
- `general1v1`
- `reinforcement1v1.general`

### `sparSelfPlay(count)`

Example:

```js
sparSelfPlay(100)
```

Use this for:
- bot-vs-bot broad strength
- current bot vs frozen previous policy
- building general competitive difficulty

Writes mainly to:
- `selfPlay1v1`
- `reinforcement1v1.selfPlay`

### Fast Sim Support

Both automated modes now run faster than normal live spar by:
- shortening countdown
- shortening post-match delay
- restarting matches faster
- advancing more fixed-timestep updates per rendered frame

This speeds up training without changing per-tick spar logic.

## Recommended Training Loop

Use this cycle:

1. `sparTrain('all', 50-100)`
2. `sparSelfPlay(50-100)`
3. real spars against yourself
4. write down what still feels weak
5. repeat

This gives:
- archetype learning
- self-play learning
- human-specific learning

## What To Record From Your Perspective

Numbers alone are not enough. The best notes are concrete behavior notes like:

- bot gives up bottom too easily
- bot sits directly above me and feeds my peek
- bot contests bottom well now
- bot side-flanked me more after 8 matches
- bot still overchases when I fake retreat
- bot punishes reloads better
- bot keeps choosing the same weak opening
- bot got stronger after self-play but still weak vs human baiting

## Manual Notes Template

Copy this section and fill it in after a test set.

### Session

- Date:
- Build:
- Test type:
- Matches:

### Automated Training Run

- `sparTrain(...)` used:
- `sparSelfPlay(...)` used:
- Did training look faster:
- Did openings vary:
- Did anti-bottom choices vary:

### Real Spar Notes

- What I repeated:
- Did the bot notice:
- After how many matches did it adapt:
- Strongest improvement:
- Biggest remaining mistake:

### Position / Bottom Control

- Contesting bottom:
- Staying under me:
- Avoiding the "sit above peek trap" mistake:
- Re-entry quality:

### Gun-Side / Angle Notes

- Did it seek better shot lanes:
- Did it avoid bad lane disadvantages:
- Did it misuse top-left/top-right angles:

### Damage / Punish Notes

- Reload punish:
- Trade quality:
- Damage pressure:
- Did it feed free hits:

### Overall Feel

- Baseline strength:
- Adaptation speed:
- Felt smarter because of `sparTrain`:
- Felt stronger because of `sparSelfPlay`:
- Felt more personal because of `player1v1`:

## Useful Console Commands

View current spar data:

```js
sparData()
```

Reset spar learning:

```js
resetSparLearning()
```

Run archetype training:

```js
sparTrain('all', 100)
```

Run self-play:

```js
sparSelfPlay(100)
```

Stop automated training:

```js
sparTrainStop()
```

## Persistence Check

To make sure learning persisted:

1. run `sparData()`
2. refresh
3. run `sparData()` again

You should still see:
- `player1v1`
- `general1v1`
- `selfPlay1v1`
- `reinforcement1v1.player`
- `reinforcement1v1.general`
- `reinforcement1v1.selfPlay`

## Current Design Intent

High-level priority:

1. `player1v1` should matter most once enough real human matches exist
2. `general1v1` should provide strong broad defaults
3. `selfPlay1v1` should raise the bot's general ceiling
4. reinforcement buckets should make it learn faster at exact decision points

If the bot gets stronger in automation but still feels dumb against you, note that explicitly.
That usually means:
- the broad policy improved
- but the human-specific adaptation or behavior logic still needs work
