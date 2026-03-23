// ===================== FARMING SYSTEM =====================
// Authority: farm state, tile management, growth, HUD, vendor.
// Simplified v1: till → plant → water once → wait → harvest.
// Hoes are pure tools (not melee weapons). No re-watering needed.
//
// Depends on: CROP_TYPES, HOE_TIERS, FARMING_CONFIG, LAND_EXPANSIONS (farmingData.js)
//             Scene, level, levelEntities (sceneManager.js)
//             player, playerEquip, melee, gold (gameState.js)
//             hitEffects (gameState.js), UI (panelManager.js)
//             TILE (levelData.js), ctx, BASE_W, BASE_H (inline canvas)

// ===================== FARMING STATE =====================
const farmingState = {
  active: false,
  tiles: [],           // { tx, ty, state, cropId, growthTimer }
  landLevel: 0,        // index into LAND_EXPANSIONS (persisted)
  equippedHoe: 'bronze_hoe',   // hoe ID string, e.g. 'iron_hoe' (persisted)
  selectedSeed: null,  // crop id currently selected for planting
  actionCooldown: 0,   // frames until next action allowed
  bucketOwned: false,   // whether player owns the metal bucket (persisted)
  bucketFilled: false,  // whether bucket is currently filled with water
  stats: {
    totalHarvested: 0,
    totalEarned: 0,
    bestCrop: null,
    bestCropValue: 0,
  },
};

// Tile states
const FARM_TILE_STATES = {
  EMPTY: 'empty',
  TILLED: 'tilled',
  PLANTED: 'planted',
  GROWING: 'growing',
  HARVESTABLE: 'harvestable',
};

// ===================== INIT / RESET =====================
// Called when entering house_01 (from sceneManager enterLevel)
function initFarmState() {
  farmingState.active = true;
  farmingState.tiles = [];
  farmingState.actionCooldown = 0;

  // Find farm_zone entity to determine tillable bounds
  const zone = levelEntities.find(e => e.type === 'farm_zone');
  if (!zone) return;

  // Build tile grid based on land level (each plot is PLOT_SIZE x PLOT_SIZE tiles)
  const exp = getLandExpansion(farmingState.landLevel);
  const gridW = exp.gridW; // plot count
  const gridH = exp.gridH;
  const tilesW = gridW * PLOT_SIZE; // total tiles wide
  const tilesH = gridH * PLOT_SIZE;

  // Center the grid within the farm zone
  const zoneW = zone.w || 12;
  const zoneH = zone.h || 12;
  const startTX = zone.tx + Math.floor((zoneW - tilesW) / 2);
  const startTY = zone.ty + Math.floor((zoneH - tilesH) / 2);

  for (let dy = 0; dy < gridH; dy++) {
    for (let dx = 0; dx < gridW; dx++) {
      farmingState.tiles.push({
        tx: startTX + dx * PLOT_SIZE,
        ty: startTY + dy * PLOT_SIZE,
        state: FARM_TILE_STATES.EMPTY,
        cropId: null,
        growthTimer: 0,
      });
    }
  }

  // Don't auto-equip hoe or auto-select seed — let player choose from inventory
}

// Called on scene exit / state reset
function resetFarmingState() {
  farmingState.active = false;
  farmingState.tiles = [];
  farmingState.actionCooldown = 0;
  farmingState.selectedSeed = null;
}

// ===================== UPDATE (per frame) =====================
function updateFarming() {
  if (!farmingState.active || !Scene.inFarm) return;

  // Tick action cooldown
  if (farmingState.actionCooldown > 0) farmingState.actionCooldown--;

  // Tick growth — watered crops grow continuously, no re-watering needed
  for (const tile of farmingState.tiles) {
    if (tile.state === FARM_TILE_STATES.GROWING) {
      tile.growthTimer++;
      const crop = CROP_TYPES[tile.cropId];
      if (crop && tile.growthTimer >= crop.growthFrames) {
        tile.state = FARM_TILE_STATES.HARVESTABLE;
      }
    }
  }
}

// ===================== MULTI-TILE HELPERS =====================
// Get nearby tiles sorted by distance to primary tile, up to count.
function _getNearbyFarmTiles(primary, count) {
  if (count <= 1) return [primary];
  const tiles = [primary];
  const used = new Set();
  used.add(primary.tx + ',' + primary.ty);
  // Gather all adjacent tiles (8-directional) sorted by distance
  const candidates = [];
  for (const t of farmingState.tiles) {
    if (used.has(t.tx + ',' + t.ty)) continue;
    const dx = Math.abs(t.tx - primary.tx);
    const dy = Math.abs(t.ty - primary.ty);
    if (dx <= 2 && dy <= 2) {
      candidates.push({ tile: t, dist: dx + dy });
    }
  }
  candidates.sort((a, b) => a.dist - b.dist);
  for (let i = 0; i < candidates.length && tiles.length < count; i++) {
    tiles.push(candidates[i].tile);
  }
  return tiles;
}

