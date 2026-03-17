// ===================== COOKING DATA =====================
// Shared data: cooking shops, ingredients, recipes, customer types
// V1 — Street Deli only. Shops 2-5 defined for future use.

// ===================== SHOP DEFINITIONS =====================
const COOKING_SHOPS = {
  street_deli:       { id: 'street_deli',       name: 'Street Deli',        tier: 1, levelReq: 1,  ordersReq: 0,     costReq: 0,      maxOrderBase: 20,  levelId: 'deli_01' },
  diner:             { id: 'diner',             name: 'Diner',              tier: 2, levelReq: 10, ordersReq: 500,   costReq: 5000,   maxOrderBase: 35,  levelId: 'diner_01' },
  fine_dining:       { id: 'fine_dining',       name: 'Fine Dining',        tier: 3, levelReq: 20, ordersReq: 2000,  costReq: 25000,  maxOrderBase: 75,  levelId: 'fine_dining_01' },
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
// tipMult: multiplies final tip amount
// moodSpeed: multiplier for mood decay speed (>1 = faster decay = more impatient)
// patience: multiplier for mood thresholds (>1 = more patient)
const CUSTOMER_TYPES = {
  regular:   { id: 'regular',   name: 'Regular',   tipMult: 1.0, moodSpeed: 0.7, patience: 1.2, color: '#80a0c0', weight: 0.55 },
  generous:  { id: 'generous',  name: 'Generous',  tipMult: 1.8, moodSpeed: 0.5, patience: 1.5, color: '#60c060', weight: 0.30 },
  impatient: { id: 'impatient', name: 'Impatient', tipMult: 0.6, moodSpeed: 1.0, patience: 0.9, color: '#e06040', weight: 0.15 },
};

// ===================== SERVICE TIMER TYPES =====================
// Per-restaurant timer types replace mood stages for duration.
// Timer assigned at order creation. Bar color interpolates green→yellow→red.
const DELI_TIMER_TYPES = {
  patient: { id: 'patient', label: 'Patient', duration: 3600, weight: 0.50 },  // 60s
  busy:    { id: 'busy',    label: 'Busy',    duration: 1800, weight: 0.35 },  // 30s
  urgent:  { id: 'urgent',  label: 'Urgent',  duration: 900,  weight: 0.15 },  // 15s
};

const DINER_TIMER_TYPES = {
  calm:   { id: 'calm',   label: 'Calm',   duration: 5400, weight: 0.40 },  // 90s
  feisty: { id: 'feisty', label: 'Feisty', duration: 3600, weight: 0.40 },  // 60s
  rowdy:  { id: 'rowdy',  label: 'Rowdy',  duration: 2700, weight: 0.20 },  // 45s
};

const FD_TIMER_TYPES = {
  calm:   { id: 'calm',   label: 'Calm',   duration: 3600, weight: 0.40 },  // 60s
  feisty: { id: 'feisty', label: 'Feisty', duration: 2700, weight: 0.35 },  // 45s
  rowdy:  { id: 'rowdy',  label: 'Rowdy',  duration: 1800, weight: 0.25 },  // 30s
};

function _pickTimerType(timerTypes) {
  const types = Object.values(timerTypes);
  let totalWeight = 0;
  for (const t of types) totalWeight += t.weight;
  let r = Math.random() * totalWeight;
  for (const t of types) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return types[0];
}

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
  orderSpawnDelay: 30,     // 0.5 seconds between orders (constant cooking)
  comboThreshold: 3,       // perfect orders needed for combo bonus (easier)
  comboTipBonus: 0.2,      // +20% tip per combo level
  comboMaxBonus: 1.0,      // max +100% tip from combos
  ticketQueueMax: 3,       // max pre-queued orders waiting
  ticketSpawnInterval: 60, // generate a ticket every 1 second (60 frames)
};

