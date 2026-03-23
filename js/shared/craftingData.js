// ===================== CRAFTING DATA =====================
// Shared data: material registry, drop tables, dungeon drop pools, recipes
// Phase A — loaded after gunData.js, before authority systems

// ===================== MATERIAL REGISTRY =====================
// All materials the player can collect. Each has a display color, tier, source dungeon.
const CRAFT_MATERIALS = {
  // ---- Generic Weapon Parts (Cave dungeon — serves all weapons) ----
  common_weapon_parts:    { id: 'common_weapon_parts',    name: 'Common Weapon Parts',    tier: 0, color: '#888888', desc: 'Basic weapon components found in the Cave.',           category: 'generic_part', source: 'cave' },
  uncommon_weapon_parts:  { id: 'uncommon_weapon_parts',  name: 'Uncommon Weapon Parts',  tier: 1, color: '#5fca80', desc: 'Decent weapon parts from deeper Cave floors.',         category: 'generic_part', source: 'cave' },
  rare_weapon_parts:      { id: 'rare_weapon_parts',      name: 'Rare Weapon Parts',      tier: 2, color: '#4a9eff', desc: 'High-quality parts from the Cave depths.',            category: 'generic_part', source: 'cave' },
  epic_weapon_parts:      { id: 'epic_weapon_parts',      name: 'Epic Weapon Parts',      tier: 3, color: '#ff9a40', desc: 'Exceptional parts forged in the deepest Cave levels.', category: 'generic_part', source: 'cave' },
  legendary_weapon_parts: { id: 'legendary_weapon_parts', name: 'Legendary Weapon Parts', tier: 4, color: '#ff4a8a', desc: 'Legendary components from the Cave abyss.',           category: 'generic_part', source: 'cave' },

  // ---- Category-specific parts (crafted or found) ----
  rare_gun_parts:      { id: 'rare_gun_parts',      name: 'Rare Gun Parts',      tier: 2, color: '#4a9eff', desc: 'Precision gun components.',       category: 'gun_part',  source: 'cave' },
  epic_gun_parts:      { id: 'epic_gun_parts',      name: 'Epic Gun Parts',      tier: 3, color: '#ff9a40', desc: 'Superior gun components.',        category: 'gun_part',  source: 'cave' },
  legendary_gun_parts: { id: 'legendary_gun_parts', name: 'Legendary Gun Parts', tier: 4, color: '#ff4a8a', desc: 'Masterwork gun components.',      category: 'gun_part',  source: 'cave' },
  rare_rod_parts:      { id: 'rare_rod_parts',      name: 'Rare Rod Parts',      tier: 2, color: '#4a9eff', desc: 'Quality fishing rod components.', category: 'rod_part',  source: 'cave' },
  epic_rod_parts:      { id: 'epic_rod_parts',      name: 'Epic Rod Parts',      tier: 3, color: '#ff9a40', desc: 'Superior rod components.',        category: 'rod_part',  source: 'cave' },
  legendary_rod_parts: { id: 'legendary_rod_parts', name: 'Legendary Rod Parts', tier: 4, color: '#ff4a8a', desc: 'Masterwork rod components.',      category: 'rod_part',  source: 'cave' },
  rare_pick_parts:     { id: 'rare_pick_parts',     name: 'Rare Pick Parts',     tier: 2, color: '#4a9eff', desc: 'Quality pickaxe components.',     category: 'pick_part', source: 'cave' },
  epic_pick_parts:     { id: 'epic_pick_parts',     name: 'Epic Pick Parts',     tier: 3, color: '#ff9a40', desc: 'Superior pickaxe components.',    category: 'pick_part', source: 'cave' },
  legendary_pick_parts:{ id: 'legendary_pick_parts',name: 'Legendary Pick Parts',tier: 4, color: '#ff4a8a', desc: 'Masterwork pickaxe components.',  category: 'pick_part', source: 'cave' },

  // ---- Azurine City Materials (Storm AR + Volt-9) ----
  storm_capacitor: { id: 'storm_capacitor', name: 'Storm Capacitor', tier: 1, color: '#66ccff', desc: 'Charged capacitor from Azurine electric mobs.', category: 'dungeon_material', source: 'azurine' },
  wind_crystal:    { id: 'wind_crystal',    name: 'Wind Crystal',    tier: 2, color: '#aaddff', desc: 'Crystallized wind energy from Azurine.',         category: 'dungeon_material', source: 'azurine' },
  volt_coil:       { id: 'volt_coil',       name: 'Volt Coil',       tier: 2, color: '#aa66ff', desc: 'High-voltage coil from Azurine enforcers.',      category: 'dungeon_material', source: 'azurine' },
  plasma_cell:     { id: 'plasma_cell',     name: 'Plasma Cell',     tier: 3, color: '#cc99ff', desc: 'Concentrated plasma from Azurine bosses.',       category: 'dungeon_material', source: 'azurine' },

  // ---- Vortalis Materials (Ironwood Bow) ----
  ironwood_limb:  { id: 'ironwood_limb',  name: 'Ironwood Limb',  tier: 1, color: '#8b5e3c', desc: 'Dense ironwood from Vortalis forests.',       category: 'dungeon_material', source: 'vortalis' },
  sinew_string:   { id: 'sinew_string',   name: 'Sinew String',   tier: 2, color: '#a07050', desc: 'Strong sinew from Vortalis creatures.',        category: 'dungeon_material', source: 'vortalis' },
  fletching_kit:  { id: 'fletching_kit',  name: 'Fletching Kit',  tier: 3, color: '#c4a060', desc: 'Precision fletching tools from Vortalis.',     category: 'dungeon_material', source: 'vortalis' },

  // ---- Earth-205 Materials (Heavy AR) ----
  heavy_barrel_liner: { id: 'heavy_barrel_liner', name: 'Heavy Barrel Liner', tier: 2, color: '#ff9944', desc: 'Reinforced barrel from Earth-205 armories.', category: 'dungeon_material', source: 'earth205' },
  blast_powder:       { id: 'blast_powder',       name: 'Blast Powder',       tier: 3, color: '#ffbb77', desc: 'Volatile compound from Earth-205 demolitions.', category: 'dungeon_material', source: 'earth205' },

  // ---- Wagashi Materials (Boomstick) ----
  scatter_core:      { id: 'scatter_core',      name: 'Scatter Core',      tier: 2, color: '#ffcc33', desc: 'Fragmentation core from Wagashi warriors.',      category: 'dungeon_material', source: 'wagashi' },
  gunpowder_charge:  { id: 'gunpowder_charge',  name: 'Gunpowder Charge',  tier: 3, color: '#ffdd77', desc: 'Potent charge from Wagashi pyromancers.',         category: 'dungeon_material', source: 'wagashi' },
  buckshot_mold:     { id: 'buckshot_mold',     name: 'Buckshot Mold',     tier: 3, color: '#dda030', desc: 'Precision mold from Wagashi armorers.',           category: 'dungeon_material', source: 'wagashi' },

  // ---- Earth-216 Materials (Reserved — future weapons) ----
  shadow_alloy:   { id: 'shadow_alloy',   name: 'Shadow Alloy',   tier: 3, color: '#8866aa', desc: 'Dark metal from Earth-216 underworld.',    category: 'dungeon_material', source: 'earth216' },
  neon_filament:  { id: 'neon_filament',  name: 'Neon Filament',  tier: 4, color: '#ff66cc', desc: 'Glowing thread from Earth-216 neon labs.',  category: 'dungeon_material', source: 'earth216' },
};

