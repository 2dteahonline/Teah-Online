// ===================== TOOLBOX SYSTEM =====================
// Client UI: toolbox panel rendering and data
// Extracted from index_2.html — Phase D

// ===================== TOOLBOX SYSTEM =====================

// Get all selected items across all categories
function getSelectedToolboxItems() {
  const items = [];
  for (let ci = 0; ci < TOOLBOX_CATEGORIES.length; ci++) {
    const cat = TOOLBOX_CATEGORIES[ci];
    for (let ii = 0; ii < cat.items.length; ii++) {
      if (cat.items[ii].selected) {
        items.push({ ...cat.items[ii], catIdx: ci, itemIdx: ii });
      }
    }
  }
  return items;
}

// Draw selected item icons to the LEFT of the toolbox icon
function drawSelectedToolbar() {
  const selected = getSelectedToolboxItems();
  if (selected.length === 0) return;
  const tbX = BASE_W - ICON_SIZE - 12; // toolbox icon position
  const slotS = 44;
  const slotGap = 4;
  const startX = tbX - (selected.length * (slotS + slotGap)) - 4;
  const slotY = 14;

  for (let i = 0; i < selected.length; i++) {
    const item = selected[i];
    const sx = startX + i * (slotS + slotGap);
    const isActive = activePlaceTool && activePlaceTool.catIdx === item.catIdx && activePlaceTool.itemIdx === item.itemIdx;

    // Background
    ctx.fillStyle = isActive ? "rgba(60,140,80,0.6)" : "rgba(20,20,28,0.85)";
    ctx.beginPath(); ctx.roundRect(sx, slotY, slotS, slotS, 8); ctx.fill();
    ctx.strokeStyle = isActive ? PALETTE.accent : "rgba(255,255,255,0.15)";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(sx, slotY, slotS, slotS, 8); ctx.stroke();

    // Color swatch
    const swPad = 6;
    ctx.fillStyle = item.color;
    ctx.beginPath(); ctx.roundRect(sx + swPad, slotY + swPad, slotS - swPad * 2, slotS - swPad * 2 - 10, 4); ctx.fill();

    // Name
    ctx.fillStyle = isActive ? "#fff" : "#aaa";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText(item.name, sx + slotS / 2, slotY + slotS - 3);

    // Active glow
    if (isActive) {
      ctx.shadowColor = PALETTE.accent;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(sx, slotY, slotS, slotS, 8); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  ctx.textAlign = "left";
}

// Draw placed tiles on the map (called during world rendering)
function drawPlacedTiles(camX, camY) {
  for (const t of placedTiles) {
    const sx = t.x - camX;
    const sy = t.y - camY;
    // Skip if off screen
    if (sx + TILE < 0 || sy + TILE < 0 || sx > BASE_W || sy > BASE_H) continue;
    ctx.fillStyle = t.color;
    ctx.fillRect(sx, sy, TILE, TILE);
    // Subtle texture
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = "#000";
    ctx.fillRect(sx, sy, TILE, 1);
    ctx.fillRect(sx, sy, 1, TILE);
    ctx.globalAlpha = 1.0;
  }
}

// Draw placement preview (ghost tile under cursor)
function drawPlacementPreview(camX, camY) {
  if (!activePlaceTool || UI.isOpen('toolbox')) return;
  const worldX = Math.floor((mouse.x + camX) / TILE) * TILE;
  const worldY = Math.floor((mouse.y + camY) / TILE) * TILE;
  const sx = worldX - camX;
  const sy = worldY - camY;

  if (removeModeActive) {
    // Red X preview for remove mode
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "rgba(200,40,40,0.3)";
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = "#ff4444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx + 6, sy + 6); ctx.lineTo(sx + TILE - 6, sy + TILE - 6);
    ctx.moveTo(sx + TILE - 6, sy + 6); ctx.lineTo(sx + 6, sy + TILE - 6);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  } else {
    // Ghost tile preview
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = activePlaceTool.color;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, TILE, TILE);
    ctx.globalAlpha = 1.0;
  }

  // Mode indicator
  ctx.fillStyle = removeModeActive ? "#ff4444" : PALETTE.accent;
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.fillText(removeModeActive ? "🗑 REMOVE (R)" : "🖌 PLACE", sx + TILE / 2, sy - 6);
  ctx.textAlign = "left";
}

// Place or remove tile at world position
function placeTileAt(worldPixelX, worldPixelY) {
  const tx = Math.floor(worldPixelX / TILE) * TILE;
  const ty = Math.floor(worldPixelY / TILE) * TILE;

  if (removeModeActive) {
    // Remove tile at this position
    for (let i = placedTiles.length - 1; i >= 0; i--) {
      if (placedTiles[i].x === tx && placedTiles[i].y === ty) {
        placedTiles.splice(i, 1);
        return;
      }
    }
  } else if (activePlaceTool) {
    // Check if tile already exists at this position
    const existing = placedTiles.find(t => t.x === tx && t.y === ty);
    if (existing) {
      // Replace with new color
      existing.color = activePlaceTool.color;
      existing.name = activePlaceTool.name;
    } else {
      placedTiles.push({ x: tx, y: ty, color: activePlaceTool.color, name: activePlaceTool.name });
    }
  }
}
// Pixel art icon renderer for toolbox items
function drawToolboxItemIcon(name, color, cx, cy, s) {
  // s = scale factor (~12-14px). cx,cy = center of icon area
  const p = Math.round(s / 6); // pixel size
  const lw = Math.max(1, p * 0.5);

  switch(name) {
    // ===== OBJECTS: FURNITURE =====
    case "Wooden Chair":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.3, cy-s*0.1, s*0.6, p*3); // seat
      ctx.fillRect(cx-s*0.3, cy-s*0.5, p*2, s*0.9); // back
      ctx.fillStyle = "#5a3818";
      ctx.fillRect(cx-s*0.3, cy+p*2, p*2, s*0.3); // left leg
      ctx.fillRect(cx+s*0.1, cy+p*2, p*2, s*0.3); // right leg
      break;
    case "Table":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.5, cy-s*0.15, s, p*3); // top
      ctx.fillStyle = "#5a3818";
      ctx.fillRect(cx-s*0.4, cy+p*1, p*2, s*0.4);
      ctx.fillRect(cx+s*0.2, cy+p*1, p*2, s*0.4);
      break;
    case "Bed":
      ctx.fillStyle = "#e8d0b0";
      ctx.fillRect(cx-s*0.5, cy-s*0.1, s, p*4); // mattress
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.5, cy-s*0.1, s*0.3, p*4); // pillow
      ctx.fillStyle = "#8a2020";
      ctx.fillRect(cx-s*0.2, cy-s*0.1, s*0.7, p*4); // blanket
      ctx.fillStyle = "#5a3818";
      ctx.fillRect(cx-s*0.55, cy-s*0.3, p*2, s*0.8); // headboard
      break;
    case "Bookshelf":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.4, cy-s*0.5, s*0.8, s); // frame
      ctx.fillStyle = "#a03020"; ctx.fillRect(cx-s*0.3, cy-s*0.4, p*2, s*0.25);
      ctx.fillStyle = "#2040a0"; ctx.fillRect(cx-s*0.1, cy-s*0.4, p*2, s*0.25);
      ctx.fillStyle = "#40a030"; ctx.fillRect(cx+s*0.1, cy-s*0.4, p*2, s*0.25);
      ctx.fillStyle = "#c0a020"; ctx.fillRect(cx-s*0.3, cy+s*0.0, p*2, s*0.25);
      ctx.fillStyle = "#8020a0"; ctx.fillRect(cx-s*0.1, cy+s*0.0, p*3, s*0.25);
      break;
    case "Chest":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(cx-s*0.4, cy-s*0.2, s*0.8, s*0.5, p); ctx.fill();
      ctx.fillStyle = "#d0a020";
      ctx.fillRect(cx-p, cy-s*0.05, p*2, p*2); // lock
      ctx.fillStyle = "#8a5a10";
      ctx.fillRect(cx-s*0.4, cy-s*0.35, s*0.8, p*2); // lid
      break;
    case "Barrel":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy, s*0.35, s*0.45, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "#504020"; ctx.lineWidth = p;
      ctx.beginPath(); ctx.ellipse(cx, cy-s*0.15, s*0.32, p*1.5, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.15, s*0.32, p*1.5, 0, 0, Math.PI*2); ctx.stroke();
      break;
    case "Crate":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.4, cy-s*0.4, s*0.8, s*0.8);
      ctx.strokeStyle = "#6a4a18"; ctx.lineWidth = p;
      ctx.beginPath(); ctx.moveTo(cx-s*0.4,cy); ctx.lineTo(cx+s*0.4,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-s*0.4); ctx.lineTo(cx,cy+s*0.4); ctx.stroke();
      break;
    case "Wardrobe":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.4, cy-s*0.5, s*0.8, s);
      ctx.strokeStyle = "#3a2010"; ctx.lineWidth = p*0.7;
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.5); ctx.lineTo(cx, cy+s*0.5); ctx.stroke();
      ctx.fillStyle = "#c0a040";
      ctx.beginPath(); ctx.arc(cx-p*2, cy, p, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+p*2, cy, p, 0, Math.PI*2); ctx.fill();
      break;
    case "Workbench":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.5, cy-s*0.15, s, p*3);
      ctx.fillStyle = "#5a3818";
      ctx.fillRect(cx-s*0.45, cy+p*1.5, p*2, s*0.35);
      ctx.fillRect(cx+s*0.25, cy+p*1.5, p*2, s*0.35);
      ctx.fillStyle = "#888";
      ctx.fillRect(cx+s*0.15, cy-s*0.35, p*2, p*3); // tool
      break;
    // ===== OBJECTS: NATURE =====
    case "Oak Tree":
      ctx.fillStyle = "#5a3818"; ctx.fillRect(cx-p*1.5, cy, p*3, s*0.5);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy-s*0.1, s*0.4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#1a6018";
      ctx.beginPath(); ctx.arc(cx-s*0.15, cy-s*0.2, s*0.25, 0, Math.PI*2); ctx.fill();
      break;
    case "Pine Tree":
      ctx.fillStyle = "#5a3818"; ctx.fillRect(cx-p, cy+s*0.1, p*2, s*0.4);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.5); ctx.lineTo(cx-s*0.35, cy+s*0.15); ctx.lineTo(cx+s*0.35, cy+s*0.15); ctx.fill();
      ctx.fillStyle = "#12481e";
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.3); ctx.lineTo(cx-s*0.25, cy+s*0.05); ctx.lineTo(cx+s*0.25, cy+s*0.05); ctx.fill();
      break;
    case "Dead Tree":
      ctx.fillStyle = color; ctx.fillRect(cx-p*1.5, cy-s*0.1, p*3, s*0.6);
      ctx.strokeStyle = color; ctx.lineWidth = p;
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.1); ctx.lineTo(cx-s*0.3, cy-s*0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.0); ctx.lineTo(cx+s*0.3, cy-s*0.35); ctx.stroke();
      break;
    case "Palm Tree":
      ctx.fillStyle = "#8a6a30"; ctx.fillRect(cx-p, cy, p*2, s*0.55);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.15); ctx.lineTo(cx-s*0.5, cy-s*0.05); ctx.lineTo(cx-s*0.3, cy+s*0.05); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.15); ctx.lineTo(cx+s*0.5, cy-s*0.05); ctx.lineTo(cx+s*0.3, cy+s*0.05); ctx.fill();
      break;
    case "Bush":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s*0.35, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#2a7020";
      ctx.beginPath(); ctx.arc(cx-s*0.15, cy-s*0.1, s*0.2, 0, Math.PI*2); ctx.fill();
      break;
    case "Flower Red":
      ctx.fillStyle = "#3a8a28"; ctx.fillRect(cx-p*0.5, cy, p, s*0.4);
      ctx.fillStyle = color;
      for (let a = 0; a < 5; a++) { const ang = a*1.257; ctx.beginPath(); ctx.arc(cx+Math.cos(ang)*p*2, cy-s*0.15+Math.sin(ang)*p*2, p*1.5, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = "#e0d040"; ctx.beginPath(); ctx.arc(cx, cy-s*0.15, p*1.2, 0, Math.PI*2); ctx.fill();
      break;
    case "Flower Blue":
      ctx.fillStyle = "#3a8a28"; ctx.fillRect(cx-p*0.5, cy, p, s*0.4);
      ctx.fillStyle = color;
      for (let a = 0; a < 5; a++) { const ang = a*1.257; ctx.beginPath(); ctx.arc(cx+Math.cos(ang)*p*2, cy-s*0.15+Math.sin(ang)*p*2, p*1.5, 0, Math.PI*2); ctx.fill(); }
      ctx.fillStyle = "#e0e080"; ctx.beginPath(); ctx.arc(cx, cy-s*0.15, p*1.2, 0, Math.PI*2); ctx.fill();
      break;
    case "Mushroom":
      ctx.fillStyle = "#d8c8a0"; ctx.fillRect(cx-p, cy, p*2, s*0.35);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy-s*0.05, s*0.3, s*0.2, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(cx-p*2, cy-s*0.15, p, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx+p*2, cy-s*0.2, p*0.8, 0, Math.PI*2); ctx.fill();
      break;
    case "Rock Small":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx-s*0.25, cy+s*0.15); ctx.lineTo(cx-s*0.15, cy-s*0.15); ctx.lineTo(cx+s*0.2, cy-s*0.2); ctx.lineTo(cx+s*0.3, cy+s*0.15); ctx.fill();
      ctx.fillStyle = "#888"; ctx.beginPath(); ctx.moveTo(cx-s*0.15,cy-s*0.15); ctx.lineTo(cx+s*0.05,cy-s*0.12); ctx.lineTo(cx-s*0.05,cy+s*0.1); ctx.fill();
      break;
    case "Rock Large":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx-s*0.4, cy+s*0.2); ctx.lineTo(cx-s*0.25, cy-s*0.3); ctx.lineTo(cx+s*0.15, cy-s*0.35); ctx.lineTo(cx+s*0.4, cy-s*0.1); ctx.lineTo(cx+s*0.35, cy+s*0.2); ctx.fill();
      break;
    case "Stump":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.1, s*0.3, s*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#8a6838";
      ctx.beginPath(); ctx.ellipse(cx, cy-s*0.05, s*0.3, s*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#a08050";
      ctx.beginPath(); ctx.ellipse(cx, cy-s*0.05, s*0.15, s*0.08, 0, 0, Math.PI*2); ctx.fill();
      break;
    // ===== OBJECTS: STRUCTURES =====
    case "Campfire":
      ctx.fillStyle = "#5a3818"; // logs
      ctx.fillRect(cx-s*0.35, cy+s*0.1, s*0.7, p*2);
      ctx.fillRect(cx-s*0.15, cy+s*0.05, s*0.3, p*2);
      ctx.fillStyle = "#d06020";
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.4); ctx.lineTo(cx-s*0.2, cy+s*0.1); ctx.lineTo(cx+s*0.2, cy+s*0.1); ctx.fill();
      ctx.fillStyle = "#e0a020";
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.2); ctx.lineTo(cx-s*0.1, cy+s*0.05); ctx.lineTo(cx+s*0.1, cy+s*0.05); ctx.fill();
      break;
    case "Torch":
      ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p, cy-s*0.05, p*2, s*0.55);
      ctx.fillStyle = "#e0a020";
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.35); ctx.lineTo(cx-p*2, cy-s*0.05); ctx.lineTo(cx+p*2, cy-s*0.05); ctx.fill();
      ctx.fillStyle = "#f0d040";
      ctx.beginPath(); ctx.arc(cx, cy-s*0.2, p*1.5, 0, Math.PI*2); ctx.fill();
      break;
    case "Street Lamp":
      ctx.fillStyle = "#505050"; ctx.fillRect(cx-p, cy-s*0.15, p*2, s*0.65);
      ctx.fillStyle = color; ctx.fillRect(cx-s*0.15, cy-s*0.35, s*0.3, p*3);
      ctx.fillStyle = "#ffee80"; ctx.beginPath(); ctx.arc(cx, cy-s*0.25, p*2, 0, Math.PI*2); ctx.fill();
      break;
    case "Well":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.1, s*0.35, s*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#3080c0";
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.05, s*0.22, s*0.12, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#5a3818"; // roof posts
      ctx.fillRect(cx-s*0.3, cy-s*0.3, p*1.5, s*0.4);
      ctx.fillRect(cx+s*0.2, cy-s*0.3, p*1.5, s*0.4);
      ctx.fillRect(cx-s*0.35, cy-s*0.35, s*0.7, p*2); // beam
      break;
    case "Sign Post":
      ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p, cy-s*0.1, p*2, s*0.6);
      ctx.fillStyle = color; ctx.fillRect(cx-s*0.3, cy-s*0.35, s*0.6, s*0.3);
      ctx.fillStyle = "#604020";
      ctx.font = `bold ${p*2.5}px monospace`; ctx.textAlign = "center";
      ctx.fillText("→", cx, cy-s*0.15);
      break;
    case "Mailbox":
      ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p, cy+s*0.05, p*2, s*0.4);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(cx-s*0.25, cy-s*0.3, s*0.5, s*0.35, [p*2,p*2,0,0]); ctx.fill();
      ctx.fillStyle = "#c03030"; ctx.fillRect(cx+s*0.2, cy-s*0.2, p*2, s*0.15); // flag
      break;
    case "Fountain":
      ctx.fillStyle = "#808888";
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.15, s*0.4, s*0.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.1, s*0.3, s*0.15, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "#808888"; ctx.fillRect(cx-p, cy-s*0.2, p*2, s*0.35);
      ctx.fillStyle = "#80c0e0"; // water spray
      ctx.beginPath(); ctx.arc(cx, cy-s*0.25, p*2, 0, Math.PI*2); ctx.fill();
      break;
    case "Statue":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.2, cy-s*0.15, s*0.4, s*0.55); // body
      ctx.beginPath(); ctx.arc(cx, cy-s*0.3, s*0.15, 0, Math.PI*2); ctx.fill(); // head
      ctx.fillStyle = "#707070";
      ctx.fillRect(cx-s*0.3, cy+s*0.3, s*0.6, p*2); // pedestal
      break;
    case "Grave":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(cx-s*0.2, cy-s*0.35, s*0.4, s*0.6, [p*3,p*3,0,0]); ctx.fill();
      ctx.fillStyle = "#4a4a4a";
      ctx.fillRect(cx-p, cy-s*0.2, p*2, s*0.25); // cross vert
      ctx.fillRect(cx-s*0.12, cy-s*0.15, s*0.24, p*1.5); // cross horiz
      break;
    case "Ladder":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.25, cy-s*0.45, p*2, s*0.9);
      ctx.fillRect(cx+s*0.1, cy-s*0.45, p*2, s*0.9);
      for (let r = 0; r < 4; r++) ctx.fillRect(cx-s*0.25, cy-s*0.35+r*s*0.22, s*0.5, p*1.5);
      break;
    // ===== OBJECTS: URBAN =====
    case "Trash Can":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx-s*0.25, cy-s*0.2); ctx.lineTo(cx-s*0.3, cy+s*0.35); ctx.lineTo(cx+s*0.3, cy+s*0.35); ctx.lineTo(cx+s*0.25, cy-s*0.2); ctx.fill();
      ctx.fillStyle = "#686868"; ctx.fillRect(cx-s*0.3, cy-s*0.3, s*0.6, p*2);
      break;
    case "Dumpster":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.4, cy-s*0.15, s*0.8, s*0.5);
      ctx.fillStyle = "#1a4a20"; ctx.fillRect(cx-s*0.4, cy-s*0.25, s*0.8, p*2);
      break;
    case "Fire Hydrant":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.15, cy-s*0.15, s*0.3, s*0.5);
      ctx.beginPath(); ctx.arc(cx, cy-s*0.2, s*0.15, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(cx-s*0.3, cy-s*0.05, s*0.6, p*2);
      break;
    case "Stop Sign":
      ctx.fillStyle = "#6a5a40"; ctx.fillRect(cx-p, cy+s*0.05, p*2, s*0.45);
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const a = i*Math.PI/4 - Math.PI/8; const r = s*0.3; ctx[i===0?"moveTo":"lineTo"](cx+Math.cos(a)*r, cy-s*0.15+Math.sin(a)*r); }
      ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `bold ${p*2}px monospace`; ctx.textAlign = "center"; ctx.fillText("⬡", cx, cy-s*0.1);
      break;
    case "Traffic Cone":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.35); ctx.lineTo(cx-s*0.2, cy+s*0.25); ctx.lineTo(cx+s*0.2, cy+s*0.25); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.fillRect(cx-s*0.12, cy-s*0.1, s*0.24, p*2);
      ctx.fillRect(cx-s*0.16, cy+s*0.08, s*0.32, p*1.5);
      break;
    case "Bench":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.4, cy-s*0.1, s*0.8, p*2);
      ctx.fillRect(cx-s*0.4, cy+p*1, s*0.8, p*2);
      ctx.fillStyle = "#5a3818";
      ctx.fillRect(cx-s*0.35, cy+p*2, p*2, s*0.25);
      ctx.fillRect(cx+s*0.2, cy+p*2, p*2, s*0.25);
      break;
    case "Vending Machine":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.roundRect(cx-s*0.3, cy-s*0.4, s*0.6, s*0.85, p); ctx.fill();
      ctx.fillStyle = "#1a2040"; ctx.fillRect(cx-s*0.2, cy-s*0.3, s*0.4, s*0.35);
      ctx.fillStyle = "#c03030"; ctx.beginPath(); ctx.arc(cx, cy+s*0.2, p*2, 0, Math.PI*2); ctx.fill();
      break;
    case "Telephone Pole":
      ctx.fillStyle = color; ctx.fillRect(cx-p, cy-s*0.4, p*2, s*0.9);
      ctx.fillRect(cx-s*0.35, cy-s*0.3, s*0.7, p*2);
      ctx.strokeStyle = "#333"; ctx.lineWidth = p*0.5;
      ctx.beginPath(); ctx.moveTo(cx-s*0.35,cy-s*0.25); ctx.lineTo(cx-s*0.5,cy-s*0.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+s*0.35,cy-s*0.25); ctx.lineTo(cx+s*0.5,cy-s*0.1); ctx.stroke();
      break;
    // ===== OBJECTS: DUNGEON =====
    case "Skeleton Bones":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy-s*0.2, s*0.15, 0, Math.PI*2); ctx.fill(); // skull
      ctx.fillStyle = "#b0a890";
      ctx.fillRect(cx-s*0.3, cy+s*0.05, s*0.6, p*1.5);
      ctx.fillRect(cx-s*0.2, cy-s*0.05, p*1.5, s*0.3);
      ctx.fillRect(cx+s*0.05, cy+s*0.1, s*0.25, p*1.5);
      break;
    case "Cobweb":
      ctx.strokeStyle = color; ctx.lineWidth = p*0.5;
      ctx.beginPath(); ctx.moveTo(cx-s*0.4,cy-s*0.4); ctx.lineTo(cx+s*0.4,cy+s*0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+s*0.4,cy-s*0.4); ctx.lineTo(cx-s*0.4,cy+s*0.4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-s*0.45); ctx.lineTo(cx,cy+s*0.45); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx-s*0.45,cy); ctx.lineTo(cx+s*0.45,cy); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s*0.15, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s*0.3, 0, Math.PI*2); ctx.stroke();
      break;
    case "Iron Cage":
      ctx.strokeStyle = color; ctx.lineWidth = p;
      ctx.strokeRect(cx-s*0.3, cy-s*0.35, s*0.6, s*0.7);
      for (let b = 0; b < 3; b++) ctx.fillRect(cx-s*0.15+b*s*0.15, cy-s*0.35, p, s*0.7);
      break;
    case "Spike Trap":
      ctx.fillStyle = "#404040"; ctx.fillRect(cx-s*0.4, cy+s*0.1, s*0.8, p*2);
      ctx.fillStyle = color;
      for (let sp = 0; sp < 4; sp++) {
        const sx2 = cx-s*0.3+sp*s*0.2;
        ctx.beginPath(); ctx.moveTo(sx2, cy+s*0.1); ctx.lineTo(sx2+s*0.08, cy-s*0.25); ctx.lineTo(sx2+s*0.16, cy+s*0.1); ctx.fill();
      }
      break;
    case "Altar":
      ctx.fillStyle = color;
      ctx.fillRect(cx-s*0.35, cy, s*0.7, s*0.3);
      ctx.fillRect(cx-s*0.25, cy-s*0.15, s*0.5, s*0.2);
      ctx.fillStyle = "#a060d0"; ctx.beginPath(); ctx.arc(cx, cy-s*0.25, p*2, 0, Math.PI*2); ctx.fill();
      break;
    case "Cauldron":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy+s*0.05, s*0.35, s*0.3, 0, 0, Math.PI); ctx.fill();
      ctx.fillStyle = "#40a030"; ctx.beginPath(); ctx.ellipse(cx, cy-s*0.05, s*0.25, s*0.12, 0, 0, Math.PI*2); ctx.fill();
      break;
    case "Crystal":
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy-s*0.45); ctx.lineTo(cx-s*0.2, cy+s*0.15); ctx.lineTo(cx+s*0.2, cy+s*0.15); ctx.fill();
      ctx.fillStyle = "#a0e0f0";
      ctx.beginPath(); ctx.moveTo(cx+p, cy-s*0.3); ctx.lineTo(cx+s*0.15, cy+s*0.1); ctx.lineTo(cx+p, cy+s*0.1); ctx.fill();
      break;
    case "Rune Circle":
      ctx.strokeStyle = color; ctx.lineWidth = p;
      ctx.beginPath(); ctx.arc(cx, cy, s*0.35, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, s*0.2, 0, Math.PI*2); ctx.stroke();
      for (let r = 0; r < 6; r++) { const a = r*Math.PI/3; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*s*0.28, cy+Math.sin(a)*s*0.28, p, 0, Math.PI*2); ctx.fill(); }
      break;

    // ===== NPCs: FRIENDLY =====
    case "Villager": case "Merchant": case "Blacksmith": case "Healer NPC":
    case "Guard": case "Farmer": case "Fisherman": case "Wizard":
    case "Bard": case "Princess":
    // ===== NPCs: ENEMIES =====
    case "Bandit": case "Dark Knight": case "Goblin": case "Orc":
    case "Vampire": case "Werewolf": case "Demon": case "Ghost":
    case "Dragon": case "Slime":
      drawMiniPerson(cx, cy, s, name, color);
      break;

    // ===== NPCs: ANIMALS =====
    case "Chicken": case "Cow": case "Horse": case "Dog":
    case "Cat": case "Wolf": case "Bear": case "Deer":
      drawMiniAnimal(cx, cy, s, name, color);
      break;

    // ===== GUNS =====
    case "9mm Pistol": case "Revolver": case "Desert Eagle": case "Silenced Pistol": case "Flare Gun":
      drawMiniGun(cx, cy, s, name, color, "pistol");
      break;
    case "Assault Rifle": case "Sniper Rifle": case "Hunting Rifle": case "Burst Rifle": case "DMR":
      drawMiniGun(cx, cy, s, name, color, "rifle");
      break;
    case "Pump Shotgun": case "Auto Shotgun": case "Sawed-Off": case "Double Barrel":
      drawMiniGun(cx, cy, s, name, color, "shotgun");
      break;
    case "Uzi": case "MP5": case "P90": case "Vector":
      drawMiniGun(cx, cy, s, name, color, "smg");
      break;
    case "Rocket Launcher": case "Minigun": case "Crossbow": case "Ray Gun": case "Freeze Ray": case "Plasma Rifle":
      drawMiniGun(cx, cy, s, name, color, "special");
      break;

    // ===== MELEE =====
    case "Iron Sword": case "Steel Sword": case "Katana": case "Broadsword":
    case "Rapier": case "Scimitar": case "Fire Sword": case "Ice Blade": case "Shadow Blade":
      drawMiniMelee(cx, cy, s, name, color, "sword");
      break;
    case "Ninja Katanas": case "Battle Axe": case "War Hammer": case "Mace": case "Flail": case "Halberd":
      drawMiniMelee(cx, cy, s, name, color, "heavy");
      break;
    case "Dagger": case "Throwing Knife": case "Spear": case "Staff":
    case "Whip": case "Nunchucks": case "Bo Staff":
      drawMiniMelee(cx, cy, s, name, color, "light");
      break;
    case "Wood Shield": case "Iron Shield": case "Tower Shield": case "Magic Shield":
      drawMiniMelee(cx, cy, s, name, color, "shield");
      break;

    // ===== ARMOR =====
    case "Leather Cap": case "Iron Helm": case "Steel Helm": case "Knight Helm":
    case "Crown": case "Wizard Hat": case "Hood": case "Bandana":
      drawMiniArmor(cx, cy, s, name, color, "helmet");
      break;
    case "Leather Vest": case "Chainmail": case "Iron Plate": case "Steel Plate":
    case "Gold Plate": case "Dark Armor": case "Robe": case "Cloak":
      drawMiniArmor(cx, cy, s, name, color, "chest");
      break;
    case "Sandals": case "Leather Boots": case "Iron Boots": case "Speed Boots":
    case "Lava Boots": case "Cloud Boots":
      drawMiniArmor(cx, cy, s, name, color, "boots");
      break;
    case "Ring Gold": case "Ring Silver": case "Amulet": case "Cape": case "Gloves": case "Belt":
      drawMiniArmor(cx, cy, s, name, color, "accessory");
      break;

    // ===== CONSUMABLES =====
    case "Health Potion": case "Mana Potion": case "Speed Potion": case "Strength Potion":
    case "Shield Potion": case "Invisibility": case "Poison": case "Antidote":
      drawMiniPotion(cx, cy, s, color);
      break;
    case "Apple": case "Bread": case "Cheese": case "Meat":
    case "Fish": case "Pie": case "Cake": case "Golden Apple":
      drawMiniFood(cx, cy, s, name, color);
      break;
    case "Wood": case "Stone Block": case "Iron Ore": case "Gold Ore":
    case "Diamond": case "Emerald": case "Ruby": case "Coal":
      drawMiniGem(cx, cy, s, name, color);
      break;
    case "Scroll Fire": case "Scroll Ice": case "Scroll Heal": case "Scroll Teleport":
      drawMiniScroll(cx, cy, s, color);
      break;
    case "Bronze Key": case "Silver Key": case "Gold Key": case "Skeleton Key":
      drawMiniKey(cx, cy, s, color);
      break;

    default:
      // Fallback: colored circle
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s*0.35, 0, Math.PI*2); ctx.fill();
      break;
  }
}

