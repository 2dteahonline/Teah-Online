// ===================== EARTH-205: MARBLE CITY MOB SPECIALS =====================
// Dungeon 4 — Gothic noir city. 40 regular specials + ~60 boss specials.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 1 REGULAR SPECIALS =====================

// 1. Pipe Swipe — melee cone attack (scrap_metal_scrounger)
MOB_SPECIALS.pipe_swipe = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._pipeSwipeTele) {
    m._pipeSwipeTele--;
    if (m._pipeSwipeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 80, player)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "pipe_hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 100) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._pipeSwipeTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 60, range: 80 }, delayFrames: 30, color: [160, 140, 120], owner: m.id });
  }
  return { skip: true };
};

// 2. Slingshot Snipe — ranged projectile with telegraph (alleyway_lookout)
MOB_SPECIALS.slingshot_snipe = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._slingshotTele) {
    m._slingshotTele--;
    if (m._slingshotTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 11, vy: Math.sin(dir) * 11,
        fromPlayer: false, mobBullet: true, damage: Math.round(30 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#aa8855',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._slingshotTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 60, color: [170, 136, 85], owner: m.id });
  }
  return { skip: true };
};

// 3. Ankle Bite — dash + bleed (junkyard_hound)
MOB_SPECIALS.ankle_bite = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._biteDashing) {
    m._biteTimer--;
    const t = 1 - (m._biteTimer / 16);
    m.x = m._biteSX + (m._biteTX - m._biteSX) * t;
    m.y = m._biteSY + (m._biteTY - m._biteSY) * t;
    if (m._biteTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48, player)) {
        const dmg = Math.round(18 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('bleed', { duration: 180, dmg: 4 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "hit" });
      }
      m._biteDashing = false;
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 60 || dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 240));
  m._biteSX = m.x; m._biteSY = m.y;
  m._biteTX = clamped.x; m._biteTY = clamped.y;
  m._biteDashing = true; m._biteTimer = 16;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
  return { skip: true };
};

// 4. Hairspray Flamethrower — channeled cone damage (aerosol_pyro)
MOB_SPECIALS.hairspray_flamethrower = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._flameChannel && m._flameChannel > 0) {
    m._flameChannel--;
    m._flameTicks = (m._flameTicks || 0) + 1;
    if (m._flameTicks >= 18) {
      m._flameTicks = 0;
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 120, player)) {
        const dmg = Math.round(8 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "flamethrower_tick", dmg: dealt });
      }
    }
    if (m._flameChannel <= 0) {
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 140) { m._specialTimer = 30; return {}; }
  m._flameChannel = 120;
  m._flameTicks = 0;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
  return { skip: true };
};

// 5. Frenzied Slash — 3-hit melee combo (patchwork_thug)
MOB_SPECIALS.frenzied_slash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._frenzyTimer !== undefined && m._frenzyTimer > 0) {
    m._frenzyTimer--;
    const elapsed = 60 - m._frenzyTimer;
    // Hit at frame 0, 20, 40
    if (elapsed === 0 || elapsed === 20 || elapsed === 40) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
        const dmg = Math.round(12 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        m._frenzyHits = (m._frenzyHits || 0) + 1;
        // Final hit stuns
        if (m._frenzyHits >= 3) {
          StatusFX.applyToPlayer('stun', { duration: 30 });
          hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
        }
      }
    }
    if (m._frenzyTimer <= 0) {
      m._frenzyHits = 0;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 90) { m._specialTimer = 30; return {}; }
  m._frenzyTimer = 60;
  m._frenzyHits = 0;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 6. Pneumatic Shot — projectile with root on hit (nail_gunner)
MOB_SPECIALS.pneumatic_shot = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
    fromPlayer: false, mobBullet: true, damage: Math.round(22 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#8899aa',
    onHitPlayer: (b, hitTarget) => {
      StatusFX.applyToPlayer('root', { duration: 60 });
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "nail_pin" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 180;
  return {};
};

// 7. Glass Flurry — zig-zag dash with hit at end (adrenaline_fiend)
MOB_SPECIALS.glass_flurry = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._glassPhase !== undefined && m._glassPhase > 0) {
    m._glassTimer--;
    const segment = 3 - m._glassPhase; // 0, 1, 2
    const segProgress = 1 - (m._glassTimer / 5);
    const dirToPlayer = Math.atan2(player.y - m._glassSY, player.x - m._glassSX);
    // Perpendicular offset alternates each segment
    const perpDir = dirToPlayer + (segment % 2 === 0 ? Math.PI / 2 : -Math.PI / 2);
    const perpOffset = Math.sin(segProgress * Math.PI) * 60;
    const forwardDist = (segment + segProgress) / 3 * dist;
    m.x = m._glassSX + Math.cos(dirToPlayer) * forwardDist + Math.cos(perpDir) * perpOffset;
    m.y = m._glassSY + Math.sin(dirToPlayer) * forwardDist + Math.sin(perpDir) * perpOffset;
    if (m._glassTimer <= 0) {
      m._glassPhase--;
      m._glassTimer = 5;
    }
    if (m._glassPhase <= 0) {
      // End of zig-zag — check for hit
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(28 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 50 || dist > 200) { m._specialTimer = 30; return {}; }
  m._glassSX = m.x; m._glassSY = m.y;
  m._glassPhase = 3;
  m._glassTimer = 5;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
  return { skip: true };
};

// 8. Earthquake Slam E205 — AoE slam with telegraph (sledgehammer_brute)
MOB_SPECIALS.earthquake_slam_e205 = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._slamTele) {
    m._slamTele--;
    if (m._slamTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100, player)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 9.6, Math.sin(kbDir) * 9.6);
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "sledgehammer_shockwave" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 120) { m._specialTimer = 30; return {}; }
  m._slamTele = 48;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 100 }, delayFrames: 48, color: [180, 140, 100], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 2 REGULAR SPECIALS =====================

// 9. Boomerang Cleave — projectile out, then return projectile (butcher_block_maniac)
MOB_SPECIALS.boomerang_cleave = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  if (m._boomPhase && m._boomPhase > 0) {
    m._boomPhase--;
    if (m._boomPhase === 15) {
      // Fire return projectile from approximate target position back toward mob
      const returnDir = Math.atan2(m.y - m._boomTargetY, m.x - m._boomTargetX);
      bullets.push({
        id: nextBulletId++, x: m._boomTargetX, y: m._boomTargetY - 8,
        vx: Math.cos(returnDir) * 7, vy: Math.sin(returnDir) * 7,
        fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#996644',
      });
    }
    if (m._boomPhase <= 0) {
      m._specialTimer = m._specialCD || 270;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._boomTargetX = m.x + Math.cos(dir) * Math.min(dist, 200);
  m._boomTargetY = m.y + Math.sin(dir) * Math.min(dist, 200);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 7, vy: Math.sin(dir) * 7,
    fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#996644',
  });
  m._boomPhase = 40;
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  return {};
};

// 10. Chain Whip — line attack with silence (chain_gang_brawler)
MOB_SPECIALS.chain_whip = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 170) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const endX = m.x + Math.cos(dir) * 150;
  const endY = m.y + Math.sin(dir) * 150;
  if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m.x, m.y, endX, endY, 30, player)) {
    const dmg = Math.round(22 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "chain_hit", dmg: dealt });
    StatusFX.applyToPlayer('silence', { duration: 60 });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._specialTimer = m._specialCD || 240;
  return {};
};

// 11. Flare Trap — lob projectile that creates fire zone (arsonist)
MOB_SPECIALS.flare_trap = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const speed = 5;
  const blt = {
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
    fromPlayer: false, mobBullet: true, damage: Math.round(10 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ff6633', life: 60,
    onExpire: function() {
      const bx = this.x || m.x, by = this.y || m.y;
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: bx, cy: by, radius: 80, duration: 300, tickDamage: 6, color: [255, 100, 40] });
      } else {
        // Fallback — AoE damage
        if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(bx, by, 80, player)) {
          const dmg = Math.round(6 * getMobDamageMultiplier());
          dealDamageToPlayer(dmg, 'mob_special', m);
        }
        hitEffects.push({ x: bx, y: by, life: 30, type: "burn_tick" });
      }
    },
  };
  bullets.push(blt);
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 300;
  return {};
};

// 12. Guillotine Drop — heavy telegraph, huge damage or self-stun on miss (executioner_bruiser)
MOB_SPECIALS.guillotine_drop = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._stunned && m._stunTimer > 0) {
    m._stunTimer--;
    if (m._stunTimer <= 0) m._stunned = false;
    return { skip: true };
  }
  if (m._guillotineTele) {
    m._guillotineTele--;
    if (m._guillotineTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "cleaver_slash", dmg: dealt });
      } else {
        // Missed — self-stun
        m._stunned = true;
        m._stunTimer = 60;
        hitEffects.push({ x: m.x, y: m.y - 10, life: 25, type: "stun" });
      }
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 80) { m._specialTimer = 30; return {}; }
  m._guillotineTele = 72;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 60 }, delayFrames: 72, color: [200, 60, 60], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 13. Suppressive Burst — 3-bullet spread with slow (syndicate_enforcer)
