// ===================== GAME CONFIG =====================
// Single source of truth for physics, collision, and speed tuning.
// Loaded FIRST — before all other scripts.
// To rebalance the game, edit values here. All systems read from GAME_CONFIG.

const GAME_CONFIG = {
  // --- Player ---
  PLAYER_BASE_SPEED: 6.25,     // base movement speed (no boots) → 375 px/sec
  PLAYER_WALL_HW: 16,          // player wall collision half-width (AABB)
  PLAYER_RADIUS: 27,           // body-blocking circle radius

  // --- Mobs ---
  MOB_WALL_HW: 14,             // mob wall collision half-width (AABB)
  MOB_RADIUS: 27,              // body-blocking circle radius
  POS_HW: 12,                  // spawn/position clearance half-width
  MOB_CROWD_RADIUS: 55,        // crowding detection radius

  // --- Projectiles ---
  BULLET_SPEED: 9,             // default bullet speed (px/frame)
  BULLET_R: 6,                 // projectile collision radius
  ENTITY_R: 15,                // entity hit detection radius (bullet-vs-entity)

  // --- Mining ---
  ORE_COLLISION_RADIUS: 20,    // ore node collision circle
  MINING_PLAYER_R: 12,         // player half-width for ore push

  // --- Knockback ---
  KNOCKBACK_DECAY: 0.8,        // velocity multiplier per frame
  KNOCKBACK_THRESHOLD: 0.5,    // min velocity before clearing

  // --- Hitbox Indicator ---
  DEFAULT_HITBOX_RADIUS: 27,   // green circle radius (matches PLAYER_RADIUS)

  // --- Version ---
  GAME_UPDATE: 173,             // increment each deploy — shown on lobby version sign
};
