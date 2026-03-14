// ===================== EARTH-216: SIN CITY MOB SPECIALS (PART 3) =====================
// Dungeon 6 — Vegas crime theme. Floor 5 specials.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 5 REGULAR SPECIALS =====================

// 1. Card Flick — 2 card projectiles in spread (cardling)
MOB_SPECIALS.card_flick = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 150;
  if (m._cardFlickTele) {
    m._cardFlickTele--;
    if (m._cardFlickTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const spread = (15 * Math.PI) / 180;
      for (let i = -1; i <= 1; i += 2) {
        const angle = dir + i * spread;
        bullets.push({
          id: nextBulletId++, x: m.x, y: m.y - 8,
          vx: Math.cos(angle) * 9, vy: Math.sin(angle) * 9,
          fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
          ownerId: m.id, bulletColor: '#eeddaa',
        });
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 150;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._cardFlickTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 30 }, delayFrames: 35, color: [220, 200, 140], owner: m.id });
  }
  return { skip: true };
};

// 2. Oracle Curse — circle telegraph on player + damage-taken debuff (pit_oracle)
MOB_SPECIALS.oracle_curse = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._oracleCurseTele) {
    m._oracleCurseTele--;
    if (m._oracleCurseTele <= 0) {
      const dx = player.x - m._curseMarkX, dy = player.y - m._curseMarkY;
      if (Math.sqrt(dx * dx + dy * dy) < 70) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._curseMarkX = player.x;
  m._curseMarkY = player.y;
  m._oracleCurseTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 70 }, delayFrames: 55, color: [160, 80, 200], owner: m.id });
  }
  return { skip: true };
};

// 3. Spin Slash — self-circle telegraph + spinning slash damage around self (roulette_revenant)
MOB_SPECIALS.spin_slash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._spinSlashTele) {
    m._spinSlashTele--;
    if (m._spinSlashTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 100)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 130) { m._specialTimer = 30; return {}; }
  m._spinSlashTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 100 }, delayFrames: 40, color: [200, 50, 50], owner: m.id });
  }
  return { skip: true };
};

// 4. Reaper Cut — cone telegraph + bleed DoT (suit_reaper)
MOB_SPECIALS.reaper_cut = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._reaperCutTele) {
    m._reaperCutTele--;
    if (m._reaperCutTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, 120, Math.PI / 4.5)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 150, amount: 0.5 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y - 10, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 140) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._reaperCutTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 80, range: 120 }, delayFrames: 40, color: [180, 30, 30], owner: m.id });
  }
  return { skip: true };
};

// 5. Blight Burst — circle telegraph at self + poison DoT (blight_husk)
MOB_SPECIALS.blight_burst = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._blightBurstTele) {
    m._blightBurstTele--;
    if (m._blightBurstTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 90)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 30, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 120) { m._specialTimer = 30; return {}; }
  m._blightBurstTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 90 }, delayFrames: 45, color: [80, 180, 40], owner: m.id });
  }
  return { skip: true };
};

// 6. Maw Bite — dash + bite + self-heal (maw_sprite)
MOB_SPECIALS.maw_bite = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  // Dash phase
  if (m._mawBiteDash) {
    m._mawBiteDash--;
    const t = 1 - (m._mawBiteDash / 14);
    m.x = m._mawSX + (m._mawTX - m._mawSX) * t;
    m.y = m._mawSY + (m._mawTY - m._mawSY) * t;
    if (m._mawBiteDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Self-heal 5% maxHP
        const maxHp = m.maxHp || (MOB_TYPES[m.type] && MOB_TYPES[m.type].hp) || 100;
        m.hp = Math.min(m.hp + Math.floor(maxHp * 0.05), m.maxHp);
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
      }
      m._mawBiteDash = false;
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._mawBiteTele) {
    m._mawBiteTele--;
    if (m._mawBiteTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 200));
      m._mawSX = m.x; m._mawSY = m.y;
      m._mawTX = clamped.x; m._mawTY = clamped.y;
      m._mawBiteDash = 14;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 60 || dist > 250) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._mawBiteTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 200);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 200);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 22 }, delayFrames: 35, color: [200, 60, 80], owner: m.id });
  }
  return { skip: true };
};

