// ===================== PANELS =====================
// Client UI: identity panel, stats/leveling panel
// Extracted from index_2.html â Phase D

// ===================== IDENTITY PANEL =====================
function drawIdentityPanel() {
  if (!UI.isOpen('identity')) return;
  // Original left content width + extra right column for status
  const leftW = 520;
  const statusColW = 220;
  const pw = leftW + statusColW, ph = 500;
  const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;

  // Solid centered panel
  ctx.fillStyle = "#0a0e18";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill();
  ctx.strokeStyle = "#2a6a4a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.stroke();

  // Title bar
  ctx.fillStyle = "#122a1e";
  ctx.beginPath(); ctx.roundRect(px + 2, py + 2, pw - 4, 38, [8,8,0,0]); ctx.fill();
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  if (nameEditActive) {
    // Editable name field
    ctx.fillStyle = "#0a1a10";
    ctx.beginPath(); ctx.roundRect(px + 60, py + 5, pw - 156, 30, 4); ctx.fill();
    ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px + 60, py + 5, pw - 156, 30, 4); ctx.stroke();
    ctx.fillStyle = "#fff";
    const cursor = Math.floor(Date.now() / 500) % 2 === 0 ? "|" : "";
    ctx.fillText(nameEditValue + cursor, px + pw/2, py + 28);
  } else {
    // Draw mini player avatar using actual Choso draw function
    const nameW = ctx.measureText(player.name).width;
    const avX = px + pw/2 - nameW/2 - 18;
    const avY = py + 30;
    ctx.save();
    ctx.beginPath();
    ctx.rect(avX - 12, py + 2, 28, 34);
    ctx.clip();
    ctx.translate(avX, avY);
    ctx.scale(0.38, 0.38);
    drawChoso(20, 68, 0, 0, false, null, null);
    ctx.restore();
    // Name
    ctx.fillStyle = PALETTE.accent;
    ctx.fillText(player.name, px + pw/2 + 4, py + 28);
  }

  // Close X
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 36, py + 6, 28, 28, 4); ctx.fill();
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("\u2715", px + pw - 22, py + 25);

  // === LEFT SIDE: Stats ===
  const statsX = px + 24, statsStartY = py + 68;
  const lineH = 26;
  ctx.textAlign = "left";

  const stats = [
    { label: "Online-Time:", value: (() => { const totalMin = Math.floor(Date.now() / 60000) % 9999; const h = Math.floor(totalMin / 60); const m = totalMin % 60; return h > 0 ? h + " h " + m + " m" : m + " m"; })() },
    { label: "Player Level:", value: playerLevel.toString(), color: "#5fc8ff" },
    { label: "Faction:", value: playerFaction, color: playerFaction === "Wild West" ? "#d4a040" : playerFaction === "Frostlands" ? "#66ccff" : playerFaction === "Desert" ? "#e8b050" : playerFaction === "Medieval" ? "#8a8aaa" : playerFaction === "Tropical" ? "#44cc66" : playerFaction === "City" ? "#a0b8e0" : "#c8a0ff", hasFaction: true },
    { label: "Country:", value: playerCountry, color: "#ffcc55", hasFlag: true },
    { label: "Language:", value: gameSettings.language, color: "#55ddbb", hasLangFlag: true },
    { label: "Gender:", value: playerGender, color: playerGender === "Male" ? "#4a9aff" : "#ff6aaa", hasGender: true },
    { label: "Relationship:", value: gameSettings.relationshipStatus, color: gameSettings.relationshipStatus === "Married" ? "#ff44bb" : gameSettings.relationshipStatus === "Dating" ? "#ff5533" : gameSettings.relationshipStatus === "Complicated" ? "#ffdd00" : "#88bbff" },
    { label: "Cheonz ($):", value: gold.toString(), color: PALETTE.gold },
    { label: "Hitpoints:", value: player.hp + "/" + (player.maxHp || 100), color: player.hp < 30 ? "#e44" : PALETTE.accent },
    { label: "Kills:", value: kills.toString(), color: "#ff4455" },
    { label: "Spars:", value: spars.toString(), color: "#55ccff" },
  ];

  const valX = statsX + 155; // standard value column X

  for (let i = 0; i < stats.length; i++) {
    const row = statsStartY + i * lineH;
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(stats[i].label, statsX, row);
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillStyle = stats[i].color || "#e8f0f8";
    if (stats[i].hasFaction) {
      const ix = valX + 10, iy = row - 5;
      ctx.save();
      if (playerFaction === "Wild West") {
        // Sheriff 5-pointed star badge
        ctx.fillStyle = "#d4a040"; ctx.strokeStyle = "#8a6020"; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let p = 0; p < 5; p++) {
          const a = -Math.PI/2 + p * Math.PI*2/5;
          ctx.lineTo(ix + Math.cos(a) * 10, iy + Math.sin(a) * 10);
          const a2 = a + Math.PI/5;
          ctx.lineTo(ix + Math.cos(a2) * 4, iy + Math.sin(a2) * 4);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#2a1808"; ctx.beginPath(); ctx.arc(ix, iy, 3, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#d4a040"; ctx.beginPath(); ctx.arc(ix, iy, 1.5, 0, Math.PI*2); ctx.fill();
      } else if (playerFaction === "Frostlands") {
        // Detailed snowflake
        ctx.strokeStyle = "#66ccff"; ctx.lineWidth = 2;
        for (let a = 0; a < 6; a++) {
          const ang = a * Math.PI / 3;
          const ex = Math.cos(ang), ey = Math.sin(ang);
          ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + ex*10, iy + ey*10); ctx.stroke();
          const bx = ix + ex*6, by = iy + ey*6;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ang+0.7)*4, by + Math.sin(ang+0.7)*4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ang-0.7)*4, by + Math.sin(ang-0.7)*4); ctx.stroke();
        }
        ctx.fillStyle = "#aaeeff"; ctx.beginPath(); ctx.arc(ix, iy, 2.5, 0, Math.PI*2); ctx.fill();
      } else if (playerFaction === "Desert") {
        // Pyramid with sun
        ctx.fillStyle = "#e8b050";
        ctx.beginPath(); ctx.moveTo(ix, iy - 9); ctx.lineTo(ix + 11, iy + 7); ctx.lineTo(ix - 11, iy + 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#c08830";
        ctx.beginPath(); ctx.moveTo(ix, iy - 9); ctx.lineTo(ix + 11, iy + 7); ctx.lineTo(ix + 1, iy + 3); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.arc(ix + 7, iy - 6, 3, 0, Math.PI*2); ctx.fill();
      } else if (playerFaction === "Medieval") {
        // Shield with sword
        ctx.fillStyle = "#7070aa";
        ctx.beginPath(); ctx.moveTo(ix - 9, iy - 9); ctx.lineTo(ix + 9, iy - 9); ctx.lineTo(ix + 9, iy + 1); ctx.quadraticCurveTo(ix + 9, iy + 9, ix, iy + 11); ctx.quadraticCurveTo(ix - 9, iy + 9, ix - 9, iy + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#9090cc"; ctx.beginPath(); ctx.moveTo(ix - 9, iy - 9); ctx.lineTo(ix, iy - 9); ctx.lineTo(ix, iy + 11); ctx.quadraticCurveTo(ix - 9, iy + 9, ix - 9, iy + 1); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ddd"; ctx.fillRect(ix - 1, iy - 7, 2, 12);
        ctx.fillStyle = "#aa8833"; ctx.fillRect(ix - 4, iy + 3, 8, 2);
      } else if (playerFaction === "Tropical") {
        // Palm tree
        ctx.fillStyle = "#6a4a18"; ctx.fillRect(ix - 2, iy - 2, 4, 13);
        ctx.fillStyle = "#44cc66";
        ctx.beginPath(); ctx.ellipse(ix - 6, iy - 6, 8, 3, -0.4, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ix + 5, iy - 5, 7, 3, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ix - 1, iy - 9, 6, 2.5, -0.1, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#8a5a20"; ctx.beginPath(); ctx.arc(ix - 2, iy - 3, 2, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ix + 2, iy - 2, 2, 0, Math.PI*2); ctx.fill();
      } else if (playerFaction === "City") {
        // Skyline with antenna
        ctx.fillStyle = "#7090b0";
        ctx.fillRect(ix - 9, iy - 3, 6, 14); ctx.fillRect(ix - 2, iy + 1, 6, 10); ctx.fillRect(ix + 5, iy - 8, 5, 19);
        ctx.fillStyle = "#a0b8e0"; ctx.fillRect(ix + 6.5, iy - 11, 1.5, 4);
        ctx.fillStyle = "#ff4444"; ctx.beginPath(); ctx.arc(ix + 7.25, iy - 11.5, 1.2, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(ix - 8, iy - 1, 2, 2); ctx.fillRect(ix - 8, iy + 4, 2, 2);
        ctx.fillRect(ix - 1, iy + 3, 2, 2); ctx.fillRect(ix + 6, iy - 5, 2, 2); ctx.fillRect(ix + 6, iy - 1, 2, 2); ctx.fillRect(ix + 6, iy + 3, 2, 2);
      }
      ctx.restore();
      ctx.fillStyle = stats[i].color || "#e8f0f8";
      ctx.fillText(stats[i].value, valX + 24, row);

    } else if (stats[i].hasFlag) {
      drawFlag(ctx, valX, row - 12, 24, 16, playerCountry);
      ctx.font = "bold 16px 'Segoe UI', sans-serif";
      ctx.fillText(stats[i].value, valX + 28, row);
    } else if (stats[i].hasLangFlag) {
      const langCountry = LANG_TO_COUNTRY[gameSettings.language];
      if (langCountry) drawFlag(ctx, valX, row - 12, 24, 16, langCountry);
      ctx.font = "bold 16px 'Segoe UI', sans-serif";
      ctx.fillText(stats[i].value, valX + 28, row);
    } else if (stats[i].hasGender) {
      // Draw gender symbol icon
      const gx = valX + 10, gy = row - 4;
      ctx.save();
      ctx.strokeStyle = stats[i].color; ctx.fillStyle = stats[i].color; ctx.lineWidth = 2.5;
      if (playerGender === "Male") {
        // ♂ Mars symbol - circle with arrow
        ctx.beginPath(); ctx.arc(gx - 2, gy + 2, 6.5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx + 3, gy - 3); ctx.lineTo(gx + 10, gy - 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx + 5, gy - 10); ctx.lineTo(gx + 10, gy - 10); ctx.lineTo(gx + 10, gy - 5); ctx.stroke();
      } else {
        // ♀ Venus symbol - circle with cross
        ctx.beginPath(); ctx.arc(gx, gy - 2, 6.5, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx, gy + 4.5); ctx.lineTo(gx, gy + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx - 4, gy + 8); ctx.lineTo(gx + 4, gy + 8); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = stats[i].color;
      ctx.fillText(stats[i].value, valX + 26, row);
    } else {
      ctx.fillText(stats[i].value, valX, row);
    }
  }

  // === Character preview (shifted further right and lower) ===
  const charCenterX = px + leftW / 2 + 140;
  const charY = py + 360;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.clip();
  ctx.translate(charCenterX, charY);
  ctx.scale(3, 3);
  drawGenericChar(0, 0, 0, 0, false, player.skin, player.hair, player.shirt, player.pants, null, null, "preview");
  ctx.restore();

  // === INVENTORY (3 slots, pushed down more) ===
  const invY = statsStartY + stats.length * lineH + 24;
  ctx.font = "bold 18px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.fillText("INVENTORY", statsX, invY);
  ctx.fillStyle = PALETTE.accent;
  ctx.font = "bold 16px 'Segoe UI', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("View All >", statsX + 3 * (56 + 8) - 8, invY);

  const slotSize = 56, slotGap = 8;
  const invSlotY = invY + 10;
  const invItems = [
    { name: playerEquip.gun ? playerEquip.gun.name.toUpperCase() : "RECRUIT", type: "gun", equipped: activeSlot === 0 },
    { name: playerEquip.melee ? playerEquip.melee.name.toUpperCase() : "KATANA", type: "melee", equipped: activeSlot === 1 },
    { name: "POTION", type: "potion", equipped: activeSlot === 2 },
  ];

  for (let i = 0; i < 3; i++) {
    const sx = statsX + i * (slotSize + slotGap);
    const sy = invSlotY;
    const isActive = invItems[i].equipped;
    ctx.fillStyle = isActive ? "#1a3a1a" : "#0a0a14";
    ctx.beginPath(); ctx.roundRect(sx, sy, slotSize, slotSize, 6); ctx.fill();
    ctx.strokeStyle = isActive ? PALETTE.accent : "#2a2a3a";
    ctx.lineWidth = isActive ? 2.5 : 1;
    ctx.beginPath(); ctx.roundRect(sx, sy, slotSize, slotSize, 6); ctx.stroke();

    if (invItems[i].type === "gun") {
      ctx.fillStyle = "#aaa"; ctx.fillRect(sx+10,sy+24,36,6);
      ctx.fillStyle = "#888"; ctx.fillRect(sx+10,sy+22,20,10);
      ctx.fillStyle = "#6a5838"; ctx.fillRect(sx+30,sy+20,14,10);
      ctx.fillStyle = "#777"; ctx.fillRect(sx+24,sy+30,5,10); ctx.fillRect(sx+14,sy+30,4,12);
    } else if (invItems[i].type === "melee") {
      ctx.save(); ctx.translate(sx+slotSize/2,sy+slotSize/2); ctx.rotate(-Math.PI/4);
      ctx.fillStyle="#aaa"; ctx.fillRect(-2,-20,4,24);
      ctx.fillStyle="#c8b060"; ctx.fillRect(-4,4,8,4);
      ctx.fillStyle="#6a4a2a"; ctx.fillRect(-2,8,4,14); ctx.restore();
    } else if (invItems[i].type === "potion") {
      const bx=sx+18,by=sy+8;
      ctx.fillStyle="#8a7a60"; ctx.fillRect(bx+5,by,8,6);
      ctx.fillStyle="#a89060"; ctx.fillRect(bx+6,by-3,6,4);
      ctx.fillStyle=potion.count>0?"#44aa44":"#555";
      ctx.beginPath(); ctx.moveTo(bx+3,by+6);ctx.lineTo(bx+1,by+14);ctx.lineTo(bx+1,by+32);ctx.lineTo(bx+17,by+32);ctx.lineTo(bx+17,by+14);ctx.lineTo(bx+15,by+6); ctx.closePath(); ctx.fill();
      if(potion.count>0){ctx.fillStyle="#33dd55";ctx.fillRect(bx+3,by+18,12,13);ctx.fillStyle="#ffffff40";ctx.fillRect(bx+4,by+10,3,18);}
      ctx.strokeStyle=potion.count>0?"#2a8a3a":"#444"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(bx+3,by+6);ctx.lineTo(bx+1,by+14);ctx.lineTo(bx+1,by+32);ctx.lineTo(bx+17,by+32);ctx.lineTo(bx+17,by+14);ctx.lineTo(bx+15,by+6); ctx.closePath(); ctx.stroke();
    }
    ctx.font="bold 14px monospace"; ctx.fillStyle=isActive?PALETTE.accent:"#8a9aa8"; ctx.textAlign="left";
    ctx.fillText((i+1).toString(),sx+4,sy+13);
  }

  // === Vertical divider between left and right ===
  ctx.strokeStyle = "rgba(80,200,120,0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + leftW, py + 44);
  ctx.lineTo(px + leftW, py + ph - 56);
  ctx.stroke();

  // === RIGHT COLUMN: Status text box (right of avatar) ===
  const statusAreaX = px + leftW + 10;
  const statusAreaY = py + 48;
  const statusAreaW = statusColW - 22;
  const statusAreaH = ph - 110;

  // Status text box — no label, just the box
  ctx.fillStyle = statusEditActive ? "rgba(20,40,30,0.8)" : "rgba(20,20,30,0.5)";
  ctx.beginPath(); ctx.roundRect(statusAreaX, statusAreaY, statusAreaW, statusAreaH, 6); ctx.fill();
  ctx.strokeStyle = statusEditActive ? PALETTE.accent : "rgba(80,200,120,0.15)";
  ctx.lineWidth = statusEditActive ? 1.5 : 1;
  ctx.beginPath(); ctx.roundRect(statusAreaX, statusAreaY, statusAreaW, statusAreaH, 6); ctx.stroke();

  if (statusEditActive) {
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    const mW = statusAreaW - 16;
    const sLines = [];
    let cl = '';
    for (const ch of statusEditValue) {
      if (ctx.measureText(cl + ch).width > mW) { sLines.push(cl); cl = ch; } else { cl += ch; }
    }
    sLines.push(cl);
    for (let li = 0; li < Math.min(sLines.length, 20); li++) {
      ctx.fillText(sLines[li], statusAreaX + 8, statusAreaY + 20 + li * 20);
    }
    if (Math.floor(Date.now() / 500) % 2 === 0) {
      const last = sLines[sLines.length - 1] || '';
      const cxPos = statusAreaX + 8 + ctx.measureText(last).width;
      const cyPos = statusAreaY + 6 + (sLines.length - 1) * 20;
      ctx.fillStyle = PALETTE.accent;
      ctx.fillRect(cxPos, cyPos, 2, 16);
    }
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#5a9a7a";
    ctx.textAlign = "center";
    ctx.fillText("Enter to save", statusAreaX + statusAreaW/2, statusAreaY + statusAreaH - 6);
  } else if (playerStatus) {
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    const mW2 = statusAreaW - 16;
    const sLines2 = [];
    let cl2 = '';
    for (const ch of playerStatus) {
      if (ctx.measureText(cl2 + ch).width > mW2) { sLines2.push(cl2); cl2 = ch; } else { cl2 += ch; }
    }
    sLines2.push(cl2);
    for (let li = 0; li < Math.min(sLines2.length, 20); li++) {
      ctx.fillText(sLines2[li], statusAreaX + 8, statusAreaY + 20 + li * 20);
    }
  } else {
    // Empty status area — no hint text
  }

  // === BOTTOM BUTTONS ===
  const btnY = py + ph - 48;
  const btnW = 120, btnH = 38, btnGap = 16;
  const totalBtnW = btnW * 3 + btnGap * 2;
  const btnStartX = px + (pw - totalBtnW) / 2;

  // Stats (was Back)
  ctx.fillStyle = "#121e14";
  ctx.beginPath(); ctx.roundRect(btnStartX, btnY, btnW, btnH, 6); ctx.fill();
  ctx.strokeStyle = "#3a8a5a"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(btnStartX, btnY, btnW, btnH, 6); ctx.stroke();
  ctx.font = "bold 18px 'Segoe UI', sans-serif"; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center";
  ctx.fillText("Stats", btnStartX + btnW/2, btnY + 25);

  // Status
  ctx.fillStyle = statusEditActive ? "#1a2a1a" : "#141420";
  ctx.beginPath(); ctx.roundRect(btnStartX+btnW+btnGap, btnY, btnW, btnH, 6); ctx.fill();
  ctx.strokeStyle = statusEditActive ? PALETTE.accent : "#444"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(btnStartX+btnW+btnGap, btnY, btnW, btnH, 6); ctx.stroke();
  ctx.font = "bold 18px 'Segoe UI', sans-serif"; ctx.fillStyle = statusEditActive ? PALETTE.accent : "#ffffff";
  ctx.fillText("Status", btnStartX+btnW+btnGap+btnW/2, btnY + 25);

  // Edit
  ctx.fillStyle = "#1e1a10";
  ctx.beginPath(); ctx.roundRect(btnStartX+(btnW+btnGap)*2, btnY, btnW, btnH, 6); ctx.fill();
  ctx.strokeStyle = "#c8a040"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(btnStartX+(btnW+btnGap)*2, btnY, btnW, btnH, 6); ctx.stroke();
  ctx.font = "bold 18px 'Segoe UI', sans-serif"; ctx.fillStyle = PALETTE.gold;
  ctx.fillText("Edit", btnStartX+(btnW+btnGap)*2+btnW/2, btnY + 25);

  ctx.textAlign = "left";

  // === FACTION SELECTION POPUP ===
  if (factionPopupOpen) {
    const popW = 280, popH = 300;
    const popX = px + 170, popY = py + 68 + 2 * lineH - 10;
    // Dim background
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(px, py, pw, ph);
    // Popup box
    ctx.fillStyle = "#0c1018";
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 10); ctx.fill();
    ctx.strokeStyle = "#4a6a5a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 10); ctx.stroke();
    // Title
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#c8a0ff"; ctx.textAlign = "center";
    ctx.fillText("Select Your Faction", popX + popW / 2, popY + 20);
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#667";
    ctx.fillText("Your homeland - where you were born", popX + popW / 2, popY + 34);

    const fOpts = [
      { label: "Wild West", color: "#d4a040", desc: "Dusty plains & saloons" },
      { label: "Frostlands", color: "#66ccff", desc: "Frozen tundra & ice caves" },
      { label: "Desert", color: "#e8b050", desc: "Scorching sands & oases" },
      { label: "Medieval", color: "#8a8aaa", desc: "Castles & stone kingdoms" },
      { label: "Tropical", color: "#44cc66", desc: "Jungle islands & reefs" },
      { label: "City", color: "#a0b8e0", desc: "Skyscrapers & neon lights" },
    ];
    ctx.textAlign = "left";
    for (let fi2 = 0; fi2 < fOpts.length; fi2++) {
      const optY = popY + 42 + fi2 * 42;
      const isSel = playerFaction === fOpts[fi2].label;
      const isHov = mouse.x >= popX + 8 && mouse.x <= popX + popW - 8 && mouse.y >= optY && mouse.y <= optY + 36;
      // Row bg
      ctx.fillStyle = isSel ? "rgba(200,160,255,0.12)" : isHov ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.015)";
      ctx.beginPath(); ctx.roundRect(popX + 8, optY, popW - 16, 36, 6); ctx.fill();
      ctx.strokeStyle = isSel ? fOpts[fi2].color : "rgba(255,255,255,0.06)";
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(popX + 8, optY, popW - 16, 36, 6); ctx.stroke();
      // Faction icon
      const icx = popX + 28, icy = optY + 18;
      ctx.save();
      if (fOpts[fi2].label === "Wild West") {
        // Cowboy hat
        ctx.fillStyle = fOpts[fi2].color;
        ctx.beginPath(); ctx.ellipse(icx, icy + 4, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(icx - 6, icy + 2); ctx.quadraticCurveTo(icx, icy - 8, icx + 6, icy + 2); ctx.fill();
      } else if (fOpts[fi2].label === "Frostlands") {
        // Snowflake
        ctx.strokeStyle = fOpts[fi2].color; ctx.lineWidth = 2;
        for (let a = 0; a < 6; a++) {
          const ang = a * Math.PI / 3;
          ctx.beginPath(); ctx.moveTo(icx, icy);
          ctx.lineTo(icx + Math.cos(ang) * 9, icy + Math.sin(ang) * 9); ctx.stroke();
        }
        ctx.fillStyle = fOpts[fi2].color;
        ctx.beginPath(); ctx.arc(icx, icy, 2, 0, Math.PI * 2); ctx.fill();
      } else if (fOpts[fi2].label === "Desert") {
        // Pyramid
        ctx.fillStyle = fOpts[fi2].color;
        ctx.beginPath(); ctx.moveTo(icx, icy - 9); ctx.lineTo(icx - 10, icy + 6); ctx.lineTo(icx + 10, icy + 6); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#c89030";
        ctx.beginPath(); ctx.moveTo(icx, icy - 9); ctx.lineTo(icx + 10, icy + 6); ctx.lineTo(icx + 2, icy + 6); ctx.lineTo(icx, icy - 4); ctx.closePath(); ctx.fill();
      } else if (fOpts[fi2].label === "Medieval") {
        // Shield
        ctx.fillStyle = fOpts[fi2].color;
        ctx.beginPath(); ctx.moveTo(icx - 8, icy - 7); ctx.lineTo(icx + 8, icy - 7);
        ctx.lineTo(icx + 8, icy + 2); ctx.quadraticCurveTo(icx, icy + 10, icx - 8, icy + 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = "#aab"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(icx, icy - 7); ctx.lineTo(icx, icy + 7); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(icx - 8, icy - 2); ctx.lineTo(icx + 8, icy - 2); ctx.stroke();
      } else if (fOpts[fi2].label === "Tropical") {
        // Palm tree
        ctx.fillStyle = "#8a6a30"; ctx.fillRect(icx - 2, icy - 2, 4, 12);
        ctx.fillStyle = fOpts[fi2].color;
        ctx.beginPath(); ctx.moveTo(icx, icy - 4); ctx.quadraticCurveTo(icx - 12, icy - 10, icx - 10, icy - 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(icx - 4, icy - 7, 6, 3, -0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(icx + 4, icy - 6, 5, 3, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(icx, icy - 9, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      } else if (fOpts[fi2].label === "City") {
        // Skyscraper buildings
        ctx.fillStyle = fOpts[fi2].color;
        ctx.fillRect(icx - 8, icy - 6, 5, 14); // tall building
        ctx.fillRect(icx - 2, icy - 2, 6, 10); // medium building
        ctx.fillRect(icx + 5, icy - 8, 4, 16); // tallest
        // Windows
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(icx - 7, icy - 4, 1.5, 1.5); ctx.fillRect(icx - 7, icy, 1.5, 1.5);
        ctx.fillRect(icx - 4, icy - 4, 1.5, 1.5); ctx.fillRect(icx - 4, icy, 1.5, 1.5);
        ctx.fillRect(icx, icy, 1.5, 1.5); ctx.fillRect(icx + 2, icy, 1.5, 1.5);
        ctx.fillRect(icx + 6, icy - 5, 1.5, 1.5); ctx.fillRect(icx + 6, icy - 1, 1.5, 1.5);
        ctx.fillRect(icx + 6, icy + 3, 1.5, 1.5);
      }
      ctx.restore();
      // Label
      ctx.font = "bold 15px 'Segoe UI', sans-serif";
      ctx.fillStyle = isSel ? fOpts[fi2].color : "#c0d0e0";
      ctx.fillText(fOpts[fi2].label, popX + 46, optY + 16);
      // Description
      ctx.font = "11px 'Segoe UI', sans-serif";
      ctx.fillStyle = "#667";
      ctx.fillText(fOpts[fi2].desc, popX + 46, optY + 30);
      // Checkmark
      if (isSel) {
        ctx.fillStyle = fOpts[fi2].color; ctx.textAlign = "right";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("✓", popX + popW - 18, optY + 22);
        ctx.textAlign = "left";
      }
    }
  }

  // === RELATIONSHIP SELECTION POPUP ===
  if (relationshipPopupOpen) {
    const popW = 200, popH = 190;
    const popX = px + 170, popY = py + 68 + 6 * lineH - 10;
    // Dim background
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(px, py, pw, ph);
    // Popup box
    ctx.fillStyle = "#0c1018";
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 10); ctx.fill();
    ctx.strokeStyle = "#6a4a5a"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 10); ctx.stroke();
    // Title
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#e0a0c0"; ctx.textAlign = "center";
    ctx.fillText("Relationship Status", popX + popW / 2, popY + 20);
    ctx.textAlign = "left";

    const rOpts = [
      { label: "Single", color: "#88bbff", icon: "👤" },
      { label: "Dating", color: "#ff5533", icon: "💕" },
      { label: "Married", color: "#ff44bb", icon: "💍" },
      { label: "Complicated", color: "#ffdd00", icon: "💔" },
    ];
    for (let ri = 0; ri < rOpts.length; ri++) {
      const optY = popY + 30 + ri * 38;
      const isSel = gameSettings.relationshipStatus === rOpts[ri].label;
      const isHov = mouse.x >= popX + 8 && mouse.x <= popX + popW - 8 && mouse.y >= optY && mouse.y <= optY + 32;
      // Row bg
      ctx.fillStyle = isSel ? "rgba(255,106,170,0.18)" : isHov ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.02)";
      ctx.beginPath(); ctx.roundRect(popX + 8, optY, popW - 16, 32, 6); ctx.fill();
      ctx.strokeStyle = isSel ? rOpts[ri].color : "rgba(255,255,255,0.08)";
      ctx.lineWidth = isSel ? 2 : 1;
      ctx.beginPath(); ctx.roundRect(popX + 8, optY, popW - 16, 32, 6); ctx.stroke();
      // Colored icon circle - bright
      ctx.fillStyle = rOpts[ri].color + "60";
      ctx.beginPath(); ctx.arc(popX + 28, optY + 16, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = rOpts[ri].color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(popX + 28, optY + 16, 12, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(rOpts[ri].icon, popX + 28, optY + 22);
      ctx.textAlign = "left";
      // Label - always colorful
      ctx.font = "bold 15px 'Segoe UI', sans-serif";
      ctx.fillStyle = rOpts[ri].color;
      ctx.fillText(rOpts[ri].label, popX + 48, optY + 22);
      // Checkmark
      if (isSel) {
        ctx.fillStyle = rOpts[ri].color; ctx.textAlign = "right";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText("✓", popX + popW - 16, optY + 22);
        ctx.textAlign = "left";
      }
    }
  }

  // === COUNTRY SELECTION POPUP (Graal-style grid) ===
  if (countryPopupOpen) {
    const popW = 680, popH = 420;
    const popX = (BASE_W - popW) / 2, popY = (BASE_H - popH) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    // Panel bg (Graal teal-green)
    ctx.fillStyle = "#3a5a4a";
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 8); ctx.fill();
    ctx.strokeStyle = "#2a4a3a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 8); ctx.stroke();
    // Title
    ctx.font = "italic bold 22px 'Segoe UI', serif";
    ctx.fillStyle = "#e8e0d0"; ctx.textAlign = "center";
    ctx.fillText("Choose a country:", popX + popW / 2, popY + 30);

    const cols = 6, cellW = 108, cellH = 82;
    const gridX = popX + (popW - cols * cellW) / 2, gridY = popY + 44;
    const visRows = Math.floor((popH - 90) / cellH);
    const totalRows = Math.ceil(COUNTRIES.length / cols);

    const maxCountryScroll = Math.max(0, totalRows - visRows);
    countryScroll = Math.max(0, Math.min(countryScroll, maxCountryScroll));

    ctx.save();
    ctx.beginPath(); ctx.rect(popX + 4, gridY, popW - 8, visRows * cellH); ctx.clip();

    for (let r = 0; r < visRows; r++) {
      for (let c2 = 0; c2 < cols; c2++) {
        const idx = (r + countryScroll) * cols + c2;
        if (idx >= COUNTRIES.length) break;
        const co = COUNTRIES[idx];
        const cx2 = gridX + c2 * cellW + cellW / 2;
        const cy2 = gridY + r * cellH;
        const isSel = playerCountry === co.n;
        const isHov = mouse.x >= gridX + c2 * cellW && mouse.x <= gridX + (c2+1) * cellW && mouse.y >= cy2 && mouse.y <= cy2 + cellH;

        // Flag bg box
        ctx.fillStyle = isSel ? "#4a7a5a" : isHov ? "#486a55" : "#3a5a4a";
        ctx.beginPath(); ctx.roundRect(cx2 - 28, cy2 + 4, 56, 42, 4); ctx.fill();
        ctx.strokeStyle = isSel ? "#8fc8a0" : "#2a4a3a";
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(cx2 - 28, cy2 + 4, 56, 42, 4); ctx.stroke();

        // Flag drawn
        drawFlag(ctx, cx2 - 24, cy2 + 8, 48, 30, co.n);

        // Country name
        ctx.font = "bold 11px 'Segoe UI', sans-serif";
        ctx.fillStyle = isSel ? "#fff" : "#c8d8c0"; ctx.textAlign = "center";
        const displayName = co.n.length > 13 ? co.n.slice(0, 11) + ".." : co.n;
        ctx.fillText(displayName, cx2, cy2 + 56);

        if (isSel) {
          ctx.fillStyle = "#8fc8a0";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText("✓", cx2 + 22, cy2 + 14);
        }
      }
    }
    ctx.restore();

    // Done button
    const doneY = popY + popH - 42;
    const doneHov = mouse.x >= popX + popW/2 - 80 && mouse.x <= popX + popW/2 + 80 && mouse.y >= doneY && mouse.y <= doneY + 32;
    ctx.fillStyle = doneHov ? "#f0f0f0" : "#e0e0e0";
    ctx.beginPath(); ctx.roundRect(popX + popW/2 - 80, doneY, 160, 32, 6); ctx.fill();
    ctx.strokeStyle = "#999"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(popX + popW/2 - 80, doneY, 160, 32, 6); ctx.stroke();
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#333"; ctx.textAlign = "center";
    ctx.fillText("Done", popX + popW / 2, doneY + 22);
    ctx.textAlign = "left";

    // Scroll indicator
    if (totalRows > visRows) {
      const sbX = popX + popW - 16, sbY = gridY, sbH = visRows * cellH;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.roundRect(sbX, sbY, 8, sbH, 4); ctx.fill();
      const thumbH = Math.max(16, (visRows / totalRows) * sbH);
      const maxSc = Math.max(1, totalRows - visRows);
      const thumbY2 = sbY + (countryScroll / maxSc) * (sbH - thumbH);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.roundRect(sbX, thumbY2, 8, thumbH, 4); ctx.fill();
    }
  }

  // === LANGUAGE SELECTION POPUP (Graal-style grid) ===
  if (languagePopupOpen) {
    const popW = 680, popH = 420;
    const popX = (BASE_W - popW) / 2, popY = (BASE_H - popH) / 2;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = "#3a5a4a";
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 8); ctx.fill();
    ctx.strokeStyle = "#2a4a3a"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(popX, popY, popW, popH, 8); ctx.stroke();
    ctx.font = "italic bold 22px 'Segoe UI', serif";
    ctx.fillStyle = "#e8e0d0"; ctx.textAlign = "center";
    ctx.fillText("Choose a language:", popX + popW / 2, popY + 30);

    const cols = 6, cellW = 108, cellH = 82;
    const gridX = popX + (popW - cols * cellW) / 2, gridY = popY + 44;
    const visRows = Math.floor((popH - 90) / cellH);
    const totalRows = Math.ceil(LANGUAGES.length / cols);

    const maxLangScroll = Math.max(0, totalRows - visRows);
    languageScroll = Math.max(0, Math.min(languageScroll, maxLangScroll));

    ctx.save();
    ctx.beginPath(); ctx.rect(popX + 4, gridY, popW - 8, visRows * cellH); ctx.clip();

    for (let r = 0; r < visRows; r++) {
      for (let c2 = 0; c2 < cols; c2++) {
        const idx = (r + languageScroll) * cols + c2;
        if (idx >= LANGUAGES.length) break;
        const la = LANGUAGES[idx];
        const cx2 = gridX + c2 * cellW + cellW / 2;
        const cy2 = gridY + r * cellH;
        const isSel = gameSettings.language === la.n;
        const isHov = mouse.x >= gridX + c2 * cellW && mouse.x <= gridX + (c2+1) * cellW && mouse.y >= cy2 && mouse.y <= cy2 + cellH;

        ctx.fillStyle = isSel ? "#4a7a5a" : isHov ? "#486a55" : "#3a5a4a";
        ctx.beginPath(); ctx.roundRect(cx2 - 28, cy2 + 4, 56, 42, 4); ctx.fill();
        ctx.strokeStyle = isSel ? "#8fc8a0" : "#2a4a3a";
        ctx.lineWidth = isSel ? 2 : 1;
        ctx.beginPath(); ctx.roundRect(cx2 - 28, cy2 + 4, 56, 42, 4); ctx.stroke();

        // Drawn flag
        const langCountry = LANG_TO_COUNTRY[la.n];
        if (langCountry) drawFlag(ctx, cx2 - 24, cy2 + 8, 48, 30, langCountry);
        else { ctx.font = "28px sans-serif"; ctx.textAlign = "center"; ctx.fillText(la.f, cx2, cy2 + 36); }

        ctx.font = "bold 11px 'Segoe UI', sans-serif";
        ctx.fillStyle = isSel ? "#fff" : "#c8d8c0"; ctx.textAlign = "center";
        const displayName = la.n.length > 13 ? la.n.slice(0, 11) + ".." : la.n;
        ctx.fillText(displayName, cx2, cy2 + 56);

        if (isSel) {
          ctx.fillStyle = "#8fc8a0";
          ctx.font = "bold 10px sans-serif";
          ctx.fillText("✓", cx2 + 22, cy2 + 14);
        }
      }
    }
    ctx.restore();

    const doneY = popY + popH - 42;
    const doneHov = mouse.x >= popX + popW/2 - 80 && mouse.x <= popX + popW/2 + 80 && mouse.y >= doneY && mouse.y <= doneY + 32;
    ctx.fillStyle = doneHov ? "#f0f0f0" : "#e0e0e0";
    ctx.beginPath(); ctx.roundRect(popX + popW/2 - 80, doneY, 160, 32, 6); ctx.fill();
    ctx.strokeStyle = "#999"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(popX + popW/2 - 80, doneY, 160, 32, 6); ctx.stroke();
    ctx.font = "bold 16px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#333"; ctx.textAlign = "center";
    ctx.fillText("Done", popX + popW / 2, doneY + 22);
    ctx.textAlign = "left";

    if (totalRows > visRows) {
      const sbX = popX + popW - 16, sbY = gridY, sbH = visRows * cellH;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath(); ctx.roundRect(sbX, sbY, 8, sbH, 4); ctx.fill();
      const thumbH = Math.max(16, (visRows / totalRows) * sbH);
      const maxSc = Math.max(1, totalRows - visRows);
      const thumbY2 = sbY + (languageScroll / maxSc) * (sbH - thumbH);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath(); ctx.roundRect(sbX, thumbY2, 8, thumbH, 4); ctx.fill();
    }
  }
}

// ===================== STATS / LEVELING PANEL =====================
const SKILL_ICONS = {
  // Killing
  'Total Kills': "💀", Deaths: "☠", 'K/D Ratio': "📊", 'Melee Kills': "⚔", 'Gun Kills': "🔫", Headshots: "🎯", 'Multi Kills': "💥",
  'Revenge Kills': "🔥", 'Explosive Kills': "💣", 'Sniper Kills': "🎯", 'Critical Kills': "⚡", 'Kill Streaks': "🔥",
  // Sparring
  'Duels Played': "🎮", 'Duels Won': "🏅", 'Win Rate': "📊", 'Combos Landed': "👊", Parries: "🛡", 'Ring Outs': "🏟",
  // Basing
  'Walls Built': "🧱", 'Turrets Placed': "🔫", 'Repairs Done': "🔧", 'Raids Defended': "🏠",
  // Dungeons
  'Floor Clearing': "🏰", 'Boss Slaying': "💀", 'Trap Dodging': "⚡", 'Chest Looting': "📦",
  'Speed Runs': "⏱", 'No Death Runs': "💎", 'Wave Surviving': "🌊", 'Secret Rooms': "🚪", 'Mini Bosses': "👹", 'Dungeon Escapes': "🏃",
  // Events
  'Games Played': "🎮", 'Events Won': "🏅", Tournaments: "🏆", Races: "🏁", Survival: "💀", 'Team Battles': "⚔",
  'Puzzles Solved': "🧩", 'Hide N Seek': "👀", 'Capture Flag': "🚩", 'King of Hill': "👑",
  'Tag Games': "🏃", 'Obstacle Course': "🏋", 'Treasure Hunt': "🗺", 'Dance Off': "💃",
  // Jobs
  Mining: "⛏", Digging: "⚒", Farming: "🌾", Mailing: "✉", Fishing: "🎣",
  Brewing: "🧪", Cooking: "🍳", Breeding: "🐣", 'Taxi Driving': "🚕", Woodcutting: "🪓",
};
const SKILL_COLORS = {
  'Total Kills': "#e05050", Deaths: "#a04040", 'K/D Ratio': "#e08050", 'Melee Kills': "#d04040", 'Gun Kills': "#e08030", Headshots: "#e07030",
  'Multi Kills': "#d040a0", 'Revenge Kills': "#e06020", 'Explosive Kills': "#e0a020", 'Sniper Kills': "#c06050",
  'Critical Kills': "#e0c040", 'Kill Streaks': "#ff5030",
  'Duels Played': "#50b0d0", 'Duels Won': "#60c0e0", 'Win Rate': "#70d0e0", 'Combos Landed': "#c080e0", Parries: "#80b0c0", 'Ring Outs': "#40c0a0",
  'Walls Built': "#a08060", 'Turrets Placed': "#80a060", 'Repairs Done': "#6090c0", 'Raids Defended': "#c07040",
  'Floor Clearing': "#7080e0", 'Boss Slaying': "#e04040", 'Trap Dodging': "#e0c040", 'Chest Looting': "#c8a040",
  'Speed Runs': "#50e0a0", 'No Death Runs': "#a080e0", 'Wave Surviving': "#4090e0", 'Secret Rooms': "#c070a0",
  'Mini Bosses': "#e06060", 'Dungeon Escapes': "#60d080",
  'Games Played': "#d0a040", 'Events Won': "#ffd050", Tournaments: "#ffc040", Races: "#40e080", Survival: "#e05070", 'Team Battles': "#60a0e0",
  'Puzzles Solved': "#a0c050", 'Hide N Seek': "#c080d0", 'Capture Flag': "#e06040", 'King of Hill': "#ffd040",
  'Tag Games': "#50d0a0", 'Obstacle Course': "#d08040", 'Treasure Hunt': "#c0a030", 'Dance Off': "#e060c0",
  Mining: "#c8a040", Digging: "#a07040", Farming: "#60c040", Mailing: "#60a0e0", Fishing: "#40b0c0",
  Brewing: "#b060c0", Cooking: "#e0a040", Breeding: "#e0c060", 'Taxi Driving': "#e0d040", Woodcutting: "#8a6a3a",
};
const CAT_COLORS = {
  Killing: "#e05050", Sparring: "#60c0e0", Basing: "#c08040", Dungeons: "#7080e0", Events: "#ffc040", Jobs: PALETTE.accent,
};
const CAT_ICONS = {
  Killing: "💀", Sparring: "🔫", Basing: "🏠", Dungeons: "🏰", Events: "🏆", Jobs: "💼",
};

function drawStatsPanel() {
  if (!statsPanelOpen) return;

  const spW = 580, spH = 620;
  const spX = (BASE_W - spW) / 2, spY = (BASE_H - spH) / 2;

  // Panel bg
  ctx.fillStyle = "rgba(6,8,16,0.97)";
  ctx.beginPath(); ctx.roundRect(spX, spY, spW, spH, 12); ctx.fill();
  ctx.strokeStyle = "#3a8a5a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(spX, spY, spW, spH, 12); ctx.stroke();

  // Title bar
  ctx.fillStyle = "rgba(40,100,70,0.25)";
  ctx.beginPath(); ctx.roundRect(spX + 2, spY + 2, spW - 4, 44, [10,10,0,0]); ctx.fill();
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText("⚔ Player Stats", spX + spW/2, spY + 33);

  // Close X
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(spX + spW - 42, spY + 6, 34, 32, 4); ctx.fill();
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("✕", spX + spW - 25, spY + 28);

  // === PLAYER LEVEL ===
  const contentX = spX + 24, contentY = spY + 66;
  const xpNeeded = playerLevel >= PLAYER_MAX_LEVEL ? 0 : xpToNextLevel(playerLevel);
  const xpPct = playerLevel >= PLAYER_MAX_LEVEL ? 1 : (xpNeeded > 0 ? playerXP / xpNeeded : 0);

  ctx.font = "bold 26px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText("Lv. " + playerLevel, contentX, contentY + 4);

  ctx.font = "bold 17px monospace";
  ctx.textAlign = "right";
  if (playerLevel >= PLAYER_MAX_LEVEL) {
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText("MAX LEVEL", spX + spW - 24, contentY + 4);
  } else {
    ctx.fillStyle = "#b0d0c0";
    ctx.fillText(playerXP + " / " + xpNeeded + " XP", spX + spW - 24, contentY + 4);
  }

  // XP progress bar
  const barX = contentX, barY = contentY + 20;
  const barW = spW - 48, barH = 18;
  ctx.fillStyle = "#1a1a2a";
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.fill();
  ctx.strokeStyle = "rgba(80,200,120,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 4); ctx.stroke();
  if (xpPct > 0) {
    const grad = ctx.createLinearGradient(barX, barY, barX + barW * xpPct, barY);
    grad.addColorStop(0, "#2a8a4a"); grad.addColorStop(1, PALETTE.accent);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(4, barW * xpPct), barH, 4); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.beginPath(); ctx.roundRect(barX + 2, barY + 1, barW - 4, barH/2 - 1, 3); ctx.fill();
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(Math.floor(xpPct * 100) + "%", barX + barW/2, barY + 14);

  // === CATEGORY TABS ===
  const tabY = barY + barH + 16;
  const cats = Object.keys(SKILL_CATEGORIES);
  const tabW = (spW - 48 - (cats.length - 1) * 6) / cats.length;
  const tabH = 38;

  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const tx = contentX + i * (tabW + 6);
    const isActive = statsTab === cat;

    ctx.fillStyle = isActive ? CAT_COLORS[cat] + "30" : "rgba(30,30,40,0.6)";
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW, tabH, 5); ctx.fill();
    ctx.strokeStyle = isActive ? CAT_COLORS[cat] : "rgba(255,255,255,0.08)";
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW, tabH, 5); ctx.stroke();

    ctx.font = "16px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = isActive ? "#fff" : "#aab8c0";
    ctx.fillText(CAT_ICONS[cat] || "", tx + tabW/2, tabY + 16);
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.fillStyle = isActive ? CAT_COLORS[cat] : "#8a9aa8";
    ctx.fillText(cat, tx + tabW/2, tabY + 32);
  }

  // === SKILL ROWS (clipped to content area) ===
  const skillAreaY = tabY + tabH + 12;
  const skillAreaH = spH - (skillAreaY - spY) - 16;
  const skills = SKILL_CATEGORIES[statsTab] || [];
  const skillRowH = 56;

  ctx.save();
  ctx.beginPath();
  ctx.rect(spX + 4, skillAreaY, spW - 8, skillAreaH);
  ctx.clip();

  // Clamp scroll
  const maxScroll = Math.max(0, skills.length * skillRowH - skillAreaH);
  if (statsScroll > maxScroll) statsScroll = maxScroll;
  if (statsScroll < 0) statsScroll = 0;

  for (let i = 0; i < skills.length; i++) {
    const sk = skills[i];
    const sd = skillData[sk];
    const ry = skillAreaY + i * skillRowH - statsScroll;

    if (ry + skillRowH < skillAreaY || ry > skillAreaY + skillAreaH) continue;

    const skXpNeeded = skillXpForLevel(sd.level);
    const skPct = skXpNeeded > 0 ? sd.xp / skXpNeeded : 0;

    // Alternating row bg
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.beginPath(); ctx.roundRect(spX + 8, ry, spW - 16, skillRowH - 2, 4); ctx.fill();
    }

    // Icon — bigger
    ctx.font = "26px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.fillText(SKILL_ICONS[sk] || "?", contentX + 2, ry + 24);

    // Skill name — bigger
    ctx.font = "bold 18px 'Segoe UI', sans-serif";
    ctx.fillStyle = SKILL_COLORS[sk] || "#ccc";
    ctx.fillText(sk, contentX + 38, ry + 20);

    // Level — brighter color
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#b0c8d8";
    ctx.fillText("Lv. " + sd.level, contentX + 38, ry + 38);

    // XP text — brighter color
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#90b0c0";
    ctx.textAlign = "right";
    ctx.fillText(sd.xp + "/" + skXpNeeded, spX + spW - 24, ry + 20);

    // Skill XP bar — bigger
    const skBarX = contentX + 190, skBarY2 = ry + 30;
    const skBarW = spW - 190 - 48, skBarH2 = 10;
    ctx.fillStyle = "#1a1a2a";
    ctx.beginPath(); ctx.roundRect(skBarX, skBarY2, skBarW, skBarH2, 4); ctx.fill();
    if (skPct > 0) {
      ctx.fillStyle = SKILL_COLORS[sk] || PALETTE.accent;
      ctx.beginPath(); ctx.roundRect(skBarX, skBarY2, Math.max(3, skBarW * skPct), skBarH2, 4); ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(skBarX, skBarY2, skBarW, skBarH2, 4); ctx.stroke();
  }

  ctx.restore();

  // Scroll indicator
  if (maxScroll > 0) {
    const scrollBarH = skillAreaH * (skillAreaH / (skills.length * skillRowH));
    const scrollBarY = skillAreaY + (statsScroll / maxScroll) * (skillAreaH - scrollBarH);
    ctx.fillStyle = "rgba(80,200,120,0.3)";
    ctx.beginPath(); ctx.roundRect(spX + spW - 10, scrollBarY, 5, scrollBarH, 2); ctx.fill();
  }

  ctx.textAlign = "left";
}

