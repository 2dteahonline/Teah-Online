// ===================== SAVE / LOAD SYSTEM =====================
// Core: localStorage save/load, version migration
// Extracted from index_2.html — Phase E

// ===================== SAVE / LOAD SYSTEM =====================
// Persists keybinds, settings, cosmetics, and identity to localStorage.
// Auto-saves on changes. Auto-loads on startup.
const SAVE_KEY = 'dungeon_game_save';
const SAVE_VERSION = 6;

const SaveLoad = {
  // Cosmetic keys to persist from player object
  _cosmeticKeys: ['skin', 'hair', 'shirt', 'pants', 'shoes', 'hat', 'glasses',
    'gloves', 'belt', 'cape', 'tattoo', 'scars', 'earring', 'necklace',
    'backpack', 'warpaint', 'eyes', 'facialHair'],

  save() {
    try {
      const data = {
        version: SAVE_VERSION,
        keybinds: { ...keybinds },
        settings: { ...gameSettings },
        identity: {
          name: player.name,
          status: playerStatus,
          faction: playerFaction,
          country: playerCountry,
          gender: playerGender,
        },
        cosmetics: {},
      };
      for (const k of this._cosmeticKeys) {
        data.cosmetics[k] = player[k];
      }
      // Persistent progression (survives page refresh)
      data.progression = {
        playerLevel: playerLevel,
        playerXP: playerXP,
        skillData: JSON.parse(JSON.stringify(skillData)),
        gunLevels: typeof window._gunLevels !== 'undefined' ? { ...window._gunLevels } : {},
      };
      // Fishing state (v4: rod is now an inventory item, only persist bait + stats)
      data.fishing = {
        baitCount: fishingState.baitCount,
        stats: { ...fishingState.stats },
      };
      // Farming state (v5: persist stats + landLevel only; tiles are session-only)
      if (typeof farmingState !== 'undefined') {
        data.farming = {
          landLevel: farmingState.landLevel,
          stats: { ...farmingState.stats },
        };
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.version || data.version < 1) return false;

      // Keybinds
      if (data.keybinds) {
        for (const action in data.keybinds) {
          if (action in DEFAULT_KEYBINDS) {
            keybinds[action] = data.keybinds[action];
          }
        }
      }

      // Settings
      if (data.settings) {
        for (const key in data.settings) {
          if (key in gameSettings) {
            gameSettings[key] = data.settings[key];
          }
        }
      }

      // Identity
      if (data.identity) {
        if (data.identity.name) player.name = data.identity.name;
        if (data.identity.status !== undefined) playerStatus = data.identity.status;
        if (data.identity.faction) playerFaction = data.identity.faction;
        if (data.identity.country) playerCountry = data.identity.country;
        if (data.identity.gender) playerGender = data.identity.gender;
      }

      // Cosmetics
      if (data.cosmetics) {
        for (const k of this._cosmeticKeys) {
          if (data.cosmetics[k] !== undefined) player[k] = data.cosmetics[k];
        }
      }

      // Progression (v2+) — persistent levels & skills
      if (data.progression) {
        const p = data.progression;
        if (p.playerLevel !== undefined) playerLevel = p.playerLevel;
        if (p.playerXP !== undefined) playerXP = p.playerXP;
        if (p.skillData) {
          for (const skill in p.skillData) {
            if (skillData[skill]) {
              skillData[skill].level = p.skillData[skill].level || 1;
              skillData[skill].xp = p.skillData[skill].xp || 0;
            }
          }
        }
        // Gold, inventory, equipment are session-only (dungeon roguelike design)
        // Gun levels (v6+) — permanent gun progression
        if (p.gunLevels && typeof window._gunLevels !== 'undefined') {
          for (const gunId in p.gunLevels) {
            if (gunId in window._gunLevels) {
              window._gunLevels[gunId] = p.gunLevels[gunId];
            }
          }
        }
      }

      // Fishing state (v4: rod is inventory item, only load bait + stats)
      if (data.fishing && typeof fishingState !== 'undefined') {
        const f = data.fishing;
        fishingState.baitCount = f.baitCount || 0;
        if (f.stats) {
          fishingState.stats.totalCaught = f.stats.totalCaught || 0;
          fishingState.stats.biggestFish = f.stats.biggestFish || '';
          fishingState.stats.biggestFishValue = f.stats.biggestFishValue || 0;
          fishingState.stats.totalCasts = f.stats.totalCasts || 0;
        }
        // v3→v4 migration: old saves stored rodTier — add a bronze rod to inventory
        if (data.version < 4 && f.rodTier !== undefined && f.rodTier >= 0) {
          if (typeof addToInventory === 'function' && typeof createItem === 'function') {
            const tier = Math.min(f.rodTier, ROD_TIERS.length - 1);
            const rodData = { ...ROD_TIERS[tier], currentDurability: f.rodDurability || ROD_TIERS[tier].durability };
            addToInventory(createItem('melee', rodData));
          }
        }
      }

      // Farming state (v5+)
      if (data.farming && typeof farmingState !== 'undefined') {
        const fm = data.farming;
        if (fm.landLevel !== undefined) farmingState.landLevel = fm.landLevel;
        if (fm.stats) {
          farmingState.stats.totalHarvested = fm.stats.totalHarvested || 0;
          farmingState.stats.totalEarned = fm.stats.totalEarned || 0;
          farmingState.stats.bestCrop = fm.stats.bestCrop || null;
          farmingState.stats.bestCropValue = fm.stats.bestCropValue || 0;
        }
      }

      return true;
    } catch (e) {
      console.warn('Load failed:', e);
      return false;
    }
  },

  clear() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  },

  // Auto-save after changes (debounced)
  autoSave() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this.save(), 1000);
  },
};

