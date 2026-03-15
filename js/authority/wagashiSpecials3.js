// ===================== WAGASHI: HEAVENLY REALM MOB SPECIALS (PART 3) =====================
// Dungeon 5 — Floor 5 specials including Lord Sarugami final boss.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 5 REGULAR SPECIALS =====================

// 1. Mire Spit — spit projectile at player (miregulp_tadpole)
MOB_SPECIALS.mire_spit = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._mireSpitTele) {
    m._mireSpitTele--;
    if (m._mireSpitTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
        fromPlayer: false, mobBullet: true, damage: Math.round(48 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#6a4a8a',
        onHitPlayer: () => {
          StatusFX.applyToPlayer('slow', { duration: 60, amount: 0.4 });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._mireSpitTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 35, color: [106, 74, 138], owner: m.id });
  }
  return { skip: true };
};

// 2. Dread Belch — cone AoE breath attack (gulchspine_bloater)
MOB_SPECIALS.dread_belch = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._dreadBelchTele) {
    m._dreadBelchTele--;
    if (m._dreadBelchTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 6, 140, player)) {
        const dmg = Math.round(52 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 160) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._dreadBelchTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 60, range: 140 }, delayFrames: 40, color: [100, 80, 60], owner: m.id });
  }
  return { skip: true };
};

// 3. Maw Hymn — debuff aura that weakens player (hymn_eater_toadlet)
MOB_SPECIALS.maw_hymn = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._mawHymnTele) {
    m._mawHymnTele--;
    if (m._mawHymnTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.4 });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._mawHymnTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 35, color: [140, 100, 160], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 4. Dark Gulp — pull player toward self + damage (abyssal_swallower)
MOB_SPECIALS.dark_gulp = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._darkGulpTele) {
    m._darkGulpTele--;
    if (m._darkGulpTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 9, 200, player)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Pull player 80px toward mob
        const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
        const pullDist = Math.min(80, dist - 20);
        if (pullDist > 0) {
          const nx = player.x + Math.cos(pullDir) * pullDist;
          const ny = player.y + Math.sin(pullDir) * pullDist;
          if (typeof positionClear !== 'undefined' && positionClear(nx, ny)) {
            player.x = nx;
            player.y = ny;
          }
        }
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._darkGulpTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 40, range: 200 }, delayFrames: 50, color: [60, 30, 80], owner: m.id });
  }
  return { skip: true };
};

// 5. Shard Toss — quick ranged chip damage projectile (shrine_shard_monkey)
MOB_SPECIALS.shard_toss = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 150;
  if (m._shardTossTele) {
    m._shardTossTele--;
    if (m._shardTossTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 11, vy: Math.sin(dir) * 11,
        fromPlayer: false, mobBullet: true, damage: Math.round(42 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ccaa22',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 150;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._shardTossTele = 25;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 14 }, delayFrames: 25, color: [204, 170, 34], owner: m.id });
  }
  return { skip: true };
};

// 6. Minor Orb Pulse — orb burst around self (seal_fragment_sprite)
MOB_SPECIALS.minor_orb_pulse = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._orbPulseTele) {
    m._orbPulseTele--;
    if (m._orbPulseTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120, player)) {
        const dmg = Math.round(38 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  m._orbPulseTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 120 }, delayFrames: 40, color: [180, 160, 220], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 7. Thunder Tail Crash — ground slam with line shockwave (thundertail_ape)
MOB_SPECIALS.thunder_tail_crash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._thunderTailTele) {
    m._thunderTailTele--;
    if (m._thunderTailTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      let hitPlayer = false;
      // Check player at 4 points along line (60px apart)
      for (let i = 1; i <= 4; i++) {
        const px = m.x + Math.cos(dir) * (i * 60);
        const py = m.y + Math.sin(dir) * (i * 60);
        const pdx = player.x - px, pdy = player.y - py;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 36) {
          hitPlayer = true;
          break;
        }
      }
      if (hitPlayer) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._thunderTailTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 240;
    const endY = m.y + Math.sin(dir) * 240;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 30 }, delayFrames: 45, color: [200, 180, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 8. Seal Rupture — AoE shockwave expanding outward (heavens_gate_breaker)
MOB_SPECIALS.seal_rupture = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._sealRuptureTele) {
    m._sealRuptureTele--;
    if (m._sealRuptureTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 150, player)) {
        const dmg = Math.round(55 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 25 });
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
      }
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 220) { m._specialTimer = 30; return {}; }
  m._sealRuptureTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 150 }, delayFrames: 55, color: [220, 200, 100], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 5 MINI-BOSS SPECIALS (CELESTIAL TOAD) =====================

