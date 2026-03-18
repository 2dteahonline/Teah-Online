// ===================== COOKING SYSTEM =====================
// Authority: continuous cooking loop, customer orders, grading, XP
// No shift timer — restaurants run continuously until the player leaves.
//
// Flow:
//   1. Player enters restaurant → startCookingSession() auto-starts
//   2. Customer spawns with random order + service timer
//   3. Player interacts with stations to assemble food
//   4. Player submits at pickup counter → gradeOrder()
//   5. Award gold + tip + Cooking XP
//   6. Next customer spawns
//   7. Session ends when player leaves the scene

// ===================== COOKING STATE =====================
const cookingState = {
  active: false,
  shopId: 'street_deli',
  activeRestaurantId: 'street_deli',
  ticket: null,  // multi-item ticket: { items: [{recipe, qty}], completedCount: 0 }
  orderSpawnDelay: 0,
  assembly: [],          // ingredients the player has added so far
  currentOrder: null,    // { id, recipe, customer, serviceTimer, serviceDuration, timerType, npcId, ... }
  comboCount: 0,
  comboMultiplier: 1.0,
  missedOrders: 0,       // count of missed/timed-out orders
  // Ticket queue — orders auto-generate on timer, independent of NPCs
  ticketQueue: [],       // pre-generated order tickets waiting to activate
  ticketSpawnTimer: 0,   // frames until next ticket generation
  counterOrders: [],     // completed orders waiting on pickup counter (deli)

  stats: {
    ordersCompleted: 0,
    perfectDishes: 0,
    totalEarned: 0,
    totalTips: 0,
    totalXP: 0,
    grades: { S: 0, A: 0, B: 0, C: 0, F: 0 },
  },
  // Last order result (for popup display)
  lastResult: null,
  lastResultTimer: 0,
  _swingHandled: false, // one-shot flag for melee station detection
};

// Unique ID counter for customers
let _cookingOrderId = 0;

// Multi-restaurant helpers
function _getActiveIngredients() {
  if (cookingState.activeRestaurantId === 'fine_dining') return typeof FINE_DINING_INGREDIENTS !== 'undefined' ? FINE_DINING_INGREDIENTS : {};
  if (cookingState.activeRestaurantId === 'diner') return typeof DINER_INGREDIENTS !== 'undefined' ? DINER_INGREDIENTS : {};
  return typeof DELI_INGREDIENTS !== 'undefined' ? DELI_INGREDIENTS : {};
}
function _getActiveEntityToIngredient() {
  if (cookingState.activeRestaurantId === 'fine_dining') return typeof FINE_DINING_ENTITY_TO_INGREDIENT !== 'undefined' ? FINE_DINING_ENTITY_TO_INGREDIENT : {};
  if (cookingState.activeRestaurantId === 'diner') return typeof DINER_ENTITY_TO_INGREDIENT !== 'undefined' ? DINER_ENTITY_TO_INGREDIENT : {};
  return typeof ENTITY_TO_INGREDIENT !== 'undefined' ? ENTITY_TO_INGREDIENT : {};
}
function _pickActiveRecipe() {
  if (cookingState.activeRestaurantId === 'fine_dining') return typeof pickFineDiningRecipe === 'function' ? pickFineDiningRecipe() : null;
  if (cookingState.activeRestaurantId === 'diner') return typeof pickDinerRecipe === 'function' ? pickDinerRecipe() : null;
  return typeof pickDeliRecipe === 'function' ? pickDeliRecipe() : null;
}
function _getActiveNPCs() {
  if (cookingState.activeRestaurantId === 'fine_dining') return typeof fineDiningNPCs !== 'undefined' ? fineDiningNPCs : [];
  if (cookingState.activeRestaurantId === 'diner') return typeof dinerNPCs !== 'undefined' ? dinerNPCs : [];
  return typeof deliNPCs !== 'undefined' ? deliNPCs : [];
}
function _getActiveTimerTypes() {
  if (cookingState.activeRestaurantId === 'fine_dining') return typeof FD_TIMER_TYPES !== 'undefined' ? FD_TIMER_TYPES : null;
  if (cookingState.activeRestaurantId === 'diner') return typeof DINER_TIMER_TYPES !== 'undefined' ? DINER_TIMER_TYPES : null;
  return typeof DELI_TIMER_TYPES !== 'undefined' ? DELI_TIMER_TYPES : null;
}

// Saved weapon state (restore when leaving)
let _savedMeleeEquip = null;
let _savedActiveSlot = null;

// ===================== SESSION START / END =====================