// Load saved data on startup
SaveLoad.load();
useSpriteMode = gameSettings.spriteMode;

const SETTINGS_DATA = {
  General: [
    { label: "Nicknames", key: "nicknames", type: "toggle" },
    { label: "Animations", key: "animations", type: "toggle" },
    { label: "Day/Night + Weather", key: "dayNightWeather", type: "toggle" },
    { label: "Blood Animation", key: "bloodAnim", type: "toggle" },
    { label: "Death Animation", key: "deathAnim", type: "toggle" },
    { label: "Hotbar Position", key: "hotbarPosition", type: "select", options: ["right", "bottom"] },
    { label: "Sprite Mode", key: "spriteMode", type: "toggle" },
  ],
  Sounds: [
    { label: "Master Volume", key: "masterVolume", type: "toggle" },
    { label: "Sound Effects", key: "sfx", type: "toggle" },
    { label: "Music", key: "music", type: "toggle" },
    { label: "Ambient", key: "ambient", type: "toggle" },
  ],
  Indicators: [
    { label: "Damage Numbers", key: "damageNumbers", type: "toggle" },
    { label: "Health Bars", key: "healthBars", type: "toggle" },
    { label: "Mob HP Text", key: "mobHpText", type: "toggle" },
    { label: "Kill Feed", key: "killFeed", type: "toggle" },
    { label: "Wave Announcements", key: "waveAnnounce", type: "toggle" },
    { label: "Player HP Bar", key: "playerHpBar", type: "toggle" },
    { label: "Player Indicator", key: "playerIndicator", type: "toggle" },
  ],
  Profile: [
    { label: "Private Stats", key: "privateStats", type: "toggle" },
    { label: "Language", key: "language", type: "select", options: ["English", "Spanish", "French", "German", "Portuguese", "Japanese", "Korean", "Chinese"] },
    { label: "Currency", key: "currency", type: "select", options: ["USD", "EUR", "GBP", "JPY", "KRW", "BRL", "CAD", "AUD"] },
    { label: "Show Online Time", key: "showOnlineTime", type: "toggle" },
    { label: "Relationship", key: "relationshipStatus", type: "select", options: ["Single", "Dating", "Married", "Complicated"] },
  ],
  Message: [
    { label: "Chat Visibility", key: "chatVisibility", type: "select", options: ["All", "Friends/Gang", "None"] },
    { label: "PMs Friends Only", key: "pmFriendsOnly", type: "toggle" },
    { label: "Disable All Messages", key: "disableAllMessages", type: "toggle" },
    { label: "Bot/Event Messages", key: "receiveBotMessages", type: "toggle" },
  ],
  Privacy: [
    { label: "Appear Off Map", key: "appearOffMap", type: "toggle" },
    { label: "Private Stats", key: "privateStats", type: "toggle" },
    { label: "PMs Friends Only", key: "pmFriendsOnly", type: "toggle" },
    { label: "Disable All Messages", key: "disableAllMessages", type: "toggle" },
  ],
};

