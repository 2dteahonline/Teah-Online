// ===================== SPAR SYSTEM =====================
// Authority: spar arena combat, bot AI, match flow
// Phase B — loaded after casinoSystem.js
// Depends on: SPAR_CONFIG, SPAR_ROOMS, SPAR_CTX_STATS, sparProgress (sparData.js)
//             CT_X_GUN (interactable.js)
//             player, bullets, hitEffects (gameState.js)
//             enterLevel, Scene, LEVELS (sceneManager.js)
//             positionClear (mobSystem.js)
//             TILE (levelData.js)

// ---- SPAR STATE ----
const SparState = {
  phase: 'idle',           // 'idle' | 'hub' | 'countdown' | 'fighting' | 'post_match'
  activeRoom: null,        // SPAR_ROOMS entry
  teamA: [],               // [{ id, entity, isLocal, isBot, alive, gun }]
  teamB: [],               // same
  countdown: 0,
  matchTimer: 0,
  lastResult: null,        // 'teamA' | 'teamB'
  postMatchTimer: 0,
  streakCount: 0,
  _sparBots: [],           // all spar bot entities (both teams)
  _savedSnapshot: null,    // loadout snapshot for restore
  _nextBotId: 1,
};

// ---- SPAR SYSTEM ----
const SparSystem = {
  enterHub() {
    SparState.phase = 'hub';
    SparState.activeRoom = null;
    SparState._sparBots.length = 0;
    SparState.teamA.length = 0;
    SparState.teamB.length = 0;
  },

  // Build CT-X stats from 100-point allocation {freeze, rof, spread}
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
      freezePenalty: frzStat.freezePenalty,
      freezeDuration: frzStat.freezeDuration,
      spread: spread,
      // Store point allocation for HUD display
      _sparFreeze: freezePts,
      _sparRof: rofPts,
      _sparSpread: spreadPts,
    };
  },

  // Generate random 100-point bot allocation
  _randomBotAlloc() {
    // Pick 2 random split points in 0-100, create 3 segments
    const a = Math.floor(Math.random() * 101);
    const b = Math.floor(Math.random() * 101);
    const lo = Math.min(a, b), hi = Math.max(a, b);
    return { freeze: lo, rof: hi - lo, spread: 100 - hi };
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
      // Scale down proportionally
      const scale = SPAR_CONFIG.POINT_BUDGET / total;
      pFreeze = Math.floor(pFreeze * scale);
      pRof = Math.floor(pRof * scale);
      pSpread = SPAR_CONFIG.POINT_BUDGET - pFreeze - pRof; // remainder goes to spread
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
    // Also set playerEquip.gun to CT-X so rendering/HUD works
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
      gun: playerGun,
    });

    // Ally bots (teamA, teamSize - 1) — each gets own random allocation
    for (let i = 1; i < room.teamSize; i++) {
      const spawnKey = 'teamA' + (i > 0 ? (i + 1) : '');
      const spawnPt = spawns[spawnKey] || spawns.teamA;
      const bot = this._createBot('ally_' + i, spawnPt.tx, spawnPt.ty, 'teamA');
      SparState._sparBots.push(bot);
      SparState.teamA.push({
        id: bot._sparId,
        entity: bot,
        isLocal: false,
        isBot: true,
        alive: true,
        gun: bot._ctxGun,
      });
    }

    // Enemy bots (teamB, full teamSize) — each gets own random allocation
    for (let i = 0; i < room.teamSize; i++) {
      const spawnKey = i === 0 ? 'teamB' : ('teamB' + (i + 1));
      const spawnPt = spawns[spawnKey] || spawns.teamB;
      const bot = this._createBot('enemy_' + i, spawnPt.tx, spawnPt.ty, 'teamB');
      SparState._sparBots.push(bot);
      SparState.teamB.push({
        id: bot._sparId,
        entity: bot,
        isLocal: false,
        isBot: true,
        alive: true,
        gun: bot._ctxGun,
      });
    }

    // 4. Enter arena level
    enterLevel(room.arenaLevel, spawns.p1.tx, spawns.p1.ty);

    // Position bots at their spawn points (after enterLevel resets)
    for (const bot of SparState._sparBots) {
      bot.x = bot._spawnTX * TILE + TILE / 2;
      bot.y = bot._spawnTY * TILE + TILE / 2;
    }

    // 5. Start countdown
    SparState.phase = 'countdown';
    SparState.countdown = SPAR_CONFIG.COUNTDOWN_FRAMES;
    SparState.matchTimer = 0;
    SparState.lastResult = null;
    SparState.postMatchTimer = 0;
  },

  _createBot(nameId, spawnTX, spawnTY, team) {
    const id = 'spar_bot_' + SparState._nextBotId++;
    // Random 100-point CT-X allocation
    const alloc = this._randomBotAlloc();
    const ctxGun = this._buildCtxGun(alloc.freeze, alloc.rof, alloc.spread);

    return {
      _sparId: id,
      _isBot: true,
      _isSparBot: true,
      _sparTeam: team,
      _spawnTX: spawnTX,
      _spawnTY: spawnTY,
      x: spawnTX * TILE + TILE / 2,
      y: spawnTY * TILE + TILE / 2,
      vx: 0, vy: 0,
      hp: SPAR_CONFIG.HP_BASELINE,
      maxHp: SPAR_CONFIG.HP_BASELINE,
      dir: team === 'teamA' ? 0 : 2,
      name: nameId.startsWith('ally') ? 'Ally Bot' : 'Spar Bot',
      moving: false,
      // CT-X gun stats from random allocation
      _ctxGun: ctxGun,
      _gunDamage: ctxGun.damage,
      _gunFireRate: ctxGun.fireRate,
      _gunMagSize: ctxGun.magSize,
      _gunFreezePenalty: ctxGun.freezePenalty,
      _gunSpread: ctxGun.spread,
      _gunAmmo: ctxGun.magSize,
      _gunReloading: false,
      _gunReloadTimer: 0,
      _fireCooldown: 0,
      // AI state
      _ai: {
        aggression: 0.3 + Math.random() * 0.7,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: Math.floor(60 + Math.random() * 90),
        targetId: null,
        targetTimer: 0,
        shootAngle: 0,
        laneY: null,              // assigned vertical lane (set on first tick)
        laneShiftTimer: 0,        // timer to periodically shift lane
      },
      // Rendering
      skin: team === 'teamA' ? '#4488cc' : '#cc4444',
      hair: '#333',
      shirt: team === 'teamA' ? '#2266aa' : '#aa2222',
      pants: '#222',
      shoes: '#111',
      hat: null,
      knockVx: 0, knockVy: 0,
    };
  },

  tick() {
    if (SparState.phase === 'idle' || SparState.phase === 'hub') return;

    if (SparState.phase === 'countdown') {
      SparState.countdown--;
      // Freeze all bots during countdown
      for (const bot of SparState._sparBots) {
        bot.vx = 0; bot.vy = 0; bot.moving = false;
      }
      if (SparState.countdown <= 0) {
        SparState.phase = 'fighting';
        SparState.matchTimer = 0;
      }
      return;
    }

    if (SparState.phase === 'fighting') {
      SparState.matchTimer++;
      this._tickSparBots();

      // Check alive counts
      const aAlive = SparState.teamA.filter(p => p.alive).length;
      const bAlive = SparState.teamB.filter(p => p.alive).length;

      if (aAlive <= 0 || bAlive <= 0) {
        SparState.lastResult = aAlive > 0 ? 'teamA' : 'teamB';
        SparState.phase = 'post_match';
        SparState.postMatchTimer = SPAR_CONFIG.POST_MATCH_FRAMES;

        // Record results
        const won = SparState.lastResult === 'teamA';
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

        // Auto-save
        if (typeof SaveLoad !== 'undefined') SaveLoad.save();
      }
      return;
    }

    if (SparState.phase === 'post_match') {
      SparState.postMatchTimer--;
      if (SparState.postMatchTimer <= 0) {
        // Streak: if player won, stay and spawn new challengers
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
    // Remove old enemy bots
    const oldEnemies = SparState._sparBots.filter(b => b._sparTeam === 'teamB');
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
      if (p.isBot) {
        // Reset bot to its original spawn
        p.entity.x = p.entity._spawnTX * TILE + TILE / 2;
        p.entity.y = p.entity._spawnTY * TILE + TILE / 2;
        p.entity.vx = 0; p.entity.vy = 0;
        p.entity._gunAmmo = p.entity._gunMagSize;
        p.entity._gunReloading = false;
        p.entity._fireCooldown = 0;
      }
    }

    for (let i = 0; i < room.teamSize; i++) {
      const spawnKey = i === 0 ? 'teamB' : ('teamB' + (i + 1));
      const spawnPt = spawns[spawnKey] || spawns.teamB;
      const bot = this._createBot('enemy_' + i, spawnPt.tx, spawnPt.ty, 'teamB');
      bot.x = spawnPt.tx * TILE + TILE / 2;
      bot.y = spawnPt.ty * TILE + TILE / 2;
      SparState._sparBots.push(bot);
      SparState.teamB.push({
        id: bot._sparId,
        entity: bot,
        isLocal: false,
        isBot: true,
        alive: true,
        gun: bot._ctxGun,
      });
    }

    // Restart countdown
    bullets.length = 0;
    hitEffects.length = 0;
    SparState.phase = 'countdown';
    SparState.countdown = SPAR_CONFIG.COUNTDOWN_FRAMES;
    SparState.lastResult = null;
  },

  onParticipantDeath(entity) {
    // Mark participant as dead in team arrays
    const allParticipants = [...SparState.teamA, ...SparState.teamB];
    for (const p of allParticipants) {
      if (p.entity === entity) {
        p.alive = false;
        break;
      }
    }

    // If it's the local player
    if (entity === player) {
      playerDead = true;
      deathTimer = 60;
      deathX = player.x;
      deathY = player.y;
      deathRotation = 0;
      deathGameOver = false;
    }

    // Death effect
    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({ x: entity.x, y: entity.y, life: 25, type: "shockwave" });
    }
  },

  exitToHub() {
    this._restoreSnapshot();
    this._cleanupBots();
    SparState.phase = 'hub';
    SparState.activeRoom = null;
    SparState.lastResult = null;
    enterLevel(SPAR_CONFIG.HUB_LEVEL, 15, 18);
  },

  endMatch() {
    if (SparState.phase === 'idle') return;
    this._restoreSnapshot();
    this._cleanupBots();
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
    // Clear any lingering death/respawn state
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

  // ===================== SPAR BOT TACTICAL AI =====================
  _tickSparBots() {
    for (const bot of SparState._sparBots) {
      if (bot.hp <= 0) continue;
      this._tickOneBot(bot);
    }
  },

  _tickOneBot(bot) {
    const team = bot._sparTeam;
    const enemies = team === 'teamA' ? SparState.teamB : SparState.teamA;
    const allies = team === 'teamA' ? SparState.teamA : SparState.teamB;
    const ai = bot._ai;

    // --- Arena awareness ---
    const arenaLevel = LEVELS[SparState.activeRoom.arenaLevel];
    const arenaW = arenaLevel.widthTiles * TILE;
    const arenaH = arenaLevel.heightTiles * TILE;
    const midX = arenaW / 2;
    const midY = arenaH / 2;
    // Bot's "home side" — teamA is left, teamB is right
    const homeSideX = team === 'teamA' ? arenaW * 0.3 : arenaW * 0.7;

    // --- Target selection ---
    ai.targetTimer--;
    let target = null;
    if (ai.targetId) {
      const prev = enemies.find(p => p.id === ai.targetId && p.alive);
      if (prev) target = prev;
    }
    if (!target || ai.targetTimer <= 0) {
      // Prefer enemies that are on our side (invading) over distant ones
      let bestScore = -Infinity;
      for (const p of enemies) {
        if (!p.alive) continue;
        const dx = bot.x - p.entity.x, dy = bot.y - p.entity.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Score: closer enemies score higher, enemies invading our side score much higher
        const onOurSide = team === 'teamA' ? (p.entity.x < midX) : (p.entity.x > midX);
        const score = -dist + (onOurSide ? 400 : 0);
        if (score > bestScore) { bestScore = score; target = p; }
      }
      if (target) {
        ai.targetId = target.id;
        ai.targetTimer = 90 + Math.floor(Math.random() * 60);
      }
    }
    if (!target) return;

    const tgt = target.entity;
    const dx = tgt.x - bot.x, dy = tgt.y - bot.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // --- Fire cooldown ---
    if (bot._fireCooldown > 0) bot._fireCooldown--;

    // --- Reload ---
    if (bot._gunReloading) {
      bot._gunReloadTimer--;
      if (bot._gunReloadTimer <= 0) {
        bot._gunReloading = false;
        bot._gunAmmo = bot._gunMagSize;
      }
    }

    // --- Decide behavior state ---
    // Behaviors: 'hold_lane', 'strafe', 'retreat', 'push', 'reposition'
    const hpPct = bot.hp / bot.maxHp;
    const hasAmmo = !bot._gunReloading && bot._gunAmmo > 0;
    const isDeepEnemy = team === 'teamA' ? (bot.x > midX + 100) : (bot.x < midX - 100);
    const enemyOnOurSide = team === 'teamA' ? (tgt.x < midX) : (tgt.x > midX);

    let behavior;
    if (hpPct < 0.3 || (bot._gunReloading && dist < 250)) {
      behavior = 'retreat';              // low HP or reloading close = fall back
    } else if (isDeepEnemy) {
      behavior = 'retreat';              // overextended, pull back to own side
    } else if (enemyOnOurSide && dist < 350) {
      behavior = 'push';                 // enemy invading our zone, push them out
    } else if (hasAmmo && dist < 450 && dist > 150) {
      behavior = 'strafe';               // good range, strafe and shoot
    } else if (dist > 450) {
      behavior = 'hold_lane';            // too far, move toward control point
    } else if (dist < 150 && hasAmmo) {
      behavior = 'strafe';               // close but have ammo, strafe-fight
    } else {
      behavior = 'hold_lane';
    }

    // --- Movement based on behavior ---
    const speed = SPAR_CONFIG.BOT_SPEED;
    let moveX = 0, moveY = 0;

    // Assign a vertical lane based on bot index to spread map coverage
    if (ai.laneY == null) {
      // Distribute bots across top/mid/bottom of arena
      const allyIndex = allies.findIndex(a => a.entity === bot);
      const allyCount = allies.length;
      if (allyCount <= 1) {
        ai.laneY = midY;
      } else {
        const margin = arenaH * 0.2;
        ai.laneY = margin + ((arenaH - margin * 2) * allyIndex / (allyCount - 1));
      }
      // Periodically shift lane slightly for unpredictability
      ai.laneShiftTimer = 180 + Math.floor(Math.random() * 180);
    }
    ai.laneShiftTimer--;
    if (ai.laneShiftTimer <= 0) {
      ai.laneY += (Math.random() - 0.5) * arenaH * 0.15;
      ai.laneY = Math.max(arenaH * 0.15, Math.min(arenaH * 0.85, ai.laneY));
      ai.laneShiftTimer = 180 + Math.floor(Math.random() * 180);
    }

    if (behavior === 'retreat') {
      // Move back toward home side + assigned lane
      const retreatX = homeSideX;
      const retreatY = ai.laneY;
      const rdx = retreatX - bot.x, rdy = retreatY - bot.y;
      const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
      if (rDist > 20) {
        moveX = (rdx / rDist) * speed;
        moveY = (rdy / rDist) * speed;
      }
    } else if (behavior === 'hold_lane') {
      // Move toward a control position (slightly past mid toward enemy) along lane
      const holdX = team === 'teamA' ? midX - arenaW * 0.05 : midX + arenaW * 0.05;
      const holdY = ai.laneY;
      const hdx = holdX - bot.x, hdy = holdY - bot.y;
      const hDist = Math.sqrt(hdx * hdx + hdy * hdy);
      if (hDist > 30) {
        // Move at reduced speed when holding (patient, not rushing)
        moveX = (hdx / hDist) * speed * 0.5;
        moveY = (hdy / hDist) * speed * 0.5;
      }
    } else if (behavior === 'push') {
      // Push toward enemy but don't overextend past midline too much
      const maxPushX = team === 'teamA' ? midX + arenaW * 0.1 : midX - arenaW * 0.1;
      const pushPastMid = team === 'teamA' ? (bot.x > maxPushX) : (bot.x < maxPushX);
      if (pushPastMid) {
        // At push limit, strafe instead
        ai.strafeTimer--;
        if (ai.strafeTimer <= 0) {
          ai.strafeDir *= -1;
          ai.strafeTimer = 60 + Math.floor(Math.random() * 90);
        }
        const perpX = -dy / (dist || 1), perpY = dx / (dist || 1);
        moveX = perpX * speed * ai.strafeDir * 0.6;
        moveY = perpY * speed * ai.strafeDir * 0.6;
      } else {
        // Approach enemy at moderate speed along their angle
        if (dist > 1) {
          moveX = (dx / dist) * speed * 0.6;
          moveY = (dy / dist) * speed * 0.6;
        }
      }
    } else if (behavior === 'strafe') {
      // Strafe perpendicular to enemy — core combat movement
      ai.strafeTimer--;
      if (ai.strafeTimer <= 0) {
        ai.strafeDir *= -1;
        ai.strafeTimer = 60 + Math.floor(Math.random() * 90);
      }
      const perpX = -dy / (dist || 1), perpY = dx / (dist || 1);
      moveX = perpX * speed * ai.strafeDir * 0.65;
      moveY = perpY * speed * ai.strafeDir * 0.65;

      // Slight forward/back adjustment to maintain ideal range (250-350px)
      const idealRange = 250 + (1 - ai.aggression) * 100;
      if (dist > idealRange + 30 && dist > 1) {
        moveX += (dx / dist) * speed * 0.25;
        moveY += (dy / dist) * speed * 0.25;
      } else if (dist < idealRange - 30 && dist > 1) {
        moveX -= (dx / dist) * speed * 0.25;
        moveY -= (dy / dist) * speed * 0.25;
      }

      // Drift toward lane Y
      const laneDrift = ai.laneY - bot.y;
      if (Math.abs(laneDrift) > 40) {
        moveY += Math.sign(laneDrift) * speed * 0.15;
      }
    }

    // Separation from allies (prevent stacking)
    for (const a of allies) {
      if (!a.alive || a.entity === bot) continue;
      const adx = bot.x - a.entity.x, ady = bot.y - a.entity.y;
      const adist = Math.sqrt(adx * adx + ady * ady);
      if (adist < 80 && adist > 1) {
        moveX += (adx / adist) * speed * 0.35;
        moveY += (ady / adist) * speed * 0.35;
      }
    }

    // Wall avoidance — steer away from arena edges
    const wallMargin = TILE * 2;
    if (bot.x < wallMargin) moveX += speed * 0.4;
    else if (bot.x > arenaW - wallMargin) moveX -= speed * 0.4;
    if (bot.y < wallMargin) moveY += speed * 0.4;
    else if (bot.y > arenaH - wallMargin) moveY -= speed * 0.4;

    // Normalize speed
    const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLen > speed) {
      moveX = (moveX / moveLen) * speed;
      moveY = (moveY / moveLen) * speed;
    }

    // Collision check
    const hw = GAME_CONFIG.MOB_WALL_HW;
    const newX = bot.x + moveX;
    const newY = bot.y + moveY;
    if (positionClear(newX, bot.y, hw)) bot.x = newX;
    if (positionClear(bot.x, newY, hw)) bot.y = newY;

    bot.vx = moveX; bot.vy = moveY;
    bot.moving = Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5;

    // Facing direction — always face target when in combat range
    if (dist < 500) {
      if (Math.abs(dx) > Math.abs(dy)) {
        bot.dir = dx > 0 ? 0 : 2;
      } else {
        bot.dir = dy > 0 ? 3 : 1;
      }
    } else {
      // Face movement direction when far
      if (Math.abs(moveX) > Math.abs(moveY)) {
        bot.dir = moveX > 0 ? 0 : 2;
      } else if (Math.abs(moveY) > 0.5) {
        bot.dir = moveY > 0 ? 3 : 1;
      }
    }

    // --- Shooting ---
    // Only shoot when in strafe/push/hold behaviors, not while retreating
    const canShoot = behavior !== 'retreat' || (hpPct > 0.15 && dist < 200);
    if (canShoot && !bot._gunReloading && bot._gunAmmo > 0 && bot._fireCooldown <= 0 && dist < 450) {
      if (this._hasLOS(bot.x, bot.y - 20, tgt.x, tgt.y - 20)) {
        // Predictive aiming — lead target based on distance
        const bulletSpeed = GAME_CONFIG.BULLET_SPEED;
        const travelTime = dist / bulletSpeed;
        const leadFrames = Math.min(travelTime, 12);
        const predX = tgt.x + (tgt.vx || 0) * leadFrames;
        const predY = tgt.y + (tgt.vy || 0) * leadFrames;
        const aimDx = predX - bot.x;
        const aimDy = (predY - 20) - (bot.y - 20);
        const angle = Math.atan2(aimDy, aimDx);
        ai.shootAngle = angle;

        // Bot's CT-X spread + slight inaccuracy (better accuracy at closer range)
        const spreadRad = (bot._gunSpread || 0) * Math.PI / 180;
        const distFactor = Math.min(1, dist / 400); // 0 at close, 1 at far
        const inaccuracy = (Math.random() - 0.5) * (0.08 + spreadRad * distFactor);
        const finalAngle = angle + inaccuracy;

        const bSpeed = GAME_CONFIG.BULLET_SPEED;
        const bulletObj = {
          id: Date.now() + Math.random(),
          x: bot.x + Math.cos(finalAngle) * 20,
          y: bot.y - 20 + Math.sin(finalAngle) * 20,
          vx: Math.cos(finalAngle) * bSpeed,
          vy: Math.sin(finalAngle) * bSpeed,
          fromPlayer: true,
          sparTeam: team,
          damage: bot._gunDamage,
          bulletColor: team === 'teamA' ? '#55aaff' : '#ff5544',
          ownerId: bot._sparId,
        };
        bullets.push(bulletObj);

        bot._fireCooldown = Math.round(bot._gunFireRate * 4);
        bot._gunAmmo--;

        if (bot._gunAmmo <= 0) {
          bot._gunReloading = true;
          bot._gunReloadTimer = 60;
        }
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
