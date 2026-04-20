// ===================== GAME CONFIG =====================
// Single source of truth for physics, collision, and speed tuning.
// Loaded FIRST - before all other scripts.
// To rebalance the game, edit values here. All systems read from GAME_CONFIG.

const GAME_CONFIG = {
  // --- Player ---
  PLAYER_BASE_SPEED: 7.5,       // base movement speed (no boots) -> 450 px/sec
  PLAYER_WALL_HW: 14,           // player wall collision half-width (AABB)
  PLAYER_RADIUS: 23,            // body-blocking circle radius

  // --- Mobs ---
  MOB_WALL_HW: 11,              // mob wall collision half-width (AABB)
  MOB_RADIUS: 23,               // body-blocking circle radius
  POS_HW: 10,                   // spawn/position clearance half-width
  MOB_CROWD_RADIUS: 46,         // crowding detection radius

  // --- Projectiles (Graal-style: rectangular bullet + circular entity hitbox) ---
  BULLET_SPEED: 9,              // default bullet speed (px/frame)
  BULLET_HALF_LONG: 15,         // bullet collision half-length along travel direction
  BULLET_HALF_SHORT: 4,         // bullet collision half-width perpendicular to travel
  ENTITY_R: 29,                 // entity hitbox circle radius (+15%)
  PLAYER_HITBOX_Y: -25,          // player/spar hitbox Y offset from feet (torso center)
  MUZZLE_OFFSET_Y: 0,            // horizontal-shot muzzle Y offset from arm (0 = Graal-style, no peek)

  // --- Mining ---
  ORE_COLLISION_RADIUS: 17,     // ore node collision circle
  MINING_PLAYER_R: 10,          // player half-width for ore push

  // --- Knockback ---
  KNOCKBACK_DECAY: 0.8,         // velocity multiplier per frame
  KNOCKBACK_THRESHOLD: 0.6,     // min velocity before clearing

  // --- Hitbox Indicator ---
  DEFAULT_HITBOX_R: 33,         // hitbox visual radius (BULLET_HALF_SHORT + ENTITY_R)

  // --- Version ---
  GAME_UPDATE: 642,             // increment each deploy - shown on lobby version sign
};
