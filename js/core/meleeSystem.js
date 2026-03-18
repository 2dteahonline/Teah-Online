// ===================== MELEE SYSTEM =====================
// Core: katana melee combat, dashing, specials
// Extracted from index_2.html — Phase E

// ===================== KATANA MELEE SYSTEM =====================
// melee → js/authority/gameState.js

// Lifesteal helper — 15% of damage dealt, capped at 20 HP
function calcLifesteal(dmg) { return Math.min(Math.round(dmg * 0.15), 20); }

// Malevolent Shrine — War Cleaver ultimate ability
const shrine = {
  charges: 0,
  chargesMax: 10, // kills needed to charge
  active: false,
  timer: 0,
  duration: 180, // 3 seconds at 60fps
  range: 150,
  slashInterval: 4, // slash every 4 frames (45 slashes total — relentless)
  damagePerSlash: 0, // set on activation based on melee.damage
};

// Godspeed — Storm Blade ultimate (Killua lightning aura + Kashimo ground strikes)
const godspeed = {
  charges: 0,
  chargesMax: 10,
  active: false,
  timer: 0,
  duration: 300, // 5 seconds
  range: 180,
  strikeInterval: 8,
  damagePerStrike: 0,
};

function meleeSwing() {
  // During ninja dash, skip cooldown check — allow rapid slashes with small gap
  if (melee.special === 'ninja' && melee.dashActive && melee.dashesLeft > 0 && !melee.dashing && melee.dashGap <= 0) {
    // Dash-attack: dash + swing together
  } else {
    if (melee.cooldown > 0 || melee.swinging) return;
  }

  melee.swinging = true;
  melee.swingTimer = melee.swingDuration;
  melee.cooldown = melee.cooldownMax;

  // Swing direction based on aim
  const aimDir = getAimDir();
  
  // Face the swing direction
  shootFaceDir = aimDir;
  shootFaceTimer = melee.swingDuration + 2;

  if (aimDir === 0) melee.swingDir = Math.PI / 2;
  else if (aimDir === 1) melee.swingDir = -Math.PI / 2;
  else if (aimDir === 2) melee.swingDir = Math.PI;
  else melee.swingDir = 0;

  // Fishing rod intercept: if near fishing_spot and rod equipped, start fishing instead of combat
  if (melee.special === 'fishing' && typeof nearFishingSpot !== 'undefined' && nearFishingSpot
      && typeof fishingState !== 'undefined' && !fishingState.active) {
    startFishingCast();
    return; // Skip melee damage — swing animation already started above
  }

  // Farming: handled by direct dispatch in inventory.js (handleFarmAction), not via melee

  // Ninja dash-attack: swing triggers a dash in the attack direction
  if (melee.special === 'ninja' && melee.dashActive && melee.dashesLeft > 0 && !melee.dashing) {
    melee.dashing = true;
    melee.dashTimer = melee.dashDuration;
    melee.dashTrail = [];
    melee.dashesLeft--;
    melee.dashChainWindow = 180;
    melee.cooldown = 0; // no cooldown between dash slashes
    if (aimDir === 0) { melee.dashDirX = 0; melee.dashDirY = 1; }
    else if (aimDir === 1) { melee.dashDirX = 0; melee.dashDirY = -1; }
    else if (aimDir === 2) { melee.dashDirX = -1; melee.dashDirY = 0; }
    else { melee.dashDirX = 1; melee.dashDirY = 0; }
    hitEffects.push({ x: player.x, y: player.y - 15, life: 15, type: "ninja_dash" });
  }

  // Hit mobs — cleave hits ALL in range (360°), others only in arc
  const halfArc = melee.arcAngle / 2;
  const isCleave = melee.special === 'cleave';
  const stormHits = []; // track hits for chain lightning
  const cleaveHits = []; // track hits for piercing blood

  // Hide & Seek tag check — loop hider participants (multiplayer-ready)
  if (typeof HideSeekSystem !== 'undefined' && typeof HideSeekState !== 'undefined' &&
      HideSeekState.phase === 'seek' && HideSeekState.playerRole === 'seeker') {
    const hiders = HideSeekSystem.getHiders();
    for (const h of hiders) {
      if (!h.entity || h.isLocal) continue; // don't tag yourself
      const tdx = h.entity.x - player.x;
      const tdy = h.entity.y - player.y;
      const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tDist < melee.range) {
        const angleToBot = Math.atan2(tdy, tdx);
        let angleDiff = angleToBot - melee.swingDir;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        if (Math.abs(angleDiff) < halfArc) {
          HideSeekSystem.onTag();
          hitEffects.push({ x: h.entity.x, y: h.entity.y - 20, life: 30, maxLife: 30, type: "heal", dmg: "TAG!" });
          break; // one tag per swing
        }
      }
    }
  }

  // Shared entity-agnostic hit logic (used by player meleeSwing and bot botMelee)
  _meleeHitMobs(player, melee, melee.swingDir, halfArc);
}

