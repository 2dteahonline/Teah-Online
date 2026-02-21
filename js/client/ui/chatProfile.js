// ===================== CHAT & PROFILE UI =====================
// Client UI: chat panel, profile display, HUD elements
// Extracted from index_2.html — Phase D

// ===================== GUN HUD (right side) =====================
// ===================== CHAT & PROFILE UI =====================
// Graal-style icon buttons — dark rounded squares, stacked vertically
const ICON_X = 12, ICON_SIZE = 48, ICON_GAP = 8;
const ICON_RADIUS = 10;

function drawIconButton(x, y, active, drawContent) {
  // Dark bg
  ctx.fillStyle = active ? "rgba(60,60,70,0.85)" : "rgba(20,20,28,0.8)";
  ctx.beginPath(); ctx.roundRect(x, y, ICON_SIZE, ICON_SIZE, ICON_RADIUS); ctx.fill();
  // Border
  ctx.strokeStyle = active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(x, y, ICON_SIZE, ICON_SIZE, ICON_RADIUS); ctx.stroke();
  // Inner highlight (top edge)
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + ICON_RADIUS, y + 1);
  ctx.lineTo(x + ICON_SIZE - ICON_RADIUS, y + 1);
  ctx.stroke();
  drawContent(x, y);
}

function drawChatIcon() {
  const y = 12;
  drawIconButton(ICON_X, y, UI.isOpen('chat'), (x, y) => {
    // Speech bubble
    ctx.fillStyle = UI.isOpen('chat') ? "#fff" : "#bbb";
    ctx.beginPath(); ctx.roundRect(x + 10, y + 10, 28, 18, 5); ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 28);
    ctx.lineTo(x + 12, y + 36);
    ctx.lineTo(x + 22, y + 28);
    ctx.fill();
    // Three dots
    ctx.fillStyle = UI.isOpen('chat') ? "#333" : "#555";
    ctx.fillRect(x + 16, y + 17, 3, 3);
    ctx.fillRect(x + 22, y + 17, 3, 3);
    ctx.fillRect(x + 28, y + 17, 3, 3);
  });
}

function drawProfileIcon() {
  const y = 12 + ICON_SIZE + ICON_GAP;
  drawIconButton(ICON_X, y, UI.isOpen('profile'), (x, y) => {
    // Phone/smartphone icon
    ctx.fillStyle = UI.isOpen('profile') ? "#fff" : "#bbb";
    // Phone body
    ctx.beginPath(); ctx.roundRect(x + 14, y + 6, 20, 36, 4); ctx.fill();
    // Screen
    ctx.fillStyle = UI.isOpen('profile') ? "rgba(60,60,70,0.85)" : "rgba(20,20,28,0.8)";
    ctx.fillRect(x + 17, y + 11, 14, 22);
    // Home button / notch
    ctx.fillStyle = UI.isOpen('profile') ? "rgba(60,60,70,0.85)" : "rgba(20,20,28,0.8)";
    ctx.beginPath(); ctx.arc(x + 24, y + 38, 2.5, 0, Math.PI * 2); ctx.fill();
    // Screen content lines
    ctx.fillStyle = UI.isOpen('profile') ? "#ccc" : "#777";
    ctx.fillRect(x + 19, y + 14, 10, 2);
    ctx.fillRect(x + 19, y + 19, 8, 2);
    ctx.fillRect(x + 19, y + 24, 10, 2);
  });
}

function drawMapIcon() {
  const y = 12 + (ICON_SIZE + ICON_GAP) * 2;
  drawIconButton(ICON_X, y, false, (x, y) => {
    // Folded map shape - solid fill like other icons
    ctx.fillStyle = "#bbb";
    // Left fold
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 12);
    ctx.lineTo(x + 19, y + 9);
    ctx.lineTo(x + 19, y + 37);
    ctx.lineTo(x + 10, y + 34);
    ctx.closePath();
    ctx.fill();
    // Middle fold (slightly darker)
    ctx.fillStyle = "#999";
    ctx.beginPath();
    ctx.moveTo(x + 19, y + 9);
    ctx.lineTo(x + 29, y + 12);
    ctx.lineTo(x + 29, y + 40);
    ctx.lineTo(x + 19, y + 37);
    ctx.closePath();
    ctx.fill();
    // Right fold
    ctx.fillStyle = "#bbb";
    ctx.beginPath();
    ctx.moveTo(x + 29, y + 12);
    ctx.lineTo(x + 38, y + 9);
    ctx.lineTo(x + 38, y + 37);
    ctx.lineTo(x + 29, y + 40);
    ctx.closePath();
    ctx.fill();
    // Pin dot
    ctx.fillStyle = "#e44";
    ctx.beginPath(); ctx.arc(x + 24, y + 22, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(x + 24, y + 22, 1.5, 0, Math.PI * 2); ctx.fill();
  });
}