MOB_SPECIALS.suppressive_burst = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spreadAngle = (15 * Math.PI) / 180; // 15 degrees
  for (let i = -1; i <= 1; i++) {
    const angle = dir + i * spreadAngle;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
      fromPlayer: false, mobBullet: true, damage: Math.round(15 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#778899',
      onHitPlayer: (b, hitTarget) => {
        StatusFX.applyToPlayer('slow', { duration: 60, amount: 0.5 });
      },
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 210;
  return {};
};

// 14. Kick and Clear — dash then shotgun burst (breacher_unit)
MOB_SPECIALS.kick_and_clear = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Phase 2: shotgun after dash
  if (m._breachPhase === 2) {
    m._breachTimer--;
    if (m._breachTimer <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const spreadAngle = (15 * Math.PI) / 180;
      for (let i = -1; i <= 1; i++) {
        const angle = dir + i * spreadAngle;
        bullets.push({
          id: nextBulletId++, x: m.x, y: m.y - 8,
          vx: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED, vy: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED,
          fromPlayer: false, mobBullet: true, damage: Math.round(10 * getMobDamageMultiplier()),
          ownerId: m.id, bulletColor: '#99aabb',
        });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._breachPhase = 0;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Phase 1: dash toward player
  if (m._breachPhase === 1) {
    m._breachTimer--;
    const t = 1 - (m._breachTimer / 12);
    m.x = m._breachSX + (m._breachTX - m._breachSX) * t;
    m.y = m._breachSY + (m._breachTY - m._breachSY) * t;
    if (m._breachTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 30 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      m._breachPhase = 2;
      m._breachTimer = 10; // Brief pause before shotgun
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 60 || dist > 180) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 120);
  m._breachSX = m.x; m._breachSY = m.y;
  m._breachTX = clamped.x; m._breachTY = clamped.y;
  m._breachPhase = 1;
  m._breachTimer = 12;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
  return { skip: true };
};

// 15. Laser Designation — telegraph then heavy projectile (tactical_spotter)
MOB_SPECIALS.laser_designation = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._laserTele) {
    m._laserTele--;
    if (m._laserTele <= 0) {
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(m._laserDir) * 11, vy: Math.sin(m._laserDir) * 11,
        fromPlayer: false, mobBullet: true, damage: Math.round(40 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ff4444',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._laserDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._laserTele = 90;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._laserDir) * 400;
    const endY = m.y + Math.sin(m._laserDir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 90, color: [255, 68, 68], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 16. Bouncing Blast — grenade that bounces off walls (riot_juggernaut)
MOB_SPECIALS.bouncing_blast = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 5, vy: Math.sin(dir) * 5,
    fromPlayer: false, mobBullet: true, damage: Math.round(30 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#aa6633', life: 180,
    _bounces: 2,
    onWallHit: function(b) {
      if (b._bounces > 0) {
        b._bounces--;
        const prevX = b.x - b.vx, prevY = b.y - b.vy;
        const prevCol = Math.floor(prevX / TILE), prevRow = Math.floor(prevY / TILE);
        const curCol = Math.floor(b.x / TILE), curRow = Math.floor(b.y / TILE);
        if (prevCol !== curCol) b.vx = -b.vx;
        if (prevRow !== curRow) b.vy = -b.vy;
        if (prevCol === curCol && prevRow === curRow) { b.vx = -b.vx; b.vy = -b.vy; }
        b.x += b.vx * 1.5;
        b.y += b.vy * 1.5;
        b._handled = true;
      }
    },
    onExpire: function() {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(this.x, this.y, 80, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
      }
      hitEffects.push({ x: this.x, y: this.y, life: 25, type: "grenade_explosion" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 270;
  return {};
};

// ===================== WILLIS BOSS SPECIALS =====================
// Boss: Willis — Jury-rigged gadgeteer. Floor 1 boss.

// 17. Jury-Rigged Taser — stun projectile
MOB_SPECIALS.jury_rigged_taser = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
    fromPlayer: false, mobBullet: true, damage: Math.round(30 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#44ddff',
    onHitPlayer: (b, hitTarget) => {
      StatusFX.applyToPlayer('stun', { duration: 60 });
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 25, type: "stun" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.jury_rigged_taser = 240;
  return {};
};

// 18. Chemical Flask — lob projectile, poison puddle on expire
MOB_SPECIALS.chemical_flask = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const targetDist = Math.min(Math.sqrt((player.x - m.x) ** 2 + (player.y - m.y) ** 2), 280);
  const targetX = m.x + Math.cos(dir) * targetDist;
  const targetY = m.y + Math.sin(dir) * targetDist;
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 4.5, vy: Math.sin(dir) * 4.5,
    fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#66ff44', life: 60,
    onExpire: function() {
      const bx = this.x || targetX, by = this.y || targetY;
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: bx, cy: by, radius: 70, duration: 300, tickDamage: 8, color: [100, 200, 100] });
      }
      hitEffects.push({ x: bx, y: by, life: 30, type: "smoke" });
      // Poison on direct hit area
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(bx, by, 70, player)) {
        StatusFX.applyToPlayer('bleed', { duration: 300, dmg: 8 });
      }
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  m._abilityCDs.chemical_flask = 300;
  return {};
};

// 19. Caltrop Scatter — drop caltrops around self
MOB_SPECIALS.caltrop_scatter = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._caltrops === undefined) m._caltrops = [];
  // Clean up expired caltrops
  m._caltrops = m._caltrops.filter(c => c.life > 0);
  // Check existing caltrops for player collision
  for (const c of m._caltrops) {
    c.life--;
    const cdx = player.x - c.x, cdy = player.y - c.y;
    if (Math.sqrt(cdx * cdx + cdy * cdy) < 20 && !c._hit) {
      const dmg = Math.round(10 * getMobDamageMultiplier());
      dealDamageToPlayer(dmg, 'mob_special', m);
      StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.5 });
      hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dmg });
      c._hit = true;
    }
  }
  // Don't scatter if this is just tick maintenance
  if (m._abilityCDs && m._abilityCDs.caltrop_scatter > 0) return {};
  // Scatter 5 caltrops
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 80;
    const cx = m.x + Math.cos(angle) * r;
    const cy = m.y + Math.sin(angle) * r;
    m._caltrops.push({ x: cx, y: cy, life: 360, _hit: false });
    hitEffects.push({ x: cx, y: cy, life: 20, type: "smoke" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "CALTROPS!" });
  m._abilityCDs.caltrop_scatter = 360;
  return {};
};

// 20. Decoy Device — spawn a decoy mob
MOB_SPECIALS.decoy_device = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  const angle = Math.random() * Math.PI * 2;
  const sx = m.x + Math.cos(angle) * 60;
  const sy = m.y + Math.sin(angle) * 60;
  mobs.push({
    x: sx, y: sy, type: 'decoy_willis', id: nextMobId++,
    hp: 1, maxHp: 1,
    speed: 4, damage: 0,
    contactRange: 0, skin: m.skin || '#c4a882', hair: m.hair || '#444', shirt: m.shirt || '#667788', pants: m.pants || '#445566',
    name: 'Decoy', dir: 0, frame: 0, attackCooldown: 0,
    shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
    summonRate: 0, summonMax: 0, summonTimer: 0,
    arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
    _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
    _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
    _summonOwnerId: m.id, scale: 1.0, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    _decoyLife: 300,
    aiType: 'runner',
  });
  hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "DECOY!" });
  m._abilityCDs.decoy_device = 600;
  return {};
};

// 21. Calculated Dodge — reactive dodge when taking damage
MOB_SPECIALS.calculated_dodge = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._lastHp === undefined) m._lastHp = m.hp;
  if (m._dodgeCD === undefined) m._dodgeCD = 0;
  if (m._dodgeCD > 0) m._dodgeCD--;
  // Check if mob took damage this frame
  if (m.hp < m._lastHp && m._dodgeCD <= 0) {
    if (Math.random() < 0.3) {
      // Dodge — dash random direction
      const angle = Math.random() * Math.PI * 2;
      const clamped = clampDashTarget(m.x, m.y, angle, 100);
      m.x = clamped.x;
      m.y = clamped.y;
      m._invuln = 18;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
      hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "DODGE!" });
      m._dodgeCD = 120;
    }
  }
  m._lastHp = m.hp;
  // No CD set here — this is passive, always runs
  return {};
};

// 22. Makeshift EMP — AoE silence
MOB_SPECIALS.makeshift_emp = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120, player)) {
    const dmg = Math.round(25 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "chemical_beam", dmg: dealt });
    StatusFX.applyToPlayer('silence', { duration: 120 });
  }
  hitEffects.push({ x: m.x, y: m.y, life: 25, type: "chemical_beam" });
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "EMP!" });
  m._abilityCDs.makeshift_emp = 720;
  return {};
};

// 23. Master Plan — combo: flask + caltrops + 3 decoys
MOB_SPECIALS.master_plan = (m, ctx) => {
  const { player, hitEffects, bullets, mobs } = ctx;
  // Fire chemical flask
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const targetDist = Math.min(Math.sqrt((player.x - m.x) ** 2 + (player.y - m.y) ** 2), 280);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 4.5, vy: Math.sin(dir) * 4.5,
    fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#66ff44', life: 60,
    onExpire: function() {
      const bx = this.x, by = this.y;
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: bx, cy: by, radius: 70, duration: 300, tickDamage: 8, color: [100, 200, 100] });
      }
      hitEffects.push({ x: bx, y: by, life: 30, type: "smoke" });
    },
  });
  // Scatter 5 caltrops
  if (m._caltrops === undefined) m._caltrops = [];
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 80;
    m._caltrops.push({ x: m.x + Math.cos(angle) * r, y: m.y + Math.sin(angle) * r, life: 360, _hit: false });
  }
  // Spawn 3 decoys
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sx = m.x + Math.cos(angle) * 80;
    const sy = m.y + Math.sin(angle) * 80;
    if (!positionClear(sx, sy)) continue;
    mobs.push({
      x: sx, y: sy, type: 'decoy_willis', id: nextMobId++,
      hp: 1, maxHp: 1,
      speed: 4, damage: 0,
      contactRange: 0, skin: m.skin || '#c4a882', hair: m.hair || '#444', shirt: m.shirt || '#667788', pants: m.pants || '#445566',
      name: 'Decoy', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 1.0, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
      _decoyLife: 300, aiType: 'runner',
    });
    hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "MASTER PLAN!" });
  m._abilityCDs.master_plan = 1200;
  return {};
};

// ===================== PUPPEDRILL BOSS SPECIALS =====================
// Boss: Puppedrill — Brutal melee enforcer. Floor 1 boss.

// 24. Crowbar Hook — pull player toward self
MOB_SPECIALS.crowbar_hook = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 180) return {};
  const dir = Math.atan2(m.y - player.y, m.x - player.x); // Direction from player toward mob
  const pullDist = Math.min(100, dist - 30);
  const newX = player.x + Math.cos(dir) * pullDist;
  const newY = player.y + Math.sin(dir) * pullDist;
  if (positionClear(newX, newY)) {
    player.x = newX;
    player.y = newY;
  }
  const dmg = Math.round(25 * getMobDamageMultiplier());
  const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "HOOK!" });
  m._abilityCDs.crowbar_hook = 210;
  return {};
};

// 25. Shattering Swing — wide arc melee with knockback
MOB_SPECIALS.shattering_swing = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 120) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 90, player)) {
    const dmg = Math.round(40 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    // Knockback
    const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
    applyKnockback(Math.cos(kbDir) * 11.2, Math.sin(kbDir) * 11.2);
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._abilityCDs.shattering_swing = 240;
  return {};
};

// 26. Scrap Metal Toss — 3 projectiles in spread
MOB_SPECIALS.scrap_metal_toss = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spreadAngle = (15 * Math.PI) / 180;
  for (let i = -1; i <= 1; i++) {
    const angle = dir + i * spreadAngle;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
      fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#887766',
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.scrap_metal_toss = 300;
  return {};
};

// 27. Adrenaline Sprint — self speed buff
MOB_SPECIALS.adrenaline_sprint = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._sprintTimer && m._sprintTimer > 0) {
    m._sprintTimer--;
    if (m._sprintTimer <= 0) {
      m.speed = m._sprintOrigSpeed;
    }
    return {};
  }
  if (m._abilityCDs && m._abilityCDs.adrenaline_sprint > 0) return {};
  m._sprintOrigSpeed = m.speed;
  m.speed *= 2;
  m._sprintTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "SPRINT!" });
  m._abilityCDs.adrenaline_sprint = 480;
  return {};
};

