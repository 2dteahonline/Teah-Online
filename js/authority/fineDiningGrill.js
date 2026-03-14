// ============================================================
//  fineDiningGrill.js — Teppanyaki Grill Trick Timing System
//  Authority layer: QTE timing bar for Fine Dining restaurant
//  Loaded AFTER cookingSystem.js and dinerNPCSystem.js
// ============================================================

// ----- Trick Types (cosmetic labels, same mechanic) -----
const FD_TRICK_TYPES = [
  { id: 'spatula_spin',  name: 'Spatula Spin',  color: '#ffd700' },
  { id: 'onion_volcano', name: 'Onion Volcano', color: '#ff6040' },
  { id: 'shrimp_toss',   name: 'Shrimp Toss',   color: '#ff9060' },
  { id: 'egg_crack',     name: 'Egg Crack',     color: '#f0e060' },
  { id: 'flame_burst',   name: 'Flame Burst',   color: '#ff4040' },
  { id: 'rice_flip',     name: 'Rice Flip',     color: '#e0d0a0' },
];

// ----- Config -----
const FD_GRILL_CONFIG = {
  barDuration: [300, 480],  // 5-8 sec (frames@60fps) based on difficulty
  perfectWindow: 0.025,     // +/-2.5% of bar = center of zone
  goodWindow: 0.06,         // +/-6% of bar = anywhere in zone
  trickZoneWidth: 0.08,     // each zone is 8% of bar width
  comboBonus: 0.15,         // +15% per consecutive hit
  maxComboMult: 2.5,
  missComboReset: true,
  finishDelay: 60,          // 1 sec pause after bar ends
};

// ----- Grill State -----
const grillState = {
  active: false,
  tableId: null,
  cursor: 0,             // 0.0 to 1.0 position on bar
  cursorSpeed: 0,         // per-frame advance
  tricks: [],             // [{start, end, type, hit}]
  trickIdx: 0,            // which trick we're currently approaching
  comboCount: 0,
  comboMultiplier: 1.0,
  trickScore: 0,          // final score 0.0-1.0
  phase: 'idle',          // 'idle' | 'active' | 'finishing'
  finishTimer: 0,
  // Hit result tracking
  perfectCount: 0,
  goodCount: 0,
  missCount: 0,
  // Current hit popup
  hitPopup: null,          // { text, color, timer }
};

// ============================================================
//  startGrillSequence(tableId, recipe)
//  Kicks off the timing bar QTE when the player hits a grill
//  with all ingredients collected.
// ============================================================
function startGrillSequence(tableId, recipe) {
  const cfg = FD_GRILL_CONFIG;

  // Determine difficulty-based bar duration
  // difficulty 1 = slow (easier), difficulty 3 = fast (harder)
  const diff = Math.max(1, Math.min(3, recipe.trickDifficulty || 1));
  const t = (diff - 1) / 2; // 0..1
  const barDuration = cfg.barDuration[0] + (cfg.barDuration[1] - cfg.barDuration[0]) * (1 - t);
  // Higher difficulty → shorter duration → faster cursor
  // diff 1 → barDuration = 480 (slow), diff 3 → barDuration = 300 (fast)

  grillState.active = true;
  grillState.phase = 'active';
  grillState.tableId = tableId;
  grillState.cursor = 0;
  grillState.cursorSpeed = 1.0 / barDuration;
  grillState.comboCount = 0;
  grillState.comboMultiplier = 1.0;
  grillState.trickScore = 0;
  grillState.perfectCount = 0;
  grillState.goodCount = 0;
  grillState.missCount = 0;
  grillState.trickIdx = 0;
  grillState.hitPopup = null;
  grillState.finishTimer = 0;

  // Generate trick zones
  const trickCount = Math.max(1, Math.min(6, recipe.trickCount || 3));
  const diffMult = diff === 1 ? 1.0 : diff === 2 ? 0.8 : 0.6;
  const zoneW = cfg.trickZoneWidth * diffMult;

  grillState.tricks = [];
  for (let i = 0; i < trickCount; i++) {
    // Evenly space across 0.1-0.9 range
    const pos = 0.1 + (0.8 * (i + 0.5)) / trickCount;
    const trickType = FD_TRICK_TYPES[Math.floor(Math.random() * FD_TRICK_TYPES.length)];
    grillState.tricks.push({
      start: pos - zoneW / 2,
      end: pos + zoneW / 2,
      type: trickType,
      hit: null,
    });
  }

  // Update linked table state if Fine Dining tables exist
  if (typeof FD_TABLES !== 'undefined' && FD_TABLES[tableId]) {
    FD_TABLES[tableId].state = 'cooking';
  }

  // Update linked NPC states to 'watching_cook'
  _setGrillLinkedNPCState(tableId, 'watching_cook');
}

