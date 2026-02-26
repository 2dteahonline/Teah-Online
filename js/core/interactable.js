// ===================== INTERACTABLE & UPGRADE SYSTEMS =====================
// Core: interactable objects, upgrade station logic
// Extracted from index_2.html — Phase E

// ===================== INTERACTABLE SYSTEM =====================
// Generic system for anything the player can interact with via E key
// Each interactable: { id, x, y, range, label, type, canInteract(), onInteract(), onLeaveRange() }
const interactables = [];

function registerInteractable(def) {
  interactables.push(def);
  return def;
}

function getNearestInteractable() {
  let best = null, bestDist = Infinity;
  for (const obj of interactables) {
    if (obj.canInteract && !obj.canInteract()) continue;
    const dx = player.x - obj.x, dy = player.y - obj.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < obj.range && dist < bestDist) {
      best = obj; bestDist = dist;
    }
  }
  return best;
}

function isNearInteractable(id) {
  for (const obj of interactables) {
    if (obj.id !== id) continue;
    const dx = player.x - obj.x, dy = player.y - obj.y;
    return Math.sqrt(dx * dx + dy * dy) < obj.range;
  }
  return false;
}

// ===================== UPGRADE STATION =====================
const station = {
  x: 20 * TILE + TILE / 2,
  y: 16 * TILE + TILE / 2,  // 4 tiles north of spawn
  radius: 40,
  interactRange: 220,
};

// Register shop station as an interactable (only active in dungeon floors)
registerInteractable({
  id: 'shop_station',
  get x() { return station.x; },
  get y() { return station.y; },
  get range() { return station.interactRange; },
  get label() { return '[' + getKeyDisplayName(keybinds.interact) + '] Shop'; },
  type: 'shop',
  canInteract() { return Scene.inDungeon && waveState !== 'active'; },
  onInteract() { UI.open('shop'); },
});

// Legacy compatibility
function isNearStation() {
  return isNearInteractable('shop_station');
}
// Shop managed by UI Panel Manager

// Register fish vendor interactable (lobby only, near the dock)
registerInteractable({
  id: 'fish_vendor',
  get x() { return 23 * TILE + TILE; },   // center of 2x2 entity at tx:23
  get y() { return 40 * TILE + TILE; },   // center of 2x2 entity at ty:40
  range: 120,
  get label() { return '[' + getKeyDisplayName(keybinds.interact) + '] Fish Vendor'; },
  type: 'fishVendor',
  canInteract() { return Scene.inLobby && !fishingState.active; },
  onInteract() { UI.open('fishVendor'); },
});

// Register farm vendor interactable (farm/house only)
registerInteractable({
  id: 'farm_vendor',
  get x() { return 30 * TILE + TILE; },   // center of 2x2 entity at tx:30
  get y() { return 21 * TILE + TILE; },   // center of 2x2 entity at ty:21
  range: 120,
  get label() { return '[' + getKeyDisplayName(keybinds.interact) + '] Farm Shop'; },
  type: 'farmVendor',
  canInteract() { return Scene.inFarm; },
  onInteract() { UI.open('farmVendor'); },
});

let fireRateBonus = 0;
const GUN_DEFAULTS = { damage: 20 };
const MELEE_DEFAULTS = { damage: 15, critChance: 0.10 };

