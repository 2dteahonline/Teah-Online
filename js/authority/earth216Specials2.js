// ===================== EARTH-216: SIN CITY MOB SPECIALS (PART 2) =====================
// Dungeon 6 — Vegas crime theme. Floor 3+4 specials.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 3 REGULAR SPECIALS =====================

// 1. Bone Wall — circle telegraph near player → spawns damage barrier zone (marrow_guard)
MOB_SPECIALS.bone_wall = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Tick active bone wall zones
  if (m._boneWallZones === undefined) m._boneWallZones = [];
  m._boneWallZones = m._boneWallZones.filter(z => z.life > 0);
  for (const zone of m._boneWallZones) {
    zone.life--;
    if (zone.life % 30 === 0) {
      const dx = player.x - zone.x, dy = player.y - zone.y;
      if (Math.sqrt(dx * dx + dy * dy) < 55) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
    }
  }
  if (m._boneWallTele) {
    m._boneWallTele--;
    if (m._boneWallTele <= 0) {
      m._boneWallZones.push({ x: m._boneWallTX, y: m._boneWallTY, life: 180 });
      hitEffects.push({ x: m._boneWallTX, y: m._boneWallTY, life: 180, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  m._boneWallTX = player.x;
  m._boneWallTY = player.y;
  m._boneWallTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 55 }, delayFrames: 50, color: [220, 210, 180], owner: m.id });
  }
  return { skip: true };
};

// 2. Candle Toss — projectile → fire zone on landing (candle_child)
MOB_SPECIALS.candle_toss = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  // Tick active fire zones
  if (m._candleFireZones === undefined) m._candleFireZones = [];
  m._candleFireZones = m._candleFireZones.filter(z => z.life > 0);
  for (const zone of m._candleFireZones) {
    zone.life--;
    if (zone.life % 20 === 0) {
      const dx = player.x - zone.x, dy = player.y - zone.y;
      if (Math.sqrt(dx * dx + dy * dy) < 45) {
        const dmg = Math.round(12 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
    }
  }
  if (m._candleTossTele) {
    m._candleTossTele--;
    if (m._candleTossTele <= 0) {
      m._candleFireZones.push({ x: m._candleTossTargX, y: m._candleTossTargY, life: 120 });
      hitEffects.push({ x: m._candleTossTargX, y: m._candleTossTargY, life: 120, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  m._candleTossTargX = player.x;
  m._candleTossTargY = player.y;
  m._candleTossTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 45 }, delayFrames: 40, color: [255, 160, 60], owner: m.id });
  }
  return { skip: true };
};

// 3. Spirit Ward — healing zone for nearby mobs (ofrenda_keeper)
MOB_SPECIALS.spirit_ward = (m, ctx) => {
  const { player, dist, hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Ongoing heal aura
  if (m._spiritWardTimer && m._spiritWardTimer > 0) {
    m._spiritWardTimer--;
    if (m._spiritWardTimer % 30 === 0) {
      for (const ally of mobs) {
        if (ally.hp <= 0) continue;
        const adx = ally.x - m.x, ady = ally.y - m.y;
        if (Math.sqrt(adx * adx + ady * ady) < 200) {
          const maxHp = ally.maxHp || (MOB_TYPES[ally.type] && MOB_TYPES[ally.type].hp) || 100;
          ally.hp = Math.min(ally.hp + Math.floor(maxHp * 0.03), ally.maxHp || maxHp);
          hitEffects.push({ x: ally.x, y: ally.y - 20, life: 12, type: "cast" });
        }
      }
    }
    if (m._spiritWardTimer <= 0) {
      m._specialTimer = m._specialCD || 360;
    }
    return {};
  }
  if (m._spiritWardTele) {
    m._spiritWardTele--;
    if (m._spiritWardTele <= 0) {
      m._spiritWardTimer = 180;
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._spiritWardTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 35, color: [180, 255, 200], owner: m.id });
  }
  return { skip: true };
};

// 4. Death Note — piercing sound projectile (grave_trumpeter)
MOB_SPECIALS.death_note = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._deathNoteTele) {
    m._deathNoteTele--;
    if (m._deathNoteTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 12, vy: Math.sin(dir) * 12,
        fromPlayer: false, mobBullet: true, damage: Math.round(30 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#bb88ff', pierce: true, life: 60,
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._deathNoteTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 35, color: [160, 100, 255], owner: m.id });
  }
  return { skip: true };
};

