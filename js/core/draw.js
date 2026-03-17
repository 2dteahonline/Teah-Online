// ===================== DRAW & GAME LOOP =====================
// Core: main render loop, camera, HUD, game loop
// Extracted from index_2.html — Phase E

let renderTime = 0;
let minimapOpen = false;
let gridOverlayOpen = false;

// ---- MINIMAP ROOM LABELS (per-level) ----
const MINIMAP_LABELS = {
  skeld_01: [
    { name: 'Cafeteria',    x: 61, y: 1,  w: 28, h: 34 },
    { name: 'Upper Engine', x: 5,  y: 1,  w: 23, h: 17 },
    { name: 'Reactor',      x: 1,  y: 23, w: 12, h: 24 },
    { name: 'MedBay',       x: 42, y: 18, w: 16, h: 15 },
    { name: 'Security',     x: 28, y: 24, w: 13, h: 18 },
    { name: 'Lower Engine', x: 5,  y: 52, w: 23, h: 17 },
    { name: 'Electrical',   x: 41, y: 42, w: 19, h: 21 },
    { name: 'Admin',         x: 82, y: 37, w: 19, h: 18 },
    { name: 'Storage',      x: 62, y: 53, w: 18, h: 26 },
    { name: 'Shields',      x: 103, y: 54, w: 19, h: 17 },
    { name: 'Comms',        x: 84, y: 67, w: 18, h: 12 },
    { name: 'Weapons',      x: 99, y: 1,  w: 21, h: 17 },
    { name: 'O2',           x: 90, y: 22, w: 14, h: 14 },
    { name: 'Navigation',   x: 121, y: 24, w: 13, h: 21 },
  ],
};

// Pre-cached minimap image (regenerated on level change)
let _minimapCache = null;
let _minimapCacheLevel = null;

function _buildMinimapCache() {
  if (!level || !collisionGrid) return null;
  const W = level.widthTiles, H = level.heightTiles;
  // Scale to fill most of the screen (max ~1600px wide or ~900px tall)
  const S = Math.max(3, Math.min(Math.floor(1600 / W), Math.floor(900 / H)));
  const c = document.createElement('canvas');
  c.width = W * S; c.height = H * S;
  const mc = c.getContext('2d');

  // Background
  mc.fillStyle = '#0a0a14';
  mc.fillRect(0, 0, c.width, c.height);

  // Tiles
  for (let row = 0; row < H; row++) {
    const gridRow = collisionGrid[row];
    if (!gridRow) continue;
    for (let col = 0; col < W; col++) {
      const solid = gridRow[col] === 1;
      if (!solid) {
        mc.fillStyle = '#3a3a5c';
        mc.fillRect(col * S, row * S, S, S);
        if (S >= 5) {
          mc.strokeStyle = '#2e2e4a';
          mc.lineWidth = 0.5;
          mc.strokeRect(col * S, row * S, S, S);
        }
      } else {
        mc.fillStyle = '#12121e';
        mc.fillRect(col * S, row * S, S, S);
      }
    }
  }

  // Room labels
  const rooms = MINIMAP_LABELS[level.id] || [];
  mc.textAlign = 'center';
  mc.textBaseline = 'middle';
  rooms.forEach(r => {
    mc.strokeStyle = '#0ff';
    mc.lineWidth = 2;
    mc.strokeRect(r.x * S + 1, r.y * S + 1, r.w * S - 2, r.h * S - 2);
    const cx = (r.x + r.w / 2) * S;
    const cy = (r.y + r.h / 2) * S;
    const fontSize = Math.max(10, Math.min(18, S * 1.4)) | 0;
    mc.font = `bold ${fontSize}px monospace`;
    mc.fillStyle = '#000';
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      if (dx || dy) mc.fillText(r.name, cx + dx, cy + dy);
    }
    mc.fillStyle = '#0ff';
    mc.fillText(r.name, cx, cy);
  });

  return { canvas: c, scale: S };
}

