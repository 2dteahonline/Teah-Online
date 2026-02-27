// ===================== INVENTORY PANEL =====================
// Client UI: inventory panel rendering and interaction
// Extracted from index_2.html \u2014 Phase D

// ===================== INVENTORY PANEL (Graal-style) =====================
const INV_CATEGORIES = [
  { name: "All", filter: () => true },
  { name: "Guns", filter: t => t === "gun" },
  { name: "Melees", filter: t => t === "melee" },
  { name: "Armor", filter: t => ITEM_CATEGORIES.armor.includes(t) },
  { name: "Consumables", filter: t => t === "consumable" || t === "food" },
];
let invCategory = 0;
let armorInvScroll = 0; // scroll offset for armor inventory grid
let armorHoverSlot = -1; // slot index of hovered armor card in armor tab

// Draw pixel art category icons
function drawItemCard(item) {
  const d = item.data || {};
  const tierCol = getTierColor(item.tier);
  const tierName = getTierName(item.tier);

  // Card dimensions — centered on screen
  const cw = 240, ch = 340;
  const cx = (BASE_W - cw) / 2;
  const cy = (BASE_H - ch) / 2;
  const t = Date.now() / 1000;

  // Dim background
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Card background — parchment style
  ctx.fillStyle = "#1c1a16";
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 12); ctx.fill();

  // Outer border glow
  ctx.shadowColor = tierCol;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = tierCol;
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 12); ctx.stroke();
  ctx.shadowBlur = 0;

  // Inner border
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx + 6, cy + 6, cw - 12, ch - 12, 8); ctx.stroke();

  // === TIER COST BADGE (top-left corner) ===
  if (d.cost) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath(); ctx.arc(cx + 22, cy + 22, 18, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = tierCol;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx + 22, cy + 22, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#ffc107";
    ctx.textAlign = "center";
    ctx.fillText(d.cost, cx + 22, cy + 27);
  }

  // === TIER BADGE (top-right) ===
  const badgeW = 50, badgeH = 22;
  const bx = cx + cw - badgeW - 12, by = cy + 10;
  ctx.fillStyle = tierCol;
  ctx.beginPath(); ctx.roundRect(bx, by, badgeW, badgeH, 6); ctx.fill();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.fillText("TIER " + item.tier, bx + badgeW / 2, by + 15);

  // === ART AREA (illustration box) ===
  const artX = cx + 20, artY = cy + 44, artW = cw - 40, artH = 100;
  // Art background gradient
  const artGrad = ctx.createLinearGradient(artX, artY, artX, artY + artH);
  artGrad.addColorStop(0, "rgba(30,28,40,0.9)");
  artGrad.addColorStop(1, "rgba(20,18,30,0.9)");
  ctx.fillStyle = artGrad;
  ctx.beginPath(); ctx.roundRect(artX, artY, artW, artH, 6); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(artX, artY, artW, artH, 6); ctx.stroke();

  // Draw item icon in art area
  const iconCx = artX + artW / 2;
  const iconCy = artY + artH / 2;
  drawItemCardArt(item, iconCx, iconCy, artW, artH);

  // === ITEM NAME ===
  const nameY = artY + artH + 22;
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = tierCol;
  ctx.textAlign = "center";
  ctx.fillText(item.name, cx + cw / 2, nameY);

  // Type subtitle
  ctx.font = "11px monospace";
  ctx.fillStyle = "#777";
  const typeLabel = { gun: "Ranged Weapon", melee: "Melee Weapon", boots: "Boots", pants: "Leg Armor", chest: "Chest Armor", helmet: "Head Armor", consumable: "Consumable" };
  ctx.fillText((tierName + " · " + (typeLabel[item.type] || item.type)).toUpperCase(), cx + cw / 2, nameY + 16);

  // === DIVIDER ===
  const divY = nameY + 26;
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx + 20, divY); ctx.lineTo(cx + cw - 20, divY); ctx.stroke();

  // === STATS ===
  ctx.textAlign = "left";
  let statY = divY + 18;
  const statX = cx + 22;
  const valX = cx + cw - 22;
  const lineH = 17;

  function drawStat(label, value, color) {
    ctx.font = "11px monospace";
    ctx.fillStyle = "#999";
    ctx.textAlign = "left";
    ctx.fillText(label, statX, statY);
    ctx.fillStyle = color || "#e0e0e0";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "right";
    ctx.fillText(value, valX, statY);
    statY += lineH;
  }

  // Type-specific stats
  if (ITEM_STAT_RENDERERS[item.type]) ITEM_STAT_RENDERERS[item.type](d, drawStat);

  // === DESCRIPTION ===
  if (d.desc) {
    statY += 4;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.moveTo(cx + 20, statY - 8); ctx.lineTo(cx + cw - 20, statY - 8); ctx.stroke();
    ctx.font = "10px monospace";
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    // Word wrap description
    const words = d.desc.split(' ');
    let line = '';
    const maxW = cw - 40;
    for (const word of words) {
      const test = line + (line ? ' ' : '') + word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx + cw / 2, statY);
        statY += 13;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx + cw / 2, statY);
  }

  // === FOOTER ===
  ctx.font = "9px monospace";
  ctx.fillStyle = "#444";
  ctx.textAlign = "center";
  ctx.fillText("Click anywhere to close", cx + cw / 2, cy + ch - 10);
  ctx.textAlign = "left";
}