// Default starter weapons (tier 0 — weaker than T1 shop items)
const DEFAULT_GUN = { id: 'pistol', name: 'Pistol', tier: 0, damage: 20, fireRate: 10, magSize: 30, color: '#6a6a6a', desc: '20 dmg · 30 mag · starter weapon', waveReq: 0, cost: 0 };
const CT_X_GUN = { id: 'ct_x', name: 'CT-X', tier: 0, damage: 20, fireRate: 10, magSize: 30, color: '#3a5a3a', desc: '20 dmg · 30 mag · heavy freeze on shoot', waveReq: 0, cost: 0, freezePenalty: 0.15 };
const DEFAULT_MELEE = { id: 'knife', name: 'Knife', tier: 0, damage: 15, range: 90, cooldown: 28, critChance: 0.10, color: '#7a7a7a', desc: '15 dmg · short range · starter blade', waveReq: 0, cost: 0, special: null };
const DEFAULT_PICKAXE = { id: 'pickaxe', name: 'Pickaxe', tier: 0, damage: 10, range: 70, cooldown: 32, critChance: 0, color: '#8a6a3a', desc: '10 dmg · mining tool · equip to mine ores', waveReq: 0, cost: 0, special: 'pickaxe' };

// === PICKAXE TIERS ===
// Each tier is a full melee weapon definition + mining-specific fields.
// miningSpeed: multiplier for mining tick rate (higher = faster mining)
// unlockedAfterOre: ore id that must be mined to unlock this tier (null = starter)
// To add a new pickaxe: add entry here. Mining system reads miningSpeed automatically.
// Rendering: characterSprite.js uses `isPickaxe` flag from configs registry.
const PICKAXE_TIERS = [
  { id: 'pickaxe',          name: 'Pickaxe',          tier: 0, damage: 10, range: 70, cooldown: 32, critChance: 0, miningSpeed: 1.0,  color: '#8a6a3a', special: 'pickaxe', unlockedAfterOre: null },
  { id: 'copper_pickaxe',   name: 'Copper Pickaxe',   tier: 1, damage: 14, range: 70, cooldown: 30, critChance: 0, miningSpeed: 1.15, color: '#b87333', special: 'pickaxe', unlockedAfterOre: 'coal' },
  { id: 'iron_pickaxe',     name: 'Iron Pickaxe',     tier: 2, damage: 18, range: 70, cooldown: 28, critChance: 0, miningSpeed: 1.3,  color: '#8a8a8a', special: 'pickaxe', unlockedAfterOre: 'iron' },
  { id: 'gold_pickaxe',     name: 'Gold Pickaxe',     tier: 3, damage: 22, range: 75, cooldown: 26, critChance: 0, miningSpeed: 1.5,  color: '#ffd700', special: 'pickaxe', unlockedAfterOre: 'gold' },
  { id: 'amethyst_pickaxe', name: 'Amethyst Pickaxe', tier: 4, damage: 26, range: 75, cooldown: 24, critChance: 0, miningSpeed: 1.7,  color: '#9b59b6', special: 'pickaxe', unlockedAfterOre: 'amethyst' },
  { id: 'ruby_pickaxe',     name: 'Ruby Pickaxe',     tier: 5, damage: 30, range: 80, cooldown: 22, critChance: 0, miningSpeed: 1.9,  color: '#e74c3c', special: 'pickaxe', unlockedAfterOre: 'ruby' },
  { id: 'diamond_pickaxe',  name: 'Diamond Pickaxe',  tier: 6, damage: 35, range: 80, cooldown: 20, critChance: 0, miningSpeed: 2.1,  color: '#85c1e9', special: 'pickaxe', unlockedAfterOre: 'diamond' },
  { id: 'emerald_pickaxe',  name: 'Emerald Pickaxe',  tier: 7, damage: 40, range: 85, cooldown: 18, critChance: 0, miningSpeed: 2.4,  color: '#2ecc71', special: 'pickaxe', unlockedAfterOre: 'emerald' },
];

// === EQUIPMENT TIERS ===
const ARMOR_TIERS = [
  { id: 'cloth_vest',   name: 'Cloth Vest',   tier: 1, dmgReduce: 0.08, color: '#8a7a60', desc: '-8% damage taken' },
  { id: 'kevlar_vest',  name: 'Kevlar Vest',  tier: 2, dmgReduce: 0.16, color: '#4a6a5a', desc: '-16% damage taken' },
  { id: 'heavy_armor',  name: 'Heavy Armor',  tier: 3, dmgReduce: 0.25, color: '#3a4a6a', desc: '-25% damage taken' },
];

