// ===================== HIDE & SEEK SYSTEM =====================
// Authority: state machine, bot AI, tag detection for 1v1 Hide & Seek mode.
// Depends on: HIDESEEK (hideSeekData.js), bfsPath/positionClear/isSolid (mobSystem.js),
//             enterLevel (sceneManager.js), gameState globals (player, mobs, level, gameFrame)

// ---- Global State ----
window.HideSeekState = {
  phase: 'idle',          // 'idle' | 'role_select' | 'hide' | 'seek' | 'post_match'
  playerRole: null,       // 'hider' | 'seeker'
  botRole: null,          // 'hider' | 'seeker'
  phaseTimer: 0,          // frames remaining in current phase
  matchStartFrame: 0,     // frame when seek phase started (for timing stats)
  tagFrame: 0,            // frame when tag happened (0 = no tag yet)
  _postMatchFrame: 0,     // frame when post_match phase started (for E-key debounce)
  seekerWon: false,       // true if seeker tagged hider before time ran out
  botMob: null,           // reference to bot in mobs[]

  // Bot AI internal state
  _botTarget: null,       // {tx, ty} — current pathfind target tile
  _botPath: null,         // BFS path array of {x, y} tile coords
  _botPathIdx: 0,         // current index in _botPath
  _botHideSpot: null,     // {tx, ty} — chosen hiding destination (hider bot only)
  _seekerWaypoints: [],   // array of {tx, ty} — patrol waypoints (seeker bot only)
  _seekerWPIdx: 0,        // current waypoint index
  _visitedTiles: null,    // Set of "tx,ty" strings — tiles the seeker has been near
  _chasing: false,        // true when seeker bot has detected the hider
};

// ---- Default state snapshot for resets ----
const _HIDESEEK_DEFAULTS = {
  phase: 'idle',
  playerRole: null,
  botRole: null,
  phaseTimer: 0,
  matchStartFrame: 0,
  tagFrame: 0,
  seekerWon: false,
  botMob: null,
  _botTarget: null,
  _botPath: null,
  _botPathIdx: 0,
  _botHideSpot: null,
  _seekerWaypoints: [],
  _seekerWPIdx: 0,
  _visitedTiles: null,
  _chasing: false,
};


