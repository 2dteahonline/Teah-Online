// ===================== VORTALIS DUNGEON MOB SPECIALS =====================
// Pirate/ocean themed dungeon — regular mob + boss abilities.
// Appended to MOB_SPECIALS (defined in combatSystem.js).

// ===================== REGULAR MOB SPECIALS (1-20) =====================

// 1. Shiv Lunge — dash 200px to player, deal damage
MOB_SPECIALS.shiv_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._shivDashing) {
    m._shivTimer--;
    const t = 1 - (m._shivTimer / 12);
    m.x = m._shivSX + (m._shivTX - m._shivSX) * t;
    m.y = m._shivSY + (m._shivTY - m._shivSY) * t;
    if (m._shivTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40, player)) {
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._shivDashing = false;
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250 || dist < 30) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 200);
  m._shivSX = m.x; m._shivSY = m.y;
  m._shivTX = clamped.x; m._shivTY = clamped.y;
  m._shivDashing = true; m._shivTimer = 12;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "afterimage" });
  return { skip: true };
};

// 2. Spear Dash — quick dash to player
MOB_SPECIALS.spear_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  if (m._spearDashing) {
    m._spearTimer--;
    const t = 1 - (m._spearTimer / 14);
    m.x = m._spearSX + (m._spearTX - m._spearSX) * t;
    m.y = m._spearSY + (m._spearTY - m._spearSY) * t;
    if (m._spearTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m._spearSX, m._spearSY, m.x, m.y, 28, player)) {
        const dmg = Math.round(m.damage * 1.2 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._spearDashing = false;
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 240));
  m._spearSX = m.x; m._spearSY = m.y;
  m._spearTX = clamped.x; m._spearTY = clamped.y;
  m._spearDashing = true; m._spearTimer = 14;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 28 }, delayFrames: 6, color: [180, 140, 80], owner: m.id });
  }
  return { skip: true };
};

// 3. Blood Frenzy — self speed+dmg buff 3s
MOB_SPECIALS.blood_frenzy = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._frenzyTimer && m._frenzyTimer > 0) {
    m._frenzyTimer--;
    if (m._frenzyTimer <= 0) {
      m.speed = m._frenzyOrigSpd;
      m.damage = m._frenzyOrigDmg;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._frenzyOrigSpd = m.speed;
  m._frenzyOrigDmg = m.damage;
  m.speed *= 1.4;
  m.damage = Math.round(m.damage * 1.3);
  m._frenzyTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "FRENZY!" });
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 4. Rabid Pounce — pounce + stun 0.5s
MOB_SPECIALS.rabid_pounce = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._pounceDashing) {
    m._pounceTimer--;
    const t = 1 - (m._pounceTimer / 16);
    m.x = m._pounceSX + (m._pounceTX - m._pounceSX) * t;
    m.y = m._pounceSY + (m._pounceTY - m._pounceSY) * t;
    if (m._pounceTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48, player)) {
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 30 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      m._pounceDashing = false;
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280 || dist < 40) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 30, 250));
  m._pounceSX = m.x; m._pounceSY = m.y;
  m._pounceTX = clamped.x; m._pounceTY = clamped.y;
  m._pounceDashing = true; m._pounceTimer = 16;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "cast" });
  return { skip: true };
};

// 5. Reckless Charge — heavy charge, self-stun on wall hit
MOB_SPECIALS.reckless_charge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._recklessSelfStun && m._recklessSelfStun > 0) {
    m._recklessSelfStun--;
    return { skip: true };
  }
  if (m._recklessDashing) {
    m._recklessTimer--;
    const t = 1 - (m._recklessTimer / 20);
    const nx = m._recklessSX + (m._recklessTX - m._recklessSX) * t;
    const ny = m._recklessSY + (m._recklessTY - m._recklessSY) * t;
    if (!positionClear(nx, ny)) {
      m._recklessDashing = false;
      m._recklessSelfStun = 60;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 20, type: "stun" });
      m._specialTimer = m._specialCD || 540;
      return { skip: true };
    }
    m.x = nx; m.y = ny;
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 36, player)) {
      const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      StatusFX.applyToPlayer('stun', { duration: 18 });
    }
    if (m._recklessTimer <= 0) {
      m._recklessDashing = false;
      m._specialTimer = m._specialCD || 540;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 300);
  m._recklessSX = m.x; m._recklessSY = m.y;
  m._recklessTX = clamped.x; m._recklessTY = clamped.y;
  m._recklessDashing = true; m._recklessTimer = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 36 }, delayFrames: 12, color: [200, 50, 50], owner: m.id });
  }
  return { skip: true };
};

// 6. Phase Lunge — teleport behind player, backstab
MOB_SPECIALS.phase_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._phaseLungeDelay && m._phaseLungeDelay > 0) {
    m._phaseLungeDelay--;
    if (m._phaseLungeDelay <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(m.damage * 1.4 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 600;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const behindDir = Math.atan2(player.y - m.y, player.x - m.x);
  const tx = player.x + Math.cos(behindDir) * 40;
  const ty = player.y + Math.sin(behindDir) * 40;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "afterimage" });
  if (positionClear(tx, ty)) { m.x = tx; m.y = ty; }
  else { m.x = player.x; m.y = player.y; }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "afterimage" });
  m._phaseLungeDelay = 8;
  return { skip: true };
};

// 7. Tidal Lunge — water dash, leaves slow zone
MOB_SPECIALS.tidal_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._tidalDashing) {
    m._tidalTimer--;
    const t = 1 - (m._tidalTimer / 16);
    m.x = m._tidalSX + (m._tidalTX - m._tidalSX) * t;
    m.y = m._tidalSY + (m._tidalTY - m._tidalSY) * t;
    if (m._tidalTimer % 4 === 0 && typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({ cx: m.x, cy: m.y, radius: 36, duration: 180, tickRate: 999, tickDamage: 0, color: [50, 120, 200], slow: 0.35 });
    }
    if (m._tidalTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40, player)) {
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._tidalDashing = false;
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 240));
  m._tidalSX = m.x; m._tidalSY = m.y;
  m._tidalTX = clamped.x; m._tidalTY = clamped.y;
  m._tidalDashing = true; m._tidalTimer = 16;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 32 }, delayFrames: 8, color: [50, 150, 220], owner: m.id });
  }
  return { skip: true };
};

// 8. Royal Thrust — spear thrust 180px
MOB_SPECIALS.royal_thrust = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  if (m._thrustTelegraph) {
    m._thrustTelegraph--;
    if (m._thrustTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined') {
        if (AttackShapes.playerInLine(m.x, m.y, m._thrustX2, m._thrustY2, 24, player)) {
          const dmg = Math.round(m.damage * 1.3 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        }
      }
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 220) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._thrustX2 = m.x + Math.cos(dir) * 180;
  m._thrustY2 = m.y + Math.sin(dir) * 180;
  m._thrustTelegraph = 14;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: m._thrustX2, y2: m._thrustY2, width: 24 }, delayFrames: 14, color: [200, 170, 50], owner: m.id });
  }
  return { skip: true };
};

// 9. Leviathan Lunge — serpentine dash + aoe at end
MOB_SPECIALS.leviathan_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._levDashing) {
    m._levTimer--;
    const t = 1 - (m._levTimer / 18);
    const baseX = m._levSX + (m._levTX - m._levSX) * t;
    const baseY = m._levSY + (m._levTY - m._levSY) * t;
    const wiggle = Math.sin(t * Math.PI * 4) * 30;
    const perpDir = m._levDir + Math.PI / 2;
    m.x = baseX + Math.cos(perpDir) * wiggle;
    m.y = baseY + Math.sin(perpDir) * wiggle;
    if (m._levTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 72, player)) {
        const dmg = Math.round(m.damage * 1.3 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "explosion" });
      m._levDashing = false;
      m._specialTimer = m._specialCD || 540;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._levDir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, m._levDir, Math.min(dist + 30, 280));
  m._levSX = m.x; m._levSY = m.y;
  m._levTX = clamped.x; m._levTY = clamped.y;
  m._levDashing = true; m._levTimer = 18;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 40 }, delayFrames: 10, color: [30, 180, 160], owner: m.id });
  }
  return { skip: true };
};

// 10. Shard Glide — glide dash, 3 shards left behind
MOB_SPECIALS.shard_glide = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._shardGliding) {
    m._shardGlideTimer--;
    const t = 1 - (m._shardGlideTimer / 14);
    m.x = m._sgSX + (m._sgTX - m._sgSX) * t;
    m.y = m._sgSY + (m._sgTY - m._sgSY) * t;
    if (m._shardGlideTimer % 4 === 0 && m._shardGlideTimer > 0) {
      const backDir = m._sgDir + Math.PI;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(backDir) * 3.6, vy: Math.sin(backDir) * 3.6,
        fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#88ddff', life: 90,
      });
    }
    if (m._shardGlideTimer <= 0) {
      m._shardGliding = false;
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._sgDir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, m._sgDir, 200);
  m._sgSX = m.x; m._sgSY = m.y;
  m._sgTX = clamped.x; m._sgTY = clamped.y;
  m._shardGliding = true; m._shardGlideTimer = 14;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "cast" });
  return { skip: true };
};

// 11. Scattershot — 5 bullets in cone
MOB_SPECIALS.scattershot = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = Math.PI / 5;
  const speed = 7;
  for (let i = 0; i < 5; i++) {
    const angle = baseDir - spread + (i / 4) * spread * 2;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.7 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ccaa55',
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._specialTimer = m._specialCD || 420;
  return {};
};

