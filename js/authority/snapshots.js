// ===================== SNAPSHOTS =====================
// Server-authority ready: serialize & deserialize GameState.
// NO networking yet — this is the data contract only.
//
// serializeGameState()       → plain JSON-safe object (snapshot)
// applyGameStateSnapshot(s)  → writes snapshot INTO GameState
// DEBUG_dumpSnapshot()       → console.log snapshot
// DEBUG_roundTripSnapshot()  → serialize → apply → verify no breakage
//
// INCLUDED: everything a remote client needs to render the game
// EXCLUDED: UI state, DOM, chat, mouse, keysDown, ctx, panels,
//           cosmetic particles (hitEffects, deathEffects, mobParticles),
//           camera, transition state, rendering timers

// ===================== SERIALIZE =====================
function serializeGameState() {
  // ---- Player (gameplay-relevant fields only) ----
  const p = GameState.player;
  const snap = {
    v: 1, // schema version
    t: Date.now(), // timestamp

    player: {
      x: p.x, y: p.y,
      vx: p.vx, vy: p.vy,
      knockVx: p.knockVx, knockVy: p.knockVy,
      speed: p.speed, baseSpeed: p.baseSpeed,
      dir: p.dir, frame: p.frame, animTimer: p.animTimer, moving: p.moving,
      hp: p.hp, maxHp: p.maxHp,
      name: p.name,
      // cosmetic (needed for rendering other players)
      skin: p.skin, hair: p.hair, shirt: p.shirt, pants: p.pants,
      eyes: p.eyes, facialHair: p.facialHair, shoes: p.shoes, hat: p.hat,
      glasses: p.glasses, gloves: p.gloves, belt: p.belt, cape: p.cape,
      tattoo: p.tattoo, scars: p.scars, earring: p.earring, necklace: p.necklace,
      backpack: p.backpack, warpaint: p.warpaint,
    },

    // ---- Wave / Combat ----
    wave: GameState.wave,
    waveState: GameState.waveState,
    kills: GameState.kills,
    dungeonFloor: GameState.dungeonFloor,
    gold: GameState.gold,
    activeSlot: activeSlot,
    lives: lives,
    contactCooldown: contactCooldown,
    waveTimer: waveTimer,

    // ---- Death state ----
    playerDead: playerDead,
    deathTimer: deathTimer,
    deathX: deathX,
    deathY: deathY,
    deathRotation: deathRotation,
    deathGameOver: deathGameOver,
    respawnTimer: respawnTimer,

    // ---- Poison ----
    poisonTimer: poisonTimer,
    poisonTickTimer: poisonTickTimer,

    // ---- Dungeon progress ----
    stairsOpen: stairsOpen,
    dungeonComplete: dungeonComplete,
    reviveUsed: reviveUsed,
    currentDungeon: currentDungeon,
    dungeonReturnLevel: dungeonReturnLevel,
    fireRateBonus: fireRateBonus,

    // ---- Grab state ----
    isGrabbing: isGrabbing,
    grabTimer: grabTimer,
    grabTargetId: grabTarget ? grabTarget.id : null,

    // ---- Scene (read-only, derived from level, but needed for remote) ----
    scene: Scene.current,

    // ---- Gun ----
    gun: {
      ammo: GameState.gun.ammo,
      magSize: GameState.gun.magSize,
      reloading: GameState.gun.reloading,
      reloadTimer: GameState.gun.reloadTimer,
      fireCooldown: GameState.gun.fireCooldown,
      damage: GameState.gun.damage,
      recoilTimer: GameState.gun.recoilTimer,
      special: GameState.gun.special,
    },

    // ---- Melee ----
    melee: {
      damage: GameState.melee.damage,
      range: GameState.melee.range,
      arcAngle: GameState.melee.arcAngle,
      cooldown: GameState.melee.cooldown,
      cooldownMax: GameState.melee.cooldownMax,
      swinging: GameState.melee.swinging,
      swingTimer: GameState.melee.swingTimer,
      swingDuration: GameState.melee.swingDuration,
      swingDir: GameState.melee.swingDir,
      knockback: GameState.melee.knockback,
      critChance: GameState.melee.critChance,
      special: GameState.melee.special,
      dashing: GameState.melee.dashing,
      dashTimer: GameState.melee.dashTimer,
      dashDuration: GameState.melee.dashDuration,
      dashSpeed: GameState.melee.dashSpeed,
      dashDirX: GameState.melee.dashDirX,
      dashDirY: GameState.melee.dashDirY,
      dashStartX: GameState.melee.dashStartX,
      dashStartY: GameState.melee.dashStartY,
      dashTrail: GameState.melee.dashTrail.map(t => ({x: t.x, y: t.y, life: t.life})),
      dashesLeft: GameState.melee.dashesLeft,
      dashChainWindow: GameState.melee.dashChainWindow,
      dashCooldown: GameState.melee.dashCooldown,
      dashCooldownMax: GameState.melee.dashCooldownMax,
      dashActive: GameState.melee.dashActive,
      dashGap: GameState.melee.dashGap,
    },

    // ---- Ultimates ----
    shrine: {
      charges: shrine.charges,
      chargesMax: shrine.chargesMax,
      active: shrine.active,
      timer: shrine.timer,
      duration: shrine.duration,
      range: shrine.range,
      slashInterval: shrine.slashInterval,
      damagePerSlash: shrine.damagePerSlash,
    },
    godspeed: {
      charges: godspeed.charges,
      chargesMax: godspeed.chargesMax,
      active: godspeed.active,
      timer: godspeed.timer,
      duration: godspeed.duration,
      range: godspeed.range,
      strikeInterval: godspeed.strikeInterval,
      damagePerStrike: godspeed.damagePerStrike,
    },

    // ---- Inventory & Equipment ----
    inventory: GameState.inventory.map(item => item ? {
      id: item.id, name: item.name, type: item.type, tier: item.tier,
      data: item.data ? JSON.parse(JSON.stringify(item.data)) : null,
      stackable: item.stackable, count: item.count,
    } : null),
    potion: {
      count: GameState.potion.count,
      healAmount: GameState.potion.healAmount,
      cooldown: GameState.potion.cooldown,
      cooldownMax: GameState.potion.cooldownMax,
    },
    playerEquip: {
      armor: GameState.playerEquip.armor,
      gun: GameState.playerEquip.gun ? JSON.parse(JSON.stringify(GameState.playerEquip.gun)) : null,
      melee: GameState.playerEquip.melee ? JSON.parse(JSON.stringify(GameState.playerEquip.melee)) : null,
      boots: GameState.playerEquip.boots,
      pants: GameState.playerEquip.pants,
      chest: GameState.playerEquip.chest,
      helmet: GameState.playerEquip.helmet,
    },

    // ---- Mobs ----
    mobs: GameState.mobs.map(m => ({
      id: m.id, type: m.type,
      x: m.x, y: m.y,
      hp: m.hp, maxHp: m.maxHp,
      speed: m.speed, damage: m.damage,
      contactRange: m.contactRange,
      dir: m.dir, frame: m.frame, attackCooldown: m.attackCooldown,
      scale: m.scale, spawnFrame: m.spawnFrame,
      // Appearance
      skin: m.skin, hair: m.hair, shirt: m.shirt, pants: m.pants, name: m.name,
      // Shooter
      shootRange: m.shootRange, shootRate: m.shootRate,
      shootTimer: m.shootTimer, bulletSpeed: m.bulletSpeed,
      // Witch
      summonRate: m.summonRate, summonMax: m.summonMax, summonTimer: m.summonTimer,
      witchId: m.witchId, boneSwing: m.boneSwing, castTimer: m.castTimer,
      // Golem
      boulderRate: m.boulderRate, boulderSpeed: m.boulderSpeed,
      boulderRange: m.boulderRange, boulderTimer: m.boulderTimer, throwAnim: m.throwAnim,
      // Mummy
      explodeRange: m.explodeRange, explodeDamage: m.explodeDamage,
      mummyFuse: m.mummyFuse, mummyArmed: m.mummyArmed, mummyFlash: m.mummyFlash,
      // Archer
      arrowRate: m.arrowRate, arrowSpeed: m.arrowSpeed, arrowRange: m.arrowRange,
      arrowTimer: m.arrowTimer, arrowBounces: m.arrowBounces, arrowLife: m.arrowLife,
      bowDrawAnim: m.bowDrawAnim,
      // Healer
      healRadius: m.healRadius, healRate: m.healRate, healAmount: m.healAmount,
      healTimer: m.healTimer, healAnim: m.healAnim,
      healZoneX: m.healZoneX, healZoneY: m.healZoneY,
    })),

    // ---- Bullets ----
    bullets: GameState.bullets.map(b => ({
      id: b.id,
      x: b.x, y: b.y,
      vx: b.vx, vy: b.vy,
      fromPlayer: b.fromPlayer,
      mobBullet: !!b.mobBullet,
      damage: b.damage,
      ownerId: b.ownerId || null,
      isBoulder: !!b.isBoulder,
      isArrow: !!b.isArrow,
      bouncesLeft: b.bouncesLeft || 0,
      arrowLife: b.arrowLife || 0,
    })),

    // ---- Medpacks ----
    medpacks: GameState.medpacks.map(mp => ({
      x: mp.x, y: mp.y, bobFrame: mp.bobFrame,
    })),

    // ---- ID counters (for resuming spawns) ----
    nextMobId: nextMobId,
    nextBulletId: nextBulletId,
  };

  return snap;
}