// 28. Kneecap Sweep — circle AoE with mobility lock
MOB_SPECIALS.kneecap_sweep = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 100) return {};
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
    const dmg = Math.round(30 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('root', { duration: 120 });
    hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._abilityCDs.kneecap_sweep = 360;
  return {};
};

// 29. Brutal Beatdown — 5-hit combo over 120 frames
MOB_SPECIALS.brutal_beatdown = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._beatdownTimer && m._beatdownTimer > 0) {
    m._beatdownTimer--;
    const elapsed = 120 - m._beatdownTimer;
    // Hit every 24 frames: at 0, 24, 48, 72, 96
    if (elapsed % 24 === 0 && m._beatdownHits < 5) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        m._beatdownHits++;
        // Final hit knockback
        if (m._beatdownHits >= 5) {
          const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
          applyKnockback(Math.cos(kbDir) * 12.8, Math.sin(kbDir) * 12.8);
        }
      }
    }
    if (m._beatdownTimer <= 0) {
      m._beatdownHits = 0;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.brutal_beatdown > 0) return {};
  m._beatdownTimer = 120;
  m._beatdownHits = 0;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "BEATDOWN!" });
  m._abilityCDs.brutal_beatdown = 900;
  return { skip: true };
};

// ===================== SACKHEAD BOSS SPECIALS =====================
// Boss: Sackhead — Relentless brute. Floor 2 boss.

// 30. Barbed Swing — arc melee with bleed
MOB_SPECIALS.barbed_swing = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 110) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 80, player)) {
    const dmg = Math.round(35 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('bleed', { duration: 180, dmg: 6 });
    hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "hit" });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._abilityCDs.barbed_swing = 180;
  return {};
};

// 31. Skull Cracker — overhead slam with stun, telegraphed
MOB_SPECIALS.skull_cracker = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._skullTele) {
    m._skullTele--;
    if (m._skullTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
        const dmg = Math.round(45 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 60 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      m._abilityCDs.skull_cracker = 300;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.skull_cracker > 0) return {};
  if (dist > 100) return {};
  m._skullTele = 36;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 70 }, delayFrames: 36, color: [200, 80, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 32. Bull Charge — long dash in line toward player
MOB_SPECIALS.bull_charge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._chargeDashing) {
    m._chargeTimer--;
    const t = 1 - (m._chargeTimer / 20);
    m.x = m._chargeSX + (m._chargeTX - m._chargeSX) * t;
    m.y = m._chargeSY + (m._chargeTY - m._chargeSY) * t;
    if (m._chargeTimer <= 0 || (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40, player) && m._chargeTimer < 16)) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 12.8, Math.sin(kbDir) * 12.8);
      }
      m._chargeDashing = false;
      m._abilityCDs.bull_charge = 420;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.bull_charge > 0) return {};
  if (dist > 350 || dist < 60) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 250);
  m._chargeSX = m.x; m._chargeSY = m.y;
  m._chargeTX = clamped.x; m._chargeTY = clamped.y;
  m._chargeDashing = true; m._chargeTimer = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 40 }, delayFrames: 8, color: [200, 100, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "cast" });
  return { skip: true };
};

// 33. Stranglehold — grab + root + DoT
MOB_SPECIALS.stranglehold = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._grabbing) {
    m._grabTimer--;
    // DoT every 30 frames
    if (m._grabTimer % 30 === 0 && m._grabTimer > 0) {
      const dmg = Math.round(10 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
    }
    if (m._grabTimer <= 0) {
      m._grabbing = false;
      m._abilityCDs.stranglehold = 480;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.stranglehold > 0) return {};
  if (dist > 60) return {};
  m._grabbing = true;
  m._grabTimer = 120;
  StatusFX.applyToPlayer('root', { duration: 120 });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "GRABBED!" });
  return { skip: true };
};

// 34. Batter Up — huge wide swing with knockback + stun, telegraphed
MOB_SPECIALS.batter_up = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._batterTele) {
    m._batterTele--;
    if (m._batterTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 2, 100, player)) {
        const dmg = Math.round(60 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 16, Math.sin(kbDir) * 16);
        StatusFX.applyToPlayer('stun', { duration: 90 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "stun" });
      }
      m._abilityCDs.batter_up = 1080;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.batter_up > 0) return {};
  if (dist > 130) return {};
  m._batterTele = 48;
  if (typeof TelegraphSystem !== 'undefined') {
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 180, range: 100 }, delayFrames: 48, color: [220, 80, 60], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "BATTER UP!" });
  return { skip: true };
};

// ===================== MR. SCHWALLIE BOSS SPECIALS =====================
// Boss: Mr. Schwallie — Mob boss, tactical fighter. Floor 2 boss.

// 35. Cigar Flick — projectile that leaves fire zone on impact
MOB_SPECIALS.cigar_flick = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 6, vy: Math.sin(dir) * 6,
    fromPlayer: false, mobBullet: true, damage: Math.round(15 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ff8844',
    onHitPlayer: (b, hitTarget) => {
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: hitTarget.x, cy: hitTarget.y, radius: 60, duration: 180, tickDamage: 6, color: [255, 100, 40] });
      }
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y, life: 25, type: "burn_tick" });
    },
    onExpire: function() {
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: this.x, cy: this.y, radius: 60, duration: 180, tickDamage: 6, color: [255, 100, 40] });
      }
      hitEffects.push({ x: this.x, y: this.y, life: 25, type: "burn_tick" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.cigar_flick = 240;
  return {};
};

// 36. CQC Counter — enter counter stance, negate melee + counter-attack
MOB_SPECIALS.cqc_counter = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._counterStance && m._counterTimer > 0) {
    m._counterTimer--;
    // Check if mob took damage (counter logic)
    if (m._counterLastHp === undefined) m._counterLastHp = m.hp;
    if (m.hp < m._counterLastHp) {
      // Was hit — counter attack
      const dmg = Math.round(35 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "COUNTER!" });
      // Restore HP lost during stance
      m.hp = m._counterLastHp;
      m._counterStance = false;
      m._counterTimer = 0;
      m._abilityCDs.cqc_counter = 360;
      return {};
    }
    m._counterLastHp = m.hp;
    if (m._counterTimer <= 0) {
      m._counterStance = false;
      m._abilityCDs.cqc_counter = 360;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.cqc_counter > 0) return {};
  m._counterStance = true;
  m._counterTimer = 120;
  m._counterLastHp = m.hp;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "COUNTER STANCE" });
  return { skip: true };
};

// 37. Akimbo Barrage — 6 bullets in 180° spread
MOB_SPECIALS.akimbo_barrage = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = Math.PI; // 180 degrees
  for (let i = 0; i < 6; i++) {
    const angle = dir - spread / 2 + (i / 5) * spread;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED, vy: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED,
      fromPlayer: false, mobBullet: true, damage: Math.round(18 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ccbb88',
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._abilityCDs.akimbo_barrage = 300;
  return {};
};

// 38. Tactical Slide — slide perpendicular to player with brief invuln
MOB_SPECIALS.tactical_slide = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._slideDashing) {
    m._slideTimer--;
    const t = 1 - (m._slideTimer / 10);
    m.x = m._slideSX + (m._slideTX - m._slideSX) * t;
    m.y = m._slideSY + (m._slideTY - m._slideSY) * t;
    if (m._slideTimer <= 0) {
      m._slideDashing = false;
      m._invuln = 0;
      m._abilityCDs.tactical_slide = 240;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.tactical_slide > 0) return {};
  const dirToPlayer = Math.atan2(player.y - m.y, player.x - m.x);
  // Perpendicular — pick random side
  const perpDir = dirToPlayer + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
  const clamped = clampDashTarget(m.x, m.y, perpDir, 150);
  m._slideSX = m.x; m._slideSY = m.y;
  m._slideTX = clamped.x; m._slideTY = clamped.y;
  m._slideDashing = true; m._slideTimer = 10;
  m._invuln = 12;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
  return { skip: true };
};

// 39. Flashbang Breach — AoE blind projectile
MOB_SPECIALS.flashbang_breach = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 7, vy: Math.sin(dir) * 7,
    fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ffffaa',
    onHitPlayer: (b, hitTarget) => {
      StatusFX.applyToPlayer('blind', { duration: 90, mode: 'flash' });
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 30, type: "stun" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.flashbang_breach = 480;
  return {};
};

// 40. One Man Army — sequential combo: slide → barrage → flashbang
MOB_SPECIALS.one_man_army = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  if (m._omaPhase && m._omaPhase > 0) {
    m._omaTimer--;
    // Phase 1: tactical slide (frames 90-60)
    if (m._omaPhase === 3) {
      if (m._omaTimer === 89) {
        // Initiate slide
        const dirToPlayer = Math.atan2(player.y - m.y, player.x - m.x);
        const perpDir = dirToPlayer + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        const clamped = clampDashTarget(m.x, m.y, perpDir, 150);
        m._omaSlideSX = m.x; m._omaSlideSY = m.y;
        m._omaSlideTX = clamped.x; m._omaSlideTY = clamped.y;
        m._invuln = 12;
        hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
      }
      if (m._omaTimer >= 60) {
        const slideT = 1 - ((m._omaTimer - 60) / 30);
        m.x = m._omaSlideSX + (m._omaSlideTX - m._omaSlideSX) * Math.min(slideT, 1);
        m.y = m._omaSlideSY + (m._omaSlideTY - m._omaSlideSY) * Math.min(slideT, 1);
      }
      if (m._omaTimer <= 60) {
        m._omaPhase = 2;
      }
    }
    // Phase 2: akimbo barrage (at frame 60)
    if (m._omaPhase === 2 && m._omaTimer === 60) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const spread = Math.PI;
      for (let i = 0; i < 6; i++) {
        const angle = dir - spread / 2 + (i / 5) * spread;
        bullets.push({
          id: nextBulletId++, x: m.x, y: m.y - 8,
          vx: Math.cos(angle) * GAME_CONFIG.BULLET_SPEED, vy: Math.sin(angle) * GAME_CONFIG.BULLET_SPEED,
          fromPlayer: false, mobBullet: true, damage: Math.round(18 * getMobDamageMultiplier()),
          ownerId: m.id, bulletColor: '#ccbb88',
        });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
      m._omaPhase = 1;
    }
    // Phase 3: flashbang (at frame 30)
    if (m._omaPhase === 1 && m._omaTimer === 30) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 7, vy: Math.sin(dir) * 7,
        fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ffffaa',
        onHitPlayer: (b, hitTarget) => {
          StatusFX.applyToPlayer('blind', { duration: 90, mode: 'flash' });
          hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 30, type: "stun" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
    }
    if (m._omaTimer <= 0) {
      m._omaPhase = 0;
      m._abilityCDs.one_man_army = 1200;
    }
    return { skip: true };
  }
  if (m._abilityCDs && m._abilityCDs.one_man_army > 0) return {};
  m._omaPhase = 3;
  m._omaTimer = 90;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "ONE MAN ARMY!" });
  return { skip: true };
};

