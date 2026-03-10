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

function drawMafiaFOV() {
  // Phase 4: FOV overlay will go here

  // O2 fog effect — progressive fog for crewmates during O2 sabotage
  if (typeof MafiaState !== 'undefined' && MafiaState.sabotage.active === 'o2_depletion'
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

  // ---- Sabotage timer + alert overlay (visible to all during active sabotage) ----
  if (mk.sabotage.active && mk.phase === 'playing') {
    _drawSabotageOverlay();
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
    const menuH = 110;
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

    // Reactor option
    const optH = 40;
    const optY1 = menuY + 10;
    const optY2 = menuY + 10 + optH + 8;

    ctx.fillStyle = '#cc3333';
    ctx.beginPath();
    ctx.roundRect(menuX + 12, optY1, menuW - 24, optH, 8);
    ctx.fill();
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('Reactor', menuX + menuW / 2, optY1 + optH / 2);

    window._mafiaSabReactorBtn = { x: menuX + 12, y: optY1, w: menuW - 24, h: optH };

    // O2 option
    ctx.fillStyle = '#3388cc';
    ctx.beginPath();
    ctx.roundRect(menuX + 12, optY2, menuW - 24, optH, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('O2', menuX + menuW / 2, optY2 + optH / 2);

    window._mafiaSabO2Btn = { x: menuX + 12, y: optY2, w: menuW - 24, h: optH };

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  } else {
    window._mafiaSabReactorBtn = null;
    window._mafiaSabO2Btn = null;
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

  // Pulsing red vignette — flashes entire duration, faster as timer runs out
  // Pulse speed: slow (800ms) at start → fast (200ms) at end
  const pulseSpeed = 800 - progress * 600; // 800→200ms
  const pulseBase = 0.04 + progress * 0.12; // 0.04→0.16
  const pulseRange = 0.03 + progress * 0.08; // 0.03→0.11
  const pulseAlpha = pulseBase + Math.sin(Date.now() / pulseSpeed * Math.PI * 2) * pulseRange;
  ctx.fillStyle = 'rgba(200, 30, 30, ' + Math.max(0, pulseAlpha) + ')';
  ctx.fillRect(0, 0, cw, ctx.canvas.height);

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
    const o2Held = mk.sabotage.fixers.o2_o2 !== null;
    const adminHeld = mk.sabotage.fixers.o2_admin !== null;
    ctx.fillText(
      'O2 Room: ' + (o2Held ? 'HELD' : 'EMPTY') +
      '  |  Admin: ' + (adminHeld ? 'HELD' : 'EMPTY'),
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
      for (let v = 0; v < visibleVoters.length; v++) {
        const voter = mk.participants.find(pp => pp.id === visibleVoters[v]);
        if (voter) {
          const vCol = voter.color ? voter.color.body : '#888';
          const vDark = voter.color ? voter.color.dark : '#555';
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

    for (let s = 0; s < visibleSkippers.length; s++) {
      const skipper = mk.participants.find(pp => pp.id === visibleSkippers[s]);
      if (skipper) {
        const sCol = skipper.color ? skipper.color.body : '#888';
        const sDark = skipper.color ? skipper.color.dark : '#555';
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
