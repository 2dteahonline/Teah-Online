// ===================== GAME CONFIG =====================
// Single source of truth for physics, collision, and speed tuning.
// Loaded FIRST — before all other scripts.
// To rebalance the game, edit values here. All systems read from GAME_CONFIG.

const GAME_CONFIG = {
  // --- Player ---
  PLAYER_BASE_SPEED: 6.66,      // base movement speed (no boots) → 400 px/sec
  PLAYER_WALL_HW: 18,           // player wall collision half-width (AABB)
  PLAYER_RADIUS: 30,            // body-blocking circle radius

  // --- Mobs ---
  MOB_WALL_HW: 15,              // mob wall collision half-width (AABB)
  MOB_RADIUS: 30,               // body-blocking circle radius
  POS_HW: 13,                   // spawn/position clearance half-width
  MOB_CROWD_RADIUS: 61,         // crowding detection radius

  // --- Projectiles ---
  BULLET_SPEED: 9,             // default bullet speed (px/frame)
  BULLET_R: 7,                  // projectile collision radius
  ENTITY_R: 19,                 // entity hit detection radius (bullet-vs-entity) [+10% from 17]

  // --- Mining ---
  ORE_COLLISION_RADIUS: 22,     // ore node collision circle
  MINING_PLAYER_R: 13,          // player half-width for ore push

  // --- Knockback ---
  KNOCKBACK_DECAY: 0.8,         // velocity multiplier per frame
  KNOCKBACK_THRESHOLD: 0.5,     // min velocity before clearing

  // --- Hitbox Indicator ---
  DEFAULT_HITBOX_RADIUS: 33,    // green circle radius (scaled with ENTITY_R +10%)

  // --- Version ---
  GAME_UPDATE: 219,             // increment each deploy — shown on lobby version sign
};
