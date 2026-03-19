/**
 * Browser-side validation: paste this into the game console while in spar.
 * Compares the Python sim's collision/hit detection against the real JS engine.
 *
 * Usage:
 *   1. Run `python validate_sim.py` to generate test_cases.json
 *   2. Open the game in browser, enter spar hub
 *   3. Paste this script into the console
 *   4. Call: validateSparSim()
 *      (it will fetch test_cases.json from the training folder)
 */

async function validateSparSim() {
  // Load test cases — adjust path if needed
  let testData;
  try {
    const resp = await fetch('training/test_cases.json');
    testData = await resp.json();
  } catch (e) {
    console.error('Failed to load test_cases.json:', e);
    console.log('Make sure you ran: python training/validate_sim.py');
    return;
  }

  let total = 0, passed = 0, failed = 0;

  // --- Test 1: isSolid ---
  console.log('=== Collision Grid Tests ===');
  for (const t of testData.collision_grid) {
    const match = t.test.match(/isSolid\((-?\d+),(-?\d+)\)/);
    if (!match) continue;
    const col = parseInt(match[1]), row = parseInt(match[2]);

    // Use the real game's isSolid (requires being in a spar level)
    const jsResult = typeof isSolid === 'function' ? isSolid(col, row) : null;
    total++;

    if (jsResult === null) {
      console.warn(`  SKIP: isSolid not available (not in spar arena)`);
    } else if (jsResult === t.expected) {
      passed++;
    } else {
      failed++;
      console.error(`  FAIL: ${t.label} — JS=${jsResult}, Python=${t.actual}, expected=${t.expected}`);
    }
  }

  // --- Test 2: positionClear ---
  console.log('=== Position Clear Tests ===');
  for (const t of testData.position_clear) {
    const match = t.test.match(/positionClear\((\d+),(\d+),(\d+)\)/);
    if (!match) continue;
    const px = parseInt(match[1]), py = parseInt(match[2]), hw = parseInt(match[3]);

    const jsResult = typeof positionClear === 'function' ? positionClear(px, py, hw) : null;
    total++;

    if (jsResult === null) {
      console.warn(`  SKIP: positionClear not available`);
    } else if (jsResult === t.expected) {
      passed++;
    } else {
      failed++;
      console.error(`  FAIL: ${t.label} — JS=${jsResult}, Python=${t.actual}, expected=${t.expected}`);
    }
  }

  // --- Test 3: Bullet hit detection ---
  console.log('=== Bullet Hit Tests ===');
  if (typeof _bulletHitsCircle === 'function' || typeof GAME_CONFIG !== 'undefined') {
    for (const t of testData.bullet_hit) {
      // Use the real hit test function
      let jsResult;
      if (typeof _bulletHitsCircle === 'function') {
        jsResult = _bulletHitsCircle(t.bx, t.by, t.bvx, t.bvy, t.ex, t.ey + (GAME_CONFIG.PLAYER_HITBOX_Y || -25), GAME_CONFIG.ENTITY_R || 29);
      } else {
        console.warn('  SKIP: _bulletHitsCircle not available');
        continue;
      }

      total++;
      if (jsResult === t.expected) {
        passed++;
      } else {
        failed++;
        console.error(`  FAIL: ${t.test} — JS=${jsResult}, Python=${t.actual}, expected=${t.expected}`);
      }
    }
  }

  // --- Summary ---
  console.log(`\n=== VALIDATION SUMMARY ===`);
  console.log(`  Total: ${total}, Passed: ${passed}, Failed: ${failed}`);
  if (failed === 0) {
    console.log(`  ✓ Python sim matches JS engine on all tests`);
  } else {
    console.log(`  ✗ ${failed} mismatches found — fix Python sim before training`);
  }

  return { total, passed, failed };
}

// Auto-run hint
console.log('[SparSim Validator] Loaded. Run validateSparSim() to test.');
