// ===================== WAGASHI: HEAVENLY REALM MOB SPECIALS =====================
// Dungeon 5 — Asian mythology heavenly realm. Floor 1+2 specials.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 1 REGULAR SPECIALS =====================

// 1. Snap Web — thin web projectile that slows on hit (silk_skitterer)
MOB_SPECIALS.snap_web = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._snapWebTele) {
    m._snapWebTele--;
    if (m._snapWebTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 10, vy: Math.sin(dir) * 10,
        fromPlayer: false, mobBullet: true, damage: Math.round(25 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#ccccdd',
        onHitPlayer: (b, hitTarget) => {
          StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.5 });
          hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "hit" });
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
  m._snapWebTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 12 }, delayFrames: 40, color: [200, 200, 220], owner: m.id });
  }
  return { skip: true };
};

// 2. Silk Needle Fan — 3 silk spike projectiles in spread (needleback_weaver)
MOB_SPECIALS.silk_needle_fan = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._silkFanTele) {
    m._silkFanTele--;
    if (m._silkFanTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const spreadAngle = (20 * Math.PI) / 180;
      for (let i = -1; i <= 1; i++) {
        const angle = dir + i * spreadAngle;
        bullets.push({
          id: nextBulletId++, x: m.x, y: m.y - 8,
          vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
          fromPlayer: false, mobBullet: true, damage: Math.round(18 * getMobDamageMultiplier()),
          ownerId: m.id, bulletColor: '#ddddcc',
        });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 320) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._silkFanTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 40, range: 320 }, delayFrames: 50, color: [220, 220, 200], owner: m.id });
  }
  return { skip: true };
};

// 3. Brood Glow — pulse that speeds up nearby mobs (brood_lantern_mite)
MOB_SPECIALS.brood_glow = (m, ctx) => {
  const { player, dist, hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._broodGlowTele) {
    m._broodGlowTele--;
    if (m._broodGlowTele <= 0) {
      // Boost nearby mobs
      for (const ally of mobs) {
        if (ally.id === m.id || ally.hp <= 0) continue;
        const adx = ally.x - m.x, ady = ally.y - m.y;
        if (Math.sqrt(adx * adx + ady * ady) < 200) {
          if (!ally._speedBoosted) {
            ally._origSpeed = ally.speed;
            ally.speed = ally.speed * 1.3;
            ally._speedBoosted = true;
            ally._glowBuffTimer = 180;
          }
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Tick down buff timers on all mobs
  for (const ally of mobs) {
    if (ally._speedBoosted && ally._glowBuffTimer !== undefined) {
      ally._glowBuffTimer--;
      if (ally._glowBuffTimer <= 0) {
        ally.speed = ally._origSpeed || ally.speed;
        ally._speedBoosted = false;
      }
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._broodGlowTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 30, color: [180, 255, 180], owner: m.id });
  }
  return { skip: true };
};

// 4. Wrap Tomb — marks circle under player, roots if still inside on detonation (silk_coffin_widow)
MOB_SPECIALS.wrap_tomb = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._wrapTombTele) {
    m._wrapTombTele--;
    if (m._wrapTombTele <= 0) {
      const dx = player.x - m._wrapMarkX, dy = player.y - m._wrapMarkY;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        const dmg = Math.round(20 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('root', { duration: 60 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  m._wrapMarkX = player.x;
  m._wrapMarkY = player.y;
  m._wrapTombTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 60 }, delayFrames: 60, color: [200, 200, 220], owner: m.id });
  }
  return { skip: true };
};

// 11. Metal Skull Bash — short straight charge with knockback (copperhide_hoglet)
MOB_SPECIALS.metal_skull_bash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  // Dash phase
  if (m._skullDashing) {
    m._skullTimer--;
    const t = 1 - (m._skullTimer / 14);
    m.x = m._skullSX + (m._skullTX - m._skullSX) * t;
    m.y = m._skullSY + (m._skullTY - m._skullSY) * t;
    if (m._skullTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 5, Math.sin(kbDir) * 5);
      }
      m._skullDashing = false;
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  // Telegraph phase — wait before dashing
  if (m._skullTele) {
    m._skullTele--;
    if (m._skullTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 180));
      m._skullSX = m.x; m._skullSY = m.y;
      m._skullTX = clamped.x; m._skullTY = clamped.y;
      m._skullDashing = true; m._skullTimer = 14;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._skullTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 180);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 180);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 35, color: [180, 140, 100], owner: m.id });
  }
  return { skip: true };
};

