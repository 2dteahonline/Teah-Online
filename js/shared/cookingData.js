// ===================== COOKING DATA =====================
// Shared data: cooking shops, ingredients, recipes, customer types
// V1 — Street Deli only. Shops 2-5 defined for future use.

// ===================== SHOP DEFINITIONS =====================
const COOKING_SHOPS = {
  street_deli:       { id: 'street_deli',       name: 'Street Deli',        tier: 1, levelReq: 1,  ordersReq: 0,     costReq: 0,      maxOrderBase: 20,  levelId: 'deli_01' },
  diner:             { id: 'diner',             name: 'Diner',              tier: 2, levelReq: 10, ordersReq: 500,   costReq: 5000,   maxOrderBase: 35,  levelId: 'diner_01' },
  fine_dining:       { id: 'fine_dining',       name: 'Fine Dining',        tier: 3, levelReq: 20, ordersReq: 2000,  costReq: 25000,  maxOrderBase: 75,  levelId: null },
  luxury:            { id: 'luxury',            name: 'Luxury Restaurant',  tier: 4, levelReq: 35, ordersReq: 5000,  costReq: 100000, maxOrderBase: 100, levelId: null },
  five_star:         { id: 'five_star',         name: '5 Star Elite',       tier: 5, levelReq: 50, ordersReq: 10000, costReq: 500000, maxOrderBase: 150, levelId: null },
};

// ===================== INGREDIENTS =====================
// Each ingredient: id, name, color (for rendering), station it comes from
const DELI_INGREDIENTS = {
  bread:    { id: 'bread',    name: 'Bread',    color: '#c8a050', entity: 'ing_bread' },
  bagel:    { id: 'bagel',    name: 'Bagel',    color: '#d4a840', entity: 'ing_bagel' },
  turkey:   { id: 'turkey',   name: 'Turkey',   color: '#d4a080', entity: 'ing_turkey' },
  chicken:  { id: 'chicken',  name: 'Chicken',  color: '#e0b870', entity: 'ing_chicken' },
  ham:      { id: 'ham',      name: 'Ham',      color: '#e08080', entity: 'ing_ham' },
  salami:   { id: 'salami',   name: 'Salami',   color: '#c04040', entity: 'ing_salami' },
  lettuce:  { id: 'lettuce',  name: 'Lettuce',  color: '#60c040', entity: 'ing_lettuce' },
  tomato:   { id: 'tomato',   name: 'Tomato',   color: '#e04040', entity: 'ing_tomato' },
  cheese:   { id: 'cheese',   name: 'Cheese',   color: '#f0d040', entity: 'ing_cheese' },
  onion:    { id: 'onion',    name: 'Onion',    color: '#d0b0d0', entity: 'ing_onion' },
  mayo:     { id: 'mayo',     name: 'Mayo',     color: '#f0f0d0', entity: 'ing_mayo' },
  ketchup:  { id: 'ketchup',  name: 'Ketchup',  color: '#d02020', entity: 'ing_ketchup' },
  mustard:  { id: 'mustard',  name: 'Mustard',  color: '#d0c020', entity: 'ing_mustard' },
  ranch:    { id: 'ranch',    name: 'Ranch',    color: '#e8e8d0', entity: 'ing_ranch' },
};

// Reverse lookup: entity type -> ingredient id
const ENTITY_TO_INGREDIENT = {};
for (const [id, data] of Object.entries(DELI_INGREDIENTS)) {
  ENTITY_TO_INGREDIENT[data.entity] = id;
}

