// ===================== FISHING SYSTEM =====================
// Authority: state machine, bait/rod management, catch calculation.
// Pattern matches miningSystem.js — called from update() in inventory.js.

const fishingState = {
  active: false,
  phase: 'idle',     // idle, casting, waiting, bite, reeling, result, cooldown
  timer: 0,
  targetFish: null,  // FISH_SPECIES entry for current catch attempt
  // Rod + Bait
  equippedRod: null,      // ROD_TIERS entry (null = no rod)
  rodDurability: 0,       // current durability remaining
  baitCount: 0,           // worm bait count
  // Reel mechanics
  reelTension: 0,         // 0-1 tension bar
  reelProgress: 0,        // 0-1 reel progress
  caught: false,          // result of last attempt
  resultMessage: '',      // "Caught Sardine!" or "The fish got away!"
  // Stats (persisted)
  stats: {
    totalCaught: 0,
    biggestFish: '',
    biggestFishValue: 0,
    totalCasts: 0,
  },
};

// Starter rod + bait — overwritten by save/load if save data exists
fishingState.equippedRod = ROD_TIERS[0]; // Bronze Rod
fishingState.rodDurability = ROD_TIERS[0].durability;
fishingState.baitCount = 10;

function startFishing() {
  if (fishingState.active) return;
  if (!fishingState.equippedRod || fishingState.rodDurability <= 0) {
    // Show "You need a rod!" message
    hitEffects.push({ x: player.x, y: player.y - 30, life: 40, type: 'text_popup', text: 'Need a rod!', color: '#ff6060' });
    return;
  }
  if (fishingState.baitCount <= 0) {
    hitEffects.push({ x: player.x, y: player.y - 30, life: 40, type: 'text_popup', text: 'No bait!', color: '#ff6060' });
    return;
  }
  fishingState.active = true;
  fishingState.phase = 'casting';
  fishingState.timer = FISHING_CONFIG.castFrames;
  fishingState.baitCount--;
  fishingState.rodDurability--;
  fishingState.stats.totalCasts++;
  fishingState.targetFish = null;
  fishingState.reelTension = 0;
  fishingState.reelProgress = 0;
  fishingState.caught = false;
  fishingState.resultMessage = '';
}

function cancelFishing() {
  fishingState.active = false;
  fishingState.phase = 'idle';
  fishingState.timer = 0;
  fishingState.targetFish = null;
  fishingState.reelTension = 0;
  fishingState.reelProgress = 0;
}

