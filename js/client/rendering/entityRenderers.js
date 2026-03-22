// ===================== ENTITY RENDERERS =====================
// Client rendering: all entity visual renderers + dispatch
// Extracted from index_2.html â Phase C

// ---- ENTITY OVERLAY RENDERER ----
const _pathRenderer = (e, ctx, ex, ey, w, h) => {
    const ftn = levelEntities.find(en => en.type === 'fountain');
    const isVert = e.type === 'path_v';
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const ptx = e.tx + px, pty = e.ty + py;
        if (ftn && ptx >= ftn.tx && ptx < ftn.tx + (ftn.w||1) && pty >= ftn.ty && pty < ftn.ty + (ftn.h||1)) continue;
        const rx = ex + px * TILE, ry = ey + py * TILE;
        // Dark metallic walkway
        ctx.fillStyle = '#1a1a28';
        ctx.fillRect(rx, ry, TILE, TILE);
        ctx.fillStyle = '#20202e';
        ctx.fillRect(rx + 1, ry + 1, TILE - 2, TILE - 2);
        // Neon edge strips
        if (isVert) {
          if (px === 0) { ctx.fillStyle = 'rgba(0,204,255,0.15)'; ctx.fillRect(rx, ry, 2, TILE); }
          if (px === w - 1) { ctx.fillStyle = 'rgba(0,204,255,0.15)'; ctx.fillRect(rx + TILE - 2, ry, 2, TILE); }
        } else {
          if (py === 0) { ctx.fillStyle = 'rgba(0,204,255,0.15)'; ctx.fillRect(rx, ry, TILE, 2); }
          if (py === h - 1) { ctx.fillStyle = 'rgba(0,204,255,0.15)'; ctx.fillRect(rx, ry + TILE - 2, TILE, 2); }
        }
        // Center line dashes
        if (isVert && px === Math.floor(w/2) && (pty % 3 === 0)) {
          ctx.fillStyle = 'rgba(0,204,255,0.08)';
          ctx.fillRect(rx + TILE/2 - 1, ry + 4, 2, TILE - 8);
        }
        if (!isVert && py === Math.floor(h/2) && (ptx % 3 === 0)) {
          ctx.fillStyle = 'rgba(0,204,255,0.08)';
          ctx.fillRect(rx + 4, ry + TILE/2 - 1, TILE - 8, 2);
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
      // Platform shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(fcx + 3, fcy + 5, R + 12, R * 0.65 + 12, 0, 0, Math.PI * 2); ctx.fill();
      // Dark metal platform ring
      ctx.fillStyle = '#0e0e1a';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R + 10, R * 0.62 + 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#181828';
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R + 6, R * 0.62 + 6, 0, 0, Math.PI * 2); ctx.fill();
      // Neon ring edge
      ctx.strokeStyle = `rgba(0,204,255,${0.4 + Math.sin(t * 1.5) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R + 7, R * 0.62 + 7, 0, 0, Math.PI * 2); ctx.stroke();
      // Energy pool (dark with glow)
      const poolGrd = ctx.createRadialGradient(fcx, fcy, 10, fcx, fcy, R);
      poolGrd.addColorStop(0, 'rgba(0,204,255,0.15)');
      poolGrd.addColorStop(0.5, 'rgba(0,80,120,0.1)');
      poolGrd.addColorStop(1, '#0a0a18');
      ctx.fillStyle = poolGrd;
      ctx.beginPath(); ctx.ellipse(fcx, fcy, R - 2, R * 0.6 - 2, 0, 0, Math.PI * 2); ctx.fill();
      // Concentric pulsing rings
      for (let wr = 0; wr < 5; wr++) {
        const rr = 20 + wr * 30 + Math.sin(t * 1.5 + wr * 1.8) * 8;
        const alpha = 0.18 - wr * 0.03;
        ctx.strokeStyle = `rgba(0,204,255,${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(fcx, fcy, rr, rr * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Magenta inner ring
      for (let wr2 = 0; wr2 < 3; wr2++) {
        const rr2 = 15 + wr2 * 20 + Math.sin(t * 2 + wr2 * 2.5) * 6;
        ctx.strokeStyle = `rgba(255,0,170,${0.1 - wr2 * 0.025})`;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(fcx, fcy, rr2, rr2 * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
      }
      // Central pillar (dark metal)
      ctx.fillStyle = '#10101e';
      ctx.fillRect(fcx - 14, fcy - 55, 28, 70);
      ctx.fillStyle = '#181830';
      ctx.fillRect(fcx - 12, fcy - 53, 24, 66);
      // Neon strips on pillar
      ctx.fillStyle = `rgba(0,204,255,${0.3 + Math.sin(t * 2) * 0.1})`;
      ctx.fillRect(fcx - 13, fcy - 50, 2, 60);
      ctx.fillRect(fcx + 11, fcy - 50, 2, 60);
      // Holographic projection on top
      const holoH = 25 + Math.sin(t * 2.5) * 8;
      const holoGlow = 0.6 + Math.sin(t * 3) * 0.2;
      // Energy beam
      const beamGrd = ctx.createLinearGradient(fcx, fcy - 55 - holoH, fcx, fcy - 55);
      beamGrd.addColorStop(0, `rgba(0,204,255,${holoGlow * 0.9})`);
      beamGrd.addColorStop(1, 'rgba(0,204,255,0.1)');
      ctx.fillStyle = beamGrd;
      ctx.beginPath(); ctx.moveTo(fcx - 8, fcy - 55); ctx.lineTo(fcx, fcy - 55 - holoH); ctx.lineTo(fcx + 8, fcy - 55); ctx.fill();
      // Holographic diamond shape
      const dY = fcy - 55 - holoH - 10;
      ctx.fillStyle = `rgba(0,204,255,${holoGlow * 0.5})`;
      ctx.beginPath(); ctx.moveTo(fcx, dY - 16); ctx.lineTo(fcx + 12, dY); ctx.lineTo(fcx, dY + 16); ctx.lineTo(fcx - 12, dY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = `rgba(0,204,255,${holoGlow * 0.8})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(fcx, dY - 16); ctx.lineTo(fcx + 12, dY); ctx.lineTo(fcx, dY + 16); ctx.lineTo(fcx - 12, dY); ctx.closePath(); ctx.stroke();
      // Orbiting particles
      for (let p = 0; p < 8; p++) {
        const pa = p * Math.PI / 4 + t * 1.5;
        const pr = 50 + Math.sin(t * 2 + p) * 15;
        const px2 = fcx + Math.cos(pa) * pr;
        const py2 = fcy + Math.sin(pa) * pr * 0.55;
        const ps = 2 + Math.sin(t * 4 + p * 3) * 1;
        ctx.fillStyle = `rgba(0,204,255,${0.35 + Math.sin(t * 5 + p) * 0.15})`;
        ctx.beginPath(); ctx.arc(px2, py2, ps, 0, Math.PI * 2); ctx.fill();
      }
      // Floating data motes
      for (let sp = 0; sp < 10; sp++) {
        const sa = sp * Math.PI / 5 + t * 0.6;
        const sr = 60 + sp * 15;
        const sx = fcx + Math.cos(sa) * sr;
        const sy = fcy + Math.sin(sa) * sr * 0.55;
        const sparkle = Math.sin(t * 4 + sp * 2);
        if (sparkle > 0.3) {
          const sc = sp % 2 === 0 ? `rgba(0,204,255,${(sparkle - 0.3) * 0.5})` : `rgba(255,0,170,${(sparkle - 0.3) * 0.3})`;
          ctx.fillStyle = sc;
          ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fill();
        }
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
      // Neon crystal formation (3 variants)
      const tcx2 = ex + TILE/2, tcy2 = ey + TILE/2;
      const v = e.variant || 0;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(tcx2 + 2, tcy2 + 26, 30, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (v === 0) {
        // Tall crystal spire cluster
        const cCol = `rgba(0,204,255,${0.6 + Math.sin(t * 1.5) * 0.15})`;
        // Base pedestal
        ctx.fillStyle = '#10101e';
        ctx.fillRect(tcx2 - 14, tcy2 + 12, 28, 14);
        // Main spire
        ctx.fillStyle = '#0a1828';
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 50); ctx.lineTo(tcx2 - 10, tcy2 + 12); ctx.lineTo(tcx2 + 10, tcy2 + 12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#0e2238';
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 50); ctx.lineTo(tcx2 + 10, tcy2 + 12); ctx.lineTo(tcx2 + 3, tcy2 + 12); ctx.closePath(); ctx.fill();
        // Left smaller crystal
        ctx.fillStyle = '#0a1828';
        ctx.beginPath(); ctx.moveTo(tcx2 - 18, tcy2 - 20); ctx.lineTo(tcx2 - 24, tcy2 + 12); ctx.lineTo(tcx2 - 12, tcy2 + 12); ctx.closePath(); ctx.fill();
        // Right smaller crystal
        ctx.fillStyle = '#0e2238';
        ctx.beginPath(); ctx.moveTo(tcx2 + 16, tcy2 - 28); ctx.lineTo(tcx2 + 10, tcy2 + 12); ctx.lineTo(tcx2 + 22, tcy2 + 12); ctx.closePath(); ctx.fill();
        // Neon edges
        ctx.strokeStyle = cCol; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 50); ctx.lineTo(tcx2 - 10, tcy2 + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 50); ctx.lineTo(tcx2 + 10, tcy2 + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2 - 18, tcy2 - 20); ctx.lineTo(tcx2 - 24, tcy2 + 12); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2 + 16, tcy2 - 28); ctx.lineTo(tcx2 + 22, tcy2 + 12); ctx.stroke();
        // Tip glow
        ctx.fillStyle = `rgba(0,204,255,${0.5 + Math.sin(t * 3) * 0.2})`;
        ctx.beginPath(); ctx.arc(tcx2, tcy2 - 50, 4, 0, Math.PI * 2); ctx.fill();
      } else if (v === 1) {
        // Medium crystal cluster (purple)
        const cCol2 = `rgba(170,68,255,${0.6 + Math.sin(t * 1.8 + 1) * 0.15})`;
        ctx.fillStyle = '#10101e';
        ctx.fillRect(tcx2 - 12, tcy2 + 10, 24, 12);
        // Center shard
        ctx.fillStyle = '#18102a';
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 36); ctx.lineTo(tcx2 - 8, tcy2 + 10); ctx.lineTo(tcx2 + 8, tcy2 + 10); ctx.closePath(); ctx.fill();
        // Side shards
        ctx.fillStyle = '#1a1230';
        ctx.beginPath(); ctx.moveTo(tcx2 - 14, tcy2 - 14); ctx.lineTo(tcx2 - 18, tcy2 + 10); ctx.lineTo(tcx2 - 10, tcy2 + 10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(tcx2 + 12, tcy2 - 18); ctx.lineTo(tcx2 + 8, tcy2 + 10); ctx.lineTo(tcx2 + 16, tcy2 + 10); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = cCol2; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 36); ctx.lineTo(tcx2 - 8, tcy2 + 10); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tcx2, tcy2 - 36); ctx.lineTo(tcx2 + 8, tcy2 + 10); ctx.stroke();
        ctx.fillStyle = `rgba(170,68,255,${0.5 + Math.sin(t * 3.5 + 1) * 0.2})`;
        ctx.beginPath(); ctx.arc(tcx2, tcy2 - 36, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        // Arc crystal (magenta)
        const cCol3 = `rgba(255,0,170,${0.5 + Math.sin(t * 2 + 2) * 0.15})`;
        ctx.fillStyle = '#10101e';
        ctx.fillRect(tcx2 - 10, tcy2 + 8, 20, 10);
        ctx.fillStyle = '#1a0a1e';
        ctx.beginPath(); ctx.moveTo(tcx2 - 6, tcy2 + 8); ctx.quadraticCurveTo(tcx2 - 20, tcy2 - 24, tcx2, tcy2 - 30);
        ctx.quadraticCurveTo(tcx2 + 20, tcy2 - 24, tcx2 + 6, tcy2 + 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = cCol3; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(tcx2 - 6, tcy2 + 8); ctx.quadraticCurveTo(tcx2 - 20, tcy2 - 24, tcx2, tcy2 - 30);
        ctx.quadraticCurveTo(tcx2 + 20, tcy2 - 24, tcx2 + 6, tcy2 + 8); ctx.stroke();
        ctx.fillStyle = `rgba(255,0,170,${0.5 + Math.sin(t * 4 + 2) * 0.2})`;
        ctx.beginPath(); ctx.arc(tcx2, tcy2 - 30, 3, 0, Math.PI * 2); ctx.fill();
      }
  },
  flower: (e, ctx, ex, ey, w, h) => {
      // Bioluminescent light dots
      const t = Date.now() / 1000;
      const neonCols = ['rgba(0,204,255,0.7)', 'rgba(255,0,170,0.7)', 'rgba(0,255,136,0.7)', 'rgba(255,136,0,0.7)'];
      for (let f = 0; f < 4; f++) {
        const fx2 = ex + 8 + (f % 2) * 22 + Math.sin(f * 2) * 4;
        const fy2 = ey + 10 + Math.floor(f / 2) * 18;
        const pulse = 0.5 + Math.sin(t * 3 + f * 1.5 + e.tx) * 0.3;
        const col = neonCols[(e.tx + f) % 4];
        // Glow halo
        ctx.fillStyle = col.replace('0.7', String(pulse * 0.15));
        ctx.beginPath(); ctx.arc(fx2, fy2, 10, 0, Math.PI * 2); ctx.fill();
        // Core dot
        ctx.fillStyle = col.replace('0.7', String(pulse));
        ctx.beginPath(); ctx.arc(fx2, fy2, 3, 0, Math.PI * 2); ctx.fill();
        // Bright center
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(fx2, fy2, 1, 0, Math.PI * 2); ctx.fill();
      }
  },
  lamp: (e, ctx, ex, ey, w, h) => {
      // Neon light post
      const lx = ex + TILE/2, ly = ey;
      const t = Date.now() / 1000;
      const glow = 0.25 + Math.sin(t * 2 + e.tx) * 0.08;
      // Dark metal pole
      ctx.fillStyle = '#1a1a28';
      ctx.fillRect(lx - 3, ly + 14, 6, TILE - 14);
      // Pole accent line
      ctx.fillStyle = 'rgba(0,204,255,0.2)';
      ctx.fillRect(lx - 1, ly + 16, 2, TILE - 18);
      // Head housing
      ctx.fillStyle = '#141420';
      ctx.fillRect(lx - 10, ly + 6, 20, 10);
      ctx.strokeStyle = 'rgba(0,204,255,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 10, ly + 6, 20, 10);
      // Cyan orb on top
      const orbGrd = ctx.createRadialGradient(lx, ly + 10, 2, lx, ly + 10, 50);
      orbGrd.addColorStop(0, `rgba(0,204,255,${glow})`);
      orbGrd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = orbGrd;
      ctx.fillRect(lx - 50, ly - 40, 100, 100);
      // Bright core
      ctx.fillStyle = `rgba(0,204,255,${0.7 + Math.sin(t * 3 + e.tx) * 0.2})`;
      ctx.beginPath(); ctx.arc(lx, ly + 11, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(180,240,255,0.8)';
      ctx.beginPath(); ctx.arc(lx, ly + 11, 2, 0, Math.PI * 2); ctx.fill();
  },
  bench: (e, ctx, ex, ey, w, h) => {
      // Sleek metal bench with neon accent
      const bw2 = TILE * 2, bh2 = TILE * 0.5;
      const bx2 = ex - TILE * 0.5, by2 = ey + TILE * 0.25;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(bx2 + bw2/2, by2 + bh2 + 6, bw2/2 + 2, 5, 0, 0, Math.PI * 2); ctx.fill();
      // Metal legs
      ctx.fillStyle = '#1a1a28';
      ctx.fillRect(bx2 + 8, by2 + bh2, 4, 10);
      ctx.fillRect(bx2 + bw2 - 12, by2 + bh2, 4, 10);
      ctx.fillRect(bx2 + bw2/2 - 2, by2 + bh2, 4, 10);
      // Seat surface
      ctx.fillStyle = '#141420';
      ctx.fillRect(bx2 + 2, by2, bw2 - 4, bh2);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(bx2 + 3, by2 + 1, bw2 - 6, bh2 - 2);
      // Neon stripe accent
      ctx.fillStyle = 'rgba(0,204,255,0.3)';
      ctx.fillRect(bx2 + 4, by2 + bh2 - 3, bw2 - 8, 2);
      // Side armrests
      ctx.fillStyle = '#1a1a28';
      ctx.fillRect(bx2, by2 - 8, 5, bh2 + 8);
      ctx.fillRect(bx2 + bw2 - 5, by2 - 8, 5, bh2 + 8);
  },
  table: (e, ctx, ex, ey, w, h) => {
      // Metal/glass table with neon edge
      const tw2 = w * TILE, th2 = h * TILE;
      const tcx3 = ex + tw2/2, tcy3 = ey + th2/2;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(tcx3, tcy3 + 4, tw2/2 + 4, th2/2 + 4, 0, 0, Math.PI * 2); ctx.fill();
      // Metal legs
      ctx.fillStyle = '#1a1a28';
      ctx.fillRect(ex + 16, ey + 16, 5, th2 - 32);
      ctx.fillRect(ex + tw2 - 21, ey + 16, 5, th2 - 32);
      ctx.fillRect(ex + 16, ey + 16, tw2 - 32, 5);
      ctx.fillRect(ex + 16, ey + th2 - 21, tw2 - 32, 5);
      // Glass surface
      ctx.fillStyle = '#101020';
      ctx.fillRect(ex + 12, ey + 12, tw2 - 24, th2 - 24);
      ctx.fillStyle = 'rgba(0,204,255,0.04)';
      ctx.fillRect(ex + 14, ey + 14, tw2 - 28, th2 - 28);
      // Neon edge outline
      ctx.strokeStyle = 'rgba(0,204,255,0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ex + 12, ey + 12, tw2 - 24, th2 - 24);
      // Center hologram dot
      ctx.fillStyle = 'rgba(0,204,255,0.3)';
      ctx.beginPath(); ctx.arc(tcx3, tcy3, 5, 0, Math.PI * 2); ctx.fill();
      // Metal chairs (dark, minimal)
      const chairPos = [[tcx3, ey - 8], [tcx3, ey + th2 + 4], [ex - 8, tcy3], [ex + tw2 + 4, tcy3]];
      for (const [cx2, cy2] of chairPos) {
        ctx.fillStyle = '#141420';
        ctx.fillRect(cx2 - 9, cy2 - 9, 18, 18);
        ctx.strokeStyle = 'rgba(0,204,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx2 - 9, cy2 - 9, 18, 18);
      }
  },
  bush: (e, ctx, ex, ey, w, h) => {
      // Neon energy node
      const bx3 = ex + TILE/2, by3 = ey + TILE/2;
      const t = Date.now() / 1000;
      const pulse = 0.4 + Math.sin(t * 2.5 + e.tx * 3) * 0.2;
      // Outer glow
      ctx.fillStyle = `rgba(0,204,255,${pulse * 0.12})`;
      ctx.beginPath(); ctx.arc(bx3, by3, 20, 0, Math.PI * 2); ctx.fill();
      // Dark core
      ctx.fillStyle = '#0a0a18';
      ctx.beginPath(); ctx.arc(bx3, by3, 12, 0, Math.PI * 2); ctx.fill();
      // Neon ring
      ctx.strokeStyle = `rgba(0,204,255,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx3, by3, 12, 0, Math.PI * 2); ctx.stroke();
      // Inner bright point
      ctx.fillStyle = `rgba(0,204,255,${pulse * 1.5})`;
      ctx.beginPath(); ctx.arc(bx3, by3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(180,240,255,0.7)';
      ctx.beginPath(); ctx.arc(bx3, by3, 2, 0, Math.PI * 2); ctx.fill();
  },
  tower_exterior: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+10, ey+ch+10, cw*0.46, 14, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — tall dark tower
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+cw*0.12, ey+ch*0.15, cw*0.76, ch*0.85);
      // Steel panel lines (more rows for tall tower)
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 8; r++) {
        const ly = ey+ch*0.2+r*ch*0.1;
        ctx.beginPath(); ctx.moveTo(ex+cw*0.14, ly); ctx.lineTo(ex+cw*0.86, ly); ctx.stroke();
      }
      // Vertical panel dividers
      ctx.strokeStyle = '#222238';
      for (let c = 0; c < 3; c++) {
        const lx = ex+cw*0.3+c*cw*0.15;
        ctx.beginPath(); ctx.moveTo(lx, ey+ch*0.2); ctx.lineTo(lx, ey+ch*0.95); ctx.stroke();
      }
      // Roof — angular cyberpunk with dual peaks
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.08, ey+ch*0.17);
      ctx.lineTo(ex+cw*0.25, ey+ch*0.02);
      ctx.lineTo(ex+cw*0.5, ey+ch*0.08);
      ctx.lineTo(ex+cw*0.75, ey+ch*0.02);
      ctx.lineTo(ex+cw*0.92, ey+ch*0.17);
      ctx.closePath(); ctx.fill();
      // Neon cyan trim on roof
      ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.08, ey+ch*0.17);
      ctx.lineTo(ex+cw*0.25, ey+ch*0.02);
      ctx.lineTo(ex+cw*0.5, ey+ch*0.08);
      ctx.lineTo(ex+cw*0.75, ey+ch*0.02);
      ctx.lineTo(ex+cw*0.92, ey+ch*0.17);
      ctx.stroke();
      // Magenta trim on base
      ctx.strokeStyle = '#ff00aa'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+cw*0.12, ey+ch); ctx.lineTo(ex+cw*0.88, ey+ch); ctx.stroke();
      // Antenna spire
      ctx.strokeStyle = '#444460'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+cw*0.5, ey+ch*0.02); ctx.lineTo(ex+cw*0.5, ey-ch*0.12); ctx.stroke();
      // Antenna blink
      ctx.fillStyle = `rgba(0,204,255,${0.5+Math.sin(t*4)*0.5})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey-ch*0.12, 3, 0, Math.PI*2); ctx.fill();
      // Window grid (3 columns x 4 rows for tall tower)
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wr = 0; wr < 4; wr++) {
        for (let wc = 0; wc < 3; wc++) {
          const wx = ex + cw*0.18 + wc*cw*0.22;
          const wy = ey + ch*0.22 + wr*ch*0.16;
          ctx.fillStyle = '#0a0a18';
          ctx.fillRect(wx, wy, cw*0.14, ch*0.1);
          // Alternate cyan/magenta glow per row
          const isEven = (wr + wc) % 2 === 0;
          const nr = isEven ? 0 : 255, ng = isEven ? 204 : 0, nb = isEven ? 255 : 170;
          ctx.fillStyle = `rgba(${nr},${ng},${nb},${glow * 0.25})`;
          ctx.fillRect(wx+1, wy+1, cw*0.14-2, ch*0.1-2);
          ctx.strokeStyle = `rgba(${nr},${ng},${nb},${glow * 0.6})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, cw*0.14, ch*0.1);
        }
      }
      // Door — large entry
      const doorW = 3 * TILE, doorH = ch * 0.18;
      const doorX = ex + (cw - doorW) / 2, doorY = ey + ch - doorH;
      ctx.fillStyle = '#08081a';
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.strokeStyle = `rgba(0,204,255,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(doorX, doorY, doorW, doorH);
      // Holographic crest above door
      ctx.fillStyle = `rgba(255,0,170,${0.3+Math.sin(t*1.8)*0.15})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, doorY-14, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(0,204,255,${0.5+Math.sin(t*2.2)*0.2})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, doorY-14, 5, 0, Math.PI*2); ctx.fill();
      // Neon side strips — dual color
      ctx.fillStyle = `rgba(0,204,255,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+cw*0.12, ey+ch*0.18, 3, ch*0.8);
      ctx.fillStyle = `rgba(255,0,170,${0.15 + Math.sin(t*1.4)*0.08})`;
      ctx.fillRect(ex+cw*0.88-3, ey+ch*0.18, 3, ch*0.8);
      // Neon sign text
      ctx.font = "bold 11px monospace";
      ctx.fillStyle = `rgba(0,204,255,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("TOWER", ex+cw/2, ey+ch*0.12);
      // Label below
      ctx.font = "bold 13px monospace"; ctx.fillStyle = '#00ccff'; ctx.textAlign = "center";
      ctx.fillText("TOWER", ex + cw / 2, ey + ch + 16);
      ctx.textAlign = "left";
  },
  cave_entrance: (e, ctx, ex, ey, w, h) => {
      const ew = (w||4) * TILE, eh = (h||2) * TILE;
      const t = Date.now() / 1000;
      const glow = 0.4 + Math.sin(t * 2) * 0.15;
      ctx.fillStyle = `rgba(0,204,255,${glow * 0.12})`;
      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeStyle = `rgba(0,204,255,${glow * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
      // Chevron arrows
      const cx = ex + ew/2, cy = ey + eh/2;
      for (let i = 0; i < 3; i++) {
        const a = glow * 0.5 - i * 0.12;
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(0,204,255,${a})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 4 - i * 8); ctx.lineTo(cx, cy - 4 - i * 8); ctx.lineTo(cx + 8, cy + 4 - i * 8);
        ctx.stroke();
      }
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(0,204,255,${glow * 0.8})`;
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 12);
      ctx.textAlign = "left";
  },
  building_shop: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+5, ey+ch+6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — dark storefront
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Roof — flat awning style
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(ex-6, ey+ch*0.18, cw+12, ch*0.08);
      // Neon cyan trim on awning edge
      ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex-6, ey+ch*0.26); ctx.lineTo(ex+cw+6, ey+ch*0.26); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex-6, ey+ch*0.18); ctx.lineTo(ex+cw+6, ey+ch*0.18); ctx.stroke();
      // Display windows with cyan glow (two large panes)
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wc = 0; wc < 2; wc++) {
        const wx = ex + cw*0.08 + wc*cw*0.46;
        const wy = ey + ch*0.32;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(wx, wy, cw*0.38, ch*0.28);
        ctx.fillStyle = `rgba(0,204,255,${glow * 0.2})`;
        ctx.fillRect(wx+2, wy+2, cw*0.38-4, ch*0.28-4);
        ctx.strokeStyle = `rgba(0,204,255,${glow * 0.6})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, cw*0.38, ch*0.28);
        // Display items silhouette
        ctx.fillStyle = `rgba(0,204,255,${glow * 0.1})`;
        ctx.fillRect(wx+cw*0.06, wy+ch*0.12, cw*0.1, ch*0.12);
        ctx.fillRect(wx+cw*0.2, wy+ch*0.08, cw*0.08, ch*0.16);
      }
      // Door
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.38, ey+ch*0.68, cw*0.24, ch*0.32);
      ctx.strokeStyle = `rgba(0,204,255,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.38, ey+ch*0.68, cw*0.24, ch*0.32);
      // Neon side strips
      ctx.fillStyle = `rgba(0,204,255,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Neon "SHOP" sign
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(0,204,255,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("SHOP", ex+cw/2, ey+ch*0.14);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#00ccff'; ctx.textAlign = "center";
      ctx.fillText("Shop", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  building_house: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+4, ey+ch+5, cw*0.4, 7, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — residential pod
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+4, ey+ch*0.3, cw-8, ch*0.7);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 4; r++) {
        const ly = ey+ch*0.38+r*ch*0.15;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Roof — slanted cyberpunk
      ctx.fillStyle = '#181828';
      ctx.beginPath();
      ctx.moveTo(ex-4, ey+ch*0.32);
      ctx.lineTo(ex+cw*0.4, ey+ch*0.08);
      ctx.lineTo(ex+cw+4, ey+ch*0.2);
      ctx.lineTo(ex+cw+4, ey+ch*0.32);
      ctx.closePath(); ctx.fill();
      // Neon green trim on roof
      ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex-4, ey+ch*0.32);
      ctx.lineTo(ex+cw*0.4, ey+ch*0.08);
      ctx.lineTo(ex+cw+4, ey+ch*0.2);
      ctx.stroke();
      // Single glowing window
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      const wx = ex + cw*0.12, wy = ey + ch*0.42;
      ctx.fillStyle = '#0a0a18';
      ctx.fillRect(wx, wy, cw*0.32, ch*0.2);
      ctx.fillStyle = `rgba(0,255,136,${glow * 0.2})`;
      ctx.fillRect(wx+2, wy+2, cw*0.32-4, ch*0.2-4);
      ctx.strokeStyle = `rgba(0,255,136,${glow * 0.6})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(wx, wy, cw*0.32, ch*0.2);
      // Window divider
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(wx+cw*0.16, wy); ctx.lineTo(wx+cw*0.16, wy+ch*0.2); ctx.stroke();
      // Door — right side
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.58, ey+ch*0.5, cw*0.28, ch*0.5);
      ctx.strokeStyle = `rgba(0,255,136,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.58, ey+ch*0.5, cw*0.28, ch*0.5);
      // Neon side strips
      ctx.fillStyle = `rgba(0,255,136,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.32, 3, ch*0.65);
      ctx.fillRect(ex+cw-7, ey+ch*0.32, 3, ch*0.65);
      // Neon "HOUSE" sign
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(0,255,136,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("HOUSE", ex+cw/2, ey+ch*0.2);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#00ff88'; ctx.textAlign = "center";
      ctx.fillText("House", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  building_tavern: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.45, 9, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — neon bar/lounge
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Roof — angular with dormer
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Dormer bump
      ctx.fillStyle = '#181828';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.35, ey+ch*0.14); ctx.lineTo(ex+cw*0.45, ey+ch*0.02);
      ctx.lineTo(ex+cw*0.55, ey+ch*0.02); ctx.lineTo(ex+cw*0.65, ey+ch*0.14);
      ctx.closePath(); ctx.fill();
      // Neon purple trim on roof
      ctx.strokeStyle = '#aa44ff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
      ctx.stroke();
      // Multiple windows — different colored glows (bar vibe)
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      const winColors = [[170,68,255],[200,80,255],[140,50,220]]; // purple hues
      for (let wr = 0; wr < 2; wr++) {
        for (let wc = 0; wc < 3; wc++) {
          const wx = ex + cw*0.08 + wc*cw*0.3;
          const wy = ey + ch*0.32 + wr*ch*0.22;
          const clr = winColors[(wr+wc)%3];
          ctx.fillStyle = '#0a0a18';
          ctx.fillRect(wx, wy, cw*0.22, ch*0.14);
          ctx.fillStyle = `rgba(${clr[0]},${clr[1]},${clr[2]},${glow * 0.25})`;
          ctx.fillRect(wx+1, wy+1, cw*0.22-2, ch*0.14-2);
          ctx.strokeStyle = `rgba(${clr[0]},${clr[1]},${clr[2]},${glow * 0.6})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, cw*0.22, ch*0.14);
        }
      }
      // Double doors
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.3, ey+ch*0.78, cw*0.18, ch*0.22);
      ctx.fillRect(ex+cw*0.5, ey+ch*0.78, cw*0.18, ch*0.22);
      ctx.strokeStyle = `rgba(170,68,255,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.3, ey+ch*0.78, cw*0.36, ch*0.22);
      ctx.beginPath(); ctx.moveTo(ex+cw*0.48, ey+ch*0.78); ctx.lineTo(ex+cw*0.48, ey+ch); ctx.stroke();
      // Neon side strips
      ctx.fillStyle = `rgba(170,68,255,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Neon "TAVERN" sign
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(170,68,255,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("TAVERN", ex+cw/2, ey+ch*0.16);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#aa44ff'; ctx.textAlign = "center";
      ctx.fillText("Tavern", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  building_mine: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+5, ey+ch+6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — industrial facility
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Heavy steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1.5;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Diagonal hazard stripes on base
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2;
      for (let s = 0; s < 6; s++) {
        const sx = ex+8+s*cw*0.16;
        ctx.beginPath(); ctx.moveTo(sx, ey+ch*0.92); ctx.lineTo(sx+cw*0.08, ey+ch); ctx.stroke();
      }
      // Roof — flat industrial with vents
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(ex-4, ey+ch*0.18, cw+8, ch*0.08);
      // Vent boxes on roof
      ctx.fillStyle = '#181828';
      ctx.fillRect(ex+cw*0.15, ey+ch*0.1, cw*0.15, ch*0.1);
      ctx.fillRect(ex+cw*0.65, ey+ch*0.1, cw*0.15, ch*0.1);
      // Neon orange trim on roof
      ctx.strokeStyle = '#ff8800'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.18); ctx.lineTo(ex+cw+4, ey+ch*0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.26); ctx.lineTo(ex+cw+4, ey+ch*0.26); ctx.stroke();
      // Warning light — pulsing orange beacon
      const beacon = 0.4 + Math.sin(t*3)*0.4;
      ctx.fillStyle = `rgba(255,136,0,${beacon})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.06, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(255,136,0,${beacon*0.3})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.06, 10, 0, Math.PI*2); ctx.fill();
      // Windows — reinforced industrial (2 wide)
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wc = 0; wc < 2; wc++) {
        const wx = ex + cw*0.08 + wc*cw*0.48;
        const wy = ey + ch*0.36;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(wx, wy, cw*0.36, ch*0.18);
        ctx.fillStyle = `rgba(255,136,0,${glow * 0.2})`;
        ctx.fillRect(wx+2, wy+2, cw*0.36-4, ch*0.18-4);
        ctx.strokeStyle = `rgba(255,136,0,${glow * 0.6})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, cw*0.36, ch*0.18);
        // Crossbar reinforcement
        ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(wx, wy+ch*0.09); ctx.lineTo(wx+cw*0.36, wy+ch*0.09); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx+cw*0.18, wy); ctx.lineTo(wx+cw*0.18, wy+ch*0.18); ctx.stroke();
      }
      // Door — heavy industrial
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.32, ey+ch*0.62, cw*0.36, ch*0.38);
      ctx.strokeStyle = `rgba(255,136,0,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.32, ey+ch*0.62, cw*0.36, ch*0.38);
      // Rivets on door
      ctx.fillStyle = '#3a3a4a';
      for (let rv = 0; rv < 4; rv++) {
        ctx.beginPath(); ctx.arc(ex+cw*0.36+rv*cw*0.08, ey+ch*0.65, 2, 0, Math.PI*2); ctx.fill();
      }
      // Neon side strips
      ctx.fillStyle = `rgba(255,136,0,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Neon "MINE" sign
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(255,136,0,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("MINE", ex+cw/2, ey+ch*0.14);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ff8800'; ctx.textAlign = "center";
      ctx.fillText("Mine", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },
  mine_entrance: (e, ctx, ex, ey, w, h) => {
      const ew = w * TILE, eh = h * TILE;
      const t = Date.now() / 1000;
      const glow = 0.4 + Math.sin(t * 2) * 0.15;
      ctx.fillStyle = `rgba(255,136,0,${glow * 0.12})`;
      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeStyle = `rgba(255,136,0,${glow * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(255,136,0,${glow * 0.8})`;
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 12);
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
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+4, ey+ch+5, cw*0.38, 7, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — data temple
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+cw*0.1, ey+ch*0.3, cw*0.8, ch*0.7);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 4; r++) {
        const ly = ey+ch*0.38+r*ch*0.15;
        ctx.beginPath(); ctx.moveTo(ex+cw*0.12, ly); ctx.lineTo(ex+cw*0.88, ly); ctx.stroke();
      }
      // Central tower/steeple — tall angular
      ctx.fillStyle = '#181828';
      ctx.fillRect(ex+cw*0.33, ey+ch*0.05, cw*0.34, ch*0.28);
      // Steeple top — pointed
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.5, ey-ch*0.15);
      ctx.lineTo(ex+cw*0.33, ey+ch*0.08);
      ctx.lineTo(ex+cw*0.67, ey+ch*0.08);
      ctx.closePath(); ctx.fill();
      // Neon white-blue trim on steeple
      ctx.strokeStyle = '#aaaaff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.5, ey-ch*0.15);
      ctx.lineTo(ex+cw*0.33, ey+ch*0.08);
      ctx.moveTo(ex+cw*0.5, ey-ch*0.15);
      ctx.lineTo(ex+cw*0.67, ey+ch*0.08);
      ctx.stroke();
      // Holographic cross icon at spire tip
      const crossGlow = 0.5 + Math.sin(t*2)*0.3;
      ctx.strokeStyle = `rgba(170,170,255,${crossGlow})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+cw*0.5, ey-ch*0.22); ctx.lineTo(ex+cw*0.5, ey-ch*0.12); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex+cw*0.46, ey-ch*0.19); ctx.lineTo(ex+cw*0.54, ey-ch*0.19); ctx.stroke();
      ctx.fillStyle = `rgba(170,170,255,${crossGlow*0.4})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey-ch*0.17, 6, 0, Math.PI*2); ctx.fill();
      // Neon trim on main body roof line
      ctx.strokeStyle = '#aaaaff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+cw*0.1, ey+ch*0.32); ctx.lineTo(ex+cw*0.9, ey+ch*0.32); ctx.stroke();
      // Vertical color strip windows (stained glass vibe)
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      const stripColors = [[100,120,255],[140,100,255],[80,140,255],[170,170,255]];
      for (let ws = 0; ws < 4; ws++) {
        const wx = ex + cw*0.16 + ws*cw*0.18;
        const wy = ey + ch*0.4;
        const clr = stripColors[ws];
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(wx, wy, cw*0.08, ch*0.24);
        ctx.fillStyle = `rgba(${clr[0]},${clr[1]},${clr[2]},${glow * 0.3})`;
        ctx.fillRect(wx+1, wy+1, cw*0.08-2, ch*0.24-2);
        ctx.strokeStyle = `rgba(${clr[0]},${clr[1]},${clr[2]},${glow * 0.6})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, cw*0.08, ch*0.24);
      }
      // Rose window on steeple — holographic circle
      ctx.fillStyle = '#0a0a18';
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.2, cw*0.08, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(170,170,255,${glow*0.25})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.2, cw*0.07, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(170,170,255,${glow*0.6})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.2, cw*0.08, 0, Math.PI*2); ctx.stroke();
      // Arched door
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.35, ey+ch*0.72, cw*0.3, ch*0.28);
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.72, cw*0.15, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = `rgba(170,170,255,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.35, ey+ch); ctx.lineTo(ex+cw*0.35, ey+ch*0.72);
      ctx.arc(ex+cw*0.5, ey+ch*0.72, cw*0.15, Math.PI, 0);
      ctx.lineTo(ex+cw*0.65, ey+ch);
      ctx.stroke();
      // Neon side strips
      ctx.fillStyle = `rgba(170,170,255,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+cw*0.1, ey+ch*0.33, 3, ch*0.65);
      ctx.fillRect(ex+cw*0.9-3, ey+ch*0.33, 3, ch*0.65);
      // Neon "CHAPEL" sign
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(170,170,255,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("CHAPEL", ex+cw/2, ey+ch*0.36);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#aaaaff'; ctx.textAlign = "center";
      ctx.fillText("Chapel", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
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
        const isFilled = queueActive && (typeof PartyState !== 'undefined' ? PartyState.queueSlots[ci] : ci < queuePlayers);
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
        // Party setup mode — show slot labels + Start button
        // Slot labels (player / bot toggles)
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        for (let si = 0; si < 4; si++) {
          const sp = positions[si];
          const slotFilled = typeof PartyState !== 'undefined' && PartyState.queueSlots[si];
          if (si === 0) {
            ctx.fillStyle = '#88ddff';
            ctx.fillText('YOU', sp.x, sp.y - sigilR - 6);
          } else if (slotFilled) {
            ctx.fillStyle = '#88ff88';
            ctx.fillText(BOT_PRESETS[si] ? BOT_PRESETS[si].name : 'Bot ' + si, sp.x, sp.y - sigilR - 6);
            ctx.font = "10px monospace";
            ctx.fillStyle = '#aaa';
            ctx.fillText('CLICK TO REMOVE', sp.x, sp.y + sigilR + 12);
            ctx.font = "bold 11px monospace";
          } else {
            ctx.fillStyle = '#888';
            ctx.fillText('CLICK TO ADD', sp.x, sp.y - sigilR - 6);
          }
        }
        // Start button
        const startW = 140, startH = 32;
        const startX = qcx - startW / 2, startY = qcy - 46;
        const _partyCount = typeof PartyState !== 'undefined' ? PartyState.queueSlots.filter(Boolean).length : 1;
        ctx.fillStyle = `rgba(60,200,60,${0.8 + Math.sin(t * 3) * 0.1})`;
        ctx.beginPath(); ctx.roundRect(startX, startY, startW, startH, 8); ctx.fill();
        ctx.strokeStyle = '#88ff88'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(startX, startY, startW, startH, 8); ctx.stroke();
        ctx.font = "bold 14px monospace"; ctx.fillStyle = '#fff';
        ctx.fillText('START (' + _partyCount + 'P)', qcx, startY + 21);
        // Move to cancel hint
        ctx.font = "10px monospace"; ctx.fillStyle = '#aaa';
        ctx.fillText('MOVE TO CANCEL', qcx, startY + startH + 14);
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
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex + cw/2 + 5, ey + ch + 6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — neon food joint
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Roof — flat with neon strip awning
      ctx.fillStyle = '#181828';
      ctx.fillRect(ex-4, ey+ch*0.16, cw+8, ch*0.1);
      // Neon pink trim — double line awning
      ctx.strokeStyle = '#ff6688'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.16); ctx.lineTo(ex+cw+4, ey+ch*0.16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.26); ctx.lineTo(ex+cw+4, ey+ch*0.26); ctx.stroke();
      // Neon dots along awning (food joint vibe)
      const dotGlow = 0.5 + Math.sin(t*3)*0.3;
      for (let d = 0; d < 5; d++) {
        const phase = (d * 0.4 + t*2) % (Math.PI*2);
        const dg = 0.4 + Math.sin(phase)*0.3;
        ctx.fillStyle = `rgba(255,102,136,${dg})`;
        ctx.beginPath(); ctx.arc(ex+cw*0.12+d*cw*0.19, ey+ch*0.21, 3, 0, Math.PI*2); ctx.fill();
      }
      // Windows — two display cases
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wc = 0; wc < 2; wc++) {
        const wx = ex + cw*0.06 + wc*cw*0.5;
        const wy = ey + ch*0.34;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(wx, wy, cw*0.36, ch*0.22);
        ctx.fillStyle = `rgba(255,102,136,${glow * 0.2})`;
        ctx.fillRect(wx+2, wy+2, cw*0.36-4, ch*0.22-4);
        ctx.strokeStyle = `rgba(255,102,136,${glow * 0.6})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, cw*0.36, ch*0.22);
      }
      // Door
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.36, ey+ch*0.64, cw*0.28, ch*0.36);
      ctx.strokeStyle = `rgba(255,102,136,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.36, ey+ch*0.64, cw*0.28, ch*0.36);
      // Door window pane
      ctx.fillStyle = `rgba(255,102,136,${glow*0.15})`;
      ctx.fillRect(ex+cw*0.4, ey+ch*0.68, cw*0.2, ch*0.12);
      // Neon side strips
      ctx.fillStyle = `rgba(255,102,136,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Neon "DELI" sign
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(255,102,136,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("DELI", ex+cw/2, ey+ch*0.12);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ff6688'; ctx.textAlign = "center";
      ctx.fillText("Deli", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },

  deli_entrance: (e, ctx, ex, ey, w, h) => {
      const ew = w * TILE, eh = h * TILE;
      const t = Date.now() / 1000;
      const glow = 0.4 + Math.sin(t * 2) * 0.15;
      ctx.fillStyle = `rgba(255,102,136,${glow * 0.12})`;
      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeStyle = `rgba(255,102,136,${glow * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(255,102,136,${glow * 0.8})`;
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 ENTER DELI", ex + ew/2, ey + eh + 12);
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

  // === DINER ENTITIES ===
  building_diner: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex + cw/2 + 5, ey + ch + 6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — dark body matching game aesthetic
      ctx.fillStyle = '#12121e';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Steel panel lines
      ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Red neon accent strip along middle
      ctx.fillStyle = `rgba(255,50,50,${0.4 + Math.sin(t*1.5)*0.15})`;
      ctx.fillRect(ex+4, ey+ch*0.52, cw-8, ch*0.04);
      // Roof — flat dark with neon red trim
      ctx.fillStyle = '#181828';
      ctx.fillRect(ex-4, ey+ch*0.16, cw+8, ch*0.1);
      // Neon red trim — double line awning
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.16); ctx.lineTo(ex+cw+4, ey+ch*0.16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.26); ctx.lineTo(ex+cw+4, ey+ch*0.26); ctx.stroke();
      // Neon dots along awning
      for (let d = 0; d < 5; d++) {
        const phase = (d * 0.4 + t*2) % (Math.PI*2);
        const dg = 0.4 + Math.sin(phase)*0.3;
        ctx.fillStyle = `rgba(255,68,68,${dg})`;
        ctx.beginPath(); ctx.arc(ex+cw*0.12+d*cw*0.19, ey+ch*0.21, 3, 0, Math.PI*2); ctx.fill();
      }
      // Windows — two display cases with warm glow
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wc = 0; wc < 2; wc++) {
        const wx = ex + cw*0.06 + wc*cw*0.5;
        const wy = ey + ch*0.34;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(wx, wy, cw*0.36, ch*0.22);
        ctx.fillStyle = `rgba(255,68,68,${glow * 0.2})`;
        ctx.fillRect(wx+2, wy+2, cw*0.36-4, ch*0.22-4);
        ctx.strokeStyle = `rgba(255,68,68,${glow * 0.6})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, cw*0.36, ch*0.22);
      }
      // Door
      ctx.fillStyle = '#08081a';
      ctx.fillRect(ex+cw*0.36, ey+ch*0.64, cw*0.28, ch*0.36);
      ctx.strokeStyle = `rgba(255,68,68,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.36, ey+ch*0.64, cw*0.28, ch*0.36);
      // Door window pane
      ctx.fillStyle = `rgba(255,68,68,${glow*0.15})`;
      ctx.fillRect(ex+cw*0.4, ey+ch*0.68, cw*0.2, ch*0.12);
      // Neon side strips
      ctx.fillStyle = `rgba(255,68,68,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Neon "DINER" sign
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(255,68,68,${0.7 + Math.sin(t*2.5)*0.2})`;
      ctx.textAlign = "center";
      ctx.fillText("DINER", ex+cw/2, ey+ch*0.12);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ff4444'; ctx.textAlign = "center";
      ctx.fillText("Diner", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },

  diner_entrance: (e, ctx, ex, ey, w, h) => {
      const ew = w * TILE, eh = h * TILE;
      const t = Date.now() / 1000;
      const glow = 0.4 + Math.sin(t * 2) * 0.15;
      ctx.fillStyle = `rgba(255,68,68,${glow * 0.12})`;
      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeStyle = `rgba(255,68,68,${glow * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(255,68,68,${glow * 0.8})`;
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 ENTER DINER", ex + ew/2, ey + eh + 12);
      ctx.textAlign = "left";
  },

  diner_exit: (e, ctx, ex, ey, w, h) => {
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
      // Frame (chrome)
      ctx.strokeStyle = '#c0c0c8'; ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Exit label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#e0e0e8'; ctx.textAlign = "center";
      ctx.fillText("ENTER DINER", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },

  diner_customer_exit: (e, ctx, ex, ey, w, h) => {
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
      // Frame (chrome)
      ctx.strokeStyle = '#c0c0c8'; ctx.lineWidth = 3;
      ctx.strokeRect(ex + cw * 0.1, ey, cw * 0.8, ch * 0.9);
      // Exit label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#e0e0e8'; ctx.textAlign = "center";
      ctx.fillText("EXIT DINER", ex + cw / 2, ey + ch + 10);
      ctx.textAlign = "left";
  },

  diner_booth: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 5) * TILE, ch = (h || 4) * TILE;
      const seatH = TILE;       // top/bottom seat rows = 1 tile each
      const tableH = ch - seatH * 2; // table = remaining middle (2 tiles)
      // Top bench (red vinyl)
      ctx.fillStyle = '#cc2020';
      ctx.fillRect(ex + 4, ey + 4, cw - 8, seatH - 4);
      ctx.fillStyle = '#aa1818';
      ctx.fillRect(ex + 4, ey + 4, cw - 8, 4); // seat back shadow
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(ex + 8, ey + 8, cw - 16, seatH * 0.3);
      // Formica table (center 2 tiles)
      const ty = ey + seatH;
      ctx.fillStyle = '#e8e0d0';
      ctx.fillRect(ex + 12, ty + 2, cw - 24, tableH - 4);
      ctx.fillStyle = '#f0e8d8';
      ctx.fillRect(ex + 14, ty + 4, cw - 28, tableH - 8);
      ctx.strokeStyle = '#c0c0c8'; ctx.lineWidth = 2;
      ctx.strokeRect(ex + 12, ty + 2, cw - 24, tableH - 4);
      // Bottom bench (red vinyl)
      const by = ey + seatH + tableH;
      ctx.fillStyle = '#cc2020';
      ctx.fillRect(ex + 4, by, cw - 8, seatH - 4);
      ctx.fillStyle = '#aa1818';
      ctx.fillRect(ex + 4, by + seatH - 8, cw - 8, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(ex + 8, by + 4, cw - 16, seatH * 0.3);

      // Table number circle — black circle with gold number in center of table
      const _boothPositionsForNum = [[28,2],[28,7],[28,12],[38,2],[38,7],[38,12]];
      let _tableNum = 0;
      for (let _bi = 0; _bi < _boothPositionsForNum.length; _bi++) {
        if (e.tx === _boothPositionsForNum[_bi][0] && e.ty === _boothPositionsForNum[_bi][1]) { _tableNum = _bi + 1; break; }
      }
      if (_tableNum > 0) {
        const numCX = ex + cw / 2, numCY = ty + tableH / 2;
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(numCX, numCY, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(numCX, numCY, 10, 0, Math.PI * 2); ctx.stroke();
        ctx.font = "bold 12px monospace"; ctx.fillStyle = '#ffd700'; ctx.textAlign = "center";
        ctx.fillText(String(_tableNum), numCX, numCY + 4);
        ctx.textAlign = "left";
      }

      // Render plates on table at each seat's X position — disappear one by one as NPCs sit
      const _boothPositions = [[28,2],[28,7],[28,12],[38,2],[38,7],[38,12]];
      let _bIdx = -1;
      for (let _bi = 0; _bi < _boothPositions.length; _bi++) {
        if (e.tx === _boothPositions[_bi][0] && e.ty === _boothPositions[_bi][1]) { _bIdx = _bi; break; }
      }
      if (_bIdx >= 0 && typeof DINER_BOOTHS !== 'undefined' && DINER_BOOTHS[_bIdx] && DINER_BOOTHS[_bIdx]._plates) {
        const plates = DINER_BOOTHS[_bIdx]._plates;
        const booth = DINER_BOOTHS[_bIdx];
        // Place plates at each seat's tile position on the table
        for (let si = 0; si < booth.seats.length; si++) {
          if (!plates[si]) continue; // plate already taken by NPC
          const seat = booth.seats[si];
          const seatRelX = (seat.tx - booth.tx) * TILE + TILE / 2;
          const px = ex + seatRelX;
          // Top-row seats: plate on upper half of table; bottom-row: lower half
          const plateY = seat.sitDir === 0 ? ty + tableH * 0.25 : ty + tableH * 0.75;
          // Plate
          ctx.fillStyle = '#e8e0d0';
          ctx.beginPath(); ctx.ellipse(px, plateY, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#c0b8a0'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(px, plateY, 10, 5, 0, 0, Math.PI * 2); ctx.stroke();
          // Food on plate
          const ings = plates[si];
          if (ings && ings[0] && typeof DINER_INGREDIENTS !== 'undefined' && DINER_INGREDIENTS[ings[0]]) {
            ctx.fillStyle = DINER_INGREDIENTS[ings[0]].color;
          } else {
            ctx.fillStyle = '#d4a040';
          }
          ctx.beginPath(); ctx.arc(px, plateY - 2, 4, 0, Math.PI * 2); ctx.fill();
        }
      }
  },

  diner_booth_table: (e, ctx, ex, ey, w, h) => {
      // Solid table portion — rendered as part of booth visual, so just invisible here
      // (the diner_booth renderer already draws the full booth with table)
  },

  diner_booth_seat: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 1) * TILE, ch = (h || 1) * TILE;
      // Subtle red cushion marker
      ctx.fillStyle = 'rgba(204,32,32,0.25)';
      ctx.beginPath(); ctx.roundRect(ex + 6, ey + 6, cw - 12, ch - 12, 4); ctx.fill();
  },

  arcade_cabinet: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 1) * TILE, ch = (h || 2) * TILE;
      const t = Date.now() / 1000;
      // Cabinet body
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(ex + 4, ey + 4, cw - 8, ch - 4);
      // Side panel accent
      ctx.fillStyle = '#2a2a4a';
      ctx.fillRect(ex + 4, ey + 4, 3, ch - 4);
      ctx.fillRect(ex + cw - 7, ey + 4, 3, ch - 4);
      // Screen area
      const sx = ex + 8, sy = ey + 8, sw = cw - 16, sh = ch * 0.4;
      ctx.fillStyle = '#000';
      ctx.fillRect(sx, sy, sw, sh);
      // Active player detection — screen only on when gamer is at cabinet and actively playing
      let _arcadeGamerNpc = null;
      let _arcadeScreenOn = false;
      if (typeof DINER_ARCADE_SPOTS !== 'undefined' && typeof dinerNPCs !== 'undefined') {
        for (const spot of DINER_ARCADE_SPOTS) {
          if (spot.claimedBy && Math.abs(spot.tx - e.tx) <= 1 && Math.abs(spot.ty - (e.ty + 2)) <= 1) {
            for (const dn of dinerNPCs) {
              if (dn.id === spot.claimedBy) { _arcadeGamerNpc = dn; break; }
            }
            // Screen only on AFTER coins inserted (fee paid) and game active or showing result
            if (_arcadeGamerNpc && _arcadeGamerNpc.state === 'gamer_playing' &&
                _arcadeGamerNpc._arcadeFeePaid &&
                (_arcadeGamerNpc.stateTimer > 0 || _arcadeGamerNpc._arcadeResultTimer > 0)) {
              _arcadeScreenOn = true;
            }
            break;
          }
        }
      }
      if (_arcadeScreenOn && _arcadeGamerNpc) {
        // Check if showing win/lose result
        if (_arcadeGamerNpc._arcadeResultTimer > 0) {
          const isWin = _arcadeGamerNpc._arcadeLastResult === 'win';
          ctx.fillStyle = isWin ? 'rgba(0,80,0,0.8)' : 'rgba(80,0,0,0.8)';
          ctx.fillRect(sx + 2, sy + 2, sw - 4, sh - 4);
          ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
          ctx.fillStyle = isWin ? '#40ff40' : '#ff4040';
          ctx.fillText(isWin ? "YOU WIN!" : "YOU LOSE", sx + sw / 2, sy + sh / 2 + 3);
          ctx.textAlign = "left";
        } else {
          // Animated pixel patterns when NPC is actively playing
          const seed = Math.floor(t * 8);
          for (let _py = 0; _py < 4; _py++) {
            for (let _px = 0; _px < 3; _px++) {
              const hash = (seed + _py * 7 + _px * 13) % 6;
              const pColors = ['#ff4040','#40ff40','#4040ff','#ffff40','#ff40ff','#40ffff'];
              ctx.fillStyle = pColors[hash];
              ctx.fillRect(sx + 3 + _px * ((sw - 6) / 3), sy + 3 + _py * ((sh - 6) / 4), (sw - 6) / 3 - 1, (sh - 6) / 4 - 1);
            }
          }
        }
        // Scan lines
        for (let sl = 0; sl < 5; sl++) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(sx + 2, sy + 4 + sl * (sh / 5), sw - 4, 1);
        }
      }
      // When not playing or no gamer, screen stays black
      // Joystick bump
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.arc(ex + cw * 0.4, ey + ch * 0.72, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cc2020';
      ctx.beginPath(); ctx.arc(ex + cw * 0.4, ey + ch * 0.72, 2.5, 0, Math.PI * 2); ctx.fill();
      // Buttons
      ctx.fillStyle = '#ff4040';
      ctx.beginPath(); ctx.arc(ex + cw * 0.65, ey + ch * 0.7, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4040ff';
      ctx.beginPath(); ctx.arc(ex + cw * 0.65, ey + ch * 0.76, 3, 0, Math.PI * 2); ctx.fill();
      // Coin slot
      ctx.fillStyle = '#555';
      ctx.fillRect(ex + cw * 0.35, ey + ch * 0.88, cw * 0.3, 3);
      ctx.fillStyle = '#888';
      ctx.fillRect(ex + cw * 0.42, ey + ch * 0.88, cw * 0.16, 2);
      // Arcade number label — bigger font, gold number
      let _arcadeNum = 0;
      if (e.tx === 34) _arcadeNum = 1;
      else if (e.tx === 36) _arcadeNum = 2;
      if (_arcadeNum > 0) {
        ctx.textAlign = "center";
        // "Arcade" in white
        ctx.font = "bold 11px monospace"; ctx.fillStyle = '#e0e0e8';
        const arcLabel = "Arcade ";
        const arcLabelW = ctx.measureText(arcLabel).width;
        const numStr = String(_arcadeNum);
        const totalW = arcLabelW + ctx.measureText(numStr).width;
        const startX = ex + cw / 2 - totalW / 2;
        ctx.textAlign = "left";
        ctx.fillText(arcLabel, startX, ey + ch + 12);
        // Number in gold
        ctx.fillStyle = '#ffd700';
        ctx.fillText(numStr, startX + arcLabelW, ey + ch + 12);
        ctx.textAlign = "left";
      }
  },

  diner_jukebox: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 2) * TILE, ch = (h || 2) * TILE;
      const t = Date.now() / 1000;
      // Chrome body
      ctx.fillStyle = '#b0b0b8';
      ctx.beginPath(); ctx.roundRect(ex + 4, ey + ch * 0.15, cw - 8, ch * 0.85, 6); ctx.fill();
      ctx.fillStyle = '#c8c8d0';
      ctx.beginPath(); ctx.roundRect(ex + 6, ey + ch * 0.17, cw - 12, ch * 0.81, 5); ctx.fill();
      // Classic dome top
      ctx.fillStyle = '#d0d0d8';
      ctx.beginPath(); ctx.ellipse(ex + cw/2, ey + ch * 0.18, cw * 0.38, ch * 0.12, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#e0e0e8'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(ex + cw/2, ey + ch * 0.18, cw * 0.38, ch * 0.12, 0, Math.PI, 0); ctx.stroke();
      // Colored panels with animated dots
      const panelColors = ['#ff4040', '#ffaa00', '#40ff40', '#4040ff', '#ff40ff'];
      for (let d = 0; d < 5; d++) {
        const phase = (d * 0.7 + t * 2) % (Math.PI * 2);
        const dg = 0.4 + Math.sin(phase) * 0.3;
        const dx = ex + cw * 0.15 + d * cw * 0.14;
        ctx.fillStyle = panelColors[d];
        ctx.globalAlpha = dg;
        ctx.beginPath(); ctx.arc(dx, ey + ch * 0.45, 4, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      // Record selection window
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(ex + cw * 0.15, ey + ch * 0.55, cw * 0.7, ch * 0.25);
      ctx.fillStyle = 'rgba(255,200,100,0.15)';
      ctx.fillRect(ex + cw * 0.17, ey + ch * 0.57, cw * 0.66, ch * 0.21);
      // Record lines
      for (let rl = 0; rl < 4; rl++) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(ex + cw * 0.2, ey + ch * 0.59 + rl * ch * 0.05, cw * 0.6, 1);
      }
      // Chrome base
      ctx.fillStyle = '#a0a0a8';
      ctx.fillRect(ex + 6, ey + ch * 0.88, cw - 12, ch * 0.1);
  },

  diner_floor: (e, ctx, ex, ey, w, h) => {
      const tw = w || 1, th = h || 1;
      for (let py = 0; py < th; py++) {
        for (let px = 0; px < tw; px++) {
          const rx = ex + px * TILE, ry = ey + py * TILE;
          // Warm wood-tone floor
          ctx.fillStyle = '#b8a080';
          ctx.fillRect(rx, ry, TILE, TILE);
          // Subtle plank grain variation
          const shade = ((px * 7 + py * 13) % 3 === 0) ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)';
          ctx.fillStyle = shade;
          ctx.fillRect(rx + 2, ry + 2, TILE - 4, TILE - 4);
          // Grout lines
          ctx.strokeStyle = 'rgba(80,60,40,0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(rx, ry, TILE, TILE);
        }
      }
  },

  diner_counter: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Counter top (chrome surface)
      ctx.fillStyle = '#c0c0c8';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#d0d0d8';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Chrome edge (shiny strip at front)
      ctx.fillStyle = '#e0e0e8';
      ctx.fillRect(ex, ey + ch - 6, cw, 6);
      // Red accent strip
      ctx.fillStyle = '#cc2020';
      ctx.fillRect(ex, ey + ch - 8, cw, 2);
      // Cutting board
      ctx.fillStyle = '#8a6838';
      ctx.fillRect(ex + cw * 0.35, ey + ch * 0.2, cw * 0.3, ch * 0.6);
      ctx.strokeStyle = '#6a4828'; ctx.lineWidth = 1;
      ctx.strokeRect(ex + cw * 0.35, ey + ch * 0.2, cw * 0.3, ch * 0.6);
      // Title banner below
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ex + cw / 2 - 50, ey + ch + 2, 100, 16);
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#e0e0e8'; ctx.textAlign = "center";
      ctx.fillText("CLEAR TRAY", ex + cw / 2, ey + ch + 14);
      ctx.textAlign = "left";
  },

  diner_tv: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // TV frame (dark)
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Screen
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(ex + 6, ey + 6, cw - 12, ch - 20);
      // Animated TV content — random channels cycling
      const t = Date.now() / 1000;
      const screenX = ex + 8, screenY = ey + 8;
      const screenW = cw - 16, screenH = ch - 28;
      const channel = Math.floor(t * 0.15) % 5; // switch every ~7 seconds

      // Clip all TV content to screen bounds
      ctx.save();
      ctx.beginPath();
      ctx.rect(screenX, screenY, screenW, screenH);
      ctx.clip();

      if (channel === 0) {
        // Sports game — moving dots
        ctx.fillStyle = '#1a4a1a';
        ctx.fillRect(screenX, screenY, screenW, screenH);
        for (let d = 0; d < 4; d++) {
          const dx = screenX + screenW * 0.2 + Math.sin(t * 3 + d * 1.5) * screenW * 0.3;
          const dy = screenY + screenH * 0.3 + Math.cos(t * 2.5 + d * 2) * screenH * 0.25;
          ctx.fillStyle = d < 2 ? '#ff4040' : '#4040ff';
          ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Ball
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(screenX + screenW / 2 + Math.sin(t * 5) * screenW * 0.35, screenY + screenH / 2 + Math.cos(t * 4) * screenH * 0.3, 2, 0, Math.PI * 2); ctx.fill();
      } else if (channel === 1) {
        // News ticker — scrolling bar
        ctx.fillStyle = '#0a0a3a';
        ctx.fillRect(screenX, screenY, screenW, screenH);
        ctx.fillStyle = '#cc2020';
        ctx.fillRect(screenX, screenY + screenH - 8, screenW, 8);
        const scrollX = ((t * 30) % (screenW * 2)) - screenW;
        ctx.fillStyle = '#ffffff';
        ctx.font = "bold 5px monospace";
        ctx.fillText("BREAKING NEWS", screenX + scrollX, screenY + screenH - 2);
        // Anchor desk
        ctx.fillStyle = '#d4a574';
        ctx.beginPath(); ctx.arc(screenX + screenW / 2, screenY + screenH * 0.4, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4060a0';
        ctx.fillRect(screenX + screenW / 2 - 4, screenY + screenH * 0.5, 8, 10);
      } else if (channel === 2) {
        // Cooking show — bubbling pot
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(screenX, screenY, screenW, screenH);
        ctx.fillStyle = '#808080';
        ctx.fillRect(screenX + screenW * 0.25, screenY + screenH * 0.4, screenW * 0.5, screenH * 0.4);
        for (let b = 0; b < 3; b++) {
          const bx = screenX + screenW * 0.35 + b * screenW * 0.1;
          const by = screenY + screenH * 0.35 + Math.sin(t * 4 + b * 2) * 4;
          ctx.fillStyle = 'rgba(255,255,255,0.6)';
          ctx.beginPath(); ctx.arc(bx, by, 2, 0, Math.PI * 2); ctx.fill();
        }
      } else if (channel === 3) {
        // Cartoon — bouncing character
        ctx.fillStyle = '#80c0ff';
        ctx.fillRect(screenX, screenY, screenW, screenH);
        ctx.fillStyle = '#40a040';
        ctx.fillRect(screenX, screenY + screenH * 0.7, screenW, screenH * 0.3);
        const jumpY = Math.abs(Math.sin(t * 3)) * screenH * 0.3;
        ctx.fillStyle = '#ff8040';
        ctx.beginPath(); ctx.arc(screenX + screenW / 2 + Math.sin(t) * screenW * 0.2, screenY + screenH * 0.6 - jumpY, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(screenX + screenW / 2 + Math.sin(t) * screenW * 0.2, screenY + screenH * 0.55 - jumpY, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        // Static / color bars
        const barW = screenW / 7;
        const barColors = ['#fff','#ff0','#0ff','#0f0','#f0f','#f00','#00f'];
        for (let b = 0; b < 7; b++) {
          ctx.fillStyle = barColors[b];
          ctx.fillRect(screenX + b * barW, screenY, barW + 1, screenH);
        }
      }
      // Restore clipping before scan lines and stand
      ctx.restore();

      // Scan lines overlay
      for (let sl = 0; sl < 8; sl++) {
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(screenX, screenY + sl * (screenH / 8), screenW, 1);
      }

      // Stand/mount
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(ex + cw / 2 - 4, ey + ch - 16, 8, 14);
      // Base
      ctx.fillStyle = '#3a3a4a';
      ctx.fillRect(ex + cw / 2 - 12, ey + ch - 4, 24, 4);
  },

  diner_pickup_counter: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Counter surface (chrome with red tint)
      ctx.fillStyle = '#b0b0b8';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#c0c0c8';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Red accent strip
      ctx.fillStyle = '#cc2020';
      ctx.fillRect(ex, ey + ch - 3, cw, 3);
      // Service bell
      const bellR = Math.min(8, ch * 0.3);
      ctx.fillStyle = '#e0e0e8';
      ctx.beginPath(); ctx.arc(ex + cw * 0.5, ey + ch * 0.35, bellR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c0c0c8';
      ctx.beginPath(); ctx.arc(ex + cw * 0.5, ey + ch * 0.35, bellR * 0.6, Math.PI, 0); ctx.fill();
      // Pulsing ready indicator
      const pulse = 0.5 + 0.3 * Math.sin(t * 3);
      ctx.fillStyle = `rgba(100,200,80,${pulse})`;
      ctx.beginPath(); ctx.arc(ex + cw * 0.5, ey + ch * 0.7, 3, 0, Math.PI * 2); ctx.fill();
      // SERVE label
      ctx.font = "bold 10px monospace"; ctx.fillStyle = '#80ff80'; ctx.textAlign = "center";
      ctx.fillText("SERVE", ex + cw / 2, ey + ch - 4);
      ctx.textAlign = "left";

      // Tray rendering moved to _drawDinerTrayOverlay (post-entity pass)
  },

  diner_service_counter: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Chrome counter divider wall
      ctx.fillStyle = '#b0b0b8';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#c8c8d0';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Shiny highlight on top
      ctx.fillStyle = '#e0e0e8';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, 3);
      // Gray accent strip (matches counter color)
      ctx.fillStyle = '#a0a0a8';
      ctx.fillRect(ex, ey + ch * 0.45, cw, ch * 0.1);
  },

  diner_kitchen_floor: (e, ctx, ex, ey, w, h) => {
      const tw = w || 1, th = h || 1;
      for (let py = 0; py < th; py++) {
        for (let px = 0; px < tw; px++) {
          const rx = ex + px * TILE, ry = ey + py * TILE;
          // Clean kitchen tile — uniform light grey
          ctx.fillStyle = '#c8c4bc';
          ctx.fillRect(rx, ry, TILE, TILE);
          // Grout lines
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

  kitchen_door_diner: (e, ctx, ex, ey, w, h) => {
      const cw = (w || 1) * TILE, ch = (h || 2) * TILE;
      // Floor under doorway
      ctx.fillStyle = '#d8d0b8';
      ctx.fillRect(ex, ey, cw, ch);
      // Door frame sides (chrome)
      ctx.fillStyle = '#c0c0c8';
      ctx.fillRect(ex, ey, 4, ch);
      ctx.fillRect(ex + cw - 4, ey, 4, ch);
      // "KITCHEN" label
      ctx.font = "bold 9px monospace"; ctx.fillStyle = '#8a7a60'; ctx.textAlign = "center";
      ctx.fillText("KITCHEN", ex + cw / 2, ey + ch / 2 + 3);
      ctx.textAlign = "left";
  },

  // === HOUSE / FARM ENTITIES ===
  house_entrance: (e, ctx, ex, ey, w, h) => {
      const ew = w * TILE, eh = h * TILE;
      const t = Date.now() / 1000;
      const glow = 0.4 + Math.sin(t * 2) * 0.15;
      ctx.fillStyle = `rgba(0,255,136,${glow * 0.12})`;
      ctx.fillRect(ex, ey, ew, eh);
      ctx.strokeStyle = `rgba(0,255,136,${glow * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = `rgba(0,255,136,${glow * 0.8})`;
      ctx.textAlign = "center";
      ctx.fillText("\u25B2 ENTER HOUSE", ex + ew/2, ey + eh + 12);
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
      // Draw completed order plates on the right brown counter segment (tx >= 14, horizontal)
      // Fixed-slot system: each slot (0-3) renders at a fixed position, null slots are skipped
      if (e.tx >= 14 && (e.h || 1) === 1 && (e.w || 1) >= 5 &&
          typeof cookingState !== 'undefined' && cookingState.counterOrders) {
        const orders = cookingState.counterOrders;
        const spacing = TILE; // 1 tile apart between plates
        const startX = ex + TILE * 0.5; // start half-tile in from left edge
        for (let i = 0; i < Math.min(orders.length, 4); i++) {
          if (!orders[i]) continue; // empty slot — no plate here
          const px = startX + i * spacing;
          const py = ey + ch * 0.4;
          // Plate
          ctx.fillStyle = '#e0d8c8';
          ctx.beginPath(); ctx.ellipse(px, py, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#a09880'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.ellipse(px, py, 12, 7, 0, 0, Math.PI * 2); ctx.stroke();
          // Food layers
          if (orders[i].recipeIngredients && typeof DELI_INGREDIENTS !== 'undefined') {
            const maxLayers = Math.min(orders[i].recipeIngredients.length, 4);
            for (let li = 0; li < maxLayers; li++) {
              const ing = DELI_INGREDIENTS[orders[i].recipeIngredients[li]];
              ctx.fillStyle = ing ? ing.color : '#c0a060';
              ctx.fillRect(px - 7, py - 3 - li * 3, 14, 3);
            }
          }
        }
      }
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
  building_hideseek: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.45, 9, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — dark amber warehouse
      ctx.fillStyle = '#12100e';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Steel panel lines (rust-tinted)
      ctx.strokeStyle = '#2a2218'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Corrugated wall texture (vertical ridges)
      ctx.strokeStyle = 'rgba(255,154,64,0.04)'; ctx.lineWidth = 1;
      for (let ridge = 0; ridge < 12; ridge++) {
        const rx = ex + 8 + ridge * (cw - 16) / 12;
        ctx.beginPath(); ctx.moveTo(rx, ey+ch*0.26); ctx.lineTo(rx, ey+ch*0.95); ctx.stroke();
      }
      // Roof — flat industrial awning
      ctx.fillStyle = '#1a1510';
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.06);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.06); ctx.lineTo(ex+cw+6, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Roof highlight
      ctx.fillStyle = '#221a10';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.3, ey+ch*0.06); ctx.lineTo(ex+cw*0.7, ey+ch*0.06);
      ctx.lineTo(ex+cw+6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Neon amber trim on roof edge
      ctx.strokeStyle = '#ff9a40'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.06);
      ctx.lineTo(ex+cw*0.7, ey+ch*0.06); ctx.lineTo(ex+cw+6, ey+ch*0.24);
      ctx.stroke();
      // Boarded-up windows with dim amber glow (hide-and-seek vibe — mostly dark)
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wr = 0; wr < 2; wr++) {
        for (let wc = 0; wc < 3; wc++) {
          const wx = ex + cw*0.08 + wc*cw*0.3;
          const wy = ey + ch*0.32 + wr*ch*0.22;
          // Dark window base
          ctx.fillStyle = '#0a0a08';
          ctx.fillRect(wx, wy, cw*0.22, ch*0.14);
          // Dim amber glow (barely visible, mysterious)
          ctx.fillStyle = `rgba(255,154,64,${glow * 0.12})`;
          ctx.fillRect(wx+1, wy+1, cw*0.22-2, ch*0.14-2);
          ctx.strokeStyle = `rgba(255,154,64,${glow * 0.4})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, cw*0.22, ch*0.14);
          // Board slats across windows (2 diagonal boards)
          ctx.strokeStyle = '#2a2218'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(wx+2, wy+2); ctx.lineTo(wx+cw*0.22-2, wy+ch*0.14-2); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(wx+cw*0.22-2, wy+2); ctx.lineTo(wx+2, wy+ch*0.14-2); ctx.stroke();
        }
      }
      // Heavy door — reinforced warehouse style
      ctx.fillStyle = '#08080a';
      ctx.fillRect(ex+cw*0.32, ey+ch*0.75, cw*0.36, ch*0.25);
      // Door reinforcement bars
      ctx.strokeStyle = '#2a2218'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+cw*0.32, ey+ch*0.82); ctx.lineTo(ex+cw*0.68, ey+ch*0.82); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex+cw*0.32, ey+ch*0.92); ctx.lineTo(ex+cw*0.68, ey+ch*0.92); ctx.stroke();
      // Door neon frame
      ctx.strokeStyle = `rgba(255,154,64,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.32, ey+ch*0.75, cw*0.36, ch*0.25);
      // Neon side strips (amber)
      ctx.fillStyle = `rgba(255,154,64,${0.15 + Math.sin(t*1.2)*0.08})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Flickering warning light on roof (alternating amber/dark)
      const flicker = Math.sin(t * 4) > 0 ? 0.6 : 0.15;
      ctx.fillStyle = `rgba(255,120,20,${flicker})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.02, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(255,120,20,${flicker * 0.3})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.02, 8, 0, Math.PI*2); ctx.fill();
      // Neon "HIDE & SEEK" sign (amber/orange)
      const signGlow = 0.7 + Math.sin(t * 2.5) * 0.2;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(255,154,64,${signGlow})`;
      ctx.textAlign = "center";
      ctx.fillText("HIDE & SEEK", ex+cw/2, ey+ch*0.16);
      // Sign glow halo
      ctx.fillStyle = `rgba(255,154,64,${signGlow * 0.15})`;
      ctx.fillRect(ex+cw*0.15, ey+ch*0.09, cw*0.7, ch*0.1);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ff9a40'; ctx.textAlign = "center";
      ctx.fillText("Hide & Seek", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },

  // ===================== THE SKELD BUILDING (lobby) =====================
  building_skeld: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.45, 9, 0, 0, Math.PI*2); ctx.fill();
      // Main structure — dark blue-gray spaceship hull
      ctx.fillStyle = '#0c0e14';
      ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
      // Hull panel lines
      ctx.strokeStyle = '#1a1e2a'; ctx.lineWidth = 1;
      for (let r = 0; r < 5; r++) {
        const ly = ey+ch*0.3+r*ch*0.14;
        ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      }
      // Vertical panel seams
      ctx.strokeStyle = 'rgba(60,80,140,0.06)'; ctx.lineWidth = 1;
      for (let ridge = 0; ridge < 10; ridge++) {
        const rx = ex + 10 + ridge * (cw - 20) / 10;
        ctx.beginPath(); ctx.moveTo(rx, ey+ch*0.26); ctx.lineTo(rx, ey+ch*0.95); ctx.stroke();
      }
      // Roof — angular spaceship shape
      ctx.fillStyle = '#10121a';
      ctx.beginPath();
      ctx.moveTo(ex-4, ey+ch*0.24); ctx.lineTo(ex+cw*0.2, ey+ch*0.04);
      ctx.lineTo(ex+cw*0.8, ey+ch*0.04); ctx.lineTo(ex+cw+4, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Roof highlight
      ctx.fillStyle = '#181c28';
      ctx.beginPath();
      ctx.moveTo(ex+cw*0.2, ey+ch*0.04); ctx.lineTo(ex+cw*0.8, ey+ch*0.04);
      ctx.lineTo(ex+cw+4, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey+ch*0.24);
      ctx.closePath(); ctx.fill();
      // Neon blue trim on roof edge
      ctx.strokeStyle = '#4a8aff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ex-4, ey+ch*0.24); ctx.lineTo(ex+cw*0.2, ey+ch*0.04);
      ctx.lineTo(ex+cw*0.8, ey+ch*0.04); ctx.lineTo(ex+cw+4, ey+ch*0.24);
      ctx.stroke();
      // Viewport windows with blue glow
      const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
      for (let wr = 0; wr < 2; wr++) {
        for (let wc = 0; wc < 3; wc++) {
          const wx = ex + cw*0.08 + wc*cw*0.3;
          const wy = ey + ch*0.32 + wr*ch*0.22;
          ctx.fillStyle = '#060810';
          ctx.fillRect(wx, wy, cw*0.22, ch*0.14);
          ctx.fillStyle = `rgba(60,120,255,${glow * 0.15})`;
          ctx.fillRect(wx+1, wy+1, cw*0.22-2, ch*0.14-2);
          ctx.strokeStyle = `rgba(60,120,255,${glow * 0.4})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(wx, wy, cw*0.22, ch*0.14);
          // Star dots inside windows
          ctx.fillStyle = `rgba(200,220,255,${0.3 + Math.sin(t*2+wc+wr)*0.2})`;
          ctx.beginPath(); ctx.arc(wx+cw*0.06, wy+ch*0.05, 1.5, 0, Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(wx+cw*0.16, wy+ch*0.09, 1, 0, Math.PI*2); ctx.fill();
        }
      }
      // Airlock door
      ctx.fillStyle = '#08080e';
      ctx.fillRect(ex+cw*0.32, ey+ch*0.75, cw*0.36, ch*0.25);
      ctx.strokeStyle = '#1a2030'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex+cw*0.5, ey+ch*0.77); ctx.lineTo(ex+cw*0.5, ey+ch*0.98); ctx.stroke();
      // Door neon frame
      ctx.strokeStyle = `rgba(60,140,255,${0.6 + Math.sin(t*2)*0.2})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ex+cw*0.32, ey+ch*0.75, cw*0.36, ch*0.25);
      // Neon side strips (blue)
      ctx.fillStyle = `rgba(60,140,255,${0.12 + Math.sin(t*1.2)*0.06})`;
      ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
      ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
      // Running light on roof
      const flicker = Math.sin(t * 3) > 0 ? 0.6 : 0.15;
      ctx.fillStyle = `rgba(60,140,255,${flicker})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.01, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = `rgba(60,140,255,${flicker * 0.3})`;
      ctx.beginPath(); ctx.arc(ex+cw*0.5, ey+ch*0.01, 8, 0, Math.PI*2); ctx.fill();
      // Neon "THE SKELD" sign
      const signGlow = 0.7 + Math.sin(t * 2.5) * 0.2;
      ctx.font = "bold 9px monospace";
      ctx.fillStyle = `rgba(60,160,255,${signGlow})`;
      ctx.textAlign = "center";
      ctx.fillText("THE SKELD", ex+cw/2, ey+ch*0.16);
      ctx.fillStyle = `rgba(60,160,255,${signGlow * 0.15})`;
      ctx.fillRect(ex+cw*0.15, ey+ch*0.09, cw*0.7, ch*0.1);
      // Label below
      ctx.font = "bold 11px monospace"; ctx.fillStyle = '#4a8aff'; ctx.textAlign = "center";
      ctx.fillText("The Skeld", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
  },

  // ===================== SKELD ENTRANCE (lobby portal) =====================
  skeld_entrance: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      const pulse = 0.5 + Math.sin(t * 2) * 0.3;
      // Glowing blue portal pad
      ctx.fillStyle = `rgba(40,100,220,${0.08 + pulse * 0.06})`;
      ctx.beginPath(); ctx.ellipse(ex+cw/2, ey+ch/2, cw*0.45, ch*0.35, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = `rgba(60,140,255,${0.3 + pulse * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(ex+cw/2, ey+ch/2, cw*0.45, ch*0.35, 0, 0, Math.PI*2); ctx.stroke();
      // Inner ring
      ctx.strokeStyle = `rgba(60,140,255,${0.15 + pulse * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(ex+cw/2, ey+ch/2, cw*0.3, ch*0.2, 0, 0, Math.PI*2); ctx.stroke();
      // Arrow indicator
      ctx.fillStyle = `rgba(60,160,255,${0.5 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(ex+cw/2, ey+ch*0.2); ctx.lineTo(ex+cw/2+8, ey+ch*0.45); ctx.lineTo(ex+cw/2-8, ey+ch*0.45);
      ctx.closePath(); ctx.fill();
  },

  // ===================== SKELD TASK CONSOLE (cyan wall-mounted) =====================
  skeld_task: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      const pulse = 0.5 + Math.sin(t * 2 + e.tx * 0.3) * 0.3;
      // Console body — dark metal
      ctx.fillStyle = '#14181e';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#1a2028';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Screen area (inset)
      const sx = ex + 6, sy = ey + 4, sw = cw - 12, sh = ch - 10;
      ctx.fillStyle = '#041818';
      ctx.fillRect(sx, sy, sw, sh);
      // Cyan screen glow
      ctx.fillStyle = `rgba(0,220,240,${0.12 + pulse * 0.08})`;
      ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
      // Scan lines
      ctx.fillStyle = 'rgba(0,255,255,0.04)';
      for (let i = 0; i < sh; i += 3) {
        ctx.fillRect(sx + 1, sy + i, sw - 2, 1);
      }
      // Green LED (bottom-right of console)
      ctx.fillStyle = `rgba(40,255,80,${0.5 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(ex + cw - 8, ey + ch - 5, 2, 0, Math.PI * 2);
      ctx.fill();
      // Yellow outline for pending tasks / cyan done check
      if (typeof SkeldTasks !== 'undefined') {
        const done = SkeldTasks.isStepDone(e);
        const canDo = !done && SkeldTasks.canDoStep(e);
        if (canDo) {
          // Bright yellow outline — this is the next task to do
          const yp = 0.7 + 0.3 * Math.sin(t * 3);
          ctx.shadowColor = `rgba(255,220,40,${0.6 * yp})`;
          ctx.shadowBlur = 10 + yp * 6;
          ctx.strokeStyle = `rgba(255,220,40,${0.8 * yp})`;
          ctx.lineWidth = 2.5;
          ctx.strokeRect(ex - 2, ey - 2, cw + 4, ch + 4);
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        } else if (done) {
          // Green checkmark overlay — task step completed
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(ex, ey, cw, ch);
          ctx.font = 'bold 16px monospace';
          ctx.fillStyle = '#44dd44';
          ctx.textAlign = 'center';
          ctx.fillText('\u2713', ex + cw / 2, ey + ch / 2 + 6);
          ctx.textAlign = 'left';
        } else {
          // Future step — subtle cyan glow only
          ctx.strokeStyle = `rgba(0,220,240,${0.15 + pulse * 0.1})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(ex + 1, ey + 1, cw - 2, ch - 2);
        }
      }
  },

  // ===================== SKELD VENT (dark grate, 2x2) =====================
  skeld_vent: (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    // Dark recessed floor
    ctx.fillStyle = '#080a0e';
    ctx.fillRect(ex, ey, cw, ch);
    // Vent grate slats (horizontal lines)
    ctx.strokeStyle = '#2a3040';
    ctx.lineWidth = 3;
    const slats = 7;
    for (let i = 1; i < slats; i++) {
      const sy = ey + (ch / slats) * i;
      ctx.beginPath();
      ctx.moveTo(ex + 6, sy);
      ctx.lineTo(ex + cw - 6, sy);
      ctx.stroke();
    }
    // Outer frame
    ctx.strokeStyle = '#3a4555';
    ctx.lineWidth = 2;
    ctx.strokeRect(ex + 1, ey + 1, cw - 2, ch - 2);
    // Inner frame
    ctx.strokeStyle = '#1a2030';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + 4, ey + 4, cw - 8, ch - 8);
    // Green glow when player is nearby
    if (typeof VentSystem !== 'undefined' && VentSystem.isNearVent(e.ventId)) {
      const pulse = 0.25 + 0.15 * Math.sin(t * 3);
      ctx.strokeStyle = 'rgba(40,255,80,' + pulse + ')';
      ctx.lineWidth = 2;
      ctx.strokeRect(ex - 1, ey - 1, cw + 2, ch + 2);
    }
  },

  // ===================== SKELD EMERGENCY TABLE (Among Us cafeteria button) =====================
  skeld_emergency_table: (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    const cx = ex + cw / 2;
    const cy = ey + ch / 2;

    // Table shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, cw / 2 - 2, ch / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Table surface — dark metallic grey, round
    ctx.fillStyle = '#2a2a35';
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw / 2 - 4, ch / 2 - 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Table edge ring (lighter rim)
    ctx.strokeStyle = '#444450';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw / 2 - 4, ch / 2 - 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner detail ring
    ctx.strokeStyle = '#333340';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw / 2 - 14, ch / 2 - 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // ---- Red emergency button (center) ----
    // Check if player can call emergency for glow effect
    const canCall = typeof MafiaSystem !== 'undefined' && MafiaSystem.canCallEmergency();
    const pulse = canCall ? (0.5 + Math.sin(t * 3) * 0.5) : 0;

    // Button glow ring (when available)
    if (canCall) {
      ctx.shadowColor = 'rgba(255,50,30,0.6)';
      ctx.shadowBlur = 10 + pulse * 8;
    }

    // Button base (darker red circle)
    ctx.fillStyle = '#4a1515';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Button top (bright red dome)
    ctx.fillStyle = canCall ? `rgb(${200 + pulse * 55}, ${30 + pulse * 20}, ${20 + pulse * 10})` : '#882020';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 11, 0, Math.PI * 2);
    ctx.fill();

    // Button highlight (glossy shine)
    ctx.fillStyle = canCall ? `rgba(255,180,150,${0.25 + pulse * 0.2})` : 'rgba(255,150,120,0.1)';
    ctx.beginPath();
    ctx.arc(cx - 3, cy - 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // Button ring
    ctx.strokeStyle = canCall ? '#ff4444' : '#662222';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // "EMERGENCY" label on table (small text, curved feel)
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = canCall ? `rgba(255,100,80,${0.5 + pulse * 0.3})` : 'rgba(180,80,60,0.3)';
    ctx.fillText('EMERGENCY', cx, cy + 22);
    ctx.textAlign = 'left';
  },

  // ===================== SKELD SABOTAGE CONSOLE (red wall-mounted) =====================
  skeld_sabotage: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      const t = Date.now() / 1000;
      const pulse = 0.5 + Math.sin(t * 2.5 + e.tx * 0.5) * 0.4;
      // Console body — dark metal with red undertone
      ctx.fillStyle = '#1a1210';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#221816';
      ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
      // Yellow/black warning stripes along bottom
      const stripeY = ey + ch - 6;
      for (let i = 0; i < cw - 4; i += 8) {
        ctx.fillStyle = (Math.floor(i / 8) % 2 === 0) ? '#c0a020' : '#1a1210';
        ctx.fillRect(ex + 2 + i, stripeY, Math.min(8, cw - 4 - i), 4);
      }
      // Screen area (inset)
      const sx = ex + 6, sy = ey + 4, sw = cw - 12, sh = ch - 14;
      ctx.fillStyle = '#180808';
      ctx.fillRect(sx, sy, sw, sh);
      // Red/orange screen glow
      ctx.fillStyle = `rgba(255,60,30,${0.12 + pulse * 0.1})`;
      ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
      // Caution triangle with "!"
      const tcx = sx + sw / 2, tcy = sy + sh / 2;
      ctx.strokeStyle = `rgba(255,200,40,${0.5 + pulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tcx, tcy - 6);
      ctx.lineTo(tcx + 6, tcy + 4);
      ctx.lineTo(tcx - 6, tcy + 4);
      ctx.closePath();
      ctx.stroke();
      ctx.font = "bold 7px monospace";
      ctx.fillStyle = `rgba(255,200,40,${0.6 + pulse * 0.3})`;
      ctx.textAlign = "center";
      ctx.fillText("!", tcx, tcy + 3);
      ctx.textAlign = "left";
      // Red LED (bottom-right)
      ctx.fillStyle = `rgba(255,40,20,${0.5 + pulse * 0.4})`;
      ctx.beginPath();
      ctx.arc(ex + cw - 8, ey + ch - 9, 2, 0, Math.PI * 2);
      ctx.fill();
      // Red halo glow
      ctx.shadowColor = 'rgba(255,40,20,0.35)';
      ctx.shadowBlur = 8 + pulse * 5;
      ctx.strokeStyle = `rgba(255,40,20,${0.15 + pulse * 0.1})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(ex + 1, ey + 1, cw - 2, ch - 2);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
  },

  // ===================== SKELD CAMERA MOUNT (wall-mounted security camera) =====================
  skeld_camera_mount: (e, ctx, ex, ey, w, h) => {
    const t = Date.now() / 1000;
    const watching = typeof CameraState !== 'undefined' && CameraState.active;
    const blink = watching ? Math.sin(t * 8) > 0 : Math.sin(t * 1.5) > 0.7;

    // Camera bracket (dark metal mount on wall)
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(ex + TILE / 2 - 8, ey + 4, 16, 10);

    // Camera arm (angled down)
    ctx.fillStyle = '#222230';
    ctx.fillRect(ex + TILE / 2 - 3, ey + 12, 6, 12);

    // Camera body (rectangular lens housing)
    ctx.fillStyle = '#151520';
    ctx.fillRect(ex + TILE / 2 - 10, ey + 22, 20, 12);
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + TILE / 2 - 10, ey + 22, 20, 12);

    // Lens (dark circle)
    ctx.fillStyle = '#0a0a10';
    ctx.beginPath();
    ctx.arc(ex + TILE / 2, ey + 28, 4, 0, Math.PI * 2);
    ctx.fill();

    // Lens reflection
    ctx.fillStyle = 'rgba(100,150,200,0.3)';
    ctx.beginPath();
    ctx.arc(ex + TILE / 2 - 1, ey + 27, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Red LED indicator (blinks when someone is watching cams)
    if (blink) {
      // Red glow
      ctx.shadowColor = 'rgba(255,30,20,0.6)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(255,40,30,0.9)';
      ctx.beginPath();
      ctx.arc(ex + TILE / 2 + 7, ey + 24, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    } else {
      // Dim LED
      ctx.fillStyle = 'rgba(60,20,15,0.5)';
      ctx.beginPath();
      ctx.arc(ex + TILE / 2 + 7, ey + 24, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // ===================== SKELD SECURITY CAMERAS (Among Us camera desk) =====================
  skeld_cameras: (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;

    // === Desk body — dark metal console ===
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(ex, ey + ch * 0.35, cw, ch * 0.65);
    ctx.fillStyle = '#222230';
    ctx.fillRect(ex + 3, ey + ch * 0.35 + 3, cw - 6, ch * 0.65 - 6);

    // Desk edge highlight
    ctx.strokeStyle = '#333345';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ex + 1, ey + ch * 0.35, cw - 2, ch * 0.65);

    // === Monitor bank (4 screens in 2×2 grid) ===
    const monW = (cw - 20) / 2;
    const monH = (ch * 0.55 - 12) / 2;
    const monStartX = ex + 8;
    const monStartY = ey + 4;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const mx = monStartX + col * (monW + 4);
        const my = monStartY + row * (monH + 3);

        // Monitor frame — dark metal
        ctx.fillStyle = '#0e0e14';
        ctx.fillRect(mx, my, monW, monH);

        // Screen — dark blue-green with slight static
        const flicker = 0.03 * Math.sin(t * 4 + col * 2 + row * 3);
        ctx.fillStyle = `rgba(15,30,35,${0.9 + flicker})`;
        ctx.fillRect(mx + 2, my + 2, monW - 4, monH - 4);

        // Screen scan line (slow moving horizontal line)
        const scanY = my + 2 + ((t * 12 + row * 30 + col * 17) % (monH - 4));
        ctx.fillStyle = 'rgba(40,80,90,0.25)';
        ctx.fillRect(mx + 2, scanY, monW - 4, 1.5);

        // Faint camera feed placeholder — grid lines suggesting a room view
        ctx.strokeStyle = 'rgba(30,60,70,0.3)';
        ctx.lineWidth = 0.5;
        // horizontal lines
        for (let i = 1; i < 3; i++) {
          const ly = my + 2 + i * ((monH - 4) / 3);
          ctx.beginPath();
          ctx.moveTo(mx + 4, ly);
          ctx.lineTo(mx + monW - 4, ly);
          ctx.stroke();
        }
        // vertical lines
        for (let i = 1; i < 4; i++) {
          const lx = mx + 2 + i * ((monW - 4) / 4);
          ctx.beginPath();
          ctx.moveTo(lx, my + 4);
          ctx.lineTo(lx, my + monH - 4);
          ctx.stroke();
        }

        // Small REC indicator (top-left of each screen)
        const recPulse = Math.sin(t * 2 + col + row * 2) > 0;
        if (recPulse) {
          ctx.fillStyle = 'rgba(255,40,30,0.7)';
          ctx.beginPath();
          ctx.arc(mx + 6, my + 6, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Screen border glow
        ctx.strokeStyle = 'rgba(40,90,100,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(mx + 1, my + 1, monW - 2, monH - 2);
      }
    }

    // === Desk surface details ===
    // Small keyboard area (center bottom)
    const kbW = cw * 0.4, kbH = 8;
    const kbX = ex + (cw - kbW) / 2, kbY = ey + ch - 16;
    ctx.fillStyle = '#151520';
    ctx.fillRect(kbX, kbY, kbW, kbH);
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 0.5;
    // Key rows
    for (let i = 0; i < 3; i++) {
      const ky = kbY + 1 + i * 2.5;
      for (let j = 0; j < 6; j++) {
        const kx = kbX + 2 + j * (kbW - 4) / 6;
        ctx.strokeRect(kx, ky, (kbW - 4) / 6 - 1, 2);
      }
    }

    // Status LED (bottom-right of desk)
    const ledPulse = 0.5 + Math.sin(t * 1.5) * 0.5;
    ctx.fillStyle = `rgba(40,180,120,${0.4 + ledPulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(ex + cw - 10, ey + ch - 8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // "CAMS" label on desk
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(100,160,180,0.4)';
    ctx.fillText('CAMS', ex + cw / 2, ey + ch - 4);
    ctx.textAlign = 'left';
  },

  // ===================== SKELD ELECTRICAL BOX (large block in Electrical room) =====================
  skeld_electrical_box: (e, ctx, ex, ey, w, h) => {
      const cw = w * TILE, ch = h * TILE;
      // Main box body — dark grey metal
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(ex, ey, cw, ch);
      ctx.fillStyle = '#363640';
      ctx.fillRect(ex + 3, ey + 3, cw - 6, ch - 6);
      // Border
      ctx.strokeStyle = '#1a1a1e';
      ctx.lineWidth = 3;
      ctx.strokeRect(ex, ey, cw, ch);

      // Left panel area (where the lights fix is) — slightly lighter
      const lpW = Math.floor(cw * 0.25);
      ctx.fillStyle = '#40404a';
      ctx.fillRect(ex + 4, ey + 4, lpW, ch - 8);
      ctx.strokeStyle = '#2a2a30';
      ctx.lineWidth = 1;
      ctx.strokeRect(ex + 4, ey + 4, lpW, ch - 8);

      // Hazard sign on left panel
      const hcx = ex + 4 + lpW / 2, hcy = ey + 20;
      ctx.fillStyle = '#ccaa20';
      ctx.beginPath();
      ctx.moveTo(hcx, hcy - 10);
      ctx.lineTo(hcx + 10, hcy + 6);
      ctx.lineTo(hcx - 10, hcy + 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', hcx, hcy + 4);
      ctx.textAlign = 'left';

      // Right area — horizontal black display bars (like circuit breaker panels)
      const barX = ex + 4 + lpW + 8;
      const barW = cw - lpW - 20;
      const barH = 20;
      const barGap = 8;
      for (let i = 0; i < 4; i++) {
        const by = ey + 16 + i * (barH + barGap);
        if (by + barH > ey + ch - 8) break;
        ctx.fillStyle = '#0a0a0e';
        ctx.fillRect(barX, by, barW, barH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, by, barW, barH);
        // Random wires / circuit lines
        ctx.strokeStyle = 'rgba(100,100,110,0.4)';
        ctx.lineWidth = 1;
        for (let j = 0; j < 3; j++) {
          const lx = barX + 4 + j * (barW / 3);
          ctx.beginPath();
          ctx.moveTo(lx, by); ctx.lineTo(lx + 10, by + barH);
          ctx.stroke();
        }
      }

      // Small LEDs along bottom — slow flicker (each LED toggles on its own ~2s cycle)
      const t2 = Date.now() / 1000;
      for (let i = 0; i < 6; i++) {
        const lx = ex + 20 + i * ((cw - 40) / 5);
        const ly = ey + ch - 12;
        const isOn = Math.sin(t2 * 1.5 + i * 1.8) > -0.2;
        ctx.fillStyle = isOn ? 'rgba(100,200,100,0.8)' : 'rgba(50,50,50,0.5)';
        ctx.beginPath();
        ctx.arc(lx, ly, 3, 0, Math.PI * 2);
        ctx.fill();
      }
  },

  // ---- VERSION SIGN ----
  version_sign: (e, ctx, ex, ey, w, h) => {
    const t = typeof gameFrame !== 'undefined' ? gameFrame / 60 : 0;
    const tw = w * TILE, th = h * TILE;

    // Sign post
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(ex + tw / 2 - 3, ey + th * 0.4, 6, th * 0.6);

    // Sign board
    const bx = ex + 4, by = ey + 2, bw = tw - 8, bh = th * 0.45;
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#0cf';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Glow pulse
    const glow = 0.5 + Math.sin(t * 2) * 0.2;
    ctx.fillStyle = `rgba(0,204,255,${glow * 0.08})`;
    ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);

    // Text
    const ver = typeof GAME_CONFIG !== 'undefined' ? GAME_CONFIG.GAME_UPDATE : '?';
    ctx.fillStyle = `rgba(0,204,255,${0.8 + Math.sin(t * 2) * 0.15})`;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UPDATE', ex + tw / 2, by + bh * 0.4 + 2);
    ctx.font = 'bold 16px monospace';
    ctx.fillText('#' + ver, ex + tw / 2, by + bh * 0.8 + 2);
    ctx.textAlign = 'left';
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

// Register diner ingredient entity renderers
if (typeof DINER_INGREDIENTS !== 'undefined' && typeof DINER_ENTITY_TO_INGREDIENT !== 'undefined') {
  const _dinerIngredientRenderer = (e, ctx, ex, ey, w, h) => {
    const cw = (w || 2) * TILE, ch = (h || 2) * TILE;
    const ingId = DINER_ENTITY_TO_INGREDIENT[e.type];
    const ing = ingId ? DINER_INGREDIENTS[ingId] : null;
    const color = ing ? ing.color : '#888';
    const name = ing ? ing.name : e.type;

    // Chrome counter surface (diner style)
    ctx.fillStyle = '#c0c0c8';
    ctx.fillRect(ex, ey, cw, ch);
    ctx.fillStyle = '#d0d0d8';
    ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
    ctx.fillStyle = '#e0e0e8';
    ctx.fillRect(ex + 2, ey + 2, cw - 4, 3);

    // Ingredient item (centered blob)
    const itemW = cw * 0.6, itemH = ch * 0.45;
    const ix = ex + (cw - itemW) / 2, iy = ey + ch * 0.1;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(ix + 4, iy + 3, itemW - 8, itemH * 0.3);

    // Name label
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(ex, ey + ch - 18, cw, 18);
    ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = '#000'; ctx.fillText(name, ex + cw / 2 + 1, ey + ch - 5 + 1);
    ctx.fillStyle = '#fff'; ctx.fillText(name, ex + cw / 2, ey + ch - 5);
    ctx.textAlign = "left";
  };
  for (const [id, data] of Object.entries(DINER_INGREDIENTS)) {
    ENTITY_RENDERERS[data.entity] = _dinerIngredientRenderer;
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
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.48, 9, 0, 0, Math.PI*2); ctx.fill();
    // Main structure — dark
    ctx.fillStyle = '#12121e';
    ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
    // Steel panel lines
    ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
    for (let r = 0; r < 5; r++) {
      const ly = ey+ch*0.3+r*ch*0.14;
      ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
    }
    // Roof — angular
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
    ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
    ctx.closePath(); ctx.fill();
    // Red neon trim
    ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
    ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
    ctx.stroke();
    // Windows — red forge glow
    const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
    for (let wr = 0; wr < 2; wr++) {
      for (let wc = 0; wc < 2; wc++) {
        const wx = ex + cw*0.1 + wc*cw*0.42;
        const wy = ey + ch*0.32 + wr*ch*0.24;
        ctx.fillStyle = '#0a0a18';
        ctx.fillRect(wx, wy, cw*0.28, ch*0.14);
        ctx.fillStyle = `rgba(255,68,68,${glow * 0.25})`;
        ctx.fillRect(wx+1, wy+1, cw*0.28-2, ch*0.14-2);
        ctx.strokeStyle = `rgba(255,68,68,${glow * 0.6})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, cw*0.28, ch*0.14);
      }
    }
    // Door
    ctx.fillStyle = '#08081a';
    ctx.fillRect(ex+cw*0.35, ey+ch*0.75, cw*0.3, ch*0.25);
    ctx.strokeStyle = `rgba(255,68,68,${0.6 + Math.sin(t*2)*0.2})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(ex+cw*0.35, ey+ch*0.75, cw*0.3, ch*0.25);
    // Neon side strips
    ctx.fillStyle = `rgba(255,68,68,${0.15 + Math.sin(t*1.2)*0.08})`;
    ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
    ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
    // Neon sign
    const signGlow = 0.7 + Math.sin(t * 2.5) * 0.2;
    ctx.font = "bold 9px monospace";
    ctx.fillStyle = `rgba(255,68,68,${signGlow})`;
    ctx.textAlign = "center";
    ctx.fillText("GUNSMITH", ex+cw/2, ey+ch*0.16);
    // Label
    ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ff4444';
    ctx.fillText("Gunsmith", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
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

// ===================== MINING SHOP NPC =====================
ENTITY_RENDERERS.mining_npc = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const bx = ex + cw / 2, by = ey + ch / 2;
    const t = Date.now() / 1000;
    const bob = Math.sin(t * 1.2) * 1.5;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(bx, by + 30, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    // Body (miner outfit — dark grey)
    ctx.fillStyle = '#4a4a50'; ctx.fillRect(bx - 10, by - 8 + bob, 20, 28);
    // Vest
    ctx.fillStyle = '#6a5a30'; ctx.fillRect(bx - 8, by - 4 + bob, 16, 20);
    // Head
    ctx.fillStyle = '#c8a888'; ctx.fillRect(bx - 7, by - 22 + bob, 14, 14);
    // Mining helmet
    ctx.fillStyle = '#cc8800'; ctx.fillRect(bx - 9, by - 26 + bob, 18, 8);
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(bx - 2, by - 28 + bob, 4, 4); // headlamp
    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(bx - 4, by - 17 + bob, 3, 3);
    ctx.fillRect(bx + 2, by - 17 + bob, 3, 3);
    // Beard (scruffy)
    ctx.fillStyle = '#5a4a38';
    ctx.fillRect(bx - 4, by - 12 + bob, 8, 5);
    // Pickaxe in hand
    ctx.fillStyle = '#7a6a50'; ctx.fillRect(bx + 10, by - 10 + bob, 3, 22); // handle
    ctx.fillStyle = '#8a8a90'; // pick head
    ctx.beginPath();
    ctx.moveTo(bx + 7, by - 12 + bob);
    ctx.lineTo(bx + 17, by - 12 + bob);
    ctx.lineTo(bx + 19, by - 10 + bob);
    ctx.lineTo(bx + 7, by - 10 + bob);
    ctx.fill();
    // Name label
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText('Mining Shop', bx + 1, ey - 4 + bob + 1);
    ctx.fillStyle = '#ff8800';
    ctx.fillText('Mining Shop', bx, ey - 4 + bob);
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

ENTITY_RENDERERS.gunsmith_entrance = (e, ctx, ex, ey, w, h) => {
    const ew = w * TILE, eh = h * TILE;
    const t = Date.now() / 1000;
    const glow = 0.4 + Math.sin(t * 2) * 0.15;
    ctx.fillStyle = `rgba(255,68,68,${glow * 0.12})`;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeStyle = `rgba(255,68,68,${glow * 0.5})`;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = `rgba(255,68,68,${glow * 0.8})`;
    ctx.textAlign = "center";
    ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 12);
    ctx.textAlign = "left";
};

// ===================== MAFIA LOBBY ENTITY RENDERERS =====================

ENTITY_RENDERERS.mafia_lobby_laptop = (e, ctx, ex, ey, w, h) => {
  const tw = w * TILE, th = h * TILE;
  // Desk body
  ctx.fillStyle = '#3a3a42';
  ctx.beginPath();
  ctx.roundRect(ex + 4, ey + th * 0.4, tw - 8, th * 0.6 - 4, 4);
  ctx.fill();
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Desk legs
  ctx.fillStyle = '#2a2a32';
  ctx.fillRect(ex + 10, ey + th - 8, 6, 8);
  ctx.fillRect(ex + tw - 16, ey + th - 8, 6, 8);
  // Laptop screen (open, tilted back)
  const scrX = ex + tw * 0.2, scrY = ey + 4;
  const scrW = tw * 0.6, scrH = th * 0.4;
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.roundRect(scrX, scrY, scrW, scrH, 3);
  ctx.fill();
  // Screen glow
  ctx.fillStyle = '#1a3a5a';
  ctx.fillRect(scrX + 3, scrY + 3, scrW - 6, scrH - 6);
  // Screen content — gear icon
  const gcx = scrX + scrW / 2, gcy = scrY + scrH / 2;
  ctx.strokeStyle = '#66aaff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(gcx, gcy, 6, 0, Math.PI * 2);
  ctx.stroke();
  for (let a = 0; a < 6; a++) {
    const ang = a * Math.PI / 3;
    ctx.beginPath();
    ctx.moveTo(gcx + Math.cos(ang) * 5, gcy + Math.sin(ang) * 5);
    ctx.lineTo(gcx + Math.cos(ang) * 9, gcy + Math.sin(ang) * 9);
    ctx.stroke();
  }
  // Keyboard on desk
  ctx.fillStyle = '#444';
  ctx.fillRect(ex + tw * 0.25, ey + th * 0.5, tw * 0.5, th * 0.15);
  // Label
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#88bbff';
  ctx.textAlign = 'center';
  ctx.fillText('SETTINGS', ex + tw / 2, ey + th + 12);
  ctx.textAlign = 'left';
};

ENTITY_RENDERERS.mafia_lobby_customize = (e, ctx, ex, ey, w, h) => {
  const tw = w * TILE, th = h * TILE;
  // Mirror frame
  ctx.fillStyle = '#4a4a52';
  ctx.beginPath();
  ctx.roundRect(ex + 8, ey, tw - 16, th - 8, 6);
  ctx.fill();
  // Mirror surface (reflective gradient)
  const grad = ctx.createLinearGradient(ex + 14, ey + 6, ex + tw - 14, ey + th - 14);
  grad.addColorStop(0, '#557788');
  grad.addColorStop(0.5, '#88aacc');
  grad.addColorStop(1, '#557788');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(ex + 14, ey + 6, tw - 28, th - 20, 4);
  ctx.fill();
  // Mirror shine
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ex + 20, ey + 10);
  ctx.lineTo(ex + 30, ey + 10);
  ctx.stroke();
  // Stand/shelf below
  ctx.fillStyle = '#3a3a42';
  ctx.fillRect(ex + 4, ey + th - 12, tw - 8, 12);
  // Color dots on shelf (preview)
  const colors = ['#c51111', '#132ed1', '#127f2d', '#ed54ba', '#ef7d0e'];
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = colors[i];
    ctx.beginPath();
    ctx.arc(ex + tw * 0.2 + i * (tw * 0.15), ey + th - 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Label
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#ffaa44';
  ctx.textAlign = 'center';
  ctx.fillText('CUSTOMIZE', ex + tw / 2, ey + th + 12);
  ctx.textAlign = 'left';
};

ENTITY_RENDERERS.mafia_lobby_start = (e, ctx, ex, ey, w, h) => {
  const tw = w * TILE, th = h * TILE;
  const cx = ex + tw / 2, cy = ey + th / 2;
  // Platform base
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(cx, cy + th * 0.3, tw * 0.4, th * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Button pedestal
  ctx.fillStyle = '#444';
  ctx.fillRect(cx - 18, cy - 10, 36, 24);
  // Big red button
  const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.003);
  ctx.fillStyle = `rgba(220,40,40,${pulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ff6666';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Button shine
  ctx.fillStyle = 'rgba(255,150,150,0.4)';
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 8, 5, 0, Math.PI * 2);
  ctx.fill();
  // Label
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText('START', cx, ey + th + 14);
  ctx.textAlign = 'left';
};

ENTITY_RENDERERS.mafia_lobby_crate = (e, ctx, ex, ey, w, h) => {
  const tw = w * TILE, th = h * TILE;
  // Main crate body — green-grey like Among Us
  ctx.fillStyle = '#5a7a6a';
  ctx.beginPath();
  ctx.roundRect(ex + 2, ey + 4, tw - 4, th - 4, 4);
  ctx.fill();
  ctx.strokeStyle = '#4a6a5a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cross bands
  ctx.strokeStyle = '#3a5a4a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ex + 2, ey + th / 2);
  ctx.lineTo(ex + tw - 2, ey + th / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex + tw / 2, ey + 4);
  ctx.lineTo(ex + tw / 2, ey + th - 4);
  ctx.stroke();
  // Lid highlight
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(ex + 4, ey + 6, tw - 8, th * 0.3);
};

ENTITY_RENDERERS.mafia_lobby_crate_sm = (e, ctx, ex, ey, w, h) => {
  const tw = w * TILE, th = h * TILE;
  ctx.fillStyle = '#5a7a6a';
  ctx.beginPath();
  ctx.roundRect(ex + 2, ey + 4, tw - 4, th - 4, 3);
  ctx.fill();
  ctx.strokeStyle = '#4a6a5a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.strokeStyle = '#3a5a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ex + 2, ey + th / 2);
  ctx.lineTo(ex + tw - 2, ey + th / 2);
  ctx.stroke();
};

// ===================== MAFIA LOBBY EXIT DOOR =====================
ENTITY_RENDERERS.mafia_lobby_exit = (e, ctx, ex, ey, w, h) => {
  const tw = w * TILE, th = h * TILE;
  // Floor arrow indicators pointing down (toward exit)
  const cx = ex + tw / 2;
  const t = (typeof gameFrame !== 'undefined' ? gameFrame : 0) / 60;
  const pulse = 0.5 + Math.sin(t * 3) * 0.3;
  // "EXIT" text
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(200,60,60,${0.6 + pulse * 0.3})`;
  ctx.fillText('EXIT', cx, ey + th / 2 - 4);
  // Downward arrow
  ctx.strokeStyle = `rgba(200,60,60,${0.4 + pulse * 0.3})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, ey + th / 2 + 4);
  ctx.lineTo(cx, ey + th - 6);
  ctx.moveTo(cx - 8, ey + th - 14);
  ctx.lineTo(cx, ey + th - 6);
  ctx.lineTo(cx + 8, ey + th - 14);
  ctx.stroke();
  ctx.textAlign = 'left';
};

// ===================== VORTALIS DUNGEON ENTITY RENDERERS =====================
ENTITY_RENDERERS.building_vortalis = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.48, 9, 0, 0, Math.PI*2); ctx.fill();
    // Main structure — dark teal/ocean wood
    ctx.fillStyle = '#142028';
    ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
    // Plank lines (horizontal)
    ctx.strokeStyle = '#1a2a30'; ctx.lineWidth = 1;
    for (let r = 0; r < 5; r++) {
      const ly = ey+ch*0.3+r*ch*0.14;
      ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
    }
    // Roof — nautical/pirate style
    ctx.fillStyle = '#1a3030';
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
    ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
    ctx.closePath(); ctx.fill();
    // Roof highlight
    ctx.fillStyle = '#1a3a3a';
    ctx.beginPath();
    ctx.moveTo(ex+cw*0.3, ey+ch*0.04); ctx.lineTo(ex+cw*0.7, ey+ch*0.04);
    ctx.lineTo(ex+cw+6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey+ch*0.24);
    ctx.closePath(); ctx.fill();
    // Teal glow trim on roof edge
    ctx.strokeStyle = '#22aacc'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.3, ey+ch*0.04);
    ctx.lineTo(ex+cw*0.7, ey+ch*0.04); ctx.lineTo(ex+cw+6, ey+ch*0.24);
    ctx.stroke();
    // Porthole windows
    const portGlow = 0.5 + Math.sin(t * 1.5) * 0.2;
    for (let pw = 0; pw < 3; pw++) {
      const px = ex + cw*0.2 + pw * cw*0.25;
      const py = ey + ch*0.5;
      ctx.fillStyle = `rgba(34,170,204,${portGlow * 0.4})`;
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2a3a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.stroke();
    }
    // Anchor icon
    ctx.strokeStyle = `rgba(34,170,204,${portGlow * 0.6})`; ctx.lineWidth = 2;
    const ax = ex + cw/2, ay = ey + ch*0.75;
    ctx.beginPath(); ctx.moveTo(ax, ay-10); ctx.lineTo(ax, ay+6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax-6, ay+2); ctx.lineTo(ax+6, ay+2); ctx.stroke();
    ctx.beginPath(); ctx.arc(ax, ay-12, 4, 0, Math.PI * 2); ctx.stroke();
    // Sign
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(34,170,204,${portGlow * 0.8})`;
    ctx.fillText('VORTALIS', ex + cw/2, ey + ch*0.18);
    ctx.textAlign = 'left';
};
ENTITY_RENDERERS.vortalis_entrance = (e, ctx, ex, ey, w, h) => {
    const ew = w * TILE, eh = h * TILE;
    const t = Date.now() / 1000;
    const glow = 0.4 + Math.sin(t * 2) * 0.15;
    // Glowing floor pad — teal ocean
    ctx.fillStyle = `rgba(34,170,204,${glow * 0.15})`;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeStyle = `rgba(34,170,204,${glow * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
    // Arrow hint
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(34,170,204,${glow * 0.7})`;
    ctx.textAlign = "center";
    ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.vortalis_exit = (e, ctx, ex, ey, w, h) => {
    const t = Date.now() / 1000;
    ctx.fillStyle = `rgba(34,170,204,${0.15 + Math.sin(t * 2) * 0.05})`;
    ctx.fillRect(ex + 4, ey + 4, w * TILE - 8, h * TILE - 8);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(34,170,204,${0.6 + Math.sin(t * 3) * 0.2})`;
    ctx.textAlign = "center";
    ctx.fillText("\u27F5 EXIT \u27F6", ex + w * TILE / 2, ey + h * TILE + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.ocean_lantern = (e, ctx, ex, ey) => {
    const t = Date.now() / 1000;
    const flicker = 0.5 + Math.sin(t * 3 + e.tx * 2) * 0.15;
    // Glow
    ctx.fillStyle = `rgba(34,170,204,${flicker * 0.1})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2, 20, 0, Math.PI * 2); ctx.fill();
    // Lantern body
    ctx.fillStyle = '#1a2a2a';
    ctx.fillRect(ex + TILE/2 - 4, ey + TILE/2 - 6, 8, 12);
    // Flame
    ctx.fillStyle = `rgba(34,200,220,${flicker})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2 - 2, 3, 0, Math.PI * 2); ctx.fill();
};

// ===================== EARTH-205 DUNGEON ENTITY RENDERERS =====================
ENTITY_RENDERERS.building_earth205 = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.48, 9, 0, 0, Math.PI*2); ctx.fill();
    // Main structure — dark stone
    ctx.fillStyle = '#141210';
    ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
    // Stone brick lines
    ctx.strokeStyle = '#1a1816'; ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) {
      const ly = ey+ch*0.28+r*ch*0.12;
      ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      const off = r % 2 === 0 ? cw*0.3 : cw*0.6;
      ctx.beginPath(); ctx.moveTo(ex+off, ly); ctx.lineTo(ex+off, ly+ch*0.12); ctx.stroke();
    }
    // Roof — gothic peaked
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey-2);
    ctx.lineTo(ex+cw+6, ey+ch*0.24);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#88cc44'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey-2);
    ctx.lineTo(ex+cw+6, ey+ch*0.24);
    ctx.stroke();
    // Wrought iron windows
    const winGlow = 0.5 + Math.sin(t * 1.2) * 0.2;
    for (let pw = 0; pw < 3; pw++) {
      const px = ex + cw*0.2 + pw * cw*0.25;
      const py = ey + ch*0.48;
      ctx.fillStyle = `rgba(136,204,68,${winGlow * 0.3})`;
      ctx.fillRect(px-5, py-8, 10, 16);
      ctx.strokeStyle = '#2a2820'; ctx.lineWidth = 2;
      ctx.strokeRect(px-5, py-8, 10, 16);
      ctx.beginPath(); ctx.moveTo(px-5, py); ctx.lineTo(px+5, py); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, py-8); ctx.lineTo(px, py+8); ctx.stroke();
    }
    // Gas lamp
    ctx.fillStyle = `rgba(204,102,34,${winGlow * 0.6})`;
    ctx.beginPath(); ctx.arc(ex+cw/2, ey+ch*0.72, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(204,102,34,${winGlow * 0.15})`;
    ctx.beginPath(); ctx.arc(ex+cw/2, ey+ch*0.72, 14, 0, Math.PI*2); ctx.fill();
    // Sign
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(136,204,68,${winGlow * 0.8})`;
    ctx.fillText('EARTH-205', ex + cw/2, ey + ch*0.18);
    ctx.textAlign = 'left';
};
ENTITY_RENDERERS.earth205_entrance = (e, ctx, ex, ey, w, h) => {
    const ew = w * TILE, eh = h * TILE;
    const t = Date.now() / 1000;
    const glow = 0.4 + Math.sin(t * 2) * 0.15;
    ctx.fillStyle = `rgba(136,204,68,${glow * 0.15})`;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeStyle = `rgba(136,204,68,${glow * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(136,204,68,${glow * 0.7})`;
    ctx.textAlign = "center";
    ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.earth205_exit = (e, ctx, ex, ey, w, h) => {
    const t = Date.now() / 1000;
    ctx.fillStyle = `rgba(136,204,68,${0.15 + Math.sin(t * 2) * 0.05})`;
    ctx.fillRect(ex + 4, ey + 4, w * TILE - 8, h * TILE - 8);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(136,204,68,${0.6 + Math.sin(t * 3) * 0.2})`;
    ctx.textAlign = "center";
    ctx.fillText("\u27F5 EXIT \u27F6", ex + w * TILE / 2, ey + h * TILE + 14);
    ctx.textAlign = "left";
};
// ===================== WAGASHI DUNGEON ENTITY RENDERERS =====================
ENTITY_RENDERERS.building_wagashi = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.48, 9, 0, 0, Math.PI*2); ctx.fill();
    // Main structure — dark wood
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(ex+6, ey+ch*0.35, cw-12, ch*0.65);
    // Wooden panel lines
    ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 1;
    for (let r = 0; r < 5; r++) {
      const ly = ey+ch*0.40+r*ch*0.12;
      ctx.beginPath(); ctx.moveTo(ex+8, ly); ctx.lineTo(ex+cw-8, ly); ctx.stroke();
    }
    // Second tier (smaller)
    ctx.fillStyle = '#1a0e08';
    ctx.fillRect(ex+cw*0.12, ey+ch*0.18, cw*0.76, ch*0.20);
    // Pagoda roof — bottom tier
    ctx.fillStyle = '#8b1a1a';
    ctx.beginPath();
    ctx.moveTo(ex-8, ey+ch*0.37); ctx.lineTo(ex+cw*0.5, ey+ch*0.28);
    ctx.lineTo(ex+cw+8, ey+ch*0.37);
    ctx.closePath(); ctx.fill();
    // Roof edge trim
    ctx.strokeStyle = '#cc9933'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex-8, ey+ch*0.37); ctx.lineTo(ex+cw*0.5, ey+ch*0.28);
    ctx.lineTo(ex+cw+8, ey+ch*0.37);
    ctx.stroke();
    // Pagoda roof — top tier
    ctx.fillStyle = '#8b1a1a';
    ctx.beginPath();
    ctx.moveTo(ex+cw*0.08, ey+ch*0.20); ctx.lineTo(ex+cw*0.5, ey+ch*0.06);
    ctx.lineTo(ex+cw*0.92, ey+ch*0.20);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#cc9933'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex+cw*0.08, ey+ch*0.20); ctx.lineTo(ex+cw*0.5, ey+ch*0.06);
    ctx.lineTo(ex+cw*0.92, ey+ch*0.20);
    ctx.stroke();
    // Roof finial (spire)
    ctx.fillStyle = '#cc9933';
    ctx.fillRect(ex+cw/2-1, ey-4, 2, ch*0.08);
    ctx.beginPath(); ctx.arc(ex+cw/2, ey-4, 3, 0, Math.PI*2); ctx.fill();
    // Shoji screen windows
    const winGlow = 0.5 + Math.sin(t * 1.2) * 0.2;
    for (let pw = 0; pw < 3; pw++) {
      const px = ex + cw*0.2 + pw * cw*0.25;
      const py = ey + ch*0.55;
      ctx.fillStyle = `rgba(255,220,160,${winGlow * 0.25})`;
      ctx.fillRect(px-6, py-10, 12, 20);
      ctx.strokeStyle = '#2a1810'; ctx.lineWidth = 1;
      ctx.strokeRect(px-6, py-10, 12, 20);
      // Shoji grid
      ctx.beginPath(); ctx.moveTo(px, py-10); ctx.lineTo(px, py+10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px-6, py); ctx.lineTo(px+6, py); ctx.stroke();
    }
    // Entrance lantern glow
    ctx.fillStyle = `rgba(255,80,40,${winGlow * 0.5})`;
    ctx.beginPath(); ctx.arc(ex+cw/2, ey+ch*0.78, 4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,80,40,${winGlow * 0.12})`;
    ctx.beginPath(); ctx.arc(ex+cw/2, ey+ch*0.78, 14, 0, Math.PI*2); ctx.fill();
    // Sign
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(204,153,51,${winGlow * 0.9})`;
    ctx.fillText('WAGASHI', ex + cw/2, ey + ch*0.15);
    ctx.textAlign = 'left';
};
ENTITY_RENDERERS.wagashi_entrance = (e, ctx, ex, ey, w, h) => {
    const ew = w * TILE, eh = h * TILE;
    const t = Date.now() / 1000;
    const glow = 0.4 + Math.sin(t * 2) * 0.15;
    ctx.fillStyle = `rgba(204,153,51,${glow * 0.15})`;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeStyle = `rgba(204,153,51,${glow * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(204,153,51,${glow * 0.7})`;
    ctx.textAlign = "center";
    ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.wagashi_exit = (e, ctx, ex, ey, w, h) => {
    const t = Date.now() / 1000;
    ctx.fillStyle = `rgba(204,153,51,${0.15 + Math.sin(t * 2) * 0.05})`;
    ctx.fillRect(ex + 4, ey + 4, w * TILE - 8, h * TILE - 8);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(204,153,51,${0.6 + Math.sin(t * 3) * 0.2})`;
    ctx.textAlign = "center";
    ctx.fillText("\u27F5 EXIT \u27F6", ex + w * TILE / 2, ey + h * TILE + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.paper_lantern = (e, ctx, ex, ey) => {
    const t = Date.now() / 1000;
    const flicker = 0.5 + Math.sin(t * 2.5 + e.tx * 3 + e.ty * 1.7) * 0.15;
    // Warm glow
    ctx.fillStyle = `rgba(255,80,40,${flicker * 0.08})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2, 22, 0, Math.PI * 2); ctx.fill();
    // String
    ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex + TILE/2, ey + TILE/2 - 14); ctx.lineTo(ex + TILE/2, ey + TILE/2 - 8); ctx.stroke();
    // Lantern body (oval)
    ctx.fillStyle = `rgba(200,40,30,${0.7 + flicker * 0.2})`;
    ctx.beginPath(); ctx.ellipse(ex + TILE/2, ey + TILE/2, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
    // Gold trim bands
    ctx.strokeStyle = `rgba(204,153,51,${0.6 + flicker * 0.2})`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ex + TILE/2 - 5, ey + TILE/2 - 2); ctx.lineTo(ex + TILE/2 + 5, ey + TILE/2 - 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex + TILE/2 - 5, ey + TILE/2 + 2); ctx.lineTo(ex + TILE/2 + 5, ey + TILE/2 + 2); ctx.stroke();
    // Inner flame
    ctx.fillStyle = `rgba(255,200,80,${flicker})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2, 2, 0, Math.PI * 2); ctx.fill();
};

// ===================== EARTH-216 DUNGEON ENTITY RENDERERS =====================
ENTITY_RENDERERS.building_earth216 = (e, ctx, ex, ey, w, h) => {
    const cw = w * TILE, ch = h * TILE;
    const t = Date.now() / 1000;
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(ex+cw/2+6, ey+ch+7, cw*0.48, 9, 0, 0, Math.PI*2); ctx.fill();
    // Main structure — dark with gold trim
    ctx.fillStyle = '#0e0c0a';
    ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
    // Brick pattern
    ctx.strokeStyle = '#1a1610'; ctx.lineWidth = 1;
    for (let r = 0; r < 6; r++) {
      const ly = ey+ch*0.28+r*ch*0.12;
      ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
      const off = r % 2 === 0 ? cw*0.3 : cw*0.6;
      ctx.beginPath(); ctx.moveTo(ex+off, ly); ctx.lineTo(ex+off, ly+ch*0.12); ctx.stroke();
    }
    // Roof — art deco peaked
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey-2);
    ctx.lineTo(ex+cw+6, ey+ch*0.24); ctx.closePath(); ctx.fill();
    // Gold roof trim
    ctx.strokeStyle = '#ccaa44'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ex-6, ey+ch*0.24); ctx.lineTo(ex+cw*0.5, ey-2);
    ctx.lineTo(ex+cw+6, ey+ch*0.24); ctx.stroke();
    // Neon border glow
    const nGlow = 0.5 + Math.sin(t * 2) * 0.2;
    ctx.strokeStyle = `rgba(204,68,68,${nGlow})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(ex+2, ey+ch*0.22, cw-4, ch*0.78);
    // Windows with neon glow
    const winGlow = 0.5 + Math.sin(t * 1.5) * 0.15;
    for (let wx = 0; wx < 3; wx++) {
      const px = ex + cw*0.2 + wx * cw*0.25;
      const py = ey + ch*0.45;
      ctx.fillStyle = `rgba(204,170,68,${winGlow * 0.3})`;
      ctx.fillRect(px-7, py-12, 14, 24);
      ctx.strokeStyle = '#ccaa44'; ctx.lineWidth = 1;
      ctx.strokeRect(px-7, py-12, 14, 24);
    }
    // Door
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(ex+cw/2-12, ey+ch*0.82, 24, ch*0.18);
    ctx.strokeStyle = '#ccaa44'; ctx.lineWidth = 1;
    ctx.strokeRect(ex+cw/2-12, ey+ch*0.82, 24, ch*0.18);
    // Sign
    ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(204,68,68,${nGlow * 0.9})`;
    ctx.fillText('EARTH-216', ex + cw/2, ey + ch*0.15);
    ctx.textAlign = 'left';
};
ENTITY_RENDERERS.earth216_entrance = (e, ctx, ex, ey, w, h) => {
    const ew = w * TILE, eh = h * TILE;
    const t = Date.now() / 1000;
    const glow = 0.4 + Math.sin(t * 2) * 0.15;
    ctx.fillStyle = `rgba(204,68,68,${glow * 0.15})`;
    ctx.fillRect(ex, ey, ew, eh);
    ctx.strokeStyle = `rgba(204,68,68,${glow * 0.5})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(204,68,68,${glow * 0.7})`;
    ctx.textAlign = "center";
    ctx.fillText("\u25B2 ENTER", ex + ew/2, ey + eh + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.earth216_exit = (e, ctx, ex, ey, w, h) => {
    const t = Date.now() / 1000;
    ctx.fillStyle = `rgba(204,68,68,${0.15 + Math.sin(t * 2) * 0.05})`;
    ctx.fillRect(ex + 4, ey + 4, w * TILE - 8, h * TILE - 8);
    ctx.font = "bold 12px monospace";
    ctx.fillStyle = `rgba(204,68,68,${0.6 + Math.sin(t * 3) * 0.2})`;
    ctx.textAlign = "center";
    ctx.fillText("\u27F5 EXIT \u27F6", ex + w * TILE / 2, ey + h * TILE + 14);
    ctx.textAlign = "left";
};
ENTITY_RENDERERS.neon_sign_e216 = (e, ctx, ex, ey) => {
    const t = Date.now() / 1000;
    const flicker = 0.5 + Math.sin(t * 3 + e.tx * 2 + e.ty * 1.5) * 0.2;
    // Neon glow
    ctx.fillStyle = `rgba(204,68,68,${flicker * 0.12})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2, 18, 0, Math.PI * 2); ctx.fill();
    // Sign body
    ctx.fillStyle = '#1a0808';
    ctx.fillRect(ex + TILE/2 - 6, ey + TILE/2 - 4, 12, 8);
    // Neon tube
    ctx.fillStyle = `rgba(204,68,68,${flicker})`;
    ctx.fillRect(ex + TILE/2 - 4, ey + TILE/2 - 2, 8, 4);
};

ENTITY_RENDERERS.gas_lamp = (e, ctx, ex, ey) => {
    const t = Date.now() / 1000;
    const flicker = 0.5 + Math.sin(t * 3 + e.tx * 2) * 0.15;
    ctx.fillStyle = `rgba(204,102,34,${flicker * 0.1})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.fillRect(ex + TILE/2 - 3, ey + TILE/2 - 8, 6, 16);
    ctx.fillStyle = `rgba(255,160,40,${flicker})`;
    ctx.beginPath(); ctx.arc(ex + TILE/2, ey + TILE/2 - 4, 3, 0, Math.PI * 2); ctx.fill();
};

function drawLevelEntities(camX, camY) {
  for (const e of levelEntities) {
    // In Skeld: hide gameplay entities (tasks, sabotage panels) outside FOV
    if (Scene.inSkeld && (e.type === 'skeld_task' || e.type === 'skeld_sabotage')
        && typeof isMafiaWorldPointVisible === 'function'
        && !isMafiaWorldPointVisible(e.tx * TILE + TILE / 2, e.ty * TILE + TILE / 2)) {
      continue;
    }
    const w = e.w ?? 1;
    const h = e.h ?? 1;
    const ex = e.tx * TILE - camX;
    const ey = e.ty * TILE - camY;
    const renderer = ENTITY_RENDERERS[e.type];
    if (renderer) renderer(e, ctx, ex, ey, w, h);
  }
  // Post-entity overlays (drawn AFTER all entities so they aren't painted over)
  if (typeof Scene !== 'undefined' && Scene.inCooking &&
      typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'diner') {
    _drawDinerTrayOverlay(camX, camY);
  }
  if (typeof Scene !== 'undefined' && Scene.inCooking &&
      typeof cookingState !== 'undefined' && cookingState.activeRestaurantId === 'fine_dining') {
    _drawFDTrayOverlay(camX, camY);
  }
}

// ===================== DINER TRAY OVERLAY =====================
// Rendered AFTER all entities so trays aren't hidden by the service counter.
// Trays appear at tx:15, ty:15 (1 tile right of pickup counter end, on service counter surface).
// Max tray size: 1 tile. Table number circle underneath.
function _drawDinerTrayOverlay(camX, camY) {
  const TRAY_TX = 15; // 1 tile right of pickup counter right edge (tx:14)
  const TRAY_TY = 15; // on the counter surface row
  let traySlot = 0;

  // Helper: draw one tray at a given slot
  function _drawTray(slot, items, tableNum, isComplete, progressText) {
    const trayX = (TRAY_TX - slot) * TILE + TILE / 2 - camX;
    const trayY = TRAY_TY * TILE + TILE / 2 - camY;
    const itemCount = items ? items.length : 0;
    // Tray grows with items, max 1 tile (TILE/2 radius)
    const maxR = TILE / 2 - 4;
    const trayW = Math.min(maxR, 12 + itemCount * 4);
    const trayH = Math.min(maxR * 0.45, 6 + itemCount * 2);
    // Tray base (chrome oval)
    ctx.fillStyle = '#a0a0a8';
    ctx.beginPath(); ctx.ellipse(trayX, trayY + 2, trayW + 2, trayH + 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8c8d0';
    ctx.beginPath(); ctx.ellipse(trayX, trayY, trayW, trayH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e0e0e8';
    ctx.beginPath(); ctx.ellipse(trayX, trayY - 1, trayW * 0.8, trayH * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    // Food items on tray
    if (items) {
      for (let fi = 0; fi < Math.min(itemCount, 4); fi++) {
        const spread = Math.min(itemCount, 4);
        const fx = trayX - (spread - 1) * 5 + fi * 10;
        const itemIngs = items[fi];
        const itemColor = itemIngs && itemIngs[0] && typeof DINER_INGREDIENTS !== 'undefined' && DINER_INGREDIENTS[itemIngs[0]]
          ? DINER_INGREDIENTS[itemIngs[0]].color : '#d4a040';
        ctx.fillStyle = itemColor;
        ctx.beginPath(); ctx.arc(fx, trayY - 2, 4, 0, Math.PI * 2); ctx.fill();
        // Food highlight
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(fx - 1, trayY - 4, 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    // Top label: check mark or progress text
    ctx.textAlign = "center";
    if (isComplete) {
      ctx.font = "bold 12px monospace"; ctx.fillStyle = '#40ff40';
      ctx.fillText("\u2713", trayX, trayY - trayH - 4);
    } else if (progressText) {
      ctx.font = "bold 8px monospace"; ctx.fillStyle = '#ffffff';
      ctx.fillText(progressText, trayX, trayY - trayH - 4);
    }
    // Table number circle underneath tray
    if (tableNum > 0) {
      const circY = trayY + trayH + 10;
      ctx.fillStyle = '#1a1a2a';
      ctx.beginPath(); ctx.arc(trayX, circY, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(trayX, circY, 8, 0, Math.PI * 2); ctx.stroke();
      ctx.font = "bold 8px monospace"; ctx.fillStyle = '#ffd700';
      ctx.fillText(String(tableNum), trayX, circY + 3);
    }
    ctx.textAlign = "left";
  }

  // In-progress tray (current multi-part order) — rightmost slot
  if (typeof cookingState !== 'undefined' && cookingState.ticket && cookingState.ticket.items) {
    const completed = cookingState.ticket.completedCount || 0;
    const total = cookingState.ticket.items.length;
    if (completed > 0) {
      const tableNum = cookingState.currentOrder && cookingState.currentOrder._dinerTableNumber
        ? cookingState.currentOrder._dinerTableNumber : 0;
      const trayItems = cookingState._dinerTrayItems || [];
      _drawTray(traySlot, trayItems, tableNum, false, completed + "/" + total);
      traySlot++;
    }
  }

  // Completed trays waiting for waitress pickup
  if (typeof _dinerPendingServe !== 'undefined' && _dinerPendingServe.length > 0) {
    for (let pi = 0; pi < Math.min(_dinerPendingServe.length, 4); pi++) {
      const serve = _dinerPendingServe[pi];
      const tableNum = serve.tableNumber || (serve.boothId + 1);
      _drawTray(traySlot, serve.allTrayItems || [], tableNum, true, null);
      traySlot++;
    }
  }
}

// ===================== FINE DINING TRAY OVERLAY =====================
// Removed — trays now render ONLY inside the fd_serve_counter entity renderer
// (no more duplicate gold ovals floating in the kitchen area)
function _drawFDTrayOverlay(camX, camY) {
  // No-op: all tray visuals are handled by the fd_serve_counter renderer
}

// ===================== FINE DINING ENTITY RENDERERS =====================

// --- Building exterior (lobby) ---
ENTITY_RENDERERS.building_fine_dining = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  const t = Date.now() / 1000;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(ex + cw/2 + 5, ey + ch + 6, cw*0.42, 8, 0, 0, Math.PI*2); ctx.fill();
  // Main body — dark wood
  ctx.fillStyle = '#1a100a';
  ctx.fillRect(ex+4, ey+ch*0.22, cw-8, ch*0.78);
  // Wood panel grain lines
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1;
  for (let r = 0; r < 5; r++) {
    const ly = ey+ch*0.3+r*ch*0.14;
    ctx.beginPath(); ctx.moveTo(ex+6, ly); ctx.lineTo(ex+cw-6, ly); ctx.stroke();
  }
  // Gold neon accent strip
  ctx.fillStyle = `rgba(255,215,0,${0.4 + Math.sin(t*1.5)*0.15})`;
  ctx.fillRect(ex+4, ey+ch*0.52, cw-8, ch*0.04);
  // Roof — flat dark with gold trim
  ctx.fillStyle = '#181010';
  ctx.fillRect(ex-4, ey+ch*0.16, cw+8, ch*0.1);
  ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.16); ctx.lineTo(ex+cw+4, ey+ch*0.16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ex-4, ey+ch*0.26); ctx.lineTo(ex+cw+4, ey+ch*0.26); ctx.stroke();
  // Gold dots along awning
  for (let d = 0; d < 5; d++) {
    const phase = (d * 0.4 + t*2) % (Math.PI*2);
    const dg = 0.4 + Math.sin(phase)*0.3;
    ctx.fillStyle = `rgba(255,215,0,${dg})`;
    ctx.beginPath(); ctx.arc(ex+cw*0.12+d*cw*0.19, ey+ch*0.21, 3, 0, Math.PI*2); ctx.fill();
  }
  // Windows — warm amber glow
  const glow = 0.5 + Math.sin(t * 1.5) * 0.15;
  for (let wc = 0; wc < 2; wc++) {
    const wx = ex + cw*0.06 + wc*cw*0.5;
    const wy = ey + ch*0.34;
    ctx.fillStyle = '#0a0808';
    ctx.fillRect(wx, wy, cw*0.36, ch*0.22);
    ctx.fillStyle = `rgba(255,180,60,${glow * 0.2})`;
    ctx.fillRect(wx+2, wy+2, cw*0.36-4, ch*0.22-4);
    ctx.strokeStyle = `rgba(255,215,0,${glow * 0.6})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(wx, wy, cw*0.36, ch*0.22);
  }
  // Door
  ctx.fillStyle = '#0a0808';
  ctx.fillRect(ex+cw*0.36, ey+ch*0.64, cw*0.28, ch*0.36);
  ctx.strokeStyle = `rgba(255,215,0,${0.6 + Math.sin(t*2)*0.2})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(ex+cw*0.36, ey+ch*0.64, cw*0.28, ch*0.36);
  ctx.fillStyle = `rgba(255,180,60,${glow*0.15})`;
  ctx.fillRect(ex+cw*0.4, ey+ch*0.68, cw*0.2, ch*0.12);
  // Gold side strips
  ctx.fillStyle = `rgba(255,215,0,${0.15 + Math.sin(t*1.2)*0.08})`;
  ctx.fillRect(ex+4, ey+ch*0.25, 3, ch*0.7);
  ctx.fillRect(ex+cw-7, ey+ch*0.25, 3, ch*0.7);
  // "FINE DINING" sign
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = `rgba(255,215,0,${0.7 + Math.sin(t*2.5)*0.2})`;
  ctx.textAlign = "center";
  ctx.fillText("FINE DINING", ex+cw/2, ey+ch*0.12);
  // Label below
  ctx.font = "bold 11px monospace"; ctx.fillStyle = '#ffd700'; ctx.textAlign = "center";
  ctx.fillText("Fine Dining", ex+cw/2, ey+ch+14); ctx.textAlign = "left";
};

// --- Entrance portal (lobby) ---
ENTITY_RENDERERS.fine_dining_entrance = (e, ctx, ex, ey, w, h) => {
  const ew = w * TILE, eh = h * TILE;
  const t = Date.now() / 1000;
  const glow = 0.4 + Math.sin(t * 2) * 0.15;
  ctx.fillStyle = `rgba(255,215,0,${glow * 0.12})`;
  ctx.fillRect(ex, ey, ew, eh);
  ctx.strokeStyle = `rgba(255,215,0,${glow * 0.5})`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = `rgba(255,215,0,${glow * 0.8})`;
  ctx.textAlign = "center";
  ctx.fillText("\u25B2 ENTER FINE DINING", ex + ew/2, ey + eh/2 + 4);
  ctx.textAlign = "left";
};

// --- Exit portal (interior) ---
ENTITY_RENDERERS.fine_dining_exit = (e, ctx, ex, ey, w, h) => {
  const ew = w * TILE, eh = h * TILE;
  const t = Date.now() / 1000;
  const glow = 0.3 + Math.sin(t * 1.5) * 0.12;
  ctx.fillStyle = `rgba(255,215,0,${glow * 0.08})`;
  ctx.fillRect(ex, ey, ew, eh);
  ctx.strokeStyle = `rgba(255,215,0,${glow * 0.4})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(ex+2, ey+2, ew-4, eh-4);
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = `rgba(255,215,0,${glow * 0.7})`;
  ctx.textAlign = "center";
  ctx.fillText("\u25BC EXIT", ex + ew/2, ey + eh/2 + 4);
  ctx.textAlign = "left";
};

// --- Kitchen floor ---
ENTITY_RENDERERS.fd_floor_kitchen = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Stainless steel floor
  ctx.fillStyle = '#2a2a30';
  ctx.fillRect(ex, ey, cw, ch);
  // Grid lines
  ctx.strokeStyle = 'rgba(200,200,210,0.06)'; ctx.lineWidth = 1;
  for (let r = 0; r <= h; r++) {
    ctx.beginPath(); ctx.moveTo(ex, ey + r * TILE); ctx.lineTo(ex + cw, ey + r * TILE); ctx.stroke();
  }
  for (let c = 0; c <= w; c++) {
    ctx.beginPath(); ctx.moveTo(ex + c * TILE, ey); ctx.lineTo(ex + c * TILE, ey + ch); ctx.stroke();
  }
};

// --- Dining floor ---
ENTITY_RENDERERS.fd_floor_dining = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Dark marble
  ctx.fillStyle = '#1a1418';
  ctx.fillRect(ex, ey, cw, ch);
  // Subtle marble veining
  ctx.strokeStyle = 'rgba(180,160,140,0.04)'; ctx.lineWidth = 1;
  for (let r = 0; r <= h; r++) {
    for (let c = 0; c <= w; c++) {
      if ((r + c) % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(ex + c * TILE, ey + r * TILE);
        ctx.lineTo(ex + c * TILE + TILE, ey + r * TILE + TILE);
        ctx.stroke();
      }
    }
  }
  // Gold accent lines every 4 tiles
  ctx.strokeStyle = 'rgba(255,215,0,0.06)'; ctx.lineWidth = 1;
  for (let r = 0; r <= h; r += 4) {
    ctx.beginPath(); ctx.moveTo(ex, ey + r * TILE); ctx.lineTo(ex + cw, ey + r * TILE); ctx.stroke();
  }
};

// --- Service wall ---
ENTITY_RENDERERS.fd_service_wall = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  ctx.fillStyle = '#1a1010';
  ctx.fillRect(ex, ey, cw, ch);
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
  // Gold trim top/bottom
  ctx.fillStyle = 'rgba(255,215,0,0.15)';
  ctx.fillRect(ex, ey, cw, 2);
  ctx.fillRect(ex, ey + ch - 2, cw, 2);
};

// --- Counter (clear plate) ---
ENTITY_RENDERERS.fd_counter = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(ex, ey, cw, ch);
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
  // Marble top
  ctx.fillStyle = '#4a3a30';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, 4);
  // Label
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(ex, ey + ch - 16, cw, 16);
  ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#ffd700'; ctx.fillText("Clear Plate", ex + cw/2, ey + ch - 4);
  ctx.textAlign = "left";
};

// --- Pickup counter (submit order) ---
ENTITY_RENDERERS.fd_pickup_counter = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(ex, ey, cw, ch);
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
  ctx.fillStyle = '#4a3a30';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, 4);
  // Bell icon
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(ex + cw/2, ey + ch/2 - 4, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c0a000';
  ctx.beginPath(); ctx.arc(ex + cw/2, ey + ch/2 - 4, 6, 0, Math.PI * 2); ctx.fill();
  // Label
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(ex, ey + ch - 16, cw, 16);
  ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#ffd700'; ctx.fillText("Serve", ex + cw/2, ey + ch - 4);
  ctx.textAlign = "left";
};

// --- Serve counter (submit order, gold tray with food + table number) ---
ENTITY_RENDERERS.fd_serve_counter = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Dark wood base
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(ex, ey, cw, ch);
  ctx.fillStyle = '#3a2a20';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
  ctx.fillStyle = '#4a3a30';
  ctx.fillRect(ex + 2, ey + 2, cw - 4, 4);
  // Tray surface area — positioned at very bottom of counter (closest to waiter below)
  const trayW = 28, trayH = 24;
  const trayY = ey + ch - trayH - 18; // bottom end of counter, just above the "Serve" label

  // --- In-progress tray (left side): shows items filling up during multi-item orders ---
  const hasInProgress = typeof cookingState !== 'undefined' && cookingState.active &&
    cookingState.activeRestaurantId === 'fine_dining' &&
    cookingState._fdTrayItems && cookingState._fdTrayItems.length > 0 &&
    cookingState.ticket;

  if (hasInProgress) {
    const ipX = ex + 8;
    // Semi-transparent in-progress tray
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#a08800';
    ctx.beginPath(); ctx.roundRect(ipX, trayY, trayW, trayH, 3); ctx.fill();
    ctx.fillStyle = '#d4b800';
    ctx.beginPath(); ctx.roundRect(ipX + 2, trayY + 2, trayW - 4, trayH - 4, 2); ctx.fill();
    ctx.globalAlpha = 1.0;
    // Dashed outline to indicate in-progress
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.roundRect(ipX, trayY, trayW, trayH, 3); ctx.stroke();
    ctx.setLineDash([]);
    // Food items accumulated so far
    const ipItems = cookingState._fdTrayItems;
    const ipCount = Math.min(ipItems.length, 4);
    for (let fi = 0; fi < ipCount; fi++) {
      const fx = ipX + 5 + fi * 6;
      const fy = trayY + trayH / 2;
      const ingColor = ipItems[fi] && ipItems[fi][0] &&
        typeof FINE_DINING_INGREDIENTS !== 'undefined' && FINE_DINING_INGREDIENTS[ipItems[fi][0]]
        ? FINE_DINING_INGREDIENTS[ipItems[fi][0]].color : '#d4a040';
      ctx.fillStyle = ingColor;
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Progress label below tray
    const done = cookingState.ticket.completedCount || 0;
    const total = cookingState.ticket.items ? cookingState.ticket.items.length : 0;
    ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = '#ffd700'; ctx.fillText(done + "/" + total, ipX + trayW / 2, trayY + trayH + 10);
    ctx.textAlign = "left";
  }

  // --- Completed trays (bottom-right corner): orders waiting for waiter pickup ---
  const hasPending = typeof _fdPendingServe !== 'undefined' && _fdPendingServe.length > 0;
  if (hasPending) {
    const itemCount = Math.min(_fdPendingServe.length, 4);
    const totalW = itemCount * (trayW + 4);
    const startX = ex + cw - totalW - 4; // far right end (closest to waiter at tx:17)
    for (let i = 0; i < itemCount; i++) {
      const tx = startX + i * (trayW + 4);
      const serve = _fdPendingServe[i];
      // Solid gold tray (completed)
      ctx.fillStyle = '#c0a000';
      ctx.beginPath(); ctx.roundRect(tx, trayY, trayW, trayH, 3); ctx.fill();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.roundRect(tx + 2, trayY + 2, trayW - 4, trayH - 4, 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(tx + 3, trayY + 2, trayW - 6, 3);
      // Food items on tray
      const items = serve && serve.allTrayItems ? serve.allTrayItems : (serve && serve.recipeIngredients ? [serve.recipeIngredients] : []);
      const foodCount = Math.min(items.length, 3);
      for (let fi = 0; fi < foodCount; fi++) {
        const fx = tx + 6 + fi * 8;
        const fy = trayY + trayH / 2 + 1;
        const ingColor = items[fi] && items[fi][0] &&
          typeof FINE_DINING_INGREDIENTS !== 'undefined' && FINE_DINING_INGREDIENTS[items[fi][0]]
          ? FINE_DINING_INGREDIENTS[items[fi][0]].color : '#d4a040';
        ctx.fillStyle = ingColor;
        ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      // Table number below tray
      const tableId = serve ? serve.tableId : null;
      if (tableId !== null && tableId !== undefined && tableId >= 0) {
        ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
        ctx.fillStyle = '#ffd700'; ctx.fillText("T" + (tableId + 1), tx + trayW / 2, trayY + trayH + 10);
        ctx.textAlign = "left";
      }
    }
  } else if (!hasInProgress) {
    // No orders and no in-progress — show empty gold surface
    const blockW = Math.min(cw - 16, 60), blockH = Math.min(ch * 0.3, 24);
    const blockX = ex + (cw - blockW) / 2, blockY = trayY;
    ctx.fillStyle = '#c0a000';
    ctx.beginPath(); ctx.roundRect(blockX, blockY, blockW, blockH, 4); ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.roundRect(blockX + 2, blockY + 2, blockW - 4, blockH - 4, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(blockX + 4, blockY + 2, blockW - 8, 4);
  }
  // Label
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(ex, ey + ch - 16, cw, 16);
  ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#ffd700'; ctx.fillText("Serve", ex + cw/2, ey + ch - 4);
  ctx.textAlign = "left";
};


// --- Teppanyaki table (background visual) ---
ENTITY_RENDERERS.fd_teppanyaki_table = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Dark wood surround
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.roundRect(ex + 4, ey + 4, cw - 8, ch - 8, 6); ctx.fill();
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.roundRect(ex + 8, ey + 8, cw - 16, ch - 16, 4); ctx.fill();
  // Warm ambient glow
  ctx.fillStyle = 'rgba(255,180,60,0.04)';
  ctx.fillRect(ex, ey, cw, ch);
  // Table number (top-right corner) — black circle with gold number
  const tableNum = e._fdTableNum || 0;
  if (tableNum > 0) {
    const numX = ex + cw - 16, numY = ey + 16;
    ctx.fillStyle = '#1a1a2a';
    ctx.beginPath(); ctx.arc(numX, numY, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(numX, numY, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.font = "bold 10px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = '#ffd700'; ctx.fillText(String(tableNum), numX, numY + 4);
    ctx.textAlign = "left";
  }
  // Gold cushions at seat positions (same size as diner booth seats)
  if (typeof FD_TABLES !== 'undefined') {
    const _fdTableIdx = (e._fdTableNum || 1) - 1;
    const table = FD_TABLES[_fdTableIdx];
    if (table && table.seats) {
      for (const seat of table.seats) {
        const seatPx = (seat.tx - e.tx) * TILE + ex;
        const seatPy = (seat.ty - e.ty) * TILE + ey;
        ctx.fillStyle = '#c0a000';
        ctx.beginPath(); ctx.roundRect(seatPx + 4, seatPy + 4, TILE - 8, TILE - 8, 4); ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.roundRect(seatPx + 6, seatPy + 6, TILE - 12, TILE - 12, 4); ctx.fill();
      }
    }
  }
};

// --- Teppanyaki grill entities (0-3) ---
const _fdGrillRenderer = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  const t = Date.now() / 1000;
  const tableId = parseInt(e.type.split('_').pop());
  // Iron grill surface
  ctx.fillStyle = '#3a3a40';
  ctx.beginPath(); ctx.roundRect(ex + 2, ey + 2, cw - 4, ch - 4, 4); ctx.fill();
  ctx.fillStyle = '#4a4a50';
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 6, cw - 12, ch - 12, 3); ctx.fill();
  // Grill lines
  ctx.strokeStyle = 'rgba(60,60,70,0.8)'; ctx.lineWidth = 2;
  for (let gl = 0; gl < 6; gl++) {
    const gy = ey + 10 + gl * (ch - 20) / 5;
    ctx.beginPath(); ctx.moveTo(ex + 10, gy); ctx.lineTo(ex + cw - 10, gy); ctx.stroke();
  }
  // Heat shimmer when cooking
  const isActive = typeof grillState !== 'undefined' && grillState.active && grillState.tableId === tableId;
  if (isActive) {
    // Fire/heat glow
    const heatGlow = 0.3 + Math.sin(t * 4) * 0.15;
    ctx.fillStyle = `rgba(255,120,30,${heatGlow})`;
    ctx.beginPath(); ctx.roundRect(ex + 6, ey + 6, cw - 12, ch - 12, 3); ctx.fill();
    // Steam particles
    for (let si = 0; si < 4; si++) {
      const sx = ex + cw * 0.2 + si * cw * 0.2;
      const sy = ey - 4 + Math.sin(t * 3 + si * 1.5) * 6;
      const sa = 0.3 + Math.sin(t * 2 + si) * 0.2;
      ctx.fillStyle = `rgba(200,200,200,${sa})`;
      ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Food + fire when waiter has served (table._foodServed)
  const tableData = typeof FD_TABLES !== 'undefined' ? FD_TABLES[tableId] : null;
  if (tableData && tableData._foodServed && !isActive) {
    // Fire glow (lower intensity than active cooking)
    const fireGlow = 0.2 + Math.sin(t * 3) * 0.1;
    ctx.fillStyle = `rgba(255,100,20,${fireGlow})`;
    ctx.beginPath(); ctx.roundRect(ex + 6, ey + 6, cw - 12, ch - 12, 3); ctx.fill();
    // Flickering fire dots
    for (let fi = 0; fi < 3; fi++) {
      const fx = ex + cw * 0.25 + fi * cw * 0.25;
      const fy = ey + ch * 0.5 + Math.sin(t * 5 + fi * 2) * 4;
      ctx.fillStyle = `rgba(255,180,40,${0.5 + Math.sin(t * 4 + fi) * 0.3})`;
      ctx.beginPath(); ctx.arc(fx, fy, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Food plates on grill — only show remaining plates (not yet consumed by seated NPCs)
    // _platesRemaining decrements as each NPC sits and "takes" a plate
    const plateCount = Math.min(tableData._platesRemaining || 0, 4);
    const seats = tableData.seats;
    for (let si = 0; si < plateCount && si < seats.length; si++) {
      const seat = seats[si];
      // Compute food plate position — 1 tile in front of golden cushions (on grill edge, not on cushion)
      const seatRelX = (seat.tx - e.tx) * TILE + TILE / 2;
      const seatRelY = (seat.ty - e.ty) * TILE + TILE / 2;
      const foodX = ex + cw / 2 + (seatRelX - cw / 2) * 0.5;
      const foodY = ey + ch / 2 + (seatRelY - ch / 2) * 0.5;
      // White plate
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath(); ctx.arc(foodX, foodY, 8, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d0d0d0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(foodX, foodY, 8, 0, Math.PI * 2); ctx.stroke();
      // Colored food on plate
      const serveItems = tableData._serveData && tableData._serveData.allTrayItems;
      const foodIng = serveItems && serveItems[si] && serveItems[si][0];
      const itemColor = foodIng && typeof FINE_DINING_INGREDIENTS !== 'undefined' && FINE_DINING_INGREDIENTS[foodIng]
        ? FINE_DINING_INGREDIENTS[foodIng].color : '#d4a040';
      ctx.fillStyle = itemColor;
      ctx.beginPath(); ctx.arc(foodX, foodY, 5, 0, Math.PI * 2); ctx.fill();
      // Shine highlight
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(foodX - 1.5, foodY - 2, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
};
ENTITY_RENDERERS.fd_teppanyaki_grill_0 = _fdGrillRenderer;
ENTITY_RENDERERS.fd_teppanyaki_grill_1 = _fdGrillRenderer;
ENTITY_RENDERERS.fd_teppanyaki_grill_2 = _fdGrillRenderer;
ENTITY_RENDERERS.fd_teppanyaki_grill_3 = _fdGrillRenderer;

// --- Host stand ---
ENTITY_RENDERERS.fd_host_stand = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Wooden podium
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.roundRect(ex + 4, ey + 4, cw - 8, ch - 8, 4); ctx.fill();
  ctx.fillStyle = '#4a3a28';
  ctx.beginPath(); ctx.roundRect(ex + 8, ey + 8, cw - 16, ch - 16, 3); ctx.fill();
  // Menu book
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(ex + cw/2 - 14, ey + ch/2 - 8, 28, 16);
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(ex + cw/2 - 12, ey + ch/2 - 6, 24, 12);
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(ex + cw/2 - 1, ey + ch/2 - 6, 2, 12);
  // Label
  ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#ffd700'; ctx.fillText("Host", ex + cw/2, ey + ch + 10);
  ctx.textAlign = "left";
};

// --- Host NPC (now rendered via drawChar in draw.js, entity is visual placeholder only) ---
ENTITY_RENDERERS.fd_host_npc = (e, ctx, ex, ey, w, h) => {
  // No visual — host is rendered as an NPC character by the fine dining system
};

// --- Enter Restaurant door ---
ENTITY_RENDERERS.fd_enter_door = (e, ctx, ex, ey, w, h) => {
  const cw = (w || 3) * TILE, ch = (h || 1) * TILE;
  // Floor mat
  ctx.fillStyle = '#3a1a1a';
  ctx.beginPath(); ctx.roundRect(ex + 4, ey + 2, cw - 8, ch - 4, 4); ctx.fill();
  ctx.fillStyle = '#4a2a1a';
  ctx.beginPath(); ctx.roundRect(ex + 8, ey + 4, cw - 16, ch - 8, 3); ctx.fill();
  // Gold arrow pointing in
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(ex + cw / 2, ey + 4);
  ctx.lineTo(ex + cw / 2 - 8, ey + ch - 4);
  ctx.lineTo(ex + cw / 2 + 8, ey + ch - 4);
  ctx.closePath(); ctx.fill();
  // Label
  ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#ffd700'; ctx.fillText("Enter Restaurant", ex + cw / 2, ey - 4);
  ctx.textAlign = "left";
};

// --- Exit Restaurant door ---
ENTITY_RENDERERS.fd_exit_door = (e, ctx, ex, ey, w, h) => {
  const cw = (w || 3) * TILE, ch = (h || 1) * TILE;
  // Floor mat
  ctx.fillStyle = '#1a1a3a';
  ctx.beginPath(); ctx.roundRect(ex + 4, ey + 2, cw - 8, ch - 4, 4); ctx.fill();
  ctx.fillStyle = '#1a2a4a';
  ctx.beginPath(); ctx.roundRect(ex + 8, ey + 4, cw - 16, ch - 8, 3); ctx.fill();
  // Gold arrow pointing out (down)
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(ex + cw / 2, ey + ch - 4);
  ctx.lineTo(ex + cw / 2 - 8, ey + 4);
  ctx.lineTo(ex + cw / 2 + 8, ey + 4);
  ctx.closePath(); ctx.fill();
  // Label
  ctx.font = "bold 9px monospace"; ctx.textAlign = "center";
  ctx.fillStyle = '#ffd700'; ctx.fillText("Exit Restaurant", ex + cw / 2, ey - 4);
  ctx.textAlign = "left";
};

// --- Waiter spot (invisible marker, waiter rendered by NPC system) ---
ENTITY_RENDERERS.fd_waiter_spot = (e, ctx, ex, ey, w, h) => {
  // No visual — waiter is rendered as an NPC by the fine dining system
};

// --- Fine dining ingredient renderer ---
if (typeof FINE_DINING_INGREDIENTS !== 'undefined' && typeof FINE_DINING_ENTITY_TO_INGREDIENT !== 'undefined') {
  const _fdIngredientRenderer = (e, ctx, ex, ey, w, h) => {
    const cw = (w || 2) * TILE, ch = (h || 2) * TILE;
    const ingId = FINE_DINING_ENTITY_TO_INGREDIENT[e.type];
    const ing = ingId ? FINE_DINING_INGREDIENTS[ingId] : null;
    const color = ing ? ing.color : '#888';
    const name = ing ? ing.name : e.type;

    // Dark marble counter surface (upscale)
    ctx.fillStyle = '#2a1a14';
    ctx.fillRect(ex, ey, cw, ch);
    ctx.fillStyle = '#3a2a20';
    ctx.fillRect(ex + 2, ey + 2, cw - 4, ch - 4);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(ex + 2, ey + 2, cw - 4, 3);

    // Ingredient item (centered blob)
    const itemW = cw * 0.6, itemH = ch * 0.45;
    const ix = ex + (cw - itemW) / 2, iy = ey + ch * 0.1;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(ix, iy, itemW, itemH, 6); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(ix + 4, iy + 3, itemW - 8, itemH * 0.3);

    // Name label
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(ex, ey + ch - 18, cw, 18);
    ctx.font = "bold 11px monospace"; ctx.textAlign = "center";
    ctx.fillStyle = '#000'; ctx.fillText(name, ex + cw / 2 + 1, ey + ch - 5 + 1);
    ctx.fillStyle = '#ffd700'; ctx.fillText(name, ex + cw / 2, ey + ch - 5);
    ctx.textAlign = "left";
  };
  for (const [id, data] of Object.entries(FINE_DINING_INGREDIENTS)) {
    ENTITY_RENDERERS[data.entity] = _fdIngredientRenderer;
  }
}

// ═══════════════════════════════════════════════════════
//  CASINO BUILDING + INTERIOR ENTITIES
// ═══════════════════════════════════════════════════════

// Casino exterior (lobby building)
ENTITY_RENDERERS['building_casino'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Building body — dark purple/maroon
  ctx.fillStyle = '#1a0a2e';
  ctx.fillRect(ex, ey + TILE, cw, ch - TILE);
  // Roof
  ctx.fillStyle = '#2a1040';
  ctx.beginPath();
  ctx.moveTo(ex - 8, ey + TILE);
  ctx.lineTo(ex + cw / 2, ey - 4);
  ctx.lineTo(ex + cw + 8, ey + TILE);
  ctx.closePath();
  ctx.fill();
  // Gold roof trim
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ex - 8, ey + TILE);
  ctx.lineTo(ex + cw / 2, ey - 4);
  ctx.lineTo(ex + cw + 8, ey + TILE);
  ctx.stroke();
  ctx.lineWidth = 1;
  // Gold border around building
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 2, ey + TILE + 2, cw - 4, ch - TILE - 4);
  ctx.lineWidth = 1;
  // Windows (3 across, warm glow)
  for (let i = 0; i < 3; i++) {
    const wx = ex + TILE + i * (TILE * 1.8);
    const wy = ey + TILE + 20;
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.3 + 0.1 * Math.sin(Date.now() / 600 + i);
    ctx.fillRect(wx, wy, 32, 24);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffd700';
    ctx.strokeRect(wx, wy, 32, 24);
    // Window cross
    ctx.beginPath();
    ctx.moveTo(wx + 16, wy); ctx.lineTo(wx + 16, wy + 24);
    ctx.moveTo(wx, wy + 12); ctx.lineTo(wx + 32, wy + 12);
    ctx.stroke();
  }
  // Door (bottom center)
  const dx = ex + cw / 2 - 20;
  const dy = ey + ch - TILE - 8;
  ctx.fillStyle = '#3a1a0a';
  ctx.fillRect(dx, dy, 40, TILE + 8);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx, dy, 40, TILE + 8);
  ctx.lineWidth = 1;
  // Door handle
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(dx + 32, dy + 28, 3, 0, Math.PI * 2);
  ctx.fill();
  // "CASINO" neon sign
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 8;
  ctx.fillText('CASINO', ex + cw / 2, ey + TILE + 14);
  ctx.shadowBlur = 0;
  // Second row windows (lower)
  for (let i = 0; i < 3; i++) {
    const wx = ex + TILE + i * (TILE * 1.8);
    const wy = ey + TILE * 3 + 10;
    ctx.fillStyle = '#ffd700';
    ctx.globalAlpha = 0.25 + 0.08 * Math.sin(Date.now() / 800 + i + 2);
    ctx.fillRect(wx, wy, 32, 20);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#b8860b';
    ctx.strokeRect(wx, wy, 32, 20);
  }
  // Label
  ctx.fillStyle = '#ccc';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Casino', ex + cw / 2, ey + ch + 14);
  ctx.textAlign = 'left';
};

// ---- SPAR BUILDING (exterior) ----
ENTITY_RENDERERS['building_spar'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(ex + cw / 2, ey + ch + 6, cw / 2 + 4, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // Building body — dark steel blue
  ctx.fillStyle = '#2a3a4a';
  ctx.fillRect(ex, ey + TILE, cw, ch - TILE);
  // Roof — metallic silver
  ctx.fillStyle = '#556677';
  ctx.beginPath();
  ctx.moveTo(ex - 8, ey + TILE);
  ctx.lineTo(ex + cw / 2, ey - 4);
  ctx.lineTo(ex + cw + 8, ey + TILE);
  ctx.closePath();
  ctx.fill();
  // Roof trim — cyan accent
  ctx.strokeStyle = '#55ccff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ex - 8, ey + TILE);
  ctx.lineTo(ex + cw / 2, ey - 4);
  ctx.lineTo(ex + cw + 8, ey + TILE);
  ctx.stroke();
  ctx.lineWidth = 1;
  // Border
  ctx.strokeStyle = '#55ccff';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 2, ey + TILE + 2, cw - 4, ch - TILE - 4);
  ctx.lineWidth = 1;
  // Windows (3 across, cool glow)
  for (let i = 0; i < 3; i++) {
    const wx = ex + TILE + i * (TILE * 1.8);
    const wy = ey + TILE + 20;
    ctx.fillStyle = '#55ccff';
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(Date.now() / 500 + i);
    ctx.fillRect(wx, wy, 32, 24);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#55ccff';
    ctx.strokeRect(wx, wy, 32, 24);
    ctx.beginPath();
    ctx.moveTo(wx + 16, wy); ctx.lineTo(wx + 16, wy + 24);
    ctx.moveTo(wx, wy + 12); ctx.lineTo(wx + 32, wy + 12);
    ctx.stroke();
  }
  // Door (bottom center)
  const dx = ex + cw / 2 - 20;
  const dy = ey + ch - TILE - 8;
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(dx, dy, 40, TILE + 8);
  ctx.strokeStyle = '#55ccff';
  ctx.lineWidth = 2;
  ctx.strokeRect(dx, dy, 40, TILE + 8);
  ctx.lineWidth = 1;
  ctx.fillStyle = '#55ccff';
  ctx.beginPath();
  ctx.arc(dx + 32, dy + 28, 3, 0, Math.PI * 2);
  ctx.fill();
  // "SPAR" neon sign
  ctx.fillStyle = '#55ccff';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#55ccff';
  ctx.shadowBlur = 8;
  ctx.fillText('SPAR', ex + cw / 2, ey + TILE + 14);
  ctx.shadowBlur = 0;
  // Crossed swords icon
  const sx = ex + cw / 2, sy = ey + TILE * 3 + 16;
  ctx.strokeStyle = '#88aacc';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx - 12, sy - 8); ctx.lineTo(sx + 12, sy + 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx + 12, sy - 8); ctx.lineTo(sx - 12, sy + 8); ctx.stroke();
  ctx.lineWidth = 1;
  // Label
  ctx.fillStyle = '#ccc';
  ctx.font = '11px monospace';
  ctx.fillText('Spar Arena', ex + cw / 2, ey + ch + 14);
  ctx.textAlign = 'left';
};

// Spar hub interior floor
ENTITY_RENDERERS['spar_hub_floor'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  ctx.fillStyle = '#1a1a28';
  ctx.fillRect(ex, ey, cw, ch);
  // Grid lines
  ctx.strokeStyle = 'rgba(85,204,255,0.06)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= ch; y += TILE) {
    ctx.beginPath(); ctx.moveTo(ex, ey + y); ctx.lineTo(ex + cw, ey + y); ctx.stroke();
  }
  for (let x = 0; x <= cw; x += TILE) {
    ctx.beginPath(); ctx.moveTo(ex + x, ey); ctx.lineTo(ex + x, ey + ch); ctx.stroke();
  }
  // Center divider line
  ctx.strokeStyle = 'rgba(85,204,255,0.15)';
  ctx.lineWidth = 2;
  const midX = ex + cw / 2;
  ctx.beginPath(); ctx.moveTo(midX, ey + TILE); ctx.lineTo(midX, ey + ch - TILE); ctx.stroke();
  ctx.lineWidth = 1;
  // "STANDARD" / "STREAK" labels
  ctx.fillStyle = '#55ccff';
  ctx.globalAlpha = 0.4;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('STANDARD', ex + cw * 0.25, ey + TILE * 1.5);
  ctx.fillText('STREAK', ex + cw * 0.75, ey + TILE * 1.5);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
};

// Spar room door
ENTITY_RENDERERS['spar_room_door'] = (e, ctx, ex, ey, w, h) => {
  const dw = (w || 2) * TILE, dh = (h || 2) * TILE;
  const isStreak = e.mode === 'streak';
  const color = isStreak ? '#ff6644' : '#55ccff';
  // Door frame
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(ex, ey, dw, dh);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 2, ey + 2, dw - 4, dh - 4);
  ctx.lineWidth = 1;
  // Glow pulse
  const pulse = 0.3 + 0.15 * Math.sin(Date.now() / 600);
  ctx.fillStyle = color;
  ctx.globalAlpha = pulse;
  ctx.fillRect(ex + 4, ey + 4, dw - 8, dh - 8);
  ctx.globalAlpha = 1;
  // Room label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(e.label || '?', ex + dw / 2, ey + dh / 2 - 4);
  // Mode indicator
  ctx.fillStyle = color;
  ctx.font = '9px monospace';
  ctx.fillText(isStreak ? 'STREAK' : 'STANDARD', ex + dw / 2, ey + dh / 2 + 10);
  ctx.textAlign = 'left';
};

// Spar arena floor
ENTITY_RENDERERS['spar_arena_floor'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Dark arena floor
  ctx.fillStyle = '#12121e';
  ctx.fillRect(ex, ey, cw, ch);
  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  const midX = ex + cw / 2;
  ctx.beginPath(); ctx.moveTo(midX, ey); ctx.lineTo(midX, ey + ch); ctx.stroke();
  // Center circle
  ctx.beginPath(); ctx.arc(midX, ey + ch / 2, TILE * 2, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  // Team side shading
  ctx.fillStyle = 'rgba(50,100,200,0.04)';
  ctx.fillRect(ex, ey, cw / 2, ch);
  ctx.fillStyle = 'rgba(200,50,50,0.04)';
  ctx.fillRect(ex + cw / 2, ey, cw / 2, ch);
};

// Casino carpet (interior floor)
ENTITY_RENDERERS['casino_carpet'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Rich dark red carpet
  ctx.fillStyle = '#2a0a0a';
  ctx.fillRect(ex, ey, cw, ch);
  // Gold diamond pattern
  ctx.strokeStyle = '#4a3a00';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  const spacing = TILE * 2;
  for (let y = 0; y < ch; y += spacing) {
    for (let x = 0; x < cw; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(ex + x + spacing / 2, ey + y);
      ctx.lineTo(ex + x + spacing, ey + y + spacing / 2);
      ctx.lineTo(ex + x + spacing / 2, ey + y + spacing);
      ctx.lineTo(ex + x, ey + y + spacing / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Gold border around carpet
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 2, ey + 2, cw - 4, ch - 4);
  ctx.lineWidth = 1;
};

// Casino bar counter
ENTITY_RENDERERS['casino_bar'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Counter top (dark wood)
  ctx.fillStyle = '#3a2010';
  ctx.fillRect(ex, ey, cw, ch);
  // Counter edge
  ctx.fillStyle = '#5a3820';
  ctx.fillRect(ex, ey + ch - 8, cw, 8);
  // Gold trim
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex, ey, cw, ch);
  ctx.lineWidth = 1;
  // Bottles
  const bottleColors = ['#4a7a4a', '#7a2020', '#2a4a7a', '#7a6a20', '#5a2a5a'];
  for (let i = 0; i < 6; i++) {
    const bx = ex + 20 + i * (cw - 40) / 5;
    ctx.fillStyle = bottleColors[i % bottleColors.length];
    ctx.fillRect(bx, ey + 6, 8, 20);
    ctx.fillRect(bx + 2, ey + 2, 4, 6);
    // Glass next to some bottles
    if (i % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.3;
      ctx.fillRect(bx + 14, ey + 14, 6, 12);
      ctx.globalAlpha = 1;
    }
  }
};

// Casino pillar
ENTITY_RENDERERS['casino_pillar'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Column body
  ctx.fillStyle = '#2a1a0a';
  ctx.fillRect(ex + 8, ey, cw - 16, ch);
  // Gold bands
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(ex + 6, ey, cw - 12, 4);
  ctx.fillRect(ex + 6, ey + ch - 4, cw - 12, 4);
  ctx.fillRect(ex + 6, ey + ch / 2 - 2, cw - 12, 4);
  // Highlight
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.1;
  ctx.fillRect(ex + 10, ey + 4, 6, ch - 8);
  ctx.globalAlpha = 1;
};

// Blackjack table
ENTITY_RENDERERS['casino_blackjack'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Table (half-oval, green felt)
  ctx.fillStyle = '#1a5a1a';
  ctx.beginPath();
  ctx.ellipse(ex + cw / 2, ey + ch, cw / 2 - 4, ch - 8, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // Table border (wood)
  ctx.strokeStyle = '#5a3820';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(ex + cw / 2, ey + ch, cw / 2 - 4, ch - 8, 0, Math.PI, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1;
  // Card spots
  for (let i = 0; i < 3; i++) {
    const cx = ex + cw / 4 + i * (cw / 4) - 8;
    const cy = ey + ch / 2 + 4;
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(cx, cy, 16, 22);
    ctx.globalAlpha = 1;
  }
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BLACKJACK', ex + cw / 2, ey + ch - 8);
  ctx.textAlign = 'left';
};

// Roulette table
ENTITY_RENDERERS['casino_roulette'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Green felt table
  ctx.fillStyle = '#0a4a0a';
  ctx.fillRect(ex + 4, ey + 4, cw - 8, ch - 8);
  ctx.strokeStyle = '#5a3820';
  ctx.lineWidth = 4;
  ctx.strokeRect(ex + 4, ey + 4, cw - 8, ch - 8);
  ctx.lineWidth = 1;
  // Wheel (circle on left side)
  const wheelX = ex + 30;
  const wheelY = ey + ch / 2;
  const wheelR = 20;
  ctx.beginPath();
  ctx.arc(wheelX, wheelY, wheelR, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a';
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Wheel segments
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + Date.now() / 3000;
    ctx.fillStyle = i % 2 === 0 ? '#cc0000' : '#111';
    ctx.beginPath();
    ctx.moveTo(wheelX, wheelY);
    ctx.arc(wheelX, wheelY, wheelR - 3, angle, angle + Math.PI / 4);
    ctx.closePath();
    ctx.fill();
  }
  // Betting grid (right side)
  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.strokeRect(ex + 60 + c * 18, ey + 10 + r * 22, 18, 22);
    }
  }
  ctx.globalAlpha = 1;
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ROULETTE', ex + cw / 2, ey + ch - 4);
  ctx.textAlign = 'left';
};

// Coin flip station
ENTITY_RENDERERS['casino_coinflip'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Pedestal
  ctx.fillStyle = '#2a1a3a';
  ctx.fillRect(ex + cw / 2 - 16, ey + ch / 2, 32, ch / 2 - 4);
  ctx.fillStyle = '#3a2a4a';
  ctx.fillRect(ex + cw / 2 - 24, ey + ch - 10, 48, 10);
  // Large coin on pedestal
  const coinX = ex + cw / 2;
  const coinY = ey + ch / 2 - 4;
  ctx.beginPath();
  ctx.arc(coinX, coinY, 22, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.fill();
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Coin face detail
  ctx.fillStyle = '#b8860b';
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('$', coinX, coinY + 7);
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '9px monospace';
  ctx.fillText('COIN FLIP', ex + cw / 2, ey + 10);
  ctx.textAlign = 'left';
};

// Cases machine
ENTITY_RENDERERS['casino_cases'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Machine body
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(ex + 8, ey + 4, cw - 16, ch - 8);
  ctx.strokeStyle = '#4a4a6e';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 8, ey + 4, cw - 16, ch - 8);
  ctx.lineWidth = 1;
  // Display screen
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(ex + 16, ey + 12, cw - 32, ch / 2 - 8);
  // 3 case outlines on screen
  const caseColors = ['#888', '#4a9eff', '#ff9a40'];
  for (let i = 0; i < 3; i++) {
    const cx = ex + 24 + i * ((cw - 48) / 3);
    ctx.strokeStyle = caseColors[i];
    ctx.lineWidth = 2;
    ctx.strokeRect(cx, ey + 18, 24, 18);
    // Case handle
    ctx.strokeRect(cx + 8, ey + 15, 8, 4);
    ctx.lineWidth = 1;
  }
  // Glowing edge
  ctx.strokeStyle = '#ffd700';
  ctx.globalAlpha = 0.3 + 0.15 * Math.sin(Date.now() / 500);
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 8, ey + 4, cw - 16, ch - 8);
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CASES', ex + cw / 2, ey + ch - 8);
  ctx.textAlign = 'left';
};

// Mines terminal
ENTITY_RENDERERS['casino_mines'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Terminal body
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(ex + 12, ey + 4, cw - 24, ch - 12);
  ctx.strokeStyle = '#3a3a3a';
  ctx.lineWidth = 2;
  ctx.strokeRect(ex + 12, ey + 4, cw - 24, ch - 12);
  ctx.lineWidth = 1;
  // Screen
  ctx.fillStyle = '#0a1a0a';
  ctx.fillRect(ex + 18, ey + 10, cw - 36, ch / 2);
  // Mini grid on screen
  ctx.strokeStyle = '#2a6a2a';
  const gs = 8;
  const gx = ex + cw / 2 - gs * 2.5;
  const gy = ey + 14;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      ctx.strokeRect(gx + c * gs, gy + r * gs, gs, gs);
    }
  }
  // A couple revealed cells
  ctx.fillStyle = '#2a8a2a';
  ctx.fillRect(gx + gs + 1, gy + gs + 1, gs - 2, gs - 2);
  ctx.fillRect(gx + gs * 3 + 1, gy + gs * 2 + 1, gs - 2, gs - 2);
  // Mine icon
  ctx.fillStyle = '#cc2222';
  ctx.fillRect(gx + gs * 4 + 1, gy + gs * 4 + 1, gs - 2, gs - 2);
  // Stand
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(ex + cw / 2 - 10, ey + ch - 12, 20, 12);
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('MINES', ex + cw / 2, ey + ch - 2);
  ctx.textAlign = 'left';
};

// Dice table
ENTITY_RENDERERS['casino_dice'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Round table
  ctx.beginPath();
  ctx.ellipse(ex + cw / 2, ey + ch / 2 + 4, cw / 2 - 8, ch / 2 - 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#1a3a1a';
  ctx.fill();
  ctx.strokeStyle = '#5a3820';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Two dice on table
  const drawDie = (dx, dy, val) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(dx, dy, 16, 16);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(dx, dy, 16, 16);
    ctx.fillStyle = '#111';
    const dots = [
      [],
      [[8,8]],
      [[4,4],[12,12]],
      [[4,4],[8,8],[12,12]],
      [[4,4],[12,4],[4,12],[12,12]],
      [[4,4],[12,4],[8,8],[4,12],[12,12]],
      [[4,4],[12,4],[4,8],[12,8],[4,12],[12,12]],
    ];
    for (const [px, py] of (dots[val] || dots[1])) {
      ctx.beginPath();
      ctx.arc(dx + px, dy + py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  drawDie(ex + cw / 2 - 22, ey + ch / 2 - 4, 5);
  drawDie(ex + cw / 2 + 6, ey + ch / 2 - 4, 3);
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DICE', ex + cw / 2, ey + 8);
  ctx.textAlign = 'left';
};

// Rock Paper Scissors pedestal
ENTITY_RENDERERS['casino_rps'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Table
  ctx.fillStyle = '#2a1a3a';
  ctx.beginPath(); ctx.roundRect(ex + 8, ey + 10, cw - 16, ch - 14, 8); ctx.fill();
  ctx.strokeStyle = '#6a3a8a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(ex + 8, ey + 10, cw - 16, ch - 14, 8); ctx.stroke();
  ctx.lineWidth = 1;
  // RPS icons
  ctx.font = '20px serif';
  ctx.textAlign = 'center';
  ctx.fillText('\u270A', ex + cw / 2 - 28, ey + ch / 2 + 8);
  ctx.fillText('\u270B', ex + cw / 2, ey + ch / 2 + 8);
  ctx.fillText('\u270C', ex + cw / 2 + 28, ey + ch / 2 + 8);
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '9px monospace';
  ctx.fillText('RPS', ex + cw / 2, ey + 8);
  ctx.textAlign = 'left';
};

// Baccarat table
ENTITY_RENDERERS['casino_baccarat'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Dark green felt table
  ctx.fillStyle = '#0d4a28';
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 8, cw - 12, ch - 12, 10); ctx.fill();
  ctx.strokeStyle = '#8a7a4a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 8, cw - 12, ch - 12, 10); ctx.stroke();
  ctx.lineWidth = 1;
  // P / B labels
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4a9eff';
  ctx.fillText('P', ex + cw / 2 - 26, ey + ch / 2 + 6);
  ctx.fillStyle = '#ff6666';
  ctx.fillText('B', ex + cw / 2 + 26, ey + ch / 2 + 6);
  // Small card shapes
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(ex + cw / 2 - 8, ey + ch / 2 - 8, 16, 20);
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '9px monospace';
  ctx.fillText('BACCARAT', ex + cw / 2, ey + 8);
  ctx.textAlign = 'left';
};

ENTITY_RENDERERS['casino_slots'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Purple machine body
  ctx.fillStyle = '#2a0a3a';
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 8, cw - 12, ch - 12, 10); ctx.fill();
  ctx.strokeStyle = '#8a4aaa';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 8, cw - 12, ch - 12, 10); ctx.stroke();
  ctx.lineWidth = 1;
  // 3 reel windows
  const rw = 22, rh = 24;
  for (let i = 0; i < 3; i++) {
    const rx = ex + cw / 2 - 38 + i * 26;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(rx, ey + ch / 2 - 14, rw, rh);
    ctx.strokeStyle = '#6a4a8a';
    ctx.strokeRect(rx, ey + ch / 2 - 14, rw, rh);
    // Random symbol hint
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = ['#ff4444', '#ffdd00', '#ff8800'][i];
    ctx.fillText(['🍒', '🔔', '7'][i], rx + rw / 2, ey + ch / 2 + 5);
  }
  // Lever
  ctx.fillStyle = '#888';
  ctx.fillRect(ex + cw - 18, ey + ch / 2 - 16, 4, 28);
  ctx.fillStyle = '#ff4444';
  ctx.beginPath(); ctx.arc(ex + cw - 16, ey + ch / 2 - 18, 6, 0, Math.PI * 2); ctx.fill();
  // Label
  ctx.fillStyle = '#ffd700';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SLOTS', ex + cw / 2, ey + 10);
  ctx.textAlign = 'left';
};

ENTITY_RENDERERS['casino_keno'] = (e, ctx, ex, ey, w, h) => {
  const cw = w * TILE, ch = h * TILE;
  // Dark blue terminal
  ctx.fillStyle = '#0a1a2a';
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 8, cw - 12, ch - 12, 10); ctx.fill();
  ctx.strokeStyle = '#2a5a8a';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(ex + 6, ey + 8, cw - 12, ch - 12, 10); ctx.stroke();
  ctx.lineWidth = 1;
  // Mini grid (4x3 dots)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const dx = ex + cw / 2 - 24 + c * 14;
      const dy = ey + ch / 2 - 10 + r * 12;
      ctx.fillStyle = (r + c) % 3 === 0 ? '#ffd700' : '#2a4a6a';
      ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Label
  ctx.fillStyle = '#4aa0ff';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('KENO', ex + cw / 2, ey + 10);
  ctx.textAlign = 'left';
};