// ===================== RECIPES =====================
// Each recipe: id, name, required ingredients (ordered list), base pay, base XP, difficulty
const DELI_RECIPES = [
  { id: 'classic_sub',    name: 'Classic Sub',     ingredients: ['bread', 'turkey', 'lettuce', 'tomato', 'mayo'],                    basePay: 12, baseXP: 15, difficulty: 1 },
  { id: 'ham_cheese',     name: 'Ham & Cheese',    ingredients: ['bread', 'ham', 'cheese', 'mustard'],                               basePay: 10, baseXP: 12, difficulty: 1 },
  { id: 'italian_sub',    name: 'Italian Sub',     ingredients: ['bread', 'salami', 'ham', 'cheese', 'lettuce', 'onion', 'mayo'],    basePay: 18, baseXP: 25, difficulty: 2 },
  { id: 'veggie_delight', name: 'Veggie Delight',  ingredients: ['bread', 'lettuce', 'tomato', 'onion', 'cheese', 'ranch'],          basePay: 14, baseXP: 18, difficulty: 1 },
  { id: 'turkey_club',    name: 'Turkey Club',     ingredients: ['bread', 'turkey', 'ham', 'lettuce', 'tomato', 'mayo'],             basePay: 16, baseXP: 22, difficulty: 2 },
  { id: 'bagel_classic',  name: 'Bagel Classic',   ingredients: ['bagel', 'turkey', 'cheese', 'lettuce', 'mayo'],                    basePay: 14, baseXP: 18, difficulty: 1 },
  { id: 'salami_special', name: 'Salami Special',  ingredients: ['bread', 'salami', 'cheese', 'tomato', 'onion', 'ketchup', 'mustard'], basePay: 20, baseXP: 30, difficulty: 3 },
  { id: 'ranch_wrap',     name: 'Ranch Wrap',      ingredients: ['bread', 'turkey', 'lettuce', 'tomato', 'cheese', 'onion', 'ranch'], basePay: 18, baseXP: 25, difficulty: 2 },
  { id: 'chicken_classic', name: 'Chicken Classic', ingredients: ['bread', 'chicken', 'lettuce', 'tomato', 'mayo'],                      basePay: 14, baseXP: 18, difficulty: 1 },
  { id: 'chicken_ranch',   name: 'Chicken Ranch',   ingredients: ['bread', 'chicken', 'cheese', 'lettuce', 'onion', 'ranch'],            basePay: 18, baseXP: 25, difficulty: 2 },
  { id: 'chicken_deluxe',  name: 'Chicken Deluxe',  ingredients: ['bagel', 'chicken', 'ham', 'cheese', 'lettuce', 'tomato', 'mayo', 'mustard'], basePay: 22, baseXP: 32, difficulty: 3 },
];

// ===================== CUSTOMER TYPES =====================
// tipMultiplier: multiplies final tip amount
// moodSpeed: multiplier for mood decay speed (>1 = faster decay = more impatient)
// patience: multiplier for mood thresholds (>1 = more patient)
const CUSTOMER_TYPES = {
  regular:   { id: 'regular',   name: 'Regular',   tipMultiplier: 1.0, moodSpeed: 0.7, patience: 1.2, color: '#80a0c0', weight: 0.55 },
  generous:  { id: 'generous',  name: 'Generous',  tipMultiplier: 1.8, moodSpeed: 0.5, patience: 1.5, color: '#60c060', weight: 0.30 },
  impatient: { id: 'impatient', name: 'Impatient', tipMultiplier: 0.6, moodSpeed: 1.0, patience: 0.9, color: '#e06040', weight: 0.15 },
};

// ===================== MOOD STAGES =====================
// baseFrames: frames at 60fps before mood shifts (scaled by customer patience)
const MOOD_STAGES = [
  { id: 'patient',   label: 'Patient',   icon: '😊', color: '#60c060', baseFrames: 3600 },  // 60 seconds
  { id: 'concerned', label: 'Concerned', icon: '😐', color: '#e0c040', baseFrames: 2400 },  // +40 seconds
  { id: 'furious',   label: 'Furious',   icon: '😡', color: '#e04040', baseFrames: 3000 },  // +50 seconds → leaves
];

// ===================== GRADE THRESHOLDS =====================
// Time thresholds are much more forgiving — S just means "done while patient"
const COOKING_GRADES = {
  S: { minQuality: 1.0, minTime: 0.5, payMult: 1.0, tipMult: 1.5, xpMult: 2.0, label: 'S', color: '#ffd700' },
  A: { minQuality: 0.85, minTime: 0.3, payMult: 0.9, tipMult: 1.3, xpMult: 1.5, label: 'A', color: '#60c060' },
  B: { minQuality: 0.6, minTime: 0.15, payMult: 0.75, tipMult: 1.0, xpMult: 1.0, label: 'B', color: '#80a0e0' },
  C: { minQuality: 0.4, minTime: 0.0, payMult: 0.5,  tipMult: 0.5, xpMult: 0.5, label: 'C', color: '#c0c0c0' },
  F: { minQuality: 0.0, minTime: 0.0, payMult: 0.25, tipMult: 0.0, xpMult: 0.25, label: 'F', color: '#e04040' },
};

