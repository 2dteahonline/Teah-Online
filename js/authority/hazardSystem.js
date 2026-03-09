// ===================== HAZARD SYSTEM =====================
// Zone-based effects (poison clouds, sticky bombs, etc.) created by mob abilities.
// Floor hazards have been removed — only createZone remains.

const HazardSystem = {
  active: [],    // unused (kept for API compat with clear/update/draw)
  zones: [],     // persistent damage/effect zones (poison clouds, slime, etc.)
  _nextId: 1,
  types: {},     // empty — floor hazard types removed

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

  initForFloor(_floor) {
    this.clear();
    // Floor hazards removed — no-op
  },

  activateBossHazards(_bossType) {
    // Floor hazards removed — no-op
  },

  update() {
    // Update zones only (no floor hazards)
    this.updateZones();
  },

  draw(ctx, camX, camY) {
    // Draw zones only (no floor hazards)
    this.drawZones(ctx, camX, camY);
  },

  clear() {
    this.active.length = 0;
    this.zones.length = 0;
  },
};
