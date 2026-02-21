// ===================== INVENTORY SYSTEM =====================
// Authority: item management, equipment, shop, tier data
// Extracted from index_2.html — Phase B

// ===================== INVENTORY SYSTEM =====================
// Fixed slot-based inventory (Graal style)
// 20 slots in a 5x4 grid. Each slot holds one item or is null.
// inventory → js/authority/gameState.js
// Item structure: { id, name, type, tier, icon, stackable, count, data }
// Types: "gun", "melee", "armor", "consumable", "material", "key"

// Inventory managed by UI Panel Manager
let invDragFrom = -1; // slot being dragged from (-1 = none)
let invHover = -1;    // slot mouse is over
let invTooltip = null; // { slot, x, y } for tooltip display
let cardPopup = null;  // { item, x, y } for right-click detail card

// Equipment slots: head, body, weapon, offhand, accessory
const EQUIP_SLOTS = ['weapon', 'melee', 'armor', 'accessory'];
// playerEquip already exists — we'll keep it as the source of truth

// Create an item object from tier data
function createItem(type, tierData) {
  return {
    id: tierData.id,
    name: tierData.name,
    type: type,
    tier: tierData.tier,
    data: tierData,
    stackable: false,
    count: 1,
  };
}

// Create a consumable item
function createConsumable(id, name, count) {
  return {
    id: id,
    name: name,
    type: "consumable",
    tier: 0,
    data: { id, name },
    stackable: true,
    count: count || 1,
  };
}

// Add item to inventory, returns true (always succeeds — no limit)
function addToInventory(item) {
  if (item.stackable) {
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] && inventory[i].id === item.id && inventory[i].stackable) {
        inventory[i].count += item.count;
        return true;
      }
    }
  }
  inventory.push(item);
  return true;
}

// Check if an item ID exists in inventory
function isInInventory(id) {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && inventory[i].id === id) return true;
  }
  return false;
}

// Remove item from inventory slot
function removeFromInventory(slot) {
  const item = inventory[slot];
  inventory.splice(slot, 1);
  return item;
}

// Equip item from inventory — item stays in its slot, just gets equipped
function equipItem(slot) {
  const item = inventory[slot];
  if (!item) return;
  const eqType = item.type;
  // Only equipment items can be equipped
  if (!ITEM_CATEGORIES.equipment.includes(eqType)) {
    return;
  }

  // If this item is already equipped, unequip it (revert to default weapon)
  if (playerEquip[eqType] && playerEquip[eqType].id === item.data.id) {
    if (eqType === 'gun') {
      playerEquip.gun = DEFAULT_GUN;
      gun.damage = DEFAULT_GUN.damage;
      gun.magSize = DEFAULT_GUN.magSize; gun.ammo = DEFAULT_GUN.magSize;
      gun.special = null;
    } else if (eqType === 'melee') {
      playerEquip.melee = DEFAULT_MELEE;
      melee.damage = DEFAULT_MELEE.damage;
      melee.critChance = DEFAULT_MELEE.critChance;
      melee.range = DEFAULT_MELEE.range; melee.cooldownMax = DEFAULT_MELEE.cooldown;
      melee.special = null;
    } else {
      playerEquip[eqType] = null;
      if (eqType === 'chest') recalcMaxHp();
    }
    return;
  }

  // Equip this item (replaces whatever is in that slot)
  playerEquip[eqType] = item.data;
  if (eqType === 'gun') {
    gun.damage = item.data.damage || GUN_DEFAULTS.damage;
    gun.magSize = item.data.magSize || 12;
    gun.ammo = Math.min(gun.ammo, gun.magSize);
    gun.fireCooldownMax = item.data.fireRate || 10;
    gun.special = item.data.special || null;
  } else if (eqType === 'melee') {
    melee.damage = item.data.damage || MELEE_DEFAULTS.damage;
    melee.range = item.data.range || DEFAULT_MELEE.range;
    melee.cooldownMax = item.data.cooldown || DEFAULT_MELEE.cooldown;
    melee.critChance = item.data.critChance || MELEE_DEFAULTS.critChance;
    melee.special = item.data.special || null;
  } else if (eqType === 'chest') {
    recalcMaxHp();
  }
}

// Unequip item to inventory (find free slot)
function unequipItem(eqType) {
  const current = playerEquip[eqType];
  if (!current) return false;
  // Don't unequip default weapons
  if (current.id === DEFAULT_GUN.id || current.id === DEFAULT_MELEE.id) return false;
  const item = createItem(eqType, current);
  if (addToInventory(item)) {
    if (eqType === 'gun') {
      playerEquip.gun = DEFAULT_GUN;
      gun.damage = DEFAULT_GUN.damage;
      gun.magSize = DEFAULT_GUN.magSize; gun.ammo = DEFAULT_GUN.magSize;
    } else if (eqType === 'melee') {
      playerEquip.melee = DEFAULT_MELEE;
      melee.damage = DEFAULT_MELEE.damage;
      melee.critChance = DEFAULT_MELEE.critChance;
      melee.range = DEFAULT_MELEE.range; melee.cooldownMax = DEFAULT_MELEE.cooldown;
    } else {
      playerEquip[eqType] = null;
    }
    return true;
  }
  return false; // inventory full
}

// getTierColor, getTierName → js/shared/itemData.js

// potion → js/authority/gameState.js

// Wave XP multiplier (for mob HP/speed scaling only)

// Wave scaling — harder per wave since fewer mobs
function getMobCountForWave(w) { 
  // More mobs on higher floors
  const base = Math.min(5 + Math.floor(w * 1.0), 14);
  const floorBonus = Math.floor((dungeonFloor - 1) * 2); // +2 mobs per floor
  return Math.min(base + floorBonus, 22); // cap at 22
}
function getWaveHPMultiplier(w) { 
  // Exponential floor scaling: floor 1=1x, 2=2.2x, 3=5x, 4=11x, 5=25x
  const floorMult = Math.pow(2.2, dungeonFloor - 1);
  // +12% HP per wave within each floor
  return (1 + (w - 1) * 0.12) * floorMult; 
}
function getWaveSpeedMultiplier(w) { 
  // Speed also scales with floor (but capped by capMobSpeed)
  const floorSpd = 1 + (dungeonFloor - 1) * 0.15;
  return (1 + (w - 1) * 0.06) * floorSpd; 
}
// Mob damage also scales with floor
function getMobDamageMultiplier() {
  // Floor 1=1x, 2=1.5x, 3=2.2x, 4=3.2x, 5=4.5x
  return 1 + (dungeonFloor - 1) * 0.7 + Math.pow(dungeonFloor - 1, 1.5) * 0.2;
}
// Speed caps: runner max 1.5x player speed, everything else max 0.95x
function capMobSpeed(type, speed) {
  const playerSpeed = player.baseSpeed || 3.5; // base only — boots should NOT affect mob caps
  if (type === "runner") return Math.min(speed, playerSpeed * 1.1);
  return Math.min(speed, playerSpeed * 0.85);
}

