// ===================== MOB SYSTEM =====================
// Authority: mob movement, AI, pathfinding, body blocking, wave state
// Split from inventorySystem.js for single-responsibility

// Global helper: check if a position is wall-free (used by spawning, mob AI, and body blocking)
const POS_HW = 16;
function positionClear(px, py) {
  const cL = Math.floor((px - POS_HW) / TILE), cR = Math.floor((px + POS_HW) / TILE);
  const rT = Math.floor((py - POS_HW) / TILE), rB = Math.floor((py + POS_HW) / TILE);
  return !isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB);
}

// BFS pathfinder — finds shortest tile path from (sx,sy) to (ex,ey)
// Returns array of {x,y} tile coords, or null if no path
// Capped at 400 tiles explored to avoid lag
function bfsPath(sx, sy, ex, ey) {
  if (sx === ex && sy === ey) return [{x:sx,y:sy}];
  const w = level.widthTiles, h = level.heightTiles;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  if (ex < 0 || ey < 0 || ex >= w || ey >= h) return null;

  const visited = new Set();
  const queue = [{x: sx, y: sy, path: [{x: sx, y: sy}]}];
  visited.add(sy * w + sx);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]; // 8-directional
  let explored = 0;

  while (queue.length > 0 && explored < 600) {
    const cur = queue.shift();
    explored++;
    for (const [ddx, ddy] of dirs) {
      const nx = cur.x + ddx, ny = cur.y + ddy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const key = ny * w + nx;
      if (visited.has(key)) continue;
      if (isSolid(nx, ny)) continue;
      // For diagonal moves, check that both adjacent cardinal tiles are clear
      if (ddx !== 0 && ddy !== 0) {
        if (isSolid(cur.x + ddx, cur.y) || isSolid(cur.x, cur.y + ddy)) continue;
      }
      visited.add(key);
      const newPath = [...cur.path, {x: nx, y: ny}];
      if (nx === ex && ny === ey) return newPath;
      // Also accept adjacent to target (close enough)
      if (Math.abs(nx - ex) <= 1 && Math.abs(ny - ey) <= 1) return newPath;
      queue.push({x: nx, y: ny, path: newPath});
    }
  }
  return null; // no path found within budget
}

