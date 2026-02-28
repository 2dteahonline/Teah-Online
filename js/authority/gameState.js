// ===================== GAME STATE =====================
// Centralized mutable runtime state — the single source of truth.
// All legacy globals (player, mobs, gold, etc.) are aliased via
// Object.defineProperty so existing code works unchanged.
//
// Usage:
//   GameState.player.x     ← canonical
//   player.x               ← alias (reads/writes GameState.player)
//   GameState.gold = 100   ← canonical
//   gold = 100             ← alias (reads/writes GameState.gold)

window.GameState = {
  // ---- Player ----
  player: {
    x: 28 * TILE + TILE/2, y: 30 * TILE + TILE/2,
    vx: 0, vy: 0,
    knockVx: 0, knockVy: 0,
    speed: 3.5, baseSpeed: 3.5,
    dir: 0, frame: 0, animTimer: 0, moving: false,
    skin: "#d4bba8", hair: "#0c0c10", shirt: "#0a0a0c", pants: "#0a0a0c",
    eyes: "#4488aa", facialHair: "#0c0c10", shoes: "#3a2a1a", hat: "#2a2a3a",
    glasses: "#1a1a1a", gloves: "#5a4a3a", belt: "#4a3a2a", cape: "#2a1a3a",
    tattoo: "#1a3a2a", scars: "#c8a090", earring: "#c8a040", necklace: "#c0c0c0",
    backpack: "#6a5a3a", warpaint: "#3a1a1a",
    name: "Alex", hp: 50, maxHp: 50,
  },

  // ---- Input ----
  keysDown: {},

  // ---- Wave / Combat ----
  wave: 0,
  mobs: [],
  waveState: "waiting",
  kills: 0,
  dungeonFloor: 1,
  currentDungeon: 'cave',        // 'cave' | 'azurine' | future dungeon types
  dungeonReturnLevel: 'cave_01', // level to return to after dungeon completion
  gold: 0,
  medpacks: [],

  // ---- Mining ----
  oreNodes: [],

  // ---- Gun ----
  gun: {
    ammo: 30,
    magSize: 30,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    damage: 20,
    recoilTimer: 0,
    special: null,
  },
  bullets: [],
  hitEffects: [],
  deathEffects: [],
  mobParticles: [],

  // ---- Melee ----
  melee: {
    damage: 15,
    range: 90,
    arcAngle: Math.PI * 0.8,
    cooldown: 0,
    cooldownMax: 28,
    swinging: false,
    swingTimer: 0,
    swingDuration: 12,
    swingDir: 0,
    knockback: 6,
    critChance: 0.20,
    special: null,
    dashing: false,
    dashTimer: 0,
    dashDuration: 14,
    dashSpeed: 26,
    dashDirX: 0,
    dashDirY: 0,
    dashStartX: 0,
    dashStartY: 0,
    dashTrail: [],
    dashesLeft: 0,
    dashChainWindow: 0,
    dashCooldown: 0,
    dashCooldownMax: 240,
    dashActive: false,
    dashGap: 0,
  },

  // ---- Inventory ----
  inventory: [],
  potion: {
    count: 3,
    healAmount: 25,
    cooldown: 0,
    cooldownMax: 120,
  },

  // ---- Equipment ----
  playerEquip: {
    armor: null,
    gun: null,
    melee: null,
    boots: null,
    pants: null,
    chest: null,
    helmet: null,
  },
};

// ===================== DEBUG / DEV TOOL FLAGS =====================
// Toggled by slash commands: /freeze, /god, /nofire, /speed
window._mobsFrozen = false;   // /freeze — all mobs stop moving + abilities
window._godMode = false;      // /god — player takes 0 damage
window._mobsNoFire = false;   // /nofire — mobs can't shoot or use abilities
window._gameSpeed = 1;        // /speed — game speed multiplier (0.25, 0.5, 1, 2)

// ===================== ENTITY ID COUNTERS =====================
// Stable IDs for snapshot serialization. Every bullet/mob gets a unique id.
let nextBulletId = 1;
let nextOreNodeId = 1;

// ===================== GLOBAL ALIASES =====================
// Object.defineProperty getter/setter for EVERY variable so that
// existing code like `player.x = 5`, `gold += 10`, `mobs = []`
// transparently reads/writes GameState.
(function() {
  const keys = Object.keys(GameState);
  for (const key of keys) {
    Object.defineProperty(window, key, {
      get() { return GameState[key]; },
      set(v) { GameState[key] = v; },
      configurable: true,
      enumerable: true,
    });
  }
})();