function startCookingShift(restaurantId) {
  if (cookingState.active) return;
  if (restaurantId) cookingState.activeRestaurantId = restaurantId;

  // Save current weapon state
  _savedMeleeEquip = playerEquip.melee ? Object.assign({}, playerEquip.melee) : null;
  _savedActiveSlot = activeSlot;

  // Add spatula to inventory if not already there, then equip it
  if (!isInInventory('spatula')) {
    addToInventory(createItem('melee', SPATULA_WEAPON));
  }
  // Find spatula slot and equip it
  for (let i = 0; i < inventory.length; i++) {
    if (inventory[i] && inventory[i].id === 'spatula') {
      equipItem(i);
      break;
    }
  }
  activeSlot = 1; // switch to melee

  cookingState.active = true;
  cookingState.orderSpawnDelay = 30; // 0.5 second delay before first order
  cookingState.assembly = [];
  cookingState.currentOrder = null;
  cookingState.comboCount = 0;
  cookingState.comboMultiplier = 1.0;
  cookingState.missedOrders = 0;
  cookingState.ticketQueue = [];
  cookingState.ticketSpawnTimer = 0;
  cookingState.counterOrders = [];

  cookingState.lastResult = null;
  cookingState.lastResultTimer = 0;
  cookingState.stats = {
    ordersCompleted: 0,
    perfectDishes: 0,
    totalEarned: 0,
    totalTips: 0,
    totalXP: 0,
    grades: { S: 0, A: 0, B: 0, C: 0, F: 0 },
  };
}

function endCookingShift() {
  cookingState.active = false;
  cookingState.currentOrder = null;
  cookingState.assembly = [];
  cookingState.ticketQueue = [];
  cookingState.ticketSpawnTimer = 0;
  cookingState.counterOrders = [];

  // Fully reset grill state
  if (typeof resetGrillState === 'function') resetGrillState();
}

function resetCookingState() {
  // Fully reset grill state so nothing bleeds into next visit
  if (typeof resetGrillState === 'function') resetGrillState();

  // Remove spatula from inventory
  for (let i = inventory.length - 1; i >= 0; i--) {
    if (inventory[i] && inventory[i].id === 'spatula') {
      inventory.splice(i, 1);
      break;
    }
  }

  // Re-equip saved weapon
  if (_savedMeleeEquip) {
    // Find the saved weapon in inventory and equip it
    let found = false;
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i] && inventory[i].id === _savedMeleeEquip.id) {
        equipItem(i);
        found = true;
        break;
      }
    }
    if (!found) {
      // Weapon not in inventory — just restore stats directly
      playerEquip.melee = _savedMeleeEquip;
      melee.damage = _savedMeleeEquip.damage || 15;
      melee.range = _savedMeleeEquip.range || 90;
      melee.cooldownMax = _savedMeleeEquip.cooldown || 28;
      melee.critChance = _savedMeleeEquip.critChance || 0.2;
      melee.special = _savedMeleeEquip.special || null;
    }
  } else {
    melee.special = null;
  }
  if (_savedActiveSlot !== null) activeSlot = _savedActiveSlot;
  _savedMeleeEquip = null;
  _savedActiveSlot = null;

  cookingState.active = false;
  cookingState.currentOrder = null;
  cookingState.ticket = null;
  cookingState.assembly = [];
  cookingState.comboCount = 0;
  cookingState.comboMultiplier = 1.0;
  cookingState.missedOrders = 0;
  cookingState.ticketQueue = [];
  cookingState.ticketSpawnTimer = 0;
  cookingState.counterOrders = [];

  cookingState.lastResult = null;
  cookingState.lastResultTimer = 0;
  cookingState._swingHandled = false;
  cookingState.stats = {
    ordersCompleted: 0, perfectDishes: 0, totalEarned: 0,
    totalTips: 0, totalXP: 0, grades: { S: 0, A: 0, B: 0, C: 0, F: 0 },
  };
}

// ===================== ORDER SPAWNING (TICKET QUEUE) =====================

// Generate a ticket into the queue — independent of NPCs
function _generateTicket() {
  const recipe = _pickActiveRecipe();
  if (!recipe) return;
  // Use the correct customer type pool for each restaurant
  const customerType = cookingState.activeRestaurantId === 'fine_dining' && typeof pickFineDiningCustomerType === 'function'
    ? pickFineDiningCustomerType()
    : cookingState.activeRestaurantId === 'diner' && typeof pickDinerCustomerType === 'function'
      ? pickDinerCustomerType()
      : pickCustomerType();
  const moodThresholds = MOOD_STAGES.map(s => Math.round(s.baseFrames * customerType.patience));

  // Flat 30-second service timer for all orders
  const timerType = { id: 'standard', duration: 1800 };

  // Build ticket (multi-item for diner, single for deli/fine_dining)
  let ticketItems = [{ recipe: recipe, qty: 1 }];
  if (cookingState.activeRestaurantId === 'diner') {
    const itemCount = _ticketRandRange(1, 3);
    ticketItems = [];
    for (let i = 0; i < itemCount; i++) {
      ticketItems.push({ recipe: _pickActiveRecipe(), qty: 1 });
    }
  }
  // Fine dining: single item per ticket (like deli), trick data comes from recipe

  // Compute per-ingredient pay for deli
  if (cookingState.activeRestaurantId === 'street_deli' && typeof _calcDeliPay === 'function') {
    for (const item of ticketItems) {
      item.recipe = Object.assign({}, item.recipe, { basePay: _calcDeliPay(item.recipe) });
    }
  }

  cookingState.ticketQueue.push({
    ticketItems: ticketItems,
    customer: customerType,
    moodThresholds: moodThresholds,
    timerType: timerType,
  });
}

function _ticketRandRange(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }

