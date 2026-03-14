// ===================== COOKING SYSTEM =====================
// Authority: cooking shift loop, customer orders, grading, XP
// V1 — Street Deli only. One order at a time.
//
// Flow:
//   1. Player enters deli → startCookingShift() auto-starts
//   2. Customer spawns with random order
//   3. Player interacts with stations to assemble sandwich
//   4. Player submits at pickup counter → gradeOrder()
//   5. Award gold + tip + Cooking XP
//   6. Next customer spawns
//   7. Shift ends after timer expires → shift-end overlay

// ===================== COOKING STATE =====================
const cookingState = {
  active: false,
  shopId: 'street_deli',
  activeRestaurantId: 'street_deli',
  ticket: null,  // multi-item ticket: { items: [{recipe, qty}], completedCount: 0 }
  shiftTimer: 0,
  shiftDuration: COOKING_CONFIG.shiftDuration,
  orderSpawnDelay: 0,
  assembly: [],          // ingredients the player has added so far
  currentOrder: null,    // { id, recipe, customer, moodTimer, mood, moodStageIdx }
  comboCount: 0,
  comboMultiplier: 1.0,
  rushActive: false,
  shiftEnded: false,     // true = show summary overlay
  shiftComplete: false,  // true = shift finished, don't auto-restart
  tipJar: 0,             // uncollected tips — player hits tip jar to collect
  // Ticket queue — orders auto-generate on timer, independent of NPCs
  ticketQueue: [],       // pre-generated order tickets waiting to activate
  ticketSpawnTimer: 0,   // frames until next ticket generation
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

// Saved weapon state (restore when leaving deli)
let _savedMeleeEquip = null;
let _savedActiveSlot = null;

// ===================== SHIFT START / END =====================

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
  cookingState.shiftTimer = 0;
  cookingState.shiftDuration = COOKING_CONFIG.shiftDuration;
  cookingState.orderSpawnDelay = 30; // 0.5 second delay before first order
  cookingState.assembly = [];
  cookingState.currentOrder = null;
  cookingState.comboCount = 0;
  cookingState.comboMultiplier = 1.0;
  cookingState.rushActive = false;
  cookingState.shiftEnded = false;
  cookingState.shiftComplete = false;
  cookingState.tipJar = 0;
  cookingState.ticketQueue = [];
  cookingState.ticketSpawnTimer = 0;
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
  cookingState.shiftEnded = true;
  cookingState.shiftComplete = true;
  cookingState.currentOrder = null;
  cookingState.assembly = [];
  cookingState.ticketQueue = [];
  cookingState.ticketSpawnTimer = 0;
  // Reset grill state if active
  if (typeof grillState !== 'undefined' && grillState.active) {
    grillState.active = false;
    grillState.phase = 'idle';
  }
}