// Helper: mini person (NPCs)
function drawMiniPerson(cx, cy, s, name, color) {
  const p = Math.round(s / 6);
  // Skin
  const skinCol = name === "Goblin" || name === "Orc" ? "#6a9a40" : name === "Demon" ? "#a02020" : name === "Ghost" ? "#b0c0d0" : name === "Slime" ? color : "#e0c0a0";
  // Head
  ctx.fillStyle = skinCol;
  ctx.beginPath(); ctx.arc(cx, cy-s*0.25, s*0.2, 0, Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle = name === "Ghost" ? "#405060" : name === "Demon" ? "#ff4040" : "#222";
  ctx.fillRect(cx-p*1.5, cy-s*0.28, p, p); ctx.fillRect(cx+p*0.5, cy-s*0.28, p, p);
  // Body
  ctx.fillStyle = color;
  if (name === "Slime") {
    ctx.beginPath(); ctx.ellipse(cx, cy+s*0.1, s*0.3, s*0.25, 0, 0, Math.PI*2); ctx.fill();
    return;
  }
  if (name === "Ghost") {
    ctx.fillStyle = color; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(cx-s*0.25, cy-s*0.1); ctx.lineTo(cx-s*0.3, cy+s*0.4);
    ctx.lineTo(cx-s*0.1, cy+s*0.3); ctx.lineTo(cx+s*0.1, cy+s*0.4);
    ctx.lineTo(cx+s*0.3, cy+s*0.3); ctx.lineTo(cx+s*0.25, cy-s*0.1); ctx.fill();
    ctx.globalAlpha = 1.0; return;
  }
  ctx.fillRect(cx-s*0.2, cy-s*0.05, s*0.4, s*0.4);
  // Legs
  ctx.fillStyle = name === "Princess" ? "#d070a0" : "#404050";
  ctx.fillRect(cx-s*0.15, cy+s*0.3, p*2, s*0.2);
  ctx.fillRect(cx+s*0.02, cy+s*0.3, p*2, s*0.2);
  // Special features
  if (name === "Crown" || name === "Princess") { ctx.fillStyle = "#d0a020"; ctx.fillRect(cx-s*0.15, cy-s*0.42, s*0.3, p*2); }
  if (name === "Wizard" || name === "Wizard Hat") { ctx.fillStyle = "#4030a0"; ctx.beginPath(); ctx.moveTo(cx, cy-s*0.55); ctx.lineTo(cx-s*0.2, cy-s*0.15); ctx.lineTo(cx+s*0.2, cy-s*0.15); ctx.fill(); }
  if (name === "Guard" || name === "Dark Knight") { ctx.fillStyle = "#708090"; ctx.fillRect(cx-s*0.22, cy-s*0.4, s*0.44, s*0.2); }
  if (name === "Dragon") {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx-s*0.3, cy-s*0.1); ctx.lineTo(cx-s*0.5, cy-s*0.3); ctx.lineTo(cx-s*0.3, cy+s*0.1); ctx.fill();
    ctx.fillStyle = "#e04020"; ctx.beginPath(); ctx.moveTo(cx+s*0.2, cy-s*0.1); ctx.lineTo(cx+s*0.5, cy-s*0.15); ctx.lineTo(cx+s*0.2, cy+s*0.05); ctx.fill();
  }
}