// ============================================================
//  updateGrill()
//  Called every frame from the cooking update loop.
// ============================================================
function updateGrill() {
  // Tick down hit popup timer regardless of phase
  if (grillState.hitPopup && grillState.hitPopup.timer > 0) {
    grillState.hitPopup.timer--;
    if (grillState.hitPopup.timer <= 0) grillState.hitPopup = null;
  }

  if (!grillState.active) return;

  // --- Finishing phase: wait then reset ---
  if (grillState.phase === 'finishing') {
    grillState.finishTimer--;
    if (grillState.finishTimer <= 0) {
      grillState.active = false;
      grillState.phase = 'idle';

      // Update table state back
      if (typeof FD_TABLES !== 'undefined' && FD_TABLES[grillState.tableId]) {
        FD_TABLES[grillState.tableId].state = 'eating';
      }
      _setGrillLinkedNPCState(grillState.tableId, 'eating');
    }
    return;
  }

  if (grillState.phase !== 'active') return;

  // --- Advance cursor ---
  grillState.cursor += grillState.cursorSpeed;

  // --- Auto-miss: check if cursor passed any unhit trick zone ---
  for (let i = 0; i < grillState.tricks.length; i++) {
    const trick = grillState.tricks[i];
    if (trick.hit !== null) continue;
    if (grillState.cursor > trick.end) {
      // Cursor passed this zone without a hit — auto-miss
      trick.hit = 'miss';
      grillState.missCount++;
      if (FD_GRILL_CONFIG.missComboReset) {
        grillState.comboCount = 0;
        grillState.comboMultiplier = 1.0;
      }
      _showGrillPopup('Miss!', '#e04040');
    }
  }

  // --- Bar complete ---
  if (grillState.cursor >= 1.0) {
    grillState.cursor = 1.0;
    endGrillSequence();
  }
}

// ============================================================
//  _checkTrickHit()
//  Called when the player swings the spatula during an active
//  grill sequence. Checks if the swing lands in a trick zone.
// ============================================================
function _checkTrickHit() {
  if (!grillState.active || grillState.phase !== 'active') return;

  const cfg = FD_GRILL_CONFIG;
  const cur = grillState.cursor;

  // Find the nearest unhit trick zone that the cursor is inside
  let bestTrick = null;
  let bestDist = Infinity;

  for (let i = 0; i < grillState.tricks.length; i++) {
    const trick = grillState.tricks[i];
    if (trick.hit !== null) continue;

    const center = (trick.start + trick.end) / 2;
    const dist = Math.abs(cur - center);

    // Check if cursor is within the zone bounds
    if (cur >= trick.start && cur <= trick.end) {
      if (dist < bestDist) {
        bestDist = dist;
        bestTrick = trick;
      }
    }
  }

  if (bestTrick) {
    // Hit! Determine quality
    if (bestDist <= cfg.perfectWindow) {
      bestTrick.hit = 'perfect';
      grillState.perfectCount++;
      grillState.comboCount++;
      _showGrillPopup('Perfect!', '#ffd700');
    } else {
      bestTrick.hit = 'good';
      grillState.goodCount++;
      grillState.comboCount++;
      _showGrillPopup('Good!', '#60c060');
    }

    // Update combo multiplier
    grillState.comboMultiplier = 1.0 + Math.min(
      grillState.comboCount * cfg.comboBonus,
      cfg.maxComboMult - 1
    );
  } else {
    // Swing outside any zone — miss
    grillState.missCount++;
    if (cfg.missComboReset) {
      grillState.comboCount = 0;
      grillState.comboMultiplier = 1.0;
    }
    _showGrillPopup('Miss!', '#e04040');
  }
}