// 12. Dust Rush — dash that leaves dust cloud (tusk_raider)
MOB_SPECIALS.dust_rush = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._dustDashing) {
    m._dustTimer--;
    const t = 1 - (m._dustTimer / 16);
    m.x = m._dustSX + (m._dustTX - m._dustSX) * t;
    m.y = m._dustSY + (m._dustTY - m._dustSY) * t;
    if (m._dustTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48, player)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._dustDashing = false;
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 100 || dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 250));
  m._dustSX = m.x; m._dustSY = m.y;
  m._dustTX = clamped.x; m._dustTY = clamped.y;
  m._dustDashing = true; m._dustTimer = 16;
  // Dust cloud at start position
  hitEffects.push({ x: m.x, y: m.y, life: 60, type: "smoke" });
  return { skip: true };
};

// 13. Armor Brace — heals mob by 30% of max HP (bronzeback_crusher)
MOB_SPECIALS.armor_brace = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._armorBraceTele) {
    m._armorBraceTele--;
    if (m._armorBraceTele <= 0) {
      const maxHp = (MOB_TYPES[m.type] && MOB_TYPES[m.type].hp) ? MOB_TYPES[m.type].hp : (m.maxHp || 200);
      m.hp = Math.min(m.hp + Math.floor(maxHp * 0.3), m.maxHp);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  // Only brace when player is nearby (threat response)
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._armorBraceTele = 25;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 40 }, delayFrames: 25, color: [180, 160, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 14. Battle Beat — buffs nearby allied mobs with bonus damage (warboar_drummer)
MOB_SPECIALS.battle_beat = (m, ctx) => {
  const { player, dist, hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._battleBeatTele) {
    m._battleBeatTele--;
    if (m._battleBeatTele <= 0) {
      for (const ally of mobs) {
        if (ally.id === m.id || ally.hp <= 0) continue;
        const adx = ally.x - m.x, ady = ally.y - m.y;
        if (Math.sqrt(adx * adx + ady * ady) < 200) {
          if (!ally._dmgBoosted) {
            ally._origDamage = ally.damage;
            ally.damage = Math.round(ally.damage * 1.3);
            ally._dmgBoosted = true;
            ally._dmgBoostTimer = 180;
          }
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Tick down damage buff timers on all mobs
  for (const ally of mobs) {
    if (ally._dmgBoosted && ally._dmgBoostTimer !== undefined) {
      ally._dmgBoostTimer--;
      if (ally._dmgBoostTimer <= 0) {
        ally.damage = ally._origDamage || ally.damage;
        ally._dmgBoosted = false;
      }
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._battleBeatTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 30, color: [200, 160, 100], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 1 BOSS SPECIALS =====================

// 5. Silk Snare — places web patches on ground that root players (sichou boss)
MOB_SPECIALS.silk_snare = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Track active snares
  if (m._silkSnares === undefined) m._silkSnares = [];
  // Update existing snares
  m._silkSnares = m._silkSnares.filter(s => s.life > 0);
  for (const snare of m._silkSnares) {
    snare.life--;
    if (!snare._hit) {
      const sdx = player.x - snare.x, sdy = player.y - snare.y;
      if (Math.sqrt(sdx * sdx + sdy * sdy) < 50) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('root', { duration: 45 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        snare._hit = true;
      }
    }
  }
  if (m._silkSnareTele) {
    m._silkSnareTele--;
    if (m._silkSnareTele <= 0) {
      // Place 3 webs near player
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
        const r = 40 + Math.random() * 60;
        const wx = m._snareTargetX + Math.cos(angle) * r;
        const wy = m._snareTargetY + Math.sin(angle) * r;
        m._silkSnares.push({ x: wx, y: wy, life: 300, _hit: false });
        hitEffects.push({ x: wx, y: wy, life: 30, type: "cast" });
      }
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._snareTargetX = player.x;
  m._snareTargetY = player.y;
  m._silkSnareTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    for (let i = 0; i < 3; i++) {
      const angle = (Math.PI * 2 / 3) * i + Math.random() * 0.5;
      const r = 40 + Math.random() * 60;
      TelegraphSystem.create({ shape: 'circle', params: { cx: player.x + Math.cos(angle) * r, cy: player.y + Math.sin(angle) * r, radius: 50 }, delayFrames: 45, color: [200, 200, 220], owner: m.id });
    }
  }
  return { skip: true };
};

// 6. Thread Shot — silk projectile that slows on hit (sichou boss)
MOB_SPECIALS.thread_shot = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._threadShotTele) {
    m._threadShotTele--;
    if (m._threadShotTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 11, vy: Math.sin(dir) * 11,
        fromPlayer: false, mobBullet: true, damage: Math.round(35 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#eeeedd',
        onHitPlayer: (b, hitTarget) => {
          StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.4 });
          hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "hit" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._threadShotTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 400;
    const endY = m.y + Math.sin(dir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 14 }, delayFrames: 35, color: [230, 230, 210], owner: m.id });
  }
  return { skip: true };
};

// 7. Brood Call — summons 2-3 spiderling minions (sichou boss)
MOB_SPECIALS.brood_call = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._broodCallTele) {
    m._broodCallTele--;
    if (m._broodCallTele <= 0) {
      const count = 2 + Math.floor(Math.random() * 2); // 2-3
      const activeMinions = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
      if (activeMinions < 6) {
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i;
          const sx = m.x + Math.cos(angle) * 60;
          const sy = m.y + Math.sin(angle) * 60;
          if (typeof positionClear !== 'undefined' && !positionClear(sx, sy)) continue;
          mobs.push({
            x: sx, y: sy, type: 'silk_skitterer', id: nextMobId++,
            hp: Math.round(m.maxHp * 0.08), maxHp: Math.round(m.maxHp * 0.08),
            speed: 2.5, damage: Math.round(m.damage * 0.3),
            contactRange: 30, skin: '#888899', hair: '#666677', shirt: '#777788', pants: '#666677',
            name: 'Spiderling', dir: 0, frame: 0, attackCooldown: 0,
            shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
            summonRate: 0, summonMax: 0, summonTimer: 0,
            arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
            _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
            _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
            _summonOwnerId: m.id, scale: 0.7, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
          });
          hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "cast" });
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "cast" });
      m._specialTimer = m._specialCD || 600;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._broodCallTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 80 }, delayFrames: 60, color: [180, 180, 200], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 8. Titan Charge — rushes in straight line, knocking back anyone hit (tongya boss)
MOB_SPECIALS.titan_charge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._titanDashing) {
    m._titanTimer--;
    const t = 1 - (m._titanTimer / 20);
    m.x = m._titanSX + (m._titanTX - m._titanSX) * t;
    m.y = m._titanSY + (m._titanTY - m._titanSY) * t;
    if (m._titanTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 60, player)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 10, Math.sin(kbDir) * 10);
      }
      m._titanDashing = false;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._titanChargeTele) {
    m._titanChargeTele--;
    if (m._titanChargeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 360));
      m._titanSX = m.x; m._titanSY = m.y;
      m._titanTX = clamped.x; m._titanTY = clamped.y;
      m._titanDashing = true; m._titanTimer = 20;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 100 || dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._titanChargeTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 360);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 360);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 30 }, delayFrames: 50, color: [160, 120, 80], owner: m.id });
  }
  return { skip: true };
};

