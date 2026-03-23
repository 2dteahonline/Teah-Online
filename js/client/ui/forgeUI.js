// ===================== FORGE UI =====================
// Client UI: Graal-style weapon prestige + material crafting panel.
// Two views: Weapon Grid → Weapon Detail (prestige/upgrade), Materials tab.
// Uses shopFramework.js helpers for consistent look.

let _forgeTab = 0;        // 0=weapons, 1=materials
let _forgeSelectedGun = null; // gun ID when in detail view, null = grid view
let _forgeScroll = 0;

const _FORGE_TABS = ['Weapons', 'Materials'];
const _FORGE_PW = 820;
const _FORGE_PH = 580;
const _FORGE_GUN_IDS = ['storm_ar', 'heavy_ar', 'boomstick', 'ironwood_bow', 'volt_9'];

// Dungeon source names for materials
const _MAT_SOURCE_NAMES = {
  cave: 'Cave', azurine: 'Azurine', vortalis: 'Vortalis',
  earth205: 'Earth-205', wagashi: 'Wagashi', earth216: 'Earth-216',
};

// Register forge panel
UI.register('forge', {
  onOpen() { _forgeTab = 0; _forgeSelectedGun = null; _forgeScroll = 0; },
  onClose() { _forgeSelectedGun = null; },
});

// ===================== MAIN DRAW =====================
function drawForgePanel() {
  if (!UI.isOpen('forge')) return;

  const { px, py, pw, ph } = shopDrawPanel(_FORGE_PW, _FORGE_PH);
  const title = _forgeSelectedGun ? 'WEAPON PRESTIGE' : 'FORGE';
  const header = shopDrawHeader(px, py, pw, title, { barH: 48 });

  // Back arrow (when in detail view)
  let backBtn = null;
  if (_forgeSelectedGun) {
    const bx = px + 12, by = py + 10, bs = 30;
    ctx.fillStyle = 'rgba(80,200,120,0.2)';
    ctx.beginPath(); ctx.roundRect(bx, by, bs, bs, 6); ctx.fill();
    ctx.strokeStyle = '#5fca80'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bs, bs, 6); ctx.stroke();
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#5fca80';
    ctx.textAlign = 'center';
    ctx.fillText('\u2190', bx + bs / 2, by + bs * 0.72);
    ctx.textAlign = 'left';
    backBtn = { x: bx, y: by, w: bs, h: bs };
  }

  // Tabs (only in grid view)
  let tabs = null;
  if (!_forgeSelectedGun) {
    tabs = shopDrawTabs(px, py + header.barH + 4, pw, _FORGE_TABS, _forgeTab);
  }

  const contentY = py + header.barH + (_forgeSelectedGun ? 8 : 40);
  const contentH = ph - header.barH - (_forgeSelectedGun ? 16 : 50);

  if (_forgeSelectedGun) {
    _drawWeaponDetail(px, contentY, pw, contentH);
  } else if (_forgeTab === 0) {
    _drawWeaponGrid(px, contentY, pw, contentH);
  } else {
    _drawMaterialGrid(px, contentY, pw, contentH);
  }

  window._forgeClickData = { px, py, pw, ph, header, tabs, backBtn, contentY, contentH };
}

