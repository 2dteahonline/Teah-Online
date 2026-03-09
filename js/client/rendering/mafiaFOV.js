// ===================== MAFIA FOV & HUD =====================
// Client: FOV overlay, meeting UI, HUD buttons, body rendering, ghost overlay for Mafia mode.
// Depends on: MafiaState (mafiaSystem.js), Scene (sceneManager.js), ctx (global canvas)

// ---- Click region for KILL button ----
window._mafiaKillBtn = null; // { x, y, w, h } — set each frame when drawn

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