// ===================== FARM ACTION HANDLER =====================
function handleFarmAction(fromClick) {
  if (farmingState.actionCooldown > 0) return;

  // Check if near the well with bucket — fill bucket instead of farming
  if (farmingState.bucketOwned && !farmingState.bucketFilled) {
    const well = levelEntities.find(e => e.type === 'farm_well');
    if (well) {
      const wellCX = well.tx * TILE + (well.w || 2) * TILE / 2;
      const wellCY = well.ty * TILE + (well.h || 2) * TILE / 2;
      const distToWell = Math.sqrt((player.x - wellCX) ** 2 + (player.y - wellCY) ** 2);
      if (distToWell < TILE * 3) {
        farmingState.bucketFilled = true;
        farmingState.actionCooldown = 20;
        hitEffects.push({ x: wellCX, y: wellCY - 20, life: 30, type: 'text_popup', text: 'Bucket filled!', color: '#40a0ff' });
        return;
      }
    }
  }

  const tile = getFarmTileAtAction(fromClick);
  if (!tile) return; // silently fail — no popup spam

  const hoe = getEquippedHoe();
  const cfg = FARMING_CONFIG;
  const swingCount = hoe ? (hoe.swingTiles || 1) : 1;

  switch (tile.state) {
    case FARM_TILE_STATES.EMPTY: {
      // TILL — requires hoe, uses swing animation
      if (!hoe) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Equip a hoe to till!', color: '#ff6060' });
        return;
      }
      if (typeof meleeSwing === 'function') meleeSwing();
      const targets = _getNearbyFarmTiles(tile, swingCount);
      for (const t of targets) {
        if (t.state === FARM_TILE_STATES.EMPTY) {
          t.state = FARM_TILE_STATES.TILLED;
        }
      }
      farmingState.actionCooldown = cfg.tillCooldown;
      break;
    }

    case FARM_TILE_STATES.TILLED: {
      // PLANT — requires selected seed in inventory, NO hoe swing
      if (!farmingState.selectedSeed) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Select seeds first! [1-9]', color: '#ff6060' });
        return;
      }
      const crop = CROP_TYPES[farmingState.selectedSeed];
      if (!crop) return;
      const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
      if (!window._opMode && farmLevel < crop.levelReq) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Level ' + crop.levelReq + ' required!', color: '#ff6060' });
        return;
      }
      if (!window._opMode && crop.gardenReq > farmingState.landLevel) {
        const reqExp = LAND_EXPANSIONS[crop.gardenReq];
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Requires ' + (reqExp ? reqExp.name : 'Garden Lv.' + crop.gardenReq) + '!', color: '#ff6060' });
        return;
      }
      const seedId = 'seed_' + farmingState.selectedSeed;
      let seedSlot = -1;
      for (let si = 0; si < inventory.length; si++) {
        if (inventory[si] && inventory[si].id === seedId && inventory[si].type === 'resource') {
          seedSlot = si;
          break;
        }
      }
      if (seedSlot === -1) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'No ' + crop.name + ' seeds!', color: '#ff6060' });
        return;
      }
      // Consume seed and plant — no hoe swing animation
      inventory[seedSlot].count--;
      if (inventory[seedSlot].count <= 0) inventory.splice(seedSlot, 1);
      tile.state = FARM_TILE_STATES.PLANTED;
      tile.cropId = farmingState.selectedSeed;
      tile.growthTimer = 0;
      farmingState.actionCooldown = cfg.plantCooldown;
      break;
    }

    case FARM_TILE_STATES.PLANTED: {
      // WATER — bucket waters multi-tile, hoe waters single tile
      if (farmingState.bucketFilled) {
        const targets = _getNearbyFarmTiles(tile, swingCount);
        for (const t of targets) {
          if (t.state === FARM_TILE_STATES.PLANTED) {
            t.state = FARM_TILE_STATES.GROWING;
            t.growthTimer = 0;
          }
        }
        farmingState.bucketFilled = false;
      } else {
        tile.state = FARM_TILE_STATES.GROWING;
        tile.growthTimer = 0;
      }
      farmingState.actionCooldown = cfg.plantCooldown;
      break;
    }

    case FARM_TILE_STATES.GROWING: {
      // Just show countdown — no popup spam, the countdown bubble handles it
      break;
    }

    case FARM_TILE_STATES.HARVESTABLE: {
      // HARVEST — requires hoe, uses swing animation
      if (!hoe) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Equip a hoe to harvest!', color: '#ff6060' });
        return;
      }
      if (typeof meleeSwing === 'function') meleeSwing();
      const targets = _getNearbyFarmTiles(tile, swingCount);
      let totalGold = 0, totalXP = 0, harvested = 0;
      for (const t of targets) {
        if (t.state !== FARM_TILE_STATES.HARVESTABLE) continue;
        const hCrop = CROP_TYPES[t.cropId];
        if (!hCrop) continue;
        gold += hCrop.sellPrice;
        totalGold += hCrop.sellPrice;
        totalXP += hCrop.xp;
        if (typeof addSkillXP === 'function') addSkillXP('Farming', hCrop.xp);
        farmingState.stats.totalHarvested++;
        farmingState.stats.totalEarned += hCrop.sellPrice;
        if (hCrop.sellPrice > farmingState.stats.bestCropValue) {
          farmingState.stats.bestCrop = hCrop.name;
          farmingState.stats.bestCropValue = hCrop.sellPrice;
        }
        t.state = FARM_TILE_STATES.TILLED;
        t.cropId = null;
        t.growthTimer = 0;
        harvested++;
      }
      if (harvested > 0) {
        const plotCX4 = tile.tx * TILE + PLOT_SIZE * TILE / 2;
        const plotCY4 = tile.ty * TILE + PLOT_SIZE * TILE / 2;
        hitEffects.push({ x: plotCX4, y: plotCY4 - 10, life: 30, type: 'text_popup',
          text: '+' + totalGold + 'g  +' + totalXP + ' XP' + (harvested > 1 ? ' (x' + harvested + ')' : ''),
          color: '#50d050' });
      }
      farmingState.actionCooldown = cfg.harvestCooldown;
      break;
    }
  }
}

// Get equipped hoe from farmingState (pure tool, not melee weapon)
function getEquippedHoe() {
  return HOE_TIERS.find(h => h.id === farmingState.equippedHoe) || null;
}