// Pop from ticket queue and create active order
function _activateNextTicket() {
  if (cookingState.ticketQueue.length === 0) return false;
  const ticket = cookingState.ticketQueue.shift();

  cookingState.ticket = { items: ticket.ticketItems, completedCount: 0 };
  cookingState.currentOrder = {
    id: ++_cookingOrderId,
    recipe: ticket.ticketItems[0].recipe,
    customer: ticket.customer,
    moodTimer: 0,
    mood: MOOD_STAGES[0].id,
    moodStageIdx: 0,
    moodThresholds: ticket.moodThresholds,
    serviceTimer: 0,
    serviceDuration: ticket.timerType.duration,
    timerType: ticket.timerType,
    startFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    npcId: ticket._deliNpcId || null,
    _deliCustomerNumber: ticket._deliCustomerNumber || null,
    _fdTableId: ticket._fdTableId != null ? ticket._fdTableId : null,
    _fdPartyId: ticket._fdPartyId != null ? ticket._fdPartyId : null,
    _dinerBoothId: ticket._dinerBoothId != null ? ticket._dinerBoothId : null,
    _dinerPartyId: ticket._dinerPartyId != null ? ticket._dinerPartyId : null,
    _dinerTableNumber: ticket._dinerTableNumber || null,
  };
  cookingState.assembly = [];

  // Try to link an NPC at the counter
  _tryLinkNPCToOrder();
  return true;
}

// Try to link an unlinked NPC at the counter to the current order
function _tryLinkNPCToOrder() {
  if (!cookingState.currentOrder || cookingState.currentOrder.npcId) return;
  const activeNPCs = _getActiveNPCs();
  const waitingNPC = activeNPCs.find(n => n.state === 'ordering' && !n.linkedOrderId);
  if (waitingNPC) {
    waitingNPC.linkedOrderId = cookingState.currentOrder.id;
    waitingNPC.state = 'waiting_food';
    waitingNPC.stateTimer = 0;
    cookingState.currentOrder.npcId = waitingNPC.id;
  }
}

// Increment missed orders counter
function _incrementMissedOrders() {
  cookingState.missedOrders++;
}

// ===================== MAIN UPDATE =====================

