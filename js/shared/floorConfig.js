// ===================== FLOOR CONFIG =====================
// Per-dungeon, per-floor metadata: mob pools, palettes, wave compositions, hazard lists.
// Keyed by dungeon type, then floor number: FLOOR_CONFIG[dungeonType][floorNum]
// Every dungeon uses this system — no legacy wave paths.
//
// TEMPLATE SYSTEM: Wave compositions are defined as reusable templates in WAVE_TEMPLATES.
// Dungeons reference templates by name. Builder functions resolve templates at load time
// into the exact FLOOR_CONFIG structure that consumers expect. getFloorWaveComposition()
// is unchanged — zero consumer risk.

// ===================== WAVE TEMPLATES =====================
// Reusable wave compositions. Each defines mob mix only (no difficulty scaling).
// Difficulty is handled by waveSystem.js (getWaveHPMultiplier, getWaveSpeedMultiplier, etc.)
const WAVE_TEMPLATES = {
  // ---- Cave early waves (1-4) ----
  grunt_rush:    { primary: [{ type: 'grunt', weight: 3 }], support: [{ type: 'runner', weight: 1 }], primaryPct: 0.85, theme: 'Grunt Rush' },
  archer_ambush: { primary: [{ type: 'archer', weight: 3 }, { type: 'grunt', weight: 2 }], support: [{ type: 'runner', weight: 2 }], primaryPct: 0.6, theme: 'Archer Ambush' },
  speed_swarm:   { primary: [{ type: 'runner', weight: 3 }], support: [{ type: 'grunt', weight: 1 }], primaryPct: 0.75, theme: 'Speed Swarm' },
  heavy_assault: { primary: [{ type: 'tank', weight: 3 }], support: [{ type: 'healer', weight: 2 }, { type: 'grunt', weight: 1 }], primaryPct: 0.6, theme: 'Heavy Assault' },

  // ---- Cave late waves (6-9) ----
  mummy_ambush:  { primary: [{ type: 'mummy', weight: 3 }], support: [{ type: 'runner', weight: 2 }, { type: 'grunt', weight: 1 }], primaryPct: 0.5, theme: 'Mummy Ambush' },
  witch_coven:   { primary: [{ type: 'witch', weight: 2 }], support: [{ type: 'grunt', weight: 2 }, { type: 'tank', weight: 1 }], primaryPct: 0.3, theme: 'Witch Coven' },
  blitz_wave:    { primary: [{ type: 'runner', weight: 3 }, { type: 'mummy', weight: 2 }], support: [{ type: 'grunt', weight: 1 }], primaryPct: 0.65, theme: 'Blitz Wave' },
  elite_wave:    { primary: [{ type: 'tank', weight: 2 }, { type: 'witch', weight: 2 }], support: [{ type: 'healer', weight: 1 }, { type: 'archer', weight: 1 }, { type: 'mummy', weight: 1 }, { type: 'runner', weight: 1 }], primaryPct: 0.5, theme: 'Elite Wave' },

  // ---- Vortalis Floor 1 early (Pirates) ----
  pirate_rush:      { primary: [{ type: 'bilge_rat', weight: 3 }], support: [{ type: 'powder_keg', weight: 1 }], primaryPct: 0.85, theme: 'Pirate Rush' },
  pirate_gunners:   { primary: [{ type: 'deckhand_shooter', weight: 3 }, { type: 'powder_keg', weight: 2 }], support: [{ type: 'bilge_rat', weight: 1 }], primaryPct: 0.65, theme: 'Pirate Gunners' },
  pirate_heavy:     { primary: [{ type: 'anchor_hauler', weight: 3 }, { type: 'deckhand_shooter', weight: 2 }], support: [{ type: 'bilge_rat', weight: 1 }, { type: 'powder_keg', weight: 1 }], primaryPct: 0.6, theme: 'Pirate Heavy' },
  pirate_mixed:     { primary: [{ type: 'powder_keg', weight: 2 }, { type: 'anchor_hauler', weight: 2 }], support: [{ type: 'bilge_rat', weight: 1 }, { type: 'deckhand_shooter', weight: 1 }], primaryPct: 0.6, theme: 'Pirate Mixed' },
};

// ===================== SUBFLOOR BLUEPRINTS =====================
// Reusable subFloor structures that reference templates by name.
// Boss subFloors are NOT blueprinted — they stay explicit per floor.
const SUBFLOOR_BLUEPRINTS = {
  cave_early: {
    waves: [1, 2, 3, 4],
    theme: 'cave_depths',
    waveTemplates: { 1: 'grunt_rush', 2: 'archer_ambush', 3: 'speed_swarm', 4: 'heavy_assault' },
  },
  cave_late: {
    waves: [6, 7, 8, 9],
    theme: 'cave_elite',
    waveTemplates: { 6: 'mummy_ambush', 7: 'witch_coven', 8: 'blitz_wave', 9: 'elite_wave' },
  },
};

// ===================== BUILDER FUNCTIONS =====================

// Resolves a subFloor definition into a concrete subFloor object.
// - If waveTemplates present: expands template names into waveComps (deep-cloned).
// - Inline waveComps take priority over templates for the same wave number.
// - Boss subFloors or fully-inline subFloors pass through unchanged.
function _resolveSubFloor(subFloor) {
  if (!subFloor.waveTemplates) return subFloor;

  const waveComps = {};
  // Inline overrides take priority
  if (subFloor.waveComps) {
    for (const k in subFloor.waveComps) waveComps[Number(k)] = subFloor.waveComps[k];
  }
  // Fill remaining from templates (deep-clone to prevent cross-floor mutation)
  for (const waveNum in subFloor.waveTemplates) {
    const n = Number(waveNum);
    if (waveComps[n]) continue; // already overridden inline
    const tmpl = WAVE_TEMPLATES[subFloor.waveTemplates[waveNum]];
    if (!tmpl) { console.error('Unknown wave template: ' + subFloor.waveTemplates[waveNum]); continue; }
    waveComps[n] = {
      primary: tmpl.primary.map(function(e) { return { type: e.type, weight: e.weight }; }),
      support: tmpl.support.map(function(e) { return { type: e.type, weight: e.weight }; }),
      primaryPct: tmpl.primaryPct,
      theme: tmpl.theme,
    };
  }

  return { waves: subFloor.waves, theme: subFloor.theme, waveComps: waveComps };
}

// Builds a full floor entry from a floor definition.
function _buildFloor(floorDef) {
  return {
    name: floorDef.name,
    subFloors: floorDef.subFloors.map(_resolveSubFloor),
    palette: floorDef.palette || {},
    hazards: floorDef.hazards || [],
  };
}

// ===================== CAVE DUNGEON =====================
// All 5 floors share the same wave compositions. Only bosses could vary per floor.
function _buildCaveFloor(floorNum) {
  return _buildFloor({
    name: 'Cave Floor ' + floorNum,
    subFloors: [
      SUBFLOOR_BLUEPRINTS.cave_early,
      {
        waves: [5],
        theme: 'golem_arena',
        boss: 'golem',
        bossComp: {
          theme: 'Golem',
          forceGolem: false,
          forceBoss: 'golem',
          support: [
            { type: 'grunt', count: 2 },
            { type: 'tank', count: 1 },
            { type: 'healer', count: 1 },
          ],
        },
      },
      SUBFLOOR_BLUEPRINTS.cave_late,
      {
        waves: [10],
        theme: 'golem_boss_arena',
        boss: 'golem',
        bossComp: {
          theme: '\u2694 BOSS WAVE \u2694',
          forceGolem: true,
          forceBoss: 'golem',
          support: [
            { type: 'tank', count: 2 },
            { type: 'witch', count: 1 },
            { type: 'grunt', count: 2 },
          ],
        },
      },
    ],
    palette: {},
    hazards: [],
  });
}