// ===================== GUNSMITH PANEL =====================
// Shows all 5 main guns — buy unowned, view stats, see upgrade requirements
let _gunsmithSelected = 0; // index into gun list
let _gunsmithScroll = 0;

// Gun ownership — level 0 = not owned, 1+ = owned at that level
// Persisted via SaveLoad. Initialized here as defaults.
if (typeof window._gunLevels === 'undefined') {
  window._gunLevels = { storm_ar: 0, heavy_ar: 0, boomstick: 0, ironwood_bow: 0, volt_9: 0 };
}

function drawGunsmithPanel() {
  if (!UI.isOpen('gunsmith')) return;
  if (typeof MAIN_GUNS === 'undefined') return;

  const pw = 720, ph = 500;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Dimmed backdrop
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = "#0c1018";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = "rgba(255,168,64,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke();

  // Title bar
  ctx.fillStyle = "rgba(60,40,20,0.5)";
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, 42, [10, 10, 0, 0]); ctx.fill();
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#ffa840";
  ctx.textAlign = "center";
  ctx.fillText("GUNSMITH", px + pw / 2, py + 30);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 42, py + 8, 32, 32, 6); ctx.fill();
  ctx.font = "bold 18px monospace"; ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.fillText("\u2715", px + pw - 26, py + 30);

  const gunIds = Object.keys(MAIN_GUNS);
  const listW = 200, listX = px + 12;
  const detailX = px + listW + 24, detailW = pw - listW - 36;
  const contentY = py + 52;

  // ---- GUN LIST (left side) ----
  for (let i = 0; i < gunIds.length; i++) {
    const gid = gunIds[i];
    const def = MAIN_GUNS[gid];
    const lvl = window._gunLevels[gid] || 0;
    const gy = contentY + i * 82;
    const isSelected = i === _gunsmithSelected;

    // Card bg
    ctx.fillStyle = isSelected ? "rgba(255,168,64,0.15)" : "rgba(255,255,255,0.03)";
    ctx.beginPath(); ctx.roundRect(listX, gy, listW, 74, 6); ctx.fill();
    if (isSelected) {
      ctx.strokeStyle = "#ffa840"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(listX, gy, listW, 74, 6); ctx.stroke();
    }

    // Gun name
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = lvl > 0 ? "#fff" : "#888";
    ctx.fillText(def.name, listX + 12, gy + 22);

    // Level or "Not Owned"
    ctx.font = "11px monospace";
    if (lvl > 0) {
      ctx.fillStyle = "#ffa840";
      ctx.fillText("Lv. " + lvl, listX + 12, gy + 40);
    } else {
      ctx.fillStyle = "#666";
      ctx.fillText("Not Owned", listX + 12, gy + 40);
    }

    // Category
    ctx.font = "9px monospace";
    ctx.fillStyle = "#555";
    ctx.fillText(def.category.replace('_', ' ').toUpperCase(), listX + 12, gy + 56);

    // Price or level badge
    if (lvl === 0) {
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = PALETTE.gold;
      ctx.textAlign = "right";
      ctx.fillText(def.buyPrice + "g", listX + listW - 12, gy + 22);
      ctx.textAlign = "left";
    } else {
      // Small colored dot for bullet color
      const bc = def.bulletColor;
      ctx.fillStyle = bc.main;
      ctx.beginPath(); ctx.arc(listX + listW - 16, gy + 18, 5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---- GUN DETAIL (right side) ----
  const selId = gunIds[_gunsmithSelected];
  const selDef = MAIN_GUNS[selId];
  const selLvl = window._gunLevels[selId] || 0;

  // Detail card bg
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.beginPath(); ctx.roundRect(detailX, contentY, detailW, ph - 72, 8); ctx.fill();
  ctx.strokeStyle = "rgba(255,168,64,0.15)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(detailX, contentY, detailW, ph - 72, 8); ctx.stroke();

  // Gun name + description
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText(selDef.name, detailX + 16, contentY + 28);
  ctx.font = "12px monospace";
  ctx.fillStyle = "#999";
  ctx.fillText(selDef.desc, detailX + 16, contentY + 48);

  // Current stats
  let statY = contentY + 72;
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#ffa840";
  ctx.fillText(selLvl > 0 ? "Stats (Lv. " + selLvl + ")" : "Base Stats (Lv. 1)", detailX + 16, statY);
  statY += 20;

  const curStats = getGunStatsAtLevel(selId, Math.max(1, selLvl));
  const nextStats = selLvl > 0 && selLvl < 25 ? getGunStatsAtLevel(selId, selLvl + 1) : null;

  const statFields = [
    { key: 'damage', label: 'Damage', color: '#ff8866' },
    { key: 'fireRate', label: 'Fire Rate', color: '#ffcc44', format: v => (60/v).toFixed(1) + '/s' },
    { key: 'magSize', label: 'Mag Size', color: '#66bbff' },
    { key: 'pellets', label: 'Pellets', color: '#ffaa44' },
    { key: 'pierceCount', label: 'Pierce', color: '#88ddff', format: v => (v + 1) + ' mobs' },
    { key: 'spread', label: 'Spread', color: '#ccaa66', format: v => v + '\u00b0' },
    { key: 'reloadSpeed', label: 'Reload', color: '#aaaaaa', format: v => (v / 60).toFixed(2) + 's' },
    { key: 'bulletSpeed', label: 'Arrow Speed', color: '#8b8' },
  ];

  for (const sf of statFields) {
    if (curStats[sf.key] === undefined) continue;
    const val = sf.format ? sf.format(curStats[sf.key]) : curStats[sf.key];
    ctx.font = "12px monospace"; ctx.fillStyle = "#aaa";
    ctx.fillText(sf.label + ":", detailX + 20, statY);
    ctx.fillStyle = sf.color; ctx.font = "bold 12px monospace";
    ctx.fillText(val + "", detailX + 140, statY);

    // Next level diff
    if (nextStats && nextStats[sf.key] !== undefined && nextStats[sf.key] !== curStats[sf.key]) {
      const nextVal = sf.format ? sf.format(nextStats[sf.key]) : nextStats[sf.key];
      ctx.fillStyle = "#5fca80";
      ctx.fillText(" \u2192 " + nextVal, detailX + 220, statY);
    }
    statY += 18;
  }

  // Special flags
  if (curStats.neverReload) {
    ctx.font = "bold 11px monospace"; ctx.fillStyle = "#66ffaa";
    ctx.fillText("\u2022 Unlimited Ammo", detailX + 20, statY);
    statY += 16;
  }
  if (curStats.pierce) {
    ctx.font = "bold 11px monospace"; ctx.fillStyle = "#88ddff";
    ctx.fillText("\u2022 Pierces Through Enemies", detailX + 20, statY);
    statY += 16;
  }
  if (curStats.maxRange) {
    ctx.font = "bold 11px monospace"; ctx.fillStyle = "#aabb88";
    ctx.fillText("\u2022 Limited Range (" + curStats.maxRange + "px)", detailX + 20, statY);
    statY += 16;
  }

  // ---- BUY BUTTON (if not owned) ----
  if (selLvl === 0) {
    const btnW = 180, btnH = 44;
    const btnX = detailX + detailW / 2 - btnW / 2;
    const btnY = py + ph - 72;
    const canAfford = gold >= selDef.buyPrice;

    ctx.fillStyle = canAfford ? "#2a6a30" : "#3a3a40";
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
    ctx.strokeStyle = canAfford ? "#5fca80" : "#555"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.stroke();

    ctx.font = "bold 16px monospace";
    ctx.fillStyle = canAfford ? "#fff" : "#666";
    ctx.textAlign = "center";
    ctx.fillText("BUY - " + selDef.buyPrice + "g", btnX + btnW / 2, btnY + 28);
    ctx.textAlign = "left";
  }

  // ---- UPGRADE (if owned and < 25) ----
  // TODO: When material drops are implemented, re-enable ore/parts checks here.
  // For now upgrades only cost gold (testing mode).
  if (selLvl > 0 && selLvl < 25) {
    const recipe = GUN_UPGRADE_RECIPES[selId][selLvl + 1];
    let reqY = py + ph - 100;
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#ffa840";
    ctx.fillText("Upgrade to Lv. " + (selLvl + 1) + ":", detailX + 16, reqY);
    reqY += 18;

    // Gold cost
    ctx.font = "11px monospace";
    const hasGold = gold >= recipe.gold;
    ctx.fillStyle = hasGold ? "#5fca80" : "#cc4444";
    ctx.fillText("Gold: " + recipe.gold + "g", detailX + 20, reqY);
    reqY += 16;

    // Future materials note (greyed out)
    ctx.fillStyle = "#444";
    ctx.font = "10px monospace";
    ctx.fillText("(Materials required in future updates)", detailX + 20, reqY);

    // Upgrade button — gold only for testing
    const canUpgrade = hasGold;
    const btnW = 180, btnH = 38;
    const btnX = detailX + detailW / 2 - btnW / 2;
    const btnY = py + ph - 55;
    ctx.fillStyle = canUpgrade ? "#2a6a30" : "#2a2a30";
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 6); ctx.fill();
    ctx.strokeStyle = canUpgrade ? "#5fca80" : "#444"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 6); ctx.stroke();
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = canUpgrade ? "#fff" : "#555";
    ctx.textAlign = "center";
    ctx.fillText("UPGRADE - " + recipe.gold + "g", btnX + btnW / 2, btnY + 24);
    ctx.textAlign = "left";
  }

  // Max level badge
  if (selLvl >= 25) {
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#ffd740";
    ctx.textAlign = "center";
    ctx.fillText("\u2605 MAX LEVEL \u2605", detailX + detailW / 2, py + ph - 50);
    ctx.textAlign = "left";
  }
}