function updateCooking() {
  if (!Scene.inCooking) return;

  // Auto-start session when entering restaurant (continuous — no shift end)
  if (!cookingState.active) {
    startCookingShift();
  }

  if (!cookingState.active) return;

  // Generate tickets on timer (independent of NPCs)
  cookingState.ticketSpawnTimer++;
  if (cookingState.ticketSpawnTimer >= COOKING_CONFIG.ticketSpawnInterval &&
      cookingState.ticketQueue.length < COOKING_CONFIG.ticketQueueMax) {
    cookingState.ticketSpawnTimer = 0;
    _generateTicket();
  }

  // Activate next ticket if no active order
  if (!cookingState.currentOrder) {
    if (cookingState.orderSpawnDelay > 0) {
      cookingState.orderSpawnDelay--;
    } else if (cookingState.ticketQueue.length > 0) {
      _activateNextTicket();
    }
    if (!cookingState.currentOrder) return;
  }

  // Periodically try to link unlinked orders to NPCs at counter (non-deli only)
  if (cookingState.currentOrder && !cookingState.currentOrder.npcId &&
      cookingState.activeRestaurantId !== 'street_deli') {
    _tryLinkNPCToOrder();
  }

  // Update service timer (green→red bar countdown)
  const order = cookingState.currentOrder;
  order.serviceTimer++;

  // Update mood timer (legacy mood stages still used for NPC mood display)
  const moodSpeed = order.customer.moodSpeed || 0.7;
  order.moodTimer += moodSpeed;

  // Check mood stage transitions
  let totalThreshold = 0;
  for (let i = 0; i <= order.moodStageIdx; i++) totalThreshold += order.moodThresholds[i];
  if (order.moodTimer >= totalThreshold && order.moodStageIdx < MOOD_STAGES.length - 1) {
    order.moodStageIdx++;
    order.mood = MOOD_STAGES[order.moodStageIdx].id;
  }

  // === Spatula melee hit detection — swing near a station/ingredient to interact ===
  if (melee.swinging && melee.special === 'spatula' && !cookingState._swingHandled) {
    cookingState._swingHandled = true;
    // Grill mode intercept — if grill is active, swing = trick hit attempt
    if (typeof grillState !== 'undefined' && grillState.active && grillState.phase === 'active') {
      if (typeof _checkTrickHit === 'function') _checkTrickHit();
      return;
    }
    const dirOffsets = [[0,20],[0,-20],[-20,0],[20,0]]; // down, up, left, right
    const [offX, offY] = dirOffsets[player.dir] || [0,0];
    const px = player.x + offX, py = player.y + offY;
    let hitEntity = null;
    let hitDist = 999;
    const facingVecs = [[0,1],[0,-1],[-1,0],[1,0]]; // down, up, left, right
    const [fvx, fvy] = facingVecs[player.dir] || [0,1];
    for (const e of levelEntities) {
      // Detect individual ingredient entities (ing_*/ding_*) + work stations
      const activeEntityMap = _getActiveEntityToIngredient();
      const isIngredient = activeEntityMap[e.type];
      const isWorkStation = e.type === 'deli_counter' || e.type === 'pickup_counter' ||
                            e.type === 'diner_counter' || e.type === 'diner_pickup_counter' ||
                            e.type === 'fd_counter' || e.type === 'fd_pickup_counter' ||
                            e.type.startsWith('fd_teppanyaki_grill_');
      if (!isIngredient && !isWorkStation) continue;
      const ew = (e.w || 1), eh = (e.h || 1);
      // Distance to nearest edge of entity (not center)
      const eLeft = e.tx * TILE, eRight = (e.tx + ew) * TILE;
      const eTop = e.ty * TILE, eBot = (e.ty + eh) * TILE;
      const nearX = Math.max(eLeft, Math.min(px, eRight));
      const nearY = Math.max(eTop, Math.min(py, eBot));
      const dx = nearX - px, dy = nearY - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 40) {
        // Facing-direction bias: dot product of facing vector and direction to entity center
        const eCx = (eLeft + eRight) / 2, eCy = (eTop + eBot) / 2;
        const toCx = eCx - px, toCy = eCy - py;
        const toLen = Math.sqrt(toCx * toCx + toCy * toCy) || 1;
        const facingBias = Math.max(0, (fvx * toCx + fvy * toCy) / toLen); // 0 to 1
        const effectiveDist = dist - facingBias * 15;
        if (effectiveDist < hitDist) {
          hitDist = effectiveDist;
          hitEntity = e.type;
        }
      }
    }
    if (hitEntity) handleStationInteract(hitEntity);
  }
  if (!melee.swinging) cookingState._swingHandled = false;

  // Customer leaves if service timer expires
  if (order.serviceTimer >= order.serviceDuration) {
    // Notify linked NPC to leave angry
    const angryNPCs = _getActiveNPCs();
    if (order.npcId) {
      const npc = angryNPCs.find(n => n.id === order.npcId);
      if (npc) {
        npc.linkedOrderId = null;
        npc.hasOrdered = true;
        if (npc._counterSpotIdx >= 0) npc._counterSpotIdx = -1;
        if (npc.claimedChair !== null) {
          const ch = typeof DELI_CHAIRS !== 'undefined' && DELI_CHAIRS[npc.claimedChair];
          npc.claimedChair = null;
          if (ch) {
            npc.route = [{ tx: ch.tx, ty: 20 }, { tx: 26, ty: 20 }, { tx: 26, ty: 22 }, { tx: 16, ty: 22 }, { tx: 16, ty: 34 }];
          } else {
            npc.route = [{ tx: 16, ty: 22 }, { tx: 16, ty: 34 }];
          }
        } else {
          npc.route = [{ tx: 16, ty: 22 }, { tx: 16, ty: 34 }];
        }
        npc.state = '_despawn_walk';
      }
    }
    // Diner: if service timer expires, trigger party leave for the booth
    if (cookingState.activeRestaurantId === 'diner' &&
        order._dinerPartyId != null &&
        typeof _getDinerParty === 'function' &&
        typeof _triggerPartyLeave === 'function') {
      const party = _getDinerParty(order._dinerPartyId);
      if (party && party.state !== 'leaving') {
        _triggerPartyLeave(party);
      }
    }
    // Customer left — automatic F grade + increment missed
    _incrementMissedOrders();
    const result = {
      grade: COOKING_GRADES.F,
      pay: 0,
      tip: 0,
      xp: Math.round(order.recipe.baseXP * COOKING_GRADES.F.xpMult),
      recipe: order.recipe,
      customer: order.customer,
    };
    applyOrderResult(result);
    return;
  }

  // Last result popup timer
  if (cookingState.lastResultTimer > 0) {
    cookingState.lastResultTimer--;
  }

}

// ===================== STATION INTERACTION =====================

