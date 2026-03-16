// ===================== DAMAGE & WEAPON SYSTEMS =====================
// Authority: kill rewards, damage dealing, player damage, weapon behaviors
// Extracted from index_2.html -- Phase B

// ===================== CENTRALIZED KILL REWARD SYSTEM =====================
// Kill sources — determines heal multipliers and behavior
// "gun"         = direct gun bullet kill (2x heal, refill ammo)
// "melee"       = direct melee swing kill (dash/storm multipliers apply)
// "ninja_splash"= ninja katana AOE splash kill (dash multiplier applies)
// "storm_shock" = storm blade shockwave kill (1.5x heal)
// "storm_chain" = storm blade chain lightning kill (1.5x heal)
// "shrine"      = malevolent shrine slash kill (1x heal, refill ammo)
// "godspeed"    = godspeed lightning kill (1x heal, refill ammo)
// "burn_dot"    = burn DOT tick kill (1x heal)
// "inferno_chain" = inferno chain explosion kill (1x heal)
// "witch_skeleton" = auto-kill skeletons when witch dies (1 HP flat)
// "ninja_dash_kill" = ninja dash-attack direct kill (2x heal, refill ammo)

// ===================== CENTRALIZED DAMAGE SYSTEM =====================
// dealDamageToMob(mob, amount, source)
//   - Subtracts HP from mob
//   - If mob dies, calls processKill automatically
//   - Returns true if mob died, false if still alive
//   - Callers handle their own hit effects (they're all different)
//
// Usage:
//   hitEffects.push({ x: m.x, y: m.y - 20, life: 19, type: "hit", dmg: 50 });
//   if (dealDamageToMob(m, 50, "gun")) { /* on-kill effects like frost nova */ }
//
function dealDamageToMob(mob, amount, source, attackerEntity) {
  // Poison Immune: blocks poison/bleed damage (currently no player-to-mob poison exists,
  // but this guards against future DoT sources)
  if (mob._poisonImmune && (source === 'poison' || source === 'bleed')) return false;

  // Invulnerability check (mud_dive, nano_armor, etc.)
  if (mob._invulnerable) return false;

  // Active shield check (tower_shield, spirit_shield, etc.) — blocks all damage
  if (mob._shielded && source !== 'dot' && source !== 'burn_dot' && source !== 'thorns') {
    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({ x: mob.x, y: mob.y - 20, life: 15, type: 'shield_block' });
    }
    return false;
  }

  // Frontal shield check — negate damage from mob's facing direction
  if (mob._frontalShield && source !== 'dot' && source !== 'burn_dot' && source !== 'thorns') {
    const _atkEntity = attackerEntity || _currentDamageTarget || player;
    const aDx = _atkEntity.x - mob.x, aDy = _atkEntity.y - mob.y;
    const aDist = Math.sqrt(aDx * aDx + aDy * aDy) || 1;
    // Mob facing direction (0=down,1=up,2=left,3=right)
    const facingAngles = [Math.PI / 2, -Math.PI / 2, Math.PI, 0];
    const faceAng = facingAngles[mob.dir] || Math.PI / 2;
    const attackAng = Math.atan2(aDy, aDx);
    let angleDiff = Math.abs(attackAng - faceAng);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff < Math.PI / 3) { // within ~60 degree arc from front = blocked
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: mob.x, y: mob.y - 20, life: 15, type: 'shield_block' });
      }
      return false;
    }
  }

  // Counter stance — melee attacks are reflected back at player
  if (mob._counterStance && source === 'melee') {
    if (typeof dealDamageToPlayer === 'function') {
      const _atkEntity = attackerEntity || _currentDamageTarget || player;
      dealDamageToPlayer(mob.damage, 'contact', mob, _atkEntity);
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: _atkEntity.x, y: _atkEntity.y - 20, life: 15, type: "hit", dmg: mob.damage });
      }
    }
    return false;
  }

  // Passive damage reduction — percentage-based
  if (mob._damageReduction) {
    amount = Math.round(amount * (1 - mob._damageReduction));
    if (amount < 1) amount = 1;
  }

  // Shield absorb — damage hits shield first, remainder goes to HP
  if (mob._shieldHp > 0) {
    if (amount <= mob._shieldHp) {
      mob._shieldHp -= amount;
      return false; // shield absorbed all damage
    }
    amount -= mob._shieldHp;
    mob._shieldHp = 0;
  }

  mob.hp -= amount;

  // Split mechanic: Core Guardian splits into 2 smaller blobs at 50% HP
  if (mob._canSplit && !mob._splitDone && mob.hp > 0 && mob.hp <= mob.maxHp * 0.5) {
    mob._splitDone = true;
    const mt = typeof MOB_TYPES !== 'undefined' ? MOB_TYPES[mob.type] : null;
    if (mt && typeof mobs !== 'undefined') {
      for (let si = 0; si < 2; si++) {
        const angle = Math.random() * Math.PI * 2;
        let sx = mob.x + Math.cos(angle) * 50;
        let sy = mob.y + Math.sin(angle) * 50;
        // Validate split spawn position against walls
        if (typeof positionClear === 'function' && !positionClear(sx, sy)) {
          let _splitFound = false;
          for (let _sa = 0; _sa < 8 && !_splitFound; _sa++) {
            const _sang = _sa * Math.PI / 4;
            const _cx = mob.x + Math.cos(_sang) * 50;
            const _cy = mob.y + Math.sin(_sang) * 50;
            if (positionClear(_cx, _cy)) { sx = _cx; sy = _cy; _splitFound = true; }
          }
          if (!_splitFound) { sx = mob.x; sy = mob.y; }
        }
        const mobId = typeof nextMobId !== 'undefined' ? nextMobId++ : Math.floor(Math.random() * 99999);
        const splitMob = {
          x: sx, y: sy, type: mob.type, id: mobId,
          hp: Math.round(mob.maxHp * 0.35), maxHp: Math.round(mob.maxHp * 0.35),
          speed: mob.speed * 1.6, damage: mob.damage,
          contactRange: mob.contactRange, skin: mob.skin, hair: mob.hair,
          shirt: mob.shirt, pants: mob.pants, name: mob.name + " Shard",
          dir: 0, frame: 0, attackCooldown: 0,
          shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
          summonRate: 0, summonMax: 0, summonTimer: 0,
          arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0,
          arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
          _specials: null, _specialTimer: 9999, _specialCD: 9999,
          _abilityCDs: {}, _cloaked: false, _cloakTimer: 0,
          _bombs: [], _mines: [], _canSplit: false, _splitDone: true,
          scale: (mob.scale || 1) * 0.7,
          spawnFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
        };
        mobs.push(splitMob);
        if (typeof hitEffects !== 'undefined') {
          hitEffects.push({ x: sx, y: sy - 20, life: 20, type: "summon" });
        }
      }
    }
  }

  if (mob.hp <= 0) {
    // Derive killerId from attackerEntity so bot kills are attributed correctly
    let _killerId = undefined;
    if (attackerEntity && attackerEntity._isBot) {
      const _km = typeof PartySystem !== 'undefined' ? PartySystem.getMemberByEntity(attackerEntity) : null;
      _killerId = _km ? _km.id : 'player';
    }
    processKill(mob, source, _killerId);
    return true; // died
  }
  return false; // survived
}

