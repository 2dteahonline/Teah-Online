// ===================== GUN SYSTEM =====================
// Core: gun firing, reloading, bullet updates
// Extracted from index_2.html — Phase E

// ===================== GUN SYSTEM =====================
// CT-Zero — 4 stats on 1-100 scale
// Total points = 100, distributed in increments of 5
// Firerate: how fast it shoots
// Freeze: how much you slow down after shooting
// Spread: bullet curve (0 = straight)
// Stack: bullets per shot (0 = 1 bullet)
//
// Current meta build: 50/50 firerate/freeze

const gunStats = {
  firerate: 80,
  freeze: 20,
  spread: 0,
  stack: 0,
};
// Validation: must sum to 100, increments of 5
// console.assert(gunStats.firerate + gunStats.freeze + gunStats.spread + gunStats.stack === 100);

// Convert stats (0-100) to actual game values
// All timers scaled to match 3x movement speed (world feels same relative pace)
// Firerate: 0=50frames(0.83sec), 100=3frames(0.05sec). At 50: ~26 frames (~0.43sec)
function getFireRate() {
  if (playerEquip.gun && playerEquip.gun.fireRate) return playerEquip.gun.fireRate * 4;
  const base = Math.round(58 - gunStats.firerate * 0.55);
  return Math.round(base * (1 - fireRateBonus * 0.01)) * 4;
}
// Freeze duration: 10 frames default, per-gun override for CT-X
function getFreezeDuration() {
  if (playerEquip.gun && playerEquip.gun.freezeDuration != null) return playerEquip.gun.freezeDuration;
  return 15;
}
// Freeze max speed penalty: very light — 0=no slowdown, 100=25% slowdown. At 50: 12.5% slowdown
function getFreezePenalty() {
  if (playerEquip.gun && playerEquip.gun.freezePenalty != null) return playerEquip.gun.freezePenalty;
  return Math.min(0.25, gunStats.freeze * 0.0025);
}
// Reload: faster base, still scales with firerate
// firerate 0 = 40 frames (0.67sec), firerate 100 = 90 frames (~1.5sec). At 50: ~65 frames (~1.1sec)
function getReloadTime() { return Math.round(40 + gunStats.firerate * 0.5); }

// gun → js/authority/gameState.js

// Freeze state
let freezeTimer = 0;

// bullets, hitEffects, deathEffects → js/authority/gameState.js
// nextBulletId → js/authority/gameState.js (global, loaded before all systems)
const BULLET_SPEED = 3.75;

