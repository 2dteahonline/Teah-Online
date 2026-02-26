// ===================== FARMING SYSTEM =====================
// Authority: farm state, tile management, growth, HUD, vendor.
// Pattern follows fishingSystem.js — state + update + HUD + vendor.
//
// Depends on: CROP_TYPES, HOE_TIERS, FARMING_CONFIG, LAND_EXPANSIONS (farmingData.js)
//             Scene, level, levelEntities (sceneManager.js)
//             player, playerEquip, melee, gold (gameState.js)
//             hitEffects (gameState.js), UI (panelManager.js)
//             TILE (levelData.js), ctx, BASE_W, BASE_H (inline canvas)

// ===================== FARMING STATE =====================
const farmingState = {
  active: false,
  tiles: [],           // { tx, ty, state, cropId, growthTimer, watered, waterTimer }
  landLevel: 0,        // index into LAND_EXPANSIONS (persisted)
  selectedSeed: null,  // crop id currently selected for planting
  actionCooldown: 0,   // frames until next action allowed
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

  // Build tile grid based on land level
  const exp = getLandExpansion(farmingState.landLevel);
  const gridW = exp.gridW;
  const gridH = exp.gridH;

  // Center the grid within the farm zone
  const zoneW = zone.w || 38;
  const zoneH = zone.h || 18;
  const startTX = zone.tx + Math.floor((zoneW - gridW) / 2);
  const startTY = zone.ty + Math.floor((zoneH - gridH) / 2);

  for (let dy = 0; dy < gridH; dy++) {
    for (let dx = 0; dx < gridW; dx++) {
      farmingState.tiles.push({
        tx: startTX + dx,
        ty: startTY + dy,
        state: FARM_TILE_STATES.EMPTY,
        cropId: null,
        growthTimer: 0,
        watered: false,
        waterTimer: 0,
      });
    }
  }

  // Auto-select first unlocked seed
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const crops = getUnlockedCrops(farmLevel);
  if (crops.length > 0) {
    farmingState.selectedSeed = crops[0].id;
  }
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

  // Tick growth + water timers
  for (const tile of farmingState.tiles) {
    // Water timer decay
    if (tile.watered && tile.waterTimer > 0) {
      tile.waterTimer--;
      if (tile.waterTimer <= 0) {
        tile.watered = false;
      }
    }

    // Growth only happens while watered
    if (tile.watered && (tile.state === FARM_TILE_STATES.PLANTED || tile.state === FARM_TILE_STATES.GROWING)) {
      tile.growthTimer++;
      tile.state = FARM_TILE_STATES.GROWING;

      const crop = CROP_TYPES[tile.cropId];
      if (crop && tile.growthTimer >= crop.growthFrames) {
        tile.state = FARM_TILE_STATES.HARVESTABLE;
      }
    }
  }
}