// Helper: mini animal
function drawMiniAnimal(cx, cy, s, name, color) {
  const p = Math.round(s / 6);
  if (name === "Chicken") {
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, s*0.25, s*0.2, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+s*0.15, cy-s*0.2, s*0.12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#e08020"; ctx.beginPath(); ctx.moveTo(cx+s*0.25, cy-s*0.2); ctx.lineTo(cx+s*0.4, cy-s*0.18); ctx.lineTo(cx+s*0.25, cy-s*0.15); ctx.fill();
    ctx.fillStyle = "#c02020"; ctx.fillRect(cx+s*0.1, cy-s*0.12, p*2, p*1.5);
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(cx+s*0.2, cy-s*0.22, p*0.8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#e0a020"; ctx.fillRect(cx-s*0.05, cy+s*0.15, p, s*0.15); ctx.fillRect(cx+s*0.05, cy+s*0.15, p, s*0.15);
    return;
  }
  // Generic 4-legged animal
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(cx, cy, s*0.35, s*0.2, 0, 0, Math.PI*2); ctx.fill();
  // Head
  const headSize = name === "Bear" ? 0.2 : 0.16;
  ctx.beginPath(); ctx.arc(cx+s*0.25, cy-s*0.12, s*headSize, 0, Math.PI*2); ctx.fill();
  // Eyes
  ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(cx+s*0.3, cy-s*0.15, p*0.8, 0, Math.PI*2); ctx.fill();
  // Legs
  ctx.fillStyle = name === "Horse" ? "#6a4a20" : color;
  ctx.fillRect(cx-s*0.25, cy+s*0.12, p*1.5, s*0.2);
  ctx.fillRect(cx-s*0.1, cy+s*0.12, p*1.5, s*0.2);
  ctx.fillRect(cx+s*0.1, cy+s*0.12, p*1.5, s*0.2);
  ctx.fillRect(cx+s*0.22, cy+s*0.12, p*1.5, s*0.2);
  // Ears
  if (name === "Cat" || name === "Wolf" || name === "Dog") {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx+s*0.18, cy-s*0.25); ctx.lineTo(cx+s*0.15, cy-s*0.4); ctx.lineTo(cx+s*0.25, cy-s*0.25); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx+s*0.28, cy-s*0.25); ctx.lineTo(cx+s*0.32, cy-s*0.4); ctx.lineTo(cx+s*0.38, cy-s*0.25); ctx.fill();
  }
  if (name === "Deer") {
    ctx.strokeStyle = "#5a3818"; ctx.lineWidth = p;
    ctx.beginPath(); ctx.moveTo(cx+s*0.2, cy-s*0.25); ctx.lineTo(cx+s*0.15, cy-s*0.45); ctx.lineTo(cx+s*0.05, cy-s*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+s*0.3, cy-s*0.25); ctx.lineTo(cx+s*0.35, cy-s*0.45); ctx.lineTo(cx+s*0.45, cy-s*0.5); ctx.stroke();
  }
  // Tail
  if (name === "Cat") { ctx.strokeStyle = color; ctx.lineWidth = p; ctx.beginPath(); ctx.moveTo(cx-s*0.35, cy-s*0.05); ctx.quadraticCurveTo(cx-s*0.5, cy-s*0.3, cx-s*0.35, cy-s*0.25); ctx.stroke(); }
  if (name === "Dog" || name === "Wolf") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx-s*0.35, cy-s*0.1); ctx.lineTo(cx-s*0.45, cy-s*0.25); ctx.lineTo(cx-s*0.3, cy-s*0.05); ctx.fill(); }
  if (name === "Horse") { ctx.fillStyle = "#3a2a10"; ctx.fillRect(cx-s*0.35, cy-s*0.1, p*2, s*0.2); }
  if (name === "Cow") { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(cx-s*0.1, cy-s*0.02, s*0.1, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+s*0.1, cy+s*0.05, s*0.08, 0, Math.PI*2); ctx.fill(); }
}