// 5. Veil Mist — fog zone: slows player + heals mobs in range (veil_sister)
MOB_SPECIALS.veil_mist = (m, ctx) => {
  const { player, dist, hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Ongoing mist effect
  if (m._veilMistTimer && m._veilMistTimer > 0) {
    m._veilMistTimer--;
    if (m._veilMistTimer % 40 === 0) {
      // Slow player if in range
      const dx = player.x - m.x, dy = player.y - m.y;
      if (Math.sqrt(dx * dx + dy * dy) < 180) {
        StatusFX.applyToPlayer('slow', { duration: 45, amount: 0.5 });
      }
      // Heal nearby mobs
      for (const ally of mobs) {
        if (ally.hp <= 0) continue;
        const adx = ally.x - m.x, ady = ally.y - m.y;
        if (Math.sqrt(adx * adx + ady * ady) < 180) {
          const maxHp = ally.maxHp || (MOB_TYPES[ally.type] && MOB_TYPES[ally.type].hp) || 100;
          ally.hp = Math.min(ally.hp + Math.floor(maxHp * 0.02), ally.maxHp || maxHp);
        }
      }
    }
    if (m._veilMistTimer <= 0) {
      m._specialTimer = m._specialCD || 360;
    }
    return {};
  }
  if (m._veilMistTele) {
    m._veilMistTele--;
    if (m._veilMistTele <= 0) {
      m._veilMistTimer = 240;
      hitEffects.push({ x: m.x, y: m.y, life: 240, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._veilMistTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 180 }, delayFrames: 40, color: [180, 180, 220], owner: m.id });
  }
  return { skip: true };
};

// 6. Flame Kiss — cone telegraph + fire burst + burn DoT (candle_bride)
MOB_SPECIALS.flame_kiss = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._flameKissTele) {
    m._flameKissTele--;
    if (m._flameKissTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, 160, Math.PI / 6)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 18, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 180) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._flameKissTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 60, range: 160 }, delayFrames: 40, color: [255, 140, 50], owner: m.id });
  }
  return { skip: true };
};

// 7. Rosary Thrust — line telegraph + dash lunge to player (rosary_fencer)
MOB_SPECIALS.rosary_thrust = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  // Dash phase
  if (m._rosaryDash) {
    m._rosaryDash--;
    const t = 1 - (m._rosaryDash / 12);
    m.x = m._rosarySX + (m._rosaryTX - m._rosarySX) * t;
    m.y = m._rosarySY + (m._rosaryTY - m._rosarySY) * t;
    if (m._rosaryDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 45)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        player.knockVx = Math.cos(kbDir) * 5;
        player.knockVy = Math.sin(kbDir) * 5;
      }
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._rosaryThrustTele) {
    m._rosaryThrustTele--;
    if (m._rosaryThrustTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 220));
      m._rosarySX = m.x; m._rosarySY = m.y;
      m._rosaryTX = clamped.x; m._rosaryTY = clamped.y;
      m._rosaryDash = 12;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 60 || dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._rosaryThrustTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 220);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 220);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 22 }, delayFrames: 35, color: [220, 200, 180], owner: m.id });
  }
  return { skip: true };
};

