// ===================== FINE DINING TRICK GAME =====================
// Table trick event: 25% chance when a party starts waiting_cook.
// Gold "!" appears above table, 30s timer. Player interacts with grill to start mini-game.
// Mini-game: 3 slim bars with moving cursor, player hits action to stop each.
// More hits = higher tip bonus. Restaurant time freezes during mini-game.

// ===================== TRICK REQUEST STATE =====================
// Stored on FD_TABLES[i]: _trickRequested, _trickTimer, _trickDone, _trickHits, _noTip

const TRICK_GAME_CONFIG = {
  requestChance: 0.25,     // 25% chance per table
  timerDuration: 1800,     // 30 seconds at 60fps
  barCount: 3,
  cursorSpeed: 0.025,      // speed of cursor (0→1 per frame fraction)
  targetSize: 0.15,        // target zone size (15% of bar)
  tipMultipliers: [0, 1.0, 1.5, 2.0], // 0 hits=no tip, 1=1x, 2=1.5x, 3=2x
};

// ===================== MINI-GAME STATE =====================
let trickGameState = {
  active: false,
  tableId: -1,
  currentBar: 0,     // which bar is being played (0-2)
  bars: [],           // { cursor, speed, targetStart, targetEnd, hit: null, direction }
  hitCount: 0,
  popup: null,        // { text, color, timer }
  resultTimer: 0,     // pause after all 3 bars resolved
  phase: 'playing',   // 'playing' | 'result'
};

// ===================== START TRICK GAME =====================
function startTrickGame(tableId) {
  const table = typeof FD_TABLES !== 'undefined' ? FD_TABLES[tableId] : null;
  if (!table) return;

  trickGameState.active = true;
  trickGameState.tableId = tableId;
  trickGameState.currentBar = 0;
  trickGameState.hitCount = 0;
  trickGameState.popup = null;
  trickGameState.resultTimer = 0;
  trickGameState.phase = 'playing';

  // Generate 3 bars with random target positions and speeds
  trickGameState.bars = [];
  for (let i = 0; i < TRICK_GAME_CONFIG.barCount; i++) {
    const targetStart = 0.15 + Math.random() * (0.7 - TRICK_GAME_CONFIG.targetSize);
    trickGameState.bars.push({
      cursor: 0,
      speed: TRICK_GAME_CONFIG.cursorSpeed + i * 0.008 + Math.random() * 0.005, // each bar slightly faster
      targetStart: targetStart,
      targetEnd: targetStart + TRICK_GAME_CONFIG.targetSize,
      hit: null,       // null = not yet, true = hit, false = miss
      direction: 1,    // 1 = moving right, -1 = moving left
    });
  }

  // Freeze restaurant time
  if (typeof cookingState !== 'undefined') {
    cookingState._trickFreeze = true;
  }

  // Clear the trick request on the table
  table._trickRequested = false;
  table._exclamationVisible = false;
}

// ===================== UPDATE TRICK GAME =====================
function updateTrickGame() {
  if (!trickGameState.active) return;

  if (trickGameState.phase === 'result') {
    trickGameState.resultTimer--;
    if (trickGameState.resultTimer <= 0) {
      endTrickGame();
    }
    return;
  }

  // Update popup timer
  if (trickGameState.popup) {
    trickGameState.popup.timer--;
    if (trickGameState.popup.timer <= 0) trickGameState.popup = null;
  }

  // Move cursor on the current active bar
  const barIdx = trickGameState.currentBar;
  if (barIdx < trickGameState.bars.length) {
    const bar = trickGameState.bars[barIdx];
    if (bar.hit === null) {
      bar.cursor += bar.speed * bar.direction;
      // Bounce at edges
      if (bar.cursor >= 1) { bar.cursor = 1; bar.direction = -1; }
      if (bar.cursor <= 0) { bar.cursor = 0; bar.direction = 1; }
    }
  }
}