// Find the farm tile to act on.
// Click: target the tile under/nearest the mouse cursor (within reach).
// F key: target the closest tile in the player's facing direction (generous).
function getFarmTileAtAction(fromClick) {
  const hoe = getEquippedHoe();
  const reach = hoe ? hoe.reach : 1;
  const plotPx = PLOT_SIZE * TILE; // size of one plot in pixels
  const maxReachPx = plotPx * reach + plotPx / 4; // reach + quarter tile buffer

  if (fromClick && typeof InputIntent !== 'undefined') {
    // CLICK MODE: find closest tile to mouse world position, within reach of player
    const mwx = InputIntent.mouseWorldX;
    const mwy = InputIntent.mouseWorldY;
    let bestTile = null;
    let bestDist = Infinity;

    for (const tile of farmingState.tiles) {
      const cx = tile.tx * TILE + plotPx / 2;
      const cy = tile.ty * TILE + plotPx / 2;
      const playerDist = Math.sqrt((cx - player.x) ** 2 + (cy - player.y) ** 2);
      if (playerDist > maxReachPx) continue;
      const mouseDist = Math.sqrt((cx - mwx) ** 2 + (cy - mwy) ** 2);
      if (mouseDist < bestDist) {
        bestDist = mouseDist;
        bestTile = tile;
      }
    }
    return bestTile;
  }

  // F KEY MODE: find closest tile in facing direction
  const dir = player.dir;
  let ddx = 0, ddy = 0;
  if (dir === 0) ddy = 1;
  else if (dir === 1) ddy = -1;
  else if (dir === 2) ddx = -1;
  else if (dir === 3) ddx = 1;

  const targetX = player.x + ddx * plotPx * reach;
  const targetY = player.y + ddy * plotPx * reach;

  let bestTile = null;
  let bestDist = Infinity;

  for (const tile of farmingState.tiles) {
    const cx = tile.tx * TILE + plotPx / 2;
    const cy = tile.ty * TILE + plotPx / 2;
    const playerDist = Math.sqrt((cx - player.x) ** 2 + (cy - player.y) ** 2);
    if (playerDist > maxReachPx) continue;
    const dist = Math.sqrt((cx - targetX) ** 2 + (cy - targetY) ** 2);
    if (dist < bestDist) {
      bestDist = dist;
      bestTile = tile;
    }
  }

  return bestTile;
}

// ===================== EXPAND FARM GRID =====================
// Called when buying a land expansion — preserves existing tiles, adds new ones.
function expandFarmGrid(newLandLevel) {
  const zone = levelEntities.find(e => e.type === 'farm_zone');
  if (!zone) return;

  const exp = getLandExpansion(newLandLevel);
  const gridW = exp.gridW;
  const gridH = exp.gridH;
  const tilesW = gridW * PLOT_SIZE;
  const tilesH = gridH * PLOT_SIZE;

  const zoneW = zone.w || 12;
  const zoneH = zone.h || 12;
  const startTX = zone.tx + Math.floor((zoneW - tilesW) / 2);
  const startTY = zone.ty + Math.floor((zoneH - tilesH) / 2);

  // Build set of existing tile positions
  const existing = new Set();
  for (const tile of farmingState.tiles) {
    existing.add(tile.tx + ',' + tile.ty);
  }

  // Add new tiles for expanded area
  for (let dy = 0; dy < gridH; dy++) {
    for (let dx = 0; dx < gridW; dx++) {
      const tx = startTX + dx * PLOT_SIZE;
      const ty = startTY + dy * PLOT_SIZE;
      if (!existing.has(tx + ',' + ty)) {
        farmingState.tiles.push({
          tx: tx, ty: ty,
          state: FARM_TILE_STATES.EMPTY,
          cropId: null, growthTimer: 0,
        });
      }
    }
  }

  // Remove tiles outside the new grid bounds
  const endTX = startTX + tilesW;
  const endTY = startTY + tilesH;
  farmingState.tiles = farmingState.tiles.filter(t =>
    t.tx >= startTX && t.tx < endTX && t.ty >= startTY && t.ty < endTY
  );
}