// Themed wave compositions — each wave has a primary focus + minor support
// Returns { primary: [{type, weight}], support: [{type, weight}], primaryPct: 0.6-0.8, theme: "name" }
function getWaveComposition(w) {
  const isBoss = w % 10 === 0 && w >= 10;
  if (isBoss) return { primary: [{type:"golem",weight:1}], support: [{type:"tank",weight:2},{type:"witch",weight:1},{type:"grunt",weight:2}], primaryPct: 0.08, theme: "⚔ BOSS WAVE ⚔", forceGolem: true };

  // Cycle through themed waves with some variety
  const cycle = ((w - 1) % 8);
  switch(cycle) {
    case 0: // Grunt rush
      return { primary: [{type:"grunt",weight:1}], support: [], primaryPct: 1.0, theme: "Grunt Rush" };
    case 1: // Archer Ambush — archers snipe from back, grunts + runners push you in
      return { primary: [{type:"archer",weight:3},{type:"grunt",weight:2}], support: [{type:"runner",weight:2}], primaryPct: 0.6, theme: "Archer Ambush" };
    case 2: // Runner swarm
      return { primary: [{type:"runner",weight:3}], support: [{type:"grunt",weight:1}], primaryPct: 0.75, theme: "Speed Swarm" };
    case 3: // Mummy ambush
      return { primary: [{type:"mummy",weight:3}], support: [{type:"runner",weight:2},{type:"grunt",weight:1}], primaryPct: 0.5, theme: "Mummy Ambush" };
    case 4: // Tank assault with healers keeping them alive
      return { primary: [{type:"tank",weight:5}], support: [{type:"healer",weight:2},{type:"grunt",weight:1}], primaryPct: 0.6, theme: "Heavy Assault" };
    case 5: // Witch coven
      return { primary: [{type:"witch",weight:2}], support: [{type:"grunt",weight:2},{type:"tank",weight:1}], primaryPct: 0.3, theme: "Witch Coven" };
    case 6: // Blitz wave
      return { primary: [{type:"runner",weight:3},{type:"mummy",weight:2}], support: [{type:"grunt",weight:1}], primaryPct: 0.65, theme: "Blitz Wave" };
    case 7: // Mixed elite — everything
      return { primary: [{type:"tank",weight:2},{type:"witch",weight:2}], support: [{type:"healer",weight:1},{type:"archer",weight:1},{type:"mummy",weight:1},{type:"runner",weight:1}], primaryPct: 0.5, theme: "Elite Wave" };
    default:
      return { primary: [{type:"grunt",weight:1}], support: [], primaryPct: 1.0, theme: "Wave " + w };
  }
}

function pickFromWeighted(entries) {
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * totalWeight;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e.type;
  }
  return entries[entries.length - 1].type;
}

let waveTheme = ""; // current wave theme name

// Spawn positions — edges of the map
function getSpawnPos() {
  // Try edge spawns up to 20 times to find a clear position
  const margin = 4;
  for (let attempt = 0; attempt < 20; attempt++) {
    const edge = Math.floor(Math.random() * 4);
    let tx, ty;
    if (edge === 0) { tx = margin + Math.floor(Math.random() * (level.widthTiles - margin * 2)); ty = margin; }
    else if (edge === 1) { tx = margin + Math.floor(Math.random() * (level.widthTiles - margin * 2)); ty = level.heightTiles - margin - 1; }
    else if (edge === 2) { tx = margin; ty = margin + Math.floor(Math.random() * (level.heightTiles - margin * 2)); }
    else { tx = level.widthTiles - margin - 1; ty = margin + Math.floor(Math.random() * (level.heightTiles - margin * 2)); }

    if (!isSolid(tx, ty)) {
      return { x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 };
    }
  }
  // Fallback: scan for any walkable tile away from player
  for (let ty = margin; ty < level.heightTiles - margin; ty++) {
    for (let tx = margin; tx < level.widthTiles - margin; tx++) {
      if (!isSolid(tx, ty)) {
        const px = tx * TILE + TILE / 2, py = ty * TILE + TILE / 2;
        const ddx = px - player.x, ddy = py - player.y;
        if (ddx * ddx + ddy * ddy > 200 * 200) {
          return { x: px, y: py };
        }
      }
    }
  }
  return { x: 10 * TILE + TILE / 2, y: 10 * TILE + TILE / 2 };
}

let nextMobId = 1; // unique mob IDs for witch-skeleton linking

function spawnWave() {
  wave++;
  waveState = "active";
  const comp = getWaveComposition(wave);
  waveTheme = comp.theme;
  
  // Reset phase tracking
  currentPhase = 1;
  phaseMobsKilled = 0;
  phaseTriggered = [true, false, false]; // phase 1 spawns immediately
  
  // Clear leftover medpacks from previous wave
  medpacks.length = 0;
  
  // Boss waves (every 10th) have no phases — single spawn
  const isBossWave = comp.forceGolem || false;
  if (isBossWave) {
    spawnMedpacks();
    spawnMedpacks();
    spawnPhase(comp, 1, isBossWave);
    phaseTriggered = [true, true, true]; // no more phases
    phaseMaxMobs = mobs.length;
    // Tag all boss mobs as phase 1
    for (const m of mobs) { if (!m.phase) m.phase = 1; }
    Events.emit('wave_started', { wave, floor: dungeonFloor, isBoss: true, mobCount: mobs.length });
    return;
  }
  
  // Phase 1: spawn normally
  spawnMedpacks();
  spawnPhase(comp, 1, false);
  phaseMaxMobs = mobs.length;
  // Tag phase 1 mobs
  for (const m of mobs) { if (!m.phase) m.phase = 1; }
  Events.emit('wave_started', { wave, floor: dungeonFloor, isBoss: false, mobCount: mobs.length });
}

