// ===================== MOB TYPES =====================
// Shared data: mob stats, caps, crowd exemptions
// Extracted from index_2.html — Phase A, Step 2

const MOB_TYPES = {
  grunt:   { name: "Grunt",   hp: 106, speed: 2.25, damage: 18, killHeal: 10, skin: "#7a6050", hair: "#3a2a1a", shirt: "#556644", pants: "#3a3a2a", contactRange: 76 },
  runner:  { name: "Runner",  hp: 50,  speed: 2.75, damage: 10, killHeal: 3,  skin: "#8a7060", hair: "#1a1a1a", shirt: "#884444", pants: "#4a2a2a", contactRange: 74 },
  tank:    { name: "Tank",    hp: 375, speed: 2.0,  damage: 20, killHeal: 20, skin: "#6a5a50", hair: "#2a2a2a", shirt: "#445566", pants: "#2a3a4a", contactRange: 78 },
  witch:   { name: "Witch",   hp: 188, speed: 1.05, damage: 6,  killHeal: 25, skin: "#8a9a7a", hair: "#2a1a3a", shirt: "#3a2a4a", pants: "#2a1a2a", contactRange: 76, summonRate: 540, summonMax: 4 },
  skeleton:{ name: "Skeleton",hp: 38,  speed: 2.25, damage: 8,  killHeal: 1,  skin: "#d8d0c0", hair: "#d0c8b8", shirt: "#c8c0b0", pants: "#b8b0a0", contactRange: 74 },
  golem:   { name: "Golem",   hp: 1000,speed: 0.88, damage: 13, killHeal: 40, skin: "#6a6a6a", hair: "#555555", shirt: "#5a5a5a", pants: "#4a4a4a", contactRange: 82, boulderRate: 88, boulderSpeed: 8, boulderRange: 1000, summonRate: 300, summonMax: 3 },
  mini_golem: { name: "Mini Golem", hp: 120, speed: 1.15, damage: 6, killHeal: 10, skin: "#7a7a7a", hair: "#666666", shirt: "#6a6a6a", pants: "#5a5a5a", contactRange: 50, boulderRate: 140, boulderSpeed: 6, boulderRange: 500 },
  mummy:   { name: "Mummy",   hp: 56,  speed: 2.0,  damage: 0,  killHeal: 5,  skin: "#8a8580", hair: "#7a7570", shirt: "#6a6560", pants: "#5a5550", contactRange: 76, explodeRange: 140, explodeDamage: 28, fuseMin: 32, fuseMax: 96 },
  archer:  { name: "Archer",  hp: 75,  speed: 1.75, damage: 6,  killHeal: 8,  skin: "#3a3530", hair: "#0e0e0e", shirt: "#111111", pants: "#1a1a1a", contactRange: 74, arrowRate: 80, arrowSpeed: 7, arrowRange: 400, arrowBounces: 4, arrowLife: 600 },
  healer:  { name: "Healer",  hp: 81,  speed: 1.25, damage: 5,  killHeal: 15, skin: "#e8d8c8", hair: "#f0e0c0", shirt: "#eee8dd", pants: "#d8d0c0", contactRange: 74, healRadius: 220, healRate: 72, healAmount: 10 },

  // ===================== FLOOR 1: AZURINE CITY =====================
  // Levels 1-4: Gangsters & Goons
  neon_pickpocket: {
    name: "Neon Pickpocket", hp: 60, speed: 2.6, damage: 12, killHeal: 5,
    skin: "#8a7a6a", hair: "#1a1a2a", shirt: "#2a2a4a", pants: "#1a1a3a", contactRange: 74,
    ai: 'runner', _specials: ['swipe_blink'], specialCD: 420, // 7s
  },
  cyber_mugger: {
    name: "Cyber Mugger", hp: 90, speed: 2.2, damage: 16, killHeal: 8,
    skin: "#7a6a5a", hair: "#0a0a1a", shirt: "#3a3a5a", pants: "#2a2a3a", contactRange: 76,
    ai: 'grunt', _specials: ['stun_baton'], specialCD: 480, // 8s
  },
  drone_lookout: {
    name: "Drone Lookout", hp: 70, speed: 1.8, damage: 8, killHeal: 10,
    skin: "#6a6a7a", hair: "#2a2a3a", shirt: "#4a4a5a", pants: "#3a3a4a", contactRange: 74,
    ai: 'archer', _specials: ['spot_mark'], specialCD: 600, // 10s
    arrowRate: 100, arrowSpeed: 6, arrowRange: 350, arrowBounces: 0, arrowLife: 400,
    projectileStyle: 'neon_bolt',
  },
  street_chemist: {
    name: "Street Chemist", hp: 65, speed: 1.6, damage: 6, killHeal: 12,
    skin: "#8a8a7a", hair: "#3a3a2a", shirt: "#5a6a4a", pants: "#3a4a2a", contactRange: 76,
    ai: 'witch', _specials: ['gas_canister'], specialCD: 540, // 9s
    kiteRange: 320, // keeps far distance — throws canisters from safety
  },

  // Levels 6-9: Renegade Members
  renegade_bruiser: {
    name: "Renegade Bruiser", hp: 200, speed: 2.0, damage: 22, killHeal: 15,
    skin: "#6a5a4a", hair: "#1a1a1a", shirt: "#4a3a3a", pants: "#3a2a2a", contactRange: 78,
    ai: 'tank', _specials: ['ground_pound'], specialCD: 540, // 9s
  },
  renegade_shadowknife: {
    name: "Renegade Shadowknife", hp: 55, speed: 2.8, damage: 18, killHeal: 6,
    skin: "#5a5a5a", hair: "#0a0a0a", shirt: "#1a1a2a", pants: "#0a0a1a", contactRange: 74,
    ai: 'runner', _specials: ['cloak_backstab'], specialCD: 900, // 15s — less frequent cloak
  },
  renegade_demo: {
    name: "Renegade Demo", hp: 80, speed: 2.0, damage: 14, killHeal: 8,
    skin: "#7a6a5a", hair: "#2a1a1a", shirt: "#5a4a3a", pants: "#4a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['sticky_bomb'], specialCD: 720, // 12s
  },
  renegade_sniper: {
    name: "Renegade Sniper", hp: 70, speed: 1.7, damage: 10, killHeal: 10,
    skin: "#6a6a6a", hair: "#1a1a2a", shirt: "#3a3a4a", pants: "#2a2a3a", contactRange: 74,
    ai: 'archer', _specials: ['ricochet_round'], specialCD: 480, // 8s
    arrowRate: 90, arrowSpeed: 8, arrowRange: 650, arrowBounces: 1, arrowLife: 500,
    projectileStyle: 'tracer',
  },

  // Level 5 Mini-Boss: The Don
  the_don: {
    name: "The Don", hp: 800, speed: 1.2, damage: 28, killHeal: 40,
    skin: "#8a7a6a", hair: "#2a2a2a", shirt: "#3a2a1a", pants: "#2a1a0a", contactRange: 80,
    ai: 'archer', _specials: ['laser_snipe', 'tommy_burst', 'smart_mine', 'smoke_screen'],
    isBoss: true, bossScale: 1.4, specialCD: 720, // 12s — Floor 1 mini-boss
    arrowRate: 120, arrowSpeed: 7, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'golden',
    bulletColor: { main: '#ffd700', core: '#fff8dc', glow: 'rgba(255,215,0,0.3)' },
  },

  // Level 10 Boss: Velocity
  velocity: {
    name: "Velocity", hp: 1500, speed: 2.5, damage: 30, killHeal: 50,
    skin: "#7a7a8a", hair: "#0a0a2a", shirt: "#2a2a5a", pants: "#1a1a4a", contactRange: 78,
    ai: 'runner', _specials: ['phase_dash', 'bullet_time_field', 'afterimage_barrage', 'summon_renegades'],
    isBoss: true, bossScale: 1.5, specialCD: 480, // 8s between abilities (slower rotation = less summon spam)
  },

  // ===================== FLOOR 2: TECH DISTRICT → CORPORATE CORE =====================
  // Levels 11-14: Tech District
  circuit_thief: {
    name: "Circuit Thief", hp: 75, speed: 2.4, damage: 10, killHeal: 5,
    skin: "#6a8a8a", hair: "#1a2a3a", shirt: "#2a4a5a", pants: "#1a3a4a", contactRange: 74,
    ai: 'runner', _specials: ['overload_drain'], specialCD: 540, // 9s
  },
  arc_welder: {
    name: "Arc Welder", hp: 85, speed: 2.0, damage: 14, killHeal: 8,
    skin: "#7a7060", hair: "#2a1a1a", shirt: "#5a4a2a", pants: "#4a3a1a", contactRange: 76,
    ai: 'grunt', _specials: ['weld_beam'], specialCD: 600, // 10s
  },
  battery_drone: {
    name: "Battery Drone", hp: 60, speed: 2.6, damage: 12, killHeal: 5,
    skin: "#8a8a9a", hair: "#3a3a4a", shirt: "#4a4a6a", pants: "#3a3a5a", contactRange: 74,
    ai: 'runner', _specials: ['charge_pop'], specialCD: 660, // 11s
    explodeRange: 120, explodeDamage: 20, // self-destructs like mummy
  },
  coil_runner: {
    name: "Coil Runner", hp: 70, speed: 2.8, damage: 8, killHeal: 5,
    skin: "#7a8a7a", hair: "#1a2a1a", shirt: "#3a5a4a", pants: "#2a4a3a", contactRange: 74,
    ai: 'runner', _specials: ['tesla_trail'], specialCD: 720, // 12s
  },

  // Level 15 Mini-Boss: Voltmaster
  voltmaster: {
    name: "Voltmaster", hp: 1000, speed: 1.3, damage: 18, killHeal: 40,
    skin: "#5a6a8a", hair: "#1a1a3a", shirt: "#2a3a6a", pants: "#1a2a5a", contactRange: 80,
    ai: 'witch', _specials: ['chain_lightning', 'emp_pulse', 'tesla_pillars', 'magnet_snap'],
    isBoss: true, bossScale: 1.4, specialCD: 600, // 10s
    kiteRange: 280,
  },

  // Levels 16-19: Corporate Core
  suit_enforcer: {
    name: "Suit Enforcer", hp: 120, speed: 1.8, damage: 16, killHeal: 10,
    skin: "#8a7a6a", hair: "#1a1a1a", shirt: "#2a2a2a", pants: "#1a1a1a", contactRange: 78,
    ai: 'tank', _specials: ['briefcase_turret'], specialCD: 840, // 14s
  },
  compliance_officer: {
    name: "Compliance Officer", hp: 80, speed: 1.6, damage: 10, killHeal: 8,
    skin: "#9a8a7a", hair: "#2a2a2a", shirt: "#3a3a3a", pants: "#2a2a2a", contactRange: 76,
    ai: 'witch', _specials: ['red_tape_lines'], specialCD: 720, // 12s
    kiteRange: 280,
  },
  contract_assassin: {
    name: "Contract Assassin", hp: 65, speed: 2.6, damage: 20, killHeal: 6,
    skin: "#5a5a5a", hair: "#0a0a0a", shirt: "#1a1a1a", pants: "#0a0a0a", contactRange: 74,
    ai: 'runner', _specials: ['penalty_mark'], specialCD: 600, // 10s
  },
  executive_handler: {
    name: "Executive Handler", hp: 90, speed: 1.8, damage: 12, killHeal: 10,
    skin: "#8a8a7a", hair: "#2a2a1a", shirt: "#3a3a2a", pants: "#2a2a1a", contactRange: 76,
    ai: 'archer', _specials: ['drone_swarm'], specialCD: 900, // 15s
    arrowRate: 100, arrowSpeed: 6, arrowRange: 400, arrowBounces: 0, arrowLife: 450,
    projectileStyle: 'electric_bolt',
  },

  // Level 20 Boss: E-Mortis
  e_mortis: {
    name: "E-Mortis", hp: 1800, speed: 1.5, damage: 22, killHeal: 50,
    skin: "#9a8a6a", hair: "#1a1a1a", shirt: "#2a1a0a", pants: "#1a0a0a", contactRange: 80,
    ai: 'archer', _specials: ['dividend_barrage', 'hostile_takeover', 'nda_field', 'golden_parachute'],
    isBoss: true, bossScale: 1.5, specialCD: 540, // 9s
    arrowRate: 110, arrowSpeed: 7, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'golden',
    bulletColor: { main: '#c0a040', core: '#f0e0a0', glow: 'rgba(192,160,64,0.3)' },
  },

  // ===================== FLOOR 3: JUNKYARD → SWAMP MUTATION =====================
  // Levels 21-24: Junkyard Scavengers
  scrap_rat: {
    name: "Scrap Rat", hp: 80, speed: 2.2, damage: 10, killHeal: 5,
    skin: "#7a6a5a", hair: "#4a3a2a", shirt: "#5a4a3a", pants: "#4a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['scavenge_shield'], specialCD: 600, // 10s
  },
  magnet_scavenger: {
    name: "Magnet Scavenger", hp: 90, speed: 2.0, damage: 14, killHeal: 8,
    skin: "#6a5a4a", hair: "#3a2a1a", shirt: "#4a4a3a", pants: "#3a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['mag_pull'], specialCD: 660, // 11s
  },
  rust_sawman: {
    name: "Rust Sawman", hp: 85, speed: 2.4, damage: 16, killHeal: 6,
    skin: "#8a7a6a", hair: "#2a1a0a", shirt: "#6a5a3a", pants: "#5a4a2a", contactRange: 76,
    ai: 'runner', _specials: ['saw_line'], specialCD: 540, // 9s
  },
  junkyard_pyro: {
    name: "Junkyard Pyro", hp: 75, speed: 2.0, damage: 12, killHeal: 8,
    skin: "#7a7060", hair: "#2a2a1a", shirt: "#5a5030", pants: "#4a4020", contactRange: 76,
    ai: 'witch', _specials: ['oil_spill_ignite'], specialCD: 720, // 12s
    kiteRange: 300,
  },

  // Level 25 Mini-Boss: Mourn
  mourn: {
    name: "Mourn", hp: 1200, speed: 1.0, damage: 24, killHeal: 40,
    skin: "#5a5040", hair: "#3a2a1a", shirt: "#4a3a2a", pants: "#3a2a1a", contactRange: 82,
    ai: 'tank', _specials: ['pile_driver', 'grab_toss', 'rebuild', 'scrap_minions'],
    isBoss: true, bossScale: 1.5, specialCD: 600, // 10s
  },

  // Levels 26-29: Swamp Mutants
  toxic_leechling: {
    name: "Toxic Leechling", hp: 55, speed: 2.6, damage: 8, killHeal: 5,
    skin: "#4a6a4a", hair: "#2a4a2a", shirt: "#3a5a3a", pants: "#2a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['latch_drain'], specialCD: 600, // 10s
  },
  bog_stalker: {
    name: "Bog Stalker", hp: 100, speed: 2.0, damage: 18, killHeal: 10,
    skin: "#4a5a4a", hair: "#1a2a1a", shirt: "#3a4a3a", pants: "#2a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['mud_dive'], specialCD: 720, // 12s
  },
  chem_frog: {
    name: "Chem-Frog Mutant", hp: 70, speed: 1.8, damage: 10, killHeal: 8,
    skin: "#5a8a4a", hair: "#3a5a2a", shirt: "#4a7a3a", pants: "#3a6a2a", contactRange: 76,
    ai: 'witch', _specials: ['acid_spit_arc'], specialCD: 540, // 9s
    kiteRange: 300,
  },
  mosquito_drone: {
    name: "Mosquito Drone", hp: 50, speed: 2.8, damage: 6, killHeal: 5,
    skin: "#6a7a6a", hair: "#4a5a4a", shirt: "#5a6a5a", pants: "#4a5a4a", contactRange: 74,
    ai: 'runner', _specials: ['siphon_beam'], specialCD: 480, // 8s
  },

  // Level 30 Boss: Centipede
  centipede: {
    name: "Centipede", hp: 2200, speed: 1.2, damage: 20, killHeal: 50,
    skin: "#3a5a3a", hair: "#1a3a1a", shirt: "#2a4a2a", pants: "#1a3a1a", contactRange: 82,
    ai: 'witch', _specials: ['spore_cloud', 'burrow_surge', 'toxic_nursery', 'regrowth'],
    isBoss: true, bossScale: 1.6, specialCD: 600, // 10s
    kiteRange: 250,
  },

  // ===================== FLOOR 4: TRAP HOUSE → R.E.G.I.M.E =====================
  // Levels 31-34: Trap House
  tripwire_tech: {
    name: "Tripwire Tech", hp: 80, speed: 2.0, damage: 12, killHeal: 5,
    skin: "#6a6a5a", hair: "#2a2a1a", shirt: "#4a4a3a", pants: "#3a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['tripwire'], specialCD: 600, // 10s
  },
  gizmo_hound: {
    name: "Gizmo Hound", hp: 70, speed: 2.8, damage: 14, killHeal: 5,
    skin: "#8a7a5a", hair: "#5a4a2a", shirt: "#6a5a3a", pants: "#5a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['seek_mine'], specialCD: 720, // 12s
  },
  holo_jester: {
    name: "Holo Jester", hp: 75, speed: 2.2, damage: 10, killHeal: 8,
    skin: "#8a8a9a", hair: "#5a5a6a", shirt: "#7a4a8a", pants: "#5a3a6a", contactRange: 76,
    ai: 'witch', _specials: ['fake_wall'], specialCD: 840, // 14s
    kiteRange: 280,
  },
  time_prankster: {
    name: "Time Prankster", hp: 65, speed: 2.4, damage: 12, killHeal: 6,
    skin: "#7a7a8a", hair: "#3a3a5a", shirt: "#5a5a7a", pants: "#4a4a6a", contactRange: 74,
    ai: 'runner', _specials: ['rewind_tag'], specialCD: 780, // 13s
  },

  // Level 35 Mini-Boss: Game Master
  game_master: {
    name: "Game Master", hp: 1400, speed: 1.2, damage: 18, killHeal: 40,
    skin: "#9a8a9a", hair: "#3a2a4a", shirt: "#5a3a6a", pants: "#4a2a5a", contactRange: 80,
    ai: 'witch', _specials: ['trap_roulette', 'puzzle_lasers', 'loot_bait', 'remote_hack'],
    isBoss: true, bossScale: 1.4, specialCD: 720, // 12s
    kiteRange: 300,
  },

  // Levels 36-39: R.E.G.I.M.E Bots
  enforcer_drone: {
    name: "Enforcer Drone", hp: 100, speed: 2.2, damage: 14, killHeal: 8,
    skin: "#6a6a7a", hair: "#3a3a4a", shirt: "#4a4a5a", pants: "#3a3a4a", contactRange: 76,
    ai: 'grunt', _specials: ['suppress_cone'], specialCD: 480, // 8s
  },
  synth_builder: {
    name: "Synth Builder", hp: 110, speed: 1.6, damage: 10, killHeal: 10,
    skin: "#7a7a7a", hair: "#4a4a4a", shirt: "#5a5a5a", pants: "#4a4a4a", contactRange: 78,
    ai: 'tank', _specials: ['barrier_build'], specialCD: 840, // 14s
  },
  shock_trooper: {
    name: "Shock Trooper Bot", hp: 90, speed: 2.6, damage: 16, killHeal: 6,
    skin: "#5a5a6a", hair: "#2a2a3a", shirt: "#3a3a5a", pants: "#2a2a4a", contactRange: 74,
    ai: 'runner', _specials: ['rocket_dash'], specialCD: 660, // 11s
  },
  signal_jammer: {
    name: "Signal Jammer Bot", hp: 80, speed: 2.0, damage: 10, killHeal: 8,
    skin: "#6a7a6a", hair: "#3a4a3a", shirt: "#4a5a4a", pants: "#3a4a3a", contactRange: 76,
    ai: 'witch', _specials: ['emp_dome'], specialCD: 300, // 5s — frequent suppression circles
    kiteRange: 300,
  },

  // Level 40 Boss: J.U.N.Z
  junz: {
    name: "J.U.N.Z", hp: 2500, speed: 1.4, damage: 25, killHeal: 50,
    skin: "#5a5a7a", hair: "#1a1a3a", shirt: "#2a2a5a", pants: "#1a1a4a", contactRange: 82,
    ai: 'archer', _specials: ['pulse_override', 'repulsor_beam', 'nano_armor', 'drone_court'],
    isBoss: true, bossScale: 1.5, specialCD: 540, // 9s
    arrowRate: 90, arrowSpeed: 8, arrowRange: 550, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'electric_bolt',
    bulletColor: { main: '#4488ff', core: '#aaccff', glow: 'rgba(68,136,255,0.3)' },
  },

  // ===================== FLOOR 5: WASTE PLANET → SLIME/DUSK =====================
  // Levels 41-44: Waste Planet Beasts
  rabid_hyenaoid: {
    name: "Rabid Hyenaoid", hp: 90, speed: 2.6, damage: 16, killHeal: 6,
    skin: "#7a6a4a", hair: "#5a4a2a", shirt: "#6a5a3a", pants: "#5a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['bleed_maul'], specialCD: 540, // 9s
  },
  spore_stag: {
    name: "Spore Stag", hp: 100, speed: 2.2, damage: 18, killHeal: 8,
    skin: "#5a7a5a", hair: "#3a5a3a", shirt: "#4a6a4a", pants: "#3a5a3a", contactRange: 78,
    ai: 'tank', _specials: ['gore_spore_burst'], specialCD: 720, // 12s
  },
  wasteland_raptor: {
    name: "Wasteland Raptor", hp: 80, speed: 2.8, damage: 14, killHeal: 5,
    skin: "#6a5a3a", hair: "#4a3a1a", shirt: "#5a4a2a", pants: "#4a3a1a", contactRange: 74,
    ai: 'runner', _specials: ['pounce_pin'], specialCD: 600, // 10s
  },
  plague_batwing: {
    name: "Plague Batwing", hp: 60, speed: 2.4, damage: 10, killHeal: 8,
    skin: "#5a4a5a", hair: "#3a2a3a", shirt: "#4a3a4a", pants: "#3a2a3a", contactRange: 76,
    ai: 'witch', _specials: ['screech_ring'], specialCD: 780, // 13s
    kiteRange: 260,
  },

  // Level 45 Duo Mini-Boss: Lehvius + Jackman
  lehvius: {
    name: "Lehvius", hp: 1600, speed: 1.8, damage: 22, killHeal: 40,
    skin: "#4a6a4a", hair: "#1a3a1a", shirt: "#2a5a2a", pants: "#1a4a1a", contactRange: 82,
    ai: 'tank', _specials: ['symbiote_lash', 'toxic_spikes', 'adrenal_surge'],
    isBoss: true, bossScale: 1.4, specialCD: 480, // 8s
  },
  jackman: {
    name: "Jackman", hp: 1200, speed: 1.4, damage: 16, killHeal: 40,
    skin: "#6a6a8a", hair: "#3a3a5a", shirt: "#4a4a6a", pants: "#3a3a5a", contactRange: 80,
    ai: 'witch', _specials: ['absorb_barrier', 'static_orbs', 'overcharge_dump'],
    isBoss: true, bossScale: 1.3, specialCD: 600, // 10s
    kiteRange: 280,
  },

  // Levels 46-49: Slime/Dusk Creatures
  gel_swordsman: {
    name: "Gel Swordsman", hp: 85, speed: 2.4, damage: 14, killHeal: 6,
    skin: "#4a8a8a", hair: "#2a6a6a", shirt: "#3a7a7a", pants: "#2a6a6a", contactRange: 76,
    ai: 'grunt', _specials: ['slime_wave_slash'], specialCD: 480, // 8s
  },
  viscosity_mage: {
    name: "Viscosity Mage", hp: 70, speed: 1.6, damage: 8, killHeal: 10,
    skin: "#5a7a9a", hair: "#3a5a7a", shirt: "#4a6a8a", pants: "#3a5a7a", contactRange: 76,
    ai: 'witch', _specials: ['sticky_field'], specialCD: 600, // 10s
    kiteRange: 300,
  },
  core_guardian: {
    name: "Core Guardian Blob", hp: 150, speed: 1.8, damage: 12, killHeal: 10,
    skin: "#3a9a7a", hair: "#1a7a5a", shirt: "#2a8a6a", pants: "#1a7a5a", contactRange: 78,
    ai: 'tank', _specials: ['split_response'], specialCD: 9999, // passive — handled on damage
    _canSplit: true,
  },
  biolum_drone: {
    name: "Bio-Lum Drone", hp: 55, speed: 2.6, damage: 10, killHeal: 5,
    skin: "#5a8a5a", hair: "#3a6a3a", shirt: "#4a7a4a", pants: "#3a6a3a", contactRange: 74,
    ai: 'runner', _specials: ['glow_mark'], specialCD: 720, // 12s
  },

  // Level 50 Duo Boss: World Malric + Vale
  malric: {
    name: "World Malric", hp: 3000, speed: 1.6, damage: 28, killHeal: 50,
    skin: "#3a7a5a", hair: "#1a5a3a", shirt: "#2a6a4a", pants: "#1a5a3a", contactRange: 84,
    ai: 'tank', _specials: ['ooze_blade_arc', 'slime_rampart', 'melt_floor', 'summon_elite'],
    isBoss: true, bossScale: 1.6, specialCD: 480, // 8s
  },
  vale: {
    name: "Vale", hp: 2200, speed: 2.0, damage: 20, killHeal: 50,
    skin: "#4a3a5a", hair: "#2a1a3a", shirt: "#3a2a4a", pants: "#2a1a3a", contactRange: 80,
    ai: 'witch', _specials: ['shadow_teleport', 'puppet_shot', 'abyss_grasp', 'regen_veil'],
    isBoss: true, bossScale: 1.5, specialCD: 540, // 9s
    kiteRange: 280,
  },
};

