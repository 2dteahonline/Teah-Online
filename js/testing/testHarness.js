// ===================== AUTOMATED MOB TEST HARNESS =====================
// Injectable test functions for systematic mob testing.
// Load via <script> or inject via preview_eval.
//
// Usage:
//   testAllFloorMobs(1)           → batch test all Floor 1 mobs
//   testMobDeep('cyber_mugger')   → deep test single mob
//   testBossRotation('the_don')   → test boss ability rotation
//   testAllMobs()                 → regression test all implemented floors

// Floor → mob type mapping (updated as floors are added)
const FLOOR_MOBS = {
  1: ['neon_pickpocket', 'cyber_mugger', 'drone_lookout', 'street_chemist',
      'renegade_bruiser', 'renegade_shadowknife', 'renegade_demo', 'renegade_sniper',
      'the_don', 'velocity'],
  2: ['circuit_thief', 'arc_welder', 'battery_drone', 'coil_runner',
      'suit_enforcer', 'compliance_officer', 'contract_assassin', 'executive_handler',
      'voltmaster', 'e_mortis'],
  3: ['scrap_rat', 'magnet_scavenger', 'rust_sawman', 'junkyard_pyro',
      'toxic_leechling', 'bog_stalker', 'chem_frog', 'mosquito_drone',
      'mourn', 'centipede'],
  4: ['tripwire_tech', 'gizmo_hound', 'holo_jester', 'time_prankster',
      'enforcer_drone', 'synth_builder', 'shock_trooper', 'signal_jammer',
      'game_master', 'junz'],
  5: ['rabid_hyenaoid', 'spore_stag', 'wasteland_raptor', 'plague_batwing',
      'gel_swordsman', 'viscosity_mage', 'core_guardian', 'biolum_drone',
      'lehvius', 'jackman', 'malric', 'vale'],
};

// Bosses per floor (multi-special mobs)
const FLOOR_BOSSES = {
  1: ['the_don', 'velocity'],
  2: ['voltmaster', 'e_mortis'],
  3: ['mourn', 'centipede'],
  4: ['game_master', 'junz'],
  5: ['lehvius', 'jackman', 'malric', 'vale'],
};

// ===================== HELPERS =====================

function _ensureTestArena() {
  if (!Scene.inTestArena) {
    enterLevel('test_arena', 10, 4);
    dungeonFloor = 1;
    window._opMode = true;
    player.hp = player.maxHp = 10000;
    gold = 999999;
  }
}

function _clearArena() {
  mobs.length = 0;
  bullets.length = 0;
  hitEffects.length = 0;
  deathEffects.length = 0;
  if (typeof mobParticles !== 'undefined') mobParticles.length = 0;
  if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
  if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
  StatusFX.clearPlayer();
  player.hp = player.maxHp;
  player.knockVx = 0;
  player.knockVy = 0;
}

function _runFrames(count) {
  for (let i = 0; i < count; i++) {
    try {
      updateMobs();
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.update();
      if (typeof HazardSystem !== 'undefined') HazardSystem.update();
      StatusFX.tickPlayer();
      if (typeof updateBullets === 'function') updateBullets();
      gameFrame++;
    } catch (e) {
      return { error: e.message, frame: i };
    }
  }
  return null;
}

// ===================== LEVEL 1: BATCH TEST =====================
// Tests all mobs for a floor in sequence. Returns pass/fail per mob.
window.testAllFloorMobs = function(floorNum) {
  const mobTypes = FLOOR_MOBS[floorNum];
  if (!mobTypes) return { error: 'No mobs defined for floor ' + floorNum };

  _ensureTestArena();
  dungeonFloor = floorNum;
  const results = [];

  for (const typeKey of mobTypes) {
    _clearArena();
    const result = _testSingleMob(typeKey, 600);
    results.push(result);
  }
  _clearArena();

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass);
  console.log(`\n=== FLOOR ${floorNum} TEST RESULTS: ${passed}/${results.length} PASSED ===`);
  for (const r of results) {
    const icon = r.pass ? 'PASS' : 'FAIL';
    const details = r.issues.length > 0 ? ' — ' + r.issues.join(', ') : '';
    console.log(`  [${icon}] ${r.type}: ${r.name}${details}`);
  }
  if (failed.length > 0) {
    console.log(`\nFAILED MOBS: ${failed.map(f => f.type).join(', ')}`);
  }

  return { floor: floorNum, total: results.length, passed, failed: failed.length, results };
};

