// ===================== INPUT SYSTEM =====================
// Client input: mouse handlers, click routing
// Extracted from index_2.html — Phase E

// Apply cosmetic change to player — centralizes all color/visual mutations from input.
// In multiplayer, this is where we'd emit a cosmetic-change event to the server.
function applyCosmetic(key, value) {
  player[key] = value;
  // Note: autoSave is NOT called here because the customize panel has
  // explicit Save/Cancel buttons. The caller decides when to persist.
}

// ===================== MOUSE =====================
const mouse = { x: BASE_W / 2, y: BASE_H / 2, down: false };
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) / scale;
  mouse.y = (e.clientY - rect.top) / scale;

  // Intent: continuous mouse position
  InputIntent.mouseX = mouse.x;
  InputIntent.mouseY = mouse.y;

  // CT-X slider drag
  handleModifyGunDrag(mouse.x);

  // Drag-painting tiles
  if (isDraggingTile && activePlaceTool && !UI.isOpen('toolbox')) {
    const worldX = mouse.x + camera.x;
    const worldY = mouse.y + camera.y;
    placeTileAt(worldX, worldY);
  }

  // Inventory hover
  handleInventoryHover(mouse.x, mouse.y);

  // Dragging SV picker or hue bar
  if (UI.isOpen('customize') && (draggingSV || draggingHue)) {
    const mx = mouse.x, my = mouse.y;
    const sideX = 24, sideW = 58 + 18;
    const cpX = sideX + sideW + 14, cpY = 28;
    const cpW = BASE_W * 0.48;
    const swatchS = 32, swatchGap = 5;
    const palCols = Math.floor((cpW - 36) / (swatchS + swatchGap));
    const palX = cpX + 16, palY = cpY + 34;
    const palRows = Math.ceil(COLOR_PALETTE.length / palCols);
    const svX = palX, svY = palY + palRows * (swatchS + swatchGap) + 14;
    const svW = cpW - 36, svH = 100;
    const hueX = svX, hueY = svY + svH + 10, hueW = svW;
    if (draggingSV) {
      pickerSat = Math.max(0, Math.min(1, (mx - svX) / svW));
      pickerVal = Math.max(0, Math.min(1, 1 - (my - svY) / svH));
      applyCosmetic(CUSTOMIZE_CATS[customizeCat].key, hsvToHex(pickerHue, pickerSat, pickerVal));
    }
    if (draggingHue) {
      pickerHue = Math.max(0, Math.min(359, ((mx - hueX) / hueW) * 360));
      applyCosmetic(CUSTOMIZE_CATS[customizeCat].key, hsvToHex(pickerHue, pickerSat, pickerVal));
    }
  }
});
canvas.addEventListener("mousedown", e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) / scale;
  const my = (e.clientY - rect.top) / scale;

  // Hotbar slot click detection
  const slotW = 64, slotH = 64, gap = 6;
  const slotCount = 5;
  const isBottom = gameSettings.hotbarPosition === "bottom";
  let hbStartX, hbStartY;
  if (isBottom) {
    const totalW = slotCount * (slotW + gap) - gap;
    hbStartX = BASE_W / 2 - totalW / 2;
    hbStartY = BASE_H - slotH - 8;
  } else {
    const totalH = slotCount * (slotH + gap) - gap;
    hbStartX = BASE_W - slotW - 4;
    hbStartY = BASE_H / 2 - totalH / 2;
  }
  if (e.button === 0) {
    // Dismiss card popup on left click
    if (cardPopup) { cardPopup = null; }
    for (let i = 0; i < slotCount; i++) {
      let sx2, sy2;
      if (isBottom) {
        sx2 = hbStartX + i * (slotW + gap);
        sy2 = hbStartY;
      } else {
        sx2 = hbStartX;
        sy2 = hbStartY + i * (slotH + gap);
      }
      if (mx >= sx2 && mx <= sx2 + slotW && my >= sy2 && my <= sy2 + slotH) {
        // Intent-only flags (Step 3: authority applies in update())
        if (i === 4) {
          InputIntent.slot5Pressed = true;
        } else if (i === 3) {
          InputIntent.slot4Pressed = true;
        } else if (i === 2) {
          InputIntent.potionPressed = true;
        } else {
          if (i === 0) InputIntent.slot1Pressed = true;
          else if (i === 1) InputIntent.slot2Pressed = true;
        }
        // Start hold timer for weapon stats
        hotbarHoldSlot = i;
        hotbarHoldTime = 0;
        return;
      }
    }
  }

  // Icon clicks (top-left column)
  const iconX = ICON_X, iconW = ICON_SIZE;

  // Toolbox icon (top-right)
  const tbX = BASE_W - ICON_SIZE - 12;
  const tbY = 12;
  if (mx >= tbX && mx <= tbX + ICON_SIZE && my >= tbY && my <= tbY + ICON_SIZE && e.button === 0) {
    UI.toggle('toolbox');
    return;
  }

  // Selected items toolbar clicks (top-right, left of toolbox icon)
  if (!UI.isOpen('toolbox')) {
    const selected = getSelectedToolboxItems();
    if (selected.length > 0) {
      const slotS = 44, slotGap = 4;
      const startX = tbX - (selected.length * (slotS + slotGap)) - 4;
      const slotY = 14;
      for (let i = 0; i < selected.length; i++) {
        const sx = startX + i * (slotS + slotGap);
        if (mx >= sx && mx <= sx + slotS && my >= slotY && my <= slotY + slotS) {
          const item = selected[i];
          // Toggle: click same = deselect tool, click different = switch
          if (activePlaceTool && activePlaceTool.catIdx === item.catIdx && activePlaceTool.itemIdx === item.itemIdx) {
            activePlaceTool = null;
          } else {
            activePlaceTool = { ...item };
          }
          return;
        }
      }
    }
  }

  // Tile placement on map (left click when tool is active and not on UI)
  if (activePlaceTool && !UI.anyOpen() && e.button === 0) {
    const worldX = mx + camera.x;
    const worldY = my + camera.y;
    placeTileAt(worldX, worldY);
    isDraggingTile = true;
    return;
  }

  // Toolbox panel clicks
  if (UI.isOpen('toolbox')) {
    const pad = 30;
    const pw = BASE_W - pad * 2, ph = BASE_H - pad * 2;
    const px2 = pad, py2 = pad;

    // Close button
    if (mx >= px2 + pw - 44 && mx <= px2 + pw - 10 && my >= py2 + 10 && my <= py2 + 44) {
      UI.close(); return;
    }

    // Category tabs
    const tabY2 = py2 + 60;
    const tabH2 = 42, tabGap2 = 4, tabPad2 = 16;
    let tx = px2 + 20;
    ctx.font = "bold 14px monospace";
    for (let i = 0; i < TOOLBOX_CATEGORIES.length; i++) {
      const label = TOOLBOX_CATEGORIES[i].icon + " " + TOOLBOX_CATEGORIES[i].name;
      const tw = ctx.measureText(label).width + tabPad2 * 2;
      if (mx >= tx && mx <= tx + tw && my >= tabY2 && my <= tabY2 + tabH2) {
        toolboxCategory = i; toolboxScroll = 0; return;
      }
      tx += tw + tabGap2;
    }

    // Item slot clicks — toggle selection
    const cat = TOOLBOX_CATEGORIES[toolboxCategory];
    if (cat._slotPositions) {
      const slotSize = 76;
      for (const slot of cat._slotPositions) {
        if (mx >= slot.x && mx <= slot.x + slotSize && my >= slot.y && my <= slot.y + slotSize) {
          if (cat.items[slot.idx]) {
            cat.items[slot.idx].selected = !cat.items[slot.idx].selected;
          }
          return;
        }
      }
    }

    // Consume clicks inside panel
    if (mx >= px2 && mx <= px2 + pw && my >= py2 && my <= py2 + ph) return;
  }
  // Chat icon (first)
  const chatY = 12;
  if (mx >= iconX && mx <= iconX + iconW && my >= chatY && my <= chatY + ICON_SIZE && e.button === 0) {
    UI.toggle('chat');
    return;
  }
  // Profile icon (second)
  const profY = 12 + ICON_SIZE + ICON_GAP;
  if (mx >= iconX && mx <= iconX + iconW && my >= profY && my <= profY + ICON_SIZE && e.button === 0) {
    UI.toggle('profile');
    return;
  }

  // Settings panel clicks
  if (UI.isOpen('settings')) {
    const pw = 520, ph = 480;
    const px = BASE_W/2 - pw/2, py = BASE_H/2 - ph/2;
    // Close button
    if (mx >= px + pw - 36 && mx <= px + pw - 8 && my >= py + 6 && my <= py + 34) {
      UI.close(); return;
    }
    // Tab clicks
    const tabNames = SETTINGS_TABS;
    const tabW = (pw - 24) / tabNames.length;
    for (let i = 0; i < tabNames.length; i++) {
      const tx = px + 12 + i * tabW;
      if (mx >= tx && mx <= tx + tabW && my >= py + 40 && my <= py + 68) {
        settingsActiveTab = i;
        settingsScroll = 0;
        return;
      }
    }
    // Toggle clicks in content area
    const contentX = px + 16, contentY = py + 78;
    const contentW = pw - 32, contentH = ph - 94;

    // Keybinds tab — custom click handling
    if (SETTINGS_TABS[settingsActiveTab] === "Keybinds") {
      if (mx >= contentX && mx <= contentX + contentW && my >= contentY && my <= contentY + contentH) {
        const kRowH = 38;
        const relY = my - contentY + settingsScroll;
        const idx = Math.floor(relY / kRowH);
        if (idx >= 0 && idx < KEYBIND_ITEMS.length) {
          const item = KEYBIND_ITEMS[idx];
          if (item.action) {
            // Click on key button area?
            const bw = 100, bh = 26;
            const bx = contentX + contentW - bw - 14;
            if (mx >= bx && mx <= bx + bw) {
              rebindingKey = rebindingKey === item.action ? null : item.action;
            }
          }
        }
        // Reset defaults button
        const resetY = contentY + contentH - 36;
        const resetW = 160, resetH = 28;
        const resetX = contentX + contentW/2 - resetW/2;
        if (mx >= resetX && mx <= resetX + resetW && my >= resetY && my <= resetY + resetH) {
          Object.assign(keybinds, DEFAULT_KEYBINDS);
          rebindingKey = null;
          SaveLoad.autoSave();
        }
        return;
      }
      if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return;
    }

    const items = SETTINGS_DATA[SETTINGS_TABS[settingsActiveTab]];
    if (items && mx >= contentX && mx <= contentX + contentW && my >= contentY && my <= contentY + contentH) {
      const relY = my - contentY + settingsScroll;
      const rowH = 36;
      const idx = Math.floor(relY / rowH);
      if (idx >= 0 && idx < items.length) {
        const item = items[idx];
        // UI state: settings are client-only, no need for command queue
        if (item.type === "toggle") {
          gameSettings[item.key] = !gameSettings[item.key];
          if (item.key === "spriteMode") useSpriteMode = gameSettings.spriteMode;
        } else if (item.type === "select") {
          const opts = item.options;
          const curIdx = opts.indexOf(gameSettings[item.key]);
          gameSettings[item.key] = opts[(curIdx + 1) % opts.length];
        }
        SaveLoad.autoSave();
      }
      return;
    }
    // Consume click inside panel
    if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return;
  }

  // Profile panel clicks
  if (UI.isOpen('profile')) {
    const cols = 5, iconS = 60, iconGap = 18;
    const labelH = 24;
    const rows = Math.ceil(MENU_ITEMS.length / cols);
    const cellW = iconS + iconGap;
    const cellH = iconS + labelH + iconGap;
    const gridW = cols * cellW - iconGap;
    const gridH = rows * cellH - iconGap;
    const pw = gridW + 64;
    const ph = gridH + 120;
    const px = BASE_W/2 - pw/2, py = BASE_H/2 - ph/2;

    // Close button (X)
    if (mx >= px + pw - 44 && mx <= px + pw - 8 && my >= py + 7 && my <= py + 39) {
      UI.close(); return;
    }
    // Stats footer button
    const footBtnW = 80, footBtnH = 32;
    const statsFootY = py + ph - 44;
    const statsFootX = px + 18;
    if (mx >= statsFootX && mx <= statsFootX + footBtnW && my >= statsFootY && my <= statsFootY + footBtnH) {
      UI.open('identity'); return;
    }
    // Grid icon clicks
    const gridStartX = px + (pw - gridW) / 2;
    const gridStartY = py + 56;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const ix = gridStartX + col * cellW;
      const iy = gridStartY + row * cellH;
      if (mx >= ix && mx <= ix + iconS && my >= iy && my <= iy + iconS) {
        if (MENU_ITEMS[i].icon === "settings") { UI.open('settings'); }
        else if (MENU_ITEMS[i].icon === "inventory") { UI.open('inventory'); }
        else if (MENU_ITEMS[i].icon === "id") { UI.open('identity'); }
        return;
      }
    }
    if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return;
  }

  // Identity panel clicks
  // Stats panel clicks (must be before identity panel which would consume them)
  if (statsPanelOpen) {
    const spW = 580, spH = 620;
    const spX = (BASE_W - spW) / 2, spY = (BASE_H - spH) / 2;
    // Close X
    if (mx >= spX + spW - 42 && mx <= spX + spW - 8 && my >= spY + 6 && my <= spY + 38) {
      statsPanelOpen = false; return;
    }
    // Category tabs
    const contentX = spX + 24;
    const barY = spY + 66 + 20; // matches contentY + 20
    const tabY = barY + 18 + 16; // barH + gap
    const cats = Object.keys(SKILL_CATEGORIES);
    const tabW = (spW - 48 - (cats.length - 1) * 6) / cats.length;
    const tabH = 38;
    for (let i = 0; i < cats.length; i++) {
      const tx = contentX + i * (tabW + 6);
      if (mx >= tx && mx <= tx + tabW && my >= tabY && my <= tabY + tabH) {
        statsTab = cats[i]; statsScroll = 0; return;
      }
    }
    // Consume clicks inside stats panel
    if (mx >= spX && mx <= spX + spW && my >= spY && my <= spY + spH) return;
  }

  if (UI.isOpen('identity')) {
    const pw = 740, ph = 500;
    const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;
    const statsX = px + 20;
    const statsStartY2 = py + 68;
    const lineH2 = 26;

    // Faction popup clicks (handle first, on top)
    if (factionPopupOpen) {
      const popW = 280, popH = 300;
      const popX = px + 170, popY = py + 68 + 2 * lineH2 - 10;
      const fOpts = [
        { label: "Wild West", color: "#d4a040" },
        { label: "Frostlands", color: "#66ccff" },
        { label: "Desert", color: "#e8b050" },
        { label: "Medieval", color: "#8a8aaa" },
        { label: "Tropical", color: "#44cc66" },
        { label: "City", color: "#a0b8e0" },
      ];
      for (let fi2 = 0; fi2 < fOpts.length; fi2++) {
        const optY = popY + 42 + fi2 * 42;
        if (mx >= popX + 8 && mx <= popX + popW - 8 && my >= optY && my <= optY + 36) {
          playerFaction = fOpts[fi2].label; // TODO(multiplayer): route through command queue
          factionPopupOpen = false;
          SaveLoad.autoSave();
          return;
        }
      }
      factionPopupOpen = false;
      return;
    }

    // Country popup clicks (grid layout)
    if (countryPopupOpen) {
      const popW = 680, popH = 420;
      const popX = (BASE_W - popW) / 2, popY = (BASE_H - popH) / 2;
      const cols = 6, cellW = 108, cellH = 82;
      const gridX = popX + (popW - cols * cellW) / 2, gridY = popY + 44;
      const visRows = Math.floor((popH - 90) / cellH);
      const totalRows = Math.ceil(COUNTRIES.length / cols);
      // Done button
      const doneY = popY + popH - 42;
      if (mx >= popX + popW/2 - 80 && mx <= popX + popW/2 + 80 && my >= doneY && my <= doneY + 32) {
        countryPopupOpen = false; languagePopupOpen = false; return;
      }
      // Grid cells
      for (let r = 0; r < visRows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = (r + countryScroll) * cols + c;
          if (idx >= COUNTRIES.length) break;
          const cx2 = gridX + c * cellW, cy2 = gridY + r * cellH;
          if (mx >= cx2 && mx <= cx2 + cellW && my >= cy2 && my <= cy2 + cellH) {
            playerCountry = COUNTRIES[idx].n; // TODO(multiplayer): route through command queue
            countryPopupOpen = false;
            SaveLoad.autoSave();
            return;
          }
        }
      }
      // Click inside popup absorb
      if (mx >= popX && mx <= popX + popW && my >= popY && my <= popY + popH) return;
      countryPopupOpen = false;
      return;
    }

    // Language popup clicks (grid layout)
    if (languagePopupOpen) {
      const popW = 680, popH = 420;
      const popX = (BASE_W - popW) / 2, popY = (BASE_H - popH) / 2;
      const cols = 6, cellW = 108, cellH = 82;
      const gridX = popX + (popW - cols * cellW) / 2, gridY = popY + 44;
      const visRows = Math.floor((popH - 90) / cellH);
      // Done button
      const doneY = popY + popH - 42;
      if (mx >= popX + popW/2 - 80 && mx <= popX + popW/2 + 80 && my >= doneY && my <= doneY + 32) {
        languagePopupOpen = false; return;
      }
      // Grid cells
      for (let r = 0; r < visRows; r++) {
        for (let c = 0; c < cols; c++) {
          const idx = (r + languageScroll) * cols + c;
          if (idx >= LANGUAGES.length) break;
          const cx2 = gridX + c * cellW, cy2 = gridY + r * cellH;
          if (mx >= cx2 && mx <= cx2 + cellW && my >= cy2 && my <= cy2 + cellH) {
            gameSettings.language = LANGUAGES[idx].n; // TODO(multiplayer): route through command queue
            languagePopupOpen = false;
            SaveLoad.autoSave();
            return;
          }
        }
      }
      if (mx >= popX && mx <= popX + popW && my >= popY && my <= popY + popH) return;
      languagePopupOpen = false;
      return;
    }

    // Relationship popup clicks
    if (relationshipPopupOpen) {
      const popW = 200, popH = 190;
      const popX = px + 170, popY = py + 68 + 6 * lineH2 - 10;
      const rOpts = ["Single", "Dating", "Married", "Complicated"];
      for (let ri = 0; ri < rOpts.length; ri++) {
        const optY = popY + 30 + ri * 38;
        if (mx >= popX + 8 && mx <= popX + popW - 8 && my >= optY && my <= optY + 32) {
          gameSettings.relationshipStatus = rOpts[ri]; // TODO(multiplayer): route through command queue
          relationshipPopupOpen = false;
          SaveLoad.autoSave();
          return;
        }
      }
      relationshipPopupOpen = false;
      return;
    }

    // Close X
    if (mx >= px + pw - 36 && mx <= px + pw - 8 && my >= py + 6 && my <= py + 34) {
      UI.close(); return;
    }
    // Name click — tap name to edit
    if (mx >= px + 60 && mx <= px + pw - 96 && my >= py + 5 && my <= py + 35) {
      if (!nameEditActive) {
        nameEditActive = true;
        nameEditValue = player.name;
      }
      return;
    }
    // Bottom buttons
    const btnY = py + ph - 48;
    const btnW = 120, btnH = 38, btnGap = 16;
    const totalBtnW = btnW * 3 + btnGap * 2;
    const btnStartX = px + (pw - totalBtnW) / 2;
    // Stats — opens stats/leveling sub-panel
    if (mx >= btnStartX && mx <= btnStartX + btnW && my >= btnY && my <= btnY + btnH) {
      statsPanelOpen = !statsPanelOpen;
      return;
    }
    // Status — toggle status editing
    const statusBtnX = btnStartX + btnW + btnGap;
    if (mx >= statusBtnX && mx <= statusBtnX + btnW && my >= btnY && my <= btnY + btnH) {
      statusEditActive = !statusEditActive;
      if (statusEditActive) statusEditValue = playerStatus;
      return;
    }
    // Edit
    const editX = btnStartX + (btnW + btnGap) * 2;
    if (mx >= editX && mx <= editX + btnW && my >= btnY && my <= btnY + btnH) {
      customizeBackup = {}; for (const cc of CUSTOMIZE_CATS) customizeBackup[cc.key] = player[cc.key];
      UI.open('customize'); statusEditActive = false; return;
    }
    // Stat row clicks
    const statsCount = 11;
    const invClickY = statsStartY2 + statsCount * lineH2 + 24;

    // "View All >" click — opens inventory
    const viewAllX = statsX + 3 * (56 + 8) - 80;
    const viewAllY2 = invClickY - 16;
    if (mx >= viewAllX && mx <= viewAllX + 90 && my >= viewAllY2 && my <= viewAllY2 + 20) {
      UI.open('inventory');
      return;
    }

    // Faction click (index 2) — open faction popup
    const factionRowY = statsStartY2 + 2 * lineH2;
    if (mx >= statsX && mx <= statsX + 300 && my >= factionRowY - 14 && my <= factionRowY + 8) {
      factionPopupOpen = true;
      return;
    }

    // Country click (index 3) — open country popup
    const countryRowY = statsStartY2 + 3 * lineH2;
    if (mx >= statsX && mx <= statsX + 300 && my >= countryRowY - 14 && my <= countryRowY + 8) {
      countryPopupOpen = true; countryScroll = 0;
      return;
    }

    // Language click (index 4) — open language popup
    const langRowY = statsStartY2 + 4 * lineH2;
    if (mx >= statsX && mx <= statsX + 300 && my >= langRowY - 14 && my <= langRowY + 8) {
      languagePopupOpen = true; languageScroll = 0;
      return;
    }

    // Gender click (index 5) — toggle Male/Female
    const genderRowY = statsStartY2 + 5 * lineH2;
    if (mx >= statsX && mx <= statsX + 300 && my >= genderRowY - 14 && my <= genderRowY + 8) {
      playerGender = playerGender === "Male" ? "Female" : "Male"; // TODO(multiplayer): route through command queue
      SaveLoad.autoSave();
      return;
    }

    // Relationship click (index 6) — open relationship popup
    const relRowY = statsStartY2 + 6 * lineH2;
    if (mx >= statsX && mx <= statsX + 300 && my >= relRowY - 14 && my <= relRowY + 8) {
      relationshipPopupOpen = true;
      return;
    }

    if (mx >= statsX && mx <= statsX + 3 * 64 && my >= invClickY - 10 && my <= invClickY + 80) {
      UI.open('inventory');
      return;
    }
    if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return;
  }

  // Customization screen clicks
  if (UI.isOpen('customize')) {
    const sideX = 24, sideY = 28;
    const iconSize = 58, iconGap = 6;
    const sideW = iconSize + 18;
    const sideVisibleH = BASE_H - 80;
    const cpX = sideX + sideW + 14, cpY = 28;
    const cpW = BASE_W * 0.48;

    // Cancel button — restore original colors, close ALL panels
    // Note: uses direct assignment (not applyCosmetic) because this is a bulk restore,
    // not a new user-initiated cosmetic change.
    const btnY = BASE_H - 56;
    if (mx >= cpX && mx <= cpX + 120 && my >= btnY && my <= btnY + 40) {
      if (customizeBackup) {
        for (const cc of CUSTOMIZE_CATS) if (customizeBackup[cc.key] !== undefined) player[cc.key] = customizeBackup[cc.key];
        customizeBackup = null;
      }
      UI.close(); return;
    }
    // Save button — keep new colors, close ALL panels back to game
    if (mx >= cpX + 136 && mx <= cpX + 256 && my >= btnY && my <= btnY + 40) {
      customizeBackup = null;
      UI.close(); return;
    }
    // Sidebar category clicks (with scroll offset)
    if (mx >= sideX && mx <= sideX + sideW && my >= sideY && my <= sideY + sideVisibleH) {
      for (let i = 0; i < CUSTOMIZE_CATS.length; i++) {
        const iy = sideY + 4 + i * (iconSize + iconGap) - customizeSideScroll;
        if (iy + iconSize < sideY || iy > sideY + sideVisibleH) continue;
        if (mx >= sideX + 8 && mx <= sideX + 8 + iconSize && my >= iy && my <= iy + iconSize) {
          customizeCat = i; return;
        }
      }
      return; // consume clicks in sidebar area
    }

    // Content area calculations
    const swatchS = 32, swatchGap = 5;
    const palCols = Math.floor((cpW - 36) / (swatchS + swatchGap));
    const palX = cpX + 16, palY = cpY + 34;
    const palRows = Math.ceil(COLOR_PALETTE.length / palCols);
    const svX = palX, svY = palY + palRows * (swatchS + swatchGap) + 14;
    const svW = cpW - 36, svH = 100;
    const hueX = svX, hueY = svY + svH + 10, hueW = svW, hueH = 18;
    const rowY = hueY + hueH + 12;
    const hfx = svX + 52, hfy = rowY, hfw = 130, hfh = 32;

    // Hex input
    if (mx >= hfx && mx <= hfx + hfw && my >= hfy && my <= hfy + hfh) {
      hexInputActive = true;
      if (!hexInputValue) hexInputValue = "#";
      hexInputError = false; return;
    }
    // Apply
    const abx = hfx + hfw + 8, aby = rowY, abw = 70, abh = 32;
    if (mx >= abx && mx <= abx + abw && my >= aby && my <= aby + abh) {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInputValue)) {
        applyCosmetic(CUSTOMIZE_CATS[customizeCat].key, hexInputValue.toLowerCase());
        hexInputActive = false; hexInputError = false;
      } else { hexInputError = true; }
      return;
    }

    hexInputActive = false;

    // SV picker
    if (mx >= svX && mx <= svX + svW && my >= svY && my <= svY + svH) {
      pickerSat = Math.max(0, Math.min(1, (mx - svX) / svW));
      pickerVal = Math.max(0, Math.min(1, 1 - (my - svY) / svH));
      applyCosmetic(CUSTOMIZE_CATS[customizeCat].key, hsvToHex(pickerHue, pickerSat, pickerVal));
      draggingSV = true; return;
    }
    // Hue bar
    if (mx >= hueX && mx <= hueX + hueW && my >= hueY && my <= hueY + hueH) {
      pickerHue = Math.max(0, Math.min(359, ((mx - hueX) / hueW) * 360));
      applyCosmetic(CUSTOMIZE_CATS[customizeCat].key, hsvToHex(pickerHue, pickerSat, pickerVal));
      draggingHue = true; return;
    }

    // Presets
    for (let i = 0; i < COLOR_PALETTE.length; i++) {
      const col = i % palCols, row = Math.floor(i / palCols);
      const sx = palX + col * (swatchS + swatchGap);
      const sy = palY + row * (swatchS + swatchGap);
      if (mx >= sx && mx <= sx + swatchS && my >= sy && my <= sy + swatchS) {
        applyCosmetic(CUSTOMIZE_CATS[customizeCat].key, COLOR_PALETTE[i]); return;
      }
    }
    return;
  }

  // Click on self to open identity panel
  if (!UI.anyOpen() && e.button === 0) {
    const psx = player.x - camera.x;
    const psy = player.y - camera.y;
    const dist = Math.sqrt((mx - psx) ** 2 + (my - psy) ** 2);
    if (dist < 40) {
      UI.open('identity');
      return;
    }
  }

  // CT-X modify gun panel clicks
  if (handleModifyGunClick(mx, my)) return;

  // Inventory panel clicks
  if (UI.isOpen('inventory') && handleInventoryClick(mx, my)) return;

  // Fish vendor panel clicks
  if (UI.isOpen('fishVendor') && typeof handleFishVendorClick === 'function') {
    if (handleFishVendorClick(mx, my)) return;
  }

  // Shop panel clicks
  if (UI.isOpen('shop')) {
    const items = getShopItems();
    const cols = 3;
    const itemW = 220, itemH = 140, gap = 14;
    const rows2 = Math.ceil(items.length / cols);
    const gridW = cols * (itemW + gap) - gap;
    const gridH = rows2 * (itemH + gap) - gap;
    const pw = gridW + 80, ph = Math.max(350, gridH + 160);
    const px = BASE_W/2 - pw/2, py = BASE_H/2 - ph/2;
    // Close button
    if (mx >= px + pw - 46 && mx <= px + pw - 10 && my >= py + 8 && my <= py + 44) {
      UI.close(); return;
    }
    // Category tab clicks
    const tabY = py + 58, tabH = 30;
    const tabW = (pw - 40) / SHOP_CATEGORIES.length;
    for (let i = 0; i < SHOP_CATEGORIES.length; i++) {
      const tx = px + 20 + i * tabW;
      if (mx >= tx && mx <= tx + tabW - 6 && my >= tabY && my <= tabY + tabH) {
        shopCategory = i;
        return;
      }
    }
    // Item clicks
    const gridX = px + (pw - gridW) / 2;
    const gridY = tabY + tabH + 16;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = gridX + col * (itemW + gap);
      const iy = gridY + row * (itemH + gap);
      if (mx >= ix && mx <= ix + itemW && my >= iy && my <= iy + itemH) {
        const isEquip = item.tier !== undefined;
        const isOwned = isEquip && item.isOwned;
        const isMaxed = item.maxBuy !== undefined && item.bought >= item.maxBuy;
        const isLocked = item.isLocked;
        if (!isOwned && !isMaxed && !isLocked && gold >= item.cost) {
          // item.action() handles stat application via centralized helpers
          // (applyGunStats/applyMeleeStats for equipment, direct for buffs)
          const success = item.action();
          if (success) {
            gold -= item.cost; // TODO(multiplayer): server-authoritative gold deduction
            if (window._opMode) gold = 999999; // keep infinite in OP mode
            if (item.bought !== undefined) item.bought++;
            hitEffects.push({ x: player.x, y: player.y - 30, life: 20, type: "heal", dmg: item.name });
          }
        }
        return;
      }
    }
    // Consume click inside panel
    if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return;
  }

  // Tap to queue
  if (nearQueue && e.button === 0) {
    const qe = levelEntities.find(en => en.type === 'queue_zone');
    if (qe) {
      const qsx = qe.tx * TILE - camera.x, qsy = qe.ty * TILE - camera.y;
      const qew = (qe.w || 1) * TILE, qeh = (qe.h || 1) * TILE;
      if (mx >= qsx && mx <= qsx + qew && my >= qsy && my <= qsy + qeh) {
        joinQueue(); return;
      }
    }
  }
  if (e.button === 0) {
    mouse.down = true;
    // Intent: mouse down = shoot held
    InputIntent.mouseDown = true;
    InputIntent.shootHeld = true;
    InputIntent.shootPressed = true;
  }
});
canvas.addEventListener("mouseup", e => {
  if (e.button === 0) {
    mouse.down = false;
    draggingSV = false; draggingHue = false; isDraggingTile = false; handleModifyGunUp();
    hotbarHoldSlot = -1; hotbarHoldTime = 0; showWeaponStats = false;
    // Intent: release mouse
    InputIntent.mouseDown = false;
    if (!InputIntent.arrowShooting) InputIntent.shootHeld = false;
  }
});
canvas.addEventListener("contextmenu", e => {
  e.preventDefault();
  // Right-click on inventory item → show card popup
  if (UI.isOpen('inventory') && invHover >= 0 && inventory[invHover]) {
    const rect = canvas.getBoundingClientRect();
    const rmx = (e.clientX - rect.left) / scale;
    const rmy = (e.clientY - rect.top) / scale;
    cardPopup = { item: inventory[invHover], x: rmx, y: rmy };
    return;
  }
  // Right-click on armor tab card
  if (UI.isOpen('inventory') && armorHoverSlot >= 0 && inventory[armorHoverSlot]) {
    const rect = canvas.getBoundingClientRect();
    const rmx = (e.clientX - rect.left) / scale;
    const rmy = (e.clientY - rect.top) / scale;
    cardPopup = { item: inventory[armorHoverSlot], x: rmx, y: rmy };
    return;
  }
  // Dismiss card popup on right-click elsewhere
  if (cardPopup) { cardPopup = null; return; }
  // Right-click removes placed tiles
  if (activePlaceTool && !UI.isOpen('toolbox')) {
    const rect = canvas.getBoundingClientRect();
    const rmx = (e.clientX - rect.left) / scale;
    const rmy = (e.clientY - rect.top) / scale;
    const worldX = rmx + camera.x;
    const worldY = rmy + camera.y;
    const tx = Math.floor(worldX / TILE) * TILE;
    const ty = Math.floor(worldY / TILE) * TILE;
    for (let i = placedTiles.length - 1; i >= 0; i--) {
      if (placedTiles[i].x === tx && placedTiles[i].y === ty) {
        placedTiles.splice(i, 1); break;
      }
    }
  }
});
canvas.addEventListener("wheel", e => {
  if (countryPopupOpen) {
    const cols = 6, cellH = 82, popH = 420;
    const visRows = Math.floor((popH - 90) / cellH);
    const totalRows = Math.ceil(COUNTRIES.length / cols);
    const maxScroll = Math.max(0, totalRows - visRows);
    countryScroll = Math.max(0, Math.min(maxScroll, countryScroll + (e.deltaY > 0 ? 1 : -1)));
    e.preventDefault();
  } else if (languagePopupOpen) {
    const cols = 6, cellH = 82, popH = 420;
    const visRows = Math.floor((popH - 90) / cellH);
    const totalRows = Math.ceil(LANGUAGES.length / cols);
    const maxScroll = Math.max(0, totalRows - visRows);
    languageScroll = Math.max(0, Math.min(maxScroll, languageScroll + (e.deltaY > 0 ? 1 : -1)));
    e.preventDefault();
  } else if (UI.isOpen('toolbox')) {
    const cat = TOOLBOX_CATEGORIES[toolboxCategory];
    const pad = 30;
    const ph = BASE_H - pad * 2;
    const contentH = ph - 60 - 42 - 12 - 20;
    const maxScroll = Math.max(0, (cat._totalHeight || 0) - contentH);
    toolboxScroll = Math.max(0, Math.min(maxScroll, toolboxScroll + e.deltaY * 0.8));
    e.preventDefault();
  } else if (UI.isOpen('settings')) {
    let totalH;
    if (SETTINGS_TABS[settingsActiveTab] === "Keybinds") {
      totalH = KEYBIND_ITEMS.length * 38;
    } else {
      const items = SETTINGS_DATA[SETTINGS_TABS[settingsActiveTab]] || [];
      totalH = items.length * 36;
    }
    const contentH = 480 - 94;
    const maxScroll = Math.max(0, totalH - contentH);
    settingsScroll = Math.max(0, Math.min(maxScroll, settingsScroll + e.deltaY * 0.5));
    e.preventDefault();
  } else if (UI.isOpen('inventory') && invCategory === 3) {
    // Scroll armor inventory grid
    armorInvScroll = Math.max(0, armorInvScroll + e.deltaY * 0.6);
    e.preventDefault();
  } else if (statsPanelOpen) {
    const skills = SKILL_CATEGORIES[statsTab] || [];
    const skillRowH = 56;
    const spH = 620, spY = (BASE_H - spH) / 2;
    const barY = spY + 66 + 20;
    const tabY = barY + 18 + 16;
    const skillAreaY = tabY + 38 + 12;
    const skillAreaH = spH - (skillAreaY - spY) - 16;
    const maxScroll = Math.max(0, skills.length * skillRowH - skillAreaH);
    statsScroll = Math.max(0, Math.min(maxScroll, statsScroll + e.deltaY * 0.6));
    e.preventDefault();
  } else if (UI.isOpen('customize')) {
    const iconSize = 58, iconGap = 6;
    const sideTotalH = CUSTOMIZE_CATS.length * (iconSize + iconGap) + 8;
    const sideVisibleH = BASE_H - 80;
    const sideMaxScroll = Math.max(0, sideTotalH - sideVisibleH);
    customizeSideScroll = Math.max(0, Math.min(sideMaxScroll, customizeSideScroll + e.deltaY * 0.6));
    e.preventDefault();
  }
}, { passive: false });