// === 4-SLOT ARMOR SYSTEM (4 tiers, wave-gated by GLOBAL wave) ===
const BOOTS_TIERS = [
  { id: 'leather_boots',  name: 'Leather Boots',  tier: 1, speedBonus: 0.5, color: '#8a6a40', desc: '+0.5 speed', waveReq: 1, cost: 15 },
  { id: 'swift_boots',    name: 'Swift Boots',    tier: 2, speedBonus: 1.25, dodgeChance: 0.15, color: '#4a7a5a', desc: '+1.25 speed · 15% dodge', waveReq: 10, cost: 60 },
  { id: 'shadow_boots',   name: 'Shadow Boots',   tier: 3, speedBonus: 1.5, dodgeChance: 0.20, color: '#3a3a6a', desc: '+1.5 speed · 20% dodge · Shadow Step', waveReq: 20, cost: 280, special: 'shadowstep' },
  { id: 'phantom_boots',  name: 'Phantom Boots',  tier: 4, speedBonus: 1.75, dodgeChance: 0.25, color: '#2a7a8a', desc: '+1.75 speed · 25% dodge + phase', waveReq: 30, cost: 550, special: 'phase' },
];
const PANTS_TIERS = [
  { id: 'padded_pants',    name: 'Padded Pants',    tier: 1, dmgReduce: 0.10, projReduce: 0, color: '#7a6a50', desc: '-10% damage', waveReq: 1, cost: 20 },
  { id: 'chain_leggings',  name: 'Chain Leggings',  tier: 2, dmgReduce: 0.20, projReduce: 0.30, color: '#5a6a6a', desc: '-20% dmg · -30% projectile/AOE', waveReq: 10, cost: 70 },
  { id: 'plate_greaves',   name: 'Plate Greaves',   tier: 3, dmgReduce: 0.25, projReduce: 0.35, thorns: 0.25, color: '#4a4a7a', desc: '-25% dmg · -35% proj · thorns 25%', waveReq: 20, cost: 320, special: 'thorns' },
  { id: 'titan_guards',    name: 'Titan Guards',    tier: 4, dmgReduce: 0.30, projReduce: 0.50, thorns: 0.40, stagger: 0.3, color: '#6a5a20', desc: '-30% dmg · -50% proj · thorns 40% + stagger', waveReq: 30, cost: 620, special: 'stagger' },
];
const CHEST_TIERS = [
  { id: 'chain_mail',      name: 'Chain Mail',      tier: 1, dmgReduce: 0.05, hpBonus: 25, color: '#6a6a6a', desc: '+25 HP · -5% dmg', waveReq: 1, cost: 25 },
  { id: 'plate_armor',     name: 'Plate Armor',     tier: 2, dmgReduce: 0.10, hpBonus: 100, healBoost: 0.15, color: '#5a6a7a', desc: '+100 HP · -10% dmg · +15% heals', waveReq: 10, cost: 90 },
  { id: 'dragon_plate',    name: 'Dragon Plate',    tier: 3, dmgReduce: 0.15, hpBonus: 150, healBoost: 0.12, regen: 1.5, color: '#7a4a3a', desc: '+150 HP · -15% dmg · regen 1.5/s', waveReq: 20, cost: 400, special: 'regen' },
  { id: 'eternal_aegis',   name: 'Eternal Aegis',   tier: 4, dmgReduce: 0.20, hpBonus: 200, healBoost: 0.12, regen: 2, revive: true, color: '#aa6a20', desc: '+200 HP · -20% dmg · auto-revive', waveReq: 30, cost: 800, special: 'revive' },
];
const HELMET_TIERS = [
  { id: 'leather_cap',     name: 'Leather Cap',     tier: 1, poisonReduce: 0.50, statusReduce: 0.15, color: '#8a7a5a', desc: '-50% poison · -15% status', waveReq: 1, cost: 20 },
  { id: 'iron_helm',       name: 'Iron Helm',       tier: 2, poisonReduce: 0.75, statusReduce: 0.35, color: '#6a6a7a', desc: '-75% poison · -35% status effects', waveReq: 10, cost: 75 },
  { id: 'warden_helm',     name: 'Warden Helm',     tier: 3, poisonReduce: 0.85, statusReduce: 0.55, color: '#5a6a5a', desc: '-85% poison · -55% status effects', waveReq: 20, cost: 340, special: null },
  { id: 'void_crown',      name: 'Void Crown',      tier: 4, poisonReduce: 1.00, statusReduce: 0.80, absorb: 0.10, color: '#4a2a6a', desc: 'Poison immune · -80% status · absorb 10%', waveReq: 30, cost: 700, special: 'absorb' },
];
const GUN_TIERS = [
  { id: 'smg',            name: 'SMG',             tier: 1, damage: 38,  fireRate: 3,  magSize: 45, color: '#4a4a4a', desc: '38 dmg · 45 mag · bullet hose', waveReq: 1, cost: 40 },
  { id: 'rifle',          name: 'Rifle',           tier: 2, damage: 92, fireRate: 6, magSize: 36, color: '#4a3a2a', desc: '92 dmg · 36 mag · hard hitter', waveReq: 10, cost: 120 },
  { id: 'frost_rifle',    name: 'Frost Rifle',     tier: 3, damage: 122, fireRate: 4,  magSize: 50, color: '#44aacc', desc: '122 dmg · 50 mag · Frost Slow + Frost Nova on Kill', waveReq: 20, cost: 480, special: 'frost' },
  { id: 'inferno_cannon', name: 'Inferno Cannon',  tier: 4, damage: 169, fireRate: 3,  magSize: 63, color: '#cc4422', desc: '169 dmg · 63 mag · Burn DOT + Chain Explosions', waveReq: 30, cost: 900, special: 'burn' },
];
const MELEE_TIERS = [
  { id: 'sword',       name: 'Sword',        tier: 1, damage: 30,  range: 120, cooldown: 22, critChance: 0.20, color: '#8a8a9a', desc: '30 dmg · Fast swing', waveReq: 1, cost: 30, special: null },
  { id: 'ninja_katanas', name: 'Ninja Katanas', tier: 2, damage: 53, range: 130, cooldown: 18, critChance: 0.30, color: '#2a2a3a', desc: '53 dmg · Shift=3x Dash · 30% crit', waveReq: 10, cost: 100, special: 'ninja' },
  { id: 'storm_blade', name: 'Storm Blade',  tier: 3, damage: 145,  range: 135, cooldown: 20, critChance: 0.25, color: '#4488dd', desc: '145 dmg · Shockwave + Chain Lightning + Lifesteal', waveReq: 20, cost: 440, special: 'storm' },
  { id: 'war_cleaver', name: 'War Cleaver',  tier: 4, damage: 175, range: 150, cooldown: 22, critChance: 0.50, color: '#cc4444', desc: '175 dmg · Cleave ALL · Piercing Blood · 50% crit · Shrine', waveReq: 30, cost: 850, special: 'cleave' },
];