// ===================== HideSeekSystem =====================
window.HideSeekSystem = {

  // ---- Start a match ----
  // playerRole: 'hider' | 'seeker'
  startMatch(playerRole) {
    const hs = HideSeekState;

    // Assign roles
    hs.playerRole = playerRole;
    hs.botRole = (playerRole === 'hider') ? 'seeker' : 'hider';

    // Clear existing mobs
    mobs.length = 0;

    // Read spawn points from the current level
    const seekerSpawn = (level.spawns && level.spawns.seeker) || { tx: 5, ty: 5 };
    const hiderSpawn  = (level.spawns && level.spawns.hider)  || { tx: 10, ty: 10 };

    // Determine which spawn goes to whom
    const playerSpawn = (playerRole === 'seeker') ? seekerSpawn : hiderSpawn;
    const botSpawn    = (playerRole === 'seeker') ? hiderSpawn  : seekerSpawn;

    // Position player
    player.x = playerSpawn.tx * TILE + TILE / 2;
    player.y = playerSpawn.ty * TILE + TILE / 2;
    player.vx = 0;
    player.vy = 0;

    // Create bot mob
    const bot = {
      x: botSpawn.tx * TILE + TILE / 2,
      y: botSpawn.ty * TILE + TILE / 2,
      vx: 0,
      vy: 0,
      hp: 999,
      maxHp: 999,
      speed: HIDESEEK.BOT_SPEED,
      type: 'hideseek_bot',
      ai: null,
      _specials: [],
      _specialTimer: 9999,
      radius: GAME_CONFIG.MOB_RADIUS,
      wallHW: GAME_CONFIG.MOB_WALL_HW,
      hitboxR: 15,
      skin: '#4a6a8a',
      hair: '#2a3a4a',
      shirt: '#3a5a7a',
      pants: '#2a4a6a',
      name: (hs.botRole === 'hider') ? 'Hider Bot' : 'Seeker Bot',
      frame: 0,
      dir: 0,
      moving: false,
      contactRange: 0,
      killHeal: 0,
      goldReward: 0,
      isBoss: false,
    };
    mobs.push(bot);
    hs.botMob = bot;

    // Enter hide phase
    hs.phase = 'hide';
    hs.phaseTimer = HIDESEEK.HIDE_TIME;
    hs.seekerWon = false;
    hs.tagFrame = 0;
    hs.matchStartFrame = 0;
    hs._chasing = false;

    // Init bot AI for the hide phase
    if (hs.botRole === 'hider') {
      // Bot is the hider — it needs to run and hide
      this._initHiderBot();
    }
    // If bot is seeker, it stays frozen during hide phase (initialized when seek starts)
  },


  // ---- Main tick — called once per frame from the game loop ----
  tick() {
    const hs = HideSeekState;

    // Nothing to do in idle or role select
    if (hs.phase === 'idle' || hs.phase === 'role_select') return;

    // Decrement phase timer
    hs.phaseTimer--;

    // ---- Phase transitions ----
    if (hs.phase === 'hide' && hs.phaseTimer <= 0) {
      // Hide phase ended — switch to seek
      hs.phase = 'seek';
      hs.phaseTimer = HIDESEEK.SEEK_TIME;
      hs.matchStartFrame = (typeof gameFrame !== 'undefined') ? gameFrame : 0;

      // If bot is the seeker, initialize its patrol AI now
      if (hs.botRole === 'seeker') {
        this._initSeekerBot();
      }
      return; // skip AI tick this frame to let state settle
    }

    if (hs.phase === 'seek' && hs.phaseTimer <= 0) {
      // Seek phase timed out — hider wins (seeker failed to tag)
      hs.seekerWon = false;
      hs.phase = 'post_match';
      hs._postMatchFrame = (typeof gameFrame !== 'undefined') ? gameFrame : 0;
      hs.phaseTimer = HIDESEEK.POST_MATCH_TIME;
      return;
    }

    if (hs.phase === 'post_match' && hs.phaseTimer <= 0) {
      this.endMatch();
      return;
    }

    // ---- Bot AI tick during active phases ----
    if (hs.phase === 'hide' || hs.phase === 'seek') {
      this._tickBotAI();
    }

    // ---- Player-as-seeker tag check during seek phase ----
    if (hs.phase === 'seek' && hs.playerRole === 'seeker' && hs.botMob) {
      const dx = player.x - hs.botMob.x;
      const dy = player.y - hs.botMob.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= HIDESEEK.TAG_RANGE) {
        // Check if player is pressing interact to tag
        if (typeof InputIntent !== 'undefined' && InputIntent.interactPressed) {
          this.onTag();
        }
      }
    }
  },


  // ---- Tag event — seeker caught the hider ----
  onTag() {
    const hs = HideSeekState;
    hs.seekerWon = true;
    hs.tagFrame = (typeof gameFrame !== 'undefined') ? gameFrame : 0;
    hs.phase = 'post_match';
    hs._postMatchFrame = (typeof gameFrame !== 'undefined') ? gameFrame : 0;
    hs.phaseTimer = HIDESEEK.POST_MATCH_TIME;

    // Visual feedback at tag location
    if (typeof hitEffects !== 'undefined' && hs.botMob) {
      const tagX = (hs.playerRole === 'seeker') ? hs.botMob.x : player.x;
      const tagY = (hs.playerRole === 'seeker') ? hs.botMob.y : player.y;
      hitEffects.push({ x: tagX, y: tagY, life: 30, type: 'stun_stars', dmg: 0 });
    }
  },


  // ---- Check if the player should be movement-frozen ----
  isPlayerFrozen() {
    const hs = HideSeekState;

    // Seeker is frozen during hide phase (can't move while hider hides)
    if (hs.phase === 'hide' && hs.playerRole === 'seeker') return true;

    // Hider is frozen during seek phase (must stay in place while being sought)
    if (hs.phase === 'seek' && hs.playerRole === 'hider') return true;

    // Both frozen during role select and post-match
    if (hs.phase === 'role_select') return true;
    if (hs.phase === 'post_match') return true;

    return false;
  },


  // ---- End match and return to lobby ----
  endMatch() {
    // Clear all mobs
    mobs.length = 0;

    // Reset all HideSeekState fields to defaults
    const hs = HideSeekState;
    for (const key in _HIDESEEK_DEFAULTS) {
      if (key === '_seekerWaypoints') {
        hs._seekerWaypoints = [];
      } else if (key === '_visitedTiles') {
        hs._visitedTiles = null;
      } else {
        hs[key] = _HIDESEEK_DEFAULTS[key];
      }
    }

    // Return to lobby
    if (typeof enterLevel === 'function') {
      enterLevel('lobby_01', 40, 42);
    }
  },


  // ===================== BOT AI — HIDER =====================

  // Initialize the hider bot's path to a good hiding spot
  _initHiderBot() {
    const hs = HideSeekState;
    if (!hs.botMob || !level) return;

    const w = level.widthTiles;
    const h = level.heightTiles;

    // Determine seeker spawn position (where the seeker starts)
    const seekerSpawn = (level.spawns && level.spawns.seeker) || { tx: 5, ty: 5 };

    // Score all walkable tiles: prefer far from seeker + near walls (corners)
    const candidates = [];
    for (let ty = 1; ty < h - 1; ty++) {
      for (let tx = 1; tx < w - 1; tx++) {
        if (typeof isSolid === 'function' && isSolid(tx, ty)) continue;

        // Count adjacent walls (N, S, E, W)
        let adjWalls = 0;
        if (isSolid(tx - 1, ty)) adjWalls++;
        if (isSolid(tx + 1, ty)) adjWalls++;
        if (isSolid(tx, ty - 1)) adjWalls++;
        if (isSolid(tx, ty + 1)) adjWalls++;

        // Manhattan distance from seeker spawn
        const manhattan = Math.abs(tx - seekerSpawn.tx) + Math.abs(ty - seekerSpawn.ty);

        // Score: distance matters most, walls give a bonus
        const score = manhattan * 2 + adjWalls * 15;
        candidates.push({ tx, ty, score });
      }
    }

    // Sort by score descending (best spots first)
    candidates.sort((a, b) => b.score - a.score);

    // Pick randomly from the top 5
    const topN = Math.min(5, candidates.length);
    if (topN === 0) return; // no walkable tiles (shouldn't happen)
    const pick = candidates[Math.floor(Math.random() * topN)];
    hs._botHideSpot = { tx: pick.tx, ty: pick.ty };

    // BFS from bot's current tile to the hiding spot
    const botTX = Math.floor(hs.botMob.x / TILE);
    const botTY = Math.floor(hs.botMob.y / TILE);

    if (typeof bfsPath === 'function') {
      hs._botPath = bfsPath(botTX, botTY, pick.tx, pick.ty);
    } else {
      hs._botPath = null;
    }
    hs._botPathIdx = 0;
    hs._botTarget = { tx: pick.tx, ty: pick.ty };
  },


  // ===================== BOT AI — SEEKER =====================

  // Initialize the seeker bot's patrol waypoints
  _initSeekerBot() {
    const hs = HideSeekState;
    if (!level) return;

    const w = level.widthTiles;
    const h = level.heightTiles;
    const waypoints = [];

    // Create a grid of waypoints every 8 tiles, only on walkable tiles
    for (let ty = 4; ty < h - 2; ty += 8) {
      for (let tx = 4; tx < w - 2; tx += 8) {
        if (typeof isSolid === 'function' && !isSolid(tx, ty)) {
          waypoints.push({ tx, ty });
        }
      }
    }

    // Shuffle for variety (Fisher-Yates)
    for (let i = waypoints.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = waypoints[i];
      waypoints[i] = waypoints[j];
      waypoints[j] = tmp;
    }

    // Cap at ~12 waypoints
    if (waypoints.length > 12) waypoints.length = 12;

    hs._seekerWaypoints = waypoints;
    hs._seekerWPIdx = 0;
    hs._visitedTiles = new Set();
    hs._chasing = false;
  },


  // ===================== BOT AI — TICK =====================

  _tickBotAI() {
    const hs = HideSeekState;
    const bot = hs.botMob;
    if (!bot || bot.hp <= 0) return;

    // ---- Freeze logic ----
    // Hider bot is frozen during seek phase (like a real hider)
    if (hs.botRole === 'hider' && hs.phase === 'seek') {
      bot.moving = false;
      return;
    }
    // Seeker bot is frozen during hide phase (must wait)
    if (hs.botRole === 'seeker' && hs.phase === 'hide') {
      bot.moving = false;
      return;
    }

    // ---- Hider bot during hide phase: walk to hide spot ----
    if (hs.botRole === 'hider' && hs.phase === 'hide') {
      this._moveBotAlongPath(bot);
      return;
    }

    // ---- Seeker bot during seek phase: patrol + chase ----
    if (hs.botRole === 'seeker' && hs.phase === 'seek') {
      this._tickSeekerBot(bot);
      return;
    }
  },


  // ---- Seeker bot AI: patrol waypoints, detect hider, chase & tag ----
  _tickSeekerBot(bot) {
    const hs = HideSeekState;
    const detectRange = HIDESEEK.BOT_DETECT_RANGE * TILE;

    // Mark nearby tiles as visited
    const botTX = Math.floor(bot.x / TILE);
    const botTY = Math.floor(bot.y / TILE);
    if (hs._visitedTiles) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          hs._visitedTiles.add((botTX + dx) + ',' + (botTY + dy));
        }
      }
    }

    // ---- Detection: is the hider (player) within detect range? ----
    const hiderX = player.x;
    const hiderY = player.y;
    const hdx = hiderX - bot.x;
    const hdy = hiderY - bot.y;
    const hDist = Math.sqrt(hdx * hdx + hdy * hdy);

    if (hDist <= detectRange) {
      hs._chasing = true;
    }

    // ---- Chase mode: move directly toward hider ----
    if (hs._chasing) {
      // Check if hider moved out of extended range (lose tracking)
      if (hDist > detectRange * 2) {
        hs._chasing = false;
      } else {
        // Move directly toward hider
        if (hDist > 2) {
          const ndx = hdx / hDist;
          const ndy = hdy / hDist;
          const moveX = ndx * bot.speed;
          const moveY = ndy * bot.speed;
          this._applyBotMovement(bot, moveX, moveY);

          // Update facing direction
          if (Math.abs(hdx) > Math.abs(hdy)) {
            bot.dir = hdx > 0 ? 3 : 2; // right : left
          } else {
            bot.dir = hdy > 0 ? 0 : 1; // down : up
          }
          bot.moving = true;
          bot.frame += 0.15;
        }

        // Tag check: within TAG_RANGE → tag the hider
        if (hDist <= HIDESEEK.TAG_RANGE) {
          this.onTag();
        }
        return;
      }
    }

    // ---- Patrol mode: navigate through waypoints ----
    const wps = hs._seekerWaypoints;
    if (!wps || wps.length === 0) return;

    // Get current waypoint
    const wpIdx = hs._seekerWPIdx % wps.length;
    const wp = wps[wpIdx];
    const wpX = wp.tx * TILE + TILE / 2;
    const wpY = wp.ty * TILE + TILE / 2;

    // Check if we need a new path to this waypoint
    if (!hs._botPath || hs._botPathIdx >= (hs._botPath ? hs._botPath.length : 0) ||
        !hs._botTarget || hs._botTarget.tx !== wp.tx || hs._botTarget.ty !== wp.ty) {
      // Pathfind to waypoint
      if (typeof bfsPath === 'function') {
        hs._botPath = bfsPath(botTX, botTY, wp.tx, wp.ty);
      } else {
        hs._botPath = null;
      }
      hs._botPathIdx = 0;
      hs._botTarget = { tx: wp.tx, ty: wp.ty };
    }

    // Move along path
    this._moveBotAlongPath(bot);

    // Check if arrived at waypoint (within 1 tile)
    const distToWP = Math.sqrt((bot.x - wpX) * (bot.x - wpX) + (bot.y - wpY) * (bot.y - wpY));
    if (distToWP < TILE) {
      // Advance to next waypoint
      hs._seekerWPIdx++;
      hs._botPath = null; // clear path so next tick recalculates
      hs._botTarget = null;
    }
  },


  // ===================== BOT MOVEMENT =====================

  // Move bot along its current BFS path, respecting wall collision
  _moveBotAlongPath(bot) {
    const hs = HideSeekState;
    const path = hs._botPath;

    if (!path || path.length === 0) {
      bot.moving = false;
      return;
    }

    // Clamp path index
    if (hs._botPathIdx >= path.length) {
      bot.moving = false;
      return;
    }

    // Get target tile center
    const step = path[hs._botPathIdx];
    const targetX = step.x * TILE + TILE / 2;
    const targetY = step.y * TILE + TILE / 2;

    // Direction to target
    const dx = targetX - bot.x;
    const dy = targetY - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If close enough to this step, advance to the next
    if (dist < 4) {
      hs._botPathIdx++;
      if (hs._botPathIdx >= path.length) {
        bot.moving = false;
        return;
      }
      // Recurse to start moving toward next step immediately
      this._moveBotAlongPath(bot);
      return;
    }

    // Normalize and apply speed
    const ndx = dx / dist;
    const ndy = dy / dist;
    const moveX = ndx * bot.speed;
    const moveY = ndy * bot.speed;

    // Apply movement with wall collision
    this._applyBotMovement(bot, moveX, moveY);

    // Update facing direction based on movement
    if (Math.abs(dx) > Math.abs(dy)) {
      bot.dir = dx > 0 ? 3 : 2; // right : left
    } else {
      bot.dir = dy > 0 ? 0 : 1; // down : up
    }

    // Animate
    bot.moving = true;
    bot.frame += 0.15;
  },


  // Apply movement to a bot with AABB wall collision + sliding
  // Matches the mob collision pattern from mobSystem.js
  _applyBotMovement(bot, moveX, moveY) {
    if (typeof isSolid !== 'function') {
      // Fallback: no collision system loaded, move freely
      bot.x += moveX;
      bot.y += moveY;
      return;
    }

    const mhw = bot.wallHW || GAME_CONFIG.MOB_WALL_HW;
    const nx = bot.x + moveX;
    const ny = bot.y + moveY;
    let movedX = false;
    let movedY = false;

    // Try X axis
    let cL = Math.floor((nx - mhw) / TILE);
    let cR = Math.floor((nx + mhw) / TILE);
    let rT = Math.floor((bot.y - mhw) / TILE);
    let rB = Math.floor((bot.y + mhw) / TILE);
    if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
      bot.x = nx;
      movedX = true;
    }

    // Try Y axis (use updated X if it moved)
    cL = Math.floor((bot.x - mhw) / TILE);
    cR = Math.floor((bot.x + mhw) / TILE);
    rT = Math.floor((ny - mhw) / TILE);
    rB = Math.floor((ny + mhw) / TILE);
    if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
      bot.y = ny;
      movedY = true;
    }

    // Sliding: if blocked on one axis, nudge along the other
    if (!movedX && movedY) {
      const nudge = moveX > 0 ? 1.5 : -1.5;
      if (typeof positionClear === 'function') {
        if (positionClear(bot.x + nudge, bot.y, mhw)) bot.x += nudge;
        else if (positionClear(bot.x - nudge, bot.y, mhw)) bot.x -= nudge;
      }
    }
    if (movedX && !movedY) {
      const nudge = moveY > 0 ? 1.5 : -1.5;
      if (typeof positionClear === 'function') {
        if (positionClear(bot.x, bot.y + nudge, mhw)) bot.y += nudge;
        else if (positionClear(bot.x, bot.y - nudge, mhw)) bot.y -= nudge;
      }
    }

    // Fully stuck: try half-speed on each axis independently
    if (!movedX && !movedY) {
      const halfX = moveX * 0.5;
      const halfY = moveY * 0.5;
      const hxL = Math.floor((bot.x + halfX - mhw) / TILE);
      const hxR = Math.floor((bot.x + halfX + mhw) / TILE);
      const hyT = Math.floor((bot.y - mhw) / TILE);
      const hyB = Math.floor((bot.y + mhw) / TILE);
      if (!isSolid(hxL, hyT) && !isSolid(hxR, hyT) && !isSolid(hxL, hyB) && !isSolid(hxR, hyB)) {
        bot.x += halfX;
      } else {
        const hyL = Math.floor((bot.x - mhw) / TILE);
        const hyR = Math.floor((bot.x + mhw) / TILE);
        const hyT2 = Math.floor((bot.y + halfY - mhw) / TILE);
        const hyB2 = Math.floor((bot.y + halfY + mhw) / TILE);
        if (!isSolid(hyL, hyT2) && !isSolid(hyR, hyT2) && !isSolid(hyL, hyB2) && !isSolid(hyR, hyB2)) {
          bot.y += halfY;
        }
      }
    }
  },
};


// ===================== DEBUG COMMAND =====================
// Usage: _hideSeekDebug('seeker') or _hideSeekDebug('hider')
// Can be called from the console or from the /hideseek chat command

window._hideSeekDebug = function(role) {
  // Only allow from lobby or hide & seek map
  const inHideSeek = (typeof Scene !== 'undefined' && Scene.inHideSeek);
  const inLobby = (typeof Scene !== 'undefined' && Scene.inLobby);

  if (!inHideSeek && !inLobby) return;

  if (inLobby) {
    // Transition to the hide & seek map first
    if (typeof enterLevel === 'function') {
      const spawnTX = (level && level.spawns && level.spawns.seeker) ? level.spawns.seeker.tx : 5;
      const spawnTY = (level && level.spawns && level.spawns.seeker) ? level.spawns.seeker.ty : 5;
      enterLevel(HIDESEEK.MAP_ID, spawnTX, spawnTY);
    }
    // Wait a frame for level to load, then start match
    setTimeout(function() {
      HideSeekSystem.startMatch(role || 'seeker');
    }, 100);
  } else {
    HideSeekSystem.startMatch(role || 'seeker');
  }
};
