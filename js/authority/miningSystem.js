// ===================== MINING SYSTEM =====================
// Authority: ore spawning, mining progress, ore collection
// Ores spawn when entering any mine room (mine_01 through mine_04).
// Player mines by equipping pickaxe + holding shoot (click / arrow keys).
// Mining XP is awarded via addSkillXP('Mining', xp).
//
// Scalability:
//   - Ore types → oreData.js (ORE_TYPES registry, MINE_ROOM_ORES mapping)
//   - Pickaxe tiers → interactable.js (PICKAXE_TIERS with miningSpeed multiplier)
//   - Mining tick rate scales with equipped pickaxe's miningSpeed
//   - Ore damage per tick scales with pickaxe damage
//   - To add new ores: add to ORE_TYPES + MINE_ROOM_ORES in oreData.js
//   - To add new pickaxes: add to PICKAXE_TIERS in interactable.js

// ===================== MINING CONSTANTS =====================
const MINING_CONFIG = {
  range: 90,              // pixels — max distance to mine
  baseTick: 44,           // base frames between mining hits (before pickaxe speed)
  nodeSize: 72,           // visual size in pixels (big chunky rocks)
  collisionRadius: 26,    // collision circle radius for player blocking
  hitFlashFrames: 6,      // frames of hit flash on each mining strike
  respawnTime: 600,       // ~10s at 60fps before regrow starts
  regrowFrames: 90,       // 1.5s — ore visually scales from rubble to full
  baseDamage: 1,          // base ore damage per tick (pickaxe damage adds to this)
  dirConeWidth: 0.85,     // directional check cone width (0-1, lower = wider)
};

// Ore spawning layout
const SPAWN_CONFIG = {
  groupCount: 18,         // number of ore groups across the mine
  oresPerGroupMin: 5,     // min ores per group
  oresPerGroupMax: 6,     // max ores per group
  innerSpacing: 1.2,      // min tiles between ores in same group (tight clusters)
  outerSpacing: 12,       // min tiles between group centers (veins far apart)
  wallMargin: 4,          // tiles from wall edge
  spawnClearance: 4,      // tiles clearance from spawn points
  exitClearance: 5,       // tiles clearance from exits/doors
  placementRadius: 2,     // ±tiles from group center for ore placement
  maxGroupAttempts: 80,   // placement attempts per group center
  maxOreAttempts: 20,     // placement attempts per ore within group
};

// ===================== DERIVED HELPERS =====================

// Get effective mining tick rate (scales with equipped pickaxe's miningSpeed)
function getMiningTickRate() {
  const equip = (typeof playerEquip !== 'undefined') ? playerEquip.melee : null;
  if (!equip || equip.special !== 'pickaxe') return MINING_CONFIG.baseTick;
  // Look up miningSpeed from PICKAXE_TIERS
  const tierData = (typeof PICKAXE_TIERS !== 'undefined')
    ? PICKAXE_TIERS.find(t => t.id === equip.id)
    : null;
  const speed = (tierData && tierData.miningSpeed) ? tierData.miningSpeed : 1.0;
  return Math.max(10, Math.round(MINING_CONFIG.baseTick / speed));
}

// Get ore damage per mining tick (scales with pickaxe damage)
function getOreDamagePerTick() {
  const equip = (typeof playerEquip !== 'undefined') ? playerEquip.melee : null;
  if (!equip || equip.special !== 'pickaxe') return MINING_CONFIG.baseDamage;
  // Higher tier pickaxes deal more damage per tick
  // Base pickaxe (10 dmg) = 1 damage, each 10 dmg adds 1
  return Math.max(1, Math.floor(equip.damage / 10));
}

// Create an ore item for inventory collection
function createOreItem(oreId) {
  const oreType = ORE_TYPES[oreId];
  if (!oreType) return createConsumable('ore_unknown', 'Unknown Ore', 1);
  const item = createConsumable('ore_' + oreId, oreType.name, 1);
  item.type = "material";
  item.tier = oreType.tier;
  item.data.value = oreType.value;
  item.data.color = oreType.color;
  item.data.oreId = oreId;
  return item;
}