// ===================== PLAYER INPUT =====================
function trickGameHit() {
  if (!trickGameState.active || trickGameState.phase !== 'playing') return;

  const barIdx = trickGameState.currentBar;
  if (barIdx >= trickGameState.bars.length) return;

  const bar = trickGameState.bars[barIdx];
  if (bar.hit !== null) return; // already resolved

  // Check if cursor is in target zone
  if (bar.cursor >= bar.targetStart && bar.cursor <= bar.targetEnd) {
    bar.hit = true;
    trickGameState.hitCount++;
    trickGameState.popup = { text: 'Hit!', color: '#40ff40', timer: 40 };
  } else {
    bar.hit = false;
    trickGameState.popup = { text: 'Miss!', color: '#ff4040', timer: 40 };
  }

  // Move to next bar or finish
  trickGameState.currentBar++;
  if (trickGameState.currentBar >= trickGameState.bars.length) {
    // All bars resolved — show result
    trickGameState.phase = 'result';
    trickGameState.resultTimer = 90; // 1.5 second pause
    const hits = trickGameState.hitCount;
    if (hits === 3) {
      trickGameState.popup = { text: 'Perfect Trick! 2x Tip!', color: '#ffd700', timer: 90 };
    } else if (hits === 2) {
      trickGameState.popup = { text: 'Great Trick! 1.5x Tip!', color: '#60c060', timer: 90 };
    } else if (hits === 1) {
      trickGameState.popup = { text: 'OK Trick! 1x Tip', color: '#c0c060', timer: 90 };
    } else {
      trickGameState.popup = { text: 'Failed Trick! No Tip', color: '#ff4040', timer: 90 };
    }
  }
}

// ===================== END TRICK GAME =====================
function endTrickGame() {
  const tableId = trickGameState.tableId;
  const table = typeof FD_TABLES !== 'undefined' ? FD_TABLES[tableId] : null;

  if (table) {
    table._trickDone = true;
    table._trickHits = trickGameState.hitCount;
    if (trickGameState.hitCount === 0) {
      table._noTip = true;
    }
  }

  // Apply tip bonus via hit effect
  if (trickGameState.hitCount > 0 && typeof player !== 'undefined' && typeof gold !== 'undefined') {
    const tipMult = TRICK_GAME_CONFIG.tipMultipliers[trickGameState.hitCount] || 1.0;
    const baseTip = 20 + trickGameState.hitCount * 15;
    const bonus = Math.round(baseTip * tipMult);
    gold += bonus;
    if (typeof cookingState !== 'undefined' && cookingState.stats) {
      cookingState.stats.totalEarned = (cookingState.stats.totalEarned || 0) + bonus;
    }
    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({
        x: player.x, y: player.y - 50,
        life: 80, maxLife: 80,
        type: 'heal',
        dmg: '+$' + bonus + ' Trick Tip!',
      });
    }
  }

  // Unfreeze restaurant time
  if (typeof cookingState !== 'undefined') {
    cookingState._trickFreeze = false;
  }

  trickGameState.active = false;
  trickGameState.tableId = -1;
}