function drawItemCardArt(item, cx2, cy2, w, h) {
  const d = item.data || {};
  const tc = getTierColor(item.tier);
  const t = Date.now() / 1000;

  // Background particle effect
  for (let i = 0; i < 6; i++) {
    const pa = t * 0.5 + i * 1.05;
    const px = cx2 + Math.cos(pa) * (w * 0.3);
    const py = cy2 + Math.sin(pa * 1.3) * (h * 0.25);
    ctx.fillStyle = tc.replace(')', ',0.15)').replace('rgb', 'rgba');
    ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
  }

  if (item.type === 'gun') {
    // Gun barrel
    ctx.fillStyle = "#666";
    ctx.fillRect(cx2 - 30, cy2 - 4, 60, 8);
    ctx.fillStyle = "#888";
    ctx.fillRect(cx2 - 30, cy2 - 3, 60, 3);
    // Stock
    ctx.fillStyle = "#553322";
    ctx.fillRect(cx2 + 18, cy2 - 10, 18, 20);
    ctx.fillStyle = "#664433";
    ctx.fillRect(cx2 + 20, cy2 - 8, 14, 16);
    // Grip
    ctx.fillStyle = "#444";
    ctx.fillRect(cx2 + 2, cy2 + 4, 8, 14);
    // Muzzle flash hint
    if (d.special === 'frost') {
      ctx.fillStyle = "rgba(100,200,255,0.4)";
      ctx.beginPath(); ctx.arc(cx2 - 34, cy2, 8, 0, Math.PI * 2); ctx.fill();
    } else if (d.special === 'burn') {
      ctx.fillStyle = "rgba(255,100,30,0.4)";
      ctx.beginPath(); ctx.arc(cx2 - 34, cy2, 8, 0, Math.PI * 2); ctx.fill();
    }
  } else if (item.type === 'melee') {
    // Blade
    ctx.fillStyle = tc;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 - 36);
    ctx.lineTo(cx2 - 8, cy2 + 4);
    ctx.lineTo(cx2 + 8, cy2 + 4);
    ctx.closePath();
    ctx.fill();
    // Blade shine
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 - 34);
    ctx.lineTo(cx2 - 3, cy2);
    ctx.lineTo(cx2 + 2, cy2);
    ctx.closePath();
    ctx.fill();
    // Guard
    ctx.fillStyle = "#aa8844";
    ctx.fillRect(cx2 - 14, cy2 + 4, 28, 5);
    // Handle
    ctx.fillStyle = "#553322";
    ctx.fillRect(cx2 - 4, cy2 + 9, 8, 18);
    ctx.fillStyle = "#aa8844";
    ctx.fillRect(cx2 - 6, cy2 + 26, 12, 4);
  } else if (item.type === 'boots') {
    // Boot shape
    for (let b = -1; b <= 1; b += 2) {
      const bx = cx2 + b * 18;
      ctx.fillStyle = d.color || tc;
      ctx.beginPath();
      ctx.roundRect(bx - 10, cy2 - 20, 20, 32, 4);
      ctx.fill();
      // Sole
      ctx.fillStyle = "#333";
      ctx.fillRect(bx - 12, cy2 + 10, 24, 6);
      // Ankle
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(bx - 8, cy2 - 18, 16, 4);
    }
    if (d.special) {
      ctx.fillStyle = `rgba(${d.special === 'phase' ? '100,220,255' : '180,120,255'},0.3)`;
      ctx.beginPath(); ctx.ellipse(cx2, cy2 + 16, 30, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else if (item.type === 'pants') {
    // Pants legs
    ctx.fillStyle = d.color || tc;
    ctx.fillRect(cx2 - 16, cy2 - 22, 14, 40);
    ctx.fillRect(cx2 + 2, cy2 - 22, 14, 40);
    // Waistband
    ctx.fillStyle = "#555";
    ctx.fillRect(cx2 - 18, cy2 - 24, 36, 6);
    // Belt buckle
    ctx.fillStyle = "#aa8844";
    ctx.fillRect(cx2 - 4, cy2 - 24, 8, 6);
    if (d.thorns) {
      ctx.fillStyle = "rgba(255,80,40,0.3)";
      for (let s = 0; s < 4; s++) {
        const sa = s * Math.PI / 2 + t;
        ctx.beginPath(); ctx.arc(cx2 + Math.cos(sa) * 24, cy2 + Math.sin(sa) * 16, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (item.type === 'chest') {
    // Chest plate
    ctx.fillStyle = d.color || tc;
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 - 28);
    ctx.lineTo(cx2 - 22, cy2 - 16);
    ctx.lineTo(cx2 - 20, cy2 + 18);
    ctx.lineTo(cx2 + 20, cy2 + 18);
    ctx.lineTo(cx2 + 22, cy2 - 16);
    ctx.closePath();
    ctx.fill();
    // Shoulder plates
    ctx.fillRect(cx2 - 30, cy2 - 20, 12, 10);
    ctx.fillRect(cx2 + 18, cy2 - 20, 12, 10);
    // Center detail
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(cx2 - 2, cy2 - 24, 4, 38);
    if (d.revive) {
      ctx.fillStyle = "rgba(255,215,0,0.4)";
      ctx.beginPath(); ctx.arc(cx2, cy2 - 4, 12, 0, Math.PI * 2); ctx.fill();
      ctx.font = "16px monospace";
      ctx.fillStyle = "#ffd700";
      ctx.textAlign = "center";
      ctx.fillText("✦", cx2, cy2 + 2);
    }
  } else if (item.type === 'helmet') {
    // Helmet dome
    ctx.fillStyle = d.color || tc;
    ctx.beginPath();
    ctx.arc(cx2, cy2 - 6, 22, Math.PI, 0);
    ctx.lineTo(cx2 + 22, cy2 + 10);
    ctx.lineTo(cx2 - 22, cy2 + 10);
    ctx.closePath();
    ctx.fill();
    // Visor slit
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(cx2 - 16, cy2 + 2, 32, 5);
    // Visor glow
    ctx.fillStyle = "rgba(200,200,255,0.2)";
    ctx.fillRect(cx2 - 14, cy2 + 3, 28, 3);
    // Crown detail for T4
    if (d.absorb) {
      ctx.fillStyle = "#8844cc";
      ctx.beginPath();
      ctx.moveTo(cx2 - 12, cy2 - 26);
      ctx.lineTo(cx2 - 8, cy2 - 18);
      ctx.lineTo(cx2, cy2 - 30);
      ctx.lineTo(cx2 + 8, cy2 - 18);
      ctx.lineTo(cx2 + 12, cy2 - 26);
      ctx.stroke();
    }
  } else {
    // Generic icon
    ctx.fillStyle = tc;
    ctx.beginPath(); ctx.arc(cx2, cy2, 20, 0, Math.PI * 2); ctx.fill();
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.fillText("?", cx2, cy2 + 7);
  }
  ctx.textAlign = "left";
}

function drawInvCatIcon(cx, cy, cat, size) {
  const s = size / 40; // scale factor
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  switch(cat) {
    case 0: // Guns
      ctx.fillStyle = "#888"; ctx.fillRect(-14, -2, 28, 5);
      ctx.fillStyle = "#666"; ctx.fillRect(-14, -4, 16, 9);
      ctx.fillStyle = "#554433"; ctx.fillRect(4, -6, 12, 9);
      ctx.fillStyle = "#777"; ctx.fillRect(-4, 3, 4, 8);
      break;
    case 1: // Melees — sword
      ctx.strokeStyle = "#ccd8ff"; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(-10, 14); ctx.lineTo(10, -14); ctx.stroke();
      ctx.strokeStyle = "#aa8844"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-2, 6); ctx.stroke();
      ctx.fillStyle = "#aa8844"; ctx.fillRect(-8, 8, 8, 3);
      break;
    case 2: // Armor — vest/chestplate
      ctx.fillStyle = "#4a6a5a";
      ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(10, -12);
      ctx.lineTo(16, -4); ctx.lineTo(14, 14);
      ctx.lineTo(-14, 14); ctx.lineTo(-16, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#5a7a6a"; ctx.fillRect(-6, -10, 12, 6);
      ctx.fillStyle = "#3a5a4a"; ctx.fillRect(-8, -2, 16, 8);
      // Shoulder pads
      ctx.fillStyle = "#4a6a5a";
      ctx.fillRect(-18, -8, 6, 8); ctx.fillRect(12, -8, 6, 8);
      ctx.strokeStyle = "#2a4a3a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(10, -12);
      ctx.lineTo(16, -4); ctx.lineTo(14, 14);
      ctx.lineTo(-14, 14); ctx.lineTo(-16, -4); ctx.closePath(); ctx.stroke();
      break;
    case 3: // Consumables — potion bottle
      ctx.fillStyle = "#8a7a60"; ctx.fillRect(-3, -14, 6, 5);
      ctx.fillStyle = "#a89060"; ctx.fillRect(-2, -16, 4, 3);
      ctx.fillStyle = "#44aa44";
      ctx.beginPath();
      ctx.moveTo(-6, -9); ctx.lineTo(-8, -3);
      ctx.lineTo(-8, 12); ctx.lineTo(8, 12);
      ctx.lineTo(8, -3); ctx.lineTo(6, -9);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#33dd55"; ctx.fillRect(-6, 2, 12, 9);
      ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-5, -6, 3, 14);
      ctx.strokeStyle = "#2a8a3a"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -9); ctx.lineTo(-8, -3);
      ctx.lineTo(-8, 12); ctx.lineTo(8, 12);
      ctx.lineTo(8, -3); ctx.lineTo(6, -9);
      ctx.closePath(); ctx.stroke();
      break;
    case 4: // Materials — gem/crystal
      ctx.fillStyle = "#44aadd";
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, -4);
      ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#66ccee"; 
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(5, -4); ctx.lineTo(-5, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#88ddff"; ctx.fillRect(-3, -8, 3, 6);
      ctx.strokeStyle = "#2288aa"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(10, -4);
      ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.lineTo(-10, -4); ctx.closePath(); ctx.stroke();
      break;
    case 5: // Lootboxes — treasure chest
      ctx.fillStyle = "#6a4a2a";
      ctx.beginPath(); ctx.roundRect(-12, -4, 24, 16, 2); ctx.fill();
      ctx.fillStyle = "#8a6a3a";
      ctx.beginPath(); ctx.roundRect(-12, -4, 24, 8, [2,2,0,0]); ctx.fill();
      // Lid
      ctx.fillStyle = "#7a5a2a";
      ctx.beginPath(); ctx.roundRect(-14, -12, 28, 10, [3,3,0,0]); ctx.fill();
      ctx.fillStyle = "#8a6a3a";
      ctx.fillRect(-12, -10, 24, 6);
      // Latch
      ctx.fillStyle = "#c8a040"; ctx.fillRect(-3, -2, 6, 6);
      ctx.fillStyle = "#e8c060"; ctx.fillRect(-2, -1, 4, 4);
      // Metal bands
      ctx.fillStyle = "#aa8844"; ctx.fillRect(-12, -4, 24, 2);
      ctx.strokeStyle = "#4a3a1a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(-14, -12, 28, 24, 2); ctx.stroke();
      break;
    case 6: // All Items — backpack
      ctx.fillStyle = "#8a7a5a";
      ctx.beginPath(); ctx.roundRect(-10, -4, 20, 18, 3); ctx.fill();
      ctx.fillStyle = "#a89060";
      ctx.beginPath(); ctx.roundRect(-10, -4, 20, 6, [3,3,0,0]); ctx.fill();
      ctx.strokeStyle = "#a89060"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, -4, 7, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = "#c8a040"; ctx.fillRect(-2, 0, 4, 4);
      ctx.fillStyle = "#6a5a3a"; ctx.fillRect(-6, 6, 12, 2);
      break;
  }
  ctx.restore();
}

// Shared inventory layout — single source of truth for positions
function getInvLayout() {
  const pad = Math.round(BASE_W * 0.02);
  const titleH = 42;
  const tabGap = Math.round(BASE_W * 0.006);
  const tabH = Math.round(BASE_H * 0.08);
  const tabCount = INV_CATEGORIES.length;
  const maxTabW = Math.round(BASE_W * 0.12);
  const tabW = Math.min(maxTabW, Math.floor((BASE_W - pad * 2 - (tabCount - 1) * tabGap) / tabCount));
  const totalTabW = tabCount * tabW + (tabCount - 1) * tabGap;
  const tabStartX = Math.round((BASE_W - totalTabW) / 2);
  const tabY = titleH + 4;

  const contentY = tabY + tabH + Math.round(BASE_H * 0.008);
  const barH = Math.round(BASE_H * 0.04);
  const barY = BASE_H - barH;
  const contentH = barY - contentY - Math.round(BASE_H * 0.005);
  const contentPad = pad;

  const cols = 6;
  const slotGap = Math.round(BASE_W * 0.006);
  const slotS = Math.min(Math.round(BASE_W * 0.06), Math.floor((BASE_W - pad * 2 - contentPad * 2 - (cols - 1) * slotGap) / cols));
  const gridW = cols * (slotS + slotGap) - slotGap;
  const gridX = Math.round((BASE_W - gridW) / 2);
  const gridY = contentY + Math.round(BASE_H * 0.015);

  return {
    pad, titleH, tabGap, tabH, tabW, tabStartX, tabY, tabCount,
    contentY, contentH, barH, barY, contentPad,
    cols, slotS, slotGap, gridW, gridX, gridY,
  };
}

function drawInventoryPanel() {
  if (!UI.isOpen('inventory')) return;
  const L = getInvLayout();

  // FULL OPAQUE overlay
  ctx.fillStyle = "#0c0e14";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Top accent
  const topGrad = ctx.createLinearGradient(0, 0, BASE_W, 0);
  topGrad.addColorStop(0, "#1a2030"); topGrad.addColorStop(0.5, "#2a3a4a"); topGrad.addColorStop(1, "#1a2030");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, BASE_W, 3);

  // Title
  ctx.font = "bold 22px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e0e8f0";
  ctx.textAlign = "left";
  ctx.fillText("Inventory", L.pad, 34);

  // Subtitle
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#556";
  ctx.fillText("You are identified by E-Mail", L.pad + 160, 32);

  // Change button (top right)
  const changeBtnW = 100, changeBtnH = 28;
  const changeBtnX = BASE_W - L.pad - changeBtnW;
  ctx.fillStyle = "rgba(200,200,210,0.15)";
  ctx.beginPath(); ctx.roundRect(changeBtnX, 10, changeBtnW, changeBtnH, 5); ctx.fill();
  ctx.strokeStyle = "rgba(200,200,210,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(changeBtnX, 10, changeBtnW, changeBtnH, 5); ctx.stroke();
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ccd";
  ctx.textAlign = "center";
  ctx.fillText("Change", changeBtnX + changeBtnW / 2, 29);

  // Category tabs
  for (let i = 0; i < L.tabCount; i++) {
    const tx = L.tabStartX + i * (L.tabW + L.tabGap);
    const isActive = i === invCategory;
    const cat = INV_CATEGORIES[i];
    const catCount = inventory.filter(item => item && cat.filter(item.type)).length;

    // Card bg
    ctx.fillStyle = isActive ? "#3a3428" : "#2a2820";
    ctx.beginPath(); ctx.roundRect(tx, L.tabY, L.tabW, L.tabH, 8); ctx.fill();
    ctx.strokeStyle = isActive ? "#8a7a50" : "rgba(80,70,50,0.3)";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(tx, L.tabY, L.tabW, L.tabH, 8); ctx.stroke();

    // NEW badge
    if (catCount > 0) {
      ctx.fillStyle = "#c03030";
      ctx.beginPath(); ctx.roundRect(tx + 3, L.tabY + 3, 28, 12, [3,3,0,3]); ctx.fill();
      ctx.font = "bold 7px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText("NEW", tx + 17, L.tabY + 12);
    }

    // Icon
    drawInvCatIcon(tx + L.tabW / 2, L.tabY + L.tabH * 0.38, i, L.tabH * 0.38);

    // Label
    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.fillStyle = isActive ? "#e0d0b0" : "#777";
    ctx.textAlign = "center";
    ctx.fillText(cat.name, tx + L.tabW / 2, L.tabY + L.tabH - 5);
  }

  // Content area
  ctx.fillStyle = "rgba(10,12,18,0.5)";
  ctx.beginPath(); ctx.roundRect(L.pad, L.contentY, BASE_W - L.pad * 2, L.contentH, 8); ctx.fill();

  // === CHARACTER PREVIEW (Armor tab only) ===
  const isArmorTab = invCategory === 3;
  let armorPreviewW = 0;
  if (isArmorTab) {
    armorPreviewW = BASE_W - L.pad * 2;
    const prevX = L.pad + 4;
    const prevY = L.contentY + 4;
    const prevW = BASE_W - L.pad * 2 - 8;
    const prevH = L.contentH - 8;

    // === LEFT COLUMN: 4 Equipment Slots vertical ===
    const eqColW = Math.round(prevW * 0.14);
    const eqSlotS = Math.min(Math.round(eqColW * 0.82), 44);
    const eqSlotGapV = 6;
    const eqTotalH = eqSlotS * 4 + eqSlotGapV * 3;
    const eqStartY = prevY + (prevH - eqTotalH) / 2 + 6;
    const eqX = prevX + (eqColW - eqSlotS) / 2;

    // Equipment column bg
    ctx.fillStyle = "rgba(16,18,24,0.7)";
    ctx.beginPath(); ctx.roundRect(prevX, prevY, eqColW, prevH, 6); ctx.fill();
    ctx.strokeStyle = "rgba(60,50,40,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(prevX, prevY, eqColW, prevH, 6); ctx.stroke();

    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#6a6570";
    ctx.textAlign = "center";
    ctx.fillText("EQUIPPED", prevX + eqColW / 2, prevY + 16);

    const eqSlots = [
      { type: 'helmet', label: 'HEAD' },
      { type: 'chest',  label: 'CHEST' },
      { type: 'pants',  label: 'LEGS' },
      { type: 'boots',  label: 'FEET' },
    ];

    for (let ei = 0; ei < eqSlots.length; ei++) {
      const eq = eqSlots[ei];
      eq.x = eqX;
      eq.y = eqStartY + ei * (eqSlotS + eqSlotGapV);
      const equipped = playerEquip[eq.type];
      const isHoverEq = mouse.x >= eq.x && mouse.x <= eq.x + eqSlotS && mouse.y >= eq.y && mouse.y <= eq.y + eqSlotS;

      ctx.fillStyle = equipped ? "rgba(40,55,40,0.9)" : "rgba(22,20,16,0.9)";
      ctx.beginPath(); ctx.roundRect(eq.x, eq.y, eqSlotS, eqSlotS, 5); ctx.fill();
      ctx.strokeStyle = equipped ? PALETTE.accent : isHoverEq ? "#8a7a50" : "rgba(50,45,35,0.4)";
      ctx.lineWidth = equipped ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(eq.x, eq.y, eqSlotS, eqSlotS, 5); ctx.stroke();

      if (equipped) {
        ctx.fillStyle = getTierColor(equipped.tier);
        ctx.fillRect(eq.x + 3, eq.y + 3, eqSlotS - 6, 2);
        try {
          drawMiniArmor(eq.x + eqSlotS / 2, eq.y + eqSlotS / 2 - 2, Math.round(eqSlotS * 0.35), equipped.name, equipped.color || '#888', eq.type);
        } catch(e) {}
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = getTierColor(equipped.tier);
        ctx.textAlign = "center";
        ctx.fillText(equipped.name, eq.x + eqSlotS / 2, eq.y + eqSlotS - 4);
      } else {
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = "#2a2520";
        ctx.textAlign = "center";
        ctx.fillText(eq.label, eq.x + eqSlotS / 2, eq.y + eqSlotS / 2 + 3);
      }

      // Slot type label below
      ctx.font = "7px monospace";
      ctx.fillStyle = "#3a3530";
      ctx.textAlign = "center";
      ctx.fillText(eq.label, eq.x + eqSlotS / 2, eq.y + eqSlotS + 8);
    }

    // === CENTER: Character Model ===
    const charColX = prevX + eqColW + 4;
    const charColW = Math.round(prevW * 0.30);

    ctx.fillStyle = "rgba(16,18,24,0.4)";
    ctx.beginPath(); ctx.roundRect(charColX, prevY, charColW, prevH, 6); ctx.fill();

    const charCx = charColX + charColW / 2;
    const charCy = prevY + prevH * 0.48;
    ctx.save();
    ctx.translate(charCx, charCy);
    ctx.scale(1.8, 1.8);
    drawChoso(0, 0, 0, 0, false);
    ctx.restore();

    // Player name
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#c0b8d0";
    ctx.textAlign = "center";
    ctx.fillText(player.name, charCx, prevY + 18);

    // Hint at bottom
    ctx.font = "9px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#3a3530";
    ctx.textAlign = "center";
    ctx.fillText("Click equipped slot to unequip", charCx, prevY + prevH - 8);

    // === RIGHT: Stats Panel ===
    const statsColX = charColX + charColW + 4;
    const statsColW = prevW - eqColW - charColW - 12;

    ctx.fillStyle = "rgba(16,18,24,0.7)";
    ctx.beginPath(); ctx.roundRect(statsColX, prevY, statsColW, prevH, 6); ctx.fill();
    ctx.strokeStyle = "rgba(60,50,40,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(statsColX, prevY, statsColW, prevH, 6); ctx.stroke();

    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#8a8590";
    ctx.textAlign = "left";
    ctx.fillText("ARMOR STATS", statsColX + 10, prevY + 18);

    // Divider
    ctx.fillStyle = "rgba(80,70,50,0.3)";
    ctx.fillRect(statsColX + 8, prevY + 24, statsColW - 16, 1);

    // Gather all stats
    const statLines = [];
    const totalHp = 100 + getArmorHPBonus();
    const hpBonus = getArmorHPBonus();
    const dmgRed = getArmorReduction();
    const projRed = getProjReduction();
    const thornsVal = getThorns();
    const staggerVal = getStagger();
    const healBoost = getHealBoost();
    const regenVal = getChestRegen();
    const reviveVal = hasRevive() && !reviveUsed;
    const speedBonus = getBootsSpeedBonus();
    const dodgeVal = getDodgeChance();
    const poisonRed = getPoisonReduction();
    const statusRed = getStatusReduction();
    const absorbVal = getAbsorb();
    const hasShadow = playerEquip.boots && (playerEquip.boots.special === 'shadowstep' || playerEquip.boots.special === 'phase');
    const hasPhase = playerEquip.boots && playerEquip.boots.special === 'phase';

    statLines.push({ label: "Max HP", val: totalHp.toString(), color: "#e06060" });
    if (hpBonus > 0) statLines.push({ label: "Chest HP", val: "+" + hpBonus, color: "#c05050" });
    if (dmgRed > 0) statLines.push({ label: "Dmg Reduce", val: "-" + Math.round(dmgRed * 100) + "%", color: "#6a9aff" });
    if (projRed > 0) statLines.push({ label: "Proj Reduce", val: "-" + Math.round(projRed * 100) + "%", color: "#5a8aee" });
    if (speedBonus > 0) statLines.push({ label: "Speed", val: "+" + speedBonus.toFixed(1), color: PALETTE.accent });
    if (dodgeVal > 0) statLines.push({ label: "Dodge", val: Math.round(dodgeVal * 100) + "%", color: "#4aba70" });
    if (thornsVal > 0) statLines.push({ label: "Thorns", val: Math.round(thornsVal * 100) + "%", color: "#ff9a40" });
    if (staggerVal > 0) statLines.push({ label: "Stagger", val: staggerVal + "s", color: "#ffa050" });
    if (healBoost > 0) statLines.push({ label: "Heal Boost", val: "+" + Math.round(healBoost * 100) + "%", color: "#60dd80" });
    if (regenVal > 0) statLines.push({ label: "Regen", val: regenVal + " HP/s", color: "#50cc70" });
    if (poisonRed > 0) statLines.push({ label: "Poison Res", val: poisonRed >= 1 ? "IMMUNE" : "-" + Math.round(poisonRed * 100) + "%", color: "#aa70dd" });
    if (statusRed > 0) statLines.push({ label: "Status Res", val: "-" + Math.round(statusRed * 100) + "%", color: "#9a60cc" });
    if (absorbVal > 0) statLines.push({ label: "Absorb", val: "Psn→Heal", color: "#cc80ff" });
    if (hasShadow) statLines.push({ label: "Shadow Step", val: "Crit", color: "#b090e0" });
    if (hasPhase) statLines.push({ label: "Phase", val: "0.75s", color: "#80d0ff" });
    if (reviveVal) statLines.push({ label: "Auto-Revive", val: "1x 30%", color: "#ffcc40" });

    // If nothing equipped
    const hasAnyArmor = ITEM_CATEGORIES.armor.some(t => playerEquip[t]);
    if (!hasAnyArmor) {
      statLines.length = 1;
      statLines.push({ label: "No armor equipped", val: "", color: "#3a3530" });
    }

    const statLineH = 14;
    const statStartY = prevY + 28;
    for (let si = 0; si < statLines.length; si++) {
      const sl = statLines[si];
      const sy2 = statStartY + si * statLineH;
      if (sy2 + statLineH > prevY + prevH - 4) break;

      ctx.font = "9px monospace";
      ctx.fillStyle = "#666";
      ctx.textAlign = "left";
      ctx.fillText(sl.label, statsColX + 8, sy2 + 10);

      if (sl.val) {
        ctx.font = "bold 9px monospace";
        ctx.fillStyle = sl.color;
        ctx.textAlign = "right";
        ctx.fillText(sl.val, statsColX + statsColW - 8, sy2 + 10);
      }
    }

    // === ARMOR INVENTORY below stats in right column ===
    const lastStatY = statStartY + statLines.length * statLineH;
    const invStartY = lastStatY + 8;

    // Divider
    ctx.fillStyle = "rgba(80,70,50,0.3)";
    ctx.fillRect(statsColX + 6, invStartY - 4, statsColW - 12, 1);

    ctx.font = "bold 8px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#6a6570";
    ctx.textAlign = "left";
    ctx.fillText("INVENTORY", statsColX + 8, invStartY + 6);

    // Gather armor items
    const armorFiltered = [];
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] && ITEM_CATEGORIES.armor.includes(inventory[i].type)) {
        armorFiltered.push({ item: inventory[i], slot: i });
      }
    }
    const armorTypeOrder = { helmet: 0, chest: 1, pants: 2, boots: 3 };
    armorFiltered.sort((a, b) => (armorTypeOrder[a.item.type] ?? 9) - (armorTypeOrder[b.item.type] ?? 9));

    // Tiny card grid — fit all 4 rows in available space
    const armorGridPad = 2;
    const armorGridX = statsColX + armorGridPad;
    const armorGridW = statsColW - armorGridPad * 2;
    const armorGridY = invStartY + 12;
    const armorCols = 4;
    const armorSlotGap = 2;
    const armorSlotW = Math.floor((armorGridW - (armorCols - 1) * armorSlotGap) / armorCols);
    // Calculate max rows needed and fit them in available height
    const armorAvailH = prevY + prevH - armorGridY - 2;
    const armorMaxRows = 4; // helmet, chest, pants, boots
    const armorSlotH = Math.floor((armorAvailH - (armorMaxRows - 1) * armorSlotGap) / armorMaxRows);
    const armorGridOffX = armorGridX;
    const armorRows = Math.ceil(armorFiltered.length / armorCols);
    const armorTotalH = armorRows * (armorSlotH + armorSlotGap) - armorSlotGap;
    const armorVisibleH = prevY + prevH - armorGridY - 2;
    const armorCanScroll = armorTotalH > armorVisibleH;
    const armorMaxScroll = Math.max(0, armorTotalH - armorVisibleH);
    armorInvScroll = Math.max(0, Math.min(armorInvScroll, armorMaxScroll));

    if (armorFiltered.length === 0) {
      ctx.font = "9px monospace";
      ctx.fillStyle = "#3a3530";
      ctx.textAlign = "center";
      ctx.fillText("No armor owned", statsColX + statsColW / 2, armorGridY + 14);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.rect(statsColX, armorGridY, statsColW, armorVisibleH);
      ctx.clip();

      for (let ai = 0; ai < armorFiltered.length; ai++) {
        const { item, slot } = armorFiltered[ai];
        const col = ai % armorCols, row = Math.floor(ai / armorCols);
        const ax = armorGridOffX + col * (armorSlotW + armorSlotGap);
        const ay = armorGridY + row * (armorSlotH + armorSlotGap) - armorInvScroll;

        if (ay + armorSlotH < armorGridY || ay > armorGridY + armorVisibleH) continue;

        const isEq = playerEquip[item.type] && playerEquip[item.type].id === item.data.id;
        const isHov = mouse.x >= ax && mouse.x <= ax + armorSlotW && mouse.y >= ay && mouse.y <= ay + armorSlotH && ay >= armorGridY;

        // Card bg — tight
        ctx.fillStyle = isEq ? "rgba(40,70,40,0.9)" : isHov ? "rgba(55,50,35,0.9)" : "rgba(28,26,20,0.9)";
        ctx.beginPath(); ctx.roundRect(ax, ay, armorSlotW, armorSlotH, 2); ctx.fill();
        ctx.strokeStyle = isEq ? PALETTE.accent : isHov ? getTierColor(item.tier) : "rgba(60,50,40,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(ax, ay, armorSlotW, armorSlotH, 2); ctx.stroke();

        // Tier bar — 1px
        ctx.fillStyle = getTierColor(item.tier);
        ctx.fillRect(ax + 1, ay + 1, armorSlotW - 2, 1);

        // Icon — centered
        ctx.save();
        try {
          drawMiniArmor(ax + armorSlotW / 2, ay + armorSlotH * 0.4, Math.round(armorSlotW * 0.24), item.data.name, item.data.color || '#888', item.type);
        } catch(e) {}
        ctx.restore();

        // Name
        ctx.font = "bold 6px monospace";
        ctx.fillStyle = isEq ? PALETTE.accent : getTierColor(item.tier);
        ctx.textAlign = "center";
        let dName = item.name;
        if (dName.length > 10) dName = dName.substring(0, 9) + "…";
        ctx.fillText(dName, ax + armorSlotW / 2, ay + armorSlotH - 2);
      }
      ctx.restore();

      // Scroll bar
      if (armorCanScroll) {
        const sbX = statsColX + statsColW - 5;
        const thumbH = Math.max(12, (armorVisibleH / armorTotalH) * armorVisibleH);
        const thumbY = armorGridY + (armorInvScroll / armorMaxScroll) * (armorVisibleH - thumbH);
        ctx.fillStyle = "rgba(40,35,25,0.4)";
        ctx.fillRect(sbX, armorGridY, 2, armorVisibleH);
        ctx.fillStyle = "rgba(120,100,60,0.6)";
        ctx.beginPath(); ctx.roundRect(sbX, thumbY, 2, thumbH, 1); ctx.fill();
      }
    }
  }

  // Filter items — for ALL tabs, sort armor by type when in armor-related views
  const filtered = [];
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && INV_CATEGORIES[invCategory].filter(inventory[i].type)) {
      filtered.push({ item: inventory[i], slot: i });
    }
  }
  // Sort armor items by type: helmet → chest → pants → boots (for Armor tab and All Items)
  if (invCategory === 3 || invCategory === 0) {
    const typeOrder = { gun: 0, melee: 1, helmet: 2, chest: 3, pants: 4, boots: 5, consumable: 6, food: 7, gem: 8, material: 9, scroll: 10, key: 11, misc: 12 };
    filtered.sort((a, b) => (typeOrder[a.item.type] ?? 9) - (typeOrder[b.item.type] ?? 9));
  }

  const effectiveCols = isArmorTab ? 0 : L.cols; // armor tab uses its own layout above

  if (!isArmorTab && filtered.length === 0) {
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#444";
    ctx.textAlign = "center";
    ctx.fillText("No items in this category", BASE_W / 2, L.contentY + L.contentH / 2);
  } else if (!isArmorTab) {
    for (let fi = 0; fi < filtered.length; fi++) {
      const { item, slot } = filtered[fi];
      const col = fi % effectiveCols, row = Math.floor(fi / effectiveCols);
      const sx = L.gridX + col * (L.slotS + L.slotGap);
      const sy = L.gridY + row * (L.slotS + L.slotGap);
      const isHover = invHover === slot;
      const isEquipped = playerEquip[item.type] && playerEquip[item.type].id === item.data.id;

      // Slot background — green tint if equipped
      ctx.fillStyle = isEquipped ? "rgba(40,70,40,0.9)" : isHover ? "rgba(60,55,40,0.9)" : "rgba(30,28,22,0.9)";
      ctx.beginPath(); ctx.roundRect(sx, sy, L.slotS, L.slotS, 6); ctx.fill();
      ctx.strokeStyle = isEquipped ? PALETTE.accent : isHover ? getTierColor(item.tier) : "rgba(70,60,45,0.4)";
      ctx.lineWidth = isEquipped ? 2.5 : isHover ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(sx, sy, L.slotS, L.slotS, 6); ctx.stroke();

      // Tier bar
      ctx.fillStyle = getTierColor(item.tier);
      ctx.fillRect(sx + 3, sy + 3, L.slotS - 6, 3);

      // Item icon — draw in center of slot
      const iconCx = sx + L.slotS / 2;
      const iconCy = sy + L.slotS / 2 - 6;
      ctx.save();
      try {
        if (item.type === 'gun') {
          const gType = item.data.id === 'smg' ? 'smg' : item.data.id === 'rifle' ? 'rifle' : 'special';
          drawMiniGun(iconCx, iconCy, 16, item.data.name, item.data.color || '#888', gType);
        } else if (item.type === 'melee') {
          const mType = item.data.id === 'sword' ? 'sword' : item.data.id === 'ninja_katanas' ? 'katana' : item.data.id === 'storm_blade' ? 'magic' : 'axe';
          drawMiniMelee(iconCx, iconCy, 16, item.data.name, item.data.color || '#888', mType);
        } else if (ITEM_CATEGORIES.armor.includes(item.type)) {
          drawMiniArmor(iconCx, iconCy, 16, item.data.name, item.data.color || '#888', item.type);
        } else if (item.type === 'consumable' && item.id === 'potion') {
          drawMiniPotion(iconCx, iconCy, 16, '#44aa44');
        } else if (item.type === 'consumable') {
          drawMiniPotion(iconCx, iconCy, 16, item.data.color || '#aa8844');
        } else if (item.type === 'food') {
          drawMiniFood(iconCx, iconCy, 16, item.name, item.data.color || '#cc8844');
        } else if (item.type === 'gem') {
          drawMiniGem(iconCx, iconCy, 16, item.name, item.data.color || '#44aaff');
        } else if (item.type === 'scroll') {
          drawMiniScroll(iconCx, iconCy, 16, item.data.color || '#ddcc88');
        } else if (item.type === 'key') {
          drawMiniKey(iconCx, iconCy, 16, item.data.color || '#ffd740');
        } else if (item.type === 'material') {
          drawMiniGem(iconCx, iconCy, 14, item.name, item.data.color || '#8a8a8a');
        } else {
          // Generic item — colored square with letter
          ctx.fillStyle = item.data.color || getTierColor(item.tier);
          ctx.beginPath(); ctx.roundRect(iconCx - 12, iconCy - 12, 24, 24, 4); ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 14px monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(item.name.charAt(0), iconCx, iconCy);
          ctx.textBaseline = "alphabetic";
        }
      } catch(e) {}
      ctx.restore();

      // Name below icon
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = getTierColor(item.tier);
      ctx.textAlign = "center";
      ctx.fillText(item.name, sx + L.slotS / 2, sy + L.slotS - 14);

      // Type label
      ctx.font = "8px monospace";
      ctx.fillStyle = "#666";
      ctx.fillText(item.type.toUpperCase(), sx + L.slotS / 2, sy + L.slotS - 5);

      // Equipped badge
      if (isEquipped) {
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = PALETTE.accent;
        ctx.textAlign = "right";
        ctx.fillText("EQUIPPED", sx + L.slotS - 4, sy + 14);
      }

      // Stack count
      if (item.stackable && item.count > 1) {
        ctx.font = "bold 12px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "right";
        ctx.fillText("x" + item.count, sx + L.slotS - 6, sy + L.slotS - 6);
      }

      // Tier badge
      if (item.tier > 0) {
        ctx.font = "bold 8px monospace";
        ctx.fillStyle = getTierColor(item.tier);
        ctx.textAlign = "left";
        ctx.fillText("T" + item.tier, sx + 5, sy + 14);
      }
    }

    // Tooltip (suppress when card popup is open)
    if (!cardPopup && invHover >= 0 && inventory[invHover]) {
      const item = inventory[invHover];
      const tw = 200, th = 90;
      const ttx = Math.min(mouse.x + 16, BASE_W - tw - 10);
      const tty = Math.min(mouse.y + 10, BASE_H - th - 10);

      ctx.fillStyle = "rgba(0,0,0,0.95)";
      ctx.beginPath(); ctx.roundRect(ttx, tty, tw, th, 6); ctx.fill();
      ctx.strokeStyle = getTierColor(item.tier);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(ttx, tty, tw, th, 6); ctx.stroke();

      ctx.textAlign = "left";
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = getTierColor(item.tier);
      ctx.fillText(item.name, ttx + 10, tty + 20);

      ctx.font = "10px monospace";
      ctx.fillStyle = "#888";
      ctx.fillText(getTierName(item.tier) + " " + item.type, ttx + 10, tty + 36);

      if (item.data && item.data.desc) {
        ctx.fillStyle = "#bbb";
        ctx.fillText(item.data.desc, ttx + 10, tty + 52);
      }

      ctx.fillStyle = PALETTE.accent;
      ctx.font = "bold 10px monospace";
      if (ITEM_CATEGORIES.equipment.includes(item.type)) {
        const isEq = playerEquip[item.type] && playerEquip[item.type].id === item.data.id;
        ctx.fillText(isEq ? "Click to unequip" : "Click to equip", ttx + 10, tty + 72);
      }
      // Right-click hint
      ctx.fillStyle = "#555";
      ctx.font = "9px monospace";
      ctx.fillText("Right-click for details", ttx + 10, tty + 84);
    }

    // ===== CARD POPUP (right-click detail view) =====
    if (cardPopup) {
      drawItemCard(cardPopup.item);
    }
  }

  // Bottom bar
  ctx.fillStyle = "#0a0c12";
  ctx.fillRect(0, L.barY, BASE_W, L.barH);
  ctx.strokeStyle = "rgba(100,90,70,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, L.barY); ctx.lineTo(BASE_W, L.barY); ctx.stroke();

  const barCy = L.barY + L.barH / 2 + 1;

  // Back
  ctx.fillStyle = "#d03030";
  ctx.beginPath(); ctx.arc(L.pad + 20, barCy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.font = "bold 16px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e0e0e0";
  ctx.textAlign = "left";
  ctx.fillText("Back", L.pad + 36, barCy + 5);

  // Hotkeys
  const mid = BASE_W / 2;
  ctx.fillStyle = "#3388cc";
  ctx.beginPath(); ctx.arc(mid - 100, barCy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ccc";
  ctx.fillText("Hotkeys", mid - 84, barCy + 5);

  // New Items
  ctx.fillStyle = "#44aa44";
  ctx.beginPath(); ctx.arc(mid + 50, barCy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ccc";
  ctx.fillText("New Items", mid + 66, barCy + 5);

  // Search
  ctx.fillStyle = "#cc9922";
  ctx.beginPath(); ctx.arc(BASE_W - L.pad - 180, barCy, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ccc";
  ctx.fillText("Search Items", BASE_W - L.pad - 164, barCy + 5);

  ctx.textAlign = "left";
}

// Inventory click handler
function handleInventoryClick(mx, my) {
  if (!UI.isOpen('inventory')) return false;
  const L = getInvLayout();

  // Back button (bottom bar)
  if (my >= L.barY && mx < L.pad + 120) {
    UI.close();
    return true;
  }

  // Category tab clicks
  if (my >= L.tabY && my <= L.tabY + L.tabH) {
    for (let i = 0; i < L.tabCount; i++) {
      const tx = L.tabStartX + i * (L.tabW + L.tabGap);
      if (mx >= tx && mx <= tx + L.tabW) {
        invCategory = i;
        armorInvScroll = 0;
        return true;
      }
    }
  }

  // Equipment slot clicks (Armor tab only)
  const isArmorTab2 = invCategory === 3;
  if (isArmorTab2) {
    const prevX2 = L.pad + 4;
    const prevW2 = BASE_W - L.pad * 2 - 8;
    const prevY2 = L.contentY + 4;
    const prevH2 = L.contentH - 8;
    const eqColW2 = Math.round(prevW2 * 0.14);
    const eqSlotS2 = Math.min(Math.round(eqColW2 * 0.82), 44);
    const eqSlotGapV2 = 6;
    const eqTotalH2 = eqSlotS2 * 4 + eqSlotGapV2 * 3;
    const eqStartY2 = prevY2 + (prevH2 - eqTotalH2) / 2 + 6;
    const eqX2 = prevX2 + (eqColW2 - eqSlotS2) / 2;
    const eqTypes = ['helmet', 'chest', 'pants', 'boots'];
    for (let ei = 0; ei < 4; ei++) {
      const esx = eqX2;
      const esy = eqStartY2 + ei * (eqSlotS2 + eqSlotGapV2);
      if (mx >= esx && mx <= esx + eqSlotS2 && my >= esy && my <= esy + eqSlotS2) {
        if (playerEquip[eqTypes[ei]]) {
          unequipItem(eqTypes[ei]);
        }
        return true;
      }
    }

    // Armor inventory grid clicks (right column, below stats)
    const charColW3 = Math.round(prevW2 * 0.30);
    const eqColW3 = Math.round(prevW2 * 0.14);
    const charColX3 = prevX2 + eqColW3 + 4;
    const statsColX3 = charColX3 + charColW3 + 4;
    const statsColW3 = prevW2 - eqColW3 - charColW3 - 12;

    // Recalculate stat lines count to find inventory start
    const hasAnyArmor3 = ITEM_CATEGORIES.armor.some(t => playerEquip[t]);
    let statCount3 = 1;
    if (getArmorHPBonus() > 0) statCount3++;
    statCount3++;
    if (getArmorReduction() > 0) statCount3++;
    if (getProjReduction() > 0) statCount3++;
    if (getBootsSpeedBonus() > 0) statCount3++;
    if (getDodgeChance() > 0) statCount3++;
    if (getThorns() > 0) statCount3++;
    if (getStagger() > 0) statCount3++;
    if (getHealBoost() > 0) statCount3++;
    if (getChestRegen() > 0) statCount3++;
    if (getPoisonReduction() > 0) statCount3++;
    if (getStatusReduction() > 0) statCount3++;
    if (getAbsorb() > 0) statCount3++;
    if (playerEquip.boots && (playerEquip.boots.special === 'shadowstep' || playerEquip.boots.special === 'phase')) statCount3++;
    if (playerEquip.boots && playerEquip.boots.special === 'phase') statCount3++;
    if (hasRevive() && !reviveUsed) statCount3++;
    if (!hasAnyArmor3) statCount3 = 4;

    const statStartY3 = prevY2 + 28;
    const lastStatY3 = statStartY3 + statCount3 * 14;
    const invStartY3 = lastStatY3 + 8;
    const armorGridY3 = invStartY3 + 12;
    const armorGridPad3 = 2;
    const armorGridX3 = statsColX3 + armorGridPad3;
    const armorGridW3 = statsColW3 - armorGridPad3 * 2;
    const armorCols3 = 4;
    const armorSlotGap3 = 2;
    const armorSlotW3 = Math.floor((armorGridW3 - (armorCols3 - 1) * armorSlotGap3) / armorCols3);
    const armorAvailH3 = prevY2 + prevH2 - armorGridY3 - 2;
    const armorSlotH3 = Math.floor((armorAvailH3 - 3 * armorSlotGap3) / 4);
    const armorGridOffX3 = armorGridX3;
    const armorVisibleH3 = armorAvailH3;

    const armorFiltered3 = [];
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] && ITEM_CATEGORIES.armor.includes(inventory[i].type)) {
        armorFiltered3.push({ item: inventory[i], slot: i });
      }
    }
    const armorTypeOrder3 = { helmet: 0, chest: 1, pants: 2, boots: 3 };
    armorFiltered3.sort((a, b) => (armorTypeOrder3[a.item.type] ?? 9) - (armorTypeOrder3[b.item.type] ?? 9));

    for (let ai = 0; ai < armorFiltered3.length; ai++) {
      const { item, slot } = armorFiltered3[ai];
      const col = ai % armorCols3, row = Math.floor(ai / armorCols3);
      const ax = armorGridOffX3 + col * (armorSlotW3 + armorSlotGap3);
      const ay = armorGridY3 + row * (armorSlotH3 + armorSlotGap3) - armorInvScroll;
      if (ay + armorSlotH3 < armorGridY3 || ay > armorGridY3 + armorVisibleH3) continue;
      if (mx >= ax && mx <= ax + armorSlotW3 && my >= ay && my <= ay + armorSlotH3) {
        equipItem(slot);
        return true;
      }
    }

    return true; // consume clicks on armor tab
  }

  // Item grid clicks (non-armor tabs)
  const filtered = [];
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && INV_CATEGORIES[invCategory].filter(inventory[i].type)) {
      filtered.push({ item: inventory[i], slot: i });
    }
  }
  // Must match the same sort as rendering
  if (invCategory === 3 || invCategory === 0) {
    const typeOrder = { gun: 0, melee: 1, helmet: 2, chest: 3, pants: 4, boots: 5, consumable: 6, food: 7, gem: 8, material: 9, scroll: 10, key: 11, misc: 12 };
    filtered.sort((a, b) => (typeOrder[a.item.type] ?? 9) - (typeOrder[b.item.type] ?? 9));
  }

  for (let fi = 0; fi < filtered.length; fi++) {
    const { item, slot } = filtered[fi];
    const col = fi % L.cols, row = Math.floor(fi / L.cols);
    const sx = L.gridX + col * (L.slotS + L.slotGap);
    const sy = L.gridY + row * (L.slotS + L.slotGap);
    if (mx >= sx && mx <= sx + L.slotS && my >= sy && my <= sy + L.slotS) {
      if (ITEM_CATEGORIES.equipment.includes(item.type)) {
        equipItem(slot);
      } else if (item.type === 'consumable' && item.id === 'potion') {
        if (item.count > 0 && potion.cooldown <= 0 && player.hp < (player.maxHp || 100)) {
          item.count--;
          if (item.count <= 0) inventory[slot] = null;
          player.hp = Math.min(player.maxHp || 100, player.hp + potion.healAmount);
          potion.cooldown = potion.cooldownMax;
        }
      } else {
        // All other items → equip to extra hotbar slot 4
        equipItem(slot);
      }
      return true;
    }
  }

  return true; // consume all clicks when inventory is open
}

