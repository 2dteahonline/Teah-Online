// ===================== EARTH-216: SIN CITY MOB SPECIALS =====================
// Dungeon 6 — Vegas crime theme. Floor 1+2 specials.
// Appends to global MOB_SPECIALS (defined in combatSystem.js).

// ===================== FLOOR 1 REGULAR SPECIALS =====================

// 1. Chip Toss — projectile chip + slight slow (chip_runner)
MOB_SPECIALS.chip_toss = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._chipTossTele) {
    m._chipTossTele--;
    if (m._chipTossTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 9, vy: Math.sin(dir) * 9,
        fromPlayer: false, mobBullet: true, damage: Math.round(20 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#e8c44a',
        onHitPlayer: (b, hitTarget) => {
          StatusFX.applyToPlayer('slow', { duration: 60, amount: 0.4 });
          hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "hit" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._chipTossTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 280;
    const endY = m.y + Math.sin(dir) * 280;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 12 }, delayFrames: 35, color: [232, 196, 74], owner: m.id });
  }
  return { skip: true };
};

// 2. Pit Slam — circle telegraph at self + ground pound damage (pit_bruiser)
MOB_SPECIALS.pit_slam = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._pitSlamTele) {
    m._pitSlamTele--;
    if (m._pitSlamTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 120, player)) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 140) { m._specialTimer = 30; return {}; }
  m._pitSlamTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 120 }, delayFrames: 40, color: [180, 120, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 3. Velvet Slash — cone telegraph + bleed DoT (velvet_knifer)
MOB_SPECIALS.velvet_slash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 180;
  if (m._velvetSlashTele) {
    m._velvetSlashTele--;
    if (m._velvetSlashTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 100, player)) {
        const dmg = Math.round(25 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Bleed DoT — use slow as proxy + periodic damage ticks
        StatusFX.applyToPlayer('slow', { duration: 120, amount: 0.15 });
        m._bleedTarget = 120; // tick counter for visual bleed hits
      }
      m._specialTimer = m._specialCD || 180;
    }
    return { skip: true };
  }
  // Bleed tick damage
  if (m._bleedTarget && m._bleedTarget > 0) {
    m._bleedTarget--;
    if (m._bleedTarget % 30 === 0) {
      const bleedDmg = Math.round(5 * getMobDamageMultiplier());
      dealDamageToPlayer(bleedDmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 12, type: "hit" });
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 120) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._velvetSlashTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 100 }, delayFrames: 30, color: [180, 50, 60], owner: m.id });
  }
  return { skip: true };
};

// 4. Vault Leap — dash-pounce to player (vault_hound_e216)
MOB_SPECIALS.vault_leap = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  // Dash phase
  if (m._vaultLeapDash) {
    m._vaultLeapDash--;
    const t = 1 - (m._vaultLeapDash / 14);
    m.x = m._vaultSX + (m._vaultTX - m._vaultSX) * t;
    m.y = m._vaultSY + (m._vaultTY - m._vaultSY) * t;
    if (m._vaultLeapDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._vaultLeapDash = 0;
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._vaultLeapTele) {
    m._vaultLeapTele--;
    if (m._vaultLeapTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 220));
      m._vaultSX = m.x; m._vaultSY = m.y;
      m._vaultTX = clamped.x; m._vaultTY = clamped.y;
      m._vaultLeapDash = 14;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 260) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._vaultLeapTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 220);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 220);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 35, color: [160, 140, 100], owner: m.id });
  }
  return { skip: true };
};

// 5. Gilded Sweep — cone telegraph + pushback (gilded_maid)
MOB_SPECIALS.gilded_sweep = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 190;
  if (m._gildedSweepTele) {
    m._gildedSweepTele--;
    if (m._gildedSweepTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 3, 110, player)) {
        const dmg = Math.round(22 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 6, Math.sin(kbDir) * 6);
      }
      m._specialTimer = m._specialCD || 190;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 130) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._gildedSweepTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 120, range: 110 }, delayFrames: 35, color: [220, 190, 80], owner: m.id });
  }
  return { skip: true };
};

