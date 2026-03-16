// ===================== GAME CONFIG =====================
// Single source of truth for physics, collision, and speed tuning.
// Loaded FIRST — before all other scripts.
// To rebalance the game, edit values here. All systems read from GAME_CONFIG.

const GAME_CONFIG = {
  // --- Player ---
  PLAYER_BASE_SPEED: 5.83,      // base movement speed (no boots) → 350 px/sec
  PLAYER_WALL_HW: 14,           // player wall collision half-width (AABB)
  PLAYER_RADIUS: 23,            // body-blocking circle radius

  // --- Mobs ---
  MOB_WALL_HW: 11,              // mob wall collision half-width (AABB)
  MOB_RADIUS: 23,               // body-blocking circle radius
  POS_HW: 10,                   // spawn/position clearance half-width
  MOB_CROWD_RADIUS: 46,         // crowding detection radius

  // --- Projectiles ---
  BULLET_SPEED: 9,             // default bullet speed (px/frame)
  BULLET_R: 7,                  // projectile collision radius (~30% bigger to match visual)
  ENTITY_RX: 46,                // entity hitbox horizontal half-width (+20%)
  ENTITY_RY: 16,                // entity hitbox vertical half-height (+20%, flat — Graal-style ground ellipse)

  // --- Mining ---
  ORE_COLLISION_RADIUS: 17,     // ore node collision circle
  MINING_PLAYER_R: 10,          // player half-width for ore push

  // --- Knockback ---
  KNOCKBACK_DECAY: 0.8,         // velocity multiplier per frame
  KNOCKBACK_THRESHOLD: 0.5,     // min velocity before clearing

  // --- Hitbox Indicator ---
  DEFAULT_HITBOX_RX: 53,        // hitbox visual horizontal (BULLET_R + ENTITY_RX = 53)
  DEFAULT_HITBOX_RY: 23,        // hitbox visual vertical (BULLET_R + ENTITY_RY = 23)

  // --- Version ---
  GAME_UPDATE: 267,             // increment each deploy — shown on lobby version sign
};
