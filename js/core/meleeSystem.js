// ===================== MELEE SYSTEM =====================
// Core: katana melee combat, dashing, specials
// Extracted from index_2.html — Phase E

// ===================== KATANA MELEE SYSTEM =====================
// melee → js/authority/gameState.js

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

  // Farming hoe intercept: if inside farm and hoe equipped, do farm action instead of combat
  if (melee.special === 'farming' && typeof Scene !== 'undefined' && Scene.inFarm
      && typeof handleFarmSwing === 'function') {
    handleFarmSwing();
    return; // Skip melee damage — swing animation already started above
  }

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
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    const dx = m.x - player.x;
    const dy = m.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < melee.range) {
      let inArc = true;
      if (!isCleave) {
        // Check if mob is within the swing arc
        const angleToMob = Math.atan2(dy, dx);
        let angleDiff = angleToMob - melee.swingDir;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        inArc = Math.abs(angleDiff) < halfArc;
      }

      if (inArc) {
        const critChance = melee.critChance || 0.20;
        const ninjaDashing = melee.special === 'ninja' && melee.dashActive;
        const isCrit = ninjaDashing ? true : shadowStepActive ? true : Math.random() < critChance;
        const critMult = isCrit ? 1.5 : 1.0;
        const dashMult = ninjaDashing ? 4.0 : 1.0;
        const meleeDmg = Math.round(melee.damage * critMult * dashMult);
        dealDamageToMob(m, meleeDmg, "melee");
        // Consume shadow step on first hit
        if (shadowStepActive && !ninjaDashing) shadowStepActive = false;
        if (isCrit) {
          hitEffects.push({ x: m.x, y: m.y - 30, life: 28, type: "crit", dmg: meleeDmg });
        } else {
          hitEffects.push({ x: m.x, y: m.y - 20, life: 19, type: "hit", dmg: meleeDmg });
        }
        
        // Ninja Katanas — Tengen-style dual crossing slashes + AOE splash
        if (melee.special === 'ninja') {
          const slashA = Math.atan2(dy, dx);
          hitEffects.push({ x: m.x, y: m.y - 10, life: 16, type: "ninja_slash", angle: slashA });
          hitEffects.push({ x: m.x, y: m.y - 10, life: 18, type: "ninja_slash", angle: slashA + Math.PI / 2.5 });
          // AOE slash ring visual
          hitEffects.push({ x: m.x, y: m.y, life: 14, type: "ninja_aoe" });
          // Splash damage — 30% to nearby mobs within 60px
          const splashDmg = Math.round(melee.damage * 0.3 * dashMult);
          for (const s of mobs) {
            if (s === m || s.hp <= 0) continue;
            const sdx = s.x - m.x, sdy = s.y - m.y;
            if (sdx * sdx + sdy * sdy < 60 * 60) {
              hitEffects.push({ x: s.x, y: s.y - 15, life: 12, type: "hit", dmg: splashDmg });
              const sa2 = Math.atan2(sdy, sdx);
              hitEffects.push({ x: s.x, y: s.y - 8, life: 12, type: "ninja_slash", angle: sa2 });
              dealDamageToMob(s, splashDmg, "ninja_splash");
              // Lifesteal on splash — 15% capped at 20
              const splashHeal = Math.min(Math.round(splashDmg * 0.15), 20);
              if (splashHeal > 0) player.hp = Math.min(player.maxHp, player.hp + splashHeal);
            }
          }
          // Lifesteal on direct hit — 15% capped at 20
          const ninjaHeal = Math.min(Math.round(meleeDmg * 0.15), 20);
          if (ninjaHeal > 0) player.hp = Math.min(player.maxHp, player.hp + ninjaHeal);
        }

        // Knockback
        if (dist > 0) {
          const kx = (dx / dist) * melee.knockback;
          const ky = (dy / dist) * melee.knockback;
          const nc = Math.floor((m.x + kx) / TILE);
          const nr = Math.floor((m.y + ky) / TILE);
          if (!isSolid(nc, nr)) { m.x += kx; m.y += ky; }
        }

        // Storm Blade: shockwave ring + chain lightning + lifesteal
        if (melee.special === 'storm' && m.hp > 0) {
          stormHits.push(m);
          // Lifesteal on direct hit — 15% of damage dealt, capped at 20
          const stormLifesteal = Math.min(Math.round(meleeDmg * 0.15), 20);
          if (stormLifesteal > 0) {
            player.hp = Math.min(player.maxHp, player.hp + stormLifesteal);
          }
          // Shockwave — damage all mobs within 80px of hit mob
          hitEffects.push({ x: m.x, y: m.y, life: 18, type: "shockwave" });
          const shockDmg = Math.round(melee.damage * 0.65);
          for (const s of mobs) {
            if (s === m || s.hp <= 0) continue;
            const sdx = s.x - m.x, sdy = s.y - m.y;
            if (sdx * sdx + sdy * sdy < 80 * 80) {
              // Lifesteal on shockwave — capped at 20
              const shockHeal = Math.min(Math.round(shockDmg * 0.15), 20);
              if (shockHeal > 0) player.hp = Math.min(player.maxHp, player.hp + shockHeal);
              hitEffects.push({ x: s.x, y: s.y - 15, life: 15, type: "hit", dmg: shockDmg });
              dealDamageToMob(s, shockDmg, "storm_shock");
            }
          }
        }

        // Cleave visual — red slash ring
        if (isCleave) {
          hitEffects.push({ x: m.x, y: m.y - 10, life: 15, type: "cleave_hit" });
          cleaveHits.push(m);
          // Lifesteal on direct hit — 15% capped at 20
          const cleaveHeal = Math.min(Math.round(meleeDmg * 0.15), 20);
          if (cleaveHeal > 0) player.hp = Math.min(player.maxHp, player.hp + cleaveHeal);
        }
      }
    }
  }

  // Storm Blade chain lightning — from each hit mob, arc to 2-3 nearby mobs
  if (melee.special === 'storm' && stormHits.length > 0) {
    const chainDmg = Math.round(melee.damage * 0.50);
    const chainedSet = new Set(stormHits.map((m2, i) => mobs.indexOf(m2)));
    for (const src of stormHits) {
      let prev = src;
      for (let c = 0; c < 3; c++) {
        let closest = null, closestDist = 160;
        for (const t of mobs) {
          if (t.hp <= 0 || t === prev) continue;
          const tKey = mobs.indexOf(t);
          if (chainedSet.has(tKey)) continue;
          const cdx = t.x - prev.x, cdy = t.y - prev.y;
          const cd = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cd < closestDist) { closest = t; closestDist = cd; }
        }
        if (!closest) break;
        chainedSet.add(mobs.indexOf(closest));
        // Lifesteal on chain lightning — capped at 20
        const chainHeal = Math.min(Math.round(chainDmg * 0.15), 20);
        if (chainHeal > 0) player.hp = Math.min(player.maxHp, player.hp + chainHeal);
        hitEffects.push({ x: closest.x, y: closest.y - 15, life: 15, type: "hit", dmg: chainDmg });
        hitEffects.push({ x: prev.x, y: prev.y - 15, life: 12, type: "lightning", tx: closest.x, ty: closest.y - 15 });
        dealDamageToMob(closest, chainDmg, "storm_chain");
        prev = closest;
      }
    }
  }

  // Piercing Blood — blood slashes burst from cleave-hit mobs, damaging mobs beyond melee range
  if (melee.special === 'cleave' && cleaveHits.length > 0) {
    const bloodDmg = Math.round(melee.damage * 0.55);
    const bloodRange = 280; // how far blood slashes reach from hit mob
    const alreadyBled = new Set(cleaveHits); // don't double-hit mobs already cleaved
    for (const src of cleaveHits) {
      if (src.hp <= 0) continue;
      // Blood slashes extend outward from this mob
      const dirFromPlayer = Math.atan2(src.y - player.y, src.x - player.x);
      // Visual: blood slash arcs from the hit mob
      for (let s = 0; s < 5; s++) {
        const a = dirFromPlayer + (s - 2) * 0.45;
        hitEffects.push({
          x: src.x, y: src.y,
          life: 22, maxLife: 22, type: "blood_slash_arc",
          angle: a, px: src.x, py: src.y,
        });
      }
      // Damage mobs near the hit mob that weren't already cleaved
      for (const t of mobs) {
        if (t.hp <= 0 || alreadyBled.has(t)) continue;
        const dx = t.x - src.x, dy = t.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bloodRange) {
          alreadyBled.add(t);
          dealDamageToMob(t, bloodDmg, "piercing_blood");
          // Lifesteal on piercing blood — 15% capped at 20
          const bloodHeal = Math.min(Math.round(bloodDmg * 0.15), 20);
          if (bloodHeal > 0) player.hp = Math.min(player.maxHp, player.hp + bloodHeal);
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
  
  // Ninja dash movement
  if (melee.dashing) {
    melee.dashTimer--;
    // Save trail position for afterimage
    melee.dashTrail.push({ x: player.x, y: player.y, life: 14 });
    if (melee.dashTrail.length > 8) melee.dashTrail.shift();
    
    // Move player forward
    const nx = player.x + melee.dashDirX * melee.dashSpeed;
    const ny = player.y + melee.dashDirY * melee.dashSpeed;
    const col = Math.floor(nx / TILE), row = Math.floor(ny / TILE);
    if (!isSolid(col, row)) {
      player.x = nx;
      player.y = ny;
    } else {
      melee.dashTimer = 0; // hit a wall, stop this dash
    }
    
    // Damage mobs we pass through during dash (2x damage)
    for (const m of mobs) {
      if (m.hp <= 0 || m.dashHit) continue;
      const dx = m.x - player.x, dy = m.y - player.y;
      if (dx * dx + dy * dy < 50 * 50) {
        m.dashHit = true;
        const isCrit = true; // dash hits always crit
        const dmg = Math.round(melee.damage * 2.0 * 1.5);
        hitEffects.push({ x: m.x, y: m.y - 30, life: 28, type: "crit", dmg: dmg });
        const sa = Math.atan2(m.y - player.y, m.x - player.x);
        hitEffects.push({ x: m.x, y: m.y - 10, life: 16, type: "ninja_slash", angle: sa });
        hitEffects.push({ x: m.x, y: m.y - 10, life: 18, type: "ninja_slash", angle: sa + Math.PI / 3 });
        dealDamageToMob(m, dmg, "ninja_dash_kill");
        // Lifesteal on dash hit — 15% capped at 20
        const dashHeal = Math.min(Math.round(dmg * 0.15), 20);
        if (dashHeal > 0) player.hp = Math.min(player.maxHp, player.hp + dashHeal);
      }
    }
    
    if (melee.dashTimer <= 0) {
      melee.dashing = false;
      melee.dashGap = 12; // ~0.2s gap before next dash allowed
      for (const m of mobs) delete m.dashHit;
      hitEffects.push({ x: player.x, y: player.y - 15, life: 12, type: "ninja_dash_end" });
      // If all 3 dashes used, end immediately
      if (melee.dashesLeft <= 0) {
        melee.dashActive = false;
        melee.dashCooldown = melee.dashCooldownMax;
      }
    }
  }
  
  // Malevolent Shrine — rapid slashing everything in range
  if (shrine.active) {
    shrine.timer--;
    if (shrine.timer <= 0) {
      shrine.active = false;
    } else if (shrine.timer % shrine.slashInterval === 0) {
      // Slash all mobs in range
      const slashAngle = Math.random() * Math.PI * 2;
      for (const m of mobs) {
        if (m.hp <= 0) continue;
        const dx = m.x - player.x;
        const dy = m.y - player.y;
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
  // Godspeed — Killua lightning mode with Kashimo ground strikes
  if (godspeed.active) {
    godspeed.timer--;
    if (godspeed.timer <= 0) {
      godspeed.active = false;
    } else if (godspeed.timer % godspeed.strikeInterval === 0) {
      // Ground lightning strikes on all mobs in range
      for (const m of mobs) {
        if (m.hp <= 0) continue;
        const dx = m.x - player.x;
        const dy = m.y - player.y;
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

function usePotion() {
  if (!Scene.inDungeon) return;
  if (potion.count <= 0 || potion.cooldown > 0 || player.hp >= player.maxHp) return;
  potion.count--;
  potion.cooldown = potion.cooldownMax;
  const healBoostMult = 1 + getHealBoost();
  const boostedHeal = Math.round(potion.healAmount * healBoostMult);
  const healed = Math.min(boostedHeal, player.maxHp - player.hp);
  player.hp = Math.min(player.maxHp, player.hp + boostedHeal);
  hitEffects.push({ x: player.x, y: player.y - 30, life: 20, type: "heal", dmg: healed });
}

function updatePotion() {
  if (potion.cooldown > 0) potion.cooldown--;
}

// === GRAB SYSTEM ===
function tryGrab() {
  if (grabCooldown > 0 || isGrabbing) return;
  // Find nearest mob in range
  let nearest = null, nearDist = GRAB_RANGE;
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    const dx = m.x - player.x, dy = m.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearDist) { nearest = m; nearDist = dist; }
  }
  isGrabbing = true;
  grabTimer = GRAB_DURATION;
  grabTarget = nearest;
  if (nearest) {
    // Stun the grabbed mob
    StatusFX.applyToMob(nearest, 'stun', { duration: GRAB_DURATION });
    // Deal some grab damage
    const grabDmg = Math.round(melee.damage * 0.3);
    dealDamageToMob(nearest, grabDmg);
    hitEffects.push({ x: nearest.x, y: nearest.y - 30, life: 20, type: "grab", dmg: grabDmg });
  }
}

function updateGrab() {
  if (grabCooldown > 0) grabCooldown--;
  if (!isGrabbing) return;
  grabTimer--;
  if (grabTarget && grabTarget.hp > 0) {
    // Hold mob in place near player
    const angle = Math.atan2(grabTarget.y - player.y, grabTarget.x - player.x);
    grabTarget.x = player.x + Math.cos(angle) * 40;
    grabTarget.y = player.y + Math.sin(angle) * 40;
    StatusFX.applyToMob(grabTarget, 'stun', { duration: 2 }); // keep stunned
  }
  if (grabTimer <= 0) {
    // Release — throw the mob away
    if (grabTarget && grabTarget.hp > 0) {
      const angle = Math.atan2(grabTarget.y - player.y, grabTarget.x - player.x);
      // Push mob away on release
      const throwDist = 80;
      const newX = grabTarget.x + Math.cos(angle) * throwDist;
      const newY = grabTarget.y + Math.sin(angle) * throwDist;
      if (positionClear(newX, newY)) { grabTarget.x = newX; grabTarget.y = newY; }
      // Throw damage
      const throwDmg = Math.round(melee.damage * 0.5);
      dealDamageToMob(grabTarget, throwDmg);
      hitEffects.push({ x: grabTarget.x, y: grabTarget.y - 30, life: 20, type: "crit", dmg: throwDmg });
    }
    isGrabbing = false;
    grabTarget = null;
    grabCooldown = GRAB_COOLDOWN;
  }
}

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
  // === CIRCULAR HITBOXES (centered at feet) ===
  // Entity hitbox: radius 26px centered at feet
  //   - Covers most of the character body visually (~52px diameter)
  //   - Character body is ~32px wide, ~40px from boots to shoulders
  // Bullet: radius 5px
  // Hit distance: 26 + 5 = 31px between centers

  const BULLET_R = 8;
  const ENTITY_R = 20;
  const HIT_DIST = BULLET_R + ENTITY_R; // 25
  const HIT_DIST_SQ = HIT_DIST * HIT_DIST; // 625

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

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
        // Blast damage if player nearby
        const dxP = b.x - player.x;
        const dyP = b.y - (player.y - 20);
        const distP = Math.sqrt(dxP * dxP + dyP * dyP);
        if (distP < 100 && !playerDead) {
          const blastDmg = Math.round((distP < 50 ? 20 : 12) * getMobDamageMultiplier());
          const dmgDealt = dealDamageToPlayer(blastDmg, "aoe", null);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmgDealt });
        }
      } else {
        hitEffects.push({ x: b.x, y: b.y, life: 10, type: "wall" });
      }
      bullets.splice(i, 1);
      continue;
    }

    // Mob hit — circle centered 20px above feet (body center)
    if (b.fromPlayer) {
      let hit = false;
      for (const m of mobs) {
        if (m.hp <= 0) continue;
        const dx = b.x - m.x;
        const dy = b.y - (m.y - 20);
        if (dx * dx + dy * dy < HIT_DIST_SQ) {
          hitEffects.push({ x: b.x, y: b.y, life: 19, type: "hit", dmg: gun.damage });
          
          // Gun special on-hit effects (dispatched via registry)
          const gunBehavior = gun.special && GUN_BEHAVIORS[gun.special];
          if (gunBehavior && gunBehavior.onHit) {
            gunBehavior.onHit(m, b.x, b.y);
          }
          
          bullets.splice(i, 1);
          dealDamageToMob(m, gun.damage, "gun");
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }

    // Non-player bullets vs player (mob shooter bullets)
    if (!b.fromPlayer) {
      // Arrow: poison on hit, arrow is destroyed
      if (b.isArrow) {
        const dxA = b.x - player.x;
        const dyA = b.y - (player.y - 20);
        if (dxA * dxA + dyA * dyA < HIT_DIST_SQ && !playerDead) {
          dealDamageToPlayer(b.damage, "projectile", null);
          // Apply/reset poison — 20 seconds (1200 frames)
          StatusFX.applyPoison(Math.round(1200 * (1 - getEffectReduction())));
          hitEffects.push({ x: b.x, y: b.y, life: 20, type: "poison_hit" });
          bullets.splice(i, 1);
          continue;
        }
        continue; // arrows skip normal bullet collision
      }
      // Boulder: only explodes on direct player hit (walls handled above)
      if (b.isBoulder) {
        const dxB = b.x - player.x;
        const dyB = b.y - (player.y - 20);
        if (dxB * dxB + dyB * dyB < 1600) { // 40px direct hit radius
          hitEffects.push({ x: b.x, y: b.y, life: 30, type: "explosion" });
          const boulderDmg = Math.round(20 * getMobDamageMultiplier());
          const dmgDealt = dealDamageToPlayer(boulderDmg, "aoe", null);
          hitEffects.push({ x: player.x, y: player.y - 10, life: 19, type: "hit", dmg: dmgDealt });
          bullets.splice(i, 1);
          continue;
        }
        continue; // boulders don't use normal bullet collision
      }
      const dx = b.x - player.x;
      const dy = b.y - (player.y - 20);
      if (dx * dx + dy * dy < HIT_DIST_SQ) {
        const bDmg = b.damage || gun.damage;
        const dmgDealt = dealDamageToPlayer(bDmg, "projectile", null);
        hitEffects.push({ x: b.x, y: b.y, life: 19, type: "hit", dmg: dmgDealt });
        bullets.splice(i, 1);
        continue;
      }
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
      // Cyan energy bolt — drone_lookout
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Outer glow
      ctx.fillStyle = "rgba(0,204,255,0.2)";
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      // Energy core
      ctx.fillStyle = "#00ccff";
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      // Bright center
      ctx.fillStyle = "#aaeeff";
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      // Electric crackle lines
      ctx.strokeStyle = "#00ccff";
      ctx.lineWidth = 1.5;
      const t = renderTime * 0.02;
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2 / 3) + t;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
        ctx.lineTo(Math.cos(a + 0.5) * 10, Math.sin(a + 0.3) * 10);
        ctx.stroke();
      }
      ctx.restore();
      // Cyan trail
      ctx.fillStyle = "rgba(0,204,255,0.3)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 3, b.y - b.vy * 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,180,255,0.15)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 6, b.y - b.vy * 6, 3, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.projectileStyle === 'tracer' && b.isArrow) {
      // Red laser tracer — renegade_sniper
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Red glow trail
      ctx.fillStyle = "rgba(255,30,30,0.15)";
      ctx.fillRect(-24, -4, 32, 8);
      // Tracer line
      ctx.fillStyle = "#ff2020";
      ctx.fillRect(-18, -1.5, 24, 3);
      // Bright core
      ctx.fillStyle = "#ff8080";
      ctx.fillRect(-12, -0.5, 18, 1);
      // Red tip glow
      ctx.fillStyle = "rgba(255,60,60,0.4)";
      ctx.beginPath(); ctx.arc(8, 0, 5, 0, Math.PI * 2); ctx.fill();
      // Bright tip
      ctx.fillStyle = "#ff4040";
      ctx.beginPath(); ctx.arc(8, 0, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Red trail particles
      ctx.fillStyle = "rgba(255,40,40,0.25)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 4, b.y - b.vy * 4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,20,20,0.1)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 8, b.y - b.vy * 8, 2, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.projectileStyle === 'golden' && b.isArrow) {
      // Golden bullet — the_don
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Gold glow
      ctx.fillStyle = "rgba(255,215,0,0.2)";
      ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      // Bullet casing
      ctx.fillStyle = "#b8960a";
      ctx.fillRect(-10, -3, 18, 6);
      // Gold body
      ctx.fillStyle = "#ffd700";
      ctx.fillRect(-8, -2, 16, 4);
      // Bright highlight
      ctx.fillStyle = "#fff8dc";
      ctx.fillRect(-6, -1, 12, 2);
      // Tip
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(6, -3);
      ctx.lineTo(6, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Gold sparkle trail
      ctx.fillStyle = "rgba(255,215,0,0.3)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 3, b.y - b.vy * 3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,200,0,0.15)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 6, b.y - b.vy * 6, 2, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    if (b.projectileStyle === 'saw_blade') {
      // Spinning saw blade — rust_sawman
      const spin = renderTime * 0.02;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(spin);
      // Blade disc
      ctx.fillStyle = '#6a6a6a';
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      // Inner ring
      ctx.fillStyle = '#8a8a8a';
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      // Teeth notches
      ctx.fillStyle = '#4a4a4a';
      for (let t = 0; t < 8; t++) {
        const ta = (t / 8) * Math.PI * 2;
        ctx.fillRect(Math.cos(ta) * 10 - 2, Math.sin(ta) * 10 - 2, 4, 4);
      }
      // Center hole
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Spark trail
      ctx.fillStyle = 'rgba(255,200,100,0.3)';
      ctx.beginPath(); ctx.arc(b.x - b.vx * 2, b.y - b.vy * 2, 4, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    if (b.isArrow) {
      // Poison arrow — greenish-black, long and thin, rotated to velocity
      const angle = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(angle);
      // Arrow shaft
      ctx.fillStyle = "#3a3020";
      ctx.fillRect(-14, -1.5, 28, 3);
      // Poison-green arrowhead
      ctx.fillStyle = "#6aff40";
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(10, -4);
      ctx.lineTo(10, 4);
      ctx.closePath();
      ctx.fill();
      // Arrowhead glow
      ctx.fillStyle = "rgba(100,255,60,0.4)";
      ctx.beginPath(); ctx.arc(14, 0, 6, 0, Math.PI * 2); ctx.fill();
      // Fletching (feathers at back)
      ctx.fillStyle = "#2a4a20";
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-10, -4);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-14, 0);
      ctx.lineTo(-10, 4);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Green poison trail
      ctx.fillStyle = "rgba(80,200,40,0.3)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 3, b.y - b.vy * 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(60,160,30,0.15)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 6, b.y - b.vy * 6, 3, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    if (b.isBoulder) {
      // Boulder — MASSIVE spinning rock
      const spin = renderTime * 0.006;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(spin);
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath(); ctx.ellipse(4, 26, 28, 10, 0, 0, Math.PI * 2); ctx.fill();
      // Rock body — massive
      ctx.fillStyle = "#5a5448";
      ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#6a6458";
      ctx.beginPath(); ctx.arc(-4, -5, 23, 0, Math.PI * 2); ctx.fill();
      // Highlight
      ctx.fillStyle = "#7a7468";
      ctx.beginPath(); ctx.arc(-8, -10, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8a8478";
      ctx.beginPath(); ctx.arc(-6, -12, 7, 0, Math.PI * 2); ctx.fill();
      // Deep cracks
      ctx.strokeStyle = "#3a3428";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(8, 14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, -18); ctx.lineTo(16, 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-20, 16); ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(10, -12); ctx.lineTo(22, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-18, -6); ctx.lineTo(-8, 10); ctx.stroke();
      ctx.restore();
      // Dust trail — big
      ctx.fillStyle = "rgba(160,140,120,0.4)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 5, b.y - b.vy * 5, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(140,120,100,0.25)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 10, b.y - b.vy * 10, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(120,100,80,0.12)";
      ctx.beginPath(); ctx.arc(b.x - b.vx * 16, b.y - b.vy * 16, 8, 0, Math.PI * 2); ctx.fill();
      continue;
    }
    const isH = Math.abs(b.vx) > Math.abs(b.vy);
    const isMob = b.mobBullet;
    const bc = b.bulletColor;
    const mainColor = isMob ? "#ff6040" : (bc ? bc.main : "#ffe860");
    const coreColor = isMob ? "#ffaa80" : (bc ? bc.core : "#fff");
    const glowColor = isMob ? "rgba(255,80,40,0.25)" : (bc ? bc.glow : "rgba(255,230,80,0.2)");

    // Bullet body
    ctx.fillStyle = mainColor;
    if (isH) {
      ctx.fillRect(b.x - 10, b.y - 5, 20, 10);
      ctx.fillStyle = coreColor;
      ctx.fillRect(b.x - 7, b.y - 3, 14, 6);
    } else {
      ctx.fillRect(b.x - 5, b.y - 10, 10, 20);
      ctx.fillStyle = coreColor;
      ctx.fillRect(b.x - 3, b.y - 7, 6, 14);
    }

    // Glow
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 12, 0, Math.PI * 2);
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
