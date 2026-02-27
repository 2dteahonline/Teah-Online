// ===================== COMBAT SYSTEM =====================
// Authority: StatusFX, MOB_AI, MOB_SPECIALS
// Extracted from index_2.html — Phase B

// ===================== STATUS EFFECTS SYSTEM =====================
// Centralized status effect management for mobs and player.
// Adding a new effect = add entry to registry + it just works.
const StatusFX = {
  // ---- MOB EFFECT REGISTRY ----
  // Each effect defines: apply(mob, params), tick(mob) → returns {skip:true} to block movement
  mobEffects: {
    frost: {
      apply(mob, params) {
        mob.frostTimer = params.duration || 90;
        mob.frostSlow = params.slow || 0.25;
      },
      tick(mob) {
        if (mob.frostTimer > 0) {
          mob.frostTimer--;
          return { speedMult: 1 - (mob.frostSlow || 0.3) };
        }
        return null;
      },
    },
    burn: {
      apply(mob, params) {
        mob.burnTimer = params.duration || 180;
        mob.burnDmg = params.dmg || 11;
        mob.burnTick = 0;
      },
      tick(mob) {
        if (mob.burnTimer > 0) {
          mob.burnTick = (mob.burnTick || 0) + 1;
          if (mob.burnTick >= 60) {
            mob.burnTick = 0;
            hitEffects.push({ x: mob.x, y: mob.y - 20, life: 15, type: "burn_tick", dmg: mob.burnDmg });
            dealDamageToMob(mob, mob.burnDmg, "burn_dot");
          }
          mob.burnTimer--;
        }
        return null;
      },
    },
    stagger: {
      apply(mob, params) {
        mob.staggerTimer = params.duration || 30;
      },
      tick(mob) {
        if (mob.staggerTimer > 0) { mob.staggerTimer--; return { skip: true }; }
        return null;
      },
    },
    stun: {
      apply(mob, params) {
        mob.stunTimer = params.duration || 60;
      },
      tick(mob) {
        if (mob.stunTimer > 0) { mob.stunTimer--; return { skip: true }; }
        return null;
      },
    },
    root: {
      apply(mob, params) {
        mob.rootTimer = params.duration || 42; // ~0.7s default
      },
      tick(mob) {
        if (mob.rootTimer > 0) { mob.rootTimer--; return { skip: true }; }
        return null;
      },
    },
    mark: {
      apply(mob, params) {
        mob.markTimer = params.duration || 240; // 4s default
        mob.markBonus = params.bonus || 0.15;   // +15% dmg taken
      },
      tick(mob) {
        if (mob.markTimer > 0) {
          mob.markTimer--;
          return { dmgMult: 1 + (mob.markBonus || 0.15) };
        }
        return null;
      },
    },
    silence: {
      apply(mob, params) {
        mob.silenceTimer = params.duration || 90; // 1.5s default
      },
      tick(mob) {
        if (mob.silenceTimer > 0) { mob.silenceTimer--; return { silence: true }; }
        return null;
      },
    },
  },

  // ---- PLAYER STATUS EFFECTS ----
  // Player-targeted effects from mob specials (separate from mob effects above)
  playerEffects: {
    _slow: 0,      // speed multiplier reduction (0 = none)
    _slowTimer: 0,
    _root: false,
    _rootTimer: 0,
    _mark: false,
    _markTimer: 0,
    _markBonus: 0,
    _silence: false,
    _silenceTimer: 0,
    _bleed: false,       // bleed DoT (Floor 5)
    _bleedTimer: 0,
    _bleedDmg: 0,
    _bleedTick: 0,
    _confuse: false,     // swap movement directions (Floor 4)
    _confuseTimer: 0,
    _disorient: false,   // random drift added to movement (Floor 5)
    _disorientTimer: 0,
  },

  applyToPlayer(effectId, params = {}) {
    const pe = this.playerEffects;
    switch (effectId) {
      case 'slow':
        pe._slow = params.amount || 0.35;
        pe._slowTimer = params.duration || 240;
        break;
      case 'root':
        pe._root = true;
        pe._rootTimer = params.duration || 42;
        break;
      case 'mark':
        pe._mark = true;
        pe._markTimer = params.duration || 240;
        pe._markBonus = params.bonus || 0.15;
        break;
      case 'silence':
        pe._silence = true;
        pe._silenceTimer = params.duration || 90;
        break;
      case 'stun':
        pe._root = true; // stun = root + no action
        pe._rootTimer = params.duration || 36;
        break;
      case 'bleed':
        pe._bleed = true;
        pe._bleedTimer = params.duration || 240; // 4s default
        pe._bleedDmg = params.dmg || 3;
        pe._bleedTick = 0;
        break;
      case 'confuse':
        pe._confuse = true;
        pe._confuseTimer = params.duration || 72; // 1.2s default
        break;
      case 'disorient':
        pe._disorient = true;
        pe._disorientTimer = params.duration || 60; // 1s default
        break;
    }
  },

  tickPlayer() {
    const pe = this.playerEffects;
    let speedMult = 1.0;
    let rooted = false;

    if (pe._slowTimer > 0) {
      pe._slowTimer--;
      speedMult *= (1 - pe._slow);
      if (pe._slowTimer <= 0) pe._slow = 0;
    }
    if (pe._rootTimer > 0) {
      pe._rootTimer--;
      rooted = pe._root;
      if (pe._rootTimer <= 0) pe._root = false;
    }
    if (pe._markTimer > 0) {
      pe._markTimer--;
      if (pe._markTimer <= 0) { pe._mark = false; pe._markBonus = 0; }
    }
    if (pe._silenceTimer > 0) {
      pe._silenceTimer--;
      if (pe._silenceTimer <= 0) pe._silence = false;
    }
    if (pe._bleedTimer > 0) {
      pe._bleedTimer--;
      pe._bleedTick++;
      if (pe._bleedTick >= 60) { // tick every 1s
        pe._bleedTick = 0;
        if (typeof dealDamageToPlayer === 'function') {
          dealDamageToPlayer(pe._bleedDmg, 'dot', null);
          hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: "bleed_tick" });
        }
      }
      if (pe._bleedTimer <= 0) { pe._bleed = false; pe._bleedDmg = 0; pe._bleedTick = 0; }
    }
    if (pe._confuseTimer > 0) {
      pe._confuseTimer--;
      if (pe._confuseTimer <= 0) pe._confuse = false;
    }
    if (pe._disorientTimer > 0) {
      pe._disorientTimer--;
      if (pe._disorientTimer <= 0) pe._disorient = false;
    }
    return { speedMult, rooted, marked: pe._mark, markBonus: pe._markBonus, silenced: pe._silence, confused: pe._confuse, disoriented: pe._disorient, bleeding: pe._bleed };
  },

  clearPlayer() {
    const pe = this.playerEffects;
    pe._slow = 0; pe._slowTimer = 0;
    pe._root = false; pe._rootTimer = 0;
    pe._mark = false; pe._markTimer = 0; pe._markBonus = 0;
    pe._silence = false; pe._silenceTimer = 0;
    pe._bleed = false; pe._bleedTimer = 0; pe._bleedDmg = 0; pe._bleedTick = 0;
    pe._confuse = false; pe._confuseTimer = 0;
    pe._disorient = false; pe._disorientTimer = 0;
  },

  // Apply a status effect to a mob
  applyToMob(mob, effectId, params = {}) {
    const fx = this.mobEffects[effectId];
    if (fx) fx.apply(mob, params);
  },

  // Tick all effects on a mob. Returns { skip, speedMult }
  tickMob(mob) {
    let skip = false;
    let speedMult = 1.0;
    for (const id in this.mobEffects) {
      const result = this.mobEffects[id].tick(mob);
      if (result) {
        if (result.skip) skip = true;
        if (result.speedMult !== undefined) speedMult *= result.speedMult;
      }
    }
    return { skip, speedMult };
  },

  // Clear all effects from a mob
  clearMob(mob) {
    mob.frostTimer = 0; mob.frostSlow = 0;
    mob.burnTimer = 0; mob.burnDmg = 0; mob.burnTick = 0;
    mob.staggerTimer = 0; mob.stunTimer = 0;
    mob.rootTimer = 0;
    mob.markTimer = 0; mob.markBonus = 0;
    mob.silenceTimer = 0;
  },

  // ---- PLAYER EFFECTS ----
  // Player poison (the main player debuff)
  applyPoison(duration) {
    poisonTimer = duration;
    poisonTickTimer = 0;
  },
  clearPoison() { poisonTimer = 0; poisonTickTimer = 0; },
  hasPoison() { return poisonTimer > 0; },

  // Tick player poison. Called from game loop.
  tickPlayerPoison() {
    if (poisonTimer <= 0 || playerDead) return;
    poisonTimer--;
    poisonTickTimer++;
    if (poisonTickTimer >= 60) {
      poisonTickTimer = 0;
      const absorbRate = getAbsorb();
      const poisonReduce = getPoisonReduction();
      if (poisonReduce >= 1.0) {
        const healAmt = Math.max(1, Math.round(2 * (1 + absorbRate * 10)));
        player.hp = Math.min(player.maxHp, player.hp + healAmt);
        hitEffects.push({ x: player.x + (Math.random()-0.5)*20, y: player.y - 30, life: 20, type: "heal", dmg: "+" + healAmt });
        poisonTimer = 0;
      } else {
        const statusMult = 1 - getStatusReduction();
        const poisonDmg = Math.max(0, Math.round(1 * statusMult));
        if (poisonDmg > 0) {
          dealDamageToPlayer(poisonDmg, "dot", null);
          hitEffects.push({ x: player.x + (Math.random()-0.5)*20, y: player.y - 30 + (Math.random()-0.5)*10, life: 20, type: "poison_tick" });
        }
      }
    }
  },
};

// MOB_TYPES, MOB_CAPS, CROWD_EXEMPT_TYPES → js/shared/mobTypes.js

// ===================== MOB AI REGISTRY =====================
// Each mob type defines how it picks a movement target.
// Returns { targetX, targetY } given mob and context.

const MOB_AI = {
  crowded: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY, mapCenterX, mapCenterY } = ctx;
    let targetX, targetY;
    const cutoffX = player.x + (mapCenterX - player.x) * 0.35;
    const cutoffY = player.y + (mapCenterY - player.y) * 0.35;
    if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
      const pf = dist / Math.max(m.speed, 0.5) * 0.5;
      targetX = cutoffX + playerVelX * pf;
      targetY = cutoffY + playerVelY * pf;
    } else { targetX = cutoffX; targetY = cutoffY; }
    const sa = ((m.id % 8) - 3.5) * 0.5;
    const c = Math.cos(sa), s = Math.sin(sa);
    const rx = targetX - m.x, ry = targetY - m.y;
    targetX = m.x + rx * c - ry * s;
    targetY = m.y + rx * s + ry * c;
    return { targetX, targetY };
  },

  runner: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY, mapCenterX, mapCenterY, amBetween } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 50) {
      if (amBetween || dist < 150) {
        targetX = player.x; targetY = player.y;
        if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
          const pf = dist / Math.max(m.speed, 0.5) * 0.6;
          targetX += playerVelX * pf; targetY += playerVelY * pf;
        }
      } else {
        const cutoffX = player.x + (mapCenterX - player.x) * 0.35;
        const cutoffY = player.y + (mapCenterY - player.y) * 0.35;
        if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
          const pf = dist / Math.max(m.speed, 0.5) * 0.7;
          targetX = cutoffX + playerVelX * pf; targetY = cutoffY + playerVelY * pf;
        } else { targetX = cutoffX; targetY = cutoffY; }
      }
      const sa = ((m.id % 6) - 2.5) * 0.35;
      const c = Math.cos(sa), s = Math.sin(sa);
      const rx = targetX - m.x, ry = targetY - m.y;
      targetX = m.x + rx * c - ry * s; targetY = m.y + rx * s + ry * c;
    }
    return { targetX, targetY };
  },

  grunt: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 40) {
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = dist / Math.max(m.speed, 0.5) * 0.3;
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
      const ga = ((m.id % 4) - 1.5) * 0.3;
      const gc = Math.cos(ga), gs = Math.sin(ga);
      const gx = targetX - m.x, gy = targetY - m.y;
      targetX = m.x + gx * gc - gy * gs; targetY = m.y + gx * gs + gy * gc;
    }
    return { targetX, targetY };
  },

  tank: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 40) {
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = dist / Math.max(m.speed, 0.5) * 0.5;
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
      const ta = ((m.id % 5) - 2) * 0.4;
      const tc = Math.cos(ta), ts = Math.sin(ta);
      const tx2 = targetX - m.x, ty2 = targetY - m.y;
      targetX = m.x + tx2 * tc - ty2 * ts; targetY = m.y + tx2 * ts + ty2 * tc;
    }
    return { targetX, targetY };
  },

  witch: (m, ctx) => {
    const { player, dist, dx, dy, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 70) {
      const idealDist = (MOB_TYPES[m.type] && MOB_TYPES[m.type].kiteRange) || 160;
      if (dist > idealDist) {
        targetX = player.x; targetY = player.y;
      } else if (dist < idealDist * 0.5) {
        const awayX = m.x - dx / dist * 30, awayY = m.y - dy / dist * 30;
        const circleAngle = ((m.id % 3) - 1) * 0.6;
        const wc = Math.cos(circleAngle), ws = Math.sin(circleAngle);
        targetX = m.x + (awayX - m.x) * wc - (awayY - m.y) * ws;
        targetY = m.y + (awayX - m.x) * ws + (awayY - m.y) * wc;
      } else {
        const perpX = -dy / dist, perpY = dx / dist;
        const circleDir = (m.id % 2 === 0) ? 1 : -1;
        targetX = player.x + (-dx / dist) * idealDist + perpX * 60 * circleDir;
        targetY = player.y + (-dy / dist) * idealDist + perpY * 60 * circleDir;
      }
    }
    return { targetX, targetY };
  },

  mummy: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 40) {
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = dist / Math.max(m.speed, 0.5) * 0.5;
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
      const ma = ((m.id % 3) - 1) * 0.45;
      const mc = Math.cos(ma), ms2 = Math.sin(ma);
      const mx2 = targetX - m.x, my2 = targetY - m.y;
      targetX = m.x + mx2 * mc - my2 * ms2; targetY = m.y + mx2 * ms2 + my2 * mc;
    }
    return { targetX, targetY };
  },

  skeleton: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 30) {
      const swarmAngle = (m.id % 8) * (Math.PI * 2 / 8);
      const swarmDist = 40;
      targetX = player.x + Math.cos(swarmAngle) * swarmDist;
      targetY = player.y + Math.sin(swarmAngle) * swarmDist;
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = dist / Math.max(m.speed, 0.5) * 0.4;
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
    }
    return { targetX, targetY };
  },

  golem: (m, ctx) => {
    const { player, dist, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 40) {
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = Math.min(dist / Math.max(m.speed, 0.5) * 0.4, 60);
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
    }
    return { targetX, targetY };
  },

  mini_golem: (m, ctx) => {
    // Same relentless pursuit as big golem but slightly less predictive
    const { player, dist, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    if (dist > 30) {
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = Math.min(dist / Math.max(m.speed, 0.5) * 0.3, 40);
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
    }
    return { targetX, targetY };
  },

  healer: (m, ctx) => {
    const { player, dist, dx, dy, mobs } = ctx;
    let targetX = player.x, targetY = player.y;
    const idealDist = 300;
    let nearestAlly = null, nearestAllyDist = Infinity;
    for (const ally of mobs) {
      if (ally === m || ally.hp <= 0 || ally.type === "healer" || ally.type === "skeleton") continue;
      const adx = m.x - ally.x, ady = m.y - ally.y;
      const ad = Math.sqrt(adx * adx + ady * ady);
      if (ad < nearestAllyDist) { nearestAllyDist = ad; nearestAlly = ally; }
    }
    if (dist < 160) {
      targetX = m.x - dx / dist * 100; targetY = m.y - dy / dist * 100;
    } else if (nearestAlly && nearestAllyDist > 100) {
      const aDx = nearestAlly.x - player.x, aDy = nearestAlly.y - player.y;
      const aD = Math.sqrt(aDx * aDx + aDy * aDy) || 1;
      targetX = nearestAlly.x + (aDx / aD) * 60; targetY = nearestAlly.y + (aDy / aD) * 60;
    } else if (dist < idealDist) {
      targetX = m.x - dx / dist * 50; targetY = m.y - dy / dist * 50;
    } else {
      if (nearestAlly) { targetX = nearestAlly.x; targetY = nearestAlly.y; }
    }
    return { targetX, targetY };
  },

  archer: (m, ctx) => {
    const { player, dist, dx, dy, playerVelX, playerVelY } = ctx;
    let targetX = player.x, targetY = player.y;
    const idealDist = 350;
    if (dist < 180) {
      targetX = m.x - dx / dist * 120; targetY = m.y - dy / dist * 120;
    } else if (dist < idealDist * 0.7) {
      const awayX = m.x - dx / dist * 60, awayY = m.y - dy / dist * 60;
      const perpX = -dy / dist, perpY = dx / dist;
      const circleDir = (m.id % 2 === 0) ? 1 : -1;
      targetX = awayX + perpX * 40 * circleDir; targetY = awayY + perpY * 40 * circleDir;
    } else if (dist > idealDist * 1.4) {
      if (Math.abs(playerVelX) > 0.3 || Math.abs(playerVelY) > 0.3) {
        const pf = dist / Math.max(m.speed, 0.5) * 0.4;
        targetX += playerVelX * pf; targetY += playerVelY * pf;
      }
    } else {
      const perpX = -dy / dist, perpY = dx / dist;
      const circleDir = (m.id % 2 === 0) ? 1 : -1;
      targetX = player.x + (-dx / dist) * idealDist + perpX * 100 * circleDir;
      targetY = player.y + (-dy / dist) * idealDist + perpY * 100 * circleDir;
    }
    return { targetX, targetY };
  },
};

