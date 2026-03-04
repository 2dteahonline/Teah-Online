// ===================== UNIFIED PROGRESSION SYSTEM =====================
// 5 tiers (0-4) × 25 levels each = 125 total power steps.
// Tier names: Common, Uncommon, Rare, Epic, Legendary.
// Within a tier: linear interpolation from base to max (level 1-25).
// Between tiers: base[N+1] >= max[N] (no power loss on evolution).
// Applies to: main guns, fishing rods, farming hoes, pickaxes.
// Session-scoped items (dungeon shop guns, armor, melee) are NOT in this system.

// ---- CONFIGURATION ----
const PROGRESSION_CONFIG = {
  TIERS: 5,              // 0..4
  LEVELS_PER_TIER: 25,   // 1..25
  TIER_NAMES: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
  TIER_COLORS: ['#888', '#5fca80', '#4a9eff', '#ff9a40', '#ff4a8a'],
};

// ---- PROG_ITEMS REGISTRY ----
// Each item defines: id, name, category, type, desc, and per-tier base/max stats.
// T0 = current game values (backward compatible).
// T1-T4 = scaled projections (tunable).
// Constraint: tier[N+1].base >= tier[N].max for ascending stats (damage, magSize, etc.)
// Constraint: tier[N+1].base <= tier[N].max for descending stats (fireRate, reloadSpeed, cooldown)
const PROG_ITEMS = {

  // ========== MAIN GUNS ==========

  storm_ar: {
    id: 'storm_ar',
    name: 'Storm AR',
    category: 'main_gun',
    type: 'gun',
    subtype: 'assault_rifle',
    desc: 'Fast, reliable full-auto workhorse',
    buyPrice: 200,
    bulletColor: { main: '#66ccff', core: '#aaddff', glow: 'rgba(102,204,255,0.2)' },
    flags: {},
    tiers: [
      // T0 Common — current L1-25 (exact match to MAIN_GUNS)
      { base: { damage: 25,  fireRate: 6,  magSize: 32, reloadSpeed: 50 },
        max:  { damage: 85,  fireRate: 3,  magSize: 55, reloadSpeed: 30 } },
      // T1 Uncommon
      { base: { damage: 88,  fireRate: 3,  magSize: 56, reloadSpeed: 29 },
        max:  { damage: 150, fireRate: 2,  magSize: 72, reloadSpeed: 22 } },
      // T2 Rare
      { base: { damage: 155, fireRate: 2,  magSize: 73, reloadSpeed: 21 },
        max:  { damage: 240, fireRate: 2,  magSize: 90, reloadSpeed: 16 } },
      // T3 Epic
      { base: { damage: 248, fireRate: 2,  magSize: 91, reloadSpeed: 15 },
        max:  { damage: 360, fireRate: 1,  magSize: 110, reloadSpeed: 12 } },
      // T4 Legendary
      { base: { damage: 372, fireRate: 1,  magSize: 112, reloadSpeed: 11 },
        max:  { damage: 500, fireRate: 1,  magSize: 130, reloadSpeed: 8 } },
    ],
  },

  heavy_ar: {
    id: 'heavy_ar',
    name: 'Heavy AR',
    category: 'main_gun',
    type: 'gun',
    subtype: 'assault_rifle',
    desc: 'Slow but hits hard, chunky feel',
    buyPrice: 300,
    bulletColor: { main: '#ff9944', core: '#ffbb77', glow: 'rgba(255,153,68,0.2)' },
    flags: {},
    tiers: [
      // T0 Common — exact match
      { base: { damage: 45,  fireRate: 12, magSize: 24, reloadSpeed: 60 },
        max:  { damage: 140, fireRate: 7,  magSize: 40, reloadSpeed: 35 } },
      // T1 Uncommon
      { base: { damage: 145, fireRate: 7,  magSize: 41, reloadSpeed: 34 },
        max:  { damage: 230, fireRate: 5,  magSize: 55, reloadSpeed: 26 } },
      // T2 Rare
      { base: { damage: 238, fireRate: 5,  magSize: 56, reloadSpeed: 25 },
        max:  { damage: 350, fireRate: 4,  magSize: 70, reloadSpeed: 20 } },
      // T3 Epic
      { base: { damage: 362, fireRate: 4,  magSize: 71, reloadSpeed: 19 },
        max:  { damage: 500, fireRate: 3,  magSize: 85, reloadSpeed: 15 } },
      // T4 Legendary
      { base: { damage: 516, fireRate: 3,  magSize: 86, reloadSpeed: 14 },
        max:  { damage: 700, fireRate: 2,  magSize: 100, reloadSpeed: 10 } },
    ],
  },

  boomstick: {
    id: 'boomstick',
    name: 'Boomstick',
    category: 'main_gun',
    type: 'gun',
    subtype: 'shotgun',
    desc: 'Close-range devastator, tight pellet cluster',
    buyPrice: 350,
    bulletColor: { main: '#ffcc33', core: '#ffdd77', glow: 'rgba(255,204,51,0.25)' },
    flags: {},
    tiers: [
      // T0 Common — exact match
      { base: { damage: 18,  fireRate: 20, magSize: 6,  reloadSpeed: 70, pellets: 3, spread: 15, maxRange: 200 },
        max:  { damage: 45,  fireRate: 14, magSize: 12, reloadSpeed: 45, pellets: 5, spread: 12, maxRange: 200 } },
      // T1 Uncommon
      { base: { damage: 47,  fireRate: 14, magSize: 13, reloadSpeed: 44, pellets: 5, spread: 12, maxRange: 220 },
        max:  { damage: 75,  fireRate: 11, magSize: 18, reloadSpeed: 35, pellets: 6, spread: 10, maxRange: 220 } },
      // T2 Rare
      { base: { damage: 78,  fireRate: 11, magSize: 19, reloadSpeed: 34, pellets: 6, spread: 10, maxRange: 240 },
        max:  { damage: 120, fireRate: 9,  magSize: 24, reloadSpeed: 28, pellets: 7, spread: 8,  maxRange: 240 } },
      // T3 Epic
      { base: { damage: 124, fireRate: 9,  magSize: 25, reloadSpeed: 27, pellets: 7, spread: 8,  maxRange: 260 },
        max:  { damage: 180, fireRate: 7,  magSize: 30, reloadSpeed: 22, pellets: 8, spread: 6,  maxRange: 260 } },
      // T4 Legendary
      { base: { damage: 186, fireRate: 7,  magSize: 31, reloadSpeed: 21, pellets: 8, spread: 6,  maxRange: 280 },
        max:  { damage: 260, fireRate: 5,  magSize: 36, reloadSpeed: 16, pellets: 10, spread: 5, maxRange: 280 } },
    ],
  },

  ironwood_bow: {
    id: 'ironwood_bow',
    name: 'Ironwood Bow',
    category: 'main_gun',
    type: 'gun',
    subtype: 'bow',
    desc: 'Hard-hitting arrows that pierce through mobs',
    buyPrice: 400,
    bulletColor: { main: '#8b5e3c', core: '#a07050', glow: 'rgba(139,94,60,0.2)' },
    flags: { pierce: true, isArrow: true },
    tiers: [
      // T0 Common — exact match (bulletSpeed removed in projectile unification)
      { base: { damage: 60,  fireRate: 18, magSize: 12, reloadSpeed: 90, pierceCount: 1 },
        max:  { damage: 200, fireRate: 10, magSize: 20, reloadSpeed: 50, pierceCount: 3 } },
      // T1 Uncommon
      { base: { damage: 206, fireRate: 10, magSize: 21, reloadSpeed: 49, pierceCount: 3 },
        max:  { damage: 340, fireRate: 7,  magSize: 28, reloadSpeed: 38, pierceCount: 4 } },
      // T2 Rare
      { base: { damage: 351, fireRate: 7,  magSize: 29, reloadSpeed: 37, pierceCount: 4 },
        max:  { damage: 500, fireRate: 5,  magSize: 35, reloadSpeed: 28, pierceCount: 5 } },
      // T3 Epic
      { base: { damage: 516, fireRate: 5,  magSize: 36, reloadSpeed: 27, pierceCount: 5 },
        max:  { damage: 700, fireRate: 4,  magSize: 42, reloadSpeed: 20, pierceCount: 6 } },
      // T4 Legendary
      { base: { damage: 722, fireRate: 4,  magSize: 43, reloadSpeed: 19, pierceCount: 6 },
        max:  { damage: 950, fireRate: 3,  magSize: 50, reloadSpeed: 14, pierceCount: 8 } },
    ],
  },

  volt_9: {
    id: 'volt_9',
    name: 'Volt-9',
    category: 'main_gun',
    type: 'gun',
    subtype: 'smg',
    desc: 'Bullet hose, very fast, slight random spread',
    buyPrice: 250,
    bulletColor: { main: '#aa66ff', core: '#cc99ff', glow: 'rgba(170,102,255,0.2)' },
    flags: {},
    tiers: [
      // T0 Common — exact match
      { base: { damage: 12, fireRate: 3, magSize: 50, reloadSpeed: 55, spread: 8 },
        max:  { damage: 35, fireRate: 2, magSize: 80, reloadSpeed: 30, spread: 5 } },
      // T1 Uncommon
      { base: { damage: 36,  fireRate: 2, magSize: 82,  reloadSpeed: 29, spread: 5 },
        max:  { damage: 58,  fireRate: 2, magSize: 110, reloadSpeed: 22, spread: 4 } },
      // T2 Rare
      { base: { damage: 60,  fireRate: 2, magSize: 112, reloadSpeed: 21, spread: 4 },
        max:  { damage: 90,  fireRate: 1, magSize: 140, reloadSpeed: 16, spread: 3 } },
      // T3 Epic
      { base: { damage: 93,  fireRate: 1, magSize: 142, reloadSpeed: 15, spread: 3 },
        max:  { damage: 135, fireRate: 1, magSize: 170, reloadSpeed: 12, spread: 2 } },
      // T4 Legendary
      { base: { damage: 140, fireRate: 1, magSize: 172, reloadSpeed: 11, spread: 2 },
        max:  { damage: 200, fireRate: 1, magSize: 200, reloadSpeed: 8,  spread: 1 } },
    ],
  },

  // ========== FISHING RODS (Phase 5 — definitions added later) ==========
  // bronze_rod, iron_rod, gold_rod, mythic_rod

  // ========== FARMING HOES (Phase 6 — definitions added later) ==========
  // bronze_hoe, iron_hoe, gold_hoe, mythic_hoe

  // ========== PICKAXES (Phase 7 — definitions added later) ==========
  // pickaxe, copper_pickaxe, iron_pickaxe, gold_pickaxe,
  // amethyst_pickaxe, ruby_pickaxe, diamond_pickaxe, emerald_pickaxe
};