// Per-ingredient pay formula for deli (replaces static basePay)
function _calcDeliPay(recipe) {
  return 8 + (recipe.ingredients.length * 2);
}

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
  regular:  { type: 'regular',  name: 'Regular',  color: '#80a0c0', partySize: [1, 2], tipMult: 1.0, moodSpeed: 0.7, patience: 1.2, weight: 0.35 },
  family:   { type: 'family',   name: 'Family',   color: '#60c060', partySize: [2, 3], tipMult: 1.2, moodSpeed: 0.5, patience: 1.5, weight: 0.25 },
  couple:   { type: 'couple',   name: 'Couple',   color: '#e080a0', partySize: [2, 2], tipMult: 1.3, moodSpeed: 0.6, patience: 1.3, weight: 0.15 },
  business: { type: 'business', name: 'Business', color: '#a0a0d0', partySize: [1, 1], tipMult: 1.5, moodSpeed: 0.9, patience: 1.0, weight: 0.15 },
  kids:     { type: 'kids',     name: 'Kids',     color: '#e0c040', partySize: [2, 3], tipMult: 0.8, moodSpeed: 1.0, patience: 0.9, weight: 0.10 },
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

// ===================== DINER NAME POOL =====================
const DINER_NAME_POOL = [
  'John', 'Fred', 'Jenny', 'Maria', 'Dave', 'Sarah', 'Mike', 'Lisa',
  'Carlos', 'Amy', 'Jake', 'Emma', 'Tom', 'Mia', 'Ben', 'Zoe',
  'Nick', 'Kate', 'Ryan', 'Lily', 'Alex', 'Nora', 'Dan', 'Ruby',
  'Sam', 'Ella', 'Max', 'Gina', 'Leo', 'Ivy', 'Roy', 'Faye',
  'Joe', 'Tina', 'Ray', 'Beth', 'Tim', 'Dawn', 'Bob', 'Eva',
];

// ===================== FINE DINING INGREDIENTS =====================
const FINE_DINING_INGREDIENTS = {
  fd_steak:        { id: 'fd_steak',        name: 'Steak',        color: '#8a3020', entity: 'fding_steak' },
  fd_shrimp:       { id: 'fd_shrimp',       name: 'Shrimp',       color: '#ff9060', entity: 'fding_shrimp' },
  fd_chicken:      { id: 'fd_chicken',      name: 'Chicken',      color: '#e0b870', entity: 'fding_chicken' },
  fd_rice:         { id: 'fd_rice',         name: 'Rice',         color: '#f0e8d0', entity: 'fding_rice' },
  fd_onion:        { id: 'fd_onion',        name: 'Onion',        color: '#d0b0d0', entity: 'fding_onion' },
  fd_egg:          { id: 'fd_egg',          name: 'Egg',          color: '#f0e060', entity: 'fding_egg' },
  fd_mushroom:     { id: 'fd_mushroom',     name: 'Mushroom',     color: '#c0a080', entity: 'fding_mushroom' },
  fd_zucchini:     { id: 'fd_zucchini',     name: 'Zucchini',     color: '#40a040', entity: 'fding_zucchini' },
  fd_garlic_butter:{ id: 'fd_garlic_butter',name: 'Garlic Butter',color: '#f0e0a0', entity: 'fding_garlic_butter' },
  fd_soy_sauce:    { id: 'fd_soy_sauce',    name: 'Soy Sauce',    color: '#4a2a10', entity: 'fding_soy_sauce' },
  fd_sesame_oil:   { id: 'fd_sesame_oil',   name: 'Sesame Oil',   color: '#c0a040', entity: 'fding_sesame_oil' },
  fd_miso:         { id: 'fd_miso',         name: 'Miso',         color: '#b08040', entity: 'fding_miso' },
};

// Reverse lookup: fine dining entity type -> ingredient id
const FINE_DINING_ENTITY_TO_INGREDIENT = {};
for (const [id, data] of Object.entries(FINE_DINING_INGREDIENTS)) {
  FINE_DINING_ENTITY_TO_INGREDIENT[data.entity] = id;
}