// Legacy aliases for backward compat (other files may reference these)
const MINE_RANGE = MINING_CONFIG.range;
const MINE_TICK_RATE = MINING_CONFIG.baseTick;
const ORE_NODE_SIZE = MINING_CONFIG.nodeSize;
const ORE_COLLISION_RADIUS = MINING_CONFIG.collisionRadius;
const RESPAWN_TIME = MINING_CONFIG.respawnTime;
const REGROW_FRAMES = MINING_CONFIG.regrowFrames;

// Mining state
let miningTarget = null;      // ore node id currently being mined (or null)
let miningTimer = 0;          // frames until next mining "hit"
let miningProgress = 0;       // accumulated hits on current target

// Mining swing animation state (read by characterSprite.js)
window._miningActive = false;       // true while player is actively mining a target
window._miningSwingAngle = 0;       // current swing angle (radians) — driven by phase-based animation
window._miningSwingSpeed = 2;       // legacy (unused, kept for compat)
window._miningHitFlash = 0;         // frames remaining for hit flash (spike on each hit)
window._miningSwingPhase = 0;       // 0-1 normalized phase within one swing cycle
window._miningSwingDir = 1;         // 1 = winding up, -1 = striking down

// ===================== SPAWN ORE NODES =====================
// Called when entering any mine room. Spawns ores in tight groups
// using room-specific ore pools from MINE_ROOM_ORES.
function spawnOreNodes() {
  oreNodes.length = 0;
  if (!level) return;
  const SC = SPAWN_CONFIG;

  const groupCenters = []; // { tx, ty } of each group center

  // --- Phase 1: Pick group center positions ---
  for (let g = 0; g < SC.groupCount; g++) {
    for (let attempt = 0; attempt < SC.maxGroupAttempts; attempt++) {
      const tx = SC.wallMargin + Math.floor(Math.random() * (level.widthTiles - SC.wallMargin * 2));
      const ty = SC.wallMargin + Math.floor(Math.random() * (level.heightTiles - SC.wallMargin * 2));

      if (isSolid(tx, ty)) continue;

      // Avoid spawn point area
      let tooClose = false;
      if (level.spawns) {
        for (const key in level.spawns) {
          const sp = level.spawns[key];
          if (Math.abs(tx - sp.tx) < SC.spawnClearance && Math.abs(ty - sp.ty) < SC.spawnClearance) {
            tooClose = true; break;
          }
        }
      }
      if (tooClose) continue;

      // Avoid exit and door areas
      for (const e of (level.entities || [])) {
        if (e.type === 'mine_exit' || e.type === 'mine_door') {
          if (Math.abs(tx - (e.tx + (e.w || 1) / 2)) < SC.exitClearance && Math.abs(ty - (e.ty + (e.h || 1) / 2)) < SC.spawnClearance) {
            tooClose = true; break;
          }
        }
      }
      if (tooClose) continue;

      // Avoid other group centers
      for (const gc of groupCenters) {
        const edx = tx - gc.tx, edy = ty - gc.ty;
        if (edx * edx + edy * edy < SC.outerSpacing * SC.outerSpacing) {
          tooClose = true; break;
        }
      }
      if (tooClose) continue;

      groupCenters.push({ tx, ty });
      break;
    }
  }

  // --- Phase 2: Populate each group with ores ---
  const r = SC.placementRadius;
  const spread = r * 2 + 1; // total diameter for random offset
  for (const gc of groupCenters) {
    const oreCount = SC.oresPerGroupMin + Math.floor(Math.random() * (SC.oresPerGroupMax - SC.oresPerGroupMin + 1));
    const oreId = pickRandomOreForRoom(level.id);
    const oreType = ORE_TYPES[oreId];

    for (let i = 0; i < oreCount; i++) {
      for (let attempt = 0; attempt < SC.maxOreAttempts; attempt++) {
        const ox = gc.tx + Math.floor(Math.random() * spread) - r;
        const oy = gc.ty + Math.floor(Math.random() * spread) - r;

        if (isSolid(ox, oy)) continue;

        let tooClose = false;
        for (const existing of oreNodes) {
          const edx = ox - existing.tx, edy = oy - existing.ty;
          if (edx * edx + edy * edy < SC.innerSpacing * SC.innerSpacing) {
            tooClose = true; break;
          }
        }
        if (tooClose) continue;

        oreNodes.push({
          id: nextOreNodeId++,
          tx: ox, ty: oy,
          x: ox * TILE + TILE / 2,
          y: oy * TILE + TILE / 2,
          oreId: oreId,
          hp: oreType.hp,
          maxHp: oreType.hp,
          depleted: false,
          respawnTimer: 0,
          shimmerOffset: Math.random() * Math.PI * 2,
        });
        break;
      }
    }
  }
}

