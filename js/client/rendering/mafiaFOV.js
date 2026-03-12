// ===================== MAFIA FOV & HUD =====================
// Client: FOV overlay, meeting UI, HUD buttons, body rendering, ghost overlay for Mafia mode.
// Depends on: MafiaState (mafiaSystem.js), Scene (sceneManager.js), ctx (global canvas)

// ---- Click regions ----
window._mafiaKillBtn = null; // { x, y, w, h } — set each frame when drawn
window._mafiaReportBtn = null;
window._mafiaVotePortraits = null; // [{ id, x, y, w, h }]
window._mafiaSkipBtn = null;
window._mafiaEmergencyPopup = false;    // true when E pressed at table, shows confirm button
window._mafiaEmergencyConfirmBtn = null; // { x, y, w, h } click region
window._mafiaSabotageBtn = null;         // SABOTAGE button click region
window._mafiaSabotageMenu = false;       // true when sabotage picker is open
window._mafiaSabReactorBtn = null;       // Reactor option click region
window._mafiaSabO2Btn = null;            // O2 option click region
window._mafiaSabLightsBtn = null;        // Lights option click region

// ---- Sabotage fix panel state ----
const _sabPanel = {
  active: false,
  type: null,           // 'reactor' | 'o2'
  panelKey: null,       // which panel opened this
  // Reactor: hold state
  holding: false,
  holdProgress: 0,      // 0→1, fills while mouse held on hand
  // O2: keypad state
  code: '',             // target code (5 digits)
  input: '',            // player input so far
  codeWrong: false,
  wrongTimer: 0,
};

