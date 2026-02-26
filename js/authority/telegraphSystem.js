// ===================== TELEGRAPH SYSTEM =====================
// Ground markers that warn players before attacks land.
// Used by bosses, mini-bosses, and advanced mobs.
//
// Usage:
//   TelegraphSystem.create({
//     shape: 'circle',
//     params: { cx: mob.x, cy: mob.y, radius: 96 },
//     delayFrames: 48,  // 0.8s at 60fps
//     onResolve: () => { /* deal damage, apply status */ },
//     color: [255, 80, 80],  // RGB
//     owner: mob.id
//   });

const TelegraphSystem = {
  active: [],
  _nextId: 1,

  // Create a new telegraph ground marker
  create({ shape, params, delayFrames, onResolve, color, owner }) {
    const id = this._nextId++;
    this.active.push({
      id,
      shape,       // 'circle', 'line', 'cone', 'ring', 'tiles'
      params,      // shape-specific parameters
      delay: delayFrames,
      maxDelay: delayFrames,
      onResolve: onResolve || null,
      color: color || [255, 80, 80],
      owner: owner || 0,
      resolved: false,
    });
    return id;
  },

  // Tick all active telegraphs — called from authority tick
  update() {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.delay--;
      if (t.delay <= 0 && !t.resolved) {
        t.resolved = true;
        // Resolve: call the callback
        if (t.onResolve) {
          try { t.onResolve(); } catch (e) { /* silently fail */ }
        }
        // Keep for 8 frames for the "flash" visual, then remove
        t._flashTimer = 8;
      }
      if (t.resolved) {
        t._flashTimer = (t._flashTimer || 0) - 1;
        if (t._flashTimer <= 0) {
          this.active.splice(i, 1);
        }
      }
    }
  },

  // Draw all active telegraphs — called from world-space render
  draw(ctx, camX, camY) {
    for (const t of this.active) {
      const progress = 1 - (t.delay / t.maxDelay); // 0→1 as timer fills
      const r = t.color[0], g = t.color[1], b = t.color[2];

      // Flash white when resolved
      if (t.resolved) {
        this._drawResolved(ctx, camX, camY, t);
        continue;
      }

      ctx.save();
      switch (t.shape) {
        case 'circle':
          this._drawCircle(ctx, camX, camY, t, progress, r, g, b);
          break;
        case 'line':
          this._drawLine(ctx, camX, camY, t, progress, r, g, b);
          break;
        case 'cone':
          this._drawCone(ctx, camX, camY, t, progress, r, g, b);
          break;
        case 'ring':
          this._drawRing(ctx, camX, camY, t, progress, r, g, b);
          break;
        case 'tiles':
          this._drawTiles(ctx, camX, camY, t, progress, r, g, b);
          break;
      }
      ctx.restore();
    }
  },

  // ---- Shape Renderers ----

  _drawCircle(ctx, camX, camY, t, progress, r, g, b) {
    const p = t.params;
    const sx = p.cx - camX, sy = p.cy - camY;
    const fillRadius = p.radius * progress;
    // Pulsing fill
    const pulse = 0.15 + Math.sin(progress * Math.PI * 4) * 0.05;
    ctx.fillStyle = `rgba(${r},${g},${b},${pulse})`;
    ctx.beginPath();
    ctx.arc(sx, sy, fillRadius, 0, Math.PI * 2);
    ctx.fill();
    // Outline at full radius
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 + progress * 0.4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, p.radius, 0, Math.PI * 2);
    ctx.stroke();
  },

  _drawLine(ctx, camX, camY, t, progress, r, g, b) {
    const p = t.params;
    const x1 = p.x1 - camX, y1 = p.y1 - camY;
    const x2 = p.x2 - camX, y2 = p.y2 - camY;
    const w = p.width || 20;
    // Draw line filling from start to end
    const mx = x1 + (x2 - x1) * progress;
    const my = y1 + (y2 - y1) * progress;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpX = Math.cos(angle + Math.PI / 2) * w / 2;
    const perpY = Math.sin(angle + Math.PI / 2) * w / 2;
    // Fill portion
    ctx.fillStyle = `rgba(${r},${g},${b},${0.15 + progress * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(x1 + perpX, y1 + perpY);
    ctx.lineTo(mx + perpX, my + perpY);
    ctx.lineTo(mx - perpX, my - perpY);
    ctx.lineTo(x1 - perpX, y1 - perpY);
    ctx.closePath();
    ctx.fill();
    // Full outline
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 + progress * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1 + perpX, y1 + perpY);
    ctx.lineTo(x2 + perpX, y2 + perpY);
    ctx.lineTo(x2 - perpX, y2 - perpY);
    ctx.lineTo(x1 - perpX, y1 - perpY);
    ctx.closePath();
    ctx.stroke();
  },

  _drawCone(ctx, camX, camY, t, progress, r, g, b) {
    const p = t.params;
    const sx = p.cx - camX, sy = p.cy - camY;
    const halfAngle = (p.angleDeg || 45) * Math.PI / 360; // half the cone angle in radians
    const dir = p.direction || 0; // radians
    const range = p.range || 96;
    const fillRange = range * progress;
    // Fill arc
    ctx.fillStyle = `rgba(${r},${g},${b},${0.12 + progress * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, fillRange, dir - halfAngle, dir + halfAngle);
    ctx.closePath();
    ctx.fill();
    // Outline at full range
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 + progress * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.arc(sx, sy, range, dir - halfAngle, dir + halfAngle);
    ctx.closePath();
    ctx.stroke();
  },

  _drawRing(ctx, camX, camY, t, progress, r, g, b) {
    const p = t.params;
    const sx = p.cx - camX, sy = p.cy - camY;
    const innerR = p.innerRadius || 40;
    const outerR = p.outerRadius || 100;
    const alpha = 0.12 + progress * 0.15;
    // Donut shape
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, outerR, 0, Math.PI * 2);
    ctx.arc(sx, sy, innerR, 0, Math.PI * 2, true); // counter-clockwise cutout
    ctx.fill();
    // Outlines
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.3 + progress * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sx, sy, outerR, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, innerR, 0, Math.PI * 2); ctx.stroke();
  },

  _drawTiles(ctx, camX, camY, t, progress, r, g, b) {
    const tiles = t.params.tiles || []; // [{tx, ty}]
    const alpha = 0.1 + progress * 0.25;
    const pulse = Math.sin(progress * Math.PI * 3) * 0.08;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha + pulse})`;
    for (const tile of tiles) {
      ctx.fillRect(tile.tx * TILE - camX, tile.ty * TILE - camY, TILE, TILE);
    }
    // Border
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.4 + progress * 0.3})`;
    ctx.lineWidth = 1.5;
    for (const tile of tiles) {
      ctx.strokeRect(tile.tx * TILE - camX, tile.ty * TILE - camY, TILE, TILE);
    }
  },

  _drawResolved(ctx, camX, camY, t) {
    const flash = (t._flashTimer || 0) / 8; // 1→0
    ctx.save();
    ctx.globalAlpha = flash * 0.6;
    ctx.fillStyle = '#ffffff';
    const p = t.params;
    switch (t.shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(p.cx - camX, p.cy - camY, p.radius, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'line': {
        const angle = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
        const w = (p.width || 20) / 2;
        const perpX = Math.cos(angle + Math.PI / 2) * w;
        const perpY = Math.sin(angle + Math.PI / 2) * w;
        ctx.beginPath();
        ctx.moveTo(p.x1 - camX + perpX, p.y1 - camY + perpY);
        ctx.lineTo(p.x2 - camX + perpX, p.y2 - camY + perpY);
        ctx.lineTo(p.x2 - camX - perpX, p.y2 - camY - perpY);
        ctx.lineTo(p.x1 - camX - perpX, p.y1 - camY - perpY);
        ctx.fill();
        break;
      }
      case 'cone':
        ctx.beginPath();
        ctx.moveTo(p.cx - camX, p.cy - camY);
        ctx.arc(p.cx - camX, p.cy - camY, p.range || 96,
          (p.direction || 0) - (p.angleDeg || 45) * Math.PI / 360,
          (p.direction || 0) + (p.angleDeg || 45) * Math.PI / 360);
        ctx.fill();
        break;
      case 'tiles':
        for (const tile of (p.tiles || [])) {
          ctx.fillRect(tile.tx * TILE - camX, tile.ty * TILE - camY, TILE, TILE);
        }
        break;
    }
    ctx.restore();
  },

  // Remove all telegraphs (on wave clear, floor change, etc.)
  clear() {
    this.active.length = 0;
  },

  // Remove all telegraphs belonging to a specific mob
  clearOwner(ownerId) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].owner === ownerId) this.active.splice(i, 1);
    }
  },
};