// Helper: mini gun
function drawMiniGun(cx, cy, s, name, color, type) {
  const p = Math.round(s / 6);
  ctx.fillStyle = color;
  if (type === "pistol") {
    ctx.fillRect(cx-s*0.25, cy-p*1.5, s*0.5, p*3); // barrel
    ctx.fillRect(cx-s*0.1, cy+p, p*3, s*0.25); // grip
    if (name === "Silenced Pistol") { ctx.fillStyle = "#222"; ctx.fillRect(cx+s*0.2, cy-p, s*0.2, p*2); }
    if (name === "Revolver") { ctx.beginPath(); ctx.arc(cx-s*0.05, cy, p*2.5, 0, Math.PI*2); ctx.fill(); }
    if (name === "Flare Gun") { ctx.fillStyle = "#e0a020"; ctx.fillRect(cx+s*0.15, cy-p*2, p*2, p*2); }
  } else if (type === "rifle") {
    ctx.fillRect(cx-s*0.5, cy-p, s, p*2.5); // barrel
    ctx.fillStyle = "#5a3818"; ctx.fillRect(cx-s*0.35, cy+p, s*0.3, s*0.2); // stock
    ctx.fillStyle = color; ctx.fillRect(cx+s*0.05, cy+p, p*2, s*0.15); // grip
    if (name === "Sniper Rifle") { ctx.fillStyle = "#4080c0"; ctx.beginPath(); ctx.arc(cx+s*0.3, cy-p*2, p*2, 0, Math.PI*2); ctx.fill(); }
  } else if (type === "shotgun") {
    ctx.fillRect(cx-s*0.45, cy-p, s*0.9, p*3);
    ctx.fillStyle = "#5a3818"; ctx.fillRect(cx-s*0.35, cy+p*2, s*0.25, s*0.15);
    if (name === "Double Barrel") { ctx.fillRect(cx-s*0.45, cy-p*2.5, s*0.9, p*1.5); }
  } else if (type === "smg") {
    ctx.fillRect(cx-s*0.3, cy-p, s*0.6, p*2.5);
    ctx.fillRect(cx-s*0.05, cy+p, p*2, s*0.2);
    ctx.fillStyle = "#333"; ctx.fillRect(cx-s*0.15, cy+p*2, p*2.5, s*0.12);
  } else { // special
    ctx.fillRect(cx-s*0.45, cy-p*1.5, s*0.9, p*3);
    if (name === "Rocket Launcher") { ctx.fillStyle = "#2a4a20"; ctx.beginPath(); ctx.arc(cx-s*0.45, cy, p*3, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+s*0.45, cy, p*2, 0, Math.PI*2); ctx.fill(); }
    if (name === "Ray Gun" || name === "Freeze Ray" || name === "Plasma Rifle") { ctx.fillStyle = name==="Freeze Ray"?"#80e0ff":name==="Plasma Rifle"?"#c060ff":"#60ff80"; ctx.beginPath(); ctx.arc(cx+s*0.35, cy, p*2.5, 0, Math.PI*2); ctx.fill(); }
    if (name === "Crossbow") { ctx.strokeStyle = "#6a4a20"; ctx.lineWidth = p; ctx.beginPath(); ctx.moveTo(cx-s*0.35, cy-s*0.35); ctx.lineTo(cx, cy); ctx.lineTo(cx-s*0.35, cy+s*0.35); ctx.stroke(); }
    if (name === "Minigun") { for (let b = 0; b < 3; b++) ctx.fillRect(cx-s*0.45, cy-p*2+b*p*1.5, s*0.9, p); }
  }
}

// Helper: mini melee weapon
function drawMiniMelee(cx, cy, s, name, color, type) {
  const p = Math.round(s / 6);
  if (type === "sword") {
    ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p, cy+s*0.1, p*2, s*0.3); // handle
    ctx.fillStyle = "#c0a040"; ctx.fillRect(cx-s*0.12, cy+s*0.05, s*0.24, p*2); // guard
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx-s*0.08, cy+s*0.05); ctx.lineTo(cx, cy-s*0.45); ctx.lineTo(cx+s*0.08, cy+s*0.05); ctx.fill(); // blade
    if (name === "Fire Sword") { ctx.fillStyle = "#ff8020"; ctx.globalAlpha=0.6; ctx.beginPath(); ctx.arc(cx, cy-s*0.3, p*3, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    if (name === "Ice Blade") { ctx.fillStyle = "#a0e0ff"; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(cx, cy-s*0.2, p*3, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
  } else if (type === "heavy") {
    ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p, cy-s*0.05, p*2, s*0.55); // handle
    ctx.fillStyle = color;
    if (name === "Ninja Katanas") { 
      // Two black katana blades crossing
      ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx-s*0.3, cy+s*0.3); ctx.lineTo(cx+s*0.3, cy-s*0.3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+s*0.3, cy+s*0.3); ctx.lineTo(cx-s*0.3, cy-s*0.3); ctx.stroke();
      ctx.fillStyle = "#333"; ctx.fillRect(cx-s*0.05, cy-s*0.05, s*0.1, s*0.1);
    }
    if (name === "Battle Axe") { ctx.beginPath(); ctx.moveTo(cx+p, cy-s*0.35); ctx.lineTo(cx+s*0.35, cy-s*0.2); ctx.lineTo(cx+s*0.35, cy+s*0.05); ctx.lineTo(cx+p, cy-s*0.05); ctx.fill(); }
    else if (name === "War Hammer") { ctx.fillRect(cx-s*0.25, cy-s*0.35, s*0.5, s*0.2); }
    else if (name === "Mace") { ctx.beginPath(); ctx.arc(cx, cy-s*0.25, s*0.2, 0, Math.PI*2); ctx.fill(); ctx.fillStyle="#555"; for(let sp=0;sp<6;sp++){const a=sp*Math.PI/3; ctx.fillRect(cx+Math.cos(a)*s*0.18-p*0.5, cy-s*0.25+Math.sin(a)*s*0.18-p*0.5, p, p);} }
    else if (name === "Flail") { ctx.beginPath(); ctx.arc(cx+s*0.15, cy-s*0.3, s*0.15, 0, Math.PI*2); ctx.fill(); ctx.strokeStyle="#666"; ctx.lineWidth=p*0.5; ctx.beginPath(); ctx.moveTo(cx,cy-s*0.05); ctx.lineTo(cx+s*0.15,cy-s*0.18); ctx.stroke(); }
    else { ctx.fillRect(cx-s*0.15, cy-s*0.4, s*0.3, s*0.15); ctx.beginPath(); ctx.moveTo(cx, cy-s*0.4); ctx.lineTo(cx-s*0.08, cy-s*0.55); ctx.lineTo(cx+s*0.08, cy-s*0.55); ctx.fill(); }
  } else if (type === "light") {
    if (name === "Dagger" || name === "Throwing Knife") {
      ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p, cy+s*0.05, p*2, s*0.2);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx-p*1.5, cy+s*0.05); ctx.lineTo(cx, cy-s*0.35); ctx.lineTo(cx+p*1.5, cy+s*0.05); ctx.fill();
    } else if (name === "Spear" || name === "Staff" || name === "Bo Staff") {
      ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-p*0.5, cy-s*0.35, p, s*0.85);
      if (name === "Spear") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx-p*2, cy-s*0.35); ctx.lineTo(cx, cy-s*0.55); ctx.lineTo(cx+p*2, cy-s*0.35); ctx.fill(); }
    } else if (name === "Whip") {
      ctx.fillStyle = "#6a4a20"; ctx.fillRect(cx-s*0.35, cy+s*0.15, s*0.15, s*0.15);
      ctx.strokeStyle = color; ctx.lineWidth = p; ctx.beginPath(); ctx.moveTo(cx-s*0.25, cy+s*0.15); ctx.quadraticCurveTo(cx+s*0.3, cy-s*0.3, cx+s*0.1, cy-s*0.4); ctx.stroke();
    } else { // Nunchucks
      ctx.fillStyle = color; ctx.fillRect(cx-s*0.25, cy-s*0.2, p*2.5, s*0.45); ctx.fillRect(cx+s*0.08, cy-s*0.2, p*2.5, s*0.45);
      ctx.strokeStyle = "#444"; ctx.lineWidth = p*0.5; ctx.beginPath(); ctx.moveTo(cx-s*0.15, cy-s*0.2); ctx.quadraticCurveTo(cx, cy-s*0.35, cx+s*0.15, cy-s*0.2); ctx.stroke();
    }
  } else { // shield
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx, cy+s*0.4); ctx.lineTo(cx-s*0.35, cy-s*0.1); ctx.lineTo(cx-s*0.3, cy-s*0.35); ctx.lineTo(cx+s*0.3, cy-s*0.35); ctx.lineTo(cx+s*0.35, cy-s*0.1); ctx.fill();
    if (name === "Magic Shield") { ctx.fillStyle = "#80a0ff"; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(cx, cy, s*0.15, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
    else { ctx.fillStyle = name==="Iron Shield"?"#a0a8b0":"#c0a040"; ctx.beginPath(); ctx.moveTo(cx, cy+s*0.15); ctx.lineTo(cx-s*0.12, cy-s*0.15); ctx.lineTo(cx+s*0.12, cy-s*0.15); ctx.fill(); }
  }
}

// Helper: mini armor
function drawMiniArmor(cx, cy, s, name, color, type) {
  const p = Math.round(s / 6);
  if (type === "helmet") {
    if (name === "Wizard Hat") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx, cy-s*0.5); ctx.lineTo(cx-s*0.35, cy+s*0.2); ctx.lineTo(cx+s*0.35, cy+s*0.2); ctx.fill(); ctx.fillStyle = "#c0a040"; ctx.fillRect(cx-s*0.4, cy+s*0.15, s*0.8, p*2); }
    else if (name === "Crown") { ctx.fillStyle = color; ctx.fillRect(cx-s*0.3, cy-s*0.1, s*0.6, s*0.3);
      ctx.beginPath(); ctx.moveTo(cx-s*0.3,cy-s*0.1); ctx.lineTo(cx-s*0.25,cy-s*0.3); ctx.lineTo(cx-s*0.1,cy-s*0.1); ctx.lineTo(cx,cy-s*0.35); ctx.lineTo(cx+s*0.1,cy-s*0.1); ctx.lineTo(cx+s*0.25,cy-s*0.3); ctx.lineTo(cx+s*0.3,cy-s*0.1); ctx.fill();
      ctx.fillStyle="#c03030"; ctx.beginPath(); ctx.arc(cx,cy-s*0.25,p,0,Math.PI*2); ctx.fill(); }
    else if (name === "Hood") { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, s*0.3, Math.PI, 0); ctx.fill(); ctx.fillRect(cx-s*0.3, cy, s*0.6, s*0.15); }
    else if (name === "Bandana") { ctx.fillStyle = color; ctx.fillRect(cx-s*0.3, cy-s*0.1, s*0.6, s*0.2); ctx.beginPath(); ctx.moveTo(cx+s*0.3,cy); ctx.lineTo(cx+s*0.5,cy+s*0.15); ctx.lineTo(cx+s*0.3,cy+s*0.1); ctx.fill(); }
    else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy-s*0.05, s*0.3, Math.PI, 0); ctx.fill(); ctx.fillRect(cx-s*0.35, cy-s*0.05, s*0.7, s*0.15);
      if (name==="Knight Helm") { ctx.fillStyle="#555"; ctx.fillRect(cx-s*0.1,cy+s*0.05,s*0.2,s*0.15); ctx.fillRect(cx-p*0.5,cy+s*0.05,p,s*0.15); } }
  } else if (type === "chest") {
    ctx.fillStyle = color;
    ctx.fillRect(cx-s*0.3, cy-s*0.3, s*0.6, s*0.55);
    ctx.fillRect(cx-s*0.45, cy-s*0.25, s*0.15, s*0.4); // left arm
    ctx.fillRect(cx+s*0.3, cy-s*0.25, s*0.15, s*0.4); // right arm
    if (name === "Chainmail") { ctx.strokeStyle = "#aaa"; ctx.lineWidth = p*0.3; for(let r=0;r<4;r++) { ctx.beginPath(); ctx.moveTo(cx-s*0.25,cy-s*0.2+r*s*0.12); ctx.lineTo(cx+s*0.25,cy-s*0.2+r*s*0.12); ctx.stroke(); } }
  } else if (type === "boots") {
    ctx.fillStyle = color;
    ctx.fillRect(cx-s*0.3, cy-s*0.15, s*0.25, s*0.35);
    ctx.fillRect(cx+s*0.05, cy-s*0.15, s*0.25, s*0.35);
    ctx.fillRect(cx-s*0.35, cy+s*0.12, s*0.35, p*2);
    ctx.fillRect(cx, cy+s*0.12, s*0.35, p*2);
    if (name === "Speed Boots") { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.moveTo(cx-s*0.4,cy); ctx.lineTo(cx-s*0.55,cy+s*0.1); ctx.lineTo(cx-s*0.4,cy+s*0.15); ctx.fill(); }
    if (name === "Lava Boots") { ctx.fillStyle = "#ff8020"; ctx.globalAlpha=0.5; ctx.beginPath(); ctx.arc(cx-s*0.15, cy+s*0.25, p*2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+s*0.15, cy+s*0.25, p*2, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha=1; }
  } else { // accessory
    if (name.includes("Ring")) { ctx.strokeStyle = color; ctx.lineWidth = p*1.5; ctx.beginPath(); ctx.arc(cx, cy, s*0.25, 0, Math.PI*2); ctx.stroke(); ctx.fillStyle = name==="Ring Gold"?"#d0a020":"#c0c0c0"; ctx.beginPath(); ctx.arc(cx, cy-s*0.25, p*2, 0, Math.PI*2); ctx.fill(); }
    else if (name === "Amulet") { ctx.strokeStyle = "#888"; ctx.lineWidth = p; ctx.beginPath(); ctx.arc(cx, cy-s*0.15, s*0.2, Math.PI*0.2, Math.PI*0.8); ctx.stroke(); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy+s*0.1, s*0.2, 0, Math.PI*2); ctx.fill(); }
    else if (name === "Cape") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx-s*0.25, cy-s*0.35); ctx.lineTo(cx-s*0.35, cy+s*0.4); ctx.lineTo(cx+s*0.35, cy+s*0.4); ctx.lineTo(cx+s*0.25, cy-s*0.35); ctx.fill(); }
    else if (name === "Gloves") { ctx.fillStyle = color; ctx.fillRect(cx-s*0.35, cy-s*0.1, s*0.25, s*0.3); ctx.fillRect(cx+s*0.1, cy-s*0.1, s*0.25, s*0.3); ctx.fillRect(cx-s*0.35, cy-s*0.1, s*0.35, s*0.1); ctx.fillRect(cx+s*0.1, cy-s*0.1, s*0.35, s*0.1); }
    else { ctx.fillStyle = color; ctx.fillRect(cx-s*0.4, cy-p, s*0.8, p*3); ctx.fillStyle="#c0a040"; ctx.beginPath(); ctx.arc(cx, cy, p*2, 0, Math.PI*2); ctx.fill(); }
  }
}