// ===================== UPDATE MINING =====================
// Called every frame from update(). Uses shootHeld + pickaxe check.
function updateMining() {
  if (!Scene.inMine) return;

  // --- Respawn tick: count down depleted ore timers ---
  for (const node of oreNodes) {
    if (!node.depleted) continue;
    if (node.respawnTimer > 0) {
      node.respawnTimer--;
      if (node.respawnTimer <= 0) {
        // Ore fully regrown — restore to minable
        node.depleted = false;
        node.hp = node.maxHp;
        node.respawnTimer = 0;
      }
    }
  }

  // Pickaxe mining — swings are handled by meleeSwing() (normal melee system).
  // This section only handles ore damage when player is swinging pickaxe at an ore.
  const isSwinging = InputIntent.shootHeld && melee.special === 'pickaxe' && activeSlot === 1;

  if (!isSwinging) {
    miningTarget = null;
    miningTimer = 0;
    miningProgress = 0;
    window._miningActive = false;
    window._miningHitFlash = Math.max(0, window._miningHitFlash - 1);
    return;
  }

  // Find nearest ore within range that is IN FRONT of the player (aim direction)
  // Use getAimDir() instead of player.dir — player.dir can revert after shootFaceTimer
  // expires (14 frames), but mining ticks are 44 frames. Using aim direction keeps
  // the directional check consistent for the entire mining cycle.
  const aimDir = (typeof getAimDir === 'function') ? getAimDir() : player.dir;
  let nearest = null;
  let nearestDist = MINE_RANGE + 1;
  for (const node of oreNodes) {
    if (node.depleted) continue;
    const dx = node.x - player.x;
    const dy = node.y - (player.y - 20); // hitbox center offset
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= nearestDist) continue;

    // Check if ore is in the aim direction (mouse/arrow keys)
    const cone = MINING_CONFIG.dirConeWidth;
    let inFront = false;
    switch (aimDir) {
      case 0: inFront = (dy > 0 && Math.abs(dx) < dist * cone); break; // DOWN
      case 1: inFront = (dy < 0 && Math.abs(dx) < dist * cone); break; // UP
      case 2: inFront = (dx < 0 && Math.abs(dy) < dist * cone); break; // LEFT
      case 3: inFront = (dx > 0 && Math.abs(dy) < dist * cone); break; // RIGHT
    }
    if (!inFront) continue;

    nearestDist = dist;
    nearest = node;
  }

  window._miningHitFlash = Math.max(0, window._miningHitFlash - 1);

  // No ore in front — pickaxe still swings (melee), just no mining
  if (!nearest) {
    miningTarget = null;
    miningTimer = 0;
    miningProgress = 0;
    window._miningActive = false;
    window._miningLockedNodeId = null;
    return;
  }

  // --- Mining level gate ---
  const oreType = ORE_TYPES[nearest.oreId];
  const miningLevel = (typeof skillData !== 'undefined' && skillData['Mining']) ? skillData['Mining'].level : 1;
  if (miningLevel < oreType.miningLevelReq) {
    miningTarget = null;
    miningTimer = 0;
    miningProgress = 0;
    window._miningActive = false;
    window._miningLockedNodeId = nearest.id;
    window._miningLockedReq = oreType.miningLevelReq;
    return;
  }
  window._miningLockedNodeId = null;
  window._miningActive = true;

  // Effective tick rate (scales with pickaxe miningSpeed from PICKAXE_TIERS)
  const tickRate = getMiningTickRate();

  // Switch target if changed
  if (miningTarget !== nearest.id) {
    miningTarget = nearest.id;
    // Start timer so the FIRST hit fires after the swing animation connects (~12 frames)
    // instead of waiting a full tick cycle
    miningTimer = tickRate - melee.swingDuration;
    miningProgress = 0;
  }

  // Mining tick — damages ore on a timer (separate from melee swing visual)
  miningTimer++;
  if (miningTimer >= tickRate) {
    miningTimer = 0;
    miningProgress++;

    // Ore damage scales with pickaxe tier (higher tier = more damage per tick)
    const dmgPerTick = getOreDamagePerTick();
    nearest.hp = Math.max(0, nearest.hp - dmgPerTick);
    window._miningHitFlash = MINING_CONFIG.hitFlashFrames;

    // Mining hit effect
    hitEffects.push({
      x: nearest.x + (Math.random() - 0.5) * 16,
      y: nearest.y + (Math.random() - 0.5) * 16,
      life: 15, maxLife: 15,
      type: "hit",
      dmg: dmgPerTick > 1 ? ("\u26CF " + dmgPerTick) : "\u26CF"
    });

    // Check if ore is depleted
    if (nearest.hp <= 0) {
      nearest.depleted = true;
      nearest.respawnTimer = MINING_CONFIG.respawnTime + MINING_CONFIG.regrowFrames;
      miningTarget = null;
      miningProgress = 0;

      // Collect ore into inventory (uses createOreItem factory)
      addToInventory(createOreItem(nearest.oreId));

      // Collection effect
      hitEffects.push({
        x: nearest.x,
        y: nearest.y - 20,
        life: 30, maxLife: 30,
        type: "heal",
        dmg: "+1 " + oreType.name
      });

      // Award Mining XP
      if (typeof addSkillXP === 'function') {
        addSkillXP('Mining', oreType.xp);
        hitEffects.push({
          x: nearest.x,
          y: nearest.y - 40,
          life: 25, maxLife: 25,
          type: "heal",
          dmg: "+" + oreType.xp + " Mining XP"
        });
      }
    }
  }
}

