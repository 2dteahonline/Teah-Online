// ===================== MAIN GUN DATA =====================
// 5 permanent progression guns: Storm AR, Heavy AR, Boomstick, Ironwood Bow, Volt-9
// Bought from the Gunsmith, leveled 1-25, each with unique shooting mechanics.
// These exist ALONGSIDE the existing dungeon shop guns (Pistol, CT-X, SMG, etc).

// ---- MAIN GUN DEFINITIONS ----
// base = stats at level 1, max = stats at level 25
// Linear interpolation: stat(level) = Math.round(base + (max - base) * (level - 1) / 24)

const MAIN_GUNS = {
  storm_ar: {
    id: 'storm_ar',
    name: 'Storm AR',
    type: 'gun',
    category: 'assault_rifle',
    desc: 'Fast, reliable full-auto workhorse',
    buyPrice: 200,
    bulletColor: { main: '#66ccff', core: '#aaddff', glow: 'rgba(102,204,255,0.2)' },
    base: { damage: 25, fireRate: 6, magSize: 32, reloadSpeed: 50 },
    max:  { damage: 85, fireRate: 3, magSize: 55, reloadSpeed: 30 },
  },

  heavy_ar: {
    id: 'heavy_ar',
    name: 'Heavy AR',
    type: 'gun',
    category: 'assault_rifle',
    desc: 'Slow but hits hard, chunky feel',
    buyPrice: 300,
    bulletColor: { main: '#ff9944', core: '#ffbb77', glow: 'rgba(255,153,68,0.2)' },
    base: { damage: 45, fireRate: 12, magSize: 24, reloadSpeed: 60 },
    max:  { damage: 140, fireRate: 7, magSize: 40, reloadSpeed: 35 },
  },

  boomstick: {
    id: 'boomstick',
    name: 'Boomstick',
    type: 'gun',
    category: 'shotgun',
    desc: 'Close-range devastator, tight pellet cluster',
    buyPrice: 350,
    bulletColor: { main: '#ffcc33', core: '#ffdd77', glow: 'rgba(255,204,51,0.25)' },
    base: { damage: 18, fireRate: 20, magSize: 6,  reloadSpeed: 70, pellets: 3, spread: 15, maxRange: 200 },
    max:  { damage: 45, fireRate: 14, magSize: 12, reloadSpeed: 45, pellets: 5, spread: 12, maxRange: 200 },
  },

  ironwood_bow: {
    id: 'ironwood_bow',
    name: 'Ironwood Bow',
    type: 'gun',
    category: 'bow',
    desc: 'Hard-hitting arrows that pierce through mobs',
    buyPrice: 400,
    bulletColor: { main: '#8b5e3c', core: '#a07050', glow: 'rgba(139,94,60,0.2)' },
    base: { damage: 60, fireRate: 18, magSize: 12, reloadSpeed: 90, pierceCount: 1 },
    max:  { damage: 200, fireRate: 10, magSize: 20, reloadSpeed: 50, pierceCount: 3 },
    // Special flags — always present at all levels
    flags: { pierce: true, isArrow: true },
  },

  volt_9: {
    id: 'volt_9',
    name: 'Volt-9',
    type: 'gun',
    category: 'smg',
    desc: 'Bullet hose, very fast, slight random spread',
    buyPrice: 250,
    bulletColor: { main: '#aa66ff', core: '#cc99ff', glow: 'rgba(170,102,255,0.2)' },
    base: { damage: 12, fireRate: 3, magSize: 50, reloadSpeed: 55, spread: 8 },
    max:  { damage: 35, fireRate: 2, magSize: 80, reloadSpeed: 30, spread: 5 },
  },
};

// ---- STAT INTERPOLATION ----
// Returns computed stats for a gun at a given level (1-25).
// Merges base/max via linear interpolation + applies permanent flags.
function getGunStatsAtLevel(gunId, level) {
  const def = MAIN_GUNS[gunId];
  if (!def) return null;
  level = Math.max(1, Math.min(25, level));
  const t = (level - 1) / 24; // 0 at L1, 1 at L25

  const stats = { id: gunId, name: def.name, tier: 0 };

  // Interpolate all numeric base/max fields
  const allKeys = new Set([...Object.keys(def.base), ...Object.keys(def.max)]);
  for (const key of allKeys) {
    const b = def.base[key];
    const m = def.max[key];
    if (b !== undefined && m !== undefined) {
      stats[key] = Math.round(b + (m - b) * t);
    } else if (b !== undefined) {
      stats[key] = b; // no max defined → stays constant
    } else if (m !== undefined) {
      stats[key] = m;
    }
  }

  // Apply permanent flags (pierce, neverReload, isArrow, etc.)
  if (def.flags) {
    for (const key in def.flags) {
      stats[key] = def.flags[key];
    }
  }

  // Attach bullet color reference
  stats.bulletColor = def.bulletColor;

  return stats;
}

// ---- PLACEHOLDER WEAPON PARTS ----
// These will eventually drop from dungeon mobs. For now they're just data definitions.
const WEAPON_PARTS = {
  common_weapon_parts:   { id: 'common_weapon_parts',   name: 'Common Weapon Parts',   tier: 1, color: '#888',    desc: 'Basic gun components. Drops from dungeon mobs.' },
  uncommon_weapon_parts: { id: 'uncommon_weapon_parts', name: 'Uncommon Weapon Parts', tier: 2, color: '#5fca80', desc: 'Quality gun components. Drops from dungeon mobs.' },
  rare_weapon_parts:     { id: 'rare_weapon_parts',     name: 'Rare Weapon Parts',     tier: 3, color: '#4a9eff', desc: 'Precision gun components. Drops from dungeon mobs.' },
  epic_weapon_parts:     { id: 'epic_weapon_parts',     name: 'Epic Weapon Parts',     tier: 4, color: '#ff9a40', desc: 'Masterwork gun components. Drops from dungeon mobs.' },
};

