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
  botMob: null,           // backward-compat shim (use participants[] for new code)
  participants: [],       // array of { id, role, entity, isBot, isLocal }

  // Bot AI internal state
  _botTarget: null,       // {tx, ty} — current pathfind target tile
  _botPath: null,         // BFS path array of {x, y} tile coords
  _botPathIdx: 0,         // current index in _botPath
  _botHideSpot: null,     // {tx, ty} — chosen hiding destination (hider bot only)
  _seekerWaypoints: [],   // array of {tx, ty} — patrol waypoints (seeker bot only)
  _seekerWPIdx: 0,        // current waypoint index
  _chasing: false,        // true when seeker bot has detected the hider
  _botStuckTimer: 0,      // frames the bot hasn't moved (stuck detection)
  _botLastX: 0,           // last known bot X position
  _botLastY: 0,           // last known bot Y position

  // Weapon save/restore
  _savedMelee: null,       // saved melee weapon data before match
  _savedSlot: 0,           // saved activeSlot before match

  // Match config
  _mapId: null,            // active map ID (defaults to HIDESEEK.MAP_ID)
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
  participants: [],
  _botTarget: null,
  _botPath: null,
  _botPathIdx: 0,
  _botHideSpot: null,
  _seekerWaypoints: [],
  _seekerWPIdx: 0,
  _chasing: false,
  _botStuckTimer: 0,
  _botLastX: 0,
  _botLastY: 0,
  _savedMelee: null,
  _savedSlot: 0,
  _mapId: null,
};


