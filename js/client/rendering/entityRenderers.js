// ===================== ENTITY RENDERERS =====================
// Client rendering: all entity visual renderers + dispatch
// Extracted from index_2.html â Phase C

// ---- ENTITY OVERLAY RENDERER ----
const _pathRenderer = (e, ctx, ex, ey, w, h) => {
    // Find fountain to skip those tiles
    const ftn = levelEntities.find(en => en.type === 'fountain');
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const ptx = e.tx + px, pty = e.ty + py;
        // Skip tiles that overlap fountain
        if (ftn && ptx >= ftn.tx && ptx < ftn.tx + (ftn.w||1) && pty >= ftn.ty && pty < ftn.ty + (ftn.h||1)) continue;
        const rx = ex + px * TILE, ry = ey + py * TILE;
        ctx.fillStyle = '#8a8478';
        ctx.fillRect(rx, ry, TILE, TILE);
        ctx.fillStyle = '#9a9488';
        ctx.fillRect(rx + 2, ry + 2, TILE - 4, TILE - 4);
        if ((ptx + pty) % 3 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.06)';
          ctx.fillRect(rx + 8 + (ptx * 7) % 20, ry + 8 + (pty * 11) % 20, 6, 6);
        }
      }
    }
};

const ENTITY_RENDERERS = {
  spawnPad: (e, ctx, ex, ey, w, h) => {
      const t = Date.now() / 1000;
      const pulse = 0.5 + Math.sin(t * 2 + e.tx + e.ty) * 0.3;
      ctx.fillStyle = '#1a0808';
      ctx.beginPath();
      ctx.arc(ex + TILE/2, ey + TILE/2, TILE/2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,40,0,${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ex + TILE/2, ey + TILE/2, TILE/2 - 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,50,0,${pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(ex + TILE/2, ey + TILE/2, 10, 0, Math.PI * 2);
      ctx.fill();
  },
  barrierH: (e, ctx, ex, ey, w, h) => {
      for (let i = 0; i < w; i++) {
        const bx = ex + i * TILE;
        ctx.fillStyle = '#3a2a40';
        ctx.fillRect(bx, ey + 12, TILE, TILE - 24);
        ctx.fillStyle = '#8a3090';
        ctx.fillRect(bx, ey + 16, TILE, TILE - 32);
        ctx.fillStyle = '#ff40cc';
        ctx.fillRect(bx + 2, ey + TILE/2 - 3, TILE - 4, 6);
        ctx.fillStyle = '#ffaaee';
        ctx.fillRect(bx + 4, ey + TILE/2 - 1, TILE - 8, 2);
      }
  },
  barrierV: (e, ctx, ex, ey, w, h) => {
      for (let i = 0; i < h; i++) {
        const by = ey + i * TILE;
        ctx.fillStyle = '#3a2a40';
        ctx.fillRect(ex + 12, by, TILE - 24, TILE);
        ctx.fillStyle = '#8a3090';
        ctx.fillRect(ex + 16, by, TILE - 32, TILE);
        ctx.fillStyle = '#ff40cc';
        ctx.fillRect(ex + TILE/2 - 3, by + 2, 6, TILE - 4);
        ctx.fillStyle = '#ffaaee';
        ctx.fillRect(ex + TILE/2 - 1, by + 4, 2, TILE - 8);
      }
  },
  zone: (e, ctx, ex, ey, w, h) => {
      ctx.fillStyle = 'rgba(100,60,120,0.06)';
      ctx.fillRect(ex, ey, w * TILE, h * TILE);
      ctx.strokeStyle = 'rgba(255,48,136,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ex + 2, ey + 2, w * TILE - 4, h * TILE - 4);
  },
  path_v: _pathRenderer,
  path_h: _pathRenderer,
  fountain: (e, ctx, ex, ey, w, h) => {
      const fw = w * TILE, fh = h * TILE;
      const fcx = ex + fw/2, fcy = ey + fh/2;
      const R = Math.min(fw, fh) / 2 - 6;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(fcx + 3, fcy + 5, R + 12, R * 0.65 + 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#686058';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R + 10, R * 0.62 + 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a7268';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R + 6, R * 0.62 + 6, 0, 0, Math.PI * 2); ctx.fill();
      for (let sd = 0; sd < 16; sd++) {
        const sda = sd * Math.PI / 8;
        const srx = fcx + Math.cos(sda) * (R + 3);
        const sry = fcy + Math.sin(sda) * (R * 0.62 + 3);
        ctx.fillStyle = sd % 2 === 0 ? '#8a826e' : '#6a6258';
        ctx.beginPath(); ctx.arc(srx, sry, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#948a76';
        ctx.beginPath(); ctx.arc(srx - 1, sry - 1, 4, 0, Math.PI * 2); ctx.fill();
      }
      const waterGrd = ctx.createRadialGradient(fcx, fcy, 10, fcx, fcy, R);
      waterGrd.addColorStop(0, '#3a8ac0');
      waterGrd.addColorStop(0.5, '#2a6a9a');
      waterGrd.addColorStop(1, '#1a4a7a');
      ctx.fillStyle = waterGrd;
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R - 2, R * 0.6 - 2, 0, 0, Math.PI * 2); ctx.fill();
      for (let wr = 0; wr < 4; wr++) {
        const rr = 30 + wr * 35 + Math.sin(t * 1.5 + wr * 2) * 10;
        ctx.strokeStyle = `rgba(120,200,255,${0.12 - wr * 0.025})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(fcx, fcy, rr, rr * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = '#6a6258';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, 55, 32, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a7268';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, 50, 28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a6a9a';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, 46, 25, 0, 0, Math.PI * 2); ctx.fill();
      for (let c = 0; c < 8; c++) {
        const ca = c * Math.PI / 4 + t * 0.3;
        const cx2 = fcx + Math.cos(ca) * 48;
        const cy2 = fcy + Math.sin(ca) * 27;
        ctx.fillStyle = `rgba(140,210,255,${0.25 + Math.sin(t * 4 + c) * 0.1})`;
        ctx.beginPath(); ctx.arc(cx2, cy2, 4 + Math.sin(t * 6 + c * 2) * 2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#5a5548';
      ctx.fillRect(fcx - 12, fcy - 50, 24, 65);
      ctx.fillStyle = '#6a6558';
      ctx.fillRect(fcx - 10, fcy - 48, 20, 61);
      ctx.fillStyle = '#7a7568';
      ctx.fillRect(fcx - 16, fcy + 8, 32, 8);
      ctx.fillRect(fcx - 14, fcy + 4, 28, 6);
      ctx.fillStyle = '#8a856e';
      ctx.fillRect(fcx - 16, fcy - 54, 32, 8);
      ctx.fillRect(fcx - 14, fcy - 50, 28, 4);
      ctx.fillStyle = '#6a6558';
      ctx.beginPath(); ctx.ellipse(fcx, fcy - 52, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a7aaa';
      ctx.beginPath(); ctx.ellipse(fcx, fcy - 52, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      const spH = 20 + Math.sin(t * 3) * 6;
      const spGrd = ctx.createLinearGradient(fcx, fcy - 52 - spH, fcx, fcy - 52);
      spGrd.addColorStop(0, 'rgba(180,230,255,0.8)');
      spGrd.addColorStop(1, 'rgba(100,180,255,0.3)');
      ctx.fillStyle = spGrd;
      ctx.beginPath(); ctx.moveTo(fcx - 4, fcy - 52); ctx.lineTo(fcx, fcy - 52 - spH); ctx.lineTo(fcx + 4, fcy - 52); ctx.fill();
      for (let d = 0; d < 12; d++) {
        const da = d * Math.PI / 6 + t * 2.5;
        const dd = 6 + (t * 25 + d * 8) % 35;
        const dx = fcx + Math.cos(da) * dd * 0.8;
        const dy = fcy - 52 - spH + dd * 0.7;
        const ds = 1.5 + Math.sin(d * 3) * 0.5;
        ctx.fillStyle = `rgba(180,230,255,${0.5 - dd * 0.012})`;
        ctx.beginPath(); ctx.arc(dx, dy, ds, 0, Math.PI * 2); ctx.fill();
      }
      for (let sp = 0; sp < 4; sp++) {
        const sa = sp * Math.PI / 2 + Math.PI / 4;
        const sx2 = fcx + Math.cos(sa) * 30;
        const sy2 = fcy + Math.sin(sa) * 16;
        for (let sd2 = 0; sd2 < 5; sd2++) {
          const sdd = sd2 * 4 + Math.sin(t * 5 + sp + sd2) * 3;
          ctx.fillStyle = `rgba(140,210,255,${0.3 - sd2 * 0.05})`;
          ctx.beginPath(); ctx.arc(sx2 + Math.cos(sa) * sdd, sy2 + Math.sin(sa) * sdd * 0.5, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      for (let sp2 = 0; sp2 < 6; sp2++) {
        const spa = sp2 * Math.PI / 3 + t * 0.8;
        const spr = 40 + sp2 * 20;
        const spx = fcx + Math.cos(spa) * spr;
        const spy = fcy + Math.sin(spa) * spr * 0.55;
        const sparkle = Math.sin(t * 5 + sp2 * 2);
        if (sparkle > 0.5) {
          ctx.fillStyle = `rgba(255,255,255,${(sparkle - 0.5) * 0.6})`;
          ctx.beginPath(); ctx.arc(spx, spy, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      const poolR = R * 0.55;
      for (let fi = 0; fi < 3; fi++) {
        const spd = 0.3 + fi * 0.1;
        const phase = fi * Math.PI * 2 / 3;
        const fishX = fcx + Math.sin(t * spd + phase) * poolR * 0.6;
        const fishY = fcy + Math.sin(t * spd * 2 + phase) * poolR * 0.25;
        const nx = Math.cos(t * spd + phase) * spd * poolR * 0.6;
        const ny = Math.cos(t * spd * 2 + phase) * spd * 2 * poolR * 0.25;
        const fishDir = Math.atan2(ny, nx);
        const tailWag = Math.sin(t * 12 + fi * 4) * 0.4;
        ctx.save(); ctx.translate(fishX, fishY); ctx.rotate(fishDir);
        const fishCols = [['#ee6622','#cc4411'],['#ddaa11','#bb8800'],['#ee3355','#cc1133']];
        const [fc1, fc2] = fishCols[fi];
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.beginPath(); ctx.ellipse(1, 2, 11, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = fc1;
        ctx.beginPath(); ctx.ellipse(0, 0, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(3, -1, 4, 2.5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = fc2;
        ctx.beginPath(); ctx.ellipse(0, 0, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(-9, 0); ctx.rotate(tailWag);
        ctx.fillStyle = fc1;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-9, -5); ctx.quadraticCurveTo(-6, 0, -9, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(7, -1.5, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(7.5, -1.5, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
  },
  fence: (e, ctx, ex, ey, w, h) => {
      for (let i = 0; i < w; i++) {
        const fx = ex + i * TILE;
        ctx.fillStyle = '#444';
        ctx.fillRect(fx, ey + TILE - 8, TILE, 4);
        ctx.fillRect(fx, ey + 4, TILE, 4);
        for (let b = 0; b < 3; b++) {
          const bx = fx + 8 + b * 14;
          ctx.fillStyle = '#333';
          ctx.fillRect(bx, ey + 2, 4, TILE - 2);
          ctx.fillStyle = '#555';
          ctx.fillRect(bx + 1, ey + 3, 2, TILE - 4);
          ctx.beginPath(); ctx.moveTo(bx, ey + 2); ctx.lineTo(bx + 2, ey - 4); ctx.lineTo(bx + 4, ey + 2); ctx.closePath();
          ctx.fillStyle = '#555'; ctx.fill();
        }
      }
  },
  tree: (e, ctx, ex, ey, w, h) => {
      const tcx2 = ex + TILE/2, tcy2 = ey + TILE/2;
      const v = e.variant || 0;
      if (v === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(tcx2 + 2, tcy2 + 28, 48, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(tcx2 - 8, tcy2 + 10); ctx.lineTo(tcx2 - 22, tcy2 + 22); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2 + 8, tcy2 + 10); ctx.lineTo(tcx2 + 20, tcy2 + 24); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 + 12); ctx.lineTo(tcx2 - 5, tcy2 + 26); ctx.stroke();
        ctx.fillStyle = '#3a2008';
        ctx.fillRect(tcx2 - 10, tcy2 - 16, 20, 36);
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(tcx2 - 8, tcy2 - 14, 16, 32);
        ctx.strokeStyle = '#30180a'; ctx.lineWidth = 1;
        for (let b = 0; b < 4; b++) { ctx.beginPath(); ctx.moveTo(tcx2 - 5 + b * 3, tcy2 - 10); ctx.lineTo(tcx2 - 4 + b * 4, tcy2 + 14); ctx.stroke(); }
        ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(tcx2 + 4, tcy2 - 8); ctx.quadraticCurveTo(tcx2 + 28, tcy2 - 18, tcx2 + 32, tcy2 - 30); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2 - 4, tcy2 - 10); ctx.quadraticCurveTo(tcx2 - 24, tcy2 - 22, tcx2 - 28, tcy2 - 36); ctx.stroke();
        ctx.fillStyle = '#145810';
        ctx.beginPath(); ctx.arc(tcx2, tcy2 - 30, 44, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a6a16';
        ctx.beginPath(); ctx.arc(tcx2 - 18, tcy2 - 38, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#208a1a';
        ctx.beginPath(); ctx.arc(tcx2 + 20, tcy2 - 34, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e7a18';
        ctx.beginPath(); ctx.arc(tcx2 - 8, tcy2 - 46, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#28921e';
        ctx.beginPath(); ctx.arc(tcx2 + 10, tcy2 - 44, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a9a24';
        ctx.beginPath(); ctx.arc(tcx2 - 14, tcy2 - 26, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(80,200,60,0.25)';
        ctx.beginPath(); ctx.arc(tcx2 - 20, tcy2 - 42, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(tcx2 + 16, tcy2 - 40, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(tcx2 + 4, tcy2 - 50, 7, 0, Math.PI * 2); ctx.fill();
      } else if (v === 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.beginPath(); ctx.ellipse(tcx2 + 1, tcy2 + 22, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a2a10';
        ctx.fillRect(tcx2 - 5, tcy2 - 4, 10, 28);
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(tcx2 - 4, tcy2 - 2, 8, 24);
        const tiers = [[0, 36, '#14501a'], [-8, 30, '#186018'], [-16, 24, '#1c7020'], [-26, 18, '#208020'], [-36, 12, '#249028']];
        for (const [yo, rr, col] of tiers) {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(tcx2, tcy2 + yo - rr);
          ctx.lineTo(tcx2 - rr * 1.1, tcy2 + yo + 6);
          ctx.lineTo(tcx2 + rr * 1.1, tcy2 + yo + 6);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(70,180,50,0.3)';
          ctx.beginPath(); ctx.arc(tcx2, tcy2 + yo - rr + 5, 4, 0, Math.PI * 2); ctx.fill();
        }
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath(); ctx.ellipse(tcx2, tcy2 + 20, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d8d0c0';
        ctx.fillRect(tcx2 - 5, tcy2 - 12, 10, 34);
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(tcx2 - 4, tcy2 - 10, 8, 30);
        ctx.fillStyle = '#444';
        for (let b = 0; b < 5; b++) {
          ctx.fillRect(tcx2 - 3 + (b % 2) * 2, tcy2 - 6 + b * 6, 5, 2);
        }
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(tcx2 + 3, tcy2 - 6); ctx.lineTo(tcx2 + 18, tcy2 - 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2 - 3, tcy2 - 2); ctx.lineTo(tcx2 - 16, tcy2 - 14); ctx.stroke();
        ctx.fillStyle = '#3a9a28';
        ctx.beginPath(); ctx.arc(tcx2, tcy2 - 22, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#44aa32';
        ctx.beginPath(); ctx.arc(tcx2 - 10, tcy2 - 28, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4aba38';
        ctx.beginPath(); ctx.arc(tcx2 + 12, tcy2 - 26, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#52c240';
        ctx.beginPath(); ctx.arc(tcx2 - 4, tcy2 - 34, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,220,80,0.3)';
        ctx.beginPath(); ctx.arc(tcx2 + 6, tcy2 - 30, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(tcx2 - 8, tcy2 - 24, 5, 0, Math.PI * 2); ctx.fill();
      }
  },
  flower: (e, ctx, ex, ey, w, h) => {
      const colors = ['#e44', '#e8e', '#ff0', '#f80', '#e4e'];
      for (let f = 0; f < 4; f++) {
        const fx2 = ex + 8 + (f % 2) * 20 + Math.sin(f * 2) * 5;
        const fy2 = ey + 10 + Math.floor(f / 2) * 18;
        ctx.fillStyle = '#2a6a22';
        ctx.fillRect(fx2, fy2 + 4, 2, 8);
        ctx.fillStyle = colors[(e.tx + f) % 5];
        ctx.beginPath(); ctx.arc(fx2 + 1, fy2 + 2, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff0';
        ctx.beginPath(); ctx.arc(fx2 + 1, fy2 + 2, 1.5, 0, Math.PI * 2); ctx.fill();
      }
  },
  lamp: (e, ctx, ex, ey, w, h) => {
      const lx = ex + TILE/2, ly = ey;
      const t = Date.now() / 1000;
      ctx.fillStyle = '#333';
      ctx.fillRect(lx - 3, ly + 10, 6, TILE - 10);
      ctx.fillStyle = '#444';
      ctx.fillRect(lx - 8, ly + 6, 16, 8);
      const glow = 0.15 + Math.sin(t * 2 + e.tx) * 0.05;
      const lgrd = ctx.createRadialGradient(lx, ly + 8, 2, lx, ly + 8, 40);
      lgrd.addColorStop(0, `rgba(255,220,120,${glow})`);
      lgrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = lgrd;
      ctx.fillRect(lx - 40, ly - 32, 80, 80);
      ctx.fillStyle = '#ffa';
      ctx.beginPath(); ctx.arc(lx, ly + 10, 3, 0, Math.PI * 2); ctx.fill();
  },
  bench: (e, ctx, ex, ey, w, h) => {
      const bw2 = TILE * 2, bh2 = TILE * 0.55;
      const bx2 = ex - TILE * 0.5, by2 = ey + TILE * 0.2;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(bx2 + bw2/2, by2 + bh2 + 8, bw2/2 + 4, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(bx2 + 6, by2 + bh2 - 2, 6, 14);
      ctx.fillRect(bx2 + 3, by2 + bh2 + 10, 12, 3);
      ctx.fillRect(bx2 + bw2 - 12, by2 + bh2 - 2, 6, 14);
      ctx.fillRect(bx2 + bw2 - 15, by2 + bh2 + 10, 12, 3);
      ctx.fillRect(bx2 + bw2/2 - 3, by2 + bh2 - 2, 6, 14);
      ctx.fillStyle = '#333';
      ctx.fillRect(bx2 - 2, by2 - 14, 6, bh2 + 14);
      ctx.fillRect(bx2 + bw2 - 4, by2 - 14, 6, bh2 + 14);
      ctx.fillStyle = '#3a3a3a';
      ctx.beginPath(); ctx.arc(bx2 + 1, by2 - 14, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bx2 + bw2 - 1, by2 - 14, 5, 0, Math.PI * 2); ctx.fill();
      for (let s = 0; s < 5; s++) {
        const sy2 = by2 + s * (bh2 / 5);
        const slh = bh2 / 5 - 1;
        ctx.fillStyle = s % 2 === 0 ? '#8a6230' : '#7a5828';
        ctx.fillRect(bx2 + 4, sy2, bw2 - 8, slh);
        ctx.fillStyle = s % 2 === 0 ? '#9a7238' : '#8a6830';
        ctx.fillRect(bx2 + 5, sy2 + 1, bw2 - 10, slh - 2);
      }
      for (let s = 0; s < 3; s++) {
        const sy3 = by2 - 12 + s * 4;
        ctx.fillStyle = s % 2 === 0 ? '#7a5828' : '#8a6230';
        ctx.fillRect(bx2 + 4, sy3, bw2 - 8, 3);
      }
      ctx.strokeStyle = 'rgba(80,50,20,0.2)'; ctx.lineWidth = 0.5;
      for (let g = 0; g < 3; g++) {
        ctx.beginPath(); ctx.moveTo(bx2 + 8 + g * 25, by2 + 2); ctx.lineTo(bx2 + 10 + g * 26, by2 + bh2 - 2); ctx.stroke();
      }
  },
  table: (e, ctx, ex, ey, w, h) => {
      const tw2 = w * TILE, th2 = h * TILE;
      const tcx3 = ex + tw2/2, tcy3 = ey + th2/2;
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.beginPath(); ctx.ellipse(tcx3 + 2, tcy3 + 4, tw2/2 + 8, th2/2 + 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(ex + 16, ey + 16, 7, th2 - 32);
      ctx.fillRect(ex + tw2 - 23, ey + 16, 7, th2 - 32);
      ctx.fillRect(ex + 16, ey + 16, tw2 - 32, 7);
      ctx.fillRect(ex + 16, ey + th2 - 23, tw2 - 32, 7);
      ctx.fillStyle = '#7a5a30';
      ctx.fillRect(ex + 12, ey + 12, tw2 - 24, th2 - 24);
      ctx.fillStyle = '#8a6a38';
      ctx.fillRect(ex + 14, ey + 14, tw2 - 28, th2 - 28);
      ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 1;
      for (let pl = 1; pl < 4; pl++) {
        const py2 = ey + 14 + pl * (th2 - 28) / 4;
        ctx.beginPath(); ctx.moveTo(ex + 16, py2); ctx.lineTo(ex + tw2 - 16, py2); ctx.stroke();
      }
      ctx.fillStyle = '#aaa';
      ctx.beginPath(); ctx.arc(tcx3, tcy3, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ccc';
      ctx.beginPath(); ctx.arc(tcx3, tcy3, 6, 0, Math.PI * 2); ctx.fill();
      const chairPositions = [
        [tcx3, ey - 10, 0],
        [tcx3, ey + th2 + 6, 2],
        [ex - 10, tcy3, 3],
        [ex + tw2 + 6, tcy3, 1],
      ];
      for (const [cx2, cy2, cd] of chairPositions) {
        const cw = 20, ch = 20;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.beginPath(); ctx.ellipse(cx2, cy2 + 4, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6a4a28';
        ctx.fillRect(cx2 - cw/2, cy2 - ch/2, cw, ch);
        ctx.fillStyle = '#7a5a30';
        ctx.fillRect(cx2 - cw/2 + 2, cy2 - ch/2 + 2, cw - 4, ch - 4);
        ctx.fillStyle = '#5a3a18';
        ctx.fillRect(cx2 - cw/2, cy2 - ch/2, 3, 3);
        ctx.fillRect(cx2 + cw/2 - 3, cy2 - ch/2, 3, 3);
        ctx.fillRect(cx2 - cw/2, cy2 + ch/2 - 3, 3, 3);
        ctx.fillRect(cx2 + cw/2 - 3, cy2 + ch/2 - 3, 3, 3);
        ctx.fillStyle = '#5a3a18';
        if (cd === 0) ctx.fillRect(cx2 - cw/2, cy2 - ch/2 - 6, cw, 6);
        else if (cd === 2) ctx.fillRect(cx2 - cw/2, cy2 + ch/2, cw, 6);
        else if (cd === 3) ctx.fillRect(cx2 - cw/2 - 6, cy2 - ch/2, 6, ch);
        else ctx.fillRect(cx2 + cw/2, cy2 - ch/2, 6, ch);
      }
  },
  bush: (e, ctx, ex, ey, w, h) => {
      const bx3 = ex + TILE/2, by3 = ey + TILE/2;
      ctx.fillStyle = '#1a5a16';
      ctx.beginPath(); ctx.arc(bx3, by3, 16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#228a1e';
      ctx.beginPath(); ctx.arc(bx3 - 4, by3 - 3, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a7a24';
      ctx.beginPath(); ctx.arc(bx3 + 5, by3 + 2, 9, 0, Math.PI * 2); ctx.fill();
  },
  tower_exterior: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(ex + cw/2 + 10, ey + ch + 8, cw*0.45, 12, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#4a4450';
      ctx.fillRect(ex + cw*0.15, ey + ch*0.25, cw*0.7, ch*0.75);
      ctx.fillStyle = '#3a3440';
      for (let row = 0; row < 6; row++) {
        const ry = ey + ch*0.28 + row * ch*0.11;
        const off = row % 2 === 0 ? 0 : cw*0.08;
        for (let col = 0; col < 4; col++) {
          const rx = ex + cw*0.17 + off + col * cw*0.16;
          ctx.fillRect(rx, ry, cw*0.14, ch*0.09);
          ctx.strokeStyle = '#2a2430'; ctx.lineWidth = 1;
          ctx.strokeRect(rx, ry, cw*0.14, ch*0.09);
        }
      }
      const batY = ey + ch*0.15;
      const batH = ch*0.12;
      ctx.fillStyle = '#4a4450';
      ctx.fillRect(ex + cw*0.1, batY, cw*0.8, batH);
      ctx.fillStyle = '#50485a';
      const crenW = cw*0.1;
      const crenH = ch*0.08;
      for (let c = 0; c < 5; c++) {
        ctx.fillRect(ex + cw*0.1 + c * cw*0.16, batY - crenH, crenW, crenH);
      }
      ctx.fillStyle = '#2a1828';
      ctx.beginPath();
      ctx.moveTo(ex + cw*0.5, ey - ch*0.05);
      ctx.lineTo(ex + cw*0.1, batY);
      ctx.lineTo(ex + cw*0.9, batY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a2838';
      ctx.beginPath();
      ctx.moveTo(ex + cw*0.5, ey - ch*0.05);
      ctx.lineTo(ex + cw*0.3, batY);
      ctx.lineTo(ex + cw*0.5, batY);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#555'; ctx.fillRect(ex + cw*0.49, ey - ch*0.15, 2, ch*0.12);
      ctx.fillStyle = '#c03030';
      ctx.beginPath();
      ctx.moveTo(ex + cw*0.5 + 2, ey - ch*0.15);
      ctx.lineTo(ex + cw*0.5 + 20, ey - ch*0.12 + Math.sin(t*2)*2);
      ctx.lineTo(ex + cw*0.5 + 2, ey - ch*0.09);
      ctx.fill();
      ctx.fillStyle = '#0a0808';
      const winW = cw*0.08, winH = ch*0.1;
      const win1X = ex + cw*0.3, win2X = ex + cw*0.6;
      const win1Y = ey + ch*0.32, win2Y = ey + ch*0.32;
      ctx.fillRect(win1X, win1Y, winW, winH);
      ctx.beginPath(); ctx.arc(win1X + winW/2, win1Y, winW/2, Math.PI, 0); ctx.fill();
      ctx.fillRect(win2X, win2Y, winW, winH);
      ctx.beginPath(); ctx.arc(win2X + winW/2, win2Y, winW/2, Math.PI, 0); ctx.fill();
      const glow = 0.3 + Math.sin(t*1.5)*0.15;
      ctx.fillStyle = `rgba(200,150,60,${glow})`;
      ctx.fillRect(win1X+1, win1Y+1, winW-2, winH-2);
      ctx.fillRect(win2X+1, win2Y+1, winW-2, winH-2);
      const win3Y = ey + ch*0.55;
      ctx.fillStyle = '#0a0808';
      ctx.fillRect(win1X, win3Y, winW, winH);
      ctx.beginPath(); ctx.arc(win1X + winW/2, win3Y, winW/2, Math.PI, 0); ctx.fill();
      ctx.fillRect(win2X, win3Y, winW, winH);
      ctx.beginPath(); ctx.arc(win2X + winW/2, win3Y, winW/2, Math.PI, 0); ctx.fill();
      ctx.fillStyle = `rgba(200,150,60,${glow})`;
      ctx.fillRect(win1X+1, win3Y+1, winW-2, winH-2);
      ctx.fillRect(win2X+1, win3Y+1, winW-2, winH-2);
      const doorW = 3 * TILE, doorH = ch * 0.22;
      const doorX = ex + (cw - doorW) / 2, doorY = ey + ch - doorH;
      ctx.fillStyle = '#3a3040';
      ctx.fillRect(doorX - 6, doorY - 8, doorW + 12, doorH + 8);
      ctx.beginPath(); ctx.arc(doorX + doorW/2, doorY - 4, doorW/2 + 6, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#0a0808';
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.beginPath(); ctx.arc(doorX + doorW/2, doorY, doorW/2, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(doorX + 2, doorY + 2, doorW/2 - 3, doorH - 2);
      ctx.fillRect(doorX + doorW/2 + 1, doorY + 2, doorW/2 - 3, doorH - 2);
      ctx.fillStyle = '#c0a040';
      ctx.beginPath(); ctx.arc(doorX + doorW/2 - 4, doorY + doorH*0.5, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(doorX + doorW/2 + 4, doorY + doorH*0.5, 3, 0, Math.PI*2); ctx.fill();
      const dGrd = ctx.createRadialGradient(doorX+doorW/2, doorY+doorH*0.6, 5, doorX+doorW/2, doorY+doorH*0.6, doorW*0.8);
      dGrd.addColorStop(0, `rgba(200,120,40,${0.2 + Math.sin(t*1.5)*0.08})`);
      dGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = dGrd;
      ctx.fillRect(doorX - 10, doorY - 10, doorW + 20, doorH + 20);
      for (const side of [-1, 1]) {
        const tx2 = doorX + (side === -1 ? -18 : doorW + 8);
        const ty2 = doorY + 4;
        ctx.fillStyle = '#555';
        ctx.fillRect(tx2, ty2, 10, 4);
        ctx.fillRect(tx2 + 2, ty2 - 8, 6, 12);
        ctx.fillStyle = '#e0a020';
        ctx.beginPath(); ctx.moveTo(tx2+5, ty2-16); ctx.lineTo(tx2+1, ty2-6); ctx.lineTo(tx2+9, ty2-6); ctx.fill();
        ctx.fillStyle = `rgba(255,200,80,${0.4 + Math.sin(t*3 + side)*0.2})`;
        ctx.beginPath(); ctx.arc(tx2+5, ty2-10, 6, 0, Math.PI*2); ctx.fill();
      }
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = '#ddc090'; ctx.textAlign = "center";
      ctx.fillText("\u{1F3F0} TOWER", ex + cw / 2, ey + ch + 16);
      ctx.textAlign = "left";
  },
  cave_entrance: () => {},
  building_shop: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+5, ey+ch+6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#6a4a28';
      ctx.fillRect(ex+4, ey+ch*0.2, cw-8, ch*0.8);
      ctx.strokeStyle = '#4a3018'; ctx.lineWidth = 1;
      for (let pl = 0; pl < 6; pl++) ctx.strokeRect(ex+6, ey+ch*0.22+pl*ch*0.12, cw-12, ch*0.11);
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(ex+2, ey+ch*0.2, cw-4, ch*0.35);
      ctx.strokeStyle = '#5a4020'; ctx.lineWidth = 1;
      for (let pl = 0; pl < 3; pl++) ctx.strokeRect(ex+4, ey+ch*0.22+pl*ch*0.1, cw-8, ch*0.09);
      ctx.fillStyle = '#8a2a1a';
      ctx.beginPath();
      ctx.moveTo(ex-8, ey+ch*0.22); ctx.lineTo(ex+cw/2, ey-ch*0.08);
      ctx.lineTo(ex+cw+8, ey+ch*0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a03820';
      ctx.beginPath();
      ctx.moveTo(ex-8, ey+ch*0.22); ctx.lineTo(ex+cw/2, ey-ch*0.08);
      ctx.lineTo(ex+cw/2, ey+ch*0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#5a3020'; ctx.fillRect(ex+cw*0.7, ey-ch*0.02, cw*0.1, ch*0.15);
      ctx.fillStyle = '#4a2818'; ctx.fillRect(ex+cw*0.68, ey-ch*0.05, cw*0.14, ch*0.04);
      ctx.fillStyle = `rgba(180,180,180,${0.15+Math.sin(t*2)*0.08})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.75+Math.sin(t)*4, ey-ch*0.12, 5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex+cw*0.73+Math.sin(t+1)*3, ey-ch*0.2, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c84030';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.15, ey+ch*0.52); ctx.lineTo(ex+cw*0.85, ey+ch*0.52);
      ctx.lineTo(ex+cw*0.9, ey+ch*0.62); ctx.lineTo(ex+cw*0.1, ey+ch*0.62); ctx.fill();
      ctx.fillStyle = '#e8e0d0';
      for (let st = 0; st < 3; st++) ctx.fillRect(ex+cw*0.2+st*cw*0.2, ey+ch*0.53, cw*0.1, ch*0.08);
      ctx.fillStyle = '#1a3050';
      ctx.fillRect(ex+cw*0.12, ey+ch*0.28, cw*0.3, ch*0.2);
      ctx.fillRect(ex+cw*0.56, ey+ch*0.28, cw*0.3, ch*0.2);
      ctx.fillStyle = `rgba(180,200,220,${0.15+Math.sin(t*1.3)*0.05})`;
      ctx.fillRect(ex+cw*0.14, ey+ch*0.3, cw*0.12, ch*0.16);
      ctx.fillRect(ex+cw*0.58, ey+ch*0.3, cw*0.12, ch*0.16);
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(ex+cw*0.38, ey+ch*0.62, cw*0.22, ch*0.38);
      ctx.fillStyle = '#c0a040'; ctx.beginPath(); ctx.arc(ex+cw*0.55, ey+ch*0.8, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#d0b060';
      ctx.beginPath(); ctx.roundRect(ex+cw*0.25, ey+ch*0.47, cw*0.5, ch*0.06, 2); ctx.fill();
      ctx.fillStyle = '#3a2010'; ctx.font = `bold ${Math.max(8,cw*0.04)}px monospace`; ctx.textAlign = "center";
      ctx.fillText("SHOP", ex+cw/2, ey+ch*0.52);
      ctx.textAlign = "left";
  },
  building_house: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+4, ey+ch+5, cw*0.4, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#c8b898';
      ctx.fillRect(ex+4, ey+ch*0.35, cw-8, ch*0.65);
      ctx.fillStyle = '#8a7a60';
      ctx.fillRect(ex+2, ey+ch*0.88, cw-4, ch*0.12);
      ctx.fillStyle = '#5a3818'; ctx.fillRect(ex+4, ey+ch*0.35, cw-8, 3);
      ctx.fillRect(ex+4, ey+ch*0.6, cw-8, 2);
      ctx.fillRect(ex+cw/2-1, ey+ch*0.35, 3, ch*0.53);
      ctx.fillStyle = '#5a6a30';
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.38); ctx.lineTo(ex+cw/2, ey+ch*0.02);
      ctx.lineTo(ex+cw+6, ey+ch*0.38); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a7a38';
      ctx.beginPath();
      ctx.moveTo(ex+cw/2, ey+ch*0.02); ctx.lineTo(ex+cw+6, ey+ch*0.38);
      ctx.lineTo(ex+cw/2, ey+ch*0.38); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a2a40';
      ctx.fillRect(ex+cw*0.15, ey+ch*0.45, cw*0.25, ch*0.18);
      ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.15, ey+ch*0.45, cw*0.25, ch*0.18);
      ctx.beginPath(); ctx.moveTo(ex+cw*0.275, ey+ch*0.45); ctx.lineTo(ex+cw*0.275, ey+ch*0.63); ctx.stroke();
      ctx.fillStyle = `rgba(220,180,80,${0.2+Math.sin(t*1.2)*0.1})`;
      ctx.fillRect(ex+cw*0.16, ey+ch*0.46, cw*0.23, ch*0.16);
      ctx.fillStyle = '#4a2818';
      ctx.beginPath(); ctx.roundRect(ex+cw*0.58, ey+ch*0.5, cw*0.28, ch*0.5, [4,4,0,0]); ctx.fill();
      ctx.fillStyle = '#c0a040'; ctx.beginPath(); ctx.arc(ex+cw*0.8, ey+ch*0.75, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a3818'; ctx.fillRect(ex+cw*0.12, ey+ch*0.64, cw*0.3, ch*0.04);
      ctx.fillStyle = '#d04040';
      for (let f = 0; f < 3; f++) { ctx.beginPath(); ctx.arc(ex+cw*0.18+f*cw*0.08, ey+ch*0.62, 3, 0, Math.PI*2); ctx.fill(); }
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ddc090'; ctx.textAlign = "center";
      ctx.fillText("\u{1F3E0} House", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  building_tavern: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.45, 9, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#606058';
      ctx.fillRect(ex+4, ey+ch*0.5, cw-8, ch*0.5);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          ctx.strokeStyle = '#484840'; ctx.lineWidth = 1;
          const off = r%2 === 0 ? 0 : cw*0.08;
          ctx.strokeRect(ex+8+off+c*cw*0.17, ey+ch*0.52+r*ch*0.14, cw*0.15, ch*0.12);
        }
      }
      ctx.fillStyle = '#7a5a30';
      ctx.fillRect(ex+2, ey+ch*0.2, cw-4, ch*0.32);
      ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 1;
      for (let pl = 0; pl < 3; pl++) ctx.strokeRect(ex+4, ey+ch*0.22+pl*ch*0.09, cw-8, ch*0.08);
      ctx.fillStyle = '#5a3818';
      ctx.fillRect(ex, ey+ch*0.5, cw, 4);
      ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+4, ey+ch*0.5+4); ctx.lineTo(ex+4, ey+ch*0.5+16); ctx.lineTo(ex+cw-4, ey+ch*0.5+16); ctx.lineTo(ex+cw-4, ey+ch*0.5+4); ctx.stroke();
      for (let rb = 0; rb < 6; rb++) { ctx.beginPath(); ctx.moveTo(ex+10+rb*cw*0.15, ey+ch*0.5+4); ctx.lineTo(ex+10+rb*cw*0.15, ey+ch*0.5+16); ctx.stroke(); }
      ctx.fillStyle = '#3a3440';
      ctx.beginPath();
      ctx.moveTo(ex-10, ey+ch*0.22); ctx.lineTo(ex+cw*0.5, ey-ch*0.1);
      ctx.lineTo(ex+cw+10, ey+ch*0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#4a4450';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.5, ey-ch*0.1); ctx.lineTo(ex+cw+10, ey+ch*0.22);
      ctx.lineTo(ex+cw*0.5, ey+ch*0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3440';
      ctx.beginPath(); ctx.moveTo(ex+cw*0.3, ey+ch*0.22); ctx.lineTo(ex+cw*0.38, ey+ch*0.08); ctx.lineTo(ex+cw*0.46, ey+ch*0.22); ctx.fill();
      ctx.fillStyle = '#1a2040'; ctx.fillRect(ex+cw*0.33, ey+ch*0.12, cw*0.1, ch*0.1);
      ctx.fillStyle = '#1a2040';
      ctx.fillRect(ex+cw*0.08, ey+ch*0.28, cw*0.15, ch*0.12);
      ctx.fillRect(ex+cw*0.4, ey+ch*0.28, cw*0.15, ch*0.12);
      ctx.fillRect(ex+cw*0.72, ey+ch*0.28, cw*0.15, ch*0.12);
      const glow = 0.25+Math.sin(t*1.5)*0.12;
      ctx.fillStyle = `rgba(220,160,60,${glow})`;
      ctx.fillRect(ex+cw*0.09, ey+ch*0.29, cw*0.13, ch*0.1);
      ctx.fillRect(ex+cw*0.41, ey+ch*0.29, cw*0.13, ch*0.1);
      ctx.fillRect(ex+cw*0.73, ey+ch*0.29, cw*0.13, ch*0.1);
      ctx.fillStyle = '#3a1a08';
      ctx.fillRect(ex+cw*0.35, ey+ch*0.65, cw*0.14, ch*0.35);
      ctx.fillRect(ex+cw*0.5, ey+ch*0.65, cw*0.14, ch*0.35);
      ctx.fillStyle = '#c0a040'; ctx.beginPath(); ctx.arc(ex+cw*0.47, ey+ch*0.82, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex+cw*0.53, ey+ch*0.82, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#5a3818'; ctx.fillRect(ex+cw*0.75, ey+ch*0.55, 3, ch*0.12);
      ctx.fillStyle = '#c09030';
      ctx.beginPath(); ctx.roundRect(ex+cw*0.7, ey+ch*0.66, cw*0.12, ch*0.1, 3); ctx.fill();
      ctx.fillStyle = '#3a2010'; ctx.font = `bold ${Math.max(7,cw*0.025)}px monospace`; ctx.textAlign = "center";
      ctx.fillText("\u{1F37A}", ex+cw*0.76, ey+ch*0.74);
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ddc090';
      ctx.fillText("\u{1F37A} Tavern", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  building_mine: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+5, ey+ch+6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#586068';
      ctx.fillRect(ex+4, ey+ch*0.25, cw-8, ch*0.75);
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          const off = r%2===0 ? 0 : cw*0.1;
          ctx.strokeStyle = '#404850'; ctx.lineWidth = 1;
          ctx.strokeRect(ex+8+off+c*cw*0.2, ey+ch*0.27+r*ch*0.13, cw*0.18, ch*0.11);
        }
      }
      ctx.fillStyle = '#404850'; ctx.fillRect(ex+2, ey+ch*0.85, cw-4, ch*0.15);
      ctx.fillStyle = '#505860'; ctx.fillRect(ex, ey+ch*0.2, cw, ch*0.08);
      ctx.fillStyle = '#586068';
      for (let c = 0; c < 5; c++) ctx.fillRect(ex+c*cw*0.2+cw*0.02, ey+ch*0.12, cw*0.12, ch*0.08);
      ctx.fillStyle = '#404040';
      ctx.fillRect(ex+cw*0.38, ey+ch*0.3, cw*0.24, ch*0.06);
      ctx.fillRect(ex+cw*0.44, ey+ch*0.26, cw*0.12, ch*0.04);
      ctx.fillRect(ex+cw*0.42, ey+ch*0.36, cw*0.16, ch*0.04);
      ctx.fillStyle = '#1a1820';
      ctx.fillRect(ex+cw*0.08, ey+ch*0.45, cw*0.35, ch*0.22);
      ctx.strokeStyle = '#708088'; ctx.lineWidth = 2; ctx.strokeRect(ex+cw*0.08, ey+ch*0.45, cw*0.35, ch*0.22);
      ctx.fillStyle = '#a0a8b0'; ctx.fillRect(ex+cw*0.15, ey+ch*0.48, 2, ch*0.16);
      ctx.fillStyle = '#c0a040'; ctx.fillRect(ex+cw*0.13, ey+ch*0.59, 8, 3);
      ctx.fillStyle = '#8a2020';
      ctx.beginPath(); ctx.moveTo(ex+cw*0.3, ey+ch*0.62); ctx.lineTo(ex+cw*0.25, ey+ch*0.49); ctx.lineTo(ex+cw*0.35, ey+ch*0.49); ctx.fill();
      ctx.fillStyle = '#1a1820';
      ctx.fillRect(ex+cw*0.57, ey+ch*0.45, cw*0.35, ch*0.22);
      ctx.strokeStyle = '#708088'; ctx.lineWidth = 2; ctx.strokeRect(ex+cw*0.57, ey+ch*0.45, cw*0.35, ch*0.22);
      ctx.fillStyle = `rgba(180,160,120,${0.1+Math.sin(t*1.5)*0.05})`;
      ctx.fillRect(ex+cw*0.58, ey+ch*0.46, cw*0.33, ch*0.2);
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(ex+cw*0.37, ey+ch*0.7, cw*0.26, ch*0.3);
      ctx.strokeStyle = '#505860'; ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.37, ey+ch*0.7, cw*0.26, ch*0.3);
      ctx.strokeRect(ex+cw*0.37, ey+ch*0.78, cw*0.26, 0);
      ctx.strokeRect(ex+cw*0.37, ey+ch*0.88, cw*0.26, 0);
      ctx.fillStyle = '#708088'; ctx.beginPath(); ctx.arc(ex+cw*0.58, ey+ch*0.85, 3, 0, Math.PI*2); ctx.fill();
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ddc090'; ctx.textAlign = "center";
      ctx.fillText("\u26CF\uFE0F Mine", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  mine_entrance: (e, ctx, ex, ey, w, h) => {
      // Dark doorway at base of mine building
      const cw = w * TILE, ch = h * TILE;
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(ex + cw * 0.15, ey + 2, cw * 0.7, ch * 0.85);
      // Wooden frame
      ctx.strokeStyle = '#5a4a30';
      ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Lantern glow
      const t = Date.now() / 1000;
      const glow = 0.4 + 0.2 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(255,180,60,${glow})`;
      ctx.beginPath(); ctx.arc(ex + cw * 0.2, ey + 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + cw * 0.8, ey + 8, 4, 0, Math.PI * 2); ctx.fill();
      // Enter label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#dda060'; ctx.textAlign = "center";
      ctx.fillText("ENTER", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },
  mine_exit: (e, ctx, ex, ey, w, h) => {
      // Dark doorway leading out of the mine
      const cw = w * TILE, ch = h * TILE;
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(ex + cw * 0.15, ey + 2, cw * 0.7, ch * 0.85);
      // Wooden frame
      ctx.strokeStyle = '#5a4a30';
      ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Lantern glow
      const t = Date.now() / 1000;
      const glow = 0.4 + 0.2 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(255,180,60,${glow})`;
      ctx.beginPath(); ctx.arc(ex + cw * 0.2, ey + 8, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + cw * 0.8, ey + 8, 4, 0, Math.PI * 2); ctx.fill();
      // Daylight glow from exit
      ctx.fillStyle = `rgba(200,220,255,${0.15 + 0.05 * Math.sin(t)})`;
      ctx.fillRect(ex + cw * 0.2, ey + 4, cw * 0.6, ch * 0.6);
      // Exit label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#90b0d0'; ctx.textAlign = "center";
      ctx.fillText("\u26CF EXIT MINE", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },
  mine_door: (e, ctx, ex, ey, w, h) => {
      // Dark stone tunnel archway connecting mine rooms
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;

      // Dark inner tunnel
      ctx.fillStyle = '#0e0a08';
      ctx.fillRect(ex + cw * 0.15, ey + ch * 0.1, cw * 0.7, ch * 0.85);

      // Stone arch frame
      ctx.strokeStyle = '#4a3a28';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ex + cw * 0.1, ey + ch * 0.95);
      ctx.lineTo(ex + cw * 0.1, ey + ch * 0.3);
      ctx.quadraticCurveTo(ex + cw * 0.1, ey, ex + cw * 0.5, ey);
      ctx.quadraticCurveTo(ex + cw * 0.9, ey, ex + cw * 0.9, ey + ch * 0.3);
      ctx.lineTo(ex + cw * 0.9, ey + ch * 0.95);
      ctx.stroke();

      // Fill the arch shape with dark stone
      ctx.fillStyle = '#2a1e14';
      ctx.beginPath();
      ctx.moveTo(ex + cw * 0.1, ey + ch * 0.95);
      ctx.lineTo(ex + cw * 0.1, ey + ch * 0.3);
      ctx.quadraticCurveTo(ex + cw * 0.1, ey, ex + cw * 0.5, ey);
      ctx.quadraticCurveTo(ex + cw * 0.9, ey, ex + cw * 0.9, ey + ch * 0.3);
      ctx.lineTo(ex + cw * 0.9, ey + ch * 0.95);
      ctx.closePath();
      ctx.fill();

      // Inner dark
      ctx.fillStyle = '#0e0a08';
      ctx.beginPath();
      ctx.moveTo(ex + cw * 0.2, ey + ch * 0.95);
      ctx.lineTo(ex + cw * 0.2, ey + ch * 0.35);
      ctx.quadraticCurveTo(ex + cw * 0.2, ey + ch * 0.08, ex + cw * 0.5, ey + ch * 0.08);
      ctx.quadraticCurveTo(ex + cw * 0.8, ey + ch * 0.08, ex + cw * 0.8, ey + ch * 0.35);
      ctx.lineTo(ex + cw * 0.8, ey + ch * 0.95);
      ctx.closePath();
      ctx.fill();

      // Lantern glow (pulsing) — left and right
      const glow = 0.5 + 0.25 * Math.sin(t * 2.5);
      ctx.fillStyle = `rgba(255,160,40,${glow})`;
      ctx.beginPath(); ctx.arc(ex + cw * 0.18, ey + ch * 0.15, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + cw * 0.82, ey + ch * 0.15, 5, 0, Math.PI * 2); ctx.fill();

      // Warm ambient glow inside tunnel
      ctx.fillStyle = `rgba(255,140,40,${0.06 + 0.03 * Math.sin(t * 1.5)})`;
      ctx.fillRect(ex + cw * 0.25, ey + ch * 0.15, cw * 0.5, ch * 0.7);

      // Label text below archway
      const label = e.label || 'PASSAGE';
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = '#dda060';
      ctx.textAlign = "center";
      ctx.fillText(label, ex + cw / 2, ey + ch + 12);
      ctx.textAlign = "left";
  },
  building_chapel: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+4, ey+ch+5, cw*0.38, 7, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#d0c8c0';
      ctx.fillRect(ex+cw*0.1, ey+ch*0.35, cw*0.8, ch*0.65);
      ctx.strokeStyle = '#a8a098'; ctx.lineWidth = 0.5;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
          const off = r%2===0 ? 0 : cw*0.12;
          ctx.strokeRect(ex+cw*0.12+off+c*cw*0.24, ey+ch*0.38+r*ch*0.14, cw*0.22, ch*0.12);
        }
      }
      ctx.fillStyle = '#d0c8c0';
      ctx.fillRect(ex+cw*0.33, ey+ch*0.1, cw*0.34, ch*0.28);
      ctx.fillStyle = '#4a4450';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.5, ey-ch*0.18); ctx.lineTo(ex+cw*0.3, ey+ch*0.12);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.12); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c0a040';
      ctx.fillRect(ex+cw*0.485, ey-ch*0.28, cw*0.03, ch*0.12);
      ctx.fillRect(ex+cw*0.45, ey-ch*0.24, cw*0.1, ch*0.03);
      ctx.fillStyle = '#1a1020';
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.22, cw*0.1, 0, Math.PI*2); ctx.fill();
      const colors = ['#c03030','#3060c0','#d0a020','#30a040','#8030a0'];
      for (let seg = 0; seg < 5; seg++) {
        ctx.fillStyle = colors[seg];
        const a1 = seg*Math.PI*2/5 - Math.PI/2, a2 = (seg+1)*Math.PI*2/5 - Math.PI/2;
        ctx.beginPath(); ctx.moveTo(ex+cw*0.5, ey+ch*0.22);
        ctx.arc(ex+cw*0.5, ey+ch*0.22, cw*0.08, a1, a2); ctx.fill();
      }
      ctx.fillStyle = `rgba(255,240,200,${0.1+Math.sin(t)*0.08})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.22, cw*0.08, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#1a2040';
      ctx.fillRect(ex+cw*0.15, ey+ch*0.48, cw*0.12, ch*0.2);
      ctx.beginPath(); ctx.moveTo(ex+cw*0.15, ey+ch*0.48); ctx.lineTo(ex+cw*0.21, ey+ch*0.4); ctx.lineTo(ex+cw*0.27, ey+ch*0.48); ctx.fill();
      ctx.fillRect(ex+cw*0.68, ey+ch*0.48, cw*0.12, ch*0.2);
      ctx.beginPath(); ctx.moveTo(ex+cw*0.68, ey+ch*0.48); ctx.lineTo(ex+cw*0.74, ey+ch*0.4); ctx.lineTo(ex+cw*0.8, ey+ch*0.48); ctx.fill();
      ctx.fillStyle = `rgba(100,120,200,${0.15+Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+cw*0.16, ey+ch*0.49, cw*0.1, ch*0.18);
      ctx.fillRect(ex+cw*0.69, ey+ch*0.49, cw*0.1, ch*0.18);
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(ex+cw*0.35, ey+ch*0.65, cw*0.3, ch*0.35);
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.65, cw*0.15, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(ex+cw*0.36, ey+ch*0.66, cw*0.13, ch*0.34);
      ctx.fillRect(ex+cw*0.51, ey+ch*0.66, cw*0.13, ch*0.34);
      ctx.fillStyle = '#c0a040';
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.15, cw*0.04, 0, Math.PI*2); ctx.fill();
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ddc090'; ctx.textAlign = "center";
      ctx.fillText("\u26EA Chapel", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  building_azurine: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.48, 9, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — dark blue-gray
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Roof — angular cyberpunk
      ctx.fillStyle = '#22223a';
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Roof highlight
      ctx.fillStyle = '#2a2a44';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.3, ey+ch*0.04); ctx.lineTo(ex+cw*0.7, ey+ch*0.04);
      ctx.lineTo(ex+cw+6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Neon cyan trim on roof edge
      ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
      ctx.stroke();
      // Windows — glowing cyan
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wr = 0; wr < 2; wr++) {
        for (let wc = 0; wc < 3; wc++) {
          const wx = ex + cw*0.12 + wc*cw*0.28;
          const wy = ey + ch*0.32 + wr*ch*0.24;
          ctx.fillStyle = '#0a0a18';
          ctx.fillRect(wx, wy, cw*0.18, ch*0.14);
          ctx.fillStyle = `rgba(0,204,255,${glow * 0.25})`;
          ctx.fillRect(wx+1, wy+1, cw*0.18-2, ch*0.14-2);
          ctx.strokeStyle = `rgba(0,204,255,${glow * 0.6})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, cw*0.18, ch*0.14);
        }
      }
      // Door area — dark opening
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.35, ey+ch*0.75, cw*0.3, ch*0.25);
      // Door neon frame
      ctx.strokeStyle = `rgba(255,0,170,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.35, ey+ch*0.75, cw*0.3, ch*0.25);
      // Neon sign glow
      const signGlow = 0.7 + Math.sin(t * 2.5) * 0.2;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(0,204,255,${signGlow})`;
      ctx.textAlign = "center";
      ctx.fillText("AZURINE", ex+cw/2, ey+ch*0.16);
      // Vertical neon strips on sides
      ctx.fillStyle = `rgba(0,204,255,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Label
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#00ccff'; ctx.textAlign = "center";
      ctx.fillText("Azurine City", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  azurine_entrance: (e, ctx, ex, ey, w, h) => {
      const ew = w * TILE, eh = h * TILE;
      const t = Date.now() / 1000;
      const glow = 0.4 + Math.sin(t * 2) * 0.15;
      // Glowing floor pad
      ctx.fillStyle = `rgba(0,204,255,${glow * 0.15})`;
      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeStyle = `rgba(0,204,255,${glow * 0.5})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
      // Arrow hint
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = `rgba(0,204,255,${glow * 0.7})`;
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 14);
      ctx.textAlign = "left";
  },
  cave_exit: (e, ctx, ex, ey, w, h) => {
      const t = Date.now() / 1000;
      ctx.fillStyle = `rgba(180,220,160,${0.3 + Math.sin(t * 2) * 0.1})`;
      ctx.fillRect(ex + 4, ey + 4, w * TILE - 8, h * TILE - 8);
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = `rgba(200,255,200,${0.6 + Math.sin(t * 3) * 0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("\u27F5 EXIT \u27F6", ex + w * TILE / 2, ey + h * TILE + 14);
      ctx.textAlign = "left";
  },
  azurine_exit: (e, ctx, ex, ey, w, h) => {
      const t = Date.now() / 1000;
      ctx.fillStyle = `rgba(0,204,255,${0.15 + Math.sin(t * 2) * 0.05})`;
      ctx.fillRect(ex + 4, ey + 4, w * TILE - 8, h * TILE - 8);
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = `rgba(0,204,255,${0.6 + Math.sin(t * 3) * 0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("\u27F5 EXIT \u27F6", ex + w * TILE / 2, ey + h * TILE + 14);
      ctx.textAlign = "left";
  },
  dungeon_door: (e, ctx, ex, ey, w, h) => {
      const dw = w * TILE, dh = h * TILE;
      const dcx = ex + dw/2, dcy = ey + dh/2;
      const t = Date.now() / 1000;
      ctx.fillStyle = '#2a2228';
      ctx.fillRect(ex, ey, dw, dh);
      ctx.fillStyle = '#1a0a0a';
      ctx.fillRect(ex + 8, ey + 6, dw - 16, dh - 6);
      ctx.strokeStyle = '#2a1212';
      ctx.lineWidth = 1;
      for (let px2 = ex + 18; px2 < ex + dw - 14; px2 += 16) {
        ctx.beginPath(); ctx.moveTo(px2, ey + 8); ctx.lineTo(px2, ey + dh - 2); ctx.stroke();
      }
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(ex + 8, ey + dh * 0.3, dw - 16, 4);
      ctx.fillRect(ex + 8, ey + dh * 0.65, dw - 16, 4);
      ctx.fillStyle = '#555';
      for (let si = 0; si < 4; si++) {
        const stX = ex + 16 + si * ((dw - 32) / 3);
        ctx.beginPath(); ctx.arc(stX, ey + dh * 0.3 + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(stX, ey + dh * 0.65 + 2, 3, 0, Math.PI * 2); ctx.fill();
      }
      const skullSize = 10;
      for (let side = 0; side < 2; side++) {
        const skX = side === 0 ? ex + 16 : ex + dw - 16;
        const skY = ey + dh * 0.48;
        ctx.fillStyle = '#888';
        ctx.beginPath(); ctx.arc(skX, skY - 2, skullSize, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(skX - 6, skY + 6, 12, 5);
        const eyeGlow = 0.7 + Math.sin(t * 3 + side) * 0.3;
        ctx.fillStyle = `rgba(255,30,30,${eyeGlow})`;
        ctx.beginPath(); ctx.arc(skX - 3, skY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(skX + 3, skY - 2, 2.5, 0, Math.PI * 2); ctx.fill();
      }
      const textPulse = 0.7 + Math.sin(t * 2.5) * 0.3;
      ctx.font = "bold 13px monospace";
      ctx.fillStyle = `rgba(220,30,30,${textPulse})`;
      ctx.textAlign = "center";
      ctx.fillText("\u26A0 DO NOT ENTER \u26A0", dcx, dcy + 2);
      const glowPulse = 0.04 + Math.sin(t * 1.5) * 0.02;
      ctx.fillStyle = `rgba(180,20,20,${glowPulse})`;
      ctx.fillRect(ex + 10, ey + 8, dw - 20, dh - 10);
      ctx.strokeStyle = `rgba(200,40,20,${0.3 + Math.sin(t * 2) * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(ex + 6, ey + 12); ctx.lineTo(ex + 2, ey + 28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + dw - 6, ey + 18); ctx.lineTo(ex + dw - 2, ey + 35); ctx.stroke();
      ctx.textAlign = "left";
  },
  queue_zone: (e, ctx, ex, ey, w, h) => {
      const qw = w * TILE, qh = h * TILE;
      const qcx = ex + qw/2, qcy = ey + qh/2;
      const t = Date.now() / 1000;
      ctx.fillStyle = `rgba(255,200,50,${0.02 + Math.sin(t * 2) * 0.01})`;
      ctx.fillRect(ex + 2, ey + 2, qw - 4, qh - 4);
      const sigilR = 28;
      const spread = qw * 0.38;
      const positions = [
        { x: qcx - spread, y: qcy + 10 },
        { x: qcx - spread * 0.33, y: qcy + 10 },
        { x: qcx + spread * 0.33, y: qcy + 10 },
        { x: qcx + spread, y: qcy + 10 },
      ];
      const qeData = levelEntities.find(ent => ent.type === 'queue_zone');
      if (qeData) {
        queueCirclePositions = positions.map(p => ({
          x: qeData.tx * TILE + (p.x - ex),
          y: qeData.ty * TILE + (p.y - ey),
        }));
      }
      for (let ci = 0; ci < 4; ci++) {
        const sx2 = positions[ci].x, sy2 = positions[ci].y;
        const isFilled = queueActive && ci < queuePlayers;
        const pulse = Math.sin(t * 2.5 + ci * 1.2);
        const pulse2 = Math.sin(t * 4 + ci * 0.9);
        const glowR2 = sigilR + 14 + pulse * 4;
        const glowAlpha2 = isFilled ? 0.18 + pulse * 0.06 : 0.06 + pulse * 0.02;
        const glowCol2 = isFilled ? `rgba(100,220,255,${glowAlpha2})` : `rgba(200,180,100,${glowAlpha2})`;
        ctx.fillStyle = glowCol2;
        ctx.beginPath(); ctx.arc(sx2, sy2, glowR2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = isFilled ? `rgba(100,220,255,${0.6 + pulse * 0.15})` : `rgba(200,180,100,${0.25 + pulse * 0.08})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx2, sy2, sigilR, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = isFilled ? `rgba(150,240,255,${0.4 + pulse * 0.1})` : `rgba(200,180,100,${0.15 + pulse * 0.05})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(sx2, sy2, sigilR - 6, 0, Math.PI * 2); ctx.stroke();
        const crossAlpha = isFilled ? 0.35 + pulse * 0.1 : 0.12 + pulse * 0.04;
        const crossCol = isFilled ? `rgba(150,240,255,${crossAlpha})` : `rgba(200,180,100,${crossAlpha})`;
        ctx.strokeStyle = crossCol;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(sx2 - sigilR + 8, sy2); ctx.lineTo(sx2 + sigilR - 8, sy2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(sx2, sy2 - sigilR + 8); ctx.lineTo(sx2, sy2 + sigilR - 8); ctx.stroke();
        const dotR = 2.5;
        const dotDist = sigilR - 3;
        ctx.fillStyle = crossCol;
        for (let d = 0; d < 4; d++) {
          const da = d * Math.PI / 2;
          ctx.beginPath(); ctx.arc(sx2 + Math.cos(da) * dotDist, sy2 + Math.sin(da) * dotDist, dotR, 0, Math.PI * 2); ctx.fill();
        }
        if (isFilled) {
          ctx.strokeStyle = `rgba(150,240,255,${0.2 + pulse2 * 0.08})`;
          ctx.lineWidth = 2;
          const rotAngle = t * 0.8 + ci;
          for (let a = 0; a < 3; a++) {
            const startA = rotAngle + a * (Math.PI * 2 / 3);
            ctx.beginPath(); ctx.arc(sx2, sy2, sigilR + 4, startA, startA + 0.5); ctx.stroke();
          }
        }
        if (isFilled) {
          ctx.fillStyle = `rgba(100,220,255,${0.08 + pulse * 0.03})`;
          ctx.beginPath(); ctx.arc(sx2, sy2, sigilR - 7, 0, Math.PI * 2); ctx.fill();
        }
        if (!isFilled) {
          ctx.font = "bold 18px monospace";
          ctx.fillStyle = `rgba(200,180,100,${0.2 + pulse * 0.06})`;
          ctx.textAlign = "center";
          ctx.fillText((ci + 1).toString(), sx2, sy2 + 6);
        }
      }
      if (!queueActive) {
        const btnW = 200, btnH = 36;
        const btnX = qcx - btnW/2, btnY = qcy - 36;
        ctx.fillStyle = nearQueue ? `rgba(60,180,60,${0.8 + Math.sin(t * 3) * 0.15})` : 'rgba(100,100,100,0.5)';
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.fill();
        ctx.strokeStyle = nearQueue ? '#88ff88' : '#666'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 8); ctx.stroke();
        ctx.font = "bold 14px monospace"; ctx.fillStyle = '#fff'; ctx.textAlign = "center";
        ctx.fillText(nearQueue ? "\u2694 PRESS Q TO QUEUE" : "\u2694 WALK HERE TO QUEUE", qcx, btnY + 23);
        ctx.textAlign = "left";
      } else {
        const sec = Math.ceil(queueTimer / 60);
        const pct = 1 - (queueTimer / QUEUE_DURATION);
        const cdY = qcy - 30;
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(qcx, cdY, 26, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = sec <= 3 ? '#ff4444' : '#44ff66'; ctx.lineCap = 'round'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(qcx, cdY, 26, -Math.PI/2, -Math.PI/2 + pct * Math.PI * 2); ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.font = "bold 24px monospace"; ctx.fillStyle = sec <= 3 ? '#ff4444' : '#fff'; ctx.textAlign = "center";
        ctx.fillText(sec.toString(), qcx, cdY + 8);
        ctx.font = "bold 11px monospace"; ctx.fillStyle = '#aaa';
        ctx.fillText("MOVE TO CANCEL", qcx, cdY + 28);
        ctx.textAlign = "left";
      }
  },
  torch: (e, ctx, ex, ey, w, h) => {
      const tcx3 = ex + TILE/2, tcy3 = ey + TILE/2;
      const t = Date.now() / 1000;
      const flicker = 0.7 + Math.sin(t * 8 + ex) * 0.15 + Math.sin(t * 13) * 0.1;
      const tgrd = ctx.createRadialGradient(tcx3, tcy3, 2, tcx3, tcy3, 50);
      tgrd.addColorStop(0, `rgba(255,160,40,${flicker * 0.25})`);
      tgrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tgrd;
      ctx.fillRect(tcx3 - 50, tcy3 - 50, 100, 100);
      ctx.fillStyle = '#555';
      ctx.fillRect(tcx3 - 2, tcy3 - 6, 4, 14);
      ctx.fillStyle = `rgba(255,180,40,${flicker})`;
      ctx.beginPath(); ctx.arc(tcx3, tcy3 - 10, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(255,100,20,${flicker * 0.8})`;
      ctx.beginPath(); ctx.arc(tcx3, tcy3 - 13, 3, 0, Math.PI * 2); ctx.fill();
  },
  neon_light: (e, ctx, ex, ey, w, h) => {
      const ncx = ex + TILE/2, ncy = ey + TILE/2;
      const t = Date.now() / 1000;
      const flicker = 0.6 + Math.sin(t * 3 + ex * 0.1) * 0.2 + Math.sin(t * 7 + ey * 0.1) * 0.1;
      // Cyan glow aura
      const ngrd = ctx.createRadialGradient(ncx, ncy, 2, ncx, ncy, 50);
      ngrd.addColorStop(0, `rgba(0,204,255,${flicker * 0.2})`);
      ngrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = ngrd;
      ctx.fillRect(ncx - 50, ncy - 50, 100, 100);
      // Fixture mount
      ctx.fillStyle = '#333';
      ctx.fillRect(ncx - 3, ncy - 4, 6, 10);
      // Light bar
      ctx.fillStyle = `rgba(0,204,255,${flicker})`;
      ctx.fillRect(ncx - 5, ncy - 6, 10, 3);
      // Hot center
      ctx.fillStyle = `rgba(180,240,255,${flicker * 0.8})`;
      ctx.fillRect(ncx - 3, ncy - 5, 6, 1);
  },
  rock: (e, ctx, ex, ey, w, h) => {
      const rcx = ex + TILE/2, rcy = ey + TILE/2;
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath(); ctx.arc(rcx, rcy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6a5a48';
      ctx.beginPath(); ctx.arc(rcx - 3, rcy - 4, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath(); ctx.arc(rcx + 5, rcy + 3, 7, 0, Math.PI * 2); ctx.fill();
  },

  // ===================== DELI / COOKING ENTITIES =====================

  building_deli: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(ex + cw / 2 + 5, ey + ch + 6, cw * 0.42, 8, 0, 0, Math.PI * 2); ctx.fill();
      // Main building body (warm brick)
      ctx.fillStyle = '#a06040';
      ctx.fillRect(ex + 4, ey + ch * 0.25, cw - 8, ch * 0.75);
      // Brick pattern
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 4; c++) {
          const off = r % 2 === 0 ? 0 : cw * 0.1;
          ctx.strokeStyle = '#804830'; ctx.lineWidth = 0.5;
          ctx.strokeRect(ex + 8 + off + c * cw * 0.2, ey + ch * 0.27 + r * ch * 0.13, cw * 0.18, ch * 0.11);
        }
      }
      // Foundation
      ctx.fillStyle = '#606060'; ctx.fillRect(ex + 2, ey + ch * 0.88, cw - 4, ch * 0.12);
      // Awning (red & white stripes — NY deli style)
      ctx.fillStyle = '#c03030';
      ctx.fillRect(ex - 4, ey + ch * 0.2, cw + 8, ch * 0.08);
      for (let s = 0; s < 8; s++) {
        ctx.fillStyle = s % 2 === 0 ? '#c03030' : '#e8e0d0';
        ctx.fillRect(ex - 4 + s * (cw + 8) / 8, ey + ch * 0.2, (cw + 8) / 8, ch * 0.08);
      }
      // Awning valance (scalloped bottom)
      ctx.fillStyle = '#c03030';
      for (let v = 0; v < 6; v++) {
        ctx.beginPath();
        ctx.arc(ex + cw * 0.05 + v * cw * 0.18, ey + ch * 0.3, cw * 0.06, 0, Math.PI);
        ctx.fill();
      }
      // Window (left)
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(ex + cw * 0.08, ey + ch * 0.38, cw * 0.3, ch * 0.22);
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 2;
      ctx.strokeRect(ex + cw * 0.08, ey + ch * 0.38, cw * 0.3, ch * 0.22);
      // Window warm glow
      ctx.fillStyle = `rgba(255,220,140,${0.15 + Math.sin(t * 1.2) * 0.08})`;
      ctx.fillRect(ex + cw * 0.09, ey + ch * 0.39, cw * 0.28, ch * 0.2);
      // Window (right)
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(ex + cw * 0.62, ey + ch * 0.38, cw * 0.3, ch * 0.22);
      ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 2;
      ctx.strokeRect(ex + cw * 0.62, ey + ch * 0.38, cw * 0.3, ch * 0.22);
      ctx.fillStyle = `rgba(255,220,140,${0.15 + Math.sin(t * 1.2) * 0.08})`;
      ctx.fillRect(ex + cw * 0.63, ey + ch * 0.39, cw * 0.28, ch * 0.2);
      // Door
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(ex + cw * 0.38, ey + ch * 0.55, cw * 0.24, ch * 0.45);
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2;
      ctx.strokeRect(ex + cw * 0.38, ey + ch * 0.55, cw * 0.24, ch * 0.45);
      // Door handle
      ctx.fillStyle = '#c0a040';
      ctx.beginPath(); ctx.arc(ex + cw * 0.57, ey + ch * 0.78, 3, 0, Math.PI * 2); ctx.fill();
      // Sign: "DELI"
      ctx.fillStyle = '#2a1808';
      ctx.fillRect(ex + cw * 0.25, ey + ch * 0.1, cw * 0.5, ch * 0.1);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#ffd700'; ctx.textAlign = "center";
      ctx.fillText("DELI", ex + cw / 2, ey + ch * 0.18);
      // Label below building
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ddc090';
      ctx.fillText("\uD83E\uDD6A Deli", ex + cw / 2, ey + ch + 14);
      ctx.textAlign = "left";
  },

  deli_entrance: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Dark doorway
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(ex + cw * 0.15, ey + 2, cw * 0.7, ch * 0.85);
      // Warm glow from inside
      ctx.fillStyle = `rgba(255,200,100,${0.15 + 0.06 * Math.sin(t * 1.5)})`;
      ctx.fillRect(ex + cw * 0.2, ey + 4, cw * 0.6, ch * 0.6);
      // Frame
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Enter label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#dda060'; ctx.textAlign = "center";
      ctx.fillText("ENTER DELI", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },

  deli_exit: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Dark doorway
      ctx.fillStyle = '#1a1008';
      ctx.fillRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      ctx.fillStyle = '#2a1810';
      ctx.fillRect(ex + cw * 0.15, ey + 2, cw * 0.7, ch * 0.85);
      // Daylight glow
      ctx.fillStyle = `rgba(200,220,255,${0.15 + 0.05 * Math.sin(t)})`;
      ctx.fillRect(ex + cw * 0.2, ey + 4, cw * 0.6, ch * 0.6);
      // Frame
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Exit label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#90b0d0'; ctx.textAlign = "center";
      ctx.fillText("EXIT DELI", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },

  // === HOUSE / FARM ENTITIES ===
  house_entrance: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Dark doorway
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(ex + cw * 0.15, ey + 2, cw * 0.7, ch * 0.85);
      // Warm glow from inside
      ctx.fillStyle = `rgba(255,200,120,${0.15 + 0.06 * Math.sin(t * 1.5)})`;
      ctx.fillRect(ex + cw * 0.2, ey + 4, cw * 0.6, ch * 0.6);
      // Wooden frame
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Enter label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#8ac060'; ctx.textAlign = "center";
      ctx.fillText("ENTER HOUSE", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },
  house_exit: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Dark doorway
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(ex + cw * 0.15, ey + 2, cw * 0.7, ch * 0.85);
      // Daylight glow from exit
      ctx.fillStyle = `rgba(180,220,140,${0.15 + 0.05 * Math.sin(t)})`;
      ctx.fillRect(ex + cw * 0.2, ey + 4, cw * 0.6, ch * 0.6);
      // Frame
      ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Exit label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#90c090'; ctx.textAlign = "center";
      ctx.fillText("⌂ EXIT HOUSE", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },
  farm_vendor: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      const bob = Math.sin(t * 2) * 1.5;
      const cx = ex + cw / 2, cy = ey + ch / 2 + bob;
      // Body
      ctx.fillStyle = '#5a8040';
      ctx.fillRect(cx - 10, cy - 4, 20, 20);
      // Overalls
      ctx.fillStyle = '#4a6830';
      ctx.fillRect(cx - 8, cy + 4, 16, 12);
      // Head
      ctx.fillStyle = '#dab080';
      ctx.beginPath(); ctx.arc(cx, cy - 10, 10, 0, Math.PI * 2); ctx.fill();
      // Straw hat
      ctx.fillStyle = '#c0a040';
      ctx.fillRect(cx - 14, cy - 22, 28, 6);
      ctx.fillStyle = '#d0b050';
      ctx.fillRect(cx - 8, cy - 28, 16, 10);
      // Eyes
      ctx.fillStyle = '#333';
      ctx.fillRect(cx - 4, cy - 12, 2, 2);
      ctx.fillRect(cx + 2, cy - 12, 2, 2);
      // Smile
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy - 7, 4, 0.1, Math.PI - 0.1); ctx.stroke();
      // Label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#8ac060'; ctx.textAlign = "center";
      ctx.fillText("FARM SHOP", cx, ey + ch + 10);
      ctx.textAlign = "left";
  },
  farm_well: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const cx = ex + cw / 2, cy = ey + ch / 2;
      // Stone base (circle)
      ctx.fillStyle = '#6a6a70';
      ctx.beginPath(); ctx.ellipse(cx, cy + 8, cw / 2 - 4, ch / 2 - 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a7a80';
      ctx.beginPath(); ctx.ellipse(cx, cy + 4, cw / 2 - 8, ch / 2 - 6, 0, 0, Math.PI * 2); ctx.fill();
      // Water inside
      ctx.fillStyle = 'rgba(60,120,200,0.5)';
      ctx.beginPath(); ctx.ellipse(cx, cy + 2, cw / 2 - 12, ch / 2 - 10, 0, 0, Math.PI * 2); ctx.fill();
      // Roof posts
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(cx - cw / 2 + 8, cy - 20, 4, 28);
      ctx.fillRect(cx + cw / 2 - 12, cy - 20, 4, 28);
      // Roof
      ctx.fillStyle = '#8a5a30';
      ctx.beginPath(); ctx.moveTo(cx, cy - 30); ctx.lineTo(cx - cw / 2 + 4, cy - 16); ctx.lineTo(cx + cw / 2 - 4, cy - 16); ctx.closePath(); ctx.fill();
  },
  farm_table: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Table top
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath(); ctx.roundRect(ex + 4, ey + 4, cw - 8, ch - 8, 4); ctx.fill();
      ctx.fillStyle = '#a06e44';
      ctx.beginPath(); ctx.roundRect(ex + 6, ey + 6, cw - 12, ch - 12, 3); ctx.fill();
      // Edge shadow
      ctx.strokeStyle = '#6a4028'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(ex + 4, ey + 4, cw - 8, ch - 8, 4); ctx.stroke();
      // Legs
      ctx.fillStyle = '#5a3820';
      ctx.fillRect(ex + 6, ey + 6, 4, 4);
      ctx.fillRect(ex + cw - 10, ey + 6, 4, 4);
      ctx.fillRect(ex + 6, ey + ch - 10, 4, 4);
      ctx.fillRect(ex + cw - 10, ey + ch - 10, 4, 4);
  },
  farm_bed: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Bed frame
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Mattress
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(ex + 6, ey + 6, cw - 12, ch - 12);
      // Pillow
      ctx.fillStyle = '#f0f0e8';
      ctx.beginPath(); ctx.roundRect(ex + 8, ey + 8, cw - 16, ch * 0.25, 4); ctx.fill();
      // Blanket
      ctx.fillStyle = '#406080';
      ctx.fillRect(ex + 6, ey + ch * 0.4, cw - 12, ch * 0.45);
      ctx.fillStyle = '#4a6a8a';
      ctx.fillRect(ex + 8, ey + ch * 0.4, cw - 16, 4);
  },
  farm_chest: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Chest body
      ctx.fillStyle = '#6a4a20';
      ctx.beginPath(); ctx.roundRect(ex + 4, ey + 8, cw - 8, ch - 12, 3); ctx.fill();
      // Chest lid
      ctx.fillStyle = '#7a5a30';
      ctx.beginPath(); ctx.roundRect(ex + 2, ey + 4, cw - 4, ch * 0.4, [4, 4, 0, 0]); ctx.fill();
      // Metal bands
      ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex + 8, ey + 4); ctx.lineTo(ex + 8, ey + ch - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex + cw - 8, ey + 4); ctx.lineTo(ex + cw - 8, ey + ch - 4); ctx.stroke();
      // Lock
      ctx.fillStyle = '#c0a030';
      ctx.beginPath(); ctx.arc(ex + cw / 2, ey + ch * 0.4 + 4, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a08020';
      ctx.fillRect(ex + cw / 2 - 2, ey + ch * 0.4 + 4, 4, 6);
  },
  farm_zone: () => {}, // Invisible — defines tillable bounds only

  bread_station: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Wooden shelf background
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#6a4a28';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Shelf divider
      ctx.fillStyle = '#4a2a18';
      ctx.fillRect(ex, ey + ch * 0.5, cw, 3);
      // Bread items — full labels
      const items = [
        { color: '#c8a050', x: 0.05, label: 'Bread' },
        { color: '#d4a840', x: 0.52, label: 'Bagel' },
      ];
      for (const itm of items) {
        const ix = ex + itm.x * cw;
        const iw = cw * 0.42, ih = ch * 0.35;
        ctx.fillStyle = itm.color;
        ctx.fillRect(ix, ey + ch * 0.08, iw, ih);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
        ctx.strokeRect(ix, ey + ch * 0.08, iw, ih);
        // White text with dark shadow
        ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = '#000'; ctx.fillText(itm.label, ix + iw / 2 + 1, ey + ch * 0.3 + 1);
        ctx.fillStyle = '#fff'; ctx.fillText(itm.label, ix + iw / 2, ey + ch * 0.3);
      }
      // Title banner
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex, ey + ch + 2, cw, 16);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#ffd080'; ctx.textAlign = "center";
      ctx.fillText("BREADS", ex + cw / 2, ey + ch + 14);
      ctx.textAlign = "left";
  },

  meat_station: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Cold storage background
      ctx.fillStyle = '#4a3828';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#5a4830';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Shelf divider
      ctx.fillStyle = '#3a2818';
      ctx.fillRect(ex, ey + ch * 0.5, cw, 3);
      // Meat items — full labels
      const items = [
        { color: '#d4a080', x: 0.02, label: 'Turkey' },
        { color: '#e08080', x: 0.35, label: 'Ham' },
        { color: '#c04040', x: 0.68, label: 'Salami' },
      ];
      for (const itm of items) {
        const ix = ex + itm.x * cw;
        const iw = cw * 0.3, ih = ch * 0.35;
        ctx.fillStyle = itm.color;
        ctx.fillRect(ix, ey + ch * 0.08, iw, ih);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
        ctx.strokeRect(ix, ey + ch * 0.08, iw, ih);
        // White text with dark shadow
        ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = '#000'; ctx.fillText(itm.label, ix + iw / 2 + 1, ey + ch * 0.3 + 1);
        ctx.fillStyle = '#fff'; ctx.fillText(itm.label, ix + iw / 2, ey + ch * 0.3);
      }
      // Title banner
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex, ey + ch + 2, cw, 16);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#ffa0a0'; ctx.textAlign = "center";
      ctx.fillText("MEATS", ex + cw / 2, ey + ch + 14);
      ctx.textAlign = "left";
  },

  veggie_station: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Green-tinted shelf
      ctx.fillStyle = '#2a4a28';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#3a5a30';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Veggie items stacked vertically — full labels
      const items = [
        { color: '#60c040', y: 0.02, label: 'Lettuce' },
        { color: '#e04040', y: 0.26, label: 'Tomato' },
        { color: '#f0d040', y: 0.50, label: 'Cheese' },
        { color: '#d0b0d0', y: 0.74, label: 'Onion' },
      ];
      for (const itm of items) {
        const iy = ey + itm.y * ch;
        const ih = ch * 0.20;
        ctx.fillStyle = itm.color;
        ctx.fillRect(ex + 4, iy, cw - 8, ih);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
        ctx.strokeRect(ex + 4, iy, cw - 8, ih);
        // White text with dark shadow
        ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = '#000'; ctx.fillText(itm.label, ex + cw / 2 + 1, iy + ih * 0.65 + 1);
        ctx.fillStyle = '#fff'; ctx.fillText(itm.label, ex + cw / 2, iy + ih * 0.65);
      }
      // Title banner (to the right of the station)
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex + cw + 2, ey, 18, ch);
      ctx.translate(ex + cw + 15, ey + ch / 2);
      ctx.rotate(Math.PI / 2);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#80ff80'; ctx.textAlign = "center";
      ctx.fillText("VEGGIES", 0, 0);
      ctx.restore();
      ctx.textAlign = "left";
  },

  sauce_station: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Metal background
      ctx.fillStyle = '#707880';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#808890';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Sauce bottles stacked vertically — full labels
      const sauces = [
        { color: '#f0f0d0', y: 0.02, label: 'Mayo' },
        { color: '#d02020', y: 0.26, label: 'Ketchup' },
        { color: '#d0c020', y: 0.50, label: 'Mustard' },
        { color: '#e8e8d0', y: 0.74, label: 'Ranch' },
      ];
      for (const s of sauces) {
        const sy = ey + s.y * ch;
        const sh = ch * 0.20;
        ctx.fillStyle = s.color;
        ctx.fillRect(ex + 4, sy, cw - 8, sh);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1;
        ctx.strokeRect(ex + 4, sy, cw - 8, sh);
        // Dark text with light shadow for readability on colored backgrounds
        ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillText(s.label, ex + cw / 2 + 1, sy + sh * 0.65 + 1);
        ctx.fillStyle = '#1a1a1a'; ctx.fillText(s.label, ex + cw / 2, sy + sh * 0.65);
      }
      // Title banner (to the left of the station)
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex - 20, ey, 18, ch);
      ctx.translate(ex - 7, ey + ch / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#a0c0ff'; ctx.textAlign = "center";
      ctx.fillText("SAUCES", 0, 0);
      ctx.restore();
      ctx.textAlign = "left";
  },

  deli_counter: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Counter top (light wood)
      ctx.fillStyle = '#b08850';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#c0985a';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Counter edge (dark strip at front)
      ctx.fillStyle = '#6a4830';
      ctx.fillRect(ex, ey + ch - 6, cw, 6);
      // Cutting board
      ctx.fillStyle = '#8a6838';
      ctx.fillRect(ex + cw * 0.35, ey + ch * 0.2, cw * 0.3, ch * 0.6);
      ctx.strokeStyle = '#6a4828'; ctx.lineWidth = 1;
      ctx.strokeRect(ex + cw * 0.35, ey + ch * 0.2, cw * 0.3, ch * 0.6);
      // Title banner below
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex + cw / 2 - 50, ey + ch + 2, 100, 16);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#ffd080'; ctx.textAlign = "center";
      ctx.fillText("CLEAR PLATE", ex + cw / 2, ey + ch + 14);
      ctx.textAlign = "left";
  },

  pickup_counter: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Counter surface (green-tinted, distinct from wall)
      ctx.fillStyle = '#506838';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#608048';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Service bell
      const bellR = Math.min(8, ch * 0.3);
      ctx.fillStyle = '#c0a040';
      ctx.beginPath(); ctx.arc(ex + cw * 0.5, ey + ch * 0.35, bellR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a08030';
      ctx.beginPath(); ctx.arc(ex + cw * 0.5, ey + ch * 0.35, bellR * 0.6, Math.PI, 0); ctx.fill();
      // Pulsing ready indicator
      const pulse = 0.5 + 0.3 * Math.sin(t * 3);
      ctx.fillStyle = `rgba(100,200,80,${pulse})`;
      ctx.beginPath(); ctx.arc(ex + cw * 0.5, ey + ch * 0.7, 3, 0, Math.PI * 2); ctx.fill();
      // SERVE label on the counter
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#80ff80'; ctx.textAlign = "center";
      ctx.fillText("SERVE", ex + cw / 2, ey + ch - 4);
      ctx.textAlign = "left";
  },

  deli_queue_area: (e, ctx, ex, ey, w, h) => {
      // Subtle floor marking for customer queue
      const cw = w * TILE, ch = h * TILE;
      ctx.fillStyle = 'rgba(200,180,140,0.08)';
      ctx.fillRect(ex, ey, cw, ch);
      // Dotted line path
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = 'rgba(200,180,140,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ex + cw * 0.5, ey);
      ctx.lineTo(ex + cw * 0.5, ey + ch);
      ctx.stroke();
      ctx.setLineDash([]);
  },

  deli_table: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 3) * TILE, ch = (h || 2) * TILE;
      // Table top (warm wood)
      ctx.fillStyle = '#8b5e3c';
      ctx.beginPath(); ctx.roundRect(ex + 4, ey + 4, cw - 8, ch - 8, 4); ctx.fill();
      ctx.fillStyle = '#a06e44';
      ctx.beginPath(); ctx.roundRect(ex + 6, ey + 6, cw - 12, ch - 12, 3); ctx.fill();
      // Table edge shadow
      ctx.strokeStyle = '#6a4028'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(ex + 4, ey + 4, cw - 8, ch - 8, 4); ctx.stroke();
      // Wood grain lines
      ctx.strokeStyle = 'rgba(90,50,20,0.15)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const gy = ey + ch * 0.25 + i * ch * 0.2;
        ctx.beginPath(); ctx.moveTo(ex + 10, gy); ctx.lineTo(ex + cw - 10, gy); ctx.stroke();
      }
      // Table legs (4 corners)
      ctx.fillStyle = '#5a3820';
      ctx.fillRect(ex + 6, ey + 6, 4, 4);
      ctx.fillRect(ex + cw - 10, ey + 6, 4, 4);
      ctx.fillRect(ex + 6, ey + ch - 10, 4, 4);
      ctx.fillRect(ex + cw - 10, ey + ch - 10, 4, 4);
  },

  deli_chair: (e, ctx, ex, ey) => {
      const s = TILE;
      const cx = ex + s / 2, cy = ey + s / 2;
      // Cushion shadow
      ctx.fillStyle = '#7a5a3a';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 3, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Main cushion body (soft warm red)
      ctx.fillStyle = '#b04848';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 16, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      // Cushion highlight (lighter center)
      ctx.fillStyle = '#c85858';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 1, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Inner detail — tuft/button in center
      ctx.fillStyle = '#a04040';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      // Cushion edge stitch line
      ctx.strokeStyle = '#903838';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 14, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
  },

  deli_divider: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 1) * TILE, ch = (h || 1) * TILE;
      // Half-wall divider between kitchen and dining
      ctx.fillStyle = '#6a5a40';
      ctx.fillRect(ex + cw * 0.25, ey, cw * 0.5, ch);
      ctx.fillStyle = '#7a6a48';
      ctx.fillRect(ex + cw * 0.3, ey, cw * 0.4, ch);
      // Top rail
      ctx.fillStyle = '#8a7a58';
      ctx.fillRect(ex + cw * 0.15, ey, cw * 0.7, 4);
      // Vertical posts every few tiles
      ctx.fillStyle = '#5a4a30';
      const postSpacing = TILE * 3;
      for (let py = ey; py < ey + ch; py += postSpacing) {
        ctx.fillRect(ex + cw * 0.2, py, cw * 0.6, 6);
      }
  },

  deli_service_counter: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 1) * TILE, ch = (h || 1) * TILE;
      // Tall counter separating kitchen from dining
      ctx.fillStyle = '#6a4830';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#8a6840';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Counter top surface (lighter)
      ctx.fillStyle = '#b09060';
      ctx.fillRect(ex, ey, cw, 5);
      // Dark base
      ctx.fillStyle = '#4a3020';
      ctx.fillRect(ex, ey + ch - 4, cw, 4);
  },

  kitchen_door: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 2) * TILE, ch = (h || 1) * TILE;
      // Floor under doorway
      ctx.fillStyle = '#d8d0b8';
      ctx.fillRect(ex, ey, cw, ch);
      // Door frame sides
      ctx.fillStyle = '#5a4028';
      ctx.fillRect(ex, ey, 4, ch);
      ctx.fillRect(ex + cw - 4, ey, 4, ch);
      // "KITCHEN" label
      ctx.font = "bold 9px monospace"; ctx.fillStyle = '#8a7a60'; ctx.textAlign = "center";
      ctx.fillText("KITCHEN", ex + cw / 2, ey + ch / 2 + 3);
      ctx.textAlign = "left";
  },

  tip_jar: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 2) * TILE, ch = (h || 1) * TILE;
      const t = Date.now() / 1000;
      // Counter surface (warm brown, stands out from wall)
      ctx.fillStyle = '#5a4a38';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#6a5a48';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Jar body (glass, compact for 1-tile height)
      const jw = cw * 0.4, jh = ch * 0.65;
      const jx = ex + (cw - jw) / 2, jy = ey + ch * 0.05;
      ctx.fillStyle = 'rgba(180,220,255,0.35)';
      ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 4); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(jx, jy, jw, jh, 4); ctx.stroke();
      // Coins inside
      const hasTips = typeof cookingState !== 'undefined' && cookingState.tipJar > 0;
      if (hasTips) {
        const fillPct = Math.min(1, cookingState.tipJar / 20);
        const coinH = jh * 0.2 + jh * 0.5 * fillPct;
        ctx.fillStyle = '#d4a030';
        ctx.fillRect(jx + 3, jy + jh - coinH, jw - 6, coinH);
        ctx.fillStyle = '#e8c040';
        ctx.fillRect(jx + 5, jy + jh - coinH + 1, jw - 10, coinH * 0.4);
        // Sparkle
        const sparkle = 0.4 + 0.3 * Math.sin(t * 4);
        ctx.fillStyle = `rgba(255,215,0,${sparkle})`;
        ctx.beginPath(); ctx.arc(jx + jw * 0.35, jy + jh * 0.45, 2, 0, Math.PI * 2); ctx.fill();
      }
      // Lid
      ctx.fillStyle = '#a08040';
      ctx.fillRect(jx - 1, jy - 2, jw + 2, 4);
      // TIPS label + amount on counter
      ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = '#ffd700';
      ctx.fillText(hasTips ? "TIPS $" + cookingState.tipJar : "TIPS", ex + cw / 2, ey + ch - 4);
      ctx.textAlign = "left";
  },


  deli_vending: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Body
      ctx.fillStyle = '#2a3a5a';
      ctx.beginPath(); ctx.roundRect(ex, ey, cw, ch, 4); ctx.fill();
      ctx.fillStyle = '#3a4a6a';
      ctx.beginPath(); ctx.roundRect(ex + 3, ey + 3, cw - 6, ch - 6, 3); ctx.fill();
      // Display window (top 60%)
      ctx.fillStyle = '#1a2a3a';
      ctx.fillRect(ex + 6, ey + 6, cw - 12, ch * 0.55);
      ctx.strokeStyle = '#5a6a8a'; ctx.lineWidth = 1;
      ctx.strokeRect(ex + 6, ey + 6, cw - 12, ch * 0.55);
      // Shelves with items
      const shelfY1 = ey + 10, shelfY2 = ey + ch * 0.28;
      ctx.fillStyle = '#506080';
      ctx.fillRect(ex + 8, shelfY1 + 18, cw - 16, 2);
      ctx.fillRect(ex + 8, shelfY2 + 18, cw - 16, 2);
      // Drinks (top shelf — cans)
      const colors = ['#e02020', '#2060e0', '#20c020', '#e0a020'];
      for (let i = 0; i < 4; i++) {
        const ix = ex + 10 + i * ((cw - 20) / 4);
        ctx.fillStyle = colors[i];
        ctx.fillRect(ix, shelfY1 + 4, 12, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(ix + 2, shelfY1 + 6, 3, 10);
      }
      // Snacks (bottom shelf — bags)
      const snackColors = ['#d0a030', '#e06030', '#30a0d0', '#a040c0'];
      for (let i = 0; i < 4; i++) {
        const ix = ex + 10 + i * ((cw - 20) / 4);
        ctx.fillStyle = snackColors[i];
        ctx.beginPath(); ctx.roundRect(ix, shelfY2 + 2, 12, 16, 2); ctx.fill();
      }
      // Coin slot area
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(ex + 6, ey + ch * 0.65, cw - 12, ch * 0.28);
      ctx.strokeStyle = '#4a5a7a';
      ctx.strokeRect(ex + 6, ey + ch * 0.65, cw - 12, ch * 0.28);
      // Coin slot
      ctx.fillStyle = '#808890';
      ctx.fillRect(ex + cw / 2 - 8, ey + ch * 0.68, 16, 4);
      // Dispensing slot
      ctx.fillStyle = '#0a1020';
      ctx.fillRect(ex + 10, ey + ch * 0.82, cw - 20, ch * 0.08);
      // Glow indicator
      const glow = 0.3 + 0.2 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(80,200,120,${glow})`;
      ctx.beginPath(); ctx.arc(ex + cw / 2, ey + ch * 0.76, 3, 0, Math.PI * 2); ctx.fill();
      // Label
      ctx.font = "bold 9px monospace"; ctx.fillStyle = '#80c0ff'; ctx.textAlign = "center";
      ctx.fillText("DRINKS &", ex + cw / 2, ey + ch * 0.65 - 8);
      ctx.fillText("SNACKS", ex + cw / 2, ey + ch * 0.65);
      ctx.textAlign = "left";
  },

  deli_condiment_table: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Table surface
      ctx.fillStyle = '#6a5a40';
      ctx.beginPath(); ctx.roundRect(ex, ey, cw, ch, 4); ctx.fill();
      ctx.fillStyle = '#7a6a50';
      ctx.beginPath(); ctx.roundRect(ex + 3, ey + 3, cw - 6, ch - 6, 3); ctx.fill();
      // Light wood grain
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let g = 0; g < 4; g++) {
        ctx.fillRect(ex + 6 + g * (cw / 4), ey + 4, 2, ch - 8);
      }
      // Napkin holder (left)
      ctx.fillStyle = '#a09080';
      ctx.fillRect(ex + 8, ey + ch * 0.25, 16, 20);
      ctx.fillStyle = '#f0ece0';
      ctx.fillRect(ex + 10, ey + ch * 0.25, 12, 4);
      // Ketchup bottle
      ctx.fillStyle = '#d02020';
      ctx.fillRect(ex + cw * 0.3, ey + ch * 0.2, 10, 22);
      ctx.fillStyle = '#e04040';
      ctx.fillRect(ex + cw * 0.3 + 2, ey + ch * 0.2, 6, 8);
      ctx.fillStyle = '#a01010';
      ctx.fillRect(ex + cw * 0.3 + 3, ey + ch * 0.15, 4, 8);
      // Mustard bottle
      ctx.fillStyle = '#d0b020';
      ctx.fillRect(ex + cw * 0.48, ey + ch * 0.2, 10, 22);
      ctx.fillStyle = '#e0c830';
      ctx.fillRect(ex + cw * 0.48 + 2, ey + ch * 0.2, 6, 8);
      ctx.fillStyle = '#b09010';
      ctx.fillRect(ex + cw * 0.48 + 3, ey + ch * 0.15, 4, 8);
      // Salt & pepper shakers
      ctx.fillStyle = '#e8e8e8';
      ctx.beginPath(); ctx.roundRect(ex + cw * 0.68, ey + ch * 0.25, 10, 16, 3); ctx.fill();
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(ex + cw * 0.68 + 2, ey + ch * 0.22, 6, 5);
      ctx.fillStyle = '#303030';
      ctx.beginPath(); ctx.roundRect(ex + cw * 0.68 + 14, ey + ch * 0.25, 10, 16, 3); ctx.fill();
      ctx.fillStyle = '#505050';
      ctx.fillRect(ex + cw * 0.68 + 16, ey + ch * 0.22, 6, 5);
      // Straw dispenser (right)
      ctx.fillStyle = '#c0b8a8';
      ctx.fillRect(ex + cw - 28, ey + ch * 0.15, 14, 28);
      ctx.fillStyle = '#d0c8b8';
      ctx.fillRect(ex + cw - 26, ey + ch * 0.15, 10, 4);
      // Colored straws poking out
      ctx.fillStyle = '#e04040'; ctx.fillRect(ex + cw - 25, ey + ch * 0.1, 2, 10);
      ctx.fillStyle = '#4080e0'; ctx.fillRect(ex + cw - 22, ey + ch * 0.08, 2, 12);
      ctx.fillStyle = '#40c040'; ctx.fillRect(ex + cw - 19, ey + ch * 0.11, 2, 9);
      // Label
      ctx.font = "bold 9px monospace"; ctx.fillStyle = '#c0b090'; ctx.textAlign = "center";
      ctx.fillText("CONDIMENTS", ex + cw / 2, ey + ch - 6);
      ctx.textAlign = "left";
  },





  deli_kitchen_floor: (e, ctx, ex, ey, w, h) => {
      const tw = w || 1, th = h || 1;
      for (let py = 0; py < th; py++) {
        for (let px = 0; px < tw; px++) {
          const rx = ex + px * TILE, ry = ey + py * TILE;
          // Checkerboard tile pattern — white/light grey
          const isLight = (px + py) % 2 === 0;
          ctx.fillStyle = isLight ? '#d0ccc4' : '#b8b4ac';
          ctx.fillRect(rx, ry, TILE, TILE);
          // Tile grout lines
          ctx.fillStyle = '#9a968e';
          ctx.fillRect(rx, ry, TILE, 1);
          ctx.fillRect(rx, ry, 1, TILE);
          // Subtle wear marks
          if ((px * 7 + py * 13) % 5 === 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.04)';
            ctx.fillRect(rx + 8 + (px * 3) % 20, ry + 6 + (py * 7) % 20, 10, 8);
          }
        }
      }
  },
};

// ---- Grocery Shelf Renderer Data ----
const SHELF_TYPES = {
  deli_shelf_canned:   { label: 'Canned Goods', shelfColor: '#6a5a48', items: ['#c04040','#d08030','#40a040','#d0d040','#4080c0','#c06060'], itemShape: 'can' },
  deli_shelf_snacks:   { label: 'Snacks',       shelfColor: '#6a5a48', items: ['#e0c020','#e04040','#4080e0','#e08040','#40c040','#c040c0'], itemShape: 'bag' },
  deli_shelf_drinks:   { label: 'Beverages',    shelfColor: '#6a5a48', items: ['#2060c0','#c02020','#20a020','#e0a020','#8040c0','#40c0c0'], itemShape: 'bottle' },
  deli_shelf_cereal:   { label: 'Cereal',       shelfColor: '#6a5a48', items: ['#e0a020','#c04040','#4080c0','#40a040','#d06020','#8060c0'], itemShape: 'box' },
  deli_shelf_bread:    { label: 'Bakery',       shelfColor: '#6a5a48', items: ['#c8a050','#d4a840','#a08040','#c09040','#b09848','#d0b060'], itemShape: 'loaf' },
  deli_shelf_pasta:    { label: 'Pasta & Rice', shelfColor: '#6a5a48', items: ['#d0c080','#e0d090','#c0a860','#b09848','#d0b860','#c8b870'], itemShape: 'box' },
  deli_shelf_sauces:   { label: 'Sauces',       shelfColor: '#6a5a48', items: ['#c02020','#20a020','#d0a020','#802020','#c06020','#40a0a0'], itemShape: 'bottle' },
  deli_shelf_dairy:    { label: 'Dairy',        shelfColor: '#5a6a78', items: ['#f0f0f0','#f0e080','#e0d0a0','#d0e0f0','#f0d0d0','#e0f0e0'], itemShape: 'carton' },
  deli_shelf_frozen:   { label: 'Frozen',       shelfColor: '#4a5a6a', items: ['#80c0e0','#a0d0f0','#60a0d0','#c0e0f0','#70b0d0','#90c0e0'], itemShape: 'box' },
  deli_shelf_produce:  { label: 'Produce',      shelfColor: '#4a5a38', items: ['#40a020','#e04040','#e0a020','#a060c0','#f0c040','#60c060'], itemShape: 'round' },
  deli_shelf_candy:    { label: 'Candy',        shelfColor: '#6a4a58', items: ['#e04080','#40c0e0','#e0e040','#e06020','#a040e0','#40e080'], itemShape: 'bag' },
  deli_shelf_baking:   { label: 'Baking',       shelfColor: '#6a5a48', items: ['#f0f0e0','#d0b060','#c09040','#f0e0c0','#e0d0a0','#d0c890'], itemShape: 'box' },
  deli_shelf_spices:   { label: 'Spices',       shelfColor: '#5a4a38', items: ['#c04020','#d0a020','#806020','#40a040','#c08040','#a06040'], itemShape: 'jar' },
  deli_shelf_cleaning: { label: 'Cleaning',     shelfColor: '#4a5a68', items: ['#4080e0','#40c040','#e0e040','#e06040','#c040c0','#40c0c0'], itemShape: 'bottle' },
  deli_shelf_cookies:  { label: 'Cookies & Treats', shelfColor: '#5a4a30', items: ['#c08030','#8a5020','#d0a040','#a06828','#c09038','#7a4a28'], itemShape: 'round' },
  deli_shelf_soups:    { label: 'Soups',        shelfColor: '#5a4838', items: ['#c08020','#80a040','#d0a060','#a06030','#c0a040','#d08040'], itemShape: 'can' },
};

// Generic grocery shelf renderer
const _shelfRenderer = (e, ctx, ex, ey, w, h) => {
  const shelfData = SHELF_TYPES[e.type];
  if (!shelfData) return;

  const cw = (w || 5) * TILE, ch = (h || 2) * TILE;
  const { label, shelfColor, items, itemShape } = shelfData;

  // Shelf frame (outer)
  ctx.fillStyle = shelfColor;
  ctx.fillRect(ex, ey, cw, ch);
  // Inner back panel
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(ex + 3, ey + 3, cw - 6, ch - 6);

  // Middle shelf divider
  const shelfY = ey + ch * 0.48;
  ctx.fillStyle = shelfColor;
  ctx.fillRect(ex + 2, shelfY, cw - 4, 4);

  // Draw items on 2 shelves (top + bottom)
  const cols = items.length;
  const topY = ey + 6;
  const botY = shelfY + 6;
  const rowH = ch * 0.38;
  const colW = (cw - 10) / cols;
  const margin = 3;

  for (let row = 0; row < 2; row++) {
    const ry = row === 0 ? topY : botY;
    for (let col = 0; col < cols; col++) {
      const colorIdx = row === 0 ? col : (col + 3) % cols;
      const color = items[colorIdx];
      const ix = ex + 5 + col * colW + margin;
      const iw = colW - margin * 2;
      const ih = rowH - 4;

      ctx.fillStyle = color;

      if (itemShape === 'can') {
        // Cylinder shape — rounded rect with highlight stripe
        ctx.beginPath(); ctx.roundRect(ix, ry, iw, ih, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(ix + 2, ry + 2, iw * 0.3, ih - 4);
        // Label band
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(ix + 1, ry + ih * 0.35, iw - 2, ih * 0.25);
      } else if (itemShape === 'bag') {
        // Crinkly bag — taper at top
        ctx.beginPath();
        ctx.moveTo(ix + 2, ry);
        ctx.lineTo(ix + iw - 2, ry);
        ctx.lineTo(ix + iw, ry + ih);
        ctx.lineTo(ix, ry + ih);
        ctx.closePath();
        ctx.fill();
        // Logo circle
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.arc(ix + iw / 2, ry + ih * 0.55, iw * 0.25, 0, Math.PI * 2);
        ctx.fill();
      } else if (itemShape === 'bottle') {
        // Bottle — narrow neck, wider body
        const neckW = iw * 0.35, neckH = ih * 0.25;
        const bodyW = iw, bodyH = ih * 0.7;
        // Neck
        ctx.fillRect(ix + (iw - neckW) / 2, ry, neckW, neckH);
        // Body
        ctx.beginPath(); ctx.roundRect(ix, ry + neckH, bodyW, bodyH, 3); ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(ix + 1, ry + neckH + bodyH * 0.2, bodyW - 2, bodyH * 0.35);
      } else if (itemShape === 'box') {
        // Simple box
        ctx.beginPath(); ctx.roundRect(ix, ry, iw, ih, 2); ctx.fill();
        // Front face highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(ix + 2, ry + 2, iw - 4, ih * 0.4);
        // Brand stripe
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(ix + 1, ry + ih * 0.5, iw - 2, 3);
      } else if (itemShape === 'loaf') {
        // Bread loaf — rounded top
        ctx.beginPath();
        ctx.moveTo(ix, ry + ih);
        ctx.lineTo(ix, ry + ih * 0.4);
        ctx.quadraticCurveTo(ix + iw / 2, ry - ih * 0.1, ix + iw, ry + ih * 0.4);
        ctx.lineTo(ix + iw, ry + ih);
        ctx.closePath();
        ctx.fill();
        // Score lines
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ix + iw * 0.3, ry + ih * 0.3);
        ctx.lineTo(ix + iw * 0.7, ry + ih * 0.3);
        ctx.stroke();
      } else if (itemShape === 'carton') {
        // Milk/juice carton — rectangle with peaked top
        ctx.beginPath();
        ctx.moveTo(ix, ry + ih);
        ctx.lineTo(ix, ry + ih * 0.2);
        ctx.lineTo(ix + iw / 2, ry);
        ctx.lineTo(ix + iw, ry + ih * 0.2);
        ctx.lineTo(ix + iw, ry + ih);
        ctx.closePath();
        ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(ix + 2, ry + ih * 0.4, iw - 4, ih * 0.3);
      } else if (itemShape === 'round') {
        // Produce — round fruit/veggie
        ctx.beginPath();
        ctx.arc(ix + iw / 2, ry + ih / 2, Math.min(iw, ih) * 0.45, 0, Math.PI * 2);
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.arc(ix + iw * 0.35, ry + ih * 0.35, Math.min(iw, ih) * 0.15, 0, Math.PI * 2);
        ctx.fill();
      } else if (itemShape === 'jar') {
        // Spice jar — short, wide with lid
        const lidH = ih * 0.15;
        ctx.fillStyle = '#444';
        ctx.fillRect(ix + 1, ry, iw - 2, lidH); // lid
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(ix, ry + lidH, iw, ih - lidH, 3); ctx.fill();
        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(ix + 2, ry + lidH + (ih - lidH) * 0.3, iw - 4, (ih - lidH) * 0.35);
      }
    }
  }

  // Category label at the bottom edge
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(ex, ey + ch - 16, cw, 16);
  ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#000'; ctx.fillText(label, ex + cw / 2 + 1, ey + ch - 4 + 1);
  ctx.fillStyle = '#fff'; ctx.fillText(label, ex + cw / 2, ey + ch - 4);
  ctx.textAlign = "left";

  // Shelf edge shadow (top)
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(ex, ey, cw, 2);
  // Shelf side edges
  ctx.fillStyle = shelfColor;
  ctx.fillRect(ex, ey, 3, ch);
  ctx.fillRect(ex + cw - 3, ey, 3, ch);
};

// Register all shelf renderers
for (const shelfType of Object.keys(SHELF_TYPES)) {
  ENTITY_RENDERERS[shelfType] = _shelfRenderer;
}

// ---- Generic ingredient entity renderer (ing_bread, ing_turkey, etc.) ----
const _ingredientRenderer = (e, ctx, ex, ey, w, h) => {
  const cw = (w || 2) * TILE, ch = (h || 2) * TILE;
  const ingId = typeof ENTITY_TO_INGREDIENT !== 'undefined' ? ENTITY_TO_INGREDIENT[e.type] : null;
  const ing = ingId && typeof DELI_INGREDIENTS !== 'undefined' ? DELI_INGREDIENTS[ingId] : null;
  const color = ing ? ing.color : '#888';
  const name = ing ? ing.name : e.type;

  // Counter / table surface
  ctx.fillStyle = '#5a4a38';
  ctx.fillRect(ex, ey, cw, ch);
  ctx.fillStyle = '#6a5a48';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
  // Light edge
  ctx.fillStyle = '#7a6a58';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, 3);

  // Ingredient item (centered blob)
  const itemW = cw * 0.6, itemH = ch * 0.45;
  const ix = ex + (cw - itemW) / 2, iy = ey + ch * 0.1;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 6); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 6); ctx.stroke();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(ix + 4, iy + 3, itemW - 8, itemH * 0.3);

  // Name label banner below
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(ex, ey + ch - 18, cw, 18);
  ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#000'; ctx.fillText(name, ex + cw / 2 + 1, ey + ch - 5 + 1);
  ctx.fillStyle = '#fff'; ctx.fillText(name, ex + cw / 2, ey + ch - 5);
  ctx.textAlign = "left";
};

// Register for all ingredient entity types from DELI_INGREDIENTS
if (typeof DELI_INGREDIENTS !== 'undefined') {
  for (const [id, data] of Object.entries(DELI_INGREDIENTS)) {
    ENTITY_RENDERERS[data.entity] = _ingredientRenderer;
  }
}

// === FISHING RENDERERS ===
ENTITY_RENDERERS.fishing_spot = (e, ctx, ex, ey, w, h) => {
  const dw = (w || 4) * TILE, dh = (h || 2) * TILE;
  const t = Date.now() / 1000;

  // Water underneath the dock
  const waterAlpha = 0.35 + Math.sin(t * 1.5) * 0.08;
  ctx.fillStyle = `rgba(30,80,140,${waterAlpha})`;
  ctx.fillRect(ex - 8, ey + dh * 0.3, dw + 16, dh * 0.9);
  // Water ripple highlights
  for (let r = 0; r < 5; r++) {
    const rx = ex + 10 + (r * 38 + Math.sin(t * 2 + r) * 8);
    const ry = ey + dh * 0.5 + Math.sin(t * 1.2 + r * 1.5) * 6;
    ctx.fillStyle = `rgba(80,160,220,${0.15 + Math.sin(t * 2.5 + r) * 0.05})`;
    ctx.beginPath(); ctx.ellipse(rx, ry, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Dock planks
  const plankH = dh / 3;
  for (let p = 0; p < 3; p++) {
    const py = ey + p * plankH;
    // Plank body
    ctx.fillStyle = p % 2 === 0 ? '#8a6a3a' : '#7a5a2a';
    ctx.fillRect(ex, py, dw, plankH - 2);
    // Plank edge highlight
    ctx.fillStyle = '#9a7a4a';
    ctx.fillRect(ex, py, dw, 2);
    // Plank dark edge
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(ex, py + plankH - 3, dw, 1);
    // Wood grain
    for (let g = 0; g < 4; g++) {
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(ex + 12 + g * (dw / 4), py + 4, dw / 6, 1);
    }
  }

  // Support posts (left and right)
  ctx.fillStyle = '#5a4020';
  ctx.fillRect(ex + 4, ey + dh - 4, 8, 12);
  ctx.fillRect(ex + dw - 12, ey + dh - 4, 8, 12);
  // Rope/railing
  ctx.strokeStyle = '#a08050';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ex + 8, ey - 2);
  ctx.lineTo(ex + dw - 8, ey - 2);
  ctx.stroke();

  // Context-aware fishing label when near
  if (typeof nearFishingSpot !== 'undefined' && nearFishingSpot && (!fishingState || !fishingState.active)) {
    const hasRod = typeof playerEquip !== 'undefined' && playerEquip.melee && playerEquip.melee.special === 'fishing';
    const labelText = hasRod ? 'Attack to Cast' : 'Equip a Rod';
    const labelColor = hasRod ? '#80c0ff' : '#ff8060';
    const pillW = hasRod ? 100 : 90;
    const labelX = ex + dw / 2;
    const labelY = ey + dh + 18;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.beginPath(); ctx.roundRect(labelX - pillW / 2, labelY - 12, pillW, 20, 6); ctx.fill();
    ctx.strokeStyle = hasRod ? '#4a8ac0' : '#8a4a30';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(labelX - pillW / 2, labelY - 12, pillW, 20, 6); ctx.stroke();
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = labelColor;
    ctx.fillText(labelText, labelX, labelY + 2);
    ctx.textAlign = 'left';
  }
};

ENTITY_RENDERERS.fish_vendor = (e, ctx, ex, ey, w, h) => {
  const cw = (w || 2) * TILE, ch = (h || 2) * TILE;
  const t = Date.now() / 1000;

  // Fish barrel/stand base
  ctx.fillStyle = '#6a5030';
  ctx.beginPath(); ctx.roundRect(ex + 4, ey + ch * 0.45, cw - 8, ch * 0.55, 4); ctx.fill();
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(ex + 4, ey + ch * 0.45, cw - 8, ch * 0.55, 4); ctx.stroke();
  // Barrel bands
  ctx.strokeStyle = '#8a7040';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ex + 6, ey + ch * 0.55); ctx.lineTo(ex + cw - 6, ey + ch * 0.55); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex + 6, ey + ch * 0.75); ctx.lineTo(ex + cw - 6, ey + ch * 0.75); ctx.stroke();
  // Fish inside barrel (little colored blobs)
  const fishColors = ['#8ab4c8', '#5a8a5a', '#d08060'];
  for (let f = 0; f < 3; f++) {
    ctx.fillStyle = fishColors[f];
    const fx = ex + 14 + f * 22, fy = ey + ch * 0.48;
    ctx.beginPath(); ctx.ellipse(fx, fy, 8, 4, 0.3 * f, 0, Math.PI * 2); ctx.fill();
  }

  // NPC body
  const bx = ex + cw / 2, by = ey + ch * 0.3;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath(); ctx.ellipse(bx, by + 18, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
  // Torso (blue overalls)
  ctx.fillStyle = '#3060a0';
  ctx.fillRect(bx - 10, by, 20, 20);
  // Head
  ctx.fillStyle = '#d4a070';
  ctx.beginPath(); ctx.arc(bx, by - 6, 10, 0, Math.PI * 2); ctx.fill();
  // Hat (fisherman cap)
  ctx.fillStyle = '#c0a040';
  ctx.fillRect(bx - 12, by - 15, 24, 6);
  ctx.fillRect(bx - 8, by - 18, 16, 6);
  // Eyes
  ctx.fillStyle = '#222';
  ctx.fillRect(bx - 4, by - 7, 3, 3);
  ctx.fillRect(bx + 2, by - 7, 3, 3);

  // Idle bob
  const bob = Math.sin(t * 1.5) * 1.5;

  // Name label
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000';
  ctx.fillText('Fish Vendor', bx + 1, ey - 4 + bob + 1);
  ctx.fillStyle = '#e0d080';
  ctx.fillText('Fish Vendor', bx, ey - 4 + bob);
  ctx.textAlign = 'left';
};

// ===================== GUNSMITH BUILDING (lobby) =====================
ENTITY_RENDERERS.building_gunsmith = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(ex + cw / 2 + 5, ey + ch + 6, cw * 0.42, 8, 0, 0, Math.PI * 2); ctx.fill();
    // Main building body (dark metallic)
    ctx.fillStyle = '#4a4a55';
    ctx.fillRect(ex + 4, ey + ch * 0.2, cw - 8, ch * 0.8);
    // Metal rivets pattern
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        ctx.fillStyle = '#6a6a75';
        ctx.beginPath(); ctx.arc(ex + 16 + c * cw * 0.18, ey + ch * 0.3 + r * ch * 0.15, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Foundation
    ctx.fillStyle = '#3a3a40'; ctx.fillRect(ex + 2, ey + ch * 0.88, cw - 4, ch * 0.12);
    // Roof (copper/bronze)
    ctx.fillStyle = '#8a6a40';
    ctx.beginPath(); ctx.moveTo(ex - 4, ey + ch * 0.2); ctx.lineTo(ex + cw / 2, ey - 10); ctx.lineTo(ex + cw + 4, ey + ch * 0.2); ctx.fill();
    ctx.strokeStyle = '#6a4a28'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex - 4, ey + ch * 0.2); ctx.lineTo(ex + cw / 2, ey - 10); ctx.lineTo(ex + cw + 4, ey + ch * 0.2); ctx.stroke();
    // Window (forge glow)
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(ex + cw * 0.1, ey + ch * 0.35, cw * 0.3, ch * 0.2);
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2;
    ctx.strokeRect(ex + cw * 0.1, ey + ch * 0.35, cw * 0.3, ch * 0.2);
    ctx.fillStyle = `rgba(255,140,40,${0.2 + Math.sin(t * 2) * 0.1})`;
    ctx.fillRect(ex + cw * 0.11, ey + ch * 0.36, cw * 0.28, ch * 0.18);
    // Window (right)
    ctx.fillStyle = '#1a1520';
    ctx.fillRect(ex + cw * 0.6, ey + ch * 0.35, cw * 0.3, ch * 0.2);
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2;
    ctx.strokeRect(ex + cw * 0.6, ey + ch * 0.35, cw * 0.3, ch * 0.2);
    ctx.fillStyle = `rgba(255,140,40,${0.2 + Math.sin(t * 2 + 1) * 0.1})`;
    ctx.fillRect(ex + cw * 0.61, ey + ch * 0.36, cw * 0.28, ch * 0.18);
    // Door
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(ex + cw * 0.38, ey + ch * 0.55, cw * 0.24, ch * 0.45);
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2;
    ctx.strokeRect(ex + cw * 0.38, ey + ch * 0.55, cw * 0.24, ch * 0.45);
    ctx.fillStyle = '#c0a040';
    ctx.beginPath(); ctx.arc(ex + cw * 0.55, ey + ch * 0.78, 3, 0, Math.PI * 2); ctx.fill();
    // Sign — "GUNSMITH"
    ctx.fillStyle = '#2a2020';
    ctx.fillRect(ex + cw * 0.2, ey + ch * 0.22, cw * 0.6, 16);
    ctx.strokeStyle = '#8a6a40'; ctx.lineWidth = 1;
    ctx.strokeRect(ex + cw * 0.2, ey + ch * 0.22, cw * 0.6, 16);
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ffa840';
    ctx.textAlign = 'center';
    ctx.fillText('GUNSMITH', ex + cw / 2, ey + ch * 0.22 + 12);
    ctx.textAlign = 'left';
    // Chimney with smoke
    ctx.fillStyle = '#5a5a60';
    ctx.fillRect(ex + cw * 0.75, ey - 6, 16, ch * 0.22);
    for (let s = 0; s < 3; s++) {
      const smokeY = ey - 12 - s * 12 - Math.sin(t * 0.8 + s) * 4;
      const smokeA = 0.15 - s * 0.04;
      ctx.fillStyle = `rgba(120,120,130,${smokeA})`;
      ctx.beginPath(); ctx.arc(ex + cw * 0.75 + 8 + Math.sin(t + s) * 3, smokeY, 6 + s * 2, 0, Math.PI * 2); ctx.fill();
    }
};

// ===================== GUNSMITH NPC (inside workshop) =====================
ENTITY_RENDERERS.gunsmith_npc = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const bx = ex + cw / 2, by = ey + ch / 2;
    const t = Date.now() / 1000;
    const bob = Math.sin(t * 1.2) * 1.5;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(bx, by + 30, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Body (blacksmith apron)
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(bx - 10, by - 8 + bob, 20, 28);
    // Apron
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(bx - 8, by + bob, 16, 18);
    // Head
    ctx.fillStyle = '#c8a888'; ctx.fillRect(bx - 7, by - 22 + bob, 14, 14);
    // Hair (dark)
    ctx.fillStyle = '#2a1a0a'; ctx.fillRect(bx - 8, by - 24 + bob, 16, 6);
    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(bx - 4, by - 17 + bob, 3, 3);
    ctx.fillRect(bx + 2, by - 17 + bob, 3, 3);
    // Beard
    ctx.fillStyle = '#4a3a28';
    ctx.fillRect(bx - 4, by - 12 + bob, 8, 5);
    // Hammer in hand
    ctx.fillStyle = '#6a6a70'; ctx.fillRect(bx + 10, by - 6 + bob, 4, 18);
    ctx.fillStyle = '#888'; ctx.fillRect(bx + 8, by - 8 + bob, 8, 6);
    // Name label
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText('Gunsmith', bx + 1, ey - 4 + bob + 1);
    ctx.fillStyle = '#ffa840';
    ctx.fillText('Gunsmith', bx, ey - 4 + bob);
    ctx.textAlign = 'left';
};

// ===================== WORKBENCH (gunsmith room) =====================
ENTITY_RENDERERS.workbench = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    // Table body
    ctx.fillStyle = '#5a4a30'; ctx.fillRect(ex + 4, ey + ch * 0.3, cw - 8, ch * 0.5);
    ctx.fillStyle = '#4a3a20'; ctx.fillRect(ex + 4, ey + ch * 0.7, cw - 8, ch * 0.2);
    // Table top
    ctx.fillStyle = '#6a5a40'; ctx.fillRect(ex + 2, ey + ch * 0.25, cw - 4, 6);
    // Tools on bench
    ctx.fillStyle = '#888'; ctx.fillRect(ex + 10, ey + ch * 0.3, 20, 4); // wrench
    ctx.fillStyle = '#666'; ctx.fillRect(ex + cw - 40, ey + ch * 0.3, 6, 16); // file
    // Legs
    ctx.fillStyle = '#3a2a18';
    ctx.fillRect(ex + 6, ey + ch * 0.8, 4, ch * 0.2);
    ctx.fillRect(ex + cw - 10, ey + ch * 0.8, 4, ch * 0.2);
};

// ===================== WEAPON RACK (gunsmith room) =====================
ENTITY_RENDERERS.weapon_rack = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    // Back panel
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
    ctx.strokeStyle = '#5a4a30'; ctx.lineWidth = 2;
    ctx.strokeRect(ex + 2, ey + 2, cw - 4, ch - 4);
    // Horizontal bars
    ctx.fillStyle = '#6a5a40';
    ctx.fillRect(ex + 6, ey + ch * 0.2, cw - 12, 4);
    ctx.fillRect(ex + 6, ey + ch * 0.5, cw - 12, 4);
    ctx.fillRect(ex + 6, ey + ch * 0.8, cw - 12, 4);
    // Gun silhouettes
    ctx.fillStyle = '#555';
    ctx.fillRect(ex + 10, ey + ch * 0.25, cw - 24, 6);
    ctx.fillRect(ex + 14, ey + ch * 0.55, cw - 28, 6);
    ctx.fillRect(ex + 10, ey + ch * 0.85, cw - 24, 5);
};

// ===================== ANVIL (gunsmith room) =====================
ENTITY_RENDERERS.anvil = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const cx = ex + cw / 2, cy = ey + ch / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx, cy + 20, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    // Base
    ctx.fillStyle = '#4a4a50'; ctx.fillRect(cx - 14, cy + 6, 28, 14);
    // Waist (narrow)
    ctx.fillStyle = '#5a5a60'; ctx.fillRect(cx - 8, cy - 2, 16, 10);
    // Top face (wide)
    ctx.fillStyle = '#6a6a72'; ctx.fillRect(cx - 18, cy - 10, 36, 10);
    // Horn
    ctx.fillStyle = '#5a5a60';
    ctx.beginPath(); ctx.moveTo(cx + 18, cy - 8); ctx.lineTo(cx + 30, cy - 4); ctx.lineTo(cx + 18, cy); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(cx - 16, cy - 9, 32, 3);
};

// ===================== CRATE (generic prop) =====================
ENTITY_RENDERERS.crate = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(ex + cw / 2, ey + ch, cw * 0.4, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Crate body
    ctx.fillStyle = '#6a5030';
    ctx.fillRect(ex + 4, ey + 6, cw - 8, ch - 8);
    // Lighter top face
    ctx.fillStyle = '#7a6040';
    ctx.fillRect(ex + 4, ey + 6, cw - 8, 8);
    // Plank lines
    ctx.strokeStyle = '#4a3820'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex + cw / 2, ey + 6); ctx.lineTo(ex + cw / 2, ey + ch - 2); ctx.stroke();
    // Metal bands
    ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex + 6, ey + ch * 0.4); ctx.lineTo(ex + cw - 6, ey + ch * 0.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + 6, ey + ch * 0.7); ctx.lineTo(ex + cw - 6, ey + ch * 0.7); ctx.stroke();
};