// Spawn a single phase of mobs for the current wave
function spawnPhase(comp, phase, isBossWave) {
  
  // Farm waves get more mobs
  const isFarmWave = (wave % 8 === 1 || wave % 8 === 3); // Grunt Rush & Speed Swarm
  const farmMult = isFarmWave ? 1.6 : 1.0;
  const count = Math.floor(getMobCountForWave(wave) * farmMult);
  
  // Farm waves have slightly weaker mobs
  const farmHPMult = isFarmWave ? 0.7 : 1.0;
  // Phase scaling: +4% HP for phase 2, +8% HP for phase 3
  const phaseHPMult = phase === 2 ? 1.04 : phase === 3 ? 1.08 : 1.0;
  const phaseSpdMult = phase === 2 ? 1.02 : phase === 3 ? 1.04 : 1.0;
  const hpMult = getWaveHPMultiplier(wave) * farmHPMult * phaseHPMult;
  const spdMult = getWaveSpeedMultiplier(wave) * phaseSpdMult;

  // Filter out mob types not yet unlocked
  const unlocked = (type) => {
    if (type === "archer") return wave >= 2;
    if (type === "runner") return wave >= 3;
    if (type === "tank") return wave >= 5;
    if (type === "healer") return wave >= 5;
    if (type === "mummy") return wave >= 4;
    if (type === "witch") return wave >= 6;
    if (type === "golem") return wave >= 10 && wave % 10 === 0;
    return true; // grunt, skeleton always
  };
  const primary = comp.primary.filter(e => unlocked(e.type));
  const support = comp.support.filter(e => unlocked(e.type));
  // Fallback if nothing unlocked yet
  if (primary.length === 0) primary.push({type:"grunt",weight:1});
  if (support.length === 0) support.push({type:"grunt",weight:1});

  const typeCounts = {};

  // Boss waves: guarantee one of every support type first, then fill randomly
  if (isBossWave) {
    // Spawn the golem first
    const golemPos = getSpawnPos();
    const golemMt = MOB_TYPES.golem;
    const golemId = nextMobId++;
    const golemHp = Math.round(golemMt.hp * hpMult * 1.5);
    mobs.push({
      x: golemPos.x, y: golemPos.y, type: "golem", id: golemId,
      hp: golemHp, maxHp: golemHp,
      speed: capMobSpeed("golem", golemMt.speed * spdMult),
      damage: Math.round(golemMt.damage * getMobDamageMultiplier()), contactRange: golemMt.contactRange,
      skin: golemMt.skin, hair: golemMt.hair, shirt: golemMt.shirt, pants: golemMt.pants,
      name: golemMt.name, dir: 0, frame: 0, attackCooldown: 0,
      shootRange: 0, shootRate: 0, shootTimer: 0, bulletSpeed: 0,
      summonRate: golemMt.summonRate || 0, summonMax: golemMt.summonMax || 0,
      summonTimer: Math.floor((golemMt.summonRate || 0) * 0.5), witchId: 0,
      boneSwing: 0, castTimer: 0,
      scale: 1.6, spawnFrame: gameFrame,
      boulderRate: golemMt.boulderRate || 0, boulderSpeed: golemMt.boulderSpeed || 0,
      boulderRange: golemMt.boulderRange || 0,
      boulderTimer: Math.floor((golemMt.boulderRate || 0) * 0.3), throwAnim: 0,
      explodeRange: 0, explodeDamage: 0, fuseMin: 0, fuseMax: 0, mummyArmed: false, mummyFuse: 0,
      arrowRate: 0, arrowSpeed: 0, arrowRange: 0, arrowBounces: 0, arrowLife: 0, bowDrawAnim: 0, arrowTimer: 0,
      healRadius: 0, healRate: 0, healAmount: 0, healTimer: 0, healAnim: 0,
    });
    typeCounts["golem"] = 1;

    // Guarantee spawns: tank, witch, grunt, runner, archer, healer, mummy
    const guaranteedTypes = ["tank", "witch", "grunt", "runner", "archer", "healer", "mummy"];
    const guaranteedCounts = { tank: 3, witch: 2, grunt: 4, runner: 3, archer: 2, healer: 2, mummy: 2 };
    for (const gType of guaranteedTypes) {
      const gCount = guaranteedCounts[gType] || 1;
      const gMt = MOB_TYPES[gType];
      if (!gMt) continue;
      for (let gi = 0; gi < gCount; gi++) {
        const gPos = getSpawnPos();
        const gId = nextMobId++;
        let gHp = Math.round(gMt.hp * hpMult);
        if (gType === "witch") gHp = Math.round(MOB_TYPES.tank.hp * 1.2 * hpMult);
        mobs.push({
          x: gPos.x, y: gPos.y, type: gType, id: gId,
          hp: gHp, maxHp: gHp,
          speed: capMobSpeed(gType, gMt.speed * spdMult),
          damage: Math.round(gMt.damage * getMobDamageMultiplier()), contactRange: gMt.contactRange,
          skin: gMt.skin, hair: gMt.hair, shirt: gMt.shirt, pants: gMt.pants,
          name: gMt.name, dir: 0, frame: 0, attackCooldown: 0,
          shootRange: gMt.shootRange || 0, shootRate: gMt.shootRate || 0,
          shootTimer: gMt.shootRate ? Math.floor(Math.random() * gMt.shootRate) : 0,
          bulletSpeed: gMt.bulletSpeed || 0,
          summonRate: gMt.summonRate || 0, summonMax: gMt.summonMax || 0,
          summonTimer: gMt.summonRate ? Math.floor(gMt.summonRate * 0.5) : 0,
          witchId: 0, boneSwing: 0, castTimer: 0,
          scale: gType === "tank" ? 1.3 : gType === "witch" ? 1.1 : 1.0,
          spawnFrame: gameFrame,
          boulderRate: gMt.boulderRate || 0, boulderSpeed: gMt.boulderSpeed || 0,
          boulderRange: gMt.boulderRange || 0,
          boulderTimer: gMt.boulderRate ? Math.floor(gMt.boulderRate * 0.3) : 0, throwAnim: 0,
          explodeRange: gMt.explodeRange || 0, explodeDamage: Math.round((gMt.explodeDamage || 0) * getMobDamageMultiplier()),
          fuseMin: gMt.fuseMin || 0, fuseMax: gMt.fuseMax || 0, mummyArmed: false, mummyFuse: 0,
          arrowRate: gMt.arrowRate || 0, arrowSpeed: gMt.arrowSpeed || 0,
          arrowRange: gMt.arrowRange || 0, arrowBounces: gMt.arrowBounces || 0,
          arrowLife: gMt.arrowLife || 0, bowDrawAnim: 0,
          arrowTimer: gMt.arrowRate ? Math.floor(Math.random() * gMt.arrowRate) : 0,
          healRadius: gMt.healRadius || 0, healRate: gMt.healRate || 0,
          healAmount: gMt.healAmount || 0,
          healTimer: gMt.healRate ? Math.floor(gMt.healRate * 0.5) : 0, healAnim: 0,
        });
        typeCounts[gType] = (typeCounts[gType] || 0) + 1;
      }
    }
    // Boss wave spawning done — skip normal loop
  } else {

  for (let i = 0; i < count; i++) {
    let typeKey;
    // Force first mob to be golem on boss waves
    if (isBossWave && i === 0) {
      typeKey = "golem";
    } else {
      // Pick from primary or support pool based on primaryPct
      const usePrimary = Math.random() < comp.primaryPct || support.length === 0;
      typeKey = usePrimary ? pickFromWeighted(primary) : pickFromWeighted(support);
    }
    // Enforce per-type caps
    const cap = MOB_CAPS[typeKey] || 99;
    if ((typeCounts[typeKey] || 0) >= cap) {
      const allTypes = [...primary, ...support];
      const available = allTypes.filter(e => (typeCounts[e.type] || 0) < (MOB_CAPS[e.type] || 99));
      if (available.length > 0) {
        typeKey = pickFromWeighted(available);
      } else {
        continue;
      }
    }
    typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;
    const mt = MOB_TYPES[typeKey];
    const pos = getSpawnPos();

    // Special HP: witch and golem
    let mobHp = Math.round(mt.hp * hpMult);
    if (typeKey === "witch") mobHp = Math.round(MOB_TYPES.tank.hp * 1.2 * hpMult);
    if (typeKey === "golem") mobHp = Math.round(mt.hp * hpMult * 1.5); // boss scaling

    const mobId = nextMobId++;
    mobs.push({
      x: pos.x, y: pos.y,
      type: typeKey,
      id: mobId,
      hp: mobHp,
      maxHp: mobHp,
      speed: capMobSpeed(typeKey, mt.speed * spdMult),
      damage: Math.round(mt.damage * getMobDamageMultiplier()),
      contactRange: mt.contactRange,
      skin: mt.skin, hair: mt.hair, shirt: mt.shirt, pants: mt.pants,
      name: mt.name,
      dir: 0, frame: 0, attackCooldown: 0,
      // Shooter ranged attack
      shootRange: mt.shootRange || 0,
      shootRate: mt.shootRate || 0,
      shootTimer: mt.shootRate ? Math.floor(Math.random() * mt.shootRate) : 0,
      bulletSpeed: mt.bulletSpeed || 0,
      // Witch summoning
      summonRate: mt.summonRate || 0,
      summonMax: mt.summonMax || 0,
      summonTimer: mt.summonRate ? Math.floor(mt.summonRate * 0.5) : 0,
      // Skeleton ownership
      witchId: 0, // if skeleton, which witch spawned it
      boneSwing: 0, // skeleton attack animation timer
      castTimer: 0, // witch casting animation timer
      // Visual scale for tanks
      scale: typeKey === "tank" ? 1.3 : typeKey === "witch" ? 1.1 : typeKey === "golem" ? 1.6 : 1.0,
      spawnFrame: gameFrame,
      // Golem boulder throwing
      boulderRate: mt.boulderRate || 0,
      boulderSpeed: mt.boulderSpeed || 0,
      boulderRange: mt.boulderRange || 0,
      boulderTimer: mt.boulderRate ? Math.floor(mt.boulderRate * 0.3) : 0,
      throwAnim: 0, // golem throw animation timer
      // Mummy explosion
      explodeRange: mt.explodeRange || 0,
      explodeDamage: Math.round((mt.explodeDamage || 0) * getMobDamageMultiplier()),
      mummyFuse: 0, // counts down when near player, explodes at 0
      mummyArmed: false, // becomes true when close to player
      mummyFlash: 0, // visual flash timer
      // Archer fields
      arrowRate: mt.arrowRate || 0,
      arrowSpeed: mt.arrowSpeed || 0,
      arrowRange: mt.arrowRange || 0,
      arrowTimer: mt.arrowRate ? Math.floor(Math.random() * mt.arrowRate) : 0,
      arrowBounces: mt.arrowBounces || 0,
      arrowLife: mt.arrowLife || 0,
      bowDrawAnim: 0, // bow draw animation timer
      // Healer fields
      healRadius: mt.healRadius || 0,
      healRate: mt.healRate || 0,
      healAmount: mt.healAmount || 0,
      healTimer: mt.healRate ? Math.floor(Math.random() * mt.healRate) : 0,
      healAnim: 0, // healing pulse animation
      healZoneX: 0, healZoneY: 0, // projected heal zone center
    });
  }
  } // end non-boss else block
}