// playerEquip → js/authority/gameState.js

// Combined damage reduction from all armor
function getArmorReduction() {
  let r = 0;
  if (playerEquip.pants) r += playerEquip.pants.dmgReduce;
  if (playerEquip.chest) r += playerEquip.chest.dmgReduce;
  return Math.min(0.50, r); // cap at 50%
}

// Combined HP bonus from armor
function getArmorHPBonus() {
  return playerEquip.chest ? playerEquip.chest.hpBonus : 0;
}

// Speed bonus from boots
function getBootsSpeedBonus() {
  return playerEquip.boots ? playerEquip.boots.speedBonus : 0;
}

// Effect duration reduction from helmet
function getEffectReduction() {
  // Legacy — now uses poison/status reduce
  return getPoisonReduction();
}

function getPoisonReduction() {
  return playerEquip.helmet && playerEquip.helmet.poisonReduce ? playerEquip.helmet.poisonReduce : 0;
}

function getStatusReduction() {
  return playerEquip.helmet && playerEquip.helmet.statusReduce ? playerEquip.helmet.statusReduce : 0;
}

function getAbsorb() {
  return playerEquip.helmet && playerEquip.helmet.absorb ? playerEquip.helmet.absorb : 0;
}

// Dodge chance from boots
function getDodgeChance() {
  return playerEquip.boots && playerEquip.boots.dodgeChance ? playerEquip.boots.dodgeChance : 0;
}