// 12. Piercing Musket — single high-damage sniper shot
MOB_SPECIALS.piercing_musket = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 500) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const speed = 12;
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed,
    fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 2.5 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ffcc00',
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 13. Paralysis Dart — dart that roots 0.7s
MOB_SPECIALS.paralysis_dart = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * GAME_CONFIG.BULLET_SPEED, vy: Math.sin(dir) * GAME_CONFIG.BULLET_SPEED,
    fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.5 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#77cc44',
    onHitPlayer: (b, hitTarget) => { StatusFX.applyToPlayer('root', { duration: 42 }); hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 30, life: 30, type: "stun" }); },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 14. Shard Spread — 3 crystal shards fan, slow on hit
MOB_SPECIALS.shard_spread = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = Math.PI / 8;
  for (let i = 0; i < 3; i++) {
    const angle = baseDir - spread + i * spread;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#88ddff',
      onHitPlayer: (b, hitTarget) => { StatusFX.applyToPlayer('slow', { amount: 0.3, duration: 90 }); },
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 480;
  return {};
};

// 15. Soul Bullet — homing ghost projectile
MOB_SPECIALS.soul_bullet = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 450) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 4.5, vy: Math.sin(dir) * 4.5,
    fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.8 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#cc88ff', homing: true, homingStrength: 0.04, life: 180,
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 16. Blinding Ink — ink blob that blinds 1.5s
MOB_SPECIALS.blinding_ink = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._inkTelegraph) {
    m._inkTelegraph--;
    if (m._inkTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._inkX, m._inkY, 72, player)) {
        const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('blind', { duration: 90 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "BLIND!" });
      }
      hitEffects.push({ x: m._inkX, y: m._inkY, life: 25, type: "smoke" });
      m._specialTimer = m._specialCD || 540;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._inkX = player.x; m._inkY = player.y;
  m._inkTelegraph = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._inkX, cy: m._inkY, radius: 72 }, delayFrames: 24, color: [40, 40, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  return {};
};

// 17. Wealth Volley — 8 coin bullets in circle
MOB_SPECIALS.wealth_volley = (m, ctx) => {
  const { hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.5 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ffd700',
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._specialTimer = m._specialCD || 480;
  return {};
};

// 18. Venom Spit — poison arc projectile
MOB_SPECIALS.venom_spit = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 6, vy: Math.sin(dir) * 6 - 2,
    fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#44cc22',
    onHitPlayer: (b, hitTarget) => { StatusFX.applyToPlayer('poison', { duration: 180, dmg: Math.round(m.damage * 0.15) }); },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 480;
  return {};
};

// 19. Barrel Drop — drop barrel, explodes 1.5s later
MOB_SPECIALS.barrel_drop = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (!m._barrels) m._barrels = [];
  // Tick existing barrels
  for (let i = m._barrels.length - 1; i >= 0; i--) {
    const b = m._barrels[i];
    b.timer--;
    if (b.timer <= 0) {
      hitEffects.push({ x: b.x, y: b.y, life: 25, type: "explosion" });
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(b.x, b.y, 80, player)) {
        const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._barrels.splice(i, 1);
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  // Drop barrel at current position
  m._barrels.push({ x: m.x, y: m.y, timer: 90 });
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "mine_drop" });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 80 }, delayFrames: 90, color: [200, 120, 40], owner: m.id });
  }
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 20. Anchor Sweep — 180deg melee sweep
MOB_SPECIALS.anchor_sweep = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._anchorTelegraph) {
    m._anchorTelegraph--;
    if (m._anchorTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined') {
        const dir = Math.atan2(player.y - m.y, player.x - m.x);
        if (AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 2, 120, player)) {
          const dmg = Math.round(m.damage * 1.4 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          StatusFX.applyToPlayer('slow', { amount: 0.3, duration: 60 });
        }
      }
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 150) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._anchorTelegraph = 16;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 180, range: 120 }, delayFrames: 16, color: [150, 150, 150], owner: m.id });
  }
  return { skip: true };
};

// ===================== REGULAR MOB SPECIALS (21-38) =====================

// 21. Water Geyser — telegraph circle, erupts for dmg
MOB_SPECIALS.water_geyser = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._geyserTelegraph) {
    m._geyserTelegraph--;
    if (m._geyserTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._geyserX, m._geyserY, 80, player)) {
        const dmg = Math.round(m.damage * 1.2 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('slow', { amount: 0.3, duration: 60 });
      }
      hitEffects.push({ x: m._geyserX, y: m._geyserY, life: 25, type: "explosion" });
      m._specialTimer = m._specialCD || 480;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._geyserX = player.x; m._geyserY = player.y;
  m._geyserTelegraph = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._geyserX, cy: m._geyserY, radius: 80 }, delayFrames: 30, color: [60, 140, 220], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  return {};
};

// 22. Earthquake Slam — aoe 120px stun 0.5s
MOB_SPECIALS.earthquake_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._quakeTelegraph) {
    m._quakeTelegraph--;
    if (m._quakeTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120, player)) {
        const dmg = Math.round(m.damage * 1.3 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 30 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "explosion" });
      m._specialTimer = m._specialCD || 540;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 160) { m._specialTimer = 30; return {}; }
  m._quakeTelegraph = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 120 }, delayFrames: 20, color: [160, 120, 60], owner: m.id });
  }
  return { skip: true };
};

// 23. Wail of Depths — aoe 180px fear 1.5s (pushes player away)
MOB_SPECIALS.wail_of_depths = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._wailTelegraph) {
    m._wailTelegraph--;
    if (m._wailTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 180, player)) {
        const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { amount: 0.5, duration: 90 });
        const pushDir = Math.atan2(player.y - m.y, player.x - m.x);
        const nx = player.x + Math.cos(pushDir) * 100;
        const ny = player.y + Math.sin(pushDir) * 100;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "FEAR!" });
      }
      m._specialTimer = m._specialCD || 600;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 220) { m._specialTimer = 30; return {}; }
  m._wailTelegraph = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 180 }, delayFrames: 24, color: [100, 60, 150], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 24. Abyssal Slam — aoe 150px heavy dmg
MOB_SPECIALS.abyssal_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._abyssSlamTele) {
    m._abyssSlamTele--;
    if (m._abyssSlamTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 150, player)) {
        const dmg = Math.round(m.damage * 1.8 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 30, type: "explosion" });
      m._specialTimer = m._specialCD || 540;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 190) { m._specialTimer = 30; return {}; }
  m._abyssSlamTele = 22;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 150 }, delayFrames: 22, color: [60, 30, 100], owner: m.id });
  }
  return { skip: true };
};

// 25. Pressure Zone — lingering slow zone 4s
MOB_SPECIALS.pressure_zone = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: player.x, cy: player.y, radius: 100, duration: 240,
      tickRate: 60, tickDamage: Math.round(m.damage * 0.3 * getMobDamageMultiplier()),
      color: [40, 80, 140], slow: 0.4,
    });
  }
  hitEffects.push({ x: player.x, y: player.y, life: 20, type: "cast" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 26. Coral Barricade — spawn coral wall zone 5s
MOB_SPECIALS.coral_barricade = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const midX = (m.x + player.x) / 2, midY = (m.y + player.y) / 2;
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: midX, cy: midY, radius: 60, duration: 300,
      tickRate: 999, tickDamage: 0, color: [200, 150, 120], slow: 0.7,
    });
  }
  hitEffects.push({ x: midX, y: midY - 10, life: 20, type: "cast" });
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 27. Crashing Surf — water wave toward player
MOB_SPECIALS.crashing_surf = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._surfTelegraph) {
    m._surfTelegraph--;
    if (m._surfTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m._surfX1, m._surfY1, m._surfX2, m._surfY2, 60, player)) {
        const dmg = Math.round(m.damage * 1.1 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        const pushDir = Math.atan2(m._surfY2 - m._surfY1, m._surfX2 - m._surfX1);
        const nx = player.x + Math.cos(pushDir) * 60;
        const ny = player.y + Math.sin(pushDir) * 60;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
      }
      m._specialTimer = m._specialCD || 480;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._surfX1 = m.x; m._surfY1 = m.y;
  m._surfX2 = m.x + Math.cos(dir) * 300; m._surfY2 = m.y + Math.sin(dir) * 300;
  m._surfTelegraph = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m._surfX1, y1: m._surfY1, x2: m._surfX2, y2: m._surfY2, width: 60 }, delayFrames: 20, color: [40, 140, 200], owner: m.id });
  }
  return {};
};

// 28. Pincer Guillotine — close-range snap + armor_break
MOB_SPECIALS.pincer_guillotine = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  if (m._pincerTelegraph) {
    m._pincerTelegraph--;
    if (m._pincerTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(m.damage * 1.6 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('mark', { duration: 180, bonus: 0.2 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "mark" });
      }
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 90) { m._specialTimer = 20; return {}; }
  m._pincerTelegraph = 12;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 60 }, delayFrames: 12, color: [200, 60, 60], owner: m.id });
  }
  return { skip: true };
};

// 29. Toxic Trail — poison trail while moving 3s
MOB_SPECIALS.toxic_trail = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._toxicTrailTimer && m._toxicTrailTimer > 0) {
    m._toxicTrailTimer--;
    if (m._toxicTrailTimer % 10 === 0 && typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: m.x, cy: m.y, radius: 32, duration: 150,
        tickRate: 30, tickDamage: Math.round(m.damage * 0.2 * getMobDamageMultiplier()),
        tickEffect: 'poison_tick', color: [40, 160, 40], slow: 0,
      });
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._toxicTrailTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "buff" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 30. Pack Howl — buff nearby allies +30% speed
MOB_SPECIALS.pack_howl = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  for (const ally of mobs) {
    if (ally.hp <= 0 || ally.id === m.id) continue;
    const dx = ally.x - m.x, dy = ally.y - m.y;
    if (dx * dx + dy * dy > 200 * 200) continue;
    if (!ally._packOrigSpd) ally._packOrigSpd = ally.speed;
    ally.speed = ally._packOrigSpd * 1.3;
    ally._packTimer = 240;
    hitEffects.push({ x: ally.x, y: ally.y - 20, life: 20, type: "buff" });
  }
  hitEffects.push({ x: m.x, y: m.y - 25, life: 25, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "HOWL!" });
  m._specialTimer = m._specialCD || 720;
  return {};
};

