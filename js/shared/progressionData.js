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

  // ========== FISHING RODS (Phase 5) ==========
  // T0 base matches ROD_TIERS exactly. Stats: durability, strength, catchBonus, damage, range, cooldown, critChance.

  bronze_rod: {
    id: 'bronze_rod', name: 'Bronze Rod', category: 'fishing_rod', type: 'melee',
    desc: 'Basic fishing rod', buyPrice: 20, color: '#8a6a3a',
    flags: { special: 'fishing' },
    tiers: [
      { base: { durability: 25, strength: 1, catchBonus: 0, damage: 8, range: 80, cooldown: 34, critChance: 0 },
        max:  { durability: 50, strength: 2, catchBonus: 0.08, damage: 16, range: 85, cooldown: 28, critChance: 0.04 } },
      { base: { durability: 52, strength: 2, catchBonus: 0.09, damage: 17, range: 86, cooldown: 27, critChance: 0.05 },
        max:  { durability: 80, strength: 3, catchBonus: 0.18, damage: 28, range: 92, cooldown: 22, critChance: 0.08 } },
      { base: { durability: 83, strength: 3, catchBonus: 0.19, damage: 29, range: 93, cooldown: 21, critChance: 0.09 },
        max:  { durability: 120, strength: 4, catchBonus: 0.30, damage: 44, range: 100, cooldown: 18, critChance: 0.12 } },
      { base: { durability: 124, strength: 4, catchBonus: 0.31, damage: 46, range: 101, cooldown: 17, critChance: 0.13 },
        max:  { durability: 170, strength: 5, catchBonus: 0.44, damage: 64, range: 110, cooldown: 14, critChance: 0.16 } },
      { base: { durability: 175, strength: 5, catchBonus: 0.46, damage: 66, range: 112, cooldown: 13, critChance: 0.17 },
        max:  { durability: 240, strength: 7, catchBonus: 0.60, damage: 90, range: 120, cooldown: 10, critChance: 0.22 } },
    ],
  },

  iron_rod: {
    id: 'iron_rod', name: 'Iron Rod', category: 'fishing_rod', type: 'melee',
    desc: 'Sturdy iron fishing rod', buyPrice: 80, color: '#8a8a8a',
    flags: { special: 'fishing' },
    tiers: [
      { base: { durability: 40, strength: 2, catchBonus: 0.10, damage: 12, range: 85, cooldown: 30, critChance: 0.05 },
        max:  { durability: 70, strength: 3, catchBonus: 0.20, damage: 24, range: 90, cooldown: 24, critChance: 0.08 } },
      { base: { durability: 73, strength: 3, catchBonus: 0.21, damage: 25, range: 91, cooldown: 23, critChance: 0.09 },
        max:  { durability: 110, strength: 4, catchBonus: 0.32, damage: 40, range: 98, cooldown: 19, critChance: 0.12 } },
      { base: { durability: 114, strength: 4, catchBonus: 0.33, damage: 42, range: 99, cooldown: 18, critChance: 0.13 },
        max:  { durability: 160, strength: 5, catchBonus: 0.46, damage: 60, range: 108, cooldown: 15, critChance: 0.16 } },
      { base: { durability: 165, strength: 5, catchBonus: 0.47, damage: 62, range: 109, cooldown: 14, critChance: 0.17 },
        max:  { durability: 220, strength: 7, catchBonus: 0.60, damage: 84, range: 118, cooldown: 12, critChance: 0.20 } },
      { base: { durability: 226, strength: 7, catchBonus: 0.62, damage: 87, range: 120, cooldown: 11, critChance: 0.21 },
        max:  { durability: 300, strength: 9, catchBonus: 0.78, damage: 115, range: 130, cooldown: 8, critChance: 0.26 } },
    ],
  },

  gold_rod: {
    id: 'gold_rod', name: 'Gold Rod', category: 'fishing_rod', type: 'melee',
    desc: 'Gleaming gold fishing rod', buyPrice: 200, color: '#ffd700',
    flags: { special: 'fishing' },
    tiers: [
      { base: { durability: 60, strength: 3, catchBonus: 0.20, damage: 16, range: 90, cooldown: 26, critChance: 0.08 },
        max:  { durability: 100, strength: 4, catchBonus: 0.34, damage: 32, range: 96, cooldown: 20, critChance: 0.12 } },
      { base: { durability: 104, strength: 4, catchBonus: 0.35, damage: 34, range: 97, cooldown: 19, critChance: 0.13 },
        max:  { durability: 150, strength: 5, catchBonus: 0.48, damage: 52, range: 106, cooldown: 16, critChance: 0.16 } },
      { base: { durability: 155, strength: 5, catchBonus: 0.50, damage: 54, range: 107, cooldown: 15, critChance: 0.17 },
        max:  { durability: 210, strength: 7, catchBonus: 0.64, damage: 76, range: 116, cooldown: 12, critChance: 0.20 } },
      { base: { durability: 216, strength: 7, catchBonus: 0.66, damage: 78, range: 118, cooldown: 11, critChance: 0.21 },
        max:  { durability: 280, strength: 9, catchBonus: 0.80, damage: 104, range: 128, cooldown: 9, critChance: 0.25 } },
      { base: { durability: 288, strength: 9, catchBonus: 0.82, damage: 108, range: 130, cooldown: 8, critChance: 0.26 },
        max:  { durability: 380, strength: 12, catchBonus: 1.00, damage: 145, range: 142, cooldown: 6, critChance: 0.32 } },
    ],
  },

  mythic_rod: {
    id: 'mythic_rod', name: 'Mythic Rod', category: 'fishing_rod', type: 'melee',
    desc: 'Legendary mythic fishing rod', buyPrice: 500, color: '#d4a030',
    flags: { special: 'fishing' },
    tiers: [
      { base: { durability: 100, strength: 5, catchBonus: 0.35, damage: 22, range: 95, cooldown: 22, critChance: 0.12 },
        max:  { durability: 160, strength: 6, catchBonus: 0.50, damage: 44, range: 102, cooldown: 17, critChance: 0.16 } },
      { base: { durability: 165, strength: 6, catchBonus: 0.52, damage: 46, range: 103, cooldown: 16, critChance: 0.17 },
        max:  { durability: 230, strength: 8, catchBonus: 0.66, damage: 70, range: 112, cooldown: 13, critChance: 0.20 } },
      { base: { durability: 236, strength: 8, catchBonus: 0.68, damage: 72, range: 114, cooldown: 12, critChance: 0.21 },
        max:  { durability: 310, strength: 10, catchBonus: 0.82, damage: 100, range: 124, cooldown: 10, critChance: 0.25 } },
      { base: { durability: 318, strength: 10, catchBonus: 0.84, damage: 104, range: 126, cooldown: 9, critChance: 0.26 },
        max:  { durability: 400, strength: 13, catchBonus: 1.00, damage: 140, range: 138, cooldown: 7, critChance: 0.30 } },
      { base: { durability: 410, strength: 13, catchBonus: 1.00, damage: 145, range: 140, cooldown: 6, critChance: 0.31 },
        max:  { durability: 520, strength: 16, catchBonus: 1.20, damage: 200, range: 155, cooldown: 4, critChance: 0.38 } },
    ],
  },

  // ========== FARMING HOES (Phase 6) ==========
  // T0 base matches HOE_TIERS exactly. Stats: durability, damage, range, cooldown, critChance, waterRange, waterDuration.

  bronze_hoe: {
    id: 'bronze_hoe', name: 'Bronze Hoe', category: 'farming_hoe', type: 'melee',
    desc: 'Basic farming hoe', buyPrice: 20, color: '#8a6a3a',
    flags: { special: 'farming' },
    tiers: [
      { base: { durability: 30, damage: 6, range: 70, cooldown: 36, critChance: 0, waterRange: 1, waterDuration: 1800 },
        max:  { durability: 55, damage: 12, range: 76, cooldown: 30, critChance: 0.04, waterRange: 1, waterDuration: 2400 } },
      { base: { durability: 58, damage: 13, range: 77, cooldown: 29, critChance: 0.05, waterRange: 1, waterDuration: 2500 },
        max:  { durability: 90, damage: 22, range: 84, cooldown: 24, critChance: 0.08, waterRange: 2, waterDuration: 3200 } },
      { base: { durability: 93, damage: 23, range: 85, cooldown: 23, critChance: 0.09, waterRange: 2, waterDuration: 3300 },
        max:  { durability: 130, damage: 36, range: 92, cooldown: 20, critChance: 0.12, waterRange: 2, waterDuration: 4200 } },
      { base: { durability: 134, damage: 37, range: 93, cooldown: 19, critChance: 0.13, waterRange: 2, waterDuration: 4300 },
        max:  { durability: 180, damage: 52, range: 100, cooldown: 16, critChance: 0.16, waterRange: 3, waterDuration: 5400 } },
      { base: { durability: 185, damage: 54, range: 102, cooldown: 15, critChance: 0.17, waterRange: 3, waterDuration: 5500 },
        max:  { durability: 250, damage: 75, range: 112, cooldown: 12, critChance: 0.22, waterRange: 4, waterDuration: 7200 } },
    ],
  },

  iron_hoe: {
    id: 'iron_hoe', name: 'Iron Hoe', category: 'farming_hoe', type: 'melee',
    desc: 'Durable iron hoe', buyPrice: 80, color: '#8a8a8a',
    flags: { special: 'farming' },
    tiers: [
      { base: { durability: 50, damage: 10, range: 75, cooldown: 32, critChance: 0.05, waterRange: 1, waterDuration: 2700 },
        max:  { durability: 85, damage: 20, range: 82, cooldown: 26, critChance: 0.08, waterRange: 2, waterDuration: 3400 } },
      { base: { durability: 88, damage: 21, range: 83, cooldown: 25, critChance: 0.09, waterRange: 2, waterDuration: 3500 },
        max:  { durability: 130, damage: 34, range: 90, cooldown: 20, critChance: 0.12, waterRange: 2, waterDuration: 4400 } },
      { base: { durability: 134, damage: 35, range: 91, cooldown: 19, critChance: 0.13, waterRange: 2, waterDuration: 4500 },
        max:  { durability: 180, damage: 52, range: 100, cooldown: 16, critChance: 0.16, waterRange: 3, waterDuration: 5600 } },
      { base: { durability: 185, damage: 54, range: 101, cooldown: 15, critChance: 0.17, waterRange: 3, waterDuration: 5700 },
        max:  { durability: 245, damage: 74, range: 112, cooldown: 12, critChance: 0.20, waterRange: 3, waterDuration: 7000 } },
      { base: { durability: 252, damage: 76, range: 114, cooldown: 11, critChance: 0.21, waterRange: 3, waterDuration: 7200 },
        max:  { durability: 340, damage: 105, range: 125, cooldown: 8, critChance: 0.26, waterRange: 4, waterDuration: 9000 } },
    ],
  },

  gold_hoe: {
    id: 'gold_hoe', name: 'Gold Hoe', category: 'farming_hoe', type: 'melee',
    desc: 'Gleaming gold hoe', buyPrice: 200, color: '#ffd700',
    flags: { special: 'farming' },
    tiers: [
      { base: { durability: 70, damage: 14, range: 80, cooldown: 28, critChance: 0.08, waterRange: 2, waterDuration: 3600 },
        max:  { durability: 110, damage: 28, range: 88, cooldown: 22, critChance: 0.12, waterRange: 2, waterDuration: 4600 } },
      { base: { durability: 114, damage: 29, range: 89, cooldown: 21, critChance: 0.13, waterRange: 2, waterDuration: 4700 },
        max:  { durability: 165, damage: 46, range: 98, cooldown: 17, critChance: 0.16, waterRange: 3, waterDuration: 5800 } },
      { base: { durability: 170, damage: 48, range: 99, cooldown: 16, critChance: 0.17, waterRange: 3, waterDuration: 5900 },
        max:  { durability: 230, damage: 68, range: 110, cooldown: 13, critChance: 0.20, waterRange: 3, waterDuration: 7200 } },
      { base: { durability: 236, damage: 70, range: 111, cooldown: 12, critChance: 0.21, waterRange: 3, waterDuration: 7400 },
        max:  { durability: 310, damage: 96, range: 122, cooldown: 10, critChance: 0.25, waterRange: 4, waterDuration: 9000 } },
      { base: { durability: 318, damage: 100, range: 124, cooldown: 9, critChance: 0.26, waterRange: 4, waterDuration: 9200 },
        max:  { durability: 420, damage: 140, range: 138, cooldown: 6, critChance: 0.32, waterRange: 5, waterDuration: 12000 } },
    ],
  },

  mythic_hoe: {
    id: 'mythic_hoe', name: 'Mythic Hoe', category: 'farming_hoe', type: 'melee',
    desc: 'Legendary mythic hoe', buyPrice: 500, color: '#d4a030',
    flags: { special: 'farming' },
    tiers: [
      { base: { durability: 120, damage: 20, range: 85, cooldown: 24, critChance: 0.12, waterRange: 3, waterDuration: 5400 },
        max:  { durability: 180, damage: 40, range: 94, cooldown: 18, critChance: 0.16, waterRange: 3, waterDuration: 6800 } },
      { base: { durability: 185, damage: 42, range: 95, cooldown: 17, critChance: 0.17, waterRange: 3, waterDuration: 7000 },
        max:  { durability: 260, damage: 64, range: 106, cooldown: 14, critChance: 0.20, waterRange: 4, waterDuration: 8600 } },
      { base: { durability: 268, damage: 66, range: 107, cooldown: 13, critChance: 0.21, waterRange: 4, waterDuration: 8800 },
        max:  { durability: 360, damage: 92, range: 118, cooldown: 10, critChance: 0.25, waterRange: 4, waterDuration: 10800 } },
      { base: { durability: 370, damage: 95, range: 120, cooldown: 9, critChance: 0.26, waterRange: 4, waterDuration: 11000 },
        max:  { durability: 470, damage: 130, range: 132, cooldown: 7, critChance: 0.30, waterRange: 5, waterDuration: 13500 } },
      { base: { durability: 480, damage: 134, range: 134, cooldown: 6, critChance: 0.31, waterRange: 5, waterDuration: 13800 },
        max:  { durability: 600, damage: 185, range: 150, cooldown: 4, critChance: 0.38, waterRange: 6, waterDuration: 18000 } },
    ],
  },

  // ========== PICKAXES (Phase 7) ==========
  // 8 pickaxes (1 per ore chain). T0 base matches PICKAXE_TIERS exactly.
  // Stats: damage, range, cooldown, critChance, miningSpeed.

  pickaxe: {
    id: 'pickaxe', name: 'Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Basic mining tool', buyPrice: 0, color: '#8a6a3a',
    flags: { special: 'pickaxe' },
    unlockGate: null,
    tiers: [
      { base: { damage: 10, range: 70, cooldown: 32, critChance: 0, miningSpeed: 1.0 },
        max:  { damage: 18, range: 74, cooldown: 28, critChance: 0.03, miningSpeed: 1.2 } },
      { base: { damage: 19, range: 75, cooldown: 27, critChance: 0.04, miningSpeed: 1.22 },
        max:  { damage: 30, range: 80, cooldown: 22, critChance: 0.07, miningSpeed: 1.5 } },
      { base: { damage: 31, range: 81, cooldown: 21, critChance: 0.08, miningSpeed: 1.52 },
        max:  { damage: 46, range: 86, cooldown: 18, critChance: 0.11, miningSpeed: 1.8 } },
      { base: { damage: 48, range: 87, cooldown: 17, critChance: 0.12, miningSpeed: 1.82 },
        max:  { damage: 66, range: 92, cooldown: 14, critChance: 0.16, miningSpeed: 2.2 } },
      { base: { damage: 68, range: 93, cooldown: 13, critChance: 0.17, miningSpeed: 2.24 },
        max:  { damage: 90, range: 100, cooldown: 10, critChance: 0.22, miningSpeed: 2.8 } },
    ],
  },

  copper_pickaxe: {
    id: 'copper_pickaxe', name: 'Copper Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Copper-tipped mining pick', buyPrice: 50, color: '#b87333',
    flags: { special: 'pickaxe' },
    unlockGate: 'coal',
    tiers: [
      { base: { damage: 14, range: 70, cooldown: 30, critChance: 0, miningSpeed: 1.15 },
        max:  { damage: 24, range: 75, cooldown: 26, critChance: 0.04, miningSpeed: 1.35 } },
      { base: { damage: 25, range: 76, cooldown: 25, critChance: 0.05, miningSpeed: 1.37 },
        max:  { damage: 38, range: 82, cooldown: 20, critChance: 0.08, miningSpeed: 1.65 } },
      { base: { damage: 39, range: 83, cooldown: 19, critChance: 0.09, miningSpeed: 1.68 },
        max:  { damage: 56, range: 89, cooldown: 16, critChance: 0.12, miningSpeed: 2.0 } },
      { base: { damage: 58, range: 90, cooldown: 15, critChance: 0.13, miningSpeed: 2.04 },
        max:  { damage: 78, range: 96, cooldown: 12, critChance: 0.17, miningSpeed: 2.4 } },
      { base: { damage: 80, range: 97, cooldown: 11, critChance: 0.18, miningSpeed: 2.44 },
        max:  { damage: 105, range: 105, cooldown: 8, critChance: 0.24, miningSpeed: 3.0 } },
    ],
  },

  iron_pickaxe: {
    id: 'iron_pickaxe', name: 'Iron Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Iron mining pickaxe', buyPrice: 80, color: '#8a8a8a',
    flags: { special: 'pickaxe' },
    unlockGate: 'iron',
    tiers: [
      { base: { damage: 18, range: 70, cooldown: 28, critChance: 0, miningSpeed: 1.3 },
        max:  { damage: 30, range: 76, cooldown: 24, critChance: 0.04, miningSpeed: 1.52 } },
      { base: { damage: 31, range: 77, cooldown: 23, critChance: 0.05, miningSpeed: 1.54 },
        max:  { damage: 46, range: 84, cooldown: 18, critChance: 0.08, miningSpeed: 1.85 } },
      { base: { damage: 48, range: 85, cooldown: 17, critChance: 0.09, miningSpeed: 1.88 },
        max:  { damage: 66, range: 92, cooldown: 14, critChance: 0.12, miningSpeed: 2.2 } },
      { base: { damage: 68, range: 93, cooldown: 13, critChance: 0.13, miningSpeed: 2.24 },
        max:  { damage: 92, range: 100, cooldown: 10, critChance: 0.17, miningSpeed: 2.6 } },
      { base: { damage: 95, range: 101, cooldown: 9, critChance: 0.18, miningSpeed: 2.65 },
        max:  { damage: 125, range: 110, cooldown: 7, critChance: 0.24, miningSpeed: 3.2 } },
    ],
  },

  gold_pickaxe: {
    id: 'gold_pickaxe', name: 'Gold Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Gold mining pickaxe', buyPrice: 150, color: '#ffd700',
    flags: { special: 'pickaxe' },
    unlockGate: 'gold',
    tiers: [
      { base: { damage: 22, range: 75, cooldown: 26, critChance: 0, miningSpeed: 1.5 },
        max:  { damage: 36, range: 80, cooldown: 22, critChance: 0.05, miningSpeed: 1.72 } },
      { base: { damage: 37, range: 81, cooldown: 21, critChance: 0.06, miningSpeed: 1.75 },
        max:  { damage: 54, range: 88, cooldown: 16, critChance: 0.09, miningSpeed: 2.08 } },
      { base: { damage: 56, range: 89, cooldown: 15, critChance: 0.10, miningSpeed: 2.12 },
        max:  { damage: 78, range: 96, cooldown: 12, critChance: 0.14, miningSpeed: 2.5 } },
      { base: { damage: 80, range: 97, cooldown: 11, critChance: 0.15, miningSpeed: 2.54 },
        max:  { damage: 106, range: 105, cooldown: 9, critChance: 0.19, miningSpeed: 2.95 } },
      { base: { damage: 110, range: 106, cooldown: 8, critChance: 0.20, miningSpeed: 3.0 },
        max:  { damage: 145, range: 115, cooldown: 6, critChance: 0.26, miningSpeed: 3.6 } },
    ],
  },

  amethyst_pickaxe: {
    id: 'amethyst_pickaxe', name: 'Amethyst Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Amethyst-edged mining pick', buyPrice: 250, color: '#9b59b6',
    flags: { special: 'pickaxe' },
    unlockGate: 'amethyst',
    tiers: [
      { base: { damage: 26, range: 75, cooldown: 24, critChance: 0, miningSpeed: 1.7 },
        max:  { damage: 42, range: 82, cooldown: 20, critChance: 0.05, miningSpeed: 1.95 } },
      { base: { damage: 43, range: 83, cooldown: 19, critChance: 0.06, miningSpeed: 1.98 },
        max:  { damage: 62, range: 90, cooldown: 15, critChance: 0.10, miningSpeed: 2.32 } },
      { base: { damage: 64, range: 91, cooldown: 14, critChance: 0.11, miningSpeed: 2.36 },
        max:  { damage: 88, range: 99, cooldown: 11, critChance: 0.15, miningSpeed: 2.75 } },
      { base: { damage: 90, range: 100, cooldown: 10, critChance: 0.16, miningSpeed: 2.8 },
        max:  { damage: 120, range: 108, cooldown: 8, critChance: 0.21, miningSpeed: 3.25 } },
      { base: { damage: 124, range: 110, cooldown: 7, critChance: 0.22, miningSpeed: 3.3 },
        max:  { damage: 165, range: 120, cooldown: 5, critChance: 0.28, miningSpeed: 4.0 } },
    ],
  },

  ruby_pickaxe: {
    id: 'ruby_pickaxe', name: 'Ruby Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Ruby-infused mining pick', buyPrice: 400, color: '#e74c3c',
    flags: { special: 'pickaxe' },
    unlockGate: 'ruby',
    tiers: [
      { base: { damage: 30, range: 80, cooldown: 22, critChance: 0, miningSpeed: 1.9 },
        max:  { damage: 48, range: 86, cooldown: 18, critChance: 0.06, miningSpeed: 2.15 } },
      { base: { damage: 50, range: 87, cooldown: 17, critChance: 0.07, miningSpeed: 2.18 },
        max:  { damage: 72, range: 94, cooldown: 14, critChance: 0.11, miningSpeed: 2.55 } },
      { base: { damage: 74, range: 95, cooldown: 13, critChance: 0.12, miningSpeed: 2.58 },
        max:  { damage: 100, range: 103, cooldown: 10, critChance: 0.16, miningSpeed: 3.0 } },
      { base: { damage: 103, range: 104, cooldown: 9, critChance: 0.17, miningSpeed: 3.05 },
        max:  { damage: 138, range: 113, cooldown: 7, critChance: 0.22, miningSpeed: 3.5 } },
      { base: { damage: 142, range: 114, cooldown: 6, critChance: 0.23, miningSpeed: 3.56 },
        max:  { damage: 190, range: 125, cooldown: 4, critChance: 0.30, miningSpeed: 4.3 } },
    ],
  },

  diamond_pickaxe: {
    id: 'diamond_pickaxe', name: 'Diamond Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Diamond-tipped mining pick', buyPrice: 600, color: '#85c1e9',
    flags: { special: 'pickaxe' },
    unlockGate: 'diamond',
    tiers: [
      { base: { damage: 35, range: 80, cooldown: 20, critChance: 0, miningSpeed: 2.1 },
        max:  { damage: 55, range: 88, cooldown: 16, critChance: 0.06, miningSpeed: 2.4 } },
      { base: { damage: 57, range: 89, cooldown: 15, critChance: 0.07, miningSpeed: 2.44 },
        max:  { damage: 82, range: 97, cooldown: 12, critChance: 0.11, miningSpeed: 2.85 } },
      { base: { damage: 84, range: 98, cooldown: 11, critChance: 0.12, miningSpeed: 2.9 },
        max:  { damage: 115, range: 107, cooldown: 9, critChance: 0.16, miningSpeed: 3.35 } },
      { base: { damage: 118, range: 108, cooldown: 8, critChance: 0.17, miningSpeed: 3.4 },
        max:  { damage: 156, range: 118, cooldown: 6, critChance: 0.23, miningSpeed: 3.9 } },
      { base: { damage: 160, range: 119, cooldown: 5, critChance: 0.24, miningSpeed: 3.96 },
        max:  { damage: 215, range: 130, cooldown: 3, critChance: 0.32, miningSpeed: 4.8 } },
    ],
  },

  emerald_pickaxe: {
    id: 'emerald_pickaxe', name: 'Emerald Pickaxe', category: 'pickaxe', type: 'melee',
    desc: 'Emerald-forged mining pick', buyPrice: 900, color: '#2ecc71',
    flags: { special: 'pickaxe' },
    unlockGate: 'emerald',
    tiers: [
      { base: { damage: 40, range: 85, cooldown: 18, critChance: 0, miningSpeed: 2.4 },
        max:  { damage: 64, range: 92, cooldown: 14, critChance: 0.07, miningSpeed: 2.72 } },
      { base: { damage: 66, range: 93, cooldown: 13, critChance: 0.08, miningSpeed: 2.76 },
        max:  { damage: 94, range: 102, cooldown: 10, critChance: 0.12, miningSpeed: 3.2 } },
      { base: { damage: 97, range: 103, cooldown: 9, critChance: 0.13, miningSpeed: 3.24 },
        max:  { damage: 132, range: 112, cooldown: 7, critChance: 0.18, miningSpeed: 3.7 } },
      { base: { damage: 136, range: 113, cooldown: 6, critChance: 0.19, miningSpeed: 3.76 },
        max:  { damage: 180, range: 124, cooldown: 5, critChance: 0.25, miningSpeed: 4.3 } },
      { base: { damage: 185, range: 125, cooldown: 4, critChance: 0.26, miningSpeed: 4.36 },
        max:  { damage: 250, range: 138, cooldown: 2, critChance: 0.35, miningSpeed: 5.2 } },
    ],
  },
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


