// ===================== MAFIA FOV & HUD =====================
// Client: FOV overlay, meeting UI, HUD buttons, body rendering, ghost overlay for Mafia mode.
// Depends on: MafiaState (mafiaSystem.js), Scene (sceneManager.js), ctx (global canvas)

// ---- Click regions ----
window._mafiaKillBtn = null; // { x, y, w, h } — set each frame when drawn
window._mafiaReportBtn = null;
window._mafiaEmergencyBtn = null;
window._mafiaVotePortraits = null; // [{ id, x, y, w, h }]
window._mafiaSkipBtn = null;

function drawMafiaFOV() {
  // Phase 4: FOV overlay will go here
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

    // ---- EMERGENCY button (bottom-left, stacked above report) ----
    const canEmergency = MafiaSystem.canCallEmergency();

    const eBtnW = 110;
    const eBtnH = 44;
    const eBtnX = 30;
    const eBtnY = rBtnY - eBtnH - 12;

    ctx.save();
    ctx.fillStyle = canEmergency ? 'rgba(180, 40, 40, 0.85)' : 'rgba(60, 20, 20, 0.3)';
    ctx.beginPath();
    ctx.roundRect(eBtnX, eBtnY, eBtnW, eBtnH, 10);
    ctx.fill();
    ctx.strokeStyle = canEmergency ? '#ff4444' : '#442222';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canEmergency ? '#ffffff' : '#664444';
    ctx.fillText('EMERGENCY', eBtnX + eBtnW / 2, eBtnY + eBtnH / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();

    window._mafiaEmergencyBtn = canEmergency ? { x: eBtnX, y: eBtnY, w: eBtnW, h: eBtnH } : null;
  } else {
    window._mafiaReportBtn = null;
    window._mafiaEmergencyBtn = null;
  }

  // ---- Meeting / Voting / Ejection overlays ----
  if (mk.phase === 'meeting' || mk.phase === 'voting') {
    _drawMeetingUI();
  } else if (mk.phase === 'ejecting') {
    _drawEjectionUI();
  } else {
    window._mafiaVotePortraits = null;
    window._mafiaSkipBtn = null;
  }
}


