// ===================== CRAFTING SYSTEM =====================
// Authority: single source of truth for upgrades and evolutions.
// Uses getProgUpgradeRecipe() and getEvolutionCost() from progressionData.js.
// Uses countMaterialInInventory() and removeMaterial() from inventorySystem.js.

const CraftingSystem = {
  // Count how many of a material the player has (handles multiple stacks)
  getMaterialCount(materialId) {
    return countMaterialInInventory(materialId);
  },

  // ---- UPGRADE (level up within tier) ----

  // Check if player can afford an upgrade for itemId at current tier → toLevel
  canUpgrade(itemId, tier, toLevel) {
    const recipe = getProgUpgradeRecipe(itemId, tier, toLevel);
    if (!recipe) return false;
    if (gold < recipe.gold) return false;
    if (recipe.ores) {
      for (const oreId in recipe.ores) {
        if (this.getMaterialCount('ore_' + oreId) < recipe.ores[oreId]) return false;
      }
    }
    if (recipe.parts) {
      for (const partId in recipe.parts) {
        if (this.getMaterialCount(partId) < recipe.parts[partId]) return false;
      }
    }
    return true;
  },

  // Execute an upgrade: deduct costs, bump level
  upgrade(gunId, tier, currentLevel) {
    const toLevel = currentLevel + 1;
    if (!this.canUpgrade(gunId, tier, toLevel)) return false;
    const recipe = getProgUpgradeRecipe(gunId, tier, toLevel);

    // Deduct gold
    gold -= recipe.gold;

    // Deduct ores
    if (recipe.ores) {
      for (const oreId in recipe.ores) {
        removeMaterial('ore_' + oreId, recipe.ores[oreId]);
      }
    }

    // Deduct parts
    if (recipe.parts) {
      for (const partId in recipe.parts) {
        removeMaterial(partId, recipe.parts[partId]);
      }
    }

    // Apply progression
    _setGunProgress(gunId, tier, toLevel);
    if (typeof resetCombatState === 'function') resetCombatState('lobby');

    hitEffects.push({
      x: player.x, y: player.y - 40, life: 40, maxLife: 40,
      type: 'heal', dmg: 'LEVEL UP!'
    });

    if (typeof SaveLoad !== 'undefined') SaveLoad.save();
    return true;
  },

  // ---- EVOLVE / PRESTIGE (tier up, reset to level 1) ----

  // Check if player can afford evolution from current tier
  canEvolve(gunId, tier) {
    const prog = _getGunProgress(gunId);
    if (!prog.owned || prog.tier !== tier || prog.level < 25) return false;
    if (tier >= PROGRESSION_CONFIG.TIERS - 1) return false;

    const evoCost = getEvolutionCost(tier, gunId);
    if (!evoCost) return false;

    if (gold < evoCost.gold) return false;
    if (evoCost.materials) {
      for (const matId in evoCost.materials) {
        if (this.getMaterialCount(matId) < evoCost.materials[matId]) return false;
      }
    }
    return true;
  },

  // Execute an evolution: deduct costs, bump tier, reset level to 1
  evolve(gunId, tier) {
    if (!this.canEvolve(gunId, tier)) return false;
    const evoCost = getEvolutionCost(tier, gunId);

    // Deduct gold
    gold -= evoCost.gold;

    // Deduct materials
    if (evoCost.materials) {
      for (const matId in evoCost.materials) {
        removeMaterial(matId, evoCost.materials[matId]);
      }
    }

    // Apply progression
    const nextTier = tier + 1;
    _setGunProgress(gunId, nextTier, 1);
    if (typeof resetCombatState === 'function') resetCombatState('lobby');

    const nextName = PROGRESSION_CONFIG.TIER_NAMES[nextTier] || '???';
    hitEffects.push({
      x: player.x, y: player.y - 40, life: 60, maxLife: 60,
      type: 'heal', dmg: 'PRESTIGE: ' + nextName + '!'
    });

    if (typeof SaveLoad !== 'undefined') SaveLoad.save();
    return true;
  },
};