// Inventory hover handler
function handleInventoryHover(mx, my) {
  invHover = -1;
  armorHoverSlot = -1;
  if (!UI.isOpen('inventory')) return;
  const L = getInvLayout();

  // Armor tab — track hover on armor grid cards
  if (invCategory === 3) {
    // Recalculate armor grid layout (must match rendering)
    const prevW2 = L.contentW;
    const prevX2 = L.pad;
    const prevY2 = L.contentY;
    const prevH2 = L.contentH;
    const charColW3 = Math.round(prevW2 * 0.30);
    const eqColW3 = Math.round(prevW2 * 0.14);
    const charColX3 = prevX2 + eqColW3 + 4;
    const statsColX3 = charColX3 + charColW3 + 4;
    const statsColW3 = prevW2 - eqColW3 - charColW3 - 12;

    const hasAnyArmor3 = ITEM_CATEGORIES.armor.some(t => playerEquip[t]);
    let statCount3 = 1;
    if (getArmorHPBonus() > 0) statCount3++;
    statCount3++;
    if (getArmorReduction() > 0) statCount3++;
    if (getProjReduction() > 0) statCount3++;
    if (getBootsSpeedBonus() > 0) statCount3++;
    if (getDodgeChance() > 0) statCount3++;
    if (getThorns() > 0) statCount3++;
    if (getStagger() > 0) statCount3++;
    if (getHealBoost() > 0) statCount3++;
    if (getChestRegen() > 0) statCount3++;
    if (getPoisonReduction() > 0) statCount3++;
    if (getStatusReduction() > 0) statCount3++;
    if (getAbsorb() > 0) statCount3++;
    if (playerEquip.boots && (playerEquip.boots.special === 'shadowstep' || playerEquip.boots.special === 'phase')) statCount3++;
    if (playerEquip.boots && playerEquip.boots.special === 'phase') statCount3++;
    if (hasRevive() && !reviveUsed) statCount3++;
    if (!hasAnyArmor3) statCount3 = 4;

    const statStartY3 = prevY2 + 28;
    const lastStatY3 = statStartY3 + statCount3 * 14;
    const invStartY3 = lastStatY3 + 8;
    const armorGridY3 = invStartY3 + 12;
    const armorGridPad3 = 2;
    const armorGridX3 = statsColX3 + armorGridPad3;
    const armorGridW3 = statsColW3 - armorGridPad3 * 2;
    const armorCols3 = 4;
    const armorSlotGap3 = 2;
    const armorSlotW3 = Math.floor((armorGridW3 - (armorCols3 - 1) * armorSlotGap3) / armorCols3);
    const armorAvailH3 = prevY2 + prevH2 - armorGridY3 - 2;
    const armorSlotH3 = Math.floor((armorAvailH3 - 3 * armorSlotGap3) / 4);

    const armorFiltered3 = [];
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] && ITEM_CATEGORIES.armor.includes(inventory[i].type)) {
        armorFiltered3.push({ item: inventory[i], slot: i });
      }
    }
    const armorTypeOrder3 = { helmet: 0, chest: 1, pants: 2, boots: 3 };
    armorFiltered3.sort((a, b) => (armorTypeOrder3[a.item.type] ?? 9) - (armorTypeOrder3[b.item.type] ?? 9));

    for (let ai = 0; ai < armorFiltered3.length; ai++) {
      const col = ai % armorCols3, row = Math.floor(ai / armorCols3);
      const ax = armorGridX3 + col * (armorSlotW3 + armorSlotGap3);
      const ay = armorGridY3 + row * (armorSlotH3 + armorSlotGap3) - armorInvScroll;
      if (mx >= ax && mx <= ax + armorSlotW3 && my >= ay && my <= ay + armorSlotH3) {
        armorHoverSlot = armorFiltered3[ai].slot;
        return;
      }
    }
    return;
  }

  const filtered = [];
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && INV_CATEGORIES[invCategory].filter(inventory[i].type)) {
      filtered.push({ item: inventory[i], slot: i });
    }
  }
  // Must match the same sort as rendering
  if (invCategory === 3 || invCategory === 0) {
    const typeOrder = { gun: 0, melee: 1, helmet: 2, chest: 3, pants: 4, boots: 5, consumable: 6, food: 7, gem: 8, material: 9, scroll: 10, key: 11, misc: 12 };
    filtered.sort((a, b) => (typeOrder[a.item.type] ?? 9) - (typeOrder[b.item.type] ?? 9));
  }

  for (let fi = 0; fi < filtered.length; fi++) {
    const col = fi % L.cols, row = Math.floor(fi / L.cols);
    const sx = L.gridX + col * (L.slotS + L.slotGap);
    const sy = L.gridY + row * (L.slotS + L.slotGap);
    if (mx >= sx && mx <= sx + L.slotS && my >= sy && my <= sy + L.slotS) {
      invHover = filtered[fi].slot;
      return;
    }
  }
}