// 7. Rift Pulse — expanding ring telegraph + slow (rift_penitent)
MOB_SPECIALS.rift_pulse = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._riftPulseTele) {
    m._riftPulseTele--;
    if (m._riftPulseTele <= 0) {
      const dx = player.x - m._riftMarkX, dy = player.y - m._riftMarkY;
      const pdist = Math.sqrt(dx * dx + dy * dy);
      if (pdist < 110 && pdist > 40) {
        const dmg = Math.round(28 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.45 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._riftMarkX = player.x;
  m._riftMarkY = player.y;
  m._riftPulseTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'ring', params: { cx: player.x, cy: player.y, innerRadius: 40, outerRadius: 110 }, delayFrames: 50, color: [100, 60, 200], owner: m.id });
  }
  return { skip: true };
};

// 8. Apostle Dash — dash to player + corruption zone at endpoint (grin_apostle)
MOB_SPECIALS.apostle_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  // Corruption zone tracking
  if (m._apostleZones === undefined) m._apostleZones = [];
  m._apostleZones = m._apostleZones.filter(z => z.life > 0);
  for (const zone of m._apostleZones) {
    zone.life--;
    if (zone.life % 20 === 0) {
      const dx = player.x - zone.x, dy = player.y - zone.y;
      if (Math.sqrt(dx * dx + dy * dy) < 60) {
        const dmg = Math.round(10 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 10, type: "hit", dmg: dealt });
      }
    }
  }
  // Dash phase
  if (m._apostleDashDash) {
    m._apostleDashDash--;
    const t = 1 - (m._apostleDashDash / 16);
    m.x = m._apoSX + (m._apoTX - m._apoSX) * t;
    m.y = m._apoSY + (m._apoTY - m._apoSY) * t;
    if (m._apostleDashDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      // Leave corruption zone at endpoint
      m._apostleZones.push({ x: m.x, y: m.y, life: 180 });
      hitEffects.push({ x: m.x, y: m.y, life: 180, type: "cast" });
      m._apostleDashDash = false;
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._apostleDashTele) {
    m._apostleDashTele--;
    if (m._apostleDashTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 240));
      m._apoSX = m.x; m._apoSY = m.y;
      m._apoTX = clamped.x; m._apoTY = clamped.y;
      m._apostleDashDash = 16;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._apostleDashTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 240);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 240);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 26 }, delayFrames: 40, color: [140, 40, 160], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 5 BOSS SPECIALS — HOLLOW ACE (MINI-BOSS) =====================

// 9. Stacked Deck — 4 rapid card projectiles, each with different status (hollow_ace)
MOB_SPECIALS.stacked_deck = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Staggered shot phase
  if (m._stackedDeckTimer) {
    m._stackedDeckTimer--;
    // Fire a card every 8 frames (4 total over 32 frames)
    const shotIndex = 3 - Math.floor(m._stackedDeckTimer / 8);
    if (m._stackedDeckTimer % 8 === 0 && shotIndex >= 0 && shotIndex < 4) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const statuses = [
        { type: 'slow', opts: { duration: 90, amount: 0.5 } },
        { type: 'root', opts: { duration: 45 } },
        null, // pure damage
        { type: 'stun', opts: { duration: 30 } },
      ];
      const colors = ['#aaddff', '#88ee88', '#ffcc44', '#ff88ff'];
      const status = statuses[shotIndex];
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 10, vy: Math.sin(dir) * 10,
        fromPlayer: false, mobBullet: true, damage: Math.round(35 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: colors[shotIndex],
        onHitPlayer: status ? () => {
          StatusFX.applyToPlayer(status.type, status.opts);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 20, type: "stun" });
        } : undefined,
      });
    }
    if (m._stackedDeckTimer <= 0) {
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._stackedDeckTimer = false;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._stackedDeckTele) {
    m._stackedDeckTele--;
    if (m._stackedDeckTele <= 0) {
      m._stackedDeckTimer = 32; // 4 shots × 8 frames apart
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._stackedDeckTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 350;
    const endY = m.y + Math.sin(dir) * 350;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 45, color: [220, 180, 60], owner: m.id });
  }
  return { skip: true };
};

