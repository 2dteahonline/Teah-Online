// ===================== WAGASHI: HEAVENLY REALM MOB SPECIALS (PART 2) =====================
// Dungeon 5 — Floor 3+4 specials.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 3 REGULAR SPECIALS =====================

// 1. Static Lunge — lightning-charged spear thrust forward (tempest_spearman)
MOB_SPECIALS.static_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  // Dash phase
  if (m._staticDashing) {
    m._staticTimer--;
    const t = 1 - (m._staticTimer / 16);
    m.x = m._staticSX + (m._staticTX - m._staticSX) * t;
    m.y = m._staticSY + (m._staticTY - m._staticSY) * t;
    if (m._staticTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 20 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      m._staticDashing = false;
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._staticTele) {
    m._staticTele--;
    if (m._staticTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 200));
      m._staticSX = m.x; m._staticSY = m.y;
      m._staticTX = clamped.x; m._staticTY = clamped.y;
      m._staticDashing = true; m._staticTimer = 16;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 220) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._staticTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 220;
    const endY = m.y + Math.sin(dir) * 220;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 35, color: [100, 160, 255], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 2. Charged Burst Arrow — electrified arrow that pops in small AoE on impact (cloudscale_archer)
MOB_SPECIALS.charged_burst_arrow = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Delayed AoE phase after arrow lands
  if (m._burstAoeTele) {
    m._burstAoeTele--;
    if (m._burstAoeTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._burstAoeX, m._burstAoeY, 60, player)) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._burstAoeX, y: m._burstAoeY, life: 20, type: "hit" });
      m._specialTimer = m._specialCD || 240;
    }
    return {};
  }
  // Telegraph phase
  if (m._burstTele) {
    m._burstTele--;
    if (m._burstTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const targetX = player.x;
      const targetY = player.y;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 10, vy: Math.sin(dir) * 10,
        fromPlayer: false, mobBullet: true, damage: Math.round(35 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#66aaff',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      // Set up delayed AoE at target position
      m._burstAoeX = targetX;
      m._burstAoeY = targetY;
      m._burstAoeTele = 20;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 380) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._burstTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 380;
    const endY = m.y + Math.sin(dir) * 380;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 45, color: [100, 170, 255], owner: m.id });
  }
  return { skip: true };
};

// 3. Wave Cut — short water slash projectile (tideblade_disciple)
MOB_SPECIALS.wave_cut = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  // Telegraph phase
  if (m._waveTele) {
    m._waveTele--;
    if (m._waveTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
        fromPlayer: false, mobBullet: true, damage: Math.round(38 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#4488cc',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._waveTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 280;
    const endY = m.y + Math.sin(dir) * 280;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 30, color: [68, 136, 204], owner: m.id });
  }
  return { skip: true };
};

// 4. Lightning Seal — marks a tile, lightning strikes after delay (thunder_crest_knight)
MOB_SPECIALS.lightning_seal = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Strike phase
  if (m._sealTele) {
    m._sealTele--;
    if (m._sealTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._sealTX, m._sealTY, 60, player)) {
        const dmg = Math.round(42 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 25 });
      }
      hitEffects.push({ x: m._sealTX, y: m._sealTY, life: 25, type: "stun" });
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._sealTX = player.x;
  m._sealTY = player.y;
  m._sealTele = 70;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._sealTX, cy: m._sealTY, radius: 60 }, delayFrames: 70, color: [120, 180, 255], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 5. Cinder Step — short dash + leaves burning patch (ember_guard)