function updateFishing() {
  if (!fishingState.active) return;

  const cfg = FISHING_CONFIG;

  switch (fishingState.phase) {
    case 'casting':
      fishingState.timer--;
      if (fishingState.timer <= 0) {
        // Pick random wait time
        fishingState.phase = 'waiting';
        fishingState.timer = cfg.waitFramesMin + Math.floor(Math.random() * (cfg.waitFramesMax - cfg.waitFramesMin));
        // Pre-pick the fish that will bite
        fishingState.targetFish = pickRandomFish(fishingState.equippedRod.tier);
      }
      break;

    case 'waiting':
      fishingState.timer--;
      if (fishingState.timer <= 0) {
        fishingState.phase = 'bite';
        fishingState.timer = cfg.biteWindowFrames;
      }
      break;

    case 'bite':
      fishingState.timer--;
      // Player must press reel during this window
      if (InputIntent.reelPressed) {
        // Success — start reeling
        fishingState.phase = 'reeling';
        const fish = fishingState.targetFish;
        // Reel duration scales with fish difficulty
        fishingState.timer = Math.round(cfg.reelFramesMin + (cfg.reelFramesMax - cfg.reelFramesMin) * fish.difficulty);
        fishingState.reelTension = 0.5; // start at half
        fishingState.reelProgress = 0;
        break;
      }
      if (fishingState.timer <= 0) {
        // Missed the bite
        fishingState.resultMessage = 'Too slow! Fish got away...';
        fishingState.caught = false;
        fishingState.phase = 'result';
        fishingState.timer = cfg.resultFrames;
      }
      break;

    case 'reeling':
      fishingState.timer--;
      // Tension mechanics
      if (InputIntent.reelHeld) {
        fishingState.reelTension += cfg.tensionFillRate;
      } else {
        fishingState.reelTension -= cfg.tensionDecayRate;
      }
      fishingState.reelTension = Math.max(0, Math.min(1, fishingState.reelTension));

      // Progress increases when tension is in the sweet spot (0.3-0.8)
      if (fishingState.reelTension >= 0.3 && fishingState.reelTension <= 0.8) {
        fishingState.reelProgress += 0.008 + (1 - fishingState.targetFish.difficulty) * 0.005;
      }
      // Fish fights back (reduces progress slightly)
      fishingState.reelProgress -= fishingState.targetFish.difficulty * 0.003;
      fishingState.reelProgress = Math.max(0, Math.min(1, fishingState.reelProgress));

      // Line snaps if tension hits max
      if (fishingState.reelTension >= 1.0) {
        fishingState.resultMessage = 'Line snapped!';
        fishingState.caught = false;
        fishingState.phase = 'result';
        fishingState.timer = cfg.resultFrames;
        break;
      }

      // Successfully reeled in
      if (fishingState.reelProgress >= cfg.tensionCatchThreshold) {
        // Calculate catch chance
        const fishingLevel = skillData['Fishing'] ? skillData['Fishing'].level : 1;
        const catchChance = calculateCatchChance(fishingState.targetFish, fishingState.equippedRod, fishingLevel);
        if (Math.random() < catchChance) {
          // CAUGHT!
          awardFish(fishingState.targetFish);
          fishingState.caught = true;
          fishingState.resultMessage = 'Caught ' + fishingState.targetFish.name + '!';
        } else {
          fishingState.caught = false;
          fishingState.resultMessage = 'It escaped at the last moment!';
        }
        fishingState.phase = 'result';
        fishingState.timer = cfg.resultFrames;
        break;
      }

      // Ran out of time
      if (fishingState.timer <= 0) {
        fishingState.caught = false;
        fishingState.resultMessage = 'The fish got away!';
        fishingState.phase = 'result';
        fishingState.timer = cfg.resultFrames;
      }
      break;

    case 'result':
      fishingState.timer--;
      if (fishingState.timer <= 0) {
        // Check rod durability
        if (fishingState.rodDurability <= 0) {
          hitEffects.push({ x: player.x, y: player.y - 30, life: 50, type: 'text_popup', text: 'Your rod broke!', color: '#ff4040' });
          fishingState.equippedRod = null;
        }
        fishingState.phase = 'cooldown';
        fishingState.timer = cfg.cooldownFrames;
      }
      break;

    case 'cooldown':
      fishingState.timer--;
      if (fishingState.timer <= 0) {
        fishingState.active = false;
        fishingState.phase = 'idle';
      }
      break;
  }
}

function awardFish(fish) {
  // Create stackable fish item
  const fishItem = createConsumable('fish_' + fish.id, fish.name, 1);
  fishItem.data.sellPrice = fish.sellPrice;
  fishItem.data.color = fish.color;
  fishItem.data.isFish = true;
  addToInventory(fishItem);

  // Award XP
  if (typeof addSkillXP === 'function') {
    addSkillXP('Fishing', fish.xp);
  }

  // Update stats
  fishingState.stats.totalCaught++;
  if (fish.sellPrice > fishingState.stats.biggestFishValue) {
    fishingState.stats.biggestFish = fish.name;
    fishingState.stats.biggestFishValue = fish.sellPrice;
  }

  // Visual feedback
  hitEffects.push({ x: player.x, y: player.y - 40, life: 50, type: 'text_popup', text: '+' + fish.xp + ' Fishing XP', color: '#40c0ff' });
}