// 6. Venom Lunge — line dash + poison DoT (cashmere_viper)
MOB_SPECIALS.venom_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  // Dash phase
  if (m._venomLungeDash) {
    m._venomLungeDash--;
    const t = 1 - (m._venomLungeDash / 12);
    m.x = m._venomSX + (m._venomTX - m._venomSX) * t;
    m.y = m._venomSY + (m._venomTY - m._venomSY) * t;
    if (m._venomLungeDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 44, player)) {
        const dmg = Math.round(20 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Poison — slow as proxy + damage ticks
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.2 });
        m._poisonTarget = 90;
      }
      m._venomLungeDash = 0;
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  // Poison tick
  if (m._poisonTarget && m._poisonTarget > 0) {
    m._poisonTarget--;
    if (m._poisonTarget % 30 === 0) {
      const poisonDmg = Math.round(4 * getMobDamageMultiplier());
      dealDamageToPlayer(poisonDmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 12, type: "hit" });
    }
  }
  // Telegraph phase
  if (m._venomLungeTele) {
    m._venomLungeTele--;
    if (m._venomLungeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 200));
      m._venomSX = m.x; m._venomSY = m.y;
      m._venomTX = clamped.x; m._venomTY = clamped.y;
      m._venomLungeDash = 12;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 60 || dist > 240) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._venomLungeTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 200);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 200);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 16 }, delayFrames: 30, color: [80, 180, 60], owner: m.id });
  }
  return { skip: true };
};

// 7. Gem Bolt — homing gem projectile with slight tracking (jewel_wraith)
MOB_SPECIALS.gem_bolt = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._gemBoltTele) {
    m._gemBoltTele--;
    if (m._gemBoltTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 7, vy: Math.sin(dir) * 7,
        fromPlayer: false, mobBullet: true, damage: Math.round(28 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#aa44ff',
        life: 180,
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 320) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._gemBoltTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 320;
    const endY = m.y + Math.sin(dir) * 320;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 14 }, delayFrames: 40, color: [170, 68, 255], owner: m.id });
  }
  return { skip: true };
};

// 8. Bullion Charge — dash + shield bash + stun (bullion_knight)
MOB_SPECIALS.bullion_charge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 220;
  // Dash phase
  if (m._bullionDash) {
    m._bullionDash--;
    const t = 1 - (m._bullionDash / 16);
    m.x = m._bullionSX + (m._bullionTX - m._bullionSX) * t;
    m.y = m._bullionSY + (m._bullionTY - m._bullionSY) * t;
    if (m._bullionDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 52, player)) {
        const dmg = Math.round(32 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 60 });
        // Knockback
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 4, Math.sin(kbDir) * 4);
      }
      m._bullionDash = 0;
      m._specialTimer = m._specialCD || 220;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._bullionChargeTele) {
    m._bullionChargeTele--;
    if (m._bullionChargeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 240));
      m._bullionSX = m.x; m._bullionSY = m.y;
      m._bullionTX = clamped.x; m._bullionTY = clamped.y;
      m._bullionDash = 16;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 280) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._bullionChargeTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 240);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 240);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 26 }, delayFrames: 40, color: [220, 180, 50], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 1 BOSS SPECIALS =====================

// 9. Tribute Taken — gold shockwave line toward player (victor_graves)
MOB_SPECIALS.tribute_taken = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._tributeTele) {
    m._tributeTele--;
    if (m._tributeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      // Shockwave hits along the line
      const dx = player.x - m.x, dy = player.y - m.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 300) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Knockback away from boss
        const kbDir = Math.atan2(player.y - m.y, player.x - m.x);
        applyKnockback(Math.cos(kbDir) * 8, Math.sin(kbDir) * 8);
      }
      hitEffects.push({ x: m.x, y: m.y - 15, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 320) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._tributeTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 28 }, delayFrames: 45, color: [255, 215, 0], owner: m.id });
  }
  return { skip: true };
};

