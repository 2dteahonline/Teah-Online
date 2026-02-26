// ===================== HIT EFFECT RENDERERS =====================
// Client rendering: all hit effect visual renderers
// Extracted from index_2.html — Phase C

// ===================== HIT EFFECT RENDERERS REGISTRY =====================
// Each hit-effect type maps to a renderer function receiving (h, ctx, alpha).
const HIT_EFFECT_RENDERERS = {
  kill: (h, ctx, alpha) => {
      // Kill burst — larger, green-ish
      const ka = h.life / 25;
      const size = 20 * (1 - ka) + 8;
      ctx.fillStyle = `rgba(255,215,60,${ka * 0.6})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, size, 0, Math.PI * 2); ctx.fill();
      // Gold text floating down-right (away from damage numbers)
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = `rgba(255,215,60,${ka})`;
      ctx.textAlign = "center";
      if (h.gold) ctx.fillText("+" + h.gold + "g", h.x + 15, h.y + 10 + (25 - h.life) * 1.2);
      ctx.textAlign = "left";
  },
  hit: (h, ctx, alpha) => {
      ctx.fillStyle = `rgba(255,60,60,${alpha})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 10 * (1 - alpha) + 5, 0, Math.PI * 2); ctx.fill();
      // Floating damage number
      if (h.dmg) {
        const floatY = h.y - 10 - (19 - h.life) * 1.6;
        ctx.font = "bold 16px monospace";
        ctx.textAlign = "center";
        // White outline
        ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText("-" + h.dmg, h.x, floatY);
        // Red number
        ctx.fillStyle = `rgba(255,80,60,${alpha})`;
        ctx.fillText("-" + h.dmg, h.x, floatY);
        ctx.textAlign = "left";
      }
  },
  crit: (h, ctx, alpha) => {
      // Critical hit — larger purple damage number + subtle star particles
      const prog = 1 - alpha;

      // Subtle star particles flying outward
      if (!h._stars) {
        h._stars = [];
        for (let s = 0; s < 6; s++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 0.8 + Math.random() * 1.2;
          h._stars.push({ ang, spd, size: 2 + Math.random() * 2.5 });
        }
      }
      for (const star of h._stars) {
        const dist2 = prog * star.spd * 28;
        const sx2 = h.x + Math.cos(star.ang) * dist2;
        const sy2 = h.y + Math.sin(star.ang) * dist2;
        const sz = star.size * alpha;
        ctx.fillStyle = `rgba(200,120,255,${alpha * 0.8})`;
        // 4-point star shape
        ctx.beginPath();
        ctx.moveTo(sx2, sy2 - sz);
        ctx.lineTo(sx2 + sz * 0.3, sy2 - sz * 0.3);
        ctx.lineTo(sx2 + sz, sy2);
        ctx.lineTo(sx2 + sz * 0.3, sy2 + sz * 0.3);
        ctx.lineTo(sx2, sy2 + sz);
        ctx.lineTo(sx2 - sz * 0.3, sy2 + sz * 0.3);
        ctx.lineTo(sx2 - sz, sy2);
        ctx.lineTo(sx2 - sz * 0.3, sy2 - sz * 0.3);
        ctx.closePath(); ctx.fill();
      }

      if (h.dmg) {
        const floatY = h.y - 14 - (28 - h.life) * 2.0;
        // Large purple damage number
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.strokeStyle = `rgba(30,0,50,${alpha})`;
        ctx.lineWidth = 4;
        ctx.strokeText("-" + h.dmg, h.x, floatY);
        ctx.fillStyle = `rgba(190,80,255,${alpha})`;
        ctx.fillText("-" + h.dmg, h.x, floatY);
        ctx.textAlign = "left";
      }
  },
  frost_hit: (h, ctx, alpha) => {
      // Big cyan ice burst on impact
      const prog = 1 - alpha;
      ctx.fillStyle = `rgba(60,180,255,${alpha * 0.6})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 20 * prog + 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(180,230,255,${alpha * 0.4})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 12 * prog + 4, 0, Math.PI * 2); ctx.fill();
      // Ice shards flying outward
      for (let ic = 0; ic < 6; ic++) {
        const ia = ic * Math.PI / 3 + prog * 1.5;
        const id = prog * 24 + 5;
        ctx.fillStyle = `rgba(200,240,255,${alpha * 0.9})`;
        ctx.save();
        ctx.translate(h.x + Math.cos(ia) * id, h.y + Math.sin(ia) * id);
        ctx.rotate(ia);
        ctx.fillRect(-2, -4, 4, 8);
        ctx.restore();
      }
  },
  burn_hit: (h, ctx, alpha) => {
      // Big orange fire burst on impact
      const prog = 1 - alpha;
      ctx.fillStyle = `rgba(255,120,20,${alpha * 0.6})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 22 * prog + 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,220,60,${alpha * 0.4})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 12 * prog + 4, 0, Math.PI * 2); ctx.fill();
      // Fire sparks flying outward
      for (let fc = 0; fc < 8; fc++) {
        const fa = fc * Math.PI / 4 + prog * 2;
        const fd = prog * 22 + 4;
        const fSize = (1 - prog) * 4 + 1;
        ctx.fillStyle = `rgba(255,${180 - fc * 15},40,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(fa) * fd, h.y + Math.sin(fa) * fd, fSize, 0, Math.PI * 2); ctx.fill();
      }
  },
  burn_tick: (h, ctx, alpha) => {
      // Orange burn DOT damage number floating up
      if (h.dmg) {
        if (!h.maxLife) h.maxLife = h.life;
        const floatY = h.y - 8 - (h.maxLife - h.life) * 1.8;
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.strokeStyle = `rgba(80,20,0,${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText("🔥-" + h.dmg, h.x + 12, floatY);
        ctx.fillStyle = `rgba(255,120,20,${alpha})`;
        ctx.fillText("🔥-" + h.dmg, h.x + 12, floatY);
        ctx.textAlign = "left";
      }
  },
  godspeed_activate: (h, ctx, alpha) => {
      // Massive white-blue lightning burst
      const prog = 1 - alpha;
      const r = 40 + prog * 180;
      ctx.strokeStyle = `rgba(200,225,255,${alpha * 0.8})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(230,240,255,${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
      for (let lb = 0; lb < 16; lb++) {
        const la = lb * Math.PI / 8 + prog * 1.2;
        ctx.strokeStyle = `rgba(${210 + Math.random() * 45 | 0},${225 + Math.random() * 30 | 0},255,${alpha * 0.85})`;
        ctx.lineWidth = 2 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        let lx = h.x, ly = h.y;
        const steps = 4 + (Math.random() * 3 | 0);
        for (let s = 1; s <= steps; s++) {
          const t2 = s / steps;
          const targetX = h.x + Math.cos(la) * r * t2;
          const targetY = h.y + Math.sin(la) * r * t2;
          lx = targetX + (Math.random() - 0.5) * 30;
          ly = targetY + (Math.random() - 0.5) * 30;
          ctx.lineTo(lx, ly);
        }
        ctx.stroke();
      }
  },
  ground_lightning: (h, ctx, alpha) => {
      // Kashimo-style — jagged lightning bolt shooting UP from the ground
      const prog = 1 - alpha;
      const baseY = h.y + 10;
      const topY = h.y - 50 - prog * 30;

      for (let bolt = 0; bolt < 2; bolt++) {
        const bOffset = (bolt - 0.5) * 8;
        ctx.strokeStyle = bolt === 0
          ? `rgba(${200 + Math.random() * 50 | 0},${220 + Math.random() * 30 | 0},255,${alpha * 0.9})`
          : `rgba(240,248,255,${alpha * 0.5})`;
        ctx.lineWidth = bolt === 0 ? (3 + Math.random() * 2) : 1.5;
        ctx.beginPath();
        ctx.moveTo(h.x + bOffset, baseY);
        let lx2 = h.x + bOffset;
        const segs = 6;
        for (let s = 1; s <= segs; s++) {
          const sy2 = baseY + (topY - baseY) * (s / segs);
          lx2 = h.x + bOffset + (Math.random() - 0.5) * 25;
          ctx.lineTo(lx2, sy2);
        }
        ctx.stroke();

        if (bolt === 0) {
          for (let br = 0; br < 3; br++) {
            const brY = baseY + (topY - baseY) * (0.2 + br * 0.25);
            const brX = h.x + (Math.random() - 0.5) * 20;
            const brEndX = brX + (Math.random() - 0.5) * 40;
            const brEndY = brY + (Math.random() - 0.5) * 20;
            ctx.strokeStyle = `rgba(${210 + Math.random() * 40 | 0},${225 + Math.random() * 30 | 0},255,${alpha * 0.6})`;
            ctx.lineWidth = 1 + Math.random();
            ctx.beginPath();
            ctx.moveTo(brX, brY);
            ctx.lineTo(brX + (brEndX - brX) * 0.5 + (Math.random() - 0.5) * 15, brY + (brEndY - brY) * 0.5);
            ctx.lineTo(brEndX, brEndY);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = `rgba(210,235,255,${alpha * 0.5})`;
      ctx.beginPath(); ctx.arc(h.x, baseY, 12 + prog * 8, 0, Math.PI * 2); ctx.fill();
      for (let gs = 0; gs < 4; gs++) {
        const gsa = Math.random() * Math.PI;
        const gsd = (4 + Math.random() * 12) * prog;
        ctx.fillStyle = `rgba(${225 + Math.random() * 30 | 0},${235 + Math.random() * 20 | 0},255,${alpha * 0.7})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(gsa) * gsd, baseY - Math.sin(gsa) * gsd * 0.5, 1.5 + Math.random(), 0, Math.PI * 2); ctx.fill();
      }
  },
  shockwave: (h, ctx, alpha) => {
      // Expanding white-blue ring
      const prog = 1 - alpha;
      const radius = 20 + prog * 60;
      ctx.strokeStyle = `rgba(200,225,255,${alpha * 0.75})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(230,240,255,${alpha * 0.45})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius * 0.7, 0, Math.PI * 2); ctx.stroke();
  },
  thorns: (h, ctx, alpha) => {
      // Orange-red sparks radiating from mob that got thorns'd
      const prog = 1 - alpha;
      for (let s = 0; s < 6; s++) {
        const a = (s / 6) * Math.PI * 2 + prog * 2;
        const r = 8 + prog * 20;
        ctx.fillStyle = `rgba(255,${120 + s * 20},30,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = `rgba(255,160,40,${alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, 8 + prog * 15, 0, Math.PI * 2); ctx.stroke();
  },
  lightning: (h, ctx, alpha) => {
      // Jagged lightning bolt between two points — white/light blue
      if (h.tx !== undefined) {
        const segments = 5;
        ctx.strokeStyle = `rgba(200,225,255,${alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        for (let seg = 1; seg < segments; seg++) {
          const t2 = seg / segments;
          const lx = h.x + (h.tx - h.x) * t2 + (Math.random() - 0.5) * 20;
          const ly = h.y + (h.ty - h.y) * t2 + (Math.random() - 0.5) * 20;
          ctx.lineTo(lx, ly);
        }
        ctx.lineTo(h.tx, h.ty);
        ctx.stroke();
        // Bright white core
        ctx.strokeStyle = `rgba(240,248,255,${alpha * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(h.tx, h.ty);
        ctx.stroke();
      }
  },
  cleave_hit: (h, ctx, alpha) => {
      // Red slash burst
      const prog = 1 - alpha;
      ctx.strokeStyle = `rgba(255,60,40,${alpha * 0.6})`;
      ctx.lineWidth = 2;
      for (let cs = 0; cs < 3; cs++) {
        const ca = cs * Math.PI * 2 / 3 + prog * 2;
        const cr = 8 + prog * 16;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(ca) * 4, h.y + Math.sin(ca) * 4);
        ctx.lineTo(h.x + Math.cos(ca) * cr, h.y + Math.sin(ca) * cr);
        ctx.stroke();
      }
  },
  blood_slash_hit: (h, ctx, alpha) => {
      // Blood slash impact on mob — big dramatic crossing slashes
      const prog = 1 - alpha;
      ctx.save();
      ctx.translate(h.x, h.y);
      // Blood mist burst
      ctx.fillStyle = `rgba(180,10,15,${alpha * 0.4})`;
      ctx.beginPath(); ctx.arc(0, 0, 14 + prog * 20, 0, Math.PI * 2); ctx.fill();
      // Big X-shaped blood slashes
      ctx.strokeStyle = `rgba(220,20,30,${alpha * 0.9})`;
      ctx.lineWidth = 4;
      const sl = 12 + prog * 22;
      ctx.beginPath(); ctx.moveTo(-sl, -sl); ctx.lineTo(sl, sl); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sl, -sl); ctx.lineTo(-sl, sl); ctx.stroke();
      // Inner bright slash
      ctx.strokeStyle = `rgba(255,80,70,${alpha * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-sl*0.7, -sl*0.7); ctx.lineTo(sl*0.7, sl*0.7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sl*0.7, -sl*0.7); ctx.lineTo(-sl*0.7, sl*0.7); ctx.stroke();
      ctx.restore();
  },
  blood_slash_arc: (h, ctx, alpha) => {
      // Blood slash arc — big sweeping blade of blood radiating outward
      const prog = 1 - alpha;
      const reach = 40 + prog * 260;
      const cx = h.px + Math.cos(h.angle) * reach;
      const cy = h.py + Math.sin(h.angle) * reach;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(h.angle);
      // Outer blood glow
      ctx.fillStyle = `rgba(180,10,15,${alpha * 0.35})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 32, 10, 0, 0, Math.PI * 2); ctx.fill();
      // Main slash blade
      ctx.strokeStyle = `rgba(210,15,25,${alpha * 0.85})`;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.stroke();
      // Bright core streak
      ctx.strokeStyle = `rgba(255,60,50,${alpha * 0.7})`;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.stroke();
      // Hot center
      ctx.fillStyle = `rgba(255,100,80,${alpha * 0.6})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
  },
  frost_nova: (h, ctx, alpha) => {
      // Expanding cyan frost ring with ice crystals
      const prog = 1 - alpha;
      const radius = 15 + prog * 110;
      ctx.strokeStyle = `rgba(100,220,255,${alpha * 0.8})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(180,240,255,${alpha * 0.4})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(100,200,255,${alpha * 0.12})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius, 0, Math.PI * 2); ctx.fill();
      // Ice crystal particles
      for (let ic = 0; ic < 8; ic++) {
        const ia = (ic / 8) * Math.PI * 2 + prog * 3;
        const ir = radius * 0.85;
        const ix = h.x + Math.cos(ia) * ir, iy = h.y + Math.sin(ia) * ir;
        ctx.fillStyle = `rgba(200,240,255,${alpha * 0.9})`;
        ctx.save(); ctx.translate(ix, iy); ctx.rotate(ia);
        ctx.fillRect(-2, -4, 4, 8); ctx.fillRect(-4, -2, 8, 4);
        ctx.restore();
      }
  },
  inferno_explode: (h, ctx, alpha) => {
      // Fiery explosion — expanding orange/red ring with flame particles
      const prog = 1 - alpha;
      const radius = 10 + prog * 95;
      ctx.fillStyle = `rgba(255,120,20,${alpha * 0.2})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,80,20,${alpha * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = `rgba(255,200,40,${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, radius * 0.5, 0, Math.PI * 2); ctx.stroke();
      // Flame particles
      for (let fp = 0; fp < 10; fp++) {
        const fa = (fp / 10) * Math.PI * 2 + prog * 4;
        const fr = radius * (0.5 + Math.random() * 0.5);
        const fx = h.x + Math.cos(fa) * fr, fy = h.y + Math.sin(fa) * fr - prog * 15;
        const fs = 3 + Math.random() * 3;
        ctx.fillStyle = `rgba(255,${150 + Math.floor(Math.random() * 80)},20,${alpha * 0.7})`;
        ctx.beginPath(); ctx.arc(fx, fy, fs * alpha, 0, Math.PI * 2); ctx.fill();
      }
  },
  shrine_activate: (h, ctx, alpha) => {
      // Domain expansion burst — slashes radiating outward
      const prog = 1 - alpha;
      const r = 30 + prog * 150;
      // Subtle expanding ring
      ctx.strokeStyle = `rgba(150,0,0,${alpha * 0.4})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.stroke();
      // Radiating slash marks bursting from center — the main event
      for (let rs = 0; rs < 16; rs++) {
        const ra = rs * Math.PI / 8 + prog * 0.8;
        const rStart = 10 + prog * 20;
        const rLen = rStart + r * 0.6;
        const thick = 1.5 + Math.random() * 2;
        ctx.strokeStyle = `rgba(${180 + Math.random() * 60 | 0},0,0,${alpha * 0.7})`;
        ctx.lineWidth = thick;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(ra) * rStart, h.y + Math.sin(ra) * rStart);
        ctx.lineTo(h.x + Math.cos(ra) * rLen, h.y + Math.sin(ra) * rLen);
        ctx.stroke();
        // Blood drops at slash tips
        ctx.fillStyle = `rgba(160,0,0,${alpha * 0.6})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(ra) * rLen, h.y + Math.sin(ra) * rLen, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
  },
  shrine_slash: (h, ctx, alpha) => {
      // JJK-style bloody slash — big violent cut with blood splatter
      const a = h.angle || 0;
      const len = 40 * alpha; // BIG slashes
      // Color cycle — black, dark red, crimson
      if (!h.slashColor) {
        const ct = Math.random();
        if (ct < 0.3) h.slashColor = { r: 20, g: 0, b: 0 }; // black
        else if (ct < 0.6) h.slashColor = { r: 70, g: 0, b: 5 }; // blackish-red
        else h.slashColor = { r: 200 + Math.random() * 55, g: 10, b: 10 }; // blood red
      }
      const sc = h.slashColor;
      // Main deep cut
      ctx.strokeStyle = `rgba(${sc.r | 0},${sc.g},${sc.b},${alpha * 0.9})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(h.x - Math.cos(a) * len, h.y - Math.sin(a) * len);
      ctx.lineTo(h.x + Math.cos(a) * len, h.y + Math.sin(a) * len);
      ctx.stroke();
      // Bright inner
      ctx.strokeStyle = `rgba(${Math.min(255, sc.r + 80) | 0},${sc.g + 30},${sc.b + 20},${alpha * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(h.x - Math.cos(a) * len * 0.7, h.y - Math.sin(a) * len * 0.7);
      ctx.lineTo(h.x + Math.cos(a) * len * 0.7, h.y + Math.sin(a) * len * 0.7);
      ctx.stroke();
      // Blood splatter
      if (!h.bloodDrops) {
        h.bloodDrops = [];
        for (let bd = 0; bd < 6; bd++) {
          const perpA = a + Math.PI / 2 + (Math.random() - 0.5) * 1.5;
          const bct = Math.random();
          h.bloodDrops.push({
            ox: (Math.random() - 0.5) * len * 1.2,
            oy: (Math.random() - 0.5) * len * 0.6,
            vx: Math.cos(perpA) * (3 + Math.random() * 5),
            vy: Math.sin(perpA) * (3 + Math.random() * 5),
            size: 2 + Math.random() * 3,
            r: bct < 0.4 ? 20 : 150 + Math.random() * 80,
          });
        }
      }
      const prog = 1 - alpha;
      for (const bd of h.bloodDrops) {
        const bx = h.x + bd.ox + bd.vx * prog * 10;
        const by = h.y + bd.oy + bd.vy * prog * 10;
        ctx.fillStyle = `rgba(${bd.r | 0},0,0,${alpha * 0.8})`;
        ctx.beginPath(); ctx.arc(bx, by, bd.size * alpha, 0, Math.PI * 2); ctx.fill();
      }
      // Cross-cut
      const a2 = a + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      const len2 = len * 0.55;
      ctx.strokeStyle = `rgba(${sc.r * 0.7 | 0},0,0,${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(h.x - Math.cos(a2) * len2, h.y - Math.sin(a2) * len2);
      ctx.lineTo(h.x + Math.cos(a2) * len2, h.y + Math.sin(a2) * len2);
      ctx.stroke();
  },
  poison_hit: (h, ctx, alpha) => {
      // Green splash when arrow hits player
      const pa = h.life / 20;
      const pp = 1 - pa;
      ctx.fillStyle = `rgba(80,220,40,${pa * 0.6})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 10 + pp * 20, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(100,255,60,${pa * 0.8})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, 5 + pp * 25, 0, Math.PI * 2); ctx.stroke();
      // Poison droplets
      for (let d = 0; d < 5; d++) {
        const da = d * 1.257 + pp * 4;
        const dd = 8 + pp * 18;
        ctx.fillStyle = `rgba(60,180,30,${pa * 0.7})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(da)*dd, h.y + Math.sin(da)*dd, 3, 0, Math.PI * 2); ctx.fill();
      }
      // Green poison damage number
      if (h.dmg) {
        if (!h.maxLife) h.maxLife = h.life;
        const floatY = h.y - 8 - (h.maxLife - h.life) * 1.8;
        ctx.font = "bold 15px monospace";
        ctx.textAlign = "center";
        ctx.strokeStyle = `rgba(0,40,0,${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText("☠-" + h.dmg, h.x - 12, floatY);
        ctx.fillStyle = `rgba(60,220,40,${alpha})`;
        ctx.fillText("☠-" + h.dmg, h.x - 12, floatY);
        ctx.textAlign = "left";
      }
  },
  heal: (h, ctx, alpha) => {
      const maxLife = h.maxLife || 20;
      const ha = Math.min(1, h.life / maxLife);
      const floatY = h.y - 10 - (1 - h.life / maxLife) * 40;
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = `rgba(0,0,0,${ha})`;
      ctx.lineWidth = 3;
      ctx.strokeText("+" + h.dmg, h.x, floatY);
      ctx.fillStyle = `rgba(80,255,120,${ha})`;
      ctx.fillText("+" + h.dmg, h.x, floatY);
      ctx.textAlign = "left";
      ctx.fillStyle = `rgba(80,255,120,${ha * 0.4})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(0, 12 * (1 - ha) + 4), 0, Math.PI * 2); ctx.fill();
  },
  grab: (h, ctx, alpha) => {
      const ga = Math.min(1, h.life / 20);
      const floatY = h.y - 10 - (1 - h.life / 20) * 30;
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = `rgba(0,0,0,${ga})`; ctx.lineWidth = 3;
      ctx.strokeText("-" + h.dmg, h.x, floatY);
      ctx.fillStyle = `rgba(255,160,60,${ga})`;
      ctx.fillText("-" + h.dmg, h.x, floatY);
      ctx.textAlign = "left";
  },
  explosion: (h, ctx, alpha) => {
      // Boulder SHATTERS — MASSIVE boss-level impact
      const ea = h.life / 30;
      const progress = 1 - ea;

      // Massive initial flash — white-hot
      if (progress < 0.12) {
        const flashA = (1 - progress / 0.12) * 0.8;
        const flashR = 70 * (progress / 0.12);
        ctx.fillStyle = `rgba(255,255,220,${flashA})`;
        ctx.beginPath(); ctx.arc(h.x, h.y, flashR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(255,200,100,${flashA * 0.5})`;
        ctx.beginPath(); ctx.arc(h.x, h.y, flashR * 1.8, 0, Math.PI * 2); ctx.fill();
      }

      // Double shockwave rings
      ctx.strokeStyle = `rgba(200,180,140,${ea * 0.6})`;
      ctx.lineWidth = 5 * ea;
      ctx.beginPath(); ctx.arc(h.x, h.y, 25 + progress * 120, 0, Math.PI * 2); ctx.stroke();
      if (progress > 0.1) {
        ctx.strokeStyle = `rgba(160,140,100,${ea * 0.3})`;
        ctx.lineWidth = 3 * ea;
        ctx.beginPath(); ctx.arc(h.x, h.y, 10 + (progress - 0.1) * 160, 0, Math.PI * 2); ctx.stroke();
      }

      // MASSIVE rock chunks — 14 big jagged pieces flying apart
      const chunkData = [
        { a: 0.2, sp: 1.0, sz: 28, sh: 0, sn: 2.5 },
        { a: 0.7, sp: 1.6, sz: 22, sh: 1, sn: -3.0 },
        { a: 1.2, sp: 0.9, sz: 30, sh: 2, sn: 1.8 },
        { a: 1.7, sp: 1.8, sz: 18, sh: 0, sn: -2.2 },
        { a: 2.3, sp: 1.2, sz: 26, sh: 1, sn: 3.5 },
        { a: 2.8, sp: 1.5, sz: 20, sh: 2, sn: -1.5 },
        { a: 3.4, sp: 1.1, sz: 32, sh: 0, sn: 2.0 },
        { a: 3.9, sp: 1.7, sz: 16, sh: 1, sn: -4.0 },
        { a: 4.4, sp: 1.3, sz: 24, sh: 2, sn: 2.8 },
        { a: 5.0, sp: 1.9, sz: 14, sh: 0, sn: -2.5 },
        { a: 5.5, sp: 1.0, sz: 20, sh: 1, sn: 3.2 },
        { a: 5.9, sp: 1.4, sz: 26, sh: 2, sn: -1.8 },
        { a: 0.5, sp: 2.0, sz: 12, sh: 0, sn: 4.5 },
        { a: 3.1, sp: 2.2, sz: 10, sh: 1, sn: -3.8 },
      ];
      const rkC = ["#6a6458", "#5a5448", "#7a7468"];
      const rkH = ["#8a8478", "#7a7468", "#9a9488"];

      for (const ck of chunkData) {
        const d2 = progress * ck.sp * 110;
        const ccx = h.x + Math.cos(ck.a) * d2;
        const grav = progress * progress * 80;
        const ccy = h.y + Math.sin(ck.a) * d2 * 0.6 - (progress * 55 - grav);
        const csz = ck.sz * (1 - progress * 0.4);
        const crot = ck.a + progress * ck.sn;
        if (csz < 2) continue;

        ctx.save();
        ctx.translate(ccx, ccy);
        ctx.rotate(crot);
        ctx.globalAlpha = ea;

        // Jagged rock polygon
        ctx.fillStyle = rkC[ck.sh];
        ctx.beginPath();
        ctx.moveTo(-csz*0.5, -csz*0.25); ctx.lineTo(-csz*0.2, -csz*0.55);
        ctx.lineTo(csz*0.15, -csz*0.5); ctx.lineTo(csz*0.5, -csz*0.2);
        ctx.lineTo(csz*0.45, csz*0.25); ctx.lineTo(csz*0.1, csz*0.5);
        ctx.lineTo(-csz*0.35, csz*0.45); ctx.lineTo(-csz*0.55, csz*0.1);
        ctx.closePath(); ctx.fill();

        // Highlight face
        ctx.fillStyle = rkH[ck.sh];
        ctx.beginPath();
        ctx.moveTo(-csz*0.35, -csz*0.15); ctx.lineTo(-csz*0.1, -csz*0.4);
        ctx.lineTo(csz*0.25, -csz*0.3); ctx.lineTo(csz*0.1, 0);
        ctx.closePath(); ctx.fill();

        // Crack lines
        ctx.strokeStyle = "#3a3428"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-csz*0.3, -csz*0.15); ctx.lineTo(csz*0.2, csz*0.25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(csz*0.1, -csz*0.3); ctx.lineTo(-csz*0.15, csz*0.1); ctx.stroke();

        // Shadow edge
        ctx.strokeStyle = `rgba(30,25,15,${ea*0.4})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(csz*0.1, csz*0.5); ctx.lineTo(-csz*0.35, csz*0.45); ctx.lineTo(-csz*0.55, csz*0.1); ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();

        // Each chunk trails dust
        if (progress > 0.1 && progress < 0.8) {
          ctx.fillStyle = `rgba(150,135,110,${ea*0.2})`;
          ctx.beginPath(); ctx.arc(ccx - Math.cos(ck.a)*12, ccy + 5, csz*0.4, 0, Math.PI*2); ctx.fill();
        }
      }

      // Heavy layered dust clouds
      for (let layer = 0; layer < 3; layer++) {
        const lp = Math.max(0, progress - layer * 0.08);
        if (lp <= 0) continue;
        const dA = ea * (0.3 - layer * 0.08);
        for (let d = 0; d < 8; d++) {
          const da = d * 0.785 + layer * 0.4 + lp * 0.3;
          const dd = (20 + lp * (60 + layer * 30)) * (0.6 + d * 0.05);
          const dSz = (18 - layer*3) + lp * (20 - layer*5);
          ctx.fillStyle = `rgba(${130+layer*15},${115+layer*15},${90+layer*10},${dA})`;
          ctx.beginPath(); ctx.arc(h.x + Math.cos(da)*dd, h.y + Math.sin(da)*dd*0.5, dSz, 0, Math.PI*2); ctx.fill();
        }
      }

      // Gravel spray — 20 tiny spinning pieces
      for (let p = 0; p < 20; p++) {
        const pa = p * 0.314 + 0.1;
        const pd = progress * (1.2 + (p%5)*0.3) * 120;
        const pgr = progress * progress * 55;
        const ppx = h.x + Math.cos(pa) * pd;
        const ppy = h.y + Math.sin(pa) * pd * 0.5 - (progress*40 - pgr);
        const pps = (3 - progress*2) * (1 + (p%3)*0.3);
        if (pps > 0.5) {
          ctx.globalAlpha = ea * 0.7;
          ctx.fillStyle = p%2===0 ? "#7a7060" : "#5a5040";
          ctx.save(); ctx.translate(ppx, ppy); ctx.rotate(progress*(p+1)*2);
          ctx.fillRect(-pps/2, -pps/2, pps, pps);
          ctx.restore(); ctx.globalAlpha = 1;
        }
      }

      // Ground impact crater with radial cracks
      if (progress > 0.15) {
        const cp2 = (progress - 0.15) / 0.85;
        const cA = ea * 0.5;
        ctx.fillStyle = `rgba(45,35,22,${cA*0.4})`;
        ctx.beginPath(); ctx.ellipse(h.x, h.y+5, 50+cp2*15, 20+cp2*6, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(30,22,12,${cA*0.6})`;
        ctx.beginPath(); ctx.ellipse(h.x, h.y+4, 35+cp2*8, 14+cp2*3, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = `rgba(90,75,55,${cA*0.4})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(h.x, h.y+4, 38+cp2*8, 16+cp2*3, 0, 0, Math.PI*2); ctx.stroke();
        // Radial cracks from crater
        for (let cr = 0; cr < 8; cr++) {
          const cra = cr * 0.785;
          ctx.strokeStyle = `rgba(50,40,25,${cA*0.3})`; ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(h.x + Math.cos(cra)*25, h.y+4 + Math.sin(cra)*10);
          ctx.lineTo(h.x + Math.cos(cra)*(25+20+cp2*30), h.y+4 + Math.sin(cra)*(10+(20+cp2*30)*0.4));
          ctx.stroke();
        }
      }

      // Lingering smoke columns rising
      if (progress > 0.5) {
        const smP = (progress - 0.5) / 0.5;
        for (let s = 0; s < 4; s++) {
          const smx = h.x + (s-1.5)*18;
          const smy = h.y - smP*(30+s*15);
          ctx.fillStyle = `rgba(100,90,70,${ea*0.15*(1-smP)})`;
          ctx.beginPath(); ctx.arc(smx, smy, 8+smP*12, 0, Math.PI*2); ctx.fill();
        }
      }
  },
  mummy_explode: (h, ctx, alpha) => {
      // Mummy explosion — sickly green toxic blast (smaller)
      const ea = h.life / 35;
      const progress = 1 - ea;
      // Outer shockwave
      ctx.strokeStyle = `rgba(120,200,60,${ea * 0.7})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(h.x, h.y, 25 + progress * 90, 0, Math.PI * 2); ctx.stroke();
      // Second ring
      ctx.strokeStyle = `rgba(180,220,80,${ea * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, 18 + progress * 65, 0, Math.PI * 2); ctx.stroke();
      // Third ring
      ctx.strokeStyle = `rgba(100,180,40,${ea * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 30 + progress * 100, 0, Math.PI * 2); ctx.stroke();
      // Inner toxic cloud
      const grad = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 45 + progress * 45);
      grad.addColorStop(0, `rgba(200,240,80,${ea * 0.8})`);
      grad.addColorStop(0.3, `rgba(140,200,40,${ea * 0.6})`);
      grad.addColorStop(0.6, `rgba(80,140,20,${ea * 0.3})`);
      grad.addColorStop(1, `rgba(40,60,10,0)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(h.x, h.y, 45 + progress * 45, 0, Math.PI * 2); ctx.fill();
      // Flying bandage strips
      for (let d = 0; d < 10; d++) {
        const angle = d * 0.628 + progress * 3;
        const dist2 = 15 + progress * 65;
        const bx = h.x + Math.cos(angle) * dist2;
        const by = h.y + Math.sin(angle) * dist2 - progress * 25;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle + progress * 5);
        ctx.fillStyle = `rgba(180,175,160,${ea * 0.8})`;
        ctx.fillRect(-10, -2, 20, 4);
        ctx.restore();
      }
      // Green smoke puffs
      for (let p = 0; p < 6; p++) {
        const pa = p * 1.047 + progress * 2;
        const pd = 12 + progress * 45;
        const px2 = h.x + Math.cos(pa) * pd;
        const py2 = h.y + Math.sin(pa) * pd - progress * 15;
        ctx.fillStyle = `rgba(100,160,40,${ea * 0.35})`;
        ctx.beginPath(); ctx.arc(px2, py2, 10 - progress * 5, 0, Math.PI * 2); ctx.fill();
      }
      // Ground residue
      if (progress > 0.2) {
        ctx.fillStyle = `rgba(60,80,20,${ea * 0.3})`;
        ctx.beginPath(); ctx.ellipse(h.x, h.y + 8, 35, 14, 0, 0, Math.PI * 2); ctx.fill();
      }
  },
  poison_tick: (h, ctx, alpha) => {
      // Small green damage number float up
      const pa = h.life / 20;
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = `rgba(80,220,40,${pa})`;
      ctx.textAlign = "center";
      ctx.fillText("-1 ☠", h.x, h.y - (20 - h.life) * 1.2);
  },
  heal_zone: (h, ctx, alpha) => {
      // Tiny subtle heal circle — barely visible, like a faint shimmer
      const za = h.life / 25;
      const zr = 45; // small — about double hitbox size
      // Very faint fill
      ctx.fillStyle = `rgba(220,255,220,${za * 0.04})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, zr, 0, Math.PI * 2); ctx.fill();
      // Hair-thin ring
      ctx.strokeStyle = `rgba(220,255,220,${za * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(h.x, h.y, zr, 0, Math.PI * 2); ctx.stroke();
  },
  heal_beam: (h, ctx, alpha) => {
      // No visible beam — healing is silent
  },
  mob_heal: (h, ctx, alpha) => {
      // Green +HP text floating up
      const ha = h.life / 20;
      const hp2 = 1 - ha;
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = `rgba(80,200,80,${ha * 0.8})`;
      ctx.textAlign = "center";
      ctx.fillText("+" + (h.healAmt || 8), h.x, h.y - hp2 * 18);
  },
  stomp: (h, ctx, alpha) => {
      // Golem ground stomp — expanding ring with dust
      const sa = h.life / 20;
      const sp = 1 - sa;
      const sr = 30 + sp * 70;
      ctx.strokeStyle = `rgba(120,100,80,${sa * 0.5})`;
      ctx.lineWidth = 4 * sa;
      ctx.beginPath(); ctx.arc(h.x, h.y, sr, 0, Math.PI * 2); ctx.stroke();
      // Dust particles
      for (let d = 0; d < 5; d++) {
        const da = d * 1.257 + sp * 3;
        ctx.fillStyle = `rgba(140,120,100,${sa * 0.3})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(da)*sr*0.8, h.y + Math.sin(da)*sr*0.5, 3 * sa, 0, Math.PI * 2); ctx.fill();
      }
  },
  arrow_bounce: (h, ctx, alpha) => {
      // Green spark on wall bounce
      const ba = h.life / 12;
      ctx.fillStyle = `rgba(100,255,60,${ba * 0.6})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 6 * ba, 0, Math.PI * 2); ctx.fill();
      for (let s = 0; s < 3; s++) {
        const sa2 = s * 2.094 + (1 - ba) * 5;
        ctx.fillStyle = `rgba(80,200,40,${ba * 0.5})`;
        ctx.beginPath(); ctx.arc(h.x + Math.cos(sa2)*8*(1-ba), h.y + Math.sin(sa2)*8*(1-ba), 2, 0, Math.PI * 2); ctx.fill();
      }
  },
  arrow_fade: (h, ctx, alpha) => {
      // Arrow dissolves
      const fa = h.life / 8;
      ctx.fillStyle = `rgba(60,160,30,${fa * 0.4})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 5 * fa, 0, Math.PI * 2); ctx.fill();
  },
  summon: (h, ctx, alpha) => {
      const sa = h.life / 20;
      ctx.fillStyle = `rgba(120,60,180,${sa * 0.5})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 16 * (1 - sa) + 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(160,80,220,${sa * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 20 * (1 - sa) + 4, 0, Math.PI * 2); ctx.stroke();
  },
  ninja_dash: (h, ctx, alpha) => {
      // Dark slash burst on dash start
      const prog = 1 - alpha;
      for (let ns = 0; ns < 6; ns++) {
        const na = ns * Math.PI / 3 + prog * 2;
        const nd = 10 + prog * 30;
        ctx.strokeStyle = `rgba(20,15,30,${alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(na) * 5, h.y + Math.sin(na) * 5);
        ctx.lineTo(h.x + Math.cos(na) * nd, h.y + Math.sin(na) * nd);
        ctx.stroke();
      }
      // Dark smoke puff
      ctx.fillStyle = `rgba(15,10,25,${alpha * 0.3})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 15 + prog * 20, 0, Math.PI * 2); ctx.fill();
  },
  ninja_activate: (h, ctx, alpha) => {
      // Shift pressed — purple burst ring expanding
      const prog = 1 - alpha;
      // Expanding purple ring
      ctx.strokeStyle = `rgba(140,60,200,${alpha * 0.7})`;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, 10 + prog * 50, 0, Math.PI * 2); ctx.stroke();
      // Inner white flash
      ctx.fillStyle = `rgba(200,170,255,${alpha * 0.25})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 8 + prog * 30, 0, Math.PI * 2); ctx.fill();
      // 4 radiating kanji-style slash marks
      for (let ns = 0; ns < 4; ns++) {
        const na = ns * Math.PI / 2 + prog * 1.5;
        ctx.strokeStyle = `rgba(100,40,160,${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(h.x + Math.cos(na) * (15 + prog * 15), h.y + Math.sin(na) * (15 + prog * 15));
        ctx.lineTo(h.x + Math.cos(na) * (25 + prog * 30), h.y + Math.sin(na) * (25 + prog * 30));
        ctx.stroke();
      }
  },
  ninja_aoe: (h, ctx, alpha) => {
      // AOE slash ring around hit target — expanding dark purple ring with slash marks
      const prog = 1 - alpha;
      const r = 15 + prog * 45;
      // Dark ring
      ctx.strokeStyle = `rgba(60,25,90,${alpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.stroke();
      // Purple inner fill
      ctx.fillStyle = `rgba(80,30,120,${alpha * 0.1})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, Math.PI * 2); ctx.fill();
      // 3 small slash arcs around the ring
      for (let ns = 0; ns < 3; ns++) {
        const sa = ns * Math.PI * 2 / 3 + prog * 3;
        ctx.strokeStyle = `rgba(30,15,50,${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(h.x, h.y, r, sa - 0.3, sa + 0.3); ctx.stroke();
      }
  },
  ninja_slash: (h, ctx, alpha) => {
      // Tengen-style dual crossing slash — fast clean cuts
      const prog = 1 - alpha;
      const sLen = 14 + prog * 12;
      const ang = h.angle || 0;
      // Main slash — sweeping arc
      ctx.strokeStyle = `rgba(15,10,25,${alpha * 0.85})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(h.x - Math.cos(ang) * sLen, h.y - Math.sin(ang) * sLen);
      ctx.lineTo(h.x + Math.cos(ang) * sLen, h.y + Math.sin(ang) * sLen);
      ctx.stroke();
      // Bright inner core slash — white flash
      ctx.strokeStyle = `rgba(200,180,220,${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(h.x - Math.cos(ang) * sLen * 0.8, h.y - Math.sin(ang) * sLen * 0.8);
      ctx.lineTo(h.x + Math.cos(ang) * sLen * 0.8, h.y + Math.sin(ang) * sLen * 0.8);
      ctx.stroke();
      // Speed lines perpendicular — Tengen flashy cuts
      const perpAng = ang + Math.PI / 2;
      for (let sl = 0; sl < 3; sl++) {
        const t = -0.3 + sl * 0.3;
        const sx = h.x + Math.cos(ang) * sLen * t;
        const sy = h.y + Math.sin(ang) * sLen * t;
        const spLen = 5 + prog * 6;
        ctx.strokeStyle = `rgba(30,20,45,${alpha * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - Math.cos(perpAng) * spLen, sy - Math.sin(perpAng) * spLen);
        ctx.lineTo(sx + Math.cos(perpAng) * spLen, sy + Math.sin(perpAng) * spLen);
        ctx.stroke();
      }
      // Slash tip sparks
      ctx.fillStyle = `rgba(120,80,160,${alpha * 0.6})`;
      ctx.beginPath(); ctx.arc(h.x + Math.cos(ang) * sLen, h.y + Math.sin(ang) * sLen, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(h.x - Math.cos(ang) * sLen, h.y - Math.sin(ang) * sLen, 2, 0, Math.PI * 2); ctx.fill();
  },
  ninja_dash_end: (h, ctx, alpha) => {
      // Dark burst at landing
      const prog = 1 - alpha;
      ctx.strokeStyle = `rgba(20,15,30,${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h.x, h.y, 8 + prog * 25, 0, Math.PI * 2); ctx.stroke();
  },
  text_popup: (h, ctx, alpha) => {
      // Generic floating text popup — used by farming, vendors, etc.
      if (!h.text) return;
      if (!h.maxLife) h.maxLife = h.life;
      const floatY = h.y - (h.maxLife - h.life) * 1.5;
      ctx.save();
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      // Outline
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,' + alpha + ')';
      ctx.strokeText(h.text, h.x, floatY);
      // Fill
      const c = h.color || '#ffffff';
      ctx.fillStyle = c;
      ctx.globalAlpha = alpha;
      ctx.fillText(h.text, h.x, floatY);
      ctx.restore();
  },
  _default: (h, ctx, alpha) => {
      ctx.fillStyle = `rgba(255,200,100,${alpha})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, 6 * (1 - alpha) + 3, 0, Math.PI * 2); ctx.fill();
  },
};