// ===================== END OF PART 1 — Floors 1-2 + Willis/Puppedrill/Sackhead/Mr. Schwallie =====================

// ===================== FLOOR 3 REGULAR SPECIALS (Carnival) =====================

// 1. Pin Cascade — juggling_jester: 3 bouncing pin projectiles in spread
MOB_SPECIALS.pin_cascade = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = Math.PI / 10; // slight spread
  for (let i = 0; i < 3; i++) {
    const angle = dir + (i - 1) * spread;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
      fromPlayer: false, mobBullet: true,
      damage: Math.round(12 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ee4488',
      _bounces: 1, _pinAoeDmg: Math.round(15 * getMobDamageMultiplier()),
      _pinAoeRadius: 50,
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "pin_pop" });
  m._specialTimer = m._specialCD || 240;
  return {};
};

// 2. Static Poodle — balloon_twister: spawn stationary poodle blocker
MOB_SPECIALS.static_poodle = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  // Check existing poodles
  const activePoodles = mobs.filter(s => s.type === 'balloon_poodle' && s._summonOwnerId === m.id && s.hp > 0).length;
  if (activePoodles >= 2) { m._specialTimer = 60; return {}; }
  const sx = m.x, sy = m.y;
  mobs.push({
    x: sx, y: sy, type: 'balloon_poodle', id: nextMobId++,
    hp: 60, maxHp: 60, speed: 0, damage: 0,
    contactRange: 0, skin: '#ff88cc', hair: '#ff88cc', shirt: '#ff66aa', pants: '#ff66aa',
    name: 'Balloon Poodle', dir: 0, frame: 0, attackCooldown: 0,
    shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
    summonRate: 0, summonMax: 0, summonTimer: 0,
    arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
    _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
    _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
    _summonOwnerId: m.id, scale: 0.8, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    _poodleAoeRadius: 80, _poodleSlowDur: 120,
    _isBlocker: true,
  });
  hitEffects.push({ x: sx, y: sy - 15, life: 20, type: "summon" });
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "POODLE!" });
  m._specialTimer = m._specialCD || 480;
  return {};
};

// 3. Stone Ambush — human_statue: stand still then leap to player
MOB_SPECIALS.stone_ambush = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active ambush dash
  if (m._ambushDash) {
    m._ambushTimer--;
    const t = 1 - (m._ambushTimer / 16);
    m.x = m._ambushSX + (m._ambushTX - m._ambushSX) * t;
    m.y = m._ambushSY + (m._ambushTY - m._ambushSY) * t;
    if (m._ambushTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        const nx = player.x + Math.cos(kbDir) * 60;
        const ny = player.y + Math.sin(kbDir) * 60;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "explosion" });
      m._ambushDash = false;
      m._ambushWait = 0;
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Waiting phase (stand still)
  if (m._ambushWait && m._ambushWait > 0) {
    m._ambushWait--;
    if (m._ambushWait <= 0) {
      // Begin dash to player
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const dashDist = Math.min(dist, 200);
      const clamped = clampDashTarget(m.x, m.y, dir, dashDist);
      m._ambushSX = m.x; m._ambushSY = m.y;
      m._ambushTX = clamped.x; m._ambushTY = clamped.y;
      m._ambushDash = true; m._ambushTimer = 16;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return { skip: true }; } // Always stationary
  if (dist > 300) { m._specialTimer = 30; return { skip: true }; }
  // Begin wait phase
  m._ambushWait = 120;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "..." });
  return { skip: true };
};

// 4. Smoke and Mirrors — illusionist: reactive teleport when damaged
MOB_SPECIALS.smoke_and_mirrors = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._lastHp === undefined) m._lastHp = m.hp;
  if (m._specialTimer > 0) { m._specialTimer--; }
  // Check if damaged
  if (m.hp < m._lastHp && m._specialTimer <= 0) {
    const oldX = m.x, oldY = m.y;
    // Teleport 150px in random direction
    let attempts = 8;
    while (attempts-- > 0) {
      const angle = Math.random() * Math.PI * 2;
      const nx = m.x + Math.cos(angle) * 150;
      const ny = m.y + Math.sin(angle) * 150;
      if (positionClear(nx, ny)) {
        m.x = nx; m.y = ny;
        break;
      }
    }
    hitEffects.push({ x: oldX, y: oldY - 10, life: 25, type: "smoke" });
    hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
    m._specialTimer = m._specialCD || 300;
  }
  m._lastHp = m.hp;
  return {};
};

// 5. Rigging Drop — stagehand_brute: delayed AoE at player position
MOB_SPECIALS.rigging_drop = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Delayed AoE phase
  if (m._riggingTele && m._riggingTele > 0) {
    m._riggingTele--;
    if (m._riggingTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._riggingTX, m._riggingTY, 60, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 30 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      hitEffects.push({ x: m._riggingTX, y: m._riggingTY, life: 20, type: "explosion" });
      m._specialTimer = m._specialCD || 300;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  // Telegraph at player's current position
  m._riggingTX = player.x;
  m._riggingTY = player.y;
  m._riggingTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._riggingTX, cy: m._riggingTY, radius: 60 }, delayFrames: 60, color: [200, 100, 50], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "DROP!" });
  return {};
};

// 6. Soprano Shriek — phantom_chorus: cone through walls, confuse
MOB_SPECIALS.soprano_shriek = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 160) { m._specialTimer = 30; return {}; }
  // Cone 90° range 140 — goes through walls (skip wall check, just use distance + angle)
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  if (dist <= 140) {
    const dmg = Math.round(15 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('confuse', { duration: 120 });
    hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "sonic_wave" });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 20, type: "sonic_wave" });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 140 }, delayFrames: 1, color: [160, 80, 200], owner: m.id });
  }
  m._specialTimer = m._specialCD || 270;
  return {};
};

// 7. Prop Toss — prop_master: 3 projectiles in spread with random speeds
MOB_SPECIALS.prop_toss = (m, ctx) => {
  const { player, dist, bullets, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spreadAngle = (20 * Math.PI) / 180; // 20 degrees
  const colors = ['#aa6644', '#668844', '#6644aa'];
  for (let i = 0; i < 3; i++) {
    const angle = dir + (i - 1) * spreadAngle;
    const speed = 7 + Math.random() * 3; // 7-10
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      fromPlayer: false, mobBullet: true,
      damage: Math.round(14 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: colors[i],
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 210;
  return {};
};

// 8. Pirouette Dash — macabre_dancer: dash through player, reflect bullets during dash
MOB_SPECIALS.pirouette_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._pirDashing) {
    m._pirTimer--;
    const t = 1 - (m._pirTimer / 14);
    m.x = m._pirSX + (m._pirTX - m._pirSX) * t;
    m.y = m._pirSY + (m._pirTY - m._pirSY) * t;
    m._reflecting = true;
    // Contact damage check each frame during dash
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 30, player)) {
      if (!m._pirHit) {
        const dmg = Math.round(20 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        m._pirHit = true;
      }
    }
    if (m._pirTimer <= 0) {
      m._pirDashing = false;
      m._reflecting = false;
      m._pirHit = false;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 50 || dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 180);
  m._pirSX = m.x; m._pirSY = m.y;
  m._pirTX = clamped.x; m._pirTY = clamped.y;
  m._pirDashing = true; m._pirTimer = 14; m._pirHit = false;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 14, type: "smoke" });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 30 }, delayFrames: 6, color: [180, 50, 180], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 4 REGULAR SPECIALS (Casino/Mob) =====================

// 9. Baton Sweep — casino_pit_boss: close cone + mobility lock
MOB_SPECIALS.baton_sweep = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._batonTele) {
    m._batonTele--;
    if (m._batonTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 80, player)) {
        const dmg = Math.round(22 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('mobility_lock', { duration: 120 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 100) { m._specialTimer = 20; return {}; }
  m._batonTele = 12;
  if (typeof TelegraphSystem !== 'undefined') {
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 80 }, delayFrames: 12, color: [200, 180, 50], owner: m.id });
  }
  return { skip: true };
};

// 10. Tripwire Drop — laser_grid_thief: dash away + drop root trap
MOB_SPECIALS.tripwire_drop_e205 = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Active dash phase
  if (m._tripDashing) {
    m._tripTimer--;
    const t = 1 - (m._tripTimer / 12);
    m.x = m._tripSX + (m._tripTX - m._tripSX) * t;
    m.y = m._tripSY + (m._tripTY - m._tripSY) * t;
    if (m._tripTimer <= 0) {
      m._tripDashing = false;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Check existing traps — player proximity
  if (m._tripTraps === undefined) m._tripTraps = [];
  for (let i = m._tripTraps.length - 1; i >= 0; i--) {
    const trap = m._tripTraps[i];
    trap.life--;
    if (trap.life <= 0) { m._tripTraps.splice(i, 1); continue; }
    const pdx = player.x - trap.x, pdy = player.y - trap.y;
    if (Math.sqrt(pdx * pdx + pdy * pdy) < 25) {
      StatusFX.applyToPlayer('root', { duration: 90 });
      hitEffects.push({ x: player.x, y: player.y - 20, life: 20, type: "stun" });
      hitEffects.push({ x: trap.x, y: trap.y, life: 15, type: "explosion" });
      m._tripTraps.splice(i, 1);
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 250) { m._specialTimer = 30; return {}; }
  // Save old pos for trap, dash away
  const trapX = m.x, trapY = m.y;
  const awayDir = Math.atan2(m.y - player.y, m.x - player.x);
  const clamped = clampDashTarget(m.x, m.y, awayDir, 180);
  m._tripSX = m.x; m._tripSY = m.y;
  m._tripTX = clamped.x; m._tripTY = clamped.y;
  m._tripDashing = true; m._tripTimer = 12;
  // Drop trap at old position
  m._tripTraps.push({ x: trapX, y: trapY, life: 300 });
  hitEffects.push({ x: trapX, y: trapY - 10, life: 20, type: "cast" });
  hitEffects.push({ x: trapX, y: trapY - 30, life: 30, maxLife: 30, type: "heal", dmg: "TRAP" });
  return { skip: true };
};

// 11. Auto Turret — vault_hacker: deploy stationary turret mob
MOB_SPECIALS.auto_turret = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  // Check existing turrets
  const activeTurrets = mobs.filter(s => s.type === 'auto_turret_e205' && s._summonOwnerId === m.id && s.hp > 0).length;
  if (activeTurrets >= 2) { m._specialTimer = 60; return {}; }
  const sx = m.x, sy = m.y;
  mobs.push({
    x: sx, y: sy, type: 'auto_turret_e205', id: nextMobId++,
    hp: 80, maxHp: 80, speed: 0, damage: Math.round(m.damage * 0.5),
    contactRange: 0, skin: '#888888', hair: '#666', shirt: '#555555', pants: '#444444',
    name: 'Turret', dir: 0, frame: 0, attackCooldown: 0,
    shootRange: 300, shootRate: 90, shootTimer: 0, bulletSpeed: 7,
    summonRate: 0, summonMax: 0, summonTimer: 0,
    arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
    _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
    _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
    _summonOwnerId: m.id, scale: 0.7, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    _turretLifespan: 480, _turretFireRate: 90, _turretFireTimer: 0,
  });
  hitEffects.push({ x: sx, y: sy - 15, life: 20, type: "summon" });
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "TURRET!" });
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 12. Flash and Fade — smokescreen_smuggler: blind + smoke zone
MOB_SPECIALS.flash_and_fade = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  // Flash damage
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 180, player)) {
    const dmg = Math.round(10 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  }
  StatusFX.applyToPlayer('blind', { duration: 30, mode: 'flash' });
  // Smoke zone
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: m.x, cy: m.y, radius: 80, duration: 240,
      tickRate: 999, tickDamage: 0, color: [100, 100, 100], slow: 0.3,
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 30, type: "smoke" });
  m._specialTimer = m._specialCD || 360;
  return {};
};

