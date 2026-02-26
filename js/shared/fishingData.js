// ===================== FISHING DATA =====================
// Shared data: rod tiers, fish species, bait, timing config.
// Used by fishingSystem.js (authority) and draw.js (client HUD).
// Pattern matches oreData.js / cookingData.js.

// --- ROD TIERS ---
// Unlocked by Fishing skill level (NOT fish caught).
// Strength = max fish weight rod can reliably hold.
const ROD_TIERS = [
  { id: 'bronze_rod', name: 'Bronze Rod', tier: 0, levelReq: 1,  cost: 20,  durability: 25,  strength: 1, catchBonus: 0.00, escapeReduction: 0.00,
    damage: 8,  range: 80,  cooldown: 34, critChance: 0, special: 'fishing', color: '#8a6a3a', desc: '8 dmg · fishing rod · equip to fish', waveReq: 0 },
  { id: 'iron_rod',   name: 'Iron Rod',   tier: 1, levelReq: 5,  cost: 80,  durability: 40,  strength: 2, catchBonus: 0.10, escapeReduction: 0.10,
    damage: 12, range: 85,  cooldown: 30, critChance: 0.05, special: 'fishing', color: '#8a8a8a', desc: '12 dmg · iron fishing rod', waveReq: 0 },
  { id: 'gold_rod',   name: 'Gold Rod',   tier: 2, levelReq: 12, cost: 200, durability: 60,  strength: 3, catchBonus: 0.20, escapeReduction: 0.20,
    damage: 16, range: 90,  cooldown: 26, critChance: 0.08, special: 'fishing', color: '#ffd700', desc: '16 dmg · gold fishing rod', waveReq: 0 },
  { id: 'mythic_rod', name: 'Mythic Rod', tier: 3, levelReq: 25, cost: 500, durability: 100, strength: 5, catchBonus: 0.35, escapeReduction: 0.35,
    damage: 22, range: 95,  cooldown: 22, critChance: 0.12, special: 'fishing', color: '#d4a030', desc: '22 dmg · mythic fishing rod', waveReq: 0 },
];

// --- FISH SPECIES ---
// rarity = spawn weight (higher = more common).
// difficulty = base escape chance (0-1). Higher = harder to land.
// weight = compared against rod strength; overweight fish escape more.
// minRodTier = minimum rod tier that can hook this fish at all.
const FISH_SPECIES = {
  sardine:    { id: 'sardine',    name: 'Sardine',          rarity: 40, sellPrice: 3,   difficulty: 0.20, minRodTier: 0, xp: 5,   weight: 1, color: '#8ab4c8' },
  bass:       { id: 'bass',       name: 'Bass',             rarity: 25, sellPrice: 8,   difficulty: 0.35, minRodTier: 0, xp: 10,  weight: 2, color: '#5a8a5a' },
  salmon:     { id: 'salmon',     name: 'Salmon',           rarity: 18, sellPrice: 15,  difficulty: 0.50, minRodTier: 1, xp: 18,  weight: 2, color: '#d08060' },
  tuna:       { id: 'tuna',       name: 'Tuna',             rarity: 10, sellPrice: 25,  difficulty: 0.65, minRodTier: 1, xp: 30,  weight: 3, color: '#4060a0' },
  swordfish:  { id: 'swordfish',  name: 'Swordfish',        rarity: 5,  sellPrice: 50,  difficulty: 0.80, minRodTier: 2, xp: 50,  weight: 4, color: '#607090' },
  leviathan:  { id: 'leviathan',  name: 'Golden Leviathan', rarity: 2,  sellPrice: 120, difficulty: 0.95, minRodTier: 3, xp: 100, weight: 5, color: '#d4a030' },
};

// --- BAIT ---
const BAIT_TYPES = {
  worm: { id: 'worm', name: 'Worm Bait', cost: 2, biteSpeedMod: 1.0 },
};

// --- TIMING CONFIG (frames at 60fps) ---
const FISHING_CONFIG = {
  castFrames: 60,        // 1.0s — cast animation
  waitFramesMin: 180,    // 3.0s — shortest wait before bite
  waitFramesMax: 480,    // 8.0s — longest wait before bite
  biteWindowFrames: 120, // 2.0s — time to react to bite
  reelFramesMin: 90,     // 1.5s — easiest fish reel time
  reelFramesMax: 180,    // 3.0s — hardest fish reel time
  resultFrames: 30,      // 0.5s — show result
  cooldownFrames: 60,    // 1.0s — rest between casts
  // Reel tension: how fast tension decays when not holding reel
  tensionDecayRate: 0.012,
  // Reel tension: how fast tension builds when holding reel
  tensionFillRate: 0.025,
  // Reel: progress must reach this to catch
  tensionCatchThreshold: 0.70,
  // Level bonus cap
  maxLevelBonus: 0.25,
  levelBonusPerLevel: 0.005,
  // Overweight penalty per point above rod strength
  overweightPenalty: 0.25,
};

// --- SPAWN TABLE ---
// Returns array of { fish, weight } filtered by rod tier.
// Higher rod tiers unlock rarer fish.
function getFishingSpawnTable(rodTier) {
  const table = [];
  for (const id in FISH_SPECIES) {
    const fish = FISH_SPECIES[id];
    if (fish.minRodTier <= rodTier) {
      table.push({ fish: fish, weight: fish.rarity });
    }
  }
  return table;
}

// Pick a random fish from spawn table (weighted).
function pickRandomFish(rodTier) {
  const table = getFishingSpawnTable(rodTier);
  if (table.length === 0) return null;
  let totalWeight = 0;
  for (const entry of table) totalWeight += entry.weight;
  let r = Math.random() * totalWeight;
  for (const entry of table) {
    r -= entry.weight;
    if (r <= 0) return entry.fish;
  }
  return table[table.length - 1].fish;
}

// Calculate catch chance for a given fish + rod + level.
function calculateCatchChance(fish, rod, fishingLevel) {
  const cfg = FISHING_CONFIG;
  const baseCatch = 1.0 - fish.difficulty;
  const rodBonus = rod.catchBonus;
  const levelBonus = Math.min(cfg.maxLevelBonus, fishingLevel * cfg.levelBonusPerLevel);
  const overweight = Math.max(0, fish.weight - rod.strength) * cfg.overweightPenalty;
  const finalCatch = baseCatch + rodBonus + levelBonus - overweight;
  return Math.max(0.05, Math.min(0.95, finalCatch));
}
