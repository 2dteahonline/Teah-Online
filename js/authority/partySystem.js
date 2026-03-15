// ===================== PARTY SYSTEM =====================
// Authority: party state, member lifecycle, revive shop, target helpers.
// Loaded in Phase B (authority) — after gameState.js, partyData.js.

// ---- Party State (global) ----
const PartyState = {
  active: false,       // true when dungeon entered with bots
  members: [],         // PartyMember[] (slot 0 = player, 1-3 = bots)
  localPlayerId: 'player',
  shopOpen: false,     // revive shop active between waves
  spectateTarget: null, // entity being followed by camera when player dead
  // Queue UI state
  queueSlots: [true, false, false, false], // slot 0 always player, 1-3 toggleable
};

// ---- Current damage target (set per mob AI tick) ----
// When a mob's AI/specials run, this points to the entity they're targeting.
// dealDamageToPlayer() reads this when no explicit target is passed.
let _currentDamageTarget = null;

// ---- Party Member Factory ----
function createPartyMember(slotIndex, controlType) {
  const preset = BOT_PRESETS[slotIndex];
  const isLocal = controlType === 'local';
  const maxHp = isLocal ? player.maxHp : Math.round(player.maxHp * PARTY_CONFIG.BOT_HP_MULT);

  // Create entity object (bots get their own position/HP entity)
  const entity = isLocal ? player : {
    x: player.x + (slotIndex - 1) * 40 - 40,
    y: player.y + 30,
    vx: 0, vy: 0,
    knockVx: 0, knockVy: 0,
    speed: player.baseSpeed || GAME_CONFIG.PLAYER_BASE_SPEED,
    baseSpeed: player.baseSpeed || GAME_CONFIG.PLAYER_BASE_SPEED,
    dir: 0, frame: 0, animTimer: 0, moving: false,
    hp: maxHp, maxHp: maxHp,
    name: preset ? preset.name : 'Bot ' + slotIndex,
    skin: preset ? preset.skin : '#d4bba8',
    hair: preset ? preset.hair : '#0c0c10',
    shirt: preset ? preset.shirt : '#0a0a0c',
    pants: preset ? preset.pants : '#0a0a0c',
    eyes: preset ? preset.eyes : '#4488aa',
    shoes: preset ? preset.shoes : '#3a2a1a',
    hat: preset ? preset.hat : '#2a2a3a',
    facialHair: '#0c0c10', glasses: '#1a1a1a', gloves: '#5a4a3a',
    belt: '#4a3a2a', cape: '#2a1a3a', tattoo: '#1a3a2a',
    scars: '#c8a090', earring: '#c8a040', necklace: '#c0c0c0',
    backpack: '#6a5a3a', warpaint: '#3a1a1a',
    // Body blocking
    radius: GAME_CONFIG.PLAYER_RADIUS,
    _contactCD: 0, // per-entity contact damage cooldown
    _isBot: true,
  };

  // Bot gun state — starts with DEFAULT_GUN (Sidearm), upgrades via shop purchases
  const defGun = typeof DEFAULT_GUN !== 'undefined' ? DEFAULT_GUN : { damage: 28, fireRate: 5, magSize: 35, special: null, bulletColor: null };
  const defMelee = typeof DEFAULT_MELEE !== 'undefined' ? DEFAULT_MELEE : { damage: 15, range: 90, cooldown: 28, special: null };
  const botGun = isLocal ? null : {
    id: defGun.id || 'sidearm',
    name: defGun.name || 'Sidearm',
    tier: defGun.tier || 0,
    damage: defGun.damage,
    fireRate: defGun.fireRate || 5,
    magSize: defGun.magSize,
    ammo: defGun.magSize,
    reloading: false,
    reloadTimer: 0,
    fireCooldown: 0,
    special: defGun.special || null,
    bulletColor: defGun.bulletColor || null,
    color: defGun.color || '#5a7a8a',
  };

  return {
    id: isLocal ? 'player' : 'bot_' + slotIndex,
    slotIndex,
    name: isLocal ? player.name : (preset ? preset.name : 'Bot ' + slotIndex),
    controlType, // 'local' | 'bot' | 'remote' (future)
    entity,
    gun: botGun,
    melee: isLocal ? null : {
      damage: defMelee.damage,
      range: defMelee.range,
      cooldown: defMelee.cooldown || 28,
      cooldownMax: defMelee.cooldown || 28,
      critChance: defMelee.critChance || 0.10,
      special: defMelee.special || null,
    },
    equip: isLocal ? playerEquip : { armor: null, boots: null, pants: null, chest: null, helmet: null, gun: null, melee: null },
    gold: 0, // per-member gold wallet (player uses global `gold`, bots use this)
    lives: lives, // copy current lives count
    dead: false,
    deathTimer: 0,
    respawnTimer: 0,
    active: true,
    ai: controlType === 'bot' ? { state: 'hunt', target: null, targetAge: 0, shootCD: 0, meleeCD: 0 } : null,
  };
}

