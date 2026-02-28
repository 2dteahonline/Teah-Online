// ===================== DUNGEON REGISTRY =====================
// Single source of truth for all dungeon types, their config, and return paths.
// Adding a new dungeon? Just add an entry here — all systems read from this.
// Every dungeon uses FLOOR_CONFIG for wave compositions.

const DUNGEON_REGISTRY = {
  cave: {
    name: 'Cave Dungeon',
    maxFloors: 5,
    returnLevel: 'cave_01',
    hasHazards: false,      // no HazardSystem floor hazards
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 0,       // soft check — warn but don't block during testing
    rewardMult: 0,          // gold/XP multiplier (0 = placeholder)
    tileset: '',            // map tileset name (future)
    difficulty: 0,          // numeric tier 1-5 (0 = unset)
    music: '',              // audio track key (no music system yet)
  },
  azurine: {
    name: 'Azurine City',
    maxFloors: 5,
    returnLevel: 'azurine_01',
    hasHazards: true,       // HazardSystem active per floor
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 0,
    rewardMult: 0,
    tileset: '',
    difficulty: 0,
    music: '',
  },
  dungeon_3: {
    name: 'Dungeon 3',
    maxFloors: 5,
    returnLevel: '',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 0,
    rewardMult: 0,
    tileset: '',
    difficulty: 0,
    music: '',
  },
  dungeon_4: {
    name: 'Dungeon 4',
    maxFloors: 5,
    returnLevel: '',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 0,
    rewardMult: 0,
    tileset: '',
    difficulty: 0,
    music: '',
  },
  dungeon_5: {
    name: 'Dungeon 5',
    maxFloors: 5,
    returnLevel: '',
    hasHazards: false,
    spawnTX: 20,
    spawnTY: 20,
    requiredLevel: 0,
    rewardMult: 0,
    tileset: '',
    difficulty: 0,
    music: '',
  },
};

// Validate a dungeon key — returns the key if valid, or 'cave' as safe fallback
function validateDungeonType(key) {
  if (DUNGEON_REGISTRY[key]) return key;
  console.warn('Invalid dungeon type: ' + key + ', falling back to cave');
  return 'cave';
}