// --- FISHING HUD (called from draw.js) ---
function drawFishingHUD() {
  if (!fishingState.active) return;

  const cx = BASE_W / 2;
  const baseY = BASE_H - 180;

  // Background panel
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  const panelW = 320, panelH = 120;
  const px = cx - panelW / 2, py = baseY - 10;
  ctx.roundRect(px, py, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = '#4a6a8a';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';

  switch (fishingState.phase) {
    case 'casting':
      ctx.fillStyle = '#c0d8f0';
      ctx.fillText('Casting...', cx, baseY + 20);
      // Progress bar
      const castPct = 1 - (fishingState.timer / FISHING_CONFIG.castFrames);
      drawFishingBar(cx - 80, baseY + 35, 160, 12, castPct, '#4a8aff', '#1a3a6a');
      break;

    case 'waiting':
      ctx.fillStyle = '#90b0c0';
      ctx.fillText('Waiting for a bite...', cx, baseY + 20);
      // Bobber animation dots
      const dots = '.'.repeat(1 + Math.floor(renderTime / 400) % 3);
      ctx.fillText(dots, cx, baseY + 45);
      break;

    case 'bite':
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('! BITE !', cx, baseY + 20);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#e0d080';
      ctx.fillText('Press SPACE to reel!', cx, baseY + 45);
      // Urgency bar (time remaining)
      const bitePct = fishingState.timer / FISHING_CONFIG.biteWindowFrames;
      drawFishingBar(cx - 80, baseY + 55, 160, 8, bitePct, '#ffcc00', '#665500');
      break;

    case 'reeling': {
      ctx.fillStyle = '#60d0ff';
      ctx.fillText('Reeling: ' + fishingState.targetFish.name, cx, baseY + 12);

      // Tension bar (vertical thermometer style)
      ctx.font = '10px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('TENSION', cx, baseY + 28);
      const t = fishingState.reelTension;
      let tensionColor = '#40c040'; // green = safe
      if (t > 0.8) tensionColor = '#ff4040'; // red = danger (snap!)
      else if (t > 0.6) tensionColor = '#ffaa20'; // orange = risky
      else if (t < 0.3) tensionColor = '#6060a0'; // blue = too low
      drawFishingBar(cx - 80, baseY + 33, 160, 14, t, tensionColor, '#1a2a3a');

      // Sweet spot indicators on tension bar
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const barX = cx - 80;
      ctx.fillRect(barX + 160 * 0.3, baseY + 33, 160 * 0.5, 14);

      // Reel progress bar
      ctx.fillStyle = '#aaa';
      ctx.font = '10px monospace';
      ctx.fillText('REEL PROGRESS', cx, baseY + 62);
      drawFishingBar(cx - 80, baseY + 67, 160, 14, fishingState.reelProgress, '#30a0e0', '#0a2040');

      // Catch threshold marker
      ctx.fillStyle = '#ffd700';
      const threshX = barX + 160 * FISHING_CONFIG.tensionCatchThreshold;
      ctx.fillRect(threshX - 1, baseY + 67, 2, 14);

      ctx.font = '10px monospace';
      ctx.fillStyle = '#90a0b0';
      ctx.fillText('Hold SPACE to reel - keep tension in green zone', cx, baseY + 95);
      break;
    }

    case 'result':
      ctx.fillStyle = fishingState.caught ? '#40ff60' : '#ff6060';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(fishingState.resultMessage, cx, baseY + 30);
      if (fishingState.caught && fishingState.targetFish) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '12px monospace';
        ctx.fillText(fishingState.targetFish.sellPrice + 'g value', cx, baseY + 55);
      }
      break;

    case 'cooldown':
      ctx.fillStyle = '#808080';
      ctx.fillText('...', cx, baseY + 30);
      break;
  }

  // Rod + Bait status (always visible during fishing)
  ctx.textAlign = 'left';
  ctx.font = '11px monospace';
  ctx.fillStyle = '#b0c0d0';
  if (fishingState.equippedRod) {
    ctx.fillText(fishingState.equippedRod.name + ' [' + fishingState.rodDurability + '/' + fishingState.equippedRod.durability + ']', px + 8, py + panelH - 8);
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a0b060';
  ctx.fillText('Bait: ' + fishingState.baitCount, px + panelW - 8, py + panelH - 8);

  ctx.textAlign = 'left';
}

// Helper: draw a rounded progress bar
function drawFishingBar(x, y, w, h, pct, fillColor, bgColor) {
  pct = Math.max(0, Math.min(1, pct));
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (pct > 0.01) {
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(h, w * pct), h, h / 2);
    ctx.fill();
  }
}

// ===================== FISH VENDOR =====================
// Buy bait, buy rods (level-gated), sell fish from inventory.

let fishVendorTab = 0; // 0 = Buy, 1 = Sell