// ===================== FINE DINING RECIPES =====================
// trickCount: number of trick prompts on the grill bar (3-6)
// trickDifficulty: 1-3, affects zone width and bar speed
const FINE_DINING_RECIPES = [
  { id: 'hibachi_steak',      name: 'Hibachi Steak',       ingredients: ['fd_steak', 'fd_onion', 'fd_garlic_butter', 'fd_soy_sauce'],                   basePay: 45, baseXP: 55, difficulty: 2, trickCount: 4, trickDifficulty: 2 },
  { id: 'shrimp_teppanyaki',  name: 'Shrimp Teppanyaki',   ingredients: ['fd_shrimp', 'fd_garlic_butter', 'fd_soy_sauce'],                              basePay: 40, baseXP: 50, difficulty: 1, trickCount: 3, trickDifficulty: 1 },
  { id: 'chicken_teriyaki',   name: 'Chicken Teriyaki',    ingredients: ['fd_chicken', 'fd_soy_sauce', 'fd_sesame_oil'],                                 basePay: 35, baseXP: 45, difficulty: 1, trickCount: 3, trickDifficulty: 1 },
  { id: 'volcano_fried_rice', name: 'Volcano Fried Rice',  ingredients: ['fd_rice', 'fd_egg', 'fd_onion', 'fd_soy_sauce', 'fd_sesame_oil'],              basePay: 50, baseXP: 65, difficulty: 2, trickCount: 5, trickDifficulty: 2 },
  { id: 'miso_salmon',        name: 'Miso Glazed Salmon',  ingredients: ['fd_shrimp', 'fd_miso', 'fd_garlic_butter', 'fd_sesame_oil'],                   basePay: 55, baseXP: 70, difficulty: 3, trickCount: 4, trickDifficulty: 3 },
  { id: 'garlic_mushrooms',   name: 'Garlic Butter Mushrooms', ingredients: ['fd_mushroom', 'fd_garlic_butter', 'fd_soy_sauce'],                        basePay: 30, baseXP: 40, difficulty: 1, trickCount: 3, trickDifficulty: 1 },
  { id: 'teppanyaki_combo',   name: 'Teppanyaki Combo Platter', ingredients: ['fd_steak', 'fd_shrimp', 'fd_chicken', 'fd_rice', 'fd_onion', 'fd_garlic_butter'], basePay: 60, baseXP: 80, difficulty: 3, trickCount: 6, trickDifficulty: 3 },
  { id: 'onion_volcano',      name: 'Onion Volcano Special', ingredients: ['fd_onion', 'fd_egg', 'fd_rice', 'fd_sesame_oil'],                           basePay: 40, baseXP: 50, difficulty: 2, trickCount: 4, trickDifficulty: 2 },
  { id: 'zucchini_steak',     name: 'Steak & Zucchini',    ingredients: ['fd_steak', 'fd_zucchini', 'fd_garlic_butter', 'fd_soy_sauce'],                 basePay: 48, baseXP: 60, difficulty: 2, trickCount: 4, trickDifficulty: 2 },
  { id: 'mushroom_rice',      name: 'Mushroom Fried Rice',  ingredients: ['fd_rice', 'fd_mushroom', 'fd_egg', 'fd_soy_sauce', 'fd_sesame_oil'],          basePay: 42, baseXP: 55, difficulty: 2, trickCount: 5, trickDifficulty: 2 },
];

// ===================== FINE DINING CUSTOMER TYPES =====================
const FINE_DINING_CUSTOMER_TYPES = {
  regular:   { type: 'regular',   name: 'Regular',  color: '#80a0c0', partySize: [1, 3], tipMult: 1.0, moodSpeed: 0.6, patience: 1.3, coverFee: 10, weight: 0.50 },
  vip:       { type: 'vip',       name: 'VIP',      color: '#ffd700', partySize: [1, 3], tipMult: 1.8, moodSpeed: 0.5, patience: 1.3, coverFee: 25, weight: 0.35 },
  critic:    { type: 'critic',    name: 'Critic',   color: '#e04040', partySize: [1, 2], tipMult: 2.0, moodSpeed: 0.7, patience: 1.0, coverFee: 40, weight: 0.15 },
};

function pickFineDiningCustomerType() {
  const types = Object.values(FINE_DINING_CUSTOMER_TYPES);
  let totalWeight = 0;
  for (const t of types) totalWeight += t.weight;
  let r = Math.random() * totalWeight;
  for (const t of types) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return types[0];
}

function pickFineDiningRecipe() {
  return FINE_DINING_RECIPES[Math.floor(Math.random() * FINE_DINING_RECIPES.length)];
}
