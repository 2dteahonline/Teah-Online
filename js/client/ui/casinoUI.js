// ═══════════════════════════════════════════════════════════════
//  CASINO UI — Drawing + click handling for all 6 casino games
//  Client-only: renders panels, handles mouse clicks, dispatches
//  to casinoSystem.js for game logic
// ═══════════════════════════════════════════════════════════════

const _CASINO_PW = 720, _CASINO_PH = 520;
let _casinoBetInput = 100;   // current bet amount selected by player
let _casinoRL_selectedBet = null; // roulette: which bet type is selected

// ═══════════════════════════════════════════════════════════════
//  COMMON UI HELPERS
// ═══════════════════════════════════════════════════════════════

function _casinoGetPanelXY() {
  return { px: (BASE_W - _CASINO_PW) / 2, py: (BASE_H - _CASINO_PH) / 2 };
}

function _casinoDrawButton(x, y, w, h, label, enabled, highlight) {
  ctx.fillStyle = !enabled ? '#1a1a2a' : highlight ? '#3a5a2a' : '#2a2a4a';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = !enabled ? '#333' : highlight ? '#5a8a4a' : '#4a4a7a';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = enabled ? '#fff' : '#555';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
}

function _casinoHitBtn(mx, my, x, y, w, h) {
  return mx >= x && mx <= x + w && my >= y && my <= y + h;
}

function _casinoDrawCard(x, y, card, faceDown) {
  const cw = 44, ch = 62;
  if (faceDown) {
    ctx.fillStyle = '#2244aa';
    ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4); ctx.fill();
    ctx.strokeStyle = '#3366cc';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4); ctx.stroke();
    // Pattern
    ctx.strokeStyle = '#4477dd';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8); ctx.lineTo(x + cw - 8, y + ch - 8);
    ctx.moveTo(x + cw - 8, y + 8); ctx.lineTo(x + 8, y + ch - 8);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4); ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 4); ctx.stroke();
  ctx.fillStyle = card.color === 'red' ? '#cc1111' : '#111';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(card.rank, x + 4, y + 16);
  ctx.font = '16px serif';
  ctx.fillText(card.suit, x + 4, y + 34);
  // Bottom-right mirror
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(card.rank, x + cw - 4, y + ch - 6);
}

function _casinoDrawDie(x, y, size, value) {
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.roundRect(x, y, size, size, 6); ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, size, size, 6); ctx.stroke();
  ctx.lineWidth = 1;
  ctx.fillStyle = '#111';
  const cx = x + size / 2, cy = y + size / 2;
  const d = size * 0.25;
  const dot = (dx, dy) => { ctx.beginPath(); ctx.arc(dx, dy, size * 0.06, 0, Math.PI * 2); ctx.fill(); };
  if (value === 1) { dot(cx, cy); }
  else if (value === 2) { dot(cx - d, cy - d); dot(cx + d, cy + d); }
  else if (value === 3) { dot(cx - d, cy - d); dot(cx, cy); dot(cx + d, cy + d); }
  else if (value === 4) { dot(cx - d, cy - d); dot(cx + d, cy - d); dot(cx - d, cy + d); dot(cx + d, cy + d); }
  else if (value === 5) { dot(cx - d, cy - d); dot(cx + d, cy - d); dot(cx, cy); dot(cx - d, cy + d); dot(cx + d, cy + d); }
  else if (value === 6) { dot(cx - d, cy - d); dot(cx + d, cy - d); dot(cx - d, cy); dot(cx + d, cy); dot(cx - d, cy + d); dot(cx + d, cy + d); }
}

// ═══════════════════════════════════════════════════════════════
//  BET CONTROLS — shared across games
// ═══════════════════════════════════════════════════════════════

function _casinoDrawBetControls(px, py, pw) {
  const bx = px + 20, by = py + _CASINO_PH - 70;
  // Gold display
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Gold: ' + gold, bx, by - 6);

  // Current bet
  ctx.fillStyle = '#aaa';
  ctx.fillText('Bet: ' + _casinoBetInput, bx + 160, by - 6);

  // Preset buttons
  const presets = CASINO_CONFIG.BET_PRESETS;
  const btnW = 70, btnH = 28, gap = 6;
  const startX = bx;
  for (let i = 0; i < presets.length; i++) {
    const bx2 = startX + i * (btnW + gap);
    if (bx2 + btnW > px + pw - 20) break;
    const active = _casinoBetInput === presets[i];
    ctx.fillStyle = active ? '#3a5a2a' : '#1a1a2e';
    ctx.beginPath(); ctx.roundRect(bx2, by + 4, btnW, btnH, 4); ctx.fill();
    ctx.strokeStyle = active ? '#5a8a4a' : '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx2, by + 4, btnW, btnH, 4); ctx.stroke();
    ctx.font = '12px monospace';
    ctx.fillStyle = gold >= presets[i] ? '#fff' : '#555';
    ctx.textAlign = 'center';
    ctx.fillText(presets[i] + 'g', bx2 + btnW / 2, by + 22);
  }
  ctx.textAlign = 'left';
}