function drawHotbar() {
  const slotW = 64, slotH = 64, gap = 6;
  const slotCount = 5; // gun, melee, potion, armor
  const isBottom = gameSettings.hotbarPosition === "bottom";

  let startX, startY;
  if (isBottom) {
    // Horizontal bottom center
    const totalW = slotCount * (slotW + gap) - gap;
    startX = BASE_W / 2 - totalW / 2;
    startY = BASE_H - slotH - 8;
  } else {
    // Vertical right side
    const totalH = slotCount * (slotH + gap) - gap;
    startX = BASE_W - slotW - 4;
    startY = BASE_H / 2 - totalH / 2;
  }

  const slots = [
    { type: "gun", key: "1" },
    { type: "melee", key: "2" },
    { type: "potion", key: "3" },
    { type: "item", key: "4" },
    { type: "grab", key: "5" },
  ];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    let sx, sy;
    if (isBottom) {
      sx = startX + i * (slotW + gap);
      sy = startY;
    } else {
      sx = startX;
      sy = startY + i * (slotH + gap);
    }
    const isActive = (i < 3 && i === activeSlot) || (i === 4 && isGrabbing);
    const isGrab = slot.type === "grab";
    const isItem = slot.type === "item";

    // Slot background
    ctx.fillStyle = isGrab ? (isGrabbing ? "rgba(200,120,40,0.35)" : "rgba(40,30,20,0.6)")
      : isItem ? (extraSlotItem ? "rgba(40,50,80,0.6)" : "rgba(20,20,30,0.6)")
      : isActive ? "rgba(80,200,120,0.25)" : "rgba(0,0,0,0.6)";
    ctx.beginPath(); ctx.roundRect(sx, sy, slotW, slotH, 6); ctx.fill();

    // Border
    ctx.strokeStyle = isGrab ? (isGrabbing ? "#ffa040" : "rgba(180,140,80,0.3)")
      : isItem ? (extraSlotItem ? "#5a8aee" : "rgba(80,80,120,0.3)")
      : isActive ? PALETTE.accent : "rgba(255,255,255,0.15)";
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(sx, sy, slotW, slotH, 6); ctx.stroke();

    // Tier color bar at top of slot
    if (slot.type === "gun" && playerEquip.gun) {
      ctx.fillStyle = getTierColor(playerEquip.gun.tier);
      ctx.fillRect(sx + 2, sy + 2, slotW - 4, 2);
    } else if (slot.type === "melee" && playerEquip.melee) {
      ctx.fillStyle = getTierColor(playerEquip.melee.tier);
      ctx.fillRect(sx + 2, sy + 2, slotW - 4, 2);
    } else if (isGrab && isGrabbing) {
      ctx.fillStyle = "#ffa040";
      ctx.fillRect(sx + 2, sy + 2, slotW - 4, 2);
    }

    // === SLOT ICONS ===
    if (slot.type === "gun") {
      const gEq = playerEquip.gun;
      const gTier = gEq ? gEq.tier : 1;
      const cx2 = sx + 32, cy2 = sy + 32;
      if (gTier === 4) {
        // Inferno Cannon — thick red barrel with orange glow
        ctx.fillStyle = "#a02020"; ctx.fillRect(sx + 8, sy + 26, 42, 10);
        ctx.fillStyle = "#c03030"; ctx.fillRect(sx + 10, sy + 28, 38, 6);
        ctx.fillStyle = "#ff6600"; ctx.fillRect(sx + 6, sy + 24, 6, 14); // muzzle
        ctx.fillStyle = "#555"; ctx.fillRect(sx + 38, sy + 24, 16, 12);
        ctx.fillStyle = "#777"; ctx.fillRect(sx + 30, sy + 36, 5, 10);
        ctx.fillStyle = "rgba(255,100,0,0.3)"; ctx.beginPath(); ctx.arc(sx + 9, sy + 31, 8, 0, Math.PI * 2); ctx.fill();
      } else if (gTier === 3) {
        // Frost Rifle — blue/white barrel
        ctx.fillStyle = "#4488bb"; ctx.fillRect(sx + 10, sy + 28, 40, 6);
        ctx.fillStyle = "#6ab8e8"; ctx.fillRect(sx + 12, sy + 26, 34, 10);
        ctx.fillStyle = "#aaddff"; ctx.fillRect(sx + 8, sy + 29, 4, 4);
        ctx.fillStyle = "#5a4838"; ctx.fillRect(sx + 38, sy + 24, 14, 12);
        ctx.fillStyle = "#666"; ctx.fillRect(sx + 30, sy + 36, 5, 10);
        ctx.fillStyle = "rgba(100,200,255,0.25)"; ctx.beginPath(); ctx.arc(sx + 10, sy + 31, 6, 0, Math.PI * 2); ctx.fill();
      } else if (gTier === 2) {
        // Rifle — longer barrel, darker
        ctx.fillStyle = "#888"; ctx.fillRect(sx + 8, sy + 28, 44, 6);
        ctx.fillStyle = "#aaa"; ctx.fillRect(sx + 10, sy + 26, 28, 10);
        ctx.fillStyle = "#6a5838"; ctx.fillRect(sx + 38, sy + 24, 16, 12);
        ctx.fillStyle = "#777"; ctx.fillRect(sx + 28, sy + 36, 5, 10);
        ctx.fillRect(sx + 18, sy + 36, 4, 12);
      } else {
        // SMG / Recruit — compact
        ctx.fillStyle = "#999"; ctx.fillRect(sx + 14, sy + 28, 34, 6);
        ctx.fillStyle = "#777"; ctx.fillRect(sx + 14, sy + 26, 20, 10);
        ctx.fillStyle = "#6a5838"; ctx.fillRect(sx + 34, sy + 24, 14, 10);
        ctx.fillStyle = "#666"; ctx.fillRect(sx + 26, sy + 34, 5, 10);
      }
    } else if (slot.type === "melee") {
      const mEq = playerEquip.melee;
      const mId = mEq ? mEq.id : 'katana';
      if (mId === 'war_cleaver') {
        // Trident staff — vertical dark shaft with 3 red prongs
        ctx.strokeStyle = "#2a0808"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx + 32, sy + 52); ctx.lineTo(sx + 32, sy + 16); ctx.stroke();
        ctx.strokeStyle = "#a01515"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx + 32, sy + 16); ctx.lineTo(sx + 32, sy + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 32, sy + 18); ctx.lineTo(sx + 26, sy + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 32, sy + 18); ctx.lineTo(sx + 38, sy + 10); ctx.stroke();
        ctx.fillStyle = "#c02020";
        ctx.beginPath(); ctx.arc(sx + 32, sy + 7, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 25, sy + 9, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(sx + 39, sy + 9, 1.5, 0, Math.PI * 2); ctx.fill();
      } else if (mId === 'storm_blade') {
        // Crystal blade — blue/white
        ctx.strokeStyle = "#a0d0ff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx + 16, sy + 48); ctx.lineTo(sx + 48, sy + 16); ctx.stroke();
        ctx.fillStyle = "#d0e8ff"; ctx.beginPath(); ctx.arc(sx + 48, sy + 16, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#6a4a2a"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(sx + 12, sy + 52); ctx.lineTo(sx + 18, sy + 46); ctx.stroke();
      } else if (mId === 'ninja_katanas') {
        // Dual black katanas crossing
        ctx.strokeStyle = "#1a1a2a"; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(sx + 14, sy + 48); ctx.lineTo(sx + 50, sy + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 50, sy + 48); ctx.lineTo(sx + 14, sy + 12); ctx.stroke();
        ctx.fillStyle = "#333"; ctx.fillRect(sx + 29, sy + 28, 6, 6);
      } else {
        // Default katana/sword
        ctx.strokeStyle = "#ccd8ff"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx + 16, sy + 48); ctx.lineTo(sx + 48, sy + 16); ctx.stroke();
        ctx.strokeStyle = "#8a6a3a"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(sx + 12, sy + 52); ctx.lineTo(sx + 20, sy + 44); ctx.stroke();
        ctx.strokeStyle = "#bbb"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx + 17, sy + 42); ctx.lineTo(sx + 25, sy + 50); ctx.stroke();
      }
    } else if (slot.type === "potion") {
      const px2 = sx + 22, py2 = sy + 12;
      ctx.fillStyle = "#8a7a60"; ctx.fillRect(px2 + 5, py2, 8, 6);
      ctx.fillStyle = "#a89060"; ctx.fillRect(px2 + 6, py2 - 3, 6, 4);
      ctx.fillStyle = potion.count > 0 ? "#44aa44" : "#555";
      ctx.beginPath();
      ctx.moveTo(px2 + 3, py2 + 6); ctx.lineTo(px2 + 1, py2 + 14);
      ctx.lineTo(px2 + 1, py2 + 32); ctx.lineTo(px2 + 17, py2 + 32);
      ctx.lineTo(px2 + 17, py2 + 14); ctx.lineTo(px2 + 15, py2 + 6);
      ctx.closePath(); ctx.fill();
      if (potion.count > 0) {
        ctx.fillStyle = "#33dd55"; ctx.fillRect(px2 + 3, py2 + 18, 12, 13);
        ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(px2 + 4, py2 + 10, 3, 18);
      }
      ctx.strokeStyle = potion.count > 0 ? "#2a8a3a" : "#444"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px2 + 3, py2 + 6); ctx.lineTo(px2 + 1, py2 + 14);
      ctx.lineTo(px2 + 1, py2 + 32); ctx.lineTo(px2 + 17, py2 + 32);
      ctx.lineTo(px2 + 17, py2 + 14); ctx.lineTo(px2 + 15, py2 + 6);
      ctx.closePath(); ctx.stroke();
    } else if (isItem) {
      // Extra item slot — shows equipped item or empty box
      if (extraSlotItem) {
        // Draw item icon based on type
        const itm = extraSlotItem;
        ctx.fillStyle = itm.data && itm.data.color ? itm.data.color : "#5a8aee";
        ctx.beginPath(); ctx.roundRect(sx + 12, sy + 12, 40, 40, 4); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(itm.name.substring(0, 6), sx + 32, sy + 36);
      } else {
        // Empty slot — dashed box with + icon
        ctx.strokeStyle = "#3a4a60"; ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.roundRect(sx + 12, sy + 12, 40, 36, 4); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = "#3a4a60"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx + 32, sy + 22); ctx.lineTo(sx + 32, sy + 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 23, sy + 31); ctx.lineTo(sx + 41, sy + 31); ctx.stroke();
      }
    } else if (isGrab) {
      // Boxing glove icon
      const grabActive = isGrabbing;
      const gc = grabActive ? "#ff4444" : "#cc2222";
      const gcHi = grabActive ? "#ff8888" : "#dd5555";
      const gcDk = grabActive ? "#aa2020" : "#881818";
      // Glove body - rounded
      ctx.fillStyle = gc;
      ctx.beginPath();
      ctx.moveTo(sx + 14, sy + 42); ctx.lineTo(sx + 14, sy + 24);
      ctx.quadraticCurveTo(sx + 14, sy + 12, sx + 28, sy + 10);
      ctx.quadraticCurveTo(sx + 48, sy + 10, sx + 50, sy + 24);
      ctx.lineTo(sx + 50, sy + 36);
      ctx.quadraticCurveTo(sx + 50, sy + 44, sx + 42, sy + 44);
      ctx.lineTo(sx + 22, sy + 44);
      ctx.quadraticCurveTo(sx + 14, sy + 44, sx + 14, sy + 42);
      ctx.closePath(); ctx.fill();
      // Thumb
      ctx.beginPath();
      ctx.moveTo(sx + 50, sy + 26); ctx.quadraticCurveTo(sx + 56, sy + 22, sx + 56, sy + 28);
      ctx.quadraticCurveTo(sx + 56, sy + 36, sx + 50, sy + 34);
      ctx.closePath(); ctx.fill();
      // Knuckle line
      ctx.fillStyle = gcDk;
      ctx.beginPath(); ctx.roundRect(sx + 16, sy + 22, 32, 4, 2); ctx.fill();
      // Highlight
      ctx.fillStyle = gcHi;
      ctx.beginPath(); ctx.ellipse(sx + 30, sy + 16, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Wrist/cuff
      ctx.fillStyle = "#fff";
      ctx.fillRect(sx + 16, sy + 44, 28, 6);
      ctx.fillStyle = "#ddd";
      ctx.fillRect(sx + 16, sy + 48, 28, 3);
      // Lacing
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx + 26, sy + 44); ctx.lineTo(sx + 28, sy + 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx + 34, sy + 44); ctx.lineTo(sx + 36, sy + 40); ctx.stroke();
      // Impact lines when active
      if (grabActive) {
        ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sx + 8, sy + 14); ctx.lineTo(sx + 4, sy + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 12, sy + 10); ctx.lineTo(sx + 10, sy + 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx + 52, sy + 14); ctx.lineTo(sx + 56, sy + 8); ctx.stroke();
      }
    }

    // Key number (not for armor)
    if (slot.key) {
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = isActive ? PALETTE.accent : "#666";
      ctx.textAlign = "left";
      ctx.fillText(slot.key, sx + 4, sy + 14);
    }

    // Grab label
    if (isGrab) {
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = isGrabbing ? "#ffa040" : "#886";
      ctx.textAlign = "center";
      ctx.fillText("GRAB", sx + slotW/2, sy + slotH - 4);
    }

    // Item slot label
    if (isItem) {
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = extraSlotItem ? "#5a8aee" : "#556";
      ctx.textAlign = "center";
      ctx.fillText(extraSlotItem ? extraSlotItem.name.substring(0, 6).toUpperCase() : "ITEM", sx + slotW/2, sy + slotH - 4);
    }

    // Tier label
    if (slot.type === "gun" && playerEquip.gun) {
      ctx.font = "bold 9px monospace"; ctx.fillStyle = getTierColor(playerEquip.gun.tier);
      ctx.textAlign = "right"; ctx.fillText("T" + playerEquip.gun.tier, sx + slotW - 4, sy + 14);
    }
    if (slot.type === "melee" && playerEquip.melee) {
      ctx.font = "bold 9px monospace"; ctx.fillStyle = getTierColor(playerEquip.melee.tier);
      ctx.textAlign = "right"; ctx.fillText("T" + playerEquip.melee.tier, sx + slotW - 4, sy + 14);
    }

    // Cooldown overlay for melee
    if (slot.type === "melee" && melee.cooldown > 0) {
      const cdPct = melee.cooldown / melee.cooldownMax;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(sx + 2, sy + slotH * (1 - cdPct), slotW - 4, slotH * cdPct);
    }

    // Ammo for gun
    if (slot.type === "gun") {
      ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = gun.reloading ? "#fa0" : gun.ammo <= 5 ? "#f44" : "#fff";
      ctx.fillText(gun.reloading ? "R..." : gun.ammo + "/" + gun.magSize, sx + slotW / 2, sy + slotH - 4);
    }

    // [F] hint on melee
    if (slot.type === "melee") {
      ctx.font = "bold 9px monospace"; ctx.fillStyle = "#666";
      ctx.textAlign = "right"; ctx.fillText("[F]", sx + slotW - 4, sy + 14);
    }

    // Potion count
    if (slot.type === "potion") {
      ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = potion.count > 0 ? PALETTE.accent : "#f44";
      ctx.fillText("x" + potion.count, sx + slotW / 2, sy + slotH - 4);
    }

    // Potion cooldown overlay
    if (slot.type === "potion" && potion.cooldown > 0) {
      const cdPct = potion.cooldown / potion.cooldownMax;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(sx + 2, sy + slotH * (1 - cdPct), slotW - 4, slotH * cdPct);
    }

    // Hold-to-inspect progress bar
    if (hotbarHoldSlot === i && hotbarHoldTime > 0 && hotbarHoldTime < HOTBAR_HOLD_THRESHOLD && (i === 0 || i === 1)) {
      const holdPct = hotbarHoldTime / HOTBAR_HOLD_THRESHOLD;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(sx + 2, sy + slotH - 4, slotW - 4, 3);
      ctx.fillStyle = "rgba(74,158,255,0.8)";
      ctx.fillRect(sx + 2, sy + slotH - 4, (slotW - 4) * holdPct, 3);
    }
  }
  ctx.textAlign = "left";
}