function _testSingleMob(typeKey, frames) {
  const mt = MOB_TYPES[typeKey];
  if (!mt) return { type: typeKey, name: '???', pass: false, issues: ['Unknown mob type'] };

  const result = {
    type: typeKey,
    name: mt.name,
    pass: true,
    issues: [],
    // Tracking
    spawned: false,
    moved: false,
    specialFired: false,
    arrowsFired: false,
    noErrors: true,
    noNaN: true,
    noStuck: true,
  };

  // Spawn mob close to player for specials to trigger
  const spawnX = player.x + 120;
  const spawnY = player.y;
  const mob = createMob(typeKey, spawnX, spawnY, 1, 1);
  if (!mob) {
    result.pass = false;
    result.issues.push('createMob returned null');
    return result;
  }
  result.spawned = true;
  mobs.push(mob);

  // Set low CDs so specials fire during test
  mob._specialTimer = Math.min(mob._specialTimer, 60); // fire within 1s
  if (mob._abilityCDs) {
    for (const key of Object.keys(mob._abilityCDs)) {
      mob._abilityCDs[key] = Math.min(mob._abilityCDs[key], 60);
    }
  }

  // Track initial state
  const initX = mob.x, initY = mob.y;
  const initSpecialTimer = mob._specialTimer;
  const initBulletCount = bullets.length;

  // Run simulation
  const err = _runFrames(frames);
  if (err) {
    result.noErrors = false;
    result.pass = false;
    result.issues.push('Error at frame ' + err.frame + ': ' + err.error);
    return result;
  }

  // Check: mob alive? (Should survive 10s in test arena since player has 10k HP)
  const mobRef = mobs.find(m => m.id === mob.id);

  // Check: movement
  if (mobRef && (Math.abs(mobRef.x - initX) > 5 || Math.abs(mobRef.y - initY) > 5)) {
    result.moved = true;
  } else if (mt.ai !== 'witch' && mt.ai !== 'archer') {
    // Witch/archer may kite far enough to not move much in test arena
    // Only flag non-movement for melee types
    if (mobRef && mobRef.speed > 0) {
      result.issues.push('No significant movement detected');
    }
  }

  // Check: special fired (timer decreased or telegraph/hazard was created)
  if (mt._specials && mt._specials.length > 0) {
    if (mobRef) {
      if (mt._specials.length === 1) {
        if (mobRef._specialTimer !== initSpecialTimer || mobRef._specialTimer > initSpecialTimer) {
          result.specialFired = true;
        }
      } else {
        // Multi-special: check if any ability CD was reset
        for (const abilKey of mt._specials) {
          const cd = mobRef._abilityCDs[abilKey];
          if (cd !== undefined && cd > 60) {
            result.specialFired = true; // CD was reset = ability fired
            break;
          }
        }
      }
    }
    if (!result.specialFired) {
      result.issues.push('Special ability may not have fired');
    }
  }

  // Check: arrows fired (for archer types)
  if (mt.arrowRate > 0) {
    if (bullets.length > initBulletCount) {
      result.arrowsFired = true;
    } else {
      result.issues.push('No arrows fired');
    }
  }

  // Check: NaN values
  if (mobRef) {
    if (!isFinite(mobRef.hp) || !isFinite(mobRef.damage) || !isFinite(mobRef.speed) || !isFinite(mobRef.x) || !isFinite(mobRef.y)) {
      result.noNaN = false;
      result.pass = false;
      result.issues.push('NaN/Infinity detected in mob properties');
    }
  }

  // Run 60 more cleanup frames to let active abilities complete naturally
  // Freeze special timer so no NEW abilities fire during cleanup
  const cleanupMob = mobs.find(m => m.id === mob.id);
  if (cleanupMob) {
    cleanupMob._specialTimer = 99999; // prevent new specials
    if (cleanupMob._abilityCDs) {
      for (const key of Object.keys(cleanupMob._abilityCDs)) {
        cleanupMob._abilityCDs[key] = 9999;
      }
    }
  }
  _runFrames(60);
  player.hp = player.maxHp;

  // Check: stuck in multi-frame state (after cleanup frames, should all be resolved)
  const mobRefPost = mobs.find(m => m.id === mob.id);
  if (mobRefPost) {
    const stuckFlags = ['_laserTelegraph', '_tommyFiring', '_phaseDashing', '_blinkDashing',
      '_blinkTelegraph', '_stunTelegraph', '_poundTelegraph', '_barrageResolving',
      // Floor 2
      '_drainTelegraph', '_weldTelegraph', '_chargeDashing', '_chargeTelegraph',
      '_teslaSprinting', '_chainTelegraph', '_empTelegraph', '_magnetTelegraph',
      '_tapeTelegraph', '_penaltyTelegraph', '_dividendFiring', '_parachuteDashing',
      // Floor 3
      '_magTelegraph', '_sawTelegraph', '_pileDriverTelegraph', '_grabTelegraph',
      '_latchDashing', '_latchTelegraph', '_submerged', '_siphonTelegraph', '_burrowSubmerged',
      // Floor 4
      '_rewindTelegraph', '_rouletteTelegraph', '_hackTelegraph', '_suppressTelegraph',
      '_rocketDashing', '_rocketTelegraph', '_empDomeTelegraph', '_pulseTelegraph', '_repulsorTelegraph',
      // Floor 5
      '_bleedDash', '_bleedTelegraph', '_goreDash', '_goreTelegraph',
      '_pounceTelegraph', '_screechTelegraph', '_slimeTelegraph', '_glowTelegraph',
      '_lashTelegraph', '_barrierTelegraph', '_orbTelegraph', '_overchargeTelegraph',
      '_oozeTelegraph', '_rampartTelegraph', '_meltTelegraph',
      '_shadowTeleport', '_puppetTelegraph', '_abyssTelegraph'];
    for (const flag of stuckFlags) {
      if (mobRefPost[flag] && (typeof mobRefPost[flag] === 'number' ? mobRefPost[flag] > 0 : mobRefPost[flag])) {
        result.noStuck = false;
        result.issues.push('Stuck in state: ' + flag);
      }
    }
  }

  // Overall pass/fail
  if (!result.noErrors || !result.noNaN || !result.noStuck) {
    result.pass = false;
  }

  return result;
}