// 13. Knee Capper — tracksuit_goon: close sweep + heavy slow
MOB_SPECIALS.knee_capper = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 90) { m._specialTimer = 20; return {}; }
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
    const dmg = Math.round(20 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('slow', { duration: 150, amount: 0.4 });
    hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
  }
  m._specialTimer = m._specialCD || 240;
  return {};
};

// 14. Hustle Step — disco_brawler: self speed buff with random direction changes
MOB_SPECIALS.hustle_step = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  // Active hustle phase
  if (m._hustleTimer && m._hustleTimer > 0) {
    m._hustleTimer--;
    // Random direction change every 20f
    if (m._hustleTimer % 20 === 0) {
      m._hustleDir = Math.random() * Math.PI * 2;
    }
    // Move in random direction at boosted speed
    const spd = (m._hustleOrigSpd || m.speed) * 1.5;
    const nx = m.x + Math.cos(m._hustleDir) * spd;
    const ny = m.y + Math.sin(m._hustleDir) * spd;
    if (positionClear(nx, ny)) { m.x = nx; m.y = ny; }
    // Contact damage during hustle
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40, player)) {
      if (!m._hustleHit) {
        const dmg = Math.round(18 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        m._hustleHit = true;
      }
    }
    if (m._hustleTimer <= 0) {
      m.speed = m._hustleOrigSpd;
      m._hustleHit = false;
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._hustleOrigSpd = m.speed;
  m._hustleTimer = 120;
  m._hustleDir = Math.random() * Math.PI * 2;
  m._hustleHit = false;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "HUSTLE!" });
  return { skip: true };
};

// 15. Spray and Pray — tommy_gun_heavy: 3s channel, fires bullets in cone
MOB_SPECIALS.spray_and_pray = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Active spray channel
  if (m._sprayTimer && m._sprayTimer > 0) {
    m._sprayTimer--;
    // Fire every 12 frames
    if (m._sprayTimer % 12 === 0) {
      const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
      const coneHalf = (30 * Math.PI) / 180; // 30° half = 60° total cone
      const angle = baseDir + (Math.random() - 0.5) * 2 * coneHalf;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9,
        fromPlayer: false, mobBullet: true,
        damage: Math.round(8 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ccaa44',
      });
    }
    if (m._sprayTimer <= 0) {
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._sprayTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "SPRAY!" });
  return { skip: true };
};

// 16. Execution Shot — the_cleaner: lock-on then massive shot
MOB_SPECIALS.execution_shot = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  // Lock-on phase
  if (m._execLock) {
    m._execTimer--;
    if (m._execTimer <= 0) {
      // Fire massive projectile in locked direction
      const angle = m._execDir;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(angle) * 13, vy: Math.sin(angle) * 13,
        fromPlayer: false, mobBullet: true,
        damage: Math.round(55 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ff2222',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
      m._execLock = false;
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  // Begin lock-on — save direction at this moment
  m._execDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._execLock = true;
  m._execTimer = 120;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._execDir) * 400;
    const endY = m.y + Math.sin(m._execDir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 12 }, delayFrames: 120, color: [255, 30, 30], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "LOCK ON" });
  return { skip: true };
};

// ===================== KILLER MIME BOSS (5 abilities) =====================

// 17. Finger Gun — nearly invisible projectile
MOB_SPECIALS.finger_gun = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (dist > 300) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 10, vy: Math.sin(dir) * 10,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(30 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ffffff11',
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 8, type: "cast" });
  m._abilityCDs.finger_gun = 240;
  return {};
};

// 18. Invisible Wall — barrier entity between mob and player
MOB_SPECIALS.invisible_wall = (m, ctx) => {
  const { player, hitEffects, mobs } = ctx;
  // Check existing walls
  const activeWalls = mobs.filter(s => s.type === 'mime_wall' && s._summonOwnerId === m.id && s.hp > 0).length;
  if (activeWalls >= 2) return {};
  const midX = (m.x + player.x) / 2;
  const midY = (m.y + player.y) / 2;
  mobs.push({
    x: midX, y: midY, type: 'mime_wall', id: nextMobId++,
    hp: 100, maxHp: 100, speed: 0, damage: 0,
    contactRange: 0, skin: '#cccccc', hair: '#aaa', shirt: '#dddddd', pants: '#cccccc',
    name: 'Invisible Wall', dir: 0, frame: 0, attackCooldown: 0,
    shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
    summonRate: 0, summonMax: 0, summonTimer: 0,
    arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
    _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
    _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
    _summonOwnerId: m.id, scale: 0.9, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    _isBlocker: true, _wallLifespan: 240,
  });
  hitEffects.push({ x: midX, y: midY - 15, life: 20, type: "summon" });
  m._abilityCDs.invisible_wall = 480;
  return {};
};

// 19. Heavy Mallet — telegraphed overhead slam + stun + knockback
MOB_SPECIALS.heavy_mallet = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._malletTele) {
    m._malletTele--;
    if (m._malletTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 60 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "stun" });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        const nx = player.x + Math.cos(kbDir) * 80;
        const ny = player.y + Math.sin(kbDir) * 80;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "explosion" });
      m._abilityCDs.heavy_mallet = 300;
    }
    return { skip: true };
  }
  if (dist > 90) return {};
  m._malletTele = 36;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 70 }, delayFrames: 36, color: [200, 200, 200], owner: m.id });
  }
  return { skip: true };
};

// 20. Tug of War — pull player toward self + root
MOB_SPECIALS.tug_of_war = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 200) return {};
  // Pull player 120px toward mob
  const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
  const pullDist = Math.min(120, dist - 30);
  if (pullDist > 0) {
    const nx = player.x + Math.cos(pullDir) * pullDist;
    const ny = player.y + Math.sin(pullDir) * pullDist;
    if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
  }
  const dmg = Math.round(15 * getMobDamageMultiplier());
  const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  StatusFX.applyToPlayer('root', { duration: 60 });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
  m._abilityCDs.tug_of_war = 420;
  return {};
};

// 21. Trapped in Box — create 4 invisible walls around player
MOB_SPECIALS.trapped_in_box = (m, ctx) => {
  const { player, hitEffects, mobs } = ctx;
  const offsets = [
    { dx: -40, dy: 0 }, { dx: 40, dy: 0 },
    { dx: 0, dy: -40 }, { dx: 0, dy: 40 },
  ];
  for (const off of offsets) {
    const wx = player.x + off.dx, wy = player.y + off.dy;
    mobs.push({
      x: wx, y: wy, type: 'mime_box_wall', id: nextMobId++,
      hp: 40, maxHp: 40, speed: 0, damage: 0,
      contactRange: 0, skin: '#cccccc', hair: '#aaa', shirt: '#eeeeee', pants: '#cccccc',
      name: 'Box Wall', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 0.6, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
      _isBlocker: true, _wallLifespan: 180,
    });
  }
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "TRAPPED!" });
  m._abilityCDs.trapped_in_box = 1080;
  return {};
};

// ===================== MAJOR PHANTOM BOSS (5 abilities) =====================

// 22. Overture Slash — 3-slash combo, each 120° arc range 80
MOB_SPECIALS.overture_slash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  // Active combo phase
  if (m._overtureHits !== undefined && m._overtureHits < 3) {
    m._overtureTimer--;
    if (m._overtureTimer <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 80, player)) {
        const dmg = Math.round(20 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x + Math.cos(Math.atan2(player.y - m.y, player.x - m.x)) * 40, y: m.y + Math.sin(Math.atan2(player.y - m.y, player.x - m.x)) * 40 - 10, life: 12, type: "cleaver_slash" });
      m._overtureHits++;
      if (m._overtureHits < 3) {
        m._overtureTimer = 20; // 20f between slashes
      } else {
        m._overtureHits = undefined;
        m._abilityCDs.overture_slash = 210;
      }
    }
    return { skip: true };
  }
  if (dist > 120) return {};
  m._overtureHits = 0;
  m._overtureTimer = 10; // Small initial delay
  return { skip: true };
};

// 23. Stage Blood — delayed AoE at marked player position
MOB_SPECIALS.stage_blood = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._stageBloodTimer && m._stageBloodTimer > 0) {
    m._stageBloodTimer--;
    if (m._stageBloodTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._stageBloodTX, m._stageBloodTY, 80, player)) {
        const dmg = Math.round(45 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._stageBloodTX, y: m._stageBloodTY, life: 25, type: "flare_burst" });
      hitEffects.push({ x: m._stageBloodTX, y: m._stageBloodTY, life: 20, type: "explosion" });
    }
    return {};
  }
  if (dist > 300) return {};
  m._stageBloodTX = player.x;
  m._stageBloodTY = player.y;
  m._stageBloodTimer = 120;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._stageBloodTX, cy: m._stageBloodTY, radius: 80 }, delayFrames: 120, color: [180, 30, 30], owner: m.id });
  }
  m._abilityCDs.stage_blood = 360;
  return {};
};

// 24. Theatrical Parry — counter stance 120f, dmg back on hit
MOB_SPECIALS.theatrical_parry = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._counterStance && m._counterTimer > 0) {
    m._counterTimer--;
    // Check if mob was damaged
    if (m._counterLastHp === undefined) m._counterLastHp = m.hp;
    if (m.hp < m._counterLastHp) {
      // Counter attack!
      m._counterStance = false;
      const dmg = Math.round(40 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "COUNTER!" });
      m._abilityCDs.theatrical_parry = 420;
      m._counterLastHp = undefined;
      return {};
    }
    m._counterLastHp = m.hp;
    if (m._counterTimer <= 0) {
      m._counterStance = false;
      m._counterLastHp = undefined;
      m._abilityCDs.theatrical_parry = 420;
    }
    return { skip: true };
  }
  m._counterStance = true;
  m._counterTimer = 120;
  m._counterLastHp = m.hp;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "PARRY" });
  return { skip: true };
};