// Helper: mini potion
function drawMiniPotion(cx, cy, s, color) {
  const p = Math.round(s / 6);
  ctx.fillStyle = "#a0a0a0"; ctx.fillRect(cx-p*1.5, cy-s*0.35, p*3, s*0.15); // cork
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(cx-p*1.5, cy-s*0.2); ctx.lineTo(cx-s*0.25, cy+s*0.05); ctx.lineTo(cx-s*0.25, cy+s*0.3);
  ctx.lineTo(cx+s*0.25, cy+s*0.3); ctx.lineTo(cx+s*0.25, cy+s*0.05); ctx.lineTo(cx+p*1.5, cy-s*0.2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(cx-s*0.15, cy+s*0.0, p*1.5, s*0.15);
}

// Helper: mini food
function drawMiniFood(cx, cy, s, name, color) {
  const p = Math.round(s / 6);
  if (name === "Apple" || name === "Golden Apple") { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, s*0.3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#3a6a20"; ctx.fillRect(cx-p*0.5, cy-s*0.4, p, s*0.15); }
  else if (name === "Bread") { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, s*0.35, s*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle="#b08830"; ctx.beginPath(); ctx.ellipse(cx, cy-s*0.05, s*0.3, s*0.12, 0, Math.PI, 0); ctx.fill(); }
  else if (name === "Cheese") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx-s*0.3, cy+s*0.15); ctx.lineTo(cx, cy-s*0.25); ctx.lineTo(cx+s*0.35, cy+s*0.15); ctx.fill(); ctx.fillStyle="#c8a820"; ctx.beginPath(); ctx.arc(cx-s*0.05, cy+s*0.02, p*1.5, 0, Math.PI*2); ctx.fill(); }
  else if (name === "Meat") { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, s*0.3, s*0.2, -0.3, 0, Math.PI*2); ctx.fill(); ctx.fillStyle="#e8d0b0"; ctx.fillRect(cx+s*0.15, cy-s*0.05, s*0.2, p*2); }
  else if (name === "Fish") { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy, s*0.35, s*0.15, 0, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.moveTo(cx+s*0.3, cy); ctx.lineTo(cx+s*0.5, cy-s*0.15); ctx.lineTo(cx+s*0.5, cy+s*0.15); ctx.fill(); ctx.fillStyle="#222"; ctx.beginPath(); ctx.arc(cx-s*0.2, cy-p, p, 0, Math.PI*2); ctx.fill(); }
  else if (name === "Pie") { ctx.fillStyle = "#c0a060"; ctx.beginPath(); ctx.ellipse(cx, cy+s*0.05, s*0.35, s*0.2, 0, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(cx, cy-s*0.02, s*0.28, s*0.15, 0, 0, Math.PI*2); ctx.fill(); }
  else if (name === "Cake") { ctx.fillStyle = "#e0d0c0"; ctx.fillRect(cx-s*0.3, cy-s*0.1, s*0.6, s*0.35); ctx.fillStyle = color; ctx.fillRect(cx-s*0.3, cy-s*0.15, s*0.6, p*2); ctx.fillStyle="#fff"; ctx.fillRect(cx-s*0.3, cy-s*0.1, s*0.6, p); ctx.fillStyle="#c03030"; ctx.beginPath(); ctx.arc(cx, cy-s*0.2, p, 0, Math.PI*2); ctx.fill(); }
  else { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, s*0.3, 0, Math.PI*2); ctx.fill(); }
}

// Helper: mini gem/material
function drawMiniGem(cx, cy, s, name, color) {
  const p = Math.round(s / 6);
  if (name === "Wood") { ctx.fillStyle = color; ctx.fillRect(cx-s*0.3, cy-s*0.2, s*0.6, s*0.4); ctx.fillStyle="#6a4a18"; ctx.beginPath(); ctx.arc(cx, cy, s*0.1, 0, Math.PI*2); ctx.fill(); }
  else if (name === "Stone Block") { ctx.fillStyle = color; ctx.fillRect(cx-s*0.3, cy-s*0.3, s*0.6, s*0.6); ctx.strokeStyle="#555"; ctx.lineWidth=p*0.5; ctx.strokeRect(cx-s*0.3,cy-s*0.3,s*0.6,s*0.6); }
  else if (name === "Coal") { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx-s*0.2, cy+s*0.2); ctx.lineTo(cx-s*0.25, cy-s*0.1); ctx.lineTo(cx, cy-s*0.25); ctx.lineTo(cx+s*0.25, cy-s*0.15); ctx.lineTo(cx+s*0.2, cy+s*0.2); ctx.fill(); }
  else { // gems
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(cx, cy-s*0.35); ctx.lineTo(cx-s*0.3, cy-s*0.1); ctx.lineTo(cx-s*0.2, cy+s*0.25); ctx.lineTo(cx+s*0.2, cy+s*0.25); ctx.lineTo(cx+s*0.3, cy-s*0.1); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath(); ctx.moveTo(cx, cy-s*0.35); ctx.lineTo(cx-s*0.15, cy-s*0.1); ctx.lineTo(cx, cy-s*0.05); ctx.lineTo(cx+s*0.15, cy-s*0.1); ctx.fill();
  }
}

// Helper: mini scroll
function drawMiniScroll(cx, cy, s, color) {
  const p = Math.round(s / 6);
  ctx.fillStyle = "#e8d8b0"; ctx.fillRect(cx-s*0.2, cy-s*0.3, s*0.4, s*0.6);
  ctx.fillStyle = "#d0c090"; ctx.beginPath(); ctx.ellipse(cx-s*0.2, cy-s*0.3, p*2, s*0.06, 0, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx-s*0.2, cy+s*0.3, p*2, s*0.06, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, p*3, 0, Math.PI*2); ctx.fill();
}