// ===================== WEAPON GRID =====================
function _drawWeaponGrid(px, cy, pw, ch) {
  const pad = 24;
  const cardW = 140;
  const cardH = 170;
  const gap = 12;
  const totalW = _FORGE_GUN_IDS.length * cardW + (_FORGE_GUN_IDS.length - 1) * gap;
  const startX = px + (pw - totalW) / 2;

  const tierNames = PROGRESSION_CONFIG.TIER_NAMES;
  const tierColors = PROGRESSION_CONFIG.TIER_COLORS;

  for (let i = 0; i < _FORGE_GUN_IDS.length; i++) {
    const gunId = _FORGE_GUN_IDS[i];
    const prog = _getGunProgress(gunId);
    const def = MAIN_GUNS[gunId];
    if (!def) continue;

    const cx = startX + i * (cardW + gap);
    const cardY = cy + 20;
    const tierCol = tierColors[prog.tier] || '#888';
    const owned = prog.owned;

    // Card background
    ctx.fillStyle = owned ? 'rgba(25,35,30,0.85)' : 'rgba(20,20,25,0.7)';
    ctx.beginPath(); ctx.roundRect(cx, cardY, cardW, cardH, 10); ctx.fill();
    ctx.strokeStyle = owned ? tierCol : 'rgba(80,80,80,0.4)';
    ctx.lineWidth = owned ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(cx, cardY, cardW, cardH, 10); ctx.stroke();

    // Tier color top bar
    if (owned) {
      ctx.fillStyle = tierCol;
      ctx.beginPath(); ctx.roundRect(cx + 2, cardY + 2, cardW - 4, 4, [3, 3, 0, 0]); ctx.fill();
    }

    // Gun icon
    const iconCx = cx + cardW / 2;
    const iconCy = cardY + 50;
    if (typeof _drawGunsmithIcon === 'function') {
      _drawGunsmithIcon(iconCx, iconCy, 50, gunId);
    }

    // Gun name
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = owned ? '#fff' : '#666';
    ctx.textAlign = 'center';
    ctx.fillText(def.name, iconCx, cardY + 90);

    // Tier + Level
    if (owned) {
      const tierName = tierNames[prog.tier] || 'Common';
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = tierCol;
      ctx.fillText(tierName, iconCx, cardY + 108);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Lv. ' + prog.level + ' / 25', iconCx, cardY + 124);

      // Mini progress bar
      const barX = cx + 16, barY = cardY + 132, barW = cardW - 32, barH = 8;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
      const pct = (prog.level - 1) / 24;
      if (pct > 0) {
        ctx.fillStyle = tierCol;
        ctx.beginPath(); ctx.roundRect(barX, barY, barW * pct, barH, 4); ctx.fill();
      }

      // Prestige stars
      const starY = cardY + 152;
      for (let s = 0; s < 4; s++) {
        ctx.font = '12px monospace';
        ctx.fillStyle = s < prog.tier ? tierColors[s + 1] : 'rgba(60,60,60,0.5)';
        ctx.fillText('\u2605', cx + 30 + s * 22, starY);
      }
    } else {
      ctx.font = '11px monospace';
      ctx.fillStyle = '#555';
      ctx.fillText('Not Owned', iconCx, cardY + 115);
      ctx.font = '10px monospace';
      ctx.fillStyle = '#444';
      ctx.fillText(def.buyPrice + 'g at Gunsmith', iconCx, cardY + 132);
    }
  }
  ctx.textAlign = 'left';

  // Hint
  ctx.font = '11px monospace';
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.fillText('Click a weapon to view upgrades & prestige', px + pw / 2, cy + ch - 10);
  ctx.textAlign = 'left';
}

