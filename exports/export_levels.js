/**
 * export_levels.js — Extract LEVELS from levelData.js and write Unity-ready JSON.
 * Output format is compatible with Unity's JsonUtility (no Dictionaries, no jagged arrays).
 *
 * Usage:  node exports/export_levels.js
 * Output: C:\Users\jeff\Desktop\Unity Proj\TeahOnline\Assets\StreamingAssets\LevelData.json
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'js', 'shared', 'levelData.js');
const OUT_DIR = path.join('C:', 'Users', 'jeff', 'Desktop', 'Unity Proj', 'TeahOnline', 'Assets', 'StreamingAssets');
const OUT_FILE = path.join(OUT_DIR, 'LevelData.json');

const src = fs.readFileSync(SRC, 'utf8');

const wrapped = `
(function() {
  ${src}
  return LEVELS;
})()
`;

let LEVELS;
try {
  LEVELS = eval(wrapped);
} catch (e) {
  console.error('Failed to eval levelData.js:', e.message);
  process.exit(1);
}

const FLAG_KEYS = [
  'isLobby', 'isCave', 'isFarm', 'isAzurine', 'isMine', 'isCooking',
  'isTestArena', 'isGunsmith', 'isHideSeek', 'isSkeld', 'isMafiaLobby',
  'isVortalis', 'isEarth205', 'isWagashi', 'isEarth216', 'isCasino',
  'isSpar', 'isSparArena'
];

const output = { levelList: [] };
let count = 0;

for (const [id, level] of Object.entries(LEVELS)) {
  const flags = {};
  for (const key of FLAG_KEYS) {
    if (level[key]) flags[key] = true;
  }

  // Collision grid — parse from ASCII if needed
  let collision2d;
  if (level.collision && Array.isArray(level.collision)) {
    collision2d = level.collision;
  } else if (level.collisionAscii && Array.isArray(level.collisionAscii)) {
    collision2d = level.collisionAscii.map(row =>
      row.split('').map(ch => (ch === '#' || ch === '@' ? 1 : 0))
    );
  } else {
    console.warn(`  [WARN] ${id}: no collision data found`);
    collision2d = [];
  }

  // Flatten collision to 1D array (row-major: row0col0, row0col1, ..., row1col0, ...)
  const collisionFlat = [];
  for (const row of collision2d) {
    for (const cell of row) {
      collisionFlat.push(cell);
    }
  }

  // Spawns — extract p1 spawn (primary), p2 if exists
  const spawns = level.spawns || {};
  const spawnP1TX = spawns.p1 ? spawns.p1.tx : 0;
  const spawnP1TY = spawns.p1 ? spawns.p1.ty : 0;
  const spawnP2TX = spawns.p2 ? spawns.p2.tx : -1;
  const spawnP2TY = spawns.p2 ? spawns.p2.ty : -1;

  // Entities — normalize fields to ensure all keys exist
  const entities = (level.entities || []).map(e => ({
    type: e.type || '',
    tx: e.tx || 0,
    ty: e.ty || 0,
    w: e.w || 0,
    h: e.h || 0,
    solid: !!e.solid,
    target: e.target || '',
    spawnTX: e.spawnTX || 0,
    spawnTY: e.spawnTY || 0,
    variant: e.variant || 0,
    dir: e.dir || 0,
    dungeonType: e.dungeonType || '',
    floorStart: e.floorStart || 0,
  }));

  output.levelList.push({
    id: level.id || id,
    widthTiles: level.widthTiles || (collision2d[0] ? collision2d[0].length : 0),
    heightTiles: level.heightTiles || collision2d.length,
    flags,
    spawnP1TX, spawnP1TY,
    spawnP2TX, spawnP2TY,
    collisionFlat,
    entities
  });
  count++;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify(output, null, 2);
fs.writeFileSync(OUT_FILE, json, 'utf8');

const sizeKB = (Buffer.byteLength(json, 'utf8') / 1024).toFixed(1);
console.log(`Exported ${count} levels to ${OUT_FILE}`);
console.log(`File size: ${sizeKB} KB`);
