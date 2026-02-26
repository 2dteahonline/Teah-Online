// ===================== DRAW & GAME LOOP =====================
// Core: main render loop, camera, HUD, game loop
// Extracted from index_2.html — Phase E

let renderTime = 0;

// ===================== DRAW =====================
function draw() {
  try {
  renderTime = Date.now();
  ctx.fillStyle = "#2a2a3a";
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  const cx = Math.floor(camera.x), cy = Math.floor(camera.y);

  // Draw level background (placeholder tiles)
  drawLevelBackground(cx, cy);

  // Draw user-placed tiles on top of background
  drawPlacedTiles(cx, cy);

  // Draw level entity overlays (barriers, spawn pads, zones) — uses own cam offset
  drawLevelEntities(cx, cy);

  ctx.save();
  ctx.translate(-cx, -cy);

  // Y-sort all characters
  const sortedChars = [];
  // Draw upgrade station
  if (Scene.inDungeon) drawStation();
  // Draw staircase if open
  if (Scene.inDungeon) drawStaircase();
  // Draw victory celebration
  if (Scene.inDungeon) drawVictoryCelebration();

  sortedChars.push({ y: player.y, type: "player" });
  for (const m of mobs) if (m.hp > 0) sortedChars.push({ y: m.y, type: "mob", mob: m });
  // Deli customer NPCs
  if (typeof deliNPCs !== 'undefined' && Scene.inCooking) {
    for (const npc of deliNPCs) sortedChars.push({ y: npc.y, type: "deliNPC", npc: npc });
  }
  sortedChars.sort((a, b) => a.y - b.y);

  // Ore nodes (under characters)
  if (typeof drawOreNodes === 'function') drawOreNodes();

  // Ground effects UNDER characters
  drawMobGroundEffects();
  // Ambient particles UNDER characters
  drawMobAmbientEffects();

  for (const e of sortedChars) {
    if (e.type === "player") {
      if (playerDead && deathTimer > 0) {
        // Death animation: rotate and fade
        const progress = 1 - deathTimer / DEATH_ANIM_FRAMES;
        ctx.save();
        ctx.globalAlpha = 1 - progress * 0.6;
        ctx.translate(player.x - camera.x, player.y - camera.y);
        ctx.rotate(deathRotation);
        ctx.translate(-(player.x - camera.x), -(player.y - camera.y));
        drawChar(player.x, player.y, player.dir, 0, false,
          player.skin, player.hair, player.shirt, player.pants, player.name, 0, true);
        ctx.restore();
      } else if (playerDead) {
        // During countdown, don't draw player (they're dead)
      } else {
        const flashAlpha = contactCooldown > 0 && Math.floor(renderTime / 80) % 2 === 0;
        if (flashAlpha) ctx.globalAlpha = 0.5;
        // Phase visual — semi-transparent + cyan glow
        if (phaseTimer > 0) ctx.globalAlpha = 0.4 + Math.sin(renderTime * 0.015) * 0.1;
        if (queueActive) {
          // Battle stance: face up, slight bob, weapon ready
          const stanceBob = Math.sin(renderTime * 0.004) * 1.5;
          const stanceFrame = Math.floor(renderTime / 400) % 2; // alternating stance
          ctx.save();
          ctx.translate(0, stanceBob);
          drawChar(player.x, player.y, 1, stanceFrame, false,
            player.skin, player.hair, player.shirt, player.pants, player.name, player.hp, true, null, player.maxHp);
          ctx.restore();
        } else {
          drawChar(player.x, player.y, player.dir, player.frame, player.moving,
            player.skin, player.hair, player.shirt, player.pants, player.name, player.hp, true, null, player.maxHp);
        }
        if (flashAlpha || phaseTimer > 0) ctx.globalAlpha = 1.0;

        // Phase active glow — cyan ring
        if (phaseTimer > 0) {
          const sx = player.x;
          const sy = player.y;
          const pPulse = 0.5 + Math.sin(renderTime * 0.012) * 0.2;
          ctx.strokeStyle = `rgba(80,220,255,${pPulse})`;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy - 10, 32, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = `rgba(80,200,255,${pPulse * 0.15})`;
          ctx.beginPath(); ctx.arc(sx, sy - 10, 30, 0, Math.PI * 2); ctx.fill();
        }
      }
      
      // Ninja dash afterimage trail (render only — ticking moved to updateMelee)
      if (melee.special === 'ninja' && melee.dashTrail.length > 0) {
        for (let ti = melee.dashTrail.length - 1; ti >= 0; ti--) {
          const t = melee.dashTrail[ti];
          if (t.life <= 0) continue;
          const ta = t.life / 12 * 0.35;
          // Dark silhouette ghost
          ctx.fillStyle = `rgba(15,10,25,${ta})`;
          ctx.beginPath(); ctx.ellipse(t.x, t.y - 20, 10, 18, 0, 0, Math.PI * 2); ctx.fill();
          // Faint dark purple edge
          ctx.strokeStyle = `rgba(50,30,70,${ta * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(t.x, t.y - 20, 10, 18, 0, 0, Math.PI * 2); ctx.stroke();
        }
      }
      
      // Storm Blade passive lightning aura — subtle crackling sparks
      if (melee.special === 'storm' && !playerDead && activeSlot === 1) {
        const lt = renderTime;
        const px = player.x, py = player.y - 25; // center on upper body
        
        // Soft ambient glow around torso
        const gPulse2 = 0.4 + 0.2 * Math.sin(lt * 0.004);
        ctx.fillStyle = `rgba(180,215,255,${0.055 * gPulse2})`;
        ctx.beginPath(); ctx.ellipse(px, py, 22, 30, 0, 0, Math.PI * 2); ctx.fill();
        
        // 7 lightning bolts crackling off the body — biased toward upper half
        for (let sb = 0; sb < 7; sb++) {
          const seed = sb * 3847 + Math.floor(lt / 80) * 1951; // slower cycle
          const pr = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
          
          const phase = ((lt / 65 + sb * 41) % 100) / 100; // slower
          const bAlpha = Math.sin(phase * Math.PI);
          if (bAlpha < 0.15) continue;
          
          // Start on body — biased upward (head/shoulders/torso)
          const sA = pr(1) * Math.PI * 2;
          const vertBias = -8 + pr(20) * -12; // shift start points up
          const sR = 4 + pr(2) * 8;
          const sx = px + Math.cos(sA) * sR;
          const sy = py + vertBias + Math.sin(sA) * sR * 0.6;
          
          // End — arcs outward, still biased up
          const eA = sA + (pr(3) - 0.5) * 2.2;
          const eR = 20 + pr(4) * 25;
          const ex = px + Math.cos(eA) * eR;
          const ey = py + vertBias * 0.5 + Math.sin(eA) * eR * 0.7;
          
          ctx.strokeStyle = `rgba(${200 + pr(5) * 50 | 0},${220 + pr(6) * 30 | 0},255,${bAlpha * 0.55})`;
          ctx.lineWidth = 1 + pr(7) * 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          const jSegs = 2 + (pr(8) * 2 | 0);
          for (let js = 1; js <= jSegs; js++) {
            const jt = js / jSegs;
            ctx.lineTo(
              sx + (ex - sx) * jt + (pr(9 + js) - 0.5) * 14,
              sy + (ey - sy) * jt + (pr(12 + js) - 0.5) * 14
            );
          }
          ctx.stroke();
          
          // Small branch on some bolts
          if (sb % 3 === 0 && bAlpha > 0.4) {
            const brA = eA + (pr(15) - 0.5) * 1.5;
            const brL = 8 + pr(16) * 12;
            ctx.strokeStyle = `rgba(215,232,255,${bAlpha * 0.35})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + Math.cos(brA) * brL, ey + Math.sin(brA) * brL);
            ctx.stroke();
          }
        }
        
        // Tiny floating spark particles — orbit around upper body
        for (let sp = 0; sp < 5; sp++) {
          const spA = lt * 0.003 * (sp % 2 === 0 ? 1 : -1) + sp * 1.26;
          const spRx = 14 + Math.sin(lt * 0.005 + sp * 1.7) * 10;
          const spRy = 18 + Math.sin(lt * 0.006 + sp * 1.3) * 8;
          const spAlpha = (Math.sin(lt * 0.007 + sp * 1.5) + 1) * 0.22;
          const spx = px + Math.cos(spA) * spRx;
          const spy = py - 6 + Math.sin(spA) * spRy;
          ctx.fillStyle = `rgba(220,238,255,${spAlpha})`;
          ctx.beginPath(); ctx.arc(spx, spy, 1 + Math.random() * 1.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      
      // War Cleaver passive cursed energy aura — Sukuna dark red/black swirl
      if (melee.special === 'cleave' && !playerDead && activeSlot === 1) {
        const lt = renderTime;
        const px = player.x, py = player.y - 25;
        
        // Dark pulsing aura glow
        const cPulse = 0.4 + 0.15 * Math.sin(lt * 0.003);
        ctx.fillStyle = `rgba(30,0,0,${0.06 * cPulse})`;
        ctx.beginPath(); ctx.ellipse(px, py, 24, 32, 0, 0, Math.PI * 2); ctx.fill();
        
        // Swirling dark red/black particles rising around body
        for (let cp = 0; cp < 10; cp++) {
          const seed = cp * 5231 + Math.floor(lt / 140) * 2903; // slower change
          const pr = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
          
          // Each particle spirals upward — slow
          const cycleLen = 3500 + pr(1) * 2000; // 3.5-5.5s per cycle
          const phase = ((lt + pr(2) * cycleLen) % cycleLen) / cycleLen;
          const pAlpha = Math.sin(phase * Math.PI);
          if (pAlpha < 0.1) continue;
          
          // Spiral path — rises from lower body to above head
          const spiralA = phase * Math.PI * 2.5 + cp * Math.PI * 2 / 10;
          const spiralR = 7 + pr(3) * 10 + Math.sin(phase * Math.PI * 2) * 3;
          const riseY = 18 - phase * 42;
          
          const ppx = px + Math.cos(spiralA) * spiralR;
          const ppy = py + riseY + Math.sin(spiralA) * spiralR * 0.3;
          
          // Darker colors — heavier on black
          const colorType = cp % 5;
          let cr, cg, cb;
          if (colorType <= 1) { cr = 10 + pr(4) * 15 | 0; cg = 0; cb = 0; } // near black
          else if (colorType === 2) { cr = 60 + pr(5) * 40 | 0; cg = 0; cb = 0; } // very dark red
          else if (colorType === 3) { cr = 35 + pr(6) * 30 | 0; cg = 0; cb = pr(7) * 5 | 0; } // blackish-red
          else { cr = 100 + pr(8) * 40 | 0; cg = 5; cb = 5; } // dark crimson
          
          const pSize = 2 + pr(10) * 2.5;
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${pAlpha * 0.45})`;
          ctx.beginPath(); ctx.ellipse(ppx, ppy, pSize * 0.7, pSize * 1.2, 0, 0, Math.PI * 2); ctx.fill();
          
          // Wispy trail below
          if (pAlpha > 0.3) {
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pAlpha * 0.15})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ppx, ppy);
            ctx.lineTo(ppx - Math.cos(spiralA) * 3, ppy + 5);
            ctx.stroke();
          }
        }
        
        // Faint tiny slash marks flickering around body
        for (let fs = 0; fs < 3; fs++) {
          const seed2 = fs * 7717 + Math.floor(lt / 180) * 3391; // slower
          const pr2 = (n) => { const x = Math.sin(seed2 * n) * 43758.5453; return x - Math.floor(x); };
          
          const fPhase = ((lt / 110 + fs * 53) % 120) / 120;
          const fA = Math.sin(fPhase * Math.PI);
          if (fA < 0.3) continue;
          
          const fAngle = pr2(1) * Math.PI;
          const fDist = 10 + pr2(2) * 16;
          const fBias = -8 + pr2(5) * -10;
          const fx = px + Math.cos(pr2(3) * Math.PI * 2) * fDist;
          const fy = py + fBias + Math.sin(pr2(4) * Math.PI * 2) * fDist * 0.5;
          const fLen = 6 + pr2(6) * 8;
          
          const fColor = fs % 2 === 0 ? `rgba(15,0,0,${fA * 0.35})` : `rgba(80,5,5,${fA * 0.3})`;
          ctx.strokeStyle = fColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(fx - Math.cos(fAngle) * fLen, fy - Math.sin(fAngle) * fLen);
          ctx.lineTo(fx + Math.cos(fAngle) * fLen, fy + Math.sin(fAngle) * fLen);
          ctx.stroke();
        }
      }
    } else if (e.type === "deliNPC") {
      // Deli customer NPC rendering
      const npc = e.npc;
      drawChar(npc.x, npc.y, npc.dir, Math.floor(npc.frame), npc.moving,
        npc.skin, npc.hair, npc.shirt, npc.pants,
        npc.name, -1, false, null, 100, 0, 0.9, 0);
      // Food indicator (small plate icon above head)
      if (npc.hasFood) {
        ctx.fillStyle = '#c08030';
        ctx.beginPath();
        ctx.ellipse(npc.x + 14, npc.y - 56, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#60a040';
        ctx.beginPath();
        ctx.arc(npc.x + 14, npc.y - 58, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const m = e.mob;
      // Mummy armed glow — flashes green faster as fuse runs down
      if (m.type === "mummy" && m.mummyArmed) {
        const fuseMax = MOB_TYPES.mummy.fuseMax;
        const urgency = 1 - (m.mummyFuse / fuseMax);
        const flashSpeed = 4 + urgency * 12;
        const flashVal = 0.3 + 0.4 * Math.abs(Math.sin(m.mummyFlash * flashSpeed * 0.1));
        ctx.fillStyle = `rgba(120,200,60,${flashVal})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 20, 25 + urgency * 15, 0, Math.PI * 2); ctx.fill();
        // Warning ring
        ctx.strokeStyle = `rgba(200,240,80,${flashVal * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(m.x, m.y - 20, 30 + urgency * 20, 0, Math.PI * 2); ctx.stroke();
      }
      drawChar(m.x, m.y, m.dir, Math.floor(m.frame), true,
        m.skin, m.hair, m.shirt, m.pants, m.name, m.hp, false, m.type, m.maxHp, m.boneSwing || 0, m.scale || 1, m.castTimer || m.throwAnim || m.bowDrawAnim || m.healAnim || 0);
      
      // Frost effect overlay — obvious blue tint on frozen mobs
      if (m.frostTimer > 0) {
        const fAlpha = Math.min(0.5, m.frostTimer / 150 * 0.5);
        // Blue glow around mob
        ctx.fillStyle = `rgba(60,160,255,${fAlpha * 0.6})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 24, 0, Math.PI * 2); ctx.fill();
        // Inner bright core
        ctx.fillStyle = `rgba(150,220,255,${fAlpha * 0.4})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 16, 0, Math.PI * 2); ctx.fill();
        // Orbiting ice crystals
        const t = renderTime / 300;
        for (let ip = 0; ip < 5; ip++) {
          const ia = t + ip * Math.PI * 2 / 5;
          const ix = m.x + Math.cos(ia) * 20;
          const iy = m.y - 15 + Math.sin(ia) * 18;
          // Diamond shape
          ctx.fillStyle = `rgba(200,240,255,${fAlpha * 2})`;
          ctx.save();
          ctx.translate(ix, iy);
          ctx.rotate(ia + t);
          ctx.fillRect(-3, -3, 6, 6);
          ctx.restore();
        }
        // "SLOW" text indicator
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(100,200,255,${fAlpha * 1.5})`;
        ctx.fillText("SLOW", m.x, m.y - 42);
        ctx.textAlign = "left";
      }
      // Burn effect overlay — big fire particles on burning mobs
      if (m.burnTimer > 0) {
        const bAlpha = Math.min(0.7, m.burnTimer / 180 * 0.7);
        // Orange glow
        ctx.fillStyle = `rgba(255,100,20,${bAlpha * 0.35})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 22, 0, Math.PI * 2); ctx.fill();
        // Animated flame particles rising up
        const t = renderTime / 100;
        for (let fp = 0; fp < 6; fp++) {
          const phase = t + fp * 1.1;
          const fLife = (phase % 3) / 3; // 0 to 1 cycle
          const fx = m.x + Math.sin(phase * 1.5) * (8 + fp * 2);
          const fy = m.y - 5 - fLife * 35;
          const fSize = (1 - fLife) * 5 + 2;
          // Fire gradient: yellow core → orange → red tip
          const r = 255, g = Math.round(200 - fLife * 150), b2 = Math.round(40 - fLife * 40);
          ctx.fillStyle = `rgba(${r},${g},${b2},${(1 - fLife) * bAlpha})`;
          ctx.beginPath(); ctx.arc(fx, fy, fSize, 0, Math.PI * 2); ctx.fill();
        }
        // "BURN" text indicator
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = `rgba(255,160,40,${bAlpha * 1.2})`;
        ctx.fillText("BURN", m.x, m.y - 42);
        ctx.textAlign = "left";
      }
      // Poison effect overlay — green dripping particles on poisoned mobs

      // Stagger effect overlay — orange/gold stunned effect
      if (m.staggerTimer > 0) {
        const sAlpha = Math.min(0.7, m.staggerTimer / 18 * 0.7);
        // Orange flash on mob
        ctx.fillStyle = `rgba(255,160,40,${sAlpha * 0.3})`;
        ctx.beginPath(); ctx.arc(m.x, m.y - 15, 22, 0, Math.PI * 2); ctx.fill();
        // Stun stars orbiting
        const st = renderTime / 200;
        for (let sp = 0; sp < 3; sp++) {
          const sa = st + sp * Math.PI * 2 / 3;
          const starX = m.x + Math.cos(sa) * 18;
          const starY = m.y - 38 + Math.sin(sa * 2) * 4;
          // Draw small star
          ctx.fillStyle = `rgba(255,200,50,${sAlpha})`;
          ctx.beginPath();
          for (let si = 0; si < 5; si++) {
            const a2 = si * Math.PI * 2 / 5 - Math.PI / 2 + st;
            const r = si % 2 === 0 ? 4 : 2;
            if (si === 0) ctx.moveTo(starX + Math.cos(a2) * r, starY + Math.sin(a2) * r);
            else ctx.lineTo(starX + Math.cos(a2) * r, starY + Math.sin(a2) * r);
          }
          ctx.closePath(); ctx.fill();
        }
      }
    }
  }

  // Death explosion effects (in world space, on top of mobs)
  drawDeathEffects();

  // Medpacks (in world space)
  drawMedpacks();

  // Bullets (in world space)
  drawBullets();

  // Katana swing effect (in world space)
  drawKatanaSwing(cx, cy);
  // Grab effect removed — mechanic still works, just no visual overlay

  // Godspeed while active — DRAMATIC Killua lightning aura + Kashimo ground strikes
  if (godspeed.active && !playerDead) {
    const gsp = godspeed.timer / godspeed.duration;
    const gt = renderTime;
    const gpx = player.x, gpy = player.y - 15;
    const gr = godspeed.range;
    const gPulse = 0.6 + 0.4 * Math.sin(gt * 0.01);
    
    // === SCREEN FLASH on activation (first few frames) ===
    if (godspeed.timer > godspeed.duration - 8) {
      const flashA = (godspeed.timer - (godspeed.duration - 8)) / 8;
      ctx.fillStyle = `rgba(220,235,255,${flashA * 0.2})`;
      ctx.fillRect(gpx - 400, gpy - 300, 800, 600);
    }
    
    // === KILLUA LIGHTNING AURA — MASSIVE crackling electricity ===
    // Large pulsing electric glow — white/light blue
    const glowR = 40 + Math.sin(gt * 0.015) * 8;
    ctx.fillStyle = `rgba(160,200,255,${0.18 * gsp * gPulse})`;
    ctx.beginPath(); ctx.arc(gpx, gpy, glowR + 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(200,225,255,${0.14 * gsp * gPulse})`;
    ctx.beginPath(); ctx.arc(gpx, gpy, glowR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = `rgba(235,242,255,${0.1 * gsp})`;
    ctx.beginPath(); ctx.arc(gpx, gpy, glowR - 10, 0, Math.PI * 2); ctx.fill();
    
    // MASSIVE lightning bolts arcing off player — 14 bolts, long reach, thick
    for (let lb = 0; lb < 14; lb++) {
      const seed = lb * 4919 + Math.floor(gt / 30) * 2371;
      const pr = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
      
      const phase = ((gt / 25 + lb * 37) % 80) / 80;
      const lAlpha = Math.sin(phase * Math.PI);
      if (lAlpha < 0.1) continue;
      
      // Start from player body
      const startA = pr(1) * Math.PI * 2;
      const startR = 5 + pr(2) * 10;
      const sx = gpx + Math.cos(startA) * startR;
      const sy = gpy + Math.sin(startA) * startR;
      
      // End point — bolts reach FAR out
      const endA = startA + (pr(3) - 0.5) * 2.5;
      const endR = 40 + pr(4) * 55; // much longer reach
      const ex = gpx + Math.cos(endA) * endR;
      const ey = gpy + Math.sin(endA) * endR;
      
      // Main bolt — thick jagged
      const isWhite = lb % 4 === 0;
      const isPurple = lb % 5 === 0;
      let bR, bG, bB;
      if (isWhite) { bR = 245; bG = 248; bB = 255; }
      else if (isPurple) { bR = 200 + pr(20) * 40 | 0; bG = 220 + pr(21) * 30 | 0; bB = 255; }
      else { bR = 180 + pr(5) * 60 | 0; bG = 210 + pr(6) * 40 | 0; bB = 255; }
      
      ctx.strokeStyle = `rgba(${bR},${bG},${bB},${lAlpha * 0.9 * gsp})`;
      ctx.lineWidth = 2.5 + pr(7) * 3;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      const jSegs = 4 + (pr(8) * 4 | 0);
      let prevJx = sx, prevJy = sy;
      for (let js = 1; js <= jSegs; js++) {
        const jt = js / jSegs;
        const jx = sx + (ex - sx) * jt + (pr(9 + js) - 0.5) * 28;
        const jy = sy + (ey - sy) * jt + (pr(12 + js) - 0.5) * 28;
        ctx.lineTo(jx, jy);
        
        // Branch bolts splitting off at each joint — like real lightning
        if (pr(16 + js) > 0.4) {
          const brA = Math.atan2(jy - prevJy, jx - prevJx) + (pr(20 + js) - 0.5) * 2;
          const brLen = 12 + pr(24 + js) * 25;
          ctx.moveTo(jx, jy);
          const bmx = jx + Math.cos(brA) * brLen * 0.5 + (pr(28 + js) - 0.5) * 12;
          const bmy = jy + Math.sin(brA) * brLen * 0.5 + (pr(32 + js) - 0.5) * 12;
          ctx.lineTo(bmx, bmy);
          ctx.lineTo(jx + Math.cos(brA) * brLen, jy + Math.sin(brA) * brLen);
          ctx.moveTo(jx, jy); // return to main path
        }
        prevJx = jx; prevJy = jy;
      }
      ctx.stroke();
      
      // Bright white core on main bolts
      if (lb % 2 === 0) {
        ctx.strokeStyle = `rgba(230,240,255,${lAlpha * 0.45 * gsp})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
      }
      
      // Spark at bolt tip
      ctx.fillStyle = `rgba(235,245,255,${lAlpha * 0.7 * gsp})`;
      ctx.beginPath(); ctx.arc(ex, ey, 2 + pr(15) * 3, 0, Math.PI * 2); ctx.fill();
    }
    
    // Extra spark particles floating around player
    for (let sp2 = 0; sp2 < 10; sp2++) {
      const spA = gt * 0.003 * (sp2 % 2 === 0 ? 1 : -1) + sp2 * 0.63;
      const spR = 15 + Math.sin(gt * 0.007 + sp2) * 20;
      const spx = gpx + Math.cos(spA) * spR;
      const spy = gpy + Math.sin(spA) * spR;
      const spAlpha = (Math.sin(gt * 0.012 + sp2 * 1.3) + 1) * 0.3;
      ctx.fillStyle = `rgba(${220 + Math.random() * 35 | 0},${230 + Math.random() * 25 | 0},255,${spAlpha * gsp})`;
      ctx.beginPath(); ctx.arc(spx, spy, 1 + Math.random() * 2.5, 0, Math.PI * 2); ctx.fill();
    }
    
    // === RADIUS — electric boundary with dramatic arcs ===
    // Double ring
    ctx.strokeStyle = `rgba(180,215,255,${0.3 * gsp * gPulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(gpx, gpy, gr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = `rgba(160,200,245,${0.15 * gsp})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(gpx, gpy, gr * 0.92, 0, Math.PI * 2); ctx.stroke();
    
    // Big dramatic arcs along the circle — lightning crawling the perimeter
    for (let ea = 0; ea < 16; ea++) {
      const eAngle = ea * Math.PI / 8 + gt * 0.003;
      const ePhase = ((gt / 40 + ea * 23) % 80) / 80;
      const eA = Math.sin(ePhase * Math.PI);
      if (eA < 0.15) continue;
      
      const arcSpan = 0.2 + Math.random() * 0.15;
      ctx.strokeStyle = `rgba(${190 + Math.random() * 60 | 0},${215 + Math.random() * 40 | 0},255,${eA * 0.7 * gsp})`;
      ctx.lineWidth = 1.5 + Math.random() * 2;
      ctx.beginPath();
      const arcSegs = 3 + (Math.random() * 3 | 0);
      for (let as = 0; as <= arcSegs; as++) {
        const at = eAngle + arcSpan * (as / arcSegs);
        const ar = gr + (Math.random() - 0.5) * 18;
        const ax = gpx + Math.cos(at) * ar;
        const ay = gpy + Math.sin(at) * ar;
        if (as === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
      }
      ctx.stroke();
    }
    
    // === AMBIENT GROUND LIGHTNING — Kashimo style bolts erupting from ground ===
    for (let gl = 0; gl < 16; gl++) {
      const seed2 = gl * 6131 + Math.floor(gt / 40) * 4513;
      const pr2 = (n) => { const x = Math.sin(seed2 * n) * 43758.5453; return x - Math.floor(x); };
      
      const gPhase = ((gt / 40 + gl * 27) % 90) / 90;
      const gA2 = Math.sin(gPhase * Math.PI);
      if (gA2 < 0.1) continue;
      
      const ga = pr2(1) * Math.PI * 2;
      const gd = pr2(2) * gr * 0.85;
      const gx = gpx + Math.cos(ga) * gd;
      const gy = gpy + Math.sin(ga) * gd;
      
      // Tall bolt shooting up from ground
      const bHeight = 35 + pr2(3) * 50;
      const isW = gl % 4 === 0;
      const isP = gl % 5 === 0;
      
      // Main upward bolt
      ctx.strokeStyle = isW ? `rgba(240,245,255,${gA2 * 0.8 * gsp})`
        : isP ? `rgba(210,225,255,${gA2 * 0.7 * gsp})`
        : `rgba(${180 + pr2(4) * 60 | 0},${210 + pr2(5) * 40 | 0},255,${gA2 * 0.8 * gsp})`;
      ctx.lineWidth = 2 + pr2(6) * 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy + 5);
      let blx2 = gx;
      for (let bs = 1; bs <= 5; bs++) {
        blx2 = gx + (pr2(7 + bs) - 0.5) * 25;
        ctx.lineTo(blx2, gy + 5 - bHeight * (bs / 5));
      }
      ctx.stroke();
      
      // Branch from the bolt
      if (pr2(13) > 0.3) {
        const brY2 = gy + 5 - bHeight * 0.5;
        const brA2 = (pr2(14) - 0.5) * 2;
        const brL = 15 + pr2(15) * 20;
        ctx.strokeStyle = `rgba(${200 + pr2(16) * 50 | 0},${220 + pr2(17) * 30 | 0},255,${gA2 * 0.5 * gsp})`;
        ctx.lineWidth = 1 + pr2(18);
        ctx.beginPath();
        ctx.moveTo(gx + (pr2(19) - 0.5) * 10, brY2);
        ctx.lineTo(gx + Math.cos(brA2) * brL, brY2 + Math.sin(brA2) * brL * 0.5 - 8);
        ctx.stroke();
      }
      
      // Ground spark — bright flash
      ctx.fillStyle = `rgba(220,238,255,${gA2 * 0.6 * gsp})`;
      ctx.beginPath(); ctx.arc(gx, gy + 5, 4 + pr2(20) * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(245,250,255,${gA2 * 0.4 * gsp})`;
      ctx.beginPath(); ctx.arc(gx, gy + 5, 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Malevolent Shrine while active — domain seal + slashes
  if (shrine.active && !playerDead) {
    const sp = shrine.timer / shrine.duration; // 1 → 0
    const sr = shrine.range;
    const cx3 = player.x, cy3 = player.y - 15;
    const pulse = 0.6 + 0.3 * Math.sin(renderTime * 0.006);
    const rot = renderTime * 0.0008; // slow rotation
    
    // === DOMAIN SEAL ON GROUND ===
    // Outer crimson circle
    ctx.strokeStyle = `rgba(180,20,20,${0.45 * sp * pulse})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(cx3, cy3, sr, 0, Math.PI * 2); ctx.stroke();
    // Second inner ring
    ctx.strokeStyle = `rgba(140,10,10,${0.35 * sp * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx3, cy3, sr * 0.88, 0, Math.PI * 2); ctx.stroke();
    // Inner circle
    ctx.strokeStyle = `rgba(160,15,15,${0.3 * sp * pulse})`;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx3, cy3, sr * 0.35, 0, Math.PI * 2); ctx.stroke();
    
    // Triskelion / three-eye symbol (like the uploaded image) — rotating slowly
    ctx.save();
    ctx.translate(cx3, cy3);
    ctx.rotate(rot);
    
    // Three curved blades/petals
    for (let p = 0; p < 3; p++) {
      const pa = p * Math.PI * 2 / 3;
      ctx.save();
      ctx.rotate(pa);
      
      // Curved blade shape — teardrop/eye petal
      ctx.strokeStyle = `rgba(150,15,15,${0.35 * sp * pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.bezierCurveTo(25, -22, 45, -15, 50, 0);
      ctx.bezierCurveTo(45, 15, 25, 22, 0, 8);
      ctx.stroke();
      
      // Glowing red eye in center of each petal
      const eyeX = 28, eyeY = 0;
      ctx.fillStyle = `rgba(255,20,20,${0.3 * sp * pulse})`;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,50,30,${0.5 * sp * pulse})`;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 4, 0, Math.PI * 2); ctx.fill();
      // Bright core
      ctx.fillStyle = `rgba(255,100,80,${0.6 * sp * pulse})`;
      ctx.beginPath(); ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2); ctx.fill();
      
      // Red veins/cracks from eye
      ctx.strokeStyle = `rgba(200,20,10,${0.25 * sp * pulse})`;
      ctx.lineWidth = 0.8;
      for (let v = 0; v < 4; v++) {
        const va = (v / 4) * Math.PI * 2 + renderTime * 0.001;
        const vLen = 6 + Math.sin(renderTime * 0.003 + v) * 3;
        ctx.beginPath();
        ctx.moveTo(eyeX, eyeY);
        ctx.lineTo(eyeX + Math.cos(va) * vLen, eyeY + Math.sin(va) * vLen);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    // Connecting lines between petals — triangle
    ctx.strokeStyle = `rgba(120,10,10,${0.25 * sp * pulse})`;
    ctx.lineWidth = 1;
    for (let l = 0; l < 3; l++) {
      const la1 = l * Math.PI * 2 / 3;
      const la2 = (l + 1) * Math.PI * 2 / 3;
      const lr = sr * 0.55;
      ctx.beginPath();
      ctx.moveTo(Math.cos(la1) * lr, Math.sin(la1) * lr);
      ctx.lineTo(Math.cos(la2) * lr, Math.sin(la2) * lr);
      ctx.stroke();
    }
    
    // Outer rune marks around the circle
    for (let rm = 0; rm < 12; rm++) {
      const ra = rm * Math.PI / 6 + rot * 0.5;
      const rr = sr * 0.92;
      const rl = 8 + Math.sin(renderTime * 0.004 + rm) * 3;
      ctx.strokeStyle = `rgba(160,15,15,${0.3 * sp * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ra) * (rr - rl), Math.sin(ra) * (rr - rl));
      ctx.lineTo(Math.cos(ra) * (rr + rl), Math.sin(ra) * (rr + rl));
      ctx.stroke();
    }
    
    ctx.restore();
    
    // === SLASHES FILLING THE RADIUS ===
    
    // HEAVY animated slashes filling the entire shrine radius
    const t = renderTime;
    
    // 30 slashes filling the zone — constantly cycling, cutting through everything
    for (let ss = 0; ss < 30; ss++) {
      const seed = ss * 7919;
      const pseudoRand = (n) => { const x = Math.sin(seed * n) * 43758.5453; return x - Math.floor(x); };
      
      // Each slash cycles independently
      const cycleDuration = 200 + pseudoRand(1) * 250;
      const offset = pseudoRand(2) * cycleDuration;
      const phase = ((t + offset) % cycleDuration) / cycleDuration;
      
      // Position anywhere in the circle
      const pAngle = pseudoRand(3) * Math.PI * 2 + t * 0.0003 * (ss % 2 === 0 ? 1 : -1);
      const pDist = pseudoRand(4) * sr * 0.9;
      const baseX = cx3 + Math.cos(pAngle) * pDist;
      const baseY = cy3 + Math.sin(pAngle) * pDist;
      
      // Slash sweeps across its position
      const sAng = pseudoRand(5) * Math.PI + ss * 0.4;
      const sLen = 30 + pseudoRand(6) * 45; // big slashes
      const sweepDist = 30;
      const sweepOffset = (phase - 0.5) * sweepDist * 2;
      const sx = baseX + Math.cos(sAng + Math.PI / 2) * sweepOffset;
      const sy = baseY + Math.sin(sAng + Math.PI / 2) * sweepOffset;
      
      const sAlpha = Math.sin(phase * Math.PI);
      if (sAlpha < 0.05) continue;
      
      // Color — black, blackish-red, crimson, blood red
      const colorType = ss % 4;
      let r2, g2, b2;
      if (colorType === 0) { r2 = 15 + pseudoRand(30) * 25 | 0; g2 = 0; b2 = 0; }
      else if (colorType === 1) { r2 = 160 + pseudoRand(31) * 80 | 0; g2 = 0; b2 = 0; }
      else if (colorType === 2) { r2 = 55 + pseudoRand(32) * 50 | 0; g2 = 0; b2 = pseudoRand(33) * 8 | 0; }
      else { r2 = 200 + pseudoRand(34) * 55 | 0; g2 = 10 + pseudoRand(35) * 25 | 0; b2 = 10; }
      
      // Main cut line
      ctx.strokeStyle = `rgba(${r2},${g2},${b2},${sAlpha * 0.9 * sp})`;
      ctx.lineWidth = 3 + pseudoRand(7) * 3;
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(sAng) * sLen, sy - Math.sin(sAng) * sLen);
      ctx.lineTo(sx + Math.cos(sAng) * sLen, sy + Math.sin(sAng) * sLen);
      ctx.stroke();
      
      // Inner wound
      const cR = Math.min(255, r2 + 70);
      ctx.strokeStyle = `rgba(${cR},${g2 + 30},${b2 + 15},${sAlpha * 0.4 * sp})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - Math.cos(sAng) * sLen * 0.65, sy - Math.sin(sAng) * sLen * 0.65);
      ctx.lineTo(sx + Math.cos(sAng) * sLen * 0.65, sy + Math.sin(sAng) * sLen * 0.65);
      ctx.stroke();
      
      // Cross-cut every other slash
      if (ss % 2 === 0) {
        const xAng = sAng + Math.PI / 2 + (pseudoRand(10) - 0.5) * 0.5;
        const xLen = sLen * 0.5;
        ctx.strokeStyle = `rgba(${r2 * 0.7 | 0},0,0,${sAlpha * 0.55 * sp})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - Math.cos(xAng) * xLen, sy - Math.sin(xAng) * xLen);
        ctx.lineTo(sx + Math.cos(xAng) * xLen, sy + Math.sin(xAng) * xLen);
        ctx.stroke();
      }
      
      // Blood spray
      if (phase > 0.15 && phase < 0.85 && ss % 3 === 0) {
        const sprayDir = sAng + Math.PI / 2 * (phase > 0.5 ? 1 : -1);
        for (let bd = 0; bd < 4; bd++) {
          const bAng = sprayDir + (pseudoRand(11 + bd) - 0.5) * 1.4;
          const bDist = pseudoRand(14 + bd) * sAlpha * 18 + 4;
          const bx = sx + Math.cos(bAng) * bDist;
          const by = sy + Math.sin(bAng) * bDist;
          const br2 = (bd + ss) % 3 === 0 ? 20 + pseudoRand(17 + bd) * 30 | 0 : 140 + pseudoRand(17 + bd) * 80 | 0;
          ctx.fillStyle = `rgba(${br2},0,0,${sAlpha * 0.65 * sp})`;
          ctx.beginPath(); ctx.arc(bx, by, 1.5 + pseudoRand(20 + bd) * 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      
      // Wound scars lingering
      if (phase > 0.6) {
        const wA = (1 - phase) / 0.4;
        const wR = ss % 2 === 0 ? 20 : 90;
        ctx.strokeStyle = `rgba(${wR},0,0,${wA * 0.4 * sp})`;
        ctx.lineWidth = 1.5;
        const wX = baseX + (pseudoRand(22) - 0.5) * 20;
        const wY = baseY + (pseudoRand(23) - 0.5) * 20;
        ctx.beginPath();
        ctx.moveTo(wX - Math.cos(sAng) * sLen * 0.35, wY - Math.sin(sAng) * sLen * 0.35);
        ctx.lineTo(wX + Math.cos(sAng) * sLen * 0.35, wY + Math.sin(sAng) * sLen * 0.35);
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  // Poison screen overlay
  // Poison glow on player only
  if (poisonTimer > 0 && !playerDead) {
    ctx.save();
    ctx.translate(-cx, -cy);
    const pGlow = 0.2 + 0.1 * Math.sin(renderTime * 0.008);
    ctx.fillStyle = `rgba(60,200,30,${pGlow})`;
    ctx.beginPath(); ctx.arc(player.x, player.y - 15, 22, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // HUD (screen space)
  if (showWeaponStats && activeSlot === 0) { try { drawGunHUD(); } catch(e) { console.error("gunHUD err:", e); } }
  if (showWeaponStats && activeSlot === 1) { try { drawMeleeHUD(); } catch(e) { console.error("meleeHUD err:", e); } }
  drawHotbar();
  if (typeof drawCookingHUD === 'function') drawCookingHUD();
  
  // Malevolent Shrine charge bar (only when War Cleaver equipped)
  if (melee.special === 'cleave' && Scene.inDungeon) {
    const barW = 120, barH = 12;
    const barX = BASE_W / 2 - barW / 2, barY = BASE_H - 90;
    const pct = shrine.active ? (shrine.timer / shrine.duration) : (shrine.charges / shrine.chargesMax);
    const ready = shrine.charges >= shrine.chargesMax && !shrine.active;
    
    // Background
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4); ctx.fill();
    
    // Fill bar
    if (shrine.active) {
      ctx.fillStyle = `rgba(255,30,30,${0.6 + 0.3 * Math.sin(renderTime * 0.01)})`;
    } else if (ready) {
      ctx.fillStyle = `rgba(255,40,40,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
    } else {
      ctx.fillStyle = "rgba(180,30,30,0.6)";
    }
    ctx.beginPath(); ctx.roundRect(barX, barY, barW * pct, barH, 3); ctx.fill();
    
    // Border
    ctx.strokeStyle = ready ? "rgba(255,60,60,0.8)" : "rgba(120,30,30,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(barX, barY, barW, barH, 3); ctx.stroke();
    
    // Label
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    if (shrine.active) {
      ctx.fillStyle = "#ff4040";
      ctx.fillText("⛩ MALEVOLENT SHRINE ⛩", barX + barW / 2, barY - 4);
    } else if (ready) {
      ctx.fillStyle = `rgba(255,80,80,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
      ctx.fillText("⛩ PRESS F — SHRINE READY ⛩", barX + barW / 2, barY - 4);
    } else {
      ctx.fillStyle = "#884444";
      ctx.fillText("⛩ " + shrine.charges + "/" + shrine.chargesMax, barX + barW / 2, barY - 4);
    }
    ctx.textAlign = "left";
  }
  // Godspeed charge bar (only when Storm Blade equipped)
  if (melee.special === 'storm' && Scene.inDungeon) {
    const gBarW = 120, gBarH = 12;
    const gBarX = BASE_W / 2 - gBarW / 2, gBarY = BASE_H - 90;
    const gPct = godspeed.active ? (godspeed.timer / godspeed.duration) : (godspeed.charges / godspeed.chargesMax);
    const gReady = godspeed.charges >= godspeed.chargesMax && !godspeed.active;
    
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.roundRect(gBarX - 2, gBarY - 2, gBarW + 4, gBarH + 4, 4); ctx.fill();
    
    if (godspeed.active) {
      ctx.fillStyle = `rgba(180,220,255,${0.6 + 0.3 * Math.sin(renderTime * 0.01)})`;
    } else if (gReady) {
      ctx.fillStyle = `rgba(200,230,255,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
    } else {
      ctx.fillStyle = "rgba(140,180,220,0.6)";
    }
    ctx.beginPath(); ctx.roundRect(gBarX, gBarY, gBarW * gPct, gBarH, 3); ctx.fill();
    
    ctx.strokeStyle = gReady ? "rgba(100,180,255,0.8)" : "rgba(40,80,140,0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(gBarX, gBarY, gBarW, gBarH, 3); ctx.stroke();
    
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    if (godspeed.active) {
      ctx.fillStyle = "#d0e8ff";
      ctx.fillText("⚡ GODSPEED ⚡", gBarX + gBarW / 2, gBarY - 4);
    } else if (gReady) {
      ctx.fillStyle = `rgba(210,235,255,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
      ctx.fillText("⚡ PRESS F — GODSPEED ⚡", gBarX + gBarW / 2, gBarY - 4);
    } else {
      ctx.fillStyle = "#8aabbf";
      ctx.fillText("⚡ " + godspeed.charges + "/" + godspeed.chargesMax, gBarX + gBarW / 2, gBarY - 4);
    }
    ctx.textAlign = "left";
  }
  // Ninja Dash HUD — cooldown bar + dash charges
  if (melee.special === 'ninja' && Scene.inDungeon) {
    const nBarW = 120, nBarH = 8;
    const nBarX = BASE_W / 2 - nBarW / 2, nBarY = BASE_H - 90;
    ctx.fillStyle = "rgba(10,8,20,0.7)";
    ctx.beginPath(); ctx.roundRect(nBarX - 2, nBarY - 2, nBarW + 4, nBarH + 4, 4); ctx.fill();
    const onCooldown = melee.dashCooldown > 0;
    const dashReady = melee.dashCooldown <= 0 && !melee.dashActive;
    if (melee.dashActive) {
      const totalDashes = 3;
      const segW = (nBarW - 4) / totalDashes;
      for (let d = 0; d < totalDashes; d++) {
        const sx = nBarX + 2 + d * segW;
        const hasCharge = d < melee.dashesLeft + (melee.dashing ? 1 : 0);
        ctx.fillStyle = hasCharge ? "rgba(120,60,180,0.9)" : "rgba(40,20,60,0.5)";
        ctx.beginPath(); ctx.roundRect(sx, nBarY, segW - 2, nBarH, 2); ctx.fill();
      }
    } else if (onCooldown) {
      const pct = 1 - (melee.dashCooldown / melee.dashCooldownMax);
      ctx.fillStyle = "rgba(40,25,60,0.6)";
      ctx.beginPath(); ctx.roundRect(nBarX, nBarY, nBarW * pct, nBarH, 3); ctx.fill();
    } else {
      const pulse = 0.7 + 0.3 * Math.sin(renderTime * 0.006);
      ctx.fillStyle = `rgba(120,60,180,${pulse})`;
      ctx.beginPath(); ctx.roundRect(nBarX, nBarY, nBarW, nBarH, 3); ctx.fill();
    }
    ctx.strokeStyle = melee.dashActive ? "rgba(160,80,220,0.7)" : "rgba(80,50,120,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(nBarX, nBarY, nBarW, nBarH, 3); ctx.stroke();
    ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
    if (melee.dashActive) {
      ctx.fillStyle = melee.dashing ? "#e0b0ff" : `rgba(210,160,250,${0.7 + 0.3 * Math.sin(renderTime * 0.01)})`;
      const dLeft = melee.dashesLeft + (melee.dashing ? 0 : 0);
      ctx.fillText("\u{1F5E1} SLASH x" + dLeft + " \u{1F5E1}", nBarX + nBarW / 2, nBarY - 4);
    } else if (dashReady) {
      ctx.fillStyle = `rgba(200,160,240,${0.7 + 0.3 * Math.sin(renderTime * 0.008)})`;
      ctx.fillText("\u{1F5E1} SHIFT \u2014 DASH \u{1F5E1}", nBarX + nBarW / 2, nBarY - 4);
    } else {
      ctx.fillStyle = "#8060a0";
      ctx.fillText("\u{1F5E1} " + Math.ceil(melee.dashCooldown / 60) + "s", nBarX + nBarW / 2, nBarY - 4);
    }
    ctx.textAlign = "left";
  }
  drawChatIcon();
  drawProfileIcon();
  drawMapIcon();
  drawToolboxIcon();
  drawSelectedToolbar();
  drawChatPanel();
  drawProfilePanel();
  drawSettingsPanel();
  drawShopPanel();
  drawIdentityPanel();
  drawStatsPanel();
  drawToolboxPanel();
  drawModifyGunPanel();

  // Placement preview (draw after panels so it shows under them)
  if (activePlaceTool && !UI.isOpen('toolbox')) {
    drawPlacementPreview(cx, cy);
  }

  // ===== PLAYER HP BAR (top center) =====
  const hpBarW = 360, hpBarH = 24;
  const hpBarX = BASE_W / 2 - hpBarW / 2;
  const hpBarY = 16;
  // Always show bar as percentage of maxHp, but display as "HP / 100" style
  const displayHp = Math.max(0, player.hp);
  const displayMax = player.maxHp || 100;
  const hpPct = Math.max(0, Math.min(1, displayHp / displayMax));

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.beginPath();
  ctx.roundRect(hpBarX - 6, hpBarY - 6, hpBarW + 12, hpBarH + 12, 6);
  ctx.fill();

  // Bar track
  ctx.fillStyle = "rgba(255,0,0,0.15)";
  ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);

  // HP fill
  if (hpPct > 0.5) ctx.fillStyle = "#e22";
  else if (hpPct > 0.25) ctx.fillStyle = "#e80";
  else ctx.fillStyle = "#f44";
  if (hpPct <= 0.25 && Math.floor(renderTime / 300) % 2 === 0) ctx.fillStyle = "#f66";
  ctx.fillRect(hpBarX, hpBarY, hpBarW * hpPct, hpBarH);

  // Border
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  ctx.strokeRect(hpBarX, hpBarY, hpBarW, hpBarH);

  // HP text
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";
  ctx.fillText(displayHp + " / " + displayMax, BASE_W / 2, hpBarY + 19);

  // Lives display (big hearts to the left of HP bar) — dungeon only
  if (Scene.inDungeon) {
    ctx.textAlign = "left";
    for (let i = 0; i < 3; i++) {
      ctx.font = "30px monospace";
      ctx.fillStyle = i < lives ? "#e33" : "#333";
      ctx.fillText("♥", hpBarX - 110 + i * 32, hpBarY + 22);
    }
  }

  // ===== WAVE HUD (below HP bar) — dungeon only =====
  if (Scene.inDungeon) {
  ctx.textAlign = "center";
  const waveY = 56;
  const globalWave = (dungeonFloor - 1) * WAVES_PER_FLOOR + wave;
  const totalWaves = MAX_FLOORS * WAVES_PER_FLOOR;
  const floorStartWave = (dungeonFloor - 1) * WAVES_PER_FLOOR;

  // Floor indicator (top center)
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "#b090e0";
  ctx.fillText("FLOOR " + dungeonFloor + " / " + MAX_FLOORS, BASE_W / 2, waveY);

  // Wave number
  ctx.font = "bold 30px monospace";
  if (dungeonComplete && stairsOpen) {
    ctx.fillStyle = "#ffd700";
    ctx.fillText("🏆 DUNGEON COMPLETE!", BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#ffd700";
    ctx.fillText("All " + totalWaves + " waves cleared! Find the exit!", BASE_W / 2, waveY + 50);
  } else if (stairsOpen) {
    ctx.fillStyle = "#b080ff";
    ctx.fillText("FLOOR CLEAR!", BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Find the staircase", BASE_W / 2, waveY + 50);
  } else if (waveState === "cleared") {
    const sec = Math.ceil(waveTimer / 60);
    ctx.fillStyle = "#fa0";
    ctx.fillText("NEXT WAVE IN " + sec, BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("[G] Skip  •  [" + getKeyDisplayName(keybinds.interact) + "] Shop  •  Wave " + globalWave + "/" + totalWaves, BASE_W / 2, waveY + 50);
  } else if (waveState === "active") {
    const isBoss = wave % 10 === 0 && wave >= 10;
    ctx.fillStyle = isBoss ? "#ff4444" : "#fff";
    ctx.fillText("WAVE " + globalWave + "/" + totalWaves, BASE_W / 2, waveY + 30);
    // Theme name
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = isBoss ? "#ff6666" : "#fa0";
    ctx.fillText(waveTheme, BASE_W / 2, waveY + 46);
    ctx.font = "bold 14px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText(mobs.filter(m => m.hp > 0).length + " remaining", BASE_W / 2, waveY + 62);
  } else {
    const sec2 = Math.ceil((1800 - waveTimer) / 60);
    ctx.fillStyle = "#888";
    ctx.fillText("GET READY... " + sec2, BASE_W / 2, waveY + 30);
    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText("[G] Skip  •  [" + getKeyDisplayName(keybinds.interact) + "] Shop", BASE_W / 2, waveY + 50);
  }

  // Kills (top right area)
  ctx.textAlign = "right";
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = "#888";
  ctx.fillText("KILLS", BASE_W - 24, 30);
  ctx.font = "bold 32px monospace";
  ctx.fillStyle = "#fff";
  ctx.fillText(kills.toString(), BASE_W - 24, 62);

  ctx.textAlign = "left";
  } // end dungeon HUD

  // Gold display — dungeon only, centered below wave area
  if (Scene.inDungeon) {
    const goldY = 140;
    // Coin icon
    ctx.fillStyle = "#ffc107";
    ctx.beginPath(); ctx.arc(BASE_W / 2 - 50, goldY, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e6a800";
    ctx.beginPath(); ctx.arc(BASE_W / 2 - 50, goldY, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("G", BASE_W / 2 - 50, goldY + 4);
    // Amount text
    ctx.font = "bold 20px monospace";
    ctx.fillStyle = PALETTE.gold;
    ctx.textAlign = "center";
    ctx.fillText(gold + "g", BASE_W / 2 + 10, goldY + 7);
  }

  // Zone indicator — removed (was behind HP bar)

  // Speed tracker (top-right)
  {
    const spActual = Math.sqrt(player.vx * player.vx + player.vy * player.vy) * 60;
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(spActual)} px/sec`, BASE_W - 10, 16);
    ctx.textAlign = "left";
  }

  // === DEATH / RESPAWN OVERLAY ===
  if (playerDead) {
    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, BASE_W, BASE_H);

    ctx.textAlign = 'center';
    if (deathTimer > 0) {
      // "YOU DIED" text with shake
      const shake = Math.sin(deathTimer * 0.5) * 3;
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#cc2222';
      ctx.fillText('YOU DIED', BASE_W / 2 + shake, BASE_H / 2 - 20);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 34px monospace';
      ctx.fillText('YOU DIED', BASE_W / 2, BASE_H / 2 - 20);
    } else {
      // Respawn countdown
      const secondsLeft = Math.ceil(respawnTimer / 60);
      if (deathGameOver) {
        ctx.font = 'bold 28px monospace';
        ctx.fillStyle = '#cc2222';
        ctx.fillText('GAME OVER', BASE_W / 2, BASE_H / 2 - 40);
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Returning to lobby...', BASE_W / 2, BASE_H / 2);
      } else {
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Respawning in', BASE_W / 2, BASE_H / 2 - 40);
      }
      // Big countdown number
      const pulse = 1 + Math.sin(renderTime / 150) * 0.08;
      ctx.save();
      ctx.translate(BASE_W / 2, BASE_H / 2 + 20);
      ctx.scale(pulse, pulse);
      ctx.font = 'bold 64px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(secondsLeft, 0, 0);
      ctx.restore();
      // Lives remaining
      if (!deathGameOver) {
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = '#e44';
        const livesText = lives === 1 ? '♥  LAST LIFE' : '♥'.repeat(lives) + '  ' + lives + ' lives left';
        ctx.fillText(livesText, BASE_W / 2, BASE_H / 2 + 70);
      }
    }
    ctx.textAlign = 'left';
  }

  // Draw customize screen LAST so it covers all HUD
  drawCustomizeScreen();

  // Draw inventory panel ABSOLUTE LAST — full opaque overlay
  drawInventoryPanel();

  // Zone transition fade
  if (transitioning && transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
    if (transitionAlpha > 0.5) {
      ctx.font = "bold 20px monospace"; ctx.fillStyle = `rgba(255,255,255,${(transitionAlpha - 0.5) * 2})`;
      ctx.textAlign = "center";
      const getSceneLabel = (s) => s === 'lobby' ? "🌳 LOBBY" : s === 'cave' ? "⛰ CAVE" : "⚔ DUNGEON";
      const zoneName = transitionPhase === 1
        ? getSceneLabel(LEVELS[transitionTarget]?.isLobby ? 'lobby' : LEVELS[transitionTarget]?.isCave ? 'cave' : 'dungeon')
        : getSceneLabel(Scene.current);
      ctx.fillText(zoneName, BASE_W / 2, BASE_H / 2);
      ctx.textAlign = "left";
    }
  }
  } catch(drawErr) {
    console.error('DRAW ERROR:', drawErr.message, drawErr.stack);
  }
}
const FIXED_DT = 1000 / 60;
let lastTime = 0;
let accumulator = 0;
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let elapsed = timestamp - lastTime;
  lastTime = timestamp;
  if (elapsed > 100) elapsed = 100;
  accumulator += elapsed;
  let updates = 0;
  while (accumulator >= FIXED_DT && updates < 2) {
    // === SERVER-AUTHORITY LOOP ===
    // 1. Client: gather input → produce commands
    translateIntentsToCommands();
    // 2. Authority: consume commands → run simulation → snapshot
    authorityTick();
    // (In real multiplayer, step 3 would be: apply snapshot from server.
    //  Locally we skip it — authorityTick already mutated GameState directly.)
    accumulator -= FIXED_DT; updates++;
  }
  if (updates === 0) {
    translateIntentsToCommands();
    authorityTick();
    accumulator = 0;
  }
  draw();
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