const _caveConfig = {};
for (let _f = 1; _f <= 5; _f++) _caveConfig[_f] = _buildCaveFloor(_f);

// ===================== AZURINE CITY =====================
// Each floor has unique compositions — all defined inline, wrapped in _buildFloor().
const _azurineConfig = {
  1: _buildFloor({
    name: 'Azurine City',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'city_streets',
        waveComps: {
          1: { primary: [{ type: 'neon_pickpocket', weight: 3 }], support: [{ type: 'cyber_mugger', weight: 1 }], primaryPct: 0.85, theme: 'Neon Pickpockets' },
          2: { primary: [{ type: 'cyber_mugger', weight: 3 }, { type: 'neon_pickpocket', weight: 2 }], support: [{ type: 'drone_lookout', weight: 1 }], primaryPct: 0.7, theme: 'Cyber Muggers' },
          3: { primary: [{ type: 'drone_lookout', weight: 3 }, { type: 'cyber_mugger', weight: 1 }], support: [{ type: 'neon_pickpocket', weight: 2 }, { type: 'street_chemist', weight: 1 }], primaryPct: 0.6, theme: 'Drone Lookouts' },
          4: { primary: [{ type: 'street_chemist', weight: 3 }, { type: 'drone_lookout', weight: 2 }], support: [{ type: 'neon_pickpocket', weight: 1 }, { type: 'cyber_mugger', weight: 1 }], primaryPct: 0.6, theme: 'Street Chemists' },
        },
      },
      {
        waves: [5],
        theme: 'don_arena',
        boss: 'the_don',
        bossComp: {
          theme: 'The Don',
          forceGolem: false,
          forceBoss: 'the_don',
          support: [
            { type: 'neon_pickpocket', count: 2 },
            { type: 'cyber_mugger', count: 2 },
            { type: 'street_chemist', count: 1 },
          ],
        },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'renegade_turf',
        waveComps: {
          6: { primary: [{ type: 'renegade_bruiser', weight: 3 }], support: [{ type: 'neon_pickpocket', weight: 1 }], primaryPct: 0.8, theme: 'Renegade Bruisers' },
          7: { primary: [{ type: 'renegade_shadowknife', weight: 3 }, { type: 'renegade_bruiser', weight: 1 }], support: [{ type: 'cyber_mugger', weight: 1 }], primaryPct: 0.7, theme: 'Renegade Shadowknives' },
          8: { primary: [{ type: 'renegade_demo', weight: 3 }, { type: 'renegade_shadowknife', weight: 1 }], support: [{ type: 'renegade_bruiser', weight: 1 }], primaryPct: 0.65, theme: 'Renegade Demo' },
          9: { primary: [{ type: 'renegade_sniper', weight: 2 }, { type: 'renegade_demo', weight: 2 }], support: [{ type: 'renegade_bruiser', weight: 1 }, { type: 'renegade_shadowknife', weight: 1 }], primaryPct: 0.6, theme: 'Renegade Elite' },
        },
      },
      {
        waves: [10],
        theme: 'velocity_arena',
        boss: 'velocity',
        bossComp: {
          theme: 'Velocity & Renegades',
          forceGolem: false,
          forceBoss: 'velocity',
          support: [
            { type: 'renegade_bruiser', count: 2 },
            { type: 'renegade_shadowknife', count: 2 },
            { type: 'renegade_demo', count: 1 },
            { type: 'renegade_sniper', count: 1 },
          ],
        },
      },
    ],
    palette: {
      floor1: '#2a2a3a',
      floor2: '#242438',
      wall: '#1a1a2a',
      wallAccent: '#00ccff',
      accent2: '#ff00aa',
      gridLine: '#333348',
    },
    hazards: [],
  }),

  2: _buildFloor({
    name: 'Tech District',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'tech_district',
        waveComps: {
          1: { primary: [{ type: 'circuit_thief', weight: 3 }], support: [{ type: 'arc_welder', weight: 1 }], primaryPct: 0.85, theme: 'Circuit Thieves' },
          2: { primary: [{ type: 'arc_welder', weight: 3 }, { type: 'circuit_thief', weight: 2 }], support: [{ type: 'battery_drone', weight: 1 }], primaryPct: 0.7, theme: 'Arc Welders' },
          3: { primary: [{ type: 'battery_drone', weight: 3 }, { type: 'arc_welder', weight: 1 }], support: [{ type: 'circuit_thief', weight: 2 }, { type: 'coil_runner', weight: 1 }], primaryPct: 0.6, theme: 'Battery Drones' },
          4: { primary: [{ type: 'coil_runner', weight: 3 }, { type: 'battery_drone', weight: 2 }], support: [{ type: 'circuit_thief', weight: 1 }, { type: 'arc_welder', weight: 1 }], primaryPct: 0.6, theme: 'Coil Runners' },
        },
      },
      {
        waves: [5],
        theme: 'voltmaster_arena',
        boss: 'voltmaster',
        bossComp: {
          theme: 'Voltmaster',
          forceGolem: false,
          forceBoss: 'voltmaster',
          support: [
            { type: 'circuit_thief', count: 2 },
            { type: 'arc_welder', count: 2 },
            { type: 'coil_runner', count: 1 },
          ],
        },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'corporate_core',
        waveComps: {
          6: { primary: [{ type: 'suit_enforcer', weight: 3 }], support: [{ type: 'circuit_thief', weight: 1 }], primaryPct: 0.8, theme: 'Suit Enforcers' },
          7: { primary: [{ type: 'compliance_officer', weight: 3 }, { type: 'suit_enforcer', weight: 1 }], support: [{ type: 'arc_welder', weight: 1 }], primaryPct: 0.7, theme: 'Compliance Officers' },
          8: { primary: [{ type: 'contract_assassin', weight: 3 }, { type: 'compliance_officer', weight: 1 }], support: [{ type: 'suit_enforcer', weight: 1 }], primaryPct: 0.65, theme: 'Contract Assassins' },
          9: { primary: [{ type: 'executive_handler', weight: 2 }, { type: 'contract_assassin', weight: 2 }], support: [{ type: 'suit_enforcer', weight: 1 }, { type: 'compliance_officer', weight: 1 }], primaryPct: 0.6, theme: 'Executive Handlers' },
        },
      },
      {
        waves: [10],
        theme: 'e_mortis_arena',
        boss: 'e_mortis',
        bossComp: {
          theme: 'E-Mortis & Corporate',
          forceGolem: false,
          forceBoss: 'e_mortis',
          support: [
            { type: 'suit_enforcer', count: 2 },
            { type: 'compliance_officer', count: 2 },
            { type: 'contract_assassin', count: 1 },
            { type: 'executive_handler', count: 1 },
          ],
        },
      },
    ],
    palette: {
      floor1: '#1a2a2a',
      floor2: '#182828',
      wall: '#0a1a2a',
      wallAccent: '#00ff88',
      accent2: '#ffaa00',
      gridLine: '#283838',
    },
    hazards: [],
  }),

  3: _buildFloor({
    name: 'Junkyard Wastes',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'junkyard',
        waveComps: {
          1: { primary: [{ type: 'scrap_rat', weight: 3 }], support: [{ type: 'magnet_scavenger', weight: 1 }], primaryPct: 0.85, theme: 'Scrap Rats' },
          2: { primary: [{ type: 'magnet_scavenger', weight: 3 }, { type: 'scrap_rat', weight: 2 }], support: [{ type: 'rust_sawman', weight: 1 }], primaryPct: 0.7, theme: 'Magnet Scavengers' },
          3: { primary: [{ type: 'rust_sawman', weight: 3 }, { type: 'magnet_scavenger', weight: 1 }], support: [{ type: 'scrap_rat', weight: 2 }, { type: 'junkyard_pyro', weight: 1 }], primaryPct: 0.6, theme: 'Rust Sawmen' },
          4: { primary: [{ type: 'junkyard_pyro', weight: 3 }, { type: 'rust_sawman', weight: 2 }], support: [{ type: 'scrap_rat', weight: 1 }, { type: 'magnet_scavenger', weight: 1 }], primaryPct: 0.6, theme: 'Junkyard Pyros' },
        },
      },
      {
        waves: [5],
        theme: 'mourn_arena',
        boss: 'mourn',
        bossComp: {
          theme: 'Mourn',
          forceGolem: false,
          forceBoss: 'mourn',
          support: [
            { type: 'scrap_rat', count: 2 },
            { type: 'magnet_scavenger', count: 2 },
            { type: 'rust_sawman', count: 1 },
          ],
        },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'swamp_mutation',
        waveComps: {
          6: { primary: [{ type: 'toxic_leechling', weight: 3 }], support: [{ type: 'scrap_rat', weight: 1 }], primaryPct: 0.8, theme: 'Toxic Leechlings' },
          7: { primary: [{ type: 'bog_stalker', weight: 3 }, { type: 'toxic_leechling', weight: 1 }], support: [{ type: 'magnet_scavenger', weight: 1 }], primaryPct: 0.7, theme: 'Bog Stalkers' },
          8: { primary: [{ type: 'chem_frog', weight: 3 }, { type: 'bog_stalker', weight: 1 }], support: [{ type: 'toxic_leechling', weight: 1 }], primaryPct: 0.65, theme: 'Chem-Frog Mutants' },
          9: { primary: [{ type: 'mosquito_drone', weight: 2 }, { type: 'chem_frog', weight: 2 }], support: [{ type: 'bog_stalker', weight: 1 }, { type: 'toxic_leechling', weight: 1 }], primaryPct: 0.6, theme: 'Swamp Elite' },
        },
      },
      {
        waves: [10],
        theme: 'centipede_arena',
        boss: 'centipede',
        bossComp: {
          theme: 'Centipede & Swarm',
          forceGolem: false,
          forceBoss: 'centipede',
          support: [
            { type: 'toxic_leechling', count: 2 },
            { type: 'bog_stalker', count: 2 },
            { type: 'chem_frog', count: 1 },
            { type: 'mosquito_drone', count: 1 },
          ],
        },
      },
    ],
    palette: {
      floor1: '#2a2a1a',
      floor2: '#282818',
      wall: '#1a1a0a',
      wallAccent: '#88aa22',
      accent2: '#aa6600',
      gridLine: '#383828',
    },
    hazards: [],
  }),

  4: _buildFloor({
    name: 'Trap House & R.E.G.I.M.E',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'trap_house',
        waveComps: {
          1: { primary: [{ type: 'tripwire_tech', weight: 3 }], support: [{ type: 'gizmo_hound', weight: 1 }], primaryPct: 0.85, theme: 'Tripwire Techs' },
          2: { primary: [{ type: 'gizmo_hound', weight: 3 }, { type: 'tripwire_tech', weight: 2 }], support: [{ type: 'holo_jester', weight: 1 }], primaryPct: 0.7, theme: 'Gizmo Hounds' },
          3: { primary: [{ type: 'holo_jester', weight: 3 }, { type: 'gizmo_hound', weight: 1 }], support: [{ type: 'tripwire_tech', weight: 2 }, { type: 'time_prankster', weight: 1 }], primaryPct: 0.6, theme: 'Holo Jesters' },
          4: { primary: [{ type: 'time_prankster', weight: 3 }, { type: 'holo_jester', weight: 2 }], support: [{ type: 'tripwire_tech', weight: 1 }, { type: 'gizmo_hound', weight: 1 }], primaryPct: 0.6, theme: 'Time Pranksters' },
        },
      },
      {
        waves: [5],
        theme: 'game_master_arena',
        boss: 'game_master',
        bossComp: {
          theme: 'Game Master',
          forceGolem: false,
          forceBoss: 'game_master',
          support: [
            { type: 'tripwire_tech', count: 2 },
            { type: 'holo_jester', count: 2 },
            { type: 'time_prankster', count: 1 },
          ],
        },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'regime_compound',
        waveComps: {
          6: { primary: [{ type: 'enforcer_drone', weight: 3 }], support: [{ type: 'tripwire_tech', weight: 1 }], primaryPct: 0.8, theme: 'Enforcer Drones' },
          7: { primary: [{ type: 'synth_builder', weight: 3 }, { type: 'enforcer_drone', weight: 1 }], support: [{ type: 'gizmo_hound', weight: 1 }], primaryPct: 0.7, theme: 'Synth Builders' },
          8: { primary: [{ type: 'shock_trooper', weight: 3 }, { type: 'synth_builder', weight: 1 }], support: [{ type: 'enforcer_drone', weight: 1 }], primaryPct: 0.65, theme: 'Shock Troopers' },
          9: { primary: [{ type: 'signal_jammer', weight: 2 }, { type: 'shock_trooper', weight: 2 }], support: [{ type: 'synth_builder', weight: 1 }, { type: 'enforcer_drone', weight: 1 }], primaryPct: 0.6, theme: 'Signal Jammers' },
        },
      },
      {
        waves: [10],
        theme: 'junz_arena',
        boss: 'junz',
        bossComp: {
          theme: 'J.U.N.Z & R.E.G.I.M.E',
          forceGolem: false,
          forceBoss: 'junz',
          support: [
            { type: 'enforcer_drone', count: 2 },
            { type: 'synth_builder', count: 2 },
            { type: 'shock_trooper', count: 1 },
            { type: 'signal_jammer', count: 1 },
          ],
        },
      },
    ],
    palette: {
      floor1: '#2a1a2a',
      floor2: '#281828',
      wall: '#1a0a1a',
      wallAccent: '#ff44aa',
      accent2: '#44aaff',
      gridLine: '#382838',
    },
    hazards: [],
  }),

  // ===================== FLOOR 5: WASTE PLANET → SLIME/DUSK =====================
  5: _buildFloor({
    name: 'Infected Wastes & Dusk Realm',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'waste_planet',
        waveComps: {
          1: { primary: [{ type: 'rabid_hyenaoid', weight: 3 }], support: [{ type: 'biolum_drone', weight: 1 }], primaryPct: 0.8, theme: 'Rabid Hyenaoids' },
          2: { primary: [{ type: 'spore_stag', weight: 3 }, { type: 'rabid_hyenaoid', weight: 1 }], support: [{ type: 'biolum_drone', weight: 1 }], primaryPct: 0.7, theme: 'Spore Stags' },
          3: { primary: [{ type: 'wasteland_raptor', weight: 3 }, { type: 'spore_stag', weight: 1 }], support: [{ type: 'rabid_hyenaoid', weight: 1 }], primaryPct: 0.65, theme: 'Wasteland Raptors' },
          4: { primary: [{ type: 'plague_batwing', weight: 2 }, { type: 'wasteland_raptor', weight: 2 }], support: [{ type: 'spore_stag', weight: 1 }, { type: 'rabid_hyenaoid', weight: 1 }], primaryPct: 0.6, theme: 'Plague Batwings' },
        },
      },
      {
        waves: [5],
        theme: 'lehvius_jackman_arena',
        boss: 'lehvius',
        bossComp: {
          theme: 'Lehvius & Jackman',
          forceGolem: false,
          forceBoss: 'lehvius',
          duoBoss: 'jackman',
          support: [
            { type: 'rabid_hyenaoid', count: 2 },
            { type: 'spore_stag', count: 1 },
            { type: 'wasteland_raptor', count: 1 },
          ],
        },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'slime_dusk',
        waveComps: {
          6: { primary: [{ type: 'gel_swordsman', weight: 3 }], support: [{ type: 'biolum_drone', weight: 1 }], primaryPct: 0.8, theme: 'Gel Swordsmen' },
          7: { primary: [{ type: 'viscosity_mage', weight: 3 }, { type: 'gel_swordsman', weight: 1 }], support: [{ type: 'biolum_drone', weight: 1 }], primaryPct: 0.7, theme: 'Viscosity Mages' },
          8: { primary: [{ type: 'core_guardian', weight: 2 }, { type: 'gel_swordsman', weight: 2 }], support: [{ type: 'viscosity_mage', weight: 1 }], primaryPct: 0.65, theme: 'Core Guardians' },
          9: { primary: [{ type: 'biolum_drone', weight: 2 }, { type: 'core_guardian', weight: 2 }], support: [{ type: 'gel_swordsman', weight: 1 }, { type: 'viscosity_mage', weight: 1 }], primaryPct: 0.6, theme: 'Bio-Lum Swarm' },
        },
      },
      {
        waves: [10],
        theme: 'malric_vale_arena',
        boss: 'malric',
        bossComp: {
          theme: 'World Malric & Vale',
          forceGolem: false,
          forceBoss: 'malric',
          duoBoss: 'vale',
          support: [
            { type: 'gel_swordsman', count: 2 },
            { type: 'viscosity_mage', count: 2 },
            { type: 'core_guardian', count: 1 },
            { type: 'biolum_drone', count: 1 },
          ],
        },
      },
    ],
    palette: {
      floor1: '#1a2a1a',
      floor2: '#182818',
      wall: '#0a1a0a',
      wallAccent: '#44ff88',
      accent2: '#aa44ff',
      gridLine: '#283828',
    },
    hazards: [],
  }),
};