// ===================== LEVEL 2: DEEP TEST =====================
// Detailed per-mob test with frame-by-frame tracking.
window.testMobDeep = function(typeKey, options = {}) {
  const frames = options.frames || 1200;

  _ensureTestArena();
  _clearArena();

  const mt = MOB_TYPES[typeKey];
  if (!mt) return { error: 'Unknown mob type: ' + typeKey };

  // Spawn mob
  const spawnDist = options.spawnDist || 100;
  const mob = createMob(typeKey, player.x + spawnDist, player.y, 1, 1);
  if (!mob) return { error: 'createMob returned null' };
  mobs.push(mob);

  // Fast-track specials
  mob._specialTimer = Math.min(mob._specialTimer, 30);
  if (mob._abilityCDs) {
    for (const key of Object.keys(mob._abilityCDs)) {
      mob._abilityCDs[key] = Math.min(mob._abilityCDs[key], 30);
    }
  }

  const log = {
    type: typeKey,
    name: mt.name,
    frames: frames,
    errors: [],
    specialActivations: 0,
    telegraphsCreated: 0,
    hazardsCreated: 0,
    bulletsCreated: 0,
    statusesApplied: [],
    damageToPlayer: 0,
    mobHpRemaining: 0,
    positionHistory: [],
  };

  // Track telegraphs/hazards via monkey-patching
  let telegraphCount = 0, hazardCount = 0;
  const origTelCreate = typeof TelegraphSystem !== 'undefined' ? TelegraphSystem.create.bind(TelegraphSystem) : null;
  const origHazCreate = typeof HazardSystem !== 'undefined' ? HazardSystem.createZone.bind(HazardSystem) : null;
  if (origTelCreate) {
    TelegraphSystem.create = function(opts) { telegraphCount++; return origTelCreate(opts); };
  }
  if (origHazCreate) {
    HazardSystem.createZone = function(opts) { hazardCount++; return origHazCreate(opts); };
  }

  const initBullets = bullets.length;
  const initHP = player.hp;

  // Run frame-by-frame
  for (let f = 0; f < frames; f++) {
    try {
      updateMobs();
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.update();
      if (typeof HazardSystem !== 'undefined') HazardSystem.update();
      StatusFX.tickPlayer();
      if (typeof updateBullets === 'function') updateBullets();
      gameFrame++;
    } catch (e) {
      log.errors.push({ frame: f, message: e.message });
    }

    // Sample position every 60 frames
    if (f % 60 === 0) {
      const m = mobs.find(mm => mm.id === mob.id);
      if (m) log.positionHistory.push({ frame: f, x: Math.round(m.x), y: Math.round(m.y) });
    }
  }

  // Restore monkey-patched functions
  if (origTelCreate) TelegraphSystem.create = origTelCreate;
  if (origHazCreate) HazardSystem.createZone = origHazCreate;

  // Collect results
  log.telegraphsCreated = telegraphCount;
  log.hazardsCreated = hazardCount;
  log.bulletsCreated = bullets.length - initBullets;
  log.damageToPlayer = initHP - player.hp;
  const mobRef = mobs.find(m => m.id === mob.id);
  log.mobHpRemaining = mobRef ? mobRef.hp : 0;

  // Check statuses applied
  const pe = StatusFX.playerEffects;
  if (pe._slowTimer > 0) log.statusesApplied.push('slow');
  if (pe._rootTimer > 0) log.statusesApplied.push('root');
  if (pe._markTimer > 0) log.statusesApplied.push('mark');
  if (pe._silenceTimer > 0) log.statusesApplied.push('silence');
  if (pe._bleedTimer > 0) log.statusesApplied.push('bleed');
  if (pe._confuseTimer > 0) log.statusesApplied.push('confuse');
  if (pe._disorientTimer > 0) log.statusesApplied.push('disorient');

  // Print report
  console.log(`\n=== DEEP TEST: ${mt.name} (${typeKey}) — ${frames} frames ===`);
  console.log(`  Errors: ${log.errors.length}`);
  console.log(`  Telegraphs: ${log.telegraphsCreated}, Hazards: ${log.hazardsCreated}, Bullets: ${log.bulletsCreated}`);
  console.log(`  Damage to player: ${log.damageToPlayer}`);
  console.log(`  Statuses applied: ${log.statusesApplied.length > 0 ? log.statusesApplied.join(', ') : 'none'}`);
  console.log(`  Mob HP remaining: ${log.mobHpRemaining}`);
  if (log.errors.length > 0) {
    console.log(`  ERRORS:`);
    for (const e of log.errors) console.log(`    Frame ${e.frame}: ${e.message}`);
  }

  _clearArena();
  return log;
};

