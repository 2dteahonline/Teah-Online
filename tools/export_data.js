#!/usr/bin/env node
// ===================== DATA EXPORTER =====================
// Exports JS shared data files as JSON for Unity consumption (Phase 3).
//
// Usage: node tools/export_data.js [output_dir]
// Default output: ./exports/data/
//
// Reads JS files that use `const X = ...` or `window.X = ...` patterns,
// evaluates them in a sandboxed context, and writes the extracted globals
// as pretty-printed JSON files.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- Config ----
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SHARED_DIR = path.join(PROJECT_ROOT, 'js', 'shared');
const OUTPUT_DIR = process.argv[2] || path.join(PROJECT_ROOT, 'exports', 'data');

// ---- Files to export and their output mappings ----
// Order matters: gameConfig (TILE, GAME_CONFIG) must load first since others may reference it.
const EXPORTS = [
  {
    src: 'gameConfig.js',
    out: 'game_config.json',
    globals: ['GAME_CONFIG'],
  },
  {
    src: 'levelData.js',
    out: 'level_data.json',
    globals: ['LEVELS'],
    // Only export level names and dimensions, not full tile data
    transform(data) {
      const result = {};
      const levels = data.LEVELS;
      for (const key of Object.keys(levels)) {
        const lv = levels[key];
        result[key] = {
          id: lv.id,
          widthTiles: lv.widthTiles,
          heightTiles: lv.heightTiles,
          name: lv.name || key,
          spawnX: lv.spawnX,
          spawnY: lv.spawnY,
        };
      }
      return { LEVELS: result };
    },
  },
  {
    src: 'gunData.js',
    out: 'gun_data.json',
    globals: ['MAIN_GUNS', 'WEAPON_PARTS', 'GUN_MATERIALS', 'GUN_UPGRADE_RECIPES'],
  },
  {
    src: 'itemData.js',
    out: 'item_data.json',
    globals: ['ITEM_CATEGORIES', 'PALETTE', 'ITEM_STAT_RENDERERS'],
  },
  {
    src: 'progressionData.js',
    out: 'progression_data.json',
    globals: ['PROGRESSION_CONFIG', 'PROG_ITEMS'],
  },
  {
    src: 'partyData.js',
    out: 'party_data.json',
    globals: ['PARTY_CONFIG'],
  },
  {
    src: 'dungeonRegistry.js',
    out: 'dungeon_registry.json',
    globals: ['DUNGEON_REGISTRY'],
  },
  {
    src: 'mobTypes.js',
    out: 'mob_types.json',
    globals: ['MOB_TYPES'],
  },
];

// ---- Build sandbox context ----
// Fake browser globals that JS files may reference.
function createSandbox() {
  const sandbox = {
    // window and self-reference
    window: {},
    console: console,
    Math: Math,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite,
    Number: Number,
    String: String,
    Array: Array,
    Object: Object,
    JSON: JSON,
    Date: Date,
    Map: Map,
    Set: Set,
    // TILE constant (defined in levelData.js, needed by others)
    TILE: 48,
    // GAME_CONFIG placeholder (will be filled when gameConfig.js loads)
    GAME_CONFIG: null,
  };
  // window.X = ... should write to sandbox
  sandbox.window = sandbox;
  return sandbox;
}

// ---- Main ----
function main() {
  // Ensure output directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sandbox = createSandbox();
  const context = vm.createContext(sandbox);

  let exported = 0;
  let failed = 0;

  for (const entry of EXPORTS) {
    const srcPath = path.join(SHARED_DIR, entry.src);

    if (!fs.existsSync(srcPath)) {
      console.error('[SKIP] ' + entry.src + ' — file not found');
      failed++;
      continue;
    }

    // Read and evaluate the JS file.
    // `const` and `let` in vm.runInContext are script-scoped, NOT context properties.
    // Replace `const ` and `let ` at the top level with `var ` so they land on the context.
    let code = fs.readFileSync(srcPath, 'utf-8');
    code = code.replace(/^(const|let) /gm, 'var ');
    try {
      vm.runInContext(code, context, { filename: entry.src });
    } catch (err) {
      console.error('[ERROR] ' + entry.src + ' — eval failed: ' + err.message);
      failed++;
      continue;
    }

    // Extract the requested globals
    const data = {};
    let allFound = true;
    for (const globalName of entry.globals) {
      if (sandbox[globalName] !== undefined && sandbox[globalName] !== null) {
        data[globalName] = sandbox[globalName];
      } else {
        // Some globals may be optional (not all files define all listed vars)
        console.warn('[WARN] ' + entry.src + ' — global "' + globalName + '" not found, skipping it');
        allFound = false;
      }
    }

    if (Object.keys(data).length === 0) {
      console.error('[SKIP] ' + entry.src + ' — no globals extracted');
      failed++;
      continue;
    }

    // Apply transform if defined
    const output = entry.transform ? entry.transform(data) : data;

    // Write JSON
    const outPath = path.join(OUTPUT_DIR, entry.out);
    try {
      fs.writeFileSync(outPath, JSON.stringify(output, replacer, 2), 'utf-8');
      const stats = fs.statSync(outPath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log('[OK] ' + entry.out + ' (' + sizeKB + ' KB)');
      exported++;
    } catch (err) {
      console.error('[ERROR] ' + entry.out + ' — write failed: ' + err.message);
      failed++;
    }
  }

  console.log('\nDone: ' + exported + ' exported, ' + failed + ' failed.');
  console.log('Output: ' + OUTPUT_DIR);
}

// ---- JSON replacer ----
// Handle functions (skip them) and special values.
function replacer(key, value) {
  if (typeof value === 'function') return undefined;
  if (value === Infinity) return 'Infinity';
  if (value === -Infinity) return '-Infinity';
  if (typeof value === 'number' && isNaN(value)) return 'NaN';
  return value;
}

main();