// ============================================================
//  endGrillSequence()
//  Calculates the final trick score and transitions to the
//  finishing phase.
// ============================================================
function endGrillSequence() {
  const tricks = grillState.tricks;

  // Mark any remaining unhit tricks as misses
  for (let i = 0; i < tricks.length; i++) {
    if (tricks[i].hit === null) {
      tricks[i].hit = 'miss';
      grillState.missCount++;
    }
  }

  // Calculate trick score: perfect=1.0, good=0.6, miss=0
  let totalPoints = 0;
  for (let i = 0; i < tricks.length; i++) {
    if (tricks[i].hit === 'perfect') totalPoints += 1.0;
    else if (tricks[i].hit === 'good') totalPoints += 0.6;
    // miss = 0
  }
  grillState.trickScore = tricks.length > 0 ? totalPoints / tricks.length : 0;

  // Transition to finishing phase
  grillState.phase = 'finishing';
  grillState.finishTimer = FD_GRILL_CONFIG.finishDelay;
}

// ============================================================
//  _showGrillPopup(text, color)
//  Sets the hit popup with fade-out timer.
// ============================================================
function _showGrillPopup(text, color) {
  grillState.hitPopup = { text: text, color: color, timer: 40 };
}

// ============================================================
//  _setGrillLinkedNPCState(tableId, newState)
//  Updates NPC states linked to the given table.
//  Checks both fineDiningNPCs and fineDiningParties globals.
// ============================================================
function _setGrillLinkedNPCState(tableId, newState) {
  // Use the NPC system's notification functions if available
  if (newState === 'watching_cook' && typeof notifyFDTableCookingStarted === 'function') {
    notifyFDTableCookingStarted(tableId);
    return;
  }
  if (newState === 'eating' && typeof notifyFDTableCookingComplete === 'function') {
    notifyFDTableCookingComplete(tableId);
    return;
  }
  // Fallback: directly update NPCs that match this table's party
  if (typeof fineDiningNPCs !== 'undefined' && typeof FD_TABLES !== 'undefined') {
    const table = FD_TABLES[tableId];
    if (!table || table.claimedBy === null) return;
    for (const npc of fineDiningNPCs) {
      if (npc.partyId === table.claimedBy) {
        npc.state = newState;
        if (newState === 'eating') {
          npc.hasFood = true;
          npc.stateTimer = 600;
        }
        npc._idleTime = 0;
      }
    }
  }
}