function handleGunsmithClick(mx, my) {
  if (!UI.isOpen('gunsmith')) return false;
  if (typeof MAIN_GUNS === 'undefined') return false;

  const pw = 720, ph = 500;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Close button
  if (mx >= px + pw - 42 && mx <= px + pw - 10 && my >= py + 8 && my <= py + 40) {
    UI.close(); return true;
  }

  // Outside panel → close
  if (mx < px || mx > px + pw || my < py || my > py + ph) {
    UI.close(); return true;
  }

  const gunIds = Object.keys(MAIN_GUNS);
  const listW = 200, listX = px + 12;
  const contentY = py + 52;

  // Gun list selection
  for (let i = 0; i < gunIds.length; i++) {
    const gy = contentY + i * 82;
    if (mx >= listX && mx <= listX + listW && my >= gy && my <= gy + 74) {
      _gunsmithSelected = i;
      return true;
    }
  }

  // Buy button
  const selId = gunIds[_gunsmithSelected];
  const selDef = MAIN_GUNS[selId];
  const selLvl = window._gunLevels[selId] || 0;
  const detailX = px + listW + 24, detailW = pw - listW - 36;

  if (selLvl === 0) {
    const btnW = 180, btnH = 44;
    const btnX = detailX + detailW / 2 - btnW / 2;
    const btnY = py + ph - 72;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      if (gold >= selDef.buyPrice) {
        gold -= selDef.buyPrice;
        window._gunLevels[selId] = 1;
        // Create gun item and add to inventory
        const gunItem = createMainGun(selId, 1);
        if (gunItem) addToInventory(gunItem);
        chatMessages.push({ name: "SYSTEM", text: "Purchased " + selDef.name + "!", time: Date.now() });
        if (typeof SaveLoad !== 'undefined') SaveLoad.autoSave();
      } else {
        chatMessages.push({ name: "SYSTEM", text: "Not enough gold!", time: Date.now() });
      }
      return true;
    }
  }

  // Upgrade button — gold only for testing
  // TODO: Add material checks when dungeon drops are implemented
  if (selLvl > 0 && selLvl < 25) {
    const recipe = GUN_UPGRADE_RECIPES[selId][selLvl + 1];
    const btnW = 180, btnH = 38;
    const btnX = detailX + detailW / 2 - btnW / 2;
    const btnY = py + ph - 55;
    if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
      if (gold >= recipe.gold) {
        gold -= recipe.gold;
        const newLvl = selLvl + 1;
        window._gunLevels[selId] = newLvl;
        // Update gun in inventory if it exists
        for (let i = 0; i < inventory.length; i++) {
          if (inventory[i] && inventory[i].id === selId) {
            const upgraded = createMainGun(selId, newLvl);
            if (upgraded) inventory[i] = upgraded;
            break;
          }
        }
        // Re-apply stats if this gun is currently equipped
        if (playerEquip.gun && playerEquip.gun.id === selId) {
          const newStats = getGunStatsAtLevel(selId, newLvl);
          if (newStats) applyGunStats(newStats);
        }
        chatMessages.push({ name: "SYSTEM", text: selDef.name + " upgraded to Lv." + newLvl + "!", time: Date.now() });
        if (typeof SaveLoad !== 'undefined') SaveLoad.autoSave();
      } else {
        chatMessages.push({ name: "SYSTEM", text: "Not enough gold!", time: Date.now() });
      }
      return true;
    }
  }

  return true; // consume click inside panel
}