function drawMinimap() {
  if (!minimapOpen || !level) return;

  // Rebuild cache if level changed
  if (_minimapCacheLevel !== level.id) {
    _minimapCache = _buildMinimapCache();
    _minimapCacheLevel = level.id;
  }
  if (!_minimapCache) return;

  const mc = _minimapCache;
  const S = mc.scale;
  const ox = (BASE_W - mc.canvas.width) / 2;
  const oy = (BASE_H - mc.canvas.height) / 2;

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Title
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#0ff';
  ctx.textAlign = 'center';
  const title = level.id.replace(/_/g, ' ').toUpperCase();
  ctx.fillText(title + '  —  MAP', BASE_W / 2, oy - 16);

  // Draw cached map
  ctx.drawImage(mc.canvas, ox, oy);

  // Task / sabotage dots on minimap
  // For multi-step tasks, only show the NEXT step (like Among Us)
  if (levelEntities) {
    for (const e of levelEntities) {
      if (e.type !== 'skeld_task' && e.type !== 'skeld_sabotage') continue;
      if (e.type === 'skeld_task' && typeof SkeldTasks !== 'undefined') {
        const stepDone = SkeldTasks.isStepDone(e);
        const taskDone = SkeldTasks.isDone(e.taskId);
        // Hide completed steps; for pending multi-step, only show if it's the next step
        if (taskDone || stepDone) continue;
        if (!SkeldTasks.canDoStep(e)) continue;
      }
      const ex = ox + (e.tx + (e.w || 1) / 2) * S;
      const ey = oy + (e.ty + (e.h || 1) / 2) * S;
      const r = Math.max(3, S * 0.45);
      ctx.fillStyle = e.type === 'skeld_task' ? 'rgba(0,220,240,0.8)' : 'rgba(255,60,30,0.8)';
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.fill();
      if (e.type === 'skeld_task') {
        ctx.strokeStyle = 'rgba(0,220,240,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }

  // Player dot (live position)
  const px = ox + (player.x / TILE) * S;
  const py = oy + (player.y / TILE) * S;
  const pulse = 0.7 + 0.3 * Math.sin(renderTime * 0.008);
  ctx.fillStyle = `rgba(255,255,0,${pulse})`;
  ctx.beginPath();
  ctx.arc(px, py, Math.max(4, S * 0.6), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tracked player dot (Tracker role ability) — uses tracked player's Among Us color
  if (typeof MafiaState !== 'undefined' && MafiaState._roleState && MafiaState._roleState.trackedTarget) {
    const tracked = MafiaState.participants.find(p => p.id === MafiaState._roleState.trackedTarget && p.alive);
    if (tracked && tracked.entity) {
      const tx = ox + (tracked.entity.x / TILE) * S;
      const ty = oy + (tracked.entity.y / TILE) * S;
      const tPulse = 0.6 + 0.4 * Math.sin(renderTime * 0.01);
      // Use tracked player's color so the dot matches their crewmate color
      const tCol = tracked.color ? tracked.color.body : '#ff4444';
      // Parse hex to rgb for rgba alpha blending
      const _r = parseInt(tCol.slice(1,3),16), _g = parseInt(tCol.slice(3,5),16), _b = parseInt(tCol.slice(5,7),16);
      ctx.fillStyle = `rgba(${_r},${_g},${_b},${tPulse})`;
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(4, S * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = tCol;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Hint
  ctx.font = '13px monospace';
  ctx.fillStyle = '#666';
  ctx.fillText('Press M to close', BASE_W / 2, oy + mc.canvas.height + 20);
  ctx.textAlign = 'left';
}

// ===================== DRAW =====================
function draw() {
  try {
  renderTime = Date.now();
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Begin world-space zoom — everything drawn until the matching restore() is scaled
  ctx.save();
  ctx.scale(WORLD_ZOOM, WORLD_ZOOM);

  const cx = Math.floor(camera.x), cy = Math.floor(camera.y);

  // Draw level background (placeholder tiles)
  drawLevelBackground(cx, cy);

  // Draw user-placed tiles on top of background
  drawPlacedTiles(cx, cy);

  // Update Mafia FOV cache early so isMafiaWorldPointVisible() works during entity draws
  if (typeof updateMafiaFOVCache === 'function') updateMafiaFOVCache();

  // Draw level entity overlays (barriers, spawn pads, zones) — uses own cam offset
  drawLevelEntities(cx, cy);

  // Grid coordinate overlay (toggle with G key)
  if (gridOverlayOpen && level) {
    ctx.save();
    ctx.translate(-cx, -cy);
    const T = TILE;
    const startTX = Math.max(0, Math.floor(cx / T) - 1);
    const startTY = Math.max(0, Math.floor(cy / T) - 1);
    const endTX = Math.min(level.widthTiles - 1, startTX + Math.ceil(BASE_W / (T * WORLD_ZOOM)) + 2);
    const endTY = Math.min(level.heightTiles - 1, startTY + Math.ceil(BASE_H / (T * WORLD_ZOOM)) + 2);
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let ty = startTY; ty <= endTY; ty++) {
      for (let tx = startTX; tx <= endTX; tx++) {
        if (tx % 5 === 0 && ty % 5 === 0) {
          const px = tx * T + T / 2;
          const py = ty * T + T / 2;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fillRect(px - 16, py - 8, 32, 16);
          ctx.fillStyle = '#ffcc00';
          ctx.fillText(tx + ',' + ty, px, py);
        } else if (tx % 5 === 0 || ty % 5 === 0) {
          const px = tx * T + T / 2;
          const py = ty * T + T / 2;
          ctx.fillStyle = 'rgba(255,204,0,0.3)';
          ctx.fillRect(tx * T, ty * T, T, T);
          ctx.fillStyle = '#ffcc00';
          ctx.font = '8px monospace';
          ctx.fillText(tx + ',' + ty, px, py);
          ctx.font = 'bold 10px monospace';
        }
      }
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(-cx, -cy);

  // Y-sort all characters
  const sortedChars = [];
  // Draw upgrade station
  if (Scene.inDungeon) drawStation();
  // Draw staircase if open
  if (Scene.inDungeon) drawStaircase();
  // Draw victory celebration
  if (Scene.inDungeon) drawVictoryCelebration();

  sortedChars.push({ y: player.y, type: "player" });
  for (const m of mobs) if (m.hp > 0) sortedChars.push({ y: m.y, type: "mob", mob: m });
  // Party bots — render as characters with Y-sorting
  if (PartyState.members.length > 1) {
    for (const pm of PartyState.members) {
      if (pm.controlType !== 'bot' || !pm.active) continue;
      if (pm.dead && pm.deathTimer <= 0) continue; // fully dead, don't render
      sortedChars.push({ y: pm.entity.y, type: "partyBot", member: pm });
    }
  }
  // Hide & Seek participants — standalone entities, not in mobs[]
  if (typeof HideSeekState !== 'undefined' && Scene.inHideSeek && HideSeekState.participants) {
    for (const p of HideSeekState.participants) {
      if (!p.isLocal && p.entity) sortedChars.push({ y: p.entity.y, type: "mob", mob: p.entity });
    }
  }
  // Mafia dead bodies (render before characters, on the ground)
  if (typeof drawMafiaBodies === 'function' && Scene.inSkeld) drawMafiaBodies();
  // Mafia participants — standalone entities, not in mobs[]
  // Only include if within FOV (hidden players should not be visible through darkness)
  if (typeof MafiaState !== 'undefined' && Scene.inSkeld && MafiaState.participants) {
    for (const p of MafiaState.participants) {
      if (!p.isLocal && p.alive && p.entity
          && (typeof isMafiaWorldPointVisible !== 'function' || isMafiaWorldPointVisible(p.entity.x, p.entity.y))) {
        sortedChars.push({ y: p.entity.y, type: "mob", mob: p.entity });
      }
    }
  }
  // Deli customer NPCs
  if (typeof deliNPCs !== 'undefined' && Scene.inCooking && typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'street_deli') {
    for (const npc of deliNPCs) sortedChars.push({ y: npc.y, type: "deliNPC", npc: npc });
  }
  // Diner customer NPCs
  if (typeof dinerNPCs !== 'undefined' && Scene.inCooking && typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') {
    for (const npc of dinerNPCs) sortedChars.push({ y: npc.y, type: "dinerNPC", npc: npc });
  }
  // Fine dining customer NPCs
  if (typeof fineDiningNPCs !== 'undefined' && Scene.inCooking && typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'fine_dining') {
    for (const npc of fineDiningNPCs) sortedChars.push({ y: npc.y, type: "fineDiningNPC", npc: npc });
  }
  // Spar bots (member objects — entity is member.entity)
  if (typeof SparState !== 'undefined' && Scene.inSpar && SparState._sparBots) {
    for (const member of SparState._sparBots) {
      if (!member.dead && member.entity.hp > 0) sortedChars.push({ y: member.entity.y, type: "sparBot", member: member });
    }
  }
  sortedChars.sort((a, b) => a.y - b.y);

  // Ore nodes (under characters)
  if (typeof drawOreNodes === 'function') drawOreNodes();
  if (typeof drawOrePickups === 'function') drawOrePickups();

  // Telegraph ground markers (under characters, over ground)
  if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.draw(ctx, 0, 0);
  // Hazard system ground effects (under characters)
  if (typeof HazardSystem !== 'undefined') HazardSystem.draw(ctx, 0, 0);

  // Ground effects UNDER characters
  drawMobGroundEffects();
  // Ambient particles UNDER characters
  drawMobAmbientEffects();

  for (const e of sortedChars) {
    if (e.type === "player") {
      if (playerDead && deathTimer > 0) {
        // Death animation: rotate and fade
        const progress = 1 - deathTimer / DEATH_ANIM_FRAMES;
        ctx.save();
        ctx.globalAlpha = 1 - progress * 0.6;
        ctx.translate(player.x - camera.x, player.y - camera.y);
        ctx.rotate(deathRotation);
        ctx.translate(-(player.x - camera.x), -(player.y - camera.y));
        drawChar(player.x, player.y, player.dir, 0, false,
          player.skin, player.hair, player.shirt, player.pants, player.name, 0, true);
        ctx.restore();
      } else if (playerDead) {
        // During countdown, don't draw player (they're dead)
      } else if (typeof VentSystem !== 'undefined' && VentSystem.active) {
        // Player is inside vent — invisible
      } else if (typeof VentSystem !== 'undefined' && VentSystem.animTimer > 0) {
        // Enter/exit vent animation — shrink or grow
        const progress = VentSystem.animTimer / VentSystem.ANIM_DURATION;
        const scale = VentSystem.animType === 'enter' ? progress : (1 - progress);
        ctx.save();
        const px = player.x - camera.x;
        const py = player.y - camera.y;
        ctx.translate(px, py);
        ctx.scale(scale, scale);
        ctx.translate(-px, -py);
        drawChar(player.x, player.y, player.dir, 0, false,
          player.skin, player.hair, player.shirt, player.pants, player.name, 0, true);
        ctx.restore();
      } else if (typeof MafiaState !== 'undefined' && MafiaState._roleState && MafiaState._roleState.shiftAnim) {
        // Shapeshifter transform animation — player frozen, color morphing with particles
        const _sa = MafiaState._roleState.shiftAnim;
        const _prog = 1 - (_sa.timer / _sa.maxTimer); // 0 → 1
        // Slight scale pulse during shift
        const _pulse = 1 + Math.sin(_prog * Math.PI) * 0.15;
        ctx.save();
        const _px = player.x - camera.x;
        const _py = player.y - camera.y;
        ctx.translate(_px, _py);
        ctx.scale(_pulse, _pulse);
        ctx.translate(-_px, -_py);
        // Draw character (color lerp handled inside drawChar)
        drawChar(player.x, player.y, player.dir, 0, false,
          player.skin, player.hair, player.shirt, player.pants, player.name, player.hp, true, null, player.maxHp);
        ctx.restore();
        // Particle sparkle effect around player
        ctx.save();
        const _cx = player.x - camera.x;
        const _cy = player.y - camera.y - 20;
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + renderTime * 0.02;
          const dist = 20 + Math.sin(renderTime * 0.015 + i) * 10;
          const px = _cx + Math.cos(angle) * dist;
          const py = _cy + Math.sin(angle) * dist;
          const alpha = 0.3 + 0.4 * Math.sin(_prog * Math.PI);
          ctx.fillStyle = `rgba(200,120,255,${alpha})`;
          ctx.beginPath(); ctx.arc(px, py, 2 + Math.sin(renderTime * 0.01 + i) * 1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        // Stop player movement during animation
        player.vx = 0;
        player.vy = 0;
      } else {
        const flashAlpha = contactCooldown > 0 && Math.floor(renderTime / 80) % 2 === 0;
        if (flashAlpha) ctx.globalAlpha = 0.5;
        // Phase visual — semi-transparent + cyan glow
        if (phaseTimer > 0) ctx.globalAlpha = 0.4 + Math.sin(renderTime * 0.015) * 0.1;
        // Phantom invisibility — player sees themselves at 30% opacity
        const _phantomInvis = typeof MafiaState !== 'undefined' && MafiaState._roleState && MafiaState._roleState.invisible;
        if (_phantomInvis) ctx.globalAlpha = 0.3;
        // Shapeshifter appearance swap — use target's cosmetics when shifted
        let _pSkin = player.skin, _pHair = player.hair, _pShirt = player.shirt, _pPants = player.pants, _pName = player.name;
        if (typeof MafiaState !== 'undefined' && MafiaState._roleState && MafiaState._roleState.shiftedAs) {
          const _shiftTarget = MafiaState.participants.find(p => p.id === MafiaState._roleState.shiftedAs);
          if (_shiftTarget && _shiftTarget.entity) {
            _pSkin = _shiftTarget.entity.skin != null ? _shiftTarget.entity.skin : _pSkin;
            _pHair = _shiftTarget.entity.hair != null ? _shiftTarget.entity.hair : _pHair;
            _pShirt = _shiftTarget.entity.shirt != null ? _shiftTarget.entity.shirt : _pShirt;
            _pPants = _shiftTarget.entity.pants != null ? _shiftTarget.entity.pants : _pPants;
            _pName = _shiftTarget.name || _pName;
          }
        }
        if (queueActive) {
          // Battle stance: face up, slight bob, weapon ready
          const stanceBob = Math.sin(renderTime * 0.004) * 1.5;
          const stanceFrame = Math.floor(renderTime / 400) % 2; // alternating stance
          ctx.save();
          ctx.translate(0, stanceBob);
          drawChar(player.x, player.y, 1, stanceFrame, false,
            _pSkin, _pHair, _pShirt, _pPants, _pName, player.hp, true, null, player.maxHp);
          ctx.restore();
        } else {
          drawChar(player.x, player.y, player.dir, player.frame, player.moving,
            _pSkin, _pHair, _pShirt, _pPants, _pName, player.hp, true, null, player.maxHp);
        }
        if (flashAlpha || phaseTimer > 0 || _phantomInvis) ctx.globalAlpha = 1.0;

        // Player held food visual (cooking scene — plate+sandwich at hand level)
        if (Scene.inCooking && typeof cookingState !== 'undefined' && cookingState.active &&
            cookingState.assembly && cookingState.assembly.length > 0) {
          const assembly = cookingState.assembly;
          // Hand-level position, offset by facing direction
          let offX = 0, offY = -38;
          if (player.dir === 2) offX = -20;        // facing left → food on left hand
          else if (player.dir === 3) offX = 20;    // facing right → food on right hand
          else if (player.dir === 0) offY = -34;   // facing down → food slightly lower
          else if (player.dir === 1) offY = -44;   // facing up → food slightly higher
          // Walk bob
          const bob = player.moving ? Math.sin(player.frame * Math.PI / 2) * 2 : 0;
          const fx = player.x + offX;
          const fy = player.y + offY + bob;
          // Shadow under plate
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.beginPath(); ctx.ellipse(fx, fy + 12, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
          // Plate base (56px wide)
          ctx.fillStyle = '#c8b898';
          ctx.beginPath(); ctx.ellipse(fx, fy + 7, 28, 11, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a09070'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(fx, fy + 7, 28, 11, 0, 0, Math.PI * 2); ctx.stroke();
          // Plate rim highlight
          ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(fx, fy + 6, 25, 8, 0, 0, Math.PI); ctx.stroke();
          // Stack ingredients as layers (50px wide, 7px tall each)
          const layerH = 7;
          const maxW = 50;
          for (let ai = 0; ai < assembly.length; ai++) {
            const ing = typeof cookingState !== 'undefined' && typeof _getActiveIngredients === 'function'
              ? _getActiveIngredients()[assembly[ai]]
              : (typeof DELI_INGREDIENTS !== 'undefined' ? DELI_INGREDIENTS[assembly[ai]] : null);
            if (!ing) continue;
            const ly = fy + 3 - ai * layerH;
            const isBread = assembly[ai] === 'bread' || assembly[ai] === 'bagel';
            const lw = isBread ? maxW : maxW - 6;
            const lh = isBread ? 8 : 7;
            // Bread top gets dome shape
            if (isBread && ai === assembly.length - 1 && ai > 0) {
              ctx.fillStyle = ing.color;
              ctx.beginPath();
              ctx.moveTo(fx - lw / 2, ly + 1);
              ctx.quadraticCurveTo(fx, ly - lh - 3, fx + lw / 2, ly + 1);
              ctx.closePath(); ctx.fill();
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
              ctx.beginPath();
              ctx.moveTo(fx - lw / 2 + 2, ly);
              ctx.quadraticCurveTo(fx, ly - lh - 1, fx + lw / 2 - 2, ly);
              ctx.closePath(); ctx.fill();
            } else {
              ctx.fillStyle = ing.color;
              ctx.fillRect(fx - lw / 2, ly - lh / 2, lw, lh);
              // Highlight on top edge
              ctx.fillStyle = 'rgba(255,255,255,0.25)';
              ctx.fillRect(fx - lw / 2 + 1, ly - lh / 2, lw - 2, 2);
              // Shadow on bottom edge
              ctx.fillStyle = 'rgba(0,0,0,0.1)';
              ctx.fillRect(fx - lw / 2 + 1, ly + lh / 2 - 1, lw - 2, 1);
            }
          }
        }

        // Phase active glow — cyan ring
        if (phaseTimer > 0) {
          const sx = player.x;
          const sy = player.y;
          const pPulse = 0.5 + Math.sin(renderTime * 0.012) * 0.2;
          ctx.strokeStyle = `rgba(80,220,255,${pPulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy - 10, 32, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(80,200,255,${pPulse * 0.15})`;
          ctx.beginPath(); ctx.arc(sx, sy - 10, 30, 0, Math.PI * 2); ctx.fill();
        }

        // === PLAYER STATUS EFFECT OVERLAYS ===
        if (typeof StatusFX !== 'undefined') {
          const pe = StatusFX.playerEffects;
          const px = player.x, py = player.y;

          // STUN / ROOT — pulsing yellow/orange ring + "STUNNED" text + stars
          if (pe._rootTimer > 0 && pe._root) {
            const stunPulse = 0.6 + 0.4 * Math.sin(renderTime * 0.15);
            // Bright yellow ring
            ctx.strokeStyle = `rgba(255,220,50,${stunPulse * 0.9})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(px, py - 10, 28, 0, Math.PI * 2); ctx.stroke();
            // Orange inner glow
            ctx.fillStyle = `rgba(255,180,30,${stunPulse * 0.2})`;
            ctx.beginPath(); ctx.arc(px, py - 10, 26, 0, Math.PI * 2); ctx.fill();
            // Orbiting stars
            for (let si = 0; si < 3; si++) {
              const sa = renderTime * 0.08 + si * (Math.PI * 2 / 3);
              const starX = px + Math.cos(sa) * 18;
              const starY = py - 28 + Math.sin(sa) * 8;
              ctx.fillStyle = `rgba(255,255,100,${stunPulse})`;
              ctx.beginPath(); ctx.arc(starX, starY, 3, 0, Math.PI * 2); ctx.fill();
            }
            // "STUNNED" text
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(255,220,50,${stunPulse})`;
            ctx.fillText('STUNNED', px, py - 44);
          }

          // SLOW — blue tint overlay + trailing frost particles
          if (pe._slowTimer > 0) {
            const slowAlpha = Math.min(0.35, pe._slowTimer / 100 * 0.35);
            // Blue glow around player
            ctx.fillStyle = `rgba(80,160,255,${slowAlpha})`;
            ctx.beginPath(); ctx.arc(px, py - 10, 24, 0, Math.PI * 2); ctx.fill();
            // Blue ring
            ctx.strokeStyle = `rgba(100,180,255,${slowAlpha + 0.15})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py - 10, 26, 0, Math.PI * 2); ctx.stroke();
            // "SLOWED" text
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(100,180,255,${slowAlpha + 0.3})`;
            ctx.fillText('SLOWED', px, py - 44);
            // Frost particles
            if (renderTime % 5 === 0) {
              ctx.fillStyle = `rgba(180,220,255,${slowAlpha + 0.2})`;
              ctx.beginPath();
              ctx.arc(px + (Math.random()-0.5)*24, py - 10 + (Math.random()-0.5)*20, 2, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // MARK — red crosshair / target indicator
          if (pe._markTimer > 0) {
            const markPulse = 0.5 + 0.3 * Math.sin(renderTime * 0.06);
            ctx.strokeStyle = `rgba(255,60,60,${markPulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py - 10, 22, 0, Math.PI * 2); ctx.stroke();
            // Crosshair lines
            const cl = 8;
            ctx.beginPath();
            ctx.moveTo(px - cl - 10, py - 10); ctx.lineTo(px - 10, py - 10);
            ctx.moveTo(px + 10, py - 10); ctx.lineTo(px + cl + 10, py - 10);
            ctx.moveTo(px, py - 10 - cl - 10); ctx.lineTo(px, py - 20);
            ctx.moveTo(px, py); ctx.lineTo(px, py + cl);
            ctx.stroke();
          }

          // BLEED — red drip particles + "BLEEDING" text
          if (pe._bleedTimer > 0) {
            const bleedAlpha = Math.min(0.5, pe._bleedTimer / 100 * 0.5);
            ctx.fillStyle = `rgba(180,30,30,${bleedAlpha + 0.2})`;
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('BLEEDING', px, py - 44);
            if (renderTime % 4 === 0) {
              ctx.fillStyle = `rgba(200,20,20,${bleedAlpha + 0.3})`;
              ctx.beginPath();
              ctx.arc(px + (Math.random()-0.5)*20, py - 5 + Math.random()*10, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // CONFUSE — swirling purple effect + "CONFUSED" text
          if (pe._confuseTimer > 0) {
            const confPulse = 0.5 + 0.3 * Math.sin(renderTime * 0.12);
            ctx.strokeStyle = `rgba(180,60,220,${confPulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(px, py - 10, 24, renderTime * 0.1, renderTime * 0.1 + Math.PI * 1.5); ctx.stroke();
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(180,60,220,${confPulse})`;
            ctx.fillText('CONFUSED', px, py - 44);
          }

          // DISORIENT — wavy green effect + "DISORIENTED" text
          if (pe._disorientTimer > 0) {
            const disPulse = 0.4 + 0.3 * Math.sin(renderTime * 0.1);
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = `rgba(100,200,80,${disPulse})`;
            ctx.fillText('DISORIENTED', px, py - 44);
            // Wavy lines around player
            ctx.strokeStyle = `rgba(100,200,80,${disPulse * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let wi = -15; wi <= 15; wi += 3) {
              const wx = px + wi, wy = py - 10 + Math.sin((renderTime + wi) * 0.15) * 6;
              if (wi === -15) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
            }
            ctx.stroke();
          }
        }
      }
      
      // Ninja dash afterimage trail (render only — ticking moved to updateMelee)
      if (melee.special === 'ninja' && melee.dashTrail.length > 0) {
        for (let ti = melee.dashTrail.length - 1; ti >= 0; ti--) {
          const t = melee.dashTrail[ti];
          if (t.life <= 0) continue;
          const ta = t.life / 12 * 0.35;
          // Dark silhouette ghost
          ctx.fillStyle = `rgba(15,10,25,${ta})`;
          ctx.beginPath(); ctx.ellipse(t.x, t.y - 20, 10, 18, 0, 0, Math.PI * 2); ctx.fill();
          // Faint dark purple edge
          ctx.strokeStyle = `rgba(50,30,70,${ta * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(t.x, t.y - 20, 10, 18, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      
      // Storm Blade passive lightning aura — subtle crackling sparks
      if (melee.special === 'storm' && !playerDead && activeSlot === 1) {
        const lt = renderTime;
        const px = player.x, py = player.y - 25; // center on upper body
        
        // Soft ambient glow around torso
        const gPulse2 = 0.4 + 0.2 * Math.sin(lt * 0.004);
        ctx.fillStyle = `rgba(180,215,255,${0.055 * gPulse2})`;
        ctx.beginPath(); ctx.ellipse(px, py, 22, 30, 0, 0, Math.PI * 2); ctx.fill();
        
        // 7 lightning bolts crackling off the body — biased toward upper half
        for (let sb = 0; sb < 7; sb++) {
          const seed = sb * 3847 + Math.floor(lt / 80) * 1951; // slower cycle
          const pr = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
          
          const phase = ((lt / 65 + sb * 41) % 100) / 100; // slower
          const bAlpha = Math.sin(phase * Math.PI);
          if (bAlpha < 0.15) continue;
          
          // Start on body — biased upward (head/shoulders/torso)
          const sA = pr(1) * Math.PI * 2;
          const vertBias = -8 + pr(20) * -12; // shift start points up
          const sR = 4 + pr(2) * 8;
          const sx = px + Math.cos(sA) * sR;
          const sy = py + vertBias + Math.sin(sA) * sR * 0.6;
          
          // End — arcs outward, still biased up
          const eA = sA + (pr(3) - 0.5) * 2.2;
          const eR = 20 + pr(4) * 25;
          const ex = px + Math.cos(eA) * eR;
          const ey = py + vertBias * 0.5 + Math.sin(eA) * eR * 0.7;
          
          ctx.strokeStyle = `rgba(${200 + pr(5) * 50 | 0},${220 + pr(6) * 30 | 0},255,${bAlpha * 0.55})`;
          ctx.lineWidth = 1 + pr(7) * 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          const jSegs = 2 + (pr(8) * 2 | 0);
          for (let js = 1; js <= jSegs; js++) {
            const jt = js / jSegs;
            ctx.lineTo(
              sx + (ex - sx) * jt + (pr(9 + js) - 0.5) * 14,
              sy + (ey - sy) * jt + (pr(12 + js) - 0.5) * 14
            );
          }
          ctx.stroke();
          
          // Small branch on some bolts
          if (sb % 3 === 0 && bAlpha > 0.4) {
            const brA = eA + (pr(15) - 0.5) * 1.5;
            const brL = 8 + pr(16) * 12;
            ctx.strokeStyle = `rgba(215,232,255,${bAlpha * 0.35})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + Math.cos(brA) * brL, ey + Math.sin(brA) * brL);
            ctx.stroke();
          }
        }
        
        // Tiny floating spark particles — orbit around upper body
        for (let sp = 0; sp < 5; sp++) {
          const spA = lt * 0.003 * (sp % 2 === 0 ? 1 : -1) + sp * 1.26;
          const spRx = 14 + Math.sin(lt * 0.005 + sp * 1.7) * 10;
          const spRy = 18 + Math.sin(lt * 0.006 + sp * 1.3) * 8;
          const spAlpha = (Math.sin(lt * 0.007 + sp * 1.5) + 1) * 0.22;
          const spx = px + Math.cos(spA) * spRx;
          const spy = py - 6 + Math.sin(spA) * spRy;
          ctx.fillStyle = `rgba(220,238,255,${spAlpha})`;
          ctx.beginPath(); ctx.arc(spx, spy, 1 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      
      // War Cleaver passive cursed energy aura — Sukuna dark red/black swirl
      if (melee.special === 'cleave' && !playerDead && activeSlot === 1) {
        const lt = renderTime;
        const px = player.x, py = player.y - 25;
        
        // Dark pulsing aura glow
        const cPulse = 0.4 + 0.15 * Math.sin(lt * 0.003);
        ctx.fillStyle = `rgba(30,0,0,${0.06 * cPulse})`;
        ctx.beginPath(); ctx.ellipse(px, py, 24, 32, 0, 0, Math.PI * 2); ctx.fill();
        
        // Swirling dark red/black particles rising around body
        for (let cp = 0; cp < 10; cp++) {
          const seed = cp * 5231 + Math.floor(lt / 140) * 2903; // slower change
          const pr = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
          
          // Each particle spirals upward — slow
          const cycleLen = 3500 + pr(1) * 2000; // 3.5-5.5s per cycle
          const phase = ((lt + pr(2) * cycleLen) % cycleLen) / cycleLen;
          const pAlpha = Math.sin(phase * Math.PI);
          if (pAlpha < 0.1) continue;
          
          // Spiral path — rises from lower body to above head
          const spiralA = phase * Math.PI * 2.5 + cp * Math.PI * 2 / 10;
          const spiralR = 7 + pr(3) * 10 + Math.sin(phase * Math.PI * 2) * 3;
          const riseY = 18 - phase * 42;
          
          const ppx = px + Math.cos(spiralA) * spiralR;
          const ppy = py + riseY + Math.sin(spiralA) * spiralR * 0.3;
          
          // Darker colors — heavier on black
          const colorType = cp % 5;
          let cr, cg, cb;
          if (colorType <= 1) { cr = 10 + pr(4) * 15 | 0; cg = 0; cb = 0; } // near black
          else if (colorType === 2) { cr = 60 + pr(5) * 40 | 0; cg = 0; cb = 0; } // very dark red
          else if (colorType === 3) { cr = 35 + pr(6) * 30 | 0; cg = 0; cb = pr(7) * 5 | 0; } // blackish-red
          else { cr = 100 + pr(8) * 40 | 0; cg = 5; cb = 5; } // dark crimson
          
          const pSize = 2 + pr(10) * 2.5;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${pAlpha * 0.45})`;
          ctx.beginPath(); ctx.ellipse(ppx, ppy, pSize * 0.7, pSize * 1.2, 0, 0, Math.PI * 2); ctx.fill();
          
          // Wispy trail below
          if (pAlpha > 0.3) {
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pAlpha * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ppx, ppy);
            ctx.lineTo(ppx - Math.cos(spiralA) * 3, ppy + 5);
            ctx.stroke();
          }
        }
        
        // Faint tiny slash marks flickering around body
        for (let fs = 0; fs < 3; fs++) {
          const seed2 = fs * 7717 + Math.floor(lt / 180) * 3391; // slower
          const pr2 = (n) => { const x = Math.sin(seed2 * n) * 43758.5453; return x - Math.floor(x); };
          
          const fPhase = ((lt / 110 + fs * 53) % 120) / 120;
          const fA = Math.sin(fPhase * Math.PI);
          if (fA < 0.3) continue;
          
          const fAngle = pr2(1) * Math.PI;
          const fDist = 10 + pr2(2) * 16;
          const fBias = -8 + pr2(5) * -10;
          const fx = px + Math.cos(pr2(3) * Math.PI * 2) * fDist;
          const fy = py + fBias + Math.sin(pr2(4) * Math.PI * 2) * fDist * 0.5;
          const fLen = 6 + pr2(6) * 8;
          
          const fColor = fs % 2 === 0 ? `rgba(15,0,0,${fA * 0.35})` : `rgba(80,5,5,${fA * 0.3})`;
          ctx.strokeStyle = fColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(fx - Math.cos(fAngle) * fLen, fy - Math.sin(fAngle) * fLen);
          ctx.lineTo(fx + Math.cos(fAngle) * fLen, fy + Math.sin(fAngle) * fLen);
          ctx.stroke();
        }
      }
    } else if (e.type === "deliNPC") {
      // Deli customer NPC rendering
      const npc = e.npc;
      drawChar(npc.x, npc.y, npc.dir, Math.floor(npc.frame), npc.moving,
        npc.skin, npc.hair, npc.shirt, npc.pants,
        npc.name, -1, false, 'deliNPC', 100, 0, 0.9, 0);
      // Food indicator — plate + sandwich held at hand level (52px wide)
      if (npc.hasFood) {
        // Position at hand/arm level, offset by facing direction
        let fOffX = 0, fOffY = -36; // hand height (mid-torso)
        if (npc.dir === 2) fOffX = -18;        // facing left → food on left
        else if (npc.dir === 3) fOffX = 18;    // facing right → food on right
        else if (npc.dir === 0) fOffY = -32;   // facing down → food slightly lower/forward
        else if (npc.dir === 1) fOffY = -42;   // facing up → food slightly higher
        const bobF = npc.moving ? Math.sin(npc.frame * Math.PI / 2) * 1.5 : 0;
        const fx = npc.x + fOffX, fy = npc.y + fOffY + bobF;
        // Shadow under plate
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(fx, fy + 12, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Plate (52px wide)
        ctx.fillStyle = '#d4c8a8';
        ctx.beginPath(); ctx.ellipse(fx, fy + 6, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a09070'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(fx, fy + 6, 26, 10, 0, 0, Math.PI * 2); ctx.stroke();
        // Plate rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(fx, fy + 5, 23, 7, 0, 0, Math.PI); ctx.stroke();
        // Build sandwich layers from NPC's recipe if available
        let layers = [];
        if (npc._recipeIngredients && typeof DELI_INGREDIENTS !== 'undefined') {
          for (const ingId of npc._recipeIngredients) {
            const ing = DELI_INGREDIENTS[ingId];
            if (ing) layers.push({ color: ing.color, isBread: ingId === 'bread' || ingId === 'bagel' });
          }
        }
        if (layers.length === 0) {
          layers = [
            { color: '#c8a050', isBread: true }, { color: '#e08080', isBread: false },
            { color: '#60c040', isBread: false }, { color: '#f0d040', isBread: false },
            { color: '#d4a840', isBread: true },
          ];
        }
        const npcMaxW = 46, npcLayerH = 7;
        for (let li = 0; li < layers.length; li++) {
          const ly = fy + 3 - li * npcLayerH;
          const lw = layers[li].isBread ? npcMaxW : npcMaxW - 6;
          const lh = layers[li].isBread ? 8 : 7;
          if (layers[li].isBread && li === layers.length - 1 && li > 0) {
            ctx.fillStyle = layers[li].color;
            ctx.beginPath();
            ctx.moveTo(fx - lw / 2, ly + 1);
            ctx.quadraticCurveTo(fx, ly - lh - 3, fx + lw / 2, ly + 1);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.moveTo(fx - lw / 2 + 2, ly);
            ctx.quadraticCurveTo(fx, ly - lh - 1, fx + lw / 2 - 2, ly);
            ctx.closePath(); ctx.fill();
          } else {
            ctx.fillStyle = layers[li].color;
            ctx.fillRect(fx - lw / 2, ly - lh / 2, lw, lh);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(fx - lw / 2 + 1, ly - lh / 2, lw - 2, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.08)';
            ctx.fillRect(fx - lw / 2 + 1, ly + lh / 2 - 1, lw - 2, 1);
          }
        }
      }

    } else if (e.type === "dinerNPC") {
      // Diner customer NPC rendering — same as deli but with plate food visual
      const npc = e.npc;
      drawChar(npc.x, npc.y, npc.dir, Math.floor(npc.frame), npc.moving,
        npc.skin, npc.hair, npc.shirt, npc.pants,
        npc.name, -1, false, 'deliNPC', 100, 0, 0.9, 0);
      // Food indicator — plate with round items (diner style)
      if (npc.hasFood) {
        let fOffX = 0, fOffY = -36;
        if (npc.dir === 2) fOffX = -18;
        else if (npc.dir === 3) fOffX = 18;
        else if (npc.dir === 0) fOffY = -32;
        else if (npc.dir === 1) fOffY = -42;
        const bobF = npc.moving ? Math.sin(npc.frame * Math.PI / 2) * 1.5 : 0;
        const fx = npc.x + fOffX, fy = npc.y + fOffY + bobF;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(fx, fy + 12, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Plate
        ctx.fillStyle = '#d4c8a8';
        ctx.beginPath(); ctx.ellipse(fx, fy + 6, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#a09070'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(fx, fy + 6, 26, 10, 0, 0, Math.PI * 2); ctx.stroke();
        // Food items — round blobs (eggs, pancakes, burgers)
        const foodColors = npc._recipeIngredients && typeof DINER_INGREDIENTS !== 'undefined'
          ? npc._recipeIngredients.map(id => { const ing = DINER_INGREDIENTS[id]; return ing ? ing.color : '#c0a060'; })
          : ['#f0e060', '#c04030', '#d0a850'];
        const maxItems = Math.min(foodColors.length, 4);
        for (let fi = 0; fi < maxItems; fi++) {
          const angle = (fi / maxItems) * Math.PI * 2 - Math.PI / 2;
          const fr = maxItems === 1 ? 0 : 10;
          const fix = fx + Math.cos(angle) * fr;
          const fiy = fy + 3 + Math.sin(angle) * fr * 0.5;
          ctx.fillStyle = foodColors[fi];
          ctx.beginPath(); ctx.ellipse(fix, fiy, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath(); ctx.ellipse(fix - 2, fiy - 2, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      // Waitress tray — show table number badge when carrying food
      if (npc.isWaitress && npc.hasFood && npc._targetPartyId >= 0) {
        let _trayTableNum = null;
        if (typeof dinerParties !== 'undefined') {
          for (const _tp of dinerParties) {
            if (_tp.id === npc._targetPartyId) { _trayTableNum = _tp.tableNumber; break; }
          }
        }
        if (_trayTableNum) {
          // Table number badge above the food
          const badgeX = npc.x, badgeY = npc.y - 52;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.beginPath(); ctx.roundRect(badgeX - 16, badgeY - 7, 32, 14, 3); ctx.fill();
          ctx.font = "bold 8px monospace"; ctx.fillStyle = '#ffd700'; ctx.textAlign = "center";
          ctx.fillText("Table " + _trayTableNum, badgeX, badgeY + 3);
          ctx.textAlign = "left";
        }
      }

    } else if (e.type === "fineDiningNPC") {
      // Fine dining customer NPC rendering — upscale clothing, same structure as diner
      const npc = e.npc;
      drawChar(npc.x, npc.y, npc.dir, Math.floor(npc.frame), npc.moving,
        npc.skin, npc.hair, npc.shirt, npc.pants,
        npc.name, -1, false, 'deliNPC', 100, 0, 0.9, 0);
      // VIP/Celebrity name tag
      if (npc.customerType === 'vip' || npc.customerType === 'celebrity') {
        const tagColor = npc.customerType === 'celebrity' ? '#ff4a8a' : '#ffd700';
        ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = tagColor;
        ctx.fillText(npc.customerType === 'celebrity' ? 'CELEBRITY' : 'VIP', npc.x, npc.y - 52);
        // Sparkle effect
        const t = Date.now() / 300;
        for (let si = 0; si < 3; si++) {
          const sa = t + si * 2.1;
          const sx = npc.x + Math.cos(sa) * 16;
          const sy = npc.y - 30 + Math.sin(sa * 1.3) * 12;
          const sp = (Math.sin(sa * 2) * 0.5 + 0.5);
          ctx.fillStyle = `rgba(255,215,0,${sp * 0.6})`;
          ctx.fillRect(sx - 1, sy - 1, 3, 3);
        }
        ctx.textAlign = "left";
      }
      // Food indicator — upscale plate
      if (npc.hasFood) {
        let fOffX = 0, fOffY = -36;
        if (npc.dir === 2) fOffX = -18;
        else if (npc.dir === 3) fOffX = 18;
        else if (npc.dir === 0) fOffY = -32;
        else if (npc.dir === 1) fOffY = -42;
        const bobF = npc.moving ? Math.sin(npc.frame * Math.PI / 2) * 1.5 : 0;
        const fx = npc.x + fOffX, fy = npc.y + fOffY + bobF;
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath(); ctx.ellipse(fx, fy + 12, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8e0d0';
        ctx.beginPath(); ctx.ellipse(fx, fy + 6, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#c0b090'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(fx, fy + 6, 26, 10, 0, 0, Math.PI * 2); ctx.stroke();
        // Teppanyaki food items
        const foodColors = npc._recipeIngredients && typeof FINE_DINING_INGREDIENTS !== 'undefined'
          ? npc._recipeIngredients.map(id => { const ing = FINE_DINING_INGREDIENTS[id]; return ing ? ing.color : '#c0a060'; })
          : ['#8a3020', '#ff9060', '#f0e060'];
        const maxItems = Math.min(foodColors.length, 4);
        for (let fi = 0; fi < maxItems; fi++) {
          const angle = (fi / maxItems) * Math.PI * 2 - Math.PI / 2;
          const fr = maxItems === 1 ? 0 : 10;
          const fix = fx + Math.cos(angle) * fr;
          const fiy = fy + 3 + Math.sin(angle) * fr * 0.5;
          ctx.fillStyle = foodColors[fi];
          ctx.beginPath(); ctx.ellipse(fix, fiy, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.2)';
          ctx.beginPath(); ctx.ellipse(fix - 2, fiy - 2, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        }
      }

    } else if (e.type === "partyBot") {
      // Party bot rendering — set equip/color overrides so drawChoso uses bot's gear
      const _pm = e.member;
      const _pe = _pm.entity;
      _charEquipOverride = _pm.equip;
      _charEquipOverride._entity = _pe;
      _charColorOverride = { skin: _pe.skin, hair: _pe.hair, shirt: _pe.shirt, pants: _pe.pants };
      // Override weapon/gun state so bots don't mirror player's visuals
      const _savedSlot = activeSlot;
      const _savedRecoil = gun.recoilTimer;
      activeSlot = 0; // bots always show gun
      gun.recoilTimer = _pm.gun ? (_pm.gun.recoilTimer || 0) : 0; // bot's own recoil
      if (_pm.dead) {
        // Death animation
        if (_pm.deathTimer > 0) {
          _pm.deathTimer--;
          _pe._deathRotation = (1 - _pm.deathTimer / DEATH_ANIM_FRAMES) * (Math.PI / 2);
          const _progress = 1 - _pm.deathTimer / DEATH_ANIM_FRAMES;
          ctx.save();
          ctx.globalAlpha = 1 - _progress * 0.6;
          ctx.translate(_pe.x - camera.x, _pe.y - camera.y);
          ctx.rotate(_pe._deathRotation);
          ctx.translate(-(_pe.x - camera.x), -(_pe.y - camera.y));
          drawChar(_pe.x, _pe.y, _pe.dir, 0, false,
            _pe.skin, _pe.hair, _pe.shirt, _pe.pants, _pe.name, -1, false, 'partyBot');
          ctx.restore();
        }
      } else {
        // Alive bot — draw with damage flash + status FX tint
        const _botFlash = _pe._contactCD > 0 && Math.floor(renderTime / 80) % 2 === 0;
        if (_botFlash) ctx.globalAlpha = 0.5;
        // Status effect visual tint for bots
        if (_pe._statusFX) {
          if (_pe._statusFX.burn) { ctx.filter = 'sepia(0.4) saturate(1.5)'; }
          else if (_pe._statusFX.slow) { ctx.filter = 'hue-rotate(180deg) saturate(0.6)'; }
          else if (_pe._statusFX.stun) { ctx.filter = 'brightness(1.5) saturate(0.3)'; }
        }
        drawChar(_pe.x, _pe.y, _pe.dir, _pe.frame, _pe.moving,
          _pe.skin, _pe.hair, _pe.shirt, _pe.pants, _pe.name, _pe.hp, false, 'partyBot', _pe.maxHp);
        if (_pe._statusFX && (_pe._statusFX.burn || _pe._statusFX.slow || _pe._statusFX.stun)) {
          ctx.filter = 'none';
        }
        if (_botFlash) ctx.globalAlpha = 1.0;
      }
      _charEquipOverride = null;
      _charColorOverride = null;
      activeSlot = _savedSlot; // restore player's weapon slot
      gun.recoilTimer = _savedRecoil; // restore player's recoil

    } else if (e.type === "sparBot") {
      // Spar bot rendering — full member pattern (same as partyBot)
      // Hitbox circle colors handled by characterSprite.js via _sparTeam on equip
      const _sm = e.member;
      const _se = _sm.entity;
      // Set equip/color overrides so drawChar renders the bot's gun
      // Tag equip with team so characterSprite can color hitbox circles
      _charEquipOverride = _sm.equip;
      _charEquipOverride._sparTeam = _sm._sparTeam;
      _charEquipOverride._entity = _se;
      _charColorOverride = { skin: _se.skin, hair: _se.hair, shirt: _se.shirt, pants: _se.pants };
      const _savedSlot2 = activeSlot;
      const _savedRecoil2 = gun.recoilTimer;
      activeSlot = 0; // bots always show gun
      gun.recoilTimer = _sm.gun ? (_sm.gun.recoilTimer || 0) : 0;
      // Damage flash
      const _sparFlash = _se._contactCD > 0 && Math.floor(renderTime / 80) % 2 === 0;
      if (_sparFlash) ctx.globalAlpha = 0.5;
      drawChar(_se.x, _se.y, _se.dir, _se.frame, _se.moving,
        _se.skin, _se.hair, _se.shirt, _se.pants, _se.name, _se.hp, false, 'partyBot', _se.maxHp);
      if (_sparFlash) ctx.globalAlpha = 1.0;
      _charEquipOverride = null;
      _charColorOverride = null;
      activeSlot = _savedSlot2;
      gun.recoilTimer = _savedRecoil2;

    } else if (e.mob) {
      const m = e.mob;
      // Hide & Seek: skip rendering mob entirely if outside seeker's FOV
      if (typeof HideSeekState !== 'undefined' && Scene.inHideSeek &&
          HideSeekState.phase === 'seek' && HideSeekState.playerRole === 'seeker') {
        const fovPx = HIDESEEK.FOV_RADIUS * TILE;
        const mdx = m.x - player.x, mdy = m.y - player.y;
        if (Math.sqrt(mdx * mdx + mdy * mdy) > fovPx) continue;
      }
      // Mummy armed glow — flashes green faster as fuse runs down
      if (m.type === "mummy" && m.mummyArmed) {
        const fuseMax = MOB_TYPES.mummy.fuseMax;
        const urgency = 1 - (m.mummyFuse / fuseMax);
        const flashSpeed = 4 + urgency * 12;
        const flashVal = 0.3 + 0.4 * Math.abs(Math.sin(m.mummyFlash * flashSpeed * 0.1));
        ctx.fillStyle = `rgba(120,200,60,${flashVal})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 20, 25 + urgency * 15, 0, Math.PI * 2); ctx.fill();
        // Warning ring
        ctx.strokeStyle = `rgba(200,240,80,${flashVal * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y - 20, 30 + urgency * 20, 0, Math.PI * 2); ctx.stroke();
      }
      // Cloaked mobs (cloak_backstab) — fully invisible, only smoke puffs hint location
      // Determine if mob should be fully invisible
      const mobInvisible = m._cloaked || m._hidden || m._submerged || m._burrowSubmerged || m._riftLeaping || m._phaseTimer > 0;
      if (m._cloaked) {
        ctx.globalAlpha = 0.0;
        if (renderTime % 8 === 0) {
          hitEffects.push({ x: m.x + (Math.random()-0.5)*30, y: m.y - 20 + (Math.random()-0.5)*15, life: 8, type: "smoke_puff" });
        }
      }
      // Boss scale glow — only show when mob is visible
      if (m.isBoss && !mobInvisible) {
        const bPulse = 0.15 + 0.08 * Math.sin(renderTime * 0.005);
        ctx.fillStyle = `rgba(255,120,40,${bPulse})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 35 * (m.scale || 1), 0, Math.PI * 2); ctx.fill();
      }
      // Hidden mobs (shadow_teleport) — fully invisible
      if (m._hidden) {
        ctx.globalAlpha = 0.0;
      }
      // Submerged/burrowed mobs — completely invisible
      if (m._submerged || m._burrowSubmerged) {
        ctx.globalAlpha = 0.0;
      }
      // Rift leap / phase skip — mob is invisible during leap/phase
      if (m._riftLeaping || m._phaseTimer > 0) {
        ctx.globalAlpha = 0.0;
      }
      drawChar(m.x, m.y, m.dir, Math.floor(m.frame), true,
        m.skin, m.hair, m.shirt, m.pants, m.name, m.hp, false, m.type, m.maxHp, m.boneSwing || 0, m.scale || 1, m.castTimer || m.throwAnim || m.bowDrawAnim || m.healAnim || 0);
      if (m._cloaked) ctx.globalAlpha = 1.0;
      // Restore alpha for hidden/submerged
      if (m._hidden || m._submerged || m._burrowSubmerged || m._riftLeaping || m._phaseTimer > 0) ctx.globalAlpha = 1.0;
      // Shield HP overlay — blue/gold hexagonal shield (skip if invisible)
      if (m._shieldHp > 0 && !mobInvisible) {
        const shPulse = 0.4 + 0.2 * Math.sin(renderTime * 0.008);
        const sc = m.scale || 1;
        // Blue shield glow
        ctx.strokeStyle = `rgba(80,180,255,${shPulse})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15 * sc, 22 * sc, 0, Math.PI * 2); ctx.stroke();
        // Inner gold ring
        ctx.strokeStyle = `rgba(255,215,0,${shPulse * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15 * sc, 18 * sc, 0, Math.PI * 2); ctx.stroke();
        // Shield HP text
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(80,200,255,${0.7 + shPulse * 0.3})`;
        ctx.fillText('\u{1F6E1}' + m._shieldHp, m.x, m.y - 35 * sc);
      }

      // Frost effect overlay — obvious blue tint on frozen mobs (skip if invisible)
      if (m.frostTimer > 0 && !mobInvisible) {
        const fAlpha = Math.min(0.5, m.frostTimer / 150 * 0.5);
        // Blue glow around mob
        ctx.fillStyle = `rgba(60,160,255,${fAlpha * 0.6})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 24, 0, Math.PI * 2); ctx.fill();
        // Inner bright core
        ctx.fillStyle = `rgba(150,220,255,${fAlpha * 0.4})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 16, 0, Math.PI * 2); ctx.fill();
        // Orbiting ice crystals
        const t = renderTime / 300;
        for (let ip = 0; ip < 5; ip++) {
          const ia = t + ip * Math.PI * 2 / 5;
          const ix = m.x + Math.cos(ia) * 20;
          const iy = m.y - 15 + Math.sin(ia) * 18;
          // Diamond shape
          ctx.fillStyle = `rgba(200,240,255,${fAlpha * 2})`;
          ctx.save();
          ctx.translate(ix, iy);
          ctx.rotate(ia + t);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
        // "SLOW" text indicator
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(100,200,255,${fAlpha * 1.5})`;
        ctx.fillText("SLOW", m.x, m.y - 42);
        ctx.textAlign = "left";
      }
      // Burn effect overlay — big fire particles on burning mobs (skip if invisible)
      if (m.burnTimer > 0 && !mobInvisible) {
        const bAlpha = Math.min(0.7, m.burnTimer / 180 * 0.7);
        // Orange glow
        ctx.fillStyle = `rgba(255,100,20,${bAlpha * 0.35})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 22, 0, Math.PI * 2); ctx.fill();
        // Animated flame particles rising up
        const t = renderTime / 100;
        for (let fp = 0; fp < 6; fp++) {
          const phase = t + fp * 1.1;
          const fLife = (phase % 3) / 3; // 0 to 1 cycle
          const fx = m.x + Math.sin(phase * 1.5) * (8 + fp * 2);
          const fy = m.y - 5 - fLife * 35;
          const fSize = (1 - fLife) * 5 + 2;
          // Fire gradient: yellow core → orange → red tip
          const r = 255, g = Math.round(200 - fLife * 150), b2 = Math.round(40 - fLife * 40);
          ctx.fillStyle = `rgba(${r},${g},${b2},${(1 - fLife) * bAlpha})`;
          ctx.beginPath(); ctx.arc(fx, fy, fSize, 0, Math.PI * 2); ctx.fill();
        }
        // "BURN" text indicator
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,160,40,${bAlpha * 1.2})`;
        ctx.fillText("BURN", m.x, m.y - 42);
        ctx.textAlign = "left";
      }
      // Poison effect overlay — green dripping particles on poisoned mobs

      // Stagger effect overlay — orange/gold stunned effect (skip if invisible)
      if (m.staggerTimer > 0 && !mobInvisible) {
        const sAlpha = Math.min(0.7, m.staggerTimer / 18 * 0.7);
        // Orange flash on mob
        ctx.fillStyle = `rgba(255,160,40,${sAlpha * 0.3})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 22, 0, Math.PI * 2); ctx.fill();
        // Stun stars orbiting
        const st = renderTime / 200;
        for (let sp = 0; sp < 3; sp++) {
          const sa = st + sp * Math.PI * 2 / 3;
          const starX = m.x + Math.cos(sa) * 18;
          const starY = m.y - 38 + Math.sin(sa * 2) * 4;
          // Draw small star
          ctx.fillStyle = `rgba(255,200,50,${sAlpha})`;
          ctx.beginPath();
          for (let si = 0; si < 5; si++) {
            const a2 = si * Math.PI * 2 / 5 - Math.PI / 2 + st;
            const r = si % 2 === 0 ? 4 : 2;
            if (si === 0) ctx.moveTo(starX + Math.cos(a2) * r, starY + Math.sin(a2) * r);
            else ctx.lineTo(starX + Math.cos(a2) * r, starY + Math.sin(a2) * r);
          }
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  // Death explosion effects (in world space, on top of mobs)
  drawDeathEffects();

  // Medpacks (in world space)
  drawMedpacks();

  // Bullets (in world space)
  drawBullets();

  // Mob-owned world objects: gas canisters, sticky bombs, smart mines
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    // Gas canister projectile (street_chemist) — green arcing vial
    if (m._gasProjectile) {
      const gp = m._gasProjectile;
      const gpx = gp.x, gpy = gp.y;
      // Green glow trail
      ctx.fillStyle = 'rgba(100,200,50,0.25)';
      ctx.beginPath(); ctx.arc(gpx, gpy, 10, 0, Math.PI * 2); ctx.fill();
      // Vial body
      ctx.fillStyle = '#60c830';
      ctx.fillRect(gpx - 4, gpy - 6, 8, 12);
      // Vial cap
      ctx.fillStyle = '#404040';
      ctx.fillRect(gpx - 3, gpy - 8, 6, 3);
      // Bright green core
      ctx.fillStyle = '#90ff50';
      ctx.fillRect(gpx - 2, gpy - 4, 4, 8);
      // Dripping trail particles
      if (renderTime % 3 === 0) {
        ctx.fillStyle = 'rgba(100,200,50,0.4)';
        ctx.beginPath(); ctx.arc(gpx + (Math.random()-0.5)*6, gpy + 8, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Sticky bombs (renegade_demo) — orange pulsing bombs on ground
    if (m._bombs && m._bombs.length > 0) {
      for (const bomb of m._bombs) {
        const bx = bomb.x, by = bomb.y;
        const fuseProgress = 1 - bomb.timer / 120;
        const flashRate = 3 + fuseProgress * 15;
        const flash = 0.5 + 0.5 * Math.sin(renderTime * 0.05 * flashRate);
        // Danger radius circle (grows more visible as timer runs out)
        ctx.strokeStyle = `rgba(255,100,30,${fuseProgress * 0.25})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, by, bomb.radius, 0, Math.PI * 2); ctx.stroke();
        // Bomb glow
        ctx.fillStyle = `rgba(255,100,30,${0.1 + flash * 0.15})`;
        ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2); ctx.fill();
        // Bomb body
        ctx.fillStyle = '#4a3a2a';
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
        // Orange band
        ctx.fillStyle = '#ff6030';
        ctx.fillRect(bx - 7, by - 2, 14, 4);
        // Flashing light
        ctx.fillStyle = `rgba(255,${Math.round(200 * flash)},0,${0.6 + flash * 0.4})`;
        ctx.beginPath(); ctx.arc(bx, by - 6, 3, 0, Math.PI * 2); ctx.fill();
        // Fuse spark
        if (flash > 0.7) {
          ctx.fillStyle = '#ffff80';
          ctx.beginPath(); ctx.arc(bx + (Math.random()-0.5)*4, by - 9, 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // Smart mines (the_don) — armed/unarmed proximity mines
    if (m._mines && m._mines.length > 0) {
      for (const mine of m._mines) {
        const mx = mine.x, my = mine.y;
        if (mine.armed) {
          // Armed — red pulsing
          const pulse = 0.5 + 0.5 * Math.sin(renderTime * 0.08);
          ctx.fillStyle = `rgba(255,40,40,${0.1 + pulse * 0.1})`;
          ctx.beginPath(); ctx.arc(mx, my, mine.radius * 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3a2a2a';
          ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = `rgba(255,30,30,${0.5 + pulse * 0.5})`;
          ctx.beginPath(); ctx.arc(mx, my - 4, 2.5, 0, Math.PI * 2); ctx.fill();
        } else {
          // Unarmed — dim gray
          ctx.fillStyle = '#3a3a3a';
          ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#666';
          ctx.beginPath(); ctx.arc(mx, my - 4, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // Turret entities (suit_enforcer briefcase_turret) — small mounted gun
    if (m._turrets && m._turrets.length > 0) {
      for (const turret of m._turrets) {
        const tx = turret.x, ty = turret.y;
        // Base platform
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(tx - 10, ty - 4, 20, 8);
        // Turret body
        ctx.fillStyle = '#5a5a6a';
        ctx.fillRect(tx - 6, ty - 12, 12, 10);
        // Gun barrel (points toward player)
        const aDx = player.x - turret.x, aDy = player.y - turret.y;
        const aAngle = Math.atan2(aDy, aDx);
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 8);
        ctx.lineTo(tx + Math.cos(aAngle) * 14, ty - 8 + Math.sin(aAngle) * 14);
        ctx.stroke();
        // Flashing light
        const tFlash = 0.5 + 0.5 * Math.sin(renderTime * 0.1);
        ctx.fillStyle = `rgba(255,60,30,${tFlash})`;
        ctx.beginPath(); ctx.arc(tx, ty - 14, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Drone entities (executive_handler drone_swarm, junz drone_court) — small orbiting bots
    if (m._drones && m._drones.length > 0) {
      for (const drone of m._drones) {
        const dx = drone.x, dy = drone.y;
        // Drone body — small dark disc
        ctx.fillStyle = drone.diving ? '#ff4040' : '#4a6a8a';
        ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fill();
        // Propeller flash
        const prop = renderTime * 0.3 + drone.angle;
        ctx.strokeStyle = 'rgba(150,200,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dx + Math.cos(prop) * 8, dy + Math.sin(prop) * 8);
        ctx.lineTo(dx - Math.cos(prop) * 8, dy - Math.sin(prop) * 8);
        ctx.stroke();
        // Eye glow
        ctx.fillStyle = drone.diving ? '#ff8080' : '#80c0ff';
        ctx.beginPath(); ctx.arc(dx, dy, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Static orbs (jackman static_orbs) — electric orbiting balls
    if (m._staticOrbs && m._staticOrbs.length > 0) {
      for (const orb of m._staticOrbs) {
        const ox = orb.x, oy = orb.y;
        // Electric glow
        ctx.fillStyle = orb.diving ? 'rgba(255,220,80,0.3)' : 'rgba(80,180,255,0.3)';
        ctx.beginPath(); ctx.arc(ox, oy, 12, 0, Math.PI * 2); ctx.fill();
        // Orb core
        ctx.fillStyle = orb.diving ? '#ffdd44' : '#50b0ff';
        ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
        // Bright center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ox, oy, 2, 0, Math.PI * 2); ctx.fill();
        // Sparks
        ctx.strokeStyle = orb.diving ? 'rgba(255,220,80,0.5)' : 'rgba(80,180,255,0.5)';
        ctx.lineWidth = 1;
        for (let si = 0; si < 3; si++) {
          const sa = renderTime * 0.05 + si * 2.1 + orb.angle;
          ctx.beginPath();
          ctx.moveTo(ox + Math.cos(sa) * 5, oy + Math.sin(sa) * 5);
          ctx.lineTo(ox + Math.cos(sa + 0.4) * 11, oy + Math.sin(sa + 0.3) * 11);
          ctx.stroke();
        }
      }
    }
    // Egg sac entities (centipede toxic_nursery) — green pulsing eggs
    if (m._eggs && m._eggs.length > 0) {
      for (const egg of m._eggs) {
        const ex = egg.x, ey = egg.y;
        const hatchProgress = 1 - egg.timer / 180;
        const pulse = 0.5 + 0.3 * Math.sin(renderTime * 0.08 + hatchProgress * 10);
        // Slime base
        ctx.fillStyle = `rgba(80,160,40,${0.15 + hatchProgress * 0.15})`;
        ctx.beginPath(); ctx.arc(ex, ey + 4, 16, 0, Math.PI * 2); ctx.fill();
        // Egg body — oval
        ctx.fillStyle = `rgba(${100 + hatchProgress * 80},${180 - hatchProgress * 60},${60},${0.7 + pulse * 0.2})`;
        ctx.beginPath(); ctx.ellipse(ex, ey, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
        // Veins (more visible as hatching approaches)
        if (hatchProgress > 0.3) {
          ctx.strokeStyle = `rgba(60,120,30,${hatchProgress * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ex - 4, ey - 8); ctx.lineTo(ex - 2, ey + 4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex + 3, ey - 6); ctx.lineTo(ex + 1, ey + 6); ctx.stroke();
        }
        // Pulsing glow when close to hatching
        if (hatchProgress > 0.7) {
          ctx.fillStyle = `rgba(120,255,40,${pulse * 0.2})`;
          ctx.beginPath(); ctx.arc(ex, ey, 18, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
    // Holographic clones (holo_jester fake_wall) — translucent copies of the mob
    if (m._holoClones && m._holoClones.length > 0) {
      for (const clone of m._holoClones) {
        const clx = clone.x, cly = clone.y;
        const holoFlicker = 0.3 + 0.15 * Math.sin(renderTime * 0.12 + clone.angle * 3);
        // Blue hologram glow BEHIND character (centered on body at y-20)
        ctx.fillStyle = `rgba(100,180,255,${holoFlicker * 0.25})`;
        ctx.beginPath(); ctx.arc(clx, cly - 20, 24, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = `rgba(100,200,255,${holoFlicker * 0.35})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(clx, cly - 20, 24, 0, Math.PI * 2); ctx.stroke();
        // Draw clone character (translucent)
        ctx.globalAlpha = holoFlicker;
        drawChar(clone.x, clone.y, clone.dir, Math.floor(clone.frame) % 4, true,
          clone.skin, clone.hair, clone.shirt, clone.pants,
          '', -1, false, null, 100, 0, 0.9, 0);
        ctx.globalAlpha = 1.0;
        // Scanline effect over the character body area
        if (renderTime % 4 < 2) {
          ctx.strokeStyle = `rgba(100,200,255,${holoFlicker * 0.3})`;
          ctx.lineWidth = 1;
          const scanY = cly - 40 + (renderTime % 50);
          if (scanY > cly - 45 && scanY < cly) {
            ctx.beginPath();
            ctx.moveTo(clx - 14, scanY);
            ctx.lineTo(clx + 14, scanY);
            ctx.stroke();
          }
        }
      }
    }
    // Rocket drones (enforcer_drone suppress_cone) — floating shooting drone
    if (m._rocketDrones && m._rocketDrones.length > 0) {
      for (const drone of m._rocketDrones) {
        const rdx = drone.x, rdy = drone.y;
        // Hover bob
        const bob = Math.sin(renderTime * 0.08 + drone.x * 0.01) * 3;
        const droneY = rdy + bob;
        // Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(rdx, rdy + 8, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
        // Drone body — dark metallic disc
        ctx.fillStyle = '#3a4a5a';
        ctx.beginPath(); ctx.ellipse(rdx, droneY, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Top dome
        ctx.fillStyle = '#5a6a7a';
        ctx.beginPath(); ctx.arc(rdx, droneY - 4, 7, Math.PI, 0); ctx.fill();
        // Propeller arms
        const propAngle = renderTime * 0.3;
        ctx.strokeStyle = 'rgba(150,200,255,0.5)';
        ctx.lineWidth = 1.5;
        for (let pa = 0; pa < 4; pa++) {
          const a = propAngle + pa * Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(rdx + Math.cos(a) * 4, droneY - 2 + Math.sin(a) * 2);
          ctx.lineTo(rdx + Math.cos(a) * 14, droneY - 2 + Math.sin(a) * 5);
          ctx.stroke();
        }
        // Gun barrel (points toward player)
        const gunAngle = Math.atan2(player.y - drone.y, player.x - drone.x);
        ctx.strokeStyle = '#8a8a9a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(rdx, droneY + 2);
        ctx.lineTo(rdx + Math.cos(gunAngle) * 12, droneY + 2 + Math.sin(gunAngle) * 12);
        ctx.stroke();
        // Eye glow (red when firing)
        const eyePulse = 0.5 + 0.5 * Math.sin(renderTime * 0.15);
        ctx.fillStyle = `rgba(255,60,40,${eyePulse})`;
        ctx.beginPath(); ctx.arc(rdx, droneY - 2, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Laser beams (game_master puzzle_lasers) — rotating energy beams
    if (m._lasers && m._lasers.length > 0) {
      for (const laser of m._lasers) {
        const lcx = laser.cx, lcy = laser.cy;
        const beamLen = laser.length || 300;
        const endX = lcx + Math.cos(laser.angle) * beamLen;
        const endY = lcy + Math.sin(laser.angle) * beamLen;
        // Outer glow
        ctx.strokeStyle = `rgba(255,40,40,0.15)`;
        ctx.lineWidth = 16;
        ctx.beginPath(); ctx.moveTo(lcx, lcy); ctx.lineTo(endX, endY); ctx.stroke();
        // Mid beam
        ctx.strokeStyle = `rgba(255,80,40,0.35)`;
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.moveTo(lcx, lcy); ctx.lineTo(endX, endY); ctx.stroke();
        // Core beam — bright
        const pulse = 0.6 + 0.4 * Math.sin(renderTime * 0.1 + laser.angle);
        ctx.strokeStyle = `rgba(255,200,100,${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(lcx, lcy); ctx.lineTo(endX, endY); ctx.stroke();
        // Bright center orb
        ctx.fillStyle = `rgba(255,220,120,${pulse})`;
        ctx.beginPath(); ctx.arc(lcx, lcy, 6, 0, Math.PI * 2); ctx.fill();
        // End spark
        ctx.fillStyle = `rgba(255,100,40,${pulse * 0.7})`;
        ctx.beginPath(); ctx.arc(endX, endY, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Junz beam (repulsor_beam) — persistent energy beam like Game Master but blue/cyan
    if (m._junzBeam && m._junzBeam.life > 0) {
      const jb = m._junzBeam;
      const jbx = jb.cx, jby = jb.cy;
      const jbLen = jb.length || 336;
      const jEndX = jbx + Math.cos(jb.angle) * jbLen;
      const jEndY = jby + Math.sin(jb.angle) * jbLen;
      // Outer glow — blue
      ctx.strokeStyle = `rgba(40,100,255,0.15)`;
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(jbx, jby); ctx.lineTo(jEndX, jEndY); ctx.stroke();
      // Mid beam — cyan
      ctx.strokeStyle = `rgba(60,160,255,0.35)`;
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(jbx, jby); ctx.lineTo(jEndX, jEndY); ctx.stroke();
      // Core beam — bright white-blue
      const jPulse = 0.6 + 0.4 * Math.sin(renderTime * 0.1 + jb.angle);
      ctx.strokeStyle = `rgba(140,200,255,${jPulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(jbx, jby); ctx.lineTo(jEndX, jEndY); ctx.stroke();
      // Bright center orb
      ctx.fillStyle = `rgba(120,180,255,${jPulse})`;
      ctx.beginPath(); ctx.arc(jbx, jby, 6, 0, Math.PI * 2); ctx.fill();
      // End spark
      ctx.fillStyle = `rgba(60,140,255,${jPulse * 0.7})`;
      ctx.beginPath(); ctx.arc(jEndX, jEndY, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Tesla pillars (voltmaster tesla_pillars) — glowing energy pillars
    if (m._pillars && m._pillars.length > 0) {
      for (const pillar of m._pillars) {
        const plx = pillar.x, ply = pillar.y;
        // Pillar base
        ctx.fillStyle = 'rgba(0,180,220,0.15)';
        ctx.beginPath(); ctx.arc(plx, ply + 5, 14, 0, Math.PI * 2); ctx.fill();
        // Pillar body
        ctx.fillStyle = '#2a5a6a';
        ctx.fillRect(plx - 5, ply - 20, 10, 25);
        // Energy top
        const ePulse = 0.5 + 0.5 * Math.sin(renderTime * 0.1 + pillar.x * 0.01);
        ctx.fillStyle = `rgba(0,200,255,${ePulse})`;
        ctx.beginPath(); ctx.arc(plx, ply - 20, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#aaeeff';
        ctx.beginPath(); ctx.arc(plx, ply - 20, 3, 0, Math.PI * 2); ctx.fill();
      }
      // Draw zap lines between pillars
      if (m._pillars.length >= 2) {
        ctx.strokeStyle = 'rgba(0,200,255,0.4)';
        ctx.lineWidth = 2;
        for (let pi = 0; pi < m._pillars.length; pi++) {
          const p1 = m._pillars[pi];
          const p2 = m._pillars[(pi + 1) % m._pillars.length];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y - 20);
          ctx.lineTo(p2.x, p2.y - 20);
          ctx.stroke();
        }
      }
    }
    // ===== WAGASHI DUNGEON PERSISTENT EFFECTS =====
    // Silk snares (Sichou boss) — web patches on ground
    if (m._silkSnares && m._silkSnares.length > 0) {
      for (const snare of m._silkSnares) {
        if (snare.life <= 0) continue;
        const sa = Math.min(1, snare.life / 60);
        ctx.fillStyle = `rgba(200,200,220,${sa * 0.2})`;
        ctx.beginPath(); ctx.arc(snare.x, snare.y, 50, 0, Math.PI * 2); ctx.fill();
        // Web lines
        ctx.strokeStyle = `rgba(220,220,240,${sa * 0.5})`;
        ctx.lineWidth = 1;
        for (let wi = 0; wi < 6; wi++) {
          const wa = (Math.PI * 2 / 6) * wi;
          ctx.beginPath(); ctx.moveTo(snare.x, snare.y);
          ctx.lineTo(snare.x + Math.cos(wa) * 45, snare.y + Math.sin(wa) * 45); ctx.stroke();
        }
      }
    }
    // Blaze trail (Jaja boss) — fire patches on ground
    if (m._blazeTrail && m._blazeTrail.length > 0) {
      for (const zone of m._blazeTrail) {
        if (zone.timer <= 0) continue;
        const fa = Math.min(1, zone.timer / 30);
        const fPulse = 0.6 + 0.4 * Math.sin(renderTime * 0.08 + zone.x * 0.1);
        ctx.fillStyle = `rgba(255,${80 + Math.floor(fPulse * 60)},20,${fa * 0.3})`;
        ctx.beginPath(); ctx.arc(zone.x, zone.y, 45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,200,40,${fa * fPulse * 0.4})`;
        ctx.beginPath(); ctx.arc(zone.x, zone.y, 25, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Corruption pools (Celestial Toad) — dark purple pools
    if (m._corrPools && m._corrPools.length > 0) {
      for (const pool of m._corrPools) {
        if (pool.life <= 0) continue;
        const pa = Math.min(1, pool.life / 60);
        const pPulse = 0.5 + 0.3 * Math.sin(renderTime * 0.06 + pool.x * 0.05);
        ctx.fillStyle = `rgba(100,50,120,${pa * 0.25 + pPulse * 0.1})`;
        ctx.beginPath(); ctx.arc(pool.x, pool.y, 50, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(140,60,160,${pa * pPulse * 0.3})`;
        ctx.beginPath(); ctx.arc(pool.x, pool.y, 30, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Gravity well (Moon Rabbit) — swirling purple vortex
    if (m._gravWell && m._gravWell.timer > 0) {
      const gw = m._gravWell;
      const ga = Math.min(1, gw.timer / 30);
      const gRot = renderTime * 0.03;
      ctx.strokeStyle = `rgba(120,60,200,${ga * 0.4})`;
      ctx.lineWidth = 2;
      for (let ri = 0; ri < 3; ri++) {
        const ra = gRot + (Math.PI * 2 / 3) * ri;
        ctx.beginPath();
        ctx.arc(gw.x, gw.y, 60 + ri * 15, ra, ra + Math.PI * 0.8);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(100,50,180,${ga * 0.15})`;
      ctx.beginPath(); ctx.arc(gw.x, gw.y, 100, 0, Math.PI * 2); ctx.fill();
    }
    // Cinder zone (Ember Guard) — fire patch
    if (m._cinderZone && m._cinderZone.timer > 0) {
      const cz = m._cinderZone;
      const ca = Math.min(1, cz.timer / 30);
      const cPulse = 0.5 + 0.5 * Math.sin(renderTime * 0.1 + cz.x * 0.1);
      ctx.fillStyle = `rgba(255,${100 + Math.floor(cPulse * 50)},30,${ca * 0.25})`;
      ctx.beginPath(); ctx.arc(cz.x, cz.y, 50, 0, Math.PI * 2); ctx.fill();
    }
    // Gravity zone (Gravity Ear Monk) — purple slow field
    if (m._gravityZone && m._gravityZone.timer > 0) {
      const gz = m._gravityZone;
      const gza = Math.min(1, gz.timer / 30);
      ctx.fillStyle = `rgba(120,80,200,${gza * 0.15})`;
      ctx.beginPath(); ctx.arc(gz.x, gz.y, 70, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(140,100,220,${gza * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(gz.x, gz.y, 70, 0, Math.PI * 2); ctx.stroke();
    }
    // Cyclone guard (Azure Dragon) — spinning storm around self
    if (m._cycloneTimer && m._cycloneTimer > 0) {
      const cRot = renderTime * 0.06;
      const cAlpha = Math.min(1, m._cycloneTimer / 30);
      ctx.strokeStyle = `rgba(80,200,220,${cAlpha * 0.4})`;
      ctx.lineWidth = 3;
      for (let ci = 0; ci < 4; ci++) {
        const ca = cRot + (Math.PI / 2) * ci;
        ctx.beginPath();
        ctx.arc(m.x, m.y - 10, 80 + ci * 10, ca, ca + Math.PI * 0.6);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(60,180,200,${cAlpha * 0.1})`;
      ctx.beginPath(); ctx.arc(m.x, m.y - 10, 120, 0, Math.PI * 2); ctx.fill();
    }
    // Ember mantle (Jaja boss) — heat aura
    if (m._emberMantleTimer && m._emberMantleTimer > 0) {
      const emAlpha = Math.min(1, m._emberMantleTimer / 30);
      const emPulse = 0.5 + 0.5 * Math.sin(renderTime * 0.08);
      ctx.fillStyle = `rgba(255,${120 + Math.floor(emPulse * 40)},40,${emAlpha * 0.12 + emPulse * 0.05})`;
      ctx.beginPath(); ctx.arc(m.x, m.y - 10, 100, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,160,60,${emAlpha * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y - 10, 100, 0, Math.PI * 2); ctx.stroke();
    }
    // Boar fury (Tongya boss) — rage aura
    if (m._boarFuryActive) {
      const bfPulse = 0.5 + 0.5 * Math.sin(renderTime * 0.1);
      ctx.fillStyle = `rgba(200,60,30,${0.08 + bfPulse * 0.05})`;
      ctx.beginPath(); ctx.arc(m.x, m.y - 10, 50, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,40,${0.3 + bfPulse * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y - 10, 50, 0, Math.PI * 2); ctx.stroke();
    }
    // Devouring pull (Celestial Toad) — suction vortex
    if (m._devourPullTimer && m._devourPullTimer > 0) {
      const dpRot = renderTime * 0.05;
      const dpAlpha = Math.min(1, m._devourPullTimer / 30);
      ctx.strokeStyle = `rgba(80,40,100,${dpAlpha * 0.4})`;
      ctx.lineWidth = 2;
      for (let di = 0; di < 5; di++) {
        const da = dpRot + (Math.PI * 2 / 5) * di;
        ctx.beginPath();
        ctx.arc(m.x, m.y - 10, 150 + di * 20, da, da + Math.PI * 0.4);
        ctx.stroke();
      }
      ctx.fillStyle = `rgba(60,30,80,${dpAlpha * 0.1})`;
      ctx.beginPath(); ctx.arc(m.x, m.y - 10, 250, 0, Math.PI * 2); ctx.fill();
    }
    // Statue phase (Lord Sarugami) — invulnerable stone form
    if (m._statuePhase && m._statuePhase > 0) {
      const stPulse = 0.5 + 0.5 * Math.sin(renderTime * 0.05);
      ctx.fillStyle = `rgba(180,170,140,${0.2 + stPulse * 0.1})`;
      ctx.beginPath(); ctx.arc(m.x, m.y - 15, 40, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(200,190,160,${0.4 + stPulse * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(m.x, m.y - 15, 40, 0, Math.PI * 2); ctx.stroke();
    }
    // Orb sentinels (Lord Sarugami) — dark orbiting spheres
    if (m._orbSentinels && m._orbSentinels.length > 0) {
      for (const orb of m._orbSentinels) {
        const oPulse = 0.7 + 0.3 * Math.sin(renderTime * 0.08 + orb.x * 0.05);
        ctx.fillStyle = `rgba(40,20,60,${oPulse})`;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(100,50,140,${oPulse * 0.6})`;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, 7, 0, Math.PI * 2); ctx.fill();
        // Glow ring
        ctx.strokeStyle = `rgba(120,60,180,${oPulse * 0.4})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(orb.x, orb.y, 16, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // Orb bombs (Lord Sarugami) — dark orbs traveling to targets
    if (m._orbBombs && m._orbBombs.length > 0) {
      for (const bomb of m._orbBombs) {
        const bPulse = 0.5 + 0.5 * Math.sin(renderTime * 0.1 + bomb.x * 0.05);
        ctx.fillStyle = `rgba(60,20,80,${0.8 + bPulse * 0.2})`;
        ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(140,60,200,${bPulse * 0.5})`;
        ctx.beginPath(); ctx.arc(bomb.x, bomb.y, 6, 0, Math.PI * 2); ctx.fill();
        // Danger ring at target
        if (bomb.timer > 0 && bomb.timer <= 30) {
          const dangerA = (30 - bomb.timer) / 30;
          ctx.strokeStyle = `rgba(200,40,40,${dangerA * 0.6})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(bomb.targetX, bomb.targetY, 70, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }
  }

  // Katana swing effect (in world space)
  drawKatanaSwing(cx, cy);

  // Farm tiles (world space — tilled soil, crops, countdown bubble)
  if (typeof drawFarmTiles === 'function') drawFarmTiles();
  if (typeof drawFarmCountdownBubble === 'function') drawFarmCountdownBubble();

  // Fishing world effects (line, bobber, fish) — in world space
  if (typeof drawFishingWorldEffects === 'function') drawFishingWorldEffects();

  // Grab effect removed — mechanic still works, just no visual overlay

  // Godspeed while active — DRAMATIC Killua lightning aura + Kashimo ground strikes
  const _gsCenterDraw = godspeed._activator || player;
  if (godspeed.active && !_gsCenterDraw._isDead) {
    const gsp = godspeed.timer / godspeed.duration;
    const gt = renderTime;
    const gpx = _gsCenterDraw.x, gpy = _gsCenterDraw.y - 15;
    const gr = godspeed.range;
    const gPulse = 0.6 + 0.4 * Math.sin(gt * 0.01);
    
    // === SCREEN FLASH on activation (first few frames) ===
    if (godspeed.timer > godspeed.duration - 8) {
      const flashA = (godspeed.timer - (godspeed.duration - 8)) / 8;
      ctx.fillStyle = `rgba(220,235,255,${flashA * 0.2})`;
      ctx.fillRect(gpx - 400, gpy - 300, 800, 600);
    }
    
    // === KILLUA LIGHTNING AURA — MASSIVE crackling electricity ===
    // Large pulsing electric glow — white/light blue
    const glowR = 40 + Math.sin(gt * 0.015) * 8;
    ctx.fillStyle = `rgba(160,200,255,${0.18 * gsp * gPulse})`;
    ctx.beginPath(); ctx.arc(gpx, gpy, glowR + 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,225,255,${0.14 * gsp * gPulse})`;
    ctx.beginPath(); ctx.arc(gpx, gpy, glowR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(235,242,255,${0.1 * gsp})`;
    ctx.beginPath(); ctx.arc(gpx, gpy, glowR - 10, 0, Math.PI * 2); ctx.fill();
    
    // MASSIVE lightning bolts arcing off player — 14 bolts, long reach, thick
    for (let lb = 0; lb < 14; lb++) {
      const seed = lb * 4919 + Math.floor(gt / 30) * 2371;
      const pr = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
      
      const phase = ((gt / 25 + lb * 37) % 80) / 80;
      const lAlpha = Math.sin(phase * Math.PI);
      if (lAlpha < 0.1) continue;
      
      // Start from player body
      const startA = pr(1) * Math.PI * 2;
      const startR = 5 + pr(2) * 10;
      const sx = gpx + Math.cos(startA) * startR;
      const sy = gpy + Math.sin(startA) * startR;
      
      // End point — bolts reach FAR out
      const endA = startA + (pr(3) - 0.5) * 2.5;
      const endR = 40 + pr(4) * 55; // much longer reach
      const ex = gpx + Math.cos(endA) * endR;
      const ey = gpy + Math.sin(endA) * endR;
      
      // Main bolt — thick jagged
      const isWhite = lb % 4 === 0;
      const isPurple = lb % 5 === 0;
      let bR, bG, bB;
      if (isWhite) { bR = 245; bG = 248; bB = 255; }
      else if (isPurple) { bR = 200 + pr(20) * 40 | 0; bG = 220 + pr(21) * 30 | 0; bB = 255; }
      else { bR = 180 + pr(5) * 60 | 0; bG = 210 + pr(6) * 40 | 0; bB = 255; }
      
      ctx.strokeStyle = `rgba(${bR},${bG},${bB},${lAlpha * 0.9 * gsp})`;
      ctx.lineWidth = 2.5 + pr(7) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const jSegs = 4 + (pr(8) * 4 | 0);
      let prevJx = sx, prevJy = sy;
      for (let js = 1; js <= jSegs; js++) {
        const jt = js / jSegs;
        const jx = sx + (ex - sx) * jt + (pr(9 + js) - 0.5) * 28;
        const jy = sy + (ey - sy) * jt + (pr(12 + js) - 0.5) * 28;
        ctx.lineTo(jx, jy);
        
        // Branch bolts splitting off at each joint — like real lightning
        if (pr(16 + js) > 0.4) {
          const brA = Math.atan2(jy - prevJy, jx - prevJx) + (pr(20 + js) - 0.5) * 2;
          const brLen = 12 + pr(24 + js) * 25;
          ctx.moveTo(jx, jy);
          const bmx = jx + Math.cos(brA) * brLen * 0.5 + (pr(28 + js) - 0.5) * 12;
          const bmy = jy + Math.sin(brA) * brLen * 0.5 + (pr(32 + js) - 0.5) * 12;
          ctx.lineTo(bmx, bmy);
          ctx.lineTo(jx + Math.cos(brA) * brLen, jy + Math.sin(brA) * brLen);
          ctx.moveTo(jx, jy); // return to main path
        }
        prevJx = jx; prevJy = jy;
      }
      ctx.stroke();
      
      // Bright white core on main bolts
      if (lb % 2 === 0) {
        ctx.strokeStyle = `rgba(230,240,255,${lAlpha * 0.45 * gsp})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      
      // Spark at bolt tip
      ctx.fillStyle = `rgba(235,245,255,${lAlpha * 0.7 * gsp})`;
      ctx.beginPath(); ctx.arc(ex, ey, 2 + pr(15) * 3, 0, Math.PI * 2); ctx.fill();
    }
    
    // Extra spark particles floating around player
    for (let sp2 = 0; sp2 < 10; sp2++) {
      const spA = gt * 0.003 * (sp2 % 2 === 0 ? 1 : -1) + sp2 * 0.63;
      const spR = 15 + Math.sin(gt * 0.007 + sp2) * 20;
      const spx = gpx + Math.cos(spA) * spR;
      const spy = gpy + Math.sin(spA) * spR;
      const spAlpha = (Math.sin(gt * 0.012 + sp2 * 1.3) + 1) * 0.3;
      ctx.fillStyle = `rgba(${220 + Math.random() * 35 | 0},${230 + Math.random() * 25 | 0},255,${spAlpha * gsp})`;
      ctx.beginPath(); ctx.arc(spx, spy, 1 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    
    // === RADIUS — electric boundary with dramatic arcs ===
    // Double ring
    ctx.strokeStyle = `rgba(180,215,255,${0.3 * gsp * gPulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(gpx, gpy, gr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(160,200,245,${0.15 * gsp})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(gpx, gpy, gr * 0.92, 0, Math.PI * 2); ctx.stroke();
    
    // Big dramatic arcs along the circle — lightning crawling the perimeter
    for (let ea = 0; ea < 16; ea++) {
      const eAngle = ea * Math.PI / 8 + gt * 0.003;
      const ePhase = ((gt / 40 + ea * 23) % 80) / 80;
      const eA = Math.sin(ePhase * Math.PI);
      if (eA < 0.15) continue;
      
      const arcSpan = 0.2 + Math.random() * 0.15;
      ctx.strokeStyle = `rgba(${190 + Math.random() * 60 | 0},${215 + Math.random() * 40 | 0},255,${eA * 0.7 * gsp})`;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      const arcSegs = 3 + (Math.random() * 3 | 0);
      for (let as = 0; as <= arcSegs; as++) {
        const at = eAngle + arcSpan * (as / arcSegs);
        const ar = gr + (Math.random() - 0.5) * 18;
        const ax = gpx + Math.cos(at) * ar;
        const ay = gpy + Math.sin(at) * ar;
        if (as === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
    }
    
    // === AMBIENT GROUND LIGHTNING — Kashimo style bolts erupting from ground ===
    for (let gl = 0; gl < 16; gl++) {
      const seed2 = gl * 6131 + Math.floor(gt / 40) * 4513;
      const pr2 = (n) => { const x = Math.sin(seed2 * n) * 43758.5453; return x - Math.floor(x); };
      
      const gPhase = ((gt / 40 + gl * 27) % 90) / 90;
      const gA2 = Math.sin(gPhase * Math.PI);
      if (gA2 < 0.1) continue;
      
      const ga = pr2(1) * Math.PI * 2;
      const gd = pr2(2) * gr * 0.85;
      const gx = gpx + Math.cos(ga) * gd;
      const gy = gpy + Math.sin(ga) * gd;
      
      // Tall bolt shooting up from ground
      const bHeight = 35 + pr2(3) * 50;
      const isW = gl % 4 === 0;
      const isP = gl % 5 === 0;
      
      // Main upward bolt
      ctx.strokeStyle = isW ? `rgba(240,245,255,${gA2 * 0.8 * gsp})`
        : isP ? `rgba(210,225,255,${gA2 * 0.7 * gsp})`
        : `rgba(${180 + pr2(4) * 60 | 0},${210 + pr2(5) * 40 | 0},255,${gA2 * 0.8 * gsp})`;
      ctx.lineWidth = 2 + pr2(6) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy + 5);
      let blx2 = gx;
      for (let bs = 1; bs <= 5; bs++) {
        blx2 = gx + (pr2(7 + bs) - 0.5) * 25;
        ctx.lineTo(blx2, gy + 5 - bHeight * (bs / 5));
      }
      ctx.stroke();
      
      // Branch from the bolt
      if (pr2(13) > 0.3) {
        const brY2 = gy + 5 - bHeight * 0.5;
        const brA2 = (pr2(14) - 0.5) * 2;
        const brL = 15 + pr2(15) * 20;
        ctx.strokeStyle = `rgba(${200 + pr2(16) * 50 | 0},${220 + pr2(17) * 30 | 0},255,${gA2 * 0.5 * gsp})`;
        ctx.lineWidth = 1 + pr2(18);
        ctx.beginPath();
        ctx.moveTo(gx + (pr2(19) - 0.5) * 10, brY2);
        ctx.lineTo(gx + Math.cos(brA2) * brL, brY2 + Math.sin(brA2) * brL * 0.5 - 8);
        ctx.stroke();
      }
      
      // Ground spark — bright flash
      ctx.fillStyle = `rgba(220,238,255,${gA2 * 0.6 * gsp})`;
      ctx.beginPath(); ctx.arc(gx, gy + 5, 4 + pr2(20) * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(245,250,255,${gA2 * 0.4 * gsp})`;
      ctx.beginPath(); ctx.arc(gx, gy + 5, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Malevolent Shrine while active — domain seal + slashes
  const _shrineCenterDraw = shrine._activator || player;
  if (shrine.active && !_shrineCenterDraw._isDead) {
    const sp = shrine.timer / shrine.duration; // 1 → 0
    const sr = shrine.range;
    const cx3 = _shrineCenterDraw.x, cy3 = _shrineCenterDraw.y - 15;
    const pulse = 0.6 + 0.3 * Math.sin(renderTime * 0.006);
    const rot = renderTime * 0.0008; // slow rotation
    
    // === DOMAIN SEAL ON GROUND ===
    // Outer crimson circle
    ctx.strokeStyle = `rgba(180,20,20,${0.45 * sp * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx3, cy3, sr, 0, Math.PI * 2); ctx.stroke();
    // Second inner ring
    ctx.strokeStyle = `rgba(140,10,10,${0.35 * sp * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx3, cy3, sr * 0.88, 0, Math.PI * 2); ctx.stroke();
    // Inner circle
    ctx.strokeStyle = `rgba(160,15,15,${0.3 * sp * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx3, cy3, sr * 0.35, 0, Math.PI * 2); ctx.stroke();
    
    // Triskelion / three-eye symbol (like the uploaded image) — rotating slowly
    ctx.save();
    ctx.translate(cx3, cy3);
    ctx.rotate(rot);
    
    // Three curved blades/petals
    for (let p = 0; p < 3; p++) {
      const pa = p * Math.PI * 2 / 3;
      ctx.save();
      ctx.rotate(pa);
      
      // Curved blade shape — teardrop/eye petal
      ctx.strokeStyle = `rgba(150,15,15,${0.35 * sp * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.bezierCurveTo(25, -22, 45, -15, 50, 0);
      ctx.bezierCurveTo(45, 15, 25, 22, 0, 8);
      ctx.stroke();
      
      // Glowing red eye in center of each petal
      const eyeX = 28, eyeY = 0;
      ctx.fillStyle = `rgba(255,20,20,${0.3 * sp * pulse})`;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,50,30,${0.5 * sp * pulse})`;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2); ctx.fill();
      // Bright core
      ctx.fillStyle = `rgba(255,100,80,${0.6 * sp * pulse})`;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2); ctx.fill();
      
      // Red veins/cracks from eye
      ctx.strokeStyle = `rgba(200,20,10,${0.25 * sp * pulse})`;
      ctx.lineWidth = 0.8;
      for (let v = 0; v < 4; v++) {
        const va = (v / 4) * Math.PI * 2 + renderTime * 0.001;
        const vLen = 6 + Math.sin(renderTime * 0.003 + v) * 3;
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.lineTo(eyeX + Math.cos(va) * vLen, eyeY + Math.sin(va) * vLen);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Connecting lines between petals — triangle
    ctx.strokeStyle = `rgba(120,10,10,${0.25 * sp * pulse})`;
    ctx.lineWidth = 1;
    for (let l = 0; l < 3; l++) {
      const la1 = l * Math.PI * 2 / 3;
      const la2 = (l + 1) * Math.PI * 2 / 3;
      const lr = sr * 0.55;
      ctx.beginPath();
      ctx.moveTo(Math.cos(la1) * lr, Math.sin(la1) * lr);
      ctx.lineTo(Math.cos(la2) * lr, Math.sin(la2) * lr);
      ctx.stroke();
    }
    
    // Outer rune marks around the circle
    for (let rm = 0; rm < 12; rm++) {
      const ra = rm * Math.PI / 6 + rot * 0.5;
      const rr = sr * 0.92;
      const rl = 8 + Math.sin(renderTime * 0.004 + rm) * 3;
      ctx.strokeStyle = `rgba(160,15,15,${0.3 * sp * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * (rr - rl), Math.sin(ra) * (rr - rl));
      ctx.lineTo(Math.cos(ra) * (rr + rl), Math.sin(ra) * (rr + rl));
      ctx.stroke();
    }
    
    ctx.restore();
    
    // === SLASHES FILLING THE RADIUS ===
    
    // HEAVY animated slashes filling the entire shrine radius
    const t = renderTime;
    
    // 30 slashes filling the zone — constantly cycling, cutting through everything
    for (let ss = 0; ss < 30; ss++) {
      const seed = ss * 7919;
      const pseudoRand = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
      
      // Each slash cycles independently
      const cycleDuration = 200 + pseudoRand(1) * 250;
      const offset = pseudoRand(2) * cycleDuration;
      const phase = ((t + offset) % cycleDuration) / cycleDuration;
      
      // Position anywhere in the circle
      const pAngle = pseudoRand(3) * Math.PI * 2 + t * 0.0003 * (ss % 2 === 0 ? 1 : -1);
      const pDist = pseudoRand(4) * sr * 0.9;
      const baseX = cx3 + Math.cos(pAngle) * pDist;
      const baseY = cy3 + Math.sin(pAngle) * pDist;
      
      // Slash sweeps across its position
      const sAng = pseudoRand(5) * Math.PI + ss * 0.4;
      const sLen = 30 + pseudoRand(6) * 45; // big slashes
      const sweepDist = 30;
      const sweepOffset = (phase - 0.5) * sweepDist * 2;
      const sx = baseX + Math.cos(sAng + Math.PI / 2) * sweepOffset;
      const sy = baseY + Math.sin(sAng + Math.PI / 2) * sweepOffset;
      
      const sAlpha = Math.sin(phase * Math.PI);
      if (sAlpha < 0.05) continue;
      
      // Color — black, blackish-red, crimson, blood red
      const colorType = ss % 4;
      let r2, g2, b2;
      if (colorType === 0) { r2 = 15 + pseudoRand(30) * 25 | 0; g2 = 0; b2 = 0; }
      else if (colorType === 1) { r2 = 160 + pseudoRand(31) * 80 | 0; g2 = 0; b2 = 0; }
      else if (colorType === 2) { r2 = 55 + pseudoRand(32) * 50 | 0; g2 = 0; b2 = pseudoRand(33) * 8 | 0; }
      else { r2 = 200 + pseudoRand(34) * 55 | 0; g2 = 10 + pseudoRand(35) * 25 | 0; b2 = 10; }
      
      // Main cut line
      ctx.strokeStyle = `rgba(${r2},${g2},${b2},${sAlpha * 0.9 * sp})`;
      ctx.lineWidth = 3 + pseudoRand(7) * 3;
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(sAng) * sLen, sy - Math.sin(sAng) * sLen);
      ctx.lineTo(sx + Math.cos(sAng) * sLen, sy + Math.sin(sAng) * sLen);
      ctx.stroke();
      
      // Inner wound
      const cR = Math.min(255, r2 + 70);
      ctx.strokeStyle = `rgba(${cR},${g2 + 30},${b2 + 15},${sAlpha * 0.4 * sp})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(sAng) * sLen * 0.65, sy - Math.sin(sAng) * sLen * 0.65);
      ctx.lineTo(sx + Math.cos(sAng) * sLen * 0.65, sy + Math.sin(sAng) * sLen * 0.65);
      ctx.stroke();
      
      // Cross-cut every other slash
      if (ss % 2 === 0) {
        const xAng = sAng + Math.PI / 2 + (pseudoRand(10) - 0.5) * 0.5;
        const xLen = sLen * 0.5;
        ctx.strokeStyle = `rgba(${r2 * 0.7 | 0},0,0,${sAlpha * 0.55 * sp})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - Math.cos(xAng) * xLen, sy - Math.sin(xAng) * xLen);
        ctx.lineTo(sx + Math.cos(xAng) * xLen, sy + Math.sin(xAng) * xLen);
        ctx.stroke();
      }
      
      // Blood spray
      if (phase > 0.15 && phase < 0.85 && ss % 3 === 0) {
        const sprayDir = sAng + Math.PI / 2 * (phase > 0.5 ? 1 : -1);
        for (let bd = 0; bd < 4; bd++) {
          const bAng = sprayDir + (pseudoRand(11 + bd) - 0.5) * 1.4;
          const bDist = pseudoRand(14 + bd) * sAlpha * 18 + 4;
          const bx = sx + Math.cos(bAng) * bDist;
          const by = sy + Math.sin(bAng) * bDist;
          const br2 = (bd + ss) % 3 === 0 ? 20 + pseudoRand(17 + bd) * 30 | 0 : 140 + pseudoRand(17 + bd) * 80 | 0;
          ctx.fillStyle = `rgba(${br2},0,0,${sAlpha * 0.65 * sp})`;
          ctx.beginPath(); ctx.arc(bx, by, 1.5 + pseudoRand(20 + bd) * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      
      // Wound scars lingering
      if (phase > 0.6) {
        const wA = (1 - phase) / 0.4;
        const wR = ss % 2 === 0 ? 20 : 90;
        ctx.strokeStyle = `rgba(${wR},0,0,${wA * 0.4 * sp})`;
        ctx.lineWidth = 1.5;
        const wX = baseX + (pseudoRand(22) - 0.5) * 20;
        const wY = baseY + (pseudoRand(23) - 0.5) * 20;
        ctx.beginPath();
        ctx.moveTo(wX - Math.cos(sAng) * sLen * 0.35, wY - Math.sin(sAng) * sLen * 0.35);
        ctx.lineTo(wX + Math.cos(sAng) * sLen * 0.35, wY + Math.sin(sAng) * sLen * 0.35);
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  // Blind vignette overlay — black edges, clear center
  if (typeof StatusFX !== 'undefined' && StatusFX.playerEffects._blind && !playerDead) {
    ctx.save();
    const isFlash = StatusFX.playerEffects._blindMode === 'flash';
    const r = isFlash ? 255 : 0, g = isFlash ? 255 : 0, b = isFlash ? 255 : 0;
    const grad = ctx.createRadialGradient(BASE_W / 2, BASE_H / 2, 80, BASE_W / 2, BASE_H / 2, BASE_W * 0.45);
    grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
    grad.addColorStop(0.4, `rgba(${r},${g},${b},0.3)`);
    grad.addColorStop(0.7, `rgba(${r},${g},${b},0.75)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0.95)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.restore();
  }

  // Poison screen overlay
  // Poison glow on player only
  if (poisonTimer > 0 && !playerDead) {
    ctx.save();
    ctx.translate(-cx, -cy);
    const pGlow = 0.2 + 0.1 * Math.sin(renderTime * 0.008);
    ctx.fillStyle = `rgba(60,200,30,${pGlow})`;
    ctx.beginPath(); ctx.arc(player.x, player.y - 15, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Generic interactable prompt (world-space, above console)
  if (Scene.inSkeld) {
    const _nearI = getNearestInteractable();
    if (_nearI && (_nearI.type === 'skeld_task' || _nearI.type === 'skeld_sabotage' || _nearI.type === 'skeld_vent') && !UI.anyOpen()) {
      ctx.save();
      ctx.translate(-cx, -cy);
      const isSab = _nearI.type === 'skeld_sabotage';
      const isVent = _nearI.type === 'skeld_vent';
      const px = _nearI.x, py = _nearI.y - 28;
      const txt = _nearI.label;
      ctx.font = 'bold 12px monospace';
      const tw = ctx.measureText(txt).width;
      // Background pill
      ctx.fillStyle = isSab ? 'rgba(60,10,10,0.85)' : isVent ? 'rgba(10,20,10,0.85)' : 'rgba(10,30,40,0.85)';
      const pad = 6;
      ctx.beginPath();
      ctx.roundRect(px - tw / 2 - pad, py - 8 - pad, tw + pad * 2, 16 + pad, 4);
      ctx.fill();
      // Border
      ctx.strokeStyle = isSab ? 'rgba(255,60,30,0.6)' : isVent ? 'rgba(40,255,80,0.6)' : 'rgba(0,220,240,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Text
      ctx.textAlign = 'center';
      ctx.fillStyle = isSab ? '#ff8060' : isVent ? '#40ff80' : '#80f0ff';
      ctx.fillText(txt, px, py + 2);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  // Mafia lobby interactable prompts
  if (Scene.inMafiaLobby) {
    const _nearI = getNearestInteractable();
    if (_nearI && _nearI.type && _nearI.type.startsWith('mafia_lobby_') && !UI.anyOpen() && typeof isMafiaLobbyPanelOpen === 'function' && !isMafiaLobbyPanelOpen()) {
      ctx.save();
      ctx.translate(-cx, -cy);
      const px = _nearI.x, py = _nearI.y - 28;
      const txt = _nearI.label;
      ctx.font = 'bold 12px monospace';
      const tw = ctx.measureText(txt).width;
      const pad = 6;
      ctx.fillStyle = 'rgba(10,20,40,0.85)';
      ctx.beginPath();
      ctx.roundRect(px - tw / 2 - pad, py - 8 - pad, tw + pad * 2, 16 + pad, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(100,180,255,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#80c0ff';
      ctx.fillText(txt, px, py + 2);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  // End world-space zoom — everything below is screen-space HUD/UI at native 1920x1080
  ctx.restore();

  // Hide & Seek FOV mask (screen-space, covers world)
  if (typeof drawHideSeekFOV === 'function') drawHideSeekFOV();
  // Mafia FOV mask (screen-space, covers world)
  if (typeof drawMafiaFOV === 'function') drawMafiaFOV();

  // HUD (screen space)
  if (typeof drawHideSeekHUD === 'function') drawHideSeekHUD();
  if (typeof drawMafiaHUD === 'function') drawMafiaHUD();
  if (typeof drawMafiaLobbyHUD === 'function') drawMafiaLobbyHUD();
  if (!Scene.inSkeld && !Scene.inMafiaLobby && !Scene.inCasino && showWeaponStats && activeSlot === 0) { try { drawGunHUD(); } catch(e) { console.error("gunHUD err:", e); } }
  if (!Scene.inSkeld && !Scene.inMafiaLobby && !Scene.inCasino && showWeaponStats && activeSlot === 1) { try { drawMeleeHUD(); } catch(e) { console.error("meleeHUD err:", e); } }
  if (!Scene.inSkeld && !Scene.inMafiaLobby && !Scene.inCasino) drawHotbar();
  if (typeof drawCookingHUD === 'function') drawCookingHUD();
  if (typeof drawFishingHUD === 'function') drawFishingHUD();
  if (typeof drawFishVendorPanel === 'function') drawFishVendorPanel();
  if (typeof drawFarmingHUD === 'function') drawFarmingHUD();
  if (typeof drawFarmVendorPanel === 'function') drawFarmVendorPanel();
  if (typeof drawGunsmithPanel === 'function') drawGunsmithPanel();
  if (typeof drawMiningShopPanel === 'function') drawMiningShopPanel();
  if (typeof drawCasinoPanel === 'function') drawCasinoPanel();
  if (typeof SparState !== 'undefined' && Scene.inSpar && SparState.phase !== 'idle' && SparState.phase !== 'hub') drawSparHUD();
  if (typeof CameraSystem !== 'undefined' && CameraSystem.isActive()) CameraSystem.drawOverlay();
  if (typeof drawSkeldTaskPanel === 'function') drawSkeldTaskPanel();
  if (typeof drawSkeldTaskList === 'function') drawSkeldTaskList();
  if (typeof drawVentHUD === 'function') drawVentHUD();

  // (Skeld task progress bar moved below HP bar)

  // Malevolent Shrine charge bar (only when War Cleaver equipped)
  if (melee.special === 'cleave' && Scene.inDungeon) {
    const barW = 120, barH = 12;
    const barX = BASE_W / 2 - barW / 2, barY = BASE_H - 90;
    const pct = shrine.active ? (shrine.timer / shrine.duration) : (shrine.charges / shrine.chargesMax);
    const ready = shrine.charges >= shrine.chargesMax && !shrine.active;
    
    // Background
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4); ctx.fill();
    
    // Fill bar
    if (shrine.active) {
      ctx.fillStyle = `rgba(255,30,30,${0.6 + 0.3 * Math.sin(renderTime * 0.01)})`;
    } else if (ready) {
      ctx.fillStyle = `rgba(255,40,40,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
    } else {
      ctx.fillStyle = "rgba(180,30,30,0.6)";
    }
    ctx.beginPath(); ctx.roundRect(barX, barY, barW * pct, barH, 3); ctx.fill();
    
    // Border
    ctx.strokeStyle = ready ? "rgba(255,60,60,0.8)" : "rgba(120,30,30,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3); ctx.stroke();
    
    // Label
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    if (shrine.active) {
      ctx.fillStyle = "#ff4040";
      ctx.fillText("⛩ MALEVOLENT SHRINE ⛩", barX + barW / 2, barY - 4);
    } else if (ready) {
      ctx.fillStyle = `rgba(255,80,80,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
      ctx.fillText("⛩ PRESS F — SHRINE READY ⛩", barX + barW / 2, barY - 4);
    } else {
      ctx.fillStyle = "#884444";
      ctx.fillText("⛩ " + shrine.charges + "/" + shrine.chargesMax, barX + barW / 2, barY - 4);
    }
    ctx.textAlign = "left";
  }
  // Godspeed charge bar (only when Storm Blade equipped)
  if (melee.special === 'storm' && Scene.inDungeon) {
    const gBarW = 120, gBarH = 12;
    const gBarX = BASE_W / 2 - gBarW / 2, gBarY = BASE_H - 90;
    const gPct = godspeed.active ? (godspeed.timer / godspeed.duration) : (godspeed.charges / godspeed.chargesMax);
    const gReady = godspeed.charges >= godspeed.chargesMax && !godspeed.active;
    
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.roundRect(gBarX - 2, gBarY - 2, gBarW + 4, gBarH + 4, 4); ctx.fill();
    
    if (godspeed.active) {
      ctx.fillStyle = `rgba(180,220,255,${0.6 + 0.3 * Math.sin(renderTime * 0.01)})`;
    } else if (gReady) {
      ctx.fillStyle = `rgba(200,230,255,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
    } else {
      ctx.fillStyle = "rgba(140,180,220,0.6)";
    }
    ctx.beginPath(); ctx.roundRect(gBarX, gBarY, gBarW * gPct, gBarH, 3); ctx.fill();
    
    ctx.strokeStyle = gReady ? "rgba(100,180,255,0.8)" : "rgba(40,80,140,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(gBarX, gBarY, gBarW, gBarH, 3); ctx.stroke();
    
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    if (godspeed.active) {
      ctx.fillStyle = "#d0e8ff";
      ctx.fillText("⚡ GODSPEED ⚡", gBarX + gBarW / 2, gBarY - 4);
    } else if (gReady) {
      ctx.fillStyle = `rgba(210,235,255,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
      ctx.fillText("⚡ PRESS F — GODSPEED ⚡", gBarX + gBarW / 2, gBarY - 4);
    } else {
      ctx.fillStyle = "#8aabbf";
      ctx.fillText("⚡ " + godspeed.charges + "/" + godspeed.chargesMax, gBarX + gBarW / 2, gBarY - 4);
    }
    ctx.textAlign = "left";
  }
  // Ninja Dash HUD — cooldown bar + dash charges
  if (melee.special === 'ninja' && Scene.inDungeon) {
    const nBarW = 120, nBarH = 8;
    const nBarX = BASE_W / 2 - nBarW / 2, nBarY = BASE_H - 90;
    ctx.fillStyle = "rgba(10,8,20,0.7)";
    ctx.beginPath(); ctx.roundRect(nBarX - 2, nBarY - 2, nBarW + 4, nBarH + 4, 4); ctx.fill();
    const onCooldown = melee.dashCooldown > 0;
    const dashReady = melee.dashCooldown <= 0 && !melee.dashActive;
    if (melee.dashActive) {
      const totalDashes = 3;
      const segW = (nBarW - 4) / totalDashes;
      for (let d = 0; d < totalDashes; d++) {
        const sx = nBarX + 2 + d * segW;
        const hasCharge = d < melee.dashesLeft + (melee.dashing ? 1 : 0);
        ctx.fillStyle = hasCharge ? "rgba(120,60,180,0.9)" : "rgba(40,20,60,0.5)";
        ctx.beginPath(); ctx.roundRect(sx, nBarY, segW - 2, nBarH, 2); ctx.fill();
      }
    } else if (onCooldown) {
      const pct = 1 - (melee.dashCooldown / melee.dashCooldownMax);
      ctx.fillStyle = "rgba(40,25,60,0.6)";
      ctx.beginPath(); ctx.roundRect(nBarX, nBarY, nBarW * pct, nBarH, 3); ctx.fill();
    } else {
      const pulse = 0.7 + 0.3 * Math.sin(renderTime * 0.006);
      ctx.fillStyle = `rgba(120,60,180,${pulse})`;
      ctx.beginPath(); ctx.roundRect(nBarX, nBarY, nBarW, nBarH, 3); ctx.fill();
    }
    ctx.strokeStyle = melee.dashActive ? "rgba(160,80,220,0.7)" : "rgba(80,50,120,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(nBarX, nBarY, nBarW, nBarH, 3); ctx.stroke();
    ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
    if (melee.dashActive) {
      ctx.fillStyle = melee.dashing ? "#e0b0ff" : `rgba(210,160,250,${0.7 + 0.3 * Math.sin(renderTime * 0.01)})`;
      const dLeft = melee.dashesLeft + (melee.dashing ? 0 : 0);
      ctx.fillText("\u{1F5E1} SLASH x" + dLeft + " \u{1F5E1}", nBarX + nBarW / 2, nBarY - 4);
    } else if (dashReady) {
      ctx.fillStyle = `rgba(200,160,240,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
      ctx.fillText("\u{1F5E1} SHIFT \u2014 DASH \u{1F5E1}", nBarX + nBarW / 2, nBarY - 4);
    } else {
      ctx.fillStyle = "#8060a0";
      ctx.fillText("\u{1F5E1} " + Math.ceil(melee.dashCooldown / 60) + "s", nBarX + nBarW / 2, nBarY - 4);
    }
    ctx.textAlign = "left";
  }
  drawChatIcon();
  if (!Scene.inSkeld && !Scene.inMafiaLobby) {
    drawProfileIcon();
    drawMapIcon();
    drawToolboxIcon();
    drawSelectedToolbar();
  }
  // Mafia settings gear (top-right, Skeld only)
  if (Scene.inSkeld && typeof drawMafiaSettingsIcon === 'function') drawMafiaSettingsIcon();
  if (Scene.inSkeld && typeof drawMafiaSettingsPanel === 'function') drawMafiaSettingsPanel();
  drawChatPanel();
  if (!Scene.inSkeld && !Scene.inMafiaLobby) {
    drawProfilePanel();
    drawShopPanel();
    drawIdentityPanel();
    drawStatsPanel();
    drawToolboxPanel();
    drawModifyGunPanel();
    if (typeof drawTestMobPanel === 'function') drawTestMobPanel();
  }
  if (typeof drawSettingsPanel === 'function') drawSettingsPanel();

  // Placement preview (draw after panels so it shows under them)
  if (activePlaceTool && !UI.isOpen('toolbox')) {
    drawPlacementPreview(cx, cy);
  }

  // ===== PLAYER HP BAR (top center) — hidden in Skeld & Casino =====
  if (Scene.inCasino) {
    // Show gold balance instead of HP bar
    const balW = 260, balH = 32;
    const balX = BASE_W / 2 - balW / 2, balY = 12;
    ctx.fillStyle = 'rgba(13,27,42,0.9)';
    ctx.beginPath(); ctx.roundRect(balX, balY, balW, balH, 8); ctx.fill();
    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(balX, balY, balW, balH, 8); ctx.stroke();
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('\u2B25 ' + gold + 'g', BASE_W / 2, balY + 23);
    ctx.textAlign = 'left';
  } else if (Scene.inSkeld) { /* skip HP bar */ } else {
  const hpBarW = 360, hpBarH = 24;
  const hpBarX = BASE_W / 2 - hpBarW / 2;
  const hpBarY = 16;
  // Always show bar as percentage of maxHp, but display as "HP / 100" style
  const displayHp = Math.max(0, player.hp);
  const displayMax = player.maxHp || 100;
  const hpPct = Math.max(0, Math.min(1, displayHp / displayMax));

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.roundRect(hpBarX - 6, hpBarY - 6, hpBarW + 12, hpBarH + 12, 6);
  ctx.fill();

  // Bar track
  ctx.fillStyle = "rgba(255,0,0,0.15)";
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

  // HP fill
  if (hpPct > 0.5) ctx.fillStyle = "#e22";
  else if (hpPct > 0.25) ctx.fillStyle = "#e80";
  else ctx.fillStyle = "#f44";
  if (hpPct <= 0.25 && Math.floor(renderTime / 300) % 2 === 0) ctx.fillStyle = "#f66";
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

  // HP text
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(displayHp + " / " + displayMax, BASE_W / 2, hpBarY + 19);

  // Lives display (big hearts to the left of HP bar) — dungeon only
  if (Scene.inDungeon) {
    ctx.textAlign = "left";
    for (let i = 0; i < 3; i++) {
      ctx.font = "30px monospace";
      ctx.fillStyle = i < lives ? "#e33" : "#333";
      ctx.fillText("♥", hpBarX - 110 + i * 32, hpBarY + 22);
    }
  }

  } // end HP bar skip for Skeld

  // Dungeon Level indicator in hub areas
  if ((Scene.inCave || Scene.inAzurine || Scene.inVortalis || Scene.inEarth205 || Scene.inWagashi || Scene.inEarth216) && typeof getDungeonLevel === 'function') {
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Dungeon Lv.' + getDungeonLevel(), BASE_W - 16, 32);
    ctx.textAlign = 'left';
  }

  // ===== WAVE HUD (below HP bar) — dungeon only =====
  if (Scene.inDungeon) {
  ctx.textAlign = "center";
  const waveY = 56;
  const globalWave = (dungeonFloor - 1) * WAVES_PER_FLOOR + wave;
  const totalWaves = getDungeonMaxFloors() * WAVES_PER_FLOOR;
  const floorStartWave = (dungeonFloor - 1) * WAVES_PER_FLOOR;

  // Floor indicator (top center)
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "#b090e0";
  ctx.fillText("FLOOR " + dungeonFloor + " / " + getDungeonMaxFloors(), BASE_W / 2, waveY);

  // Wave number
  ctx.font = "bold 30px monospace";
  if (dungeonComplete && stairsOpen) {
    ctx.fillStyle = "#ffd700";
    ctx.fillText("🏆 DUNGEON COMPLETE!", BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText("All " + totalWaves + " waves cleared! Find the exit!", BASE_W / 2, waveY + 50);
  } else if (stairsOpen) {
    ctx.fillStyle = "#b080ff";
    ctx.fillText("FLOOR CLEAR!", BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Find the staircase", BASE_W / 2, waveY + 50);
  } else if (waveState === "revive_shop") {
    const sec = Math.ceil(waveTimer / 60);
    ctx.fillStyle = "#fa0";
    ctx.fillText("REVIVE SHOP — " + sec + "s", BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("[G] Skip  •  Click panel to revive", BASE_W / 2, waveY + 50);
  } else if (waveState === "cleared") {
    const sec = Math.ceil(waveTimer / 60);
    ctx.fillStyle = "#fa0";
    ctx.fillText("NEXT WAVE IN " + sec, BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("[G] Skip  •  [" + getKeyDisplayName(keybinds.interact) + "] Shop  •  Wave " + globalWave + "/" + totalWaves, BASE_W / 2, waveY + 50);
  } else if (waveState === "active") {
    const isBoss = wave % 10 === 0 && wave >= 10;
    ctx.fillStyle = isBoss ? "#ff4444" : "#fff";
    ctx.fillText("WAVE " + globalWave + "/" + totalWaves, BASE_W / 2, waveY + 30);
    // Theme name
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = isBoss ? "#ff6666" : "#fa0";
    ctx.fillText(waveTheme, BASE_W / 2, waveY + 46);
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText(mobs.filter(m => m.hp > 0).length + " remaining", BASE_W / 2, waveY + 62);
  } else {
    const sec2 = Math.ceil((1800 - waveTimer) / 60);
    ctx.fillStyle = "#888";
    ctx.fillText("GET READY... " + sec2, BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("[G] Skip  •  [" + getKeyDisplayName(keybinds.interact) + "] Shop", BASE_W / 2, waveY + 50);
  }

  // Kills (top right area)
  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText("KILLS", BASE_W - 24, 30);
  ctx.font = "bold 32px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText(kills.toString(), BASE_W - 24, 62);

  ctx.textAlign = "left";

  // ===== PARTY HUD — member status panel =====
  if (PartyState.members.length > 1 && Scene.inDungeon) {
    const _phX = 10, _phY = 140;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    for (let _pi = 0; _pi < PartyState.members.length; _pi++) {
      const _pm = PartyState.members[_pi];
      const _py = _phY + _pi * 28;
      // Background
      ctx.fillStyle = _pm.dead ? 'rgba(80,20,20,0.6)' : 'rgba(0,0,0,0.5)';
      ctx.fillRect(_phX, _py, 130, 24);
      // Name
      ctx.fillStyle = _pm.dead ? '#ff4444' : '#fff';
      ctx.fillText(_pm.name, _phX + 4, _py + 11);
      // HP bar
      if (!_pm.dead) {
        const _hpFrac = Math.max(0, _pm.entity.hp / _pm.entity.maxHp);
        ctx.fillStyle = '#333';
        ctx.fillRect(_phX + 4, _py + 14, 100, 6);
        ctx.fillStyle = _hpFrac > 0.5 ? '#4a4' : _hpFrac > 0.25 ? '#aa4' : '#a44';
        ctx.fillRect(_phX + 4, _py + 14, Math.round(100 * _hpFrac), 6);
      } else {
        ctx.fillStyle = '#666';
        ctx.font = "9px monospace";
        ctx.fillText(_pm.lives > 0 ? 'DEAD (lives: ' + _pm.lives + ')' : 'ELIMINATED', _phX + 4, _py + 20);
        ctx.font = "bold 11px monospace";
      }
      // Gold + Lives
      const _pmGold = _pm.controlType === 'local' ? gold : _pm.gold;
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(_pmGold + 'g', _phX + 70, _py + 11);
      ctx.fillStyle = '#aaa';
      ctx.fillText('x' + _pm.lives, _phX + 115, _py + 11);
      // Equipment tier dots (gun, melee, chest, boots — colored by tier)
      if (!_pm.dead && _pm.controlType === 'bot') {
        const _eqSlots = [
          _pm.gun ? (_pm.gun.tier || 0) : 0,
          _pm.melee ? (_pm.melee.tier || 0) : 0,
          _pm.equip.chest ? (_pm.equip.chest.tier || 0) : 0,
          _pm.equip.boots ? (_pm.equip.boots.tier || 0) : 0,
        ];
        const _tierColors = ['#555', '#8b6914', '#888', '#d4af37', '#c850c0'];
        for (let _ei = 0; _ei < 4; _ei++) {
          ctx.fillStyle = _tierColors[_eqSlots[_ei]] || '#555';
          ctx.fillRect(_phX + 108 + _ei * 6, _py + 14, 4, 6);
        }
      }
    }
  }

  // ===== SPECTATOR OVERLAY =====
  if (PartyState.members.length > 1 && playerDead && !PartySystem.allDead() && Scene.inDungeon) {
    // Dim screen edges
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, BASE_W, 40);
    ctx.fillRect(0, BASE_H - 30, BASE_W, 30);
    // Spectating text
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    const _specName = PartyState.spectateTarget ? (PartyState.spectateTarget.name || 'Bot') : 'Bot';
    ctx.fillText('Spectating ' + _specName, BASE_W / 2, BASE_H - 10);
    ctx.textAlign = "left";
  }

  // ===== REVIVE SHOP OVERLAY =====
  if (PartyState.members.length > 1 && waveState === 'revive_shop' && Scene.inDungeon) {
    const _rsW = 300, _rsH = 200;
    const _rsX = (BASE_W - _rsW) / 2, _rsY = (BASE_H - _rsH) / 2 - 30;
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(_rsX, _rsY, _rsW, _rsH);
    ctx.strokeStyle = '#fa0';
    ctx.lineWidth = 2;
    ctx.strokeRect(_rsX, _rsY, _rsW, _rsH);
    // Title
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = '#fa0';
    ctx.fillText('REVIVE SHOP', BASE_W / 2, _rsY + 24);
    // List dead members
    ctx.font = "bold 13px monospace";
    let _rsRow = 0;
    for (const _pm of PartyState.members) {
      if (!_pm.dead || _pm.lives <= 0) continue;
      const _ry = _rsY + 50 + _rsRow * 40;
      const _cost = PARTY_CONFIG.REVIVE_BASE_COST * dungeonFloor;
      const _pmGold2 = _pm.controlType === 'local' ? gold : _pm.gold;
      const _canAfford = _pmGold2 >= _cost;
      ctx.fillStyle = '#fff';
      ctx.textAlign = "left";
      ctx.fillText(_pm.name, _rsX + 20, _ry + 12);
      ctx.fillStyle = _canAfford ? '#4f4' : '#f44';
      ctx.textAlign = "right";
      ctx.fillText('Revive - ' + _cost + 'g', _rsX + _rsW - 20, _ry + 12);
      _rsRow++;
    }
    if (_rsRow === 0) {
      ctx.fillStyle = '#888';
      ctx.textAlign = "center";
      ctx.fillText('No one to revive', BASE_W / 2, _rsY + 70);
    }
    // Timer
    const _shopSec = Math.ceil(waveTimer / 60);
    ctx.fillStyle = '#aaa';
    ctx.textAlign = "center";
    ctx.font = "12px monospace";
    ctx.fillText('Auto-continue in ' + _shopSec + 's  |  [G] Skip', BASE_W / 2, _rsY + _rsH - 12);
    ctx.textAlign = "left";
  }

  } // end dungeon HUD

  // ===== DEBUG FLAGS HUD — shows active dev tool indicators =====
  {
    const flags = [];
    if (window._mobsFrozen)  flags.push({ label: 'FROZEN',  color: '#00e5ff' });
    if (window._godMode)     flags.push({ label: 'GOD',     color: '#ffd700' });
    if (window._mobsNoFire)  flags.push({ label: 'NOFIRE',  color: '#ff4444' });
    if (window._gameSpeed && window._gameSpeed !== 1)
      flags.push({ label: window._gameSpeed + 'x', color: '#66ff66' });
    if (window._opMode)      flags.push({ label: 'OP',      color: '#ff80ff' });

    if (flags.length > 0) {
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "left";
      let flagX = 10;
      const flagY = Scene.inDungeon ? 130 : 20;
      for (const f of flags) {
        const tw = ctx.measureText(f.label).width + 10;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        const r = 4, fh = 18, fy = flagY - 13;
        ctx.moveTo(flagX + r, fy);
        ctx.lineTo(flagX + tw - r, fy);
        ctx.quadraticCurveTo(flagX + tw, fy, flagX + tw, fy + r);
        ctx.lineTo(flagX + tw, fy + fh - r);
        ctx.quadraticCurveTo(flagX + tw, fy + fh, flagX + tw - r, fy + fh);
        ctx.lineTo(flagX + r, fy + fh);
        ctx.quadraticCurveTo(flagX, fy + fh, flagX, fy + fh - r);
        ctx.lineTo(flagX, fy + r);
        ctx.quadraticCurveTo(flagX, fy, flagX + r, fy);
        ctx.fill();
        ctx.fillStyle = f.color;
        ctx.fillText(f.label, flagX + 5, flagY);
        flagX += tw + 4;
      }
    }
  }

  // Gold display — dungeon only, centered below wave area
  if (Scene.inDungeon) {
    const goldY = 140;
    // Coin icon
    ctx.fillStyle = "#ffc107";
    ctx.beginPath(); ctx.arc(BASE_W / 2 - 50, goldY, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e6a800";
    ctx.beginPath(); ctx.arc(BASE_W / 2 - 50, goldY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("G", BASE_W / 2 - 50, goldY + 4);
    // Amount text
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = PALETTE.gold;
    ctx.textAlign = "center";
    ctx.fillText(gold + "g", BASE_W / 2 + 10, goldY + 7);
  }

  // Zone indicator — removed (was behind HP bar)

  // Speed tracker (top-right) — hidden in Skeld, off by default
  if (gameSettings.showSpeedTracker && !Scene.inSkeld) {
    const spActual = Math.sqrt(player.vx * player.vx + player.vy * player.vy) * 60;
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(spActual)} px/sec`, BASE_W - 10, 16);
    // CT-X build stats (only when CT-X equipped)
    if (playerEquip.gun && playerEquip.gun.id === 'ct_x') {
      const g = playerEquip.gun;
      const rof = g.fireRate ? (g.fireRate * 4 / 60).toFixed(2) + 's' : '?';
      const frz = g.freezePenalty != null ? Math.round(g.freezePenalty * 100) + '%' : '?';
      const spr = g.spread ? g.spread.toFixed(0) + '°' : '0°';
      ctx.fillText(`RoF ${rof}  Frz ${frz}  Spr ${spr}`, BASE_W - 10, 30);
    }
    ctx.textAlign = "left";
  }

  // === DEBUG OVERLAY — zoom/scale tuning info (top-left, below debug flags) ===
  if (gameSettings.showDebugOverlay) {
    const tilesX = Math.round(VIEW_W / TILE * 10) / 10;
    const tilesY = Math.round(VIEW_H / TILE * 10) / 10;
    const charH = Math.round(CHAR_SCALE * 68);  // 68 = base body height approx
    const dbgY = Scene.inDungeon ? 160 : 50;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, dbgY - 12, 200, 50);
    ctx.fillStyle = "#0ff";
    ctx.fillText(`ZOOM ${WORLD_ZOOM}  CHAR_SCALE ${CHAR_SCALE}`, 12, dbgY);
    ctx.fillText(`tiles visible: ${tilesX} x ${tilesY}`, 12, dbgY + 14);
    ctx.fillText(`char height: ${charH}px  TILE: ${TILE}px`, 12, dbgY + 28);
  }

  // === DEATH / RESPAWN OVERLAY ===
  if (playerDead) {
    // Check if we're in spectator mode (party alive, player out of lives, past death anim)
    const _isSpectating = PartyState.members.length > 1
      && !PartySystem.allDead() && lives <= 0 && deathTimer <= 0 && respawnTimer <= 0;

    if (_isSpectating) {
      // Spectator mode — no dark overlay, just the spectator bar (drawn below in SPECTATOR OVERLAY section)
    } else {
      // Normal death/respawn overlay
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, BASE_W, BASE_H);

      ctx.textAlign = 'center';
      if (deathTimer > 0) {
        // "YOU DIED" text with shake
        const shake = Math.sin(deathTimer * 0.5) * 3;
        ctx.font = 'bold 36px monospace';
        ctx.fillStyle = '#cc2222';
        ctx.fillText('YOU DIED', BASE_W / 2 + shake, BASE_H / 2 - 20);
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 34px monospace';
        ctx.fillText('YOU DIED', BASE_W / 2, BASE_H / 2 - 20);
      } else {
        // Respawn countdown
        const secondsLeft = Math.ceil(respawnTimer / 60);
        if (deathGameOver) {
          ctx.font = 'bold 28px monospace';
          ctx.fillStyle = '#cc2222';
          ctx.fillText('GAME OVER', BASE_W / 2, BASE_H / 2 - 40);
          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#aaa';
          ctx.fillText('Returning to lobby...', BASE_W / 2, BASE_H / 2);
        } else {
          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#aaa';
          ctx.fillText('Respawning in', BASE_W / 2, BASE_H / 2 - 40);
        }
        // Big countdown number
        const pulse = 1 + Math.sin(renderTime / 150) * 0.08;
        ctx.save();
        ctx.translate(BASE_W / 2, BASE_H / 2 + 20);
        ctx.scale(pulse, pulse);
        ctx.font = 'bold 64px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(secondsLeft, 0, 0);
        ctx.restore();
        // Lives remaining
        if (!deathGameOver) {
          ctx.font = 'bold 14px monospace';
          ctx.fillStyle = '#e44';
          const livesText = lives === 1 ? '♥  LAST LIFE' : '♥'.repeat(lives) + '  ' + lives + ' lives left';
          ctx.fillText(livesText, BASE_W / 2, BASE_H / 2 + 70);
        }
      }
      ctx.textAlign = 'left';
    }
  }

  // Draw customize screen LAST so it covers all HUD
  drawCustomizeScreen();

  // Hide & Seek overlay (role select + post-match — drawn above everything else)
  if (typeof drawHideSeekOverlay === 'function') drawHideSeekOverlay();

  // Draw inventory panel ABSOLUTE LAST — full opaque overlay
  drawInventoryPanel();

  // Zone transition fade
  if (transitioning && transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    if (transitionAlpha > 0.5) {
      ctx.font = "bold 20px monospace"; ctx.fillStyle = `rgba(255,255,255,${(transitionAlpha - 0.5) * 2})`;
      ctx.textAlign = "center";
      const getSceneLabel = (s) => s === 'lobby' ? "🌳 LOBBY" : s === 'cave' ? "⛰ CAVE" : s === 'azurine' ? "⚡ AZURINE CITY" : "⚔ DUNGEON";
      const tgt = LEVELS[transitionTarget];
      const tgtScene = tgt?.isLobby ? 'lobby' : tgt?.isCave ? 'cave' : tgt?.isAzurine ? 'azurine' : 'dungeon';
      const zoneName = transitionPhase === 1 ? getSceneLabel(tgtScene) : getSceneLabel(Scene.current);
      ctx.fillText(zoneName, BASE_W / 2, BASE_H / 2);
      ctx.textAlign = "left";
    }
  }

  // Minimap overlay (drawn above everything)
  drawMinimap();

  } catch(drawErr) {
    console.error('DRAW ERROR:', drawErr.message, drawErr.stack);
  }
}
// ===================== SPAR HUD =====================
function drawSparHUD() {
  if (typeof SparState === 'undefined') return;
  const phase = SparState.phase;
  const room = SparState.activeRoom;

  if (phase === 'countdown') {
    // Large centered countdown text
    const secs = Math.ceil(SparState.countdown / 60);
    const text = secs > 0 ? secs.toString() : 'FIGHT!';
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 72px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#55ccff';
    ctx.shadowBlur = 20;
    ctx.fillText(text, BASE_W / 2, BASE_H / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if (phase === 'fighting' || phase === 'post_match') {
    // Top bar: room label + team alive counts
    // Streak counter (top center, only in streak mode)
    if (room && room.streakMode && SparState.streakCount > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('STREAK: ' + SparState.streakCount, BASE_W / 2, 24);
      ctx.textAlign = 'left';
    }

    // CT-X build display (bottom-left)
    const playerGun = SparState.teamA.length > 0 ? SparState.teamA[0].gun : null;
    if (playerGun && playerGun._sparFreeze !== undefined) {
      const bx = 10, by = BASE_H - 80;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, 180, 60);
      ctx.strokeStyle = 'rgba(85,204,255,0.3)';
      ctx.strokeRect(bx, by, 180, 60);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#55ccff';
      ctx.fillText('CT-X Build (' + SPAR_CONFIG.POINT_BUDGET + 'pts)', bx + 8, by + 14);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#8cf';
      ctx.fillText('FRZ: ' + playerGun._sparFreeze, bx + 8, by + 30);
      ctx.fillText('ROF: ' + playerGun._sparRof, bx + 68, by + 30);
      ctx.fillText('SPR: ' + playerGun._sparSpread, bx + 128, by + 30);
      // Total
      const total = playerGun._sparFreeze + playerGun._sparRof + playerGun._sparSpread;
      ctx.fillStyle = total <= SPAR_CONFIG.POINT_BUDGET ? '#5f5' : '#f55';
      ctx.fillText('Total: ' + total + '/' + SPAR_CONFIG.POINT_BUDGET, bx + 8, by + 48);
    }
  }

  if (phase === 'post_match') {
    // Victory / Defeat banner
    const won = SparState.lastResult === 'teamA';
    const text = won ? 'VICTORY' : 'DEFEAT';
    const color = won ? '#55ff55' : '#ff4444';
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillText(text, BASE_W / 2, BASE_H / 2);
    ctx.shadowBlur = 0;
    // Streak result
    if (SparState.activeRoom && SparState.activeRoom.streakMode) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 18px monospace';
      if (won) {
        ctx.fillText('Streak: ' + SparState.streakCount, BASE_W / 2, BASE_H / 2 + 40);
      } else {
        ctx.fillText('Streak ended', BASE_W / 2, BASE_H / 2 + 40);
      }
    }
    ctx.restore();
  }
}

const FIXED_DT = 1000 / 60;
let lastTime = 0;
let accumulator = 0;
let trainingRenderDebt = 0;
let lastTrainingRenderTime = 0;
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let elapsed = timestamp - lastTime;
  lastTime = timestamp;
  if (elapsed > 100) elapsed = 100;
  const trainingLoop = typeof _getSparTrainingLoopConfig === 'function'
    ? _getSparTrainingLoopConfig()
    : null;
  // /speed — game speed multiplier (0.25x slow-mo to 2x fast-forward)
  if (window._gameSpeed && window._gameSpeed !== 1) elapsed *= window._gameSpeed;
  // Automated spar training can safely fast-forward time as long as each
  // fixed tick still runs the normal combat logic.
  if (trainingLoop && trainingLoop.speedMultiplier && trainingLoop.speedMultiplier !== 1) {
    elapsed *= trainingLoop.speedMultiplier;
  }
  accumulator += elapsed;
  const usingFixedTrainingBurst = !!(trainingLoop && trainingLoop.fixedUpdatesPerLoop);
  if (usingFixedTrainingBurst) {
    // CPU-limited automated spar: simulate a fixed batch of real 60 Hz ticks per loop.
    accumulator -= elapsed;
    accumulator += FIXED_DT * trainingLoop.fixedUpdatesPerLoop;
  }
  // Fixed timestep: run exactly 60 physics ticks/sec regardless of display refresh rate.
  // On 120Hz+ displays the old code ran extra ticks (via updates===0 fallback),
  // making lightweight scenes (gunsmith) physically faster than heavy ones (lobby).
  let updates = 0;
  const maxUpdates = trainingLoop && trainingLoop.maxUpdatesPerFrame
    ? trainingLoop.maxUpdatesPerFrame
    : 4;
  while (accumulator >= FIXED_DT && updates < maxUpdates) {
    // === SERVER-AUTHORITY LOOP ===
    // 1. Client: gather input → produce commands
    translateIntentsToCommands();
    // 2. Authority: consume commands → run simulation → snapshot
    authorityTick();
    // (In real multiplayer, step 3 would be: apply snapshot from server.
    //  Locally we skip it — authorityTick already mutated GameState directly.)
    accumulator -= FIXED_DT; updates++;
  }
  // Only draw when physics actually updated — caps everything to 60 FPS
  if (updates > 0) {
    if (trainingLoop && trainingLoop.disableRender) {
      trainingRenderDebt = 0;
    } else if (trainingLoop && trainingLoop.renderEveryUpdates && trainingLoop.renderEveryUpdates > 1) {
      trainingRenderDebt += updates;
      const minRenderIntervalMs = trainingLoop.minRenderIntervalMs || 0;
      const renderIntervalMet = !minRenderIntervalMs || (timestamp - lastTrainingRenderTime) >= minRenderIntervalMs;
      if (trainingRenderDebt >= trainingLoop.renderEveryUpdates && renderIntervalMet) {
        draw();
        lastTrainingRenderTime = timestamp;
        trainingRenderDebt = 0;
      }
    } else {
      draw();
      if (trainingLoop) lastTrainingRenderTime = timestamp;
      trainingRenderDebt = 0;
    }
  } else if (!trainingLoop) {
    trainingRenderDebt = 0;
    lastTrainingRenderTime = 0;
  }
  if (trainingLoop && trainingLoop.useTimeoutScheduler) {
    setTimeout(() => gameLoop(performance.now()), 0);
  } else {
    requestAnimationFrame(gameLoop);
  }
}
requestAnimationFrame(gameLoop);
