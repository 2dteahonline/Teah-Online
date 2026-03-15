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
    upgradeMaterials: ['storm_capacitor', 'wind_crystal'],
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
    upgradeMaterials: ['heavy_barrel_liner', 'blast_powder'],
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
    upgradeMaterials: ['scatter_core', 'gunpowder_charge', 'buckshot_mold'],
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
    upgradeMaterials: ['ironwood_limb', 'sinew_string', 'fletching_kit'],
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
    upgradeMaterials: ['volt_coil', 'plasma_cell'],
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

// ---- WEAPON PARTS ----
// Shared at Common/Uncommon tiers, category-specific at Rare+ tiers.
const WEAPON_PARTS = {
  // Shared (all categories use these at T0-T1)
  common_weapon_parts:   { id: 'common_weapon_parts',   name: 'Common Weapon Parts',   tier: 1, color: '#888',    desc: 'Basic weapon components. Drops from dungeon mobs.' },
  uncommon_weapon_parts: { id: 'uncommon_weapon_parts', name: 'Uncommon Weapon Parts', tier: 2, color: '#5fca80', desc: 'Quality weapon components. Drops from dungeon mobs.' },
  // Legacy generic entries (backward compat for existing inventory items)
  rare_weapon_parts:     { id: 'rare_weapon_parts',     name: 'Rare Weapon Parts',     tier: 3, color: '#4a9eff', desc: 'Precision weapon components. Drops from dungeon mobs.' },
  epic_weapon_parts:     { id: 'epic_weapon_parts',     name: 'Epic Weapon Parts',     tier: 4, color: '#ff9a40', desc: 'Masterwork weapon components. Drops from dungeon mobs.' },
  legendary_weapon_parts:{ id: 'legendary_weapon_parts',name: 'Legendary Weapon Parts', tier: 5, color: '#ff4a8a', desc: 'Supreme weapon components. Drops from the hardest dungeons.' },
  // Gun-specific (T2+)
  rare_gun_parts:        { id: 'rare_gun_parts',        name: 'Rare Gun Parts',        tier: 3, color: '#4a9eff', desc: 'Precision gun components. Drops from dungeon mobs.' },
  epic_gun_parts:        { id: 'epic_gun_parts',        name: 'Epic Gun Parts',        tier: 4, color: '#ff9a40', desc: 'Masterwork gun components. Drops from dungeon mobs.' },
  legendary_gun_parts:   { id: 'legendary_gun_parts',   name: 'Legendary Gun Parts',   tier: 5, color: '#ff4a8a', desc: 'Supreme gun components. Drops from the hardest dungeons.' },
  // Rod-specific (T2+)
  rare_rod_parts:        { id: 'rare_rod_parts',        name: 'Rare Rod Parts',        tier: 3, color: '#4a9eff', desc: 'Precision rod components. Drops from fishing challenges.' },
  epic_rod_parts:        { id: 'epic_rod_parts',        name: 'Epic Rod Parts',        tier: 4, color: '#ff9a40', desc: 'Masterwork rod components. Drops from fishing challenges.' },
  legendary_rod_parts:   { id: 'legendary_rod_parts',   name: 'Legendary Rod Parts',   tier: 5, color: '#ff4a8a', desc: 'Supreme rod components. Drops from the hardest fishing.' },
  // Pick-specific (T2+)
  rare_pick_parts:       { id: 'rare_pick_parts',       name: 'Rare Pick Parts',       tier: 3, color: '#4a9eff', desc: 'Precision pick components. Drops from deep mine veins.' },
  epic_pick_parts:       { id: 'epic_pick_parts',       name: 'Epic Pick Parts',       tier: 4, color: '#ff9a40', desc: 'Masterwork pick components. Drops from deep mine veins.' },
  legendary_pick_parts:  { id: 'legendary_pick_parts',  name: 'Legendary Pick Parts',  tier: 5, color: '#ff4a8a', desc: 'Supreme pick components. Drops from the deepest mines.' },
};

// ---- GUN-SPECIFIC UPGRADE MATERIALS ----
// Unique crafting materials per gun — adds identity to upgrade paths.
const GUN_MATERIALS = {
  storm_capacitor:    { id: 'storm_capacitor',    name: 'Storm Capacitor',    gun: 'storm_ar',     color: '#66ccff', desc: 'Charged capacitor from lightning elementals.' },
  wind_crystal:       { id: 'wind_crystal',       name: 'Wind Crystal',       gun: 'storm_ar',     color: '#aaddff', desc: 'Crystallized wind essence.' },
  heavy_barrel_liner: { id: 'heavy_barrel_liner', name: 'Heavy Barrel Liner', gun: 'heavy_ar',     color: '#ff9944', desc: 'Reinforced barrel component for heavy weapons.' },
  blast_powder:       { id: 'blast_powder',       name: 'Blast Powder',       gun: 'heavy_ar',     color: '#ffbb77', desc: 'Volatile propellant for high-caliber rounds.' },
  scatter_core:       { id: 'scatter_core',       name: 'Scatter Core',       gun: 'boomstick',    color: '#ffcc33', desc: 'Pellet dispersion mechanism.' },
  gunpowder_charge:   { id: 'gunpowder_charge',   name: 'Gunpowder Charge',   gun: 'boomstick',    color: '#ffdd77', desc: 'Concentrated explosive charge.' },
  buckshot_mold:      { id: 'buckshot_mold',      name: 'Buckshot Mold',      gun: 'boomstick',    color: '#e6b800', desc: 'Precision mold for buckshot pellets.' },
  ironwood_limb:      { id: 'ironwood_limb',      name: 'Ironwood Limb',      gun: 'ironwood_bow', color: '#8b5e3c', desc: 'Flexible ironwood bow limb.' },
  sinew_string:       { id: 'sinew_string',       name: 'Sinew String',       gun: 'ironwood_bow', color: '#a07050', desc: 'Tough sinew bowstring.' },
  fletching_kit:      { id: 'fletching_kit',      name: 'Fletching Kit',      gun: 'ironwood_bow', color: '#6b4e2c', desc: 'Arrow-crafting supplies.' },
  volt_coil:          { id: 'volt_coil',          name: 'Volt Coil',          gun: 'volt_9',       color: '#aa66ff', desc: 'Electromagnetic coil from electric mobs.' },
  plasma_cell:        { id: 'plasma_cell',        name: 'Plasma Cell',        gun: 'volt_9',       color: '#cc99ff', desc: 'Supercharged plasma energy cell.' },
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
  'rare_gun_parts', 'epic_gun_parts', 'legendary_gun_parts'
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