// 31. Hamstring Bite — slow + bleed on melee hit
MOB_SPECIALS.hamstring_bite = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 60) { m._specialTimer = 20; return {}; }
  const dmg = Math.round(m.damage * 0.8 * getMobDamageMultiplier());
  const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  StatusFX.applyToPlayer('slow', { amount: 0.35, duration: 120 });
  StatusFX.applyToPlayer('bleed', { duration: 180, dmg: Math.round(m.damage * 0.1) });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "mark" });
  m._specialTimer = m._specialCD || 420;
  return {};
};

// 32. Spectral Tether — tether player to mob position
MOB_SPECIALS.spectral_tether = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._tetherTimer && m._tetherTimer > 0) {
    m._tetherTimer--;
    const dx = player.x - m._tetherX, dy = player.y - m._tetherY;
    const tDist = Math.sqrt(dx * dx + dy * dy);
    if (tDist > 150) {
      const pullDir = Math.atan2(m._tetherY - player.y, m._tetherX - player.x);
      const nx = player.x + Math.cos(pullDir) * 4;
      const ny = player.y + Math.sin(pullDir) * 4;
      if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._tetherX = player.x; m._tetherY = player.y;
  m._tetherTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "TETHERED!" });
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 33. Sticky Trap — place root trap
MOB_SPECIALS.sticky_trap = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (!m._stickyTraps) m._stickyTraps = [];
  for (let i = m._stickyTraps.length - 1; i >= 0; i--) {
    const trap = m._stickyTraps[i];
    trap.timer--;
    if (trap.timer <= 0) { m._stickyTraps.splice(i, 1); continue; }
    if (!trap.armed) { trap.armDelay--; if (trap.armDelay <= 0) trap.armed = true; continue; }
    const dx = player.x - trap.x, dy = player.y - trap.y;
    if (dx * dx + dy * dy <= 40 * 40) {
      StatusFX.applyToPlayer('root', { duration: 60 });
      const dmg = Math.round(m.damage * 0.4 * getMobDamageMultiplier());
      dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: trap.x, y: trap.y, life: 20, type: "explosion" });
      hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      m._stickyTraps.splice(i, 1);
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._stickyTraps.push({ x: m.x, y: m.y, timer: 600, armed: false, armDelay: 30 });
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "mine_drop" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 34. Tower Shield — activate frontal shield 3s
MOB_SPECIALS.tower_shield = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._shieldTimer && m._shieldTimer > 0) {
    m._shieldTimer--;
    m._shielded = true;
    if (m._shieldTimer <= 0) m._shielded = false;
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._shieldTimer = 180;
  m._shielded = true;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "SHIELD!" });
  m._specialTimer = m._specialCD || 540;
  return {};
};

// 35. Blood Pool — healing zone for mob
MOB_SPECIALS.blood_pool = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._bloodPoolTimer && m._bloodPoolTimer > 0) {
    m._bloodPoolTimer--;
    if (m._bloodPoolTimer % 60 === 0) {
      const dx = m.x - m._bpX, dy = m.y - m._bpY;
      if (dx * dx + dy * dy <= 80 * 80) {
        const healAmt = Math.round(m.maxHp * 0.04);
        m.hp = Math.min(m.maxHp, m.hp + healAmt);
        hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
      }
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._bpX = m.x; m._bpY = m.y;
  m._bloodPoolTimer = 300;
  hitEffects.push({ x: m.x, y: m.y, life: 25, type: "cast" });
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({ cx: m.x, cy: m.y, radius: 80, duration: 300, tickRate: 999, tickDamage: 0, color: [140, 30, 30], slow: 0 });
  }
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 36. Aegis Reflect — reflect projectiles 2s
MOB_SPECIALS.aegis_reflect = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._reflectTimer && m._reflectTimer > 0) {
    m._reflectTimer--;
    m._reflecting = true;
    if (m._reflectTimer <= 0) m._reflecting = false;
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._reflectTimer = 120;
  m._reflecting = true;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "REFLECT!" });
  m._specialTimer = m._specialCD || 600;
  return {};
};

// 37. Tentacle Bind — grab + root 1s
MOB_SPECIALS.tentacle_bind = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._bindTelegraph) {
    m._bindTelegraph--;
    if (m._bindTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._bindX, m._bindY, 56, player)) {
        const dmg = Math.round(m.damage * 0.7 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('root', { duration: 60 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "stun" });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 540;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  m._bindX = player.x; m._bindY = player.y;
  m._bindTelegraph = 18;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._bindX, cy: m._bindY, radius: 56 }, delayFrames: 18, color: [80, 140, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  return {};
};

// 38. Abyssal Undertow — pull player toward mob + slow
MOB_SPECIALS.abyssal_undertow = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;
  if (m._undertowTelegraph) {
    m._undertowTelegraph--;
    if (m._undertowTelegraph <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 160, player)) {
        const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { amount: 0.4, duration: 90 });
        const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
        const nx = player.x + Math.cos(pullDir) * 80;
        const ny = player.y + Math.sin(pullDir) * 80;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 540;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  m._undertowTelegraph = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 160 }, delayFrames: 20, color: [30, 60, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  return {};
};

// ===================== BOSS SPECIALS: CAPTAIN HUSA =====================

// Flintlock Volley — 6 bullets in wide spread
MOB_SPECIALS.flintlock_volley = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = Math.PI / 4;
  for (let i = 0; i < 6; i++) {
    const angle = dir - spread / 2 + (i / 5) * spread;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 10,
      vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.7 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ffcc44',
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
  m._abilityCDs.flintlock_volley = 360;
  return {};
};

// Cutlass Cleave — wide cone melee
MOB_SPECIALS.cutlass_cleave = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._cutlassTele) {
    m._cutlassTele--;
    if (m._cutlassTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 130, player)) {
        const dmg = Math.round(m.damage * 1.4 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._abilityCDs.cutlass_cleave = 300;
    }
    return { skip: true };
  }
  if (dist > 160) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._cutlassTele = 14;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 120, range: 130 }, delayFrames: 14, color: [200, 180, 80], owner: m.id });
  }
  return { skip: true };
};

// Call to Arms — summon 2 pirate minions
MOB_SPECIALS.call_to_arms = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  const activeMinions = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
  if (activeMinions >= 3) return {};
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sx = m.x + Math.cos(angle) * 80;
    const sy = m.y + Math.sin(angle) * 80;
    if (!positionClear(sx, sy)) continue;
    mobs.push({
      x: sx, y: sy, type: 'pirate_grunt', id: nextMobId++,
      hp: Math.round(m.maxHp * 0.15), maxHp: Math.round(m.maxHp * 0.15),
      speed: 1.8, damage: Math.round(m.damage * 0.4),
      contactRange: 30, skin: '#c4a882', hair: '#333', shirt: '#884422', pants: '#553311',
      name: 'Deckhand', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    });
    hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "TO ARMS!" });
  m._abilityCDs.call_to_arms = 900;
  return {};
};

// Weathered Resolve — heal 15% maxHp over 3s
MOB_SPECIALS.weathered_resolve = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._weatheredTimer && m._weatheredTimer > 0) {
    m._weatheredTimer--;
    if (m._weatheredTimer % 36 === 0) {
      const healAmt = Math.round(m.maxHp * 0.03);
      m.hp = Math.min(m.maxHp, m.hp + healAmt);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
    }
    return {};
  }
  if (m.hp > m.maxHp * 0.5) return {};
  m._weatheredTimer = 180;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, type: "buff" });
  m._abilityCDs.weathered_resolve = 720;
  return {};
};

// Boarding Rush — dash to player + melee hit
MOB_SPECIALS.boarding_rush = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._boardingDash) {
    m._boardingTimer--;
    const t = 1 - (m._boardingTimer / 14);
    m.x = m._boardSX + (m._boardTX - m._boardSX) * t;
    m.y = m._boardSY + (m._boardTY - m._boardSY) * t;
    if (m._boardingTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(m.damage * 1.3 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 18 });
      }
      m._boardingDash = false;
      m._abilityCDs.boarding_rush = 420;
    }
    return { skip: true };
  }
  if (dist > 350 || dist < 40) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 250));
  m._boardSX = m.x; m._boardSY = m.y;
  m._boardTX = clamped.x; m._boardTY = clamped.y;
  m._boardingDash = true; m._boardingTimer = 14;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "afterimage" });
  return { skip: true };
};

// ===================== BOSS SPECIALS: ADMIRAL VON KAEL =====================

// Naval Artillery — 3 telegraph circles on player
MOB_SPECIALS.naval_artillery = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._artilleryTele) {
    m._artilleryTele--;
    if (m._artilleryTele <= 0) {
      for (const t of m._artilleryTargets) {
        if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(t.x, t.y, 72, player)) {
          const dmg = Math.round(m.damage * 1.2 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          break;
        }
        hitEffects.push({ x: t.x, y: t.y, life: 25, type: "explosion" });
      }
      m._abilityCDs.naval_artillery = 480;
    }
    return {};
  }
  m._artilleryTargets = [];
  for (let i = 0; i < 3; i++) {
    const ox = (Math.random() - 0.5) * 120;
    const oy = (Math.random() - 0.5) * 120;
    const tx = player.x + ox, ty = player.y + oy;
    m._artilleryTargets.push({ x: tx, y: ty });
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({ shape: 'circle', params: { cx: tx, cy: ty, radius: 72 }, delayFrames: 36, color: [220, 100, 30], owner: m.id });
    }
  }
  m._artilleryTele = 36;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return {};
};