// === FLAG DRAWING SYSTEM ===
// Draws recognizable mini-flags as colored rectangles
const FLAG_DATA = {
  // Horizontal tricolors (top, mid, bottom)
  "Germany":{t:"htri",c:["#000","#dd0000","#ffcc00"]},
  "Belgium":{t:"vtri",c:["#000","#ffcc00","#dd0000"]},
  "Italy":{t:"vtri",c:["#009246","#fff","#ce2b37"]},
  "France":{t:"vtri",c:["#002395","#fff","#ed2939"]},
  "Ireland":{t:"vtri",c:["#009a49","#fff","#ff7900"]},
  "Romania":{t:"vtri",c:["#002b7f","#fcd116","#ce1126"]},
  "Chad":{t:"vtri",c:["#002664","#fecb00","#c60c30"]},
  "Mali":{t:"vtri",c:["#14b53a","#fcd116","#ce1126"]},
  "Guinea":{t:"vtri",c:["#ce1126","#fcd116","#009460"]},
  "Nigeria":{t:"vtri",c:["#008751","#fff","#008751"]},
  "Netherlands":{t:"htri",c:["#ae1c28","#fff","#21468b"]},
  "Luxembourg":{t:"htri",c:["#ed2939","#fff","#00a1de"]},
  "Russia":{t:"htri",c:["#fff","#0039a6","#d52b1e"]},
  "Hungary":{t:"htri",c:["#ce2939","#fff","#477050"]},
  "Bulgaria":{t:"htri",c:["#fff","#00966e","#d62612"]},
  "Lithuania":{t:"htri",c:["#fdb913","#006a44","#c1272d"]},
  "Estonia":{t:"htri",c:["#0072ce","#000","#fff"]},
  "Latvia":{t:"htri",c:["#9e3039","#fff","#9e3039"]},
  "Austria":{t:"htri",c:["#ed2939","#fff","#ed2939"]},
  "Yemen":{t:"htri",c:["#ce1126","#fff","#000"]},
  "Sierra Leone":{t:"htri",c:["#1eb53a","#fff","#0072c6"]},
  "Argentina":{t:"htri",c:["#74acdf","#fff","#74acdf"]},
  "Bolivia":{t:"htri",c:["#d52b1e","#f9e300","#007934"]},
  "Colombia":{t:"htri",c:["#fcd116","#003893","#ce1126"]},
  "Armenia":{t:"htri",c:["#d90012","#0033a0","#f2a800"]},
  "Azerbaijan":{t:"htri",c:["#0092bc","#e4002b","#00af66"]},
  "Gabon":{t:"htri",c:["#009e60","#fcd116","#3a75c4"]},
  "Myanmar":{t:"htri",c:["#fecb00","#34b233","#ea2839"]},
  // Bicolor horizontal
  "Poland":{t:"htri",c:["#fff","#fff","#dc143c"]},
  "Monaco":{t:"htri",c:["#ce1126","#ce1126","#fff"]},
  "Indonesia":{t:"htri",c:["#ff0000","#ff0000","#fff"]},
  "Ukraine":{t:"htri",c:["#005bbb","#005bbb","#ffd500"]},
  // Nordic crosses
  "Sweden":{t:"nordic",bg:"#006aa7",cross:"#fecc00"},
  "Norway":{t:"nordic",bg:"#ef2b2d",cross:"#002868",inner:"#fff"},
  "Denmark":{t:"nordic",bg:"#c60c30",cross:"#fff"},
  "Finland":{t:"nordic",bg:"#fff",cross:"#003580"},
  "Iceland":{t:"nordic",bg:"#003897",cross:"#d72828",inner:"#fff"},
  // Special flags
  "United States":{t:"us"},
  "United Kingdom":{t:"uk"},
  "Japan":{t:"jp"},
  "South Korea":{t:"kr"},
  "China":{t:"cn"},
  "Canada":{t:"ca"},
  "Switzerland":{t:"ch"},
  "Turkey":{t:"tr"},
  "Brazil":{t:"br"},
  "Australia":{t:"au"},
  "India":{t:"in"},
  "Mexico":{t:"mx"},
  "Israel":{t:"il"},
  "Greece":{t:"gr"},
  "Thailand":{t:"htri5",c:["#ed1c24","#fff","#241d4f","#fff","#ed1c24"]},
  "Costa Rica":{t:"htri5",c:["#002b7f","#fff","#ce1126","#fff","#002b7f"]},
  // Simple colored
  "Libya":{t:"solid",c:"#000"},
  "Bangladesh":{t:"disc",bg:"#006a4e",disc:"#f42a41"},
  "Laos":{t:"disc",bg:"#002868",disc:"#fff",stripe:"#ce1126"},
  "Pakistan":{t:"pk"},
  "Saudi Arabia":{t:"solid",c:"#006c35"},
  "Jamaica":{t:"jm"},
  "Cuba":{t:"cu"},
  "Chile":{t:"cl"},
  "Peru":{t:"vtri",c:["#d91023","#fff","#d91023"]},
  "Czech Republic":{t:"cz"},
  "Philippines":{t:"ph"},
  "South Africa":{t:"za"},
  "Egypt":{t:"htri",c:["#ce1126","#fff","#000"]},
  "Spain":{t:"es"},
  "Portugal":{t:"pt"},
  "North Korea":{t:"kp"},
  "Morocco":{t:"solid",c:"#c1272d"},
  "Algeria":{t:"dz"},
  "Tunisia":{t:"tn"},
  "Ghana":{t:"htri",c:["#ce1126","#fcd116","#006b3f"]},
  "Kenya":{t:"ke"},
  "Tanzania":{t:"tz"},
  "Ethiopia":{t:"htri",c:["#009a44","#fcdd09","#da121a"]},
  "Uganda":{t:"htri",c:["#000","#fcdc04","#d90000"]},
  "Mozambique":{t:"htri",c:["#009a44","#000","#fcdd09"]},
  "Zambia":{t:"solid",c:"#198a00"},
  "Zimbabwe":{t:"htri",c:["#006400","#ffd200","#d40000"]},
  "Cameroon":{t:"vtri",c:["#007a5e","#ce1126","#fcd116"]},
  "Senegal":{t:"vtri",c:["#00853f","#fdef42","#e31b23"]},
  "Somalia":{t:"disc",bg:"#4189dd",disc:"#fff"},
  "Sudan":{t:"htri",c:["#d21034","#fff","#000"]},
  "Rwanda":{t:"htri",c:["#00a1de","#fad201","#20603d"]},
  "Burundi":{t:"solid",c:"#1eb53a"},
  "Nepal":{t:"solid",c:"#dc143c"},
  "Sri Lanka":{t:"solid",c:"#8d153a"},
  "Cambodia":{t:"htri",c:["#032ea1","#e00025","#032ea1"]},
  "Vietnam":{t:"disc",bg:"#da251d",disc:"#ffff00"},
  "Mongolia":{t:"vtri",c:["#c4272f","#0066b3","#c4272f"]},
  "Singapore":{t:"htri",c:["#ef3340","#ef3340","#fff"]},
  "Malaysia":{t:"htri",c:["#cc0001","#fff","#cc0001"]},
  "Brunei":{t:"solid",c:"#f7e017"},
  "New Zealand":{t:"au"},
  "Fiji":{t:"solid",c:"#68bfe5"},
  "Qatar":{t:"solid",c:"#8a1538"},
  "Bahrain":{t:"solid",c:"#ce1126"},
  "Kuwait":{t:"htri",c:["#007a3d","#fff","#ce1126"]},
  "Oman":{t:"solid",c:"#db161b"},
  "UAE":{t:"ae"},
  "United Arab Emirates":{t:"ae"},
  "Andorra":{t:"vtri",c:["#0032a0","#fedf00","#d1203c"]},
  "Angola":{t:"htri",c:["#cc0000","#cc0000","#000"]},
  "Belarus":{t:"htri",c:["#c8313e","#c8313e","#4aa657"]},
  "Benin":{t:"vtri",c:["#008751","#fcd116","#e8112d"]},
  "Burkina Faso":{t:"htri",c:["#ef2b2d","#ef2b2d","#009e49"]},
  "Congo":{t:"vtri",c:["#009543","#fbde4a","#ce1021"]},
  "Gambia":{t:"htri",c:["#ce1126","#fff","#3a7728"]},
  "Niger":{t:"htri",c:["#e05206","#fff","#0db02b"]},
  "Taiwan":{t:"tw"},
  "Uzbekistan":{t:"htri",c:["#0099b5","#fff","#1eb53a"]},
  "North Macedonia":{t:"solid",c:"#ce2028"},
  "Jordan":{t:"htri",c:["#000","#fff","#007a3d"]},
  "Lebanon":{t:"htri",c:["#ed1c24","#fff","#ed1c24"]},
  "Syria":{t:"htri",c:["#ce1126","#fff","#000"]},
  "Iraq":{t:"htri",c:["#ce1126","#fff","#000"]},
  "Iran":{t:"htri",c:["#239f40","#fff","#da0000"]},
  "Afghanistan":{t:"vtri",c:["#000","#ce1126","#007a2b"]},
  "Uzbekistan":{t:"htri",c:["#0099b5","#fff","#1eb53a"]},
  "Kazakhstan":{t:"solid",c:"#00afca"},
  "Georgia":{t:"solid",c:"#fff"},
  "Croatia":{t:"htri",c:["#ff0000","#fff","#171796"]},
  "Serbia":{t:"htri",c:["#c6363c","#0c4076","#fff"]},
  "Slovenia":{t:"htri",c:["#fff","#003da5","#ed1c24"]},
  "Slovakia":{t:"htri",c:["#fff","#0b4ea2","#ee1c25"]},
  "Bosnia":{t:"solid",c:"#002395"},
  "Montenegro":{t:"solid",c:"#c40308"},
  "Moldova":{t:"vtri",c:["#003da5","#fcd116","#cc0000"]},
  "Albania":{t:"solid",c:"#e41e20"},
  "Malta":{t:"htri",c:["#fff","#fff","#cf142b"]},
  "Cyprus":{t:"solid",c:"#fff"},
  "Panama":{t:"htri",c:["#fff","#fff","#005293"]},
  "Honduras":{t:"htri",c:["#0073cf","#fff","#0073cf"]},
  "Guatemala":{t:"vtri",c:["#4997d0","#fff","#4997d0"]},
  "El Salvador":{t:"htri",c:["#0f47af","#fff","#0f47af"]},
  "Nicaragua":{t:"htri",c:["#0067c6","#fff","#0067c6"]},
  "Dominican Republic":{t:"htri",c:["#002d62","#fff","#ce1126"]},
  "Haiti":{t:"htri",c:["#00209f","#00209f","#d21034"]},
  "Trinidad":{t:"solid",c:"#ce1126"},
  "Barbados":{t:"vtri",c:["#00267f","#ffc726","#00267f"]},
  "Bahamas":{t:"htri",c:["#00778b","#ffc72c","#00778b"]},
  "Guyana":{t:"solid",c:"#009e49"},
  "Paraguay":{t:"htri",c:["#d52b1e","#fff","#0038a8"]},
  "Uruguay":{t:"htri",c:["#fff","#fff","#0038a8"]},
  "Ecuador":{t:"htri",c:["#ffd100","#0038a8","#ce1126"]},
  "Venezuela":{t:"htri",c:["#fcdd09","#003893","#d82b2b"]},
  "Djibouti":{t:"htri",c:["#6ab2e7","#12ad2b","#6ab2e7"]},
  "Eritrea":{t:"solid",c:"#4189dd"},
  "Botswana":{t:"htri",c:["#75aadb","#000","#75aadb"]},
  "Madagascar":{t:"solid",c:"#fc3d32"},
  "Belize":{t:"solid",c:"#003f87"},
  "Bhutan":{t:"solid",c:"#ff8000"},
  "Palestine":{t:"htri",c:["#000","#fff","#009736"]},
};

