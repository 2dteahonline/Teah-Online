// ===================== HIDE & SEEK FOV & UI =====================
// Client rendering: FOV overlay, minimap, HUD, and role/post-match overlays
// for the Hide & Seek game mode. All drawing in screen-space (1920x1080).

// Phase transition flash timer (module-level)
let _phaseFlashTimer = 0;
let _lastHideSeekPhase = '';

// ─────────────────────────────────────────────────────────────────
// 1. FOV — dark overlay with circular cutout around the seeker
// ─────────────────────────────────────────────────────────────────
function drawHideSeekFOV() {
  if (typeof Scene === 'undefined' || typeof HideSeekState === 'undefined') return;
  if (!Scene.inHideSeek) return;
  if (HideSeekState.phase !== 'seek') return;
  if (HideSeekState.playerRole !== 'seeker') return;
  if (typeof ctx === 'undefined' || typeof player === 'undefined' || typeof camera === 'undefined') return;

  const px = (player.x - camera.x) * WORLD_ZOOM;
  const py = (player.y - camera.y) * WORLD_ZOOM;
  const fovR = HIDESEEK.FOV_RADIUS * TILE * WORLD_ZOOM;

  // --- Dark overlay with circular hole via path subtraction ---
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, BASE_W, BASE_H);                   // outer rect (clockwise)
  ctx.arc(px, py, fovR, 0, Math.PI * 2, true);       // inner circle (CCW = hole)
  ctx.fillStyle = 'rgba(0,0,0,0.97)';
  ctx.fill();

  // --- Soft gradient ring for fade at the edge ---
  const innerR = fovR * 0.7;
  const grad = ctx.createRadialGradient(px, py, innerR, px, py, fovR);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.97)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(px, py, fovR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 2. Minimap — shown to seeker during hide phase (top-right)
// ─────────────────────────────────────────────────────────────────
function drawHideSeekMinimap() {
  if (typeof Scene === 'undefined' || typeof HideSeekState === 'undefined') return;
  if (!Scene.inHideSeek) return;
  if (HideSeekState.phase !== 'hide') return;
  if (HideSeekState.playerRole !== 'seeker') return;
  if (typeof ctx === 'undefined' || typeof level === 'undefined') return;

  const mmW = 240;
  const mmH = 180;
  const mmX = BASE_W - mmW - 20;
  const mmY = 20;
  const tileW = mmW / level.widthTiles;
  const tileH = mmH / level.heightTiles;

  ctx.save();

  // --- Background panel with rounded corners ---
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 8);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // --- Draw collision grid ---
  if (typeof collisionGrid !== 'undefined') {
    for (let row = 0; row < level.heightTiles; row++) {
      for (let col = 0; col < level.widthTiles; col++) {
        const isWall = collisionGrid[row] && collisionGrid[row][col] === 1;
        ctx.fillStyle = isWall ? '#3a3a4a' : '#1a1a2a';
        ctx.fillRect(
          mmX + col * tileW,
          mmY + row * tileH,
          Math.ceil(tileW),
          Math.ceil(tileH)
        );
      }
    }
  }

  // --- Seeker spawn pulsing blue dot ---
  if (typeof player !== 'undefined') {
    const t = typeof renderTime !== 'undefined' ? renderTime : Date.now();
    const pulse = 0.5 + Math.sin(t / 300) * 0.5;
    const dotX = mmX + (player.x / TILE) * tileW;
    const dotY = mmY + (player.y / TILE) * tileH;
    const dotR = 3 + pulse * 2;

    ctx.fillStyle = `rgba(60,140,255,${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Glow ring
    ctx.strokeStyle = `rgba(60,140,255,${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotR + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Semi-transparent border ---
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 8);
  ctx.stroke();

  // --- Label above minimap ---
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.fillText('MAP LAYOUT', mmX + mmW / 2, mmY - 6);
  ctx.textAlign = 'left';

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 3. HUD — phase timer, role indicator, phase label, transition flash
// ─────────────────────────────────────────────────────────────────
function drawHideSeekHUD() {
  if (typeof Scene === 'undefined' || typeof HideSeekState === 'undefined') return;
  if (!Scene.inHideSeek) return;
  if (HideSeekState.phase === 'idle') return;
  if (typeof ctx === 'undefined') return;

  const phase = HideSeekState.phase;
  const cx = BASE_W / 2;

  // --- Detect phase transition for flash effect ---
  if (_lastHideSeekPhase === 'hide' && phase === 'seek') {
    _phaseFlashTimer = 120;
  }
  _lastHideSeekPhase = phase;

  // Decrement flash timer each frame
  if (_phaseFlashTimer > 0) {
    _phaseFlashTimer--;
  }

  ctx.save();
  ctx.textAlign = 'center';

  // --- Phase label (small text above timer) ---
  let phaseLabel = '';
  if (phase === 'hide')        phaseLabel = 'HIDE PHASE';
  else if (phase === 'seek')   phaseLabel = 'SEEK PHASE';
  else if (phase === 'role_select') phaseLabel = 'CHOOSING ROLE';

  if (phaseLabel) {
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(phaseLabel, cx, 30);
  }

  // --- Phase timer ---
  if (phase === 'hide' || phase === 'seek') {
    const secondsLeft = Math.ceil(HideSeekState.phaseTimer / 60);
    const timerText = secondsLeft + 's';

    // Color by phase
    let timerColor;
    if (phase === 'hide') {
      timerColor = '#ffb840'; // amber
    } else {
      timerColor = '#ff4a4a'; // red
    }

    // Pulsing when < 10s
    let alpha = 1.0;
    if (secondsLeft < 10) {
      const t = typeof renderTime !== 'undefined' ? renderTime : Date.now();
      alpha = 0.5 + Math.sin(t / 100) * 0.5;
    }

    ctx.globalAlpha = alpha;
    ctx.font = 'bold 42px monospace';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 5;
    ctx.strokeText(timerText, cx, 68);
    ctx.fillStyle = timerColor;
    ctx.fillText(timerText, cx, 68);
    ctx.globalAlpha = 1.0;
  }

  // --- Role indicator (below timer) ---
  if (phase === 'hide' || phase === 'seek') {
    let roleText = '';
    let roleColor = '';

    if (HideSeekState.playerRole === 'hider') {
      roleText = 'YOU ARE THE HIDER';
      roleColor = '#5fca80';
    } else if (HideSeekState.playerRole === 'seeker') {
      roleText = 'YOU ARE THE SEEKER';
      roleColor = '#ff9a40';
    }

    if (roleText) {
      ctx.font = 'bold 18px monospace';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3;
      ctx.strokeText(roleText, cx, 95);
      ctx.fillStyle = roleColor;
      ctx.fillText(roleText, cx, 95);
    }
  }

  // --- Phase transition flash ("SEEK PHASE BEGINS!") ---
  if (_phaseFlashTimer > 0) {
    const flashAlpha = _phaseFlashTimer / 120;
    const scale = 1.0 + (1.0 - flashAlpha) * 0.3; // grows slightly as it fades

    ctx.save();
    ctx.globalAlpha = flashAlpha;
    ctx.translate(cx, BASE_H / 2 - 40);
    ctx.scale(scale, scale);

    ctx.font = 'bold 56px monospace';
    ctx.strokeStyle = 'rgba(0,0,0,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeText('SEEK PHASE BEGINS!', 0, 0);
    ctx.fillStyle = '#ff4a4a';
    ctx.fillText('SEEK PHASE BEGINS!', 0, 0);

    ctx.restore();
  }

  ctx.textAlign = 'left';
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────
// 4. Overlay — role_select panel and post_match results
// ─────────────────────────────────────────────────────────────────
function drawHideSeekOverlay() {
  if (typeof Scene === 'undefined' || typeof HideSeekState === 'undefined') return;
  if (!Scene.inHideSeek) return;
  if (typeof ctx === 'undefined') return;

  const phase = HideSeekState.phase;

  // ===== ROLE SELECT =====
  if (phase === 'role_select') {
    _drawRoleSelectOverlay();
    return;
  }

  // ===== POST MATCH =====
  if (phase === 'post_match') {
    _drawPostMatchOverlay();
    return;
  }
}

// ── Role Select Panel ──
function _drawRoleSelectOverlay() {
  const panelW = 500;
  const panelH = 300;
  const panelX = (BASE_W - panelW) / 2;
  const panelY = (BASE_H - panelH) / 2;

  ctx.save();

  // --- Dim backdrop ---
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // --- Panel background ---
  ctx.fillStyle = '#0c1018';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  // --- Amber border ---
  ctx.strokeStyle = '#ff9a40';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  // --- Title ---
  ctx.textAlign = 'center';
  ctx.font = 'bold 32px monospace';
  ctx.fillStyle = '#ff9a40';
  ctx.fillText('HIDE & SEEK', BASE_W / 2, panelY + 50);

  // --- Subtitle ---
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Choose your role', BASE_W / 2, panelY + 78);

  // --- Buttons ---
  const btnW = 190;
  const btnH = 150;
  const btnGap = 30;
  const btnY = panelY + 100;
  const hiderX = BASE_W / 2 - btnGap / 2 - btnW;
  const seekerX = BASE_W / 2 + btnGap / 2;

  // Hider button (green)
  _drawRoleButton(hiderX, btnY, btnW, btnH, {
    color: '#5fca80',
    label: 'HIDER',
    sub1: '30s to hide',
    sub2: 'Stay hidden to win'
  });

  // Seeker button (orange/red)
  _drawRoleButton(seekerX, btnY, btnW, btnH, {
    color: '#ff6a3a',
    label: 'SEEKER',
    sub1: '60s to find hider',
    sub2: 'Tag with melee to win'
  });

  // --- Store button bounds globally for click detection ---
  window._hsRoleButtons = {
    hider:  { x: hiderX,  y: btnY, w: btnW, h: btnH },
    seeker: { x: seekerX, y: btnY, w: btnW, h: btnH }
  };

  ctx.textAlign = 'left';
  ctx.restore();
}

// Helper: draw a role selection button
function _drawRoleButton(x, y, w, h, opts) {
  const color = opts.color;

  // Button background
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();

  // Button border
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.stroke();

  // Subtle top highlight
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 4, [10, 10, 0, 0]);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Label
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px monospace';
  ctx.fillStyle = color;
  ctx.fillText(opts.label, x + w / 2, y + 50);

  // Sublabel 1
  ctx.font = '13px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(opts.sub1, x + w / 2, y + 85);

  // Sublabel 2
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(opts.sub2, x + w / 2, y + 108);
}

// ── Post Match Panel ──
function _drawPostMatchOverlay() {
  const panelW = 500;
  const panelH = 280;
  const panelX = (BASE_W - panelW) / 2;
  const panelY = (BASE_H - panelH) / 2;

  ctx.save();

  // --- Dim backdrop ---
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // --- Panel background ---
  ctx.fillStyle = '#0c1018';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  // --- Border ---
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.stroke();

  ctx.textAlign = 'center';

  // --- Determine win/loss ---
  const seekerWon = HideSeekState.seekerWon;
  const isSeeker = HideSeekState.playerRole === 'seeker';
  const playerWon = (isSeeker && seekerWon) || (!isSeeker && !seekerWon);

  // --- Win/Lose header ---
  ctx.font = 'bold 38px monospace';
  if (playerWon) {
    ctx.fillStyle = '#5fca80';
    ctx.fillText('YOU WIN!', BASE_W / 2, panelY + 55);
  } else {
    ctx.fillStyle = '#ff4a4a';
    ctx.fillText('YOU LOSE!', BASE_W / 2, panelY + 55);
  }

  // --- Result details ---
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';

  if (seekerWon) {
    // Seeker found the hider — show time taken
    let timeTaken = 0;
    if (typeof HideSeekState.tagFrame !== 'undefined' && typeof HideSeekState.matchStartFrame !== 'undefined') {
      timeTaken = ((HideSeekState.tagFrame - HideSeekState.matchStartFrame) / 60).toFixed(1);
    }
    ctx.fillText('Hider was found in ' + timeTaken + 's', BASE_W / 2, panelY + 90);
  } else {
    // Hider survived
    ctx.fillText('Time ran out! Hider survived.', BASE_W / 2, panelY + 90);
  }

  // --- If seeker lost, show minimap with hider position ---
  if (isSeeker && !seekerWon && HideSeekState.botMob) {
    _drawPostMatchMinimap(panelX, panelY, panelW);
  }

  // --- Bottom text: press key to return ---
  let keyName = 'E';
  if (typeof getKeyDisplayName === 'function' && typeof keybinds !== 'undefined' && keybinds.interact) {
    keyName = getKeyDisplayName(keybinds.interact);
  }

  ctx.font = '14px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('Press [' + keyName + '] to return to lobby', BASE_W / 2, panelY + panelH - 25);

  ctx.textAlign = 'left';
  ctx.restore();
}

// Helper: small minimap showing hider position (post-match, seeker lost)
function _drawPostMatchMinimap(panelX, panelY, panelW) {
  if (typeof level === 'undefined') return;

  const mmW = 160;
  const mmH = 120;
  const mmX = panelX + (panelW - mmW) / 2;
  const mmY = panelY + 110;
  const tileW = mmW / level.widthTiles;
  const tileH = mmH / level.heightTiles;

  // --- Background ---
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 6);
  ctx.fill();

  // --- Draw collision grid ---
  if (typeof collisionGrid !== 'undefined') {
    for (let row = 0; row < level.heightTiles; row++) {
      for (let col = 0; col < level.widthTiles; col++) {
        const isWall = collisionGrid[row] && collisionGrid[row][col] === 1;
        ctx.fillStyle = isWall ? '#3a3a4a' : '#1a1a2a';
        ctx.fillRect(
          mmX + col * tileW,
          mmY + row * tileH,
          Math.ceil(tileW),
          Math.ceil(tileH)
        );
      }
    }
  }

  // --- Player position (blue dot) ---
  if (typeof player !== 'undefined') {
    const playerDotX = mmX + (player.x / TILE) * tileW;
    const playerDotY = mmY + (player.y / TILE) * tileH;
    ctx.fillStyle = 'rgba(60,140,255,0.9)';
    ctx.beginPath();
    ctx.arc(playerDotX, playerDotY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Hider bot position (pulsing red dot) ---
  const bot = HideSeekState.botMob;
  if (bot) {
    const t = typeof renderTime !== 'undefined' ? renderTime : Date.now();
    const pulse = 0.5 + Math.sin(t / 200) * 0.5;
    const botDotX = mmX + (bot.x / TILE) * tileW;
    const botDotY = mmY + (bot.y / TILE) * tileH;
    const dotR = 3 + pulse * 2;

    ctx.fillStyle = `rgba(255,60,60,${0.6 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(botDotX, botDotY, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Glow ring
    ctx.strokeStyle = `rgba(255,60,60,${0.3 + pulse * 0.3})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(botDotX, botDotY, dotR + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- Border ---
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 6);
  ctx.stroke();

  // --- Label ---
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(255,80,60,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('HIDER WAS HERE', mmX + mmW / 2, mmY + mmH + 14);
}