// ===================== HOE SWING HANDLER =====================
function handleFarmSwing() {
  if (farmingState.actionCooldown > 0) return;

  const tile = getFarmTileAtSwing();
  if (!tile) return;

  const cfg = FARMING_CONFIG;

  switch (tile.state) {
    case FARM_TILE_STATES.EMPTY:
      // Till the soil
      tile.state = FARM_TILE_STATES.TILLED;
      farmingState.actionCooldown = cfg.tillCooldown;
      hitEffects.push({ x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 - 10, life: 20, type: 'text_popup', text: 'Tilled!', color: '#c0a060' });
      break;

    case FARM_TILE_STATES.TILLED:
      // Plant seed
      if (!farmingState.selectedSeed) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'No seed selected!', color: '#ff6060' });
        return;
      }
      const crop = CROP_TYPES[farmingState.selectedSeed];
      if (!crop) return;
      // Check farming level
      const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
      if (farmLevel < crop.levelReq) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Level ' + crop.levelReq + ' required!', color: '#ff6060' });
        return;
      }
      // Check gold for seed
      if (gold < crop.seedCost) {
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Need ' + crop.seedCost + 'g!', color: '#ff6060' });
        return;
      }
      gold -= crop.seedCost;
      tile.state = FARM_TILE_STATES.PLANTED;
      tile.cropId = farmingState.selectedSeed;
      tile.growthTimer = 0;
      farmingState.actionCooldown = cfg.plantCooldown;
      hitEffects.push({ x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 - 10, life: 20, type: 'text_popup', text: 'Planted ' + crop.name + '!', color: crop.color });
      break;

    case FARM_TILE_STATES.PLANTED:
    case FARM_TILE_STATES.GROWING:
      // Water the crop
      if (tile.watered) {
        hitEffects.push({ x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 - 10, life: 20, type: 'text_popup', text: 'Already watered!', color: '#6090c0' });
        return;
      }
      tile.watered = true;
      // Water duration from equipped hoe
      const hoe = getEquippedHoe();
      tile.waterTimer = hoe ? hoe.waterDuration : 1800;
      farmingState.actionCooldown = cfg.waterCooldown;
      hitEffects.push({ x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 - 10, life: 20, type: 'text_popup', text: 'Watered!', color: '#40a0ff' });
      break;

    case FARM_TILE_STATES.HARVESTABLE:
      // Harvest!
      const harvestCrop = CROP_TYPES[tile.cropId];
      if (!harvestCrop) break;
      // Award gold + XP
      gold += harvestCrop.sellPrice;
      if (typeof addSkillXP === 'function') addSkillXP('Farming', harvestCrop.xp);
      farmingState.stats.totalHarvested++;
      farmingState.stats.totalEarned += harvestCrop.sellPrice;
      if (harvestCrop.sellPrice > farmingState.stats.bestCropValue) {
        farmingState.stats.bestCrop = harvestCrop.name;
        farmingState.stats.bestCropValue = harvestCrop.sellPrice;
      }
      hitEffects.push({ x: tile.tx * TILE + TILE / 2, y: tile.ty * TILE + TILE / 2 - 10, life: 30, type: 'text_popup', text: '+' + harvestCrop.sellPrice + 'g  +' + harvestCrop.xp + ' XP', color: '#50d050' });
      // Reset tile to tilled (can re-plant)
      tile.state = FARM_TILE_STATES.TILLED;
      tile.cropId = null;
      tile.growthTimer = 0;
      tile.watered = false;
      tile.waterTimer = 0;
      farmingState.actionCooldown = cfg.harvestCooldown;
      break;
  }
}

// Get equipped hoe from player equipment
function getEquippedHoe() {
  const eq = playerEquip.melee;
  if (eq && eq.special === 'farming') return eq;
  return null;
}

// Find the farm tile the player is swinging at
function getFarmTileAtSwing() {
  const cfg = FARMING_CONFIG;
  // Player facing direction → tile offset
  const dir = player.dir; // 0=down, 1=up, 2=left, 3=right
  let checkTX = Math.floor(player.x / TILE);
  let checkTY = Math.floor(player.y / TILE);

  if (dir === 0) checkTY += 1;
  else if (dir === 1) checkTY -= 1;
  else if (dir === 2) checkTX -= 1;
  else if (dir === 3) checkTX += 1;

  // Find matching tile
  for (const tile of farmingState.tiles) {
    if (tile.tx === checkTX && tile.ty === checkTY) return tile;
  }

  // Also check tile the player is standing on
  const standTX = Math.floor(player.x / TILE);
  const standTY = Math.floor(player.y / TILE);
  for (const tile of farmingState.tiles) {
    if (tile.tx === standTX && tile.ty === standTY) return tile;
  }

  return null;
}

