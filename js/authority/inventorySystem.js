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

// Find inventory item by ID (returns item object or null)
function findInventoryItemById(id) {
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && inventory[i].id === id) return inventory[i];
  }
  return null;
}

// Remove item from inventory slot
function removeFromInventory(slot) {
  const item = inventory[slot];
  inventory.splice(slot, 1);
  return item;
}

// Centralized stat application — single source of truth for equipping items
// All equip/shop/chest paths call this instead of setting stats directly.
function applyGunStats(data) {
  playerEquip.gun = data;
  gun.damage = data.damage || GUN_DEFAULTS.damage;
  gun.magSize = data.magSize || 12;
  gun.ammo = data.neverReload ? Infinity : (data.magSize || 12);
  gun.fireCooldownMax = data.fireRate || 10;
  gun.special = data.special || null;
  // Extended fields for main guns
  gun.reloading = false;
  gun.reloadTimer = 0;
}

// Create a main gun item from gunData.js definitions at a given level
function createMainGun(gunId, level) {
  if (typeof MAIN_GUNS === 'undefined' || !MAIN_GUNS[gunId]) return null;
  const stats = getGunStatsAtLevel(gunId, level);
  if (!stats) return null;
  const def = MAIN_GUNS[gunId];
  return {
    id: gunId,
    name: def.name + ' Lv.' + level,
    type: 'gun',
    tier: 0, // main guns use level instead of tier
    data: stats,
    stackable: false,
    count: 1,
    mainGunLevel: level, // track level for upgrading
  };
}

function applyMeleeStats(data) {
  playerEquip.melee = data;
  melee.damage = data.damage || MELEE_DEFAULTS.damage;
  melee.range = data.range || DEFAULT_MELEE.range;
  melee.cooldownMax = data.cooldown || DEFAULT_MELEE.cooldown;
  melee.critChance = data.critChance || MELEE_DEFAULTS.critChance;
  melee.special = data.special || null;
}

function applyDefaultGun() {
  applyGunStats(DEFAULT_GUN);
  gun.special = null;
}

function applyDefaultMelee() {
  applyMeleeStats(DEFAULT_MELEE);
  melee.special = null;
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
      applyDefaultGun();
    } else if (eqType === 'melee') {
      applyDefaultMelee();
    } else {
      playerEquip[eqType] = null;
      if (eqType === 'chest') recalcMaxHp();
    }
    return;
  }

  // Equip this item (replaces whatever is in that slot)
  if (eqType === 'gun') {
    applyGunStats(item.data);
    gun.ammo = Math.min(gun.ammo, gun.magSize);
  } else if (eqType === 'melee') {
    applyMeleeStats(item.data);
  } else {
    playerEquip[eqType] = item.data;
    if (eqType === 'chest') recalcMaxHp();
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
      applyDefaultGun();
    } else if (eqType === 'melee') {
      applyDefaultMelee();
    } else {
      playerEquip[eqType] = null;
    }
    return true;
  }
  return false; // inventory full
}

// getTierColor, getTierName → js/shared/itemData.js

// potion → js/authority/gameState.js

// Wave scaling, composition, spawning, phase system → js/authority/waveSystem.js
// (getMobCountForWave, getWaveHPMultiplier, getWaveSpeedMultiplier,
//  getMobDamageMultiplier, capMobSpeed, getWaveComposition, pickFromWeighted,
//  getSpawnPos, spawnWave, spawnPhase, checkPhaseAdvance, nextMobId, waveTheme,
//  playerVelX, playerVelY)

// Mob movement, AI, pathfinding, body blocking → js/authority/mobSystem.js
// (POS_HW, positionClear, bfsPath, updateMobs)

