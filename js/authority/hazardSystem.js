// ===================== HAZARD SYSTEM =====================
// Environmental room gimmicks that tick independently of mobs.
// Each floor registers its own hazards via FLOOR_CONFIG.

const HazardSystem = {
  active: [],    // active hazard instances
  zones: [],     // persistent damage/effect zones (poison clouds, slime, etc.)
  _nextId: 1,

  // ---- HAZARD TYPE REGISTRY ----
  // Each type defines: init(), update(h), draw(h, ctx, camX, camY)
  types: {

    // Floor 1: Neon wall zap — wall edges randomly spark
    neon_zap: {
      init(h) {
        h.timer = 480 + Math.floor(Math.random() * 120); // 8-10s
        h.zapActive = false;
        h.zapTimer = 0;
        h.zapX1 = 0; h.zapY1 = 0; h.zapX2 = 0; h.zapY2 = 0;
        h.zapDamage = 8;
      },
      update(h) {
        if (h.zapActive) {
          h.zapTimer--;
          // Check player hit
          if (AttackShapes.playerInLine(h.zapX1, h.zapY1, h.zapX2, h.zapY2, 24)) {
            if (h.zapTimer === 10) { // hit once during zap
              dealDamageToPlayer(Math.round(h.zapDamage * getMobDamageMultiplier()), 'hazard', null);
              hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: 'burn_hit' });
            }
          }
          if (h.zapTimer <= 0) {
            h.zapActive = false;
            h.timer = 480 + Math.floor(Math.random() * 120);
          }
          return;
        }
        h.timer--;
        if (h.timer <= 0) {
          // Pick a random wall edge to zap
          h.zapActive = true;
          h.zapTimer = 20; // zap lasts 20 frames
          const side = Math.floor(Math.random() * 4); // 0=top, 1=bottom, 2=left, 3=right
          const mapW = MAP_W, mapH = MAP_H;
          const margin = TILE * 2;
          const len = TILE * 3; // 3-tile zap length
          if (side === 0) { // top wall
            const startX = margin + Math.random() * (mapW - margin * 2 - len);
            h.zapX1 = startX; h.zapY1 = margin;
            h.zapX2 = startX + len; h.zapY2 = margin;
          } else if (side === 1) { // bottom wall
            const startX = margin + Math.random() * (mapW - margin * 2 - len);
            h.zapX1 = startX; h.zapY1 = mapH - margin;
            h.zapX2 = startX + len; h.zapY2 = mapH - margin;
          } else if (side === 2) { // left wall
            const startY = margin + Math.random() * (mapH - margin * 2 - len);
            h.zapX1 = margin; h.zapY1 = startY;
            h.zapX2 = margin; h.zapY2 = startY + len;
          } else { // right wall
            const startY = margin + Math.random() * (mapH - margin * 2 - len);
            h.zapX1 = mapW - margin; h.zapY1 = startY;
            h.zapX2 = mapW - margin; h.zapY2 = startY + len;
          }
        }
      },
      draw(h, ctx, camX, camY) {
        if (!h.zapActive) return;
        const alpha = h.zapTimer / 20;
        // Draw electric zap line with jitter
        ctx.save();
        ctx.strokeStyle = `rgba(0,200,255,${0.6 * alpha})`;
        ctx.lineWidth = 4;
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 12;
        const segments = 6;
        ctx.beginPath();
        ctx.moveTo(h.zapX1 - camX, h.zapY1 - camY);
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const mx = h.zapX1 + (h.zapX2 - h.zapX1) * t + (Math.random() - 0.5) * 16;
          const my = h.zapY1 + (h.zapY2 - h.zapY1) * t + (Math.random() - 0.5) * 16;
          ctx.lineTo(mx - camX, my - camY);
        }
        ctx.lineTo(h.zapX2 - camX, h.zapY2 - camY);
        ctx.stroke();
        // Inner bright line
        ctx.strokeStyle = `rgba(200,240,255,${0.8 * alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h.zapX1 - camX, h.zapY1 - camY);
        for (let i = 1; i < segments; i++) {
          const t = i / segments;
          const mx = h.zapX1 + (h.zapX2 - h.zapX1) * t + (Math.random() - 0.5) * 8;
          const my = h.zapY1 + (h.zapY2 - h.zapY1) * t + (Math.random() - 0.5) * 8;
          ctx.lineTo(mx - camX, my - camY);
        }
        ctx.lineTo(h.zapX2 - camX, h.zapY2 - camY);
        ctx.stroke();
        ctx.restore();
      },
    },

    // Floor 1 Boss: Traffic lane — moving hazard strip crosses arena
    traffic_lane: {
      init(h) {
        h.timer = 600 + Math.floor(Math.random() * 120); // 10-12s
        h.laneActive = false;
        h.laneY = 0;      // current Y position of the lane
        h.laneSpeed = 4;   // pixels per frame
        h.laneWidth = TILE * 2; // 2-tile thick lane
        h.laneDamage = 12;
        h.laneDir = 1;     // 1 = moving right, -1 = moving left
        h.laneX = 0;       // current X (for horizontal movement)
        h.warned = false;
      },
      update(h) {
        if (h.laneActive) {
          h.laneX += h.laneSpeed * h.laneDir;
          // Check player hit — lane is a horizontal strip
          const py = player.y;
          if (py >= h.laneY - h.laneWidth / 2 && py <= h.laneY + h.laneWidth / 2) {
            const px = player.x;
            const laneLeft = h.laneDir > 0 ? h.laneX - TILE * 3 : h.laneX;
            const laneRight = h.laneDir > 0 ? h.laneX : h.laneX + TILE * 3;
            if (px >= Math.min(laneLeft, laneRight) && px <= Math.max(laneLeft, laneRight)) {
              if (!h._hitThisPass) {
                h._hitThisPass = true;
                dealDamageToPlayer(Math.round(h.laneDamage * getMobDamageMultiplier()), 'hazard', null);
                // Push player in lane direction
                player.x += h.laneDir * 60;
                hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: 'shockwave' });
              }
            }
          }
          // Lane has crossed the map — deactivate
          if ((h.laneDir > 0 && h.laneX > MAP_W + TILE * 4) ||
              (h.laneDir < 0 && h.laneX < -TILE * 4)) {
            h.laneActive = false;
            h._hitThisPass = false;
            h.warned = false;
            h.timer = 600 + Math.floor(Math.random() * 120);
          }
          return;
        }
        h.timer--;
        // Warning phase: flash lane position 60 frames before
        if (h.timer <= 60 && !h.warned) {
          h.warned = true;
          h.laneY = TILE * 8 + Math.random() * (MAP_H - TILE * 16); // random Y in arena
          h.laneDir = Math.random() < 0.5 ? 1 : -1;
          h.laneX = h.laneDir > 0 ? -TILE * 2 : MAP_W + TILE * 2;
        }
        if (h.timer <= 0) {
          h.laneActive = true;
        }
      },
      draw(h, ctx, camX, camY) {
        // Warning indicator
        if (h.warned && !h.laneActive) {
          const alpha = 0.15 + Math.sin(Date.now() / 80) * 0.1;
          ctx.fillStyle = `rgba(255,200,0,${alpha})`;
          ctx.fillRect(0 - camX, h.laneY - h.laneWidth / 2 - camY, MAP_W, h.laneWidth);
          // Arrow indicators
          ctx.fillStyle = `rgba(255,200,0,${alpha + 0.15})`;
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          const arrowChar = h.laneDir > 0 ? '>>>' : '<<<';
          ctx.fillText(arrowChar, MAP_W / 2 - camX, h.laneY - camY + 6);
        }
        if (!h.laneActive) return;
        // Draw the moving lane strip
        const alpha = 0.4;
        ctx.fillStyle = `rgba(255,180,0,${alpha})`;
        const drawX = h.laneDir > 0 ? h.laneX - TILE * 6 : h.laneX;
        ctx.fillRect(drawX - camX, h.laneY - h.laneWidth / 2 - camY, TILE * 6, h.laneWidth);
        // Glowing edge
        ctx.strokeStyle = `rgba(255,220,100,0.7)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - camX, h.laneY - h.laneWidth / 2 - camY, TILE * 6, h.laneWidth);
      },
    },

    // Floor 2: Corner Conduit — 4 corner areas zap in sequence
    corner_conduit: {
      init(h) {
        h.cornerIdx = 0; // which corner is active (0-3)
        h.zapTimer = 0;
        h.zapActive = false;
        h.cyclePause = 120; // pause between corners
        h.pauseTimer = h.cyclePause;
        h.zapDuration = 60; // 1s zap per corner
        h.zapDamage = 10;
        h.zapRadius = TILE * 3;
      },
      update(h) {
        const mapW = MAP_W, mapH = MAP_H;
        const margin = TILE * 3;
        // Corner positions
        const corners = [
          { x: margin, y: margin },
          { x: mapW - margin, y: margin },
          { x: mapW - margin, y: mapH - margin },
          { x: margin, y: mapH - margin },
        ];
        if (h.zapActive) {
          h.zapTimer--;
          // Check player in corner zone
          const c = corners[h.cornerIdx];
          if (c) {
            const dx = player.x - c.x, dy = player.y - c.y;
            if (dx * dx + dy * dy <= h.zapRadius * h.zapRadius) {
              if (h.zapTimer === Math.floor(h.zapDuration / 2)) { // one hit per zap
                dealDamageToPlayer(Math.round(h.zapDamage * getMobDamageMultiplier()), 'hazard', null);
                hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: 'burn_hit' });
                StatusFX.applyToPlayer('stun', { duration: 18 }); // brief stun
              }
            }
          }
          if (h.zapTimer <= 0) {
            h.zapActive = false;
            h.cornerIdx = (h.cornerIdx + 1) % 4;
            h.pauseTimer = h.cyclePause;
          }
        } else {
          h.pauseTimer--;
          if (h.pauseTimer <= 0) {
            h.zapActive = true;
            h.zapTimer = h.zapDuration;
          }
        }
      },
      draw(h, ctx, camX, camY) {
        const mapW = MAP_W, mapH = MAP_H;
        const margin = TILE * 3;
        const corners = [
          { x: margin, y: margin },
          { x: mapW - margin, y: margin },
          { x: mapW - margin, y: mapH - margin },
          { x: margin, y: mapH - margin },
        ];
        // Draw all corner zones lightly
        for (let i = 0; i < 4; i++) {
          const c = corners[i];
          const isActive = h.zapActive && h.cornerIdx === i;
          const alpha = isActive ? 0.25 + Math.sin(Date.now() / 60) * 0.1 : 0.05;
          const color = isActive ? '0,220,255' : '0,100,120';
          ctx.fillStyle = `rgba(${color},${alpha})`;
          ctx.beginPath();
          ctx.arc(c.x - camX, c.y - camY, h.zapRadius, 0, Math.PI * 2);
          ctx.fill();
          if (isActive) {
            // Electric arcs
            ctx.strokeStyle = `rgba(0,220,255,${0.5 + Math.random() * 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let s = 0; s < 4; s++) {
              const a = Math.random() * Math.PI * 2;
              const r1 = Math.random() * h.zapRadius * 0.5;
              const r2 = Math.random() * h.zapRadius;
              ctx.moveTo(c.x + Math.cos(a) * r1 - camX, c.y + Math.sin(a) * r1 - camY);
              ctx.lineTo(c.x + Math.cos(a) * r2 - camX, c.y + Math.sin(a) * r2 - camY);
            }
            ctx.stroke();
          }
        }
        // Warning for next corner
        if (!h.zapActive && h.pauseTimer <= 60) {
          const c = corners[h.cornerIdx];
          const flash = 0.08 + Math.sin(Date.now() / 100) * 0.06;
          ctx.strokeStyle = `rgba(255,200,0,${flash})`;
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.arc(c.x - camX, c.y - camY, h.zapRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      },
    },

    // Floor 2: Security Door — temporary walls appear periodically
    security_door: {
      init(h) {
        h.timer = 720; // 12s cycle
        h.doorsActive = false;
        h.doorTimer = 0;
        h.doorDuration = 180; // 3s active
        h.doors = []; // {x1, y1, x2, y2} wall segments
      },
      update(h) {
        if (h.doorsActive) {
          h.doorTimer--;
          // Push player out if overlapping a door
          for (const door of h.doors) {
            const px = player.x, py = player.y;
            // Door is a 2-tile wide strip
            if (px >= door.x1 - 16 && px <= door.x2 + 16 &&
                py >= door.y1 - 16 && py <= door.y2 + 16) {
              // Push player to nearest side
              const pushL = px - door.x1, pushR = door.x2 - px;
              const pushT = py - door.y1, pushB = door.y2 - py;
              const minPush = Math.min(pushL + 16, pushR + 16, pushT + 16, pushB + 16);
              if (minPush === pushL + 16) player.x = door.x1 - 20;
              else if (minPush === pushR + 16) player.x = door.x2 + 20;
              else if (minPush === pushT + 16) player.y = door.y1 - 20;
              else player.y = door.y2 + 20;
            }
          }
          if (h.doorTimer <= 0) {
            h.doorsActive = false;
            h.doors = [];
            h.timer = 720;
          }
        } else {
          h.timer--;
          if (h.timer <= 0) {
            h.doorsActive = true;
            h.doorTimer = h.doorDuration;
            // Create 2 horizontal door segments at random Y
            const mapW = MAP_W, mapH = MAP_H;
            for (let d = 0; d < 2; d++) {
              const doorY = TILE * 6 + Math.random() * (mapH - TILE * 12);
              const doorX = TILE * 4 + Math.random() * (mapW - TILE * 12);
              const doorLen = TILE * 4;
              h.doors.push({ x1: doorX, y1: doorY, x2: doorX + doorLen, y2: doorY + TILE });
            }
          }
        }
      },
      draw(h, ctx, camX, camY) {
        // Warning phase
        if (!h.doorsActive && h.timer <= 90) {
          for (const door of h.doors) {
            // Nothing to show yet
          }
          return;
        }
        if (!h.doorsActive) return;
        for (const door of h.doors) {
          const alpha = Math.min(0.7, h.doorTimer / 60);
          // Metal door fill
          ctx.fillStyle = `rgba(80,90,100,${alpha})`;
          ctx.fillRect(door.x1 - camX, door.y1 - camY, door.x2 - door.x1, door.y2 - door.y1);
          // Edge glow
          ctx.strokeStyle = `rgba(200,100,0,${alpha})`;
          ctx.lineWidth = 2;
          ctx.strokeRect(door.x1 - camX, door.y1 - camY, door.x2 - door.x1, door.y2 - door.y1);
          // Warning stripes
          ctx.fillStyle = `rgba(255,200,0,${alpha * 0.3})`;
          const stripeW = 12;
          for (let sx = door.x1; sx < door.x2; sx += stripeW * 2) {
            ctx.fillRect(sx - camX, door.y1 - camY, stripeW, door.y2 - door.y1);
          }
        }
      },
    },

    // Floor 2 Boss: Conveyor Belt — pushes player sideways
    conveyor_belt: {
      init(h) {
        h.beltY = 0;
        h.beltWidth = TILE * 3;
        h.beltSpeed = 2.5; // push speed
        h.beltDir = 1;
        h.switchTimer = 600; // 10s before switching direction
        h.active = true;
      },
      update(h) {
        if (!h.active) return;
        h.switchTimer--;
        if (h.switchTimer <= 0) {
          h.beltDir *= -1;
          h.switchTimer = 600;
          // Reposition belt
          h.beltY = TILE * 6 + Math.random() * (MAP_H - TILE * 12);
        }
        if (h.beltY === 0) {
          h.beltY = MAP_H / 2; // center initially
        }
        // Push player if on belt
        const py = player.y;
        if (py >= h.beltY - h.beltWidth / 2 && py <= h.beltY + h.beltWidth / 2) {
          player.x += h.beltSpeed * h.beltDir;
          // Clamp to map
          player.x = Math.max(TILE * 2, Math.min(MAP_W - TILE * 2, player.x));
        }
      },
      draw(h, ctx, camX, camY) {
        if (!h.active || h.beltY === 0) return;
        const alpha = 0.15;
        ctx.fillStyle = `rgba(100,100,120,${alpha})`;
        ctx.fillRect(0 - camX, h.beltY - h.beltWidth / 2 - camY, MAP_W, h.beltWidth);
        // Arrows showing direction
        ctx.fillStyle = `rgba(150,150,170,0.25)`;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        const arrow = h.beltDir > 0 ? '>>>' : '<<<';
        for (let ax = TILE * 3; ax < MAP_W - TILE * 3; ax += TILE * 4) {
          ctx.fillText(arrow, ax - camX, h.beltY - camY + 5);
        }
        // Edge lines
        ctx.strokeStyle = `rgba(150,150,180,0.3)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0 - camX, h.beltY - h.beltWidth / 2 - camY);
        ctx.lineTo(MAP_W - camX, h.beltY - h.beltWidth / 2 - camY);
        ctx.moveTo(0 - camX, h.beltY + h.beltWidth / 2 - camY);
        ctx.lineTo(MAP_W - camX, h.beltY + h.beltWidth / 2 - camY);
        ctx.stroke();
      },
    },

    // Floor 3: Magnet Crane — sweeps a lane, pulls player + slow
    magnet_crane: {
      init(h) {
        h.timer = 480 + Math.floor(Math.random() * 120); // 8-10s
        h.sweepActive = false;
        h.sweepTimer = 0;
        h.sweepY = 0;
        h.sweepX = 0;
        h.sweepDir = 1; // 1=right, -1=left
        h.sweepSpeed = 3;
        h.sweepWidth = TILE * 2;
        h.warned = false;
      },
      update(h) {
        if (h.sweepActive) {
          h.sweepX += h.sweepSpeed * h.sweepDir;
          // Check player in sweep zone
          const py = player.y;
          if (py >= h.sweepY - h.sweepWidth / 2 && py <= h.sweepY + h.sweepWidth / 2) {
            const sweepLeft = h.sweepX - TILE * 2;
            const sweepRight = h.sweepX + TILE * 2;
            if (player.x >= sweepLeft && player.x <= sweepRight) {
              if (!h._hitThisSweep) {
                h._hitThisSweep = true;
                // Pull player 2 tiles in sweep direction + slow
                player.x += h.sweepDir * (TILE * 2);
                player.x = Math.max(TILE * 2, Math.min(MAP_W - TILE * 2, player.x));
                StatusFX.applyToPlayer('slow', { duration: 90, slow: 0.3 });
                dealDamageToPlayer(Math.round(6 * getMobDamageMultiplier()), 'hazard', null);
                hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: 'shockwave' });
              }
            }
          }
          // Sweep crossed the map
          if ((h.sweepDir > 0 && h.sweepX > MAP_W + TILE * 3) ||
              (h.sweepDir < 0 && h.sweepX < -TILE * 3)) {
            h.sweepActive = false;
            h._hitThisSweep = false;
            h.warned = false;
            h.timer = 480 + Math.floor(Math.random() * 120);
          }
          return;
        }
        h.timer--;
        if (h.timer <= 60 && !h.warned) {
          h.warned = true;
          h.sweepY = TILE * 6 + Math.random() * (MAP_H - TILE * 12);
          h.sweepDir = Math.random() < 0.5 ? 1 : -1;
          h.sweepX = h.sweepDir > 0 ? -TILE * 2 : MAP_W + TILE * 2;
        }
        if (h.timer <= 0) {
          h.sweepActive = true;
        }
      },
      draw(h, ctx, camX, camY) {
        // Warning indicator
        if (h.warned && !h.sweepActive) {
          const alpha = 0.12 + Math.sin(Date.now() / 80) * 0.08;
          ctx.fillStyle = `rgba(200,150,50,${alpha})`;
          ctx.fillRect(0 - camX, h.sweepY - h.sweepWidth / 2 - camY, MAP_W, h.sweepWidth);
          ctx.fillStyle = `rgba(200,150,50,${alpha + 0.1})`;
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          const arrow = h.sweepDir > 0 ? 'CRANE >>>' : '<<< CRANE';
          ctx.fillText(arrow, MAP_W / 2 - camX, h.sweepY - camY + 5);
        }
        if (!h.sweepActive) return;
        // Draw magnet crane
        const alpha = 0.4;
        ctx.fillStyle = `rgba(180,140,60,${alpha})`;
        const drawX = h.sweepX - TILE * 2;
        ctx.fillRect(drawX - camX, h.sweepY - h.sweepWidth / 2 - camY, TILE * 4, h.sweepWidth);
        // Magnet icon
        ctx.fillStyle = `rgba(220,80,80,0.6)`;
        ctx.beginPath();
        ctx.arc(h.sweepX - camX, h.sweepY - camY, 12, 0, Math.PI * 2);
        ctx.fill();
        // Edge glow
        ctx.strokeStyle = `rgba(220,180,80,0.5)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX - camX, h.sweepY - h.sweepWidth / 2 - camY, TILE * 4, h.sweepWidth);
      },
    },

    // Floor 3 Boss: Mud Suction — sticky tiles appear if player stands still
    mud_suction: {
      init(h) {
        h.lastPlayerX = 0;
        h.lastPlayerY = 0;
        h.stillTimer = 0;
        h.stickyTiles = []; // {x, y, life}
        h.checkRate = 10; // check every 10 frames
        h.checkCounter = 0;
      },
      update(h) {
        h.checkCounter++;
        if (h.checkCounter < h.checkRate) {
          // Still tick sticky tiles
          for (let i = h.stickyTiles.length - 1; i >= 0; i--) {
            const tile = h.stickyTiles[i];
            tile.life--;
            if (tile.life <= 0) {
              h.stickyTiles.splice(i, 1);
              continue;
            }
            // Slow + pull player if standing on sticky tile
            const tdx = player.x - tile.x, tdy = player.y - tile.y;
            if (tdx * tdx + tdy * tdy <= (TILE * 1.5) * (TILE * 1.5)) {
              StatusFX.applyToPlayer('slow', { duration: 30, slow: 0.4 });
            }
          }
          return;
        }
        h.checkCounter = 0;
        // Check if player is standing still
        const movedDist = Math.abs(player.x - h.lastPlayerX) + Math.abs(player.y - h.lastPlayerY);
        if (movedDist < 5) {
          h.stillTimer += h.checkRate;
        } else {
          h.stillTimer = 0;
        }
        h.lastPlayerX = player.x;
        h.lastPlayerY = player.y;
        // After 2.5s standing still, create sticky tile
        if (h.stillTimer >= 150 && h.stickyTiles.length < 6) {
          h.stickyTiles.push({ x: player.x, y: player.y, life: 300 }); // 5s
          h.stillTimer = 0;
          hitEffects.push({ x: player.x, y: player.y, life: 15, type: "mud_bubble" });
        }
        // Tick sticky tiles
        for (let i = h.stickyTiles.length - 1; i >= 0; i--) {
          const tile = h.stickyTiles[i];
          tile.life--;
          if (tile.life <= 0) { h.stickyTiles.splice(i, 1); continue; }
          const tdx = player.x - tile.x, tdy = player.y - tile.y;
          if (tdx * tdx + tdy * tdy <= (TILE * 1.5) * (TILE * 1.5)) {
            StatusFX.applyToPlayer('slow', { duration: 30, slow: 0.4 });
          }
        }
      },
      draw(h, ctx, camX, camY) {
        for (const tile of h.stickyTiles) {
          const alpha = Math.min(0.3, tile.life / 300 * 0.3);
          ctx.fillStyle = `rgba(80,60,30,${alpha})`;
          ctx.beginPath();
          ctx.arc(tile.x - camX, tile.y - camY, TILE * 1.5, 0, Math.PI * 2);
          ctx.fill();
          // Bubble effect
          ctx.strokeStyle = `rgba(100,80,40,${alpha + 0.1})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(tile.x - camX, tile.y - camY, TILE * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
      },
    },

    // Floor 4: Pressure Plate — rotating darts from random positions
    pressure_plate: {
      init(h) {
        h.timer = 360 + Math.floor(Math.random() * 120); // 6-8s
        h.dartActive = false;
        h.darts = []; // {x, y, vx, vy, life}
        h.dartDamage = 10;
      },
      update(h) {
        // Tick active darts
        for (let i = h.darts.length - 1; i >= 0; i--) {
          const dart = h.darts[i];
          dart.x += dart.vx;
          dart.y += dart.vy;
          dart.life--;
          if (dart.life <= 0) { h.darts.splice(i, 1); continue; }
          // Check player hit
          const ddx = player.x - dart.x, ddy = player.y - dart.y;
          if (ddx * ddx + ddy * ddy <= 20 * 20) {
            dealDamageToPlayer(Math.round(h.dartDamage * getMobDamageMultiplier()), 'hazard', null);
            hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: 'hit', dmg: h.dartDamage });
            h.darts.splice(i, 1);
          }
        }
        h.timer--;
        if (h.timer <= 0) {
          // Fire 3-4 darts from random wall positions
          const count = 3 + Math.floor(Math.random() * 2);
          for (let d = 0; d < count; d++) {
            const side = Math.floor(Math.random() * 4);
            let dx, dy, sx, sy;
            if (side === 0) { sx = TILE * 3 + Math.random() * (MAP_W - TILE * 6); sy = TILE * 2; dx = 0; dy = 5; }
            else if (side === 1) { sx = TILE * 3 + Math.random() * (MAP_W - TILE * 6); sy = MAP_H - TILE * 2; dx = 0; dy = -5; }
            else if (side === 2) { sx = TILE * 2; sy = TILE * 3 + Math.random() * (MAP_H - TILE * 6); dx = 5; dy = 0; }
            else { sx = MAP_W - TILE * 2; sy = TILE * 3 + Math.random() * (MAP_H - TILE * 6); dx = -5; dy = 0; }
            h.darts.push({ x: sx, y: sy, vx: dx, vy: dy, life: 180 });
          }
          h.timer = 360 + Math.floor(Math.random() * 120);
        }
      },
      draw(h, ctx, camX, camY) {
        for (const dart of h.darts) {
          const alpha = Math.min(0.8, dart.life / 30);
          ctx.fillStyle = `rgba(200,50,50,${alpha})`;
          ctx.beginPath();
          ctx.arc(dart.x - camX, dart.y - camY, 4, 0, Math.PI * 2);
          ctx.fill();
          // Trail
          ctx.strokeStyle = `rgba(200,50,50,${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(dart.x - camX, dart.y - camY);
          ctx.lineTo(dart.x - dart.vx * 3 - camX, dart.y - dart.vy * 3 - camY);
          ctx.stroke();
        }
      },
    },

    // Floor 4 Boss: Energy Pylon — edge pylons periodically zap
    energy_pylon: {
      init(h) {
        h.pylons = [
          { x: TILE * 3, y: TILE * 3, zapTimer: 240 },
          { x: MAP_W - TILE * 3, y: TILE * 3, zapTimer: 360 },
          { x: TILE * 3, y: MAP_H - TILE * 3, zapTimer: 480 },
          { x: MAP_W - TILE * 3, y: MAP_H - TILE * 3, zapTimer: 300 },
        ];
        h.zapRadius = TILE * 4;
        h.zapDamage = 12;
        h.zapDuration = 30;
      },
      update(h) {
        for (const pylon of h.pylons) {
          if (pylon.zapActive) {
            pylon.zapActiveTimer--;
            if (pylon.zapActiveTimer === Math.floor(h.zapDuration / 2)) {
              // Check player in pylon radius
              const pdx = player.x - pylon.x, pdy = player.y - pylon.y;
              if (pdx * pdx + pdy * pdy <= h.zapRadius * h.zapRadius) {
                dealDamageToPlayer(Math.round(h.zapDamage * getMobDamageMultiplier()), 'hazard', null);
                hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: 'burn_hit' });
              }
            }
            if (pylon.zapActiveTimer <= 0) {
              pylon.zapActive = false;
              pylon.zapTimer = 300 + Math.floor(Math.random() * 120);
            }
          } else {
            pylon.zapTimer--;
            if (pylon.zapTimer <= 0) {
              pylon.zapActive = true;
              pylon.zapActiveTimer = h.zapDuration;
            }
          }
        }
      },
      draw(h, ctx, camX, camY) {
        for (const pylon of h.pylons) {
          // Pylon base
          ctx.fillStyle = `rgba(60,40,80,0.6)`;
          ctx.fillRect(pylon.x - 8 - camX, pylon.y - 12 - camY, 16, 24);
          if (pylon.zapActive) {
            const alpha = 0.3 + Math.random() * 0.2;
            ctx.fillStyle = `rgba(180,80,255,${alpha})`;
            ctx.beginPath();
            ctx.arc(pylon.x - camX, pylon.y - camY, h.zapRadius, 0, Math.PI * 2);
            ctx.fill();
            // Electric arcs
            ctx.strokeStyle = `rgba(200,100,255,${0.5 + Math.random() * 0.3})`;
            ctx.lineWidth = 2;
            for (let s = 0; s < 3; s++) {
              const a = Math.random() * Math.PI * 2;
              const r = Math.random() * h.zapRadius;
              ctx.beginPath();
              ctx.moveTo(pylon.x - camX, pylon.y - camY);
              ctx.lineTo(pylon.x + Math.cos(a) * r - camX, pylon.y + Math.sin(a) * r - camY);
              ctx.stroke();
            }
          } else if (pylon.zapTimer <= 60) {
            // Warning
            const flash = 0.05 + Math.sin(Date.now() / 100) * 0.05;
            ctx.strokeStyle = `rgba(180,80,255,${flash})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(pylon.x - camX, pylon.y - camY, h.zapRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      },
    },

    // Floor 5: Radioactive Wind — pushes everyone 2 tiles every ~12s
    radioactive_wind: {
      init(h) {
        h.windTimer = 720; // 12s at 60fps
        h.windDir = 0; // 0=right, 1=down, 2=left, 3=up
        h.windActive = 0;
        h.windPushDist = TILE * 2; // 2 tiles
      },
      update(h) {
        if (h.windActive > 0) {
          h.windActive--;
          return;
        }
        h.windTimer--;
        if (h.windTimer <= 0) {
          h.windDir = Math.floor(Math.random() * 4);
          h.windActive = 30; // visual warning + push over 0.5s
          h.windTimer = 720;

          // Push player
          const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
          const d = dirs[h.windDir];
          const pushX = d[0] * h.windPushDist;
          const pushY = d[1] * h.windPushDist;
          const newX = player.x + pushX;
          const newY = player.y + pushY;
          if (typeof positionClear === 'function' && positionClear(newX, newY)) {
            player.x = newX;
            player.y = newY;
          }
          hitEffects.push({ x: player.x, y: player.y - 20, life: 20, type: "wind" });
        }
      },
      draw(h, ctx, camX, camY) {
        // Warning indicator when wind is about to blow
        if (h.windTimer <= 90) {
          const alpha = 0.1 + Math.sin(Date.now() / 150) * 0.05;
          ctx.fillStyle = `rgba(80,200,40,${alpha})`;
          const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
          const d = dirs[h.windDir];
          // Draw arrow indicator
          const cx = ctx.canvas.width / 2, cy = ctx.canvas.height / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.atan2(d[1], d[0]));
          ctx.fillRect(-30, -8, 60, 16);
          ctx.beginPath();
          ctx.moveTo(30, -16);
          ctx.lineTo(50, 0);
          ctx.lineTo(30, 16);
          ctx.fill();
          ctx.restore();
        }
        if (h.windActive > 0) {
          // Active wind visual — green streaks
          const alpha = 0.15;
          ctx.strokeStyle = `rgba(80,200,40,${alpha})`;
          ctx.lineWidth = 2;
          const dirs = [[1,0],[0,1],[-1,0],[0,-1]];
          const d = dirs[h.windDir];
          for (let i = 0; i < 8; i++) {
            const sx = Math.random() * ctx.canvas.width;
            const sy = Math.random() * ctx.canvas.height;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + d[0] * 40, sy + d[1] * 40);
            ctx.stroke();
          }
        }
      },
    },

    // Floor 5: Slime Tiles — alternating sticky/slippery every 10s
    slime_tiles: {
      init(h) {
        h.slimeTimer = 600; // 10s cycle
        h.slimeMode = 'sticky'; // 'sticky' or 'slippery'
        h.slimePatches = [];
        // Create patches around arena
        for (let i = 0; i < 6; i++) {
          h.slimePatches.push({
            x: TILE * 6 + Math.random() * TILE * 10,
            y: TILE * 6 + Math.random() * TILE * 6,
            radius: 60 + Math.random() * 40,
          });
        }
      },
      update(h) {
        h.slimeTimer--;
        if (h.slimeTimer <= 0) {
          h.slimeMode = h.slimeMode === 'sticky' ? 'slippery' : 'sticky';
          h.slimeTimer = 600;
        }

        // Check player in slime patches
        for (const p of h.slimePatches) {
          const dx = player.x - p.x, dy = player.y - p.y;
          if (dx * dx + dy * dy <= p.radius * p.radius) {
            if (h.slimeMode === 'sticky') {
              // Slow effect
              if (typeof StatusFX !== 'undefined') {
                StatusFX.applyToPlayer('slow', { duration: 30, amount: 0.4 });
              }
            }
            // Slippery mode handled by movement system (minor drift)
            break;
          }
        }
      },
      draw(h, ctx, camX, camY) {
        for (const p of h.slimePatches) {
          const sx = p.x - camX, sy = p.y - camY;
          const isSticky = h.slimeMode === 'sticky';
          const r = isSticky ? 80 : 40;
          const g = isSticky ? 200 : 220;
          const b = isSticky ? 80 : 200;
          const alpha = 0.12 + Math.sin(Date.now() / 300 + p.x) * 0.03;
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.beginPath();
          ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
          ctx.fill();
          // Edge
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha + 0.08})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      },
    },
  },

  // ---- Zone System (persistent damage areas) ----
  // Used for poison clouds, sticky bombs, etc.
  createZone({ cx, cy, radius, duration, tickRate, tickDamage, tickEffect, color, slow }) {
    const id = this._nextId++;
    this.zones.push({
      id, cx, cy, radius,
      life: duration,
      maxLife: duration,
      tickRate: tickRate || 60,
      tickCounter: 0,
      tickDamage: tickDamage || 0,
      tickEffect: tickEffect || null,
      color: color || [100, 200, 100],
      slow: slow || 0,      // speed multiplier if player is inside (0 = no slow)
    });
    return id;
  },

  updateZones() {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life--;
      if (z.life <= 0) { this.zones.splice(i, 1); continue; }

      // Check if player is inside
      const dx = player.x - z.cx, dy = player.y - z.cy;
      if (dx * dx + dy * dy <= z.radius * z.radius) {
        // Apply slow
        if (z.slow > 0) {
          // Slow is applied as a temporary speed reduction (handled externally)
        }
        // Tick damage
        z.tickCounter++;
        if (z.tickCounter >= z.tickRate) {
          z.tickCounter = 0;
          if (z.tickDamage > 0) {
            dealDamageToPlayer(z.tickDamage, 'hazard_zone', null);
            if (z.tickEffect) {
              hitEffects.push({ x: player.x, y: player.y - 20, life: 15, type: z.tickEffect });
            }
          }
        }
      }
    }
  },

  drawZones(ctx, camX, camY) {
    for (const z of this.zones) {
      const alpha = Math.min(0.25, (z.life / z.maxLife) * 0.25);
      const r = z.color[0], g = z.color[1], b = z.color[2];
      const sx = z.cx - camX, sy = z.cy - camY;
      // Pulsing cloud
      const pulse = 1 + Math.sin(z.life * 0.1) * 0.05;
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, z.radius * pulse, 0, Math.PI * 2);
      ctx.fill();
      // Edge glow
      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha + 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, z.radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  // ---- Lifecycle ----

  initForFloor(floor) {
    this.clear();
    // Skip hazards for dungeons that don't use them (e.g. cave)
    const _hzEntry = typeof DUNGEON_REGISTRY !== 'undefined' && DUNGEON_REGISTRY[currentDungeon];
    if (!_hzEntry || !_hzEntry.hasHazards) return;
    if (typeof FLOOR_CONFIG === 'undefined') return;
    const config = FLOOR_CONFIG[floor];
    if (!config || !config.hazards) return;

    for (const hazardKey of config.hazards) {
      const type = this.types[hazardKey];
      if (!type) continue;
      const h = { type: hazardKey, id: this._nextId++ };
      type.init(h);
      this.active.push(h);
    }
  },

  // Activate boss-specific hazards (e.g. traffic_lane only on boss waves)
  activateBossHazards(bossType) {
    const bossHazardMap = {
      velocity: 'traffic_lane',
      voltmaster: 'corner_conduit',
      e_mortis: 'conveyor_belt',
      mourn: 'magnet_crane',
      centipede: 'mud_suction',
      game_master: 'pressure_plate',
      junz: 'energy_pylon',
      lehvius: 'radioactive_wind',
      malric: 'slime_tiles',
    };
    const hazardKey = bossHazardMap[bossType];
    if (hazardKey) {
      const existing = this.active.find(h => h.type === hazardKey);
      if (!existing) {
        const type = this.types[hazardKey];
        if (type) {
          const h = { type: hazardKey, id: this._nextId++ };
          type.init(h);
          this.active.push(h);
        }
      }
    }
  },

  update() {
    // Update hazards
    for (const h of this.active) {
      const type = this.types[h.type];
      if (type && type.update) type.update(h);
    }
    // Update zones
    this.updateZones();
  },

  draw(ctx, camX, camY) {
    // Draw hazards
    for (const h of this.active) {
      const type = this.types[h.type];
      if (type && type.draw) type.draw(h, ctx, camX, camY);
    }
    // Draw zones
    this.drawZones(ctx, camX, camY);
  },

  clear() {
    this.active.length = 0;
    this.zones.length = 0;
  },
};