MOB_SPECIALS.cinder_step = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Manage lingering fire zone
  if (m._cinderZone) {
    m._cinderZone.timer--;
    if (m._cinderZone.timer > 0 && m._cinderZone.timer % 30 === 0) {
      const cdx = player.x - m._cinderZone.x, cdy = player.y - m._cinderZone.y;
      if (Math.sqrt(cdx * cdx + cdy * cdy) < 50) {
        const dmg = Math.round(8 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
      }
    }
    if (m._cinderZone.timer <= 0) {
      m._cinderZone = null;
    }
  }
  // Dash phase
  if (m._cinderDashing) {
    m._cinderTimer--;
    const t = 1 - (m._cinderTimer / 14);
    m.x = m._cinderSX + (m._cinderTX - m._cinderSX) * t;
    m.y = m._cinderSY + (m._cinderTY - m._cinderSY) * t;
    if (m._cinderTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      // Leave fire zone at dash end position
      m._cinderZone = { x: m.x, y: m.y, timer: 150 };
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "cast" });
      m._cinderDashing = false;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 180));
  m._cinderSX = m.x; m._cinderSY = m.y;
  m._cinderTX = clamped.x; m._cinderTY = clamped.y;
  m._cinderDashing = true; m._cinderTimer = 14;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
  return { skip: true };
};