// ===================== DRAW: WORLD-SPACE FARM TILES =====================
function drawFarmTiles() {
  if (!farmingState.active || !Scene.inFarm) return;

  const ps = PLOT_SIZE * TILE; // plot size in pixels (96)

  for (const tile of farmingState.tiles) {
    const x = tile.tx * TILE;
    const y = tile.ty * TILE;
    const cx = x + ps / 2;
    const cy = y + ps / 2;

    if (tile.state === FARM_TILE_STATES.EMPTY) {
      // Visible grid square
      ctx.fillStyle = 'rgba(90,70,40,0.25)';
      ctx.fillRect(x + 2, y + 2, ps - 4, ps - 4);
      ctx.strokeStyle = 'rgba(180,150,100,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, ps - 4, ps - 4);
      continue;
    }

    if (tile.state === FARM_TILE_STATES.TILLED) {
      // Dark tilled soil with furrow lines
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(x + 2, y + 2, ps - 4, ps - 4);
      ctx.strokeStyle = 'rgba(40,25,10,0.4)';
      ctx.lineWidth = 1;
      for (let fy = 8; fy < ps - 4; fy += 12) {
        ctx.beginPath(); ctx.moveTo(x + 6, y + fy); ctx.lineTo(x + ps - 6, y + fy); ctx.stroke();
      }
      continue;
    }

    // Planted / Growing / Harvestable — soil + crop
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(x + 2, y + 2, ps - 4, ps - 4);
    ctx.strokeStyle = 'rgba(40,25,10,0.3)';
    ctx.lineWidth = 1;
    for (let fy = 8; fy < ps - 4; fy += 12) {
      ctx.beginPath(); ctx.moveTo(x + 6, y + fy); ctx.lineTo(x + ps - 6, y + fy); ctx.stroke();
    }

    // Draw crop — scaled up for 2x2 plots
    const crop = CROP_TYPES[tile.cropId];
    if (!crop) continue;

    const progress = tile.state === FARM_TILE_STATES.HARVESTABLE ? 1.0
      : Math.min(1.0, tile.growthTimer / crop.growthFrames);
    const stage = Math.floor(progress * 3); // 0-3

    if (stage === 0) {
      ctx.fillStyle = crop.color;
      ctx.beginPath(); ctx.arc(cx, cy + 10, 5, 0, Math.PI * 2); ctx.fill();
    } else if (stage === 1) {
      ctx.strokeStyle = '#4a8030'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + 14); ctx.lineTo(cx, cy - 2); ctx.stroke();
      ctx.fillStyle = '#5a9a40';
      ctx.beginPath(); ctx.arc(cx - 6, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
    } else if (stage === 2) {
      ctx.strokeStyle = '#3a7020'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + 16); ctx.lineTo(cx, cy - 8); ctx.stroke();
      ctx.fillStyle = '#4a9030';
      ctx.beginPath(); ctx.arc(cx - 8, cy - 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 8, cy - 4, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 10, 6, 0, Math.PI * 2); ctx.fill();
    } else {
      // Mature — large with crop color fruit
      ctx.strokeStyle = '#2a6010'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(cx, cy + 18); ctx.lineTo(cx, cy - 12); ctx.stroke();
      ctx.fillStyle = '#3a8020';
      ctx.beginPath(); ctx.arc(cx - 10, cy - 6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 10, cy - 6, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 16, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = crop.color;
      ctx.beginPath(); ctx.arc(cx - 7, cy - 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 7, cy - 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 20, 6, 0, Math.PI * 2); ctx.fill();
    }

    // Harvestable sparkle
    if (tile.state === FARM_TILE_STATES.HARVESTABLE) {
      const t = Date.now() / 1000;
      const sparkle = 0.4 + Math.sin(t * 4 + tile.tx * 3 + tile.ty * 7) * 0.3;
      ctx.fillStyle = `rgba(255,255,200,${sparkle})`;
      ctx.beginPath(); ctx.arc(cx + Math.sin(t * 3) * 10, cy - 24, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + Math.cos(t * 2.5) * 12, cy - 18, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Hoe swing uses the standard melee swing animation (no custom arc)
}

// ===================== DRAW: COUNTDOWN BUBBLE =====================
// Shows remaining time above the faced growing tile.
function drawFarmCountdownBubble() {
  if (!farmingState.active || !Scene.inFarm) return;

  const tile = getFarmTileAtAction();
  if (!tile || tile.state !== FARM_TILE_STATES.GROWING) return;

  const crop = CROP_TYPES[tile.cropId];
  if (!crop) return;

  const remaining = Math.max(0, crop.growthFrames - tile.growthTimer);
  const secs = Math.ceil(remaining / 60);
  const text = secs + 's';

  const x = tile.tx * TILE + PLOT_SIZE * TILE / 2;
  const y = tile.ty * TILE - 8;

  // Bubble background
  ctx.font = 'bold 11px monospace';
  const tw = ctx.measureText(text).width;
  const bw = tw + 12;
  const bh = 18;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath(); ctx.roundRect(x - bw / 2, y - bh, bw, bh, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(80,160,60,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x - bw / 2, y - bh, bw, bh, 4); ctx.stroke();

  // Text
  ctx.fillStyle = '#80c060';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y - 4);
  ctx.textAlign = 'left';
}

// ===================== DRAW: SCREEN-SPACE FARMING HUD =====================
function drawFarmingHUD() {
  if (!farmingState.active || !Scene.inFarm) return;
  if (typeof UI !== 'undefined' && UI.isOpen('farmVendor')) return;

  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const crops = getUnlockedCrops(farmLevel);

  // === SELECTED SEED DISPLAY (bottom-center, always visible) ===
  const selCrop = farmingState.selectedSeed ? CROP_TYPES[farmingState.selectedSeed] : null;
  const panelW = 280;
  const panelH = 72;
  const panelX = BASE_W / 2 - panelW / 2;
  const panelY = BASE_H - panelH - 16;

  // Solid dark panel background
  ctx.fillStyle = '#0a0e08';
  ctx.fillRect(panelX, panelY, panelW, panelH);
  // Green border
  ctx.strokeStyle = '#5a9a40';
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  if (selCrop) {
    // Crop color square
    ctx.fillStyle = selCrop.color;
    ctx.fillRect(panelX + 10, panelY + 10, 52, 52);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(panelX + 10, panelY + 10, 52, 52);

    // Seed count badge on the crop square
    const _seedInvId = 'seed_' + farmingState.selectedSeed;
    let _seedCount = 0;
    for (let _si = 0; _si < inventory.length; _si++) {
      if (inventory[_si] && inventory[_si].id === _seedInvId && inventory[_si].type === 'resource') {
        _seedCount = inventory[_si].count || 0;
        break;
      }
    }
    ctx.fillStyle = _seedCount > 0 ? 'rgba(0,0,0,0.7)' : 'rgba(80,0,0,0.8)';
    ctx.beginPath(); ctx.roundRect(panelX + 36, panelY + 40, 28, 16, 4); ctx.fill();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = _seedCount > 0 ? '#ffd700' : '#ff4040';
    ctx.textAlign = 'center';
    ctx.fillText('x' + _seedCount, panelX + 50, panelY + 53);
    ctx.textAlign = 'left';

    // Crop name (large)
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#d0ffa0';
    ctx.textAlign = 'left';
    ctx.fillText(selCrop.name, panelX + 72, panelY + 28);

    // Seed count + grow time
    ctx.font = '13px monospace';
    ctx.fillStyle = _seedCount > 0 ? '#ffd700' : '#aa4444';
    ctx.fillText('Seeds: ' + _seedCount, panelX + 72, panelY + 46);
    ctx.fillStyle = '#8a8a8a';
    ctx.fillText('Grows: ' + (selCrop.growthFrames / 60).toFixed(0) + 's', panelX + 170, panelY + 46);

    // Sell price
    ctx.fillStyle = '#70b050';
    ctx.fillText('Sells: ' + selCrop.sellPrice + 'g', panelX + 72, panelY + 62);
  } else {
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('No seed selected', panelX + 20, panelY + 40);
  }

  // Hotkey hint (right side)
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#5a8a40';
  ctx.textAlign = 'right';
  ctx.fillText('[1-' + crops.length + '] Switch', panelX + panelW - 10, panelY + 62);

  // Gold display (top-right of panel)
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(gold + 'g', panelX + panelW - 10, panelY + 18);
  ctx.textAlign = 'left';

  // === FARMING INFO (top-left) ===
  ctx.fillStyle = '#0a0e08';
  ctx.fillRect(12, 10, 280, 68);
  ctx.strokeStyle = '#5a9a40';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 10, 280, 68);

  // Farming level
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#8ac060';
  ctx.fillText('Farming Lv.' + farmLevel, 22, 34);

  // Stats
  ctx.font = '12px monospace';
  ctx.fillStyle = '#999';
  ctx.fillText('Harvested: ' + farmingState.stats.totalHarvested + '  |  Earned: ' + farmingState.stats.totalEarned + 'g', 22, 52);

  // Instructions
  ctx.font = '11px monospace';
  ctx.fillStyle = '#607050';
  ctx.fillText('[F] Farm action  [1-9] Seeds  [E] Shop', 22, 68);

  // Bucket status (if owned)
  if (farmingState.bucketOwned) {
    ctx.fillStyle = farmingState.bucketFilled ? 'rgba(40,80,120,0.8)' : 'rgba(30,30,30,0.8)';
    ctx.beginPath(); ctx.roundRect(300, 10, 120, 32, 6); ctx.fill();
    ctx.strokeStyle = farmingState.bucketFilled ? '#40a0ff' : '#555';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(300, 10, 120, 32, 6); ctx.stroke();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = farmingState.bucketFilled ? '#40a0ff' : '#888';
    ctx.fillText(farmingState.bucketFilled ? 'Bucket: FULL' : 'Bucket: Empty', 310, 30);
  }
}

// ===================== SEED SELECTION (keyboard) =====================
function handleFarmSeedSelect(keyNum) {
  if (!farmingState.active || !Scene.inFarm) return false;
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const crops = getUnlockedCrops(farmLevel);
  const idx = keyNum - 1;
  if (idx >= 0 && idx < crops.length) {
    farmingState.selectedSeed = crops[idx].id;
    return true;
  }
  return false;
}

// ===================== FARM VENDOR =====================
let farmVendorTab = 0; // 0=Seeds, 1=Equipment, 2=Acres, 3=Sell
let farmVendorQty = 1; // quantity selector for garden shop purchases
let farmVendorQtyItem = null; // item currently in quantity selector (null = no selector shown)
let farmVendorQtyTyping = false; // true when user is typing quantity
let farmVendorQtyStr = ''; // typed digit string
const FARM_VENDOR_PW = 540;
const FARM_VENDOR_PH = 480;

function getFarmVendorSeedItems() {
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const items = [];
  for (const id in CROP_TYPES) {
    const crop = CROP_TYPES[id];
    const locked = !window._opMode && farmLevel < crop.levelReq;
    const gardenLocked = !window._opMode && crop.gardenReq > farmingState.landLevel;
    // Count seeds in inventory
    const seedInvId = 'seed_' + crop.id;
    let owned = 0;
    for (let si = 0; si < inventory.length; si++) {
      if (inventory[si] && inventory[si].id === seedInvId && inventory[si].type === 'resource') {
        owned = inventory[si].count || 0;
        break;
      }
    }
    items.push({
      type: 'seed',
      id: crop.id,
      name: crop.name + ' Seeds',
      desc: 'Grows in ' + (crop.growthFrames / 60).toFixed(0) + 's · Sells for ' + crop.sellPrice + 'g',
      cost: crop.seedCost,
      color: crop.color,
      isLocked: locked || gardenLocked,
      lockReason: locked ? 'Lv.' + crop.levelReq : gardenLocked ? LAND_EXPANSIONS[crop.gardenReq].name : '',
      ownedCount: owned,
    });
  }
  return items;
}

function getFarmVendorEquipItems() {
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const items = [];
  // Hoe tiers — always purchasable, never "Owned"
  for (const hoe of HOE_TIERS) {
    const locked = !window._opMode && farmLevel < hoe.levelReq;
    let invCount = 0;
    for (let si = 0; si < inventory.length; si++) {
      if (inventory[si] && inventory[si].id === hoe.id && inventory[si].type === 'resource') {
        invCount = inventory[si].count || 0;
        break;
      }
    }
    const isEquipped = farmingState.equippedHoe === hoe.id;
    items.push({
      type: 'hoe',
      id: hoe.id,
      name: hoe.name,
      desc: hoe.desc + ' · Reach: ' + hoe.reach + ' · Swing: ' + hoe.swingTiles + ' tiles',
      cost: hoe.cost,
      color: hoe.color,
      isLocked: locked,
      lockReason: locked ? 'Lv.' + hoe.levelReq : '',
      hoeData: hoe,
      invCount: invCount,
      isEquipped: isEquipped,
    });
  }
  // Metal Bucket — one-time purchase
  const bData = typeof BUCKET_DATA !== 'undefined' ? BUCKET_DATA : null;
  if (bData) {
    const bLocked = !window._opMode && farmLevel < bData.levelReq;
    const bOwned = farmingState.bucketOwned;
    items.push({
      type: 'bucket',
      id: bData.id,
      name: bData.name,
      desc: bData.desc,
      cost: bData.cost,
      color: bData.color,
      isLocked: bLocked,
      lockReason: bLocked ? 'Lv.' + bData.levelReq : '',
      invCount: bOwned ? 1 : 0,
      isEquipped: false,
      isOwned: bOwned,
    });
  }
  return items;
}

function getFarmVendorAcreItems() {
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const items = [];
  for (let i = 1; i < LAND_EXPANSIONS.length; i++) {
    const exp = LAND_EXPANSIONS[i];
    const owned = farmingState.landLevel >= i;
    const locked = !window._opMode && farmLevel < exp.levelReq;
    items.push({
      type: 'land',
      id: 'land_' + i,
      name: exp.name + ' (' + exp.gridW + 'x' + exp.gridH + ')',
      desc: (exp.gridW * exp.gridH) + ' plots total',
      cost: exp.cost,
      color: '#8a7040',
      isLocked: locked,
      isOwned: owned,
      lockReason: locked ? 'Lv.' + exp.levelReq : '',
      landLevel: i,
    });
  }
  return items;
}

function drawFarmVendorPanel() {
  if (!UI.isOpen('farmVendor')) return;

  const pw = FARM_VENDOR_PW, ph = FARM_VENDOR_PH;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Dimmed backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = 'rgba(12,18,10,0.94)';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(100,180,80,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke();

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#8ac060';
  ctx.fillText('Garden Shop', px + pw / 2, py + 28);

  // Gold display
  ctx.font = '13px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText(gold + 'g', px + pw - 16, py + 28);

  // Close button
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ff6060';
  ctx.fillText('X', px + pw - 20, py + 20);

  // Tabs
  const tabY = py + 44;
  const tabNames = ['Seeds', 'Equipment', 'Acres', 'Sell'];
  const tabW = (pw - 40) / 4;
  for (let i = 0; i < 4; i++) {
    const tx = px + 20 + i * tabW;
    ctx.fillStyle = farmVendorTab === i ? 'rgba(80,160,60,0.25)' : 'rgba(20,30,20,0.6)';
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW - 6, 28, 5); ctx.fill();
    if (farmVendorTab === i) {
      ctx.strokeStyle = '#8ac060'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tx, tabY, tabW - 6, 28, 5); ctx.stroke();
    }
    ctx.fillStyle = farmVendorTab === i ? '#c0e0a0' : '#506040';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tabNames[i], tx + (tabW - 6) / 2, tabY + 19);
  }

  const contentY = tabY + 38;
  const maxY = py + ph - 14;

  if (farmVendorTab === 0) {
    // SEEDS TAB
    const items = getFarmVendorSeedItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (iy + 40 > maxY) break;

      const canBuy = !item.isLocked && gold >= item.cost;
      ctx.fillStyle = canBuy ? 'rgba(40,60,30,0.6)' : 'rgba(20,25,18,0.6)';
      ctx.beginPath(); ctx.roundRect(px + 14, iy, pw - 28, 38, 6); ctx.fill();

      // Crop color dot
      ctx.fillStyle = item.color;
      ctx.beginPath(); ctx.arc(px + 30, iy + 19, 6, 0, Math.PI * 2); ctx.fill();

      // Name
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = item.isLocked ? '#505050' : '#d0e8c0';
      ctx.fillText(item.name, px + 44, iy + 16);

      // Desc
      ctx.font = '10px monospace';
      ctx.fillStyle = '#607050';
      ctx.fillText(item.desc, px + 44, iy + 30);

      // Owned count badge
      if (item.ownedCount > 0) {
        ctx.textAlign = 'right';
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#80c060';
        ctx.fillText('x' + item.ownedCount, px + pw - 22, iy + 34);
      }

      // Price / locked
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      if (item.isLocked) {
        ctx.fillStyle = '#804040';
        ctx.fillText(item.lockReason, px + pw - 22, iy + 22);
      } else {
        ctx.fillStyle = gold >= item.cost ? '#ffd700' : '#804040';
        ctx.fillText(item.cost + 'g', px + pw - 22, iy + 22);
      }
    }

    // Quantity selector overlay (shown when an item is selected)
    if (farmVendorQtyItem) {
      const qItem = farmVendorQtyItem;
      const qW = 280, qH = 90;
      const qX = px + pw / 2 - qW / 2, qY = py + ph - qH - 20;
      ctx.fillStyle = 'rgba(8,12,6,0.96)';
      ctx.beginPath(); ctx.roundRect(qX, qY, qW, qH, 8); ctx.fill();
      ctx.strokeStyle = '#8ac060';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(qX, qY, qW, qH, 8); ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#d0e8c0';
      ctx.fillText('Buy ' + qItem.name, qX + qW / 2, qY + 18);

      // Quantity controls: [-] [qty] [+]
      const btnSize = 32;
      const qCenterX = qX + qW / 2;
      const qBtnY = qY + 26;

      // Minus button
      ctx.fillStyle = 'rgba(60,30,30,0.8)';
      ctx.beginPath(); ctx.roundRect(qCenterX - 70, qBtnY, btnSize, btnSize, 6); ctx.fill();
      ctx.strokeStyle = '#ff6060'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(qCenterX - 70, qBtnY, btnSize, btnSize, 6); ctx.stroke();
      ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#ff6060';
      ctx.fillText('-', qCenterX - 70 + btnSize / 2, qBtnY + 23);

      // Quantity display (clickable — click to type)
      ctx.fillStyle = farmVendorQtyTyping ? 'rgba(30,50,30,0.9)' : 'rgba(20,30,20,0.8)';
      ctx.beginPath(); ctx.roundRect(qCenterX - 30, qBtnY, 60, btnSize, 4); ctx.fill();
      if (farmVendorQtyTyping) {
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(qCenterX - 30, qBtnY, 60, btnSize, 4); ctx.stroke();
      }
      ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#ffd700';
      const qtyDisplay = farmVendorQtyTyping ? (farmVendorQtyStr || '_') : '' + farmVendorQty;
      ctx.fillText(qtyDisplay, qCenterX, qBtnY + 22);

      // Plus button
      ctx.fillStyle = 'rgba(30,60,30,0.8)';
      ctx.beginPath(); ctx.roundRect(qCenterX + 38, qBtnY, btnSize, btnSize, 6); ctx.fill();
      ctx.strokeStyle = '#80c060'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(qCenterX + 38, qBtnY, btnSize, btnSize, 6); ctx.stroke();
      ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#80c060';
      ctx.fillText('+', qCenterX + 38 + btnSize / 2, qBtnY + 23);

      // Total price + Buy button
      const totalCost = qItem.cost * farmVendorQty;
      const canAfford = gold >= totalCost;
      ctx.font = '11px monospace';
      ctx.fillStyle = canAfford ? '#ffd700' : '#804040';
      ctx.fillText('Total: ' + totalCost + 'g', qCenterX - 40, qY + qH - 10);

      // Buy button
      ctx.fillStyle = canAfford ? 'rgba(40,80,30,0.9)' : 'rgba(40,30,30,0.6)';
      ctx.beginPath(); ctx.roundRect(qCenterX + 30, qY + qH - 26, 60, 22, 5); ctx.fill();
      ctx.strokeStyle = canAfford ? '#80c060' : '#804040'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(qCenterX + 30, qY + qH - 26, 60, 22, 5); ctx.stroke();
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = canAfford ? '#c0e8a0' : '#666';
      ctx.fillText('BUY', qCenterX + 60, qY + qH - 11);
    }
  } else if (farmVendorTab === 1) {
    // EQUIPMENT TAB (hoes only — always purchasable, never "Owned")
    const items = getFarmVendorEquipItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (iy + 40 > maxY) break;

      const canBuy = !item.isLocked && gold >= item.cost;
      ctx.fillStyle = canBuy ? 'rgba(40,60,30,0.6)' : 'rgba(20,25,18,0.6)';
      ctx.beginPath(); ctx.roundRect(px + 14, iy, pw - 28, 38, 6); ctx.fill();

      // Equipped indicator (green left border)
      if (item.isEquipped) {
        ctx.fillStyle = '#5fca80';
        ctx.fillRect(px + 14, iy, 3, 38);
      }

      // Hoe color dot
      ctx.fillStyle = item.color;
      ctx.beginPath(); ctx.arc(px + 30, iy + 19, 6, 0, Math.PI * 2); ctx.fill();

      // Name + equipped badge
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = item.isLocked ? '#505050' : '#d0e8c0';
      ctx.fillText(item.name, px + 44, iy + 16);
      if (item.isEquipped) {
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = '#5fca80';
        ctx.fillText('[EQUIPPED]', px + 44 + ctx.measureText(item.name).width + 6, iy + 16);
      }

      // Desc
      ctx.font = '10px monospace';
      ctx.fillStyle = '#607050';
      ctx.fillText(item.desc, px + 44, iy + 30);

      // Inventory count (bottom-right)
      if (item.invCount > 0) {
        ctx.textAlign = 'right';
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#80c060';
        ctx.fillText('Owned: ' + item.invCount, px + pw - 22, iy + 34);
      }

      // Price / locked / owned (bucket is one-time purchase)
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      if (item.isLocked) {
        ctx.fillStyle = '#804040';
        ctx.fillText(item.lockReason, px + pw - 22, iy + 22);
      } else if (item.isOwned) {
        ctx.fillStyle = '#60a060';
        ctx.fillText('OWNED', px + pw - 22, iy + 22);
      } else {
        ctx.fillStyle = gold >= item.cost ? '#ffd700' : '#804040';
        ctx.fillText(item.cost + 'g', px + pw - 22, iy + 22);
      }
    }
  } else if (farmVendorTab === 2) {
    // ACRES TAB (land expansions)
    const items = getFarmVendorAcreItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (iy + 40 > maxY) break;

      const canBuy = !item.isLocked && !item.isOwned && gold >= item.cost;
      ctx.fillStyle = canBuy ? 'rgba(40,60,30,0.6)' : item.isOwned ? 'rgba(20,40,20,0.6)' : 'rgba(20,25,18,0.6)';
      ctx.beginPath(); ctx.roundRect(px + 14, iy, pw - 28, 38, 6); ctx.fill();

      // Land icon
      ctx.fillStyle = item.color;
      ctx.fillRect(px + 24, iy + 12, 12, 12);
      ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 1;
      ctx.strokeRect(px + 24, iy + 12, 12, 12);

      // Name
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = item.isLocked ? '#505050' : item.isOwned ? '#60a060' : '#d0e8c0';
      ctx.fillText(item.name, px + 44, iy + 16);

      // Desc
      ctx.font = '10px monospace';
      ctx.fillStyle = '#607050';
      ctx.fillText(item.desc, px + 44, iy + 30);

      // Price / owned / locked
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      if (item.isLocked) {
        ctx.fillStyle = '#804040';
        ctx.fillText(item.lockReason, px + pw - 22, iy + 22);
      } else if (item.isOwned) {
        ctx.fillStyle = '#60a060';
        ctx.fillText('OWNED', px + pw - 22, iy + 22);
      } else {
        ctx.fillStyle = gold >= item.cost ? '#ffd700' : '#804040';
        ctx.fillText(item.cost + 'g', px + pw - 22, iy + 22);
      }
    }
  } else {
    // SELL TAB — sell harvested crops
    ctx.textAlign = 'center';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#607050';
    ctx.fillText('Crops auto-sell on harvest. Total earned: ' + farmingState.stats.totalEarned + 'g', px + pw / 2, contentY + 30);
    ctx.fillText('Harvested: ' + farmingState.stats.totalHarvested + ' crops', px + pw / 2, contentY + 50);
    if (farmingState.stats.bestCrop) {
      ctx.fillText('Best crop: ' + farmingState.stats.bestCrop + ' (' + farmingState.stats.bestCropValue + 'g)', px + pw / 2, contentY + 70);
    }
  }

  ctx.textAlign = 'left';
}