// Spectral Chain Binding — tether + pull + damage
MOB_SPECIALS.spectral_chain_binding = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._chainBindTimer && m._chainBindTimer > 0) {
    m._chainBindTimer--;
    const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
    const nx = player.x + Math.cos(pullDir) * 3;
    const ny = player.y + Math.sin(pullDir) * 3;
    if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
    if (m._chainBindTimer <= 0) {
      const dmg = Math.round(m.damage * 1.0 * getMobDamageMultiplier());
      dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
      m._abilityCDs.spectral_chain_binding = 600;
    }
    return {};
  }
  if (dist > 350) return {};
  m._chainBindTimer = 90;
  StatusFX.applyToPlayer('slow', { amount: 0.5, duration: 90 });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "CHAINED!" });
  return {};
};

// Tattered Tide — expanding water ring
MOB_SPECIALS.tattered_tide = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 30, color: [60, 120, 180], owner: m.id });
  }
  if (m._tideTele) {
    m._tideTele--;
    if (m._tideTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
        const dmg = Math.round(m.damage * 0.8 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { amount: 0.4, duration: 120 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
      }
      if (typeof HazardSystem !== 'undefined') {
        HazardSystem.createZone({ cx: m.x, cy: m.y, radius: 200, duration: 240, tickRate: 60, tickDamage: Math.round(m.damage * 0.2 * getMobDamageMultiplier()), color: [50, 100, 170], slow: 0.3 });
      }
      m._abilityCDs.tattered_tide = 540;
    }
    return {};
  }
  m._tideTele = 30;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return {};
};

// Command Authority — buff all nearby allies + speed/damage
MOB_SPECIALS.command_authority = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  for (const ally of mobs) {
    if (ally.hp <= 0 || ally.id === m.id) continue;
    const dx = ally.x - m.x, dy = ally.y - m.y;
    if (dx * dx + dy * dy > 300 * 300) continue;
    if (!ally._cmdOrigSpd) ally._cmdOrigSpd = ally.speed;
    if (!ally._cmdOrigDmg) ally._cmdOrigDmg = ally.damage;
    ally.speed = ally._cmdOrigSpd * 1.25;
    ally.damage = Math.round(ally._cmdOrigDmg * 1.2);
    ally._cmdBuffTimer = 300;
    hitEffects.push({ x: ally.x, y: ally.y - 20, life: 20, type: "buff" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "COMMAND!" });
  m._abilityCDs.command_authority = 720;
  return {};
};

// Admiral's Resolve — damage reduction 4s
MOB_SPECIALS.admirals_resolve = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._resolveTimer && m._resolveTimer > 0) {
    m._resolveTimer--;
    m._shielded = true;
    if (m._resolveTimer <= 0) m._shielded = false;
    return {};
  }
  if (m.hp > m.maxHp * 0.4) return {};
  m._resolveTimer = 240;
  m._shielded = true;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "RESOLVE!" });
  m._abilityCDs.admirals_resolve = 600;
  return {};
};

// ===================== BOSS SPECIALS: ZONGO =====================

// Spear Barrage — 5 spears in sequence
MOB_SPECIALS.spear_barrage = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  if (m._spearBarrageFiring) {
    m._spearBarrageFrame++;
    if (m._spearBarrageFrame % 6 === 0 && m._spearBarrageShots < 5) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 10,
        vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
        fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#aa8844',
      });
      m._spearBarrageShots++;
    }
    if (m._spearBarrageShots >= 5) {
      m._spearBarrageFiring = false;
      m._abilityCDs.spear_barrage = 420;
    }
    return { skip: true };
  }
  m._spearBarrageFiring = true;
  m._spearBarrageFrame = 0;
  m._spearBarrageShots = 0;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// Vine Snare — root trap at player pos
MOB_SPECIALS.vine_snare = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._vineTele) {
    m._vineTele--;
    if (m._vineTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._vineX, m._vineY, 60, player)) {
        StatusFX.applyToPlayer('root', { duration: 72 });
        const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "stun" });
      }
      m._abilityCDs.vine_snare = 480;
    }
    return {};
  }
  if (dist > 350) return {};
  m._vineX = player.x; m._vineY = player.y;
  m._vineTele = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._vineX, cy: m._vineY, radius: 60 }, delayFrames: 24, color: [40, 160, 40], owner: m.id });
  }
  return {};
};

// Primal Roar — aoe fear + slow
MOB_SPECIALS.primal_roar = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
    StatusFX.applyToPlayer('slow', { amount: 0.5, duration: 120 });
    const pushDir = Math.atan2(player.y - m.y, player.x - m.x);
    const nx = player.x + Math.cos(pushDir) * 80;
    const ny = player.y + Math.sin(pushDir) * 80;
    if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
    hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "FEAR!" });
  }
  hitEffects.push({ x: m.x, y: m.y - 25, life: 25, type: "cast" });
  m._abilityCDs.primal_roar = 600;
  return {};
};

// Tribal Summon — summon 2 tribal warriors
MOB_SPECIALS.tribal_summon = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  const active = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
  if (active >= 4) return {};
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sx = m.x + Math.cos(angle) * 90;
    const sy = m.y + Math.sin(angle) * 90;
    if (!positionClear(sx, sy)) continue;
    mobs.push({
      x: sx, y: sy, type: 'tribal_warrior', id: nextMobId++,
      hp: Math.round(m.maxHp * 0.12), maxHp: Math.round(m.maxHp * 0.12),
      speed: 2.1, damage: Math.round(m.damage * 0.35),
      contactRange: 30, skin: '#8b6914', hair: '#222', shirt: '#556b2f', pants: '#3a2a0a',
      name: 'Tribal Warrior', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    });
    hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  }
  m._abilityCDs.tribal_summon = 840;
  return {};
};

// Jungle Fury — speed+dmg buff + dash flurry
MOB_SPECIALS.jungle_fury = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._jungleFuryTimer && m._jungleFuryTimer > 0) {
    m._jungleFuryTimer--;
    if (m._jungleFuryTimer <= 0) {
      m.speed = m._jfOrigSpd;
      m.damage = m._jfOrigDmg;
    }
    return {};
  }
  m._jfOrigSpd = m.speed;
  m._jfOrigDmg = m.damage;
  m.speed *= 1.6;
  m.damage = Math.round(m.damage * 1.4);
  m._jungleFuryTimer = 240;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "FURY!" });
  m._abilityCDs.jungle_fury = 720;
  return {};
};

// ===================== BOSS SPECIALS: BLOODBORNE MARLON =====================

// Chain Grapple — pull player to mob
MOB_SPECIALS.chain_grapple = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 400 || dist < 60) return {};
  const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
  const pullDist = dist * 0.6;
  const nx = player.x + Math.cos(pullDir) * pullDist;
  const ny = player.y + Math.sin(pullDir) * pullDist;
  if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
  const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
  dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 25, maxLife: 25, type: "heal", dmg: "GRAPPLE!" });
  m._abilityCDs.chain_grapple = 480;
  return {};
};

// Crimson Cleave — heavy line slash
MOB_SPECIALS.crimson_cleave = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._crimsonTele) {
    m._crimsonTele--;
    if (m._crimsonTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m.x, m.y, m._crimsonX2, m._crimsonY2, 40, player)) {
        const dmg = Math.round(m.damage * 1.6 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('bleed', { duration: 180, dmg: Math.round(m.damage * 0.15) });
      }
      m._abilityCDs.crimson_cleave = 360;
    }
    return { skip: true };
  }
  if (dist > 200) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._crimsonX2 = m.x + Math.cos(dir) * 180;
  m._crimsonY2 = m.y + Math.sin(dir) * 180;
  m._crimsonTele = 16;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: m._crimsonX2, y2: m._crimsonY2, width: 40 }, delayFrames: 16, color: [180, 30, 30], owner: m.id });
  }
  return { skip: true };
};

// Shard of Betrayal — 4 projectiles from random angles converging on player
MOB_SPECIALS.shard_of_betrayal = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const baseAngle = Math.random() * Math.PI * 2;
  for (let i = 0; i < 4; i++) {
    const angle = baseAngle + (i * Math.PI / 2);
    const startX = player.x + Math.cos(angle) * 200;
    const startY = player.y + Math.sin(angle) * 200;
    const dir = Math.atan2(player.y - startY, player.x - startX);
    bullets.push({
      id: nextBulletId++, x: startX, y: startY,
      vx: Math.cos(dir) * 5, vy: Math.sin(dir) * 5,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.7 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#cc2244', life: 120,
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  m._abilityCDs.shard_of_betrayal = 420;
  return {};
};

// Blood Siphon — drain player hp, heal self
MOB_SPECIALS.blood_siphon = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 250) return {};
  const dmg = Math.round(m.damage * 0.8 * getMobDamageMultiplier());
  const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
  const healAmt = Math.round(dealt * 0.5);
  m.hp = Math.min(m.maxHp, m.hp + healAmt);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
  m._abilityCDs.blood_siphon = 480;
  return {};
};

// Bone Guard — summon bone shield (dmg reduction)
MOB_SPECIALS.bone_guard = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._boneGuardTimer && m._boneGuardTimer > 0) {
    m._boneGuardTimer--;
    m._shielded = true;
    if (m._boneGuardTimer <= 0) m._shielded = false;
    return {};
  }
  m._boneGuardTimer = 240;
  m._shielded = true;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "BONE GUARD!" });
  m._abilityCDs.bone_guard = 600;
  return {};
};