// ===================== DUNGEON DROP POOLS =====================
// Floor 1=tier0, Floor 2=tier1, ... Floor 5=tier4
// Each pool maps dungeon+floor to an array of material IDs that regular mobs can drop.
const DUNGEON_DROP_POOL = {
  cave: {
    1: ['common_weapon_parts'],
    2: ['common_weapon_parts', 'uncommon_weapon_parts'],
    3: ['uncommon_weapon_parts', 'rare_weapon_parts'],
    4: ['rare_weapon_parts', 'epic_weapon_parts'],
    5: ['epic_weapon_parts', 'legendary_weapon_parts'],
  },
  azurine: {
    1: ['storm_capacitor', 'common_weapon_parts'],
    2: ['storm_capacitor', 'wind_crystal'],
    3: ['wind_crystal', 'volt_coil'],
    4: ['volt_coil', 'plasma_cell'],
    5: ['plasma_cell', 'storm_capacitor'],
  },
  vortalis: {
    1: ['ironwood_limb', 'common_weapon_parts'],
    2: ['ironwood_limb', 'sinew_string'],
    3: ['sinew_string', 'fletching_kit'],
    4: ['fletching_kit', 'ironwood_limb'],
    5: ['fletching_kit', 'sinew_string'],
  },
  earth205: {
    1: ['heavy_barrel_liner', 'common_weapon_parts'],
    2: ['heavy_barrel_liner', 'uncommon_weapon_parts'],
    3: ['heavy_barrel_liner', 'blast_powder'],
    4: ['blast_powder', 'heavy_barrel_liner'],
    5: ['blast_powder', 'heavy_barrel_liner'],
  },
  wagashi: {
    1: ['scatter_core', 'common_weapon_parts'],
    2: ['scatter_core', 'gunpowder_charge'],
    3: ['gunpowder_charge', 'buckshot_mold'],
    4: ['buckshot_mold', 'scatter_core'],
    5: ['buckshot_mold', 'gunpowder_charge'],
  },
  earth216: {
    1: ['shadow_alloy', 'common_weapon_parts'],
    2: ['shadow_alloy', 'uncommon_weapon_parts'],
    3: ['shadow_alloy', 'neon_filament'],
    4: ['neon_filament', 'shadow_alloy'],
    5: ['neon_filament', 'shadow_alloy'],
  },
};

