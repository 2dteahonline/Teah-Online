# Full Bot-vs-Bot Self-Play Audit (Update #361)

## Bugs Found and Fixed

### BUG 1 (Critical): Damage tracking completely broken in fullBvB
- **File:** `sparSystem.js` `_onSparBulletHit()`
- **What:** Early `if (isFullBvB) return;` at the top of the function skipped ALL code, including `_matchDmgDealt`/`_matchDmgTaken` tracking on bot AI state
- **Impact:** Every reward computation used `dmgDelta = 0` (24% of reward signal was neutral/useless). Phase engagement rewards (antiBottom, gunSide, escape, CR, etc) all computed `dmgTaken = 0`. Training summary showed 0 damage dealt/taken. The bot was learning from garbage data.
- **Fix:** Restructured function — damage tracking now runs FIRST for all modes, fullBvB return only skips the player-centric collector arrays (playerHits, playerMisses, etc) which reference the `player` global

### BUG 2 (Dead Code): Unreachable fullBvB shooter-finding logic
- **File:** `sparSystem.js` `_onSparBulletHit()`
- **What:** `if (isFullBvB)` blocks inside the shooter/target resolution were unreachable because the early return already exited
- **Fix:** Cleaned up — replaced with a single clean `if (isFullBvB)` branch at the top that resolves shooter/target from team arrays

### BUG 3 (Minor): Save every match instead of every 50
- **File:** `sparTraining.js` `_sparTrainOnMatchEnd()`
- **What:** `_sparTrainState.queue.length === 0` was always true in selfPlay/fullBvB mode (queue is empty, counter is used instead), so `shouldSave` was always true
- **Impact:** `SaveLoad.save()` called every match instead of every 50 — unnecessary localStorage serialization overhead at scale
- **Fix:** Changed to check `_remainingMatches <= 0 && queue.length === 0` for the "last match" condition

### BUG 4 (Previously Fixed): matchCollector stub missing arrays
- **File:** `sparSystem.js` `_finalizeAntiBottomEngagement()`
- **What:** Stub `{ samples: 10 }` didn't have `antiBottomEngagements` array — `.push()` crashed
- **Fix:** Added null guard `if (collector && collector.antiBottomEngagements)`

### BUG 5 (Previously Fixed): NaN reward corruption
- **File:** `sparSystem.js` `_updateMatchReinforcement()`
- **What:** Undefined collector fields (botHasBottom_frames, nearWall_cornerStuckFrames, etc) produced NaN that propagated into reward buckets permanently
- **Fix:** Added `|| 0` defaults for all collector field reads + NaN guard in `_updateRewardBucket`

## Verified Safe (No Bugs)

- **Player at -9999,-9999:** Not in any team array, can't be hit by bullets, body blocking ignores it
- **`_collectPlayerData` skip:** Early return preserves the stub collector, no player-specific sampling runs
- **`_tickOneBot` entity-agnostic:** Uses `member.entity` and team arrays, never references `player` global
- **Bullet collision (meleeSystem.js):** Uses `SparState.teamA/teamB` arrays — fully entity-agnostic
- **`onParticipantDeath`:** Entity matching works for bot entities, `entity === player` branch only triggers for actual player
- **Match resolution:** `teamA.filter(p => p.alive)` works with bot entities
- **Body blocking:** Iterates all alive entities from both teams — entity-agnostic
- **`_getPhaseScopes`:** Returns `['general', 'selfPlay']` during selfplay, correctly routing rewards
- **`_profileMods`:** Set to null during training, all `pm &&` checks short-circuit
- **No streak continue race:** Training uses `spar_1v1` with `streakMode: false`
- **Snapshot restore:** Runs on exit, restoring player globals that were never modified