// 8. Dirge Arrow — slow projectile + slow debuff on hit (choir_widow)
MOB_SPECIALS.dirge_arrow = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._dirgeArrowTele) {
    m._dirgeArrowTele--;
    if (m._dirgeArrowTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 5, vy: Math.sin(dir) * 5,
        fromPlayer: false, mobBullet: true, damage: Math.round(25 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#9988aa', life: 90,
        onHitPlayer: () => {
          StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.4 });
          hitEffects.push({ x: player.x, y: player.y - 10, life: 20, type: "hit" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 320) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._dirgeArrowTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 320;
    const endY = m.y + Math.sin(dir) * 320;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 14 }, delayFrames: 40, color: [140, 120, 170], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 3 BOSS SPECIALS =====================

// 9. Cemetery Call — summon 3 skeleton-type minions (macabre_e216)
MOB_SPECIALS.cemetery_call = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
  if (m._cemeteryTele) {
    m._cemeteryTele--;
    if (m._cemeteryTele <= 0) {
      const activeMinions = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
      if (activeMinions < 6) {
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI * 2 / 3) * i;
          const sx = m.x + Math.cos(angle) * 70;
          const sy = m.y + Math.sin(angle) * 70;
          if (typeof positionClear !== 'undefined' && !positionClear(sx, sy)) continue;
          mobs.push({
            x: sx, y: sy, type: 'skeleton', id: nextMobId++,
            hp: Math.round(m.maxHp * 0.06), maxHp: Math.round(m.maxHp * 0.06),
            speed: 2.2, damage: Math.round(m.damage * 0.25),
            contactRange: 30, skin: '#ccccbb', hair: '#aaaaaa', shirt: '#888877', pants: '#777766',
            name: 'Skeleton', dir: 0, frame: 0, attackCooldown: 0,
            shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
            summonRate: 0, summonMax: 0, summonTimer: 0,
            arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
            _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
            _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
            _summonOwnerId: m.id, scale: 0.8, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
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
  m._cemeteryTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 90 }, delayFrames: 60, color: [200, 200, 180], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 10. Funeral Ring — ring telegraph around self → damage + root (macabre_e216)
MOB_SPECIALS.funeral_ring = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._funeralRingTele) {
    m._funeralRingTele--;
    if (m._funeralRingTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 160)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('root', { duration: 90 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  m._funeralRingTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'ring', params: { cx: m.x, cy: m.y, innerRadius: 40, outerRadius: 160 }, delayFrames: 50, color: [180, 160, 140], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 11. Ofrenda Burst — circle telegraph on player pos → delayed spirit explosion + slow (macabre_e216)
MOB_SPECIALS.ofrenda_burst = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._ofrendaBurstTele) {
    m._ofrendaBurstTele--;
    if (m._ofrendaBurstTele <= 0) {
      const dx = player.x - m._ofrendaTargX, dy = player.y - m._ofrendaTargY;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        const dmg = Math.round(45 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._ofrendaTargX, y: m._ofrendaTargY, life: 20, type: "hit" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._ofrendaTargX = player.x;
  m._ofrendaTargY = player.y;
  m._ofrendaBurstTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 80 }, delayFrames: 55, color: [255, 180, 80], owner: m.id });
  }
  return { skip: true };
};

// 12. Ghost Mariachi — 3 spirit projectiles toward player sequentially (rosa_calavera)
MOB_SPECIALS.ghost_mariachi = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Staggered shot phase
  if (m._mariTimer && m._mariTimer > 0) {
    m._mariTimer--;
    if (m._mariTimer === 20 || m._mariTimer === 10 || m._mariTimer === 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const spread = (Math.random() - 0.5) * 0.2;
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir + spread) * 9, vy: Math.sin(dir + spread) * 9,
        fromPlayer: false, mobBullet: true, damage: Math.round(30 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#88ddff', life: 60,
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 10, type: "cast" });
    }
    if (m._mariTimer <= 0) {
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._mariTele) {
    m._mariTele--;
    if (m._mariTele <= 0) {
      m._mariTimer = 30;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._mariTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 40, color: [100, 200, 255], owner: m.id });
  }
  return { skip: true };
};

// 13. Candle Procession — line of 4 fire hazard circles toward player (rosa_calavera)
MOB_SPECIALS.candle_procession = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Staggered ignition phase
  if (m._processionTimer && m._processionTimer > 0) {
    m._processionTimer--;
    // Ignite circles at frames 45, 30, 15, 0
    if (m._processionTimer === 45 || m._processionTimer === 30 || m._processionTimer === 15 || m._processionTimer === 0) {
      const idx = 3 - Math.floor(m._processionTimer / 15);
      const px = m._processionPoints[idx];
      if (px) {
        const dx = player.x - px.x, dy = player.y - px.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
          const dmg = Math.round(25 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        }
        hitEffects.push({ x: px.x, y: px.y, life: 20, type: "hit" });
      }
    }
    if (m._processionTimer <= 0) {
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._processionTele) {
    m._processionTele--;
    if (m._processionTele <= 0) {
      m._processionTimer = 60;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  // Pre-compute 4 circle positions along line
  m._processionPoints = [];
  for (let i = 1; i <= 4; i++) {
    const d = i * 70;
    m._processionPoints.push({ x: m.x + Math.cos(dir) * d, y: m.y + Math.sin(dir) * d });
  }
  m._processionTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    for (let i = 0; i < 4; i++) {
      const pt = m._processionPoints[i];
      TelegraphSystem.create({ shape: 'circle', params: { cx: pt.x, cy: pt.y, radius: 50 }, delayFrames: 50 + i * 15, color: [255, 120, 40], owner: m.id });
    }
  }
  return { skip: true };
};

// 14. Last Serenade — large circle telegraph → AoE burst + fear (rosa_calavera)
MOB_SPECIALS.last_serenade = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._serenadeTele) {
    m._serenadeTele--;
    if (m._serenadeTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('fear', { duration: 120 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        // Push player away
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        player.knockVx = Math.cos(kbDir) * 8;
        player.knockVy = Math.sin(kbDir) * 8;
      }
      hitEffects.push({ x: m.x, y: m.y, life: 30, type: "hit" });
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 250) { m._specialTimer = 30; return {}; }
  m._serenadeTele = 65;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 200 }, delayFrames: 65, color: [200, 100, 180], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 4 REGULAR SPECIALS =====================

// 15. Chain Whip — line telegraph + pull player toward mob (chain_gremlin)
MOB_SPECIALS.chain_whip = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._chainWhipTele) {
    m._chainWhipTele--;
    if (m._chainWhipTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 200)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Pull player toward mob (negative knockback)
        const pullDir = Math.atan2(m.y - player.y, m.x - player.x);
        player.knockVx = Math.cos(pullDir) * 7;
        player.knockVy = Math.sin(pullDir) * 7;
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 220) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._chainWhipTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 220;
    const endY = m.y + Math.sin(dir) * 220;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 18 }, delayFrames: 35, color: [160, 160, 170], owner: m.id });
  }
  return { skip: true };
};

