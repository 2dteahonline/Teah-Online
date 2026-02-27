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
    ai: 'runner', _specials: ['cloak_backstab'], specialCD: 600, // 10s
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
    arrowRate: 90, arrowSpeed: 8, arrowRange: 450, arrowBounces: 1, arrowLife: 500,
    projectileStyle: 'tracer',
  },

  // Level 5 Mini-Boss: The Don
  the_don: {
    name: "The Don", hp: 800, speed: 1.2, damage: 15, killHeal: 40,
    skin: "#8a7a6a", hair: "#2a2a2a", shirt: "#3a2a1a", pants: "#2a1a0a", contactRange: 80,
    ai: 'archer', _specials: ['laser_snipe', 'tommy_burst', 'smart_mine', 'smoke_screen'],
    isBoss: true, bossScale: 1.4,
    arrowRate: 120, arrowSpeed: 7, arrowRange: 500, arrowBounces: 0, arrowLife: 500,
    projectileStyle: 'golden',
    bulletColor: { main: '#ffd700', core: '#fff8dc', glow: 'rgba(255,215,0,0.3)' },
  },

  // Level 10 Boss: Velocity
  velocity: {
    name: "Velocity", hp: 1500, speed: 2.5, damage: 20, killHeal: 50,
    skin: "#7a7a8a", hair: "#0a0a2a", shirt: "#2a2a5a", pants: "#1a1a4a", contactRange: 78,
    ai: 'runner', _specials: ['phase_dash', 'bullet_time_field', 'afterimage_barrage', 'summon_renegades'],
    isBoss: true, bossScale: 1.5,
  },
};

// Per-type caps per wave
const MOB_CAPS = {
  grunt: 12, runner: 8, tank: 3, witch: 2, golem: 1, mini_golem: 6, mummy: 3, archer: 2, healer: 2,
  // Floor 1
  neon_pickpocket: 4, cyber_mugger: 4, drone_lookout: 3, street_chemist: 3,
  renegade_bruiser: 3, renegade_shadowknife: 4, renegade_demo: 3, renegade_sniper: 3,
  the_don: 1, velocity: 1,
};

const CROWD_EXEMPT_TYPES = new Set(["runner", "golem", "mini_golem", "archer", "healer", "drone_lookout", "renegade_sniper", "the_don"]);
