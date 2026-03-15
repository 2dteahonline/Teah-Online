// ═══════════════════════════════════════════════════════════════
//  CASINO UI — Drawing + click handling for all 6 casino games
//  Full animations, polished visuals, responsive layouts
// ═══════════════════════════════════════════════════════════════

const _CASINO_PW = 740, _CASINO_PH = 540;
let _casinoBetInput = 100;
let _casinoBetEditing = false;   // true when typing custom bet
let _casinoBetString = '';       // raw string while editing
let _casinoRL_selectedBet = null;

// ═══════════════════════════════════════════════════════════════
//  COMMON UI HELPERS
// ═══════════════════════════════════════════════════════════════

function _casinoGetPanelXY() {
  return { px: (BASE_W - _CASINO_PW) / 2, py: (BASE_H - _CASINO_PH) / 2 };
}

function _casinoDrawButton(x, y, w, h, label, enabled, highlight) {
  // Stake-style flat buttons
  ctx.fillStyle = !enabled ? '#111822' : highlight ? '#00e701' : '#1a2a3a';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  if (enabled && !highlight) {
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke();
  }
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = !enabled ? '#334' : highlight ? '#000' : '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
}

function _casinoHitBtn(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

function _casinoDrawCard(x, y, card, faceDown, scale) {
  const s = scale || 1;
  const cw = 48 * s, ch = 68 * s;
  ctx.save();
  // Card shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, cw, ch, 4 * s); ctx.fill();
  if (faceDown) {
    ctx.fillStyle = '#1a3388';
    ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4 * s); ctx.fill();
    ctx.strokeStyle = '#2244aa';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4 * s); ctx.stroke();
    // Diamond pattern
    ctx.strokeStyle = '#3355bb';
    ctx.lineWidth = 1;
    const ds = 10 * s;
    for (let dy = ds; dy < ch - ds; dy += ds) {
      for (let dx = ds; dx < cw - ds; dx += ds) {
        ctx.beginPath();
        ctx.moveTo(x + dx, y + dy - 4 * s); ctx.lineTo(x + dx + 4 * s, y + dy);
        ctx.lineTo(x + dx, y + dy + 4 * s); ctx.lineTo(x + dx - 4 * s, y + dy);
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.restore();
    return;
  }
  // White card face
  ctx.fillStyle = '#f8f8f0';
  ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4 * s); ctx.fill();
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4 * s); ctx.stroke();
  // Rank & suit
  const isRed = card.color === 'red';
  ctx.fillStyle = isRed ? '#cc1111' : '#111';
  ctx.font = 'bold ' + (15 * s) + 'px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(card.rank, x + 4 * s, y + 16 * s);
  ctx.font = (18 * s) + 'px serif';
  ctx.fillText(card.suit, x + 4 * s, y + 34 * s);
  // Center suit large
  ctx.font = (28 * s) + 'px serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.suit, x + cw / 2, y + ch / 2 + 8 * s);
  // Bottom-right mirror
  ctx.save();
  ctx.translate(x + cw - 4 * s, y + ch - 6 * s);
  ctx.rotate(Math.PI);
  ctx.font = 'bold ' + (11 * s) + 'px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(card.rank, 0, 0);
  ctx.restore();
  ctx.restore();
}

function _casinoDrawDie(x, y, size, value, rotation) {
  ctx.save();
  const cx = x + size / 2, cy = y + size / 2;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(x + 3, y + 3, size, size, 8); ctx.fill();
  // Rotate if animating
  if (rotation) {
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.translate(-cx, -cy);
  }
  // Die body
  const grad = ctx.createLinearGradient(x, y, x + size, y + size);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(1, '#ddd');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(x, y, size, size, 8); ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, size, size, 8); ctx.stroke();
  ctx.lineWidth = 1;
  // Dots
  ctx.fillStyle = '#222';
  const d = size * 0.24;
  const dotR = size * 0.065;
  const dot = (dx, dy) => { ctx.beginPath(); ctx.arc(dx, dy, dotR, 0, Math.PI * 2); ctx.fill(); };
  if (value === 1) { dot(cx, cy); }
  else if (value === 2) { dot(cx - d, cy - d); dot(cx + d, cy + d); }
  else if (value === 3) { dot(cx - d, cy - d); dot(cx, cy); dot(cx + d, cy + d); }
  else if (value === 4) { dot(cx - d, cy - d); dot(cx + d, cy - d); dot(cx - d, cy + d); dot(cx + d, cy + d); }
  else if (value === 5) { dot(cx - d, cy - d); dot(cx + d, cy - d); dot(cx, cy); dot(cx - d, cy + d); dot(cx + d, cy + d); }
  else if (value === 6) { dot(cx - d, cy - d); dot(cx + d, cy - d); dot(cx - d, cy); dot(cx + d, cy); dot(cx - d, cy + d); dot(cx + d, cy + d); }
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
//  BET CONTROLS
// ═══════════════════════════════════════════════════════════════

function _casinoDrawBetControls(px, py, pw) {
  const by = py + _CASINO_PH - 60;
  // Background strip — Stake dark
  ctx.fillStyle = '#0a1520';
  ctx.fillRect(px + 4, by - 22, (pw || _CASINO_PW) - 8, 62);
  // Gold display
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('\u2B25 ' + gold + 'g', px + 20, by - 6);

  // Bet input field
  const inputX = px + 150, inputY = by - 14, inputW = 120, inputH = 28;
  ctx.fillStyle = _casinoBetEditing ? '#111e2e' : '#0a1520';
  ctx.beginPath(); ctx.roundRect(inputX, inputY, inputW, inputH, 4); ctx.fill();
  ctx.strokeStyle = _casinoBetEditing ? '#00e701' : '#1a2a3a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(inputX, inputY, inputW, inputH, 4); ctx.stroke();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  const displayText = _casinoBetEditing ? (_casinoBetString + (_casinoBetCursorBlink() ? '|' : '')) : _casinoBetInput + 'g';
  ctx.fillText(displayText, inputX + inputW / 2, inputY + 19);
  ctx.font = '11px monospace'; ctx.fillStyle = '#556'; ctx.textAlign = 'left';
  ctx.fillText('Bet:', px + 150 - 30, inputY + 19);

  // - and + buttons
  const decX = inputX + inputW + 6, incX = decX + 32;
  _casinoDrawButton(decX, inputY, 28, inputH, '-', _casinoBetInput > CASINO_CONFIG.BET_MIN, false);
  _casinoDrawButton(incX, inputY, 28, inputH, '+', _casinoBetInput < CASINO_CONFIG.BET_MAX && _casinoBetInput < gold, false);

  // Half / 2x / Max buttons
  const halfX = incX + 36;
  const qBtnW = 38, qBtnGap = 4;
  const qBtns = [
    { label: '½', val: Math.max(CASINO_CONFIG.BET_MIN, Math.floor(_casinoBetInput / 2)) },
    { label: '2x', val: Math.min(CASINO_CONFIG.BET_MAX, Math.min(gold, _casinoBetInput * 2)) },
    { label: 'MAX', val: Math.min(CASINO_CONFIG.BET_MAX, gold) },
  ];
  for (let i = 0; i < qBtns.length; i++) {
    const bx = halfX + i * (qBtnW + qBtnGap);
    ctx.fillStyle = '#111e2e';
    ctx.beginPath(); ctx.roundRect(bx, inputY, qBtnW, inputH, 4); ctx.fill();
    ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, inputY, qBtnW, inputH, 4); ctx.stroke();
    ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#889'; ctx.textAlign = 'center';
    ctx.fillText(qBtns[i].label, bx + qBtnW / 2, inputY + 18);
  }

  // Preset buttons
  const presets = CASINO_CONFIG.BET_PRESETS;
  const btnW = 62, btnH = 24, gap = 4;
  const startX = px + 20;
  const presetY = by + 14;
  for (let i = 0; i < presets.length; i++) {
    const bx = startX + i * (btnW + gap);
    if (bx + btnW > px + (pw || _CASINO_PW) - 16) break;
    const active = _casinoBetInput === presets[i];
    const afford = gold >= presets[i];
    ctx.fillStyle = active ? '#0a2a0a' : '#111e2e';
    ctx.beginPath(); ctx.roundRect(bx, presetY, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = active ? '#00e701' : '#1a2a3a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, presetY, btnW, btnH, 4); ctx.stroke();
    ctx.font = '11px monospace';
    ctx.fillStyle = afford ? (active ? '#00e701' : '#aab') : '#334';
    ctx.textAlign = 'center';
    ctx.fillText(presets[i] >= 1000 ? (presets[i] / 1000) + 'k' : presets[i] + '', bx + btnW / 2, presetY + 16);
  }
  ctx.textAlign = 'left';
}

function _casinoBetCursorBlink() {
  return Math.floor(Date.now() / 500) % 2 === 0;
}

function _casinoCommitBetString() {
  const val = parseInt(_casinoBetString);
  if (!isNaN(val) && val >= CASINO_CONFIG.BET_MIN && val <= CASINO_CONFIG.BET_MAX) {
    _casinoBetInput = val;
  }
  _casinoBetEditing = false;
  _casinoBetString = '';
}

function _casinoHandleBetClick(mx, my, px, py, pw) {
  const by = py + _CASINO_PH - 60;

  // Input field click — start editing
  const inputX = px + 150, inputY = by - 14, inputW = 120, inputH = 28;
  if (_casinoHitBtn(mx, my, inputX, inputY, inputW, inputH)) {
    _casinoBetEditing = true;
    _casinoBetString = _casinoBetInput.toString();
    return true;
  }

  // If editing and clicked outside input, commit
  if (_casinoBetEditing) {
    _casinoCommitBetString();
  }

  // - button
  const decX = inputX + inputW + 6;
  if (_casinoHitBtn(mx, my, decX, inputY, 28, inputH)) {
    _casinoBetInput = Math.max(CASINO_CONFIG.BET_MIN, _casinoBetInput - _casinoBetStep());
    return true;
  }
  // + button
  const incX = decX + 32;
  if (_casinoHitBtn(mx, my, incX, inputY, 28, inputH)) {
    _casinoBetInput = Math.min(CASINO_CONFIG.BET_MAX, Math.min(gold, _casinoBetInput + _casinoBetStep()));
    return true;
  }

  // Half / 2x / Max
  const halfX = incX + 36;
  const qBtnW = 38, qBtnGap = 4;
  if (_casinoHitBtn(mx, my, halfX, inputY, qBtnW, inputH)) {
    _casinoBetInput = Math.max(CASINO_CONFIG.BET_MIN, Math.floor(_casinoBetInput / 2));
    return true;
  }
  if (_casinoHitBtn(mx, my, halfX + qBtnW + qBtnGap, inputY, qBtnW, inputH)) {
    _casinoBetInput = Math.min(CASINO_CONFIG.BET_MAX, Math.min(gold, _casinoBetInput * 2));
    return true;
  }
  if (_casinoHitBtn(mx, my, halfX + (qBtnW + qBtnGap) * 2, inputY, qBtnW, inputH)) {
    _casinoBetInput = Math.min(CASINO_CONFIG.BET_MAX, gold);
    return true;
  }

  // Preset buttons
  const presets = CASINO_CONFIG.BET_PRESETS;
  const btnW = 62, btnH = 24, gap = 4;
  const presetY = by + 14;
  for (let i = 0; i < presets.length; i++) {
    const bx = px + 20 + i * (btnW + gap);
    if (bx + btnW > px + pw - 16) break;
    if (_casinoHitBtn(mx, my, bx, presetY, btnW, btnH)) {
      _casinoBetInput = presets[i];
      return true;
    }
  }
  return false;
}

// Smart step: +/-10 under 100, +/-50 under 500, +/-100 under 1000, etc.
function _casinoBetStep() {
  if (_casinoBetInput < 100) return 10;
  if (_casinoBetInput < 500) return 50;
  if (_casinoBetInput < 1000) return 100;
  if (_casinoBetInput < 5000) return 500;
  return 1000;
}

// ═══════════════════════════════════════════════════════════════
//  RESULT OVERLAY
// ═══════════════════════════════════════════════════════════════