function handleStationInteract(entityType) {
  if (!cookingState.active || !cookingState.currentOrder) return;

  // Individual ingredient entity handler (ing_bread, ing_turkey, ding_eggs, etc.)
  const entityToIng = _getActiveEntityToIngredient();
  const activeIngs = _getActiveIngredients();
  const ingredientId = entityToIng[entityType] || null;
  if (ingredientId) {
    const ing = activeIngs[ingredientId];
    if (!ing) return;
    const recipe = cookingState.currentOrder.recipe;
    const neededCount = recipe.ingredients.filter(i => i === ingredientId).length;
    const addedCount = cookingState.assembly.filter(i => i === ingredientId).length;
    if (addedCount < neededCount) {
      cookingState.assembly.push(ingredientId);
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: player.x, y: player.y - 40, life: 20, maxLife: 20,
          type: "heal", dmg: "+ " + ing.name
        });
      }
    } else {
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: player.x, y: player.y - 40, life: 20, maxLife: 20,
          type: "heal", dmg: "Don't need " + ing.name + "!"
        });
      }
    }
    return;
  }

  // Teppanyaki grill — start grill sequence when assembly is complete
  if (entityType.startsWith('fd_teppanyaki_grill_') && cookingState.currentOrder &&
      cookingState.assembly.length >= cookingState.currentOrder.recipe.ingredients.length &&
      (typeof grillState === 'undefined' || !grillState.active)) {
    const tableId = parseInt(entityType.split('_').pop());
    // Validate player is at the correct table for the current order
    if (cookingState.currentOrder._fdTableId != null && tableId !== cookingState.currentOrder._fdTableId) {
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({ x: player.x, y: player.y - 40, life: 25, maxLife: 25, type: "heal", dmg: "Wrong table! Check order." });
      }
      return;
    }
    if (typeof startGrillSequence === 'function') startGrillSequence(tableId, cookingState.currentOrder.recipe);
    return;
  }
  // Teppanyaki grill — not ready yet, show message
  if (entityType.startsWith('fd_teppanyaki_grill_') && cookingState.currentOrder &&
      cookingState.assembly.length < cookingState.currentOrder.recipe.ingredients.length) {
    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({ x: player.x, y: player.y - 40, life: 20, maxLife: 20, type: "heal", dmg: "Collect all ingredients first!" });
    }
    return;
  }

  if (entityType === 'deli_counter' || entityType === 'diner_counter' || entityType === 'fd_counter') {
    // Clear plate — reset assembly
    cookingState.assembly = [];
    if (typeof hitEffects !== 'undefined') {
      hitEffects.push({
        x: player.x, y: player.y - 40, life: 20, maxLife: 20,
        type: "heal", dmg: "Plate cleared!"
      });
    }
  }

  if (entityType === 'pickup_counter' || entityType === 'diner_pickup_counter' || entityType === 'fd_pickup_counter') {
    // Submit order for grading
    if (cookingState.assembly.length === 0) {
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: player.x, y: player.y - 40, life: 20, maxLife: 20,
          type: "heal", dmg: "Nothing to serve!"
        });
      }
      return;
    }
    const result = gradeOrder();
    applyOrderResult(result);
  }
}

// ===================== GRADING =====================

function gradeOrder() {
  const order = cookingState.currentOrder;
  const recipe = order.recipe;

  // Quality: set-based matching — count how many of each ingredient match (order doesn't matter)
  const neededCounts = {};
  for (const id of recipe.ingredients) neededCounts[id] = (neededCounts[id] || 0) + 1;
  const assemblyCounts = {};
  for (const id of cookingState.assembly) assemblyCounts[id] = (assemblyCounts[id] || 0) + 1;
  let correctCount = 0;
  for (const id in neededCounts) {
    correctCount += Math.min(neededCounts[id], assemblyCounts[id] || 0);
  }
  // Penalize extra wrong ingredients (items not in recipe, or excess of a needed item)
  let extraWrong = 0;
  for (const id in assemblyCounts) {
    const excess = assemblyCounts[id] - (neededCounts[id] || 0);
    if (excess > 0) extraWrong += excess;
  }
  const qualityScore = Math.max(0, (correctCount / recipe.ingredients.length) - extraWrong * 0.1);

  // Time score: how fast relative to service timer duration
  const timeScore = Math.max(0, 1.0 - (order.serviceTimer / order.serviceDuration));

  // Fine dining: modified scoring with trick score
  let effectiveQuality = qualityScore;
  let effectiveTime = timeScore;
  if (cookingState.activeRestaurantId === 'fine_dining' && typeof grillState !== 'undefined' && grillState.trickScore > 0) {
    // Blend: 40% quality, 40% trick, 20% time
    const blended = qualityScore * 0.4 + grillState.trickScore * 0.4 + timeScore * 0.2;
    effectiveQuality = blended;
    effectiveTime = blended; // use blended for both thresholds
  }

  // Determine grade
  let grade = COOKING_GRADES.F;
  if (effectiveQuality >= COOKING_GRADES.S.minQuality && effectiveTime >= COOKING_GRADES.S.minTime) grade = COOKING_GRADES.S;
  else if (effectiveQuality >= COOKING_GRADES.A.minQuality && effectiveTime >= COOKING_GRADES.A.minTime) grade = COOKING_GRADES.A;
  else if (effectiveQuality >= COOKING_GRADES.B.minQuality && effectiveTime >= COOKING_GRADES.B.minTime) grade = COOKING_GRADES.B;
  else if (effectiveQuality >= COOKING_GRADES.C.minQuality) grade = COOKING_GRADES.C;

  // Calculate pay
  const basePay = recipe.basePay;
  const pay = Math.round(basePay * grade.payMult);

  // Calculate tip — grade multiplier × customer generosity × combo streak
  const comboMult = cookingState.comboMultiplier || 1.0;
  const customerTipMult = order.customer.tipMult || 1.0;
  const rawTip = pay * 0.2 * grade.tipMult * customerTipMult * comboMult;
  const tip = Math.round(rawTip);

  // Calculate XP
  const xp = Math.round(recipe.baseXP * grade.xpMult);

  return {
    grade: grade,
    pay: pay,
    tip: tip,
    xp: xp,
    recipe: recipe,
    customer: order.customer,
    qualityScore: qualityScore,
    timeScore: timeScore,
    reason: null,
  };
}