// 10. Cold Read — Mark player position → after 120 frames void hands erupt (hollow_ace)
MOB_SPECIALS.cold_read_e216 = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Delayed eruption phase
  if (m._coldReadTimer) {
    m._coldReadTimer--;
    if (m._coldReadTimer <= 0) {
      const dx = player.x - m._coldReadX, dy = player.y - m._coldReadY;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        const dmg = Math.round(55 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('stun', { duration: 45 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 25, type: "stun", dmg: dealt });
      }
      hitEffects.push({ x: m._coldReadX, y: m._coldReadY, life: 30, type: "hit" });
      m._coldReadTimer = false;
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._coldReadTele) {
    m._coldReadTele--;
    if (m._coldReadTele <= 0) {
      m._coldReadTimer = 120;
      // Second telegraph at marked position for the eruption
      if (typeof TelegraphSystem !== 'undefined') {
        TelegraphSystem.create({ shape: 'circle', params: { cx: m._coldReadX, cy: m._coldReadY, radius: 80 }, delayFrames: 120, color: [60, 20, 80], owner: m.id });
      }
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._coldReadX = player.x;
  m._coldReadY = player.y;
  m._coldReadTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 80 }, delayFrames: 40, color: [120, 60, 160], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 11. House Pull — Creates pull vortex at self for 120 frames (hollow_ace)
MOB_SPECIALS.house_pull = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  // Active pull phase
  if (m._housePullTimer) {
    m._housePullTimer--;
    // Pull player toward mob each frame
    const dx = m.x - player.x, dy = m.y - player.y;
    const pdist = Math.sqrt(dx * dx + dy * dy);
    if (pdist < 250 && pdist > 30) {
      const pullStr = 1.8;
      player.x += (dx / pdist) * pullStr;
      player.y += (dy / pdist) * pullStr;
    }
    // Tick damage every 30 frames
    if (m._housePullTimer % 30 === 0 && pdist < 250) {
      const dmg = Math.round(12 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 10, type: "hit", dmg: dealt });
    }
    if (m._housePullTimer <= 0) {
      m._housePullTimer = false;
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._housePullTele) {
    m._housePullTele--;
    if (m._housePullTele <= 0) {
      m._housePullTimer = 120;
      hitEffects.push({ x: m.x, y: m.y - 20, life: 30, type: "cast" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._housePullTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 250 }, delayFrames: 50, color: [180, 100, 220], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// ===================== FLOOR 5 BOSS SPECIALS — ALCAZAR (FINAL BOSS) =====================

// 12. Corrupt Vessel — 5 corruption projectiles in fan spread (alcazar)
MOB_SPECIALS.corrupt_vessel = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Corruption puddle tracking
  if (m._corruptPuddles === undefined) m._corruptPuddles = [];
  m._corruptPuddles = m._corruptPuddles.filter(p => p.life > 0);
  for (const puddle of m._corruptPuddles) {
    puddle.life--;
    if (puddle.life % 25 === 0) {
      const dx = player.x - puddle.x, dy = player.y - puddle.y;
      if (Math.sqrt(dx * dx + dy * dy) < 50) {
        const dmg = Math.round(15 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('slow', { duration: 60, amount: 0.4 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 10, type: "hit", dmg: dealt });
      }
    }
  }
  if (m._corruptVesselTele) {
    m._corruptVesselTele--;
    if (m._corruptVesselTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const fanSpread = (30 * Math.PI) / 180; // ±30° for 5 projectiles
      for (let i = -2; i <= 2; i++) {
        const angle = dir + i * (fanSpread / 2);
        const spd = 7;
        bullets.push({
          id: nextBulletId++, x: m.x, y: m.y - 10,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          fromPlayer: false, mobBullet: true, damage: Math.round(40 * getMobDamageMultiplier()),
          ownerId: m.id, bulletColor: '#9944cc',
          onHitPlayer: () => {
            StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.5 });
            hitEffects.push({ x: player.x, y: player.y - 10, life: 20, type: "stun" });
          },
          onExpire: (b) => {
            m._corruptPuddles.push({ x: b.x, y: b.y, life: 240 });
            hitEffects.push({ x: b.x, y: b.y, life: 240, type: "cast" });
          },
        });
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._corruptVesselTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 60, range: 400 }, delayFrames: 55, color: [120, 40, 180], owner: m.id });
  }
  return { skip: true };
};

// 13. Black Benediction — Large circle on self, heals boss + damages/debuffs player (alcazar)
MOB_SPECIALS.black_benediction = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  if (m._benedictionTele) {
    m._benedictionTele--;
    if (m._benedictionTele <= 0) {
      // Heal boss 10% maxHP
      const maxHp = m.maxHp || (MOB_TYPES[m.type] && MOB_TYPES[m.type].hp) || 500;
      m.hp = Math.min(m.hp + Math.floor(maxHp * 0.10), m.maxHp);
      hitEffects.push({ x: m.x, y: m.y - 25, life: 30, type: "cast" });
      // Damage + debuff player if in range
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 160)) {
        const dmg = Math.round(50 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('silence', { duration: 120 });
        StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.5 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 25, type: "stun", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 420;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  // No range check — boss always has access to self-heal
  if (dist > 500) { m._specialTimer = 60; return {}; }
  m._benedictionTele = 70;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 160 }, delayFrames: 70, color: [60, 10, 100], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 25, life: 20, type: "cast" });
  return { skip: true };
};

