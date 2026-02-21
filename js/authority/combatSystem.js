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
};
