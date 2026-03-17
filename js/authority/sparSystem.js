// ===================== SPAR SYSTEM =====================
// Authority: spar arena combat, bot AI, match flow
// Phase B — loaded after casinoSystem.js
// Depends on: SPAR_CONFIG, SPAR_ROOMS, SPAR_CTX_STATS, sparProgress (sparData.js)
//             CT_X_GUN (interactable.js)
//             player, bullets, hitEffects (gameState.js)
//             enterLevel, Scene, LEVELS (sceneManager.js)
//             positionClear (mobSystem.js)
//             TILE (levelData.js)
//             GAME_CONFIG (gameConfig.js)

// ---- SPAR STATE ----
const SparState = {
  phase: 'idle',           // 'idle' | 'hub' | 'countdown' | 'fighting' | 'post_match'
  activeRoom: null,        // SPAR_ROOMS entry
  teamA: [],               // [{ id, entity, isLocal, isBot, alive, member }]
  teamB: [],               // same
  countdown: 0,
  matchTimer: 0,
  lastResult: null,        // 'teamA' | 'teamB'
  postMatchTimer: 0,
  streakCount: 0,
  _sparBots: [],           // all spar bot member objects (both teams)
  _savedSnapshot: null,    // loadout snapshot for restore
  _nextBotId: 1,
  _matchCollector: null,   // per-match data collection for learning
};