// ===================== HideSeekSystem =====================
window.HideSeekSystem = {

  // ---- Participant helpers (multiplayer-ready) ----
  getLocalPlayer() {
    return HideSeekState.participants.find(p => p.isLocal) || null;
  },
  getHiders() {
    return HideSeekState.participants.filter(p => p.role === 'hider');
  },
  getSeekers() {
    return HideSeekState.participants.filter(p => p.role === 'seeker');
  },
  getBots() {
    return HideSeekState.participants.filter(p => p.isBot);
  },

  // ---- Start a match ----
  // playerRole: 'hider' | 'seeker'
  startMatch(playerRole) {
    const hs = HideSeekState;

    // Reset UI toggles
    if (typeof _showBotOverlay !== 'undefined') _showBotOverlay = false;

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

    // Clear existing mobs (don't use mobs[] for the bot)
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

    // Create bot as standalone entity (NOT a mob — moves like a player)
    const bot = {
      x: botSpawn.tx * TILE + TILE / 2,
      y: botSpawn.ty * TILE + TILE / 2,
      vx: 0,
      vy: 0,
      hp: 999,
      maxHp: 999,
      speed: HIDESEEK.BOT_SPEED,
      type: 'hideseek_bot',
      skin: '#4a6a8a',
      hair: '#2a3a4a',
      shirt: '#3a5a7a',
      pants: '#2a4a6a',
      name: (hs.botRole === 'hider') ? 'Hider Bot' : 'Seeker Bot',
      frame: 0,
      dir: 0,
      moving: false,
      hitboxR: 15,
    };
    // Bot is NOT pushed to mobs[] — it's its own entity
    hs.botMob = bot;

    // Participant registry (multiplayer-ready)
    hs.participants = [
      { id: 'player', role: playerRole, entity: player, isBot: false, isLocal: true },
      { id: 'bot_0', role: hs.botRole, entity: bot, isBot: true, isLocal: false },
    ];

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


  // ---- Check if a participant should be movement-frozen ----
  // participantId: optional — defaults to local player (backward-compatible)
  isPlayerFrozen(participantId) {
    const hs = HideSeekState;
    const p = participantId
      ? hs.participants.find(pp => pp.id === participantId)
      : hs.participants.find(pp => pp.isLocal);
    const role = p ? p.role : hs.playerRole; // fallback for pre-registry callers

    if (hs.phase === 'hide' && role === 'seeker') return true;
    if (hs.phase === 'seek' && role === 'hider') return true;
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

    // Bot is not in mobs[] so no need to clear it — just null the reference

    // Clean up window globals (click detection regions)
    window._hsShowBotBtn = null;
    window._hsRoleButtons = null;
    window._hsReturnButton = null;

    // Reset all HideSeekState fields to defaults
    for (const key in _HIDESEEK_DEFAULTS) {
      if (key === '_seekerWaypoints' || key === 'participants') {
        hs[key] = [];
      } else {
        hs[key] = _HIDESEEK_DEFAULTS[key];
      }
    }

    // Return to lobby
    if (typeof enterLevel === 'function') {
      enterLevel(HIDESEEK.RETURN_LEVEL, HIDESEEK.RETURN_TX, HIDESEEK.RETURN_TY);
    }
  },


  // ===================== BOT AI — HIDER =====================

  // Initialize the hider bot — pick ONE favorable spot and commit to it
  _initHiderBot() {
    const hs = HideSeekState;
    if (!hs.botMob || !level) return;

    const w = level.widthTiles;
    const h = level.heightTiles;

    // Speed boost so bot can reach far spots in time
    hs.botMob.speed = HIDESEEK.BOT_SPEED * 2.0;

    // Get seeker spawn for distance scoring
    const seekerSpawn = (level.spawns && level.spawns.seeker) || { tx: 5, ty: 5 };

    const botTX = Math.floor(hs.botMob.x / TILE);
    const botTY = Math.floor(hs.botMob.y / TILE);

    // ---- Score every walkable tile for hiding quality ----
    const scored = [];
    for (let ty = 2; ty < h - 2; ty++) {
      for (let tx = 2; tx < w - 2; tx++) {
        if (typeof isSolid === 'function' && isSolid(tx, ty)) continue;

        // Count cardinal openings (4-dir)
        let cardinalOpen = 0;
        if (!isSolid(tx - 1, ty)) cardinalOpen++;
        if (!isSolid(tx + 1, ty)) cardinalOpen++;
        if (!isSolid(tx, ty - 1)) cardinalOpen++;
        if (!isSolid(tx, ty + 1)) cardinalOpen++;

        // Skip wide-open tiles (3-4 cardinal openings = hallway/room center)
        if (cardinalOpen >= 3) continue;

        // Count ALL 8-directional walls for "tucked-ness"
        let walls8 = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (isSolid(tx + dx, ty + dy)) walls8++;
          }
        }

        // Score: more surrounding walls = better hiding
        let score = walls8 * 3;

        // Dead-ends (1 opening) are premium hiding spots
        if (cardinalOpen === 1) score += 15;
        // Corners (2 openings) are good
        else if (cardinalOpen === 2) score += 5;

        // Distance from seeker spawn — farther is better
        const sdx = tx - seekerSpawn.tx;
        const sdy = ty - seekerSpawn.ty;
        const seekerDist = Math.sqrt(sdx * sdx + sdy * sdy);
        score += seekerDist * 0.5;

        scored.push({ tx, ty, score });
      }
    }

    // Sort by score descending, take top 20% as candidates
    scored.sort((a, b) => b.score - a.score);
    const topCount = Math.max(10, Math.floor(scored.length * 0.2));
    const candidates = scored.slice(0, topCount);

    // Pick randomly from top candidates, validate with BFS path
    // Shuffle candidates first for variety
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let i = 0; i < Math.min(candidates.length, 20); i++) {
      const pick = candidates[i];
      if (typeof bfsPath === 'function') {
        const path = bfsPath(botTX, botTY, pick.tx, pick.ty, 5000);
        if (path && path.length > 0) {
          hs._botHideSpot = { tx: pick.tx, ty: pick.ty };
          hs._botPath = path;
          hs._botPathIdx = 0;
          hs._botTarget = { tx: pick.tx, ty: pick.ty };
          return;
        }
      }
    }

    // Fallback: no valid path found
    hs._botPath = null;
    hs._botPathIdx = 0;
  },


  // ===================== BOT AI — SEEKER =====================

  // Initialize the seeker bot's patrol — generates waypoints dynamically for any map
  _initSeekerBot() {
    const hs = HideSeekState;
    if (!level) return;

    hs._seekerWaypoints = this._generateSeekerWaypoints();
    hs._seekerWPIdx = 0;
    hs._chasing = false;
    hs._botStuckTimer = 0;
    hs._botLastX = 0;
    hs._botLastY = 0;
  },

  // Generate patrol waypoints for any map — grid sampling + junctions + dead-ends
  _generateSeekerWaypoints() {
    const w = level.widthTiles, h = level.heightTiles;
    const STEP = 6; // sample every 6 tiles (roughly room-sized)
    const MERGE_DIST = 3; // merge waypoints within 3 tiles
    const waypoints = [];

    // Step 1: Grid sample — place candidates every STEP tiles on walkable ground
    for (let y = STEP; y < h - 1; y += STEP) {
      for (let x = STEP; x < w - 1; x += STEP) {
        if (isSolid(x, y)) continue;
        // Attract toward openness: find the tile in a 3-tile radius with the most open neighbors
        let bestX = x, bestY = y, bestOpen = 0;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const cx = x + dx, cy = y + dy;
            if (cx < 1 || cy < 1 || cx >= w - 1 || cy >= h - 1) continue;
            if (isSolid(cx, cy)) continue;
            let open = 0;
            for (let ny = -1; ny <= 1; ny++) {
              for (let nx = -1; nx <= 1; nx++) {
                if (!isSolid(cx + nx, cy + ny)) open++;
              }
            }
            if (open > bestOpen) { bestOpen = open; bestX = cx; bestY = cy; }
          }
        }
        waypoints.push({ tx: bestX, ty: bestY });
      }
    }

    // Step 2: Add junction waypoints (3+ cardinal openings = T-junction or crossroads)
    // and dead-end waypoints (exactly 1 cardinal opening)
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        if (isSolid(x, y)) continue;
        let openCount = 0;
        if (!isSolid(x - 1, y)) openCount++;
        if (!isSolid(x + 1, y)) openCount++;
        if (!isSolid(x, y - 1)) openCount++;
        if (!isSolid(x, y + 1)) openCount++;

        if (openCount >= 3 || openCount === 1) {
          // Check not too close to existing waypoint
          let tooClose = false;
          for (const wp of waypoints) {
            if (Math.abs(wp.tx - x) + Math.abs(wp.ty - y) < MERGE_DIST) {
              tooClose = true; break;
            }
          }
          if (!tooClose) waypoints.push({ tx: x, ty: y });
        }
      }
    }

    // Step 3: BFS-validate reachability from seeker spawn
    const spawn = (level.spawns && level.spawns.seeker) || { tx: 5, ty: 5 };
    const botMob = HideSeekState.botMob;
    const spawnTX = Math.floor((botMob ? botMob.x : spawn.tx * TILE) / TILE);
    const spawnTY = Math.floor((botMob ? botMob.y : spawn.ty * TILE) / TILE);
    const reachable = waypoints.filter(wp => {
      if (typeof bfsPath === 'function') {
        const path = bfsPath(spawnTX, spawnTY, wp.tx, wp.ty, 5000);
        return path && path.length > 0;
      }
      return true; // if no BFS, keep all
    });

    // Step 4: Order via nearest-neighbor greedy from seeker spawn
    const ordered = [];
    const remaining = reachable.slice();
    let curX = spawnTX, curY = spawnTY;
    while (remaining.length > 0) {
      let bestIdx = 0, bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const dx = remaining[i].tx - curX, dy = remaining[i].ty - curY;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const picked = remaining.splice(bestIdx, 1)[0];
      ordered.push(picked);
      curX = picked.tx;
      curY = picked.ty;
    }

    // Step 5: Shuffle ~25% of adjacent pairs for variety
    for (let i = 0; i < ordered.length - 1; i++) {
      if (Math.random() < 0.25) {
        [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
        i++; // skip swapped pair
      }
    }

    return ordered;
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

    // ---- Hider bot during hide phase: walk to chosen hide spot (one spot, no re-picking) ----
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

    // ---- Detection: is a hider within detect range? ----
    const hiders = hs.participants.filter(p => p.role === 'hider');
    if (!hiders.length) return;
    const hiderEntity = hiders[0].entity; // 1v1: first hider. Multiplayer: pick closest.
    const hdx = hiderEntity.x - bot.x;
    const hdy = hiderEntity.y - bot.y;
    const hDist = Math.sqrt(hdx * hdx + hdy * hdy);

    if (hDist <= detectRange) {
      // Line-of-sight check: reject if any wall tile between bot and hider
      let blocked = false;
      if (hDist > TILE) {
        const steps = Math.ceil(hDist / TILE);
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          if (isSolid(Math.floor((bot.x + hdx * t) / TILE), Math.floor((bot.y + hdy * t) / TILE))) {
            blocked = true; break;
          }
        }
      }
      if (!blocked) hs._chasing = true;
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

        // Re-pathfind to hider (hider is stationary but path may be stale)
        const hiderTX = Math.floor(hiderEntity.x / TILE);
        const hiderTY = Math.floor(hiderEntity.y / TILE);
        if (!hs._botPath || hs._botPathIdx >= hs._botPath.length ||
            !hs._botTarget || hs._botTarget.tx !== hiderTX || hs._botTarget.ty !== hiderTY) {
          if (typeof bfsPath === 'function') {
            hs._botPath = bfsPath(botTX, botTY, hiderTX, hiderTY, 5000);
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
        hs._botPath = bfsPath(botTX, botTY, wp.tx, wp.ty, 5000);
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


  // ===================== BOT MOVEMENT (player-style) =====================

  // Move bot along its BFS path using the EXACT same collision rules as the player.
  // Uses PLAYER_WALL_HW, separate-axis AABB, and corner unsticking.
  _moveBotAlongPath(bot) {
    const hs = HideSeekState;
    const path = hs._botPath;

    if (!path || path.length === 0) {
      bot.vx = 0; bot.vy = 0; bot.moving = false;
      return;
    }
    if (hs._botPathIdx >= path.length) {
      bot.vx = 0; bot.vy = 0; bot.moving = false;
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

    // If within one frame of reaching this step, snap and advance
    if (dist <= bot.speed) {
      bot.x = targetX;
      bot.y = targetY;
      hs._botPathIdx++;
      if (hs._botPathIdx >= path.length) {
        bot.vx = 0; bot.vy = 0; bot.moving = false;
        return;
      }
      this._moveBotAlongPath(bot);
      return;
    }

    // Normalize direction and set velocity
    const ndx = dx / dist;
    const ndy = dy / dist;
    bot.vx = ndx * bot.speed;
    bot.vy = ndy * bot.speed;

    // ---- Player-style AABB collision (same as inventory.js update()) ----
    const hw = GAME_CONFIG.PLAYER_WALL_HW; // 16px — same as player
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
};


// ===================== DEBUG COMMAND =====================
// Usage: _hideSeekDebug('seeker') or _hideSeekDebug('hider', 'hide_02')
// Can be called from the console or from the /hideseek chat command

window._hideSeekDebug = function(role, mapId) {
  const targetMap = mapId || HIDESEEK.MAP_ID;
  // Only allow from lobby or hide & seek map
  const inHideSeek = (typeof Scene !== 'undefined' && Scene.inHideSeek);
  const inLobby = (typeof Scene !== 'undefined' && Scene.inLobby);

  if (!inHideSeek && !inLobby) return;

  if (inLobby) {
    // Transition to the hide & seek map first
    if (typeof enterLevel === 'function') {
      const spawnTX = (level && level.spawns && level.spawns.seeker) ? level.spawns.seeker.tx : 5;
      const spawnTY = (level && level.spawns && level.spawns.seeker) ? level.spawns.seeker.ty : 5;
      enterLevel(targetMap, spawnTX, spawnTY);
    }
    // Wait a frame for level to load, then start match
    setTimeout(function() {
      HideSeekSystem.startMatch(role || 'seeker');
    }, 100);
  } else {
    HideSeekSystem.startMatch(role || 'seeker');
  }
};
