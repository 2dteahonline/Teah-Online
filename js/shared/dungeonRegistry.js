// ===================== DUNGEON REGISTRY =====================
// Single source of truth for all dungeon types, their config, and return paths.
// Replaces hardcoded 'cave' / 'azurine' checks scattered across 5+ files.
// Adding a new dungeon? Just add an entry here — all systems read from this.

const DUNGEON_REGISTRY = {
  cave: {
    name: 'Cave Dungeon',
    maxFloors: 5,
    returnLevel: 'cave_01',
    hasFloorConfig: false,  // uses legacy wave system (getLegacyWaveComposition)
    hasHazards: false,      // no HazardSystem floor hazards
    spawnTX: 20,
    spawnTY: 20,
  },
  azurine: {
    name: 'Azurine City',
    maxFloors: 5,
    returnLevel: 'azurine_01',
    hasFloorConfig: true,   // uses FLOOR_CONFIG wave compositions
    hasHazards: true,       // HazardSystem active per floor
    spawnTX: 20,
    spawnTY: 20,
  },
};

// Validate a dungeon key — returns the key if valid, or 'cave' as safe fallback
function validateDungeonType(key) {
  if (DUNGEON_REGISTRY[key]) return key;
  console.warn('Invalid dungeon type: ' + key + ', falling back to cave');
  return 'cave';
}
