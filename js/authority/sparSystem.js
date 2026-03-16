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
    SparState.phase = 'countdown';
    SparState.countdown = SPAR_CONFIG.COUNTDOWN_FRAMES;
    SparState.matchTimer = 0;
    SparState.lastResult = null;
    SparState.postMatchTimer = 0;
  },

  // Create a spar bot as a full member object (mirrors createPartyMember pattern)
  _createBot(nameId, spawnTX, spawnTY, team) {
    const id = 'spar_bot_' + SparState._nextBotId++;

    // Random 100-point CT-X allocation
    const alloc = this._randomBotAlloc();
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
    return {
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
        // Spar-specific tactical state
        aggression: 0.3 + Math.random() * 0.7,
        strafeDir: Math.random() > 0.5 ? 1 : -1,
        strafeTimer: Math.floor(40 + Math.random() * 60),
        targetId: null,
        targetTimer: 0,
        laneY: null,
        laneShiftTimer: 0,
        jukeTimer: 0,            // cooldown for juke direction flips
      },
    };
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
    SparState.phase = 'countdown';
    SparState.countdown = SPAR_CONFIG.COUNTDOWN_FRAMES;
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

      // Tick juke timer
      if (member.ai.jukeTimer > 0) member.ai.jukeTimer--;

      this._tickOneBot(member);
    }
  },

  // Shoot — 4 cardinal directions only (same as player shoot() in gunSystem.js)
  _sparBotShoot(member, target) {
    const e = member.entity;
    const g = member.gun;
    const dx = target.x - e.x, dy = target.y - e.y;
    const bspd = GAME_CONFIG.BULLET_SPEED;

    // Pick best cardinal direction based on target position
    let bvx = 0, bvy = 0;
    if (Math.abs(dx) > Math.abs(dy)) {
      bvx = dx > 0 ? bspd : -bspd;  // right or left
      e.dir = dx > 0 ? 0 : 2;
    } else {
      bvy = dy > 0 ? bspd : -bspd;  // down or up
      e.dir = dy > 0 ? 3 : 1;
    }

    // Muzzle offset (same direction as bullet)
    const mx = e.x + (bvx !== 0 ? Math.sign(bvx) * 20 : 0);
    const my = e.y - 10 + (bvy !== 0 ? Math.sign(bvy) * 20 : 0);

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
    });

    g.ammo--;
    member.ai.shootCD = Math.round((g.fireRate || 5) * 4);

    if (g.ammo <= 0) {
      g.reloading = true;
      g.reloadTimer = 60;
    }
  },

  // Dodge incoming enemy bullets — optimized for 4-cardinal bullet paths
  _getIncomingBulletDodge(bot, team) {
    let dodgeX = 0, dodgeY = 0;
    const botCY = bot.y - 10; // body center
    const hitR = 30; // dodge if bullet will pass within this range

    for (const b of bullets) {
      if (!b.sparTeam || b.sparTeam === team) continue;
      const dbx = bot.x - b.x, dby = botCY - b.y;
      const bDist = Math.sqrt(dbx * dbx + dby * dby);
      if (bDist > 250 || bDist < 8) continue;

      const urgency = Math.max(0.3, 1 - bDist / 250);

      if (Math.abs(b.vy) > Math.abs(b.vx)) {
        // Vertical bullet (going up or down) — dodge LEFT or RIGHT
        const isApproaching = (b.vy > 0 && b.y < botCY) || (b.vy < 0 && b.y > botCY);
        if (!isApproaching) continue;
        if (Math.abs(dbx) > hitR * 2) continue; // not in our lane
        // Dodge perpendicular — away from bullet's X
        const dodgeDir = dbx >= 0 ? 1 : -1;
        // Stronger dodge when bullet is closer to our X lane
        const laneProximity = Math.max(0, 1 - Math.abs(dbx) / (hitR * 2));
        dodgeX += dodgeDir * urgency * laneProximity * 5;
      } else {
        // Horizontal bullet (going left or right) — dodge UP or DOWN
        const isApproaching = (b.vx > 0 && b.x < bot.x) || (b.vx < 0 && b.x > bot.x);
        if (!isApproaching) continue;
        if (Math.abs(dby) > hitR * 2) continue; // not in our lane
        const dodgeDir = dby >= 0 ? 1 : -1;
        const laneProximity = Math.max(0, 1 - Math.abs(dby) / (hitR * 2));
        dodgeY += dodgeDir * urgency * laneProximity * 5;
      }
    }
    return { x: dodgeX, y: dodgeY };
  },

  _tickOneBot(member) {
    const bot = member.entity;
    const team = member._sparTeam;
    const enemies = team === 'teamA' ? SparState.teamB : SparState.teamA;
    const allies = team === 'teamA' ? SparState.teamA : SparState.teamB;
    const ai = member.ai;

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
      // === PHASE 1: Opening — race to take bottom ===
      const goalY = Math.min(arenaH - TILE * 1.5, arenaH * 0.75);
      const bdy = goalY - bot.y;
      if (Math.abs(bdy) > 15) {
        moveY = Math.sign(bdy) * speed * 0.9;
      }
      moveX = ai.strafeDir * speed * 0.4;

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
      if (dist > 80 && dist > 1) {
        moveX = (dx / dist) * speed * 0.55;
        moveY = (dy / dist) * speed * 0.55;
      }
      moveX += ai.strafeDir * speed * 0.35;

    } else if (hasBottom) {
      // === WE HAVE BOTTOM — play from advantage ===
      // Strafe horizontally, wall bullets upward, react to enemy movement
      moveX = ai.strafeDir * speed * 0.65;

      if (enemyMovingDown) {
        // Enemy trying to contest — cut them off, move toward them
        moveX += Math.sign(dx) * speed * 0.3;
        if (dist < 200) moveY -= speed * 0.2; // slight retreat to maintain gap
      } else if (enemyMovingLeft || enemyMovingRight) {
        // Enemy strafing — mirror their horizontal movement to stay lined up
        moveX += Math.sign(dx) * speed * 0.25;
      } else if (dist > 350) {
        // Enemy far away and passive — advance to pressure
        moveX += (dx / dist) * speed * 0.2;
        moveY += (dy / dist) * speed * 0.2;
      }
      // Don't hug bottom wall — stay mobile in the bottom zone
      if (bot.y > arenaH - TILE * 2) moveY -= speed * 0.2;

    } else if (enemyHasBottom) {
      // === ENEMY HAS BOTTOM — adapt, don't just force it ===
      if (dist > 300) {
        // Far away — try to flank to the side, approach at an angle
        moveX = ai.strafeDir * speed * 0.6;
        // Drift down gradually, don't rush straight into their bullets
        moveY = speed * 0.35;
      } else if (dist > 150) {
        // Mid range — strafe and look for an opening
        moveX = ai.strafeDir * speed * 0.7;
        // If enemy is shooting upward (we're above), strafe more, commit less
        if (tgt.dir === 1) {
          // Enemy facing up — they're walling us. Strafe wide.
          moveX = ai.strafeDir * speed * 0.85;
        } else {
          // Enemy not aiming at us — take ground
          moveY = speed * 0.4;
        }
      } else {
        // Close range — commit to the fight, try to get below
        moveX = ai.strafeDir * speed * 0.5;
        moveY = speed * 0.5;
      }

    } else {
      // === NEUTRAL — neither has clear bottom, play mid ===
      // Strafe and try to gain vertical advantage gradually
      moveX = ai.strafeDir * speed * 0.65;
      if (bot.y < tgt.y) {
        moveY = speed * 0.3; // drift down when above enemy
      }
      // React to enemy movement
      if (enemyMovingDown) {
        moveY = speed * 0.5; // race them
      }
      // Maintain fighting distance
      if (dist < 100 && dist > 1) {
        moveX -= (dx / dist) * speed * 0.2;
        moveY -= (dy / dist) * speed * 0.2;
      }
    }

    // Low HP modifier — play more evasive regardless of position
    if (hpPct < 0.25 && !isOpening) {
      // Increase strafe speed, back away more
      moveX *= 1.15;
      if (dist < 250 && dist > 1) {
        moveX -= (dx / dist) * speed * 0.2;
        moveY -= (dy / dist) * speed * 0.2;
      }
    }

    // --- Bullet dodging (reactive, all behaviors) ---
    const dodge = this._getIncomingBulletDodge(bot, team);
    moveX += dodge.x * speed;
    moveY += dodge.y * speed;

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

    // Normalize
    const moveLen = Math.sqrt(moveX * moveX + moveY * moveY);
    if (moveLen > speed) {
      moveX = (moveX / moveLen) * speed;
      moveY = (moveY / moveLen) * speed;
    }

    // Collision
    const hw = GAME_CONFIG.MOB_WALL_HW;
    if (positionClear(bot.x + moveX, bot.y, hw)) bot.x += moveX;
    if (positionClear(bot.x, bot.y + moveY, hw)) bot.y += moveY;

    bot.vx = moveX; bot.vy = moveY;
    bot.moving = Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5;

    // Facing — always face target
    if (dist < 500) {
      if (Math.abs(dx) > Math.abs(dy)) {
        bot.dir = dx > 0 ? 0 : 2;
      } else {
        bot.dir = dy > 0 ? 3 : 1;
      }
    } else if (Math.abs(moveX) > Math.abs(moveY)) {
      bot.dir = moveX > 0 ? 0 : 2;
    } else if (Math.abs(moveY) > 0.5) {
      bot.dir = moveY > 0 ? 3 : 1;
    }

    // --- Shooting ---
    // Shoot whenever possible — no range cap, just LOS + cooldown + ammo
    if (!member.gun.reloading && member.gun.ammo > 0 && member.ai.shootCD <= 0) {
      if (this._hasLOS(bot.x, bot.y - 20, tgt.x, tgt.y - 20)) {
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