function drawFlag(ctx2, x, y, w, h, country) {
  const fd = FLAG_DATA[country];
  ctx2.save();
  ctx2.beginPath(); ctx2.rect(x, y, w, h); ctx2.clip();
  
  if (!fd) {
    // Default: gray with first letter
    ctx2.fillStyle = "#556";
    ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#fff"; ctx2.font = "bold " + Math.floor(h*0.6) + "px sans-serif";
    ctx2.textAlign = "center"; ctx2.textBaseline = "middle";
    ctx2.fillText(country.charAt(0), x + w/2, y + h/2);
    ctx2.restore(); return;
  }
  
  const t = fd.t;
  if (t === "htri") {
    const c = fd.c;
    ctx2.fillStyle = c[0]; ctx2.fillRect(x, y, w, h/3);
    ctx2.fillStyle = c[1]; ctx2.fillRect(x, y + h/3, w, h/3);
    ctx2.fillStyle = c[2]; ctx2.fillRect(x, y + h*2/3, w, h/3 + 1);
  } else if (t === "vtri") {
    const c = fd.c;
    ctx2.fillStyle = c[0]; ctx2.fillRect(x, y, w/3, h);
    ctx2.fillStyle = c[1]; ctx2.fillRect(x + w/3, y, w/3, h);
    ctx2.fillStyle = c[2]; ctx2.fillRect(x + w*2/3, y, w/3 + 1, h);
  } else if (t === "htri5") {
    const c = fd.c; const sh = h/5;
    for (let i = 0; i < 5; i++) { ctx2.fillStyle = c[i]; ctx2.fillRect(x, y + i*sh, w, sh+1); }
  } else if (t === "nordic") {
    ctx2.fillStyle = fd.bg; ctx2.fillRect(x, y, w, h);
    const cw = h * 0.18, cx2 = x + w * 0.36;
    if (fd.inner) { ctx2.fillStyle = fd.inner; ctx2.fillRect(cx2 - cw*0.7, y, cw*1.4, h); ctx2.fillRect(x, y + h/2 - cw*0.7, w, cw*1.4); }
    ctx2.fillStyle = fd.cross; ctx2.fillRect(cx2 - cw/2, y, cw, h); ctx2.fillRect(x, y + h/2 - cw/2, w, cw);
  } else if (t === "disc") {
    ctx2.fillStyle = fd.bg; ctx2.fillRect(x, y, w, h);
    if (fd.stripe) { ctx2.fillStyle = fd.stripe; ctx2.fillRect(x, y + h*0.25, w, h*0.5); ctx2.fillStyle = fd.bg; ctx2.fillRect(x, y, w, h*0.25); ctx2.fillRect(x, y + h*0.75, w, h*0.25); }
    ctx2.fillStyle = fd.disc; ctx2.beginPath(); ctx2.arc(x + w*0.45, y + h/2, h*0.22, 0, Math.PI*2); ctx2.fill();
  } else if (t === "solid") {
    ctx2.fillStyle = fd.c; ctx2.fillRect(x, y, w, h);
  } else if (t === "us") {
    // US flag - stripes + blue canton
    for (let i = 0; i < 13; i++) { ctx2.fillStyle = i % 2 === 0 ? "#b22234" : "#fff"; ctx2.fillRect(x, y + i * h/13, w, h/13 + 1); }
    ctx2.fillStyle = "#3c3b6e"; ctx2.fillRect(x, y, w*0.45, h*0.54);
    ctx2.fillStyle = "#fff"; const ss = h*0.04;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { ctx2.beginPath(); ctx2.arc(x + w*0.06 + c*w*0.1, y + h*0.07 + r*h*0.12, ss, 0, Math.PI*2); ctx2.fill(); }
  } else if (t === "uk") {
    ctx2.fillStyle = "#012169"; ctx2.fillRect(x, y, w, h);
    ctx2.strokeStyle = "#fff"; ctx2.lineWidth = h*0.16;
    ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x+w, y+h); ctx2.moveTo(x+w, y); ctx2.lineTo(x, y+h); ctx2.stroke();
    ctx2.strokeStyle = "#C8102E"; ctx2.lineWidth = h*0.08;
    ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x+w, y+h); ctx2.moveTo(x+w, y); ctx2.lineTo(x, y+h); ctx2.stroke();
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w*0.42, y, w*0.16, h); ctx2.fillRect(x, y + h*0.38, w, h*0.24);
    ctx2.fillStyle = "#C8102E"; ctx2.fillRect(x + w*0.45, y, w*0.1, h); ctx2.fillRect(x, y + h*0.42, w, h*0.16);
  } else if (t === "jp") {
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#bc002d"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h/2, h*0.3, 0, Math.PI*2); ctx2.fill();
  } else if (t === "kr") {
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#cd2e3a"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h*0.38, h*0.25, Math.PI, 0); ctx2.fill();
    ctx2.fillStyle = "#0047a0"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h*0.52, h*0.25, 0, Math.PI); ctx2.fill();
  } else if (t === "cn") {
    ctx2.fillStyle = "#de2910"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#ffde00";
    ctx2.beginPath(); ctx2.arc(x + w*0.2, y + h*0.35, h*0.18, 0, Math.PI*2); ctx2.fill();
    for (let s = 0; s < 4; s++) { ctx2.beginPath(); ctx2.arc(x + w*0.38 + s*w*0.04, y + h*0.18 + s*h*0.08, h*0.06, 0, Math.PI*2); ctx2.fill(); }
  } else if (t === "ca") {
    ctx2.fillStyle = "#ff0000"; ctx2.fillRect(x, y, w*0.28, h); ctx2.fillRect(x + w*0.72, y, w*0.28, h);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w*0.28, y, w*0.44, h);
    ctx2.fillStyle = "#ff0000"; // Maple leaf simplified
    const mx2 = x + w/2, my2 = y + h/2;
    ctx2.beginPath(); ctx2.moveTo(mx2, y + h*0.2); ctx2.lineTo(mx2 + h*0.15, y + h*0.55); ctx2.lineTo(mx2 + h*0.05, y + h*0.5);
    ctx2.lineTo(mx2 + h*0.18, y + h*0.7); ctx2.lineTo(mx2, y + h*0.6); ctx2.lineTo(mx2 - h*0.18, y + h*0.7);
    ctx2.lineTo(mx2 - h*0.05, y + h*0.5); ctx2.lineTo(mx2 - h*0.15, y + h*0.55); ctx2.closePath(); ctx2.fill();
  } else if (t === "ch") {
    ctx2.fillStyle = "#ff0000"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w*0.38, y + h*0.18, w*0.24, h*0.64); ctx2.fillRect(x + w*0.2, y + h*0.38, w*0.6, h*0.24);
  } else if (t === "tr") {
    ctx2.fillStyle = "#e30a17"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#fff"; ctx2.beginPath(); ctx2.arc(x + w*0.38, y + h/2, h*0.28, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = "#e30a17"; ctx2.beginPath(); ctx2.arc(x + w*0.42, y + h/2, h*0.22, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = "#fff"; // star
    const sx = x + w*0.55, sy = y + h/2, sr = h*0.1;
    ctx2.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI/2 + i*Math.PI*2/5; ctx2.lineTo(sx+Math.cos(a)*sr, sy+Math.sin(a)*sr); const a2 = a + Math.PI/5; ctx2.lineTo(sx+Math.cos(a2)*sr*0.4, sy+Math.sin(a2)*sr*0.4); } ctx2.fill();
  } else if (t === "br") {
    ctx2.fillStyle = "#009c3b"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#ffdf00";
    ctx2.beginPath(); ctx2.moveTo(x + w/2, y + h*0.1); ctx2.lineTo(x + w*0.9, y + h/2); ctx2.lineTo(x + w/2, y + h*0.9); ctx2.lineTo(x + w*0.1, y + h/2); ctx2.closePath(); ctx2.fill();
    ctx2.fillStyle = "#002776"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h/2, h*0.22, 0, Math.PI*2); ctx2.fill();
  } else if (t === "au") {
    ctx2.fillStyle = "#012169"; ctx2.fillRect(x, y, w, h);
    // Union Jack in canton
    const uw = w*0.45, uh = h*0.5;
    ctx2.strokeStyle = "#fff"; ctx2.lineWidth = h*0.06;
    ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x+uw, y+uh); ctx2.moveTo(x+uw, y); ctx2.lineTo(x, y+uh); ctx2.stroke();
    ctx2.strokeStyle = "#C8102E"; ctx2.lineWidth = h*0.03;
    ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x+uw, y+uh); ctx2.moveTo(x+uw, y); ctx2.lineTo(x, y+uh); ctx2.stroke();
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + uw*0.42, y, uw*0.16, uh); ctx2.fillRect(x, y + uh*0.38, uw, uh*0.24);
    ctx2.fillStyle = "#C8102E"; ctx2.fillRect(x + uw*0.45, y, uw*0.1, uh); ctx2.fillRect(x, y + uh*0.42, uw, uh*0.16);
    // Stars
    ctx2.fillStyle = "#fff";
    ctx2.beginPath(); ctx2.arc(x + w*0.7, y + h*0.7, h*0.06, 0, Math.PI*2); ctx2.fill();
    ctx2.beginPath(); ctx2.arc(x + w*0.25, y + h*0.75, h*0.08, 0, Math.PI*2); ctx2.fill();
  } else if (t === "in") {
    ctx2.fillStyle = "#ff9933"; ctx2.fillRect(x, y, w, h/3);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y + h/3, w, h/3);
    ctx2.fillStyle = "#138808"; ctx2.fillRect(x, y + h*2/3, w, h/3 + 1);
    ctx2.fillStyle = "#000080"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h/2, h*0.12, 0, Math.PI*2); ctx2.stroke();
  } else if (t === "mx") {
    ctx2.fillStyle = "#006847"; ctx2.fillRect(x, y, w/3, h);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w/3, y, w/3, h);
    ctx2.fillStyle = "#ce1126"; ctx2.fillRect(x + w*2/3, y, w/3 + 1, h);
    ctx2.fillStyle = "#6b3b24"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h/2, h*0.12, 0, Math.PI*2); ctx2.fill();
  } else if (t === "il") {
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#0038b8"; ctx2.fillRect(x, y + h*0.12, w, h*0.1); ctx2.fillRect(x, y + h*0.78, w, h*0.1);
    // Star of David
    const scx = x + w/2, scy = y + h/2, sr2 = h*0.16;
    ctx2.strokeStyle = "#0038b8"; ctx2.lineWidth = 1.5;
    ctx2.beginPath(); ctx2.moveTo(scx, scy - sr2); ctx2.lineTo(scx + sr2*0.87, scy + sr2*0.5); ctx2.lineTo(scx - sr2*0.87, scy + sr2*0.5); ctx2.closePath(); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(scx, scy + sr2); ctx2.lineTo(scx + sr2*0.87, scy - sr2*0.5); ctx2.lineTo(scx - sr2*0.87, scy - sr2*0.5); ctx2.closePath(); ctx2.stroke();
  } else if (t === "gr") {
    for (let i = 0; i < 9; i++) { ctx2.fillStyle = i % 2 === 0 ? "#0d5eaf" : "#fff"; ctx2.fillRect(x, y + i*h/9, w, h/9 + 1); }
    ctx2.fillStyle = "#0d5eaf"; ctx2.fillRect(x, y, w*0.37, h*5/9);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w*0.14, y, w*0.09, h*5/9); ctx2.fillRect(x, y + h*2/9, w*0.37, h/9);
  } else if (t === "es") {
    ctx2.fillStyle = "#c60b1e"; ctx2.fillRect(x, y, w, h*0.25); ctx2.fillRect(x, y + h*0.75, w, h*0.25);
    ctx2.fillStyle = "#ffc400"; ctx2.fillRect(x, y + h*0.25, w, h*0.5);
  } else if (t === "pt") {
    ctx2.fillStyle = "#006600"; ctx2.fillRect(x, y, w*0.4, h);
    ctx2.fillStyle = "#ff0000"; ctx2.fillRect(x + w*0.4, y, w*0.6, h);
    ctx2.fillStyle = "#ffcc00"; ctx2.beginPath(); ctx2.arc(x + w*0.4, y + h/2, h*0.2, 0, Math.PI*2); ctx2.fill();
  } else if (t === "pk") {
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y, w*0.25, h);
    ctx2.fillStyle = "#01411c"; ctx2.fillRect(x + w*0.25, y, w*0.75, h);
    ctx2.fillStyle = "#fff"; ctx2.beginPath(); ctx2.arc(x + w*0.56, y + h/2, h*0.25, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = "#01411c"; ctx2.beginPath(); ctx2.arc(x + w*0.6, y + h/2, h*0.2, 0, Math.PI*2); ctx2.fill();
  } else if (t === "jm") {
    ctx2.fillStyle = "#009b3a"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#fed100"; ctx2.lineWidth = h*0.12; ctx2.strokeStyle = "#fed100";
    ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x+w, y+h); ctx2.moveTo(x, y+h); ctx2.lineTo(x+w, y); ctx2.stroke();
    ctx2.fillStyle = "#000";
    ctx2.beginPath(); ctx2.moveTo(x + w/2, y); ctx2.lineTo(x + w, y + h/2); ctx2.lineTo(x + w/2, y + h); ctx2.fill();
    ctx2.beginPath(); ctx2.moveTo(x + w/2, y); ctx2.lineTo(x, y + h/2); ctx2.lineTo(x + w/2, y + h); ctx2.fill();
  } else if (t === "cu") {
    for (let i = 0; i < 5; i++) { ctx2.fillStyle = i % 2 === 0 ? "#002a8f" : "#fff"; ctx2.fillRect(x, y + i*h/5, w, h/5+1); }
    ctx2.fillStyle = "#cf142b"; ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + w*0.4, y + h/2); ctx2.lineTo(x, y + h); ctx2.closePath(); ctx2.fill();
  } else if (t === "cl") {
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y, w, h/2);
    ctx2.fillStyle = "#d52b1e"; ctx2.fillRect(x, y + h/2, w, h/2);
    ctx2.fillStyle = "#0039a6"; ctx2.fillRect(x, y, w/3, h/2);
  } else if (t === "cz") {
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y, w, h/2);
    ctx2.fillStyle = "#d7141a"; ctx2.fillRect(x, y + h/2, w, h/2);
    ctx2.fillStyle = "#11457e"; ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + w*0.4, y + h/2); ctx2.lineTo(x, y + h); ctx2.closePath(); ctx2.fill();
  } else if (t === "ph") {
    ctx2.fillStyle = "#0038a8"; ctx2.fillRect(x, y, w, h/2);
    ctx2.fillStyle = "#ce1126"; ctx2.fillRect(x, y + h/2, w, h/2);
    ctx2.fillStyle = "#fff"; ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + w*0.4, y + h/2); ctx2.lineTo(x, y + h); ctx2.closePath(); ctx2.fill();
    ctx2.fillStyle = "#fcd116"; ctx2.beginPath(); ctx2.arc(x + w*0.14, y + h/2, h*0.1, 0, Math.PI*2); ctx2.fill();
  } else if (t === "za") {
    ctx2.fillStyle = "#e03c31"; ctx2.fillRect(x, y, w, h*0.4);
    ctx2.fillStyle = "#001489"; ctx2.fillRect(x, y + h*0.6, w, h*0.4);
    ctx2.fillStyle = "#007749"; ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + w*0.4, y + h/2); ctx2.lineTo(x, y + h); ctx2.closePath(); ctx2.fill();
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w*0.35, y + h*0.33, w*0.65, h*0.04); ctx2.fillRect(x + w*0.35, y + h*0.63, w*0.65, h*0.04);
    ctx2.fillStyle = "#007749"; ctx2.fillRect(x + w*0.35, y + h*0.37, w*0.65, h*0.26);
  } else if (t === "kp") {
    ctx2.fillStyle = "#024fa2"; ctx2.fillRect(x, y, w, h*0.15); ctx2.fillRect(x, y + h*0.85, w, h*0.15);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y + h*0.15, w, h*0.05); ctx2.fillRect(x, y + h*0.8, w, h*0.05);
    ctx2.fillStyle = "#ed1c27"; ctx2.fillRect(x, y + h*0.2, w, h*0.6);
    ctx2.fillStyle = "#fff"; ctx2.beginPath(); ctx2.arc(x + w*0.3, y + h/2, h*0.18, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = "#ed1c27"; ctx2.beginPath(); ctx2.arc(x + w*0.3, y + h/2, h*0.15, 0, Math.PI*2); ctx2.fill();
  } else if (t === "dz") {
    ctx2.fillStyle = "#006233"; ctx2.fillRect(x, y, w/2, h);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x + w/2, y, w/2, h);
    ctx2.fillStyle = "#d21034"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h/2, h*0.25, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = (x + w/2 > x) ? "#fff" : "#006233"; ctx2.beginPath(); ctx2.arc(x + w*0.53, y + h/2, h*0.2, 0, Math.PI*2); ctx2.fill();
  } else if (t === "tn") {
    ctx2.fillStyle = "#e70013"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#fff"; ctx2.beginPath(); ctx2.arc(x + w/2, y + h/2, h*0.28, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = "#e70013"; ctx2.beginPath(); ctx2.arc(x + w*0.53, y + h/2, h*0.22, 0, Math.PI*2); ctx2.fill();
  } else if (t === "ke") {
    ctx2.fillStyle = "#000"; ctx2.fillRect(x, y, w, h*0.3);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y + h*0.3, w, h*0.05);
    ctx2.fillStyle = "#bb0000"; ctx2.fillRect(x, y + h*0.35, w, h*0.3);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y + h*0.65, w, h*0.05);
    ctx2.fillStyle = "#006600"; ctx2.fillRect(x, y + h*0.7, w, h*0.3);
  } else if (t === "tz") {
    ctx2.fillStyle = "#1eb53a"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#00a3dd"; ctx2.beginPath(); ctx2.moveTo(x, y); ctx2.lineTo(x + w, y); ctx2.lineTo(x, y + h); ctx2.closePath(); ctx2.fill();
    ctx2.fillStyle = "#fcd116"; ctx2.lineWidth = h*0.08; ctx2.strokeStyle = "#fcd116";
    ctx2.beginPath(); ctx2.moveTo(x, y + h); ctx2.lineTo(x + w, y); ctx2.stroke();
    ctx2.fillStyle = "#000"; ctx2.lineWidth = h*0.04; ctx2.strokeStyle = "#000";
    ctx2.beginPath(); ctx2.moveTo(x, y + h); ctx2.lineTo(x + w, y); ctx2.stroke();
  } else if (t === "ae") {
    ctx2.fillStyle = "#00732f"; ctx2.fillRect(x, y, w, h/3);
    ctx2.fillStyle = "#fff"; ctx2.fillRect(x, y + h/3, w, h/3);
    ctx2.fillStyle = "#000"; ctx2.fillRect(x, y + h*2/3, w, h/3);
    ctx2.fillStyle = "#ff0000"; ctx2.fillRect(x, y, w*0.25, h);
  } else if (t === "tw") {
    ctx2.fillStyle = "#fe0000"; ctx2.fillRect(x, y, w, h);
    ctx2.fillStyle = "#000095"; ctx2.fillRect(x, y, w*0.45, h*0.55);
    ctx2.fillStyle = "#fff"; ctx2.beginPath(); ctx2.arc(x + w*0.22, y + h*0.27, h*0.16, 0, Math.PI*2); ctx2.fill();
    ctx2.fillStyle = "#000095"; ctx2.beginPath(); ctx2.arc(x + w*0.22, y + h*0.27, h*0.1, 0, Math.PI*2); ctx2.fill();
  }
  
  // Border
  ctx2.strokeStyle = "rgba(255,255,255,0.2)"; ctx2.lineWidth = 0.5;
  ctx2.strokeRect(x, y, w, h);
  ctx2.restore();
}