// 9. War Stomp — circular shockwave around self (tongya boss)
MOB_SPECIALS.war_stomp = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._warStompTele) {
    m._warStompTele--;
    if (m._warStompTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 150, player)) {
        const dmg = Math.round(45 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 180) { m._specialTimer = 30; return {}; }
  m._warStompTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 150 }, delayFrames: 40, color: [160, 130, 90], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 10. Boar Fury — temporarily increases speed and attack frequency (tongya boss)
MOB_SPECIALS.boar_fury = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  // Active fury phase
  if (m._boarFuryTimer && m._boarFuryTimer > 0) {
    m._boarFuryTimer--;
    if (m._boarFuryTimer <= 0) {
      // Revert buffs
      m.speed = m._boarOrigSpeed || m.speed;
      m._specialCD = m._boarOrigCD || m._specialCD;
      m._boarFuryActive = false;
    }
    return {};
  }
  if (m._boarFuryTele) {
    m._boarFuryTele--;
    if (m._boarFuryTele <= 0) {
      m._boarOrigSpeed = m.speed;
      m._boarOrigCD = m._specialCD;
      m.speed = m.speed * 1.5;
      m._specialCD = Math.round(m._specialCD * 0.6);
      m._boarFuryTimer = 240;
      m._boarFuryActive = true;
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._boarFuryTele = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 50 }, delayFrames: 20, color: [200, 100, 60], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 2 REGULAR SPECIALS =====================

// 15. Venom Arc — spits poison in a short cone (temple_fang_acolyte)
MOB_SPECIALS.venom_arc = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._venomArcTele) {
    m._venomArcTele--;
    if (m._venomArcTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 6, 120, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('poison', { duration: 120, dmg: 3 });
      }
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._venomArcTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 60, range: 120 }, delayFrames: 35, color: [100, 200, 80], owner: m.id });
  }
  return { skip: true };
};

