// ===================== PARTY DATA =====================
// Shared constants for the dungeon party system.
// Loaded in Phase A (shared) — no logic, just data.

const PARTY_CONFIG = {
  MAX_SIZE: 4,
  // Revive cost scales with dungeon floor
  REVIVE_BASE_COST: 50,
  // Revive shop duration (frames)
  REVIVE_SHOP_DURATION: 600, // 10 seconds
  // Bot HP multiplier (relative to player maxHp) — cranked up for testing
  BOT_HP_MULT: 10,
  // Bot damage multiplier (applied to gun + melee at init) — cranked up for testing
  BOT_DMG_MULT: 8,
  // Bot shoot cooldown (frames)
  BOT_SHOOT_CD: 10,
  // Bot melee cooldown (frames)
  BOT_MELEE_CD: 20,
  // Bot follow distance range
  BOT_FOLLOW_MIN: 80,
  BOT_FOLLOW_MAX: 150,
  // Bot engage range (will start shooting at mobs within this)
  BOT_ENGAGE_RANGE: 250,
  // Bot flee HP threshold (fraction of maxHp)
  BOT_FLEE_THRESHOLD: 0.15,
  // Bot effective range for shooting
  BOT_EFFECTIVE_RANGE: 140,
  // Bot-to-bot separation distance (push apart when closer than this)
  BOT_SEPARATION_DIST: 60,
  // Bot spread radius around leader (each bot picks a different offset)
  BOT_SPREAD_RADIUS: 70,
  // Mob retarget interval (frames)
  MOB_RETARGET_INTERVAL: 30,
  // Wave scaling per alive party member
  MOB_COUNT_SCALE_PER_MEMBER: 0.5,  // duo 1.5x, trio 2x, quad 2.5x
  MOB_HP_SCALE_PER_MEMBER: 0.15,    // modest HP bump
};

// Bot cosmetic presets (distinct visual identity per slot)
const BOT_PRESETS = [
  null, // slot 0 = player (unused)
  {
    name: 'Bot 1',
    skin: '#c8a888', hair: '#3a2a1a', shirt: '#2a4a8a', pants: '#2a2a3a',
    eyes: '#44aa66', shoes: '#3a2a1a', hat: '#2a4a8a',
  },
  {
    name: 'Bot 2',
    skin: '#b89878', hair: '#8a4a2a', shirt: '#8a2a2a', pants: '#3a2a2a',
    eyes: '#aa6644', shoes: '#4a3a2a', hat: '#8a2a2a',
  },
  {
    name: 'Bot 3',
    skin: '#d4c4a8', hair: '#1a1a2a', shirt: '#2a6a4a', pants: '#2a3a2a',
    eyes: '#4466aa', shoes: '#2a2a1a', hat: '#2a6a4a',
  },
];