// Knockback reduction from pants
function getProjReduction() {
  return playerEquip.pants && playerEquip.pants.projReduce ? playerEquip.pants.projReduce : 0;
}

// Thorns damage multiplier from pants
function getThorns() {
  return playerEquip.pants && playerEquip.pants.thorns ? playerEquip.pants.thorns : 0;
}

// Stagger duration from pants (seconds)
function getStagger() {
  return playerEquip.pants && playerEquip.pants.stagger ? playerEquip.pants.stagger : 0;
}

// Heal effectiveness boost from chest
function getHealBoost() {
  return playerEquip.chest && playerEquip.chest.healBoost ? playerEquip.chest.healBoost : 0;
}

// HP regen per second from chest (during cleared phase)
function getChestRegen() {
  return playerEquip.chest && playerEquip.chest.regen ? playerEquip.chest.regen : 0;
}

// Has auto-revive
function hasRevive() {
  return playerEquip.chest && playerEquip.chest.revive ? true : false;
}
let reviveUsed = false; // once per dungeon run
let shadowStepActive = false; // next melee = guaranteed crit after dodge
let phaseTimer = 0; // frames of phase-through-mobs after dodge (T4 boots)

// Centralized death check — handles auto-revive from chest armor
function checkPlayerDeath() {
  if (player.hp > 0 || playerDead) return;
  if (hasRevive() && !reviveUsed) {
    reviveUsed = true;
    player.hp = Math.round(player.maxHp * 0.30);
    hitEffects.push({ x: player.x, y: player.y - 35, life: 35, maxLife: 35, type: "heal", dmg: "REVIVE!" });
    hitEffects.push({ x: player.x, y: player.y, life: 25, type: "shockwave" });
    contactCooldown = 90;
  } else {
    lives--;
    playerDead = true;
    deathTimer = DEATH_ANIM_FRAMES;
    respawnTimer = RESPAWN_COUNTDOWN;
    deathX = player.x;
    deathY = player.y;
    deathRotation = 0;
    deathGameOver = (lives <= 0);
    Events.emit('player_died', { lives, gameOver: deathGameOver, x: deathX, y: deathY });
  }
}

// Set bonus — minimum tier across all 4 equipped slots (0 if any slot empty)
function getArmorSetTier() {
  const b = playerEquip.boots, p = playerEquip.pants, c = playerEquip.chest, h = playerEquip.helmet;
  if (!b || !p || !c || !h) return 0;
  return Math.min(b.tier, p.tier, c.tier, h.tier);
}

// Recalculate max HP when chest armor changes
function recalcMaxHp() {
  const floorBaseHP = { 1: 100, 2: 125, 3: 150, 4: 200, 5: 250 };
  const baseHp = floorBaseHP[dungeonFloor] || 100;
  const bonus = getArmorHPBonus();
  const oldMax = player.maxHp || 100;
  player.maxHp = baseHp + bonus;
  // Scale current HP proportionally
  if (player.maxHp > oldMax) {
    player.hp += (player.maxHp - oldMax);
  } else if (player.hp > player.maxHp) {
    player.hp = player.maxHp;
  }
}

