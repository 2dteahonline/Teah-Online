// ===================== SECURITY CAMERA SYSTEM =====================
// Among Us-style security cameras for The Skeld.
// Player interacts with the camera console → sees 4 live feeds.
// Locked in place while viewing. X / Escape to exit.
// Wall-mounted cameras blink red when someone is watching.

const CameraState = {
  active: false,       // player is viewing cameras
  blinking: false,     // cameras should blink (someone is watching)
};

// Camera definitions — each has a center tile and viewport size (in tiles)
// Coordinates are ACTUAL grid coords (virtual + XO already applied in entity placement,
// but these are raw grid positions for rendering)
const SKELD_CAMERAS = [
  { id: 'hallway',  name: 'Hallway',       cx: 40, cy: 10, vw: 20, vh: 8  },
  { id: 'xroads',   name: 'Corridor',      cx: 20, cy: 34, vw: 16, vh: 16 },
  { id: 'admin',    name: 'Admin',          cx: 76, cy: 44, vw: 16, vh: 14 },
  { id: 'lower',    name: 'Storage/Comms',  cx: 72, cy: 68, vw: 18, vh: 12 },
];

// Camera mount positions on the map (actual grid coords, where the small cameras sit)
const SKELD_CAMERA_MOUNTS = [
  { id: 'hallway',  tx: 40, ty: 8  },
  { id: 'xroads',   tx: 18, ty: 32 },
  { id: 'admin',    tx: 74, ty: 42 },
  { id: 'lower',    tx: 70, ty: 66 },
];