// ---- UNIVERSAL UPGRADE RECIPES (Phase 8) ----
// Generates upgrade cost for ANY PROG_ITEMS item at tier+level.
// Replaces the per-gun GUN_UPGRADE_RECIPES with a universal system.
// Cost brackets match mine rooms:
//   L2-6:   Coal/Copper/Iron + gold (50-150g) + tier-appropriate parts
//   L7-13:  Steel/Gold/Amethyst + gold (200-500g)
//   L14-19: Ruby/Diamond/Emerald + gold (600-1200g)
//   L20-25: Titanium/Mythril/Celestium + gold (1500-3000g)
// Tier multiplier scales costs: T0=1x, T1=2.5x, T2=5x, T3=10x, T4=20x

const _PROG_TIER_COST_MULT = [1, 2.5, 5, 10, 20];
const _PROG_PART_KEYS = {
  main_gun:    ['common_weapon_parts', 'uncommon_weapon_parts', 'rare_weapon_parts', 'epic_weapon_parts', 'legendary_weapon_parts'],
  fishing_rod: ['common_weapon_parts', 'uncommon_weapon_parts', 'rare_weapon_parts', 'epic_weapon_parts', 'legendary_weapon_parts'],
  farming_hoe: ['common_weapon_parts', 'uncommon_weapon_parts', 'rare_weapon_parts', 'epic_weapon_parts', 'legendary_weapon_parts'],
  pickaxe:     ['common_weapon_parts', 'uncommon_weapon_parts', 'rare_weapon_parts', 'epic_weapon_parts', 'legendary_weapon_parts'],
};