// 10. Call Collection — summon 2 temp thug minions (victor_graves)
MOB_SPECIALS.call_collection = (m, ctx) => {
  const { hitEffects, mobs } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;
  if (m._collectionTele) {
    m._collectionTele--;
    if (m._collectionTele <= 0) {
      m._summonedMinions = m._summonedMinions || [];
      // Remove dead/expired minions from tracking
      m._summonedMinions = m._summonedMinions.filter(id => {
        const minion = mobs.find(s => s.id === id);
        return minion && minion.hp > 0;
      });
      const activeCount = m._summonedMinions.length;
      if (activeCount < 4) {
        for (let i = 0; i < 2; i++) {
          const angle = (Math.PI * 2 / 2) * i;
          const sx = m.x + Math.cos(angle) * 60;
          const sy = m.y + Math.sin(angle) * 60;
          if (typeof positionClear !== 'undefined' && !positionClear(sx, sy)) continue;
          const minionId = nextMobId++;
          mobs.push({
            x: sx, y: sy, type: 'grunt', ai: 'grunt', id: minionId,
            hp: Math.round(m.maxHp * 0.1), maxHp: Math.round(m.maxHp * 0.1),
            speed: 2.2, damage: Math.round(m.damage * 0.35),
            contactRange: 30, skin: '#887766', hair: '#554433', shirt: '#443322', pants: '#332211',
            name: 'Thug', dir: 0, frame: 0, attackCooldown: 0,
            shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
            summonRate: 0, summonMax: 0, summonTimer: 0,
            arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
            _specials: null, _specialTimer: 0, _specialCD: 0, _abilityCDs: {},
            _cloaked: false, _cloakTimer: 0, _bombs: [], _mines: [],
            _summonOwnerId: m.id, _despawnTimer: 300,
            scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
          });
          m._summonedMinions.push(minionId);
          hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "cast" });
        }
      }
      hitEffects.push({ x: m.x, y: m.y - 30, life: 30, maxLife: 30, type: "cast" });
      m._specialTimer = m._specialCD || 480;
    }
    return { skip: true };
  }
  // Despawn timers ticked globally in mobSystem.js updateMobs()
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  m._collectionTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 80 }, delayFrames: 50, color: [200, 170, 80], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 11. Iron Debt — self-buff: damage +50% for 240 frames (victor_graves)
MOB_SPECIALS.iron_debt = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active buff phase
  if (m._ironDebtTimer && m._ironDebtTimer > 0) {
    m._ironDebtTimer--;
    if (m._ironDebtTimer <= 0) {
      m.damage = m._origDamage || m.damage;
      m._ironDebtActive = false;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  // Apply buff immediately
  m._origDamage = m.damage;
  m.damage = Math.round(m.damage * 1.5);
  m._ironDebtTimer = 240;
  m._ironDebtActive = true;
  hitEffects.push({ x: m.x, y: m.y - 25, life: 25, type: "cast" });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 40 }, delayFrames: 5, color: [200, 80, 60], owner: m.id });
  }
  m._specialTimer = m._specialCD || 360;
  return {};
};