// ===================== DRAW: WORLD-SPACE FARM TILES =====================
function drawFarmTiles() {
  if (!farmingState.active || !Scene.inFarm) return;

  for (const tile of farmingState.tiles) {
    const x = tile.tx * TILE;
    const y = tile.ty * TILE;

    if (tile.state === FARM_TILE_STATES.EMPTY) {
      // Faint grid outline to show tillable area
      ctx.strokeStyle = 'rgba(180,150,100,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      continue;
    }

    if (tile.state === FARM_TILE_STATES.TILLED) {
      // Dark tilled soil with furrow lines
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.strokeStyle = 'rgba(40,25,10,0.4)';
      ctx.lineWidth = 1;
      for (let fy = 6; fy < TILE - 4; fy += 8) {
        ctx.beginPath(); ctx.moveTo(x + 4, y + fy); ctx.lineTo(x + TILE - 4, y + fy); ctx.stroke();
      }
      continue;
    }

    // Planted / Growing / Harvestable — show soil + crop
    // Soil base
    ctx.fillStyle = tile.watered ? '#4a3520' : '#5a4020';
    ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    // Furrows
    ctx.strokeStyle = 'rgba(40,25,10,0.3)';
    ctx.lineWidth = 1;
    for (let fy = 6; fy < TILE - 4; fy += 8) {
      ctx.beginPath(); ctx.moveTo(x + 4, y + fy); ctx.lineTo(x + TILE - 4, y + fy); ctx.stroke();
    }

    // Water tint
    if (tile.watered) {
      ctx.fillStyle = 'rgba(40,100,180,0.12)';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
    }

    // Draw crop at growth stage
    const crop = CROP_TYPES[tile.cropId];
    if (!crop) continue;

    const progress = tile.state === FARM_TILE_STATES.HARVESTABLE ? 1.0
      : Math.min(1.0, tile.growthTimer / crop.growthFrames);
    const stage = Math.floor(progress * (crop.stages - 1));
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;

    if (stage === 0) {
      // Seed / tiny sprout
      ctx.fillStyle = crop.color;
      ctx.beginPath(); ctx.arc(cx, cy + 6, 3, 0, Math.PI * 2); ctx.fill();
    } else if (stage === 1) {
      // Small sprout
      ctx.strokeStyle = '#4a8030'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy); ctx.stroke();
      ctx.fillStyle = '#5a9a40';
      ctx.beginPath(); ctx.arc(cx - 3, cy - 1, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 3, cy - 1, 3, 0, Math.PI * 2); ctx.fill();
    } else if (stage === 2) {
      // Medium plant
      ctx.strokeStyle = '#3a7020'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy - 4); ctx.stroke();
      ctx.fillStyle = '#4a9030';
      ctx.beginPath(); ctx.arc(cx - 5, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 6, 4, 0, Math.PI * 2); ctx.fill();
    } else if (stage === 3) {
      // Large plant with crop color showing
      ctx.strokeStyle = '#2a6010'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy - 8); ctx.stroke();
      ctx.fillStyle = '#3a8020';
      ctx.beginPath(); ctx.arc(cx - 6, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 6, cy - 4, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = crop.color;
      ctx.beginPath(); ctx.arc(cx, cy - 10, 3, 0, Math.PI * 2); ctx.fill();
    } else {
      // Fully grown / harvestable
      ctx.strokeStyle = '#2a6010'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy + 12); ctx.lineTo(cx, cy - 10); ctx.stroke();
      ctx.fillStyle = '#3a8020';
      ctx.beginPath(); ctx.arc(cx - 7, cy - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 7, cy - 6, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = crop.color;
      ctx.beginPath(); ctx.arc(cx - 4, cy - 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 4, cy - 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - 14, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Harvestable sparkle
    if (tile.state === FARM_TILE_STATES.HARVESTABLE) {
      const t = Date.now() / 1000;
      const sparkle = 0.4 + Math.sin(t * 4 + tile.tx * 3 + tile.ty * 7) * 0.3;
      ctx.fillStyle = `rgba(255,255,200,${sparkle})`;
      ctx.beginPath(); ctx.arc(cx + Math.sin(t * 3 + tile.tx) * 5, cy - 16, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + Math.cos(t * 2.5 + tile.ty) * 6, cy - 12, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ===================== DRAW: SCREEN-SPACE FARMING HUD =====================
function drawFarmingHUD() {
  if (!farmingState.active || !Scene.inFarm) return;
  if (typeof UI !== 'undefined' && UI.isOpen('farmVendor')) return;

  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const crops = getUnlockedCrops(farmLevel);

  // Seed selection bar (bottom-left)
  const barX = 20;
  const barY = BASE_H - 120;
  const seedW = 44;
  const seedH = 44;
  const gap = 6;

  // Background
  const totalW = crops.length * (seedW + gap) + 20;
  ctx.fillStyle = 'rgba(10,10,10,0.7)';
  ctx.beginPath(); ctx.roundRect(barX - 10, barY - 28, totalW, seedH + 48, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(100,180,80,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(barX - 10, barY - 28, totalW, seedH + 48, 8); ctx.stroke();

  // Title
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#8ac060';
  ctx.textAlign = 'left';
  ctx.fillText('🌱 SEEDS (1-9 to select)', barX, barY - 14);

  // Gold display
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('🪙 ' + gold + 'g', barX + totalW - 14, barY - 14);
  ctx.textAlign = 'left';

  for (let i = 0; i < crops.length; i++) {
    const crop = crops[i];
    const sx = barX + i * (seedW + gap);
    const sy = barY;
    const selected = farmingState.selectedSeed === crop.id;

    // Seed slot background
    ctx.fillStyle = selected ? 'rgba(80,160,60,0.25)' : 'rgba(30,30,30,0.6)';
    ctx.beginPath(); ctx.roundRect(sx, sy, seedW, seedH, 6); ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#8ac060'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(sx, sy, seedW, seedH, 6); ctx.stroke();
    }

    // Crop color dot
    ctx.fillStyle = crop.color;
    ctx.beginPath(); ctx.arc(sx + seedW / 2, sy + 16, 8, 0, Math.PI * 2); ctx.fill();

    // Crop name (tiny)
    ctx.font = '8px monospace';
    ctx.fillStyle = selected ? '#cfc' : '#888';
    ctx.textAlign = 'center';
    ctx.fillText(crop.name, sx + seedW / 2, sy + 34);

    // Cost
    ctx.font = '7px monospace';
    ctx.fillStyle = gold >= crop.seedCost ? '#ffd700' : '#664422';
    ctx.fillText(crop.seedCost + 'g', sx + seedW / 2, sy + 42);

    // Hotkey number
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText(String(i + 1), sx + seedW / 2, sy - 2);
  }
  ctx.textAlign = 'left';

  // Farming level display (top-left corner)
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#8ac060';
  ctx.fillText('🌾 Farming Lv.' + farmLevel, 20, 30);

  // Stats display
  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('Harvested: ' + farmingState.stats.totalHarvested + '  Earned: ' + farmingState.stats.totalEarned + 'g', 20, 48);
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
let farmVendorTab = 0; // 0=Seeds, 1=Equipment, 2=Sell
const FARM_VENDOR_PW = 540;
const FARM_VENDOR_PH = 480;

function getFarmVendorSeedItems() {
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const items = [];
  for (const id in CROP_TYPES) {
    const crop = CROP_TYPES[id];
    const locked = farmLevel < crop.levelReq;
    items.push({
      type: 'seed',
      id: crop.id,
      name: crop.name + ' Seeds',
      desc: 'Grows in ' + (crop.growthFrames / 60).toFixed(0) + 's · Sells for ' + crop.sellPrice + 'g',
      cost: crop.seedCost,
      color: crop.color,
      isLocked: locked,
      lockReason: locked ? 'Lv.' + crop.levelReq : '',
    });
  }
  return items;
}

function getFarmVendorEquipItems() {
  const farmLevel = typeof skillData !== 'undefined' && skillData['Farming'] ? skillData['Farming'].level : 1;
  const items = [];
  // Hoe tiers
  for (const hoe of HOE_TIERS) {
    const owned = playerEquip.melee && playerEquip.melee.id === hoe.id;
    const locked = farmLevel < hoe.levelReq;
    items.push({
      type: 'hoe',
      id: hoe.id,
      name: hoe.name,
      desc: hoe.desc,
      cost: hoe.cost,
      color: hoe.color,
      isLocked: locked,
      isOwned: owned,
      lockReason: locked ? 'Lv.' + hoe.levelReq : '',
      hoeData: hoe,
    });
  }
  // Land expansions
  for (let i = 1; i < LAND_EXPANSIONS.length; i++) {
    const exp = LAND_EXPANSIONS[i];
    const owned = farmingState.landLevel >= i;
    const locked = farmLevel < exp.levelReq;
    items.push({
      type: 'land',
      id: 'land_' + i,
      name: exp.name + ' (' + exp.gridW + 'x' + exp.gridH + ')',
      desc: 'Expand your farm plot',
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
  ctx.fillText('🌾 Farm Shop', px + pw / 2, py + 28);

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
  const tabNames = ['Seeds', 'Equipment', 'Sell'];
  const tabW = (pw - 40) / 3;
  for (let i = 0; i < 3; i++) {
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

  // Hoe + land level info line
  ctx.textAlign = 'left';
  ctx.font = '11px monospace';
  const _hoe = getEquippedHoe();
  ctx.fillStyle = '#80a060';
  ctx.fillText('Hoe: ' + (_hoe ? _hoe.name : 'None'), px + 20, tabY + 48);
  ctx.fillStyle = '#a0a060';
  const _land = getLandExpansion(farmingState.landLevel);
  ctx.fillText('Land: ' + _land.name + ' (' + _land.gridW + 'x' + _land.gridH + ')', px + 200, tabY + 48);

  const contentY = tabY + 58;
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

      // Price / locked
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      if (item.isLocked) {
        ctx.fillStyle = '#804040';
        ctx.fillText('🔒 ' + item.lockReason, px + pw - 22, iy + 22);
      } else {
        ctx.fillStyle = gold >= item.cost ? '#ffd700' : '#804040';
        ctx.fillText(item.cost + 'g', px + pw - 22, iy + 22);
      }
    }
  } else if (farmVendorTab === 1) {
    // EQUIPMENT TAB (hoes + land)
    const items = getFarmVendorEquipItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (iy + 40 > maxY) break;

      const canBuy = !item.isLocked && !item.isOwned && gold >= item.cost;
      ctx.fillStyle = canBuy ? 'rgba(40,60,30,0.6)' : item.isOwned ? 'rgba(20,40,20,0.6)' : 'rgba(20,25,18,0.6)';
      ctx.beginPath(); ctx.roundRect(px + 14, iy, pw - 28, 38, 6); ctx.fill();

      // Name
      ctx.textAlign = 'left';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = item.isLocked ? '#505050' : item.isOwned ? '#60a060' : '#d0e8c0';
      ctx.fillText(item.name, px + 22, iy + 16);

      // Desc
      ctx.font = '10px monospace';
      ctx.fillStyle = '#607050';
      ctx.fillText(item.desc, px + 22, iy + 30);

      // Price / owned / locked
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      if (item.isLocked) {
        ctx.fillStyle = '#804040';
        ctx.fillText('🔒 ' + item.lockReason, px + pw - 22, iy + 22);
      } else if (item.isOwned) {
        ctx.fillStyle = '#60a060';
        ctx.fillText('✓ OWNED', px + pw - 22, iy + 22);
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
  const tabW = (pw - 40) / 3;
  for (let i = 0; i < 3; i++) {
    const tx = px + 20 + i * tabW;
    if (mx >= tx && mx <= tx + tabW - 6 && my >= tabY && my <= tabY + 28) {
      farmVendorTab = i;
      return true;
    }
  }

  const contentY = tabY + 58;

  if (farmVendorTab === 0) {
    // Seeds tab — buy seed = select that seed type
    const items = getFarmVendorSeedItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (mx >= px + 14 && mx <= px + pw - 14 && my >= iy && my <= iy + 38) {
        if (!item.isLocked) {
          // Select this seed
          farmingState.selectedSeed = item.id;
          hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: 'text_popup', text: 'Selected: ' + item.name, color: item.color });
        }
        return true;
      }
    }
  } else if (farmVendorTab === 1) {
    // Equipment tab — buy hoe or land expansion
    const items = getFarmVendorEquipItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 44;
      if (mx >= px + 14 && mx <= px + pw - 14 && my >= iy && my <= iy + 38) {
        if (item.isLocked || item.isOwned) return true;
        if (gold < item.cost) return true;

        if (item.type === 'hoe') {
          // Buy hoe — add to inventory + equip
          gold -= item.cost;
          const newHoe = { ...item.hoeData, currentDurability: item.hoeData.durability };
          addToInventory(createItem('melee', newHoe));
          // Auto-equip
          playerEquip.melee = newHoe;
          melee.damage = newHoe.damage;
          melee.range = newHoe.range;
          melee.cooldownMax = newHoe.cooldown;
          melee.critChance = newHoe.critChance;
          melee.special = newHoe.special;
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: 'Bought ' + item.name + '!', color: '#ffd700' });
        } else if (item.type === 'land') {
          // Buy land expansion
          gold -= item.cost;
          farmingState.landLevel = item.landLevel;
          hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: 'Expanded to ' + item.name + '!', color: '#ffd700' });
          // Reinitialize farm tiles with new land level
          initFarmState();
        }
        return true;
      }
    }
  }

  return false;
}