// 16. Road Rage — short dash + cone slash (road_reaper)
MOB_SPECIALS.road_rage = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 190;
  // Dash phase
  if (m._roadRageDash) {
    m._roadRageDash--;
    const t = 1 - (m._roadRageDash / 10);
    m.x = m._roadSX + (m._roadTX - m._roadSX) * t;
    m.y = m._roadSY + (m._roadTY - m._roadSY) * t;
    if (m._roadRageDash <= 0) {
      // Cone slash at end of dash
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, 100, Math.PI / 4)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 18, type: "hit" });
      m._specialTimer = m._specialCD || 190;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._roadRageTele) {
    m._roadRageTele--;
    if (m._roadRageTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist - 30, 140));
      m._roadSX = m.x; m._roadSY = m.y;
      m._roadTX = clamped.x; m._roadTY = clamped.y;
      m._roadRageDash = 10;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._roadRageTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist - 30, 140);
    const endY = m.y + Math.sin(dir) * Math.min(dist - 30, 140);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 30, color: [200, 80, 80], owner: m.id });
  }
  return { skip: true };
};

// 17. Furnace Punch — circle telegraph + burn DoT (furnace_knuckle)
MOB_SPECIALS.furnace_punch = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._furnacePunchTele) {
    m._furnacePunchTele--;
    if (m._furnacePunchTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 70)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 18, type: "hit" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 90) { m._specialTimer = 30; return {}; }
  m._furnacePunchTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 70 }, delayFrames: 30, color: [255, 120, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 10, type: "cast" });
  return { skip: true };
};

// 18. Rev Charge — long dash-through + trail damage (rev_hound)
MOB_SPECIALS.rev_charge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  // Dash phase
  if (m._revChargeDash) {
    m._revChargeDash--;
    const t = 1 - (m._revChargeDash / 18);
    m.x = m._revSX + (m._revTX - m._revSX) * t;
    m.y = m._revSY + (m._revTY - m._revSY) * t;
    // Damage along path each frame
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40) && !m._revHitPlayer) {
      const dmg = Math.round(30 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      m._revHitPlayer = true;
    }
    if (m._revChargeDash % 3 === 0) {
      hitEffects.push({ x: m.x, y: m.y, life: 30, type: "smoke" });
    }
    if (m._revChargeDash <= 0) {
      m._revHitPlayer = false;
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._revChargeTele) {
    m._revChargeTele--;
    if (m._revChargeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 80, 320));
      m._revSX = m.x; m._revSY = m.y;
      m._revTX = clamped.x; m._revTY = clamped.y;
      m._revChargeDash = 18;
      m._revHitPlayer = false;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 100 || dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._revChargeTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 80, 320);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 80, 320);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 22 }, delayFrames: 40, color: [220, 100, 60], owner: m.id });
  }
  return { skip: true };
};

