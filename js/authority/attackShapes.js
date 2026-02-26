// ===================== ATTACK SHAPE HELPERS =====================
// Reusable geometry functions for mob specials.
// Return arrays of hit entities (player/mobs), NOT rendered visuals.
// Visuals are handled by TelegraphSystem and HIT_EFFECT_RENDERERS.

const AttackShapes = {

  // ---- Circle AoE ----
  // Returns true if the player is inside a circle centered at (cx, cy)
  hitsPlayer(cx, cy, radius) {
    const dx = player.x - cx;
    const dy = player.y - cy;
    return dx * dx + dy * dy <= radius * radius;
  },

  // Returns mobs inside a circle (excludes the caster)
  mobsInCircle(cx, cy, radius, excludeId) {
    const r2 = radius * radius;
    const result = [];
    for (const m of mobs) {
      if (m.hp <= 0 || m.id === excludeId) continue;
      const dx = m.x - cx, dy = m.y - cy;
      if (dx * dx + dy * dy <= r2) result.push(m);
    }
    return result;
  },

  // ---- Line / Beam ----
  // Returns true if player is within a line (beam) from (x1,y1) to (x2,y2) with given width
  playerInLine(x1, y1, x2, y2, width) {
    return this._pointInLine(player.x, player.y, x1, y1, x2, y2, width);
  },

  // Returns mobs hit by a line
  mobsInLine(x1, y1, x2, y2, width, excludeId) {
    const result = [];
    for (const m of mobs) {
      if (m.hp <= 0 || m.id === excludeId) continue;
      if (this._pointInLine(m.x, m.y, x1, y1, x2, y2, width)) result.push(m);
    }
    return result;
  },

  _pointInLine(px, py, x1, y1, x2, y2, width) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;
    // Project point onto line segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * dx, closestY = y1 + t * dy;
    const distX = px - closestX, distY = py - closestY;
    const halfW = width / 2;
    return distX * distX + distY * distY <= halfW * halfW;
  },

  // ---- Cone ----
  // Returns true if player is in a cone from (cx,cy) facing direction (radians) with angle spread and range
  playerInCone(cx, cy, direction, halfAngleRad, range) {
    return this._pointInCone(player.x, player.y, cx, cy, direction, halfAngleRad, range);
  },

  mobsInCone(cx, cy, direction, halfAngleRad, range, excludeId) {
    const result = [];
    for (const m of mobs) {
      if (m.hp <= 0 || m.id === excludeId) continue;
      if (this._pointInCone(m.x, m.y, cx, cy, direction, halfAngleRad, range)) result.push(m);
    }
    return result;
  },

  _pointInCone(px, py, cx, cy, direction, halfAngleRad, range) {
    const dx = px - cx, dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > range || dist === 0) return false;
    const angle = Math.atan2(dy, dx);
    let diff = angle - direction;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= halfAngleRad;
  },

  // ---- Ring (donut) ----
  playerInRing(cx, cy, innerRadius, outerRadius) {
    const dx = player.x - cx, dy = player.y - cy;
    const d2 = dx * dx + dy * dy;
    return d2 >= innerRadius * innerRadius && d2 <= outerRadius * outerRadius;
  },

  // ---- Tile Area ----
  // Returns array of {tx, ty} tile coordinates within radius of center tile
  tileArea(centerTX, centerTY, radiusTiles) {
    const tiles = [];
    for (let dy = -radiusTiles; dy <= radiusTiles; dy++) {
      for (let dx = -radiusTiles; dx <= radiusTiles; dx++) {
        if (dx * dx + dy * dy <= radiusTiles * radiusTiles) {
          tiles.push({ tx: centerTX + dx, ty: centerTY + dy });
        }
      }
    }
    return tiles;
  },

  // ---- Player tile check ----
  // Returns true if player is standing on one of the given tiles
  playerOnTiles(tiles) {
    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);
    for (const t of tiles) {
      if (t.tx === ptx && t.ty === pty) return true;
    }
    return false;
  },

  // ---- Direction helpers ----
  // Get direction (radians) from mob to player
  dirToPlayer(mob) {
    return Math.atan2(player.y - mob.y, player.x - mob.x);
  },

  // Get distance from mob to player
  distToPlayer(mob) {
    const dx = player.x - mob.x, dy = player.y - mob.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  // Get endpoint of a line from (x,y) in direction for given length
  endpoint(x, y, direction, length) {
    return {
      x: x + Math.cos(direction) * length,
      y: y + Math.sin(direction) * length,
    };
  },
};