// Demonic Shift — teleport + aoe burst at destination
MOB_SPECIALS.demonic_shift = (m, ctx) => {
  const { player, hitEffects } = ctx;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "afterimage" });
  const angle = Math.atan2(player.y - m.y, player.x - m.x);
  const tx = player.x + Math.cos(angle + Math.PI) * 60;
  const ty = player.y + Math.sin(angle + Math.PI) * 60;
  if (positionClear(tx, ty)) { m.x = tx; m.y = ty; }
  hitEffects.push({ x: m.x, y: m.y, life: 25, type: "explosion" });
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100, player)) {
    const dmg = Math.round(m.damage * 1.2 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  }
  m._abilityCDs.demonic_shift = 480;
  return {};
};

// ===================== BOSS SPECIALS: WOLFBEARD =====================

// Quick Draw — instant shot at player
MOB_SPECIALS.quick_draw = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 10,
    vx: Math.cos(dir) * 13, vy: Math.sin(dir) * 13,
    fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 1.0 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#ffaa33',
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 10, type: "cast" });
  m._abilityCDs.quick_draw = 240;
  return {};
};

// Feral Slash — fast cone melee
MOB_SPECIALS.feral_slash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 100) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 100, player)) {
    const dmg = Math.round(m.damage * 1.3 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('bleed', { duration: 120, dmg: Math.round(m.damage * 0.1) });
  }
  m._abilityCDs.feral_slash = 300;
  return {};
};

// Predator Dash — fast dash through player
MOB_SPECIALS.predator_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._predDashing) {
    m._predTimer--;
    const t = 1 - (m._predTimer / 12);
    m.x = m._predSX + (m._predTX - m._predSX) * t;
    m.y = m._predSY + (m._predTY - m._predSY) * t;
    if (m._predTimer % 3 === 0) hitEffects.push({ x: m.x, y: m.y - 10, life: 10, type: "afterimage" });
    if (m._predTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m._predSX, m._predSY, m.x, m.y, 32, player)) {
        const dmg = Math.round(m.damage * 1.2 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._predDashing = false;
      m._abilityCDs.predator_dash = 360;
    }
    return { skip: true };
  }
  if (dist > 350 || dist < 40) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 280);
  m._predSX = m.x; m._predSY = m.y;
  m._predTX = clamped.x; m._predTY = clamped.y;
  m._predDashing = true; m._predTimer = 12;
  return { skip: true };
};

// Hunter's Mark — mark player for +25% damage taken
MOB_SPECIALS.hunters_mark = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 400) return {};
  StatusFX.applyToPlayer('mark', { duration: 300, bonus: 0.25 });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "mark" });
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  m._abilityCDs.hunters_mark = 600;
  return {};
};

// Howl of Terror — aoe fear + slow all
MOB_SPECIALS.howl_of_terror = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 220, player)) {
    StatusFX.applyToPlayer('slow', { amount: 0.5, duration: 120 });
    const pushDir = Math.atan2(player.y - m.y, player.x - m.x);
    const nx = player.x + Math.cos(pushDir) * 100;
    const ny = player.y + Math.sin(pushDir) * 100;
    if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
    hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "TERROR!" });
  }
  hitEffects.push({ x: m.x, y: m.y - 25, life: 25, type: "cast" });
  m._abilityCDs.howl_of_terror = 660;
  return {};
};

// Pack Instinct — buff self speed when allies nearby
MOB_SPECIALS.pack_instinct = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  let nearbyCount = 0;
  for (const ally of mobs) {
    if (ally.hp <= 0 || ally.id === m.id) continue;
    const dx = ally.x - m.x, dy = ally.y - m.y;
    if (dx * dx + dy * dy <= 200 * 200) nearbyCount++;
  }
  if (nearbyCount < 1) return {};
  if (!m._piOrigSpd) m._piOrigSpd = m.speed;
  m.speed = m._piOrigSpd * (1 + nearbyCount * 0.15);
  m._piBuffTimer = 300;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "buff" });
  m._abilityCDs.pack_instinct = 480;
  return {};
};

// Silver Fang Strike — heavy single-target hit with bleed
MOB_SPECIALS.silver_fang_strike = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._silverTele) {
    m._silverTele--;
    if (m._silverTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
        const dmg = Math.round(m.damage * 2.0 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('bleed', { duration: 240, dmg: Math.round(m.damage * 0.15) });
      }
      m._abilityCDs.silver_fang_strike = 480;
    }
    return { skip: true };
  }
  if (dist > 100) return {};
  m._silverTele = 10;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 70 }, delayFrames: 10, color: [200, 200, 220], owner: m.id });
  }
  return { skip: true };
};

// Alpha Rampage — 3 rapid dashes in sequence
MOB_SPECIALS.alpha_rampage = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._rampageDashing) {
    m._rampageTimer--;
    const t = 1 - (m._rampageTimer / 10);
    m.x = m._rampSX + (m._rampTX - m._rampSX) * t;
    m.y = m._rampSY + (m._rampTY - m._rampSY) * t;
    if (m._rampageTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40, player)) {
        const dmg = Math.round(m.damage * 0.8 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
      }
      m._rampageDashes++;
      if (m._rampageDashes < 3) {
        const dir = Math.atan2(player.y - m.y, player.x - m.x);
        const clamped = clampDashTarget(m.x, m.y, dir, 150);
        m._rampSX = m.x; m._rampSY = m.y;
        m._rampTX = clamped.x; m._rampTY = clamped.y;
        m._rampageTimer = 10;
      } else {
        m._rampageDashing = false;
        m._abilityCDs.alpha_rampage = 600;
      }
    }
    return { skip: true };
  }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 150);
  m._rampSX = m.x; m._rampSY = m.y;
  m._rampTX = clamped.x; m._rampTY = clamped.y;
  m._rampageDashing = true; m._rampageTimer = 10; m._rampageDashes = 0;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "RAMPAGE!" });
  return { skip: true };
};

// ===================== BOSS SPECIALS: GHOSTBEARD =====================

// Phantom Slash — teleport-slash combo
MOB_SPECIALS.phantom_slash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 300) return {};
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "afterimage" });
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const tx = player.x - Math.cos(dir) * 40;
  const ty = player.y - Math.sin(dir) * 40;
  if (positionClear(tx, ty)) { m.x = tx; m.y = ty; }
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
    const dmg = Math.round(m.damage * 1.4 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "afterimage" });
  m._abilityCDs.phantom_slash = 360;
  return {};
};

// Ghost Dash — phase through walls dash
MOB_SPECIALS.ghost_dash = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._ghostDashing) {
    m._ghostDashTimer--;
    const t = 1 - (m._ghostDashTimer / 16);
    m.x = m._gdSX + (m._gdTX - m._gdSX) * t;
    m.y = m._gdSY + (m._gdTY - m._gdSY) * t;
    if (m._ghostDashTimer % 3 === 0) hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "afterimage" });
    if (m._ghostDashTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(m.damage * 1.0 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
      }
      m._ghostDashing = false;
      m._abilityCDs.ghost_dash = 420;
    }
    return { skip: true };
  }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._gdSX = m.x; m._gdSY = m.y;
  m._gdTX = player.x + Math.cos(dir) * 40;
  m._gdTY = player.y + Math.sin(dir) * 40;
  m._ghostDashing = true; m._ghostDashTimer = 16;
  return { skip: true };
};

// Haunted Cutlass — cursed melee, applies mark
MOB_SPECIALS.haunted_cutlass = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 90) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 90, player)) {
    const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    StatusFX.applyToPlayer('mark', { duration: 240, bonus: 0.2 });
    hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "mark" });
  }
  m._abilityCDs.haunted_cutlass = 360;
  return {};
};

// Spirit Shield — ghostly barrier absorbs damage
MOB_SPECIALS.spirit_shield = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._spiritShieldTimer && m._spiritShieldTimer > 0) {
    m._spiritShieldTimer--;
    m._shielded = true;
    if (m._spiritShieldTimer <= 0) m._shielded = false;
    return {};
  }
  m._spiritShieldTimer = 180;
  m._shielded = true;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "SPIRIT SHIELD!" });
  m._abilityCDs.spirit_shield = 540;
  return {};
};

// Cursed Mark — applies long-duration mark + slow
MOB_SPECIALS.cursed_mark = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 350) return {};
  StatusFX.applyToPlayer('mark', { duration: 360, bonus: 0.2 });
  StatusFX.applyToPlayer('slow', { amount: 0.25, duration: 120 });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "mark" });
  hitEffects.push({ x: player.x, y: player.y - 45, life: 30, maxLife: 30, type: "heal", dmg: "CURSED!" });
  m._abilityCDs.cursed_mark = 600;
  return {};
};

// Spectral Crew — summon ghost pirates
MOB_SPECIALS.spectral_crew = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  const active = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
  if (active >= 3) return {};
  for (let i = 0; i < 2; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sx = m.x + Math.cos(angle) * 80;
    const sy = m.y + Math.sin(angle) * 80;
    if (!positionClear(sx, sy)) continue;
    mobs.push({
      x: sx, y: sy, type: 'ghost_pirate', id: nextMobId++,
      hp: Math.round(m.maxHp * 0.1), maxHp: Math.round(m.maxHp * 0.1),
      speed: 2.1, damage: Math.round(m.damage * 0.3),
      contactRange: 28, skin: '#aabbcc', hair: '#667788', shirt: '#556677', pants: '#445566',
      name: 'Ghost Pirate', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 0.8, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    });
    hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "CREW!" });
  m._abilityCDs.spectral_crew = 840;
  return {};
};