// ===================== DRAW TRICK GAME HUD =====================
function drawTrickGameHUD() {
  if (!trickGameState.active) return;
  if (typeof ctx === 'undefined') return;

  const screenW = ctx.canvas.width;
  const screenH = ctx.canvas.height;

  // Panel dimensions
  const panelW = 340;
  const panelH = 200;
  const panelX = (screenW - panelW) / 2;
  const panelY = (screenH - panelH) / 2 - 40;

  // Dark panel background
  ctx.fillStyle = 'rgba(10, 10, 20, 0.92)';
  ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 8); ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 8); ctx.stroke();

  // Title
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('GRILL TRICK!', panelX + panelW / 2, panelY + 24);
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Press SWING to stop each bar', panelX + panelW / 2, panelY + 40);

  // Draw 3 bars
  const barW = 80;
  const barH = 16;
  const barGap = 20;
  const barsStartX = panelX + (panelW - (barW * 3 + barGap * 2)) / 2;
  const barsY = panelY + 60;

  for (let i = 0; i < trickGameState.bars.length; i++) {
    const bar = trickGameState.bars[i];
    const bx = barsStartX + i * (barW + barGap);
    const by = barsY + i * 35;

    // Bar label
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = i === trickGameState.currentBar && trickGameState.phase === 'playing' ? '#fff' : '#888';
    ctx.fillText('Bar ' + (i + 1), bx + barW / 2, by - 4);

    // Bar background
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 3); ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by, barW, barH, 3); ctx.stroke();

    // Target zone (green zone on the bar)
    const tzX = bx + bar.targetStart * barW;
    const tzW = (bar.targetEnd - bar.targetStart) * barW;
    ctx.fillStyle = bar.hit === true ? 'rgba(0,255,0,0.4)' : bar.hit === false ? 'rgba(255,0,0,0.3)' : 'rgba(0,200,0,0.35)';
    ctx.fillRect(tzX, by + 1, tzW, barH - 2);

    // Cursor line (only on active or resolved bar)
    if (bar.hit !== null || i === trickGameState.currentBar) {
      const cx = bx + bar.cursor * barW;
      ctx.strokeStyle = bar.hit === true ? '#40ff40' : bar.hit === false ? '#ff4040' : '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, by - 2);
      ctx.lineTo(cx, by + barH + 2);
      ctx.stroke();
    }

    // Hit/Miss indicator
    if (bar.hit !== null) {
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = bar.hit ? '#40ff40' : '#ff4040';
      ctx.fillText(bar.hit ? '✓' : '✗', bx + barW + 12, by + barH / 2 + 4);
    }
  }

  // Score display
  const scoreY = barsY + trickGameState.bars.length * 35 + 10;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Hits: ' + trickGameState.hitCount + ' / ' + TRICK_GAME_CONFIG.barCount, panelX + panelW / 2, scoreY);

  // Popup text (result message)
  if (trickGameState.popup) {
    const pop = trickGameState.popup;
    const popY = scoreY + 22;
    const scale = 1.0 + Math.max(0, (40 - pop.timer)) * 0.01;
    ctx.save();
    ctx.translate(panelX + panelW / 2, popY);
    ctx.scale(scale, scale);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = pop.color;
    ctx.globalAlpha = Math.min(1, pop.timer / 20);
    ctx.fillText(pop.text, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  ctx.textAlign = 'left';
}

// ===================== TRICK TIMER UPDATE =====================
// Called from updateFineDiningNPCs to count down trick timers on tables
function _updateFDTrickTimers() {
  if (typeof FD_TABLES === 'undefined') return;
  if (typeof cookingState !== 'undefined' && cookingState._trickFreeze) return; // frozen

  for (const table of FD_TABLES) {
    if (table._trickRequested && table._trickTimer > 0) {
      table._trickTimer--;
      if (table._trickTimer <= 0) {
        // Timer expired — no tip for this table
        table._trickRequested = false;
        table._noTip = true;
        table._exclamationVisible = false;
        // Show warning
        if (typeof hitEffects !== 'undefined') {
          const grillX = table.grillTX * TILE + TILE * 1.5;
          const grillY = table.grillTY * TILE + TILE * 1.5;
          hitEffects.push({
            x: grillX, y: grillY - 40,
            life: 60, maxLife: 60,
            type: 'heal',
            dmg: 'Trick expired! No tip',
          });
        }
      }
    }
  }
}

// ===================== REQUEST TRICK (25% chance) =====================
// Called when a table enters waiting_cook state
function _maybeRequestFDTrick(tableId) {
  if (Math.random() >= TRICK_GAME_CONFIG.requestChance) return; // 75% no trick

  const table = typeof FD_TABLES !== 'undefined' ? FD_TABLES[tableId] : null;
  if (!table) return;

  table._trickRequested = true;
  table._trickTimer = TRICK_GAME_CONFIG.timerDuration;
  table._trickDone = false;
  table._trickHits = 0;
  table._noTip = false;
  // Exclamation is already set by order_taking — keep it gold for trick
}

// ===================== CHECK IF PLAYER CAN START TRICK =====================
// Called when player interacts with a grill that has a trick request
function canStartTrickAtTable(tableId) {
  const table = typeof FD_TABLES !== 'undefined' ? FD_TABLES[tableId] : null;
  if (!table) return false;
  return table._trickRequested && !trickGameState.active;
}