function _casinoDrawResult(px, py, pw, ph) {
  if (!casinoState.result) return false;
  // Only show result for wins — losses silently reset
  if (!casinoState.result.won) return false;
  const elapsed = Date.now() - casinoState.resultTimer;
  const fadeIn = Math.min(1, elapsed / 200);
  const cx = px + pw / 2, cy = py + ph / 2;
  // Semi-transparent backdrop
  ctx.globalAlpha = fadeIn * 0.5;
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 4, py + 48, pw - 8, ph - 56);
  ctx.globalAlpha = fadeIn;
  // Stake-style inline win popup box
  const boxW = 260, boxH = 90;
  const boxX = cx - boxW / 2, boxY = cy - boxH / 2;
  // Green glow border
  ctx.shadowColor = '#00e701';
  ctx.shadowBlur = 25;
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 10); ctx.fill();
  ctx.strokeStyle = '#00e701';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(boxX, boxY, boxW, boxH, 10); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  // Multiplier text
  const r = casinoState.result;
  const mult = casinoState.bet > 0 ? (r.payout / casinoState.bet).toFixed(2) : '0.00';
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText(mult + 'x', cx, cy - 8);
  // Divider line
  ctx.strokeStyle = '#1a3a2a';
  ctx.beginPath(); ctx.moveTo(boxX + 40, cy + 4); ctx.lineTo(boxX + boxW - 40, cy + 4); ctx.stroke();
  // Payout amount
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#00e701';
  ctx.fillText('+' + r.payout + 'g', cx, cy + 30);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  return true;
}

function _casinoHandleResultClick(mx, my, px, py, pw, ph) {
  if (!casinoState.result) return false;
  if (Date.now() - casinoState.resultTimer < 400) return true; // brief delay before accepting clicks
  // Click anywhere on the panel to play again
  casinoResetGame();
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PANEL DRAW
// ═══════════════════════════════════════════════════════════════

function drawCasinoPanel() {
  if (!UI.isOpen('casino') || !casinoState.activeGame) return;
  const { px, py } = _casinoGetPanelXY();
  const pw = _CASINO_PW, ph = _CASINO_PH;
  // Dimmed backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);
  // Panel bg — Stake-style dark navy
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.fill();
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.stroke();
  // Title bar — subtle dark
  ctx.fillStyle = '#0a1520';
  ctx.beginPath(); ctx.roundRect(px + 1, py + 1, pw - 2, 40, [10, 10, 0, 0]); ctx.fill();
  const gameLabel = CASINO_GAMES.find(g => g.id === casinoState.activeGame);
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(gameLabel ? gameLabel.label.toUpperCase() : 'CASINO', px + pw / 2, py + 27);
  // Close button
  ctx.fillStyle = '#1a2535';
  ctx.beginPath(); ctx.roundRect(px + pw - 40, py + 6, 30, 30, 6); ctx.fill();
  ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#556';
  ctx.textAlign = 'center'; ctx.fillText('\u2715', px + pw - 25, py + 26);
  // Auto-reset after loss pause (1.5s to see outcome, then back to betting)
  if (casinoState._lossAutoReset && casinoState.phase === 'result') {
    const elapsed = Date.now() - casinoState.resultTimer;
    if (elapsed >= 1500) {
      casinoState._lossAutoReset = false;
      casinoResetGame();
    }
  }
  // Dispatch
  const g = casinoState.activeGame;
  if (g === 'blackjack') _drawBlackjack(px, py, pw, ph);
  else if (g === 'roulette') _drawRoulette(px, py, pw, ph);
  else if (g === 'headsOrTails') _drawHeadsOrTails(px, py, pw, ph);
  else if (g === 'cases') _drawCases(px, py, pw, ph);
  else if (g === 'mines') _drawMines(px, py, pw, ph);
  else if (g === 'dice') _drawDice(px, py, pw, ph);
  else if (g === 'rps') _drawRPS(px, py, pw, ph);
  else if (g === 'baccarat') _drawBaccarat(px, py, pw, ph);
  else if (g === 'slots') _drawSlots(px, py, pw, ph);
  else if (g === 'keno') _drawKeno(px, py, pw, ph);
  ctx.textAlign = 'left';
  ctx.lineWidth = 1;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN CLICK HANDLER
// ═══════════════════════════════════════════════════════════════

function handleCasinoClick(mx, my) {
  if (!UI.isOpen('casino') || !casinoState.activeGame) return false;
  const { px, py } = _casinoGetPanelXY();
  const pw = _CASINO_PW, ph = _CASINO_PH;
  if (mx < px || mx > px + pw || my < py || my > py + ph) { UI.close(); return true; }
  if (_casinoHitBtn(mx, my, px + pw - 42, py + 8, 32, 32)) { UI.close(); return true; }
  if (_casinoHandleResultClick(mx, my, px, py, pw, ph)) return true;
  // Tap during loss pause → skip to betting immediately
  if (casinoState._lossAutoReset && casinoState.phase === 'result') {
    if (Date.now() - casinoState.resultTimer > 300) {
      casinoState._lossAutoReset = false;
      casinoResetGame();
      return true;
    }
    return true;
  }
  const g = casinoState.activeGame;
  if (g === 'blackjack') return _clickBlackjack(mx, my, px, py, pw, ph);
  if (g === 'roulette') return _clickRoulette(mx, my, px, py, pw, ph);
  if (g === 'headsOrTails') return _clickHeadsOrTails(mx, my, px, py, pw, ph);
  if (g === 'cases') return _clickCases(mx, my, px, py, pw, ph);
  if (g === 'mines') return _clickMines(mx, my, px, py, pw, ph);
  if (g === 'dice') return _clickDice(mx, my, px, py, pw, ph);
  if (g === 'rps') return _clickRPS(mx, my, px, py, pw, ph);
  if (g === 'baccarat') return _clickBaccarat(mx, my, px, py, pw, ph);
  if (g === 'slots') return _clickSlots(mx, my, px, py, pw, ph);
  if (g === 'keno') return _clickKeno(mx, my, px, py, pw, ph);
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  BLACKJACK — animated card dealing
// ═══════════════════════════════════════════════════════════════

function _drawBlackjack(px, py, pw, ph) {
  const bj = casinoState.bj;
  const cx = px + pw / 2;
  // Dark navy background
  ctx.fillStyle = '#0f1923';
  ctx.beginPath(); ctx.roundRect(px + 8, py + 50, pw - 16, ph - 115, 10); ctx.fill();
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px + 8, py + 50, pw - 16, ph - 115, 10); ctx.stroke();

  if (bj.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    _casinoDrawButton(cx - 70, py + ph / 2 - 25, 140, 48, 'DEAL', gold >= _casinoBetInput, true);
    ctx.font = '15px monospace';
    ctx.fillStyle = '#8899aa';
    ctx.textAlign = 'center';
    ctx.fillText('Place your bet and deal', cx, py + 100);
    return;
  }

  // Card slide animation duration
  const _bjSlideDur = 450;
  const now = Date.now();

  // Check if dealing is done (all 4 initial cards fully animated)
  if (bj.phase === 'dealing') {
    const lastCard = bj.dealerHand[1]; // last dealt card
    if (lastCard && lastCard._addedAt && now - lastCard._addedAt > _bjSlideDur) {
      casinoBJ_finishDeal();
    }
  }

  // Check if animating phase callback should fire
  if (bj.phase === 'animating' && bj._animateCallback) {
    // Find the most recently added card across all hands
    let latestAdd = 0;
    for (const c of bj.playerHand) if (c._addedAt > latestAdd) latestAdd = c._addedAt;
    for (const c of bj.dealerHand) if (c._addedAt > latestAdd) latestAdd = c._addedAt;
    if (bj.splitHand) for (const c of bj.splitHand) if (c._addedAt > latestAdd) latestAdd = c._addedAt;
    if (now - latestAdd > _bjSlideDur) {
      const cb = bj._animateCallback;
      bj._animateCallback = null;
      cb();
    }
  }

  const showDealer = bj.phase === 'dealer' || bj.phase === 'result' || bj._dealerTurn;

  // Helper: draw a hand of cards with per-card slide animation
  function _bjDrawHand(hand, baseX, baseY, faceDownIdx) {
    let allDone = true;
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const elapsed = now - (card._addedAt || 0);
      if (elapsed < 0) continue; // card not yet "dealt"
      const slideT = Math.min(1, elapsed / _bjSlideDur);
      if (slideT < 1) allDone = false;
      const eased = _easeOutCubic(slideT);
      const targetX = baseX + i * 56;
      const cardX = cx + (targetX - cx) * eased;

      // Check if this card is being revealed (flip animation)
      let isFaceDown = (i === faceDownIdx);
      if (card._revealAt) {
        const revealElapsed = now - card._revealAt;
        const flipDur = 500;
        if (revealElapsed < flipDur) {
          allDone = false;
          // 3D flip: scale X from 1 → 0 → 1, switch face at midpoint
          const flipT = revealElapsed / flipDur;
          const scaleX = Math.abs(Math.cos(flipT * Math.PI));
          isFaceDown = flipT < 0.5;
          ctx.save();
          ctx.translate(targetX + 24, baseY + 34);
          ctx.scale(scaleX || 0.01, 1);
          ctx.translate(-(targetX + 24), -(baseY + 34));
          ctx.globalAlpha = 1;
          _casinoDrawCard(targetX, baseY, card, isFaceDown);
          ctx.restore();
          continue;
        }
        isFaceDown = false; // fully revealed
      }

      ctx.globalAlpha = Math.min(1, slideT * 1.5);
      _casinoDrawCard(cardX, baseY, card, isFaceDown);
      ctx.globalAlpha = 1;
    }
    return allDone;
  }

  // Dealer hand
  const dealerBaseX = cx - (bj.dealerHand.length * 56) / 2;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#bdb';
  ctx.textAlign = 'center';
  ctx.fillText('DEALER', cx, py + 68);
  const dealerDone = _bjDrawHand(bj.dealerHand, dealerBaseX, py + 78, showDealer ? -1 : 1);
  if (showDealer && bj.dealerHand.length > 0 && dealerDone) {
    const totalX = dealerBaseX + bj.dealerHand.length * 56 + 12;
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = _bjIsBust(bj.dealerHand) ? '#ff5555' : '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(_bjHandValue(bj.dealerHand).toString(), totalX, py + 120);
  }

  // Player hand
  const playerBaseX = cx - (bj.playerHand.length * 56) / 2;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#bdb';
  ctx.textAlign = 'center';
  const pLabel = bj.splitHand ? (bj.playingSplit ? 'HAND 1' : 'HAND 1 \u25B8') : 'PLAYER';
  ctx.fillText(pLabel, cx, py + 210);
  const playerDone = _bjDrawHand(bj.playerHand, playerBaseX, py + 220, -1);
  if (bj.playerHand.length > 0 && playerDone) {
    const totalX = playerBaseX + bj.playerHand.length * 56 + 12;
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = _bjIsBust(bj.playerHand) ? '#ff5555' : '#5fca80';
    ctx.textAlign = 'left';
    ctx.fillText(_bjHandValue(bj.playerHand).toString(), totalX, py + 260);
  }

  // Split hand
  if (bj.splitHand) {
    const splitBaseX = cx - (bj.splitHand.length * 56) / 2;
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#bdb';
    ctx.textAlign = 'center';
    ctx.fillText(bj.playingSplit ? 'HAND 2 \u25B8' : 'HAND 2', cx, py + 320);
    const splitDone = _bjDrawHand(bj.splitHand, splitBaseX, py + 330, -1);
    if (splitDone) {
      const stx = splitBaseX + bj.splitHand.length * 56 + 12;
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = _bjIsBust(bj.splitHand) ? '#ff5555' : '#5fca80';
      ctx.textAlign = 'left';
      ctx.fillText(_bjHandValue(bj.splitHand).toString(), stx, py + 370);
    }
  }

  // Bet display
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 24, py + 68);

  // Insurance prompt
  if (bj.phase === 'insurance') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(cx - 180, py + ph / 2 - 60, 360, 100, 10); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 180, py + ph / 2 - 60, 360, 100, 10); ctx.stroke();
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
    ctx.fillText('Dealer shows Ace — Insurance?', cx, py + ph / 2 - 30);
    const insCost = Math.floor(casinoState.bet / 2);
    ctx.font = '13px monospace'; ctx.fillStyle = '#ccc';
    ctx.fillText('Costs ' + insCost + 'g (half your bet). Pays 2:1 if dealer has BJ.', cx, py + ph / 2 - 8);
    _casinoDrawButton(cx - 130, py + ph / 2 + 10, 120, 36, 'INSURE', gold >= insCost, true);
    _casinoDrawButton(cx + 10, py + ph / 2 + 10, 120, 36, 'NO THANKS', true, false);
  }

  // Action buttons
  if (bj.phase === 'player') {
    const btnY = py + ph - 62;
    const btnW = 110;
    const btns = [
      { label: 'HIT', x: cx - btnW * 2 - 12, enabled: true },
      { label: 'STAND', x: cx - btnW - 4, enabled: true },
      { label: 'DOUBLE', x: cx + 4, enabled: casinoBJ_canDouble() },
      { label: 'SPLIT', x: cx + btnW + 12, enabled: casinoBJ_canSplit() },
    ];
    for (const b of btns) _casinoDrawButton(b.x, btnY, btnW, 38, b.label, b.enabled, false);
  }
  _casinoDrawResult(px, py, pw, ph);
}