// 12. Jackpot Bloom — 3 circle telegraphs at random spots near player, delayed damage (madame_midas)
MOB_SPECIALS.jackpot_bloom = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._jackpotTele) {
    m._jackpotTele--;
    if (m._jackpotTele <= 0) {
      // Check each stored bloom position
      for (let i = 0; i < m._bloomPositions.length; i++) {
        const bp = m._bloomPositions[i];
        const dx = player.x - bp.x, dy = player.y - bp.y;
        if (Math.sqrt(dx * dx + dy * dy) < 70) {
          const dmg = Math.round(30 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          break; // only hit once per bloom set
        }
      }
      for (const bp of m._bloomPositions) {
        hitEffects.push({ x: bp.x, y: bp.y, life: 20, type: "hit" });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._bloomPositions = [];
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 80;
    m._bloomPositions.push({ x: player.x + Math.cos(angle) * r, y: player.y + Math.sin(angle) * r });
  }
  m._jackpotTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    for (const bp of m._bloomPositions) {
      TelegraphSystem.create({ shape: 'circle', params: { cx: bp.x, cy: bp.y, radius: 70 }, delayFrames: 55, color: [255, 215, 0], owner: m.id });
    }
  }
  return { skip: true };
};

// 13. Crown of Debt — ring telegraph locks around player, slow 30% for 180 frames (madame_midas)
MOB_SPECIALS.crown_of_debt = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._crownTele) {
    m._crownTele--;
    if (m._crownTele <= 0) {
      const dx = player.x - m._crownTargetX, dy = player.y - m._crownTargetY;
      if (Math.sqrt(dx * dx + dy * dy) < 90) {
        StatusFX.applyToPlayer('slow', { duration: 180, amount: 0.3 });
        const dmg = Math.round(18 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "stun", dmg: dealt });
      }
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  m._crownTargetX = player.x;
  m._crownTargetY = player.y;
  m._crownTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'ring', params: { cx: player.x, cy: player.y, innerRadius: 50, outerRadius: 90 }, delayFrames: 50, color: [255, 200, 0], owner: m.id });
  }
  return { skip: true };
};

// 14. Touch of Midas — self-buff: damage reduction for 300 frames (madame_midas)
MOB_SPECIALS.touch_of_midas = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;
  // Active golden armor phase
  if (m._midasTimer && m._midasTimer > 0) {
    m._midasTimer--;
    if (m._midasTimer <= 0) {
      delete m._damageReduction;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._damageReduction = 0.4;
  m._midasTimer = 300;
  hitEffects.push({ x: m.x, y: m.y - 25, life: 30, type: "cast" });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 45 }, delayFrames: 5, color: [255, 215, 0], owner: m.id });
  }
  m._specialTimer = m._specialCD || 420;
  return {};
};

// ===================== FLOOR 2 REGULAR SPECIALS =====================

// 15. Scar Flurry — cone telegraph + 3-hit rapid melee (scar_punk)
MOB_SPECIALS.scar_flurry = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._scarFlurryTele) {
    m._scarFlurryTele--;
    if (m._scarFlurryTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 90, player)) {
        // 3 rapid damage ticks
        for (let i = 0; i < 3; i++) {
          const dmg = Math.round(12 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x + (Math.random() - 0.5) * 20, y: player.y - 10 + (Math.random() - 0.5) * 10, life: 15 + i * 4, type: "hit", dmg: dealt });
        }
      }
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 110) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._scarFlurryTele = 25;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 90 }, delayFrames: 25, color: [200, 60, 60], owner: m.id });
  }
  return { skip: true };
};

// 16. Jaw Lunge — short dash + bite + bleed (splitjaw)
MOB_SPECIALS.jaw_lunge = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 190;
  // Dash phase
  if (m._jawLungeDash) {
    m._jawLungeDash--;
    const t = 1 - (m._jawLungeDash / 10);
    m.x = m._jawSX + (m._jawTX - m._jawSX) * t;
    m.y = m._jawSY + (m._jawTY - m._jawSY) * t;
    if (m._jawLungeDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 44, player)) {
        const dmg = Math.round(28 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.2 });
        m._jawBleedTick = 90;
      }
      m._jawLungeDash = 0;
      m._specialTimer = m._specialCD || 190;
    }
    return { skip: true };
  }
  // Bleed tick
  if (m._jawBleedTick && m._jawBleedTick > 0) {
    m._jawBleedTick--;
    if (m._jawBleedTick % 30 === 0) {
      const bleedDmg = Math.round(4 * getMobDamageMultiplier());
      dealDamageToPlayer(bleedDmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 12, type: "hit" });
    }
  }
  // Telegraph phase
  if (m._jawLungeTele) {
    m._jawLungeTele--;
    if (m._jawLungeTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 20, 160));
      m._jawSX = m.x; m._jawSY = m.y;
      m._jawTX = clamped.x; m._jawTY = clamped.y;
      m._jawLungeDash = 10;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 50 || dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._jawLungeTele = 28;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 20, 160);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 20, 160);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 18 }, delayFrames: 28, color: [180, 60, 50], owner: m.id });
  }
  return { skip: true };
};