// 9. Devouring Pull — suction field pulling players inward (celestial_toad)
MOB_SPECIALS.devouring_pull = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active suction phase
  if (m._devourPullTimer && m._devourPullTimer > 0) {
    m._devourPullTimer--;
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    // Pull player 3px toward mob if within cone
    if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 7.2, 250, player)) {
      const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
      const nx = player.x + Math.cos(pullDir) * 3;
      const ny = player.y + Math.sin(pullDir) * 3;
      if (typeof positionClear !== 'undefined' && positionClear(nx, ny)) {
        player.x = nx;
        player.y = ny;
      }
      // Damage every 30 frames
      if (m._devourPullTimer % 30 === 0) {
        const dmg = Math.round(8 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
      }
    }
    if (m._devourPullTimer <= 0) {
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._devourPullTele) {
    m._devourPullTele--;
    if (m._devourPullTele <= 0) {
      m._devourPullTimer = 120;
      hitEffects.push({ x: m.x, y: m.y - 15, life: 20, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._devourPullTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 50, range: 250 }, delayFrames: 50, color: [80, 40, 100], owner: m.id });
  }
  return { skip: true };
};

// 10. Void Spit — multiple dark projectiles in spread (celestial_toad)
MOB_SPECIALS.void_spit = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._voidSpitTele) {
    m._voidSpitTele--;
    if (m._voidSpitTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      // Fire 5 bullets in spread (-30 to +30 degrees)
      const spreadRad = (30 * Math.PI) / 180;
      for (let i = 0; i < 5; i++) {
        const angle = dir - spreadRad + (i / 4) * (spreadRad * 2);
        bullets.push({
          id: nextBulletId++, x: m.x, y: m.y - 8,
          vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
          fromPlayer: false, mobBullet: true, damage: Math.round(40 * getMobDamageMultiplier()),
          ownerId: m.id, bulletColor: '#4a2a6a',
        });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 15, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._voidSpitTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 60, range: 300 }, delayFrames: 40, color: [74, 42, 106], owner: m.id });
  }
  return { skip: true };
};

