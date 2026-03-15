// ===================== BOT AI =====================
// Authority: bot movement, combat AI, shooting, pathfinding.
// Simple FSM: FOLLOW → ENGAGE → FLEE
// Called from authorityTick when PartyState.active.

const BotAI = {
  // Main tick — called once per frame for all bots
  tick() {
    if (!PartyState.active) return;
    for (const member of PartyState.members) {
      if (member.controlType !== 'bot' || member.dead || !member.active) continue;
      this.tickBot(member);
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

    // Tick reload
    if (member.gun && member.gun.reloading) {
      member.gun.reloadTimer--;
      if (member.gun.reloadTimer <= 0) {
        member.gun.reloading = false;
        member.gun.ammo = member.gun.magSize;
      }
    }

    // Find nearest mob
    let nearestMob = null, nearestDist = Infinity;
    for (const m of mobs) {
      if (m.hp <= 0) continue;
      const dx = m.x - e.x, dy = m.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; nearestMob = m; }
    }

    // FSM transitions
    const hpFrac = e.hp / e.maxHp;
    if (hpFrac < PARTY_CONFIG.BOT_FLEE_THRESHOLD && nearestMob && nearestDist < 150) {
      ai.state = 'flee';
    } else if (nearestMob && nearestDist < PARTY_CONFIG.BOT_ENGAGE_RANGE) {
      ai.state = 'engage';
      ai.target = nearestMob;
    } else {
      ai.state = 'follow';
      ai.target = null;
    }

    // Execute state
    switch (ai.state) {
      case 'follow': this.doFollow(member); break;
      case 'engage': this.doEngage(member, nearestMob, nearestDist); break;
      case 'flee': this.doFlee(member, nearestMob); break;
    }

    // Update animation
    if (e.moving) {
      e.animTimer++;
      if (e.animTimer >= 8) { e.animTimer = 0; e.frame = (e.frame + 1) % 4; }
    } else {
      e.frame = 0; e.animTimer = 0;
    }
  },

  // FOLLOW: trail the leader (player if alive, else nearest alive member)
  doFollow(member) {
    const e = member.entity;
    let leader = null;

    // Follow player if alive, else nearest alive bot
    if (!playerDead) {
      leader = player;
    } else {
      const alive = PartySystem.getAlive().filter(m => m !== member && !m.dead);
      if (alive.length > 0) {
        let best = alive[0], bestD = Infinity;
        for (const a of alive) {
          const dx = a.entity.x - e.x, dy = a.entity.y - e.y;
          const d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = a; }
        }
        leader = best.entity;
      }
    }

    if (!leader) { e.moving = false; return; }

    const dx = leader.x - e.x, dy = leader.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > PARTY_CONFIG.BOT_FOLLOW_MAX) {
      this.moveToward(e, leader.x, leader.y, dist);
    } else if (dist < PARTY_CONFIG.BOT_FOLLOW_MIN) {
      e.moving = false;
    } else {
      e.moving = false;
    }
  },

  // ENGAGE: move to effective range + shoot
  doEngage(member, mob, dist) {
    if (!mob || mob.hp <= 0) { member.ai.state = 'follow'; return; }
    const e = member.entity;

    // Face the mob
    this.faceTarget(e, mob);

    if (dist > PARTY_CONFIG.BOT_EFFECTIVE_RANGE + 20) {
      // Move closer
      this.moveToward(e, mob.x, mob.y, dist);
    } else if (dist < PARTY_CONFIG.BOT_EFFECTIVE_RANGE - 30) {
      // Too close, back up slightly
      this.moveAway(e, mob.x, mob.y, dist);
    } else {
      e.moving = false;
    }

    // Shoot
    if (member.gun && !member.gun.reloading && member.ai.shootCD <= 0 && member.gun.ammo > 0) {
      this.botShoot(member, mob);
    }

    // Reload if empty
    if (member.gun && member.gun.ammo <= 0 && !member.gun.reloading) {
      member.gun.reloading = true;
      member.gun.reloadTimer = 90; // 1.5s reload
    }

    // Melee if close
    if (dist < 70 && member.ai.meleeCD <= 0 && member.melee) {
      this.botMelee(member, mob);
    }
  },

  // FLEE: run away from nearest threat
  doFlee(member, mob) {
    if (!mob) { member.ai.state = 'follow'; return; }
    const e = member.entity;
    const dx = mob.x - e.x, dy = mob.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    // Move away
    this.moveAway(e, mob.x, mob.y, dist);
  },

  // ---- Movement Helpers ----
  moveToward(e, tx, ty, dist) {
    if (dist < 1) { e.moving = false; return; }
    const dx = tx - e.x, dy = ty - e.y;
    const nx = dx / dist, ny = dy / dist;
    const spd = e.speed || GAME_CONFIG.PLAYER_BASE_SPEED;
    const newX = e.x + nx * spd;
    const newY = e.y + ny * spd;
    if (positionClear(newX, e.y, GAME_CONFIG.PLAYER_WALL_HW)) e.x = newX;
    if (positionClear(e.x, newY, GAME_CONFIG.PLAYER_WALL_HW)) e.y = newY;
    e.moving = true;
    this.faceDirection(e, nx, ny);
  },

  moveAway(e, fx, fy, dist) {
    if (dist < 1) dist = 1;
    const dx = e.x - fx, dy = e.y - fy;
    const nx = dx / dist, ny = dy / dist;
    const spd = e.speed || GAME_CONFIG.PLAYER_BASE_SPEED;
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
      e.dir = dx > 0 ? 3 : 2; // right : left
    } else {
      e.dir = dy > 0 ? 0 : 1; // down : up
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
    });

    g.ammo--;
    member.ai.shootCD = PARTY_CONFIG.BOT_SHOOT_CD;
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
      member.ai.meleeCD = PARTY_CONFIG.BOT_MELEE_CD;
    }
  },
};