// 17. Razor Sprint — dash-through + damage trail (razorback_youth)
MOB_SPECIALS.razor_sprint = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  // Dash phase
  if (m._razorSprintDash) {
    m._razorSprintDash--;
    const t = 1 - (m._razorSprintDash / 16);
    m.x = m._razorSX + (m._razorTX - m._razorSX) * t;
    m.y = m._razorSY + (m._razorTY - m._razorSY) * t;
    // Leave damage trail hazard every 4 frames
    if (m._razorSprintDash % 4 === 0) {
      hitEffects.push({ x: m.x, y: m.y, life: 60, type: "smoke" });
    }
    if (m._razorSprintDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 48, player)) {
        const dmg = Math.round(26 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._razorSprintDash = 0;
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._razorSprintTele) {
    m._razorSprintTele--;
    if (m._razorSprintTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 40, 260));
      m._razorSX = m.x; m._razorSY = m.y;
      m._razorTX = clamped.x; m._razorTY = clamped.y;
      m._razorSprintDash = 16;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._razorSprintTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 40, 260);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 40, 260);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 20 }, delayFrames: 30, color: [180, 100, 80], owner: m.id });
  }
  return { skip: true };
};

// 18. Stitch Bomb — circle telegraph at player pos, delayed explosion (grin_stitcher)
MOB_SPECIALS.stitch_bomb = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 220;
  if (m._stitchBombTele) {
    m._stitchBombTele--;
    if (m._stitchBombTele <= 0) {
      const dx = player.x - m._stitchTargetX, dy = player.y - m._stitchTargetY;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        const dmg = Math.round(35 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m._stitchTargetX, y: m._stitchTargetY, life: 25, type: "hit" });
      m._specialTimer = m._specialCD || 220;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 280) { m._specialTimer = 30; return {}; }
  m._stitchTargetX = player.x;
  m._stitchTargetY = player.y;
  m._stitchBombTele = 55;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 80 }, delayFrames: 55, color: [200, 80, 120], owner: m.id });
  }
  return { skip: true };
};

// 19. Shade Note — projectile that creates silence zone on landing (chorus_shade)
MOB_SPECIALS.shade_note = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._shadeNoteTele) {
    m._shadeNoteTele--;
    if (m._shadeNoteTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 8, vy: Math.sin(dir) * 8,
        fromPlayer: false, mobBullet: true, damage: Math.round(18 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#8844aa',
        onHitPlayer: (b, hitTarget) => {
          StatusFX.applyToPlayer('silence', { duration: 120 });
          hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "stun" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._shadeNoteTele = 35;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 14 }, delayFrames: 35, color: [136, 68, 170], owner: m.id });
  }
  return { skip: true };
};

