#!/usr/bin/env node
// ===================== COLLISION PARITY VERIFIER =====================
// Simulates the JS collision logic on exported grid data to produce
// expected positions for Unity parity testing.
//
// Usage: node tools/verify_collision_parity.js
//
// Verifies:
//   1. isSolid() matches for border/center/entity tiles
//   2. positionClear() matches at spawn
//   3. Movement trace positions (60 ticks right, 60 up, 60 diagonal, 60 idle)

const fs = require('fs');
const path = require('path');

const TILE = 48;
const PLAYER_BASE_SPEED = 7.5;  // px/frame
const PLAYER_WALL_HW = 14;     // px
const PPU = 48;

// Load exported level data
const dataPath = path.join(__dirname, '..', 'exports', 'data', 'level_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

function runForLevel(levelId) {
  const lv = data.LEVELS[levelId];
  if (!lv) { console.error('Level not found:', levelId); return; }
  if (!lv.collisionGrid) { console.error('No collision grid for:', levelId); return; }

  const grid = lv.collisionGrid; // [row][col], row 0 = top (JS convention)
  const W = lv.widthTiles;
  const H = lv.heightTiles;
  const solidEnts = lv.solidEntities || [];

  console.log(`\n=== ${levelId}: ${W}x${H}, ${solidEnts.length} solid entities ===`);

  // isSolid — exact port of JS sceneManager.js:574-587
  function isSolid(col, row) {
    if (col < 0 || row < 0 || col >= W || row >= H) return true;
    const gridRow = grid[row];
    if (!gridRow) return true;
    if (gridRow[col] === 1) return true;
    for (const e of solidEnts) {
      const w = e.w || 1;
      const h = e.h || 1;
      if (col >= e.tx && col < e.tx + w && row >= e.ty && row < e.ty + h) return true;
    }
    return false;
  }

  // positionClear — exact port of JS mobSystem.js:7-12
  function positionClear(px, py, hw) {
    hw = hw || 10;
    const cL = Math.floor((px - hw) / TILE), cR = Math.floor((px + hw) / TILE);
    const rT = Math.floor((py - hw) / TILE), rB = Math.floor((py + hw) / TILE);
    return !isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB);
  }

  // 1. Sanity checks
  console.log('Border (0,0):', isSolid(0, 0) ? 'SOLID (correct)' : 'OPEN (WRONG)');
  console.log('Border (W-1,H-1):', isSolid(W-1, H-1) ? 'SOLID (correct)' : 'OPEN (WRONG)');
  console.log('Center:', isSolid(Math.floor(W/2), Math.floor(H/2)) ? 'SOLID' : 'OPEN');

  // 2. Spawn check
  const spawn = lv.spawns && lv.spawns.p1;
  if (!spawn) { console.log('No p1 spawn'); return; }

  const spawnPx = spawn.tx * TILE + TILE / 2;
  const spawnPy = spawn.ty * TILE + TILE / 2;
  console.log(`Spawn tile: (${spawn.tx}, ${spawn.ty})`);
  console.log(`Spawn px: (${spawnPx}, ${spawnPy})`);
  console.log(`Spawn WU: (${spawnPx/PPU}, ${spawnPy/PPU})`);
  console.log(`Spawn clear: ${positionClear(spawnPx, spawnPy, PLAYER_WALL_HW)}`);

  // Unity Y conversion:
  // Unity spawn WU = (spawnPx/PPU, (H - spawn.ty - 1) + 0.5) = (spawn.tx + 0.5, H - spawn.ty - 0.5)
  const unitySpawnX = spawn.tx + 0.5;
  const unitySpawnY = H - spawn.ty - 0.5;
  console.log(`Unity spawn WU: (${unitySpawnX}, ${unitySpawnY})`);

  // 3. Movement trace simulation (JS pixel coords)
  let px = spawnPx;
  let py = spawnPy;
  const hw = PLAYER_WALL_HW;

  function tryMove(dx, dy) {
    // Normalize diagonal
    let mx = dx, my = dy;
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) { mx /= len; my /= len; }

    const vx = mx * PLAYER_BASE_SPEED;
    const vy = my * PLAYER_BASE_SPEED;

    const nx = px + vx;
    const ny = py + vy;

    // X collision
    let canMoveX = true;
    {
      const cL = Math.floor((nx - hw) / TILE), cR = Math.floor((nx + hw) / TILE);
      const rT = Math.floor((py - hw) / TILE), rB = Math.floor((py + hw) / TILE);
      if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) {
        canMoveX = false;
      }
    }
    if (canMoveX) px = nx;

    // Y collision
    let canMoveY = true;
    {
      const cL = Math.floor((px - hw) / TILE), cR = Math.floor((px + hw) / TILE);
      const rT = Math.floor((ny - hw) / TILE), rB = Math.floor((ny + hw) / TILE);
      if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) {
        canMoveY = false;
      }
    }
    if (canMoveY) py = ny;
  }

  // Phase 1: 60 ticks right
  for (let i = 0; i < 60; i++) tryMove(1, 0);
  console.log(`After 60 right: JS px=(${px.toFixed(4)}, ${py.toFixed(4)}), WU=(${(px/PPU).toFixed(6)}, ${((H*TILE - py)/PPU).toFixed(6)})`);

  // Phase 2: 60 ticks up (JS: dy=-1)
  for (let i = 0; i < 60; i++) tryMove(0, -1);
  console.log(`After 60 up:    JS px=(${px.toFixed(4)}, ${py.toFixed(4)}), WU=(${(px/PPU).toFixed(6)}, ${((H*TILE - py)/PPU).toFixed(6)})`);

  // Phase 3: 60 ticks diagonal (right + up, JS: dx=1, dy=-1)
  for (let i = 0; i < 60; i++) tryMove(1, -1);
  console.log(`After 60 diag:  JS px=(${px.toFixed(4)}, ${py.toFixed(4)}), WU=(${(px/PPU).toFixed(6)}, ${((H*TILE - py)/PPU).toFixed(6)})`);

  // Phase 4: 60 ticks idle
  for (let i = 0; i < 60; i++) tryMove(0, 0);
  console.log(`After 60 idle:  JS px=(${px.toFixed(4)}, ${py.toFixed(4)}), WU=(${(px/PPU).toFixed(6)}, ${((H*TILE - py)/PPU).toFixed(6)})`);

  // Phase 5: Walk right into wall (250 ticks)
  for (let i = 0; i < 250; i++) tryMove(1, 0);
  console.log(`After 250 right: JS px=(${px.toFixed(4)}, ${py.toFixed(4)}), WU=(${(px/PPU).toFixed(6)}, ${((H*TILE - py)/PPU).toFixed(6)})`);
  console.log(`  Right edge at tile ${Math.floor((px + hw) / TILE)}, wall at tile ${W-1}`);
}

// Run for all parity levels
runForLevel('test_arena');
runForLevel('cave_01');
