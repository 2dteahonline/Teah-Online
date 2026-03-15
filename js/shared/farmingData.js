// ===================== FARMING DATA =====================
// Shared data: crop types, hoe tiers, farming config, land expansions.
// Used by farmingSystem.js (authority) and draw.js (client HUD).
// Pattern matches oreData.js / cookingData.js / fishingData.js.

// --- HOE TIERS ---
// Pure tools — no combat stats. Unlocked by Farming skill level.
// reach = tile range in facing direction (1 = adjacent tile, 2 = 2 tiles out).
const HOE_TIERS = [
  { id: 'bronze_hoe', name: 'Bronze Hoe', tier: 0, levelReq: 1,  cost: 20,   reach: 1, cooldown: 36, special: 'farming', color: '#8a6a3a', desc: 'Basic farming hoe' },
  { id: 'iron_hoe',   name: 'Iron Hoe',   tier: 1, levelReq: 5,  cost: 80,   reach: 1, cooldown: 30, special: 'farming', color: '#8a8a8a', desc: 'Sturdy iron hoe' },
  { id: 'gold_hoe',   name: 'Gold Hoe',   tier: 2, levelReq: 12, cost: 200,  reach: 2, cooldown: 24, special: 'farming', color: '#ffd700', desc: 'Extended reach hoe' },
  { id: 'mythic_hoe', name: 'Mythic Hoe', tier: 3, levelReq: 25, cost: 500,  reach: 2, cooldown: 20, special: 'farming', color: '#d4a030', desc: 'Master farming hoe' },
];

// --- CROP TYPES ---
// All crops have exactly 4 visual stages: seed → sprout → medium → mature.
// gardenReq = minimum garden level to plant this crop.
// Tier 0 (Starter): carrot, potato, tomato — gardenReq 0
// Tier 1 (Reliable): corn, pumpkin, watermelon — gardenReq 1
// Tier 2 (Premium): sunflower, starfruit, dragonfruit — gardenReq 2
const CROP_TYPES = {
  carrot:      { id: 'carrot',      name: 'Carrot',       growthFrames: 900,   seedCost: 5,   sellPrice: 12,  xp: 8,   levelReq: 1,  gardenReq: 0, color: '#e07830' },
  potato:      { id: 'potato',      name: 'Potato',       growthFrames: 1200,  seedCost: 8,   sellPrice: 18,  xp: 12,  levelReq: 3,  gardenReq: 0, color: '#c0a060' },
  tomato:      { id: 'tomato',      name: 'Tomato',       growthFrames: 1500,  seedCost: 12,  sellPrice: 25,  xp: 18,  levelReq: 6,  gardenReq: 0, color: '#dd3030' },
  corn:        { id: 'corn',        name: 'Corn',         growthFrames: 1800,  seedCost: 15,  sellPrice: 35,  xp: 25,  levelReq: 10, gardenReq: 1, color: '#e0d040' },
  pumpkin:     { id: 'pumpkin',     name: 'Pumpkin',      growthFrames: 2400,  seedCost: 20,  sellPrice: 50,  xp: 35,  levelReq: 15, gardenReq: 1, color: '#d08020' },
  watermelon:  { id: 'watermelon',  name: 'Watermelon',   growthFrames: 3000,  seedCost: 30,  sellPrice: 70,  xp: 45,  levelReq: 20, gardenReq: 1, color: '#40a040' },
  sunflower:   { id: 'sunflower',   name: 'Sunflower',    growthFrames: 3600,  seedCost: 40,  sellPrice: 95,  xp: 60,  levelReq: 28, gardenReq: 2, color: '#f0c020' },
  starfruit:   { id: 'starfruit',   name: 'Starfruit',    growthFrames: 4800,  seedCost: 60,  sellPrice: 140, xp: 80,  levelReq: 35, gardenReq: 2, color: '#e0d060' },
  dragonfruit: { id: 'dragonfruit', name: 'Dragonfruit',  growthFrames: 6000,  seedCost: 100, sellPrice: 220, xp: 120, levelReq: 45, gardenReq: 2, color: '#e040a0' },
};

// --- FARMING CONFIG ---
const PLOT_SIZE = 1; // each farm plot spans 1x1 world tile (48x48px)
const FARMING_CONFIG = {
  // Cooldowns (frames at 60fps)
  tillCooldown: 15,        // 0.25s — cooldown after tilling
  plantCooldown: 10,       // 0.17s — cooldown after planting
  harvestCooldown: 15,     // 0.25s — cooldown after harvesting
  // Growth
  growthCheckInterval: 1,  // check every frame (simple frame counter)
  // Tile interaction range
  tileInteractRange: 60,   // px — how close player must be to interact with a tile
};

// --- LAND EXPANSIONS ---
// 4 tiers. gridW/gridH = plot count (each plot is 1 tile = 48x48px).
const LAND_EXPANSIONS = [
  { level: 0, name: 'Starter Garden', gridW: 3,  gridH: 3,  cost: 0,    levelReq: 1  },
  { level: 1, name: 'Small Garden',   gridW: 4,  gridH: 4,  cost: 250,  levelReq: 10 },
  { level: 2, name: 'Medium Garden',  gridW: 5,  gridH: 5,  cost: 1000, levelReq: 25 },
  { level: 3, name: 'Large Garden',   gridW: 6,  gridH: 6,  cost: 3000, levelReq: 50 },
];

// --- HELPERS ---
// Get crops unlocked at a given farming level.
function getUnlockedCrops(farmingLevel) {
  const crops = [];
  for (const id in CROP_TYPES) {
    if (CROP_TYPES[id].levelReq <= farmingLevel) {
      crops.push(CROP_TYPES[id]);
    }
  }
  return crops;
}

// Get tile count from land level.
function getUnlockedTileCount(landLevel) {
  const idx = Math.min(landLevel, LAND_EXPANSIONS.length - 1);
  const exp = LAND_EXPANSIONS[idx];
  return exp.gridW * exp.gridH;
}

// Get land expansion info.
function getLandExpansion(landLevel) {
  const idx = Math.min(landLevel, LAND_EXPANSIONS.length - 1);
  return LAND_EXPANSIONS[idx];
}