// 14. Unsealing Maw — Circle on player → delayed tentacle eruption: heavy damage + root + hazard (alcazar)
MOB_SPECIALS.unsealing_maw = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Hazard zone tracking
  if (m._mawZones === undefined) m._mawZones = [];
  m._mawZones = m._mawZones.filter(z => z.life > 0);
  for (const zone of m._mawZones) {
    zone.life--;
    if (zone.life % 20 === 0) {
      const dx = player.x - zone.x, dy = player.y - zone.y;
      if (Math.sqrt(dx * dx + dy * dy) < 70) {
        const dmg = Math.round(18 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 10, type: "hit", dmg: dealt });
      }
    }
  }
  if (m._unsealingMawTele) {
    m._unsealingMawTele--;
    if (m._unsealingMawTele <= 0) {
      const dx = player.x - m._mawTargetX, dy = player.y - m._mawTargetY;
      if (Math.sqrt(dx * dx + dy * dy) < 90) {
        const dmg = Math.round(65 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        StatusFX.applyToPlayer('root', { duration: 120 });
        hitEffects.push({ x: player.x, y: player.y - 10, life: 25, type: "stun", dmg: dealt });
      }
      // Leave hazard zone at eruption point
      m._mawZones.push({ x: m._mawTargetX, y: m._mawTargetY, life: 300 });
      hitEffects.push({ x: m._mawTargetX, y: m._mawTargetY, life: 300, type: "cast" });
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._mawTargetX = player.x;
  m._mawTargetY = player.y;
  m._unsealingMawTele = 80;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 90 }, delayFrames: 80, color: [80, 10, 60], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 25, life: 20, type: "cast" });
  return { skip: true };
};
