// ===================== MOB TYPES =====================
// Shared data: mob stats, caps, crowd exemptions
// Extracted from index_2.html — Phase A, Step 2
// Optional per-mob physics properties (all fall back to GAME_CONFIG defaults):
//   radius           — body-blocking + collision circle in px (default: 27)
//   wallHW           — wall collision AABB half-width in px (default: 14)
//   hitboxR          — bullet hit-detection radius in px (default: 15)
//   kiteRange        — ideal kiting distance for ranged AI in px (default: 160)
//   boulderHitRadius — boulder direct-hit radius in px (default: 40)

const MOB_TYPES = {
  grunt:   { name: "Grunt",   hp: 106, speed: 3.4, damage: 18, killHeal: 10, goldReward: 2, skin: "#7a6050", hair: "#3a2a1a", shirt: "#556644", pants: "#3a3a2a", contactRange: 76, deathColors: ["#aa4444","#884444","#cc6666","#663333"] },
  runner:  { name: "Runner",  hp: 50,  speed: 4.1, damage: 10, killHeal: 3,  goldReward: 3, skin: "#8a7060", hair: "#1a1a1a", shirt: "#884444", pants: "#4a2a2a", contactRange: 74, deathColors: ["#cc6644","#aa4422","#ee8866","#883322"] },
  tank:    { name: "Tank",    hp: 375, speed: 3.0,  damage: 20, killHeal: 20, goldReward: 6, skin: "#6a5a50", hair: "#2a2a2a", shirt: "#445566", pants: "#2a3a4a", contactRange: 78, deathColors: ["#4466aa","#335588","#6688cc","#224466"] },
  witch:   { name: "Witch",   hp: 188, speed: 1.6, damage: 6,  killHeal: 25, goldReward: 7, skin: "#8a9a7a", hair: "#2a1a3a", shirt: "#3a2a4a", pants: "#2a1a2a", contactRange: 76, summonRate: 540, summonMax: 4, deathColors: ["#a060e0","#8040c0","#c080ff","#6020a0"] },
  skeleton:{ name: "Skeleton",hp: 38,  speed: 3.4, damage: 8,  killHeal: 1,  goldReward: 0, skin: "#d8d0c0", hair: "#d0c8b8", shirt: "#c8c0b0", pants: "#b8b0a0", contactRange: 74, deathColors: ["#d8d0c0","#c8c0b0","#e0d8c8","#b8b0a0"] },
  golem:   { name: "Golem",   hp: 1000,speed: 1.3, damage: 13, killHeal: 40, goldReward: 30, skin: "#6a6a6a", hair: "#555555", shirt: "#5a5a5a", pants: "#4a4a4a", contactRange: 82, boulderRate: 88, boulderSpeed: 9, boulderRange: 1000, summonRate: 300, summonMax: 3, deathColors: ["#8a8580","#6a6560","#a09a90","#585450"] },
  mini_golem: { name: "Mini Golem", hp: 120, speed: 1.7, damage: 6, killHeal: 10, goldReward: 5, skin: "#7a7a7a", hair: "#666666", shirt: "#6a6a6a", pants: "#5a5a5a", contactRange: 50, boulderRate: 140, boulderSpeed: 9, boulderRange: 500, deathColors: ["#9a9590","#7a7570","#b0aaa0","#686460"] },
  mummy:   { name: "Mummy",   hp: 56,  speed: 3.0,  damage: 0,  killHeal: 5,  goldReward: 3, skin: "#8a8580", hair: "#7a7570", shirt: "#6a6560", pants: "#5a5550", contactRange: 76, explodeRange: 140, explodeDamage: 28, fuseMin: 32, fuseMax: 96, deathColors: ["#c8b878","#a89858","#e0d098","#887838"] },
  archer:  { name: "Archer",  hp: 75,  speed: 2.6, damage: 6,  killHeal: 8,  goldReward: 4, skin: "#3a3530", hair: "#0e0e0e", shirt: "#111111", pants: "#1a1a1a", contactRange: 74, arrowRate: 80, arrowSpeed: 9, arrowRange: 400, arrowBounces: 4, arrowLife: 600, deathColors: ["#30ff20","#1a1a1a","#0e0e0e","#20cc10"] },
  healer:  { name: "Healer",  hp: 81,  speed: 1.9, damage: 5,  killHeal: 15, goldReward: 5, skin: "#e8d8c8", hair: "#f0e0c0", shirt: "#eee8dd", pants: "#d8d0c0", contactRange: 74, healRadius: 220, healRate: 72, healAmount: 10, deathColors: ["#ffdd30","#ffe870","#ffc800","#ffee90"] },

  // ===================== FLOOR 1: AZURINE CITY =====================
  // Levels 1-4: Gangsters & Goons
  neon_pickpocket: {
    name: "Neon Pickpocket", hp: 60, speed: 3.9, damage: 12, killHeal: 5, goldReward: 3,
    skin: "#8a7a6a", hair: "#1a1a2a", shirt: "#2a2a4a", pants: "#1a1a3a", contactRange: 74,
    ai: 'runner', _specials: ['swipe_blink'], specialCD: 420, // 7s
  },
  cyber_mugger: {
    name: "Cyber Mugger", hp: 90, speed: 3.3, damage: 16, killHeal: 8, goldReward: 4,
    skin: "#7a6a5a", hair: "#0a0a1a", shirt: "#3a3a5a", pants: "#2a2a3a", contactRange: 76,
    ai: 'grunt', _specials: ['stun_baton'], specialCD: 480, // 8s
  },
  drone_lookout: {
    name: "Drone Lookout", hp: 70, speed: 2.7, damage: 8, killHeal: 10, goldReward: 4,
    skin: "#6a6a7a", hair: "#2a2a3a", shirt: "#4a4a5a", pants: "#3a3a4a", contactRange: 74,
    ai: 'archer', _specials: ['spot_mark'], specialCD: 600, // 10s
    arrowRate: 100, arrowSpeed: 9, arrowRange: 350, arrowBounces: 0, arrowLife: 400,
    projectileStyle: 'neon_bolt',
  },
  street_chemist: {
    name: "Street Chemist", hp: 65, speed: 2.4, damage: 6, killHeal: 12, goldReward: 5,
    skin: "#8a8a7a", hair: "#3a3a2a", shirt: "#5a6a4a", pants: "#3a4a2a", contactRange: 76,
    ai: 'witch', _specials: ['gas_canister'], specialCD: 540, // 9s
    kiteRange: 320, // keeps far distance — throws canisters from safety
  },

  // Levels 6-9: Renegade Members
  renegade_bruiser: {
    name: "Renegade Bruiser", hp: 200, speed: 3.0, damage: 22, killHeal: 15, goldReward: 6,
    skin: "#6a5a4a", hair: "#1a1a1a", shirt: "#4a3a3a", pants: "#3a2a2a", contactRange: 78,
    ai: 'tank', _specials: ['ground_pound'], specialCD: 540, // 9s
  },
  renegade_shadowknife: {
    name: "Renegade Shadowknife", hp: 55, speed: 4.2, damage: 18, killHeal: 6, goldReward: 4,
    skin: "#5a5a5a", hair: "#0a0a0a", shirt: "#1a1a2a", pants: "#0a0a1a", contactRange: 74,
    ai: 'runner', _specials: ['cloak_backstab'], specialCD: 900, // 15s — less frequent cloak
  },
  renegade_demo: {
    name: "Renegade Demo", hp: 80, speed: 3.0, damage: 14, killHeal: 8, goldReward: 5,
    skin: "#7a6a5a", hair: "#2a1a1a", shirt: "#5a4a3a", pants: "#4a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['sticky_bomb'], specialCD: 720, // 12s
  },
  renegade_sniper: {
    name: "Renegade Sniper", hp: 70, speed: 2.6, damage: 10, killHeal: 10, goldReward: 5,
    skin: "#6a6a6a", hair: "#1a1a2a", shirt: "#3a3a4a", pants: "#2a2a3a", contactRange: 74,
    ai: 'archer', _specials: ['ricochet_round'], specialCD: 480, // 8s
    arrowRate: 90, arrowSpeed: 9, arrowRange: 650, arrowBounces: 1, arrowLife: 500,
    projectileStyle: 'tracer',
  },

  // Level 5 Mini-Boss: The Don
  the_don: {
    name: "The Don", hp: 800, speed: 1.8, damage: 28, killHeal: 40, goldReward: 25,
    skin: "#8a7a6a", hair: "#2a2a2a", shirt: "#3a2a1a", pants: "#2a1a0a", contactRange: 80,
    ai: 'archer', _specials: ['laser_snipe', 'tommy_burst', 'smart_mine', 'smoke_screen'],
    isBoss: true, bossScale: 1.4, specialCD: 720, // 12s — Floor 1 mini-boss
    arrowRate: 120, arrowSpeed: 9, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    bulletSpeed: 9,
    projectileStyle: 'golden',
    bulletColor: { main: '#ffd700', core: '#fff8dc', glow: 'rgba(255,215,0,0.3)' },
  },

  // Level 10 Boss: Velocity
  velocity: {
    name: "Velocity", hp: 1500, speed: 3.8, damage: 30, killHeal: 50, goldReward: 40,
    skin: "#7a7a8a", hair: "#0a0a2a", shirt: "#2a2a5a", pants: "#1a1a4a", contactRange: 78,
    ai: 'runner', _specials: ['phase_dash', 'bullet_time_field', 'afterimage_barrage', 'summon_renegades'],
    isBoss: true, bossScale: 1.5, specialCD: 480, // 8s between abilities (slower rotation = less summon spam)
  },

  // ===================== FLOOR 2: TECH DISTRICT → CORPORATE CORE =====================
  // Levels 11-14: Tech District
  circuit_thief: {
    name: "Circuit Thief", hp: 75, speed: 3.6, damage: 10, killHeal: 5, goldReward: 4,
    skin: "#6a8a8a", hair: "#1a2a3a", shirt: "#2a4a5a", pants: "#1a3a4a", contactRange: 74,
    ai: 'runner', _specials: ['overload_drain'], specialCD: 540, // 9s
  },
  arc_welder: {
    name: "Arc Welder", hp: 85, speed: 3.0, damage: 14, killHeal: 8, goldReward: 5,
    skin: "#7a7060", hair: "#2a1a1a", shirt: "#5a4a2a", pants: "#4a3a1a", contactRange: 76,
    ai: 'grunt', _specials: ['weld_beam'], specialCD: 600, // 10s
  },
  battery_drone: {
    name: "Battery Drone", hp: 60, speed: 3.9, damage: 12, killHeal: 5, goldReward: 3,
    skin: "#8a8a9a", hair: "#3a3a4a", shirt: "#4a4a6a", pants: "#3a3a5a", contactRange: 74,
    ai: 'runner', _specials: ['charge_pop'], specialCD: 660, // 11s
    explodeRange: 120, explodeDamage: 20, // self-destructs like mummy
  },
  coil_runner: {
    name: "Coil Runner", hp: 70, speed: 4.2, damage: 8, killHeal: 5, goldReward: 4,
    skin: "#7a8a7a", hair: "#1a2a1a", shirt: "#3a5a4a", pants: "#2a4a3a", contactRange: 74,
    ai: 'runner', _specials: ['tesla_trail'], specialCD: 720, // 12s
  },

  // Level 15 Mini-Boss: Voltmaster
  voltmaster: {
    name: "Voltmaster", hp: 1000, speed: 2.0, damage: 18, killHeal: 40, goldReward: 30,
    skin: "#5a6a8a", hair: "#1a1a3a", shirt: "#2a3a6a", pants: "#1a2a5a", contactRange: 80,
    ai: 'witch', _specials: ['chain_lightning', 'emp_pulse', 'tesla_pillars', 'magnet_snap'],
    isBoss: true, bossScale: 1.4, specialCD: 600, // 10s
    kiteRange: 280,
  },

  // Levels 16-19: Corporate Core
  suit_enforcer: {
    name: "Suit Enforcer", hp: 120, speed: 2.7, damage: 16, killHeal: 10, goldReward: 6,
    skin: "#8a7a6a", hair: "#1a1a1a", shirt: "#2a2a2a", pants: "#1a1a1a", contactRange: 78,
    ai: 'tank', _specials: ['briefcase_turret'], specialCD: 840, // 14s
    bulletSpeed: 9,
  },
  compliance_officer: {
    name: "Compliance Officer", hp: 80, speed: 2.4, damage: 10, killHeal: 8, goldReward: 5,
    skin: "#9a8a7a", hair: "#2a2a2a", shirt: "#3a3a3a", pants: "#2a2a2a", contactRange: 76,
    ai: 'witch', _specials: ['red_tape_lines'], specialCD: 720, // 12s
    kiteRange: 280,
  },
  contract_assassin: {
    name: "Contract Assassin", hp: 65, speed: 3.9, damage: 20, killHeal: 6, goldReward: 5,
    skin: "#5a5a5a", hair: "#0a0a0a", shirt: "#1a1a1a", pants: "#0a0a0a", contactRange: 74,
    ai: 'runner', _specials: ['penalty_mark'], specialCD: 600, // 10s
  },
  executive_handler: {
    name: "Executive Handler", hp: 90, speed: 2.7, damage: 12, killHeal: 10, goldReward: 6,
    skin: "#8a8a7a", hair: "#2a2a1a", shirt: "#3a3a2a", pants: "#2a2a1a", contactRange: 76,
    ai: 'archer', _specials: ['drone_swarm'], specialCD: 900, // 15s
    arrowRate: 100, arrowSpeed: 9, arrowRange: 400, arrowBounces: 0, arrowLife: 450,
    projectileStyle: 'electric_bolt',
  },

  // Level 20 Boss: E-Mortis
  e_mortis: {
    name: "E-Mortis", hp: 1800, speed: 2.3, damage: 22, killHeal: 50, goldReward: 45,
    skin: "#9a8a6a", hair: "#1a1a1a", shirt: "#2a1a0a", pants: "#1a0a0a", contactRange: 80,
    ai: 'archer', _specials: ['dividend_barrage', 'hostile_takeover', 'nda_field', 'golden_parachute'],
    isBoss: true, bossScale: 1.5, specialCD: 540, // 9s
    arrowRate: 110, arrowSpeed: 9, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    bulletSpeed: 9,
    projectileStyle: 'golden',
    bulletColor: { main: '#c0a040', core: '#f0e0a0', glow: 'rgba(192,160,64,0.3)' },
  },

  // ===================== FLOOR 3: JUNKYARD → SWAMP MUTATION =====================
  // Levels 21-24: Junkyard Scavengers
  scrap_rat: {
    name: "Scrap Rat", hp: 80, speed: 3.3, damage: 10, killHeal: 5, goldReward: 4,
    skin: "#7a6a5a", hair: "#4a3a2a", shirt: "#5a4a3a", pants: "#4a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['scavenge_shield'], specialCD: 600, // 10s
  },
  magnet_scavenger: {
    name: "Magnet Scavenger", hp: 90, speed: 3.0, damage: 14, killHeal: 8, goldReward: 5,
    skin: "#6a5a4a", hair: "#3a2a1a", shirt: "#4a4a3a", pants: "#3a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['mag_pull'], specialCD: 660, // 11s
  },
  rust_sawman: {
    name: "Rust Sawman", hp: 85, speed: 3.6, damage: 16, killHeal: 6, goldReward: 5,
    skin: "#8a7a6a", hair: "#2a1a0a", shirt: "#6a5a3a", pants: "#5a4a2a", contactRange: 76,
    ai: 'runner', _specials: ['saw_line'], specialCD: 540, // 9s
    bulletSpeed: 9,
  },
  junkyard_pyro: {
    name: "Junkyard Pyro", hp: 75, speed: 3.0, damage: 12, killHeal: 8, goldReward: 5,
    skin: "#7a7060", hair: "#2a2a1a", shirt: "#5a5030", pants: "#4a4020", contactRange: 76,
    ai: 'witch', _specials: ['oil_spill_ignite'], specialCD: 720, // 12s
    kiteRange: 300,
  },

  // Level 25 Mini-Boss: Mourn
  mourn: {
    name: "Mourn", hp: 1200, speed: 1.5, damage: 24, killHeal: 40, goldReward: 35,
    skin: "#5a5040", hair: "#3a2a1a", shirt: "#4a3a2a", pants: "#3a2a1a", contactRange: 82,
    ai: 'tank', _specials: ['pile_driver', 'grab_toss', 'rebuild', 'scrap_minions'],
    isBoss: true, bossScale: 1.5, specialCD: 600, // 10s
  },

  // Levels 26-29: Swamp Mutants
  toxic_leechling: {
    name: "Toxic Leechling", hp: 55, speed: 3.9, damage: 8, killHeal: 5, goldReward: 3,
    skin: "#4a6a4a", hair: "#2a4a2a", shirt: "#3a5a3a", pants: "#2a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['latch_drain'], specialCD: 600, // 10s
  },
  bog_stalker: {
    name: "Bog Stalker", hp: 100, speed: 3.0, damage: 18, killHeal: 10, goldReward: 6,
    skin: "#4a5a4a", hair: "#1a2a1a", shirt: "#3a4a3a", pants: "#2a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['mud_dive'], specialCD: 720, // 12s
  },
  chem_frog: {
    name: "Chem-Frog Mutant", hp: 70, speed: 2.7, damage: 10, killHeal: 8, goldReward: 5,
    skin: "#5a8a4a", hair: "#3a5a2a", shirt: "#4a7a3a", pants: "#3a6a2a", contactRange: 76,
    ai: 'witch', _specials: ['acid_spit_arc'], specialCD: 540, // 9s
    kiteRange: 300,
  },
  mosquito_drone: {
    name: "Mosquito Drone", hp: 50, speed: 4.2, damage: 6, killHeal: 5, goldReward: 3,
    skin: "#6a7a6a", hair: "#4a5a4a", shirt: "#5a6a5a", pants: "#4a5a4a", contactRange: 74,
    ai: 'runner', _specials: ['siphon_beam'], specialCD: 480, // 8s
  },

  // Level 30 Boss: Centipede
  centipede: {
    name: "Centipede", hp: 2200, speed: 1.8, damage: 20, killHeal: 50, goldReward: 50,
    skin: "#3a5a3a", hair: "#1a3a1a", shirt: "#2a4a2a", pants: "#1a3a1a", contactRange: 82,
    ai: 'witch', _specials: ['spore_cloud', 'burrow_surge', 'toxic_nursery', 'regrowth'],
    isBoss: true, bossScale: 1.6, specialCD: 600, // 10s
    kiteRange: 250,
  },

  // ===================== FLOOR 4: TRAP HOUSE → R.E.G.I.M.E =====================
  // Levels 31-34: Trap House
  tripwire_tech: {
    name: "Tripwire Tech", hp: 80, speed: 3.0, damage: 12, killHeal: 5, goldReward: 5,
    skin: "#6a6a5a", hair: "#2a2a1a", shirt: "#4a4a3a", pants: "#3a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['tripwire'], specialCD: 600, // 10s
  },
  gizmo_hound: {
    name: "Gizmo Hound", hp: 70, speed: 4.2, damage: 14, killHeal: 5, goldReward: 4,
    skin: "#8a7a5a", hair: "#5a4a2a", shirt: "#6a5a3a", pants: "#5a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['seek_mine'], specialCD: 720, // 12s
  },
  holo_jester: {
    name: "Holo Jester", hp: 75, speed: 3.3, damage: 10, killHeal: 8, goldReward: 5,
    skin: "#8a8a9a", hair: "#5a5a6a", shirt: "#7a4a8a", pants: "#5a3a6a", contactRange: 76,
    ai: 'witch', _specials: ['fake_wall'], specialCD: 840, // 14s
    kiteRange: 280,
  },
  time_prankster: {
    name: "Time Prankster", hp: 65, speed: 3.6, damage: 12, killHeal: 6, goldReward: 5,
    skin: "#7a7a8a", hair: "#3a3a5a", shirt: "#5a5a7a", pants: "#4a4a6a", contactRange: 74,
    ai: 'runner', _specials: ['rewind_tag'], specialCD: 780, // 13s
  },

  // Level 35 Mini-Boss: Game Master
  game_master: {
    name: "Game Master", hp: 1400, speed: 1.8, damage: 18, killHeal: 40, goldReward: 40,
    skin: "#9a8a9a", hair: "#3a2a4a", shirt: "#5a3a6a", pants: "#4a2a5a", contactRange: 80,
    ai: 'witch', _specials: ['trap_roulette', 'puzzle_lasers', 'loot_bait', 'remote_hack'],
    isBoss: true, bossScale: 1.4, specialCD: 720, // 12s
    kiteRange: 300,
  },

  // Levels 36-39: R.E.G.I.M.E Bots
  enforcer_drone: {
    name: "Enforcer Drone", hp: 100, speed: 3.3, damage: 14, killHeal: 8, goldReward: 6,
    skin: "#6a6a7a", hair: "#3a3a4a", shirt: "#4a4a5a", pants: "#3a3a4a", contactRange: 76,
    ai: 'grunt', _specials: ['suppress_cone'], specialCD: 480, // 8s
  },
  synth_builder: {
    name: "Synth Builder", hp: 110, speed: 2.4, damage: 10, killHeal: 10, goldReward: 6,
    skin: "#7a7a7a", hair: "#4a4a4a", shirt: "#5a5a5a", pants: "#4a4a4a", contactRange: 78,
    ai: 'tank', _specials: ['barrier_build'], specialCD: 840, // 14s
  },
  shock_trooper: {
    name: "Shock Trooper Bot", hp: 90, speed: 3.9, damage: 16, killHeal: 6, goldReward: 5,
    skin: "#5a5a6a", hair: "#2a2a3a", shirt: "#3a3a5a", pants: "#2a2a4a", contactRange: 74,
    ai: 'runner', _specials: ['rocket_dash'], specialCD: 660, // 11s
  },
  signal_jammer: {
    name: "Signal Jammer Bot", hp: 80, speed: 3.0, damage: 10, killHeal: 8, goldReward: 5,
    skin: "#6a7a6a", hair: "#3a4a3a", shirt: "#4a5a4a", pants: "#3a4a3a", contactRange: 76,
    ai: 'witch', _specials: ['emp_dome'], specialCD: 300, // 5s — frequent suppression circles
    kiteRange: 300,
  },

  // Level 40 Boss: J.U.N.Z
  junz: {
    name: "J.U.N.Z", hp: 2500, speed: 2.1, damage: 25, killHeal: 50, goldReward: 55,
    skin: "#5a5a7a", hair: "#1a1a3a", shirt: "#2a2a5a", pants: "#1a1a4a", contactRange: 82,
    ai: 'archer', _specials: ['pulse_override', 'repulsor_beam', 'nano_armor', 'drone_court'],
    isBoss: true, bossScale: 1.5, specialCD: 540, // 9s
    arrowRate: 90, arrowSpeed: 9, arrowRange: 550, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'electric_bolt',
    bulletColor: { main: '#4488ff', core: '#aaccff', glow: 'rgba(68,136,255,0.3)' },
  },

  // ===================== FLOOR 5: WASTE PLANET → SLIME/DUSK =====================
  // Levels 41-44: Waste Planet Beasts
  rabid_hyenaoid: {
    name: "Rabid Hyenaoid", hp: 105, speed: 4.1, damage: 18, killHeal: 6, goldReward: 5,
    skin: "#7a6a4a", hair: "#5a4a2a", shirt: "#6a5a3a", pants: "#5a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['bleed_maul'], specialCD: 360, // 6s — aggressive dasher
  },
  spore_stag: {
    name: "Spore Stag", hp: 120, speed: 3.5, damage: 20, killHeal: 8, goldReward: 6,
    skin: "#5a7a5a", hair: "#3a5a3a", shirt: "#4a6a4a", pants: "#3a5a3a", contactRange: 78,
    ai: 'tank', _specials: ['gore_spore_burst'], specialCD: 480, // 8s — charge + spore zones
  },
  wasteland_raptor: {
    name: "Wasteland Raptor", hp: 95, speed: 4.4, damage: 16, killHeal: 5, goldReward: 4,
    skin: "#6a5a3a", hair: "#4a3a1a", shirt: "#5a4a2a", pants: "#4a3a1a", contactRange: 74,
    ai: 'runner', _specials: ['pounce_pin'], specialCD: 420, // 7s — fast pouncer
  },
  plague_batwing: {
    name: "Plague Batwing", hp: 70, speed: 3.8, damage: 12, killHeal: 8, goldReward: 5,
    skin: "#5a4a5a", hair: "#3a2a3a", shirt: "#4a3a4a", pants: "#3a2a3a", contactRange: 76,
    ai: 'witch', _specials: ['screech_ring'], specialCD: 480, // 8s — area denial screech
    kiteRange: 260,
  },

  // Level 45 Duo Mini-Boss: Lehvius + Jackman
  lehvius: {
    name: "Lehvius", hp: 1900, speed: 2.9, damage: 26, killHeal: 40, goldReward: 45,
    skin: "#4a6a4a", hair: "#1a3a1a", shirt: "#2a5a2a", pants: "#1a4a1a", contactRange: 82,
    ai: 'tank', _specials: ['symbiote_lash', 'toxic_spikes', 'adrenal_surge'],
    isBoss: true, bossScale: 1.4, specialCD: 360, // 6s — aggressive boss
  },
  jackman: {
    name: "Jackman", hp: 1500, speed: 2.3, damage: 19, killHeal: 40, goldReward: 40,
    skin: "#6a6a8a", hair: "#3a3a5a", shirt: "#4a4a6a", pants: "#3a3a5a", contactRange: 80,
    ai: 'witch', _specials: ['absorb_barrier', 'static_orbs', 'overcharge_dump'],
    isBoss: true, bossScale: 1.3, specialCD: 420, // 7s — electric boss
    kiteRange: 280,
  },

  // Levels 46-49: Slime/Dusk Creatures
  gel_swordsman: {
    name: "Gel Swordsman", hp: 100, speed: 3.8, damage: 16, killHeal: 6, goldReward: 5,
    skin: "#4a8a8a", hair: "#2a6a6a", shirt: "#3a7a7a", pants: "#2a6a6a", contactRange: 76,
    ai: 'grunt', _specials: ['slime_wave_slash'], specialCD: 320, // 5.3s — aggressive slasher
  },
  viscosity_mage: {
    name: "Viscosity Mage", hp: 80, speed: 2.6, damage: 10, killHeal: 10, goldReward: 5,
    skin: "#5a7a9a", hair: "#3a5a7a", shirt: "#4a6a8a", pants: "#3a5a7a", contactRange: 76,
    ai: 'witch', _specials: ['sticky_field'], specialCD: 420, // 7s — zone control mage
    kiteRange: 300,
  },
  core_guardian: {
    name: "Core Guardian Blob", hp: 175, speed: 2.9, damage: 14, killHeal: 10, goldReward: 7,
    skin: "#3a9a7a", hair: "#1a7a5a", shirt: "#2a8a6a", pants: "#1a7a5a", contactRange: 78,
    ai: 'tank', _specials: ['split_response'], specialCD: 9999, // passive — handled on damage
    _canSplit: true,
  },
  biolum_drone: {
    name: "Bio-Lum Drone", hp: 65, speed: 4.1, damage: 12, killHeal: 5, goldReward: 4,
    skin: "#5a8a5a", hair: "#3a6a3a", shirt: "#4a7a4a", pants: "#3a6a3a", contactRange: 74,
    ai: 'runner', _specials: ['glow_mark'], specialCD: 420, // 7s — fast marker
  },

  // Level 50 Duo Boss: World Malric + Vale
  malric: {
    name: "World Malric", hp: 3600, speed: 2.6, damage: 32, killHeal: 50, goldReward: 60,
    skin: "#3a7a5a", hair: "#1a5a3a", shirt: "#2a6a4a", pants: "#1a5a3a", contactRange: 84,
    ai: 'tank', _specials: ['ooze_blade_arc', 'slime_rampart', 'melt_floor', 'summon_elite'],
    isBoss: true, bossScale: 1.6, specialCD: 360, // 6s — relentless final boss
  },
  vale: {
    name: "Vale", hp: 2600, speed: 3.2, damage: 24, killHeal: 50, goldReward: 55,
    skin: "#4a3a5a", hair: "#2a1a3a", shirt: "#3a2a4a", pants: "#2a1a3a", contactRange: 80,
    ai: 'witch', _specials: ['shadow_teleport', 'puppet_shot', 'abyss_grasp', 'regen_veil'],
    isBoss: true, bossScale: 1.5, specialCD: 360, // 6s — aggressive shadow boss
    kiteRange: 280,
  },

  // ===================== VORTALIS FLOOR 1: PIRATE / NAVAL =====================
  // Section A — Pirates (waves 1-4)
  bilge_rat: {
    name: "Bilge Rat", hp: 60, speed: 3.9, damage: 10, killHeal: 5, goldReward: 3,
    skin: "#8a7060", hair: "#3a2a1a", shirt: "#5a4030", pants: "#4a3020", contactRange: 74,
    ai: 'runner', _specials: ['shiv_lunge'], specialCD: 420,
    deathColors: ["#8a7060","#5a4030","#aa9070","#3a2010"],
  },
  powder_keg: {
    name: "Powder Keg", hp: 90, speed: 3.0, damage: 14, killHeal: 8, goldReward: 4,
    skin: "#8a7060", hair: "#2a1a0a", shirt: "#6a5040", pants: "#4a3020", contactRange: 76,
    ai: 'grunt', _specials: ['barrel_drop'], specialCD: 600,
    deathColors: ["#8a7060","#6a5040","#aa9070","#4a3020"],
  },
  deckhand_shooter: {
    name: "Deckhand Shooter", hp: 70, speed: 2.6, damage: 8, killHeal: 10, goldReward: 4,
    skin: "#8a7060", hair: "#1a1a1a", shirt: "#4a3a2a", pants: "#3a2a1a", contactRange: 74,
    ai: 'archer', _specials: ['scattershot'], specialCD: 540,
    arrowRate: 100, arrowSpeed: 9, arrowRange: 350, arrowBounces: 0, arrowLife: 400,
    projectileStyle: 'musket',
    deathColors: ["#8a7060","#4a3a2a","#aa9070","#3a2a1a"],
  },
  anchor_hauler: {
    name: "Anchor Hauler", hp: 150, speed: 2.4, damage: 18, killHeal: 15, goldReward: 6,
    skin: "#8a7060", hair: "#1a1a1a", shirt: "#3a3020", pants: "#2a2010", contactRange: 78,
    ai: 'tank', _specials: ['anchor_sweep'], specialCD: 660,
    deathColors: ["#8a7060","#3a3020","#aa9070","#2a2010"],
  },

  // Vortalis Floor 1 — Boss: Captain Husa
  captain_husa: {
    name: "Captain Husa", hp: 900, speed: 2.0, damage: 22, killHeal: 40, goldReward: 25,
    skin: "#8a7060", hair: "#2a1a0a", shirt: "#5a3020", pants: "#3a2010", contactRange: 80,
    ai: 'archer', _specials: ['flintlock_volley', 'cutlass_cleave', 'call_to_arms', 'weathered_resolve', 'boarding_rush'],
    isBoss: true, bossScale: 1.4, specialCD: 600,
    arrowRate: 110, arrowSpeed: 9, arrowRange: 450, arrowBounces: 0, arrowLife: 450,
    projectileStyle: 'musket',
    deathColors: ["#8a7060","#5a3020","#aa9070","#3a2010"],
  },

  // Section B — Naval (waves 6-9)
  ironclad_marine: {
    name: "Ironclad Marine", hp: 180, speed: 2.7, damage: 20, killHeal: 15, goldReward: 6,
    skin: "#7a8a8a", hair: "#1a1a2a", shirt: "#2a3a5a", pants: "#1a2a4a", contactRange: 78,
    ai: 'tank', _specials: ['tower_shield'], specialCD: 720,
    _frontalShield: true,
    deathColors: ["#7a8a8a","#2a3a5a","#9aaaba","#1a2a4a"],
  },
  tidecaller_mystic: {
    name: "Tidecaller Mystic", hp: 80, speed: 2.4, damage: 10, killHeal: 12, goldReward: 5,
    skin: "#7a8a8a", hair: "#2a2a3a", shirt: "#3a4a6a", pants: "#2a3a5a", contactRange: 76,
    ai: 'witch', _specials: ['water_geyser'], specialCD: 540,
    kiteRange: 300,
    deathColors: ["#7a8a8a","#3a4a6a","#9aaaba","#2a3a5a"],
  },
  galleon_sniper: {
    name: "Galleon Sniper", hp: 70, speed: 2.6, damage: 10, killHeal: 10, goldReward: 5,
    skin: "#7a8a8a", hair: "#1a1a1a", shirt: "#2a2a4a", pants: "#1a1a3a", contactRange: 74,
    ai: 'archer', _specials: ['piercing_musket'], specialCD: 480,
    arrowRate: 90, arrowSpeed: 9, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'musket',
    deathColors: ["#7a8a8a","#2a2a4a","#9aaaba","#1a1a3a"],
  },
  sunken_dreadnought: {
    name: "Sunken Dreadnought", hp: 220, speed: 2.1, damage: 24, killHeal: 15, goldReward: 7,
    skin: "#7a8a8a", hair: "#1a1a2a", shirt: "#1a2a3a", pants: "#0a1a2a", contactRange: 78,
    ai: 'tank', _specials: ['reckless_charge'], specialCD: 720,
    deathColors: ["#7a8a8a","#1a2a3a","#9aaaba","#0a1a2a"],
  },

  // Vortalis Floor 1 — Boss: Admiral Von Kael
  admiral_von_kael: {
    name: "Admiral Von Kael", hp: 1200, speed: 1.8, damage: 24, killHeal: 40, goldReward: 30,
    skin: "#7a8a8a", hair: "#1a1a2a", shirt: "#1a2a4a", pants: "#0a1a3a", contactRange: 80,
    ai: 'archer', _specials: ['naval_artillery', 'spectral_chain_binding', 'tattered_tide', 'command_authority', 'admirals_resolve'],
    isBoss: true, bossScale: 1.5, specialCD: 540,
    arrowRate: 100, arrowSpeed: 9, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'cannonball',
    bulletColor: { main: '#8a8a8a', core: '#cccccc', glow: 'rgba(138,138,138,0.3)' },
    deathColors: ["#7a8a8a","#1a2a4a","#9aaaba","#0a1a3a"],
  },

  // ===================== VORTALIS FLOOR 2: JUNGLE / BLOOD =====================
  // Section A — Jungle (waves 1-4)
  jungle_headhunter: {
    name: "Jungle Headhunter", hp: 80, speed: 4.0, damage: 14, killHeal: 5, goldReward: 4,
    skin: "#5a4030", hair: "#1a1a0a", shirt: "#3a5a2a", pants: "#2a4a1a", contactRange: 74,
    ai: 'runner', _specials: ['spear_dash'], specialCD: 420,
    deathColors: ["#5a4030","#3a5a2a","#7a6050","#2a4a1a"],
  },
  voodoo_creeper: {
    name: "Voodoo Creeper", hp: 70, speed: 2.4, damage: 8, killHeal: 12, goldReward: 5,
    skin: "#5a4030", hair: "#2a1a0a", shirt: "#4a3a1a", pants: "#3a2a0a", contactRange: 76,
    ai: 'witch', _specials: ['toxic_trail'], specialCD: 540,
    kiteRange: 320,
    deathColors: ["#5a4030","#4a3a1a","#7a6050","#3a2a0a"],
  },
  canopy_sniper: {
    name: "Canopy Sniper", hp: 65, speed: 2.7, damage: 10, killHeal: 10, goldReward: 5,
    skin: "#5a4030", hair: "#1a1a0a", shirt: "#3a4a2a", pants: "#2a3a1a", contactRange: 74,
    ai: 'archer', _specials: ['paralysis_dart'], specialCD: 600,
    arrowRate: 100, arrowSpeed: 9, arrowRange: 400, arrowBounces: 0, arrowLife: 400,
    projectileStyle: 'dart',
    deathColors: ["#5a4030","#3a4a2a","#7a6050","#2a3a1a"],
  },
  temple_silverback: {
    name: "Temple Silverback", hp: 200, speed: 2.8, damage: 22, killHeal: 15, goldReward: 6,
    skin: "#5a4030", hair: "#2a2a1a", shirt: "#4a3a2a", pants: "#3a2a1a", contactRange: 78,
    ai: 'tank', _specials: ['earthquake_slam'], specialCD: 600,
    deathColors: ["#5a4030","#4a3a2a","#7a6050","#3a2a1a"],
  },

  // Vortalis Floor 2 — Boss: Zongo
  zongo: {
    name: "Zongo", hp: 1100, speed: 2.2, damage: 26, killHeal: 40, goldReward: 30,
    skin: "#5a4030", hair: "#1a1a0a", shirt: "#3a4a1a", pants: "#2a3a0a", contactRange: 80,
    ai: 'tank', _specials: ['spear_barrage', 'vine_snare', 'primal_roar', 'tribal_summon', 'jungle_fury'],
    isBoss: true, bossScale: 1.4, specialCD: 540,
    deathColors: ["#5a4030","#3a4a1a","#7a6050","#2a3a0a"],
  },

  // Section B — Blood (waves 6-9)
  crimson_corsair: {
    name: "Crimson Corsair", hp: 85, speed: 3.8, damage: 16, killHeal: 5, goldReward: 4,
    skin: "#9a7070", hair: "#2a0a0a", shirt: "#6a2020", pants: "#4a1010", contactRange: 74,
    ai: 'runner', _specials: ['blood_frenzy'], specialCD: 360,
    deathColors: ["#9a7070","#6a2020","#ba9090","#4a1010"],
  },
  crystal_cultist: {
    name: "Crystal Cultist", hp: 75, speed: 2.4, damage: 10, killHeal: 12, goldReward: 5,
    skin: "#9a7070", hair: "#1a0a0a", shirt: "#5a1a1a", pants: "#3a0a0a", contactRange: 76,
    ai: 'witch', _specials: ['shard_spread'], specialCD: 540,
    kiteRange: 300,
    deathColors: ["#9a7070","#5a1a1a","#ba9090","#3a0a0a"],
  },
  bone_clad_brute: {
    name: "Bone-Clad Brute", hp: 190, speed: 2.6, damage: 20, killHeal: 15, goldReward: 6,
    skin: "#9a7070", hair: "#1a0a0a", shirt: "#4a1a1a", pants: "#2a0a0a", contactRange: 78,
    ai: 'tank', _specials: ['blood_pool'], specialCD: 660,
    deathColors: ["#9a7070","#4a1a1a","#ba9090","#2a0a0a"],
  },
  sanguine_siren: {
    name: "Sanguine Siren", hp: 70, speed: 2.7, damage: 12, killHeal: 10, goldReward: 5,
    skin: "#9a7070", hair: "#2a0a0a", shirt: "#6a1a1a", pants: "#4a0a0a", contactRange: 74,
    ai: 'archer', _specials: ['hamstring_bite'], specialCD: 480,
    arrowRate: 90, arrowSpeed: 9, arrowRange: 400, arrowBounces: 0, arrowLife: 450,
    deathColors: ["#9a7070","#6a1a1a","#ba9090","#4a0a0a"],
  },

  // Vortalis Floor 2 — Boss: Bloodborne Marlon
  bloodborne_marlon: {
    name: "Bloodborne Marlon", hp: 1500, speed: 2.0, damage: 28, killHeal: 40, goldReward: 35,
    skin: "#9a7070", hair: "#1a0a0a", shirt: "#5a0a0a", pants: "#3a0a0a", contactRange: 80,
    ai: 'tank', _specials: ['chain_grapple', 'crimson_cleave', 'shard_of_betrayal', 'blood_siphon', 'bone_guard', 'demonic_shift'],
    isBoss: true, bossScale: 1.5, specialCD: 480,
    deathColors: ["#9a7070","#5a0a0a","#ba9090","#3a0a0a"],
  },

  // ===================== VORTALIS FLOOR 3: WEREWOLF / GHOST =====================
  // Section A — Werewolf (waves 1-4)
  feral_deckhand: {
    name: "Feral Deckhand", hp: 90, speed: 4.2, damage: 16, killHeal: 5, goldReward: 4,
    skin: "#6a5a4a", hair: "#3a2a1a", shirt: "#4a3a2a", pants: "#3a2a1a", contactRange: 74,
    ai: 'runner', _specials: ['rabid_pounce'], specialCD: 360,
    deathColors: ["#6a5a4a","#4a3a2a","#8a7a6a","#3a2a1a"],
  },
  howling_lookout: {
    name: "Howling Lookout", hp: 75, speed: 2.7, damage: 10, killHeal: 10, goldReward: 5,
    skin: "#6a5a4a", hair: "#2a1a0a", shirt: "#4a4a3a", pants: "#3a3a2a", contactRange: 74,
    ai: 'archer', _specials: ['pack_howl'], specialCD: 600,
    arrowRate: 100, arrowSpeed: 9, arrowRange: 380, arrowBounces: 0, arrowLife: 400,
    deathColors: ["#6a5a4a","#4a4a3a","#8a7a6a","#3a3a2a"],
  },
  sea_dog_brute: {
    name: "Sea Dog Brute", hp: 180, speed: 3.0, damage: 22, killHeal: 15, goldReward: 6,
    skin: "#6a5a4a", hair: "#2a2a1a", shirt: "#3a3a2a", pants: "#2a2a1a", contactRange: 78,
    ai: 'tank', _specials: ['reckless_charge'], specialCD: 540,
    deathColors: ["#6a5a4a","#3a3a2a","#8a7a6a","#2a2a1a"],
  },
  rabid_wharf_hound: {
    name: "Rabid Wharf Hound", hp: 100, speed: 3.6, damage: 18, killHeal: 8, goldReward: 4,
    skin: "#6a5a4a", hair: "#3a3a2a", shirt: "#5a4a3a", pants: "#4a3a2a", contactRange: 76,
    ai: 'grunt', _specials: ['hamstring_bite'], specialCD: 420,
    deathColors: ["#6a5a4a","#5a4a3a","#8a7a6a","#4a3a2a"],
  },

  // Vortalis Floor 3 — Boss: Wolfbeard
  wolfbeard: {
    name: "Wolfbeard", hp: 1600, speed: 2.8, damage: 28, killHeal: 40, goldReward: 35,
    skin: "#6a5a4a", hair: "#2a1a0a", shirt: "#3a2a1a", pants: "#2a1a0a", contactRange: 80,
    ai: 'tank', _specials: ['quick_draw', 'feral_slash', 'predator_dash', 'hunters_mark', 'howl_of_terror', 'pack_instinct', 'silver_fang_strike', 'alpha_rampage'],
    isBoss: true, bossScale: 1.5, specialCD: 420,
    deathColors: ["#6a5a4a","#3a2a1a","#8a7a6a","#2a1a0a"],
  },

  // Section B — Ghost (waves 6-9)
  phantom_swashbuckler: {
    name: "Phantom Swashbuckler", hp: 80, speed: 4.0, damage: 18, killHeal: 5, goldReward: 4,
    skin: "#8a8a9a", hair: "#5a5a6a", shirt: "#6a6a7a", pants: "#5a5a6a", contactRange: 74,
    ai: 'runner', _specials: ['phase_lunge'], specialCD: 480,
    deathColors: ["#8a8a9a","#6a6a7a","#aaaaba","#5a5a6a"],
  },
  poltergeist_gunner: {
    name: "Poltergeist Gunner", hp: 70, speed: 2.6, damage: 12, killHeal: 10, goldReward: 5,
    skin: "#8a8a9a", hair: "#4a4a5a", shirt: "#5a5a7a", pants: "#4a4a6a", contactRange: 74,
    ai: 'archer', _specials: ['soul_bullet'], specialCD: 420,
    arrowRate: 80, arrowSpeed: 9, arrowRange: 450, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'ghost_bolt',
    deathColors: ["#8a8a9a","#5a5a7a","#aaaaba","#4a4a6a"],
  },
  drowned_banshee: {
    name: "Drowned Banshee", hp: 75, speed: 2.4, damage: 10, killHeal: 12, goldReward: 5,
    skin: "#8a8a9a", hair: "#5a5a7a", shirt: "#6a6a8a", pants: "#5a5a7a", contactRange: 76,
    ai: 'witch', _specials: ['wail_of_depths'], specialCD: 600,
    kiteRange: 300,
    deathColors: ["#8a8a9a","#6a6a8a","#aaaaba","#5a5a7a"],
  },
  cursed_shackler: {
    name: "Cursed Shackler", hp: 120, speed: 3.0, damage: 16, killHeal: 8, goldReward: 5,
    skin: "#8a8a9a", hair: "#4a4a5a", shirt: "#5a5a6a", pants: "#4a4a5a", contactRange: 76,
    ai: 'grunt', _specials: ['spectral_tether'], specialCD: 720,
    deathColors: ["#8a8a9a","#5a5a6a","#aaaaba","#4a4a5a"],
  },

  // Vortalis Floor 3 — Boss: Ghostbeard
  ghostbeard: {
    name: "Ghostbeard", hp: 1800, speed: 2.4, damage: 26, killHeal: 40, goldReward: 35,
    skin: "#8a8a9a", hair: "#5a5a6a", shirt: "#4a4a6a", pants: "#3a3a5a", contactRange: 80,
    ai: 'witch', _specials: ['phantom_slash', 'ghost_dash', 'haunted_cutlass', 'spirit_shield', 'cursed_mark', 'spectral_crew', 'soul_drain', 'ghost_ship'],
    isBoss: true, bossScale: 1.5, specialCD: 420,
    kiteRange: 260,
    deathColors: ["#8a8a9a","#4a4a6a","#aaaaba","#3a3a5a"],
  },

  // ===================== VORTALIS FLOOR 4: SEA CREATURES / DEEP-SEA =====================
  // Section A — Sea (waves 1-4)
  ink_spitter: {
    name: "Ink Spitter", hp: 80, speed: 3.8, damage: 12, killHeal: 5, goldReward: 4,
    skin: "#4a8a7a", hair: "#2a6a5a", shirt: "#3a7a6a", pants: "#2a6a5a", contactRange: 74,
    ai: 'runner', _specials: ['blinding_ink'], specialCD: 480,
    deathColors: ["#4a8a7a","#3a7a6a","#6aaa9a","#2a6a5a"],
  },
  coral_crusher: {
    name: "Coral Crusher", hp: 200, speed: 2.4, damage: 22, killHeal: 15, goldReward: 6,
    skin: "#4a8a7a", hair: "#2a5a4a", shirt: "#3a6a5a", pants: "#2a5a4a", contactRange: 78,
    ai: 'tank', _specials: ['coral_barricade'], specialCD: 660,
    _frontalShield: true,
    deathColors: ["#4a8a7a","#3a6a5a","#6aaa9a","#2a5a4a"],
  },
  trench_tentacle: {
    name: "Trench Tentacle", hp: 160, speed: 0, damage: 14, killHeal: 10, goldReward: 5,
    skin: "#4a8a7a", hair: "#1a5a4a", shirt: "#2a6a5a", pants: "#1a5a4a", contactRange: 76,
    ai: 'stationary', _specials: ['tentacle_bind'], specialCD: 360,
    deathColors: ["#4a8a7a","#2a6a5a","#6aaa9a","#1a5a4a"],
  },
  barnacle_bomber: {
    name: "Barnacle Bomber", hp: 90, speed: 3.3, damage: 16, killHeal: 8, goldReward: 4,
    skin: "#4a8a7a", hair: "#2a6a5a", shirt: "#4a7a6a", pants: "#3a6a5a", contactRange: 76,
    ai: 'grunt', _specials: ['sticky_trap'], specialCD: 540,
    deathColors: ["#4a8a7a","#4a7a6a","#6aaa9a","#3a6a5a"],
  },

  // Vortalis Floor 4 — Boss: Kraken Jim
  kraken_jim: {
    name: "Kraken Jim", hp: 2200, speed: 1.6, damage: 28, killHeal: 50, goldReward: 40,
    skin: "#4a8a7a", hair: "#1a5a4a", shirt: "#2a5a4a", pants: "#1a4a3a", contactRange: 82,
    ai: 'witch', _specials: ['tentacle_grab', 'coral_armor', 'ink_blast', 'tidal_slam', 'barnacle_trap_boss', 'ocean_regen', 'deep_sea_strike', 'kraken_call'],
    isBoss: true, bossScale: 1.5, specialCD: 420,
    kiteRange: 240,
    deathColors: ["#4a8a7a","#2a5a4a","#6aaa9a","#1a4a3a"],
  },

  // Section B — Deep-Sea (waves 6-9)
  gilded_triton: {
    name: "Gilded Triton", hp: 100, speed: 3.9, damage: 20, killHeal: 5, goldReward: 5,
    skin: "#3a5a7a", hair: "#1a3a5a", shirt: "#4a5a3a", pants: "#3a4a2a", contactRange: 74,
    ai: 'runner', _specials: ['tidal_lunge'], specialCD: 420,
    deathColors: ["#3a5a7a","#4a5a3a","#5a7a9a","#3a4a2a"],
  },
  coin_spitter_jelly: {
    name: "Coin Spitter Jelly", hp: 75, speed: 2.6, damage: 12, killHeal: 10, goldReward: 5,
    skin: "#3a5a7a", hair: "#1a3a5a", shirt: "#5a6a4a", pants: "#4a5a3a", contactRange: 74,
    ai: 'archer', _specials: ['wealth_volley'], specialCD: 480,
    arrowRate: 80, arrowSpeed: 9, arrowRange: 400, arrowBounces: 0, arrowLife: 450,
    projectileStyle: 'gold_bolt',
    deathColors: ["#3a5a7a","#5a6a4a","#5a7a9a","#4a5a3a"],
  },
  deep_sea_dredger: {
    name: "Deep-Sea Dredger", hp: 210, speed: 2.2, damage: 24, killHeal: 15, goldReward: 7,
    skin: "#3a5a7a", hair: "#1a2a4a", shirt: "#2a3a5a", pants: "#1a2a4a", contactRange: 78,
    ai: 'tank', _specials: ['abyssal_slam'], specialCD: 600,
    deathColors: ["#3a5a7a","#2a3a5a","#5a7a9a","#1a2a4a"],
  },
  royal_cephalopod: {
    name: "Royal Cephalopod", hp: 85, speed: 2.4, damage: 12, killHeal: 12, goldReward: 5,
    skin: "#3a5a7a", hair: "#1a3a5a", shirt: "#3a4a6a", pants: "#2a3a5a", contactRange: 76,
    ai: 'witch', _specials: ['pressure_zone'], specialCD: 540,
    kiteRange: 280,
    deathColors: ["#3a5a7a","#3a4a6a","#5a7a9a","#2a3a5a"],
  },

  // Vortalis Floor 4 — Boss: King Requill
  king_requill: {
    name: "King Requill", hp: 2800, speed: 1.8, damage: 30, killHeal: 50, goldReward: 45,
    skin: "#3a5a7a", hair: "#1a2a4a", shirt: "#2a3a5a", pants: "#1a2a3a", contactRange: 82,
    ai: 'witch', _specials: ['deepsea_decapitation', 'coiling_constriction', 'gilded_maelstrom', 'pressure_zone_boss', 'silt_cloud', 'abyssal_roar', 'golden_retribution', 'reign_of_deep'],
    isBoss: true, bossScale: 1.5, specialCD: 360,
    kiteRange: 260,
    bulletColor: { main: '#ffd700', core: '#fff8dc', glow: 'rgba(255,215,0,0.3)' },
    deathColors: ["#3a5a7a","#2a3a5a","#5a7a9a","#1a2a3a"],
  },

  // ===================== VORTALIS FLOOR 5: MERFOLK / OCEAN DEITY =====================
  // Section A — Merfolk (waves 1-4)
  alabaster_sentinel: {
    name: "Alabaster Sentinel", hp: 180, speed: 3.0, damage: 22, killHeal: 15, goldReward: 6,
    skin: "#7a9aaa", hair: "#4a6a7a", shirt: "#8a9a7a", pants: "#6a7a5a", contactRange: 78,
    ai: 'tank', _specials: ['royal_thrust'], specialCD: 540,
    deathColors: ["#7a9aaa","#8a9a7a","#9abaca","#6a7a5a"],
  },
  reef_weaver: {
    name: "Reef Weaver", hp: 80, speed: 2.4, damage: 12, killHeal: 12, goldReward: 5,
    skin: "#7a9aaa", hair: "#4a6a8a", shirt: "#5a7a8a", pants: "#4a6a7a", contactRange: 76,
    ai: 'witch', _specials: ['crashing_surf'], specialCD: 480,
    kiteRange: 300,
    deathColors: ["#7a9aaa","#5a7a8a","#9abaca","#4a6a7a"],
  },
  gilded_manta: {
    name: "Gilded Manta", hp: 100, speed: 4.2, damage: 18, killHeal: 5, goldReward: 5,
    skin: "#7a9aaa", hair: "#5a7a8a", shirt: "#6a8a9a", pants: "#5a7a8a", contactRange: 74,
    ai: 'runner', _specials: ['shard_glide'], specialCD: 360,
    deathColors: ["#7a9aaa","#6a8a9a","#9abaca","#5a7a8a"],
  },
  royal_shell_knight: {
    name: "Royal Shell Knight", hp: 220, speed: 2.4, damage: 24, killHeal: 15, goldReward: 7,
    skin: "#7a9aaa", hair: "#4a6a7a", shirt: "#7a8a6a", pants: "#5a6a4a", contactRange: 78,
    ai: 'tank', _specials: ['aegis_reflect'], specialCD: 600,
    deathColors: ["#7a9aaa","#7a8a6a","#9abaca","#5a6a4a"],
  },

  // Vortalis Floor 5 — Boss: Queen Siralyth
  queen_siralyth: {
    name: "Queen Siralyth", hp: 3200, speed: 2.0, damage: 30, killHeal: 50, goldReward: 50,
    skin: "#7a9aaa", hair: "#4a6a8a", shirt: "#6a8a7a", pants: "#4a6a5a", contactRange: 82,
    ai: 'witch', _specials: ['golden_shard_volley', 'abyssal_maw', 'coral_aegis', 'royal_gilded_beam', 'tidal_surge', 'sovereigns_cage', 'blessing_of_deep', 'reign_gilded_reef'],
    isBoss: true, bossScale: 1.5, specialCD: 360,
    kiteRange: 280,
    deathColors: ["#7a9aaa","#6a8a7a","#9abaca","#4a6a5a"],
  },

  // Section B — Ocean Deity (waves 6-9)
  sea_serpent_spawn: {
    name: "Sea Serpent Spawn", hp: 110, speed: 4.1, damage: 20, killHeal: 5, goldReward: 5,
    skin: "#2a4a5a", hair: "#1a2a3a", shirt: "#2a3a4a", pants: "#1a2a3a", contactRange: 74,
    ai: 'runner', _specials: ['leviathan_lunge'], specialCD: 360,
    deathColors: ["#2a4a5a","#2a3a4a","#4a6a7a","#1a2a3a"],
  },
  living_whirlpool: {
    name: "Living Whirlpool", hp: 90, speed: 2.2, damage: 14, killHeal: 12, goldReward: 5,
    skin: "#2a4a5a", hair: "#1a3a4a", shirt: "#2a4a5a", pants: "#1a3a4a", contactRange: 76,
    ai: 'witch', _specials: ['abyssal_undertow'], specialCD: 480,
    kiteRange: 280,
    deathColors: ["#2a4a5a","#2a4a5a","#4a6a7a","#1a3a4a"],
  },
  bone_tooth_zealot: {
    name: "Bone Tooth Zealot", hp: 130, speed: 3.3, damage: 22, killHeal: 8, goldReward: 5,
    skin: "#2a4a5a", hair: "#1a2a3a", shirt: "#3a4a4a", pants: "#2a3a3a", contactRange: 76,
    ai: 'grunt', _specials: ['pincer_guillotine'], specialCD: 480,
    deathColors: ["#2a4a5a","#3a4a4a","#4a6a7a","#2a3a3a"],
  },
  tidal_avatar: {
    name: "Tidal Avatar", hp: 240, speed: 2.6, damage: 26, killHeal: 15, goldReward: 7,
    skin: "#2a4a5a", hair: "#1a2a3a", shirt: "#1a3a4a", pants: "#0a2a3a", contactRange: 78,
    ai: 'tank', _specials: ['crashing_surf'], specialCD: 540,
    deathColors: ["#2a4a5a","#1a3a4a","#4a6a7a","#0a2a3a"],
  },

  // Vortalis Floor 5 — Boss: Mami Wata
  mami_wata: {
    name: "Mami Wata", hp: 4000, speed: 2.2, damage: 34, killHeal: 50, goldReward: 60,
    skin: "#2a4a5a", hair: "#1a2a3a", shirt: "#1a2a4a", pants: "#0a1a3a", contactRange: 82,
    ai: 'witch', _specials: ['leviathans_fang', 'serpents_strike', 'tidal_trample', 'abyssal_undertow_mw', 'divine_deluge', 'oceanic_domain', 'wrath_of_sea'],
    isBoss: true, bossScale: 1.6, specialCD: 300,
    kiteRange: 260,
    deathColors: ["#2a4a5a","#1a2a4a","#4a6a7a","#0a1a3a"],
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
  // Vortalis Floor 1
  bilge_rat: 4, powder_keg: 4, deckhand_shooter: 3, anchor_hauler: 3,
  ironclad_marine: 3, tidecaller_mystic: 3, galleon_sniper: 3, sunken_dreadnought: 3,
  captain_husa: 1, admiral_von_kael: 1,
  // Vortalis Floor 2
  jungle_headhunter: 4, voodoo_creeper: 3, canopy_sniper: 3, temple_silverback: 3,
  crimson_corsair: 4, crystal_cultist: 3, bone_clad_brute: 3, sanguine_siren: 3,
  zongo: 1, bloodborne_marlon: 1,
  // Vortalis Floor 3
  feral_deckhand: 4, howling_lookout: 3, sea_dog_brute: 3, rabid_wharf_hound: 4,
  phantom_swashbuckler: 4, poltergeist_gunner: 3, drowned_banshee: 3, cursed_shackler: 3,
  wolfbeard: 1, ghostbeard: 1,
  // Vortalis Floor 4
  ink_spitter: 4, coral_crusher: 3, trench_tentacle: 3, barnacle_bomber: 4,
  gilded_triton: 4, coin_spitter_jelly: 3, deep_sea_dredger: 3, royal_cephalopod: 3,
  kraken_jim: 1, king_requill: 1,
  // Vortalis Floor 5
  alabaster_sentinel: 3, reef_weaver: 3, gilded_manta: 4, royal_shell_knight: 3,
  sea_serpent_spawn: 4, living_whirlpool: 3, bone_tooth_zealot: 4, tidal_avatar: 3,
  queen_siralyth: 1, mami_wata: 1,
};

const CROWD_EXEMPT_TYPES = new Set(["runner", "golem", "mini_golem", "archer", "healer", "drone_lookout", "renegade_sniper", "the_don",
  "executive_handler", "voltmaster", "e_mortis",
  "chem_frog", "mourn", "centipede",
  "holo_jester", "signal_jammer", "game_master", "junz",
  "plague_batwing", "viscosity_mage", "lehvius", "jackman", "malric", "vale",
  "deckhand_shooter", "tidecaller_mystic", "galleon_sniper", "captain_husa", "admiral_von_kael",
  "voodoo_creeper", "canopy_sniper", "crystal_cultist", "sanguine_siren", "zongo", "bloodborne_marlon",
  "howling_lookout", "poltergeist_gunner", "drowned_banshee", "wolfbeard", "ghostbeard",
  "trench_tentacle", "coin_spitter_jelly", "royal_cephalopod", "kraken_jim", "king_requill",
  "reef_weaver", "living_whirlpool", "queen_siralyth", "mami_wata"]);

// All entity sub-arrays a mob can carry. Used for cleanup on death + floor transitions.
const MOB_ENTITY_ARRAYS = [
  '_bombs', '_mines', '_oilPuddles', '_traps', '_oozeLines', '_rampartZones',
  '_meltTargets', '_summonedMinions', '_turrets', '_drones', '_pillars',
  '_eggs', '_lasers', '_baits', '_staticOrbs',
  '_holoClones', '_rocketDrones', '_junzBeam',
  '_tetherLine', '_geyserZones', '_inkPuddles', '_coralWalls', '_tentacles', '_barnacleTraps', '_whirlpools',
];