function handleFarmVendorClick(mx, my) {
  if (!UI.isOpen('farmVendor')) return false;

  const pw = FARM_VENDOR_PW, ph = FARM_VENDOR_PH;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Close button
  if (mx >= px + pw - 36 && mx <= px + pw - 4 && my >= py + 4 && my <= py + 32) {
    UI.close(); return true;
  }

  // Tab clicks
  const tabY = py + 44;
  const tabW = (pw - 40) / 4;
  for (let i = 0; i < 4; i++) {
    const tx = px + 20 + i * tabW;
    if (mx >= tx && mx <= tx + tabW - 6 && my >= tabY && my <= tabY + 28) {
      farmVendorTab = i;
      farmVendorQtyItem = null;
      farmVendorQty = 1;
      farmVendorQtyTyping = false;
      return true;
    }
  }

  const contentY = tabY + 38;

  if (farmVendorTab === 0) {
    // Quantity selector click handling (if visible)
    if (farmVendorQtyItem) {
      const qW = 280, qH = 90;
      const qX = px + pw / 2 - qW / 2, qY = py + ph - qH - 20;
      const btnSize = 32;
      const qCenterX = qX + qW / 2;
      const qBtnY = qY + 26;

      // Quantity display click — enter typing mode
      if (mx >= qCenterX - 30 && mx <= qCenterX + 30 && my >= qBtnY && my <= qBtnY + btnSize) {
        farmVendorQtyTyping = true;
        farmVendorQtyStr = '';
        return true;
      }
      // Minus button
      if (mx >= qCenterX - 70 && mx <= qCenterX - 70 + btnSize && my >= qBtnY && my <= qBtnY + btnSize) {
        farmVendorQtyTyping = false;
        if (farmVendorQty > 1) farmVendorQty--;
        return true;
      }
      // Plus button
      if (mx >= qCenterX + 38 && mx <= qCenterX + 38 + btnSize && my >= qBtnY && my <= qBtnY + btnSize) {
        farmVendorQtyTyping = false;
        const maxAfford = Math.floor(gold / farmVendorQtyItem.cost);
        if (farmVendorQty < Math.max(1, maxAfford)) farmVendorQty++;
        return true;
      }
      // Buy button
      if (mx >= qCenterX + 30 && mx <= qCenterX + 90 && my >= qY + qH - 26 && my <= qY + qH - 4) {
        const totalCost = farmVendorQtyItem.cost * farmVendorQty;
        if (gold >= totalCost) {
          gold -= totalCost;
          const seedItem = {
            id: 'seed_' + farmVendorQtyItem.id,
            name: farmVendorQtyItem.name,
            type: 'resource',
            tier: 0,
            data: { id: 'seed_' + farmVendorQtyItem.id, name: farmVendorQtyItem.name, cropId: farmVendorQtyItem.id, color: farmVendorQtyItem.color },
            stackable: true,
            count: farmVendorQty,
          };
          addToInventory(seedItem);
          farmingState.selectedSeed = farmVendorQtyItem.id;
          hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Bought ' + farmVendorQty + 'x ' + farmVendorQtyItem.name + '!', color: farmVendorQtyItem.color });
          farmVendorQtyItem = null;
          farmVendorQty = 1;
          farmVendorQtyTyping = false;
        }
        return true;
      }
      // Click outside quantity selector = close it
      if (mx < qX || mx > qX + qW || my < qY || my > qY + qH) {
        farmVendorQtyItem = null;
        farmVendorQty = 1;
        farmVendorQtyTyping = false;
        return true;
      }
      return true; // consume click when quantity selector is open
    }

    // Seeds tab — click opens quantity selector instead of instant buy
    const items = getFarmVendorSeedItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (mx >= px + 14 && mx <= px + pw - 14 && my >= iy && my <= iy + 38) {
        if (item.isLocked) return true;
        if (gold < item.cost) return true;
        // Open quantity selector instead of instant buy
        farmVendorQtyItem = item;
        farmVendorQty = 1;
        return true;
      }
    }
  } else if (farmVendorTab === 1) {
    // Equipment tab — always purchasable, adds to inventory + auto-equips
    const items = getFarmVendorEquipItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (mx >= px + 14 && mx <= px + pw - 14 && my >= iy && my <= iy + 38) {
        if (item.isLocked) return true;
        if (item.isOwned) return true; // one-time purchase items
        if (gold < item.cost) return true;
        gold -= item.cost;
        if (item.type === 'hoe') {
          // Buy hoe — add to inventory as resource + auto-equip
          const hoeItem = {
            id: item.id, name: item.name, type: 'resource',
            tier: item.hoeData.tier,
            data: { id: item.id, name: item.name, special: 'farming', color: item.color, reach: item.hoeData.reach, cooldown: item.hoeData.cooldown, swingTiles: item.hoeData.swingTiles },
            stackable: true, count: 1,
          };
          addToInventory(hoeItem);
          farmingState.equippedHoe = item.id;
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: 'Bought ' + item.name + '!', color: '#ffd700' });
        } else if (item.type === 'bucket') {
          // Buy bucket
          const bucketItem = {
            id: item.id, name: item.name, type: 'resource',
            tier: 0,
            data: { id: item.id, name: item.name, special: 'bucket', color: item.color },
            stackable: true, count: 1,
          };
          addToInventory(bucketItem);
          farmingState.bucketOwned = true;
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: 'Bought ' + item.name + '!', color: '#40a0ff' });
        }
        return true;
      }
    }
  } else if (farmVendorTab === 2) {
    // Acres tab — buy land expansions
    const items = getFarmVendorAcreItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (mx >= px + 14 && mx <= px + pw - 14 && my >= iy && my <= iy + 38) {
        if (item.isLocked || item.isOwned) return true;
        if (gold < item.cost) return true;
        // Check if any tile has active crops
        const hasActiveCrops = farmingState.tiles.some(t =>
          t.state !== FARM_TILE_STATES.EMPTY && t.state !== FARM_TILE_STATES.TILLED
        );
        if (hasActiveCrops) {
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: 'Harvest your garden first!', color: '#ff6060' });
          return true;
        }
        // Buy land expansion
        gold -= item.cost;
        farmingState.landLevel = item.landLevel;
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: 'Expanded to ' + item.name + '!', color: '#ffd700' });
        expandFarmGrid(item.landLevel);
        return true;
      }
    }
  }

  return false;
}

// Handle keyboard input when quantity selector is open (typing mode)
function handleFarmVendorKey(key) {
  if (!farmVendorQtyItem || !farmVendorQtyTyping) return false;

  if (key >= '0' && key <= '9') {
    farmVendorQtyStr += key;
    if (farmVendorQtyStr.length > 4) farmVendorQtyStr = farmVendorQtyStr.substring(0, 4);
    const parsed = parseInt(farmVendorQtyStr, 10);
    if (parsed > 0) farmVendorQty = parsed;
    return true;
  }
  if (key === 'Backspace') {
    farmVendorQtyStr = farmVendorQtyStr.slice(0, -1);
    const parsed = parseInt(farmVendorQtyStr, 10);
    farmVendorQty = parsed > 0 ? parsed : 1;
    return true;
  }
  if (key === 'Enter') {
    farmVendorQtyTyping = false;
    if (farmVendorQty < 1) farmVendorQty = 1;
    return true;
  }
  if (key === 'Escape') {
    farmVendorQtyTyping = false;
    farmVendorQtyItem = null;
    farmVendorQty = 1;
    return true;
  }
  return false;
}