// ============================================================
//  drawGrillHUD()
//  Renders the teppanyaki grill timing bar HUD.
//  Called from drawCookingHUD when grillState.active is true.
//  Replaces the normal order panel at top-center.
// ============================================================
function drawGrillHUD() {
  if (!grillState.active) return;

  const panelW = 280, panelH = 120;
  const panelX = BASE_W / 2 - panelW / 2;
  const panelY = 76;
  const pad = 10;

  // --- Panel background ---
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.stroke();

  // --- Top line: Title + Combo ---
  const textY = panelY + 16;

  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('TEPPANYAKI GRILL', panelX + pad, textY);

  ctx.textAlign = 'right';
  if (grillState.comboCount > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Combo x' + grillState.comboCount, panelX + panelW - pad, textY);
  } else {
    ctx.fillStyle = '#666';
    ctx.fillText('Combo x0', panelX + panelW - pad, textY);
  }

  // --- Timing bar ---
  const barX = panelX + pad;
  const barY = panelY + 26;
  const barW = panelW - pad * 2;
  const barH = 20;

  // Bar background
  ctx.fillStyle = 'rgba(40,40,40,0.9)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 4);
  ctx.fill();

  // Trick zones
  for (let i = 0; i < grillState.tricks.length; i++) {
    const trick = grillState.tricks[i];
    const zx = barX + trick.start * barW;
    const zw = (trick.end - trick.start) * barW;

    if (trick.hit === 'perfect') {
      // Gold glow fill
      ctx.fillStyle = _hexToRGBA(trick.type.color, 0.5);
      ctx.fillRect(zx, barY, zw, barH);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2;
      ctx.strokeRect(zx, barY, zw, barH);
    } else if (trick.hit === 'good') {
      // Green border fill
      ctx.fillStyle = _hexToRGBA(trick.type.color, 0.5);
      ctx.fillRect(zx, barY, zw, barH);
      ctx.strokeStyle = '#60c060';
      ctx.lineWidth = 2;
      ctx.strokeRect(zx, barY, zw, barH);
    } else if (trick.hit === 'miss') {
      // Red tint + X mark
      ctx.fillStyle = 'rgba(180,30,30,0.4)';
      ctx.fillRect(zx, barY, zw, barH);
      ctx.strokeStyle = '#e04040';
      ctx.lineWidth = 1.5;
      // Draw X
      const cx = zx + zw / 2, cy = barY + barH / 2;
      const xs = Math.min(zw, barH) * 0.3;
      ctx.beginPath();
      ctx.moveTo(cx - xs, cy - xs); ctx.lineTo(cx + xs, cy + xs);
      ctx.moveTo(cx + xs, cy - xs); ctx.lineTo(cx - xs, cy + xs);
      ctx.stroke();
    } else {
      // Unhit — normal colored zone
      ctx.fillStyle = _hexToRGBA(trick.type.color, 0.35);
      ctx.fillRect(zx, barY, zw, barH);
      ctx.strokeStyle = _hexToRGBA(trick.type.color, 0.7);
      ctx.lineWidth = 1;
      ctx.strokeRect(zx, barY, zw, barH);
    }
  }

  // Cursor glow
  const cursorX = barX + grillState.cursor * barW;
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(cursorX - 2, barY, 4, barH);
  // Cursor line
  ctx.fillStyle = '#fff';
  ctx.fillRect(cursorX - 1, barY, 2, barH);

  // --- Current trick name (below bar, if cursor is near a zone) ---
  const trickNameY = barY + barH + 13;
  let nearTrick = _getNearestTrickToGrillCursor();

  if (nearTrick) {
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = nearTrick.type.color;
    ctx.fillText(nearTrick.type.name, panelX + panelW / 2, trickNameY);
  }

  // --- Bottom line: Perfect / Good / Miss counts ---
  const statsY = panelY + panelH - 8;

  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  const statsStr = _buildGrillStatsString();
  const totalW = ctx.measureText(statsStr).width;
  let sx = panelX + panelW / 2 - totalW / 2;

  // Draw each segment with its color
  ctx.textAlign = 'left';

  ctx.fillStyle = '#ffd700';
  const pText = 'Perfect: ' + grillState.perfectCount;
  ctx.fillText(pText, sx, statsY);
  sx += ctx.measureText(pText).width;

  ctx.fillStyle = '#888';
  ctx.fillText('  ', sx, statsY);
  sx += ctx.measureText('  ').width;

  ctx.fillStyle = '#60c060';
  const gText = 'Good: ' + grillState.goodCount;
  ctx.fillText(gText, sx, statsY);
  sx += ctx.measureText(gText).width;

  ctx.fillStyle = '#888';
  ctx.fillText('  ', sx, statsY);
  sx += ctx.measureText('  ').width;

  ctx.fillStyle = '#e04040';
  const mText = 'Miss: ' + grillState.missCount;
  ctx.fillText(mText, sx, statsY);

  // --- Hit popup ---
  _drawGrillHitPopup(panelX, panelY, panelW, barY, barH);

  // Reset text align
  ctx.textAlign = 'left';
}

