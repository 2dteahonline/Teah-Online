// ===================== SHOP FRAMEWORK =====================
// Reusable drawing + click helpers for vendor/shop panels.
// New shops call these helpers instead of duplicating layout code.
// Existing shops (dungeon, gunsmith, mining, fish, farm) can migrate
// incrementally — no changes required until they opt in.

// --- Shop Panel Layout Helpers ---

// Draw a centered modal panel with dimmed backdrop.
// Returns { px, py, pw, ph } for child layout.
function shopDrawPanel(pw, ph, opts) {
  opts = opts || {};
  const px = Math.round(BASE_W / 2 - pw / 2);
  const py = Math.round(BASE_H / 2 - ph / 2);

  // Dimmed backdrop
  if (opts.dim !== false) {
    ctx.fillStyle = opts.dimColor || 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // Panel bg
  ctx.fillStyle = opts.bgColor || 'rgba(12,16,24,0.95)';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, opts.radius || 12); ctx.fill();
  ctx.strokeStyle = opts.borderColor || 'rgba(100,200,160,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, opts.radius || 12); ctx.stroke();

  return { px, py, pw, ph };
}

// Draw header bar with title, gold, and close button.
// Returns { closeX, closeY, closeW, closeH } for hit testing.
function shopDrawHeader(px, py, pw, title, opts) {
  opts = opts || {};
  const barH = opts.barH || 50;

  // Header bar bg
  ctx.fillStyle = opts.barColor || 'rgba(30,60,45,0.5)';
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, barH, [10, 10, 0, 0]); ctx.fill();

  // Title
  ctx.font = opts.titleFont || 'bold 20px monospace';
  ctx.fillStyle = opts.titleColor || PALETTE.accent;
  ctx.textAlign = 'center';
  ctx.fillText(title, px + pw / 2, py + barH * 0.66);

  // Gold display (left)
  ctx.font = opts.goldFont || 'bold 14px monospace';
  ctx.fillStyle = PALETTE.gold || '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText(gold + 'g', px + 16, py + barH * 0.66);

  // Close button (right)
  const cbS = opts.closeBtnSize || 32;
  const cbX = px + pw - cbS - 10;
  const cbY = py + (barH - cbS) / 2 + 3;
  ctx.fillStyle = PALETTE.closeBtn || '#c03030';
  ctx.beginPath(); ctx.roundRect(cbX, cbY, cbS, cbS, 6); ctx.fill();
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('\u2715', cbX + cbS / 2, cbY + cbS * 0.7);

  ctx.textAlign = 'left';
  return { closeX: cbX, closeY: cbY, closeW: cbS, closeH: cbS, barH: barH };
}

// Draw horizontal tabs. Returns tab rects for hit testing.
function shopDrawTabs(px, py, pw, tabs, activeIdx, opts) {
  opts = opts || {};
  const tabH = opts.tabH || 30;
  const pad = opts.pad || 20;
  const tabW = (pw - pad * 2) / tabs.length;
  const rects = [];

  for (let i = 0; i < tabs.length; i++) {
    const tx = px + pad + i * tabW;
    const active = i === activeIdx;
    ctx.fillStyle = active ? (opts.activeColor || 'rgba(80,200,120,0.2)') : (opts.inactiveColor || 'rgba(20,20,30,0.6)');
    ctx.beginPath(); ctx.roundRect(tx, py, tabW - 6, tabH, 5); ctx.fill();
    if (active) {
      ctx.strokeStyle = opts.accentColor || PALETTE.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, py, tabW - 6, tabH, 5); ctx.stroke();
    }
    ctx.font = opts.tabFont || 'bold 11px monospace';
    ctx.fillStyle = active ? (opts.accentColor || PALETTE.accent) : '#666';
    ctx.textAlign = 'center';
    ctx.fillText(tabs[i], tx + (tabW - 6) / 2, py + tabH * 0.66);
    rects.push({ x: tx, y: py, w: tabW - 6, h: tabH });
  }
  ctx.textAlign = 'left';
  return rects;
}

// Draw a single item row (used in list-style shops).
// item: { name, desc?, cost, isLocked, lockReason?, isOwned, color? }
// Returns the row rect for hit testing.
function shopDrawItemRow(px, py, pw, rowH, item, opts) {
  opts = opts || {};
  const padX = opts.padX || 14;
  const rx = px + padX;
  const rw = pw - padX * 2;

  const canBuy = !item.isLocked && !item.isOwned && gold >= item.cost;

  // Row bg
  ctx.fillStyle = canBuy ? (opts.buyableBg || 'rgba(40,60,80,0.6)') : (opts.defaultBg || 'rgba(20,25,35,0.6)');
  ctx.beginPath(); ctx.roundRect(rx, py, rw, rowH - 4, 6); ctx.fill();

  // Color swatch (optional)
  if (item.color) {
    ctx.fillStyle = item.color;
    ctx.fillRect(rx + 6, py + 6, 16, rowH - 16);
  }
  const textX = item.color ? rx + 28 : rx + 8;

  // Name
  ctx.textAlign = 'left';
  ctx.font = opts.nameFont || 'bold 13px monospace';
  ctx.fillStyle = item.isLocked ? '#606060' : item.isOwned ? '#60a060' : '#d0e0f0';
  ctx.fillText(item.name, textX, py + Math.round(rowH * 0.38));

  // Desc (optional)
  if (item.desc) {
    ctx.font = opts.descFont || '10px monospace';
    ctx.fillStyle = '#708090';
    ctx.fillText(item.desc, textX, py + Math.round(rowH * 0.72));
  }

  // Price / status (right side)
  ctx.textAlign = 'right';
  ctx.font = opts.priceFont || 'bold 12px monospace';
  if (item.isLocked) {
    ctx.fillStyle = '#804040';
    ctx.fillText(item.lockReason || 'LOCKED', rx + rw - 8, py + Math.round(rowH * 0.38));
  } else if (item.isOwned) {
    ctx.fillStyle = '#60a060';
    ctx.fillText('OWNED', rx + rw - 8, py + Math.round(rowH * 0.38));
  } else {
    ctx.fillStyle = gold >= item.cost ? '#ffd700' : '#804040';
    ctx.fillText(item.cost + 'g', rx + rw - 8, py + Math.round(rowH * 0.38));
  }
  ctx.textAlign = 'left';

  return { x: rx, y: py, w: rw, h: rowH - 4 };
}