// ---- SPAR SYSTEM ----
const SparSystem = {
  enterHub() {
    playerDead = false;
    deathTimer = 0;
    if (typeof respawnTimer !== 'undefined') respawnTimer = 0;
    deathGameOver = false;
    SparState.phase = 'hub';
    SparState.activeRoom = null;
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;
  },

  // Build CT-X gun object from 100-point allocation {freeze, rof, spread}
  // Returns a full gun object matching the party member gun structure
  _buildCtxGun(freezePts, rofPts, spreadPts) {
    const frzStat = SPAR_CTX_STATS.freezeToStat(freezePts);
    const fireRate = SPAR_CTX_STATS.rofToStat(rofPts);
    const spread = SPAR_CTX_STATS.spreadToStat(spreadPts);
    return {
      id: 'ct_x',
      name: 'CT-X',
      damage: CT_X_GUN.damage,          // 20
      fireRate: fireRate,
      magSize: CT_X_GUN.magSize,         // 30
      ammo: CT_X_GUN.magSize,
      reloading: false,
      reloadTimer: 0,
      fireCooldown: 0,
      freezePenalty: frzStat.freezePenalty,
      freezeDuration: frzStat.freezeDuration,
      spread: spread,
      special: null,
      bulletColor: null,               // use default yellow (same as player)
      color: CT_X_GUN.color || '#3a5a3a',
      // Store point allocation for HUD display
      _sparFreeze: freezePts,
      _sparRof: rofPts,
      _sparSpread: spreadPts,
    };
  },

  // Meta builds — bots pick from proven competitive loadouts
  _META_BUILDS: [
    { freeze: 50, rof: 50, spread: 0 },
    { freeze: 40, rof: 50, spread: 10 },
    { freeze: 30, rof: 40, spread: 30 },
  ],

  // Pick a random meta build for a bot
  _randomBotAlloc() {
    return this._META_BUILDS[Math.floor(Math.random() * this._META_BUILDS.length)];
  },

  _clamp01(v) {
    return Math.max(0, Math.min(1, v));
  },

  _ensureReinforcementProfile(sl) {
    if (!sl) return null;
    const routeKeys = typeof SPAR_OPENING_ROUTE_KEYS !== 'undefined'
      ? SPAR_OPENING_ROUTE_KEYS
      : ['bottomLeft', 'bottomRight', 'bottomCenter', 'topHold', 'midFlank', 'mirrorPlayer'];
    const antiBottomKeys = typeof SPAR_ANTI_BOTTOM_RESPONSE_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_RESPONSE_KEYS
      : ['directContest', 'sideFlank', 'baitPull'];
    if (!sl.reinforcement1v1) sl.reinforcement1v1 = {};
    if (!sl.reinforcement1v1.general) sl.reinforcement1v1.general = {};
    if (!sl.reinforcement1v1.player) sl.reinforcement1v1.player = {};
    if (!sl.reinforcement1v1.selfPlay) sl.reinforcement1v1.selfPlay = {};
    const scopes = [sl.reinforcement1v1.general, sl.reinforcement1v1.player, sl.reinforcement1v1.selfPlay];
    for (const scope of scopes) {
      if (!scope.style) scope.style = createSparRewardBuckets(Object.keys(SPAR_DUEL_STYLES || {}));
      if (!scope.opening) scope.opening = createSparRewardBuckets(routeKeys);
      if (!scope.antiBottom) scope.antiBottom = createSparRewardBuckets(antiBottomKeys);
    }
    return sl.reinforcement1v1;
  },

  _sumBucketPlays(bucketMap) {
    let total = 0;
    if (!bucketMap) return total;
    for (const bucket of Object.values(bucketMap)) total += (bucket && bucket.plays) || 0;
    return total;
  },

  _scoreRewardBucket(bucket, totalPlays, exploreWeight) {
    const plays = bucket && bucket.plays ? bucket.plays : 0;
    const reward = bucket && typeof bucket.reward === 'number' ? bucket.reward : 0.5;
    const bonus = exploreWeight * Math.sqrt(Math.log((totalPlays || 0) + 2) / (plays + 1));
    return reward + bonus;
  },

  _pickWeightedScoreChoice(scores) {
    let minScore = Infinity;
    for (const value of Object.values(scores)) {
      if (value < minScore) minScore = value;
    }
    let total = 0;
    const weights = {};
    for (const [key, value] of Object.entries(scores)) {
      const weight = Math.max(0.05, value - minScore + 0.05);
      weights[key] = weight;
      total += weight;
    }
    let roll = Math.random() * total;
    for (const [key, weight] of Object.entries(weights)) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return Object.keys(scores)[0];
  },

  _updateRewardBucket(bucket, reward) {
    if (!bucket) return;
    const clamped = this._clamp01(reward);
    const plays = bucket.plays || 0;
    bucket.reward = plays > 0 ? ((bucket.reward * plays) + clamped) / (plays + 1) : clamped;
    bucket.plays = plays + 1;
  },

  _computeDamageReward(dmgDelta) {
    return this._clamp01(0.5 + dmgDelta / (SPAR_CONFIG.HP_BASELINE * 1.5));
  },

  _getAimDirToTarget(source, target) {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
  },

  _getEntityGunSide(entity) {
    if (entity === player) {
      return typeof getCurrentGunSide === 'function' ? getCurrentGunSide() : 'left';
    }
    return entity && entity._gunSide ? entity._gunSide : 'left';
  },

  _getSparMuzzlePos(entity, aimDir, gunSide) {
    const bx = entity.x - 20;
    const by = entity.y - 68;
    const bodyL = bx + 2;
    const bodyR = bx + 36;
    const armY = by + 35;
    const isRight = gunSide === 'right';
    if (aimDir === 0) return { x: isRight ? (bodyL - 1) : (bodyR + 1), y: armY + 6 + 49 };
    if (aimDir === 1) return { x: isRight ? (bodyR + 1) : (bodyL - 1), y: by + 28 - 49 };
    if (aimDir === 2) return { x: bodyL + 2 - 49, y: isRight ? (armY - 20) : (armY + 20) };
    return { x: bodyR + 9 + 49, y: isRight ? (armY + 20) : (armY - 20) };
  },

  _getGunSideLaneScore(source, target) {
    if (!source || !target) return 0.5;
    const aimDir = this._getAimDirToTarget(source, target);
    const muzzle = this._getSparMuzzlePos(source, aimDir, this._getEntityGunSide(source));
    if (aimDir === 0 || aimDir === 1) {
      return this._clamp01(1 - Math.abs(target.x - muzzle.x) / 90);
    }
    return this._clamp01(1 - Math.abs(target.y - muzzle.y) / 55);
  },

  _updateMatchReinforcement(won, collector, enemyBot, scopes) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    if (!sl || !collector || !enemyBot || !enemyBot.ai) return;
    const rf = this._ensureReinforcementProfile(sl);
    if (!rf) return;

    const botWon = !won;
    const dmgDelta = (enemyBot.ai._matchDmgDealt || 0) - (enemyBot.ai._matchDmgTaken || 0);
    const dmgReward = this._computeDamageReward(dmgDelta);
    const gotBottomAtOpening = collector.botYAtOpeningEnd > 0 && collector.playerYAtOpeningEnd > 0
      ? (collector.botYAtOpeningEnd > collector.playerYAtOpeningEnd + 20 ? 1 : 0)
      : 0.5;
    const totalBottomFrames = collector.botHasBottom_frames + collector.hasBottom_frames;
    const retakeShare = totalBottomFrames > 0 ? (collector.botHasBottom_frames / totalBottomFrames) : 0.5;
    const verticalFrames = collector.botUnderEnemy_frames + collector.botAboveEnemy_frames;
    const underReward = verticalFrames > 0 ? (collector.botUnderEnemy_frames / verticalFrames) : 0.5;
    const gunFrames = collector.botGunAdv_frames + collector.botGunDisadv_frames;
    const gunReward = gunFrames > 0 ? (collector.botGunAdv_frames / gunFrames) : 0.5;
    const winReward = botWon ? 1 : 0;
    // Winning is the biggest signal, then damage trade, then posture.
    const baseReward = this._clamp01(
      winReward * 0.5 +
      dmgReward * 0.24 +
      underReward * 0.16 +
      gunReward * 0.10
    );
    const styleReward = baseReward;
    const routeReward = this._clamp01(baseReward * 0.7 + gotBottomAtOpening * 0.2 + underReward * 0.1);
    const antiBottomReward = this._clamp01(baseReward * 0.62 + retakeShare * 0.2 + underReward * 0.1 + gunReward * 0.08);
    const scopeList = Array.isArray(scopes) ? scopes : [];
    for (const scopeName of scopeList) {
      const scope = rf[scopeName];
      if (!scope) continue;
      if (enemyBot.ai._duelStyle && scope.style && scope.style[enemyBot.ai._duelStyle]) {
        this._updateRewardBucket(scope.style[enemyBot.ai._duelStyle], styleReward);
      }
      if (SparState._botOpeningRoute && scope.opening && scope.opening[SparState._botOpeningRoute]) {
        this._updateRewardBucket(scope.opening[SparState._botOpeningRoute], routeReward);
      }
      if (enemyBot.ai._antiBottomResponse && enemyBot.ai._antiBottomFrames > 20 &&
          scope.antiBottom && scope.antiBottom[enemyBot.ai._antiBottomResponse]) {
        this._updateRewardBucket(scope.antiBottom[enemyBot.ai._antiBottomResponse], antiBottomReward);
      }
    }
  },

  _pickAntiBottomResponse(pm) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
    const responses = typeof SPAR_ANTI_BOTTOM_RESPONSE_KEYS !== 'undefined'
      ? SPAR_ANTI_BOTTOM_RESPONSE_KEYS
      : ['directContest', 'sideFlank', 'baitPull'];
    if (!sl) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
    const rf = this._ensureReinforcementProfile(sl);
    const pBuckets = rf && rf.player ? rf.player.antiBottom : null;
    const gBuckets = rf && rf.general ? rf.general.antiBottom : null;
    const sBuckets = rf && rf.selfPlay ? rf.selfPlay.antiBottom : null;
    const totalPlayer = this._sumBucketPlays(pBuckets);
    const totalGeneral = this._sumBucketPlays(gBuckets);
    const totalSelfPlay = this._sumBucketPlays(sBuckets);
    let best = 'sideFlank';
    let bestScore = -Infinity;
    for (const name of responses) {
      let score = name === 'sideFlank' ? 7 : (name === 'directContest' ? 6 : 5);
      if (pm) {
        if (name === 'sideFlank') {
          if (pm.playerWallsFromBottom > 0.45) score += 10;
          if (pm.playerHoldsBottom > 0.55) score += 6;
        } else if (name === 'directContest') {
          if (pm.playerHoldsBottom > 0.6 && pm.playerPushesFromBottom < 0.35) score += 10;
          if (pm.playerPushesFromBottom > 0.45) score -= 4;
        } else if (name === 'baitPull') {
          if (pm.playerPushesFromBottom > 0.45) score += 11;
          if (pm.playerWallsFromBottom > 0.55) score += 3;
        }
      }
      const pScore = this._scoreRewardBucket(pBuckets && pBuckets[name], totalPlayer, 0.24);
      const gScore = this._scoreRewardBucket(gBuckets && gBuckets[name], totalGeneral, 0.12);
      const sScore = this._scoreRewardBucket(sBuckets && sBuckets[name], totalSelfPlay, 0.08);
      score += (pScore - 0.5) * 28;
      score += (gScore - 0.5) * 14;
      score += (sScore - 0.5) * 10;
      score += Math.random() * 3;
      if (score > bestScore) {
        bestScore = score;
        best = name;
      }
    }
    return best;
  },

  joinRoom(roomId) {
    // CT-X must be equipped to enter spar
    if (!playerEquip.gun || playerEquip.gun.id !== 'ct_x') {
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: player.x, y: player.y - 40, life: 50, maxLife: 50, type: "heal", dmg: "Equip CT-X to spar!" });
      }
      return;
    }
    const room = SPAR_ROOMS.find(r => r.id === roomId);
    if (!room) return;
    SparState.activeRoom = room;

    // 1. Snapshot loadout
    SparState._savedSnapshot = {
      gunDamage: gun.damage,
      gunFireRate: gun.fireRate,
      gunMagSize: gun.magSize,
      gunAmmo: gun.ammo,
      gunReloading: gun.reloading,
      gunReloadTimer: gun.reloadTimer,
      gunSpecial: gun.special,
      gunFreezePenalty: gun.freezePenalty,
      gunFreezeDuration: gun.freezeDuration,
      gunSpread: gun.spread,
      meleeDamage: melee.damage,
      meleeRange: melee.range,
      meleeSpeed: melee.speed,
      meleeSpecial: melee.special,
      playerHp: player.hp,
      playerMaxHp: player.maxHp,
      activeSlot: activeSlot,
      lives: lives,
      playerDead: playerDead,
      playerEquipGun: playerEquip.gun ? JSON.parse(JSON.stringify(playerEquip.gun)) : null,
      playerEquipBoots: playerEquip.boots ? JSON.parse(JSON.stringify(playerEquip.boots)) : null,
      playerEquipPants: playerEquip.pants ? JSON.parse(JSON.stringify(playerEquip.pants)) : null,
      playerEquipChest: playerEquip.chest ? JSON.parse(JSON.stringify(playerEquip.chest)) : null,
      playerEquipHelmet: playerEquip.helmet ? JSON.parse(JSON.stringify(playerEquip.helmet)) : null,
    };

    // 2. Apply CT-X spar loadout
    // Read player's current CT-X slider values, clamp total to 100
    let pFreeze = typeof _ctxFreeze !== 'undefined' ? _ctxFreeze : 50;
    let pRof = typeof _ctxRof !== 'undefined' ? _ctxRof : 50;
    let pSpread = typeof _ctxSpread !== 'undefined' ? _ctxSpread : 0;
    const total = pFreeze + pRof + pSpread;
    if (total > SPAR_CONFIG.POINT_BUDGET) {
      const scale = SPAR_CONFIG.POINT_BUDGET / total;
      pFreeze = Math.floor(pFreeze * scale);
      pRof = Math.floor(pRof * scale);
      pSpread = SPAR_CONFIG.POINT_BUDGET - pFreeze - pRof;
    }
    const playerGun = this._buildCtxGun(pFreeze, pRof, pSpread);

    // Apply to player's gun state
    gun.damage = playerGun.damage;
    gun.fireRate = playerGun.fireRate;
    gun.magSize = playerGun.magSize;
    gun.freezePenalty = playerGun.freezePenalty;
    gun.freezeDuration = playerGun.freezeDuration;
    gun.spread = playerGun.spread;
    gun.ammo = playerGun.magSize;
    gun.reloading = false;
    gun.reloadTimer = 0;
    playerEquip.gun = { ...CT_X_GUN, ...playerGun };

    player.hp = SPAR_CONFIG.HP_BASELINE;
    player.maxHp = SPAR_CONFIG.HP_BASELINE;
    activeSlot = 0;
    lives = 1;
    playerDead = false;

    // Zero out melee/armor effects during spar
    melee.damage = 0;
    melee.range = 0;

    // 3. Create spar bots
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;

    const arenaLevel = LEVELS[room.arenaLevel];
    if (!arenaLevel) return;
    const spawns = arenaLevel.spawns;

    // Player on teamA
    SparState.teamA.push({
      id: 'player',
      entity: player,
      isLocal: true,
      isBot: false,
      alive: true,
      member: null, // player uses globals (gun, melee, playerEquip)
    });

    // Ally bots (teamA, teamSize - 1)
    for (let i = 1; i < room.teamSize; i++) {
      const spawnKey = 'teamA' + (i > 0 ? (i + 1) : '');
      const spawnPt = spawns[spawnKey] || spawns.teamA;
      const member = this._createBot('ally_' + i, spawnPt.tx, spawnPt.ty, 'teamA');
      SparState._sparBots.push(member);
      SparState.teamA.push({
        id: member.id,
        entity: member.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: member,
      });
    }

    // Enemy bots (teamB, full teamSize)
    for (let i = 0; i < room.teamSize; i++) {
      const spawnKey = i === 0 ? 'teamB' : ('teamB' + (i + 1));
      const spawnPt = spawns[spawnKey] || spawns.teamB;
      const member = this._createBot('enemy_' + i, spawnPt.tx, spawnPt.ty, 'teamB');
      SparState._sparBots.push(member);
      SparState.teamB.push({
        id: member.id,
        entity: member.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: member,
      });
    }

    // 4. Enter arena level
    enterLevel(room.arenaLevel, spawns.p1.tx, spawns.p1.ty);

    // Position bots at their spawn points (after enterLevel resets)
    for (const member of SparState._sparBots) {
      member.entity.x = member._spawnTX * TILE + TILE / 2;
      member.entity.y = member._spawnTY * TILE + TILE / 2;
    }

    // 5. Start countdown
    SparState._botOpeningRoute = null;
    const trainTiming = typeof _getSparTrainingTiming === 'function' ? _getSparTrainingTiming() : null;
    SparState.phase = 'countdown';
    SparState.countdown = trainTiming ? trainTiming.countdownFrames : SPAR_CONFIG.COUNTDOWN_FRAMES;
    SparState.matchTimer = 0;
    SparState.lastResult = null;
    SparState.postMatchTimer = 0;
  },

  // Create a spar bot as a full member object (mirrors createPartyMember pattern)
  _createBot(nameId, spawnTX, spawnTY, team) {
    const id = 'spar_bot_' + SparState._nextBotId++;

    // CT-X allocation: fixed build for 1v1 enemy bots, random meta for others
    const room = SparState.activeRoom;
    const is1v1Enemy = team === 'teamB' && room && room.teamSize === 1;
    const alloc = is1v1Enemy ? { freeze: 50, rof: 50, spread: 0 } : this._randomBotAlloc();
    const botGun = this._buildCtxGun(alloc.freeze, alloc.rof, alloc.spread);

    // Entity — same structure as party bot entities
    const entity = {
      x: spawnTX * TILE + TILE / 2,
      y: spawnTY * TILE + TILE / 2,
      vx: 0, vy: 0,
      knockVx: 0, knockVy: 0,
      speed: SPAR_CONFIG.BOT_SPEED,
      baseSpeed: SPAR_CONFIG.BOT_SPEED,
      hp: SPAR_CONFIG.HP_BASELINE,
      maxHp: SPAR_CONFIG.HP_BASELINE,
      dir: team === 'teamA' ? 0 : 2,
      frame: 0, animTimer: 0, moving: false,
      name: nameId.startsWith('ally') ? 'Ally Bot' : 'Spar Bot',
      radius: typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG.PLAYER_RADIUS : 14,
      _isBot: true,
      _isSparBot: true,
      _sparTeam: team,
      _gunSide: 'left',
      _contactCD: 0,
      // Cosmetics
      skin: team === 'teamA' ? '#4488cc' : '#cc4444',
      hair: '#333',
      shirt: team === 'teamA' ? '#2266aa' : '#aa2222',
      pants: '#222',
      shoes: '#111',
      hat: null,
    };

    // Full member object (same pattern as partySystem.createPartyMember)
    const member = {
      id: id,
      controlType: 'bot',
      entity: entity,
      _sparTeam: team,
      _spawnTX: spawnTX,
      _spawnTY: spawnTY,
      // Independent gun state (same structure as party member.gun)
      gun: botGun,
      // Melee zeroed (spar = gun only)
      melee: { damage: 0, range: 0, cooldown: 0, cooldownMax: 0, critChance: 0, special: null },
      // Equipment
      equip: { armor: null, boots: null, pants: null, chest: null, helmet: null, gun: botGun, melee: null },
      dead: false,
      deathTimer: 0,
      active: true,
      // AI state (same pattern as party bot ai)
      ai: {
        state: 'engage',
        target: null,
        targetAge: 0,
        shootCD: 0,              // fire cooldown (frames), same as BotAI
        _freezeTimer: 0,         // post-shot freeze (same as player freezeTimer)
        _freezePenalty: 0,       // speed penalty during freeze (same as player)
        // Spar-specific tactical state
        aggression: 0.3 + Math.random() * 0.7,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: Math.floor(40 + Math.random() * 60),
        targetId: null,
        targetTimer: 0,
        laneY: null,
        laneShiftTimer: 0,
        jukeTimer: 0,            // cooldown for juke direction flips
        // Smooth movement
        smoothVx: 0,
        smoothVy: 0,
        // Baiting
        baitTimer: 0,            // >0 = currently faking
        baitDirX: 0,             // fake direction
        baitDirY: 0,
        baitCooldown: 120 + Math.floor(Math.random() * 120),
        // Phase 1a: circumstance tracking
        _lastHitFrame: 0,
        _lastTookHitFrame: 0,
        _losBlockedFrames: 0,
        _chaseFrames: 0,
        _retreatFrames: 0,
        _shotMode: 'immediate',
        _styleSwitchEvaluated: false,
        _matchDmgDealt: 0,
        _matchDmgTaken: 0,
        _antiBottomResponse: null,
        _antiBottomFrames: 0,
        _cornerFrames: 0,         // consecutive frames stuck in a corner
        _topStuckFrames: 0,       // consecutive frames in top half without bottom
      },
    };

    // Phase 2: Assign duel style for 1v1 enemy bots
    if (is1v1Enemy && typeof SPAR_DUEL_STYLES !== 'undefined') {
      const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
      let style = 'pressure'; // default

      if (sl && sl.general1v1 && sl.general1v1.styleResults) {
        const rf = this._ensureReinforcementProfile(sl);
        const pStyleBuckets = rf && rf.player ? rf.player.style : null;
        const gStyleBuckets = rf && rf.general ? rf.general.style : null;
        const sStyleBuckets = rf && rf.selfPlay ? rf.selfPlay.style : null;
        const totalPlayerStylePlays = this._sumBucketPlays(pStyleBuckets);
        const totalGeneralStylePlays = this._sumBucketPlays(gStyleBuckets);
        const totalSelfPlayStylePlays = this._sumBucketPlays(sStyleBuckets);
        // Pick style with best win rate, 10% exploration
        if (Math.random() < 0.1) {
          const styleNames = Object.keys(SPAR_DUEL_STYLES);
          style = styleNames[Math.floor(Math.random() * styleNames.length)];
        } else {
          let bestScore = -Infinity;
          const hasPersonal = sl.player1v1 && sl.player1v1.styleResults;
          let personalSamples = 0;
          if (hasPersonal) {
            for (const name of Object.keys(SPAR_DUEL_STYLES)) {
              personalSamples += (sl.player1v1.styleResults[name] && sl.player1v1.styleResults[name].total) || 0;
            }
          }
          for (const [name, _] of Object.entries(SPAR_DUEL_STYLES)) {
            const sr = sl.general1v1.styleResults[name];
            const jr = hasPersonal ? sl.player1v1.styleResults[name] : null;
            const kr = sl.selfPlay1v1 && sl.selfPlay1v1.styleResults ? sl.selfPlay1v1.styleResults[name] : null;
            // Only force untested styles when we have no personal read yet.
            if (personalSamples < 1 && (!sr || sr.total < 1) && (!jr || jr.total < 1) && (!kr || kr.total < 1)) {
              style = name; break;
            }
            let score;
            if (jr && jr.total >= 3) {
              // Player1v1 has enough data — use it as PRIMARY
              score = jr.wins / jr.total;
              // General1v1 as small tiebreaker
              if (sr && sr.total > 0) {
                score += (sr.wins / sr.total - 0.5) * 0.15;
              }
              if (kr && kr.total > 0) {
                score += (kr.wins / kr.total - 0.5) * 0.10;
              }
            } else if (jr && jr.total > 0) {
              // Some personal data — blend 60/40 personal/general
              const pScore = jr.wins / jr.total;
              const gScore = sr && sr.total > 0 ? sr.wins / sr.total : 0.5;
              const kScore = kr && kr.total > 0 ? kr.wins / kr.total : gScore;
              score = pScore * 0.6 + gScore * 0.25 + kScore * 0.15;
            } else {
              // No personal data — blend general and self-play
              const gScore = sr && sr.total > 0 ? sr.wins / sr.total : 0.5;
              const kScore = kr && kr.total > 0 ? kr.wins / kr.total : gScore;
              score = gScore * 0.65 + kScore * 0.35;
            }
            const playerRewardScore = this._scoreRewardBucket(
              pStyleBuckets && pStyleBuckets[name],
              totalPlayerStylePlays,
              0.18
            );
            const generalRewardScore = this._scoreRewardBucket(
              gStyleBuckets && gStyleBuckets[name],
              totalGeneralStylePlays,
              0.1
            );
            const selfPlayRewardScore = this._scoreRewardBucket(
              sStyleBuckets && sStyleBuckets[name],
              totalSelfPlayStylePlays,
              0.08
            );
            if (jr && jr.total >= 3) {
              score = score * 0.68 + playerRewardScore * 0.20 + generalRewardScore * 0.06 + selfPlayRewardScore * 0.06;
            } else if (jr && jr.total > 0) {
              score = score * 0.68 + playerRewardScore * 0.14 + generalRewardScore * 0.10 + selfPlayRewardScore * 0.08;
            } else {
              score = score * 0.68 + generalRewardScore * 0.20 + selfPlayRewardScore * 0.12;
            }
            if (score > bestScore) { bestScore = score; style = name; }
          }
        }
      }

      member.ai._duelStyle = style;
    }

    return member;
  },

  tick() {
    if (SparState.phase === 'idle' || SparState.phase === 'hub') return;

    if (SparState.phase === 'countdown') {
      SparState.countdown--;
      for (const m of SparState._sparBots) {
        m.entity.vx = 0; m.entity.vy = 0; m.entity.moving = false;
      }
      if (SparState.countdown <= 0) {
        SparState.phase = 'fighting';
        SparState.matchTimer = 0;
      }
      return;
    }

    if (SparState.phase === 'fighting') {
      SparState.matchTimer++;
      this._collectPlayerData();
      this._tickSparBots();
      this._bodyBlockSpar();

      // Check alive counts
      const aAlive = SparState.teamA.filter(p => p.alive).length;
      const bAlive = SparState.teamB.filter(p => p.alive).length;

      if (aAlive <= 0 || bAlive <= 0) {
        SparState.lastResult = aAlive > 0 ? 'teamA' : 'teamB';
        SparState.phase = 'post_match';
        const trainTiming = typeof _getSparTrainingTiming === 'function' ? _getSparTrainingTiming() : null;
        SparState.postMatchTimer = trainTiming ? trainTiming.postMatchFrames : SPAR_CONFIG.POST_MATCH_FRAMES;

        // Record results
        const won = SparState.lastResult === 'teamA';
        const isTraining = typeof _isSparTraining === 'function' && _isSparTraining();

        // Skip progression/stats/save during automated training
        if (!isTraining) {
          const modeKey = SparState.activeRoom.teamSize + 'v' + SparState.activeRoom.teamSize;
          sparProgress.totals[won ? 'wins' : 'losses']++;
          if (sparProgress.byMode[modeKey]) {
            sparProgress.byMode[modeKey][won ? 'wins' : 'losses']++;
          }
          if (won) spars++;

          // Streak tracking
          if (SparState.activeRoom.streakMode) {
            const sk = sparProgress.streak[modeKey];
            if (sk) {
              if (won) {
                SparState.streakCount++;
                sk.current = SparState.streakCount;
                if (sk.current > sk.best) sk.best = sk.current;
              } else {
                SparState.streakCount = 0;
                sk.current = 0;
              }
            }
          }
        }

        // Update learning profile (skips internally during training)
        this._updateLearningProfile(won);

        // Training harness hook — auto-advance to next match
        if (typeof _sparTrainOnMatchEnd === 'function') {
          _sparTrainOnMatchEnd(won);
        }

        // Auto-save (skip during training to avoid persisting training state)
        if (!isTraining && typeof SaveLoad !== 'undefined') SaveLoad.save();
      }
      return;
    }

    if (SparState.phase === 'post_match') {
      SparState.postMatchTimer--;
      if (SparState.postMatchTimer <= 0) {
        if (SparState.activeRoom && SparState.activeRoom.streakMode && SparState.lastResult === 'teamA') {
          this._resetForStreakContinue();
        } else {
          this.exitToHub();
        }
      }
      return;
    }
  },

  _resetForStreakContinue() {
    SparState._matchCollector = null;
    // Remove old enemy bots
    const oldEnemies = SparState._sparBots.filter(m => m._sparTeam === 'teamB');
    for (const e of oldEnemies) {
      const idx = SparState._sparBots.indexOf(e);
      if (idx >= 0) SparState._sparBots.splice(idx, 1);
    }
    SparState.teamB.length = 0;

    // Restore player + ally HP and reset to spawn positions
    const room = SparState.activeRoom;
    const arenaLevel = LEVELS[room.arenaLevel];
    const spawns = arenaLevel.spawns;

    player.hp = SPAR_CONFIG.HP_BASELINE;
    player.x = spawns.p1.tx * TILE + TILE / 2;
    player.y = spawns.p1.ty * TILE + TILE / 2;
    player.vx = 0; player.vy = 0;
    playerDead = false;
    deathTimer = 0;
    deathGameOver = false;
    gun.ammo = gun.magSize;
    gun.reloading = false;
    for (const p of SparState.teamA) {
      p.alive = true;
      p.entity.hp = SPAR_CONFIG.HP_BASELINE;
      if (p.isBot && p.member) {
        const m = p.member;
        m.entity.x = m._spawnTX * TILE + TILE / 2;
        m.entity.y = m._spawnTY * TILE + TILE / 2;
        m.entity.vx = 0; m.entity.vy = 0;
        m.gun.ammo = m.gun.magSize;
        m.gun.reloading = false;
        m.gun.fireCooldown = 0;
        m.ai.shootCD = 0;
        m.dead = false;
      }
    }

    for (let i = 0; i < room.teamSize; i++) {
      const spawnKey = i === 0 ? 'teamB' : ('teamB' + (i + 1));
      const spawnPt = spawns[spawnKey] || spawns.teamB;
      const member = this._createBot('enemy_' + i, spawnPt.tx, spawnPt.ty, 'teamB');
      member.entity.x = spawnPt.tx * TILE + TILE / 2;
      member.entity.y = spawnPt.ty * TILE + TILE / 2;
      SparState._sparBots.push(member);
      SparState.teamB.push({
        id: member.id,
        entity: member.entity,
        isLocal: false,
        isBot: true,
        alive: true,
        member: member,
      });
    }

    // Restart countdown
    bullets.length = 0;
    hitEffects.length = 0;
    SparState._botOpeningRoute = null;
    const trainTiming = typeof _getSparTrainingTiming === 'function' ? _getSparTrainingTiming() : null;
    SparState.phase = 'countdown';
    SparState.countdown = trainTiming ? trainTiming.countdownFrames : SPAR_CONFIG.COUNTDOWN_FRAMES;
    SparState.lastResult = null;
  },

  onParticipantDeath(entity) {
    const allParticipants = [...SparState.teamA, ...SparState.teamB];
    for (const p of allParticipants) {
      if (p.entity === entity) {
        p.alive = false;
        if (p.member) p.member.dead = true;
        break;
      }
    }

    if (entity === player) {
      playerDead = true;
      deathTimer = 60;
      if (typeof respawnTimer !== 'undefined') respawnTimer = 0;
      deathX = player.x;
      deathY = player.y;
      deathRotation = 0;
      deathGameOver = false;
    }

    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({ x: entity.x, y: entity.y, life: 25, type: "shockwave" });
    }
  },

  exitToHub() {
    this._restoreSnapshot();
    this._cleanupBots();
    SparState._matchCollector = null;
    SparState._botOpeningRoute = null;
    SparState.phase = 'hub';
    SparState.activeRoom = null;
    SparState.lastResult = null;
    enterLevel(SPAR_CONFIG.HUB_LEVEL, 15, 18);
  },

  endMatch() {
    if (SparState.phase === 'idle') return;
    this._restoreSnapshot();
    this._cleanupBots();
    SparState._matchCollector = null;
    SparState._botOpeningRoute = null;
    SparState.phase = 'idle';
    SparState.activeRoom = null;
    SparState.lastResult = null;
    SparState.streakCount = 0;
    if (!transitioning) {
      enterLevel(SPAR_CONFIG.RETURN_LEVEL, SPAR_CONFIG.RETURN_TX, SPAR_CONFIG.RETURN_TY);
    }
  },

  _restoreSnapshot() {
    const snap = SparState._savedSnapshot;
    if (!snap) return;
    gun.damage = snap.gunDamage;
    gun.fireRate = snap.gunFireRate;
    gun.magSize = snap.gunMagSize;
    gun.ammo = snap.gunAmmo;
    gun.reloading = snap.gunReloading;
    gun.reloadTimer = snap.gunReloadTimer;
    gun.special = snap.gunSpecial;
    gun.freezePenalty = snap.gunFreezePenalty;
    gun.freezeDuration = snap.gunFreezeDuration;
    gun.spread = snap.gunSpread;
    melee.damage = snap.meleeDamage;
    melee.range = snap.meleeRange;
    melee.speed = snap.meleeSpeed;
    melee.special = snap.meleeSpecial;
    player.hp = snap.playerHp;
    player.maxHp = snap.playerMaxHp;
    activeSlot = snap.activeSlot;
    lives = snap.lives;
    playerDead = snap.playerDead;
    playerEquip.gun = snap.playerEquipGun;
    playerEquip.boots = snap.playerEquipBoots;
    playerEquip.pants = snap.playerEquipPants;
    playerEquip.chest = snap.playerEquipChest;
    playerEquip.helmet = snap.playerEquipHelmet;
    deathTimer = 0;
    if (typeof respawnTimer !== 'undefined') respawnTimer = 0;
    deathGameOver = false;
    SparState._savedSnapshot = null;
  },

  _cleanupBots() {
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;
  },

  isPlayerFrozen() {
    return SparState.phase === 'countdown' || SparState.phase === 'post_match';
  },

  getTeamForEntity(entity) {
    for (const p of SparState.teamA) if (p.entity === entity) return 'teamA';
    for (const p of SparState.teamB) if (p.entity === entity) return 'teamB';
    return null;
  },

  isAlly(a, b) {
    const teamA = this.getTeamForEntity(a);
    const teamB = this.getTeamForEntity(b);
    return teamA && teamB && teamA === teamB;
  },

  // ===================== SPAR BOT AI =====================
  // Follows BotAI.tick() pattern — each member ticks independently
  _tickSparBots() {
    for (const member of SparState._sparBots) {
      if (member.dead || member.entity.hp <= 0) continue;

      // Tick reload (same as BotAI)
      if (member.gun.reloading) {
        member.gun.reloadTimer--;
        if (member.gun.reloadTimer <= 0) {
          member.gun.reloading = false;
          member.gun.ammo = member.gun.magSize;
        }
      }

      // Tick fire cooldown
      if (member.ai.shootCD > 0) member.ai.shootCD--;
      // Tick recoil (visual — same as player updateGun())
      if (member.gun.recoilTimer > 0) member.gun.recoilTimer--;

      // Tick juke timer
      if (member.ai.jukeTimer > 0) member.ai.jukeTimer--;

      this._tickOneBot(member);
    }
  },

  // Body blocking — hard stop, no pushing. All spar entities can't overlap.
  _bodyBlockSpar() {
    // Gather all alive spar entities (player + bots)
    const entities = [];
    for (const p of SparState.teamA) {
      if (p.alive) entities.push(p.entity);
    }
    for (const p of SparState.teamB) {
      if (p.alive) entities.push(p.entity);
    }
    const R = GAME_CONFIG.PLAYER_RADIUS;
    const minDist = R * 2;
    // Resolve overlaps — push apart equally (hard stop, no momentum)
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i], b = entities[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist && dist > 0.1) {
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist, ny = dy / dist;
          // Push each entity half the overlap — hard stop, equal
          const axNew = a.x + nx * overlap;
          const ayNew = a.y + ny * overlap;
          const bxNew = b.x - nx * overlap;
          const byNew = b.y - ny * overlap;
          if (typeof positionClear === 'function') {
            if (positionClear(axNew, ayNew)) { a.x = axNew; a.y = ayNew; }
            if (positionClear(bxNew, byNew)) { b.x = bxNew; b.y = byNew; }
          } else {
            a.x = axNew; a.y = ayNew;
            b.x = bxNew; b.y = byNew;
          }
        } else if (dist <= 0.1) {
          // Exact overlap — nudge apart
          a.x += R; b.x -= R;
        }
      }
    }
  },

  // Shoot — 4 cardinal directions only (same as player shoot() in gunSystem.js)
  _sparBotShoot(member, target) {
    const e = member.entity;
    const g = member.gun;
    const bspd = GAME_CONFIG.BULLET_SPEED;

    // PREDICTIVE AIMING: lead the target based on velocity and distance
    const tVx = target.vx || 0, tVy = target.vy || 0;
    const rawDx = target.x - e.x, rawDy = target.y - e.y;
    const rawDist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);

    // Estimate frames for bullet to reach target
    const travelFrames = rawDist > 1 ? rawDist / (bspd * 60) * 60 : 5; // approx frames
    const leadFrames = Math.min(travelFrames, 15); // don't over-predict

    // Predicted position
    const predX = target.x + tVx * leadFrames * 0.5;
    const predY = target.y + tVy * leadFrames * 0.5;

    // Use predicted position for direction
    const dx = predX - e.x, dy = predY - e.y;

    // Learning: bias based on player's dodge tendency
    let aimBiasX = 0, aimBiasY = 0;
    const pm = member.ai._profileMods;
    if (pm && Math.abs(pm.dodgePredictBiasX) > 0.15) {
      aimBiasX = pm.dodgePredictBiasX * 30; // shift aim toward predicted dodge
    }

    const aimDx = dx + aimBiasX;
    const aimDy = dy + aimBiasY;

    // Pick best cardinal direction
    // dir: 0=down, 1=up, 2=left, 3=right
    // Elliptical hitbox bias: vertical shots (up/down) hit through 53px wide zone,
    // horizontal shots (left/right) hit through only 23px tall zone.
    // Scale aimDy to prefer vertical when hitbox data shows it works better.
    let effectiveDx = Math.abs(aimDx);
    let effectiveDy = Math.abs(aimDy);
    const pm2 = member.ai._profileMods;
    if (pm2 && pm2.horizShotAdvantage) {
      // horizShotAdvantage < 1 means vertical is better → bias toward vertical
      // horizShotAdvantage > 1 means horizontal is better → bias toward horizontal
      if (pm2.horizShotAdvantage < 0.5) {
        // Vertical shots are 2x+ better — strongly prefer vertical
        effectiveDy *= 1.8;
      } else if (pm2.horizShotAdvantage < 1.0) {
        effectiveDy *= 1.3;
      }
    }
    let bvx = 0, bvy = 0;
    let aimDir;
    if (effectiveDx > effectiveDy) {
      bvx = aimDx > 0 ? bspd : -bspd;
      aimDir = aimDx > 0 ? 3 : 2;
    } else {
      bvy = aimDy > 0 ? bspd : -bspd;
      aimDir = aimDy > 0 ? 0 : 1;
    }
    e.dir = aimDir;

    // Muzzle position — same body-relative formula as player getMuzzlePos()
    // Uses entity._gunSide (left for now) — matches player getMuzzlePos exactly
    const bx = e.x - 20;
    const by = e.y - 68;
    const bodyL = bx + 2;
    const bodyR = bx + 36;
    const armY = by + 35;
    const isRight = e._gunSide === 'right';
    let mx, my;
    if (aimDir === 0) { // down
      mx = isRight ? (bodyL - 1) : (bodyR + 1);
      my = armY + 6 + 49;
    } else if (aimDir === 1) { // up
      mx = isRight ? (bodyR + 1) : (bodyL - 1);
      my = by + 28 - 49;
    } else if (aimDir === 2) { // left
      mx = bodyL + 2 - 49;
      my = isRight ? (armY - 20) : (armY + 20);
    } else { // right
      mx = bodyR + 9 + 49;
      my = isRight ? (armY + 20) : (armY - 20);
    }

    // Apply spread (same as player shoot() — random angular offset)
    const spreadDeg = g.spread || 0;
    if (spreadDeg > 0) {
      const spreadRad = spreadDeg * Math.PI / 180;
      const randOffset = (Math.random() - 0.5) * spreadRad;
      const baseAngle = Math.atan2(bvy, bvx);
      const newAngle = baseAngle + randOffset;
      bvx = Math.cos(newAngle) * bspd;
      bvy = Math.sin(newAngle) * bspd;
    }

    bullets.push({
      id: typeof nextBulletId !== 'undefined' ? nextBulletId++ : Date.now() + Math.random(),
      x: mx,
      y: my,
      vx: bvx,
      vy: bvy,
      fromPlayer: true,
      sparTeam: member._sparTeam,
      damage: g.damage,
      special: g.special,
      ownerId: member.id,
      _botBullet: true,
      bulletColor: g.bulletColor || null,
      startX: mx,
      startY: my,
      _sparDir: e.dir,
    });

    g.ammo--;
    // Fire rate: match player's actual cooldown (fireRate * 4, same as gunSystem.js)
    member.ai.shootCD = Math.round((g.fireRate || 5) * 4);

    // Freeze penalty after shooting — same as player (gunSystem.js shoot())
    member.ai._freezeTimer = g.freezeDuration || 15;
    member.ai._freezePenalty = g.freezePenalty != null ? g.freezePenalty : 0.54;

    // Recoil visual — same as player (gun.recoilTimer = 6)
    g.recoilTimer = 6;

    if (g.ammo <= 0) {
      g.reloading = true;
      // Same reload formula as player: getReloadTime() = Math.round(20 + firerate * 0.25)
      // Bot's firerate stat is derived from rof points, use same calculation
      g.reloadTimer = g.reloadSpeed || Math.round(20 + (g._sparRof || 50) * 0.25);
    }
  },

  // Dodge incoming enemy bullets — optimized for 4-cardinal bullet paths
  _getIncomingBulletDodge(bot, team) {
    let dodgeX = 0, dodgeY = 0;
    const botHitY = bot.y + 5; // hitbox at feet level (entity.y + 5)
    // Circular entity hitbox (R=27 effective zone with bullet perpendicular)
    // Both axes have equal hit zone, but bullet is narrow perpendicular to travel
    // so dodging perpendicular is always the right move
    const dodgeLane = 35; // detect within 35px (effective zone ~27px, early warning)

    for (const b of bullets) {
      if (!b.sparTeam || b.sparTeam === team) continue;
      const dbx = bot.x - b.x, dby = botHitY - b.y;
      const bDist = Math.sqrt(dbx * dbx + dby * dby);
      if (bDist > 400 || bDist < 8) continue;

      // Urgency: closer = stronger dodge
      const urgency = Math.max(0.5, 1.2 - bDist / 350);

      if (Math.abs(b.vy) > Math.abs(b.vx)) {
        // Vertical bullet — dodge LEFT or RIGHT (perpendicular to travel)
        const isApproaching = (b.vy > 0 && b.y < botHitY) || (b.vy < 0 && b.y > botHitY);
        if (!isApproaching) continue;
        if (Math.abs(dbx) > dodgeLane) continue;
        const dodgeDir = dbx >= 0 ? 1 : -1;
        const laneProximity = Math.max(0.3, 1 - Math.abs(dbx) / dodgeLane);
        dodgeX += dodgeDir * urgency * laneProximity * 3.0;
      } else {
        // Horizontal bullet — dodge UP or DOWN (perpendicular to travel)
        const isApproaching = (b.vx > 0 && b.x < bot.x) || (b.vx < 0 && b.x > bot.x);
        if (!isApproaching) continue;
        if (Math.abs(dby) > dodgeLane) continue;
        const dodgeDir = dby >= 0 ? 1 : -1;
        const laneProximity = Math.max(0.3, 1 - Math.abs(dby) / dodgeLane);
        dodgeY += dodgeDir * urgency * laneProximity * 3.0;
      }
    }

    // Clamp total dodge so it doesn't exceed reasonable movement
    const dodgeLen = Math.sqrt(dodgeX * dodgeX + dodgeY * dodgeY);
    if (dodgeLen > 4) {
      dodgeX = (dodgeX / dodgeLen) * 4;
      dodgeY = (dodgeY / dodgeLen) * 4;
    }
    return { x: dodgeX, y: dodgeY };
  },

  // ---- LEARNING: collect player data each frame during fighting ----
  _collectPlayerData() {
    if (SparState.phase !== 'fighting') return;
    if (!SparState._matchCollector) {
      // Initialize collector at first call
      SparState._matchCollector = {
        samples: 0,
        posYSum: 0,       // normalized Y accumulator (0=top, 1=bottom)
        posXSum: 0,       // normalized X accumulator (0=left, 1=right)
        openingFrames: [],  // [{x,y}] for first 180 frames
        dodgeLeftCount: 0,  // vertical bullet dodges to the left
        dodgeRightCount: 0,
        dodgeUpCount: 0,    // horizontal bullet dodges up
        dodgeDownCount: 0,
        shotDirs: { up: 0, down: 0, left: 0, right: 0 },
        reloadYSamples: [],  // normalized Y when player is reloading
        distSamples: [],     // distance to nearest enemy
        aggrOnReload: 0,     // frames player pushes toward bot during bot reload
        aggrOnReloadTotal: 0,
        lowHpAggrFrames: 0,
        lowHpTotalFrames: 0,
        // --- Situational / relational data ---
        // When player has bottom
        hasBottom_frames: 0,        // total frames player had bottom
        hasBottom_holdFrames: 0,    // frames staying roughly same Y (holding)
        hasBottom_pushFrames: 0,    // frames moving toward bot
        hasBottom_shots: 0,         // shots fired while having bottom
        // When bot has bottom
        botBottom_frames: 0,
        botBottom_retakeFrames: 0,  // frames moving downward (trying to retake)
        botBottom_flankFrames: 0,   // frames moving horizontally more than vertically
        botBottom_retreatFrames: 0, // frames moving away from bot
        // When bot is approaching (closing distance)
        botApproach_frames: 0,
        botApproach_holdFrames: 0,  // player stays still or moves toward bot
        botApproach_counterFrames: 0, // player moves TOWARD approaching bot
        botApproach_sidestepFrames: 0, // player moves sideways
        // When bot is retreating
        botRetreat_frames: 0,
        botRetreat_chaseFrames: 0,  // player moves toward retreating bot
        botRetreat_shots: 0,        // shots while bot retreats
        // Shot direction by relative position
        shotWhenAbove: { down: 0, side: 0, total: 0 }, // player above bot
        shotWhenBelow: { up: 0, side: 0, total: 0 },   // player below bot
        shotWhenLevel: { left: 0, right: 0, total: 0 }, // roughly same Y
        // --- Opening tracking (v3) ---
        firstShotFrame: -1,        // frame player first fires
        openingShotCount: 0,       // shots during first 180 frames
        botYAtOpeningEnd: -1,      // bot Y position at frame 180
        playerYAtOpeningEnd: -1,   // player Y position at frame 180
        // --- Combat outcome tracking ---
        playerHits: [],    // [{dist, botMoving, botVx, botVy, dir, relY}]
        playerMisses: [],  // [{dist, botMoving, botVx, botVy, dir, relY}]
        botHits: [],       // [{dist, playerMoving, playerVx, playerVy, dir, relY}]
        botMisses: [],     // [{dist, playerMoving, playerVx, playerVy, dir, relY}]
        playerDmgFrames: [],  // [{frame, dmg, hasBottom}] — when player deals damage
        botDmgFrames: [],     // [{frame, dmg, hasBottom}] — when bot deals damage
        // Phase 1e: Circumstance-specific sampling
        afterHit_frames: 0,
        afterHit_aggrFrames: 0,
        afterTookHit_frames: 0,
        afterTookHit_retreatFrames: 0,
        lowHp_aggrFrames: 0,
        lowHp_fleeFrames: 0,
        chase_frames: 0,
        chase_giveUpFrames: 0,
        nearWall_frames: 0,
        nearWall_cornerStuckFrames: 0,
        // Position value tracking
        botHasBottom_frames: 0,
        botHasBottom_dmgDealt: 0,
        botHasBottom_dmgTaken: 0,
        botInTop_frames: 0,
        botInTop_dmgDealt: 0,
        botInTop_dmgTaken: 0,
        // Reinforcement posture tracking
        botUnderEnemy_frames: 0,
        botAboveEnemy_frames: 0,
        botGunAdv_frames: 0,
        botGunDisadv_frames: 0,
        // Gun side tracking (v4)
        playerGunSideSamples: { left: 0, right: 0 },
        // Directional hit rates — hitbox awareness (v4)
        hitsByBulletDir: { horiz: { hits: 0, total: 0 }, vert: { hits: 0, total: 0 } },
        botHitsByBulletDir: { horiz: { hits: 0, total: 0 }, vert: { hits: 0, total: 0 } },
        // Peek tracking: bot has bottom + shooting horizontal (v4)
        peekAttempts: 0,
        peekHits: 0,
      };
    }

    // Sample every 6 frames (10Hz)
    if (SparState.matchTimer % 6 !== 0) return;

    const c = SparState._matchCollector;
    const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
    if (!arenaLevel) return;
    const arenaW = arenaLevel.widthTiles * TILE;
    const arenaH = arenaLevel.heightTiles * TILE;

    // Normalized position (0-1)
    const normY = Math.max(0, Math.min(1, player.y / arenaH));
    const normX = Math.max(0, Math.min(1, player.x / arenaW));
    c.posYSum += normY;
    c.posXSum += normX;
    c.samples++;

    // Track player gun side (v4)
    const pGunSide = typeof getCurrentGunSide === 'function' ? getCurrentGunSide() : 'left';
    if (pGunSide === 'left') c.playerGunSideSamples.left++;
    else c.playerGunSideSamples.right++;

    // Opening movement (first 180 frames = 3 seconds)
    if (SparState.matchTimer <= 180) {
      c.openingFrames.push({ x: player.x, y: player.y, vx: player.vx || 0, vy: player.vy || 0 });
    }
    // Snapshot positions at end of opening for gotBottom tracking
    if (SparState.matchTimer >= 174 && SparState.matchTimer <= 186 && c.botYAtOpeningEnd < 0) {
      c.playerYAtOpeningEnd = player.y;
      const botE = SparState.teamB[0] && SparState.teamB[0].alive ? SparState.teamB[0].entity : null;
      if (botE) c.botYAtOpeningEnd = botE.y;
    }

    // Dodge direction tracking — check if player is moving away from nearby bullets
    for (const b of bullets) {
      if (!b.sparTeam || b.sparTeam === 'teamA') continue; // only enemy bullets
      const dbx = player.x - b.x, dby = player.y - b.y;
      const bDist = Math.sqrt(dbx * dbx + dby * dby);
      if (bDist > 200 || bDist < 20) continue;

      const pVx = player.vx || 0;
      const pVy = player.vy || 0;
      if (Math.abs(pVx) < 0.5 && Math.abs(pVy) < 0.5) continue;

      if (Math.abs(b.vy) > Math.abs(b.vx)) {
        // Vertical bullet — player dodges left/right
        if (pVx < -1) c.dodgeLeftCount++;
        else if (pVx > 1) c.dodgeRightCount++;
      } else {
        // Horizontal bullet — player dodges up/down
        if (pVy < -1) c.dodgeUpCount++;
        else if (pVy > 1) c.dodgeDownCount++;
      }
    }

    // Reload position tracking
    if (gun.reloading) {
      c.reloadYSamples.push(normY);
    }

    // Distance to nearest enemy
    let minDist = Infinity;
    for (const p of SparState.teamB) {
      if (!p.alive) continue;
      const edx = player.x - p.entity.x, edy = player.y - p.entity.y;
      const ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < minDist) minDist = ed;
    }
    if (minDist < Infinity) c.distSamples.push(minDist);

    // Aggression during bot reload
    for (const p of SparState.teamB) {
      if (!p.alive || !p.member) continue;
      if (p.member.gun.reloading) {
        c.aggrOnReloadTotal++;
        const edx = p.entity.x - player.x, edy = p.entity.y - player.y;
        const ed = Math.sqrt(edx * edx + edy * edy);
        const pVx = player.vx || 0, pVy = player.vy || 0;
        // Dot product of player velocity toward enemy
        if (ed > 1) {
          const dot = (pVx * edx + pVy * edy) / ed;
          if (dot > 1) c.aggrOnReload++;
        }
      }
    }

    // Low HP aggression
    const hpPct = player.hp / player.maxHp;
    if (hpPct < 0.35) {
      c.lowHpTotalFrames++;
      // Check if moving toward nearest enemy
      let nearestEnemy = null;
      let nearDist = Infinity;
      for (const p of SparState.teamB) {
        if (!p.alive) continue;
        const edx = p.entity.x - player.x, edy = p.entity.y - player.y;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed < nearDist) { nearDist = ed; nearestEnemy = p.entity; }
      }
      if (nearestEnemy && nearDist > 1) {
        const pVx = player.vx || 0, pVy = player.vy || 0;
        const edx = nearestEnemy.x - player.x, edy = nearestEnemy.y - player.y;
        const dot = (pVx * edx + pVy * edy) / nearDist;
        if (dot > 1) c.lowHpAggrFrames++;
      }
    }

    // ---- Situational / relational data collection ----
    // Find nearest bot enemy for relational tracking
    let nearBot = null;
    let nearBotDist = Infinity;
    for (const p of SparState.teamB) {
      if (!p.alive) continue;
      const edx = p.entity.x - player.x, edy = p.entity.y - player.y;
      const ed = Math.sqrt(edx * edx + edy * edy);
      if (ed < nearBotDist) { nearBotDist = ed; nearBot = p; }
    }
    if (!nearBot) return;
    const botE = nearBot.entity;
    const pVx = player.vx || 0, pVy = player.vy || 0;
    const botVx = botE.vx || 0, botVy = botE.vy || 0;
    const relDx = botE.x - player.x, relDy = botE.y - player.y;
    const playerHasBottom = player.y > botE.y + 30;
    const botHasBottom = botE.y > player.y + 30;

    // --- When player has bottom ---
    if (playerHasBottom) {
      c.hasBottom_frames++;
      // Holding: player not moving much vertically (staying in position)
      if (Math.abs(pVy) < 2) c.hasBottom_holdFrames++;
      // Pushing: player moving toward bot (upward since player is below)
      if (pVy < -2 && nearBotDist < 400) c.hasBottom_pushFrames++;
    }

    // --- When bot has bottom ---
    if (botHasBottom) {
      c.botBottom_frames++;
      // Retaking: player moving downward (toward bottom)
      if (pVy > 2) c.botBottom_retakeFrames++;
      // Flanking: player moving more horizontally than vertically
      if (Math.abs(pVx) > Math.abs(pVy) + 1 && Math.abs(pVx) > 2) c.botBottom_flankFrames++;
      // Retreating: player moving away from bot (increasing distance)
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot < -2) c.botBottom_retreatFrames++;
      }
    }

    // --- When bot is approaching player (closing distance) ---
    if (nearBotDist > 1 && nearBotDist < 400) {
      const botClosing = (botVx * -relDx + botVy * -relDy) / nearBotDist;
      if (botClosing > 2) {
        // Bot is closing distance on player
        c.botApproach_frames++;
        // Player holds ground (doesn't move away much)
        const playerFlee = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (playerFlee > 1) {
          c.botApproach_counterFrames++; // moving TOWARD the approaching bot
        } else if (playerFlee > -1) {
          c.botApproach_holdFrames++; // standing ground
        }
        // Sidestep: perpendicular movement
        const perp = Math.abs(pVx * relDy - pVy * relDx) / nearBotDist;
        if (perp > 3) c.botApproach_sidestepFrames++;
      }

      // --- When bot is retreating (moving away from player) ---
      const botRetreating = (botVx * relDx + botVy * relDy) / nearBotDist;
      if (botRetreating > 2) {
        c.botRetreat_frames++;
        // Player chasing: moving toward retreating bot
        const playerChase = (pVx * -relDx + pVy * -relDy) / nearBotDist;
        if (playerChase > 1) c.botRetreat_chaseFrames++;
      }
    }

    // --- Shot direction by relative position ---
    // Track what direction the player was LAST shooting (use player.dir)
    // Only count if player is actively shooting (check fire cooldown proxy: recent shot)
    const recentShot = c.shotDirs.up + c.shotDirs.down + c.shotDirs.left + c.shotDirs.right;
    const prevTotal = c._prevShotTotal || 0;
    if (recentShot > prevTotal) {
      // A shot was fired this sample window
      const vertDiff = Math.abs(player.y - botE.y);
      if (player.y < botE.y - 40) {
        // Player is ABOVE bot
        c.shotWhenAbove.total++;
        if (player.dir === 0) c.shotWhenAbove.down++; // shooting down toward bot
        else c.shotWhenAbove.side++;
      } else if (player.y > botE.y + 40) {
        // Player is BELOW bot
        c.shotWhenBelow.total++;
        if (player.dir === 1) c.shotWhenBelow.up++; // shooting up toward bot
        else c.shotWhenBelow.side++;
      } else {
        // Roughly same Y level
        c.shotWhenLevel.total++;
        if (player.dir === 2) c.shotWhenLevel.left++;
        else if (player.dir === 3) c.shotWhenLevel.right++;
      }
    }
    c._prevShotTotal = recentShot;

    // --- Track shots while having bottom / bot retreating ---
    if (playerHasBottom && recentShot > prevTotal) c.hasBottom_shots++;
    if (nearBotDist > 1 && nearBotDist < 400) {
      const botRetreating2 = (botVx * relDx + botVy * relDy) / nearBotDist;
      if (botRetreating2 > 2 && recentShot > prevTotal) c.botRetreat_shots++;
    }

    // --- Phase 1e: Circumstance-specific sampling ---
    // After-hit tracking: did player just hit the bot?
    const recentPlayerHit = c.playerDmgFrames.length > 0 &&
      (SparState.matchTimer - c.playerDmgFrames[c.playerDmgFrames.length - 1].frame) < 30;
    if (recentPlayerHit) {
      c.afterHit_frames++;
      // Is player pushing toward bot (aggressive after hit)?
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot > 1) c.afterHit_aggrFrames++;
      }
    }

    // After-took-hit tracking: did player just take damage?
    const recentPlayerTookHit = c.botDmgFrames.length > 0 &&
      (SparState.matchTimer - c.botDmgFrames[c.botDmgFrames.length - 1].frame) < 30;
    if (recentPlayerTookHit) {
      c.afterTookHit_frames++;
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot < -1) c.afterTookHit_retreatFrames++;
      }
    }

    // Low HP expanded: flee vs aggress
    if (hpPct < 0.25) {
      if (nearBotDist > 1) {
        const dot = (pVx * relDx + pVy * relDy) / nearBotDist;
        if (dot < -1) c.lowHp_fleeFrames++;
      }
    }

    // Chase tracking
    if (nearBotDist > 1 && nearBotDist < 400) {
      const playerChasing = (pVx * relDx + pVy * relDy) / nearBotDist;
      if (playerChasing > 2) {
        c.chase_frames++;
      }
      // Give-up detection: was chasing but stopped
      if (c.chase_frames > 30 && Math.abs(pVx) < 1 && Math.abs(pVy) < 1) {
        c.chase_giveUpFrames++;
      }
    }

    // Position value tracking (for bot's position, not player's)
    // This tracks damage dealt/taken while bot is in bottom vs top
    if (SparState.teamB && SparState.teamB.length > 0) {
      const dBot = SparState.teamB[0];
      if (dBot && dBot.alive && dBot.entity) {
        const bMidY = arenaLevel ? arenaLevel.heightTiles * TILE / 2 : 480;
        const botIsBottom = dBot.entity.y > player.y + 30;
        const botIsTop = dBot.entity.y < bMidY;
        if (botIsBottom) c.botHasBottom_frames++;
        if (botIsTop) c.botInTop_frames++;
      }
    }

    // Reinforcement posture tracking: staying under the enemy is generally strong,
    // and using the better gun-side lane matters even when not literally at bottom.
    if (SparState.teamB && SparState.teamB.length > 0) {
      const dBot = SparState.teamB[0];
      if (dBot && dBot.alive && dBot.entity) {
        if (dBot.entity.y > player.y + 20) c.botUnderEnemy_frames++;
        else if (dBot.entity.y < player.y - 20) c.botAboveEnemy_frames++;

        const botLane = this._getGunSideLaneScore(dBot.entity, player);
        const playerLane = this._getGunSideLaneScore(player, dBot.entity);
        if (botLane > playerLane + 0.08) c.botGunAdv_frames++;
        else if (playerLane > botLane + 0.08) c.botGunDisadv_frames++;
      }
    }

    // Near-wall tracking
    const arenaLevelW = arenaLevel.widthTiles * TILE;
    const arenaLevelH = arenaLevel.heightTiles * TILE;
    const pNearWall = player.x < TILE * 3 || player.x > arenaLevelW - TILE * 3 ||
                      player.y < TILE * 3 || player.y > arenaLevelH - TILE * 3;
    if (pNearWall) {
      c.nearWall_frames++;
      if (Math.abs(pVx) < 1 && Math.abs(pVy) < 1) c.nearWall_cornerStuckFrames++;
    }
  },

  // ---- LEARNING: update persistent profile at match end ----
  _updateLearningProfile(won) {
    const c = SparState._matchCollector;
    if (!c || c.samples < 3) { SparState._matchCollector = null; return; }
    if (typeof sparLearning === 'undefined') { SparState._matchCollector = null; return; }

    const enemyBot1v1 = SparState.teamB[0] && SparState.teamB[0].member;

    // Skip player profile learning during automated training — training bots
    // have scripted behavior that would pollute human-player telemetry.
    // We still update the general reinforcement buckets so bulk sims keep
    // teaching the bot broad meta/style preferences.
    if (typeof _isSparTraining === 'function' && _isSparTraining()) {
      const scopes = (typeof _isSparSelfPlay === 'function' && _isSparSelfPlay())
        ? ['general', 'selfPlay']
        : ['general'];
      this._updateMatchReinforcement(won, c, enemyBot1v1, scopes);
      SparState._matchCollector = null;
      return;
    }

    const alpha = 0.72; // EMA weight for new data — fast personal adaptation
    const ema = (oldVal, newVal) => alpha * newVal + (1 - alpha) * oldVal;
    const sl = sparLearning;

    sl.matchCount++;

    // --- Opening analysis ---
    if (c.openingFrames.length > 5) {
      const first = c.openingFrames[0];
      const last = c.openingFrames[c.openingFrames.length - 1];
      const dyOpening = last.y - first.y;
      const dxOpening = last.x - first.x;
      // rushBottom: did player move downward (positive Y = down)?
      const rushed = dyOpening > 30 ? 1 : (dyOpening > 0 ? 0.5 : 0);
      sl.opening.rushBottom = ema(sl.opening.rushBottom, rushed);

      // Strafe bias: average horizontal velocity direction
      let leftFrames = 0, totalFrames = 0;
      for (const f of c.openingFrames) {
        if (Math.abs(f.vx) > 0.5) {
          totalFrames++;
          if (f.vx < 0) leftFrames++;
        }
      }
      if (totalFrames > 3) {
        sl.opening.strafeLeft = ema(sl.opening.strafeLeft, leftFrames / totalFrames);
      }

      // v3: Classify opening route
      const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
      const arenaW = arenaLevel ? arenaLevel.widthTiles * TILE : 1;
      const arenaH = arenaLevel ? arenaLevel.heightTiles * TILE : 1;
      const endNormX = last.x / arenaW;
      const endNormY = last.y / arenaH;
      let route = 'midFlank';
      if (endNormY > 0.6) {
        // Went to bottom — which side?
        if (endNormX < 0.4) route = 'bottomLeft';
        else if (endNormX > 0.6) route = 'bottomRight';
        else route = 'bottomCenter';
      } else if (endNormY < 0.35) {
        route = 'topHold';
      }
      sl.opening.route = route;
      if (sl.opening.routeCounts[route] !== undefined) sl.opening.routeCounts[route]++;

      // Speed commitment: how much of max distance did player cover?
      const totalDist = Math.sqrt(dxOpening * dxOpening + dyOpening * dyOpening);
      const maxPossible = SPAR_CONFIG.BOT_SPEED * c.openingFrames.length * 6; // 6 frames per sample
      sl.opening.speedPct = ema(sl.opening.speedPct, Math.min(1, totalDist / Math.max(1, maxPossible)));

      // First shot timing
      if (c.firstShotFrame > 0) {
        sl.opening.firstShotFrame = ema(sl.opening.firstShotFrame, c.firstShotFrame);
      }
      // Shoots during opening?
      sl.opening.shootsDuringOpening = ema(sl.opening.shootsDuringOpening, c.openingShotCount > 0 ? 1 : 0);

      // Did player actually secure bottom by end of opening?
      if (c.botYAtOpeningEnd > 0) {
        const gotBottom = last.y > c.botYAtOpeningEnd + 20 ? 1 : 0;
        sl.opening.takesBottomPct = ema(sl.opening.takesBottomPct, gotBottom);
      }
    }

    // --- Bot opening results ---
    if (sl.botOpenings && SparState._botOpeningRoute) {
      const bRoute = SparState._botOpeningRoute;
      const rr = sl.botOpenings.routeResults[bRoute];
      if (rr) {
        if (typeof rr.failStreak !== 'number') rr.failStreak = 0;
        rr.total++;
        if (won) {
          rr.losses++;
          rr.failStreak++;
        } else {
          rr.wins++;
          rr.failStreak = 0;
        }
        // Did bot get bottom at END OF OPENING (frame ~180), not match end
        if (c.botYAtOpeningEnd > 0 && c.playerYAtOpeningEnd > 0) {
          if (c.botYAtOpeningEnd > c.playerYAtOpeningEnd + 20) rr.gotBottom++;
        }
      }
      sl.botOpenings.lastRoute = bRoute;
    }

    // --- Position bias ---
    sl.position.bottomBias = ema(sl.position.bottomBias, c.posYSum / c.samples);
    sl.position.leftBias = ema(sl.position.leftBias, 1 - c.posXSum / c.samples);

    // --- Shooting directions ---
    const totalShots = c.shotDirs.up + c.shotDirs.down + c.shotDirs.left + c.shotDirs.right;
    if (totalShots > 5) {
      sl.shooting.upPct = ema(sl.shooting.upPct, c.shotDirs.up / totalShots);
      sl.shooting.downPct = ema(sl.shooting.downPct, c.shotDirs.down / totalShots);
      sl.shooting.leftPct = ema(sl.shooting.leftPct, c.shotDirs.left / totalShots);
      sl.shooting.rightPct = ema(sl.shooting.rightPct, c.shotDirs.right / totalShots);
    }

    // --- Dodge bias ---
    const dodgeHTotal = c.dodgeLeftCount + c.dodgeRightCount;
    if (dodgeHTotal > 3) {
      sl.dodging.leftBias = ema(sl.dodging.leftBias, c.dodgeLeftCount / dodgeHTotal);
    }
    const dodgeVTotal = c.dodgeUpCount + c.dodgeDownCount;
    if (dodgeVTotal > 3) {
      sl.dodging.upBias = ema(sl.dodging.upBias, c.dodgeUpCount / dodgeVTotal);
    }

    // --- Aggression ---
    // Overall: based on average distance (closer = more aggressive)
    if (c.distSamples.length > 5) {
      const avgDist = c.distSamples.reduce((a, b) => a + b, 0) / c.distSamples.length;
      // Normalize: 0 dist = 1.0 aggression, 500+ dist = 0.0
      const aggrVal = Math.max(0, Math.min(1, 1 - avgDist / 500));
      sl.aggression.overall = ema(sl.aggression.overall, aggrVal);
    }
    if (c.aggrOnReloadTotal > 3) {
      sl.aggression.onEnemyReload = ema(sl.aggression.onEnemyReload, c.aggrOnReload / c.aggrOnReloadTotal);
    }
    if (c.lowHpTotalFrames > 3) {
      sl.aggression.whenLowHp = ema(sl.aggression.whenLowHp, c.lowHpAggrFrames / c.lowHpTotalFrames);
    }

    // --- Reload position ---
    if (c.reloadYSamples.length > 2) {
      const avgReloadY = c.reloadYSamples.reduce((a, b) => a + b, 0) / c.reloadYSamples.length;
      sl.reload.avgNormalizedY = ema(sl.reload.avgNormalizedY, avgReloadY);
    }

    // --- Situational / relational learning (v2) ---

    // When player has bottom: holding, pushing, shot frequency
    if (c.hasBottom_frames > 5) {
      sl.whenHasBottom.holdsPct = ema(sl.whenHasBottom.holdsPct, c.hasBottom_holdFrames / c.hasBottom_frames);
      sl.whenHasBottom.pushPct = ema(sl.whenHasBottom.pushPct, c.hasBottom_pushFrames / c.hasBottom_frames);
      // Shot frequency: shots per frame while having bottom (normalized 0-1, cap at ~0.2 shots/frame)
      const shotFreq = Math.min(1, (c.hasBottom_shots / c.hasBottom_frames) / 0.2);
      sl.whenHasBottom.shotFreq = ema(sl.whenHasBottom.shotFreq, shotFreq);
    }

    // When bot has bottom: retake, flank, retreat
    if (c.botBottom_frames > 5) {
      sl.whenBotHasBottom.retakePct = ema(sl.whenBotHasBottom.retakePct, c.botBottom_retakeFrames / c.botBottom_frames);
      sl.whenBotHasBottom.flankPct = ema(sl.whenBotHasBottom.flankPct, c.botBottom_flankFrames / c.botBottom_frames);
      sl.whenBotHasBottom.retreatPct = ema(sl.whenBotHasBottom.retreatPct, c.botBottom_retreatFrames / c.botBottom_frames);
    }

    // When bot approaches: hold ground, counter-push, sidestep
    if (c.botApproach_frames > 5) {
      sl.whenBotApproaches.holdGroundPct = ema(sl.whenBotApproaches.holdGroundPct, c.botApproach_holdFrames / c.botApproach_frames);
      sl.whenBotApproaches.counterPushPct = ema(sl.whenBotApproaches.counterPushPct, c.botApproach_counterFrames / c.botApproach_frames);
      sl.whenBotApproaches.sidestepPct = ema(sl.whenBotApproaches.sidestepPct, c.botApproach_sidestepFrames / c.botApproach_frames);
    }

    // When bot retreats: chase, shot frequency
    if (c.botRetreat_frames > 5) {
      sl.whenBotRetreats.chasePct = ema(sl.whenBotRetreats.chasePct, c.botRetreat_chaseFrames / c.botRetreat_frames);
      const chaseShots = Math.min(1, (c.botRetreat_shots / c.botRetreat_frames) / 0.2);
      sl.whenBotRetreats.shotFreq = ema(sl.whenBotRetreats.shotFreq, chaseShots);
    }

    // Shot direction by relative position
    if (c.shotWhenAbove.total > 3) {
      sl.shotByPosition.whenAbove.downPct = ema(sl.shotByPosition.whenAbove.downPct, c.shotWhenAbove.down / c.shotWhenAbove.total);
      sl.shotByPosition.whenAbove.sidePct = ema(sl.shotByPosition.whenAbove.sidePct, c.shotWhenAbove.side / c.shotWhenAbove.total);
    }
    if (c.shotWhenBelow.total > 3) {
      sl.shotByPosition.whenBelow.upPct = ema(sl.shotByPosition.whenBelow.upPct, c.shotWhenBelow.up / c.shotWhenBelow.total);
      sl.shotByPosition.whenBelow.sidePct = ema(sl.shotByPosition.whenBelow.sidePct, c.shotWhenBelow.side / c.shotWhenBelow.total);
    }
    if (c.shotWhenLevel.total > 3) {
      sl.shotByPosition.whenLevel.leftPct = ema(sl.shotByPosition.whenLevel.leftPct, c.shotWhenLevel.left / c.shotWhenLevel.total);
      sl.shotByPosition.whenLevel.rightPct = ema(sl.shotByPosition.whenLevel.rightPct, c.shotWhenLevel.right / c.shotWhenLevel.total);
    }

    // --- Combat outcomes (v2) ---
    // Player shot accuracy by context
    const pH = c.playerHits, pM = c.playerMisses;
    const pTotal = pH.length + pM.length;
    if (pTotal > 3) {
      sl.playerShots.hitRate = ema(sl.playerShots.hitRate, pH.length / pTotal);

      // By distance
      const closeH = pH.filter(r => r.dist < 150).length;
      const closeM = pM.filter(r => r.dist < 150).length;
      if (closeH + closeM > 2) sl.playerShots.hitRateClose = ema(sl.playerShots.hitRateClose, closeH / (closeH + closeM));

      const midH = pH.filter(r => r.dist >= 150 && r.dist < 300).length;
      const midM = pM.filter(r => r.dist >= 150 && r.dist < 300).length;
      if (midH + midM > 2) sl.playerShots.hitRateMid = ema(sl.playerShots.hitRateMid, midH / (midH + midM));

      const farH = pH.filter(r => r.dist >= 300).length;
      const farM = pM.filter(r => r.dist >= 300).length;
      if (farH + farM > 2) sl.playerShots.hitRateFar = ema(sl.playerShots.hitRateFar, farH / (farH + farM));

      // By bot movement state
      const strafH = pH.filter(r => r.tMovement === 'strafe').length;
      const strafM = pM.filter(r => r.tMovement === 'strafe').length;
      if (strafH + strafM > 2) sl.playerShots.hitWhenBotStrafing = ema(sl.playerShots.hitWhenBotStrafing, strafH / (strafH + strafM));

      const stillH = pH.filter(r => r.tMovement === 'still').length;
      const stillM = pM.filter(r => r.tMovement === 'still').length;
      if (stillH + stillM > 2) sl.playerShots.hitWhenBotStill = ema(sl.playerShots.hitWhenBotStill, stillH / (stillH + stillM));

      const apprH = pH.filter(r => r.tMovement === 'approach').length;
      const apprM = pM.filter(r => r.tMovement === 'approach').length;
      if (apprH + apprM > 2) sl.playerShots.hitWhenBotApproach = ema(sl.playerShots.hitWhenBotApproach, apprH / (apprH + apprM));

      const retH = pH.filter(r => r.tMovement === 'retreat').length;
      const retM = pM.filter(r => r.tMovement === 'retreat').length;
      if (retH + retM > 2) sl.playerShots.hitWhenBotRetreat = ema(sl.playerShots.hitWhenBotRetreat, retH / (retH + retM));
    }

    // Bot shot accuracy
    const bH = c.botHits, bM = c.botMisses;
    const bTotal = bH.length + bM.length;
    if (bTotal > 3) {
      sl.botShots.hitRate = ema(sl.botShots.hitRate, bH.length / bTotal);

      const dodged = bM.filter(r => r.tMovement !== 'still').length;
      if (bTotal > 5) sl.botShots.dodgedRate = ema(sl.botShots.dodgedRate, dodged / bTotal);

      const pStrafH = bH.filter(r => r.tMovement === 'strafe').length;
      const pStrafT = pStrafH + bM.filter(r => r.tMovement === 'strafe').length;
      if (pStrafT > 2) sl.botShots.hitWhenPlayerStrafing = ema(sl.botShots.hitWhenPlayerStrafing, pStrafH / pStrafT);

      const pStillH = bH.filter(r => r.tMovement === 'still').length;
      const pStillT = pStillH + bM.filter(r => r.tMovement === 'still').length;
      if (pStillT > 2) sl.botShots.hitWhenPlayerStill = ema(sl.botShots.hitWhenPlayerStill, pStillH / pStillT);

      const pApprH = bH.filter(r => r.tMovement === 'approach').length;
      const pApprT = pApprH + bM.filter(r => r.tMovement === 'approach').length;
      if (pApprT > 2) sl.botShots.hitWhenPlayerApproach = ema(sl.botShots.hitWhenPlayerApproach, pApprH / pApprT);
    }

    // Combat patterns
    if (pH.length > 2) {
      const avgPDist = pH.reduce((s, r) => s + r.dist, 0) / pH.length;
      sl.combatPatterns.playerHitDist = ema(sl.combatPatterns.playerHitDist, avgPDist);
    }
    if (bH.length > 2) {
      const avgBDist = bH.reduce((s, r) => s + r.dist, 0) / bH.length;
      sl.combatPatterns.botHitDist = ema(sl.combatPatterns.botHitDist, avgBDist);
    }

    // Damage while having bottom
    const pDmgTotal = c.playerDmgFrames.reduce((s, f) => s + f.dmg, 0);
    const pDmgBottom = c.playerDmgFrames.filter(f => f.hasBottom).reduce((s, f) => s + f.dmg, 0);
    if (pDmgTotal > 0) {
      sl.combatPatterns.playerDmgWhenHasBottom = ema(sl.combatPatterns.playerDmgWhenHasBottom, pDmgBottom / pDmgTotal);
    }
    const bDmgTotal = c.botDmgFrames.reduce((s, f) => s + f.dmg, 0);
    const bDmgBottom = c.botDmgFrames.filter(f => f.hasBottom).reduce((s, f) => s + f.dmg, 0);
    if (bDmgTotal > 0) {
      sl.combatPatterns.botDmgWhenHasBottom = ema(sl.combatPatterns.botDmgWhenHasBottom, bDmgBottom / bDmgTotal);
    }

    // Trade ratio: when both deal damage within 30 frames of each other
    let tradePlayerDmg = 0, tradeBotDmg = 0;
    for (const pf of c.playerDmgFrames) {
      for (const bf of c.botDmgFrames) {
        if (Math.abs(pf.frame - bf.frame) <= 30) {
          tradePlayerDmg += pf.dmg;
          tradeBotDmg += bf.dmg;
          break;
        }
      }
    }
    if (tradePlayerDmg + tradeBotDmg > 0) {
      sl.combatPatterns.tradeRatio = ema(sl.combatPatterns.tradeRatio, tradePlayerDmg / (tradePlayerDmg + tradeBotDmg));
    }

    // --- Phase 1e: Circumstance EMA updates ---
    if (!sl.afterHit) sl.afterHit = { pressesAdvantage: 0.5, retreatsOnDamage: 0.5 };
    if (!sl.lowHpExpanded) sl.lowHpExpanded = { fleesPct: 0.5, killAttemptPct: 0.5 };
    if (!sl.chasePatterns) sl.chasePatterns = { giveUpFrames: 90 };
    if (!sl.nearWall) sl.nearWall = { cornerStuckPct: 0.3 };

    if (c.afterHit_frames > 3) {
      sl.afterHit.pressesAdvantage = ema(sl.afterHit.pressesAdvantage, c.afterHit_aggrFrames / c.afterHit_frames);
    }
    if (c.afterTookHit_frames > 3) {
      sl.afterHit.retreatsOnDamage = ema(sl.afterHit.retreatsOnDamage, c.afterTookHit_retreatFrames / c.afterTookHit_frames);
    }
    if (c.lowHpTotalFrames > 3) {
      const flees = c.lowHp_fleeFrames / c.lowHpTotalFrames;
      sl.lowHpExpanded.fleesPct = ema(sl.lowHpExpanded.fleesPct, flees);
      sl.lowHpExpanded.killAttemptPct = ema(sl.lowHpExpanded.killAttemptPct, 1 - flees);
    }
    if (c.chase_frames > 10) {
      const giveUpRate = c.chase_giveUpFrames / c.chase_frames;
      sl.chasePatterns.giveUpFrames = ema(sl.chasePatterns.giveUpFrames, giveUpRate > 0.1 ? c.chase_frames : 180);
    }
    if (c.nearWall_frames > 5) {
      sl.nearWall.cornerStuckPct = ema(sl.nearWall.cornerStuckPct, c.nearWall_cornerStuckFrames / c.nearWall_frames);
    }

    // --- Position value: how well does the bot perform from bottom vs top? ---
    if (!sl.positionValue) sl.positionValue = { bottomWinCorrelation: 0.6, topPenalty: 0.3 };
    const totalSampleFrames = c.botHasBottom_frames + c.botInTop_frames;
    if (totalSampleFrames > 10) {
      // bottomWinCorrelation: did having bottom predict the match outcome?
      // Bot had bottom + bot won → bottom helps (1.0)
      // Bot had NO bottom + bot lost → bottom matters (1.0)
      // Bot had bottom + bot lost → bottom didn't help (0.0)
      // Bot had NO bottom + bot won → bottom doesn't matter (0.0)
      const botWon = !won;
      const botHadBottom = c.botHasBottom_frames / (c.samples || 1) > 0.3;
      const bottomPredictedOutcome = (botHadBottom === botWon) ? 1.0 : 0.0;
      sl.positionValue.bottomWinCorrelation = ema(sl.positionValue.bottomWinCorrelation, bottomPredictedOutcome);
      // topPenalty: how much time in top half when bot loses
      const topPct = c.botInTop_frames / (c.samples || 1);
      sl.positionValue.topPenalty = ema(sl.positionValue.topPenalty,
        botWon ? 0 : topPct);
    }

    // --- Gun side preference (v4) ---
    if (!sl.gunSide) sl.gunSide = { playerPreference: 'left', leftPct: 1.0 };
    const gsTotal = c.playerGunSideSamples.left + c.playerGunSideSamples.right;
    if (gsTotal > 3) {
      const leftPct = c.playerGunSideSamples.left / gsTotal;
      sl.gunSide.leftPct = ema(sl.gunSide.leftPct, leftPct);
      sl.gunSide.playerPreference = sl.gunSide.leftPct > 0.5 ? 'left' : 'right';
    }

    // --- Hitbox awareness: directional hit rates (v4) ---
    if (!sl.hitboxAwareness) sl.hitboxAwareness = { playerHorizHitRate: 0.1, playerVertHitRate: 0.05, botHorizHitRate: 0.1, botVertHitRate: 0.05, peekSuccessRate: 0.5 };
    const phDir = c.hitsByBulletDir;
    if (phDir.horiz.total > 2) sl.hitboxAwareness.playerHorizHitRate = ema(sl.hitboxAwareness.playerHorizHitRate, phDir.horiz.hits / phDir.horiz.total);
    if (phDir.vert.total > 2) sl.hitboxAwareness.playerVertHitRate = ema(sl.hitboxAwareness.playerVertHitRate, phDir.vert.hits / phDir.vert.total);
    const bhDir = c.botHitsByBulletDir;
    if (bhDir.horiz.total > 2) sl.hitboxAwareness.botHorizHitRate = ema(sl.hitboxAwareness.botHorizHitRate, bhDir.horiz.hits / bhDir.horiz.total);
    if (bhDir.vert.total > 2) sl.hitboxAwareness.botVertHitRate = ema(sl.hitboxAwareness.botVertHitRate, bhDir.vert.hits / bhDir.vert.total);
    if (c.peekAttempts > 2) sl.hitboxAwareness.peekSuccessRate = ema(sl.hitboxAwareness.peekSuccessRate, c.peekHits / c.peekAttempts);

    // --- Win rate ---
    sl.winRate = ema(sl.winRate, won ? 1 : 0);

    // --- Match history (cap at 20) ---
    sl.history.push({
      won: won,
      matchTimer: SparState.matchTimer,
      shots: totalShots,
      bottomBias: c.samples > 0 ? c.posYSum / c.samples : 0.5,
      ts: Date.now(),
    });
    if (sl.history.length > 20) sl.history = sl.history.slice(-20);

    // --- Phase 2e: Style result tracking ---
    // Find the enemy bot's duel style for this match
    if (enemyBot1v1 && enemyBot1v1.ai._duelStyle) {
      const style = enemyBot1v1.ai._duelStyle;
      // Ensure structure exists
      if (!sl.general1v1) sl.general1v1 = { styleResults: {} };
      if (!sl.general1v1.styleResults) sl.general1v1.styleResults = {};
      if (!sl.general1v1.styleResults[style]) {
        sl.general1v1.styleResults[style] = { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 };
      }
      const sr = sl.general1v1.styleResults[style];
      sr.total++;
      if (won) sr.losses++; else sr.wins++; // won = player won, so bot lost
      // Damage delta: bot damage dealt minus taken
      const dmgDelta = (enemyBot1v1.ai._matchDmgDealt || 0) - (enemyBot1v1.ai._matchDmgTaken || 0);
      sr.avgDmgDelta = sr.total > 1 ? ema(sr.avgDmgDelta, dmgDelta) : dmgDelta;

      // Player-specific style results (training is already early-returned above)
      if (!sl.player1v1) sl.player1v1 = { styleResults: {} };
      if (!sl.player1v1.styleResults) sl.player1v1.styleResults = {};
      if (!sl.player1v1.styleResults[style]) {
        sl.player1v1.styleResults[style] = { wins: 0, losses: 0, total: 0, avgDmgDelta: 0 };
      }
      const jr = sl.player1v1.styleResults[style];
      jr.total++;
      if (won) jr.losses++; else jr.wins++;
      jr.avgDmgDelta = jr.total > 1 ? ema(jr.avgDmgDelta, dmgDelta) : dmgDelta;
    }

    this._updateMatchReinforcement(won, c, enemyBot1v1, ['general', 'player']);

    SparState._matchCollector = null;
  },

  // ---- LEARNING: compute bot behavior modifiers from player profile ----
  _getProfileModifiers() {
    if (typeof sparLearning === 'undefined' || sparLearning.matchCount < 2) {
      return null; // not enough data yet — bot stays fully neutral
    }
    const sl = sparLearning;
    const mc = sl.matchCount;

    // Confidence gating: lower thresholds for fast adaptation
    const hasShootingData = mc >= 3;   // shooting direction bias (high signal)
    const hasPositionData = mc >= 3;   // bottom/position modifiers
    const hasOpeningData = mc >= 2;    // opening route selection (very high signal)
    const hasCombatData = mc >= 4;     // combat outcomes (needs more samples)

    // Opening goal Y: if player rushes bottom, bot should also rush bottom harder
    const openingGoalY = hasOpeningData && sl.opening.rushBottom > 0.6 ? 0.82 : 0.72;

    // Counter player's opening strafe
    const openingStrafeDir = hasOpeningData ? (sl.opening.strafeLeft > 0.6 ? 1 : (sl.opening.strafeLeft < 0.4 ? -1 : 0)) : 0;

    // Aggression multiplier: counter-play (wider range for faster felt impact)
    const aggressionMult = mc >= 2 ? (1.5 - sl.aggression.overall * 1.0) : 1.0; // 0.5 to 1.5

    // Dodge prediction bias
    const dodgePredictBiasX = mc >= 3 ? (sl.dodging.leftBias - 0.5) * 2 : 0; // -1 to 1

    // Preferred X offset: stay off player's shot axis
    const vertShotPct = sl.shooting.upPct + sl.shooting.downPct;
    const horizShotPct = sl.shooting.leftPct + sl.shooting.rightPct;
    const preferredOffsetX = hasShootingData ? (vertShotPct - horizShotPct) * 0.5 : 0; // -0.5 to 0.5

    // Strafe speed: based on win rate (losing = speed up, NEVER exceed player speed)
    const strafeSpeedMult = Math.min(1.0, 1.25 - sl.winRate * 0.5); // 0.75 to 1.0

    // --- Situational modifiers (v2) ---

    // Situational modifiers — gated until position data available
    // When we have bottom and player tries to retake:
    const playerRetakes = hasPositionData ? sl.whenBotHasBottom.retakePct : 0;
    const playerFlanks = hasPositionData ? sl.whenBotHasBottom.flankPct : 0;
    const playerRetreats = hasPositionData ? sl.whenBotHasBottom.retreatPct : 0;

    // When player has bottom:
    const playerHoldsBottom = hasPositionData ? sl.whenHasBottom.holdsPct : 0;
    const playerWallsFromBottom = hasPositionData ? sl.whenHasBottom.shotFreq : 0;
    const playerPushesFromBottom = hasPositionData ? sl.whenHasBottom.pushPct : 0;

    // When bot approaches: does player stand or run?
    const playerHoldsOnApproach = hasPositionData ? sl.whenBotApproaches.holdGroundPct : 0;
    const playerCounterPushes = hasPositionData ? sl.whenBotApproaches.counterPushPct : 0;
    const playerSidesteps = hasPositionData ? sl.whenBotApproaches.sidestepPct : 0;

    // When bot retreats: does player chase?
    const playerChases = hasPositionData ? sl.whenBotRetreats.chasePct : 0;

    // Shot patterns by position: which direction to avoid from each angle
    const aboveShootsDown = hasShootingData ? sl.shotByPosition.whenAbove.downPct : 0.5;
    const belowShootsUp = hasShootingData ? sl.shotByPosition.whenBelow.upPct : 0.5;
    const levelShootsLeft = hasShootingData ? sl.shotByPosition.whenLevel.leftPct : 0.5;

    // --- Combat outcome modifiers ---
    const ps = sl.playerShots;
    const bs = sl.botShots;
    const cp = sl.combatPatterns;
    // hasCombatData already set above in confidence gating

    // Player's best range: where they're most accurate → bot should avoid that distance
    let bestRange = 'mid';
    let preferredDist = 220; // neutral default
    if (hasCombatData) {
      const ranges = [
        { name: 'close', rate: ps.hitRateClose, dist: 120 },
        { name: 'mid', rate: ps.hitRateMid, dist: 220 },
        { name: 'far', rate: ps.hitRateFar, dist: 350 },
      ];
      ranges.sort((a, b) => a.rate - b.rate); // lowest accuracy first
      bestRange = ranges[0].name;
      preferredDist = ranges[0].dist;
    }

    // What bot movement is hardest for player to hit?
    let botMoveEffectiveness = { strafe: 0.5, still: 0.5, approach: 0.5, retreat: 0.5 };
    let bestEvasion = 'strafe'; // neutral default
    if (hasCombatData) {
      botMoveEffectiveness = {
        strafe: 1 - ps.hitWhenBotStrafing,
        still: 1 - ps.hitWhenBotStill,
        approach: 1 - ps.hitWhenBotApproach,
        retreat: 1 - ps.hitWhenBotRetreat,
      };
      let bestEvasionVal = botMoveEffectiveness.strafe;
      for (const [k, v] of Object.entries(botMoveEffectiveness)) {
        if (v > bestEvasionVal) { bestEvasion = k; bestEvasionVal = v; }
      }
    }

    // What player movement is hardest for bot to hit?
    const playerWorstToHit = {
      strafe: bs.hitWhenPlayerStrafing,
      still: bs.hitWhenPlayerStill,
      approach: bs.hitWhenPlayerApproach,
    };

    // Should bot avoid trades? If player wins trades consistently
    const avoidTrades = hasCombatData ? cp.tradeRatio > 0.6 : false;

    // Bottom value: does having bottom actually help?
    const bottomMatters = hasCombatData ? cp.playerDmgWhenHasBottom > 0.5 : true;

    return {
      openingGoalY,
      openingStrafeDir,
      aggressionMult,
      dodgePredictBiasX,
      preferredOffsetX,
      strafeSpeedMult,
      // v2 situational
      playerRetakes,
      playerFlanks,
      playerRetreats,
      playerHoldsBottom,
      playerWallsFromBottom,
      playerPushesFromBottom,
      playerHoldsOnApproach,
      playerCounterPushes,
      playerSidesteps,
      playerChases,
      aboveShootsDown,
      belowShootsUp,
      levelShootsLeft,
      // v2 combat outcomes
      preferredDist,        // ideal engagement distance (avoid player's best range)
      bestEvasion,          // what movement makes player miss most (strafe/still/approach/retreat)
      botMoveEffectiveness, // full breakdown of evasion effectiveness
      avoidTrades,          // should bot avoid mutual damage exchanges?
      bottomMatters,        // is bottom position actually decisive?
      playerHitRate: ps.hitRate, // overall player accuracy
      // Phase 1e circumstance modifiers — gated until enough data
      playerPressesAfterHit: hasPositionData && sl.afterHit ? sl.afterHit.pressesAdvantage : 0.5,
      playerRetreatsOnDamage: hasPositionData && sl.afterHit ? sl.afterHit.retreatsOnDamage : 0.5,
      playerFleesLowHp: hasPositionData && sl.lowHpExpanded ? sl.lowHpExpanded.fleesPct : 0.5,
      playerChaseEndurance: hasPositionData && sl.chasePatterns ? sl.chasePatterns.giveUpFrames : 90,
      // Position value — how important is bottom? (defaults favor bottom)
      bottomWinCorrelation: hasPositionData && sl.positionValue ? sl.positionValue.bottomWinCorrelation : 0.7,
      topPenalty: hasPositionData && sl.positionValue ? sl.positionValue.topPenalty : 0.4,
      // Gun side + hitbox awareness (v4) — need 5+ matches for reliable data
      playerGunSide: hasShootingData && sl.gunSide ? sl.gunSide.playerPreference : 'left',
      playerLeftPct: hasShootingData && sl.gunSide ? sl.gunSide.leftPct : 0.5,
      horizShotAdvantage: hasShootingData && sl.hitboxAwareness ?
        (sl.hitboxAwareness.botHorizHitRate || 0.1) / Math.max(0.01, sl.hitboxAwareness.botVertHitRate || 0.05) : 1.0,
      peekEffective: hasShootingData && sl.hitboxAwareness ? sl.hitboxAwareness.peekSuccessRate > 0.3 : true,
    };
  },

  // ---- OPENING ROUTE SELECTION ----
  // Pick the best opening route based on learning data
  _pickBotOpeningRoute(pm, arenaW, arenaH) {
    const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;

    // Available routes — bottom is meta, so bottom routes are default
    const routes = ['bottomCenter', 'bottomLeft', 'bottomRight', 'topHold', 'midFlank', 'mirrorPlayer'];

    // Not enough data — still favor bottom, but don't lock out all other routes.
    if (!sl || sl.matchCount < 2) {
      const openers = {
        bottomCenter: 0.24,
        bottomLeft: 0.18,
        bottomRight: 0.18,
        midFlank: 0.15,
        mirrorPlayer: 0.15,
        topHold: 0.10,
      };
      return this._pickWeightedScoreChoice(openers);
    }

    // Score each route — WIN RATE IS EVERYTHING
    const scores = {};
    for (const r of routes) scores[r] = 0;
    const rf = sl ? this._ensureReinforcementProfile(sl) : null;
    const pOpeningBuckets = rf && rf.player ? rf.player.opening : null;
    const gOpeningBuckets = rf && rf.general ? rf.general.opening : null;
    const sOpeningBuckets = rf && rf.selfPlay ? rf.selfPlay.opening : null;
    const totalPlayerOpening = this._sumBucketPlays(pOpeningBuckets);
    const totalGeneralOpening = this._sumBucketPlays(gOpeningBuckets);
    const totalSelfPlayOpening = this._sumBucketPlays(sOpeningBuckets);

    // Light priors only. The bot should sample broadly and let outcomes decide.
    scores['bottomCenter'] += 1.6;
    scores['bottomLeft'] += 1.4;
    scores['bottomRight'] += 1.4;
    scores['mirrorPlayer'] += 1.3;
    scores['midFlank'] += 1.3;
    scores['topHold'] += 1.0;

    const rr = sl.botOpenings.routeResults;
    for (const r of routes) {
      const routeRec = rr[r];
      if (routeRec && typeof routeRec.failStreak !== 'number') routeRec.failStreak = 0;
      if (routeRec && routeRec.total > 0) {
        // Win rate dominates scoring
        const winRate = routeRec.wins / routeRec.total;
        scores[r] += winRate * 54;

        // Getting bottom is only slightly valuable — it doesn't help if we still lose
        const bottomRate = routeRec.gotBottom / routeRec.total;
        scores[r] += bottomRate * 3;

        // Penalize routes that consistently LOSE — HARD
        const lossRate = routeRec.losses / routeRec.total;
        scores[r] -= lossRate * 34;

        // Repeated failed starts should get shoved out quickly.
        scores[r] -= routeRec.failStreak * 18;
        if (routeRec.failStreak >= 2) scores[r] -= 18;
        if (routeRec.failStreak >= 3) scores[r] -= 28;

        // Routes with no wins and many attempts: massive penalty
        if (routeRec.wins === 0 && routeRec.total >= 3) {
          scores[r] -= 42;
        }
        // Additional scaling penalty for high-sample losers
        if (routeRec.wins === 0 && routeRec.total >= 5) {
          scores[r] -= routeRec.total * 4;
        }
      } else {
        // Untested routes should actually get sampled.
        scores[r] += 14;
      }

      const playerRewardScore = this._scoreRewardBucket(
        pOpeningBuckets && pOpeningBuckets[r],
        totalPlayerOpening,
        0.25
      );
      const generalRewardScore = this._scoreRewardBucket(
        gOpeningBuckets && gOpeningBuckets[r],
        totalGeneralOpening,
        0.14
      );
      const selfPlayRewardScore = this._scoreRewardBucket(
        sOpeningBuckets && sOpeningBuckets[r],
        totalSelfPlayOpening,
        0.1
      );
      scores[r] += (playerRewardScore - 0.5) * 26;
      scores[r] += (generalRewardScore - 0.5) * 14;
      scores[r] += (selfPlayRewardScore - 0.5) * 10;
    }

    // Counter player's specific route — but not so hard that we collapse into one answer.
    const playerRoute = sl.opening.route;
    if (playerRoute === 'bottomLeft') {
      scores['bottomRight'] += 9;
      scores['midFlank'] += 8;
      scores['mirrorPlayer'] += 5;
    } else if (playerRoute === 'bottomRight') {
      scores['bottomLeft'] += 9;
      scores['midFlank'] += 8;
      scores['mirrorPlayer'] += 5;
    } else if (playerRoute === 'bottomCenter') {
      // Counter center by flanking to a side
      scores['bottomLeft'] += 5;
      scores['bottomRight'] += 5;
      scores['midFlank'] += 10;
      scores['mirrorPlayer'] += 7;
      scores['topHold'] += 3;
    }

    // Variety penalty — repeated routes should drop off fast.
    const lastRoute = sl.botOpenings.lastRoute;
    if (lastRoute) {
      scores[lastRoute] -= 16;
      if (rr[lastRoute] && rr[lastRoute].total >= 3) {
        const lastWinRate = rr[lastRoute].wins / rr[lastRoute].total;
        if (lastWinRate < 0.4) scores[lastRoute] -= 14;
      }
    }

    // If the player heavily rushes bottom, make side counters and mirrors more appealing.
    if (sl.opening && sl.opening.rushBottom > 0.6) {
      scores['midFlank'] += 10;
      scores['mirrorPlayer'] += 8;
      scores['topHold'] += 4;
    }

    // Small randomness for unpredictability
    for (const r of routes) scores[r] += Math.random() * 6;

    // Occasionally force broad exploration so weak habits do not calcify.
    if (Math.random() < 0.24) {
      return routes[Math.floor(Math.random() * routes.length)];
    }

    return this._pickWeightedScoreChoice(scores);
  },

  // ---- LEARNING: called from meleeSystem when a spar bullet hits or misses ----
  _onSparBulletHit(bullet, hitEntity, wasHit) {
    const c = SparState._matchCollector;
    if (!c) return;

    const isPlayerBullet = bullet.sparTeam === 'teamA';

    // Find the nearest enemy to compute context
    let shooter, target;
    if (isPlayerBullet) {
      shooter = player;
      // Find nearest bot for context
      let nearBot = null, nearDist = Infinity;
      for (const p of SparState.teamB) {
        if (!p.alive) continue;
        const d = Math.sqrt((p.entity.x - player.x) ** 2 + (p.entity.y - player.y) ** 2);
        if (d < nearDist) { nearDist = d; nearBot = p.entity; }
      }
      target = nearBot;
    } else {
      // Bot bullet — find which bot shot it (use closest alive bot to bullet origin)
      let nearBot = null, nearDist = Infinity;
      for (const p of SparState.teamB) {
        if (!p.alive) continue;
        const d = Math.sqrt((p.entity.x - bullet.startX) ** 2 + (p.entity.y - bullet.startY) ** 2);
        if (d < nearDist) { nearDist = d; nearBot = p.entity; }
      }
      shooter = nearBot;
      target = player;
    }
    if (!shooter || !target) return;

    const dist = Math.sqrt((shooter.x - target.x) ** 2 + (shooter.y - target.y) ** 2);
    const tVx = target.vx || 0, tVy = target.vy || 0;
    const tSpeed = Math.sqrt(tVx * tVx + tVy * tVy);
    const tMoving = tSpeed > 2;

    // Relative movement: is target strafing, approaching, or retreating?
    const relDx = shooter.x - target.x, relDy = shooter.y - target.y;
    const relDist = Math.sqrt(relDx * relDx + relDy * relDy);
    let tMovement = 'still';
    if (tMoving && relDist > 1) {
      const dot = (tVx * relDx + tVy * relDy) / relDist;
      const perp = Math.abs(tVx * relDy - tVy * relDx) / relDist;
      if (dot > tSpeed * 0.5) tMovement = 'approach';
      else if (dot < -tSpeed * 0.5) tMovement = 'retreat';
      else if (perp > tSpeed * 0.3) tMovement = 'strafe';
    }

    // Who has bottom?
    const shooterHasBottom = shooter.y > target.y + 30;

    const bulletDir = Math.abs(bullet.vx) > Math.abs(bullet.vy) ? 'horiz' : 'vert';
    const record = { dist, tMovement, dir: bullet._sparDir || 0, relY: shooter.y - target.y, bulletDir };

    if (isPlayerBullet) {
      if (wasHit) {
        c.playerHits.push(record);
        c.playerDmgFrames.push({ frame: SparState.matchTimer, dmg: bullet.damage || 20, hasBottom: player.y > (target.y + 30) });
      } else {
        c.playerMisses.push(record);
      }
      // Directional hit tracking (v4 — hitbox awareness)
      c.hitsByBulletDir[bulletDir].total++;
      if (wasHit) c.hitsByBulletDir[bulletDir].hits++;
    } else {
      if (wasHit) {
        c.botHits.push(record);
        c.botDmgFrames.push({ frame: SparState.matchTimer, dmg: bullet.damage || 20, hasBottom: shooterHasBottom });
      } else {
        c.botMisses.push(record);
      }
      // Bot directional hit tracking (v4)
      c.botHitsByBulletDir[bulletDir].total++;
      if (wasHit) c.botHitsByBulletDir[bulletDir].hits++;
      // Peek tracking: bot had bottom + shot horizontal
      if (shooterHasBottom && bulletDir === 'horiz') {
        c.peekAttempts++;
        if (wasHit) c.peekHits++;
      }
    }

    // Phase 1b: Track hit/took-hit frames on bot AI
    if (wasHit && !isPlayerBullet) {
      // Bot bullet hit the player — find the shooter bot
      for (const m of SparState._sparBots) {
        if (m.entity === shooter || m.id === (bullet.ownerId || null)) {
          m.ai._lastHitFrame = SparState.matchTimer;
          m.ai._matchDmgDealt += bullet.damage || 20;
          break;
        }
      }
    }
    if (wasHit && isPlayerBullet) {
      // Player bullet hit a bot — find the hit bot
      for (const m of SparState._sparBots) {
        if (m.entity === target || m.entity.x === target.x && m.entity.y === target.y) {
          m.ai._lastTookHitFrame = SparState.matchTimer;
          m.ai._matchDmgTaken += bullet.damage || 20;
          break;
        }
      }
    }
  },

  _tickOneBot(member) {
    const bot = member.entity;
    const team = member._sparTeam;
    const enemies = team === 'teamA' ? SparState.teamB : SparState.teamA;
    const allies = team === 'teamA' ? SparState.teamA : SparState.teamB;
    const ai = member.ai;

    // --- Cache learning profile modifiers (once per match) ---
    if (!ai._profileMods && team === 'teamB') {
      ai._profileMods = this._getProfileModifiers(); // null if <3 matches
    }
    const pm = ai._profileMods; // may be null

    // Phase 2: Apply duel style weights
    let styleWeights = null;
    if (ai._duelStyle && typeof SPAR_DUEL_STYLES !== 'undefined') {
      styleWeights = SPAR_DUEL_STYLES[ai._duelStyle];
    }

    // --- Arena awareness ---
    const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
    const arenaW = arenaLevel.widthTiles * TILE;
    const arenaH = arenaLevel.heightTiles * TILE;
    const midX = arenaW / 2;
    const midY = arenaH / 2;
    const homeSideX = team === 'teamA' ? arenaW * 0.3 : arenaW * 0.7;

    // --- Target selection (prefer invaders, switch when current dies) ---
    ai.targetTimer--;
    let target = null;
    if (ai.targetId) {
      const prev = enemies.find(p => p.id === ai.targetId && p.alive);
      if (prev) target = prev;
    }
    if (!target || ai.targetTimer <= 0) {
      let bestScore = -Infinity;
      for (const p of enemies) {
        if (!p.alive) continue;
        const pdx = bot.x - p.entity.x, pdy = bot.y - p.entity.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        const onOurSide = team === 'teamA' ? (p.entity.x < midX) : (p.entity.x > midX);
        // Prioritize: invaders > close > low HP
        const hpBonus = (1 - p.entity.hp / p.entity.maxHp) * 150;
        const score = -pdist + (onOurSide ? 400 : 0) + hpBonus;
        if (score > bestScore) { bestScore = score; target = p; }
      }
      if (target) {
        ai.targetId = target.id;
        ai.targetTimer = 60 + Math.floor(Math.random() * 60);
      }
    }
    if (!target) return;

    const tgt = target.entity;
    const dx = tgt.x - bot.x, dy = tgt.y - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // --- Enemy gun side awareness ---
    // Player's gun side from getCurrentGunSide(), bot entities have _gunSide directly
    const enemyGunSide = tgt._gunSide || (typeof getCurrentGunSide === 'function' ? getCurrentGunSide() : 'left');

    // --- Detect enemy state ---
    const enemyMember = target.member;
    const enemyReloading = enemyMember ? enemyMember.gun.reloading : false;

    // --- Situational awareness ---
    const hpPct = bot.hp / bot.maxHp;
    const hasAmmo = !member.gun.reloading && member.gun.ammo > 0;
    const speed = bot.speed || SPAR_CONFIG.BOT_SPEED;
    let moveX = 0, moveY = 0;

    // --- Vertical positioning ---
    const hasBottom = bot.y > tgt.y + 30;
    const enemyHasBottom = tgt.y > bot.y + 30;
    const enemyMovingDown = tgt.vy > 1;
    const enemyMovingUp = tgt.vy < -1;
    const enemyMovingLeft = tgt.vx < -1;
    const enemyMovingRight = tgt.vx > 1;
    const isOpening = SparState.matchTimer < 180;  // first 3 seconds
    if (!enemyHasBottom) ai._antiBottomFrames = 0;

    // --- Strafe helper (used by all behaviors) ---
    ai.strafeTimer--;
    if (ai.strafeTimer <= 0) {
      ai.strafeDir *= -1;
      ai.strafeTimer = 25 + Math.floor(Math.random() * 35);
    }
    if (ai.jukeTimer <= 0 && Math.random() < 0.012) {
      ai.strafeDir *= -1;
      ai.jukeTimer = 15;
    }

    if (isOpening) {
      // === PHASE 1: Opening — choose a route and commit ===
      // Pick route once at frame 1
      if (!ai._openingRoute) {
        ai._openingRoute = this._pickBotOpeningRoute(pm, arenaW, arenaH);
        SparState._botOpeningRoute = ai._openingRoute;
      }
      const route = ai._openingRoute;

      // Route-specific movement — ALL routes prioritize getting bottom
      if (route === 'bottomCenter') {
        // Straight down the middle — FULL SPEED to bottom
        const goalY = arenaH * 0.85;
        if (bot.y < goalY - 10) moveY = speed; // full speed down
        moveX = ai.strafeDir * speed * 0.15; // minimal strafe, commit to bottom
      } else if (route === 'bottomLeft') {
        // Full speed to bottom-left corner
        const goalY = arenaH * 0.85;
        const goalX = arenaW * 0.25;
        if (bot.y < goalY - 10) moveY = speed * 0.9;
        moveX = Math.sign(goalX - bot.x) * speed * 0.4;
      } else if (route === 'bottomRight') {
        // Full speed to bottom-right corner
        const goalY = arenaH * 0.85;
        const goalX = arenaW * 0.75;
        if (bot.y < goalY - 10) moveY = speed * 0.9;
        moveX = Math.sign(goalX - bot.x) * speed * 0.4;
      } else if (route === 'topHold') {
        // Strafe at top, wall bullets — sometimes surprises
        const goalY = arenaH * 0.3;
        moveY = Math.sign(goalY - bot.y) * speed * 0.5;
        moveX = ai.strafeDir * speed * 0.8;
      } else if (route === 'midFlank') {
        // Go to bottom but offset horizontally from player
        const goalY = arenaH * 0.8;
        const flankSide = tgt.x < midX ? arenaW * 0.7 : arenaW * 0.3;
        if (bot.y < goalY - 10) moveY = speed * 0.85;
        moveX = Math.sign(flankSide - bot.x) * speed * 0.45;
      } else if (route === 'mirrorPlayer') {
        // Match player's movement but race them to bottom
        const tVx = tgt.vx || 0, tVy = tgt.vy || 0;
        moveX = tVx * 0.9;
        moveY = tVy * 0.9;
        // Always push toward bottom — harder than just drifting
        if (bot.y < arenaH * 0.8) moveY = Math.max(moveY, speed * 0.7);
      }

      // Dodge bullets even during opening — don't just tank hits
      const openDodge = this._getIncomingBulletDodge(bot, team);
      const openDodgeMag = Math.sqrt(openDodge.x * openDodge.x + openDodge.y * openDodge.y);
      if (openDodgeMag > 0.5) {
        moveX += openDodge.x * speed * 0.7;
        // Don't let dodging stop downward progress too much
        moveY += openDodge.y * speed * 0.4;
      }

    } else if (member.gun.reloading) {
      // === RELOADING: dodge hard, create distance, strafe unpredictably ===
      moveX = ai.strafeDir * speed * 0.85;
      if (dist < 300 && dist > 1) {
        // Back away from enemy while reloading
        moveX -= (dx / dist) * speed * 0.3;
        moveY -= (dy / dist) * speed * 0.3;
      }

    } else if (enemyReloading) {
      // === PUNISH: enemy reloading — close in aggressively ===
      const punishAggr = pm ? pm.aggressionMult : 1.1;
      if (dist > 80 && dist > 1) {
        moveX = (dx / dist) * speed * 0.65 * punishAggr;
        moveY = (dy / dist) * speed * 0.65 * punishAggr;
      }
      moveX += ai.strafeDir * speed * 0.25;
      // Learning v2: if player holds ground on approach, commit harder
      // If player sidesteps, match their lateral direction
      if (pm) {
        if (pm.playerHoldsOnApproach > 0.4) {
          // They stand and fight — push straight in, they won't dodge
          if (dist > 1) {
            moveX = (dx / dist) * speed * 0.75 * punishAggr;
            moveY = (dy / dist) * speed * 0.75 * punishAggr;
          }
        }
        if (pm.playerSidesteps > 0.4) {
          // They'll dodge sideways — lead toward their dodge direction
          moveX += pm.dodgePredictBiasX * speed * 0.25;
        }
      }

    } else if (hasBottom) {
      // === WE HAVE BOTTOM — use it actively, don't just camp ===

      // CRITICAL: if player hits strafing bot more than retreating/still, use stop-start movement
      const playerHitsStrafe = pm && pm.botMoveEffectiveness &&
        (pm.botMoveEffectiveness.strafe < pm.botMoveEffectiveness.retreat ||
         pm.botMoveEffectiveness.strafe < pm.botMoveEffectiveness.still);

      if (playerHitsStrafe) {
        // Player destroys horizontal strafing — use stop-start + vertical jukes
        if (!ai._pauseTimer) ai._pauseTimer = 0;
        ai._pauseTimer--;
        if (ai._pauseTimer > 0) {
          moveX = 0;
          moveY = 0;
        } else {
          moveX = ai.strafeDir * speed * 0.75;
          moveY = (Math.random() < 0.5 ? -1 : 1) * speed * 0.35;
          if (ai._pauseTimer <= -18) {
            ai._pauseTimer = 5 + Math.floor(Math.random() * 8);
            ai.strafeDir *= -1;
          }
        }
      } else {
        moveX = ai.strafeDir * speed * 0.7;
      }

      // Elliptical peek advantage: maintain vertical gap
      if (Math.abs(dy) > 40) {
        moveY *= 0.35;
      }

      // Stay engaged — push toward enemy if too far, tighter leash
      const engageDist = (pm && pm.preferredDist) ? pm.preferredDist + 30 : 250;
      if (dist > engageDist && dist > 1) {
        moveX += (dx / dist) * speed * 0.3;
        moveY += (dy / dist) * speed * 0.3;
      }

      // Learning v2: adapt based on what player does when we have bottom
      if (pm) {
        // If player retakes hard, wall bullets and be ready
        if (pm.playerRetakes > 0.35 && enemyMovingDown) {
          moveX = ai.strafeDir * speed * 0.85;
          if (dist < 200) moveY -= speed * 0.2;
        }
        // If player flanks, track their horizontal movement
        if (pm.playerFlanks > 0.3) {
          moveX += Math.sign(dx) * speed * 0.4;
        }
        // If player retreats / gives up bottom, PUSH and pressure
        if (pm.playerRetreats > 0.3 && !enemyMovingDown && dist > 180) {
          if (dist > 1) moveY += (dy / dist) * speed * 0.45;
        }
      }

      if (enemyMovingDown) {
        moveX += Math.sign(dx) * speed * 0.35;
        if (dist < 200) moveY -= speed * 0.25;
      } else if (enemyMovingLeft || enemyMovingRight) {
        moveX += Math.sign(dx) * speed * 0.3;
      }
      if (bot.y > arenaH - TILE * 2) moveY -= speed * 0.3;

    } else if (enemyHasBottom) {
      // === ENEMY HAS BOTTOM — choose a retake response instead of hovering above ===
      if (!ai._antiBottomResponse) ai._antiBottomResponse = this._pickAntiBottomResponse(pm);
      ai._antiBottomFrames = (ai._antiBottomFrames || 0) + 1;

      const response = ai._antiBottomResponse;
      const alignX = Math.abs(dx);
      const aboveTrapLine = bot.y < tgt.y - 35;
      let approachAggr = 0.45;
      let strafeAggr = 0.65;

      if (pm) {
        if (pm.playerWallsFromBottom > 0.5) {
          strafeAggr = 0.85;
          approachAggr = 0.22;
        }
        if (pm.playerHoldsBottom > 0.6 && pm.playerPushesFromBottom < 0.3) {
          approachAggr = Math.max(approachAggr, 0.5);
        }
      }

      if (response === 'sideFlank') {
        const flankDir = alignX < 110 ? ai.strafeDir : Math.sign(dx);
        moveX = flankDir * speed * Math.max(0.8, strafeAggr + 0.15);
        moveY = speed * (alignX < 110 ? 0.18 : 0.5);
        if (aboveTrapLine && alignX < 90) moveY = Math.min(moveY, 0.12 * speed);
        if (pm && pm.playerWallsFromBottom > 0.45) {
          moveX = flankDir * speed * 0.95;
          moveY = speed * 0.15;
        }
      } else if (response === 'baitPull') {
        if (dist < 240) {
          moveY = -speed * 0.35;
          moveX = ai.strafeDir * speed * 0.8;
        } else {
          moveX = Math.sign(dx || ai.strafeDir) * speed * 0.55;
          moveY = speed * 0.35;
        }
        if (pm && pm.playerPushesFromBottom > 0.45) {
          moveX += Math.sign(dx || ai.strafeDir) * speed * 0.15;
        }
      } else {
        // directContest
        if (dist > 300) {
          moveX = ai.strafeDir * speed * strafeAggr;
          moveY = speed * Math.max(0.5, approachAggr);
        } else if (dist > 150) {
          moveX = ai.strafeDir * speed * Math.min(0.95, strafeAggr + 0.15);
          moveY = speed * Math.min(0.58, approachAggr + 0.18);
        } else {
          moveX = ai.strafeDir * speed * 0.55;
          moveY = speed * 0.55;
        }
      }

      // Shared anti-bottom adjustments: offset from their best peek line instead of
      // sitting directly above them, then descend once we have lateral separation.
      if (alignX < 80) {
        moveX += ai.strafeDir * speed * 0.25;
        if (aboveTrapLine) moveY = Math.min(moveY, speed * 0.15);
      }
      if (pm) {
        if (pm.preferredOffsetX > 0.1) {
          moveX += Math.sign(bot.x - tgt.x || ai.strafeDir) * speed * pm.preferredOffsetX * 0.25;
        }
        if (pm.belowShootsUp > 0.6) {
          moveX += Math.sign(bot.x - tgt.x || ai.strafeDir) * speed * 0.2;
        }
        if (pm.playerPushesFromBottom > 0.45 && response !== 'baitPull' && dist < 220) {
          moveY -= speed * 0.12;
        }
      }

    } else {
      ai._antiBottomFrames = 0;
      // === NEUTRAL — neither has clear bottom, actively contest ===
      moveX = ai.strafeDir * speed * 0.7;
      // Stay at preferred engagement distance + actively contest bottom
      if (pm && pm.preferredDist && dist > 1) {
        const distDiff = dist - pm.preferredDist;
        if (distDiff > 50) {
          moveX += (dx / dist) * speed * 0.35;
          moveY += (dy / dist) * speed * 0.35;
        } else if (distDiff < -50) {
          moveX -= (dx / dist) * speed * 0.25;
          moveY -= (dy / dist) * speed * 0.25;
        }
      } else if (bot.y < tgt.y) {
        // Push to get below enemy — bottom is valuable
        moveY = speed * 0.4;
      } else {
        // Already below or level — slight drift to maintain bottom
        moveY = speed * 0.1;
      }
      // Maintain fighting distance — don't stack on top of enemy
      if (dist < 100 && dist > 1) {
        moveX -= (dx / dist) * speed * 0.25;
        moveY -= (dy / dist) * speed * 0.2;
      }
      // Learning v2: use approach/retreat knowledge in neutral
      if (pm) {
        // Dodge prediction bias
        if (Math.abs(pm.dodgePredictBiasX) > 0.15) {
          moveX += pm.dodgePredictBiasX * speed * 0.2;
        }
        // If player sidesteps a lot when we approach, fake approach then cut perpendicular
        if (pm.playerSidesteps > 0.4 && dist < 250) {
          moveX += ai.strafeDir * speed * 0.2;
        }
        // If player counter-pushes, don't approach head-on — angle in
        if (pm.playerCounterPushes > 0.35 && dist < 300) {
          moveX += ai.strafeDir * speed * 0.25;
        }
        // If player chases when we retreat, exploit it for baiting
        if (pm.playerChases > 0.5 && hpPct > 0.5 && dist < 200) {
          if (ai.baitCooldown > 25) ai.baitCooldown = 25;
        }
      }
    }

    // === DUEL STYLE WEIGHT APPLICATION ===
    if (styleWeights && !isOpening) {
      // Scale approach/retreat based on style
      if (dist > 1) {
        const moveDot = (moveX * dx + moveY * dy) / dist;
        if (moveDot > 0) {
          // Moving toward enemy — scale by approachMult
          const approachComponent = moveDot / speed;
          const scaledApproach = approachComponent * styleWeights.approachMult;
          const diff = (scaledApproach - approachComponent) * speed;
          moveX += (dx / dist) * diff;
          moveY += (dy / dist) * diff;
        }
      }
      // Scale strafe intensity
      const perpComponent = Math.abs(moveX * dy - moveY * dx) / Math.max(1, dist);
      if (perpComponent > 0.5) {
        moveX *= styleWeights.strafeMult;
      }
      // Apply preferred distance from style
      if (styleWeights.preferredDist && dist > 1) {
        const styleDist = styleWeights.preferredDist;
        const distDiff = dist - styleDist;
        if (Math.abs(distDiff) > 40) {
          const adjust = Math.min(0.3, Math.abs(distDiff) / 450);
          const dir = distDiff > 0 ? 1 : -1;
          moveX += (dx / dist) * speed * adjust * dir;
          moveY += (dy / dist) * speed * adjust * dir;
        }
      }
      // Scale bait frequency
      if (styleWeights.baitMult) {
        // Already handled in bait section, just adjust cooldown
      }
    }

    // === MID-MATCH SOFT-SWITCH ===
    if (ai._duelStyle && !ai._styleSwitchEvaluated && !isOpening && SparState.matchTimer > 480) {
      // Check if we should switch: down by >=30 HP or no hits for 180 frames
      const hpDiff = bot.hp - tgt.hp;
      const noHitsRecently = (SparState.matchTimer - ai._lastHitFrame) > 180;
      if (hpDiff <= -30 || noHitsRecently) {
        ai._styleSwitchEvaluated = true;
        const sl = typeof sparLearning !== 'undefined' ? sparLearning : null;
        const rf = sl ? this._ensureReinforcementProfile(sl) : null;
        const pStyleBuckets = rf && rf.player ? rf.player.style : null;
        const totalPlayerStylePlays = this._sumBucketPlays(pStyleBuckets);
        let newStyle = ai._duelStyle;
        let bestScore = -Infinity;
        for (const candidate of Object.keys(SPAR_DUEL_STYLES || {})) {
          if (candidate === ai._duelStyle) continue;
          const score = this._scoreRewardBucket(
            pStyleBuckets && pStyleBuckets[candidate],
            totalPlayerStylePlays,
            0.12
          );
          if (score > bestScore) {
            bestScore = score;
            newStyle = candidate;
          }
        }
        if (newStyle && newStyle !== ai._duelStyle && typeof SPAR_DUEL_STYLES !== 'undefined') {
          ai._duelStyle = newStyle;
          styleWeights = SPAR_DUEL_STYLES[newStyle];
        }
      }
    }

    // === CIRCUMSTANCE LAYERS (Phase 1c) ===

    // After-hit momentum: within 30 frames of landing a hit, push harder
    if (ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30 && !isOpening) {
      if (dist > 1) {
        moveX += (dx / dist) * speed * 0.2;
        moveY += (dy / dist) * speed * 0.2;
      }
      // Reduce shot timing hesitation (handled in shooting section)
    }

    // After-taking-hit defense: within 30 frames of taking a hit, strafe harder and back off
    if (ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 30 && !isOpening) {
      moveX += ai.strafeDir * speed * 0.12;
      if (dist < 250 && dist > 1) {
        moveX -= (dx / dist) * speed * 0.1;
        moveY -= (dy / dist) * speed * 0.1;
      }
    }

    // === CORNER ESCAPE + POSITION VALUE SYSTEM ===
    const nearLeftWall = bot.x < TILE * 3;
    const nearRightWall = bot.x > arenaW - TILE * 3;
    const nearTopWall = bot.y < TILE * 3;
    const nearBottomWall = bot.y > arenaH - TILE * 3;
    const nearAnyWall = nearLeftWall || nearRightWall || nearTopWall || nearBottomWall;
    const inCorner = (nearLeftWall || nearRightWall) && (nearTopWall || nearBottomWall);
    const inTopHalf = bot.y < midY;

    // Track corner/top stuck time
    if (inCorner) {
      ai._cornerFrames++;
    } else {
      ai._cornerFrames = Math.max(0, ai._cornerFrames - 3);
    }
    if (inTopHalf && !hasBottom) {
      ai._topStuckFrames++;
    } else {
      ai._topStuckFrames = Math.max(0, ai._topStuckFrames - 2);
    }

    if (!isOpening) {
      // CORNER ESCAPE: increasingly urgent the longer we're stuck
      if (inCorner) {
        const urgency = Math.min(0.7, ai._cornerFrames / 60); // ramps to 0.7 over 1 second
        // Push toward center — always
        moveX += Math.sign(midX - bot.x) * speed * urgency;
        moveY += Math.sign(midY - bot.y) * speed * urgency;
      } else if (nearAnyWall) {
        // Near wall but not corner — dodge perpendicular if enemy closing
        const closing = dist > 1 ? ((tgt.vx || 0) * -dx + (tgt.vy || 0) * -dy) / dist : 0;
        if (closing > 2) {
          if (nearLeftWall || nearRightWall) {
            moveY += (bot.y < midY ? 1 : -1) * speed * 0.4;
          }
          if (nearTopWall || nearBottomWall) {
            moveX += (bot.x < midX ? 1 : -1) * speed * 0.4;
          }
        }
      }

      // POSITION VALUE: top half without bottom is BAD — push to retake
      // Scales with stuck duration AND learned bottom-win correlation
      if (inTopHalf && !hasBottom && !member.gun.reloading) {
        const posValueMult = pm ? pm.bottomWinCorrelation : 0.7;
        const topUrgency = Math.min(0.65, ai._topStuckFrames / 70) * posValueMult; // faster ramp
        // Push downward toward bottom position — strong base push
        moveY += speed * (0.3 + topUrgency);
        // Push toward enemy X to not drift into a corner
        if (Math.abs(dx) > 30) {
          moveX += Math.sign(dx) * speed * 0.2;
        }
      }
    }

    // LOS blocked tracking
    if (!isOpening && dist > 1) {
      const hasLOS = this._hasLOS(bot.x, bot.y - 20, tgt.x, tgt.y - 20);
      if (!hasLOS) {
        ai._losBlockedFrames++;
        if (ai._losBlockedFrames > 60) {
          // Reposition: move toward center and perpendicular to enemy
          moveX += Math.sign(midX - bot.x) * speed * 0.3;
          moveY += Math.sign(midY - bot.y) * speed * 0.3;
        }
      } else {
        ai._losBlockedFrames = Math.max(0, ai._losBlockedFrames - 2);
      }
    }

    // Chase/retreat reset: track consecutive chase and retreat frames
    if (!isOpening && dist > 1) {
      const movingToward = (moveX * dx + moveY * dy) / dist;
      if (movingToward > speed * 0.3) {
        ai._chaseFrames++;
        ai._retreatFrames = 0;
        // Break off chase if no hit in 180 frames of pursuit
        if (ai._chaseFrames > 180 && (SparState.matchTimer - ai._lastHitFrame) > 180) {
          moveX = ai.strafeDir * speed * 0.7;
          moveY = 0;
          ai._chaseFrames = 0;
        }
      } else if (movingToward < -speed * 0.3) {
        ai._retreatFrames++;
        ai._chaseFrames = 0;
        // Stop endless retreat — recommit after 120 frames
        if (ai._retreatFrames > 120) {
          moveX = ai.strafeDir * speed * 0.5;
          moveY = (dy / dist) * speed * 0.2;
          ai._retreatFrames = 0;
        }
      } else {
        ai._chaseFrames = Math.max(0, ai._chaseFrames - 1);
        ai._retreatFrames = Math.max(0, ai._retreatFrames - 1);
      }
    }

    // === Expanded Low HP behavior (below 25%) ===
    if (hpPct < 0.25 && !isOpening) {
      const tgtHpPct = tgt.hp / tgt.maxHp;
      // Estimate shots to kill each other
      const botDmg = member.gun.damage || 20;
      const tgtDmg = 20; // assume player does 20 per hit
      const shotsToKillTarget = Math.ceil(tgt.hp / botDmg);
      const shotsToKillBot = Math.ceil(bot.hp / tgtDmg);

      if (shotsToKillTarget <= 2) {
        // Within 2 shots of killing — override to aggression
        ai._lowHpKillAttempt = true;
        if (dist > 1) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.25;
        }
      } else if (tgtHpPct < 0.25 && shotsToKillBot >= shotsToKillTarget) {
        // Both low, but we need more shots — race (push in)
        if (dist > 1) {
          moveX += (dx / dist) * speed * 0.15;
          moveY += (dy / dist) * speed * 0.15;
        }
      } else {
        // Full evasion mode — no speed boost, same rules as player
        if (dist < 250 && dist > 1) {
          moveX -= (dx / dist) * speed * 0.25;
          moveY -= (dy / dist) * speed * 0.25;
        }
      }
    }

    // --- Combat-informed adjustments (STRONG — override base behaviors) ---
    if (pm && !isOpening) {
      // DISTANCE MANAGEMENT: aggressively push toward preferred engagement range
      if (pm.preferredDist && dist > 1) {
        const distDiff = dist - pm.preferredDist;
        if (Math.abs(distDiff) > 30) {
          // STRONG adjustment — this is where we should be fighting
          const adjustStr = Math.min(0.55, Math.abs(distDiff) / 350);
          const towardEnemy = distDiff > 0 ? 1 : -1;
          moveX += (dx / dist) * speed * adjustStr * towardEnemy;
          moveY += (dy / dist) * speed * adjustStr * towardEnemy;
        }
      }

      // EVASION STYLE: STRONGLY favor the movement that makes player miss most
      if (pm.bestEvasion === 'still') {
        // Player can't hit a still bot — use STOP-START movement
        // This is critical: don't constantly strafe, pause between bursts
        if (!ai._pauseTimer) ai._pauseTimer = 0;
        if (ai._pauseTimer <= 0 && Math.random() < 0.06) {
          ai._pauseTimer = 10 + Math.floor(Math.random() * 15); // pause 10-25 frames
        }
        if (ai._pauseTimer > 0) {
          moveX *= 0.1; // nearly stop
          moveY *= 0.1;
          ai._pauseTimer--;
        }
      } else if (pm.bestEvasion === 'strafe') {
        moveX += ai.strafeDir * speed * 0.15;
      } else if (pm.bestEvasion === 'retreat') {
        // Player can't hit a retreating bot — use spacing, but don't run forever
        // Only retreat when enemy is pushing in close; otherwise hold position
        if (dist < 200 && dist > 1) {
          moveX -= (dx / dist) * speed * 0.25;
          moveY -= (dy / dist) * speed * 0.25;
        }
        moveX += ai.strafeDir * speed * 0.15;
      } else if (pm.bestEvasion === 'approach' && dist > 120) {
        if (dist > 1) {
          moveX += (dx / dist) * speed * 0.25;
          moveY += (dy / dist) * speed * 0.25;
        }
      }

      // VERTICAL MOVEMENT: if player primarily shoots horizontally, move vertically more
      const horizShootPct = (typeof sparLearning !== 'undefined') ?
        sparLearning.shooting.leftPct + sparLearning.shooting.rightPct : 0;
      if (horizShootPct > 0.5) {
        // Player shoots mostly left/right — add vertical movement to dodge
        moveY += (Math.random() < 0.5 ? 1 : -1) * speed * 0.15 * horizShootPct;
      }

      // CIRCULAR HITBOX + RECTANGULAR BULLET AWARENESS
      // Bullet is narrow perpendicular to travel (4px half-width) — dodge perpendicular
      // Both directions equally evasive with circular hitbox
      if (tgt.dir === 2 || tgt.dir === 3) {
        // Enemy shooting horizontally — dodge VERTICALLY (perpendicular to bullet)
        const vertOffset = bot.y - tgt.y;
        if (Math.abs(vertOffset) < 30) {
          moveY += (vertOffset >= 0 ? 1 : -1) * speed * 0.2;
        }
        // Gun side muzzle offset: bullet spawns ±20px from body center
        const enemyIsRight = enemyGunSide === 'right';
        const shootingRight = tgt.dir === 3;
        const muzzleHigh = (enemyIsRight && !shootingRight) || (!enemyIsRight && shootingRight);
        const preferBelow = muzzleHigh;
        const currentBelow = bot.y > tgt.y;
        if (preferBelow !== currentBelow) {
          moveY += (preferBelow ? 1 : -1) * speed * 0.12;
        }
      } else if (tgt.dir === 0 || tgt.dir === 1) {
        // Enemy shooting vertically — dodge HORIZONTALLY (perpendicular to bullet)
        const horizOffset = bot.x - tgt.x;
        if (Math.abs(horizOffset) < 30) {
          moveX += (horizOffset >= 0 ? 1 : -1) * speed * 0.2;
        }
      }

      // TRADE AVOIDANCE: if player wins trades, don't stand and trade
      if (pm.avoidTrades && dist < 200) {
        moveX += ai.strafeDir * speed * 0.2;
        if (dist > 1 && hasAmmo) {
          moveX -= (dx / dist) * speed * 0.15;
          moveY -= (dy / dist) * speed * 0.15;
        }
      }
    }

    // --- Bullet dodging (reactive, OVERRIDES movement when urgent) ---
    const dodge = this._getIncomingBulletDodge(bot, team);
    const dodgeMag = Math.sqrt(dodge.x * dodge.x + dodge.y * dodge.y);
    if (dodgeMag > 1.5) {
      // Strong dodge signal — override most of current movement
      const overridePct = Math.min(0.85, dodgeMag / 4); // up to 85% override
      moveX = moveX * (1 - overridePct) + dodge.x * speed * overridePct * 1.5;
      moveY = moveY * (1 - overridePct) + dodge.y * speed * overridePct * 1.5;
    } else if (dodgeMag > 0.1) {
      // Mild dodge — additive
      moveX += dodge.x * speed;
      moveY += dodge.y * speed;
    }

    // Separation from allies
    for (const a of allies) {
      if (!a.alive || a.entity === bot) continue;
      const adx = bot.x - a.entity.x, ady = bot.y - a.entity.y;
      const adist = Math.sqrt(adx * adx + ady * ady);
      if (adist < 80 && adist > 1) {
        moveX += (adx / adist) * speed * 0.35;
        moveY += (ady / adist) * speed * 0.35;
      }
    }

    // Wall avoidance
    const wallMargin = TILE * 1.5;
    if (bot.x < wallMargin) moveX += speed * 0.4;
    else if (bot.x > arenaW - wallMargin) moveX -= speed * 0.4;
    if (bot.y < wallMargin) moveY += speed * 0.4;
    else if (bot.y > arenaH - wallMargin) moveY -= speed * 0.3;

    // --- Baiting: occasionally fake a direction then snap back ---
    if (ai.baitTimer > 0) {
      ai.baitTimer--;
      if (ai.baitTimer > 8) {
        // Fake phase — move in bait direction
        moveX = ai.baitDirX * speed * 0.7;
        moveY = ai.baitDirY * speed * 0.7;
      }
      // else: snap back (use the real moveX/moveY calculated above)
    } else {
      ai.baitCooldown--;
      if (ai.baitCooldown <= 0 && !isOpening && dist < 350 && dist > 100) {
        // Start a bait — fake going one direction
        ai.baitTimer = 18; // 12 frames fake + 6 frames real snap
        // Fake toward enemy then pull back, or fake a strafe direction
        if (Math.random() < 0.5) {
          // Fake push toward enemy
          ai.baitDirX = dist > 1 ? (dx / dist) : 0;
          ai.baitDirY = dist > 1 ? (dy / dist) : 0;
        } else {
          // Fake strafe in opposite direction
          ai.baitDirX = -ai.strafeDir;
          ai.baitDirY = 0;
        }
        ai.baitCooldown = 60 + Math.floor(Math.random() * 80);
      }
    }

    // Learning: apply strafe speed multiplier (win-rate based)
    if (pm && pm.strafeSpeedMult !== 1.0) {
      moveX *= pm.strafeSpeedMult;
      moveY *= pm.strafeSpeedMult;
    }

    // Freeze penalty after shooting — same slowdown as player
    if (ai._freezeTimer > 0) {
      ai._freezeTimer--;
      const penalty = ai._freezePenalty || 0.54;
      moveX *= (1.0 - penalty);
      moveY *= (1.0 - penalty);
    }

    // Normalize
    const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLen > speed) {
      moveX = (moveX / moveLen) * speed;
      moveY = (moveY / moveLen) * speed;
    }

    // --- Smooth movement (blend toward target velocity) ---
    const smoothFactor = 0.3; // 0 = instant snap, 1 = no change
    moveX = ai.smoothVx * smoothFactor + moveX * (1 - smoothFactor);
    moveY = ai.smoothVy * smoothFactor + moveY * (1 - smoothFactor);
    ai.smoothVx = moveX;
    ai.smoothVy = moveY;

    // Collision — use player wall size, not mob (bots = future players)
    const hw = GAME_CONFIG.PLAYER_WALL_HW;
    if (positionClear(bot.x + moveX, bot.y, hw)) bot.x += moveX;
    if (positionClear(bot.x, bot.y + moveY, hw)) bot.y += moveY;

    bot.vx = moveX; bot.vy = moveY;
    bot.moving = Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5;

    // Facing — always face target
    // dir: 0=down, 1=up, 2=left, 3=right
    if (dist < 500) {
      if (Math.abs(dx) > Math.abs(dy)) {
        bot.dir = dx > 0 ? 3 : 2;
      } else {
        bot.dir = dy > 0 ? 0 : 1;
      }
    } else if (Math.abs(moveX) > Math.abs(moveY)) {
      bot.dir = moveX > 0 ? 3 : 2;
    } else if (Math.abs(moveY) > 0.5) {
      bot.dir = moveY > 0 ? 0 : 1;
    }

    // --- Shooting with shot timing modes ---
    // Re-evaluate shot mode every 90 frames or on context change
    if (SparState.matchTimer % 90 === 0 || (ai._lastTookHitFrame > 0 && (SparState.matchTimer - ai._lastTookHitFrame) < 2)) {
      // Pick mode based on context
      if (nearAnyWall && !this._hasLOS(bot.x, bot.y - 20, tgt.x, tgt.y - 20)) {
        ai._shotMode = 'prefire';
      } else if (dist < 150) {
        ai._shotMode = 'immediate';
      } else if (ai._lastHitFrame > 0 && (SparState.matchTimer - ai._lastHitFrame) < 30) {
        ai._shotMode = 'immediate'; // momentum — shoot fast after landing hits
      } else if (dist > 250) {
        ai._shotMode = 'held';
      } else {
        ai._shotMode = Math.random() < 0.3 ? 'held' : 'immediate';
      }
    }

    if (!member.gun.reloading && member.gun.ammo > 0 && member.ai.shootCD <= 0) {
      const hasLOS = this._hasLOS(bot.x, bot.y - 20, tgt.x, tgt.y - 20);

      if (ai._shotMode === 'immediate' && hasLOS) {
        this._sparBotShoot(member, tgt);
      } else if (ai._shotMode === 'held' && hasLOS) {
        // Wait for better alignment: target about to cross our shot axis
        const alignX = Math.abs(tgt.x - bot.x);
        const alignY = Math.abs(tgt.y - bot.y);
        let aligned = Math.min(alignX, alignY) < 35; // close to axis (circular hitbox)
        // With vertical offset, horizontal alignment still valuable for perpendicular shot
        if ((hasBottom || enemyHasBottom) && alignX < 40) aligned = true;
        if (aligned) {
          this._sparBotShoot(member, tgt);
        } else if (member.ai.shootCD <= -10) {
          // Been waiting too long, just fire
          this._sparBotShoot(member, tgt);
        }
      } else if (ai._shotMode === 'prefire') {
        // Fire toward where LOS is about to open (corner peek)
        // Fire at predicted position even without current LOS
        const tgtMoving = Math.abs(tgt.vx || 0) > 1 || Math.abs(tgt.vy || 0) > 1;
        if (hasLOS || (tgtMoving && dist < 300)) {
          this._sparBotShoot(member, tgt);
          if (hasLOS) ai._shotMode = 'immediate'; // got LOS, switch back
        }
      } else if (ai._shotMode === 'cutoff' && hasLOS) {
        // Fire perpendicular to predict wall run exit
        this._sparBotShoot(member, tgt);
      } else if (hasLOS) {
        // Fallback
        this._sparBotShoot(member, tgt);
      }
    }
  },

  _hasLOS(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist / 24);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      if (isSolid(col, row)) return false;
    }
    return true;
  },
};