function spawnDeathEffect(m) {
  const colors = {
    witch: ["#a060e0","#8040c0","#c080ff","#6020a0"],
    golem: ["#8a8580","#6a6560","#a09a90","#585450"],
    mini_golem: ["#9a9590","#7a7570","#b0aaa0","#686460"],
    mummy: ["#c8b878","#a89858","#e0d098","#887838"],
    healer: ["#ffdd30","#ffe870","#ffc800","#ffee90"],
    archer: ["#30ff20","#1a1a1a","#0e0e0e","#20cc10"],
    skeleton: ["#d8d0c0","#c8c0b0","#e0d8c8","#b8b0a0"],
    grunt: ["#aa4444","#884444","#cc6666","#663333"],
    runner: ["#cc6644","#aa4422","#ee8866","#883322"],
    tank: ["#4466aa","#335588","#6688cc","#224466"],
  };
  const c = colors[m.type] || ["#888","#666","#aaa","#444"];
  const isGolemType = m.type === "golem" || m.type === "mini_golem";
  const count = m.type === "golem" ? 24 : m.type === "mini_golem" ? 16 : m.type === "witch" ? 18 : 12;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5) * 0.5;
    const speed = 1.5 + Math.random() * 3;
    const sz = isGolemType ? 4 + Math.random() * 6 : 2 + Math.random() * 4;
    deathEffects.push({
      x: m.x + (Math.random() - 0.5) * 20,
      y: m.y - 20 + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 30 + Math.random() * 25,
      maxLife: 55,
      size: sz,
      color: c[Math.floor(Math.random() * c.length)],
      type: m.type,
      gravity: isGolemType ? 0.15 : m.type === "witch" ? -0.05 : 0.08,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
    });
  }

  // Special per-type death burst
  if (m.type === "witch") {
    // Purple implosion ring
    deathEffects.push({ x: m.x, y: m.y - 20, vx: 0, vy: 0, life: 25, maxLife: 25, size: 0, color: "#a060e0", type: "witch_ring", gravity: 0, rot: 0, rotSpeed: 0 });
  } else if (m.type === "golem" || m.type === "mini_golem") {
    // Ground shockwave (smaller for mini)
    const shockLife = m.type === "mini_golem" ? 20 : 30;
    deathEffects.push({ x: m.x, y: m.y, vx: 0, vy: 0, life: shockLife, maxLife: shockLife, size: 0, color: "#8a8580", type: "golem_shockwave", gravity: 0, rot: 0, rotSpeed: 0 });
  } else if (m.type === "mummy") {
    // Bandage unravel spirals
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i / 8);
      deathEffects.push({
        x: m.x, y: m.y - 20, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 1,
        life: 40, maxLife: 40, size: 12 + Math.random() * 6,
        color: "#c8b878", type: "bandage", gravity: 0.05,
        rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  } else if (m.type === "healer") {
    // Golden cross burst
    deathEffects.push({ x: m.x, y: m.y - 20, vx: 0, vy: 0, life: 30, maxLife: 30, size: 0, color: "#ffdd30", type: "healer_cross", gravity: 0, rot: 0, rotSpeed: 0 });
  } else if (m.type === "archer") {
    // Green poison cloud
    for (let i = 0; i < 6; i++) {
      deathEffects.push({
        x: m.x + (Math.random()-0.5)*20, y: m.y - 15 + (Math.random()-0.5)*15,
        vx: (Math.random()-0.5)*1.5, vy: -0.5 - Math.random(),
        life: 35, maxLife: 35, size: 8 + Math.random() * 8,
        color: "#30ff20", type: "poison_cloud", gravity: -0.02,
        rot: 0, rotSpeed: 0,
      });
    }
  }
}

function updateDeathEffects() {
  for (let i = deathEffects.length - 1; i >= 0; i--) {
    const p = deathEffects[i];
    p.life--;
    if (p.life <= 0) { deathEffects.splice(i, 1); continue; }
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.vx *= 0.97;
    p.rot += p.rotSpeed;
  }
}