// ===================== CENTRALIZED PLAYER DAMAGE SYSTEM =====================
// Apply knockback to the current damage target (bot or player).
// All specials should call this instead of hardcoding player.knockVx/knockVy.
function applyKnockback(vx, vy) {
  const t = _currentDamageTarget || player;
  t.knockVx = vx;
  t.knockVy = vy;
}

// dealDamageToPlayer(rawDamage, source, attacker)
//   source: "contact"    — armor reduction + thorns (melee mob hits)
//           "projectile" — armor + projectile reduction (arrows, generic bullets)
//           "aoe"        — armor + projectile reduction (explosions, stomps)
//           "dot"        — no reduction (already pre-reduced by caller)
//   attacker: optional mob reference for thorns/stagger response
//   Returns: final damage dealt after reductions
//
function dealDamageToPlayer(rawDamage, source, attacker, targetEntity) {
  // Resolve target: explicit param > _currentDamageTarget > global player
  const target = targetEntity || _currentDamageTarget || player;
  const isBot = target !== player && target._isBot;
  const targetEquip = isBot ? (typeof PartySystem !== 'undefined' && PartySystem.getMemberByEntity(target)?.equip || playerEquip) : playerEquip;

  if (!isBot && playerDead) return 0;
  if (isBot && target._isDead) return 0;
  if (!isBot && window._godMode) return 0; // /god — player invincibility

  // Lethal Efficiency: 15% bonus damage when target is below 40% HP
  if (attacker && attacker._lethalEfficiency) {
    if (target.hp < target.maxHp * 0.4) {
      rawDamage = Math.round(rawDamage * 1.15);
    }
  }

  // Backstabber: 30% bonus damage if mob is behind the target
  if (attacker && attacker._backstabber) {
    const toMobAngle = Math.atan2(attacker.y - target.y, attacker.x - target.x);
    const facingAngles = [Math.PI / 2, Math.PI, -Math.PI / 2, 0]; // down=0, left=1, up=2, right=3
    const targetFacing = facingAngles[target.dir || 0];
    let angleDiff = Math.abs(toMobAngle - targetFacing);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    if (angleDiff > Math.PI / 2) {
      rawDamage = Math.round(rawDamage * 1.3);
    }
  }

  // 1. Apply armor reduction (uses target's equipment)
  let reduced = rawDamage;
  if (source !== "dot") {
    reduced *= (1 - getArmorReduction(targetEquip));
  }

  // 2. Apply projectile/AOE reduction
  if (source === "projectile" || source === "aoe") {
    reduced *= (1 - getProjReduction(targetEquip));
  }

  // 2b. Armor Break multiplier (Vortalis status effect) — player only
  if (!isBot && typeof StatusFX !== 'undefined' && StatusFX.playerEffects._armorBreak) {
    reduced *= StatusFX.playerEffects._armorBreakMult;
  }

  // 3. Round and subtract
  const finalDmg = Math.round(reduced);
  target.hp -= finalDmg;

  // 4. Thorns — reflect damage to attacker on contact hits
  if (source === "contact" && attacker && attacker.hp > 0) {
    const thornsRate = getThorns(targetEquip);
    if (thornsRate > 0) {
      const thornsDmg = Math.round(finalDmg * thornsRate);
      hitEffects.push({ x: attacker.x, y: attacker.y - 15, life: 15, type: "hit", dmg: thornsDmg });
      hitEffects.push({ x: attacker.x, y: attacker.y, life: 12, type: "thorns" });
      dealDamageToMob(attacker, thornsDmg, "thorns");
      const staggerTime = getStagger(targetEquip);
      if (staggerTime > 0) {
        StatusFX.applyToMob(attacker, 'stagger', { duration: Math.round(staggerTime * 60) });
      }
    }
  }

  // 5. Death check
  if (isBot) {
    // Bot death handling
    if (target.hp <= 0 && !target._isDead) {
      const member = typeof PartySystem !== 'undefined' ? PartySystem.getMemberByEntity(target) : null;
      if (member) PartySystem.handleMemberDeath(member);
    }
  } else {
    checkPlayerDeath();
  }

  Events.emit('player_damaged', { amount: finalDmg, raw: rawDamage, source, attacker, target });
  return finalDmg;
}

