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


  // ===================== REPORT + MEETING =====================

  // Find nearest body within report range
  getNearestReportableBody() {
    const mk = MafiaState;
    if (mk.phase !== 'playing' || mk.playerIsGhost) return null;

    let nearest = null;
    let nearestDist = MAFIA_GAME.REPORT_RANGE;

    for (const body of mk.bodies) {
      const dx = body.x - player.x;
      const dy = body.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = body;
      }
    }
    return nearest;
  },

  // Check if player can call an emergency meeting (no proximity check — interactable handles that)
  canCallEmergency() {
    const mk = MafiaState;
    if (mk.phase !== 'playing' || mk.playerIsGhost) return false;

    const localP = this.getLocalPlayer();
    if (!localP || !localP.alive) return false;

    // 1 emergency per player per match
    if (localP.emergenciesUsed >= 1) return false;

    return true;
  },

  // Report a body → start meeting
  report(bodyId) {
    const mk = MafiaState;
    if (mk.phase !== 'playing' || mk.playerIsGhost) return false;

    const body = mk.bodies.find(b => b.id === bodyId);
    if (!body) return false;

    // Distance check
    const dx = body.x - player.x;
    const dy = body.y - player.y;
    if (Math.sqrt(dx * dx + dy * dy) > MAFIA_GAME.REPORT_RANGE) return false;

    const localP = this.getLocalPlayer();
    this._startMeeting(localP ? localP.name : 'Player', 'report');
    return true;
  },

  // Try to report the nearest body
  tryReport() {
    const body = this.getNearestReportableBody();
    if (!body) return false;
    return this.report(body.id);
  },

  // Call emergency meeting at cafeteria button
  callEmergencyMeeting() {
    const mk = MafiaState;
    if (!this.canCallEmergency()) return false;

    const localP = this.getLocalPlayer();
    if (localP) localP.emergenciesUsed++;

    this._startMeeting(localP ? localP.name : 'Player', 'emergency');
    return true;
  },

  // Internal: start a meeting (report or emergency)
  _startMeeting(callerName, type) {
    const mk = MafiaState;

    // Clear meeting chat and reset to vote view
    if (typeof _meetingChatMessages !== 'undefined') {
      _meetingChatMessages.length = 0;
    }
    if (typeof _meetingShowChat !== 'undefined') {
      _meetingShowChat = false;
    }
    if (typeof _voteConfirmTarget !== 'undefined') {
      _voteConfirmTarget = null;
    }

    mk.phase = 'meeting';
    mk.meeting = {
      caller: callerName,
      type: type,  // 'report' | 'emergency'
      votes: {},
      discussionTimer: MAFIA_GAME.DISCUSSION_TIME,
      votingTimer: MAFIA_GAME.VOTING_TIME,
    };

    // Reset all votes
    for (const p of mk.participants) {
      p.votedFor = null;
    }

    // Teleport everyone to spawn (cafeteria)
    const mapData = this._getMapData();
    if (mapData) {
      const spawn = mapData.SPAWN;
      const cx = spawn.tx * TILE + TILE / 2;
      const cy = spawn.ty * TILE + TILE / 2;

      for (let i = 0; i < mk.participants.length; i++) {
        const p = mk.participants[i];
        if (!p.alive) continue;
        const offsetX = ((i % 5) - 2) * 40;
        const offsetY = (Math.floor(i / 5) - 0.5) * 40;
        p.entity.x = cx + offsetX;
        p.entity.y = cy + offsetY;
        p.entity.vx = 0;
        p.entity.vy = 0;
        p.entity.moving = false;
      }
    }

    // Stop player movement
    player.vx = 0;
    player.vy = 0;
  },

  // Player votes for a participant (or 'skip')
  castVote(targetId) {
    const mk = MafiaState;
    if (mk.phase !== 'voting') return false;

    const localP = this.getLocalPlayer();
    if (!localP || !localP.alive || localP.votedFor !== null) return false;

    localP.votedFor = targetId; // participant id or 'skip'
    mk.meeting.votes[localP.id] = targetId;

    // Check if all alive players have voted → end voting early
    this._checkAllVoted();
    return true;
  },

  // Bot voting (random: mostly random crewmate, small chance to skip)
  _botVote(participant) {
    const mk = MafiaState;
    if (participant.votedFor !== null) return;

    // 20% chance to skip
    if (Math.random() < 0.2) {
      participant.votedFor = 'skip';
      mk.meeting.votes[participant.id] = 'skip';
    } else {
      // Vote for a random alive player (not self)
      const candidates = mk.participants.filter(p => p.alive && p.id !== participant.id);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        participant.votedFor = target.id;
        mk.meeting.votes[participant.id] = target.id;
      } else {
        participant.votedFor = 'skip';
        mk.meeting.votes[participant.id] = 'skip';
      }
    }
  },

  _checkAllVoted() {
    const mk = MafiaState;
    const alivePlayers = mk.participants.filter(p => p.alive);
    const allVoted = alivePlayers.every(p => p.votedFor !== null);
    if (allVoted) {
      this._tallyVotes();
    }
  },

  _tallyVotes() {
    const mk = MafiaState;

    // Count votes
    const voteCounts = {};
    let skipCount = 0;

    for (const p of mk.participants) {
      if (!p.alive || p.votedFor === null) continue;
      if (p.votedFor === 'skip') {
        skipCount++;
      } else {
        voteCounts[p.votedFor] = (voteCounts[p.votedFor] || 0) + 1;
      }
    }

    // Find most voted
    let maxVotes = skipCount;
    let ejectedId = null; // null means skip wins
    let tie = false;

    for (const [id, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        ejectedId = id;
        tie = false;
      } else if (count === maxVotes && count > 0) {
        tie = true;
      }
    }

    // Tie or skip → no ejection
    if (tie || ejectedId === null) {
      mk.ejection = {
        name: null,
        wasImpostor: false,
        timer: MAFIA_GAME.EJECTION_TIME,
        message: 'No one was ejected. (Skipped)',
      };
    } else {
      const ejected = mk.participants.find(p => p.id === ejectedId);
      if (ejected) {
        ejected.alive = false;
        mk.ejection = {
          name: ejected.name,
          wasImpostor: ejected.role === 'impostor',
          timer: MAFIA_GAME.EJECTION_TIME,
          message: ejected.name + (ejected.role === 'impostor' ? ' was The Impostor.' : ' was not The Impostor.'),
        };
        // If ejected player is local player, set ghost
        if (ejected.isLocal) {
          mk.playerIsGhost = true;
        }
      }
    }

    mk.phase = 'ejecting';
  },

  // After ejection animation finishes → return to playing
  _endEjection() {
    const mk = MafiaState;

    // Clear all bodies
    mk.bodies = [];

    // Reset kill cooldown
    mk.killCooldown = MAFIA_GAME.KILL_COOLDOWN;

    // Return to playing
    mk.phase = 'playing';
    mk.meeting = { caller: null, type: null, votes: {}, discussionTimer: 0, votingTimer: 0 };
    mk.ejection = { name: null, wasImpostor: false, timer: 0 };
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
    } else if (mk.phase === 'meeting') {
      this._tickMeeting();
    } else if (mk.phase === 'voting') {
      this._tickVoting();
    } else if (mk.phase === 'ejecting') {
      this._tickEjecting();
    }
  },


  // ---- Playing phase tick ----
  _tickPlaying() {
    const mk = MafiaState;

    // Tick kill cooldown
    if (mk.killCooldown > 0) mk.killCooldown--;
  },

  // ---- Meeting (discussion) phase tick ----
  _tickMeeting() {
    const mk = MafiaState;

    mk.meeting.discussionTimer--;

    // Bots send chat messages occasionally during discussion
    if (typeof _meetingChatMessages !== 'undefined' && Math.random() < 0.003) {
      const aliveBots = mk.participants.filter(p => p.isBot && p.alive);
      if (aliveBots.length > 0) {
        const bot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
        const phrases = [
          'Where?', 'I was in Electrical', 'I saw nothing', 'Who?',
          'I was doing tasks', 'Trust me', 'Skip?', 'Seems sus',
          'I was in MedBay', 'Not me', 'I was in Security watching cams',
          'Vote them out', 'Idk who it is', 'I was with someone',
          'Lets just skip', 'Anyone have proof?', 'I was in Navigation',
        ];
        const text = phrases[Math.floor(Math.random() * phrases.length)];
        _meetingChatMessages.push({ name: bot.name, text: text, color: bot.color ? bot.color.body : '#aaa', time: Date.now() });
      }
    }

    if (mk.meeting.discussionTimer <= 0) {
      mk.phase = 'voting';
    }
  },

  // ---- Voting phase tick ----
  _tickVoting() {
    const mk = MafiaState;

    mk.meeting.votingTimer--;

    // Bots vote at random times during voting phase
    const aliveBots = mk.participants.filter(p => p.isBot && p.alive && p.votedFor === null);
    for (const bot of aliveBots) {
      // Each bot has a small chance per frame to vote (spread out naturally)
      if (Math.random() < 0.008) {
        this._botVote(bot);
      }
    }

    // Timer expired → force remaining votes as skip
    if (mk.meeting.votingTimer <= 0) {
      for (const p of mk.participants) {
        if (p.alive && p.votedFor === null) {
          p.votedFor = 'skip';
          mk.meeting.votes[p.id] = 'skip';
        }
      }
      this._tallyVotes();
    }

    // Check if all voted (may have been triggered by bot votes)
    this._checkAllVoted();
  },

  // ---- Ejecting phase tick ----
  _tickEjecting() {
    const mk = MafiaState;

    mk.ejection.timer--;
    if (mk.ejection.timer <= 0) {
      this._endEjection();
    }
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
    if (mk.phase === 'meeting' || mk.phase === 'voting' || mk.phase === 'ejecting') return true;
    // Freeze while emergency popup is open
    if (window._mafiaEmergencyPopup) return true;
    return false;
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