function drawDeathEffects() {
  for (const p of deathEffects) {
    const alpha = Math.min(1, p.life / (p.maxLife * 0.4));

    if (p.type === "witch_ring") {
      // Purple implosion → explosion ring
      const progress = 1 - (p.life / p.maxLife);
      const r = progress < 0.3 ? (1 - progress / 0.3) * 40 : (progress - 0.3) * 60;
      ctx.strokeStyle = `rgba(160,96,224,${alpha * 0.7})`;
      ctx.lineWidth = 3 - progress * 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      // Inner flash
      if (progress < 0.3) {
        ctx.fillStyle = `rgba(200,140,255,${alpha * 0.4})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, Math.PI * 2); ctx.fill();
      }
    } else if (p.type === "golem_shockwave") {
      const progress = 1 - (p.life / p.maxLife);
      const r = progress * 80;
      ctx.strokeStyle = `rgba(138,133,128,${alpha * 0.5})`;
      ctx.lineWidth = 4 * (1 - progress);
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
      // Dust ring
      ctx.fillStyle = `rgba(100,95,85,${alpha * 0.2})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "bandage") {
      // Bandage strip — rotated rectangle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(200,184,120,${alpha})`;
      ctx.fillRect(-p.size / 2, -2, p.size, 4);
      ctx.strokeStyle = `rgba(168,152,88,${alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(-p.size / 2, -2, p.size, 4);
      ctx.restore();
    } else if (p.type === "healer_cross") {
      const progress = 1 - (p.life / p.maxLife);
      const rise = progress * 30;
      const sz = 12 + progress * 8;
      ctx.fillStyle = `rgba(255,221,48,${alpha * 0.8})`;
      ctx.fillRect(p.x - 2, p.y - rise - sz, 4, sz * 2);
      ctx.fillRect(p.x - sz * 0.6, p.y - rise - 2, sz * 1.2, 4);
      // Glow
      ctx.fillStyle = `rgba(255,238,100,${alpha * 0.2})`;
      ctx.beginPath(); ctx.arc(p.x, p.y - rise, sz, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "poison_cloud") {
      ctx.fillStyle = `rgba(48,255,32,${alpha * 0.25})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(80,200,40,${alpha * 0.15})`;
      ctx.beginPath(); ctx.arc(p.x + 3, p.y - 2, p.size * 0.7, 0, Math.PI * 2); ctx.fill();
    } else {
      // Standard particle — square with rotation
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color.replace(")", `,${alpha})`).replace("rgb", "rgba").replace("##", "#");
      // Simple approach: use globalAlpha
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }
}

// === MOB AMBIENT EFFECTS ===
// mobParticles → js/authority/gameState.js
function updateMobAmbientEffects() {
  // Spawn ambient particles for special mobs
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    const t = Date.now();

    // Witch — purple orbiting sparkles
    if (m.type === "witch" && t % 6 === 0) {
      mobParticles.push({
        x: m.x + (Math.random()-0.5) * 30,
        y: m.y - 25 + (Math.random()-0.5) * 25,
        vx: (Math.random()-0.5) * 0.5,
        vy: -0.5 - Math.random() * 0.5,
        life: 30 + Math.random() * 20,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? "#b070e0" : "#8040c0",
        type: "sparkle",
      });
    }

    // Golem — ground dust when moving
    if ((m.type === "golem" || m.type === "mini_golem") && Math.floor(m.frame) % 12 === 0 && m.frame > 0) {
      for (let i = 0; i < 3; i++) {
        mobParticles.push({
          x: m.x + (Math.random()-0.5) * 20,
          y: m.y + 10 + Math.random() * 5,
          vx: (Math.random()-0.5) * 1.5,
          vy: -0.3 - Math.random() * 0.5,
          life: 20 + Math.random() * 15,
          size: 3 + Math.random() * 4,
          color: "#7a7560",
          type: "dust",
        });
      }
    }

    // Mummy — trailing sand/bandage wisps
    if (m.type === "mummy" && t % 8 === 0) {
      mobParticles.push({
        x: m.x + (Math.random()-0.5) * 16,
        y: m.y - 10 + (Math.random()-0.5) * 20,
        vx: (Math.random()-0.5) * 0.8,
        vy: 0.2 + Math.random() * 0.3,
        life: 25 + Math.random() * 15,
        size: 1.5 + Math.random() * 2.5,
        color: Math.random() > 0.5 ? "#c8b878" : "#a89858",
        type: "sand",
      });
    }

    // Healer — golden motes rising
    if (m.type === "healer" && t % 10 === 0) {
      mobParticles.push({
        x: m.x + (Math.random()-0.5) * 24,
        y: m.y - 15 + (Math.random()-0.5) * 20,
        vx: (Math.random()-0.5) * 0.3,
        vy: -0.8 - Math.random() * 0.5,
        life: 30 + Math.random() * 20,
        size: 1.5 + Math.random() * 2,
        color: Math.random() > 0.5 ? "#ffdd30" : "#ffe870",
        type: "sparkle",
      });
    }

    // Archer — faint green toxic drip
    if (m.type === "archer" && t % 12 === 0) {
      mobParticles.push({
        x: m.x + (Math.random()-0.5) * 10,
        y: m.y - 30 + Math.random() * 10,
        vx: (Math.random()-0.5) * 0.2,
        vy: 0.4 + Math.random() * 0.3,
        life: 20 + Math.random() * 10,
        size: 1 + Math.random() * 1.5,
        color: "#30ff20",
        type: "drip",
      });
    }
  }

  // Update particles
  for (let i = mobParticles.length - 1; i >= 0; i--) {
    const p = mobParticles[i];
    p.life--;
    if (p.life <= 0) { mobParticles.splice(i, 1); continue; }
    p.x += p.vx;
    p.y += p.vy;
    if (p.type === "dust") p.vy -= 0.02;
  }

  // Cap particles hard
  if (mobParticles.length > 100) mobParticles.splice(0, mobParticles.length - 100);
}

function drawMobAmbientEffects() {
  for (const p of mobParticles) {
    const alpha = Math.min(1, p.life / 15);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.type === "sparkle") {
      // Diamond sparkle
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Date.now() * 0.005 + p.x);
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    } else if (p.type === "dust") {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    } else if (p.type === "sand") {
      ctx.fillRect(p.x - p.size/2, p.y - 0.5, p.size, 1.5);
    } else if (p.type === "drip") {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      // Drip trail
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(p.x - 0.5, p.y - 4, 1, 4);
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// === MOB GROUND INDICATORS ===
function drawMobGroundEffects() {
  for (const m of mobs) {
    if (m.hp <= 0) continue;
    const t = Date.now();

    // Witch — dark magic circle on ground
    if (m.type === "witch") {
      const castAlpha = m.castTimer > 0 ? 0.4 : 0.1;
      const rotAngle = t * 0.002;
      ctx.save();
      ctx.translate(m.x, m.y + 10);
      ctx.rotate(rotAngle);
      ctx.strokeStyle = `rgba(140,60,200,${castAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
      // Inner runes
      for (let r = 0; r < 4; r++) {
        const ra = (r / 4) * Math.PI * 2;
        const rx = Math.cos(ra) * 18, ry = Math.sin(ra) * 10;
        ctx.fillStyle = `rgba(180,100,255,${castAlpha * 0.8})`;
        ctx.fillRect(rx - 2, ry - 2, 4, 4);
      }
      ctx.restore();
    }

    // Golem — cracks/shadow under feet
    if (m.type === "golem" || m.type === "mini_golem") {
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 14, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Crack lines
      if (m.throwAnim > 0) {
        const throwA = 0.5 * (m.throwAnim / 30);
        ctx.strokeStyle = `rgba(255,140,40,${throwA})`;
        ctx.lineWidth = 2;
        for (let c = 0; c < 5; c++) {
          const ca = (c / 5) * Math.PI * 2 + t * 0.001;
          ctx.beginPath();
          ctx.moveTo(m.x + Math.cos(ca) * 10, m.y + 10 + Math.sin(ca) * 4);
          ctx.lineTo(m.x + Math.cos(ca) * 30, m.y + 10 + Math.sin(ca) * 12);
          ctx.stroke();
        }
      }
    }

    // Healer — healing zone indicator
    if (m.type === "healer" && m.healAnim > 0) {
      const ha = m.healAnim / 30;
      const pulseR = 50 + (1 - ha) * 30;
      ctx.strokeStyle = `rgba(255,220,50,${ha * 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.arc(m.healZoneX || m.x, m.healZoneY || m.y, pulseR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      // Inner glow
      ctx.fillStyle = `rgba(255,240,100,${ha * 0.06})`;
      ctx.beginPath(); ctx.arc(m.healZoneX || m.x, m.healZoneY || m.y, pulseR, 0, Math.PI * 2); ctx.fill();
    }

    // Mummy — armed warning sand swirl
    if (m.type === "mummy" && m.mummyArmed) {
      const urgency = 1 - (m.mummyFuse / (MOB_TYPES.mummy?.fuseMax || 120));
      const swirl = t * 0.008;
      for (let s = 0; s < 6; s++) {
        const sa = swirl + (s / 6) * Math.PI * 2;
        const sr = 15 + urgency * 20;
        const sx = m.x + Math.cos(sa) * sr;
        const sy = m.y - 10 + Math.sin(sa) * sr * 0.5;
        ctx.fillStyle = `rgba(200,180,100,${0.3 + urgency * 0.4})`;
        ctx.beginPath(); ctx.arc(sx, sy, 2 + urgency * 2, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Archer — shadow pool
    if (m.type === "archer") {
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.beginPath(); ctx.ellipse(m.x, m.y + 10, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Faint green eye trails
      if (m.bowDrawAnim > 0) {
        const da = m.bowDrawAnim / 45;
        ctx.fillStyle = `rgba(48,255,32,${da * 0.3})`;
        const eyeOff = m.dir === 2 ? -8 : m.dir === 3 ? 8 : 0;
        ctx.beginPath(); ctx.arc(m.x + eyeOff, m.y - 35, 4 + da * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}
function getAimDir() {
  if (InputIntent.arrowShooting) return InputIntent.arrowAimDir;
  const psx = player.x - camera.x;
  const psy = player.y - camera.y - 30;
  const dx = InputIntent.mouseX - psx;
  const dy = InputIntent.mouseY - psy;
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 3 : 2;
  } else {
    return dy > 0 ? 0 : 1;
  }
}

// Get gun muzzle world position — consistent with drawRifle
function getMuzzlePos(aimDir) {
  const x = player.x - 20;
  const y = player.y - 68;
  const bodyL = x + 2;
  const bodyR = x + 36;
  const armY = y + 35;
  if (aimDir === 0) { // down
    return { x: bodyR + 1, y: armY + 6 + 49 };
  } else if (aimDir === 1) { // up
    return { x: bodyL - 1, y: y + 28 - 49 };
  } else if (aimDir === 2) { // left
    return { x: bodyL + 2 - 49, y: armY };
  } else { // right
    return { x: bodyR + 9 + 49, y: armY };
  }
}

function shoot() {
  if (gun.ammo <= 0 || gun.reloading || gun.fireCooldown > 0) return;

  const aimDir = getAimDir();
  
  // Face the shoot direction temporarily
  shootFaceDir = aimDir;
  shootFaceTimer = SHOOT_FACE_DURATION;

  // Apply freeze (can't move while frozen) — reduced for higher tier guns
  let freezeMult = 1.0;
  if (playerEquip.gun && playerEquip.gun.tier >= 4) freezeMult = 0.3;
  else if (playerEquip.gun && playerEquip.gun.tier >= 3) freezeMult = 0.5;
  freezeTimer = Math.round(getFreezeDuration() * freezeMult);

  let vx = 0, vy = 0;
  if (aimDir === 0) vy = BULLET_SPEED;
  else if (aimDir === 1) vy = -BULLET_SPEED;
  else if (aimDir === 2) vx = -BULLET_SPEED;
  else vx = BULLET_SPEED;

  // Spawn from actual gun muzzle
  const muzzle = getMuzzlePos(aimDir);

  // Stack: 0 = 1 bullet, higher = more bullets per shot
  const stackCount = 1 + Math.floor(gunStats.stack / 10);
  for (let s = 0; s < stackCount; s++) {
    let bvx = vx, bvy = vy;

    // Spread: add curve to extra bullets (0 = straight)
    // When spread > 0 and stack > 1, bullets fan out
    // For spread 0, all bullets go perfectly straight

    // Bullet color based on equipped gun
    const bulletColorMap = {
      smg: { main: "#80ff80", core: "#c0ffc0", glow: "rgba(80,255,80,0.2)" },
      rifle: { main: "#ff80c0", core: "#ffc0e0", glow: "rgba(255,80,180,0.2)" },
      frost_rifle: { main: "#80d0ff", core: "#c0e8ff", glow: "rgba(80,200,255,0.2)" },
      inferno_cannon: { main: "#ff6030", core: "#ffa080", glow: "rgba(255,80,30,0.25)" },
    };
    const gunId = playerEquip.gun ? playerEquip.gun.id : null;
    const bColor = gunId ? bulletColorMap[gunId] || null : null;

    bullets.push({
      id: nextBulletId++,
      x: muzzle.x,
      y: muzzle.y,
      vx: bvx, vy: bvy,
      fromPlayer: true,
      bulletColor: bColor,
    });
  }

  gun.ammo--;
  gun.fireCooldown = getFireRate();
  gun.recoilTimer = 6; // recoil animation frames

  if (gun.ammo <= 0) {
    gun.reloading = true;
    gun.reloadTimer = getReloadTime();
  }
}

function updateGun() {
  if (gun.fireCooldown > 0) gun.fireCooldown--;
  if (gun.recoilTimer > 0) gun.recoilTimer--;

  if (gun.reloading) {
    gun.reloadTimer--;
    if (gun.reloadTimer <= 0) {
      gun.ammo = gun.magSize;
      gun.reloading = false;
    }
  }

  // Continuous shooting — authority reads InputIntent.shootHeld (set by mouse/arrow keys)
  if (InputIntent.shootHeld && !InputIntent.chatActive && !nameEditActive && !statusEditActive) {
    if (activeSlot === 0) shoot();
    else if (activeSlot === 1) {
      meleeSwing();
    }
    else if (activeSlot === 2) usePotion();
  }
}

// ===================== CT-X MODIFY GUN PANEL (/mg) =====================
// Slider panel to tweak CT-X freeze penalty and fire rate in real-time.
// Only affects CT_X_GUN — other guns are untouched.

let _mgDragging = null; // 'freeze' | 'rof' | null
let _ctxFreeze = 85;   // slider value 0-100 (default: 85 = 0.15 penalty)
let _ctxRof = 50;      // slider value 0-100 (default: 50 = 12f)

// Slider config: min, max, step, and how to read/write the value
const _mgSliders = {
  freeze: {
    label: 'Freeze',
    desc: 'Higher = less slowdown after shooting.',
    min: 0, max: 100, step: 5,
    // Display 0-100 where 0=worst(1.0 penalty = full stop), 100=best(0 penalty)
    // Stores slider 0-100 in _ctxFreeze, converts to penalty for gameplay
    get: () => (typeof _ctxFreeze !== 'undefined') ? _ctxFreeze : 85,
    set: (v) => {
      _ctxFreeze = v;
      const penalty = 1 - v / 100;
      CT_X_GUN.freezePenalty = penalty;
      if (playerEquip.gun && playerEquip.gun.id === 'ct_x') playerEquip.gun.freezePenalty = penalty;
    },
    display: (v) => v.toFixed(0)
  },
  rof: {
    label: 'RoF',
    desc: 'Higher = faster rate of fire.',
    min: 0, max: 100, step: 5,
    // Linear: 0%=20f (slowest), 100%=4f (fastest)
    // Stores slider 0-100 in _ctxRof, converts to frames for gameplay
    get: () => (typeof _ctxRof !== 'undefined') ? _ctxRof : 50,
    set: (v) => {
      _ctxRof = v;
      const frames = Math.round(20 - (v / 100) * (20 - 2));
      CT_X_GUN.fireRate = frames;
      if (playerEquip.gun && playerEquip.gun.id === 'ct_x') playerEquip.gun.fireRate = frames;
    },
    display: (v) => v.toFixed(0)
  }
};

function drawModifyGunPanel() {
  if (!UI.isOpen('modifygun')) return;

  const pw = 500, ph = 340;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Dimmed backdrop
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  // Panel bg
  ctx.fillStyle = "#0c1018";
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
  ctx.strokeStyle = "rgba(100,220,160,0.35)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.stroke();

  // Title bar
  ctx.fillStyle = "rgba(30,60,45,0.5)";
  ctx.beginPath(); ctx.roundRect(px + 3, py + 3, pw - 6, 46, [10, 10, 0, 0]); ctx.fill();
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = PALETTE.accent;
  ctx.textAlign = "center";
  ctx.fillText("CT-X  Weapon Config", px + pw / 2, py + 32);

  // Close button
  ctx.fillStyle = PALETTE.closeBtn;
  ctx.beginPath(); ctx.roundRect(px + pw - 42, py + 8, 32, 32, 6); ctx.fill();
  ctx.font = "bold 18px monospace"; ctx.fillStyle = "#fff";
  ctx.textAlign = "center"; ctx.fillText("\u2715", px + pw - 26, py + 30);

  // Draw sliders
  const sliderX = px + 40, sliderW = pw - 80;
  const keys = ['freeze', 'rof'];
  let sy = py + 70;

  for (const key of keys) {
    const s = _mgSliders[key];
    const val = s.get();
    const norm = (val - s.min) / (s.max - s.min);

    // Label
    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(s.label, px + pw / 2, sy + 4);

    // Description
    ctx.font = "12px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText(s.desc, px + pw / 2, sy + 22);

    // Slider track
    const trackY = sy + 38, trackH = 28;
    ctx.fillStyle = "#1a2a22";
    ctx.strokeStyle = "#3a6a4a";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(sliderX, trackY, sliderW, trackH, 6); ctx.fill();
    ctx.beginPath(); ctx.roundRect(sliderX, trackY, sliderW, trackH, 6); ctx.stroke();

    // Filled portion
    const fillW = Math.round(norm * sliderW);
    if (fillW > 0) {
      ctx.fillStyle = "#3aaa55";
      ctx.beginPath(); ctx.roundRect(sliderX, trackY, fillW, trackH, 6); ctx.fill();
    }

    // Value text on the slider
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    const displayVal = s.display(val);
    ctx.fillText(displayVal, sliderX + sliderW - 8, trackY + 19);

    sy += 110;
  }

  // Save button
  const btnW = 120, btnH = 40;
  const btnX = px + pw / 2 - btnW / 2, btnY = py + ph - 58;
  ctx.fillStyle = "#2a7a44";
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
  ctx.strokeStyle = PALETTE.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.stroke();
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("Save", btnX + btnW / 2, btnY + 27);
}

function handleModifyGunClick(mx, my) {
  if (!UI.isOpen('modifygun')) return false;

  const pw = 500, ph = 340;
  const px = BASE_W / 2 - pw / 2, py = BASE_H / 2 - ph / 2;

  // Close button
  if (mx >= px + pw - 42 && mx <= px + pw - 10 && my >= py + 8 && my <= py + 40) {
    UI.close(); _mgDragging = null; return true;
  }

  // Slider interaction
  const sliderX = px + 40, sliderW = pw - 80;
  const keys = ['freeze', 'rof'];
  let sy = py + 70;

  for (const key of keys) {
    const trackY = sy + 38, trackH = 28;
    if (mx >= sliderX && mx <= sliderX + sliderW && my >= trackY && my <= trackY + trackH) {
      _mgDragging = key;
      _mgApplySliderValue(key, mx, sliderX, sliderW);
      return true;
    }
    sy += 110;
  }

  // Save button
  const btnW = 120, btnH = 40;
  const btnX = px + pw / 2 - btnW / 2, btnY = py + ph - 58;
  if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
    UI.close(); _mgDragging = null;
    chatMessages.push({ name: "SYSTEM", text: "CT-X saved — Freeze: " + (_mgSliders.freeze.get() * 100).toFixed(0) + "% | RoF: " + _mgSliders.rof.get().toFixed(0) + "f", time: Date.now() });
    return true;
  }

  // Consume click inside panel
  if (mx >= px && mx <= px + pw && my >= py && my <= py + ph) return true;
  return false;
}

function handleModifyGunDrag(mx) {
  if (!_mgDragging || !UI.isOpen('modifygun')) return;
  const pw = 500;
  const px = BASE_W / 2 - pw / 2;
  const sliderX = px + 40, sliderW = pw - 80;
  _mgApplySliderValue(_mgDragging, mx, sliderX, sliderW);
}

function handleModifyGunUp() {
  _mgDragging = null;
}

function _mgApplySliderValue(key, mx, sliderX, sliderW) {
  const s = _mgSliders[key];
  let norm = (mx - sliderX) / sliderW;
  norm = Math.max(0, Math.min(1, norm));
  let val = s.min + norm * (s.max - s.min);
  // Snap to step
  val = Math.round(val / s.step) * s.step;
  val = Math.max(s.min, Math.min(s.max, val));
  // Clamp to one step from current to prevent skipping
  const cur = s.get();
  if (val > cur + s.step) val = cur + s.step;
  else if (val < cur - s.step) val = cur - s.step;
  s.set(val);
}