// 20. Spotlight Dash — mark player pos, after delay dash to mark (spotlight_stalker)
MOB_SPECIALS.spotlight_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 220;
  // Dash phase
  if (m._spotlightDash) {
    m._spotlightDash--;
    const t = 1 - (m._spotlightDash / 14);
    m.x = m._spotSX + (m._spotTX - m._spotSX) * t;
    m.y = m._spotSY + (m._spotTY - m._spotSY) * t;
    if (m._spotlightDash <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
        const dmg = Math.round(30 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      m._spotlightDash = 0;
      m._specialTimer = m._specialCD || 220;
    }
    return { skip: true };
  }
  // Telegraph phase — waits then initiates dash to marked position
  if (m._spotlightTele) {
    m._spotlightTele--;
    if (m._spotlightTele <= 0) {
      const dir = Math.atan2(m._spotMarkY - m.y, m._spotMarkX - m.x);
      const d = Math.sqrt((m._spotMarkX - m.x) ** 2 + (m._spotMarkY - m.y) ** 2);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(d + 10, 300));
      m._spotSX = m.x; m._spotSY = m.y;
      m._spotTX = clamped.x; m._spotTY = clamped.y;
      m._spotlightDash = 14;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 320) { m._specialTimer = 30; return {}; }
  // Mark player's current position
  m._spotMarkX = player.x;
  m._spotMarkY = player.y;
  m._spotlightTele = 50;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 50 }, delayFrames: 50, color: [255, 240, 100], owner: m.id });
  }
  return { skip: true };
};

// 21. Mourning Wail — circle AoE around self + slow (velvet_mourner)
MOB_SPECIALS.mourning_wail = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 210;
  if (m._mourningTele) {
    m._mourningTele--;
    if (m._mourningTele <= 0) {
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 130, player)) {
        const dmg = Math.round(22 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('slow', { duration: 90, amount: 0.35 });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "cast" });
      m._specialTimer = m._specialCD || 210;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 150) { m._specialTimer = 30; return {}; }
  m._mourningTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 130 }, delayFrames: 40, color: [120, 80, 160], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 22. Static Shot — chain-lightning arrow, projectile that stuns (static_tenor)
MOB_SPECIALS.static_shot = (m, ctx) => {
  const { player, dist, hitEffects, bullets } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 200;
  if (m._staticShotTele) {
    m._staticShotTele--;
    if (m._staticShotTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      bullets.push({
        id: nextBulletId++, x: m.x, y: m.y - 8,
        vx: Math.cos(dir) * 11, vy: Math.sin(dir) * 11,
        fromPlayer: false, mobBullet: true, damage: Math.round(24 * getMobDamageMultiplier()),
        ownerId: m.id, bulletColor: '#66ccff',
        onHitPlayer: (b, hitTarget) => {
          StatusFX.applyToPlayer('stun', { duration: 45 });
          hitEffects.push({ x: hitTarget.x, y: hitTarget.y - 10, life: 20, type: "stun" });
        },
      });
      hitEffects.push({ x: m.x, y: m.y - 15, life: 12, type: "cast" });
      m._specialTimer = m._specialCD || 200;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 300) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._staticShotTele = 30;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * 300;
    const endY = m.y + Math.sin(dir) * 300;
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 12 }, delayFrames: 30, color: [100, 200, 255], owner: m.id });
  }
  return { skip: true };
};

// ===================== FLOOR 2 BOSS SPECIALS =====================

// 23. Total Blackout — blind effect on player + boss speed buff (blackout_belle)
MOB_SPECIALS.total_blackout = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  if (m._blackoutTele) {
    m._blackoutTele--;
    if (m._blackoutTele <= 0) {
      StatusFX.applyToPlayer('blind', { duration: 180 });
      hitEffects.push({ x: player.x, y: player.y - 10, life: 25, type: "stun" });
      // Speed buff
      if (!m._blackoutSpeedActive) {
        m._origSpeed = m.speed;
        m.speed = m.speed * 1.4;
        m._blackoutSpeedActive = true;
        m._blackoutSpeedTimer = 180;
      }
      hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "cast" });
      m._specialTimer = m._specialCD || 360;
    }
    return { skip: true };
  }
  // Tick speed buff timer
  if (m._blackoutSpeedActive && m._blackoutSpeedTimer !== undefined) {
    m._blackoutSpeedTimer--;
    if (m._blackoutSpeedTimer <= 0) {
      m.speed = m._origSpeed || m.speed;
      m._blackoutSpeedActive = false;
    }
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  m._blackoutTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 400 }, delayFrames: 40, color: [40, 20, 60], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};