// 16. Jade Flash — eyes flare green in cone, slows players (jade_idol_watcher)
MOB_SPECIALS.jade_flash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._jadeFlashTele) {
    m._jadeFlashTele--;
    if (m._jadeFlashTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 140, player)) {
        const dmg = Math.round(20 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.4 });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 160) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._jadeFlashTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 140 }, delayFrames: 45, color: [80, 220, 120], owner: m.id });
  }
  return { skip: true };
};

// 17. Snake Call — summons a small serpent minion (coil_priestess)
MOB_SPECIALS.snake_call = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._snakeCallTele) {
    m._snakeCallTele--;
    if (m._snakeCallTele <= 0) {
      const activeMinions = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
      if (activeMinions < 3) {
        const angle = Math.random() * Math.PI * 2;
        const sx = m.x + Math.cos(angle) * 50;
        const sy = m.y + Math.sin(angle) * 50;
        mobs.push({
          x: sx, y: sy, type: 'temple_fang_acolyte', id: nextMobId++,
          hp: Math.round(m.maxHp * 0.15), maxHp: Math.round(m.maxHp * 0.15),
          speed: 2.5, damage: Math.round(m.damage * 0.4),
          contactRange: 30, skin: '#668866', hair: '#446644', shirt: '#557755', pants: '#446644',
          name: 'Serpent', dir: 0, frame: 0, attackCooldown: 0,
          shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
          summonRate: 0, summonMax: 0, summonTimer: 0,
          arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
          _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
          _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
          _summonOwnerId: m.id, scale: 0.7, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
        });
        hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "cast" });
      }
      hitEffects.push({ x: m.x, y: m.y - 30, life: 25, type: "cast" });
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._snakeCallTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 60 }, delayFrames: 50, color: [80, 180, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 18. Petrify Glint — marks player, delayed stun if still in LOS (jade_vein_stalker)
MOB_SPECIALS.petrify_glint = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Phase 2: check if stun lands
  if (m._petrifyMark && m._petrifyMark > 0) {
    m._petrifyMark--;
    if (m._petrifyMark <= 0) {
      const pdx = player.x - m.x, pdy = player.y - m.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist < 350) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('stun', { duration: 45 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._petrifyMark = 90;
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "stun" });
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  m._specialTimer = 0; // Will be set after mark expires
  return { skip: true };
};

// 25. Rubble Toss — throws debris at target position (rubblebound_sentinel)
MOB_SPECIALS.rubble_toss = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._rubbleTossTele) {
    m._rubbleTossTele--;
    if (m._rubbleTossTele <= 0) {
      const dx = player.x - m._rubbleTargetX, dy = player.y - m._rubbleTargetY;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._rubbleTargetX, y: m._rubbleTargetY, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._rubbleTargetX = player.x;
  m._rubbleTargetY = player.y;
  m._rubbleTossTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 60 }, delayFrames: 50, color: [150, 130, 100], owner: m.id });
  }
  return { skip: true };
};

