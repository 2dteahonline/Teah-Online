// ===================== CUSTOMIZATION SCREEN =====================
// Client UI: character customization panel
// Extracted from index_2.html — Phase D

// ===================== CUSTOMIZATION SCREEN =====================
// Hue bar + SV picker state
let pickerHue = 0;
let pickerSat = 1;
let pickerVal = 1;
let draggingHue = false;
let draggingSV = false;

function hsvToHex(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  let r, g, b;
  if (h < 60) { r=c;g=x;b=0; } else if (h < 120) { r=x;g=c;b=0; }
  else if (h < 180) { r=0;g=c;b=x; } else if (h < 240) { r=0;g=x;b=c; }
  else if (h < 300) { r=x;g=0;b=c; } else { r=c;g=0;b=x; }
  const toH = v => Math.round((v+m)*255).toString(16).padStart(2,'0');
  return `#${toH(r)}${toH(g)}${toH(b)}`;
}

function drawCustomizeScreen() {
  if (!UI.isOpen('customize')) return;

  // Full screen bg
  ctx.fillStyle = "#080a10";
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  // Top accent
  const accentGrad = ctx.createLinearGradient(0, 0, BASE_W, 0);
  accentGrad.addColorStop(0, "#1a2a40");
  accentGrad.addColorStop(0.5, "#3a6a8a");
  accentGrad.addColorStop(1, "#1a2a40");
  ctx.fillStyle = accentGrad;
  ctx.fillRect(0, 0, BASE_W, 2);

  // === HEADER ===
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e0e8f0";
  ctx.textAlign = "center";
  ctx.fillText("CHARACTER CREATOR", BASE_W / 2, 32);

  // === VERTICAL SIDEBAR (left) — scrollable ===
  const sideX = 24, sideY = 28;
  const iconSize = 58, iconGap = 6;
  const sideW = iconSize + 18;
  const sideVisibleH = BASE_H - 80;
  const sideTotalH = CUSTOMIZE_CATS.length * (iconSize + iconGap) + 8;

  // Clamp scroll
  const sideMaxScroll = Math.max(0, sideTotalH - sideVisibleH);
  if (customizeSideScroll > sideMaxScroll) customizeSideScroll = sideMaxScroll;
  if (customizeSideScroll < 0) customizeSideScroll = 0;

  ctx.fillStyle = "#0a0e1a";
  ctx.beginPath(); ctx.roundRect(sideX, sideY, sideW, sideVisibleH, 10); ctx.fill();
  ctx.strokeStyle = "#1a2a40";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(sideX, sideY, sideW, sideVisibleH, 10); ctx.stroke();

  // Clip sidebar
  ctx.save();
  ctx.beginPath();
  ctx.rect(sideX, sideY, sideW, sideVisibleH);
  ctx.clip();

  // Category icon colors — vivid and distinct
  const CAT_ICON_COLORS = {
    hair: "#e8a040", facialHair: "#b08050", skin: "#e8b898", eyes: "#50aaee",
    shirt: "#5090dd", pants: "#6070cc", shoes: "#c06830", hat: "#ee5533",
    glasses: "#80ccff", gloves: "#a09070", belt: "#e8c040", cape: "#aa44dd",
    tattoo: "#40cc70", scars: "#ee8877", earring: "#ffd040", necklace: "#d0d8f0",
    backpack: "#b09050", warpaint: "#ee4444",
  };

  for (let i = 0; i < CUSTOMIZE_CATS.length; i++) {
    const iy = sideY + 4 + i * (iconSize + iconGap) - customizeSideScroll;
    const active = i === customizeCat;
    const ix = sideX + 9;

    if (iy + iconSize < sideY || iy > sideY + sideVisibleH) continue;

    // Slot bg with subtle gradient feel
    ctx.fillStyle = active ? "#14203a" : "#0c1018";
    ctx.beginPath(); ctx.roundRect(ix, iy, iconSize, iconSize, 9); ctx.fill();
    if (active) {
      ctx.strokeStyle = "#4a9eff";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(ix, iy, iconSize, iconSize, 9); ctx.stroke();
      // Side accent bar
      ctx.fillStyle = "#4a9eff";
      ctx.beginPath(); ctx.roundRect(sideX + 1, iy + 12, 5, iconSize - 24, 3); ctx.fill();
    }

    const icx = ix + iconSize/2, icy = iy + iconSize/2 - 6;
    const cat = CUSTOMIZE_CATS[i].key;
    const baseCol = CAT_ICON_COLORS[cat] || "#c0d8ff";
    const col = active ? baseCol : shadeColor(baseCol, -55);
    const hi = active ? shadeColor(baseCol, 50) : shadeColor(baseCol, -20);

    if (cat === "hair") {
      // Flowing hair with streaks
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 13, icy + 10); ctx.quadraticCurveTo(icx - 11, icy - 10, icx, icy - 15);
      ctx.quadraticCurveTo(icx + 11, icy - 10, icx + 13, icy + 10);
      ctx.lineTo(icx + 9, icy + 4); ctx.quadraticCurveTo(icx, icy - 9, icx - 9, icy + 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hi; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(icx - 3, icy - 10); ctx.quadraticCurveTo(icx, icy - 2, icx + 2, icy + 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(icx + 4, icy - 12); ctx.quadraticCurveTo(icx + 6, icy - 4, icx + 7, icy + 5); ctx.stroke();
    } else if (cat === "facialHair") {
      // Head with full beard
      ctx.fillStyle = active ? "#e8b898" : "#6a5040";
      ctx.beginPath(); ctx.arc(icx, icy - 3, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1a1a2a";
      ctx.beginPath(); ctx.arc(icx - 4, icy - 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 4, icy - 5, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 10, icy + 1); ctx.quadraticCurveTo(icx - 9, icy + 15, icx, icy + 16);
      ctx.quadraticCurveTo(icx + 9, icy + 15, icx + 10, icy + 1);
      ctx.lineTo(icx + 8, icy - 1); ctx.quadraticCurveTo(icx, icy + 9, icx - 8, icy - 1);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shadeColor(col, -25); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(icx - 6, icy + 1); ctx.quadraticCurveTo(icx - 3, icy + 6, icx, icy + 2);
      ctx.quadraticCurveTo(icx + 3, icy + 6, icx + 6, icy + 1); ctx.stroke();
    } else if (cat === "skin") {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(icx, icy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = active ? "rgba(255,120,120,0.25)" : "rgba(200,100,100,0.1)";
      ctx.beginPath(); ctx.arc(icx - 8, icy + 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 8, icy + 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#2a2020";
      ctx.beginPath(); ctx.arc(icx - 5, icy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 5, icy - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = active ? "#6a4030" : "#333"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(icx, icy + 4, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    } else if (cat === "eyes") {
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(icx - 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(icx + 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(icx - 8, icy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 8, icy, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(icx - 8, icy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 8, icy, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(icx - 9.5, icy - 2, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 6.5, icy - 2, 1.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = active ? "#2a4060" : "#333"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(icx - 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(icx + 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (cat === "shirt") {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 15, icy - 4); ctx.lineTo(icx - 10, icy - 15);
      ctx.lineTo(icx - 3, icy - 11); ctx.lineTo(icx + 3, icy - 11);
      ctx.lineTo(icx + 10, icy - 15); ctx.lineTo(icx + 15, icy - 4);
      ctx.lineTo(icx + 11, icy); ctx.lineTo(icx + 11, icy + 14);
      ctx.lineTo(icx - 11, icy + 14); ctx.lineTo(icx - 11, icy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hi; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(icx - 3, icy - 11); ctx.lineTo(icx, icy - 5);
      ctx.lineTo(icx + 3, icy - 11); ctx.stroke();
      ctx.strokeStyle = shadeColor(col, -25); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(icx + 2, icy + 2, 7, 5, 1); ctx.stroke();
    } else if (cat === "pants") {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 13, icy - 11); ctx.lineTo(icx + 13, icy - 11);
      ctx.lineTo(icx + 13, icy); ctx.lineTo(icx + 15, icy + 14);
      ctx.lineTo(icx + 4, icy + 14); ctx.lineTo(icx, icy + 2);
      ctx.lineTo(icx - 4, icy + 14); ctx.lineTo(icx - 15, icy + 14);
      ctx.lineTo(icx - 13, icy);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shadeColor(col, -20); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(icx, icy - 9); ctx.lineTo(icx, icy + 1); ctx.stroke();
      ctx.fillStyle = shadeColor(col, -15);
      ctx.fillRect(icx - 13, icy - 11, 26, 4);
    } else if (cat === "shoes") {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 10, icy - 5); ctx.lineTo(icx - 10, icy + 6);
      ctx.lineTo(icx + 14, icy + 6); ctx.lineTo(icx + 14, icy + 2);
      ctx.lineTo(icx, icy + 2); ctx.lineTo(icx, icy - 5);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(icx - 12, icy + 6, 28, 4);
      ctx.fillStyle = active ? "#ddd" : "#444";
      ctx.fillRect(icx - 12, icy + 8, 28, 2);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(icx - 4, icy, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx - 4, icy + 3, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hi; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(icx + 2, icy + 4); ctx.quadraticCurveTo(icx + 8, icy, icx + 12, icy + 3); ctx.stroke();
    } else if (cat === "hat") {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(icx, icy, 14, Math.PI, 0); ctx.fill();
      ctx.fillStyle = shadeColor(col, -25);
      ctx.beginPath();
      ctx.moveTo(icx - 18, icy); ctx.quadraticCurveTo(icx - 14, icy + 8, icx + 2, icy + 6);
      ctx.lineTo(icx + 2, icy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hi;
      ctx.beginPath(); ctx.arc(icx, icy - 14, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(icx - 2, icy - 12, 4, 8);
    } else if (cat === "glasses") {
      const lensCol = active ? "rgba(80,200,255,0.3)" : "rgba(80,200,255,0.08)";
      ctx.fillStyle = lensCol;
      ctx.beginPath(); ctx.ellipse(icx - 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(icx + 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(icx - 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(icx + 9, icy, 9, 7, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(icx - 1, icy); ctx.lineTo(icx + 1, icy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(icx - 18, icy); ctx.lineTo(icx - 22, icy - 3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(icx + 18, icy); ctx.lineTo(icx + 22, icy - 3); ctx.stroke();
      ctx.strokeStyle = hi; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(icx - 12, icy - 2, 3, -0.8, 0.3); ctx.stroke();
    } else if (cat === "gloves") {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 9, icy + 12); ctx.lineTo(icx - 9, icy - 2);
      ctx.lineTo(icx - 7, icy - 9); ctx.lineTo(icx - 4, icy - 2);
      ctx.lineTo(icx - 1, icy - 12); ctx.lineTo(icx + 2, icy - 2);
      ctx.lineTo(icx + 5, icy - 10); ctx.lineTo(icx + 7, icy - 2);
      ctx.lineTo(icx + 10, icy - 6); ctx.lineTo(icx + 12, icy);
      ctx.lineTo(icx + 9, icy + 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shadeColor(col, -20);
      ctx.fillRect(icx - 8, icy, 17, 3);
      ctx.fillStyle = hi;
      ctx.fillRect(icx - 9, icy + 8, 18, 4);
    } else if (cat === "belt") {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(icx - 18, icy - 4, 36, 9, 3); ctx.fill();
      ctx.fillStyle = active ? PALETTE.gold : "#886";
      ctx.beginPath(); ctx.roundRect(icx - 6, icy - 7, 12, 14, 2); ctx.fill();
      ctx.fillStyle = active ? "#14203a" : "#0c1018";
      ctx.beginPath(); ctx.roundRect(icx - 4, icy - 5, 8, 10, 1); ctx.fill();
      ctx.fillStyle = active ? PALETTE.gold : "#886";
      ctx.fillRect(icx - 1, icy - 4, 2, 8);
      ctx.fillStyle = shadeColor(col, -30);
      for (let h = 0; h < 3; h++) { ctx.beginPath(); ctx.arc(icx + 11 + h * 4, icy, 1.2, 0, Math.PI * 2); ctx.fill(); }
    } else if (cat === "cape") {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(icx - 11, icy - 14); ctx.lineTo(icx + 11, icy - 14);
      ctx.quadraticCurveTo(icx + 17, icy, icx + 13, icy + 15);
      ctx.quadraticCurveTo(icx + 4, icy + 10, icx, icy + 15);
      ctx.quadraticCurveTo(icx - 4, icy + 10, icx - 13, icy + 15);
      ctx.quadraticCurveTo(icx - 17, icy, icx - 11, icy - 14);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = shadeColor(col, -25);
      ctx.beginPath();
      ctx.moveTo(icx, icy - 10); ctx.quadraticCurveTo(icx + 7, icy, icx + 5, icy + 15);
      ctx.lineTo(icx, icy + 15); ctx.quadraticCurveTo(icx + 3, icy, icx, icy - 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = active ? PALETTE.gold : "#886";
      ctx.beginPath(); ctx.arc(icx, icy - 14, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (cat === "tattoo") {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(icx - 13, icy + 12);
      ctx.quadraticCurveTo(icx - 7, icy, icx, icy - 12);
      ctx.quadraticCurveTo(icx + 7, icy, icx + 13, icy + 12); ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(icx - 7, icy + 7); ctx.quadraticCurveTo(icx, icy - 6, icx + 7, icy + 7); ctx.stroke();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(icx, icy - 12, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hi;
      ctx.beginPath(); ctx.arc(icx - 9, icy + 9, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 9, icy + 9, 2, 0, Math.PI * 2); ctx.fill();
      ctx.lineCap = "butt";
    } else if (cat === "scars") {
      ctx.fillStyle = active ? "#d4a888" : "#6a5040";
      ctx.beginPath(); ctx.arc(icx, icy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#222";
      ctx.beginPath(); ctx.arc(icx - 5, icy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 5, icy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(icx - 2, icy - 13); ctx.lineTo(icx - 4, icy - 6);
      ctx.lineTo(icx - 2, icy); ctx.lineTo(icx - 4, icy + 6);
      ctx.lineTo(icx - 2, icy + 11); ctx.stroke();
      ctx.lineCap = "butt";
    } else if (cat === "earring") {
      ctx.fillStyle = active ? "#d4a888" : "#6a5040";
      ctx.beginPath();
      ctx.moveTo(icx - 2, icy - 15); ctx.quadraticCurveTo(icx + 13, icy - 8, icx + 9, icy + 6);
      ctx.quadraticCurveTo(icx + 5, icy + 10, icx + 3, icy + 4);
      ctx.quadraticCurveTo(icx + 5, icy - 2, icx - 2, icy - 4);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(icx + 7, icy + 6, 3.5, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = active ? "#ff4444" : "#883333";
      ctx.beginPath();
      ctx.moveTo(icx + 7, icy + 10); ctx.lineTo(icx + 4, icy + 15);
      ctx.lineTo(icx + 7, icy + 19); ctx.lineTo(icx + 10, icy + 15); ctx.closePath(); ctx.fill();
      ctx.fillStyle = active ? "#fff" : "#888";
      ctx.beginPath(); ctx.arc(icx + 6, icy + 13, 1.2, 0, Math.PI * 2); ctx.fill();
    } else if (cat === "necklace") {
      ctx.strokeStyle = col; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(icx, icy - 4, 15, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let c = 0; c < 5; c++) {
        const ca = 0.3 + c * 0.48;
        const cx2 = icx + Math.cos(ca) * 15, cy2 = icy - 4 + Math.sin(ca) * 15;
        ctx.beginPath(); ctx.arc(cx2, cy2, 2, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = active ? "#5af" : "#336";
      ctx.beginPath();
      ctx.moveTo(icx, icy + 5); ctx.lineTo(icx - 6, icy + 12);
      ctx.lineTo(icx, icy + 18); ctx.lineTo(icx + 6, icy + 12);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = active ? "#8cf" : "#446";
      ctx.beginPath(); ctx.moveTo(icx, icy + 5); ctx.lineTo(icx + 6, icy + 12);
      ctx.lineTo(icx, icy + 12); ctx.closePath(); ctx.fill();
    } else if (cat === "backpack") {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.roundRect(icx - 11, icy - 6, 22, 22, 5); ctx.fill();
      ctx.fillStyle = shadeColor(col, -22);
      ctx.beginPath(); ctx.roundRect(icx - 8, icy + 4, 16, 9, 2); ctx.fill();
      ctx.strokeStyle = active ? PALETTE.gold : "#665"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(icx - 5, icy + 9); ctx.lineTo(icx + 5, icy + 9); ctx.stroke();
      ctx.fillStyle = shadeColor(col, 15);
      ctx.beginPath(); ctx.roundRect(icx - 11, icy - 6, 22, 5, [5,5,0,0]); ctx.fill();
      ctx.strokeStyle = shadeColor(col, -15); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(icx - 8, icy - 6); ctx.lineTo(icx - 11, icy - 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(icx + 8, icy - 6); ctx.lineTo(icx + 11, icy - 15); ctx.stroke();
    } else if (cat === "warpaint") {
      ctx.fillStyle = active ? "#d4a888" : "#6a5040";
      ctx.beginPath(); ctx.arc(icx, icy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(icx - 5, icy - 3, 4, 3, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(icx + 5, icy - 3, 4, 3, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(icx - 5, icy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(icx + 5, icy - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.fillRect(icx - 14, icy - 6, 9, 3);
      ctx.fillRect(icx + 5, icy - 6, 9, 3);
      ctx.fillRect(icx - 13, icy - 1, 7, 3);
      ctx.fillRect(icx + 6, icy - 1, 7, 3);
      ctx.fillRect(icx - 3, icy + 7, 6, 3);
    }

    // Label — bigger, clearer
    ctx.font = "bold 11px 'Segoe UI', sans-serif";
    ctx.fillStyle = active ? "#c0e0ff" : "#556878";
    ctx.textAlign = "center";
    ctx.fillText(CUSTOMIZE_CATS[i].name, icx, iy + iconSize - 1);
  }

  ctx.restore(); // end sidebar clip

  // Scroll indicator for sidebar
  if (sideMaxScroll > 0) {
    const sbH = sideVisibleH * (sideVisibleH / sideTotalH);
    const sbY = sideY + (customizeSideScroll / sideMaxScroll) * (sideVisibleH - sbH);
    ctx.fillStyle = "rgba(74,158,255,0.3)";
    ctx.beginPath(); ctx.roundRect(sideX + sideW - 4, sbY, 3, sbH, 2); ctx.fill();
  }

  // === CONTENT PANEL ===
  const cpX = sideX + sideW + 14, cpY = 28;
  const cpW = BASE_W * 0.48, cpH = BASE_H - 80;
  ctx.fillStyle = "#0e1220";
  ctx.beginPath(); ctx.roundRect(cpX, cpY, cpW, cpH, 10); ctx.fill();
  ctx.strokeStyle = "#1a2a40";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cpX, cpY, cpW, cpH, 10); ctx.stroke();

  // Category label
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#8aa0b8";
  ctx.textAlign = "left";
  ctx.fillText(CUSTOMIZE_CATS[customizeCat].name.toUpperCase(), cpX + 16, cpY + 22);

  // === PRESET COLORS ===
  const currentColor = player[CUSTOMIZE_CATS[customizeCat].key];
  const swatchS = 32, swatchGap = 5;
  const palCols = Math.floor((cpW - 36) / (swatchS + swatchGap));
  const palX = cpX + 16, palY = cpY + 34;
  const palRows = Math.ceil(COLOR_PALETTE.length / palCols);

  for (let i = 0; i < COLOR_PALETTE.length; i++) {
    const col = i % palCols, row = Math.floor(i / palCols);
    const sx = palX + col * (swatchS + swatchGap);
    const sy = palY + row * (swatchS + swatchGap);
    ctx.fillStyle = COLOR_PALETTE[i];
    ctx.beginPath(); ctx.roundRect(sx, sy, swatchS, swatchS, 5); ctx.fill();
    if (COLOR_PALETTE[i] === currentColor) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.roundRect(sx - 2, sy - 2, swatchS + 4, swatchS + 4, 7); ctx.stroke();
    }
  }

  // === SV PICKER ===
  const svX = palX, svY = palY + palRows * (swatchS + swatchGap) + 14;
  const svW = cpW - 36, svH = 100;

  ctx.font = "bold 10px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#445";
  ctx.fillText("CUSTOM", svX, svY - 4);

  const hGrad = ctx.createLinearGradient(svX, 0, svX + svW, 0);
  hGrad.addColorStop(0, "#fff");
  hGrad.addColorStop(1, `hsl(${pickerHue}, 100%, 50%)`);
  ctx.fillStyle = hGrad;
  ctx.beginPath(); ctx.roundRect(svX, svY, svW, svH, 6); ctx.fill();
  const vGrad = ctx.createLinearGradient(0, svY, 0, svY + svH);
  vGrad.addColorStop(0, "rgba(0,0,0,0)");
  vGrad.addColorStop(1, "#000");
  ctx.fillStyle = vGrad;
  ctx.beginPath(); ctx.roundRect(svX, svY, svW, svH, 6); ctx.fill();
  ctx.strokeStyle = "#1a2a40";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(svX, svY, svW, svH, 6); ctx.stroke();

  const svCurX = svX + pickerSat * svW, svCurY = svY + (1 - pickerVal) * svH;
  ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(svCurX, svCurY, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(svCurX, svCurY, 8, 0, Math.PI * 2); ctx.stroke();

  // === HUE BAR ===
  const hueX = svX, hueY = svY + svH + 10, hueW = svW, hueH = 18;
  const hueGrad = ctx.createLinearGradient(hueX, 0, hueX + hueW, 0);
  for (let i = 0; i <= 6; i++) hueGrad.addColorStop(i/6, `hsl(${i*60}, 100%, 50%)`);
  ctx.fillStyle = hueGrad;
  ctx.beginPath(); ctx.roundRect(hueX, hueY, hueW, hueH, 4); ctx.fill();
  ctx.strokeStyle = "#1a2a40"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(hueX, hueY, hueW, hueH, 4); ctx.stroke();
  const hueCurX = hueX + (pickerHue / 360) * hueW;
  ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.roundRect(hueCurX - 4, hueY - 2, 8, hueH + 4, 3); ctx.fill();
  ctx.strokeStyle = "#000"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(hueCurX - 4, hueY - 2, 8, hueH + 4, 3); ctx.stroke();

  // === HEX ROW ===
  const rowY = hueY + hueH + 12;
  ctx.fillStyle = currentColor;
  ctx.beginPath(); ctx.roundRect(svX, rowY, 42, 32, 6); ctx.fill();
  ctx.strokeStyle = "#2a3a50"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(svX, rowY, 42, 32, 6); ctx.stroke();

  const hfx = svX + 52, hfy = rowY, hfw = 130, hfh = 32;
  ctx.fillStyle = hexInputActive ? "#1a2440" : "#0c1220";
  ctx.beginPath(); ctx.roundRect(hfx, hfy, hfw, hfh, 6); ctx.fill();
  ctx.strokeStyle = hexInputError ? "#cc3333" : (hexInputActive ? "#4a9eff" : "#2a3a50");
  ctx.lineWidth = hexInputActive ? 2 : 1;
  ctx.beginPath(); ctx.roundRect(hfx, hfy, hfw, hfh, 6); ctx.stroke();
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = hexInputActive ? "#e0e8f0" : "#556";
  ctx.fillText(hexInputActive ? hexInputValue : currentColor.toUpperCase(), hfx + hfw/2, hfy + 22);
  if (hexInputActive && Math.floor(Date.now() / 500) % 2 === 0) {
    const tw = ctx.measureText(hexInputValue).width;
    ctx.fillStyle = "#4a9eff";
    ctx.fillRect(hfx + hfw/2 + tw/2 + 2, hfy + 7, 2, 18);
  }

  const abx = hfx + hfw + 8, aby = rowY, abw = 70, abh = 32;
  const validHex = /^#[0-9a-fA-F]{6}$/.test(hexInputValue);
  ctx.fillStyle = validHex ? "#1a3024" : "#0e1220";
  ctx.beginPath(); ctx.roundRect(abx, aby, abw, abh, 6); ctx.fill();
  ctx.strokeStyle = validHex ? "#40a060" : "#2a3a50"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(abx, aby, abw, abh, 6); ctx.stroke();
  ctx.font = "bold 11px 'Segoe UI', sans-serif";
  ctx.fillStyle = validHex ? "#60e090" : "#445";
  ctx.fillText("Apply", abx + abw/2, aby + 21);
  if (hexInputError) {
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#cc3333";
    ctx.fillText("Invalid", hfx + hfw/2, hfy + hfh + 14);
  }

  // === PLAYER PREVIEW (right side, vertically centered) ===
  const prevX = cpX + cpW + (BASE_W - cpX - cpW) / 2;
  const prevY = BASE_H / 2 + 60;

  ctx.save();
  ctx.translate(prevX, prevY);
  ctx.scale(7, 7);
  drawGenericChar(0, 0, 0, 0, false, player.skin, player.hair, player.shirt, player.pants, null, null, "preview");
  ctx.restore();

  ctx.font = "bold 18px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#e0e8f0";
  ctx.textAlign = "center";
  ctx.fillText(player.name, prevX, prevY + 38);

  // === BOTTOM BUTTONS ===
  const btnY = BASE_H - 56;
  ctx.fillStyle = "#1a1218";
  ctx.beginPath(); ctx.roundRect(cpX, btnY, 120, 40, 8); ctx.fill();
  ctx.strokeStyle = "#4a2a2a"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cpX, btnY, 120, 40, 8); ctx.stroke();
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#d08080"; ctx.textAlign = "center";
  ctx.fillText("Cancel", cpX + 60, btnY + 26);

  ctx.fillStyle = "#121a2e";
  ctx.beginPath(); ctx.roundRect(cpX + 136, btnY, 120, 40, 8); ctx.fill();
  ctx.strokeStyle = "#3060a0"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cpX + 136, btnY, 120, 40, 8); ctx.stroke();
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#80b0e0";
  ctx.fillText("Save", cpX + 196, btnY + 26);

  ctx.textAlign = "left";
}

function drawChatPanel() {
  if (!UI.isOpen('chat')) return;
  const px = 12, py = BASE_H - 320, pw = 420, ph = 260;

  // Panel background
  ctx.fillStyle = "rgba(10,10,18,0.85)";
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 8);
  ctx.stroke();

  // Title
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#4f8";
  ctx.textAlign = "left";
  ctx.fillText("CHAT", px + 12, py + 20);

  // Messages (show last ~10)
  ctx.font = "12px monospace";
  const visibleMsgs = chatMessages.slice(-10);
  for (let i = 0; i < visibleMsgs.length; i++) {
    const msg = visibleMsgs[i];
    const my = py + 38 + i * 18;
    ctx.fillStyle = "#fa0";
    ctx.fillText(msg.name + ":", px + 12, my);
    ctx.fillStyle = "#ddd";
    const nameW = ctx.measureText(msg.name + ": ").width;
    ctx.fillText(msg.text, px + 12 + nameW, my);
  }

  // Input box
  const iy = py + ph - 32;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.roundRect(px + 8, iy, pw - 16, 24, 4);
  ctx.fill();
  ctx.strokeStyle = chatInputActive ? "#4f8" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px + 8, iy, pw - 16, 24, 4);
  ctx.stroke();

  ctx.font = "12px monospace";
  ctx.fillStyle = chatInput ? "#fff" : "#666";
  ctx.fillText(chatInput || "Type a message...", px + 14, iy + 16);

  // Blinking cursor
  if (chatInputActive && Math.floor(Date.now() / 500) % 2 === 0) {
    const curX = px + 14 + ctx.measureText(chatInput).width;
    ctx.fillStyle = "#4f8";
    ctx.fillRect(curX, iy + 5, 1, 14);
  }
}

// Graal menu items
const MENU_ITEMS = [
  { name: "Inventory", icon: "inventory" },
  { name: "Identity", icon: "id" },
  { name: "Settings", icon: "settings" },
  { name: "News", icon: "news" },
  { name: "Shop", icon: "shop" },
  { name: "Map", icon: "map" },
  { name: "Guide", icon: "guide" },
  { name: "Friends", icon: "friends" },
  { name: "Gangs", icon: "gangs" },
  { name: "Scores", icon: "scores" },
  { name: "PM History", icon: "pm" },
  { name: "Passcode", icon: "passcode" },
  { name: "Bounty", icon: "bounty" },
  { name: "Career", icon: "career" },
  { name: "Challenges", icon: "challenges" },
];

function drawMenuIcon(cx, cy, icon) {
  // Draw a mini pixel icon for each menu item
  const s = 4; // pixel scale
  switch(icon) {
    case "inventory":
      // Backpack/bag icon
      ctx.fillStyle = "#8a7a5a";
      ctx.beginPath(); ctx.roundRect(cx - 10, cy - 4, 20, 16, 3); ctx.fill();
      ctx.fillStyle = "#a89060";
      ctx.beginPath(); ctx.roundRect(cx - 10, cy - 4, 20, 5, [3,3,0,0]); ctx.fill();
      // Handle/flap
      ctx.strokeStyle = "#a89060"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy - 4, 6, Math.PI, 0); ctx.stroke();
      // Buckle
      ctx.fillStyle = "#c8a040";
      ctx.fillRect(cx - 2, cy - 1, 4, 3);
      break;
    case "id":
      // ID card
      ctx.fillStyle = "#aab";
      ctx.fillRect(cx - 10, cy - 8, 20, 16);
      ctx.fillStyle = "#668";
      ctx.fillRect(cx - 8, cy - 6, 8, 8);
      ctx.fillStyle = "#99a";
      ctx.fillRect(cx + 2, cy - 5, 7, 2);
      ctx.fillRect(cx + 2, cy - 1, 7, 2);
      ctx.fillRect(cx + 2, cy + 3, 5, 2);
      break;
    case "news":
      // Newspaper
      ctx.fillStyle = "#ddd";
      ctx.fillRect(cx - 9, cy - 9, 18, 18);
      ctx.fillStyle = "#444";
      ctx.fillRect(cx - 7, cy - 7, 14, 3);
      ctx.fillStyle = "#888";
      ctx.fillRect(cx - 7, cy - 2, 6, 2);
      ctx.fillRect(cx - 7, cy + 2, 14, 1);
      ctx.fillRect(cx - 7, cy + 5, 14, 1);
      ctx.fillRect(cx - 7, cy + 8, 10, 1);
      ctx.fillStyle = "#a66";
      ctx.fillRect(cx + 2, cy - 2, 5, 5);
      break;
    case "shop":
      // Shopping bag
      ctx.fillStyle = "#c8a050";
      ctx.fillRect(cx - 8, cy - 4, 16, 14);
      ctx.fillStyle = "#a88030";
      ctx.fillRect(cx - 8, cy - 4, 16, 3);
      ctx.strokeStyle = "#a88030";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy - 6, 5, Math.PI, 0); ctx.stroke();
      break;
    case "map":
      // Mini map
      ctx.fillStyle = "#5a9a4a";
      ctx.fillRect(cx - 9, cy - 8, 18, 16);
      ctx.fillStyle = "#4488bb";
      ctx.fillRect(cx - 9, cy + 1, 18, 4);
      ctx.fillStyle = "#c8b070";
      ctx.fillRect(cx - 2, cy - 8, 4, 16);
      ctx.fillStyle = "#e33";
      ctx.beginPath(); ctx.arc(cx, cy - 2, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case "guide":
      // Book
      ctx.fillStyle = "#5577aa";
      ctx.fillRect(cx - 9, cy - 9, 18, 18);
      ctx.fillStyle = "#3a5580";
      ctx.fillRect(cx - 1, cy - 9, 3, 18);
      ctx.fillStyle = "#ddd";
      ctx.fillRect(cx - 7, cy - 5, 5, 2);
      ctx.fillRect(cx - 7, cy - 1, 4, 2);
      ctx.fillRect(cx + 4, cy - 5, 5, 2);
      ctx.fillRect(cx + 4, cy - 1, 4, 2);
      break;
    case "friends":
      // Two people
      ctx.fillStyle = "#bbb";
      ctx.beginPath(); ctx.arc(cx - 5, cy - 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + 5, cy - 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 9, cy + 1, 8, 8);
      ctx.fillRect(cx + 1, cy + 1, 8, 8);
      break;
    case "gangs":
      // Three figures
      ctx.fillStyle = "#c88";
      ctx.beginPath(); ctx.arc(cx, cy - 6, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 4, cy, 8, 7);
      ctx.fillStyle = "#88c";
      ctx.beginPath(); ctx.arc(cx - 8, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx - 11, cy + 2, 6, 6);
      ctx.fillStyle = "#8c8";
      ctx.beginPath(); ctx.arc(cx + 8, cy - 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(cx + 5, cy + 2, 6, 6);
      break;
    case "scores":
      // Trophy
      ctx.fillStyle = "#ffcc00";
      ctx.fillRect(cx - 6, cy - 8, 12, 10);
      ctx.fillRect(cx - 9, cy - 6, 3, 6);
      ctx.fillRect(cx + 6, cy - 6, 3, 6);
      ctx.fillStyle = "#dda800";
      ctx.fillRect(cx - 2, cy + 2, 4, 4);
      ctx.fillRect(cx - 5, cy + 6, 10, 3);
      break;
    case "pm":
      // Chat bubble
      ctx.fillStyle = "#aac";
      ctx.beginPath(); ctx.roundRect(cx - 10, cy - 8, 20, 14, 4); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + 6); ctx.lineTo(cx - 8, cy + 12); ctx.lineTo(cx, cy + 6);
      ctx.fill();
      ctx.fillStyle = "#669";
      ctx.fillRect(cx - 6, cy - 4, 3, 2);
      ctx.fillRect(cx - 1, cy - 4, 3, 2);
      ctx.fillRect(cx + 4, cy - 4, 3, 2);
      break;
    case "passcode":
      // Lock
      ctx.fillStyle = "#aaa";
      ctx.fillRect(cx - 6, cy - 2, 12, 11);
      ctx.strokeStyle = "#888";
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy - 4, 5, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = "#555";
      ctx.beginPath(); ctx.arc(cx, cy + 3, 2, 0, Math.PI * 2); ctx.fill();
      break;
    case "bounty":
      // Wanted poster
      ctx.fillStyle = "#d8c8a0";
      ctx.fillRect(cx - 9, cy - 9, 18, 18);
      ctx.fillStyle = "#8a4a2a";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WANTED", cx, cy - 3);
      ctx.fillStyle = "#666";
      ctx.fillRect(cx - 4, cy, 8, 6);
      break;
    case "career":
      // Star badge
      ctx.fillStyle = "#dda020";
      const pts = 5, outerR = 9, innerR = 4;
      ctx.beginPath();
      for (let i = 0; i < pts * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const a = (i * Math.PI / pts) - Math.PI / 2;
        if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
        else ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath(); ctx.fill();
      break;
    case "challenges":
      // Sword crossed with shield
      ctx.fillStyle = "#aab";
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.5);
      ctx.fillRect(-2, -10, 4, 20);
      ctx.fillRect(-5, 5, 10, 3);
      ctx.restore();
      ctx.fillStyle = "#77a";
      ctx.beginPath(); ctx.arc(cx + 3, cy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#99c";
      ctx.beginPath(); ctx.arc(cx + 3, cy, 4, 0, Math.PI * 2); ctx.fill();
      break;
    case "settings":
      // Gear
      ctx.fillStyle = "#aab";
      const sTeeth = 8, sOuter = 10, sInner = 7, sTW = 0.28;
      ctx.beginPath();
      for (let i = 0; i < sTeeth; i++) {
        const a = (i / sTeeth) * Math.PI * 2;
        ctx.lineTo(cx + Math.cos(a - sTW) * sOuter, cy + Math.sin(a - sTW) * sOuter);
        ctx.lineTo(cx + Math.cos(a + sTW) * sOuter, cy + Math.sin(a + sTW) * sOuter);
        const mid = a + Math.PI / sTeeth;
        ctx.lineTo(cx + Math.cos(mid - sTW) * sInner, cy + Math.sin(mid - sTW) * sInner);
        ctx.lineTo(cx + Math.cos(mid + sTW) * sInner, cy + Math.sin(mid + sTW) * sInner);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#333";
      ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

function drawProfilePanel() {
  if (!UI.isOpen('profile')) return;
  const cols = 5, iconS = 60, iconGap = 18;
  const labelH = 24; // space below icon for label
  const rows = Math.ceil(MENU_ITEMS.length / cols);
  const cellW = iconS + iconGap;
  const cellH = iconS + labelH + iconGap;
  const gridW = cols * cellW - iconGap;
  const gridH = rows * cellH - iconGap;

  const pw = gridW + 64;
  const ph = gridH + 120;
  const px = BASE_W/2 - pw/2, py = BASE_H/2 - ph/2;

  // Dark panel
  ctx.fillStyle = "rgba(8,8,14,0.96)";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = "#2a6a4a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.stroke();

  // Title bar
  ctx.fillStyle = "rgba(40,100,70,0.2)";
  ctx.fillRect(px + 2, py + 2, pw - 4, 44);

  // Player icon + name in title
  ctx.save();
  ctx.translate(px + 34, py + 24);
  ctx.scale(0.55, 0.55);
  drawGenericChar(0, 0, 0, 0, false, player.skin, player.hair, player.shirt, player.pants, null, null, "preview");
  ctx.restore();
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText(player.name, px + pw/2, py + 30);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 44, py + 7, 36, 32, 6); ctx.fill();
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("✕", px + pw - 26, py + 29);

  // === ICON GRID ===
  const gridStartX = px + (pw - gridW) / 2;
  const gridStartY = py + 56;

  for (let i = 0; i < MENU_ITEMS.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const ix = gridStartX + col * cellW;
    const iy = gridStartY + row * cellH;

    // Icon bg
    ctx.fillStyle = "rgba(30,30,44,0.85)";
    ctx.beginPath(); ctx.roundRect(ix, iy, iconS, iconS, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(ix, iy, iconS, iconS, 10); ctx.stroke();

    // Scale up menu icons
    ctx.save();
    ctx.translate(ix + iconS/2, iy + iconS/2);
    ctx.scale(1.4, 1.4);
    drawMenuIcon(0, 0, MENU_ITEMS[i].icon);
    ctx.restore();

    // Label — use sans-serif (much narrower), auto-shrink if needed
    const name = MENU_ITEMS[i].name;
    let fontSize = 14;
    ctx.font = "bold " + fontSize + "px 'Segoe UI', sans-serif";
    const maxLabelW = cellW + 8;
    while (ctx.measureText(name).width > maxLabelW && fontSize > 10) {
      fontSize--;
      ctx.font = "bold " + fontSize + "px 'Segoe UI', sans-serif";
    }
    ctx.fillStyle = "#d0e0f0";
    ctx.textAlign = "center";
    ctx.fillText(name, ix + iconS/2, iy + iconS + 17);
  }

  // === Footer: Stats + Help ===
  const footBtnW = 80, footBtnH = 32;
  const statsFootY = py + ph - 44;
  const statsFootX = px + 18;
  ctx.fillStyle = "rgba(80,200,120,0.1)";
  ctx.beginPath(); ctx.roundRect(statsFootX, statsFootY, footBtnW, footBtnH, 6); ctx.fill();
  ctx.strokeStyle = "rgba(80,200,120,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(statsFootX, statsFootY, footBtnW, footBtnH, 6); ctx.stroke();
  ctx.font = "bold 15px 'Segoe UI', sans-serif";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText("Stats", statsFootX + footBtnW / 2, statsFootY + 22);

  const helpFootX = px + pw - footBtnW - 18;
  ctx.fillStyle = "rgba(80,200,120,0.1)";
  ctx.beginPath(); ctx.roundRect(helpFootX, statsFootY, footBtnW, footBtnH, 6); ctx.fill();
  ctx.strokeStyle = "rgba(80,200,120,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(helpFootX, statsFootY, footBtnW, footBtnH, 6); ctx.stroke();
  ctx.font = "bold 15px 'Segoe UI', sans-serif";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText("Help", helpFootX + footBtnW / 2, statsFootY + 22);

  ctx.textAlign = "left";
}