// === SHARED MELEE HIT LOGIC (entity-agnostic) ===
// Handles all melee specials: cleave 360, storm shockwave + chain lightning,
// ninja splash, lifesteal, crits, piercing blood. Called by meleeSwing() and botMelee().
function _meleeHitMobs(entity, ml, swingDir, halfArc) {
  const isCleave = ml.special === 'cleave';
  const isStorm = ml.special === 'storm';
  const isNinja = ml.special === 'ninja';
  const stormHits = [];
  const cleaveHits = [];

  for (const m of mobs) {
    if (m.hp <= 0) continue;

    const dx = m.x - entity.x;
    const dy = m.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < ml.range) {
      let inArc = true;
      if (!isCleave && halfArc != null) {
        const angleToMob = Math.atan2(dy, dx);
        let angleDiff = angleToMob - swingDir;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        inArc = Math.abs(angleDiff) < halfArc;
      }

      if (inArc) {
        const critChance = ml.critChance || 0.20;
        const ninjaDashing = isNinja && ml.dashActive;
        const hasShadowStep = !!entity._shadowStep;
        const isCrit = ninjaDashing ? true : hasShadowStep ? true : Math.random() < critChance;
        const critMult = isCrit ? 1.5 : 1.0;
        const dashMult = ninjaDashing ? 4.0 : 1.0;
        const meleeDmg = Math.round(ml.damage * critMult * dashMult);
        dealDamageToMob(m, meleeDmg, "melee", entity);
        // Consume shadow step on first hit
        if (hasShadowStep && !ninjaDashing) entity._shadowStep = false;
        if (isCrit) {
          hitEffects.push({ x: m.x, y: m.y - 30, life: 28, type: "crit", dmg: meleeDmg });
        } else {
          hitEffects.push({ x: m.x, y: m.y - 20, life: 19, type: "hit", dmg: meleeDmg });
        }

        // Ninja Katanas — dual crossing slashes + AOE splash
        if (isNinja) {
          const slashA = Math.atan2(dy, dx);
          hitEffects.push({ x: m.x, y: m.y - 10, life: 16, type: "ninja_slash", angle: slashA });
          hitEffects.push({ x: m.x, y: m.y - 10, life: 18, type: "ninja_slash", angle: slashA + Math.PI / 2.5 });
          hitEffects.push({ x: m.x, y: m.y, life: 14, type: "ninja_aoe" });
          const splashDmg = Math.round(ml.damage * 0.3 * dashMult);
          for (const s of mobs) {
            if (s === m || s.hp <= 0) continue;
            const sdx = s.x - m.x, sdy = s.y - m.y;
            if (sdx * sdx + sdy * sdy < 60 * 60) {
              hitEffects.push({ x: s.x, y: s.y - 15, life: 12, type: "hit", dmg: splashDmg });
              const sa2 = Math.atan2(sdy, sdx);
              hitEffects.push({ x: s.x, y: s.y - 8, life: 12, type: "ninja_slash", angle: sa2 });
              dealDamageToMob(s, splashDmg, "ninja_splash", entity);
              const splashHeal = calcLifesteal(splashDmg);
              if (splashHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + splashHeal);
            }
          }
          const ninjaHeal = calcLifesteal(meleeDmg);
          if (ninjaHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + ninjaHeal);
        }

        // Knockback
        if (dist > 0 && ml.knockback) {
          const kx = (dx / dist) * ml.knockback;
          const ky = (dy / dist) * ml.knockback;
          const nc = Math.floor((m.x + kx) / TILE);
          const nr = Math.floor((m.y + ky) / TILE);
          if (!isSolid(nc, nr)) { m.x += kx; m.y += ky; }
        }

        // Storm Blade: shockwave + chain lightning + lifesteal
        if (isStorm && m.hp > 0) {
          stormHits.push(m);
          const stormLifesteal = calcLifesteal(meleeDmg);
          if (stormLifesteal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + stormLifesteal);
          hitEffects.push({ x: m.x, y: m.y, life: 18, type: "shockwave" });
          const shockDmg = Math.round(ml.damage * 0.65);
          for (const s of mobs) {
            if (s === m || s.hp <= 0) continue;
            const sdx = s.x - m.x, sdy = s.y - m.y;
            if (sdx * sdx + sdy * sdy < 80 * 80) {
              const shockHeal = calcLifesteal(shockDmg);
              if (shockHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + shockHeal);
              hitEffects.push({ x: s.x, y: s.y - 15, life: 15, type: "hit", dmg: shockDmg });
              dealDamageToMob(s, shockDmg, "storm_shock", entity);
            }
          }
        }

        // Cleave visual + track for piercing blood
        if (isCleave) {
          hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "cleave_hit" });
          cleaveHits.push(m);
          const cleaveHeal = calcLifesteal(meleeDmg);
          if (cleaveHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + cleaveHeal);
        }
      }
    }
  }

  // Storm chain lightning — from each hit mob, arc to 2-3 nearby
  if (isStorm && stormHits.length > 0) {
    const chainDmg = Math.round(ml.damage * 0.50);
    const chainedSet = new Set(stormHits.map(m2 => mobs.indexOf(m2)));
    for (const src of stormHits) {
      let prev = src;
      for (let c = 0; c < 3; c++) {
        let closest = null, closestDist = 160;
        for (const t of mobs) {
          if (t.hp <= 0 || t === prev) continue;
          if (chainedSet.has(mobs.indexOf(t))) continue;
          const cdx = t.x - prev.x, cdy = t.y - prev.y;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cd < closestDist) { closest = t; closestDist = cd; }
        }
        if (!closest) break;
        chainedSet.add(mobs.indexOf(closest));
        const chainHeal = calcLifesteal(chainDmg);
        if (chainHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + chainHeal);
        hitEffects.push({ x: closest.x, y: closest.y - 15, life: 15, type: "hit", dmg: chainDmg });
        hitEffects.push({ x: prev.x, y: prev.y - 15, life: 12, type: "lightning", tx: closest.x, ty: closest.y - 15 });
        dealDamageToMob(closest, chainDmg, "storm_chain", entity);
        prev = closest;
      }
    }
  }

  // Piercing Blood — blood slashes from cleave-hit mobs
  if (isCleave && cleaveHits.length > 0) {
    const bloodDmg = Math.round(ml.damage * 0.55);
    const bloodRange = 280;
    const alreadyBled = new Set(cleaveHits);
    for (const src of cleaveHits) {
      if (src.hp <= 0) continue;
      const dirFromEntity = Math.atan2(src.y - entity.y, src.x - entity.x);
      for (let s = 0; s < 5; s++) {
        const a = dirFromEntity + (s - 2) * 0.45;
        hitEffects.push({ x: src.x, y: src.y, life: 22, maxLife: 22, type: "blood_slash_arc", angle: a, px: src.x, py: src.y });
      }
      for (const t of mobs) {
        if (t.hp <= 0 || alreadyBled.has(t)) continue;
        const tdx = t.x - src.x, tdy = t.y - src.y;
        if (Math.sqrt(tdx * tdx + tdy * tdy) < bloodRange) {
          alreadyBled.add(t);
          dealDamageToMob(t, bloodDmg, "piercing_blood", entity);
          const bloodHeal = calcLifesteal(bloodDmg);
          if (bloodHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + bloodHeal);
          hitEffects.push({ x: t.x, y: t.y - 20, life: 18, type: "hit", dmg: bloodDmg });
          hitEffects.push({ x: t.x, y: t.y - 10, life: 22, type: "blood_slash_hit" });
        }
      }
    }
  }
}

function updateMelee() {
  if (melee.cooldown > 0) melee.cooldown--;
  if (melee.swingTimer > 0) {
    melee.swingTimer--;
    if (melee.swingTimer <= 0) melee.swinging = false;
  }
  
  // Ninja dash cooldown and chain window
  if (melee.dashCooldown > 0) melee.dashCooldown--;
  if (melee.dashGap > 0) melee.dashGap--;
  if (melee.dashActive && !melee.dashing) {
    melee.dashChainWindow--;
    if (melee.dashChainWindow <= 0 || melee.dashesLeft <= 0) {
      // Chain expired or all dashes used — start cooldown
      melee.dashesLeft = 0;
      melee.dashActive = false;
      melee.dashCooldown = melee.dashCooldownMax;
    }
  }
  
  // Ninja dash movement (entity-agnostic via shared function)
  if (melee.dashing) {
    _tickDashMovement(player, melee);
  }
  
  // Malevolent Shrine — rapid slashing everything in range (centers on activator)
  if (shrine.active) {
    shrine.timer--;
    const _shrineCenter = shrine._activator || player;
    if (shrine.timer <= 0) {
      shrine.active = false;
      shrine._activator = null;
    } else if (shrine.timer % shrine.slashInterval === 0) {
      // Slash all mobs in range of the activator
      const slashAngle = Math.random() * Math.PI * 2;
      for (const m of mobs) {
        if (m.hp <= 0) continue;
        const dx = m.x - _shrineCenter.x;
        const dy = m.y - _shrineCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < shrine.range) {
          // Guaranteed hit — mobs below 15% HP are instantly killed
          const isExecute = m.hp <= m.maxHp * 0.15;
          const dmg = isExecute ? m.hp : shrine.damagePerSlash;
          
          // Visual slash effect at random angles
          const sa = slashAngle + Math.random() * 1.2 - 0.6;
          // Multiple bloody slash lines per hit — JJK dismantle style
          for (let sl = 0; sl < 2; sl++) {
            const sa2 = slashAngle + Math.random() * Math.PI - Math.PI / 2;
            hitEffects.push({ x: m.x + (Math.random() - 0.5) * 30, y: m.y - 15 + (Math.random() - 0.5) * 30, life: 18, type: "shrine_slash", angle: sa2 });
          }
          
          if (isExecute) {
            hitEffects.push({ x: m.x, y: m.y - 25, life: 20, type: "hit", dmg: "EXECUTE" });
          } else {
            hitEffects.push({ x: m.x, y: m.y - 20 - Math.random() * 15, life: 12, type: "hit", dmg: dmg });
          }
          
          dealDamageToMob(m, dmg, "shrine");
        }
      }
    }
  }
  // Godspeed — Killua lightning mode with Kashimo ground strikes (centers on activator)
  if (godspeed.active) {
    godspeed.timer--;
    const _godspeedCenter = godspeed._activator || player;
    if (godspeed.timer <= 0) {
      godspeed.active = false;
      godspeed._activator = null;
    } else if (godspeed.timer % godspeed.strikeInterval === 0) {
      // Ground lightning strikes on all mobs in range of the activator
      for (const m of mobs) {
        if (m.hp <= 0) continue;
        const dx = m.x - _godspeedCenter.x;
        const dy = m.y - _godspeedCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < godspeed.range) {
          const isExecute = m.hp <= m.maxHp * 0.15;
          const dmg = isExecute ? m.hp : godspeed.damagePerStrike;

          // Kashimo-style ground lightning bolt shooting up from below
          hitEffects.push({ x: m.x + (Math.random() - 0.5) * 16, y: m.y, life: 16, type: "ground_lightning" });

          if (isExecute) {
            hitEffects.push({ x: m.x, y: m.y - 25, life: 20, type: "hit", dmg: "ZAP" });
          } else {
            hitEffects.push({ x: m.x, y: m.y - 20 - Math.random() * 10, life: 12, type: "hit", dmg: dmg });
          }

          dealDamageToMob(m, dmg, "godspeed");
        }
      }
    }
  }

  // Tick dash trail lifetime (moved from draw.js — render should not mutate state)
  for (let ti = melee.dashTrail.length - 1; ti >= 0; ti--) {
    melee.dashTrail[ti].life--;
    if (melee.dashTrail[ti].life <= 0) melee.dashTrail.splice(ti, 1);
  }
}