// ===================== WEAPON DETAIL (PRESTIGE VIEW) =====================
function _drawWeaponDetail(px, cy, pw, ch) {
  const gunId = _forgeSelectedGun;
  const prog = _getGunProgress(gunId);
  const def = MAIN_GUNS[gunId];
  if (!def) return;

  const tierNames = PROGRESSION_CONFIG.TIER_NAMES;
  const tierColors = PROGRESSION_CONFIG.TIER_COLORS;
  const tierCol = tierColors[prog.tier] || '#888';
  const pad = 30;

  // ---- Weapon header (icon + name + tier) ----
  const headerY = cy + 10;

  // Gun icon (large)
  if (typeof _drawGunsmithIcon === 'function') {
    _drawGunsmithIcon(px + pw / 2, headerY + 30, 70, gunId);
  }

  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(def.name, px + pw / 2, headerY + 72);

  if (!prog.owned) {
    ctx.font = '14px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Purchase this weapon from the Gunsmith first.', px + pw / 2, headerY + 100);
    ctx.textAlign = 'left';
    return;
  }

  const tierName = tierNames[prog.tier] || 'Common';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = tierCol;
  ctx.fillText(tierName + ' Lv.' + prog.level, px + pw / 2, headerY + 92);

  // ---- PRESTIGE BAR ----
  const prestigeY = headerY + 115;
  const barX = px + pad + 80;
  const barW = pw - pad * 2 - 160;
  const barH = 24;

  // Label
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'left';
  ctx.fillText('Prestige:', px + pad, prestigeY + barH * 0.7);

  // Value
  ctx.textAlign = 'right';
  ctx.fillStyle = tierCol;
  ctx.fillText(prog.tier + ' / 4', px + pw - pad, prestigeY + barH * 0.7);

  // Bar background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(barX, prestigeY, barW, barH, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(100,100,100,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(barX, prestigeY, barW, barH, 6); ctx.stroke();

  // Prestige fill (segmented — 4 segments)
  const segW = barW / 4;
  for (let s = 0; s < 4; s++) {
    if (s < prog.tier) {
      ctx.fillStyle = tierColors[s + 1];
      const sx = barX + s * segW + 1;
      const sw = segW - 2;
      ctx.beginPath(); ctx.roundRect(sx, prestigeY + 2, sw, barH - 4, 3); ctx.fill();
    }
    // Segment dividers
    if (s > 0) {
      ctx.strokeStyle = 'rgba(40,40,50,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barX + s * segW, prestigeY + 3);
      ctx.lineTo(barX + s * segW, prestigeY + barH - 3);
      ctx.stroke();
    }
  }

  // Stars on bar
  for (let s = 0; s < 4; s++) {
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = s < prog.tier ? '#fff' : 'rgba(80,80,80,0.6)';
    ctx.fillText('\u2605', barX + s * segW + segW / 2, prestigeY + barH * 0.72);
  }

  // ---- LEVEL BAR ----
  const levelY = prestigeY + barH + 20;

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'left';
  ctx.fillText('Level ' + prog.level, px + pad, levelY + barH * 0.7);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#5fca80';
  ctx.fillText(prog.level + ' / 25', px + pw - pad, levelY + barH * 0.7);

  // Level bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(barX, levelY, barW, barH, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(100,100,100,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(barX, levelY, barW, barH, 6); ctx.stroke();

  const lvlPct = Math.max(0, (prog.level - 1)) / 24;
  if (lvlPct > 0) {
    ctx.fillStyle = tierCol;
    ctx.beginPath(); ctx.roundRect(barX + 1, levelY + 2, (barW - 2) * lvlPct, barH - 4, 4); ctx.fill();
    // Sheen
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(barX + 1, levelY + 2, (barW - 2) * lvlPct, (barH - 4) / 2, [4, 4, 0, 0]); ctx.fill();
  }

  // ---- NEXT UPGRADE / EVOLVE SECTION ----
  const actionY = levelY + barH + 24;
  const isMaxLevel = prog.level >= 25;
  const isMaxTier = prog.tier >= 4;

  if (isMaxLevel && isMaxTier) {
    // MAX — fully maxed weapon
    const t = Date.now() / 1000;
    const shimmer = 0.8 + 0.2 * Math.sin(t * 2);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = `rgba(255,74,138,${shimmer})`;
    ctx.textAlign = 'center';
    ctx.fillText('\u2605 LEGENDARY MAX \u2605', px + pw / 2, actionY + 20);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('This weapon has reached its maximum potential.', px + pw / 2, actionY + 42);
  } else if (isMaxLevel && !isMaxTier) {
    // EVOLVE — show prestige/evolution requirements
    _drawEvolveSection(px, actionY, pw, ch - (actionY - cy), gunId, prog);
  } else {
    // UPGRADE — show next level requirements
    _drawUpgradeSection(px, actionY, pw, ch - (actionY - cy), gunId, prog);
  }

  ctx.textAlign = 'left';
}