function updateMobs() {
  if (contactCooldown > 0) contactCooldown--;
  if (phaseTimer > 0) phaseTimer--;

  // Mob separation — push mobs apart so they don't stack
  for (let i = 0; i < mobs.length; i++) {
    const a = mobs[i];
    if (a.hp <= 0) continue;
    for (let j = i + 1; j < mobs.length; j++) {
      const b = mobs[j];
      if (b.hp <= 0) continue;
      const sdx = a.x - b.x, sdy = a.y - b.y;
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      const minSep = 36;
      if (sDist < minSep && sDist > 0.1) {
        const push = (minSep - sDist) * 0.45;
        const px = (sdx / sDist) * push, py = (sdy / sDist) * push;
        // Only push if destination is clear of walls
        if (positionClear(a.x + px, a.y + py)) { a.x += px; a.y += py; }
        if (positionClear(b.x - px, b.y - py)) { b.x -= px; b.y -= py; }
      }
    }
  }

  for (const m of mobs) {
    if (m.hp <= 0) continue;
    if (m.boneSwing > 0) m.boneSwing--;
    // Tick all status effects (stagger, stun, frost, burn)
    const fxResult = StatusFX.tickMob(m);
    if (fxResult.skip) continue; // staggered or stunned — skip movement
    // Test dummy — skip movement but still allow contact damage
    if (!m._testDummy) {

    // Chase player with flanking AI
    const dx = player.x - m.x;
    const dy = player.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // Shooters stop chasing when in range
      const inShootRange = m.shootRange > 0 && dist < m.shootRange;

      if (!inShootRange) {
        // Smart targeting — each mob type has unique trapping behavior
        let targetX = player.x;
        let targetY = player.y;
        const mapCenterX = (level.widthTiles * TILE) / 2;
        const mapCenterY = (level.heightTiles * TILE) / 2;
        const playerToCenterDist = Math.sqrt((player.x - mapCenterX) ** 2 + (player.y - mapCenterY) ** 2);
        const mobToCenterDist = Math.sqrt((m.x - mapCenterX) ** 2 + (m.y - mapCenterY) ** 2);
        const amBetween = mobToCenterDist < playerToCenterDist && dist < playerToCenterDist;

        // Crowding detection — count nearby allies
        let nearbyCount = 0;
        const crowdRadius = 55;
        for (const other of mobs) {
          if (other === m || other.hp <= 0) continue;
          const cdx = m.x - other.x, cdy = m.y - other.y;
          if (cdx * cdx + cdy * cdy < crowdRadius * crowdRadius) nearbyCount++;
        }
        const isCrowded = nearbyCount >= 2;

        // MOB AI dispatch — registry-based movement targeting
        // Look up AI by mob type first, then by the 'ai' field from MOB_TYPES (for Floor mobs that reuse existing AI)
        const aiCtx = { player, dist, dx, dy, targetX, targetY, playerVelX, playerVelY, mapCenterX, mapCenterY, amBetween, isCrowded, mobs };
        const aiKey = MOB_AI[m.type] ? m.type : (MOB_TYPES[m.type] && MOB_TYPES[m.type].ai ? MOB_TYPES[m.type].ai : null);
        if (isCrowded && !CROWD_EXEMPT_TYPES.has(m.type) && dist > 60) {
          ({ targetX, targetY } = MOB_AI.crowded(m, aiCtx));
        } else if (aiKey && MOB_AI[aiKey]) {
          ({ targetX, targetY } = MOB_AI[aiKey](m, aiCtx));
        }

        const tdx = targetX - m.x;
        const tdy = targetY - m.y;
        const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
        const ndx = tDist > 0 ? tdx / tDist : 0;
        const ndy = tDist > 0 ? tdy / tDist : 0;

        // Dynamic speed cap — base speed only, boots should NOT make mobs faster
        const pSpd = player.baseSpeed || 3.5;
        const isRunnerAI = m.type === "runner" || (MOB_TYPES[m.type] && MOB_TYPES[m.type].ai === 'runner');
        const maxSpd = isRunnerAI ? pSpd * 1.1 : pSpd * 0.85;
        let effSpeed = Math.min(m.speed, maxSpd);

        // Apply status effect speed multiplier (frost slow etc.)
        effSpeed *= fxResult.speedMult;

        // === BFS PATHFINDING ===
        // Check if direct line to target is clear (raycast through tiles)
        const myTX = Math.floor(m.x / TILE), myTY = Math.floor(m.y / TILE);
        const tgtTX = Math.floor(targetX / TILE), tgtTY = Math.floor(targetY / TILE);
        let usePathfinding = false;

        // Quick line-of-sight check: sample tiles along the line
        if (dist > TILE) {
          const steps = Math.ceil(dist / TILE);
          for (let s = 1; s < steps; s++) {
            const t = s / steps;
            const cx = Math.floor((m.x + tdx * t) / TILE);
            const cy = Math.floor((m.y + tdy * t) / TILE);
            if (isSolid(cx, cy)) { usePathfinding = true; break; }
          }
        }

        let moveX, moveY;

        if (usePathfinding) {
          // BFS from mob tile to target tile — cached per mob, refresh every 10 frames
          // Refresh immediately if mob is near a wall (within 2 tiles)
          const nearWall = isSolid(myTX-1, myTY) || isSolid(myTX+1, myTY) ||
                           isSolid(myTX, myTY-1) || isSolid(myTX, myTY+1);
          const maxAge = nearWall ? 5 : 12;
          if (!m._pathCache || !m._pathAge || m._pathAge++ > maxAge ||
              m._pathTargetTX !== tgtTX || m._pathTargetTY !== tgtTY) {
            m._pathCache = bfsPath(myTX, myTY, tgtTX, tgtTY);
            m._pathAge = 0;
            m._pathTargetTX = tgtTX;
            m._pathTargetTY = tgtTY;
          }

          const path = m._pathCache;
          if (path && path.length > 1) {
            // Follow next waypoint (skip first which is current tile)
            const wp = path[1];
            const wpX = wp.x * TILE + TILE / 2;
            const wpY = wp.y * TILE + TILE / 2;
            const wdx = wpX - m.x, wdy = wpY - m.y;
            const wDist = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
            moveX = (wdx / wDist) * effSpeed;
            moveY = (wdy / wDist) * effSpeed;
          } else {
            // No path found or already at target — move direct
            moveX = ndx * effSpeed;
            moveY = ndy * effSpeed;
          }
        } else {
          // Clear line of sight — go straight
          moveX = ndx * effSpeed;
          moveY = ndy * effSpeed;
          m._pathCache = null;
        }

      // Update facing direction based on target (not movement)
      if (Math.abs(dx) > Math.abs(dy)) {
        m.dir = dx > 0 ? 3 : 2;
      } else {
        m.dir = dy > 0 ? 0 : 1;
      }

      // Apply movement with AABB tile collision + sliding
      const mhw = 14;
      const nx = m.x + moveX;
      const ny = m.y + moveY;
      let movedX = false, movedY = false;

      // Try X
      let cL = Math.floor((nx - mhw) / TILE), cR = Math.floor((nx + mhw) / TILE);
      let rT = Math.floor((m.y - mhw) / TILE), rB = Math.floor((m.y + mhw) / TILE);
      if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
        m.x = nx; movedX = true;
      }
      // Try Y
      cL = Math.floor((m.x - mhw) / TILE); cR = Math.floor((m.x + mhw) / TILE);
      rT = Math.floor((ny - mhw) / TILE); rB = Math.floor((ny + mhw) / TILE);
      if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
        m.y = ny; movedY = true;
      }

      // If blocked on one axis, try to slide along the other with reduced speed
      if (!movedX && movedY) {
        // Slide along Y — try small X nudge to unstick from corner
        const nudge = moveX > 0 ? -1.5 : 1.5;
        if (positionClear(m.x + nudge, m.y)) m.x += nudge;
      }
      if (movedX && !movedY) {
        const nudge = moveY > 0 ? -1.5 : 1.5;
        if (positionClear(m.x, m.y + nudge)) m.y += nudge;
      }

      // If fully stuck on both axes, try sliding along walls smoothly
      if (!movedX && !movedY) {
        // Try each axis independently at half speed
        const halfX = moveX * 0.5, halfY = moveY * 0.5;
        const hxL = Math.floor((m.x + halfX - mhw) / TILE), hxR = Math.floor((m.x + halfX + mhw) / TILE);
        const hyT = Math.floor((m.y - mhw) / TILE), hyB = Math.floor((m.y + mhw) / TILE);
        if (!isSolid(hxL, hyT) && !isSolid(hxR, hyT) && !isSolid(hxL, hyB) && !isSolid(hxR, hyB)) {
          m.x += halfX;
        } else {
          const hyL = Math.floor((m.x - mhw) / TILE), hyR = Math.floor((m.x + mhw) / TILE);
          const hyT2 = Math.floor((m.y + halfY - mhw) / TILE), hyB2 = Math.floor((m.y + halfY + mhw) / TILE);
          if (!isSolid(hyL, hyT2) && !isSolid(hyR, hyT2) && !isSolid(hyL, hyB2) && !isSolid(hyR, hyB2)) {
            m.y += halfY;
          }
        }
      }

      // SMOOTH WALL REPULSION: if mob is overlapping a wall, gently push out
      if (!positionClear(m.x, m.y)) {
        // Find push direction: check which side has open space and push that way
        const pushStr = 2.5; // smooth push speed per frame
        let pushX = 0, pushY = 0;
        // Sample 8 directions to find where open space is
        for (let a = 0; a < 8; a++) {
          const ang = a * Math.PI / 4;
          const testX = m.x + Math.cos(ang) * TILE;
          const testY = m.y + Math.sin(ang) * TILE;
          if (positionClear(testX, testY)) {
            pushX += Math.cos(ang);
            pushY += Math.sin(ang);
          }
        }
        const pLen = Math.sqrt(pushX * pushX + pushY * pushY);
        if (pLen > 0) {
          const newX = m.x + (pushX / pLen) * pushStr;
          const newY = m.y + (pushY / pLen) * pushStr;
          m.x = newX;
          m.y = newY;
        } else {
          // Completely stuck — find nearest clear tile center as last resort
          const mtx = Math.floor(m.x / TILE), mty = Math.floor(m.y / TILE);
          for (let r = 1; r <= 3; r++) {
            let found = false;
            for (let dy2 = -r; dy2 <= r && !found; dy2++) {
              for (let dx2 = -r; dx2 <= r && !found; dx2++) {
                if (Math.abs(dx2) !== r && Math.abs(dy2) !== r) continue;
                if (!isSolid(mtx + dx2, mty + dy2)) {
                  m.x = (mtx + dx2) * TILE + TILE / 2;
                  m.y = (mty + dy2) * TILE + TILE / 2;
                  found = true;
                }
              }
            }
            if (found) break;
          }
        }
        m._pathCache = null;
      }

      // Animate
      m.frame = (m.frame + 0.08) % 4;
      } else {
        // Shooter in range — face player but don't move
        if (Math.abs(dx) > Math.abs(dy)) {
          m.dir = dx > 0 ? 3 : 2;
        } else {
          m.dir = dy > 0 ? 0 : 1;
        }
      }
    }

    // Shooter ranged attack (/nofire disables mob shooting)
    if (!window._mobsNoFire && m.shootRange > 0 && dist < m.shootRange * 1.2) {
      if (m.shootTimer > 0) {
        m.shootTimer--;
      } else {
        m.shootTimer = m.shootRate;
        // Fire bullet at player
        const ndx = dx / dist;
        const ndy = dy / dist;
        bullets.push({
          id: nextBulletId++,
          x: m.x,
          y: m.y - 10,
          vx: ndx * m.bulletSpeed,
          vy: ndy * m.bulletSpeed,
          fromPlayer: false,
          mobBullet: true,
          damage: m.damage,
          ownerId: m.id,
        });
      }
    }

    // MOB SPECIALS dispatch — registry-based special attacks (/nofire disables all)
    if (window._mobsNoFire) { /* skip all specials */ }
    else if (MOB_SPECIALS[m.type]) {
      // Legacy mob types (witch, golem, etc.) keyed by type name
      const specCtx = { dist, dx, dy, player, mobs, hitEffects, bullets, wave, playerDead };
      const specResult = MOB_SPECIALS[m.type](m, specCtx);
      if (specResult.skip) continue;
    } else if (m._specials && m._specials.length > 0) {
      // Floor 1+ mobs: specials keyed by ability name in _specials array
      const specCtx = { dist, dx, dy, player, mobs, hitEffects, bullets, wave, playerDead };
      let skipMovement = false;

      // Floor 1+ archer-type mobs: fire arrows alongside their specials
      if (m.arrowRate > 0 && MOB_SPECIALS.archer) {
        MOB_SPECIALS.archer(m, specCtx);
      }

      if (m._specials.length === 1) {
        // Single-special mob: call the named special every frame (CD managed internally)
        const handler = MOB_SPECIALS[m._specials[0]];
        if (handler) {
          const specResult = handler(m, specCtx);
          if (specResult && specResult.skip) skipMovement = true;
        }
      } else {
        // Multi-special boss: ability rotation system
        // 1) Always tick persistent entities (mines, bombs, shield expire) every frame
        // Auto-expire shields (golden_parachute)
        if (m._shieldExpireFrame && typeof gameFrame !== 'undefined' && gameFrame >= m._shieldExpireFrame) {
          m._shieldHp = 0;
          m._shieldExpireFrame = 0;
        }
        if (m._mines && m._mines.length > 0) {
          // Tick mines every frame (proximity check + arming)
          for (let mi = m._mines.length - 1; mi >= 0; mi--) {
            const mine = m._mines[mi];
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
              m._mines.splice(mi, 1);
            }
          }
        }
        // Tick persistent pillars (Voltmaster)
        if (m._pillars && m._pillars.length > 0 && m._activeAbility !== 'tesla_pillars') {
          for (let pi = m._pillars.length - 1; pi >= 0; pi--) {
            const pillar = m._pillars[pi];
            pillar.life--;
            if (pillar.life <= 0) {
              hitEffects.push({ x: pillar.x, y: pillar.y, life: 15, type: "fizzle" });
              m._pillars.splice(pi, 1);
              continue;
            }
            pillar.zapTimer = (pillar.zapTimer || 0) - 1;
            if (pillar.zapTimer <= 0 && pillar.pairedWith !== undefined) {
              const partner = m._pillars.find(p => p.id === pillar.pairedWith);
              if (partner && partner.life > 0) {
                if (typeof AttackShapes !== 'undefined') {
                  if (AttackShapes.playerInLine(pillar.x, pillar.y, partner.x, partner.y, 24)) {
                    const dmg = Math.round(m.damage * 0.8 * getMobDamageMultiplier());
                    const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
                    hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dealt });
                  }
                }
                hitEffects.push({
                  x: pillar.x, y: pillar.y - 10,
                  x2: partner.x, y2: partner.y - 10,
                  life: 12, type: "lightning_arc",
                });
              }
              pillar.zapTimer = 120;
            }
          }
        }
        // Tick persistent turrets (Suit Enforcer summons via hostile_takeover adds)
        if (m._turrets && m._turrets.length > 0 && m._activeAbility !== 'briefcase_turret') {
          for (let ti = m._turrets.length - 1; ti >= 0; ti--) {
            const turret = m._turrets[ti];
            turret.life--;
            if (turret.life <= 0) {
              hitEffects.push({ x: turret.x, y: turret.y, life: 15, type: "fizzle" });
              m._turrets.splice(ti, 1);
              continue;
            }
            turret.fireTimer = (turret.fireTimer || 0) - 1;
            if (turret.fireTimer <= 0) {
              const tdx = player.x - turret.x, tdy = player.y - turret.y;
              const tDist = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
              bullets.push({
                id: nextBulletId++,
                x: turret.x, y: turret.y - 10,
                vx: (tdx / tDist) * 5, vy: (tdy / tDist) * 5,
                fromPlayer: false, mobBullet: true,
                damage: Math.round(m.damage * 0.6 * getMobDamageMultiplier()),
                ownerId: m.id, bulletColor: null,
              });
              turret.fireTimer = 60;
            }
          }
        }
        // Tick persistent drones
        if (m._drones && m._drones.length > 0 && m._activeAbility !== 'drone_swarm') {
          for (let di = m._drones.length - 1; di >= 0; di--) {
            const drone = m._drones[di];
            drone.life--;
            if (drone.diving) {
              const ddx = player.x - drone.x, ddy = player.y - drone.y;
              const dDist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
              drone.x += (ddx / dDist) * 8;
              drone.y += (ddy / dDist) * 8;
              if (dDist < 20) {
                const dmg = Math.round(m.damage * 0.4 * getMobDamageMultiplier());
                const dealt = dealDamageToPlayer(dmg, 'mob_special', m);
                hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dealt });
                m._drones.splice(di, 1);
              } else if (drone.life <= 0) {
                m._drones.splice(di, 1);
              }
            } else {
              drone.orbitTimer--;
              drone.angle += 0.08;
              drone.x = m.x + Math.cos(drone.angle) * drone.orbitRadius;
              drone.y = m.y + Math.sin(drone.angle) * drone.orbitRadius;
              if (drone.orbitTimer <= 0) { drone.diving = true; drone.life = 120; }
              if (drone.life <= 0) { m._drones.splice(di, 1); }
            }
          }
        }

        // Tick persistent lasers (Game Master puzzle_lasers) — track toward player
        if (m._lasers && m._lasers.length > 0 && m._activeAbility !== 'puzzle_lasers') {
          for (let li = m._lasers.length - 1; li >= 0; li--) {
            const laser = m._lasers[li];
            laser.life--;
            if (laser.life <= 0) { m._lasers.splice(li, 1); continue; }
            // Track toward player — fast enough to keep up with movement
            const targetAngle = Math.atan2(player.y - laser.cy, player.x - laser.cx);
            let diff = targetAngle - laser.angle;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            laser.angle += diff * 0.18;
            // Follow mob position
            laser.cx = m.x;
            laser.cy = m.y;
            // Check player in beam every 10 frames
            if (laser.life % 10 === 0 && typeof AttackShapes !== 'undefined') {
              const endX = laser.cx + Math.cos(laser.angle) * laser.length;
              const endY = laser.cy + Math.sin(laser.angle) * laser.length;
              if (AttackShapes.playerInLine(laser.cx, laser.cy, endX, endY, 24)) {
                const dmg = Math.round(m.damage * 0.5 * getMobDamageMultiplier());
                dealDamageToPlayer(dmg, 'mob_special', m);
                hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dmg });
              }
            }
          }
        }
        // Tick persistent baits (Game Master loot_bait)
        if (m._baits && m._baits.length > 0 && m._activeAbility !== 'loot_bait') {
          for (let bi = m._baits.length - 1; bi >= 0; bi--) {
            const bait = m._baits[bi];
            bait.life--;
            if (bait.life <= 0) { m._baits.splice(bi, 1); continue; }
            const bdx = player.x - bait.x, bdy = player.y - bait.y;
            if (bdx * bdx + bdy * bdy <= 60 * 60) {
              const dmg = Math.round(m.damage * getMobDamageMultiplier());
              dealDamageToPlayer(dmg, 'mob_special', m);
              StatusFX.applyToPlayer('root', { duration: 48 });
              hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
              hitEffects.push({ x: bait.x, y: bait.y, life: 20, type: "explosion" });
              m._baits.splice(bi, 1);
            }
          }
        }

        // Tick persistent rocket drones (Junz drone_court, Enforcer suppress_cone)
        if (m._rocketDrones && m._rocketDrones.length > 0 && m._activeAbility !== 'drone_court' && m._activeAbility !== 'suppress_cone') {
          for (let rdi = m._rocketDrones.length - 1; rdi >= 0; rdi--) {
            const drone = m._rocketDrones[rdi];
            drone.life--;
            if (drone.life <= 0) {
              hitEffects.push({ x: drone.x, y: drone.y, life: 15, type: "fizzle" });
              m._rocketDrones.splice(rdi, 1);
              continue;
            }
            // Orbit if has orbitRadius (Junz drones orbit)
            if (drone.orbitRadius) {
              drone.angle += 0.04;
              drone.x = m.x + Math.cos(drone.angle) * drone.orbitRadius;
              drone.y = m.y + Math.sin(drone.angle) * drone.orbitRadius;
            }
            // Fire bullets
            drone.fireTimer = (drone.fireTimer || 0) - 1;
            if (drone.fireTimer <= 0) {
              const ddx = player.x - drone.x, ddy = player.y - drone.y;
              const dDist = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
              const gunAngle = Math.atan2(ddy, ddx);
              const bulletX = drone.x + Math.cos(gunAngle) * 12;
              const bulletY = drone.y + 2 + Math.sin(gunAngle) * 12;
              bullets.push({
                id: nextBulletId++, x: bulletX, y: bulletY,
                vx: (ddx / dDist) * 5, vy: (ddy / dDist) * 5,
                fromPlayer: false, mobBullet: true,
                damage: Math.round(m.damage * 0.3 * getMobDamageMultiplier()),
                ownerId: m.id, bulletColor: null,
              });
              hitEffects.push({ x: bulletX, y: bulletY, life: 5, type: "spark" });
              drone.fireTimer = 25;
            }
          }
        }
        // Tick persistent Junz beam (repulsor_beam) — continues tracking while boss uses other abilities
        if (m._junzBeam && m._junzBeam.life > 0 && m._activeAbility !== 'repulsor_beam') {
          m._junzBeam.life--;
          // Track toward player
          const targetAngle = Math.atan2(player.y - m._junzBeam.cy, player.x - m._junzBeam.cx);
          let diff = targetAngle - m._junzBeam.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          m._junzBeam.angle += diff * 0.18; // fast tracking — keeps up with player
          // Follow mob position
          m._junzBeam.cx = m.x;
          m._junzBeam.cy = m.y;
          // Damage check every 10 frames
          if (m._junzBeam.life % 10 === 0 && typeof AttackShapes !== 'undefined') {
            const endX = m._junzBeam.cx + Math.cos(m._junzBeam.angle) * m._junzBeam.length;
            const endY = m._junzBeam.cy + Math.sin(m._junzBeam.angle) * m._junzBeam.length;
            if (AttackShapes.playerInLine(m._junzBeam.cx, m._junzBeam.cy, endX, endY, 28)) {
              const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
              dealDamageToPlayer(dmg, 'mob_special', m);
              hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dmg });
            }
          }
          if (m._junzBeam.life <= 0) m._junzBeam = null;
        }
        // Tick persistent holo clones (Holo Jester fake_wall — for boss rotation cases)
        if (m._holoClones && m._holoClones.length > 0 && m._activeAbility !== 'fake_wall') {
          for (let ci = m._holoClones.length - 1; ci >= 0; ci--) {
            const clone = m._holoClones[ci];
            clone.life--;
            clone.frame = (clone.frame || 0) + 0.08;
            const cdx = player.x - clone.x, cdy = player.y - clone.y;
            const cDist = Math.sqrt(cdx * cdx + cdy * cdy) || 1;
            clone.x += (cdx / cDist) * 1.5;
            clone.y += (cdy / cDist) * 1.5;
            if (Math.abs(cdx) > Math.abs(cdy)) {
              clone.dir = cdx > 0 ? 'right' : 'left';
            } else {
              clone.dir = cdy > 0 ? 'down' : 'up';
            }
            if (cDist < 32) {
              const dmg = Math.round(m.damage * 0.6 * getMobDamageMultiplier());
              dealDamageToPlayer(dmg, 'mob_special', m);
              StatusFX.applyToPlayer('confuse', { duration: 60 });
              hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmg });
              hitEffects.push({ x: clone.x, y: clone.y, life: 20, type: "explosion" });
              m._holoClones.splice(ci, 1);
            } else if (clone.life <= 0) {
              hitEffects.push({ x: clone.x, y: clone.y, life: 15, type: "fizzle" });
              m._holoClones.splice(ci, 1);
            }
          }
        }
        // Tick persistent static orbs (Jackman static_orbs)
        if (m._staticOrbs && m._staticOrbs.length > 0 && m._activeAbility !== 'static_orbs') {
          for (let oi = m._staticOrbs.length - 1; oi >= 0; oi--) {
            const orb = m._staticOrbs[oi];
            orb.life--;
            if (orb.life <= 0) { m._staticOrbs.splice(oi, 1); continue; }
            if (!orb.diving) {
              orb.orbitTimer--;
              orb.angle += 0.08;
              orb.x = m.x + Math.cos(orb.angle) * orb.orbitRadius;
              orb.y = m.y + Math.sin(orb.angle) * orb.orbitRadius;
              if (orb.orbitTimer <= 0) {
                orb.diving = true;
                orb.targetX = player.x;
                orb.targetY = player.y;
              }
            } else {
              const odx = orb.targetX - orb.x, ody = orb.targetY - orb.y;
              const oDist = Math.sqrt(odx * odx + ody * ody) || 1;
              const spd = 5;
              orb.x += (odx / oDist) * spd;
              orb.y += (ody / oDist) * spd;
              const pdx = player.x - orb.x, pdy = player.y - orb.y;
              if (pdx * pdx + pdy * pdy <= 40 * 40) {
                const dmg = Math.round(m.damage * 0.35 * getMobDamageMultiplier());
                dealDamageToPlayer(dmg, 'mob_special', m);
                StatusFX.applyToPlayer('stun', { duration: 18 });
                hitEffects.push({ x: player.x, y: player.y - 10, life: 15, type: "hit", dmg: dmg });
                m._staticOrbs.splice(oi, 1);
              } else if (oDist < 10) {
                m._staticOrbs.splice(oi, 1);
              }
            }
          }
        }

        // Tick adrenal surge timer (Lehvius)
        if (m._adrenalBoost && m._adrenalBoost > 0 && m._activeAbility !== 'adrenal_surge') {
          m._adrenalBoost--;
          if (m._adrenalBoost <= 0 && m._origSpeed) {
            m.speed = m._origSpeed;
          }
        }

        // Tick regen veil (Vale)
        if (m._regenVeil && m._regenVeil > 0 && m._activeAbility !== 'regen_veil') {
          m._regenVeil--;
          if (m._regenVeil % 60 === 0 && m._regenVeil > 0) {
            const heal = Math.round(m.maxHp * 0.025);
            m.hp = Math.min(m.maxHp, m.hp + heal);
            hitEffects.push({ x: m.x, y: m.y - 30, life: 20, type: "heal" });
          }
        }

        // Tick egg sacs (Centipede toxic_nursery) — must tick even when other abilities are active
        if (m._eggs && m._eggs.length > 0 && m._activeAbility !== 'toxic_nursery') {
          for (let ei = m._eggs.length - 1; ei >= 0; ei--) {
            const egg = m._eggs[ei];
            egg.timer--;
            if (egg.timer <= 0) {
              // Hatch: spawn 2 toxic_leechling mobs on walkable tiles
              const hpMult = getWaveHPMultiplier(wave) * 0.6;
              const spdMult = getWaveSpeedMultiplier(wave);
              for (let si = 0; si < 2; si++) {
                const mt = MOB_TYPES['toxic_leechling'];
                if (!mt) continue;
                let sx, sy, foundClear = false;
                for (let attempt = 0; attempt < 15; attempt++) {
                  const angle = Math.random() * Math.PI * 2;
                  const spawnDist = 40 + Math.random() * 40;
                  sx = egg.x + Math.cos(angle) * spawnDist;
                  sy = egg.y + Math.sin(angle) * spawnDist;
                  if (positionClear(sx, sy)) { foundClear = true; break; }
                }
                if (!foundClear) { sx = egg.x; sy = egg.y; }
                mobs.push(createMob('toxic_leechling', sx, sy, hpMult, spdMult, { ownerId: m.id, scale: 0.8 }));
                hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
              }
              hitEffects.push({ x: egg.x, y: egg.y, life: 20, type: "explosion" });
              m._eggs.splice(ei, 1);
            }
          }
        }

        // 2) If an ability is actively executing (multi-frame), continue it
        if (m._activeAbility) {
          const handler = MOB_SPECIALS[m._activeAbility];
          if (handler) {
            const specResult = handler(m, specCtx);
            if (specResult && specResult.skip) skipMovement = true;
            // Check if ability is still active (has ongoing state)
            const stillActive = m._laserTelegraph > 0 || m._tommyFiring ||
              m._phaseDashing || m._blinkDashing || m._blinkTelegraph > 0 ||
              m._stunTelegraph > 0 || m._poundTelegraph > 0 ||
              m._barrageResolving ||
              // Floor 2
              m._drainTelegraph > 0 || m._weldTelegraph > 0 ||
              m._chargeDashing || m._chargeTelegraph > 0 || m._teslaSprinting ||
              m._chainTelegraph > 0 || m._empTelegraph > 0 || m._magnetTelegraph > 0 ||
              m._tapeTelegraph > 0 || m._penaltyTelegraph > 0 ||
              m._dividendFiring || m._parachuteDashing ||
              // Floor 3
              m._magTelegraph > 0 || m._magPulling || m._sawTelegraph > 0 ||
              m._pileDriverTelegraph > 0 || m._grabTelegraph > 0 || m._grabHolding > 0 || m._grabPulling || m._grabTossing ||
              m._latchDashing || m._latchTelegraph > 0 ||
              m._submerged || m._siphonTelegraph > 0 || m._burrowSubmerged ||
              // Floor 4
              m._rewindTelegraph > 0 || m._rouletteTelegraph > 0 || m._hackTelegraph > 0 ||
              m._suppressTelegraph > 0 || m._rocketDashing || m._rocketTelegraph > 0 ||
              m._empDomeTelegraph > 0 || m._pulseTelegraph > 0 || m._repulsorTelegraph > 0 ||
              // Floor 5
              m._bleedDash || m._bleedTelegraph > 0 || m._goreDash || m._goreTelegraph > 0 ||
              m._pounceTelegraph > 0 || m._screechTelegraph > 0 || m._slimeTelegraph > 0 ||
              m._glowTelegraph > 0 || m._lashTelegraph > 0 || m._barrierTelegraph > 0 ||
              m._orbTelegraph > 0 || m._overchargeTelegraph > 0 ||
              m._oozeTelegraph > 0 || m._rampartTelegraph > 0 || m._meltTelegraph > 0 ||
              m._shadowTeleport > 0 || m._puppetTelegraph > 0 || m._abyssTelegraph > 0;
            if (!stillActive) {
              m._activeAbility = null;
            }
          }
        }

        // 3) If no active ability, tick CDs and find next ready ability
        if (!m._activeAbility) {
          if (m._abilityIndex === undefined) m._abilityIndex = 0;
          if (!m._abilityCDs || Object.keys(m._abilityCDs).length === 0) {
            m._abilityCDs = {};
            for (const s of m._specials) {
              m._abilityCDs[s] = Math.floor(120 + Math.random() * 120);
            }
          }
          // Tick all CDs
          for (const abilKey of m._specials) {
            if (m._abilityCDs[abilKey] > 0) m._abilityCDs[abilKey]--;
          }
          // Find next ready ability (round-robin from current index)
          for (let ai = 0; ai < m._specials.length; ai++) {
            const abilIdx = (m._abilityIndex + ai) % m._specials.length;
            const abilKey = m._specials[abilIdx];
            if (m._abilityCDs[abilKey] > 0) continue;
            const handler = MOB_SPECIALS[abilKey];
            if (!handler) continue;
            m._specialTimer = 0; // Reset shared timer so boss handler activates immediately
            const specResult = handler(m, specCtx);
            // Reset CD
            m._abilityCDs[abilKey] = m._specialCD || 300;
            // Advance rotation
            m._abilityIndex = (abilIdx + 1) % m._specials.length;
            // Track active multi-frame abilities
            const isMultiFrame = m._laserTelegraph > 0 || m._tommyFiring ||
              m._phaseDashing || m._blinkDashing || m._blinkTelegraph > 0 ||
              m._barrageResolving ||
              // Floor 2
              m._drainTelegraph > 0 || m._weldTelegraph > 0 ||
              m._chargeDashing || m._chargeTelegraph > 0 || m._teslaSprinting ||
              m._chainTelegraph > 0 || m._empTelegraph > 0 || m._magnetTelegraph > 0 ||
              m._tapeTelegraph > 0 || m._penaltyTelegraph > 0 ||
              m._dividendFiring || m._parachuteDashing ||
              // Floor 3
              m._magTelegraph > 0 || m._magPulling || m._sawTelegraph > 0 ||
              m._pileDriverTelegraph > 0 || m._grabTelegraph > 0 || m._grabHolding > 0 || m._grabPulling || m._grabTossing ||
              m._latchDashing || m._latchTelegraph > 0 ||
              m._submerged || m._siphonTelegraph > 0 || m._burrowSubmerged ||
              // Floor 4
              m._rewindTelegraph > 0 || m._rouletteTelegraph > 0 || m._hackTelegraph > 0 ||
              m._suppressTelegraph > 0 || m._rocketDashing || m._rocketTelegraph > 0 ||
              m._empDomeTelegraph > 0 || m._pulseTelegraph > 0 || m._repulsorTelegraph > 0 ||
              // Floor 5
              m._bleedDash || m._bleedTelegraph > 0 || m._goreDash || m._goreTelegraph > 0 ||
              m._pounceTelegraph > 0 || m._screechTelegraph > 0 || m._slimeTelegraph > 0 ||
              m._glowTelegraph > 0 || m._lashTelegraph > 0 || m._barrierTelegraph > 0 ||
              m._orbTelegraph > 0 || m._overchargeTelegraph > 0 ||
              m._oozeTelegraph > 0 || m._rampartTelegraph > 0 || m._meltTelegraph > 0 ||
              m._shadowTeleport > 0 || m._puppetTelegraph > 0 || m._abyssTelegraph > 0;
            if (isMultiFrame) m._activeAbility = abilKey;
            if (specResult && specResult.skip) skipMovement = true;
            break;
          }
        }
      }
      if (skipMovement) continue;
    }

    } // end if (!m._testDummy) movement block

    // Contact damage to player
    if (m.attackCooldown > 0) { m.attackCooldown--; continue; }
    const hitDx = player.x - m.x;
    const hitDy = (player.y - 20) - (m.y - 20);
    const hitDist = Math.sqrt(hitDx * hitDx + hitDy * hitDy);

    if (hitDist < m.contactRange && contactCooldown <= 0) {
      try {
      // Dodge check (boots)
      const dodgeCh = getDodgeChance();
      if (dodgeCh > 0 && Math.random() < dodgeCh) {
        contactCooldown = 30;
        m.attackCooldown = 60;
        // Shadow step — next melee is guaranteed crit (T3+ boots)
        if (playerEquip.boots && (playerEquip.boots.special === 'shadowstep' || playerEquip.boots.special === 'phase')) {
          shadowStepActive = true;
        }
        // Phase — pass through mobs briefly (T4 boots)
        if (playerEquip.boots && playerEquip.boots.special === 'phase') {
          phaseTimer = 45;
        }
      } else {
          // Normal damage
          const dmgTaken = dealDamageToPlayer(m.damage, "contact", m);
          contactCooldown = 30;
          m.attackCooldown = 60;
          if (m.type === "skeleton") m.boneSwing = 20;
          hitEffects.push({ x: player.x, y: player.y - 20, life: 25, type: "hit", dmg: dmgTaken });
      }
      } catch(e) { console.error("ARMOR DODGE ERROR:", e); }
    }
  }

  // === BODY BLOCKING: solid collision between all entities ===
  const MOB_RADIUS = 36;
  const MOB_MIN_DIST = MOB_RADIUS * 2;
  const PLAYER_RADIUS = 36;
  const hw2 = POS_HW;

  // Helper: clamp entity out of walls after being pushed
  function clampOutOfWalls(entity) {
    if (positionClear(entity.x, entity.y)) return;
    // Try small nudges first (smooth) before larger teleports
    for (let dist = 2; dist <= TILE * 2; dist += 2) {
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;
        const nx = entity.x + Math.cos(ang) * dist;
        const ny = entity.y + Math.sin(ang) * dist;
        if (positionClear(nx, ny)) { entity.x = nx; entity.y = ny; return; }
      }
    }
    // Last resort: nearest open tile center
    const tx = Math.floor(entity.x / TILE), ty = Math.floor(entity.y / TILE);
    for (let r = 1; r <= 5; r++) {
      for (let dy2 = -r; dy2 <= r; dy2++) {
        for (let dx2 = -r; dx2 <= r; dx2++) {
          if (Math.abs(dx2) !== r && Math.abs(dy2) !== r) continue;
          if (!isSolid(tx + dx2, ty + dy2)) {
            entity.x = (tx + dx2) * TILE + TILE / 2;
            entity.y = (ty + dy2) * TILE + TILE / 2;
            return;
          }
        }
      }
    }
  }

  for (let i = 0; i < mobs.length; i++) {
    if (mobs[i].hp <= 0) continue;
    // Mob-to-mob separation
    for (let j = i + 1; j < mobs.length; j++) {
      if (mobs[j].hp <= 0) continue;
      const dx = mobs[j].x - mobs[i].x;
      const dy = mobs[j].y - mobs[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOB_MIN_DIST && dist > 0.1) {
        const overlap = (MOB_MIN_DIST - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        const niX = mobs[i].x - nx * overlap;
        const niY = mobs[i].y - ny * overlap;
        const njX = mobs[j].x + nx * overlap;
        const njY = mobs[j].y + ny * overlap;
        if (positionClear(niX, niY)) { mobs[i].x = niX; mobs[i].y = niY; }
        if (positionClear(njX, njY)) { mobs[j].x = njX; mobs[j].y = njY; }
      } else if (dist <= 0.1) {
        // Exact overlap — push apart but only to clear positions
        const randAngle = Math.random() * Math.PI * 2;
        const pushDist = MOB_MIN_DIST * 0.6;
        // Try multiple angles if first fails
        for (let at = 0; at < 8; at++) {
          const a = randAngle + at * Math.PI / 4;
          const newX = mobs[j].x + Math.cos(a) * pushDist;
          const newY = mobs[j].y + Math.sin(a) * pushDist;
          if (positionClear(newX, newY)) { mobs[j].x = newX; mobs[j].y = newY; break; }
        }
      }
    }
    // Mob-to-player: push both apart but NEVER push player into walls
    if (phaseTimer > 0) continue; // phasing — skip mob-player collision
    const pdx = mobs[i].x - player.x;
    const pdy = mobs[i].y - player.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
    const PLAYER_MOB_MIN = PLAYER_RADIUS + MOB_RADIUS;
    if (pdist < PLAYER_MOB_MIN && pdist > 0.1) {
      const overlap = PLAYER_MOB_MIN - pdist;
      const nx2 = pdx / pdist;
      const ny2 = pdy / pdist;
      // Try pushing player
      const newPX = player.x - nx2 * overlap * 0.3;
      const newPY = player.y - ny2 * overlap * 0.3;
      // Push mob more (70% mob, 30% player)
      const newMX = mobs[i].x + nx2 * overlap * 0.7;
      const newMY = mobs[i].y + ny2 * overlap * 0.7;
      if (positionClear(newPX, newPY)) {
        player.x = newPX;
        player.y = newPY;
      }
      if (positionClear(newMX, newMY)) {
        mobs[i].x = newMX;
        mobs[i].y = newMY;
      } else {
        // Wall behind mob — try pushing along wall instead
        // Try perpendicular directions to slide along the wall
        const perpX = mobs[i].x + ny2 * overlap;
        const perpY = mobs[i].y - nx2 * overlap;
        if (positionClear(perpX, perpY)) {
          mobs[i].x = perpX; mobs[i].y = perpY;
        } else {
          const perpX2 = mobs[i].x - ny2 * overlap;
          const perpY2 = mobs[i].y + nx2 * overlap;
          if (positionClear(perpX2, perpY2)) {
            mobs[i].x = perpX2; mobs[i].y = perpY2;
          }
        }
      }
    }
  }

  // Unstick any mobs that ended up in walls
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    if (!positionClear(m.x, m.y)) clampOutOfWalls(m);
  }

  // Safety: if player somehow ended up inside a wall, push them out
  if (!positionClear(player.x, player.y)) {
    for (let r = 1; r <= 5; r++) {
      for (const [ndx, ndy] of [[r*TILE,0],[-r*TILE,0],[0,r*TILE],[0,-r*TILE],[r*TILE,r*TILE],[-r*TILE,-r*TILE]]) {
        if (positionClear(player.x + ndx, player.y + ndy)) {
          player.x += ndx; player.y += ndy;
          r = 99; break;
        }
      }
    }
  }

  // Remove dead mobs — spawn death effects first, track deaths for phase system
  const deadPhases = [];
  for (const m of mobs) {
    if (m.hp <= 0 && !m._deathProcessed) {
      m._deathProcessed = true;
      spawnDeathEffect(m);
      deadPhases.push(m.phase || 1);
    }
  }
  // Clean up entity sub-arrays on dead mobs before filtering (prevents orphaned references)
  for (const m of mobs) {
    if (m.hp <= 0) {
      for (const key of MOB_ENTITY_ARRAYS) {
        if (m[key]) { if (Array.isArray(m[key])) m[key].length = 0; m[key] = null; }
      }
    }
  }
  mobs = mobs.filter(m => m.hp > 0);
  // Check phase advancement for each death
  for (const dp of deadPhases) {
    checkPhaseAdvance(dp);
  }

  // Remove bullets/arrows from dead mobs
  const aliveMobIds = new Set(mobs.map(m => m.id));
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (b.mobBullet && b.ownerId !== undefined && !aliveMobIds.has(b.ownerId)) {
      bullets.splice(bi, 1);
    }
  }

  // Check wave cleared
  // Wave system — dungeon only
  if (Scene.inDungeon) {
  if (waveState === "active" && mobs.length === 0) {
    waveState = "cleared";
    waveTimer = window._opMode ? 36000 : 1800; // 10 min in OP, 30s normal
    // Clear ALL lingering effects — clean slate for safe phase
    StatusFX.clearPoison();
    bullets.length = 0;
    hitEffects.length = 0;
    deathEffects.length = 0;
    mobParticles.length = 0;
    // Full heal on wave clear
    const healAmt = player.maxHp - player.hp;
    if (healAmt > 0) {
      player.hp = player.maxHp;
      hitEffects.push({ x: player.x, y: player.y - 30, life: 20, type: "heal", dmg: "FULL HEAL" });
    }
    // +2 potions on wave clear
    potion.count += 2;
    hitEffects.push({ x: player.x, y: player.y - 50, life: 25, maxLife: 25, type: "heal", dmg: "+2 Potions" });
    // Check if floor is complete
    if (wave >= WAVES_PER_FLOOR && !stairsOpen) {
      if (dungeonFloor < getDungeonMaxFloors()) {
        stairsOpen = true;
        hitEffects.push({ x: player.x, y: player.y - 70, life: 40, maxLife: 40, type: "heal", dmg: "STAIRCASE OPENED!" });
      } else {
        // Dungeon complete! Open exit staircase
        stairsOpen = true;
        dungeonComplete = true;
        victoryTimer = 0;
        hitEffects.push({ x: player.x, y: player.y - 70, life: 80, maxLife: 80, type: "heal", dmg: "\u{1F3C6} DUNGEON COMPLETE!" });
      }
    }
    Events.emit('wave_cleared', { wave, floor: dungeonFloor, stairsOpen, dungeonComplete });
  }
  if (waveState === "cleared") {
    waveTimer--;
    // Chest armor regen during cleared phase (1 HP/s = every 60 frames)
    const regenRate = getChestRegen();
    if (regenRate > 0 && waveTimer % 60 === 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + regenRate);
    }
    // Only spawn next wave if floor not complete
    if (waveTimer <= 0 && !stairsOpen) { spawnWave(); }
    // Increment victory celebration timer
    if (dungeonComplete) victoryTimer++;
  }
  if (waveState === "waiting") {
    waveTimer++;
    if (waveTimer > (window._opMode ? 36000 : 1800)) { spawnWave(); } // 30 seconds before first wave
  }
  } // end dungeon wave check
}