// Check if next phase should trigger (called when a mob dies)
function checkPhaseAdvance(deadMobPhase) {
  if (waveState !== "active") return;
  // Boss waves have no phases
  if (phaseTriggered[0] && phaseTriggered[1] && phaseTriggered[2]) return;
  
  // Only count kills of mobs from the current phase
  if (deadMobPhase === currentPhase) {
    phaseMobsKilled++;
  }
  
  const nextPhase = currentPhase + 1;
  if (nextPhase > 3) return;
  if (phaseTriggered[nextPhase - 1]) return;
  
  // Trigger next phase when 75% of current phase's mobs are killed
  if (phaseMaxMobs > 0 && phaseMobsKilled >= Math.floor(phaseMaxMobs * 0.75)) {
    currentPhase = nextPhase;
    phaseTriggered[nextPhase - 1] = true;
    phaseMobsKilled = 0;
    
    // Spawn next phase mobs
    const comp = getWaveComposition(wave);
    spawnMedpacks();
    const mobsBefore = mobs.length;
    spawnPhase(comp, nextPhase, false);
    // Tag new mobs with their phase number
    for (let mi = mobsBefore; mi < mobs.length; mi++) {
      mobs[mi].phase = nextPhase;
    }
    phaseMaxMobs = mobs.length - mobsBefore; // only count NEW mobs for next threshold
    
    // Phase announcement
    const phaseNames = ["", "Phase 1", "Phase 2", "Phase 3"];
    hitEffects.push({ x: player.x, y: player.y - 60, life: 35, maxLife: 35, type: "heal", dmg: phaseNames[nextPhase] + " incoming!" });
  }
}