// ===================== APPLY SNAPSHOT =====================
function applyGameStateSnapshot(snap) {
  if (!snap || snap.v !== 1) {
    console.warn('[snapshots] Unknown or missing snapshot version:', snap && snap.v);
    return false;
  }

  // ---- Player ----
  const sp = snap.player;
  const p = GameState.player;
  p.x = sp.x; p.y = sp.y;
  p.vx = sp.vx; p.vy = sp.vy;
  p.knockVx = sp.knockVx; p.knockVy = sp.knockVy;
  p.speed = sp.speed; p.baseSpeed = sp.baseSpeed;
  p.dir = sp.dir; p.frame = sp.frame; p.animTimer = sp.animTimer; p.moving = sp.moving;
  p.hp = sp.hp; p.maxHp = sp.maxHp;
  p.name = sp.name;
  p.skin = sp.skin; p.hair = sp.hair; p.shirt = sp.shirt; p.pants = sp.pants;
  p.eyes = sp.eyes; p.facialHair = sp.facialHair; p.shoes = sp.shoes; p.hat = sp.hat;
  p.glasses = sp.glasses; p.gloves = sp.gloves; p.belt = sp.belt; p.cape = sp.cape;
  p.tattoo = sp.tattoo; p.scars = sp.scars; p.earring = sp.earring; p.necklace = sp.necklace;
  p.backpack = sp.backpack; p.warpaint = sp.warpaint;

  // ---- Wave / Combat ----
  GameState.wave = snap.wave;
  GameState.waveState = snap.waveState;
  GameState.kills = snap.kills;
  GameState.dungeonFloor = snap.dungeonFloor;
  GameState.gold = snap.gold;
  activeSlot = snap.activeSlot;
  lives = snap.lives;
  contactCooldown = snap.contactCooldown;
  waveTimer = snap.waveTimer;

  // ---- Death state ----
  playerDead = snap.playerDead;
  deathTimer = snap.deathTimer;
  deathX = snap.deathX;
  deathY = snap.deathY;
  deathRotation = snap.deathRotation;
  deathGameOver = snap.deathGameOver;
  respawnTimer = snap.respawnTimer;

  // ---- Poison ----
  poisonTimer = snap.poisonTimer;
  poisonTickTimer = snap.poisonTickTimer;

  // ---- Dungeon progress ----
  stairsOpen = snap.stairsOpen;
  dungeonComplete = snap.dungeonComplete;
  reviveUsed = snap.reviveUsed;
  if (snap.currentDungeon != null) currentDungeon = snap.currentDungeon;
  if (snap.dungeonReturnLevel != null) dungeonReturnLevel = snap.dungeonReturnLevel;
  fireRateBonus = snap.fireRateBonus;

  // ---- Grab state ----
  isGrabbing = snap.isGrabbing;
  grabTimer = snap.grabTimer;
  // grabTarget resolved AFTER mobs are loaded (see below)

  // ---- Gun ----
  const g = GameState.gun;
  g.ammo = snap.gun.ammo;
  g.magSize = snap.gun.magSize;
  g.reloading = snap.gun.reloading;
  g.reloadTimer = snap.gun.reloadTimer;
  g.fireCooldown = snap.gun.fireCooldown;
  g.damage = snap.gun.damage;
  g.recoilTimer = snap.gun.recoilTimer;
  g.special = snap.gun.special;

  // ---- Melee ----
  const ml = GameState.melee;
  ml.damage = snap.melee.damage;
  ml.range = snap.melee.range;
  ml.arcAngle = snap.melee.arcAngle;
  ml.cooldown = snap.melee.cooldown;
  ml.cooldownMax = snap.melee.cooldownMax;
  ml.swinging = snap.melee.swinging;
  ml.swingTimer = snap.melee.swingTimer;
  ml.swingDuration = snap.melee.swingDuration;
  ml.swingDir = snap.melee.swingDir;
  ml.knockback = snap.melee.knockback;
  ml.critChance = snap.melee.critChance;
  ml.special = snap.melee.special;
  ml.dashing = snap.melee.dashing;
  ml.dashTimer = snap.melee.dashTimer;
  ml.dashDuration = snap.melee.dashDuration;
  ml.dashSpeed = snap.melee.dashSpeed;
  ml.dashDirX = snap.melee.dashDirX;
  ml.dashDirY = snap.melee.dashDirY;
  ml.dashStartX = snap.melee.dashStartX;
  ml.dashStartY = snap.melee.dashStartY;
  ml.dashTrail = snap.melee.dashTrail.map(t => ({x: t.x, y: t.y, life: t.life}));
  ml.dashesLeft = snap.melee.dashesLeft;
  ml.dashChainWindow = snap.melee.dashChainWindow;
  ml.dashCooldown = snap.melee.dashCooldown;
  ml.dashCooldownMax = snap.melee.dashCooldownMax;
  ml.dashActive = snap.melee.dashActive;
  ml.dashGap = snap.melee.dashGap;

  // ---- Ultimates ----
  shrine.charges = snap.shrine.charges;
  shrine.chargesMax = snap.shrine.chargesMax;
  shrine.active = snap.shrine.active;
  shrine.timer = snap.shrine.timer;
  shrine.duration = snap.shrine.duration;
  shrine.range = snap.shrine.range;
  shrine.slashInterval = snap.shrine.slashInterval;
  shrine.damagePerSlash = snap.shrine.damagePerSlash;

  godspeed.charges = snap.godspeed.charges;
  godspeed.chargesMax = snap.godspeed.chargesMax;
  godspeed.active = snap.godspeed.active;
  godspeed.timer = snap.godspeed.timer;
  godspeed.duration = snap.godspeed.duration;
  godspeed.range = snap.godspeed.range;
  godspeed.strikeInterval = snap.godspeed.strikeInterval;
  godspeed.damagePerStrike = snap.godspeed.damagePerStrike;

  // ---- Inventory & Equipment ----
  GameState.inventory = snap.inventory.map(item => item ? {
    id: item.id, name: item.name, type: item.type, tier: item.tier,
    data: item.data ? JSON.parse(JSON.stringify(item.data)) : null,
    stackable: item.stackable, count: item.count,
  } : null);

  GameState.potion.count = snap.potion.count;
  GameState.potion.healAmount = snap.potion.healAmount;
  GameState.potion.cooldown = snap.potion.cooldown;
  GameState.potion.cooldownMax = snap.potion.cooldownMax;

  GameState.playerEquip.armor = snap.playerEquip.armor;
  GameState.playerEquip.gun = snap.playerEquip.gun ? JSON.parse(JSON.stringify(snap.playerEquip.gun)) : null;
  GameState.playerEquip.melee = snap.playerEquip.melee ? JSON.parse(JSON.stringify(snap.playerEquip.melee)) : null;
  GameState.playerEquip.boots = snap.playerEquip.boots;
  GameState.playerEquip.pants = snap.playerEquip.pants;
  GameState.playerEquip.chest = snap.playerEquip.chest;
  GameState.playerEquip.helmet = snap.playerEquip.helmet;

  // ---- Mobs (replace entire array) ----
  GameState.mobs = snap.mobs.map(sm => ({
    id: sm.id, type: sm.type,
    x: sm.x, y: sm.y,
    hp: sm.hp, maxHp: sm.maxHp,
    speed: sm.speed, damage: sm.damage,
    contactRange: sm.contactRange,
    dir: sm.dir, frame: sm.frame, attackCooldown: sm.attackCooldown,
    scale: sm.scale, spawnFrame: sm.spawnFrame,
    skin: sm.skin, hair: sm.hair, shirt: sm.shirt, pants: sm.pants, name: sm.name,
    shootRange: sm.shootRange, shootRate: sm.shootRate,
    shootTimer: sm.shootTimer, bulletSpeed: sm.bulletSpeed,
    summonRate: sm.summonRate, summonMax: sm.summonMax, summonTimer: sm.summonTimer,
    witchId: sm.witchId, boneSwing: sm.boneSwing, castTimer: sm.castTimer,
    boulderRate: sm.boulderRate, boulderSpeed: sm.boulderSpeed,
    boulderRange: sm.boulderRange, boulderTimer: sm.boulderTimer, throwAnim: sm.throwAnim,
    explodeRange: sm.explodeRange, explodeDamage: sm.explodeDamage,
    mummyFuse: sm.mummyFuse, mummyArmed: sm.mummyArmed, mummyFlash: sm.mummyFlash,
    arrowRate: sm.arrowRate, arrowSpeed: sm.arrowSpeed, arrowRange: sm.arrowRange,
    arrowTimer: sm.arrowTimer, arrowBounces: sm.arrowBounces, arrowLife: sm.arrowLife,
    bowDrawAnim: sm.bowDrawAnim,
    healRadius: sm.healRadius, healRate: sm.healRate, healAmount: sm.healAmount,
    healTimer: sm.healTimer, healAnim: sm.healAnim,
    healZoneX: sm.healZoneX, healZoneY: sm.healZoneY,
  }));

  // ---- Resolve grabTarget AFTER mobs are loaded ----
  if (snap.grabTargetId != null) {
    grabTarget = GameState.mobs.find(m => m.id === snap.grabTargetId) || null;
  } else {
    grabTarget = null;
  }

  // ---- Bullets (replace entire array) ----
  GameState.bullets = snap.bullets.map(sb => ({
    id: sb.id,
    x: sb.x, y: sb.y,
    vx: sb.vx, vy: sb.vy,
    fromPlayer: sb.fromPlayer,
    mobBullet: sb.mobBullet,
    damage: sb.damage,
    ownerId: sb.ownerId,
    isBoulder: sb.isBoulder,
    isArrow: sb.isArrow,
    bouncesLeft: sb.bouncesLeft,
    arrowLife: sb.arrowLife,
  }));

  // ---- Medpacks (replace entire array) ----
  GameState.medpacks = snap.medpacks.map(smp => ({
    x: smp.x, y: smp.y, bobFrame: smp.bobFrame,
  }));

  // ---- ID counters ----
  nextMobId = snap.nextMobId;
  nextBulletId = snap.nextBulletId;

  return true;
}