// Soul Drain — aoe lifesteal
MOB_SPECIALS.soul_drain = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._soulDrainTele) {
    m._soulDrainTele--;
    if (m._soulDrainTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 140, player)) {
        const dmg = Math.round(m.damage * 1.0 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        const healAmt = Math.round(dealt * 0.4);
        m.hp = Math.min(m.maxHp, m.hp + healAmt);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
      }
      m._abilityCDs.soul_drain = 540;
    }
    return { skip: true };
  }
  m._soulDrainTele = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 140 }, delayFrames: 24, color: [120, 80, 180], owner: m.id });
  }
  return { skip: true };
};

// Ghost Ship — spectral cannon barrage (5 line telegraphs)
MOB_SPECIALS.ghost_ship = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._ghostShipTele) {
    m._ghostShipTele--;
    if (m._ghostShipTele <= 0) m._abilityCDs.ghost_ship = 720;
    return {};
  }
  const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
  for (let i = 0; i < 5; i++) {
    const angle = baseDir - Math.PI / 6 + (i / 4) * (Math.PI / 3);
    const x2 = m.x + Math.cos(angle) * 350;
    const y2 = m.y + Math.sin(angle) * 350;
    const capturedX1 = m.x, capturedY1 = m.y, capturedX2 = x2, capturedY2 = y2;
    const capturedM = m;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line', params: { x1: m.x, y1: m.y, x2: x2, y2: y2, width: 30 },
        delayFrames: 30 + i * 6, color: [130, 160, 200], owner: m.id,
        onResolve: () => {
          if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(capturedX1, capturedY1, capturedX2, capturedY2, 30, player)) {
            const dmg = Math.round(capturedM.damage * 0.8 * getMobDamageMultiplier());
            dealDamageToPlayer(dmg, 'mob_special', capturedM);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
          }
        },
      });
    }
  }
  m._ghostShipTele = 60;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "GHOST SHIP!" });
  return {};
};

// ===================== BOSS SPECIALS: KRAKEN JIM (Floor 4A) =====================

// Tentacle Grab — line telegraph toward player, pull + root
MOB_SPECIALS.tentacle_grab = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._tGrabTele > 0) {
    m._tGrabTele--;
    if (m._tGrabTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m.x, m.y, m._tGrabX2, m._tGrabY2, 36, player)) {
        const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
        const nx = player.x + Math.cos(pullDir) * 100;
        const ny = player.y + Math.sin(pullDir) * 100;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
        const dmg = Math.round(m.damage * 1.0 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg });
        StatusFX.applyToPlayer('root', { duration: 48 });
      }
    }
    return { skip: true };
  }
  if (dist > 300) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._tGrabX2 = m.x + Math.cos(dir) * 250;
  m._tGrabY2 = m.y + Math.sin(dir) * 250;
  m._tGrabTele = 18;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: m._tGrabX2, y2: m._tGrabY2, width: 36 }, delayFrames: 18, color: [40, 120, 80], owner: m.id });
  }
  return { skip: true };
};

// Coral Armor — self buff, 50% damage reduction for 3s
MOB_SPECIALS.coral_armor = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._coralArmor > 0) { m._coralArmor--; return {}; }
  m._coralArmor = 180;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "ARMOR!" });
  return {};
};

// Ink Blast — circle telegraph on self, damage + blind
MOB_SPECIALS.ink_blast = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._iBlastTele > 0) {
    m._iBlastTele--;
    if (m._iBlastTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120, player)) {
        const dmg = Math.round(m.damage * 0.7 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg });
        StatusFX.applyToPlayer('blind', { duration: 120 });
      }
    }
    return { skip: true };
  }
  m._iBlastTele = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 120 }, delayFrames: 20, color: [30, 30, 50], owner: m.id });
  }
  return { skip: true };
};

// Tidal Slam — heavy AoE circle on self, damage + stun
MOB_SPECIALS.tidal_slam = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._tSlamTele > 0) {
    m._tSlamTele--;
    if (m._tSlamTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 140, player)) {
        const dmg = Math.round(m.damage * 1.6 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 30 });
      }
    }
    return { skip: true };
  }
  m._tSlamTele = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 140 }, delayFrames: 24, color: [40, 100, 180], owner: m.id });
  }
  return { skip: true };
};

// Barnacle Trap Boss — place 3 sticky traps near player
MOB_SPECIALS.barnacle_trap_boss = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (!m._bTraps) m._bTraps = [];
  // Tick existing traps
  for (let i = m._bTraps.length - 1; i >= 0; i--) {
    const t = m._bTraps[i];
    t.life--;
    if (t.life <= 0) { m._bTraps.splice(i, 1); continue; }
    if (t.arm > 0) { t.arm--; continue; }
    const dx = player.x - t.x, dy = player.y - t.y;
    if (dx * dx + dy * dy <= 40 * 40) {
      StatusFX.applyToPlayer('root', { duration: 48 });
      const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
      dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: t.x, y: t.y, life: 20, type: "explosion" });
      m._bTraps.splice(i, 1);
    }
  }
  // Place 3 traps
  for (let i = 0; i < 3; i++) {
    const ox = (Math.random() - 0.5) * 120;
    const oy = (Math.random() - 0.5) * 120;
    m._bTraps.push({ x: player.x + ox, y: player.y + oy, life: 600, arm: 30 });
    hitEffects.push({ x: player.x + ox, y: player.y + oy - 10, life: 15, type: "mine_drop" });
  }
  return {};
};

// Ocean Regen — passive heal when hp low
MOB_SPECIALS.ocean_regen = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._oceanRegenTimer && m._oceanRegenTimer > 0) {
    m._oceanRegenTimer--;
    if (m._oceanRegenTimer % 30 === 0) {
      const healAmt = Math.round(m.maxHp * 0.02);
      m.hp = Math.min(m.maxHp, m.hp + healAmt);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
    }
    return {};
  }
  if (m.hp > m.maxHp * 0.4) return {};
  m._oceanRegenTimer = 300;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 40, life: 30, maxLife: 30, type: "heal", dmg: "OCEAN REGEN!" });
  m._abilityCDs.ocean_regen = 720;
  return {};
};

// Deep Sea Strike — dash from below (teleport + burst)
MOB_SPECIALS.deep_sea_strike = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._deepSeaTele) {
    m._deepSeaTele--;
    if (m._deepSeaTele <= 0) {
      m.x = m._deepSeaX; m.y = m._deepSeaY;
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "explosion" });
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100, player)) {
        const dmg = Math.round(m.damage * 1.6 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 18 });
      }
      m._abilityCDs.deep_sea_strike = 480;
    }
    return { skip: true };
  }
  m._deepSeaX = player.x; m._deepSeaY = player.y;
  m._deepSeaTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._deepSeaX, cy: m._deepSeaY, radius: 100 }, delayFrames: 30, color: [20, 60, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "afterimage" });
  return { skip: true };
};

// Kraken Call — summon tentacle mobs
MOB_SPECIALS.kraken_call = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  const active = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
  if (active >= 4) return {};
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
    const sx = m.x + Math.cos(angle) * 100;
    const sy = m.y + Math.sin(angle) * 100;
    if (!positionClear(sx, sy)) continue;
    mobs.push({
      x: sx, y: sy, type: 'kraken_tentacle', id: nextMobId++,
      hp: Math.round(m.maxHp * 0.08), maxHp: Math.round(m.maxHp * 0.08),
      speed: 1.1, damage: Math.round(m.damage * 0.3),
      contactRange: 36, skin: '#446644', hair: '#335533', shirt: '#224422', pants: '#113311',
      name: 'Tentacle', dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: 0, summonMax: 0, summonTimer: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      _specials: ['tentacle_bind'], _specialTimer: 60, _specialCD: 300, _abilityCDs: {},
      _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
      _summonOwnerId: m.id, scale: 0.7, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    });
    hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
  }
  hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "KRAKEN CALL!" });
  m._abilityCDs.kraken_call = 900;
  return {};
};

// ===================== BOSS SPECIALS: KING REQUILL =====================

// Deepsea Decapitation — massive frontal cleave
MOB_SPECIALS.deepsea_decapitation = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._decapTele) {
    m._decapTele--;
    if (m._decapTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 160, player)) {
        const dmg = Math.round(m.damage * 2.0 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._abilityCDs.deepsea_decapitation = 420;
    }
    return { skip: true };
  }
  if (dist > 200) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._decapTele = 18;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 120, range: 160 }, delayFrames: 18, color: [200, 160, 40], owner: m.id });
  }
  return { skip: true };
};

// Coiling Constriction — pull + root + dot
MOB_SPECIALS.coiling_constriction = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (dist > 300) return {};
  const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
  const pullDist = dist * 0.5;
  const nx = player.x + Math.cos(pullDir) * pullDist;
  const ny = player.y + Math.sin(pullDir) * pullDist;
  if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
  StatusFX.applyToPlayer('root', { duration: 60 });
  StatusFX.applyToPlayer('bleed', { duration: 180, dmg: Math.round(m.damage * 0.12) });
  const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
  dealDamageToPlayer(dmg, 'mob_special', m);
  hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
  hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
  m._abilityCDs.coiling_constriction = 540;
  return {};
};

// Gilded Maelstrom — spinning projectile ring expanding outward
MOB_SPECIALS.gilded_maelstrom = (m, ctx) => {
  const { hitEffects, bullets } = ctx;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 3.6, vy: Math.sin(angle) * 3.6,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ffd700', life: 120,
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
  m._abilityCDs.gilded_maelstrom = 480;
  return {};
};

// Pressure Zone Boss — large persistent slow+dmg zone
MOB_SPECIALS.pressure_zone_boss = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: player.x, cy: player.y, radius: 140, duration: 360,
      tickRate: 45, tickDamage: Math.round(m.damage * 0.4 * getMobDamageMultiplier()),
      color: [30, 60, 100], slow: 0.5,
    });
  }
  hitEffects.push({ x: player.x, y: player.y, life: 25, type: "cast" });
  hitEffects.push({ x: player.x, y: player.y - 20, life: 30, maxLife: 30, type: "heal", dmg: "PRESSURE!" });
  m._abilityCDs.pressure_zone_boss = 600;
  return {};
};