// ---- STAT INTERPOLATION ----
// Universal stat calculator. Returns computed stats for any PROG_ITEM at tier+level.
// Same formula as getGunStatsAtLevel() — linear interpolation within tier.
function getProgressedStats(itemId, tier, level) {
  const def = PROG_ITEMS[itemId];
  if (!def) return null;

  tier = Math.max(0, Math.min(PROGRESSION_CONFIG.TIERS - 1, tier));
  level = Math.max(1, Math.min(PROGRESSION_CONFIG.LEVELS_PER_TIER, level));

  const tierDef = def.tiers[tier];
  if (!tierDef) return null;

  const t = (level - 1) / 24; // 0 at L1, 1 at L25 (matches existing formula)

  const stats = {
    id: itemId,
    name: def.name,
    tier: tier,
    level: level,
  };

  // Interpolate all numeric base/max fields within the tier
  const allKeys = new Set([
    ...Object.keys(tierDef.base),
    ...Object.keys(tierDef.max),
  ]);
  for (const key of allKeys) {
    const b = tierDef.base[key];
    const m = tierDef.max[key];
    if (b !== undefined && m !== undefined) {
      stats[key] = Math.round(b + (m - b) * t);
    } else if (b !== undefined) {
      stats[key] = b;
    } else if (m !== undefined) {
      stats[key] = m;
    }
  }

  // Apply permanent flags (pierce, isArrow, etc.)
  if (def.flags) {
    for (const key in def.flags) {
      stats[key] = def.flags[key];
    }
  }

  // Attach rendering info
  if (def.bulletColor) stats.bulletColor = def.bulletColor;

  return stats;
}