// ---- UPGRADE RECIPES ----
// Per-level upgrade costs. Level N requires these materials to go from N-1 → N.
// Level 1 is the base (buy price), so recipes start at level 2.
//
// Cost brackets (matching mine rooms):
//   L2-6:   Coal/Copper/Iron + gold (50-150g) + Common Weapon Parts
//   L7-13:  Steel/Gold/Amethyst + gold (200-500g) + Uncommon Weapon Parts
//   L14-19: Ruby/Diamond/Emerald + gold (600-1200g) + Rare Weapon Parts
//   L20-25: Titanium/Mythril/Celestium + gold (1500-3000g) + Epic Weapon Parts

// Tier-aware upgrade recipe builder. Each tier has 25 levels.
// Tier multiplier scales costs so higher tiers cost proportionally more.
const _TIER_COST_MULT = [1, 2.5, 5, 10, 20]; // T0=1x, T1=2.5x, etc.
const _TIER_PART_KEYS = [
  'common_weapon_parts', 'uncommon_weapon_parts',
  'rare_weapon_parts', 'epic_weapon_parts', 'legendary_weapon_parts'
];

function _buildUpgradeRecipes() {
  const recipes = {};
  for (const gunId in MAIN_GUNS) {
    recipes[gunId] = {};
    // Build for all 5 tiers (0-4), levels 2-25 each
    for (let t = 0; t < 5; t++) {
      if (!recipes[gunId][t]) recipes[gunId][t] = {};
      const mult = _TIER_COST_MULT[t];
      const partKey = _TIER_PART_KEYS[Math.min(t, _TIER_PART_KEYS.length - 1)];
      for (let lvl = 2; lvl <= 25; lvl++) {
        let baseGold, ores;

        if (lvl <= 6) {
          baseGold = 50 + (lvl - 2) * 25;
          const oreAmount = lvl - 1;
          if (lvl <= 3)      ores = { coal: oreAmount };
          else if (lvl <= 5) ores = { copper: oreAmount };
          else               ores = { iron: oreAmount };
        }
        else if (lvl <= 13) {
          baseGold = 200 + (lvl - 7) * 50;
          const oreAmount = lvl - 4;
          if (lvl <= 9)       ores = { steel: oreAmount };
          else if (lvl <= 11) ores = { gold_ore: oreAmount };
          else                ores = { amethyst: oreAmount };
        }
        else if (lvl <= 19) {
          baseGold = 600 + (lvl - 14) * 120;
          const oreAmount = lvl - 8;
          if (lvl <= 15)      ores = { ruby: oreAmount };
          else if (lvl <= 17) ores = { diamond: oreAmount };
          else                ores = { emerald: oreAmount };
        }
        else {
          baseGold = 1500 + (lvl - 20) * 300;
          const oreAmount = lvl - 12;
          if (lvl <= 21)      ores = { titanium: oreAmount };
          else if (lvl <= 23) ores = { mythril: oreAmount };
          else                ores = { celestium: oreAmount };
        }

        const goldCost = Math.round(baseGold * mult);
        const parts = {};
        parts[partKey] = Math.ceil((lvl - 1) / 2);

        recipes[gunId][t][lvl] = { gold: goldCost, ores, parts };
      }
    }
  }
  return recipes;
}

const GUN_UPGRADE_RECIPES = _buildUpgradeRecipes();

// DEPRECATED: use getProgUpgradeRecipe() from progressionData.js
function getUpgradeRecipe(gunId, tier, toLevel) {
  if (typeof getProgUpgradeRecipe === 'function') return getProgUpgradeRecipe(gunId, tier, toLevel);
  if (!GUN_UPGRADE_RECIPES[gunId]) return null;
  if (!GUN_UPGRADE_RECIPES[gunId][tier]) return null;
  return GUN_UPGRADE_RECIPES[gunId][tier][toLevel] || null;
}

// ---- HELPERS ----
// Get all main gun IDs as array
function getMainGunIds() {
  return Object.keys(MAIN_GUNS);
}

// Get display description for a gun at a tier+level
function getGunLevelDesc(gunId, tierOrLevel, level) {
  let tier, lvl;
  if (level !== undefined) { tier = tierOrLevel; lvl = level; }
  else { tier = 0; lvl = tierOrLevel; }
  const stats = (typeof getProgressedStats === 'function' && typeof PROG_ITEMS !== 'undefined')
    ? getProgressedStats(gunId, tier, lvl)
    : getGunStatsAtLevel(gunId, lvl);
  if (!stats) return '';
  let desc = stats.damage + ' dmg';
  if (stats.pellets) desc += ' x' + stats.pellets + ' pellets';
  if (stats.magSize) desc += ' · ' + stats.magSize + ' mag';
  if (stats.pierce) desc += ' · Pierce ' + (stats.pierceCount + 1) + ' mobs';
  if (stats.spread && !stats.pellets) desc += ' · ' + stats.spread + '° spread';
  if (stats.neverReload) desc += ' · No reload';
  return desc;
}