// ===================== BARREL (generic prop) =====================
ENTITY_RENDERERS.barrel = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const cx = ex + cw / 2, cy = ey + ch / 2;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(cx, ey + ch, cw * 0.35, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Barrel body (rounded)
    ctx.fillStyle = '#6a4a28';
    ctx.beginPath(); ctx.roundRect(ex + 6, ey + 4, cw - 12, ch - 6, 6); ctx.fill();
    // Barrel bulge (wider in middle)
    ctx.fillStyle = '#7a5a38';
    ctx.beginPath(); ctx.roundRect(ex + 4, ey + ch * 0.25, cw - 8, ch * 0.5, 8); ctx.fill();
    // Metal bands
    ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ex + 8, ey + ch * 0.2); ctx.lineTo(ex + cw - 8, ey + ch * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + 8, ey + ch * 0.8); ctx.lineTo(ex + cw - 8, ey + ch * 0.8); ctx.stroke();
    // Top ellipse
    ctx.fillStyle = '#5a3a18';
    ctx.beginPath(); ctx.ellipse(cx, ey + 6, cw * 0.35, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a7a60'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, ey + 6, cw * 0.35, 5, 0, 0, Math.PI * 2); ctx.stroke();
};

function drawLevelEntities(camX, camY) {
  for (const e of levelEntities) {
    const w = e.w ?? 1;
    const h = e.h ?? 1;
    const ex = e.tx * TILE - camX;
    const ey = e.ty * TILE - camY;
    const renderer = ENTITY_RENDERERS[e.type];
    if (renderer) renderer(e, ctx, ex, ey, w, h);
  }
}