function drawSettingsPanel() {
  if (!UI.isOpen('settings')) return;
  const pw = 520, ph = 480;
  const px = BASE_W/2 - pw/2, py = BASE_H/2 - ph/2;

  // Dark panel
  ctx.fillStyle = "rgba(8,8,14,0.92)";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.fill();
  ctx.strokeStyle = "#2a6a4a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 8); ctx.stroke();

  // Title bar
  ctx.fillStyle = "rgba(40,100,70,0.2)";
  ctx.fillRect(px + 2, py + 2, pw - 4, 34);
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText("SETTINGS", px + pw/2, py + 24);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 36, py + 6, 28, 28, 4); ctx.fill();
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("✕", px + pw - 22, py + 25);

  // Tabs
  const tabW = (pw - 24) / SETTINGS_TABS.length;
  for (let i = 0; i < SETTINGS_TABS.length; i++) {
    const tx = px + 12 + i * tabW;
    const active = i === settingsActiveTab;
    // Tab bg
    ctx.fillStyle = active ? "rgba(80,200,120,0.2)" : "rgba(30,30,40,0.6)";
    ctx.beginPath(); ctx.roundRect(tx, py + 40, tabW - 4, 26, 4); ctx.fill();
    if (active) {
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tx, py + 40, tabW - 4, 26, 4); ctx.stroke();
    }
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = active ? PALETTE.accent : "#777";
    ctx.textAlign = "center";
    ctx.fillText(SETTINGS_TABS[i], tx + (tabW - 4)/2, py + 57);
  }

  // Content area
  const contentX = px + 16, contentY = py + 78;
  const contentW = pw - 32, contentH = ph - 94;
  ctx.save();
  ctx.beginPath();
  ctx.rect(contentX, contentY, contentW, contentH);
  ctx.clip();

  const items = SETTINGS_DATA[SETTINGS_TABS[settingsActiveTab]] || [];
  const rowH = 36;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ry = contentY + i * rowH - settingsScroll;
    if (ry + rowH < contentY || ry > contentY + contentH) continue;

    // Row bg (alternating)
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.1)";
    ctx.fillRect(contentX, ry, contentW, rowH);

    // Label
    ctx.font = "13px monospace";
    ctx.fillStyle = "#ccc";
    ctx.textAlign = "left";
    ctx.fillText(item.label, contentX + 12, ry + 23);

    if (item.type === "toggle") {
      // Toggle switch
      const sw = 44, sh = 22;
      const sx = contentX + contentW - sw - 12;
      const sy = ry + (rowH - sh) / 2;
      const on = gameSettings[item.key];

      // Track
      ctx.fillStyle = on ? "rgba(80,200,120,0.4)" : "rgba(60,60,70,0.6)";
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, sh/2); ctx.fill();
      ctx.strokeStyle = on ? PALETTE.accent : "#555";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(sx, sy, sw, sh, sh/2); ctx.stroke();

      // Knob
      const knobX = on ? sx + sw - sh + 3 : sx + 3;
      ctx.fillStyle = on ? PALETTE.accent : "#888";
      ctx.beginPath(); ctx.arc(knobX + (sh - 6)/2, sy + sh/2, (sh - 6)/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = on ? "#fff" : "#aaa";
      ctx.beginPath(); ctx.arc(knobX + (sh - 6)/2, sy + sh/2, (sh - 10)/2, 0, Math.PI * 2); ctx.fill();

    } else if (item.type === "select") {
      // Selector button
      const val = gameSettings[item.key];
      const bw = 130, bh = 24;
      const bx = contentX + contentW - bw - 12;
      const by = ry + (rowH - bh) / 2;

      ctx.fillStyle = "rgba(40,40,55,0.8)";
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.stroke();

      ctx.font = "bold 11px monospace";
      ctx.fillStyle = PALETTE.accent;
      ctx.textAlign = "center";
      ctx.fillText(val, bx + bw/2, by + 16);

      // Arrows
      ctx.fillStyle = "#888";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      ctx.fillText("◀", bx + 4, by + 17);
      ctx.textAlign = "right";
      ctx.fillText("▶", bx + bw - 4, by + 17);
    }
  }

  // Keybinds tab — custom rendering
  if (SETTINGS_TABS[settingsActiveTab] === "Keybinds") {
    // Draw over the empty content area
    const kRowH = 38;
    for (let i = 0; i < KEYBIND_ITEMS.length; i++) {
      const item = KEYBIND_ITEMS[i];
      const ry = contentY + i * kRowH - settingsScroll;
      if (ry + kRowH < contentY || ry > contentY + contentH) continue;

      if (item.type === "header") {
        // Section header
        ctx.fillStyle = "rgba(80,200,120,0.08)";
        ctx.fillRect(contentX, ry, contentW, kRowH);
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = PALETTE.accent;
        ctx.textAlign = "left";
        ctx.fillText(item.label, contentX + 12, ry + 24);
        // Divider line
        ctx.strokeStyle = "rgba(80,200,120,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(contentX, ry + kRowH - 1); ctx.lineTo(contentX + contentW, ry + kRowH - 1); ctx.stroke();
      } else {
        // Row bg
        ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.08)";
        ctx.fillRect(contentX, ry, contentW, kRowH);

        // Label
        ctx.font = "13px monospace";
        ctx.fillStyle = "#bbb";
        ctx.textAlign = "left";
        ctx.fillText(item.label, contentX + 20, ry + 24);

        // Key button
        const isRebinding = rebindingKey === item.action;
        const bw = 100, bh = 26;
        const bx = contentX + contentW - bw - 14;
        const by = ry + (kRowH - bh) / 2;

        if (isRebinding) {
          // Pulsing highlight when waiting for key
          const pulse = 0.5 + 0.3 * Math.sin(Date.now() * 0.008);
          ctx.fillStyle = `rgba(80,200,120,${pulse * 0.3})`;
          ctx.beginPath(); ctx.roundRect(bx - 2, by - 2, bw + 4, bh + 4, 6); ctx.fill();
          ctx.fillStyle = "rgba(80,200,120,0.15)";
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
          ctx.strokeStyle = PALETTE.accent;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.stroke();
          ctx.font = "bold 12px monospace";
          ctx.fillStyle = PALETTE.accent;
          ctx.textAlign = "center";
          ctx.fillText("PRESS KEY...", bx + bw/2, by + 17);
        } else {
          ctx.fillStyle = "rgba(30,30,45,0.9)";
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.fill();
          ctx.strokeStyle = keybinds[item.action] !== DEFAULT_KEYBINDS[item.action] ? "#ca8050" : "#555";
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 4); ctx.stroke();
          ctx.font = "bold 13px monospace";
          ctx.fillStyle = keybinds[item.action] !== DEFAULT_KEYBINDS[item.action] ? "#ca8050" : "#ddd";
          ctx.textAlign = "center";
          ctx.fillText(getKeyDisplayName(keybinds[item.action]), bx + bw/2, by + 18);
        }
      }
    }

    // Reset to Defaults button at bottom
    const resetY = contentY + contentH - 36;
    const resetW = 160, resetH = 28;
    const resetX = contentX + contentW/2 - resetW/2;
    ctx.fillStyle = "rgba(200,60,60,0.2)";
    ctx.beginPath(); ctx.roundRect(resetX, resetY, resetW, resetH, 4); ctx.fill();
    ctx.strokeStyle = "#c44";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(resetX, resetY, resetW, resetH, 4); ctx.stroke();
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#e66";
    ctx.textAlign = "center";
    ctx.fillText("RESET DEFAULTS", resetX + resetW/2, resetY + 19);
  }

  ctx.restore();

  // Scrollbar if needed
  const totalH = items.length * rowH;
  if (totalH > contentH) {
    const scrollPct = settingsScroll / (totalH - contentH);
    const barH = Math.max(30, contentH * (contentH / totalH));
    const barY = contentY + scrollPct * (contentH - barH);
    ctx.fillStyle = "rgba(80,200,120,0.2)";
    ctx.beginPath(); ctx.roundRect(contentX + contentW - 6, barY, 4, barH, 2); ctx.fill();
  }

  // Footer
  ctx.font = "9px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.textAlign = "center";
  ctx.fillText("Click toggles to change · Click selectors to cycle", px + pw/2, py + ph - 6);
  ctx.textAlign = "left";
}