// ===================== DROP TABLES =====================
// Per-mob-type drop configuration.
// dropChance: probability (0-1) that a kill produces a drop
// items: null → use DUNGEON_DROP_POOL, or [{materialId, weight, countMin, countMax}]
// Bosses get dropChance: 1.0 (guaranteed) + specific loot tables.
// Regular mobs get ~15% chance by default.
const DROP_TABLES = {
  // ---- Cave Regular Mobs ----
  grunt:    { dropChance: 0.15, items: null },
  runner:   { dropChance: 0.12, items: null },
  tank:     { dropChance: 0.20, items: null },
  witch:    { dropChance: 0.18, items: null },
  archer:   { dropChance: 0.15, items: null },
  healer:   { dropChance: 0.18, items: null },
  mummy:    { dropChance: 0.10, items: null },

  // ---- Cave Boss ----
  golem: {
    dropChance: 1.0, items: [
      { materialId: 'rare_weapon_parts', weight: 40, countMin: 1, countMax: 3 },
      { materialId: 'epic_weapon_parts', weight: 30, countMin: 1, countMax: 2 },
      { materialId: 'uncommon_weapon_parts', weight: 30, countMin: 2, countMax: 4 },
    ]
  },

  // ---- Azurine Regular Mobs ----
  neon_pickpocket:       { dropChance: 0.15, items: null },
  cyber_mugger:          { dropChance: 0.15, items: null },
  drone_lookout:         { dropChance: 0.15, items: null },
  street_chemist:        { dropChance: 0.18, items: null },
  renegade_bruiser:      { dropChance: 0.18, items: null },
  renegade_shadowknife:  { dropChance: 0.12, items: null },
  renegade_demo:         { dropChance: 0.15, items: null },
  renegade_sniper:       { dropChance: 0.15, items: null },

  // ---- Azurine Bosses ----
  the_don: {
    dropChance: 1.0, items: [
      { materialId: 'storm_capacitor', weight: 50, countMin: 1, countMax: 3 },
      { materialId: 'wind_crystal', weight: 50, countMin: 1, countMax: 2 },
    ]
  },
  velocity: {
    dropChance: 1.0, items: [
      { materialId: 'storm_capacitor', weight: 40, countMin: 2, countMax: 4 },
      { materialId: 'volt_coil', weight: 40, countMin: 1, countMax: 3 },
      { materialId: 'plasma_cell', weight: 20, countMin: 1, countMax: 2 },
    ]
  },

  // ---- Vortalis Bosses ----
  captain_husa:       { dropChance: 1.0, items: [{ materialId: 'ironwood_limb', weight: 60, countMin: 1, countMax: 3 }, { materialId: 'sinew_string', weight: 40, countMin: 1, countMax: 2 }] },
  admiral_von_kael:   { dropChance: 1.0, items: [{ materialId: 'ironwood_limb', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'fletching_kit', weight: 40, countMin: 1, countMax: 2 }, { materialId: 'sinew_string', weight: 20, countMin: 1, countMax: 3 }] },
  zongo:              { dropChance: 1.0, items: [{ materialId: 'sinew_string', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'ironwood_limb', weight: 50, countMin: 1, countMax: 3 }] },
  bloodborne_marlon:  { dropChance: 1.0, items: [{ materialId: 'sinew_string', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'fletching_kit', weight: 40, countMin: 1, countMax: 3 }, { materialId: 'ironwood_limb', weight: 20, countMin: 2, countMax: 3 }] },
  wolfbeard:          { dropChance: 1.0, items: [{ materialId: 'fletching_kit', weight: 50, countMin: 1, countMax: 3 }, { materialId: 'sinew_string', weight: 50, countMin: 2, countMax: 4 }] },
  ghostbeard:         { dropChance: 1.0, items: [{ materialId: 'fletching_kit', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'ironwood_limb', weight: 50, countMin: 1, countMax: 3 }] },
  kraken_jim:         { dropChance: 1.0, items: [{ materialId: 'fletching_kit', weight: 40, countMin: 2, countMax: 5 }, { materialId: 'sinew_string', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'ironwood_limb', weight: 20, countMin: 1, countMax: 3 }] },
  king_requill:       { dropChance: 1.0, items: [{ materialId: 'fletching_kit', weight: 50, countMin: 3, countMax: 5 }, { materialId: 'sinew_string', weight: 50, countMin: 2, countMax: 4 }] },
  queen_siralyth:     { dropChance: 1.0, items: [{ materialId: 'fletching_kit', weight: 40, countMin: 3, countMax: 6 }, { materialId: 'ironwood_limb', weight: 30, countMin: 2, countMax: 4 }, { materialId: 'sinew_string', weight: 30, countMin: 2, countMax: 4 }] },
  mami_wata:          { dropChance: 1.0, items: [{ materialId: 'fletching_kit', weight: 40, countMin: 4, countMax: 6 }, { materialId: 'sinew_string', weight: 30, countMin: 3, countMax: 5 }, { materialId: 'ironwood_limb', weight: 30, countMin: 2, countMax: 4 }] },

  // ---- Earth-205 Bosses ----
  willis:             { dropChance: 1.0, items: [{ materialId: 'heavy_barrel_liner', weight: 60, countMin: 1, countMax: 3 }, { materialId: 'blast_powder', weight: 40, countMin: 1, countMax: 2 }] },
  puppedrill:         { dropChance: 1.0, items: [{ materialId: 'heavy_barrel_liner', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'blast_powder', weight: 50, countMin: 1, countMax: 3 }] },
  sackhead:           { dropChance: 1.0, items: [{ materialId: 'blast_powder', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'heavy_barrel_liner', weight: 50, countMin: 1, countMax: 3 }] },
  mr_schwallie:       { dropChance: 1.0, items: [{ materialId: 'blast_powder', weight: 40, countMin: 2, countMax: 5 }, { materialId: 'heavy_barrel_liner', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'rare_gun_parts', weight: 20, countMin: 1, countMax: 2 }] },
  killer_mime:        { dropChance: 1.0, items: [{ materialId: 'heavy_barrel_liner', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'blast_powder', weight: 50, countMin: 2, countMax: 4 }] },
  major_phantom:      { dropChance: 1.0, items: [{ materialId: 'blast_powder', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'heavy_barrel_liner', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'epic_gun_parts', weight: 20, countMin: 1, countMax: 2 }] },
  lady_red:           { dropChance: 1.0, items: [{ materialId: 'heavy_barrel_liner', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'blast_powder', weight: 40, countMin: 2, countMax: 5 }, { materialId: 'epic_weapon_parts', weight: 20, countMin: 1, countMax: 2 }] },
  the_boss_e205:      { dropChance: 1.0, items: [{ materialId: 'blast_powder', weight: 40, countMin: 3, countMax: 6 }, { materialId: 'heavy_barrel_liner', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'epic_gun_parts', weight: 20, countMin: 1, countMax: 3 }] },
  lady_elixir:        { dropChance: 1.0, items: [{ materialId: 'heavy_barrel_liner', weight: 40, countMin: 4, countMax: 6 }, { materialId: 'blast_powder', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'legendary_gun_parts', weight: 20, countMin: 1, countMax: 2 }] },
  nofaux:             { dropChance: 1.0, items: [{ materialId: 'blast_powder', weight: 35, countMin: 4, countMax: 7 }, { materialId: 'heavy_barrel_liner', weight: 35, countMin: 3, countMax: 6 }, { materialId: 'legendary_weapon_parts', weight: 30, countMin: 1, countMax: 3 }] },

  // ---- Wagashi Bosses ----
  sichou:             { dropChance: 1.0, items: [{ materialId: 'scatter_core', weight: 60, countMin: 1, countMax: 3 }, { materialId: 'gunpowder_charge', weight: 40, countMin: 1, countMax: 2 }] },
  tongya:             { dropChance: 1.0, items: [{ materialId: 'scatter_core', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'gunpowder_charge', weight: 50, countMin: 1, countMax: 3 }] },
  jade_serpent:       { dropChance: 1.0, items: [{ materialId: 'gunpowder_charge', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'buckshot_mold', weight: 50, countMin: 1, countMax: 2 }] },
  stone_golem_guardian:{ dropChance: 1.0, items: [{ materialId: 'buckshot_mold', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'scatter_core', weight: 40, countMin: 2, countMax: 3 }, { materialId: 'gunpowder_charge', weight: 20, countMin: 1, countMax: 3 }] },
  azure_dragon:       { dropChance: 1.0, items: [{ materialId: 'buckshot_mold', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'gunpowder_charge', weight: 50, countMin: 2, countMax: 4 }] },
  jaja:               { dropChance: 1.0, items: [{ materialId: 'gunpowder_charge', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'buckshot_mold', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'scatter_core', weight: 20, countMin: 2, countMax: 3 }] },
  gensai:             { dropChance: 1.0, items: [{ materialId: 'buckshot_mold', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'scatter_core', weight: 30, countMin: 2, countMax: 4 }, { materialId: 'gunpowder_charge', weight: 30, countMin: 2, countMax: 4 }] },
  moon_rabbit:        { dropChance: 1.0, items: [{ materialId: 'buckshot_mold', weight: 40, countMin: 3, countMax: 6 }, { materialId: 'gunpowder_charge', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'epic_gun_parts', weight: 20, countMin: 1, countMax: 2 }] },
  celestial_toad:     { dropChance: 1.0, items: [{ materialId: 'scatter_core', weight: 35, countMin: 4, countMax: 6 }, { materialId: 'buckshot_mold', weight: 35, countMin: 3, countMax: 5 }, { materialId: 'legendary_gun_parts', weight: 30, countMin: 1, countMax: 2 }] },
  lord_sarugami:      { dropChance: 1.0, items: [{ materialId: 'buckshot_mold', weight: 30, countMin: 4, countMax: 7 }, { materialId: 'gunpowder_charge', weight: 30, countMin: 4, countMax: 6 }, { materialId: 'scatter_core', weight: 20, countMin: 3, countMax: 5 }, { materialId: 'legendary_weapon_parts', weight: 20, countMin: 1, countMax: 3 }] },

  // ---- Earth-216 Bosses ----
  victor_graves:      { dropChance: 1.0, items: [{ materialId: 'shadow_alloy', weight: 60, countMin: 1, countMax: 3 }, { materialId: 'common_weapon_parts', weight: 40, countMin: 2, countMax: 4 }] },
  madame_midas:       { dropChance: 1.0, items: [{ materialId: 'shadow_alloy', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'neon_filament', weight: 50, countMin: 1, countMax: 2 }] },
  slasher_e216:       { dropChance: 1.0, items: [{ materialId: 'shadow_alloy', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'neon_filament', weight: 50, countMin: 1, countMax: 3 }] },
  blackout_belle:     { dropChance: 1.0, items: [{ materialId: 'neon_filament', weight: 50, countMin: 2, countMax: 4 }, { materialId: 'shadow_alloy', weight: 50, countMin: 2, countMax: 4 }] },
  macabre_e216:       { dropChance: 1.0, items: [{ materialId: 'shadow_alloy', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'neon_filament', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'epic_weapon_parts', weight: 20, countMin: 1, countMax: 2 }] },
  rosa_calavera:      { dropChance: 1.0, items: [{ materialId: 'neon_filament', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'shadow_alloy', weight: 40, countMin: 2, countMax: 4 }, { materialId: 'epic_gun_parts', weight: 20, countMin: 1, countMax: 2 }] },
  motor_demon:        { dropChance: 1.0, items: [{ materialId: 'shadow_alloy', weight: 40, countMin: 3, countMax: 6 }, { materialId: 'neon_filament', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'legendary_weapon_parts', weight: 20, countMin: 1, countMax: 2 }] },
  nitro_wraith:       { dropChance: 1.0, items: [{ materialId: 'neon_filament', weight: 40, countMin: 4, countMax: 6 }, { materialId: 'shadow_alloy', weight: 40, countMin: 3, countMax: 5 }, { materialId: 'legendary_gun_parts', weight: 20, countMin: 1, countMax: 2 }] },
  hollow_ace:         { dropChance: 1.0, items: [{ materialId: 'shadow_alloy', weight: 35, countMin: 4, countMax: 7 }, { materialId: 'neon_filament', weight: 35, countMin: 4, countMax: 6 }, { materialId: 'legendary_weapon_parts', weight: 30, countMin: 1, countMax: 3 }] },
  alcazar:            { dropChance: 1.0, items: [{ materialId: 'neon_filament', weight: 35, countMin: 5, countMax: 8 }, { materialId: 'shadow_alloy', weight: 35, countMin: 4, countMax: 7 }, { materialId: 'legendary_gun_parts', weight: 30, countMin: 2, countMax: 4 }] }
};