// Track player velocity for prediction
let playerVelX = 0, playerVelY = 0;

// Global helper: check if a position is wall-free (used by spawning, mob AI, and body blocking)
const POS_HW = 16;
function positionClear(px, py) {
  const cL = Math.floor((px - POS_HW) / TILE), cR = Math.floor((px + POS_HW) / TILE);
  const rT = Math.floor((py - POS_HW) / TILE), rB = Math.floor((py + POS_HW) / TILE);
  return !isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB);
}

// BFS pathfinder — finds shortest tile path from (sx,sy) to (ex,ey)
// Returns array of {x,y} tile coords, or null if no path
// Capped at 400 tiles explored to avoid lag
function bfsPath(sx, sy, ex, ey) {
  if (sx === ex && sy === ey) return [{x:sx,y:sy}];
  const w = level.widthTiles, h = level.heightTiles;
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  if (ex < 0 || ey < 0 || ex >= w || ey >= h) return null;

  const visited = new Set();
  const queue = [{x: sx, y: sy, path: [{x: sx, y: sy}]}];
  visited.add(sy * w + sx);
  const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]; // 8-directional
  let explored = 0;

  while (queue.length > 0 && explored < 600) {
    const cur = queue.shift();
    explored++;
    for (const [ddx, ddy] of dirs) {
      const nx = cur.x + ddx, ny = cur.y + ddy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const key = ny * w + nx;
      if (visited.has(key)) continue;
      if (isSolid(nx, ny)) continue;
      // For diagonal moves, check that both adjacent cardinal tiles are clear
      if (ddx !== 0 && ddy !== 0) {
        if (isSolid(cur.x + ddx, cur.y) || isSolid(cur.x, cur.y + ddy)) continue;
      }
      visited.add(key);
      const newPath = [...cur.path, {x: nx, y: ny}];
      if (nx === ex && ny === ey) return newPath;
      // Also accept adjacent to target (close enough)
      if (Math.abs(nx - ex) <= 1 && Math.abs(ny - ey) <= 1) return newPath;
      queue.push({x: nx, y: ny, path: newPath});
    }
  }
  return null; // no path found within budget
}