// 24. Feedback Kiss — cone telegraph, sonic blast damage + slow (blackout_belle)
MOB_SPECIALS.feedback_kiss = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  if (m._feedbackTele) {
    m._feedbackTele--;
    if (m._feedbackTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      if (typeof AttackShapes !== 'undefined' && AttackShapes.playerInCone(m.x, m.y, dir, Math.PI / 4, 180, player)) {
        const dmg = Math.round(40 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('slow', { duration: 180, amount: 0.35 });
      }
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 200) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._feedbackTele = 40;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'cone', params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 180 }, delayFrames: 40, color: [180, 60, 200], owner: m.id });
  }
  return { skip: true };
};

// 25. Dead Applause — 4-5 delayed circle telegraphs converging on player position (blackout_belle)
MOB_SPECIALS.dead_applause = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  if (m._applauseTele) {
    m._applauseTele--;
    if (m._applauseTele <= 0) {
      for (const ap of m._applausePositions) {
        const dx = player.x - ap.x, dy = player.y - ap.y;
        if (Math.sqrt(dx * dx + dy * dy) < 65) {
          const dmg = Math.round(28 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          break; // only hit once
        }
      }
      for (const ap of m._applausePositions) {
        hitEffects.push({ x: ap.x, y: ap.y, life: 20, type: "hit" });
      }
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  const count = 4 + Math.floor(Math.random() * 2); // 4-5
  m._applausePositions = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 / count) * i + Math.random() * 0.4;
    const r = 20 + Math.random() * 70;
    m._applausePositions.push({ x: player.x + Math.cos(angle) * r, y: player.y + Math.sin(angle) * r });
  }
  m._applauseTele = 60;
  if (typeof TelegraphSystem !== 'undefined') {
    for (const ap of m._applausePositions) {
      TelegraphSystem.create({ shape: 'circle', params: { cx: ap.x, cy: ap.y, radius: 65 }, delayFrames: 60, color: [160, 40, 180], owner: m.id });
    }
  }
  return { skip: true };
};

// 26. Carnage Arm — self-buff: melee range and damage +30% for 240 frames (slasher_e216)
MOB_SPECIALS.carnage_arm = (m, ctx) => {
  const { dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;
  // Active buff phase
  if (m._carnageTimer && m._carnageTimer > 0) {
    m._carnageTimer--;
    if (m._carnageTimer <= 0) {
      m.damage = m._origDamage || m.damage;
      m.contactRange = m._origContactRange || m.contactRange;
      m._carnageActive = false;
    }
    return {};
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 350) { m._specialTimer = 30; return {}; }
  m._origDamage = m.damage;
  m._origContactRange = m.contactRange;
  m.damage = Math.round(m.damage * 1.3);
  m.contactRange = Math.round(m.contactRange * 1.3);
  m._carnageTimer = 240;
  m._carnageActive = true;
  hitEffects.push({ x: m.x, y: m.y - 25, life: 25, type: "cast" });
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: m.x, cy: m.y, radius: 45 }, delayFrames: 5, color: [200, 40, 40], owner: m.id });
  }
  m._specialTimer = m._specialCD || 360;
  return {};
};

