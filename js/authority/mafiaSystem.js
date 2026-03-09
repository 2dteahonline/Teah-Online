// ===================== MAFIA SYSTEM (Among Us-style Gameplay) =====================
// Authority: state machine, bot AI, role assignment, kill/body/ghost for the Mafia game mode.
// Depends on: MAFIA_GAME (mafiaGameData.js), bfsPath/isSolid (mobSystem.js),
//             Scene/enterLevel (sceneManager.js), gameState globals (player, level, gameFrame)

// ---- Global State ----
window.MafiaState = {
  phase: 'idle',              // 'idle' | 'playing' | 'meeting' | 'voting' | 'ejecting' | 'post_match'
  phaseTimer: 0,
  playerRole: null,           // 'crewmate' | 'impostor'
  participants: [],           // array of participant objects (see startMatch)
  bodies: [],                 // [{ x, y, color, name, id }]
  killCooldown: 0,
  sabotage: { active: null, timer: 0, cooldown: 0 },
  meeting: { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 },
  ejection: { name: null, wasImpostor: false, timer: 0 },
  taskProgress: { done: 0, total: 0 },
  // Ghost state
  playerIsGhost: false,       // true after local player dies
};


// ===================== MafiaSystem =====================
window.MafiaSystem = {

  // ---- Participant helpers ----
  getLocalPlayer() {
    return MafiaState.participants.find(p => p.isLocal) || null;
  },
  getAlivePlayers() {
    return MafiaState.participants.filter(p => p.alive);
  },
  getAliveCrewmates() {
    return MafiaState.participants.filter(p => p.alive && p.role === 'crewmate');
  },
  getAliveImpostors() {
    return MafiaState.participants.filter(p => p.alive && p.role === 'impostor');
  },
  getBots() {
    return MafiaState.participants.filter(p => p.isBot);
  },


  // ---- Get current map data from MAFIA_GAME.MAPS ----
  _getMapData() {
    if (!level || !level.id) return null;
    return MAFIA_GAME.MAPS[level.id] || null;
  },


  // ===================== START MATCH =====================
  startMatch() {
    const mk = MafiaState;
    const mapData = this._getMapData();
    if (!mapData) return;

    mobs.length = 0;

    // Shuffle colors
    const colorPool = MAFIA_GAME.COLORS.slice();
    for (let i = colorPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
    }

    const spawn = mapData.SPAWN;
    const participants = [];

    // Player — always crewmate (use /role to switch for testing)
    mk.playerRole = 'crewmate';
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
      _aiState: null,
    });

    player.x = spawn.tx * TILE + TILE / 2;
    player.y = spawn.ty * TILE + TILE / 2;
    player.vx = 0;
    player.vy = 0;

    // All bots are crewmate (use /role to test impostor features)
    for (let i = 0; i < MAFIA_GAME.BOT_COUNT; i++) {
      const color = colorPool[i + 1];

      const offsetX = ((i % 4) - 1.5) * 30;
      const offsetY = (Math.floor(i / 4) - 0.5) * 30;

      const bot = {
        x: spawn.tx * TILE + TILE / 2 + offsetX,
        y: spawn.ty * TILE + TILE / 2 + offsetY,
        vx: 0,
        vy: 0,
        hp: -1,
        maxHp: -1,
        speed: MAFIA_GAME.BOT_SPEED,
        type: 'mafia_bot',
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
        role: 'crewmate',
        entity: bot,
        isBot: true,
        isLocal: false,
        alive: true,
        votedFor: null,
        emergenciesUsed: 0,
        color: color,
        _aiState: {
          targetRoom: null,
          path: null,
          pathIdx: 0,
          pauseTimer: 0,
          stuckTimer: 0,
          lastX: 0,
          lastY: 0,
        },
      });
    }

    mk.participants = participants;
    mk.phase = 'playing';
    mk.phaseTimer = 0;
    mk.bodies = [];
    mk.killCooldown = MAFIA_GAME.KILL_COOLDOWN;
    mk.playerIsGhost = false;
    mk.sabotage = { active: null, timer: 0, cooldown: 0 };
    mk.meeting = { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 };
    mk.ejection = { name: null, wasImpostor: false, timer: 0 };
    mk.taskProgress = { done: 0, total: 0 };

    if (typeof SkeldTasks !== 'undefined' && typeof SkeldTasks.reset === 'function') {
      SkeldTasks.reset();
    }
  },


  // ===================== ROLE COMMAND =====================
  // /role impostor  or  /role crewmate
  setRole(roleName) {
    const mk = MafiaState;
    if (mk.phase === 'idle') return;

    const role = roleName.toLowerCase();
    if (role !== 'impostor' && role !== 'crewmate') return;

    mk.playerRole = role;
    const localP = this.getLocalPlayer();
    if (localP) localP.role = role;

    // Reset kill cooldown when switching to impostor
    if (role === 'impostor') {
      mk.killCooldown = 0;
    }
  },


  // ===================== KILL SYSTEM =====================

  // Find nearest alive crewmate within kill range (for impostor player)
  getNearestKillTarget() {
    const mk = MafiaState;
    if (mk.playerRole !== 'impostor' || mk.playerIsGhost) return null;
    if (mk.killCooldown > 0) return null;

    let nearest = null;
    let nearestDist = MAFIA_GAME.KILL_RANGE;

    for (const p of mk.participants) {
      if (p.isLocal || !p.alive || p.role === 'impostor') continue;
      const dx = p.entity.x - player.x;
      const dy = p.entity.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = p;
      }
    }

    return nearest;
  },

  // Execute a kill on a target participant
  kill(targetId) {
    const mk = MafiaState;
    if (mk.playerRole !== 'impostor' || mk.playerIsGhost) return false;
    if (mk.killCooldown > 0) return false;

    const target = mk.participants.find(p => p.id === targetId);
    if (!target || !target.alive || target.role === 'impostor') return false;

    // Distance check
    const dx = target.entity.x - player.x;
    const dy = target.entity.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > MAFIA_GAME.KILL_RANGE) return false;

    // Kill the target
    target.alive = false;

    // Spawn body at target's location
    mk.bodies.push({
      x: target.entity.x,
      y: target.entity.y,
      color: target.color,
      name: target.name,
      id: target.id,
    });

    // Teleport player to the kill location (Among Us snap)
    player.x = target.entity.x;
    player.y = target.entity.y;

    // Reset cooldown
    mk.killCooldown = MAFIA_GAME.KILL_COOLDOWN;

    // Visual feedback
    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({ x: target.entity.x, y: target.entity.y, life: 25, type: 'blood_slash', dmg: 0 });
    }

    return true;
  },

  // Try to kill nearest target (called from input)
  tryKill() {
    const target = this.getNearestKillTarget();
    if (!target) return false;
    return this.kill(target.id);
  },


  // ===================== MAIN TICK =====================
  tick() {
    const mk = MafiaState;

    if (mk.phase === 'idle') {
      this.startMatch();
      return;
    }

    if (mk.phase === 'playing') {
      this._tickPlaying();
    }
  },


  // ---- Playing phase tick ----
  _tickPlaying() {
    const mk = MafiaState;

    // Tick kill cooldown
    if (mk.killCooldown > 0) mk.killCooldown--;
  },


  // ===================== BOT AI — CREWMATE =====================
  _tickBotCrewmate(participant) {
    const ai = participant._aiState;
    const bot = participant.entity;
    if (!ai || !bot) return;

    if (ai.pauseTimer > 0) {
      ai.pauseTimer--;
      bot.moving = false;
      bot.vx = 0;
      bot.vy = 0;
      if (ai.pauseTimer <= 0) {
        this._pickBotDestination(participant);
      }
      return;
    }

    const dxLast = bot.x - (ai.lastX || 0);
    const dyLast = bot.y - (ai.lastY || 0);
    if (Math.abs(dxLast) < 2 && Math.abs(dyLast) < 2) {
      ai.stuckTimer = (ai.stuckTimer || 0) + 1;
    } else {
      ai.stuckTimer = 0;
    }
    ai.lastX = bot.x;
    ai.lastY = bot.y;

    if (ai.stuckTimer > 90) {
      ai.stuckTimer = 0;
      this._pickBotDestination(participant);
      return;
    }

    if (!ai.path || ai.pathIdx >= ai.path.length) {
      ai.pauseTimer = MAFIA_GAME.BOT_TASK_PAUSE_MIN +
        Math.floor(Math.random() * (MAFIA_GAME.BOT_TASK_PAUSE_MAX - MAFIA_GAME.BOT_TASK_PAUSE_MIN));
      bot.moving = false;
      bot.vx = 0;
      bot.vy = 0;
      return;
    }

    this._moveBotAlongPath(bot, ai);
  },

  _pickBotDestination(participant) {
    const ai = participant._aiState;
    const bot = participant.entity;
    if (!ai || !bot) return;

    const mapData = this._getMapData();
    if (!mapData) return;

    const roomKeys = Object.keys(mapData.ROOM_CENTERS);
    let attempts = 0;
    let targetKey;
    do {
      targetKey = roomKeys[Math.floor(Math.random() * roomKeys.length)];
      attempts++;
    } while (targetKey === ai.targetRoom && attempts < 5);

    ai.targetRoom = targetKey;
    const target = mapData.ROOM_CENTERS[targetKey];

    const jitterX = Math.floor(Math.random() * 7) - 3;
    const jitterY = Math.floor(Math.random() * 7) - 3;
    let destTX = target.tx + jitterX;
    let destTY = target.ty + jitterY;

    if (level) {
      destTX = Math.max(2, Math.min(level.widthTiles - 3, destTX));
      destTY = Math.max(2, Math.min(level.heightTiles - 3, destTY));
    }

    if (typeof isSolid === 'function' && isSolid(destTX, destTY)) {
      destTX = target.tx;
      destTY = target.ty;
    }

    const botTX = Math.floor(bot.x / TILE);
    const botTY = Math.floor(bot.y / TILE);

    if (typeof bfsPath === 'function') {
      ai.path = bfsPath(botTX, botTY, destTX, destTY, MAFIA_GAME.BOT_PATH_LIMIT);
    } else {
      ai.path = null;
    }
    ai.pathIdx = 0;
    ai.stuckTimer = 0;

    if (!ai.path) {
      ai.pauseTimer = 60;
    }
  },


  // ===================== BOT MOVEMENT =====================
  _moveBotAlongPath(bot, ai) {
    const path = ai.path;

    if (!path || path.length === 0 || ai.pathIdx >= path.length) {
      bot.vx = 0; bot.vy = 0; bot.moving = false;
      return;
    }

    const step = path[ai.pathIdx];
    const targetX = step.x * TILE + TILE / 2;
    const targetY = step.y * TILE + TILE / 2;

    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

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

    const ndx = dx / dist;
    const ndy = dy / dist;
    bot.vx = ndx * bot.speed;
    bot.vy = ndy * bot.speed;

    const hw = GAME_CONFIG.PLAYER_WALL_HW;
    const nx = bot.x + bot.vx;
    const ny = bot.y + bot.vy;

    let canX = true;
    {
      const cL = Math.floor((nx - hw) / TILE);
      const cR = Math.floor((nx + hw) / TILE);
      const rT = Math.floor((bot.y - hw) / TILE);
      const rB = Math.floor((bot.y + hw) / TILE);
      if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) canX = false;
    }
    if (canX) bot.x = nx;

    let canY = true;
    {
      const cL = Math.floor((bot.x - hw) / TILE);
      const cR = Math.floor((bot.x + hw) / TILE);
      const rT = Math.floor((ny - hw) / TILE);
      const rB = Math.floor((ny + hw) / TILE);
      if (isSolid(cL, rT) || isSolid(cR, rT) || isSolid(cL, rB) || isSolid(cR, rB)) canY = false;
    }
    if (canY) bot.y = ny;

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
    const mk = MafiaState;
    return mk.phase === 'meeting' || mk.phase === 'voting' || mk.phase === 'ejecting';
  },


  // ===================== END MATCH =====================
  endMatch() {
    const mk = MafiaState;

    mk.phase = 'idle';
    mk.phaseTimer = 0;
    mk.playerRole = null;
    mk.participants = [];
    mk.bodies = [];
    mk.killCooldown = 0;
    mk.playerIsGhost = false;
    mk.sabotage = { active: null, timer: 0, cooldown: 0 };
    mk.meeting = { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 };
    mk.ejection = { name: null, wasImpostor: false, timer: 0 };
    mk.taskProgress = { done: 0, total: 0 };

    if (typeof enterLevel === 'function') {
      enterLevel(MAFIA_GAME.RETURN_LEVEL, MAFIA_GAME.RETURN_TX, MAFIA_GAME.RETURN_TY);
    }
  },
};
