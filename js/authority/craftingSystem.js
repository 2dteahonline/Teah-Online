// ===================== CRAFTING SYSTEM =====================
// Authority: recipe checking, material consumption, crafting execution.
// Reads from CRAFT_RECIPES (craftingData.js) and inventory (inventorySystem.js).

const CraftingSystem = {
  // Count how many of a material the player has in inventory
  getMaterialCount(materialId) {
    return countMaterialInInventory(materialId);
  },

  // Check if the player can craft a recipe (has all materials + gold)
  canCraft(recipeId) {
    const recipe = CRAFT_RECIPES[recipeId];
    if (!recipe) return false;

    // Check gold
    if (recipe.gold && gold < recipe.gold) return false;

    // Check materials
    if (recipe.materials) {
      for (const matId in recipe.materials) {
        const needed = recipe.materials[matId];
        const have = this.getMaterialCount(matId);
        if (have < needed) return false;
      }
    }

    // Check evolution prerequisite: gun must be at correct tier+level
    if (recipe.output && recipe.output.type === 'evolution') {
      const gunId = recipe.output.gunId;
      const toTier = recipe.output.toTier;
      const fromTier = toTier - 1;
      // Check player has this gun at fromTier, level 25
      if (typeof window._gunLevels === 'undefined') return false;
      const gunProg = window._gunLevels[gunId];
      if (!gunProg) return false;
      const curTier = (typeof gunProg === 'object') ? (gunProg.tier || 0) : 0;
      const curLevel = (typeof gunProg === 'object') ? (gunProg.level || gunProg) : gunProg;
      if (curTier !== fromTier || curLevel < 25) return false;
    }

    return true;
  },

  // Execute a craft: consume materials + gold, produce output
  craft(recipeId) {
    if (!this.canCraft(recipeId)) return false;
    const recipe = CRAFT_RECIPES[recipeId];

    // Deduct gold
    if (recipe.gold) {
      gold -= recipe.gold;
    }

    // Remove materials
    if (recipe.materials) {
      for (const matId in recipe.materials) {
        removeMaterial(matId, recipe.materials[matId]);
      }
    }

    // Produce output
    if (recipe.output) {
      if (recipe.output.type === 'evolution') {
        // Evolve the gun to the next tier
        const gunId = recipe.output.gunId;
        const toTier = recipe.output.toTier;
        if (typeof window._gunLevels !== 'undefined') {
          window._gunLevels[gunId] = { tier: toTier, level: 1 };
          // Rebuild inventory with new gun stats
          if (typeof resetCombatState === 'function') {
            resetCombatState('lobby');
          }
        }
        hitEffects.push({
          x: player.x, y: player.y - 40, life: 60, maxLife: 60,
          type: 'heal', dmg: 'EVOLVED: ' + recipe.name
        });
      }
    }

    // Auto-save after crafting
    if (typeof SaveLoad !== 'undefined') SaveLoad.save();
    return true;
  },

  // Get recipes filtered by category
  getRecipesByCategory(category) {
    const results = [];
    for (const id in CRAFT_RECIPES) {
      if (CRAFT_RECIPES[id].category === category) {
        results.push(CRAFT_RECIPES[id]);
      }
    }
    // Sort by tier
    results.sort((a, b) => (a.tier || 0) - (b.tier || 0));
    return results;
  },

  // Get all recipe categories
  getCategories() {
    const cats = new Set();
    for (const id in CRAFT_RECIPES) cats.add(CRAFT_RECIPES[id].category);
    return Array.from(cats);
  },
};