// Vendor items for the Buy tab
function getFishVendorBuyItems() {
  const fishingLevel = skillData['Fishing'] ? skillData['Fishing'].level : 1;
  const items = [];
  // Bait
  items.push({
    id: 'bait_worm_10', name: 'Worm Bait x10', desc: '10 worm bait',
    cost: 20, isBait: true, amount: 10,
    isLocked: false,
    action() { fishingState.baitCount += 10; return true; }
  });
  // Rods
  for (const rod of ROD_TIERS) {
    const owned = fishingState.equippedRod && fishingState.equippedRod.id === rod.id && fishingState.rodDurability > 0;
    items.push({
      id: rod.id, name: rod.name,
      desc: 'Durability: ' + rod.durability + ' | Str: ' + rod.strength,
      cost: rod.cost,
      isLocked: fishingLevel < rod.levelReq,
      lockReason: 'Fishing Lv.' + rod.levelReq,
      isOwned: owned,
      action() {
        fishingState.equippedRod = rod;
        fishingState.rodDurability = rod.durability;
        return true;
      }
    });
  }
  return items;
}

// Get fish items from inventory for selling
function getFishInventoryItems() {
  const fishItems = [];
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (item && item.data && item.data.isFish) {
      fishItems.push({ slot: i, item: item });
    }
  }
  return fishItems;
}

function sellFish(slot) {
  const item = inventory[slot];
  if (!item || !item.data || !item.data.isFish) return;
  const price = item.data.sellPrice || 1;
  gold += price;
  hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: 'text_popup', text: '+' + price + 'g', color: '#ffd700' });
  // Decrease stack or remove
  if (item.stackable && item.count > 1) {
    item.count--;
  } else {
    inventory.splice(slot, 1);
  }
}

function sellAllFish() {
  let totalGold = 0;
  for (let i = inventory.length - 1; i >= 0; i--) {
    const item = inventory[i];
    if (item && item.data && item.data.isFish) {
      const price = (item.data.sellPrice || 1) * (item.count || 1);
      totalGold += price;
      inventory.splice(i, 1);
    }
  }
  if (totalGold > 0) {
    gold += totalGold;
    hitEffects.push({ x: player.x, y: player.y - 30, life: 40, type: 'text_popup', text: '+' + totalGold + 'g', color: '#ffd700' });
  }
}

// --- VENDOR PANEL RENDERING ---
const FISH_VENDOR_PW = 420, FISH_VENDOR_PH = 380;

function drawFishVendorPanel() {
  if (!UI.isOpen('fishVendor')) return;

  const pw = FISH_VENDOR_PW, ph = FISH_VENDOR_PH;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Panel background
  ctx.fillStyle = 'rgba(15,20,30,0.92)';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 10);
  ctx.fill();
  ctx.strokeStyle = '#4a6a8a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#d0e0f0';
  ctx.fillText('Fish Vendor', px + pw / 2, py + 28);

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
  const tabNames = ['Buy', 'Sell'];
  for (let i = 0; i < 2; i++) {
    const tx = px + 20 + i * 100;
    ctx.fillStyle = fishVendorTab === i ? '#3a5a7a' : '#1a2a3a';
    ctx.beginPath();
    ctx.roundRect(tx, tabY, 90, 28, 5);
    ctx.fill();
    ctx.fillStyle = fishVendorTab === i ? '#e0f0ff' : '#607080';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(tabNames[i], tx + 45, tabY + 19);
  }

  // Bait/Rod status line
  ctx.textAlign = 'left';
  ctx.font = '11px monospace';
  ctx.fillStyle = '#a0b060';
  ctx.fillText('Bait: ' + fishingState.baitCount, px + 230, tabY + 19);
  ctx.fillStyle = '#b0c0d0';
  if (fishingState.equippedRod) {
    ctx.fillText('Rod: ' + fishingState.equippedRod.name + ' [' + fishingState.rodDurability + ']', px + 300, tabY + 19);
  } else {
    ctx.fillText('Rod: None', px + 300, tabY + 19);
  }

  const contentY = tabY + 38;

  if (fishVendorTab === 0) {
    // BUY TAB
    const items = getFishVendorBuyItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 48;
      if (iy + 44 > py + ph - 10) break;

      // Item row background
      const canBuy = !item.isLocked && !item.isOwned && gold >= item.cost;
      ctx.fillStyle = canBuy ? 'rgba(40,60,80,0.6)' : 'rgba(20,25,35,0.6)';
      ctx.beginPath();
      ctx.roundRect(px + 14, iy, pw - 28, 42, 6);
      ctx.fill();

      // Name
      ctx.textAlign = 'left';
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = item.isLocked ? '#606060' : item.isOwned ? '#60a060' : '#d0e0f0';
      ctx.fillText(item.name, px + 22, iy + 18);

      // Desc
      ctx.font = '10px monospace';
      ctx.fillStyle = '#708090';
      ctx.fillText(item.desc, px + 22, iy + 33);

      // Price / status
      ctx.textAlign = 'right';
      ctx.font = 'bold 12px monospace';
      if (item.isLocked) {
        ctx.fillStyle = '#804040';
        ctx.fillText(item.lockReason, px + pw - 22, iy + 18);
      } else if (item.isOwned) {
        ctx.fillStyle = '#60a060';
        ctx.fillText('OWNED', px + pw - 22, iy + 18);
      } else {
        ctx.fillStyle = gold >= item.cost ? '#ffd700' : '#804040';
        ctx.fillText(item.cost + 'g', px + pw - 22, iy + 18);
      }
    }
  } else {
    // SELL TAB
    const fishItems = getFishInventoryItems();
    if (fishItems.length === 0) {
      ctx.textAlign = 'center';
      ctx.font = '13px monospace';
      ctx.fillStyle = '#506070';
      ctx.fillText('No fish to sell', px + pw / 2, contentY + 40);
    } else {
      // Sell All button
      ctx.fillStyle = '#3a6040';
      ctx.beginPath();
      ctx.roundRect(px + pw - 120, contentY - 2, 106, 28, 5);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#a0f0a0';
      ctx.fillText('Sell All', px + pw - 67, contentY + 16);

      for (let i = 0; i < fishItems.length; i++) {
        const { item } = fishItems[i];
        const iy = contentY + 34 + i * 38;
        if (iy + 34 > py + ph - 10) break;

        ctx.fillStyle = 'rgba(40,60,80,0.5)';
        ctx.beginPath();
        ctx.roundRect(px + 14, iy, pw - 28, 32, 5);
        ctx.fill();

        // Fish color swatch
        ctx.fillStyle = item.data.color || '#4080a0';
        ctx.fillRect(px + 20, iy + 6, 20, 20);

        // Name + count
        ctx.textAlign = 'left';
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = '#d0e0f0';
        ctx.fillText(item.name + (item.count > 1 ? ' x' + item.count : ''), px + 48, iy + 15);

        // Price per unit
        ctx.font = '10px monospace';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(item.data.sellPrice + 'g each', px + 48, iy + 27);

        // Sell button
        ctx.fillStyle = '#4a6a3a';
        ctx.beginPath();
        ctx.roundRect(px + pw - 80, iy + 4, 56, 24, 4);
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = '#c0f0c0';
        ctx.fillText('Sell', px + pw - 52, iy + 20);
      }
    }
  }

  ctx.textAlign = 'left';
}

