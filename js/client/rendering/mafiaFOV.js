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

  // ---- Role indicator (top-left corner) ----
  const text = role.toUpperCase();
  const isImpostor = role === 'impostor';

  ctx.save();
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const x = 20;
  const y = 20;
  const metrics = ctx.measureText(text);
  const padX = 16;
  const padY = 8;
  const pillW = metrics.width + padX * 2;
  const pillH = 36 + padY;

  ctx.fillStyle = isImpostor ? 'rgba(200, 20, 20, 0.7)' : 'rgba(20, 100, 200, 0.7)';
  ctx.beginPath();
  ctx.roundRect(x, y, pillW, pillH, 8);
  ctx.fill();

  ctx.strokeStyle = isImpostor ? '#ff4444' : '#44aaff';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + padX, y + padY);
  ctx.restore();

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