// 26. Ground Split — shock line forward (pillarbreaker_brute)
MOB_SPECIALS.ground_split = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._groundSplitTele) {
    m._groundSplitTele--;
    if (m._groundSplitTele <= 0) {
      const dir = m._groundSplitDir;
      // Check multiple points along the line
      let hit = false;
      for (let i = 1; i <= 5; i++) {
        const cx = m.x + Math.cos(dir) * (i * 60);
        const cy = m.y + Math.sin(dir) * (i * 60);
        const dx = player.x - cx, dy = player.y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          hit = true;
          break;
        }
      }
      if (hit) {
        const dmg = Math.round(38 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      // Visual along line
      for (let i = 1; i <= 5; i++) {
        hitEffects.push({ x: m.x + Math.cos(dir) * (i * 60), y: m.y + Math.sin(dir) * (i * 60), life: 20, type: "hit" });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._groundSplitDir = dir;
  m._groundSplitTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 28 }, delayFrames: 45, color: [150, 130, 100], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 27. Stone Ward — buffs nearby allies with healing (dustcore_totem)
MOB_SPECIALS.stone_ward = (m, ctx) => {
  const { dist, hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._stoneWardTele) {
    m._stoneWardTele--;
    if (m._stoneWardTele <= 0) {
      for (const ally of mobs) {
        if (ally.id === m.id || ally.hp <= 0) continue;
        const adx = ally.x - m.x, ady = ally.y - m.y;
        if (Math.sqrt(adx * adx + ady * ady) < 200) {
          const healAmt = Math.floor(ally.maxHp * 0.1);
          ally.hp = Math.min(ally.hp + healAmt, ally.maxHp);
          hitEffects.push({ x: ally.x, y: ally.y - 20, life: 20, type: "cast" });
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._stoneWardTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 35, color: [140, 160, 140], owner: m.id });
  }
  return { skip: true };
};

// 28. Aftershock Ring — delayed expanding shockwave (mausoleum_warden)
MOB_SPECIALS.aftershock_ring = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Phase 2: expanding ring check
  if (m._aftershockRing && m._aftershockRing > 0) {
    m._aftershockRing--;
    if (m._aftershockRing <= 0) {
      const pdx = player.x - m._aftershockX, pdy = player.y - m._aftershockY;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pdist >= 80 && pdist <= 150) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._aftershockX, y: m._aftershockY, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  // Phase 1: ground strike telegraph
  if (m._aftershockTele) {
    m._aftershockTele--;
    if (m._aftershockTele <= 0) {
      // Initial hit in center
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 80, player)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 20, type: "hit" });
      m._aftershockX = m.x;
      m._aftershockY = m.y;
      m._aftershockRing = 30; // Phase 2 starts
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  m._aftershockTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 150 }, delayFrames: 50, color: [160, 140, 100], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 2 BOSS SPECIALS =====================

// 19. Jade Glare — narrow beam forward that stuns (jade_serpent boss)
MOB_SPECIALS.jade_glare = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._jadeGlareTele) {
    m._jadeGlareTele--;
    if (m._jadeGlareTele <= 0) {
      const dir = m._jadeGlareDir;
      const endX = m.x + Math.cos(dir) * 350;
      const endY = m.y + Math.sin(dir) * 350;
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInLine) {
        if (AttackShapes.playerInLine(m.x, m.y, endX, endY, 30, player)) {
          const dmg = Math.round(40 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
          StatusFX.applyToPlayer('stun', { duration: 50 });
        }
      } else if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 50 });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._jadeGlareDir = dir;
  m._jadeGlareTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 50, color: [80, 220, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 20. Serpent Swarm — summons 3 small snake minions (jade_serpent boss)
MOB_SPECIALS.serpent_swarm = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._serpentSwarmTele) {
    m._serpentSwarmTele--;
    if (m._serpentSwarmTele <= 0) {
      const activeMinions = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
      if (activeMinions < 8) {
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          const sx = m.x + Math.cos(angle) * 70;
          const sy = m.y + Math.sin(angle) * 70;
          if (typeof positionClear !== 'undefined' && !positionClear(sx, sy)) continue;
          mobs.push({
            x: sx, y: sy, type: 'temple_fang_acolyte', id: nextMobId++,
            hp: Math.round(m.maxHp * 0.06), maxHp: Math.round(m.maxHp * 0.06),
            speed: 2.8, damage: Math.round(m.damage * 0.3),
            contactRange: 30, skin: '#668866', hair: '#446644', shirt: '#557755', pants: '#446644',
            name: 'Serpent', dir: 0, frame: 0, attackCooldown: 0,
            shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
            summonRate: 0, summonMax: 0, summonTimer: 0,
            arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
            _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
            _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
            _summonOwnerId: m.id, scale: 0.65, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
          });
          hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "cast" });
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "cast" });
      m._specialTimer = m._specialCD || 600;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._serpentSwarmTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 80 }, delayFrames: 55, color: [80, 200, 100], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 21. Jade Spires — line of jade spikes from ground (jade_serpent boss)