// ============================================================
//  _drawGrillHitPopup(panelX, panelY, panelW, barY, barH)
//  Renders the floating hit result text (Perfect!/Good!/Miss!)
//  with scale-up and fade-out animation.
// ============================================================
function _drawGrillHitPopup(panelX, panelY, panelW, barY, barH) {
  const popup = grillState.hitPopup;
  if (!popup || popup.timer <= 0) return;

  const cx = panelX + panelW / 2;
  const cy = barY + barH / 2;
  const scale = 1.0 + (40 - popup.timer) * 0.02;
  const alpha = popup.timer / 40;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text shadow
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(popup.text, 1, 1);

  // Main text
  ctx.fillStyle = popup.color;
  ctx.fillText(popup.text, 0, 0);

  ctx.restore();
  // Restore defaults that ctx.save/restore handles, but be explicit
  ctx.globalAlpha = 1.0;
  ctx.textBaseline = 'alphabetic';
}

// ============================================================
//  _getNearestTrickToGrillCursor()
//  Returns the trick zone closest to the cursor (within
//  proximity), or null if none are close.
// ============================================================
function _getNearestTrickToGrillCursor() {
  const cur = grillState.cursor;
  const proximity = 0.08; // look within 8% of bar
  let best = null;
  let bestDist = Infinity;

  for (let i = 0; i < grillState.tricks.length; i++) {
    const trick = grillState.tricks[i];
    if (trick.hit !== null) continue;
    const center = (trick.start + trick.end) / 2;
    const dist = Math.abs(cur - center);
    if (dist < proximity && dist < bestDist) {
      bestDist = dist;
      best = trick;
    }
  }
  return best;
}

// ============================================================
//  _buildGrillStatsString()
//  Builds the combined stats string for measuring total width.
// ============================================================
function _buildGrillStatsString() {
  return 'Perfect: ' + grillState.perfectCount +
    '  Good: ' + grillState.goodCount +
    '  Miss: ' + grillState.missCount;
}

// ============================================================
//  _hexToRGBA(hex, alpha)
//  Converts a hex color string to an rgba() string.
// ============================================================
function _hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ============================================================
//  getGrillTrickScore()
//  Public accessor for the grill trick score, used by
//  gradeOrder() in cookingSystem.js to blend into final grade.
//  Returns the score (0-1) if a grill sequence just completed,
//  or null if no grill data is available.
// ============================================================
function getGrillTrickScore() {
  // Score is valid once we've entered or completed the finishing phase
  if (grillState.phase === 'finishing' || (grillState.phase === 'idle' && grillState.trickScore > 0)) {
    return grillState.trickScore;
  }
  return null;
}

// ============================================================
//  resetGrillState()
//  Full reset — called when ending a cooking shift or leaving
//  the restaurant scene.
// ============================================================
function resetGrillState() {
  grillState.active = false;
  grillState.tableId = null;
  grillState.cursor = 0;
  grillState.cursorSpeed = 0;
  grillState.tricks = [];
  grillState.trickIdx = 0;
  grillState.comboCount = 0;
  grillState.comboMultiplier = 1.0;
  grillState.trickScore = 0;
  grillState.phase = 'idle';
  grillState.finishTimer = 0;
  grillState.perfectCount = 0;
  grillState.goodCount = 0;
  grillState.missCount = 0;
  grillState.hitPopup = null;
}

// ============================================================
//  isGrillActive()
//  Quick check for other systems (input, cookingSystem) to
//  know if the grill QTE is currently running.
// ============================================================
function isGrillActive() {
  return grillState.active && grillState.phase === 'active';
}

// ============================================================
//  getGrillSummary()
//  Returns a summary object for UI/logging after a grill
//  sequence completes.
// ============================================================
function getGrillSummary() {
  return {
    score: grillState.trickScore,
    perfect: grillState.perfectCount,
    good: grillState.goodCount,
    miss: grillState.missCount,
    totalTricks: grillState.tricks.length,
    combo: grillState.comboCount,
    comboMultiplier: grillState.comboMultiplier,
  };
}
