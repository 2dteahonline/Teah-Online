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
  H: 380,
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
// 5 buttons light up in sequence, player must tap them in order.
TASK_HANDLERS.tap_sequence = {
  init(entity) {
    const seq = [];
    for (let i = 0; i < 5; i++) seq.push(Math.floor(Math.random() * 4));
    return {
      sequence: seq,         // which buttons light up (0-3)
      showPhase: true,       // true = showing sequence, false = player input
      showIndex: 0,          // current index being shown
      showTimer: 0,          // frames for timing
      inputIndex: 0,         // which input the player is on
      buttons: [0, 1, 2, 3], // button ids
      flash: -1,             // which button is flashing (-1 = none)
      flashTimer: 0,
      failed: false,
      done: false,
      failTimer: 0,
    };
  },
  draw(g, ctx, x, y, w, h, panel) {
    const colors = ['#ff4444', '#44cc44', '#4488ff', '#ffcc44'];
    const labels = ['R', 'G', 'B', 'Y'];
    const dimColors = ['#441111', '#114411', '#112244', '#443311'];
    const btnSize = 80;
    const gap = 20;
    const totalW = 4 * btnSize + 3 * gap;
    const bx = x + (w - totalW) / 2;
    const by = y + h / 2 - btnSize / 2 + 20;

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
      ctx.fillText('WRONG! Restarting...', x + w / 2, y + 30);
      g.failTimer++;
      if (g.failTimer > 60) {
        // Reset for retry
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
    if (g.showPhase) {
      ctx.fillStyle = '#aaa';
      ctx.fillText('Watch the sequence... (' + (g.showIndex + 1) + '/' + g.sequence.length + ')', x + w / 2, y + 30);
    } else {
      ctx.fillStyle = '#0ff';
      ctx.fillText('Your turn! Tap button ' + (g.inputIndex + 1) + ' of ' + g.sequence.length, x + w / 2, y + 30);
    }

    // Show sequence phase
    if (g.showPhase) {
      g.showTimer++;
      if (g.showTimer < 30) {
        g.flash = g.sequence[g.showIndex];
      } else if (g.showTimer < 45) {
        g.flash = -1;
      } else {
        g.showIndex++;
        g.showTimer = 0;
        if (g.showIndex >= g.sequence.length) {
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
    for (let i = 0; i < 4; i++) {
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
          if (i === g.sequence[g.inputIndex]) {
            // Correct
            g.flash = i;
            g.flashTimer = 12;
            g.inputIndex++;
            if (g.inputIndex >= g.sequence.length) {
              g.done = true;
              completeCurrentTask();
            }
          } else {
            // Wrong
            g.failed = true;
            g.flash = -1;
          }
        }
      }
    }

    // Progress dots
    const dotY = by + btnSize + 25;
    for (let i = 0; i < g.sequence.length; i++) {
      ctx.fillStyle = i < g.inputIndex ? '#44ff44' : (i === g.inputIndex && !g.showPhase ? '#0ff' : '#333');
      ctx.beginPath();
      ctx.arc(x + w / 2 - (g.sequence.length - 1) * 12 / 2 + i * 12, dotY, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

// ===== TASK 2: CODE ENTRY (Admin) =====
// Enter a 4-digit code shown briefly at the top.
TASK_HANDLERS.code_entry = {
  init(entity) {
    const code = [];
    for (let i = 0; i < 4; i++) code.push(Math.floor(Math.random() * 10));
    return {
      code,
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

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ACCESS GRANTED', x + w / 2, y + h / 2);
      return;
    }

    // Show code phase
    if (g.showCode) {
      g.showTimer++;
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Memorize this code:', x + w / 2, y + 30);
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#0ff';
      ctx.fillText(g.code.join(' '), x + w / 2, y + 80);
      if (g.showTimer > 120) {
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
        g.input = [];
        g.failed = false;
        g.failTimer = 0;
        g.showCode = true;
        g.showTimer = 0;
      }
      return;
    }

    // Input display
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Enter the code:', x + w / 2, y + 20);

    // Code slots
    const slotW = 50, slotH = 60, slotGap = 15;
    const totalSW = 4 * slotW + 3 * slotGap;
    const sx = x + (w - totalSW) / 2;
    const sy = y + 40;
    for (let i = 0; i < 4; i++) {
      const sxx = sx + i * (slotW + slotGap);
      ctx.fillStyle = '#0a1520';
      ctx.fillRect(sxx, sy, slotW, slotH);
      ctx.strokeStyle = i === g.input.length ? '#0ff' : '#1a3040';
      ctx.lineWidth = i === g.input.length ? 2 : 1;
      ctx.strokeRect(sxx, sy, slotW, slotH);
      if (i < g.input.length) {
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#0ff';
        ctx.fillText(g.input[i], sxx + slotW / 2, sy + slotH / 2 + 10);
      }
    }

    // Number pad (0-9)
    const padCols = 5, padRows = 2;
    const btnW = 60, btnH = 50, btnGap = 10;
    const padW = padCols * btnW + (padCols - 1) * btnGap;
    const padX = x + (w - padW) / 2;
    const padY = sy + slotH + 30;

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

      if (panel.mouseJustClicked && hover && g.input.length < 4) {
        g.input.push(n);
        // Check when 4 digits entered
        if (g.input.length === 4) {
          let correct = true;
          for (let i = 0; i < 4; i++) {
            if (g.input[i] !== g.code[i]) { correct = false; break; }
          }
          if (correct) {
            g.done = true;
            completeCurrentTask();
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
// Solve 3 simple math problems.
TASK_HANDLERS.simple_math = {
  init(entity) {
    function genProblem() {
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a, b;
      if (op === '*') { a = 2 + Math.floor(Math.random() * 8); b = 2 + Math.floor(Math.random() * 8); }
      else if (op === '-') { a = 10 + Math.floor(Math.random() * 40); b = 1 + Math.floor(Math.random() * a); }
      else { a = 5 + Math.floor(Math.random() * 45); b = 5 + Math.floor(Math.random() * 45); }
      const ans = op === '+' ? a + b : op === '-' ? a - b : a * b;
      return { text: a + ' ' + op + ' ' + b, answer: ans };
    }
    const problems = [genProblem(), genProblem(), genProblem()];
    return {
      problems,
      current: 0,
      input: '',
      done: false,
      wrong: false,
      wrongTimer: 0,
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
      if (g.wrongTimer > 40) { g.wrong = false; g.wrongTimer = 0; g.input = ''; }
      return;
    }

    // Number pad
    const btnW = 55, btnH = 45, btnGap = 8;
    const padY = y + 160;
    // Row 1: 1-5, Row 2: 6-9,0, Row 3: -, DEL, ENTER
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
        if (panel.mouseJustClicked && hover && g.input.length < 5) {
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
// 8 cards face down, find 4 matching pairs.
TASK_HANDLERS.match_symbol = {
  init(entity) {
    const symbols = ['!', '@', '#', '$'];
    const cards = [];
    for (const s of symbols) { cards.push(s); cards.push(s); }
    // Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return {
      cards,
      revealed: new Array(8).fill(false),
      matched: new Array(8).fill(false),
      first: -1,     // index of first flipped card
      second: -1,    // index of second flipped card
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
    ctx.fillText('Find matching pairs (' + g.pairs + '/4)', x + w / 2, y + 15);

    // Check phase (two cards revealed, waiting to flip back)
    if (g.checkTimer > 0) {
      g.checkTimer--;
      if (g.checkTimer <= 0) {
        if (g.cards[g.first] === g.cards[g.second]) {
          g.matched[g.first] = true;
          g.matched[g.second] = true;
          g.pairs++;
          if (g.pairs >= 4) {
            g.done = true;
            completeCurrentTask();
          }
        }
        g.revealed[g.first] = false;
        g.revealed[g.second] = false;
        g.first = -1;
        g.second = -1;
      }
    }

    // Draw cards (4x2 grid)
    const cardW = 70, cardH = 80, gap = 15;
    const cols = 4, rows = 2;
    const gridW = cols * cardW + (cols - 1) * gap;
    const gridH = rows * cardH + (rows - 1) * gap;
    const gx = x + (w - gridW) / 2;
    const gy = y + 40;

    for (let i = 0; i < 8; i++) {
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
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#44ff44';
        ctx.fillText(g.cards[i], cx + cardW / 2, cy + cardH / 2 + 10);
      } else if (show) {
        ctx.fillStyle = '#0a1a30';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#0ff';
        ctx.fillText(g.cards[i], cx + cardW / 2, cy + cardH / 2 + 10);
      } else {
        // Face down
        const hover = panel.mouseX >= cx && panel.mouseX <= cx + cardW &&
                      panel.mouseY >= cy && panel.mouseY <= cy + cardH;
        ctx.fillStyle = hover ? '#1a2a3a' : '#0c1620';
        ctx.fillRect(cx, cy, cardW, cardH);
        ctx.strokeStyle = hover ? '#0ff' : '#1a3040';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx, cy, cardW, cardH);
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#333';
        ctx.fillText('?', cx + cardW / 2, cy + cardH / 2 + 8);

        // Click
        if (panel.mouseJustClicked && hover && g.checkTimer <= 0) {
          if (g.first === -1) {
            g.first = i;
            g.revealed[i] = true;
          } else if (g.second === -1 && i !== g.first) {
            g.second = i;
            g.revealed[i] = true;
            g.checkTimer = 30; // Show for half a second then check
          }
        }
      }
    }
  }
};

// ===== TASK 5: SLIDER ALIGNMENT (Reactor) =====
// Drag 3 sliders to match target positions.
TASK_HANDLERS.slider_alignment = {
  init(entity) {
    const sliders = [];
    for (let i = 0; i < 3; i++) {
      sliders.push({
        value: 0.1 + Math.random() * 0.3,
        target: 0.3 + Math.random() * 0.5,
      });
    }
    return { sliders, dragging: -1, done: false };
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
    ctx.fillText('Align all sliders to the target markers', x + w / 2, y + 15);

    const sliderW = w - 60;
    const sliderH = 20;
    const sliderX = x + 30;
    const startY = y + 50;
    const spacing = 80;

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
      ctx.fillRect(targetX - 8, sy - 5, 16, sliderH + 10);
      ctx.strokeStyle = '#0ff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetX, sy - 8); ctx.lineTo(targetX, sy + sliderH + 8);
      ctx.stroke();

      // Slider thumb
      const thumbX = sliderX + s.value * sliderW;
      const thumbW = 18, thumbH = sliderH + 12;
      const aligned = Math.abs(s.value - s.target) < 0.03;
      ctx.fillStyle = aligned ? '#44ff44' : '#ff6644';
      ctx.fillRect(thumbX - thumbW / 2, sy - 6, thumbW, thumbH);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(thumbX - thumbW / 2, sy - 6, thumbW, thumbH);

      if (!aligned) allAligned = false;

      // Label
      ctx.font = '12px monospace';
      ctx.fillStyle = aligned ? '#44ff44' : '#888';
      ctx.textAlign = 'left';
      ctx.fillText(aligned ? 'OK' : 'Slider ' + (i + 1), sliderX, sy - 12);
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

    if (allAligned) {
      g.done = true;
      completeCurrentTask();
    }
  }
};

// ===== TASK 6: SECURITY AUTH (Security) =====
// Match a pattern: 3x3 grid, highlight pattern → reproduce it.
TASK_HANDLERS.security_auth = {
  init(entity) {
    // Generate pattern (3-5 cells lit)
    const pattern = new Set();
    const count = 3 + Math.floor(Math.random() * 3);
    while (pattern.size < count) pattern.add(Math.floor(Math.random() * 9));
    return {
      pattern,
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
        g.playerPattern = new Set();
        g.showPhase = true;
        g.showTimer = 0;
        g.failed = false;
        g.failTimer = 0;
      }
      return;
    }

    if (g.showPhase) {
      g.showTimer++;
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Memorize the pattern...', x + w / 2, y + 15);
      if (g.showTimer > 90) {
        g.showPhase = false;
      }
    } else {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#0ff';
      ctx.fillText('Reproduce the pattern', x + w / 2, y + 15);
    }

    // 3x3 grid
    const cellSize = 70, gap = 10;
    const gridW = 3 * cellSize + 2 * gap;
    const gx = x + (w - gridW) / 2;
    const gy = y + 40;

    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const cx = gx + col * (cellSize + gap);
      const cy = gy + row * (cellSize + gap);
      const inPattern = g.pattern.has(i);
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
        ctx.fillRect(cx + 4, cy + 4, cellSize - 8, cellSize - 8);
      }

      // Click (input phase)
      if (!g.showPhase && panel.mouseJustClicked && hover) {
        if (g.playerPattern.has(i)) g.playerPattern.delete(i);
        else g.playerPattern.add(i);
      }
    }

    // Submit button
    if (!g.showPhase) {
      const btnW = 120, btnH = 40;
      const bx = x + (w - btnW) / 2;
      const by = gy + 3 * (cellSize + gap) + 10;
      const hover = panel.mouseX >= bx && panel.mouseX <= bx + btnW &&
                    panel.mouseY >= by && panel.mouseY <= by + btnH;
      ctx.fillStyle = hover ? '#1a4030' : '#0c1620';
      ctx.fillRect(bx, by, btnW, btnH);
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, btnW, btnH);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('SUBMIT', bx + btnW / 2, by + 26);

      if (panel.mouseJustClicked && hover) {
        // Check
        let match = g.pattern.size === g.playerPattern.size;
        if (match) {
          for (const v of g.pattern) {
            if (!g.playerPattern.has(v)) { match = false; break; }
          }
        }
        if (match) {
          g.done = true;
          completeCurrentTask();
        } else {
          g.failed = true;
        }
      }
    }
  }
};

// ===== TASK 7: HOLD TO CHARGE (Upper Engine) =====
// Hold mouse button on the charge zone until bar fills.
TASK_HANDLERS.hold_to_charge = {
  init(entity) {
    return { charge: 0, maxCharge: 100, done: false, charging: false };
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('ENGINE CHARGED!', x + w / 2, y + h / 2);
      return;
    }

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Hold the button to charge the engine', x + w / 2, y + 15);

    // Big circular button
    const bcx = x + w / 2, bcy = y + h / 2 - 10;
    const radius = 70;
    const hover = Math.sqrt((panel.mouseX - bcx) ** 2 + (panel.mouseY - bcy) ** 2) < radius;
    g.charging = hover && panel.mouseDown;

    if (g.charging) {
      g.charge = Math.min(g.maxCharge, g.charge + 1);
      if (g.charge >= g.maxCharge) {
        g.done = true;
        completeCurrentTask();
      }
    } else {
      g.charge = Math.max(0, g.charge - 0.5);
    }

    // Background circle
    ctx.fillStyle = '#0c1620';
    ctx.beginPath(); ctx.arc(bcx, bcy, radius, 0, Math.PI * 2); ctx.fill();

    // Charge arc
    const pct = g.charge / g.maxCharge;
    ctx.strokeStyle = pct > 0.8 ? '#44ff44' : '#ff8800';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(bcx, bcy, radius - 8, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();

    // Border
    ctx.strokeStyle = g.charging ? '#ff8800' : '#1a3040';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(bcx, bcy, radius, 0, Math.PI * 2); ctx.stroke();

    // Center text
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = g.charging ? '#ff8800' : '#555';
    ctx.fillText(Math.round(pct * 100) + '%', bcx, bcy + 8);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(g.charging ? 'CHARGING...' : 'HOLD HERE', bcx, bcy + 28);

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
// 3x3 grid of pipe segments, rotate them to connect from left to right.
TASK_HANDLERS.rotate_pipes = {
  init(entity) {
    // Simple: generate a path and randomize rotations
    // Pipe types: 0=straight H, 1=straight V, 2=L bend (connects right+down), etc.
    // Simplified: each cell has rotation 0-3. Target is rotation 0 for all.
    const grid = [];
    for (let i = 0; i < 9; i++) {
      grid.push({
        rotation: Math.floor(Math.random() * 3) + 1, // 1-3 (0 = solved)
        targetRotation: 0,
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

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Click to rotate each pipe segment', x + w / 2, y + 15);

    const cellSize = 70, gap = 8;
    const gridW = 3 * cellSize + 2 * gap;
    const gx = x + (w - gridW) / 2;
    const gy = y + 40;

    let allSolved = true;

    for (let i = 0; i < 9; i++) {
      const col = i % 3, row = Math.floor(i / 3);
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

      // Draw pipe based on rotation
      const pcx = cx + cellSize / 2, pcy = cy + cellSize / 2;
      ctx.save();
      ctx.translate(pcx, pcy);
      ctx.rotate(cell.rotation * Math.PI / 2);

      // Pipe segment (horizontal with bend)
      ctx.strokeStyle = solved ? '#44ff44' : '#668';
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (row === 1 && col !== 1) {
        // Straight horizontal
        ctx.moveTo(-cellSize / 2 + 5, 0);
        ctx.lineTo(cellSize / 2 - 5, 0);
      } else if (col === 1) {
        // T-junction (cross)
        ctx.moveTo(-cellSize / 2 + 5, 0);
        ctx.lineTo(cellSize / 2 - 5, 0);
        ctx.moveTo(0, -cellSize / 2 + 5);
        ctx.lineTo(0, cellSize / 2 - 5);
      } else {
        // L-bend
        ctx.moveTo(-cellSize / 2 + 5, 0);
        ctx.lineTo(0, 0);
        ctx.lineTo(0, -cellSize / 2 + 5);
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
// Spinning dial — click when needle is in the green zone. Do it 3 times.
TASK_HANDLERS.calibrate_dial = {
  init(entity) {
    return {
      angle: 0,
      speed: 0.04,
      targetMin: -0.3,
      targetMax: 0.3,
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

    // Speed up each hit
    const spd = 0.04 + g.hits * 0.015;
    g.speed = spd;

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

    // Recalculate target zone based on current hits (prevents permanent shrink on miss)
    const baseTMin = -0.3, baseTMax = 0.3, shrinkPerHit = 0.1;
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
        g.hits = Math.max(0, g.hits - 1);
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

// TASK 10: CIRCUIT PATHS (3-step: Electrical → Admin → Security)
// Each step: trace a wire path by clicking nodes in order.
TASK_HANDLERS.circuit_paths = {
  init(entity) {
    // Generate a path of 5 nodes on a grid
    const nodes = [];
    const used = new Set();
    let cx = 0, cy = Math.floor(Math.random() * 4);
    for (let i = 0; i < 6; i++) {
      nodes.push({ x: cx, y: cy, index: i });
      used.add(cx + ',' + cy);
      // Move right or up/down
      if (Math.random() < 0.6 && cx < 5) cx++;
      else cy = Math.max(0, Math.min(3, cy + (Math.random() < 0.5 ? 1 : -1)));
      // Avoid duplicates — try neighbors, not just incrementing cx
      if (used.has(cx + ',' + cy)) {
        let placed = false;
        // Try all adjacent cells in random order
        const dirs = [[1,0],[0,1],[0,-1],[-1,0],[1,1],[1,-1]];
        for (let d = dirs.length - 1; d > 0; d--) {
          const j = Math.floor(Math.random() * (d + 1));
          [dirs[d], dirs[j]] = [dirs[j], dirs[d]];
        }
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && nx <= 5 && ny >= 0 && ny <= 3 && !used.has(nx + ',' + ny)) {
            cx = nx; cy = ny; placed = true; break;
          }
        }
        // Fallback: scan entire grid for any free cell
        if (!placed) {
          for (let gx = 0; gx <= 5 && !placed; gx++) {
            for (let gy = 0; gy <= 3 && !placed; gy++) {
              if (!used.has(gx + ',' + gy)) { cx = gx; cy = gy; placed = true; }
            }
          }
        }
      }
    }
    return {
      nodes,
      clicked: 0, // how many nodes player has clicked in order
      done: false,
      wrong: false,
      wrongTimer: 0,
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

    if (g.wrong) {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('Wrong node!', x + w / 2, y + 35);
      g.wrongTimer++;
      if (g.wrongTimer > 30) { g.wrong = false; g.wrongTimer = 0; }
    }

    const cellW = (w - 40) / 6;
    const cellH = (h - 80) / 4;
    const ox = x + 20, oy = y + 50;

    // Draw wires between consecutive nodes
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 3;
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
    ctx.lineWidth = 3;
    for (let i = 0; i < g.clicked - 1; i++) {
      const a = g.nodes[i], b = g.nodes[i + 1];
      const ax = ox + a.x * cellW + cellW / 2;
      const ay = oy + a.y * cellH + cellH / 2;
      const bx = ox + b.x * cellW + cellW / 2;
      const by = oy + b.y * cellH + cellH / 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }

    // Draw nodes
    for (let i = 0; i < g.nodes.length; i++) {
      const n = g.nodes[i];
      const nx = ox + n.x * cellW + cellW / 2;
      const ny = oy + n.y * cellH + cellH / 2;
      const r = 15;
      const clicked = i < g.clicked;
      const next = i === g.clicked;
      const hover = Math.sqrt((panel.mouseX - nx) ** 2 + (panel.mouseY - ny) ** 2) < r + 5;

      ctx.fillStyle = clicked ? '#0a3a0a' : (next && hover ? '#1a3050' : '#0c1620');
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = clicked ? '#44ff44' : (next ? '#0ff' : '#1a3040');
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, Math.PI * 2); ctx.stroke();

      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = clicked ? '#44ff44' : (next ? '#0ff' : '#555');
      ctx.fillText((i + 1).toString(), nx, ny + 5);

      if (panel.mouseJustClicked && hover && !g.wrong) {
        if (i === g.clicked) {
          g.clicked++;
          if (g.clicked >= g.nodes.length) {
            g.done = true;
            completeCurrentTask();
          }
        } else if (i >= g.clicked) {
          g.wrong = true;
        }
      }
    }
  }
};

// TASK 11: SAMPLE ANALYZER (MedBay)
// Press Start, wait for progress bar, then press Collect.
TASK_HANDLERS.sample_analyzer = {
  init(entity) {
    return { phase: 'start', progress: 0, done: false }; // phases: start, analyzing, collect
  },
  draw(g, ctx, x, y, w, h, panel) {
    ctx.textAlign = 'center';

    if (g.done) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText('SAMPLE ANALYZED!', x + w / 2, y + h / 2);
      return;
    }

    // Sample tube visual
    const tubeW = 40, tubeH = 120;
    const tx = x + w / 2 - tubeW / 2, ty = y + 30;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(tx, ty, tubeW, tubeH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(tx, ty, tubeW, tubeH);

    // Liquid level
    const fillH = tubeH * (g.progress / 100);
    ctx.fillStyle = g.phase === 'collect' ? '#44ff44' : '#0088aa';
    ctx.fillRect(tx + 2, ty + tubeH - fillH, tubeW - 4, fillH);

    // Bubbles during analysis
    if (g.phase === 'analyzing') {
      g.progress += 0.5;
      const t = renderTime * 0.01;
      for (let i = 0; i < 3; i++) {
        const bx = tx + 10 + Math.sin(t + i * 2) * 10;
        const by = ty + tubeH - fillH + 10 + Math.sin(t * 1.5 + i) * 20;
        ctx.fillStyle = 'rgba(100,220,255,0.4)';
        ctx.beginPath(); ctx.arc(bx, by, 3 + Math.sin(t + i) * 1, 0, Math.PI * 2); ctx.fill();
      }
      if (g.progress >= 100) {
        g.phase = 'collect';
        g.progress = 100;
      }
    }

    // Progress bar
    const barW = w - 80, barH = 20;
    const barX = x + 40, barY = ty + tubeH + 20;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = g.phase === 'collect' ? '#44ff44' : '#0088aa';
    ctx.fillRect(barX, barY, barW * g.progress / 100, barH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(Math.round(g.progress) + '%', x + w / 2, barY + 15);

    // Status
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    const statusY = barY + 50;
    if (g.phase === 'start') {
      ctx.fillText('Press START to begin analysis', x + w / 2, statusY);
      // Start button
      const btnW = 120, btnH = 40;
      const bx = x + (w - btnW) / 2, by = statusY + 15;
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
      if (panel.mouseJustClicked && hover) g.phase = 'analyzing';
    } else if (g.phase === 'analyzing') {
      ctx.fillText('Analyzing sample... Please wait.', x + w / 2, statusY);
    } else if (g.phase === 'collect') {
      ctx.fillText('Analysis complete! Collect results.', x + w / 2, statusY);
      const btnW = 140, btnH = 40;
      const bx = x + (w - btnW) / 2, by = statusY + 15;
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
    }
  }
};

// TASK 12: PATH TRACE (2-step: Admin → Navigation)
// Trace a dotted path with mouse from start to end without going off-path.
TASK_HANDLERS.path_trace = {
  init(entity) {
    // Generate waypoints for a winding path
    const pts = [];
    const segments = 6;
    for (let i = 0; i <= segments; i++) {
      pts.push({
        x: 0.05 + (i / segments) * 0.9,
        y: 0.2 + Math.sin(i * 1.2 + Math.random()) * 0.25 + Math.random() * 0.1,
      });
    }
    return {
      points: pts,
      traceIndex: 0, // how many waypoints reached
      done: false,
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
    ctx.fillText('Move mouse along the path through each checkpoint', x + w / 2, y + 15);

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

    // Draw checkpoints
    for (let i = 0; i < g.points.length; i++) {
      const px = x + g.points[i].x * w;
      const py = y + 30 + g.points[i].y * (h - 50);
      const reached = i < g.traceIndex;
      const next = i === g.traceIndex;
      const r = next ? 14 : 10;

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
        if (dist < 20) {
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

// TASK 13: PACKAGE ASSEMBLY (2-step: Storage → Comms)
// Drag items into a box in the correct order.
TASK_HANDLERS.package_assembly = {
  init(entity) {
    const items = ['Chip', 'Battery', 'Wire', 'Case'];
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return {
      items,          // correct order
      available: shuffled, // shuffled display
      placed: [],     // items placed into box
      done: false,
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

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Place items in order: ' + g.items.join(' → '), x + w / 2, y + 15);

    // Box area (right side)
    const boxX = x + w - 150, boxY = y + 50, boxW = 130, boxH = 200;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('Box', boxX + boxW / 2, boxY - 5);

    // Show placed items in box
    for (let i = 0; i < g.placed.length; i++) {
      const iy = boxY + 10 + i * 45;
      ctx.fillStyle = '#0a2a1a';
      ctx.fillRect(boxX + 10, iy, boxW - 20, 38);
      ctx.strokeStyle = '#44ff44';
      ctx.lineWidth = 1;
      ctx.strokeRect(boxX + 10, iy, boxW - 20, 38);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#44ff44';
      ctx.fillText(g.placed[i], boxX + boxW / 2, iy + 24);
    }

    // Available items (left side)
    const itemX = x + 20, itemY = y + 50;
    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.fillText('Available:', itemX, itemY - 5);
    ctx.textAlign = 'center';

    let visIndex = 0;
    for (let i = 0; i < g.available.length; i++) {
      const item = g.available[i];
      if (g.placed.includes(item)) continue; // Already placed
      const iy = itemY + visIndex * 50;
      visIndex++;
      const iw = 140, ih = 40;
      const hover = panel.mouseX >= itemX && panel.mouseX <= itemX + iw &&
                    panel.mouseY >= iy && panel.mouseY <= iy + ih;

      ctx.fillStyle = hover ? '#1a2a3a' : '#0c1620';
      ctx.fillRect(itemX, iy, iw, ih);
      ctx.strokeStyle = hover ? '#0ff' : '#1a3040';
      ctx.lineWidth = 1;
      ctx.strokeRect(itemX, iy, iw, ih);
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = hover ? '#0ff' : '#668';
      ctx.fillText(item, itemX + iw / 2, iy + 26);

      if (panel.mouseJustClicked && hover) {
        const nextExpected = g.items[g.placed.length];
        if (item === nextExpected) {
          g.placed.push(item);
          if (g.placed.length >= g.items.length) {
            g.done = true;
            completeCurrentTask();
          }
        }
        // Wrong item = no effect, just doesn't add
      }
    }
  }
};

// TASK 14: EMPTY TRASH (2-step: Comms → Storage)
// Pull a lever down (drag down) to empty the chute.
TASK_HANDLERS.empty_trash = {
  init(entity) {
    return { leverY: 0, target: 1, done: false, dragging: false };
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
    ctx.fillText('Pull the lever all the way down', x + w / 2, y + 15);

    // Trash chute visual
    const chuteX = x + w / 2 - 60, chuteY = y + 40, chuteW = 120, chuteH = 180;
    ctx.fillStyle = '#0c1620';
    ctx.fillRect(chuteX, chuteY, chuteW, chuteH);
    ctx.strokeStyle = '#1a3040';
    ctx.lineWidth = 2;
    ctx.strokeRect(chuteX, chuteY, chuteW, chuteH);

    // Trash items (disappear as lever goes down)
    const trashCount = Math.max(0, Math.floor(5 * (1 - g.leverY)));
    for (let i = 0; i < trashCount; i++) {
      const tx = chuteX + 15 + (i % 3) * 30;
      const ty = chuteY + 20 + Math.floor(i / 3) * 40 + i * 10;
      ctx.fillStyle = ['#665533', '#888855', '#556644', '#887766', '#554433'][i];
      ctx.fillRect(tx, ty, 25, 20);
    }

    // Lever track
    const trackX = x + w / 2 + 100;
    const trackY = chuteY;
    const trackH = chuteH;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(trackX - 5, trackY, 10, trackH);

    // Lever handle
    const handleY = trackY + g.leverY * (trackH - 30);
    const handleW = 40, handleH = 30;
    const hover = panel.mouseX >= trackX - handleW / 2 && panel.mouseX <= trackX + handleW / 2 &&
                  panel.mouseY >= handleY && panel.mouseY <= handleY + handleH;

    ctx.fillStyle = g.dragging ? '#ff8800' : (hover ? '#1a3050' : '#0c1620');
    ctx.fillRect(trackX - handleW / 2, handleY, handleW, handleH);
    ctx.strokeStyle = g.dragging ? '#ff8800' : '#0ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(trackX - handleW / 2, handleY, handleW, handleH);

    // Drag logic
    if (panel.mouseDown) {
      if (g.dragging || (panel.mouseJustClicked && hover)) {
        g.dragging = true;
        const newY = (panel.mouseY - trackY) / (trackH - 30);
        g.leverY = Math.max(0, Math.min(1, newY));
      }
    } else {
      if (g.dragging && g.leverY >= 0.95) {
        g.done = true;
        completeCurrentTask();
      }
      g.dragging = false;
    }

    // Percentage
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText(Math.round(g.leverY * 100) + '%', trackX, trackY + trackH + 20);
  }
};