function _easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function _clickBlackjack(mx, my, px, py, pw, ph) {
  const bj = casinoState.bj;
  const cx = px + pw / 2;
  if (bj.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    if (_casinoHitBtn(mx, my, cx - 70, py + ph / 2 - 25, 140, 48) && gold >= _casinoBetInput) {
      if (casinoPlaceBet(_casinoBetInput)) casinoBJ_deal();
      return true;
    }
    return true;
  }
  if (bj.phase === 'insurance') {
    const insCost = Math.floor(casinoState.bet / 2);
    if (_casinoHitBtn(mx, my, cx - 130, py + ph / 2 + 10, 120, 36) && gold >= insCost) { casinoBJ_takeInsurance(); return true; }
    if (_casinoHitBtn(mx, my, cx + 10, py + ph / 2 + 10, 120, 36)) { casinoBJ_declineInsurance(); return true; }
    return true;
  }
  if (bj.phase === 'player') {
    const btnY = py + ph - 62;
    const btnW = 110;
    if (_casinoHitBtn(mx, my, cx - btnW * 2 - 12, btnY, btnW, 38)) { casinoBJ_hit(); return true; }
    if (_casinoHitBtn(mx, my, cx - btnW - 4, btnY, btnW, 38)) { casinoBJ_stand(); return true; }
    if (_casinoHitBtn(mx, my, cx + 4, btnY, btnW, 38) && casinoBJ_canDouble()) { casinoBJ_double(); return true; }
    if (_casinoHitBtn(mx, my, cx + btnW + 12, btnY, btnW, 38) && casinoBJ_canSplit()) { casinoBJ_split(); return true; }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  ROULETTE — spinning wheel animation
// ═══════════════════════════════════════════════════════════════

function _drawRouletteWheel(cx, cy, radius, angle, resultNum) {
  const order = ROULETTE_WHEEL_ORDER;
  const segAngle = (Math.PI * 2) / order.length;
  ctx.save();
  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
  ctx.fillStyle = '#3a2a10';
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Segments
  for (let i = 0; i < order.length; i++) {
    const n = order[i];
    const startA = angle + i * segAngle;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startA, startA + segAngle);
    ctx.closePath();
    ctx.fillStyle = ROULETTE_REDS.has(n) ? '#aa1111' : n === 0 ? '#007700' : '#111';
    ctx.fill();
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    // Number label
    const midA = startA + segAngle / 2;
    const tx = cx + Math.cos(midA) * (radius * 0.72);
    const ty = cy + Math.sin(midA) * (radius * 0.72);
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midA + Math.PI / 2);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(n.toString(), 0, 0);
    ctx.restore();
  }
  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#2a1a0a';
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  // Ball marker (top)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(cx, cy - radius - 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1;
  ctx.stroke();
  // If result, highlight which number is at top
  if (resultNum !== null && resultNum !== undefined) {
    const idx = order.indexOf(resultNum);
    if (idx >= 0) {
      const numAngle = angle + idx * segAngle + segAngle / 2;
      // Normalize to find if this segment is at the top (-PI/2)
      const bx = cx + Math.cos(numAngle) * (radius * 0.9);
      const by = cy + Math.sin(numAngle) * (radius * 0.9);
    }
  }
}

function _drawRoulette(px, py, pw, ph) {
  const rl = casinoState.rl;
  const cx = px + pw / 2;

  if (rl.phase === 'spinning') {
    const elapsed = Date.now() - rl.spinTimer;
    const spinDuration = 4000;
    if (elapsed > spinDuration) {
      casinoRL_resolve();
      return;
    }
    // Smooth deceleration: wheel spins fast then eases to result
    const order = ROULETTE_WHEEL_ORDER;
    const idx = order.indexOf(rl.resultNumber);
    const segAngle = (Math.PI * 2) / order.length;
    // Final angle: result number at top (marker is at -PI/2)
    const finalAngle = -Math.PI / 2 - idx * segAngle - segAngle / 2;
    // Total spin: 5 full rotations + final position
    const totalSpin = Math.PI * 2 * 5 + finalAngle;
    // Ease-out cubic for smooth deceleration
    const t = elapsed / spinDuration;
    const eased = 1 - Math.pow(1 - t, 3);
    const currentAngle = totalSpin * eased;
    _drawRouletteWheel(cx, py + ph / 2 - 20, 140, currentAngle, null);
    // Spinning text with dots animation
    const dots = '.'.repeat((Math.floor(elapsed / 400) % 3) + 1);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText('Spinning' + dots, cx, py + ph - 45);
    // Show total bet
    ctx.font = '14px monospace'; ctx.fillStyle = '#ccc';
    ctx.fillText('Total bet: ' + rl.totalBet + 'g', cx, py + ph - 22);
    return;
  }

  if (rl.phase === 'result') {
    // Show wheel stopped on result
    const order = ROULETTE_WHEEL_ORDER;
    const idx = order.indexOf(rl.resultNumber);
    const segAngle = (Math.PI * 2) / order.length;
    const finalAngle = -Math.PI / 2 - idx * segAngle - segAngle / 2;
    _drawRouletteWheel(cx, py + 180, 120, finalAngle, rl.resultNumber);
    // Result number display
    const n = rl.resultNumber;
    const col = ROULETTE_REDS.has(n) ? '#cc1111' : n === 0 ? '#00aa00' : '#222';
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(cx - 30, py + 60, 60, 50, 8); ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 30, py + 60, 60, 50, 8); ctx.stroke();
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(n.toString(), cx, py + 95);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#bbb';
    ctx.fillText(ROULETTE_REDS.has(n) ? 'Red' : n === 0 ? 'Green' : 'Black', cx, py + 115);
    _casinoDrawResult(px, py, pw, ph);
    return;
  }

  // BETTING PHASE — grid centered, bets strip below
  const cellW = 34, cellH = 26;
  const gridW = cellW * 13; // 442px
  const gridX = cx - gridW / 2, gridY = py + 55;

  // Zero
  ctx.fillStyle = '#006600';
  ctx.fillRect(gridX, gridY, cellW, cellH * 3);
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
  ctx.strokeRect(gridX, gridY, cellW, cellH * 3);
  ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('0', gridX + cellW / 2, gridY + cellH * 1.5 + 5);

  // Number grid: 3 rows x 12 cols
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const num = col * 3 + (3 - row);
      const gx = gridX + cellW + col * cellW;
      const gy = gridY + row * cellH;
      ctx.fillStyle = ROULETTE_REDS.has(num) ? '#881111' : '#151515';
      ctx.fillRect(gx, gy, cellW, cellH);
      ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
      ctx.strokeRect(gx, gy, cellW, cellH);
      ctx.fillStyle = '#ddd';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(num.toString(), gx + cellW / 2, gy + cellH / 2 + 4);
    }
  }

  // Outside bets (below grid, 2 rows of 3) — centered with grid
  const obY = gridY + cellH * 3 + 6;
  const obW = gridW / 3 - 4;
  const obH = 24;
  const outsideBets1 = [
    { type: 'red', label: 'RED', color: '#881111' },
    { type: 'black', label: 'BLACK', color: '#151515' },
    { type: 'odd', label: 'ODD', color: '#111e2e' },
  ];
  const outsideBets2 = [
    { type: 'even', label: 'EVEN', color: '#111e2e' },
    { type: 'low', label: '1-18', color: '#111e2e' },
    { type: 'high', label: '19-36', color: '#111e2e' },
  ];
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (obW + 4);
    const ob = outsideBets1[i];
    ctx.fillStyle = ob.color;
    ctx.beginPath(); ctx.roundRect(bx, obY, obW, obH, 3); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, obY, obW, obH, 3); ctx.stroke();
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(ob.label, bx + obW / 2, obY + obH / 2 + 4);
  }
  const ob2Y = obY + obH + 3;
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (obW + 4);
    const ob = outsideBets2[i];
    ctx.fillStyle = ob.color;
    ctx.beginPath(); ctx.roundRect(bx, ob2Y, obW, obH, 3); ctx.fill();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, ob2Y, obW, obH, 3); ctx.stroke();
    ctx.font = 'bold 11px monospace'; ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(ob.label, bx + obW / 2, ob2Y + obH / 2 + 4);
  }

  // Dozens + Columns (below outside bets) — centered with grid
  const dcY = ob2Y + obH + 6;
  const dcW = gridW / 3 - 4;
  const dcBets1 = [
    { type: 'dozen1', label: '1st 12' }, { type: 'dozen2', label: '2nd 12' }, { type: 'dozen3', label: '3rd 12' },
  ];
  const dcBets2 = [
    { type: 'col1', label: 'Col 1' }, { type: 'col2', label: 'Col 2' }, { type: 'col3', label: 'Col 3' },
  ];
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (dcW + 4);
    ctx.fillStyle = '#111e2e';
    ctx.beginPath(); ctx.roundRect(bx, dcY, dcW, obH, 3); ctx.fill();
    ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, dcY, dcW, obH, 3); ctx.stroke();
    ctx.font = '10px monospace'; ctx.fillStyle = '#bbb';
    ctx.textAlign = 'center';
    ctx.fillText(dcBets1[i].label, bx + dcW / 2, dcY + obH / 2 + 4);
  }
  const dc2Y = dcY + obH + 3;
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (dcW + 4);
    ctx.fillStyle = '#111e2e';
    ctx.beginPath(); ctx.roundRect(bx, dc2Y, dcW, obH, 3); ctx.fill();
    ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, dc2Y, dcW, obH, 3); ctx.stroke();
    ctx.font = '10px monospace'; ctx.fillStyle = '#bbb';
    ctx.textAlign = 'center';
    ctx.fillText(dcBets2[i].label, bx + dcW / 2, dc2Y + obH / 2 + 4);
  }

  // Bets summary strip — centered below grid area
  const stripY = dc2Y + obH + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(gridX, stripY, gridW, 46, 6); ctx.fill();
  // Bets list (scrolling text, left side of strip)
  ctx.font = '11px monospace'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'left';
  if (rl.bets.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('Click numbers to place bets', gridX + 10, stripY + 18);
  } else {
    // Show last 3 bets + total
    const showBets = rl.bets.slice(-3);
    for (let i = 0; i < showBets.length; i++) {
      const b = showBets[i];
      const label = ROULETTE_BET_TYPES[b.type] ? ROULETTE_BET_TYPES[b.type].label : '#' + b.value;
      ctx.fillText(label + ' ' + b.amount + 'g', gridX + 10, stripY + 14 + i * 14);
    }
    if (rl.bets.length > 3) {
      ctx.fillStyle = '#888';
      ctx.fillText('+' + (rl.bets.length - 3) + ' more', gridX + 180, stripY + 14);
    }
  }
  // Total + Spin/Clear buttons (right side of strip)
  ctx.font = 'bold 13px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'right';
  ctx.fillText('Total: ' + rl.totalBet + 'g', gridX + gridW - 220, stripY + 28);
  _casinoDrawButton(gridX + gridW - 210, stripY + 6, 96, 34, 'SPIN', rl.bets.length > 0, true);
  _casinoDrawButton(gridX + gridW - 106, stripY + 6, 96, 34, 'CLEAR', rl.bets.length > 0, false);

  // Bet controls
  _casinoDrawBetControls(px, py, pw);
}