// ===================== COOKING CONFIG =====================
const COOKING_CONFIG = {
  shiftDuration: 18000,    // 5 minutes at 60fps
  orderSpawnDelay: 180,    // 3 seconds between orders (more breathing room)
  comboThreshold: 3,       // perfect orders needed for combo bonus (easier)
  comboTipBonus: 0.2,      // +20% tip per combo level
  comboMaxBonus: 1.0,      // max +100% tip from combos
  rushStartAfter: 15,      // orders before rush hour kicks in (later)
  rushMoodSpeedMult: 1.15, // mood decays 15% faster during rush (gentler)
  rushOrderDelayMult: 0.75, // orders come 25% faster during rush (gentler)
};

// ===================== SPATULA WEAPON =====================
const SPATULA_WEAPON = { id: 'spatula', name: 'Spatula', tier: 0, damage: 1, range: 80, cooldown: 20, critChance: 0, color: '#c0c0c0', special: 'spatula' };

// ===================== HELPERS =====================

// Pick a random customer type (weighted)
function pickCustomerType() {
  const types = Object.values(CUSTOMER_TYPES);
  let totalWeight = 0;
  for (const t of types) totalWeight += t.weight;
  let r = Math.random() * totalWeight;
  for (const t of types) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return types[0];
}

// Pick a random recipe from the deli
function pickDeliRecipe() {
  return DELI_RECIPES[Math.floor(Math.random() * DELI_RECIPES.length)];
}

// ===================== DINER INGREDIENTS =====================
const DINER_INGREDIENTS = {
  // Breakfast
  eggs:           { id: 'eggs',           name: 'Eggs',           color: '#f0e060', entity: 'ding_eggs' },
  bacon:          { id: 'bacon',          name: 'Bacon',          color: '#c04030', entity: 'ding_bacon' },
  pancake_batter: { id: 'pancake_batter', name: 'Pancake Batter', color: '#d8c080', entity: 'ding_pancake_batter' },
  waffle_batter:  { id: 'waffle_batter',  name: 'Waffle Batter',  color: '#c8b060', entity: 'ding_waffle_batter' },
  hash_browns:    { id: 'hash_browns',    name: 'Hash Browns',    color: '#c0a040', entity: 'ding_hash_browns' },
  toast:          { id: 'toast',          name: 'Toast',          color: '#d0a850', entity: 'ding_toast' },
  butter:         { id: 'butter',         name: 'Butter',         color: '#f0e0a0', entity: 'ding_butter' },
  syrup:          { id: 'syrup',          name: 'Syrup',          color: '#a06020', entity: 'ding_syrup' },
  // Lunch
  burger_patty:   { id: 'burger_patty',   name: 'Burger Patty',   color: '#804020', entity: 'ding_burger_patty' },
  bun:            { id: 'bun',            name: 'Bun',            color: '#d0a850', entity: 'ding_bun' },
  fries:          { id: 'fries',          name: 'Fries',          color: '#e0c040', entity: 'ding_fries' },
  hot_dog:        { id: 'hot_dog',        name: 'Hot Dog',        color: '#d06040', entity: 'ding_hot_dog' },
  d_cheese:       { id: 'd_cheese',       name: 'Cheese',         color: '#f0d040', entity: 'ding_cheese' },
  d_lettuce:      { id: 'd_lettuce',      name: 'Lettuce',        color: '#60c040', entity: 'ding_lettuce' },
  d_tomato:       { id: 'd_tomato',       name: 'Tomato',         color: '#e04040', entity: 'ding_tomato' },
  d_onion:        { id: 'd_onion',        name: 'Onion',          color: '#d0b0d0', entity: 'ding_onion' },
  // Drinks
  milkshake_base: { id: 'milkshake_base', name: 'Milkshake Base', color: '#f0c0d0', entity: 'ding_milkshake_base' },
  coffee:         { id: 'coffee',         name: 'Coffee',         color: '#6a4020', entity: 'ding_coffee' },
};

