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

  // Floors 2-5: added in future sessions
  // 2: { name: 'Tech District', ... },
  // 3: { name: 'Junkyard Wastes', ... },
  // 4: { name: 'Trap House & R.E.G.I.M.E', ... },
  // 5: { name: 'Infected Wastes & Dusk Realm', ... },
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