MOB_SPECIALS.jade_spires = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  if (m._jadeSpiresTele) {
    m._jadeSpiresTele--;
    if (m._jadeSpiresTele <= 0) {
      const dir = m._jadeSpiresDir;
      let totalDmg = 0;
      // 4 damage points along the line
      for (let i = 1; i <= 4; i++) {
        const cx = m.x + Math.cos(dir) * (i * 80);
        const cy = m.y + Math.sin(dir) * (i * 80);
        const dx = player.x - cx, dy = player.y - cy;
        if (Math.sqrt(dx * dx + dy * dy) < 40) {
          const dmg = Math.round(35 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          totalDmg += dealt;
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          break; // Only hit once even if multiple spikes overlap
        }
        hitEffects.push({ x: cx, y: cy, life: 20, type: "hit" });
      }
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._jadeSpiresDir = dir;
  m._jadeSpiresTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 320;
    const endY = m.y + Math.sin(dir) * 320;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 30 }, delayFrames: 55, color: [80, 220, 120], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 22. Earthbreaker Slam — circular AoE slam (stone_golem_guardian boss)
MOB_SPECIALS.earthbreaker_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._earthbreakerTele) {
    m._earthbreakerTele--;
    if (m._earthbreakerTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 160, player)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 8, Math.sin(kbDir) * 8);
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  m._earthbreakerTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 160 }, delayFrames: 50, color: [140, 120, 90], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 23. Boulder Hurl — throws large stone projectile (stone_golem_guardian boss)
MOB_SPECIALS.boulder_hurl = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  if (m._boulderHurlTele) {
    m._boulderHurlTele--;
    if (m._boulderHurlTele <= 0) {
      const dir = m._boulderHurlDir;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 8, vy: Math.sin(dir) * 8,
        fromPlayer: false, mobBullet: true, damage: Math.round(55 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#887766',
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 150) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._boulderHurlDir = dir;
  m._boulderHurlTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 400;
    const endY = m.y + Math.sin(dir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 60, color: [140, 120, 90], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 24. Stonehide — reduces damage taken by healing 25% max HP (stone_golem_guardian boss)
MOB_SPECIALS.stonehide = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._stonehideTele) {
    m._stonehideTele--;
    if (m._stonehideTele <= 0) {
      m.hp = Math.min(m.hp + Math.floor(m.maxHp * 0.25), m.maxHp);
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
      hitEffects.push({ x: m.x, y: m.y - 35, life: 30, maxLife: 30, type: "cast" });
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._stonehideTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 50 }, delayFrames: 30, color: [140, 130, 110], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};
