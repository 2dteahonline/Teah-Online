// ===================== SKELD SYSTEM (Among Us Gameplay) =====================
// Authority: state machine, bot AI, role assignment for Among Us mode on The Skeld.
// Depends on: SKELD_GAME (skeldGameData.js), bfsPath/isSolid (mobSystem.js),
//             Scene/enterLevel (sceneManager.js), gameState globals (player, level, gameFrame)

// ---- Global State ----
window.SkeldState = {
  phase: 'idle',              // 'idle' | 'playing' | 'meeting' | 'voting' | 'ejecting' | 'post_match'
  phaseTimer: 0,
  playerRole: null,           // 'crewmate' | 'impostor'
  participants: [],           // array of participant objects (see startMatch)
  bodies: [],                 // [{ x, y, color, name, reportable }]
  killCooldown: 0,
  sabotage: { active: null, timer: 0, cooldown: 0 },
  meeting: { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 },
  ejection: { name: null, wasImpostor: false, timer: 0 },
  taskProgress: { done: 0, total: 0 },
};

// ---- Default state snapshot for resets ----
const _SKELD_DEFAULTS = {
  phase: 'idle',
  phaseTimer: 0,
  playerRole: null,
  participants: [],
  bodies: [],
  killCooldown: 0,
  sabotage: { active: null, timer: 0, cooldown: 0 },
  meeting: { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 },
  ejection: { name: null, wasImpostor: false, timer: 0 },
  taskProgress: { done: 0, total: 0 },
};


