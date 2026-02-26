// ===================== FARMING DATA =====================
// Shared data: crop types, hoe tiers, farming config, land expansions.
// Used by farmingSystem.js (authority) and draw.js (client HUD).
// Pattern matches oreData.js / cookingData.js / fishingData.js.

// --- HOE TIERS ---
// Unlocked by Farming skill level.
// waterRange = tile radius for watering. waterDuration = frames water lasts.
const HOE_TIERS = [
  { id: 'bronze_hoe', name: 'Bronze Hoe', tier: 0, levelReq: 1,  cost: 20,  durability: 30,  damage: 6,  range: 70,  cooldown: 36, critChance: 0,
    special: 'farming', color: '#8a6a3a', desc: '6 dmg · farming hoe · equip to farm', waveReq: 0, waterRange: 1, waterDuration: 1800 },
  { id: 'iron_hoe',   name: 'Iron Hoe',   tier: 1, levelReq: 5,  cost: 80,  durability: 50,  damage: 10, range: 75,  cooldown: 32, critChance: 0.05,
    special: 'farming', color: '#8a8a8a', desc: '10 dmg · iron farming hoe', waveReq: 0, waterRange: 1, waterDuration: 2700 },
  { id: 'gold_hoe',   name: 'Gold Hoe',   tier: 2, levelReq: 12, cost: 200, durability: 70,  damage: 14, range: 80,  cooldown: 28, critChance: 0.08,
    special: 'farming', color: '#ffd700', desc: '14 dmg · gold farming hoe', waveReq: 0, waterRange: 2, waterDuration: 3600 },
  { id: 'mythic_hoe', name: 'Mythic Hoe', tier: 3, levelReq: 25, cost: 500, durability: 120, damage: 20, range: 85,  cooldown: 24, critChance: 0.12,
    special: 'farming', color: '#d4a030', desc: '20 dmg · mythic farming hoe', waveReq: 0, waterRange: 3, waterDuration: 5400 },
];

// --- CROP TYPES ---
// growthFrames = total frames to mature (at 60fps, watered only).
// stages = number of visual growth stages.
// levelReq = Farming skill level to unlock seed.
const CROP_TYPES = {
  carrot:      { id: 'carrot',      name: 'Carrot',       growthFrames: 900,   stages: 4, seedCost: 5,   sellPrice: 12,  xp: 8,   levelReq: 1,  color: '#e07830' },
  potato:      { id: 'potato',      name: 'Potato',       growthFrames: 1200,  stages: 4, seedCost: 8,   sellPrice: 18,  xp: 12,  levelReq: 3,  color: '#c0a060' },
  tomato:      { id: 'tomato',      name: 'Tomato',       growthFrames: 1500,  stages: 5, seedCost: 12,  sellPrice: 25,  xp: 18,  levelReq: 6,  color: '#dd3030' },
  corn:        { id: 'corn',        name: 'Corn',         growthFrames: 1800,  stages: 5, seedCost: 15,  sellPrice: 35,  xp: 25,  levelReq: 10, color: '#e0d040' },
  pumpkin:     { id: 'pumpkin',     name: 'Pumpkin',      growthFrames: 2400,  stages: 5, seedCost: 20,  sellPrice: 50,  xp: 35,  levelReq: 15, color: '#d08020' },
  watermelon:  { id: 'watermelon',  name: 'Watermelon',   growthFrames: 3000,  stages: 5, seedCost: 30,  sellPrice: 70,  xp: 45,  levelReq: 20, color: '#40a040' },
  sunflower:   { id: 'sunflower',   name: 'Sunflower',    growthFrames: 3600,  stages: 5, seedCost: 40,  sellPrice: 95,  xp: 60,  levelReq: 28, color: '#f0c020' },
  starfruit:   { id: 'starfruit',   name: 'Starfruit',    growthFrames: 4800,  stages: 6, seedCost: 60,  sellPrice: 140, xp: 80,  levelReq: 35, color: '#e0d060' },
  dragonfruit: { id: 'dragonfruit', name: 'Dragonfruit',  growthFrames: 6000,  stages: 6, seedCost: 100, sellPrice: 220, xp: 120, levelReq: 45, color: '#e040a0' },
};

// --- FARMING CONFIG ---
const FARMING_CONFIG = {
  // Cooldowns (frames at 60fps)
  tillCooldown: 15,        // 0.25s — cooldown after tilling
  plantCooldown: 10,       // 0.17s — cooldown after planting
  waterCooldown: 20,       // 0.33s — cooldown after watering
  harvestCooldown: 15,     // 0.25s — cooldown after harvesting
  // Growth
  growthCheckInterval: 1,  // check every frame (simple frame counter)
  // Tile interaction range
  tileInteractRange: 60,   // px — how close player must be to interact with a tile
};

// --- LAND EXPANSIONS ---
// landLevel determines how many tiles the player's farm has.
// Each level adds a larger grid.
const LAND_EXPANSIONS = [
  { level: 0, name: 'Starter Plot',  gridW: 3, gridH: 3, cost: 0,    levelReq: 1  },
  { level: 1, name: 'Small Garden',  gridW: 4, gridH: 4, cost: 100,  levelReq: 5  },
  { level: 2, name: 'Garden',        gridW: 5, gridH: 5, cost: 300,  levelReq: 12 },
  { level: 3, name: 'Large Garden',  gridW: 6, gridH: 6, cost: 700,  levelReq: 20 },
  { level: 4, name: 'Grand Farm',    gridW: 7, gridH: 7, cost: 1500, levelReq: 35 },
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