// ===================== WEAPON BEHAVIOR REGISTRY =====================
// Data-driven weapon special effects. To add a new gun special:
//   1. Add entry to GUN_BEHAVIORS with onHit and/or onKill callbacks
//   2. Add tier to GUN_TIERS with special: 'yourSpecial'
//   That's it — combat code auto-dispatches via the registry.
//
const GUN_BEHAVIORS = {
  frost: {
    // On-hit: slow the target
    onHit: function(mob, bx, by) {
      StatusFX.applyToMob(mob, 'frost', { duration: 90, slow: 0.25 });
      hitEffects.push({ x: bx, y: by, life: 20, type: "frost_hit" });
    },
    // On-kill: AOE frost nova freezes nearby enemies
    onKill: function(mob, killerGun) {
      const frostNovaRadius = 120;
      hitEffects.push({ x: mob.x, y: mob.y, life: 22, type: "frost_nova" });
      for (const s of mobs) {
        if (s === mob || s.hp <= 0) continue;
        const fdx = s.x - mob.x, fdy = s.y - mob.y;
        if (fdx * fdx + fdy * fdy < frostNovaRadius * frostNovaRadius) {
          StatusFX.applyToMob(s, 'frost', { duration: 60, slow: 1.0 });
          hitEffects.push({ x: s.x, y: s.y - 10, life: 16, type: "frost_hit" });
        }
      }
    },
    killSources: ["gun"], // only direct bullet kills trigger frost nova
  },
  burn: {
    // On-hit: apply burn DOT
    onHit: function(mob, bx, by) {
      StatusFX.applyToMob(mob, 'burn', { duration: 180, dmg: 11 });
      hitEffects.push({ x: bx, y: by, life: 20, type: "burn_hit" });
    },
    // On-kill: burning enemies explode, chain reaction
    onKill: function(mob, killerGun) {
      if (mob.burnTimer <= 0) return; // only burning mobs explode
      const explosionRadius = 100;
      const explosionDmg = Math.round((killerGun || gun).damage * 0.8);
      hitEffects.push({ x: mob.x, y: mob.y, life: 20, type: "inferno_explode" });
      for (const s of mobs) {
        if (s === mob || s.hp <= 0) continue;
        const edx = s.x - mob.x, edy = s.y - mob.y;
        if (edx * edx + edy * edy < explosionRadius * explosionRadius) {
          StatusFX.applyToMob(s, 'burn', { duration: 180, dmg: 11 });
          hitEffects.push({ x: s.x, y: s.y - 15, life: 15, type: "hit", dmg: explosionDmg });
          hitEffects.push({ x: s.x, y: s.y - 10, life: 16, type: "burn_hit" });
          if (dealDamageToMob(s, explosionDmg, "inferno_chain")) {
            // Chain reaction — 2nd tier explosion at 60% damage
            if (s.burnTimer > 0) {
              hitEffects.push({ x: s.x, y: s.y, life: 18, type: "inferno_explode" });
              for (const s2 of mobs) {
                if (s2 === s || s2 === mob || s2.hp <= 0) continue;
                const e2dx = s2.x - s.x, e2dy = s2.y - s.y;
                if (e2dx * e2dx + e2dy * e2dy < explosionRadius * explosionRadius) {
                  StatusFX.applyToMob(s2, 'burn', { duration: 180, dmg: 11 });
                  hitEffects.push({ x: s2.x, y: s2.y - 15, life: 15, type: "hit", dmg: Math.round(explosionDmg * 0.6) });
                  hitEffects.push({ x: s2.x, y: s2.y - 10, life: 14, type: "burn_hit" });
                  dealDamageToMob(s2, Math.round(explosionDmg * 0.6), "inferno_chain");
                }
              }
            }
          }
        }
      }
    },
    killSources: ["gun", "burn_dot"], // bullet kills and burn DOT kills trigger explosions
  },
  // === ADD NEW GUN SPECIALS HERE ===
  // Example:
  // lightning: {
  //   onHit: function(mob, bx, by) { /* chain to nearby */ },
  //   onKill: function(mob) { /* thunderstrike AOE */ },
  //   killSources: ["gun"],
  // },
};