// === SHARED DASH MOVEMENT (entity-agnostic) ===
// Moves entity during ninja dash, damages mobs passed through, handles dash end.
// Called by updateMelee() for player, and by botAI.tickBot() for bots.
function _tickDashMovement(entity, ml) {
  ml.dashTimer--;
  if (ml.dashTrail) {
    ml.dashTrail.push({ x: entity.x, y: entity.y, life: 14 });
    if (ml.dashTrail.length > 8) ml.dashTrail.shift();
  }
  const nx = entity.x + ml.dashDirX * ml.dashSpeed;
  const ny = entity.y + ml.dashDirY * ml.dashSpeed;
  const col = Math.floor(nx / TILE), row = Math.floor(ny / TILE);
  if (!isSolid(col, row)) {
    entity.x = nx;
    entity.y = ny;
  } else {
    ml.dashTimer = 0;
  }
  // Damage mobs passed through (2x * 1.5 crit = 3x)
  for (const m of mobs) {
    if (m.hp <= 0 || m.dashHit) continue;
    const ddx = m.x - entity.x, ddy = m.y - entity.y;
    if (ddx * ddx + ddy * ddy < 50 * 50) {
      m.dashHit = true;
      const dmg = Math.round(ml.damage * 2.0 * 1.5);
      hitEffects.push({ x: m.x, y: m.y - 30, life: 28, type: "crit", dmg: dmg });
      const sa = Math.atan2(m.y - entity.y, m.x - entity.x);
      hitEffects.push({ x: m.x, y: m.y - 10, life: 16, type: "ninja_slash", angle: sa });
      hitEffects.push({ x: m.x, y: m.y - 10, life: 18, type: "ninja_slash", angle: sa + Math.PI / 3 });
      dealDamageToMob(m, dmg, "ninja_dash_kill", entity);
      const dashHeal = calcLifesteal(dmg);
      if (dashHeal > 0) entity.hp = Math.min(entity.maxHp, entity.hp + dashHeal);
    }
  }
  if (ml.dashTimer <= 0) {
    ml.dashing = false;
    ml.dashGap = 12;
    for (const m of mobs) delete m.dashHit;
    hitEffects.push({ x: entity.x, y: entity.y - 15, life: 12, type: "ninja_dash_end" });
    if (ml.dashesLeft <= 0) {
      ml.dashActive = false;
      ml.dashCooldown = ml.dashCooldownMax;
    }
  }
}

// === POTION SYSTEM (entity-agnostic) ===
// Shared heal logic for any entity. Player calls usePotion(), bots call usePotionEntity().
function usePotionEntity(entity, potionState, equip) {
  if (!potionState || potionState.count <= 0 || potionState.cooldown > 0 || entity.hp >= entity.maxHp) return;
  potionState.count--;
  potionState.cooldown = potionState.cooldownMax;
  const chestHealBoost = equip && equip.chest && equip.chest.healBoost ? equip.chest.healBoost : 0;
  const boostedHeal = Math.round(potionState.healAmount * (1 + chestHealBoost));
  const healed = Math.min(boostedHeal, entity.maxHp - entity.hp);
  entity.hp = Math.min(entity.maxHp, entity.hp + boostedHeal);
  hitEffects.push({ x: entity.x, y: entity.y - 30, life: 20, type: "heal", dmg: "+" + healed + " HP" });
}

// Player wrapper (called from input handler — unchanged signature)
function usePotion() {
  if (!Scene.inDungeon) return;
  usePotionEntity(player, potion, playerEquip);
}

function updatePotion() {
  if (potion.cooldown > 0) potion.cooldown--;
}

// === GRAB SYSTEM (entity-agnostic) ===
// All grab state lives on member.grab { active, timer, target, cooldown }
// tryGrab/updateGrab accept entity + member so any participant can grab.

function _resolveGrabState(entity) {
  // Returns the grab state object for this entity (member.grab or legacy globals for backward compat)
  if (typeof PartySystem !== 'undefined') {
    const m = PartySystem.getMemberByEntity(entity);
    if (m) return m.grab;
  }
  // Fallback: write to legacy globals (shouldn't happen if party is active)
  return { active: isGrabbing, timer: grabTimer, target: grabTarget, cooldown: grabCooldown };
}

function tryGrabEntity(entity, memberMelee) {
  const m = typeof PartySystem !== 'undefined' ? PartySystem.getMemberByEntity(entity) : null;
  const gs = m ? m.grab : null;
  if (!gs) return;
  if (gs.cooldown > 0 || gs.active) return;
  // Find nearest mob in range
  let nearest = null, nearDist = GRAB_RANGE;
  for (const mob of mobs) {
    if (mob.hp <= 0) continue;
    const dx = mob.x - entity.x, dy = mob.y - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearDist) { nearest = mob; nearDist = dist; }
  }
  gs.active = true;
  gs.timer = GRAB_DURATION;
  gs.target = nearest;
  if (nearest) {
    StatusFX.applyToMob(nearest, 'stun', { duration: GRAB_DURATION });
    const grabDmg = Math.round((memberMelee || melee).damage * 0.3);
    dealDamageToMob(nearest, grabDmg, 'melee', entity);
    hitEffects.push({ x: nearest.x, y: nearest.y - 30, life: 20, type: "grab", dmg: grabDmg });
  }
  // Sync legacy globals for player (UI reads isGrabbing)
  if (entity === player) { isGrabbing = true; grabTimer = gs.timer; grabTarget = gs.target; }
}

// Player-facing wrapper (called from input handler — unchanged signature)
function tryGrab() { tryGrabEntity(player, melee); }

function updateGrabAll() {
  // Tick grab for ALL party members (including player)
  if (typeof PartyState === 'undefined' || PartyState.members.length === 0) {
    // Legacy fallback: tick player globals
    if (grabCooldown > 0) grabCooldown--;
    if (!isGrabbing) return;
    _updateGrabForEntity(player, melee, { active: isGrabbing, timer: grabTimer, target: grabTarget, cooldown: grabCooldown }, true);
    return;
  }
  for (const member of PartyState.members) {
    if (member.dead || !member.active) continue;
    const gs = member.grab;
    if (!gs) continue;
    if (gs.cooldown > 0) gs.cooldown--;
    if (!gs.active) continue;
    _updateGrabForEntity(member.entity, member.melee || melee, gs, member.controlType === 'local');
  }
}

function _updateGrabForEntity(entity, memberMelee, gs, isLocal) {
  gs.timer--;
  if (gs.target && gs.target.hp > 0) {
    const angle = Math.atan2(gs.target.y - entity.y, gs.target.x - entity.x);
    gs.target.x = entity.x + Math.cos(angle) * 40;
    gs.target.y = entity.y + Math.sin(angle) * 40;
    StatusFX.applyToMob(gs.target, 'stun', { duration: 2 });
  }
  if (gs.timer <= 0) {
    if (gs.target && gs.target.hp > 0) {
      const angle = Math.atan2(gs.target.y - entity.y, gs.target.x - entity.x);
      const throwDist = 80;
      const newX = gs.target.x + Math.cos(angle) * throwDist;
      const newY = gs.target.y + Math.sin(angle) * throwDist;
      if (positionClear(newX, newY)) { gs.target.x = newX; gs.target.y = newY; }
      const throwDmg = Math.round(memberMelee.damage * 0.5);
      dealDamageToMob(gs.target, throwDmg, 'melee', entity);
      hitEffects.push({ x: gs.target.x, y: gs.target.y - 30, life: 20, type: "crit", dmg: throwDmg });
    }
    gs.active = false;
    gs.target = null;
    gs.cooldown = GRAB_COOLDOWN;
    // Sync legacy globals for player UI
    if (isLocal) { isGrabbing = false; grabTarget = null; grabCooldown = GRAB_COOLDOWN; }
  } else if (isLocal) {
    // Keep legacy globals in sync while active
    isGrabbing = gs.active; grabTimer = gs.timer; grabTarget = gs.target;
  }
}