function getProgUpgradeRecipe(itemId, tier, toLevel) {
  const def = PROG_ITEMS[itemId];
  if (!def || toLevel < 2 || toLevel > 25 || tier < 0 || tier > 4) return null;

  const mult = _PROG_TIER_COST_MULT[tier];
  const partKeys = _PROG_PART_KEYS[def.category] || _PROG_PART_KEYS.main_gun;
  const partKey = partKeys[Math.min(tier, partKeys.length - 1)];

  let baseGold, ores;
  if (toLevel <= 6) {
    baseGold = 50 + (toLevel - 2) * 25;
    const amt = toLevel - 1;
    if (toLevel <= 3)      ores = { coal: amt };
    else if (toLevel <= 5) ores = { copper: amt };
    else                   ores = { iron: amt };
  } else if (toLevel <= 13) {
    baseGold = 200 + (toLevel - 7) * 50;
    const amt = toLevel - 4;
    if (toLevel <= 9)       ores = { steel: amt };
    else if (toLevel <= 11) ores = { gold_ore: amt };
    else                    ores = { amethyst: amt };
  } else if (toLevel <= 19) {
    baseGold = 600 + (toLevel - 14) * 120;
    const amt = toLevel - 8;
    if (toLevel <= 15)      ores = { ruby: amt };
    else if (toLevel <= 17) ores = { diamond: amt };
    else                    ores = { emerald: amt };
  } else {
    baseGold = 1500 + (toLevel - 20) * 300;
    const amt = toLevel - 12;
    if (toLevel <= 21)      ores = { titanium: amt };
    else if (toLevel <= 23) ores = { mythril: amt };
    else                    ores = { celestium: amt };
  }

  const goldCost = Math.round(baseGold * mult);
  const parts = {};
  parts[partKey] = Math.ceil((toLevel - 1) / 2);

  return { gold: goldCost, ores, parts };
}
