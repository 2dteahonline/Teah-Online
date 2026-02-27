// ===================== TEST MOB GUI PANEL =====================
// Opened via /testmob command. Lets user select dungeon → floor → mob
// and test them live or frozen without typing commands.

// Panel state
let testMobDungeon = 'azurine';  // 'cave' | 'azurine'
let testMobFloor = 1;
let testMobScroll = 0;

// Dungeon → Floor → Mob mapping
const TESTMOB_DUNGEONS = {
  cave: {
    name: 'Cave Dungeon',
    floors: {
      1: { name: 'Cave Floor 1', mobs: ['grunt', 'runner', 'tank', 'witch', 'skeleton', 'mummy', 'archer', 'healer', 'golem', 'mini_golem'] },
    }
  },
  azurine: {
    name: 'Azurine City',
    floors: {
      1: { name: 'Floor 1 — City Streets', mobs: ['neon_pickpocket', 'cyber_mugger', 'drone_lookout', 'street_chemist', 'renegade_bruiser', 'renegade_shadowknife', 'renegade_demo', 'renegade_sniper', 'the_don', 'velocity'] },
      2: { name: 'Floor 2 — Tech District', mobs: ['circuit_thief', 'arc_welder', 'battery_drone', 'coil_runner', 'suit_enforcer', 'compliance_officer', 'contract_assassin', 'executive_handler', 'voltmaster', 'e_mortis'] },
      3: { name: 'Floor 3 — Junkyard', mobs: ['scrap_rat', 'magnet_scavenger', 'rust_sawman', 'junkyard_pyro', 'toxic_leechling', 'bog_stalker', 'chem_frog', 'mosquito_drone', 'mourn', 'centipede'] },
      4: { name: 'Floor 4 — Trap House', mobs: ['tripwire_tech', 'gizmo_hound', 'holo_jester', 'time_prankster', 'enforcer_drone', 'synth_builder', 'shock_trooper', 'signal_jammer', 'game_master', 'junz'] },
      5: { name: 'Floor 5 — Waste Planet', mobs: ['rabid_hyenaoid', 'spore_stag', 'wasteland_raptor', 'plague_batwing', 'gel_swordsman', 'viscosity_mage', 'core_guardian', 'biolum_drone', 'lehvius', 'jackman', 'malric', 'vale'] },
    }
  }
};

UI.register('testmob', {
  onOpen() { testMobScroll = 0; },
  onClose() { testMobScroll = 0; },
});

// ===================== SPAWN TEST MOB =====================
function _testmobSpawn(typeKey, mode) {
  // Enter test arena if not already there
  if (!Scene.inTestArena) {
    enterLevel('test_arena', 10, 4);
    dungeonFloor = testMobFloor;
    window._opMode = true;
    player.hp = player.maxHp = 10000;
    gold = 999999;
    currentDungeon = testMobDungeon;
  }
  // Clear previous
  mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
  if (typeof TelegraphSystem !== 'undefined') TelegraphSystem.clear();
  if (typeof HazardSystem !== 'undefined') HazardSystem.clear();
  player.hp = player.maxHp;
  // Spawn mob
  const mob = createMob(typeKey, player.x + 150, player.y, 1, 1);
  if (mob) {
    if (mode !== 'live') { mob.speed = 0; mob._specialTimer = 99999; }
    mobs.push(mob);
    const label = mode === 'live' ? ' [LIVE]' : ' [FROZEN]';
    chatMessages.push({ name: "SYSTEM", text: "Testing: " + (mob.name || typeKey) + label, time: Date.now() });
  }
}