// 25. Phantom Step — teleport behind player, backstab
MOB_SPECIALS.phantom_step = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._phantomDelay && m._phantomDelay > 0) {
    m._phantomDelay--;
    if (m._phantomDelay <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stiletto_stab" });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._abilityCDs.phantom_step = 300;
    }
    return { skip: true };
  }
  if (dist > 250) return {};
  // Teleport behind player (opposite side from mob)
  const behindDir = Math.atan2(m.y - player.y, m.x - player.x);
  const tx = player.x + Math.cos(behindDir) * 60;
  const ty = player.y + Math.sin(behindDir) * 60;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
  if (positionClear(tx, ty)) { m.x = tx; m.y = ty; }
  else { m.x = player.x; m.y = player.y; }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
  m._phantomDelay = 8;
  return { skip: true };
};

// 26. Grand Finale — teleport to center, channel 120f, massive 360° AoE
MOB_SPECIALS.grand_finale = (m, ctx) => {
  const { player, hitEffects } = ctx;
  // Channel phase
  if (m._finaleChannel) {
    m._finaleTimer--;
    // Visual indicator during channel
    if (m._finaleTimer % 20 === 0) {
      hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
    }
    if (m._finaleTimer <= 0) {
      // Massive 360° AoE
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
        const dmg = Math.round(55 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        const nx = player.x + Math.cos(kbDir) * 100;
        const ny = player.y + Math.sin(kbDir) * 100;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
      }
      hitEffects.push({ x: m.x, y: m.y, life: 30, type: "explosion" });
      m._finaleChannel = false;
      m._abilityCDs.grand_finale = 1500;
    }
    return { skip: true };
  }
  if (m.hp > m.maxHp * 0.6) return {}; // Only use below 60% hp
  // Teleport to center of arena area
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
  m._finaleChannel = true;
  m._finaleTimer = 120;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 120, color: [200, 50, 200], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "GRAND FINALE!" });
  return { skip: true };
};

// ===================== LADY RED BOSS (5 abilities) =====================

// 27. Concealed Stiletto — quick stab + bleed
MOB_SPECIALS.concealed_stiletto = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 80) return {};
  const dmg = Math.round(30 * getMobDamageMultiplier());
  const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "stiletto_stab" });
  StatusFX.applyToPlayer('bleed', { duration: 180, dmg: 6 });
  m._abilityCDs.concealed_stiletto = 210;
  return {};
};

// 28. Suppressed Fire — 3-round burst, low spread
MOB_SPECIALS.suppressed_fire = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  // Active burst phase
  if (m._suppressBurst && m._suppressBurst > 0) {
    m._suppressTimer--;
    if (m._suppressTimer <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const spread = (10 * Math.PI) / 180;
      const angle = dir + (Math.random() - 0.5) * spread;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9,
        fromPlayer: false, mobBullet: true,
        damage: Math.round(20 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#444444',
      });
      m._suppressBurst--;
      m._suppressTimer = 8;
      if (m._suppressBurst <= 0) {
        m._abilityCDs.suppressed_fire = 300;
      }
    }
    return { skip: true };
  }
  if (dist > 280) return {};
  // Fire first shot
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = (10 * Math.PI) / 180;
  const angle = dir + (Math.random() - 0.5) * spread;
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#444444',
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 10, type: "cast" });
  m._suppressBurst = 2; // 2 more shots remaining
  m._suppressTimer = 8;
  return { skip: true };
};

// 29. Toxic Perfume — AoE cloud around self, confuse + poison
MOB_SPECIALS.toxic_perfume = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 130) return {};
  // AoE around self 100px
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100, player)) {
    const dmg = Math.round(10 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('confuse', { duration: 120 });
    StatusFX.applyToPlayer('bleed', { duration: 180, dmg: 5 });
    hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "chemical_beam" });
  }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 25, type: "chemical_beam" });
  // Hazard zone for lingering poison
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: m.x, cy: m.y, radius: 100, duration: 180,
      tickRate: 60, tickDamage: Math.round(5 * getMobDamageMultiplier()),
      color: [180, 50, 180], slow: 0.2,
    });
  }
  m._abilityCDs.toxic_perfume = 420;
  return {};
};

// 30. Red Herring — dash away from player + leave decoy mob
MOB_SPECIALS.red_herring = (m, ctx) => {
  const { player, dist, hitEffects, mobs } = ctx;
  // Active dash phase
  if (m._redDashing) {
    m._redTimer--;
    const t = 1 - (m._redTimer / 12);
    m.x = m._redSX + (m._redTX - m._redSX) * t;
    m.y = m._redSY + (m._redTY - m._redSY) * t;
    if (m._redTimer <= 0) {
      m._redDashing = false;
      m._abilityCDs.red_herring = 600;
    }
    return { skip: true };
  }
  if (dist > 250) return {};
  const oldX = m.x, oldY = m.y;
  // Dash away from player
  const awayDir = Math.atan2(m.y - player.y, m.x - player.x);
  const clamped = clampDashTarget(m.x, m.y, awayDir, 150);
  m._redSX = m.x; m._redSY = m.y;
  m._redTX = clamped.x; m._redTY = clamped.y;
  m._redDashing = true; m._redTimer = 12;
  // Spawn decoy at old position — walks toward player, 1hp
  mobs.push({
    x: oldX, y: oldY, type: 'lady_red_decoy', id: nextMobId++,
    hp: 1, maxHp: 1, speed: 1.6, damage: 0,
    contactRange: 0, skin: m.skin || '#ffccaa', hair: m.hair || '#880000', shirt: m.shirt || '#cc0000', pants: m.pants || '#880000',
    name: 'Lady Red?', dir: 0, frame: 0, attackCooldown: 0,
    shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
    summonRate: 0, summonMax: 0, summonTimer: 0,
    arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
    _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
    _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
    _summonOwnerId: m.id, scale: 1, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    _decoyLifespan: 240,
  });
  hitEffects.push({ x: oldX, y: oldY - 10, life: 20, type: "smoke" });
  return { skip: true };
};

// 31. Checkmate — teleport behind player → 5-hit stiletto flurry → poison
MOB_SPECIALS.checkmate = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  // Active flurry phase
  if (m._checkPhase === 'flurry') {
    m._checkTimer--;
    if (m._checkTimer <= 0 && m._checkHits < 5) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        hitEffects.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y - 10 + (Math.random() - 0.5) * 20, life: 12, type: "stiletto_stab" });
      }
      m._checkHits++;
      m._checkTimer = 10;
      if (m._checkHits >= 5) {
        StatusFX.applyToPlayer('bleed', { duration: 240, dmg: 5 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "CHECKMATE!" });
        m._checkPhase = null;
        m._abilityCDs.checkmate = 1200;
      }
    }
    return { skip: true };
  }
  // Teleport phase
  if (m._checkPhase === 'teleport') {
    const behindDir = Math.atan2(m.y - player.y, m.x - player.x);
    const tx = player.x + Math.cos(behindDir) * 50;
    const ty = player.y + Math.sin(behindDir) * 50;
    hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
    if (positionClear(tx, ty)) { m.x = tx; m.y = ty; }
    hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
    m._checkPhase = 'flurry';
    m._checkHits = 0;
    m._checkTimer = 5;
    return { skip: true };
  }
  if (dist > 300) return {};
  m._checkPhase = 'teleport';
  return { skip: true };
};

// ===================== THE BOSS (the_boss_e205) BOSS (5 abilities) =====================

// 32. Gold Ring Hook — hook projectile that pulls player on hit
MOB_SPECIALS.gold_ring_hook = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (dist > 250) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(25 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ffd700',
    _hookPull: true, _hookPullDist: 100, _hookOwnerId: m.id,
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._abilityCDs.gold_ring_hook = 240;
  return {};
};

// 33. Saturday Night Shuffle — zig-zag dash through player (3 segments, 6f each)
MOB_SPECIALS.saturday_night_shuffle = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  // Active shuffle
  if (m._shufflePhase !== undefined && m._shufflePhase >= 0 && m._shufflePhase < 3) {
    m._shuffleTimer--;
    const t = 1 - (m._shuffleTimer / 6);
    m.x = m._shuffSegSX + (m._shuffSegTX - m._shuffSegSX) * t;
    m.y = m._shuffSegSY + (m._shuffSegTY - m._shuffSegSY) * t;
    if (m._shuffleTimer <= 0) {
      // Contact damage at segment end
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        if (!m._shuffHit) {
          const dmg = Math.round(30 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          m._shuffHit = true;
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 10, life: 10, type: "smoke" });
      m._shufflePhase++;
      if (m._shufflePhase < 3) {
        // Next segment: zig-zag toward player
        const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
        const zigOffset = (m._shufflePhase % 2 === 0 ? 1 : -1) * (Math.PI / 4);
        const segDir = baseDir + zigOffset;
        const clamped = clampDashTarget(m.x, m.y, segDir, 80);
        m._shuffSegSX = m.x; m._shuffSegSY = m.y;
        m._shuffSegTX = clamped.x; m._shuffSegTY = clamped.y;
        m._shuffleTimer = 6;
      } else {
        m._shufflePhase = undefined;
        m._shuffHit = false;
        m._abilityCDs.saturday_night_shuffle = 300;
      }
    }
    return { skip: true };
  }
  if (dist > 300 || dist < 40) return {};
  // Start shuffle — first segment with zig offset
  const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
  const zigOffset = Math.PI / 4;
  const segDir = baseDir + zigOffset;
  const clamped = clampDashTarget(m.x, m.y, segDir, 80);
  m._shuffSegSX = m.x; m._shuffSegSY = m.y;
  m._shuffSegTX = clamped.x; m._shuffSegTY = clamped.y;
  m._shufflePhase = 0; m._shuffleTimer = 6; m._shuffHit = false;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 10, type: "smoke" });
  return { skip: true };
};

// 34. Call the Goons — spawn 2 tracksuit_goons near boss (max 4 active)
MOB_SPECIALS.call_the_goons = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  const activeGoons = mobs.filter(s => s.type === 'tracksuit_goon' && s.hp > 0).length;
  if (activeGoons >= 4) return {};
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sx = m.x + Math.cos(angle) * 80;
    const sy = m.y + Math.sin(angle) * 80;
    if (!positionClear(sx, sy)) continue;
    mobs.push({
      x: sx, y: sy, type: 'tracksuit_goon', id: nextMobId++,
      hp: Math.round(m.maxHp * 0.1), maxHp: Math.round(m.maxHp * 0.1),
      speed: 2.2, damage: Math.round(m.damage * 0.35),
      contactRange: 30, skin: '#ddb88c', hair: '#222', shirt: '#444455', pants: '#333344',
      name: 'Goon', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: ['knee_capper'], _specialTimer: 120, _specialCD: 240, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 0.9, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    });
    hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "BOYS!" });
  m._abilityCDs.call_the_goons = 900;
  return {};
};

