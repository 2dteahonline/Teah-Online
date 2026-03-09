// ===================== SKELD FOV & HUD =====================
// Client: FOV overlay, meeting UI, HUD buttons, ejection animation for Among Us mode.
// Phase 1: Stub — just shows role indicator text.
// Depends on: SkeldState (skeldSystem.js), Scene (sceneManager.js), ctx (global canvas)

function drawSkeldFOV() {
  // Phase 1: no FOV overlay yet (coming in Phase 4)
}

function drawSkeldHUD() {
  if (typeof SkeldState === 'undefined' || SkeldState.phase === 'idle') return;
  if (typeof Scene === 'undefined' || !Scene.inSkeld) return;

  // ---- Role indicator (top-left corner) ----
  const role = SkeldState.playerRole;
  if (!role) return;

  const text = role.toUpperCase();
  const isImpostor = role === 'impostor';

  ctx.save();
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Background pill
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

  // Border
  ctx.strokeStyle = isImpostor ? '#ff4444' : '#44aaff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x + padX, y + padY);

  ctx.restore();
}