// ===================== DEBUG TOOLS =====================

function DEBUG_dumpSnapshot() {
  const snap = serializeGameState();
  const json = JSON.stringify(snap);
  console.log('[snapshots] Snapshot v' + snap.v +
    ' | ' + snap.mobs.length + ' mobs' +
    ' | ' + snap.bullets.length + ' bullets' +
    ' | ' + snap.medpacks.length + ' medpacks' +
    ' | ' + snap.inventory.filter(Boolean).length + ' items' +
    ' | ' + (json.length / 1024).toFixed(1) + ' KB');
  console.log(snap);
  return snap;
}

function DEBUG_roundTripSnapshot() {
  console.log('[snapshots] === ROUND-TRIP TEST START ===');

  // 1. Capture "before" state
  const before = serializeGameState();
  const beforeJson = JSON.stringify(before);

  // 2. Apply snapshot (overwrites everything)
  const ok = applyGameStateSnapshot(before);
  if (!ok) {
    console.error('[snapshots] applyGameStateSnapshot returned false!');
    return false;
  }

  // 3. Re-serialize "after" state
  const after = serializeGameState();
  const afterJson = JSON.stringify(after);

  // 4. Compare (skip 't' timestamp — will always differ)
  const stripTime = (s) => { const c = Object.assign({}, s); delete c.t; return JSON.stringify(c); };
  const beforeCmp = stripTime(before);
  const afterCmp = stripTime(after);

  if (beforeCmp === afterCmp) {
    console.log('[snapshots] PASS — round-trip identical (' +
      (beforeJson.length / 1024).toFixed(1) + ' KB)');
    return true;
  } else {
    console.warn('[snapshots] MISMATCH — diffs found');
    // Find first differing key for debugging
    const bKeys = Object.keys(before);
    for (const k of bKeys) {
      if (k === 't') continue; // skip timestamp
      const bv = JSON.stringify(before[k]);
      const av = JSON.stringify(after[k]);
      if (bv !== av) {
        console.warn('  Key "' + k + '" differs:');
        console.warn('    before:', before[k]);
        console.warn('    after: ', after[k]);
      }
    }
    return false;
  }
}
