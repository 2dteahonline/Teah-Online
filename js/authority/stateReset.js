// ===================== STATE RESET & GAME LOGIC =====================
// Authority: centralized state reset, dungeon progression
// Extracted from index_2.html — Phase B

// ===================== CENTRALIZED STATE RESET =====================
// One function for all reset scenarios. Before this, resets were
// duplicated in 4 places with subtle differences (and bugs).
// Modes: 'lobby', 'dungeon', 'death', 'floor', 'mine', 'cooking'
function resetCombatState(mode) {
  // --- Always clear effects and combat state ---
  mobs.length = 0; bullets.length = 0; hitEffects.length = 0;
  deathEffects.length = 0; mobParticles.length = 0; medpacks.length = 0;
  oreNodes.length = 0;
  waveState = "waiting"; waveTimer = 0;
  resetPhaseState();
  StatusFX.clearPoison();
  freezeTimer = 0;
  contactCooldown = 0;

  // --- Reset cooking state ---
  if (typeof resetCookingState === 'function') resetCookingState();
  // --- Reset farming state ---
  if (typeof resetFarmingState === 'function') resetFarmingState();
  // --- Clear deli NPCs ---
  if (typeof deliNPCs !== 'undefined') deliNPCs.length = 0;

  // --- Reset inventory + equipment (everything except 'floor', 'mine', and 'cooking') ---
  if (mode !== 'floor' && mode !== 'mine' && mode !== 'cooking' && mode !== 'farm') {
    inventory.length = 0;
    addToInventory(createItem('gun', DEFAULT_GUN));
    addToInventory(createItem('gun', CT_X_GUN));
    addToInventory(createItem('melee', DEFAULT_MELEE));
    addToInventory(createItem('melee', DEFAULT_PICKAXE));
    addToInventory(createConsumable('potion', 'Health Potion', 3));
    // Weapon stats
    gun.damage = DEFAULT_GUN.damage; gun.magSize = DEFAULT_GUN.magSize; gun.ammo = DEFAULT_GUN.magSize;
    gun.reloading = false; gun.reloadTimer = 0; gun.fireCooldown = 0; gun.recoilTimer = 0;
    gun.special = null;
    melee.damage = DEFAULT_MELEE.damage; melee.critChance = DEFAULT_MELEE.critChance;
    melee.range = DEFAULT_MELEE.range; melee.cooldownMax = DEFAULT_MELEE.cooldown;
    melee.cooldown = 0; melee.swinging = false; melee.swingTimer = 0;
    melee.special = null; melee.dashing = false; melee.dashTimer = 0; melee.dashTrail = [];
    melee.dashesLeft = 0; melee.dashChainWindow = 0; melee.dashCooldown = 0; melee.dashActive = false; melee.dashGap = 0;
    shrine.charges = 0; shrine.active = false; shrine.timer = 0;
    godspeed.charges = 0; godspeed.active = false; godspeed.timer = 0;
    // Equipment slots
    playerEquip.gun = DEFAULT_GUN; playerEquip.melee = DEFAULT_MELEE;
    playerEquip.armor = null; playerEquip.boots = null;
    playerEquip.pants = null; playerEquip.chest = null; playerEquip.helmet = null;
    // Player bonuses
    fireRateBonus = 0;
    player.baseSpeed = 3.5;
    potion.count = 3; potion.cooldown = 0;
  }

  // --- Lobby/Cave: cap HP to base ---
  if (mode === 'lobby') {
    player.maxHp = 50;
    player.hp = Math.min(player.hp, 50);
  }

  // --- Dungeon fresh run or Death: full dungeon state reset ---
  if (mode === 'dungeon' || mode === 'death') {
    lives = 3; wave = 0; kills = 0;
    dungeonFloor = 1; stairsOpen = false; stairsAppearTimer = 0;
    dungeonComplete = false; victoryTimer = 0;
    reviveUsed = false;
    recalcMaxHp(); player.hp = player.maxHp;
    contactCooldown = 60;
    // Shop runtime state lives in shopState; _resetShopPrices handles all of it
    if (window._resetShopPrices) window._resetShopPrices();
  }

  // --- Death: also reset gold ---
  if (mode === 'death') {
    gold = 0;
    deathGameOver = false;
  }

  // --- Floor transition: partial reset, keep equipment ---
  if (mode === 'floor') {
    wave = 0;
    stairsOpen = false; stairsAppearTimer = 0;
    recalcMaxHp(); player.hp = player.maxHp;
    potion.count += 2;
    reviveUsed = false;
  }

  // --- Mine: spawn ores, keep everything else ---
  if (mode === 'mine') {
    if (typeof spawnOreNodes === 'function') spawnOreNodes();
    miningTarget = null; miningTimer = 0; miningProgress = 0;
  }
}

