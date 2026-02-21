// ===================== COOKING DATA =====================
// Shared data: cooking shops, ingredients, recipes, customer types
// V1 — Street Deli only. Shops 2-5 defined for future use.

// ===================== SHOP DEFINITIONS =====================
const COOKING_SHOPS = {
  street_deli:       { id: 'street_deli',       name: 'Street Deli',        tier: 1, levelReq: 1,  ordersReq: 0,     costReq: 0,      maxOrderBase: 20,  levelId: 'deli_01' },
  family_restaurant: { id: 'family_restaurant', name: 'Family Restaurant',  tier: 2, levelReq: 10, ordersReq: 500,   costReq: 5000,   maxOrderBase: 35,  levelId: null },
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