function _casinoHandleBetClick(mx, my, px, py, pw) {
  const bx = px + 20, by = py + _CASINO_PH - 70;
  const presets = CASINO_CONFIG.BET_PRESETS;
  const btnW = 70, btnH = 28, gap = 6;
  for (let i = 0; i < presets.length; i++) {
    const bx2 = bx + i * (btnW + gap);
    if (bx2 + btnW > px + pw - 20) break;
    if (_casinoHitBtn(mx, my, bx2, by + 4, btnW, btnH)) {
      _casinoBetInput = presets[i];
      return true;
    }
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  RESULT OVERLAY
// ═══════════════════════════════════════════════════════════════

function _casinoDrawResult(px, py, pw, ph) {
  if (!casinoState.result) return false;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(px + 4, py + 50, pw - 8, ph - 100);

  const r = casinoState.result;
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = r.won ? '#5fca80' : '#ff4a4a';
  ctx.fillText(r.won ? 'WIN!' : 'LOSE', px + pw / 2, py + ph / 2 - 30);

  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = r.won ? '#ffd700' : '#ff6666';
  ctx.fillText(r.message, px + pw / 2, py + ph / 2 + 10);

  // Play Again button
  _casinoDrawButton(px + pw / 2 - 80, py + ph / 2 + 40, 160, 40, 'Play Again', true, false);
  ctx.textAlign = 'left';
  return true;
}

function _casinoHandleResultClick(mx, my, px, py, pw, ph) {
  if (!casinoState.result) return false;
  if (_casinoHitBtn(mx, my, px + pw / 2 - 80, py + ph / 2 + 40, 160, 40)) {
    casinoResetGame();
    return true;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN PANEL DRAW
// ═══════════════════════════════════════════════════════════════

function drawCasinoPanel() {
  if (!UI.isOpen('casino') || !casinoState.activeGame) return;

  const { px, py } = _casinoGetPanelXY();
  const pw = _CASINO_PW, ph = _CASINO_PH;

  // Dimmed backdrop
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = '#0a0a14';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,0,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke();

  // Title bar
  ctx.fillStyle = 'rgba(40,30,10,0.6)';
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, 42, [10, 10, 0, 0]); ctx.fill();
  const gameLabel = CASINO_GAMES.find(g => g.id === casinoState.activeGame);
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'center';
  ctx.fillText(gameLabel ? gameLabel.label.toUpperCase() : 'CASINO', px + pw / 2, py + 30);

  // Close button
  ctx.fillStyle = '#4a1a1a';
  ctx.beginPath(); ctx.roundRect(px + pw - 42, py + 8, 32, 32, 6); ctx.fill();
  ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#fff';
  ctx.textAlign = 'center'; ctx.fillText('\u2715', px + pw - 26, py + 30);

  // Dispatch to game-specific draw
  const g = casinoState.activeGame;
  if (g === 'blackjack') _drawBlackjack(px, py, pw, ph);
  else if (g === 'roulette') _drawRoulette(px, py, pw, ph);
  else if (g === 'headsOrTails') _drawHeadsOrTails(px, py, pw, ph);
  else if (g === 'cases') _drawCases(px, py, pw, ph);
  else if (g === 'mines') _drawMines(px, py, pw, ph);
  else if (g === 'dice') _drawDice(px, py, pw, ph);

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

  // Outside panel
  if (mx < px || mx > px + pw || my < py || my > py + ph) {
    UI.close(); return true;
  }
  // Close button
  if (_casinoHitBtn(mx, my, px + pw - 42, py + 8, 32, 32)) {
    UI.close(); return true;
  }

  // Result overlay takes priority
  if (_casinoHandleResultClick(mx, my, px, py, pw, ph)) return true;

  // Dispatch to game-specific click
  const g = casinoState.activeGame;
  if (g === 'blackjack') return _clickBlackjack(mx, my, px, py, pw, ph);
  if (g === 'roulette') return _clickRoulette(mx, my, px, py, pw, ph);
  if (g === 'headsOrTails') return _clickHeadsOrTails(mx, my, px, py, pw, ph);
  if (g === 'cases') return _clickCases(mx, my, px, py, pw, ph);
  if (g === 'mines') return _clickMines(mx, my, px, py, pw, ph);
  if (g === 'dice') return _clickDice(mx, my, px, py, pw, ph);
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  BLACKJACK
// ═══════════════════════════════════════════════════════════════

function _drawBlackjack(px, py, pw, ph) {
  const bj = casinoState.bj;
  const cx = px + pw / 2;

  if (bj.phase === 'betting') {
    // Bet controls
    _casinoDrawBetControls(px, py, pw);
    // Deal button
    _casinoDrawButton(cx - 60, py + ph / 2 - 30, 120, 44, 'DEAL', gold >= _casinoBetInput, true);
    // Instructions
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Place your bet and deal', cx, py + 80);
    return;
  }

  // Draw dealer hand
  ctx.font = '13px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'left';
  ctx.fillText('Dealer', px + 20, py + 70);
  const showDealer = bj.phase === 'dealer' || bj.phase === 'result';
  for (let i = 0; i < bj.dealerHand.length; i++) {
    _casinoDrawCard(px + 40 + i * 52, py + 80, bj.dealerHand[i], i === 1 && !showDealer);
  }
  if (showDealer) {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = _bjIsBust(bj.dealerHand) ? '#ff4a4a' : '#fff';
    ctx.fillText(_bjHandValue(bj.dealerHand).toString(), px + 40 + bj.dealerHand.length * 52 + 10, py + 118);
  }

  // Draw player hand
  ctx.font = '13px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'left';
  const playerLabel = bj.splitHand && !bj.playingSplit ? 'Hand 1 ▸' : bj.splitHand ? 'Hand 1' : 'Player';
  ctx.fillText(playerLabel, px + 20, py + 200);
  for (let i = 0; i < bj.playerHand.length; i++) {
    _casinoDrawCard(px + 40 + i * 52, py + 210, bj.playerHand[i], false);
  }
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = _bjIsBust(bj.playerHand) ? '#ff4a4a' : '#5fca80';
  ctx.fillText(_bjHandValue(bj.playerHand).toString(), px + 40 + bj.playerHand.length * 52 + 10, py + 248);

  // Draw split hand if exists
  if (bj.splitHand) {
    const splitLabel = bj.playingSplit ? 'Hand 2 ▸' : 'Hand 2';
    ctx.font = '13px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(splitLabel, px + 20, py + 300);
    for (let i = 0; i < bj.splitHand.length; i++) {
      _casinoDrawCard(px + 40 + i * 52, py + 310, bj.splitHand[i], false);
    }
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = _bjIsBust(bj.splitHand) ? '#ff4a4a' : '#5fca80';
    ctx.fillText(_bjHandValue(bj.splitHand).toString(), px + 40 + bj.splitHand.length * 52 + 10, py + 348);
  }

  // Bet amount display
  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 20, py + 70);

  // Action buttons (during player phase)
  if (bj.phase === 'player') {
    const btnY = py + ph - 80;
    const btns = [];
    btns.push({ label: 'Hit', x: cx - 220, enabled: true });
    btns.push({ label: 'Stand', x: cx - 105, enabled: true });
    btns.push({ label: 'Double', x: cx + 10, enabled: casinoBJ_canDouble() });
    btns.push({ label: 'Split', x: cx + 125, enabled: casinoBJ_canSplit() });
    for (const b of btns) {
      _casinoDrawButton(b.x, btnY, 105, 38, b.label, b.enabled, false);
    }
  }

  // Result
  _casinoDrawResult(px, py, pw, ph);
}

function _clickBlackjack(mx, my, px, py, pw, ph) {
  const bj = casinoState.bj;
  const cx = px + pw / 2;

  if (bj.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    // Deal button
    if (_casinoHitBtn(mx, my, cx - 60, py + ph / 2 - 30, 120, 44) && gold >= _casinoBetInput) {
      if (casinoPlaceBet(_casinoBetInput)) {
        casinoBJ_deal();
      }
      return true;
    }
    return true;
  }

  if (bj.phase === 'player') {
    const btnY = py + ph - 80;
    if (_casinoHitBtn(mx, my, cx - 220, btnY, 105, 38)) { casinoBJ_hit(); return true; }
    if (_casinoHitBtn(mx, my, cx - 105, btnY, 105, 38)) { casinoBJ_stand(); return true; }
    if (_casinoHitBtn(mx, my, cx + 10, btnY, 105, 38) && casinoBJ_canDouble()) { casinoBJ_double(); return true; }
    if (_casinoHitBtn(mx, my, cx + 125, btnY, 105, 38) && casinoBJ_canSplit()) { casinoBJ_split(); return true; }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  ROULETTE
// ═══════════════════════════════════════════════════════════════

function _drawRoulette(px, py, pw, ph) {
  const rl = casinoState.rl;

  if (rl.phase === 'spinning') {
    // Spin animation — cycling numbers
    const elapsed = Date.now() - rl.spinTimer;
    if (elapsed > 2000) {
      casinoRL_resolve();
      return;
    }
    const speed = Math.max(50, 300 - elapsed * 0.1);
    const displayNum = Math.floor(Date.now() / speed) % 37;
    const displayColor = ROULETTE_REDS.has(displayNum) ? '#cc1111' : displayNum === 0 ? '#00aa00' : '#111';
    ctx.font = 'bold 80px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = displayColor;
    ctx.fillText(displayNum.toString(), px + pw / 2, py + ph / 2 + 20);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Spinning...', px + pw / 2, py + ph / 2 + 60);
    return;
  }

  if (rl.phase === 'result') {
    // Show result number
    const n = rl.resultNumber;
    const col = ROULETTE_REDS.has(n) ? '#cc1111' : n === 0 ? '#00aa00' : '#111';
    ctx.font = 'bold 60px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    ctx.fillText(n.toString(), px + pw / 2, py + 140);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(ROULETTE_REDS.has(n) ? 'Red' : n === 0 ? 'Green' : 'Black', px + pw / 2, py + 165);
    _casinoDrawResult(px, py, pw, ph);
    return;
  }

  // BETTING PHASE — draw roulette grid + bet options
  const gridX = px + 20, gridY = py + 60;
  const cellW = 38, cellH = 28;

  // Zero
  ctx.fillStyle = '#006600';
  ctx.fillRect(gridX, gridY, cellW, cellH * 3);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(gridX, gridY, cellW, cellH * 3);
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('0', gridX + cellW / 2, gridY + cellH * 1.5 + 5);

  // Number grid: 3 rows × 12 cols
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const num = col * 3 + (3 - row); // 1-36 in standard layout
      const cx2 = gridX + cellW + col * cellW;
      const cy2 = gridY + row * cellH;
      ctx.fillStyle = ROULETTE_REDS.has(num) ? '#881111' : '#111';
      ctx.fillRect(cx2, cy2, cellW, cellH);
      ctx.strokeStyle = '#555';
      ctx.strokeRect(cx2, cy2, cellW, cellH);
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(num.toString(), cx2 + cellW / 2, cy2 + cellH / 2 + 4);
    }
  }

  // Outside bets buttons (below grid)
  const obY = gridY + cellH * 3 + 10;
  const outsideBets = [
    { type: 'red', label: 'Red', color: '#881111' },
    { type: 'black', label: 'Black', color: '#111' },
    { type: 'odd', label: 'Odd', color: '#2a2a4a' },
    { type: 'even', label: 'Even', color: '#2a2a4a' },
    { type: 'low', label: '1-18', color: '#2a2a4a' },
    { type: 'high', label: '19-36', color: '#2a2a4a' },
  ];
  const obW = 72, obH = 30, obGap = 6;
  for (let i = 0; i < outsideBets.length; i++) {
    const bx = gridX + i * (obW + obGap);
    const ob = outsideBets[i];
    ctx.fillStyle = _casinoRL_selectedBet === ob.type ? '#3a5a2a' : ob.color;
    ctx.beginPath(); ctx.roundRect(bx, obY, obW, obH, 4); ctx.fill();
    ctx.strokeStyle = _casinoRL_selectedBet === ob.type ? '#5a8a4a' : '#555';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, obY, obW, obH, 4); ctx.stroke();
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(ob.label, bx + obW / 2, obY + obH / 2 + 4);
  }

  // Dozen + Column bets
  const dcY = obY + obH + 8;
  const dcBets = [
    { type: 'dozen1', label: '1st 12' }, { type: 'dozen2', label: '2nd 12' },
    { type: 'dozen3', label: '3rd 12' }, { type: 'col1', label: 'Col 1' },
    { type: 'col2', label: 'Col 2' }, { type: 'col3', label: 'Col 3' },
  ];
  for (let i = 0; i < dcBets.length; i++) {
    const bx = gridX + i * (obW + obGap);
    const db = dcBets[i];
    ctx.fillStyle = _casinoRL_selectedBet === db.type ? '#3a5a2a' : '#1a1a2e';
    ctx.beginPath(); ctx.roundRect(bx, dcY, obW, obH, 4); ctx.fill();
    ctx.strokeStyle = _casinoRL_selectedBet === db.type ? '#5a8a4a' : '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, dcY, obW, obH, 4); ctx.stroke();
    ctx.font = '11px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(db.label, bx + obW / 2, dcY + obH / 2 + 4);
  }

  // Current bets list (right side)
  const listX = px + pw - 200, listY = py + 60;
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'left';
  ctx.fillText('Your Bets:', listX, listY);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#ccc';
  for (let i = 0; i < Math.min(rl.bets.length, 10); i++) {
    const b = rl.bets[i];
    const label = ROULETTE_BET_TYPES[b.type] ? ROULETTE_BET_TYPES[b.type].label : b.type + ':' + b.value;
    ctx.fillText(label + ' — ' + b.amount + 'g', listX, listY + 20 + i * 18);
  }
  if (rl.bets.length > 10) {
    ctx.fillText('... +' + (rl.bets.length - 10) + ' more', listX, listY + 20 + 10 * 18);
  }
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Total: ' + rl.totalBet + 'g', listX, listY + 20 + Math.min(rl.bets.length, 10) * 18 + 16);

  // Spin + Clear buttons
  const spinY = py + ph - 80;
  _casinoDrawButton(px + pw / 2 - 140, spinY, 120, 40, 'SPIN', rl.bets.length > 0, true);
  _casinoDrawButton(px + pw / 2 + 20, spinY, 120, 40, 'Clear Bets', rl.bets.length > 0, false);

  // Bet controls
  _casinoDrawBetControls(px, py, pw);

  // Instruction
  if (!_casinoRL_selectedBet) {
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Select a bet type, then click a number or outside bet', px + pw / 2, spinY - 10);
  }
}

function _clickRoulette(mx, my, px, py, pw, ph) {
  const rl = casinoState.rl;
  if (rl.phase !== 'betting') return true;

  const gridX = px + 20, gridY = py + 60;
  const cellW = 38, cellH = 28;
  const obY = gridY + cellH * 3 + 10;
  const obW = 72, obH = 30, obGap = 6;
  const dcY = obY + obH + 8;

  // Bet preset clicks
  if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;

  // Spin button
  const spinY = py + ph - 80;
  if (_casinoHitBtn(mx, my, px + pw / 2 - 140, spinY, 120, 40) && rl.bets.length > 0) {
    casinoRL_spin();
    return true;
  }
  // Clear button
  if (_casinoHitBtn(mx, my, px + pw / 2 + 20, spinY, 120, 40) && rl.bets.length > 0) {
    casinoRL_clearBets();
    return true;
  }

  // Zero click
  if (mx >= gridX && mx <= gridX + cellW && my >= gridY && my <= gridY + cellH * 3) {
    casinoRL_placeBet('straight', 0, _casinoBetInput);
    return true;
  }

  // Number grid click (straight bet)
  for (let col = 0; col < 12; col++) {
    for (let row = 0; row < 3; row++) {
      const cx2 = gridX + cellW + col * cellW;
      const cy2 = gridY + row * cellH;
      if (_casinoHitBtn(mx, my, cx2, cy2, cellW, cellH)) {
        const num = col * 3 + (3 - row);
        casinoRL_placeBet('straight', num, _casinoBetInput);
        return true;
      }
    }
  }

  // Outside bet buttons
  const outsideTypes = ['red', 'black', 'odd', 'even', 'low', 'high'];
  for (let i = 0; i < outsideTypes.length; i++) {
    const bx = gridX + i * (obW + obGap);
    if (_casinoHitBtn(mx, my, bx, obY, obW, obH)) {
      casinoRL_placeBet(outsideTypes[i], null, _casinoBetInput);
      return true;
    }
  }

  // Dozen/Column bets
  const dcTypes = ['dozen1', 'dozen2', 'dozen3', 'col1', 'col2', 'col3'];
  for (let i = 0; i < dcTypes.length; i++) {
    const bx = gridX + i * (obW + obGap);
    if (_casinoHitBtn(mx, my, bx, dcY, obW, obH)) {
      casinoRL_placeBet(dcTypes[i], null, _casinoBetInput);
      return true;
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  HEADS OR TAILS
// ═══════════════════════════════════════════════════════════════

function _drawHeadsOrTails(px, py, pw, ph) {
  const hot = casinoState.hot;
  const cx = px + pw / 2;

  if (hot.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    _casinoDrawButton(cx - 60, py + ph / 2 - 30, 120, 44, 'START', gold >= _casinoBetInput, true);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Win streaks multiply your bet by 1.5x each flip', cx, py + 80);
    ctx.fillText('Cash out anytime or lose it all on tails!', cx, py + 100);
    return;
  }

  // Coin display
  const coinY = py + 160;
  const coinR = 50;

  // Flip animation
  let flipScale = 1;
  if (hot.flipTimer) {
    const elapsed = Date.now() - hot.flipTimer;
    if (elapsed < 600) {
      flipScale = Math.abs(Math.cos(elapsed / 600 * Math.PI * 3));
    }
  }

  ctx.save();
  ctx.translate(cx, coinY);
  ctx.scale(1, flipScale);
  ctx.beginPath();
  ctx.arc(0, 0, coinR, 0, Math.PI * 2);
  ctx.fillStyle = hot.lastFlip === 'tails' ? '#888' : '#ffd700';
  ctx.fill();
  ctx.strokeStyle = hot.lastFlip === 'tails' ? '#555' : '#b8860b';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.lineWidth = 1;
  if (flipScale > 0.3) {
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = hot.lastFlip === 'tails' ? '#333' : '#8a6a00';
    ctx.textAlign = 'center';
    ctx.fillText(hot.lastFlip ? (hot.lastFlip === 'heads' ? 'H' : 'T') : '?', 0, 9);
  }
  ctx.restore();

  // Streak info
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('Streak: ' + hot.streak, cx, coinY + 80);
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Multiplier: ' + hot.currentMultiplier.toFixed(2) + 'x', cx, coinY + 105);
  ctx.fillStyle = '#5fca80';
  const potential = Math.floor(casinoState.bet * hot.currentMultiplier);
  ctx.fillText('Payout: ' + potential + 'g', cx, coinY + 130);

  // Bet amount
  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 20, py + 70);

  // Buttons
  if (hot.phase === 'streaking') {
    const btnY = py + ph - 80;
    _casinoDrawButton(cx - 140, btnY, 120, 40, 'FLIP', true, false);
    if (hot.streak > 0) {
      _casinoDrawButton(cx + 20, btnY, 120, 40, 'CASH OUT', true, true);
    }
  }

  _casinoDrawResult(px, py, pw, ph);
}

function _clickHeadsOrTails(mx, my, px, py, pw, ph) {
  const hot = casinoState.hot;
  const cx = px + pw / 2;

  if (hot.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    if (_casinoHitBtn(mx, my, cx - 60, py + ph / 2 - 30, 120, 44) && gold >= _casinoBetInput) {
      casinoHOT_startRound(_casinoBetInput);
      return true;
    }
    return true;
  }

  if (hot.phase === 'streaking') {
    const btnY = py + ph - 80;
    if (_casinoHitBtn(mx, my, cx - 140, btnY, 120, 40)) { casinoHOT_flip(); return true; }
    if (hot.streak > 0 && _casinoHitBtn(mx, my, cx + 20, btnY, 120, 40)) { casinoHOT_cashOut(); return true; }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  CASES
// ═══════════════════════════════════════════════════════════════

function _drawCases(px, py, pw, ph) {
  const cs = casinoState.cs;
  const cx = px + pw / 2;

  if (cs.phase === 'opening') {
    // Opening animation
    const elapsed = Date.now() - cs.openTimer;
    if (elapsed > 1500) {
      casinoCS_reveal();
      return;
    }
    // Shaking case
    const shake = Math.sin(elapsed / 30) * (5 - elapsed / 300);
    const tier = CASE_TIERS[cs.selectedTier];
    ctx.save();
    ctx.translate(cx + shake, py + ph / 2 - 40);
    ctx.fillStyle = tier.color;
    ctx.beginPath(); ctx.roundRect(-50, -30, 100, 60, 8); ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(-50, -30, 100, 60, 8); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, 8);
    ctx.restore();
    ctx.font = '16px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText('Opening...', cx, py + ph / 2 + 50);
    return;
  }

  if (cs.phase === 'result') {
    _casinoDrawResult(px, py, pw, ph);
    return;
  }

  // SELECTING phase — show 3 cases
  ctx.font = '14px monospace';
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.fillText('Choose a case to open', cx, py + 70);

  // Gold display
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('Gold: ' + gold, px + pw - 20, py + 70);

  const tiers = ['cheap', 'medium', 'expensive'];
  const caseW = 180, caseH = 300, caseGap = 20;
  const startX = cx - (caseW * 3 + caseGap * 2) / 2;

  for (let i = 0; i < 3; i++) {
    const tier = CASE_TIERS[tiers[i]];
    const tx = startX + i * (caseW + caseGap);
    const ty = py + 90;
    const canAfford = gold >= tier.cost;

    // Case card
    ctx.fillStyle = canAfford ? '#0f0f1e' : '#0a0a12';
    ctx.beginPath(); ctx.roundRect(tx, ty, caseW, caseH, 8); ctx.fill();
    ctx.strokeStyle = canAfford ? tier.color : '#333';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(tx, ty, caseW, caseH, 8); ctx.stroke();
    ctx.lineWidth = 1;

    // Case icon
    ctx.fillStyle = tier.color;
    ctx.globalAlpha = canAfford ? 1 : 0.4;
    ctx.beginPath(); ctx.roundRect(tx + caseW / 2 - 30, ty + 20, 60, 40, 6); ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(tx + caseW / 2 - 30, ty + 20, 60, 40, 6); ctx.stroke();
    ctx.lineWidth = 1;
    // Handle
    ctx.strokeRect(tx + caseW / 2 - 12, ty + 14, 24, 8);
    ctx.globalAlpha = 1;

    // Tier label
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = tier.color;
    ctx.textAlign = 'center';
    ctx.fillText(tier.label, tx + caseW / 2, ty + 85);

    // Cost
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = canAfford ? '#ffd700' : '#666';
    ctx.fillText(tier.cost + 'g', tx + caseW / 2, ty + 108);

    // Outcomes list
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    const totalWeight = tier.outcomes.reduce((s, o) => s + o.weight, 0);
    for (let j = 0; j < tier.outcomes.length; j++) {
      const o = tier.outcomes[j];
      const pct = Math.round(o.weight / totalWeight * 100);
      const oy = ty + 130 + j * 28;
      // Rarity bar
      const barW = (o.weight / totalWeight) * (caseW - 40);
      ctx.fillStyle = j === 0 ? '#444' : j === 1 ? '#3a5a3a' : j === 2 ? '#3a3a6a' : '#6a3a3a';
      ctx.fillRect(tx + 10, oy, barW, 18);
      // Label
      ctx.fillStyle = '#fff';
      ctx.fillText(o.label + ' (' + pct + '%)', tx + 14, oy + 14);
    }

    // Open button
    _casinoDrawButton(tx + caseW / 2 - 50, ty + caseH - 45, 100, 32, 'OPEN', canAfford, canAfford);
  }
}

function _clickCases(mx, my, px, py, pw, ph) {
  const cs = casinoState.cs;
  if (cs.phase !== 'selecting') return true;

  const cx = px + pw / 2;
  const tiers = ['cheap', 'medium', 'expensive'];
  const caseW = 180, caseH = 300, caseGap = 20;
  const startX = cx - (caseW * 3 + caseGap * 2) / 2;

  for (let i = 0; i < 3; i++) {
    const tier = CASE_TIERS[tiers[i]];
    const tx = startX + i * (caseW + caseGap);
    const ty = py + 90;
    if (_casinoHitBtn(mx, my, tx + caseW / 2 - 50, ty + caseH - 45, 100, 32) && gold >= tier.cost) {
      casinoCS_open(tiers[i]);
      return true;
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  MINES
// ═══════════════════════════════════════════════════════════════

function _drawMines(px, py, pw, ph) {
  const mn = casinoState.mn;
  const cx = px + pw / 2;

  if (mn.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    _casinoDrawButton(cx - 60, py + ph / 2 - 30, 120, 44, 'START', gold >= _casinoBetInput, true);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('5x5 grid with 5 hidden mines', cx, py + 80);
    ctx.fillText('Reveal safe tiles to increase your multiplier', cx, py + 100);
    ctx.fillText('Cash out anytime or hit a mine and lose!', cx, py + 120);
    return;
  }

  // Draw the grid
  const gridSize = MINES_CONFIG.GRID_SIZE;
  const cellSize = 64;
  const gridW = gridSize * cellSize;
  const gridX = cx - gridW / 2;
  const gridY = py + 70;
  const isResult = mn.phase === 'result';

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const gx = gridX + c * cellSize;
      const gy = gridY + r * cellSize;
      const revealed = mn.revealed && mn.revealed[r][c];
      const isMine = mn.board && mn.board[r][c];

      if (revealed) {
        if (isMine) {
          // Mine - red
          ctx.fillStyle = '#4a1111';
          ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4, 4); ctx.fill();
          ctx.font = 'bold 28px monospace';
          ctx.fillStyle = '#ff4444';
          ctx.textAlign = 'center';
          ctx.fillText('💣', gx + cellSize / 2, gy + cellSize / 2 + 10);
        } else {
          // Safe - green
          ctx.fillStyle = '#1a3a1a';
          ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4, 4); ctx.fill();
          ctx.font = 'bold 24px monospace';
          ctx.fillStyle = '#5fca80';
          ctx.textAlign = 'center';
          ctx.fillText('✓', gx + cellSize / 2, gy + cellSize / 2 + 8);
        }
      } else if (isResult && isMine) {
        // Show hidden mines on game over
        ctx.fillStyle = '#2a1111';
        ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4, 4); ctx.fill();
        ctx.font = '20px monospace';
        ctx.fillStyle = '#cc4444';
        ctx.textAlign = 'center';
        ctx.fillText('✕', gx + cellSize / 2, gy + cellSize / 2 + 7);
      } else {
        // Unrevealed
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4, 4); ctx.fill();
        ctx.strokeStyle = '#3a3a5a';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(gx + 2, gy + 2, cellSize - 4, cellSize - 4, 4); ctx.stroke();
      }
    }
  }

  // Stats panel (right side)
  const statsX = gridX + gridW + 30;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', statsX, gridY + 20);
  ctx.fillStyle = '#fff';
  ctx.fillText('Revealed: ' + mn.safeRevealed, statsX, gridY + 50);
  ctx.fillStyle = '#ffd700';
  ctx.fillText('Multiplier: ' + mn.currentMultiplier.toFixed(2) + 'x', statsX, gridY + 80);
  ctx.fillStyle = '#5fca80';
  const mPayout = Math.floor(casinoState.bet * mn.currentMultiplier);
  ctx.fillText('Payout: ' + mPayout + 'g', statsX, gridY + 110);

  // Cash out button
  if (mn.phase === 'playing' && mn.safeRevealed > 0) {
    _casinoDrawButton(statsX, gridY + 140, 130, 40, 'CASH OUT', true, true);
  }

  _casinoDrawResult(px, py, pw, ph);
}

function _clickMines(mx, my, px, py, pw, ph) {
  const mn = casinoState.mn;
  const cx = px + pw / 2;

  if (mn.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    if (_casinoHitBtn(mx, my, cx - 60, py + ph / 2 - 30, 120, 44) && gold >= _casinoBetInput) {
      casinoMN_start(_casinoBetInput);
      return true;
    }
    return true;
  }

  if (mn.phase === 'playing') {
    const gridSize = MINES_CONFIG.GRID_SIZE;
    const cellSize = 64;
    const gridW = gridSize * cellSize;
    const gridX = cx - gridW / 2;
    const gridY = py + 70;

    // Cash out button
    const statsX = gridX + gridW + 30;
    if (mn.safeRevealed > 0 && _casinoHitBtn(mx, my, statsX, gridY + 140, 130, 40)) {
      casinoMN_cashOut();
      return true;
    }

    // Grid click
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const gx = gridX + c * cellSize;
        const gy = gridY + r * cellSize;
        if (_casinoHitBtn(mx, my, gx, gy, cellSize, cellSize)) {
          casinoMN_reveal(r, c);
          return true;
        }
      }
    }
  }

  return true;
}