// 35. Dirty Money — scatter 4 gold decoy traps around player
MOB_SPECIALS.dirty_money = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._dirtyTraps === undefined) m._dirtyTraps = [];
  // Check existing traps for player proximity
  for (let i = m._dirtyTraps.length - 1; i >= 0; i--) {
    const trap = m._dirtyTraps[i];
    trap.life--;
    if (trap.life <= 0) { m._dirtyTraps.splice(i, 1); continue; }
    const tdx = player.x - trap.x, tdy = player.y - trap.y;
    if (Math.sqrt(tdx * tdx + tdy * tdy) < 20) {
      // Player stepped on decoy gold
      const dmg = Math.round(25 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.5 });
      hitEffects.push({ x: trap.x, y: trap.y, life: 15, type: "explosion" });
      hitEffects.push({ x: player.x, y: player.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "FAKE!" });
      m._dirtyTraps.splice(i, 1);
    }
  }
  // Scatter 4 decoys around player
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 80; // 40-120px radius
    const tx = player.x + Math.cos(angle) * r;
    const ty = player.y + Math.sin(angle) * r;
    m._dirtyTraps.push({ x: tx, y: ty, life: 360 });
    hitEffects.push({ x: tx, y: ty - 10, life: 30, type: "buff" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "DIRTY MONEY" });
  m._abilityCDs.dirty_money = 480;
  return {};
};

// 36. The Hit — lock-on + teleport behind + execution strike
MOB_SPECIALS.the_hit = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  // Phase 3: execution strike
  if (m._hitPhase === 3) {
    m._hitTimer--;
    if (m._hitTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(70 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 25, type: "hit", dmg: dealt });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 20, type: "explosion" });
      }
      m._hitPhase = 0;
      m._abilityCDs.the_hit = 1320;
    }
    return { skip: true };
  }
  // Phase 2: teleport behind player
  if (m._hitPhase === 2) {
    const behindDir = Math.atan2(m.y - player.y, m.x - player.x);
    const tx = player.x + Math.cos(behindDir) * 50;
    const ty = player.y + Math.sin(behindDir) * 50;
    hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
    if (positionClear(tx, ty)) { m.x = tx; m.y = ty; }
    hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
    m._hitPhase = 3;
    m._hitTimer = 8; // Brief delay before strike
    return { skip: true };
  }
  // Phase 1: lock-on
  if (m._hitPhase === 1) {
    m._hitTimer--;
    if (m._hitTimer <= 0) {
      m._hitPhase = 2;
    }
    return { skip: true };
  }
  if (dist > 400) return {};
  // Begin lock-on
  m._hitPhase = 1;
  m._hitTimer = 120;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 120, color: [255, 50, 50], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "THE HIT" });
  return { skip: true };
};

// ===================== END OF PART 2 — Floors 3-4 + Killer Mime/Major Phantom/Lady Red/The Boss =====================

// ===================== FLOOR 5 REGULAR SPECIALS (Chemical Plant) =====================

// 1. Acid Splash — hazmat_grunt: lob slow blob that creates poison puddle
MOB_SPECIALS.acid_splash = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spd = 4.5;
  const targetX = player.x;
  const targetY = player.y;
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * spd, vy: Math.sin(dir) * spd,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(15 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#88cc22',
    life: 60,
    _acidTargetX: targetX, _acidTargetY: targetY,
    onHitPlayer: (b, hitTarget) => {
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 19, type: "chemical_beam" });
      // Create poison puddle at impact
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: hitTarget.x, cy: hitTarget.y, radius: 60, duration: 240, tickRate: 30, tickDamage: 5, color: [100, 200, 100], slow: 0.2 });
      }
    },
    onExpire: function() {
      // Create puddle at expire position
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: this.x, cy: this.y, radius: 60, duration: 240, tickRate: 30, tickDamage: 5, color: [100, 200, 100], slow: 0.2 });
      }
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 270;
  return {};
};

// 2. Crop Dust — sprayer_drone: fly through player leaving toxic trail
MOB_SPECIALS.crop_dust = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._cropDashing) {
    m._cropTimer--;
    const t = 1 - (m._cropTimer / 20);
    m.x = m._cropSX + (m._cropTX - m._cropSX) * t;
    m.y = m._cropSY + (m._cropTY - m._cropSY) * t;
    // Drop toxic trail every 4 frames
    if (m._cropTimer % 4 === 0) {
      hitEffects.push({
        x: m.x, y: m.y, life: 180, maxLife: 180,
        type: "meltdown_pulse",
        _isPuddle: true, _puddleRadius: 40, _puddleDmg: 6, _puddleTick: 0, _puddleInterval: 30,
      });
    }
    if (m._cropTimer <= 0) {
      m._cropDashing = false;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  // Dash 250px through player position
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 250);
  m._cropSX = m.x; m._cropSY = m.y;
  m._cropTX = clamped.x; m._cropTY = clamped.y;
  m._cropDashing = true;
  m._cropTimer = 20;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "cast" });
  return { skip: true };
};

// 3. Volatile Reaction — mad_assistant: lob potion projectile
MOB_SPECIALS.volatile_reaction = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 5, vy: Math.sin(dir) * 5,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#66ff44',
    onHitPlayer: (b, hitTarget) => {
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 24, type: "grenade_explosion" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 300;
  return {};
};

// 4. Fume Slam — chem_brute: AoE slam with confuse
MOB_SPECIALS.fume_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._fumeTelegraph && m._fumeTelegraph > 0) {
    m._fumeTelegraph--;
    if (m._fumeTelegraph <= 0) {
      // Slam lands
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 90, player)) {
        const dmg = Math.round(28 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('confuse', { duration: 90 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 24, type: "chemical_beam" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 110) { m._specialTimer = 30; return {}; }
  // Telegraph
  m._fumeTelegraph = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 90 }, delayFrames: 30, color: [100, 200, 50], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  return { skip: true };
};

// 5. Sticky Trail — sludge_crawler: passively drops slow zones while moving
MOB_SPECIALS.sticky_trail = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._trailTimer === undefined) m._trailTimer = 0;
  if (m._lastTrailX === undefined) { m._lastTrailX = m.x; m._lastTrailY = m.y; }
  // Check if mob is moving
  const moved = (Math.abs(m.x - m._lastTrailX) > 1 || Math.abs(m.y - m._lastTrailY) > 1);
  m._lastTrailX = m.x;
  m._lastTrailY = m.y;
  if (moved) {
    m._trailTimer++;
    if (m._trailTimer >= 60) {
      m._trailTimer = 0;
      // Drop slow zone
      hitEffects.push({
        x: m.x, y: m.y, life: 180, maxLife: 180,
        type: "chemical_beam",
        _isSlowZone: true, _slowRadius: 30, _slowFactor: 0.5,
      });
    }
  }
  // Normal cooldown timer still ticks (but this special is passive)
  if (m._specialTimer > 0) { m._specialTimer--; }
  return {};
};

// 6. Rad Burst — irradiated_walker: reactive AoE when damaged
MOB_SPECIALS.rad_burst = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._lastHpRad === undefined) m._lastHpRad = m.hp;
  if (m._specialTimer > 0) { m._specialTimer--; }
  // Check if mob took damage
  if (m.hp < m._lastHpRad && m._specialTimer <= 0) {
    // Pulse AoE
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
      const dmg = Math.round(15 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      StatusFX.applyToPlayer('bleed', { duration: 120, dmg: 4 });
    }
    hitEffects.push({ x: m.x, y: m.y, life: 20, type: "meltdown_pulse" });
    m._specialTimer = m._specialCD || 240;
  }
  m._lastHpRad = m.hp;
  return {};
};

// 7. Stasis Beam — lockdown_sentinel: sweeping beam that locks movement
MOB_SPECIALS.stasis_beam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._beamSweeping) {
    m._beamTimer--;
    // Sweep beam over 60 frames (180 degrees = PI radians)
    const progress = 1 - (m._beamTimer / 60);
    m._beamAngle = m._beamStartAngle + Math.PI * progress;
    // Check if player is in the thin cone at current beam angle
    const dx = player.x - m.x;
    const dy = player.y - m.y;
    const playerDist = Math.sqrt(dx * dx + dy * dy);
    if (playerDist < 180) {
      const playerAngle = Math.atan2(dy, dx);
      let angleDiff = playerAngle - m._beamAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      if (Math.abs(angleDiff) < (10 * Math.PI / 180)) {
        // Hit by beam
        const dmg = Math.round(18 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('mobility_lock', { duration: 120 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
        // End sweep early on hit
        m._beamSweeping = false;
        m._specialTimer = m._specialCD || 360;
        return {};
      }
    }
    // Visual beam effect
    if (m._beamTimer % 6 === 0) {
      const bx = m.x + Math.cos(m._beamAngle) * 90;
      const by = m.y + Math.sin(m._beamAngle) * 90;
      hitEffects.push({ x: bx, y: by, life: 8, type: "chemical_beam" });
    }
    if (m._beamTimer <= 0) {
      m._beamSweeping = false;
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  // Start sweep — begin from direction toward player, sweep 180 degrees
  m._beamStartAngle = Math.atan2(player.y - m.y, player.x - m.x) - Math.PI / 2;
  m._beamSweeping = true;
  m._beamTimer = 60;
  m._beamAngle = m._beamStartAngle;
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  return { skip: true };
};

// 8. Feral Leap — failed_specimen: jump to player position with AoE landing
MOB_SPECIALS.feral_leap = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._leapDashing) {
    m._leapTimer--;
    const t = 1 - (m._leapTimer / 16);
    // Arc motion: add Y offset for jump feel
    const arcY = Math.sin(t * Math.PI) * -40;
    m.x = m._leapSX + (m._leapTX - m._leapSX) * t;
    m.y = m._leapSY + (m._leapTY - m._leapSY) * t + arcY;
    if (m._leapTimer <= 0) {
      // Land — restore Y to target without arc offset
      m.x = m._leapTX;
      m.y = m._leapTY;
      // AoE on land
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 48 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "sledgehammer_shockwave" });
      m._leapDashing = false;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 60 || dist > 200) { m._specialTimer = 30; return {}; }
  // Save target and start leap
  m._leapSX = m.x; m._leapSY = m.y;
  const clamped = clampDashTarget(m.x, m.y, Math.atan2(player.y - m.y, player.x - m.x), Math.min(dist, 200));
  m._leapTX = clamped.x; m._leapTY = clamped.y;
  m._leapDashing = true;
  m._leapTimer = 16;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "cast" });
  return { skip: true };
};

// ===================== LADY ELIXIR BOSS (5 abilities) =====================

