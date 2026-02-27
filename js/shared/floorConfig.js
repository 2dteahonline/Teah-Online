// ===================== FLOOR CONFIG =====================
// Per-floor metadata: mob pools, palettes, wave compositions, hazard lists.
// Drives the wave system to spawn floor-specific mobs instead of the generic cycle.

const FLOOR_CONFIG = {
  1: {
    name: 'Azurine City',
    subFloors: [
      {
        waves: [1, 2, 3, 4],
        theme: 'city_streets',
        // Each wave introduces the next mob type while mixing in previous ones
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
          activateHazard: 'traffic_lane',
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
      floor1: '#2a2a3a',     // dark blue-gray base
      floor2: '#242438',     // variation
      wall: '#1a1a2a',       // dark indigo walls
      wallAccent: '#00ccff', // neon cyan accent
      accent2: '#ff00aa',    // neon pink
      gridLine: '#333348',   // subtle grid
    },
    hazards: ['neon_zap'],  // always-on hazards (traffic_lane added by boss)
  },

  2: {
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
          activateHazard: 'corner_conduit',
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
          activateHazard: 'conveyor_belt',
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
      floor1: '#1a2a2a',     // dark teal-gray base
      floor2: '#182828',     // variation
      wall: '#0a1a2a',       // dark steel-blue walls
      wallAccent: '#00ff88', // electric green accent
      accent2: '#ffaa00',    // amber warning
      gridLine: '#283838',   // subtle grid
    },
    hazards: ['corner_conduit'],
  },

  3: {
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
          activateHazard: 'magnet_crane',
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
          activateHazard: 'mud_suction',
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
      floor1: '#2a2a1a',     // dark muddy brown base
      floor2: '#282818',     // variation
      wall: '#1a1a0a',       // dark olive walls
      wallAccent: '#88aa22', // toxic green accent
      accent2: '#aa6600',    // rust orange
      gridLine: '#383828',   // subtle grid
    },
    hazards: ['magnet_crane'],
  },

  4: {
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
          activateHazard: 'pressure_plate',
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
          activateHazard: 'energy_pylon',
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
      floor1: '#2a1a2a',     // dark purple-gray base
      floor2: '#281828',     // variation
      wall: '#1a0a1a',       // dark purple walls
      wallAccent: '#ff44aa', // neon pink accent
      accent2: '#44aaff',    // electric blue
      gridLine: '#382838',   // subtle grid
    },
    hazards: ['pressure_plate'],
  },

  // ===================== FLOOR 5: WASTE PLANET → SLIME/DUSK =====================
  5: {
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
          duoBoss: 'jackman', // second boss spawns alongside
          activateHazard: 'radioactive_wind',
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
          duoBoss: 'vale', // second boss spawns alongside
          activateHazard: 'slime_tiles',
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
      floor1: '#1a2a1a',     // dark green-gray base
      floor2: '#182818',     // variation
      wall: '#0a1a0a',       // dark green walls
      wallAccent: '#44ff88', // toxic green accent
      accent2: '#aa44ff',    // dusk purple
      gridLine: '#283828',   // subtle grid
    },
    hazards: ['radioactive_wind', 'slime_tiles'],
  },
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