function drawGunHUD() {
  const hx = BASE_W - 230, hy = BASE_H / 2 - 110;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(hx, hy, 130, 220);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(hx, hy, 130, 220);

  // Gun name — show equipped gun or default
  const eq = playerEquip.gun;
  const gunName = eq ? eq.name.toUpperCase() : "RECRUIT";
  const gunDmg = gun.damage;
  const gunTierColor = eq ? (eq.tier === 4 ? "#f44" : eq.tier === 3 ? "#4cf" : eq.tier === 2 ? "#fa0" : "#8a8") : "#fa0";
  
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = gunTierColor;
  ctx.fillText(gunName, hx + 65, hy + 16);

  drawGunIcon(hx + 65, hy + 45);

  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  if (gun.reloading) {
    const dots = ".".repeat(1 + Math.floor(Date.now() / 300) % 3);
    ctx.fillStyle = "#fa0";
    ctx.fillText("R" + dots, hx + 65, hy + 78);
  } else {
    ctx.fillStyle = gun.ammo <= 5 ? "#f44" : "#fff";
    ctx.fillText(gun.ammo + "/" + gun.magSize, hx + 65, hy + 78);
  }

  if (gun.reloading) {
    const progress = 1 - (gun.reloadTimer / getReloadTime());
    ctx.fillStyle = "rgba(255,170,0,0.3)";
    ctx.fillRect(hx + 10, hy + 84, 110, 4);
    ctx.fillStyle = "#fa0";
    ctx.fillRect(hx + 10, hy + 84, 110 * progress, 4);
  }

  // Gun stats — DMG, MAG, FIRE RATE
  ctx.font = "bold 10px monospace";
  const gsy = hy + 96;
  const gunStatNames = ["DMG", "MAG", "RATE"];
  const gunStatVals = [gunDmg, gun.magSize, Math.round(60 / Math.max(1, getFireRate()))];
  const gunStatMax = [60, 100, 30]; // rough maxes for bar scale
  const gunStatColors = ["#f66", "#4cf", "#fa0"];

  for (let i = 0; i < 3; i++) {
    const sy = gsy + i * 18;
    ctx.fillStyle = "#777";
    ctx.textAlign = "left";
    ctx.fillText(gunStatNames[i], hx + 6, sy + 9);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(hx + 38, sy + 2, 55, 7);
    ctx.fillStyle = gunStatColors[i];
    ctx.fillRect(hx + 38, sy + 2, 55 * Math.min(1, gunStatVals[i] / gunStatMax[i]), 7);
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "right";
    ctx.fillText(gunStatVals[i], hx + 124, sy + 9);
  }

  // Stat allocation bars
  ctx.font = "bold 10px monospace";
  const statY = gsy + 60;
  const statNames = ["FIRE", "FREZ", "SPRD", "STAK"];
  const statVals = [gunStats.firerate, gunStats.freeze, gunStats.spread, gunStats.stack];
  const statColors = ["#4f4", "#4cf", "#fa0", "#f4f"];
  
  for (let i = 0; i < 4; i++) {
    const sy = statY + i * 16;
    ctx.fillStyle = "#666";
    ctx.textAlign = "left";
    ctx.fillText(statNames[i], hx + 6, sy + 9);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(hx + 38, sy + 2, 55, 6);
    ctx.fillStyle = statColors[i];
    ctx.fillRect(hx + 38, sy + 2, 55 * (statVals[i] / 100), 6);
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "right";
    ctx.fillText(statVals[i] + "%", hx + 124, sy + 9);
  }

  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("[R] Reload", hx + 65, hy + 213);
  ctx.textAlign = "left";
}