// Silt Cloud — blind zone at player
MOB_SPECIALS.silt_cloud = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: player.x, cy: player.y, radius: 100, duration: 240,
      tickRate: 999, tickDamage: 0, color: [120, 100, 60], slow: 0.2,
    });
  }
  StatusFX.applyToPlayer('blind', { duration: 60 });
  hitEffects.push({ x: player.x, y: player.y, life: 25, type: "smoke" });
  m._abilityCDs.silt_cloud = 480;
  return {};
};

// Abyssal Roar — massive aoe fear + damage
MOB_SPECIALS.abyssal_roar = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._abyssRoarTele) {
    m._abyssRoarTele--;
    if (m._abyssRoarTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 250, player)) {
        const dmg = Math.round(m.damage * 1.0 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { amount: 0.5, duration: 120 });
        const pushDir = Math.atan2(player.y - m.y, player.x - m.x);
        const nx = player.x + Math.cos(pushDir) * 120;
        const ny = player.y + Math.sin(pushDir) * 120;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, maxLife: 30, type: "heal", dmg: "FEAR!" });
      }
      m._abilityCDs.abyssal_roar = 660;
    }
    return { skip: true };
  }
  m._abyssRoarTele = 28;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 250 }, delayFrames: 28, color: [80, 40, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// Golden Retribution — counter attack when hit recently
MOB_SPECIALS.golden_retribution = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m.hp >= m._lastRetribHp || 0) { m._lastRetribHp = m.hp; return {}; }
  const hpLost = (m._lastRetribHp || m.hp) - m.hp;
  m._lastRetribHp = m.hp;
  if (hpLost < m.maxHp * 0.05) return {};
  // Counter: 8 gold projectiles
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 8,
      vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.5 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ffd700',
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
  m._abilityCDs.golden_retribution = 300;
  return {};
};

// Reign of Deep — water pillars across arena
MOB_SPECIALS.reign_of_deep = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._reignTele) {
    m._reignTele--;
    if (m._reignTele <= 0) m._abilityCDs.reign_of_deep = 720;
    return {};
  }
  // 5 random circle telegraphs near player
  for (let i = 0; i < 5; i++) {
    const ox = (Math.random() - 0.5) * 300;
    const oy = (Math.random() - 0.5) * 300;
    const tx = player.x + ox, ty = player.y + oy;
    const capturedX = tx, capturedY = ty, capturedM = m;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle', params: { cx: tx, cy: ty, radius: 64 },
        delayFrames: 36 + i * 8, color: [40, 100, 180], owner: m.id,
        onResolve: () => {
          if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(capturedX, capturedY, 64, player)) {
            const dmg = Math.round(capturedM.damage * 1.0 * getMobDamageMultiplier());
            dealDamageToPlayer(dmg, 'mob_special', capturedM);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
          }
          hitEffects.push({ x: capturedX, y: capturedY, life: 25, type: "explosion" });
        },
      });
    }
  }
  m._reignTele = 76;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "REIGN!" });
  return {};
};

// ===================== BOSS SPECIALS: QUEEN SIRALYTH =====================

// Golden Shard Volley — 10 golden projectiles in spiral
MOB_SPECIALS.golden_shard_volley = (m, ctx) => {
  const { hitEffects, bullets } = ctx;
  if (m._gsvFiring) {
    m._gsvFrame++;
    if (m._gsvFrame % 3 === 0 && m._gsvShots < 10) {
      const angle = m._gsvBaseAngle + m._gsvShots * (Math.PI / 5);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 10,
        vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
        fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.5 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ffd700', life: 150,
      });
      m._gsvShots++;
    }
    if (m._gsvShots >= 10) {
      m._gsvFiring = false;
      m._abilityCDs.golden_shard_volley = 420;
    }
    return { skip: true };
  }
  m._gsvFiring = true; m._gsvFrame = 0; m._gsvShots = 0;
  m._gsvBaseAngle = Math.random() * Math.PI * 2;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// Abyssal Maw — large circle telegraph, heavy dmg
MOB_SPECIALS.abyssal_maw = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._mawTele) {
    m._mawTele--;
    if (m._mawTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._mawX, m._mawY, 120, player)) {
        const dmg = Math.round(m.damage * 2.0 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('slow', { amount: 0.4, duration: 90 });
      }
      hitEffects.push({ x: m._mawX, y: m._mawY, life: 30, type: "explosion" });
      m._abilityCDs.abyssal_maw = 480;
    }
    return {};
  }
  m._mawX = player.x; m._mawY = player.y;
  m._mawTele = 28;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._mawX, cy: m._mawY, radius: 120 }, delayFrames: 28, color: [60, 20, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  return {};
};

// Coral Aegis — summon coral shield + reflect
MOB_SPECIALS.coral_aegis = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._coralAegisTimer && m._coralAegisTimer > 0) {
    m._coralAegisTimer--;
    m._shielded = true;
    m._reflecting = true;
    if (m._coralAegisTimer <= 0) { m._shielded = false; m._reflecting = false; }
    return {};
  }
  m._coralAegisTimer = 180;
  m._shielded = true;
  m._reflecting = true;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "CORAL AEGIS!" });
  m._abilityCDs.coral_aegis = 600;
  return {};
};

// Royal Gilded Beam — long line telegraph
MOB_SPECIALS.royal_gilded_beam = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._gildedBeamTele) {
    m._gildedBeamTele--;
    if (m._gildedBeamTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m.x, m.y, m._gbX2, m._gbY2, 40, player)) {
        const dmg = Math.round(m.damage * 1.8 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      // Leave burn trail
      if (typeof HazardSystem !== 'undefined') {
        const dx = m._gbX2 - m.x, dy = m._gbY2 - m.y;
        for (let i = 1; i <= 3; i++) {
          const t = i / 4;
          HazardSystem.createZone({ cx: m.x + dx * t, cy: m.y + dy * t, radius: 40, duration: 180, tickRate: 30, tickDamage: Math.round(m.damage * 0.3 * getMobDamageMultiplier()), color: [200, 170, 40], slow: 0 });
        }
      }
      m._abilityCDs.royal_gilded_beam = 480;
    }
    return { skip: true };
  }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._gbX2 = m.x + Math.cos(dir) * 400;
  m._gbY2 = m.y + Math.sin(dir) * 400;
  m._gildedBeamTele = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: m._gbX2, y2: m._gbY2, width: 40 }, delayFrames: 24, color: [220, 180, 50], owner: m.id });
  }
  return { skip: true };
};

// Tidal Surge — wave push across arena
MOB_SPECIALS.tidal_surge = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._surgeTele) {
    m._surgeTele--;
    if (m._surgeTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m._surgeX1, m._surgeY1, m._surgeX2, m._surgeY2, 80, player)) {
        const dmg = Math.round(m.damage * 1.2 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
        const pushDir = Math.atan2(m._surgeY2 - m._surgeY1, m._surgeX2 - m._surgeX1);
        const nx = player.x + Math.cos(pushDir) * 100;
        const ny = player.y + Math.sin(pushDir) * 100;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
      }
      m._abilityCDs.tidal_surge = 540;
    }
    return {};
  }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._surgeX1 = m.x; m._surgeY1 = m.y;
  m._surgeX2 = m.x + Math.cos(dir) * 400;
  m._surgeY2 = m.y + Math.sin(dir) * 400;
  m._surgeTele = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m._surgeX1, y1: m._surgeY1, x2: m._surgeX2, y2: m._surgeY2, width: 80 }, delayFrames: 24, color: [60, 140, 200], owner: m.id });
  }
  return {};
};

// Sovereign's Cage — ring of hazards trapping player
MOB_SPECIALS.sovereigns_cage = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (typeof HazardSystem !== 'undefined') {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const zx = player.x + Math.cos(angle) * 120;
      const zy = player.y + Math.sin(angle) * 120;
      HazardSystem.createZone({
        cx: zx, cy: zy, radius: 36, duration: 300,
        tickRate: 30, tickDamage: Math.round(m.damage * 0.3 * getMobDamageMultiplier()),
        color: [180, 150, 40], slow: 0.5,
      });
    }
  }
  hitEffects.push({ x: player.x, y: player.y, life: 25, type: "cast" });
  hitEffects.push({ x: player.x, y: player.y - 20, life: 30, maxLife: 30, type: "heal", dmg: "CAGED!" });
  m._abilityCDs.sovereigns_cage = 660;
  return {};
};

// Blessing of Deep — heal self + buff
MOB_SPECIALS.blessing_of_deep = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._blessTimer && m._blessTimer > 0) {
    m._blessTimer--;
    if (m._blessTimer % 40 === 0) {
      const healAmt = Math.round(m.maxHp * 0.03);
      m.hp = Math.min(m.maxHp, m.hp + healAmt);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
    }
    return {};
  }
  if (m.hp > m.maxHp * 0.5) return {};
  m._blessTimer = 240;
  if (!m._blessOrigSpd) m._blessOrigSpd = m.speed;
  m.speed = m._blessOrigSpd * 1.3;
  hitEffects.push({ x: m.x, y: m.y - 30, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 45, life: 30, maxLife: 30, type: "heal", dmg: "BLESSED!" });
  m._abilityCDs.blessing_of_deep = 720;
  return {};
};