// --- VENDOR CLICK HANDLER (called from input.js mousedown) ---
function handleFishVendorClick(mx, my) {
  if (!UI.isOpen('fishVendor')) return false;

  const pw = FISH_VENDOR_PW, ph = FISH_VENDOR_PH;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Close button
  if (mx >= px + pw - 36 && mx <= px + pw - 4 && my >= py + 4 && my <= py + 32) {
    UI.close();
    return true;
  }

  // Tab clicks
  const tabY = py + 44;
  for (let i = 0; i < 2; i++) {
    const tx = px + 20 + i * 100;
    if (mx >= tx && mx <= tx + 90 && my >= tabY && my <= tabY + 28) {
      fishVendorTab = i;
      return true;
    }
  }

  const contentY = tabY + 38;

  if (fishVendorTab === 0) {
    // Buy tab item clicks
    const items = getFishVendorBuyItems();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const iy = contentY + i * 48;
      if (mx >= px + 14 && mx <= px + pw - 14 && my >= iy && my <= iy + 42) {
        if (!item.isLocked && !item.isOwned && gold >= item.cost) {
          const success = item.action();
          if (success) {
            gold -= item.cost;
            if (window._opMode) gold = 999999;
          }
        }
        return true;
      }
    }
  } else {
    // Sell All button
    if (mx >= px + pw - 120 && mx <= px + pw - 14 && my >= contentY - 2 && my <= contentY + 26) {
      sellAllFish();
      return true;
    }
    // Individual sell buttons
    const fishItems = getFishInventoryItems();
    for (let i = 0; i < fishItems.length; i++) {
      const iy = contentY + 34 + i * 38;
      if (mx >= px + pw - 80 && mx <= px + pw - 24 && my >= iy + 4 && my <= iy + 28) {
        sellFish(fishItems[i].slot);
        return true;
      }
    }
  }

  // Consume click inside panel
  if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return true;
  return false;
}