// 11. Corruption Mire — spits corrupted pools on ground (celestial_toad)
MOB_SPECIALS.corruption_mire = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active pools phase — check if player stands in any pool
  if (m._corrPools && m._corrPools.length > 0) {
    for (let i = m._corrPools.length - 1; i >= 0; i--) {
      const pool = m._corrPools[i];
      pool.life--;
      if (pool.life <= 0) {
        m._corrPools.splice(i, 1);
        continue;
      }
      // Damage player if standing in pool, every 30 frames
      pool._tick = (pool._tick || 0) + 1;
      if (pool._tick >= 30) {
        pool._tick = 0;
        const pdx = player.x - pool.x, pdy = player.y - pool.y;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 50) {
          const dmg = Math.round(10 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        }
      }
    }
    // Don't return skip — mob can act while pools persist
  }
  // Telegraph phase
  if (m._corrMireTele) {
    m._corrMireTele--;
    if (m._corrMireTele <= 0) {
      // Create pools at the telegraphed positions
      m._corrPools = m._corrPools || [];
      const targets = m._corrMirePoolTargets || [];
      for (let i = 0; i < targets.length; i++) {
        m._corrPools.push({ x: targets[i].x, y: targets[i].y, life: 300, _tick: 0 });
        hitEffects.push({ x: targets[i].x, y: targets[i].y, life: 25, type: "cast" });
      }
      m._corrMirePoolTargets = null;
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  // Calculate pool positions for telegraph
  const poolPositions = [];
  for (let i = 0; i < 3; i++) {
    const offsetX = (Math.random() - 0.5) * 400;
    const offsetY = (Math.random() - 0.5) * 400;
    const mag = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
    const clampedMag = Math.min(mag, 200);
    const px = player.x + (mag > 0 ? (offsetX / mag) * clampedMag : 0);
    const py = player.y + (mag > 0 ? (offsetY / mag) * clampedMag : 0);
    poolPositions.push({ x: px, y: py });
  }
  m._corrMirePoolTargets = poolPositions;
  m._corrMireTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    for (const pos of poolPositions) {
      TelegraphSystem.create({ shape: 'circle', params: { cx: pos.x, cy: pos.y, radius: 50 }, delayFrames: 45, color: [100, 50, 120], owner: m.id });
    }
  }
  return { skip: true };
};

// ===================== FLOOR 5 FINAL BOSS SPECIALS (LORD SARUGAMI) =====================

