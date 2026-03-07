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
  _botStuckTimer: 0,      // frames the bot hasn't moved (stuck detection)
  _botLastX: 0,           // last known bot X position
  _botLastY: 0,           // last known bot Y position

  // Weapon save/restore
  _savedMelee: null,       // saved melee weapon data before match
  _savedSlot: 0,           // saved activeSlot before match

  // Hider bot retry
  _hiderRetries: 0,        // number of times hider re-picked a hiding spot
  _hiderCandidates: [],    // cached top hiding spot candidates
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
  _botStuckTimer: 0,
  _botLastX: 0,
  _botLastY: 0,
  _savedMelee: null,
  _savedSlot: 0,
  _hiderRetries: 0,
  _hiderCandidates: [],
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

    // ---- Save current weapon state & equip Seeking Baton ----
    if (typeof playerEquip !== 'undefined' && playerEquip.melee) {
      hs._savedMelee = Object.assign({}, playerEquip.melee);
    } else {
      hs._savedMelee = null;
    }
    hs._savedSlot = (typeof activeSlot !== 'undefined') ? activeSlot : 0;

    // Equip Seeking Baton for seekers
    if (playerRole === 'seeker' && typeof SEEKING_BATON !== 'undefined' && typeof applyMeleeStats === 'function') {
      applyMeleeStats(SEEKING_BATON);
      if (typeof activeSlot !== 'undefined') activeSlot = 1; // force melee slot
    }

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

      // Reset hider bot speed to normal (was boosted during hide phase)
      if (hs.botMob) hs.botMob.speed = HIDESEEK.BOT_SPEED;

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

    // Tag detection is handled by meleeSystem.js (Seeking Baton melee hit)
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
    const hs = HideSeekState;

    // ---- Restore saved weapon state ----
    if (hs._savedMelee && typeof applyMeleeStats === 'function') {
      applyMeleeStats(hs._savedMelee);
    } else if (typeof applyDefaultMelee === 'function') {
      applyDefaultMelee();
    }
    if (typeof activeSlot !== 'undefined') {
      activeSlot = hs._savedSlot || 0;
    }

    // Clear all mobs
    mobs.length = 0;

    // Reset all HideSeekState fields to defaults
    for (const key in _HIDESEEK_DEFAULTS) {
      if (key === '_seekerWaypoints') {
        hs._seekerWaypoints = [];
      } else if (key === '_visitedTiles') {
        hs._visitedTiles = null;
      } else if (key === '_hiderCandidates') {
        hs._hiderCandidates = [];
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

    // Speed boost so bot can reach far spots in time
    hs.botMob.speed = HIDESEEK.BOT_SPEED * 2.0;

    // ---- Collect ALL favorable hiding spots on the map ----
    // Favorable = tile with 1-2 cardinal openings (dead-ends, corners, tucked spots)
    const favorable = [];
    for (let ty = 2; ty < h - 2; ty++) {
      for (let tx = 2; tx < w - 2; tx++) {
        if (typeof isSolid === 'function' && isSolid(tx, ty)) continue;

        let openings = 0;
        if (!isSolid(tx - 1, ty)) openings++;
        if (!isSolid(tx + 1, ty)) openings++;
        if (!isSolid(tx, ty - 1)) openings++;
        if (!isSolid(tx, ty + 1)) openings++;

        // Dead-ends (1 opening) and corners (2 openings) are favorable
        if (openings <= 2) favorable.push({ tx, ty });
      }
    }

    // Cache all favorable spots (used for re-picks if stuck)
    hs._hiderCandidates = favorable;
    hs._hiderRetries = 0;

    // Pick a random one and pathfind to it
    this._pickHiderSpot();
  },

  // Pick a random favorable hiding spot and BFS pathfind to it
  _pickHiderSpot() {
    const hs = HideSeekState;
    if (!hs.botMob) return;

    const spots = hs._hiderCandidates;
    if (!spots || spots.length === 0) return;

    const botTX = Math.floor(hs.botMob.x / TILE);
    const botTY = Math.floor(hs.botMob.y / TILE);

    // Try up to 10 random picks to find one with a valid BFS path
    for (let attempt = 0; attempt < 10; attempt++) {
      const pick = spots[Math.floor(Math.random() * spots.length)];

      if (typeof bfsPath === 'function') {
        const path = bfsPath(botTX, botTY, pick.tx, pick.ty, 3000);
        if (path && path.length > 0) {
          hs._botHideSpot = { tx: pick.tx, ty: pick.ty };
          hs._botPath = path;
          hs._botPathIdx = 0;
          hs._botTarget = { tx: pick.tx, ty: pick.ty };
          return;
        }
      }
    }

    // Fallback: no valid path found, bot stays put
    hs._botPath = null;
    hs._botPathIdx = 0;
  },


  // ===================== BOT AI — SEEKER =====================

  // Initialize the seeker bot's patrol waypoints — room centers for systematic coverage
  _initSeekerBot() {
    const hs = HideSeekState;
    if (!level) return;

    // Pre-defined room centers based on the new organic hide_01 map layout
    // These cover all rooms, alcoves, and key corridor intersections
    const roomCenters = [
      // Northwest wing
      { tx: 7, ty: 6 },   // R1: seeker spawn
      { tx: 5, ty: 14 },  // R2: side room
      { tx: 17, ty: 4 },  // R3: upper room
      { tx: 16, ty: 12 }, // R4: connector room
      { tx: 3, ty: 20 },  // A1: NW alcove

      // North corridor & rooms
      { tx: 25, ty: 3 },  // R5: top nook
      { tx: 36, ty: 4 },  // R6: offset room
      { tx: 47, ty: 4 },  // R7: NE corner room
      { tx: 55, ty: 7 },  // R8: NE extension
      { tx: 61, ty: 6 },  // A2: NE dead-end
      { tx: 55, ty: 14 }, // R9: south of R8
      { tx: 42, ty: 11 }, // A9: nook

      // Central maze
      { tx: 27, ty: 15 }, // R10: central-north
      { tx: 37, ty: 14 }, // R11: central-NE
      { tx: 24, ty: 22 }, // R12: left-center
      { tx: 39, ty: 22 }, // R13: right-center
      { tx: 31, ty: 21 }, // R14: center hub
      { tx: 46, ty: 16 }, // R32: connector

      // West wing
      { tx: 5, ty: 27 },  // R15: mid-west
      { tx: 12, ty: 24 }, // R16: inner-west
      { tx: 3, ty: 33 },  // A3: west closet
      { tx: 11, ty: 31 }, // A10: inner-west nook

      // Southwest sprawl
      { tx: 5, ty: 39 },  // R17: SW room
      { tx: 14, ty: 37 }, // R18: adjacent
      { tx: 4, ty: 46 },  // R19: deep SW
      { tx: 10, ty: 47 }, // A4: SW closet
      { tx: 17, ty: 44 }, // R30: hidden south

      // South corridor & rooms
      { tx: 24, ty: 32 }, // R20: south-center-left
      { tx: 33, ty: 32 }, // R21: south-center-right
      { tx: 27, ty: 43 }, // R22: lower-center
      { tx: 25, ty: 49 }, // A5: bottom nook
      { tx: 35, ty: 40 }, // R31: south-mid

      // Southeast wing (hider spawn)
      { tx: 43, ty: 30 }, // R23: SE mid
      { tx: 47, ty: 38 }, // R24: SE room
      { tx: 55, ty: 37 }, // R25: deep east
      { tx: 57, ty: 45 }, // R26: hider spawn
      { tx: 63, ty: 44 }, // A6: east closet
      { tx: 55, ty: 51 }, // A7: south closet

      // East corridor
      { tx: 49, ty: 21 }, // R27: mid-east
      { tx: 57, ty: 23 }, // R28: far-east
      { tx: 63, ty: 23 }, // A8: far-east closet
      { tx: 48, ty: 28 }, // R29: east-south connector

      // Side extensions
      { tx: 69, ty: 17 }, // R33: far-east upper wing
      { tx: 71, ty: 24 }, // R34: far-east mid wing
      { tx: 76, ty: 24 }, // A11: far-east dead-end
      { tx: 35, ty: 50 }, // R35: south extension
      { tx: 40, ty: 53 }, // R36: deep south
      { tx: 45, ty: 55 }, // A12: south dead-end
      { tx: 4, ty: 54 },  // R37: deep NW room
      { tx: 10, ty: 54 }, // A13: NW side closet
      { tx: 16, ty: 50 }, // R38: mid-south pocket
      { tx: 22, ty: 52 }, // R39: south-center-left deep
      { tx: 64, ty: 36 }, // R40: east-south wing
      { tx: 68, ty: 42 }, // R41: east-south deep
      { tx: 72, ty: 42 }, // A14: east-south closet
    ];

    // Validate — only keep walkable waypoints
    const valid = roomCenters.filter(wp =>
      typeof isSolid === 'function' && !isSolid(wp.tx, wp.ty)
    );

    // Shuffle for variety
    for (let i = valid.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [valid[i], valid[j]] = [valid[j], valid[i]];
    }

    hs._seekerWaypoints = valid;
    hs._seekerWPIdx = 0;
    hs._visitedTiles = new Set();
    hs._chasing = false;
    hs._botStuckTimer = 0;
    hs._botLastX = 0;
    hs._botLastY = 0;
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
      // Stuck detection: if bot hasn't moved >2px in 60 frames, re-pick a spot
      const hdxL = bot.x - (hs._botLastX || bot.x);
      const hdyL = bot.y - (hs._botLastY || bot.y);
      if (Math.abs(hdxL) < 2 && Math.abs(hdyL) < 2) {
        hs._botStuckTimer = (hs._botStuckTimer || 0) + 1;
      } else {
        hs._botStuckTimer = 0;
      }
      hs._botLastX = bot.x;
      hs._botLastY = bot.y;

      // If stuck 60+ frames, re-pick a new random hiding spot
      if (hs._botStuckTimer > 60) {
        hs._botStuckTimer = 0;
        this._pickHiderSpot();
      }

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
    const detectRange = HIDESEEK.FOV_RADIUS * TILE; // use same FOV as player seeker

    const botTX = Math.floor(bot.x / TILE);
    const botTY = Math.floor(bot.y / TILE);

    // ---- Stuck detection: if bot hasn't moved >2px in 60 frames, skip to next waypoint ----
    const dxLast = bot.x - (hs._botLastX || 0);
    const dyLast = bot.y - (hs._botLastY || 0);
    if (Math.abs(dxLast) < 2 && Math.abs(dyLast) < 2) {
      hs._botStuckTimer = (hs._botStuckTimer || 0) + 1;
    } else {
      hs._botStuckTimer = 0;
    }
    hs._botLastX = bot.x;
    hs._botLastY = bot.y;

    // If stuck for 60+ frames, skip to next waypoint
    if (hs._botStuckTimer > 60) {
      hs._seekerWPIdx = ((hs._seekerWPIdx || 0) + 1);
      hs._botPath = null;
      hs._botTarget = null;
      hs._botStuckTimer = 0;
      hs._chasing = false;
    }

    // Mark nearby tiles as visited
    if (hs._visitedTiles) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          hs._visitedTiles.add((botTX + dx) + ',' + (botTY + dy));
        }
      }
    }

    // ---- Detection: is the hider (player) within detect range? ----
    const hdx = player.x - bot.x;
    const hdy = player.y - bot.y;
    const hDist = Math.sqrt(hdx * hdx + hdy * hdy);

    if (hDist <= detectRange) {
      hs._chasing = true;
    }

    // ---- Chase mode: BFS pathfind toward hider ----
    if (hs._chasing) {
      // Lose tracking if hider is very far away
      if (hDist > detectRange * 3) {
        hs._chasing = false;
        hs._botPath = null;
        hs._botTarget = null;
      } else {
        // Tag check: within TAG_RANGE → tag the hider
        if (hDist <= HIDESEEK.TAG_RANGE) {
          this.onTag();
          return;
        }

        // Re-pathfind to hider every 30 frames (hider is stationary but path may be stale)
        const hiderTX = Math.floor(player.x / TILE);
        const hiderTY = Math.floor(player.y / TILE);
        if (!hs._botPath || hs._botPathIdx >= hs._botPath.length ||
            !hs._botTarget || hs._botTarget.tx !== hiderTX || hs._botTarget.ty !== hiderTY) {
          if (typeof bfsPath === 'function') {
            hs._botPath = bfsPath(botTX, botTY, hiderTX, hiderTY, 3000);
          }
          hs._botPathIdx = 0;
          hs._botTarget = { tx: hiderTX, ty: hiderTY };
        }

        this._moveBotAlongPath(bot);
        return;
      }
    }

    // ---- Patrol mode: navigate through room waypoints ----
    const wps = hs._seekerWaypoints;
    if (!wps || wps.length === 0) return;

    // Get current waypoint (loop around)
    const wpIdx = (hs._seekerWPIdx || 0) % wps.length;
    const wp = wps[wpIdx];
    const wpX = wp.tx * TILE + TILE / 2;
    const wpY = wp.ty * TILE + TILE / 2;

    // Pathfind to waypoint if needed
    if (!hs._botPath || hs._botPathIdx >= (hs._botPath ? hs._botPath.length : 0) ||
        !hs._botTarget || hs._botTarget.tx !== wp.tx || hs._botTarget.ty !== wp.ty) {
      if (typeof bfsPath === 'function') {
        hs._botPath = bfsPath(botTX, botTY, wp.tx, wp.ty, 3000);
      }
      hs._botPathIdx = 0;
      hs._botTarget = { tx: wp.tx, ty: wp.ty };

      // If pathfind failed, skip this waypoint immediately
      if (!hs._botPath) {
        hs._seekerWPIdx = (hs._seekerWPIdx || 0) + 1;
        hs._botTarget = null;
        return;
      }
    }

    // Move along path
    this._moveBotAlongPath(bot);

    // Check if arrived at waypoint (within 1.5 tiles)
    const distToWP = Math.sqrt((bot.x - wpX) * (bot.x - wpX) + (bot.y - wpY) * (bot.y - wpY));
    if (distToWP < TILE * 1.5) {
      hs._seekerWPIdx = (hs._seekerWPIdx || 0) + 1;
      hs._botPath = null;
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
