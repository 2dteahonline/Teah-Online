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
    return { speedMult, rooted, marked: pe._mark, markBonus: pe._markBonus, silenced: pe._silence };
  },

  clearPlayer() {
    const pe = this.playerEffects;
    pe._slow = 0; pe._slowTimer = 0;
    pe._root = false; pe._rootTimer = 0;
    pe._mark = false; pe._markTimer = 0; pe._markBonus = 0;
    pe._silence = false; pe._silenceTimer = 0;
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
      const idealDist = 160;
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
            StatusFX.applyToPlayer('stun', { duration: 36 });
            hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "stun" });
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
        // Resolve: apply mark if player in circle
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m._markX, m._markY, 72)) {
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
        // Resolve: damage + knockback + slow
        if (typeof AttackShapes !== 'undefined') {
          if (AttackShapes.hitsPlayer(m.x, m.y, 96)) {
            const dmg = Math.round(m.damage * getMobDamageMultiplier());
            const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
            hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
            // Knockback 12px away from mob
            const kDx = player.x - m.x, kDy = player.y - m.y;
            const kDist = Math.sqrt(kDx * kDx + kDy * kDy) || 1;
            player.knockVx = (kDx / kDist) * 12;
            player.knockVy = (kDy / kDist) * 12;
            // Slow
            StatusFX.applyToPlayer('slow', { amount: 0.3, duration: 120 });
          }
        }
        hitEffects.push({ x: m.x, y: m.y, life: 20, type: "stomp" });
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

    if (typeof TelegraphSystem !== 'undefined') {
      TelegraphSystem.create({
        shape: 'circle',
        params: { cx: m.x, cy: m.y, radius: 96 },
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
    m._cloakTimer = 60;
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

    // Start dash toward player (8 tiles = 384px)
    const dir = Math.atan2(player.y - m.y, player.x - m.x);
    m._phaseDashing = true;
    m._phaseDashTimer = 16;
    m._phaseDashStartX = m.x;
    m._phaseDashStartY = m.y;
    m._phaseDashTargetX = m.x + Math.cos(dir) * 384;
    m._phaseDashTargetY = m.y + Math.sin(dir) * 384;

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

    // Count active renegade summons
    const activeCount = mobs.filter(s => s._summonOwnerId === m.id && s.hp > 0).length;
    if (activeCount >= 4) return {};

    const renegadeTypes = ['renegade_bruiser', 'renegade_shadowknife', 'renegade_demo', 'renegade_sniper'];
    const hpMult = getWaveHPMultiplier(wave);
    const spdMult = getWaveSpeedMultiplier(wave);
    const toSpawn = Math.min(2, 4 - activeCount);

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
        arrowTimer: mt.arrowRate ? Math.floor(Math.random() * mt.arrowRate) : 0,
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

    return {};
  },
};

// Ricochet round reuses the archer arrow system (sniper has arrowBounces: 1)
MOB_SPECIALS.ricochet_round = MOB_SPECIALS.archer;