// Legacy wrapper — called from the old updateGrab() call site
function updateGrab() { updateGrabAll(); }

// === EXTRA ITEM SLOT ===
function useExtraSlotItem() {
  if (!extraSlotItem) return;
  // Use item based on type
  if (extraSlotItem.type === "consumable") {
    // Heal or buff
    if (extraSlotItem.data && extraSlotItem.data.healAmount) {
      const heal = Math.min(extraSlotItem.data.healAmount, player.maxHp - player.hp);
      player.hp = Math.min(player.maxHp, player.hp + extraSlotItem.data.healAmount);
      hitEffects.push({ x: player.x, y: player.y - 30, life: 20, type: "heal", dmg: heal });
    }
    extraSlotItem.count--;
    if (extraSlotItem.count <= 0) extraSlotItem = null;
  }
  // Other item types just equip/activate — can be extended
}

function equipToExtraSlot(item) {
  extraSlotItem = item;
}

function drawKatanaSwing(camX, camY) {
  if (!melee.swinging) return;

  const progress = 1 - (melee.swingTimer / melee.swingDuration);
  const px = player.x;
  const py = player.y - 20;

  const halfArc = melee.arcAngle / 2;
  const startAngle = melee.swingDir - halfArc;
  const sweepAngle = melee.arcAngle * progress;
  const bladeAngle = startAngle + sweepAngle;
  const fadeAlpha = 1 - progress;

  const mId = playerEquip.melee ? playerEquip.melee.id : null;

  ctx.save();
  ctx.translate(px, py);

  if (mId === 'sword') {
    // === SWORD — classic silver blade with blue edge ===
    // Trail arc
    ctx.strokeStyle = `rgba(180,200,230,${0.6 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.75, startAngle, bladeAngle); ctx.stroke();
    
    // Blade — thin straight sword
    const bLen = melee.range * 0.85;
    const bx = Math.cos(bladeAngle) * bLen;
    const by = Math.sin(bladeAngle) * bLen;
    // Handle
    const hLen = bLen * 0.2;
    const hx = Math.cos(bladeAngle) * hLen;
    const hy = Math.sin(bladeAngle) * hLen;
    ctx.strokeStyle = `rgba(100,80,60,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); ctx.stroke();
    // Guard
    const guardPerp = bladeAngle + Math.PI / 2;
    ctx.strokeStyle = `rgba(160,140,80,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(guardPerp) * 6, hy + Math.sin(guardPerp) * 6);
    ctx.lineTo(hx - Math.cos(guardPerp) * 6, hy - Math.sin(guardPerp) * 6);
    ctx.stroke();
    // Silver blade
    ctx.strokeStyle = `rgba(210,220,235,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    // Blue edge highlight
    ctx.strokeStyle = `rgba(150,190,240,${0.5 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    // Tip
    ctx.fillStyle = `rgba(220,230,255,${0.7 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();

  } else if (mId === 'ninja_katanas') {
    // === NINJA KATANAS — dual simultaneous crossing slashes ===
    const bLen = melee.range * 0.82;
    const prog = 1 - (melee.swingTimer / melee.swingDuration);
    
    // BLADE 1 — swings in the normal direction (clockwise)
    // Outer trail arc
    ctx.strokeStyle = `rgba(15,10,25,${0.75 * fadeAlpha})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.78, startAngle, bladeAngle); ctx.stroke();
    // Purple flash arc
    ctx.strokeStyle = `rgba(130,60,200,${0.35 * fadeAlpha * (0.5 + 0.5 * Math.sin(prog * Math.PI))})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.68, startAngle + 0.1, bladeAngle + 0.1); ctx.stroke();
    
    // BLADE 2 — swings from the OPPOSITE side (mirrored, counter-clockwise)
    const mirrorCenter = melee.swingDir; // center angle of the swing
    const mirrorStart = mirrorCenter + (mirrorCenter - startAngle); // mirror startAngle
    const mirrorBlade = mirrorCenter + (mirrorCenter - bladeAngle); // mirror bladeAngle
    ctx.strokeStyle = `rgba(20,12,35,${0.7 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.72, Math.min(mirrorStart, mirrorBlade), Math.max(mirrorStart, mirrorBlade)); ctx.stroke();
    // Purple flash on mirror arc
    ctx.strokeStyle = `rgba(110,50,180,${0.3 * fadeAlpha * (0.5 + 0.5 * Math.sin(prog * Math.PI))})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.62, Math.min(mirrorStart, mirrorBlade) + 0.1, Math.max(mirrorStart, mirrorBlade) + 0.1); ctx.stroke();
    
    // Speed lines from both sides
    for (let sl = 0; sl < 4; sl++) {
      const t = sl / 3;
      // Blade 1 speed lines
      const slAngle = startAngle + (bladeAngle - startAngle) * t;
      const innerR = melee.range * 0.4;
      const outerR = melee.range * (0.85 + t * 0.1);
      ctx.strokeStyle = `rgba(20,12,35,${0.35 * fadeAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(slAngle) * innerR, Math.sin(slAngle) * innerR);
      ctx.lineTo(Math.cos(slAngle) * outerR, Math.sin(slAngle) * outerR);
      ctx.stroke();
      // Blade 2 speed lines (mirrored)
      const slAngle2 = mirrorStart + (mirrorBlade - mirrorStart) * t;
      ctx.beginPath();
      ctx.moveTo(Math.cos(slAngle2) * innerR, Math.sin(slAngle2) * innerR);
      ctx.lineTo(Math.cos(slAngle2) * outerR, Math.sin(slAngle2) * outerR);
      ctx.stroke();
    }
    
    // First blade line — dark katana
    const bx = Math.cos(bladeAngle) * bLen;
    const by = Math.sin(bladeAngle) * bLen;
    ctx.strokeStyle = `rgba(10,5,20,${0.95 * fadeAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = `rgba(180,160,220,${0.4 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx, by); ctx.stroke();
    
    // Second blade line — mirrored katana
    const bx2 = Math.cos(mirrorBlade) * bLen * 0.92;
    const by2 = Math.sin(mirrorBlade) * bLen * 0.92;
    ctx.strokeStyle = `rgba(15,8,28,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx2, by2); ctx.stroke();
    ctx.strokeStyle = `rgba(160,140,200,${0.35 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx2, by2); ctx.stroke();
    
    // Blade tip flashes — both tips
    ctx.fillStyle = `rgba(160,80,220,${0.7 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx, by, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(140,60,200,${0.6 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx2, by2, 3, 0, Math.PI * 2); ctx.fill();
    // White flash cores
    if (prog > 0.3 && prog < 0.8) {
      ctx.fillStyle = `rgba(220,200,255,${0.6 * fadeAlpha})`;
      ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx2, by2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    
    // X-cross flash where blades meet in the middle
    if (prog > 0.35 && prog < 0.65) {
      const crossAlpha = Math.sin((prog - 0.35) / 0.3 * Math.PI) * fadeAlpha;
      ctx.fillStyle = `rgba(180,120,255,${0.4 * crossAlpha})`;
      const cx2 = Math.cos(mirrorCenter) * bLen * 0.5;
      const cy2 = Math.sin(mirrorCenter) * bLen * 0.5;
      ctx.beginPath(); ctx.arc(cx2, cy2, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,240,255,${0.25 * crossAlpha})`;
      ctx.beginPath(); ctx.arc(cx2, cy2, 3, 0, Math.PI * 2); ctx.fill();
    }
    
    // During dash — extra fiery purple aura on both arcs
    if (melee.dashActive) {
      ctx.strokeStyle = `rgba(160,60,220,${0.5 * fadeAlpha})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.72, startAngle, bladeAngle); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.66, Math.min(mirrorStart, mirrorBlade), Math.max(mirrorStart, mirrorBlade)); ctx.stroke();
      ctx.strokeStyle = `rgba(220,200,255,${0.3 * fadeAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.72, startAngle, bladeAngle); ctx.stroke();
    }

  } else if (mId === 'storm_blade') {
    // === STORM BLADE — white/diamond crystalline blade ===
    // Trail arc — bright white-blue
    ctx.strokeStyle = `rgba(220,238,255,${0.7 * fadeAlpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.8, startAngle, bladeAngle); ctx.stroke();
    // Inner shimmer arc
    ctx.strokeStyle = `rgba(245,250,255,${0.4 * fadeAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.6, startAngle, bladeAngle); ctx.stroke();
    
    const bLen = melee.range * 0.85;
    const bx = Math.cos(bladeAngle) * bLen;
    const by = Math.sin(bladeAngle) * bLen;
    const perpA = bladeAngle + Math.PI / 2;
    // Handle — light silver
    const hLen = bLen * 0.22;
    const hx = Math.cos(bladeAngle) * hLen;
    const hy = Math.sin(bladeAngle) * hLen;
    ctx.strokeStyle = `rgba(180,200,220,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(hx, hy); ctx.stroke();
    // Diamond guard
    ctx.fillStyle = `rgba(200,225,255,${0.85 * fadeAlpha})`;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(bladeAngle) * 4, hy + Math.sin(bladeAngle) * 4);
    ctx.lineTo(hx + Math.cos(perpA) * 7, hy + Math.sin(perpA) * 7);
    ctx.lineTo(hx - Math.cos(bladeAngle) * 2, hy - Math.sin(bladeAngle) * 2);
    ctx.lineTo(hx - Math.cos(perpA) * 7, hy - Math.sin(perpA) * 7);
    ctx.closePath();
    ctx.fill();
    // White crystalline blade — diamond shape, wider in middle
    const mid = 0.55;
    const midX = Math.cos(bladeAngle) * bLen * mid;
    const midY = Math.sin(bladeAngle) * bLen * mid;
    ctx.fillStyle = `rgba(235,245,255,${0.9 * fadeAlpha})`;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(midX + Math.cos(perpA) * 5, midY + Math.sin(perpA) * 5);
    ctx.lineTo(bx, by);
    ctx.lineTo(midX - Math.cos(perpA) * 5, midY - Math.sin(perpA) * 5);
    ctx.closePath();
    ctx.fill();
    // White edge highlight
    ctx.strokeStyle = `rgba(255,255,255,${0.7 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(bx, by); ctx.stroke();
    // Diamond sparkle at tip
    ctx.fillStyle = `rgba(255,255,255,${0.8 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx, by, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,230,255,${0.4 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();

  } else if (mId === 'war_cleaver') {
    // === CURSED TRIDENT STAFF — dark red staff sweep with triple prong ===
    // Trail arc — dark crimson
    ctx.strokeStyle = `rgba(160,15,15,${0.6 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.85, startAngle, bladeAngle); ctx.stroke();
    // Inner dark arc
    ctx.strokeStyle = `rgba(40,0,0,${0.4 * fadeAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.5, startAngle, bladeAngle); ctx.stroke();
    
    const bLen = melee.range * 0.92;
    const bx = Math.cos(bladeAngle) * bLen;
    const by = Math.sin(bladeAngle) * bLen;
    const perpA = bladeAngle + Math.PI / 2;
    // Dark shaft
    ctx.strokeStyle = `rgba(42,8,8,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx * 0.85, by * 0.85); ctx.stroke();
    // Shaft highlight
    ctx.strokeStyle = `rgba(60,15,15,${0.5 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx * 0.85, by * 0.85); ctx.stroke();
    // Wrapping bands
    for (let wb = 0; wb < 3; wb++) {
      const wbP = 0.2 + wb * 0.25;
      ctx.fillStyle = `rgba(128,16,16,${0.7 * fadeAlpha})`;
      ctx.beginPath(); ctx.arc(bx * wbP, by * wbP, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Center prong (longest)
    ctx.strokeStyle = `rgba(180,25,25,${0.85 * fadeAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bx * 0.82, by * 0.82); ctx.lineTo(bx, by); ctx.stroke();
    // Prong tip
    ctx.fillStyle = `rgba(200,30,30,${0.9 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.fill();
    // Side prongs — splay outward
    const splayDist = bLen * 0.12;
    const prongBase = 0.8;
    const prongTip = 0.95;
    // Left prong
    const lbx = Math.cos(bladeAngle) * bLen * prongBase;
    const lby = Math.sin(bladeAngle) * bLen * prongBase;
    const ltx = Math.cos(bladeAngle) * bLen * prongTip + Math.cos(perpA) * splayDist;
    const lty = Math.sin(bladeAngle) * bLen * prongTip + Math.sin(perpA) * splayDist;
    ctx.strokeStyle = `rgba(160,20,20,${0.8 * fadeAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lbx, lby); ctx.lineTo(ltx, lty); ctx.stroke();
    ctx.fillStyle = `rgba(200,30,30,${0.8 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(ltx, lty, 2.5, 0, Math.PI * 2); ctx.fill();
    // Right prong
    const rtx = Math.cos(bladeAngle) * bLen * prongTip - Math.cos(perpA) * splayDist;
    const rty = Math.sin(bladeAngle) * bLen * prongTip - Math.sin(perpA) * splayDist;
    ctx.beginPath(); ctx.moveTo(lbx, lby); ctx.lineTo(rtx, rty); ctx.stroke();
    ctx.beginPath(); ctx.arc(rtx, rty, 2.5, 0, Math.PI * 2); ctx.fill();
    // Red glow at trident head
    ctx.fillStyle = `rgba(180,10,10,${0.35 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx, by, 10, 0, Math.PI * 2); ctx.fill();
    // Dark energy wisps
    for (let w = 0; w < 3; w++) {
      const wa = bladeAngle + (w - 1) * 0.3 + Math.sin(renderTime * 0.01 + w) * 0.2;
      const wd = bLen * (0.85 + Math.sin(renderTime * 0.008 + w * 2) * 0.08);
      ctx.fillStyle = `rgba(80,5,5,${0.4 * fadeAlpha})`;
      ctx.beginPath(); ctx.arc(Math.cos(wa) * wd, Math.sin(wa) * wd, 2, 0, Math.PI * 2); ctx.fill();
    }

  } else if (mId && mId.endsWith('_hoe')) {
    // === FARMING HOE — short shaft + flat blade head sweep ===
    const bLen = melee.range * 0.8;
    const bx = Math.cos(bladeAngle) * bLen;
    const by = Math.sin(bladeAngle) * bLen;
    // Wooden shaft
    ctx.strokeStyle = `rgba(140,100,50,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx * 0.6, by * 0.6); ctx.stroke();
    // Shaft highlight
    ctx.strokeStyle = `rgba(170,130,70,${0.5 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx * 0.6, by * 0.6); ctx.stroke();
    // Hoe blade (flat rectangle perpendicular to shaft)
    const perpAng = bladeAngle + Math.PI / 2;
    const bladeW = 12;
    const bladeH = 8;
    const bCX = bx * 0.7;
    const bCY = by * 0.7;
    ctx.fillStyle = `rgba(160,160,170,${0.9 * fadeAlpha})`;
    ctx.beginPath();
    ctx.moveTo(bCX + Math.cos(perpAng) * bladeW - Math.cos(bladeAngle) * bladeH, bCY + Math.sin(perpAng) * bladeW - Math.sin(bladeAngle) * bladeH);
    ctx.lineTo(bCX + Math.cos(perpAng) * bladeW, bCY + Math.sin(perpAng) * bladeW);
    ctx.lineTo(bCX - Math.cos(perpAng) * bladeW, bCY - Math.sin(perpAng) * bladeW);
    ctx.lineTo(bCX - Math.cos(perpAng) * bladeW - Math.cos(bladeAngle) * bladeH, bCY - Math.sin(perpAng) * bladeW - Math.sin(bladeAngle) * bladeH);
    ctx.closePath(); ctx.fill();
    // Blade edge highlight
    ctx.strokeStyle = `rgba(200,200,210,${0.6 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bCX + Math.cos(perpAng) * bladeW - Math.cos(bladeAngle) * bladeH, bCY + Math.sin(perpAng) * bladeW - Math.sin(bladeAngle) * bladeH);
    ctx.lineTo(bCX - Math.cos(perpAng) * bladeW - Math.cos(bladeAngle) * bladeH, bCY - Math.sin(perpAng) * bladeW - Math.sin(bladeAngle) * bladeH);
    ctx.stroke();
    // Trail arc — earthy brown
    ctx.strokeStyle = `rgba(140,110,60,${0.35 * fadeAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.5, startAngle, bladeAngle); ctx.stroke();

  } else if (mId && mId.endsWith('_rod')) {
    // === FISHING ROD CAST — rod shaft + line whip ===
    const bLen = melee.range * 0.9;
    const bx = Math.cos(bladeAngle) * bLen;
    const by = Math.sin(bladeAngle) * bLen;
    // Rod shaft during swing
    ctx.strokeStyle = `rgba(140,110,60,${0.9 * fadeAlpha})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(bx * 0.45, by * 0.45); ctx.stroke();
    // Thin rod tip
    ctx.strokeStyle = `rgba(120,100,50,${0.8 * fadeAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(bx * 0.45, by * 0.45); ctx.lineTo(bx, by); ctx.stroke();
    // Fishing line whip (curves outward)
    ctx.strokeStyle = `rgba(200,200,200,${0.6 * fadeAlpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    const perpAng = bladeAngle + Math.PI / 2;
    const curveX = bx * 1.2 + Math.cos(perpAng) * 15 * (1 - progress);
    const curveY = by * 1.2 + Math.sin(perpAng) * 15 * (1 - progress);
    ctx.quadraticCurveTo(curveX, curveY, bx * 1.3, by * 1.3);
    ctx.stroke();
    // Bobber at line end
    ctx.fillStyle = `rgba(255,60,30,${0.8 * fadeAlpha})`;
    ctx.beginPath(); ctx.arc(bx * 1.3, by * 1.3, 3, 0, Math.PI * 2); ctx.fill();
    // Faint trail arc
    ctx.strokeStyle = `rgba(180,160,120,${0.3 * fadeAlpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.5, startAngle, bladeAngle); ctx.stroke();

  } else {
    // === FISTS / default — simple white arc ===
    const alpha = 0.7 * fadeAlpha;
    ctx.strokeStyle = `rgba(200,220,255,${alpha})`;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.8, startAngle, bladeAngle); ctx.stroke();
    ctx.strokeStyle = `rgba(220,230,255,${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, melee.range * 0.6, startAngle, bladeAngle); ctx.stroke();
  }

  ctx.restore();
}

function updateBullets() {
  // === GRAAL-STYLE COLLISION: rectangular bullet + circular entity hitbox ===
  // Bullet collision is a rectangle aligned to travel direction (long × short).
  // Entity hitbox is a circle. Hit test = closest point on bullet rect to entity
  // center, check if distance < entity radius.
  // Vertical peeks are harder (bullet narrow perpendicular), same as Graal.
  const B_LONG = GAME_CONFIG.BULLET_HALF_LONG;   // half-length along travel
  const B_SHORT = GAME_CONFIG.BULLET_HALF_SHORT;  // half-width perpendicular
  const ENTITY_R = GAME_CONFIG.ENTITY_R;           // entity circle radius
  const ENTITY_R_SQ = ENTITY_R * ENTITY_R;
  const PLAYER_HB_Y = GAME_CONFIG.PLAYER_HITBOX_Y || 0; // player hitbox Y offset (torso center)

  // Rectangle-circle hit test: bullet rect vs entity circle
  function _bulletHitsCircle(bx, by, bvx, bvy, ex, ey, eR) {
    const isH = Math.abs(bvx) > Math.abs(bvy);
    const hw = isH ? B_LONG : B_SHORT;
    const hh = isH ? B_SHORT : B_LONG;
    // Distance from entity center to closest point on bullet rect
    const cdx = Math.max(0, Math.abs(bx - ex) - hw);
    const cdy = Math.max(0, Math.abs(by - ey) - hh);
    return cdx * cdx + cdy * cdy < eR * eR;
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    // Mob bullet onUpdate callback
    if (!b.fromPlayer && b.onUpdate) b.onUpdate(b);

    // Mob bullet lifetime (life property counts down each frame)
    if (!b.fromPlayer && b.life !== undefined) {
      b.life--;
      if (b.life <= 0) {
        if (b.onExpire) b.onExpire(b);
        bullets.splice(i, 1);
        continue;
      }
    }

    // Arrow lifetime
    if (b.isArrow) {
      b.arrowLife--;
      if (b.arrowLife <= 0) {
        hitEffects.push({ x: b.x, y: b.y, life: 8, type: "arrow_fade" });
        bullets.splice(i, 1);
        continue;
      }
    }

    // Wall collision
    const col = Math.floor(b.x / TILE), row = Math.floor(b.y / TILE);
    if (isSolid(col, row)) {
      if (b.isArrow && b.bouncesLeft > 0) {
        // Bounce arrow off wall
        b.bouncesLeft--;
        // Determine which wall face was hit and reflect
        const prevX = b.x - b.vx, prevY = b.y - b.vy;
        const prevCol = Math.floor(prevX / TILE), prevRow = Math.floor(prevY / TILE);
        if (prevCol !== col && prevRow === row) {
          b.vx = -b.vx; // horizontal bounce
        } else if (prevRow !== row && prevCol === col) {
          b.vy = -b.vy; // vertical bounce
        } else {
          b.vx = -b.vx; b.vy = -b.vy; // corner bounce
        }
        // Push arrow out of wall
        b.x += b.vx * 1.5;
        b.y += b.vy * 1.5;
        // Spark effect on bounce
        hitEffects.push({ x: b.x, y: b.y, life: 12, type: "arrow_bounce" });
        continue;
      } else if (b.isArrow && b.bouncesLeft <= 0) {
        hitEffects.push({ x: b.x, y: b.y, life: 10, type: "wall" });
        bullets.splice(i, 1);
        continue;
      }
      if (b.isBoulder) {
        // Boulder explodes on wall
        hitEffects.push({ x: b.x, y: b.y, life: 30, type: "explosion" });
        // Blast damage if party members nearby
        const _boulderTargets = PartySystem.getAliveEntities();
        for (const _bt of _boulderTargets) {
          const dxP = b.x - _bt.x;
          const dyP = b.y - (_bt.y + PLAYER_HB_Y); // hitbox at torso center
          const distP = Math.sqrt(dxP * dxP + dyP * dyP);
          if (distP < 100 && !(_bt === player && playerDead) && !_bt._isDead) {
            const blastDmg = Math.round((distP < 50 ? 20 : 12) * getMobDamageMultiplier());
            const dmgDealt = dealDamageToPlayer(blastDmg, "aoe", null, _bt);
            hitEffects.push({ x: _bt.x, y: _bt.y - 10, life: 19, type: "hit", dmg: dmgDealt });
          }
        }
      } else {
        // Mob bullet onWallHit callback (e.g., bouncing projectiles)
        if (!b.fromPlayer && b.onWallHit) {
          b.onWallHit(b);
          if (b._handled) continue;
        }
        hitEffects.push({ x: b.x, y: b.y, life: 10, type: "wall" });
      }
      // Report spar bullet miss (hit wall instead of target)
      if (b.sparTeam && typeof SparSystem !== 'undefined' && SparSystem._onSparBulletHit) {
        SparSystem._onSparBulletHit(b, null, false);
      }
      bullets.splice(i, 1);
      continue;
    }

    // Max-range despawn (shotgun pellets)
    if (b.maxRange && b.startX !== undefined) {
      const travelDx = b.x - b.startX;
      const travelDy = b.y - b.startY;
      if (travelDx * travelDx + travelDy * travelDy > b.maxRange * b.maxRange) {
        hitEffects.push({ x: b.x, y: b.y, life: 6, type: "wall" });
        bullets.splice(i, 1);
        continue;
      }
    }

    // ---- SPAR PvP BULLET COLLISION ----
    if (typeof SparState !== 'undefined' && SparState.phase === 'fighting' && b.sparTeam) {
      const opponents = (b.sparTeam === 'teamA') ? SparState.teamB : SparState.teamA;
      let sparHit = false;
      for (const p of opponents) {
        if (!p.alive) continue;
        const ent = p.entity;
        if (_bulletHitsCircle(b.x, b.y, b.vx, b.vy, ent.x, ent.y + PLAYER_HB_Y, ENTITY_R)) {
          const dmg = b.damage || (typeof CT_X_GUN !== 'undefined' ? CT_X_GUN.damage : 20);
          ent.hp -= dmg;
          hitEffects.push({ x: b.x, y: b.y - 10, life: 19, type: "hit", dmg: dmg });
          // Report hit to learning system
          if (typeof SparSystem !== 'undefined' && SparSystem._onSparBulletHit) {
            SparSystem._onSparBulletHit(b, ent, true);
          }
          if (ent.hp <= 0) SparSystem.onParticipantDeath(ent);
          bullets.splice(i, 1);
          sparHit = true;
          break;
        }
      }
      if (sparHit) continue;
      // Bullet missed — hit wall or went off-screen, report miss
      // (wall hit is handled above with splice+continue, so if we reach here the bullet
      //  is still alive and traveling. We only report miss when it actually dies.)
      continue; // skip normal mob/player collision for spar bullets
    }

    // Mob hit — circle centered 20px above feet (body center)
    if (b.fromPlayer) {
      let hit = false;
      for (const m of mobs) {
        if (m.hp <= 0) continue;

        // Pierce: skip mobs already hit by this bullet
        if (b.pierce && b.hitMobs && b.hitMobs.indexOf(m._mobId !== undefined ? m._mobId : mobs.indexOf(m)) >= 0) continue;

        // Per-mob circle hitbox: hitboxR overrides default ENTITY_R
        const mR = m.hitboxR ?? ENTITY_R;
        if (_bulletHitsCircle(b.x, b.y, b.vx, b.vy, m.x, m.y - 20, mR)) {
          // Per-bullet stats (bot bullets carry their own, player bullets fall through to global)
          const _bDmg = b.damage || gun.damage;
          const _bSpecial = b.special !== undefined ? b.special : gun.special;
          const _bOwner = b.ownerId || 'player';
          const _bAttacker = (_bOwner !== 'player' && typeof PartySystem !== 'undefined')
            ? (PartySystem.getMemberById(_bOwner) || {}).entity || player
            : player;

          // Projectile reflect — reverse bullet and make it a mob bullet
          if (m._reflectActive || m._reflecting) {
            b.vx = -b.vx; b.vy = -b.vy;
            b.fromPlayer = false; b.mobBullet = true;
            b.damage = Math.round(_bDmg * 0.6);
            b.ownerId = m.id;
            hitEffects.push({ x: b.x, y: b.y, life: 12, type: 'reflect_spark' });
            break; // don't destroy or damage — reflected
          }
          hitEffects.push({ x: b.x, y: b.y, life: 19, type: "hit", dmg: _bDmg });

          // Gun special on-hit effects (dispatched via registry)
          const gunBehavior = _bSpecial && GUN_BEHAVIORS[_bSpecial];
          if (gunBehavior && gunBehavior.onHit) {
            gunBehavior.onHit(m, b.x, b.y);
          }

          dealDamageToMob(m, _bDmg, "gun", _bAttacker);

          // Pierce mechanic: don't destroy bullet, decrement pierceCount
          if (b.pierce) {
            const mobKey = m._mobId !== undefined ? m._mobId : mobs.indexOf(m);
            b.hitMobs.push(mobKey);
            if (b.pierceCount > 0) {
              b.pierceCount--;
              // Don't set hit=true — bullet continues
            } else {
              // No more pierces left, destroy bullet
              bullets.splice(i, 1);
              hit = true;
            }
          } else {
            bullets.splice(i, 1);
            hit = true;
          }
          break;
        }
      }
      if (hit) continue;

      // Player bullet vs test shoot bot
      if (typeof _testShootBot !== 'undefined' && _testShootBot && _testShootBot.hp > 0) {
        const tb = _testShootBot;
        if (_bulletHitsCircle(b.x, b.y, b.vx, b.vy, tb.x, tb.y + PLAYER_HB_Y, ENTITY_R)) {
          const _bDmg = b.damage || gun.damage;
          tb.hp -= _bDmg;
          hitEffects.push({ x: b.x, y: b.y, life: 19, type: "hit", dmg: _bDmg });
          if (tb.hp <= 0) {
            chatMessages.push({ name: "SYSTEM", text: "Shoot bot destroyed!", time: Date.now() });
            _testShootBot = null;
          }
          bullets.splice(i, 1);
          continue;
        }
      }
    }

    // Non-player bullets vs player/party (mob shooter bullets)
    if (!b.fromPlayer) {
      // Arrow: poison on hit, arrow is destroyed
      if (b.isArrow) {
        const _arrowTargets = PartySystem.getAliveEntities();
        let _arrowHit = false;
        for (const _at of _arrowTargets) {
          if (_bulletHitsCircle(b.x, b.y, b.vx, b.vy, _at.x, _at.y + PLAYER_HB_Y, ENTITY_R) && !(_at === player && playerDead) && !_at._isDead) {
            dealDamageToPlayer(b.damage, "projectile", null, _at);
            // Apply/reset poison — 20 seconds (all entities via _currentDamageTarget)
            _currentDamageTarget = _at;
            const _atMember = PartySystem.getMemberByEntity(_at);
            const _atEquip = _atMember ? _atMember.equip : playerEquip;
            StatusFX.applyPoison(Math.round(1200 * (1 - getEffectReduction(_atEquip))));
            _currentDamageTarget = null;
            hitEffects.push({ x: b.x, y: b.y, life: 20, type: "poison_hit" });
            bullets.splice(i, 1);
            _arrowHit = true;
            break;
          }
        }
        if (_arrowHit) continue;
        continue; // arrows skip normal bullet collision
      }
      // Boulder: only explodes on direct party member hit (walls handled above)
      if (b.isBoulder) {
        const _bdrTargets = PartySystem.getAliveEntities();
        let _bdrHit = false;
        for (const _bdt of _bdrTargets) {
          const dxB = b.x - _bdt.x;
          const dyB = b.y - (_bdt.y + PLAYER_HB_Y); // hitbox at torso center
          const boulderHitR = b.boulderHitRadius || 40;
          if (dxB * dxB + dyB * dyB < boulderHitR * boulderHitR && !(_bdt === player && playerDead) && !_bdt._isDead) {
            hitEffects.push({ x: b.x, y: b.y, life: 30, type: "explosion" });
            const boulderDmg = b.damage || Math.round(20 * getMobDamageMultiplier());
            const dmgDealt = dealDamageToPlayer(boulderDmg, "aoe", null, _bdt);
            hitEffects.push({ x: _bdt.x, y: _bdt.y - 10, life: 19, type: "hit", dmg: dmgDealt });
            bullets.splice(i, 1);
            _bdrHit = true;
            break;
          }
        }
        if (_bdrHit) continue;
        continue; // boulders don't use normal bullet collision
      }
      // Generic mob bullet vs party members
      const _genTargets = PartySystem.getAliveEntities();
      let _genHit = false;
      for (const _gt of _genTargets) {
        if (_bulletHitsCircle(b.x, b.y, b.vx, b.vy, _gt.x, _gt.y + PLAYER_HB_Y, ENTITY_R) && !(_gt === player && playerDead) && !_gt._isDead) {
          const bDmg = b.damage || gun.damage;
          const dmgDealt = dealDamageToPlayer(bDmg, "projectile", null, _gt);
          hitEffects.push({ x: b.x, y: b.y, life: 19, type: "hit", dmg: dmgDealt });
          if (b.onHitPlayer) {
            _currentDamageTarget = _gt;
            b.onHitPlayer(b, _gt);
            _currentDamageTarget = null;
          }
          bullets.splice(i, 1);
          _genHit = true;
          break;
        }
      }
      if (_genHit) continue;
    }

    // Bullet only removed by wall hit or entity hit
  }

  for (let i = hitEffects.length - 1; i >= 0; i--) {
    hitEffects[i].life--;
    if (hitEffects[i].life <= 0) hitEffects.splice(i, 1);
  }
}

function drawBullets() {
  for (const b of bullets) {
    // === Floor 1 custom projectile styles ===
    if (b.projectileStyle === 'neon_bolt' && b.isArrow) {
      // Cyan energy bolt — drone_lookout (wide elliptical)
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Outer glow — wide ellipse
      ctx.fillStyle = "rgba(0,204,255,0.2)";
      ctx.beginPath(); ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
      // Energy core — wide ellipse
      ctx.fillStyle = "#00ccff";
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Bright center
      ctx.fillStyle = "#aaeeff";
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      // Electric crackle lines
      ctx.strokeStyle = "#00ccff";
      ctx.lineWidth = 1.5;
      const t = renderTime * 0.02;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2 / 3) + t;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 3);
        ctx.lineTo(Math.cos(a + 0.5) * 12, Math.sin(a + 0.3) * 7);
        ctx.stroke();
      }
      ctx.restore();
      // Cyan trail — wide
      ctx.fillStyle = "rgba(0,204,255,0.3)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 3, b.y - b.vy * 3, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,180,255,0.15)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 6, b.y - b.vy * 6, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.projectileStyle === 'tracer' && b.isArrow) {
      // Red laser tracer — renegade_sniper (wide flat streak)
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Red glow trail — wider, flatter
      ctx.fillStyle = "rgba(255,30,30,0.15)";
      ctx.fillRect(-28, -3, 38, 6);
      // Tracer line — wider, thinner
      ctx.fillStyle = "#ff2020";
      ctx.fillRect(-22, -1.5, 30, 3);
      // Bright core
      ctx.fillStyle = "#ff8080";
      ctx.fillRect(-16, -0.5, 24, 1);
      // Red tip glow — elliptical
      ctx.fillStyle = "rgba(255,60,60,0.4)";
      ctx.beginPath(); ctx.ellipse(10, 0, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
      // Bright tip
      ctx.fillStyle = "#ff4040";
      ctx.beginPath(); ctx.ellipse(10, 0, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Red trail particles — wide
      ctx.fillStyle = "rgba(255,40,40,0.25)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 4, b.y - b.vy * 4, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,20,20,0.1)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 8, b.y - b.vy * 8, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.projectileStyle === 'golden' && b.isArrow) {
      // Golden bullet — the_don (wide flat slug)
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Gold glow — wide ellipse
      ctx.fillStyle = "rgba(255,215,0,0.2)";
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2); ctx.fill();
      // Bullet casing — wider, flatter
      ctx.fillStyle = "#b8960a";
      ctx.fillRect(-12, -2.5, 22, 5);
      // Gold body
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(-10, -1.5, 20, 3);
      // Bright highlight
      ctx.fillStyle = "#fff8dc";
      ctx.fillRect(-8, -0.5, 16, 1);
      // Tip — flatter
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(8, -2.5);
      ctx.lineTo(8, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Gold sparkle trail — wide
      ctx.fillStyle = "rgba(255,215,0,0.3)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 3, b.y - b.vy * 3, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,200,0,0.15)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 6, b.y - b.vy * 6, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    if (b.projectileStyle === 'saw_blade') {
      // Spinning saw blade — rust_sawman (wide elliptical disc)
      const spin = renderTime * 0.02;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(spin);
      // Blade disc — wide ellipse
      ctx.fillStyle = '#6a6a6a';
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
      // Inner ring
      ctx.fillStyle = '#8a8a8a';
      ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      // Teeth notches
      ctx.fillStyle = '#4a4a4a';
      for (let t = 0; t < 8; t++) {
        const ta = (t / 8) * Math.PI * 2;
        ctx.fillRect(Math.cos(ta) * 12 - 2, Math.sin(ta) * 7 - 2, 4, 3);
      }
      // Center hole
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Spark trail — wide
      ctx.fillStyle = 'rgba(255,200,100,0.3)';
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 2, b.y - b.vy * 2, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    if (b.isArrow) {
      // Poison arrow — wide flat shaft, rotated to velocity
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Arrow shaft — wider, flatter
      ctx.fillStyle = "#3a3020";
      ctx.fillRect(-16, -1, 32, 2);
      // Poison-green arrowhead — flatter
      ctx.fillStyle = "#6aff40";
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(12, -3);
      ctx.lineTo(12, 3);
      ctx.closePath();
      ctx.fill();
      // Arrowhead glow — wide ellipse
      ctx.fillStyle = "rgba(100,255,60,0.4)";
      ctx.beginPath(); ctx.ellipse(16, 0, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
      // Fletching (feathers at back) — flatter
      ctx.fillStyle = "#2a4a20";
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-12, -3);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-12, 3);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Green poison trail — wide
      ctx.fillStyle = "rgba(80,200,40,0.3)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 3, b.y - b.vy * 3, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(60,160,30,0.15)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 6, b.y - b.vy * 6, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.isBoulder) {
      // Boulder — MASSIVE wide rock (elliptical, wider than tall)
      const spin = renderTime * 0.006;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(spin);
      // Shadow — wider
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(4, 20, 34, 10, 0, 0, Math.PI * 2); ctx.fill();
      // Rock body — wide ellipse
      ctx.fillStyle = "#5a5448";
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6a6458";
      ctx.beginPath(); ctx.ellipse(-4, -3, 26, 16, 0, 0, Math.PI * 2); ctx.fill();
      // Highlight
      ctx.fillStyle = "#7a7468";
      ctx.beginPath(); ctx.ellipse(-8, -7, 16, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8a8478";
      ctx.beginPath(); ctx.ellipse(-6, -9, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Deep cracks
      ctx.strokeStyle = "#3a3428";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-16, -8); ctx.lineTo(10, 12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6, -14); ctx.lineTo(20, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-12, 5); ctx.lineTo(-24, 13); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(12, -10); ctx.lineTo(26, -3); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-22, -4); ctx.lineTo(-10, 8); ctx.stroke();
      ctx.restore();
      // Dust trail — wide ellipses
      ctx.fillStyle = "rgba(160,140,120,0.4)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 5, b.y - b.vy * 5, 20, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(140,120,100,0.25)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 10, b.y - b.vy * 10, 15, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(120,100,80,0.12)";
      ctx.beginPath(); ctx.ellipse(b.x - b.vx * 16, b.y - b.vy * 16, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const isH = Math.abs(b.vx) > Math.abs(b.vy);
    const isMob = b.mobBullet;
    const bc = b.bulletColor;
    const mainColor = isMob ? "#ff6040" : (bc ? bc.main : "#ffe860");
    const coreColor = isMob ? "#ffaa80" : (bc ? bc.core : "#fff");
    const glowColor = isMob ? "rgba(255,80,40,0.25)" : (bc ? bc.glow : "rgba(255,230,80,0.2)");

    // Bullet body — wide and flat (Graal-style)
    ctx.fillStyle = mainColor;
    if (isH) {
      ctx.fillRect(b.x - 15, b.y - 4, 30, 8);
      ctx.fillStyle = coreColor;
      ctx.fillRect(b.x - 11, b.y - 2, 22, 4);
    } else {
      ctx.fillRect(b.x - 4, b.y - 15, 8, 30);
      ctx.fillStyle = coreColor;
      ctx.fillRect(b.x - 2, b.y - 11, 4, 22);
    }

    // Glow — wide ellipse
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hit effects
  for (const h of hitEffects) {
    if (!h.maxLife) h.maxLife = h.life; // auto-set on first frame
    const alpha = Math.min(1, h.life / h.maxLife);
    const renderer = HIT_EFFECT_RENDERERS[h.type] || HIT_EFFECT_RENDERERS._default;
    renderer(h, ctx, alpha);
  }
}