// ---- Party System ----
const PartySystem = {
  // Initialize party for dungeon entry
  init(slotCount) {
    if (slotCount <= 1) {
      // Solo mode — no party system
      PartyState.active = false;
      PartyState.members = [];
      return;
    }
    PartyState.active = true;
    PartyState.members = [];
    PartyState.shopOpen = false;
    PartyState.spectateTarget = null;

    // Slot 0 = local player
    PartyState.members.push(createPartyMember(0, 'local'));

    // Slots 1-3 = bots
    for (let i = 1; i < slotCount; i++) {
      PartyState.members.push(createPartyMember(i, 'bot'));
    }
  },

  // Reset party state (on dungeon exit)
  reset() {
    PartyState.active = false;
    PartyState.members = [];
    PartyState.shopOpen = false;
    PartyState.spectateTarget = null;
    _currentDamageTarget = null;
  },

  // Get all alive member entities (including player)
  getAliveEntities() {
    if (!PartyState.active) return [player];
    return PartyState.members
      .filter(m => m.active && !m.dead)
      .map(m => m.entity);
  },

  // Get alive count
  getAliveCount() {
    if (!PartyState.active) return playerDead ? 0 : 1;
    return PartyState.members.filter(m => m.active && !m.dead).length;
  },

  // Get all alive members (full objects, not just entities)
  getAlive() {
    if (!PartyState.active) return [];
    return PartyState.members.filter(m => m.active && !m.dead);
  },

  // All party members dead?
  allDead() {
    if (!PartyState.active) return playerDead;
    return PartyState.members.every(m => !m.active || m.dead);
  },

  // Get nearest alive entity to a position (for mob targeting)
  getNearestTarget(x, y) {
    const alive = this.getAliveEntities();
    if (alive.length === 0) return player; // fallback
    let nearest = alive[0], bestDist = Infinity;
    for (const e of alive) {
      const dx = e.x - x, dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; nearest = e; }
    }
    return nearest;
  },

  // Get mob's current target (with sticky targeting + retarget)
  getMobTarget(mob) {
    if (!PartyState.active) return player;

    // Retarget periodically or when target is dead
    mob._targetAge = (mob._targetAge || 0) + 1;
    const targetDead = mob._partyTarget && (mob._partyTarget.hp <= 0 || mob._partyTarget._isDead);
    if (!mob._partyTarget || targetDead || mob._targetAge >= PARTY_CONFIG.MOB_RETARGET_INTERVAL) {
      mob._partyTarget = this.getNearestTarget(mob.x, mob.y);
      mob._targetAge = 0;
    }
    return mob._partyTarget;
  },

  // Get local player member
  getLocalMember() {
    return PartyState.members.find(m => m.controlType === 'local') || null;
  },

  // Get member by id
  getMemberById(id) {
    return PartyState.members.find(m => m.id === id) || null;
  },

  // Get member by entity reference
  getMemberByEntity(entity) {
    if (!PartyState.active) return null;
    return PartyState.members.find(m => m.entity === entity) || null;
  },

  // Add gold to the correct member's wallet
  addGold(memberId, amount) {
    if (!PartyState.active) { gold += amount; return; }
    if (!memberId || memberId === 'player') {
      gold += amount; // player uses global gold
    } else {
      const m = this.getMemberById(memberId);
      if (m) m.gold += amount;
    }
  },

  // Get gold for a member
  getGold(memberId) {
    if (!memberId || memberId === 'player') return gold;
    const m = this.getMemberById(memberId);
    return m ? m.gold : 0;
  },

  // Spend gold from a member's wallet — returns true if successful
  spendGold(memberId, amount) {
    if (!memberId || memberId === 'player') {
      if (gold < amount) return false;
      gold -= amount;
      return true;
    }
    const m = this.getMemberById(memberId);
    if (!m || m.gold < amount) return false;
    m.gold -= amount;
    return true;
  },

  // Resolve a killerId to { member, entity, gun, melee, equip }
  // Works uniformly for any participant — player, bot, or future remote user
  resolveKiller(killerId) {
    if (!PartyState.active || !killerId) {
      return { member: null, entity: player, gun, melee, equip: playerEquip, id: 'player' };
    }
    const m = this.getMemberById(killerId);
    if (!m) return { member: null, entity: player, gun, melee, equip: playerEquip, id: 'player' };
    return {
      member: m,
      entity: m.entity,
      gun: m.gun || gun,
      melee: m.melee || melee,
      equip: m.equip || playerEquip,
      id: m.id,
    };
  },

  // Handle a member taking lethal damage
  handleMemberDeath(member) {
    if (member.dead) return;
    member.dead = true;
    member.lives--;
    member.deathTimer = DEATH_ANIM_FRAMES;
    member.respawnTimer = RESPAWN_COUNTDOWN;
    member.entity._isDead = true;
    member.entity._deathX = member.entity.x;
    member.entity._deathY = member.entity.y;
    member.entity._deathRotation = 0;
    // Clear status effects on death
    if (typeof StatusFX !== 'undefined') StatusFX.clearEntity(member.entity);

    // If all dead, trigger game over
    if (this.allDead()) {
      if (member.controlType === 'local') {
        deathGameOver = true;
      }
    }
  },

  // Revive a dead member (between-waves shop) — costs from their own wallet
  reviveMember(member) {
    if (!member.dead) return false;
    if (member.lives <= 0) return false;
    const cost = PARTY_CONFIG.REVIVE_BASE_COST * dungeonFloor;
    // Check the dead member's own gold
    const memberGold = member.controlType === 'local' ? gold : member.gold;
    if (memberGold < cost) return false;

    if (member.controlType === 'local') { gold -= cost; }
    else { member.gold -= cost; }
    member.dead = false;
    member.entity.hp = member.entity.maxHp;
    member.entity._isDead = false;
    member.entity.x = player.x + (member.slotIndex - 1) * 40;
    member.entity.y = player.y + 30;
    hitEffects.push({ x: member.entity.x, y: member.entity.y - 30, life: 25, type: "heal", dmg: "REVIVED!" });
    return true;
  },

  // Check if any dead members can be revived (for shop display)
  hasRevivable() {
    return PartyState.members.some(m => m.dead && m.lives > 0);
  },

  // Floor transition: respawn dead members with lives, keep dead members with 0 lives
  onFloorAdvance() {
    for (const m of PartyState.members) {
      if (m.dead && m.lives > 0) {
        m.dead = false;
        m.entity.hp = m.entity.maxHp;
        m.entity._isDead = false;
      }
      // Reposition bots near player
      if (m.controlType === 'bot' && !m.dead) {
        m.entity.x = player.x + (m.slotIndex - 1) * 40 - 40;
        m.entity.y = player.y + 30;
      }
    }
  },

  // Full heal all alive members (wave clear)
  healAll() {
    for (const m of PartyState.members) {
      if (!m.dead && m.entity) {
        m.entity.hp = m.entity.maxHp;
      }
    }
  },

  // Get spectator target (nearest alive bot when player is dead)
  getSpectateTarget() {
    if (!PartyState.active || !playerDead) return null;
    const aliveBots = PartyState.members.filter(m => m.controlType === 'bot' && !m.dead);
    if (aliveBots.length === 0) return null;

    // Find nearest to current spectate target or player death position
    const refX = PartyState.spectateTarget ? PartyState.spectateTarget.x : deathX;
    const refY = PartyState.spectateTarget ? PartyState.spectateTarget.y : deathY;
    let best = aliveBots[0], bestDist = Infinity;
    for (const m of aliveBots) {
      const dx = m.entity.x - refX, dy = m.entity.y - refY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = m; }
    }
    PartyState.spectateTarget = best.entity;
    return best.entity;
  },

  // Get wave scaling multiplier for mob count
  // Uses total party size, not alive — rates don't change when someone dies
  getMobCountScale() {
    if (!PartyState.active) return 1;
    const total = PartyState.members.length;
    return 1 + (total - 1) * PARTY_CONFIG.MOB_COUNT_SCALE_PER_MEMBER;
  },

  // Get wave scaling multiplier for mob HP
  // Uses total party size, not alive — rates don't change when someone dies
  getMobHPScale() {
    if (!PartyState.active) return 1;
    const total = PartyState.members.length;
    return 1 + (total - 1) * PARTY_CONFIG.MOB_HP_SCALE_PER_MEMBER;
  },
};
