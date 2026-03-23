// ===================== LOOT DROP SYSTEM =====================
// Authority: ground-based material drops from mob kills.
// Pattern: mirrors _orePickups from miningSystem.js
// Subscribes to mob_killed event, spawns drops at death position,
// handles pickup collision, despawn timers, and rendering.

let _groundDrops = [];
let _groundDropCounter = 0;

// Spawn a material drop on the ground
function spawnGroundDrop(materialId, count, x, y, ownerId) {
  _groundDrops.push({
    id: 'drop_' + (_groundDropCounter++),
    materialId: materialId,
    count: count,
    x: x,
    y: y,
    life: 1800,  // 30s at 60fps
    bobOffset: Math.random() * Math.PI * 2,
    ownerId: ownerId || 'player',
    ownerLeft: false,
  });
}

// Clear all ground drops (called on scene change)
function clearGroundDrops() {
  _groundDrops.length = 0;
}

// ---- EVENT SUBSCRIBER: mob_killed → spawn drops ----
Events.on('mob_killed', ({ mob, source, killerId, killerMember }) => {
  // Skip skeleton/summon kills — no loot
  if (source === 'witch_skeleton') return;
  if (mob.type === 'skeleton' || mob.type === 'mini_golem') return;

  // Only drop in dungeons
  if (!Scene.inDungeon) return;

  const dungeonId = typeof GameState !== 'undefined' ? GameState.currentDungeon : 'cave';
  const floor = typeof dungeonFloor !== 'undefined' ? dungeonFloor : 1;

  const drop = getMobDrop(mob.type, dungeonId, floor);
  if (!drop) return;

  // Determine killer owner ID for pickup ownership
  const owner = killerId || 'player';
  spawnGroundDrop(drop.materialId, drop.count, mob.x, mob.y, owner);
});

// ---- UPDATE: tick drops, check pickup collision ----
function updateGroundDrops() {
  if (!Scene.inDungeon) { _groundDrops.length = 0; return; }

  for (let i = _groundDrops.length - 1; i >= 0; i--) {
    const d = _groundDrops[i];
    d.life--;
    if (d.life <= 0) { _groundDrops.splice(i, 1); continue; }

    // Check pickup by player
    const dx = player.x - d.x;
    const dy = (player.y - 20) - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 40) {
      // Ownership check: player can pick up own drops or abandoned drops
      if (d.ownerId === 'player' || d.ownerLeft) {
        const item = createMaterialItem(d.materialId, d.count);
        if (addToInventory(item)) {
          const mat = CRAFT_MATERIALS[d.materialId];
          const name = mat ? mat.name : d.materialId;
          const countStr = d.count > 1 ? '+' + d.count + ' ' : '+';
          hitEffects.push({ x: d.x, y: d.y - 20, life: 30, maxLife: 30, type: 'heal', dmg: countStr + name });
          _groundDrops.splice(i, 1);
          continue;
        }
        // Inventory full — item stays on ground
      }
    }

    // Check pickup by party bots — bots don't pick up (per plan), but mark drops
    // as ownerLeft if the bot that owns them has left the party
    if (d.ownerId !== 'player' && !d.ownerLeft && typeof PartyState !== 'undefined') {
      const ownerMember = PartyState.members.find(m => m.id === d.ownerId);
      if (!ownerMember || !ownerMember.active) {
        d.ownerLeft = true; // bot left — anyone can grab
      }
    }
  }
}

// ---- DRAW: render ground drops (called from draw.js in world space) ----
function drawGroundDrops() {
  if (!Scene.inDungeon || _groundDrops.length === 0) return;
  const t = Date.now() / 1000;

  for (const d of _groundDrops) {
    const mat = CRAFT_MATERIALS[d.materialId];
    if (!mat) continue;

    const bob = Math.sin(t * 3 + d.bobOffset) * 4;
    const fadeAlpha = d.life < 120 ? d.life / 120 : 1;
    const tier = mat.tier;

    ctx.globalAlpha = fadeAlpha;

    // Tier-colored glow
    const glowR = 12 + tier * 3;
    const glowAlpha = 0.15 + tier * 0.05;
    ctx.fillStyle = mat.color;
    ctx.globalAlpha = fadeAlpha * glowAlpha;
    ctx.beginPath(); ctx.arc(d.x, d.y + bob, glowR, 0, Math.PI * 2); ctx.fill();

    // Main circle
    ctx.globalAlpha = fadeAlpha;
    ctx.fillStyle = mat.color;
    ctx.beginPath(); ctx.arc(d.x, d.y + bob, 8, 0, Math.PI * 2); ctx.fill();

    // Inner highlight
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = fadeAlpha * 0.4;
    ctx.beginPath(); ctx.arc(d.x - 2, d.y + bob - 2, 3, 0, Math.PI * 2); ctx.fill();

    // Sparkle for higher tiers
    if (tier >= 2) {
      const sparkleAlpha = fadeAlpha * (0.3 + 0.3 * Math.sin(t * 5 + d.bobOffset));
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = sparkleAlpha;
      ctx.beginPath(); ctx.arc(d.x + 4, d.y + bob - 5, 1.5, 0, Math.PI * 2); ctx.fill();
      if (tier >= 3) {
        ctx.beginPath(); ctx.arc(d.x - 5, d.y + bob + 2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Count badge (if > 1)
    if (d.count > 1) {
      ctx.globalAlpha = fadeAlpha;
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('x' + d.count, d.x, d.y + bob - 12);
    }

    ctx.globalAlpha = 1.0;
  }
  ctx.textAlign = 'left';
}