function _clickRoulette(mx, my, px, py, pw, ph) {
  const rl = casinoState.rl;
  if (rl.phase !== 'betting') return true;
  const cx = px + pw / 2;
  const cellW = 34, cellH = 26;
  const gridW = cellW * 13;
  const gridX = cx - gridW / 2, gridY = py + 55;
  const obW = gridW / 3 - 4, obH = 24;

  if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;

  // Spin/Clear in strip
  const obY = gridY + cellH * 3 + 6;
  const ob2Y = obY + obH + 3;
  const dcY = ob2Y + obH + 6;
  const dc2Y = dcY + obH + 3;
  const stripY = dc2Y + obH + 10;
  if (_casinoHitBtn(mx, my, gridX + gridW - 210, stripY + 6, 96, 34) && rl.bets.length > 0) { casinoRL_spin(); return true; }
  if (_casinoHitBtn(mx, my, gridX + gridW - 106, stripY + 6, 96, 34) && rl.bets.length > 0) { casinoRL_clearBets(); return true; }

  // Zero
  if (mx >= gridX && mx <= gridX + cellW && my >= gridY && my <= gridY + cellH * 3) {
    casinoRL_placeBet('straight', 0, _casinoBetInput); return true;
  }
  // Numbers
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const gx = gridX + cellW + col * cellW, gy = gridY + row * cellH;
      if (_casinoHitBtn(mx, my, gx, gy, cellW, cellH)) {
        casinoRL_placeBet('straight', col * 3 + (3 - row), _casinoBetInput); return true;
      }
    }
  }
  // Outside bets row 1
  const outsideTypes1 = ['red', 'black', 'odd'];
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (obW + 4);
    if (_casinoHitBtn(mx, my, bx, obY, obW, obH)) { casinoRL_placeBet(outsideTypes1[i], null, _casinoBetInput); return true; }
  }
  // Outside bets row 2
  const outsideTypes2 = ['even', 'low', 'high'];
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (obW + 4);
    if (_casinoHitBtn(mx, my, bx, ob2Y, obW, obH)) { casinoRL_placeBet(outsideTypes2[i], null, _casinoBetInput); return true; }
  }
  // Dozens
  const dcTypes1 = ['dozen1', 'dozen2', 'dozen3'];
  const dcW = obW;
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (dcW + 4);
    if (_casinoHitBtn(mx, my, bx, dcY, dcW, obH)) { casinoRL_placeBet(dcTypes1[i], null, _casinoBetInput); return true; }
  }
  // Columns
  const dcTypes2 = ['col1', 'col2', 'col3'];
  for (let i = 0; i < 3; i++) {
    const bx = gridX + i * (dcW + 4);
    if (_casinoHitBtn(mx, my, bx, dc2Y, dcW, obH)) { casinoRL_placeBet(dcTypes2[i], null, _casinoBetInput); return true; }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  HEADS OR TAILS — fixed layout, better animation
// ═══════════════════════════════════════════════════════════════

function _drawHeadsOrTails(px, py, pw, ph) {
  const hot = casinoState.hot;
  const cx = px + pw / 2;

  if (hot.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    _casinoDrawButton(cx - 70, py + ph / 2 - 25, 140, 48, 'START', gold >= _casinoBetInput, true);
    ctx.font = '14px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    ctx.fillText('Choose heads or tails each flip — 1.5x multiplier per win!', cx, py + 100);
    ctx.fillText('Cash out anytime or lose it all on a wrong guess!', cx, py + 122);
    return;
  }

  // Bet display (top right, out of the way)
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 24, py + 68);
  ctx.fillText('\u2B25 ' + gold + 'g', px + pw - 24, py + 88);

  // Check if flip animation is done and auto-resolve
  const _hotFlipDuration = 1000;
  if (hot.phase === 'flipping' && hot.flipTimer && Date.now() - hot.flipTimer > _hotFlipDuration) {
    casinoHOT_resolveFlip();
  }

  // Coin — centered vertically in panel
  const coinCX = cx;
  const coinCY = py + 180;
  const coinR = 55;

  // Flip animation (3D-like Y rotation)
  let flipScale = 1;
  let showFace = true;
  if (hot.phase === 'flipping' && hot.flipTimer) {
    const elapsed = Date.now() - hot.flipTimer;
    if (elapsed < _hotFlipDuration) {
      const phase = (elapsed / _hotFlipDuration) * Math.PI * 6; // 3 full rotations
      flipScale = Math.abs(Math.cos(phase));
      showFace = Math.cos(phase) > 0;
    }
  }

  ctx.save();
  ctx.translate(coinCX, coinCY);
  ctx.scale(1, flipScale || 0.01);

  // Coin shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(3, 3, coinR, 0, Math.PI * 2); ctx.fill();

  // Coin body — show result side during flip animation
  const isHeads = showFace ? (hot.lastFlip !== 'tails') : (hot.lastFlip === 'tails');
  const coinGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, coinR);
  if (isHeads) {
    coinGrad.addColorStop(0, '#ffe44d');
    coinGrad.addColorStop(1, '#cc9900');
  } else {
    coinGrad.addColorStop(0, '#aaa');
    coinGrad.addColorStop(1, '#555');
  }
  ctx.fillStyle = coinGrad;
  ctx.beginPath(); ctx.arc(0, 0, coinR, 0, Math.PI * 2); ctx.fill();
  // Rim
  ctx.strokeStyle = isHeads ? '#8a6a00' : '#333';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, coinR, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;

  // Face text
  if (flipScale > 0.2) {
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = isHeads ? '#6a4a00' : '#222';
    ctx.textAlign = 'center';
    const faceChar = hot.lastFlip ? (isHeads ? 'H' : 'T') : '?';
    ctx.fillText(faceChar, 0, 11);
  }
  ctx.restore();

  // Player's choice indicator (above coin)
  if (hot.playerChoice && hot.phase === 'flipping') {
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
    ctx.fillText('You picked: ' + hot.playerChoice.toUpperCase(), cx, coinCY - coinR - 18);
  }

  // Last result feedback (below coin, before stats)
  if (hot.lastFlip && hot.phase === 'choosing' && hot.streak > 0) {
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#5fca80'; ctx.textAlign = 'center';
    ctx.fillText('Correct! It was ' + hot.lastFlip + '!', cx, coinCY + coinR + 22);
  }

  // Stats area — below coin with clear spacing
  const infoY = coinCY + coinR + 42;
  const lineH = 26;

  ctx.textAlign = 'center';
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('Streak: ' + hot.streak, cx, infoY);

  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Multiplier: ' + hot.currentMultiplier.toFixed(2) + 'x', cx, infoY + lineH);

  const potential = Math.floor(casinoState.bet * hot.currentMultiplier);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#5fca80';
  ctx.fillText('Payout: ' + potential + 'g', cx, infoY + lineH * 2);

  // Buttons — choose HEADS or TAILS
  if (hot.phase === 'choosing') {
    const btnY = py + ph - 68;
    // Heads button (gold colored)
    ctx.fillStyle = '#3a2a0a';
    ctx.beginPath(); ctx.roundRect(cx - 195, btnY, 120, 46, 6); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 195, btnY, 120, 46, 6); ctx.stroke();
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
    ctx.fillText('HEADS', cx - 135, btnY + 29);

    // Tails button (silver colored)
    ctx.fillStyle = '#111e2e';
    ctx.beginPath(); ctx.roundRect(cx - 60, btnY, 120, 46, 6); ctx.fill();
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(cx - 60, btnY, 120, 46, 6); ctx.stroke();
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center';
    ctx.fillText('TAILS', cx, btnY + 29);

    // Cash out (only if streak > 0)
    if (hot.streak > 0) {
      _casinoDrawButton(cx + 75, btnY, 120, 46, 'CASH OUT', true, true);
    }
  }

  _casinoDrawResult(px, py, pw, ph);
}

function _clickHeadsOrTails(mx, my, px, py, pw, ph) {
  const hot = casinoState.hot;
  const cx = px + pw / 2;
  if (hot.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    if (_casinoHitBtn(mx, my, cx - 70, py + ph / 2 - 25, 140, 48) && gold >= _casinoBetInput) {
      casinoHOT_startRound(_casinoBetInput); return true;
    }
    return true;
  }
  if (hot.phase === 'choosing') {
    const btnY = py + ph - 68;
    if (_casinoHitBtn(mx, my, cx - 195, btnY, 120, 46)) { casinoHOT_choose('heads'); return true; }
    if (_casinoHitBtn(mx, my, cx - 60, btnY, 120, 46)) { casinoHOT_choose('tails'); return true; }
    if (hot.streak > 0 && _casinoHitBtn(mx, my, cx + 75, btnY, 120, 46)) { casinoHOT_cashOut(); return true; }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  CASES — same as before but with result overlay fix
// ═══════════════════════════════════════════════════════════════

function _drawCases(px, py, pw, ph) {
  const cs = casinoState.cs;
  const cx = px + pw / 2;
  if (cs.phase === 'opening') {
    const elapsed = Date.now() - cs.openTimer;
    if (elapsed > 1800) { casinoCS_reveal(); return; }
    const tier = CASE_TIERS[cs.selectedTier];
    // Shaking case with glow buildup
    const shake = Math.sin(elapsed / 25) * Math.max(0, 6 - elapsed / 300);
    const glow = Math.min(1, elapsed / 1200);
    ctx.save();
    ctx.translate(cx + shake, py + ph / 2 - 30);
    // Glow
    ctx.shadowColor = tier.color;
    ctx.shadowBlur = glow * 30;
    ctx.fillStyle = tier.color;
    ctx.beginPath(); ctx.roundRect(-60, -35, 120, 70, 10); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-60, -35, 120, 70, 10); ctx.stroke();
    // Handle
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.strokeRect(-14, -42, 28, 10);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, 10);
    ctx.restore();
    ctx.font = '16px monospace';
    ctx.fillStyle = '#aaa'; ctx.textAlign = 'center';
    ctx.fillText('Opening...', cx, py + ph / 2 + 60);
    return;
  }
  if (cs.phase === 'result') { _casinoDrawResult(px, py, pw, ph); return; }
  // SELECTING phase
  ctx.font = '15px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
  ctx.fillText('Choose a case to open', cx, py + 70);
  ctx.fillStyle = '#ffd700'; ctx.textAlign = 'right';
  ctx.fillText('\u2B25 ' + gold + 'g', px + pw - 24, py + 70);
  const tiers = ['cheap', 'medium', 'expensive'];
  const caseW = 190, caseH = 310, caseGap = 18;
  const startX = cx - (caseW * 3 + caseGap * 2) / 2;
  for (let i = 0; i < 3; i++) {
    const tier = CASE_TIERS[tiers[i]];
    const tx = startX + i * (caseW + caseGap);
    const ty = py + 88;
    const canAfford = gold >= tier.cost;
    ctx.fillStyle = canAfford ? '#0f1923' : '#0a1218';
    ctx.beginPath(); ctx.roundRect(tx, ty, caseW, caseH, 8); ctx.fill();
    ctx.strokeStyle = canAfford ? tier.color : '#222';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(tx, ty, caseW, caseH, 8); ctx.stroke();
    // Case icon
    ctx.fillStyle = tier.color;
    ctx.globalAlpha = canAfford ? 1 : 0.3;
    ctx.beginPath(); ctx.roundRect(tx + caseW / 2 - 35, ty + 20, 70, 45, 6); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(tx + caseW / 2 - 35, ty + 20, 70, 45, 6); ctx.stroke();
    ctx.strokeRect(tx + caseW / 2 - 14, ty + 13, 28, 10);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = tier.color; ctx.textAlign = 'center';
    ctx.fillText(tier.label, tx + caseW / 2, ty + 88);
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = canAfford ? '#ffd700' : '#555';
    ctx.fillText(tier.cost + 'g', tx + caseW / 2, ty + 110);
    ctx.font = '11px monospace'; ctx.textAlign = 'left';
    const totalWeight = tier.outcomes.reduce((s, o) => s + o.weight, 0);
    for (let j = 0; j < tier.outcomes.length; j++) {
      const o = tier.outcomes[j];
      const pct = Math.round(o.weight / totalWeight * 100);
      const oy = ty + 128 + j * 32;
      const barW = (o.weight / totalWeight) * (caseW - 30);
      const colors = ['#333', '#2a4a2a', '#2a2a5a', '#5a2a2a'];
      ctx.fillStyle = colors[j] || '#333';
      ctx.beginPath(); ctx.roundRect(tx + 10, oy, barW, 22, 3); ctx.fill();
      ctx.fillStyle = '#ddd';
      ctx.fillText(o.label + ' (' + pct + '%)', tx + 14, oy + 16);
    }
    _casinoDrawButton(tx + caseW / 2 - 55, ty + caseH - 48, 110, 34, 'OPEN', canAfford, canAfford);
  }
}