// Default drop chance for mobs NOT in DROP_TABLES
const DEFAULT_DROP_CHANCE = 0.12;

// ===================== CRAFTING RECIPES =====================
// Evolution costs are computed by getEvolutionCost() in progressionData.js.
// Upgrade costs are computed by getProgUpgradeRecipe() in progressionData.js.
// All crafting logic routes through CraftingSystem (craftingSystem.js).

// ===================== HELPERS =====================

// Create a material item compatible with the inventory system (stackable)
function createMaterialItem(materialId, count) {
  const mat = CRAFT_MATERIALS[materialId];
  if (!mat) return createConsumable(materialId, materialId, count || 1);
  const item = createConsumable(materialId, mat.name, count || 1);
  item.type = 'material';
  item.tier = mat.tier;
  item.data.color = mat.color;
  item.data.materialId = materialId;
  item.data.desc = mat.desc;
  return item;
}

// Resolve what a mob should drop when killed.
// Returns { materialId, count } or null if no drop.
function getMobDrop(mobType, dungeonId, floor) {
  const table = DROP_TABLES[mobType];
  const chance = table ? table.dropChance : DEFAULT_DROP_CHANCE;

  // Roll drop chance
  if (Math.random() > chance) return null;

  // Specific loot table
  if (table && table.items) {
    let totalWeight = 0;
    for (const item of table.items) totalWeight += item.weight;
    let roll = Math.random() * totalWeight;
    for (const item of table.items) {
      roll -= item.weight;
      if (roll <= 0) {
        const count = item.countMin + Math.floor(Math.random() * (item.countMax - item.countMin + 1));
        return { materialId: item.materialId, count };
      }
    }
    // Fallback to first item
    const fb = table.items[0];
    return { materialId: fb.materialId, count: fb.countMin };
  }

  // Generic dungeon pool
  const pool = DUNGEON_DROP_POOL[dungeonId];
  if (!pool) return null;
  const floorPool = pool[floor] || pool[1];
  if (!floorPool || floorPool.length === 0) return null;
  const materialId = floorPool[Math.floor(Math.random() * floorPool.length)];
  return { materialId, count: 1 };
}