// 6. Coal Breath — short flame cone (furnace_hound)
MOB_SPECIALS.coal_breath = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  // Execution phase
  if (m._coalTele) {
    m._coalTele--;
    if (m._coalTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, (25 * Math.PI) / 180, 120, player)) {
        const dmg = Math.round(38 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 140) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._coalTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 50, range: 120 }, delayFrames: 30, color: [255, 120, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 7. War Ember Chant — buffs nearby allies with bonus damage (ashen_banner_monk)
MOB_SPECIALS.war_ember_chant = (m, ctx) => {
  const { player, dist, hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Telegraph phase
  if (m._chantTele) {
    m._chantTele--;
    if (m._chantTele <= 0) {
      // Buff nearby allies
      for (const ally of mobs) {
        if (ally === m || ally.hp <= 0) continue;
        const adx = ally.x - m.x, ady = ally.y - m.y;
        if (Math.sqrt(adx * adx + ady * ady) > 200) continue;
        if (!ally._emberBuffTimer) {
          ally._origDamage = ally.damage;
          ally.damage = Math.round(ally.damage * 1.3);
          ally._emberBuffTimer = 180;
        }
        hitEffects.push({ x: ally.x, y: ally.y - 20, life: 20, type: "cast" });
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Tick down buff timers on mobs (cleanup)
  for (const ally of mobs) {
    if (ally._emberBuffTimer && ally._emberBuffTimer > 0) {
      ally._emberBuffTimer--;
      if (ally._emberBuffTimer <= 0) {
        ally.damage = ally._origDamage || ally.damage;
        ally._emberBuffTimer = 0;
      }
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._chantTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 30, color: [255, 140, 60], owner: m.id });
  }
  return { skip: true };
};

// 8. Magma Breaker — fire line eruption from ground (crimson_furnace_captain)
MOB_SPECIALS.magma_breaker = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Execution phase
  if (m._magmaTele) {
    m._magmaTele--;
    if (m._magmaTele <= 0) {
      // Check player at 5 points along line
      let hit = false;
      for (let i = 1; i <= 5; i++) {
        const px = m.x + Math.cos(m._magmaDir) * (i * 60);
        const py = m.y + Math.sin(m._magmaDir) * (i * 60);
        const pdx = player.x - px, pdy = player.y - py;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 40 && !hit) {
          const dmg = Math.round(45 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          hit = true;
        }
        hitEffects.push({ x: px, y: py, life: 20, type: "hit" });
      }
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._magmaDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._magmaTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._magmaDir) * 300;
    const endY = m.y + Math.sin(m._magmaDir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 50, color: [255, 80, 20], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 3 BOSS SPECIALS =====================

// 9. Lightning Mark — marks area, lightning strikes after delay (azure_dragon)
MOB_SPECIALS.lightning_mark = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Strike phase
  if (m._lmarkTele) {
    m._lmarkTele--;
    if (m._lmarkTele <= 0) {
      for (const mark of m._lmarkPositions) {
        if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(mark.x, mark.y, 80, player)) {
          const dmg = Math.round(55 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
          StatusFX.applyToPlayer('stun', { duration: 30 });
          break; // Only hit once even if multiple marks overlap
        }
      }
      for (const mark of m._lmarkPositions) {
        hitEffects.push({ x: mark.x, y: mark.y, life: 25, type: "stun" });
      }
      m._lmarkPositions = null;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  // Create 2-3 marks at slightly offset positions
  const count = 2 + Math.floor(Math.random() * 2);
  m._lmarkPositions = [];
  for (let i = 0; i < count; i++) {
    const ox = player.x + (Math.random() - 0.5) * 120;
    const oy = player.y + (Math.random() - 0.5) * 120;
    m._lmarkPositions.push({ x: ox, y: oy });
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({ shape: 'circle', params: { cx: ox, cy: oy, radius: 80 }, delayFrames: 60, color: [100, 170, 255], owner: m.id });
    }
  }
  m._lmarkTele = 60;
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 10. Tidal Wave — horizontal water projectile across battlefield (azure_dragon)
MOB_SPECIALS.tidal_wave = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Telegraph phase
  if (m._tidalTele) {
    m._tidalTele--;
    if (m._tidalTele <= 0) {
      const dir = m._tidalDir;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 7, vy: Math.sin(dir) * 7,
        fromPlayer: false, mobBullet: true, damage: Math.round(50 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#2288cc',
        onHitPlayer: () => {
          // Push player away from projectile path
          const pushDir = Math.atan2(player.y - m.y, player.x - m.x);
          const nx = player.x + Math.cos(pushDir) * 60;
          const ny = player.y + Math.sin(pushDir) * 60;
          if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._tidalDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._tidalTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._tidalDir) * 400;
    const endY = m.y + Math.sin(m._tidalDir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 30 }, delayFrames: 50, color: [34, 136, 204], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 11. Cyclone Guard — spinning storm around self, damages nearby (azure_dragon)
MOB_SPECIALS.cyclone_guard = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active cyclone phase
  if (m._cycloneTimer && m._cycloneTimer > 0) {
    m._cycloneTimer--;
    // Damage every 30 frames
    if (m._cycloneTimer % 30 === 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120, player)) {
        const dmg = Math.round(20 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
      }
    }
    // Slow mob during cyclone
    if (m._cycloneTimer <= 0) {
      m.speed = m._cycloneOrigSpeed;
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._cycloneTele) {
    m._cycloneTele--;
    if (m._cycloneTele <= 0) {
      m._cycloneOrigSpeed = m.speed;
      m.speed = Math.round(m.speed * 0.5);
      m._cycloneTimer = 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._cycloneTele = 25;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 120 }, delayFrames: 25, color: [80, 200, 220], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 12. Inferno Crash — circular fire burst around self (jaja)
MOB_SPECIALS.inferno_crash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Execution phase
  if (m._infernoTele) {
    m._infernoTele--;
    if (m._infernoTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 160, player)) {
        const dmg = Math.round(58 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  m._infernoTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 160 }, delayFrames: 45, color: [255, 100, 30], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 13. Blazing Advance — rush forward leaving fire trail (jaja)
MOB_SPECIALS.blazing_advance = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 330;
  // Manage fire trail zones
  if (m._blazeTrail) {
    for (let i = m._blazeTrail.length - 1; i >= 0; i--) {
      const zone = m._blazeTrail[i];
      zone.timer--;
      if (zone.timer > 0 && zone.timer % 30 === 0) {
        const zdx = player.x - zone.x, zdy = player.y - zone.y;
        if (Math.sqrt(zdx * zdx + zdy * zdy) < 50) {
          const dmg = Math.round(10 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        }
      }
      if (zone.timer <= 0) {
        m._blazeTrail.splice(i, 1);
      }
    }
    if (m._blazeTrail.length === 0) m._blazeTrail = null;
  }
  // Dash phase
  if (m._blazeDashing) {
    m._blazeTimer--;
    const t = 1 - (m._blazeTimer / 20);
    m.x = m._blazeSX + (m._blazeTX - m._blazeSX) * t;
    m.y = m._blazeSY + (m._blazeTY - m._blazeSY) * t;
    // Drop fire zone at intervals during dash
    if (m._blazeTimer % 5 === 0 && m._blazeTimer > 0) {
      if (!m._blazeTrail) m._blazeTrail = [];
      m._blazeTrail.push({ x: m.x, y: m.y, timer: 120 });
      hitEffects.push({ x: m.x, y: m.y, life: 15, type: "cast" });
    }
    if (m._blazeTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(55 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._blazeDashing = false;
      m._specialTimer = m._specialCD || 330;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._blazeTele) {
    m._blazeTele--;
    if (m._blazeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 320));
      m._blazeSX = m.x; m._blazeSY = m.y;
      m._blazeTX = clamped.x; m._blazeTY = clamped.y;
      m._blazeDashing = true; m._blazeTimer = 20;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 120 || dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._blazeTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 40, color: [255, 120, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 14. Ember Mantle — heat aura that damages nearby players over time (jaja)
MOB_SPECIALS.ember_mantle = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active aura phase
  if (m._emberMantleTimer && m._emberMantleTimer > 0) {
    m._emberMantleTimer--;
    // Damage every 30 frames
    if (m._emberMantleTimer % 30 === 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100, player)) {
        const dmg = Math.round(12 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
      }
    }
    if (m._emberMantleTimer <= 0) {
      m._specialTimer = m._specialCD || 360;
    }
    return {};
  }
  // Telegraph phase
  if (m._mantleTele) {
    m._mantleTele--;
    if (m._mantleTele <= 0) {
      m._emberMantleTimer = 240;
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._mantleTele = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 100 }, delayFrames: 20, color: [255, 140, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 4 REGULAR SPECIALS =====================

// 15. Draw Cut — fast burst line slash forward (ashen_blade_retainer)
MOB_SPECIALS.draw_cut = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  // Execution phase
  if (m._drawTele) {
    m._drawTele--;
    if (m._drawTele <= 0) {
      const dir = m._drawDir;
      // Check player along a line from mob, length 120, width 30
      const endX = m.x + Math.cos(dir) * 120;
      const endY = m.y + Math.sin(dir) * 120;
      // Check proximity to line at 3 points
      let hit = false;
      for (let i = 1; i <= 3; i++) {
        const lx = m.x + Math.cos(dir) * (i * 40);
        const ly = m.y + Math.sin(dir) * (i * 40);
        const pdx = player.x - lx, pdy = player.y - ly;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 30 && !hit) {
          const dmg = Math.round(45 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          hit = true;
        }
      }
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 150) { m._specialTimer = 20; return {}; }
  m._drawDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._drawTele = 25;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._drawDir) * 120;
    const endY = m.y + Math.sin(m._drawDir) * 120;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 25, color: [200, 180, 160], owner: m.id });
  }
  return { skip: true };
};

// 16. Afterimage Dash — dash through player leaving afterimage (lantern_veil_assassin)
MOB_SPECIALS.afterimage_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Dash phase
  if (m._afterDashing) {
    m._afterTimer--;
    const t = 1 - (m._afterTimer / 18);
    m.x = m._afterSX + (m._afterTX - m._afterSX) * t;
    m.y = m._afterSY + (m._afterTY - m._afterSY) * t;
    // Check hit during dash
    if (!m._afterHit && typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
      const dmg = Math.round(42 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      m._afterHit = true;
    }
    if (m._afterTimer <= 0) {
      m._afterDashing = false;
      m._afterHit = false;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  // Overshoot by 80px past player
  const clamped = clampDashTarget(m.x, m.y, dir, dist + 80);
  m._afterSX = m.x; m._afterSY = m.y;
  m._afterTX = clamped.x; m._afterTY = clamped.y;
  m._afterDashing = true; m._afterTimer = 18; m._afterHit = false;
  hitEffects.push({ x: m.x, y: m.y - 10, life: 20, type: "smoke" });
  return { skip: true };
};

// 17. Blood Seal Shot — talisman arrow that marks ground, delayed burst (blood_script_archer)
MOB_SPECIALS.blood_seal_shot = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Delayed AoE phase
  if (m._bloodSealTele) {
    m._bloodSealTele--;
    if (m._bloodSealTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._bloodSealX, m._bloodSealY, 50, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._bloodSealX, y: m._bloodSealY, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 270;
    }
    return {};
  }
  // Arrow flight phase
  if (m._bloodArrowTimer) {
    m._bloodArrowTimer--;
    if (m._bloodArrowTimer <= 0) {
      // Arrow reached target area — create delayed AoE
      m._bloodSealTele = 45;
      if (typeof TelegraphSystem !== 'undefined') {
        TelegraphSystem.create({ shape: 'circle', params: { cx: m._bloodSealX, cy: m._bloodSealY, radius: 50 }, delayFrames: 45, color: [204, 34, 68], owner: m.id });
      }
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  // Fire arrow toward player position
  m._bloodSealX = player.x;
  m._bloodSealY = player.y;
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 8, vy: Math.sin(dir) * 8,
    fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#cc2244',
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._bloodArrowTimer = 60;
  return {};
};

// 18. Judgment Drop — overhead slam with forward shockwave (crimson_gate_executioner)
MOB_SPECIALS.judgment_drop = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Execution phase
  if (m._judgmentTele) {
    m._judgmentTele--;
    if (m._judgmentTele <= 0) {
      const dir = m._judgmentDir;
      // Check at 3 points along shockwave, each 50px apart
      let hit = false;
      for (let i = 1; i <= 3; i++) {
        const px = m.x + Math.cos(dir) * (i * 50);
        const py = m.y + Math.sin(dir) * (i * 50);
        const pdx = player.x - px, pdy = player.y - py;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 40 && !hit) {
          const dmg = Math.round(48 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          hit = true;
        }
        hitEffects.push({ x: px, y: py, life: 20, type: "hit" });
      }
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  m._judgmentDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._judgmentTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._judgmentDir) * 150;
    const endY = m.y + Math.sin(m._judgmentDir) * 150;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 26 }, delayFrames: 55, color: [200, 50, 50], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 19. Dust Pop — teleport short distance, burst at departure (lunar_dust_hare)
MOB_SPECIALS.dust_pop = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  const oldX = m.x, oldY = m.y;
  // Teleport to random position 100-200px away
  let attempts = 10;
  while (attempts-- > 0) {
    const angle = Math.random() * Math.PI * 2;
    const r = 100 + Math.random() * 100;
    const nx = m.x + Math.cos(angle) * r;
    const ny = m.y + Math.sin(angle) * r;
    if (positionClear(nx, ny)) {
      m.x = nx; m.y = ny;
      break;
    }
  }
  // Burst at old position
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(oldX, oldY, 60, player)) {
    const dmg = Math.round(38 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  }
  hitEffects.push({ x: oldX, y: oldY, life: 20, type: "smoke" });
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "cast" });
  m._specialTimer = m._specialCD || 180;
  return {};
};

// 20. Mirror Split — creates decoy, fires from one position (crescent_mirror_wisp)
MOB_SPECIALS.mirror_split = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  // Pick decoy position offset from mob
  const offsetAngle = Math.atan2(player.y - m.y, player.x - m.x) + (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 3);
  const decoyX = m.x + Math.cos(offsetAngle) * 80;
  const decoyY = m.y + Math.sin(offsetAngle) * 80;
  // Visual decoy
  hitEffects.push({ x: decoyX, y: decoyY - 10, life: 30, type: "cast" });
  // Fire projectile from either real or decoy position (random)
  const useDecoy = Math.random() > 0.5;
  const fireX = useDecoy ? decoyX : m.x;
  const fireY = useDecoy ? decoyY : m.y;
  const dir = Math.atan2(player.y - fireY, player.x - fireX);
  bullets.push({
    id: nextBulletId++, x: fireX, y: fireY - 8,
    vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
    fromPlayer: false, mobBullet: true, damage: Math.round(35 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#aaccff',
  });
  hitEffects.push({ x: fireX, y: fireY - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 240;
  return {};
};

// 21. Gravity Press — small slow zone (gravity_ear_monk)
MOB_SPECIALS.gravity_press = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Manage active gravity zone
  if (m._gravityZone) {
    m._gravityZone.timer--;
    const gdx = player.x - m._gravityZone.x, gdy = player.y - m._gravityZone.y;
    if (Math.sqrt(gdx * gdx + gdy * gdy) < 70) {
      StatusFX.applyToPlayer('slow', { duration: 60, amount: 0.5 });
    }
    if (m._gravityZone.timer <= 0) {
      m._gravityZone = null;
    }
  }
  // Telegraph phase
  if (m._gravTele) {
    m._gravTele--;
    if (m._gravTele <= 0) {
      // Activate zone
      m._gravityZone = { x: m._gravTX, y: m._gravTY, timer: 180 };
      // Initial damage
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m._gravTX, m._gravTY, 70, player)) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      hitEffects.push({ x: m._gravTX, y: m._gravTY, life: 25, type: "stun" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  m._gravTX = player.x;
  m._gravTY = player.y;
  m._gravTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._gravTX, cy: m._gravTY, radius: 70 }, delayFrames: 50, color: [120, 80, 200], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 22. Rift Leap — blink pounce to target position (eclipse_burrower)
MOB_SPECIALS.rift_leap = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Reappear phase (after invisible)
  if (m._riftReappear) {
    m._riftReappear--;
    if (m._riftReappear <= 0) {
      // Land at target position
      m.x = m._riftLandX;
      m.y = m._riftLandY;
      m._riftLeaping = false;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(45 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "hit" });
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  // Telegraph phase (invisible period)
  if (m._riftTele) {
    m._riftTele--;
    if (m._riftTele <= 0) {
      m._riftReappear = 5; // Brief reappear delay
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 120 || dist > 350) { m._specialTimer = 30; return {}; }
  // Store landing target
  m._riftLandX = player.x;
  m._riftLandY = player.y;
  m._riftLeaping = true;
  m._riftTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 50 }, delayFrames: 35, color: [80, 40, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
  return { skip: true };
};

// ===================== FLOOR 4 BOSS SPECIALS =====================

// 23. Shadow Step — blink behind target + slash (gensai)
MOB_SPECIALS.shadow_step = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Slash phase after teleport
  if (m._shadowSlash) {
    m._shadowSlash--;
    if (m._shadowSlash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(58 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._shadowTele) {
    m._shadowTele--;
    if (m._shadowTele <= 0) {
      // Teleport behind player (opposite side from mob's current position)
      const dirFromPlayer = Math.atan2(m.y - player.y, m.x - player.x);
      const behindDir = dirFromPlayer + Math.PI; // Opposite side
      const behindX = player.x + Math.cos(behindDir) * 50;
      const behindY = player.y + Math.sin(behindDir) * 50;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
      if (positionClear(behindX, behindY)) {
        m.x = behindX; m.y = behindY;
      } else {
        // Fallback: teleport to player position
        m.x = player.x; m.y = player.y;
      }
      hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
      m._shadowSlash = 10;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 100 || dist > 350) { m._specialTimer = 30; return {}; }
  // Brief marker at destination
  const dirFromPlayer = Math.atan2(m.y - player.y, m.x - player.x);
  const behindDir = dirFromPlayer + Math.PI;
  const markerX = player.x + Math.cos(behindDir) * 50;
  const markerY = player.y + Math.sin(behindDir) * 50;
  m._shadowTele = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: markerX, cy: markerY, radius: 40 }, delayFrames: 20, color: [60, 20, 80], owner: m.id });
  }
  return { skip: true };
};

// 24. Blood Crescent — blade-wave projectile (gensai)
MOB_SPECIALS.blood_crescent = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  // Telegraph phase
  if (m._crescentTele) {
    m._crescentTele--;
    if (m._crescentTele <= 0) {
      const dir = m._crescentDir;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 11, vy: Math.sin(dir) * 11,
        fromPlayer: false, mobBullet: true, damage: Math.round(55 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#cc2244',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._crescentDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._crescentTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(m._crescentDir) * 400;
    const endY = m.y + Math.sin(m._crescentDir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 35, color: [204, 34, 68], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 25. Demon Cleaver — charged devastating cone slash (gensai)
MOB_SPECIALS.demon_cleaver = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Execution phase
  if (m._cleaverTele) {
    m._cleaverTele--;
    if (m._cleaverTele <= 0) {
      const dir = m._cleaverDir;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 150, player)) {
        const dmg = Math.round(65 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 180) { m._specialTimer = 30; return {}; }
  m._cleaverDir = Math.atan2(player.y - m.y, player.x - m.x);
  m._cleaverTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: m._cleaverDir, angleDeg: 90, range: 150 }, delayFrames: 60, color: [200, 30, 30], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 26. Gravity Well — field pulling players inward (moon_rabbit)
MOB_SPECIALS.gravity_well = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 330;
  // Active gravity well
  if (m._gravWell) {
    m._gravWell.timer--;
    const gdx = player.x - m._gravWell.x, gdy = player.y - m._gravWell.y;
    const gDist = Math.sqrt(gdx * gdx + gdy * gdy);
    if (gDist < 100 && gDist > 5) {
      // Pull player toward center
      const pullDir = Math.atan2(m._gravWell.y - player.y, m._gravWell.x - player.x);
      const nx = player.x + Math.cos(pullDir) * 2;
      const ny = player.y + Math.sin(pullDir) * 2;
      if (positionClear(nx, ny)) { player.x = nx; player.y = ny; }
    }
    // Damage every 30 frames
    if (m._gravWell.timer % 30 === 0 && gDist < 100) {
      const dmg = Math.round(5 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "cast", dmg: dealt });
    }
    if (m._gravWell.timer <= 0) {
      m._gravWell = null;
      m._specialTimer = m._specialCD || 330;
    }
    return {};
  }
  // Telegraph phase
  if (m._gravWellTele) {
    m._gravWellTele--;
    if (m._gravWellTele <= 0) {
      m._gravWell = { x: m._gravWellTX, y: m._gravWellTY, timer: 120 };
      hitEffects.push({ x: m._gravWellTX, y: m._gravWellTY, life: 25, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._gravWellTX = player.x;
  m._gravWellTY = player.y;
  m._gravWellTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 100 }, delayFrames: 50, color: [100, 50, 180], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 27. Moon Rift Orb — slow orb that explodes (moon_rabbit)
MOB_SPECIALS.moon_rift_orb = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const targetX = player.x;
  const targetY = player.y;
  bullets.push({
    id: nextBulletId++, x: m.x, y: m.y - 8,
    vx: Math.cos(dir) * 4, vy: Math.sin(dir) * 4,
    fromPlayer: false, mobBullet: true, damage: Math.round(15 * getMobDamageMultiplier()),
    ownerId: m.id, bulletColor: '#8844cc', life: 90,
    onExpire: function() {
      const bx = this.x || targetX, by = this.y || targetY;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(bx, by, 80, player)) {
        const dmg = Math.round(60 * getMobDamageMultiplier());
        dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
      }
      hitEffects.push({ x: bx, y: by, life: 25, type: "hit" });
    },
  });
  hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
  m._specialTimer = m._specialCD || 300;
  return {};
};

// 28. Phase Skip — disappear and reappear elsewhere + void burst (moon_rabbit)
MOB_SPECIALS.phase_skip = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Reappear burst phase
  if (m._phaseReappear) {
    m._phaseReappear--;
    if (m._phaseReappear <= 0) {
      // Burst at arrival
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y - 10, life: 20, type: "cast" });
      m._phaseTimer = 0;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Invisible phase
  if (m._phaseTimer && m._phaseTimer > 0) {
    m._phaseTimer--;
    if (m._phaseTimer <= 0) {
      // Teleport to new position
      let attempts = 10;
      while (attempts-- > 0) {
        const angle = Math.random() * Math.PI * 2;
        const r = 150 + Math.random() * 150;
        const nx = m._phaseOldX + Math.cos(angle) * r;
        const ny = m._phaseOldY + Math.sin(angle) * r;
        if (positionClear(nx, ny)) {
          m.x = nx; m.y = ny;
          break;
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "cast" });
      m._phaseReappear = 10;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  const oldX = m.x, oldY = m.y;
  // Burst at departure
  if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(oldX, oldY, 70, player)) {
    const dmg = Math.round(40 * getMobDamageMultiplier());
    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
  }
  hitEffects.push({ x: oldX, y: oldY, life: 20, type: "smoke" });
  m._phaseOldX = oldX; m._phaseOldY = oldY;
  m._phaseTimer = 20;
  return { skip: true };
};