function _clickCases(mx, my, px, py, pw, ph) {
  const cs = casinoState.cs;
  if (cs.phase !== 'selecting') return true;
  const cx = px + pw / 2;
  const tiers = ['cheap', 'medium', 'expensive'];
  const caseW = 190, caseH = 310, caseGap = 18;
  const startX = cx - (caseW * 3 + caseGap * 2) / 2;
  for (let i = 0; i < 3; i++) {
    const tier = CASE_TIERS[tiers[i]];
    const tx = startX + i * (caseW + caseGap);
    const ty = py + 88;
    if (_casinoHitBtn(mx, my, tx + caseW / 2 - 55, ty + caseH - 48, 110, 34) && gold >= tier.cost) {
      casinoCS_open(tiers[i]); return true;
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  MINES — selectable mine count
// ═══════════════════════════════════════════════════════════════

function _drawMines(px, py, pw, ph) {
  const mn = casinoState.mn;
  const cx = px + pw / 2;

  if (mn.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);

    // Mine count selector
    ctx.font = 'bold 15px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('Mines: ' + mn.mineCount, cx, py + 90);

    // - and + buttons
    _casinoDrawButton(cx - 100, py + 100, 40, 34, '-', mn.mineCount > MINES_CONFIG.MIN_MINES, false);
    _casinoDrawButton(cx + 60, py + 100, 40, 34, '+', mn.mineCount < MINES_CONFIG.MAX_MINES, false);

    // Preset mine counts
    const mPresets = [1, 3, 5, 10, 15, 20, 24];
    const mpW = 42, mpGap = 6;
    const mpStartX = cx - (mPresets.length * (mpW + mpGap) - mpGap) / 2;
    for (let i = 0; i < mPresets.length; i++) {
      const bx = mpStartX + i * (mpW + mpGap);
      const active = mn.mineCount === mPresets[i];
      ctx.fillStyle = active ? '#0a2a0a' : '#111e2e';
      ctx.beginPath(); ctx.roundRect(bx, py + 145, mpW, 26, 4); ctx.fill();
      ctx.strokeStyle = active ? '#00e701' : '#1a2a3a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, py + 145, mpW, 26, 4); ctx.stroke();
      ctx.font = '11px monospace'; ctx.fillStyle = active ? '#8f8' : '#aaa'; ctx.textAlign = 'center';
      ctx.fillText(mPresets[i] + '', bx + mpW / 2, py + 162);
    }

    // Info text
    ctx.font = '13px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    const safeTiles = 25 - mn.mineCount;
    ctx.fillText('5x5 grid \u00B7 ' + mn.mineCount + ' mines \u00B7 ' + safeTiles + ' safe tiles', cx, py + 195);
    ctx.fillText('More mines = higher multipliers!', cx, py + 215);

    _casinoDrawButton(cx - 70, py + ph / 2 + 20, 140, 48, 'START', gold >= _casinoBetInput, true);
    return;
  }

  // Grid
  const gridSize = MINES_CONFIG.GRID_SIZE;
  const cellSize = 62;
  const gridW = gridSize * cellSize;
  const totalContentW = gridW + 20 + 190;
  const gridX = cx - totalContentW / 2;
  const gridY = py + 65;
  const isResult = mn.phase === 'result';

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const gx = gridX + c * cellSize;
      const gy = gridY + r * cellSize;
      const revealed = mn.revealed && mn.revealed[r][c];
      const isMine = mn.board && mn.board[r][c];

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.roundRect(gx + 4, gy + 4, cellSize - 6, cellSize - 6, 6); ctx.fill();

      if (revealed) {
        if (isMine) {
          ctx.fillStyle = '#3a0808';
          ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.fill();
          ctx.strokeStyle = '#ff3333'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.stroke();
          // Mine icon (drawn, not emoji)
          const mcx = gx + cellSize / 2 - 1, mcy = gy + cellSize / 2 - 1;
          ctx.fillStyle = '#ff4444';
          ctx.beginPath(); ctx.arc(mcx, mcy, 12, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ff6666'; ctx.lineWidth = 2;
          for (let a = 0; a < 8; a++) {
            const ang = a * Math.PI / 4;
            ctx.beginPath();
            ctx.moveTo(mcx + Math.cos(ang) * 10, mcy + Math.sin(ang) * 10);
            ctx.lineTo(mcx + Math.cos(ang) * 16, mcy + Math.sin(ang) * 16);
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = '#172230';
          ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.fill();
          ctx.strokeStyle = '#00e701'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.stroke();
          // Checkmark
          ctx.strokeStyle = '#00e701'; ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(gx + 18, gy + cellSize / 2);
          ctx.lineTo(gx + cellSize / 2 - 4, gy + cellSize / 2 + 10);
          ctx.lineTo(gx + cellSize - 16, gy + cellSize / 2 - 10);
          ctx.stroke();
        }
      } else if (isResult && isMine) {
        ctx.fillStyle = '#1a0808';
        ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.fill();
        ctx.font = '20px monospace'; ctx.fillStyle = '#aa3333'; ctx.textAlign = 'center';
        ctx.fillText('\u2716', gx + cellSize / 2, gy + cellSize / 2 + 7);
      } else {
        // Unrevealed tile
        ctx.fillStyle = '#1a2535';
        ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.fill();
        ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 6, cellSize - 6, 6); ctx.stroke();
      }
    }
  }

  // Stats panel (right side)
  const statsX = gridX + gridW + 20;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.roundRect(statsX - 8, gridY - 4, 190, 250, 8); ctx.fill();
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = '#aaa'; ctx.fillText('Mines: ' + mn.mineCount, statsX, gridY + 16);
  ctx.fillStyle = '#ffd700'; ctx.fillText('Bet: ' + casinoState.bet + 'g', statsX, gridY + 44);
  ctx.fillStyle = '#fff'; ctx.fillText('Revealed: ' + mn.safeRevealed, statsX, gridY + 72);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(mn.currentMultiplier.toFixed(2) + 'x', statsX, gridY + 104);
  ctx.font = '12px monospace'; ctx.fillStyle = '#888'; ctx.fillText('multiplier', statsX, gridY + 120);
  ctx.fillStyle = '#5fca80';
  ctx.font = 'bold 18px monospace';
  const mPayout = Math.floor(casinoState.bet * mn.currentMultiplier);
  ctx.fillText(mPayout + 'g', statsX, gridY + 150);
  ctx.font = '12px monospace'; ctx.fillStyle = '#888'; ctx.fillText('payout', statsX, gridY + 166);

  if (mn.phase === 'playing' && mn.safeRevealed > 0) {
    _casinoDrawButton(statsX, gridY + 185, 160, 42, 'CASH OUT', true, true);
  }
  _casinoDrawResult(px, py, pw, ph);
}

function _clickMines(mx, my, px, py, pw, ph) {
  const mn = casinoState.mn;
  const cx = px + pw / 2;

  if (mn.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    // Mine count - / +
    if (_casinoHitBtn(mx, my, cx - 100, py + 100, 40, 34) && mn.mineCount > MINES_CONFIG.MIN_MINES) {
      mn.mineCount--; return true;
    }
    if (_casinoHitBtn(mx, my, cx + 60, py + 100, 40, 34) && mn.mineCount < MINES_CONFIG.MAX_MINES) {
      mn.mineCount++; return true;
    }
    // Mine count presets
    const mPresets = [1, 3, 5, 10, 15, 20, 24];
    const mpW = 42, mpGap = 6;
    const mpStartX = cx - (mPresets.length * (mpW + mpGap) - mpGap) / 2;
    for (let i = 0; i < mPresets.length; i++) {
      if (_casinoHitBtn(mx, my, mpStartX + i * (mpW + mpGap), py + 145, mpW, 26)) {
        mn.mineCount = mPresets[i]; return true;
      }
    }
    // Start
    if (_casinoHitBtn(mx, my, cx - 70, py + ph / 2 + 20, 140, 48) && gold >= _casinoBetInput) {
      casinoMN_start(_casinoBetInput); return true;
    }
    return true;
  }

  if (mn.phase === 'playing') {
    const gridSize = MINES_CONFIG.GRID_SIZE;
    const cellSize = 62;
    const gridW = gridSize * cellSize;
    const totalContentW = gridW + 20 + 190;
    const gridX = cx - totalContentW / 2;
    const gridY = py + 65;
    const statsX = gridX + gridW + 20;
    if (mn.safeRevealed > 0 && _casinoHitBtn(mx, my, statsX, gridY + 185, 160, 42)) {
      casinoMN_cashOut(); return true;
    }
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const gx = gridX + c * cellSize, gy = gridY + r * cellSize;
        if (_casinoHitBtn(mx, my, gx, gy, cellSize, cellSize)) { casinoMN_reveal(r, c); return true; }
      }
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  DICE — animated rolling
// ═══════════════════════════════════════════════════════════════

function _drawDice(px, py, pw, ph) {
  const dc = casinoState.dc;
  const cx = px + pw / 2;

  if (dc.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    _casinoDrawButton(cx - 70, py + ph / 2 - 25, 140, 48, 'ROLL', gold >= _casinoBetInput, true);
    ctx.font = '14px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    ctx.fillText('Roll the first die, then predict the second!', cx, py + 100);
    ctx.fillText('Payouts based on actual probability (5% edge)', cx, py + 122);
    return;
  }

  // Check phase transitions
  if (dc.phase === 'rolling1') {
    const elapsed = Date.now() - dc.rollTimer;
    if (elapsed > 1200) dc.phase = 'rolled1';
  }
  if (dc.phase === 'rolling2') {
    const elapsed = Date.now() - dc.rollTimer;
    if (elapsed > 1200) casinoDC_resolve();
  }

  // Dark navy background for dice area
  ctx.fillStyle = '#0f1923';
  ctx.beginPath(); ctx.roundRect(px + 50, py + 70, pw - 100, 180, 10); ctx.fill();

  const dieSize = 90;
  const die1X = cx - dieSize - 40, dieY = py + 110;
  const die2X = cx + 40;

  // Die 1
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#bdb'; ctx.textAlign = 'center';
  ctx.fillText('DIE 1', die1X + dieSize / 2, dieY - 12);
  if (dc.phase === 'rolling1') {
    const elapsed = Date.now() - dc.rollTimer;
    const speed = Math.max(60, 200 - elapsed * 0.12);
    const tumbleVal = (Math.floor(Date.now() / speed) % 6) + 1;
    const rotation = (elapsed / 100) * (1 - elapsed / 1500);
    const bounce = Math.sin(elapsed / 80) * Math.max(0, 8 - elapsed / 150);
    _casinoDrawDie(die1X, dieY + bounce, dieSize, tumbleVal, rotation);
  } else {
    _casinoDrawDie(die1X, dieY, dieSize, dc.die1, 0);
  }

  // Die 2
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#bdb'; ctx.textAlign = 'center';
  ctx.fillText('DIE 2', die2X + dieSize / 2, dieY - 12);
  if (dc.phase === 'rolling2') {
    const elapsed = Date.now() - dc.rollTimer;
    const speed = Math.max(60, 200 - elapsed * 0.12);
    const tumbleVal = elapsed > 900 ? dc.die2 : (Math.floor(Date.now() / speed) % 6) + 1;
    const rotation = elapsed > 900 ? 0 : (elapsed / 100) * (1 - elapsed / 1500);
    const bounce = elapsed > 900 ? 0 : Math.sin(elapsed / 80) * Math.max(0, 8 - elapsed / 150);
    _casinoDrawDie(die2X, dieY + bounce, dieSize, tumbleVal, rotation);
  } else if (dc.die2 > 0) {
    _casinoDrawDie(die2X, dieY, dieSize, dc.die2, 0);
  } else {
    // Empty placeholder
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.roundRect(die2X, dieY, dieSize, dieSize, 8); ctx.fill();
    ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.roundRect(die2X, dieY, dieSize, dieSize, 8); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 1;
    ctx.font = 'bold 32px monospace'; ctx.fillStyle = '#333'; ctx.textAlign = 'center';
    ctx.fillText('?', die2X + dieSize / 2, dieY + dieSize / 2 + 11);
  }

  // Bet display
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 24, py + 68);

  // Choice display
  if (dc.choice) {
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
    ctx.fillText('You chose: ' + dc.choice.toUpperCase(), cx, py + 280);
  }

  // Choice buttons
  if (dc.phase === 'rolled1') {
    const legal = casinoDC_getLegalChoices();
    const btnY = py + 300;
    const btnW = 150, btnGap = 16;
    const totalW = legal.length * btnW + (legal.length - 1) * btnGap;
    const startBtnX = cx - totalW / 2;
    for (let i = 0; i < legal.length; i++) {
      const choice = legal[i];
      const bx = startBtnX + i * (btnW + btnGap);
      const payoutMult = DICE_PAYOUTS[dc.die1][choice];
      const label = choice.charAt(0).toUpperCase() + choice.slice(1) + ' (' + payoutMult.toFixed(2) + 'x)';
      _casinoDrawButton(bx, btnY, btnW, 44, label, true, false);
    }
    ctx.font = '13px monospace'; ctx.fillStyle = '#8a8'; ctx.textAlign = 'center';
    ctx.fillText('Will die 2 be higher, lower, or equal to ' + dc.die1 + '?', cx, btnY + 62);
  }

  _casinoDrawResult(px, py, pw, ph);
}

function _clickDice(mx, my, px, py, pw, ph) {
  const dc = casinoState.dc;
  const cx = px + pw / 2;
  if (dc.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    if (_casinoHitBtn(mx, my, cx - 70, py + ph / 2 - 25, 140, 48) && gold >= _casinoBetInput) {
      casinoDC_start(_casinoBetInput); return true;
    }
    return true;
  }
  if (dc.phase === 'rolled1') {
    const legal = casinoDC_getLegalChoices();
    const btnY = py + 300;
    const btnW = 150, btnGap = 16;
    const totalW = legal.length * btnW + (legal.length - 1) * btnGap;
    const startBtnX = cx - totalW / 2;
    for (let i = 0; i < legal.length; i++) {
      const bx = startBtnX + i * (btnW + btnGap);
      if (_casinoHitBtn(mx, my, bx, btnY, btnW, 44)) { casinoDC_choose(legal[i]); return true; }
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  ROCK PAPER SCISSORS
// ═══════════════════════════════════════════════════════════════

const _RPS_ICONS = {
  rock: { symbol: '\u270A', color: '#8a6a4a', bg: '#3a2a1a' },      // fist
  paper: { symbol: '\u270B', color: '#5a8aaa', bg: '#1a2a3a' },     // hand
  scissors: { symbol: '\u270C', color: '#aa5a6a', bg: '#3a1a2a' },  // victory
};

function _drawRPSHand(x, y, size, choice, faceDown, shake) {
  ctx.save();
  if (shake) {
    const shakeX = Math.sin(Date.now() / 40) * 4;
    ctx.translate(shakeX, 0);
  }
  // Circle background
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.arc(x + 3, y + 3, size, 0, Math.PI * 2); ctx.fill();
  if (faceDown) {
    ctx.fillStyle = '#111e2e';
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.stroke();
    ctx.font = 'bold ' + (size * 0.7) + 'px monospace';
    ctx.fillStyle = '#333'; ctx.textAlign = 'center';
    ctx.fillText('?', x, y + size * 0.25);
  } else {
    const info = _RPS_ICONS[choice];
    const grad = ctx.createRadialGradient(x - size * 0.2, y - size * 0.2, 2, x, y, size);
    grad.addColorStop(0, info.bg);
    grad.addColorStop(1, '#0a0a12');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = info.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.stroke();
    ctx.font = (size * 1.0) + 'px serif';
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(info.symbol, x, y + size * 0.35);
  }
  ctx.restore();
}

function _drawRPS(px, py, pw, ph) {
  const rps = casinoState.rps;
  const cx = px + pw / 2;

  if (rps.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    // Format selector
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('Choose Format:', cx, py + 90);
    const fmtBtnW = 140, fmtGap = 16;
    const fmtStartX = cx - (RPS_FORMATS.length * fmtBtnW + (RPS_FORMATS.length - 1) * fmtGap) / 2;
    for (let i = 0; i < RPS_FORMATS.length; i++) {
      const fmt = RPS_FORMATS[i];
      const bx = fmtStartX + i * (fmtBtnW + fmtGap);
      const active = rps.format === fmt.id;
      ctx.fillStyle = active ? '#0a2a0a' : '#111e2e';
      ctx.beginPath(); ctx.roundRect(bx, py + 105, fmtBtnW, 36, 6); ctx.fill();
      ctx.strokeStyle = active ? '#00e701' : '#1a2a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, py + 105, fmtBtnW, 36, 6); ctx.stroke();
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = active ? '#8f8' : '#aaa'; ctx.textAlign = 'center';
      ctx.fillText(fmt.label, bx + fmtBtnW / 2, py + 128);
    }
    // Payout info
    ctx.font = '14px monospace'; ctx.fillStyle = '#888'; ctx.textAlign = 'center';
    ctx.fillText('Win payout: ' + RPS_PAYOUT.toFixed(2) + 'x  |  Ties replay', cx, py + 165);
    // RPS icons decorative
    _drawRPSHand(cx - 120, py + 250, 40, 'rock', false, false);
    _drawRPSHand(cx, py + 250, 40, 'paper', false, false);
    _drawRPSHand(cx + 120, py + 250, 40, 'scissors', false, false);
    // Play button
    _casinoDrawButton(cx - 70, py + ph / 2 + 50, 140, 48, 'PLAY', gold >= _casinoBetInput, true);
    return;
  }

  // Score display
  const fmt = RPS_FORMATS.find(f => f.id === rps.format);
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 24, py + 68);
  ctx.textAlign = 'center';
  ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#fff';
  ctx.fillText('You ' + rps.playerWins + ' - ' + rps.houseWins + ' House', cx, py + 72);
  ctx.font = '13px monospace'; ctx.fillStyle = '#888';
  ctx.fillText(fmt ? fmt.label : '', cx, py + 90);

  // Reveal animation
  const revealDur = 1200;
  const revealing = rps.phase === 'revealing';
  if (revealing && rps.revealTimer && Date.now() - rps.revealTimer > revealDur) {
    casinoRPS_resolveRound();
  }

  // Player and House hands
  const handY = py + 200;
  const handSize = 55;
  const playerX = cx - 140, houseX = cx + 140;

  // Labels
  ctx.font = 'bold 14px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = '#5fca80'; ctx.fillText('YOU', playerX, handY - handSize - 16);
  ctx.fillStyle = '#ff6666'; ctx.fillText('HOUSE', houseX, handY - handSize - 16);
  // VS
  ctx.font = 'bold 28px monospace'; ctx.fillStyle = '#ffd700';
  ctx.fillText('VS', cx, handY + 10);

  if (revealing) {
    const elapsed = Date.now() - rps.revealTimer;
    // Shake phase (first 600ms), then reveal
    const shaking = elapsed < 600;
    const revealed = elapsed >= 600;
    _drawRPSHand(playerX, handY, handSize, rps.playerChoice, shaking, shaking);
    _drawRPSHand(houseX, handY, handSize, rps.houseChoice, shaking, shaking);
    if (shaking) {
      ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
      const count = 3 - Math.floor(elapsed / 200);
      if (count > 0) ctx.fillText(count.toString(), cx, handY + handSize + 40);
    }
  } else if (rps.phase === 'roundResult' || rps.phase === 'result') {
    _drawRPSHand(playerX, handY, handSize, rps.playerChoice, false, false);
    _drawRPSHand(houseX, handY, handSize, rps.houseChoice, false, false);
    // Round result text
    const lastRound = rps.rounds[rps.rounds.length - 1];
    if (lastRound) {
      ctx.font = 'bold 20px monospace'; ctx.textAlign = 'center';
      if (lastRound.result === 'win') { ctx.fillStyle = '#5fca80'; ctx.fillText('You win this round!', cx, handY + handSize + 40); }
      else if (lastRound.result === 'loss') { ctx.fillStyle = '#ff6666'; ctx.fillText('House wins this round!', cx, handY + handSize + 40); }
      else { ctx.fillStyle = '#ffd700'; ctx.fillText('Tie! Play again.', cx, handY + handSize + 40); }
    }
  } else if (rps.phase === 'choosing') {
    // Show hidden hands
    _drawRPSHand(playerX, handY, handSize, null, true, false);
    _drawRPSHand(houseX, handY, handSize, null, true, false);
  }

  // Round history
  if (rps.rounds.length > 0) {
    const histY = handY + handSize + 65;
    ctx.font = '11px monospace'; ctx.fillStyle = '#666'; ctx.textAlign = 'center';
    ctx.fillText('Round History', cx, histY);
    for (let i = 0; i < rps.rounds.length; i++) {
      const r = rps.rounds[i];
      const rx = cx - 120 + i * 50;
      const ry = histY + 10;
      const pIcon = _RPS_ICONS[r.player];
      const hIcon = _RPS_ICONS[r.house];
      ctx.font = '16px serif';
      ctx.fillText(pIcon.symbol, rx, ry + 18);
      ctx.fillText(hIcon.symbol, rx + 20, ry + 18);
      ctx.font = '9px monospace';
      ctx.fillStyle = r.result === 'win' ? '#5fca80' : r.result === 'loss' ? '#ff6666' : '#ffd700';
      ctx.fillText(r.result === 'win' ? 'W' : r.result === 'loss' ? 'L' : 'T', rx + 10, ry + 32);
      ctx.fillStyle = '#666';
    }
  }

  // Choice buttons
  if (rps.phase === 'choosing') {
    const btnY = py + ph - 80;
    const choiceBtnW = 130, choiceGap = 20;
    const startBtnX = cx - (3 * choiceBtnW + 2 * choiceGap) / 2;
    for (let i = 0; i < 3; i++) {
      const choice = RPS_CHOICES[i];
      const info = _RPS_ICONS[choice];
      const bx = startBtnX + i * (choiceBtnW + choiceGap);
      ctx.fillStyle = info.bg;
      ctx.beginPath(); ctx.roundRect(bx, btnY, choiceBtnW, 52, 8); ctx.fill();
      ctx.strokeStyle = info.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(bx, btnY, choiceBtnW, 52, 8); ctx.stroke();
      ctx.font = '24px serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
      ctx.fillText(info.symbol, bx + choiceBtnW / 2, btnY + 28);
      ctx.font = 'bold 11px monospace'; ctx.fillStyle = info.color;
      ctx.fillText(choice.toUpperCase(), bx + choiceBtnW / 2, btnY + 46);
    }
  }

  // Next round button
  if (rps.phase === 'roundResult') {
    const nrLabel = rps.rounds[rps.rounds.length - 1]?.result === 'tie' ? 'REPLAY' : 'NEXT ROUND';
    _casinoDrawButton(cx - 70, py + ph - 70, 140, 42, nrLabel, true, true);
  }

  _casinoDrawResult(px, py, pw, ph);
}

function _clickRPS(mx, my, px, py, pw, ph) {
  const rps = casinoState.rps;
  const cx = px + pw / 2;

  if (rps.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    // Format buttons
    const fmtBtnW = 140, fmtGap = 16;
    const fmtStartX = cx - (RPS_FORMATS.length * fmtBtnW + (RPS_FORMATS.length - 1) * fmtGap) / 2;
    for (let i = 0; i < RPS_FORMATS.length; i++) {
      const bx = fmtStartX + i * (fmtBtnW + fmtGap);
      if (_casinoHitBtn(mx, my, bx, py + 105, fmtBtnW, 36)) {
        rps.format = RPS_FORMATS[i].id; return true;
      }
    }
    // Play button
    if (_casinoHitBtn(mx, my, cx - 70, py + ph / 2 + 50, 140, 48) && gold >= _casinoBetInput) {
      casinoRPS_start(_casinoBetInput); return true;
    }
    return true;
  }

  if (rps.phase === 'choosing') {
    const btnY = py + ph - 80;
    const choiceBtnW = 130, choiceGap = 20;
    const startBtnX = cx - (3 * choiceBtnW + 2 * choiceGap) / 2;
    for (let i = 0; i < 3; i++) {
      const bx = startBtnX + i * (choiceBtnW + choiceGap);
      if (_casinoHitBtn(mx, my, bx, btnY, choiceBtnW, 52)) {
        casinoRPS_choose(RPS_CHOICES[i]); return true;
      }
    }
  }

  if (rps.phase === 'roundResult') {
    if (_casinoHitBtn(mx, my, cx - 70, py + ph - 70, 140, 42)) {
      casinoRPS_nextRound(); return true;
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  BACCARAT — Player vs Banker card game
// ═══════════════════════════════════════════════════════════════

const _BAC_BET_TYPES = [
  { id: 'player', label: 'PLAYER', color: '#4a9eff', desc: 'Pays 1:1', bg: '#0a1a3a' },
  { id: 'banker', label: 'BANKER', color: '#ff6666', desc: 'Pays 0.95:1', bg: '#3a0a0a' },
  { id: 'tie',    label: 'TIE',    color: '#ffd700', desc: 'Pays 8:1', bg: '#2a2a0a' },
];

let _bacSelectedBet = 'player';

function _drawBaccarat(px, py, pw, ph) {
  const bac = casinoState.bac;
  const cx = px + pw / 2;
  const now = Date.now();
  const _slideDur = 400;

  if (bac.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);

    // Bet type selector — centered
    ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText('Choose Your Bet:', cx, py + 85);

    const btnW = 160, btnH = 80, btnGap = 24;
    const totalW = 3 * btnW + 2 * btnGap;
    const startX = cx - totalW / 2;
    for (let i = 0; i < _BAC_BET_TYPES.length; i++) {
      const bt = _BAC_BET_TYPES[i];
      const bx = startX + i * (btnW + btnGap);
      const by = py + 100;
      const active = _bacSelectedBet === bt.id;
      ctx.fillStyle = active ? bt.bg : '#0a0a14';
      ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 8); ctx.fill();
      ctx.strokeStyle = active ? bt.color : '#333';
      ctx.lineWidth = active ? 3 : 1;
      ctx.beginPath(); ctx.roundRect(bx, by, btnW, btnH, 8); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = active ? bt.color : '#666';
      ctx.textAlign = 'center';
      ctx.fillText(bt.label, bx + btnW / 2, by + 35);
      ctx.font = '12px monospace';
      ctx.fillStyle = active ? '#aaa' : '#555';
      ctx.fillText(bt.desc, bx + btnW / 2, by + 58);
    }

    // Info text
    ctx.font = '13px monospace'; ctx.fillStyle = '#666'; ctx.textAlign = 'center';
    ctx.fillText('Tie returns your bet if you bet Player or Banker', cx, py + 210);
    ctx.fillText('Natural 8 or 9 = instant win  |  Closest to 9 wins', cx, py + 228);

    // Deal button
    _casinoDrawButton(cx - 70, py + 260, 140, 48, 'DEAL', gold >= _casinoBetInput, true);
    return;
  }

  // Dark navy background
  ctx.fillStyle = '#0f1923';
  ctx.beginPath(); ctx.roundRect(px + 8, py + 50, pw - 16, ph - 115, 10); ctx.fill();
  ctx.strokeStyle = '#1a2a3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px + 8, py + 50, pw - 16, ph - 115, 10); ctx.stroke();
  ctx.lineWidth = 1;

  // Bet info
  ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g on ' + bac.betType.toUpperCase(), px + pw - 20, py + 70);
  ctx.fillText('\u2B25 ' + gold + 'g', px + pw - 20, py + 88);

  // Draw hands with animation
  function _bacDrawHand(hand, label, labelColor, baseY) {
    const handW = hand.length * 56;
    const baseX = cx - handW / 2;
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    ctx.fillText(label, cx, baseY - 8);

    let allDone = true;
    for (let i = 0; i < hand.length; i++) {
      const card = hand[i];
      const elapsed = now - (card._addedAt || 0);
      if (elapsed < 0) continue;
      const slideT = Math.min(1, elapsed / _slideDur);
      if (slideT < 1) allDone = false;
      const eased = 1 - Math.pow(1 - slideT, 3);
      const targetX = baseX + i * 56;
      const cardX = cx + (targetX - cx) * eased;
      ctx.globalAlpha = Math.min(1, slideT * 1.5);
      _casinoDrawCard(cardX, baseY, card, false);
      ctx.globalAlpha = 1;
    }

    // Show hand value when all cards are visible
    if (allDone && hand.length > 0) {
      const val = _bacHandValue(hand);
      const totalX = baseX + hand.length * 56 + 12;
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = val >= 8 ? '#ffd700' : '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(val.toString(), totalX, baseY + 40);
    }
    return allDone;
  }

  // Banker hand (top)
  const bankerDone = _bacDrawHand(bac.bankerHand, 'BANKER', '#ff6666', py + 110);
  // Player hand (bottom)
  const playerDone = _bacDrawHand(bac.playerHand, 'PLAYER', '#4a9eff', py + 280);

  // Check animation completion
  if (bac.phase === 'dealing') {
    let latestTime = 0;
    for (const c of bac.playerHand) latestTime = Math.max(latestTime, c._addedAt || 0);
    for (const c of bac.bankerHand) latestTime = Math.max(latestTime, c._addedAt || 0);
    if (now - latestTime > _slideDur + 200 && playerDone && bankerDone) {
      if (bac._animateCallback) {
        bac._animateCallback();
        bac._animateCallback = null;
      }
    }
  }

  // Natural indicator
  if (playerDone && bankerDone && bac.playerHand.length >= 2 && bac.bankerHand.length >= 2) {
    const pVal = _bacHandValue(bac.playerHand);
    const bVal = _bacHandValue(bac.bankerHand);
    if ((pVal >= 8 || bVal >= 8) && bac.playerHand.length === 2 && bac.bankerHand.length === 2) {
      ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center';
      ctx.fillText('NATURAL!', cx, py + 240);
    }
  }

  // Result overlay
  if (bac.phase === 'result') {
    _casinoDrawResult(px, py, pw, ph);
  }
}

function _clickBaccarat(mx, my, px, py, pw, ph) {
  const bac = casinoState.bac;
  const cx = px + pw / 2;

  if (bac.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;

    // Bet type buttons
    const btnW = 160, btnH = 80, btnGap = 24;
    const totalW = 3 * btnW + 2 * btnGap;
    const startX = cx - totalW / 2;
    for (let i = 0; i < _BAC_BET_TYPES.length; i++) {
      const bx = startX + i * (btnW + btnGap);
      if (_casinoHitBtn(mx, my, bx, py + 100, btnW, btnH)) {
        _bacSelectedBet = _BAC_BET_TYPES[i].id;
        return true;
      }
    }

    // Deal button
    if (_casinoHitBtn(mx, my, cx - 70, py + 260, 140, 48) && gold >= _casinoBetInput) {
      casinoBAC_deal(_casinoBetInput, _bacSelectedBet);
      return true;
    }
    return true;
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  SLOTS — 3-reel classic slot machine
// ═══════════════════════════════════════════════════════════════

function _drawSlots(px, py, pw, ph) {
  const sl = casinoState.sl;
  const cx = px + pw / 2;
  // Machine background
  ctx.fillStyle = '#0f1923';
  ctx.beginPath(); ctx.roundRect(px + 8, py + 50, pw - 16, ph - 115, 10); ctx.fill();
  ctx.strokeStyle = '#1a2a3a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px + 8, py + 50, pw - 16, ph - 115, 10); ctx.stroke();
  ctx.lineWidth = 1;

  // Jackpot meter at top
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('JACKPOT: ' + Math.floor(sl.jackpotPool) + 'g', cx, py + 72);
  // Decorative lights around jackpot
  const lightPhase = Math.floor(Date.now() / 200) % 6;
  for (let i = 0; i < 6; i++) {
    const lx = cx - 120 + i * 48;
    const on = (i + lightPhase) % 3 === 0;
    ctx.fillStyle = on ? '#ffcc00' : '#332200';
    ctx.beginPath(); ctx.arc(lx, py + 82, 4, 0, Math.PI * 2); ctx.fill();
  }

  // 3 reel windows
  const reelW = 120, reelH = 120, reelGap = 20;
  const reelsStartX = cx - (3 * reelW + 2 * reelGap) / 2;
  const reelY = py + 100;

  for (let i = 0; i < 3; i++) {
    const rx = reelsStartX + i * (reelW + reelGap);
    // Reel frame
    ctx.fillStyle = '#111e2e';
    ctx.beginPath(); ctx.roundRect(rx, reelY, reelW, reelH, 6); ctx.fill();
    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(rx, reelY, reelW, reelH, 6); ctx.stroke();
    ctx.lineWidth = 1;

    if (sl.phase === 'spinning') {
      const elapsed = Date.now() - sl.spinTimer;
      const reelStopTime = SLOTS_CONFIG.SPIN_DURATION - (2 - i) * SLOTS_CONFIG.REEL_STAGGER;
      if (elapsed < reelStopTime) {
        // Spinning animation — show random symbols scrolling
        ctx.save();
        ctx.beginPath(); ctx.roundRect(rx + 2, reelY + 2, reelW - 4, reelH - 4, 4); ctx.clip();
        const speed = 8;
        const offset = (elapsed * speed / 16) % 60;
        for (let sy = -1; sy <= 2; sy++) {
          const symIdx = (Math.floor(elapsed / 80) + sy + i * 7) % SLOTS_SYMBOLS.length;
          const sym = SLOTS_SYMBOLS[Math.abs(symIdx) % SLOTS_SYMBOLS.length];
          const display = SLOTS_SYMBOL_DISPLAY[sym];
          const drawY = reelY + reelH / 2 + sy * 50 - offset + 10;
          ctx.font = '36px serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = display.color;
          ctx.fillText(display.emoji, rx + reelW / 2, drawY);
        }
        ctx.restore();
      } else {
        // This reel has stopped — show final symbol
        _drawSlotSymbol(rx, reelY, reelW, reelH, sl.reels[i]);
      }
    } else if (sl.phase === 'result' || sl.phase === 'betting') {
      // Show result or idle
      if (sl.reels[i]) {
        _drawSlotSymbol(rx, reelY, reelW, reelH, sl.reels[i]);
      } else {
        // Idle — show question marks
        ctx.font = 'bold 44px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#333';
        ctx.fillText('?', rx + reelW / 2, reelY + reelH / 2 + 16);
      }
    }
  }

  // Center line across reels
  ctx.strokeStyle = '#ff4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(reelsStartX - 10, reelY + reelH / 2);
  ctx.lineTo(reelsStartX + 3 * reelW + 2 * reelGap + 10, reelY + reelH / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineWidth = 1;

  // Paytable (right side)
  const ptX = cx + 160, ptY = py + 245;
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#888';
  ctx.fillText('PAYTABLE', ptX, ptY);
  const payEntries = [
    ['🍒🍒🍒', '2x'], ['🍋🍋🍋', '3x'], ['🍊🍊🍊', '4x'],
    ['🍇🍇🍇', '6x'], ['🔔🔔🔔', '10x'], ['📊📊📊', '20x'],
    ['7️⃣7️⃣7️⃣', 'JACKPOT'], ['🍒🍒×', '1x'],
  ];
  for (let i = 0; i < payEntries.length; i++) {
    ctx.fillStyle = '#aaa';
    ctx.fillText(payEntries[i][0], ptX, ptY + 15 + i * 14);
    ctx.fillStyle = payEntries[i][1] === 'JACKPOT' ? '#ffd700' : '#5fca80';
    ctx.fillText(payEntries[i][1], ptX + 60, ptY + 15 + i * 14);
  }

  // Auto-resolve when spin animation completes
  if (sl.phase === 'spinning') {
    const elapsed = Date.now() - sl.spinTimer;
    if (elapsed >= SLOTS_CONFIG.SPIN_DURATION + 200) {
      casinoSL_resolve();
    }
  }

  // Betting UI or Spin button
  if (sl.phase === 'betting') {
    // Spin button
    _casinoDrawButton(cx - 70, py + 240, 140, 48, 'SPIN', gold >= _casinoBetInput, true);
    // Bet controls
    _casinoDrawBetControls(px, py);
  }

  // Result overlay
  if (sl.phase === 'result') {
    _casinoDrawResult(px, py, pw, ph);
  }
}

function _drawSlotSymbol(rx, ry, rw, rh, symbol) {
  const display = SLOTS_SYMBOL_DISPLAY[symbol];
  if (!display) return;
  ctx.font = '44px serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = display.color;
  ctx.fillText(display.emoji, rx + rw / 2, ry + rh / 2 + 16);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText(display.label, rx + rw / 2, ry + rh - 8);
}

function _clickSlots(mx, my, px, py, pw, ph) {
  const sl = casinoState.sl;
  const cx = px + pw / 2;

  if (sl.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    // Spin button
    if (_casinoHitBtn(mx, my, cx - 70, py + 240, 140, 48) && gold >= _casinoBetInput) {
      casinoSL_spin(_casinoBetInput);
      return true;
    }
    return true;
  }

  return true; // consume clicks during spin/result
}

// ═══════════════════════════════════════════════════════════════
//  KENO — Pick numbers, watch the draw
// ═══════════════════════════════════════════════════════════════

function _drawKeno(px, py, pw, ph) {
  const kn = casinoState.kn;
  const cx = px + pw / 2;
  // Stake-style dark background
  ctx.fillStyle = '#0f1923';
  ctx.beginPath(); ctx.roundRect(px + 8, py + 48, pw - 16, ph - 112, 8); ctx.fill();

  // Number grid (8x5)
  const cols = KENO_CONFIG.BOARD_COLS, rows = KENO_CONFIG.BOARD_ROWS;
  const cellW = 72, cellH = 52;
  const gridW = cols * cellW, gridH = rows * cellH;
  const gridX = cx - gridW / 2;
  const gridY = py + 56;

  const drawnSet = new Set(kn.drawn.slice(0, kn.drawIndex));
  const picksSet = new Set(kn.picks);
  const drawingDone = kn.phase === 'result' || kn.drawIndex >= KENO_CONFIG.DRAW_COUNT;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const num = r * cols + c + 1;
      if (num > KENO_CONFIG.BOARD_SIZE) break;
      const nx = gridX + c * cellW, ny = gridY + r * cellH;
      const isPicked = picksSet.has(num);
      const isDrawn = drawnSet.has(num);
      const isMatch = isPicked && isDrawn;
      const isMiss = isPicked && drawingDone && !isDrawn;

      // Cell background
      if (isMatch) {
        // Green gem match - purple border + green fill
        ctx.fillStyle = '#7b2fbe';
        ctx.beginPath(); ctx.roundRect(nx + 2, ny + 2, cellW - 4, cellH - 4, 6); ctx.fill();
        ctx.fillStyle = '#0a2a0a';
        ctx.beginPath(); ctx.roundRect(nx + 5, ny + 5, cellW - 10, cellH - 10, 4); ctx.fill();
      } else if (isDrawn && !isPicked) {
        ctx.fillStyle = '#111e2e';
        ctx.beginPath(); ctx.roundRect(nx + 2, ny + 2, cellW - 4, cellH - 4, 6); ctx.fill();
      } else if (isPicked) {
        ctx.fillStyle = '#7b2fbe';
        ctx.beginPath(); ctx.roundRect(nx + 2, ny + 2, cellW - 4, cellH - 4, 6); ctx.fill();
      } else {
        ctx.fillStyle = '#1a2535';
        ctx.beginPath(); ctx.roundRect(nx + 2, ny + 2, cellW - 4, cellH - 4, 6); ctx.fill();
      }

      // Number text
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      if (isMatch) {
        // Green gem diamond icon
        ctx.fillStyle = '#00e701';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('\u25C6', nx + cellW / 2, ny + cellH / 2 - 4);
        ctx.font = 'bold 12px monospace';
        ctx.fillText(num.toString(), nx + cellW / 2, ny + cellH / 2 + 14);
      } else if (isMiss) {
        ctx.fillStyle = '#b83232';
        ctx.fillText(num.toString(), nx + cellW / 2, ny + cellH / 2 + 6);
      } else if (isDrawn) {
        ctx.fillStyle = '#556';
        ctx.fillText(num.toString(), nx + cellW / 2, ny + cellH / 2 + 6);
      } else if (isPicked) {
        ctx.fillStyle = '#fff';
        ctx.fillText(num.toString(), nx + cellW / 2, ny + cellH / 2 + 6);
      } else {
        ctx.fillStyle = '#8899aa';
        ctx.fillText(num.toString(), nx + cellW / 2, ny + cellH / 2 + 6);
      }
    }
  }

  // Risk selector (right side of grid)
  const riskX = gridX + gridW + 12;
  const riskBtnW = 70, riskBtnH = 28, riskGap = 4;
  const risks = KENO_CONFIG.RISK_LEVELS;
  const riskColors = { low: '#2a8a4a', medium: '#cc8800', high: '#cc2222' };
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#556';
  ctx.fillText('RISK', riskX + riskBtnW / 2, gridY - 2);
  for (let i = 0; i < risks.length; i++) {
    const ry = gridY + 4 + i * (riskBtnH + riskGap);
    const isActive = kn.risk === risks[i];
    ctx.fillStyle = isActive ? riskColors[risks[i]] : '#111e2e';
    ctx.beginPath(); ctx.roundRect(riskX, ry, riskBtnW, riskBtnH, 4); ctx.fill();
    if (isActive) {
      ctx.strokeStyle = riskColors[risks[i]];
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(riskX, ry, riskBtnW, riskBtnH, 4); ctx.stroke();
    }
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = isActive ? '#fff' : '#667';
    ctx.fillText(risks[i].charAt(0).toUpperCase() + risks[i].slice(1), riskX + riskBtnW / 2, ry + riskBtnH / 2 + 4);
  }

  // Payout multiplier strip (below grid) — shows ALL match counts 0 through picks
  const stripY = gridY + gridH + 6;
  const riskTable = KENO_CONFIG.PAYOUTS[kn.risk] || KENO_CONFIG.PAYOUTS.medium;
  if (kn.picks.length > 0) {
    const payoutTable = riskTable[kn.picks.length] || {};
    const totalSlots = kn.picks.length + 1; // 0 through picks
    const stripW = Math.min(70, (gridW - 8) / totalSlots);
    const totalStripW = totalSlots * stripW;
    const stripStartX = cx - totalStripW / 2;
    for (let m = 0; m < totalSlots; m++) {
      const sx = stripStartX + m * stripW;
      const mult = payoutTable[m] || 0;
      const isCurrentMatch = kn.matches === m && drawingDone;
      const hasValue = mult > 0;
      ctx.fillStyle = isCurrentMatch ? (hasValue ? '#0a2a0a' : '#1a1010') : '#111e2e';
      ctx.beginPath(); ctx.roundRect(sx + 1, stripY, stripW - 2, 22, 3); ctx.fill();
      if (isCurrentMatch) {
        ctx.strokeStyle = hasValue ? '#00e701' : '#aa3333';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(sx + 1, stripY, stripW - 2, 22, 3); ctx.stroke();
      }
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      if (isCurrentMatch) {
        ctx.fillStyle = hasValue ? '#00e701' : '#aa3333';
      } else {
        ctx.fillStyle = hasValue ? '#889' : '#445';
      }
      const dispText = mult === 0 ? '0.00x' : mult >= 100 ? Math.floor(mult) + 'x' : mult.toFixed(2) + 'x';
      ctx.fillText(dispText, sx + stripW / 2, stripY + 15);
    }

    // Match counter bar (below strip)
    const barY = stripY + 28;
    const barCellW = stripW; // same width as payout strip
    const barStartX = stripStartX;
    for (let m = 0; m < totalSlots; m++) {
      const bx = barStartX + m * barCellW;
      const isCurrent = kn.matches === m && drawingDone;
      const isPast = kn.matches > m && kn.phase !== 'picking';
      ctx.fillStyle = isCurrent ? '#00e701' : '#111e2e';
      ctx.beginPath(); ctx.roundRect(bx + 1, barY, barCellW - 2, 22, 3); ctx.fill();
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isCurrent ? '#000' : isPast ? '#556' : '#667';
      ctx.fillText(m + 'x', bx + barCellW / 2, barY + 15);
    }
  }

  // Info text
  const infoY = stripY + 28 + 22 + 10;
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';

  if (kn.phase === 'picking') {
    ctx.fillStyle = '#8899aa';
    ctx.fillText('Pick ' + kn.picks.length + '/' + KENO_CONFIG.MAX_PICKS + ' numbers', cx, infoY);
    // Clear + Start buttons
    const btnY = infoY + 8;
    _casinoDrawButton(cx - 160, btnY, 100, 34, 'Clear', kn.picks.length > 0, false);
    _casinoDrawButton(cx - 40, btnY, 120, 34, 'Bet', kn.picks.length > 0 && gold >= _casinoBetInput, true);
    _casinoDrawBetControls(px, py);
  } else if (kn.phase === 'drawing') {
    const elapsed = Date.now() - kn.drawTimer;
    if (elapsed >= KENO_CONFIG.DRAW_INTERVAL && kn.drawIndex < KENO_CONFIG.DRAW_COUNT) {
      const more = _knDrawNext();
      if (!more) {
        setTimeout(function() { casinoKN_resolve(); }, 100);
      }
    }
    ctx.fillStyle = '#fff';
    ctx.fillText('Drawing... ' + kn.drawIndex + '/' + KENO_CONFIG.DRAW_COUNT + '  Matches: ' + kn.matches, cx, infoY);
  }

  // Win result overlay (losses auto-reset, no overlay)
  if (kn.phase === 'result' && casinoState.result) {
    _casinoDrawResult(px, py, pw, ph);
  }
}

function _clickKeno(mx, my, px, py, pw, ph) {
  const kn = casinoState.kn;
  const cx = px + pw / 2;

  if (kn.phase === 'picking') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;

    // Risk selector clicks
    const cols = KENO_CONFIG.BOARD_COLS, rows = KENO_CONFIG.BOARD_ROWS;
    const cellW = 72, cellH = 52;
    const gridW = cols * cellW;
    const gridX = cx - gridW / 2;
    const gridY = py + 56;
    const riskX = gridX + gridW + 12;
    const riskBtnW = 70, riskBtnH = 28, riskGap = 4;
    const risks = KENO_CONFIG.RISK_LEVELS;
    for (let i = 0; i < risks.length; i++) {
      const ry = gridY + 4 + i * (riskBtnH + riskGap);
      if (_casinoHitBtn(mx, my, riskX, ry, riskBtnW, riskBtnH)) {
        kn.risk = risks[i];
        return true;
      }
    }

    // Number grid clicks
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const num = r * cols + c + 1;
        if (num > KENO_CONFIG.BOARD_SIZE) break;
        const nx = gridX + c * cellW, ny = gridY + r * cellH;
        if (_casinoHitBtn(mx, my, nx + 2, ny + 2, cellW - 4, cellH - 4)) {
          casinoKN_togglePick(num);
          return true;
        }
      }
    }

    // Clear + Bet buttons (match _drawKeno layout)
    const gridH = rows * cellH;
    const stripY = gridY + gridH + 6;
    const infoY = stripY + 28 + 22 + 10;
    const btnY = infoY + 8;
    if (_casinoHitBtn(mx, my, cx - 160, btnY, 100, 34)) {
      casinoKN_clearPicks();
      return true;
    }
    if (_casinoHitBtn(mx, my, cx - 40, btnY, 120, 34) && kn.picks.length > 0 && gold >= _casinoBetInput) {
      casinoKN_start(_casinoBetInput);
      return true;
    }
    return true;
  }

  return true;
}