function drawMafiaFOV() {
  // ---- Base FOV overlay (dark circle cutout around player) ----
  if (typeof MafiaState !== 'undefined' && typeof player !== 'undefined'
      && typeof camera !== 'undefined' && typeof ctx !== 'undefined'
      && Scene.inSkeld
      && MafiaState.phase !== 'idle'
      && !MafiaState.playerIsGhost
      && MafiaState.phase !== 'meeting' && MafiaState.phase !== 'voting' && MafiaState.phase !== 'ejection') {

    const visionMult = MafiaState.playerRole === 'impostor'
      ? MAFIA_SETTINGS.impostorVision
      : MAFIA_SETTINGS.crewVision;
    const px = (player.x - camera.x) * WORLD_ZOOM;
    const py = (player.y - camera.y) * WORLD_ZOOM;
    const fovR = MAFIA_GAME.FOV_BASE_RADIUS * visionMult * TILE * WORLD_ZOOM;

    // Dark overlay with soft-edged circular hole around player
    ctx.save();
    const innerR = fovR * 0.7;
    // Solid darkness outside the gradient ring
    ctx.beginPath();
    ctx.rect(0, 0, BASE_W, BASE_H);
    ctx.arc(px, py, fovR, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(0,0,0,0.97)';
    ctx.fill();
    // Gradient fade from clear center to dark edge
    const grad = ctx.createRadialGradient(px, py, innerR, px, py, fovR);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.97)');
    ctx.beginPath();
    ctx.arc(px, py, fovR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }

  // O2 fog effect — progressive fog for crewmates during O2 sabotage
  if (typeof MafiaState !== 'undefined' && Scene.inSkeld
      && MafiaState.sabotage.active === 'o2_depletion'
      && MafiaState.playerRole === 'crewmate' && !MafiaState.playerIsGhost) {
    const sabType = MAFIA_GAME.SABOTAGE_TYPES.o2_depletion;
    const fogProgress = 1 - (MafiaState.sabotage.timer / sabType.timer); // 0→1
    if (fogProgress > 0) {
      const cw = ctx.canvas.width;
      const ch = ctx.canvas.height;
      const maxRadius = Math.max(cw, ch) * 0.6;
      const clearRadius = maxRadius * (1 - fogProgress * 0.9); // shrinks to 10% at max

      ctx.save();
      // Dark smoky overlay with radial clear zone around player center
      const pcx = cw / 2;
      const pcy = ch / 2;
      const grad = ctx.createRadialGradient(pcx, pcy, clearRadius * 0.3, pcx, pcy, clearRadius);
      grad.addColorStop(0, 'rgba(20, 30, 40, 0)');
      grad.addColorStop(0.6, 'rgba(20, 30, 40, ' + (fogProgress * 0.4) + ')');
      grad.addColorStop(1, 'rgba(20, 30, 40, ' + (fogProgress * 0.85) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cw, ch);

      // Extra edge fog for intensity
      ctx.fillStyle = 'rgba(15, 20, 30, ' + (fogProgress * 0.3) + ')';
      ctx.fillRect(0, 0, cw, ch);
      ctx.restore();
    }
  }
}

// ---- Draw dead bodies (world-space, called from draw.js before characters) ----
function drawMafiaBodies() {
  if (typeof MafiaState === 'undefined' || MafiaState.phase === 'idle') return;
  if (!MafiaState.bodies || MafiaState.bodies.length === 0) return;

  for (const body of MafiaState.bodies) {
    const sx = body.x;
    const sy = body.y;

    ctx.save();
    ctx.translate(sx, sy);

    // Fallen body — horizontal oval with color
    const bodyColor = body.color ? body.color.body : '#c51111';
    const darkColor = body.color ? body.color.dark : '#7a0838';

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (fallen on side)
    ctx.fillStyle = darkColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Suit color top half
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-2, -3, 14, 9, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Visor (cracked)
    ctx.fillStyle = '#a8d8ea';
    ctx.beginPath();
    ctx.ellipse(6, -5, 6, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // Crack line
    ctx.strokeStyle = '#556';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.lineTo(8, -3);
    ctx.lineTo(6, -1);
    ctx.stroke();

    // Bone (sticking out)
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(-14, -2, 8, 3);

    // Name below body
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-ctx.measureText(body.name).width / 2 - 4, 14, ctx.measureText(body.name).width + 8, 14);
    ctx.fillStyle = '#ff6666';
    ctx.fillText(body.name, 0, 25);
    ctx.textAlign = 'left';

    ctx.restore();
  }
}


function drawMafiaHUD() {
  if (typeof MafiaState === 'undefined' || MafiaState.phase === 'idle') return;
  if (typeof Scene === 'undefined' || !Scene.inSkeld) return;

  const mk = MafiaState;
  const role = mk.playerRole;
  if (!role) return;

  // ---- Ghost overlay (semi-transparent tint when dead) ----
  if (mk.playerIsGhost) {
    ctx.save();
    ctx.fillStyle = 'rgba(100, 120, 180, 0.08)';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // GHOST label
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(180, 200, 255, 0.5)';
    ctx.fillText('GHOST', ctx.canvas.width / 2, 60);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  const isImpostor = role === 'impostor';

  // ---- KILL button (bottom-right, impostor only, not ghost) ----
  if (isImpostor && !mk.playerIsGhost) {
    const canKill = mk.killCooldown <= 0 && MafiaSystem.getNearestKillTarget() !== null;
    const cooldownSec = Math.ceil(mk.killCooldown / 60);

    const btnW = 100;
    const btnH = 50;
    const btnX = ctx.canvas.width - btnW - 30;
    const btnY = ctx.canvas.height - btnH - 100;

    ctx.save();

    // Button background
    if (canKill) {
      ctx.fillStyle = 'rgba(200, 20, 20, 0.85)';
    } else {
      ctx.fillStyle = 'rgba(80, 30, 30, 0.6)';
    }
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 10);
    ctx.fill();

    // Border
    ctx.strokeStyle = canKill ? '#ff4444' : '#664444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canKill ? '#ffffff' : '#886666';

    if (mk.killCooldown > 0) {
      ctx.fillText('KILL', btnX + btnW / 2, btnY + btnH / 2 - 8);
      ctx.font = 'bold 14px monospace';
      ctx.fillText(cooldownSec + 's', btnX + btnW / 2, btnY + btnH / 2 + 12);
    } else {
      ctx.fillText('KILL', btnX + btnW / 2, btnY + btnH / 2);
    }

    ctx.textAlign = 'left';
    ctx.restore();

    // Store click region
    window._mafiaKillBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    // ---- Q key hint ----
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[Q]', btnX + btnW / 2, btnY - 8);
    ctx.textAlign = 'left';
    ctx.restore();
  } else {
    window._mafiaKillBtn = null;
  }

  // ---- REPORT button (bottom-left, when near a body, not ghost) ----
  if (!mk.playerIsGhost && mk.phase === 'playing') {
    const nearBody = MafiaSystem.getNearestReportableBody();
    const canReport = nearBody !== null;

    const rBtnW = 110;
    const rBtnH = 50;
    const rBtnX = 30;
    const rBtnY = ctx.canvas.height - rBtnH - 100;

    ctx.save();
    ctx.fillStyle = canReport ? 'rgba(200, 160, 20, 0.85)' : 'rgba(60, 50, 20, 0.4)';
    ctx.beginPath();
    ctx.roundRect(rBtnX, rBtnY, rBtnW, rBtnH, 10);
    ctx.fill();
    ctx.strokeStyle = canReport ? '#ffcc00' : '#665500';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canReport ? '#ffffff' : '#887744';
    ctx.fillText('REPORT', rBtnX + rBtnW / 2, rBtnY + rBtnH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();

    // R key hint
    ctx.save();
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText('[R]', rBtnX + rBtnW / 2, rBtnY - 8);
    ctx.textAlign = 'left';
    ctx.restore();

    window._mafiaReportBtn = canReport ? { x: rBtnX, y: rBtnY, w: rBtnW, h: rBtnH } : null;
  } else {
    window._mafiaReportBtn = null;
  }

  // ---- Emergency meeting popup (shows after pressing E at table) ----
  if (window._mafiaEmergencyPopup && mk.phase === 'playing') {
    _drawEmergencyPopup();
  } else {
    window._mafiaEmergencyPopup = false;
    window._mafiaEmergencyConfirmBtn = null;
  }

  // ---- SABOTAGE button (bottom-center, impostor only) ----
  if (isImpostor && !mk.playerIsGhost && mk.phase === 'playing') {
    _drawSabotageButton();
  } else {
    window._mafiaSabotageBtn = null;
    window._mafiaSabotageMenu = false;
    window._mafiaSabReactorBtn = null;
    window._mafiaSabO2Btn = null;
  }

  // ---- Sabotage timer + alert overlay (visible to all during active sabotage, not lights) ----
  if (mk.sabotage.active && mk.phase === 'playing' && mk.sabotage.active !== 'lights_out') {
    _drawSabotageOverlay();
  }

  // ---- Sabotage fix panel (hand scanner / keypad) ----
  if (_sabPanel.active) {
    drawSabFixPanel();
  }

  // ---- Meeting / Voting / Vote Results / Ejection overlays ----
  if (mk.phase === 'meeting' || mk.phase === 'voting') {
    _drawMeetingUI();
  } else if (mk.phase === 'vote_results') {
    _drawVoteResultsUI();
  } else if (mk.phase === 'ejecting') {
    _drawEjectionUI();
  } else {
    window._mafiaVotePortraits = null;
    window._mafiaSkipBtn = null;
  }
}


// ===================== SABOTAGE FIX PANELS =====================

function openSabFixPanel(panelKey) {
  if (_sabPanel.active) return;
  const mk = MafiaState;
  if (!mk.sabotage.active) return;
  // Don't open if this panel is already fixed
  if (mk.sabotage.fixedPanels[panelKey] === true) return;
  // Don't open lights if all switches already flipped
  if (mk.sabotage._switches && mk.sabotage._switches.every(s => s)) return;

  _sabPanel.active = true;
  _sabPanel.panelKey = panelKey;
  _sabPanel.holding = false;
  _sabPanel.holdProgress = 0;

  if (mk.sabotage.active === 'reactor_meltdown') {
    _sabPanel.type = 'reactor';
  } else if (mk.sabotage.active === 'o2_depletion') {
    _sabPanel.type = 'o2';
    _sabPanel.code = '';
    for (let i = 0; i < 5; i++) _sabPanel.code += Math.floor(Math.random() * 10);
    _sabPanel.input = '';
    _sabPanel.codeWrong = false;
    _sabPanel.wrongTimer = 0;
  } else if (mk.sabotage.active === 'lights_out') {
    _sabPanel.type = 'lights';
    // Persist switch states on sabotage object so closing/reopening doesn't reset
    if (!mk.sabotage._switches) {
      mk.sabotage._switches = [false, false, false, false, false];
    }
    _sabPanel.switches = mk.sabotage._switches;
  }
}

function closeSabFixPanel() {
  if (_sabPanel.active && _sabPanel.type === 'reactor') {
    // Release reactor hold
    if (typeof MafiaSystem !== 'undefined') {
      MafiaSystem.releaseSabotagePanel(_sabPanel.panelKey);
    }
  }
  _sabPanel.active = false;
  _sabPanel.type = null;
  _sabPanel.panelKey = null;
  _sabPanel.holding = false;
  _sabPanel.holdProgress = 0;
}

function drawSabFixPanel() {
  if (!_sabPanel.active) return;
  const mk = MafiaState;

  // Auto-close if sabotage ended
  if (!mk.sabotage.active) { closeSabFixPanel(); return; }

  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Dark overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, cw, ch);

  // Lights panel is bigger and more square to match Among Us reference
  const isLights = _sabPanel.type === 'lights';
  const pw = isLights ? 540 : 420;
  const ph = isLights ? 560 : 460;
  const px = (cw - pw) / 2, py = (ch - ph) / 2;

  // Panel background
  ctx.fillStyle = '#3a3a42';
  ctx.beginPath();
  ctx.roundRect(px - 6, py - 6, pw + 12, ph + 12, 16);
  ctx.fill();
  ctx.fillStyle = '#55555e';
  ctx.beginPath();
  ctx.roundRect(px, py, pw, ph, 12);
  ctx.fill();

  // Close button (X) top-right
  const cbx = px + pw - 36, cby = py + 6, cbs = 28;
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(cbx, cby, cbs, cbs, 4);
  ctx.fill();
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText('X', cbx + cbs / 2, cby + 20);
  window._sabFixCloseBtn = { x: cbx, y: cby, w: cbs, h: cbs };

  if (_sabPanel.type === 'reactor') {
    _drawReactorFixPanel(px, py, pw, ph);
  } else if (_sabPanel.type === 'o2') {
    _drawO2FixPanel(px, py, pw, ph);
  } else if (_sabPanel.type === 'lights') {
    _drawLightsFixPanel(px, py, pw, ph);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function _drawReactorFixPanel(px, py, pw, ph) {
  const mk = MafiaState;
  const cx = px + pw / 2;

  // Title bar
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.roundRect(px + 30, py + 16, pw - 60, 36, 6);
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#222';
  ctx.fillText('HOLD TO STOP MELTDOWN', cx, py + 40);

  // Hand scanner area
  const handY = py + 80;
  const handW = 220, handH = 280;
  const handX = cx - handW / 2;

  // Scanner background (dark)
  ctx.fillStyle = _sabPanel.holding ? '#4a2020' : '#2a2a30';
  ctx.beginPath();
  ctx.roundRect(handX, handY, handW, handH, 12);
  ctx.fill();

  // Draw hand shape (simplified)
  ctx.save();
  ctx.translate(cx, handY + handH / 2 + 10);
  const s = 1.1;
  ctx.scale(s, s);

  // Palm
  ctx.fillStyle = _sabPanel.holding ? '#ff4444' : '#cc3333';
  ctx.beginPath();
  ctx.ellipse(0, 20, 55, 55, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fingers
  const fingerW = 18;
  const fingers = [
    { x: -40, y: -30, h: 60, angle: -0.15 },  // pinky
    { x: -18, y: -55, h: 75, angle: -0.05 },  // ring
    { x: 5,   y: -60, h: 80, angle: 0 },       // middle
    { x: 28,  y: -50, h: 70, angle: 0.05 },    // index
    { x: 52,  y: -5,  h: 50, angle: 0.5 },     // thumb
  ];
  for (const f of fingers) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.beginPath();
    ctx.roundRect(-fingerW / 2, -f.h, fingerW, f.h, fingerW / 2);
    ctx.fill();
    ctx.restore();
  }

  // Grid lines on hand
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1;
  for (let gx = -50; gx <= 50; gx += 10) {
    ctx.beginPath(); ctx.moveTo(gx, -70); ctx.lineTo(gx, 75); ctx.stroke();
  }
  for (let gy = -70; gy <= 75; gy += 10) {
    ctx.beginPath(); ctx.moveTo(-55, gy); ctx.lineTo(55, gy); ctx.stroke();
  }

  // White outline
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 20, 57, 57, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const f of fingers) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    ctx.beginPath();
    ctx.roundRect(-fingerW / 2 - 1, -f.h - 1, fingerW + 2, f.h + 2, fingerW / 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // Click region for the hand (the whole scanner area)
  window._sabFixHandBtn = { x: handX, y: handY, w: handW, h: handH };

  // Hold progress — while holding, register with system and fill progress
  if (_sabPanel.holding) {
    _sabPanel.holdProgress = Math.min(1, _sabPanel.holdProgress + 1 / 60); // ~1s to fill (visual only)

    // Register hold with authority each frame
    const localP = MafiaSystem.getLocalPlayer();
    if (localP) MafiaSystem.tryFixSabotage(_sabPanel.panelKey, localP.id);

    // Progress bar at bottom of scanner
    const barY2 = handY + handH + 10;
    const barW2 = handW;
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(handX, barY2, barW2, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#44cc66';
    ctx.beginPath();
    ctx.roundRect(handX, barY2, barW2 * _sabPanel.holdProgress, 14, 4);
    ctx.fill();
  } else {
    _sabPanel.holdProgress = 0;
    // Release hold
    MafiaSystem.releaseSabotagePanel(_sabPanel.panelKey);
  }
}

function _drawO2FixPanel(px, py, pw, ph) {
  const mk = MafiaState;
  const cx = px + pw / 2;

  // Title
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ddd';
  ctx.fillText('O2', cx, py + ph - 12);

  // Keypad background
  const kpW = 280, kpH = 340;
  const kpX = cx - kpW / 2;
  const kpY = py + 30;

  ctx.fillStyle = '#c8c8c8';
  ctx.beginPath();
  ctx.roundRect(kpX, kpY, kpW, kpH, 10);
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Display screen
  const dispX = kpX + 20, dispY = kpY + 14, dispW = kpW - 40, dispH = 50;
  ctx.fillStyle = '#dde8dd';
  ctx.fillRect(dispX, dispY, dispW, dispH);
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.strokeRect(dispX, dispY, dispW, dispH);

  // Show input
  ctx.font = 'bold 32px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = _sabPanel.codeWrong ? '#cc2222' : '#222';
  const displayText = _sabPanel.input + '_'.repeat(Math.max(0, 5 - _sabPanel.input.length));
  ctx.fillText(displayText, dispX + dispW / 2, dispY + 38);

  // Sticky note with code (top-right, tilted)
  ctx.save();
  ctx.translate(kpX + kpW - 30, kpY + 20);
  ctx.rotate(0.12);
  ctx.fillStyle = '#ffffaa';
  ctx.fillRect(-55, -10, 110, 70);
  ctx.strokeStyle = '#cccc66';
  ctx.lineWidth = 1;
  ctx.strokeRect(-55, -10, 110, 70);
  ctx.font = 'italic 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#555';
  ctx.fillText("today's code:", 0, 10);
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#333';
  ctx.fillText(_sabPanel.code, 0, 40);
  ctx.restore();

  // Number pad (3x4 grid: 1-9, X, 0, ✓)
  const btnS = 60, btnGap = 8;
  const gridW = 3 * btnS + 2 * btnGap;
  const gridX = cx - gridW / 2;
  const gridY = kpY + 80;
  const keys = ['1','2','3','4','5','6','7','8','9','X','0','✓'];

  window._sabFixKeypadBtns = [];

  for (let i = 0; i < 12; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const bx = gridX + col * (btnS + btnGap);
    const by = gridY + row * (btnS + btnGap);
    const key = keys[i];

    // Button style
    if (key === 'X') {
      ctx.fillStyle = '#cc3333';
    } else if (key === '✓') {
      ctx.fillStyle = '#33aa44';
    } else {
      ctx.fillStyle = '#e0e0e0';
    }
    ctx.beginPath();
    ctx.roundRect(bx, by, btnS, btnS, 6);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = (key === 'X' || key === '✓') ? '#fff' : '#333';
    ctx.fillText(key, bx + btnS / 2, by + btnS / 2);

    window._sabFixKeypadBtns.push({ key, x: bx, y: by, w: btnS, h: btnS });
  }
  ctx.textBaseline = 'alphabetic';

  // Wrong code flash timer
  if (_sabPanel.codeWrong) {
    _sabPanel.wrongTimer--;
    if (_sabPanel.wrongTimer <= 0) {
      _sabPanel.codeWrong = false;
      _sabPanel.input = '';
    }
  }
}

function handleSabKeypadPress(key) {
  if (!_sabPanel.active || _sabPanel.type !== 'o2') return;
  if (_sabPanel.codeWrong) return; // locked during wrong flash

  if (key === 'X') {
    // Clear
    _sabPanel.input = '';
  } else if (key === '✓') {
    // Submit
    if (_sabPanel.input === _sabPanel.code) {
      // Correct! Fix this panel
      const localP = MafiaSystem.getLocalPlayer();
      if (localP) MafiaSystem.tryFixSabotage(_sabPanel.panelKey, localP.id);
      closeSabFixPanel();
    } else {
      // Wrong code
      _sabPanel.codeWrong = true;
      _sabPanel.wrongTimer = 30; // 0.5s flash
    }
  } else {
    // Digit
    if (_sabPanel.input.length < 5) {
      _sabPanel.input += key;
    }
  }
}


function _drawLightsFixPanel(px, py, pw, ph) {
  const cx = px + pw / 2;
  const switches = _sabPanel.switches || [];

  // Panel background — grey metal like Among Us
  ctx.fillStyle = '#aab0b8';
  ctx.beginPath();
  ctx.roundRect(px + 10, py + 10, pw - 20, ph - 20, 8);
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner bevel
  ctx.strokeStyle = '#c0c6cc';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 14, py + 14, pw - 28, ph - 28);

  // ---- 3 display screens (top ~55% of panel) ----
  const screenPad = 36;
  const screenX = px + screenPad;
  const screenW = pw - screenPad * 2;
  const screenH = 80;
  const screenGap = 16;
  const screenStartY = py + 30;
  const screens = [
    { y: screenStartY, h: screenH, active: switches[0] && switches[1] },
    { y: screenStartY + screenH + screenGap, h: screenH, active: switches[2] },
    { y: screenStartY + (screenH + screenGap) * 2, h: screenH, active: switches[3] && switches[4] },
  ];

  for (const scr of screens) {
    // Screen bezel
    ctx.fillStyle = '#666';
    ctx.fillRect(screenX - 3, scr.y - 3, screenW + 6, scr.h + 6);
    // Screen
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(screenX, scr.y, screenW, scr.h);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, scr.y, screenW, scr.h);

    // Waveform if active
    if (scr.active) {
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const waveY = scr.y + scr.h / 2;
      for (let x = 0; x < screenW - 8; x += 2) {
        const val = Math.sin((x + Date.now() * 0.003) * 0.1) * (scr.h * 0.3)
                  + Math.sin((x + Date.now() * 0.007) * 0.25) * (scr.h * 0.12);
        if (x === 0) ctx.moveTo(screenX + 4 + x, waveY + val);
        else ctx.lineTo(screenX + 4 + x, waveY + val);
      }
      ctx.stroke();
    }
  }

  // Wire/pipe details connecting screens to sides
  ctx.strokeStyle = '#99886a';
  ctx.lineWidth = 3;
  const pipeX1 = px + 16, pipeX2 = px + screenPad - 4;
  const pipeRX1 = px + pw - screenPad + 4, pipeRX2 = px + pw - 16;
  for (let i = 0; i < 3; i++) {
    const sy = screens[i].y + screens[i].h / 2;
    // Left
    ctx.beginPath(); ctx.moveTo(pipeX1, sy - 10); ctx.lineTo(pipeX2, sy - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pipeX1, sy + 10); ctx.lineTo(pipeX2, sy + 10); ctx.stroke();
    // Right
    ctx.beginPath(); ctx.moveTo(pipeRX1, sy - 10); ctx.lineTo(pipeRX2, sy - 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pipeRX1, sy + 10); ctx.lineTo(pipeRX2, sy + 10); ctx.stroke();
  }

  // ---- 5 toggle switches (bottom ~40%) ----
  const switchCount = 5;
  const swW = 56, swH = 120;
  const swGap = 26;
  const totalSwW = switchCount * swW + (switchCount - 1) * swGap;
  const swStartX = cx - totalSwW / 2;
  const swY = screens[2].y + screens[2].h + 30;

  window._sabFixSwitchBtns = [];

  for (let i = 0; i < switchCount; i++) {
    const sx = swStartX + i * (swW + swGap);
    const isOn = switches[i];

    // Switch slot background
    ctx.fillStyle = '#6a6a6a';
    ctx.beginPath();
    ctx.roundRect(sx, swY, swW, swH, 8);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.roundRect(sx + 4, swY + 4, swW - 8, swH - 8, 6);
    ctx.fill();

    // Lever base (larger circle)
    ctx.fillStyle = '#7a7a7a';
    ctx.beginPath();
    ctx.arc(sx + swW / 2, swY + swH / 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Switch lever handle (chunky)
    const leverH = 44;
    const leverW = 28;
    const leverX = sx + (swW - leverW) / 2;
    const leverY = isOn ? swY + 10 : swY + swH - leverH - 10;

    ctx.fillStyle = isOn ? '#c8c8c8' : '#999';
    ctx.beginPath();
    ctx.roundRect(leverX, leverY, leverW, leverH, leverW / 2);
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Indicator LED below switch
    const ledY = swY + swH + 16;
    ctx.fillStyle = isOn ? '#22cc44' : '#333';
    ctx.beginPath();
    ctx.arc(sx + swW / 2, ledY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (isOn) {
      ctx.fillStyle = 'rgba(100,255,120,0.35)';
      ctx.beginPath();
      ctx.arc(sx + swW / 2, ledY - 2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    window._sabFixSwitchBtns.push({ idx: i, x: sx, y: swY, w: swW, h: swH });
  }

  // Check if all switches are on → fix complete
  if (switches.every(s => s)) {
    const localP = MafiaSystem.getLocalPlayer();
    if (localP) MafiaSystem.tryFixSabotage(_sabPanel.panelKey, localP.id);
    closeSabFixPanel();
  }
}

function handleLightsSwitchToggle(idx) {
  if (!_sabPanel.active || _sabPanel.type !== 'lights') return;
  if (idx >= 0 && idx < _sabPanel.switches.length) {
    _sabPanel.switches[idx] = !_sabPanel.switches[idx];
  }
}


// ===================== SABOTAGE BUTTON & OVERLAY =====================

function _drawSabotageButton() {
  const mk = MafiaState;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const canSab = MafiaSystem.canSabotage();
  const cooldownSec = Math.ceil(mk.sabotage.cooldown / 60);

  // Main SABOTAGE button (bottom-center)
  const btnW = 140;
  const btnH = 50;
  const btnX = cw / 2 - btnW / 2;
  const btnY = ch - btnH - 30;

  ctx.save();
  ctx.fillStyle = canSab ? 'rgba(180, 50, 180, 0.85)' : 'rgba(80, 30, 80, 0.5)';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 10);
  ctx.fill();
  ctx.strokeStyle = canSab ? '#cc66cc' : '#664466';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = canSab ? '#fff' : '#886688';

  if (mk.sabotage.cooldown > 0 && !mk.sabotage.active) {
    ctx.fillText('SABOTAGE', btnX + btnW / 2, btnY + btnH / 2 - 8);
    ctx.font = 'bold 14px monospace';
    ctx.fillText(cooldownSec + 's', btnX + btnW / 2, btnY + btnH / 2 + 12);
  } else {
    ctx.fillText('SABOTAGE', btnX + btnW / 2, btnY + btnH / 2);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  window._mafiaSabotageBtn = canSab ? { x: btnX, y: btnY, w: btnW, h: btnH } : null;

  // Sabotage picker menu (appears above button when toggled)
  if (window._mafiaSabotageMenu && canSab) {
    const menuW = 200;
    const menuH = 160;
    const menuX = cw / 2 - menuW / 2;
    const menuY = btnY - menuH - 10;

    ctx.save();
    ctx.fillStyle = 'rgba(30, 20, 40, 0.95)';
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuW, menuH, 12);
    ctx.fill();
    ctx.strokeStyle = '#cc66cc';
    ctx.lineWidth = 2;
    ctx.stroke();

    const optH = 36;
    const optGap = 8;
    const optX = menuX + 12;
    const optW = menuW - 24;

    // Reactor option
    const optY1 = menuY + 10;
    ctx.fillStyle = '#cc3333';
    ctx.beginPath();
    ctx.roundRect(optX, optY1, optW, optH, 8);
    ctx.fill();
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Reactor', menuX + menuW / 2, optY1 + optH / 2);
    window._mafiaSabReactorBtn = { x: optX, y: optY1, w: optW, h: optH };

    // O2 option
    const optY2 = optY1 + optH + optGap;
    ctx.fillStyle = '#3388cc';
    ctx.beginPath();
    ctx.roundRect(optX, optY2, optW, optH, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('O2', menuX + menuW / 2, optY2 + optH / 2);
    window._mafiaSabO2Btn = { x: optX, y: optY2, w: optW, h: optH };

    // Lights option
    const optY3 = optY2 + optH + optGap;
    ctx.fillStyle = '#cc9922';
    ctx.beginPath();
    ctx.roundRect(optX, optY3, optW, optH, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('Lights', menuX + menuW / 2, optY3 + optH / 2);
    window._mafiaSabLightsBtn = { x: optX, y: optY3, w: optW, h: optH };

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  } else {
    window._mafiaSabReactorBtn = null;
    window._mafiaSabO2Btn = null;
    window._mafiaSabLightsBtn = null;
  }
}

function _drawSabotageOverlay() {
  const mk = MafiaState;
  const cw = ctx.canvas.width;
  const sabType = MAFIA_GAME.SABOTAGE_TYPES[mk.sabotage.active];
  if (!sabType) return;

  const timerSec = Math.ceil(mk.sabotage.timer / 60);
  const totalSec = Math.ceil(sabType.timer / 60);
  const progress = 1 - (mk.sabotage.timer / sabType.timer); // 0→1 as time runs out

  ctx.save();

  // Flashing red vignette — toggles every 1.5s (like Among Us reactor alert)
  const flashOn = Math.floor(Date.now() / 1500) % 2 === 0;
  if (flashOn) {
    const flashAlpha = 0.08 + progress * 0.07; // subtle early, stronger late
    ctx.fillStyle = 'rgba(200, 30, 30, ' + flashAlpha + ')';
    ctx.fillRect(0, 0, cw, ctx.canvas.height);
  }

  // Top-center alert bar
  const barW = 400;
  const barH = 50;
  const barX = (cw - barW) / 2;
  const barY = 10;
  const urgent = timerSec <= 10;

  const bgAlpha = 0.85 + progress * 0.1;
  ctx.fillStyle = 'rgba(' + (160 + Math.round(progress * 40)) + ', ' + Math.round(60 - progress * 40) + ', 20, ' + bgAlpha + ')';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 10);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#ff4444' : '#ff8844';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Alert text
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(sabType.label.toUpperCase(), barX + barW / 2, barY + barH / 2 - 10);

  // Timer
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = urgent ? '#ffaaaa' : '#ffddaa';
  ctx.fillText(timerSec + 's', barX + barW / 2, barY + barH / 2 + 12);

  // Fix instructions below the bar
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  if (mk.sabotage.active === 'reactor_meltdown') {
    const p1Held = mk.sabotage.fixers.reactor_p1 !== null;
    const p2Held = mk.sabotage.fixers.reactor_p2 !== null;
    ctx.fillText(
      'Reactor Panel 1: ' + (p1Held ? 'HELD' : 'EMPTY') +
      '  |  Panel 2: ' + (p2Held ? 'HELD' : 'EMPTY'),
      barX + barW / 2, barY + barH + 20
    );
  } else if (mk.sabotage.active === 'o2_depletion') {
    const o2Fixed = mk.sabotage.fixedPanels.o2_o2 === true;
    const adminFixed = mk.sabotage.fixedPanels.o2_admin === true;
    ctx.fillText(
      'O2 Room: ' + (o2Fixed ? 'FIXED' : 'NEEDS FIX') +
      '  |  Admin: ' + (adminFixed ? 'FIXED' : 'NEEDS FIX'),
      barX + barW / 2, barY + barH + 20
    );
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}


// ===================== EMERGENCY POPUP =====================
function _drawEmergencyPopup() {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const t = Date.now() / 1000;

  // Dim overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, cw, ch);

  // Popup panel
  const panelW = 360;
  const panelH = 220;
  const panelX = (cw - panelW) / 2;
  const panelY = (ch - panelH) / 2 - 30;

  // Panel background
  ctx.fillStyle = 'rgba(15, 12, 20, 0.95)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();

  // Red border glow
  const pulse = 0.5 + Math.sin(t * 3) * 0.3;
  ctx.shadowColor = `rgba(255, 40, 30, ${0.3 + pulse * 0.2})`;
  ctx.shadowBlur = 15;
  ctx.strokeStyle = `rgba(255, 60, 40, ${0.6 + pulse * 0.2})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Warning icon (triangle with !)
  ctx.font = 'bold 36px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff4444';
  ctx.fillText('\u26A0', cw / 2, panelY + 50);

  // Title text
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('EMERGENCY MEETING', cw / 2, panelY + 82);

  // Subtitle
  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Call all players to an emergency vote?', cw / 2, panelY + 108);

  // ---- Big red confirm button ----
  const btnW = 240;
  const btnH = 56;
  const btnX = (cw - btnW) / 2;
  const btnY = panelY + panelH - btnH - 25;

  // Button glow
  ctx.shadowColor = 'rgba(255,40,20,0.4)';
  ctx.shadowBlur = 12;

  ctx.fillStyle = `rgba(200, 30, 20, ${0.85 + pulse * 0.1})`;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 12);
  ctx.fill();

  ctx.strokeStyle = '#ff5544';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Button text
  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText('CALL MEETING', cw / 2, btnY + btnH / 2 + 2);

  // Close hint
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText('Click outside to cancel', cw / 2, panelY + panelH + 20);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  window._mafiaEmergencyConfirmBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
}


// ===================== MEETING UI (Among Us style) =====================
// Meeting chat messages (separate from world chat)
let _meetingChatMessages = [];
let _meetingShowChat = false;  // toggle between voting view and chat view
window._meetingChatToggleBtn = null;  // click region for chat icon
let _voteConfirmTarget = null;  // participant id being confirmed (null = no confirm popup)
let _skipConfirmActive = false; // true when skip vote needs confirmation
window._mafiaVoteConfirmBtn = null;   // { x, y, w, h } green checkmark
window._mafiaVoteCancelBtn = null;    // { x, y, w, h } red X
window._mafiaSkipConfirmBtn = null;   // { x, y, w, h } green checkmark for skip
window._mafiaSkipCancelBtn = null;    // { x, y, w, h } red X for skip
window._meetingChatInputBtn = null;   // click region for chat input box

// Draw a mini Among Us crewmate at (cx, cy) with given color and scale
function _drawMiniCrewmate(cx, cy, color, darkColor, scale, isDead) {
  const s = scale || 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);

  // Body
  ctx.fillStyle = darkColor || '#555';
  ctx.beginPath();
  ctx.ellipse(0, 4, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Suit top
  ctx.fillStyle = color || '#888';
  ctx.beginPath();
  ctx.ellipse(0, -2, 13, 15, 0, Math.PI, Math.PI * 2);  // upper half
  ctx.fill();
  ctx.fillRect(-13, -2, 26, 10);

  // Visor
  ctx.fillStyle = '#a8d8ea';
  ctx.beginPath();
  ctx.ellipse(5, -4, 8, 7, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // Visor shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(3, -7, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Backpack (left side bump)
  ctx.fillStyle = darkColor || '#555';
  ctx.beginPath();
  ctx.ellipse(-14, 2, 5, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = darkColor || '#555';
  ctx.fillRect(-10, 16, 8, 6);
  ctx.fillRect(2, 16, 8, 6);
  // Leg bottoms
  ctx.fillStyle = color || '#888';
  ctx.fillRect(-11, 19, 10, 4);
  ctx.fillRect(1, 19, 10, 4);

  // Dead X
  if (isDead) {
    ctx.strokeStyle = '#cc3333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(12, 14);
    ctx.moveTo(12, -14);
    ctx.lineTo(-12, 14);
    ctx.stroke();
  }

  ctx.restore();
}

function _drawMeetingUI() {
  const mk = MafiaState;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Full-screen dark overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, cw, ch);

  // ---- Tablet frame ----
  const frameW = 920;
  const frameH = 600;
  const frameX = (cw - frameW) / 2;
  const frameY = (ch - frameH) / 2 - 10;
  const frameR = 24;

  // Outer frame (dark metallic border)
  ctx.fillStyle = '#2a2d35';
  ctx.beginPath();
  ctx.roundRect(frameX - 8, frameY - 8, frameW + 16, frameH + 16, frameR + 6);
  ctx.fill();
  // Frame edge highlight
  ctx.strokeStyle = '#404550';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(frameX - 8, frameY - 8, frameW + 16, frameH + 16, frameR + 6);
  ctx.stroke();

  // Inner panel (light blue-grey)
  ctx.fillStyle = '#c2ccd8';
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameW, frameH, frameR);
  ctx.fill();

  // Subtle inner shadow
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(frameX + 2, frameY + 2, frameW - 4, frameH - 4, frameR - 2);
  ctx.stroke();

  const panelCX = frameX + frameW / 2;

  // ---- Chat toggle icon (top-right of panel) ----
  const chatIconSize = 36;
  const chatIconX = frameX + frameW - chatIconSize - 18;
  const chatIconY = frameY + 12;

  ctx.fillStyle = _meetingShowChat ? '#5a7a9a' : 'rgba(80,100,130,0.5)';
  ctx.beginPath();
  ctx.roundRect(chatIconX, chatIconY, chatIconSize, chatIconSize, 8);
  ctx.fill();
  ctx.strokeStyle = _meetingShowChat ? '#8ab4d8' : 'rgba(100,120,150,0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Chat bubble icon
  ctx.fillStyle = _meetingShowChat ? '#fff' : '#789';
  ctx.font = '18px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F4AC}', chatIconX + chatIconSize / 2, chatIconY + chatIconSize / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  window._meetingChatToggleBtn = { x: chatIconX, y: chatIconY, w: chatIconSize, h: chatIconSize };

  if (_meetingShowChat) {
    // ===================== CHAT VIEW =====================
    _drawMeetingChatView(frameX, frameY, frameW, frameH, panelCX);
  } else {
    // ===================== VOTING VIEW =====================
    _drawMeetingVoteView(mk, frameX, frameY, frameW, frameH, panelCX);
  }

  ctx.restore();
}

// ---- Voting View (main meeting screen) ----
function _drawMeetingVoteView(mk, frameX, frameY, frameW, frameH, panelCX) {
  const portraits = [];

  // Title: "Who Is The Impostor?"
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a2e';
  ctx.fillText('Who Is The Impostor?', panelCX, frameY + 42);

  // ---- Player cards in 2-column grid ----
  const gridCols = 2;
  const cardW = 390;
  const cardH = 82;
  const gapX = 16;
  const gapY = 6;
  const gridStartX = frameX + (frameW - (gridCols * cardW + (gridCols - 1) * gapX)) / 2;
  const gridStartY = frameY + 58;

  const alivePlayers = mk.participants.filter(p => p.alive);
  const deadPlayers = mk.participants.filter(p => !p.alive);
  const orderedPlayers = [...alivePlayers, ...deadPlayers];

  const localP = MafiaSystem.getLocalPlayer();
  const localHasVoted = localP && localP.votedFor !== null;

  for (let i = 0; i < orderedPlayers.length; i++) {
    const p = orderedPlayers[i];
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const px = gridStartX + col * (cardW + gapX);
    const py = gridStartY + row * (cardH + gapY);

    const isAlive = p.alive;
    const hasVoted = p.votedFor !== null;
    const isLocalPlayer = p.isLocal;
    const votedForThis = localP && localP.votedFor === p.id;
    const isConfirmTarget = _voteConfirmTarget === p.id;

    // Card background
    if (!isAlive) {
      ctx.fillStyle = '#8a8a8a';
    } else if (votedForThis) {
      ctx.fillStyle = '#e8c8c8';
    } else if (isConfirmTarget) {
      ctx.fillStyle = '#d8e8f8';
    } else {
      ctx.fillStyle = '#f0f2f5';
    }
    ctx.beginPath();
    ctx.roundRect(px, py, cardW, cardH, 8);
    ctx.fill();

    // Card border
    if (votedForThis) {
      ctx.strokeStyle = '#cc4444';
      ctx.lineWidth = 2.5;
    } else if (isConfirmTarget) {
      ctx.strokeStyle = '#4488cc';
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
    }
    ctx.beginPath();
    ctx.roundRect(px, py, cardW, cardH, 8);
    ctx.stroke();

    // Crewmate sprite (bigger)
    const spriteX = px + 42;
    const spriteY = py + cardH / 2;
    const bodyCol = p.color ? p.color.body : '#888';
    const darkCol = p.color ? p.color.dark : '#555';
    _drawMiniCrewmate(spriteX, spriteY, bodyCol, darkCol, 1.5, !isAlive);

    // Name
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = isAlive ? '#1a1a2e' : '#555';
    ctx.fillText(p.name, px + 80, py + cardH / 2 + 6);

    // VOTED stamp (rotated red text)
    if (hasVoted && isAlive && mk.phase === 'voting' && !isConfirmTarget) {
      ctx.save();
      ctx.translate(px + cardW - 50, py + cardH / 2);
      ctx.rotate(-0.2);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = 'rgba(200, 40, 40, 0.7)';
      ctx.strokeStyle = 'rgba(200, 40, 40, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.textAlign = 'center';
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText('VOTED', 0, 5);
      ctx.restore();
    }

    // No vote counts shown during voting — results are only revealed after voting ends

    // ---- Confirm/Cancel buttons on the selected card ----
    if (isConfirmTarget && mk.phase === 'voting' && !localHasVoted) {
      const btnSize = 36;
      const btnGap = 12;
      const btnY2 = py + (cardH - btnSize) / 2;
      const confirmX = px + cardW - btnSize * 2 - btnGap - 14;
      const cancelX = px + cardW - btnSize - 10;

      // Green checkmark button
      ctx.fillStyle = '#44bb66';
      ctx.beginPath();
      ctx.roundRect(confirmX, btnY2, btnSize, btnSize, 6);
      ctx.fill();
      ctx.strokeStyle = '#228844';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Checkmark
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(confirmX + 9, btnY2 + btnSize / 2);
      ctx.lineTo(confirmX + 15, btnY2 + btnSize / 2 + 7);
      ctx.lineTo(confirmX + btnSize - 8, btnY2 + btnSize / 2 - 7);
      ctx.stroke();

      window._mafiaVoteConfirmBtn = { x: confirmX, y: btnY2, w: btnSize, h: btnSize };

      // Red X button
      ctx.fillStyle = '#cc4444';
      ctx.beginPath();
      ctx.roundRect(cancelX, btnY2, btnSize, btnSize, 6);
      ctx.fill();
      ctx.strokeStyle = '#992222';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // X
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cancelX + 10, btnY2 + 10);
      ctx.lineTo(cancelX + btnSize - 10, btnY2 + btnSize - 10);
      ctx.moveTo(cancelX + btnSize - 10, btnY2 + 10);
      ctx.lineTo(cancelX + 10, btnY2 + btnSize - 10);
      ctx.stroke();

      window._mafiaVoteCancelBtn = { x: cancelX, y: btnY2, w: btnSize, h: btnSize };
    }

    // Click region for voting (only if no confirm popup active, or this is not the confirm target)
    if (mk.phase === 'voting' && isAlive && !localHasVoted) {
      portraits.push({ id: p.id, x: px, y: py, w: cardW, h: cardH });
    }
  }

  // Clear confirm buttons if no target
  if (!_voteConfirmTarget) {
    window._mafiaVoteConfirmBtn = null;
    window._mafiaVoteCancelBtn = null;
  }

  // ---- Bottom bar: SKIP VOTE + green check + red X + timer ----
  const bottomY = frameY + frameH - 52;

  if (mk.phase === 'voting') {
    const canVote = localP && localP.alive && localP.votedFor === null;

    // SKIP VOTE button (left side)
    const skipW = 160;
    const skipH = 38;
    const skipX = frameX + 24;
    const skipY = bottomY;

    ctx.fillStyle = canVote ? '#e8e8ee' : '#aaa';
    ctx.beginPath();
    ctx.roundRect(skipX, skipY, skipW, skipH, 6);
    ctx.fill();
    ctx.strokeStyle = canVote ? '#555' : '#888';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canVote ? '#222' : '#666';
    ctx.fillText('SKIP VOTE', skipX + skipW / 2, skipY + skipH / 2);

    window._mafiaSkipBtn = canVote ? { x: skipX, y: skipY, w: skipW, h: skipH } : null;

    // Green checkmark + Red X for skip confirmation
    if (_skipConfirmActive && canVote) {
      const btnSize = 34;
      const confirmX = skipX + skipW + 10;
      const cancelX = confirmX + btnSize + 8;
      const btnY2 = skipY + (skipH - btnSize) / 2;

      // Green checkmark
      ctx.fillStyle = '#44bb66';
      ctx.beginPath();
      ctx.roundRect(confirmX, btnY2, btnSize, btnSize, 6);
      ctx.fill();
      ctx.strokeStyle = '#228844';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(confirmX + 8, btnY2 + btnSize / 2);
      ctx.lineTo(confirmX + 14, btnY2 + btnSize / 2 + 6);
      ctx.lineTo(confirmX + btnSize - 8, btnY2 + btnSize / 2 - 6);
      ctx.stroke();

      window._mafiaSkipConfirmBtn = { x: confirmX, y: btnY2, w: btnSize, h: btnSize };

      // Red X
      ctx.fillStyle = '#cc4444';
      ctx.beginPath();
      ctx.roundRect(cancelX, btnY2, btnSize, btnSize, 6);
      ctx.fill();
      ctx.strokeStyle = '#992222';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cancelX + 9, btnY2 + 9);
      ctx.lineTo(cancelX + btnSize - 9, btnY2 + btnSize - 9);
      ctx.moveTo(cancelX + btnSize - 9, btnY2 + 9);
      ctx.lineTo(cancelX + 9, btnY2 + btnSize - 9);
      ctx.stroke();

      window._mafiaSkipCancelBtn = { x: cancelX, y: btnY2, w: btnSize, h: btnSize };
    } else {
      window._mafiaSkipConfirmBtn = null;
      window._mafiaSkipCancelBtn = null;
    }

    // Timer (right side)
    const timerSec = Math.ceil(mk.meeting.votingTimer / 60);
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#333';
    ctx.fillText('Voting Ends In: ' + timerSec + 's', frameX + frameW - 24, bottomY + skipH / 2 + 1);
  } else {
    window._mafiaSkipBtn = null;

    // Discussion timer
    const timerSec = Math.ceil(mk.meeting.discussionTimer / 60);
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#334';
    ctx.fillText('Discussion: ' + timerSec + 's  \u2014  Voting begins soon...', frameX + frameW / 2, bottomY + 19);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  window._mafiaVotePortraits = mk.phase === 'voting' ? portraits : null;
}

// ---- Chat View ----
function _drawMeetingChatView(frameX, frameY, frameW, frameH, panelCX) {
  const mk = MafiaState;

  // Title
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a2e';
  ctx.fillText('Meeting Chat', panelCX, frameY + 38);

  // Messages area
  const msgPadX = 20;
  const msgAreaX = frameX + msgPadX;
  const msgAreaY = frameY + 54;
  const msgAreaW = frameW - msgPadX * 2;
  const msgAreaH = frameH - 130;

  // Clip messages
  ctx.save();
  ctx.beginPath();
  ctx.rect(msgAreaX, msgAreaY, msgAreaW, msgAreaH);
  ctx.clip();

  const msgs = _meetingChatMessages;
  const bubbleH = 68;
  const bubbleGap = 8;
  const maxVisible = Math.floor(msgAreaH / (bubbleH + bubbleGap));
  const startIdx = Math.max(0, msgs.length - maxVisible);

  const localName = typeof playerName !== 'undefined' ? playerName : 'Player';

  for (let i = startIdx; i < msgs.length; i++) {
    const msg = msgs[i];
    const idx = i - startIdx;
    const isLocal = msg.name === localName;
    const by = msgAreaY + idx * (bubbleH + bubbleGap);

    if (isLocal) {
      // Right-aligned bubble (like Among Us local messages)
      const bubbleW = msgAreaW * 0.7;
      const bx = msgAreaX + msgAreaW - bubbleW;

      ctx.fillStyle = '#f0f2f5';
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW - 50, bubbleH, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Name
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = '#1a1a2e';
      ctx.fillText(msg.name, bx + bubbleW - 60, by + 22);

      // Message text
      ctx.font = '13px monospace';
      ctx.fillStyle = '#333';
      ctx.fillText(msg.text, bx + 10, by + 46);

      // Crewmate on right
      const pColor = msg.color || '#888';
      // Find dark color
      let darkCol = '#555';
      const localP = MafiaSystem.getLocalPlayer();
      if (localP && localP.color) darkCol = localP.color.dark;
      _drawMiniCrewmate(bx + bubbleW - 24, by + bubbleH / 2, pColor, darkCol, 0.8, false);
    } else {
      // Left-aligned bubble
      const bubbleW = msgAreaW * 0.75;
      const bx = msgAreaX;

      ctx.fillStyle = '#f0f2f5';
      ctx.beginPath();
      ctx.roundRect(bx + 50, by, bubbleW - 50, bubbleH, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Crewmate on left
      const pColor = msg.color || '#888';
      // Find dark color from participants
      let darkCol = '#555';
      const participant = mk.participants.find(p => p.name === msg.name);
      if (participant && participant.color) darkCol = participant.color.dark;
      _drawMiniCrewmate(bx + 24, by + bubbleH / 2, pColor, darkCol, 0.8, false);

      // Name
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1a1a2e';
      ctx.fillText(msg.name, bx + 58, by + 22);

      // Message text
      ctx.font = '13px monospace';
      ctx.fillStyle = '#333';
      ctx.fillText(msg.text, bx + 58, by + 46);
    }
  }

  ctx.restore();

  // ---- Chat input box at bottom ----
  const inputH = 44;
  const inputX = frameX + 20;
  const inputY = frameY + frameH - inputH - 16;
  const inputW = frameW - 40;

  // Input background
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(inputX, inputY, inputW, inputH, 8);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Input text or placeholder
  const isChatActive = typeof chatInputActive !== 'undefined' && chatInputActive;
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  if (typeof chatInput !== 'undefined' && chatInput.length > 0) {
    ctx.fillStyle = '#111';
    ctx.fillText(chatInput, inputX + 12, inputY + inputH / 2 + 5);
  } else {
    ctx.fillStyle = '#999';
    ctx.fillText(isChatActive ? 'Type a message...' : 'Click here to type...', inputX + 12, inputY + inputH / 2 + 5);
  }

  // Highlight border when active
  if (isChatActive) {
    ctx.strokeStyle = '#4a8eff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(inputX, inputY, inputW, inputH, 8);
    ctx.stroke();
  }

  // Store click region for input box
  window._meetingChatInputBtn = { x: inputX, y: inputY, w: inputW, h: inputH };

  // Send arrow button (right side of input)
  const sendSize = 32;
  const sendX = inputX + inputW - sendSize - 8;
  const sendY = inputY + (inputH - sendSize) / 2;
  ctx.fillStyle = '#4a8eff';
  ctx.beginPath();
  ctx.moveTo(sendX + 6, sendY + 4);
  ctx.lineTo(sendX + sendSize - 4, sendY + sendSize / 2);
  ctx.lineTo(sendX + 6, sendY + sendSize - 4);
  ctx.closePath();
  ctx.fill();

  // Character count
  const charCount = typeof chatInput !== 'undefined' ? chatInput.length : 0;
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#999';
  ctx.fillText(charCount + '/100', inputX + inputW - sendSize - 16, inputY - 4);

  // Timer at bottom right
  const isDiscussion = mk.phase === 'meeting';
  const timerSec = isDiscussion
    ? Math.ceil(mk.meeting.discussionTimer / 60)
    : Math.ceil(mk.meeting.votingTimer / 60);
  const timerLabel = isDiscussion ? 'Discussion' : 'Voting Ends In';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#334';
  ctx.fillText(timerLabel + ': ' + timerSec + 's', frameX + frameW - 20, frameY + frameH - 4);

  ctx.textAlign = 'left';

  // Don't show vote portraits in chat view
  window._mafiaVotePortraits = null;
  window._mafiaSkipBtn = null;
}


// ===================== VOTE RESULTS UI =====================
function _drawVoteResultsUI() {
  const mk = MafiaState;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Full-screen dark overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, cw, ch);

  // Tablet frame (same as meeting UI)
  const frameW = 920;
  const frameH = 600;
  const frameX = (cw - frameW) / 2;
  const frameY = (ch - frameH) / 2 - 10;
  const frameR = 24;

  ctx.fillStyle = '#2a2d35';
  ctx.beginPath();
  ctx.roundRect(frameX - 8, frameY - 8, frameW + 16, frameH + 16, frameR + 6);
  ctx.fill();
  ctx.strokeStyle = '#404550';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#c2ccd8';
  ctx.beginPath();
  ctx.roundRect(frameX, frameY, frameW, frameH, frameR);
  ctx.fill();

  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(frameX + 2, frameY + 2, frameW - 4, frameH - 4, frameR - 2);
  ctx.stroke();

  // Title
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#1a1a2e';
  ctx.fillText('Voting Results', frameX + frameW / 2, frameY + 42);

  // Vote results data
  const voteResults = mk.meeting.voteResults || {};
  const skipVoters = mk.meeting.skipVoters || [];

  // ---- Player cards with vote icons ----
  const gridCols = 2;
  const cardW = 390;
  const cardH = 82;
  const gapX = 16;
  const gapY = 6;
  const gridStartX = frameX + (frameW - (gridCols * cardW + (gridCols - 1) * gapX)) / 2;
  const gridStartY = frameY + 58;

  // Keep same order as voting screen
  const aliveBefore = mk.participants.filter(p => p.alive || (mk.ejection.name && p.name === mk.ejection.name));
  const deadBefore = mk.participants.filter(p => !p.alive && !(mk.ejection.name && p.name === mk.ejection.name));
  const orderedPlayers = [...aliveBefore, ...deadBefore];

  for (let i = 0; i < orderedPlayers.length; i++) {
    const p = orderedPlayers[i];
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const px = gridStartX + col * (cardW + gapX);
    const py = gridStartY + row * (cardH + gapY);

    const isDead = !p.alive && !(mk.ejection.name && p.name === mk.ejection.name);
    const isEjected = mk.ejection.name === p.name;

    // Card background
    if (isDead) {
      ctx.fillStyle = '#8a8a8a';
    } else if (isEjected) {
      ctx.fillStyle = '#d8b8b8';
    } else {
      ctx.fillStyle = '#dde0e6';
    }
    ctx.beginPath();
    ctx.roundRect(px, py, cardW, cardH, 8);
    ctx.fill();
    ctx.strokeStyle = isEjected ? '#aa4444' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = isEjected ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(px, py, cardW, cardH, 8);
    ctx.stroke();

    // Crewmate sprite
    const spriteX = px + 42;
    const spriteY = py + cardH / 2;
    const bodyCol = p.color ? p.color.body : '#888';
    const darkCol = p.color ? p.color.dark : '#555';
    _drawMiniCrewmate(spriteX, spriteY, bodyCol, darkCol, 1.5, isDead);

    // Name (always at fixed position, above voter icons)
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = isDead ? '#555' : '#1a1a2e';
    ctx.fillText(p.name, px + 80, py + 28);

    // ---- Voter icons below the name (sequential reveal, colored) ----
    const allVoters = voteResults[p.id] || [];
    const voteOrder = mk.meeting.voteOrder || [];
    const revealedCount = mk.meeting.revealedCount || 0;

    // Build set of revealed voter IDs
    const revealedVoterIds = new Set();
    for (let r = 0; r < Math.min(revealedCount, voteOrder.length); r++) {
      revealedVoterIds.add(voteOrder[r].voterId);
    }
    const visibleVoters = allVoters.filter(vid => revealedVoterIds.has(vid));

    if (visibleVoters.length > 0) {
      const iconStartX = px + 80;
      const iconY = py + cardH - 16;
      const isAnon = mk._settings && mk._settings.anonymousVotes;
      for (let v = 0; v < visibleVoters.length; v++) {
        const voter = mk.participants.find(pp => pp.id === visibleVoters[v]);
        if (voter) {
          const vCol = isAnon ? '#888' : (voter.color ? voter.color.body : '#888');
          const vDark = isAnon ? '#555' : (voter.color ? voter.color.dark : '#555');
          _drawMiniCrewmate(iconStartX + v * 28, iconY, vCol, vDark, 0.5, false);
        }
      }
    }
  }

  // ---- SKIPPED VOTING section at bottom-left ----
  const bottomY = frameY + frameH - 52;
  // Filter skip voters by revealed status
  const voteOrder2 = mk.meeting.voteOrder || [];
  const revealedCount2 = mk.meeting.revealedCount || 0;
  const revealedSkipIds = new Set();
  for (let r = 0; r < Math.min(revealedCount2, voteOrder2.length); r++) {
    if (voteOrder2[r].targetId === 'skip') {
      revealedSkipIds.add(voteOrder2[r].voterId);
    }
  }
  const visibleSkippers = skipVoters.filter(vid => revealedSkipIds.has(vid));

  if (visibleSkippers.length > 0) {
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#444';
    ctx.fillText('SKIPPED VOTING', frameX + 24, bottomY + 10);

    const isAnonSkip = mk._settings && mk._settings.anonymousVotes;
    for (let s = 0; s < visibleSkippers.length; s++) {
      const skipper = mk.participants.find(pp => pp.id === visibleSkippers[s]);
      if (skipper) {
        const sCol = isAnonSkip ? '#888' : (skipper.color ? skipper.color.body : '#888');
        const sDark = isAnonSkip ? '#555' : (skipper.color ? skipper.color.dark : '#555');
        _drawMiniCrewmate(frameX + 200 + s * 32, bottomY + 6, sCol, sDark, 0.55, false);
      }
    }
  } else if (revealedCount2 >= voteOrder2.length && voteOrder2.length > 0) {
    // Only show "No one skipped" after all votes are revealed
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#444';
    ctx.fillText('No one skipped', frameX + 24, bottomY + 10);
  }

  // Timer (bottom-right)
  const timerSec = Math.ceil((mk.meeting.resultsTimer || 0) / 60);
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#333';
  ctx.fillText('Proceeding In: ' + timerSec + 's', frameX + frameW - 24, bottomY + 10);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  // No clickable regions during results
  window._mafiaVotePortraits = null;
  window._mafiaSkipBtn = null;
}


// ===================== EJECTION UI =====================
function _drawEjectionUI() {
  const mk = MafiaState;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Full-screen space background
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cw, ch);

  // Stars
  const starSeed = 42;
  for (let i = 0; i < 80; i++) {
    const sx = ((starSeed * (i + 1) * 7919) % cw);
    const sy = ((starSeed * (i + 1) * 6271) % ch);
    const brightness = 0.3 + (i % 5) * 0.15;
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
    ctx.fillRect(sx, sy, 2, 2);
  }

  // Ejected crewmate flying across (animated)
  const progress = 1 - (mk.ejection.timer / MAFIA_GAME.EJECTION_TIME);
  const ejX = -100 + progress * (cw + 200);
  const ejY = ch / 2 - 40 + Math.sin(progress * Math.PI * 3) * 30;
  const rotation = progress * Math.PI * 6;

  if (mk.ejection.name) {
    // Find the ejected participant's color
    const ejectedP = mk.participants.find(p => p.name === mk.ejection.name);
    const ejColor = ejectedP && ejectedP.color ? ejectedP.color.body : '#888';

    ctx.save();
    ctx.translate(ejX, ejY);
    ctx.rotate(rotation);

    // Body
    ctx.fillStyle = ejColor;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#a8d8ea';
    ctx.beginPath();
    ctx.ellipse(6, -3, 8, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Message text (fade in after 30%)
  if (progress > 0.3) {
    const textAlpha = Math.min(1, (progress - 0.3) / 0.3);
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
    ctx.fillText(mk.ejection.message || 'No one was ejected.', cw / 2, ch / 2 + 80);
  }

  ctx.textAlign = 'left';
  ctx.restore();

  window._mafiaVotePortraits = null;
  window._mafiaSkipBtn = null;
}


// ===================== MAFIA SETTINGS ICON + PANEL =====================
// Replaces the normal HUD icons (chat, profile, map, toolbox) in Skeld.
// Gear icon top-right → opens small panel with Leave, Sounds, General.

let _mafiaSettingsOpen = false;
window._mafiaSettingsBtn = null;     // gear icon click region
window._mafiaSettingsBtns = null;    // { leave, sounds, general } click regions

function drawMafiaSettingsIcon() {
  const size = 48;
  const x = ctx.canvas.width - size - 12;
  const y = 12;

  ctx.save();

  // Background
  ctx.fillStyle = _mafiaSettingsOpen ? 'rgba(60,60,70,0.85)' : 'rgba(20,20,28,0.8)';
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 10);
  ctx.fill();

  // Border
  ctx.strokeStyle = _mafiaSettingsOpen ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, size, size, 10);
  ctx.stroke();

  // Gear icon (simple)
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.fillStyle = _mafiaSettingsOpen ? '#fff' : '#bbb';
  ctx.font = '24px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u2699', cx, cy + 1);  // ⚙
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.restore();

  window._mafiaSettingsBtn = { x, y, w: size, h: size };
}

function drawMafiaSettingsPanel() {
  if (!_mafiaSettingsOpen) {
    window._mafiaSettingsBtns = null;
    return;
  }

  const panelW = 200;
  const panelH = 180;
  const panelX = ctx.canvas.width - panelW - 12;
  const panelY = 70;

  ctx.save();

  // Panel background
  ctx.fillStyle = 'rgba(15, 15, 25, 0.92)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 10);
  ctx.stroke();

  // Title
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ccc';
  ctx.fillText('SETTINGS', panelX + panelW / 2, panelY + 28);

  // Buttons
  const btnW = panelW - 30;
  const btnH = 36;
  const btnX = panelX + 15;
  const startY = panelY + 45;
  const gap = 8;

  const buttons = [
    { key: 'general', label: 'General',  color: 'rgba(60, 100, 180, 0.7)', border: '#4488cc' },
    { key: 'sounds',  label: 'Sounds',   color: 'rgba(60, 140, 80, 0.7)',  border: '#44aa66' },
    { key: 'leave',   label: 'Leave',    color: 'rgba(180, 40, 40, 0.7)',  border: '#cc4444' },
  ];

  const regions = {};

  for (let i = 0; i < buttons.length; i++) {
    const btn = buttons[i];
    const by = startY + i * (btnH + gap);

    ctx.fillStyle = btn.color;
    ctx.beginPath();
    ctx.roundRect(btnX, by, btnW, btnH, 8);
    ctx.fill();

    ctx.strokeStyle = btn.border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(btnX, by, btnW, btnH, 8);
    ctx.stroke();

    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(btn.label, btnX + btnW / 2, by + btnH / 2);

    regions[btn.key] = { x: btnX, y: by, w: btnW, h: btnH };
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  window._mafiaSettingsBtns = regions;
}


// ===================== MAFIA LOBBY UI =====================
// Pre-game lobby: game settings panel, color picker, HUD overlay

let _mafiaLobbySettingsOpen = false;
let _mafiaLobbyColorOpen = false;
let _mafiaLobbySettingsScroll = 0;
let _mafiaLobbySettingsTab = 'game'; // 'game' | 'roles'

// Click regions for lobby UI
window._mafiaLobbySettingsCloseBtn = null;
window._mafiaLobbyColorCloseBtn = null;
window._mafiaLobbyColorBtns = null;
window._mafiaLobbySettingBtns = null;
window._mafiaLobbyTabBtns = null;     // { game: {}, roles: {} }
window._mafiaLobbyMapBtns = null;     // [{ mapId, x, y, w, h }]

function openMafiaSettingsPanel() {
  _mafiaLobbySettingsOpen = true;
  _mafiaLobbyColorOpen = false;
  _mafiaLobbySettingsScroll = 0;
}

function closeMafiaSettingsPanel() {
  _mafiaLobbySettingsOpen = false;
  window._mafiaLobbySettingBtns = null;
  window._mafiaLobbyTabBtns = null;
  window._mafiaLobbyMapBtns = null;
}

function openMafiaColorPicker() {
  _mafiaLobbyColorOpen = true;
  _mafiaLobbySettingsOpen = false;
}

function closeMafiaColorPicker() {
  _mafiaLobbyColorOpen = false;
  window._mafiaLobbyColorBtns = null;
}

function startMafiaFromLobby() {
  if (_mafiaLobbySettingsOpen || _mafiaLobbyColorOpen) return;
  const map = MAFIA_SETTINGS.map || 'skeld_01';
  if (typeof startTransition === 'function') {
    const mapData = MAFIA_GAME.MAPS[map];
    const spawnTX = mapData ? mapData.SPAWN.tx : 76;
    const spawnTY = mapData ? mapData.SPAWN.ty : 10;
    startTransition(map, spawnTX, spawnTY);
  }
}

// ---- Lobby HUD ----
function drawMafiaLobbyHUD() {
  if (!Scene.inMafiaLobby) return;
  const cw = ctx.canvas.width, ch = ctx.canvas.height;

  ctx.save();

  // Top banner
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, cw, 50);
  ctx.fillStyle = '#fff';
  ctx.fillText('MAFIA LOBBY', cw / 2, 35);

  // Selected color (bottom-left)
  const color = MAFIA_GAME.COLORS[mafiaPlayerColorIdx] || MAFIA_GAME.COLORS[0];
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(10, ch - 60, 140, 50, 8);
  ctx.fill();
  ctx.fillStyle = color.body;
  ctx.beginPath();
  ctx.arc(36, ch - 35, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(color.name, 56, ch - 30);

  // Selected map (bottom-right)
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(cw - 170, ch - 60, 160, 50, 8);
  ctx.fill();
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'right';
  ctx.fillText('MAP:', cw - 100, ch - 38);
  ctx.fillStyle = '#fff';
  const mapNames = { skeld_01: 'The Skeld' };
  ctx.fillText(mapNames[MAFIA_SETTINGS.map] || MAFIA_SETTINGS.map, cw - 18, ch - 38);

  // Draw open panels
  if (_mafiaLobbySettingsOpen) _drawLobbySettingsPanel(cw, ch);
  if (_mafiaLobbyColorOpen) _drawLobbyColorPicker(cw, ch);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// ---- SETTINGS DEFS (all increments of 1, whole numbers only) ----
const MAFIA_SETTING_DEFS = [
  { section: 'IMPOSTORS' },
  { key: 'impostors', label: '# Impostors', type: 'int', min: 1, max: 3 },
  { key: 'killCooldown', label: 'Kill Cooldown', type: 'int', min: 10, max: 60, suffix: 's' },
  { key: 'killDistance', label: 'Kill Distance', type: 'enum', values: ['Short', 'Medium', 'Long'] },
  { key: 'playerSpeed', label: 'Player Speed', type: 'int', min: 1, max: 3, suffix: 'x' },
  { key: 'impostorVision', label: 'Impostor Vision', type: 'float', min: 0.25, max: 5, step: 0.25, suffix: 'x' },
  { section: 'CREWMATES' },
  { key: 'crewVision', label: 'Crew Vision', type: 'float', min: 0.25, max: 5, step: 0.25, suffix: 'x' },
  { key: 'discussionTime', label: 'Discussion Time', type: 'int', min: 0, max: 120, suffix: 's' },
  { key: 'votingTime', label: 'Voting Time', type: 'int', min: 10, max: 120, suffix: 's' },
  { key: 'emergencyMeetings', label: 'Emergency Meetings', type: 'int', min: 0, max: 9 },
  { key: 'emergencyCooldown', label: 'Emergency Cooldown', type: 'int', min: 0, max: 60, suffix: 's' },
  { key: 'confirmEjects', label: 'Confirm Ejects', type: 'bool' },
  { key: 'anonymousVotes', label: 'Anonymous Votes', type: 'bool' },
  { section: 'TASKS' },
  { key: 'commonTasks', label: 'Common Tasks', type: 'int', min: 0, max: 3 },
  { key: 'longTasks', label: 'Long Tasks', type: 'int', min: 0, max: 3 },
  { key: 'shortTasks', label: 'Short Tasks', type: 'int', min: 0, max: 5 },
  { key: 'taskBarUpdates', label: 'Task Bar Updates', type: 'enum', values: ['Always', 'Meetings', 'Never'] },
  { section: 'MATCH' },
  { key: 'maxPlayers', label: 'Max Players', type: 'int', min: 4, max: 10 },
];

const MAFIA_MAP_LIST = [
  { id: 'skeld_01', name: 'The Skeld' },
];

function _drawLobbySettingsPanel(cw, ch) {
  const pw = 720, ph = 560;
  const px = (cw - pw) / 2, py = (ch - ph) / 2;

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, cw, ch);

  // Panel
  ctx.fillStyle = '#3a3a44';
  ctx.beginPath(); ctx.roundRect(px - 4, py - 4, pw + 8, ph + 8, 14); ctx.fill();
  ctx.fillStyle = '#2a2a32';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();

  // Close button
  const cbx = px + pw - 44, cby = py + 10, cbs = 32;
  ctx.fillStyle = '#444';
  ctx.beginPath(); ctx.roundRect(cbx, cby, cbs, cbs, 6); ctx.fill();
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText('X', cbx + cbs / 2, cby + 23);
  window._mafiaLobbySettingsCloseBtn = { x: cbx, y: cby, w: cbs, h: cbs };

  // ---- Tab buttons (Game Settings | Role Settings) ----
  const tabY = py + 12;
  const tabW = 200, tabH = 36;
  const tabGap = 10;
  const tabStartX = px + 20;

  const tabs = [
    { key: 'game', label: 'GAME SETTINGS' },
    { key: 'roles', label: 'ROLE SETTINGS' },
  ];
  const tabBtns = {};
  for (let i = 0; i < tabs.length; i++) {
    const tx = tabStartX + i * (tabW + tabGap);
    const active = _mafiaLobbySettingsTab === tabs[i].key;
    ctx.fillStyle = active ? 'rgba(60,140,180,0.8)' : 'rgba(50,50,60,0.8)';
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW, tabH, 6); ctx.fill();
    ctx.strokeStyle = active ? '#66ccff' : '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(tx, tabY, tabW, tabH, 6); ctx.stroke();
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = active ? '#fff' : '#999';
    ctx.textAlign = 'center';
    ctx.fillText(tabs[i].label, tx + tabW / 2, tabY + 24);
    tabBtns[tabs[i].key] = { x: tx, y: tabY, w: tabW, h: tabH };
  }
  window._mafiaLobbyTabBtns = tabBtns;

  // ---- Content area ----
  const contentY = tabY + tabH + 14;

  if (_mafiaLobbySettingsTab === 'roles') {
    // Placeholder for Role Settings
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#666';
    ctx.fillText('ROLE SETTINGS', px + pw / 2, contentY + 80);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('Coming soon...', px + pw / 2, contentY + 110);
    ctx.fillText('Per-role spawn chances, cooldowns,', px + pw / 2, contentY + 135);
    ctx.fillText('and durations will be configured here.', px + pw / 2, contentY + 155);
    window._mafiaLobbySettingBtns = [];
    window._mafiaLobbyMapBtns = null;
    return;
  }

  // ---- Map selection ----
  const mapY = contentY;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#aaa';
  ctx.fillText('MAP', px + 20, mapY + 18);

  const mapBtns = [];
  let mapX = px + 80;
  for (const m of MAFIA_MAP_LIST) {
    const mw = 140, mh = 30;
    const selected = MAFIA_SETTINGS.map === m.id;
    ctx.fillStyle = selected ? 'rgba(60,140,180,0.8)' : '#444';
    ctx.beginPath(); ctx.roundRect(mapX, mapY + 2, mw, mh, 6); ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#66ccff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(mapX, mapY + 2, mw, mh, 6); ctx.stroke();
    }
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(m.name, mapX + mw / 2, mapY + 22);
    mapBtns.push({ mapId: m.id, x: mapX, y: mapY + 2, w: mw, h: mh });
    mapX += mw + 10;
  }
  window._mafiaLobbyMapBtns = mapBtns;

  // ---- Settings list ----
  const listY = mapY + 42;
  const listH = ph - (listY - py) - 16;
  const rowH = 40;

  ctx.save();
  ctx.beginPath(); ctx.rect(px, listY, pw, listH); ctx.clip();

  const settingBtns = [];
  let drawY = listY - _mafiaLobbySettingsScroll;

  for (const def of MAFIA_SETTING_DEFS) {
    if (def.section) {
      ctx.fillStyle = 'rgba(50,60,80,0.6)';
      ctx.fillRect(px + 10, drawY, pw - 20, 28);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#8899bb';
      ctx.textAlign = 'left';
      ctx.fillText(def.section, px + 20, drawY + 19);
      drawY += 32;
      continue;
    }

    const ry = drawY;
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(def.label, px + 30, ry + 25);

    const btnW = 32, btnH = 28;
    const valW = 80;
    const rightX = px + pw - 30;

    if (def.type === 'bool') {
      const val = MAFIA_SETTINGS[def.key];
      const tW = 80, tH = 28;
      const tX = rightX - tW;
      ctx.fillStyle = val ? 'rgba(40,160,80,0.8)' : 'rgba(120,40,40,0.8)';
      ctx.beginPath(); ctx.roundRect(tX, ry + 6, tW, tH, 6); ctx.fill();
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText(val ? 'ON' : 'OFF', tX + tW / 2, ry + 24);
      settingBtns.push({ key: def.key, dir: 'toggle', x: tX, y: ry + 6, w: tW, h: tH });
    } else {
      // - button
      const minusX = rightX - btnW * 2 - valW - 4;
      ctx.fillStyle = 'rgba(180,40,40,0.7)';
      ctx.beginPath(); ctx.roundRect(minusX, ry + 6, btnW, btnH, 6); ctx.fill();
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('\u2212', minusX + btnW / 2, ry + 25);
      settingBtns.push({ key: def.key, dir: 'dec', x: minusX, y: ry + 6, w: btnW, h: btnH });

      // Value display (clickable for direct input)
      const vX = minusX + btnW + 2;
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.roundRect(vX, ry + 6, valW, btnH, 4); ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.stroke();

      let valStr = '';
      const val = MAFIA_SETTINGS[def.key];
      if (def.type === 'enum') {
        valStr = String(val);
      } else if (def.type === 'float') {
        valStr = parseFloat(val).toFixed(2).replace(/\.?0+$/, '') + (def.suffix || '');
      } else {
        valStr = String(val) + (def.suffix || '');
      }
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(valStr, vX + valW / 2, ry + 24);
      // Clickable value for direct numeric input
      if (def.type === 'int' || def.type === 'float') {
        settingBtns.push({ key: def.key, dir: 'input', x: vX, y: ry + 6, w: valW, h: btnH });
      }

      // + button
      const plusX = vX + valW + 2;
      ctx.fillStyle = 'rgba(40,140,80,0.7)';
      ctx.beginPath(); ctx.roundRect(plusX, ry + 6, btnW, btnH, 6); ctx.fill();
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('+', plusX + btnW / 2, ry + 25);
      settingBtns.push({ key: def.key, dir: 'inc', x: plusX, y: ry + 6, w: btnW, h: btnH });
    }

    drawY += rowH;
  }

  ctx.restore();
  window._mafiaLobbySettingBtns = settingBtns;

  // Scrollbar
  const totalH = MAFIA_SETTING_DEFS.length * rowH;
  if (totalH > listH) {
    const barH = Math.max(30, listH * (listH / totalH));
    const barY = listY + (_mafiaLobbySettingsScroll / (totalH - listH)) * (listH - barH);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath(); ctx.roundRect(px + pw - 10, barY, 6, barH, 3); ctx.fill();
  }
}

// ---- COLOR PICKER ----
function _drawLobbyColorPicker(cw, ch) {
  const pw = 400, ph = 380;
  const px = (cw - pw) / 2, py = (ch - ph) / 2;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, cw, ch);

  ctx.fillStyle = '#3a3a44';
  ctx.beginPath(); ctx.roundRect(px - 4, py - 4, pw + 8, ph + 8, 14); ctx.fill();
  ctx.fillStyle = '#2a2a32';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();

  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.fillText('CHOOSE YOUR COLOR', px + pw / 2, py + 36);

  const cbx = px + pw - 44, cby = py + 10, cbs = 32;
  ctx.fillStyle = '#444';
  ctx.beginPath(); ctx.roundRect(cbx, cby, cbs, cbs, 6); ctx.fill();
  ctx.font = 'bold 18px monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText('X', cbx + cbs / 2, cby + 23);
  window._mafiaLobbyColorCloseBtn = { x: cbx, y: cby, w: cbs, h: cbs };

  const colors = MAFIA_GAME.COLORS;
  const dotR = 28;
  const gapX = 68, gapY = 72;
  const cols = 5;
  const gridW = cols * gapX;
  const startX = px + (pw - gridW) / 2 + gapX / 2;
  const startY = py + 70;

  const colorBtns = [];

  for (let i = 0; i < colors.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const ccx = startX + col * gapX;
    const ccy = startY + row * gapY;
    const c = colors[i];
    const selected = i === mafiaPlayerColorIdx;

    if (selected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(ccx, ccy, dotR + 6, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.fillStyle = c.body;
    ctx.beginPath(); ctx.arc(ccx, ccy, dotR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 3;
    ctx.stroke();

    if (selected) {
      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u2713', ccx, ccy);
      ctx.textBaseline = 'alphabetic';
    }

    ctx.font = '11px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, ccx, ccy + dotR + 16);

    colorBtns.push({ idx: i, x: ccx - dotR - 4, y: ccy - dotR - 4, w: (dotR + 4) * 2, h: (dotR + 4) * 2 });
  }

  // Preview
  const previewY = startY + 2 * gapY + 40;
  const selectedColor = colors[mafiaPlayerColorIdx];
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#888';
  ctx.fillText('PREVIEW', px + pw / 2, previewY);

  const pcx = px + pw / 2, pcy = previewY + 40;
  ctx.fillStyle = selectedColor.body;
  ctx.beginPath(); ctx.ellipse(pcx, pcy, 18, 24, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#88ccff';
  ctx.beginPath(); ctx.ellipse(pcx + 8, pcy - 8, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = selectedColor.dark;
  ctx.beginPath(); ctx.ellipse(pcx - 18, pcy + 2, 6, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = selectedColor.dark;
  ctx.fillRect(pcx - 12, pcy + 20, 10, 12);
  ctx.fillRect(pcx + 2, pcy + 20, 10, 12);

  window._mafiaLobbyColorBtns = colorBtns;
}

function isMafiaLobbyPanelOpen() {
  return _mafiaLobbySettingsOpen || _mafiaLobbyColorOpen;
}

// Handle setting changes — all integer, increment by 1
function handleMafiaSettingChange(key, dir) {
  const def = MAFIA_SETTING_DEFS.find(d => d.key === key);
  if (!def) return;

  if (def.type === 'bool' || dir === 'toggle') {
    MAFIA_SETTINGS[key] = !MAFIA_SETTINGS[key];
  } else if (dir === 'input') {
    // Prompt for direct numeric input
    const current = MAFIA_SETTINGS[key];
    const input = prompt(def.label + ' (' + def.min + '-' + def.max + '):', String(current));
    if (input !== null) {
      const num = def.type === 'float' ? parseFloat(input) : parseInt(input, 10);
      if (!isNaN(num)) {
        MAFIA_SETTINGS[key] = Math.max(def.min, Math.min(def.max, parseFloat(num.toFixed(2))));
      }
    }
  } else if (def.type === 'float') {
    let val = MAFIA_SETTINGS[key];
    const step = def.step || 0.25;
    if (dir === 'inc') val = Math.min(val + step, def.max);
    else val = Math.max(val - step, def.min);
    MAFIA_SETTINGS[key] = parseFloat(val.toFixed(2));
  } else if (def.type === 'enum') {
    const vals = def.values;
    let idx = vals.indexOf(MAFIA_SETTINGS[key]);
    if (dir === 'inc') idx = Math.min(idx + 1, vals.length - 1);
    else idx = Math.max(idx - 1, 0);
    MAFIA_SETTINGS[key] = vals[idx];
  } else {
    let val = MAFIA_SETTINGS[key];
    if (dir === 'inc') val = Math.min(val + 1, def.max);
    else val = Math.max(val - 1, def.min);
    MAFIA_SETTINGS[key] = val;
  }
}

function handleMafiaSettingsScroll(deltaY) {
  if (!_mafiaLobbySettingsOpen) return;
  const rowH = 40;
  const totalH = MAFIA_SETTING_DEFS.length * rowH;
  const listH = 560 - 110 - 16;
  const maxScroll = Math.max(0, totalH - listH);
  _mafiaLobbySettingsScroll = Math.max(0, Math.min(maxScroll, _mafiaLobbySettingsScroll + deltaY));
}