function drawMeleeHUD() {
  const hx = BASE_W - 230, hy = BASE_H / 2 - 110;
  const eq = playerEquip.melee;
  const mName = eq ? eq.name.toUpperCase() : "KATANA";
  const mTierColor = eq ? (eq.tier === 4 ? "#f44" : eq.tier === 3 ? "#4cf" : eq.tier === 2 ? "#b060e0" : "#8a8") : "#aaa";

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(hx, hy, 130, 180);
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.strokeRect(hx, hy, 130, 180);

  // Name
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = mTierColor;
  ctx.fillText(mName, hx + 65, hy + 16);

  // Tier label
  if (eq) {
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText("TIER " + eq.tier, hx + 65, hy + 28);
  }

  // Stats
  const mDmg = melee.damage;
  const mRange = melee.range;
  const mSpeed = Math.round(60 / melee.cooldownMax * 10) / 10;
  const mCrit = Math.round((melee.critChance || 0.2) * 100);

  ctx.font = "bold 10px monospace";
  const sy0 = hy + 42;
  const statNames = ["DMG", "RNG", "SPD", "CRIT"];
  const statVals = [mDmg, mRange, mSpeed, mCrit];
  const statDisplay = [mDmg + "", mRange + "px", mSpeed + "/s", mCrit + "%"];
  const statMax = [150, 160, 4, 50];
  const statColors = ["#f66", "#4cf", "#4f4", "#c8f"];

  for (let i = 0; i < 4; i++) {
    const sy = sy0 + i * 20;
    ctx.fillStyle = "#777";
    ctx.textAlign = "left";
    ctx.fillText(statNames[i], hx + 6, sy + 9);
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(hx + 38, sy + 2, 55, 7);
    ctx.fillStyle = statColors[i];
    ctx.fillRect(hx + 38, sy + 2, 55 * Math.min(1, statVals[i] / statMax[i]), 7);
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "right";
    ctx.fillText(statDisplay[i], hx + 124, sy + 9);
  }

  // Special ability label
  const sy5 = sy0 + 88;
  if (melee.special) {
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    const specNames = { storm: "⚡ GODSPEED", cleave: "⛩ SHRINE", ninja: "🗡 DASH" };
    ctx.fillStyle = melee.special === 'storm' ? "#d0e8ff" : melee.special === 'cleave' ? "#ff6060" : "#c090e0";
    ctx.fillText(specNames[melee.special] || melee.special.toUpperCase(), hx + 65, sy5);
  }

  // AOE indicator for ninja
  if (melee.special === 'ninja') {
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#a080c0";
    ctx.fillText("AOE 60px · 30%", hx + 65, sy5 + 14);
  }

  // Desc
  if (eq && eq.desc) {
    ctx.font = "9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText("[Click] Swing", hx + 65, hy + 170);
  }
  ctx.textAlign = "left";
}