function updateMobs() {
  if (contactCooldown > 0) contactCooldown--;
  if (phaseTimer > 0) phaseTimer--;

  // Mob separation — push mobs apart so they don't stack
  for (let i = 0; i < mobs.length; i++) {
    const a = mobs[i];
    if (a.hp <= 0) continue;
    for (let j = i + 1; j < mobs.length; j++) {
      const b = mobs[j];
      if (b.hp <= 0) continue;
      const sdx = a.x - b.x, sdy = a.y - b.y;
      const sDist = Math.sqrt(sdx * sdx + sdy * sdy);
      const minSep = 36;
      if (sDist < minSep && sDist > 0.1) {
        const push = (minSep - sDist) * 0.45;
        const px = (sdx / sDist) * push, py = (sdy / sDist) * push;
        // Only push if destination is clear of walls
        if (positionClear(a.x + px, a.y + py)) { a.x += px; a.y += py; }
        if (positionClear(b.x - px, b.y - py)) { b.x -= px; b.y -= py; }
      }
    }
  }

  for (const m of mobs) {
    if (m.hp <= 0) continue;
    if (m.boneSwing > 0) m.boneSwing--;
    // Tick all status effects (stagger, stun, frost, burn)
    const fxResult = StatusFX.tickMob(m);
    if (fxResult.skip) continue; // staggered or stunned — skip movement
    // Test dummy — skip movement but still allow contact damage
    if (!m._testDummy) {

    // Chase player with flanking AI
    const dx = player.x - m.x;
    const dy = player.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      // Shooters stop chasing when in range
      const inShootRange = m.shootRange > 0 && dist < m.shootRange;
      
      if (!inShootRange) {
        // Smart targeting — each mob type has unique trapping behavior
        let targetX = player.x;
        let targetY = player.y;
        const mapCenterX = (level.widthTiles * TILE) / 2;
        const mapCenterY = (level.heightTiles * TILE) / 2;
        const playerToCenterDist = Math.sqrt((player.x - mapCenterX) ** 2 + (player.y - mapCenterY) ** 2);
        const mobToCenterDist = Math.sqrt((m.x - mapCenterX) ** 2 + (m.y - mapCenterY) ** 2);
        const amBetween = mobToCenterDist < playerToCenterDist && dist < playerToCenterDist;

        // Crowding detection — count nearby allies
        let nearbyCount = 0;
        const crowdRadius = 55;
        for (const other of mobs) {
          if (other === m || other.hp <= 0) continue;
          const cdx = m.x - other.x, cdy = m.y - other.y;
          if (cdx * cdx + cdy * cdy < crowdRadius * crowdRadius) nearbyCount++;
        }
        const isCrowded = nearbyCount >= 2;

        // MOB AI dispatch — registry-based movement targeting
        const aiCtx = { player, dist, dx, dy, targetX, targetY, playerVelX, playerVelY, mapCenterX, mapCenterY, amBetween, isCrowded, mobs };
        if (isCrowded && !CROWD_EXEMPT_TYPES.has(m.type) && dist > 60) {
          ({ targetX, targetY } = MOB_AI.crowded(m, aiCtx));
        } else if (MOB_AI[m.type]) {
          ({ targetX, targetY } = MOB_AI[m.type](m, aiCtx));
        }

        const tdx = targetX - m.x;
        const tdy = targetY - m.y;
        const tDist = Math.sqrt(tdx * tdx + tdy * tdy);
        const ndx = tDist > 0 ? tdx / tDist : 0;
        const ndy = tDist > 0 ? tdy / tDist : 0;

        // Dynamic speed cap — base speed only, boots should NOT make mobs faster
        const pSpd = player.baseSpeed || 3.5;
        const maxSpd = m.type === "runner" ? pSpd * 1.1 : pSpd * 0.85;
        let effSpeed = Math.min(m.speed, maxSpd);
        
        // Apply status effect speed multiplier (frost slow etc.)
        effSpeed *= fxResult.speedMult;

        // === BFS PATHFINDING ===
        // Check if direct line to target is clear (raycast through tiles)
        const myTX = Math.floor(m.x / TILE), myTY = Math.floor(m.y / TILE);
        const tgtTX = Math.floor(targetX / TILE), tgtTY = Math.floor(targetY / TILE);
        let usePathfinding = false;

        // Quick line-of-sight check: sample tiles along the line
        if (dist > TILE) {
          const steps = Math.ceil(dist / TILE);
          for (let s = 1; s < steps; s++) {
            const t = s / steps;
            const cx = Math.floor((m.x + tdx * t) / TILE);
            const cy = Math.floor((m.y + tdy * t) / TILE);
            if (isSolid(cx, cy)) { usePathfinding = true; break; }
          }
        }

        let moveX, moveY;

        if (usePathfinding) {
          // BFS from mob tile to target tile — cached per mob, refresh every 10 frames
          // Refresh immediately if mob is near a wall (within 2 tiles)
          const nearWall = isSolid(myTX-1, myTY) || isSolid(myTX+1, myTY) || 
                           isSolid(myTX, myTY-1) || isSolid(myTX, myTY+1);
          const maxAge = nearWall ? 5 : 12;
          if (!m._pathCache || !m._pathAge || m._pathAge++ > maxAge ||
              m._pathTargetTX !== tgtTX || m._pathTargetTY !== tgtTY) {
            m._pathCache = bfsPath(myTX, myTY, tgtTX, tgtTY);
            m._pathAge = 0;
            m._pathTargetTX = tgtTX;
            m._pathTargetTY = tgtTY;
          }

          const path = m._pathCache;
          if (path && path.length > 1) {
            // Follow next waypoint (skip first which is current tile)
            const wp = path[1];
            const wpX = wp.x * TILE + TILE / 2;
            const wpY = wp.y * TILE + TILE / 2;
            const wdx = wpX - m.x, wdy = wpY - m.y;
            const wDist = Math.sqrt(wdx * wdx + wdy * wdy) || 1;
            moveX = (wdx / wDist) * effSpeed;
            moveY = (wdy / wDist) * effSpeed;
          } else {
            // No path found or already at target — move direct
            moveX = ndx * effSpeed;
            moveY = ndy * effSpeed;
          }
        } else {
          // Clear line of sight — go straight
          moveX = ndx * effSpeed;
          moveY = ndy * effSpeed;
          m._pathCache = null;
        }

      // Update facing direction based on target (not movement)
      if (Math.abs(dx) > Math.abs(dy)) {
        m.dir = dx > 0 ? 3 : 2;
      } else {
        m.dir = dy > 0 ? 0 : 1;
      }

      // Apply movement with AABB tile collision + sliding
      const mhw = 14;
      const nx = m.x + moveX;
      const ny = m.y + moveY;
      let movedX = false, movedY = false;

      // Try X
      let cL = Math.floor((nx - mhw) / TILE), cR = Math.floor((nx + mhw) / TILE);
      let rT = Math.floor((m.y - mhw) / TILE), rB = Math.floor((m.y + mhw) / TILE);
      if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
        m.x = nx; movedX = true;
      }
      // Try Y
      cL = Math.floor((m.x - mhw) / TILE); cR = Math.floor((m.x + mhw) / TILE);
      rT = Math.floor((ny - mhw) / TILE); rB = Math.floor((ny + mhw) / TILE);
      if (!isSolid(cL, rT) && !isSolid(cR, rT) && !isSolid(cL, rB) && !isSolid(cR, rB)) {
        m.y = ny; movedY = true;
      }

      // If blocked on one axis, try to slide along the other with reduced speed
      if (!movedX && movedY) {
        // Slide along Y — try small X nudge to unstick from corner
        const nudge = moveX > 0 ? -1.5 : 1.5;
        if (positionClear(m.x + nudge, m.y)) m.x += nudge;
      }
      if (movedX && !movedY) {
        const nudge = moveY > 0 ? -1.5 : 1.5;
        if (positionClear(m.x, m.y + nudge)) m.y += nudge;
      }

      // If fully stuck on both axes, try sliding along walls smoothly
      if (!movedX && !movedY) {
        // Try each axis independently at half speed
        const halfX = moveX * 0.5, halfY = moveY * 0.5;
        const hxL = Math.floor((m.x + halfX - mhw) / TILE), hxR = Math.floor((m.x + halfX + mhw) / TILE);
        const hyT = Math.floor((m.y - mhw) / TILE), hyB = Math.floor((m.y + mhw) / TILE);
        if (!isSolid(hxL, hyT) && !isSolid(hxR, hyT) && !isSolid(hxL, hyB) && !isSolid(hxR, hyB)) {
          m.x += halfX;
        } else {
          const hyL = Math.floor((m.x - mhw) / TILE), hyR = Math.floor((m.x + mhw) / TILE);
          const hyT2 = Math.floor((m.y + halfY - mhw) / TILE), hyB2 = Math.floor((m.y + halfY + mhw) / TILE);
          if (!isSolid(hyL, hyT2) && !isSolid(hyR, hyT2) && !isSolid(hyL, hyB2) && !isSolid(hyR, hyB2)) {
            m.y += halfY;
          }
        }
      }

      // SMOOTH WALL REPULSION: if mob is overlapping a wall, gently push out
      if (!positionClear(m.x, m.y)) {
        // Find push direction: check which side has open space and push that way
        const pushStr = 2.5; // smooth push speed per frame
        let pushX = 0, pushY = 0;
        // Sample 8 directions to find where open space is
        for (let a = 0; a < 8; a++) {
          const ang = a * Math.PI / 4;
          const testX = m.x + Math.cos(ang) * TILE;
          const testY = m.y + Math.sin(ang) * TILE;
          if (positionClear(testX, testY)) {
            pushX += Math.cos(ang);
            pushY += Math.sin(ang);
          }
        }
        const pLen = Math.sqrt(pushX * pushX + pushY * pushY);
        if (pLen > 0) {
          const newX = m.x + (pushX / pLen) * pushStr;
          const newY = m.y + (pushY / pLen) * pushStr;
          m.x = newX;
          m.y = newY;
        } else {
          // Completely stuck — find nearest clear tile center as last resort
          const mtx = Math.floor(m.x / TILE), mty = Math.floor(m.y / TILE);
          for (let r = 1; r <= 3; r++) {
            let found = false;
            for (let dy2 = -r; dy2 <= r && !found; dy2++) {
              for (let dx2 = -r; dx2 <= r && !found; dx2++) {
                if (Math.abs(dx2) !== r && Math.abs(dy2) !== r) continue;
                if (!isSolid(mtx + dx2, mty + dy2)) {
                  m.x = (mtx + dx2) * TILE + TILE / 2;
                  m.y = (mty + dy2) * TILE + TILE / 2;
                  found = true;
                }
              }
            }
            if (found) break;
          }
        }
        m._pathCache = null;
      }

      // Animate
      m.frame = (m.frame + 0.08) % 4;
      } else {
        // Shooter in range — face player but don't move
        if (Math.abs(dx) > Math.abs(dy)) {
          m.dir = dx > 0 ? 3 : 2;
        } else {
          m.dir = dy > 0 ? 0 : 1;
        }
      }
    }

    // Shooter ranged attack
    if (m.shootRange > 0 && dist < m.shootRange * 1.2) {
      if (m.shootTimer > 0) {
        m.shootTimer--;
      } else {
        m.shootTimer = m.shootRate;
        // Fire bullet at player
        const ndx = dx / dist;
        const ndy = dy / dist;
        bullets.push({
          id: nextBulletId++,
          x: m.x,
          y: m.y - 10,
          vx: ndx * m.bulletSpeed,
          vy: ndy * m.bulletSpeed,
          fromPlayer: false,
          mobBullet: true,
          damage: m.damage,
          ownerId: m.id,
        });
      }
    }

    // MOB SPECIALS dispatch — registry-based special attacks
    if (MOB_SPECIALS[m.type]) {
      const specCtx = { dist, dx, dy, player, mobs, hitEffects, bullets, wave, playerDead };
      const specResult = MOB_SPECIALS[m.type](m, specCtx);
      if (specResult.skip) continue;
    }

    } // end if (!m._testDummy) movement block

    // Contact damage to player
    if (m.attackCooldown > 0) { m.attackCooldown--; continue; }
    const hitDx = player.x - m.x;
    const hitDy = (player.y - 20) - (m.y - 20);
    const hitDist = Math.sqrt(hitDx * hitDx + hitDy * hitDy);

    if (hitDist < m.contactRange && contactCooldown <= 0) {
      try {
      // Dodge check (boots)
      const dodgeCh = getDodgeChance();
      if (dodgeCh > 0 && Math.random() < dodgeCh) {
        contactCooldown = 30;
        m.attackCooldown = 60;
        // Shadow step — next melee is guaranteed crit (T3+ boots)
        if (playerEquip.boots && (playerEquip.boots.special === 'shadowstep' || playerEquip.boots.special === 'phase')) {
          shadowStepActive = true;
        }
        // Phase — pass through mobs briefly (T4 boots)
        if (playerEquip.boots && playerEquip.boots.special === 'phase') {
          phaseTimer = 45;
        }
      } else {
          // Normal damage
          const dmgTaken = dealDamageToPlayer(m.damage, "contact", m);
          contactCooldown = 30;
          m.attackCooldown = 60;
          if (m.type === "skeleton") m.boneSwing = 20;
          hitEffects.push({ x: player.x, y: player.y - 20, life: 25, type: "hit", dmg: dmgTaken });
      }
      } catch(e) { console.error("ARMOR DODGE ERROR:", e); }
    }
  }

  // === BODY BLOCKING: solid collision between all entities ===
  const MOB_RADIUS = 36;
  const MOB_MIN_DIST = MOB_RADIUS * 2;
  const PLAYER_RADIUS = 36;
  const hw2 = POS_HW;

  // Helper: clamp entity out of walls after being pushed
  function clampOutOfWalls(entity) {
    if (positionClear(entity.x, entity.y)) return;
    // Try small nudges first (smooth) before larger teleports
    for (let dist = 2; dist <= TILE * 2; dist += 2) {
      for (let a = 0; a < 8; a++) {
        const ang = a * Math.PI / 4;
        const nx = entity.x + Math.cos(ang) * dist;
        const ny = entity.y + Math.sin(ang) * dist;
        if (positionClear(nx, ny)) { entity.x = nx; entity.y = ny; return; }
      }
    }
    // Last resort: nearest open tile center
    const tx = Math.floor(entity.x / TILE), ty = Math.floor(entity.y / TILE);
    for (let r = 1; r <= 5; r++) {
      for (let dy2 = -r; dy2 <= r; dy2++) {
        for (let dx2 = -r; dx2 <= r; dx2++) {
          if (Math.abs(dx2) !== r && Math.abs(dy2) !== r) continue;
          if (!isSolid(tx + dx2, ty + dy2)) {
            entity.x = (tx + dx2) * TILE + TILE / 2;
            entity.y = (ty + dy2) * TILE + TILE / 2;
            return;
          }
        }
      }
    }
  }
  
  for (let i = 0; i < mobs.length; i++) {
    if (mobs[i].hp <= 0) continue;
    // Mob-to-mob separation
    for (let j = i + 1; j < mobs.length; j++) {
      if (mobs[j].hp <= 0) continue;
      const dx = mobs[j].x - mobs[i].x;
      const dy = mobs[j].y - mobs[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOB_MIN_DIST && dist > 0.1) {
        const overlap = (MOB_MIN_DIST - dist) / 2;
        const nx = dx / dist;
        const ny = dy / dist;
        const niX = mobs[i].x - nx * overlap;
        const niY = mobs[i].y - ny * overlap;
        const njX = mobs[j].x + nx * overlap;
        const njY = mobs[j].y + ny * overlap;
        if (positionClear(niX, niY)) { mobs[i].x = niX; mobs[i].y = niY; }
        if (positionClear(njX, njY)) { mobs[j].x = njX; mobs[j].y = njY; }
      } else if (dist <= 0.1) {
        // Exact overlap — push apart but only to clear positions
        const randAngle = Math.random() * Math.PI * 2;
        const pushDist = MOB_MIN_DIST * 0.6;
        // Try multiple angles if first fails
        for (let at = 0; at < 8; at++) {
          const a = randAngle + at * Math.PI / 4;
          const newX = mobs[j].x + Math.cos(a) * pushDist;
          const newY = mobs[j].y + Math.sin(a) * pushDist;
          if (positionClear(newX, newY)) { mobs[j].x = newX; mobs[j].y = newY; break; }
        }
      }
    }
    // Mob-to-player: push both apart but NEVER push player into walls
    if (phaseTimer > 0) continue; // phasing — skip mob-player collision
    const pdx = mobs[i].x - player.x;
    const pdy = mobs[i].y - player.y;
    const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
    const PLAYER_MOB_MIN = PLAYER_RADIUS + MOB_RADIUS;
    if (pdist < PLAYER_MOB_MIN && pdist > 0.1) {
      const overlap = PLAYER_MOB_MIN - pdist;
      const nx2 = pdx / pdist;
      const ny2 = pdy / pdist;
      // Try pushing player
      const newPX = player.x - nx2 * overlap * 0.3;
      const newPY = player.y - ny2 * overlap * 0.3;
      // Push mob more (70% mob, 30% player)
      const newMX = mobs[i].x + nx2 * overlap * 0.7;
      const newMY = mobs[i].y + ny2 * overlap * 0.7;
      if (positionClear(newPX, newPY)) {
        player.x = newPX;
        player.y = newPY;
      }
      if (positionClear(newMX, newMY)) {
        mobs[i].x = newMX;
        mobs[i].y = newMY;
      } else {
        // Wall behind mob — try pushing along wall instead
        // Try perpendicular directions to slide along the wall
        const perpX = mobs[i].x + ny2 * overlap;
        const perpY = mobs[i].y - nx2 * overlap;
        if (positionClear(perpX, perpY)) {
          mobs[i].x = perpX; mobs[i].y = perpY;
        } else {
          const perpX2 = mobs[i].x - ny2 * overlap;
          const perpY2 = mobs[i].y + nx2 * overlap;
          if (positionClear(perpX2, perpY2)) {
            mobs[i].x = perpX2; mobs[i].y = perpY2;
          }
        }
      }
    }
  }

  // Unstick any mobs that ended up in walls
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    if (!positionClear(m.x, m.y)) clampOutOfWalls(m);
  }

  // Safety: if player somehow ended up inside a wall, push them out
  if (!positionClear(player.x, player.y)) {
    for (let r = 1; r <= 5; r++) {
      for (const [ndx, ndy] of [[r*TILE,0],[-r*TILE,0],[0,r*TILE],[0,-r*TILE],[r*TILE,r*TILE],[-r*TILE,-r*TILE]]) {
        if (positionClear(player.x + ndx, player.y + ndy)) {
          player.x += ndx; player.y += ndy;
          r = 99; break;
        }
      }
    }
  }

  // Remove dead mobs — spawn death effects first, track deaths for phase system
  const deadPhases = [];
  for (const m of mobs) {
    if (m.hp <= 0 && !m._deathProcessed) {
      m._deathProcessed = true;
      spawnDeathEffect(m);
      deadPhases.push(m.phase || 1);
    }
  }
  mobs = mobs.filter(m => m.hp > 0);
  // Check phase advancement for each death
  for (const dp of deadPhases) {
    checkPhaseAdvance(dp);
  }

  // Remove bullets/arrows from dead mobs
  const aliveMobIds = new Set(mobs.map(m => m.id));
  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (b.mobBullet && b.ownerId !== undefined && !aliveMobIds.has(b.ownerId)) {
      bullets.splice(bi, 1);
    }
  }

  // Check wave cleared
  // Wave system — dungeon only
  if (Scene.inDungeon) {
  if (waveState === "active" && mobs.length === 0) {
    waveState = "cleared";
    waveTimer = window._opMode ? 36000 : 1800; // 10 min in OP, 30s normal
    // Clear ALL lingering effects — clean slate for safe phase
    StatusFX.clearPoison();
    bullets.length = 0;
    hitEffects.length = 0;
    deathEffects.length = 0;
    mobParticles.length = 0;
    // Full heal on wave clear
    const healAmt = player.maxHp - player.hp;
    if (healAmt > 0) {
      player.hp = player.maxHp;
      hitEffects.push({ x: player.x, y: player.y - 30, life: 20, type: "heal", dmg: "FULL HEAL" });
    }
    // +2 potions on wave clear
    potion.count += 2;
    hitEffects.push({ x: player.x, y: player.y - 50, life: 25, maxLife: 25, type: "heal", dmg: "+2 Potions" });
    // Check if floor is complete
    if (wave >= WAVES_PER_FLOOR && !stairsOpen) {
      if (dungeonFloor < MAX_FLOORS) {
        stairsOpen = true;
        hitEffects.push({ x: player.x, y: player.y - 70, life: 40, maxLife: 40, type: "heal", dmg: "STAIRCASE OPENED!" });
      } else {
        // Dungeon complete! Open exit staircase
        stairsOpen = true;
        dungeonComplete = true;
        victoryTimer = 0;
        hitEffects.push({ x: player.x, y: player.y - 70, life: 80, maxLife: 80, type: "heal", dmg: "🏆 DUNGEON COMPLETE!" });
      }
    }
    Events.emit('wave_cleared', { wave, floor: dungeonFloor, stairsOpen, dungeonComplete });
  }
  if (waveState === "cleared") {
    waveTimer--;
    // Chest armor regen during cleared phase (1 HP/s = every 60 frames)
    const regenRate = getChestRegen();
    if (regenRate > 0 && waveTimer % 60 === 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + regenRate);
    }
    // Only spawn next wave if floor not complete
    if (waveTimer <= 0 && !stairsOpen) { spawnWave(); }
    // Increment victory celebration timer
    if (dungeonComplete) victoryTimer++;
  }
  if (waveState === "waiting") {
    waveTimer++;
    if (waveTimer > (window._opMode ? 36000 : 1800)) { spawnWave(); } // 30 seconds before first wave
  }
  } // end dungeon wave check
}