// Reign of Gilded Reef — spawns coral zones + golden projectile burst
MOB_SPECIALS.reign_gilded_reef = (m, ctx) => {
  const { player, hitEffects, bullets } = ctx;
  // Coral zones
  if (typeof HazardSystem !== 'undefined') {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      const d = 80 + Math.random() * 150;
      HazardSystem.createZone({
        cx: player.x + Math.cos(angle) * d, cy: player.y + Math.sin(angle) * d,
        radius: 48, duration: 300, tickRate: 45,
        tickDamage: Math.round(m.damage * 0.25 * getMobDamageMultiplier()),
        color: [200, 140, 80], slow: 0.3,
      });
    }
  }
  // Burst 10 golden bullets
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    bullets.push({
      id: nextBulletId++, x: m.x, y: m.y - 10,
      vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5,
      fromPlayer: false, mobBullet: true, damage: Math.round(m.damage * 0.4 * getMobDamageMultiplier()),
      ownerId: m.id, bulletColor: '#ffcc44', life: 120,
    });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "GILDED REEF!" });
  m._abilityCDs.reign_gilded_reef = 660;
  return {};
};

// ===================== BOSS SPECIALS: MAMI WATA =====================

// Leviathan's Fang — serpentine dash + heavy hit
MOB_SPECIALS.leviathans_fang = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._levFangDashing) {
    m._levFangTimer--;
    const t = 1 - (m._levFangTimer / 20);
    const baseX = m._lfSX + (m._lfTX - m._lfSX) * t;
    const baseY = m._lfSY + (m._lfTY - m._lfSY) * t;
    const wiggle = Math.sin(t * Math.PI * 6) * 40;
    const perpDir = m._lfDir + Math.PI / 2;
    m.x = baseX + Math.cos(perpDir) * wiggle;
    m.y = baseY + Math.sin(perpDir) * wiggle;
    if (m._levFangTimer % 4 === 0) hitEffects.push({ x: m.x, y: m.y - 10, life: 10, type: "afterimage" });
    if (m._levFangTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(m.damage * 2.0 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('bleed', { duration: 240, dmg: Math.round(m.damage * 0.15) });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "explosion" });
      m._levFangDashing = false;
      m._abilityCDs.leviathans_fang = 480;
    }
    return { skip: true };
  }
  if (dist > 400) return {};
  m._lfDir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, m._lfDir, Math.min(dist + 40, 320));
  m._lfSX = m.x; m._lfSY = m.y;
  m._lfTX = clamped.x; m._lfTY = clamped.y;
  m._levFangDashing = true; m._levFangTimer = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 44 }, delayFrames: 12, color: [40, 180, 140], owner: m.id });
  }
  return { skip: true };
};

// Serpent's Strike — fast line telegraph + poison
MOB_SPECIALS.serpents_strike = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._serpStrikeTele) {
    m._serpStrikeTele--;
    if (m._serpStrikeTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m.x, m.y, m._ssX2, m._ssY2, 32, player)) {
        const dmg = Math.round(m.damage * 1.4 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('poison', { duration: 180, dmg: Math.round(m.damage * 0.12) });
      }
      m._abilityCDs.serpents_strike = 360;
    }
    return { skip: true };
  }
  if (dist > 300) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._ssX2 = m.x + Math.cos(dir) * 240;
  m._ssY2 = m.y + Math.sin(dir) * 240;
  m._serpStrikeTele = 14;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: m._ssX2, y2: m._ssY2, width: 32 }, delayFrames: 14, color: [80, 200, 120], owner: m.id });
  }
  return { skip: true };
};

// Tidal Trample — charge through player with water trail
MOB_SPECIALS.tidal_trample = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._trampleDashing) {
    m._trampleTimer--;
    const t = 1 - (m._trampleTimer / 18);
    m.x = m._trSX + (m._trTX - m._trSX) * t;
    m.y = m._trSY + (m._trTY - m._trSY) * t;
    if (m._trampleTimer % 4 === 0 && typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({ cx: m.x, cy: m.y, radius: 32, duration: 180, tickRate: 999, tickDamage: 0, color: [50, 120, 200], slow: 0.35 });
    }
    if (m._trampleTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine(m._trSX, m._trSY, m.x, m.y, 40, player)) {
        const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
        StatusFX.applyToPlayer('stun', { duration: 24 });
      }
      m._trampleDashing = false;
      m._abilityCDs.tidal_trample = 480;
    }
    return { skip: true };
  }
  if (dist > 400 || dist < 60) return {};
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, 300);
  m._trSX = m.x; m._trSY = m.y;
  m._trTX = clamped.x; m._trTY = clamped.y;
  m._trampleDashing = true; m._trampleTimer = 18;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: clamped.x, y2: clamped.y, width: 40 }, delayFrames: 10, color: [50, 140, 200], owner: m.id });
  }
  return { skip: true };
};

// Abyssal Undertow MW — enhanced pull + damage zone
MOB_SPECIALS.abyssal_undertow_mw = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._mwUndertowTele) {
    m._mwUndertowTele--;
    if (m._mwUndertowTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
        const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
        const nx = player.x + Math.cos(pullDir) * 120;
        const ny = player.y + Math.sin(pullDir) * 120;
        if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
        const dmg = Math.round(m.damage * 1.0 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { amount: 0.5, duration: 120 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
      }
      if (typeof HazardSystem !== 'undefined') {
        HazardSystem.createZone({ cx: m.x, cy: m.y, radius: 200, duration: 240, tickRate: 60, tickDamage: Math.round(m.damage * 0.3 * getMobDamageMultiplier()), color: [30, 70, 130], slow: 0.4 });
      }
      m._abilityCDs.abyssal_undertow_mw = 540;
    }
    return {};
  }
  m._mwUndertowTele = 24;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 24, color: [30, 70, 130], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return {};
};

// Divine Deluge — rain of water circles across arena
MOB_SPECIALS.divine_deluge = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._delugeTele) {
    m._delugeTele--;
    if (m._delugeTele <= 0) m._abilityCDs.divine_deluge = 600;
    return {};
  }
  // 6 staggered circle telegraphs
  for (let i = 0; i < 6; i++) {
    const ox = (Math.random() - 0.5) * 350;
    const oy = (Math.random() - 0.5) * 350;
    const tx = player.x + ox, ty = player.y + oy;
    const capturedX = tx, capturedY = ty, capturedM = m;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle', params: { cx: tx, cy: ty, radius: 72 },
        delayFrames: 30 + i * 10, color: [50, 130, 200], owner: m.id,
        onResolve: () => {
          if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(capturedX, capturedY, 72, player)) {
            const dmg = Math.round(capturedM.damage * 0.9 * getMobDamageMultiplier());
            dealDamageToPlayer(dmg, 'mob_special', capturedM);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
          }
          hitEffects.push({ x: capturedX, y: capturedY, life: 25, type: "explosion" });
        },
      });
    }
  }
  m._delugeTele = 90;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "heal", dmg: "DELUGE!" });
  return {};
};

// Oceanic Domain — massive water zone + self-heal + speed
MOB_SPECIALS.oceanic_domain = (m, ctx) => {
  const { hitEffects } = ctx;
  if (m._domainTimer && m._domainTimer > 0) {
    m._domainTimer--;
    if (m._domainTimer % 60 === 0) {
      const healAmt = Math.round(m.maxHp * 0.02);
      m.hp = Math.min(m.maxHp, m.hp + healAmt);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 18, type: "heal", dmg: "+" + healAmt });
    }
    if (m._domainTimer <= 0 && m._domainOrigSpd) {
      m.speed = m._domainOrigSpd;
    }
    return {};
  }
  if (typeof HazardSystem !== 'undefined') {
    HazardSystem.createZone({
      cx: m.x, cy: m.y, radius: 250, duration: 360,
      tickRate: 45, tickDamage: Math.round(m.damage * 0.2 * getMobDamageMultiplier()),
      color: [40, 100, 170], slow: 0.3,
    });
  }
  m._domainOrigSpd = m.speed;
  m.speed *= 1.4;
  m._domainTimer = 360;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "buff" });
  hitEffects.push({ x: m.x, y: m.y - 40, life: 30, maxLife: 30, type: "heal", dmg: "OCEANIC DOMAIN!" });
  m._abilityCDs.oceanic_domain = 900;
  return {};
};

// Wrath of Sea — ultimate: multi-wave attack (3 expanding rings + pull)
MOB_SPECIALS.wrath_of_sea = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._wrathPhase) {
    m._wrathPhaseTimer--;
    if (m._wrathPhaseTimer <= 0) {
      m._wrathPhase = false;
      m._abilityCDs.wrath_of_sea = 900;
    }
    return { skip: true };
  }
  // Create 3 rings at staggered delays
  const radii = [100, 180, 260];
  for (let i = 0; i < 3; i++) {
    const capturedR = radii[i], capturedM = m;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle', params: { cx: m.x, cy: m.y, radius: capturedR },
        delayFrames: 20 + i * 16, color: [40, 120, 200], owner: m.id,
        onResolve: () => {
          if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(capturedM.x, capturedM.y, capturedR, player)) {
            const dmg = Math.round(capturedM.damage * (1.2 - i * 0.2) * getMobDamageMultiplier());
            dealDamageToPlayer(dmg, 'mob_special', capturedM);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
          }
          hitEffects.push({ x: capturedM.x, y: capturedM.y, life: 25, type: "explosion" });
        },
      });
    }
  }
  // Pull player toward center after all rings
  const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
  const nx = player.x + Math.cos(pullDir) * 60;
  const ny = player.y + Math.sin(pullDir) * 60;
  if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
  m._wrathPhase = true;
  m._wrathPhaseTimer = 68;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  hitEffects.push({ x: m.x, y: m.y - 40, life: 30, maxLife: 30, type: "heal", dmg: "WRATH OF SEA!" });
  return { skip: true };
};