// ===================== DRAW ORE NODES =====================
// Renders ore nodes in world space. Called from draw() while ctx is translated.
function drawOreNodes() {
  if (!Scene.inMine) return;
  const t = Date.now() / 1000;

  for (const node of oreNodes) {
    // --- Depleted: rubble or regrowing ---
    if (node.depleted) {
      if (node.respawnTimer > REGROW_FRAMES) {
        // Still waiting — draw rubble (broken-down small rocks)
        const rs = ORE_NODE_SIZE * 0.4;
        const ore = ORE_TYPES[node.oreId];
        // Main rubble chunk
        ctx.fillStyle = ore.colorDark;
        ctx.beginPath();
        ctx.moveTo(node.x - rs, node.y + rs * 0.2);
        ctx.lineTo(node.x - rs * 0.6, node.y - rs * 0.5);
        ctx.lineTo(node.x + rs * 0.3, node.y - rs * 0.4);
        ctx.lineTo(node.x + rs * 0.8, node.y + rs * 0.1);
        ctx.lineTo(node.x + rs * 0.2, node.y + rs * 0.6);
        ctx.closePath();
        ctx.fill();
        // Second smaller chunk
        ctx.beginPath();
        ctx.moveTo(node.x + rs * 0.4, node.y - rs * 0.1);
        ctx.lineTo(node.x + rs * 1.1, node.y - rs * 0.3);
        ctx.lineTo(node.x + rs * 1.2, node.y + rs * 0.3);
        ctx.lineTo(node.x + rs * 0.6, node.y + rs * 0.4);
        ctx.closePath();
        ctx.fill();
        // Tiny scattered pebbles
        ctx.fillStyle = 'rgba(80,70,60,0.4)';
        ctx.beginPath(); ctx.arc(node.x - rs * 0.8, node.y + rs * 0.7, rs * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(node.x + rs * 1.3, node.y + rs * 0.5, rs * 0.15, 0, Math.PI * 2); ctx.fill();
        // Ore color flecks on rubble
        ctx.fillStyle = ore.color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath(); ctx.arc(node.x - rs * 0.2, node.y - rs * 0.2, rs * 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(node.x + rs * 0.7, node.y, rs * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1.0;
      } else {
        // Regrowing — draw ore at increasing scale (0.3 → 1.0)
        const regrowPct = 1 - (node.respawnTimer / REGROW_FRAMES); // 0 → 1
        const scale = 0.3 + regrowPct * 0.7; // 0.3 → 1.0
        const ore = ORE_TYPES[node.oreId];
        const s = ORE_NODE_SIZE * scale;
        const nx = node.x, ny = node.y;

        // Semi-transparent while regrowing
        ctx.globalAlpha = 0.5 + regrowPct * 0.5; // 0.5 → 1.0

        // Shadow (scaled)
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.ellipse(nx, ny + s * 0.55, s * 0.6, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rock body (scaled)
        ctx.fillStyle = ore.colorDark;
        ctx.beginPath();
        ctx.moveTo(nx - s * 0.5, ny + s * 0.3);
        ctx.lineTo(nx - s * 0.55, ny - s * 0.1);
        ctx.lineTo(nx - s * 0.3, ny - s * 0.5);
        ctx.lineTo(nx + s * 0.15, ny - s * 0.55);
        ctx.lineTo(nx + s * 0.5, ny - s * 0.3);
        ctx.lineTo(nx + s * 0.55, ny + s * 0.15);
        ctx.lineTo(nx + s * 0.3, ny + s * 0.4);
        ctx.closePath();
        ctx.fill();

        // Ore veins (scaled)
        ctx.fillStyle = ore.color;
        ctx.beginPath();
        ctx.moveTo(nx - s * 0.2, ny - s * 0.3);
        ctx.lineTo(nx + s * 0.1, ny - s * 0.4);
        ctx.lineTo(nx + s * 0.25, ny - s * 0.15);
        ctx.lineTo(nx, ny + s * 0.05);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1.0;
      }
      continue;
    }

    // --- Active ore (full size) ---
    const ore = ORE_TYPES[node.oreId];
    const bob = Math.sin(t * 1.5 + node.shimmerOffset) * 1.5;
    const nx = node.x, ny = node.y + bob;
    const s = ORE_NODE_SIZE;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(node.x, node.y + s * 0.55, s * 0.6, s * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rock body (irregular polygon)
    ctx.fillStyle = ore.colorDark;
    ctx.beginPath();
    ctx.moveTo(nx - s * 0.5, ny + s * 0.3);
    ctx.lineTo(nx - s * 0.55, ny - s * 0.1);
    ctx.lineTo(nx - s * 0.3, ny - s * 0.5);
    ctx.lineTo(nx + s * 0.15, ny - s * 0.55);
    ctx.lineTo(nx + s * 0.5, ny - s * 0.3);
    ctx.lineTo(nx + s * 0.55, ny + s * 0.15);
    ctx.lineTo(nx + s * 0.3, ny + s * 0.4);
    ctx.closePath();
    ctx.fill();

    // Ore veins (brighter patches)
    ctx.fillStyle = ore.color;
    ctx.beginPath();
    ctx.moveTo(nx - s * 0.2, ny - s * 0.3);
    ctx.lineTo(nx + s * 0.1, ny - s * 0.4);
    ctx.lineTo(nx + s * 0.25, ny - s * 0.15);
    ctx.lineTo(nx, ny + s * 0.05);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(nx + s * 0.15, ny + s * 0.05);
    ctx.lineTo(nx + s * 0.4, ny - s * 0.05);
    ctx.lineTo(nx + s * 0.35, ny + s * 0.25);
    ctx.lineTo(nx + s * 0.1, ny + s * 0.2);
    ctx.closePath();
    ctx.fill();

    // Sparkle
    const sparkAlpha = 0.3 + 0.3 * Math.sin(t * 3 + node.shimmerOffset);
    ctx.fillStyle = ore.sparkle;
    ctx.globalAlpha = sparkAlpha;
    ctx.beginPath();
    ctx.arc(nx - s * 0.1, ny - s * 0.25, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nx + s * 0.25, ny + s * 0.05, s * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(nx + s * 0.05, ny - s * 0.1, s * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // --- Ore name label (rendered on the ore sprite) ---
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = ore.color;
    ctx.fillText(ore.name, nx, ny - s * 0.62);
    ctx.textAlign = "left";

    // HP bar when partially mined
    if (node.hp < node.maxHp) {
      const barW = s * 1.0;
      const barH = 5;
      const barX = nx - barW / 2;
      const barY = ny - s * 0.78;
      const pct = node.hp / node.maxHp;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = pct > 0.5 ? '#5a5' : pct > 0.25 ? '#aa5' : '#a55';
      ctx.fillRect(barX, barY, barW * pct, barH);
    }

    // Mining indicator / level-locked feedback
    const dx = player.x - node.x;
    const dy = (player.y - 20) - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MINE_RANGE && melee.special === 'pickaxe' && activeSlot === 1 && !UI.anyOpen()) {
      // Check if level-locked — only show when player is ATTEMPTING to mine (shootHeld)
      const miningLevel = (typeof skillData !== 'undefined' && skillData['Mining']) ? skillData['Mining'].level : 1;
      if (miningLevel < ore.miningLevelReq && InputIntent.shootHeld) {
        // Level too low — show locked indicator
        ctx.font = "bold 11px monospace";
        ctx.fillStyle = "#ff4444";
        ctx.textAlign = "center";
        ctx.fillText("\uD83D\uDD12 Mining Lv." + ore.miningLevelReq, node.x, node.y - s * 0.85);
        ctx.textAlign = "left";
      } else if (miningLevel >= ore.miningLevelReq) {
        // "⛏" mine prompt
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.fillText("\u26CF Mine", node.x, node.y - s * 0.85);
        ctx.textAlign = "left";

        // Highlight glow
        ctx.strokeStyle = ore.sparkle;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 4);
        ctx.beginPath();
        ctx.arc(node.x, node.y, s * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
    } else if (dist < MINE_RANGE && !UI.anyOpen()) {
      // Show hint to equip pickaxe
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.textAlign = "center";
      ctx.fillText("Equip Pickaxe", node.x, node.y - s * 0.85);
      ctx.textAlign = "left";
    }
  }
}

// ===================== GET NEAREST MINABLE ORE =====================
// Returns the nearest non-depleted ore node within range, or null
function getNearestOre() {
  if (!Scene.inMine) return null;
  let nearest = null;
  let nearestDist = MINE_RANGE + 1;
  for (const node of oreNodes) {
    if (node.depleted) continue;
    const dx = player.x - node.x;
    const dy = (player.y - 20) - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = node;
    }
  }
  return nearest;
}

// ===================== ORE COLLISION =====================
// Pushes player out of non-depleted ore nodes. Call after player movement.
function resolveOreCollisions() {
  if (!Scene.inMine) return;
  const PLAYER_R = 16; // player hitbox half-width
  for (const node of oreNodes) {
    if (node.depleted) continue;
    const dx = player.x - node.x;
    const dy = player.y - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = PLAYER_R + ORE_COLLISION_RADIUS;
    if (dist < minDist && dist > 0.1) {
      const overlap = minDist - dist;
      const nx = dx / dist;
      const ny = dy / dist;
      player.x += nx * overlap;
      player.y += ny * overlap;
    }
  }
}
