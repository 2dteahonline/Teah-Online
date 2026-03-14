// ===================== SECURITY CAMERA SYSTEM =====================
// Among Us-style security cameras for The Skeld.
// Player interacts with the camera console → sees 4 live feeds.
// Locked in place while viewing. X / Escape to exit.
// Wall-mounted cameras blink red when someone is watching.

const CameraState = {
  active: false,       // player is viewing cameras
  blinking: false,     // cameras should blink (someone is watching)
};

// Camera definitions — center tile (ACTUAL grid coords) for each feed
// Viewport size is calculated from panel size at 1:1 pixel ratio
const SKELD_CAMERAS = [
  { id: 'hallway',  name: 'Hallway',       cx: 40, cy: 10 },
  { id: 'xroads',   name: 'Corridor',      cx: 20, cy: 34 },
  { id: 'admin',    name: 'Admin',          cx: 76, cy: 44 },
  { id: 'lower',    name: 'Storage/Comms',  cx: 72, cy: 68 },
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

    // Panel layout — 2×2 grid, 75% size centered
    const gap = 12;
    const fullW = BASE_W * 0.6;
    const fullH = BASE_H * 0.6;
    const panelW = (fullW - gap) / 2;
    const panelH = (fullH - gap) / 2;
    const marginX = (BASE_W - fullW) / 2;
    const topY = (BASE_H - fullH) / 2 + 32;

    // Close button (X) top-left
    const bx = marginX - 36, by = topY - 38, bs = 28;
    ctx.fillStyle = 'rgba(60,60,70,0.8)';
    ctx.beginPath();
    ctx.arc(bx + bs / 2, by + bs / 2, bs / 2 + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx + bs / 2, by + bs / 2, bs / 2 + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx + 7, by + 7);
    ctx.lineTo(bx + bs - 7, by + bs - 7);
    ctx.moveTo(bx + bs - 7, by + 7);
    ctx.lineTo(bx + 7, by + bs - 7);
    ctx.stroke();

    // Title bar
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(120,180,200,0.7)';
    ctx.fillText('SECURITY CAMERAS', BASE_W / 2, topY - 16);
    ctx.textAlign = 'left';

    // Draw each camera feed
    for (let i = 0; i < 4; i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const px = marginX + col * (panelW + gap);
      const py = topY + row * (panelH + gap);
      const cam = SKELD_CAMERAS[i];

      this._drawCameraFeed(cam, px, py, panelW, panelH, t, i);
    }
  },

  _drawCameraFeed(cam, px, py, pw, ph, t, idx) {
    // Panel border
    ctx.fillStyle = '#0a0e12';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#1a2a35';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Keep original 75% viewport coverage, scale to fit current panel size
    const origPanelW = (BASE_W * 0.75 - 12) / 2;
    const origPanelH = (BASE_H * 0.75 - 12) / 2;
    const viewWidthPx = origPanelW;
    const viewHeightPx = origPanelH;
    const worldX = cam.cx * TILE - viewWidthPx / 2;
    const worldY = cam.cy * TILE - viewHeightPx / 2;
    const camScale = pw / origPanelW;

    // Clip to panel
    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 1, py + 1, pw - 2, ph - 2);
    ctx.clip();

    // Scale world to fit smaller panel
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(camScale, camScale);

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
        if (epx + ew * TILE < worldX || epx > worldX + viewWidthPx) continue;
        if (epy + eh * TILE < worldY || epy > worldY + viewHeightPx) continue;
        const renderer = typeof ENTITY_RENDERERS !== 'undefined' && ENTITY_RENDERERS[e.type];
        if (renderer) renderer(e, ctx, epx - worldX, epy - worldY, ew, eh);
      }
    }

    // Draw bots/participants using actual drawChar (same size as in-game)
    if (typeof MafiaState !== 'undefined' && MafiaState.participants && typeof drawChar === 'function') {
      for (const p of MafiaState.participants) {
        if (!p.alive || !p.entity) continue;
        if (p.isLocal) continue;
        const bx = p.entity.x - worldX;
        const by = p.entity.y - worldY;
        if (bx < -TILE * 2 || bx > viewWidthPx + TILE * 2) continue;
        if (by < -TILE * 2 || by > viewHeightPx + TILE * 2) continue;
        drawChar(bx, by, p.entity.dir || 0, p.entity.frame || 0, p.entity.moving || false,
          p.entity.skin, p.entity.hair, p.entity.shirt, p.entity.pants,
          p.entity.name, 0, false);
      }
    }

    // Draw local player using actual drawChar if in viewport
    if (typeof player !== 'undefined' && typeof drawChar === 'function') {
      const plx = player.x - worldX;
      const ply = player.y - worldY;
      if (plx >= -TILE * 2 && plx <= viewWidthPx + TILE * 2 &&
          ply >= -TILE * 2 && ply <= viewHeightPx + TILE * 2) {
        drawChar(plx, ply, player.dir, player.frame, player.moving,
          player.skin, player.hair, player.shirt, player.pants,
          player.name, 0, true);
      }
    }

    // Draw dead bodies in viewport
    if (typeof MafiaState !== 'undefined' && MafiaState.bodies && typeof drawMafiaBodies === 'function') {
      for (const body of MafiaState.bodies) {
        const bx = body.x - worldX;
        const by = body.y - worldY;
        if (bx < -TILE || bx > viewWidthPx + TILE) continue;
        if (by < -TILE || by > viewHeightPx + TILE) continue;
        // Draw body half (Among Us style)
        const col = body.color ? body.color.body || body.color : '#888';
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(bx, by + 4, 16, 10, 0, 0, Math.PI);
        ctx.fill();
        ctx.fillStyle = '#ddd';
        ctx.beginPath();
        ctx.arc(bx + 8, by - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore(); // translate

    // Camera overlay effects — subtle scan lines only (no green bar)
    // Green security camera tint
    ctx.fillStyle = 'rgba(0,40,20,0.12)';
    ctx.fillRect(px, py, pw, ph);

    // Scan lines
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let sy = py; sy < py + ph; sy += 3) {
      ctx.fillRect(px, sy, pw, 1);
    }

    // Slight static noise (sparse random dots)
    ctx.fillStyle = 'rgba(150,200,150,0.04)';
    const seed = Math.floor(t * 10) + idx * 100;
    for (let n = 0; n < 8; n++) {
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

  // Handle click on close button (top-left)
  handleClick(mx, my) {
    if (!CameraState.active) return false;
    const fullH = BASE_H * 0.6;
    const marginX = (BASE_W - BASE_W * 0.6) / 2;
    const topY = (BASE_H - fullH) / 2 + 32;
    const bx = marginX - 36, by = topY - 38, bs = 28;
    const dx = mx - (bx + bs / 2), dy = my - (by + bs / 2);
    if (dx * dx + dy * dy < (bs / 2 + 6) * (bs / 2 + 6)) {
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
