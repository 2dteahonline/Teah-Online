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
    // For Floor 1: traffic_lane activates on Velocity boss
    if (bossType === 'velocity') {
      const existing = this.active.find(h => h.type === 'traffic_lane');
      if (!existing) {
        const type = this.types['traffic_lane'];
        if (type) {
          const h = { type: 'traffic_lane', id: this._nextId++ };
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