// Per-type caps per wave
const MOB_CAPS = {
  grunt: 12, runner: 8, tank: 3, witch: 2, golem: 1, mini_golem: 6, mummy: 3, archer: 2, healer: 2,
  // Floor 1
  neon_pickpocket: 4, cyber_mugger: 4, drone_lookout: 3, street_chemist: 3,
  renegade_bruiser: 3, renegade_shadowknife: 4, renegade_demo: 3, renegade_sniper: 3,
  the_don: 1, velocity: 1,
  // Floor 2
  circuit_thief: 4, arc_welder: 4, battery_drone: 4, coil_runner: 4,
  suit_enforcer: 3, compliance_officer: 3, contract_assassin: 4, executive_handler: 3,
  voltmaster: 1, e_mortis: 1,
  // Floor 3
  scrap_rat: 4, magnet_scavenger: 4, rust_sawman: 4, junkyard_pyro: 3,
  toxic_leechling: 4, bog_stalker: 3, chem_frog: 3, mosquito_drone: 4,
  mourn: 1, centipede: 1,
  // Floor 4
  tripwire_tech: 4, gizmo_hound: 4, holo_jester: 3, time_prankster: 4,
  enforcer_drone: 4, synth_builder: 3, shock_trooper: 4, signal_jammer: 3,
  game_master: 1, junz: 1,
  // Floor 5
  rabid_hyenaoid: 4, spore_stag: 3, wasteland_raptor: 4, plague_batwing: 3,
  gel_swordsman: 4, viscosity_mage: 3, core_guardian: 3, biolum_drone: 4,
  lehvius: 1, jackman: 1, malric: 1, vale: 1,
};

const CROWD_EXEMPT_TYPES = new Set(["runner", "golem", "mini_golem", "archer", "healer", "drone_lookout", "renegade_sniper", "the_don",
  "executive_handler", "voltmaster", "e_mortis",
  "chem_frog", "mourn", "centipede",
  "holo_jester", "signal_jammer", "game_master", "junz",
  "plague_batwing", "viscosity_mage", "lehvius", "jackman", "malric", "vale"]);

// All entity sub-arrays a mob can carry. Used for cleanup on death + floor transitions.
const MOB_ENTITY_ARRAYS = [
  '_bombs', '_mines', '_oilPuddles', '_traps', '_oozeLines', '_rampartZones',
  '_meltTargets', '_summonedMinions', '_turrets', '_drones', '_pillars',
  '_eggs', '_lasers', '_baits', '_staticOrbs',
  '_holoClones', '_rocketDrones', '_junzBeam',
];