// 12. Black Orb Sentinels — 5 orbiting spheres guard him (lord_sarugami)
MOB_SPECIALS.black_orb_sentinels = (m, ctx) => {
  const { player, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active sentinel phase — update positions, check collisions
  if (m._orbSentinels && m._orbSentinels.length > 0) {
    m._orbSentinelTimer--;
    m._orbBaseAngle = (m._orbBaseAngle || 0) + 0.03;
    let hitThisFrame = false;
    for (let i = 0; i < m._orbSentinels.length; i++) {
      const angle = m._orbBaseAngle + (i * Math.PI * 2 / 5);
      const ox = m.x + Math.cos(angle) * 80;
      const oy = m.y + Math.sin(angle) * 80;
      m._orbSentinels[i] = { x: ox, y: oy };
      // Check player collision
      if (!hitThisFrame) {
        const pdx = player.x - ox, pdy = player.y - oy;
        if (Math.sqrt(pdx * pdx + pdy * pdy) < 40) {
          const dmg = Math.round(20 * getMobDamageMultiplier());
          dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg });
          hitThisFrame = true; // max 1 hit per frame
        }
      }
    }
    if (m._orbSentinelTimer <= 0) {
      m._orbSentinels = null;
      m._specialTimer = m._specialCD || 360;
    }
    // Don't return skip — let boss move normally while sentinels are active
    return {};
  }
  // Telegraph phase
  if (m._orbSentinelTele) {
    m._orbSentinelTele--;
    if (m._orbSentinelTele <= 0) {
      // Activate sentinels
      m._orbSentinels = [];
      m._orbSentinelTimer = 300;
      m._orbBaseAngle = 0;
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        m._orbSentinels.push({ x: m.x + Math.cos(angle) * 80, y: m.y + Math.sin(angle) * 80 });
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._orbSentinelTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 100 }, delayFrames: 30, color: [40, 20, 60], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 13. Orb Bomb Command — sends orbs to locations that explode (lord_sarugami)
MOB_SPECIALS.orb_bomb_command = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  // Active bombs phase
  if (m._orbBombs && m._orbBombs.length > 0) {
    for (let i = m._orbBombs.length - 1; i >= 0; i--) {
      const bomb = m._orbBombs[i];
      bomb.timer--;
      // Travel phase — interpolate toward target over 40 frames
      if (bomb.timer > 30) {
        const travelTotal = 40;
        const travelRemaining = bomb.timer - 30;
        const t = 1 - (travelRemaining / travelTotal);
        bomb.x = bomb.startX + (bomb.targetX - bomb.startX) * t;
        bomb.y = bomb.startY + (bomb.targetY - bomb.startY) * t;
      }
      // Explosion when timer hits 0
      if (bomb.timer <= 0) {
        if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(bomb.targetX, bomb.targetY, 70, player)) {
          const dmg = Math.round(55 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        }
        hitEffects.push({ x: bomb.targetX, y: bomb.targetY, life: 25, type: "cast" });
        m._orbBombs.splice(i, 1);
      }
    }
    if (m._orbBombs.length === 0) {
      m._orbBombs = null;
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._orbBombTele) {
    m._orbBombTele--;
    if (m._orbBombTele <= 0) {
      // Create bomb orbs at the telegraphed positions
      m._orbBombs = [];
      const targets = m._orbBombTargets || [];
      for (let i = 0; i < targets.length; i++) {
        m._orbBombs.push({
          x: m.x, y: m.y,
          startX: m.x, startY: m.y,
          targetX: targets[i].x, targetY: targets[i].y,
          timer: 70, // 40 travel + 30 delay
        });
      }
      m._orbBombTargets = null;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 450) { m._specialTimer = 30; return {}; }
  // Calculate target positions for telegraph
  const bombTargets = [];
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
    const tx = player.x + Math.cos(angle) * (80 + Math.random() * 60);
    const ty = player.y + Math.sin(angle) * (80 + Math.random() * 60);
    bombTargets.push({ x: tx, y: ty });
  }
  m._orbBombTargets = bombTargets;
  m._orbBombTele = 70;
  if (typeof TelegraphSystem !== 'undefined') {
    for (const t of bombTargets) {
      TelegraphSystem.create({ shape: 'circle', params: { cx: t.x, cy: t.y, radius: 70 }, delayFrames: 70, color: [60, 20, 80], owner: m.id });
    }
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 14. Divine Form Shift — multi-phase transformation based on HP (lord_sarugami)
// NOTE: This is HP-threshold reactive, NOT cooldown-based.
// It checks every frame but only triggers at transition points.
MOB_SPECIALS.divine_form_shift = (m, ctx) => {
  const { player, hitEffects } = ctx;
  const maxHp = (typeof MOB_TYPES !== 'undefined' && MOB_TYPES.lord_sarugami) ? MOB_TYPES.lord_sarugami.hp : 8000;
  const hpPct = m.hp / maxHp;

  // Handle active Statue phase (invulnerability + shockwave)
  if (m._statuePhase && m._statuePhase > 0) {
    m._statuePhase--;
    if (m._statuePhase <= 0) {
      m._invulnerable = false;
      // Shockwave on phase end
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200, player)) {
        const dmg = Math.round(70 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 25, type: "hit", dmg: dealt });
      }
      // Transition to Primal Form
      m.scale = 1.5;
      m.speed = (m._origSpeed || 3.5) * 1.5;
      m.damage = Math.round((m._origDamage || 70) * 1.2);
      m._specialCD = Math.round((m._specialCD || 360) * 0.6);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 30, type: "cast" });
    }
    return { skip: true };
  }

  // Check Titan Form transition (HP drops below 66%)
  if (hpPct <= 0.66 && !m._titanDone) {
    m._titanDone = true;
    m.scale = 1.8;
    m._origDamage = m._origDamage || m.damage;
    m.damage = Math.round(m._origDamage * 1.3);
    m._origSpeed = m._origSpeed || m.speed;
    m.speed = m._origSpeed * 0.8;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 30, type: "cast" });
    // Small shockwave on transformation
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 150, player)) {
      const dmg = Math.round(40 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 20, type: "hit", dmg: dealt });
    }
    return {};
  }

  // Check Statue Form transition (HP drops below 33%)
  if (hpPct <= 0.33 && !m._statueDone) {
    m._statueDone = true;
    m._statuePhase = 120; // 2 seconds invulnerability
    m._invulnerable = true;
    m.speed = 0;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 30, type: "cast" });
    return { skip: true };
  }

  // No transition needed — return empty
  return {};
};