function resetCookingState() {
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
  cookingState.shiftEnded = false;
  cookingState.shiftComplete = false;
  cookingState.currentOrder = null;
  cookingState.ticket = null;
  cookingState.assembly = [];
  cookingState.comboCount = 0;
  cookingState.comboMultiplier = 1.0;
  cookingState.tipJar = 0;
  cookingState.ticketQueue = [];
  cookingState.ticketSpawnTimer = 0;
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
  const customerType = pickCustomerType();
  const moodThresholds = MOOD_STAGES.map(s => Math.round(s.baseFrames * customerType.patience));

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

  cookingState.ticketQueue.push({
    ticketItems: ticketItems,
    customer: customerType,
    moodThresholds: moodThresholds,
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
    startFrame: typeof gameFrame !== 'undefined' ? gameFrame : 0,
    npcId: null,
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

// ===================== MAIN UPDATE =====================

function updateCooking() {
  if (!Scene.inCooking) return;

  // Auto-start shift when entering deli (only once per visit)
  if (!cookingState.active && !cookingState.shiftEnded && !cookingState.shiftComplete) {
    startCookingShift();
  }

  // Shift-end overlay: press E to dismiss and allow new shift
  if (cookingState.shiftEnded) {
    if (InputIntent.interactPressed) {
      cookingState.shiftEnded = false;
      cookingState.shiftComplete = false; // allow auto-start of next shift
      InputIntent.interactPressed = false; // consume so inventory doesn't open
    }
    return;
  }

  if (!cookingState.active) return;

  // Advance shift timer
  cookingState.shiftTimer++;

  // Check rush mode
  if (!cookingState.rushActive && cookingState.stats.ordersCompleted >= COOKING_CONFIG.rushStartAfter) {
    cookingState.rushActive = true;
  }

  // Shift time expired
  if (cookingState.shiftTimer >= cookingState.shiftDuration) {
    endCookingShift();
    return;
  }

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

  // Periodically try to link unlinked orders to NPCs at counter
  if (cookingState.currentOrder && !cookingState.currentOrder.npcId) {
    _tryLinkNPCToOrder();
  }

  // Update mood timer
  const order = cookingState.currentOrder;
  const moodSpeed = order.customer.moodSpeed * (cookingState.rushActive ? COOKING_CONFIG.rushMoodSpeedMult : 1.0);
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
    const px = player.x, py = player.y - 20;
    let hitEntity = null;
    let hitDist = 999;
    for (const e of levelEntities) {
      // Detect individual ingredient entities (ing_*/ding_*) + work stations
      const activeEntityMap = _getActiveEntityToIngredient();
      const isIngredient = activeEntityMap[e.type];
      const isWorkStation = e.type === 'deli_counter' || e.type === 'pickup_counter' || e.type === 'tip_jar' ||
                            e.type === 'diner_counter' || e.type === 'diner_pickup_counter' || e.type === 'diner_tip_jar' ||
                            e.type === 'fd_counter' || e.type === 'fd_pickup_counter' || e.type === 'fd_tip_jar' ||
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
      if (dist < 55 && dist < hitDist) {
        hitDist = dist;
        hitEntity = e.type;
      }
    }
    if (hitEntity) handleStationInteract(hitEntity);
  }
  if (!melee.swinging) cookingState._swingHandled = false;

  // Customer leaves if past all mood stages
  let totalAllThresholds = 0;
  for (const th of order.moodThresholds) totalAllThresholds += th;
  if (order.moodTimer >= totalAllThresholds) {
    // Notify linked NPC to leave angry
    const angryNPCs = _getActiveNPCs();
    if (order.npcId) {
      const npc = angryNPCs.find(n => n.id === order.npcId);
      if (npc) {
        npc.linkedOrderId = null;
        npc.hasOrdered = true;
        // Release counter slot and trigger party leave for diner NPCs
        if (typeof _dinerDequeueCounter === 'function' && npc.partyId) {
          _dinerDequeueCounter(npc.partyId);
          if (typeof _getDinerParty === 'function') {
            const party = _getDinerParty(npc.partyId);
            if (party && typeof _triggerPartyLeave === 'function') {
              _triggerPartyLeave(party);
            }
          }
        } else {
          // Fallback for deli NPCs
          npc._queueIdx = -1;
          if (typeof _advanceQueue === 'function') _advanceQueue(0);
          npc.route = [{ tx: 13, ty: 22 }, { tx: 13, ty: 27 }];
          npc.state = '_despawn_walk';
        }
      }
    }
    // Customer left — automatic F grade
    const result = {
      grade: COOKING_GRADES.F,
      pay: 0,
      tip: 0,
      xp: Math.round(order.recipe.baseXP * COOKING_GRADES.F.xpMult),
      recipe: order.recipe,
      customer: order.customer,
      reason: 'Customer left!',
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

  if (entityType === 'tip_jar' || entityType === 'diner_tip_jar' || entityType === 'fd_tip_jar') {
    // Collect accumulated tips
    if (cookingState.tipJar > 0) {
      const collected = cookingState.tipJar;
      cookingState.tipJar = 0;
      if (typeof gold !== 'undefined') gold += collected;
      cookingState.stats.totalEarned += collected;
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: player.x, y: player.y - 40, life: 30, maxLife: 30,
          type: "heal", dmg: "Tips collected: $" + collected
        });
      }
    } else {
      if (typeof hitEffects !== 'undefined') {
        hitEffects.push({
          x: player.x, y: player.y - 40, life: 20, maxLife: 20,
          type: "heal", dmg: "Tip jar empty!"
        });
      }
    }
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

  // Time score: how fast relative to total mood time
  let totalMoodTime = 0;
  for (const th of order.moodThresholds) totalMoodTime += th;
  const timeScore = Math.max(0, 1.0 - (order.moodTimer / totalMoodTime));

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
  const rawTip = pay * 0.2 * grade.tipMult * order.customer.tipMultiplier * comboMult;
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

  // Award gold (pay only — tips go to tip jar)
  if (typeof gold !== 'undefined') {
    gold += result.pay;
  }

  // Tips go into tip jar (player collects by hitting tip jar)
  if (result.tip > 0) {
    cookingState.tipJar += result.tip;
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
    // Tip to jar popup
    if (result.tip > 0) {
      hitEffects.push({
        x: player.x, y: player.y - 65, life: 30, maxLife: 30,
        type: "heal", dmg: "Tip Jar +$" + result.tip
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
    cookingState.lastResult = result;
    cookingState.lastResultTimer = 120;
    return; // don't clear order — more items to serve
  }

  // All ticket items done — notify NPC
  const activeNPCs = _getActiveNPCs();
  if (cookingState.currentOrder && cookingState.currentOrder.npcId) {
    const npc = activeNPCs.find(n => n.id === cookingState.currentOrder.npcId);
    if (npc && (npc.state === 'waiting_food' || npc.state === 'ordering')) {
      npc.state = 'pickup_food';
      npc.stateTimer = 30;
      npc.hasFood = true;
      // Store recipe ingredients for food visual colors
      if (cookingState.currentOrder.recipe && cookingState.currentOrder.recipe.ingredients) {
        npc._recipeIngredients = cookingState.currentOrder.recipe.ingredients.slice();
      }
      npc.linkedOrderId = null;
    }
  }

  // Clear current order and schedule next
  cookingState.currentOrder = null;
  cookingState.ticket = null;
  cookingState.assembly = [];
  const baseDelay = COOKING_CONFIG.orderSpawnDelay;
  cookingState.orderSpawnDelay = Math.round(
    baseDelay * (cookingState.rushActive ? COOKING_CONFIG.rushOrderDelayMult : 1.0)
  );
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

  // Shift-end overlay
  if (cookingState.shiftEnded) {
    drawShiftEndOverlay();
    return;
  }

  if (!cookingState.active) return;

  const order = cookingState.currentOrder;

  // === Top-center: Shift timer bar (below HP bar which ends ~y50) ===
  const barW = 200, barH = 14;
  const barX = BASE_W / 2 - barW / 2, barY = 54;
  const shiftPct = 1.0 - (cookingState.shiftTimer / cookingState.shiftDuration);

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath(); ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4); ctx.fill();
  // Fill
  ctx.fillStyle = shiftPct > 0.3 ? '#60a040' : shiftPct > 0.1 ? '#d0a020' : '#e04040';
  ctx.beginPath(); ctx.roundRect(barX, barY, barW * shiftPct, barH, 3); ctx.fill();
  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3); ctx.stroke();
  // Label
  const mins = Math.floor((cookingState.shiftDuration - cookingState.shiftTimer) / 3600);
  const secs = Math.floor(((cookingState.shiftDuration - cookingState.shiftTimer) % 3600) / 60);
  ctx.font = "bold 10px monospace"; ctx.fillStyle = '#fff'; ctx.textAlign = "center";
  ctx.fillText("Shift: " + mins + ":" + (secs < 10 ? "0" : "") + secs, barX + barW / 2, barY + barH - 2);

  // === Combo counter (top-right of timer) ===
  if (cookingState.comboCount > 0) {
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = cookingState.comboCount >= COOKING_CONFIG.comboThreshold ? '#ffd700' : '#c0c0c0';
    ctx.textAlign = "left";
    ctx.fillText("Combo x" + cookingState.comboCount, barX + barW + 10, barY + barH - 2);
  }

  // Rush indicator
  if (cookingState.rushActive) {
    ctx.font = "bold 10px monospace"; ctx.fillStyle = '#ff6040'; ctx.textAlign = "right";
    ctx.fillText("RUSH HOUR!", barX - 10, barY + barH - 2);
  }

  // === Grill HUD override ===
  if (typeof grillState !== 'undefined' && grillState.active && typeof drawGrillHUD === 'function') {
    drawGrillHUD();
    // Still show stats line below
  } else

  // === Order display (top-center, below shift timer) ===
  if (order) {
    const panelW = 220, panelH = 130;
    const panelX = BASE_W / 2 - panelW / 2, panelY = 76;

    // Panel background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 6); ctx.stroke();

    // Customer type + mood
    const moodStage = MOOD_STAGES[order.moodStageIdx];
    ctx.font = "bold 10px monospace"; ctx.textAlign = "left";
    ctx.fillStyle = order.customer.color;
    ctx.fillText(order.customer.name + " Customer", panelX + 8, panelY + 14);
    ctx.fillStyle = moodStage.color;
    ctx.fillText(moodStage.icon + " " + moodStage.label, panelX + panelW - 80, panelY + 14);

    // Mood timer bar
    let totalMoodTime = 0;
    for (const th of order.moodThresholds) totalMoodTime += th;
    const moodPct = Math.max(0, 1.0 - (order.moodTimer / totalMoodTime));
    const moodBarW = panelW - 16, moodBarH = 6;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(panelX + 8, panelY + 20, moodBarW, moodBarH);
    ctx.fillStyle = moodStage.color;
    ctx.fillRect(panelX + 8, panelY + 20, moodBarW * moodPct, moodBarH);

    // Order name + ticket progress
    ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ffd700';
    let orderLabel = "Order: " + order.recipe.name;
    if (cookingState.ticket && cookingState.ticket.items.length > 1) {
      orderLabel = "Item " + (cookingState.ticket.completedCount + 1) + "/" + cookingState.ticket.items.length + ": " + order.recipe.name;
    }
    ctx.fillText(orderLabel, panelX + 8, panelY + 40);

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
      const iy = panelY + 50 + i * 11;
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

  // === Last order result popup ===
  if (cookingState.lastResult && cookingState.lastResultTimer > 0) {
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
  ctx.fillText("Earned: $" + cookingState.stats.totalEarned, 170, BASE_H - 50);
  // Tips (gold)
  ctx.fillStyle = '#f0d040';
  ctx.fillText("Tips: $" + cookingState.stats.totalTips, 360, BASE_H - 50);

  ctx.textAlign = "left";
}

// ===================== SHIFT-END OVERLAY =====================

function drawShiftEndOverlay() {
  const s = cookingState.stats;

  // Full-screen dark overlay
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel
  const panelW = 320, panelH = 300;
  const panelX = BASE_W / 2 - panelW / 2, panelY = BASE_H / 2 - panelH / 2;

  ctx.fillStyle = 'rgba(30,25,20,0.95)';
  ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 10); ctx.fill();
  ctx.strokeStyle = '#c0a060'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(panelX, panelY, panelW, panelH, 10); ctx.stroke();

  // Title
  ctx.font = "bold 18px monospace"; ctx.fillStyle = '#ffd700'; ctx.textAlign = "center";
  ctx.fillText("SHIFT COMPLETE", panelX + panelW / 2, panelY + 28);

  // Divider
  ctx.strokeStyle = '#605030'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(panelX + 20, panelY + 38); ctx.lineTo(panelX + panelW - 20, panelY + 38); ctx.stroke();

  // Stats
  ctx.font = "bold 12px monospace"; ctx.textAlign = "left";
  const col1 = panelX + 24, col2 = panelX + panelW - 24;
  let ly = panelY + 60;
  const lineH = 22;

  const statLines = [
    { label: "Orders Completed", value: s.ordersCompleted, color: '#c0c0c0' },
    { label: "Perfect Dishes (S)", value: s.perfectDishes, color: '#ffd700' },
    { label: "Total Earned", value: "$" + s.totalEarned, color: '#60c060' },
    { label: "Total Tips", value: "$" + s.totalTips, color: '#80d080' },
    { label: "Cooking XP Earned", value: "+" + s.totalXP, color: '#80a0e0' },
    { label: "S Grades", value: s.grades.S, color: '#ffd700' },
    { label: "A Grades", value: s.grades.A, color: '#60c060' },
    { label: "B Grades", value: s.grades.B, color: '#80a0e0' },
    { label: "C Grades", value: s.grades.C, color: '#c0c0c0' },
    { label: "F Grades", value: s.grades.F, color: '#e04040' },
  ];

  for (const line of statLines) {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillText(line.label, col1, ly);
    ctx.fillStyle = line.color;
    ctx.textAlign = "right";
    ctx.fillText("" + line.value, col2, ly);
    ctx.textAlign = "left";
    ly += lineH;
  }

  // Footer
  ctx.font = "bold 10px monospace"; ctx.fillStyle = '#808080'; ctx.textAlign = "center";
  ctx.fillText("Press [" + getKeyDisplayName(keybinds.interact) + "] to continue", panelX + panelW / 2, panelY + panelH - 14);

  ctx.textAlign = "left";
}
