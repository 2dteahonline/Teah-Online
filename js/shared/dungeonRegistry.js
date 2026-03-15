// ===================== DUNGEON REGISTRY =====================
// Single source of truth for all dungeon types, their config, and return paths.
// Adding a new dungeon? Just add an entry here — all systems read from this.
// Every dungeon uses FLOOR_CONFIG for wave compositions.

const DUNGEON_REGISTRY = {
  cave: {
    name: 'Cave Dungeon',
    combatLevelId: 'warehouse_01',
    maxFloors: 5,
    returnLevel: 'cave_01',
    hasHazards: false,      // no HazardSystem floor hazards
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 0,       // soft check — warn but don't block during testing
    rewardMult: 1.0,        // gold/XP multiplier
    tileset: '',            // map tileset name (future)
    difficulty: 1,          // numeric tier 1-5
    music: '',              // audio track key (no music system yet)
  },
  azurine: {
    name: 'Azurine City',
    combatLevelId: 'azurine_dungeon_01',
    maxFloors: 5,
    returnLevel: 'azurine_01',
    hasHazards: false,
    spawnTX: 18,
    spawnTY: 18,
    requiredLevel: 10,
    rewardMult: 1.5,
    tileset: '',
    difficulty: 2,
    music: '',
  },
  vortalis: {
    name: 'Vortalis',
    combatLevelId: 'warehouse_01',
    maxFloors: 5,
    returnLevel: 'vortalis_01',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 20,
    rewardMult: 2.0,
    tileset: '',
    difficulty: 3,
    music: '',
  },
  earth205: {
    name: 'Earth-205: Marble City',
    combatLevelId: 'warehouse_01',
    maxFloors: 5,
    returnLevel: 'earth205_01',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 30,
    rewardMult: 2.8,
    tileset: '',
    difficulty: 4,
    music: '',
  },
  wagashi: {
    name: 'Wagashi: Heavenly Realm',
    combatLevelId: 'warehouse_01',
    maxFloors: 5,
    returnLevel: 'wagashi_01',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 40,
    rewardMult: 3.5,
    tileset: '',
    difficulty: 5,
    music: '',
  },
  earth216: {
    name: 'Earth-216: Sin City',
    combatLevelId: 'warehouse_01',
    maxFloors: 5,
    returnLevel: 'earth216_01',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 50,
    rewardMult: 4.5,
    tileset: '',
    difficulty: 5,
    music: '',
  },
};

// Validate a dungeon key — returns the key if valid, or 'cave' as safe fallback
function validateDungeonType(key) {
  if (DUNGEON_REGISTRY[key]) return key;
  console.warn('Invalid dungeon type: ' + key + ', falling back to cave');
  return 'cave';
}
