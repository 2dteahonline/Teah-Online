// ===================== FORGE UI =====================
// Client UI: forge panel for crafting materials into weapons/evolutions.
// Uses shopFramework.js helpers for consistent look & feel.

let _forgeTab = 0;
let _forgeScroll = 0;
let _forgeHover = -1;

const _FORGE_TABS = ['Evolution', 'Materials'];
const _FORGE_PW = 800;
const _FORGE_PH = 560;

// Register forge panel
UI.register('forge', {
  onOpen() { _forgeTab = 0; _forgeScroll = 0; _forgeHover = -1; },
  onClose() { _forgeHover = -1; },
});

function drawForgePanel() {
  if (!UI.isOpen('forge')) return;

  const { px, py, pw, ph } = shopDrawPanel(_FORGE_PW, _FORGE_PH);
  const header = shopDrawHeader(px, py, pw, 'FORGE', { barH: 48 });
  const tabs = shopDrawTabs(px, py + header.barH + 4, pw, _FORGE_TABS, _forgeTab);

  const contentY = py + header.barH + 40;
  const contentH = ph - header.barH - 50;

  if (_forgeTab === 0) {
    _drawForgeRecipes(px, contentY, pw, contentH);
  } else if (_forgeTab === 1) {
    _drawForgeMaterials(px, contentY, pw, contentH);
  }

  // Store tab rects + header close for click handler
  window._forgeClickData = { px, py, pw, ph, header, tabs, contentY, contentH };
}

function _drawForgeRecipes(px, cy, pw, ch) {
  const recipes = CraftingSystem.getRecipesByCategory('evolution');
  const rowH = 72;
  const pad = 20;
  const maxVisible = Math.floor(ch / rowH);
  const startIdx = _forgeScroll;
  const endIdx = Math.min(recipes.length, startIdx + maxVisible);

  ctx.save();
  ctx.beginPath();
  ctx.rect(px + pad, cy, pw - pad * 2, ch);
  ctx.clip();

  for (let i = startIdx; i < endIdx; i++) {
    const recipe = recipes[i];
    const ry = cy + (i - startIdx) * rowH + 4;
    const canCraft = CraftingSystem.canCraft(recipe.id);
    const isHovered = _forgeHover === i;

    // Row background
    ctx.fillStyle = isHovered ? 'rgba(80,200,120,0.12)' : 'rgba(20,25,35,0.6)';
    ctx.beginPath(); ctx.roundRect(px + pad, ry, pw - pad * 2, rowH - 6, 8); ctx.fill();
    ctx.strokeStyle = canCraft ? 'rgba(80,200,120,0.4)' : 'rgba(100,100,100,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(px + pad, ry, pw - pad * 2, rowH - 6, 8); ctx.stroke();

    // Tier color indicator
    const tierColor = PALETTE.tierColors[recipe.tier] || '#888';
    ctx.fillStyle = tierColor;
    ctx.fillRect(px + pad + 2, ry + 8, 4, rowH - 22);

    // Recipe name
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = tierColor;
    ctx.textAlign = 'left';
    ctx.fillText(recipe.name, px + pad + 14, ry + 22);

    // Material requirements (compact)
    ctx.font = '11px monospace';
    let matX = px + pad + 14;
    const matY = ry + 42;
    if (recipe.materials) {
      for (const matId in recipe.materials) {
        const needed = recipe.materials[matId];
        const have = CraftingSystem.getMaterialCount(matId);
        const mat = CRAFT_MATERIALS[matId];
        const matName = mat ? mat.name : matId;
        const shortName = matName.length > 12 ? matName.substring(0, 11) + '…' : matName;
        const sufficient = have >= needed;
        ctx.fillStyle = sufficient ? '#5fca80' : '#ff5555';
        const text = shortName + ' ' + have + '/' + needed;
        ctx.fillText(text, matX, matY);
        matX += ctx.measureText(text).width + 12;
        if (matX > px + pw - 180) { matX = px + pad + 14; /* wrap not needed for most */ break; }
      }
    }

    // Gold cost
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = gold >= (recipe.gold || 0) ? PALETTE.gold : '#ff5555';
    ctx.textAlign = 'right';
    ctx.fillText(recipe.gold + 'g', px + pw - pad - 100, ry + 22);

    // Craft button
    const btnX = px + pw - pad - 80;
    const btnY = ry + 32;
    const btnW = 60;
    const btnH = 26;
    ctx.fillStyle = canCraft ? 'rgba(80,200,120,0.3)' : 'rgba(60,60,60,0.3)';
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = canCraft ? '#5fca80' : '#555';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 4); ctx.stroke();
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = canCraft ? '#5fca80' : '#666';
    ctx.textAlign = 'center';
    ctx.fillText('CRAFT', btnX + btnW / 2, btnY + btnH * 0.72);
  }

  ctx.restore();
  ctx.textAlign = 'left';

  // Scroll indicator
  if (recipes.length > maxVisible) {
    ctx.font = '10px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Scroll: ' + (startIdx + 1) + '-' + endIdx + ' of ' + recipes.length, px + pw / 2, cy + ch - 4);
    ctx.textAlign = 'left';
  }
}