function drawGunIcon(cx, cy) {
  // AR-style rifle silhouette matching in-game gun
  // Stock
  ctx.fillStyle = "#6a5838";
  ctx.fillRect(cx + 14, cy - 2, 14, 8);
  ctx.fillStyle = "#7a6848";
  ctx.fillRect(cx + 15, cy - 1, 12, 6);
  // Receiver
  ctx.fillStyle = "#aaa";
  ctx.fillRect(cx - 6, cy - 3, 22, 10);
  ctx.fillStyle = "#bbb";
  ctx.fillRect(cx - 4, cy - 2, 18, 1); // top rail
  // Ejection port
  ctx.fillStyle = "#ccc";
  ctx.fillRect(cx, cy - 1, 4, 3);
  // Pistol grip
  ctx.fillStyle = "#777";
  ctx.fillRect(cx + 6, cy + 7, 5, 10);
  ctx.fillStyle = "#666";
  ctx.fillRect(cx + 7, cy + 8, 3, 8);
  // Trigger
  ctx.fillStyle = "#999";
  ctx.fillRect(cx + 2, cy + 7, 5, 2);
  ctx.fillStyle = "#888";
  ctx.fillRect(cx + 4, cy + 7, 2, 4);
  // Magazine (curved)
  ctx.fillStyle = "#888";
  ctx.fillRect(cx - 2, cy + 7, 5, 14);
  ctx.fillStyle = "#777";
  ctx.fillRect(cx - 1, cy + 8, 3, 12);
  // Handguard
  ctx.fillStyle = "#999";
  ctx.fillRect(cx - 26, cy - 2, 20, 8);
  ctx.fillStyle = "#888";
  ctx.fillRect(cx - 24, cy, 1, 4); ctx.fillRect(cx - 20, cy, 1, 4); ctx.fillRect(cx - 16, cy, 1, 4); ctx.fillRect(cx - 12, cy, 1, 4);
  // Barrel
  ctx.fillStyle = "#aaa";
  ctx.fillRect(cx - 36, cy, 10, 4);
  // Muzzle brake
  ctx.fillStyle = "#777";
  ctx.fillRect(cx - 40, cy - 2, 5, 8);
  ctx.fillStyle = "#666";
  ctx.fillRect(cx - 39, cy - 1, 1, 2); ctx.fillRect(cx - 37, cy - 1, 1, 2);
  ctx.fillRect(cx - 39, cy + 3, 1, 2); ctx.fillRect(cx - 37, cy + 3, 1, 2);
  // Front sight
  ctx.fillStyle = "#bbb";
  ctx.fillRect(cx - 27, cy - 4, 2, 3);
}

// (crosshair removed — 4-directional shooting)

const camera = { x: 0, y: 0 };
function updateCamera() {
  camera.x = Math.max(0, Math.min(player.x - BASE_W / 2, MAP_W - BASE_W));
  camera.y = Math.max(0, Math.min(player.y - BASE_H / 2, MAP_H - BASE_H));
}

// Track shoot-facing state
let shootFaceTimer = 0;
let shootFaceDir = 0;
const SHOOT_FACE_DURATION = 7;

// Speed tracking
let prevX = player.x, prevY = player.y;
let currentSpeed = 0; // pixels per frame
const FPS = 60; // frames to hold shoot direction

