// ===================== SKELD TASK SYSTEM =====================
// State tracking, task UI panel, and all task mini-game implementations.
// Each task: player presses E → panel opens → complete mini-game → task marked done.

// ---- Task State Tracker ----
const SkeldTasks = {
  // taskId → { done: bool, stepsCompleted: Set<number> }
  _state: {},

  reset() {
    this._state = {};
    const skeld = typeof LEVELS !== 'undefined' && LEVELS.skeld_01;
    if (!skeld || !skeld.entities) return;
    const taskIds = new Set();
    for (const e of skeld.entities) {
      if (e.type === 'skeld_task' && e.taskId && !taskIds.has(e.taskId)) {
        taskIds.add(e.taskId);
        const totalSteps = skeld.entities.filter(
          en => en.taskId === e.taskId && en.type === 'skeld_task'
        ).length;
        this._state[e.taskId] = { done: false, stepsCompleted: new Set(), totalSteps };
      }
    }
  },

  completeStep(taskId, step) {
    const s = this._state[taskId];
    if (!s || s.done) return;
    s.stepsCompleted.add(step || 1);
    if (s.stepsCompleted.size >= s.totalSteps) {
      s.done = true;
      console.log('[Skeld] Task COMPLETE:', taskId);
    } else {
      console.log('[Skeld] Task step done:', taskId, 'step', step, '(' + s.stepsCompleted.size + '/' + s.totalSteps + ')');
    }
  },

  isStepDone(entity) {
    const s = this._state[entity.taskId];
    if (!s) return false;
    if (s.done) return true;
    return s.stepsCompleted.has(entity.taskStep || 1);
  },

  isDone(taskId) {
    const s = this._state[taskId];
    return s ? s.done : false;
  },

  canDoStep(entity) {
    const s = this._state[entity.taskId];
    if (!s || s.done) return false;
    const step = entity.taskStep || 1;
    if (step === 1) return !s.stepsCompleted.has(1);
    // Multi-step: previous step must be done
    return s.stepsCompleted.has(step - 1) && !s.stepsCompleted.has(step);
  },

  getProgress() {
    let done = 0, total = 0;
    for (const id in this._state) {
      total++;
      if (this._state[id].done) done++;
    }
    return { done, total };
  },

  // Build display list for the task list panel
  // Returns array of { label, room, done, stepsText } — one entry per unique taskId
  getTaskList() {
    const skeld = typeof LEVELS !== 'undefined' && LEVELS.skeld_01;
    if (!skeld || !skeld.entities) return [];
    const seen = new Set();
    const list = [];
    for (const e of skeld.entities) {
      if (e.type !== 'skeld_task' || seen.has(e.taskId)) continue;
      seen.add(e.taskId);
      const s = this._state[e.taskId];
      if (!s) continue;
      const nextStep = s.done ? null : skeld.entities.find(
        en => en.taskId === e.taskId && en.type === 'skeld_task' && !s.stepsCompleted.has(en.taskStep || 1)
      );
      const roomName = nextStep ? nextStep.room : e.room;
      const room = roomName.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      list.push({
        label: e.label,
        room,
        done: s.done,
        stepsText: s.totalSteps > 1 ? '(' + s.stepsCompleted.size + '/' + s.totalSteps + ')' : '',
      });
    }
    return list;
  },
};

// Initialize on load
SkeldTasks.reset();

// ===================== VENT SYSTEM =====================
// Linear chain: MedBay — Security — Electrical
// Security is the hub (2 connections), ends have 1 each
const VENT_NETWORK = {
  security:   ['medbay', 'electrical'],
  medbay:     ['security'],
  electrical: ['security'],
};

const VENT_NAMES = {
  security: 'Security',
  medbay: 'MedBay',
  electrical: 'Electrical',
};

const VentSystem = {
  active: false,
  currentVentId: null,
  animTimer: 0,
  animType: null, // 'enter' | 'exit'
  ANIM_DURATION: 20,
  // Arrow buttons stored in window._ventArrowButtons for click detection

  getVentEntity(ventId) {
    if (typeof levelEntities === 'undefined') return null;
    return levelEntities.find(e => e.type === 'skeld_vent' && e.ventId === ventId);
  },

  isNearVent(ventId) {
    const e = this.getVentEntity(ventId);
    if (!e || typeof player === 'undefined') return false;
    const cx = e.tx * TILE + TILE;
    const cy = e.ty * TILE + TILE;
    const dx = player.x - cx, dy = player.y - cy;
    return Math.sqrt(dx * dx + dy * dy) < 100;
  },

  enter(ventId) {
    if (this.active || this.animTimer > 0) return;
    this.currentVentId = ventId;
    this.animType = 'enter';
    this.animTimer = this.ANIM_DURATION;
    // Snap player to vent center
    const e = this.getVentEntity(ventId);
    if (e) {
      player.x = e.tx * TILE + TILE;
      player.y = e.ty * TILE + TILE;
    }
    player.vx = 0;
    player.vy = 0;
  },

  exit() {
    if (!this.active || this.animTimer > 0) return;
    // Teleport player to current vent center
    const e = this.getVentEntity(this.currentVentId);
    if (e) {
      player.x = e.tx * TILE + TILE;
      player.y = e.ty * TILE + TILE;
    }
    player.vx = 0;
    player.vy = 0;
    this.animType = 'exit';
    this.animTimer = this.ANIM_DURATION;
  },

  cycleVent(targetId) {
    if (!this.active || this.animTimer > 0) return;
    const connections = VENT_NETWORK[this.currentVentId];
    if (!connections || !connections.includes(targetId)) return;
    this.currentVentId = targetId;
    // Move player to new vent so camera follows
    const e = this.getVentEntity(targetId);
    if (e) {
      player.x = e.tx * TILE + TILE;
      player.y = e.ty * TILE + TILE;
    }
  },

  tick() {
    if (this.animTimer > 0) {
      this.animTimer--;
      if (this.animTimer <= 0) {
        if (this.animType === 'enter') {
          this.active = true;
        } else if (this.animType === 'exit') {
          this.active = false;
          this.currentVentId = null;
        }
        this.animType = null;
      }
    }
  },

  reset() {
    this.active = false;
    this.currentVentId = null;
    this.animTimer = 0;
    this.animType = null;
    window._ventArrowButtons = null;
  },
};