function _drawForgeMaterials(px, cy, pw, ch) {
  // Show all materials the player currently has
  const materials = [];
  for (let i = 0; i < inventory.length; i++) {
    const item = inventory[i];
    if (!item || item.type !== 'material') continue;
    materials.push(item);
  }

  const pad = 20;
  const colW = 240;
  const rowH = 28;
  const cols = 3;

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = 'left';
  ctx.fillText('Your Materials', px + pad, cy + 20);

  if (materials.length === 0) {
    ctx.font = '13px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('No materials collected yet. Kill dungeon mobs to get drops!', px + pad, cy + 50);
    return;
  }

  ctx.font = '12px monospace';
  for (let i = 0; i < materials.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const mx = px + pad + col * colW;
    const my = cy + 40 + row * rowH;
    if (my > cy + ch - 10) break;

    const item = materials[i];
    const mat = CRAFT_MATERIALS[item.id];
    const color = mat ? mat.color : (item.data && item.data.color) || '#888';

    // Color dot
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(mx + 6, my - 4, 5, 0, Math.PI * 2); ctx.fill();

    // Name + count
    ctx.fillStyle = '#ccc';
    ctx.fillText(item.name + ' x' + item.count, mx + 16, my);
  }
}

function handleForgeClick(mouseX, mouseY) {
  if (!UI.isOpen('forge') || !window._forgeClickData) return false;
  const d = window._forgeClickData;

  // Close button
  if (mouseX >= d.header.closeX && mouseX <= d.header.closeX + d.header.closeW &&
      mouseY >= d.header.closeY && mouseY <= d.header.closeY + d.header.closeH) {
    UI.close('forge');
    return true;
  }

  // Tab clicks
  if (d.tabs) {
    for (let i = 0; i < d.tabs.length; i++) {
      const t = d.tabs[i];
      if (mouseX >= t.x && mouseX <= t.x + t.w && mouseY >= t.y && mouseY <= t.y + t.h) {
        _forgeTab = i;
        _forgeScroll = 0;
        return true;
      }
    }
  }

  // Recipe craft button clicks (evolution tab)
  if (_forgeTab === 0) {
    const recipes = CraftingSystem.getRecipesByCategory('evolution');
    const rowH = 72;
    const pad = 20;
    for (let i = _forgeScroll; i < recipes.length; i++) {
      const ry = d.contentY + (i - _forgeScroll) * rowH + 4;
      if (ry > d.contentY + d.contentH) break;
      const btnX = d.px + d.pw - pad - 80;
      const btnY = ry + 32;
      const btnW = 60;
      const btnH = 26;
      if (mouseX >= btnX && mouseX <= btnX + btnW && mouseY >= btnY && mouseY <= btnY + btnH) {
        if (CraftingSystem.canCraft(recipes[i].id)) {
          CraftingSystem.craft(recipes[i].id);
        }
        return true;
      }
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

function handleForgeScroll(delta) {
  if (!UI.isOpen('forge') || _forgeTab !== 0) return false;
  const recipes = CraftingSystem.getRecipesByCategory('evolution');
  const maxVisible = Math.floor((_FORGE_PH - 100) / 72);
  if (delta > 0) _forgeScroll = Math.min(_forgeScroll + 1, Math.max(0, recipes.length - maxVisible));
  else _forgeScroll = Math.max(0, _forgeScroll - 1);
  return true;
}