// Heal multipliers per melee source (used in processKill)
const MELEE_HEAL_MULTS = {
  gun: 2.0,
  melee: function(m) {
    if (m.special === 'ninja' && m.dashActive) return 2.0;
    if (m.special === 'storm') return 1.5;
    return 1.0;
  },
  ninja_splash: function(m) { return m.dashActive ? 2.0 : 1.0; },
  ninja_dash_kill: 2.0,
  storm_shock: 1.5,
  storm_chain: 1.5,
  shrine: 1.0,
  godspeed: 1.0,
  burn_dot: 1.0,
  inferno_chain: 1.0,
  thorns: 1.0,
  piercing_blood: 1.5,
};

function getKillHealMult(source, killerMelee) {
  const entry = MELEE_HEAL_MULTS[source];
  if (typeof entry === 'function') return entry(killerMelee || melee);
  if (typeof entry === 'number') return entry;
  return 1.0;
}

function processKill(mob, source, killerId) {
  // ---- Resolve killer to a member (multiplayer-ready: all players are members) ----
  // Priority: explicit killerId → _currentDamageTarget → fallback 'player'
  if (!killerId) {
    if (_currentDamageTarget) {
      const _km = typeof PartySystem !== 'undefined' ? PartySystem.getMemberByEntity(_currentDamageTarget) : null;
      killerId = _km ? _km.id : 'player';
    } else {
      killerId = 'player';
    }
  }

  // Resolve member + entity — works identically for player or any remote user
  const _partyActive = PartyState.members.length > 0;
  const killerMember = _partyActive ? PartySystem.getMemberById(killerId) : null;
  const killerEntity = killerMember ? killerMember.entity : player;
  const killerEquip = killerMember ? killerMember.equip : playerEquip;
  const killerGun = killerMember ? (killerMember.gun || gun) : gun;
  const killerMelee = killerMember ? (killerMember.melee || melee) : melee;

  // 1. Kill count + XP — each member earns their own (for now, local-only progression)
  kills++;
  if (!killerMember || killerMember.controlType === 'local') {
    addPlayerXP(5);
    addSkillXP("Total Kills", 5);
  }

  // 2. Quick-kill bonus
  const qkb = getQuickKillBonus(mob);

  // 3. Gold reward — goes to killer's own wallet
  // Scale gold by party size: more members = fewer kills each, so each kill pays more
  // Uses total party size (not alive count) — rates stay the same even if someone dies
  const _partyGoldMult = _partyActive ? PartyState.members.length : 1;
  const goldEarned = Math.round(getGoldReward(mob.type, wave) * qkb * _partyGoldMult);
  if (_partyActive) {
    PartySystem.addGold(killerId, goldEarned);
  } else {
    gold += goldEarned;
  }

  // 4. Kill heal
  const baseHeal = (MOB_TYPES[mob.type] && MOB_TYPES[mob.type].killHeal) || 5;

  // Witch skeleton early return — flat 1 HP, no normal rewards
  if (source === "witch_skeleton") {
    killerEntity.hp = Math.min(killerEntity.maxHp, killerEntity.hp + 1);
    hitEffects.push({ x: mob.x, y: mob.y - 20, life: 20, type: "kill", gold: 0 });
    Events.emit('mob_killed', { mob, source, goldEarned: 0, heal: 1, killerId, killerMember });
    return;
  }

  // Source-specific heal multiplier (from MELEE_HEAL_MULTS registry)
  const healMult = getKillHealMult(source, killerMelee);

  // Apply chest armor heal boost — uses killer's own equipment
  const chestHealBoost = killerEquip.chest && killerEquip.chest.healBoost ? killerEquip.chest.healBoost : 0;
  let finalHeal = Math.round(baseHeal * qkb * healMult * (1 + chestHealBoost));
  // Lifesteal floor — uses killer's own lifesteal stat (if they have one)
  const killerLifesteal = killerMember && killerMember._lifestealPerKill != null
    ? killerMember._lifestealPerKill
    : (typeof lifestealPerKill !== 'undefined' ? lifestealPerKill : 0);
  if (killerLifesteal > 0) finalHeal = Math.max(finalHeal, killerLifesteal);
  if (finalHeal > 0) {
    const _prevKillerHp = killerEntity.hp;
    killerEntity.hp = Math.min(killerEntity.maxHp, killerEntity.hp + finalHeal);
    // Lifesteal visual feedback (show on bots too)
    const _actualHeal = killerEntity.hp - _prevKillerHp;
    if (_actualHeal > 0 && killerLifesteal > 0) {
      hitEffects.push({ x: killerEntity.x, y: killerEntity.y - 35, life: 12, type: "heal", dmg: "+" + _actualHeal });
    }
  }

  // 4b. Party Lifesteal — heal ALL alive party members (stacks with personal lifesteal)
  const _pLifesteal = typeof partyLifesteal !== 'undefined' ? partyLifesteal : 0;
  if (_pLifesteal > 0 && _partyActive) {
    const aliveEntities = PartySystem.getAliveEntities();
    for (const _pe of aliveEntities) {
      if (_pe === killerEntity) continue; // killer already healed above
      const prevHp = _pe.hp;
      _pe.hp = Math.min(_pe.maxHp, _pe.hp + _pLifesteal);
      if (_pe.hp > prevHp) {
        hitEffects.push({ x: _pe.x, y: _pe.y - 35, life: 15, type: "heal", dmg: "+" + (_pe.hp - prevHp) });
      }
    }
  }

  // 5. Visual effects
  hitEffects.push({ x: mob.x, y: mob.y - 20, life: 25, type: "kill", gold: goldEarned });
  if (source === "ninja_dash_kill" || source === "ninja_splash" || (finalHeal >= 15)) {
    hitEffects.push({ x: killerEntity.x, y: killerEntity.y - 35, life: 18, type: "heal", dmg: "+" + finalHeal + " HP" });
  }

  // 6. Witch death → kill all her skeletons
  if (mob.type === "witch") {
    for (const s of mobs) {
      if (s.witchId === mob.id && s.hp > 0) {
        s.hp = 0;
        processKill(s, "witch_skeleton", killerId);
      }
    }
  }
  // Golem death → kill all its mini golems
  if (mob.type === "golem") {
    for (const s of mobs) {
      if (s.golemOwnerId === mob.id && s.hp > 0) {
        s.hp = 0;
        processKill(s, "witch_skeleton", killerId);
      }
    }
  }

  // 6b. Death explosion — AoE damage around dead mob (hits all party members)
  if (mob._deathExplosion) {
    const expR = mob._deathExplosion.radius || 80;
    const expDmg = mob._deathExplosion.damage || mob.damage;
    const _deTargets = _partyActive ? PartySystem.getAliveEntities() : [player];
    for (const _det of _deTargets) {
      const ddx = _det.x - mob.x, ddy = _det.y - mob.y;
      if (Math.sqrt(ddx * ddx + ddy * ddy) <= expR) {
        dealDamageToPlayer(expDmg, 'explosion', mob, _det);
      }
    }
    hitEffects.push({ x: mob.x, y: mob.y, life: 20, type: "explosion" });
  }

  // 7. Emit event — subscribers use killerMember for all per-member routing
  Events.emit('mob_killed', { mob, source, goldEarned, heal: finalHeal, qkb, killerId, killerMember });
}