// Roll chances: remaining % = "nothing" 
const ROLL_CHANCES = { 1: 0.20, 2: 0.10, 3: 0.05 }; // 65% = nothing

// === POPULATE STARTER INVENTORY ===
(function() {
  addToInventory(createItem('gun', DEFAULT_GUN));
  addToInventory(createItem('gun', CT_X_GUN));
  addToInventory(createItem('melee', DEFAULT_MELEE));
  addToInventory(createItem('melee', DEFAULT_PICKAXE));
  // Starter fishing rod — create with durability tracking
  const starterRod = { ...ROD_TIERS[0], currentDurability: ROD_TIERS[0].durability };
  addToInventory(createItem('melee', starterRod));
  // Starter farming hoe
  const starterHoe = { ...HOE_TIERS[0], currentDurability: HOE_TIERS[0].durability };
  addToInventory(createItem('melee', starterHoe));
  addToInventory(createConsumable('potion', 'Health Potion', 3));
  playerEquip.gun = DEFAULT_GUN;
  playerEquip.melee = DEFAULT_MELEE;
})();

function rollChest(type) {
  const tiers = type === 'armor' ? ARMOR_TIERS : type === 'gun' ? GUN_TIERS : MELEE_TIERS;
  const current = playerEquip[type];
  const currentTier = current ? current.tier : 0;

  // All 3 tiers maxed
  if (currentTier >= 3) return { success: false, msg: 'MAX TIER', item: null };

  const roll = Math.random();
  // Try highest tier first
  let cumulative = 0;
  for (let i = tiers.length - 1; i >= 0; i--) {
    const t = tiers[i];
    cumulative += ROLL_CHANCES[t.tier];
    if (roll < cumulative) {
      // Won this tier — only equip if it's BETTER than current
      if (t.tier <= currentTier) {
        return { success: false, msg: 'ALREADY HAVE T' + currentTier, item: t, downgrade: true };
      }
      // Apply stats via centralized helpers
      if (type === 'gun') {
        applyGunStats(t);
      } else if (type === 'melee') {
        applyMeleeStats(t);
      } else {
        playerEquip[type] = t;
      }
      return { success: true, msg: t.name, item: t };
    }
  }
  return { success: false, msg: 'NOTHING', item: null };
}

const ROLL_SPIN_TIME = 90; // legacy, unused

// ---- Shop runtime state (mutable) ----
// Separated from static SHOP_ITEMS definitions so resets are robust.
// Tracks per-buff purchase counts; reset on dungeon re-entry via _resetShopPrices().
const shopState = {
  buffsBought: [0, 0, 0, 0, 0], // one counter per Buffs item (indexed 0-4)
};

let lifestealPerKill = 25;
let shopCategory = 0;
const SHOP_CATEGORIES = ["Buffs", "Guns", "Melees", "Boots", "Pants", "Chest", "Helmets"];