// ---- SPAR DOOR INTERACTABLE REGISTRATION ----
Events.on('scene_changed', (data) => {
  if (data.to === 'spar') {
    for (let i = interactables.length - 1; i >= 0; i--) {
      if (interactables[i].id && interactables[i].id.startsWith('spar_door_')) {
        interactables.splice(i, 1);
      }
    }
    if (level && level.isSpar && !level.isSparArena) {
      SparSystem.enterHub();
      for (const e of levelEntities) {
        if (e.type !== 'spar_room_door') continue;
        const doorCenterX = (e.tx + (e.w || 2) / 2) * TILE;
        const doorCenterY = (e.ty + (e.h || 2) / 2) * TILE;
        registerInteractable({
          id: 'spar_door_' + e.roomId,
          x: doorCenterX,
          y: doorCenterY,
          range: 80,
          label: 'Enter ' + (e.label || '') + ' ' + (e.mode === 'streak' ? 'Streak' : 'Standard'),
          type: 'spar_door',
          canInteract() { return SparState.phase === 'hub' && Scene.inSpar; },
          onInteract() { SparSystem.joinRoom(e.roomId); },
        });
      }
    }
  } else {
    for (let i = interactables.length - 1; i >= 0; i--) {
      if (interactables[i].id && interactables[i].id.startsWith('spar_door_')) {
        interactables.splice(i, 1);
      }
    }
  }
});
