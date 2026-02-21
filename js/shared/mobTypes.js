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
};

// Per-type caps per wave
const MOB_CAPS = { grunt: 12, runner: 8, tank: 3, witch: 2, golem: 1, mini_golem: 6, mummy: 3, archer: 2, healer: 2 };

const CROWD_EXEMPT_TYPES = new Set(["runner", "golem", "mini_golem", "archer", "healer"]);