const CameraSystem = {
  enter() {
    CameraState.active = true;
    CameraState.blinking = true;
  },

  exit() {
    CameraState.active = false;
    CameraState.blinking = false;
  },

  isActive() {
    return CameraState.active;
  },

  // Called every frame from draw() when camera overlay is active
  drawOverlay() {
    if (!CameraState.active) return;

    const t = Date.now() / 1000;

    // Full screen dark background
    ctx.fillStyle = 'rgba(0,0,0,0.92)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    // Panel layout — 2×2 grid with gaps
    const margin = 24;
    const gap = 8;
    const totalW = BASE_W - margin * 2;
    const totalH = BASE_H - margin * 2 - 30; // leave room for title bar
    const panelW = (totalW - gap) / 2;
    const panelH = (totalH - gap) / 2;
    const topY = margin + 26; // after title

    // Title bar
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(120,180,200,0.7)';
    ctx.fillText('SECURITY CAMERAS', BASE_W / 2, margin + 14);

    // Close hint
    ctx.font = '10px monospace';
    ctx.fillStyle = 'rgba(150,150,170,0.5)';
    ctx.fillText('Press X or ESC to close', BASE_W / 2, margin + 24);
    ctx.textAlign = 'left';

    // Draw each camera feed
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = margin + col * (panelW + gap);
      const py = topY + row * (panelH + gap);
      const cam = SKELD_CAMERAS[i];

      this._drawCameraFeed(cam, px, py, panelW, panelH, t, i);
    }

    // Close button (X) top-right
    const bx = BASE_W - margin - 20, by = margin + 2, bs = 18;
    ctx.fillStyle = 'rgba(80,80,90,0.6)';
    ctx.beginPath();
    ctx.arc(bx + bs / 2, by + bs / 2, bs / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + 4);
    ctx.lineTo(bx + bs - 4, by + bs - 4);
    ctx.moveTo(bx + bs - 4, by + 4);
    ctx.lineTo(bx + 4, by + bs - 4);
    ctx.stroke();
  },

  _drawCameraFeed(cam, px, py, pw, ph, t, idx) {
    // Panel border
    ctx.fillStyle = '#0a0e12';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#1a2a35';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Calculate world viewport for this camera
    const viewWidthPx = cam.vw * TILE;
    const viewHeightPx = cam.vh * TILE;
    const worldX = cam.cx * TILE - viewWidthPx / 2;
    const worldY = cam.cy * TILE - viewHeightPx / 2;

    // Scale to fit the panel
    const scaleX = pw / viewWidthPx;
    const scaleY = ph / viewHeightPx;
    const scale = Math.min(scaleX, scaleY);
    const drawW = viewWidthPx * scale;
    const drawH = viewHeightPx * scale;
    const offsetX = px + (pw - drawW) / 2;
    const offsetY = py + (ph - drawH) / 2;

    // Clip to panel
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.clip();

    // Render world tiles in camera viewport
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, viewWidthPx, viewHeightPx);

    // Draw tiles
    if (typeof collisionGrid !== 'undefined' && collisionGrid && level) {
      const startTX = Math.max(0, Math.floor(worldX / TILE));
      const startTY = Math.max(0, Math.floor(worldY / TILE));
      const endTX = Math.min(level.widthTiles - 1, Math.ceil((worldX + viewWidthPx) / TILE));
      const endTY = Math.min(level.heightTiles - 1, Math.ceil((worldY + viewHeightPx) / TILE));

      for (let ty = startTY; ty <= endTY; ty++) {
        for (let tx = startTX; tx <= endTX; tx++) {
          const x = tx * TILE - worldX;
          const y = ty * TILE - worldY;
          if (collisionGrid[ty] && collisionGrid[ty][tx] === 1) {
            // Wall
            const sv = ((tx * 5 + ty * 3) % 4);
            ctx.fillStyle = `rgb(${28 + sv},${28 + sv},${36 + sv})`;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = `rgb(${34 + sv},${34 + sv},${44 + sv})`;
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          } else {
            // Floor
            const sv = ((tx * 3 + ty * 7) % 5);
            ctx.fillStyle = `rgb(${48 + sv * 2},${48 + sv * 2},${56 + sv * 2})`;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.strokeStyle = 'rgba(80,80,110,0.08)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, TILE, TILE);
          }
        }
      }
    }

    // Draw entities in this camera's viewport
    if (typeof levelEntities !== 'undefined') {
      for (const e of levelEntities) {
        const ew = e.w ?? 1;
        const eh = e.h ?? 1;
        const epx = e.tx * TILE;
        const epy = e.ty * TILE;
        // Check if entity is in camera viewport
        if (epx + ew * TILE < worldX || epx > worldX + viewWidthPx) continue;
        if (epy + eh * TILE < worldY || epy > worldY + viewHeightPx) continue;
        const renderer = typeof ENTITY_RENDERERS !== 'undefined' && ENTITY_RENDERERS[e.type];
        if (renderer) renderer(e, ctx, epx - worldX, epy - worldY, ew, eh);
      }
    }

    // Draw bots/participants in this camera's viewport
    if (typeof MafiaState !== 'undefined' && MafiaState.participants) {
      for (const p of MafiaState.participants) {
        if (!p.alive || !p.entity) continue;
        if (p.isLocal) continue; // don't show local player on cams
        const bx = p.entity.x - worldX;
        const by = p.entity.y - worldY;
        // Check if bot is in viewport (with some margin)
        if (bx < -TILE || bx > viewWidthPx + TILE) continue;
        if (by < -TILE || by > viewHeightPx + TILE) continue;
        // Draw simple colored circle for the bot (Among Us style crewmate silhouette)
        this._drawCamCrewmate(bx, by, p.entity.skin || p.color || '#888', p.entity.name);
      }
    }

    // Draw local player if in viewport
    if (typeof player !== 'undefined') {
      const plx = player.x - worldX;
      const ply = player.y - worldY;
      if (plx >= -TILE && plx <= viewWidthPx + TILE &&
          ply >= -TILE && ply <= viewHeightPx + TILE) {
        this._drawCamCrewmate(plx, ply, player.skin || '#4a9eff', player.name);
      }
    }

    // Draw dead bodies in viewport
    if (typeof MafiaState !== 'undefined' && MafiaState.bodies) {
      for (const body of MafiaState.bodies) {
        const bx = body.x - worldX;
        const by = body.y - worldY;
        if (bx < -TILE || bx > viewWidthPx + TILE) continue;
        if (by < -TILE || by > viewHeightPx + TILE) continue;
        // Dead body — half circle
        ctx.fillStyle = body.color || '#888';
        ctx.beginPath();
        ctx.ellipse(bx, by + 4, 12, 8, 0, 0, Math.PI);
        ctx.fill();
        // Bone sticking out
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.arc(bx + 6, by - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // scale + translate

    // Camera overlay effects (scan lines, green tint, static)
    // Green security camera tint
    ctx.fillStyle = 'rgba(0,40,20,0.15)';
    ctx.fillRect(px, py, pw, ph);

    // Scan lines
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let sy = py; sy < py + ph; sy += 3) {
      ctx.fillRect(px, sy, pw, 1);
    }

    // Moving scan bar
    const scanBarY = py + ((t * 30 + idx * 60) % ph);
    ctx.fillStyle = 'rgba(80,200,120,0.08)';
    ctx.fillRect(px, scanBarY, pw, 3);

    // Slight static noise (sparse random dots)
    ctx.fillStyle = 'rgba(150,200,150,0.05)';
    const seed = Math.floor(t * 10) + idx * 100;
    for (let n = 0; n < 12; n++) {
      const nx = px + ((seed * 7 + n * 131) % (pw | 1));
      const ny = py + ((seed * 13 + n * 97) % (ph | 1));
      ctx.fillRect(nx, ny, 2, 2);
    }

    // REC indicator (top-left)
    const recOn = Math.sin(t * 2 + idx) > 0;
    if (recOn) {
      ctx.fillStyle = 'rgba(255,30,20,0.8)';
      ctx.beginPath();
      ctx.arc(px + 12, py + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(255,60,40,0.9)';
      ctx.fillText('REC', px + 20, py + 15);
    }

    // Camera name label (bottom-left)
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(150,220,180,0.6)';
    ctx.fillText(cam.name.toUpperCase(), px + 8, py + ph - 8);

    // Timestamp (bottom-right)
    const now = new Date();
    const ts = now.getHours().toString().padStart(2, '0') + ':' +
               now.getMinutes().toString().padStart(2, '0') + ':' +
               now.getSeconds().toString().padStart(2, '0');
    ctx.font = '8px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(150,200,170,0.5)';
    ctx.fillText(ts, px + pw - 6, py + ph - 8);
    ctx.textAlign = 'left';

    ctx.restore(); // clip
  },

  // Draw a simple Among Us-style crewmate silhouette for camera feeds
  _drawCamCrewmate(x, y, color, name) {
    // Body (pill shape)
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y - 4, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = 'rgba(150,210,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y - 8, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Backpack
    ctx.fillStyle = color;
    ctx.fillRect(x - 13, y - 8, 5, 12);
    // Name tag (small)
    if (name) {
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(name, x, y - 22);
      ctx.textAlign = 'left';
    }
  },

  // Handle click on close button
  handleClick(mx, my) {
    if (!CameraState.active) return false;
    // Check close button (top-right)
    const margin = 24;
    const bx = BASE_W - margin - 20, by = margin + 2, bs = 18;
    const dx = mx - (bx + bs / 2), dy = my - (by + bs / 2);
    if (dx * dx + dy * dy < (bs / 2 + 4) * (bs / 2 + 4)) {
      this.exit();
      return true;
    }
    return false;
  },

  // Handle keydown for closing
  handleKey(key) {
    if (!CameraState.active) return false;
    if (key === 'Escape' || key === 'x' || key === 'X') {
      this.exit();
      return true;
    }
    return false;
  },
};