function update() {
  try {
  gameFrame++;
  const isTyping = InputIntent.chatActive || nameEditActive;
  // Block movement when a UI panel is open (except toolbox — needs movement for tile placement)
  const panelBlocksMovement = UI.anyOpen() && !UI.isOpen('toolbox');

  // Zone system
  checkPortals();
  updateTransition();
  updateQueue();

  if (UI.isOpen('shop') && !isNearInteractable('shop_station')) { UI.close(); }
  if (UI.isOpen('shop') && waveState === "active") { UI.close(); }

  // === DEATH ANIMATION & RESPAWN ===
  if (playerDead) {
    // Death animation phase
    if (deathTimer > 0) {
      deathTimer--;
      deathRotation = (1 - deathTimer / DEATH_ANIM_FRAMES) * (Math.PI / 2);
      player.x = deathX;
      player.y = deathY;
      player.vx = 0; player.vy = 0;
      player.moving = false;
      return; // freeze everything during death anim
    }
    // Respawn countdown phase
    if (respawnTimer > 0) {
      respawnTimer--;
      player.x = deathX;
      player.y = deathY;
      player.vx = 0; player.vy = 0;
      player.moving = false;
      if (respawnTimer <= 0) {
        // Actually respawn
        playerDead = false;
        StatusFX.clearPoison();
        if (deathGameOver) {
          // Full reset — lost all lives, return to lobby
          resetCombatState('death');
          enterLevel('lobby_01', 28, 30);
        } else {
          player.hp = player.maxHp || 100;
          player.x = 20 * TILE + TILE / 2;
          player.y = 20 * TILE + TILE / 2;
        }
      }
      return; // freeze everything during countdown
    }
  }

  // Freeze: gradual speed recovery after shooting
  if (freezeTimer > 0) freezeTimer--;

  let speedMult = 1.0;
  if (freezeTimer > 0) {
    const maxPenalty = getFreezePenalty();
    speedMult = 1.0 - maxPenalty; // flat penalty for entire freeze duration
  }

  // Apply mob status effects (slow/root/stun) to player movement
  if (typeof StatusFX !== 'undefined' && StatusFX.tickPlayer) {
    const fxResult = StatusFX.tickPlayer();
    if (fxResult.rooted) {
      speedMult = 0; // stun/root = cannot move at all
    } else if (fxResult.speedMult < 1.0) {
      speedMult *= fxResult.speedMult; // slow reduces speed
    }
  }

  // ===================== APPLY INTENTS (Step 3) =====================
  // Authority reads InputIntent and dispatches gameplay actions.
  // Input handlers ONLY set intents; this is the ONLY place they are consumed.

  // --- Movement: compute held direction from keysDown, write to InputIntent ---
  // When authority-driven, commands.js already set moveX/moveY via translateIntentsToCommands.
  const fishingActive = typeof fishingState !== 'undefined' && fishingState.active;
  if (!_authorityDriven) {
    if (!isTyping && !panelBlocksMovement && !fishingActive) {
      let mdx = 0, mdy = 0;
      if (keysDown[keybinds.moveLeft]) mdx -= 1;
      if (keysDown[keybinds.moveRight]) mdx += 1;
      if (keysDown[keybinds.moveUp]) mdy -= 1;
      if (keysDown[keybinds.moveDown]) mdy += 1;
      InputIntent.moveX = mdx;
      InputIntent.moveY = mdy;
    } else {
      InputIntent.moveX = 0;
      InputIntent.moveY = 0;
    }
  }

  // --- Movement: read intents ---
  const dx = InputIntent.moveX;
  const dy = InputIntent.moveY;

  // --- One-frame intent dispatch (consumed once, cleared at end of frame) ---
  if (!isTyping && !panelBlocksMovement && !fishingActive) {
    // Reload
    if (InputIntent.reloadPressed && !gun.reloading && gun.ammo < gun.magSize) {
      gun.reloading = true;
      gun.reloadTimer = getReloadTime();
    }
    // Melee swing
    if (InputIntent.meleePressed) {
      meleeSwing();
    }
    // Ninja dash activation
    if (InputIntent.dashPressed && melee.special === 'ninja' && Scene.inDungeon) {
      if (!melee.dashActive && !melee.dashing && melee.dashCooldown <= 0) {
        melee.dashActive = true;
        melee.dashesLeft = 3;
        melee.dashChainWindow = 180;
        hitEffects.push({ x: player.x, y: player.y - 25, life: 20, type: "ninja_activate" });
      }
    }
    // Interact (E key): stairs, shop close, interactables, queue, inventory
    if (InputIntent.interactPressed) {
      if (nearStairs) {
        if (dungeonComplete) { startTransition('cave_01', 20, 20); }
        else { goToNextFloor(); }
      }
      else if (UI.isOpen('shop')) { UI.close(); }
      else if (UI.isOpen('inventory')) { UI.close(); }
      else {
        const nearby = getNearestInteractable();
        if (nearby) { nearby.onInteract(); }
        else if (nearQueue) { joinQueue(); }
        else { UI.open('inventory'); }
      }
    }
    // Ultimate ability (F key — Shrine or Godspeed)
    if (InputIntent.ultimatePressed && Scene.inDungeon) {
      if (melee.special === 'cleave' && shrine.charges >= shrine.chargesMax && !shrine.active) {
        shrine.active = true;
        shrine.timer = shrine.duration;
        shrine.damagePerSlash = Math.round(melee.damage * 0.6);
        shrine.charges = 0;
        hitEffects.push({ x: player.x, y: player.y - 30, life: 25, type: "shrine_activate" });
      }
      if (melee.special === 'storm' && godspeed.charges >= godspeed.chargesMax && !godspeed.active) {
        godspeed.active = true;
        godspeed.timer = godspeed.duration;
        godspeed.damagePerStrike = Math.round(melee.damage * 0.5);
        godspeed.charges = 0;
        hitEffects.push({ x: player.x, y: player.y - 30, life: 30, type: "godspeed_activate" });
      }
    }
    // Wave skip (N key, OP mode)
    if (InputIntent.skipWavePressed && window._opMode) {
      mobs.forEach(m => m.hp = 0);
      phaseTriggered = [true, true, true];
      mobs = mobs.filter(m => m.hp > 0);
    }
    // Wave ready (G key)
    if (InputIntent.readyWavePressed && Scene.inDungeon) {
      if (!stairsOpen) {
        if (waveState === "cleared" || waveState === "waiting") {
          spawnWave();
        }
      }
    }
    // Hotbar slot keys (1/2/3)
    if (InputIntent.slot1Pressed || InputIntent.slot2Pressed || InputIntent.slot3Pressed) {
      const slot = InputIntent.slot1Pressed ? 0 : InputIntent.slot2Pressed ? 1 : 2;
      if (hotbarSlots[slot].type !== "empty") {
        if (hotbarSlots[slot].type === "potion") {
          usePotion();
        } else {
          activeSlot = slot;
        }
      }
    }
    // Potion (direct press from hotbar click, if not already handled by slot keys)
    if (InputIntent.potionPressed && !InputIntent.slot1Pressed && !InputIntent.slot2Pressed && !InputIntent.slot3Pressed) {
      usePotion();
    }
    // Grab
    if (InputIntent.slot5Pressed) {
      tryGrab();
    }
    // Extra item slot
    if (InputIntent.slot4Pressed) {
      useExtraSlotItem();
    }
  }

  // Leave queue if player tries to move
  if (queueActive && (dx !== 0 || dy !== 0)) {
    queueActive = false;
    queuePlayers = Math.max(0, queuePlayers - 1);
  }

  // Normalize direction
  let mx = dx, my = dy;
  const len = Math.sqrt(mx * mx + my * my);
  if (len > 0) { mx /= len; my /= len; }

  // Diagonal boost for perceptual consistency
  const diagBoost = (dx !== 0 && dy !== 0) ? 1.1 : 1.0;
  const effectiveSpeed = ((player.baseSpeed || player.speed) + getBootsSpeedBonus()) * speedMult * diagBoost;

  // INSTANT movement — no acceleration, no smoothing
  // Press = move at full speed. Release = stop immediately. Graal-style.
  player.vx = mx * effectiveSpeed;
  player.vy = my * effectiveSpeed;

  player.moving = dx !== 0 || dy !== 0;

  const nx = player.x + player.vx;
  const ny = player.y + player.vy;

  // Wall collision with sliding
  const hw = 16;

  // Try X movement
  let canMoveX = true;
  {
    const cL = Math.floor((nx - hw) / TILE), cR = Math.floor((nx + hw) / TILE);
    const rT = Math.floor((player.y - hw) / TILE), rB = Math.floor((player.y + hw) / TILE);
    if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) {
      canMoveX = false;
    }
  }
  if (canMoveX) player.x = nx;

  // Try Y movement
  let canMoveY = true;
  {
    const cL = Math.floor((player.x - hw) / TILE), cR = Math.floor((player.x + hw) / TILE);
    const rT = Math.floor((ny - hw) / TILE), rB = Math.floor((ny + hw) / TILE);
    if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) {
      canMoveY = false;
    }
  }
  if (canMoveY) player.y = ny;

  // Apply knockback velocity (decays over time)
  if (player.knockVx !== 0 || player.knockVy !== 0) {
    const knx = player.x + player.knockVx;
    const kny = player.y + player.knockVy;
    const hw2 = 16;
    // X knockback
    const kcL = Math.floor((knx - hw2) / TILE), kcR = Math.floor((knx + hw2) / TILE);
    const krT = Math.floor((player.y - hw2) / TILE), krB = Math.floor((player.y + hw2) / TILE);
    if (!isSolid(kcL, krT) && !isSolid(kcR, krT) && !isSolid(kcL, krB) && !isSolid(kcR, krB)) {
      player.x = knx;
    } else { player.knockVx = 0; }
    // Y knockback
    const kcL2 = Math.floor((player.x - hw2) / TILE), kcR2 = Math.floor((player.x + hw2) / TILE);
    const krT2 = Math.floor((kny - hw2) / TILE), krB2 = Math.floor((kny + hw2) / TILE);
    if (!isSolid(kcL2, krT2) && !isSolid(kcR2, krT2) && !isSolid(kcL2, krB2) && !isSolid(kcR2, krB2)) {
      player.y = kny;
    } else { player.knockVy = 0; }
    // Decay
    player.knockVx *= 0.8;
    player.knockVy *= 0.8;
    if (Math.abs(player.knockVx) < 0.5) player.knockVx = 0;
    if (Math.abs(player.knockVy) < 0.5) player.knockVy = 0;
  }

  // Ore node collision — push player out of big rocks in mine
  if (typeof resolveOreCollisions === 'function') resolveOreCollisions();

  // Corner nudge — if stuck against a wall corner, nudge perpendicular to allow sliding
  if (!canMoveX && !canMoveY && (player.vx !== 0 || player.vy !== 0)) {
    // Try small nudge in each direction to unstick
    const nudge = 2;
    for (const [ndx, ndy] of [[nudge,0],[-nudge,0],[0,nudge],[0,-nudge]]) {
      const testX = player.x + ndx;
      const testY = player.y + ndy;
      const cL = Math.floor((testX - hw) / TILE), cR = Math.floor((testX + hw) / TILE);
      const rT = Math.floor((testY - hw) / TILE), rB = Math.floor((testY + hw) / TILE);
      if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
        player.x = testX; player.y = testY; break;
      }
    }
  }

  // Face movement direction instantly
  if (dx !== 0 || dy !== 0) {
    if (dy < 0) player.dir = 1;
    if (dy > 0) player.dir = 0;
    if (dx < 0) player.dir = 2;
    if (dx > 0) player.dir = 3;
  }

  // Override facing when shooting (temporary)
  if (shootFaceTimer > 0) {
    player.dir = shootFaceDir;
    shootFaceTimer--;
  }

  // Animation speed scales with actual movement speed
  if (player.moving && speedMult > 0.1) {
    // Slow animation when freeze is active
    const animSpeed = Math.max(4, Math.round(10 / speedMult));
    player.animTimer++;
    if (player.animTimer > animSpeed) { player.animTimer = 0; player.frame = (player.frame + 1) % 4; }
  } else { player.frame = 0; player.animTimer = 0; }

  updateMobs();
  updateMedpacks();
  // Telegraph + Hazard systems (dungeon + test arena)
  if (Scene.inDungeon || Scene.inTestArena) {
    if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.update();
    if (typeof HazardSystem !== 'undefined') HazardSystem.update();
  }
  // Player status effects already ticked before movement (for speed/root to take effect)
  // Poison damage tick (centralized in StatusFX)
  StatusFX.tickPlayerPoison();
  updateGun();
  updateMelee();
  updatePotion();
  updateGrab();
  // Update hotbar hold-to-inspect
  if (hotbarHoldSlot >= 0 && mouse.down) {
    hotbarHoldTime++;
    if (hotbarHoldTime >= HOTBAR_HOLD_THRESHOLD) showWeaponStats = true;
  } else {
    hotbarHoldSlot = -1; hotbarHoldTime = 0; showWeaponStats = false;
  }
  updateBullets();
  if (typeof updateMining === 'function') updateMining();
  if (typeof updateFishing === 'function') updateFishing();
  if (typeof updateCooking === 'function') updateCooking();
  if (typeof updateFarming === 'function') updateFarming();
  if (typeof updateDeliNPCs === 'function') updateDeliNPCs();
  updateDeathEffects();
  updateMobAmbientEffects();
  updateCamera();

  // Calculate actual speed
  const dxF = player.x - prevX;
  const dyF = player.y - prevY;
  currentSpeed = Math.sqrt(dxF * dxF + dyF * dyF) * FPS;
  playerVelX = dxF;
  playerVelY = dyF;
  prevX = player.x;
  prevY = player.y;

  // Clear one-frame intent flags after all systems have consumed them
  clearOneFrameIntents();
  } catch(updateErr) { console.error("update error:", updateErr); }
}