// ===================== MOB SPECIALS REGISTRY =====================
// Each mob type with a special attack defines an update function.
// Returns { skip: true } if the mob should skip the rest of its update (e.g. mummy explodes).
const MOB_SPECIALS = {
  witch: (m, ctx) => {
    const { mobs, hitEffects, wave } = ctx;
    if (m.summonRate <= 0) return {};
    if (m.castTimer > 0) {
      m.castTimer--;
      if (m.castTimer <= 0) {
        const smt = MOB_TYPES.skeleton;
        const hpMult = getWaveHPMultiplier(wave);
        const spdMult = getWaveSpeedMultiplier(wave);
        const skeleCount = mobs.filter(s => s.witchId === m.id && s.hp > 0).length;
        const toSpawn = Math.min(2, m.summonMax - skeleCount);
        for (let si = 0; si < toSpawn; si++) {
          let sx, sy, foundClear = false;
          for (let attempt = 0; attempt < 20; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = 80 + Math.random() * 60;
            sx = m.x + Math.cos(angle) * spawnDist;
            sy = m.y + Math.sin(angle) * spawnDist;
            if (!positionClear(sx, sy)) continue;
            let tooClose = false;
            const minSep = 40;
            const wdx = sx - m.x, wdy = sy - m.y;
            if (wdx * wdx + wdy * wdy < minSep * minSep) tooClose = true;
            if (!tooClose) {
              for (const other of mobs) {
                if (other.hp <= 0) continue;
                const odx = sx - other.x, ody = sy - other.y;
                if (odx * odx + ody * ody < minSep * minSep) { tooClose = true; break; }
              }
            }
            if (!tooClose) { foundClear = true; break; }
          }
          if (!foundClear) {
            const fallbackAngle = (si + 1) * Math.PI * 0.7;
            sx = m.x + Math.cos(fallbackAngle) * 60;
            sy = m.y + Math.sin(fallbackAngle) * 60;
          }
          const skelId = nextMobId++;
          mobs.push({
            x: sx, y: sy, type: "skeleton", id: skelId,
            hp: Math.round(smt.hp * hpMult), maxHp: Math.round(smt.hp * hpMult),
            speed: capMobSpeed("skeleton", smt.speed * spdMult),
            damage: Math.round(smt.damage * getMobDamageMultiplier()),
            contactRange: smt.contactRange,
            skin: smt.skin, hair: smt.hair, shirt: smt.shirt, pants: smt.pants,
            name: smt.name, dir: 0, frame: 0, attackCooldown: 0,
            shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
            summonRate: 0, summonMax: 0, summonTimer: 0,
            witchId: m.id, boneSwing: 0, castTimer: 0,
            scale: 0.45, spawnFrame: gameFrame,
          });
          hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
        }
      }
    } else if (m.summonTimer > 0) {
      m.summonTimer--;
    } else {
      const skeleCount = mobs.filter(s => s.witchId === m.id && s.hp > 0).length;
      if (skeleCount < m.summonMax) {
        m.castTimer = 40;
        m.summonTimer = m.summonRate;
      }
    }
    return {};
  },

  golem: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects, bullets, mobs, wave } = ctx;
    // Boulder throw + stomp
    if (m.boulderRate > 0) {
      if (m.throwAnim > 0) m.throwAnim--;
      if (m.boulderTimer > 0) {
        m.boulderTimer--;
      } else if (dist > 120 && dist < m.boulderRange * 1.5) {
        m.boulderTimer = m.boulderRate;
        m.throwAnim = 30;
        const ndx = dx / dist, ndy = dy / dist;
        bullets.push({
          id: nextBulletId++,
          x: m.x, y: m.y - 20, vx: ndx * m.boulderSpeed, vy: ndy * m.boulderSpeed,
          fromPlayer: false, mobBullet: true, isBoulder: true,
          damage: Math.round(20 * getMobDamageMultiplier()), ownerId: m.id,
        });
      } else if (dist <= 120 && m.boulderTimer <= 0) {
        m.boulderTimer = Math.floor(m.boulderRate * 0.7);
        m.throwAnim = 20;
        const stompRange = 100;
        const stompDx = player.x - m.x, stompDy = player.y - m.y;
        const stompDist = Math.sqrt(stompDx * stompDx + stompDy * stompDy);
        if (stompDist < stompRange) {
          const stompDmg = Math.round(10 * getMobDamageMultiplier());
          const stompReduced = dealDamageToPlayer(stompDmg, "aoe", null);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: stompReduced });
          if (stompDist > 0) {
            player.knockVx = (stompDx / stompDist) * 18;
            player.knockVy = (stompDy / stompDist) * 18;
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 20, type: "stomp" });
      }
    }
    // Summon mini golems
    if (m.summonRate > 0) {
      if (m.summonTimer > 0) {
        m.summonTimer--;
      } else {
        const miniCount = mobs.filter(s => s.golemOwnerId === m.id && s.hp > 0).length;
        if (miniCount < (m.summonMax || 3)) {
          m.summonTimer = m.summonRate;
          m.throwAnim = 25; // stomp animation for summoning
          hitEffects.push({ x: m.x, y: m.y, life: 20, type: "stomp" });
          const toSpawn = Math.min(2, (m.summonMax || 3) - miniCount);
          const mgType = MOB_TYPES.mini_golem;
          const hpMult = getWaveHPMultiplier(wave);
          const spdMult = getWaveSpeedMultiplier(wave);
          for (let si = 0; si < toSpawn; si++) {
            let sx, sy, foundClear = false;
            for (let attempt = 0; attempt < 20; attempt++) {
              const angle = Math.random() * Math.PI * 2;
              const spawnDist = 90 + Math.random() * 70;
              sx = m.x + Math.cos(angle) * spawnDist;
              sy = m.y + Math.sin(angle) * spawnDist;
              if (!positionClear(sx, sy)) continue;
              let tooClose = false;
              for (const other of mobs) {
                if (other.hp <= 0) continue;
                const odx = sx - other.x, ody = sy - other.y;
                if (odx * odx + ody * ody < 40 * 40) { tooClose = true; break; }
              }
              if (!tooClose) { foundClear = true; break; }
            }
            if (!foundClear) {
              const fallbackAngle = (si + 1) * Math.PI * 0.8;
              sx = m.x + Math.cos(fallbackAngle) * 70;
              sy = m.y + Math.sin(fallbackAngle) * 70;
            }
            const mgId = nextMobId++;
            mobs.push({
              x: sx, y: sy, type: "mini_golem", id: mgId,
              hp: Math.round(mgType.hp * hpMult), maxHp: Math.round(mgType.hp * hpMult),
              speed: capMobSpeed("mini_golem", mgType.speed * spdMult),
              damage: Math.round(mgType.damage * getMobDamageMultiplier()),
              contactRange: mgType.contactRange,
              skin: mgType.skin, hair: mgType.hair, shirt: mgType.shirt, pants: mgType.pants,
              name: mgType.name, dir: 0, frame: 0, attackCooldown: 0,
              shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
              summonRate: 0, summonMax: 0, summonTimer: 0,
              boulderRate: mgType.boulderRate, boulderSpeed: mgType.boulderSpeed, boulderRange: mgType.boulderRange,
              boulderTimer: 60 + Math.floor(Math.random() * 80), // stagger first throw
              throwAnim: 0, golemOwnerId: m.id,
              scale: 0.85, spawnFrame: gameFrame,
            });
            hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
          }
        }
      }
    }
    return {};
  },

  mini_golem: (m, ctx) => {
    // Smaller boulder throw + weaker stomp — same pattern as golem but scaled down
    const { dist, dx, dy, player, hitEffects, bullets } = ctx;
    if (m.boulderRate <= 0) return {};
    if (m.throwAnim > 0) m.throwAnim--;
    if (m.boulderTimer > 0) {
      m.boulderTimer--;
    } else if (dist > 80 && dist < m.boulderRange * 1.3) {
      m.boulderTimer = m.boulderRate;
      m.throwAnim = 20;
      const ndx = dx / dist, ndy = dy / dist;
      bullets.push({
        id: nextBulletId++,
        x: m.x, y: m.y - 12, vx: ndx * m.boulderSpeed, vy: ndy * m.boulderSpeed,
        fromPlayer: false, mobBullet: true, isBoulder: true,
        damage: Math.round(8 * getMobDamageMultiplier()), ownerId: m.id,
      });
    } else if (dist <= 80 && m.boulderTimer <= 0) {
      m.boulderTimer = Math.floor(m.boulderRate * 0.8);
      m.throwAnim = 15;
      const stompRange = 65;
      const stompDx = player.x - m.x, stompDy = player.y - m.y;
      const stompDist = Math.sqrt(stompDx * stompDx + stompDy * stompDy);
      if (stompDist < stompRange) {
        const stompDmg = Math.round(5 * getMobDamageMultiplier());
        const stompReduced = dealDamageToPlayer(stompDmg, "aoe", null);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: stompReduced });
        if (stompDist > 0) {
          player.knockVx = (stompDx / stompDist) * 10;
          player.knockVy = (stompDy / stompDist) * 10;
        }
      }
      hitEffects.push({ x: m.x, y: m.y, life: 15, type: "stomp" });
    }
    return {};
  },

  archer: (m, ctx) => {
    const { dist, dx, dy, bullets, hitEffects } = ctx;
    if (m.arrowRate <= 0) return {};
    if (m.bowDrawAnim <= 0 && m.arrowTimer > 0) {
      m.arrowTimer--;
      if (m.arrowTimer <= 0 && dist < m.arrowRange * 1.3) {
        m.bowDrawAnim = 45;
      } else if (m.arrowTimer <= 0) {
        m.arrowTimer = 10;
      }
    }
    if (m.bowDrawAnim > 0) {
      m.bowDrawAnim--;
      if (m.bowDrawAnim <= 0) {
        m.arrowTimer = m.arrowRate;
        const ndx = dx / dist, ndy = dy / dist;
        bullets.push({
          id: nextBulletId++,
          x: m.x, y: m.y - 14, vx: ndx * m.arrowSpeed, vy: ndy * m.arrowSpeed,
          fromPlayer: false, mobBullet: true, isArrow: true,
          bouncesLeft: m.arrowBounces, arrowLife: m.arrowLife,
          damage: m.damage, ownerId: m.id,
          projectileStyle: m.projectileStyle || null,
        });
      }
    }
    return {};
  },

  healer: (m, ctx) => {
    const { mobs, hitEffects, player } = ctx;
    if (m.healRadius <= 0) return {};
    if (m.healAnim > 0) m.healAnim--;
    if (m.healTimer > 0) {
      m.healTimer--;
    } else {
      let bestX = player.x, bestY = player.y, bestScore = 0;
      const injured = [];
      for (const ally of mobs) {
        if (ally === m || ally.hp <= 0 || ally.type === "skeleton" || ally.type === "healer") continue;
        if (ally.hp < ally.maxHp) injured.push(ally);
      }
      for (const ally of injured) {
        let score = 0;
        for (const other of injured) {
          const cdx = ally.x - other.x, cdy = ally.y - other.y;
          if (cdx * cdx + cdy * cdy < 150 * 150) score++;
        }
        if (score > bestScore) { bestScore = score; bestX = ally.x; bestY = ally.y; }
      }
      if (bestScore === 0) { bestX = player.x; bestY = player.y; }
      m.healZoneX = bestX; m.healZoneY = bestY;
      let healedAny = false;
      for (const ally of mobs) {
        if (ally === m || ally.hp <= 0 || ally.type === "skeleton" || ally.type === "healer") continue;
        if (ally.hp >= ally.maxHp) continue;
        const hdx = bestX - ally.x, hdy = bestY - ally.y;
        if (hdx * hdx + hdy * hdy < m.healRadius * m.healRadius) {
          ally.hp = Math.min(ally.maxHp, ally.hp + m.healAmount);
          healedAny = true;
          hitEffects.push({ x: ally.x, y: ally.y - 20, life: 20, type: "mob_heal", healAmt: m.healAmount });
          hitEffects.push({ x: m.x, y: m.y - 15, x2: ally.x, y2: ally.y - 10, life: 15, type: "heal_beam" });
        }
      }
      if (m.hp < m.maxHp) { m.hp = Math.min(m.maxHp, m.hp + m.healAmount); healedAny = true; }
      if (healedAny) {
        m.healAnim = 30; m.healTimer = m.healRate;
        hitEffects.push({ x: bestX, y: bestY, life: 25, type: "heal_zone", radius: m.healRadius });
      } else { m.healTimer = 15; }
    }
    return {};
  },

  mummy: (m, ctx) => {
    const { dist, player, hitEffects, playerDead } = ctx;
    if (m.explodeRange <= 0) return {};
    const instantRange = 45;
    const shouldInstantExplode = m.mummyArmed && dist < instantRange;
    if (m.mummyArmed) {
      m.mummyFuse--;
      m.mummyFlash++;
      if (m.mummyFuse <= 0 || shouldInstantExplode) {
        const blastRadius = 200;
        hitEffects.push({ x: m.x, y: m.y - 10, life: 35, type: "mummy_explode" });
        const edx = player.x - m.x;
        const edy = (player.y - 20) - (m.y - 20);
        const eDist = Math.sqrt(edx * edx + edy * edy);
        if (eDist < blastRadius && !playerDead) {
          const blastDmg = eDist < 80 ? m.explodeDamage : eDist < 140 ? Math.round(m.explodeDamage * 0.6) : Math.round(m.explodeDamage * 0.3);
          const dmgDealt = dealDamageToPlayer(blastDmg, "aoe", null);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmgDealt });
        }
        m.hp = 0;
        return { skip: true };
      }
    } else {
      if (dist < m.explodeRange) {
        m.mummyArmed = true;
        const mt2 = MOB_TYPES.mummy;
        m.mummyFuse = mt2.fuseMin + Math.floor(Math.random() * (mt2.fuseMax - mt2.fuseMin));
        if (!m._origSpeed) m._origSpeed = m.speed;
        m.speed = m._origSpeed * 1.4;
      }
    }
    return {};
  },

  // ===================== FLOOR 1: AZURINE CITY SPECIALS =====================

  // --- Neon Pickpocket: Swipe Blink ---
  // Telegraphed dash toward player, heal self on arrival
  swipe_blink: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    // Initialize timer on first call
    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;

    // Dashing phase
    if (m._blinkDashing) {
      m._blinkDashTimer = (m._blinkDashTimer || 0) - 1;
      if (m._blinkDashTimer <= 0) {
        // Arrive at target
        m.x = m._blinkTargetX;
        m.y = m._blinkTargetY;
        // Heal 10% maxHp
        const healAmt = Math.round(m.maxHp * 0.1);
        m.hp = Math.min(m.maxHp, m.hp + healAmt);
        hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "heal", dmg: "+" + healAmt });
        // Check if player is in the dash line — damage if so
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._blinkStartX, m._blinkStartY, m._blinkTargetX, m._blinkTargetY, 32)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        m._blinkDashing = false;
        m._specialTimer = m._specialCD || 420;
      } else {
        // Lerp toward target during dash
        const t = 1 - (m._blinkDashTimer / 24);
        m.x = m._blinkStartX + (m._blinkTargetX - m._blinkStartX) * t;
        m.y = m._blinkStartY + (m._blinkTargetY - m._blinkStartY) * t;
      }
      return { skip: true };
    }

    // Telegraph phase
    if (m._blinkTelegraph) {
      m._blinkTelegraph--;
      if (m._blinkTelegraph <= 0) {
        // Start dash
        m._blinkDashing = true;
        m._blinkDashTimer = 24;
        m._blinkStartX = m.x;
        m._blinkStartY = m.y;
      }
      return { skip: true };
    }

    // Cooldown countdown
    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: create line telegraph toward player (6 tiles = 288px)
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const dashDist = 288;
    m._blinkTargetX = m.x + Math.cos(dir) * dashDist;
    m._blinkTargetY = m.y + Math.sin(dir) * dashDist;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: m._blinkTargetX, y2: m._blinkTargetY, width: 32 },
        delayFrames: 24,
        color: [0, 200, 255],
        owner: m.id,
      });
    }
    m._blinkTelegraph = 24;
    return { skip: true };
  },

  // --- Cyber Mugger: Stun Baton ---
  // Cone telegraph followed by stun hit
  stun_baton: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Telegraph phase
    if (m._stunTelegraph) {
      m._stunTelegraph--;
      if (m._stunTelegraph <= 0) {
        // Resolve: damage + stun if player in cone
        if (typeof AttackShapes !== 'undefined') {
          const dir = Math.atan2(player.y - m.y, player.x - m.x);
          const halfAngle = Math.PI / 4; // 90° / 2
          if (AttackShapes.playerInCone(m.x, m.y, dir, halfAngle, 96)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('stun', { duration: 72 });
            hitEffects.push({ x: player.x, y: player.y - 30, life: 40, type: "stun" });
          }
        }
        m._specialTimer = m._specialCD || 480;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be close enough
    if (dist >= 120) {
      m._specialTimer = 30; // retry soon
      return {};
    }

    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'cone',
        params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 96 },
        delayFrames: 18,
        color: [255, 200, 50],
        owner: m.id,
      });
    }
    m._stunTelegraph = 18;
    return { skip: true };
  },

  // --- Drone Lookout: Spot Mark ---
  // Circle telegraph on player, applies mark debuff
  spot_mark: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._markTelegraph) {
      m._markTelegraph--;
      if (m._markTelegraph <= 0) {
        // Resolve: apply mark if player center is inside circle (tighter check — no edge grazes)
        if (typeof AttackShapes !== 'undefined') {
          const mdx = player.x - m._markX, mdy = player.y - m._markY;
          if (mdx * mdx + mdy * mdy <= 48 * 48) {
            StatusFX.applyToPlayer('mark', { duration: 240, bonus: 0.15 });
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "mark" });
          }
        }
        m._specialTimer = m._specialCD || 600;
      }
      return {};
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 400) {
      m._specialTimer = 30;
      return {};
    }

    // Target player's current position
    m._markX = player.x;
    m._markY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m._markX, cy: m._markY, radius: 72 },
        delayFrames: 36,
        color: [255, 100, 100],
        owner: m.id,
      });
    }
    m._markTelegraph = 36;
    return {};
  },

  // --- Street Chemist: Gas Canister ---
  // Lob projectile that creates poison zone on landing
  gas_canister: (m, ctx) => {
    const { dist, player, hitEffects, bullets } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Active projectile — tick it
    if (m._gasProjectile) {
      const proj = m._gasProjectile;
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.vy += 0.15; // gravity arc
      proj.timer--;

      if (proj.timer <= 0) {
        // Landed — create poison zone
        if (typeof HazardSystem !== 'undefined') {
          HazardSystem.createZone({
            cx: proj.targetX, cy: proj.targetY,
            radius: 144,
            duration: 300,
            tickRate: 60,
            tickDamage: Math.round(m.damage * getMobDamageMultiplier()),
            tickEffect: 'poison_tick',
            color: [100, 200, 50],
            slow: 0.3,
          });
        }
        hitEffects.push({ x: proj.targetX, y: proj.targetY, life: 20, type: "poison_cloud" });
        m._gasProjectile = null;
        m._specialTimer = m._specialCD || 540;
      }
      return {};
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 350) {
      m._specialTimer = 30;
      return {};
    }

    // Lob toward player's position
    const targetX = player.x;
    const targetY = player.y;
    const travelFrames = 40;
    const vx = (targetX - m.x) / travelFrames;
    const vy = (targetY - m.y) / travelFrames - 2; // arc upward

    m._gasProjectile = {
      x: m.x, y: m.y - 10,
      vx, vy,
      targetX, targetY,
      timer: travelFrames,
    };

    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- Renegade Bruiser: Ground Pound ---
  // Circle telegraph + knockback + slow
  ground_pound: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Telegraph phase
    if (m._poundTelegraph) {
      m._poundTelegraph--;
      if (m._poundTelegraph <= 0) {
        // Resolve: damage + knockback + slow (at the telegraphed position, not mob center)
        const pcx = m._poundCX || m.x, pcy = m._poundCY || m.y;
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(pcx, pcy, 96)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            // Knockback away from pound center
            const kDx = player.x - pcx, kDy = player.y - pcy;
            const kDist = Math.sqrt(kDx * kDx + kDy * kDy) || 1;
            player.knockVx = (kDx / kDist) * 12;
            player.knockVy = (kDy / kDist) * 12;
            // Slow
            StatusFX.applyToPlayer('slow', { amount: 0.4, duration: 150 });
          }
        }
        hitEffects.push({ x: pcx, y: pcy, life: 20, type: "stomp" });
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be close
    if (dist >= 150) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph in front of mob (toward player), not centered on self
    const poundDir = Math.atan2(player.y - m.y, player.x - m.x);
    const poundDist = Math.min(dist, 72); // offset toward player, max 72px
    m._poundCX = m.x + Math.cos(poundDir) * poundDist;
    m._poundCY = m.y + Math.sin(poundDir) * poundDist;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m._poundCX, cy: m._poundCY, radius: 96 },
        delayFrames: 30,
        color: [200, 100, 50],
        owner: m.id,
      });
    }
    m._poundTelegraph = 30;
    return { skip: true };
  },

  // --- Renegade Shadowknife: Cloak Backstab ---
  // Cloak, then teleport behind player for surprise attack
  cloak_backstab: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Cloaked phase — count down then teleport behind player
    if (m._cloaked) {
      m._cloakTimer--;
      if (m._cloakTimer <= 0) {
        // Teleport behind player (opposite of player's facing or just behind)
        const behindDist = 40;
        const dir = Math.atan2(player.y - m.y, player.x - m.x);
        // Behind = opposite side of player from mob's approach
        m.x = player.x + Math.cos(dir) * behindDist;
        m.y = player.y + Math.sin(dir) * behindDist;
        // Deal damage
        const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier()); // backstab bonus
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "backstab" });
        m._cloaked = false;
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be within range
    if (dist >= 250) {
      m._specialTimer = 30;
      return {};
    }

    m._cloaked = true;
    m._cloakTimer = 105; // ~3.5s invisible before backstab
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cloak" });
    return {};
  },

  // --- Renegade Demo: Sticky Bomb ---
  // Place bomb at player position, explodes after delay
  sticky_bomb: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;
    if (!m._bombs) m._bombs = [];

    // Tick active bombs
    for (let i = m._bombs.length - 1; i >= 0; i--) {
      const bomb = m._bombs[i];
      bomb.timer--;
      if (bomb.timer <= 0) {
        // Explode
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(bomb.x, bomb.y, bomb.radius)) {
            const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        hitEffects.push({ x: bomb.x, y: bomb.y, life: 25, type: "explosion" });
        m._bombs.splice(i, 1);
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range, max 2 bombs
    if (dist >= 300 || m._bombs.length >= 2) {
      m._specialTimer = 30;
      return {};
    }

    m._bombs.push({
      x: player.x, y: player.y,
      timer: 120,
      radius: 96,
    });
    hitEffects.push({ x: player.x, y: player.y, life: 15, type: "bomb_place" });
    m._specialTimer = m._specialCD || 720;
    return {};
  },

  // --- Renegade Sniper: Ricochet Round ---
  // Alias to archer logic (sniper has arrowBounces: 1 in MOB_TYPES)
  ricochet_round: null, // set after object creation (self-reference)

  // --- The Don: Laser Snipe ---
  // Long line telegraph + heavy damage
  laser_snipe: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    // Telegraph phase
    if (m._laserTelegraph) {
      m._laserTelegraph--;
      if (m._laserTelegraph <= 0) {
        // Resolve: heavy damage if player in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._laserX1, m._laserY1, m._laserX2, m._laserY2, 24)) {
            const dmg = Math.round(m.damage * 3 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "laser_fire" });
      }
      return { skip: true };
    }

    // Must be at range to snipe
    if (dist <= 150) return {};

    // Create telegraph
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const range = 480; // 10 tiles
    m._laserX1 = m.x;
    m._laserY1 = m.y;
    m._laserX2 = m.x + Math.cos(dir) * range;
    m._laserY2 = m.y + Math.sin(dir) * range;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._laserX1, y1: m._laserY1, x2: m._laserX2, y2: m._laserY2, width: 24 },
        delayFrames: 48,
        color: [255, 50, 50],
        owner: m.id,
      });
    }
    m._laserTelegraph = 48;
    return { skip: true };
  },

  // --- The Don: Tommy Burst ---
  // Spread of 5 bullets in a cone
  tommy_burst: (m, ctx) => {
    const { dist, player, hitEffects, bullets } = ctx;

    // Firing phase — stagger shots over 10 frames
    if (m._tommyFiring) {
      m._tommyFrame = (m._tommyFrame || 0) + 1;
      if (m._tommyFrame % 2 === 0 && m._tommyShotsFired < 5) {
        const baseDir = m._tommyDir;
        const spreadAngle = Math.PI / 6; // 30° total
        const shotAngle = baseDir - spreadAngle / 2 + (m._tommyShotsFired / 4) * spreadAngle;
        const speed = 7;
        bullets.push({
          id: nextBulletId++,
          x: m.x, y: m.y - 10,
          vx: Math.cos(shotAngle) * speed,
          vy: Math.sin(shotAngle) * speed,
          fromPlayer: false, mobBullet: true,
          damage: Math.round(m.damage * getMobDamageMultiplier()),
          ownerId: m.id,
          bulletColor: m.bulletColor || null,
        });
        m._tommyShotsFired++;
      }
      if (m._tommyFrame >= 10) {
        m._tommyFiring = false;
      }
      return { skip: true };
    }

    // Must be in range
    if (dist >= 350) return {};

    // Start burst
    m._tommyFiring = true;
    m._tommyFrame = 0;
    m._tommyShotsFired = 0;
    m._tommyDir = Math.atan2(player.y - m.y, player.x - m.x);
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- The Don: Smart Mine ---
  // Drop proximity mines that root + damage.
  // For single-special mobs: ticks mines + drops new ones.
  // For boss rotation: mine ticking is in the dispatch; this only drops.
  smart_mine: (m, ctx) => {
    const { player, hitEffects } = ctx;

    if (!m._mines) m._mines = [];

    // If used by a single-special mob, tick mines here
    // (boss rotation ticks mines in the dispatch loop)
    if (!m._specials || m._specials.length <= 1) {
      for (let i = m._mines.length - 1; i >= 0; i--) {
        const mine = m._mines[i];
        if (!mine.armed) {
          mine.armTimer--;
          if (mine.armTimer <= 0) mine.armed = true;
          continue;
        }
        const mdx = player.x - mine.x, mdy = player.y - mine.y;
        if (mdx * mdx + mdy * mdy <= mine.radius * mine.radius) {
          StatusFX.applyToPlayer('root', { duration: 42 });
          const dmg = Math.round(m.damage * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          hitEffects.push({ x: mine.x, y: mine.y, life: 20, type: "explosion" });
          m._mines.splice(i, 1);
        }
      }
    }

    // Drop 2 mines near mob
    for (let j = 0; j < 2; j++) {
      const angle = Math.random() * Math.PI * 2;
      const dropDist = 40 + Math.random() * 60;
      m._mines.push({
        x: m.x + Math.cos(angle) * dropDist,
        y: m.y + Math.sin(angle) * dropDist,
        radius: 60,
        armed: false,
        armTimer: 60,
      });
    }
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "mine_drop" });
    return {};
  },

  // --- The Don: Smoke Screen ---
  // Create obscuring smoke zone centered on mob
  smoke_screen: (m, ctx) => {
    const { hitEffects } = ctx;
    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: m.x, cy: m.y,
        radius: 192,
        duration: 240,
        tickRate: 999, // no damage ticks
        tickDamage: 0,
        color: [80, 80, 80],
        slow: 0,
      });
    }
    hitEffects.push({ x: m.x, y: m.y, life: 20, type: "smoke" });
    return {};
  },

  // --- Velocity: Phase Dash ---
  // Fast dash through player position, damage along path
  phase_dash: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Dashing phase
    if (m._phaseDashing) {
      m._phaseDashTimer = (m._phaseDashTimer || 0) - 1;
      // Lerp toward target
      const totalFrames = 16;
      const t = 1 - (m._phaseDashTimer / totalFrames);
      m.x = m._phaseDashStartX + (m._phaseDashTargetX - m._phaseDashStartX) * t;
      m.y = m._phaseDashStartY + (m._phaseDashTargetY - m._phaseDashStartY) * t;
      // Afterimage trail
      if (m._phaseDashTimer % 3 === 0) {
        hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "afterimage" });
      }
      if (m._phaseDashTimer <= 0) {
        // Check damage along path
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._phaseDashStartX, m._phaseDashStartY, m._phaseDashTargetX, m._phaseDashTargetY, 32)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        m._phaseDashing = false;
      }
      return { skip: true };
    }

    // Start dash toward player (8 tiles = 384px), clamped to map bounds
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    let dashTargetX = m.x + Math.cos(dir) * 384;
    let dashTargetY = m.y + Math.sin(dir) * 384;
    // Clamp to map bounds (1 tile inset from walls)
    const mapW = level.widthTiles * TILE, mapH = level.heightTiles * TILE;
    dashTargetX = Math.max(TILE, Math.min(mapW - TILE, dashTargetX));
    dashTargetY = Math.max(TILE, Math.min(mapH - TILE, dashTargetY));
    // Also check wall collision — shorten if target is inside a wall
    if (!positionClear(dashTargetX, dashTargetY)) {
      // Binary search for the farthest clear point
      let lo = 0, hi = 384;
      for (let bi = 0; bi < 8; bi++) {
        const mid = (lo + hi) / 2;
        const tx = m.x + Math.cos(dir) * mid, ty = m.y + Math.sin(dir) * mid;
        if (positionClear(tx, ty)) lo = mid; else hi = mid;
      }
      dashTargetX = m.x + Math.cos(dir) * lo;
      dashTargetY = m.y + Math.sin(dir) * lo;
    }
    m._phaseDashing = true;
    m._phaseDashTimer = 16;
    m._phaseDashStartX = m.x;
    m._phaseDashStartY = m.y;
    m._phaseDashTargetX = dashTargetX;
    m._phaseDashTargetY = dashTargetY;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: m._phaseDashTargetX, y2: m._phaseDashTargetY, width: 32 },
        delayFrames: 8,
        color: [100, 100, 255],
        owner: m.id,
      });
    }
    hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "afterimage" });
    return { skip: true };
  },

  // --- Velocity: Bullet Time Field ---
  // Slow zone centered on player
  bullet_time_field: (m, ctx) => {
    const { player, hitEffects } = ctx;

    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: player.x, cy: player.y,
        radius: 192,
        duration: 240,
        tickRate: 999,
        tickDamage: 0,
        color: [100, 100, 200],
        slow: 0.35,
      });
    }
    hitEffects.push({ x: player.x, y: player.y, life: 20, type: "time_field" });
    return {};
  },

  // --- Velocity: Afterimage Barrage ---
  // 3 converging line telegraphs from different angles
  afterimage_barrage: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Resolving phase — check if any line hits
    if (m._barrageResolving) {
      m._barrageTimer = (m._barrageTimer || 0) - 1;
      if (m._barrageTimer <= 0) {
        m._barrageResolving = false;
      }
      return {};
    }

    // Create 3 line telegraphs from 3 angles (120deg apart) converging on player
    const targetX = player.x, targetY = player.y;
    const attackDist = 300;
    const baseAngle = Math.random() * Math.PI * 2;

    for (let i = 0; i < 3; i++) {
      const angle = baseAngle + (i * Math.PI * 2 / 3);
      const startX = targetX + Math.cos(angle) * attackDist;
      const startY = targetY + Math.sin(angle) * attackDist;

      if (typeof TelegraphSystem !== 'undefined') {
        const capturedStartX = startX, capturedStartY = startY;
        const capturedTargetX = targetX, capturedTargetY = targetY;
        const capturedMob = m;
        TelegraphSystem.create({
          shape: 'line',
          params: { x1: startX, y1: startY, x2: targetX, y2: targetY, width: 28 },
          delayFrames: 36,
          onResolve: () => {
            if (typeof AttackShapes !== 'undefined') {
              if (AttackShapes.playerInLine(capturedStartX, capturedStartY, capturedTargetX, capturedTargetY, 28)) {
                const dmg = Math.round(capturedMob.damage * getMobDamageMultiplier());
                const dealt = dealDamageToPlayer(dmg, 'mob_special', capturedMob);
                hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
              }
            }
          },
          color: [150, 100, 255],
          owner: m.id,
        });
      }
      hitEffects.push({ x: startX, y: startY - 10, life: 12, type: "afterimage" });
    }

    m._barrageResolving = true;
    m._barrageTimer = 42;
    return {};
  },

  // --- Velocity: Summon Renegades ---
  // Spawn 2 random renegade mobs (like witch summon pattern)
  summon_renegades: (m, ctx) => {
    const { mobs, hitEffects, wave } = ctx;

    // Internal cooldown — prevent summoning too often even when rotation picks this ability
    if (!m._summonCD) m._summonCD = 0;
    if (m._summonCD > 0) { m._summonCD--; return {}; }

    // Count active renegade summons (max 2 at a time)
    const activeCount = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
    if (activeCount >= 2) return {};

    const renegadeTypes = ['renegade_bruiser', 'renegade_shadowknife', 'renegade_demo', 'renegade_sniper'];
    const hpMult = getWaveHPMultiplier(wave);
    const spdMult = getWaveSpeedMultiplier(wave);
    const toSpawn = 1; // only spawn 1 renegade at a time

    for (let si = 0; si < toSpawn; si++) {
      const typeKey = renegadeTypes[Math.floor(Math.random() * renegadeTypes.length)];
      const mt = MOB_TYPES[typeKey];
      if (!mt) continue;

      let sx, sy, foundClear = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 80 + Math.random() * 60;
        sx = m.x + Math.cos(angle) * spawnDist;
        sy = m.y + Math.sin(angle) * spawnDist;
        if (!positionClear(sx, sy)) continue;
        let tooClose = false;
        const minSep = 40;
        for (const other of mobs) {
          if (other.hp <= 0) continue;
          const odx = sx - other.x, ody = sy - other.y;
          if (odx * odx + ody * ody < minSep * minSep) { tooClose = true; break; }
        }
        if (!tooClose) { foundClear = true; break; }
      }
      if (!foundClear) {
        const fallbackAngle = (si + 1) * Math.PI * 0.7;
        sx = m.x + Math.cos(fallbackAngle) * 60;
        sy = m.y + Math.sin(fallbackAngle) * 60;
      }

      const mobId = nextMobId++;
      mobs.push({
        x: sx, y: sy, type: typeKey, id: mobId,
        hp: Math.round(mt.hp * hpMult), maxHp: Math.round(mt.hp * hpMult),
        speed: capMobSpeed(typeKey, mt.speed * spdMult),
        damage: Math.round(mt.damage * getMobDamageMultiplier()),
        contactRange: mt.contactRange,
        skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
        name: mt.name, dir: 0, frame: 0, attackCooldown: 0,
        shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
        summonRate: 0, summonMax: 0, summonTimer: 0,
        arrowRate: mt.arrowRate || 0, arrowSpeed: mt.arrowSpeed || 0,
        arrowRange: mt.arrowRange || 0, arrowBounces: mt.arrowBounces || 0,
        arrowLife: mt.arrowLife || 0, bowDrawAnim: 0,
        arrowTimer: mt.arrowRate ? Math.max(1, Math.floor(Math.random() * mt.arrowRate)) : 0,
        _specials: mt._specials || null,
        _specialTimer: mt.specialCD || 0,
        _specialCD: mt.specialCD || 0,
        _abilityCDs: {},
        _cloaked: false, _cloakTimer: 0,
        _bombs: [], _mines: [],
        _summonOwnerId: m.id,
        scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
      });
      hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
    }

    m._summonCD = 900; // 15s internal cooldown before next summon
    return {};
  },

  // ===================== FLOOR 2: TECH DISTRICT SPECIALS =====================

  // --- Circuit Thief: Overload Drain ---
  // Short line telegraph toward player. If player has status effects, small heal for self; otherwise just damage.
  overload_drain: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Telegraph phase
    if (m._drainTelegraph) {
      m._drainTelegraph--;
      if (m._drainTelegraph <= 0) {
        // Resolve: damage if player in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._drainX1, m._drainY1, m._drainX2, m._drainY2, 28)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            // If player has any active status effects, heal self
            const hasStatus = player.stunTimer > 0 || player.silenceTimer > 0 ||
              player.rootTimer > 0 || player.slowTimer > 0 || player.markTimer > 0 ||
              player.burnTimer > 0 || player.poisonTimer > 0;
            if (hasStatus) {
              const healAmt = Math.round(m.maxHp * 0.08);
              m.hp = Math.min(m.maxHp, m.hp + healAmt);
              hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "heal", dmg: "+" + healAmt });
            }
          }
        }
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range (3 tiles = 144px)
    if (dist >= 200) {
      m._specialTimer = 30;
      return {};
    }

    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const range = 144; // 3 tiles
    m._drainX1 = m.x;
    m._drainY1 = m.y;
    m._drainX2 = m.x + Math.cos(dir) * range;
    m._drainY2 = m.y + Math.sin(dir) * range;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._drainX1, y1: m._drainY1, x2: m._drainX2, y2: m._drainY2, width: 28 },
        delayFrames: 20,
        color: [0, 220, 220], // cyan
        owner: m.id,
      });
    }
    m._drainTelegraph = 20;
    return { skip: true };
  },

  // --- Arc Welder: Weld Beam ---
  // 6-tile line telegraph toward player. On resolve: leaves burning trail hazard along the line.
  weld_beam: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._weldTelegraph) {
      m._weldTelegraph--;
      if (m._weldTelegraph <= 0) {
        // Resolve: damage if player in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._weldX1, m._weldY1, m._weldX2, m._weldY2, 32)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        // Leave burning trail hazard zones along the line (3 zones spaced evenly)
        if (typeof HazardSystem !== 'undefined') {
          const wdx = m._weldX2 - m._weldX1, wdy = m._weldY2 - m._weldY1;
          const wLen = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
          const burnDmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
          for (let i = 0; i < 3; i++) {
            const t = (i + 1) / 4;
            HazardSystem.createZone({
              cx: m._weldX1 + wdx * t,
              cy: m._weldY1 + wdy * t,
              radius: 48,
              duration: 180, // 3s
              tickRate: 30,
              tickDamage: burnDmg,
              tickEffect: 'burn_tick',
              color: [255, 120, 30], // red-orange
              slow: 0,
            });
          }
        }
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 350) {
      m._specialTimer = 30;
      return {};
    }

    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const range = 288; // 6 tiles
    m._weldX1 = m.x;
    m._weldY1 = m.y;
    m._weldX2 = m.x + Math.cos(dir) * range;
    m._weldY2 = m.y + Math.sin(dir) * range;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._weldX1, y1: m._weldY1, x2: m._weldX2, y2: m._weldY2, width: 32 },
        delayFrames: 24,
        color: [255, 100, 20], // red-orange
        owner: m.id,
      });
    }
    m._weldTelegraph = 24;
    return { skip: true };
  },

  // --- Battery Drone: Charge Pop ---
  // Rush toward player (dash) then explode in 2-tile AoE. Shock = stun. Self-destructs.
  charge_pop: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 660;

    // Dashing phase
    if (m._chargeDashing) {
      m._chargeDashTimer = (m._chargeDashTimer || 0) - 1;
      if (m._chargeDashTimer <= 0) {
        // Arrive at target and explode
        m.x = m._chargeTargetX;
        m.y = m._chargeTargetY;
        // Circle AoE explosion
        hitEffects.push({ x: m.x, y: m.y - 10, life: 30, type: "explosion" });
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 96)) {
            const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('stun', { duration: 18 }); // 0.3s shock
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
          }
        }
        // Self-destruct
        m.hp = 0;
        m._chargeDashing = false;
        return { skip: true };
      } else {
        // Lerp toward target during dash
        const t = 1 - (m._chargeDashTimer / 20);
        m.x = m._chargeStartX + (m._chargeTargetX - m._chargeStartX) * t;
        m.y = m._chargeStartY + (m._chargeTargetY - m._chargeStartY) * t;
      }
      return { skip: true };
    }

    // Telegraph phase
    if (m._chargeTelegraph) {
      m._chargeTelegraph--;
      if (m._chargeTelegraph <= 0) {
        // Start dash
        m._chargeDashing = true;
        m._chargeDashTimer = 20;
        m._chargeStartX = m.x;
        m._chargeStartY = m.y;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 300) {
      m._specialTimer = 30;
      return {};
    }

    // Target player's current position
    m._chargeTargetX = player.x;
    m._chargeTargetY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      // Line telegraph showing dash path
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: player.x, y2: player.y, width: 32 },
        delayFrames: 18,
        color: [255, 230, 50], // yellow
        owner: m.id,
      });
      // Circle telegraph at destination showing explosion
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: player.x, cy: player.y, radius: 96 },
        delayFrames: 18,
        color: [255, 230, 50], // yellow
        owner: m.id,
      });
    }
    m._chargeTelegraph = 18;
    return { skip: true };
  },

  // --- Coil Runner: Tesla Trail ---
  // Sprint for 3s leaving electrified tile hazards behind. Drop zone every 30 frames.
  tesla_trail: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;

    // Sprinting phase — leave electric hazards behind
    if (m._teslaSprinting) {
      m._teslaSprintTimer = (m._teslaSprintTimer || 0) - 1;
      // Drop hazard every 30 frames
      m._teslaDropTimer = (m._teslaDropTimer || 0) - 1;
      if (m._teslaDropTimer <= 0) {
        if (typeof HazardSystem !== 'undefined') {
          HazardSystem.createZone({
            cx: m.x, cy: m.y,
            radius: 36,
            duration: 180, // 3s
            tickRate: 30,
            tickDamage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
            tickEffect: 'shock_tick',
            color: [60, 140, 255], // electric blue
            slow: 0,
          });
        }
        hitEffects.push({ x: m.x, y: m.y, life: 12, type: "spark" });
        m._teslaDropTimer = 30;
      }
      // Move fast toward player during sprint
      if (dist > 30) {
        const sprintSpeed = (m.speed || 2.5) * 2.0;
        const ndx = (player.x - m.x) / dist, ndy = (player.y - m.y) / dist;
        const nx = m.x + ndx * sprintSpeed, ny = m.y + ndy * sprintSpeed;
        if (positionClear(nx, ny)) {
          m.x = nx;
          m.y = ny;
        }
      }
      if (m._teslaSprintTimer <= 0) {
        m._teslaSprinting = false;
        m._specialTimer = m._specialCD || 720;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 400) {
      m._specialTimer = 30;
      return {};
    }

    m._teslaSprinting = true;
    m._teslaSprintTimer = 180; // 3s
    m._teslaDropTimer = 0; // drop immediately
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // ===================== FLOOR 2: VOLTMASTER BOSS SPECIALS =====================

  // --- Voltmaster: Chain Lightning ---
  // Targets player with line telegraph. On resolve, damage + chain to nearest mobs for visual effect.
  chain_lightning: (m, ctx) => {
    const { dist, player, hitEffects, mobs } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._chainTelegraph) {
      m._chainTelegraph--;
      if (m._chainTelegraph <= 0) {
        // Resolve: damage player if in line
        let hitPlayer = false;
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._chainX1, m._chainY1, m._chainX2, m._chainY2, 32)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            hitPlayer = true;
          }
        }
        // Chain: arc to up to 3 nearby mobs (visual effect, no mob damage — just looks cool)
        if (hitPlayer) {
          let chainX = player.x, chainY = player.y;
          const chained = new Set();
          for (let c = 0; c < 3; c++) {
            let bestMob = null, bestDist = 144 * 144; // 3 tiles
            for (const other of mobs) {
              if (other === m || other.hp <= 0 || chained.has(other.id)) continue;
              const cdx = other.x - chainX, cdy = other.y - chainY;
              const cd2 = cdx * cdx + cdy * cdy;
              if (cd2 < bestDist) { bestDist = cd2; bestMob = other; }
            }
            if (!bestMob) break;
            chained.add(bestMob.id);
            hitEffects.push({
              x: chainX, y: chainY - 10,
              x2: bestMob.x, y2: bestMob.y - 10,
              life: 15, type: "lightning_arc",
            });
            chainX = bestMob.x;
            chainY = bestMob.y;
          }
        }
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range (5 tiles = 240px)
    if (dist >= 320) {
      m._specialTimer = 30;
      return {};
    }

    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const range = 240; // 5 tiles
    m._chainX1 = m.x;
    m._chainY1 = m.y;
    m._chainX2 = m.x + Math.cos(dir) * range;
    m._chainY2 = m.y + Math.sin(dir) * range;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._chainX1, y1: m._chainY1, x2: m._chainX2, y2: m._chainY2, width: 32 },
        delayFrames: 24,
        color: [120, 180, 255], // light blue
        owner: m.id,
      });
    }
    m._chainTelegraph = 24;
    return { skip: true };
  },

  // --- Voltmaster: EMP Pulse ---
  // Ring telegraph centered on Voltmaster. On resolve, silence player inside ring.
  emp_pulse: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._empTelegraph) {
      m._empTelegraph--;
      if (m._empTelegraph <= 0) {
        // Resolve: silence if player inside ring
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 192)) {
            StatusFX.applyToPlayer('silence', { duration: 90 }); // 1.5s
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "silence" });
            const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 25, type: "emp_wave" });
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: player must be close enough for ring to matter
    if (dist >= 250) {
      m._specialTimer = 30;
      return {};
    }

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'ring',
        params: { cx: m.x, cy: m.y, innerRadius: 40, outerRadius: 192 },
        delayFrames: 30,
        color: [160, 60, 220], // purple
        owner: m.id,
      });
    }
    m._empTelegraph = 30;
    return { skip: true };
  },

  // --- Voltmaster: Tesla Pillars ---
  // Spawn 2 pillar entities near player. Pillars zap between them every 120 frames for line damage.
  tesla_pillars: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
    if (!m._pillars) m._pillars = [];

    // Tick active pillars
    for (let i = m._pillars.length - 1; i >= 0; i--) {
      const pillar = m._pillars[i];
      pillar.life--;
      if (pillar.life <= 0) {
        hitEffects.push({ x: pillar.x, y: pillar.y, life: 15, type: "fizzle" });
        m._pillars.splice(i, 1);
        continue;
      }
      // Zap between paired pillars every 120 frames
      pillar.zapTimer = (pillar.zapTimer || 0) - 1;
      if (pillar.zapTimer <= 0 && pillar.pairedWith !== undefined) {
        const partner = m._pillars.find(p => p.id === pillar.pairedWith);
        if (partner && partner.life > 0) {
          // Line damage check between pillars
          if (typeof AttackShapes !== 'undefined') {
            if (AttackShapes.playerInLine(pillar.x, pillar.y, partner.x, partner.y, 24)) {
              const dmg = Math.round(m.damage * 0.8 * getMobDamageMultiplier());
              const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
              hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            }
          }
          // Visual arc between pillars
          hitEffects.push({
            x: pillar.x, y: pillar.y - 10,
            x2: partner.x, y2: partner.y - 10,
            life: 12, type: "lightning_arc",
          });
        }
        pillar.zapTimer = 120;
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: player must be in range, max 2 pillars at a time
    if (dist >= 350 || m._pillars.length >= 2) {
      m._specialTimer = 30;
      return {};
    }

    // Spawn 2 pillars flanking the player
    const pillarId1 = (typeof gameFrame !== 'undefined' ? gameFrame : 0) * 100 + 1;
    const pillarId2 = pillarId1 + 1;
    const perpAngle = Math.atan2(player.y - m.y, player.x - m.x) + Math.PI / 2;
    const offset = 72; // offset from player

    const p1 = {
      id: pillarId1, pairedWith: pillarId2,
      x: player.x + Math.cos(perpAngle) * offset,
      y: player.y + Math.sin(perpAngle) * offset,
      life: 600, // 10s
      zapTimer: 60, // first zap after 1s
    };
    const p2 = {
      id: pillarId2, pairedWith: pillarId1,
      x: player.x - Math.cos(perpAngle) * offset,
      y: player.y - Math.sin(perpAngle) * offset,
      life: 600,
      zapTimer: 60,
    };

    m._pillars.push(p1, p2);
    hitEffects.push({ x: p1.x, y: p1.y - 10, life: 20, type: "summon" });
    hitEffects.push({ x: p2.x, y: p2.y - 10, life: 20, type: "summon" });
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 600;
    return {};
  },

  // --- Voltmaster: Magnet Snap ---
  // Pull player 2 tiles toward Voltmaster. Line telegraph from player to mob.
  magnet_snap: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._magnetTelegraph) {
      m._magnetTelegraph--;
      if (m._magnetTelegraph <= 0) {
        // Resolve: pull player 96px toward mob
        const pullDist = Math.min(96, dist - 30); // don't pull into mob
        if (pullDist > 0 && dist > 40) {
          const ndx = (m.x - player.x) / dist, ndy = (m.y - player.y) / dist;
          const newX = player.x + ndx * pullDist;
          const newY = player.y + ndy * pullDist;
          if (positionClear(newX, newY)) {
            player.x = newX;
            player.y = newY;
          }
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "pull" });
        }
        // Small damage on pull
        const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: player must be in range but not too close
    if (dist >= 350 || dist < 60) {
      m._specialTimer = 30;
      return {};
    }

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: player.x, y1: player.y, x2: m.x, y2: m.y, width: 28 },
        delayFrames: 24,
        color: [180, 230, 50], // yellow-green
        owner: m.id,
      });
    }
    m._magnetTelegraph = 24;
    return { skip: true };
  },

  // ===================== FLOOR 2: CORPORATE CORE SPECIALS =====================

  // --- Suit Enforcer: Briefcase Turret ---
  // Deploy turret entity at mob position. Turret fires bullet at player every 60 frames for 6s.
  briefcase_turret: (m, ctx) => {
    const { dist, player, hitEffects, bullets } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 840;
    if (!m._turrets) m._turrets = [];

    // Tick active turrets
    for (let i = m._turrets.length - 1; i >= 0; i--) {
      const turret = m._turrets[i];
      turret.life--;
      if (turret.life <= 0) {
        hitEffects.push({ x: turret.x, y: turret.y, life: 15, type: "fizzle" });
        m._turrets.splice(i, 1);
        continue;
      }
      // Fire at player every 60 frames
      turret.fireTimer = (turret.fireTimer || 0) - 1;
      if (turret.fireTimer <= 0) {
        const tdx = player.x - turret.x, tdy = player.y - turret.y;
        const tDist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        const bSpeed = 5;
        bullets.push({
          id: nextBulletId++,
          x: turret.x, y: turret.y - 10,
          vx: (tdx / tDist) * bSpeed,
          vy: (tdy / tDist) * bSpeed,
          fromPlayer: false, mobBullet: true,
          damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
          ownerId: m.id,
          bulletColor: null,
        });
        hitEffects.push({ x: turret.x, y: turret.y - 10, life: 10, type: "cast" });
        turret.fireTimer = 60;
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: max 1 turret per mob
    if (m._turrets.length >= 1) {
      m._specialTimer = 30;
      return {};
    }

    m._turrets.push({
      x: m.x, y: m.y,
      life: 360, // 6s
      fireTimer: 30, // first shot after 0.5s
    });
    hitEffects.push({ x: m.x, y: m.y - 10, life: 20, type: "summon" });
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 840;
    return {};
  },

  // --- Compliance Officer: Red Tape Lines ---
  // 2 crossing line telegraphs (X pattern). Root if player touched by either line on resolve.
  red_tape_lines: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;

    // Telegraph phase
    if (m._tapeTelegraph) {
      m._tapeTelegraph--;
      if (m._tapeTelegraph <= 0) {
        // Resolve: check both lines
        let hit = false;
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._tape1X1, m._tape1Y1, m._tape1X2, m._tape1Y2, 24) ||
              AttackShapes.playerInLine(m._tape2X1, m._tape2Y1, m._tape2X2, m._tape2Y2, 24)) {
            hit = true;
          }
        }
        if (hit) {
          StatusFX.applyToPlayer('root', { duration: 60 }); // 1s
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "root" });
          const dmg = Math.round(m.damage * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        }
        m._specialTimer = m._specialCD || 720;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 350) {
      m._specialTimer = 30;
      return {};
    }

    // X pattern centered on player position
    const cx = player.x, cy = player.y;
    const armLen = 144; // 3 tiles each arm

    // Line 1: top-left to bottom-right
    m._tape1X1 = cx - armLen; m._tape1Y1 = cy - armLen;
    m._tape1X2 = cx + armLen; m._tape1Y2 = cy + armLen;
    // Line 2: top-right to bottom-left
    m._tape2X1 = cx + armLen; m._tape2Y1 = cy - armLen;
    m._tape2X2 = cx - armLen; m._tape2Y2 = cy + armLen;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._tape1X1, y1: m._tape1Y1, x2: m._tape1X2, y2: m._tape1Y2, width: 24 },
        delayFrames: 30,
        color: [220, 40, 40], // red
        owner: m.id,
      });
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._tape2X1, y1: m._tape2Y1, x2: m._tape2X2, y2: m._tape2Y2, width: 24 },
        delayFrames: 30,
        color: [220, 40, 40], // red
        owner: m.id,
      });
    }
    m._tapeTelegraph = 30;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Contract Assassin: Penalty Mark ---
  // Apply mark status to player for 4s. Next hit from this mob crits (2x damage).
  penalty_mark: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._penaltyTelegraph) {
      m._penaltyTelegraph--;
      if (m._penaltyTelegraph <= 0) {
        // Resolve: apply mark at telegraphed position
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._penaltyX, m._penaltyY, 72)) {
            StatusFX.applyToPlayer('mark', { duration: 240, bonus: 0.25 }); // 4s, +25% = 2x with base
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "mark" });
          }
        }
        m._specialTimer = m._specialCD || 600;
      }
      return {};
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 350) {
      m._specialTimer = 30;
      return {};
    }

    m._penaltyX = player.x;
    m._penaltyY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: player.x, cy: player.y, radius: 72 },
        delayFrames: 24,
        color: [255, 160, 40], // orange
        owner: m.id,
      });
    }
    m._penaltyTelegraph = 24;
    return {};
  },

  // --- Executive Handler: Drone Swarm ---
  // Spawn 3 small drone projectiles that orbit mob for 2s, then dive toward player.
  drone_swarm: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 900;
    if (!m._drones) m._drones = [];

    // Tick active drones
    for (let i = m._drones.length - 1; i >= 0; i--) {
      const drone = m._drones[i];
      drone.life--;

      if (drone.diving) {
        // Dive toward player
        const ddx = player.x - drone.x, ddy = player.y - drone.y;
        const dDist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        const diveSpeed = 8;
        drone.x += (ddx / dDist) * diveSpeed;
        drone.y += (ddy / dDist) * diveSpeed;
        // Check hit
        if (dDist < 20) {
          const dmg = Math.round(m.damage * 0.4 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
          hitEffects.push({ x: drone.x, y: drone.y, life: 12, type: "spark" });
          m._drones.splice(i, 1);
          continue;
        }
        // Expired without hitting
        if (drone.life <= 0) {
          hitEffects.push({ x: drone.x, y: drone.y, life: 10, type: "fizzle" });
          m._drones.splice(i, 1);
        }
      } else {
        // Orbiting phase
        drone.orbitTimer--;
        drone.angle += 0.08;
        drone.x = m.x + Math.cos(drone.angle) * drone.orbitRadius;
        drone.y = m.y + Math.sin(drone.angle) * drone.orbitRadius;
        hitEffects.push({ x: drone.x, y: drone.y - 5, life: 3, type: "spark" });
        if (drone.orbitTimer <= 0) {
          drone.diving = true;
          drone.life = 120; // 2s max dive time
        }
        if (drone.life <= 0) {
          m._drones.splice(i, 1);
        }
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range, max 3 drones active
    if (dist >= 400 || m._drones.length >= 3) {
      m._specialTimer = 30;
      return {};
    }

    // Spawn 3 drones
    for (let d = 0; d < 3; d++) {
      const angle = (d / 3) * Math.PI * 2;
      m._drones.push({
        x: m.x + Math.cos(angle) * 40,
        y: m.y + Math.sin(angle) * 40,
        angle: angle,
        orbitRadius: 40 + d * 10,
        orbitTimer: 120, // 2s orbit
        diving: false,
        life: 240, // 4s total max lifetime
      });
    }
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 900;
    return {};
  },

  // ===================== FLOOR 2: E-MORTIS BOSS SPECIALS =====================

  // --- E-Mortis: Dividend Barrage ---
  // 3 waves of spread shots, 5 bullets per wave, 15-frame gap between waves.
  dividend_barrage: (m, ctx) => {
    const { dist, player, hitEffects, bullets } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Firing phase — stagger 3 waves
    if (m._dividendFiring) {
      m._dividendFrame = (m._dividendFrame || 0) + 1;

      // Fire a wave every 15 frames (frames 0, 15, 30)
      if (m._dividendFrame % 15 === 0 && m._dividendWaves < 3) {
        const baseDir = m._dividendDir;
        const spreadAngle = Math.PI / 5; // 36° total spread
        for (let s = 0; s < 5; s++) {
          const shotAngle = baseDir - spreadAngle / 2 + (s / 4) * spreadAngle;
          const speed = 6;
          bullets.push({
            id: nextBulletId++,
            x: m.x, y: m.y - 10,
            vx: Math.cos(shotAngle) * speed,
            vy: Math.sin(shotAngle) * speed,
            fromPlayer: false, mobBullet: true,
            damage: Math.round(m.damage * getMobDamageMultiplier()),
            ownerId: m.id,
            bulletColor: m.bulletColor || null,
          });
        }
        m._dividendWaves++;
        hitEffects.push({ x: m.x, y: m.y - 15, life: 10, type: "cast" });
      }

      if (m._dividendWaves >= 3) {
        m._dividendFiring = false;
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 400) {
      m._specialTimer = 30;
      return {};
    }

    // Start barrage
    m._dividendFiring = true;
    m._dividendFrame = 0;
    m._dividendWaves = 0;
    m._dividendDir = Math.atan2(player.y - m.y, player.x - m.x);
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- E-Mortis: Hostile Takeover ---
  // Summon 2 suit_enforcer adds (weaker version). Limit 2 active.
  hostile_takeover: (m, ctx) => {
    const { mobs, hitEffects, wave } = ctx;

    // Internal cooldown
    if (!m._takeoverCD) m._takeoverCD = 0;
    if (m._takeoverCD > 0) { m._takeoverCD--; return {}; }

    // Count active summons (max 2)
    const activeCount = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
    if (activeCount >= 2) return {};

    const typeKey = 'suit_enforcer';
    const mt = MOB_TYPES[typeKey];
    if (!mt) return {};

    const hpMult = getWaveHPMultiplier(wave) * 0.6; // weaker version
    const spdMult = getWaveSpeedMultiplier(wave);
    const toSpawn = 2;

    for (let si = 0; si < toSpawn; si++) {
      // Find clear spawn position near boss
      let sx, sy, foundClear = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 80 + Math.random() * 60;
        sx = m.x + Math.cos(angle) * spawnDist;
        sy = m.y + Math.sin(angle) * spawnDist;
        if (!positionClear(sx, sy)) continue;
        let tooClose = false;
        const minSep = 40;
        for (const other of mobs) {
          if (other.hp <= 0) continue;
          const odx = sx - other.x, ody = sy - other.y;
          if (odx * odx + ody * ody < minSep * minSep) { tooClose = true; break; }
        }
        if (!tooClose) { foundClear = true; break; }
      }
      if (!foundClear) {
        const fallbackAngle = (si + 1) * Math.PI * 0.7;
        sx = m.x + Math.cos(fallbackAngle) * 60;
        sy = m.y + Math.sin(fallbackAngle) * 60;
      }

      const mobId = nextMobId++;
      mobs.push({
        x: sx, y: sy, type: typeKey, id: mobId,
        hp: Math.round(mt.hp * hpMult), maxHp: Math.round(mt.hp * hpMult),
        speed: capMobSpeed(typeKey, mt.speed * spdMult),
        damage: Math.round(mt.damage * getMobDamageMultiplier()),
        contactRange: mt.contactRange,
        skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
        name: mt.name, dir: 0, frame: 0, attackCooldown: 0,
        shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
        summonRate: 0, summonMax: 0, summonTimer: 0,
        arrowRate: mt.arrowRate || 0, arrowSpeed: mt.arrowSpeed || 0,
        arrowRange: mt.arrowRange || 0, arrowBounces: mt.arrowBounces || 0,
        arrowLife: mt.arrowLife || 0, bowDrawAnim: 0,
        arrowTimer: mt.arrowRate ? Math.max(1, Math.floor(Math.random() * mt.arrowRate)) : 0,
        _specials: mt._specials || null,
        _specialTimer: mt.specialCD || 0,
        _specialCD: mt.specialCD || 0,
        _abilityCDs: {},
        _cloaked: false, _cloakTimer: 0,
        _bombs: [], _mines: [],
        _summonOwnerId: m.id,
        scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
      });
      hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
    }

    m._takeoverCD = 900; // 15s internal cooldown
    return {};
  },

  // --- E-Mortis: NDA Field ---
  // Smoke bubble at E-Mortis position, 4s duration. Cosmetic obscuring zone.
  nda_field: (m, ctx) => {
    const { hitEffects } = ctx;

    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: m.x, cy: m.y,
        radius: 192,
        duration: 240, // 4s
        tickRate: 999, // no damage ticks
        tickDamage: 0,
        color: [60, 50, 40], // dark smoke
        slow: 0,
      });
    }
    hitEffects.push({ x: m.x, y: m.y, life: 20, type: "smoke" });
    return {};
  },

  // --- E-Mortis: Golden Parachute ---
  // Shield phase (gains shield HP = 30% of maxHp) + backward dash away from player.
  golden_parachute: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Dashing phase (backward dash)
    if (m._parachuteDashing) {
      m._parachuteDashTimer = (m._parachuteDashTimer || 0) - 1;
      if (m._parachuteDashTimer <= 0) {
        m.x = m._parachuteTargetX;
        m.y = m._parachuteTargetY;
        m._parachuteDashing = false;
        m._specialTimer = m._specialCD || 540;
      } else {
        const t = 1 - (m._parachuteDashTimer / 16);
        m.x = m._parachuteStartX + (m._parachuteTargetX - m._parachuteStartX) * t;
        m.y = m._parachuteStartY + (m._parachuteTargetY - m._parachuteStartY) * t;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Auto-expire shield after 4s (240 frames)
    if (m._shieldExpireFrame && typeof gameFrame !== 'undefined') {
      if (gameFrame >= m._shieldExpireFrame) {
        m._shieldHp = 0;
        m._shieldExpireFrame = 0;
      }
    }

    // Activate: apply shield + dash backward
    m._shieldHp = Math.round(m.maxHp * 0.3);
    m._shieldExpireFrame = (typeof gameFrame !== 'undefined' ? gameFrame : 0) + 240; // 4s

    // Backward dash away from player
    const dir = Math.atan2(m.y - player.y, m.x - player.x); // away from player
    let dashTargetX = m.x + Math.cos(dir) * 192;
    let dashTargetY = m.y + Math.sin(dir) * 192;
    // Clamp to map bounds
    const mapW = level.widthTiles * TILE, mapH = level.heightTiles * TILE;
    dashTargetX = Math.max(TILE, Math.min(mapW - TILE, dashTargetX));
    dashTargetY = Math.max(TILE, Math.min(mapH - TILE, dashTargetY));
    // Check wall collision
    if (!positionClear(dashTargetX, dashTargetY)) {
      let lo = 0, hi = 192;
      for (let bi = 0; bi < 8; bi++) {
        const mid = (lo + hi) / 2;
        const tx = m.x + Math.cos(dir) * mid, ty = m.y + Math.sin(dir) * mid;
        if (positionClear(tx, ty)) lo = mid; else hi = mid;
      }
      dashTargetX = m.x + Math.cos(dir) * lo;
      dashTargetY = m.y + Math.sin(dir) * lo;
    }

    m._parachuteDashing = true;
    m._parachuteDashTimer = 16;
    m._parachuteStartX = m.x;
    m._parachuteStartY = m.y;
    m._parachuteTargetX = dashTargetX;
    m._parachuteTargetY = dashTargetY;

    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "shield" });
    hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "cast" });
    return { skip: true };
  },

  // ===================== FLOOR 3: JUNKYARD SPECIALS =====================

  // --- Scrap Rat: Scavenge Shield ---
  // Gains temporary shield HP (25% maxHp). Simple activation, no telegraph.
  scavenge_shield: (m, ctx) => {
    const { hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: apply shield
    m._shieldHp = Math.round(m.maxHp * 0.25);
    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "shield" });

    m._specialTimer = m._specialCD || 600;
    return {};
  },

  // --- Magnet Scavenger: Magnetic Pull ---
  // Pulls player 3 tiles (144px) toward mob. Line telegraph.
  mag_pull: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 660;

    // Telegraph phase
    if (m._magTelegraph) {
      m._magTelegraph--;
      if (m._magTelegraph <= 0) {
        // Resolve: pull player toward mob
        const pullDist = Math.min(144, dist - 30); // don't pull into mob
        if (pullDist > 0) {
          const pdx = m.x - player.x, pdy = m.y - player.y;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
          const ndx = pdx / pDist, ndy = pdy / pDist;
          // Step toward mob, checking positionClear at intervals
          let finalX = player.x, finalY = player.y;
          const steps = 6;
          for (let i = 1; i <= steps; i++) {
            const testX = player.x + ndx * (pullDist * i / steps);
            const testY = player.y + ndy * (pullDist * i / steps);
            if (positionClear(testX, testY)) {
              finalX = testX;
              finalY = testY;
            } else {
              break;
            }
          }
          player.x = finalX;
          player.y = finalY;
          const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        }
        m._specialTimer = m._specialCD || 660;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 250) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph line from player toward mob
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: player.x, y1: player.y, x2: m.x, y2: m.y, width: 28 },
        delayFrames: 24,
        color: [50, 200, 80],
        owner: m.id,
      });
    }
    m._magTelegraph = 24;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Rust Sawman: Saw Line ---
  // Spinning blade projectile in a line toward player. Bullet system.
  saw_line: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects, bullets } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Telegraph phase
    if (m._sawTelegraph) {
      m._sawTelegraph--;
      if (m._sawTelegraph <= 0) {
        // Fire saw blade projectile
        const ndx = dx / (dist || 1), ndy = dy / (dist || 1);
        const speed = 5;
        bullets.push({
          id: nextBulletId++,
          x: m.x, y: m.y - 10,
          vx: ndx * speed, vy: ndy * speed,
          fromPlayer: false, mobBullet: true,
          damage: Math.round(m.damage * getMobDamageMultiplier()),
          ownerId: m.id,
          projectileStyle: 'saw_blade',
          arrowLife: 336 / speed, // travel ~7 tiles
        });
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 300) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph line toward player
    const dir = Math.atan2(dy, dx);
    const lineEndX = m.x + Math.cos(dir) * 336;
    const lineEndY = m.y + Math.sin(dir) * 336;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: lineEndX, y2: lineEndY, width: 28 },
        delayFrames: 20,
        color: [200, 120, 50],
        owner: m.id,
      });
    }
    m._sawTelegraph = 20;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Junkyard Pyro: Oil Spill + Ignite ---
  // Phase 1: oil puddle (slow, no damage). Phase 2 (3s later): ignite into burn DoT zone.
  oil_spill_ignite: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;

    // Track oil puddles for ignition
    if (!m._oilPuddles) m._oilPuddles = [];

    // Tick oil puddles — check for ignition
    for (let i = m._oilPuddles.length - 1; i >= 0; i--) {
      const puddle = m._oilPuddles[i];
      puddle.timer--;
      if (puddle.timer <= 0) {
        // Phase 2: ignite — create burn zone at puddle location
        if (typeof HazardSystem !== 'undefined') {
          HazardSystem.createZone({
            cx: puddle.x, cy: puddle.y,
            radius: 120,
            duration: 180,
            tickRate: 45,
            tickDamage: Math.round(m.damage * getMobDamageMultiplier()),
            tickEffect: 'burn_tick',
            color: [220, 100, 30],
            slow: 0,
          });
        }
        hitEffects.push({ x: puddle.x, y: puddle.y, life: 25, type: "explosion" });
        m._oilPuddles.splice(i, 1);
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 300) {
      m._specialTimer = 30;
      return {};
    }

    // Phase 1: create oil puddle (slow zone, no damage) at player position
    const targetX = player.x, targetY = player.y;
    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: targetX, cy: targetY,
        radius: 120,
        duration: 180,
        tickRate: 9999, // no damage ticks
        tickDamage: 0,
        tickEffect: null,
        color: [100, 70, 30],
        slow: 0.35,
      });
    }
    // Track puddle for ignition after 180 frames
    m._oilPuddles.push({ x: targetX, y: targetY, timer: 180 });

    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    hitEffects.push({ x: targetX, y: targetY, life: 20, type: "poison_cloud" });

    m._specialTimer = m._specialCD || 720;
    return {};
  },

  // ===================== FLOOR 3: MOURN BOSS SPECIALS =====================

  // --- Mourn: Pile Driver ---
  // 2-tile circle shockwave ahead of mob. Knockback + damage.
  pile_driver: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    // Telegraph phase
    if (m._pileDriverTelegraph) {
      m._pileDriverTelegraph--;
      if (m._pileDriverTelegraph <= 0) {
        // Resolve: damage + knockback at telegraphed position
        const pcx = m._pileDriverCX || m.x, pcy = m._pileDriverCY || m.y;
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(pcx, pcy, 96)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            // Knockback away from impact center
            const kDx = player.x - pcx, kDy = player.y - pcy;
            const kDist = Math.sqrt(kDx * kDx + kDy * kDy) || 1;
            player.knockVx = (kDx / kDist) * 14;
            player.knockVy = (kDy / kDist) * 14;
          }
        }
        hitEffects.push({ x: pcx, y: pcy, life: 20, type: "stomp" });
      }
      return { skip: true };
    }

    // Telegraph in front of mob toward player
    const pDir = Math.atan2(player.y - m.y, player.x - m.x);
    const pDist = Math.min(dist, 72);
    m._pileDriverCX = m.x + Math.cos(pDir) * pDist;
    m._pileDriverCY = m.y + Math.sin(pDir) * pDist;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m._pileDriverCX, cy: m._pileDriverCY, radius: 96 },
        delayFrames: 24,
        color: [180, 80, 40],
        owner: m.id,
      });
    }
    m._pileDriverTelegraph = 24;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Mourn: Grab Toss ---
  // Short range grab → toss player 4 tiles in random direction + stun.
  grab_toss: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    // Telegraph phase
    if (m._grabTelegraph) {
      m._grabTelegraph--;
      if (m._grabTelegraph <= 0) {
        // Resolve: toss player in random direction
        const tossAngle = Math.random() * Math.PI * 2;
        const tossDist = 192; // 4 tiles
        let tossX = player.x + Math.cos(tossAngle) * tossDist;
        let tossY = player.y + Math.sin(tossAngle) * tossDist;

        // Clamp to map bounds
        const mapW = level.widthTiles * TILE, mapH = level.heightTiles * TILE;
        tossX = Math.max(TILE, Math.min(mapW - TILE, tossX));
        tossY = Math.max(TILE, Math.min(mapH - TILE, tossY));

        // Check wall collision — binary search for safe position
        if (!positionClear(tossX, tossY)) {
          let lo = 0, hi = tossDist;
          for (let bi = 0; bi < 8; bi++) {
            const mid = (lo + hi) / 2;
            const tx = player.x + Math.cos(tossAngle) * mid;
            const ty = player.y + Math.sin(tossAngle) * mid;
            if (positionClear(tx, ty)) lo = mid; else hi = mid;
          }
          tossX = player.x + Math.cos(tossAngle) * lo;
          tossY = player.y + Math.sin(tossAngle) * lo;
        }

        player.x = tossX;
        player.y = tossY;
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('stun', { duration: 36 }); // 0.6s
      }
      return { skip: true };
    }

    // Must be close range
    if (dist > 100) return {};

    // Telegraph circle at mob position, quick resolve
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m.x, cy: m.y, radius: 100 },
        delayFrames: 12,
        color: [200, 60, 60],
        owner: m.id,
      });
    }
    m._grabTelegraph = 12;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 12, type: "cast" });
    return { skip: true };
  },

  // --- Mourn: Rebuild ---
  // Heals self 20% maxHp + gains shield (15% maxHp). Instant activation.
  rebuild: (m, ctx) => {
    const { hitEffects } = ctx;

    const healAmt = Math.round(m.maxHp * 0.20);
    m.hp = Math.min(m.maxHp, m.hp + healAmt);
    m._shieldHp = Math.round(m.maxHp * 0.15);

    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "heal", dmg: "+" + healAmt });
    hitEffects.push({ x: m.x, y: m.y - 35, life: 20, type: "shield" });
    return {};
  },

  // --- Mourn: Scrap Minions ---
  // Spawns 3 scrap_rat mobs at 70% HP multiplier. Max 3 active. Internal CD 900.
  scrap_minions: (m, ctx) => {
    const { mobs, hitEffects, wave } = ctx;

    // Internal cooldown
    if (!m._scrapMinionsCD) m._scrapMinionsCD = 0;
    if (m._scrapMinionsCD > 0) { m._scrapMinionsCD--; return {}; }

    // Count active scrap minions (max 3)
    const activeCount = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
    if (activeCount >= 3) return {};

    const hpMult = getWaveHPMultiplier(wave) * 0.7; // 70% HP
    const spdMult = getWaveSpeedMultiplier(wave);
    const toSpawn = Math.min(3, 3 - activeCount);

    for (let si = 0; si < toSpawn; si++) {
      const typeKey = 'scrap_rat';
      const mt = MOB_TYPES[typeKey];
      if (!mt) continue;

      let sx, sy, foundClear = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 80 + Math.random() * 60;
        sx = m.x + Math.cos(angle) * spawnDist;
        sy = m.y + Math.sin(angle) * spawnDist;
        if (!positionClear(sx, sy)) continue;
        let tooClose = false;
        const minSep = 40;
        for (const other of mobs) {
          if (other.hp <= 0) continue;
          const odx = sx - other.x, ody = sy - other.y;
          if (odx * odx + ody * ody < minSep * minSep) { tooClose = true; break; }
        }
        if (!tooClose) { foundClear = true; break; }
      }
      if (!foundClear) {
        const fallbackAngle = (si + 1) * Math.PI * 0.7;
        sx = m.x + Math.cos(fallbackAngle) * 60;
        sy = m.y + Math.sin(fallbackAngle) * 60;
      }

      const mobId = nextMobId++;
      mobs.push({
        x: sx, y: sy, type: typeKey, id: mobId,
        hp: Math.round(mt.hp * hpMult), maxHp: Math.round(mt.hp * hpMult),
        speed: capMobSpeed(typeKey, mt.speed * spdMult),
        damage: Math.round(mt.damage * getMobDamageMultiplier()),
        contactRange: mt.contactRange,
        skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
        name: mt.name, dir: 0, frame: 0, attackCooldown: 0,
        shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
        summonRate: 0, summonMax: 0, summonTimer: 0,
        arrowRate: mt.arrowRate || 0, arrowSpeed: mt.arrowSpeed || 0,
        arrowRange: mt.arrowRange || 0, arrowBounces: mt.arrowBounces || 0,
        arrowLife: mt.arrowLife || 0, bowDrawAnim: 0,
        arrowTimer: mt.arrowRate ? Math.max(1, Math.floor(Math.random() * mt.arrowRate)) : 0,
        _specials: mt._specials || null,
        _specialTimer: mt.specialCD || 0,
        _specialCD: mt.specialCD || 0,
        _abilityCDs: {},
        _cloaked: false, _cloakTimer: 0,
        _bombs: [], _mines: [],
        _summonOwnerId: m.id,
        scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
      });
      hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
    }

    m._scrapMinionsCD = 900; // 15s internal cooldown
    return {};
  },

  // ===================== FLOOR 3: SWAMP SPECIALS =====================

  // --- Toxic Leechling: Latch Drain ---
  // Dash to player (200px), deal damage, heal self 15% maxHp.
  latch_drain: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Dashing phase
    if (m._latchDashing) {
      m._latchDashTimer = (m._latchDashTimer || 0) - 1;
      if (m._latchDashTimer <= 0) {
        // Arrive at target
        m.x = m._latchTargetX;
        m.y = m._latchTargetY;
        m._latchDashing = false;
        // Deal damage
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        // Heal self 15% maxHp
        const healAmt = Math.round(m.maxHp * 0.15);
        m.hp = Math.min(m.maxHp, m.hp + healAmt);
        hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "heal", dmg: "+" + healAmt });
        m._specialTimer = m._specialCD || 600;
      } else {
        // Lerp toward target
        const t = 1 - (m._latchDashTimer / 18);
        m.x = m._latchStartX + (m._latchTargetX - m._latchStartX) * t;
        m.y = m._latchStartY + (m._latchTargetY - m._latchStartY) * t;
      }
      return { skip: true };
    }

    // Telegraph phase
    if (m._latchTelegraph) {
      m._latchTelegraph--;
      if (m._latchTelegraph <= 0) {
        // Start dash
        m._latchDashing = true;
        m._latchDashTimer = 18;
        m._latchStartX = m.x;
        m._latchStartY = m.y;
        // Target player position at dash start
        const dashDir = Math.atan2(player.y - m.y, player.x - m.x);
        const dashDist = Math.min(200, dist);
        m._latchTargetX = m.x + Math.cos(dashDir) * dashDist;
        m._latchTargetY = m.y + Math.sin(dashDir) * dashDist;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 200) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph line toward player
    const dir = Math.atan2(dy, dx);
    const lineEndX = m.x + Math.cos(dir) * 200;
    const lineEndY = m.y + Math.sin(dir) * 200;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: lineEndX, y2: lineEndY, width: 24 },
        delayFrames: 18,
        color: [80, 200, 60],
        owner: m.id,
      });
    }
    m._latchTelegraph = 18;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Bog Stalker: Mud Dive ---
  // Submerge (invulnerable 60 frames), then pop-up bite at player + circle AoE.
  mud_dive: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;

    // Submerged phase
    if (m._submerged) {
      m._submergeTimer = (m._submergeTimer || 0) - 1;
      if (m._submergeTimer <= 0) {
        // Pop up at player position
        m._invulnerable = false;
        m._submerged = false;
        m.x = player.x;
        m.y = player.y;
        // Circle AoE damage
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 80)) {
            const dmg = Math.round(m.damage * 1.3 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 20, type: "stomp" });
        m._specialTimer = m._specialCD || 720;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: submerge
    m._invulnerable = true;
    m._submerged = true;
    m._submergeTimer = 60;
    hitEffects.push({ x: m.x, y: m.y, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Chem-Frog: Acid Spit Arc ---
  // Lob acid projectile (arc) that creates acid pool on landing.
  acid_spit_arc: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Active projectile — tick it
    if (m._acidProjectile) {
      const proj = m._acidProjectile;
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.vy += 0.15; // gravity arc
      proj.timer--;

      if (proj.timer <= 0) {
        // Landed — create acid pool zone
        if (typeof HazardSystem !== 'undefined') {
          HazardSystem.createZone({
            cx: proj.targetX, cy: proj.targetY,
            radius: 120,
            duration: 240,
            tickRate: 50,
            tickDamage: Math.round(m.damage * getMobDamageMultiplier()),
            tickEffect: 'poison_tick',
            color: [160, 210, 40],
            slow: 0.2,
          });
        }
        hitEffects.push({ x: proj.targetX, y: proj.targetY, life: 20, type: "poison_cloud" });
        m._acidProjectile = null;
        m._specialTimer = m._specialCD || 540;
      }
      return {};
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 300) {
      m._specialTimer = 30;
      return {};
    }

    // Lob toward player's position
    const targetX = player.x;
    const targetY = player.y;
    const travelFrames = 40;
    const vx = (targetX - m.x) / travelFrames;
    const vy = (targetY - m.y) / travelFrames - 2; // arc upward

    m._acidProjectile = {
      x: m.x, y: m.y - 10,
      vx, vy,
      targetX, targetY,
      timer: travelFrames,
    };

    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- Mosquito Drone: Siphon Beam ---
  // Beam toward player. On resolve: damage + poison. Purple-green color.
  siphon_beam: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Telegraph phase
    if (m._siphonTelegraph) {
      m._siphonTelegraph--;
      if (m._siphonTelegraph <= 0) {
        // Resolve: damage + poison if player still in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m.x, m.y, m._siphonEndX, m._siphonEndY, 24)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('poison', { duration: 180, dmg: 3 });
          }
        }
        m._specialTimer = m._specialCD || 480;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 180) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph beam line toward player (3 tiles = 144px)
    const dir = Math.atan2(dy, dx);
    m._siphonEndX = m.x + Math.cos(dir) * 144;
    m._siphonEndY = m.y + Math.sin(dir) * 144;
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: m._siphonEndX, y2: m._siphonEndY, width: 20 },
        delayFrames: 20,
        color: [140, 80, 180],
        owner: m.id,
      });
    }
    m._siphonTelegraph = 20;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // ===================== FLOOR 3: CENTIPEDE BOSS SPECIALS =====================

  // --- Centipede: Spore Cloud ---
  // Large poison zone (radius 192px) at player position. 6s duration. Poison + slow.
  spore_cloud: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Create large poison zone at player position
    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: player.x, cy: player.y,
        radius: 192,
        duration: 360,
        tickRate: 50,
        tickDamage: Math.round(m.damage * getMobDamageMultiplier()),
        tickEffect: 'poison_tick',
        color: [80, 180, 40],
        slow: 0.2,
      });
    }
    hitEffects.push({ x: player.x, y: player.y, life: 25, type: "poison_cloud" });
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- Centipede: Burrow Surge ---
  // Submerge (invulnerable 60 frames), emerge at player with circle AoE (radius 120px) + knockback.
  burrow_surge: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Submerged phase
    if (m._burrowSubmerged) {
      m._burrowTimer = (m._burrowTimer || 0) - 1;

      // Telegraph appears halfway through submerge
      if (m._burrowTimer === 30 && typeof TelegraphSystem !== 'undefined') {
        TelegraphSystem.create({
          shape: 'circle',
          params: { cx: player.x, cy: player.y, radius: 120 },
          delayFrames: 30,
          color: [100, 180, 50],
          owner: m.id,
        });
        m._burrowTargetX = player.x;
        m._burrowTargetY = player.y;
      }

      if (m._burrowTimer <= 0) {
        // Emerge at target position
        m._invulnerable = false;
        m._burrowSubmerged = false;
        m.x = m._burrowTargetX || player.x;
        m.y = m._burrowTargetY || player.y;
        // Circle AoE damage + knockback
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 120)) {
            const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            // Knockback away from emerge center
            const kDx = player.x - m.x, kDy = player.y - m.y;
            const kDist = Math.sqrt(kDx * kDx + kDy * kDy) || 1;
            player.knockVx = (kDx / kDist) * 16;
            player.knockVy = (kDy / kDist) * 16;
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 25, type: "stomp" });
      }
      return { skip: true };
    }

    // Activate: submerge
    m._invulnerable = true;
    m._burrowSubmerged = true;
    m._burrowTimer = 60;
    m._burrowTargetX = player.x;
    m._burrowTargetY = player.y;
    hitEffects.push({ x: m.x, y: m.y, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Centipede: Toxic Nursery ---
  // Drops 2 egg sacs. Each hatches after 180 frames, spawning 2 toxic_leechling mobs. Max 4 eggs.
  toxic_nursery: (m, ctx) => {
    const { mobs, hitEffects, wave } = ctx;

    if (!m._eggs) m._eggs = [];

    // Tick existing eggs
    for (let i = m._eggs.length - 1; i >= 0; i--) {
      const egg = m._eggs[i];
      egg.timer--;
      if (egg.timer <= 0) {
        // Hatch: spawn 2 toxic_leechling mobs
        const hpMult = getWaveHPMultiplier(wave) * 0.6;
        const spdMult = getWaveSpeedMultiplier(wave);
        for (let si = 0; si < 2; si++) {
          const typeKey = 'toxic_leechling';
          const mt = MOB_TYPES[typeKey];
          if (!mt) continue;

          let sx, sy, foundClear = false;
          for (let attempt = 0; attempt < 20; attempt++) {
            const angle = Math.random() * Math.PI * 2;
            const spawnDist = 40 + Math.random() * 40;
            sx = egg.x + Math.cos(angle) * spawnDist;
            sy = egg.y + Math.sin(angle) * spawnDist;
            if (!positionClear(sx, sy)) continue;
            let tooClose = false;
            const minSep = 40;
            for (const other of mobs) {
              if (other.hp <= 0) continue;
              const odx = sx - other.x, ody = sy - other.y;
              if (odx * odx + ody * ody < minSep * minSep) { tooClose = true; break; }
            }
            if (!tooClose) { foundClear = true; break; }
          }
          if (!foundClear) {
            const fallbackAngle = (si + 1) * Math.PI;
            sx = egg.x + Math.cos(fallbackAngle) * 50;
            sy = egg.y + Math.sin(fallbackAngle) * 50;
          }

          const mobId = nextMobId++;
          mobs.push({
            x: sx, y: sy, type: typeKey, id: mobId,
            hp: Math.round(mt.hp * hpMult), maxHp: Math.round(mt.hp * hpMult),
            speed: capMobSpeed(typeKey, mt.speed * spdMult),
            damage: Math.round(mt.damage * getMobDamageMultiplier()),
            contactRange: mt.contactRange,
            skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
            name: mt.name, dir: 0, frame: 0, attackCooldown: 0,
            shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
            summonRate: 0, summonMax: 0, summonTimer: 0,
            arrowRate: mt.arrowRate || 0, arrowSpeed: mt.arrowSpeed || 0,
            arrowRange: mt.arrowRange || 0, arrowBounces: mt.arrowBounces || 0,
            arrowLife: mt.arrowLife || 0, bowDrawAnim: 0,
            arrowTimer: mt.arrowRate ? Math.max(1, Math.floor(Math.random() * mt.arrowRate)) : 0,
            _specials: mt._specials || null,
            _specialTimer: mt.specialCD || 0,
            _specialCD: mt.specialCD || 0,
            _abilityCDs: {},
            _cloaked: false, _cloakTimer: 0,
            _bombs: [], _mines: [],
            _summonOwnerId: m.id,
            scale: 0.8, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
          });
          hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
        }
        hitEffects.push({ x: egg.x, y: egg.y, life: 20, type: "explosion" });
        m._eggs.splice(i, 1);
      }
    }

    // Don't drop more eggs if at max
    if (m._eggs.length >= 4) return {};

    // Drop 2 egg sacs near mob position
    for (let e = 0; e < 2; e++) {
      if (m._eggs.length >= 4) break;
      const eggAngle = Math.random() * Math.PI * 2;
      const eggDist = 60 + Math.random() * 80;
      const eggX = m.x + Math.cos(eggAngle) * eggDist;
      const eggY = m.y + Math.sin(eggAngle) * eggDist;
      m._eggs.push({ x: eggX, y: eggY, timer: 180 });
      hitEffects.push({ x: eggX, y: eggY - 10, life: 20, type: "cast" });
    }

    return {};
  },

  // --- Centipede: Regrowth ---
  // Passive heal — heals self 3% maxHp. Instant activation.
  regrowth: (m, ctx) => {
    const { hitEffects } = ctx;

    const healAmt = Math.round(m.maxHp * 0.03);
    m.hp = Math.min(m.maxHp, m.hp + healAmt);
    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "heal", dmg: "+" + healAmt });
    return {};
  },

  // ===================== FLOOR 4: TRAP HOUSE SPECIALS =====================

  // --- Tripwire Tech: Tripwire ---
  // Places a line trap toward player. Root + small damage if player crosses. Max 2 traps.
  tripwire: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
    if (!m._traps) m._traps = [];

    // Tick active traps — check player crossing each frame
    for (let i = m._traps.length - 1; i >= 0; i--) {
      const trap = m._traps[i];
      trap.life--;
      if (trap.life <= 0) {
        m._traps.splice(i, 1);
        continue;
      }
      if (trap.triggered) continue;
      // Check if player crosses the line
      if (typeof AttackShapes !== 'undefined') {
        if (AttackShapes.playerInLine(trap.x1, trap.y1, trap.x2, trap.y2, trap.width)) {
          trap.triggered = true;
          const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          StatusFX.applyToPlayer('root', { duration: 48 }); // 0.8s
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "root" });
          hitEffects.push({ x: trap.x1, y: trap.y1, life: 15, type: "spark" });
          m._traps.splice(i, 1);
        }
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: max 2 traps active
    if (m._traps.length >= 2) {
      m._specialTimer = 30;
      return {};
    }

    // Place trap line from mob toward player (5 tiles = 240px)
    const ndx = dx / (dist || 1), ndy = dy / (dist || 1);
    const trapLen = 240;
    const trap = {
      x1: m.x, y1: m.y,
      x2: m.x + ndx * trapLen, y2: m.y + ndy * trapLen,
      width: 20, life: 600, triggered: false,
    };
    m._traps.push(trap);
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 600;
    return {};
  },

  // --- Gizmo Hound: Seek Mine ---
  // Deploys a mine that chases player for 3s then pops in 2-tile AoE. Max 1 mine.
  seek_mine: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 720;
    if (!m._seekMines) m._seekMines = [];

    // Tick active mines
    for (let i = m._seekMines.length - 1; i >= 0; i--) {
      const mine = m._seekMines[i];
      mine.life--;

      // Chase player
      const mdx = player.x - mine.x, mdy = player.y - mine.y;
      const mDist = Math.sqrt(mdx * mdx + mdy * mdy) || 1;
      mine.x += (mdx / mDist) * 3;
      mine.y += (mdy / mDist) * 3;
      hitEffects.push({ x: mine.x, y: mine.y - 5, life: 3, type: "spark" });

      // Pop when expired or very close to player
      if (mine.life <= 0 || mDist < 20) {
        // AoE explosion (radius 96px = 2 tiles)
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(mine.x, mine.y, 96)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('stun', { duration: 18 });
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
          }
        }
        hitEffects.push({ x: mine.x, y: mine.y, life: 20, type: "explosion" });
        m._seekMines.splice(i, 1);
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: max 1 mine active
    if (m._seekMines.length >= 1) {
      m._specialTimer = 30;
      return {};
    }

    m._seekMines.push({
      x: m.x, y: m.y,
      life: 180, // 3s chase
    });
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 720;
    return {};
  },

  // --- Holo Jester: Fake Wall ---
  // Spawns a holographic wall between mob and player. Slow zone. Max 1 active.
  fake_wall: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 840;
    if (!m._fakeWalls) m._fakeWalls = [];

    // Tick active walls — expire them
    for (let i = m._fakeWalls.length - 1; i >= 0; i--) {
      const wall = m._fakeWalls[i];
      wall.life--;
      if (wall.life <= 0) {
        m._fakeWalls.splice(i, 1);
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: max 1 active
    if (m._fakeWalls.length >= 1) {
      m._specialTimer = 30;
      return {};
    }

    // Place wall midpoint between mob and player
    const midX = (m.x + player.x) / 2;
    const midY = (m.y + player.y) / 2;

    m._fakeWalls.push({ x: midX, y: midY, life: 240 });

    // Create hazard zone that slows players walking through
    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: midX, cy: midY,
        radius: 60,
        duration: 240,
        tickRate: 999,
        tickDamage: 0,
        color: [100, 200, 255],
        slow: 0.5,
      });
    }
    hitEffects.push({ x: midX, y: midY, life: 20, type: "cast" });
    m._specialTimer = m._specialCD || 840;
    return {};
  },

  // --- Time Prankster: Rewind Tag ---
  // Marks player position, after 2s pulls player back to that position.
  rewind_tag: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 780;

    // Rewind resolving phase
    if (m._rewindTelegraph) {
      m._rewindTelegraph--;
      if (m._rewindTelegraph <= 0) {
        // Forced teleport player back to marked position
        if (positionClear(m._rewindX, m._rewindY)) {
          player.x = m._rewindX;
          player.y = m._rewindY;
        }
        hitEffects.push({ x: player.x, y: player.y, life: 20, type: "warp" });
      }
      return {};
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 400) {
      m._specialTimer = 30;
      return {};
    }

    // Mark player's current position
    m._rewindX = player.x;
    m._rewindY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m._rewindX, cy: m._rewindY, radius: 48 },
        delayFrames: 120, // 2s delay
        color: [160, 60, 220], // purple
        owner: m.id,
      });
    }
    m._rewindTelegraph = 120;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 780;
    return {};
  },

  // ===================== FLOOR 4: GAME MASTER BOSS SPECIALS =====================

  // --- Game Master: Trap Roulette ---
  // Lights up 6 random tile positions. After 60 frames, tiles explode dealing AoE damage.
  trap_roulette: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Telegraph phase
    if (m._rouletteTelegraph) {
      m._rouletteTelegraph--;
      if (m._rouletteTelegraph <= 0) {
        // Resolve: check each tile for player proximity
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        if (m._rouletteTiles) {
          for (const tile of m._rouletteTiles) {
            const tcx = tile.x * TILE + TILE / 2;
            const tcy = tile.y * TILE + TILE / 2;
            if (typeof AttackShapes !== 'undefined') {
              if (AttackShapes.hitsPlayer(tcx, tcy, TILE)) {
                const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
                hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
                break; // only hit once
              }
            }
            hitEffects.push({ x: tcx, y: tcy, life: 20, type: "explosion" });
          }
        }
        m._rouletteTiles = null;
      }
      return {};
    }

    // Activate: pick 6 random tile positions near player
    const tiles = [];
    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);
    const maxTX = level.widthTiles - 1, maxTY = level.heightTiles - 1;
    for (let i = 0; i < 6; i++) {
      const tx = Math.max(0, Math.min(maxTX, ptx + Math.floor(Math.random() * 7) - 3));
      const ty = Math.max(0, Math.min(maxTY, pty + Math.floor(Math.random() * 7) - 3));
      tiles.push({ x: tx, y: ty });
    }
    m._rouletteTiles = tiles;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'tiles',
        params: { tiles: tiles, tileSize: TILE },
        delayFrames: 60,
        color: [255, 80, 80],
        owner: m.id,
      });
    }
    m._rouletteTelegraph = 60;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- Game Master: Puzzle Lasers ---
  // Creates 2 rotating beam entities that rotate for 5s. Damage if player touches beam.
  puzzle_lasers: (m, ctx) => {
    const { player, hitEffects } = ctx;

    if (!m._lasers) m._lasers = [];

    // Tick active lasers
    for (let i = m._lasers.length - 1; i >= 0; i--) {
      const laser = m._lasers[i];
      laser.life--;
      laser.angle += laser.rotSpeed;

      // Calculate beam line endpoints
      const beamLen = 240;
      const lx2 = laser.cx + Math.cos(laser.angle) * beamLen;
      const ly2 = laser.cy + Math.sin(laser.angle) * beamLen;

      // Check player hit (once per 10 frames to avoid rapid ticking)
      if (laser.life % 10 === 0) {
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(laser.cx, laser.cy, lx2, ly2, 20)) {
            const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
          }
        }
      }
      hitEffects.push({ x: lx2, y: ly2, life: 3, type: "spark" });

      if (laser.life <= 0) {
        m._lasers.splice(i, 1);
      }
    }

    // Clear old lasers if any remain, then spawn 2 new ones
    m._lasers = [];
    const startAngle = Math.atan2(player.y - m.y, player.x - m.x);
    for (let b = 0; b < 2; b++) {
      m._lasers.push({
        cx: m.x, cy: m.y,
        angle: startAngle + b * Math.PI, // 180 degrees apart
        rotSpeed: 0.03 * (b === 0 ? 1 : -1), // opposite rotation
        life: 300, // 5s
      });
    }
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- Game Master: Loot Bait ---
  // Drops a glowing bait entity. Explodes if player walks within 60px. Max 2 baits.
  loot_bait: (m, ctx) => {
    const { player, hitEffects } = ctx;

    if (!m._baits) m._baits = [];

    // Tick active baits
    for (let i = m._baits.length - 1; i >= 0; i--) {
      const bait = m._baits[i];
      bait.life--;

      if (bait.life <= 0) {
        m._baits.splice(i, 1);
        continue;
      }

      // Check player proximity
      const bdx = player.x - bait.x, bdy = player.y - bait.y;
      const bDist = Math.sqrt(bdx * bdx + bdy * bdy);
      if (bDist < 60) {
        // Explode
        const dmg = Math.round(m.damage * getMobDamageMultiplier());
        const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
        hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
        StatusFX.applyToPlayer('root', { duration: 48 }); // 0.8s
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "root" });
        hitEffects.push({ x: bait.x, y: bait.y, life: 20, type: "explosion" });
        m._baits.splice(i, 1);
      }
    }

    // Activate: place bait at random position near player, max 2 active
    if (m._baits.length >= 2) return {};

    const baitX = player.x + (Math.random() * 200 - 100);
    const baitY = player.y + (Math.random() * 200 - 100);
    m._baits.push({ x: baitX, y: baitY, life: 600 });
    hitEffects.push({ x: baitX, y: baitY, life: 20, type: "loot_glow" });
    return {};
  },

  // --- Game Master: Remote Hack ---
  // Applies confuse to player. Circle telegraph at player, 30 frame delay.
  remote_hack: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Telegraph phase
    if (m._hackTelegraph) {
      m._hackTelegraph--;
      if (m._hackTelegraph <= 0) {
        // Resolve: apply confuse
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._hackX, m._hackY, 72)) {
            StatusFX.applyToPlayer('confuse', { duration: 120 }); // 2s
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "confuse" });
          }
        }
      }
      return {};
    }

    // Activate: circle telegraph at player position
    m._hackX = player.x;
    m._hackY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m._hackX, cy: m._hackY, radius: 72 },
        delayFrames: 30,
        color: [200, 50, 200], // purple-pink
        owner: m.id,
      });
    }
    m._hackTelegraph = 30;
    return {};
  },

  // ===================== FLOOR 4: R.E.G.I.M.E SPECIALS =====================

  // --- Enforcer Drone: Suppress Cone ---
  // Cone telegraph (90 degrees, range 120px) toward player. Damage + silence on resolve.
  suppress_cone: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Telegraph phase
    if (m._suppressTelegraph) {
      m._suppressTelegraph--;
      if (m._suppressTelegraph <= 0) {
        // Resolve: damage + silence if player in cone
        if (typeof AttackShapes !== 'undefined') {
          const dir = Math.atan2(player.y - m.y, player.x - m.x);
          const halfAngle = Math.PI / 4; // 90 degrees / 2
          if (AttackShapes.playerInCone(m.x, m.y, dir, halfAngle, 120)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('silence', { duration: 60 }); // 1s
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "silence" });
          }
        }
        m._specialTimer = m._specialCD || 480;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 150) {
      m._specialTimer = 30;
      return {};
    }

    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'cone',
        params: { cx: m.x, cy: m.y, direction: dir, angleDeg: 90, range: 120 },
        delayFrames: 24,
        color: [255, 120, 40],
        owner: m.id,
      });
    }
    m._suppressTelegraph = 24;
    return { skip: true };
  },

  // --- Synth Builder: Barrier Build ---
  // Creates a high-slow shield zone in front of mob toward player. Blocks movement.
  barrier_build: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 840;

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: place barrier midway toward player
    const ndx = dx / (dist || 1), ndy = dy / (dist || 1);
    const barrierDist = Math.min(dist * 0.5, 120);
    const bcx = m.x + ndx * barrierDist;
    const bcy = m.y + ndy * barrierDist;

    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: bcx, cy: bcy,
        radius: 80,
        duration: 360, // 6s
        tickRate: 999,
        tickDamage: 0,
        color: [180, 180, 220],
        slow: 0.6,
      });
    }
    hitEffects.push({ x: bcx, y: bcy, life: 20, type: "shield" });
    m._specialTimer = m._specialCD || 840;
    return {};
  },

  // --- Shock Trooper: Rocket Dash ---
  // Dash toward player (240px) + landing circle AoE explosion. Stun on hit.
  rocket_dash: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 660;

    // Dashing phase
    if (m._rocketDashing) {
      m._rocketDashTimer = (m._rocketDashTimer || 0) - 1;
      const totalFrames = 16;
      const t = 1 - (m._rocketDashTimer / totalFrames);
      m.x = m._rocketStartX + (m._rocketTargetX - m._rocketStartX) * t;
      m.y = m._rocketStartY + (m._rocketTargetY - m._rocketStartY) * t;
      if (m._rocketDashTimer % 3 === 0) {
        hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "afterimage" });
      }
      if (m._rocketDashTimer <= 0) {
        // Landing explosion (radius 80px)
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 80)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('stun', { duration: 18 });
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 20, type: "explosion" });
        // Circle telegraph at landing for visual effect
        if (typeof TelegraphSystem !== 'undefined') {
          TelegraphSystem.create({
            shape: 'circle',
            params: { cx: m.x, cy: m.y, radius: 80 },
            delayFrames: 1,
            color: [255, 100, 40],
            owner: m.id,
          });
        }
        m._rocketDashing = false;
        m._specialTimer = m._specialCD || 660;
      }
      return { skip: true };
    }

    // Telegraph phase
    if (m._rocketTelegraph) {
      m._rocketTelegraph--;
      if (m._rocketTelegraph <= 0) {
        m._rocketDashing = true;
        m._rocketDashTimer = 16;
        m._rocketStartX = m.x;
        m._rocketStartY = m.y;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 350) {
      m._specialTimer = 30;
      return {};
    }

    // Dash toward player (240px), clamped to map bounds and walls
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    let dashTargetX = m.x + Math.cos(dir) * 240;
    let dashTargetY = m.y + Math.sin(dir) * 240;
    const mapW = level.widthTiles * TILE, mapH = level.heightTiles * TILE;
    dashTargetX = Math.max(TILE, Math.min(mapW - TILE, dashTargetX));
    dashTargetY = Math.max(TILE, Math.min(mapH - TILE, dashTargetY));
    if (!positionClear(dashTargetX, dashTargetY)) {
      let lo = 0, hi = 240;
      for (let bi = 0; bi < 8; bi++) {
        const mid = (lo + hi) / 2;
        const tx = m.x + Math.cos(dir) * mid, ty = m.y + Math.sin(dir) * mid;
        if (positionClear(tx, ty)) lo = mid; else hi = mid;
      }
      dashTargetX = m.x + Math.cos(dir) * lo;
      dashTargetY = m.y + Math.sin(dir) * lo;
    }
    m._rocketTargetX = dashTargetX;
    m._rocketTargetY = dashTargetY;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: dashTargetX, y2: dashTargetY, width: 32 },
        delayFrames: 18,
        color: [255, 140, 40],
        owner: m.id,
      });
    }
    m._rocketTelegraph = 18;
    return { skip: true };
  },

  // --- Signal Jammer: EMP Dome ---
  // Ring telegraph centered on mob. On resolve: silence + damage. Purple telegraph.
  emp_dome: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 900;

    // Telegraph phase
    if (m._empDomeTelegraph) {
      m._empDomeTelegraph--;
      if (m._empDomeTelegraph <= 0) {
        // Resolve: silence + damage if player inside ring
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 200)) {
            StatusFX.applyToPlayer('silence', { duration: 90 }); // 1.5s
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "silence" });
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 25, type: "emp_wave" });
        m._specialTimer = m._specialCD || 900;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: player must be close enough for ring to matter
    if (dist >= 260) {
      m._specialTimer = 30;
      return {};
    }

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'ring',
        params: { cx: m.x, cy: m.y, innerRadius: 60, outerRadius: 200 },
        delayFrames: 30,
        color: [160, 60, 220], // purple
        owner: m.id,
      });
    }
    m._empDomeTelegraph = 30;
    return { skip: true };
  },

  // ===================== FLOOR 4: J.U.N.Z BOSS SPECIALS =====================

  // --- J.U.N.Z: Pulse Override ---
  // Circle telegraph at player position. On resolve: damage + stun. Red-orange color.
  pulse_override: (m, ctx) => {
    const { player, hitEffects } = ctx;

    // Telegraph phase
    if (m._pulseTelegraph) {
      m._pulseTelegraph--;
      if (m._pulseTelegraph <= 0) {
        // Resolve: damage + stun if player in circle
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._pulseX, m._pulseY, 120)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            StatusFX.applyToPlayer('stun', { duration: 30 }); // 0.5s
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
          }
        }
        hitEffects.push({ x: m._pulseX, y: m._pulseY, life: 20, type: "explosion" });
      }
      return {};
    }

    // Activate: telegraph at player position
    m._pulseX = player.x;
    m._pulseY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m._pulseX, cy: m._pulseY, radius: 120 },
        delayFrames: 36,
        color: [255, 100, 40], // red-orange
        owner: m.id,
      });
    }
    m._pulseTelegraph = 36;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- J.U.N.Z: Repulsor Beam ---
  // Line telegraph (6 tiles = 288px) toward player. On resolve: push player 3 tiles away + damage.
  repulsor_beam: (m, ctx) => {
    const { dist, dx, dy, player, hitEffects } = ctx;

    // Telegraph phase
    if (m._repulsorTelegraph) {
      m._repulsorTelegraph--;
      if (m._repulsorTelegraph <= 0) {
        // Resolve: push player away + damage
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._repulsorX1, m._repulsorY1, m._repulsorX2, m._repulsorY2, 32)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            // Push player 3 tiles (144px) away from mob
            const pushDist = 144;
            const pdx = player.x - m.x, pdy = player.y - m.y;
            const pDist = Math.sqrt(pdx * pdx + pdy * pdy) || 1;
            const ndx = pdx / pDist, ndy = pdy / pDist;
            let finalX = player.x, finalY = player.y;
            const steps = 6;
            for (let i = 1; i <= steps; i++) {
              const testX = player.x + ndx * (pushDist * i / steps);
              const testY = player.y + ndy * (pushDist * i / steps);
              if (positionClear(testX, testY)) {
                finalX = testX;
                finalY = testY;
              } else {
                break;
              }
            }
            player.x = finalX;
            player.y = finalY;
          }
        }
      }
      return {};
    }

    // Activate: line telegraph from mob toward player
    const ndx = dx / (dist || 1), ndy = dy / (dist || 1);
    m._repulsorX1 = m.x;
    m._repulsorY1 = m.y;
    m._repulsorX2 = m.x + ndx * 288;
    m._repulsorY2 = m.y + ndy * 288;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._repulsorX1, y1: m._repulsorY1, x2: m._repulsorX2, y2: m._repulsorY2, width: 32 },
        delayFrames: 30,
        color: [60, 140, 255], // blue
        owner: m.id,
      });
    }
    m._repulsorTelegraph = 30;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- J.U.N.Z: Nano Armor ---
  // Shield phase — gains shield HP (35% maxHp). Auto-expire after 240 frames.
  nano_armor: (m, ctx) => {
    const { hitEffects } = ctx;

    // Auto-expire existing shield
    if (m._shieldExpireFrame && typeof gameFrame !== 'undefined') {
      if (gameFrame >= m._shieldExpireFrame) {
        m._shieldHp = 0;
        m._shieldExpireFrame = 0;
      }
    }

    // Activate: apply shield
    m._shieldHp = Math.round(m.maxHp * 0.35);
    m._shieldExpireFrame = (typeof gameFrame !== 'undefined' ? gameFrame : 0) + 240; // 4s

    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "shield" });
    hitEffects.push({ x: m.x, y: m.y - 10, life: 12, type: "cast" });
    return {};
  },

  // --- J.U.N.Z: Drone Court ---
  // Spawn 4 micro-drones that orbit for 120 frames then dive at player. Max 4 drones active.
  drone_court: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (!m._drones) m._drones = [];

    // Tick active drones
    for (let i = m._drones.length - 1; i >= 0; i--) {
      const drone = m._drones[i];
      drone.life--;

      if (drone.diving) {
        // Dive toward player
        const ddx = player.x - drone.x, ddy = player.y - drone.y;
        const dDist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
        const diveSpeed = 8;
        drone.x += (ddx / dDist) * diveSpeed;
        drone.y += (ddy / dDist) * diveSpeed;
        // Check hit
        if (dDist < 20) {
          const dmg = Math.round(m.damage * 0.3 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
          hitEffects.push({ x: drone.x, y: drone.y, life: 12, type: "spark" });
          m._drones.splice(i, 1);
          continue;
        }
        // Expired without hitting
        if (drone.life <= 0) {
          hitEffects.push({ x: drone.x, y: drone.y, life: 10, type: "fizzle" });
          m._drones.splice(i, 1);
        }
      } else {
        // Orbiting phase
        drone.orbitTimer--;
        drone.angle += 0.08;
        drone.x = m.x + Math.cos(drone.angle) * drone.orbitRadius;
        drone.y = m.y + Math.sin(drone.angle) * drone.orbitRadius;
        hitEffects.push({ x: drone.x, y: drone.y - 5, life: 3, type: "spark" });
        if (drone.orbitTimer <= 0) {
          drone.diving = true;
          drone.life = 120; // 2s max dive time
        }
        if (drone.life <= 0) {
          m._drones.splice(i, 1);
        }
      }
    }

    // Activate: max 4 drones active
    if (m._drones.length >= 4) return {};

    // Spawn 4 drones
    const toSpawn = 4 - m._drones.length;
    for (let d = 0; d < toSpawn; d++) {
      const angle = (d / 4) * Math.PI * 2;
      m._drones.push({
        x: m.x + Math.cos(angle) * 40,
        y: m.y + Math.sin(angle) * 40,
        angle: angle,
        orbitRadius: 40 + d * 10,
        orbitTimer: 120, // 2s orbit then dive
        diving: false,
        life: 240, // 4s total max lifetime
      });
    }
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // ===================== FLOOR 5: WASTE PLANET SPECIALS =====================

  // --- Rabid Hyenaoid: Bleed Maul ---
  // Dash bite toward player. On hit: damage + bleed DoT.
  bleed_maul: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Dashing phase
    if (m._bleedDash) {
      m._bleedDashTimer = (m._bleedDashTimer || 0) - 1;
      if (m._bleedDashTimer <= 0) {
        // Arrive at target
        m.x = m._dashTargetX;
        m.y = m._dashTargetY;
        // Check if player is in the dash line — damage + bleed if so
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._dashStartX, m._dashStartY, m._dashTargetX, m._dashTargetY, 32)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('bleed', { duration: 240, dmg: 3 });
            }
          }
        }
        m._bleedDash = false;
        m._specialTimer = m._specialCD || 480;
      } else {
        // Lerp toward target during dash
        const t = 1 - (m._bleedDashTimer / 18);
        m.x = m._dashStartX + (m._dashTargetX - m._dashStartX) * t;
        m.y = m._dashStartY + (m._dashTargetY - m._dashStartY) * t;
      }
      return { skip: true };
    }

    // Telegraph phase
    if (m._bleedTelegraph) {
      m._bleedTelegraph--;
      if (m._bleedTelegraph <= 0) {
        // Start dash
        m._bleedDash = true;
        m._bleedDashTimer = 18;
        m._dashStartX = m.x;
        m._dashStartY = m.y;
      }
      return { skip: true };
    }

    // Cooldown countdown
    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 250) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph line from mob to player
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const dashDist = Math.min(dist + 20, 288);
    m._dashTargetX = m.x + Math.cos(dir) * dashDist;
    m._dashTargetY = m.y + Math.sin(dir) * dashDist;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: m._dashTargetX, y2: m._dashTargetY, width: 32 },
        delayFrames: 18,
        color: [220, 50, 50], // red
        owner: m.id,
      });
    }
    m._bleedTelegraph = 18;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Spore Stag: Gore Spore Burst ---
  // Charge line toward player, then create 3 spore hazard zones at impact.
  gore_spore_burst: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Dashing phase
    if (m._goreDash) {
      m._goreDashTimer = (m._goreDashTimer || 0) - 1;
      if (m._goreDashTimer <= 0) {
        m.x = m._goreTargetX;
        m.y = m._goreTargetY;
        // Damage check along dash line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._goreStartX, m._goreStartY, m._goreTargetX, m._goreTargetY, 36)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          }
        }
        // Create 3 spore zones at impact position
        if (typeof HazardSystem !== 'undefined') {
          for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
            const offsetDist = 30 + Math.random() * 40;
            HazardSystem.createZone({
              cx: m._goreTargetX + Math.cos(angle) * offsetDist,
              cy: m._goreTargetY + Math.sin(angle) * offsetDist,
              radius: 60,
              duration: 300,
              tickRate: 50,
              tickDamage: Math.round(m.damage * 0.4 * getMobDamageMultiplier()),
              color: [80, 180, 50], // green poison
              slow: 0,
            });
          }
        }
        hitEffects.push({ x: m._goreTargetX, y: m._goreTargetY, life: 20, type: "explosion" });
        m._goreDash = false;
        m._specialTimer = m._specialCD || 600;
      } else {
        const t = 1 - (m._goreDashTimer / 20);
        m.x = m._goreStartX + (m._goreTargetX - m._goreStartX) * t;
        m.y = m._goreStartY + (m._goreTargetY - m._goreStartY) * t;
      }
      return { skip: true };
    }

    // Telegraph phase
    if (m._goreTelegraph) {
      m._goreTelegraph--;
      if (m._goreTelegraph <= 0) {
        m._goreDash = true;
        m._goreDashTimer = 20;
        m._goreStartX = m.x;
        m._goreStartY = m.y;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 300) {
      m._specialTimer = 30;
      return {};
    }

    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const chargeDist = Math.min(dist + 30, 336);
    m._goreTargetX = m.x + Math.cos(dir) * chargeDist;
    m._goreTargetY = m.y + Math.sin(dir) * chargeDist;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m.x, y1: m.y, x2: m._goreTargetX, y2: m._goreTargetY, width: 36 },
        delayFrames: 24,
        color: [80, 200, 60], // green
        owner: m.id,
      });
    }
    m._goreTelegraph = 24;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Wasteland Raptor: Pounce Pin ---
  // Leap to player position (teleport). On arrive: damage + root.
  pounce_pin: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Telegraph phase
    if (m._pounceTelegraph) {
      m._pounceTelegraph--;
      if (m._pounceTelegraph <= 0) {
        // Teleport to target position
        m.x = m._pounceTargetX;
        m.y = m._pounceTargetY;
        // Check if player is at the impact zone
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._pounceTargetX, m._pounceTargetY, 40)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('root', { duration: 42 }); // 0.7s
            }
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "root" });
          }
        }
        hitEffects.push({ x: m._pounceTargetX, y: m._pounceTargetY, life: 18, type: "impact" });
        m._specialTimer = m._specialCD || 480;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 300) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph circle at player position
    m._pounceTargetX = player.x;
    m._pounceTargetY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: player.x, cy: player.y, radius: 40 },
        delayFrames: 20,
        color: [255, 160, 50], // orange
        owner: m.id,
      });
    }
    m._pounceTelegraph = 20;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Plague Batwing: Screech Ring ---
  // Ring AoE centered on mob. If player in ring: damage + disorient.
  screech_ring: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Telegraph phase
    if (m._screechTelegraph) {
      m._screechTelegraph--;
      if (m._screechTelegraph <= 0) {
        // Resolve: damage + disorient if player in ring
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInRing(m.x, m.y, 30, 150)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('disorient', { duration: 60 }); // 1s
            }
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 25, type: "emp_wave" });
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: player must be close enough for ring to matter
    if (dist >= 280) {
      m._specialTimer = 30;
      return {};
    }

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'ring',
        params: { cx: m.x, cy: m.y, innerRadius: 30, outerRadius: 150 },
        delayFrames: 24,
        color: [160, 60, 220], // purple
        owner: m.id,
      });
    }
    m._screechTelegraph = 24;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Gel Swordsman: Slime Wave Slash ---
  // Line slash toward player. On hit: damage + slow.
  slime_wave_slash: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;

    // Telegraph phase
    if (m._slimeTelegraph) {
      m._slimeTelegraph--;
      if (m._slimeTelegraph <= 0) {
        // Resolve: damage + slow if player in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._slimeX1, m._slimeY1, m._slimeX2, m._slimeY2, 60)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('slow', { amount: 0.4, duration: 42 }); // 0.7s
            }
          }
        }
        hitEffects.push({ x: m._slimeX2, y: m._slimeY2, life: 18, type: "slash" });
        m._specialTimer = m._specialCD || 420;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be close enough
    if (dist >= 200) {
      m._specialTimer = 30;
      return {};
    }

    // Line telegraph toward player, 5 tiles long, width 60
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const slashLen = 240; // 5 tiles
    m._slimeX1 = m.x;
    m._slimeY1 = m.y;
    m._slimeX2 = m.x + Math.cos(dir) * slashLen;
    m._slimeY2 = m.y + Math.sin(dir) * slashLen;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._slimeX1, y1: m._slimeY1, x2: m._slimeX2, y2: m._slimeY2, width: 60 },
        delayFrames: 18,
        color: [50, 200, 180], // teal
        owner: m.id,
      });
    }
    m._slimeTelegraph = 18;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Viscosity Mage: Sticky Field ---
  // Drop sticky slow zone at player position. Instant cast.
  sticky_field: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 320) {
      m._specialTimer = 30;
      return {};
    }

    // Create sticky slow zone at player position
    if (typeof HazardSystem !== 'undefined') {
      HazardSystem.createZone({
        cx: player.x, cy: player.y,
        radius: 80,
        duration: 360,
        tickRate: 999,
        tickDamage: 0,
        color: [120, 80, 200], // purple-ish
        slow: 0.4,
      });
    }
    hitEffects.push({ x: player.x, y: player.y, life: 20, type: "cast" });
    m._specialTimer = m._specialCD || 600;
    return {};
  },

  // --- Core Guardian: Split Response ---
  // Passive ability — split is handled in the damage system, not here.
  split_response: (m, ctx) => {
    if (m._specialTimer === undefined) m._specialTimer = 9999;

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    m._specialTimer = 9999;
    return {};
  },

  // --- Bio-Lum Drone: Glow Mark ---
  // Mark player from range. On hit: small damage + mark debuff.
  glow_mark: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Telegraph phase
    if (m._glowTelegraph) {
      m._glowTelegraph--;
      if (m._glowTelegraph <= 0) {
        // Resolve: damage + mark if player in circle
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._glowTargetX, m._glowTargetY, 36)) {
            const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('mark', { duration: 180 }); // 3s
            }
          }
        }
        m._specialTimer = m._specialCD || 480;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: must be in range
    if (dist >= 250) {
      m._specialTimer = 30;
      return {};
    }

    // Telegraph circle at player position
    m._glowTargetX = player.x;
    m._glowTargetY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: player.x, cy: player.y, radius: 36 },
        delayFrames: 20,
        color: [160, 220, 80], // yellow-green
        owner: m.id,
      });
    }
    m._glowTelegraph = 20;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // ===================== FLOOR 5: LEHVIUS BOSS SPECIALS =====================

  // --- Lehvius: Symbiote Lash ---
  // Line whip toward player. On hit: damage + bleed DoT.
  symbiote_lash: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;

    // Telegraph phase
    if (m._lashTelegraph) {
      m._lashTelegraph--;
      if (m._lashTelegraph <= 0) {
        // Resolve: damage + bleed if player in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._lashX1, m._lashY1, m._lashX2, m._lashY2, 30)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('bleed', { duration: 240, dmg: 3 });
            }
          }
        }
        m._specialTimer = m._specialCD || 360;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates (no range check needed)
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const lashLen = 288; // 6 tiles
    m._lashX1 = m.x;
    m._lashY1 = m.y;
    m._lashX2 = m.x + Math.cos(dir) * lashLen;
    m._lashY2 = m.y + Math.sin(dir) * lashLen;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._lashX1, y1: m._lashY1, x2: m._lashX2, y2: m._lashY2, width: 30 },
        delayFrames: 20,
        color: [80, 200, 60], // green
        owner: m.id,
      });
    }
    m._lashTelegraph = 20;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Lehvius: Toxic Spikes ---
  // Create 4 spike hazard zones in a cross pattern around mob. Instant cast.
  toxic_spikes: (m, ctx) => {
    const { hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Create 4 spike zones in cross pattern
    if (typeof HazardSystem !== 'undefined') {
      const offsets = [
        { dx: 100, dy: 0 }, { dx: -100, dy: 0 },
        { dx: 0, dy: 100 }, { dx: 0, dy: -100 },
      ];
      for (const off of offsets) {
        HazardSystem.createZone({
          cx: m.x + off.dx, cy: m.y + off.dy,
          radius: 50,
          duration: 360,
          tickRate: 45,
          tickDamage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
          color: [100, 200, 60], // toxic green
          slow: 0,
        });
        hitEffects.push({ x: m.x + off.dx, y: m.y + off.dy - 10, life: 15, type: "spike" });
      }
    }
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 540;
    return {};
  },

  // --- Lehvius: Adrenal Surge ---
  // Self-buff: increase speed by 50% for 5s (300 frames). Instant cast.
  adrenal_surge: (m, ctx) => {
    const { hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Tick active boost
    if (m._adrenalBoost && m._adrenalBoost > 0) {
      m._adrenalBoost--;
      if (m._adrenalBoost <= 0) {
        // Restore original speed
        if (m._origSpeed) {
          m.speed = m._origSpeed;
          m._origSpeed = 0;
        }
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Don't stack boosts
    if (m._adrenalBoost && m._adrenalBoost > 0) {
      m._specialTimer = 60;
      return {};
    }

    // Activate: buff speed
    if (!m._origSpeed) m._origSpeed = m.speed;
    m.speed = m._origSpeed * 1.5;
    m._adrenalBoost = 300; // 5s
    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "buff" });
    hitEffects.push({ x: m.x, y: m.y - 30, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 600;
    return {};
  },

  // ===================== FLOOR 5: JACKMAN BOSS SPECIALS =====================

  // --- Jackman: Absorb Barrier ---
  // Shield phase: gain shield HP = 30% maxHp, lasts 240 frames (4s).
  absorb_barrier: (m, ctx) => {
    const { hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Cast animation phase
    if (m._barrierTelegraph) {
      m._barrierTelegraph--;
      if (m._barrierTelegraph <= 0) {
        // Apply shield
        m._shieldHp = Math.round(m.maxHp * 0.3);
        m._shieldExpireFrame = (typeof gameFrame !== 'undefined' ? gameFrame : 0) + 240; // 4s
        hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "shield" });
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    // Auto-expire shield
    if (m._shieldHp && m._shieldExpireFrame && typeof gameFrame !== 'undefined') {
      if (gameFrame >= m._shieldExpireFrame) {
        m._shieldHp = 0;
        m._shieldExpireFrame = 0;
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: brief cast animation
    m._barrierTelegraph = 12;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Jackman: Static Orbs ---
  // Spawn 3 orb entities that orbit then dive toward player.
  static_orbs: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;
    if (!m._staticOrbs) m._staticOrbs = [];

    // Tick active orbs
    for (let i = m._staticOrbs.length - 1; i >= 0; i--) {
      const orb = m._staticOrbs[i];
      orb.life--;

      if (orb.diving) {
        // Dive toward player
        const odx = player.x - orb.x, ody = player.y - orb.y;
        const oDist = Math.sqrt(odx * odx + ody * ody) || 1;
        const diveSpeed = 7;
        orb.x += (odx / oDist) * diveSpeed;
        orb.y += (ody / oDist) * diveSpeed;
        // Check hit
        if (oDist < 20) {
          const dmg = Math.round(m.damage * 0.4 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
          if (typeof StatusFX !== 'undefined') {
            StatusFX.applyToPlayer('stun', { duration: 18 }); // 0.3s
          }
          hitEffects.push({ x: orb.x, y: orb.y, life: 12, type: "spark" });
          m._staticOrbs.splice(i, 1);
          continue;
        }
        if (orb.life <= 0) {
          hitEffects.push({ x: orb.x, y: orb.y, life: 10, type: "fizzle" });
          m._staticOrbs.splice(i, 1);
        }
      } else {
        // Orbiting phase
        orb.orbitTimer--;
        orb.angle += 0.08;
        orb.x = m.x + Math.cos(orb.angle) * 50;
        orb.y = m.y + Math.sin(orb.angle) * 50;
        hitEffects.push({ x: orb.x, y: orb.y - 5, life: 3, type: "spark" });
        if (orb.orbitTimer <= 0) {
          orb.diving = true;
          orb.life = 120; // 2s max dive time
        }
        if (orb.life <= 0) {
          m._staticOrbs.splice(i, 1);
        }
      }
    }

    // Cast animation phase
    if (m._orbTelegraph) {
      m._orbTelegraph--;
      if (m._orbTelegraph <= 0) {
        // Spawn 3 orbs
        for (let d = 0; d < 3; d++) {
          const angle = (d / 3) * Math.PI * 2;
          m._staticOrbs.push({
            x: m.x + Math.cos(angle) * 50,
            y: m.y + Math.sin(angle) * 50,
            angle: angle,
            orbitTimer: 90, // 1.5s orbit then dive
            diving: false,
            life: 180, // 3s total max lifetime
          });
        }
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Activate: max 3 orbs active
    if (m._staticOrbs.length >= 3) {
      m._specialTimer = 30;
      return {};
    }

    m._orbTelegraph = 12;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 12, type: "cast" });
    return { skip: true };
  },

  // --- Jackman: Overcharge Dump ---
  // Large circle AoE centered on Jackman. On hit: big damage + stun.
  overcharge_dump: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 660;

    // Telegraph phase
    if (m._overchargeTelegraph) {
      m._overchargeTelegraph--;
      if (m._overchargeTelegraph <= 0) {
        // Resolve: damage + stun if player in circle
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 160)) {
            const dmg = Math.round(m.damage * 1.5 * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('stun', { duration: 48 }); // 0.8s
            }
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "stun" });
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 25, type: "explosion" });
        m._specialTimer = m._specialCD || 660;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m.x, cy: m.y, radius: 160 },
        delayFrames: 30,
        color: [80, 180, 255], // electric blue
        owner: m.id,
      });
    }
    m._overchargeTelegraph = 30;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // ===================== FLOOR 5: MALRIC BOSS SPECIALS =====================

  // --- Malric: Ooze Blade Arc ---
  // 3-line fan slash toward player. On hit: damage + slow.
  ooze_blade_arc: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 480;

    // Telegraph phase
    if (m._oozeTelegraph) {
      m._oozeTelegraph--;
      if (m._oozeTelegraph <= 0) {
        // Resolve: check all 3 lines, damage + slow if player in any
        let playerHit = false;
        if (typeof AttackShapes !== 'undefined' && m._oozeLines) {
          for (const line of m._oozeLines) {
            if (AttackShapes.playerInLine(line.x1, line.y1, line.x2, line.y2, 40)) {
              playerHit = true;
              break;
            }
          }
        }
        if (playerHit) {
          const dmg = Math.round(m.damage * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
          if (typeof StatusFX !== 'undefined') {
            StatusFX.applyToPlayer('slow', { amount: 0.4, duration: 60 }); // 1s
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 20, type: "slash" });
        m._specialTimer = m._specialCD || 480;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates
    const baseDir = Math.atan2(player.y - m.y, player.x - m.x);
    const arcLen = 240; // 5 tiles
    const spreadAngles = [-Math.PI / 6, 0, Math.PI / 6]; // -30°, 0°, +30°
    m._oozeLines = [];

    for (const offset of spreadAngles) {
      const dir = baseDir + offset;
      const line = {
        x1: m.x, y1: m.y,
        x2: m.x + Math.cos(dir) * arcLen,
        y2: m.y + Math.sin(dir) * arcLen,
      };
      m._oozeLines.push(line);

      if (typeof TelegraphSystem !== 'undefined') {
        TelegraphSystem.create({
          shape: 'line',
          params: { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2, width: 40 },
          delayFrames: 22,
          color: [60, 200, 140], // teal-green
          owner: m.id,
        });
      }
    }
    m._oozeTelegraph = 22;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Malric: Slime Rampart ---
  // Wall of 5 slime hazard zones perpendicular to player direction.
  slime_rampart: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Telegraph phase
    if (m._rampartTelegraph) {
      m._rampartTelegraph--;
      if (m._rampartTelegraph <= 0) {
        // Resolve: create 5 zones in a line perpendicular to mob→player
        if (typeof HazardSystem !== 'undefined' && m._rampartZones) {
          for (const zone of m._rampartZones) {
            HazardSystem.createZone({
              cx: zone.x, cy: zone.y,
              radius: 30,
              duration: 480,
              tickRate: 40,
              tickDamage: Math.round(m.damage * 0.4 * getMobDamageMultiplier()),
              color: [80, 200, 120], // slime green
              slow: 0.35,
            });
            hitEffects.push({ x: zone.x, y: zone.y - 10, life: 15, type: "spike" });
          }
        }
        m._specialTimer = m._specialCD || 600;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates
    // Calculate perpendicular direction
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const perpDir = dir + Math.PI / 2;
    // Place wall midway between mob and player
    const midX = (m.x + player.x) / 2;
    const midY = (m.y + player.y) / 2;

    m._rampartZones = [];
    for (let i = -2; i <= 2; i++) {
      m._rampartZones.push({
        x: midX + Math.cos(perpDir) * (i * 50),
        y: midY + Math.sin(perpDir) * (i * 50),
      });
    }

    // Telegraph: line perpendicular to mob→player direction
    const wallStart = m._rampartZones[0];
    const wallEnd = m._rampartZones[4];
    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: wallStart.x, y1: wallStart.y, x2: wallEnd.x, y2: wallEnd.y, width: 60 },
        delayFrames: 20,
        color: [80, 200, 120], // slime green
        owner: m.id,
      });
    }
    m._rampartTelegraph = 20;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Malric: Melt Floor ---
  // Drop 5 random acid puddles near player. Telegraph then create zones.
  melt_floor: (m, ctx) => {
    const { player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Telegraph phase
    if (m._meltTelegraph) {
      m._meltTelegraph--;
      if (m._meltTelegraph <= 0) {
        // Resolve: create 5 acid zones at telegraphed positions
        if (typeof HazardSystem !== 'undefined' && m._meltTargets) {
          for (const target of m._meltTargets) {
            HazardSystem.createZone({
              cx: target.x, cy: target.y,
              radius: 60,
              duration: 360,
              tickRate: 45,
              tickDamage: Math.round(m.damage * 0.5 * getMobDamageMultiplier()),
              color: [120, 220, 40], // acid green
              slow: 0,
            });
            hitEffects.push({ x: target.x, y: target.y, life: 15, type: "explosion" });
          }
        }
        m._specialTimer = m._specialCD || 540;
      }
      return {};
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates
    // Pick 5 random positions near player
    m._meltTargets = [];
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const offsetDist = 40 + Math.random() * 120;
      m._meltTargets.push({
        x: player.x + Math.cos(angle) * offsetDist,
        y: player.y + Math.sin(angle) * offsetDist,
      });
    }

    // Telegraph: tiles shape at the 5 target positions
    if (typeof TelegraphSystem !== 'undefined') {
      const tiles = m._meltTargets.map(t => ({
        x: Math.floor(t.x / TILE),
        y: Math.floor(t.y / TILE),
      }));
      TelegraphSystem.create({
        shape: 'tiles',
        params: { tiles: tiles, tileSize: TILE },
        delayFrames: 28,
        color: [120, 220, 40], // acid green
        owner: m.id,
      });
    }
    m._meltTelegraph = 28;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return {};
  },

  // --- Malric: Summon Elite ---
  // Summon 2 gel_swordsman minions. Max 2 active.
  summon_elite: (m, ctx) => {
    const { mobs, hitEffects, wave } = ctx;

    // Internal cooldown
    if (!m._summonCD) m._summonCD = 0;
    if (m._summonCD > 0) { m._summonCD--; return {}; }

    // Init tracking array
    if (!m._summonedMinions) m._summonedMinions = [];
    // Filter dead minions
    m._summonedMinions = m._summonedMinions.filter(s => s.hp > 0);

    // Max 2 active minions
    if (m._summonedMinions.length >= 2) return {};

    const typeKey = 'gel_swordsman';
    const mt = MOB_TYPES[typeKey];
    if (!mt) return {};

    const hpMult = getWaveHPMultiplier(wave) * 0.6; // weaker version
    const spdMult = getWaveSpeedMultiplier(wave);
    const toSpawn = 2 - m._summonedMinions.length;

    for (let si = 0; si < toSpawn; si++) {
      // Find clear spawn position near boss
      let sx, sy, foundClear = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const spawnDist = 80 + Math.random() * 60;
        sx = m.x + Math.cos(angle) * spawnDist;
        sy = m.y + Math.sin(angle) * spawnDist;
        if (!positionClear(sx, sy)) continue;
        let tooClose = false;
        const minSep = 40;
        for (const other of mobs) {
          if (other.hp <= 0) continue;
          const odx = sx - other.x, ody = sy - other.y;
          if (odx * odx + ody * ody < minSep * minSep) { tooClose = true; break; }
        }
        if (!tooClose) { foundClear = true; break; }
      }
      if (!foundClear) {
        const fallbackAngle = (si + 1) * Math.PI * 0.7;
        sx = m.x + Math.cos(fallbackAngle) * 60;
        sy = m.y + Math.sin(fallbackAngle) * 60;
      }

      const mobId = nextMobId++;
      const minion = {
        x: sx, y: sy, type: typeKey, id: mobId,
        hp: Math.round(mt.hp * hpMult), maxHp: Math.round(mt.hp * hpMult),
        speed: capMobSpeed(typeKey, mt.speed * spdMult),
        damage: Math.round(mt.damage * getMobDamageMultiplier()),
        contactRange: mt.contactRange,
        skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
        name: mt.name, dir: 0, frame: 0, attackCooldown: 0,
        shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
        summonRate: 0, summonMax: 0, summonTimer: 0,
        arrowRate: mt.arrowRate || 0, arrowSpeed: mt.arrowSpeed || 0,
        arrowRange: mt.arrowRange || 0, arrowBounces: mt.arrowBounces || 0,
        arrowLife: mt.arrowLife || 0, bowDrawAnim: 0,
        arrowTimer: mt.arrowRate ? Math.max(1, Math.floor(Math.random() * mt.arrowRate)) : 0,
        _specials: mt._specials || null,
        _specialTimer: mt.specialCD || 0,
        _specialCD: mt.specialCD || 0,
        _abilityCDs: {},
        _cloaked: false, _cloakTimer: 0,
        _bombs: [], _mines: [],
        _summonOwnerId: m.id,
        scale: 0.85, spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
      };
      mobs.push(minion);
      m._summonedMinions.push(minion);
      hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
    }

    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    m._summonCD = 900; // 15s internal cooldown
    return {};
  },

  // ===================== FLOOR 5: VALE BOSS SPECIALS =====================

  // --- Vale: Shadow Teleport ---
  // Teleport to random position near player. Brief invulnerability.
  shadow_teleport: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 360;

    // Invulnerable/hidden phase
    if (m._shadowTeleport) {
      m._shadowTeleport--;
      m._invulnerable = true;
      m._hidden = true;
      if (m._shadowTeleport <= 0) {
        // Reappear at target position
        const angle = Math.random() * Math.PI * 2;
        const teleportDist = 100 + Math.random() * 100;
        let tx = player.x + Math.cos(angle) * teleportDist;
        let ty = player.y + Math.sin(angle) * teleportDist;
        // Validate position
        if (!positionClear(tx, ty)) {
          // Try opposite angle
          tx = player.x + Math.cos(angle + Math.PI) * teleportDist;
          ty = player.y + Math.sin(angle + Math.PI) * teleportDist;
          if (!positionClear(tx, ty)) {
            tx = player.x + 150;
            ty = player.y;
          }
        }
        m.x = tx;
        m.y = ty;
        m._invulnerable = false;
        m._hidden = false;
        // Damage if very close to player on arrival
        const arrDx = player.x - m.x, arrDy = player.y - m.y;
        const arrDist = Math.sqrt(arrDx * arrDx + arrDy * arrDy);
        if (arrDist < 60) {
          const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
          const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
        }
        hitEffects.push({ x: m.x, y: m.y - 10, life: 20, type: "smoke" });
        m._specialTimer = m._specialCD || 360;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates (use dist < 500 soft check)
    if (dist >= 500) {
      m._specialTimer = 30;
      return {};
    }

    // Start teleport: vanish
    m._shadowTeleport = 15;
    hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "smoke" });
    return { skip: true };
  },

  // --- Vale: Puppet Shot ---
  // Line telegraph toward player. On hit: damage + confuse.
  puppet_shot: (m, ctx) => {
    const { dist, player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 420;

    // Telegraph phase
    if (m._puppetTelegraph) {
      m._puppetTelegraph--;
      if (m._puppetTelegraph <= 0) {
        // Resolve: damage + confuse if player in line
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.playerInLine(m._puppetX1, m._puppetY1, m._puppetX2, m._puppetY2, 28)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('confuse', { duration: 72 }); // 1.2s
            }
          }
        }
        hitEffects.push({ x: m._puppetX2, y: m._puppetY2, life: 15, type: "impact" });
        m._specialTimer = m._specialCD || 420;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    const shotLen = 336; // 7 tiles
    m._puppetX1 = m.x;
    m._puppetY1 = m.y;
    m._puppetX2 = m.x + Math.cos(dir) * shotLen;
    m._puppetY2 = m.y + Math.sin(dir) * shotLen;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'line',
        params: { x1: m._puppetX1, y1: m._puppetY1, x2: m._puppetX2, y2: m._puppetY2, width: 28 },
        delayFrames: 16,
        color: [80, 40, 120], // dark purple
        owner: m.id,
      });
    }
    m._puppetTelegraph = 16;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Vale: Abyss Grasp ---
  // Circle of darkness at player position. On hit: damage + root + darkness zone.
  abyss_grasp: (m, ctx) => {
    const { player, hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 540;

    // Telegraph phase
    if (m._abyssTelegraph) {
      m._abyssTelegraph--;
      if (m._abyssTelegraph <= 0) {
        // Resolve: damage + root if player in circle
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._abyssTargetX, m._abyssTargetY, 120)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            if (typeof StatusFX !== 'undefined') {
              StatusFX.applyToPlayer('root', { duration: 60 }); // 1s
            }
            hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "root" });
          }
        }
        // Create darkness zone
        if (typeof HazardSystem !== 'undefined') {
          HazardSystem.createZone({
            cx: m._abyssTargetX, cy: m._abyssTargetY,
            radius: 120,
            duration: 300,
            tickRate: 50,
            tickDamage: Math.round(m.damage * 0.4 * getMobDamageMultiplier()),
            color: [40, 20, 60], // dark
            slow: 0,
          });
        }
        hitEffects.push({ x: m._abyssTargetX, y: m._abyssTargetY, life: 20, type: "smoke" });
        m._specialTimer = m._specialCD || 540;
      }
      return { skip: true };
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Boss always activates
    m._abyssTargetX = player.x;
    m._abyssTargetY = player.y;

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: player.x, cy: player.y, radius: 120 },
        delayFrames: 26,
        color: [40, 20, 60], // dark
        owner: m.id,
      });
    }
    m._abyssTelegraph = 26;
    hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "cast" });
    return { skip: true };
  },

  // --- Vale: Regen Veil ---
  // Self-heal over 4s. Heal 10% maxHp over 240 frames (4 ticks of 2.5%).
  regen_veil: (m, ctx) => {
    const { hitEffects } = ctx;

    if (m._specialTimer === undefined) m._specialTimer = m._specialCD || 600;

    // Tick active regen
    if (m._regenVeil && m._regenVeil > 0) {
      m._regenVeil--;
      // Heal tick every 60 frames (4 ticks total)
      if (m._regenVeil % 60 === 0 && m._regenVeil > 0) {
        const healAmt = Math.round(m.maxHp * 0.025);
        m.hp = Math.min(m.maxHp, m.hp + healAmt);
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "heal", dmg: "+" + healAmt });
      }
      // Final tick at 0
      if (m._regenVeil <= 0) {
        const healAmt = Math.round(m.maxHp * 0.025);
        m.hp = Math.min(m.maxHp, m.hp + healAmt);
        hitEffects.push({ x: m.x, y: m.y - 20, life: 15, type: "heal", dmg: "+" + healAmt });
      }
    }

    if (m._specialTimer > 0) {
      m._specialTimer--;
      return {};
    }

    // Don't stack regen
    if (m._regenVeil && m._regenVeil > 0) {
      m._specialTimer = 60;
      return {};
    }

    // Activate: start regen
    m._regenVeil = 240; // 4s
    hitEffects.push({ x: m.x, y: m.y - 20, life: 20, type: "buff" });
    hitEffects.push({ x: m.x, y: m.y - 30, life: 15, type: "cast" });
    m._specialTimer = m._specialCD || 600;
    return {}; // Does not skip movement — Vale can move while healing
  },
};

// Ricochet round reuses the archer arrow system (sniper has arrowBounces: 1)
MOB_SPECIALS.ricochet_round = MOB_SPECIALS.archer;