// ===================== DRAW PANEL =====================
function drawTestMobPanel() {
  if (!UI.isOpen('testmob')) return;

  const pw = 700, ph = 520;
  const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;

  // Dimmed backdrop
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = "#0a0e18";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
  ctx.strokeStyle = "rgba(100,180,220,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.stroke();

  // Header bar
  ctx.fillStyle = "rgba(20,40,60,0.6)";
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, 44, [12,12,0,0]); ctx.fill();
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#66ccff";
  ctx.textAlign = "center";
  ctx.fillText("🧪  MOB TESTER", px + pw/2, py + 31);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 42, py + 8, 32, 32, 6); ctx.fill();
  ctx.font = "bold 20px monospace"; ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.fillText("✕", px + pw - 26, py + 30);

  // ===== LEFT SIDEBAR: Dungeon + Floor selection =====
  const sideW = 180;
  const sideX = px + 12;
  const sideY = py + 56;
  const sideH = ph - 68;

  ctx.fillStyle = "rgba(15,20,30,0.8)";
  ctx.beginPath(); ctx.roundRect(sideX, sideY, sideW, sideH, 8); ctx.fill();

  // Dungeon buttons
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  const dungeonKeys = Object.keys(TESTMOB_DUNGEONS);
  const dungBtnH = 30, dungBtnGap = 6;
  let dungBtnY = sideY + 10;

  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText("DUNGEON", sideX + sideW/2, dungBtnY + 8);
  dungBtnY += 20;

  for (const dk of dungeonKeys) {
    const dInfo = TESTMOB_DUNGEONS[dk];
    const active = dk === testMobDungeon;
    ctx.fillStyle = active ? "rgba(60,140,200,0.3)" : "rgba(30,35,50,0.8)";
    ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.fill();
    if (active) {
      ctx.strokeStyle = "#66ccff"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.stroke();
    }
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = active ? "#66ccff" : "#999";
    ctx.fillText(dInfo.name, sideX + sideW/2, dungBtnY + 20);
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // Floor buttons
  dungBtnY += 10;
  ctx.font = "bold 12px monospace";
  ctx.fillStyle = "#888";
  ctx.textAlign = "center";
  ctx.fillText("FLOOR", sideX + sideW/2, dungBtnY + 8);
  dungBtnY += 20;

  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorKeys = Object.keys(dungData.floors).map(Number).sort((a,b) => a - b);
  for (const fk of floorKeys) {
    const fInfo = dungData.floors[fk];
    const active = fk === testMobFloor;
    ctx.fillStyle = active ? "rgba(60,200,120,0.2)" : "rgba(30,35,50,0.8)";
    ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.fill();
    if (active) {
      ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(sideX + 8, dungBtnY, sideW - 16, dungBtnH, 6); ctx.stroke();
    }
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = active ? PALETTE.accent : "#999";
    ctx.fillText("Floor " + fk, sideX + sideW/2, dungBtnY + 20);
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // ===== RIGHT AREA: Mob grid =====
  const gridX = sideX + sideW + 12;
  const gridY = sideY;
  const gridW = pw - sideW - 36;
  const gridH = sideH;

  ctx.fillStyle = "rgba(15,20,30,0.5)";
  ctx.beginPath(); ctx.roundRect(gridX, gridY, gridW, gridH, 8); ctx.fill();

  // Floor title
  const floorData = dungData.floors[testMobFloor];
  if (!floorData) return;
  ctx.font = "bold 13px monospace";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "left";
  ctx.fillText(floorData.name, gridX + 10, gridY + 18);

  // Mob cards
  const cardW = (gridW - 30) / 2;  // 2 columns
  const cardH = 52;
  const cardGap = 6;
  const cardStartY = gridY + 30;
  const maxVisibleCards = Math.floor((gridH - 40) / (cardH + cardGap));

  // Clamp scroll
  const totalCards = floorData.mobs.length;
  const totalRows = Math.ceil(totalCards / 2);
  const maxScroll = Math.max(0, totalRows - maxVisibleCards);
  testMobScroll = Math.max(0, Math.min(testMobScroll, maxScroll));

  ctx.save();
  ctx.beginPath();
  ctx.rect(gridX, cardStartY - 2, gridW, gridH - 38);
  ctx.clip();

  for (let i = 0; i < floorData.mobs.length; i++) {
    const typeKey = floorData.mobs[i];
    const mt = MOB_TYPES[typeKey];
    if (!mt) continue;

    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridX + 8 + col * (cardW + 8);
    const cy = cardStartY + (row - testMobScroll) * (cardH + cardGap);

    // Skip if out of view
    if (cy + cardH < cardStartY - 2 || cy > gridY + gridH) continue;

    const isBoss = mt.isBoss || (mt._specials && mt._specials.length > 1);

    // Card background
    ctx.fillStyle = isBoss ? "rgba(60,30,20,0.6)" : "rgba(25,30,45,0.8)";
    ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 8); ctx.fill();
    ctx.strokeStyle = isBoss ? "rgba(255,120,60,0.4)" : "rgba(80,120,160,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(cx, cy, cardW, cardH, 8); ctx.stroke();

    // Mob color swatch
    ctx.fillStyle = mt.shirt || mt.skin || "#666";
    ctx.beginPath(); ctx.roundRect(cx + 6, cy + 8, 10, 10, 3); ctx.fill();
    ctx.fillStyle = mt.pants || mt.hair || "#444";
    ctx.beginPath(); ctx.roundRect(cx + 6, cy + 22, 10, 10, 3); ctx.fill();

    // Mob name
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = isBoss ? "#ff9966" : "#ccc";
    const displayName = (mt.name || typeKey).substring(0, 16);
    ctx.fillText(displayName, cx + 22, cy + 17);

    // Stats
    ctx.font = "10px monospace";
    ctx.fillStyle = "#777";
    ctx.fillText("HP:" + mt.hp + " SPD:" + (mt.speed || 0).toFixed(1) + " DMG:" + (mt.damage || 0), cx + 22, cy + 30);

    // Boss badge
    if (isBoss) {
      ctx.fillStyle = "rgba(255,80,40,0.2)";
      ctx.beginPath(); ctx.roundRect(cx + 22, cy + 34, 34, 14, 3); ctx.fill();
      ctx.font = "bold 8px monospace";
      ctx.fillStyle = "#ff7744";
      ctx.fillText("BOSS", cx + 28, cy + 44);
    }

    // Frozen button
    const btnW = 50, btnH = 20;
    const frozenX = cx + cardW - btnW * 2 - 12;
    const frozenY = cy + 6;
    ctx.fillStyle = "rgba(60,120,200,0.3)";
    ctx.beginPath(); ctx.roundRect(frozenX, frozenY, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = "rgba(80,160,255,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(frozenX, frozenY, btnW, btnH, 4); ctx.stroke();
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#88bbff";
    ctx.textAlign = "center";
    ctx.fillText("FROZEN", frozenX + btnW/2, frozenY + 14);

    // Live button
    const liveX = cx + cardW - btnW - 6;
    const liveY = cy + 6;
    ctx.fillStyle = "rgba(200,80,60,0.3)";
    ctx.beginPath(); ctx.roundRect(liveX, liveY, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = "rgba(255,100,80,0.5)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(liveX, liveY, btnW, btnH, 4); ctx.stroke();
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = "#ff8866";
    ctx.textAlign = "center";
    ctx.fillText("LIVE", liveX + btnW/2, liveY + 14);
  }

  ctx.restore();

  // Scroll indicator
  if (totalRows > maxVisibleCards) {
    const scrollBarH = gridH - 40;
    const thumbH = Math.max(20, scrollBarH * (maxVisibleCards / totalRows));
    const thumbY = cardStartY + (testMobScroll / maxScroll) * (scrollBarH - thumbH);
    ctx.fillStyle = "rgba(100,150,200,0.2)";
    ctx.beginPath(); ctx.roundRect(gridX + gridW - 10, cardStartY, 6, scrollBarH, 3); ctx.fill();
    ctx.fillStyle = "rgba(100,180,255,0.5)";
    ctx.beginPath(); ctx.roundRect(gridX + gridW - 10, thumbY, 6, thumbH, 3); ctx.fill();
  }
}

// ===================== CLICK HANDLER =====================
function handleTestMobClick(mx, my) {
  if (!UI.isOpen('testmob')) return false;

  const pw = 700, ph = 520;
  const px = (BASE_W - pw) / 2, py = (BASE_H - ph) / 2;

  // Close button
  if (mx >= px + pw - 42 && mx <= px + pw - 10 && my >= py + 8 && my <= py + 40) {
    UI.close(); return true;
  }

  // Click outside panel = close
  if (mx < px || mx > px + pw || my < py || my > py + ph) {
    UI.close(); return true;
  }

  // Sidebar area
  const sideW = 180;
  const sideX = px + 12;
  const sideY = py + 56;

  // Dungeon buttons
  const dungeonKeys = Object.keys(TESTMOB_DUNGEONS);
  const dungBtnH = 30, dungBtnGap = 6;
  let dungBtnY = sideY + 30; // skip "DUNGEON" label

  for (const dk of dungeonKeys) {
    if (mx >= sideX + 8 && mx <= sideX + sideW - 8 &&
        my >= dungBtnY && my <= dungBtnY + dungBtnH) {
      testMobDungeon = dk;
      // Reset floor to first available
      const floors = Object.keys(TESTMOB_DUNGEONS[dk].floors).map(Number).sort((a,b) => a-b);
      testMobFloor = floors[0] || 1;
      testMobScroll = 0;
      return true;
    }
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // Floor buttons
  dungBtnY += 30; // skip gap + "FLOOR" label
  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorKeys = Object.keys(dungData.floors).map(Number).sort((a,b) => a - b);
  for (const fk of floorKeys) {
    if (mx >= sideX + 8 && mx <= sideX + sideW - 8 &&
        my >= dungBtnY && my <= dungBtnY + dungBtnH) {
      testMobFloor = fk;
      testMobScroll = 0;
      return true;
    }
    dungBtnY += dungBtnH + dungBtnGap;
  }

  // Mob grid area
  const gridX = sideX + sideW + 12;
  const gridY = sideY;
  const gridW = pw - sideW - 36;
  const gridH = ph - 68;
  const cardW = (gridW - 30) / 2;
  const cardH = 52;
  const cardGap = 6;
  const cardStartY = gridY + 30;

  const floorData = dungData.floors[testMobFloor];
  if (!floorData) return true;

  for (let i = 0; i < floorData.mobs.length; i++) {
    const typeKey = floorData.mobs[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = gridX + 8 + col * (cardW + 8);
    const cy = cardStartY + (row - testMobScroll) * (cardH + cardGap);

    // Skip if out of view
    if (cy + cardH < cardStartY || cy > gridY + gridH) continue;

    // Check Frozen button
    const btnW = 50, btnH = 20;
    const frozenX = cx + cardW - btnW * 2 - 12;
    const frozenY = cy + 6;
    if (mx >= frozenX && mx <= frozenX + btnW && my >= frozenY && my <= frozenY + btnH) {
      _testmobSpawn(typeKey, 'frozen');
      UI.close();
      return true;
    }

    // Check Live button
    const liveX = cx + cardW - btnW - 6;
    const liveY = cy + 6;
    if (mx >= liveX && mx <= liveX + btnW && my >= liveY && my <= liveY + btnH) {
      _testmobSpawn(typeKey, 'live');
      UI.close();
      return true;
    }
  }

  return true; // consume click even if nothing hit (we're in panel)
}

// ===================== SCROLL HANDLER =====================
function handleTestMobScroll(delta) {
  if (!UI.isOpen('testmob')) return false;
  testMobScroll += delta > 0 ? 1 : -1;
  // Clamp happens in draw
  const dungData = TESTMOB_DUNGEONS[testMobDungeon];
  const floorData = dungData ? dungData.floors[testMobFloor] : null;
  if (floorData) {
    const totalRows = Math.ceil(floorData.mobs.length / 2);
    const gridH = 520 - 68;
    const maxVisible = Math.floor((gridH - 40) / (52 + 6));
    const maxScroll = Math.max(0, totalRows - maxVisible);
    testMobScroll = Math.max(0, Math.min(testMobScroll, maxScroll));
  }
  return true;
}