const SHOP_ITEMS = {
  Buffs: [
    { name: "Gun Damage +3", desc: "Permanent boost", baseCost: 15, priceIncrease: 8,
      get bought() { return shopState.buffsBought[0]; }, set bought(v) { shopState.buffsBought[0] = v; },
      get cost() { return this.baseCost + shopState.buffsBought[0] * this.priceIncrease; },
      action: () => { gun.damage += 3; return true; }
    },
    { name: "Melee Damage +3", desc: "Permanent boost", baseCost: 15, priceIncrease: 9,
      get bought() { return shopState.buffsBought[1]; }, set bought(v) { shopState.buffsBought[1] = v; },
      get cost() { return this.baseCost + shopState.buffsBought[1] * this.priceIncrease; },
      action: () => { melee.damage += 3; return true; }
    },
    { name: "Melee Speed +", desc: "Faster swing", baseCost: 20, priceIncrease: 11, maxBuy: 6,
      get bought() { return shopState.buffsBought[2]; }, set bought(v) { shopState.buffsBought[2] = v; },
      get cost() { return this.baseCost + shopState.buffsBought[2] * this.priceIncrease; },
      action() { if (shopState.buffsBought[2] >= this.maxBuy) return false; melee.cooldownMax = Math.max(10, melee.cooldownMax - 2); return true; }
    },
    { name: "Health Potion", desc: "+1 Potion", baseCost: 15, priceIncrease: 4,
      get bought() { return shopState.buffsBought[3]; }, set bought(v) { shopState.buffsBought[3] = v; },
      get cost() { return this.baseCost + shopState.buffsBought[3] * this.priceIncrease; },
      action: () => { potion.count++; addToInventory(createConsumable('potion', 'Health Potion', 1)); return true; }
    },
    { name: "Lifesteal +5", desc: "+5 HP per kill", baseCost: 10, priceIncrease: 4, maxBuy: 10,
      get bought() { return shopState.buffsBought[4]; }, set bought(v) { shopState.buffsBought[4] = v; },
      get cost() { return this.baseCost + shopState.buffsBought[4] * this.priceIncrease; },
      action() { if (shopState.buffsBought[4] >= this.maxBuy) return false; lifestealPerKill += 5; return true; }
    },
  ],
  Guns: GUN_TIERS.map((g, idx) => ({
    name: g.name, desc: g.desc, tier: g.tier, equipData: g,
    get cost() { return this.equipData.cost; },
    get isOwned() { return isInInventory(this.equipData.id) || (playerEquip.gun && playerEquip.gun.id === this.equipData.id); },
    get isLocked() {
      if (!window._opMode && ((dungeonFloor - 1) * WAVES_PER_FLOOR + wave) < this.equipData.waveReq) return 'wave';
      if (this.equipData.tier > 1) {
        const prevTier = GUN_TIERS.find(t => t.tier === this.equipData.tier - 1);
        if (!window._opMode && prevTier && !isInInventory(prevTier.id) && (!playerEquip.gun || playerEquip.gun.tier < prevTier.tier)) return 'prev';
      }
      return false;
    },
    action() {
      if (this.isOwned || this.isLocked) return false;
      const invItem = createItem('gun', this.equipData);
      if (!addToInventory(invItem)) return false; // inventory full
      applyGunStats(this.equipData);
      return true;
    }
  })),
  Melees: MELEE_TIERS.map((m, idx) => ({
    name: m.name, desc: m.desc, tier: m.tier, equipData: m,
    get cost() { return this.equipData.cost; },
    get isOwned() { return isInInventory(this.equipData.id) || (playerEquip.melee && playerEquip.melee.id === this.equipData.id); },
    get isLocked() {
      if (!window._opMode && ((dungeonFloor - 1) * WAVES_PER_FLOOR + wave) < this.equipData.waveReq) return 'wave';
      if (this.equipData.tier > 1) {
        const prevTier = MELEE_TIERS.find(t => t.tier === this.equipData.tier - 1);
        if (!window._opMode && prevTier && !isInInventory(prevTier.id) && (!playerEquip.melee || playerEquip.melee.tier < prevTier.tier)) return 'prev';
      }
      return false;
    },
    action() {
      if (this.isOwned || this.isLocked) return false;
      const invItem = createItem('melee', this.equipData);
      if (!addToInventory(invItem)) return false; // inventory full
      applyMeleeStats(this.equipData);
      return true;
    }
  })),
  Boots: BOOTS_TIERS.map(b => ({
    name: b.name, desc: b.desc, tier: b.tier, equipData: b,
    get cost() { return this.equipData.cost; },
    get isOwned() { return isInInventory(this.equipData.id) || (playerEquip.boots && playerEquip.boots.id === this.equipData.id); },
    get isLocked() {
      if (!window._opMode && ((dungeonFloor - 1) * WAVES_PER_FLOOR + wave) < this.equipData.waveReq) return 'wave';
      if (this.equipData.tier > 1) {
        const prevTier = BOOTS_TIERS.find(t => t.tier === this.equipData.tier - 1);
        if (!window._opMode && prevTier && !isInInventory(prevTier.id) && (!playerEquip.boots || playerEquip.boots.tier < prevTier.tier)) return 'prev';
      }
      return false;
    },
    action() {
      if (this.isOwned || this.isLocked) return false;
      if (!addToInventory(createItem('boots', this.equipData))) return false;
      playerEquip.boots = this.equipData;
      return true;
    }
  })),
  Pants: PANTS_TIERS.map(p => ({
    name: p.name, desc: p.desc, tier: p.tier, equipData: p,
    get cost() { return this.equipData.cost; },
    get isOwned() { return isInInventory(this.equipData.id) || (playerEquip.pants && playerEquip.pants.id === this.equipData.id); },
    get isLocked() {
      if (!window._opMode && ((dungeonFloor - 1) * WAVES_PER_FLOOR + wave) < this.equipData.waveReq) return 'wave';
      if (this.equipData.tier > 1) {
        const prevTier = PANTS_TIERS.find(t => t.tier === this.equipData.tier - 1);
        if (!window._opMode && prevTier && !isInInventory(prevTier.id) && (!playerEquip.pants || playerEquip.pants.tier < prevTier.tier)) return 'prev';
      }
      return false;
    },
    action() {
      if (this.isOwned || this.isLocked) return false;
      if (!addToInventory(createItem('pants', this.equipData))) return false;
      playerEquip.pants = this.equipData;
      return true;
    }
  })),
  Chest: CHEST_TIERS.map(c => ({
    name: c.name, desc: c.desc, tier: c.tier, equipData: c,
    get cost() { return this.equipData.cost; },
    get isOwned() { return isInInventory(this.equipData.id) || (playerEquip.chest && playerEquip.chest.id === this.equipData.id); },
    get isLocked() {
      if (!window._opMode && ((dungeonFloor - 1) * WAVES_PER_FLOOR + wave) < this.equipData.waveReq) return 'wave';
      if (this.equipData.tier > 1) {
        const prevTier = CHEST_TIERS.find(t => t.tier === this.equipData.tier - 1);
        if (!window._opMode && prevTier && !isInInventory(prevTier.id) && (!playerEquip.chest || playerEquip.chest.tier < prevTier.tier)) return 'prev';
      }
      return false;
    },
    action() {
      if (this.isOwned || this.isLocked) return false;
      if (!addToInventory(createItem('chest', this.equipData))) return false;
      playerEquip.chest = this.equipData;
      recalcMaxHp();
      return true;
    }
  })),
  Helmets: HELMET_TIERS.map(h => ({
    name: h.name, desc: h.desc, tier: h.tier, equipData: h,
    get cost() { return this.equipData.cost; },
    get isOwned() { return isInInventory(this.equipData.id) || (playerEquip.helmet && playerEquip.helmet.id === this.equipData.id); },
    get isLocked() {
      if (!window._opMode && ((dungeonFloor - 1) * WAVES_PER_FLOOR + wave) < this.equipData.waveReq) return 'wave';
      if (this.equipData.tier > 1) {
        const prevTier = HELMET_TIERS.find(t => t.tier === this.equipData.tier - 1);
        if (!window._opMode && prevTier && !isInInventory(prevTier.id) && (!playerEquip.helmet || playerEquip.helmet.tier < prevTier.tier)) return 'prev';
      }
      return false;
    },
    action() {
      if (this.isOwned || this.isLocked) return false;
      if (!addToInventory(createItem('helmet', this.equipData))) return false;
      playerEquip.helmet = this.equipData;
      return true;
    }
  })),
};

function getShopItems() { return SHOP_ITEMS[SHOP_CATEGORIES[shopCategory]] || []; }

window._resetShopPrices = () => {
  shopState.buffsBought.fill(0);
  lifestealPerKill = 25;
};