function drawStation() {
  const sx = station.x, sy = station.y;
  const t = Date.now() / 1000;

  // Ground circle (stone platform)
  ctx.fillStyle = "#3a3a48";
  ctx.beginPath(); ctx.ellipse(sx, sy + 30, 60, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#4a4a58";
  ctx.beginPath(); ctx.ellipse(sx, sy + 28, 56, 22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5a5a6a";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(sx, sy + 28, 56, 22, 0, 0, Math.PI * 2); ctx.stroke();

  // Inner ring pattern
  ctx.strokeStyle = "rgba(80,200,120,0.25)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(sx, sy + 28, 40, 16, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(sx, sy + 28, 20, 8, 0, 0, Math.PI * 2); ctx.stroke();

  // Pedestal base
  ctx.fillStyle = "#555568";
  ctx.fillRect(sx - 24, sy - 10, 48, 42);
  ctx.fillStyle = "#606078";
  ctx.fillRect(sx - 28, sy - 14, 56, 10);
  ctx.fillRect(sx - 28, sy + 28, 56, 8);
  // Side shading
  ctx.fillStyle = "#4a4a5a";
  ctx.fillRect(sx - 24, sy - 10, 6, 42);
  ctx.fillStyle = "#6a6a80";
  ctx.fillRect(sx + 18, sy - 10, 6, 42);

  // Pedestal top plate
  ctx.fillStyle = "#707088";
  ctx.fillRect(sx - 30, sy - 18, 60, 8);
  ctx.fillStyle = "#808098";
  ctx.fillRect(sx - 28, sy - 16, 56, 4);

  // Crystal (large, animated glow)
  const glow = 0.6 + 0.3 * Math.sin(t * 2);
  const bob = Math.sin(t * 1.5) * 3;

  // Crystal shadow on pedestal
  ctx.fillStyle = `rgba(80,200,120,${glow * 0.3})`;
  ctx.beginPath(); ctx.ellipse(sx, sy - 14, 16, 5, 0, 0, Math.PI * 2); ctx.fill();

  // Crystal body
  const cy2 = sy - 40 + bob;
  ctx.fillStyle = `rgba(40,160,90,${glow})`;
  ctx.beginPath();
  ctx.moveTo(sx, cy2 - 28);
  ctx.lineTo(sx - 14, cy2);
  ctx.lineTo(sx - 8, cy2 + 12);
  ctx.lineTo(sx + 8, cy2 + 12);
  ctx.lineTo(sx + 14, cy2);
  ctx.closePath();
  ctx.fill();

  // Crystal inner shine
  ctx.fillStyle = `rgba(100,255,160,${glow * 0.7})`;
  ctx.beginPath();
  ctx.moveTo(sx, cy2 - 24);
  ctx.lineTo(sx - 8, cy2);
  ctx.lineTo(sx - 4, cy2 + 8);
  ctx.lineTo(sx + 4, cy2 + 8);
  ctx.lineTo(sx + 8, cy2);
  ctx.closePath();
  ctx.fill();

  // Crystal highlight
  ctx.fillStyle = `rgba(200,255,220,${glow * 0.5})`;
  ctx.beginPath();
  ctx.moveTo(sx - 2, cy2 - 20);
  ctx.lineTo(sx - 6, cy2 - 4);
  ctx.lineTo(sx - 2, cy2 + 4);
  ctx.closePath();
  ctx.fill();

  // Glow aura
  const grad = ctx.createRadialGradient(sx, cy2, 4, sx, cy2, 50);
  grad.addColorStop(0, `rgba(80,200,120,${glow * 0.35})`);
  grad.addColorStop(1, "rgba(80,200,120,0)");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(sx, cy2, 50, 0, Math.PI * 2); ctx.fill();

  // Floating particles
  for (let i = 0; i < 6; i++) {
    const angle = t + i * Math.PI / 3;
    const pr = 30 + Math.sin(t * 2 + i) * 10;
    const ppx = sx + Math.cos(angle) * pr;
    const ppy = cy2 + Math.sin(angle) * pr * 0.5;
    const pa = 0.3 + 0.3 * Math.sin(t * 3 + i * 2);
    ctx.fillStyle = `rgba(120,255,180,${pa})`;
    ctx.beginPath(); ctx.arc(ppx, ppy, 2, 0, Math.PI * 2); ctx.fill();
  }

  // "SHOP" label above
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText("SHOP", sx, cy2 - 38);
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "rgba(80,200,120,0.9)";
  ctx.fillText("SHOP", sx, cy2 - 38);

  // Interact prompt when near
  const nearbyObj = getNearestInteractable();
  if (nearbyObj && nearbyObj.id === 'shop_station' && !UI.isOpen('shop')) {
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText(nearbyObj.label, sx, sy + 54);
  }

  ctx.textAlign = "left";
}

function drawVictoryCelebration() {
  if (!dungeonComplete) return;
  const t = victoryTimer;
  const cx = (level.widthTiles / 2) * TILE;
  const cy = (level.heightTiles / 2) * TILE;
  const mapW = level.widthTiles * TILE;
  const mapH = level.heightTiles * TILE;

  // Fireworks — spawn from edges, burst in air
  const numFireworks = 8;
  for (let i = 0; i < numFireworks; i++) {
    const seed = i * 137.5;
    const cycleLen = 180 + (i % 3) * 40;
    const phase = ((t + seed) % cycleLen) / cycleLen;

    // Each firework has a launch and burst phase
    const launchX = TILE * 3 + (i * mapW * 0.12) % (mapW - TILE * 6);
    const launchY = mapH - TILE * 2;
    const burstX = launchX + Math.sin(seed) * 60;
    const burstY = TILE * 4 + (seed % 200);

    if (phase < 0.3) {
      // Trail going up
      const p = phase / 0.3;
      const tx = launchX + (burstX - launchX) * p;
      const ty = launchY + (burstY - launchY) * p;
      ctx.fillStyle = `rgba(255,220,100,${0.8 * (1 - p * 0.5)})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
      // Tail
      for (let tt = 1; tt < 4; tt++) {
        const tp = Math.max(0, p - tt * 0.03);
        const ttx = launchX + (burstX - launchX) * tp;
        const tty = launchY + (burstY - launchY) * tp;
        ctx.fillStyle = `rgba(255,180,60,${0.3 / tt})`;
        ctx.beginPath();
        ctx.arc(ttx, tty, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (phase < 0.8) {
      // Burst
      const bp = (phase - 0.3) / 0.5;
      const colors = [
        [255,80,80], [80,200,255], [255,215,0], [100,255,150],
        [255,120,255], [255,160,60], [120,120,255], [255,255,100]
      ];
      const col = colors[i % colors.length];
      const numSparks = 16;
      for (let s = 0; s < numSparks; s++) {
        const sa = (s / numSparks) * Math.PI * 2 + seed * 0.1;
        const sr = bp * (60 + (seed % 30));
        const sparkX = burstX + Math.cos(sa) * sr;
        const sparkY = burstY + Math.sin(sa) * sr + bp * bp * 20; // gravity
        const alpha = Math.max(0, 1 - bp * 1.3);
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 3 - bp * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      // Inner sparkle
      for (let s = 0; s < 8; s++) {
        const sa2 = (s / 8) * Math.PI * 2 + seed * 0.3 + bp * 2;
        const sr2 = bp * (30 + (seed % 15));
        const sx2 = burstX + Math.cos(sa2) * sr2;
        const sy2 = burstY + Math.sin(sa2) * sr2 + bp * bp * 10;
        const alpha2 = Math.max(0, 0.8 - bp * 1.5);
        ctx.fillStyle = `rgba(255,255,255,${alpha2})`;
        ctx.beginPath();
        ctx.arc(sx2, sy2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Confetti — persistent small rectangles floating down
  const numConfetti = 40;
  for (let c = 0; c < numConfetti; c++) {
    const cseed = c * 97.3;
    const confX = (cseed * 7.1) % mapW;
    const fallSpeed = 0.8 + (cseed % 3) * 0.4;
    const confY = ((t * fallSpeed + cseed * 3) % (mapH + 100)) - 50;
    const wobble = Math.sin(t * 0.05 + cseed) * 20;
    const rotation = t * 0.03 + cseed;
    const confColors = ['#ff4444','#44aaff','#ffdd00','#44ff88','#ff88ff','#ffaa44','#8888ff','#ff8844'];
    const confCol = confColors[c % confColors.length];
    
    ctx.save();
    ctx.translate(confX + wobble, confY);
    ctx.rotate(rotation);
    ctx.fillStyle = confCol;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(-4, -2, 8, 4);
    ctx.restore();
  }

  // Golden shimmer around room edges
  const shimmer = Math.sin(t * 0.08) * 0.15 + 0.2;
  ctx.fillStyle = `rgba(255,215,0,${shimmer * 0.15})`;
  ctx.fillRect(TILE, TILE, mapW - TILE * 2, mapH - TILE * 2);

  // "VICTORY" text floating above center (screen-space would be better but this is world-space)
  if (t < 300) {
    const fadeIn = Math.min(1, t / 60);
    const bobY = Math.sin(t * 0.04) * 8;
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,215,0,${fadeIn * 0.9})`;
    ctx.fillText("★ VICTORY ★", cx, cy - 120 + bobY);
    ctx.strokeStyle = `rgba(180,140,0,${fadeIn * 0.6})`;
    ctx.lineWidth = 2;
    ctx.strokeText("★ VICTORY ★", cx, cy - 120 + bobY);
    ctx.textAlign = "left";
  }
}

function drawStaircase() {
  if (!stairsOpen) return;

  // Animate appearance
  if (stairsAppearTimer < 1) {
    stairsAppearTimer = Math.min(1, stairsAppearTimer + 0.006);
  }
  const appear = stairsAppearTimer;
  const ease = 1 - Math.pow(1 - appear, 3);

  // Color theme for current floor
  const ci = Math.min(dungeonFloor - 1, STAIR_COLORS.length - 1);
  const sc = STAIR_COLORS[ci];
  const [br, bg, bb] = sc.base;
  const [gr, gg, gb] = sc.glow;

  // Center of room
  const sx = (level.widthTiles / 2) * TILE;
  const sy = (level.heightTiles / 2) * TILE;
  const t = Date.now() / 1000;

  const spiralR = 44;
  const spiralH = 140 * ease;
  const steps = 24;
  const glow = 0.5 + Math.sin(t * 2) * 0.2;

  ctx.save();
  ctx.globalAlpha = ease;

  // Ground glow
  ctx.fillStyle = `rgba(${Math.round(br*0.25)},${Math.round(bg*0.25)},${Math.round(bb*0.25)},${0.6 * ease})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 30 * ease, TILE * 3 * ease, TILE * 1.2 * ease, 0, 0, Math.PI * 2);
  ctx.fill();

  // Outer ring
  ctx.strokeStyle = `rgba(${br},${bg},${bb},${glow * ease * 0.6})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 30 * ease, TILE * 3 * ease, TILE * 1.2 * ease, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.strokeStyle = `rgba(${gr},${gg},${gb},${glow * ease * 0.4})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(sx, sy + 30 * ease, TILE * 2 * ease, TILE * 0.8 * ease, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Center pillar
  const pillarH = spiralH + 20;
  ctx.fillStyle = `rgba(${Math.round(br*0.4)},${Math.round(bg*0.4)},${Math.round(bb*0.4)},0.9)`;
  ctx.fillRect(sx - 6, sy - spiralH + 20, 12, pillarH);
  ctx.fillStyle = `rgba(${Math.round(br*0.7)},${Math.round(bg*0.7)},${Math.round(bb*0.7)},0.5)`;
  ctx.fillRect(sx - 3, sy - spiralH + 20, 6, pillarH);
  ctx.fillStyle = `rgba(${gr},${gg},${gb},0.3)`;
  ctx.fillRect(sx - 1, sy - spiralH + 20, 2, pillarH);

  // Spiral steps
  for (let i = 0; i < steps; i++) {
    const stepProgress = i / steps;
    if (stepProgress > ease) continue;

    const a = stepProgress * Math.PI * 4 + t * 0.8;
    const yOff = -stepProgress * spiralH;
    const stepX = sx + Math.cos(a) * spiralR;
    const stepY = sy + yOff + Math.sin(a) * spiralR * 0.35 + 20;
    const depth = (Math.sin(a) + 1) / 2;

    // Shadow
    ctx.fillStyle = `rgba(${Math.round(br*0.15)},${Math.round(bg*0.15)},${Math.round(bb*0.15)},${0.3 * depth})`;
    ctx.beginPath();
    ctx.ellipse(stepX, stepY + 3, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Surface
    const sr = Math.round(br * 0.5 + depth * br * 0.5);
    const sg2 = Math.round(bg * 0.5 + depth * bg * 0.5);
    const sb = Math.round(bb * 0.5 + depth * bb * 0.5);
    ctx.fillStyle = `rgba(${sr},${sg2},${sb},${0.8 + depth * 0.2})`;
    ctx.beginPath();
    ctx.ellipse(stepX, stepY, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Edge
    ctx.strokeStyle = `rgba(${gr},${gg},${gb},${0.4 + depth * 0.4})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(stepX, stepY, 20, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Top platform + orb
  if (ease > 0.8) {
    const topY = sy - spiralH + 16;
    const platAlpha = (ease - 0.8) / 0.2;
    ctx.fillStyle = `rgba(${Math.round(br*0.5)},${Math.round(bg*0.5)},${Math.round(bb*0.5)},${0.9 * platAlpha})`;
    ctx.beginPath();
    ctx.ellipse(sx, topY, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${gr},${gg},${gb},${0.7 * platAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(sx, topY, 28, 10, 0, 0, Math.PI * 2);
    ctx.stroke();

    const orbGlow = 0.7 + Math.sin(t * 3) * 0.3;
    ctx.fillStyle = `rgba(${br},${bg},${bb},${orbGlow * platAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, topY - 16, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${gr},${gg},${gb},${orbGlow * 0.8 * platAlpha})`;
    ctx.beginPath();
    ctx.arc(sx, topY - 16, 6, 0, Math.PI * 2);
    ctx.fill();

    for (let r = 0; r < 4; r++) {
      const ra = t * 1.5 + r * Math.PI / 2;
      const rx = sx + Math.cos(ra) * 20;
      const ry = topY - 16 + Math.sin(ra) * 8;
      ctx.strokeStyle = `rgba(${gr},${gg},${gb},${0.2 * platAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, topY - 16);
      ctx.lineTo(rx, ry);
      ctx.stroke();
    }
  }

  // Floating particles
  for (let p = 0; p < 10; p++) {
    const pa = t * 0.8 + p * 0.63;
    const pr = 50 + Math.sin(pa * 0.5) * 20;
    const ppx = sx + Math.cos(pa) * pr * ease;
    const ppy = sy + 20 - ((pa * 30) % (spiralH + 40));
    const pAlpha = (0.3 + Math.sin(pa * 2) * 0.2) * ease;
    ctx.fillStyle = `rgba(${gr},${gg},${gb},${pAlpha})`;
    ctx.beginPath();
    ctx.arc(ppx, ppy, 2 + Math.sin(pa) * 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Ground dust during rise
  if (ease < 0.9) {
    for (let d = 0; d < 8; d++) {
      const da = d * Math.PI / 4 + t * 2;
      const dr = TILE * 2.5 * ease + Math.sin(da * 3) * 10;
      const dx = sx + Math.cos(da) * dr;
      const dy = sy + 25 + Math.sin(da * 2) * 5;
      ctx.fillStyle = `rgba(${Math.round(br*0.6)},${Math.round(bg*0.6)},${Math.round(bb*0.6)},${0.3 * (1 - ease)})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 4 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();

  // Interaction prompt
  const plx = player.x / TILE, ply = player.y / TILE;
  const ctrX = level.widthTiles / 2, ctrY = level.heightTiles / 2;
  const dist = Math.sqrt((plx - ctrX) ** 2 + (ply - ctrY) ** 2);
  if (dist < 6 && ease > 0.5) {
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = `rgba(${gr},${gg},${gb},${glow})`;
    ctx.textAlign = "center";
    if (dungeonComplete) {
      ctx.fillText("★ EXIT DUNGEON ★", sx, sy + 55);
      ctx.font = "11px monospace";
      ctx.fillStyle = "#ffd700";
      ctx.fillText("Press " + getKeyDisplayName(keybinds.interact) + " to leave", sx, sy + 70);
    } else {
      ctx.fillText("▲ FLOOR " + (dungeonFloor + 1), sx, sy + 55);
      ctx.font = "11px monospace";
      ctx.fillStyle = "#aaa";
      ctx.fillText("Press " + getKeyDisplayName(keybinds.interact) + " to ascend", sx, sy + 70);
    }
    ctx.textAlign = "left";
  }
}

function drawChestIcon(cx2, cy2, type, size) {
  const s = size || 20;
  if (type === 'armor') {
    // Shield shape
    ctx.fillStyle = '#5a7a6a';
    ctx.beginPath();
    ctx.moveTo(cx2, cy2 - s);
    ctx.lineTo(cx2 + s * 0.8, cy2 - s * 0.5);
    ctx.lineTo(cx2 + s * 0.7, cy2 + s * 0.4);
    ctx.lineTo(cx2, cy2 + s * 0.8);
    ctx.lineTo(cx2 - s * 0.7, cy2 + s * 0.4);
    ctx.lineTo(cx2 - s * 0.8, cy2 - s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a9a8a';
    ctx.beginPath(); ctx.arc(cx2, cy2 - s * 0.1, s * 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'gun') {
    // Gun shape
    ctx.fillStyle = '#6a6a7a';
    ctx.fillRect(cx2 - s * 0.7, cy2 - s * 0.15, s * 1.2, s * 0.3);
    ctx.fillRect(cx2 - s * 0.2, cy2 + s * 0.1, s * 0.25, s * 0.5);
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(cx2 - s * 0.6, cy2 - s * 0.1, s * 0.9, s * 0.15);
    ctx.fillStyle = '#555';
    ctx.beginPath(); ctx.arc(cx2 + s * 0.5, cy2, s * 0.12, 0, Math.PI * 2); ctx.fill();
  } else {
    // Blade shape
    ctx.fillStyle = '#8a8a9a';
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.5);
    ctx.fillRect(-s * 0.08, -s * 0.9, s * 0.16, s * 1.2);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(-s * 0.2, s * 0.2, s * 0.4, s * 0.15);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(-s * 0.12, s * 0.3, s * 0.24, s * 0.4);
    ctx.restore();
  }
}

function drawEquipItem(cx2, cy2, item, size) {
  const s = size || 14;
  if (!item) return;
  if (item.id === 'cloth_vest') {
    ctx.fillStyle = '#8a7a60';
    ctx.beginPath(); ctx.moveTo(cx2, cy2 - s); ctx.lineTo(cx2 + s, cy2 - s * 0.3);
    ctx.lineTo(cx2 + s * 0.7, cy2 + s); ctx.lineTo(cx2 - s * 0.7, cy2 + s);
    ctx.lineTo(cx2 - s, cy2 - s * 0.3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6a5a40'; ctx.lineWidth = 1; ctx.stroke();
  } else if (item.id === 'kevlar_vest') {
    ctx.fillStyle = '#4a6a5a';
    ctx.beginPath(); ctx.moveTo(cx2, cy2 - s); ctx.lineTo(cx2 + s, cy2 - s * 0.3);
    ctx.lineTo(cx2 + s * 0.8, cy2 + s); ctx.lineTo(cx2 - s * 0.8, cy2 + s);
    ctx.lineTo(cx2 - s, cy2 - s * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a5a4a';
    ctx.fillRect(cx2 - s * 0.5, cy2 - s * 0.2, s, s * 0.3);
    ctx.strokeStyle = '#2a4a3a'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if (item.id === 'heavy_armor') {
    ctx.fillStyle = '#3a4a6a';
    ctx.beginPath(); ctx.moveTo(cx2, cy2 - s * 1.1); ctx.lineTo(cx2 + s * 1.1, cy2 - s * 0.3);
    ctx.lineTo(cx2 + s, cy2 + s); ctx.lineTo(cx2 - s, cy2 + s);
    ctx.lineTo(cx2 - s * 1.1, cy2 - s * 0.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a5a7a'; ctx.fillRect(cx2 - s * 0.3, cy2 - s * 0.6, s * 0.6, s * 0.4);
    ctx.fillStyle = '#5a6a8a'; ctx.beginPath(); ctx.arc(cx2, cy2 - s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a3a5a'; ctx.lineWidth = 2; ctx.stroke();
  } else if (item.id === 'smg') {
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(cx2 - s, cy2 - s * 0.2, s * 1.6, s * 0.35);
    ctx.fillRect(cx2 - s * 0.1, cy2 + s * 0.1, s * 0.2, s * 0.5);
    ctx.fillStyle = '#999'; ctx.fillRect(cx2 - s * 0.8, cy2 - s * 0.12, s * 1.2, s * 0.15);
  } else if (item.id === 'carbine') {
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(cx2 - s * 1.2, cy2 - s * 0.2, s * 2, s * 0.35);
    ctx.fillRect(cx2 - s * 0.1, cy2 + s * 0.1, s * 0.25, s * 0.5);
    ctx.fillStyle = '#4a5a6a';
    ctx.fillRect(cx2 + s * 0.3, cy2 - s * 0.35, s * 0.5, s * 0.5);
    ctx.fillStyle = '#6a7a8a'; ctx.fillRect(cx2 - s, cy2 - s * 0.12, s * 1.6, s * 0.12);
  } else if (item.id === 'assault_rifle') {
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(cx2 - s * 1.3, cy2 - s * 0.25, s * 2.3, s * 0.4);
    ctx.fillRect(cx2 - s * 0.1, cy2 + s * 0.1, s * 0.25, s * 0.55);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(cx2 + s * 0.4, cy2 - s * 0.45, s * 0.6, s * 0.6);
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(cx2 - s * 1.1, cy2 - s * 0.15, s * 1.8, s * 0.12);
    ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(cx2 + s, cy2, s * 0.1, 0, Math.PI * 2); ctx.fill();
  } else if (item.id === 'dagger') {
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.4);
    ctx.fillStyle = '#bbb'; ctx.fillRect(-s * 0.06, -s * 0.9, s * 0.12, s * 0.8);
    ctx.fillStyle = '#888'; ctx.fillRect(-s * 0.15, -s * 0.1, s * 0.3, s * 0.08);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(-s * 0.08, 0, s * 0.16, s * 0.4);
    ctx.restore();
  } else if (item.id === 'mace') {
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.3);
    ctx.fillStyle = '#5a4a30'; ctx.fillRect(-s * 0.07, -s * 0.3, s * 0.14, s * 1.1);
    ctx.fillStyle = '#6a5a3a'; ctx.beginPath(); ctx.arc(0, -s * 0.5, s * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#888'; for (let sp = 0; sp < 4; sp++) {
      const a2 = sp * Math.PI / 2;
      ctx.beginPath(); ctx.arc(Math.cos(a2) * s * 0.35, -s * 0.5 + Math.sin(a2) * s * 0.35, s * 0.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  } else if (item.id === 'karambit') {
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.3);
    ctx.fillStyle = '#cc3344';
    ctx.beginPath(); ctx.moveTo(0, -s * 0.8); ctx.quadraticCurveTo(s * 0.6, -s * 0.2, s * 0.3, s * 0.3);
    ctx.lineTo(-s * 0.1, s * 0.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(0, s * 0.4, s * 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(0, s * 0.4, s * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (item.id === 'pickaxe') {
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.3);
    // Handle — long brown wooden shaft
    ctx.fillStyle = '#8a6040';
    ctx.fillRect(-s * 0.06, -s * 0.15, s * 0.12, s * 1.05);
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(s * 0.02, -s * 0.15, s * 0.04, s * 1.05);
    // Handle grip wraps
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(-s * 0.08, s * 0.5, s * 0.16, s * 0.1);
    ctx.fillRect(-s * 0.08, s * 0.7, s * 0.16, s * 0.1);
    // Head mounting block
    ctx.fillStyle = '#5a5a68';
    ctx.fillRect(-s * 0.08, -s * 0.3, s * 0.16, s * 0.2);
    // Left curved arm of crescent head
    ctx.fillStyle = '#a0aab8';
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, -s * 0.25);
    ctx.lineTo(-s * 0.2, -s * 0.4);
    ctx.lineTo(-s * 0.4, -s * 0.5);
    ctx.lineTo(-s * 0.6, -s * 0.4);
    ctx.lineTo(-s * 0.7, -s * 0.2);  // tip droops
    ctx.lineTo(-s * 0.6, -s * 0.15);
    ctx.lineTo(-s * 0.4, -s * 0.3);
    ctx.lineTo(-s * 0.2, -s * 0.25);
    ctx.lineTo(-s * 0.08, -s * 0.15);
    ctx.closePath(); ctx.fill();
    // Right curved arm
    ctx.beginPath();
    ctx.moveTo(s * 0.08, -s * 0.25);
    ctx.lineTo(s * 0.2, -s * 0.4);
    ctx.lineTo(s * 0.4, -s * 0.5);
    ctx.lineTo(s * 0.6, -s * 0.4);
    ctx.lineTo(s * 0.7, -s * 0.2);
    ctx.lineTo(s * 0.6, -s * 0.15);
    ctx.lineTo(s * 0.4, -s * 0.3);
    ctx.lineTo(s * 0.2, -s * 0.25);
    ctx.lineTo(s * 0.08, -s * 0.15);
    ctx.closePath(); ctx.fill();
    // Highlight on upper edge
    ctx.fillStyle = '#b8bcc8';
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, -s * 0.38);
    ctx.lineTo(-s * 0.4, -s * 0.5);
    ctx.lineTo(-s * 0.55, -s * 0.43);
    ctx.lineTo(-s * 0.4, -s * 0.42);
    ctx.lineTo(-s * 0.15, -s * 0.33);
    ctx.closePath(); ctx.fill();
    // Shadow on lower edge
    ctx.fillStyle = '#6a7080';
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.2);
    ctx.lineTo(-s * 0.7, -s * 0.2);
    ctx.lineTo(-s * 0.6, -s * 0.25);
    ctx.lineTo(-s * 0.4, -s * 0.3);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (item.id && item.id.endsWith('_hoe')) {
    ctx.save(); ctx.translate(cx2, cy2); ctx.rotate(-0.3);
    // Handle — brown wooden shaft
    ctx.fillStyle = '#8a6040';
    ctx.fillRect(-s * 0.06, -s * 0.15, s * 0.12, s * 1.05);
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(s * 0.02, -s * 0.15, s * 0.04, s * 1.05);
    // Grip wraps
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(-s * 0.08, s * 0.5, s * 0.16, s * 0.1);
    ctx.fillRect(-s * 0.08, s * 0.7, s * 0.16, s * 0.1);
    // Flat hoe blade at top (perpendicular to shaft)
    ctx.fillStyle = item.color || '#a0aab8';
    ctx.fillRect(-s * 0.5, -s * 0.4, s * 1.0, s * 0.22);
    // Blade highlight
    ctx.fillStyle = '#b8bcc8';
    ctx.fillRect(-s * 0.45, -s * 0.4, s * 0.9, s * 0.06);
    // Blade shadow
    ctx.fillStyle = '#6a7080';
    ctx.fillRect(-s * 0.45, -s * 0.22, s * 0.9, s * 0.04);
    ctx.restore();
  }
}

function drawShopPanel() {
  if (!UI.isOpen('shop')) return;

  const items = getShopItems();
  const cols = 3;
  const itemW = 220, itemH = 140, gap = 14;
  const rows = Math.ceil(items.length / cols);
  const gridW = cols * (itemW + gap) - gap;
  const gridH = rows * (itemH + gap) - gap;
  const pw = gridW + 80, ph = Math.max(350, gridH + 160);
  const px = BASE_W/2 - pw/2, py = BASE_H/2 - ph/2;

  // Dimmed backdrop
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = "#0c1018";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.fill();
  ctx.strokeStyle = "rgba(100,220,160,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 16); ctx.stroke();

  // Header bar
  ctx.fillStyle = "rgba(30,60,45,0.5)";
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, 50, [14,14,0,0]); ctx.fill();
  ctx.font = "bold 22px monospace";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText("⚒  UPGRADE STATION", px + pw/2, py + 34);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 46, py + 8, 36, 36, 8); ctx.fill();
  ctx.font = "bold 22px monospace"; ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.fillText("✕", px + pw - 28, py + 32);

  // Gold display
  ctx.font = "bold 16px monospace";
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = "left";
  ctx.fillText("🪙 " + gold + "g", px + 20, py + 34);

  // Category tabs
  const tabY = py + 58;
  const tabH = 30;
  const tabW = (pw - 40) / SHOP_CATEGORIES.length;
  for (let i = 0; i < SHOP_CATEGORIES.length; i++) {
    const tx = px + 20 + i * tabW;
    const active = i === shopCategory;
    ctx.fillStyle = active ? "rgba(80,200,120,0.2)" : "rgba(20,20,30,0.6)";
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW - 6, tabH, 6); ctx.fill();
    if (active) {
      ctx.strokeStyle = PALETTE.accent; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(tx, tabY, tabW - 6, tabH, 6); ctx.stroke();
    }
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = active ? PALETTE.accent : "#666";
    ctx.textAlign = "center";
    ctx.fillText(SHOP_CATEGORIES[i], tx + (tabW - 6)/2, tabY + 20);
  }

  // Items grid
  const gridX = px + (pw - gridW) / 2;
  const gridY = tabY + tabH + 16;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ix = gridX + col * (itemW + gap);
    const iy = gridY + row * (itemH + gap);

    const isEquip = item.tier !== undefined;
    const isOwned = isEquip && item.isOwned;
    const isMaxed = item.maxBuy !== undefined && item.bought >= item.maxBuy;
    const isLocked = item.isLocked;
    const canAfford = !isOwned && !isMaxed && !isLocked && gold >= item.cost;

    // Card bg
    if (isLocked) {
      ctx.fillStyle = "#0a0a0e";
    } else if (isOwned || isMaxed) {
      ctx.fillStyle = "#0a1a14";
    } else if (isEquip) {
      const tierBg = ['', '#14201a', '#141824', '#201814', '#1a1420', '#181420', '#201a14'][item.tier] || '#141a1e';
      ctx.fillStyle = canAfford ? tierBg : '#121214';
    } else {
      ctx.fillStyle = canAfford ? "#141e1a" : "#121214";
    }
    ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 12); ctx.fill();

    // Border
    const tierColors = ['', '#66bb66', '#4499dd', '#dd9944', '#dd44dd', '#44dddd', '#ffaa22'];
    if (isLocked) {
      ctx.strokeStyle = "rgba(60,30,30,0.4)";
      ctx.lineWidth = 1.5;
    } else if (isOwned || isMaxed) {
      ctx.strokeStyle = PALETTE.accent;
      ctx.lineWidth = 2;
    } else if (isEquip) {
      ctx.strokeStyle = canAfford ? ((tierColors[item.tier] || '#888') + '88') : "rgba(60,60,60,0.3)";
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = canAfford ? "rgba(100,220,160,0.25)" : "rgba(60,60,60,0.3)";
      ctx.lineWidth = 1.5;
    }
    ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 12); ctx.stroke();

    // Tier badge
    if (isEquip) {
      ctx.fillStyle = isLocked ? '#444' : (tierColors[item.tier] || '#888');
      ctx.beginPath(); ctx.roundRect(ix + 8, iy + 8, 28, 18, 4); ctx.fill();
      ctx.font = "bold 11px monospace"; ctx.fillStyle = isLocked ? "#888" : "#fff";
      ctx.textAlign = "center";
      ctx.fillText("T" + item.tier, ix + 22, iy + 21);
    }

    // Item name
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = isLocked ? "#3a3a3a" : isOwned ? PALETTE.accent : canAfford ? "#eee" : "#555";
    ctx.textAlign = "center";
    ctx.fillText(item.name, ix + itemW/2, iy + 46);

    // Description
    ctx.font = "13px monospace";
    ctx.fillStyle = isLocked ? "#2a2a2a" : isOwned ? "#4a8a6a" : canAfford ? "#8a9a90" : "#444";
    ctx.fillText(item.desc, ix + itemW/2, iy + 68);

    // Owned badge, locked, or cost + buy button
    if (isOwned) {
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText("✓ EQUIPPED", ix + itemW/2, iy + itemH - 22);
    } else if (isMaxed) {
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = PALETTE.accent;
      ctx.fillText("✓ MAXED", ix + itemW/2, iy + itemH - 22);
    } else if (isLocked) {
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "#663333";
      if (isLocked === 'wave') {
        ctx.fillText("🔒 Wave " + item.equipData.waveReq + " required", ix + itemW/2, iy + 94);
      } else if (isLocked === 'prev') {
        ctx.fillText("🔒 Buy previous tier first", ix + itemW/2, iy + 94);
      } else {
        ctx.fillText("🔒 LOCKED", ix + itemW/2, iy + 94);
      }
    } else {
      // Cost
      ctx.font = "bold 16px monospace";
      ctx.fillStyle = canAfford ? PALETTE.gold : "#663322";
      ctx.fillText(item.cost + "g", ix + itemW/2, iy + 94);

      // Buy button
      if (canAfford) {
        const btnW = 110, btnH = 28;
        const btnX = ix + (itemW - btnW) / 2, btnY = iy + itemH - 38;
        ctx.fillStyle = isEquip ? "rgba(100,180,220,0.15)" : "rgba(100,220,160,0.15)";
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
        ctx.strokeStyle = isEquip ? "rgba(100,180,220,0.3)" : "rgba(100,220,160,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.stroke();
        ctx.font = "bold 13px monospace";
        ctx.fillStyle = isEquip ? "#6ab8e0" : PALETTE.accent;
        ctx.fillText("✓ BUY", ix + itemW/2, btnY + 19);
      }
    }
  }

  // Equipment status at bottom
  ctx.font = "13px monospace"; ctx.fillStyle = "#556";
  ctx.textAlign = "center";
  const eqText = "🔫 " + (playerEquip.gun ? playerEquip.gun.name : 'Base Gun') +
                 "  🗡 " + (playerEquip.melee ? playerEquip.melee.name : 'Fists');
  ctx.fillText(eqText, px + pw/2, py + ph - 14);

  ctx.textAlign = "left";
}