// === EVENT SUBSCRIBERS: mob_killed ===
// Ammo refill on kill — refills the killer's gun (whoever they are)
Events.on('mob_killed', ({ mob, source, killerId, killerMember }) => {
  if (source === "witch_skeleton") return;
  if (mob.type === 'skeleton') return;
  // Resolve the killer's gun state
  const _kGun = killerMember ? (killerMember.gun || gun) : gun;
  _kGun.ammo = _kGun.magSize;
  _kGun.reloading = false;
  _kGun.reloadTimer = 0;
});

// Ultimate charge on kill — uses killer's melee special to determine which ultimate
Events.on('mob_killed', ({ mob, source, killerId, killerMember }) => {
  if (source === "witch_skeleton") return;
  // Any party member's kills charge the shared ultimate (shrine/godspeed are party singletons)
  const _kMelee = killerMember ? (killerMember.melee || melee) : melee;
  if (typeof shrine !== 'undefined' && _kMelee.special === 'cleave' && !shrine.active) {
    shrine.charges = Math.min((shrine.charges || 0) + 1, shrine.chargesMax || 10);
  }
  if (typeof godspeed !== 'undefined' && _kMelee.special === 'storm' && !godspeed.active) {
    godspeed.charges = Math.min((godspeed.charges || 0) + 1, godspeed.chargesMax || 10);
  }
});

