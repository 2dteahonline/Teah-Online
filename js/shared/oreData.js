// ===================== ORE DATA =====================
// Shared data: ore types for the mining system
// 15 ore types across 4 mine rooms, with mining level requirements + XP

const ORE_TYPES = {
  // Room 1 — Beginner ores
  stone:     { id: 'stone',     name: 'Stone',         tier: 1, hp: 5,  value: 1,  color: '#9a9a9a', colorDark: '#6a6a6a', sparkle: '#c0c0c0', rarity: 0.40, miningLevelReq: 1,  xp: 3   },
  coal:      { id: 'coal',      name: 'Coal',          tier: 1, hp: 7,  value: 1,  color: '#3a3a3a', colorDark: '#1a1a1a', sparkle: '#606060', rarity: 0.25, miningLevelReq: 1,  xp: 4   },
  copper:    { id: 'copper',    name: 'Copper Ore',    tier: 1, hp: 9,  value: 2,  color: '#b87333', colorDark: '#8a5522', sparkle: '#dda060', rarity: 0.20, miningLevelReq: 1,  xp: 6   },
  iron:      { id: 'iron',      name: 'Iron Ore',      tier: 2, hp: 12, value: 3,  color: '#8a8a8a', colorDark: '#5a5a5a', sparkle: '#c0c0c0', rarity: 0.15, miningLevelReq: 3,  xp: 9   },

  // Room 2 — Intermediate ores
  steel:     { id: 'steel',     name: 'Steel Ore',     tier: 2, hp: 16, value: 4,  color: '#7090a8', colorDark: '#4a6078', sparkle: '#a0c0d8', rarity: 0.15, miningLevelReq: 8,  xp: 12  },
  gold:      { id: 'gold',      name: 'Gold Ore',      tier: 3, hp: 20, value: 5,  color: '#ffd700', colorDark: '#b8960a', sparkle: '#ffee88', rarity: 0.10, miningLevelReq: 12, xp: 18  },
  amethyst:  { id: 'amethyst',  name: 'Amethyst',      tier: 3, hp: 24, value: 7,  color: '#9b59b6', colorDark: '#6a3080', sparkle: '#c890e0', rarity: 0.08, miningLevelReq: 16, xp: 22  },

  // Room 3 — Advanced ores
  ruby:      { id: 'ruby',      name: 'Ruby',          tier: 4, hp: 30, value: 10, color: '#e74c3c', colorDark: '#a02020', sparkle: '#ff8080', rarity: 0.06, miningLevelReq: 20, xp: 30  },
  diamond:   { id: 'diamond',   name: 'Diamond',       tier: 4, hp: 35, value: 14, color: '#85c1e9', colorDark: '#4a8ab8', sparkle: '#c0e8ff', rarity: 0.05, miningLevelReq: 25, xp: 40  },
  emerald:   { id: 'emerald',   name: 'Emerald',       tier: 4, hp: 35, value: 16, color: '#2ecc71', colorDark: '#1a8a48', sparkle: '#70f0a0', rarity: 0.04, miningLevelReq: 30, xp: 50  },

  // Room 4 — Elite ores
  titanium:  { id: 'titanium',  name: 'Titanium Ore',  tier: 5, hp: 42, value: 20, color: '#d0d0e0', colorDark: '#9090a0', sparkle: '#f0f0ff', rarity: 0.035, miningLevelReq: 35, xp: 65  },
  mythril:   { id: 'mythril',   name: 'Mythril Ore',   tier: 5, hp: 48, value: 24, color: '#40c8e0', colorDark: '#208098', sparkle: '#80e8ff', rarity: 0.03,  miningLevelReq: 40, xp: 80  },
  celestium: { id: 'celestium', name: 'Celestium',     tier: 5, hp: 55, value: 28, color: '#e8d070', colorDark: '#b0983a', sparkle: '#fff0a0', rarity: 0.025, miningLevelReq: 45, xp: 100 },
  obsidian:  { id: 'obsidian',  name: 'Obsidian',      tier: 5, hp: 60, value: 32, color: '#4a2a5a', colorDark: '#2a1038', sparkle: '#8040c0', rarity: 0.02,  miningLevelReq: 50, xp: 125 },
  dusk:      { id: 'dusk',      name: 'Dusk Ore',      tier: 5, hp: 70, value: 40, color: '#301848', colorDark: '#180a28', sparkle: '#6830a0', rarity: 0.015, miningLevelReq: 55, xp: 150 },
};

// Room-to-ore mapping — each mine room spawns only its assigned ores
const MINE_ROOM_ORES = {
  mine_01: ['stone', 'coal', 'copper', 'iron'],
  mine_02: ['steel', 'gold', 'amethyst'],
  mine_03: ['ruby', 'diamond', 'emerald'],
  mine_04: ['titanium', 'mythril', 'celestium', 'obsidian', 'dusk'],
};

// Pick a random ore from a specific room's pool (weighted by rarity)
function pickRandomOreForRoom(roomId) {
  const oreIds = MINE_ROOM_ORES[roomId];
  if (!oreIds || oreIds.length === 0) return 'stone'; // fallback

  let totalWeight = 0;
  for (const id of oreIds) totalWeight += ORE_TYPES[id].rarity;

  let r = Math.random() * totalWeight;
  for (const id of oreIds) {
    r -= ORE_TYPES[id].rarity;
    if (r <= 0) return id;
  }
  return oreIds[oreIds.length - 1];
}

// Legacy fallback — picks from ALL ores (used if roomId is unknown)
function pickRandomOre() {
  const keys = Object.keys(ORE_TYPES);
  let totalWeight = 0;
  for (const k of keys) totalWeight += ORE_TYPES[k].rarity;
  let r = Math.random() * totalWeight;
  for (const k of keys) {
    r -= ORE_TYPES[k].rarity;
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}