// ═══════════════════════════════════════════════════════════════
//  DICE
// ═══════════════════════════════════════════════════════════════

function _drawDice(px, py, pw, ph) {
  const dc = casinoState.dc;
  const cx = px + pw / 2;

  if (dc.phase === 'betting') {
    _casinoDrawBetControls(px, py, pw);
    _casinoDrawButton(cx - 60, py + ph / 2 - 30, 120, 44, 'ROLL', gold >= _casinoBetInput, true);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Roll the first die, then predict the second!', cx, py + 80);
    ctx.fillText('Payouts based on actual probability (5% edge)', cx, py + 100);
    return;
  }

  // Rolling2 animation check
  if (dc.phase === 'rolling2') {
    const elapsed = Date.now() - dc.rollTimer;
    if (elapsed > 1000) {
      casinoDC_resolve();
    }
  }

  // Draw dice
  const dieSize = 80;
  const die1X = cx - dieSize - 30, dieY = py + 120;
  _casinoDrawDie(die1X, dieY, dieSize, dc.die1);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText('Die 1', die1X + dieSize / 2, dieY - 10);

  const die2X = cx + 30;
  if (dc.phase === 'rolling2') {
    const elapsed = Date.now() - dc.rollTimer;
    const showVal = elapsed > 800 ? dc.die2 : (Math.floor(Date.now() / 80) % 6) + 1;
    _casinoDrawDie(die2X, dieY, dieSize, showVal);
  } else if (dc.die2 > 0) {
    _casinoDrawDie(die2X, dieY, dieSize, dc.die2);
  } else {
    // Placeholder
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.roundRect(die2X, dieY, dieSize, dieSize, 6); ctx.fill();
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(die2X, dieY, dieSize, dieSize, 6); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.font = 'bold 30px monospace';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.fillText('?', die2X + dieSize / 2, dieY + dieSize / 2 + 10);
  }
  ctx.font = '14px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText('Die 2', die2X + dieSize / 2, dieY - 10);

  // Bet display
  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.fillText('Bet: ' + casinoState.bet + 'g', px + pw - 20, py + 70);

  // Choice + selected display
  if (dc.choice) {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText('You chose: ' + dc.choice.toUpperCase(), cx, dieY + dieSize + 30);
  }

  // Choice buttons (after die1 rolled)
  if (dc.phase === 'rolled1') {
    const legal = casinoDC_getLegalChoices();
    const btnY = dieY + dieSize + 40;
    const btnW = 140, btnGap = 20;
    const totalW = legal.length * btnW + (legal.length - 1) * btnGap;
    const startBtnX = cx - totalW / 2;

    for (let i = 0; i < legal.length; i++) {
      const choice = legal[i];
      const bx = startBtnX + i * (btnW + btnGap);
      const payoutMult = DICE_PAYOUTS[dc.die1][choice];
      const label = choice.charAt(0).toUpperCase() + choice.slice(1) + ' (' + payoutMult.toFixed(2) + 'x)';
      _casinoDrawButton(bx, btnY, btnW, 42, label, true, false);
    }

    ctx.font = '13px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Will die 2 be higher, lower, or equal to ' + dc.die1 + '?', cx, btnY + 62);
  }

  _casinoDrawResult(px, py, pw, ph);
}

function _clickDice(mx, my, px, py, pw, ph) {
  const dc = casinoState.dc;
  const cx = px + pw / 2;

  if (dc.phase === 'betting') {
    if (_casinoHandleBetClick(mx, my, px, py, pw)) return true;
    if (_casinoHitBtn(mx, my, cx - 60, py + ph / 2 - 30, 120, 44) && gold >= _casinoBetInput) {
      casinoDC_start(_casinoBetInput);
      return true;
    }
    return true;
  }

  if (dc.phase === 'rolled1') {
    const dieSize = 80;
    const dieY = py + 120;
    const legal = casinoDC_getLegalChoices();
    const btnY = dieY + dieSize + 40;
    const btnW = 140, btnGap = 20;
    const totalW = legal.length * btnW + (legal.length - 1) * btnGap;
    const startBtnX = cx - totalW / 2;

    for (let i = 0; i < legal.length; i++) {
      const bx = startBtnX + i * (btnW + btnGap);
      if (_casinoHitBtn(mx, my, bx, btnY, btnW, 42)) {
        casinoDC_choose(legal[i]);
        return true;
      }
    }
  }

  return true;
}