// ===================== VORTALIS =====================
const _vortalisConfig = {
  1: _buildFloor({
    name: 'Pirate Shores',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'pirate_shores',
        waveComps: {
          1: { primary: [{ type: 'bilge_rat', weight: 3 }], support: [{ type: 'powder_keg', weight: 1 }], primaryPct: 0.85, theme: 'Bilge Rats' },
          2: { primary: [{ type: 'powder_keg', weight: 3 }, { type: 'bilge_rat', weight: 2 }], support: [{ type: 'deckhand_shooter', weight: 1 }], primaryPct: 0.7, theme: 'Powder Kegs' },
          3: { primary: [{ type: 'deckhand_shooter', weight: 3 }, { type: 'powder_keg', weight: 1 }], support: [{ type: 'bilge_rat', weight: 2 }, { type: 'anchor_hauler', weight: 1 }], primaryPct: 0.6, theme: 'Deckhand Shooters' },
          4: { primary: [{ type: 'anchor_hauler', weight: 3 }, { type: 'deckhand_shooter', weight: 2 }], support: [{ type: 'bilge_rat', weight: 1 }, { type: 'powder_keg', weight: 1 }], primaryPct: 0.6, theme: 'Anchor Haulers' },
        },
      },
      {
        waves: [5],
        theme: 'husa_arena',
        boss: 'captain_husa',
        bossComp: {
          theme: 'Captain Husa',
          forceGolem: false,
          forceBoss: 'captain_husa',
          support: [
            { type: 'bilge_rat', count: 2 },
            { type: 'powder_keg', count: 2 },
            { type: 'deckhand_shooter', count: 1 },
          ],
        },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'naval_fleet',
        waveComps: {
          6: { primary: [{ type: 'ironclad_marine', weight: 3 }], support: [{ type: 'bilge_rat', weight: 1 }], primaryPct: 0.8, theme: 'Ironclad Marines' },
          7: { primary: [{ type: 'tidecaller_mystic', weight: 3 }, { type: 'ironclad_marine', weight: 1 }], support: [{ type: 'galleon_sniper', weight: 1 }], primaryPct: 0.7, theme: 'Tidecaller Mystics' },
          8: { primary: [{ type: 'galleon_sniper', weight: 3 }, { type: 'tidecaller_mystic', weight: 1 }], support: [{ type: 'ironclad_marine', weight: 1 }], primaryPct: 0.65, theme: 'Galleon Snipers' },
          9: { primary: [{ type: 'sunken_dreadnought', weight: 2 }, { type: 'galleon_sniper', weight: 2 }], support: [{ type: 'ironclad_marine', weight: 1 }, { type: 'tidecaller_mystic', weight: 1 }], primaryPct: 0.6, theme: 'Naval Elite' },
        },
      },
      {
        waves: [10],
        theme: 'von_kael_arena',
        boss: 'admiral_von_kael',
        bossComp: {
          theme: 'Admiral Von Kael',
          forceGolem: false,
          forceBoss: 'admiral_von_kael',
          support: [
            { type: 'ironclad_marine', count: 2 },
            { type: 'tidecaller_mystic', count: 2 },
            { type: 'galleon_sniper', count: 1 },
            { type: 'sunken_dreadnought', count: 1 },
          ],
        },
      },
    ],
    palette: {
      floor1: '#1a2028',
      floor2: '#182028',
      wall: '#0a1218',
      wallAccent: '#2288aa',
      accent2: '#cc8844',
      gridLine: '#253038',
    },
    hazards: [],
  }),

  // Floor 2: Jungle / Blood
  2: _buildFloor({
    name: 'Jungle & Blood Cove',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'jungle_depths',
        waveComps: {
          1: { primary: [{ type: 'jungle_headhunter', weight: 3 }], support: [{ type: 'voodoo_creeper', weight: 1 }], primaryPct: 0.85, theme: 'Jungle Headhunters' },
          2: { primary: [{ type: 'voodoo_creeper', weight: 3 }, { type: 'jungle_headhunter', weight: 2 }], support: [{ type: 'canopy_sniper', weight: 1 }], primaryPct: 0.7, theme: 'Voodoo Creepers' },
          3: { primary: [{ type: 'canopy_sniper', weight: 3 }, { type: 'voodoo_creeper', weight: 1 }], support: [{ type: 'jungle_headhunter', weight: 2 }, { type: 'temple_silverback', weight: 1 }], primaryPct: 0.6, theme: 'Canopy Snipers' },
          4: { primary: [{ type: 'temple_silverback', weight: 3 }, { type: 'canopy_sniper', weight: 2 }], support: [{ type: 'jungle_headhunter', weight: 1 }, { type: 'voodoo_creeper', weight: 1 }], primaryPct: 0.6, theme: 'Temple Silverbacks' },
        },
      },
      {
        waves: [5],
        theme: 'zongo_arena',
        boss: 'zongo',
        bossComp: { theme: 'Zongo', forceGolem: false, forceBoss: 'zongo', support: [{ type: 'jungle_headhunter', count: 2 }, { type: 'voodoo_creeper', count: 2 }, { type: 'temple_silverback', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'blood_cove',
        waveComps: {
          6: { primary: [{ type: 'crimson_corsair', weight: 3 }], support: [{ type: 'jungle_headhunter', weight: 1 }], primaryPct: 0.8, theme: 'Crimson Corsairs' },
          7: { primary: [{ type: 'crystal_cultist', weight: 3 }, { type: 'crimson_corsair', weight: 1 }], support: [{ type: 'voodoo_creeper', weight: 1 }], primaryPct: 0.7, theme: 'Crystal Cultists' },
          8: { primary: [{ type: 'bone_clad_brute', weight: 3 }, { type: 'crystal_cultist', weight: 1 }], support: [{ type: 'crimson_corsair', weight: 1 }], primaryPct: 0.65, theme: 'Bone-Clad Brutes' },
          9: { primary: [{ type: 'sanguine_siren', weight: 2 }, { type: 'bone_clad_brute', weight: 2 }], support: [{ type: 'crimson_corsair', weight: 1 }, { type: 'crystal_cultist', weight: 1 }], primaryPct: 0.6, theme: 'Blood Elite' },
        },
      },
      {
        waves: [10],
        theme: 'marlon_arena',
        boss: 'bloodborne_marlon',
        bossComp: { theme: 'Bloodborne Marlon', forceGolem: false, forceBoss: 'bloodborne_marlon', support: [{ type: 'crimson_corsair', count: 2 }, { type: 'crystal_cultist', count: 2 }, { type: 'bone_clad_brute', count: 1 }, { type: 'sanguine_siren', count: 1 }] },
      },
    ],
    palette: { floor1: '#221a18', floor2: '#201818', wall: '#120a08', wallAccent: '#44aa44', accent2: '#cc2222', gridLine: '#322a28' },
    hazards: [],
  }),

  // Floor 3: Werewolf / Ghost
  3: _buildFloor({
    name: 'Moonlit Docks & Ghost Ship',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'moonlit_docks',
        waveComps: {
          1: { primary: [{ type: 'feral_deckhand', weight: 3 }], support: [{ type: 'rabid_wharf_hound', weight: 1 }], primaryPct: 0.85, theme: 'Feral Deckhands' },
          2: { primary: [{ type: 'howling_lookout', weight: 3 }, { type: 'feral_deckhand', weight: 2 }], support: [{ type: 'rabid_wharf_hound', weight: 1 }], primaryPct: 0.7, theme: 'Howling Lookouts' },
          3: { primary: [{ type: 'sea_dog_brute', weight: 3 }, { type: 'howling_lookout', weight: 1 }], support: [{ type: 'feral_deckhand', weight: 2 }, { type: 'rabid_wharf_hound', weight: 1 }], primaryPct: 0.6, theme: 'Sea Dog Brutes' },
          4: { primary: [{ type: 'rabid_wharf_hound', weight: 3 }, { type: 'sea_dog_brute', weight: 2 }], support: [{ type: 'feral_deckhand', weight: 1 }, { type: 'howling_lookout', weight: 1 }], primaryPct: 0.6, theme: 'Wharf Hounds' },
        },
      },
      {
        waves: [5],
        theme: 'wolfbeard_arena',
        boss: 'wolfbeard',
        bossComp: { theme: 'Wolfbeard', forceGolem: false, forceBoss: 'wolfbeard', support: [{ type: 'feral_deckhand', count: 2 }, { type: 'sea_dog_brute', count: 2 }, { type: 'rabid_wharf_hound', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'ghost_ship',
        waveComps: {
          6: { primary: [{ type: 'phantom_swashbuckler', weight: 3 }], support: [{ type: 'feral_deckhand', weight: 1 }], primaryPct: 0.8, theme: 'Phantom Swashbucklers' },
          7: { primary: [{ type: 'poltergeist_gunner', weight: 3 }, { type: 'phantom_swashbuckler', weight: 1 }], support: [{ type: 'howling_lookout', weight: 1 }], primaryPct: 0.7, theme: 'Poltergeist Gunners' },
          8: { primary: [{ type: 'drowned_banshee', weight: 3 }, { type: 'poltergeist_gunner', weight: 1 }], support: [{ type: 'phantom_swashbuckler', weight: 1 }], primaryPct: 0.65, theme: 'Drowned Banshees' },
          9: { primary: [{ type: 'cursed_shackler', weight: 2 }, { type: 'drowned_banshee', weight: 2 }], support: [{ type: 'phantom_swashbuckler', weight: 1 }, { type: 'poltergeist_gunner', weight: 1 }], primaryPct: 0.6, theme: 'Ghost Elite' },
        },
      },
      {
        waves: [10],
        theme: 'ghostbeard_arena',
        boss: 'ghostbeard',
        bossComp: { theme: 'Ghostbeard', forceGolem: false, forceBoss: 'ghostbeard', support: [{ type: 'phantom_swashbuckler', count: 2 }, { type: 'poltergeist_gunner', count: 2 }, { type: 'drowned_banshee', count: 1 }, { type: 'cursed_shackler', count: 1 }] },
      },
    ],
    palette: { floor1: '#1a1a22', floor2: '#181822', wall: '#0a0a12', wallAccent: '#8866aa', accent2: '#44aacc', gridLine: '#2a2a32' },
    hazards: [],
  }),

  // Floor 4: Sea Creatures / Deep-Sea
  4: _buildFloor({
    name: 'Sunken Reef & Abyssal Trench',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'sunken_reef',
        waveComps: {
          1: { primary: [{ type: 'ink_spitter', weight: 3 }], support: [{ type: 'barnacle_bomber', weight: 1 }], primaryPct: 0.85, theme: 'Ink Spitters' },
          2: { primary: [{ type: 'coral_crusher', weight: 3 }, { type: 'ink_spitter', weight: 2 }], support: [{ type: 'barnacle_bomber', weight: 1 }], primaryPct: 0.7, theme: 'Coral Crushers' },
          3: { primary: [{ type: 'trench_tentacle', weight: 2 }, { type: 'coral_crusher', weight: 2 }], support: [{ type: 'ink_spitter', weight: 2 }, { type: 'barnacle_bomber', weight: 1 }], primaryPct: 0.6, theme: 'Trench Tentacles' },
          4: { primary: [{ type: 'barnacle_bomber', weight: 3 }, { type: 'trench_tentacle', weight: 2 }], support: [{ type: 'ink_spitter', weight: 1 }, { type: 'coral_crusher', weight: 1 }], primaryPct: 0.6, theme: 'Barnacle Bombers' },
        },
      },
      {
        waves: [5],
        theme: 'kraken_arena',
        boss: 'kraken_jim',
        bossComp: { theme: 'Kraken Jim', forceGolem: false, forceBoss: 'kraken_jim', support: [{ type: 'ink_spitter', count: 2 }, { type: 'coral_crusher', count: 2 }, { type: 'trench_tentacle', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'abyssal_trench',
        waveComps: {
          6: { primary: [{ type: 'gilded_triton', weight: 3 }], support: [{ type: 'ink_spitter', weight: 1 }], primaryPct: 0.8, theme: 'Gilded Tritons' },
          7: { primary: [{ type: 'coin_spitter_jelly', weight: 3 }, { type: 'gilded_triton', weight: 1 }], support: [{ type: 'coral_crusher', weight: 1 }], primaryPct: 0.7, theme: 'Coin-Spitter Jellies' },
          8: { primary: [{ type: 'deep_sea_dredger', weight: 3 }, { type: 'coin_spitter_jelly', weight: 1 }], support: [{ type: 'gilded_triton', weight: 1 }], primaryPct: 0.65, theme: 'Deep-Sea Dredgers' },
          9: { primary: [{ type: 'royal_cephalopod', weight: 2 }, { type: 'deep_sea_dredger', weight: 2 }], support: [{ type: 'gilded_triton', weight: 1 }, { type: 'coin_spitter_jelly', weight: 1 }], primaryPct: 0.6, theme: 'Abyssal Elite' },
        },
      },
      {
        waves: [10],
        theme: 'requill_arena',
        boss: 'king_requill',
        bossComp: { theme: 'King Requill', forceGolem: false, forceBoss: 'king_requill', support: [{ type: 'gilded_triton', count: 2 }, { type: 'coin_spitter_jelly', count: 2 }, { type: 'deep_sea_dredger', count: 1 }, { type: 'royal_cephalopod', count: 1 }] },
      },
    ],
    palette: { floor1: '#0a1a28', floor2: '#081828', wall: '#040e18', wallAccent: '#22aacc', accent2: '#ffaa22', gridLine: '#1a2a38' },
    hazards: [],
  }),

  // Floor 5: Merfolk / Ocean Deity
  5: _buildFloor({
    name: 'Coral Throne & Ocean Temple',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'coral_throne',
        waveComps: {
          1: { primary: [{ type: 'alabaster_sentinel', weight: 3 }], support: [{ type: 'reef_weaver', weight: 1 }], primaryPct: 0.8, theme: 'Alabaster Sentinels' },
          2: { primary: [{ type: 'reef_weaver', weight: 3 }, { type: 'alabaster_sentinel', weight: 1 }], support: [{ type: 'gilded_manta', weight: 1 }], primaryPct: 0.7, theme: 'Reef Weavers' },
          3: { primary: [{ type: 'gilded_manta', weight: 3 }, { type: 'reef_weaver', weight: 1 }], support: [{ type: 'alabaster_sentinel', weight: 1 }, { type: 'royal_shell_knight', weight: 1 }], primaryPct: 0.65, theme: 'Gilded Mantas' },
          4: { primary: [{ type: 'royal_shell_knight', weight: 2 }, { type: 'gilded_manta', weight: 2 }], support: [{ type: 'alabaster_sentinel', weight: 1 }, { type: 'reef_weaver', weight: 1 }], primaryPct: 0.6, theme: 'Royal Shell Knights' },
        },
      },
      {
        waves: [5],
        theme: 'siralyth_arena',
        boss: 'queen_siralyth',
        bossComp: { theme: 'Queen Siralyth', forceGolem: false, forceBoss: 'queen_siralyth', support: [{ type: 'alabaster_sentinel', count: 2 }, { type: 'reef_weaver', count: 2 }, { type: 'royal_shell_knight', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'ocean_temple',
        waveComps: {
          6: { primary: [{ type: 'sea_serpent_spawn', weight: 3 }], support: [{ type: 'gilded_manta', weight: 1 }], primaryPct: 0.8, theme: 'Sea Serpent Spawns' },
          7: { primary: [{ type: 'living_whirlpool', weight: 3 }, { type: 'sea_serpent_spawn', weight: 1 }], support: [{ type: 'reef_weaver', weight: 1 }], primaryPct: 0.7, theme: 'Living Whirlpools' },
          8: { primary: [{ type: 'bone_tooth_zealot', weight: 3 }, { type: 'living_whirlpool', weight: 1 }], support: [{ type: 'sea_serpent_spawn', weight: 1 }], primaryPct: 0.65, theme: 'Bone-Tooth Zealots' },
          9: { primary: [{ type: 'tidal_avatar', weight: 2 }, { type: 'bone_tooth_zealot', weight: 2 }], support: [{ type: 'sea_serpent_spawn', weight: 1 }, { type: 'living_whirlpool', weight: 1 }], primaryPct: 0.6, theme: 'Ocean Deity Elite' },
        },
      },
      {
        waves: [10],
        theme: 'mami_wata_arena',
        boss: 'mami_wata',
        bossComp: { theme: 'Mami Wata', forceGolem: false, forceBoss: 'mami_wata', support: [{ type: 'sea_serpent_spawn', count: 2 }, { type: 'living_whirlpool', count: 2 }, { type: 'bone_tooth_zealot', count: 1 }, { type: 'tidal_avatar', count: 1 }] },
      },
    ],
    palette: { floor1: '#0a1828', floor2: '#081628', wall: '#040e18', wallAccent: '#44ccaa', accent2: '#ffcc44', gridLine: '#1a2838' },
    hazards: [],
  }),
};

// ===================== EARTH-205: MARBLE CITY =====================
const _earth205Config = {
  1: _buildFloor({
    name: 'Scrapyard District',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'scrapyard',
        waveComps: {
          1: { primary: [{ type: 'scrap_metal_scrounger', weight: 3 }], support: [{ type: 'alleyway_lookout', weight: 1 }], primaryPct: 0.85, theme: 'Scrap Metal Scroungers' },
          2: { primary: [{ type: 'alleyway_lookout', weight: 3 }, { type: 'scrap_metal_scrounger', weight: 2 }], support: [{ type: 'junkyard_hound', weight: 1 }], primaryPct: 0.7, theme: 'Alleyway Lookouts' },
          3: { primary: [{ type: 'junkyard_hound', weight: 3 }, { type: 'alleyway_lookout', weight: 1 }], support: [{ type: 'scrap_metal_scrounger', weight: 2 }, { type: 'aerosol_pyro', weight: 1 }], primaryPct: 0.6, theme: 'Junkyard Hounds' },
          4: { primary: [{ type: 'aerosol_pyro', weight: 3 }, { type: 'junkyard_hound', weight: 2 }], support: [{ type: 'scrap_metal_scrounger', weight: 1 }, { type: 'alleyway_lookout', weight: 1 }], primaryPct: 0.6, theme: 'Aerosol Pyros' },
        },
      },
      {
        waves: [5],
        theme: 'willis_arena',
        boss: 'willis',
        bossComp: { theme: 'Willis', forceGolem: false, forceBoss: 'willis', support: [{ type: 'scrap_metal_scrounger', count: 2 }, { type: 'alleyway_lookout', count: 2 }, { type: 'aerosol_pyro', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'scrapyard_elite',
        waveComps: {
          6: { primary: [{ type: 'patchwork_thug', weight: 3 }], support: [{ type: 'scrap_metal_scrounger', weight: 1 }], primaryPct: 0.8, theme: 'Patchwork Thugs' },
          7: { primary: [{ type: 'nail_gunner', weight: 3 }, { type: 'patchwork_thug', weight: 1 }], support: [{ type: 'alleyway_lookout', weight: 1 }], primaryPct: 0.7, theme: 'Nail Gunners' },
          8: { primary: [{ type: 'adrenaline_fiend', weight: 3 }, { type: 'nail_gunner', weight: 1 }], support: [{ type: 'patchwork_thug', weight: 1 }], primaryPct: 0.65, theme: 'Adrenaline Fiends' },
          9: { primary: [{ type: 'sledgehammer_brute', weight: 2 }, { type: 'adrenaline_fiend', weight: 2 }], support: [{ type: 'patchwork_thug', weight: 1 }, { type: 'nail_gunner', weight: 1 }], primaryPct: 0.6, theme: 'Sledgehammer Brutes' },
        },
      },
      {
        waves: [10],
        theme: 'puppedrill_arena',
        boss: 'puppedrill',
        bossComp: { theme: 'Puppedrill', forceGolem: false, forceBoss: 'puppedrill', support: [{ type: 'patchwork_thug', count: 2 }, { type: 'nail_gunner', count: 2 }, { type: 'adrenaline_fiend', count: 1 }, { type: 'sledgehammer_brute', count: 1 }] },
      },
    ],
    palette: { floor1: '#1a1a12', floor2: '#181810', wall: '#0a0a06', wallAccent: '#88cc44', accent2: '#cc6622', gridLine: '#2a2a1a' },
    hazards: [],
  }),

  2: _buildFloor({
    name: 'Butcher Row',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'butcher_row',
        waveComps: {
          1: { primary: [{ type: 'butcher_block_maniac', weight: 3 }], support: [{ type: 'chain_gang_brawler', weight: 1 }], primaryPct: 0.85, theme: 'Butcher Block Maniacs' },
          2: { primary: [{ type: 'chain_gang_brawler', weight: 3 }, { type: 'butcher_block_maniac', weight: 2 }], support: [{ type: 'arsonist', weight: 1 }], primaryPct: 0.7, theme: 'Chain Gang Brawlers' },
          3: { primary: [{ type: 'arsonist', weight: 3 }, { type: 'chain_gang_brawler', weight: 1 }], support: [{ type: 'butcher_block_maniac', weight: 2 }, { type: 'executioner_bruiser', weight: 1 }], primaryPct: 0.6, theme: 'Arsonists' },
          4: { primary: [{ type: 'executioner_bruiser', weight: 3 }, { type: 'arsonist', weight: 2 }], support: [{ type: 'butcher_block_maniac', weight: 1 }, { type: 'chain_gang_brawler', weight: 1 }], primaryPct: 0.6, theme: 'Executioner Bruisers' },
        },
      },
      {
        waves: [5],
        theme: 'sackhead_arena',
        boss: 'sackhead',
        bossComp: { theme: 'Sackhead', forceGolem: false, forceBoss: 'sackhead', support: [{ type: 'butcher_block_maniac', count: 2 }, { type: 'chain_gang_brawler', count: 2 }, { type: 'arsonist', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'syndicate_ops',
        waveComps: {
          6: { primary: [{ type: 'syndicate_enforcer', weight: 3 }], support: [{ type: 'butcher_block_maniac', weight: 1 }], primaryPct: 0.8, theme: 'Syndicate Enforcers' },
          7: { primary: [{ type: 'breacher_unit', weight: 3 }, { type: 'syndicate_enforcer', weight: 1 }], support: [{ type: 'chain_gang_brawler', weight: 1 }], primaryPct: 0.7, theme: 'Breacher Units' },
          8: { primary: [{ type: 'tactical_spotter', weight: 3 }, { type: 'breacher_unit', weight: 1 }], support: [{ type: 'syndicate_enforcer', weight: 1 }], primaryPct: 0.65, theme: 'Tactical Spotters' },
          9: { primary: [{ type: 'riot_juggernaut', weight: 2 }, { type: 'tactical_spotter', weight: 2 }], support: [{ type: 'syndicate_enforcer', weight: 1 }, { type: 'breacher_unit', weight: 1 }], primaryPct: 0.6, theme: 'Riot Juggernauts' },
        },
      },
      {
        waves: [10],
        theme: 'mr_schwallie_arena',
        boss: 'mr_schwallie',
        bossComp: { theme: 'Mr. Schwallie', forceGolem: false, forceBoss: 'mr_schwallie', support: [{ type: 'syndicate_enforcer', count: 2 }, { type: 'breacher_unit', count: 2 }, { type: 'tactical_spotter', count: 1 }, { type: 'riot_juggernaut', count: 1 }] },
      },
    ],
    palette: { floor1: '#1a1216', floor2: '#181014', wall: '#0a060a', wallAccent: '#cc2244', accent2: '#667788', gridLine: '#2a2228' },
    hazards: [],
  }),

  3: _buildFloor({
    name: 'Carnival of Decay',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'carnival',
        waveComps: {
          1: { primary: [{ type: 'juggling_jester', weight: 3 }], support: [{ type: 'balloon_twister', weight: 1 }], primaryPct: 0.85, theme: 'Juggling Jesters' },
          2: { primary: [{ type: 'balloon_twister', weight: 3 }, { type: 'juggling_jester', weight: 2 }], support: [{ type: 'human_statue', weight: 1 }], primaryPct: 0.7, theme: 'Balloon Twisters' },
          3: { primary: [{ type: 'human_statue', weight: 3 }, { type: 'balloon_twister', weight: 1 }], support: [{ type: 'juggling_jester', weight: 2 }, { type: 'illusionist', weight: 1 }], primaryPct: 0.6, theme: 'Human Statues' },
          4: { primary: [{ type: 'illusionist', weight: 3 }, { type: 'human_statue', weight: 2 }], support: [{ type: 'juggling_jester', weight: 1 }, { type: 'balloon_twister', weight: 1 }], primaryPct: 0.6, theme: 'Illusionists' },
        },
      },
      {
        waves: [5],
        theme: 'killer_mime_arena',
        boss: 'killer_mime',
        bossComp: { theme: 'Killer Mime', forceGolem: false, forceBoss: 'killer_mime', support: [{ type: 'juggling_jester', count: 2 }, { type: 'balloon_twister', count: 2 }, { type: 'illusionist', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'backstage_horror',
        waveComps: {
          6: { primary: [{ type: 'stagehand_brute', weight: 3 }], support: [{ type: 'juggling_jester', weight: 1 }], primaryPct: 0.8, theme: 'Stagehand Brutes' },
          7: { primary: [{ type: 'phantom_chorus', weight: 3 }, { type: 'stagehand_brute', weight: 1 }], support: [{ type: 'balloon_twister', weight: 1 }], primaryPct: 0.7, theme: 'Phantom Chorus' },
          8: { primary: [{ type: 'prop_master', weight: 3 }, { type: 'phantom_chorus', weight: 1 }], support: [{ type: 'stagehand_brute', weight: 1 }], primaryPct: 0.65, theme: 'Prop Masters' },
          9: { primary: [{ type: 'macabre_dancer', weight: 2 }, { type: 'prop_master', weight: 2 }], support: [{ type: 'stagehand_brute', weight: 1 }, { type: 'phantom_chorus', weight: 1 }], primaryPct: 0.6, theme: 'Macabre Dancers' },
        },
      },
      {
        waves: [10],
        theme: 'major_phantom_arena',
        boss: 'major_phantom',
        bossComp: { theme: 'Major Phantom', forceGolem: false, forceBoss: 'major_phantom', support: [{ type: 'stagehand_brute', count: 2 }, { type: 'phantom_chorus', count: 2 }, { type: 'prop_master', count: 1 }, { type: 'macabre_dancer', count: 1 }] },
      },
    ],
    palette: { floor1: '#1e1228', floor2: '#1c1026', wall: '#0e0618', wallAccent: '#cc44aa', accent2: '#ddaa22', gridLine: '#2e2238' },
    hazards: [],
  }),

  4: _buildFloor({
    name: 'Casino Noir',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'casino_floor',
        waveComps: {
          1: { primary: [{ type: 'casino_pit_boss', weight: 3 }], support: [{ type: 'laser_grid_thief', weight: 1 }], primaryPct: 0.85, theme: 'Casino Pit Bosses' },
          2: { primary: [{ type: 'laser_grid_thief', weight: 3 }, { type: 'casino_pit_boss', weight: 2 }], support: [{ type: 'vault_hacker', weight: 1 }], primaryPct: 0.7, theme: 'Laser Grid Thieves' },
          3: { primary: [{ type: 'vault_hacker', weight: 3 }, { type: 'laser_grid_thief', weight: 1 }], support: [{ type: 'casino_pit_boss', weight: 2 }, { type: 'smokescreen_smuggler', weight: 1 }], primaryPct: 0.6, theme: 'Vault Hackers' },
          4: { primary: [{ type: 'smokescreen_smuggler', weight: 3 }, { type: 'vault_hacker', weight: 2 }], support: [{ type: 'casino_pit_boss', weight: 1 }, { type: 'laser_grid_thief', weight: 1 }], primaryPct: 0.6, theme: 'Smokescreen Smugglers' },
        },
      },
      {
        waves: [5],
        theme: 'lady_red_arena',
        boss: 'lady_red',
        bossComp: { theme: 'Lady Red', forceGolem: false, forceBoss: 'lady_red', support: [{ type: 'casino_pit_boss', count: 2 }, { type: 'laser_grid_thief', count: 2 }, { type: 'smokescreen_smuggler', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'mob_syndicate',
        waveComps: {
          6: { primary: [{ type: 'tracksuit_goon', weight: 3 }], support: [{ type: 'casino_pit_boss', weight: 1 }], primaryPct: 0.8, theme: 'Tracksuit Goons' },
          7: { primary: [{ type: 'disco_brawler', weight: 3 }, { type: 'tracksuit_goon', weight: 1 }], support: [{ type: 'laser_grid_thief', weight: 1 }], primaryPct: 0.7, theme: 'Disco Brawlers' },
          8: { primary: [{ type: 'tommy_gun_heavy', weight: 3 }, { type: 'disco_brawler', weight: 1 }], support: [{ type: 'tracksuit_goon', weight: 1 }], primaryPct: 0.65, theme: 'Tommy Gun Heavies' },
          9: { primary: [{ type: 'the_cleaner', weight: 2 }, { type: 'tommy_gun_heavy', weight: 2 }], support: [{ type: 'tracksuit_goon', weight: 1 }, { type: 'disco_brawler', weight: 1 }], primaryPct: 0.6, theme: 'The Cleaners' },
        },
      },
      {
        waves: [10],
        theme: 'the_boss_e205_arena',
        boss: 'the_boss_e205',
        bossComp: { theme: 'The Boss', forceGolem: false, forceBoss: 'the_boss_e205', support: [{ type: 'tracksuit_goon', count: 2 }, { type: 'disco_brawler', count: 2 }, { type: 'tommy_gun_heavy', count: 1 }, { type: 'the_cleaner', count: 1 }] },
      },
    ],
    palette: { floor1: '#1a1410', floor2: '#18120e', wall: '#0a0806', wallAccent: '#ddaa22', accent2: '#cc2222', gridLine: '#2a2420' },
    hazards: [],
  }),

  5: _buildFloor({
    name: 'Meltdown Labs',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'hazmat_zone',
        waveComps: {
          1: { primary: [{ type: 'hazmat_grunt', weight: 3 }], support: [{ type: 'sprayer_drone', weight: 1 }], primaryPct: 0.85, theme: 'Hazmat Grunts' },
          2: { primary: [{ type: 'sprayer_drone', weight: 3 }, { type: 'hazmat_grunt', weight: 2 }], support: [{ type: 'mad_assistant', weight: 1 }], primaryPct: 0.7, theme: 'Sprayer Drones' },
          3: { primary: [{ type: 'mad_assistant', weight: 3 }, { type: 'sprayer_drone', weight: 1 }], support: [{ type: 'hazmat_grunt', weight: 2 }, { type: 'chem_brute', weight: 1 }], primaryPct: 0.6, theme: 'Mad Assistants' },
          4: { primary: [{ type: 'chem_brute', weight: 3 }, { type: 'mad_assistant', weight: 2 }], support: [{ type: 'hazmat_grunt', weight: 1 }, { type: 'sprayer_drone', weight: 1 }], primaryPct: 0.6, theme: 'Chem Brutes' },
        },
      },
      {
        waves: [5],
        theme: 'lady_elixir_arena',
        boss: 'lady_elixir',
        bossComp: { theme: 'Lady Elixir', forceGolem: false, forceBoss: 'lady_elixir', support: [{ type: 'hazmat_grunt', count: 2 }, { type: 'sprayer_drone', count: 2 }, { type: 'chem_brute', count: 1 }] },
      },
      {
        waves: [6, 7, 8, 9],
        theme: 'meltdown_core',
        waveComps: {
          6: { primary: [{ type: 'sludge_crawler', weight: 3 }], support: [{ type: 'hazmat_grunt', weight: 1 }], primaryPct: 0.8, theme: 'Sludge Crawlers' },
          7: { primary: [{ type: 'irradiated_walker', weight: 3 }, { type: 'sludge_crawler', weight: 1 }], support: [{ type: 'sprayer_drone', weight: 1 }], primaryPct: 0.7, theme: 'Irradiated Walkers' },
          8: { primary: [{ type: 'lockdown_sentinel', weight: 3 }, { type: 'irradiated_walker', weight: 1 }], support: [{ type: 'sludge_crawler', weight: 1 }], primaryPct: 0.65, theme: 'Lockdown Sentinels' },
          9: { primary: [{ type: 'failed_specimen', weight: 2 }, { type: 'lockdown_sentinel', weight: 2 }], support: [{ type: 'sludge_crawler', weight: 1 }, { type: 'irradiated_walker', weight: 1 }], primaryPct: 0.6, theme: 'Failed Specimens' },
        },
      },
      {
        waves: [10],
        theme: 'nofaux_arena',
        boss: 'nofaux',
        bossComp: { theme: 'Nofaux', forceGolem: false, forceBoss: 'nofaux', support: [{ type: 'sludge_crawler', count: 2 }, { type: 'irradiated_walker', count: 2 }, { type: 'lockdown_sentinel', count: 1 }, { type: 'failed_specimen', count: 1 }] },
      },
    ],
    palette: { floor1: '#141a12', floor2: '#121810', wall: '#060a04', wallAccent: '#66cc22', accent2: '#cccc22', gridLine: '#242a22' },
    hazards: [],
  }),
};

// ===================== ASSEMBLE FLOOR_CONFIG =====================
const FLOOR_CONFIG = {
  cave: _caveConfig,
  azurine: _azurineConfig,
  vortalis: _vortalisConfig,
  dungeon_4: _earth205Config,
};

// Helper: get the wave composition for a floor-configured wave
function getFloorWaveComposition(floorConfig, waveNum) {
  for (const sub of floorConfig.subFloors) {
    if (sub.waves.includes(waveNum)) {
      // Boss wave
      if (sub.boss && sub.bossComp) {
        return sub.bossComp;
      }
      // Normal wave — look up in waveComps
      if (sub.waveComps && sub.waveComps[waveNum]) {
        return sub.waveComps[waveNum];
      }
    }
  }
  // Fallback: shouldn't happen if config is complete
  return null;
}