// Draw a grid of item cards (used in grid-style shops).
// items: array of { name, desc?, cost, tier?, isLocked, isOwned, isMaxed? }
// Returns array of { x, y, w, h, idx } for hit testing.
function shopDrawItemGrid(px, py, pw, items, opts) {
  opts = opts || {};
  const cols = opts.cols || 3;
  const cardW = opts.cardW || 200;
  const cardH = opts.cardH || 130;
  const gap = opts.gap || 12;

  const gridW = cols * (cardW + gap) - gap;
  const gridX = px + (pw - gridW) / 2;
  const rects = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col = i % cols, row = Math.floor(i / cols);
    const ix = gridX + col * (cardW + gap);
    const iy = py + row * (cardH + gap);

    const canAfford = !item.isOwned && !item.isMaxed && !item.isLocked && gold >= item.cost;

    // Card bg
    ctx.fillStyle = item.isOwned ? 'rgba(30,50,35,0.9)' :
                    item.isLocked ? 'rgba(15,15,20,0.9)' :
                    canAfford ? 'rgba(25,35,45,0.9)' : 'rgba(20,18,15,0.9)';
    ctx.beginPath(); ctx.roundRect(ix, iy, cardW, cardH, 8); ctx.fill();
    ctx.strokeStyle = item.isOwned ? PALETTE.accent :
                      item.isLocked ? 'rgba(60,40,40,0.4)' :
                      canAfford ? 'rgba(80,200,120,0.4)' : 'rgba(60,50,40,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(ix, iy, cardW, cardH, 8); ctx.stroke();

    // Tier bar (if tier defined)
    if (item.tier !== undefined) {
      ctx.fillStyle = getTierColor(item.tier);
      ctx.fillRect(ix + 4, iy + 4, cardW - 8, 3);
    }

    // Name
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = item.isLocked ? '#505050' : item.isOwned ? PALETTE.accent : '#d0e8f0';
    ctx.fillText(item.name, ix + 10, iy + 24);

    // Desc
    if (item.desc) {
      ctx.font = '9px monospace';
      ctx.fillStyle = '#708090';
      const lines = item.desc.length > 30 ? [item.desc.slice(0, 30), item.desc.slice(30, 60)] : [item.desc];
      for (let li = 0; li < lines.length; li++) {
        ctx.fillText(lines[li], ix + 10, iy + 40 + li * 12);
      }
    }

    // Status / price at bottom
    ctx.textAlign = 'center';
    if (item.isLocked) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#804040';
      ctx.fillText(item.lockReason || 'LOCKED', ix + cardW / 2, iy + cardH - 14);
    } else if (item.isOwned) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText('\u2713 OWNED', ix + cardW / 2, iy + cardH - 14);
    } else if (item.isMaxed) {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#60a060';
      ctx.fillText('\u2713 MAXED', ix + cardW / 2, iy + cardH - 14);
    } else {
      // Buy button area
      const btnW = 80, btnH = 24;
      const btnX = ix + cardW / 2 - btnW / 2;
      const btnY = iy + cardH - btnH - 8;
      ctx.fillStyle = canAfford ? 'rgba(40,120,60,0.7)' : 'rgba(40,30,25,0.7)';
      ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 4); ctx.fill();
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = canAfford ? '#b0ffc0' : '#804040';
      ctx.fillText(item.cost + 'g', ix + cardW / 2, btnY + 16);
    }
    ctx.textAlign = 'left';

    rects.push({ x: ix, y: iy, w: cardW, h: cardH, idx: i });
  }
  return rects;
}

// --- Click Helpers ---

// Check if (mx, my) is inside a rect { x, y, w, h }.
function shopHitTest(mx, my, rect) {
  return mx >= rect.x && mx <= rect.x + rect.w && my >= rect.y && my <= rect.y + rect.h;
}

// Check tab click. Returns tab index or -1.
function shopTabHitTest(mx, my, tabRects) {
  for (let i = 0; i < tabRects.length; i++) {
    if (shopHitTest(mx, my, tabRects[i])) return i;
  }
  return -1;
}

// Check grid/item click. Returns item index or -1.
function shopItemHitTest(mx, my, itemRects) {
  for (let i = 0; i < itemRects.length; i++) {
    if (shopHitTest(mx, my, itemRects[i])) return itemRects[i].idx !== undefined ? itemRects[i].idx : i;
  }
  return -1;
}

// Execute a purchase: check gold, deduct, call onSuccess, return true/false.
// Shows hit effect on failure.
function shopBuy(cost, onSuccess) {
  if (gold < cost) {
    hitEffects.push({ x: player.x, y: player.y - 40, life: 30, maxLife: 30, type: 'heal', dmg: 'NOT ENOUGH GOLD' });
    return false;
  }
  gold -= cost;
  if (onSuccess) onSuccess();
  return true;
}

// Draw "empty state" text centered in a region.
function shopDrawEmpty(cx, cy, text) {
  ctx.font = '14px monospace';
  ctx.fillStyle = '#506070';
  ctx.textAlign = 'center';
  ctx.fillText(text, cx, cy);
  ctx.textAlign = 'left';
}