function applyOrderResult(result) {
  // Update stats
  cookingState.stats.ordersCompleted++;
  cookingState.stats.totalEarned += result.pay;
  cookingState.stats.totalTips += result.tip;
  cookingState.stats.totalXP += result.xp;
  cookingState.stats.grades[result.grade.label]++;

  if (result.grade.label === 'S') {
    cookingState.stats.perfectDishes++;
  }

  // Combo tracking
  if (result.grade.label === 'S' || result.grade.label === 'A') {
    cookingState.comboCount++;
    cookingState.comboMultiplier = 1.0 + Math.min(
      cookingState.comboCount * COOKING_CONFIG.comboTipBonus,
      COOKING_CONFIG.comboMaxBonus
    );
  } else if (result.grade.label === 'F') {
    cookingState.comboCount = 0;
    cookingState.comboMultiplier = 1.0;
  }

  // Award gold (pay + tips combined)
  if (typeof gold !== 'undefined') {
    gold += result.pay + result.tip;
  }

  // Award Cooking XP
  if (typeof addSkillXP === 'function') {
    addSkillXP('Cooking', result.xp);
  }

  // Popups
  if (typeof hitEffects !== 'undefined') {
    // Grade popup
    hitEffects.push({
      x: player.x, y: player.y - 50, life: 40, maxLife: 40,
      type: "heal", dmg: result.grade.label + " Grade!"
    });
    // Gold popup
    if (result.pay > 0) {
      hitEffects.push({
        x: player.x + 20, y: player.y - 35, life: 35, maxLife: 35,
        type: "heal", dmg: "+" + result.pay + " gold"
      });
    }
    // XP popup
    if (result.xp > 0) {
      hitEffects.push({
        x: player.x - 20, y: player.y - 35, life: 35, maxLife: 35,
        type: "heal", dmg: "+" + result.xp + " Cooking XP"
      });
    }
    // Tip popup
    if (result.tip > 0) {
      hitEffects.push({
        x: player.x, y: player.y - 65, life: 30, maxLife: 30,
        type: "heal", dmg: "+$" + result.tip + " tip"
      });
    }
  }

  // Store result for HUD display
  cookingState.lastResult = result;
  cookingState.lastResultTimer = 120; // 2 seconds

  // Track cooking progress
  if (typeof cookingProgress !== 'undefined') {
    cookingProgress.lifetimeOrdersTotal++;
    const shopId = cookingState.activeRestaurantId || 'street_deli';
    cookingProgress.lifetimeOrdersByShop[shopId] = (cookingProgress.lifetimeOrdersByShop[shopId] || 0) + 1;
  }

  // Multi-item ticket: advance to next item or finish
  if (cookingState.ticket && cookingState.ticket.completedCount < cookingState.ticket.items.length - 1) {
    cookingState.ticket.completedCount++;
    const nextItem = cookingState.ticket.items[cookingState.ticket.completedCount];
    cookingState.currentOrder.recipe = nextItem.recipe;
    cookingState.assembly = [];
    cookingState.currentOrder.serviceTimer = 0; // reset timer between ticket items
    cookingState.lastResult = result;
    cookingState.lastResultTimer = 120;
    return; // don't clear order — more items to serve
  }

  // All ticket items done — notify NPC or waitress
  if (cookingState.currentOrder) {
    // Diner: push to waitress pending serve queue
    if (cookingState.activeRestaurantId === 'diner' &&
        cookingState.currentOrder._dinerBoothId != null &&
        cookingState.currentOrder._dinerPartyId != null &&
        typeof _dinerPendingServe !== 'undefined') {
      const recipeIngredients = cookingState.currentOrder.recipe && cookingState.currentOrder.recipe.ingredients
        ? cookingState.currentOrder.recipe.ingredients.slice()
        : null;
      _dinerPendingServe.push({
        boothId: cookingState.currentOrder._dinerBoothId,
        partyId: cookingState.currentOrder._dinerPartyId,
        tableNumber: cookingState.currentOrder._dinerTableNumber || null,
        recipeIngredients: recipeIngredients,
      });
      // Update TV queue status to ready
      if (typeof _dinerTVQueue !== 'undefined') {
        const tvEntry = _dinerTVQueue.find(e => e.partyId === cookingState.currentOrder._dinerPartyId && e.status === 'pending');
        if (tvEntry) tvEntry.status = 'ready';
      }
    } else if (cookingState.activeRestaurantId === 'fine_dining' &&
               cookingState.currentOrder._fdTableId != null &&
               cookingState.currentOrder._fdPartyId != null &&
               typeof _fdPendingServe !== 'undefined') {
      // Fine dining: push to waiter pending serve queue
      const recipeIngredients = cookingState.currentOrder.recipe && cookingState.currentOrder.recipe.ingredients
        ? cookingState.currentOrder.recipe.ingredients.slice()
        : null;
      _fdPendingServe.push({
        tableId: cookingState.currentOrder._fdTableId,
        partyId: cookingState.currentOrder._fdPartyId,
        recipeIngredients: recipeIngredients,
      });
    } else if (cookingState.activeRestaurantId === 'street_deli') {
      // Deli: push completed order to counter — but NEVER for expired/failed orders (no plate if not completed)
      if (result.grade !== COOKING_GRADES.F) {
        if (!cookingState.counterOrders) cookingState.counterOrders = [];
        const recipeIngredients = cookingState.currentOrder.recipe && cookingState.currentOrder.recipe.ingredients
          ? cookingState.currentOrder.recipe.ingredients.slice()
          : null;
        cookingState.counterOrders.push({
          recipe: cookingState.currentOrder.recipe,
          recipeIngredients: recipeIngredients,
          _claimedByNpc: null,
        });
      }
    } else if (cookingState.currentOrder.npcId) {
      // Generic NPC pickup (fallback)
      const activeNPCs = _getActiveNPCs();
      const npc = activeNPCs.find(n => n.id === cookingState.currentOrder.npcId);
      if (npc && (npc.state === 'waiting_food' || npc.state === 'ordering')) {
        npc.state = 'pickup_food';
        npc.stateTimer = 30;
        npc.hasFood = true;
        if (cookingState.currentOrder.recipe && cookingState.currentOrder.recipe.ingredients) {
          npc._recipeIngredients = cookingState.currentOrder.recipe.ingredients.slice();
        }
        npc.linkedOrderId = null;
      }
    }
  }

  // Reset grill trick score so it doesn't bleed into the next order
  if (typeof grillState !== 'undefined') grillState.trickScore = 0;

  // Clear current order and schedule next
  cookingState.currentOrder = null;
  cookingState.ticket = null;
  cookingState.assembly = [];
  cookingState.orderSpawnDelay = COOKING_CONFIG.orderSpawnDelay;
}