// ---- Upgrade section (level up) ----
function _drawUpgradeSection(px, ay, pw, ah, gunId, prog) {
  const pad = 30;
  const recipe = typeof getProgUpgradeRecipe === 'function'
    ? getProgUpgradeRecipe(gunId, prog.tier, prog.level + 1) : null;
  if (!recipe) return;

  // Section header
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#ffa840';
  ctx.textAlign = 'left';
  ctx.fillText('Upgrade to Level ' + (prog.level + 1) + ':', px + pad, ay + 14);

  // Material cards in a grid
  const cardW = 160, cardH = 50, cardGap = 8;
  const allMats = [];
  // Gold
  allMats.push({ name: 'Gold', need: recipe.gold, have: gold, color: PALETTE.gold, isGold: true });
  // Ores
  if (recipe.ores) {
    for (const oreId in recipe.ores) {
      const ore = ORE_TYPES[oreId];
      allMats.push({ name: ore ? ore.name : oreId, need: recipe.ores[oreId], have: _countMaterial('ore_' + oreId), color: ore ? ore.color : '#888' });
    }
  }
  // Parts
  if (recipe.parts) {
    for (const partId in recipe.parts) {
      const mat = CRAFT_MATERIALS[partId] || GUN_MATERIALS[partId] || WEAPON_PARTS[partId];
      allMats.push({ name: mat ? mat.name : partId.replace(/_/g, ' '), need: recipe.parts[partId], have: _countMaterial(partId), color: mat ? mat.color : '#888' });
    }
  }

  const cols = 4;
  const gridX = px + pad;
  const gridY = ay + 26;
  for (let i = 0; i < allMats.length; i++) {
    const m = allMats[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const mx = gridX + col * (cardW + cardGap);
    const my = gridY + row * (cardH + cardGap);
    const has = m.have >= m.need;

    // Card bg
    ctx.fillStyle = has ? 'rgba(40,70,50,0.5)' : 'rgba(50,30,30,0.5)';
    ctx.beginPath(); ctx.roundRect(mx, my, cardW, cardH, 6); ctx.fill();
    ctx.strokeStyle = has ? 'rgba(80,200,120,0.3)' : 'rgba(180,60,60,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, cardW, cardH, 6); ctx.stroke();

    // Color dot
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(mx + 14, my + 18, 5, 0, Math.PI * 2); ctx.fill();

    // Name
    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    const shortName = m.name.length > 16 ? m.name.substring(0, 15) + '\u2026' : m.name;
    ctx.fillText(shortName, mx + 24, my + 20);

    // Count
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = has ? '#5fca80' : '#ff5555';
    ctx.fillText(m.have + ' / ' + m.need, mx + 24, my + 38);
  }

  // Upgrade button
  const canUpgrade = _canAffordRecipe(recipe);
  const btnW = 200, btnH = 40;
  const btnX = px + pw / 2 - btnW / 2;
  const btnY = ay + 26 + Math.ceil(allMats.length / cols) * (cardH + cardGap) + 10;

  ctx.fillStyle = canUpgrade ? 'rgba(40,100,50,0.6)' : 'rgba(30,30,35,0.6)';
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
  ctx.strokeStyle = canUpgrade ? '#5fca80' : '#444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.stroke();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = canUpgrade ? '#fff' : '#555';
  ctx.textAlign = 'center';
  ctx.fillText('UPGRADE \u2014 ' + recipe.gold + 'g', btnX + btnW / 2, btnY + btnH * 0.65);

  // Store button for click handler
  window._forgeUpgradeBtn = canUpgrade ? { x: btnX, y: btnY, w: btnW, h: btnH, recipe } : null;
  window._forgeEvolveBtn = null;
}

// ---- Evolve section (prestige) ----
function _drawEvolveSection(px, ay, pw, ah, gunId, prog) {
  const pad = 30;
  const evoCost = typeof getEvolutionCost === 'function' ? getEvolutionCost(prog.tier, gunId) : null;
  if (!evoCost) return;

  const nextTier = prog.tier + 1;
  const nextTierName = PROGRESSION_CONFIG.TIER_NAMES[nextTier] || '???';
  const nextTierCol = PROGRESSION_CONFIG.TIER_COLORS[nextTier] || '#fff';

  // Info text
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ff6666';
  ctx.textAlign = 'center';
  ctx.fillText('Prestiging resets level to 1 but unlocks ' + nextTierName + ' tier stats!', px + pw / 2, ay + 8);

  // Section header
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = nextTierCol;
  ctx.textAlign = 'left';
  ctx.fillText('Prestige to ' + nextTierName + ':', px + pad, ay + 32);

  // Next prestige preview bar
  const previewY = ay + 44;
  const barX = px + pad + 120, barW = pw - pad * 2 - 200, barH = 16;
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Next Prestige:', px + pad, previewY + barH * 0.72);
  ctx.textAlign = 'right';
  ctx.fillStyle = nextTierCol;
  ctx.fillText('Lv. 1 / 25', px + pw - pad, previewY + barH * 0.72);
  // Empty bar
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(barX, previewY, barW, barH, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(100,100,100,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(barX, previewY, barW, barH, 4); ctx.stroke();
  // Tiny sliver showing level 1
  ctx.fillStyle = nextTierCol;
  ctx.beginPath(); ctx.roundRect(barX + 1, previewY + 2, 4, barH - 4, 2); ctx.fill();

  // Material requirement cards
  const allMats = [];
  allMats.push({ name: 'Gold', need: evoCost.gold, have: gold, color: PALETTE.gold, isGold: true });
  if (evoCost.materials) {
    for (const matId in evoCost.materials) {
      const mat = CRAFT_MATERIALS[matId] || GUN_MATERIALS[matId] || WEAPON_PARTS[matId];
      const oreDef = matId.startsWith('ore_') && typeof ORE_TYPES !== 'undefined' ? ORE_TYPES[matId.replace('ore_', '')] : null;
      const name = mat ? mat.name : (oreDef ? oreDef.name : matId.replace(/_/g, ' '));
      const color = mat ? mat.color : (oreDef ? oreDef.color : '#888');
      allMats.push({ name, need: evoCost.materials[matId], have: _countMaterial(matId), color });
    }
  }

  const cardW = 160, cardH = 50, cardGap = 8, cols = 4;
  const gridX = px + pad;
  const gridY = previewY + barH + 12;
  for (let i = 0; i < allMats.length; i++) {
    const m = allMats[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const mx = gridX + col * (cardW + cardGap);
    const my = gridY + row * (cardH + cardGap);
    const has = m.have >= m.need;

    ctx.fillStyle = has ? 'rgba(40,70,50,0.5)' : 'rgba(50,30,30,0.5)';
    ctx.beginPath(); ctx.roundRect(mx, my, cardW, cardH, 6); ctx.fill();
    ctx.strokeStyle = has ? 'rgba(80,200,120,0.3)' : 'rgba(180,60,60,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, cardW, cardH, 6); ctx.stroke();

    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(mx + 14, my + 18, 5, 0, Math.PI * 2); ctx.fill();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    const shortName = m.name.length > 16 ? m.name.substring(0, 15) + '\u2026' : m.name;
    ctx.fillText(shortName, mx + 24, my + 20);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = has ? '#5fca80' : '#ff5555';
    ctx.fillText(m.have + ' / ' + m.need, mx + 24, my + 38);
  }

  // Evolve button (pulsing)
  let canEvo = gold >= evoCost.gold;
  if (evoCost.materials) {
    for (const matId in evoCost.materials) {
      if (_countMaterial(matId) < evoCost.materials[matId]) canEvo = false;
    }
  }

  const btnW = 220, btnH = 44;
  const btnX = px + pw / 2 - btnW / 2;
  const btnY = gridY + Math.ceil(allMats.length / cols) * (cardH + cardGap) + 8;

  if (canEvo) {
    const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.005);
    ctx.fillStyle = `rgba(${nextTier === 1 ? '95,202,128' : nextTier === 2 ? '74,158,255' : nextTier === 3 ? '255,154,64' : '255,74,138'},${pulse * 0.4})`;
  } else {
    ctx.fillStyle = 'rgba(30,30,35,0.6)';
  }
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
  ctx.strokeStyle = canEvo ? nextTierCol : '#444'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.stroke();
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = canEvo ? '#fff' : '#555';
  ctx.textAlign = 'center';
  ctx.fillText('\u2605 PRESTIGE \u2605', btnX + btnW / 2, btnY + btnH * 0.65);

  window._forgeEvolveBtn = canEvo ? { x: btnX, y: btnY, w: btnW, h: btnH, gunId, tier: prog.tier } : null;
  window._forgeUpgradeBtn = null;
}

// ===================== MATERIALS GRID =====================
function _drawMaterialGrid(px, cy, pw, ch) {
  const pad = 20;

  // Collect all known materials (show all, even if count = 0)
  const allMats = [];
  // Dungeon materials
  for (const matId in CRAFT_MATERIALS) {
    const mat = CRAFT_MATERIALS[matId];
    const count = _countMaterial(matId);
    allMats.push({ id: matId, name: mat.name, color: mat.color, tier: mat.tier, source: mat.source, count });
  }
  // Ores
  if (typeof ORE_TYPES !== 'undefined') {
    for (const oreId in ORE_TYPES) {
      const ore = ORE_TYPES[oreId];
      const count = _countMaterial('ore_' + oreId);
      if (count > 0) {
        allMats.push({ id: 'ore_' + oreId, name: ore.name, color: ore.color, tier: ore.tier, source: 'mine', count });
      }
    }
  }

  const cardW = 180, cardH = 56, cardGap = 6;
  const cols = 4;
  const gridX = px + pad;
  const rowsPerPage = Math.floor((ch - 20) / (cardH + cardGap));
  const maxScroll = Math.max(0, Math.ceil(allMats.length / cols) - rowsPerPage);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px + pad - 2, cy, pw - pad * 2 + 4, ch);
  ctx.clip();

  for (let i = 0; i < allMats.length; i++) {
    const m = allMats[i];
    const col = i % cols;
    const row = Math.floor(i / cols) - _forgeScroll;
    if (row < 0 || row >= rowsPerPage) continue;

    const mx = gridX + col * (cardW + cardGap);
    const my = cy + 4 + row * (cardH + cardGap);
    const owned = m.count > 0;

    // Card
    ctx.fillStyle = owned ? 'rgba(25,35,30,0.7)' : 'rgba(20,20,25,0.4)';
    ctx.beginPath(); ctx.roundRect(mx, my, cardW, cardH, 6); ctx.fill();
    ctx.strokeStyle = owned ? 'rgba(80,200,120,0.25)' : 'rgba(60,60,60,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(mx, my, cardW, cardH, 6); ctx.stroke();

    // Color dot
    ctx.fillStyle = owned ? m.color : 'rgba(80,80,80,0.4)';
    ctx.beginPath(); ctx.arc(mx + 16, my + 18, 7, 0, Math.PI * 2); ctx.fill();
    if (owned) {
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(mx + 14, my + 16, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Name
    ctx.font = '10px monospace';
    ctx.fillStyle = owned ? '#ddd' : '#555';
    ctx.textAlign = 'left';
    const shortName = m.name.length > 18 ? m.name.substring(0, 17) + '\u2026' : m.name;
    ctx.fillText(shortName, mx + 28, my + 20);

    // Count
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = owned ? '#5fca80' : '#444';
    ctx.fillText('x' + m.count, mx + 28, my + 36);

    // Source
    const sourceName = _MAT_SOURCE_NAMES[m.source] || (m.source === 'mine' ? 'Mining' : m.source || '');
    ctx.font = '9px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(sourceName, mx + cardW - 8, my + 36);
  }

  ctx.restore();
  ctx.textAlign = 'left';

  // Scroll hint
  if (maxScroll > 0) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText('Scroll to see more \u2022 ' + allMats.length + ' materials', px + pw / 2, cy + ch - 4);
    ctx.textAlign = 'left';
  }
}

// ===================== CLICK HANDLER =====================
function handleForgeClick(mouseX, mouseY) {
  if (!UI.isOpen('forge') || !window._forgeClickData) return false;
  const d = window._forgeClickData;

  // Close button
  if (mouseX >= d.header.closeX && mouseX <= d.header.closeX + d.header.closeW &&
      mouseY >= d.header.closeY && mouseY <= d.header.closeY + d.header.closeH) {
    UI.close('forge');
    return true;
  }

  // Back button (detail → grid)
  if (d.backBtn && mouseX >= d.backBtn.x && mouseX <= d.backBtn.x + d.backBtn.w &&
      mouseY >= d.backBtn.y && mouseY <= d.backBtn.y + d.backBtn.h) {
    _forgeSelectedGun = null;
    return true;
  }

  // Tab clicks (grid view only)
  if (!_forgeSelectedGun && d.tabs) {
    for (let i = 0; i < d.tabs.length; i++) {
      const t = d.tabs[i];
      if (mouseX >= t.x && mouseX <= t.x + t.w && mouseY >= t.y && mouseY <= t.y + t.h) {
        _forgeTab = i;
        _forgeScroll = 0;
        return true;
      }
    }
  }

  // Weapon card clicks (grid view, weapons tab)
  if (!_forgeSelectedGun && _forgeTab === 0) {
    const cardW = 140, cardH = 170, gap = 12;
    const totalW = _FORGE_GUN_IDS.length * cardW + (_FORGE_GUN_IDS.length - 1) * gap;
    const startX = d.px + (d.pw - totalW) / 2;
    const cardY = d.contentY + 20;

    for (let i = 0; i < _FORGE_GUN_IDS.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mouseX >= cx && mouseX <= cx + cardW && mouseY >= cardY && mouseY <= cardY + cardH) {
        const prog = _getGunProgress(_FORGE_GUN_IDS[i]);
        if (prog.owned) {
          _forgeSelectedGun = _FORGE_GUN_IDS[i];
        }
        return true;
      }
    }
  }

  // Upgrade button click
  if (_forgeSelectedGun && window._forgeUpgradeBtn) {
    const btn = window._forgeUpgradeBtn;
    if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
      // Execute upgrade using existing gunsmith logic
      const gunId = _forgeSelectedGun;
      const prog = _getGunProgress(gunId);
      if (_canAffordRecipe(btn.recipe)) {
        _deductRecipe(btn.recipe);
        _setGunProgress(gunId, prog.tier, prog.level + 1);
        // Rebuild gun item in inventory
        if (typeof resetCombatState === 'function') resetCombatState('lobby');
        if (typeof SaveLoad !== 'undefined') SaveLoad.save();
        hitEffects.push({ x: player.x, y: player.y - 40, life: 40, maxLife: 40, type: 'heal', dmg: 'LEVEL UP!' });
      }
      return true;
    }
  }

  // Evolve button click
  if (_forgeSelectedGun && window._forgeEvolveBtn) {
    const btn = window._forgeEvolveBtn;
    if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
      const gunId = btn.gunId;
      const evoCost = typeof getEvolutionCost === 'function' ? getEvolutionCost(btn.tier, gunId) : null;
      if (evoCost) {
        // Deduct gold
        gold -= evoCost.gold;
        // Deduct materials
        if (evoCost.materials) {
          for (const matId in evoCost.materials) {
            _deductMaterial(matId, evoCost.materials[matId]);
          }
        }
        // Evolve
        _setGunProgress(gunId, btn.tier + 1, 1);
        if (typeof resetCombatState === 'function') resetCombatState('lobby');
        if (typeof SaveLoad !== 'undefined') SaveLoad.save();
        const nextName = PROGRESSION_CONFIG.TIER_NAMES[btn.tier + 1] || '???';
        hitEffects.push({ x: player.x, y: player.y - 40, life: 60, maxLife: 60, type: 'heal', dmg: 'PRESTIGE: ' + nextName + '!' });
      }
      return true;
    }
  }

  // Click inside panel = consumed
  if (mouseX >= d.px && mouseX <= d.px + d.pw && mouseY >= d.py && mouseY <= d.py + d.ph) {
    return true;
  }

  // Click outside = close
  UI.close('forge');
  return true;
}

// ===================== SCROLL HANDLER =====================
function handleForgeScroll(delta) {
  if (!UI.isOpen('forge')) return false;
  // Materials tab scrolling
  if (!_forgeSelectedGun && _forgeTab === 1) {
    const allCount = Object.keys(CRAFT_MATERIALS).length + (typeof ORE_TYPES !== 'undefined' ? Object.keys(ORE_TYPES).length : 0);
    const maxRows = Math.ceil(allCount / 4);
    const rowsPerPage = Math.floor((_FORGE_PH - 100) / 62);
    const maxScroll = Math.max(0, maxRows - rowsPerPage);
    if (delta > 0) _forgeScroll = Math.min(_forgeScroll + 1, maxScroll);
    else _forgeScroll = Math.max(0, _forgeScroll - 1);
    return true;
  }
  return false;
}