// 19. Drift Blink — teleport behind player + backstab (drift_phantom)
MOB_SPECIALS.drift_blink = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._driftBlinkTele) {
    m._driftBlinkTele--;
    if (m._driftBlinkTele <= 0) {
      // Teleport behind player (opposite of player facing)
      const behindDir = Math.atan2(m.y - player.y, m.x - player.x);
      const teleX = player.x + Math.cos(behindDir) * 50;
      const teleY = player.y + Math.sin(behindDir) * 50;
      if (typeof positionClear === 'undefined' || positionClear(teleX, teleY)) {
        m.x = teleX;
        m.y = teleY;
      }
      // Backstab damage
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 55)) {
        const dmg = Math.round(45 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 18, type: "cast" });
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._driftBlinkTele = 45;
  // Telegraph at the target position (behind player)
  const behindDir = Math.atan2(m.y - player.y, m.x - player.x);
  const markX = player.x + Math.cos(behindDir) * 50;
  const markY = player.y + Math.sin(behindDir) * 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: markX, cy: markY, radius: 45 }, delayFrames: 45, color: [140, 100, 200], owner: m.id });
  }
  return { skip: true };
};

// 20. Dummy Detonate — circle telegraph AoE explosion at self (crash_dummy)
MOB_SPECIALS.dummy_detonate = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._detonateTele) {
    m._detonateTele--;
    if (m._detonateTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        player.knockVx = Math.cos(kbDir) * 8;
        player.knockVy = Math.sin(kbDir) * 8;
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 150) { m._specialTimer = 30; return {}; }
  m._detonateTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 120 }, delayFrames: 50, color: [255, 80, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 21. Neon Shriek — cone + damage + fear push (neon_screamer)
MOB_SPECIALS.neon_shriek = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._neonShriekTele) {
    m._neonShriekTele--;
    if (m._neonShriekTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, 180, Math.PI / 4)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('fear', { duration: 90 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        player.knockVx = Math.cos(kbDir) * 6;
        player.knockVy = Math.sin(kbDir) * 6;
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 18, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._neonShriekTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 180 }, delayFrames: 40, color: [255, 60, 200], owner: m.id });
  }
  return { skip: true };
};

// 22. Ramp Launch — leap arc + explosive landing (ramp_widow)
MOB_SPECIALS.ramp_launch = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Leap phase
  if (m._rampLeaping) {
    m._rampLeapTimer--;
    const t = 1 - (m._rampLeapTimer / 20);
    m.x = m._rampSX + (m._rampTargX - m._rampSX) * t;
    m.y = m._rampSY + (m._rampTargY - m._rampSY) * t;
    if (m._rampLeapTimer <= 0) {
      // AoE on landing
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 90)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        player.knockVx = Math.cos(kbDir) * 7;
        player.knockVy = Math.sin(kbDir) * 7;
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._rampLeaping = false;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._rampLaunchTele) {
    m._rampLaunchTele--;
    if (m._rampLaunchTele <= 0) {
      m._rampSX = m.x; m._rampSY = m.y;
      m._rampLeaping = true;
      m._rampLeapTimer = 20;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._rampTargX = player.x;
  m._rampTargY = player.y;
  m._rampLaunchTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 90 }, delayFrames: 50, color: [200, 100, 60], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 4 BOSS SPECIALS =====================

// 23. Redline — self-buff: speed doubles for 180 frames (motor_demon)
MOB_SPECIALS.redline_e216 = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  // Active buff phase
  if (m._redlineTimer && m._redlineTimer > 0) {
    m._redlineTimer--;
    if (m._redlineTimer <= 0) {
      m.speed = m._origSpeed || m.speed;
      m._redlineActive = false;
    }
    return {};
  }
  if (m._redlineTele) {
    m._redlineTele--;
    if (m._redlineTele <= 0) {
      m._origSpeed = m.speed;
      m.speed = m.speed * 2;
      m._redlineTimer = 180;
      m._redlineActive = true;
      hitEffects.push({ x: m.x, y: m.y - 20, life: 25, type: "cast" });
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._redlineTele = 20;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 50 }, delayFrames: 20, color: [255, 40, 40], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 10, type: "cast" });
  return { skip: true };
};