// ===================== SkeldSystem =====================
window.SkeldSystem = {

  // ---- Participant helpers ----
  getLocalPlayer() {
    return SkeldState.participants.find(p => p.isLocal) || null;
  },
  getAlivePlayers() {
    return SkeldState.participants.filter(p => p.alive);
  },
  getAliveCrewmates() {
    return SkeldState.participants.filter(p => p.alive && p.role === 'crewmate');
  },
  getAliveImpostors() {
    return SkeldState.participants.filter(p => p.alive && p.role === 'impostor');
  },
  getBots() {
    return SkeldState.participants.filter(p => p.isBot);
  },


  // ===================== START MATCH =====================
  startMatch() {
    const sk = SkeldState;

    // Clear existing mobs (bots are standalone entities, not in mobs[])
    mobs.length = 0;

    // ---- Assign colors: shuffle 10 colors, pick 9 ----
    const colorPool = SKELD_GAME.COLORS.slice();
    for (let i = colorPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
    }

    // ---- Build participants array ----
    const spawn = SKELD_GAME.CAFETERIA_SPAWN;
    const participants = [];

    // Player (index 0) — always crewmate for now (hardcoded)
    sk.playerRole = 'crewmate';
    const playerColor = colorPool[0];
    participants.push({
      id: 'player',
      name: typeof playerName !== 'undefined' ? playerName : 'Player',
      role: 'crewmate',
      entity: player,
      isBot: false,
      isLocal: true,
      alive: true,
      votedFor: null,
      emergenciesUsed: 0,
      color: playerColor,
      // Bot AI state (unused for player)
      _aiState: null,
    });

    // Position player at cafeteria
    player.x = spawn.tx * TILE + TILE / 2;
    player.y = spawn.ty * TILE + TILE / 2;
    player.vx = 0;
    player.vy = 0;

    // ---- Create 8 bots ----
    // Pick impostor: random bot index (0-7 → bot indices)
    const impostorIdx = Math.floor(Math.random() * SKELD_GAME.BOT_COUNT);

    for (let i = 0; i < SKELD_GAME.BOT_COUNT; i++) {
      const color = colorPool[i + 1]; // skip index 0 (player's color)
      const role = (i === impostorIdx) ? 'impostor' : 'crewmate';

      // Spread bots slightly around cafeteria spawn to avoid stacking
      const offsetX = ((i % 4) - 1.5) * 30;
      const offsetY = (Math.floor(i / 4) - 0.5) * 30;

      const bot = {
        x: spawn.tx * TILE + TILE / 2 + offsetX,
        y: spawn.ty * TILE + TILE / 2 + offsetY,
        vx: 0,
        vy: 0,
        hp: -1,
        maxHp: -1,
        speed: SKELD_GAME.BOT_SPEED,
        type: 'skeld_bot',
        // Visual colors — used by drawChar() procedural renderer
        skin: color.body,
        hair: color.dark,
        shirt: color.body,
        pants: color.dark,
        name: color.name,
        frame: 0,
        dir: Math.floor(Math.random() * 4),
        moving: false,
        hitboxR: 15,
      };

      participants.push({
        id: 'bot_' + i,
        name: color.name,
        role: role,
        entity: bot,
        isBot: true,
        isLocal: false,
        alive: true,
        votedFor: null,
        emergenciesUsed: 0,
        color: color,
        // Bot AI state
        _aiState: {
          targetRoom: null,     // key from ROOM_CENTERS
          path: null,           // BFS path array
          pathIdx: 0,           // current index in path
          pauseTimer: 0,        // frames remaining at current "task"
          stuckTimer: 0,        // frames stuck in same spot
          lastX: 0,
          lastY: 0,
        },
      });
    }

    sk.participants = participants;
    sk.phase = 'playing';
    sk.phaseTimer = 0;
    sk.bodies = [];
    sk.killCooldown = SKELD_GAME.KILL_COOLDOWN;
    sk.sabotage = { active: null, timer: 0, cooldown: 0 };
    sk.meeting = { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 };
    sk.ejection = { name: null, wasImpostor: false, timer: 0 };
    sk.taskProgress = { done: 0, total: 0 };

    // Reset Skeld tasks if available
    if (typeof SkeldTasks !== 'undefined' && typeof SkeldTasks.reset === 'function') {
      SkeldTasks.reset();
    }

    // Assign initial bot destinations
    for (const p of participants) {
      if (p.isBot) this._pickBotDestination(p);
    }
  },


  // ===================== MAIN TICK =====================
  tick() {
    const sk = SkeldState;

    // Auto-start match when entering Skeld and no match is active
    if (sk.phase === 'idle') {
      this.startMatch();
      return;
    }

    if (sk.phase === 'playing') {
      this._tickPlaying();
    }
    // Future phases: meeting, voting, ejecting handled here
  },


  // ---- Playing phase tick ----
  _tickPlaying() {
    const sk = SkeldState;

    // Tick kill cooldown
    if (sk.killCooldown > 0) sk.killCooldown--;

    // Bot AI disabled for now — will be enabled in a later phase
    // for (const p of sk.participants) {
    //   if (!p.isBot || !p.alive) continue;
    //   this._tickBotCrewmate(p);
    // }
  },


  // ===================== BOT AI — CREWMATE =====================
  // Pick random room → BFS pathfind → walk there → pause 3-5s → repeat

  _tickBotCrewmate(participant) {
    const ai = participant._aiState;
    const bot = participant.entity;
    if (!ai || !bot) return;

    // ---- Pause at "task" location ----
    if (ai.pauseTimer > 0) {
      ai.pauseTimer--;
      bot.moving = false;
      bot.vx = 0;
      bot.vy = 0;
      if (ai.pauseTimer <= 0) {
        // Done pausing, pick next destination
        this._pickBotDestination(participant);
      }
      return;
    }

    // ---- Stuck detection ----
    const dxLast = bot.x - (ai.lastX || 0);
    const dyLast = bot.y - (ai.lastY || 0);
    if (Math.abs(dxLast) < 2 && Math.abs(dyLast) < 2) {
      ai.stuckTimer = (ai.stuckTimer || 0) + 1;
    } else {
      ai.stuckTimer = 0;
    }
    ai.lastX = bot.x;
    ai.lastY = bot.y;

    // If stuck for 90+ frames, pick new destination
    if (ai.stuckTimer > 90) {
      ai.stuckTimer = 0;
      this._pickBotDestination(participant);
      return;
    }

    // ---- Move along path ----
    if (!ai.path || ai.pathIdx >= ai.path.length) {
      // Arrived or no path — start pause
      ai.pauseTimer = SKELD_GAME.BOT_TASK_PAUSE_MIN +
        Math.floor(Math.random() * (SKELD_GAME.BOT_TASK_PAUSE_MAX - SKELD_GAME.BOT_TASK_PAUSE_MIN));
      bot.moving = false;
      bot.vx = 0;
      bot.vy = 0;
      return;
    }

    this._moveBotAlongPath(bot, ai);
  },


  // ---- Pick a random room destination for bot ----
  _pickBotDestination(participant) {
    const ai = participant._aiState;
    const bot = participant.entity;
    if (!ai || !bot) return;

    const roomKeys = Object.keys(SKELD_GAME.ROOM_CENTERS);
    // Pick a random room that isn't the current target
    let attempts = 0;
    let targetKey;
    do {
      targetKey = roomKeys[Math.floor(Math.random() * roomKeys.length)];
      attempts++;
    } while (targetKey === ai.targetRoom && attempts < 5);

    ai.targetRoom = targetKey;
    const target = SKELD_GAME.ROOM_CENTERS[targetKey];

    // Add some randomness to target position (±3 tiles)
    const jitterX = Math.floor(Math.random() * 7) - 3;
    const jitterY = Math.floor(Math.random() * 7) - 3;
    let destTX = target.tx + jitterX;
    let destTY = target.ty + jitterY;

    // Clamp to level bounds
    if (level) {
      destTX = Math.max(2, Math.min(level.widthTiles - 3, destTX));
      destTY = Math.max(2, Math.min(level.heightTiles - 3, destTY));
    }

    // Ensure destination is walkable — if not, fall back to room center
    if (typeof isSolid === 'function' && isSolid(destTX, destTY)) {
      destTX = target.tx;
      destTY = target.ty;
    }

    // BFS pathfind
    const botTX = Math.floor(bot.x / TILE);
    const botTY = Math.floor(bot.y / TILE);

    if (typeof bfsPath === 'function') {
      ai.path = bfsPath(botTX, botTY, destTX, destTY, SKELD_GAME.BOT_PATH_LIMIT);
    } else {
      ai.path = null;
    }
    ai.pathIdx = 0;
    ai.stuckTimer = 0;

    // If pathfind failed, just pause and try again later
    if (!ai.path) {
      ai.pauseTimer = 60; // 1s before retry
    }
  },


  // ===================== BOT MOVEMENT (player-style AABB) =====================
  // Copied from HideSeekSystem._moveBotAlongPath — exact same collision rules

  _moveBotAlongPath(bot, ai) {
    const path = ai.path;

    if (!path || path.length === 0) {
      bot.vx = 0; bot.vy = 0; bot.moving = false;
      return;
    }
    if (ai.pathIdx >= path.length) {
      bot.vx = 0; bot.vy = 0; bot.moving = false;
      return;
    }

    // Get target tile center
    const step = path[ai.pathIdx];
    const targetX = step.x * TILE + TILE / 2;
    const targetY = step.y * TILE + TILE / 2;

    // Direction to target
    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If within one frame of reaching this step, snap and advance
    if (dist <= bot.speed) {
      bot.x = targetX;
      bot.y = targetY;
      ai.pathIdx++;
      if (ai.pathIdx >= path.length) {
        bot.vx = 0; bot.vy = 0; bot.moving = false;
        return;
      }
      this._moveBotAlongPath(bot, ai);
      return;
    }

    // Normalize direction and set velocity
    const ndx = dx / dist;
    const ndy = dy / dist;
    bot.vx = ndx * bot.speed;
    bot.vy = ndy * bot.speed;

    // ---- Player-style AABB collision ----
    const hw = GAME_CONFIG.PLAYER_WALL_HW;
    const nx = bot.x + bot.vx;
    const ny = bot.y + bot.vy;

    // X axis
    let canX = true;
    {
      const cL = Math.floor((nx - hw) / TILE);
      const cR = Math.floor((nx + hw) / TILE);
      const rT = Math.floor((bot.y - hw) / TILE);
      const rB = Math.floor((bot.y + hw) / TILE);
      if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) canX = false;
    }
    if (canX) bot.x = nx;

    // Y axis (use updated X)
    let canY = true;
    {
      const cL = Math.floor((bot.x - hw) / TILE);
      const cR = Math.floor((bot.x + hw) / TILE);
      const rT = Math.floor((ny - hw) / TILE);
      const rB = Math.floor((ny + hw) / TILE);
      if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) canY = false;
    }
    if (canY) bot.y = ny;

    // Corner unstick — same 2px nudge as player
    if (!canX && !canY && (bot.vx !== 0 || bot.vy !== 0)) {
      const nudge = 2;
      for (const [ndx2, ndy2] of [[nudge,0],[-nudge,0],[0,nudge],[0,-nudge]]) {
        const tx = bot.x + ndx2, ty = bot.y + ndy2;
        const tL = Math.floor((tx - hw) / TILE);
        const tR = Math.floor((tx + hw) / TILE);
        const tT = Math.floor((ty - hw) / TILE);
        const tB = Math.floor((ty + hw) / TILE);
        if (!isSolid(tL, tT) && !isSolid(tR, tT) && !isSolid(tL, tB) && !isSolid(tR, tB)) {
          bot.x = tx; bot.y = ty; break;
        }
      }
    }

    // Facing direction
    if (Math.abs(dx) > Math.abs(dy)) {
      bot.dir = dx > 0 ? 3 : 2;
    } else {
      bot.dir = dy > 0 ? 0 : 1;
    }

    bot.moving = true;
    bot.frame += 0.15;
  },


  // ===================== FREEZE CHECK =====================
  isPlayerFrozen() {
    const sk = SkeldState;
    // Freeze player during meeting, voting, ejection phases
    return sk.phase === 'meeting' || sk.phase === 'voting' || sk.phase === 'ejecting';
  },


  // ===================== END MATCH =====================
  endMatch() {
    const sk = SkeldState;

    // Reset all state to defaults
    sk.phase = 'idle';
    sk.phaseTimer = 0;
    sk.playerRole = null;
    sk.participants = [];
    sk.bodies = [];
    sk.killCooldown = 0;
    sk.sabotage = { active: null, timer: 0, cooldown: 0 };
    sk.meeting = { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 };
    sk.ejection = { name: null, wasImpostor: false, timer: 0 };
    sk.taskProgress = { done: 0, total: 0 };

    // Return to lobby
    if (typeof enterLevel === 'function') {
      enterLevel(SKELD_GAME.RETURN_LEVEL, SKELD_GAME.RETURN_TX, SKELD_GAME.RETURN_TY);
    }
  },
};