// Reverse lookup: diner entity type -> ingredient id
const DINER_ENTITY_TO_INGREDIENT = {};
for (const [id, data] of Object.entries(DINER_INGREDIENTS)) {
  DINER_ENTITY_TO_INGREDIENT[data.entity] = id;
}

// ===================== DINER RECIPES =====================
const DINER_RECIPES = [
  // Breakfast
  { id: 'pancakes',       name: 'Pancakes',        ingredients: ['pancake_batter', 'butter', 'syrup'],                                basePay: 18, baseXP: 22, difficulty: 1 },
  { id: 'waffles',        name: 'Waffles',         ingredients: ['waffle_batter', 'butter', 'syrup'],                                 basePay: 18, baseXP: 22, difficulty: 1 },
  { id: 'eggs_bacon',     name: 'Eggs & Bacon',    ingredients: ['eggs', 'bacon', 'toast'],                                           basePay: 16, baseXP: 20, difficulty: 1 },
  { id: 'hash_plate',     name: 'Hash Brown Plate', ingredients: ['hash_browns', 'eggs', 'd_cheese'],                                 basePay: 16, baseXP: 20, difficulty: 1 },
  { id: 'full_breakfast',  name: 'Full Breakfast',   ingredients: ['eggs', 'bacon', 'hash_browns', 'toast', 'butter'],                 basePay: 28, baseXP: 38, difficulty: 3 },
  { id: 'toast_eggs',     name: 'Toast & Eggs',    ingredients: ['toast', 'eggs', 'butter'],                                          basePay: 14, baseXP: 18, difficulty: 1 },
  // Lunch
  { id: 'classic_burger', name: 'Classic Burger',   ingredients: ['burger_patty', 'bun', 'd_lettuce', 'd_tomato'],                    basePay: 20, baseXP: 25, difficulty: 1 },
  { id: 'cheeseburger',   name: 'Cheeseburger',     ingredients: ['burger_patty', 'bun', 'd_cheese', 'd_lettuce', 'd_tomato'],        basePay: 24, baseXP: 30, difficulty: 2 },
  { id: 'hot_dog_meal',   name: 'Hot Dog',          ingredients: ['hot_dog', 'bun', 'd_onion'],                                       basePay: 16, baseXP: 20, difficulty: 1 },
  { id: 'fries_plate',    name: 'Fries',            ingredients: ['fries'],                                                            basePay: 10, baseXP: 12, difficulty: 1 },
  { id: 'milkshake',      name: 'Milkshake',        ingredients: ['milkshake_base'],                                                   basePay: 12, baseXP: 15, difficulty: 1 },
  { id: 'coffee_cup',     name: 'Coffee',           ingredients: ['coffee'],                                                           basePay: 10, baseXP: 12, difficulty: 1 },
];

// ===================== DINER CUSTOMER TYPES =====================
const DINER_CUSTOMER_TYPES = {
  regular:  { type: 'regular',  partySize: [1, 2], tipMult: 1.0, moodSpeed: 0.7, patience: 1.2, weight: 0.35 },
  family:   { type: 'family',   partySize: [2, 3], tipMult: 1.2, moodSpeed: 0.5, patience: 1.5, weight: 0.25 },
  couple:   { type: 'couple',   partySize: [2, 2], tipMult: 1.3, moodSpeed: 0.6, patience: 1.3, weight: 0.15 },
  business: { type: 'business', partySize: [1, 1], tipMult: 1.5, moodSpeed: 0.9, patience: 1.0, weight: 0.15 },
  kids:     { type: 'kids',     partySize: [2, 3], tipMult: 0.8, moodSpeed: 1.0, patience: 0.9, weight: 0.10 },
};

function pickDinerCustomerType() {
  const types = Object.values(DINER_CUSTOMER_TYPES);
  let totalWeight = 0;
  for (const t of types) totalWeight += t.weight;
  let r = Math.random() * totalWeight;
  for (const t of types) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return types[0];
}

function pickDinerRecipe() {
  return DINER_RECIPES[Math.floor(Math.random() * DINER_RECIPES.length)];
}