// 24. Hell Exhaust — cone telegraph backward → flame damage + knockback + burn (motor_demon)
MOB_SPECIALS.hell_exhaust = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._exhaustTele) {
    m._exhaustTele--;
    if (m._exhaustTele <= 0) {
      // Cone fires BACKWARD (away from player)
      const backDir = Math.atan2(m.y - player.y, m.x - player.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, backDir, 180, Math.PI / 4)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        player.knockVx = Math.cos(kbDir) * 8;
        player.knockVy = Math.sin(kbDir) * 8;
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 18, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 220) { m._specialTimer = 30; return {}; }
  const backDir = Math.atan2(m.y - player.y, m.x - player.x);
  m._exhaustTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: backDir, angleDeg: 90, range: 180 }, delayFrames: 40, color: [255, 100, 30], owner: m.id });
  }
  return { skip: true };
};

// 25. Geargrind Slam — circle telegraph on player pos → leap + AoE slam + stun (motor_demon)
MOB_SPECIALS.geargrind_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Leap phase
  if (m._geargrindLeap) {
    m._geargrindLeap--;
    const t = 1 - (m._geargrindLeap / 18);
    m.x = m._gearSX + (m._gearTargX - m._gearSX) * t;
    m.y = m._gearSY + (m._gearTargY - m._gearSY) * t;
    if (m._geargrindLeap <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100)) {
        const dmg = Math.round(55 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('stun', { duration: 90 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._geargrindTele) {
    m._geargrindTele--;
    if (m._geargrindTele <= 0) {
      m._gearSX = m.x; m._gearSY = m.y;
      m._geargrindLeap = 18;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._gearTargX = player.x;
  m._gearTargY = player.y;
  m._geargrindTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 100 }, delayFrames: 55, color: [180, 180, 180], owner: m.id });
  }
  return { skip: true };
};

// 26. Nitro Line — line telegraph → full-arena dash leaving fire trail (nitro_wraith)
MOB_SPECIALS.nitro_line = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 270;
  // Fire trail zones
  if (m._nitroTrailZones === undefined) m._nitroTrailZones = [];
  m._nitroTrailZones = m._nitroTrailZones.filter(z => z.life > 0);
  for (const zone of m._nitroTrailZones) {
    zone.life--;
    if (zone.life % 20 === 0) {
      const dx = player.x - zone.x, dy = player.y - zone.y;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
    }
  }
  // Dash phase
  if (m._nitroLineDash) {
    m._nitroLineDash--;
    const t = 1 - (m._nitroLineDash / 22);
    m.x = m._nitroSX + (m._nitroTX - m._nitroSX) * t;
    m.y = m._nitroSY + (m._nitroTY - m._nitroSY) * t;
    // Leave fire trail
    if (m._nitroLineDash % 3 === 0) {
      m._nitroTrailZones.push({ x: m.x, y: m.y, life: 120 });
      hitEffects.push({ x: m.x, y: m.y, life: 120, type: "cast" });
    }
    if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 40) && !m._nitroHitPlayer) {
      const dmg = Math.round(40 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      m._nitroHitPlayer = true;
    }
    if (m._nitroLineDash <= 0) {
      m._nitroHitPlayer = false;
      m._specialTimer = m._specialCD || 270;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._nitroLineTele) {
    m._nitroLineTele--;
    if (m._nitroLineTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, 400);
      m._nitroSX = m.x; m._nitroSY = m.y;
      m._nitroTX = clamped.x; m._nitroTY = clamped.y;
      m._nitroLineDash = 22;
      m._nitroHitPlayer = false;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 450) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._nitroLineTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 400;
    const endY = m.y + Math.sin(dir) * 400;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 26 }, delayFrames: 50, color: [255, 140, 0], owner: m.id });
  }
  return { skip: true };
};