// 27. Blood Trail Dash — line telegraph, dash through player, leave damage trail (slasher_e216)
MOB_SPECIALS.blood_trail_dash = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 240;
  // Dash phase
  if (m._bloodTrailDash) {
    m._bloodTrailDash--;
    const t = 1 - (m._bloodTrailDash / 18);
    m.x = m._bloodSX + (m._bloodTX - m._bloodSX) * t;
    m.y = m._bloodSY + (m._bloodTY - m._bloodSY) * t;
    // Damage trail every 3 frames
    if (m._bloodTrailDash % 3 === 0) {
      hitEffects.push({ x: m.x, y: m.y, life: 80, type: "smoke" });
    }
    // Hit player during dash
    if (m._bloodTrailDash === 9 && typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 50, player)) {
      const dmg = Math.round(38 * getMobDamageMultiplier());
      const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
      hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
    }
    if (m._bloodTrailDash <= 0) {
      m._bloodTrailDash = 0;
      m._specialTimer = m._specialCD || 240;
    }
    return { skip: true };
  }
  // Telegraph phase
  if (m._bloodTrailTele) {
    m._bloodTrailTele--;
    if (m._bloodTrailTele <= 0) {
      const dir = Math.atan2(player.y - m.y, player.x - m.x);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(dist + 60, 320));
      m._bloodSX = m.x; m._bloodSY = m.y;
      m._bloodTX = clamped.x; m._bloodTY = clamped.y;
      m._bloodTrailDash = 18;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist < 80 || dist > 350) { m._specialTimer = 30; return {}; }
  const dir = Math.atan2(player.y - m.y, player.x - m.x);
  m._bloodTrailTele = 45;
  if (typeof TelegraphSystem !== 'undefined') {
    const endX = m.x + Math.cos(dir) * Math.min(dist + 60, 320);
    const endY = m.y + Math.sin(dir) * Math.min(dist + 60, 320);
    TelegraphSystem.create({ shape: 'line', params: { x1: m.x, y1: m.y, x2: endX, y2: endY, width: 24 }, delayFrames: 45, color: [180, 30, 30], owner: m.id });
  }
  return { skip: true };
};

// 28. Predator Lock — mark player pos, after 90 frames leap to mark + AoE (slasher_e216)
MOB_SPECIALS.predator_lock = (m, ctx) => {
  const { player, dist, hitEffects } = ctx;
  if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 300;
  // Leap phase
  if (m._predatorLeap) {
    m._predatorLeap--;
    const t = 1 - (m._predatorLeap / 16);
    m.x = m._predSX + (m._predTX - m._predSX) * t;
    m.y = m._predSY + (m._predTY - m._predSY) * t;
    if (m._predatorLeap <= 0) {
      // AoE at landing
      if (typeof AttackShapes !== 'undefined' && AttackShapes.hitsPlayer(m.x, m.y, 80, player)) {
        const dmg = Math.round(42 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
      }
      hitEffects.push({ x: m.x, y: m.y, life: 25, type: "hit" });
      m._predatorLeap = 0;
      m._specialTimer = m._specialCD || 300;
    }
    return { skip: true };
  }
  // Telegraph phase — waits then leaps to marked position
  if (m._predatorTele) {
    m._predatorTele--;
    if (m._predatorTele <= 0) {
      const dir = Math.atan2(m._predMarkY - m.y, m._predMarkX - m.x);
      const d = Math.sqrt((m._predMarkX - m.x) ** 2 + (m._predMarkY - m.y) ** 2);
      const clamped = clampDashTarget(m.x, m.y, dir, Math.min(d + 10, 350));
      m._predSX = m.x; m._predSY = m.y;
      m._predTX = clamped.x; m._predTY = clamped.y;
      m._predatorLeap = 16;
      hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "smoke" });
    }
    return { skip: true };
  }
  if (m._specialTimer > 0) { m._specialTimer--; return {}; }
  if (dist > 400) { m._specialTimer = 30; return {}; }
  // Mark player position
  m._predMarkX = player.x;
  m._predMarkY = player.y;
  m._predatorTele = 90;
  if (typeof TelegraphSystem !== 'undefined') {
    TelegraphSystem.create({ shape: 'circle', params: { cx: player.x, cy: player.y, radius: 80 }, delayFrames: 90, color: [200, 30, 30], owner: m.id });
  }
  hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
  return { skip: true };
};