// ===================== MEETING UI =====================
function _drawMeetingUI() {
  const mk = MafiaState;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;

  // Full-screen dark overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.fillRect(0, 0, cw, ch);

  // Meeting panel
  const panelW = 700;
  const panelH = 520;
  const panelX = (cw - panelW) / 2;
  const panelY = (ch - panelH) / 2 - 20;

  // Panel background
  ctx.fillStyle = 'rgba(20, 20, 35, 0.95)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Title
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  const titleText = mk.meeting.type === 'emergency'
    ? mk.meeting.caller + ' called an Emergency Meeting!'
    : mk.meeting.caller + ' reported a body!';
  ctx.fillText(titleText, cw / 2, panelY + 36);

  // Timer
  const isDiscussion = mk.phase === 'meeting';
  const timerSec = isDiscussion
    ? Math.ceil(mk.meeting.discussionTimer / 60)
    : Math.ceil(mk.meeting.votingTimer / 60);
  const timerLabel = isDiscussion ? 'DISCUSSION' : 'VOTING';
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = isDiscussion ? '#66bbff' : '#ffaa44';
  ctx.fillText(timerLabel + ': ' + timerSec + 's', cw / 2, panelY + 60);

  // ---- Participant portraits in a 3x3 grid ----
  const portraits = [];
  const gridCols = 3;
  const portraitW = 180;
  const portraitH = 80;
  const gapX = 20;
  const gapY = 14;
  const gridStartX = panelX + (panelW - (gridCols * portraitW + (gridCols - 1) * gapX)) / 2;
  const gridStartY = panelY + 80;

  const alivePlayers = mk.participants.filter(p => p.alive);
  const deadPlayers = mk.participants.filter(p => !p.alive);
  const orderedPlayers = [...alivePlayers, ...deadPlayers];

  for (let i = 0; i < orderedPlayers.length; i++) {
    const p = orderedPlayers[i];
    const col = i % gridCols;
    const row = Math.floor(i / gridCols);
    const px = gridStartX + col * (portraitW + gapX);
    const py = gridStartY + row * (portraitH + gapY);

    const isAlive = p.alive;
    const hasVoted = p.votedFor !== null;
    const isLocalPlayer = p.isLocal;
    const localP = MafiaSystem.getLocalPlayer();
    const localHasVoted = localP && localP.votedFor !== null;
    const votedForThis = localP && localP.votedFor === p.id;

    // Portrait background
    if (!isAlive) {
      ctx.fillStyle = 'rgba(40, 40, 40, 0.7)';
    } else if (votedForThis) {
      ctx.fillStyle = 'rgba(200, 60, 60, 0.6)';
    } else {
      ctx.fillStyle = 'rgba(40, 50, 70, 0.8)';
    }
    ctx.beginPath();
    ctx.roundRect(px, py, portraitW, portraitH, 10);
    ctx.fill();

    // Border
    if (votedForThis) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2.5;
    } else {
      ctx.strokeStyle = isAlive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
    }
    ctx.beginPath();
    ctx.roundRect(px, py, portraitW, portraitH, 10);
    ctx.stroke();

    // Color swatch (Among Us body color)
    const swatchSize = 36;
    const swatchX = px + 10;
    const swatchY = py + (portraitH - swatchSize) / 2;
    ctx.fillStyle = p.color ? p.color.body : '#888';
    ctx.beginPath();
    ctx.ellipse(swatchX + swatchSize / 2, swatchY + swatchSize / 2, swatchSize / 2 - 2, swatchSize / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Visor
    ctx.fillStyle = '#a8d8ea';
    ctx.beginPath();
    ctx.ellipse(swatchX + swatchSize / 2 + 4, swatchY + swatchSize / 2 - 4, 8, 6, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Name
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = isAlive ? '#fff' : '#666';
    ctx.fillText(p.name, px + 52, py + 30);

    // Status indicators
    ctx.font = '12px monospace';
    if (!isAlive) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('DEAD', px + 52, py + 50);
    } else if (hasVoted && mk.phase === 'voting') {
      ctx.fillStyle = '#66ff66';
      ctx.fillText('VOTED', px + 52, py + 50);
    } else if (isLocalPlayer && mk.phase === 'voting') {
      ctx.fillStyle = '#aaa';
      ctx.fillText('(you)', px + 52, py + 50);
    }

    // Dead X overlay
    if (!isAlive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,50,50,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 5, py + 5);
      ctx.lineTo(px + portraitW - 5, py + portraitH - 5);
      ctx.moveTo(px + portraitW - 5, py + 5);
      ctx.lineTo(px + 5, py + portraitH - 5);
      ctx.stroke();
      ctx.restore();
    }

    // Store click region (only if voting phase, player alive, and hasn't voted)
    if (mk.phase === 'voting' && isAlive && !isLocalPlayer) {
      portraits.push({ id: p.id, x: px, y: py, w: portraitW, h: portraitH });
    }
  }

  // ---- Vote tally (show after voting complete or during ejecting) ----
  if (mk.phase === 'voting') {
    // Show vote counts next to portraits after local player has voted
    const localP = MafiaSystem.getLocalPlayer();
    if (localP && localP.votedFor !== null) {
      // Count visible votes
      const voteCounts = {};
      let skipCount = 0;
      for (const p of mk.participants) {
        if (!p.alive || p.votedFor === null) continue;
        if (p.votedFor === 'skip') skipCount++;
        else voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }

      // Draw vote count pips next to each portrait
      for (let i = 0; i < orderedPlayers.length; i++) {
        const p = orderedPlayers[i];
        const col = i % gridCols;
        const row = Math.floor(i / gridCols);
        const px2 = gridStartX + col * (portraitW + gapX);
        const py2 = gridStartY + row * (portraitH + gapY);
        const count = voteCounts[p.id] || 0;
        if (count > 0) {
          ctx.font = 'bold 14px monospace';
          ctx.textAlign = 'right';
          ctx.fillStyle = '#ff6666';
          ctx.fillText(count + ' vote' + (count > 1 ? 's' : ''), px2 + portraitW - 8, py2 + portraitH - 8);
        }
      }
    }
  }

  // ---- SKIP button ----
  if (mk.phase === 'voting') {
    const localP = MafiaSystem.getLocalPlayer();
    const canVote = localP && localP.alive && localP.votedFor === null;

    const skipW = 200;
    const skipH = 44;
    const skipX = (cw - skipW) / 2;
    const skipY = panelY + panelH - 60;

    ctx.fillStyle = canVote ? 'rgba(80, 80, 100, 0.85)' : 'rgba(40, 40, 50, 0.5)';
    ctx.beginPath();
    ctx.roundRect(skipX, skipY, skipW, skipH, 10);
    ctx.fill();
    ctx.strokeStyle = canVote ? '#8888aa' : '#444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = canVote ? '#ddd' : '#666';
    ctx.fillText('SKIP VOTE', skipX + skipW / 2, skipY + skipH / 2);

    window._mafiaSkipBtn = canVote ? { x: skipX, y: skipY, w: skipW, h: skipH } : null;
  } else {
    window._mafiaSkipBtn = null;
  }

  // Discussion phase message
  if (mk.phase === 'meeting') {
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Voting begins after discussion...', cw / 2, panelY + panelH - 35);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  window._mafiaVotePortraits = mk.phase === 'voting' ? portraits : null;
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
