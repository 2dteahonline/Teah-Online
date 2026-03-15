// ===================== BOT AI =====================
// Authority: bot movement, combat AI, shooting, pathfinding.
// FSM: FOLLOW → HUNT → ENGAGE → FLEE
// Bots are autonomous — they roam, find mobs, and fight independently.
// Called from authorityTick when PartyState.active.

const BotAI = {
  // Shop station position
  SHOP_X: 20 * 48 + 24,
  SHOP_Y: 16 * 48 + 24,

  // Buff purchase priorities (indices into SHOP_ITEMS.Buffs)
  // 0=Gun Damage +3, 1=Melee Damage +3, 2=Melee Speed+, 3=Health Potion, 4=Lifesteal +5, 5=Party Lifesteal +3
  BUFF_PRIORITIES: [0, 1, 4, 5, 3], // Gun Dmg, Melee Dmg, Lifesteal, Party Lifesteal, Health Potion

  // Main tick — called once per frame for all bots
  tick() {
    for (const member of PartyState.members) {
      if (member.controlType !== 'bot' || !member.active) continue;
      if (member.dead) {
        // Tick death/respawn timers — bots auto-respawn just like the player
        this.tickDeadBot(member);
        continue;
      }
      this.tickBot(member);
    }
  },

  // Tick a dead bot's timers — auto-respawn when countdown finishes (if lives > 0)
  tickDeadBot(member) {
    const e = member.entity;
    // Death animation phase
    if (member.deathTimer > 0) {
      member.deathTimer--;
      e._deathRotation = (1 - member.deathTimer / DEATH_ANIM_FRAMES) * (Math.PI / 2);
      if (member.deathTimer <= 0 && member.lives > 0) {
        // Start respawn countdown (same as player: 3 seconds)
        member.respawnTimer = RESPAWN_COUNTDOWN;
      }
      return;
    }
    // Respawn countdown phase
    if (member.respawnTimer > 0) {
      member.respawnTimer--;
      if (member.respawnTimer <= 0 && member.lives > 0) {
        // Auto-respawn!
        member.dead = false;
        e.hp = e.maxHp;
        e._isDead = false;
        e._deathRotation = 0;
        // Spawn near a random alive member
        const alive = PartySystem.getAliveEntities();
        const ref = alive.length > 0 ? alive[Math.floor(Math.random() * alive.length)] : player;
        e.x = ref.x + (Math.random() - 0.5) * 80;
        e.y = ref.y + (Math.random() - 0.5) * 80;
        // Clear status effects
        if (typeof StatusFX !== 'undefined') StatusFX.clearEntity(e);
        hitEffects.push({ x: e.x, y: e.y - 30, life: 25, type: "heal", dmg: "RESPAWN!" });
      }
    }
  },

  tickBot(member) {
    const e = member.entity;
    const ai = member.ai;
    if (!e || !ai) return;

    // Tick cooldowns
    if (ai.shootCD > 0) ai.shootCD--;
    if (ai.meleeCD > 0) ai.meleeCD--;
    if (e._contactCD > 0) e._contactCD--;

    // Process knockback (same physics as player in inventory.js)
    if (e.knockVx !== 0 || e.knockVy !== 0) {
      const knx = e.x + e.knockVx;
      const kny = e.y + e.knockVy;
      const hw2 = GAME_CONFIG.PLAYER_WALL_HW;
      const kcL = Math.floor((knx - hw2) / TILE), kcR = Math.floor((knx + hw2) / TILE);
      const krT = Math.floor((e.y - hw2) / TILE), krB = Math.floor((e.y + hw2) / TILE);
      if (!isSolid(kcL, krT) && !isSolid(kcR, krT) && !isSolid(kcL, krB) && !isSolid(kcR, krB)) {
        e.x = knx;
      } else { e.knockVx = 0; }
      const kcL2 = Math.floor((e.x - hw2) / TILE), kcR2 = Math.floor((e.x + hw2) / TILE);
      const krT2 = Math.floor((kny - hw2) / TILE), krB2 = Math.floor((kny + hw2) / TILE);
      if (!isSolid(kcL2, krT2) && !isSolid(kcR2, krT2) && !isSolid(kcL2, krB2) && !isSolid(kcR2, krB2)) {
        e.y = kny;
      } else { e.knockVy = 0; }
      e.knockVx *= GAME_CONFIG.KNOCKBACK_DECAY;
      e.knockVy *= GAME_CONFIG.KNOCKBACK_DECAY;
      if (Math.abs(e.knockVx) < GAME_CONFIG.KNOCKBACK_THRESHOLD) e.knockVx = 0;
      if (Math.abs(e.knockVy) < GAME_CONFIG.KNOCKBACK_THRESHOLD) e.knockVy = 0;
    }

    // Tick reload
    if (member.gun && member.gun.reloading) {
      member.gun.reloadTimer--;
      if (member.gun.reloadTimer <= 0) {
        member.gun.reloading = false;
        member.gun.ammo = member.gun.magSize;
      }
    }

    // Tick potion cooldown + auto-use when HP < 40%
    if (member.potion) {
      if (member.potion.cooldown > 0) member.potion.cooldown--;
      if (e.hp / e.maxHp < 0.4 && member.potion.count > 0 && member.potion.cooldown <= 0) {
        this.botUsePotion(member);
      }
    }

    // --- Tick status effects (slow, root, stun, bleed, fear, etc.) ---
    const fxResult = typeof StatusFX !== 'undefined' ? StatusFX.tickEntity(e) : null;
    if (fxResult) {
      // Rooted/stunned — can't move, can't act
      if (fxResult.rooted) {
        e.moving = false;
        e.vx = 0; e.vy = 0;
        this._updateAnim(e);
        return;
      }
      // Feared — random walk override, can't control
      if (fxResult.feared && e._statusFX) {
        const spd = (e.speed || GAME_CONFIG.PLAYER_BASE_SPEED) * 0.6;
        const fx = e._statusFX._fearDirX, fy = e._statusFX._fearDirY;
        const newX = e.x + fx * spd, newY = e.y + fy * spd;
        if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
        if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
        e.moving = true;
        this._updateAnim(e);
        return;
      }
      // Store speed mult for movement helpers
      ai._fxSpeedMult = fxResult.speedMult;
    } else {
      ai._fxSpeedMult = 1;
    }

    // --- Telegraph dodge check (highest priority) ---
    if (this.checkTelegraphDanger(member)) {
      // Dodging telegraph — skip normal FSM
      this.applySeparation(member);
      // Still shoot while dodging if possible
      const nearMob = this._findTarget(member);
      if (nearMob && member.gun && !member.gun.reloading && ai.shootCD <= 0 && member.gun.ammo > 0) {
        this.faceTarget(e, nearMob.mob);
        this.botShoot(member, nearMob.mob);
      }
      this._updateAnim(e);
      return;
    }

    // Find best target (smart target selection)
    const target = this._findTarget(member);
    const nearestMob = target ? target.mob : null;
    const nearestDist = target ? target.dist : Infinity;

    // FSM transitions — bots are fully independent, never follow player
    const hpFrac = e.hp / e.maxHp;
    if (hpFrac < PARTY_CONFIG.BOT_FLEE_THRESHOLD && nearestMob && nearestDist < 150) {
      ai.state = 'flee';
    } else if (nearestMob && nearestDist <= PARTY_CONFIG.BOT_ENGAGE_RANGE) {
      ai.state = 'engage';
      ai.target = nearestMob;
    } else if (nearestMob) {
      ai.state = 'hunt';
      ai.target = nearestMob;
    } else if (waveState === 'cleared' || waveState === 'waiting' || waveState === 'revive_shop') {
      // Between waves — go shop if have gold, otherwise roam
      ai.state = 'shop';
      ai.target = null;
    } else {
      // No mobs, wave active (all killed but wave not ended yet?) — roam
      ai.state = 'roam';
      ai.target = null;
    }

    // Execute state
    switch (ai.state) {
      case 'hunt':   this.doHunt(member, nearestMob, nearestDist); break;
      case 'engage': this.doEngage(member, nearestMob, nearestDist); break;
      case 'flee':   this.doFlee(member, nearestMob); break;
      case 'shop':   this.doShop(member); break;
      case 'roam':   this.doRoam(member); break;
    }

    // Update animation
    this._updateAnim(e);
  },

  _updateAnim(e) {
    if (e.moving) {
      e.animTimer++;
      if (e.animTimer >= 8) { e.animTimer = 0; e.frame = (e.frame + 1) % 4; }
    } else {
      e.frame = 0; e.animTimer = 0;
    }
  },

  // ---- Smart Target Selection ----
  // Prioritize low-HP mobs (< 25% HP) within 1.5x distance of nearest mob
  _findTarget(member) {
    const e = member.entity;
    let nearestMob = null, nearestDist = Infinity;
    let lowHpMob = null, lowHpDist = Infinity;

    for (const m of mobs) {
      if (m.hp <= 0) continue;
      const dx = m.x - e.x, dy = m.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy);

      // Track absolute nearest
      if (d < nearestDist) {
        nearestDist = d;
        nearestMob = m;
      }

      // Track nearest low-HP mob (< 25% HP)
      if (m.hp / m.maxHp < 0.25 && d < lowHpDist) {
        lowHpDist = d;
        lowHpMob = m;
      }
    }

    if (!nearestMob) return null;

    // Prefer low-HP mob if it's within 1.5x the distance of the nearest mob
    if (lowHpMob && lowHpDist <= nearestDist * 1.5) {
      return { mob: lowHpMob, dist: lowHpDist };
    }

    return { mob: nearestMob, dist: nearestDist };
  },

  // ---- Telegraph Dodging ----
  // Returns true if bot is dodging (overrides normal state)
  checkTelegraphDanger(member) {
    const e = member.entity;
    if (!TelegraphSystem || !TelegraphSystem.active || TelegraphSystem.active.length === 0) return false;

    let dangerX = 0, dangerY = 0;
    let inDanger = false;

    for (const t of TelegraphSystem.active) {
      if (t.resolved) continue; // already popped, don't dodge
      const p = t.params;
      let cx, cy, isInside = false;

      switch (t.shape) {
        case 'circle': {
          const dx = e.x - p.cx, dy = e.y - p.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < p.radius + 20) { // 20px safety margin
            isInside = true;
            cx = p.cx; cy = p.cy;
          }
          break;
        }
        case 'line': {
          // Point-to-line-segment distance
          const lx = p.x2 - p.x1, ly = p.y2 - p.y1;
          const len2 = lx * lx + ly * ly;
          let t2 = len2 > 0 ? ((e.x - p.x1) * lx + (e.y - p.y1) * ly) / len2 : 0;
          t2 = Math.max(0, Math.min(1, t2));
          const projX = p.x1 + t2 * lx, projY = p.y1 + t2 * ly;
          const dx = e.x - projX, dy = e.y - projY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const halfW = ((p.width || 20) / 2) + 20;
          if (dist < halfW) {
            isInside = true;
            cx = projX; cy = projY;
          }
          break;
        }
        case 'cone': {
          const dx = e.x - p.cx, dy = e.y - p.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const range = (p.range || 96) + 20;
          if (dist < range) {
            const angle = Math.atan2(dy, dx);
            const dir = p.direction || 0;
            let diff = angle - dir;
            // Normalize to [-PI, PI]
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            const halfAngle = ((p.angleDeg || 45) * Math.PI / 360) + 0.1; // small margin
            if (Math.abs(diff) < halfAngle) {
              isInside = true;
              cx = p.cx; cy = p.cy;
            }
          }
          break;
        }
        case 'ring': {
          const dx = e.x - p.cx, dy = e.y - p.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const inner = (p.innerRadius || 40) - 20;
          const outer = (p.outerRadius || 100) + 20;
          if (dist > inner && dist < outer) {
            isInside = true;
            cx = p.cx; cy = p.cy;
            // For rings, dodge INWARD if closer to outer, OUTWARD if closer to inner
            const midR = ((p.innerRadius || 40) + (p.outerRadius || 100)) / 2;
            if (dist > midR) {
              // Closer to outer edge — move outward (away from center)
              // dangerX/Y will push away from center, which is correct
            } else {
              // Closer to inner edge — move inward (toward center)
              cx = e.x + (e.x - p.cx); // invert: pretend danger is opposite
              cy = e.y + (e.y - p.cy);
            }
          }
          break;
        }
        case 'tiles': {
          // Check if bot is on any danger tile
          const botTX = Math.floor(e.x / TILE);
          const botTY = Math.floor(e.y / TILE);
          for (const tile of (p.tiles || [])) {
            if (tile.tx === botTX && tile.ty === botTY) {
              isInside = true;
              cx = tile.tx * TILE + TILE / 2;
              cy = tile.ty * TILE + TILE / 2;
              break;
            }
          }
          break;
        }
      }

      if (isInside && cx !== undefined) {
        inDanger = true;
        // Accumulate dodge direction (away from danger center)
        const dx = e.x - cx, dy = e.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        dangerX += dx / d;
        dangerY += dy / d;
      }
    }

    if (inDanger) {
      // Normalize and move away
      const len = Math.sqrt(dangerX * dangerX + dangerY * dangerY) || 1;
      const nx = dangerX / len, ny = dangerY / len;
      const spd = (e.speed || GAME_CONFIG.PLAYER_BASE_SPEED) * 1.2; // slightly faster dodge
      const newX = e.x + nx * spd;
      const newY = e.y + ny * spd;
      if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
      if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
      e.moving = true;
      this.faceDirection(e, nx, ny);
      return true;
    }

    return false;
  },

  // SHOP: between waves, walk to shop station and buy equipment + buffs with own gold
  doShop(member) {
    const e = member.entity;
    const ai = member.ai;

    const dx = this.SHOP_X - e.x, dy = this.SHOP_Y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 60) {
      // Walk to the shop
      this.moveToward(e, this.SHOP_X, this.SHOP_Y, dist);
    } else {
      // At the shop — evaluate purchases
      e.moving = false;
      if (!ai._shopCD) ai._shopCD = 0;
      if (ai._shopCD > 0) { ai._shopCD--; return; }

      // Initialize per-bot purchase tracking
      if (!member._shopBought) member._shopBought = [0, 0, 0, 0, 0];

      const bought = this._tryBuyEquipment(member) || this._tryBuyBuff(member);
      if (bought) {
        ai._shopCD = 45; // cooldown between purchases
      } else {
        // Can't afford anything useful — idle briefly then roam
        ai._shopCD = 60;
        ai.state = 'roam';
      }
    }

    this.applySeparation(member);
  },

  // Try to buy the next equipment upgrade (gun, melee, boots, pants, chest, helmet).
  // Bots buy equipment in tier order, respecting wave requirements.
  // Returns true if purchased.
  _tryBuyEquipment(member) {
    const e = member.entity;
    const currentWave = (typeof dungeonFloor !== 'undefined' ? (dungeonFloor - 1) * (typeof WAVES_PER_FLOOR !== 'undefined' ? WAVES_PER_FLOOR : 10) : 0) + (typeof wave !== 'undefined' ? wave : 0);

    // Equipment categories to consider, in priority order
    const categories = [
      { key: 'Guns', tierList: typeof GUN_TIERS !== 'undefined' ? GUN_TIERS : [], equipSlot: 'gun' },
      { key: 'Melees', tierList: typeof MELEE_TIERS !== 'undefined' ? MELEE_TIERS : [], equipSlot: 'melee' },
      { key: 'Chest', tierList: typeof CHEST_TIERS !== 'undefined' ? CHEST_TIERS : [], equipSlot: 'chest' },
      { key: 'Pants', tierList: typeof PANTS_TIERS !== 'undefined' ? PANTS_TIERS : [], equipSlot: 'pants' },
      { key: 'Boots', tierList: typeof BOOTS_TIERS !== 'undefined' ? BOOTS_TIERS : [], equipSlot: 'boots' },
      { key: 'Helmets', tierList: typeof HELMET_TIERS !== 'undefined' ? HELMET_TIERS : [], equipSlot: 'helmet' },
    ];

    for (const cat of categories) {
      // Find the next tier this bot hasn't bought yet
      const currentTier = this._getBotEquipTier(member, cat.equipSlot);
      const nextItem = cat.tierList.find(t => t.tier === currentTier + 1);
      if (!nextItem) continue; // already at max tier or no items

      // Check wave requirement
      if (!window._opMode && nextItem.waveReq && currentWave < nextItem.waveReq) continue;

      // Check cost
      if (member.gold < nextItem.cost) continue;

      // Purchase!
      member.gold -= nextItem.cost;
      this._applyEquipment(member, cat.equipSlot, nextItem);

      // Show purchase effect
      hitEffects.push({ x: e.x, y: e.y - 30, life: 25, type: "heal", dmg: nextItem.name });
      return true;
    }

    return false;
  },

  // Get the current tier of a bot's equipment slot (0 = default/none)
  _getBotEquipTier(member, slot) {
    switch (slot) {
      case 'gun': return member.gun ? (member.gun.tier || 0) : 0;
      case 'melee': return member.melee ? (member.melee.tier || 0) : 0;
      case 'boots': return member.equip.boots ? (member.equip.boots.tier || 0) : 0;
      case 'pants': return member.equip.pants ? (member.equip.pants.tier || 0) : 0;
      case 'chest': return member.equip.chest ? (member.equip.chest.tier || 0) : 0;
      case 'helmet': return member.equip.helmet ? (member.equip.helmet.tier || 0) : 0;
      default: return 0;
    }
  },

  // Apply an equipment item to a bot's loadout — actually updates their combat stats
  _applyEquipment(member, slot, item) {
    const e = member.entity;
    switch (slot) {
      case 'gun':
        // Keep any existing damage buffs from buff purchases
        const dmgBuff = member.gun ? (member.gun.damage - (member.gun._baseDamage || member.gun.damage)) : 0;
        member.gun = {
          id: item.id,
          name: item.name,
          tier: item.tier,
          _baseDamage: item.damage,
          damage: item.damage + Math.max(0, dmgBuff),
          fireRate: item.fireRate,
          magSize: item.magSize,
          ammo: item.magSize, // full ammo on new gun
          reloading: false,
          reloadTimer: 0,
          fireCooldown: 0,
          special: item.special || null,
          bulletColor: item.bulletColor || null,
          color: item.color || '#4a4a4a',
        };
        break;
      case 'melee':
        const meleeDmgBuff = member.melee ? (member.melee.damage - (member.melee._baseDamage || member.melee.damage)) : 0;
        member.melee = {
          id: item.id,
          name: item.name,
          tier: item.tier,
          _baseDamage: item.damage,
          damage: item.damage + Math.max(0, meleeDmgBuff),
          range: item.range,
          cooldown: item.cooldown,
          cooldownMax: item.cooldown,
          critChance: item.critChance || 0.10,
          special: item.special || null,
        };
        break;
      case 'boots':
        member.equip.boots = { ...item };
        // Apply speed bonus to entity
        e.speed = (e.baseSpeed || GAME_CONFIG.PLAYER_BASE_SPEED) + item.speedBonus;
        break;
      case 'pants':
        member.equip.pants = { ...item };
        break;
      case 'chest':
        member.equip.chest = { ...item };
        // Apply HP bonus
        const oldMaxHp = e.maxHp;
        const prevBonus = member._chestHpBonus || 0;
        member._chestHpBonus = item.hpBonus || 0;
        e.maxHp = e.maxHp - prevBonus + member._chestHpBonus;
        e.hp = Math.min(e.hp + (e.maxHp - oldMaxHp), e.maxHp);
        break;
      case 'helmet':
        member.equip.helmet = { ...item };
        break;
    }
  },

  // Try to buy the best affordable buff. Returns true if purchased.
  _tryBuyBuff(member) {
    const e = member.entity;
    const hpFrac = e.hp / e.maxHp;

    // Build priority list based on situation
    const priorities = [];

    // Health Potion is top priority if HP < 70%
    if (hpFrac < 0.7) {
      priorities.push(3); // Health Potion
    }

    // Then damage buffs and lifesteal
    priorities.push(0); // Gun Damage +3
    priorities.push(1); // Melee Damage +3
    priorities.push(4); // Lifesteal +5
    priorities.push(5); // Party Lifesteal +3

    // Health Potion as low priority even at high HP (stock up)
    if (hpFrac >= 0.7) {
      priorities.push(3);
    }

    for (const idx of priorities) {
      const item = SHOP_ITEMS.Buffs[idx];
      if (!item) continue;

      // Party Lifesteal (index 5) — special: shared purchase, split cost, uses global bought count
      if (idx === 5 && item.isPartyCost) {
        if (item.maxBuy && item.bought >= item.maxBuy) continue;
        // Use the shop item's action — it checks everyone's gold and deducts split shares
        if (item.action()) {
          item.bought++;
          // Show effect on ALL members
          if (PartyState.members.length > 0) {
            for (const _pm of PartyState.members) {
              if (!_pm.dead && _pm.entity) {
                hitEffects.push({ x: _pm.entity.x, y: _pm.entity.y - 30, life: 20, type: "heal", dmg: "Party Lifesteal +5" });
              }
            }
          }
          return true;
        }
        continue;
      }

      // Check max purchases (lifesteal has maxBuy:10, melee speed has maxBuy:6)
      if (item.maxBuy && member._shopBought[idx] >= item.maxBuy) continue;

      // Calculate cost using bot's own purchase count
      const cost = item.baseCost + member._shopBought[idx] * item.priceIncrease;

      if (member.gold >= cost) {
        // Purchase!
        member.gold -= cost;
        member._shopBought[idx]++;

        // Apply the buff to the bot's own stats
        switch (idx) {
          case 0: // Gun Damage +3
            if (member.gun) {
              member.gun.damage += 3;
            }
            break;
          case 1: // Melee Damage +3
            if (member.melee) member.melee.damage += 3;
            break;
          case 2: // Melee Speed +
            if (member.melee) member.melee.cooldownMax = Math.max(10, (member.melee.cooldownMax || 30) - 2);
            break;
          case 3: // Health Potion — adds to bot's potion inventory (used automatically when low HP)
            if (member.potion) {
              member.potion.count++;
            }
            break;
          case 4: // Lifesteal +5
            member._lifestealPerKill = (member._lifestealPerKill || 25) + 5;
            break;
        }

        // Show purchase effect
        hitEffects.push({ x: e.x, y: e.y - 30, life: 20, type: "heal", dmg: item.name });
        return true;
      }
    }

    return false; // couldn't afford anything
  },

  // ROAM: wander independently when no mobs and not shopping
  doRoam(member) {
    const e = member.entity;
    const ai = member.ai;

    // Pick a random roam target, refresh every ~120 frames or when reached
    if (!ai._roamX || !ai._roamY || ai._roamAge >= 120) {
      // Pick a random walkable point within ~200px
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 150;
      ai._roamX = e.x + Math.cos(angle) * radius;
      ai._roamY = e.y + Math.sin(angle) * radius;
      ai._roamAge = 0;
    }
    ai._roamAge = (ai._roamAge || 0) + 1;

    const dx = ai._roamX - e.x, dy = ai._roamY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 15) {
      this.moveToward(e, ai._roamX, ai._roamY, dist);
    } else {
      e.moving = false;
      ai._roamAge = 120; // pick a new point next frame
    }

    this.applySeparation(member);
  },

  // HUNT: mob exists but out of engage range — run toward it independently
  doHunt(member, mob, dist) {
    if (!mob || mob.hp <= 0) { member.ai.state = 'follow'; return; }
    const e = member.entity;

    // Face and move toward the mob
    this.faceTarget(e, mob);

    // Each bot approaches from a slightly different angle so they don't stack
    const spreadAngle = ((member.slotIndex - 1) / 3) * Math.PI * 2;
    const offsetX = Math.cos(spreadAngle) * 35;
    const offsetY = Math.sin(spreadAngle) * 35;
    this.moveToward(e, mob.x + offsetX, mob.y + offsetY, dist);

    this.applySeparation(member);
  },

  // ENGAGE: in shooting range — shoot + strafe, actively use melee
  doEngage(member, mob, dist) {
    if (!mob || mob.hp <= 0) { member.ai.state = 'follow'; return; }
    const e = member.entity;
    const ml = member.melee;
    const g = member.gun;

    this.faceTarget(e, mob);

    // Decide combat style: melee-focused if melee DPS > gun DPS or gun is empty/reloading
    const meleeDPS = ml ? (ml.damage / (ml.cooldown || 24)) : 0;
    const gunDPS = g ? (g.damage / Math.max(1, (g.fireRate || 5) * 4)) : 0;
    const gunEmpty = !g || g.reloading || g.ammo <= 0;
    const preferMelee = ml && (meleeDPS >= gunDPS * 0.8 || gunEmpty);
    const meleeRange = ml ? ml.range : 70;

    if (preferMelee) {
      // Melee-focused: rush toward mob to get in melee range
      if (dist > meleeRange - 10) {
        const spreadAngle = ((member.slotIndex - 1) / 3) * Math.PI * 2;
        const offsetX = Math.cos(spreadAngle) * 20;
        const offsetY = Math.sin(spreadAngle) * 20;
        this.moveToward(e, mob.x + offsetX, mob.y + offsetY, dist);
      } else {
        // In melee range — strafe around the mob
        this._doStrafe(member, mob, dist);
      }
    } else {
      // Gun-focused: maintain effective range
      if (dist > PARTY_CONFIG.BOT_EFFECTIVE_RANGE + 20) {
        const spreadAngle = ((member.slotIndex - 1) / 3) * Math.PI * 2;
        const offsetX = Math.cos(spreadAngle) * 40;
        const offsetY = Math.sin(spreadAngle) * 40;
        this.moveToward(e, mob.x + offsetX, mob.y + offsetY, dist);
      } else if (dist < PARTY_CONFIG.BOT_EFFECTIVE_RANGE - 30) {
        this.moveAway(e, mob.x, mob.y, dist);
      } else {
        this._doStrafe(member, mob, dist);
      }
    }

    this.applySeparation(member);

    // Shoot (even melee-focused bots shoot while closing in)
    if (g && !g.reloading && member.ai.shootCD <= 0 && g.ammo > 0) {
      this.botShoot(member, mob);
    }

    // Reload if empty
    if (g && g.ammo <= 0 && !g.reloading) {
      g.reloading = true;
      g.reloadTimer = 90;
    }

    // Melee when in range
    if (ml && dist < meleeRange && member.ai.meleeCD <= 0) {
      this.botMelee(member, mob);
    }
  },

  // Strafe perpendicular to the mob (lateral movement while at effective range)
  _doStrafe(member, mob, dist) {
    const e = member.entity;
    const ai = member.ai;

    // Initialize strafe direction — flip every 60-120 frames
    if (!ai._strafeDir) ai._strafeDir = Math.random() < 0.5 ? 1 : -1;
    if (!ai._strafeTimer) ai._strafeTimer = 0;
    ai._strafeTimer++;
    if (ai._strafeTimer > 60 + Math.random() * 60) {
      ai._strafeDir *= -1;
      ai._strafeTimer = 0;
    }

    // Perpendicular direction to mob
    const dx = mob.x - e.x, dy = mob.y - e.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    // Perpendicular: rotate 90 degrees
    const perpX = -dy / d * ai._strafeDir;
    const perpY = dx / d * ai._strafeDir;

    const spd = (e.speed || GAME_CONFIG.PLAYER_BASE_SPEED) * 0.5; // half speed strafe
    const newX = e.x + perpX * spd;
    const newY = e.y + perpY * spd;
    if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
    if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
    e.moving = true;
    // Keep facing the mob, not the strafe direction
  },

  // FLEE: run toward the shop station (safety) while shooting
  doFlee(member, mob) {
    if (!mob) { member.ai.state = 'follow'; return; }
    const e = member.entity;

    // Flee toward shop station instead of just away from mob
    const dx = this.SHOP_X - e.x, dy = this.SHOP_Y - e.y;
    const distToShop = Math.sqrt(dx * dx + dy * dy) || 1;

    if (distToShop > 30) {
      // Move toward shop
      const spd = e.speed || GAME_CONFIG.PLAYER_BASE_SPEED;
      const nx = dx / distToShop, ny = dy / distToShop;
      const newX = e.x + nx * spd * 0.8;
      const newY = e.y + ny * spd * 0.8;
      if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
      if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
      e.moving = true;
      this.faceDirection(e, nx, ny);
    } else {
      // At shop — just move away from the mob
      this.moveAway(e, mob.x, mob.y, Math.sqrt((mob.x - e.x) ** 2 + (mob.y - e.y) ** 2) || 1);
    }

    // Still shoot while fleeing if possible
    if (member.gun && !member.gun.reloading && member.ai.shootCD <= 0 && member.gun.ammo > 0) {
      this.faceTarget(e, mob);
      this.botShoot(member, mob);
    }
  },

  // ---- Separation: push bots apart so they don't stack ----
  applySeparation(member) {
    const e = member.entity;
    const sepDist = PARTY_CONFIG.BOT_SEPARATION_DIST;
    let pushX = 0, pushY = 0;
    for (const other of PartyState.members) {
      if (other === member || other.dead || !other.active) continue;
      const oe = other.entity;
      const dx = e.x - oe.x, dy = e.y - oe.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < sepDist && d > 0.1) {
        const force = (sepDist - d) / sepDist;
        pushX += (dx / d) * force * 3;
        pushY += (dy / d) * force * 3;
      }
    }
    if (pushX !== 0 || pushY !== 0) {
      const newX = e.x + pushX;
      const newY = e.y + pushY;
      if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
      if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
    }
  },

  // ---- Movement Helpers ----
  moveToward(e, tx, ty, dist, member) {
    if (dist < 1) { e.moving = false; return; }
    const dx = tx - e.x, dy = ty - e.y;
    const nx = dx / dist, ny = dy / dist;
    const fxMult = (member && member.ai && member.ai._fxSpeedMult) || 1;
    const spd = (e.speed || GAME_CONFIG.PLAYER_BASE_SPEED) * fxMult;
    const hw = GAME_CONFIG.PLAYER_WALL_HW;
    const newX = e.x + nx * spd;
    const newY = e.y + ny * spd;
    let movedX = false, movedY = false;
    if (positionClear(newX, e.y, hw)) { e.x = newX; movedX = true; }
    if (positionClear(e.x, newY, hw)) { e.y = newY; movedY = true; }
    // Wall-slide: if blocked on both axes, try perpendicular slide to avoid getting stuck
    if (!movedX && !movedY) {
      // Try sliding along the dominant axis
      const slideX = e.x + (nx > 0 ? spd : -spd);
      const slideY = e.y + (ny > 0 ? spd : -spd);
      if (positionClear(slideX, e.y, hw)) { e.x = slideX; movedX = true; }
      else if (positionClear(e.x, slideY, hw)) { e.y = slideY; movedY = true; }
    }
    e.moving = movedX || movedY;
    this.faceDirection(e, nx, ny);
  },

  moveAway(e, fx, fy, dist, member) {
    if (dist < 1) dist = 1;
    const dx = e.x - fx, dy = e.y - fy;
    const nx = dx / dist, ny = dy / dist;
    const fxMult = (member && member.ai && member.ai._fxSpeedMult) || 1;
    const spd = (e.speed || GAME_CONFIG.PLAYER_BASE_SPEED) * fxMult;
    const newX = e.x + nx * spd * 0.7;
    const newY = e.y + ny * spd * 0.7;
    if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
    if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
    e.moving = true;
    this.faceDirection(e, nx, ny);
  },

  faceTarget(e, target) {
    const dx = target.x - e.x, dy = target.y - e.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      e.dir = dx > 0 ? 3 : 2;
    } else {
      e.dir = dy > 0 ? 0 : 1;
    }
  },

  faceDirection(e, nx, ny) {
    if (Math.abs(nx) > Math.abs(ny)) {
      e.dir = nx > 0 ? 3 : 2;
    } else {
      e.dir = ny > 0 ? 0 : 1;
    }
  },

  // ---- Combat ----
  botShoot(member, mob) {
    const e = member.entity;
    const g = member.gun;
    const dx = mob.x - e.x, dy = mob.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const bspd = GAME_CONFIG.BULLET_SPEED;

    bullets.push({
      id: nextBulletId++,
      x: e.x, y: e.y - 10,
      vx: (dx / dist) * bspd,
      vy: (dy / dist) * bspd,
      fromPlayer: true,
      damage: g.damage,
      special: g.special,
      ownerId: member.id,
      _botBullet: true,
      bulletColor: g.bulletColor || null,
    });

    g.ammo--;
    // Use the gun's actual fireRate (same formula as player: fireRate * 4 frames)
    member.ai.shootCD = (g.fireRate || 5) * 4;
  },

  botMelee(member, mob) {
    const e = member.entity;
    const ml = member.melee;
    const dx = mob.x - e.x, dy = (mob.y - 20) - (e.y - 20);
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ml.range) {
      const dealt = dealDamageToMob(mob, ml.damage, 'melee', e);
      if (dealt !== false) {
        hitEffects.push({ x: mob.x, y: mob.y - 20, life: 19, type: "hit", dmg: ml.damage });
      }
      // Use the melee's actual cooldown (same as player)
      member.ai.meleeCD = ml.cooldown || ml.cooldownMax || 24;
    }
  },

  // Use a potion — same heal logic as player (healAmount + heal boost from chest)
  botUsePotion(member) {
    const e = member.entity;
    const p = member.potion;
    if (!p || p.count <= 0 || p.cooldown > 0 || e.hp >= e.maxHp) return;
    p.count--;
    p.cooldown = p.cooldownMax;
    const chestHealBoost = member.equip.chest && member.equip.chest.healBoost ? member.equip.chest.healBoost : 0;
    const boostedHeal = Math.round(p.healAmount * (1 + chestHealBoost));
    const healed = Math.min(boostedHeal, e.maxHp - e.hp);
    e.hp = Math.min(e.maxHp, e.hp + boostedHeal);
    hitEffects.push({ x: e.x, y: e.y - 30, life: 20, type: "heal", dmg: "+" + healed + " HP" });
  },
};