// ===================== REGISTER STATION INTERACTABLES =====================
// These are dynamically positioned based on level entities, so we register
// them with getter functions that look up entity positions.

function _getDeliStationEntity(stationType) {
  if (typeof levelEntities === 'undefined') return null;
  return levelEntities.find(e => e.type === stationType);
}

function _stationWorldPos(stationType) {
  const e = _getDeliStationEntity(stationType);
  if (!e) return { x: 0, y: 0 };
  const w = e.w || 1, h = e.h || 1;
  return { x: (e.tx + w / 2) * TILE, y: (e.ty + h / 2) * TILE };
}

// All stations now use spatula melee hit detection (swing to interact).

// ===================== HUD RENDERING =====================

function drawCookingHUD() {
  if (!Scene.inCooking) return;
  if (!cookingState.active) return;

  const order = cookingState.currentOrder;

  // === Combo counter (top-right area) ===
  if (cookingState.comboCount > 0) {
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = cookingState.comboCount >= COOKING_CONFIG.comboThreshold ? '#ffd700' : '#c0c0c0';
    ctx.textAlign = "left";
    ctx.fillText("Combo x" + cookingState.comboCount, BASE_W / 2 + 110, 66);
  }

  // === Grill HUD override ===
  if (typeof grillState !== 'undefined' && grillState.active && typeof drawGrillHUD === 'function') {
    drawGrillHUD();
    // Still show stats line below
  } else

  // === Order display (top-center) ===
  // Fine dining: hide order until waiter submits it at pass window
  if (order && cookingState.activeRestaurantId === 'fine_dining' &&
      typeof _fdOrderVisible !== 'undefined' && !_fdOrderVisible) {
    // Show "Waiter taking order..." placeholder
    ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText("Waiter taking order...", BASE_W / 2, 90);
  } else
  if (order) {
    const panelW = 220, panelH = 140;
    const panelX = BASE_W / 2 - panelW / 2, panelY = 54;

    // Panel background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 6); ctx.stroke();

    // Customer type + timer type label
    ctx.font = "bold 10px monospace"; ctx.textAlign = "left";
    ctx.fillStyle = order.customer.color || '#80a0c0';
    const customerLabel = order.customer.name || order.customer.type || 'Customer';
    ctx.fillText(customerLabel, panelX + 8, panelY + 14);
    // (Timer type label removed — bar color communicates urgency)

    // === Table number in gold (top-right of panel) — diner only ===
    if (cookingState.activeRestaurantId === 'diner' && order._dinerTableNumber) {
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#ffd700'; ctx.textAlign = "right";
      ctx.fillText("Table " + order._dinerTableNumber, panelX + panelW - 8, panelY + 14);
      ctx.textAlign = "left";
    }

    // === Service timer bar (green→yellow→red) ===
    const isDiner = cookingState.activeRestaurantId === 'diner';
    const sTimerPct = Math.max(0, 1.0 - (order.serviceTimer / order.serviceDuration));
    {
      const sBarW = panelW - 16, sBarH = 8;
      const sBarX = panelX + 8, sBarY = panelY + 20;
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(sBarX, sBarY, sBarW, sBarH);
      // Color interpolation: green→yellow→red as time runs out
      let barR, barG;
      if (sTimerPct > 0.5) {
        // green to yellow (pct 1.0→0.5): R ramps up, G stays high
        const t = (sTimerPct - 0.5) / 0.5; // t: 1→0 as pct drops
        barR = Math.round(255 * (1 - t));   // R: 0→255
        barG = 200;                          // G: stays 200
      } else {
        // yellow to red (pct 0.5→0.0): R stays high, G drops
        const t = sTimerPct / 0.5;           // t: 1→0 as pct drops
        barR = 255;                          // R: stays 255
        barG = Math.round(200 * t);          // G: 200→0
      }
      ctx.fillStyle = 'rgb(' + barR + ',' + barG + ',40)';
      ctx.fillRect(sBarX, sBarY, sBarW * sTimerPct, sBarH);
    }

    // Order name + ticket progress
    ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ffd700';
    let orderLabel = "Order: " + order.recipe.name;
    if (cookingState.ticket && cookingState.ticket.items.length > 1) {
      orderLabel = "Item " + (cookingState.ticket.completedCount + 1) + "/" + cookingState.ticket.items.length + ": " + order.recipe.name;
    }
    // Diner: table number is shown in gold at top-right, don't repeat in label
    ctx.fillText(orderLabel, panelX + 8, panelY + 42);

    // Recipe ingredients — check off based on how many collected vs how many needed
    ctx.font = "9px monospace"; ctx.fillStyle = '#c0c0c0';
    const ingredients = order.recipe.ingredients;
    // Count how many of each ingredient the player has collected
    const assemblyCount = {};
    for (const aId of cookingState.assembly) {
      assemblyCount[aId] = (assemblyCount[aId] || 0) + 1;
    }
    // Track how many of each we've checked off as we iterate the recipe list
    const checkedOff = {};
    for (let i = 0; i < ingredients.length; i++) {
      const ingId = ingredients[i];
      const ing = _getActiveIngredients()[ingId];
      if (!ing) continue;
      checkedOff[ingId] = (checkedOff[ingId] || 0) + 1;
      const added = (assemblyCount[ingId] || 0) >= checkedOff[ingId];
      const iy = panelY + 52 + i * 11;
      if (iy > panelY + panelH - 8) break;

      // Checkbox
      ctx.fillStyle = added ? '#60c060' : '#606060';
      ctx.fillRect(panelX + 10, iy - 7, 8, 8);
      if (added) {
        ctx.fillStyle = '#fff';
        ctx.font = "bold 7px monospace";
        ctx.fillText("\u2713", panelX + 11, iy - 1);
      }

      // Ingredient name
      ctx.font = "9px monospace";
      ctx.fillStyle = added ? '#80c080' : '#a0a0a0';
      ctx.fillText((i + 1) + ". " + ing.name, panelX + 22, iy);
    }

    // Assembly progress count
    ctx.font = "bold 9px monospace"; ctx.fillStyle = '#b0b0b0'; ctx.textAlign = "right";
    ctx.fillText(cookingState.assembly.length + "/" + ingredients.length + " items", panelX + panelW - 8, panelY + panelH - 6);
  } else {
    // No active order — show queue status
    ctx.font = "bold 11px monospace"; ctx.textAlign = "left";
    if (cookingState.ticketQueue.length > 0) {
      ctx.fillStyle = '#60c060';
      ctx.fillText("Next order ready!", 18, 52);
    } else {
      ctx.fillStyle = '#a0a0a0';
      ctx.fillText("Preparing...", 18, 52);
    }
  }

  // === Last order result popup (skip for diner — timer is on table) ===
  if (cookingState.lastResult && cookingState.lastResultTimer > 0 && cookingState.activeRestaurantId !== 'diner') {
    const r = cookingState.lastResult;
    const alpha = Math.min(1, cookingState.lastResultTimer / 30);
    const popX = BASE_W / 2, popY = BASE_H / 2 - 40;

    ctx.globalAlpha = alpha;
    ctx.font = "bold 28px monospace"; ctx.fillStyle = r.grade.color; ctx.textAlign = "center";
    ctx.fillText(r.grade.label, popX, popY);
    ctx.font = "bold 12px monospace"; ctx.fillStyle = '#fff';
    ctx.fillText(r.recipe.name, popX, popY + 20);
    if (r.reason) {
      ctx.fillStyle = '#e04040';
      ctx.fillText(r.reason, popX, popY + 35);
    }
    ctx.globalAlpha = 1;
  }

  // === Stats line (bottom) ===
  // Dark background bar for readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, BASE_H - 68, 480, 26);

  ctx.font = "bold 15px monospace"; ctx.textAlign = "left";
  // Orders count
  ctx.fillStyle = '#ffffff';
  ctx.fillText("Orders: " + cookingState.stats.ordersCompleted, 12, BASE_H - 50);
  // Earned (green)
  ctx.fillStyle = '#50e050';
  ctx.fillText("Earned: $" + cookingState.stats.totalEarned, 150, BASE_H - 50);
  // Tips (gold)
  ctx.fillStyle = '#f0d040';
  ctx.fillText("Tips: $" + cookingState.stats.totalTips, 310, BASE_H - 50);

  // === Missed orders counter (bottom-left, red) ===
  if (cookingState.missedOrders > 0) {
    ctx.fillStyle = '#e04040';
    ctx.fillText("Missed: " + cookingState.missedOrders, 12, BASE_H - 30);
  }

  ctx.textAlign = "left";
}
