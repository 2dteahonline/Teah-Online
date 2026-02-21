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
function dealDamageToMob(mob, amount, source) {
  mob.hp -= amount;
  if (mob.hp <= 0) {
    processKill(mob, source);
    return true; // died
  }
  return false; // survived
}

// ===================== CENTRALIZED PLAYER DAMAGE SYSTEM =====================
// dealDamageToPlayer(rawDamage, source, attacker)
//   source: "contact"    — armor reduction + thorns (melee mob hits)
//           "projectile" — armor + projectile reduction (arrows, generic bullets)
//           "aoe"        — armor + projectile reduction (explosions, stomps)
//           "dot"        — no reduction (already pre-reduced by caller)
//   attacker: optional mob reference for thorns/stagger response
//   Returns: final damage dealt after reductions
//
function dealDamageToPlayer(rawDamage, source, attacker) {
  if (playerDead) return 0;

  // 1. Apply armor reduction
  let reduced = rawDamage;
  if (source !== "dot") {
    reduced *= (1 - getArmorReduction());
  }

  // 2. Apply projectile/AOE reduction
  if (source === "projectile" || source === "aoe") {
    reduced *= (1 - getProjReduction());
  }

  // 3. Round and subtract
  const finalDmg = Math.round(reduced);
  player.hp -= finalDmg;

  // 4. Thorns — reflect damage to attacker on contact hits
  if (source === "contact" && attacker && attacker.hp > 0) {
    const thornsRate = getThorns();
    if (thornsRate > 0) {
      const thornsDmg = Math.round(finalDmg * thornsRate);
      hitEffects.push({ x: attacker.x, y: attacker.y - 15, life: 15, type: "hit", dmg: thornsDmg });
      hitEffects.push({ x: attacker.x, y: attacker.y, life: 12, type: "thorns" });
      dealDamageToMob(attacker, thornsDmg, "thorns");
      const staggerTime = getStagger();
      if (staggerTime > 0) {
        StatusFX.applyToMob(attacker, 'stagger', { duration: Math.round(staggerTime * 60) });
      }
    }
  }

  // 5. Death check
  checkPlayerDeath();

  Events.emit('player_damaged', { amount: finalDmg, raw: rawDamage, source, attacker });
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
    onKill: function(mob) {
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
    onKill: function(mob) {
      if (mob.burnTimer <= 0) return; // only burning mobs explode
      const explosionRadius = 100;
      const explosionDmg = Math.round(gun.damage * 0.8);
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
  melee: function() {
    if (melee.special === 'ninja' && melee.dashActive) return 2.0;
    if (melee.special === 'storm') return 1.5;
    return 1.0;
  },
  ninja_splash: function() { return melee.dashActive ? 2.0 : 1.0; },
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

function getKillHealMult(source) {
  const entry = MELEE_HEAL_MULTS[source];
  if (typeof entry === 'function') return entry();
  if (typeof entry === 'number') return entry;
  return 1.0;
}

function processKill(mob, source) {
  // 1. Kill count + XP
  kills++;
  addPlayerXP(5);
  addSkillXP("Total Kills", 5);

  // 2. Quick-kill bonus
  const qkb = getQuickKillBonus(mob);

  // 3. Gold reward
  const goldEarned = Math.round(getGoldReward(mob.type, wave) * qkb);
  gold += goldEarned;

  // 4. Kill heal
  const baseHeal = (MOB_TYPES[mob.type] && MOB_TYPES[mob.type].killHeal) || 5;

  // Witch skeleton early return — flat 1 HP, no normal rewards
  if (source === "witch_skeleton") {
    player.hp = Math.min(player.maxHp, player.hp + 1);
    hitEffects.push({ x: mob.x, y: mob.y - 20, life: 20, type: "kill", gold: 0 });
    Events.emit('mob_killed', { mob, source, goldEarned: 0, heal: 1 });
    return;
  }

  // Source-specific heal multiplier (from MELEE_HEAL_MULTS registry)
  const healMult = getKillHealMult(source);

  // Apply chest armor heal boost
  const chestHealBoost = playerEquip.chest && playerEquip.chest.healBoost ? playerEquip.chest.healBoost : 0;
  let finalHeal = Math.round(baseHeal * qkb * healMult * (1 + chestHealBoost));
  // Lifesteal floor — guarantees minimum heal per kill
  if (typeof lifestealPerKill !== 'undefined') finalHeal = Math.max(finalHeal, lifestealPerKill);
  if (finalHeal > 0) {
    player.hp = Math.min(player.maxHp, player.hp + finalHeal);
  }

  // 5. Visual effects
  hitEffects.push({ x: mob.x, y: mob.y - 20, life: 25, type: "kill", gold: goldEarned });
  if (source === "ninja_dash_kill" || source === "ninja_splash" || (finalHeal >= 15)) {
    hitEffects.push({ x: player.x, y: player.y - 35, life: 18, type: "heal", dmg: "+" + finalHeal + " HP" });
  }

  // 6. Witch death → kill all her skeletons
  if (mob.type === "witch") {
    for (const s of mobs) {
      if (s.witchId === mob.id && s.hp > 0) {
        s.hp = 0;
        processKill(s, "witch_skeleton");
      }
    }
  }
  // Golem death → kill all its mini golems
  if (mob.type === "golem") {
    for (const s of mobs) {
      if (s.golemOwnerId === mob.id && s.hp > 0) {
        s.hp = 0;
        processKill(s, "witch_skeleton"); // reuse same low-reward source
      }
    }
  }

  // 7. Emit event — all other kill reactions are subscribers
  Events.emit('mob_killed', { mob, source, goldEarned, heal: finalHeal, qkb });
}

// === EVENT SUBSCRIBERS: mob_killed ===
// Ammo refill on kill (not skeletons)
Events.on('mob_killed', ({ mob, source }) => {
  if (source === "witch_skeleton") return;
  if (mob.type !== 'skeleton') {
    gun.ammo = gun.magSize;
    gun.reloading = false;
    gun.reloadTimer = 0;
  }
});

// Ultimate charge on kill
Events.on('mob_killed', ({ mob, source }) => {
  if (source === "witch_skeleton") return;
  if (typeof shrine !== 'undefined' && melee.special === 'cleave' && !shrine.active) {
    shrine.charges = Math.min((shrine.charges || 0) + 1, shrine.chargesMax || 10);
  }
  if (typeof godspeed !== 'undefined' && melee.special === 'storm' && !godspeed.active) {
    godspeed.charges = Math.min((godspeed.charges || 0) + 1, godspeed.chargesMax || 10);
  }
});

// Gun on-kill special effects (frost nova, inferno explosion, etc.)
Events.on('mob_killed', ({ mob, source }) => {
  if (typeof gun !== 'undefined' && gun.special && GUN_BEHAVIORS[gun.special]) {
    const behavior = GUN_BEHAVIORS[gun.special];
    if (behavior.onKill && behavior.killSources && behavior.killSources.includes(source)) {
      behavior.onKill(mob);
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

