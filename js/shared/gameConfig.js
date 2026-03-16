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
  BULLET_R: 5,                  // projectile collision radius
  ENTITY_RX: 25,                // entity hitbox horizontal half-width (wider — matches body width)
  ENTITY_RY: 15,                // entity hitbox vertical half-height (narrower — Graal-style, positioning matters)

  // --- Mining ---
  ORE_COLLISION_RADIUS: 17,     // ore node collision circle
  MINING_PLAYER_R: 10,          // player half-width for ore push

  // --- Knockback ---
  KNOCKBACK_DECAY: 0.8,         // velocity multiplier per frame
  KNOCKBACK_THRESHOLD: 0.5,     // min velocity before clearing

  // --- Hitbox Indicator ---
  DEFAULT_HITBOX_RX: 30,        // hitbox visual horizontal (BULLET_R + ENTITY_RX = 30)
  DEFAULT_HITBOX_RY: 20,        // hitbox visual vertical (BULLET_R + ENTITY_RY = 20)

  // --- Version ---
  GAME_UPDATE: 244,             // increment each deploy — shown on lobby version sign
};