// ---- ITEM CREATION ----
// Creates an inventory-ready item from a PROG_ITEMS definition at tier+level.
function createProgressedItem(itemId, tier, level) {
  const def = PROG_ITEMS[itemId];
  if (!def) return null;

  const stats = getProgressedStats(itemId, tier, level);
  if (!stats) return null;

  const tierName = PROGRESSION_CONFIG.TIER_NAMES[tier] || '';

  return {
    id: itemId,
    name: def.name,
    type: def.type,
    tier: tier,
    level: level,
    progItemId: itemId,  // marks this as a progression item
    data: stats,
    stackable: false,
    count: 1,
  };
}


// ---- EVOLUTION / PRESTIGE ----
// Costs to evolve from tier N to tier N+1. Item must be at level 25 of current tier.
const EVOLUTION_COSTS = {
  // Tier 0 → 1 (Common → Uncommon)
  0: {
    gold: 2000,
    materials: { uncommon_weapon_parts: 5, steel: 10, gold_ore: 5 },
  },
  // Tier 1 → 2 (Uncommon → Rare)
  1: {
    gold: 5000,
    materials: { rare_weapon_parts: 8, ruby: 8, diamond: 5 },
  },
  // Tier 2 → 3 (Rare → Epic)
  2: {
    gold: 12000,
    materials: { epic_weapon_parts: 12, emerald: 10, titanium: 8 },
  },
  // Tier 3 → 4 (Epic → Legendary)
  3: {
    gold: 30000,
    materials: { legendary_weapon_parts: 15, mythril: 12, celestium: 10, dusk: 5 },
  },
};

// Check if an item can evolve at its current tier+level
function canEvolve(tier, level) {
  return tier < PROGRESSION_CONFIG.TIERS - 1 && level >= PROGRESSION_CONFIG.LEVELS_PER_TIER;
}

// Get the cost to evolve from current tier
function getEvolutionCost(tier) {
  return EVOLUTION_COSTS[tier] || null;
}


// ---- HELPERS ----

// Get all PROG_ITEMS ids for a category
function getProgItemsByCategory(category) {
  return Object.keys(PROG_ITEMS).filter(id => PROG_ITEMS[id].category === category);
}

// Get tier display string: "Rare Lv. 14"
function getTierLevelDisplay(tier, level) {
  const tierName = PROGRESSION_CONFIG.TIER_NAMES[tier] || '';
  return tierName + ' Lv.' + level;
}

// Get the progression definition for an item
function getProgItemDef(itemId) {
  return PROG_ITEMS[itemId] || null;
}