// 27. Phantom Splitstream — 2 afterimage lines + real dash, all 3 deal damage (nitro_wraith)
MOB_SPECIALS.phantom_splitstream = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Dash phase (real dash)
  if (m._splitDashing) {
    m._splitDashTimer--;
    const t = 1 - (m._splitDashTimer / 14);
    m.x = m._splitSX + (m._splitTX - m._splitSX) * t;
    m.y = m._splitSY + (m._splitTY - m._splitSY) * t;
    if (m._splitDashTimer <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 45)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._splitDashing = false;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._splitstreamTele) {
    m._splitstreamTele--;
    if (m._splitstreamTele <= 0) {
      // Check afterimage line damage
      for (const line of m._splitAfterLines || []) {
        const dx = player.x - line.ex, dy = player.y - line.ey;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
          const dmg = Math.round(25 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        }
      }
      // Start real dash
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 260));
      m._splitSX = m.x; m._splitSY = m.y;
      m._splitTX = clamped.x; m._splitTY = clamped.y;
      m._splitDashing = true;
      m._splitDashTimer = 14;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  const spread = Math.PI / 8;
  m._splitAfterLines = [];
  m._splitstreamTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    // Real line
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 260);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 260);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 45, color: [180, 60, 255], owner: m.id });
    // Afterimage lines
    for (let i = -1; i <= 1; i += 2) {
      const aDir = dir + i * spread;
      const aDist = Math.min(dist + 20, 260);
      const aex = m.x + Math.cos(aDir) * aDist;
      const aey = m.y + Math.sin(aDir) * aDist;
      m._splitAfterLines.push({ ex: aex, ey: aey });
      TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: aex, y2: aey, width: 14 }, delayFrames: 45, color: [140, 40, 200], owner: m.id });
    }
  }
  return { skip: true };
};

// 28. Crash Bloom — circle telegraph at center → charges to center → 3 expanding ring telegraphs (nitro_wraith)
MOB_SPECIALS.crash_bloom = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Expanding rings phase
  if (m._crashBloomPhase && m._crashBloomPhase > 0) {
    m._crashBloomPhase--;
    // 3 rings at phase 40, 25, 10
    if (m._crashBloomPhase === 40 || m._crashBloomPhase === 25 || m._crashBloomPhase === 10) {
      const ringIdx = m._crashBloomPhase === 40 ? 0 : m._crashBloomPhase === 25 ? 1 : 2;
      const radius = 80 + ringIdx * 80;
      const dx = player.x - m._bloomCX, dy = player.y - m._bloomCY;
      const pDist = Math.sqrt(dx * dx + dy * dy);
      if (pDist < radius + 40 && pDist > radius - 40) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._bloomCX, y: m._bloomCY, life: 20, type: "hit" });
    }
    if (m._crashBloomPhase <= 0) {
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Charge to center phase (dash)
  if (m._crashChargeDash) {
    m._crashChargeDash--;
    const t = 1 - (m._crashChargeDash / 16);
    m.x = m._crashSX + (m._bloomCX - m._crashSX) * t;
    m.y = m._crashSY + (m._bloomCY - m._crashSY) * t;
    if (m._crashChargeDash <= 0) {
      // Start expanding rings
      m._crashBloomPhase = 50;
      if (typeof TelegraphSystem !== 'undefined') {
        for (let i = 0; i < 3; i++) {
          const r = 80 + i * 80;
          const delay = (i === 0) ? 10 : (i === 1) ? 25 : 40;
          TelegraphSystem.create({ shape: 'ring', params: { cx: m._bloomCX, cy: m._bloomCY, innerRadius: r - 40, outerRadius: r + 40 }, delayFrames: delay, color: [255, 60, 100], owner: m.id });
        }
      }
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._crashBloomTele) {
    m._crashBloomTele--;
    if (m._crashBloomTele <= 0) {
      m._crashSX = m.x; m._crashSY = m.y;
      m._crashChargeDash = 16;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 500) { m._specialTimer = 30; return {}; }
  // Use midpoint between mob and player as "center of arena"
  m._bloomCX = (m.x + player.x) / 2;
  m._bloomCY = (m.y + player.y) / 2;
  m._crashBloomTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m._bloomCX, cy: m._bloomCY, radius: 60 }, delayFrames: 55, color: [255, 80, 120], owner: m.id });
  }
  return { skip: true };
};