// Gun on-kill special effects (frost nova, inferno explosion, etc.)
// TODO(multiplayer): each member's gun special should trigger from their position
Events.on('mob_killed', ({ mob, source, killerMember }) => {
  const _kGun = killerMember ? (killerMember.gun || gun) : gun;
  if (_kGun.special && GUN_BEHAVIORS[_kGun.special]) {
    const behavior = GUN_BEHAVIORS[_kGun.special];
    if (behavior.onKill && behavior.killSources && behavior.killSources.includes(source)) {
      behavior.onKill(mob, _kGun);
    }
  }
});

// === ADD NEW KILL SUBSCRIBERS HERE ===
// e.g. Events.on('mob_killed', ({ mob, source, goldEarned }) => { /* bounty system */ });
// e.g. Events.on('mob_killed', ({ mob }) => { /* kill streak tracker */ });

// Death animation state
let playerDead = false;
let poisonTimer = 0; // frames remaining of poison (20 sec = 1200 frames at 60fps)
let poisonTickTimer = 0; // ticks every 60 frames for 1 dmg/sec
let deathTimer = 0;
const DEATH_ANIM_FRAMES = 40;   // ~0.67s death animation
const RESPAWN_COUNTDOWN = 180;   // 3 seconds (60fps * 3)
let respawnTimer = 0;
let deathX = 0, deathY = 0;     // where player died
let deathRotation = 0;
let deathGameOver = false;       // true = no lives left, go to lobby

const hotbarSlots = [
  { name: "RECRUIT", type: "gun", key: "1" },
  { name: "KATANA", type: "melee", key: "2" },
  { name: "POTION", type: "potion", key: "3" },
];

