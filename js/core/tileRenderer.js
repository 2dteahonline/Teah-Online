// ===================== TILE RENDERER =====================
// Background tile rendering for all scene types.
//
// Depends on: ctx, BASE_W, BASE_H (inline canvas setup)
//             TILE (levelData.js)
//             Scene, level, collisionGrid (sceneManager.js)

// ---- BACKGROUND RENDERER (placeholder until bg.png) ----
function drawLevelBackground(camX, camY) {
  ctx.fillStyle = Scene.inFarm ? '#5a4830' : Scene.inCooking ? '#c0b898' : Scene.inMine ? '#1a1510' : Scene.inCave ? '#1a1818' : Scene.inLobby ? '#1a4a18' : '#1e1e26';
  ctx.fillRect(0, 0, BASE_W, BASE_H);

  const startTX = Math.max(0, Math.floor(camX / TILE));
  const startTY = Math.max(0, Math.floor(camY / TILE));
  const endTX = Math.min(level.widthTiles - 1, startTX + Math.ceil(BASE_W / TILE) + 1);
  const endTY = Math.min(level.heightTiles - 1, startTY + Math.ceil(BASE_H / TILE) + 1);

  for (let ty = startTY; ty <= endTY; ty++) {
    for (let tx = startTX; tx <= endTX; tx++) {
      const x = tx * TILE - camX;
      const y = ty * TILE - camY;
      const isBorder = tx === 0 || ty === 0 || tx === level.widthTiles-1 || ty === level.heightTiles-1;

      // === LOBBY TILES ===
      if (Scene.inLobby) {
        const ascii = level.collisionAscii[ty]?.[tx];
        if (ascii === '@') {
          // Hedge border
          ctx.fillStyle = '#1a4a18';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#226a20';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          for (let li = 0; li < 3; li++) {
            ctx.fillStyle = `rgba(40,120,30,${0.4 + li * 0.1})`;
            ctx.beginPath(); ctx.arc(x + 10 + li * 14, y + 12 + (li % 2) * 18, 8, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          // Grass
          const gv = ((tx * 7 + ty * 13) % 5);
          const gr = 60 + gv * 2, gg = 120 + gv * 3, gb = 45 + gv;
          ctx.fillStyle = `rgb(${gr},${gg},${gb})`;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.03)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
          // Grass blades
          if ((tx + ty * 3) % 4 === 0) {
            ctx.strokeStyle = `rgba(80,150,60,0.3)`;
            ctx.beginPath();
            ctx.moveTo(x + 12, y + TILE - 4); ctx.lineTo(x + 14, y + TILE - 14);
            ctx.moveTo(x + 30, y + TILE - 6); ctx.lineTo(x + 28, y + TILE - 16);
            ctx.stroke();
          }
        }
        continue;
      }

      // === FARM / HOUSE TILES ===
      if (Scene.inFarm) {
        const ascii = level.collisionAscii[ty]?.[tx];
        if (ascii === '@') {
          // Stone wall border
          ctx.fillStyle = '#4a4038';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#5a5048';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          // Brick pattern
          if ((tx + ty) % 3 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 4, y + 4, TILE / 2 - 4, TILE / 2 - 4);
          }
        } else if (ty >= 20) {
          // Indoor area — wooden floor planks
          const plankShade = ((tx * 3 + ty * 7) % 3);
          const pr = 130 + plankShade * 8, pg = 100 + plankShade * 6, pb = 60 + plankShade * 4;
          ctx.fillStyle = `rgb(${pr},${pg},${pb})`;
          ctx.fillRect(x, y, TILE, TILE);
          // Plank lines (horizontal)
          ctx.strokeStyle = 'rgba(80,60,30,0.15)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE / 3); ctx.lineTo(x + TILE, y + TILE / 3);
          ctx.moveTo(x, y + TILE * 2 / 3); ctx.lineTo(x + TILE, y + TILE * 2 / 3);
          ctx.stroke();
          // Vertical joint
          if ((tx + ty) % 2 === 0) {
            ctx.strokeStyle = 'rgba(60,40,20,0.1)';
            ctx.beginPath(); ctx.moveTo(x + TILE / 2, y); ctx.lineTo(x + TILE / 2, y + TILE); ctx.stroke();
          }
        } else {
          // Farm area — brown dirt
          const sv = ((tx * 5 + ty * 11) % 5);
          ctx.fillStyle = `rgb(${90 + sv * 3},${70 + sv * 2},${45 + sv})`;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.04)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
          // Dirt speckles
          if ((tx + ty * 3) % 5 === 0) {
            ctx.fillStyle = 'rgba(110,85,55,0.3)';
            ctx.beginPath(); ctx.arc(x + 16, y + 20, 2, 0, Math.PI * 2); ctx.fill();
          }
          if ((tx * 7 + ty) % 7 === 0) {
            ctx.fillStyle = 'rgba(80,60,35,0.25)';
            ctx.beginPath(); ctx.arc(x + 34, y + 12, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
        continue;
      }

      // === CAVE TILES ===
      if (Scene.inCave) {
        const isOuterEdge = tx === 0 || ty === 0 || tx === level.widthTiles - 1 || ty === level.heightTiles - 1;
        if (collisionGrid[ty][tx] === 1 && isOuterEdge) {
          // Outer border — dark stone wall
          ctx.fillStyle = '#1a1818';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#242220';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          if ((tx + ty * 5) % 7 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + 8, y + 10); ctx.lineTo(x + 20, y + 30); ctx.stroke();
          }
        } else {
          // Gray stone floor — uniform across entire interior
          const sv = ((tx * 3 + ty * 7) % 5);
          ctx.fillStyle = `rgb(${48 + sv * 2},${46 + sv * 2},${52 + sv})`;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
          if ((tx + ty) % 8 === 0) {
            ctx.fillStyle = 'rgba(80,75,70,0.3)';
            ctx.beginPath(); ctx.arc(x + 20, y + 24, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
        continue;
      }

      // === MINE TILES ===
      if (Scene.inMine) {
        const isOuterEdge = tx === 0 || ty === 0 || tx === level.widthTiles - 1 || ty === level.heightTiles - 1;
        if (collisionGrid[ty][tx] === 1) {
          // Rocky cave wall
          ctx.fillStyle = '#2a2010';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#342818';
          ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
          // Rock texture
          if ((tx + ty * 3) % 5 === 0) {
            ctx.fillStyle = 'rgba(60,50,30,0.4)';
            ctx.beginPath(); ctx.arc(x + 18, y + 14, 6, 0, Math.PI * 2); ctx.fill();
          }
          if ((tx * 7 + ty) % 6 === 0) {
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x + 6, y + 12); ctx.lineTo(x + 22, y + 28); ctx.stroke();
          }
        } else {
          // Mine floor — earthy brown stone
          const sv = ((tx * 5 + ty * 11) % 5);
          ctx.fillStyle = `rgb(${52 + sv * 2},${44 + sv * 2},${32 + sv})`;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
          // Occasional pebbles
          if ((tx + ty * 3) % 7 === 0) {
            ctx.fillStyle = 'rgba(70,60,40,0.3)';
            ctx.beginPath(); ctx.arc(x + 16, y + 20, 2, 0, Math.PI * 2); ctx.fill();
          }
          if ((tx * 3 + ty) % 9 === 0) {
            ctx.fillStyle = 'rgba(90,75,50,0.2)';
            ctx.beginPath(); ctx.arc(x + 32, y + 12, 3, 0, Math.PI * 2); ctx.fill();
          }
        }
        continue;
      }

      // === DELI / COOKING TILES ===
      if (Scene.inCooking) {
        if (collisionGrid[ty][tx] === 1) {
          // Deli walls — warm cream/tan
          ctx.fillStyle = '#c8b898';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = '#b0a080';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
          // Brick accent
          if ((tx + ty) % 4 === 0) {
            ctx.fillStyle = 'rgba(160,120,80,0.15)';
            ctx.fillRect(x + 4, y + 4, TILE - 8, TILE - 8);
          }
        } else {
          // Deli floor — checkered tile pattern
          const checker = (tx + ty) % 2 === 0;
          ctx.fillStyle = checker ? '#e0d8c8' : '#d0c8b0';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = 'rgba(0,0,0,0.05)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
        }
        continue;
      }

      // === DUNGEON TILES ===

      if (collisionGrid[ty][tx] === 1) {
        if (isBorder) {
          // Outer wall — dark concrete
          ctx.fillStyle = '#2a2a32';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.strokeStyle = '#222230';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, TILE, TILE);
        } else {
          // Interior cover block — dark stone bricks
          ctx.fillStyle = '#3a3a44';
          ctx.fillRect(x, y, TILE, TILE);
          // Brick pattern
          ctx.strokeStyle = '#2e2e38';
          ctx.lineWidth = 1;
          const bh = TILE / 2;
          const off = ty % 2 === 0 ? 0 : TILE / 3;
          ctx.strokeRect(x + off, y, TILE/2, bh);
          ctx.strokeRect(x + off - TILE/2, y, TILE/2, bh);
          ctx.strokeRect(x, y + bh, TILE/2, bh);
          ctx.strokeRect(x + TILE/2, y + bh, TILE/2, bh);
          // Top highlight
          ctx.fillStyle = '#454552';
          ctx.fillRect(x, y, TILE, 2);
          // Bottom shadow
          ctx.fillStyle = '#28283a';
          ctx.fillRect(x, y + TILE - 2, TILE, 2);
        }
      } else {
        // Floor tile — lighter toward center
        const cx = level.widthTiles / 2, cy = level.heightTiles / 2;
        const distFromCenter = Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2);
        const maxDist = 20;
        const centerFade = Math.max(0, 1 - distFromCenter / maxDist);
        const baseR = 58 + Math.round(centerFade * 25);
        const baseG = 55 + Math.round(centerFade * 20);
        const baseB = 55 + Math.round(centerFade * 15);
        const gv = ((tx + ty) % 2 === 0) ? 0 : 2;
        ctx.fillStyle = `rgb(${baseR+gv},${baseG+gv},${baseB+gv})`;
        ctx.fillRect(x, y, TILE, TILE);
        // Subtle grid lines
        ctx.strokeStyle = 'rgba(0,0,0,0.07)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, TILE, TILE);

        // Blood splatters near center
        if (centerFade > 0.5 && (tx * 13 + ty * 7) % 19 === 0) {
          ctx.fillStyle = `rgba(120,20,20,${0.15 + centerFade * 0.15})`;
          ctx.beginPath();
          ctx.arc(x + TILE*0.4, y + TILE*0.5, 5 + (tx%3)*2, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }
  }
}