// 9. Toxic Stream — line projectile that leaves poison trail
MOB_SPECIALS.toxic_stream = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (dist > 300) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  let trailCounter = { count: 0 };
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 7, vy: Math.sin(dir) * 7,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#44ff44',
    _trailCounter: trailCounter,
    onUpdate: function() {
      this._trailCounter.count++;
      if (this._trailCounter.count % 8 === 0) {
        hitEffects.push({
          x: this.x, y: this.y, life: 120, maxLife: 120,
          type: "chemical_beam",
          _isPuddle: true, _puddleRadius: 30, _puddleDmg: 3, _puddleTick: 0, _puddleInterval: 30,
        });
      }
    },
    onHitPlayer: (b, hitTarget) => {
      StatusFX.applyToPlayer('bleed', { duration: 120, dmg: 4 });
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 19, type: "chemical_beam" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.toxic_stream = 240;
  return {};
};

// 10. Corrosive Puddle — drop puddle at player position, marks on contact
MOB_SPECIALS.corrosive_puddle = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  // Drop puddle at player location
  hitEffects.push({
    x: player.x, y: player.y, life: 300, maxLife: 300,
    type: "chemical_beam",
    _isPuddle: true, _puddleRadius: 90, _puddleDmg: 8, _puddleTick: 0, _puddleInterval: 30,
    _onPuddleHit: () => {
      StatusFX.applyToPlayer('mark', { duration: 180, bonus: 0.15 });
    },
  });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 90 }, delayFrames: 20, color: [100, 200, 50], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.corrosive_puddle = 360;
  return {};
};

// 11. Volatile Flask (Boss) — lob flask with random status effect
MOB_SPECIALS.volatile_flask_boss = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (dist > 350) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 5, vy: Math.sin(dir) * 5,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(30 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#aaff44',
    life: 50,
    onHitPlayer: (b, hitTarget) => {
      // AoE 80px (already hit the target since this is onHitPlayer)
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 24, type: "grenade_explosion" });
      // Random effect
      const roll = Math.random();
      if (roll < 0.33) {
        StatusFX.applyToPlayer('bleed', { duration: 180, dmg: 4 });
      } else if (roll < 0.66) {
        StatusFX.applyToPlayer('slow', { duration: 150, amount: 0.4 });
      } else {
        StatusFX.applyToPlayer('confuse', { duration: 90 });
      }
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.volatile_flask_boss = 300;
  return {};
};

// 12. Stim Valve — self-heal + speed boost
MOB_SPECIALS.stim_valve = (m, ctx) => {
  const { hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  // Handle active stim buff
  if (m._stimSpeed) {
    m._stimTimer--;
    if (m._stimTimer <= 0) {
      m.speed = m._stimOrigSpeed;
      m._stimSpeed = false;
    }
  }
  // Self-heal 10% maxHp
  m.hp = Math.min(m.hp + Math.round(m.maxHp * 0.1), m.maxHp);
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "heal" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "STIM!" });
  // Speed boost
  if (!m._stimSpeed) {
    m._stimOrigSpeed = m.speed;
    m.speed = Math.round(m.speed * 1.5);
    m._stimSpeed = true;
    m._stimTimer = 180;
  }
  m._abilityCDs.stim_valve = 720;
  return {};
};

// 13. Maximum Overpressure — channeled massive AoE
MOB_SPECIALS.maximum_overpressure = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (m._overpressureChannel) {
    m._overpressureTimer--;
    // Telegraph: expanding circle during channel
    if (m._overpressureTimer % 15 === 0) {
      const progress = 1 - (m._overpressureTimer / 120);
      const radius = 50 + progress * 150;
      hitEffects.push({ x: m.x, y: m.y, life: 15, type: "meltdown_pulse" });
      if (typeof TelegraphSystem !== 'undefined') {
        TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: radius }, delayFrames: 15, color: [100, 255, 50], owner: m.id });
      }
    }
    if (m._overpressureTimer <= 0) {
      // Explosion
      m._overpressureChannel = false;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
        const dmg = Math.round(65 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 24, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('bleed', { duration: 300, dmg: 6 });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 30, type: "meltdown_pulse" });
      m._abilityCDs.maximum_overpressure = 1500;
    }
    return { skip: true };
  }
  // Start channel
  m._overpressureChannel = true;
  m._overpressureTimer = 120;
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "OVERPRESSURE!" });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== NOFAUX BOSS (6 abilities) =====================

// 14. Caustic Cleave — arc attack with poison
MOB_SPECIALS.caustic_cleave = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (dist > 110) return {};
  // 120 degree arc, range 100
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const halfAngle = 60 * Math.PI / 180;
  if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, halfAngle, 100, player)) {
    const dmg = Math.round(35 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('bleed', { duration: 180, dmg: 5 });
  }
  hitEffects.push({ x: m.x, y: m.y, life: 20, type: "chemical_beam" });
  m._abilityCDs.caustic_cleave = 210;
  return {};
};

// 15. Viscous Sludge — projectile that creates slow zone on impact
MOB_SPECIALS.viscous_sludge = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (dist > 350) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 5, vy: Math.sin(dir) * 5,
    fromPlayer: false, mobBullet: true,
    damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#668844',
    onHitPlayer: (b, hitTarget) => {
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 19, type: "chemical_beam" });
      // Create slow zone at impact
      if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
        HazardSystem.createZone({ cx: hitTarget.x, cy: hitTarget.y, radius: 80, duration: 240, tickRate: 999, tickDamage: 0, color: [100, 136, 68], slow: 0.4 });
      }
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.viscous_sludge = 300;
  return {};
};

// 16. Reactive Gel Shield — damage reduction shield, AoE burst when expires
MOB_SPECIALS.reactive_gel_shield = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  // Handle active shield
  if (m._gelTimer && m._gelTimer > 0) {
    m._gelTimer--;
    if (m._gelTimer <= 0) {
      // Shield expires — AoE burst
      m._damageReduction = 0;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 80, player)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 24, type: "grenade_explosion" });
      m._abilityCDs.reactive_gel_shield = 600;
    }
    return {};
  }
  // Activate shield
  m._damageReduction = 0.8;
  m._gelTimer = 600;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "GEL SHIELD!" });
  return {};
};

// 17. Hazard Spill — create 3 puddles in triangle around player
MOB_SPECIALS.hazard_spill = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  // Create 3 puddles in triangle (120 degrees apart, 80px from player)
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI / 3) + Math.random() * 0.3;
    const px = player.x + Math.cos(angle) * 80;
    const py = player.y + Math.sin(angle) * 80;
    hitEffects.push({
      x: px, y: py, life: 300, maxLife: 300,
      type: "chemical_beam",
      _isPuddle: true, _puddleRadius: 70, _puddleDmg: 7, _puddleTick: 0, _puddleInterval: 30,
    });
    hitEffects.push({ x: px, y: py, life: 15, type: "chemical_beam" });
  }
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 120 }, delayFrames: 15, color: [100, 200, 50], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._abilityCDs.hazard_spill = 420;
  return {};
};

// 18. Bio Grapple — tendril pull + root + poison
MOB_SPECIALS.bio_grapple = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (dist > 200) return {};
  // Pull player 100px toward mob
  const dir = Math.atan2(m.y - player.y, m.x - player.x);
  const pullDist = Math.min(100, dist * 0.8);
  const newX = player.x + Math.cos(dir) * pullDist;
  const newY = player.y + Math.sin(dir) * pullDist;
  if (typeof positionClear !== 'undefined' && positionClear(newX, newY)) {
    player.x = newX;
    player.y = newY;
  }
  // Damage + root + poison
  const dmg = Math.round(25 * getMobDamageMultiplier());
  const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  hitEffects.push({ x: player.x, y: player.y, life: 15, type: "chain_hit" });
  StatusFX.applyToPlayer('root', { duration: 90 });
  StatusFX.applyToPlayer('bleed', { duration: 120, dmg: 5 });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
  m._abilityCDs.bio_grapple = 480;
  return {};
};

// 19. Critical Meltdown — massive AoE, only below 25% hp, self-damage
MOB_SPECIALS.critical_meltdown = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (!m._abilityCDs) m._abilityCDs = {};
  if (m._meltdownChannel) {
    m._meltdownTimer--;
    // Telegraph: expanding toxic green circle
    if (m._meltdownTimer % 20 === 0) {
      const progress = 1 - (m._meltdownTimer / 180);
      const radius = 60 + progress * 190;
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "meltdown_pulse" });
      if (typeof TelegraphSystem !== 'undefined') {
        TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: radius }, delayFrames: 20, color: [50, 255, 50], owner: m.id });
      }
    }
    if (m._meltdownTimer <= 0) {
      // Massive explosion
      m._meltdownChannel = false;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 250, player)) {
        const dmg = Math.round(80 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 24, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('bleed', { duration: 300, dmg: 6 });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 35, type: "meltdown_pulse" });
      // Self-damage
      m.hp -= Math.round(m.maxHp * 0.15);
      if (m.hp < 1) m.hp = 1;
      m._abilityCDs.critical_meltdown = 1800;
    }
    return { skip: true };
  }
  // Only usable below 25% hp
  if (m.hp > m.maxHp * 0.25) return {};
  // Start channel
  m._meltdownChannel = true;
  m._meltdownTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "MELTDOWN!" });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== MISSING FLOOR 5 SPECIALS =====================

// plasma_bolt — reactor_technician: fast piercing energy bolt with armor_break
MOB_SPECIALS.plasma_bolt = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 13, vy: Math.sin(dir) * 13,
    fromPlayer: false, mobBullet: true, damage: Math.round(30 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#44ddff', pierce: true,
    onHitPlayer: (b, hitTarget) => {
      StatusFX.applyToPlayer('armor_break', { duration: 180, mult: 1.25 });
      hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "stun" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 480;
  return {};
};

// ooze_spread — containment_breach_blob: creates 3 poison puddles around mob
MOB_SPECIALS.ooze_spread = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  for (let i = 0; i < 3; i++) {
    const angle = (i * 2 * Math.PI / 3) + Math.random() * 0.5;
    const px = m.x + Math.cos(angle) * 70;
    const py = m.y + Math.sin(angle) * 70;
    if (typeof HazardSystem !== 'undefined' && HazardSystem.createZone) {
      HazardSystem.createZone({ cx: px, cy: py, radius: 50, duration: 240, tickRate: 30, tickDamage: 5, color: [100, 200, 100], slow: 0.15 });
    }
    hitEffects.push({ x: px, y: py, life: 15, type: "smoke" });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// reactor_slam — lockdown_sentinel_e205: telegraphed AoE slam with knockback + stun
MOB_SPECIALS.reactor_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._reactorSlamTele) {
    m._reactorSlamTele--;
    if (m._reactorSlamTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 80, player)) {
        const dmg = Math.round(38 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 11.2, Math.sin(kbDir) * 11.2);
        StatusFX.applyToPlayer('root', { duration: 45 });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "sledgehammer_shockwave" });
      m._specialTimer = m._specialCD || 600;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 120) { m._specialTimer = 30; return {}; }
  m._reactorSlamTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 80 }, delayFrames: 60, color: [200, 80, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== END OF PART 3 — Floor 5 + Lady Elixir + Nofaux =====================