// ===================== LEVEL 3: BOSS ROTATION TEST =====================
// Verifies all abilities in a boss's rotation fire at least once.
window.testBossRotation = function(bossType) {
  _ensureTestArena();
  _clearArena();

  const mt = MOB_TYPES[bossType];
  if (!mt) return { error: 'Unknown boss type: ' + bossType };
  if (!mt._specials || mt._specials.length <= 1) return { error: bossType + ' is not a multi-special boss' };

  const mob = createMob(bossType, player.x + 100, player.y, 1, 1);
  if (!mob) return { error: 'createMob returned null' };
  mobs.push(mob);

  // Set ALL ability CDs to 0 so they fire ASAP
  if (mob._abilityCDs) {
    for (const key of Object.keys(mob._abilityCDs)) {
      mob._abilityCDs[key] = 0;
    }
  }
  mob._specialTimer = 0;

  // Track which abilities fire
  const firedAbilities = new Set();
  const originalHandlers = {};

  // Wrap each ability handler to track firing
  for (const abilKey of mt._specials) {
    if (MOB_SPECIALS[abilKey]) {
      originalHandlers[abilKey] = MOB_SPECIALS[abilKey];
      MOB_SPECIALS[abilKey] = function(m, ctx) {
        firedAbilities.add(abilKey);
        return originalHandlers[abilKey](m, ctx);
      };
    }
  }

  // Run 2000 frames (33s)
  const frames = 2000;
  const errors = [];
  for (let f = 0; f < frames; f++) {
    try {
      updateMobs();
      if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.update();
      if (typeof HazardSystem !== 'undefined') HazardSystem.update();
      StatusFX.tickPlayer();
      if (typeof updateBullets === 'function') updateBullets();
      gameFrame++;
    } catch (e) {
      errors.push({ frame: f, message: e.message });
    }

    // Reset CDs periodically to speed up testing
    if (f % 120 === 60) {
      const m = mobs.find(mm => mm.id === mob.id);
      if (m && m._abilityCDs) {
        for (const key of Object.keys(m._abilityCDs)) {
          if (m._abilityCDs[key] > 30) m._abilityCDs[key] = 0;
        }
      }
    }

    // Heal player to prevent death
    if (f % 60 === 0) player.hp = player.maxHp;
  }

  // Restore original handlers
  for (const abilKey of Object.keys(originalHandlers)) {
    MOB_SPECIALS[abilKey] = originalHandlers[abilKey];
  }

  const allFired = mt._specials.every(a => firedAbilities.has(a));
  const missing = mt._specials.filter(a => !firedAbilities.has(a));

  console.log(`\n=== BOSS ROTATION TEST: ${mt.name} (${bossType}) ===`);
  console.log(`  Abilities: ${mt._specials.join(', ')}`);
  console.log(`  Fired: ${[...firedAbilities].join(', ')}`);
  console.log(`  Missing: ${missing.length > 0 ? missing.join(', ') : 'NONE'}`);
  console.log(`  Result: ${allFired ? 'ALL PASSED' : 'INCOMPLETE'}`);
  console.log(`  Errors: ${errors.length}`);

  _clearArena();
  return { bossType, abilities: mt._specials, fired: [...firedAbilities], missing, allFired, errors };
};

// ===================== LEVEL 4: REGRESSION SUITE =====================
// Runs batch tests across all implemented floors.
window.testAllMobs = function() {
  console.log('\n========== FULL REGRESSION TEST ==========');
  const allResults = {};
  let totalPassed = 0, totalFailed = 0;

  for (const floorNum of Object.keys(FLOOR_MOBS).map(Number).sort()) {
    const result = window.testAllFloorMobs(floorNum);
    allResults[floorNum] = result;
    totalPassed += result.passed;
    totalFailed += result.failed;
  }

  // Run boss rotation tests
  console.log('\n--- BOSS ROTATION TESTS ---');
  const bossResults = {};
  for (const floorNum of Object.keys(FLOOR_BOSSES).map(Number).sort()) {
    for (const bossType of FLOOR_BOSSES[floorNum]) {
      const result = window.testBossRotation(bossType);
      bossResults[bossType] = result;
    }
  }

  console.log(`\n========== REGRESSION COMPLETE: ${totalPassed} passed, ${totalFailed} failed ==========`);
  return { floors: allResults, bosses: bossResults, totalPassed, totalFailed };
};

console.log('[TestHarness] Loaded. Functions: testAllFloorMobs(floor), testMobDeep(type), testBossRotation(type), testAllMobs()');
