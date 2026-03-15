// ===================== BOT AI =====================
// Authority: bot movement, combat AI, shooting, pathfinding.
// FSM: FOLLOW → HUNT → ENGAGE → FLEE
// Bots are autonomous — they roam, find mobs, and fight independently.
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

    // Find nearest mob (any distance)
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
    } else if (nearestMob && nearestDist <= PARTY_CONFIG.BOT_ENGAGE_RANGE) {
      // Close enough to shoot — engage
      ai.state = 'engage';
      ai.target = nearestMob;
    } else if (nearestMob) {
      // Mob exists but far away — hunt it down
      ai.state = 'hunt';
      ai.target = nearestMob;
    } else {
      // No mobs alive — chill near player
      ai.state = 'follow';
      ai.target = null;
    }

    // Execute state
    switch (ai.state) {
      case 'follow': this.doFollow(member); break;
      case 'hunt':   this.doHunt(member, nearestMob, nearestDist); break;
      case 'engage': this.doEngage(member, nearestMob, nearestDist); break;
      case 'flee':   this.doFlee(member, nearestMob); break;
    }

    // Update animation
    if (e.moving) {
      e.animTimer++;
      if (e.animTimer >= 8) { e.animTimer = 0; e.frame = (e.frame + 1) % 4; }
    } else {
      e.frame = 0; e.animTimer = 0;
    }
  },

  // FOLLOW: loosely stay near player between waves, or roam if player is dead
  doFollow(member) {
    const e = member.entity;
    const ai = member.ai;

    // If player is dead, don't just stand there — roam around independently
    if (playerDead) {
      this.doRoam(member);
      return;
    }

    // Player alive, between waves — spread out near player
    const spreadAngle = ((member.slotIndex - 1) / 3) * Math.PI * 2 + Math.PI * 0.5;
    const spreadR = PARTY_CONFIG.BOT_SPREAD_RADIUS;
    const goalX = player.x + Math.cos(spreadAngle) * spreadR;
    const goalY = player.y + Math.sin(spreadAngle) * spreadR;

    const dx = goalX - e.x, dy = goalY - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 30) {
      this.moveToward(e, goalX, goalY, dist);
    } else {
      e.moving = false;
    }

    this.applySeparation(member);
  },

  // ROAM: wander independently when player is dead and no mobs exist
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

  // ENGAGE: in shooting range — shoot + position for combat
  doEngage(member, mob, dist) {
    if (!mob || mob.hp <= 0) { member.ai.state = 'follow'; return; }
    const e = member.entity;

    this.faceTarget(e, mob);

    if (dist > PARTY_CONFIG.BOT_EFFECTIVE_RANGE + 20) {
      // Move closer but at a spread angle
      const spreadAngle = ((member.slotIndex - 1) / 3) * Math.PI * 2;
      const offsetX = Math.cos(spreadAngle) * 40;
      const offsetY = Math.sin(spreadAngle) * 40;
      this.moveToward(e, mob.x + offsetX, mob.y + offsetY, dist);
    } else if (dist < PARTY_CONFIG.BOT_EFFECTIVE_RANGE - 30) {
      this.moveAway(e, mob.x, mob.y, dist);
    } else {
      e.moving = false;
    }

    this.applySeparation(member);

    // Shoot
    if (member.gun && !member.gun.reloading && member.ai.shootCD <= 0 && member.gun.ammo > 0) {
      this.botShoot(member, mob);
    }

    // Reload if empty
    if (member.gun && member.gun.ammo <= 0 && !member.gun.reloading) {
      member.gun.reloading = true;
      member.gun.reloadTimer = 90;
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

    this.moveAway(e, mob.x, mob.y, dist);

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