function drawVentHUD() {
  if (!VentSystem.active) return;

  const currentId = VentSystem.currentVentId;
  const connections = VENT_NETWORK[currentId];
  if (!connections) return;

  const currentEntity = VentSystem.getVentEntity(currentId);
  if (!currentEntity) return;

  // Current vent screen position (account for camera + world zoom)
  const wz = typeof WORLD_ZOOM !== 'undefined' ? WORLD_ZOOM : 1;
  const ventWorldX = currentEntity.tx * TILE + TILE;
  const ventWorldY = currentEntity.ty * TILE + TILE;
  const ventSX = (ventWorldX - camera.x) * wz;
  const ventSY = (ventWorldY - camera.y) * wz;

  window._ventArrowButtons = [];

  // Draw directional arrows pointing toward each connected vent
  const t = Date.now() / 1000;
  const pulse = 0.7 + 0.3 * Math.sin(t * 3);

  connections.forEach(targetId => {
    const targetEntity = VentSystem.getVentEntity(targetId);
    if (!targetEntity) return;

    const targetWorldX = targetEntity.tx * TILE + TILE;
    const targetWorldY = targetEntity.ty * TILE + TILE;

    // Direction from current to target vent
    const dx = targetWorldX - ventWorldX;
    const dy = targetWorldY - ventWorldY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist;
    const ny = dy / dist;

    // Arrow button position (offset from vent center)
    const arrowDist = 70 * wz;
    const ax = ventSX + nx * arrowDist;
    const ay = ventSY + ny * arrowDist;
    const btnR = 24;

    // Outer glow
    ctx.fillStyle = `rgba(40,255,80,${0.08 * pulse})`;
    ctx.beginPath();
    ctx.arc(ax, ay, btnR + 6, 0, Math.PI * 2);
    ctx.fill();

    // Circle background
    ctx.fillStyle = 'rgba(10,14,20,0.88)';
    ctx.beginPath();
    ctx.arc(ax, ay, btnR, 0, Math.PI * 2);
    ctx.fill();

    // Circle border
    ctx.strokeStyle = `rgba(40,255,80,${0.5 * pulse})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Arrow triangle pointing toward target
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(Math.atan2(ny, nx));
    ctx.fillStyle = `rgba(64,255,128,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-7, -9);
    ctx.lineTo(-7, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Room name label below arrow
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#40ff80';
    // Place label offset in arrow direction
    const labelDist = btnR + 16;
    ctx.fillText(VENT_NAMES[targetId], ax + nx * labelDist, ay + ny * labelDist + 4);

    // Store for click detection (screen-space coords)
    window._ventArrowButtons.push({
      x: ax - btnR,
      y: ay - btnR,
      w: btnR * 2,
      h: btnR * 2,
      targetId: targetId,
    });
  });

  // "Press E to exit" text below vent
  ctx.textAlign = 'center';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(200,200,200,0.6)';
  const keyName = typeof getKeyDisplayName === 'function' ? getKeyDisplayName(keybinds.interact) : 'E';
  ctx.fillText('[' + keyName + '] Exit Vent', ventSX, ventSY + 55 * wz);
  ctx.textAlign = 'left';
}

// ---- Task List Side Panel (Among Us style) ----
// Always visible in Skeld. Click "Tasks" tab to expand/collapse.
let _taskListExpanded = true;

const _taskListTab = {
  // Tab button geometry (right edge of panel or standalone when collapsed)
  tabW: 28,
  tabH: 60,
  x: 280, // default = right edge of expanded panel (pw=280, px=0)
  y: 56,  // default = py
};

function drawSkeldTaskList() {
  if (!Scene.inSkeld) return;
  if (UI.isOpen('skeldTask')) return; // hide while doing a task mini-game

  const tasks = SkeldTasks.getTaskList();
  const prog = SkeldTasks.getProgress();

  // Panel position & sizing
  const pw = 280, lineH = 18, padY = 8, padX = 12;
  const headerH = 36;
  const ph = headerH + padY + tasks.length * lineH + padY;
  const px = 0, py = 56;
  const tabW = _taskListTab.tabW, tabH = _taskListTab.tabH;

  if (_taskListExpanded) {
    // ---- Expanded panel ----
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, [0, 6, 6, 0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,80,80,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Progress bar — "TOTAL TASKS COMPLETED"
    const barX = px + padX, barY = py + 6;
    const barW = pw - padX * 2 - tabW, barH = 10;
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'left';
    ctx.fillText('TOTAL TASKS COMPLETED', barX, barY + 2);
    const pbarY = barY + 10;
    ctx.fillStyle = '#222';
    ctx.fillRect(barX, pbarY, barW, barH);
    const pct = prog.total > 0 ? prog.done / prog.total : 0;
    ctx.fillStyle = '#44dd44';
    ctx.fillRect(barX, pbarY, barW * pct, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, pbarY, barW, barH);

    // Task entries
    ctx.font = '11px monospace';
    const listY = py + headerH + padY;
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const ty = listY + i * lineH;
      const text = t.room + ': ' + t.label + (t.stepsText ? ' ' + t.stepsText : '');
      if (t.done) {
        // Completed — green with strikethrough
        ctx.fillStyle = '#44cc44';
        ctx.fillText('\u2713 ' + text, px + padX, ty + 12);
        const tw = ctx.measureText('\u2713 ' + text).width;
        ctx.strokeStyle = '#44cc44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + padX, ty + 8);
        ctx.lineTo(px + padX + tw, ty + 8);
        ctx.stroke();
      } else {
        // Pending — yellow text with highlight outline
        const pulse = 0.6 + 0.2 * Math.sin(renderTime * 0.004 + i * 0.5);
        // Highlight background
        ctx.fillStyle = `rgba(238,221,85,${0.08 * pulse})`;
        ctx.fillRect(px + 4, ty, pw - 8 - tabW, lineH);
        // Yellow outline
        ctx.strokeStyle = `rgba(238,221,85,${0.35 * pulse})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 4, ty, pw - 8 - tabW, lineH);
        // Arrow indicator
        ctx.fillStyle = `rgba(238,221,85,${0.7 * pulse})`;
        ctx.font = '10px monospace';
        ctx.fillText('\u25B6', px + 6, ty + 12);
        // Task text
        ctx.font = '11px monospace';
        ctx.fillStyle = '#eedd55';
        ctx.fillText(text, px + padX + 10, ty + 12);
      }
    }

    // "Tasks" tab on right edge of panel
    _taskListTab.x = px + pw;
    _taskListTab.y = py;
  } else {
    // ---- Collapsed: only show "Tasks" tab ----
    _taskListTab.x = px;
    _taskListTab.y = py;
  }

  // Draw the "Tasks" tab
  const tx = _taskListTab.x, ty = _taskListTab.y;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.beginPath();
  ctx.roundRect(tx, ty, tabW, tabH, [0, 6, 6, 0]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,80,80,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Vertical "Tasks" text
  ctx.save();
  ctx.translate(tx + tabW / 2 + 1, ty + tabH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = '#ccc';
  ctx.textAlign = 'center';
  ctx.fillText('Tasks', 0, 4);
  ctx.restore();

  ctx.textAlign = 'left';
}

// Click handler for the "Tasks" tab
document.addEventListener('click', (ev) => {
  if (!Scene.inSkeld) return;
  if (UI.isOpen('skeldTask') || UI.anyOpen()) return; // don't toggle while panels are open
  if (ev.target && ev.target.tagName !== 'CANVAS') return;
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = BASE_W / rect.width;
  const scaleY = BASE_H / rect.height;
  const mx = (ev.clientX - rect.left) * scaleX;
  const my = (ev.clientY - rect.top) * scaleY;
  const t = _taskListTab;
  if (mx >= t.x && mx <= t.x + t.tabW && my >= t.y && my <= t.y + t.tabH) {
    _taskListExpanded = !_taskListExpanded;
  }
});

// ---- Task Panel (canvas overlay) ----
const _taskPanel = {
  active: false,
  taskId: null,
  entity: null,
  game: null,       // current mini-game state object
  mouseX: 0,
  mouseY: 0,
  mouseDown: false,
  mouseJustClicked: false,
  // Panel geometry (centered on screen)
  W: 500,
  H: 440,
  get X() { return (BASE_W - this.W) / 2; },
  get Y() { return (BASE_H - this.H) / 2; },
};

function openTaskPanel(entity) {
  if (_taskPanel.active) return;
  const handler = TASK_HANDLERS[entity.taskId];
  if (!handler) { console.warn('No handler for task:', entity.taskId); return; }

  // Check if this step can be done
  if (!SkeldTasks.canDoStep(entity)) {
    const s = SkeldTasks._state[entity.taskId];
    if (s && s.done) {
      console.log('[Skeld] Task already complete:', entity.taskId);
    } else {
      console.log('[Skeld] Cannot do step yet:', entity.taskId, 'step', entity.taskStep);
    }
    return;
  }

  _taskPanel.active = true;
  _taskPanel.taskId = entity.taskId;
  _taskPanel.entity = entity;
  _taskPanel.game = handler.init(entity);
  _taskPanel.mouseDown = false;
  _taskPanel.mouseJustClicked = false;
  UI.open('skeldTask');
}

function closeTaskPanel() {
  _taskPanel.active = false;
  _taskPanel.game = null;
  _taskPanel.entity = null;
  UI.close('skeldTask');
}

function completeCurrentTask() {
  if (!_taskPanel.entity) return;
  SkeldTasks.completeStep(_taskPanel.entity.taskId, _taskPanel.entity.taskStep || 1);
  // Brief delay then close
  setTimeout(closeTaskPanel, 400);
}

// Register with panel manager
UI.register('skeldTask', {
  onClose() { _taskPanel.active = false; _taskPanel.game = null; _taskPanel.entity = null; },
});

// ---- Mouse tracking for task panel ----
document.addEventListener('mousemove', (ev) => {
  if (!_taskPanel.active) return;
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = BASE_W / rect.width;
  const scaleY = BASE_H / rect.height;
  _taskPanel.mouseX = (ev.clientX - rect.left) * scaleX;
  _taskPanel.mouseY = (ev.clientY - rect.top) * scaleY;
});
document.addEventListener('mousedown', (ev) => {
  if (!_taskPanel.active) return;
  if (ev.target && ev.target.tagName !== 'CANVAS') return;
  _taskPanel.mouseDown = true;
  _taskPanel.mouseJustClicked = true;
});
document.addEventListener('mouseup', () => {
  _taskPanel.mouseDown = false;
});

// ---- Draw task panel (called from draw.js) ----
function drawSkeldTaskPanel() {
  if (!_taskPanel.active || !_taskPanel.game) return;

  const p = _taskPanel;
  const g = p.game;
  const handler = TASK_HANDLERS[p.taskId];
  if (!handler) return;

  // Dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel background
  const px = p.X, py = p.Y, pw = p.W, ph = p.H;
  ctx.fillStyle = '#0a0e14';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#1a3040';
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  // Title bar
  ctx.fillStyle = '#0c1620';
  ctx.fillRect(px, py, pw, 36);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#0ff';
  ctx.textAlign = 'center';
  ctx.fillText(p.entity.label, px + pw / 2, py + 24);

  // Close button (X)
  const cbx = px + pw - 32, cby = py + 4, cbs = 28;
  ctx.fillStyle = '#1a1a2a';
  ctx.fillRect(cbx, cby, cbs, cbs);
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText('X', cbx + cbs / 2, cby + 20);

  // Check close button click
  if (p.mouseJustClicked) {
    if (p.mouseX >= cbx && p.mouseX <= cbx + cbs && p.mouseY >= cby && p.mouseY <= cby + cbs) {
      closeTaskPanel();
      p.mouseJustClicked = false;
      return;
    }
  }

  // Game area
  const gx = px + 20, gy = py + 50, gw = pw - 40, gh = ph - 70;

  // Run task handler draw + update
  ctx.save();
  handler.draw(g, ctx, gx, gy, gw, gh, p);
  ctx.restore();
  ctx.textAlign = 'left';

  p.mouseJustClicked = false;
}

// ---- TASK HANDLERS ----
// Each handler: { init(entity) → gameState, draw(game, ctx, x, y, w, h, panel) }
const TASK_HANDLERS = {};

// ===== TASK 1: TAP SEQUENCE (Cafeteria) =====
// 5 buttons, 2 rounds: Round 1 = 5-step, Round 2 = 7-step (faster display).
TASK_HANDLERS.tap_sequence = {
  init(entity) {
    function genSeq(len) {
      const seq = [];
      for (let i = 0; i < len; i++) seq.push(Math.floor(Math.random() * 5));
      return seq;
    }
    const rounds = [genSeq(4)];
    return {
      round: 1,
      rounds,                // [round1Seq]
      showPhase: true,
      showIndex: 0,
      showTimer: 0,
      inputIndex: 0,
      flash: -1,
      flashTimer: 0,
      failed: false,
      done: false,
      failTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    const colors = ['#ff4444', '#44cc44', '#4488ff', '#ffcc44', '#cc44cc'];
    const labels = ['R', 'G', 'B', 'Y', 'P'];
    const dimColors = ['#441111', '#114411', '#112244', '#443311', '#441144'];
    const btnSize = 70;
    const gap = 12;
    const totalW = 5 * btnSize + 4 * gap;
    const bx = x + (w - totalW) / 2;
    const by = y + h / 2 - btnSize / 2 + 20;
    const sequence = g.rounds[g.round - 1];
    // Timing per round
    const litFrames = g.round === 1 ? 25 : 18;
    const darkFrames = g.round === 1 ? 12 : 10;

    // Instruction text
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    if (g.done) {
      ctx.fillStyle = '#44ff44';
      ctx.fillText('COMPLETE!', x + w / 2, y + 30);
      return;
    }
    if (g.failed) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('WRONG! Restarting round ' + g.round + '...', x + w / 2, y + 30);
      g.failTimer++;
      if (g.failTimer > 60) {
        // Reset current round only
        g.showPhase = true;
        g.showIndex = 0;
        g.showTimer = 0;
        g.inputIndex = 0;
        g.flash = -1;
        g.failed = false;
        g.failTimer = 0;
      }
      return;
    }

    // Round indicator
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Round ' + g.round + ' of ' + g.rounds.length, x + w / 2, y + 15);

    if (g.showPhase) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Watch the sequence... (' + (g.showIndex + 1) + '/' + sequence.length + ')', x + w / 2, y + 35);
    } else {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#0ff';
      ctx.fillText('Your turn! Tap button ' + (g.inputIndex + 1) + ' of ' + sequence.length, x + w / 2, y + 35);
    }

    // Show sequence phase
    if (g.showPhase) {
      g.showTimer++;
      if (g.showTimer < litFrames) {
        g.flash = sequence[g.showIndex];
      } else if (g.showTimer < litFrames + darkFrames) {
        g.flash = -1;
      } else {
        g.showIndex++;
        g.showTimer = 0;
        if (g.showIndex >= sequence.length) {
          g.showPhase = false;
          g.flash = -1;
        }
      }
    }

    // Flash timer for player taps
    if (g.flashTimer > 0) {
      g.flashTimer--;
      if (g.flashTimer <= 0) g.flash = -1;
    }

    // Draw buttons
    for (let i = 0; i < 5; i++) {
      const bxx = bx + i * (btnSize + gap);
      const lit = (g.flash === i);
      ctx.fillStyle = lit ? colors[i] : dimColors[i];
      ctx.fillRect(bxx, by, btnSize, btnSize);
      // Border
      ctx.strokeStyle = lit ? '#fff' : '#333';
      ctx.lineWidth = lit ? 3 : 1;
      ctx.strokeRect(bxx, by, btnSize, btnSize);
      // Label
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = lit ? '#fff' : '#555';
      ctx.textAlign = 'center';
      ctx.fillText(labels[i], bxx + btnSize / 2, by + btnSize / 2 + 8);

      // Click detection (player input phase only)
      if (!g.showPhase && !g.done && !g.failed && panel.mouseJustClicked) {
        if (panel.mouseX >= bxx && panel.mouseX <= bxx + btnSize &&
            panel.mouseY >= by && panel.mouseY <= by + btnSize) {
          if (i === sequence[g.inputIndex]) {
            // Correct
            g.flash = i;
            g.flashTimer = 12;
            g.inputIndex++;
            if (g.inputIndex >= sequence.length) {
              if (g.round >= g.rounds.length) {
                g.done = true;
                completeCurrentTask();
              } else {
                // Advance to next round
                g.round++;
                g.showPhase = true;
                g.showIndex = 0;
                g.showTimer = 0;
                g.inputIndex = 0;
                g.flash = -1;
              }
            }
          } else {
            // Wrong — reset current round only
            g.failed = true;
            g.flash = -1;
          }
        }
      }
    }

    // Progress dots
    const dotY = by + btnSize + 25;
    for (let i = 0; i < sequence.length; i++) {
      ctx.fillStyle = i < g.inputIndex ? '#44ff44' : (i === g.inputIndex && !g.showPhase ? '#0ff' : '#333');
      ctx.beginPath();
      ctx.arc(x + w / 2 - (sequence.length - 1) * 12 / 2 + i * 12, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

// ===== TASK 2: CODE ENTRY (Admin) =====
// Enter a 6-digit code shown briefly. 2 rounds with different codes.
TASK_HANDLERS.code_entry = {
  init(entity) {
    function genCode() {
      const c = [];
      for (let i = 0; i < 6; i++) c.push(Math.floor(Math.random() * 10));
      return c;
    }
    const codes = [genCode(), genCode()];
    return {
      round: 1,
      codes,
      input: [],
      showCode: true,
      showTimer: 0,
      done: false,
      failed: false,
      failTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';
    const code = g.codes[g.round - 1];
    const codeLen = 6;

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ACCESS GRANTED', x + w / 2, y + h / 2);
      return;
    }

    // Show code phase
    if (g.showCode) {
      g.showTimer++;
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#666';
      ctx.fillText('Round ' + g.round + ' of 2', x + w / 2, y + 15);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Memorize this code:', x + w / 2, y + 35);
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#0ff';
      ctx.fillText(code.join(' '), x + w / 2, y + 80);
      if (g.showTimer > 80) {
        g.showCode = false;
      }
      return;
    }

    if (g.failed) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('WRONG CODE', x + w / 2, y + 30);
      g.failTimer++;
      if (g.failTimer > 60) {
        // Generate brand new code for this round
        const newCode = [];
        for (let i = 0; i < 6; i++) newCode.push(Math.floor(Math.random() * 10));
        g.codes[g.round - 1] = newCode;
        g.input = [];
        g.failed = false;
        g.failTimer = 0;
        g.showCode = true;
        g.showTimer = 0;
      }
      return;
    }

    // Round indicator
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Round ' + g.round + ' of 2', x + w / 2, y + 10);

    // Input display
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Enter the code:', x + w / 2, y + 25);

    // Code slots (6 slots)
    const slotW = 42, slotH = 55, slotGap = 10;
    const totalSW = codeLen * slotW + (codeLen - 1) * slotGap;
    const sx = x + (w - totalSW) / 2;
    const sy = y + 38;
    for (let i = 0; i < codeLen; i++) {
      const sxx = sx + i * (slotW + slotGap);
      ctx.fillStyle = '#0a1520';
      ctx.fillRect(sxx, sy, slotW, slotH);
      ctx.strokeStyle = i === g.input.length ? '#0ff' : '#1a3040';
      ctx.lineWidth = i === g.input.length ? 2 : 1;
      ctx.strokeRect(sxx, sy, slotW, slotH);
      if (i < g.input.length) {
        ctx.font = 'bold 26px monospace';
        ctx.fillStyle = '#0ff';
        ctx.fillText(g.input[i], sxx + slotW / 2, sy + slotH / 2 + 9);
      }
    }

    // Number pad (0-9)
    const padCols = 5, padRows = 2;
    const btnW = 60, btnH = 50, btnGap = 10;
    const padW = padCols * btnW + (padCols - 1) * btnGap;
    const padX = x + (w - padW) / 2;
    const padY = sy + slotH + 25;

    for (let n = 0; n < 10; n++) {
      const col = n % padCols;
      const row = Math.floor(n / padCols);
      const bxx = padX + col * (btnW + btnGap);
      const byy = padY + row * (btnH + btnGap);

      const hover = panel.mouseX >= bxx && panel.mouseX <= bxx + btnW &&
                    panel.mouseY >= byy && panel.mouseY <= byy + btnH;
      ctx.fillStyle = hover ? '#1a3050' : '#0c1620';
      ctx.fillRect(bxx, byy, btnW, btnH);
      ctx.strokeStyle = hover ? '#0ff' : '#1a3040';
      ctx.lineWidth = 1;
      ctx.strokeRect(bxx, byy, btnW, btnH);

      ctx.font = 'bold 22px monospace';
      ctx.fillStyle = hover ? '#0ff' : '#668';
      ctx.fillText(n.toString(), bxx + btnW / 2, byy + btnH / 2 + 8);

      if (panel.mouseJustClicked && hover && g.input.length < codeLen) {
        g.input.push(n);
        // Check when all digits entered
        if (g.input.length === codeLen) {
          let correct = true;
          for (let i = 0; i < codeLen; i++) {
            if (g.input[i] !== code[i]) { correct = false; break; }
          }
          if (correct) {
            if (g.round >= 2) {
              g.done = true;
              completeCurrentTask();
            } else {
              // Advance to round 2
              g.round++;
              g.input = [];
              g.showCode = true;
              g.showTimer = 0;
            }
          } else {
            g.failed = true;
          }
        }
      }
    }

    // Clear button
    const clrX = padX + padW + btnGap + 10, clrY = padY;
    ctx.fillStyle = '#1a1010';
    ctx.fillRect(clrX, clrY, 50, btnH);
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.strokeRect(clrX, clrY, 50, btnH);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.fillText('CLR', clrX + 25, clrY + btnH / 2 + 4);
    if (panel.mouseJustClicked && panel.mouseX >= clrX && panel.mouseX <= clrX + 50 &&
        panel.mouseY >= clrY && panel.mouseY <= clrY + btnH) {
      g.input = [];
    }
  }
};

// ===== TASK 3: SIMPLE MATH (Lower Engine) =====
// Solve 5 math problems with ramping difficulty and countdown timer.
TASK_HANDLERS.simple_math = {
  init(entity) {
    function genProblem(idx) {
      let a, b, op, ans;
      if (idx < 2) {
        // P1-2: single digit +/-
        const ops = ['+', '-'];
        op = ops[Math.floor(Math.random() * ops.length)];
        a = 2 + Math.floor(Math.random() * 8);
        b = 2 + Math.floor(Math.random() * 8);
        if (op === '-' && b > a) { const t = a; a = b; b = t; }
        ans = op === '+' ? a + b : a - b;
      } else if (idx < 4) {
        // P3-4: two digit with * or larger +/-
        const ops = ['+', '-', '*'];
        op = ops[Math.floor(Math.random() * ops.length)];
        if (op === '*') {
          a = 10 + Math.floor(Math.random() * 41);
          b = 5 + Math.floor(Math.random() * 21);
        } else {
          a = 10 + Math.floor(Math.random() * 41);
          b = 5 + Math.floor(Math.random() * 21);
          if (op === '-' && b > a) { const t = a; a = b; b = t; }
        }
        ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
      } else {
        // P5: hard — three-digit result possible, includes /
        const ops = ['+', '-', '*', '/'];
        op = ops[Math.floor(Math.random() * ops.length)];
        if (op === '/') {
          b = 2 + Math.floor(Math.random() * 49);
          ans = 2 + Math.floor(Math.random() * 48);
          a = ans * b;
        } else if (op === '*') {
          a = 20 + Math.floor(Math.random() * 80);
          b = 10 + Math.floor(Math.random() * 41);
          ans = a * b;
        } else {
          a = 20 + Math.floor(Math.random() * 80);
          b = 10 + Math.floor(Math.random() * 41);
          if (op === '-' && b > a) { const t = a; a = b; b = t; }
          ans = op === '+' ? a + b : a - b;
        }
      }
      return { text: a + ' ' + op + ' ' + b, answer: ans };
    }
    const problems = [];
    for (let i = 0; i < 5; i++) problems.push(genProblem(i));
    return {
      problems,
      current: 0,
      input: '',
      done: false,
      wrong: false,
      wrongTimer: 0,
      timer: 900,
      maxTimer: 900,
      _genProblem: genProblem,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ALL CORRECT!', x + w / 2, y + h / 2);
      return;
    }

    const prob = g.problems[g.current];

    // Progress
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Problem ' + (g.current + 1) + ' of ' + g.problems.length, x + w / 2, y + 15);

    // Timer bar (above problem)
    const timerBarW = w - 80, timerBarH = 8;
    const timerBarX = x + 40, timerBarY = y + 25;
    const timerPct = Math.max(0, g.timer / g.maxTimer);
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(timerBarX, timerBarY, timerBarW, timerBarH);
    ctx.fillStyle = timerPct > 0.3 ? '#0ff' : (timerPct > 0.15 ? '#ffaa00' : '#ff4444');
    ctx.fillRect(timerBarX, timerBarY, timerBarW * timerPct, timerBarH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 1;
    ctx.strokeRect(timerBarX, timerBarY, timerBarW, timerBarH);

    // Countdown timer tick
    if (!g.wrong) {
      g.timer--;
      if (g.timer <= 0) {
        g.wrong = true;
        g.problems[g.current] = g._genProblem(g.current);
      }
    }

    // Problem text
    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(prob.text + ' = ?', x + w / 2, y + 70);

    // Input display
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = g.wrong ? '#ff4444' : '#0ff';
    const displayText = g.input || '_';
    ctx.fillText(displayText, x + w / 2, y + 120);

    if (g.wrong) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('Wrong! Try again.', x + w / 2, y + 150);
      g.wrongTimer++;
      if (g.wrongTimer > 40) {
        g.wrong = false;
        g.wrongTimer = 0;
        g.input = '';
        g.timer = g.maxTimer;
      }
      return;
    }

    // Number pad
    const btnW = 55, btnH = 45, btnGap = 8;
    const padY = y + 160;
    const rows = [
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 0],
    ];
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      const rw = row.length * btnW + (row.length - 1) * btnGap;
      const rx = x + (w - rw) / 2;
      for (let c = 0; c < row.length; c++) {
        const bxx = rx + c * (btnW + btnGap);
        const byy = padY + r * (btnH + btnGap);
        const hover = panel.mouseX >= bxx && panel.mouseX <= bxx + btnW &&
                      panel.mouseY >= byy && panel.mouseY <= byy + btnH;
        ctx.fillStyle = hover ? '#1a3050' : '#0c1620';
        ctx.fillRect(bxx, byy, btnW, btnH);
        ctx.strokeStyle = hover ? '#0ff' : '#1a3040';
        ctx.lineWidth = 1;
        ctx.strokeRect(bxx, byy, btnW, btnH);
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = hover ? '#0ff' : '#668';
        ctx.fillText(row[c].toString(), bxx + btnW / 2, byy + btnH / 2 + 7);
        if (panel.mouseJustClicked && hover && g.input.length < 6) {
          g.input += row[c].toString();
        }
      }
    }

    // Bottom row: minus, DEL, ENTER
    const bRow3Y = padY + 2 * (btnH + btnGap);
    const specials = [
      { label: '-', w: btnW, action() { if (g.input === '') g.input = '-'; } },
      { label: 'DEL', w: btnW, action() { g.input = g.input.slice(0, -1); } },
      { label: 'ENTER', w: btnW * 2 + btnGap, action() {
          if (g.input === '' || g.input === '-') return;
          const val = parseInt(g.input);
          if (isNaN(val)) return;
          if (val === prob.answer) {
            g.current++;
            g.input = '';
            g.timer = g.maxTimer;
            if (g.current >= g.problems.length) {
              g.done = true;
              completeCurrentTask();
            }
          } else {
            g.wrong = true;
          }
        }
      },
    ];
    const specTotalW = specials.reduce((s, sp) => s + sp.w, 0) + (specials.length - 1) * btnGap;
    let specX = x + (w - specTotalW) / 2;
    for (const sp of specials) {
      const hover = panel.mouseX >= specX && panel.mouseX <= specX + sp.w &&
                    panel.mouseY >= bRow3Y && panel.mouseY <= bRow3Y + btnH;
      ctx.fillStyle = hover ? '#1a3050' : '#0c1620';
      ctx.fillRect(specX, bRow3Y, sp.w, btnH);
      ctx.strokeStyle = sp.label === 'ENTER' ? (hover ? '#44ff44' : '#1a4020') : (hover ? '#0ff' : '#1a3040');
      ctx.lineWidth = 1;
      ctx.strokeRect(specX, bRow3Y, sp.w, btnH);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = hover ? '#fff' : '#668';
      ctx.fillText(sp.label, specX + sp.w / 2, bRow3Y + btnH / 2 + 5);
      if (panel.mouseJustClicked && hover) sp.action();
      specX += sp.w + btnGap;
    }
  }
};

// ===== TASK 4: MATCH SYMBOL (Weapons) =====
// 8 pairs = 16 cards in a 4x4 grid with shuffle confusion on mismatch.
TASK_HANDLERS.match_symbol = {
  init(entity) {
    const symbols = ['\u2605', '\u2665', '\u25B2', '\u25CF', '\u2702', '\u266B', '\u2622', '\u2618'];
    const cards = [];
    for (const s of symbols) { cards.push(s); cards.push(s); }
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return {
      cards,
      revealed: new Array(16).fill(false),
      matched: new Array(16).fill(false),
      first: -1,
      second: -1,
      checkTimer: 0,
      pairs: 0,
      done: false,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ALL PAIRS FOUND!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Find matching pairs (' + g.pairs + '/8)', x + w / 2, y + 15);

    // Check phase (two cards revealed, waiting to flip back)
    if (g.checkTimer > 0) {
      g.checkTimer--;
      if (g.checkTimer <= 0) {
        if (g.cards[g.first] === g.cards[g.second]) {
          g.matched[g.first] = true;
          g.matched[g.second] = true;
          g.pairs++;
          if (g.pairs >= 8) {
            g.done = true;
            completeCurrentTask();
          }
        } else {
          // Mismatch: randomly swap 2 unmatched unrevealed cards (shuffle confusion)
          const swappable = [];
          for (let si = 0; si < 16; si++) {
            if (!g.matched[si] && si !== g.first && si !== g.second) swappable.push(si);
          }
          if (swappable.length >= 2) {
            const a = swappable[Math.floor(Math.random() * swappable.length)];
            let b = a;
            while (b === a) b = swappable[Math.floor(Math.random() * swappable.length)];
            const tmp = g.cards[a];
            g.cards[a] = g.cards[b];
            g.cards[b] = tmp;
          }
        }
        g.revealed[g.first] = false;
        g.revealed[g.second] = false;
        g.first = -1;
        g.second = -1;
      }
    }

    // Draw cards (4x4 grid)
    const cardW = 60, cardH = 70, gap = 10;
    const cols = 4, rows = 4;
    const gridW = cols * cardW + (cols - 1) * gap;
    const gx = x + (w - gridW) / 2;
    const gy = y + 35;

    for (let i = 0; i < 16; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = gx + col * (cardW + gap);
      const cy = gy + row * (cardH + gap);
      const show = g.revealed[i] || g.matched[i];

      if (g.matched[i]) {
        ctx.fillStyle = '#0a2a0a';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = '#44ff44';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#44ff44';
        ctx.fillText(g.cards[i], cx + cardW / 2, cy + cardH / 2 + 8);
      } else if (show) {
        ctx.fillStyle = '#0a1a30';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#0ff';
        ctx.fillText(g.cards[i], cx + cardW / 2, cy + cardH / 2 + 8);
      } else {
        // Face down
        const hover = panel.mouseX >= cx && panel.mouseX <= cx + cardW &&
                      panel.mouseY >= cy && panel.mouseY <= cy + cardH;
        ctx.fillStyle = hover ? '#1a2a3a' : '#0c1620';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = hover ? '#0ff' : '#1a3040';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.font = 'bold 20px monospace';
        ctx.fillStyle = '#333';
        ctx.fillText('?', cx + cardW / 2, cy + cardH / 2 + 7);

        // Click
        if (panel.mouseJustClicked && hover && g.checkTimer <= 0) {
          if (g.first === -1) {
            g.first = i;
            g.revealed[i] = true;
          } else if (g.second === -1 && i !== g.first) {
            g.second = i;
            g.revealed[i] = true;
            g.checkTimer = 20;
          }
        }
      }
    }
  }
};

// ===== TASK 5: SLIDER ALIGNMENT (Reactor) =====
// 5 drifting sliders, must align all then click LOCK IN.
TASK_HANDLERS.slider_alignment = {
  init(entity) {
    const sliders = [];
    for (let i = 0; i < 5; i++) {
      sliders.push({
        value: 0.1 + Math.random() * 0.3,
        target: 0.3 + Math.random() * 0.5,
        drift: (Math.random() * 0.004 - 0.002), // -0.002 to +0.002
      });
    }
    return { sliders, dragging: -1, done: false, lockFail: false, lockFailTimer: 0 };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ALIGNED!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Align all sliders, then LOCK IN', x + w / 2, y + 15);

    const sliderW = w - 60;
    const sliderH = 16;
    const sliderX = x + 30;
    const startY = y + 40;
    const spacing = 60;

    // Apply drift each frame — only to sliders that aren't aligned and aren't being dragged
    for (let i = 0; i < g.sliders.length; i++) {
      const s = g.sliders[i];
      const aligned = Math.abs(s.value - s.target) < 0.02;
      if (g.dragging !== i && !aligned) {
        s.value += s.drift;
        if (s.value <= 0) { s.value = 0; s.drift = Math.abs(s.drift); }
        if (s.value >= 1) { s.value = 1; s.drift = -Math.abs(s.drift); }
      }
    }

    // Lock fail flash
    if (g.lockFail) {
      g.lockFailTimer++;
      if (g.lockFailTimer > 30) { g.lockFail = false; g.lockFailTimer = 0; }
    }

    let allAligned = true;

    for (let i = 0; i < g.sliders.length; i++) {
      const s = g.sliders[i];
      const sy = startY + i * spacing;

      // Track
      ctx.fillStyle = '#0c1620';
      ctx.fillRect(sliderX, sy, sliderW, sliderH);
      ctx.strokeStyle = '#1a3040';
      ctx.lineWidth = 1;
      ctx.strokeRect(sliderX, sy, sliderW, sliderH);

      // Target marker
      const targetX = sliderX + s.target * sliderW;
      ctx.fillStyle = 'rgba(0,255,255,0.3)';
      ctx.fillRect(targetX - 8, sy - 4, 16, sliderH + 8);
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetX, sy - 6); ctx.lineTo(targetX, sy + sliderH + 6);
      ctx.stroke();

      // Slider thumb
      const thumbX = sliderX + s.value * sliderW;
      const thumbW = 16, thumbH = sliderH + 10;
      const aligned = Math.abs(s.value - s.target) < 0.02;
      ctx.fillStyle = aligned ? '#44ff44' : '#ff6644';
      ctx.fillRect(thumbX - thumbW / 2, sy - 5, thumbW, thumbH);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(thumbX - thumbW / 2, sy - 5, thumbW, thumbH);

      if (!aligned) allAligned = false;

      // Label
      ctx.font = '11px monospace';
      ctx.fillStyle = aligned ? '#44ff44' : '#888';
      ctx.textAlign = 'left';
      ctx.fillText(aligned ? 'OK' : 'Slider ' + (i + 1), sliderX, sy - 10);
      ctx.textAlign = 'center';

      // Drag logic
      const thumbArea = { x: thumbX - thumbW / 2 - 10, y: sy - 10, w: thumbW + 20, h: thumbH + 10 };
      if (panel.mouseDown) {
        if (g.dragging === i) {
          s.value = Math.max(0, Math.min(1, (panel.mouseX - sliderX) / sliderW));
        } else if (g.dragging === -1 && panel.mouseJustClicked &&
          panel.mouseX >= thumbArea.x && panel.mouseX <= thumbArea.x + thumbArea.w &&
          panel.mouseY >= thumbArea.y && panel.mouseY <= thumbArea.y + thumbArea.h) {
          g.dragging = i;
        }
      } else {
        g.dragging = -1;
      }
    }

    // LOCK IN button
    const btnW = 140, btnH = 38;
    const bx = x + (w - btnW) / 2;
    const by = startY + g.sliders.length * spacing + 5;
    const hover = panel.mouseX >= bx && panel.mouseX <= bx + btnW &&
                  panel.mouseY >= by && panel.mouseY <= by + btnH;
    ctx.fillStyle = g.lockFail ? '#3a1010' : (hover ? '#1a4030' : '#0c1620');
    ctx.fillRect(bx, by, btnW, btnH);
    ctx.strokeStyle = g.lockFail ? '#ff4444' : '#44ff44';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, btnW, btnH);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = g.lockFail ? '#ff4444' : '#44ff44';
    ctx.fillText(g.lockFail ? 'NOT ALIGNED!' : 'LOCK IN', bx + btnW / 2, by + btnH / 2 + 6);

    if (panel.mouseJustClicked && hover) {
      if (allAligned) {
        g.done = true;
        completeCurrentTask();
      } else {
        g.lockFail = true;
        g.lockFailTimer = 0;
      }
    }
  }
};

// ===== TASK 6: SECURITY AUTH (Security) =====
// 4x4 grid, 3 rounds with increasing cell counts and decreasing show times.
TASK_HANDLERS.security_auth = {
  init(entity) {
    function genPattern(count) {
      const p = new Set();
      while (p.size < count) p.add(Math.floor(Math.random() * 16));
      return p;
    }
    const counts = [4, 6, 8];
    const showTimes = [90, 70, 50];
    const patterns = [genPattern(counts[0]), genPattern(counts[1]), genPattern(counts[2])];
    return {
      round: 1,
      patterns,
      counts,
      showTimes,
      playerPattern: new Set(),
      showPhase: true,
      showTimer: 0,
      done: false,
      failed: false,
      failTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';
    const pattern = g.patterns[g.round - 1];
    const showTime = g.showTimes[g.round - 1];

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('AUTHENTICATED!', x + w / 2, y + h / 2);
      return;
    }
    if (g.failed) {
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#ff4444';
      ctx.fillText('MISMATCH! Retry...', x + w / 2, y + 30);
      g.failTimer++;
      if (g.failTimer > 60) {
        // Generate new pattern for current round
        const newP = new Set();
        while (newP.size < g.counts[g.round - 1]) newP.add(Math.floor(Math.random() * 16));
        g.patterns[g.round - 1] = newP;
        g.playerPattern = new Set();
        g.showPhase = true;
        g.showTimer = 0;
        g.failed = false;
        g.failTimer = 0;
      }
      return;
    }

    // Round indicator
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Round ' + g.round + ' of 3', x + w / 2, y + 12);

    if (g.showPhase) {
      g.showTimer++;
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Memorize the pattern...', x + w / 2, y + 28);
      if (g.showTimer > showTime) {
        g.showPhase = false;
      }
    } else {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#0ff';
      ctx.fillText('Reproduce the pattern', x + w / 2, y + 28);
    }

    // 4x4 grid
    const cellSize = 55, gap = 8;
    const gridW = 4 * cellSize + 3 * gap;
    const gx = x + (w - gridW) / 2;
    const gy = y + 42;

    for (let i = 0; i < 16; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const cx = gx + col * (cellSize + gap);
      const cy = gy + row * (cellSize + gap);
      const inPattern = pattern.has(i);
      const playerSel = g.playerPattern.has(i);
      const showLit = g.showPhase ? inPattern : playerSel;

      const hover = !g.showPhase && panel.mouseX >= cx && panel.mouseX <= cx + cellSize &&
                    panel.mouseY >= cy && panel.mouseY <= cy + cellSize;

      ctx.fillStyle = showLit ? '#0a4a5a' : (hover ? '#1a2a3a' : '#0c1620');
      ctx.fillRect(cx, cy, cellSize, cellSize);
      ctx.strokeStyle = showLit ? '#0ff' : (hover ? '#0ff' : '#1a3040');
      ctx.lineWidth = showLit ? 2 : 1;
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      if (showLit) {
        ctx.fillStyle = 'rgba(0,255,255,0.15)';
        ctx.fillRect(cx + 3, cy + 3, cellSize - 6, cellSize - 6);
      }

      // Click (input phase)
      if (!g.showPhase && panel.mouseJustClicked && hover) {
        if (g.playerPattern.has(i)) g.playerPattern.delete(i);
        else g.playerPattern.add(i);
      }
    }

    // Submit button
    if (!g.showPhase) {
      const btnW = 120, btnH = 36;
      const bx = x + (w - btnW) / 2;
      const by = gy + 4 * (cellSize + gap) + 6;
      const hover = panel.mouseX >= bx && panel.mouseX <= bx + btnW &&
                    panel.mouseY >= by && panel.mouseY <= by + btnH;
      ctx.fillStyle = hover ? '#1a4030' : '#0c1620';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnW, btnH);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('SUBMIT', bx + btnW / 2, by + 24);

      if (panel.mouseJustClicked && hover) {
        // Check
        let match = pattern.size === g.playerPattern.size;
        if (match) {
          for (const v of pattern) {
            if (!g.playerPattern.has(v)) { match = false; break; }
          }
        }
        if (match) {
          if (g.round >= 3) {
            g.done = true;
            completeCurrentTask();
          } else {
            // Advance to next round
            g.round++;
            g.playerPattern = new Set();
            g.showPhase = true;
            g.showTimer = 0;
          }
        } else {
          g.failed = true;
        }
      }
    }
  }
};

// ===== TASK 7: HOLD TO CHARGE (Upper Engine) =====
// Moving charge zone (Lissajous), hold mouse inside to charge. Decays when outside.
TASK_HANDLERS.hold_to_charge = {
  init(entity) {
    return { charge: 0, maxCharge: 200, done: false, charging: false, frameCount: 0 };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ENGINE CHARGED!', x + w / 2, y + h / 2);
      return;
    }

    g.frameCount++;

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Chase the zone and hold to charge!', x + w / 2, y + 15);

    // Moving zone center (Lissajous pattern)
    const panelCenterX = x + w / 2;
    const panelCenterY = y + h / 2 - 20;
    const zoneX = panelCenterX + Math.sin(g.frameCount * 0.02) * 80;
    const zoneY = panelCenterY + Math.cos(g.frameCount * 0.015) * 50;
    const zoneRadius = 60;

    // Check if mouse is in zone
    const dist = Math.sqrt((panel.mouseX - zoneX) ** 2 + (panel.mouseY - zoneY) ** 2);
    const inZone = dist < zoneRadius;
    g.charging = inZone && panel.mouseDown;

    // Charge/decay logic
    if (g.charging) {
      g.charge = Math.min(g.maxCharge, g.charge + 0.8);
      if (g.charge >= g.maxCharge) {
        g.done = true;
        completeCurrentTask();
      }
    } else if (panel.mouseDown && !inZone) {
      // Mouse held but outside zone
      g.charge = Math.max(0, g.charge - 1.0);
    } else {
      // Not held at all
      g.charge = Math.max(0, g.charge - 2.0);
    }

    // Draw zone — pulsing circle
    const pulse = 1 + Math.sin(g.frameCount * 0.1) * 0.08;
    const drawRadius = zoneRadius * pulse;

    // Zone glow
    ctx.fillStyle = g.charging ? 'rgba(255,136,0,0.12)' : 'rgba(26,48,64,0.5)';
    ctx.beginPath(); ctx.arc(zoneX, zoneY, drawRadius, 0, Math.PI * 2); ctx.fill();

    // Charge arc around zone
    const pct = g.charge / g.maxCharge;
    if (pct > 0) {
      ctx.strokeStyle = pct > 0.8 ? '#44ff44' : '#ff8800';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(zoneX, zoneY, drawRadius - 6, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
      ctx.stroke();
    }

    // Zone border
    ctx.strokeStyle = g.charging ? '#ff8800' : (inZone ? '#557' : '#1a3040');
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(zoneX, zoneY, drawRadius, 0, Math.PI * 2); ctx.stroke();

    // Center text
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = g.charging ? '#ff8800' : '#555';
    ctx.fillText(Math.round(pct * 100) + '%', zoneX, zoneY + 6);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(g.charging ? 'CHARGING...' : 'HOLD HERE', zoneX, zoneY + 22);

    // Charge bar at bottom
    const barW = w - 60, barH = 16;
    const barX = x + 30, barY = y + h - 40;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = pct > 0.8 ? '#44ff44' : '#ff8800';
    ctx.fillRect(barX, barY, barW * pct, barH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
  }
};

// ===== TASK 8: ROTATE PIPES (O2) =====
// 4x4 grid of pipe segments, rotate them to connect from left to right.
TASK_HANDLERS.rotate_pipes = {
  init(entity) {
    const grid = [];
    for (let i = 0; i < 16; i++) {
      grid.push({
        rotation: Math.floor(Math.random() * 3) + 1, // 1-3 (0 = solved)
      });
    }
    return { grid, done: false };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('PIPES CONNECTED!', x + w / 2, y + h / 2);
      return;
    }

    // Count remaining
    let remaining = 0;
    for (let i = 0; i < 16; i++) if (g.grid[i].rotation !== 0) remaining++;

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Rotate all pipes to green (' + remaining + ' left)', x + w / 2, y + 15);

    const cellSize = 55, gap = 6;
    const gridW = 4 * cellSize + 3 * gap;
    const gx = x + (w - gridW) / 2;
    const gy = y + 35;

    // Draw source arrow (left side)
    const srcY = gy + 1.5 * (cellSize + gap);
    ctx.fillStyle = '#0ff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('IN\u25B6', gx - 6, srcY + 5);
    ctx.textAlign = 'center';

    // Draw drain arrow (right side)
    const drnY = gy + 1.5 * (cellSize + gap);
    ctx.fillStyle = '#ff8800';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('\u25B6OUT', gx + gridW + 6, drnY + 5);
    ctx.textAlign = 'center';

    let allSolved = true;

    for (let i = 0; i < 16; i++) {
      const col = i % 4, row = Math.floor(i / 4);
      const cx = gx + col * (cellSize + gap);
      const cy = gy + row * (cellSize + gap);
      const cell = g.grid[i];
      const solved = cell.rotation === 0;

      const hover = panel.mouseX >= cx && panel.mouseX <= cx + cellSize &&
                    panel.mouseY >= cy && panel.mouseY <= cy + cellSize;

      ctx.fillStyle = solved ? '#0a2a1a' : (hover ? '#1a2a3a' : '#0c1620');
      ctx.fillRect(cx, cy, cellSize, cellSize);
      ctx.strokeStyle = solved ? '#44ff44' : (hover ? '#0ff' : '#1a3040');
      ctx.lineWidth = solved ? 2 : 1;
      ctx.strokeRect(cx, cy, cellSize, cellSize);

      // Draw pipe based on position in 4x4 grid
      const pcx = cx + cellSize / 2, pcy = cy + cellSize / 2;
      ctx.save();
      ctx.translate(pcx, pcy);
      ctx.rotate(cell.rotation * Math.PI / 2);

      const edgeRow = (row === 0 || row === 3);
      const edgeCol = (col === 0 || col === 3);
      const interior = !edgeRow && !edgeCol;

      ctx.strokeStyle = solved ? '#44ff44' : '#668';
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (interior) {
        ctx.moveTo(-cellSize / 2 + 5, 0);
        ctx.lineTo(cellSize / 2 - 5, 0);
        ctx.moveTo(0, -cellSize / 2 + 5);
        ctx.lineTo(0, cellSize / 2 - 5);
      } else if (edgeRow && edgeCol) {
        ctx.moveTo(-cellSize / 2 + 5, 0);
        ctx.lineTo(0, 0);
        ctx.lineTo(0, -cellSize / 2 + 5);
      } else {
        ctx.moveTo(-cellSize / 2 + 5, 0);
        ctx.lineTo(cellSize / 2 - 5, 0);
      }
      ctx.stroke();
      ctx.restore();

      if (!solved) allSolved = false;

      // Click to rotate
      if (panel.mouseJustClicked && hover) {
        cell.rotation = (cell.rotation + 1) % 4;
      }
    }

    if (allSolved) {
      g.done = true;
      completeCurrentTask();
    }
  }
};

// ===== TASK 9: CALIBRATE DIAL (Shields) =====
// Spinning dial — click when needle is in the green zone. Do it 5 times.
TASK_HANDLERS.calibrate_dial = {
  init(entity) {
    return {
      angle: 0,
      speed: 0.04,
      targetMin: -0.25,
      targetMax: 0.25,
      hits: 0,
      needed: 3,
      done: false,
      flash: 0,
      miss: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('CALIBRATED!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click when the needle is in the green zone (' + g.hits + '/' + g.needed + ')', x + w / 2, y + 15);

    // Update angle
    g.angle += g.speed;
    if (g.angle > Math.PI) g.angle -= Math.PI * 2;

    // Speed ramp: 0.04 + hits * 0.02
    g.speed = 0.04 + g.hits * 0.02;

    const dcx = x + w / 2, dcy = y + h / 2 + 10;
    const R = 90;

    // Dial background
    ctx.fillStyle = '#0c1620';
    ctx.beginPath(); ctx.arc(dcx, dcy, R, 0, Math.PI * 2); ctx.fill();

    // Green zone
    ctx.fillStyle = 'rgba(40,200,60,0.3)';
    ctx.beginPath();
    ctx.moveTo(dcx, dcy);
    ctx.arc(dcx, dcy, R - 2, g.targetMin - Math.PI / 2, g.targetMax - Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(dcx, dcy, R - 2, g.targetMin - Math.PI / 2, g.targetMax - Math.PI / 2);
    ctx.stroke();

    // Needle
    const nAngle = g.angle - Math.PI / 2;
    ctx.strokeStyle = g.flash > 0 ? '#44ff44' : (g.miss > 0 ? '#ff4444' : '#ff8800');
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dcx, dcy);
    ctx.lineTo(dcx + Math.cos(nAngle) * (R - 10), dcy + Math.sin(nAngle) * (R - 10));
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(dcx, dcy, 5, 0, Math.PI * 2); ctx.fill();

    // Border
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(dcx, dcy, R, 0, Math.PI * 2); ctx.stroke();

    // Flash/miss timers
    if (g.flash > 0) g.flash--;
    if (g.miss > 0) g.miss--;

    // Recalculate target zone based on current hits (shrink per hit = 0.06)
    const baseTMin = -0.25, baseTMax = 0.25, shrinkPerHit = 0.06;
    g.targetMin = baseTMin + (g.hits * shrinkPerHit) / 2;
    g.targetMax = baseTMax - (g.hits * shrinkPerHit) / 2;

    // Click anywhere to "lock"
    if (panel.mouseJustClicked) {
      if (g.angle >= g.targetMin && g.angle <= g.targetMax) {
        g.hits++;
        g.flash = 15;
        if (g.hits >= g.needed) {
          g.done = true;
          completeCurrentTask();
        }
      } else {
        g.miss = 15;
        g.hits = 0; // Reset to zero on miss
      }
    }

    // Progress dots
    const dotY = dcy + R + 25;
    for (let i = 0; i < g.needed; i++) {
      ctx.fillStyle = i < g.hits ? '#44ff44' : '#333';
      ctx.beginPath();
      ctx.arc(dcx - (g.needed - 1) * 10 + i * 20, dotY, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

// ===== LONG TASKS =====

// TASK 10: CIRCUIT PATHS (3-step: Electrical -> Admin -> Security)
// Each step: trace a wire path by clicking nodes in order. 10 real nodes + 4 decoys on 8x5 grid.
TASK_HANDLERS.circuit_paths = {
  init(entity) {
    // Generate a path of 10 nodes on an 8x5 grid
    const nodes = [];
    const used = new Set();
    let cx = 0, cy = Math.floor(Math.random() * 5);
    for (let i = 0; i < 10; i++) {
      nodes.push({ x: cx, y: cy, index: i });
      used.add(cx + ',' + cy);
      // Move right or up/down
      if (Math.random() < 0.6 && cx < 7) cx++;
      else cy = Math.max(0, Math.min(4, cy + (Math.random() < 0.5 ? 1 : -1)));
      // Avoid duplicates
      if (used.has(cx + ',' + cy)) {
        let placed = false;
        const dirs = [[1,0],[0,1],[0,-1],[-1,0],[1,1],[1,-1]];
        for (let d = dirs.length - 1; d > 0; d--) {
          const j = Math.floor(Math.random() * (d + 1));
          [dirs[d], dirs[j]] = [dirs[j], dirs[d]];
        }
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx <= 7 && ny >= 0 && ny <= 4 && !used.has(nx + ',' + ny)) {
            cx = nx; cy = ny; placed = true; break;
          }
        }
        if (!placed) {
          for (let gx = 0; gx <= 7 && !placed; gx++) {
            for (let gy = 0; gy <= 4 && !placed; gy++) {
              if (!used.has(gx + ',' + gy)) { cx = gx; cy = gy; placed = true; }
            }
          }
        }
      }
    }
    // Generate 4 decoy nodes on unused positions
    const decoys = [];
    const allFree = [];
    for (let gx = 0; gx <= 7; gx++) {
      for (let gy = 0; gy <= 4; gy++) {
        if (!used.has(gx + ',' + gy)) allFree.push({ x: gx, y: gy });
      }
    }
    // Shuffle and pick 4
    for (let i = allFree.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allFree[i], allFree[j]] = [allFree[j], allFree[i]];
    }
    for (let i = 0; i < Math.min(4, allFree.length); i++) {
      decoys.push(allFree[i]);
    }
    return {
      nodes,
      decoys,
      clicked: 0,
      done: false,
      errorText: '',
      errorTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('CIRCUIT CONNECTED!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click the nodes in order (1 to ' + g.nodes.length + ')', x + w / 2, y + 15);

    // Error text display
    if (g.errorTimer > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText(g.errorText, x + w / 2, y + 35);
      g.errorTimer--;
      if (g.errorTimer <= 0) { g.errorText = ''; }
    }

    const cellW = (w - 40) / 8;
    const cellH = (h - 80) / 5;
    const ox = x + 20, oy = y + 50;

    // Draw wires between real nodes (dim, thin lines)
    ctx.strokeStyle = '#152030';
    ctx.lineWidth = 2;
    for (let i = 0; i < g.nodes.length - 1; i++) {
      const a = g.nodes[i], b = g.nodes[i + 1];
      const ax = ox + a.x * cellW + cellW / 2;
      const ay = oy + a.y * cellH + cellH / 2;
      const bx = ox + b.x * cellW + cellW / 2;
      const by = oy + b.y * cellH + cellH / 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }

    // Draw lit wires (already clicked)
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = 2;
    for (let i = 0; i < g.clicked - 1; i++) {
      const a = g.nodes[i], b = g.nodes[i + 1];
      const ax = ox + a.x * cellW + cellW / 2;
      const ay = oy + a.y * cellH + cellH / 2;
      const bx = ox + b.x * cellW + cellW / 2;
      const by = oy + b.y * cellH + cellH / 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }

    // Draw decoy nodes
    for (let i = 0; i < g.decoys.length; i++) {
      const d = g.decoys[i];
      const dx = ox + d.x * cellW + cellW / 2;
      const dy = oy + d.y * cellH + cellH / 2;
      const dr = 10;
      const hover = Math.sqrt((panel.mouseX - dx) ** 2 + (panel.mouseY - dy) ** 2) < dr + 5;

      ctx.fillStyle = hover ? '#2a1a1a' : '#181818';
      ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(dx, dy, dr, 0, Math.PI * 2); ctx.stroke();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#666';
      ctx.fillText('?', dx, dy + 4);

      // Click decoy: reset progress
      if (panel.mouseJustClicked && hover && g.errorTimer <= 0) {
        g.clicked = 0;
        g.errorText = 'DECOY!';
        g.errorTimer = 30;
      }
    }

    // Draw real nodes
    for (let i = 0; i < g.nodes.length; i++) {
      const n = g.nodes[i];
      const nx = ox + n.x * cellW + cellW / 2;
      const ny = oy + n.y * cellH + cellH / 2;
      const r = 13;
      const clicked = i < g.clicked;
      const next = i === g.clicked;
      const hover = Math.sqrt((panel.mouseX - nx) ** 2 + (panel.mouseY - ny) ** 2) < r + 5;

      ctx.fillStyle = clicked ? '#0a3a0a' : (next && hover ? '#1a3050' : '#0c1620');
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = clicked ? '#44ff44' : (next ? '#0ff' : '#1a3040');
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.stroke();

      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = clicked ? '#44ff44' : (next ? '#0ff' : '#555');
      ctx.fillText((i + 1).toString(), nx, ny + 4);

      if (panel.mouseJustClicked && hover && g.errorTimer <= 0) {
        if (i === g.clicked) {
          g.clicked++;
          if (g.clicked >= g.nodes.length) {
            g.done = true;
            completeCurrentTask();
          }
        } else if (i > g.clicked) {
          g.clicked = 0;
          g.errorText = 'Wrong node!';
          g.errorTimer = 30;
        }
      }
    }
  }
};

// TASK 11: TEMPERATURE MONITOR (MedBay)
// Keep temperature in optimal zone (35-65) by clicking COOL/HEAT buttons. Progress only while in zone.
TASK_HANDLERS.sample_analyzer = {
  init(entity) {
    return {
      phase: 'start', // 'start', 'monitoring', 'collect'
      temperature: 50,
      tempVelocity: 0,
      progress: 0, // needs 300 to complete
      done: false,
      errorTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('SAMPLE ANALYZED!', x + w / 2, y + h / 2);
      return;
    }

    // --- START PHASE ---
    if (g.phase === 'start') {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press START to begin temperature monitoring', x + w / 2, y + h / 2 - 40);
      const btnW = 120, btnH = 40;
      const bx = x + (w - btnW) / 2, by = y + h / 2 - 10;
      const hover = panel.mouseX >= bx && panel.mouseX <= bx + btnW &&
                    panel.mouseY >= by && panel.mouseY <= by + btnH;
      ctx.fillStyle = hover ? '#1a3050' : '#0c1620';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnW, btnH);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#0ff';
      ctx.fillText('START', bx + btnW / 2, by + 27);
      if (panel.mouseJustClicked && hover) {
        g.phase = 'monitoring';
        g.temperature = 50;
        g.tempVelocity = 0;
        g.progress = 0;
      }
      // Show error flash from previous fail
      if (g.errorTimer > 0) {
        g.errorTimer--;
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#ff4444';
        ctx.fillText('TEMPERATURE CRITICAL! Try again.', x + w / 2, y + h / 2 + 50);
      }
      return;
    }

    // --- COLLECT PHASE ---
    if (g.phase === 'collect') {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Monitoring complete! Collect results.', x + w / 2, y + h / 2 - 40);
      const btnW = 140, btnH = 40;
      const bx = x + (w - btnW) / 2, by = y + h / 2 - 10;
      const hover = panel.mouseX >= bx && panel.mouseX <= bx + btnW &&
                    panel.mouseY >= by && panel.mouseY <= by + btnH;
      ctx.fillStyle = hover ? '#1a4030' : '#0c1620';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnW, btnH);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('COLLECT', bx + btnW / 2, by + 27);
      if (panel.mouseJustClicked && hover) {
        g.done = true;
        completeCurrentTask();
      }
      return;
    }

    // --- MONITORING PHASE ---
    // Update temperature physics (gentle drift)
    g.tempVelocity += (Math.random() - 0.5) * 0.08;
    if (g.tempVelocity > 0.8) g.tempVelocity = 0.8;
    if (g.tempVelocity < -0.8) g.tempVelocity = -0.8;
    g.temperature += g.tempVelocity;

    // Check fail conditions (wider safe range)
    if (g.temperature < 5 || g.temperature > 95) {
      g.phase = 'start';
      g.errorTimer = 45;
      g.temperature = 50;
      g.tempVelocity = 0;
      g.progress = 0;
      return;
    }

    // Clamp display
    const temp = Math.max(0, Math.min(100, g.temperature));

    // Progress in optimal zone (25-75)
    const inZone = temp >= 25 && temp <= 75;
    if (inZone) g.progress += 1;
    if (g.progress >= 200) {
      g.phase = 'collect';
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Keep temperature in the green zone (25-75)', x + w / 2, y + 15);

    // Draw thermometer (left side)
    const thermoX = x + 60, thermoY = y + 35, thermoW = 30, thermoH = 220;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(thermoX, thermoY, thermoW, thermoH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(thermoX, thermoY, thermoW, thermoH);

    // Optimal zone band (25-75 mapped to thermometer)
    const zoneTop = thermoY + thermoH * (1 - 75 / 100);
    const zoneBot = thermoY + thermoH * (1 - 25 / 100);
    ctx.fillStyle = 'rgba(40,200,60,0.25)';
    ctx.fillRect(thermoX + 1, zoneTop, thermoW - 2, zoneBot - zoneTop);
    ctx.strokeStyle = '#44ff44';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(thermoX, zoneTop); ctx.lineTo(thermoX + thermoW, zoneTop);
    ctx.moveTo(thermoX, zoneBot); ctx.lineTo(thermoX + thermoW, zoneBot);
    ctx.stroke();

    // Danger zones (below 5, above 95)
    const dangerTop = thermoY + thermoH * (1 - 95 / 100);
    const dangerBot = thermoY + thermoH * (1 - 5 / 100);
    ctx.fillStyle = 'rgba(255,50,50,0.15)';
    ctx.fillRect(thermoX + 1, thermoY + 1, thermoW - 2, dangerTop - thermoY);
    ctx.fillRect(thermoX + 1, dangerBot, thermoW - 2, thermoY + thermoH - dangerBot - 1);

    // Temperature fill
    const tFillH = thermoH * (temp / 100);
    const tempColor = inZone ? '#44ff44' : (temp < 35 ? '#4488ff' : '#ff6644');
    ctx.fillStyle = tempColor;
    ctx.fillRect(thermoX + 3, thermoY + thermoH - tFillH, thermoW - 6, tFillH);

    // Temperature label
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(Math.round(temp) + '\u00B0', thermoX + thermoW + 8, thermoY + thermoH - tFillH + 5);

    // Scale labels
    ctx.font = '10px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('100', thermoX + thermoW + 5, thermoY + 10);
    ctx.fillText('0', thermoX + thermoW + 5, thermoY + thermoH);
    ctx.fillText('75', thermoX + thermoW + 5, zoneTop + 4);
    ctx.fillText('25', thermoX + thermoW + 5, zoneBot + 4);
    ctx.textAlign = 'center';

    // Progress bar (right side)
    const pBarX = x + 160, pBarY = y + 40, pBarW = w - 200, pBarH = 20;
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Monitoring Progress', pBarX + pBarW / 2, pBarY - 5);
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(pBarX, pBarY, pBarW, pBarH);
    const pct = Math.min(1, g.progress / 200);
    ctx.fillStyle = inZone ? '#44ff44' : '#333';
    ctx.fillRect(pBarX, pBarY, pBarW * pct, pBarH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 1;
    ctx.strokeRect(pBarX, pBarY, pBarW, pBarH);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(Math.round(pct * 100) + '%', pBarX + pBarW / 2, pBarY + 15);

    // Status text
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = inZone ? '#44ff44' : '#ff8800';
    ctx.fillText(inZone ? 'IN OPTIMAL ZONE' : 'OUT OF ZONE - No progress!', pBarX + pBarW / 2, pBarY + 45);

    // Velocity indicator
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    const velText = g.tempVelocity > 0.1 ? 'Rising...' : (g.tempVelocity < -0.1 ? 'Falling...' : 'Stable');
    ctx.fillText('Trend: ' + velText, pBarX + pBarW / 2, pBarY + 65);

    // COOL and HEAT buttons
    const btnW = 100, btnH = 50;
    const btnY = y + h - 80;
    // COOL button (left)
    const coolX = x + w / 2 - btnW - 20;
    const coolHover = panel.mouseX >= coolX && panel.mouseX <= coolX + btnW &&
                      panel.mouseY >= btnY && panel.mouseY <= btnY + btnH;
    ctx.fillStyle = coolHover ? '#0a3040' : '#0c1620';
    ctx.fillRect(coolX, btnY, btnW, btnH);
    ctx.strokeStyle = '#00cccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(coolX, btnY, btnW, btnH);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#00cccc';
    ctx.fillText('COOL', coolX + btnW / 2, btnY + 32);

    // HEAT button (right)
    const heatX = x + w / 2 + 20;
    const heatHover = panel.mouseX >= heatX && panel.mouseX <= heatX + btnW &&
                      panel.mouseY >= btnY && panel.mouseY <= btnY + btnH;
    ctx.fillStyle = heatHover ? '#3a2010' : '#0c1620';
    ctx.fillRect(heatX, btnY, btnW, btnH);
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 2;
    ctx.strokeRect(heatX, btnY, btnW, btnH);
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ff8800';
    ctx.fillText('HEAT', heatX + btnW / 2, btnY + 32);

    // Button click handling
    if (panel.mouseJustClicked) {
      if (coolHover) g.tempVelocity -= 1.2;
      if (heatHover) g.tempVelocity += 1.2;
    }
  }
};

// TASK 12: PATH TRACE (2-step: Admin -> Navigation)
// Trace a winding path with mouse through 12 checkpoints while avoiding scanner bars.
TASK_HANDLERS.path_trace = {
  init(entity) {
    // Generate 12 waypoints for a tighter winding path
    const pts = [];
    const segments = 10;
    for (let i = 0; i <= segments; i++) {
      pts.push({
        x: 0.05 + (i / segments) * 0.9,
        y: 0.2 + Math.sin(i * 1.8 + Math.random() * 0.5) * 0.25 + Math.random() * 0.1,
      });
    }
    // Add one extra point to reach 12
    pts.push({
      x: 0.97,
      y: 0.2 + Math.sin(11 * 1.8 + Math.random() * 0.5) * 0.25 + Math.random() * 0.1,
    });
    return {
      points: pts,
      traceIndex: 0,
      done: false,
      scanners: [
        { y: 0.2, speed: 0.003, dir: 1 },
        { y: 0.7, speed: 0.004, dir: -1 },
      ],
      scanHitTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('PATH TRACED!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Hold mouse along the path through each checkpoint', x + w / 2, y + 15);

    // Scanner hit flash
    if (g.scanHitTimer > 0) {
      g.scanHitTimer--;
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('SCANNER HIT!', x + w / 2, y + 35);
    }

    // Update scanners
    for (const sc of g.scanners) {
      sc.y += sc.speed * sc.dir;
      if (sc.y > 0.95) { sc.y = 0.95; sc.dir = -1; }
      if (sc.y < 0.05) { sc.y = 0.05; sc.dir = 1; }
    }

    // Draw path
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < g.points.length; i++) {
      const px = x + g.points[i].x * w;
      const py = y + 30 + g.points[i].y * (h - 50);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Lit path (already traced)
    if (g.traceIndex > 0) {
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 20;
      ctx.beginPath();
      for (let i = 0; i <= g.traceIndex && i < g.points.length; i++) {
        const px = x + g.points[i].x * w;
        const py = y + 30 + g.points[i].y * (h - 50);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Draw scanner bars
    for (const sc of g.scanners) {
      const scY = y + 30 + sc.y * (h - 50);
      ctx.fillStyle = 'rgba(255, 50, 50, 0.25)';
      ctx.fillRect(x, scY - 3, w, 6);
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, scY); ctx.lineTo(x + w, scY);
      ctx.stroke();
    }

    // Check scanner collision with mouse (while mouseDown)
    if (panel.mouseDown && g.scanHitTimer <= 0) {
      const mouseRelY = (panel.mouseY - y - 30) / (h - 50);
      for (const sc of g.scanners) {
        if (Math.abs(mouseRelY - sc.y) < 0.04) {
          g.traceIndex = Math.max(0, g.traceIndex - 3);
          g.scanHitTimer = 15;
          break;
        }
      }
    }

    // Draw checkpoints
    for (let i = 0; i < g.points.length; i++) {
      const px = x + g.points[i].x * w;
      const py = y + 30 + g.points[i].y * (h - 50);
      const reached = i < g.traceIndex;
      const next = i === g.traceIndex;
      const r = next ? 12 : 8;

      ctx.fillStyle = reached ? '#44ff44' : (next ? '#0ff' : '#333');
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      if (next) {
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, r + 3, 0, Math.PI * 2); ctx.stroke();
      }

      // Check if mouse is over this checkpoint (must be the next one and mouse is held)
      if (next && panel.mouseDown) {
        const dist = Math.sqrt((panel.mouseX - px) ** 2 + (panel.mouseY - py) ** 2);
        if (dist < 14) {
          g.traceIndex++;
          if (g.traceIndex >= g.points.length) {
            g.done = true;
            completeCurrentTask();
          }
        }
      }
    }
  }
};

// TASK 13: PACKAGE ASSEMBLY (2-step: Storage -> Comms)
// Place 7 real items in correct order. 3 decoy items mixed in. Order shown briefly then hidden.
TASK_HANDLERS.package_assembly = {
  init(entity) {
    const items = ['Chip', 'Battery', 'Wire', 'Coolant', 'Board', 'Fuse', 'Case'];
    const decoys = ['Scrap', 'Dust', 'Rock'];
    const all = [...items, ...decoys];
    // Shuffle all 10 together
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return {
      items,           // correct order (7 real items)
      decoys,          // 3 decoy items
      available: all,  // shuffled display (10 total)
      placed: [],      // items placed into box
      done: false,
      errorTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('PACKAGE ASSEMBLED!', x + w / 2, y + h / 2);
      return;
    }

    if (g.errorTimer > 0) g.errorTimer--;

    // Always show the correct order at top
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#0ff';
    ctx.fillText('Order: ' + g.items.join(' > '), x + w / 2, y + 14);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#666';
    ctx.fillText('Click items in order. Avoid decoys! (' + g.placed.length + '/' + g.items.length + ')', x + w / 2, y + 30);

    // Error flash
    if (g.errorTimer > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 13px monospace';
      ctx.fillText('Wrong item! Progress reset.', x + w / 2, y + 46);
    }

    // Box area (right side)
    const boxX = x + w - 140, boxY = y + 55, boxW = 125, boxH = h - 70;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('Box', boxX + boxW / 2, boxY - 5);

    // Show placed items in box (compact)
    for (let i = 0; i < g.placed.length; i++) {
      const iy = boxY + 4 + i * 28;
      ctx.fillStyle = '#0a2a1a';
      ctx.fillRect(boxX + 6, iy, boxW - 12, 24);
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX + 6, iy, boxW - 12, 24);
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText(g.placed[i], boxX + boxW / 2, iy + 17);
    }

    // Available items (left side) — compact rows to fit all 10
    const itemX = x + 12, itemY = y + 55;
    const maxItemH = h - 70; // available vertical space
    const itemCount = g.available.length - g.placed.length;
    const rowH = Math.min(36, Math.floor(maxItemH / Math.max(itemCount, 1)));
    const ih = rowH - 4;
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.fillText('Available:', itemX, itemY - 5);
    ctx.textAlign = 'center';

    let visIndex = 0;
    for (let i = 0; i < g.available.length; i++) {
      const item = g.available[i];
      if (g.placed.includes(item)) continue;
      const iy = itemY + visIndex * rowH;
      visIndex++;
      const iw = 120;
      const hover = panel.mouseX >= itemX && panel.mouseX <= itemX + iw &&
                    panel.mouseY >= iy && panel.mouseY <= iy + ih;

      ctx.fillStyle = hover ? '#1a2a3a' : '#0c1620';
      ctx.fillRect(itemX, iy, iw, ih);
      ctx.strokeStyle = hover ? '#0ff' : '#1a3040';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, iy, iw, ih);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = hover ? '#0ff' : '#668';
      ctx.fillText(item, itemX + iw / 2, iy + ih / 2 + 4);

      if (panel.mouseJustClicked && hover && g.errorTimer <= 0) {
        const isDecoy = g.decoys.includes(item);
        const nextExpected = g.items[g.placed.length];
        if (!isDecoy && item === nextExpected) {
          g.placed.push(item);
          if (g.placed.length >= g.items.length) {
            g.done = true;
            completeCurrentTask();
          }
        } else {
          g.placed = [];
          g.errorTimer = 30;
        }
      }
    }
  }
};

// TASK 14: EMPTY TRASH (2-step: Comms -> Storage)
// Pull 3 levers all the way down, then hit FLUSH.
TASK_HANDLERS.empty_trash = {
  init(entity) {
    return {
      levers: [
        { y: 0, done: false, dragging: false },
        { y: 0, done: false, dragging: false },
        { y: 0, done: false, dragging: false },
      ],
      currentLever: 0,
      done: false,
      showFlush: false,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('TRASH EMPTIED!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    if (g.showFlush) {
      ctx.fillText('All levers pulled! Press FLUSH to empty.', x + w / 2, y + 15);
    } else {
      ctx.fillText('Pull lever ' + (g.currentLever + 1) + ' of 3 all the way down', x + w / 2, y + 15);
    }

    // Trash chute visual (behind levers)
    const chuteX = x + w / 2 - 80, chuteY = y + 35, chuteW = 160, chuteH = 200;
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(chuteX, chuteY, chuteW, chuteH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(chuteX, chuteY, chuteW, chuteH);

    // Trash items in chute (fewer as more levers complete)
    const trashCount = Math.max(0, 6 - g.currentLever * 2 - (g.showFlush ? 6 : 0));
    for (let i = 0; i < trashCount; i++) {
      const tx = chuteX + 10 + (i % 4) * 35;
      const ty = chuteY + 20 + Math.floor(i / 4) * 50 + (i % 3) * 15;
      ctx.fillStyle = ['#665533', '#888855', '#556644', '#887766', '#554433', '#776644'][i];
      ctx.fillRect(tx, ty, 25, 18);
    }

    // Draw 3 lever tracks
    const trackW = 40, trackH = chuteH - 20;
    const spacing = 55;
    const baseTrackX = x + w / 2 - spacing;
    const trackY = chuteY + 10;

    for (let li = 0; li < 3; li++) {
      const lever = g.levers[li];
      const trackX = baseTrackX + li * spacing;
      const isActive = li === g.currentLever && !g.showFlush;
      const isDone = lever.done;

      // Track rail
      ctx.fillStyle = isActive ? '#1a1a3a' : '#111';
      ctx.fillRect(trackX - 4, trackY, 8, trackH);
      ctx.strokeStyle = isActive ? '#334' : '#222';
      ctx.lineWidth = 1;
      ctx.strokeRect(trackX - 4, trackY, 8, trackH);

      // Bottom target zone
      if (isActive) {
        ctx.fillStyle = 'rgba(68,255,68,0.08)';
        ctx.fillRect(trackX - 20, trackY + trackH - 30, 40, 30);
      }

      // Lever handle
      const handleY = trackY + lever.y * (trackH - 28);
      const handleW = 36, handleH = 28;
      const hover = panel.mouseX >= trackX - handleW / 2 && panel.mouseX <= trackX + handleW / 2 &&
                    panel.mouseY >= handleY && panel.mouseY <= handleY + handleH;

      ctx.fillStyle = isDone ? '#0a3a0a' : (lever.dragging ? '#ff8800' : (isActive && hover ? '#1a3050' : '#0c1620'));
      ctx.fillRect(trackX - handleW / 2, handleY, handleW, handleH);
      ctx.strokeStyle = isDone ? '#44ff44' : (isActive ? (lever.dragging ? '#ff8800' : '#0ff') : '#333');
      ctx.lineWidth = isDone ? 2 : 1;
      ctx.strokeRect(trackX - handleW / 2, handleY, handleW, handleH);

      // Lever label
      ctx.font = '10px monospace';
      ctx.fillStyle = isDone ? '#44ff44' : (isActive ? '#fff' : '#444');
      ctx.fillText(isDone ? 'OK' : (li + 1).toString(), trackX, handleY + 18);

      // Drag logic (only for active lever)
      if (isActive && !g.showFlush) {
        if (panel.mouseDown) {
          if (lever.dragging || (panel.mouseJustClicked && hover)) {
            lever.dragging = true;
            let newY = (panel.mouseY - trackY) / (trackH - 28);
            newY = Math.max(0, Math.min(1, newY));
            // Only allow downward movement
            if (newY >= lever.y) {
              lever.y = newY;
            }
          }
        } else {
          if (lever.dragging) {
            if (lever.y >= 0.95) {
              // Lever reached bottom — done
              lever.done = true;
              lever.y = 1;
              g.currentLever++;
              if (g.currentLever >= 3) {
                g.showFlush = true;
              }
            } else {
              // Spring back to top
              lever.y = 0;
            }
          }
          lever.dragging = false;
        }
      }
    }

    // FLUSH button (after all 3 levers done)
    if (g.showFlush) {
      const btnW = 140, btnH = 45;
      const btnX = x + (w - btnW) / 2, btnY = y + h - 65;
      const hover = panel.mouseX >= btnX && panel.mouseX <= btnX + btnW &&
                    panel.mouseY >= btnY && panel.mouseY <= btnY + btnH;
      ctx.fillStyle = hover ? '#1a4030' : '#0c1620';
      ctx.fillRect(btnX, btnY, btnW, btnH);
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 2;
      ctx.strokeRect(btnX, btnY, btnW, btnH);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('FLUSH', btnX + btnW / 2, btnY + 30);
      if (panel.mouseJustClicked && hover) {
        g.done = true;
        completeCurrentTask();
      }
    }
  }
};