// Language to country mapping for flags
const LANG_TO_COUNTRY = {
  "English":"United Kingdom","Spanish":"Spain","French":"France","German":"Germany",
  "Italian":"Italy","Portuguese":"Portugal","Dutch":"Netherlands","Russian":"Russia",
  "Japanese":"Japan","Korean":"South Korea","Chinese":"China","Arabic":"Saudi Arabia",
  "Hindi":"India","Turkish":"Turkey","Polish":"Poland","Swedish":"Sweden",
  "Norwegian":"Norway","Danish":"Denmark","Finnish":"Finland","Greek":"Greece",
  "Czech":"Czech Republic","Romanian":"Romania","Hungarian":"Hungary","Thai":"Thailand",
  "Vietnamese":"Vietnam","Indonesian":"Indonesia","Malay":"Malaysia","Tagalog":"Philippines",
  "Ukrainian":"Ukraine","Bulgarian":"Bulgaria","Croatian":"Croatia","Serbian":"Serbia",
  "Slovak":"Slovakia","Slovenian":"Slovenia","Estonian":"Estonia","Latvian":"Latvia",
  "Lithuanian":"Lithuania","Hebrew":"Israel","Persian":"Iran","Urdu":"Pakistan",
  "Bengali":"Bangladesh","Tamil":"India","Swahili":"Kenya","Afrikaans":"South Africa",
  "Catalan":"Spain","Icelandic":"Iceland","Maltese":"Malta","Albanian":"Albania",
  "Nepali":"Nepal","Burmese":"Myanmar","Khmer":"Cambodia","Lao":"Laos",
  "Georgian":"Georgia","Armenian":"Armenia","Mongolian":"Mongolia","Amharic":"Ethiopia",
  "Somali":"Somalia","Hausa":"Nigeria","Yoruba":"Nigeria","Zulu":"South Africa",
  "Maori":"New Zealand","Irish":"Ireland","Basque":"Spain","Galician":"Spain",
  "Filipino":"Philippines","Haitian":"Haiti","Kazakh":"Kazakhstan","Uzbek":"Uzbekistan",
  "Azerbaijani":"Azerbaijan","Pashto":"Afghanistan","Kurdish":"Iraq",
  "Sinhala":"Sri Lanka","Bosnian":"Bosnia","Luxembourgish":"Luxembourg",
  "Macedonian":"North Macedonia","Welsh":"United Kingdom",
};

// Helper: mini key
function drawMiniKey(cx, cy, s, color) {
  const p = Math.round(s / 6);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx-s*0.15, cy-s*0.15, s*0.18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.arc(cx-s*0.15, cy-s*0.15, s*0.08, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(cx-s*0.05, cy-p, s*0.45, p*2);
  ctx.fillRect(cx+s*0.25, cy, p*2, p*2.5);
  ctx.fillRect(cx+s*0.15, cy, p*2, p*2);
}
function drawToolboxIcon() {
  const tbX = BASE_W - ICON_SIZE - 12;
  const tbY = 12;
  drawIconButton(tbX, tbY, UI.isOpen('toolbox'), (x, y) => {
    ctx.fillStyle = UI.isOpen('toolbox') ? "#fff" : "#bbb";
    // Toolbox body
    ctx.beginPath(); ctx.roundRect(x + 9, y + 16, 30, 22, 3); ctx.fill();
    // Toolbox lid
    ctx.fillStyle = UI.isOpen('toolbox') ? "#ddd" : "#999";
    ctx.beginPath(); ctx.roundRect(x + 7, y + 10, 34, 8, [3,3,0,0]); ctx.fill();
    // Handle
    ctx.strokeStyle = UI.isOpen('toolbox') ? "#fff" : "#bbb";
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x + 24, y + 10, 6, Math.PI, 0); ctx.stroke();
    // Latch
    ctx.fillStyle = UI.isOpen('toolbox') ? "#fa0" : "#885";
    ctx.fillRect(x + 22, y + 14, 4, 4);
    // Tool slots
    ctx.fillStyle = UI.isOpen('toolbox') ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.4)";
    ctx.fillRect(x + 13, y + 21, 7, 12);
    ctx.fillRect(x + 22, y + 21, 7, 12);
    ctx.fillRect(x + 31, y + 21, 5, 12);
  });
}

function drawToolboxPanel() {
  if (!UI.isOpen('toolbox')) return;
  const pad = 30;
  const pw = BASE_W - pad * 2;
  const ph = BASE_H - pad * 2;
  const px = pad, py = pad;

  // Darken background
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Main panel
  ctx.fillStyle = "rgba(18,18,28,0.97)";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.stroke();

  // Title
  ctx.fillStyle = "#fff";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "left";
  ctx.fillText("🧰 Toolbox", px + 24, py + 40);

  // Close button
  ctx.fillStyle = "rgba(200,60,60,0.8)";
  ctx.beginPath(); ctx.roundRect(px + pw - 44, py + 10, 34, 34, 8); ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText("✕", px + pw - 27, py + 33);

  // Category tabs
  const tabY = py + 60;
  const tabH = 42;
  const tabGap = 4;
  const tabPad = 16;
  let tabX = px + 20;

  for (let i = 0; i < TOOLBOX_CATEGORIES.length; i++) {
    const cat = TOOLBOX_CATEGORIES[i];
    const label = cat.icon + " " + cat.name;
    ctx.font = "bold 14px monospace";
    const tw = ctx.measureText(label).width + tabPad * 2;
    const active = i === toolboxCategory;

    // Tab background
    ctx.fillStyle = active ? "rgba(80,180,120,0.3)" : "rgba(40,40,55,0.8)";
    ctx.beginPath(); ctx.roundRect(tabX, tabY, tw, tabH, [8,8,0,0]); ctx.fill();

    // Active indicator
    if (active) {
      ctx.fillStyle = PALETTE.accent;
      ctx.fillRect(tabX, tabY + tabH - 3, tw, 3);
    }

    // Border
    ctx.strokeStyle = active ? "rgba(95,202,128,0.5)" : "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(tabX, tabY, tw, tabH, [8,8,0,0]); ctx.stroke();

    // Label
    ctx.fillStyle = active ? "#fff" : "#888";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, tabX + tw / 2, tabY + 27);

    tabX += tw + tabGap;
  }

  // Content area
  const contentY = tabY + tabH + 12;
  const contentH = py + ph - contentY - 20;
  const contentX = px + 16;
  const contentW = pw - 32;
  ctx.fillStyle = "rgba(10,10,18,0.6)";
  ctx.beginPath(); ctx.roundRect(contentX, contentY, contentW, contentH, 8); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(contentX, contentY, contentW, contentH, 8); ctx.stroke();

  // Clip to content area
  ctx.save();
  ctx.beginPath(); ctx.roundRect(contentX, contentY, contentW, contentH, 8); ctx.clip();

  const cat = TOOLBOX_CATEGORIES[toolboxCategory];

  if (cat.items.length === 0) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillText("No items in " + cat.name + " yet", px + pw / 2, contentY + contentH / 2);
    ctx.font = "12px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillText("Items will appear here as they are added", px + pw / 2, contentY + contentH / 2 + 24);
  } else {
    // Draw items grouped by group header
    const slotSize = 76;
    const slotGap = 8;
    const gridPad = 16;
    const cols = Math.floor((contentW - gridPad * 2 + slotGap) / (slotSize + slotGap));
    let curY = contentY + gridPad - toolboxScroll;
    let lastGroup = "";

    // Store slot positions for click handling
    cat._slotPositions = [];

    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i];

      // Group header
      if (item.group && item.group !== lastGroup) {
        lastGroup = item.group;
        // Start new row for group
        const colIdx = i > 0 ? ((cat._slotPositions.length) % cols) : 0;
        if (colIdx !== 0) curY += slotSize + slotGap + 8; // finish previous row
        
        if (curY >= contentY - 30 && curY <= contentY + contentH) {
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.font = "bold 13px monospace";
          ctx.textAlign = "left";
          ctx.fillText("— " + item.group.toUpperCase() + " —", contentX + gridPad, curY + 14);
        }
        curY += 26;
      }

      const colIdx = cat._slotPositions.filter(s => Math.abs(s.y - curY) < 2).length;
      const col = colIdx % cols;
      if (col === 0 && colIdx > 0) curY += slotSize + slotGap;
      const realCol = cat._slotPositions.filter(s => Math.abs(s.y - curY) < 2).length % cols;
      const sx = contentX + gridPad + realCol * (slotSize + slotGap);
      const sy = curY;

      cat._slotPositions.push({ x: sx, y: sy, idx: i });

      // Only draw if visible
      if (sy + slotSize >= contentY && sy <= contentY + contentH) {
        // Slot background
        const isSelected = item.selected;
        ctx.fillStyle = isSelected ? "rgba(60,140,80,0.35)" : "rgba(30,30,45,0.8)";
        ctx.beginPath(); ctx.roundRect(sx, sy, slotSize, slotSize, 6); ctx.fill();
        ctx.strokeStyle = isSelected ? "rgba(95,202,128,0.7)" : "rgba(255,255,255,0.08)";
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(sx, sy, slotSize, slotSize, 6); ctx.stroke();

        // Draw item icon or tileset swatch
        const iconArea = slotSize - 16;
        const iconCx = sx + slotSize / 2;
        const iconCy = sy + 8 + iconArea / 2 - 4;

        if (toolboxCategory === 0) {
          // Tileset: color swatch
          const swatchPad = 8;
          const swatchSize2 = slotSize - swatchPad * 2 - 16;
          const swatchX = sx + (slotSize - swatchSize2) / 2;
          const swatchY = sy + swatchPad;
          ctx.fillStyle = item.color;
          ctx.beginPath(); ctx.roundRect(swatchX, swatchY, swatchSize2, swatchSize2, 4); ctx.fill();
          ctx.globalAlpha = 0.15;
          for (let px2 = 0; px2 < swatchSize2; px2 += 8) {
            for (let py2 = 0; py2 < swatchSize2; py2 += 8) {
              if ((px2 + py2) % 16 === 0) {
                ctx.fillStyle = "#fff";
                ctx.fillRect(swatchX + px2, swatchY + py2, 4, 4);
              }
            }
          }
          ctx.globalAlpha = 1.0;
          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.roundRect(swatchX, swatchY, swatchSize2, swatchSize2, 4); ctx.stroke();
        } else {
          // Non-tileset: draw pixel art icon
          drawToolboxItemIcon(item.name, item.color, iconCx, iconCy, iconArea * 0.4);
        }

        // Name
        ctx.fillStyle = isSelected ? "#fff" : "#aaa";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(item.name, sx + slotSize / 2, sy + slotSize - 5);

        // Checkmark if selected
        if (isSelected) {
          const ckX = sx + slotSize - 18;
          const ckY = sy + 4;
          ctx.fillStyle = "#2d8a4e";
          ctx.beginPath(); ctx.arc(ckX + 7, ckY + 7, 9, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ckX + 3, ckY + 7);
          ctx.lineTo(ckX + 6, ckY + 11);
          ctx.lineTo(ckX + 12, ckY + 3);
          ctx.stroke();
        }
      }
    }

    // Calculate total content height for scrolling
    const lastSlot = cat._slotPositions[cat._slotPositions.length - 1];
    cat._totalHeight = lastSlot ? (lastSlot.y + slotSize + gridPad - contentY + toolboxScroll) : 0;

    // Scrollbar
    if (cat._totalHeight > contentH) {
      const barH = Math.max(30, (contentH / cat._totalHeight) * contentH);
      const barY = contentY + (toolboxScroll / (cat._totalHeight - contentH)) * (contentH - barH);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath(); ctx.roundRect(contentX + contentW - 8, barY, 5, barH, 3); ctx.fill();
    }
  }

  ctx.restore();
  ctx.textAlign = "left";
}

